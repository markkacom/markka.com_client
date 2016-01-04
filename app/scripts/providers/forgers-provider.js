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
module.factory('ForgersProvider', function (nxt, $timeout, $q) {
  function ForgersProvider(api, $scope) {
    this.api        = api;
    this.$scope     = $scope;
    this.isLoading  = false;
    this.forgers    = [];

    //this.setPeriod(nxt.util.convertToEpochTimestamp(Date.now()));
    this.setPeriod(0);

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