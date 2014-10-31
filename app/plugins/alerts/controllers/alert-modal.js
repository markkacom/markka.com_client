(function () {
'use strict';
var module = angular.module('fim.base');
module.controller('AlertModalController', function (items, $modalInstance, $scope) {
  $scope.items = items;
  $scope.close = function () {
    $modalInstance.close();
  }
});
})();