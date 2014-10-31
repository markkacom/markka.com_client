(function () {
'use strict';
var module = angular.module('fim.base');
module.controller('MessengerPluginInboxController', function($state, $scope, $timeout, ngTableParams, $stateParams, nxt, alerts) {

  $scope.transactions = [];

  /* Filter all but Arbitrary Messages */
  function filter(transaction) {
    return transaction.type == 1 && transaction.subtype == 0;
  }

  $scope.run(function () {
    console.log('$scope.run()');
    if ($scope.selectedAccount && $scope.api) {
      var id_rs = $scope.selectedAccount.id_rs;
      $scope.api.engine.db.transactions.where('recipientRS').equals(id_rs).or('senderRS').equals(id_rs).toArray().then(
        function (transactions) {
          transactions = transactions.filter(filter);
          console.log('transactions',transactions);

          $scope.transactions = transactions;
          $timeout(function () {
            $scope.tableParams.total(transactions.length);
            $scope.tableParams.reload();
          });
        }
      )
    }
  });

  $scope.tableParams = new ngTableParams({
      page: 1,   // show first page
      count: 10  // count per page
    },{
      total: $scope.transactions.length,   // length of data
      getData: function($defer, params) {
        var page = $scope.transactions.slice((params.page() - 1) * params.count(), params.page() * params.count());
        $defer.resolve(page);
      }
    }
  );


});
})();