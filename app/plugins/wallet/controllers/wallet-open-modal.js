(function () {
'use strict';
var module = angular.module('fim.base');
module.controller('WalletOpenModalController', function (items, $modalInstance, $scope, $timeout, plugins) {
  $scope.items = items;
  $scope.items.invalidPassword = false;

  plugins.get('wallet').createOnWalletFileSelectedPromise($scope).then(
    function () {
      $modalInstance.close();
    },
    function () {
      // $scope.items.invalidPassword = true;
      // Must provide feedback here
    }
  );

  $scope.dismiss = function () {
    $modalInstance.dismiss();
  }  
});
})();