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
module.factory('SearchProvider', function (nxt, $q, IndexedEntityProvider) {
  function SearchProvider(api, $scope, pageSize, category, query) {
    this.init(api, $scope, pageSize);
    this.category = category;
    this.query    = query;

    this.categories = {
      "accounts": {
        uniqueKey: function (a) {
          return a.accountRS;
        },
        process: function (a, index) {
          a.balanceNXT = nxt.util.convertToNXT(a.balanceNQT);
          a.effectiveBalanceNXT = nxt.util.commaFormat(a.effectiveBalanceNXT);
          a.index      = index;
          if (a.accountEmail == a.accountRS) {
            a.accountEmail = '';
          }
        }
      },
      "assets": {
        uniqueKey: function (a) {
          return a.asset;
        },
        process: function (a, index) {
          a.index      = index;
        }
      },
      "currencies": {
        uniqueKey: function (a) {
          return a.code;
        },
        process: function (a, index) {
          a.units      = nxt.util.convertToQNTf(a.units, a.decimals);
          a.totalUnits = nxt.util.convertToQNTf(a.currentSupply, a.decimals);
          a.index      = index;
        }
      },
      "market": {
        uniqueKey: function (a) {
          return a.goods;
        },
        process: function (a, index) {
          a.index      = index;
        }
      },
      "aliases": {
        uniqueKey: function (a) {
          return a.aliasName;
        },
        process: function (a, index) {
          a.index      = index;
        }
      }
    };

    this.impl     = this.categories[this.category];

    if (!this.impl) {
      throw new Error('Unsupported category ' +this.category);
    }

  }
  angular.extend(SearchProvider.prototype, IndexedEntityProvider.prototype, {

    uniqueKey: function (o) { return this.impl.uniqueKey(o) },
    sortFunction: function (a, b) { return a.index - b.index },

    getData: function (firstIndex) {
      var deferred = $q.defer();
      var query = this.query.trim();
      if (query.length > 0) {
        var args = {
          category:       this.category,
          query:          query,
          firstIndex:     firstIndex,
          lastIndex:      firstIndex + this.pageSize
        }
        if (args.query.substring(args.query.length-1) != "*") {
          args.query += '*';
        }
        if (args.category == 'aliases') {
          args.query = args.query.replace(/\*/g,'%');
        }

        /* use searchAccounts API for nxt 1.5+ */
        if (this.category == 'accounts') {
          delete args.category;
          args.requestType = 'searchAccountIdentifiers';
          args.query = args.query.replace(/\*$/,'');

          /* If search starts with FIM- remove that from the query */
          args.query = args.query.replace(/^FIM-/,'');

          this.api.engine.socket().callAPIFunction(args).then(deferred.resolve, deferred.reject);
        }
        /* use getAliasesLike API for nxt 1.5+ */
        /*if (this.category == 'aliases') {
          delete args.category;
          args.requestType = 'getAliasesLike';
          this.api.engine.socket().callAPIFunction(args).then(deferred.resolve, deferred.reject);
        }*/
        else {
          this.api.engine.socket().search(args).then(deferred.resolve, deferred.reject);
        }
      }
      else {
        deferred.resolve({ results: [] });
      }
      return deferred.promise;
    },

    dataIterator: function (data) {
      var index = this.entities.length > 0 ? this.entities[this.entities.length - 1].index : 0;

      /* use searchAccounts API for nxt 1.5+ */
      if (this.category == 'accounts') {
        var results = data.accounts||[];
      }
      else {
        var results = data.results||[];
      }
      if (this.impl.process) {
        for (var i=0; i<results.length; i++) {
          index++;
          this.impl.process(results[i], index);
        }
      }
      return new Iterator(results);
    }
  });
  return SearchProvider;
});
})();
