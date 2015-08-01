(function () {
'use strict';
var module = angular.module('fim.base');
module.factory('TradesProvider', function (nxt, $q, IndexedEntityProvider) {
  
  function TradesProvider(api, $scope, pageSize, asset, decimals) {
    this.init(api, $scope, pageSize);
    this.asset = asset;
    this.decimals = decimals;

    api.engine.socket().subscribe('blockPopped', angular.bind(this, this.blockPopped), $scope);
    api.engine.socket().subscribe('blockPushed', angular.bind(this, this.blockPushed), $scope);

    api.engine.socket().subscribe('TRADE_ADDED*'+asset, angular.bind(this, this.tradeAddUpdate), $scope);
    api.engine.socket().subscribe('TRADE_UPDATED*'+asset, angular.bind(this, this.tradeAddUpdate), $scope);
    api.engine.socket().subscribe('TRADE_REMOVED*'+asset, angular.bind(this, this.tradeRemove), $scope); 
  }
  angular.extend(TradesProvider.prototype, IndexedEntityProvider.prototype, {

    /* @override */
    sortFunction: IndexedEntityProvider.prototype.transactionSort,

    /* @override */
    uniqueKey: function (trade) { return trade.bidOrder+trade.askOrder; },

    getData: function (firstIndex) {
      var deferred = $q.defer();
      var args = {
        asset:          this.asset,
        firstIndex:     firstIndex,
        lastIndex:      firstIndex + this.pageSize,
        requestType:    'getVirtualTrades'
      }      
      this.api.engine.socket().callAPIFunction(args).then(deferred.resolve, deferred.reject);
      return deferred.promise;
    },

    translate: function (trade) {
      if (trade.quantityQNT) {
        trade.quantity = nxt.util.convertToQNTf(trade.quantityQNT, this.decimals);
      }
      if (trade.priceNQT) {
        trade.price    = nxt.util.calculateOrderPricePerWholeQNT(trade.priceNQT, this.decimals);
        trade.total    = nxt.util.convertToNXT(nxt.util.calculateOrderTotalNQT(trade.priceNQT, trade.quantityQNT));
      }
      if (trade.timestamp) {
        trade.date     = nxt.util.formatTimestamp(trade.timestamp, true);
      }
    },

    dataIterator: function (data) {
      for (var i=0; i<data.trades.length; i++) {
        this.translate(data.trades[i]);
      }
      return new Iterator(data.trades);
    },

    getTypeColor: function (type) {
      return type == 'buy' ? 'green' : 'red';
    },

    /* @websocket */
    tradeAddUpdate: function (trade) {
      var self = this;
      this.$scope.$evalAsync(function () {
        self.translate(trade);
        self.add(trade);
      });
    },

    /* @websocket */
    tradeRemove: function (trade) {
      var self = this;
      this.$scope.$evalAsync(function () {
        self.remove(self.uniqueKey(trade));
      });
    },

    /* @websocket */
    blockPushed: function (block) {
      var self = this;
      this.$scope.$evalAsync(function () {
        self.forEach(function (trade) {
          trade.confirmations = block.height - trade.height;
        });
      });
    },

    /* @websocket */
    blockPopped: function (block) {
      if (this.delayedReload) {
        clearTimeout(this.delayedReload);
      }
      var self = this;
      this.delayedReload = setTimeout(function () { self.reload(); }, 1000);
    }
  });
  return TradesProvider;
});
})();