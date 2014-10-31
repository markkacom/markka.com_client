(function () {
'use strict';
var module = angular.module('fim.base');

module.controller('AccountsPluginEditModalController', function (items, $modalInstance, $scope) {
  $scope.items = items;
  $scope.close = function () {
    $modalInstance.close($scope.items);
  }

  $scope.dismiss = function () {
    $modalInstance.dismiss();
  }
});

})();