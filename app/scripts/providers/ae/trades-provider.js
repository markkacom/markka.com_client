(function () {
'use strict';
var module = angular.module('fim.base');
module.factory('TradesProvider', function (nxt, $q, IndexedEntityProvider) {
  
  function TradesProvider(api, $scope, pageSize, asset) {
    this.init(api, $scope, pageSize);
    this.asset = asset;

    //api.engine.socket().subscribe('addedTrades*'+asset, angular.bind(this, this.addedTrades), $scope);
  }
  angular.extend(TradesProvider.prototype, IndexedEntityProvider.prototype, {

    /* @override */
    sortFunction: IndexedEntityProvider.prototype.transactionSort,

    /* @override */
    uniqueKey: function (trade) { return trade.id; },

    getData: function (firstIndex) {
      var deferred = $q.defer();
      var args = {
        asset:          this.asset,
        firstIndex:     firstIndex,
        lastIndex:      firstIndex + this.pageSize
      }
      this.api.engine.socket().getAssetTrades(args).then(deferred.resolve, deferred.reject);
      return deferred.promise;
    },

    dataIterator: function (data) {
      var decimals = data.decimals;
      for (var i=0; i<data.trades.length; i++) {
        var a      = data.trades[i];
        a.quantity = nxt.util.convertToQNTf(a.quantityQNT, decimals);
        a.price    = nxt.util.calculateOrderPricePerWholeQNT(a.priceNQT, decimals);
        a.total    = nxt.util.convertToNXT(nxt.util.calculateOrderTotalNQT(a.priceNQT, a.quantityQNT));
        a.date     = nxt.util.formatTimestamp(a.timestamp, true);
      }
      return new Iterator(data.trades);
    },

    getTypeColor: function (type) {
      return type == 'buy' ? 'green' : 'red';
    },

    calculate24HChange: function () {

    }
  });
  return TradesProvider;
});
})();