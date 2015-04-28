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

  function ChartsProvider(api, asset, $scope) {
    this.api       = api;
    this.asset     = asset;
    this.$scope    = $scope;
    this.isLoading = true;
    this.chartdata = [];
    this.chart     = null;
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

    getNetworkData: function () {
      var self = this;
      this.api.engine.socket().getAssetChartData({ asset: this.asset, window: HOUR }).then(
        function (data) {
          self.$scope.$evalAsync(function () {
            self.isLoading = false;
            var decimals = data.asset.decimals;
            for (var i=0, d; i<data.data.length; i++) {
              d       = data.data[i];
              d.date  = nxt.util.timestampToDate(d.timestamp);
              d.open  = parseFloat(nxt.util.calculateOrderPricePerWholeQNT(d.open, decimals));
              d.close = parseFloat(nxt.util.calculateOrderPricePerWholeQNT(d.close, decimals));
              d.high  = parseFloat(nxt.util.calculateOrderPricePerWholeQNT(d.high, decimals));
              d.low    = parseFloat(nxt.util.calculateOrderPricePerWholeQNT(d.low, decimals));
              d.volume = parseFloat(nxt.util.convertToQNTf(d.vol, decimals));
              d.value  = d.open;
              self.chartdata.push(d);
            }

            self.chartdata.sort(function (a, b) { return a.timestamp - b.timestamp });

            if (self.chart == null) {
              self.buildChart().then(function (chart) {
                self.chart = chart;
                $timeout(function () {
                  self.chart.invalidateSize();
                  self.chart.zoomOut();
                }, 50, false);
              });              
            }
            else {
              self.chart.dataSets[0].dataProvider = self.chartdata;
              self.chart.validateData();
              $timeout(function () {
                self.chart.invalidateSize();
                self.chart.zoomOut();
              }, 50, false);              
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

    buildChart: function () {
      var deferred = $q.defer();
      var self = this;
      $timeout(function () {
        var colors = getBootstrapColors();
        $timeout(function () {
          deferred.resolve(self._buildChart(colors));
        });
      }, 1, false);
      return deferred.promise;
    },

    _buildChart: function (colors) {
      return AmCharts.makeChart("chartdiv", {
        type: "stock",
        theme: "none",
        pathToImages: "/images/",
          
        categoryAxesSettings: {
          minPeriod: "mm",
          equalSpacing: true
        },

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
          position: "top",
          dateFormat: "YYYY-MM-DD JJ:NN",
          inputFieldWidth: 150,
          inputFieldsEnabled:false,
          periods: [{
            period: "hh",
            count: 1,
            label: "1 hour",
            selected: true
          }, {
            period: "DD",
            count: 1,
            label: "1 day"
          }, {
            period: "DD",
            count: 7,
            label: "1 week"
          }, {
            period: "MM",
            count: 1,
            label: "1 month"
          }, {
            period: "MAX",
            label: "MAX"
          }]
        },

        panelsSettings: {
          usePrefixes: true
        }
      });
    }
  }
  return ChartsProvider
});
})();