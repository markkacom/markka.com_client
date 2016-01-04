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
      if (angular.isString(this.filter)) {
        args.filter = this.filter.toLowerCase();
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