(function() {
  'use strict';
  var module = angular.module('fim.base');
  module.factory('DeliveryConfirmedGoodsProvider', function(nxt, $q, IndexedEntityProvider) {

    function DeliveryConfirmedGoodsProvider(api, $scope, account) {
      this.init(api, $scope, account);
      this.account = account;
    }
    angular.extend(DeliveryConfirmedGoodsProvider.prototype, IndexedEntityProvider.prototype, {

      uniqueKey: function(good) {
        return good.purchase;
      },
      sortFunction: function(a, b) {
        return a.index - b.index;
      },

      getData: function() {
        var deferred = $q.defer();
        var args = {
          includeCounts: true,
          requestType: 'getDGSPurchases',
          seller: this.account,
          completed: true
        }
        this.api.engine.socket().callAPIFunction(args).then(deferred.resolve, deferred.reject);
        return deferred.promise;
      },

      dataIterator: function(data) {
        var goods = data.purchases;
        var index = this.entities.length > 0 ? this.entities[this.entities.length - 1].index : 0;
        for (var i = 0; i < goods.length; i++) {
          var a = goods[i];
          a.priceFIMK = nxt.util.convertNQT(a.priceNQT);
        }
        return new Iterator(goods);
      }
    });
    return DeliveryConfirmedGoodsProvider;
  });
})();
  });
})();