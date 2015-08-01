(function () {
'use strict';
var module = angular.module('fim.base');
module.factory('AssetInfoProvider', function (nxt, $q, $timeout) {
  var cache = {};
  return {
    getInfo: function (api, asset) {
      var c = cache[api.engine.type] || (cache[api.engine.type] = {});
      var deferred = $q.defer();
      if (c[asset]) {
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