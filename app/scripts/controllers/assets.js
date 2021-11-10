/**
 * The MIT License (MIT)
 * Copyright (c) 2016 Krypto Fin ry and the FIMK Developers
 *
 * Permission is hereby granted, free of charge, to any person obtaining a copy of
 * this software and associated documentation files (the "Software"), to deal in
 * the Software without restriction, including without limitation the rights to
 * use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of
 * the Software, and to permit persons to whom the Software is furnished to do so,
 * subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be included in all
 * copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
 * SOFTWARE.
 * */
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
  AssetDetailProvider, OrderEntryProvider, ChartsProvider, AccountAssetProvider) {

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

  $scope.symbol           = '';
  $scope.assetName        = '';
  $scope.asset            = $scope.paramAsset;
  $scope.assetType        = '';
  $scope.assetIssuerRS    = '';
  $scope.assetIssuerName  = '';
  $scope.assetDescription = '';
  $scope.assetQuantity    = '';
  $scope.assetDecimals    = '';
  $scope.priceDecimals    = TRADE_UI_ONLY ? '2' : '8';
  $scope.assetTrades      = '';
  $scope.assetAccounts    = '';
  $scope.assetTransfers   = '';
  $scope.assetBalance     = '';
  $scope.isPrivate        = false;
  $scope.showPrivate      = false;

  $scope.accounts         = {};

  /* Lazily reload on current switching */
  var lazy_reload = function () { $scope.reload() }.debounce(1000);
  $scope.$on('$destroy', $rootScope.$on('onOpenCurrentAccount', lazy_reload));
  $scope.$on('$destroy', $rootScope.$on('onCloseCurrentAccount', lazy_reload));

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

        $scope.details = new AssetDetailProvider(api, $scope, $scope.paramAsset, $scope.assetDecimals, id_rs);
        $scope.details.reload();

        $scope.trades = new TradesProvider(api, $scope, 10, $scope.paramAsset,$scope.assetDecimals);
        $scope.trades.reload();

        /* Whenever we see a new trade lazily update the details provider */
        $scope.trades.addChangeObserver(function () {
          $scope.details.reload()
        }.debounce(1000), $scope);

        var id_rs = $rootScope.currentAccount ? $rootScope.currentAccount.id_rs : null;

        if (id_rs) {
          $scope.myAskOrders = new MyAskOrderProvider(api, $scope, 10, $scope.paramAsset, $scope.assetDecimals, id_rs);
          $scope.myAskOrders.reload();

          $scope.myBidOrders = new MyBidOrderProvider(api, $scope, 10, $scope.paramAsset, $scope.assetDecimals, id_rs);
          $scope.myBidOrders.reload();

          $scope.accountAsset = new AccountAssetProvider(api, $scope, $scope.paramAsset, $scope.assetDecimals, id_rs);
          $scope.accountAsset.reload();
        }

        $scope.order = new OrderEntryProvider(api, $scope, $scope.paramAsset, $scope.assetDecimals, id_rs, $scope.privateAsset);
        break;
      }
    }
  }

  AssetInfoProvider.getInfo(api, $scope.paramAsset, true).then(
    function (asset) {
      $scope.$evalAsync(function () {
        $scope.symbol           = asset.issuerColorName||api.engine.symbol;
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
        $scope.showPrivate      = $rootScope.currentAccount ? (asset.issuerRS == $rootScope.currentAccount.id_rs) : false;
        $scope.expiry = asset.expiry;
        $scope.isExpired = asset.expiry ? nxt.util.convertToEpochTimestamp(Date.now()) > asset.expiry : false;

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
    plugins.get('transaction').get(op).execute(args);
  }

  $scope.addPrivateAssetAccount = function (id_rs) {
    var args = { asset: $scope.asset };
    if (id_rs) {
      args.recipient = id_rs;
    }
    plugins.get('transaction').get('addPrivateAssetAccount').execute(args);
  }

  $scope.removePrivateAssetAccount = function (id_rs) {
    var args = { asset: $scope.asset, name: $scope.assetName };
    if (id_rs) {
      args.recipient = id_rs;
    }
    plugins.get('transaction').get('removePrivateAssetAccount').execute(args);
  }

  $scope.setPrivateAssetFee = function (id_rs) {
    var args = { asset: $scope.asset, name: $scope.assetName };
    plugins.get('transaction').get('setPrivateAssetFee').execute(args);
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
