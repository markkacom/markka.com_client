(function () {
'use strict';

/**
 * Count bytes in a string's UTF-8 representation.
 *
 * @param   string
 * @return  int
 */
function getByteLen(normal_val) {
  normal_val = String(normal_val);

  var byteLen = 0;
  for (var i = 0; i < normal_val.length; i++) {
    var c = normal_val.charCodeAt(i);
    byteLen += c < (1 <<  7) ? 1 :
               c < (1 << 11) ? 2 :
               c < (1 << 16) ? 3 :
               c < (1 << 21) ? 4 :
               c < (1 << 26) ? 5 :
               c < (1 << 31) ? 6 : Number.NaN;
  }
  return byteLen;
}

var module = angular.module('fim.base');
module.controller('NamespacedAliasPluginCreateModalController', function(items, $modalInstance, $scope, nxt, $timeout, db, $q, plugins, modals) {

  $scope.dialogName   = 'Namespaced Alias';
  $scope.dialogTitle  = $scope.dialogName;
  $scope.setTitle     = function (text) {
    $timeout(function () {
      $scope.dialogTitle = $scope.dialogName + (text?(' | ' + text):'');
    });
  };

  var api             = nxt.get(items.senderRS);
  $scope.engine       = api.engine;

  $scope.alertRSText          = '';
  $scope.alertPublickeyText   = '';
  $scope.errorMessage         = '';

  $scope.items        = items;
  $scope.items.deadline = '1440';
  $scope.items.feeNXT = $scope.engine.feeCost;
  $scope.items.symbol = $scope.engine.symbol;
  $scope.items.encryptionType = 'to_self'; // public to_recipient
  $scope.items.recipientRS = '';
  $scope.items.recipientPublicKey = '';

  // DEBUG
  // $scope.items.key = 'test:encrypt-to:FIM-7CZJ-CVTH-F4XY-DMWEY';
  // $scope.items.value = 'Hello'
  // $scope.items.recipientRS = 'FIM-7CZJ-CVTH-F4XY-DMWEY';
  // $scope.items.recipientPublicKey = 'd8155622e95eb0e28cd7f28b61a63eb11f614cc052d9870ca2afe9612359a06d';
  // $scope.items.encryptionType = 'to_recipient';
  // DEBUG

  $scope.close = function() {
    encryptURI($scope.items.value).then(
      function (encrypted_data) {
        if (getByteLen(encrypted_data) > 1000) {
          $scope.$evalAsync(function () {
            $scope.errorMessage = 'Encrypted data exceeds max length';
          })
        }

        modals.open('sendProgress', {
          resolve: {
            items: function () {
              return {
                api: api,
                method: 'setNamespacedAlias',
                args: { 
                  feeNQT:     nxt.util.convertToNQT($scope.items.feeNXT),
                  deadline:   $scope.items.deadline,
                  sender:     $scope.items.senderRS, 
                  aliasName:  $scope.items.key,
                  aliasURI:   encrypted_data
                }
              };
            }
          },
          close: function (items) {
            $modalInstance.close($scope.items);
          },
          cancel: function (error) {
            $scope.$evalAsync(function () {
              $scope.items.errorMessage = error;
            });
          }
        });
      }
    );
  }

  $scope.dismiss = function () {
    $modalInstance.dismiss();
  }

  function encryptURI(aliasURI) {
    var deferred = $q.defer();
    if ('public' == $scope.items.encryptionType) {
      deferred.resolve($scope.items.value);
    }
    else {
      getSecretPhrase().then(
        function (secretPhrase) {
          if ($scope.items.encryptionType == 'to_recipient') {
            var publicKey = converters.hexStringToByteArray(converters.stringToHexString($scope.items.recipientPublicKey));
            var options = {
              account: $scope.items.recipient,
              publicKey: publicKey,
            };

            var encrypted = api.crypto.encryptNote(aliasURI, options, secretPhrase);
            deferred.resolve(JSON.stringify(encrypted));
          }
          else if ($scope.items.encryptionType == 'to_self') {
            var encrypted = api.crypto.encryptNote(aliasURI, {
              "publicKey": converters.hexStringToByteArray(api.crypto.secretPhraseToPublicKey(secretPhrase))
            }, secretPhrase);
            deferred.resolve(JSON.stringify(encrypted));
          }
          else {
            deferred.reject();
          }
        },
        deferred.reject
      );
    }
    return deferred.promise;
  }

  function getSecretPhrase() {
    var deferred = $q.defer();
    modals.open('secretPhrase', {
      resolve: {
        items: function () {
          return {
            sender: items.senderRS
          }
        }
      },
      close: function (items) {
        deferred.resolve(items.secretPhrase);
      },
      cancel: function (error) {
        deferred.reject();
      }
    });
    return deferred.promise;
  }


  /* NAMESPACED_ALPHABET = "0123456789abcdefghijklmnopqrstuvwxyz!#$%&()*+-./:;<=>?@[]_{|}" */
  $scope.validateCharacters = function (text) {
    return /^[a-zA-Z0-9\!\#\$\%\&\(\)\*\+\-\.\/:;\<=\>\?\@\[\]\_\{\|\}]+$/.test(text);
  }

  $scope.validateKeyLength = function (text) {
    return text && getByteLen(text) <= 100;
  }

  $scope.validateValueLength = function (text) {
    return text && getByteLen(text) <= 1000;
  }

  $scope.selectContact = function () {
    plugins.get('contacts').select({engine: api.type}).then(
      function (items) {
        $scope.$evalAsync(function () {
          $scope.items.recipientRS = items.id_rs;
          $scope.recipientChanged();
        });
      }
    );
  };

  $scope.recipientChanged = function () {
    $scope.alertRSText = '';
    var account = $scope.items.recipientRS;
    var parts   = account.split(':');
    if (parts.length > 1) {
      $scope.items.recipientRS        = account = parts[0];
      $scope.items.recipientPublicKey = parts[1]; /* XXX this asumes no ':' character is ever used in a public key */
      $scope.recipientPublicKeyChanged();
    }

    var address = api.createAddress();
    if (!address.set(account)) {
      $scope.$evalAsync(function () {
        $scope.alertRSText = 'Address is malformed';
      });
    }
    else {
      api.getAccount({account: account}, {priority: 5}).then(
        function (account) {
          if (!account.publicKey) {
            $scope.$evalAsync(function () {
              $scope.alertRSText = 'Account has no public key';
            });
          }
          else {
            $scope.$evalAsync(function () {
              $scope.items.recipient = account.account;
              $scope.items.recipientPublicKey = account.publicKey;
              $scope.recipientPublicKeyChanged();
            });
          }
        },
        function (error) {
          $scope.$evalAsync(function () {
            $scope.alertRSText = 'Account has no public key';
          });
        }
      );
    }
  }

  $scope.recipientPublicKeyChanged = function () {
    if ($scope.items.recipientRS) {
      var id_rs = api.crypto.getAccountIdFromPublicKey($scope.items.recipientPublicKey, true);
      $scope.$evalAsync(function () {
        if (id_rs == $scope.items.recipientRS) {
          $scope.alertPublickeyText = '';
        }
        else {
          $scope.alertPublickeyText = 'Public key does not match account';
        }
      });
    }
  }



});
})();
