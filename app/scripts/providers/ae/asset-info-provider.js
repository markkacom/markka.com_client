(function () {
'use strict';
var module = angular.module('fim.base');
module.factory('AssetInfoProvider', function (nxt, $q, $timeout) {
  var cache = {};
  return {
    getInfo: function (api, asset, ignore_cache) {
      var c = cache[api.engine.type] || (cache[api.engine.type] = {});
      var deferred = $q.defer();
      if (!ignore_cache && c[asset] && c[asset].name) {
        deferred.resolve(c[asset]);
      }
      else {
        api.engine.socket().getAsset({ asset: asset, includeDetails: 'true', includeVolumes: 'true' }).then(
          function (data) {
            deferred.resolve(c[asset] = data);
          }
        );
      }
      return deferred.promise;
    }
  }
});
})();