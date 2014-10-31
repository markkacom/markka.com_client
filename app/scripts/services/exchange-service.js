(function () {
'use strict';

var module = angular.module('fim.base');

module.factory('exchangeService', function($http, $q, $log) {

// ///////////////////////////////////////////////////////////////////////////
// Error Classes
// ///////////////////////////////////////////////////////////////////////////

var ExchangeError = function (data, msg) {
  this.msg = msg;
  try {
    this.url = data.config.url;
  } catch (e) {
    this.url = "unknown";
  }
  this.data = data;
};

// ///////////////////////////////////////////////////////////////////////////
// Exhange Interface
// ///////////////////////////////////////////////////////////////////////////

var ExchangeInterface = function (label) {

  /**
   * Returns the display name for this exchange 
   */
  this.label = label;

  /**
   * Generic login method
   *
   * Session object example: { }
   *
   * @returns Promise
   */
  this.login = function (options) {
    var deferred = $q.defer();
    deferred.reject();
    return deferred.promise;     
  }

  /**
   * Generic logout method
   *
   * @returns Promise
   */
  this.logout = function () {
    var deferred = $q.defer();
    deferred.reject();
    return deferred.promise;    
  }

  /**
   * Place a bid order
   *
   * @returns Promise
   */
  this.placeBid = function (asset, price, units) {
    var deferred = $q.defer();
    deferred.reject();
    return deferred.promise;      
  }

  /**
   * Place a ask order
   *
   * @returns Promise
   */
  this.placeAsk = function (asset, price, units) {
    var deferred = $q.defer();
    deferred.reject();
    return deferred.promise;      
  }

  /**
   * Cancel a bid order
   *
   * @returns Promise
   */
  this.cancelBid = function (orderid) {
    var deferred = $q.defer();
    deferred.reject();
    return deferred.promise;      
  }

  /**
   * Cancel a ask order
   *
   * @returns Promise
   */
  this.cancelAsk = function (orderid) {
    var deferred = $q.defer();
    deferred.reject();
    return deferred.promise;      
  }

  /**
   * Returns an array of trading pairs.
   * 
   * Trading pair example: { quote: ASSET, base: ASSET }
   * Asset example: { symbol: 'BTC', 'name': 'Bitcoin' }
   * 
   * @returns Promise
   */
  this.getTradingPairs = function () {
    var deferred = $q.defer();
    deferred.resolve([]);
    return deferred.promise;
  }

  /**
   * Returns an array of asset balances
   *
   * Balance example: { asset: 'BTC', balance: 100 }
   *
   * @returns Promise
   */
  this.getBalances = function () {
    var deferred = $q.defer();
    deferred.resolve([]);
    return deferred.promise;
  }

  /**
   * Returns ticker data object for a pair
   *
   * Trading pair example: { quote: ASSET, base: ASSET }
   * Asset example: { symbol: 'BTC', 'name': 'Bitcoin' }
   * Ticker example: { last: 1, high: 2, low: 3, average:4, sell: 5, buy: 6, vol_base: 3, vol_quote: 10 }
   *
   * @returns Promise
   */
  this.getTicker = function (pair) {
    var deferred = $q.defer();
    deferred.resolve([]);
    return deferred.promise;
  }

  /**
   * Returns an array of open buy orders based on a trading pair.
   *
   * Trading pair example: { quote: ASSET, base: ASSET }
   * Buy order example: { price: [HOW MANY BASE FOR 1 QUOTE], quantity: 1, total: 2 }
   * 
   * @returns Promise
   */
  this.getBuyOrders = function (pair) {
    var deferred = $q.defer();
    deferred.resolve([]);
    return deferred.promise;    
  }

  /**
   * Returns an array of open buy orders based on a trading pair.
   *
   * Trading pair example: { quote: ASSET, base: ASSET }
   * Sell order example: { price: [HOW MANY BASE FOR 1 QUOTE], quantity: 1, total: 2 }
   * 
   * @returns Promise
   */
  this.getSellOrders = function (pair) {
    var deferred = $q.defer();
    deferred.resolve([]);
    return deferred.promise;  
  }

  /**
   * Returns an array of chart data.
   *
   * Trading pair example: { quote: ASSET, base: ASSET }
   * Data example: { 
   *    time: 111, 
   *    open: 1,
   *    high: 10,
   *    low: 5,
   *    close: 20,
   *    average: 15,
   *    volume: 10000
   * }
   *
   * @returns Promise
   */
  this.getChartData = function (pair) {
    var deferred = $q.defer();
    deferred.resolve([]);
    return deferred.promise;      
  }

  /**
   * Returns an array of open sell orders based on a trading pair.
   * This shares the Promise for obtaining the chart data since they use the same data
   *
   * Trading pair example: { quote: ASSET, base: ASSET }
   * Trade example: { 
   *    time: 1, 
   *    price: 2, 
   *    quantity: 3, 
   *    total: 4,
   *    askOrder: 1,
   *    bidOrder: 3,
   *    transaction_id: 'xx'
   * }
   *
   * @returns Promise
   */
  this.getTrades = function (pair) {
    var deferred = $q.defer();
    deferred.resolve([]);
    return deferred.promise;      
  }

  /**
   * Returns an array of sort options for use in the UI.
   *
   * Sort option example: { label: 'Sort by issuer', compare: function (a, b) { return a.issuer - b.issuer } }
   *
   * @returns Array
   */
  this.pairSortOptions = function () {
    return [];
  }
};

// ///////////////////////////////////////////////////////////////////////////
// FACTORY
// ///////////////////////////////////////////////////////////////////////////

return {
  ExchangeError: ExchangeError,
  ExchangeInterface: ExchangeInterface,  
  exchanges: {}
};

});

})();
