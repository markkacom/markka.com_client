(function () {
'use strict';
var module = angular.module('fim.base');
module.controller('NxtEngineStatusPlugin', function($scope, nxt, BlockchainDownloadProvider) {
  /* Only run when in NodeJS environment */
  if (isNodeJS) {
    $scope.provider = new BlockchainDownloadProvider(nxt.nxt(), $scope);
    $scope.provider.load();
  }

});
})();