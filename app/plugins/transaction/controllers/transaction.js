(function () {
'use strict';
var module = angular.module('fim.base');
module.controller('TransactionCreateModalController', function(items, $modalInstance, $scope, nxt, 
  requests, modals, $sce, $q, plugins, i18n, $timeout, accountsService, $rootScope, Emoji) {

  $scope.sendSuccess          = false;
  $scope.show                 = {};
  $scope.show.advanced        = false;
  $scope.show.message         = !!items.showMessage;
  $scope.items                = items;
  $scope.emoji                = { groups: Emoji.groups };
  $scope.ui                   = {};
  $scope.ui.emojiCollapse     = true;

  var api                     = nxt.get($rootScope.currentAccount.id_rs);
  $scope.items.senderRS       = $rootScope.currentAccount.id_rs;
  $scope.items.secretPhrase   = $rootScope.currentAccount.secretPhrase;

  $scope.items.title          = items.title || 'Create Transaction';
  $scope.items.txnMessageType = items.txnMessageType || ($scope.items.canHaveRecipient ? 'to_recipient' : 'to_self');
  $scope.items.txnMessage     = items.txnMessage || '';  
  $scope.items.symbol         = items.symbol || api.engine.symbol;
  $scope.items.deadline       = items.deadline || '1440';
  $scope.items.feeNXT         = items.feeNXT || api.engine.feeCost;
  $scope.items.message        = $sce.getTrustedHtml(items.message);
  $scope.items.accounts       = [];

  if ($scope.items.editRecipient) {
    var promise = accountsService.getAll(api.engine.type == nxt.TYPE_FIM ? accountsService.FIM_FILTER : accountsService.NXT_FILTER);
    promise.then(function (accounts) {
      $scope.$evalAsync(function () {
        $scope.items.accounts = accounts;
      });
    });
  }

  /* Add watches for fields supporting a show expression */
  angular.forEach($scope.items.fields, function (field) {
    field.__show = true;
    if (field.show) {
      field.__show = !!$scope.$eval(field.show);
      $scope.$watch(field.show, function (val) {
        field.__show = !!val;
      });
    }
  });

  $scope.insertEmoji = function (name) {
    $scope.$evalAsync(function () {
      $scope.items.txnMessage += ':'+Emoji.toBase32(name)+':';
    });
  }

  $scope.validateAddress = function (id_rs) {
    var address = api.createAddress();
    return address.set(id_rs);
  }

  $scope.dismiss = function () {
    $modalInstance.dismiss();
  };

  $scope.close = function () {
    if ($scope.sendSuccess) {
      $modalInstance.close($scope.items);
    }
    else {

      /* Makes fields available on items by name */
      angular.forEach($scope.items.fields, function (field) {
        $scope.items[field.name] = field.value;
      });

      var args = {
        feeNQT:   nxt.util.convertToNQT($scope.items.feeNXT),
        deadline: $scope.items.deadline,
        sender:   $scope.items.senderRS
      };
      args = angular.extend(args, $scope.items.createArguments($scope.items));
      if ($scope.items.transient) {
        args.referencedTransactionFullHash = converters.stringToHexString('00000000000000000000000000000000');
      }

      var message = null, type = null;
      if ($scope.show.message) {
        message = $scope.items.txnMessage;
        type = $scope.items.txnMessageType;
      }
      else if (args.txnMessage) {
        message = args.txnMessage;
        type = args.txnMessageType;
      }

      if (message) {
        args.message = message;
        args.messageIsText = 'true';
        if (type == "to_self") {
          args.note_to_self = true;
        }
        else if (type == "to_recipient") {
          args.encrypt_message = true;
        }
        else if (type == "public") {
          args.public_message = true;
        }
        else {
          throw new Error('Not reached');
        }
      }

      var publicKey = api.crypto.secretPhraseToPublicKey($scope.items.secretPhrase);
      prepareTransaction(args, publicKey, $scope.items.secretPhrase);
    }

    function prepareTransaction(args, senderPublicKey, secretPhrase) {
      /* Must get the recipient public key */
      if (args.encrypt_message) {
        getAccountPublicKey(args.recipient).then(
          function (recipientPublicKey) {
            args.recipientPublicKey = recipientPublicKey;
            sendTransaction(args, senderPublicKey, secretPhrase);
          },
          function () {
            promptAccountPublicKey(args.recipient).then(
              function (recipientPublicKey) {
                args.recipientPublicKey = recipientPublicKey;
                sendTransaction(args, senderPublicKey, secretPhrase);
              },
              function () {
                $timeout(function () { sendIt(args) }, 1, false);
              }
            );
          }
        )
      }
      else {
        sendTransaction(args, senderPublicKey, secretPhrase);
      }
    }

    function sendTransaction(args, publicKey, secretPhrase) {
      args.publicKey    = publicKey;
      args.requestType  = $scope.items.requestType;

      addMessageData(args, secretPhrase);

      plugins.get('alerts').progress({ title: "Please wait" }).then(
        function (progress) {

          if (items.autoSubmit) {
            progress.onclose = function () {
              $modalInstance.close($scope.items);
            };
          }

          var socket = $scope.items.forceLocal ? api.engine.localSocket() : api.engine.socket();

          delete args.txnMessage;
          delete args.txnMessageType;

          progress.setMessage('Creating Transaction');
          socket.callAPIFunction(args).then(
            function (data) {

              if (data.error || data.errorDescription) {
                progress.setErrorMessage(data.error || data.errorDescription);
                progress.enableCloseBtn();
                return;
              }

              /* Secretphrase was send to the server */
              if (args.secretPhrase) {
                progress.animateProgress().then(
                  function () {
                    new Audio('images/beep.wav').play();
                    progress.setMessage('Operation complete');
                    progress.enableCloseBtn();
                    progress.onclose = function () {
                      $modalInstance.close($scope.items);
                    };
                  }
                );
              }

              /* Must sign the txn client side */
              else {
                progress.setMessage('Signing Transaction');
                var signature   = api.crypto.signBytes(data.unsignedTransactionBytes, converters.stringToHexString(secretPhrase));

                if (!api.crypto.verifyBytes(signature, data.unsignedTransactionBytes, publicKey)) {
                  var msg = i18n.format('error_signature_verification_client');
                  progress.setErrorMessage(msg);
                  progress.enableCloseBtn();
                  return;
                } 
                else {
                  var payload = api.verifyAndSignTransactionBytes(data.unsignedTransactionBytes, signature, 
                                    args.requestType, args, api.type, api.engine.constants());
                  if (!payload) {
                    var msg = i18n.format('error_signature_verification_server');
                    progress.setErrorMessage(msg);
                    progress.enableCloseBtn();
                    return;
                  } 

                  var fullHash = api.crypto.calculateFullHash(data.unsignedTransactionBytes, signature);

                  progress.setMessage('Broadcasting Transaction');
                  socket.callAPIFunction({ requestType: 'broadcastTransaction', transactionBytes: payload }).then(
                    function (data) {
                      progress.animateProgress().then(
                        function () {
                          new Audio('images/beep.wav').play();
                          progress.setMessage('Transaction sent successfully');
                          progress.enableCloseBtn();
                          if ($scope.items.autoSubmit) {
                            progress.close();
                            $modalInstance.close($scope.items);
                          }
                          else {
                            progress.onclose = function () {
                              $modalInstance.close($scope.items);
                            };
                          }
                        }
                      );                        
                    },
                    function (data) {
                      progress.setMessage(JSON.stringify(data));
                      progress.enableCloseBtn();
                    }
                  )
                }
              }
            },
            function (data) {
              progress.setMessage(JSON.stringify(data));
              progress.enableCloseBtn();             
            }
          );
        }
      );
    }

    function getAccountPublicKey(account) {
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
    function addMessageData(data, secretPhrase) {

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
  }

  if ($scope.items.autoSubmit) {
    $scope.close();
  }

});
})();