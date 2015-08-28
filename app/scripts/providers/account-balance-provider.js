(function() {
  'use strict';
  var module = angular.module('fim.base');
  module.factory('AccountBalanceProvider', function(nxt, $q) {

    function AccountBalanceProvider(api, $scope, account) {
      this.account = account;
      this.api = api;
      this.$scope = $scope;
      this.isLoading = true;
      this.entities = [];
    }
    AccountBalanceProvider.prototype = {
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
          requestType: 'getBalance',
          account: this.account
        }
        this.api.engine.socket().callAPIFunction(args).then(function(data) {
            self.$scope.$evalAsync(function() {
              self.isLoading = false;
              var balanceInfo = data || [];
              self.entities.push(balanceInfo);
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
    return AccountBalanceProvider;
  });
})();