(function () {
'use strict';
var module = angular.module('fim.base');
module.factory('OrderEntryProvider', function (nxt, $q, IndexedEntityProvider, $timeout) {
  
  function OrderEntryProvider(api, $scope, asset, decimals, account, privateAsset) {
    this.api = api
    this.$scope = $scope;
    this.asset = asset;
    this.decimals = decimals;
    this.account = account;
    this.privateAsset = privateAsset;

    this.quantity = '';
    this.priceNXT = '';
    this.orderFeeNXT = '0';
    this.totalPriceNXT = '0';
    this.transactionFeeNXT = this.api.engine.feeCost;
  }
  OrderEntryProvider.prototype = {
    reCalculate: function () {
      var self = this;
      this.$scope.$evalAsync(function () {
        var quantityQNT = new BigInteger(nxt.util.convertToQNT(self.quantity, self.decimals));
        var priceNQT    = new BigInteger(nxt.util.calculatePricePerWholeQNT(nxt.util.convertToNQT(self.priceNXT), self.decimals));
        var totalNQT    = '';
        if (priceNQT.toString() == "0" || quantityQNT.toString() == "0") {
          self.totalPriceNXT = '0';
          self.orderFeeNXT = '0.1';
        }
        else {
          totalNQT           = quantityQNT.multiply(priceNQT);
          self.totalPriceNXT = nxt.util.convertToNXT(totalNQT);
          self.orderFeeNXT   = '0.1';
        }
        if (self.privateAsset && totalNQT) {
          var feeNQT = totalNQT.
                        multiply(new BigInteger(String(self.privateAsset.orderFeePercentage))).
                        divide(new BigInteger("100000000")).
                        toString();
          self.orderFeeNXT = nxt.util.convertToNXT(feeNQT);
          self.orderFeeNQT = feeNQT;

          var effective = totalNQT.add(new BigInteger(feeNQT));
          self.totalPriceNXT = nxt.util.convertToNXT(effective.toString());

          var feeQNT = quantityQNT.
                        multiply(new BigInteger(String(self.privateAsset.orderFeePercentage))).
                        divide(new BigInteger("100000000")).
                        toString();
          self.orderFeeQNT = feeQNT.toString();
        }
      });
    }
  };
  return OrderEntryProvider;
});
})();