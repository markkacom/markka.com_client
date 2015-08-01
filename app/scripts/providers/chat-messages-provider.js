(function () {
'use strict';
var module = angular.module('fim.base');
module.factory('ChatMessagesProvider', function (nxt, $q, IndexedEntityProvider, Emoji, KeyService, $rootScope) {

  function ChatMessagesProvider(api, $scope, pageSize, accountOne, accountTwo) {
    this.init(api, $scope, pageSize);
    this.accountOne = accountOne;
    this.accountTwo = accountTwo;
    this.accountOnePublicKey = null;
    this.accountTwoPublicKey = null;
    this.accountOneName = null;
    this.accountTwoName = null;

    this.priv = {};
    this.pub = {};

    this.subscribe('blockPoppedNew', this.blockPopped);
    this.subscribe('blockPushedNew', this.blockPushed);

    var account_id = nxt.util.convertRSAddress(this.accountOne);
    this.subscribe(this.account ? 'removedUnConfirmedTransactions-'+account_id : 'removedUnConfirmedTransactionsNew', this.removedUnConfirmedTransactions);
    this.subscribe(this.account ? 'addedUnConfirmedTransactions-'+account_id : 'addedUnConfirmedTransactionsNew', this.addedUnConfirmedTransactions);
    this.subscribe(this.account ? 'addedConfirmedTransactions-'+account_id : 'addedConfirmedTransactionsNew', this.addedConfirmedTransactions);
  }
  angular.extend(ChatMessagesProvider.prototype, IndexedEntityProvider.prototype, {

    /* @override */
    sortFunction: function (a, b) { return b.timestamp - a.timestamp },

    /* @override */
    uniqueKey: function (transaction) { return transaction.transaction; },

    getData: function (firstIndex) {
      var deferred = $q.defer();
      var args = {
        accountOne:     this.accountOne,
        accountTwo:     this.accountTwo,
        firstIndex:     firstIndex,
        lastIndex:      firstIndex + this.pageSize,
        requestType:    'getChatMessages'
      }      
      this.api.engine.socket().callAPIFunction(args).then(deferred.resolve, deferred.reject);
      return deferred.promise;
    },

    translate: function (transaction) {
      transaction.date = nxt.util.formatTimestamp(transaction.timestamp, true);
      transaction.attachment = transaction.attachment || {};
      if (transaction.senderRS == this.accountOne) {
        transaction.clazz = "fromMe";
        transaction.pull_clazz = "pull-right";
        transaction.attachment.senderPublicKey = this.accountOnePublicKey;
      }
      else {
        transaction.clazz = "fromThem";
        transaction.pull_clazz = "pull-left";
        transaction.says = this.accountTwoName;
        transaction.attachment.senderPublicKey = this.accountTwoPublicKey; 
      }
      var decoded  = this.decode(transaction);
      if (decoded) {
        transaction.text = Emoji.emojifi(decoded.text);
        transaction.encrypted = decoded.encrypted;
      }
    },

    dataIterator: function (data) {
      this.accountOnePublicKey = data.accountOnePublicKey;
      this.accountTwoPublicKey = data.accountTwoPublicKey;
      this.accountOneName = data.accountOneName;
      this.accountTwoName = data.accountTwoName||this.accountTwo;

      var messages = data.messages || [];
      for (var i=0; i<messages.length; i++) {
        this.translate(messages[i]);
      }
      return new Iterator(messages);
    },

    transactionIterator: function (transactions) {
      var transaction, data = [];
      for (var i=0; i<transactions.length; i++) {
        transaction = transactions[i];
        if (transaction.type == 1 && transaction.subtype == 0) {
          if (transaction.recipientRS == this.accountTwo || transaction.senderRS == this.accountTwo) {
            this.translate(transaction);
            data.push(transaction);
          }
        }
      }
      return new Iterator(data);
    },

    decodeAll: function () {
      var self = this;
      this.$scope.$evalAsync(function () {
        self.forEach(function (transaction) {
          self.translate(transaction);
        });
      });
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
            privateKey = converters.hexStringToByteArray(this.api.crypto.getPrivateKey(secretPhrase));
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
            publicKey = converters.hexStringToByteArray(this.api.crypto.secretPhraseToPublicKey(secretPhrase));
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
        var decrypted = this.api.crypto.decryptData(data, { 
          privateKey: privateKey,
          publicKey:  publicKey,
          nonce:      nonce
        });
        return decrypted;
      }
      return null;
    }
  });
  return ChatMessagesProvider;
});
})();