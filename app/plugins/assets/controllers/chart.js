(function () {
'use strict';
var module = angular.module('fim.base');
module.controller('ExchangePluginChartController', function($scope, nxt) {

// // MOVING AVERAGE PLUGIN FOR JAVASCRIPT STOCK CHARTS FROM AMCHARTS //
// AmCharts.averageGraphs = 0;
// AmCharts.addMovingAverage = function (dataSet, panel, field) {
//     // update dataset
//     var avgField = "avg"+AmCharts.averageGraphs;
//     dataSet.fieldMappings.push({
//         fromField: avgField,
//         toField: avgField});
    
//     // calculate moving average
//     var fc = 0;
//     var sum = 0;
//     for (var i = 0; i < dataSet.dataProvider.length; i++) {
//         var dp = dataSet.dataProvider[i];
//         if (dp[field] !== undefined) {
//             sum += dp[field];
//             fc++;
//             dp[avgField] = Math.round(sum / fc * 10) / 10;
//         }
//     }
    
//     // create a graph
//     var graph = new AmCharts.StockGraph();
//     graph.valueField = avgField;
//     panel.addStockGraph(graph);
    
//     // increment average graph count
//     AmCharts.averageGraphs++;
    
//     // return newly created StockGraph object
//     return graph;
// }

var chartData = [];

function generateChartData() {
  // var firstDate = new Date();
  // firstDate.setDate(firstDate.getDate() - 500);
  // firstDate.setHours(0, 0, 0, 0);

  // for (var i = 0; i < 500; i++) {
  //   var newDate = new Date(firstDate);
  //   newDate.setDate(newDate.getDate() + i);

  //   var a = Math.round(Math.random() * (40 + i)) + 100 + i;
  //   var b = Math.round(Math.random() * (1000 + i)) + 500 + i * 2;

  //   chartData.push({
  //     date: newDate,
  //     value: a,
  //     volume: b
  //   });
  // }

  var trade, date, decimals=$scope.selectedAsset.decimals;
  for (var i=0,l=$scope.trades.length; i<l; i++) {
    trade = $scope.trades[i];
    date = nxt.util.timestampToDate(trade.timestamp);
    //console.log('Date', date.now());

    chartData.push({
      date: date,
      value: parseFloat(nxt.util.calculateOrderPricePerWholeQNT(trade.priceNQT, decimals)),
      volume: parseFloat(nxt.util.convertToQNTf(trade.quantityQNT, decimals))
    });
  }
}

function createStockChart() {
    var chart = new AmCharts.AmStockChart();
    chart.pathToImages = "http://www.amcharts.com/lib/images/";

    // DATASETS //////////////////////////////////////////
    // create data sets first
    var dataSet = new AmCharts.DataSet();
    dataSet.title = "Data set";
    dataSet.fieldMappings = [{
        fromField: "value",
        toField: "value"},
    {
        fromField: "volume",
        toField: "volume"}];
    dataSet.dataProvider = chartData;
    dataSet.categoryField = "date";

    // set data sets to the chart
    chart.dataSets = [dataSet];

    // PANELS ///////////////////////////////////////////                                                  
    // first stock panel
    var stockPanel1 = new AmCharts.StockPanel();
    stockPanel1.showCategoryAxis = false;
    stockPanel1.title = "Value";
    stockPanel1.percentHeight = 60;

    // graph of first stock panel
    var graph1 = new AmCharts.StockGraph();
    graph1.title = "Volume";
    graph1.valueField = "value";
    graph1.comparable = true;
    graph1.compareField = "value";
    stockPanel1.addStockGraph(graph1);

    // create stock legend                
    stockPanel1.stockLegend = new AmCharts.StockLegend();

    // second stock panel
    var stockPanel2 = new AmCharts.StockPanel();
    stockPanel2.title = "Volume";
    stockPanel2.percentHeight = 40;
    var graph2 = new AmCharts.StockGraph();
    graph2.valueField = "volume";
    graph2.type = "column";
    graph2.showBalloon = false;
    graph2.fillAlphas = 1;
    stockPanel2.addStockGraph(graph2);
    stockPanel2.stockLegend = new AmCharts.StockLegend();

    // set panels to the chart
    chart.panels = [stockPanel1, stockPanel2];

    // OTHER SETTINGS ////////////////////////////////////
    var sbsettings = new AmCharts.ChartScrollbarSettings();
    sbsettings.graph = graph1;
    sbsettings.autoGridCount = 0;
    chart.chartScrollbarSettings = sbsettings;


    // // PERIOD SELECTOR ///////////////////////////////////
    // var periodSelector = new AmCharts.PeriodSelector();
    // periodSelector.position = "bottom";
    // periodSelector.periods = [{
    //     period: "DD",
    //     count: 10,
    //     label: "10 days"},
    // {
    //     period: "MM",
    //     count: 1,
    //     label: "1 month"},
    // {
    //     period: "YYYY",
    //     count: 1,
    //     label: "1 year"},
    // {
    //     period: "YTD",
    //     label: "YTD"},
    // {
    //     period: "MAX",
    //     selected: true,
    //     label: "MAX"}];
    // chart.periodSelector = periodSelector;
    
    // // ADD AVERAGES //////////////////////////////////////
    // var avgGraph = AmCharts.addMovingAverage(dataSet, stockPanel1, "value");
    // avgGraph.useDataSetColors = false;
    // avgGraph.color = "#ccffcc";
    // avgGraph.title = "Moving average";

    chart.write('chartdiv');
}  

var unwatch_selectedAsset = $scope.$watch('selectedAsset', function () {
  if ($scope.selectedAsset && $scope.trades) {
    generateChartData();
    createStockChart();
    // unwatch_selectedAsset();
    // unwatch_trades();
  }
});

var unwatch_trades = $scope.$watch('trades', function () {
  if ($scope.selectedAsset && $scope.trades) {
    generateChartData();
    createStockChart();
    // unwatch_selectedAsset();
    // unwatch_trades();
  }
});

// generateChartData();
// createStockChart();


});
})();