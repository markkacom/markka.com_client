/**
 * The MIT License (MIT)
 * Copyright (c) 2016 Krypto Fin ry and the FIMK Developers
 *
 * Permission is hereby granted, free of charge, to any person obtaining a copy of
 * this software and associated documentation files (the "Software"), to deal in
 * the Software without restriction, including without limitation the rights to
 * use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of
 * the Software, and to permit persons to whom the Software is furnished to do so,
 * subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be included in all
 * copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
 * SOFTWARE.
 * */
(function () {
'use strict';
var module = angular.module('fim.base');

module.controller('ContactsPluginAddModalController', function (items, $modalInstance, $scope, db, $timeout, nxt) {

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
      );
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
      );
    }
    else {
      db.contacts.add($scope.items).then(
        function () {
          $modalInstance.close($scope.items);
        }
      );
    }
  }

  $scope.dismiss = function () {
    $modalInstance.dismiss();
  }
});

})();