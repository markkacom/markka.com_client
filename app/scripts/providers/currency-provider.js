(function () {
'use strict';
var module = angular.module('fim.base');
module.factory('CurrencyProvider', function (nxt, $q, IndexedEntityProvider) {
  
  function CurrencyProvider(api, $scope, pageSize, account) {
    this.init(api, $scope, pageSize, account);
  }
  angular.extend(CurrencyProvider.prototype, IndexedEntityProvider.prototype, {

    uniqueKey: function (currency) { return currency.currency },
    sortFunction: function (a, b) { return a.index - b.index; },    

    getData: function (firstIndex) {
      var deferred = $q.defer();
      var args = {
        account:        this.account,
        firstIndex:     firstIndex,
        lastIndex:      firstIndex + this.pageSize
      }
      this.api.engine.socket().getAccountCurrencies(args).then(deferred.resolve, deferred.reject);
      return deferred.promise;
    },

    dataIterator: function (currencies) {
      var index     = this.entities.length > 0 ? this.entities[this.entities.length - 1].index : 0;
      for (var i=0; i<currencies.length; i++) {
        var a       = currencies[i];
        a.units     = nxt.util.convertToQNTf(a.units, a.decimals);
        a.totalUnits = nxt.util.convertToQNTf(a.currentSupply, a.decimals);
        a.index     = index++;
      }
      return new Iterator(currencies);
    }
  });
  return CurrencyProvider;
});
})();