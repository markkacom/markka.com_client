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
module.factory('BlockStateProvider', function (nxt, $timeout, $interval) {

  function BlockStateProvider(api, $scope) {
    var self         = this;
    this.api         = api;
    this.$scope      = $scope;
    this.isLoading   = true;
    this.height      = null;
    this.seconds_ago = 0;
    this.interval    = null;

    api.engine.socket().subscribe('blockPopped', angular.bind(this, this.blockPopped), $scope);
    api.engine.socket().subscribe('blockPushed', angular.bind(this, this.blockPushed), $scope);

    $scope.$on('$destroy', function () {
      if (self.interval) {
        $interval.cancel(self.interval);
      }
    });
  }
  BlockStateProvider.prototype = {
    load: function () {
      var self = this;
      this.$scope.$evalAsync(function () {
        self.isLoading = true;
        $timeout(function () { self.getNetworkData(); }, 1, false);
      });
    },

    getNetworkData: function () {
      var self = this;
      this.api.engine.socket().getBlockchainState().then(
        function (data) {
          self.isLoading = false;
          self.blockPushed(data);
        },
        function (data) {
          self.$scope.$evalAsync(function () {
            self.isLoading = false;
          });
        }
      );
    },

    createDateUpdateInterval: function () {
      var self = this;
      return function () {
        self.seconds_ago = Math.round((Date.now() - self.as_date.getTime()) / 1000);
      }
    },

    blockPopped: function (block) {
      var self = this;
      this.$scope.$evalAsync(function () {
        self.height = block.height - 1;
        self.seconds_ago = 0;
      });
    },

    blockPushed: function (block) {
      var self = this;
      this.$scope.$evalAsync(function () {
        self.as_date = nxt.util.timestampToDate(block.timestamp);
        self.seconds_ago = 0;
        self.height = nxt.util.commaFormat(String(block.height));
        self.isLoading = false;
        $interval.cancel(self.interval);
        self.interval = $interval(self.createDateUpdateInterval(), 3000);
      });
    }
  }
  return BlockStateProvider;
});
})();