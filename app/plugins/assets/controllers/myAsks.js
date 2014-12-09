(function () {
'use strict';
var module = angular.module('fim.base');
module.controller('ExchangePluginMyAsksController', function($scope, ngTableParams, $timeout, nxt, plugins, modals) {
  $scope.tableParams = new ngTableParams({ count: $scope.myAsks.length }, {
    total: 0,
    getData: function($defer, params) {
      var ask, asks = $scope.myAsks.slice((params.page() - 1) * params.count(), params.page() * params.count());
      if (asks.length) {
        var decimals = $scope.selectedAsset.decimals;
        for (var i=0; i<asks.length; i++) {
          ask = asks[i];
          ask.price = ask.price || nxt.util.calculateOrderPricePerWholeQNT(ask.priceNQT, decimals);
          ask.quantity = ask.quantity || nxt.util.convertToQNTf(ask.quantityQNT, decimals);
          ask.total = ask.total || nxt.util.convertToNXT(nxt.util.calculateOrderTotalNQT(ask.priceNQT, ask.quantityQNT));
        }
      }
      $defer.resolve(asks);
    }
  });
  $scope.tableParams.settings().$scope = $scope;

  var timer = false;
  $scope.$watch('myAsks', function () {
    if(timer){
      $timeout.cancel(timer)
    }  
    timer = $timeout(reload, 100);
  });

  function reload() {
    $scope.tableParams.total($scope.myAsks.length);
    $scope.tableParams.count($scope.myAsks.length);
    $scope.tableParams.reload(); 
  }

  $scope.cancelOrder = function (order) {
    var engine = $scope.engine == 'nxt' ? 'TYPE_NXT' : 'TYPE_FIM';    
    modals.open('orderCancel', {
      resolve: {
        items: function () {
          return {
            order: order.order,
            selectedAccount: $scope.selectedAccount,
            engine: engine,
            type: 'ask',
            feeNXT: (engine == 'TYPE_FIM' ? '0.1' : '1')
          };
        }
      }
    });
  }
});
})();