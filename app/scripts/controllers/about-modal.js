(function () {
'use strict';
var module = angular.module('fim.base');
module.run(function (modals, settings) {
  modals.register('about', { 
    templateUrl: 'partials/about-modal.html', 
    controller: 'AboutModalController' 
  });
});
module.controller('AboutModalController', function (items, $scope, $modalInstance, $rootScope) {
  $scope.date       = new Date(BUILD_TIMESTAMP*1000).toLocaleString();
  $scope.client_ver = VERSION;
  $scope.server_ver = $rootScope.FIM_SERVER_VERSION || '-';

  $scope.close = function () {
    $modalInstance.close($scope.items);
  }  
});
})();