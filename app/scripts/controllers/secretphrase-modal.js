(function () {
'use strict';
var module = angular.module('fim.base');

var _secretPhraseCache = {};

module.controller('secretPhraseModalController', function (items, $modalInstance, $scope, 
  $timeout, nxt, modals, plugins, $sce, db, KeyService) {

  var walletPlugin              = plugins.get('wallet');

  $scope.SIMPLE                 = 'simple';
  $scope.COMPLEX                = 'complex';
  $scope.state                  = items.sender ? $scope.SIMPLE : $scope.COMPLEX;

  $scope.items                  = items;

  // simple
  $scope.items.valid            = false;
  $scope.items.secretNotFound   = false;

  // complex
  $scope.items.selectedAccount  = null;
  $scope.items.accounts         = [];
  $scope.items.engineType       = items.engineType || 'TYPE_FIM';

  // simple + complex
  $scope.items.secretPhrase     = $scope.items.secretPhrase || '';
  $scope.items.sender           = items.sender || '';

  if (items.sender && $scope.items.secretPhrase == '') {
    $scope.items.secretPhrase   = walletPlugin.getSecretPhrase(items.sender) || '';
    if (!$scope.items.secretPhrase) {
      $scope.items.secretPhrase = KeyService.get(items.sender);
      if ($scope.items.secretPhrase) {
        $scope.items.valid = true;
      }
    }
  }
  
  // DEBUG
  //$scope.state = $scope.COMPLEX;

  function accountFilter(account) {
    var prefix = ($scope.items.engineType == 'TYPE_FIM') ? 'FIM-' : 'NXT-';
    return account.id_rs.indexOf(prefix) == 0;
  }

  if ($scope.state == $scope.SIMPLE) {
    $scope.items.messageHTML    = $sce.getTrustedHtml(items.messageHTML||'This operation requires your secret passphrase. Either enter it by hand or click Open Wallet to load a wallet file containing your secret phrase.');    
  }
  else {
    $scope.items.messageHTML    = $sce.getTrustedHtml(items.messageHTML||'This operation requires a sender and secret passphrase.');
    db.accounts.where('id_rs').anyOf(walletPlugin.getKeys()).toArray().then(
      function (accounts) {
        $scope.$evalAsync(function () {
          $scope.items.accounts = accounts.filter(accountFilter);
        })
      }
    );
  }

  $scope.passphraseChange = function () {
    $timeout(function () {
      var engine          = nxt.crypto($scope.items.sender);
      var accountID       = engine.getAccountId($scope.items.secretPhrase, true);
      var valid           = accountID == $scope.items.sender;
      $scope.items.valid  = valid;
    });
  }

  $scope.passphraseChangeComplex = function () {
    $timeout(function () {
      $scope.items.sender = nxt.crypto($scope.items.engineType).getAccountId($scope.items.secretPhrase, true);
    });
  }

  $scope.format = function (account) {
    return account.id_rs + ' # ' + account.name;
  }  

  $scope.selectedAccountChange = function () {
    walletPlugin.getEntry($scope.items.selectedAccount.id_rs).then(
      function (entry) {
        $scope.$evalAsync(function () {
          $scope.items.secretPhrase = entry.secretPhrase;
          $scope.items.sender = entry.id_rs;
          $scope.passphraseChangeComplex();
        });
      }
    );
  }

  function getKeyFromWallet() {
    if (items.sender) {
      walletPlugin.getEntry(items.sender).then(
        function (entry) {
          $scope.$evalAsync(function () {
            $scope.items.missing = false;
            $scope.items.secretPhrase = entry.secretPhrase;
            $scope.passphraseChange();
            $modalInstance.close($scope.items);
          });
        }
      );
    }
  }

  if (walletPlugin.hasKey(items.sender)) {
    getKeyFromWallet();
  }

  walletPlugin.createOnWalletFileSelectedPromise($scope).then(
    function handleOnWalletFileSelectedPromiseSuccess() {
      if ($scope.state == $scope.SIMPLE) {
        getKeyFromWallet();
      }
      else {
        db.accounts.where('id_rs').anyOf(walletPlugin.getKeys()).toArray().then(
          function (accounts) {
            $scope.$evalAsync(function () {
              $scope.items.accounts = accounts.filter(accountFilter);
            })
          }
        );
      }
    }, 
    function handleOnWalletFileSelectedPromiseFailed() {
      // $scope.items.invalidPassword = true;
      // Must provide feedback here    
    }
  );

  $scope.close = function () {
    if (walletPlugin.hasKey($scope.items.sender)) {
      $modalInstance.close($scope.items);
    }
    else {
      db.accounts.where('id_rs').anyOf($scope.items.sender).count().then(
        function (count) {
          if (count > 0) {
            walletPlugin.saveToMemory($scope.items.sender, $scope.items.secretPhrase);
            $modalInstance.close($scope.items);
          }
          else {
            walletPlugin.confirmSaveToWallet().then(
              function (confirmed) {
                if (confirmed) {
                  /* Save the secret in the in-memory wallet - will ask the user to save the wallet */
                  walletPlugin.addEntry({
                    name:         '',
                    id_rs:        $scope.items.sender,
                    secretPhrase: $scope.items.secretPhrase
                  }).then(
                    function () {
                      $modalInstance.close($scope.items);
                    },
                    function () {
                      $modalInstance.dismiss();
                    }
                  );
                }
                else {
                  walletPlugin.saveToMemory($scope.items.sender, $scope.items.secretPhrase);
                  $modalInstance.close($scope.items);
                }
              }
            );
          }
        }
      );
    }
  }

  $scope.dismiss = function () {
    $modalInstance.dismiss();
  }
});

})();