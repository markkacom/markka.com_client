(function () {
'use strict';
var module = angular.module('fim.base');
module.controller('ContactsPlugin', function ($scope, plugins, alerts, ngTableParams, db, $timeout) {

  $scope.addContact = function () {
    plugins.get('contacts').add({
      message: 'Please enter the details for this contact',
      id_rs: ''
    }).then(
      function (success) {
        if (success) {
          alerts.success('Successfully added contact');
        }
      }
    ).catch(alerts.catch('Could not safe contact'));
  };

  $scope.contacts = [];
  $scope.tableParams = new ngTableParams({ page: 1, count: 20 }, {
    total: 0, 
    getData: function($defer, params) {
      $defer.resolve($scope.contacts.slice((params.page() - 1) * params.count(), params.page() * params.count()));
    }
  });

  /* Load contacts from database */
  db.contacts.orderBy('name').toArray().then(
    function (contacts) {
      $scope.contacts = contacts;
      db.accounts.orderBy('name').toArray().then(
        function (accounts) {
          $scope.contacts = accounts.concat($scope.contacts);
          $timeout(function () {
            $scope.tableParams.total($scope.contacts);
            $scope.tableParams.reload();
          });
        }
      );
    }
  ).catch(alerts.catch("Could not load contacts"));  

  /* Register CRUD observer for contacts */
  db.contacts.addObserver($scope, 
    db.createObserver($scope, 'contacts', 'id_rs', {
      finally: function () {
        $scope.tableParams.total($scope.contacts);
        $scope.tableParams.reload();
      }
    })
  );

  function find(id_rs) {
    for (var i=0; i<$scope.contacts.length; i++) {
      if ($scope.contacts[i].id_rs == id_rs) {
        return $scope.contacts[i];
      }
    }
  }

  $scope.showAccount = function (id_rs) {
    plugins.get('accounts').detail(id_rs);
  };

  $scope.editContact = function (contact) {
    var args = {
      message: 'Please enter the details for this contact',
    };
    args.id_rs    = contact.id_rs;
    args.name     = contact.name;
    args.email    = contact.email || '';
    args.website  = contact.website || '';

    plugins.get('contacts').update(args).then(
      function () {
        alerts.success('Successfully updated contact');
      }
    ).catch(alerts.catch('Could not update contact'));
  };

  $scope.removeContact = function (contact) {
    if (window.confirm('Are you sure you want to delete this contact?')) {
      db.contacts.delete(contact.id_rs).catch(alerts.catch('Could not delete contact'));
    }
  };

  $scope.sendMoney = function (contact) {
    plugins.get('payment').create({
      recipientRS:        contact.id_rs,
      recipientReadonly:  true
    });
  };

});

})();