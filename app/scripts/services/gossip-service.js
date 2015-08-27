(function () {
'use strict';
var module = angular.module('fim.base');
module.run(function (Gossip, $rootScope) {
  $rootScope.$on('onOpenCurrentAccount', function (e, currentAccount) {
    Gossip.onOpenCurrentAccount(currentAccount);
  });
  $rootScope.$on('onCloseCurrentAccount', function (e, currentAccount) {
    Gossip.onCloseCurrentAccount(currentAccount);
  });
});
module.factory('Gossip', function ($q, nxt, $rootScope, $timeout, db, publicKeyService, plugins) {

  var MS_TIMEOUT_INACTIVE  = 60*1000;
  var MS_TIMEOUT_HANDSHAKE = 5*1000;

  function playsound() {
    new Audio('images/beep.wav').play();
  }

  var GossipAllowed = {
    promise: null,
    allowed: {},
    getIsAllowed: function (id_rs) {
      if (this.promise) {
        return this.promise;
      }
      var deferred = $q.defer(), self = this;
      if (angular.isDefined(this.allowed[id_rs])) {
        deferred.resolve(this.allowed[id_rs]);
      }
      else {
        plugins.get('alerts').confirm({
          title: 'Share online status',
          message: 'Do you want to share your online status so others can send you messages?'
        }).then(function (allowed) {
          self.allowed[id_rs] = allowed;
          deferred.resolve(allowed);
        });
      }
      var promise = this.promise = deferred.promise;
      promise.then(function () { self.promise = null });
      return promise;
    }
  };

  var Gossip = {

    DEBUG: false,
    PING_TOPIC: "1",
    MESSAGE_TOPIC: "2",
    __providers: {},
    isActive: false,
    ui: {
      isDisabled: false
    },

    /* @event-listener - account unlocked */
    onOpenCurrentAccount: function (currentAccount) {
      GossipAllowed.getIsAllowed(currentAccount.id_rs).then(
        function (allowed) {
          $rootScope.$evalAsync(function () {
            Gossip.ui.isDisabled = !allowed;
          });
          if (allowed && !Gossip.isActive) {
            Gossip.isActive = true;
            GossipPingServer.start(currentAccount);
            GossipMessageServer.start(currentAccount);
          }
        }
      );
    },

    /* @event-listener - account locked */
    onCloseCurrentAccount: function (currentAccount) {
      if (Gossip.isActive) {
        $rootScope.$evalAsync(function () {
          Gossip.ui.isDisabled = false;
        });

        GossipPingServer.stop(currentAccount);
        GossipMessageServer.stop(currentAccount);
        Gossip.isActive = false;

        var self = this;
        Object.getOwnPropertyNames(this.__providers||{}).forEach(function (id_rs) {
          self.__providers[id_rs].destroy();
          delete self.__providers[id_rs];
        });
      }
    },

    /* called when the chat UI is activated */
    onActivated: function () {
      if (!this.isActive && $rootScope.currentAccount) {
        this.onOpenCurrentAccount($rootScope.currentAccount);
      }
    },

    /* make a previously non-allowed */
    setEnabled: function () {
      if (Gossip.ui.isDisabled && $rootScope.currentAccount) {
        Gossip.ui.isDisabled = false;
        delete GossipAllowed.allowed[$rootScope.currentAccount.id_rs];
        this.onOpenCurrentAccount($rootScope.currentAccount);
      }
    },

    getChatService: function () {
      return chatService;
    },

    /* Removes a contact from the db.chats collection and all gossips stored in db.gossips */
    removeContact: function (id_rs) {
      var deferred = $q.defer();
      db.transaction("rw", db.chats, db.gossips, function() {
        chatService.get(id_rs).then(
          function (chat) {
            if (chat) {
              chat.delete().then(
                function () {
                  if (Gossip.__providers[id_rs]) {
                    Gossip.__providers[id_rs].destroy();
                    delete Gossip.__providers[id_rs];
                  }
                  db.gossips.where('chatId').equals(chat.id).delete();
                }
              );
            }
          }
        );
      }).then(deferred);
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
     * @param api Object nxt or fim
     * @param secretPhrase String
     * @param recipientRS String
     * @param message String (empty or put "pong" here)
     * @returns String
     */
    ping: function (api, secretPhrase, recipientRS, message) {
      if (this.DEBUG) {
        var publicKey = api.crypto.secretPhraseToPublicKey(secretPhrase);
        var id_rs = api.crypto.getAccountIdFromPublicKey(publicKey, true);
        var msg = ['### SEND '+(message||'PING')+' SENDER='+id_rs+' RECIPIENT='+recipientRS];
        console.log(msg.join('')+' '+Date.now());
      }
      var data = (message||"ping")+'-'+Date.now();
      return this.sendGossip(api, secretPhrase, recipientRS, data, this.PING_TOPIC);
    },

    /**
     * Sends a message to a contact
     *
     * @param api Object nxt or fim
     * @param secretPhrase String
     * @param recipientRS String
     * @param message String clear un-encrypted text
     */
    message: function (api, secretPhrase, recipientRS, message) {
      if (this.DEBUG) {
        var publicKey = api.crypto.secretPhraseToPublicKey(secretPhrase);
        var id_rs = api.crypto.getAccountIdFromPublicKey(publicKey, true);
        var msg = ['### SEND MESSAGE SENDER='+id_rs+' RECIPIENT='+recipientRS];
        console.log(msg.join('')+' '+Date.now());
      }
      var provider = this.__providers[recipientRS];
      var recipientPublicKey = provider.publicKey;
      if (recipientRS != api.crypto.getAccountIdFromPublicKey(recipientPublicKey, true)) {
        throw "WTF !! public key and account dont match"
      }

      var deferred = $q.defer();
      this.sendEncryptedGossip(api, secretPhrase, recipientPublicKey, message, this.MESSAGE_TOPIC).then(
        function (gossip) {
          chatService.get(recipientRS).then(
            function (chat) {
              gossip.chatId = chat.id;
              Gossip.db.add(api, gossip);
              deferred.resolve(gossip);
            }
          );
        }
      );
      return deferred.promise;
    },

    /* @param id_rs String */
    updateOnlineStatus: function (id_rs, publicKey) {
      if (this.__providers[id_rs]) {
        this.__providers[id_rs].updateOnlineStatus(publicKey);
      }
    },

    getChatStatusProvider: function (api, $scope, id_rs, chatId) {
      if (!this.__providers[id_rs]) {
        this.__providers[id_rs] = new ChatStatusProvider(api, id_rs, chatId);
      }
      if ($scope) {
        this.__providers[id_rs].set_$scope($scope);
      }
      return this.__providers[id_rs];
    },

    /**
     * @public 
     *
     * @param api Object nxt or fim
     * @param secretPhrase String
     * @param recipientPublicKey String
     * @param message String
     * @param topic String numeric unsigned long
     * @returns Promise
     */
    sendEncryptedGossip: function (api, secretPhrase, recipientPublicKey, message, topic) {
      var deferred = $q.defer();
      var encrypted_message = this.encryptMessage(api, secretPhrase, recipientPublicKey, message);
      var data = converters.stringToHexString(encrypted_message);
      var recipient = api.crypto.getAccountIdFromPublicKey(recipientPublicKey, false); /* false means numeric */
      this.sendGossipData(api, secretPhrase, recipient, data, topic).then(deferred.resolve, deferred.reject);
      return deferred.promise;
    },

    /**
     * @public 
     *
     * @param api Object nxt or fim
     * @param secretPhrase String
     * @param recipient String numeric account id
     * @param message String
     * @param topic String numeric unsigned long
     * @returns Promise
     */
    sendGossip: function (api, secretPhrase, recipient, message, topic) {
      var deferred = $q.defer();
      var data = converters.stringToHexString(message);
      var numeric = /^\d+$/.test(recipient) ? recipient : nxt.util.convertRSAddress(recipient);
      this.sendGossipData(api, secretPhrase, numeric, data, topic).then(deferred.resolve, deferred.reject);
      return deferred.promise;
    },

    sendGossipData: function (api, secretPhrase, recipient, message, topic) {
      var deferred = $q.defer();
      var arg = {
        requestType:'sendGossip',
        senderPublicKey: api.crypto.secretPhraseToPublicKey(secretPhrase),
        recipient: recipient,
        message: message,
        timestamp: nxt.util.convertToEpochTimestamp(Date.now()),
        topic: topic||"0"
      };
      var signatureseed = Gossip.createSignatureSeed(arg);
      arg.signature = nxt.util.sign(signatureseed, secretPhrase);
      arg.id = api.crypto.getAccountIdFromPublicKey(arg.signature);

      /* generate the gossip locally so it can be returned and stored in the db */
      var gossip = {
        senderPublicKey: arg.senderPublicKey,
        senderRS: api.crypto.getAccountIdFromPublicKey(arg.senderPublicKey, true),
        recipient: arg.recipient,
        message: arg.message,
        timestamp: arg.timestamp,
        topic: arg.topic,
        signature: arg.signature,
        id: arg.id
      };
      if (Gossip.verify(api, gossip)) {
        api.engine.socket().callAPIFunction(arg).then(
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

    encryptMessage: function (api, secretPhrase, recipientPublicKey, message) {
      var encrypted_json = encrypt(api, secretPhrase, recipientPublicKey, message);
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
    decryptMessage: function (api, secretPhrase, publicKey, nonce, message) {
      var data    = converters.hexStringToByteArray(message);
      var options = {
        privateKey: converters.hexStringToByteArray(api.crypto.getPrivateKey(secretPhrase)),
        publicKey:  converters.hexStringToByteArray(publicKey),
        nonce:      converters.hexStringToByteArray(nonce)
      }
      return api.crypto.decryptData(data, options);
    },

    verify: function (api, gossip) {
      if (gossip.senderRS != api.crypto.getAccountIdFromPublicKey(gossip.senderPublicKey, true)) {
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
      var signatureseedBytes = converters.hexStringToByteArray(signatureseedHex);
      return api.crypto.verifyBytes(gossip.signature, signatureseedHex, gossip.senderPublicKey);
    },

    createSignatureSeed: function (gossip) {
      return gossip.timestamp+gossip.recipient+gossip.message+gossip.topic;
    },    

    db: {
      /* adds a MESSAGE_TOPIC gossip to the db */
      add: function (api, gossip) {
        /* watch out not to introduce duplicates */
        return db.transaction("rw", db.gossips, function() {
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
            var address = api.createAddress();
            gossip.recipientRS = address.set(gossip.recipient) ? address.toString() : '';
            gossip.localTimestamp = nxt.util.convertToEpochTimestamp(Date.now());
            if (Gossip.DEBUG) {
              console.log('db.add', gossip);
            }
            db.gossips.put(gossip);
          });
        });
      }
    }
  };

  /**
   * @param api
   * @param secretPhrase
   * @param recipientPublicKey
   * @param message
   * @return { nonce: '', message: '' }
   */
  function encrypt(api, secretPhrase, recipientPublicKey, message) {
    var options = {
      account: api.crypto.getAccountIdFromPublicKey(recipientPublicKey, false),
      publicKey: recipientPublicKey
    };
    return api.crypto.encryptNote(message, options, secretPhrase);
  }

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

    reload: function () {
      this.safeAsync(function () {
        if (this.online == false) {
          this.loading = true;
          Gossip.ping(this.api, $rootScope.currentAccount.secretPhrase, this.account);
          this.setTimeout(this._onTimeoutHandshake, MS_TIMEOUT_HANDSHAKE);
        }
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
      this.safeAsync(function () {
        this.online  = false;
        this.reload();
      });
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
   * The message server listens for messages that where send TO the
   * currently logged in account.
   *
   * When a message is received the server decides if it should store the 
   * message or discard it (spam).
   *
   * Consult the GossipPingServer.getSenderIsWhitelisted(id_rs) if an account
   * is allowed to send messages.
   */

  var DDOS_DELAY_MS = 500;

  var GossipMessageServer = {
    DEBUG: false,
    __running: false,

    start: function (currentAccount) {
      this.__running = true;
      this.onOpenCurrentAccount(currentAccount);
    },

    stop: function (currentAccount) {
      if (this.__running) {
        this.__running = false;
        this.onCloseCurrentAccount(currentAccount);
      }
    },

    /* start listening for pings send to us */
    onOpenCurrentAccount: function (currentAccount) {
      this.id_rs   = currentAccount.id_rs;
      this.api     = nxt.get(currentAccount.id_rs);
      this.handler = angular.bind(this, this.onMessageReceived);
      this.topic   = Gossip.createWebsocketTopic(null, currentAccount.id_rs, Gossip.MESSAGE_TOPIC);
      if (this.DEBUG) {
        console.log('SUBSCRIBE TO RECIPIENT='+currentAccount.id_rs+' TOPIC=MESSAGE'+' '+Date.now());
      }
      this.api.engine.socket().subscribe(this.topic, this.handler);
    },

    /* stop listening for pings send to us */
    onCloseCurrentAccount: function (currentAccount) {
      if (this.DEBUG) {
        console.log('UN-SUBSCRIBE RECIPIENT='+currentAccount.id_rs+' TOPIC=MESSAGE'+' '+Date.now());
      }      
      this.api.engine.socket().unsubscribe(this.topic, this.handler);
      this.handler = null;
      this.topic   = null;
      this.api     = null;
      this.id_rs   = null;
    },

    onMessageReceived: function (gossip) {
      //console.log('onMessageReceived', gossip);
      if (this.id_rs == gossip.senderRS) {
        console.log('RECEIVED MESSAGE FROM SELF - STOP LISTENING !!!'+' '+Date.now());
        return;
      }

      console.log('RECEIVED MESSAGE FROM '+gossip.senderRS+' '+Date.now());
      var self = this;
      GossipPingServer.getSenderIsWhitelisted(gossip.senderRS).then(
        function (allowed) {
          if (allowed) {
            if (Gossip.verify(self.api, gossip)) {
              console.log('VALID MESSAGE');

              publicKeyService.set(gossip.senderRS, gossip.senderPublicKey);
              chatService.get(gossip.senderRS).then(
                function (chat) {
                  /* message received from known contact */
                  if (chat) {
                    gossip.chatId = chat.id;
                    Gossip.db.add(self.api, gossip).then(playsound);
                  }
                  /* message from unknown contact - create new chat object and store message */
                  else {
                    chatService.add(gossip.senderRS).then(
                      function (chat) {
                        gossip.chatId = chat.id;
                        Gossip.db.add(self.api, gossip).then(playsound);
                      }
                    );
                  }
                }
              );
            }
            else {
              console.log('IN-VALID MESSAGE');
            }
          }
        }
      );
    }
  };

  /**
   * The ping server listens for ping messages that where send TO the
   * currently logged in account and to ping messages that where 
   * send FROM one of our contacts.
   *
   * When a ping is received the server decides if it should send a 
   * reply ping. 
   *
   * When an unknown account sends a ping the user is prompted if he/she
   * wishes to share his online status. When a known account sends a ping
   * we automatically reply with a ping.
   */

  var DDOS_DELAY_MS = 500;

  var GossipPingServer = {
    DEBUG: false,
    _unregister: null,
    __running: true,

    start: function (currentAccount) {
      this.__running = true;
      this._unregister = $rootScope.$on('onAddChatContact', angular.bind(this, this.onAddChatContact));
      this.onOpenCurrentAccount(currentAccount);
    },

    stop: function (currentAccount) {
      if (this.__running) {
        this.__running = false;
        this._unregister();
        this._unregister = null;
        this.onCloseCurrentAccount(currentAccount);
      }
    },

    /* start listening for pings send to us */
    onOpenCurrentAccount: function (currentAccount) {
      this.id_rs   = currentAccount.id_rs;
      this.api     = nxt.get(currentAccount.id_rs);
      this.handler = angular.bind(this, this.onPingReceived);
      this.topic   = Gossip.createWebsocketTopic(null, currentAccount.id_rs, Gossip.PING_TOPIC);
      if (this.DEBUG) {
        console.log('SUBSCRIBE TO RECIPIENT='+currentAccount.id_rs+' TOPIC=PING'+' '+Date.now());
      }
      this.api.engine.socket().subscribe(this.topic, this.handler);

      /* read all account contacts */
      var self = this;
      chatService.each(
        function (chat) {
          GossipPingServer.onAddChatContact(null, chat, true); // pass true to not send a ping
        }
      ).then(
        function () {
          self._last_ping_send = Date.now();
          Gossip.ping(self.api, $rootScope.currentAccount.secretPhrase, self.id_rs);
        }
      );
    },

    /* stop listening for pings send to us */
    onCloseCurrentAccount: function (currentAccount) {
      var self = this;
      Object.getOwnPropertyNames(this.contacts||{}).forEach(function (id_rs) {
        var topic   = self.contacts[id_rs].topic;
        var handler = self.contacts[id_rs].handler;
        self.api.engine.socket().unsubscribe(topic, handler);
        delete self.contacts[id_rs];
      });
      this.api.engine.socket().unsubscribe(this.topic, this.handler);
      this.handler = null;
      this.topic   = null;
      this.api     = null;
      this.id_rs   = null;
    },

    /**
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
      var id_rs = chat.otherRS;
      this.contacts = this.contacts||{};
      if (this.contacts[id_rs]) {
        throw "Duplicate contact";
      }
      this.contacts[id_rs] = {
        handler:  angular.bind(this, this.onPingReceived),
        topic:    Gossip.createWebsocketTopic(id_rs, null, Gossip.PING_TOPIC)
      };

      if (this.DEBUG) {
        console.log('SUBSCRIBE TO SENDER='+id_rs+' TOPIC=PING'+' '+Date.now());
      }
      this.api.engine.socket().subscribe(this.contacts[id_rs].topic, this.contacts[id_rs].handler);

      // // pre-create the provider
      var provider = Gossip.getChatStatusProvider(this.api, null, chat.otherRS, chat.id); 
      if (dont_ping) { 
        provider.startWaitingForInitialPongReply();
      }
      else {
        /* send a directed ping to the new contact */
        Gossip.ping(this.api, $rootScope.currentAccount.secretPhrase, id_rs);        
      }
    },

    onPingReceived: function (gossip) {
      //console.log('onPingReceived', gossip);
      if (this.id_rs == gossip.senderRS) {
        console.log('RECEIVED PING FROM SELF - STOP LISTENING !!!'+' '+Date.now());
        return;
      }
      var message = converters.hexStringToString(gossip.message);
      if (message.indexOf("ping") == 0) {
        if (this.DEBUG) {
          console.log('RECEIVED PING SENDER='+gossip.senderRS+' RECIPIENT='+gossip.recipientRS+' '+Date.now());
        }
        if (this.getIsPingFloodAttack(gossip.senderRS)) {
          return;
        }
        if (this.getSenderIsBlacklisted(gossip.senderRS)) {
          return;
        }
        publicKeyService.set(gossip.senderRS, gossip.senderPublicKey);
        Gossip.updateOnlineStatus(gossip.senderRS, gossip.senderPublicKey);
        var self = this;
        this.getSenderIsWhitelisted(gossip.senderRS).then(
          function (allowed) {
            if (allowed) {
              self._last_ping_send = Date.now();
              Gossip.ping(self.api, $rootScope.currentAccount.secretPhrase, gossip.senderRS, "pong");
            }
          }
        );
      }
      else if (message.indexOf("pong") == 0) {
        if (this.DEBUG) {
          console.log('RECEIVED PONG SENDER='+gossip.senderRS+' RECIPIENT='+gossip.recipientRS+' '+Date.now());
        }
        publicKeyService.set(gossip.senderRS, gossip.senderPublicKey);
        Gossip.updateOnlineStatus(gossip.senderRS, gossip.senderPublicKey);
      }
      else {
        if (this.DEBUG) {
          console.log('RECEIVED INVALID SENDER='+gossip.senderRS+' RECIPIENT='+gossip.recipientRS+' '+Date.now());
        }
      }
    },

    getIsPingFloodAttack: function (id_rs) {
      // this._last_ping_send = this._last_ping_send||0;
      // var delay = Date.now() - this._last_ping_send;
      // if (delay < DDOS_DELAY_MS) {
      //   console.log('Ping flood attack: '+id_rs+' ('+delay+')');
      //   return true;
      // }
      return false;
    },

    /* @returns Boolean - comes from db */
    getSenderIsBlacklisted: function (id_rs) {
      return false;
    },

    /* @returns Promise(boolean) */
    getSenderIsWhitelisted: function (id_rs) {
      var deferred = $q.defer();
      deferred.resolve(true);
      return deferred.promise;
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

  function clearCache() {
    chatService.cached = {};
  }

  $rootScope.$on('onOpenCurrentAccount', clearCache);
  $rootScope.$on('onCloseCurrentAccount', clearCache);

  var chatService = {
    cached: {},
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
      if (chatService.cached[otherRS]) {
        deferred.resolve(this.cached[otherRS]);
      }
      else {
        db.chats.where('otherRS').
                 equals(otherRS).
                 and(createFilter('accountRS', $rootScope.currentAccount.id_rs)).
                 first(
        function (chat) {
          if (chat) {
            chatService.cached[otherRS] = chat;
            deferred.resolve(chat);
          }
          else {
            deferred.resolve(null);
          }
        });
      }
      return deferred.promise;
    }
  };

  return Gossip;
});
})();