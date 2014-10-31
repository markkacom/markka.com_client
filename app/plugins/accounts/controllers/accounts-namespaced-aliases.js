(function () {
'use strict';
var module = angular.module('fim.base');
module.controller('AccountsPluginNamespacedAliasesController', function($scope, alerts, $timeout, ngTableParams, nxt) {
  
  $scope.transactions = [];
  $scope.tableParams  = new ngTableParams({ page: 1, count: 10 }, 
    { total: 0,
      getData: function($defer, params) {
        var page = $scope.transactions.slice((params.page() - 1) * params.count(), params.page() * params.count());
        $defer.resolve(page);
      }
    }
  );

  function find(array, id, value) {
    for(var i=0,l=array.length; i<l; i++) { if (array[i][id] == value) { return i; } }
    return -1;
  }

  function sorter(a,b) {
    return b.timestamp - a.timestamp;
  }

  function filter(array) {
    if ($scope.selectedAccount) {
      var id_rs = $scope.selectedAccount.id_rs
      return array.filter(function (t) { return t.senderRS == id_rs && t.type == 40 && t.subtype == 0 });
    }
    return [];
  }

  var observer = null;
  $scope.$watch('selectedAccount', function (selectedAccount) {    
    $scope.transactions = [];
    if (!selectedAccount) return;

    /* Load transactions from database */
    var engine = nxt.get($scope.selectedAccount.id_rs).engine;
    engine.db.transactions.where('senderRS').equals($scope.selectedAccount.id_rs).
              and(function (t) { return t.type == 40 && t.subtype == 0 } ).toArray().then(
      function (transactions) {
        $timeout(function () {
          transactions.sort(sorter);
          $scope.transactions = transactions;
          $scope.tableParams.total(transactions.length);
          $scope.tableParams.reload(); 
        });
      }
    ).catch(alerts.catch("Could not load transactions from database"));

    /* Must use same observer */
    observer = observer || {
      create: function (transactions) {
        $scope.transactions = $scope.transactions.concat(filter(transactions));
        $scope.transactions.sort(sorter);
      },
      update: function (transactions) {
        angular.forEach(filter(transactions), function (t) {
          var index = find($scope.transactions, 'transaction', t.transaction);
          if (index != -1) {
            angular.extend($scope.transactions[index], t);
          }
        });
      },
      remove: function (transactions) {
        angular.forEach(filter(transactions), function (t) {
          var index = find($scope.transactions, 'transaction', t.transaction);
          if (index != -1) {
            $scope.transactions.splice(index, 1);
          }
        });
      },
      finally: function () { /* called from $timeout */
        $scope.tableParams.total($scope.transactions.length);
        $scope.tableParams.reload(); 
      }
    };

    /* Register transactions CRUD observer */
    engine.db.transactions.addObserver($scope, observer);
  });

  $scope.edit = function (aliasName, aliasValue) {
    plugins.get('alerts').prompt({
      title: 'Update alias',
      message: 'Enter new value for key ' + aliasName,
      value: aliasValue
    })
  }

});
})();