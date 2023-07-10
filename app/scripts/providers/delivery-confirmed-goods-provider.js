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
(function() {
  'use strict';
  var module = angular.module('fim.base');
  module.factory('DeliveryConfirmedGoodsProvider', function(nxt, $q, IndexedEntityProvider) {

    function DeliveryConfirmedGoodsProvider(api, $scope, account) {
      this.init(api, $scope, account);
      this.account = account;
    }
    angular.extend(DeliveryConfirmedGoodsProvider.prototype, IndexedEntityProvider.prototype, {

      uniqueKey: function(good) {
        return good.purchase;
      },
      sortFunction: function(a, b) {
        return a.index - b.index;
      },

      getData: function() {
        var deferred = $q.defer();
        var args = {
          includeCounts: true,
          requestType: 'getDGSPurchases',
          seller: this.account,
          completed: true
        }
        this.api.engine.socket().callAPIFunction(args).then(deferred.resolve, deferred.reject);
        return deferred.promise;
      },

      dataIterator: function(data) {
        var goods = data.purchases;
        var index = this.entities.length > 0 ? this.entities[this.entities.length - 1].index : 0;
        for (var i = 0; i < goods.length; i++) {
          var a = goods[i];
          a.priceNXT = nxt.util.convertToAsset(a.priceNQT, a.assetDecimals)
        }
        return new Iterator(goods);
      }
    });
    return DeliveryConfirmedGoodsProvider;
  });
})();