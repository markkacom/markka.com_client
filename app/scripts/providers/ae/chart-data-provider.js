(function () {
'use strict';
var module = angular.module('fim.base');
module.factory('ChartDataProvider', function (nxt, $q, $timeout) {

  function getCSS(clazz, property) {
    var p = document.createElement("span");
    p.setAttribute("class", clazz);
    p.setAttribute("style", "display:none");
    document.body.appendChild(p);
    var prop = window.getComputedStyle(p).getPropertyValue(property);
    p.parentNode.removeChild(p);
    return prop;
  }

  var bs_colors = null;
  function getBootstrapColors() {
    if (!bs_colors) {
      bs_colors = {
        color: getCSS('', 'color'),
        backgroundColor: getCSS('', 'background-color'),
        lineColor: getCSS('btn btn-primary', 'background-color')
      };
    }
    return bs_colors;
  }

  var FIVTEEN_MINUTES = 0;
  var HOUR = 1;
  var DAY = 2;
  var WEEK = 3;

  function unformat(number) {
    return String(number).replace(/,/g,'');
  }

  function ChartDataProvider(api, $scope, asset, decimals) {
    this.api       = api;
    this.asset     = asset;
    this.decimals  = decimals;
    this.$scope    = $scope;
    this.window    = HOUR;
    this.isLoading = true;
    this.data      = [];

    api.engine.socket().subscribe('blockPushed', angular.bind(this, this.blockPushed), $scope);

    // api.engine.socket().subscribe('blockPopped', angular.bind(this, this.blockPopped), $scope);
    // api.engine.socket().subscribe('VIRTUAL_TRADE*'+asset, angular.bind(this, this.virtualTrade), $scope);
  }
  ChartDataProvider.prototype = {
    reload: function () {
      var self = this;
      this.$scope.$evalAsync(function () {
        //self.data        = [];
        self.isLoading   = true;
        self.chart       = null;
        $timeout(function () { self.getNetworkData(); }, 1, false);
      });
    },

    setWindow: function (_window) {
      this.window = _window;
      this.reload();
    },

    translate: function (d) {
      var timestamp = d[0], avg = d[1], low = d[2], high = d[3], vol = d[4], open = d[5], close = d[6];

      d.timestamp = timestamp;
      d.date  = nxt.util.timestampToDate(timestamp);
      d.open  = parseFloat(unformat(nxt.util.calculateOrderPricePerWholeQNT(open, this.decimals)));
      d.close = parseFloat(unformat(nxt.util.calculateOrderPricePerWholeQNT(close, this.decimals)));
      d.high  = parseFloat(unformat(nxt.util.calculateOrderPricePerWholeQNT(high, this.decimals)));
      d.low    = parseFloat(unformat(nxt.util.calculateOrderPricePerWholeQNT(low, this.decimals)));
      d.volume = parseFloat(unformat(nxt.util.convertToQNTf(vol, this.decimals)));
      d.value  = parseFloat(unformat(nxt.util.calculateOrderPricePerWholeQNT(avg, this.decimals)));
    },

    getNetworkData: function () {
      var self = this;
      this.api.engine.socket().getAssetChartData({ asset: this.asset, window: this.window }).then(
        function (data) {
          self.data = [];
          self.$scope.$evalAsync(function () {
            self.isLoading = false;
            if (!data.asset) return;
            var d;
            for (var i=0, d; i<data.data.length; i++) {
              d = data.data[i];
              self.translate(d);
              self.data.push(d);
            }
            self.data.sort(function (a, b) { return a.timestamp - b.timestamp });
          });
        },
        function (data) {
          self.$scope.$evalAsync(function () {
            self.isLoading = false;
          });
        }
      );
    },

    /* @websocket */
    blockPushed: function (block) {
      this.reload();
    }    
  }
  return ChartDataProvider
});
})();