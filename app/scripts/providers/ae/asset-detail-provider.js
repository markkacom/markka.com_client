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
module.factory('AssetDetailProvider', function (nxt, $q, IndexedEntityProvider, $timeout) {

  function AssetDetailProvider(api, $scope, asset, decimals, account) {
    this.api = api
    this.$scope = $scope;
    this.asset = asset;
    this.decimals = decimals;
    this.account = account;
    this.data = {};
    // api.engine.socket().subscribe('blockPopped', angular.bind(this, this.blockPopped), $scope);
    // api.engine.socket().subscribe('blockPushed', angular.bind(this, this.blockPushed), $scope);
  }
  AssetDetailProvider.prototype = {

    reload: function () {
      var self = this;
      var deferred = $q.defer();
      this.$scope.$evalAsync(function () {
        self.isLoading = true;
        $timeout(function () {  self.getNetworkData(deferred); }, 1, false);
      });
      return deferred.promise;
    },

    processData: function (d) {
      var data = this.data;
      data.name = d.name;
      data.description = d.description;
      data.issuerRS = d.issuerRS;
      data.issuerName = d.issuerName;
      data.quantityQNT = d.quantityQNT;
      data.numberOfTrades = nxt.util.commaFormat(String(d.numberOfTrades));
      data.numberOfTransfers = d.numberOfTransfers;
      data.numberOfAccounts = d.numberOfAccounts;
      data.volumeTodayQNT = d.volumeTodayQNT;
      data.numberOfTradesToday = nxt.util.commaFormat(String(d.numberOfTradesToday));
      data.volumeTotalQNT = d.volumeTotalQNT;
      data.orderFeePercentage = d.orderFeePercentage;
      data.tradeFeePercentage = d.tradeFeePercentage;
      data.type = '';
      data.lastPriceNQT = d.lastPriceNQT||'0';
      data.lastPriceNXT = nxt.util.calculateOrderPricePerWholeQNT(data.lastPriceNQT, this.decimals);
      data.quantity = nxt.util.commaFormat(nxt.util.convertToQNTf(d.quantityQNT, this.decimals));
      data.volumeToday = nxt.util.convertToQNTf(d.volumeTodayQNT||'0', this.decimals);
      data.volumeTotal = nxt.util.convertToQNTf(d.volumeTotalQNT||'0', this.decimals);
      data.orderFee = nxt.util.convertToQNTf(String(d.orderFeePercentage), 6)||'0';
      data.tradeFee = nxt.util.convertToQNTf(String(d.tradeFeePercentage), 6)||'0'
      data.isPrivate = d.type && d.type == 1;
      data.expiry = d.expiry
      data.height = d.height
      data.dateFormatted = nxt.util.formatTimestamp(d.blockTimestamp, true)

      var quantityQNT = new BigInteger(String(d.quantityQNT));
      var priceNQT = new BigInteger(String(d.lastPriceNQT||'0'));
      var marketcapNQT = quantityQNT.multiply(priceNQT).toString();
      data.marketcapNXT = nxt.util.convertToNXT(marketcapNQT);
    },

    getNetworkData: function (reload_deferred) {
      var deferred = $q.defer(), self = this;
      this.api.engine.socket().getAsset({ asset: this.asset, includeDetails: 'true', includeVolumes: 'true' }).then(
        function (data) {
          self.$scope.$evalAsync(function () {
            self.isLoading = false;
            self.processData(data);
            deferred.resolve();
            if (reload_deferred) {
              reload_deferred.resolve();
            }
          });
        },
        function (data) {
          self.$scope.$evalAsync(function () {
            self.isLoading = false;
            deferred.resolve();
            if (reload_deferred) {
              reload_deferred.resolve();
            }
          });
        }
      );
      return deferred.promise;
    }
  };
  return AssetDetailProvider;
});
})();
