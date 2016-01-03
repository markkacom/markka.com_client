(function () {
'use strict';
var module = angular.module('fim.base');
module.factory('AccountAssetProvider', function (nxt, $q, IndexedEntityProvider, $timeout) {

  function AccountAssetProvider(api, $scope, asset, decimals, account) {
    this.api = api
    this.$scope = $scope;
    this.asset = asset;
    this.decimals = decimals;
    this.account = account;

    this.quantityQNT = '0';
    this.unconfirmedQuantityQNT = '0';
    this.quantity = '0';
    this.unconfirmedQuantity = '0';
  }
  AccountAssetProvider.prototype = {

    reload: function () {
      var self = this;
      var deferred = $q.defer();
      this.$scope.$evalAsync(function () {
        self.isLoading = true;
        $timeout(function () {  self.getNetworkData().then(deferred.response, deferred.reject) }, 1, false);
      });
      return deferred.promise;
    },

    processData: function (response) {
      this.quantityQNT = response.quantityQNT||'0';
      this.unconfirmedQuantityQNT = response.unconfirmedQuantityQNT||'0';
      this.quantity = nxt.util.convertToQNTf(this.quantityQNT, this.decimals);
      this.unconfirmedQuantity = nxt.util.commaFormat(nxt.util.convertToQNTf(this.unconfirmedQuantityQNT, this.decimals));
    },

    getNetworkData: function () {
      var deferred = $q.defer(), self = this;
      this.api.engine.socket().callAPIFunction({ requestType:'getAccountAssets', asset: this.asset, account: this.account }).then(
        function (response) {
          self.$scope.$evalAsync(function () {
            self.isLoading = false;
            self.processData(response);
            deferred.resolve();
          });
        },
        function (response) {
          self.$scope.$evalAsync(function () {
            self.isLoading = false;
            self.processData({});
            deferred.resolve();
          });
        }
      );
      return deferred.promise;
    }
  };
  return AccountAssetProvider;
});
})();