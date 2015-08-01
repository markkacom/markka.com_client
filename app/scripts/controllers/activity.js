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

module.controller('ActivityController', function($scope, $location, $routeParams, nxt, requests, $q, $sce, 
  ActivityProvider, BlocksProvider, ForgersProvider, StatisticsProvider, AllAssetsProvider, BlockStateProvider,
  $timeout, dateParser, dateFilter, $rootScope) {

  $rootScope.paramEngine  = $routeParams.engine;
  $scope.paramEngine      = $routeParams.engine;
  $scope.paramSection     = $routeParams.section;
  $scope.paramPeriod      = $routeParams.period;
  $scope.paramTimestamp   = 0;
  $scope.statistics       = {};
  $scope.blockstate       = {};
  $scope.breadcrumb       = [];
  $scope.filter           = {};

  if      ($scope.paramEngine == 'nxt') { var api = nxt.nxt(); }
  else if ($scope.paramEngine == 'fim') { var api = nxt.fim();  }
  else                                  { 
    $location.path('/activity/fim/activity/latest'); 
    return; 
  }

  if (['activity', 'blockchain', 'forgers', 'assets'].indexOf($scope.paramSection) == -1) {
    $location.path('/activity/'+$scope.paramEngine+'/activity/latest');
    return;
  }

  /* Breadcrumbs */
  $scope.breadcrumb.push({
    label: 'translate.home',
    href:  "#/home/"+$scope.paramEngine+"/activity/latest",
    translate: true
  });
  $scope.breadcrumb.push({
    label: 'translate.explorer',
    href:  '#/activity/fim/activity/latest',
    translate: true
  });
  $scope.breadcrumb.push({
    label: api.engine.symbol,
    active:  true
  });
  $scope.breadcrumb.push({
    label: 'translate.'+$scope.paramSection,
    translate:  true
  });
  if (['activity','blockchain'].indexOf($scope.paramSection) != -1) {
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

  switch ($scope.paramSection) {
    case 'activity':
      $scope.showFilter = true;
      $scope.showTransactionFilter = true;
      $scope.provider = new ActivityProvider(api, $scope, $scope.paramTimestamp, null, $scope.filter);
      $scope.provider.reload();
      break;
    case 'blockchain':
      $scope.showFilter = true;
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
      $scope.provider = new AllAssetsProvider(api, $scope, 10);
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
});
})();