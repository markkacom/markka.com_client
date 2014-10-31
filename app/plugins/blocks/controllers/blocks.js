(function () {
'use strict';
var module = angular.module('fim.base');
module.controller('BlocksPlugin', function($scope, $state, $stateParams, nxt, $interval, ngTableParams, $q, $timeout, alerts, plugins) {

  $scope.engines = [{
    id: 'fimk',
    type: nxt.TYPE_FIM,
    symbol: 'FIMK'
  }, {
    id: 'nxt',
    type: nxt.TYPE_NXT,
    symbol: 'NXT'    
  }];
  
  $scope.selectedEngine       = null;
  $scope.selectedBlock        = null;

  angular.forEach($scope.engines, function (engine) {
    if ($stateParams.engine == engine.id) {
      $scope.selectedEngine = engine;
    }
  });

  if (!$scope.selectedEngine) {
    $state.go('blocks', {engine: $scope.engines[0].id});
    return;
  }

  if (!angular.isDefined($stateParams.height)) {
    $state.go('blocks', {engine: $scope.selectedEngine.id, height: 1});
    return;
  }

  function getLocal(key) {
    return localStorage["mofo.blocks."+$scope.selectedEngine.id+'.'+key];
  }  

  function setLocal(key, value) {
    localStorage["mofo.blocks."+$scope.selectedEngine.id+'.'+key] = value;
  }  

  function init() {

    /* The blocks loaded code requires this is set */
    if ($stateParams.height) {
      var block = { height: parseInt($stateParams.height), missing: true };
      manager.setSelectedBlock(block);
    }

    /* Load the blocks table first */
    $scope.blocksTableParams.total(manager.numberOfBlocks);
    $scope.blocksTableParams.reload();
    
    /* Load the selected block from the db */
    if (angular.isDefined($stateParams.height)) {
      var height = parseInt($stateParams.height);
      if (typeof height == 'number' && height >= 0) {
        api.engine.db.blocks.where('height').equals(height).first().then(
          function (block) {
            var block = block || { height: height, missing: true };
            manager.updateSelectedBlock(block);

            /* Download the selected block if we dont have it already */
            manager.downloadBlocks([block]);
          }
        );
      }
    }

    /* The manager will fetch the blockchain height from the network */
    manager.start();
  }  

  var api = nxt.get($scope.selectedEngine.type);
  var db  = api.engine.db;

  $scope.blocksTableParams = new ngTableParams({ page: 1, count: 10 }, 
    { total: 0,
      $scope: $scope,
      getData: function($defer, params) {
        var lower = (params.page() - 1) * params.count();
        var upper = params.page() * params.count();
        var l = lower;
        lower = Math.max(0, manager.numberOfBlocks - upper) || 0;
        upper = Math.max(0, manager.numberOfBlocks - l) || 0;

        manager.getBlocksRange(lower, upper).then(
          function (blocks) {
            $defer.resolve(blocks);
          },
          alerts.catch('Could not get full range '+lower+'/'+upper)
        );
      }
    }
  );

  $scope.transactionsTableParams = new ngTableParams({ page: 1, count: 6 }, 
    { total: 0,
      counts: [],
      $scope: $scope,
      getData: function($defer, params) {
        var lower = (params.page() - 1) * params.count();
        var upper = params.page() * params.count();

        manager.getTransactionsRange(lower, upper).then(
          function (transactions) {
            $defer.resolve(transactions);
          },
          alerts.catch('Could not get full range '+lower+'/'+upper)
        );
      }
    }
  ); 

  /* Blocks and transactions download manager */
  var manager = $scope.manager = {
    page: {
      blocks:       { lower: -1, upper: 0 },
      transactions: { lower: -1, upper: 0 }    
    },    
    numberOfBlocks: getLocal('numberOfBlocks')||1,
    lastBlockchainFeederHeight: getLocal('lastBlockchainFeederHeight')||1,
    cancellers:     {},
    interval:       10 * 1000,  

    start: function () {
      
      /* Interval that works on varying speed @see manager.interval */
      function variableInterval() {
        if (manager.interval) {
          manager.timeout = $timeout(
            function () {
              manager.oninterval();
              variableInterval();
            }, 
          manager.interval);
        }
      }

      variableInterval();
      manager.oninterval();
      
      $scope.$on('$destroy', function() {
        $timeout.cancel(manager.timeout);
        manager.interval = null;

        angular.forEach(manager.cancellers, function (canceller) {
          if (canceller.block) {
            canceller.block.resolve();
          }
          if (canceller.transaction) {
            canceller.transaction.resolve();
          }
        });
      });
    },

    setNumberOfBlocks: function (numberOfBlocks) {
      setLocal('numberOfBlocks', numberOfBlocks);
      manager.numberOfBlocks = numberOfBlocks;
    },    

    setLastBlockchainFeederHeight: function (lastBlockchainFeederHeight) {
      setLocal('lastBlockchainFeederHeight', lastBlockchainFeederHeight);
      manager.lastBlockchainFeederHeight = lastBlockchainFeederHeight;
    },

    setIsDownloading: function (downloading) {
      manager.interval = downloading ? 5 * 1000 : 10 * 1000;
      manager.downloading = downloading;
    },  

    /* Called every N seconds from $timeout */
    oninterval: function () {
      api.getState().then(
        function (state) {
          /* Nothing changed | exit */
          if (manager.numberOfBlocks != state.numberOfBlocks) {
            $timeout(function () {
              
              /* We are downloading the blockchain */
              manager.setIsDownloading(state.numberOfBlocks < (state.lastBlockchainFeederHeight - 33));

              /* The real height on the network */
              manager.setLastBlockchainFeederHeight(state.lastBlockchainFeederHeight);

              /* Remember this too */
              manager.setNumberOfBlocks(state.numberOfBlocks);

              /* Reload the blocks table since the total changed */
              manager.page.blocks = { lower: -1, upper: 0 };
              $scope.blocksTableParams.total(state.numberOfBlocks);
              $scope.blocksTableParams.reload();
            });
          };
        }
      );
    },

    /* Called from controller initializer */
    setSelectedBlock: function (block) {
      $scope.selectedBlock = block;

      /* Precalc to speedup templates */
      $scope.selectedBlock.totalAmountNXT    = nxt.util.convertToNXT(block.totalAmountNQT||0);
      $scope.selectedBlock.totalFeeNXT       = nxt.util.convertToNXT(block.totalFeeNQT||0);
      $scope.selectedBlock.totalPOSRewardNXT = nxt.util.convertToNXT(block.totalPOSRewardNQT||0);

      /* Reset the transactions page data */
      manager.page.transactions = { lower: -1, upper: 0 };

      /* Reload the transactions table */
      var num_txn = block.numberOfTransactions || 0;
      $scope.transactionsTableParams.page(1);
      $scope.transactionsTableParams.total(num_txn);
      $scope.transactionsTableParams.reload();
    },

    updateSelectedBlock: function (updated_properties) {
      var num_txn = updated_properties.numberOfTransactions || 0;
      var num_txns_changed = num_txn != $scope.selectedBlock.numberOfTransactions || 0

      angular.extend($scope.selectedBlock, updated_properties);  

      $scope.selectedBlock.totalAmountNXT    = nxt.util.convertToNXT(updated_properties.totalAmountNQT||0);
      $scope.selectedBlock.totalFeeNXT       = nxt.util.convertToNXT(updated_properties.totalFeeNQT||0);
      $scope.selectedBlock.totalPOSRewardNXT = nxt.util.convertToNXT(updated_properties.totalPOSRewardNQT||0);

      /* Reload the transactions table since we now the number of transactions */
      if (num_txns_changed) {
         manager.page.transactions = { lower: -1, upper: 0 };
        $scope.transactionsTableParams.total(num_txn);
        $scope.transactionsTableParams.reload();
      }
    },

    getBlocksRange: function (lower, upper) {
      var deferred = $q.defer();

      /* Go over all pending block downloads, if they are out of range cancel them */
      angular.forEach(manager.cancellers, function (canceller, height) {
        if (height < lower || height >= upper) {
          if (canceller.block) {
            canceller.block.resolve();
          }
          if (canceller.transaction) {
            canceller.transaction.resolve();
          }
          delete manager.cancellers[height];
        }
      });

      /* Always lookup blocks from the DB */
      manager.getBlocksRangeDB(lower, upper).then(
        function (blocks) {          
          var map = {};
          angular.forEach(blocks, function (block) { 
            map[block.height] = block; 
            if (typeof block.generator != 'string') {
              map[block.height].missing = true;
            }
          });

          var result = [];
          for (var i=lower; i<upper; i++) {
            map[i] ?  result.push(map[i]) : 
                      result.push({
                        height: i, 
                        missing: true
                      });
          }
          result.reverse();

          // /* Only if the current selectedBlock is outside the current range will we select another block */
          // var out_of_range = !$scope.selectedBlock || 
          //                     result.filter(function (block) { return block.height == $scope.selectedBlock.height }).length == 0 ;
          // if (out_of_range && typeof $stateParams.height != 'number') {
          //   $timeout(function () {
          //     manager.setSelectedBlock(result[0]);  
          //   });
          // }
          
          /* Only if the range changed will we download blocks */
          if (manager.blocksPageChanged(lower, upper)) { 
            manager.page.blocks.lower = lower;
            manager.page.blocks.upper = upper;
            $timeout(function () {
              manager.downloadBlocks(result);
            });
          }
          deferred.resolve(result);
        },
        deferred.reject
      );
      return deferred.promise;
    },

    getTransactionsRange: function (lower, upper) {
      var deferred = $q.defer();
      var block = $scope.selectedBlock;
      if (!block) {
        deferred.resolve([]);
      }
      else {
        manager.getTransactionsDB(block.id||'').then(
          function (transactions) {
            var plugin = plugins.get('blocks');
            var map = {};
            angular.forEach(transactions, function (transaction) { 
              map[transaction.transaction] = transaction; 
              map[transaction.transaction].amountNXT = nxt.util.convertToNXT(transaction.amountNQT);
              map[transaction.transaction].icon = api.renderer.getIcon(transaction);
              map[transaction.transaction].renderedHTML = api.renderer.getHTML(transaction);
            });

            var result = [];
            angular.forEach(block.transactions, function (txn_id) {
              map[txn_id] ? result.push(map[txn_id]) : 
                            result.push({
                              block:        block.id,
                              height:       block.height,
                              transaction:  txn_id, 
                              missing:      true
                            });
            });
            result = result.slice(lower, upper);

            if (manager.transactionsPageChanged(lower, upper)) { /* Only if the range changed will we download blocks */
              manager.page.transactions.lower = lower;
              manager.page.transactions.upper = upper;
              $timeout(function () {
                manager.downloadTransactions(result);  
              });
            }

            deferred.resolve(result);
          },
          deferred.reject
        );
      }
      return deferred.promise;
    },

    blocksPageChanged: function (lower, upper) {
      return manager.page.blocks.lower != lower || manager.page.blocks.upper != upper;
    },

    transactionsPageChanged: function (lower, upper) {
      return manager.page.transactions.lower != lower || manager.page.transactions.upper != upper;
    },

    getBlocksRangeDB: function (lower, upper) {
      return api.engine.db.blocks.where('height').between(lower, upper, true, false).toArray();
    },

    getTransactionsDB: function (block_id) {
      return api.engine.db.transactions.where('block').equals(block_id).toArray();
    },

    getBlockCanceller: function (height) {
      var cancellers = manager.cancellers[height] || (manager.cancellers[height] = {});
      return cancellers.block || (cancellers.block = $q.defer());
    },

    getTransactionCanceller: function (height) {
      var cancellers = manager.cancellers[height] || (manager.cancellers[height] = {});
      return cancellers.transaction || (cancellers.transaction = $q.defer());
    },

    /* Find the block id on the network */
    getBlockId: function (height) {
      var deferred = $q.defer();
      api.getBlockId({height: height}, null, manager.getBlockCanceller(height)).then(
        function (data) {
          api.engine.db.blocks.put({height: height, id: data.block}).then(
            function () {
              deferred.resolve(data.block);
            },
            deferred.reject
          );
        },
        deferred.reject
      );
      return deferred.promise;
    },

    getBlock: function (id, height) {
      api.getBlock({block: id}, null, manager.getBlockCanceller(height)).then(
        function (block) {
          if ($scope.selectedBlock && block && block.height == $scope.selectedBlock.height) {
            $timeout(function () {
              manager.updateSelectedBlock(block);
            });
          }
          api.engine.db.blocks.update(height, block);
        }
      );
    },

    getTransaction: function (id, height) {
      api.getTransaction({transaction: id}, null, manager.getTransactionCanceller(height)).then(
        function (transaction) {
          api.engine.db.transactions.put(transaction);
        }
      );
    },

    downloadBlocks: function (blocks) {
      angular.forEach(blocks, function (block) {
        if (!block.missing) {
          return;
        }
        if (block.id) {
          manager.getBlock(block.id, block.height);
          return;
        }
        manager.getBlockId(block.height).then(
          function (id) {
            if (id) {
              api.engine.db.blocks.where('id').equals(id).first().then( /* Ensure we don't download twice */
                function (_block) {
                  if (!_block || typeof _block.generator != 'string') {
                    manager.getBlock(id, block.height);
                  }
                }
              );
            }
          },
          function (error) {
            console.log('downloadBlocks height='+block.height, error);
          }
        );
      });
    },

    downloadTransactions: function (transactions) {
      angular.forEach(transactions, function (transaction) {
        if (transaction.missing) {
          manager.getTransaction(transaction.transaction, transaction.height);
        }
      });
    }
  };

  api.engine.db.blocks.addObserver($scope, {
    finally: function () {
      $timeout(function () {
        $scope.blocksTableParams.total(manager.numberOfBlocks);
        $scope.blocksTableParams.reload();
      });
    }
  });

  api.engine.db.transactions.addObserver($scope, {
    finally: function () {
      $timeout(function () {
        var num_txn = $scope.selectedBlock.numberOfTransactions||0;
        $scope.transactionsTableParams.total(num_txn);
        $scope.transactionsTableParams.reload();
      });
    }
  });

  $scope.formatTimestamp = function (timestamp) {
    return nxt.util.formatTimestamp(timestamp);
  }

  init();
});
})();