(function () {
'use strict';
var module = angular.module('fim.base');

module.controller('ContactsPluginAddModalController', function (items, $modalInstance, $scope, alerts, db, $timeout, nxt) {
  
  $scope.items = items;
  $scope.items.name   = $scope.items.name || '';
  $scope.items.id_rs  = $scope.items.id_rs || '';
  $scope.items.email  = $scope.items.email || '';
  $scope.items.website  = $scope.items.website || '';
  $scope.items.update = $scope.items.update || false;
  $scope.valid        = false;
  $scope.errorMessage = null;

  $scope.id_rs_readonly = $scope.items.id_rs || $scope.items.update;
  $scope.name_readonly  = $scope.items.update;

  /* Load all contacts from the database to be able to provide instant feedback */
  var existing_contacts = [];
  db.contacts.toArray().then(
    function (_contacts) {
      existing_contacts = _contacts;

      /* Fetch the name in case we're doing an update */
      if ($scope.items.id_rs && $scope.items.update && !$scope.items.name) {
        $timeout(function () {
          for (var i=0; i<existing_contacts.length; i++) {
            if (existing_contacts[i].id_rs == $scope.items.id_rs) {
              $scope.items.name = existing_contacts[i].name;
              break;
            }
          }
        });
      }
    }
  );

  function unique(array, property, value) {
    for (var i=0; i<array.length; i++) {
      if (array[i][property] == value) {
        return false;
      }
    }
    return true;
  }

  $scope.nameIsUnique = function (value) {
    return unique(existing_contacts, 'name', value);
  };

  $scope.idIsUnique = function (value) {
    return unique(existing_contacts, 'id_rs', value);
  };

  $scope.idIsValid = function (id_rs) {
    if (id_rs && id_rs.trim().length > 0) {
      var engine = nxt.get(id_rs);
      if (engine) {
        var address = engine.createAddress();
        return !!address.set(id_rs)
      } 
      return false;
    }
    return true;
  };

  $scope.nameChanged = function () {
    if ($scope.items.name.trim().length == 0) {
      setErrorMessage(null);
    }
    else {
      var name = $scope.items.name;
      db.contacts.where('name').equals(name).count().then(
        function (count) {
          setErrorMessage(count > 0 ? 'Duplicate name' : null);
        }
      ).catch(alerts.catch('Contact'));
    }
  };

  function setErrorMessage(msg) {
    $timeout(function () {
      $scope.errorMessage = msg;
    });
  }

  $scope.close = function () {
    if ($scope.items.update) {
      db.contacts.put($scope.items).then(
        function () {
          $modalInstance.close($scope.items);
        }
      ).catch(alerts.catch('Could not save contact'));
    }
    else {
      db.contacts.add($scope.items).then(
        function () {
          $modalInstance.close($scope.items);
        }
      ).catch(alerts.catch('Could not save contact'));
    }
  }

  $scope.dismiss = function () {
    $modalInstance.dismiss();
  }
});

})();