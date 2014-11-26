(function () {
'use strict';
var module = angular.module('fim.base');
module.controller('ExchangePluginChartController', function($scope, nxt) {

  function generateChartData() {
    var chartData = [];
    var trade, date, decimals=$scope.selectedAsset.decimals, trades = $scope.trades.slice(0);
    trades.reverse();
    for (var i=0,l=trades.length; i<l; i++) {
      trade = trades[i];
      date = nxt.util.timestampToDate(trade.timestamp);

      chartData.push({
        timestamp: trade.timestamp,
        date: date,
        value: parseFloat(nxt.util.calculateOrderPricePerWholeQNT(trade.priceNQT, decimals)),
        volume: parseFloat(nxt.util.convertToQNTf(trade.quantityQNT, decimals))
      });
    }
    // console.log('chartData', chartData);s
    return chartData;
  }

  function createStockChart(chartData) {
    var symbol = $scope.selectedAsset ? $scope.selectedAsset.engine.toUpperCase() : '';
    var chart = AmCharts.makeChart("chartdiv", {
      type: "stock",
      theme: "none",
      pathToImages: "http://www.amcharts.com/lib/3/images/",

      categoryAxesSettings: {
        minPeriod: "mm",
        equalSpacing: true
      },

      dataSets: [{
        color: "#b0de09",
        fieldMappings: [{
          fromField: "value",
          toField: "value"
        }, {
          fromField: "volume",
          toField: "volume"
        }],

        dataProvider: chartData,
        categoryField: "date"
      }],

      panels: [{
        showCategoryAxis: false,
        title: "Value",
        percentHeight: 60,
        stockGraphs: [{
          id: "g1",
          valueField: "value",
          type: "line",
          lineThickness: 2,
          bullet: "round"
        }],
        stockLegend: {
          valueTextRegular: " ",
          markerType: "none"
        }
      }, {
        title: "Volume",
        percentHeight: 40,
        stockGraphs: [{
          valueField: "volume",
          type: "column",
          cornerRadiusTop: 2,
          fillAlphas: 1
        }],
        stockLegend: {
          valueTextRegular: " ",
          markerType: "none"
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
    return chart;
  }

  var chart = null;
  var unwatch_selectedAsset = $scope.$watch('selectedAsset', rebuildChart);
  var unwatch_trades = $scope.$watch('trades', rebuildChart);

  function rebuildChart() {
    if ($scope.selectedAsset && $scope.trades) {
      if (chart) {
        chart.dataSets[0].dataProvider = generateChartData();
        chart.validateData();
        chart.invalidateSize();
        chart.zoomOut();        
      }
      else {
        chart = createStockChart(generateChartData());
        chart.zoomOut();
      }
    }
  }  

  $scope.$on('destroy', function () {
    unwatch_selectedAsset();
    unwatch_trades();
  });

});
})();