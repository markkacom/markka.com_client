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
module.factory('CurrencyProvider', function (nxt, $q, IndexedEntityProvider) {

  function CurrencyProvider(api, $scope, pageSize, account) {
    this.init(api, $scope, pageSize, account);
  }
  angular.extend(CurrencyProvider.prototype, IndexedEntityProvider.prototype, {

    uniqueKey: function (currency) { return currency.currency },
    sortFunction: function (a, b) { return a.index - b.index; },

    getData: function (firstIndex) {
      var deferred = $q.defer();
      var args = {
        account:        this.account,
        firstIndex:     firstIndex,
        lastIndex:      firstIndex + this.pageSize
      }
      this.api.engine.socket().getAccountCurrencies(args).then(deferred.resolve, deferred.reject);
      return deferred.promise;
    },

    dataIterator: function (currencies) {
      var index     = this.entities.length > 0 ? this.entities[this.entities.length - 1].index : 0;
      for (var i=0; i<currencies.length; i++) {
        var a       = currencies[i];
        a.units     = nxt.util.convertToQNTf(a.units, a.decimals);
        a.totalUnits = nxt.util.convertToQNTf(a.currentSupply, a.decimals);
        a.index     = index++;
      }
      return new Iterator(currencies);
    }
  });
  return CurrencyProvider;
});
})();