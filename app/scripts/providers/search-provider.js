(function () {
'use strict';
var module = angular.module('fim.base');
module.factory('SearchProvider', function (nxt, $q, IndexedEntityProvider) {
  
  var categories = {
    "accounts": {
      uniqueKey: function (a) {
        return a.accountRS;
      },
      process: function (a, index) {
        a.balanceNXT = nxt.util.convertToNXT(a.balanceNQT);
        a.effectiveBalanceNXT = nxt.util.commaFormat(a.effectiveBalanceNXT);
        a.index      = index;
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

  function SearchProvider(api, $scope, pageSize, category, query) {
    this.init(api, $scope, pageSize);
    this.category = category;
    this.query    = query;
    this.impl     = categories[this.category];

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
          args.query = args.query.replace('*','%');
        }

        /* use searchAccounts API for nxt 1.5+ */
        if (this.api.type == nxt.TYPE_NXT && this.category == 'accounts') {
          delete args.category;
          args.requestType = 'searchAccounts';
          this.api.engine.socket().callAPIFunction(args).then(deferred.resolve, deferred.reject);
        }
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
      if (this.api.type == nxt.TYPE_NXT && this.category == 'accounts') {
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
