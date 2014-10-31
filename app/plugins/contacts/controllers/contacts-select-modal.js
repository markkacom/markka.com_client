(function () {
'use strict';
var module = angular.module('fim.base');

module.controller('ContactsPluginSelectModalController', function (items, $modalInstance, 
  $scope, $timeout, db, ngTableParams, alerts, plugins, nxt) {

  $scope.items         = items;
  $scope.items.get_all = items.get_all || false;
  $scope.contacts = [];

  function filter(array, engine) {
    if ($scope.items.get_all) {
      return array;
    }
    var prefix = engine == nxt.TYPE_FIM ? 'FIM-' : 'NXT-';
    return array.filter(function (obj) {
      return obj.id_rs.indexOf(prefix) == 0;
    });
  }

  /* Load contacts from database */
  db.contacts.orderBy('name').toArray().then(
    function (contacts) {

      /* Filter contacts by engine if set */
      if ($scope.items.engine) {
        contacts = filter(contacts, $scope.items.engine);
      }
      $scope.contacts = contacts;

      /* Load my accounts from database */
      db.accounts.orderBy('name').toArray().then(
        function (accounts) {

          /* Filter accounts by engine if set */
          if ($scope.items.engine) {
            accounts = filter(accounts, $scope.items.engine);
          }
          $scope.contacts = accounts.concat($scope.contacts);

          refresh();
        }
      );
    }
  ).catch(alerts.catch("Could not load contacts"));  

  /* Register CRUD observer for contacts */
  db.contacts.addObserver($scope, 
    db.createObserver($scope, 'contacts', 'id_rs', {
      finally: function () {
        refresh();
      }
    })
  );

  $scope.selectContact = function (account) {
    $modalInstance.close(account);
  };

  $scope.showAccount = function (id_rs) {
    plugins.get('accounts').detail(id_rs);
  };

  $scope.dismiss = function () {
    $modalInstance.dismiss();
  };

  function refresh() {
    $timeout(function () { 
      $scope.tableParams = new ngTableParams(
        { page: 1, count: 10 }, 
        { total: $scope.contacts.length,
          getData: function($defer, params) {
            $defer.resolve($scope.contacts.slice((params.page() - 1) * params.count(), params.page() * params.count()));
          }
        }
      );
    });
  }
});

})();