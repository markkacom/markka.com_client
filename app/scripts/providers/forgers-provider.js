(function () {
'use strict';
var module = angular.module('fim.base');
module.factory('ForgersProvider', function (nxt, requests, $timeout, $q) {
  function ForgersProvider(api, $scope) {
    this.api        = api;
    this.$scope     = $scope;
    this.isLoading  = false;
    this.forgers    = [];
    
    this.setPeriod(nxt.util.convertToEpochTimestamp(Date.now()));

    if ($scope) {
      var self = this;
      $scope.$on('$destroy', function () {

      })
    }
  }
  ForgersProvider.prototype = {
    reload: function () {
      var self = this;
      this.$scope.$evalAsync(function () {
        self.getNetworkData();
      });  
    },

    setPeriod: function (timestamp) {
      this.timestamp = timestamp;
      this.reload();
    },

    getNetworkData: function () {
      var self = this;
      var args = { timestamp: this.timestamp };

      this.api.engine.socket().getForgingStats(args).then(
        function (data) {
          self.$scope.$evalAsync(function () {
            self.isLoading = false;
            self.forgers = data.forgers;
            angular.forEach(data.forgers, function (forger) {
              forger.totalFeeNXT = nxt.util.convertToNXT(forger.feeNQT);
            });
            self.forgers.sort(function (a,b) { return b.count - a.count });
          });
        },
        function (data) {
          self.$scope.$evalAsync(function () {
            self.isLoading = false;
          });
        }
      );
    }
  }
  return ForgersProvider;
});
})();