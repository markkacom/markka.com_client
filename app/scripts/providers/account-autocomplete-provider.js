(function () {
'use strict';
var module = angular.module('fim.base');
module.factory('AccountAutocompleteProvider', function (nxt, $q, $timeout, $rootScope) {
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
          console.log('data', data);
          if (data.accounts.length == 1 &&
              data.accounts[0].identifier == data.accounts[0].accountRS &&
              data.accounts[0].identifier == query) {
            deferred.resolve([]);
          }
          else {
            deferred.resolve(data.accounts.map(
              function (obj) {
                var v = {
                  label: obj.identifier,
                  id_rs: obj.accountRS
                };
                if (v.label != v.id_rs) {
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