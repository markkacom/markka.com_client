(function () {
'use strict';
var module = angular.module('fim.base');
module.run(function (Gossip, $rootScope, db) {
  $rootScope.$on('onOpenCurrentAccount', Gossip.onOpenCurrentAccount.bind(Gossip));
  $rootScope.$on('onCloseCurrentAccount', Gossip.onCloseCurrentAccount.bind(Gossip));
  $rootScope.$on('onAddChatContact', Gossip.onAddChatContact.bind(Gossip));

  Gossip.addTopic(Gossip.PING_TOPIC, function (gossip) {
    var message = converters.hexStringToString(gossip.message);
    if (message.indexOf("ping") == 0) {
      this.getSenderIsWhitelisted(gossip.senderRS).then(
        function (allowed) {
          if (allowed) {
            this.ping(gossip.senderRS, "pong");
          }
        }.bind(this)
      );
    }
    else if (message.indexOf("pong") == 0) {
      /* all handled at lower generic level */
    }
  });

  Gossip.addTopic(Gossip.MESSAGE_TOPIC, function (gossip) {

    /* let the sender know we have received the message */
    function onMessageStored() {
      new Audio('images/beep.wav').play();
      this.sendGossip(gossip.senderRS, gossip.id, this.MESSAGE_RECEIVED_TOPIC);
      $rootScope.unread = true;
    }

    this.getSenderIsWhitelisted(gossip.senderRS).then(
      function (allowed) {
        if (!allowed) return;
        this.getChatService().get(gossip.senderRS).then(
          function (chat) {
            /* message received from known contact */
            if (chat) {
              gossip.chatId = chat.id;
              this.persistGossip(gossip).then(onMessageStored.bind(this));
            }
            /* message from unknown contact - create new chat object and store message */
            else {
              this.getChatService().add(gossip.senderRS).then(
                function (chat) {
                  gossip.chatId = chat.id;
                  this.persistGossip(gossip).then(onMessageStored.bind(this));
                }.bind(this)
              );
            }
          }.bind(this)
        );
      }.bind(this)
    );    
  });

  Gossip.addTopic(Gossip.MESSAGE_RECEIVED_TOPIC, function (raw_gossip) {
    var message = converters.hexStringToString(raw_gossip.message);
    db.transaction('rw', db.gossips, function () {
      db.gossips.where('id').
                 equals(message).
                 first().
                 then(
      function (gossip) {
        if (gossip) {
          gossip.received = true;
          gossip.save();
        }
      });
    });
  });

  Gossip.addTopic(Gossip.IS_TYPING_TOPIC, function (gossip) {

  });
});
module.factory('Gossip', function ($q, nxt, $rootScope, $timeout, db, publicKeyService, plugins) {

  var MS_TIMEOUT_INACTIVE  = 60*1000;
  var MS_TIMEOUT_HANDSHAKE = 5*1000;

  var Gossip = {

    DEBUG: true,
    providers: {},
    isActive: false,
    topics: {},
    currentAccount: null,
    api: null,
    subscriptions: [],
    chatService: null,
    listeners: [],
    ui: {
      isDisabled: false
    },
    allowed: {
      promise: null,
      allowed: {},
      getIsAllowed: function (id_rs) {
        if (this.promise) {
          return this.promise;
        }
        var deferred = $q.defer();
        if (angular.isDefined(this.allowed[id_rs])) {
          deferred.resolve(this.allowed[id_rs]);
        }
        else {
          plugins.get('alerts').confirm({
            title: 'Share online status',
            message: 'Do you want to share your online status so others can send you messages?'
          }).then(
            function (allowed) {
              this.allowed[id_rs] = allowed;
              deferred.resolve(allowed);
            }.bind(this)
          );
        }
        var promise = this.promise = deferred.promise;
        promise.then(function () { this.promise = null }.bind(this));
        return promise;
      }
    },

    /* available topics */
    PING_TOPIC: "1",
    MESSAGE_TOPIC: "2",
    MESSAGE_RECEIVED_TOPIC: "3",
    IS_TYPING_TOPIC: "4",

    /**
     * Adds a topic handler. Whenever a gossip message is received that matches this
     * topic this handler will be called.
     *
     * @param topic String (unsigned long)
     * @param handler Function (api, currentAccount, gossip)
     */
    addTopic: function (topic, handler) {
      this.topics[topic] = handler;
    },

    /**
     * Adds an external listener. 
     * The returned function removes the listener.
     *
     * @param topic String one of the supported gossip types
     * @param senderRS String
     * @param recipientRS String
     * @param listener Function
     */
    addListener: function (topic, senderRS, recipientRS, fn) {
      var conf = {
        topic: topic,
        senderRS: senderRS,
        recipientRS: recipientRS,
        fn: fn
      };
      this.listeners.push(conf);
      return function () {
        var index = this.listeners.indexOf(conf);
        if (index !== -1) {
          this.listeners[index] = null;
          this.listeners.splice(index, 1);
        }
      }.bind(this);
    },

    /**
     * Adds a subscription to a websocket topic.
     * Subscribe as many times as you like, all messages matching the topic
     * you provide will be handled by the topic handler you registered 
     * through addTopic.
     *
     * @param topic String
     * @param senderRS String
     * @param recipientRS String
     */
    subscribe: function (topic, senderRS, recipientRS) {
      var conf = {
        topic: this.createWebsocketTopic(senderRS, recipientRS, topic),
        handler: this.genericGossipHandler.bind(this)
      };
      this.subscriptions.push(conf);
      this.api.engine.socket().subscribe(conf.topic, conf.handler);
      return function () {
        var index = this.subscriptions.indexOf(conf);
        if (index !== -1) {
          this.subscriptions[i] = null;
          this.subscriptions.splice(index, 1);
          this.api.engine.socket().unsubscribe(conf.topic, conf.handler);
        }
      }.bind(this);
    },

    /* handles all gossip messages and forwards to topic handlers */
    genericGossipHandler: function (gossip) {
      if (this.DEBUG) {
        console.log('RECEIVED GOSSIP FROM '+gossip.senderRS+' '+Date.now(), gossip);
      }
      if (!this.topics[gossip.topic]) {
        console.log('Unsupported gossip topic '+gossip.topic, gossip);
        return;
      }
      if (this.currentAccount.id_rs == gossip.senderRS) {
        console.log('RECEIVED MESSAGE FROM SELF - STOP LISTENING !!!'+' '+Date.now());
        return;
      }
      if (!this.verify(gossip)) {
        console.log('Gossip could not be verified', gossip);
        return;
      }
      if (this.getIsFloodAttack(gossip.senderRS)) {
        return;
      }
      if (this.getSenderIsBlacklisted(gossip.senderRS)) {
        return;
      }

      var address = this.api.createAddress();
      gossip.recipientRS = address.set(gossip.recipient) ? address.toString() : '';

      publicKeyService.set(gossip.senderRS, gossip.senderPublicKey);
      this.updateOnlineStatus(gossip.senderRS, gossip.senderPublicKey);
      this.topics[gossip.topic].call(this, gossip);

      this.listeners.forEach(function (conf) {
        if  ((conf.topic &&conf.topic == gossip.topic) &&
             (conf.senderRS && conf.senderRS == gossip.senderRS) &&
             (conf.recipientRS && conf.recipientRS == gossip.recipientRS)) {
          conf.fn.call(null, gossip);
        }
      });
    },

    getIsFloodAttack: function (senderRS) {
      return false;
    },

    getSenderIsBlacklisted: function (senderRS) {
      return false;
    },

    /* determine if we auto-respond */
    getSenderIsWhitelisted: function (senderRS) {
      var deferred = $q.defer();
      deferred.resolve(true);
      return deferred.promise;
    },

    /* @event-listener - account unlocked */
    onOpenCurrentAccount: function (e, currentAccount) {
      this.api = nxt.get(currentAccount.id_rs);
      this.currentAccount = currentAccount;
      this.chatService = new ChatService();

      this.allowed.getIsAllowed(currentAccount.id_rs).then(
        function (allowed) {
          $rootScope.$evalAsync(function () { this.ui.isDisabled = !allowed }.bind(this));
          if (allowed && !this.isActive) {
            this.isActive = true;
            this.subscribe(Gossip.MESSAGE_TOPIC, null, currentAccount.id_rs);
            this.subscribe(Gossip.PING_TOPIC, null, currentAccount.id_rs);
            this.subscribe(Gossip.MESSAGE_RECEIVED_TOPIC, null, currentAccount.id_rs);
            this.subscribe(Gossip.IS_TYPING_TOPIC, null, currentAccount.id_rs);


            /* read all account contacts */
            this.getChatService().each(
              function (chat) {
                this.onAddChatContact(null, chat, true); // pass true to not send a ping
              }.bind(this)
            ).then(
              function () {
                this.ping(this.currentAccount.id_rs);
              }.bind(this)
            );
          }
        }.bind(this)
      );
    },

    /* @event-listener - account locked */
    onCloseCurrentAccount: function (e, currentAccount) {
      if (this.isActive) {
        $rootScope.$evalAsync(function () { this.ui.isDisabled = false }.bind(this));
        
        this.subscriptions.forEach(function (conf) {
          this.api.engine.socket().unsubscribe(conf.topic, conf.handler);
        }.bind(this));
        
        this.subscriptions.length = 0;
        this.isActive = false;

        Object.getOwnPropertyNames(this.providers||{}).forEach(function (id_rs) {
          this.providers[id_rs].destroy();
          delete this.providers[id_rs];
        }.bind(this));

        this.api = null;
        this.currentAccount = null;
      }
    },

    /**
     * @event-listener - new chat contact added
     *
     * start listening to pings send from this contact
     * upon closing the currentAccount these are removed 
     * if this is called on construction we pass the dont_ping=true argument to
     * indicate we dont need to send a targetted ping to this contact.
     * instead we rely on the I_AM_ALIVE initial ping and see if the contact responds to that
     * 
     * @param e Event (angular)
     * @param chat ChatModel
     * @param dont_ping Boolean
     */
    onAddChatContact: function (e, chat, dont_ping) {
      this.subscribe(Gossip.PING_TOPIC, chat.otherRS, null);

      // pre-create the provider
      var provider = this.getChatStatusProvider(null, chat.otherRS, chat.id); 
      if (dont_ping) { 
        provider.startWaitingForInitialPongReply();
      }
      else { /* send a directed ping to the new contact */
        this.ping(chat.otherRS);        
      }
    },

    /* called when the chat UI is activated */
    onActivated: function () {
      if (!this.isActive && $rootScope.currentAccount) {
        this.onOpenCurrentAccount(null, $rootScope.currentAccount);
      }
    },    

    /* enable the gossip feature when it was disabled */
    setEnabled: function () {
      if (this.ui.isDisabled && $rootScope.currentAccount) {
        this.ui.isDisabled = false;
        delete this.allowed.allowed[$rootScope.currentAccount.id_rs];
        this.onOpenCurrentAccount(null, $rootScope.currentAccount);
      }
    },

    getChatService: function () {
      return this.chatService;
    },

    /* Removes a contact from the db.chats collection and all gossips stored in db.gossips */
    removeContact: function (id_rs) {
      var deferred = $q.defer();
      db.transaction("rw", db.chats, db.gossips, function() {
        this.getChatService().get(id_rs).then(
          function (chat) {
            if (chat) {
              chat.delete().then(
                function () {
                  if (this.providers[id_rs]) {
                    this.providers[id_rs].destroy();
                    delete this.providers[id_rs];
                  }
                  db.gossips.where('chatId').equals(chat.id).delete();
                }.bind(this)
              );
            }
          }.bind(this)
        );
      }.bind(this)).then(deferred.resolve);
      return deferred.promise;
    },

    /**
     * Creates a topic to listen for gossips based on sender, recipient and/or topic.
     * Options are to listen for gossips from a specific sender, recipient, topic or
     * a combination of sender and topic or recipient and topic.
     *
     * Java Impl: /fimk/src/java/nxt/http/websocket/EventForwarder.java
     * 
     *    MS.notify("ADDEDGOSSIP*"+senderId, gossip);
     *    MS.notify("ADDEDGOSSIP#"+recipientId, gossip);
     *    MS.notify("ADDEDGOSSIP-"+topicId, gossip);
     *    MS.notify("ADDEDGOSSIP*"+senderId+"-"+topicId, gossip);
     *    MS.notify("ADDEDGOSSIP#"+recipientId+"-"+topicId, gossip);
     * 
     * @param senderRS 
     * @param recipientRS
     * @param topic String
     * @returns String
     */
    createWebsocketTopic: function (senderRS, recipientRS, topic) {
      var result = ['ADDEDGOSSIP'];
      if (senderRS && recipientRS) { throw "Combining sender and recipient not allowed" }
      if (!senderRS && !recipientRS && !topic) { throw "At least sender, recipient or topic must be provided" }
      if (senderRS)    { result.push('*',nxt.util.convertRSAddress(senderRS)) }
      if (recipientRS) { result.push('#',nxt.util.convertRSAddress(recipientRS)) }
      if (topic)       { result.push('-',topic) }
      return result.join('');
    },

    /**
     * Sends a ping (or pong)
     *
     * @param recipientRS String
     * @param message String (empty or put "pong" here)
     * @returns Promise
     */
    ping: function (recipientRS, message) {
      if (this.DEBUG) {
        var secretPhrase = this.currentAccount.secretPhrase;
        var publicKey = this.api.crypto.secretPhraseToPublicKey(secretPhrase);
        var id_rs = this.api.crypto.getAccountIdFromPublicKey(publicKey, true);
        var msg = ['### SEND '+(message||'PING')+' SENDER='+id_rs+' RECIPIENT='+recipientRS];
        console.log(msg.join('')+' '+Date.now());
      }
      var data = (message||"ping")+'-'+Date.now();
      return this.sendGossip(recipientRS, data, this.PING_TOPIC);
    },

    /**
     * Sends a message to a contact
     *
     * @param recipientRS String
     * @param message String clear un-encrypted text
     * @returns Promise     
     */
    message: function (recipientRS, message) {
      if (this.DEBUG) {
        var secretPhrase = this.currentAccount.secretPhrase;
        var publicKey = this.api.crypto.secretPhraseToPublicKey(secretPhrase);
        var id_rs = this.api.crypto.getAccountIdFromPublicKey(publicKey, true);
        var msg = ['### SEND MESSAGE SENDER='+id_rs+' RECIPIENT='+recipientRS];
        console.log(msg.join('')+' '+Date.now());
      }
      var provider = this.providers[recipientRS];
      var recipientPublicKey = provider.publicKey;
      if (recipientRS != this.api.crypto.getAccountIdFromPublicKey(recipientPublicKey, true)) {
        throw "WTF !! public key and account dont match"
      }

      var deferred = $q.defer();
      this.sendEncryptedGossip(recipientPublicKey, message, this.MESSAGE_TOPIC).then(
        function (gossip) {
          this.getChatService().get(recipientRS).then(
            function (chat) {
              gossip.chatId = chat.id;
              this.persistGossip(gossip);
              deferred.resolve(gossip);
            }.bind(this)
          );
        }.bind(this)
      );
      return deferred.promise;
    },

    /* @param id_rs String */
    updateOnlineStatus: function (id_rs, publicKey) {
      if (this.providers[id_rs]) {
        this.providers[id_rs].updateOnlineStatus(publicKey);
      }
    },

    getChatStatusProvider: function ($scope, id_rs, chatId) {
      if (!this.providers[id_rs]) {
        this.providers[id_rs] = new ChatStatusProvider(this.api, id_rs, chatId);
      }
      if ($scope) {
        this.providers[id_rs].set_$scope($scope);
      }
      return this.providers[id_rs];
    },

    /**
     * @public 
     *
     * @param recipientPublicKey String
     * @param message String
     * @param topic String numeric unsigned long
     * @returns Promise
     */
    sendEncryptedGossip: function (recipientPublicKey, message, topic) {
      var deferred = $q.defer();
      var encrypted_message = this.encryptMessage(recipientPublicKey, message);
      var data = converters.stringToHexString(encrypted_message);
      var recipient = this.api.crypto.getAccountIdFromPublicKey(recipientPublicKey, false); /* false means numeric */
      this.sendGossipData(recipient, data, topic).then(deferred.resolve, deferred.reject);
      return deferred.promise;
    },

    /**
     * @public 
     *
     * @param recipient String numeric account id
     * @param message String
     * @param topic String numeric unsigned long
     * @returns Promise
     */
    sendGossip: function (recipient, message, topic) {
      var deferred = $q.defer();
      var data = converters.stringToHexString(message);
      var numeric = /^\d+$/.test(recipient) ? recipient : nxt.util.convertRSAddress(recipient);
      this.sendGossipData(numeric, data, topic).then(deferred.resolve, deferred.reject);
      return deferred.promise;
    },

    sendGossipData: function (recipient, message, topic) {
      var deferred = $q.defer();
      var secretPhrase = this.currentAccount.secretPhrase;
      var arg = {
        requestType:'sendGossip',
        senderPublicKey: this.api.crypto.secretPhraseToPublicKey(secretPhrase),
        recipient: recipient,
        message: message,
        timestamp: nxt.util.convertToEpochTimestamp(Date.now()),
        topic: topic||"0"
      };
      var signatureseed = this.createSignatureSeed(arg);
      arg.signature = nxt.util.sign(signatureseed, secretPhrase);
      arg.id = this.api.crypto.getAccountIdFromPublicKey(arg.signature);

      /* generate the gossip locally so it can be returned and stored in the db */
      var gossip = {
        senderPublicKey: arg.senderPublicKey,
        senderRS: this.api.crypto.getAccountIdFromPublicKey(arg.senderPublicKey, true),
        recipient: arg.recipient,
        message: arg.message,
        timestamp: arg.timestamp,
        topic: arg.topic,
        signature: arg.signature,
        id: arg.id
      };
      if (this.verify(gossip)) {
        this.api.engine.socket().callAPIFunction(arg).then(
          function () {
            deferred.resolve(gossip);
          }, 
          deferred.reject
        );
      }
      else {
        deferred.reject('Gossip not valid');        
      }
      return deferred.promise;
    },

    encryptMessage: function (recipientPublicKey, message) {
      var options = {
        account: this.api.crypto.getAccountIdFromPublicKey(recipientPublicKey, false),
        publicKey: recipientPublicKey
      };
      var encrypted_json = this.api.crypto.encryptNote(message, options, this.currentAccount.secretPhrase);
      return JSON.stringify(encrypted_json);
    },

    /**
     * @param api
     * @param secretPhrase
     * @param publicKey
     * @param nonce
     * @param message
     * @return String
     */
    decryptMessage: function (publicKey, nonce, message) {
      var data    = converters.hexStringToByteArray(message);
      var options = {
        privateKey: converters.hexStringToByteArray(this.api.crypto.getPrivateKey(this.currentAccount.secretPhrase)),
        publicKey:  converters.hexStringToByteArray(publicKey),
        nonce:      converters.hexStringToByteArray(nonce)
      }
      return this.api.crypto.decryptData(data, options);
    },

    verify: function (gossip) {
      if (gossip.senderRS != this.api.crypto.getAccountIdFromPublicKey(gossip.senderPublicKey, true)) {
        console.log('Sender - public key dont match');
        return false;
      }
      var messageBytes = converters.hexStringToByteArray(gossip.message);
      if (messageBytes.length > 1000) {
        console.log('Message length too long - length ('+messageBytes.length+')');
        return false;
      }
      var signatureseed = this.createSignatureSeed(gossip);
      var signatureseedHex = converters.stringToHexString(signatureseed);
      var verified = this.api.crypto.verifyBytes(gossip.signature, signatureseedHex, gossip.senderPublicKey);
      if (!verified && this.DEBUG) {
        console.log('Could not verify gossip', gossip);
        return false;
      }
      return verified;
    },

    createSignatureSeed: function (gossip) {
      return gossip.timestamp+gossip.recipient+gossip.message+gossip.topic;
    },    

    /* adds a MESSAGE_TOPIC gossip to the db */
    persistGossip: function (gossip) {
      /* watch out not to introduce duplicates */
      return db.transaction("rw", db.gossips, db.chats, function() {
        db.gossips.where('id').
                   equals(gossip.id).
                   toArray().
                   then(
        function (existing_gossips) {
          /* same ID'd gossips can exist - but their chatId should always differ */
          for (var i=0; i<existing_gossips.length; i++) {
            if (existing_gossips[i].chatId == gossip.chatId) {
              return;
            }
          }
          gossip.localTimestamp = nxt.util.convertToEpochTimestamp(Date.now());
          if (this.DEBUG) {
            console.log('db.add', gossip);
          }
          db.gossips.put(gossip);

          /* update timestamp*/
          Gossip.getChatService().get(gossip.senderRS).then(
            function (chat) {
              chat.timestamp = gossip.timestamp;
              chat.save();
            }
          );
        }.bind(this));
      }.bind(this));
    }
  };

  function ChatStatusProvider(api, account, chatId) {
    this.api       = api;
    this.$scope    = null;
    this.account   = account;
    this.online    = false;
    this.loading   = false;
    this.timeout   = null;
    this.publicKey = null;
    this.chatId    = chatId;
    this._onTimeoutHandshake = angular.bind(this, this.onTimeoutHandshake);
    this._onTimeoutInactive  = angular.bind(this, this.onTimeoutInactive);
  }
  ChatStatusProvider.prototype = {

    destroy: function () {
      /* have to call this from async not to risk having an async execute after this call */
      this.safeAsync(function () {
        if (this.timeout) {
          $timeout.cancel(this.timeout);
        }
      });
    },

    reload: function (timeout_inactive) {
      this.safeAsync(function () {
        this.loading = true;
        Gossip.ping(this.account);
        this.setTimeout(this._onTimeoutHandshake, MS_TIMEOUT_HANDSHAKE);
      });
    },

    /* this has to be called BEFORE all contacts providers are up and the initial I_AM_ALIVE ping is dispatched */
    startWaitingForInitialPongReply: function () {
      this.safeAsync(function () {
        this.online  = false;
        this.loading = true;
        this.setTimeout(this._onTimeoutHandshake, MS_TIMEOUT_HANDSHAKE*3);
      });
    },

    updateOnlineStatus: function (publicKey) {
      if (this.account != this.api.crypto.getAccountIdFromPublicKey(publicKey, true)) {
        console.log('ALERT!! PUBLIC KEY - ACCOUNT MIS-MATCH (MIGHT BE TAMPER ATTEMPT)');
        return;
      }
      this.safeAsync(function () {
        this.publicKey = publicKey;
        this.loading   = false;
        this.online    = true;
        this.setTimeout(this._onTimeoutInactive, MS_TIMEOUT_INACTIVE);
      });
    },

    /* timed out ping send to account */
    onTimeoutHandshake: function () {
      this.safeAsync(function () {
        this.online  = false;
        this.loading = false;
      });      
    },

    /* account inactive for too long */
    onTimeoutInactive: function () {
      this.reload();
    },

    set_$scope: function ($scope) {
      this.$scope = $scope;
    },

    safeAsync: function (fn) {
      var self = this;
      this.$scope ? this.$scope.$evalAsync(function () { fn.call(self) }) : fn.call(this);
    },

    setTimeout: function (fn, ms) {
      if (this.timeout) {
        $timeout.cancel(this.timeout);
      }
      this.timeout = $timeout(fn, ms, false);
    }
  };

  /**
   * A Chat is a description of a conversation between two accounts.
   *
   * There always is the 'accountRS' which is the currently logged in
   * account and there is the 'otherRS' which is the account we have
   * the conversation with.
   * 
   * Chats are stored in the indexedDB and can be accessed through this
   * service.
   */

  function createFilter(name, value) {
    return function (object) {
      return object[name] == value;
    }
  }

  function ChatService() {
    this.cached = {};
  }
  ChatService.prototype = {
    add: function (otherRS) {
      if (!$rootScope.currentAccount) {
        throw new Error("Must log in first");
      }
      if ($rootScope.currentAccount.id_rs == otherRS) {
        throw new Error("Cannot add self as contact");
      }
      var deferred = $q.defer();
      db.chats.where('otherRS').
               equals(otherRS).
               and(createFilter('accountRS', $rootScope.currentAccount.id_rs)).
               count(
      function (count) {
        if (count == 0) {

          /* add the contact to the database */
          db.chats.put({
            accountRS: $rootScope.currentAccount.id_rs,
            otherRS: otherRS,
            timestamp: 0,
            publicKey: "",
            name: ""
          }).then(function (primary_key) {

            db.chats.get(primary_key).then(
              function (chat) {
                $rootScope.$emit('onAddChatContact', chat);
                deferred.resolve(chat);

                /* see if we can get a name from the network */
                var api = nxt.get($rootScope.currentAccount.id_rs);
                api.engine.socket().getAccount({account: otherRS}).then(
                  function (account) {
                    var updated = false;
                    if (account.accountName) {
                      updated = true;
                      chat.name = account.accountName;
                    }
                    if (account.publicKey) {
                      updated = true;
                      chat.publicKey = account.publicKey;
                    }
                    if (updated) {
                      chat.save();
                    }
                  }
                );
              }
            );
          });
        }
      });
      return deferred.promise;
    },

    list: function () {
      if (!$rootScope.currentAccount) {
        throw "Must log in first";
      }
      var deferred = $q.defer();
      db.chats.where('accountRS').
               equals($rootScope.currentAccount.id_rs).
               toArray(
      function (array) {
        deferred.resolve(array);
      });
      return deferred.promise;
    },

    each: function (fn) {
      var deferred = $q.defer();
      this.list().then(function (array) {
        if (Array.isArray(array)) {
          array.forEach(fn);
        }
        deferred.resolve();
      });
      return deferred.promise;
    },

    get: function (otherRS) {
      if (!$rootScope.currentAccount) {
        throw "Must log in first";
      }
      var deferred = $q.defer();
      if (this.cached[otherRS]) {
        deferred.resolve(this.cached[otherRS]);
      }
      else {
        db.chats.where('otherRS').
                 equals(otherRS).
                 and(createFilter('accountRS', $rootScope.currentAccount.id_rs)).
                 first(
        function (chat) {
          if (chat) {
            this.cached[otherRS] = chat;
            deferred.resolve(chat);
          }
          else {
            deferred.resolve(null);
          }
        }.bind(this));
      }
      return deferred.promise;
    }
  };

  return Gossip;
});
})();