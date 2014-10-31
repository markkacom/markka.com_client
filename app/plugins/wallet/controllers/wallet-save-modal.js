(function () {
'use strict';
var module = angular.module('fim.base');
module.controller('WalletSaveModalController', function (items, $modalInstance, $scope, $timeout) {
  $scope.items = items;

  $scope.close = function () {
    $modalInstance.close($scope.items);      
  }

  $scope.dismiss = function () {
    $modalInstance.dismiss();
  }  
});
})();