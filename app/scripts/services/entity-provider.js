(function () {
'use strict';
var module = angular.module('fim.base');
module.factory('EntityProvider', function (nxt, $timeout, $q) {

  /*
    function SampleProvider(api, $scope, timestamp, account) {
      this.init(api, $scope, timestamp, account);
    }
    angular.extend(SampleProvider.prototype, EntityProvider.prototype, {
      getData: function (timestamp) {
        var deferred = $q.defer();
        this.api.getStuff(timestamp).then(deferred.resolve, deferred.reject);
        return deferred.promise;
      },

      dataIterator: function (data) {
        return new Iterator(data.stuff);
      },

      transactionIterator: function (transactions) {
        return new Iterator(transactions);
      },

      tradeIterator: function (trades) {
        return new Iterator(trades);
      },

      uniqueKey: function (entity) {
        return entity.transaction;
      },

      sortFunction: function (a, b) {
        return a.timestamp - b.timestamp;
      },
    });
  */

  function EntityProvider() {
  }
  EntityProvider.prototype = {
    
    /**
     * # getData
     *
     * This function is provided by the extending class.
     *
     * It expects a timestamp argument. The result must be a Promise that 
     * retrieves said data. 
     */
    getData: function (timestamp) {
      console.log('EntityProvider.getData not implemented for '+Object.prototype.toString.call(this));
      var deferred = $q.defer();
      deferred.resolve({msg: 'Implement me please'});
      return deferred.promise;
    },

    /**
     * # dataIterator
     *
     * It expects the raw data returned from the getData function and returns
     * an Iterator. 
     *
     * If the data returned from getData needs additional filtering it must be
     * done in this function.
     */
    dataIterator: function (data) {
      console.log('EntityProvider.dataIterator not implemented for '+Object.prototype.toString.call(this));
      return new Iterator([]);
    },

    /**
     * # transactionIterator
     *
     * It expects an array of transactions and returns an Iterator. This method
     * is called from 'addedConfirmedTransactions', 'addedUnConfirmedTransactions'
     * and 'removedUnConfirmedTransactions'.
     *
     * If an account was set or if this provider must filter certain types of 
     * transactions it must be done in this function.
     */
    transactionIterator: function (transactions) {
      console.log('EntityProvider.transactionIterator not implemented for '+Object.prototype.toString.call(this));
      return new Iterator([]);
    },

    /**
     * # tradeIterator
     *
     * It expects an array of trades and returns an Iterator. This method
     * is called from 'addedTrades'.
     *
     * If an account was set or if this provider must filter certain types of 
     * trades it must be done in this function.
     */
    tradeIterator: function (trades) {
      console.log('EntityProvider.tradeIterator not implemented for '+Object.prototype.toString.call(this));
      return new Iterator([]);
    },

    /**
     * # uniqueKey
     *
     * This function is provided by the extending class.
     * In order to prevent duplicate entries to appear each entity must have a
     * unique key.
     *
     * This function expects an entity and returns a unique key to identify that 
     * entity.
     */
    uniqueKey: function (entity) {
      console.log('EntityProvider.uniqueKey not implemented for '+Object.prototype.toString.call(this));
      return entity.transaction;
    },

    /**
     * # sortFunction
     *
     * This function is provided by the extending class.
     * In order to sort results the extending class must provide a comparator function
     * which is used in the Array.sort(func) call.
     */
    sortFunction: function (a, b) {
      console.log('EntityProvider.sortFunction not implemented for '+Object.prototype.toString.call(this));
      return 0;
    },

    init: function (api, $scope, timestamp) {
      var self        = this;
      this.api        = api;
      this.$scope     = $scope;
      this.entities   = [];
      this.duplicates = {};
      this.isLoading  = true;
      this.hasMore    = true;
      this.timestamp  = timestamp;
    },

    subscribe: function (topic, handler) {
      this.api.engine.socket().subscribe(topic, angular.bind(this, handler), this.$scope);
    },

    reload: function () {
      var self = this;
      this.$scope.$evalAsync(function () {
        self.entities.length  = 0;
        self.duplicates       = {};
        self.isLoading        = true;
        self.hasMore          = true;
        $timeout(function () {  self.getNetworkData(self.timestamp); }, 1, false);        
      });
    },

    clear: function () {
      var self = this;
      this.$scope.$evalAsync(function () {
        self.entities.length  = 0;
        self.keys             = {};
      });
    },
    
    loadMore: function () {
      if (this.loadMoreBusy) {
        this.scheduledLoadMore = true;
      }
      else {
        var self = this;
        this.loadMoreBusy = $q.defer();
        this.loadMoreBusy.promise.then(function () {
          self.loadMoreBusy = null;
          if (self.scheduledLoadMore) {
            self.scheduledLoadMore  = false;
            self.loadMore();
          }
        });

        var latest    = this.entities.length ? this.entities[this.entities.length-1] : null;
        var timestamp = latest ? latest.timestamp : this.timestamp;
        
        this.$scope.$evalAsync(function () {
          self.isLoading = true;
          self.getNetworkData(timestamp).then(self.loadMoreBusy.resolve);
        });
      }      
    },

    getNetworkData: function (timestamp) {
      var deferred = $q.defer();
      var self = this;
      this.getData(timestamp).then(
        function (data) {
          self.$scope.$evalAsync(function () {
            self.isLoading = false;
            var iterator = self.dataIterator(data);
            self.processGetData(iterator, false);
            deferred.resolve();
          });
        },
        function (data) {
          self.$scope.$evalAsync(function () {
            self.isLoading = false;
            deferred.resolve();
          });
        }
      );
      return deferred.promise;
    },

    processGetData: function (iterator, unshift) {      
      this.hasMore = false;
      while (iterator.hasMore()) {
        var entity = iterator.next();
        var key    = this.uniqueKey(entity);
        if (this.duplicates[key]) {
          angular.extend(this.duplicates[key], entity);
        }
        else {
          this.hasMore = true;
          this.duplicates[key] = entity;
          if (unshift) {
            this.entities.unshift(entity);
            if (this.entities.length > 40) {
              var last = this.entities.pop();
              if (last) {
                delete this.duplicates[this.uniqueKey(last)];
              }
            }
          }
          else {
            this.entities.push(entity);
          }
        }
      }
      this.entities.sort(this.sortFunction);
    },

    applyFilter: function (filter) {
      this.filter = angular.copy(filter);
      this.reload();
    },

    /* @websocket */
    removedUnConfirmedTransactions: function (transactions) {
      var self = this;
      var length = this.entities.length;
      this.entities = this.entities.filter(
        function (entity) {
          for (var i=0; i<transactions.length; i++) {
            if (self.uniqueKey(transactions[i]) == self.uniqueKey(entity)) {
              delete self.duplicates[self.uniqueKey(entity)];
              return false;
            }
          }
          return true;
        }
      );
      if (this.entities.length != length) {        
        this.$scope.$evalAsync(function () {
          self.entities.sort(self.sortFunction);  
        });
      }
    },

    /* @websocket */
    addedUnConfirmedTransactions: function (transactions) {
      var self = this;
      var iterator = this.transactionIterator(transactions);
      this.$scope.$evalAsync(function () {
        self.processGetData(iterator, true);
      });
    },

    /* @websocket */
    addedConfirmedTransactions: function (transactions) {
      var self = this;
      var iterator = this.transactionIterator(transactions);
      this.$scope.$evalAsync(function () {
        self.processGetData(iterator, true);
      });
    },

    /* @websocket */
    addedTrades: function (trades)  {
      var self = this;
      var iterator = this.tradeIterator(trades);
      this.$scope.$evalAsync(function () {
        self.processGetData(iterator, true);
      });
    },

    /* @websocket */
    blockPopped: function (block) {
      var self = this;
      this.$scope.$evalAsync(function () {
        var result = [], entity, changed = false;
        for (var i=0; i<self.entities.length; i++) {
          entity = self.entities[i];
          if (entity.height <= block.height) {
            entity.confirmations = block.height - entity.height;
            result.push(entity);
            changed = true;
          }
        }
        self.entities = result;

        if (changed) {
          self.entities.sort(self.sortFunction);
        }
      });
    },

    /* @websocket */
    blockPushed: function (block) {
      var self = this;
      this.$scope.$evalAsync(function () {
        for (var i=0; i<self.entities.length; i++) {
          self.entities[i].confirmations = block.height - self.entities[i].height;
        }
      });
    },

    /* Extending classes can re-use this generic sorted function */
    transactionSort: function (a, b) {
      if (b.confirmations < a.confirmations) {
        return 1;
      }
      else if (b.confirmations > a.confirmations) {
        return -1;
      }
      else {
        if (a.timestamp < b.timestamp) {
          return 1;
        }
        else if (a.timestamp > b.timestamp) {
          return -1;
        }
      }
      return 0;
    }
  }

  return EntityProvider;
});
})();