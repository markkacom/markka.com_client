(function () {
'use strict';
var module = angular.module('fim.base');
module.controller('ExchangePluginTradesController', function($scope, ngTableParams, $timeout, nxt) {
  $scope.tableParams = new ngTableParams({ page: 1, count: 100 }, {
    total: 0,
    getData: function($defer, params) {
      var trade, trades = $scope.trades.slice((params.page() - 1) * params.count(), params.page() * params.count());
      if (trades.length) {
        var decimals = $scope.selectedAsset.decimals;
        for (var i=0; i<trades.length; i++) {
          trade = trades[i];
          trade.price = trade.price || nxt.util.calculateOrderPricePerWholeQNT(trade.priceNQT, decimals);
          trade.quantity = trade.quantity || nxt.util.convertToQNTf(trade.quantityQNT, decimals);
          trade.total = trade.total || formatOrderTotal(trade.priceNQT, trade.quantityQNT, decimals);
          trade.timeago = (nxt.util.formatTimestamp(trade.timestamp, true)||'').replace(/^about/, '');
        }
      }
      $defer.resolve(trades);
    }
  });
  $scope.tableParams.settings().$scope = $scope;

  var timer = false;
  $scope.$watch('trades', function () {
    if(timer){
      $timeout.cancel(timer)
    }  
    timer = $timeout(reload, 100);
  });

  function reload() {
    $scope.tableParams.total($scope.trades.length);
    // $scope.tableParams.count($scope.trades.length);
    $scope.tableParams.reload(); 
  }

  function formatOrderTotal(priceNQT, quantityQNT, decimals) {
    return nxt.util.convertToNXT(nxt.util.calculateOrderTotalNQT(priceNQT, quantityQNT));
  }  
});
})();