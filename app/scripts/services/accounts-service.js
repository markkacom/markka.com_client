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