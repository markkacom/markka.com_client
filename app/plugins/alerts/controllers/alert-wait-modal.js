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
module.controller('AlertWaitModalController', function (items, $modalInstance, $scope) {

  $scope.items = items;
  $scope.items.title = items.title || 'Please wait';
  $scope.items.message = items.message || 'Please wait';
  $scope.items.busy = 'busy' in items ? items.busy : true;
  $scope.items.btnLabel = items.btnLabel || 'Cancel';

  var deferred = items.deferred;

  /* Close when the promise is resolved */
  deferred.promise.then(
    function () {
      $modalInstance.close();
    }
  );

  /* The cancel button forwards to the deferred that will be rejected */
  $scope.dismiss = function () {
    deferred.reject();
    $modalInstance.dismiss();
  }
});
})();