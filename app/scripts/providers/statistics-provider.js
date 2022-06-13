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
module.factory('StatisticsProvider', function (nxt, $timeout) {

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
      this.average            = data.averageBlockTime24H;
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