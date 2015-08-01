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
        var wallet = plugins.get('wallet').getWallet();
        if (angular.isObject(wallet)) {
          var id_rs, names = Object.getOwnPropertyNames(wallet);
          for (var i=0; i<names.length; i++) {
            id_rs = names[i];
            if (filter) {
              if (filter({id_rs: id_rs})) {
                accounts.push({ id_rs: id_rs, name: wallet[id_rs].name });
              }
            }
            else {
              accounts.push({ id_rs: id_rs, name: wallet[id_rs].name });
            }
          }
          var duplicate = {};
          accounts = accounts.filter(function (account) {
            if (duplicate[account.id_rs]) {
              return false;
            }
            duplicate[account.id_rs] = account;
            return true;
          });
        }
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