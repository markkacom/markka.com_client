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

  var HOUR = 1;
  var DAY = 2;
  var WEEK = 3;

  var ONE_DAY_MS = 1000*60*60*24;
  var ONE_WEEK_MS = ONE_DAY_MS*7;

  function ChartDataProvider(api, $scope, asset, decimals) {
    this.api       = api;
    this.asset     = asset;
    this.decimals  = decimals;
    this.$scope    = $scope;
    this.isLoading = true;
    this.data      = [];

    // api.engine.socket().subscribe('blockPopped', angular.bind(this, this.blockPopped), $scope);
    // api.engine.socket().subscribe('VIRTUAL_TRADE*'+asset, angular.bind(this, this.virtualTrade), $scope);
  }
  ChartDataProvider.prototype = {
    reload: function () {
      var self = this;
      this.$scope.$evalAsync(function () {
        self.data        = [];
        self.isLoading   = true;
        self.chart       = null;
        $timeout(function () { self.getNetworkData(); }, 1, false);        
      });
    },

    translate: function (d) {
      d.date  = nxt.util.timestampToDate(d.timestamp);
      d.open  = parseFloat(nxt.util.calculateOrderPricePerWholeQNT(d.open, this.decimals));
      d.close = parseFloat(nxt.util.calculateOrderPricePerWholeQNT(d.close, this.decimals));
      d.high  = parseFloat(nxt.util.calculateOrderPricePerWholeQNT(d.high, this.decimals));
      d.low    = parseFloat(nxt.util.calculateOrderPricePerWholeQNT(d.low, this.decimals));
      d.volume = parseFloat(nxt.util.convertToQNTf(d.vol, this.decimals));
      d.value  = d.open;
    },

    getNetworkData: function () {
      var self = this;
      this.api.engine.socket().getAssetChartData({ asset: this.asset, window: HOUR }).then(
        function (data) {
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
    }
  }
  return ChartDataProvider
});
})();