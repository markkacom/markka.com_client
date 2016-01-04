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
module.factory('CommentProvider', function (nxt, $q, IndexedEntityProvider) {

  function CommentProvider(api, $scope, pageSize, post) {
    this.init(api, $scope, pageSize);
    this.post = post;
    this.isLoading = false;

    this.subscribe('removedUnConfirmedTransactionsNew', this.removedUnConfirmedTransactions);
    this.subscribe('addedUnConfirmedTransactionsNew', this.addedUnConfirmedTransactions);
    this.subscribe('addedConfirmedTransactionsNew', this.addedConfirmedTransactions);
    this.subscribe('blockPoppedNew', this.blockPopped);
    this.subscribe('blockPushedNew', this.blockPushed);
  }
  angular.extend(CommentProvider.prototype, IndexedEntityProvider.prototype, {

    uniqueKey: function (comment) { return comment.transaction },
    sortFunction: function (b, a) {
      if (b.confirmations < a.confirmations) {      return 1;   }
      else if (b.confirmations > a.confirmations) { return -1;  }
      else {
        if (a.timestamp < b.timestamp) {            return 1;   }
        else if (a.timestamp > b.timestamp) {       return -1;  }
        else {
          if (a.transaction < b.transaction) {      return 1;   }
          else if (a.transaction > b.transaction) { return -1;  }
        }
      }
      return 0;
    },

    getData: function (firstIndex) {
      var deferred = $q.defer();
      var args = {
        post:        this.post,
        firstIndex:  firstIndex,
        lastIndex:   firstIndex + this.pageSize
      }
      this.api.engine.socket().getComments(args).then(deferred.resolve, deferred.reject);
      return deferred.promise;
    },

    dataIterator: function (data) {
      var comments = data || [];
      for (var i=0; i<comments.length; i++) {
        var c  = comments[i];
        c.date = nxt.util.formatTimestamp(c.timestamp);
        c.text = c.attachment.message.replace(/^(comm[^\:]+\:)/g, '');
      }
      return new Iterator(comments);
    },

    transactionIterator: function (transactions) {
      transactions = transactions || [];
      var filtered = [], t;
      for (var i=0; i<transactions.length; i++) {
        t = transactions[i];
        if (t.type == 1 && t.subtype == 0) {
          if (t.attachment.message.indexOf('comm'+this.post+':') == 0) {
            t.date = nxt.util.formatTimestamp(t.timestamp);
            t.text = t.attachment.message.replace(/^(comm[^\:]+\:)/g, '');
            filtered.push(t);
          }
        }
      }
      return new Iterator(filtered);
    }
  });
  return CommentProvider;
});
})();