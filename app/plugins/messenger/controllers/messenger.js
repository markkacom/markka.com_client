(function () {
'use strict';
var module = angular.module('fim.base');
module.controller('MessengerPlugin', function($state, $scope, $stateParams, $timeout, nxt, alerts, db) {
  $scope.accounts = [];
  $scope.selectedAccount = null;
  $scope.engine = null;

  var run_list = [];
  $scope.run = function (callback) {
    run_list.push(callback);
  };

  function fixlocation() {
    /* URL contains account ID - make that account the selected account */
    var selected = $scope.accounts[UTILS.findFirstPropIndex($scope.accounts, $stateParams, 'folder', 'id_rs')];
    if (selected && selected !== $scope.selectedAccount) {
      $scope.selectedAccount = selected;
      $scope.api = nxt.get(selected.id_rs);
      $scope.api.startTransactionDownloader(selected);
      angular.forEach($scope.accounts, function (account) {
        account.label = account.id_rs;
        account.count = 100;
      });
      angular.forEach(run_list, function (callback) {
        callback.call();
      });
    }
    /* Account is not in the database - go to first known good account */
    else if ($scope.accounts.length > 0) {
      $state.go('messenger', {folder: $scope.accounts[0].id_rs, message: $stateParams.message });
    }
  }  
  
  /* Load accounts from database */
  db.accounts.orderBy('name').toArray().then(
    function (_accounts) {
      $timeout(function () { 
        $scope.accounts = _accounts;
        fixlocation();
      });
    }
  ).catch(alerts.catch("Could not load accounts"));  

  /* Register CRUD observer for accounts */
  db.accounts.addObserver($scope, 
    db.createObserver($scope, 'accounts', 'id_rs', {
      finally: function () {
        fixlocation(); /* if the selectedAccount is removed from the db this triggers a page reload */
      }
    })
  );
});
})();