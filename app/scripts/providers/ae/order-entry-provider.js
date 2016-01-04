/**
 * The MIT License (MIT)
 * Copyright (c) 2016 Krypto Fin ry and the FIMK Developers
 *
 * Permission is hereby granted, free of charge, to any person obtaining a copy of
 * this software and associated documentation files (the "Software"), to deal in
 * the Software without restriction, including without limitation the rights to
 * use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of
 * the Software, and to permit persons to whom the Software is furnished to do so,
 * subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be included in all
 * copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
 * SOFTWARE.
 * */
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
    this.totalPriceNQT = '0';
    this.totalPriceNXT = '0';
    this.transactionFeeNXT = this.api.engine.feeCost;
    this.totalQuantity = '';
  }
  OrderEntryProvider.prototype = {
    reCalculate: function () {
      var self = this;
      var deferred = $q.defer();
      var calculate = function () {
        var quantityQNT = new BigInteger(nxt.util.convertToQNT(self.quantity, self.decimals));
        var priceNQT    = new BigInteger(nxt.util.calculatePricePerWholeQNT(nxt.util.convertToNQT(self.priceNXT), self.decimals));
        var totalNQT    = '';
        if (priceNQT.toString() == "0" || quantityQNT.toString() == "0") {
          self.totalPriceNXT  = '0';
          self.totalNXT       = '0';
          self.orderFeeNXT    = self.api.engine.feeCost;
        }
        else {
          totalNQT            = quantityQNT.multiply(priceNQT);
          self.totalPriceNXT  = nxt.util.convertToNXT(totalNQT);
          self.totalNXT       = self.totalPriceNXT;
          self.orderFeeNXT    = self.api.engine.feeCost;
        }
        if (self.privateAsset && totalNQT) {
          var feeNQT          = totalNQT.
                                multiply(new BigInteger(String(self.privateAsset.orderFeePercentage))).
                                divide(new BigInteger("100000000")).
                                toString();
          self.orderFeeNXT    = nxt.util.convertToNXT(feeNQT);
          self.orderFeeNQT    = feeNQT;

          var effective       = totalNQT.add(new BigInteger(feeNQT));
          self.totalPriceNQT  = effective.toString();
          self.totalPriceNXT  = nxt.util.convertToNXT(effective.toString());

          var feeQNT          = quantityQNT.
                                multiply(new BigInteger(String(self.privateAsset.orderFeePercentage))).
                                divide(new BigInteger("100000000"));
          self.orderFeeQNT      = feeQNT.toString();
          self.orderFeeQuantity = nxt.util.convertToQNTf(self.orderFeeQNT, self.decimals);

          var totalQuantityQNT  = quantityQNT.add(feeQNT).toString();
          self.totalQuantity    = nxt.util.commaFormat(nxt.util.convertToQNTf(totalQuantityQNT, self.decimals));
        }
        deferred.resolve(true);
      };
      (this.$scope) ? this.$scope.$evalAsync(calculate) : calculate();
      return deferred.promise;
    }
  };
  return OrderEntryProvider;
});
})();