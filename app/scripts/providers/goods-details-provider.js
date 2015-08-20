(function() {
  'use strict';
  var module = angular.module('fim.base');
  module.factory('GoodsDetailsProvider', function(nxt, $q, IndexedEntityProvider) {

    function GoodsDetailsProvider(api, $scope, paramSection) {
      this.init(api, $scope, paramSection);
      this.paramSection = paramSection;
    }
    angular.extend(GoodsDetailsProvider.prototype, IndexedEntityProvider.prototype, {

      uniqueKey: function(good) {
        return good.goods;
      },
      sortFunction: function(a, b) {
        return a.index - b.index;
      },

      getData: function() {
        var deferred = $q.defer();
        var args = {
          requestType: 'getDGSGood',
          goods: this.paramSection
        }
        this.api.engine.socket().callAPIFunction(args).then(deferred.resolve, deferred.reject);
        return deferred.promise;
      },

      dataIterator: function(data) {
        console.log(data);
        var goods = data;
        var index = this.entities.length > 0 ? this.entities[this.entities.length - 1].index : 0;
        return new Iterator([goods]);
      }
    });
    return GoodsDetailsProvider;
  });
})();