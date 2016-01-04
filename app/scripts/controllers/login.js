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
module.config(function($routeProvider) {
  $routeProvider
    .when('/login/:encrypted_secret_key', {
      templateUrl: 'partials/login.html',
      controller: 'LoginController'
    });
});
module.controller('LoginController', function($scope, $rootScope, $location,
  $routeParams, nxt, plugins, WalletService, $timeout) {

  var cipher_secret     = $routeParams.encrypted_secret_key;
  $scope.login          = new WalletService($scope);
  $scope.login.setKey(cipher_secret);

  $scope.keyName        = $scope.login._getKeyName(cipher_secret) || $scope.login._getUniqueName();
  $scope.keyNameExists  = $scope.login._hasName($scope.keyName);
  $scope.keyAccount     = $scope.login._getKeyAccount($scope.keyName);
  $scope.keyPassword    = '';
  $scope.keyUnlocked    = {};
  $scope.secretPhrase   = '';
  $scope.secretURL      = '';
  $scope.wrongPassword  = false;
  var pending           = null;

  $scope.saveKey = function () {
    plugins.get('alerts').confirm({
      title: 'Save key',
      message: "Do you want to save this encrypted key in your browser?"
    }).then(
      function (confirmed) {
        if (confirmed) {
          $scope.login.saveKey($scope.keyUnlocked.engine, cipher_secret, $scope.keyName, $scope.keyUnlocked.account);
        }
      }
    );
  }

  $scope.keyNameChanged = function () {
    if (!pending) {
      $scope.keyNameExists = $scope.login._hasName($scope.keyName);
      pending = $timeout(function () { pending = null; }, 50);
    }
    else {
      $timeout.cancel(pending);
      pending = $timeout(function () {
        pending = null;
        $scope.keyNameExists = $scope.login._hasName($scope.keyName);
      }, 100);
    }
  }

  $scope.unlockKey = function () {
    var key = $scope.login.decrypt(cipher_secret, $scope.keyPassword);
    $scope.secretURL = 'https://www.mofowallet.com/launch.html#/login/'+cipher_secret;
    if (key) {
      $scope.keyUnlocked = key;
      $scope.wrongPassword = false;
    }
    else {
      $scope.wrongPassword = true;
    }
  }

  $scope.saveBackup = function () {
    var blob = new Blob([cipher_secret], {type: "text/plain;charset=utf-8"});
    saveAs(blob, $scope.keyName+'.backup');
  }

  $scope.mofoEncryptedPayload = $scope.login.encrypt({key: 'sure alas consume left gotten figure street hurt know faint parent interest', account: 'FIM-ABCD-HWHE-EGEG-HEHE', engine: 'fim'}, 'a');
});



})();