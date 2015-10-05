(function () {
'use strict';
var module = angular.module('fim.base');
module.service('shoppingCartService', function ($q, db) {
  function createGoodsFilter(goods) {
    return function (item) {
      return item.goods == goods;
    }
  }

  return {
    
    /**
     * Add N items of a specific good of a specific symbol.
     *
     * @param symbol Engine symbol (FIM, NXT, BTC?)
     * @param item Object result of getDGSGood { goods: "1386778363768636873", etc.. } 
     * @param count Number of items
     */
    add: function(symbol, item, count) {
      var deferred = $q.defer();
      item.symbol  = symbol.toLowerCase();
      this.getCount(symbol, item).then(function (existing_count) {
        if (existing_count == 0) {
          item.count = count;
          db.cart.put(item).then(deferred.resolve, deferred.reject);
        }
        else {
          item.count = count + existing_count;
          db.cart.update(item).then(deferred.resolve, deferred.reject);
        }
      });
      return deferred.promise;
    },

    /**
     * Returns all cart items for the specific symbol
     *
     * @param symbol_lower Engine symbol (FIM, NXT, BTC, EUR)
     * @returns [] 
     * */
    getAll: function (symbol) {
      var deferred = $q.defer();
      symbol = symbol.toLowerCase();
      db.cart.where('symbol').
              equals(symbol).
              toArray().
              then(deferred.resolve, deferred.reject);
      return deferred.promise;
    },

    getCount: function(symbol, item) {
      var deferred = $q.defer();
      symbol = (symbol||'').toLowerCase();
      db.cart.where('symbol').
              equals(symbol).
              and(createGoodsFilter(item.goods)).
              first().
              then(
      function (existing_item) {
        deferred.resolve(existing_item ? existing_item.count : 0);
      }, 
      deferred.reject);
      return deferred.promise;
    },
    
    removeItem: function(symbol, item) {
      var deferred = $q.defer();
      db.cart.where('symbol').
              equals(symbol).
              and(createGoodsFilter(item.goods)).
              delete().
              then(deferred.resolve, deferred.reject);
      return deferred.promise;
    }
  };
})
})();