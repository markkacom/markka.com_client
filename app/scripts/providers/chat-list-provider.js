(function () {
'use strict';
var module = angular.module('fim.base');
module.factory('ChatListProvider', function (nxt, $q, IndexedEntityProvider) {
  
  function ChatListProvider(api, $scope, pageSize, account) {
    this.init(api, $scope, pageSize);
    this.account = account;
    this.nameFilter = null;

    var account_id = nxt.util.convertRSAddress(this.account);
    this.subscribe('removedUnConfirmedTransactions-'+account_id, this.delayedReload);
    this.subscribe('addedUnConfirmedTransactions-'+account_id, this.delayedReload);
    this.subscribe('addedConfirmedTransactions-'+account_id, this.delayedReload);
  }
  angular.extend(ChatListProvider.prototype, IndexedEntityProvider.prototype, {

    /* @override */
    sortFunction: function (a, b) {
      return b.timestamp - a.timestamp;
    },

    /* @override */
    uniqueKey: function (chat) { return chat.accountRS; },

    getData: function (firstIndex) {
      var deferred = $q.defer();
      var args = {
        account:        this.account,
        firstIndex:     firstIndex,
        lastIndex:      firstIndex + this.pageSize,
        requestType:    'getChatList'
      };
      this.api.engine.socket().callAPIFunction(args).then(deferred.resolve, deferred.reject);
      return deferred.promise;
    },

    translate: function (chat) {
      chat.date = nxt.util.formatTimestamp(chat.timestamp, true);
    },

    dataIterator: function (data) {
      var chats = data.chats||[];

      // /* TODO there is something wrong with SQL query on the server, it SHOULD return UNIQUE chats */
      // chats.forEach(function (chat) {
      //   if (duplicates[chat.accountRS] && duplicates[chat.accountRS].timestamp < chat.timestamp) {
      //     duplicates[chat.accountRS].timestamp = chat.timestamp;
      //   }
      //   else {
      //     duplicates[chat.accountRS] = chat;
      //   }
      // });
      for (var i=0; i<chats.length; i++) {
        this.translate(chats[i]);
      }
      return new Iterator(chats);
    },

    matchesFilter: function (entity, filter) {
      if (filter) {
        if (entity.accountName) {
          if (entity.accountName.toLowerCase().indexOf(filter) != -1) {
            return true;
          } 
        }
        if (entity.accountRS.toLowerCase().indexOf(filter) != -1) {
          return true;
        }
        return false;
      }
      return true;
    },

    applyNameFilter: function () {
      var self = this;
      this.$scope.$evalAsync(function () {
        var shown_count = 0;
        var filter = self.nameFilter.toLowerCase();
        self.forEach(function (entity) {
          entity.hidden = !self.matchesFilter(entity, filter);
          if (!entity.hidden) {
            shown_count++;
          }
        });
        if (self.hasMore && shown_count < self.pageSize) {
          self.loadMore();
        }
      });
    },

    delayedReload: function () {
      if (this.timeout) { 
        clearTimeout(this.timeout); 
      }
      var self = this;
      this.timeout = setTimeout(function () { 
        self.timeout = null;
        self.reload();
      }, 1000);
    }    
  });
  return ChatListProvider;
});
})();