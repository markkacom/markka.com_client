(function () {
'use strict';
var module = angular.module('fim.base');
module.factory('ActivityProvider', function (nxt, $q, EntityProvider, $rootScope) {
  
  function ActivityProvider(api, $scope, timestamp, account, filter) {
    this.init(api, $scope, timestamp);
    this.account = account;
    this.filter = filter;

    this.subscribe('blockPoppedNew', this.blockPopped);
    this.subscribe('blockPushedNew', this.blockPushed);

    var account_id  = this.account ? nxt.util.convertRSAddress(this.account) : null;
    this.subscribe(this.account ? 'removedUnConfirmedTransactions-'+account_id : 'removedUnConfirmedTransactionsNew', this.removedUnConfirmedTransactions);
    this.subscribe(this.account ? 'addedUnConfirmedTransactions-'+account_id : 'addedUnConfirmedTransactionsNew', this.addedUnConfirmedTransactions);
    this.subscribe(this.account ? 'addedConfirmedTransactions-'+account_id : 'addedConfirmedTransactionsNew', this.addedConfirmedTransactions);

    var self = this, unregister = $rootScope.$on('$translateChangeSuccess', function () {
      $scope.$evalAsync(function () {
        angular.forEach(self.entities, function (entity) {
          entity.renderedHTML = api.renderer.getHTML(entity);
        })
      });
    });
    $scope.$on('$destroy', unregister);
  }
  angular.extend(ActivityProvider.prototype, EntityProvider.prototype, {

    sortFunction: function (a, b) { return b.timestamp - a.timestamp },
    uniqueKey: function (entity) { return entity.transaction || entity.id /* for trade */; },

    /* TODO - make this method obey the active transaction filter */ 
    transactionIterator: function (transactions) {
      /*if (this.account) {
        var self = this;
        transactions = transactions.filter(function (t) { return t.senderRS == self.account || t.recipientRS == self.account; });
      }*/
      for (var i=0, t; i<transactions.length; i++) {
        t               = transactions[i];
        t.renderedHTML  = this.api.renderer.getHTML(t, null, this.account);
        t.date          = nxt.util.formatTimestamp(t.timestamp);        
      }
      return new Iterator(transactions); 
    },

    getData: function (timestamp) {
      var deferred = $q.defer();
      var args = this.createTransactionFilter();
      args.timestamp = timestamp;
      args.includeAssetInfo = 'true';
      args.includeBlocks = 'false';
      args.includeTrades = 'false';
      if (this.account) {
        args.account = this.account;
      }
      if (!this.filter.all && !this.filter.trades) {
        args.includeTrades = 'false';
      }
      this.api.engine.socket().getActivity(args).then(deferred.resolve, deferred.reject);
      return deferred.promise;
    },

    dataIterator: function (data) {
      var t, entities = (data.transactions || []).concat(data.trades||[]);
      for (var i=0; i<entities.length; i++) {
        t               = entities[i];
        t.renderedHTML  = this.api.renderer.getHTML(t, null, this.account);
        t.date          = nxt.util.formatTimestamp(t.timestamp);
      }
      return new Iterator(entities);
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
  return ActivityProvider;
});
})();