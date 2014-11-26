(function () {
'use strict';

/**
 * The transactions service is responsible for downloading normal (confirmed) 
 * transactions for NXT and FIM accounts.
 *
 * Since the only transactions that make sense to download are the ones that
 * might be displayed in the UI the downloader will do the work it is hinted
 * to do only.
 */

var module = angular.module('fim.base');
module.factory('transactionService', function (nxt, db) {

  function processTransactions(iterator, api, to_be_inserted) {
    if (iterator.hasMore()) {
      var transaction = iterator.next();
      api.engine.db.transactions.where('transaction').equals(transaction.transaction).first().then(
        function (t) {
          if (!t) {
            to_be_inserted.push(transaction);
          }
          processTransactions(iterator, api, to_be_inserted)
        }
      );
    }
    else if (to_be_inserted.length) {
      db.transaction('rw', api.engine.db.transactions, function () {
        for (var i=0; i<to_be_inserted.length; i++) {
          api.engine.db.transactions.put(to_be_inserted[i]);
        }
      });
    }
  }

  function countTransactionsInDB(id_rs, api, callback) {
    api.engine.db.transactions.where('senderRS').equals(id_rs).
                                  or('recipientRS').equals(id_rs).
                                  or('related_rs_a').equals(id_rs).
                                  or('related_rs_b').equals(id_rs).count(
      function (count) {
        callback.call(null, count);
      }
    );
  }

  var INSTANCE = nxt.transactions = {

    /**
     * Checks and download unconfirmed transactions
     *
     * @param id_rs   String
     * @param api     ServerAPI
     * @param podium  Podium
     * @param count   Number defaults to 10
     * @param node    Node (optional)
     */
    getUnconfirmedTransactions: function (id_rs, api, podium, count, node) {

      /* The older FIMK API does not support translating RS accounts in the 
         getUnconfirmedTransactions call. Must use old account format for that */
      if (id_rs.indexOf('FIM-') == 0 /* || id_rs.indexOf('NXT-') */) {
        var address = api.createAddress();
        if (address.set(id_rs)) {
          id_rs = address.account_id();
        }
      }

      var options = {
        podium: podium,
        priority: 2
      };
      if (node) {
        options.node = node;
      }

      api.getUnconfirmedTransactions({
        account: id_rs
      }, 
      options).then(
        function (transactions) { 
          var iterator = new Iterator(transactions);
          var to_be_inserted = [];
          processTransactions(iterator, api, to_be_inserted);
        }
      );
    },

    /**
     * Downloads the newest transactions from the network.
     * TODO see if this can be optimized to use getAccountTransactionIds
     * instead.
     *
     * @param id_rs   String
     * @param api     ServerAPI
     * @param podium  Podium
     * @param count   Number defaults to 10
     */
    getNewestTransactions: function (id_rs, api, podium, count) {
      api.getAccountTransactions({
        account:    id_rs,
        firstIndex: 0,
        lastIndex:  count||10
      }, {
        podium: podium,
        priority: 2
      }).then(
        function (transactions) {
          var iterator = new Iterator(transactions);
          var to_be_inserted = [];
          processTransactions(iterator, api, to_be_inserted);
        }
      );
    },

    /**
     * Downloads transactions after a certain index.
     *
     * @param id_rs String
     * @param api ServerAPI
     * @param podium Podium
     * @param fromIndex Number
     * @param count Number
     */
    getTransactionsAfter: function (id_rs, api, podium, fromIndex, count) {
      countTransactionsInDB(id_rs, api, 
        function (db_count) {

          /* do we even need to download transactions? */
          if (db_count < (fromIndex+count)) {
            api.getAccountTransactions({
              account:    id_rs,
              firstIndex: fromIndex,
              lastIndex:  fromIndex+(count||10)
            }, {
              podium: podium,
              priority: 2
            }).then(
              function (transactions) {
                var iterator = new Iterator(transactions);
                var to_be_inserted = [];
                processTransactions(iterator, api, to_be_inserted);
              }
            );
          }
        }
      );
    }
  };

  return INSTANCE;
});
})();