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
module.factory('MessagesProvider', function (nxt, $q, EntityProvider, $rootScope) {

  function MessagesProvider(api, $scope, timestamp, account) {
    this.init(api, $scope, timestamp);
    this.account = account;

    this.subscribe('blockPoppedNew', this.blockPopped);
    this.subscribe('blockPushedNew', this.blockPushed);

    var account_id = nxt.util.convertRSAddress(this.account);
    this.subscribe('removedUnConfirmedTransactions-'+account_id, this.removedUnConfirmedTransactions);
    this.subscribe('addedUnConfirmedTransactions-'+account_id, this.addedUnConfirmedTransactions);
    this.subscribe('addedConfirmedTransactions-'+account_id, this.addedConfirmedTransactions);

    var self = this, unregister = $rootScope.$on('$translateChangeSuccess', function () {
      $scope.$evalAsync(function () {
        angular.forEach(self.entities, function (entity) {
          entity.renderedHTML = api.renderer.getHTML(entity);
        })
      });
    });
    $scope.$on('$destroy', unregister);
  }
  angular.extend(MessagesProvider.prototype, EntityProvider.prototype, {

    sortFunction: EntityProvider.prototype.transactionSort,
    uniqueKey: function (entity) { return entity.transaction; },

    getData: function (timestamp) {
      var deferred = $q.defer();
      var args = {
        timestamp:        timestamp,
        includeAssetInfo: 'false',
        includeBlocks:    'false',
        includeTrades:    'false',
        inclusiveTransactionFilter: '1:0',
        account:          this.account
      }
      this.api.engine.socket().getActivity(args).then(deferred.resolve, deferred.reject);
      return deferred.promise;
    },

    dataIterator: function (data) {
      var transactions = data.transactions || [];
      for (var i=0; i<transactions.length; i++) {
        var t = transactions[i];
        t.renderedHTML  = this.api.renderer.getHTML(t, null, this.account);
        t.date          = nxt.util.formatTimestamp(t.timestamp);
      }
      return new Iterator(transactions);
    },

    transactionIterator: function (transactions) {
      var self = this;
      transactions = transactions.filter(function (transaction) {
        if (transaction.type == 1 && transaction.subtype == 0) {
          if (self.account) {
            if (transaction.senderRS != self.account && transaction.recipientRS != self.account) {
              return false;
            }
          }
          return true;
        }
        return false;
      });
      for (var i=0; i<transactions.length; i++) {
        var t = transactions[i];
        t.renderedHTML  = this.api.renderer.getHTML(t, null, this.account);
        t.date          = nxt.util.formatTimestamp(t.timestamp);
      }
      return new Iterator(transactions);
    }
  });
  return MessagesProvider;
});

})();