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
module.factory('AllAssetsProvider', function (nxt, $q, IndexedEntityProvider) {

  function AllAssetsProvider(api, $scope, pageSize) {
    this.init(api, $scope, pageSize);
    this.filter = null;
  }
  angular.extend(AllAssetsProvider.prototype, IndexedEntityProvider.prototype, {

    uniqueKey: function (asset) { return asset.asset; },
    sortFunction: function (a, b) { return a.index - b.index; },

    getData: function (firstIndex) {
      var deferred = $q.defer();
      var args = {
        firstIndex:     firstIndex,
        lastIndex:      firstIndex + this.pageSize,
        includeCounts:  true,
        requestType:    'getAllAssets'
      }
      if (this.filter) {
        args.query = this.filter;
        args.requestType = 'searchAssets';
        if (!/\*$/.test(args.query)) {
          args.query += '*';
        }
      }
      this.api.engine.socket().callAPIFunction(args).then(deferred.resolve, deferred.reject);
      return deferred.promise;
    },

    dataIterator: function (data) {
      var assets = data.assets;
      var index = this.entities.length > 0 ? this.entities[this.entities.length - 1].index : 0;
      for (var i=0; i<assets.length; i++) {
        var a       = assets[i];
        a.quantity  = nxt.util.commaFormat(nxt.util.convertToQNTf(a.quantityQNT, a.decimals));
        a.numberOfTrades    = nxt.util.commaFormat(String(a.numberOfTrades));
        a.numberOfTransfers = nxt.util.commaFormat(String(a.numberOfTransfers));
        a.numberOfAccounts  = nxt.util.commaFormat(String(a.numberOfAccounts));
        a.index     = index++;
        a.isPrivate = a.type == 1;
        a.label     = a.accountColorName ? a.accountColorName : this.api.engine.symbol;
        a.label    += '/' + a.name;
        a.isExpired = a.expiry ? nxt.util.convertToEpochTimestamp(Date.now()) > a.expiry : false;
        a.expiry = a.expiry === 2147483647 ? null : nxt.util.formatTimestamp(a.expiry);
      }
      //return new Iterator(assets);
      //filter expired on client side. Todo should be filtered on server side
      return new Iterator(assets, function (e) { return !e.isExpired; });
    }
  });
  return AllAssetsProvider;
});
})();
