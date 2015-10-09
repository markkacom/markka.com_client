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

      translate: function (data) {

        /* parse the description field as JSON */
        try {
          var json = JSON.parse(data.description);
          if (typeof json.description == 'string') {
            data.description = json.description.trim();
          }
          if (typeof json.image == 'string') {
            data.image = json.image.trim();
          }
          if (typeof json.callback == 'string') {
            data.callback = json.callback.trim();
          }
        } catch (e) { /* ignore */ }


        data.priceNXT = nxt.util.convertNQT(data.priceNQT);
        angular.extend(this, data);
        angular.extend(this.data, data);
        if (data.tags) {
          var tags = data.tags.split(',');
          this.tagsHTML = '';
          for (var j=0; j<tags.length; j++) {
            if (j>0) {
              this.tagsHTML += ',';
            }
            this.tagsHTML += '<a href="#/goods/'+this.api.engine.symbol_lower+'/tags/'+tags[j]+'">'+tags[j]+'</a>';
          }
        }
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
              self.translate(data);
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