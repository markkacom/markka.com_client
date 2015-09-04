(function () {
'use strict';
var module = angular.module('fim.base');
module.factory('UserDataProvider', function (nxt, $q, $rootScope, $timeout) {
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
      this.api.engine.socket().getAccount({ account: this.account }).then(
        function (data) {
          this.$scope.$evalAsync(function () {
            this.isLoading  = false;
            this.updateBalance(data.unconfirmedBalanceNQT);
            this.name       = data.accountName;
            this.label      = this.name || this.account;
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

    updateBalance: function (valueNQT) {
      var balanceNXT = nxt.util.convertToNXT(valueNQT);
      var parts      = (balanceNXT||"").split('.');
      this.html      = '<b>'+parts[0]+'</b>'+(parts[1]?'<small><b>.</b>'+parts[1]+'</small>':'');
    },

    /* @websocket */
    addedUnConfirmedTransactions: function (transactions) {
      if (this.timeout) {
        $timeout.cancel(this.timeout);
      }
      this.timeout = $timeout(function () {
        this.timeout = null;
        this.reload();
      }.bind(this), 500, false);
    }
  }
  return UserDataProvider;
});
})();