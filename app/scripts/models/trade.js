(function () {
'use strict';
var module = angular.module('fim.base');
module.factory('TradeFactory', function() {
  return {
    mapToTable: function (db, name) {

      function Trade () {

      };
      Trade.prototype.save = function () {
        return db[name].put(this);
      }

      db[name].mapToClass(Trade, {
        timestamp:      Number,
        quantityQNT:    String,
        priceNQT:       String,
        asset:          String,
        askOrder:       String,
        bidOrder:       String,
        askOrderHeight: Number,
        bidOrderHeight: Number,
        sellerRS:       String,
        buyerRS:        String,
        block:          String,
        height:         Number,
        tradeType:      String,
        name:           String,
        decimals:       Number
      });
    }
  };
});
})();