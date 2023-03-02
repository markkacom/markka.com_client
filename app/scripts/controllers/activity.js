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
    .when('/activity/:engine/:section/:period', {
      templateUrl: 'partials/activity.html',
      controller: 'ActivityController'
    });
});

module.controller('ActivityController', function($scope, $location, $routeParams, nxt, $q, $sce,
  ActivityProvider, BlocksProvider, ForgersProvider, StatisticsProvider, AllAssetsProvider, BlockStateProvider, PeerProvider,
  $timeout, dateParser, dateFilter, $rootScope, plugins) {

  $rootScope.paramEngine  = $routeParams.engine;
  $scope.paramEngine      = $routeParams.engine;
  $scope.paramSection     = $routeParams.section;
  $scope.paramPeriod      = $routeParams.period;
  $scope.paramTimestamp   = 0;
  $scope.statistics       = {};
  $scope.blockstate       = {};
  $scope.filter           = {};

  if      ($scope.paramEngine == 'nxt') { var api = nxt.nxt(); }
  else if ($scope.paramEngine == 'fim') { var api = nxt.fim();  }
  else                                  {
    $location.path('/activity/fim/activity/latest');
    return;
  }

  if (['activity', 'blockchain', 'forgers', 'assets', 'peers'].indexOf($scope.paramSection) == -1) {
    $location.path('/activity/'+$scope.paramEngine+'/activity/latest');
    return;
  }

  /* Date picker */
  $scope.dt     = null;
  $scope.format = 'dd-MMMM-yyyy';
  if ($scope.paramPeriod != 'latest') {
    var d = dateParser.parse($scope.paramPeriod, $scope.format);
    if (!d) {
      $location.path('/activity/'+$scope.paramEngine+'/'+$scope.paramSection+'/latest');
      return;
    }
    $scope.dt = $scope.paramPeriod;
    /* Timestamp is for 00:00 hour on selected day */
    d = new Date(d.getFullYear(), d.getMonth(), d.getDate()+1, 0, 0, 0);
    $scope.paramTimestamp = nxt.util.convertToEpochTimestamp(d.getTime());
  }

  $scope.symbol = api.engine.symbol;

  $scope.blockstate['TYPE_FIM'] = new BlockStateProvider(nxt.fim(), $scope);
  $scope.blockstate['TYPE_FIM'].load();

  if ($rootScope.enableDualEngines) {
    $scope.blockstate['TYPE_NXT'] = new BlockStateProvider(nxt.nxt(), $scope);
    $scope.blockstate['TYPE_NXT'].load();
  }

  $scope.getEngineUrl = function () {
    var url = api.engine.socket().url;
    if (!url) {
      console.debug("current url is empty");
      return "none";
    }
    return url;
  };

  $scope.setEngineUrl = function (url) {
    api.engine.forceSocketURL(url);
  };

  $scope.urlList = ["cloud.mofowallet.org", "fimk1.heatwallet.com", "localhost"];

  switch ($scope.paramSection) {
    case 'activity':
      $scope.showFilter = !TRADE_UI_ONLY;
      $scope.showTransactionFilter = true;
      $scope.provider = new ActivityProvider(api, $scope, $scope.paramTimestamp, null, $scope.filter);
      $scope.provider.reload();
      break;
    case 'blockchain':
      $scope.showFilter = !TRADE_UI_ONLY;
      $scope.provider = new BlocksProvider(api, $scope, $scope.paramTimestamp);
      $scope.provider.reload();
      break;
    case 'forgers':
      $scope.showFilter = false;
      $scope.provider = new ForgersProvider(api, $scope);
      $scope.provider.reload();
      break;
    case 'assets':
      $scope.showFilter = false;
      $scope.provider = new AllAssetsProvider(api, $scope, 60);
      $scope.provider.reload();
      break;
    case 'peers':
      $scope.provider = new PeerProvider(api, $scope);
      $scope.provider.reload();
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
      $location.path('/activity/'+$scope.paramEngine+'/'+$scope.paramSection+'/'+formatted);
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

  $scope.loadStatistics = function (engine, collapse_var) {
    $scope[collapse_var] = !$scope[collapse_var];
    if (!$scope[collapse_var]) {
      if (!$scope.statistics[engine]) {
        var api = nxt.get(engine);
        $scope.statistics[engine] = new StatisticsProvider(api, $scope);
      }
      $scope.statistics[engine].load();
    }
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
