(function() {
  'use strict';
  var module = angular.module('fim.base');
  module.factory('GoodsDetailsProvider', function(nxt, $q) {

    function GoodsDetailsProvider(api, $scope, goods) {
      this.api = api;
      this.$scope = $scope;
      this.isLoading = true;
      this.goods = goods;
      this.data = {};
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
          goods: this.goods
        }
        this.api.engine.socket().callAPIFunction(args).then(
          function(data) {
            self.$scope.$evalAsync(function() {
              self.isLoading = false;
              data.priceNXT = nxt.util.convertNQT(data.priceNQT);
              angular.extend(self, data);
              angular.extend(self.data, data);
              if (data.tags) {
                var tags = data.tags.split(',');
                self.tagsHTML = '';
                for (var j=0; j<tags.length; j++) {
                  if (j>0) {
                    self.tagsHTML += ',';
                  }
                  self.tagsHTML += '<a href="#/goods/'+self.api.engine.symbol_lower+'/tags/'+tags[j]+'">'+tags[j]+'</a>';
                }
              }
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