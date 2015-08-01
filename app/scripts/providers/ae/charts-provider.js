(function () {
'use strict';
var module = angular.module('fim.base');
module.factory('ChartsProvider', function (nxt, $q, $timeout) {

  function getCSS(clazz, property) {
    var p = document.createElement("span");
    p.setAttribute("class", clazz);
    p.setAttribute("style", "display:none");
    document.body.appendChild(p);
    var prop = window.getComputedStyle(p).getPropertyValue(property);
    p.parentNode.removeChild(p);
    // var p = $("<span class='"+clazz+"'></span>").hide().appendTo("body");
    // var prop = p.css(property);
    // p.remove();
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

  function ChartsProvider(api, $scope, asset, decimals) {
    this.api       = api;
    this.asset     = asset;
    this.decimals  = decimals;
    this.$scope    = $scope;
    this.isLoading = true;
    this.chartdata = [];
    this.chart     = null;

    api.engine.socket().subscribe('blockPopped', angular.bind(this, this.blockPopped), $scope);
    api.engine.socket().subscribe('VIRTUAL_TRADE*'+asset, angular.bind(this, this.virtualTrade), $scope);
  }
  ChartsProvider.prototype = {
    reload: function () {
      var self = this;
      this.$scope.$evalAsync(function () {
        self.chartdata.length = 0;
        self.isLoading        = true;
        self.chart            = null;
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
              self.chartdata.push(d);
            }

            self.chartdata.sort(function (a, b) { return a.timestamp - b.timestamp });

            if (self.chart == null) {
              self.buildChart().then(function (chart) {
                self.chart = chart;
                self.layout();
              });              
            }
            else {
              self.chart.dataSets[0].dataProvider = self.chartdata;
              self.chart.validateData();
              self.layout();              
            }
            //console.log('chartdata', data);
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
    blockPopped: function (block) {
      if (this.delayedReload) {
        clearTimeout(this.delayedReload);
      }
      var self = this;
      this.delayedReload = setTimeout(function () { self.reload(); }, 1000);
    },

    /* @websocket */
    virtualTrade: function (trade) {
      this.blockPopped();
      // for (var i=0; i<this.chartdata.length; i++) {
      //   if (this.chartdata[i].timestamp == trade.timestamp) {
      //     return;
      //   }
      // }
      // var d = {
      //   open: trade.priceNQT,
      //   vol: trade.quantityQNT,
      //   date: nxt.util.timestampToDate(trade.timestamp)
      // };
      // this.translate(d);
      // this.chartdata.push(d);
      // this.chartdata.sort(function (a, b) { return a.timestamp - b.timestamp });
      // if (this.delayedLayout) {
      //   clearTimeout(this.delayedLayout);
      // }
      // var self = this;
      // this.delayedLayout = setTimeout(function () {
      //   self.chart.validateData();
      //   self.chart.invalidateSize();
      //   self.chart.zoomOut();
      // }, 50);
    },

    layout: function () {
      var self = this;
      $timeout(function () {
        self.chart.invalidateSize();
        self.chart.periodSelector.setDefaultPeriod();
        //self.chart.zoomOut();
        //self.chart.zoom(new Date(Date.now() - ONE_DAY_MS), new Date(Date.now()));
      }, 50, false);
    },

    buildChart: function () {
      var deferred = $q.defer();
      var self = this;
      $timeout(function () {
        var colors = getBootstrapColors();
        $timeout(function () {
          deferred.resolve(self._buildChart(colors));
        }, 200);
      }, 1, false);
      return deferred.promise;
    },

    _buildChart: function (colors) {
      var stockChart = AmCharts.makeChart("chartdiv", {
        type: "stock",
        theme: "none",
        pathToImages: "/images/",
          
        categoryAxesSettings: {
          minPeriod: "15ss",
          equalSpacing: true,
          maxSeries: 1000
        },

        extendToFullPeriod: false,

        dataSets: [{
          lineColor: colors.lineColor,
          gridColor: colors.color,
          //color: colors.color,

          fieldMappings: [
            { fromField: "value", toField: "value" }, 
            { fromField: "volume", toField: "volume" }, 
            { fromField: "open", toField: "open" }, 
            { fromField: "low", toField: "low" }, 
            { fromField: "close", toField: "close" }, 
            { fromField: "high", toField: "high" }
          ],

          dataProvider: this.chartdata,
          categoryField: "date"
        }],

        panels: [{
          showCategoryAxis: false,
          title: "Value",
          percentHeight: 60,
          lineColor: colors.lineColor,  
          color: colors.color,
          stockGraphs: [{
            id: "g1",
            valueField: "value",
            type: "line",
            lineThickness: 2,
            bullet: "round",
            lineColor: colors.lineColor,  
            color: colors.color
          }],
          stockLegend: {
            valueTextRegular: " ",
            markerType: "none",
            lineColor: colors.lineColor,
            color: colors.color
          }
        }, {
          title: "Volume",
          percentHeight: 40,
          lineColor: colors.lineColor,  
          color: colors.color,
          stockGraphs: [{
            valueField: "volume",
            type: "column",
            cornerRadiusTop: 2,
            fillAlphas: 1,
            lineColor: colors.lineColor,
            color: colors.color            
          }],
          stockLegend: {
            valueTextRegular: " ",
            markerType: "none",
            lineColor: colors.lineColor,
            color: colors.color            
          }
        }],

        chartScrollbarSettings: {
          graph: "g1",
          usePeriod: "10mm",
          position: "bottom"
        },

        chartCursorSettings: {
          valueBalloonsEnabled: true
        },

        periodSelector: {
          position: "bottom",
          dateFormat: "YYYY-MM-DD",
          inputFieldWidth: 50,
          inputFieldsEnabled:false,
          periods: [{
            period: "hh",
            label: "1 hour",
            count: 1,
            selected: true
          }, {
            period: "DD",
            label: "1 day",
            count: 1,
            selected: false
          }, {
            period: "DD",
            label: "1 week",
            count: 7,
            selected: false
          }, {
            period: "MM",
            count: 1,
            label: "1 month",
            selected: false
          }, {
            period: "MAX",
            label: "MAX"
          }]
        },

        panelsSettings: {
          usePrefixes: true
        }
      });
      return stockChart;
    }
  }
  return ChartsProvider
});
})();