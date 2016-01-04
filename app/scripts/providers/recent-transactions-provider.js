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
module.factory('RecentTransactionsProvider', function (nxt, $q, EntityProvider, $rootScope) {

  function RecentTransactionsProvider(api, $scope, timestamp, accounts, filter) {
    this.init(api, $scope, timestamp);
    this.accounts = accounts;
    this.filter   = filter;

    this.subscribe('blockPoppedNew', this.blockPopped);
    this.subscribe('blockPushedNew', this.blockPushed);

    /* TODO - optimize so we can subscribe with one call with server instead of ACCOUNT_COUNT * 3 */
    for (var i=0; i<this.accounts.length; i++) {
      var account_id = nxt.util.convertRSAddress(this.accounts[i]);
      this.subscribe('removedUnConfirmedTransactions-'+account_id, this.removedUnConfirmedTransactions);
      this.subscribe('addedUnConfirmedTransactions-'+account_id, this.addedUnConfirmedTransactions);
      this.subscribe('addedConfirmedTransactions-'+account_id, this.addedConfirmedTransactions);
    }

    var self = this, unregister = $rootScope.$on('$translateChangeSuccess', function () {
      $scope.$evalAsync(function () {
        angular.forEach(self.entities, function (entity) {
          entity.renderedHTML = api.renderer.getHTML(entity);
        })
      });
    });
    $scope.$on('$destroy', unregister);
  }
  angular.extend(RecentTransactionsProvider.prototype, EntityProvider.prototype, {

    sortFunction: EntityProvider.prototype.transactionSort,
    uniqueKey: function (entity) { return entity.transaction; },

    getData: function (timestamp) {
      var deferred = $q.defer();
      var self = this;
      var args = this.createTransactionFilter();
      args.timestamp  = timestamp;
      args.accounts   = this.accounts;
      if (args.accounts && args.accounts.length) {
        this.api.engine.socket().getRecentTransactions(args).then(deferred.resolve, deferred.reject);
      }
      else {
        deferred.resolve({});
      }
      return deferred.promise;
    },

    dataIterator: function (data) {
      var transactions = data.transactions || [];
      for (var i=0; i<transactions.length; i++) {
        var t = transactions[i];
        t.renderedHTML  = this.api.renderer.getHTML(t);
        t.date          = nxt.util.formatTimestamp(t.timestamp);
      }
      return new Iterator(transactions);
    },

    transactionIterator: function (transactions) {
      /* TODO - implement a filter based on the current controller wide filter */
      return new Iterator(transactions);
    },

    createTransactionFilter: function () {
      var filters = [];
      if ( ! this.filter.all ) {
        if ( ! this.filter.payments) filters = filters.concat('0:0');
        if ( ! this.filter.messages) filters = filters.concat('1:0');
        if ( ! this.filter.aliases) filters = filters.concat('1:1','1:6','1:7');
        if ( ! this.filter.namespacedAliases) filters = filters.concat('40:0');
        if ( ! this.filter.polls) filters = filters.concat('1:2','1:3');
        if ( ! this.filter.accountInfo) filters = filters.concat('1:5');
        if ( ! this.filter.announceHub) filters = filters.concat('1:4');
        if ( ! this.filter.goodsStore) filters = filters.concat('3:0','3:1','3:2','3:3','3:4','3:5','3:6','3:7');
        if ( ! this.filter.balanceLeasing) filters = filters.concat('4:0');
        if ( ! this.filter.assetIssued) filters = filters.concat('2:0');
        if ( ! this.filter.assetTransfer) filters = filters.concat('2:1');
        if ( ! this.filter.assetOrder) filters = filters.concat('2:2','2:3','2:4','2:5');
      }
      if (filters.length) {
        return { transactionFilter: filters.join(',') };
      }
      return {};
    }
  });
  return RecentTransactionsProvider;
});
})();