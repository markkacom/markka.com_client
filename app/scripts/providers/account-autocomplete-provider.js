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
module.factory('AccountAutocompleteProvider', function (nxt, $q, $rootScope) {
  function AccountAutocompleteProvider(api) {
    this.api = api;
  }
  AccountAutocompleteProvider.prototype = {
    getResults: function (query) {
      var deferred = $q.defer();
      var args = {
        requestType: 'searchAccountIdentifiers',
        query: query,
        firstIndex: 0,
        lastIndex: 15
      }
      this.api.engine.socket().callAPIFunction(args).then(
        function (data) {
          var accounts = data.accounts||[];
          if (accounts.length == 1 &&
              accounts[0].identifier == accounts[0].accountRS &&
              accounts[0].identifier == query) {
            deferred.resolve([]);
          }
          else {
            deferred.resolve(accounts.map(
              function (obj) {
                var v = {
                  label: obj.identifier,
                  id_rs: obj.accountRS
                };
                if ("FIM-"+v.label==v.id_rs) {
                  v.label = "FIM-"+v.label;
                }
                else if ("NXT-"+v.label==v.id_rs) {
                  v.label = "NXT-"+v.label;
                }
                else {
                  v.name = v.label;
                }
                return v;
              }
            ));
          }
        },
        deferred.reject
      );
      return deferred.promise;
    }
  }
  return AccountAutocompleteProvider;
});
})();