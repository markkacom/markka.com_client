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
    .when('/accounts/:id_rs/:section/:period?', {
      templateUrl: 'partials/accounts.html',
      controller: 'AccountsController'
    });
});

module.controller('AccountsController', function($location, $q, $scope, modals, $routeParams, nxt, db, plugins, $timeout,
  ActivityProvider, MessagesProvider, BlocksProvider, AliasProvider, NamespacedAliasProvider, AssetsProvider, CurrencyProvider, AccountProvider,
  BuyOrderProvider, SellOrderProvider, AccountPostProvider, AccountForgerProvider, AccountLessorsProvider,
  dateParser, dateFilter, accountsService, PaymentsProvider, $rootScope, serverService,
  AllGoodsProvider, PastGoodsProvider, SoldGoodsProvider, DeliveryConfirmedGoodsProvider, UserService) {

  $scope.id_rs          = $routeParams.id_rs;
  $scope.paramSection   = $routeParams.section;
  $scope.paramPeriod    = $routeParams.period || 'latest';
  $scope.paramTimestamp = 0; //nxt.util.convertToEpochTimestamp(Date.now()) + (24 * 60 * 60);
  $scope.filter         = {};
  $scope.following      = false;

  $scope.collapse       = JSON.parse(window.localStorage.getItem("lompsa.accounts.menu")||'{"account":true}');
  $scope.toggleMenuCollapse = function (id) {
    var val = !$scope.collapse[id];
    Object.getOwnPropertyNames($scope.collapse).forEach(function (name) {
      $scope.collapse[name] = false;
    });
    $scope.collapse[id] = val;
    window.localStorage.setItem("lompsa.accounts.menu",JSON.stringify($scope.collapse));
  }

  var api = nxt.get($scope.id_rs);
  if (!api) {
    console.log('Could not determine engine "'+$scope.id_rs+'"');
    $location.path('/home/fim/activity/latest');
    return;
  }

  $scope.paramEngine    = api.engine.symbol_lower;

  if (['activity', 'messages', 'blocks', 'aliases', 'fim_aliases', 'assets',
       'goods', 'leasing', 'currency', 'buy_orders', 'sell_orders', 'pulse',
       'payments', 'listing', 'solditems', 'pastorders', 'dashboard'].indexOf($scope.paramSection) == -1) {
    $location.path('/home/fim/activity/latest');
    return;
  }

  $scope.symbol = api.engine.symbol;
  $scope.symbol_lower = api.engine.symbol_lower;


  $scope.showFilter            = ['activity', 'messages', 'blocks', 'pulse'].indexOf($scope.paramSection) != -1;;
  $scope.showTransactionFilter = ['activity'].indexOf($scope.paramSection) != -1;

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

  /* Lazily navigate to logged in account dashboard */
  $scope.$on('$destroy', $rootScope.$on('onOpenCurrentAccount', function () {
    if (UserService.currentAccount.id_rs != $scope.id_rs) {
      $location.path('/accounts/'+UserService.currentAccount.id_rs+'/'+$scope.paramSection+'/latest');
    }
    else {
      $scope.account.reload();
    }
  }));

  /* TODO.. this loads all comments - this has to be separated when loaded on anything than the pulse page */
  $scope.account = new AccountProvider(api, $scope, $scope.id_rs);
  $scope.account.reload();

  if ($rootScope.forceLocalHost || serverService.isReady(api.type)) {
    $scope.forger = new AccountForgerProvider(api, $scope, $scope.id_rs);
    $scope.forger.reload();
  }

  switch ($scope.paramSection) {
    case 'dashboard':
      break;
    case 'pulse':
      $scope.provider = new AccountPostProvider(api, $scope, 5, $scope.id_rs);
      $scope.provider.reload();
      break;
    case 'comments':
      $scope.provider = new AccountCommentsProvider(api, $scope, $scope.paramTimestamp, $scope.id_rs);
      $scope.provider.reload();
      break;
    case 'activity':
      $scope.provider = new ActivityProvider(api, $scope, $scope.paramTimestamp, $scope.id_rs, $scope.filter);
      $scope.provider.reload();
      break;
    case 'messages':
      $scope.provider = new MessagesProvider(api, $scope, $scope.paramTimestamp, $scope.id_rs);
      $scope.provider.reload();
      break;
    case 'blocks':
      $scope.provider = new BlocksProvider(api, $scope, $scope.paramTimestamp, $scope.id_rs);
      $scope.provider.reload();
      break;
    case 'aliases':
      $scope.provider = new AliasProvider(api, $scope, 10, $scope.id_rs);
      $scope.provider.reload();
      break;
    case 'fim_aliases':
      $scope.provider = new NamespacedAliasProvider(api, $scope, 10, $scope.id_rs);
      $scope.provider.reload();
      break;
    case 'currency':
      $scope.provider = new CurrencyProvider(api, $scope, 10, $scope.id_rs);
      $scope.provider.reload();
      break;
    case 'assets':
      $scope.provider = new AssetsProvider(api, $scope, 10, $scope.id_rs);
      $scope.provider.reload();
      break;
    case 'sell_orders':
      $scope.provider = new SellOrderProvider(api, $scope, 10, $scope.id_rs);
      $scope.provider.reload();
      break;
    case 'buy_orders':
      $scope.provider = new BuyOrderProvider(api, $scope, 10, $scope.id_rs);
      $scope.provider.reload();
      break;
    case 'goods':
      break;
    case 'leasing':
      $scope.provider = new AccountLessorsProvider(api, $scope, $scope.id_rs);
      $scope.provider.reload();
      break;
    case 'payments':
      if (!$rootScope.currentAccount || $scope.id_rs != $rootScope.currentAccount.id_rs) {
        $rootScope.loginWizard('signin', {}, $location.url());
        $location.path('/start');
        return;
      }
      $scope.provider = new PaymentsProvider(api, $scope, $scope.id_rs);
      break;
    case 'listing':
      $scope.provider = new AllGoodsProvider(api, $scope, 10, $scope.id_rs);
      $scope.provider.reload();
      break;
    case 'pastorders':
      $scope.provider = new PastGoodsProvider(api, $scope, 10, $scope.id_rs);
      $scope.provider.reload();
      break;
    case 'solditems':
      // for pending
      $scope.soldGoods = new SoldGoodsProvider(api, $scope, 10, $scope.id_rs);
      $scope.soldGoods.reload();

      // for Completed
      $scope.deliveryConfirmedGoods = new DeliveryConfirmedGoodsProvider(api, $scope, $scope.id_rs);
      $scope.deliveryConfirmedGoods.reload();
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

  $scope.followThisUser = function () {
    $rootScope.followUser($scope.id_rs).then(
      function (following) {
        $scope.$evalAsync(function () {
          $scope.following = following;
        });
      }
    );
  }

  $scope.startForging = function () {
    plugins.get('transaction').get('startForging').execute($scope.id_rs).then(
      function () {
        if ($scope.forger) {
          $scope.forger.reload();
        }
      }
    );
  }

  $scope.stopForging = function () {
    plugins.get('transaction').get('stopForging').execute($scope.id_rs).then(
      function () {
        if ($scope.forger) {
          $scope.forger.reload();
        }
      }
    );
  }

  $scope.showAccountRewardInfo = function (accountId) {

    api.engine.socket().callAPIFunction({
      requestType: 'getAccountRewardTotals',
      account: accountId
    }).then(function (response) {
      var rewardTotals = response.rewardTotals
      var rewardTotalsDisplayed
      if (rewardTotals) {
        rewardTotalsDisplayed = rewardTotals
            .sort(function (a, b) {
              return a.name.localeCompare(b.name)
            })
            .map(function (item) {
              var amountFormatted = nxt.util.commaFormat(nxt.util.convertToQNTf(item.amount, item.decimals))
              var result = item.name + " <b>" + amountFormatted + " " + item.assetName + "</b>"
              if (item.campaignId && !(item.campaignId == 0 || item.campaignId == -1)) {
                result = result + "<br><small><i>campaign " + item.campaignId + "</i></small>"
              }
              return result
            })
      }
      var displayingObject = {
        "Items": rewardTotalsDisplayed,
      }

      var inspector = plugins.get('inspector')
      inspector.inspect({
        title: "Reward amounts for account " + response.accountRS,
        object: displayingObject,
        name: "rewardTotals"
      })
    })
    return false
  }

  $scope.showRewardInfo = function (height) {

    api.engine.socket().callAPIFunction({
      requestType: 'getRewardTotals',
      fromHeight: height,
      toHeight: height + 1
    }).then(function(response) {
      var rewardTotals = response.rewardTotals
      var rewardTotalsDisplayed
      if (rewardTotals) {
        rewardTotalsDisplayed = rewardTotals.map(function(item) {
          var amountFormatted = nxt.util.commaFormat(nxt.util.convertToQNTf(item.amount, item.decimals))
          var result = item.name + " <b>" + amountFormatted + " " + item.assetName + "</b> &#8594; " + item.accountRS
          if (item.campaignId && !(item.campaignId == 0 || item.campaignId == -1)) {
            result = result + "<br><small><i>campaign " + item.campaignId + "</i></small>"
          }
          return result
        })
      }
      var displayingObject = {
        "Items": rewardTotalsDisplayed
      }

      var inspector = plugins.get('inspector');
      inspector.inspect({
        title: "Reward amounts at height " + height,
        object: displayingObject,
        name: "rewardTotals"
      });
    });

    return false;
  }


});

})();