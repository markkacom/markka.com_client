(function () {
'use strict';
var module = angular.module('fim.base');
module.factory('Account', function() {
  var Account = null;
  return {
    initialize: function (db) {
      Account = db.accounts.defineClass({
        id: String,
        id_rs: String,
        publicKey: String,
        name: String,
        engine: String,
        excluded: Boolean
      });

      Account.prototype.formatEngine = function () {
        return this.engine == 'TYPE_FIM' ? 'FIM accounts' : 'NXT accounts';
      }

      Account.prototype.save = function () {
        return db.accounts.put(this);
      };

      Account.prototype.delete = function () {
        return db.accounts.delete(this.id_rs);
      };

      Account.prototype.update = function (properties) {
        angular.extend(this, properties);
        return db.accounts.update(this.id_rs, properties);
      };

      return Account;
    },
    get: function () {
      return Account;
    }
  };
});

})();