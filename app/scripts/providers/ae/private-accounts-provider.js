(function () {
'use strict';
var module = angular.module('fim.base');
module.factory('PrivateAccountsProvider', function (nxt, $q, IndexedEntityProvider) {
  
  function PrivateAccountsProvider(api, $scope, pageSize, asset) {
    this.init(api, $scope, pageSize);
    this.asset = asset;
  }
  angular.extend(PrivateAccountsProvider.prototype, IndexedEntityProvider.prototype, {
    sortFunction: IndexedEntityProvider.prototype.transactionSort,
    uniqueKey: function (transaction) { return transaction.transaction; },

    getData: function (firstIndex) {
      var deferred = $q.defer();
      var args = {
        asset:          this.asset,
        firstIndex:     firstIndex,
        lastIndex:      firstIndex + this.pageSize
      }
      this.api.engine.socket().getAssetPrivateAccounts(args).then(deferred.resolve, deferred.reject);
      return deferred.promise;
    },

    dataIterator: function (data) {
      var transactions = data || [];
      for (var i=0; i<transactions.length; i++) {
        var a      = transactions[i];
        // a.quantity = nxt.util.convertToQNTf(a.quantityQNT, decimals);
        // a.price    = nxt.util.calculateOrderPricePerWholeQNT(a.priceNQT, decimals);
        // a.total    = nxt.util.convertToNXT(nxt.util.calculateOrderTotalNQT(a.priceNQT, a.quantityQNT));
        // a.date     = nxt.util.formatTimestamp(a.timestamp, true);
      }
      return new Iterator(transactions);
    }
  });
  return PrivateAccountsProvider;
});
})();