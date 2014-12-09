(function () {
'use strict';
var module = angular.module('fim.base');
module.controller('ExchangePluginCancelController', 
  function(items, $modalInstance, $scope, nxt, $timeout, $filter, alerts, $sce, db, plugins, modals) {

  $scope.items          = items;
  $scope.dialogTitle    = 'Cancel order';

  $scope.show           = {};
  $scope.show.advanced  = false;
  $scope.show.message   = false;
  $scope.sendSuccess    = false;

  $scope.items.deadline = items.deadline || '1440';
  $scope.items.order    = items.order;

  // ask or bid
  if (items.type == 'ask') {
    $scope.dialogTitle = 'Cancel sell order';
    var method = 'cancelAskOrder';
  }
  else if (items.type = 'bid') {
    $scope.dialogTitle = 'Cancel buy order';
    var method = 'cancelBidOrder';
  }
  else {
    throw new Error('Illegal type: '+ items.type);
  }

  var api = nxt.get(items.engine);

  $scope.close = function () {
    modals.open('sendProgress', {
      resolve: {
        items: function () {
          return {
            api: api,
            method: method,
            args: {
              order: items.order,
              feeNQT: nxt.util.convertToNQT(items.feeNXT),
              deadline: items.deadline,
              sender: items.selectedAccount.id_rs
            }
          };
        }
      },
      close: function (items) {
        $modalInstance.close($scope.items);
      },
      cancel: function () {}
    });    
  }

  $scope.dismiss = function () {
    $modalInstance.dismiss();
  }

});
})();