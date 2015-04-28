(function () {
'use strict';
var module = angular.module('fim.base');
module.factory('AccountLessorsProvider', function (nxt, $q, $timeout) {
  
  function AccountLessorsProvider(api, $scope, account) {
    this.api        = api;
    this.$scope     = $scope;
    this.account    = account;

    this.isLoading  = false;
    this.entities   = [];
  }
  AccountLessorsProvider.prototype = {
    reload: function () {
      var self = this;
      this.$scope.$evalAsync(function () {
        self.isLoading        = true;
        $timeout(function () {  self.getNetworkData(); }, 1, false);        
      });
    },

    getNetworkData: function () {
      var self = this, args = { account: this.account };
      this.api.engine.socket().getAccountLessors(args).then(
        function (data) {
          self.isLoading = false;
          self.entities.length = 0;
          self.$scope.$evalAsync(function () {
            for (var i=0; i<data.lessors.length; i++) {
              var lessor = data.lessors[i];
              lessor.guaranteedBalanceNXT = nxt.util.convertToNXT(lessor.guaranteedBalanceNQT);
              self.entities.push(lessor);
            }
          });
        },
        function (data) {
          self.$scope.$evalAsync(function () {
            self.isLoading = false;
          });
        }
      );
    }
  };
  return AccountLessorsProvider;
});
})();