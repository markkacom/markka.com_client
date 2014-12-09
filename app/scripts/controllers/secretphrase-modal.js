(function () {
'use strict';
var module = angular.module('fim.base');

var _secretPhraseCache = {};

module.controller('secretPhraseModalController', function (items, $modalInstance, $scope, $timeout, nxt, modals, plugins, $sce) {
  var walletPlugin    = plugins.get('wallet');
  $scope.items        = items;
  $scope.items.valid  = false;
  $scope.items.secretNotFound = false;
  $scope.items.secretPhrase   = $scope.items.secretPhrase || '';
  $scope.items.messageHTML = $sce.trustAsHtml(items.messageHTML||'This operation requires your secret passphrase. Either enter it by hand or click Open Wallet to load a wallet file containing your secret phrase.');

  $scope.passphraseChange = function () {
    $timeout(function () {
      var engine          = nxt.crypto($scope.items.sender);
      var accountID       = engine.getAccountId($scope.items.secretPhrase, true);
      var valid           = accountID == $scope.items.sender;
      $scope.items.valid  = valid;
    });
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

  walletPlugin.createOnWalletFileSelectedPromise().then(
    function () {
      getKeyFromWallet();
    },
    function () {
      // $scope.items.invalidPassword = true;
      // Must provide feedback here
    }
  );

  $scope.close = function () {
    if (walletPlugin.hasKey($scope.items.sender)) {
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

  $scope.dismiss = function () {
    $modalInstance.dismiss();
  }

});

})();