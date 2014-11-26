(function () {
'use strict';
var module = angular.module('fim.base');

module.controller('AccountsPluginTransactionsController', 
  function($scope, alerts, $timeout, ngTableParams, nxt, modals, plugins, db, $filter, requests, transactionService) {

  var podium = requests.theater.createPodium('accounts.transactions', $scope);

  $scope.$on('transaction-length-changed', function(event, mass) { 
    $scope.$evalAsync(function () {
      $scope.tableParams.total($scope.transactions.length);
      $scope.tableParams.reload(); 
    });
  });

  $scope.tableParams = new ngTableParams({
      page: 1,   // show first page
      count: 10  // count per page
    }, 
    {
      total: 0,   // length of data
      getData: function($defer, params) {

        if ($scope.selectedAccount) {
          var list = $scope.transactions.slice((params.page() - 1) * params.count(), params.page() * params.count());

          /* See if there are more transactions to download */
          var api = nxt.get($scope.selectedAccount.id_rs);
          transactionService.getTransactionsAfter($scope.selectedAccount.id_rs, api, podium, (params.page() - 1) * params.count(), params.count()+1);
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
});
})();