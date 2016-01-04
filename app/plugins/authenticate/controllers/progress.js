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
module.controller('AuthenticatePluginSendModal', function(items, $modalInstance, $scope, $q, $http, $timeout) {

  $scope.items    = items;
  $scope.message  = 'Sending data';
  var canceller   = $q.defer();

  $scope.close = function (success) {
    canceller.resolve();
    $modalInstance.close(success);
  };

  function setMessage(txt) {
    $scope.$evalAsync(function () {
      $scope.message = txt;
    });
  }

  $http(
    angular.extend(items.http_args, {
      timeout: canceller.promise
    })
  ).success(
    function (data, status, headers, config) {
      setMessage('Send Successfully');
      $timeout(function () {
        $modalInstance.close(true);
      }, 2000);
    }
  ).error(
    function (data, status, headers, config) {
      setMessage('Send Failed');
      $timeout(function () {
        $modalInstance.close(false);
      }, 2000);
    }
  );

});
})();