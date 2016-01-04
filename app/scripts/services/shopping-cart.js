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
          item.count = count + existing_count;
          db.cart.put(item).then(deferred.resolve, deferred.reject);
        }
        else {
          item.count = count + existing_count;
          this.updateItem(symbol, item).then(deferred.resolve, deferred.reject);
          //db.cart.update(item).then(deferred.resolve, deferred.reject);
        }
      }.bind(this));
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
    },

    updateItem: function (symbol, item) {
      var deferred = $q.defer();
      db.cart.where('symbol').
              equals(symbol).
              and(createGoodsFilter(item.goods)).
              modify(item).
              then(deferred.resolve, deferred.reject);
      return deferred.promise;
    }
  };
})
})();