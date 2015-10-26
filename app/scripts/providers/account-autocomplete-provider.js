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