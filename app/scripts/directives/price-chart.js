(function () {
'use strict';

/* https://github.com/arnauddri/d3-stock */

var module = angular.module('fim.base');
module.directive('priceChart', function ($timeout) {
function chart(element, name, symbol, fullWidth, fullHeight, scope) {
  var margin = {top: 2, right: 2, bottom: 2, left: 2},
          width = fullWidth - margin.left - margin.right,
          height = fullHeight - margin.top - margin.bottom,
          volumeHeight = fullHeight*.45;

  var parseDate = d3.time.format("%d-%b-%y").parse;

  var zoom = d3.behavior.zoom()
          .on("zoom", draw);

  var zoomPercent = d3.behavior.zoom();

  var x = techan.scale.financetime()
          .range([0, width]);

  var y = d3.scale.linear()
          .range([height, 0]);

  var yPercent = y.copy();   // Same as y at this stage, will get a different domain later

  var yVolume = d3.scale.linear()
          .range([height, height - volumeHeight]);

  var candlestick = techan.plot.candlestick()
          .xScale(x)
          .yScale(y);

  var sma0 = techan.plot.sma()
          .xScale(x)
          .yScale(y);

  var sma1 = techan.plot.sma()
          .xScale(x)
          .yScale(y);

  var ema2 = techan.plot.ema()
          .xScale(x)
          .yScale(y);

  var volume = techan.plot.volume()
          .accessor(candlestick.accessor())   // Set the accessor to a ohlc accessor so we get highlighted bars
          .xScale(x)
          .yScale(yVolume);

  var xAxis = d3.svg.axis()
          .scale(x)
          .ticks(4)
          .orient("top");

  var yAxis = d3.svg.axis()
          .scale(y)
          .ticks(4)
          .orient("left");

  var percentAxis = d3.svg.axis()
          .scale(yPercent)
          .orient("right")
          .ticks(4)
          .tickFormat(d3.format('+.1%'));

  var volumeAxis = d3.svg.axis()
          .scale(yVolume)
          .orient("right")
          .ticks(2)
          .tickFormat(d3.format(",.3s"));

  /* Crosshair start */

  var ohlcAnnotation = techan.plot.axisannotation()
          .axis(yAxis);
          // .format(d3.format(',.2fs'));

  var timeAnnotation = techan.plot.axisannotation()
          .axis(xAxis)
          .format(d3.time.format('%Y-%m-%d'))
          .width(45)
          .translate([0, height]);

  var crosshair = techan.plot.crosshair()
          .xScale(x)
          .yScale(y)
          .xAnnotation(timeAnnotation)
          .yAnnotation(ohlcAnnotation);      

  /* Crosshair end */          

  var svg = d3.select(element).html("").append("svg")
          .attr("width", width + margin.left + margin.right)
          .attr("height", height + margin.top + margin.bottom)
          .append("g")
          .attr("transform", "translate(" + margin.left + "," + margin.top + ")");

  svg.append("clipPath")
          .attr("id", "clip")
          .append("rect")
          .attr("x", 0)
          .attr("y", y(1))
          .attr("width", width)
          .attr("height", y(0) - y(1));

  // svg.append('text')
  //         .attr("class", "symbol")
  //         .attr("x", 5)
  //         .text(name + " (" + symbol + ")");

  svg.append("g")
          .attr("class", "volume")
          .attr("clip-path", "url(#clip)");

  svg.append("g")
          .attr("class", "candlestick")
          .attr("clip-path", "url(#clip)");

  svg.append("g")
          .attr("class", "indicator sma ma-0")
          .attr("clip-path", "url(#clip)");

  svg.append("g")
          .attr("class", "indicator sma ma-1")
          .attr("clip-path", "url(#clip)");

  svg.append("g")
          .attr("class", "indicator ema ma-2")
          .attr("clip-path", "url(#clip)");

  svg.append("g")
          .attr("class", "x axis")
          .attr("transform", "translate(0," + height + ")");

  svg.append("g")
          .attr("class", "y axis")
          .attr("transform", "translate(" + width + ",0)");

  svg.append("g")
          .attr("class", "percent axis");

  svg.append("g")
          .attr("class", "volume axis");

  svg.append("rect")
          .attr("class", "pane")
          .attr("width", width)
          .attr("height", height)
          .call(zoom);

  /* Crosshair start */

  svg.append('g')
          .attr("class", "crosshair");

  /* Crosshair end */

  function load(data) {

    // debugger;

    var accessor = candlestick.accessor();
    data = data.map(function (d) {
        return {
            date: d.date,
            open: +d.open,
            high: +d.high,
            low: +d.low,
            close: +d.close,
            volume: +d.volume
        };
    }).sort(function (a, b) {
        return d3.ascending(accessor.d(a), accessor.d(b));
    });
    if (data.length == 0) return;

    x.domain(techan.scale.plot.time(data, accessor).domain());
    y.domain(techan.scale.plot.ohlc(data, accessor).domain());
    yPercent.domain(techan.scale.plot.percent(y, accessor(data[0])).domain());
    yVolume.domain(techan.scale.plot.volume(data, accessor.v).domain());

    svg.select("g.candlestick").datum(data).call(candlestick);
    svg.select("g.volume").datum(data).call(volume);
    svg.select("g.sma.ma-0").datum(techan.indicator.sma().period(10)(data)).call(sma0);
    svg.select("g.sma.ma-1").datum(techan.indicator.sma().period(20)(data)).call(sma1);
    svg.select("g.ema.ma-2").datum(techan.indicator.ema().period(50)(data)).call(ema2);
    svg.select("g.crosshair").call(crosshair).call(zoom);

    var zoomable = x.zoomable();
    zoomable.domain([0, data.length]); // Zoom in a little to hide indicator preroll

    draw();

    // Associate the zoom with the scale after a domain has been applied
    zoom.x(zoomable).y(y);
    zoomPercent.y(yPercent);
  }


  // d3.csv("data.csv", function (error, data) {
  //     var accessor = candlestick.accessor(),
  //         indicatorPreRoll = 33;  // Don't show where indicators don't have data

  //     data = data.map(function (d) {
  //         return {
  //             date: parseDate(d.Date),
  //             open: +d.Open,
  //             high: +d.High,
  //             low: +d.Low,
  //             close: +d.Close,
  //             volume: +d.Volume
  //         };
  //     }).sort(function (a, b) {
  //         return d3.ascending(accessor.d(a), accessor.d(b));
  //     });

  //     x.domain(techan.scale.plot.time(data, accessor).domain());
  //     y.domain(techan.scale.plot.ohlc(data.slice(indicatorPreRoll), accessor).domain());
  //     yPercent.domain(techan.scale.plot.percent(y, accessor(data[indicatorPreRoll])).domain());
  //     yVolume.domain(techan.scale.plot.volume(data, accessor.v).domain());

  //     svg.select("g.candlestick").datum(data).call(candlestick);
  //     svg.select("g.volume").datum(data).call(volume);
  //     svg.select("g.sma.ma-0").datum(techan.indicator.sma().period(10)(data)).call(sma0);
  //     svg.select("g.sma.ma-1").datum(techan.indicator.sma().period(20)(data)).call(sma1);
  //     svg.select("g.ema.ma-2").datum(techan.indicator.ema().period(50)(data)).call(ema2);
  //     svg.select("g.crosshair").call(crosshair).call(zoom);

  //     var zoomable = x.zoomable();
  //     zoomable.domain([indicatorPreRoll, data.length]); // Zoom in a little to hide indicator preroll

  //     draw();

  //     // Associate the zoom with the scale after a domain has been applied
  //     zoom.x(zoomable).y(y);
  //     zoomPercent.y(yPercent);
  // });

  function reset() {
      zoom.scale(1);
      zoom.translate([0, 0]);
      draw();
  }

  function draw() {
      zoomPercent.translate(zoom.translate());
      zoomPercent.scale(zoom.scale());

      svg.select("g.x.axis").call(xAxis);
      svg.select("g.y.axis").call(yAxis);
      svg.select("g.volume.axis").call(volumeAxis);
      svg.select("g.percent.axis").call(percentAxis);

      // We know the data does not change, a simple refresh that does not perform data joins will suffice.
      svg.select("g.candlestick").call(candlestick.refresh);
      svg.select("g.volume").call(volume.refresh);
      svg.select("g.sma.ma-0").call(sma0.refresh);
      svg.select("g.sma.ma-1").call(sma1.refresh);
      svg.select("g.ema.ma-2").call(ema2.refresh);
      svg.select("g.crosshair").call(crosshair.refresh);
  }

  load(scope.chart.data);
}
return {
  restrict: 'E',
  scope: { chart: '=' },
  replace: false,
  link: function (scope, element, attrs) {
    var el = element[0];
    function draw() {
      // add this back when switching to the new chart
      if (scope.chart /*&& scope.chart.data.length*/) {
        chart(el, "Apple, Inc.", "AAPL", el.parentElement.offsetWidth, el.parentElement.offsetHeight, scope);
      }
    }
    d3.select(window).on('resize', draw); 
    $timeout(draw);
    scope.$watchCollection('chart.data', draw);
  }
};
});
})();