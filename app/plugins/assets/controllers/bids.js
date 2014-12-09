(function () {
'use strict';
var module = angular.module('fim.base');
module.controller('ExchangePluginBidsController', function($scope, ngTableParams, $timeout, nxt, plugins, modals) {
  $scope.tableParams = new ngTableParams({ count: $scope.bids.length }, {
    total: 0,
    getData: function($defer, params) {
      var bid, bids = $scope.bids.slice((params.page() - 1) * params.count(), params.page() * params.count());
      if (bids.length) {
        var decimals = $scope.selectedAsset.decimals;
        for (var i=0; i<bids.length; i++) {
          bid = bids[i];
          bid.price = bid.price || formatOrderPricePerWholeQNT(bid.priceNQT, decimals);
          bid.quantity = bid.quantity || formatQuantity(bid.quantityQNT, decimals);
          bid.total = bid.total || formatOrderTotal(bid.priceNQT, bid.quantityQNT, decimals)
        }
      }
      $defer.resolve(bids);
    }
  });
  $scope.tableParams.settings().$scope = $scope;

  var timer = false;
  $scope.$watch('bids', function () {
    if(timer){
      $timeout.cancel(timer)
    }  
    timer = $timeout(reload, 100);
  });

  function reload() {
    $scope.tableParams.total($scope.bids.length);
    $scope.tableParams.count($scope.bids.length);
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
            type: 'bid',
            feeNXT: (engine == 'TYPE_FIM' ? '0.1' : '1')
          };
        }
      }
    });
  }       
});
})();