(function () {
'use strict';

function GenericObserver(name, $scope, filter, sort, find, final) {
  this.name   = name;
  this.$scope = $scope;
  this.filter = filter;
  this.sort   = sort;
  this.find   = find || function () { return -1 };
  this.final  = final || function () { 
    $scope.$evalAsync(function () { 
      /* runs angular apply now */
    });
  }
}
GenericObserver.prototype = {
  create: function (objects) {
    this.$scope[this.name] = this.$scope[this.name].concat(this.filter ? objects.filter(this.filter) : objects) ;
    if (this.sort) {
      this.$scope[this.name].sort(this.sort);
    }
  },
  update: function (objects) {
    objects = this.filter ? objects.filter(this.filter) : objects;
    for (var i=0,l=objects.length; i<l; i++) {
      var index = this.find(this.$scope[this.name], objects[i]);
      if (index != -1) {
        angular.extend(this.$scope[this.name], objects[i]);
      }
    }
  },
  remove: function (objects) { 
    objects = this.filter ? objects.filter(this.filter) : objects;
    for (var i=0,l=objects.length; i<l; i++) {
      var index = this.find(this.$scope[this.name], objects[i]);
      if (index != -1) {
        this.$scope[this.name].splice(index, 1);
      }
    }
  },
  finally: function () {
    this.final();
  }
}

function initAssets(podium, api, $scope) {
  api.engine.db.assets.toArray().then(
    function (assets) {
      $scope.$evalAsync(function () {
        $scope.assets = assets;
        $scope.assets.sort($scope.assetSorter);
      });
      api.engine.db.assets.addObserver($scope, createAssetsObserver($scope));
    }
  );
}

function createAssetsObserver($scope, asset_id) {
  return new GenericObserver('assets', $scope, 
    null,
    $scope.assetSorter,
    function find(assets, asset) {
      for (var i=0,l=assets.length; i<l; i++) {
        var a = assets[i];
        if (a.asset == asset.asset) {
          return i;
        }
      }
      return -1;
    }
  );
}

function sortTrades(a,b) {
  if (a.timestamp > b.timestamp)
    return -1;
  else if (a.timestamp < b.timestamp)
    return 1;
  return 0;
}

function initTrades(podium, api, asset_id, $scope, db) {
  api.engine.db.trades.where('asset').equals(asset_id).toArray().then(
    function (_trades) {
      $scope.$evalAsync(function () {
        $scope.trades = _trades;
        $scope.trades.sort(sortTrades);
      });
      api.engine.db.trades.addObserver($scope, createTradesObserver($scope, asset_id));
      downloadTrades(podium, api, asset_id, $scope, db);
    }
  );
}

function createTradesObserver($scope, asset_id) {
  return new GenericObserver('trades', $scope, 
    function filter(trade) { 
      return trade.asset == asset_id;
    },
    null,
    function find(trades, trade) {
      for (var i=0,l=trades.length; i<l; i++) {
        var t = trades[i];
        if (t.timestamp == trade.timestamp && t.askOrder == trade.askOrder && 
            t.bidOrder == trade.bidOrder && t.asset == trade.asset) {
          return i;
        }
      }
      return -1;
    }, 
    function _finally() {
      $scope.$evalAsync(function () {
        $scope.trades.sort(sortTrades);
      });      
    }
  );
}

function downloadTrades(podium, api, asset_id, $scope, db) {
  api.getTrades({
    asset: asset_id,
    lastIndex: 20
  }, {
    podium: podium,
    priority: 2
  }).then(
    function (trades) {
      db.transaction('rw', api.engine.db.trades, function () {
        for(var i=0; i<trades.length; i++) {
          storeTrade(api, trades[i]);
        }
      });
    }
  );
}

function storeTrade(api, trade) {
  api.engine.db.trades.where('timestamp').equals(trade.timestamp).and(
    function (_trade) { 
      return _trade.askOrder == trade.askOrder && 
             _trade.bidOrder == trade.bidOrder && 
             _trade.priceNQT == trade.priceNQT;
    }).count().then(
    function (count) {
      if (count == 0) {
        api.engine.db.trades.put(trade);
      }
    }
  );
}

function sortAsks(a, b) {
  if (parseInt(a.priceNQT) < parseInt(b.priceNQT))
    return -1;
  else if (parseInt(a.priceNQT) > parseInt(b.priceNQT))
    return 1;
  else {
    if (a.order > b.order)
      return -1;
    else if (a.order < b.order)
      return 1;
  }
  return 0;
}

function initAsks(podium, api, asset_id, $scope, db) {
  api.engine.db.asks.where('asset').equals(asset_id).toArray().then(
    function (orders) {
      $scope.asks = [];
      for (var i=0,l=orders.length; i<l; i++) {
        $scope.asks.push(orders[i]);
      }
      $scope.asks.sort(sortAsks);
      $scope.$evalAsync(function () { });
      api.engine.db.asks.addObserver($scope, createAsksObserver($scope, asset_id));
      downloadAsks(podium, api, asset_id, $scope, db);
    }
  );
}

function createAsksObserver($scope, asset_id) {
  return new GenericObserver('asks', $scope, 
    function filter(order) { 
      return order.asset == asset_id;
    },
    sortAsks,
    function find(asks, order) {
      for (var i=0,l=asks.length; i<l; i++) {
        var a = asks[i];
        if (a.order == order.order) {
          return i;
        }
      }
      return -1;
    }
  );
}

function downloadAsks(podium, api, asset_id, $scope, db) {
  api.getAskOrders({
    asset: asset_id,
    limit: 50
  }, {
    podium: podium,
    priority: 2
  }).then(
    function (asks) {
      db.transaction('rw', api.engine.db.asks, function () {
        for(var i=0,l=asks.length; i<l; i++) {
          api.engine.db.asks.put(asks[i]);
        }
      });
    }
  );
}

function sortBids(a, b) {
  if (parseInt(a.priceNQT) > parseInt(b.priceNQT))
    return -1;
  else if (parseInt(a.priceNQT) < parseInt(b.priceNQT))
    return 1;
  else {
    if (a.order > b.order)
      return -1;
    else if (a.order < b.order)
      return 1;
  }
  return 0;
}

function initBids(podium, api, asset_id, $scope, db) {
  api.engine.db.bids.where('asset').equals(asset_id).toArray().then(
    function (orders) {
      $scope.bids = [];
      for (var i=0,l=orders.length; i<l; i++) {
        $scope.bids.push(orders[i]);
      }
      $scope.bids.sort(sortBids);
      $scope.$evalAsync(function () { });
      api.engine.db.bids.addObserver($scope, createBidsObserver($scope, asset_id));
      downloadBids(podium, api, asset_id, $scope, db);
    }
  );
}

function createBidsObserver($scope, asset_id) {
  return new GenericObserver('bids', $scope, 
    function filter(order) { 
      return order.asset == asset_id;
    },
    sortBids,
    function find(bids, order) {
      for (var i=0,l=bids.length; i<l; i++) {
        var b = bids[i];
        if (b.order == order.order) {
          return i;
        }
      }
      return -1;
    }
  );
}

function downloadBids(podium, api, asset_id, $scope, db) {
  api.getBidOrders({
    asset: asset_id,
    limit: 50
  }, {
    podium: podium,
    priority: 2
  }).then(
    function (bids) {
      db.transaction('rw', api.engine.db.bids, function () {
        for(var i=0,l=bids.length; i<l; i++) {
          api.engine.db.bids.put(bids[i]);
        }
      });
    }
  );
}

function initBalance(podium, api, $scope, nxt) {
  $scope.$evalAsync(function () {
    $scope.balance = '0';
    $scope.unconfirmedBalance = '0';
  });  
  api.getAccount({
    account: $scope.selectedAccount.id_rs
  }, {
    priority: 5,
    podium: podium
  }).then(
    function (data) {
      var balanceQNT='0', unconfirmedBalanceQNT='0', b, asset = $scope.selectedAsset;
      if (data.assetBalances) {
        for (var i=0; i<data.assetBalances.length; i++) {
          b = data.assetBalances[i];
          if (b.asset == asset.asset) {
            balanceQNT = b.balanceQNT;
            break;
          }
        }
      }
      if (data.unconfirmedAssetBalances) {
        for (var i=0; i<data.unconfirmedAssetBalances.length; i++) {
          b = data.unconfirmedAssetBalances[i];
          if (b.asset == asset.asset) {
            unconfirmedBalanceQNT = b.unconfirmedBalanceQNT;
            break;
          }
        }
      }
      $scope.$evalAsync(function () {
        $scope.balance = nxt.util.convertToQNT(balanceQNT, asset.decimals);
        $scope.unconfirmedBalance = nxt.util.convertToQNT(unconfirmedBalanceQNT, asset.decimals);
      });
    }
  );
}

function existsInArray(array, callback) {
  for (var i=0; i<array.length; i++) {
    if (callback.call(null, array[i])) {
      return true;
    }
  }
  return false;
}

function createMyAsksObserver($scope, asset_id, id_rs) {
  return new GenericObserver('myAsks', $scope, 
    function filter(order) { 
      return order.asset == asset_id && order.accountRS == id_rs;
    },
    sortAsks,
    function find(asks, order) {
      for (var i=0,l=asks.length; i<l; i++) {
        var b = asks[i];
        if (b.order == order.order) {
          return i;
        }
      }
      return -1;
    }
  );
}

function initMyAsks(podium, api, $scope, nxt) {
  api.engine.db.asks.where('asset').equals($scope.selectedAsset.asset).
      and(function (order) { return order.accountRS == $scope.selectedAccount.id_rs }).toArray().then(
    function (orders) {
      $scope.myAsks = [];
      for (var i=0,l=orders.length; i<l; i++) {
        $scope.myAsks.push(orders[i]);
      }
      $scope.myAsks.sort(sortAsks);
      $scope.$evalAsync(function () { });
      api.engine.db.asks.addObserver($scope, createMyAsksObserver($scope, $scope.selectedAsset.asset, $scope.selectedAccount.id_rs));
      downloadMyAsks(podium, api, $scope, nxt);
    }
  );
}

function downloadMyAsks(podium, api, $scope, nxt) {
  api.getAccountCurrentAskOrderIds({
    account: $scope.selectedAccount.id_rs,
    asset: $scope.selectedAsset.asset
  }, {
    priority: 5,
    podium: podium
  }).then(
    function (ids) {
      for (var i=0; i<ids.length; i++) {
        if (!existsInArray($scope.myAsks, function (order) { return order.order == ids[i]})) {
          downloadMyAsk(podium, api, $scope, nxt, ids[i]);
        }
      }
    }
  );
}

function downloadMyAsk(podium, api, $scope, nxt, id) {
  api.getAskOrder({
    order: id
  }, {
    priority: 5,
    podium: podium
  }).then(
    function (order) {
      api.engine.db.asks.put(order);
    }
  );
}

function createMyBidsObserver($scope, asset_id, id_rs) {
  return new GenericObserver('myBids', $scope, 
    function filter(order) { 
      return order.asset == asset_id && order.accountRS == id_rs;
    },
    sortBids,
    function find(bids, order) {
      for (var i=0,l=bids.length; i<l; i++) {
        var a = bids[i];
        if (a.order == order.order) {
          return i;
        }
      }
      return -1;
    }
  );
}

function initMyBids(podium, api, $scope, nxt) {
  api.engine.db.bids.where('asset').equals($scope.selectedAsset.asset).
      and(function (order) { return order.accountRS == $scope.selectedAccount.id_rs }).toArray().then(
    function (orders) {
      $scope.myBids = [];
      for (var i=0,l=orders.length; i<l; i++) {
        $scope.myBids.push(orders[i]);
      }
      $scope.myBids.sort(sortBids);
      $scope.$evalAsync(function () { });
      api.engine.db.bids.addObserver($scope, createMyBidsObserver($scope, $scope.selectedAsset.asset, $scope.selectedAccount.id_rs));
      downloadMyBids(podium, api, $scope, nxt);
    }
  );
}

function downloadMyBids(podium, api, $scope, nxt) {
  api.getAccountCurrentBidOrderIds({
    account: $scope.selectedAccount.id_rs,
    asset: $scope.selectedAsset.asset
  }, {
    priority: 5,
    podium: podium
  }).then(
    function (ids) {
      for (var i=0; i<ids.length; i++) {
        if (!existsInArray($scope.myBids, function (order) { return order.order == ids[i]})) {
          downloadMyBid(podium, api, $scope, nxt, ids[i]);
        }
      }
    }
  );
}

function downloadMyBid(podium, api, $scope, nxt, id) {
  api.getBidOrder({
    order: id
  }, {
    priority: 5,
    podium: podium
  }).then(
    function (order) {
      api.engine.db.bids.put(order);
    }
  );
}

function initMyTrades(podium, api, $scope, nxt) {

}

var module = angular.module('fim.base');
module.controller('ExchangePluginController', function($scope, $rootScope, $stateParams, nxt, requests, $state, db, $timeout, alerts, plugins) {

  if ($stateParams.engine == 'nxt') {
    var api = nxt.nxt();
  }
  else if ($stateParams.engine == 'fimk') {
    var api = nxt.fim();
  }
  else {
    $state.go('home', {reload:true});
    return;
  }

  var podium    = requests.theater.createPodium('exchange', $scope);

  $scope.engine             = $stateParams.engine;
  $scope.assets             = [];
  $scope.trades             = [];
  $scope.asks               = [];
  $scope.bids               = [];

  $scope.myAsks             = [];
  $scope.myBids             = [];
  $scope.myTrades           = [];
  $scope.balance            = '';
  $scope.unconfirmedBalance = '';

  $scope.sorters = {};

  function defaultAssetSort(a, b) {
    if (a.asset > b.asset)
      return -1;
    else if (a.asset < b.asset)
      return 1;
    return 0;
  }

  $scope.sorters.byNumberOfTrades = function byNumberOfTrades(a,b) {
    if (a.numberOfTrades > b.numberOfTrades)
      return -1;
    else if (a.numberOfTrades < b.numberOfTrades)
      return 1;
    return defaultAssetSort(a, b);
  }

  $scope.sorters.byName = function byName(a,b) {
    if (a.name < b.name)
      return -1;
    else if (a.name > b.name)
      return 1;
    return defaultAssetSort(a, b);
  }

  $scope.sorters.byIssuer = function byIssuer(a,b) {
    if (a.accountRS < b.accountRS)
      return -1;
    else if (a.accountRS > b.accountRS)
      return 1;
    return defaultAssetSort(a, b);
  }  

  $scope.assetSorter = $scope.sorters.byNumberOfTrades;


  // $scope.comments = [{
  //   id_rs: 'NXT-JXRD-GKMR-WD9Y-83CK7',
  //   name: 'Alice',
  //   date: '5 minutes ago',
  //   content: 'Aswome asset'
  // }, {
  //   id_rs: 'NXT-MRBN-8DFH-PFMK-A4DBM',
  //   name: 'Bob',
  //   date: '6 hours ago',
  //   content: 'WTB 2 mil PM me'
  // }, {
  //   id_rs: 'NXT-J62B-CNAR-34YW-4RCFN',
  //   name: 'Issuer',
  //   date: '6 hours ago',
  //   content: 'Weekly status update. Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat.'
  // }];

  var timer = false, unwatch = null;
  if ($stateParams.asset) {
    api.engine.db.assets.where('asset').equals($stateParams.asset).first().then(
      function (asset) {
        if (asset) {
          $scope.$evalAsync(function () {
            $scope.selectedAsset = asset;
            $scope.selectedAsset.engine = api.type == nxt.nxt().type ? 'nxt' : 'fimk';
            if ($scope.selectedAccount) {
              refresh();
            }
          });
        }
        else {
          /* The asset was probably not yet downloaded - must watch for it to arive */
          unwatch = $scope.$watch('assets', function () {
            if(timer){
              $timeout.cancel(timer)
            }  
            timer = $timeout(grabSelectedAsset, 100, false);
          });
        }
      }
    );
  }

  function grabSelectedAsset() {
    if (!$scope.selectedAsset) {
      for (var i=0,l=$scope.assets.length; i<l; i++) {
        if ($scope.assets[i].asset == $stateParams.asset) {
          $scope.$evalAsync(function () {
            $scope.selectedAsset = $scope.assets[i];
          });
          if (unwatch) {
            unwatch();
            unwatch = null;
          }
          break;
        }
      }
    }
  }

  initAssets(podium, api, $scope);
  if ($stateParams.asset) {  
    initTrades(podium, api, $stateParams.asset, $scope, db);
    initAsks(podium, api, $stateParams.asset, $scope, db);
    initBids(podium, api, $stateParams.asset, $scope, db);
  }
  else {
    var unwatch = $scope.$watch('assets', function () {
      if ($scope.assets.length) {
        $state.transitionTo('assets', {engine: $stateParams.engine, asset: $scope.assets[0].asset}, {reload:true});
        unwatch();
      }
    });
  }

  function refresh() {
    initBalance(podium, api, $scope, nxt);
    initMyAsks(podium, api, $scope, nxt, db);
    initMyBids(podium, api, $scope, nxt, db);
    initMyTrades(podium, api, $scope, nxt, db);
  }  

  $scope.selectedAccount = $rootScope.selectedAccount;

  function filter(array) {
    var prefix = $scope.engine == 'nxt' ? 'NXT-' : 'FIM-';
    return array.filter(function (obj) {
      return obj.id_rs.indexOf(prefix) == 0;
    });
  }

  if (!$scope.selectedAccount) {
    db.accounts.orderBy('name').toArray().then(
      function (accounts) {
        accounts = filter(accounts);
        $scope.$evalAsync(function () {
          $rootScope.selectedAccount = accounts[0];
          $state.go($state.current, $stateParams, {reload: true}); 
        });
      }
    ).catch(alerts.catch("Could not load accounts"));
  }

  $scope.selectAccount = function () {
    var engine = $scope.engine == 'nxt' ? 'TYPE_NXT' : 'TYPE_FIM';
    plugins.get('contacts').select({include: ['accounts'], engine: engine}).then(function (account) {
      $rootScope.selectedAccount = account;
      $state.go($state.current, $stateParams, {reload: true}); 
    });
  }

  $scope.downloadHistory = function () {
    api.engine.db.trades.where('asset').equals($scope.selectedAsset.asset).count().then(
      function (count) {
        api.getTrades({
          asset: $scope.selectedAsset.asset,
          firstIndex: count-1,
          lastIndex: count+200
        }, {
          podium: podium,
          priority: 5
        }).then(
          function (trades) {
            db.transaction('rw', api.engine.db.trades, function () {
              for(var i=0; i<trades.length; i++) {
                api.engine.db.trades.put(trades[i]);
              }
            });
          }
        );
      }
    );
  }

});
})();