(function () {
'use strict';
var module = angular.module('fim.base');

module.controller('ContactsPluginSelectModalController', function (items, $modalInstance, 
  $scope, $timeout, db, ngTableParams, alerts, plugins, nxt, $q) {

  $scope.items         = items;
  $scope.items.get_all = items.get_all || false;
  $scope.contacts      = items.contacts || [];
  $scope.include       = items.include || ['contacts', 'accounts'];

  function filter(array, engine) {
    if ($scope.items.get_all) {
      return array;
    }
    var prefix = engine == nxt.TYPE_FIM ? 'FIM-' : 'NXT-';
    return array.filter(function (obj) {
      return obj.id_rs.indexOf(prefix) == 0;
    });
  }

  if ($scope.contacts.length == 0) {

    var promises = [];

    /* Load contacts from database */
    if ($scope.include.indexOf('contacts') != -1) {
      promises.push(db.contacts.orderBy('name').toArray().then(
        function (contacts) {

          /* Filter contacts by engine if set */
          if ($scope.items.engine) {
            contacts = filter(contacts, $scope.items.engine);
          }
          $scope.contacts = $scope.contacts.concat(contacts);
        }
      ).catch(alerts.catch("Could not load contacts")));

    }

    /* Load my accounts from database */
    if ($scope.include.indexOf('accounts') != -1) {
      promises.push(db.accounts.orderBy('name').toArray().then(
        function (accounts) {

          /* Filter accounts by engine if set */
          if ($scope.items.engine) {
            accounts = filter(accounts, $scope.items.engine);
          }
          $scope.contacts = $scope.contacts.concat(accounts);
        }
      ).catch(alerts.catch("Could not load accounts")));
    }

    $q.all(promises).then(
      function () {
         refresh();
      }
    )

    /* Register CRUD observer for contacts */
    db.contacts.addObserver($scope, 
      db.createObserver($scope, 'contacts', 'id_rs', {
        finally: function () {
          refresh();
        }
      })
    );
  }

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