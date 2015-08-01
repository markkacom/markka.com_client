(function () {
'use strict';
var module = angular.module('fim.base');
module.factory('AllAssetsProvider', function (nxt, $q, IndexedEntityProvider) {
  
  function AllAssetsProvider(api, $scope, pageSize) {
    this.init(api, $scope, pageSize);
    this.filter = null;
  }
  angular.extend(AllAssetsProvider.prototype, IndexedEntityProvider.prototype, {

    uniqueKey: function (asset) { return asset.asset; },
    sortFunction: function (a, b) { return a.index - b.index; },

    getData: function (firstIndex) {
      var deferred = $q.defer();
      var args = {
        firstIndex:     firstIndex,
        lastIndex:      firstIndex + this.pageSize,
        includeCounts:  true,
        requestType:    'getAllAssets'
      }
      if (this.filter) {
        args.query = this.filter;
        args.requestType = 'searchAssets';
        if (!/\*$/.test(args.query)) {
          args.query += '*';
        }
      }
      this.api.engine.socket().callAPIFunction(args).then(deferred.resolve, deferred.reject);
      return deferred.promise;
    },

    dataIterator: function (data) {
      var assets = data.assets;
      var index = this.entities.length > 0 ? this.entities[this.entities.length - 1].index : 0;
      for (var i=0; i<assets.length; i++) {
        var a       = assets[i];
        a.quantity  = nxt.util.convertToQNTf(a.quantityQNT, a.decimals);
        a.index     = index++;
        a.isPrivate = a.type == 1;
      }
      return new Iterator(assets);
    }
  });
  return AllAssetsProvider;
});
})();