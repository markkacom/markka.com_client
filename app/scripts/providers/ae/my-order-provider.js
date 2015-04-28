(function () {
'use strict';
var module = angular.module('fim.base');
module.factory('MyOrdersProvider', function (nxt, $q, IndexedEntityProvider) {
  
  function MyOrdersProvider(api, $scope, pageSize, asset, accounts) {
    this.init(api, $scope, pageSize);
    this.asset = asset;
    this.accounts = accounts;
  }
  angular.extend(MyOrdersProvider.prototype, IndexedEntityProvider.prototype, {

    /* @override */
    sortFunction: function (a, b) {
      if (b.confirmations < a.confirmations) { return 1; }
      else if (b.confirmations > a.confirmations) { return -1; }
      else {
        if (a.order < b.order) { return 1; }
        else if (a.order > b.order) { return -1; }
      }
      return 0;
    },

    /* @override */
    uniqueKey: function (order) { return order.order },    

    getData: function (firstIndex) {
      var deferred = $q.defer();
      var args = {
        asset:          this.asset,
        accounts:       this.accounts,
        firstIndex:     firstIndex,
        lastIndex:      firstIndex + this.pageSize
      }
      if (this.accounts && this.accounts.length) {
        this.api.engine.socket().getMyOpenOrders(args).then(deferred.resolve, deferred.reject);
      }
      else {
        deferred.resolve({});
      }
      return deferred.promise;
    },

    dataIterator: function (data) {
      var decimals = data.decimals, orders = data.orders || [];
      for (var i=0; i<orders.length; i++) {
        var a = orders[i];
        a.quantity = nxt.util.convertToQNTf(a.quantityQNT, decimals);
        a.price = nxt.util.calculateOrderPricePerWholeQNT(a.priceNQT, decimals);
        a.total = nxt.util.convertToNXT(nxt.util.calculateOrderTotalNQT(a.priceNQT, a.quantityQNT));
      }
      return new Iterator(orders);
    },

    getTypeColor: function (type) {
      return type == 'buy' ? 'green' : 'red';
    }
  });
  return MyOrdersProvider;
});
})();