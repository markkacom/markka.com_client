(function () {
'use strict';
var module = angular.module('fim.base');
module.factory('PaymentsProvider', function (nxt, $q, modals, plugins, $rootScope) {

  function PaymentsProvider(api, $scope, id_rs) {
    this.api          = api;
    this.$scope       = $scope;
    this.id_rs        = id_rs;
    this.text_input   = window.localStorage.getItem('PAYMENTS-'+id_rs+'-TEXT') || '';
    this.payments     = [];
    this.transactions = {}; /* key:transaction, value:payment */
    this.totalNXT     = '';
    this.locked       = false;

    this.PREPARE      = true;
    this.STAGE        = false;

    this.socket().subscribe('blockPoppedNew', angular.bind(this, this.blockPopped), $scope);
    this.socket().subscribe('blockPushedNew', angular.bind(this, this.blockPushed), $scope);

    var account_id    = nxt.util.convertRSAddress(id_rs);
    this.socket().subscribe('removedUnConfirmedTransactions-'+account_id, angular.bind(this, this.removedUnConfirmedTransactions), $scope);
    this.socket().subscribe('addedUnConfirmedTransactions-'+account_id, angular.bind(this, this.addedTransactions), $scope);
    this.socket().subscribe('addedConfirmedTransactions-'+account_id, angular.bind(this, this.addedTransactions), $scope);

    try {
      var payments = JSON.parse(window.localStorage.getItem('PAYMENTS-'+id_rs));
      if (Array.isArray(payments)) {
        this.payments = payments;
        var totalNQT  = '0';
        var self      = this;

        for (var i=0; i<payments.length; i++) {
          totalNQT = (new BigInteger(totalNQT)).add(new BigInteger(payments[i].amountNQT)).toString();
          payments[i].setStatus = function (_status) {
            var _payment = this;
            self.$scope.$evalAsync(function () {
              _payment.status = _status;
            });
          }
        }
        this.totalNXT = nxt.util.convertToNXT(totalNQT.toString());
        this.socket().getBlockchainState().then(
          function (block) {
            self.blockPushed(block);
          }
        );
        console.log('payments', payments);
      }
    } catch (e) {
      console.log(e);
    }
  }
  PaymentsProvider.prototype = {
    snapshot: function () {
      window.localStorage.setItem('PAYMENTS-'+this.id_rs, JSON.stringify(this.payments));
    },

    socket: function () {
      return this.api.engine.socket();
    },

    load: function () {
      var self = this, lines = this.text_input.match(/[^\r\n]+/g);
      this.payments.length = 0;
      var totalNQT = '0';

      angular.forEach(lines, function (line, index) {
        var cols        = line.split(',');
        var recipientRS = cols[0];
        var amountNXT   = cols[1];
        var amountNQT   = nxt.util.convertToNQT(cols[1]);
        var ispublic    = cols[2] ? cols[2] == 'true' : false;
        var message     = cols[3] ? cols.slice(3).join(',') : null;
        var status      = 'waiting';
        var error       = false;

        if (!isValidAddress(recipientRS, self.api)) {
          status = 'invalid address';
          error  = true;
        }

        var payment = {
          recipientRS: recipientRS,
          amountNXT:   amountNXT,
          amountNQT:   amountNQT,
          ispublic:    ispublic,
          message:     message,
          status:      status,
          error:       error,
          setStatus:   function (_status) {
            var _payment = this;
            self.$scope.$evalAsync(function () {
              _payment.status = _status;
            });
          }
        };

        self.payments.push(payment);

        if (error === false) {
          totalNQT = (new BigInteger(totalNQT)).add(new BigInteger(amountNQT)).toString();
        }
      });
      this.PREPARE    = false;
      this.STAGE      = true;
      this.totalNXT   = nxt.util.convertToNXT(totalNQT.toString());

      window.localStorage.setItem('PAYMENTS-'+this.id_rs, JSON.stringify(this.payments));
      window.localStorage.setItem('PAYMENTS-'+this.id_rs+'-TEXT', this.text_input);      
    },

    execute: function () {
      if (!this.locked) {
        this.locked = true;
        this.iterator = new Iterator(this.payments);
        this.secretPhrase = $rootScope.currentAccount.secretPhrase;
        this.senderPublicKey = this.api.crypto.secretPhraseToPublicKey(this.secretPhrase);
        this.next();
        this.locked = false;
      }
    },

    next: function () {
      if (this.iterator.hasMore()) {
        var payment = this.iterator.next();
        var args = {
          feeNQT:     nxt.util.convertToNQT(String(this.api.engine.feeCost)),
          deadline:   '1440',
          sender:     this.id_rs,
          recipient:  nxt.util.convertRSAddress(payment.recipientRS),
          amountNQT:  payment.amountNQT
        };
        if (payment.message) {
          args.message = payment.message;
          args.messageIsText = 'true';
          if (payment.ispublic) {
            args.public_message = true;
          }
          else {
            args.encrypt_message = true;
          }
        }
        this.prepareTransaction(args, payment);
      }
    },

    prepareTransaction: function (args, payment) {
      var self = this;
      if (args.encrypt_message) {
        getAccountPublicKey(args.recipient, this.api).then(
          function (recipientPublicKey) {
            args.recipientPublicKey = recipientPublicKey;
            self.sendTransaction(args, payment);
          },
          function () {
            promptAccountPublicKey(args.recipient).then(
              function (recipientPublicKey) {
                args.recipientPublicKey = recipientPublicKey;
                self.sendTransaction(args, payment);
              },
              function () {
                payment.setStatus('failed');
                self.next();
              }
            );
          }
        );
      }
      else {
        self.sendTransaction(args, payment);
      }
    },

    sendTransaction: function (args, payment) {
      var self = this;
      args.publicKey    = this.senderPublicKey;
      args.requestType  = 'sendMoney';

      addMessageData(args, this.secretPhrase, this.api);

      delete args.recipientPublicKey;

      plugins.get('alerts').progress({ title: "Please wait" }).then(
        function (progress) {

          var socket = self.socket();

          payment.setStatus('Creating Transaction');
          socket.callAPIFunction(args).then(
            function (data) {

              if (data.error || data.errorDescription) {
                progress.setErrorMessage(data.error || data.errorDescription);
                progress.close().then(function () {
                  payment.error = true;
                  payment.setStatus(data.error || data.errorDescription);
                  self.snapshot();
                  self.next();
                });                
                return;
              }

              progress.setMessage('Signing Transaction');
              var signature   = self.api.crypto.signBytes(data.unsignedTransactionBytes, converters.stringToHexString(self.secretPhrase));

              if (!self.api.crypto.verifyBytes(signature, data.unsignedTransactionBytes, self.senderPublicKey)) {
                var msg = i18n.format('error_signature_verification_client');
                progress.setErrorMessage(msg);
                progress.close().then(function () {
                  payment.error = true;
                  payment.setStatus(msg);
                  self.snapshot();
                  self.next();
                });
                return;
              } 
              else {
                var payload = self.api.verifyAndSignTransactionBytes(data.unsignedTransactionBytes, signature, 
                                  args.requestType, args, self.api.type, self.api.engine.constants());
                if (!payload) {
                  var msg = i18n.format('error_signature_verification_server');
                  progress.setErrorMessage(msg);
                  progress.close().then(function () {
                    payment.error = true;
                    payment.setStatus(msg);
                    self.snapshot();
                    self.next();
                  });
                  return;
                } 

                var fullHash        = self.api.crypto.calculateFullHash(data.unsignedTransactionBytes, signature);
                var transaction     = self.api.crypto.calculateTransactionId(fullHash);
                payment.transaction = transaction;
                payment.setStatus('success');
                self.transactions[transaction] = payment;
                self.snapshot();

                progress.setMessage('Broadcasting Transaction');
                socket.callAPIFunction({ requestType: 'broadcastTransaction', transactionBytes: payload }).then(
                  function (data) {
                    progress.animateProgress().then(
                      function () {
                        new Audio('images/beep.wav').play();
                        progress.setMessage('Transaction sent successfully');
                        progress.close().then(function () {
                          self.next();
                        });
                      }
                    );                        
                  },
                  function (data) {
                    var msg = JSON.stringify(data);
                    console.log(msg);
                    progress.setErrorMessage(msg);
                    progress.close().then(function () {
                      payment.error = true;
                      payment.setStatus(msg);
                      self.snapshot();
                      self.next();
                    });
                  }
                )
              }
            },
            function (data) {
              var msg = JSON.stringify(data);
              console.log(msg);              
              progress.setErrorMessage(msg);
              progress.close().then(function () {
                payment.error = true;
                payment.setStatus(msg);
                self.snapshot();
                self.next();
              });
            }
          );
        }
      );
    },

    blockPopped: function (block) {
      var self = this;
      $rootScope.$evalAsync(function () {
        var payment;
        for (var i=0; i<self.payments.length; i++) {
          payment = self.payments[i];
          if (payment.height) {
            if (payment.height <= block.height) {
              payment.confirmations = block.height - payment.height;
            }
          }
        }
        self.snapshot();
      });
    },

    blockPushed: function (block) {
      console.log('blockPushed', block)
      var self = this;
      $rootScope.$evalAsync(function () {
        for (var i=0; i<self.payments.length; i++) {
          if (self.payments[i].height) {
            self.payments[i].confirmations = block.height - self.payments[i].height;
          }
        }
        self.snapshot();
      });      
    },

    removedUnConfirmedTransactions: function (transactions) {
      for (var i=0; i<transactions.length; i++) {
        var transaction = transactions[i];
        var payment = this.transactions[transaction.transaction];
        if (payment) {
          delete payment.height;
          delete payment.confirmations;
        }
      }
      this.snapshot();
    },

    addedTransactions: function (transactions) {
      for (var i=0; i<transactions.length; i++) {
        var transaction = transactions[i];
        var payment = this.transactions[transaction.transaction];
        if (payment) {
          payment.height = transaction.height;
          payment.confirmations = transaction.confirmations;
        }
      }
      this.snapshot();
    }
  }

  /* Returns true, false or undefined if the engine could not be determined */
  function isValidAddress(text, api) {
    return api.createAddress().set(text);
  }

  function getAccountPublicKey(account, api) {
    var deferred = $q.defer();
    api.engine.socket().getAccount({account: account}).then(
      function (data) {
        if (data.publicKey) {
          deferred.resolve(data.publicKey)
        }
        else {
          deferred.reject();
        }
      },
      deferred.reject
    );
    return deferred.promise;
  }

  function promptAccountPublicKey(account) {
    var deferred = $q.defer();
    deferred.resolve('IMPLEMENT THIS DIALOG PLEASE. MUST RETURN A PUBLIC KEY');
    return deferred.promise;
  }

  /* Encrypts message data and adds that to data arg */
  function addMessageData(data, secretPhrase, api) {

    /* Encrypt message to recipient */
    if (data.encrypt_message && data.message) {
      var options = {};
      if (data.recipient) {
        options.account = data.recipient;
      } 
      else if (data.encryptedMessageRecipient) {
        options.account = data.encryptedMessageRecipient;
        delete data.encryptedMessageRecipient;
      }

      if (data.recipientPublicKey) {
        options.publicKey = data.recipientPublicKey;
      }

      var encrypted = api.crypto.encryptNote(data.message, options, secretPhrase);
      
      data.encryptedMessageData = encrypted.message;
      data.encryptedMessageNonce = encrypted.nonce;
      data.messageToEncryptIsText = "true";

      delete data.encrypt_message;
      delete data.message;
    } 

    /* Encrypt message to self */
    else if (data.note_to_self && data.message) {
      var encrypted = api.crypto.encryptNote(data.message, {
        "publicKey": converters.hexStringToByteArray(api.crypto.secretPhraseToPublicKey(secretPhrase))
      }, secretPhrase);

      data.encryptToSelfMessageData = encrypted.message;
      data.encryptToSelfMessageNonce = encrypted.nonce;
      data.messageToEncryptToSelfIsText = "true";

      delete data.note_to_self;
      delete data.message;
    } 

    /* Public message */
    else if (data.public_message && data.message) {
      data.messageIsText = 'true';

      delete data.public_message;
    }
  }

  return PaymentsProvider;
});
})();