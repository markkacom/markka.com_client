(function () {
'use strict';
var module = angular.module('fim.base');
module.factory('AssetDetailProvider', function (nxt, $q, IndexedEntityProvider, $timeout) {
  
  function AssetDetailProvider(api, $scope, asset, decimals, account) {
    this.api = api
    this.$scope = $scope;
    this.asset = asset;
    this.decimals = decimals;
    this.account = account;
    this.data = {};
    // api.engine.socket().subscribe('blockPopped', angular.bind(this, this.blockPopped), $scope);
    // api.engine.socket().subscribe('blockPushed', angular.bind(this, this.blockPushed), $scope);
  }
  AssetDetailProvider.prototype = {

    reload: function () {
      var self = this;
      var deferred = $q.defer();
      this.$scope.$evalAsync(function () {
        self.isLoading = true;
        $timeout(function () {  self.getNetworkData(deferred); }, 1, false);        
      });
      return deferred.promise;      
    },

    processData: function (d) {
      var data = this.data;
      data.name = d.name;
      data.description = d.description;
      data.issuerRS = d.issuerRS;
      data.issuerName = d.issuerName;
      data.quantityQNT = d.quantityQNT;
      data.numberOfTrades = d.numberOfTrades;
      data.numberOfTransfers = d.numberOfTransfers;
      data.numberOfAccounts = d.numberOfAccounts;
      data.volumeTodayQNT = d.volumeTodayQNT;
      data.numberOfTradesToday = d.numberOfTradesToday;
      data.volumeTotalQNT = d.volumeTotalQNT;
      data.orderFeePercentage = d.orderFeePercentage;
      data.tradeFeePercentage = d.tradeFeePercentage;
      data.type = '';
      data.lastPriceNQT = d.lastPriceNQT;

      data.lastPriceNXT = nxt.util.calculateOrderPricePerWholeQNT(data.lastPriceNQT, this.decimals);
      data.quantity = nxt.util.convertToQNTf(d.quantityQNT, this.decimals);
      data.volumeToday = nxt.util.convertToQNTf(d.volumeTodayQNT, this.decimals);
      data.volumeTotal = nxt.util.convertToQNTf(d.volumeTotalQNT, this.decimals);
      data.orderFee = nxt.util.convertToQNTf(String(d.orderFeePercentage), 6)||'0';
      data.tradeFee = nxt.util.convertToQNTf(String(d.tradeFeePercentage), 6)||'0'
      data.isPrivate = d.type && d.type == 1;

      var quantityQNT = new BigInteger(String(d.quantityQNT));
      var priceNQT = new BigInteger(String(d.lastPriceNQT));
      var marketcapNQT = quantityQNT.multiply(priceNQT).toString();
      data.marketcapNXT = nxt.util.convertToNXT(marketcapNQT);

      

    },    

    getNetworkData: function (reload_deferred) {
      var deferred = $q.defer(), self = this;
      this.api.engine.socket().getAsset({ asset: this.asset, includeDetails: 'true', includeVolumes: 'true' }).then(
        function (data) {
          self.$scope.$evalAsync(function () {
            self.isLoading = false;
            self.processData(data);
            deferred.resolve();
            if (reload_deferred) {
              reload_deferred.resolve();
            }            
          });
        }, 
        function (data) {
          self.$scope.$evalAsync(function () {
            self.isLoading = false;
            deferred.resolve();
            if (reload_deferred) {
              reload_deferred.resolve();
            }            
          });
        }
      );
      return deferred.promise;
    }   
  };
  return AssetDetailProvider;
});
})();