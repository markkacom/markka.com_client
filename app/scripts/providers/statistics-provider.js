(function () {
'use strict';
var module = angular.module('fim.base');
module.factory('StatisticsProvider', function (nxt, requests, $timeout) {

  function StatisticsProvider(api, $scope) {
    this.api                    = api;
    this.$scope                 = $scope;
    this.isLoading              = true;
    this.lastBlockDate          = null;
    this.lastBlockHeight        = null;
    this.lastBlockID            = null;
    this.average                = null;
    this.transactionCountToday  = null;
    this.transactionCountWeek   = null;
    this.transactionCountMonth  = null;
    this.rewardsToday           = null;
    this.rewardsWeek            = null;
    this.rewardsMonth           = null;
  }
  StatisticsProvider.prototype = {
    load: function () {
      var self = this;
      this.$scope.$evalAsync(function () {
        self.isLoading = true;
        $timeout(function () { self.getNetworkData(); }, 1, false);  
      });
    },

    getNetworkData: function () {
      var self = this;
      this.api.engine.socket().getActivityStatistics().then(
        function (data) {
          self.$scope.$evalAsync(function () {
            self.processMofoGetActivityStatistics(data);
            self.isLoading = false;
          });
        },
        function (data) {
          self.$scope.$evalAsync(function () {
            self.isLoading = false;
          });
        }
      );
    },

    processMofoGetActivityStatistics: function (data) {
      this.lastBlockDate      = nxt.util.formatTimestamp(data.lastBlock.timestamp);
      this.lastBlockHeight    = data.lastBlock.height;
      this.lastBlockID        = data.lastBlock.block;
      this.average            = data.averageBlockTime24H,
      this.transactionCountToday  = data.transactionCountToday;
      this.transactionCountWeek   = data.transactionCountWeek;
      this.transactionCountMonth  = data.transactionCountMonth;
      this.rewardsToday       = nxt.util.convertToNXT(data.rewardsToday);
      this.rewardsWeek        = nxt.util.convertToNXT(data.rewardsWeek);
      this.rewardsMonth       = nxt.util.convertToNXT(data.rewardsMonth);
    }
  }
  return StatisticsProvider;
});
})();