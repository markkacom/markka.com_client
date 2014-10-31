(function () {
'use strict';
var module = angular.module('fim.base');
module.controller('AccountsPluginSendMoneyNoPublickeyModalController', function(items, $modalInstance, $scope, nxt) {

  var api = nxt.get(items.senderRS);
  $scope.symbol = api.engine.symbol;

  $scope.close = function () {
    $modalInstance.close($scope.items);
  }
  $scope.dismiss = function () {
    $modalInstance.dismiss();
  };
});
})();