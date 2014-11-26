(function () {
'use strict';
var module = angular.module('fim.base');
module.run(function (startupService, nxt, $timeout, requests, db, $rootScope, $q) {

  /* @implements ActivityInterface */
  function DownloadAssets(api) {
    this.api      = api;

    /* ActivityInterface */
    this.progress = 100;
    this.message  = 'Updating '+api.engine.symbol+' asset information';
  }
  DownloadAssets.prototype = {

    /* ActivityInterface */
    isDone: function () {
      return true;
    },

    /* ActivityInterface */
    start: function (onSomeWorkDone) {
      var self = this;
      this.api.assets.init().then(
        function () {
          onSomeWorkDone(self)
        },
        function () { 
          onSomeWorkDone(self)
        }
      );
    }
  }  

  /* @implements ActivityInterface */
  function DownloadTrades(api) {
    this.api = api;
    /* ActivityInterface */
    this.message  = 'Downloading newest '+api.engine.symbol.toUpperCase()+' AE trades';
    this.progress = 100;
  }
  DownloadTrades.prototype = {

    /* ActivityInterface */
    isDone: function () {
      return true;
    },

    /* ActivityInterface */
    start: function (onSomeWorkDone) {
      var self = this;
      this.api.engine.db.trades.orderBy('timestamp').reverse().first().then(
        function (trade) {
          if (trade) {
            var timestamp = trade.timestamp - 1;
          }
          else {
            var timestamp = nxt.util.convertToEpochTimestamp(Date.now() - (7 * 24 * 60 * 60 * 1000)); /* 7 days */
          }
          self.api.getAllTrades({
            timestamp: timestamp
          }, {
            podium: requests.mainStage,
            priority: 5
          }).then(
            function (trades) {
              var promises = [];
              db.transaction('rw', self.api.engine.db.trades, function () {
                for(var i=0; i<trades.length; i++) {
                  promises.push(storeTrade(self.api, trades[i]));
                }
              });

              Promise.all(promises).then(
                function () {
                  onSomeWorkDone(self); 
                }
              ).catch(
                function () {
                  onSomeWorkDone(self); 
                }
              );               
            },
            function () {
              onSomeWorkDone(self);
            }
          );
        }
      );
    }
  }

  function storeTrade(api, trade) {
    var deferred = $q.defer();
    api.engine.db.trades.where('timestamp').equals(trade.timestamp).and(
      function (_trade) { 
        return _trade.askOrder == trade.askOrder && 
               _trade.bidOrder == trade.bidOrder && 
               _trade.priceNQT == trade.priceNQT;
      }).count().then(
      function (count) {
        if (count == 0) {
          api.engine.db.trades.put(trade).then(deferred.resolve).catch(deferred.reject);
        }
        else {
          deferred.resolve();
        }
      }
    ).catch(deferred.reject);
    return deferred.promise;
  }

  /**
   * This activity does the following:
   *
   *  1. calculate the daily % change for each asset
   *  2. determine the most recent price for each asset
   *  3. calculate trade volume for each asset (adjustable per how many days)
   *
   * For the current trading volume a full swoop trade by trade style processor
   * is probably fastest and most CPU friendly.
   *
   * An anynchronous processor (using $timeout) that processes batches of
   * transactions at a time must be used to prevent UI freezing.
   *
   * @implements ActivityInterface 
   */
  function ProcessTrades(api) {
    this.api      = api;

    /* ActivityInterface */
    this.progress = 100;
    this.message  = 'Processing '+api.engine.symbol+' trades';
  }
  ProcessTrades.prototype = {

    /* ActivityInterface */
    isDone: function () {
      return true;
    },

    /* ActivityInterface */
    start: function (onSomeWorkDone) {
      var self = this;
      var _24hour = 24 * 60 * 60 * 1000;
      var _2days  = 2 * _24hour;
      var now = Date.now();
      var timestamp = nxt.util.convertToEpochTimestamp(now - _2days);
      var timestamp24h = nxt.util.convertToEpochTimestamp(now - _24hour);
      this.api.engine.db.trades.where('timestamp').aboveOrEqual(timestamp).toArray().then(
        function (trades) {

          /* Go over each trade find the oldest in 24h and the latest for each asset */
          var trade, oldest24h = {}, latest = {};
          for (var i=0; i<trades.length; i++) {
            trade = trades[i];

            if (!latest[trade.asset] || trade.timestamp > latest[trade.asset].timestamp) {
              latest[trade.asset] = trade;
            }
            if (trade.timestamp < timestamp24h) {
              if (!oldest24h[trade.asset] || trade.timestamp < oldest24h[trade.asset].timestamp) {
                oldest24h[trade.asset] = trade;
              }
            } 
          }

          /* Update the assets for which we found something */
          db.transaction('rw', self.api.engine.db.assets, function () {
            var asset, trade, update = {};
            for (var asset_id in oldest24h) {
              asset = self.api.assets.get(asset_id);
              trade = oldest24h[asset_id];
              if (!asset) {
                console.log('Asset '+asset_id+' not found for trade', trade);
                continue;
              }
              update[asset_id] = update[asset_id] || {};
              update[asset_id].oldest24h = trade;
            }

            for (var asset_id in latest) {
              asset = self.api.assets.get(asset_id);
              trade = latest[asset_id];
              if (!asset) {
                console.log('Asset '+asset_id+' not found for trade', trade);
                continue;
              }
              update[asset_id] = update[asset_id] || {};
              update[asset_id].latest = trade;
            }

            for (var asset_id in update) {
              self.api.engine.db.assets.update(asset_id, update[asset_id]);
            }

          }).then(
            function () {
              onSomeWorkDone(self);
            }
          ).catch(
            function () {
              onSomeWorkDone(self);
            }
          );
        }
      );
    }
  }

  startupService.registerActivity('download-nxt-assets', new DownloadAssets(nxt.nxt()), 'scan-fork-nxt');
  startupService.registerActivity('download-fim-assets', new DownloadAssets(nxt.fim()), 'scan-fork-fim');  

  startupService.registerActivity('download-nxt-trades', new DownloadTrades(nxt.nxt()), 'download-nxt-assets');
  startupService.registerActivity('download-fim-trades', new DownloadTrades(nxt.fim()), 'download-fim-assets');

  startupService.registerActivity('process-nxt-trades', new ProcessTrades(nxt.nxt()), 'download-nxt-trades');
  startupService.registerActivity('process-fim-trades', new ProcessTrades(nxt.fim()), 'download-fim-trades');

});
})();