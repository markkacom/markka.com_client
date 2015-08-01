(function () {
'use strict';
var module = angular.module('fim.base');

module.factory('BalanceProvider', function (nxt, $q, $timeout) {
  function BalanceProvider(api, $scope, accounts) {
    this.api       = api;
    this.$scope    = $scope;
    this.accounts  = accounts;
    this.isLoading = true;
    this.balances  = [];
  }
  BalanceProvider.prototype = {
    reload: function () {
      var deferred = $q.defer();
      var self = this;
      this.$scope.$evalAsync(function () {
        self.balances.length = [];
        self.isLoading       = true;
        self.getNetworkData().then(deferred.resolve, deferred.reject);
      });
      return deferred.promise;
    },

    getNetworkData: function (timestamp) {
      var deferred = $q.defer();
      var self = this;
      var args = { accounts: this.accounts };
      this.api.engine.socket().getAccounts(args).then(
        function (data) {
          self.$scope.$evalAsync(function () {
            self.isLoading = false;
            var accounts = data.accounts || [];
            angular.forEach(accounts, function (balance) {
              balance.balanceNXT = nxt.util.convertToNXT(balance.balanceNQT);
              balance.unconfirmedBalanceNXT = nxt.util.convertToNXT(balance.unconfirmedBalanceNQT);
              balance.effectiveBalanceNXT = nxt.util.commaFormat(String(balance.effectiveBalanceNXT));
              balance.guaranteedBalanceNXT = nxt.util.convertToNXT(balance.guaranteedBalanceNQT);
              if (balance.forgedBalanceNQT != "0") {
                balance.forging = true;
                balance.forgedBalanceNXT = nxt.util.convertToNXT(balance.forgedBalanceNQT);
                balance.forgedBalanceTodayNXT = nxt.util.convertToNXT(balance.forgedBalanceTodayNQT);
                balance.forgedBalanceWeekNXT = nxt.util.convertToNXT(balance.forgedBalanceWeekNQT);
                balance.forgedBalanceMonthNXT = nxt.util.convertToNXT(balance.forgedBalanceMonthNQT);
                balance.date = nxt.util.formatTimestamp(balance.lastBlockTimestamp, true) || 'never';
              }
              self.balances.push(balance);
            });

            self.balances.sort(function (a,b) {
              a = parseFloat(a.forgedBalanceNQT), b = parseFloat(b.forgedBalanceNQT);
              return a - b;
            });

            deferred.resolve();
          });
        },
        function () {
          self.$scope.$evalAsync(function () {
            self.isLoading = false;
            deferred.reject();
          });
        }
      );
      return deferred.promise;
    }
  }
  return BalanceProvider;
});
})();