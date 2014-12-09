(function () {
'use strict';
var module = angular.module('fim.base');
module.controller('ExchangePluginAsksController', function($scope, ngTableParams, $timeout, nxt, plugins, modals) {
  $scope.tableParams = new ngTableParams({ count: $scope.asks.length }, {
    total: 0,
    getData: function($defer, params) {
      var ask, asks = $scope.asks.slice((params.page() - 1) * params.count(), params.page() * params.count());
      if (asks.length) {
        var decimals = $scope.selectedAsset.decimals;
        for (var i=0; i<asks.length; i++) {
          ask = asks[i];
          ask.price = ask.price || formatOrderPricePerWholeQNT(ask.priceNQT, decimals);
          ask.quantity = ask.quantity || formatQuantity(ask.quantityQNT, decimals);
          ask.total = ask.total || formatOrderTotal(ask.priceNQT, ask.quantityQNT, decimals)
        }
      }
      $defer.resolve(asks);
    }
  });
  $scope.tableParams.settings().$scope = $scope;

  var timer = false;
  $scope.$watch('asks', function () {
    if(timer){
      $timeout.cancel(timer)
    }  
    timer = $timeout(reload, 100);
  });

  function reload() {
    $scope.tableParams.total($scope.asks.length);
    $scope.tableParams.count($scope.asks.length);
    $scope.tableParams.reload(); 
  }

  function formatQuantity(quantityQNT, decimals) {
    return nxt.util.convertToQNTf(quantityQNT, decimals);
  }

  function formatOrderPricePerWholeQNT(priceNQT, decimals) {
    return nxt.util.calculateOrderPricePerWholeQNT(priceNQT, decimals);
  }      

  function formatOrderTotal(priceNQT, quantityQNT, decimals) {
    return nxt.util.convertToNXT(nxt.util.calculateOrderTotalNQT(priceNQT, quantityQNT));
  }

  $scope.placeOrder = function () {
    var engine = $scope.engine == 'nxt' ? 'TYPE_NXT' : 'TYPE_FIM';
    modals.open('orderCreate', {
      resolve: {
        items: function () {
          return {
            selectedAccount: $scope.selectedAccount,
            engine: engine,
            asset: $scope.selectedAsset,
            type: 'ask',
            feeNXT: (engine == 'TYPE_FIM' ? '0.1' : '1')
          };
        }
      }
    });
  }   
});
})();