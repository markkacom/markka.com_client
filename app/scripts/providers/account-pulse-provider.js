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
module.factory('AccountPulseProvider', function (nxt, $q, EntityProvider, $rootScope) {
  function AccountPulseProvider(api, $scope, timestamp, account) {
    this.init(api, $scope, timestamp);
    this.account = account;

    this.subscribe('blockPoppedNew', this.blockPopped);
    this.subscribe('blockPushedNew', this.blockPushed);

    var account_id  = nxt.util.convertRSAddress(this.account);
    this.subscribe('removedUnConfirmedTransactions-'+account_id, this.removedUnConfirmedTransactions);
    this.subscribe('addedUnConfirmedTransactions-'+account_id, this.addedUnConfirmedTransactions);
    this.subscribe('addedConfirmedTransactions-'+account_id, this.addedConfirmedTransactions);
  }
  angular.extend(AccountPulseProvider.prototype, EntityProvider.prototype, {

    sortFunction: EntityProvider.prototype.transactionSort,
    uniqueKey: function (entity) { return entity.transaction; },

    getData: function (timestamp) {
      var deferred = $q.defer();
      var args = { account:this.account, timestamp: timestamp };
      this.api.engine.socket().getAccountPosts(args).then(deferred.resolve, deferred.reject);
      return deferred.promise;
    },

    dataIterator: function (data) {
      var posts     = data.posts || [];
      this.hasMore  = posts.length > 0;
      for (var i=0; i<posts.length; i++) {
        var p  = posts[i];
        p.date = nxt.util.formatTimestamp(c.timestamp);
        p.text = c.attachment.message.replace(/^post\:/g, '');
      }
      return new Iterator(posts);
    },

    transactionIterator: function (transactions) {
      transactions = transactions.filter(function (post) {
        if (post.type == 1 && post.subtype == 0) {
          var message = post.attachment.message;
          if (typeof message == 'string' && message.indexOf('post1:') == 0) {
            post.date = nxt.util.formatTimestamp(post.timestamp);
            post.text = post.attachment.message.replace(/^post\:/g, '');
            return true;
          }
        }
        return false;
      });
      return new Iterator(transactions);
    }
  });
  return AccountPulseProvider;
});
})();