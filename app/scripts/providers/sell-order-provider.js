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
module.factory('SellOrderProvider', function (nxt, $q, IndexedEntityProvider) {

  function SellOrderProvider(api, $scope, pageSize, account) {
    this.init(api, $scope, pageSize, account);
  }
  angular.extend(SellOrderProvider.prototype, IndexedEntityProvider.prototype, {

    uniqueKey: function (order) { return order.order },
    sortFunction: function (a, b) { return a.index - b.index; },

    getData: function (firstIndex) {
      var deferred = $q.defer();
      var args = {
        account:        this.account,
        firstIndex:     firstIndex,
        lastIndex:      firstIndex + this.pageSize,
        requestType:    'getAccountCurrentAskOrders'
      }
      this.api.engine.socket().callAPIFunction(args).then(deferred.resolve, deferred.reject);
      return deferred.promise;
    },

    dataIterator: function (data) {
      var index = this.entities.length > 0 ? this.entities[this.entities.length - 1].index : 0;
      var orders = data.askOrders;
      for (var i=0; i<orders.length; i++) {
        var a = orders[i];
        a.price = nxt.util.calculateOrderPricePerWholeQNT(a.priceNQT, a.decimals)+' '+(a.accountColorName||this.api.engine.symbol);
        a.quantity = nxt.util.commaFormat(nxt.util.convertToQNTf(a.quantityQNT, a.decimals))+' '+a.name;
        a.total = nxt.util.convertToNXT(nxt.util.calculateOrderTotalNQT(a.priceNQT, a.quantityQNT))+' '+(a.accountColorName||this.api.engine.symbol);
        a.index = index;
      }
      return new Iterator(orders);
    }
  });
  return SellOrderProvider;
});
})();