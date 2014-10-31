(function () {
'use strict';
var module = angular.module('fim.base');
module.controller('AlertConfirmModalController', function (items, $modalInstance, $scope) {
  $scope.items = items;
  $scope.close = function (value) {
    $modalInstance.close(value);
  }
});
})();