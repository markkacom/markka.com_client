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
        name: String,
        passphrase: String,
        guaranteedBalanceNXT: String,
        balanceNXT: String,
        effectiveBalanceNXT: String,
        unconfirmedBalanceNXT: String,
        forgedBalanceNXT: String,
        publicKey: String,
        engine: String,
        isPublished: Boolean
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

      // Account.prototype.transactions = function () {
      //   return db.transactions.where('recipientRS').equals(this.id_rs).or('senderRS').equals(this.id_rs).sortBy('timestamp');
      // };

      // Account.prototype.transactionCount = function () {
      //   return db.transactions.where('recipientRS').equals(this.id_rs).or('senderRS').equals(this.id_rs).count();
      // };      

      return Account;
    },
    get: function () {
      return Account;
    }
  };
});

})();