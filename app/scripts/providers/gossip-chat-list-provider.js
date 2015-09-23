(function () {
'use strict';
var module = angular.module('fim.base');
module.factory('GossipChatListProvider', function (nxt, $q, Gossip, db) {

  function emptyToNull(val) {
    if (typeof val == 'string') {
      return val.length == 0 ? null : val;
    }
    if (typeof val == 'number') {
      return val > 0 ? val : null;
    }
    return null;
  }

  /* Asynchronous (lazy) Iterator of remote Blockchain chat messages data */
  function ChatListProvider(parent) {
    this.parent   = parent;
    this.entities = [];
    this.hasMore  = true;
    this.index    = 0;
    this.pageSize = 3;
  }
  ChatListProvider.prototype = {
    
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
        account:        this.parent.account,
        firstIndex:     this.index,
        lastIndex:      this.index + this.pageSize,
        requestType:    'getChatList'
      };
      var self = this;
      this.parent.api.engine.socket().callAPIFunction(args).then(
        function (data) {
          var chats = data.chats||[];
          self.hasMore = chats.length != 0;
          for (var i=0; i<chats.length; i++) {
            self.entities.push(chats[i]);
          }
          deferred.resolve();
        }, 
        deferred.reject
      );
      return deferred.promise;
    }
  };
  
  function GossipChatListProvider(api, $scope, account) {
    this.api      = api;
    this.$scope   = $scope;
    this.account  = account;
    this.entities = []; // { accountRS: String }
    this.provider = new ChatListProvider(this);

    db.chats.addObserver($scope, this.createObserver());
  }
  GossipChatListProvider.prototype = {

    createObserver: function () {
      var self = this;
      /* note that when having multiple tabs open you could potentially get
         duplicate reports. */
      var must_update = false;
      return {
        create: function (models) {
          models.forEach(function (chat) {
            if (chat.accountRS == self.account) {
              self.translate(chat);
              self.entities.push(chat);
              must_update = true;
            }
          });
        },
        remove: function (models) {
          models.forEach(function (chat) {
            for (var i=0; i<self.entities.length; i++) {
              if (self.entities[i].id === chat.id) {
                must_update = true;
                self.entities.splice(i, 1);
                return;
              }
            }
          });
        },
        update: function (models) {
          models.forEach(function (chat) {
            for (var i=0; i<self.entities.length; i++) {
              if (self.entities[i].id === chat.id) {
                angular.extend(self.entities[i], chat);
                self.entities[i].label = emptyToNull(chat.name) || chat.otherRS;
                self.translate(self.entities[i]);
                must_update = true;
                break;
              }
            }
          });
        },
        finally: function () {
          if (must_update) {
            must_update = false;
            self.$scope.$evalAsync(function () {
              /* nothing to do here */
              var breakpoint_helper = 1;
            });
          }
        }
      }
    },

    reload: function () {
      var deferred = $q.defer();
      Gossip.getChatService().list().then(
        function (entities) {
          this.$scope.$evalAsync(function () {
            this.entities.length = 0;
            entities.forEach(function (chat) {
              this.translate(chat);
              this.entities.push(chat);
            }.bind(this));
            this.sort();
            deferred.resolve();

            /**
             * Lazily inspect the blockchain chats to see if there has been any activity
             * there. For existing chats update the timestamp, for non-existing chats create
             * a db entry. The db observer should be taking care of propagating it to the UI.
             */
            var repeat = function () {
              this.advance().then(repeat);
            }.bind(this);
            repeat();

          }.bind(this));
        }.bind(this)
      );      
      return deferred.promise;
    },

    sort: function () {
      this.entities.sort(this.sortFunction);
    },

    sortFunction: function (a,b) {
      return b.timestamp - a.timestamp;
    },

    translate: function (chat) {
      chat.label = emptyToNull(chat.name) || chat.otherRS;
      chat.date  = emptyToNull(chat.timestamp) ? nxt.util.formatTimestamp(chat.timestamp, true) : 'never';
      if (!chat.provider) {
        chat.provider = Gossip.getChatStatusProvider(this.$scope, chat.otherRS);
      }
    },

    advance: function () {
      var deferred = $q.defer();
      var self = this;
      this.provider.peek().then(function (remote_chat) {
        if (!remote_chat) return;
        db.transaction("rw", db.chats, function() {
          Gossip.getChatService().get(remote_chat.accountRS).then(
            function (local_chat) {
              /* we have a remote and a local chat */
              if (local_chat) {
                /* first determine if we already know of this blockchain message */
                if (local_chat.timestamp2 == remote_chat.timestamp) {
                  /* aparantly we already know of this remote chat
                     it is safe to stop looking further
                     we dont need to process any other remote chats since they returned in order */
                  deferred.reject();
                }
                else {
                  /* update the remote timestamp */
                  local_chat.timestamp2 = remote_chat.timestamp;
                  /* update the local timestamp - but only if it's newer */
                  if (local_chat.timestamp < remote_chat.timestamp) {
                    local_chat.timestamp  = remote_chat.timestamp;
                  }
                  /* save the changes - if there are any */
                  local_chat.save().then(
                    function () {
                      self.provider.next().then(deferred.resolve);
                    }
                  );
                }
              }
              /* there is no local chat object */
              else if (remote_chat.accountRS != $rootScope.currentAccount.id_rs) {
                /* create local copy and move on */
                Gossip.getChatService().add(remote_chat.accountRS).then(
                  function (local_chat) {
                    local_chat.timestamp2 = remote_chat.timestamp;
                    local_chat.timestamp  = remote_chat.timestamp;
                    local_chat.save().then(
                      function () {
                        self.provider.next().then(deferred.resolve);
                      }
                    );
                  }
                );
              }
            }
          );
        });
      });
      return deferred.promise;
    }  
  };
  return GossipChatListProvider;
});
})();