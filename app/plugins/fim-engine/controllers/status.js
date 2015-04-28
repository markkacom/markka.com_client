(function () {
'use strict';
var module = angular.module('fim.base');
module.controller('FimEngineStatusPlugin', function($scope, nxt, BlockchainDownloadProvider) {
  /* Only run when in NodeJS environment */
  if (isNodeJS) {
    $scope.provider = new BlockchainDownloadProvider(nxt.fim(), $scope);
    $scope.provider.load();
  }

});
})();