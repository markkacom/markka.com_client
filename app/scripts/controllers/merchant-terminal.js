(function () {
'use strict';
var module = angular.module('fim.base');

module.config(function($routeProvider) {
  $routeProvider.when('/merchant/:recipient/:amountNQT/:deadline/:description/:message', {
    templateUrl: 'partials/merchant-terminal.html',
    controller: 'MerchantTerminalController'
  });
});

module.controller('MerchantTerminalController', function ($scope, $rootScope, nxt, $routeParams, plugins) {

  $scope.paramRecipient     = $routeParams.recipient;
  $scope.paramAmountNQT     = $routeParams.amountNQT;
  $scope.paramDeadline      = $routeParams.deadline;
  $scope.paramDescription   = $routeParams.description;
  $scope.paramMessage       = $routeParams.message;

  $scope.amountNXT          = nxt.util.convertToNXT($scope.paramAmountNQT);
  $scope.recipientName      = '';

  var api                   = nxt.get($scope.paramRecipient);
  $scope.symbol             = api.engine.symbol;

  api.engine.socket().getAccount({account: $scope.paramRecipient}).then(
    function (data) {
      $scope.$evalAsync(function () {
        $scope.recipientName = data.accountName;
      });
    }
  );

  $scope.payNow = function () {
    var args = { 
      recipient: $scope.paramRecipient, 
      amountNXT: nxt.util.convertNQT($scope.paramAmountNQT, 8),
      deadline: $scope.paramDeadline
    };
    if ($scope.paramMessage) {
      args.txnMessage = $scope.paramMessage;
      args.txnMessageType = 'to_recipient';
    }
    plugins.get('transaction').get('tipUser').execute(args);
  }

});
})();