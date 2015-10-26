(function () {
'use strict';
var module = angular.module('fim.base');
module.factory('AssetAutocompleteProvider', function (nxt, $q, $rootScope) {
  function AssetAutocompleteProvider(api) {
    this.api = api;
  }
  AssetAutocompleteProvider.prototype = {
    getResults: function (query, id_rs) {
      var deferred = $q.defer();
      if (id_rs) {
        var args = {
          requestType: 'getAccountAssets',
          account: id_rs,
          firstIndex: 0,
          lastIndex: 100
        }
      }
      else {
        var args = {
          requestType: 'searchAssets',
          query: 'NAME:'+query+'*',
          firstIndex: 0,
          lastIndex: 15,
          includeCounts: true
        };
      }
      this.api.engine.socket().callAPIFunction(args).then(
        function (data) {
          var assets = (id_rs ? data.accountAssets : data.assets)||[];
          if (id_rs) {
            query = query.toLowerCase();
            assets = assets.filter(function (asset) {
              return asset.name.toLowerCase().indexOf(query) != -1;
            });
          }
          if (assets.length == 1 &&
              assets[0].asset == query) {
            deferred.resolve([]);
          }
          else {
            deferred.resolve(assets.map(
              function (asset) {
                asset.accountLabel = (id_rs) ?  asset.issuerName||asset.issuerRS :  // getAccountAssets
                                                asset.accountName||asset.accountRS; // searchAssets
                return asset;
              }
            ));
          }
        },
        deferred.reject
      );
      return deferred.promise;
    }
  }
  return AssetAutocompleteProvider;
});
})();