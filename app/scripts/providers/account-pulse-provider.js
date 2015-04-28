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