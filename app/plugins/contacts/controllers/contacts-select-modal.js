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

module.controller('ContactsPluginSelectModalController', function (items, $modalInstance,
  $scope, $timeout, db, ngTableParams, plugins, nxt, $q) {

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
      ));

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
      ));
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