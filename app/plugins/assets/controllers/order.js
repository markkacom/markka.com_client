(function () {
'use strict';
var module = angular.module('fim.base');
module.controller('ExchangePluginOrderController', 
  function(items, $modalInstance, $scope, nxt, $timeout, $filter, i18n, alerts, $sce, db, plugins, modals, transactionService, requests) {

  $scope.items          = items;
  $scope.dialogTitle    = 'Place order';

  $scope.show           = {};
  $scope.show.advanced  = false;
  $scope.show.message   = false;
  $scope.sendSuccess    = false;

  $scope.items.quantity = '0';
  $scope.items.price    = '0';
  $scope.items.total    = '0';
  $scope.items.deadline = items.deadline || '1440';

  // ask or bid
  if (items.type == 'ask') {
    $scope.dialogTitle = 'Place sell order';
    var method = 'placeAskOrder';
  }
  else if (items.type = 'bid') {
    $scope.dialogTitle = 'Place buy order';
    var method = 'placeBidOrder';
  }
  else {
    throw new Error('Illegal type: '+ items.type);
  }

  var api = nxt.get(items.engine);

  var timeout = null, quantityQNT, priceNQT, feeNQT;
  $scope.calculateTotal = function() {
    if (timeout) {
      $timeout.cancel(timeout);
    }
    quantityQNT = new BigInteger(nxt.util.convertToQNT($scope.items.quantity, items.asset.decimals));
    priceNQT    = new BigInteger(NRS.calculatePricePerWholeQNT(nxt.util.convertToNQT($scope.items.price), items.asset.decimals));
    feeNQT      = nxt.util.convertToNQT($scope.items.feeNXT);
    timeout = $timeout(function () {
      $scope.items.total = nxt.util.convertToNXT(quantityQNT.multiply(priceNQT));
    }, 100);
  }

  $scope.close = function () {
    modals.open('sendProgress', {
      resolve: {
        items: function () {
          return {
            api: api,
            method: method,
            args: {
              asset: items.asset.asset,
              quantityQNT: quantityQNT.toString(),
              priceNQT: priceNQT.toString(),
              feeNQT: feeNQT,
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