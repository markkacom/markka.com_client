(function () {
'use strict';
var module = angular.module('fim.base');
module.controller('AlertProgressModalController', function (items, $modalInstance, $scope) {
  $scope.items = items;
  $scope.close = function () {
    $modalInstance.close($scope.items.value);
  }

  $scope.dismiss = function () {
    $modalInstance.dismiss();
  }  
});
})();