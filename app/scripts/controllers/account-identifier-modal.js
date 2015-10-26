(function () {
'use strict';
var module = angular.module('fim.base');
module.run(function (modals, settings) {
  modals.register('account-identifier', { 
    templateUrl: 'partials/account-identifier-modal.html', 
    controller: 'AccountIdentifierModalController' 
  });
});
module.controller('AccountIdentifierModalController', function (items, $scope, $modalInstance, $rootScope) {
  $scope.items = items;
  $scope.close = function () {
    $modalInstance.close($scope.items);
  }  
});
})();