(function () {
'use strict';
var module = angular.module('fim.base');

module.config(function($routeProvider) {
  $routeProvider
    .when('/accounts/:id_rs/:section/:period', {
      templateUrl: 'partials/accounts.html',
      controller: 'AccountsController'
    });
});

module.controller('AccountsController', function($location, $q, $scope, modals, $routeParams, nxt, db, plugins, requests, $timeout, 
  ActivityProvider, MessagesProvider, BlocksProvider, AliasProvider, NamespacedAliasProvider, AssetsProvider, CurrencyProvider, AccountProvider, 
  BuyOrderProvider, SellOrderProvider, AccountPostProvider, AccountForgerProvider, AccountLessorsProvider, 
  dateParser, dateFilter, accountsService, PaymentsProvider, $rootScope, serverService) {

  $scope.id_rs          = $routeParams.id_rs;
  $scope.paramSection   = $routeParams.section;
  $scope.paramPeriod    = $routeParams.period || 'latest';
  $scope.paramTimestamp = 0; //nxt.util.convertToEpochTimestamp(Date.now()) + (24 * 60 * 60);
  $scope.breadcrumb     = [];
  $scope.filter         = {};
  $scope.following      = false;
  
  var api = nxt.get($scope.id_rs);
  if (!api) {
    console.log('Could not determine engine "'+$scope.id_rs+'"');
    $location.path('/home/fim/activity/latest');
    return;
  }

  if (['activity', 'messages', 'blocks', 'aliases', 'fim_aliases', 'assets', 
       'goods', 'leasing', 'currency', 'buy_orders', 'sell_orders', 'pulse', 
       'payments'].indexOf($scope.paramSection) == -1) {
    $location.path('/home/fim/activity/latest');
    return;
  }

  $scope.symbol = api.engine.symbol;
  $scope.symbol_lower = api.engine.symbol_lower;

  $scope.showFilter            = ['activity', 'messages', 'blocks', 'pulse'].indexOf($scope.paramSection) != -1;;
  $scope.showTransactionFilter = ['activity'].indexOf($scope.paramSection) != -1;

  /* Breadcrumbs */
  $scope.breadcrumb.push({
    label: 'translate.home',
    href:  "#/home/"+$scope.paramEngine+"/activity/latest",
    translate: true
  });
  $scope.breadcrumb.push({
    label: $scope.id_rs,
    href:  "#/accounts/"+$scope.id_rs+"/activity/"+$scope.paramPeriod,
  });
  $scope.breadcrumb.push({
    label: 'THIS IS SET FURTHER DOWN BELOW',
    active:  true,
    translate: true
  });  
  if (['activity','messages','blocks', 'pulse'].indexOf($scope.paramSection) != -1) {
    if ($scope.paramPeriod == 'latest') {
      $scope.breadcrumb.push({
        label: 'translate.latest',
        translate: true
      });
    }
    else {
      $scope.breadcrumb.push({
        label: $scope.paramPeriod,
        period: true
      });
    }
  }

  /* Date picker */
  $scope.dt     = null;
  $scope.format = 'dd-MMMM-yyyy';

  if ($scope.paramPeriod != 'latest') {
    var d = dateParser.parse($scope.paramPeriod, $scope.format);
    if (!d) {
      $location.path('/accounts/'+$scope.id_rs+'/'+$scope.paramSection+'/latest');
      return;
    }
    $scope.dt = $scope.paramPeriod;

    /* Timestamp is for 00:00 hour on selected day */
    d = new Date(d.getFullYear(), d.getMonth(), d.getDate()+1, 0, 0, 0);
    $scope.paramTimestamp = nxt.util.convertToEpochTimestamp(d.getTime());
  }

  function determineFollowingStatus() {
    accountsService.getFirst($scope.id_rs).then(function (item) {
      $scope.$evalAsync(function () {
        if (item) {
          $scope.following = true;
        }
        else {
          $scope.following = false;
        }
      });
    }); 
  }

  determineFollowingStatus();

  accountsService.onChange($scope, determineFollowingStatus);

  /* Tell the FIM server to start sending websocket events about this account - auto unsubscribes */
  // api.engine.socket().subscribe([$scope.id_rs], $scope);

  /* Auto populate 'Other Actions' menu with all available transaction types */
  $scope.transactions = plugins.get('transaction').transactions.filter(function (t) { return !t.exclude });

  $scope.selectTab = function (section) {
    if ($scope.paramSection != section) {
      $location.path('/accounts/'+$scope.id_rs+'/'+section+'/'+$scope.paramPeriod);
    }
  }

  /* TODO.. this loads all comments - this has to be separated when loaded on anything than the pulse page */
  $scope.account = new AccountProvider(api, $scope, $scope.id_rs);
  $scope.account.reload();

  if ($rootScope.forceLocalHost || serverService.isReady(api.type)) {
    $scope.forger = new AccountForgerProvider(api, $scope, $scope.id_rs);
    $scope.forger.reload();
  }

  switch ($scope.paramSection) {
    case 'pulse':
      $scope.breadcrumb[2].label = 'translate.pulse';
      $scope.provider = new AccountPostProvider(api, $scope, 5, $scope.id_rs);
      $scope.provider.reload();
      break;
    case 'comments':
      $scope.breadcrumb[2].label = 'translate.comments';
      $scope.provider = new AccountCommentsProvider(api, $scope, $scope.paramTimestamp, $scope.id_rs);
      $scope.provider.reload();
      break;       
    case 'activity':
      $scope.breadcrumb[2].label = 'translate.activity';
      $scope.provider = new ActivityProvider(api, $scope, $scope.paramTimestamp, $scope.id_rs, $scope.filter);
      $scope.provider.reload();
      break;
    case 'messages':
      $scope.breadcrumb[2].label = 'translate.messages';
      $scope.provider = new MessagesProvider(api, $scope, $scope.paramTimestamp, $scope.id_rs);
      $scope.provider.reload();
      break;
    case 'blocks':
      $scope.breadcrumb[2].label = 'translate.blocks_forged';
      $scope.provider = new BlocksProvider(api, $scope, $scope.paramTimestamp, $scope.id_rs);
      $scope.provider.reload();
      break;
    case 'aliases':
      $scope.breadcrumb[2].label = 'translate.aliases';
      $scope.provider = new AliasProvider(api, $scope, 10, $scope.id_rs);
      $scope.provider.reload();
      break;
    case 'fim_aliases':
      $scope.breadcrumb[2].label = 'translate.namespaced_aliases';
      $scope.provider = new NamespacedAliasProvider(api, $scope, 10, $scope.id_rs);
      $scope.provider.reload();      
      break;
    case 'currency':
      $scope.breadcrumb[2].label = 'translate.currencies';
      $scope.provider = new CurrencyProvider(api, $scope, 10, $scope.id_rs);
      $scope.provider.reload();  
      break;
    case 'assets':
      $scope.breadcrumb[2].label = 'translate.assets';
      $scope.provider = new AssetsProvider(api, $scope, 10, $scope.id_rs);
      $scope.provider.reload();    
      break;
    case 'sell_orders':
      $scope.breadcrumb[2].label = 'translate.sell_orders';
      $scope.provider = new SellOrderProvider(api, $scope, 10, $scope.id_rs);
      $scope.provider.reload();    
      break;
    case 'buy_orders':
      $scope.breadcrumb[2].label = 'translate.buy_orders';
      $scope.provider = new BuyOrderProvider(api, $scope, 10, $scope.id_rs);
      $scope.provider.reload();    
      break;
    case 'goods':
      $scope.breadcrumb[2].label = 'translate.goods';
      break;
    case 'leasing':
      $scope.breadcrumb[2].label = 'translate.balance_leasing';
      $scope.provider = new AccountLessorsProvider(api, $scope, $scope.id_rs);
      $scope.provider.reload();
      break;
    case 'payments':
      if (!$rootScope.currentAccount || $scope.id_rs != $rootScope.currentAccount.id_rs) {
        $location.path('/login-to');
        return;
      }
      $scope.breadcrumb[2].label = 'translate.payments';
      $scope.provider = new PaymentsProvider(api, $scope, $scope.id_rs);
      break;
    default:
      throw new Error('Not reached');
  }

  $scope.minDate      = new Date(Date.UTC(2013, 10, 24, 12, 0, 0, 0));
  $scope.maxDate      = new Date();
  $scope.dateOptions  = {
    formatYear: 'yy',
    startingDay: 1
  }; 
  $scope.openDatePicker = function($event) {
    $event.preventDefault();
    $event.stopPropagation();
    $scope.opened = true;
  };

  var stopWatching = false;
  $scope.$watch('dt', function (newValue, oldValue) {
    if (newValue && newValue !== oldValue && typeof oldValue != 'string' && !stopWatching) {
      stopWatching  = true;
      var formatted = dateFilter(newValue, $scope.format);
      $location.path('/accounts/'+$scope.id_rs+'/'+$scope.paramSection+'/'+formatted);
    }
  });

  if ($scope.showTransactionFilter) {
    $scope.filter.all = true;
    $scope.filter.payments = true;
    $scope.filter.messages = true;
    $scope.filter.aliases = true;
    $scope.filter.namespacedAliases = true;
    $scope.filter.polls = true;
    $scope.filter.accountInfo = true;
    $scope.filter.announceHub = true;
    $scope.filter.goodsStore = true;
    $scope.filter.balanceLeasing = true;
    $scope.filter.trades = true;
    $scope.filter.assetIssued = true;
    $scope.filter.assetTransfer = true;
    $scope.filter.assetOrder = true;
    $scope.filter.currencyIssued = true;
    $scope.filter.currencyTransfer = true;
    $scope.filter.currencyOther = true;

    $scope.filterAllChanged = function () {
      $scope.$evalAsync(function () {
        var on = $scope.filter.all;
        $scope.filter.payments = on;
        $scope.filter.messages = on;
        $scope.filter.aliases = on;
        $scope.filter.namespacedAliases = on;
        $scope.filter.polls = on;
        $scope.filter.accountInfo = on;
        $scope.filter.announceHub = on;
        $scope.filter.goodsStore = on;
        $scope.filter.balanceLeasing = on;
        $scope.filter.trades = on;
        $scope.filter.assetIssued = on;
        $scope.filter.assetTransfer = on;
        $scope.filter.assetOrder = on;
        $scope.filter.currencyIssued = on;
        $scope.filter.currencyTransfer = on;
        $scope.filter.currencyOther = on;       

        $scope.filterChanged();
      });
    }

    $scope.filterChanged = function () {
      $scope.provider.applyFilter($scope.filter);
    }
  }

  $scope.followUser = function () {
    plugins.get('alerts').confirm({
      title: 'Follow account',
      html: 'Do you want to follow this account?<br>By following this account it will be added to your dashboard.'
    }).then(
      function (confirmed) {
        if (confirm) {
          var args = {
            id_rs: $scope.id_rs,
            publicKey: '',
            engine: api.engine.type,
            name: $scope.account.name,
            excluded: false
          };
          db.accounts.put(args).then(function () {
            $scope.$evalAsync(function () {
              $scope.following = true;
            })
          });
        }
      }
    );
  }

  $scope.unFollowUser = function () {
    accountsService.getFirst($scope.id_rs).then(function (item) {
      if (item) {
        plugins.get('alerts').confirm({
          title: 'Unfollow account',
          html: 'Are you sure you want to unfollow this account?<br>By un following this account it will be removed from your dashboard.'
        }).then(
          function (confirmed) {
            if (confirmed) {
              item.delete();
            }
          }
        );
      }
    });
  }

  $scope.sendMoney = function () {
    plugins.get('transaction').get('tipUser').execute({ recipient: $scope.id_rs });
  }

  $scope.sendMessage = function () {
    plugins.get('transaction').get('accountMessage').execute({ recipient: $scope.id_rs });
  }

  $scope.setAccountInfo = function () {
    plugins.get('transaction').get('setAccountInfo').execute($scope.id_rs, {
      name: ($scope.account ? $scope.account.name : ''),
      description: ($scope.account ? $scope.account.description : ''),
    });
  }

  function startForging() {
    plugins.get('transaction').get('startForging').execute($scope.id_rs).then(
      function () {
        if ($scope.forger) {
          $scope.forger.reload();
        }
      }
    );
  }

  function stopForging() {
    plugins.get('transaction').get('stopForging').execute($scope.id_rs).then(
      function () {
        if ($scope.forger) {
          $scope.forger.reload();
        }
      }
    );
  }  

  $scope.executeTransaction = function (id) {
    switch (id) {
      case 'setAccountInfo': {
        $scope.setAccountInfo();
        break;
      }
      case 'startForging': {
        startForging();
        break;
      }
      case 'stopForging': {
        stopForging();
        break;
      }
      default: {
        plugins.get('transaction').get(id).execute($scope.id_rs, {});
        break;
      }
    }
  }

  $scope.editAlias = function (alias) {
    plugins.get('transaction').get('setAlias').execute($scope.id_rs, alias);
  }

  $scope.transferAlias = function (alias) {
    plugins.get('transaction').get('transferAlias').execute($scope.id_rs, alias);
  }

  $scope.sellAlias = function (alias) {
    plugins.get('transaction').get('sellAlias').execute($scope.id_rs, alias);
  }

  $scope.buyAlias = function (alias) {
    plugins.get('transaction').get('buyAlias').execute($scope.id_rs, angular.extend(alias, { amountNXT: nxt.util.convertToNXT(alias.priceNQT) }));
  }

  $scope.cancelSellAlias = function (alias) {
    plugins.get('transaction').get('cancelSellAlias').execute($scope.id_rs, alias);
  }

  $scope.sellAsset = function (asset) {
    asset = angular.copy(asset);
    asset.quantity = 0;
    plugins.get('transaction').get('sellAsset').execute($scope.id_rs, asset);
  }

  $scope.buyAsset = function (asset) {
    asset = angular.copy(asset);
    asset.quantity = 0;
    plugins.get('transaction').get('buyAsset').execute($scope.id_rs, asset);
  }

  $scope.transferAsset = function (asset) {
    asset = angular.copy(asset);
    asset.quantity = 0;
    plugins.get('transaction').get('transferAsset').execute($scope.id_rs, asset);
  }

  $scope.writePost = function () {
    plugins.get('transaction').get('accountPost').execute($scope.id_rs);
  }

  $scope.writeComment = function (post_transaction_id) {
    plugins.get('transaction').get('writeComment').execute({ recipient: $scope.id_rs, post_transaction_id: post_transaction_id });
  }

  $scope.writeMessage = function () {
    plugins.get('transaction').get('accountMessage').execute({ recipient: $scope.id_rs });
  }

  $scope.cancelBidOrder = function (order) {
    plugins.get('transaction').get('cancelBidOrder').execute($scope.id_rs, order);
  }

  $scope.cancelAskOrder = function (order) {
    plugins.get('transaction').get('cancelAskOrder').execute($scope.id_rs, order);
  }

  $scope.tipUser = function () {
    plugins.get('transaction').get('tipUser').execute({ recipient: $scope.id_rs });
  }

  $scope.editNSAlias = function (alias) {
    plugins.get('transaction').get('setNamespacedAlias').execute($scope.id_rs, { 
      aliasName: alias.aliasName,
      aliasURI: alias.aliasURI
   }, true);
  }

});

})();