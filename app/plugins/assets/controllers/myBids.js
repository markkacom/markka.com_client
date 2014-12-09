(function () {
'use strict';
var module = angular.module('fim.base');
module.controller('ExchangePluginMyBidsController', function($scope, ngTableParams, $timeout, nxt, plugins, modals) {
  $scope.tableParams = new ngTableParams({ count: $scope.myBids.length }, {
    total: 0,
    getData: function($defer, params) {
      var bid, bids = $scope.myBids.slice((params.page() - 1) * params.count(), params.page() * params.count());
      if (bids.length) {
        var decimals = $scope.selectedAsset.decimals;
        for (var i=0; i<bids.length; i++) {
          bid = bids[i];
          bid.price = bid.price || nxt.util.calculateOrderPricePerWholeQNT(bid.priceNQT, decimals);
          bid.quantity = bid.quantity || nxt.util.convertToQNTf(bid.quantityQNT, decimals);
          bid.total = bid.total || nxt.util.convertToNXT(nxt.util.calculateOrderTotalNQT(bid.priceNQT, bid.quantityQNT));
        }
      }
      $defer.resolve(bids);
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
    $scope.tableParams.total($scope.myBids.length);
    $scope.tableParams.count($scope.myBids.length);
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
            type: 'bid',
            feeNXT: (engine == 'TYPE_FIM' ? '0.1' : '1')
          };
        }
      }
    });
  }  
});
})();