(function () {
'use strict';
var module = angular.module('fim.base');
module.factory('GossipChatMessagesProvider', function (nxt, $q, Emoji, KeyService, 
  $rootScope, Gossip, $interval, publicKeyService, db) {

  function ChatMessagesProvider(parent) {
    this.parent   = parent;
    this.entities = [];
    this.hasMore  = true;
    this.index    = 0;
    this.priv     = {};
    this.pub      = {};
  }
  ChatMessagesProvider.prototype = {

    /* @returns Promise(transaction) */
    peek: function (advance) {
      var deferred = $q.defer();
      if (this.index < this.entities.length) {
        var result = this.entities[this.index];
        if (advance) {
          this.index++;
        }
        deferred.resolve(result);
      }
      else {
        var self = this;
        this.getMore().then(
          function () {
            if (self.index < self.entities.length) {
              var result = self.entities[self.index];
              if (advance) {
                self.index++;
              }
              deferred.resolve(result);
            }
            else {
              deferred.resolve(null);
            }
          },
          function () {
            deferred.resolve(null);
          }
        );
      }
      return deferred.promise;
    },

    /* @returns Promise(transaction) */
    next: function () {
      return this.peek(true);
    },

    /* @returns Promise */
    getMore: function () {
      var deferred = $q.defer();
      var args = {
        accountOne:     this.parent.accountOne,
        accountTwo:     this.parent.accountTwo,
        firstIndex:     this.index,
        lastIndex:      this.index + this.parent.pageSize,
        requestType:    'getChatMessages'
      }
      var self = this;
      this.parent.api.engine.socket().callAPIFunction(args).then(
        function (data) {
          var messages = data.messages || [];
          self.hasMore = messages.length != 0;
          for (var i=0; i<messages.length; i++) {
            self.translate(messages[i]);
            self.entities.push(messages[i]);
          }
          deferred.resolve();
        },
        deferred.reject
      );
      return deferred.promise;
    },

    translate: function (transaction) {
      transaction.date = nxt.util.formatTimestamp(transaction.timestamp, true);
      transaction.attachment = transaction.attachment || {};
      if (transaction.senderRS == this.parent.accountOne) {
        transaction.clazz = "fromMe";
        transaction.pull_clazz = "pull-right";
        transaction.attachment.senderPublicKey = this.parent.accountOnePublicKey;
      }
      else {
        transaction.clazz = "fromThem";
        transaction.pull_clazz = "pull-left";
        transaction.says = this.parent.accountTwoName;
        transaction.attachment.senderPublicKey = this.parent.accountTwoPublicKey; 
      }
      var decoded  = this.decode(transaction);
      if (decoded) {
        transaction.text = Emoji.emojifi(decoded.text);
        transaction.encrypted = decoded.encrypted;
      }
    },    

    /* @param transaction Transaction|JSON
       @returns { encrypted: Boolean, text: String } */
    decode: function (transaction) {
      if (!transaction.attachment) {
        return null;
      }
      if (transaction.attachment.encryptedMessage || transaction.attachment.encryptToSelfMessage) {
        try {
          return {encrypted:true, text: this.tryToDecryptMessage(transaction)};
        } 
        catch (e) {
         console.log(e);
         return null;
        }
      }
      else if (transaction.attachment.message) {
        if (!transaction.attachment["version.Message"]) {
          try {
            return {encrypted:false, text: converters.hexStringToString(transaction.attachment.message) };
          } 
          catch (err) { //legacy
            if (transaction.attachment.message.indexOf("feff") === 0) {
              return {encrypted:false, text: nxt.util.convertFromHex16(transaction.attachment.message) };
            } 
            else {
              return {encrypted:false, text: nxt.util.convertFromHex8(transaction.attachment.message) };
            }
          }
        } 
        else {
          return {encrypted:false, text: String(transaction.attachment.message) };
        }
      }
      return null;
    },

    getPrivateKey: function (id_rs) {
      var privateKey = this.priv[id_rs];
      if (!privateKey && $rootScope.currentAccount) {
        if (id_rs == $rootScope.currentAccount.id_rs) {
          var secretPhrase = $rootScope.currentAccount.secretPhrase;
          if (secretPhrase) {
            privateKey = converters.hexStringToByteArray(this.parent.api.crypto.getPrivateKey(secretPhrase));
            this.priv[id_rs] = privateKey;
          }
        }
      }
      return privateKey;
    },

    /* used exclusively for decrypting crypt to self messages */
    getPublicKey: function (id_rs) {
      var publicKey = this.pub[id_rs];
      if (!publicKey && $rootScope.currentAccount) {
        if ($rootScope.currentAccount.id_rs == id_rs) {
          var secretPhrase = $rootScope.currentAccount.secretPhrase;
          if (secretPhrase) {
            publicKey = converters.hexStringToByteArray(this.parent.api.crypto.secretPhraseToPublicKey(secretPhrase));
            this.pub[id_rs] = publicKey;
          }
        }
      }
      return publicKey;
    },

    tryToDecryptMessage: function (transaction) {
      var privateKey, publicKey, data, nonce, isText;
      if (transaction.attachment.encryptedMessage) {
        if (this.getPrivateKey(transaction.senderRS)) {
          privateKey = this.getPrivateKey(transaction.senderRS);
          if (transaction.attachment.recipientPublicKey) {
            publicKey = converters.hexStringToByteArray(transaction.attachment.recipientPublicKey);
          }
        }
        else if (this.getPrivateKey(transaction.recipientRS)) {
          privateKey   = this.getPrivateKey(transaction.recipientRS);
          if (transaction.attachment.senderPublicKey) {
            publicKey = converters.hexStringToByteArray(transaction.attachment.senderPublicKey);
          }
        }
        if (privateKey && publicKey) {
          isText    = transaction.attachment.encryptedMessage.isText;
          nonce     = converters.hexStringToByteArray(transaction.attachment.encryptedMessage.nonce);
          data      = converters.hexStringToByteArray(transaction.attachment.encryptedMessage.data);
        }
      } 
      else if (transaction.attachment.encryptToSelfMessage) {
        privateKey   = this.getPrivateKey(transaction.senderRS);
        if (privateKey) {
          publicKey = this.getPublicKey(transaction.senderRS);
          isText    = transaction.attachment.encryptToSelfMessage.isText;
          nonce     = converters.hexStringToByteArray(transaction.attachment.encryptToSelfMessage.nonce);
          data      = converters.hexStringToByteArray(transaction.attachment.encryptToSelfMessage.data);
        }
      }
      if (privateKey && publicKey && data && nonce) {
        var decrypted = this.parent.api.crypto.decryptData(data, { 
          privateKey: privateKey,
          publicKey:  publicKey,
          nonce:      nonce
        });
        return decrypted;
      }
      return null;
    }    
  };

  function GossipChatMessagesProvider(api, $scope, pageSize, accountOne, accountTwo) {
    this.api        = api;
    this.$scope     = $scope;
    this.pageSize   = pageSize;
    this.entities   = [];
    this.isLoading  = false;
    this.hasMore    = true;
    this.topics     = [];

    this.accountOne = accountOne;
    this.accountTwo = accountTwo;
    this.accountTwoPublicKey = publicKeyService.getSync(this.accountTwo);
    this.accountTwoName = accountOne;
    this.provider   = new ChatMessagesProvider(this);

    /* we can throw an error here - the public key should have always been stored already */
    if (!this.accountTwoPublicKey) {
      throw new Error('Could not obtain public key for '+this.accountTwo);
    }

    this.interval(function (entity) {
      entity.date = nxt.util.formatTimestamp(entity.timestamp, true);
    });

    /* observe the database for new gossip messages */
    db.gossips.addObserver($scope, this.createObserver());

    /* observe the websocket events */
    this.subscribe();
  }
  GossipChatMessagesProvider.prototype = {

    subscribe: function () {
      for (var i=0; i<this.topics.length; i++) {
        this.api.engine.socket().unsubscribe(this.topics[i][0], this.topics[i][1]);
      }
      this.topics.length = 0;

      var account_id  = nxt.util.convertRSAddress(this.accountOne);
      var changed     = angular.bind(this, this.blockChanged);
      var added       = angular.bind(this, this.addedTransactions)

      this.topics.push(['blockPoppedNew', changed]);
      this.topics.push(['blockPushedNew', changed]);
      this.topics.push(['addedUnConfirmedTransactions-'+account_id, added]);
      this.topics.push(['addedConfirmedTransactions-'+account_id, added]);
      for (var i=0; i<this.topics.length; i++) {
        this.api.engine.socket().subscribe(this.topics[i][0], this.topics[i][1], this.$scope);
      }
    },

    push: function (gossip) {
      if (this.entities.indexOf(gossip) == -1) {
        this.entities.push(gossip);
      }
    },

    unshift: function (gossip) {
      if (this.entities.indexOf(gossip) == -1) {
        this.entities.unshift(gossip);
      }
    },

    createObserver: function () {
      var self = this;
      var must_update = false;
      return {
        create: function (models) {
          models.forEach(function (gossip) {
            /* note that when having multiple tabs open you could potentially get
               duplicate reports.
               make sure you filter for the chatId */            
            if (gossip.chatId == self.chatId) {

              //console.log('GossipChatMessagesProvider.observer.create', gossip);
              must_update = true;
              self.translate(gossip);
              self.unshift(gossip);
            }
          });
        },
        remove: function (models) {
          models.forEach(function (gossip) {
            /* note that when having multiple tabs open you could potentially get
               duplicate reports.
               make sure you filter for the chatId */
            if (gossip.chatId == self.chatId) {
              for (var i=0; i<self.entities.length; i++) {
                if (self.entities[i].primaryKey === gossip.primaryKey) {
                  must_update = true;
                  self.entities.splice(i, 1);
                  return;
                }
              }
            }
          });
        },
        update: function (models) {
          models.forEach(function (gossip) {
            if (gossip.chatId == self.chatId) {
              for (var i=0; i<self.entities.length; i++) {
                if (self.entities[i].primaryKey === gossip.primaryKey) {
                  must_update = true;
                  angular.extend(self.entities[i], gossip);
                  break;
                }
              }
            }
          });
        },
        finally: function () {
          if (must_update) {
            must_update = false;
            self.$scope.$evalAsync(function () {
              var x = 'nothing to do here';
            });
          }
        }
      };
    },

    getChatId: function () {
      var deferred = $q.defer();
      Gossip.getChatService().get(this.accountTwo).then(
        function (chat) {
          deferred.resolve(chat.id);
        }
      );
      return deferred.promise;
    },

    reload: function () {
      var deferred = $q.defer();
      var self = this;
      this.getChatId().then(
        function (chatId) {
          self.chatId = chatId;
          self.$scope.$evalAsync(function () {
            self.entities.length = 0;
            self.hasMore = true;
            self.isLoading  = true;
            self.getData(0).then(deferred.resolve, deferred.reject);
          });
        }
      );
      return deferred.promise;
    },

    loadMore: function () {
      // if (this.loadMoreBusy) {
      //   this.scheduledLoadMore = true;
      // }
      // else {
        var self = this;
        this.loadMoreBusy = $q.defer();
        this.loadMoreBusy.promise.then(function () {
          self.loadMoreBusy = null;
          if (self.scheduledLoadMore) {
            self.scheduledLoadMore  = false;
            self.loadMore();
          }
        });

        /* must only count gossip messages when determining firstIndex */
        var firstIndex = firstIndex || 0;
        for (var i=0; i<this.entities.length; i++) {
          // if (this.entities[i].attachment) {
            firstIndex++;
          // }
        }

        this.$scope.$evalAsync(function () {
          self.isLoading = true;
          self.getData(firstIndex).then(self.loadMoreBusy.resolve);
        });
      // }
    },

    getData: function (firstIndex) {
      var deferred = $q.defer();
      var self = this;
      db.gossips.where('chatId').
                 equals(this.chatId).
                 reverse().
                 offset(firstIndex).
                 limit(this.pageSize).
                 toArray().then(
      function (gossips) {
        self.$scope.$evalAsync(
          function () {
            self.isLoading = false;
            self.hasMore = gossips.length == self.pageSize;

            gossips.forEach(function (gossip) { self.translate(gossip) });

            /* merge the retrieved gossips with any existing blockchain messages */
            self.merge(gossips).then(
              function (merged_entities) {
                self.$scope.$evalAsync(
                  function () {
                    //console.log('merged result');
                    merged_entities.forEach(function (entity) {
                      self.push(entity);
                      // if (entity.attachment) {
                      //   console.log('transaction '+entity.timestamp);
                      // }
                      // else {
                      //   console.log('gossip '+entity.timestamp);
                      // }
                    });
                  }
                );
              }
            );
          }
        );
      });
      return deferred.promise;
    },

    merge: function (entities) {
      var deferred = $q.defer();
      var result   = [];
      var iterator = new Iterator(entities);

      var self = this;
      var repeat = function () {
        self.advance(result, iterator).then(repeat, 
          function () { 
            deferred.resolve(result) 
          }
        );
      };
      repeat();

      return deferred.promise;
    },

    advance: function (output_array, iterator) {
      var deferred = $q.defer();
      var self = this;
      this.provider.peek().then(function (transaction) {
        var gossip = iterator.peek();          
        if (!transaction && gossip) {
          output_array.push(gossip);
          iterator.next();
          deferred.resolve();
        }
        else if (transaction && !gossip) {
          output_array.push(transaction);
          self.provider.next().then(deferred.resolve);
        }
        else if (transaction && gossip) {
          if (transaction.timestamp > gossip.timestamp) {
            output_array.push(transaction);
            self.provider.next().then(deferred.resolve);
          }
          else {
            output_array.push(gossip);
            iterator.next();
            deferred.resolve();
          }
        }
        else {
          deferred.reject();
        }
      });
      return deferred.promise;
    },

    translate: function (gossip) {
      gossip.date = nxt.util.formatTimestamp(gossip.timestamp, true);
      if (gossip.senderRS == this.accountOne) {
        gossip.clazz = "fromMe";
        gossip.pull_clazz = "pull-right";
      }
      else {
        gossip.clazz = "fromThem";
        gossip.pull_clazz = "pull-left";
      }
      var decoded  = this.decode(gossip);
      if (decoded) {
        gossip.remover   = this.getRemoverFunction();
        gossip.text      = Emoji.emojifi(decoded.text);
        gossip.encrypted = decoded.encrypted;
      }
    },

    getRemoverFunction: function () {
      if (!this.remover_fn) {
        this.remover_fn = angular.bind(this, this.removerHandler);
      }
      return this.remover_fn;
    },

    removerHandler: function (gossip) {
      db.transaction("rw", db.gossips, function() {
        gossip.delete();
      });
    },

    /* @param gossip Gossip|JSON
       @returns { encrypted: Boolean, text: String } */
    decode: function (gossip) {
      var json, message = converters.hexStringToString(gossip.message);
      try {
        json = JSON.parse(message);
        if (typeof json.nonce != 'string' || typeof json.message != 'string') {
          return {encrypted:false, text: message };
        }
      } catch (e) {
        return {encrypted:false, text: message };
      }
      return {
        encrypted:true, 
        text: Gossip.decryptMessage(
          this.accountTwoPublicKey, 
          json.nonce, 
          json.message
        )
      };
    },

    interval: function (each_fn, delay) {
      var interval = $interval(angular.bind(this, function () { this.forEach(each_fn) }), delay||15*1000);
      this.$scope.$on('$destroy', function () { $interval.cancel(interval) });
    },

    forEach: function (each_fn) {
      this.entities.forEach(each_fn);
    },

    /* @websocket - blockchain events */
    blockChanged: function (block) {
      var self = this;
      this.$scope.$evalAsync(
        function () {
          self.forEach(function (entity) {
            if (entity.attachment) {
              entity.confirmations = block.height - entity.height;
            }
          });
        }
      );
    },

    /* @websocket - blockchain events */
    addedTransactions: function (transactions) {
      var self = this;
      this.$scope.$evalAsync(function () {
        var transaction;
        for (var i=0; i<transactions.length; i++) {
          transaction = transactions[i];
          if (transaction.type == 1 && transaction.subtype == 0) {
            if (transaction.recipientRS == self.accountTwo || transaction.senderRS == self.accountTwo) {
              if (self.duplicateTransaction(transaction)) {
                continue;
              }
              self.provider.translate(transaction);
              self.unshift(transaction);
            }
          }
        }
      });
    },

    duplicateTransaction: function (transaction) {
      if (transaction.transaction) {
        for (var i=0; i<this.entities.length; i++) {
          if (this.entities[i].transaction == transaction.transaction) {
            return true;
          }
        }
      }
      return false;
    }
  };

  return GossipChatMessagesProvider;
});
})();