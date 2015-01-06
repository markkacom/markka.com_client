(function () {
'use strict';
var module = angular.module('fim.base');
module.controller('ActivityPlugin', function($scope, $state, $stateParams, nxt, requests, $q, $sce) {

  $scope.paramEngine    = $stateParams.engine;
  $scope.paramTimestamp = parseInt($stateParams.timestamp);
  $scope.paramCount     = parseInt($stateParams.count);

  $scope.isLoading      = true;
  $scope.paramTimestamp = isNaN($scope.paramTimestamp) ? nxt.util.convertToEpochTimestamp(Date.now()) : $scope.paramTimestamp;
  $scope.paramCount     = isNaN($scope.paramCount) ? 20 : $scope.paramCount;
  
  if ($scope.paramEngine == 'nxt') {
    var api = nxt.nxt();
    var db  = api.engine.db;
  }
  else if ($scope.paramEngine == 'fim') {
    var api = nxt.fim();
    var db  = api.engine.db;
  }
  else {
    $state.go('activity', {engine: 'fim'});
    return;
  }

  $scope.activities = [];
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
    $scope.activities = [];
    $scope.loadMore();
  }

  $scope.loadMore = function () {
    var a = $scope.activities.length ? $scope.activities[$scope.activities.length-1] : null;
    getNetworkData(a ? a.timestamp : $scope.paramTimestamp);
  }

  function argsToArray(obj) {
    var result = [];
    for (var name in obj) { result.push(name+'='+obj[name]); }
    return result;
  }

  function createMofoGetActivityArgs(timestamp) {
    var args = {
      timestamp:        timestamp,
      includeAssetInfo: true,
      includeBlocks:    false,
      requestType:      'mofoGetActivity'
    };
    var filters = [];
    if ( ! $scope.filter.payments) filters = filters.concat('0:0');
    if ( ! $scope.filter.messages) filters = filters.concat('1:0');
    if ( ! $scope.filter.aliases) filters = filters.concat('1:1','1:6','1:7');
    if ( ! $scope.filter.namespacedAliases) filters = filters.concat('40:0');
    if ( ! $scope.filter.polls) filters = filters.concat('1:2','1:3');
    if ( ! $scope.filter.accountInfo) filters = filters.concat('1:5');
    if ( ! $scope.filter.announceHub) filters = filters.concat('1:4');
    if ( ! $scope.filter.goodsStore) filters = filters.concat('3:0','3:1','3:2','3:3','3:4','3:5','3:6','3:6','3:7');
    if ( ! $scope.filter.balanceLeasing) filters = filters.concat('4:0');
    if ( ! $scope.filter.trades) args.includeTrades = false;
    if ( ! $scope.filter.assetIssued) filters = filters.concat('2:0');
    if ( ! $scope.filter.assetTransfer) filters = filters.concat('2:1');
    if ( ! $scope.filter.assetOrder) filters = filters.concat('2:2','2:3','2:4','2:5');

    if (filters.length) args.transactionFilter = filters.join(',');
    return args;
  }

  function createMofoGetActivityStatisticsArgs() {
    return { requestType: 'mofoGetActivityStatistics' };
  }

  function getNetworkData(timestamp) {
    $scope.$evalAsync(function () {
      $scope.isLoading = true;
    });    
    var podium = requests.theater.createPodium('activity:load', $scope);

    api.mofoCombine({
      combinedRequest: JSON.stringify({
        requests: [
          argsToArray(createMofoGetActivityArgs(timestamp)),
          argsToArray(createMofoGetActivityStatisticsArgs())
        ]
      })
    }, {
      podium:   podium,
      priority: 8
    }).then(
      function (data) {
        console.log('activity:data',data)
        $scope.$evalAsync(function () {
          processMofoGetActivity(data[0].response);
          processMofoGetActivityStatistics(data[1].response);
          $scope.isLoading = false;
        });
      },
      function (data) {
        console.log('activity:error',data)
        $scope.$evalAsync(function () {
          $scope.isLoading = false;
        });        
      }
    );



    // api.mofoGetActivity(createMofoGetActivityArgs(timestamp), {
    //   podium:           podium,
    //   priority:         8
    // }).then(
    //   function (data) {
    //     $scope.$evalAsync(function () {
    //       processMofoGetActivity(data);
    //       $scope.isLoading = false;
    //     });
    //   },
    //   function (data) {
    //     console.log('activity:error',data)
    //     $scope.$evalAsync(function () {
    //       $scope.isLoading = false;
    //     });        
    //   }
    // );
  }

  function getHighestIndex(a, b) {
    return (a >= b) ? 0 : 1;
  }

  function processMofoGetActivity(data) {
    var trades = new Iterator(data.trades||[]);
    var transactions = new Iterator(data.transactions||[]);

    var trade = null;
    var transaction = null;

    while (trades.hasMore() || transactions.hasMore()) {      
      if (trade == null) {
        trade = trades.hasMore() ? trades.next() : null;
      }
      if (transaction == null) {
        transaction = transactions.hasMore() ? transactions.next() : null;
      }

      switch (getHighestIndex(transaction == null ? 0 : transaction.timestamp, 
                              trade == null ? 0 : trade.timestamp)) {
        case 0: {
          if (transaction != null) {
            $scope.activities.push({
              renderedHTML: api.renderer.getHTML(transaction),
              timestamp: transaction.timestamp,
              date: nxt.util.formatTimestamp(transaction.timestamp)
            });
            transaction = null;
          }
          break;
        }
        case 1: {
          if (trade != null) {
            $scope.activities.push({
              renderedHTML: renderTrade(trade),
              timestamp: trade.timestamp,
              date: nxt.util.formatTimestamp(trade.timestamp)
            });
            trade = null;
          }
          break;
        }
      }
    }
  }

  function processMofoGetActivityStatistics(data) {
    $scope.$evalAsync(function () {
      $scope.statistic = {
        lastBlockDate: nxt.util.formatTimestamp(data.lastBlock.timestamp),
        lastBlockHeight: data.lastBlock.height,
        lastBlockID: data.lastBlock.block,
        average: data.averageBlockTime24H,
        transactionCountToday: data.transactionCountToday,
        transactionCountWeek: data.transactionCountWeek,
        transactionCountMonth: data.transactionCountMonth,
        rewardsToday: nxt.util.convertToNXT(data.rewardsToday),
        rewardsWeek: nxt.util.convertToNXT(data.rewardsWeek),
        rewardsMonth: nxt.util.convertToNXT(data.rewardsMonth)
      };
    });
  }

  function renderTrade(trade) {
    return '--';
  }

  getNetworkData($scope.paramTimestamp);
});
})();