(function () {
'use strict';
var module = angular.module('fim.base');
module.factory('GoodsProvider', function (nxt, $q, $timeout, db, $rootScope) {
  
  function GoodsProvider(api, $scope, account) {
    this.api                    = api;
    this.$scope                 = $scope;
    this.account                = account;
    this.isLoading              = true;
    this.allGoods = [];
    this.name                   = '';
    this.description            = '';

    var account_id              = this.account;
    var delayedReload           = angular.bind(this, this.delayedReload);
    var socket                  = api.engine.socket();
    socket.subscribe('removedUnConfirmedTransactions-'+account_id, delayedReload, $scope);
    socket.subscribe('addedUnConfirmedTransactions-'+account_id, angular.bind(this, this.addedUnConfirmedTransactions), $scope);
    socket.subscribe('addedConfirmedTransactions-'+account_id, delayedReload, $scope);
    socket.subscribe('blockPoppedNew', angular.bind(this, this.blockPopped), $scope);
    socket.subscribe('blockPushedNew', angular.bind(this, this.blockPushed), $scope);
  }
  GoodsProvider.prototype = {
    reload: function () {
      var self = this;
      this.$scope.$evalAsync(function () {
        self.isLoading        = true;
        $timeout(function () {  self.getNetworkData(); }, 1, false);        
      });
    },
    getNetworkData: function () {
      var self = this, 
      getAllGoodsargs = {
        requestType: 'getDGSGoods',
        seller: this.account
      }
      this.api.engine.socket().callAPIFunction(getAllGoodsargs).then(function(a) {
          console.log(a);
          self.$scope.$evalAsync(function () {
            self.allGoods = a.goods;
            //self.isLoading              = false;
            //self.name                   = a.name;
            //self.description            = a.description;
            // if (a.lesseeIdRS) {
            //   self.leaseRemaining       = Math.max(a.leasingHeightTo - a.height, 0);
            // }
            // else {
            //   self.leaseRemaining       = 0;
            // }
            // if ($rootScope.TRADE_UI_ONLY) {
            //   db.accounts.put({
            //     id_rs: self.account,
            //     engine: self.api.engine.type,
            //     name: self.name||self.account
            //   });
            // }
          });
        },
        function (data) {
          self.$scope.$evalAsync(function () {
            self.isLoading = false;
          });
        }
      );
    },
    addedUnConfirmedTransactions: function (transactions) {
      var t;
      console.log("UNC Transations", transactions);
      for (var i=0; i<transactions.length; i++) {
        t = transactions[i];
        if (t.senderRS == this.account) {

        }
      }
    },
    blockPushed: function (block) {
      if (block.generator == this.account) {
        this.delayedReload();
      }
    },
    blockPopped: function (block) {
      if (block.generator == this.account) {
        this.delayedReload();
      }
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
  };
  return GoodsProvider;
});
})();