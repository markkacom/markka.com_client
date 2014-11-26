(function () {
'use strict';
var module = angular.module('fim.base');
module.controller('StartupModalController', function(items, $modalInstance, $scope) {
  
  $scope.activities = items.activities;

  $scope.close = function () {
    $modalInstance.close();
  }

});
})();