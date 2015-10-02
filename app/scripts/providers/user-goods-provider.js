(function() {
  'use strict';
  var module = angular.module('fim.base');
  module.factory('UserGoodsProvider', function(nxt, $q, IndexedEntityProvider) {

    function UserGoodsProvider(api, $scope, pageSize, account) {
      this.init(api, $scope, pageSize, account);
      this.filter = null;
      this.account = account;
      var account_id = nxt.util.convertRSAddress(this.account);
      this.subscribe('addedUnConfirmedTransactions-'+account_id, this.addedTransactions);
    }
    angular.extend(UserGoodsProvider.prototype, IndexedEntityProvider.prototype, {

      remove: function(data) {
        for(var a=0; a< this.entities.length; a++) {
          if(this.entities[a].goods == data.attachment.goods){
            this.entities.splice(a, 1);
          }
        }
      },

      uniqueKey: function(good) {
        return good.goods || good.transaction;;
      },
      sortFunction: function(a, b) {
        return a.index - b.index;
      },

      addedTransactions: function (transactions) {
        console.log(transactions);
        var changed = false;
        transactions.forEach(function (transaction) {
           if (transaction.type == 3 && transaction.subtype == 0) {
             /* replace x and y with proper types for LISTING */
             changed = true;
             this.add(transaction);
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
          requestType: 'getDGSGoods',
          seller: this.account
        }
        if (this.filter) {
          args.query = this.filter;
          args.requestType = 'searchDGSGoods';
          if (!/\*$/.test(args.query)) {
            args.query += '*';
          }
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
          a.priceFIMK = nxt.util.convertNQT(a.priceNQT);
        }
        return new Iterator(goods);
      }
    });
    return UserGoodsProvider;
  });
})();