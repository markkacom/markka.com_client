(function () {
'use strict';
var module = angular.module('fim.base');
module.factory('MyOrdersProvider', function (nxt, $q, IndexedEntityProvider) {
  
  function MyOrdersProvider(api, $scope, pageSize, asset, decimals, accounts) {
    this.init(api, $scope, pageSize);
    this.asset = asset;
    this.decimals = decimals;
    this.accounts = accounts;

    api.engine.socket().subscribe('blockPopped', angular.bind(this, this.blockPopped), $scope);
    api.engine.socket().subscribe('blockPushed', angular.bind(this, this.blockPushed), $scope);

    api.engine.socket().subscribe('ASK_ORDER_ADD*'+asset, angular.bind(this, this.orderAddUpdate), $scope);
    api.engine.socket().subscribe('ASK_ORDER_UPDATE*'+asset, angular.bind(this, this.orderAddUpdate), $scope);
    api.engine.socket().subscribe('ASK_ORDER_REMOVE*'+asset, angular.bind(this, this.orderRemove), $scope);

    api.engine.socket().subscribe('BID_ORDER_ADD*'+asset, angular.bind(this, this.orderAddUpdate), $scope);
    api.engine.socket().subscribe('BID_ORDER_UPDATE*'+asset, angular.bind(this, this.orderAddUpdate), $scope);
    api.engine.socket().subscribe('BID_ORDER_REMOVE*'+asset, angular.bind(this, this.orderRemove), $scope); 
  }
  angular.extend(MyOrdersProvider.prototype, IndexedEntityProvider.prototype, {

    /* @override */
    sortFunction: function (a, b) {
      if (b.confirmations < a.confirmations) { return 1; }
      else if (b.confirmations > a.confirmations) { return -1; }
      else {
        if (a.order < b.order) { return 1; }
        else if (a.order > b.order) { return -1; }
      }
      return 0;
    },

    /* @override */
    uniqueKey: function (order) { return order.order },    

    getData: function (firstIndex) {
      var deferred = $q.defer();
      var args = {
        asset:          this.asset,
        accounts:       this.accounts,
        firstIndex:     firstIndex,
        lastIndex:      firstIndex + this.pageSize
      }
      if (this.accounts && this.accounts.length) {
        this.api.engine.socket().getMyOpenOrders(args).then(deferred.resolve, deferred.reject);
      }
      else {
        deferred.resolve({});
      }
      return deferred.promise;
    },

    translate: function (order) {
      order.quantity = nxt.util.convertToQNTf(order.quantityQNT, this.decimals);
      order.price = nxt.util.calculateOrderPricePerWholeQNT(order.priceNQT, this.decimals);
      order.total = nxt.util.convertToNXT(nxt.util.calculateOrderTotalNQT(order.priceNQT, order.quantityQNT));
    },

    dataIterator: function (data) {
      var decimals = data.decimals, orders = data.orders || [];
      for (var i=0; i<orders.length; i++) {
        this.translate(orders[i]);
      }
      return new Iterator(orders);
    },

    getTypeColor: function (type) {
      return type == 'buy' ? 'green' : 'red';
    },

    /* @websocket */
    blockPopped: function (block) {
      if (this.delayedReload) {
        clearTimeout(this.delayedReload);
      }
      var self = this;
      this.delayedReload = setTimeout(function () { self.reload(); }, 1000);
    },

    /* @websocket */
    blockPushed: function (block) {
      var self = this;
      this.$scope.$evalAsync(function () {
        self.forEach(function (order) {
          order.confirmations = block.height - order.height;
        });
      });
    },

    /* @websocket */
    orderAddUpdate: function (order) {
      var self = this;
      this.$scope.$evalAsync(function () {
        self.translate(order);
        self.add(order);
      });
    },

    /* @websocket */
    orderRemove: function (order) {
      var self = this;
      this.$scope.$evalAsync(function () {
        self.remove(self.uniqueKey(order));
      });
    }
  });
  return MyOrdersProvider;
});
})();