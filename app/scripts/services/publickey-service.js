/**
 * The MIT License (MIT)
 * Copyright (c) 2016 Krypto Fin ry and the FIMK Developers
 *
 * Permission is hereby granted, free of charge, to any person obtaining a copy of
 * this software and associated documentation files (the "Software"), to deal in
 * the Software without restriction, including without limitation the rights to
 * use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of
 * the Software, and to permit persons to whom the Software is furnished to do so,
 * subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be included in all
 * copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
 * SOFTWARE.
 * */
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