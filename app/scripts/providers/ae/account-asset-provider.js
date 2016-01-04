/**
 * The MIT License (MIT)
 * Copyright (c) 2016 Krypto Fin ry and the FIMK Developers
 *
 * Permission is hereby granted, free of charge, to any person obtaining a copy of
 * this software and associated documentation files (the "Software"), to deal in
 * the Software without restriction, including without limitation the rights to
 * use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of
 * the Software, and to permit persons to whom the Software is furnished to do so,
 * subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be included in all
 * copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
 * SOFTWARE.
 * */
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