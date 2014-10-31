(function () {
'use strict';
var module = angular.module('fim.base');
module.controller('NamespacedAliasPluginCreateModalController', function(items, $modalInstance, $scope, nxt, $timeout, db) {

  $scope.dialogName   = 'Namespaced Alias';
  $scope.dialogTitle  = $scope.dialogName;
  $scope.setTitle     = function (text) {
    $timeout(function () {
      $scope.dialogTitle = $scope.dialogName + (text?(' | ' + text):'');
    });
  };

  var api             = nxt.get(items.senderRS);
  $scope.engine       = api.engine;

  $scope.items        = items;
  $scope.items.errorMessage = null;
  $scope.items.deadline = '1440';
  $scope.items.feeNXT = $scope.engine.feeCost;
  $scope.items.symbol = $scope.engine.symbol;

  $scope.close = function() {
    api.setNamespacedAlias({ 
      feeNQT:     nxt.util.convertToNQT($scope.items.feeNXT),
      deadline:   $scope.items.deadline,
      sender:     $scope.items.senderRS, 
      aliasName:  $scope.items.key,
      aliasURI:   $scope.items.value
    }).then(
      function (data) {
        $timeout(function () {
          db.accounts.where('id_rs').equals(items.senderRS).first().then(
            function (account) {
              var downloader = api.startTransactionDownloader(account);
              downloader.getUnconfirmedTransactions();
            }
          );
        }, 1 * 1000);
        $modalInstance.close($scope.items);
      },
      function (error) {
        $scope.items.errorMessage = error;
      }
    );    
  }

  $scope.dismiss = function () {
    $modalInstance.dismiss();
  }

  /* NAMESPACED_ALPHABET = "0123456789abcdefghijklmnopqrstuvwxyz!#$%&()*+-./:;<=>?@[]_{|}" */
  $scope.validateCharacters = function (text) {
    return /^[a-zA-Z0-9\!\#\$\%\&\(\)\*\+\-\.\/:;\<=\>\?\@\[\]\_\{\|\}]+$/.test(text);
  }

  $scope.validateKeyLength = function (text) {
    return text && text.length <= 100;
  }

  $scope.validateValueLength = function (text) {
    return text && text.length <= 1000;
  }

});
})();
