(function () {
'use strict';
var module = angular.module('fim.base');
module.factory('AliasProvider', function (nxt, $q, IndexedEntityProvider) {
  
  function AliasProvider(api, $scope, pageSize, account) {
    this.init(api, $scope, pageSize, account);
  }
  angular.extend(AliasProvider.prototype, IndexedEntityProvider.prototype, {

    uniqueKey: function (alias) { return alias.aliasName },
    sortFunction: function (a, b) { return a.index - b.index; },

    getData: function (firstIndex) {
      var deferred = $q.defer();
      var args = {
        account:     this.account,
        firstIndex:  firstIndex,
        lastIndex:   firstIndex + this.pageSize,
        requestType: 'getAliases'
      }
      this.api.engine.socket().callAPIFunction(args).then(deferred.resolve, deferred.reject);
      return deferred.promise;
    },

    dataIterator: function (data) {
      var aliases = data.aliases || [];
      var index = this.entities.length > 0 ? this.entities[this.entities.length - 1].index : 0;
      for (var i=0; i<aliases.length; i++) {
        var a   = aliases[i];
        a.index = index++;
        a.date  = nxt.util.formatTimestamp(a.timestamp);
        if (a.priceNQT) {
          a.priceNXT = nxt.util.convertToNXT(a.priceNQT);
        }
      }
      return new Iterator(aliases);
    }
  });
  return AliasProvider;
});
})();