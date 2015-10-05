(function() {
  'use strict';
  var module = angular.module('fim.base');
  module.factory('AllGoodsProvider', function(nxt, $q, IndexedEntityProvider) {

    function AllGoodsProvider(api, $scope, pageSize, account, tag) {
      this.init(api, $scope, pageSize, account);
      this.filter = null;
      this.tag = tag;
      this.account = account;
      if (this.account) {
        var account_id = nxt.util.convertRSAddress(this.account);
        this.subscribe('addedUnConfirmedTransactions-'+account_id, this.addedTransactions);
      }
    }
    angular.extend(AllGoodsProvider.prototype, IndexedEntityProvider.prototype, {

      myAdd: function(data) {
        data.attachment.priceNXT = nxt.util.convertNQT(data.attachment.priceNQT);
        this.entities.push(data.attachment);
      },

      uniqueKey: function(good) {
        return good.goods || good.transaction;
      },
      sortFunction: function(a, b) {
        return a.index - b.index;
      },

      addedTransactions: function (transactions) {
        var changed = false;
        transactions.forEach(function (transaction) {
           if (transaction.type == 3 && transaction.subtype == 0) {
             /* replace x and y with proper types for LISTING */
             changed = true;
             this.myAdd(transaction);
           }
           else {
              /* replace x and y with proper types for DE-LISTING */
             changed = true;
             this.remove(transaction);
           }
        }.bind(this));
        if (changed) {        
         this.$scope.$evalAsync(this.sort.bind(this));
       }
      },

      getData: function(firstIndex) {
        var deferred = $q.defer();
        var args = {
          firstIndex: firstIndex,
          lastIndex: firstIndex + this.pageSize,
          includeCounts: true,
          requestType: 'getDGSGoods'
        }
        if (this.account) {
          args.seller = this.account;
        }
        if (this.filter) {
          args.query = this.filter;
          args.requestType = 'searchDGSGoods';
          if (!/\*$/.test(args.query)) {
            args.query += '*';
          }
        }
        if (this.tag) {
          args.tag = this.tag;
          args.requestType = 'searchDGSGoods';
        }
        this.api.engine.socket().callAPIFunction(args).then(deferred.resolve, deferred.reject);
        return deferred.promise;
      },

      dataIterator: function(data) {
        var goods = data.goods;
        var index = this.entities.length > 0 ? this.entities[this.entities.length - 1].index : 0;
        for (var i = 0; i < goods.length; i++) {
          var a = goods[i];
          a.index = index;
          a.priceNXT = nxt.util.convertNQT(a.priceNQT);
          if (a.tags) {
            var tags = a.tags.split(',');
            a.tagsHTML = '';
            for (var j=0; j<tags.length; j++) {
              if (j>0) {
                a.tagsHTML += ',';
              }
              a.tagsHTML += '<a href="#/goods/'+this.api.engine.symbol_lower+'/tags/'+tags[j]+'">'+tags[j]+'</a>';
            }
          }
        }
        return new Iterator(goods);
      }
    });
    return AllGoodsProvider;
  });
})();