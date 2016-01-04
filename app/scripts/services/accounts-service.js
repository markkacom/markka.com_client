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
module.factory('accountsService', function ($q, db, plugins) {

  var SERVICE = {};

  SERVICE.FIM_FILTER = function (account) { return account.id_rs.indexOf('FIM-') == 0; }
  SERVICE.NXT_FILTER = function (account) { return account.id_rs.indexOf('NXT-') == 0; }

  function getCombined(filter) {
    var deferred = $q.defer();
    var promise = filter ? db.accounts.filter(filter).sortBy('id_rs') : db.accounts.toCollection().sortBy('id_rs');
    promise.then(
      function (accounts) {
        accounts = accounts || [];
        deferred.resolve(accounts);
      },
      deferred.reject
    );
    return deferred.promise;
  }

  // @returns Promise
  SERVICE.getAll = function (filter) {
    return getCombined(filter);
  };

  // @returns Promise ( { id_rs: String })
  SERVICE.getFirst = function (id_rs) {
    var deferred = $q.defer();
    getCombined(function (obj) { return obj.id_rs == id_rs; }).then(
      function (accounts) {
        deferred.resolve(accounts[0]);
      },
      deferred.reject
    )
    return deferred.promise;
  };

  SERVICE.update = function (arg) {
    getFirst(arg.id_rs).then(
      function (account) {
        if (account) {

        }
      }
    )
  }

  SERVICE.onChange = function ($scope, callback) {
    db.accounts.addObserver($scope, {
      finally: function () {
        callback();
      }
    });
  }

  return SERVICE;
});

})();