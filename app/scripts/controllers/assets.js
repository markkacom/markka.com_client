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
  ChartsProvider, AskOrderProvider, BidOrderProvider, AssetInfoProvider, TradesProvider, AssetPostProvider, 
  accountsService, MyOrdersProvider, PrivateAccountsProvider) {

  $rootScope.paramEngine  = $routeParams.engine;
  $scope.paramEngine      = $routeParams.engine;
  $scope.paramAsset       = $routeParams.asset;
  $scope.paramSection     = $routeParams.section;

  $scope.breadcrumb       = [];

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

  /* Breadcrumbs */
  $scope.breadcrumb.push({
    label: 'translate.home',
    href:  "#/home/"+$scope.paramEngine+"/activity/latest",
    translate: true
  });
  $scope.breadcrumb.push({
    label: 'translate.assets',
    translate: true
  });
  $scope.breadcrumb.push({
    label: $scope.paramEngine,
    active: true
  });  
  $scope.breadcrumb.push({
    label: $scope.paramAsset,
    href: "#/assets/"+$scope.paramEngine+"/"+$scope.paramAsset+"/trade"
  });
  $scope.breadcrumb.push({
    label: 'translate.'+$scope.paramSection,
    active: true,
    translate: true
  });


  $scope.assetName        = '';
  $scope.asset            = $scope.paramAsset;
  $scope.assetIssuerRS    = '';
  $scope.assetIssuerName  = '';
  $scope.assetDescription = '';
  $scope.assetQuantity    = '';
  $scope.assetDecimals    = '';
  $scope.assetTrades      = '';
  $scope.assetAccounts    = '';
  $scope.assetTransfers   = '';

  $scope.accounts         = {};

  AssetInfoProvider.getInfo(api, $scope.paramAsset).then(
    function (asset) {
      $scope.$evalAsync(function () {
        $scope.breadcrumb[2].label = asset.name + ' - ' + $scope.paramAsset;
        $scope.assetName        = asset.name;
        $scope.assetIssuerRS    = asset.issuerRS;
        $scope.assetIssuerName  = asset.issuerName;
        $scope.assetDescription = asset.description;
        $scope.assetQuantity    = nxt.util.commaFormat(nxt.util.convertToQNTf(asset.quantityQNT, asset.decimals));
        $scope.assetDecimals    = asset.decimals;
        $scope.assetTrades      = asset.numberOfTrades;
        $scope.assetAccounts    = asset.numberOfAccounts;
        $scope.assetTransfers   = asset.numberOfTransfers;
      });
    }
  );

  $scope.reload = function () {
    switch ($scope.paramSection) {
      case 'pulse': {
        $scope.provider = new AssetPostProvider(api, $scope, 5, $scope.asset);
        $scope.provider.reload();        
        break;
      }
      case 'trade': {
        var promise = accountsService.getAll(api.engine.type == nxt.TYPE_FIM ? accountsService.FIM_FILTER : accountsService.NXT_FILTER);
        promise.then(function (accounts) {
          $scope.$evalAsync(function () {
            $scope.my_orders = new MyOrdersProvider(api, $scope, 10, $scope.paramAsset, accounts.map(function (a) { return a.id_rs } ));
            $scope.my_orders.reload();

            angular.forEach(accounts, function (a) {
              $scope.accounts[a.id_rs] = a;
            });
          });
        });

        $scope.chart = new ChartsProvider(api, $scope.paramAsset, $scope);
        $scope.chart.reload();

        $scope.askOrders = new AskOrderProvider(api, $scope, 10, $scope.paramAsset);
        $scope.askOrders.reload();

        $scope.bidOrders = new BidOrderProvider(api, $scope, 10, $scope.paramAsset);
        $scope.bidOrders.reload();

        $scope.trades = new TradesProvider(api, $scope, 10, $scope.paramAsset);
        $scope.trades.reload();
        break;
      }
      case 'private': {
        $scope.provider = new PrivateAccountsProvider(api, $scope, 10, $scope.asset);
        $scope.provider.reload();
        break
      }
    }
  }

  $scope.reload();

  $scope.buyAsset = function () {
    plugins.get('transaction').get('buyAsset').execute(api.engine.type, {
      asset: $scope.asset,
      decimals: $scope.assetDecimals,
      name: $scope.assetName
    });
  }

  $scope.sellAsset = function () {
    plugins.get('transaction').get('sellAsset').execute(api.engine.type, {
      asset: $scope.asset,
      decimals: $scope.assetDecimals,
      name: $scope.assetName
    });
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
    var op = order.type == 'sell' ? 'cancelAskOrder' : 'cancelBidOrder';
    plugins.get('transaction').get(op).execute(order.accountRS, args);
  }

});
})();