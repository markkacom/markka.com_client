(function() {
  'use strict';
  var module = angular.module('fim.base');
  module.factory('PastGoodsProvider', function(nxt, $q, IndexedEntityProvider) {

    function PastGoodsProvider(api, $scope, pageSize, account) {
      this.init(api, $scope, pageSize, account);
      this.account = account;
    }
    angular.extend(PastGoodsProvider.prototype, IndexedEntityProvider.prototype, {

      uniqueKey: function(good) {
        return good.goods;
      },
      sortFunction: function(a, b) {
        return a.index - b.index;
      },

      getData: function(firstIndex) {
        var deferred = $q.defer();
        var args = {
          firstIndex: firstIndex,
          lastIndex: firstIndex + this.pageSize,
          includeCounts: true,
          requestType: 'getDGSPurchases',
          seller: this.account
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
    return PastGoodsProvider;
  });
})();