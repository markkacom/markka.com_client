(function () {
'use strict';
var module = angular.module('fim.base');

module.config(function($routeProvider) {  
  $routeProvider
    .when('/assets/:engine/:asset/:section', {
      templateUrl: 'partials/assets.html',
      controller: 'AssetsController'
    });
});

module.controller('AssetsController', function($scope, $rootScope, $location, $routeParams, nxt, plugins,
  ChartDataProvider, AskOrderProvider, BidOrderProvider, AssetInfoProvider, TradesProvider, AssetPostProvider, 
  accountsService, MyOrdersProvider, PrivateAccountsProvider, MyAskOrderProvider, MyBidOrderProvider,
  AssetDetailProvider, OrderEntryProvider, ChartsProvider) {

  $rootScope.paramEngine  = $routeParams.engine;
  $scope.paramEngine      = $routeParams.engine;
  $scope.paramAsset       = $routeParams.asset;
  $scope.paramSection     = $routeParams.section;

  if ($scope.paramEngine == 'nxt') {
    var api = nxt.nxt();
  }
  else if ($scope.paramEngine == 'fim') {
    var api = nxt.fim();
  }
  else {
    $location.path('/activity/fim/activity/latest');
    return;
  }

  $scope.symbol           = api.engine.symbol;
  $scope.assetName        = '';
  $scope.asset            = $scope.paramAsset;
  $scope.assetType        = '';
  $scope.assetIssuerRS    = '';
  $scope.assetIssuerName  = '';
  $scope.assetDescription = '';
  $scope.assetQuantity    = '';
  $scope.assetDecimals    = '';
  $scope.assetTrades      = '';
  $scope.assetAccounts    = '';
  $scope.assetTransfers   = '';
  $scope.assetBalance     = '';
  $scope.isPrivate        = false;
  $scope.showPrivate      = false;

  $scope.accounts         = {};

  $scope.reload = function () {
    switch ($scope.paramSection) {
      case 'private': {
        $scope.provider = new PrivateAccountsProvider(api, $scope, 10, $scope.asset);
        $scope.provider.reload();
        break
      }      
      case 'pulse': {
        $scope.provider = new AssetPostProvider(api, $scope, 5, $scope.asset);
        $scope.provider.reload();        
        break;
      }
      case 'trade': {
        // techan/d3 charts
        $scope.chart = new ChartDataProvider(api, $scope, $scope.paramAsset, $scope.assetDecimals);
        $scope.chart.reload();

        // amcharts
        // $scope.chart = new ChartsProvider(api, $scope, $scope.paramAsset, $scope.assetDecimals);
        // $scope.chart.reload();

        $scope.askOrders = new AskOrderProvider(api, $scope, 10, $scope.paramAsset, $scope.assetDecimals);
        $scope.askOrders.reload();

        $scope.bidOrders = new BidOrderProvider(api, $scope, 10, $scope.paramAsset, $scope.assetDecimals);
        $scope.bidOrders.reload();

        $scope.trades = new TradesProvider(api, $scope, 10, $scope.paramAsset,$scope.assetDecimals);
        $scope.trades.reload();

        var id_rs = $rootScope.currentAccount ? $rootScope.currentAccount.id_rs : null;

        if (id_rs) {
          $scope.myAskOrders = new MyAskOrderProvider(api, $scope, 10, $scope.paramAsset, $scope.assetDecimals, id_rs);
          $scope.myAskOrders.reload();

          $scope.myBidOrders = new MyBidOrderProvider(api, $scope, 10, $scope.paramAsset, $scope.assetDecimals, id_rs);
          $scope.myBidOrders.reload();
        }

        $scope.details = new AssetDetailProvider(api, $scope, $scope.paramAsset, $scope.assetDecimals, id_rs);
        $scope.details.reload();

        $scope.order = new OrderEntryProvider(api, $scope, $scope.paramAsset, $scope.assetDecimals, id_rs, $scope.privateAsset);
        break;
      }
    }
  }

  AssetInfoProvider.getInfo(api, $scope.paramAsset).then(
    function (asset) {
      $scope.$evalAsync(function () {
        $scope.assetName        = asset.name;
        $scope.assetIssuerRS    = asset.issuerRS;
        $scope.assetIssuerName  = asset.issuerName;
        $scope.assetDescription = asset.description;
        $scope.assetQuantity    = nxt.util.commaFormat(nxt.util.convertToQNTf(asset.quantityQNT, asset.decimals));
        $scope.assetDecimals    = asset.decimals;
        $scope.assetTrades      = asset.numberOfTrades;
        $scope.assetAccounts    = asset.numberOfAccounts;
        $scope.assetTransfers   = asset.numberOfTransfers;
        $scope.isPrivate        = asset.type == 1;
        $scope.showPrivate      = $rootScope.currentAccount ? asset.issuerRS == $rootScope.currentAccount.id_rs : false;

        if ($scope.isPrivate) {
          $scope.privateAsset = {
            orderFeePercentage: asset.orderFeePercentage,
            tradeFeePercentage: asset.tradeFeePercentage,
            orderFee: nxt.util.convertToQNTf(asset.orderFeePercentage, 6)
          };
        }

        $scope.reload();
      });
    }
  );

  $scope.buyAsset = function () {
    var args = {
      asset: $scope.asset,
      decimals: $scope.assetDecimals,
      name: $scope.assetName,
      priceNXT: $scope.order.priceNXT,
      quantity: $scope.order.quantity
    }
    if ($rootScope.TRADE_UI_ONLY) {
      args.autoSubmit = true;
    }
    if ($scope.privateAsset) {
      args.orderFeeNQT = $scope.order.orderFeeNQT;
    }
    plugins.get('transaction').get('buyAsset').execute(args);
  }

  $scope.sellAsset = function () {
    var args = {
      asset: $scope.asset,
      decimals: $scope.assetDecimals,
      name: $scope.assetName,
      priceNXT: $scope.order.priceNXT,
      quantity: $scope.order.quantity
    };
    if ($rootScope.TRADE_UI_ONLY) {
      args.autoSubmit = true;
    }
    if ($scope.privateAsset) {
      args.orderFeeQNT = $scope.order.orderFeeQNT;
    }
    plugins.get('transaction').get('sellAsset').execute(args);
  }

  $scope.writePost = function () {
    plugins.get('transaction').get('assetPost').execute($scope.assetIssuerRS, {asset: $scope.asset});
  }

  $scope.writeComment = function (post_transaction_id) {
    plugins.get('transaction').get('writeComment').execute({ recipient: $scope.assetIssuerRS, post_transaction_id: post_transaction_id });
  }  

  $scope.cancelOrder = function (order) {
    var args = {
      order: order.order,
      asset: $scope.asset,
      name: $scope.assetName,
      price: order.price,
      quantity: order.quantity
    };
    if ($rootScope.TRADE_UI_ONLY) {
      args.autoSubmit = true;
    }    
    var op = order.type == 'ask' ? 'cancelAskOrder' : 'cancelBidOrder';
    plugins.get('transaction').get(op).execute(order.accountRS, args);
  }

  $scope.addPrivateAssetAccount = function (id_rs) {
    var args = { asset: $scope.asset };
    if (id_rs) {
      args.recipient = id_rs;
    }
    plugins.get('transaction').get('addPrivateAssetAccount').execute($scope.assetIssuerRS, args);
  }

  $scope.removePrivateAssetAccount = function (id_rs) {
    var args = { asset: $scope.asset, name: $scope.assetName };
    if (id_rs) {
      args.recipient = id_rs;
    }
    plugins.get('transaction').get('removePrivateAssetAccount').execute($scope.assetIssuerRS, args);
  }

  $scope.setPrivateAssetFee = function (id_rs) {
    var args = { asset: $scope.asset, name: $scope.assetName };
    plugins.get('transaction').get('setPrivateAssetFee').execute($scope.assetIssuerRS, args);
  }

  $scope.data = [1,2,3];

  $scope.bidOrderClicked = function (selectedOrder) {
    var totalQNT = new BigInteger('0'), order;
    for (var i=0; i<$scope.bidOrders.entities.length; i++) {
      order = $scope.bidOrders.entities[i];
      totalQNT = totalQNT.add(new BigInteger(order.quantityQNT));
      if (order == selectedOrder) {
        break;
      }
    }
    $scope.order.quantity = nxt.util.convertToQNTf(totalQNT.toString(), $scope.assetDecimals);
    $scope.order.priceNXT = selectedOrder.price;
    $scope.order.reCalculate();
  }

  $scope.askOrderClicked = function (selectedOrder) {
    var totalQNT = new BigInteger('0'), order;
    for (var i=0; i<$scope.askOrders.entities.length; i++) {
      order = $scope.askOrders.entities[i];
      totalQNT = totalQNT.add(new BigInteger(order.quantityQNT));
      if (order == selectedOrder) {
        break;
      }
    }
    $scope.order.quantity = nxt.util.convertToQNTf(totalQNT.toString(), $scope.assetDecimals);    
    $scope.order.priceNXT = order.price;
    $scope.order.reCalculate();
  }

});
})();