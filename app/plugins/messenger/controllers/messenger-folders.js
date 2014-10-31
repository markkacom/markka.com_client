(function () {
'use strict';
var module = angular.module('fim.base');
module.controller('MessengerPluginFoldersController', function($state, $scope, $stateParams, db, alerts, $timeout) {
  $scope.accounts = [];
  $scope.selectedAccount = null;
  
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

  function fixlocation() {
    /* URL contains account ID - make that account the selected account */
    var selected = $scope.accounts[UTILS.findFirstPropIndex($scope.accounts, $stateParams, 'folder', 'id_rs')];
    if (selected && selected !== $scope.selectedAccount) {
      $scope.selectedAccount = selected;
      fixobjects();
    }
    /* Account is not in the database - go to first known good account */
    else if ($scope.accounts.length > 0) {
      $state.go('messenger', {folder: $scope.accounts[0].id_rs, message: $stateParams.message });
    }
  }

  function fixobjects() {
    angular.forEach($scope.accounts, function (account) {
      account.label = account.id_rs;
      account.count = 100;
      account.sref = 'messenger({folder: "'+account.id_rs+'"})';
    });
  }

});
})();