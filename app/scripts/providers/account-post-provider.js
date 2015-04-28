(function () {
'use strict';
var module = angular.module('fim.base');
module.factory('AccountPostProvider', function (nxt, $q, IndexedEntityProvider, CommentProvider) {

  function AccountPostProvider(api, $scope, pageSize, account) {
    this.init(api, $scope, pageSize, account);
    
    var account_id  = nxt.util.convertRSAddress(account);
    this.subscribe('removedUnConfirmedTransactions-'+account_id, this.removedUnConfirmedTransactions);
    this.subscribe('addedUnConfirmedTransactions-'+account_id, this.addedUnConfirmedTransactions);
    this.subscribe('addedConfirmedTransactions-'+account_id, this.addedConfirmedTransactions);
    
    this.subscribe('blockPoppedNew', this.blockPopped);
    this.subscribe('blockPushedNew', this.blockPushed);
  }
  angular.extend(AccountPostProvider.prototype, IndexedEntityProvider.prototype, {

    uniqueKey: function (post) { return post.transaction },
    sortFunction: function (a, b) {
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
        account:     this.account,
        firstIndex:  firstIndex,
        lastIndex:   firstIndex + this.pageSize
      }
      this.api.engine.socket().getAccountPosts(args).then(deferred.resolve, deferred.reject);
      return deferred.promise;
    },

    dataIterator: function (data) {
      var posts = data || [];
      this.hasMore  = posts.length > 0;
      for (var i=0; i<posts.length; i++) {
        var p   = posts[i];
        p.date  = nxt.util.formatTimestamp(p.timestamp);
        p.text  = p.message;//.replace(/^post\:/g, '');

        p.commentProvider = new CommentProvider(this.api, this.$scope, 10, p.transaction);
      }
      return new Iterator(posts);
    },

    transactionIterator: function (transactions) {
      transactions = transactions || [];
      var filtered = [], t;
      for (var i=0; i<transactions.length; i++) {
        t = transactions[i];
        if (t.type == 1 && t.subtype == 0 && t.senderRS == t.recipientRS && t.senderRS == this.account) {
          if (t.attachment.message.indexOf('post1:') == 0) {
            t.date = nxt.util.formatTimestamp(t.timestamp);
            t.text = t.attachment.message.replace(/^(post1\:)/g, '');
            filtered.push(t);
          }
        }
      }
      return new Iterator(filtered);
    }    
  });
  return AccountPostProvider;
});
})();