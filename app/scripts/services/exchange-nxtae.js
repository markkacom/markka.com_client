(function () {
'use strict';

// ///////////////////////////////////////////////////////////////////////////
// DGEX EXCHANGE
// ///////////////////////////////////////////////////////////////////////////

var module = angular.module('fim.base');  

module.factory('nxtAEExchange', function($rootScope, $http, $q, $log, exchangeService, assets, serverService) {

var instance = new exchangeService.ExchangeInterface('NXTAE');
exchangeService.exchanges['NXTAE'] = instance;

$.extend(instance, {

  tradesPromise: null,

  tradingPairsPromise: null,

  /**
   * Returns an array of trading pairs.
   * 
   * Trading pair example: { quote: ASSET, base: ASSET }
   * Asset example: { symbol: 'BTC', 'name': 'Bitcoin' }
   * 
   * @returns Promise
   */
  getTradingPairs: function () {
    var deferred = $q.defer();
    this.tradingPairsPromise = serverService.sendRequest('getAssetIds');
    this.tradingPairsPromise.then(function (data) {
      console.log("getAssetIds")
      console.log(data)      
      var args = [];      
      data.assetIds.forEach(function (id) {
        args.push({ assets: id });
      });
      console.log("args")
      console.log(args)
      serverService.sendRequest('getAssets', args).then(
        function (data) {
          console.log("getAssets")
          console.log(data)
          var pairs = [];
          for (var i=0,l=data.assets.length; i<l; i++) {
            var asset = data.assets[i];
            if (!(asset.asset in assets)) {
              assets[asset.asset] = { 
                symbol: asset.name, 
                name: asset.asset, 
                decimals: asset.decimals,
                numberOfTrades: asset.numberOfTrades,
                quantity: NRS.convertToQNTf(asset.quantityQNT, asset.decimals),
                description: asset.description,
                account: asset.account,
                accountRS: asset.accountRS
              };
            }
            pairs.push({ base: assets.FIMK, quote: assets[asset.asset] });
          }

          // Default sort based on number of trades
          pairs.sort(function(a, b) {
            return a.quote.numberOfTrades - b.quote.numberOfTrades;
          });
          pairs.reverse();

          deferred.resolve(pairs);
        },
        function (error) {
          deferred.reject(new exchangeService.ExchangeError(error, 'Could not obtain trading pairs'));
        }
      );
    }, function (error) {
      deferred.reject(new exchangeService.ExchangeError(error, 'Could not obtain trading pairs'));
    });
    return deferred.promise;
  },

  /**
   * Returns an array of sort options for use in the UI.
   *
   * Sort option example: { label: 'Sort by issuer', compare: function (a, b) { return a.issuer - b.issuer } }
   *
   * @returns Array
   */
  pairSortOptions: [
    {label: 'Sort by name', compare: function (a,b) { return UTILS.compareString(a.quote.symbol, b.quote.symbol) } },
    {label: 'Sort by issuer', compare: function (a,b) { return UTILS.compareString(a.quote.account, b.quote.account) } },
    {label: 'Sort by quantity', compare: function (a,b) { return UTILS.compareString(a.quote.quantity, b.quote.quantity) } },
    {label: 'Sort by number of trades', compare: function (a,b) { return UTILS.compareNumber(a.quote.numberOfTrades, b.quote.numberOfTrades) } }
  ],

  /**
   * Returns an array of open buy orders based on a trading pair.
   *
   * Trading pair example: { quote: ASSET, base: ASSET }
   * Buy order example: { price: [HOW MANY BASE FOR 1 QUOTE], quantity: 1, total: 2 }
   * 
   * @returns Promise
   */
  getBuyOrders: function (pair) {
    return this.getOrders('buy', pair);
  },

  /**
   * Returns an array of open sell orders based on a trading pair.
   *
   * Trading pair example: { quote: ASSET, base: ASSET }
   * Sell order example: { price: [HOW MANY BASE FOR 1 QUOTE], quantity: 1, total: 3 }
   * 
   * @returns Promise
   */
  getSellOrders: function (pair) {
    return this.getOrders('sell', pair);
  }, 

  getOrders: function (type, pair) {
    var deferred = $q.defer();
    var requestType = type == 'buy' ? 'getBidOrders' : 'getAskOrders';
    var promise = serverService.sendRequest(requestType, { limit:1440, asset:pair.quote.name });
    promise.then(
      function (data) {
        console.log('getOrders -> ' + type)
        console.log(data)
        var key = type == 'buy' ? 'bidOrders' : 'askOrders';
        var input = data[key];
        var orders = [];
        var cumulative = new BigInteger('0');
        for (var i=0; i<input.length; i++) {
          var totalNQT = new BigInteger(NRS.calculateOrderTotalNQT(input[i].quantityQNT, input[i].priceNQT));
          cumulative   = cumulative.add(totalNQT);
          orders.push({ 
            price: NRS.calculateOrderPricePerWholeQNT(input[i].priceNQT, pair.quote.decimals, false), 
            quantity: NRS.convertToQNTf(input[i].quantityQNT, pair.quote.decimals),
            total: NRS.convertToNXT(totalNQT),
            cumulative: NRS.convertToNXT(cumulative)
          });
        }
        deferred.resolve(orders);
      },
      function (data) {
        deferred.reject(new exchangeService.ExchangeError(data, 'Could not obtain '+type+' orders'));
      }
    );
    return deferred.promise;
  },

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
   *    bidOrder: 3
   * }
   *
   * @returns Promise
   */
  getTrades: function (pair) {
    var deferred = $q.defer();
    this.tradesPromise = serverService.sendRequest('getTrades', {firstIndex:0,lastIndex:1440,asset:pair.quote.name});
    this.tradesPromise.then(
      function (data) {
        var input = data['trades'];
        var trades = [];
        for (var i=0,l=input.length; i<l; i++) {
          trades.push({ 
            time: UTILS.formatDate(new Date(Date.UTC(2013, 10, 24, 12, 0, 0, 0) + input[i].timestamp * 1000)),
            price: NRS.calculateOrderPricePerWholeQNT(input[i].priceNQT, pair.quote.decimals, false), 
            quantity: NRS.convertToQNTf(input[i].quantityQNT, pair.quote.decimals)
          });
        }
        deferred.resolve(trades);
      },
      function (data) {
        deferred.reject(new exchangeService.ExchangeError(data, 'Could not obtain trade data'));
      }
    );
    return deferred.promise;
  },

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
  getChartData: function (pair) {
    var deferred = $q.defer();
    this.tradesPromise.then(function (data) {
      var input = data['trades'];
      var points = [];
      for (var i=0; i<input.length; i++) {
        var totalNQT = new BigInteger(NRS.calculateOrderTotalNQT(input[i].quantityQNT, input[i].priceNQT));
        points.push({ 
          time: new Date(Date.UTC(2013, 10, 24, 12, 0, 0, 0) + input[i].timestamp * 1000).getTime(),
          average: parseInt(input[i].priceNQT)
        });
      }
      // NXT does not return trades sorted
      points.sort(function(a, b) {
        return a.time - b.time;
      });
      deferred.resolve(points);
    }, function (data) {
      deferred.reject(new exchangeService.ExchangeError(data, 'Could not obtain chart data|File not found'));
    });
    return deferred.promise;
  }
});

return instance;

});

})();