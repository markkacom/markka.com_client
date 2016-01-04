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
module.factory('IndexedEntityProvider', function (nxt, $timeout, $q, $interval) {

  function IndexedEntityProvider() {
  }
  IndexedEntityProvider.prototype = {
    changeObservers: [],

    /**
     * Registers a function that is called whenever the model changes.
     * If a $scope is provided the observer will automatically be removed
     *
     * @param observer Function
     * @param $scope Angular $scope
     */
    addChangeObserver: function (fn, $scope) {
      if (this.changeObservers.indexOf(fn) == -1) {
        this.changeObservers.push(fn);
        if ($scope) {
          $scope.$on('$destroy', function () { this.removeChangeObserver(fn) }.bind(this));
        }
      }
    },

    /**
     * Removes a previously added observer.
     *
     * @param observer Function
     */
    removeChangeObserver: function (fn) {
      this.changeObservers = this.changeObservers.filter(function (_fn) {
        return fn !== _fn;
      })
    },

    /**
     * # getData
     *
     * This function is provided by the extending class.
     *
     * It expects a firstIndex argument. The result must be a Promise that
     * retrieves said data.
     */
    getData: function (firstIndex) {
      console.log('IndexedEntityProvider.getData not implemented');
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
      console.log('IndexedEntityProvider.dataIterator not implemented');
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
      console.log('IndexedEntityProvider.uniqueKey not implemented');
      console.trace();
      return entity;
    },

    /**
     * # sortFunction
     *
     * This function is provided by the extending class.
     * In order to sort results the extending class must provide a comparator function
     * which is used in the Array.sort(func) call.
     */
    sortFunction: function (a, b) {
      console.log('IndexedEntityProvider.sortFunction not implemented');
      return 0;
    },

    init: function (api, $scope, pageSize, account) {
      var self        = this;
      this.api        = api;
      this.$scope     = $scope;
      this.entities   = [];
      this.keys       = {};
      this.isLoading  = true;
      this.hasMore    = true;
      this.pageSize   = pageSize;
      this.account    = account;
    },

    /**
     * Applies a function on each entity every N milliseconds.
     * Implementers would use this function to define a function that updates
     * calculated date fields of the 'timeago' type.
     *
     * @param each_fn Function
     * @param delay (optional)
     */
    interval: function (each_fn, delay) {
      var interval = $interval(angular.bind(this, function () { this.forEach(each_fn) }), delay||15*1000);
      this.$scope.$on('$destroy', function () { $interval.cancel(interval) });
    },

    reload: function () {
      var self = this;
      var deferred = $q.defer();
      this.$scope.$evalAsync(function () {
        self.entities.length  = 0;
        self.keys             = {};
        self.isLoading        = true;
        self.hasMore          = true;
        $timeout(function () {  self.getNetworkData(0, deferred); }, 1, false);
      });
      return deferred.promise;
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

        this.$scope.$evalAsync(function () {
          self.isLoading = true;
          self.getNetworkData(self.entities.length).then(self.loadMoreBusy.resolve);
        });
      }
    },

    getNetworkData: function (firstIndex, reload_deferred) {
      var deferred = $q.defer();
      var self = this;
      this.getData(firstIndex).then(
        function (data) {
          self.$scope.$evalAsync(function () {
            self.isLoading = false;
            var iterator = self.dataIterator(data);
            self.processGetData(iterator, false);
            deferred.resolve();
            if (reload_deferred) {
              reload_deferred.resolve();
            }
          });
        },
        function (data) {
          self.$scope.$evalAsync(function () {
            self.isLoading = false;
            deferred.resolve();
            if (reload_deferred) {
              reload_deferred.resolve();
            }
          });
        }
      );
      return deferred.promise;
    },

    processGetData: function (iterator, unshift) {
      this.hasMore = iterator.hasMore();
      var entity, key;
      while (iterator.hasMore()) {
        entity = iterator.next();
        key = this.uniqueKey(entity);
        if (!this.keys[key]) {
          this.keys[key] = entity;
          entity.uniqueKey = key;
          if (unshift) {
            this.entities.unshift(entity);
          }
          else {
            this.entities.push(entity);
          }
        }
        else {
          angular.extend(this.keys[key], entity);
        }
      }
      this.sort(); /* will notify change observers */
    },

    remove: function (uniqueKey) {
      if (this.keys[uniqueKey]) {
        delete this.keys[uniqueKey];
        this.filter(function (other) {
          return other.uniqueKey !== uniqueKey;
        });
      }
    },

    /* Adds or updates an entity.
       If there is no such entity it is added.
       If there is an entity with the same uniqueKey it is updated. */
    add: function (entity) {
      var key = this.uniqueKey(entity);
      if (this.keys[key]) {
        angular.extend(this.keys[key], entity);
      }
      else {
        this.keys[key] = entity;
        entity.uniqueKey = key;
        this.entities.unshift(entity);
      }
      this.sort(); /* will notify change observers */
    },

    filter: function (filter_fn) {
      this.entities = this.entities.filter(filter_fn);
      this.notifyChange();
    },

    sort: function () {
      this.entities.sort(angular.bind(this, this.sortFunction));
      this.notifyChange();
    },

    forEach: function (each_fn) {
      this.entities.forEach(each_fn);
    },

    subscribe: function (topic, handler) {
      this.api.engine.socket().subscribe(topic, angular.bind(this, handler), this.$scope);
    },

    notifyChange: function () {
      if (this.changeObservers.length) {
        for (var i=0; i<this.changeObservers.length; i++) {
          this.changeObservers[i].call(null);
        }
      }
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
    },

    /* @websocket */
    removedUnConfirmedTransactions: function (transactions) {
      var self = this;
      var length = this.entities.length;
      this.entities = this.entities.filter(
        function (entity) {
          for (var i=0; i<transactions.length; i++) {
            if (self.uniqueKey(transactions[i]) == self.uniqueKey(entity)) {
              delete self.keys[self.uniqueKey(entity)];
              return false;
            }
          }
          return true;
        }
      );
      if (this.entities.length != length) {
        this.$scope.$evalAsync(function () {
          self.sort(); /* will notify change observers */
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
          else {
            delete self.keys[self.uniqueKey(entity)];
          }
        }
        self.entities = result;
        if (changed) {
          self.sort(); /* will notify change observers */
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
    }
  };

  return IndexedEntityProvider;
});
})();