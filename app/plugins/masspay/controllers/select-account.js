(function () {
'use strict';
var module = angular.module('fim.base');
module.controller('MassPayPluginAccountModalController', function(items, $modalInstance, $scope) {
  $scope.items = items;
  
  $scope.items.accountRS = '';
  $scope.items.secretPhrase = '';

  $scope.close = function () {
    $modalInstance.close($scope.items);
  };

  $scope.dismiss = function () {
    $modalInstance.dismiss();
  };
})
})();