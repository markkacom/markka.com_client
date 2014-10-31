(function () {
'use strict';
var module = angular.module('fim.base');

module.controller('AccountsPluginTransactionsController', 
  function($scope, alerts, $timeout, ngTableParams, nxt, modals, plugins, db, $filter) {

  /* Show detail modal for account */
  $scope.showAccount = function (id_rs) {
    plugins.get('accounts').detail(id_rs);
  }; 

  $scope.showTransaction = function (id) {
    plugins.get('blocks').showTransaction($scope.selectedAccount.engine, id);
  }

  /* ng-table config XXX - TODO look into https://datatables.net/ instead */ 
  // $scope.transactions = [];
  $scope.tableParams = new ngTableParams({
      page: 1,   // show first page
      count: 10  // count per page
    }, 
    {
      total: 0,   // length of data
      getData: function($defer, params) {
        if ($scope.selectedAccount) {
          var list = $scope.transactions.slice((params.page() - 1) * params.count(), params.page() * params.count());
        }
        else {
          var list = [];
        }

        /* Must only translate accounts that have a name and not those not in the db */
        function translator(id_rs) {
          if ($scope.selectedAccount && id_rs == $scope.selectedAccount.id_rs) {
            return '<strong>'+($scope.selectedAccount.name ? $scope.selectedAccount.name : id_rs)+'</strong>';
          }
          return id_rs;
        }

        var api = $scope.selectedAccount ? nxt.get($scope.selectedAccount.id_rs) : null;
        var transactions = [];
        angular.forEach(list, function (transaction) {

          /* downloaded transaction */
          if (transaction.timestamp) {
            transactions.push({
              renderedHTML: api ? api.renderer.getHTML(transaction, translator) : '',
              date: nxt.util.formatTimestamp(transaction.timestamp), 
              timeago: nxt.util.formatTimestamp(transaction.timestamp, true)
            });
          }
          else {
            transactions.push({
              transaction: transaction.transaction
            });
          }
        });
        $defer.resolve(transactions);
      }
    }
  );

  $scope.$on('transaction-length-changed', function(event, mass) { 
    $scope.$evalAsync(function () {
      $scope.tableParams.total($scope.transactions.length);
      $scope.tableParams.reload(); 
    });
  });

  // function find(array, id, value) {
  //   for(var i=0,l=array.length; i<l; i++) { if (array[i][id] == value) { return i; } }
  //   return -1;
  // }

  // function sorter(a,b) {
  //   return b.timestamp - a.timestamp;
  // }

  // function filter(array) {
  //   if ($scope.selectedAccount) {
  //     var id_rs = $scope.selectedAccount.id_rs
  //     return array.filter(function (t) { return t.senderRS == id_rs || t.recipientRS == id_rs });
  //   }
  //   return [];
  // }

  // var observer = null;
  // $scope.$watch('selectedAccount', function (selectedAccount) {    
  //   $scope.transactions = [];
  //   if (!selectedAccount) return;

  //   /* Load transactions from database */
  //   var engine = nxt.get($scope.selectedAccount.id_rs).engine;
  //   engine.db.transactions.where('senderRS').equals($scope.selectedAccount.id_rs).
  //                        or('recipientRS').equals($scope.selectedAccount.id_rs).toArray().then(
  //     function (transactions) {
  //       $timeout(function () {
  //         transactions.sort(sorter);
  //         $scope.transactions = transactions;
  //         $scope.tableParams.total(transactions.length);
  //         $scope.tableParams.reload(); 
  //       });
  //     }
  //   ).catch(alerts.catch("Could not load transactions from database"));

  //   /* Must use same observer */
  //   observer = observer || {
  //     create: function (transactions) {
  //       $scope.transactions = $scope.transactions.concat(filter(transactions));
  //       $scope.transactions.sort(sorter);
  //     },
  //     update: function (transactions) {
  //       angular.forEach(filter(transactions), function (t) {
  //         var index = find($scope.transactions, 'transaction', t.transaction);
  //         if (index != -1) {
  //           angular.extend($scope.transactions[index], t);
  //         }
  //       });
  //     },
  //     remove: function (transactions) {
  //       angular.forEach(filter(transactions), function (t) {
  //         var index = find($scope.transactions, 'transaction', t.transaction);
  //         if (index != -1) {
  //           $scope.transactions.splice(index, 1);
  //         }
  //       });
  //     },
  //     finally: function () { /* called from $timeout */
  //       $scope.tableParams.total($scope.transactions.length);
  //       $scope.tableParams.reload(); 
  //     }
  //   };

  //   /* Register transactions CRUD observer */
  //   engine.db.transactions.addObserver($scope, observer);
  // });

});

})();