(function () {
'use strict';
var module = angular.module('fim.base');
module.factory('BuyOrderProvider', function (nxt, $q, IndexedEntityProvider) {
  
  function BuyOrderProvider(api, $scope, pageSize, account) {
    this.init(api, $scope, pageSize, account);
  }
  angular.extend(BuyOrderProvider.prototype, IndexedEntityProvider.prototype, {

    uniqueKey: function (order) { return order.order },
    sortFunction: function (a, b) { return a.index - b.index; },     

    getData: function (firstIndex) {
      var deferred = $q.defer();
      var args = {
        account:        this.account,
        firstIndex:     firstIndex,
        lastIndex:      firstIndex + this.pageSize,
        requestType:    'getAccountCurrentBidOrders'
      }
      this.api.engine.socket().callAPIFunction(args).then(deferred.resolve, deferred.reject);
      return deferred.promise;
    },

    dataIterator: function (data) {
      var index = this.entities.length > 0 ? this.entities[this.entities.length - 1].index : 0;
      var orders = data.bidOrders;
      for (var i=0; i<orders.length; i++) {
        var a = orders[i];
        a.price = nxt.util.calculateOrderPricePerWholeQNT(a.priceNQT, a.decimals);
        a.quantity = nxt.util.commaFormat(nxt.util.convertToQNTf(a.quantityQNT, a.decimals));
        a.index = index;
      }
      return new Iterator(orders);
    }
  });
  return BuyOrderProvider;
});
})();