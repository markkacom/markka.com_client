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
      this.reload();
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