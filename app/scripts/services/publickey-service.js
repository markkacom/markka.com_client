(function () {
'use strict';
var module = angular.module('fim.base');
module.factory('publicKeyService', function ($q, nxt) {
  return {
    getSync: function (id_rs) {
      return window.localStorage.getItem('mofo.publickey.'+id_rs);
    },
    get: function (id_rs) {
      var deferred = $q.defer();
      var item = window.localStorage.getItem('mofo.publickey.'+id_rs);
      if (item) {
        deferred.resolve(item);
      }
      else {
        var api = nxt.get(id_rs);
        if (!api) {
          deferred.reject();
        }
        else {
          var arg = {account:id_rs, requestType:'getAccountPublicKey'};
          api.engine.socket().callAPIFunction(arg).then(function (data) {
            if (data.publicKey) {
              window.localStorage.setItem('mofo.publickey.'+id_rs, data.publicKey);
              deferred.resolve(data.publicKey);
            }
            else {
              deferred.reject();
            }
          }, deferred.reject);
        }
      }
      return deferred.promise;
    },
    set: function (id_rs, publicKey) {
      if (!this.getSync(id_rs)) {
        var api = nxt.get(id_rs);
        if (id_rs != api.crypto.getAccountIdFromPublicKey(publicKey, true)) {
          console.log("Account and public key don't match ("+id_rs+")");
          return false;
        }
        var item = window.localStorage.getItem('mofo.publickey.'+id_rs);
        if (!item) {
          window.localStorage.setItem('mofo.publickey.'+id_rs, publicKey);
        }
      }
      return true;
    }
  };
});

})();