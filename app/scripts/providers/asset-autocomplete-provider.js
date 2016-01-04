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
module.factory('AssetAutocompleteProvider', function (nxt, $q, $rootScope) {
  function AssetAutocompleteProvider(api) {
    this.api = api;
  }
  AssetAutocompleteProvider.prototype = {
    getResults: function (query, id_rs) {
      var deferred = $q.defer();
      if (id_rs) {
        var args = {
          requestType: 'getAccountAssets',
          account: id_rs,
          firstIndex: 0,
          lastIndex: 100
        }
      }
      else {
        var args = {
          requestType: 'searchAssets',
          query: 'NAME:'+query+'*',
          firstIndex: 0,
          lastIndex: 15,
          includeCounts: true
        };
      }
      this.api.engine.socket().callAPIFunction(args).then(
        function (data) {
          var assets = (id_rs ? data.accountAssets : data.assets)||[];
          if (id_rs) {
            query = query.toLowerCase();
            assets = assets.filter(function (asset) {
              return asset.name.toLowerCase().indexOf(query) != -1;
            });
          }
          if (assets.length == 1 &&
              assets[0].asset == query) {
            deferred.resolve([]);
          }
          else {
            deferred.resolve(assets.map(
              function (asset) {
                asset.accountLabel = (id_rs) ?  asset.issuerName||asset.issuerRS :  // getAccountAssets
                                                asset.accountName||asset.accountRS; // searchAssets
                return asset;
              }
            ));
          }
        },
        deferred.reject
      );
      return deferred.promise;
    }
  }
  return AssetAutocompleteProvider;
});
})();