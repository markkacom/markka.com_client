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
  $routeProvider.when('/home/:engine/:section/:period', {
    templateUrl: 'partials/home.html',
    controller: 'HomeController'
  });
});

module.controller('HomeController', function ($scope, $rootScope, plugins, settings, $timeout,
  $route, $routeParams, $location, nxt, accountsService, RecentTransactionsProvider, BalanceProvider,
  dateParser, dateFilter, $translate, modals) {

  $rootScope.paramEngine  = $routeParams.engine;
  $scope.paramEngine      = $routeParams.engine;
  $scope.paramSection     = $routeParams.section;
  $scope.paramPeriod      = $routeParams.period;
  $scope.paramTimestamp   = nxt.util.convertToEpochTimestamp(Date.now()) + (24 * 60 * 60);
  $scope.accounts         = [];
  var accounts_hash       = {};

  $scope.showFilter       = 'activity' == $scope.paramSection;
  $scope.showTransactionFilter = 'activity' == $scope.paramSection;

  if ($scope.paramEngine == 'fim') {
    var api = nxt.fim();
  }
  else if ($scope.paramEngine == 'nxt') {
    var api = nxt.nxt();
  }
  else {
    $location.path('home/fim/activity/latest');
    return;
  }

  if (['activity', 'balance'].indexOf($scope.paramSection) == -1) {
    $location.path('home/'+$scope.paramEngine+'/activity/latest');
    return;
  }

  /* Date picker */
  $scope.dt     = null;
  $scope.format = 'dd-MMMM-yyyy';
  if ($scope.paramPeriod != 'latest') {
    var d = dateParser.parse($scope.paramPeriod, $scope.format);
    if (!d) {
      $location.path('home/'+$scope.paramEngine+'/'+$scope.paramSection+'/latest');
      return;
    }
    $scope.dt = $scope.paramPeriod;
    /* Timestamp is for 00:00 hour on selected day */
    d = new Date(d.getFullYear(), d.getMonth(), d.getDate()+1, 0, 0, 0);
    $scope.paramTimestamp = nxt.util.convertToEpochTimestamp(d.getTime());
  }

  $scope.symbol   = api.engine.symbol;

  accountsService.onChange($scope, function () {
    $location.path('home/'+$scope.paramEngine+'/'+$scope.paramSection+'/'+$scope.paramPeriod);
    $route.reload();
  });

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
      $location.path('home/'+$scope.paramEngine+'/'+$scope.paramSection+'/'+formatted);
    }
  });

  $scope.filter = {};
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

  var promise = accountsService.getAll(api.engine.type == nxt.TYPE_FIM ? accountsService.FIM_FILTER : accountsService.NXT_FILTER);
  promise.then(function (accounts) {
    $scope.$evalAsync(function () {
      $scope.accounts  = accounts;
      accounts_hash = {};

      var filtered = accounts.filter(function (a) {
        return !a.excluded;
      })
      var flattend = filtered.map(function (a) {
        accounts_hash[a.id_rs] = a;
        return a.id_rs
      });

      var args = { accounts: flattend, excludeForging: 'true' };
      api.engine.socket().getAccounts(args).then(
        function (data) {
          $scope.$evalAsync(function () {
            angular.forEach(data.accounts, function (balance) {
              balance.balanceNXT = nxt.util.convertToNXT(balance.balanceNQT);
              balance.unconfirmedBalanceNXT = nxt.util.convertToNXT(balance.unconfirmedBalanceNQT);
              balance.effectiveBalanceNXT = nxt.util.commaFormat(String(balance.effectiveBalanceNXT));
              balance.guaranteedBalanceNXT = nxt.util.convertToNXT(balance.guaranteedBalanceNQT);
              accounts_hash[balance.accountRS].balance = balance;
            });
          });
        }
      );

      if ($scope.paramSection == 'activity') {
        $scope.provider = $scope.transactionProvider = new RecentTransactionsProvider(api, $scope, $scope.paramTimestamp, flattend, $scope.filter);
        $scope.transactionProvider.reload();
      }
      else if ($scope.paramSection == 'balance') {
        $scope.provider = $scope.balanceProvider = new BalanceProvider(api, $scope, flattend);
        $scope.balanceProvider.reload();
      }
    });
  });

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

      $scope.filterChanged();
    });
  }

  $scope.filterChanged = function () {
    $scope.provider.applyFilter($scope.filter);
  }

  $scope.selectedThemeName = settings.get('themes.default.theme');

  settings.resolve('themes.default.theme', function (theme) {
    $timeout(function () {
      var s = (theme||'');
      $scope.selectedThemeName = s[0].toUpperCase() + s.slice(1);
    });
  });

  $scope.excludeAccount = function (event, account) {
    event.preventDefault();
    account.update({excluded: true});
  }

  $scope.includeAccount = function (event, account) {
    event.preventDefault();
    account.update({excluded: false});
  }

});

})();
