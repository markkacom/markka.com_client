(function () {
'use strict';
var module = angular.module('fim.base');
module.factory('AssetsProvider', function (nxt, $q, IndexedEntityProvider) {
  
  function AssetsProvider(api, $scope, pageSize, account) {
    this.init(api, $scope, pageSize, account);
  }
  angular.extend(AssetsProvider.prototype, IndexedEntityProvider.prototype, {

    uniqueKey: function (asset) { return asset.asset },
    sortFunction: function (a, b) { return a.index - b.index; },    

    getData: function (firstIndex) {
      var deferred = $q.defer();
      var args = {
        account:        this.account,
        firstIndex:     firstIndex,
        lastIndex:      firstIndex + this.pageSize
      }
      this.api.engine.socket().getAccountAssets(args).then(deferred.resolve, deferred.reject);
      return deferred.promise;
    },

    dataIterator: function (accountAssets) {
      var index = this.entities.length > 0 ? this.entities[this.entities.length - 1].index : 0;
      for (var i=0; i<accountAssets.length; i++) {
        var a = accountAssets[i];
        a.quantity = nxt.util.commaFormat(nxt.util.convertToQNTf(a.quantityQNT, a.decimals));
        a.totalQuantity = nxt.util.commaFormat(nxt.util.convertToQNTf(a.totalQuantityQNT, a.decimals));
        a.index = index++;
      }
      return new Iterator(accountAssets);
    }
  });
  return AssetsProvider;
});

})();