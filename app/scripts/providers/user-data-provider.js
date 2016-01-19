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
module.factory('UserDataProvider', function (nxt, $q, $rootScope, UserService) {
  function UserDataProvider($scope) {
    this.api                 = null;
    this.$scope              = $scope;
    this.isLoading           = false;
    this.account             = null;
    this.name                = null;
    this.label               = null;
    this.html                = '';

    var unreg_open  = $rootScope.$on('onOpenCurrentAccount', this.onOpenCurrentAccount.bind(this));
    var unreg_close = $rootScope.$on('onCloseCurrentAccount', this.onCloseCurrentAccount.bind(this));

    $scope.$on('$destroy', unreg_open);
    $scope.$on('$destroy', unreg_close);

    if ($rootScope.currentAccount) {
      this.onOpenCurrentAccount(null, $rootScope.currentAccount);
    }

    var self = this;
    this.lazy_reload = function () {
      self.reload();
    }.debounce(500);
  }
  UserDataProvider.prototype = {
    subscr: [],

    onOpenCurrentAccount: function (e, currentAccount) {
      this.account    = currentAccount.id_rs;
      this.api        = nxt.get(this.account);

      var account_id  = nxt.util.convertRSAddress(this.account);
      this.topic      = 'addedUnConfirmedTransactions-'+account_id;
      this.handler    = angular.bind(this, this.addedUnConfirmedTransactions);
      var socket      = this.api.engine.socket();
      socket.subscribe(this.topic, this.handler, this.$scope);

      this.reload();
    },

    onCloseCurrentAccount: function (e, currentAccount) {
      var socket      = this.api.engine.socket();
      socket.unsubscribe(this.topic, this.handler);

      this.account = null;
      this.api     = null;
    },

    reload: function () {
      var deferred = $q.defer();
      this.$scope.$evalAsync(function () {
        this.balanceNXT          = '0';
        this.balanceNXTWhole     = '0';
        this.balanceNXTRemainder = '0';
        if (this.account) {
          this.isLoading = true;
          this.getNetworkData().then(deferred.resolve, deferred.reject);
        }
      }.bind(this));
      return deferred.promise;
    },

    getNetworkData: function (timestamp) {
      var deferred = $q.defer();
      var args = {
        includeLessors: 'false',
        includeAssets: 'false',
        includeCurrencies: 'false',
        includeEffectiveBalance: 'false',
        account: this.account,
        requestType: 'getAccount'
      };
      this.api.engine.socket().callAPIFunction(args).then(
        function (a) {
          this.$scope.$evalAsync(function () {
            this.isLoading  = false;
            this.balanceNXT = nxt.util.convertToNXT(a.unconfirmedBalanceNQT);
            var account     = UserService.currentAccount;

            account.name = a.accountName;
            account.description = a.description;
            account.balance = nxt.util.convertToNXT(a.unconfirmedBalanceNQT);
            if (a.accountColorName) {
              account.balance += ' '+a.accountColorName;
              account.symbol = a.accountColorName;
              account.accountColorId = a.accountColorId;
            }
            else {
              account.balance += ' '+this.api.engine.symbol;
              account.symbol = this.api.engine.symbol;
              account.accountColorId = '0';
            }
            account.label = a.accountName || a.accountRS;

            deferred.resolve();
          }.bind(this));
        }.bind(this),
        function () {
          this.$scope.$evalAsync(function () {
            this.isLoading = false;
            deferred.reject();
          }.bind(this));
        }.bind(this)
      );
      return deferred.promise;
    },

    /* @websocket */
    addedUnConfirmedTransactions: function (transactions) {
      this.lazy_reload();
    }
  }
  return UserDataProvider;
});
})();