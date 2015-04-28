(function () {
'use strict';
var module = angular.module('fim.base');
module.factory('BlockStateProvider', function (nxt, requests, $timeout, $interval) {

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