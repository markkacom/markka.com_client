(function () {
'use strict';
var module = angular.module('fim.base');
module.factory('BidOrderProvider', function (nxt, $q, IndexedEntityProvider) {
  
  function BidOrderProvider(api, $scope, pageSize, asset) {
    this.init(api, $scope, pageSize);
    this.asset = asset;
    this.decimals = 0; /* set on first invocation of getData */

    this.isBidOrder = function (transaction) {
      return transaction.type == 2 && transaction.subtype == 3 && transaction.attachment.asset == asset;
    }

    this.isCancelBidOrder = function (transaction) {
      return transaction.type == 2 && transaction.subtype == 5;
    }

    api.engine.socket().subscribe('addedUnConfirmedTransactions', angular.bind(this, this.addedUnConfirmedTransactions), $scope);
    api.engine.socket().subscribe('removedUnConfirmedTransactions', angular.bind(this, this.removedUnConfirmedTransactions), $scope);
    api.engine.socket().subscribe('addedConfirmedTransactions', angular.bind(this, this.addedConfirmedTransactions), $scope);
    api.engine.socket().subscribe('blockPopped', angular.bind(this, this.blockPopped), $scope);
    api.engine.socket().subscribe('blockPushed', angular.bind(this, this.blockPopped), $scope);
    //api.engine.socket().subscribe('addedTrades*'+asset, angular.bind(this, this.addedTrades), $scope);
  }
  angular.extend(BidOrderProvider.prototype, IndexedEntityProvider.prototype, {

    /* Turns a Transaction into an Order object */
    toOrder: function (transaction) {
      var priceNQT = transaction.attachment.priceNQT;
      var quantityQNT = transaction.attachment.quantityQNT;
      var price = nxt.util.calculateOrderPricePerWholeQNT(priceNQT, this.decimals);
      return {
        order: transaction.transaction,
        priceNQT: priceNQT,
        quantityQNT: quantityQNT,
        height: transaction.height,
        confirmations: transaction.confirmations,
        quantity: nxt.util.convertToQNTf(quantityQNT, this.decimals),
        price: price,
        total: nxt.util.convertToNXT(nxt.util.calculateOrderTotalNQT(priceNQT, quantityQNT)),
        priceNum: parseFloat(price.replace(',','')),
        accountRS: transaction.senderRS,
        type: 'buy'
      };
    },

    /* @override */
    // ORDER BY price DESC, creation_height ASC, id ASC ");
    sortFunction: function (a, b) {
      if (a.priceNum > b.priceNum) return -1;
      else if (a.priceNum < b.priceNum) return 1;
      else {
        if (a.height < b.height) return -1;
        else if (a.height > b.height) return 1;
        else {
          if (a.order < b.order) return -1;
          else if (a.order > b.order) return 1;
        }
      }
      return 0;
    },

    /* @override */
    uniqueKey: function (order) { return order.order },

    /* @override */
    getData: function (firstIndex) {
      var deferred = $q.defer();
      var args = {
        asset:          this.asset,
        firstIndex:     firstIndex,
        lastIndex:      firstIndex + this.pageSize,
        type:           'bid'
      }
      this.api.engine.socket().getAssetOrders(args).then(deferred.resolve, deferred.reject);
      return deferred.promise;
    },

    /* @override */
    dataIterator: function (data) {
      var decimals = data.decimals;
      for (var i=0; i<data.orders.length; i++) {
        var a = data.orders[i];
        a.quantity = nxt.util.convertToQNTf(a.quantityQNT, decimals);
        a.price = nxt.util.calculateOrderPricePerWholeQNT(a.priceNQT, decimals);
        a.total = nxt.util.convertToNXT(nxt.util.calculateOrderTotalNQT(a.priceNQT, a.quantityQNT));
        a.priceNum = parseFloat(a.price.replace(',',''));
      }
      return new Iterator(data.orders);
    },

    addedUnConfirmedTransactions: function (transactions) {
      var self = this;
      this.$scope.$evalAsync(function () {
        angular.forEach(transactions, function (transaction) {
          if (self.isBidOrder(transaction)) {
            self.add(self.toOrder(transaction));
          }
          else if (self.isCancelBidOrder(transaction)) {
            var order = self.keys[transaction.attachment.order];
            if (order) {
              order.cancellers = order.cancellers || {};
              order.cancellers[transaction.transaction] = transaction;
            }
          }
        });
        self.sort();
      });
    },

    removedUnConfirmedTransactions: function (transactions) {
      var self = this;
      this.$scope.$evalAsync(function () {
        angular.forEach(transactions, function (transaction) {
          if (self.isBidOrder(transaction)) {
            self.remove(transaction.transaction);
          }
          else if (self.isCancelBidOrder(transaction)) {
            var order = self.keys[transaction.attachment.order];
            if (order && order.cancellers) {
              delete order.cancellers[transaction.transaction];
              if (Object.keys(order.cancellers).length == 0) {
                delete order.cancellers;
              }
            }
          }
        });
        self.sort();
      });
    },

    addedConfirmedTransactions: function (transactions) {
      var self = this;
      this.$scope.$evalAsync(function () {
        angular.forEach(transactions, function (transaction) {
          if (self.isBidOrder(transaction)) {
            self.add(self.toOrder(transaction));
          }
          else if (self.isCancelBidOrder(transaction)) {
            var order = self.keys[transaction.attachment.order];
            if (order) {
              if (order.cancellers) {
                delete order.cancellers[transaction.transaction];
                if (Object.keys(order.cancellers).length == 0) {
                  delete order.cancellers;
                }
              }
              order.cancel_height = transaction.height;
            }
          }
        });
        self.sort();
      });
    },

    blockPushed: function (block) {
      var self = this;
      this.$scope.$evalAsync(function () {      
        self.forEach(function (order) {
          order.confirmations = block.height - order.height;
        });
      });
    },

    blockPopped: function (block) {
      var self = this;
      this.$scope.$evalAsync(function () {         
        self.filter(function (order) {
          return order.height <= block.height;
        });
        self.forEach(function (order) {
          order.confirmations = block.height - order.height;
          if (order.cancel_height && order.cancel_height >= block.height) {
            delete order.cancel_height;
          }
        });
      });
    }    
  });
  return BidOrderProvider;
});

})();