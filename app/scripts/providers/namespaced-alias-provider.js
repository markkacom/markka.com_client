(function () {
'use strict';
var module = angular.module('fim.base');
module.factory('NamespacedAliasProvider', function (nxt, $q, IndexedEntityProvider) {
  
  function NamespacedAliasProvider(api, $scope, pageSize, account, filter) {
    this.init(api, $scope, pageSize, account);
    this.filter = filter || null;
  }
  angular.extend(NamespacedAliasProvider.prototype, IndexedEntityProvider.prototype, {

    uniqueKey: function (alias) { return alias.aliasName },
    sortFunction: function (a, b) { return a.index - b.index; },

    getData: function (firstIndex) {
      var deferred = $q.defer();
      var args = {
        account:     this.account,
        firstIndex:  firstIndex,
        lastIndex:   firstIndex + this.pageSize,
        requestType: 'getNamespacedAliases'
      }
      if (this.filter) {
        args.filter = this.filter;
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
      }
      return new Iterator(aliases);
    }
  });
  return NamespacedAliasProvider;
});
})();