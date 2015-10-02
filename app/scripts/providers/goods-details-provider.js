(function() {
  'use strict';
  var module = angular.module('fim.base');
  module.factory('GoodsDetailsProvider', function(nxt, $q) {

    function GoodsDetailsProvider(api, $scope, paramSection) {
      this.paramSection = paramSection;
      this.api = api;
      this.$scope = $scope;
      this.isLoading = true;
      this.entities = [];
    }
    GoodsDetailsProvider.prototype = {
      reload: function() {
        var deferred = $q.defer();
        var self = this;
        this.$scope.$evalAsync(function() {
          self.isLoading = true;
          self.getData().then(deferred.resolve, deferred.reject);
        });
        return deferred.promise;
      },

      getData: function() {
        var deferred = $q.defer();
        var self = this;
        var args = {
          requestType: 'getDGSGood',
          goods: this.paramSection
        }
        this.api.engine.socket().callAPIFunction(args).then(function(data) {
            self.$scope.$evalAsync(function() {
              self.isLoading = false;
              var goodsDetails = data || [];
              goodsDetails.priceFIMK = nxt.util.convertNQT(data.priceNQT);
              self.entities.push(goodsDetails);
              deferred.resolve();
            });
          },
          function() {
            self.$scope.$evalAsync(function() {
              self.isLoading = false;
              deferred.reject();
            });
          }
        );
        return deferred.promise;
      }
    };
    return GoodsDetailsProvider;
  });
})();