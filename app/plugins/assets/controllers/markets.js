(function () {
'use strict';
var module = angular.module('fim.base');
module.controller('ExchangePluginMarketsController', function($scope, $sce, $timeout, nxt) {

  var timer = null;
  $scope.$watch('assets', function () {
    if(timer){
      $timeout.cancel(timer)
    }  
    timer = $timeout(populateAssets, 100, false);
  });

  $scope.setAssetSorter = function (sorter) {
    $scope.assetSorter = sorter;
    $scope.$evalAsync(function () {
      $scope.assets.sort($scope.assetSorter);
      populateAssets();
    });
  }  

  function populateAssets() {
    var array = $scope.selectedAsset ? [$scope.selectedAsset] : [];
    array = array.concat($scope.selectedAsset ? 
      $scope.assets.filter(function (a) { return a.asset != $scope.selectedAsset.asset }) : 
      $scope.assets
    );
    showTheseAssets(array);
  }

  function showTheseAssets(assets) {
    var displayed = [];
    angular.forEach(assets, function (asset) {
     displayed.push({
        name: asset.name,
        asset: asset.asset,
        price: createPrice(asset),
        diff: createPercent(asset),
      })
    });
    $scope.firstAssetRow = displayed.slice(0, 11);
    $scope.displayedAssetRows = [];
    var chunk = 12;
    for (var i=11, j=displayed.length; i<j; i+=chunk) {
      $scope.displayedAssetRows.push(displayed.slice(i, i+chunk));
    }
  }

  function createPrice(asset) {
    var trade = asset.latest;
    if (trade) {
      var price = nxt.util.calculateOrderPricePerWholeQNT(trade.priceNQT, asset.decimals);
      return roundNum(price, 8);
    }
    return $sce.trustAsHtml('<span>..</span>');
  }

  function createPercent(asset) {
    if (asset.latest && asset.oldest24h) {
      var latestPrice = nxt.util.calculateOrderPricePerWholeQNT(asset.latest.priceNQT, asset.decimals).replace(/,/,'');
      var oldestPrice = nxt.util.calculateOrderPricePerWholeQNT(asset.oldest24h.priceNQT, asset.decimals).replace(/,/,'');
      var percent = ((latestPrice - oldestPrice)/(oldestPrice)*100);
      return renderPercent(percent, 8);
    }
    return $sce.trustAsHtml('<span></span>');
  }

  /** 
   * Rounds a number allowing it to only consist of maxcharacters when 
   * displayed. Based on the number of digits before the decimal point
   * we decide how many digits we can have beyond the decimal point
   * so eventually the entire number will be no more than maxcharacters
   * in length.
   *
   * @param number
   * @param maxcharacters
   * @return String (trusted HTML)
   **/
  function roundNum(number, maxcharacters) {
    var str = String(number);
    if (str.indexOf('.') == -1) {
      return str;
    }
    var parts = str.split('.');
    var remain = maxcharacters - parts[0].length - 1;
    if (remain == 0) {
      return renderPrice(parts[0]);
    }
    return renderPrice(parts[0], parts[1].substring(0,remain));
  } 


  function renderPrice(whole, remainder) {
    var html = whole;
    if (remainder) {
      html += "." + remainder;
      return $sce.trustAsHtml('<span>'+ html + '</span>');
    }
    return $sce.trustAsHtml(html);
  }

  function renderPercent(number, maxcharacters) {
    var color = number>0?'green':'red';
    var str = String(number);
    if (str.indexOf('.') == -1) {
      return $sce.trustAsHtml('<span class="text-left" style="color:'+color+'">'+number+'%</span>');
    }
    var parts = str.split('.');
    var remain = Math.min(3, maxcharacters - parts[0].length - 1);
    if (remain == 0) {
      return $sce.trustAsHtml('<span class="text-left" style="color:'+color+'">'+parts[0]+'%</span>');
    }
    return $sce.trustAsHtml('<span class="text-left" style="color:'+color+'">'+parts[0]+'.'+parts[1].substring(0,remain)+'%</span>');
  }

  $scope.showAll = function () {
    showTheseAssets($scope.assets);
  }

  $scope.filter24H = function () {
    

  }


  $scope.applyFilter = function (id) {

  }


});
})();