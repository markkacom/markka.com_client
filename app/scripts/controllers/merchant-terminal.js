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
  $routeProvider.when('/merchant/:recipient?/:amountNQT?/:deadline?/:description?/:message?/:assetId?/', {
    templateUrl: 'partials/merchant-terminal.html',
    controller: 'MerchantTerminalController'
  });
});

module.controller('MerchantTerminalController', function ($scope, $rootScope, nxt, $routeParams, plugins,$q) {

  $scope.paramRecipient     = $routeParams.recipient;
  $scope.paramAmountNQT     = $routeParams.amountNQT;
  $scope.paramDeadline      = $routeParams.deadline;
  $scope.paramDescription   = $routeParams.description;
  $scope.paramMessage       = $routeParams.message;
  $scope.assetId            = $routeParams.assetId;


  $scope.amountNXT          = nxt.util.convertToNXT($scope.paramAmountNQT);
  $scope.recipientName      = '';
  $scope.success            = false;

  var api                   = nxt.get($scope.paramRecipient);
  $scope.symbol             = api.engine.symbol;


  $scope.loading = true;

  var promises = [
    api.engine.socket().getAccount({account: $scope.paramRecipient}).then(function (data) {
      $scope.$evalAsync(function () {
        $scope.recipientName = data.accountName||data.accountEmail;
        if ($scope.recipientName == $scope.paramRecipient) {
          $scope.recipientName = '';
        }
      });
    })
  ];
  if ($scope.assetId) {
    promises.push(
      api.engine.socket().callAPIFunction({requestType:'getAsset', asset: $scope.assetId}).then(function (data) {
        $scope.$evalAsync(function () {
          $scope.asset = data;
          console.log(data)
        });
      })
    );
  }
  $q.all(promises).then(function () {
    $scope.$evalAsync(function () {
      $scope.loading = false;
    });
  });

  $scope.payNow = function () {
    var args = {};
    if ($scope.asset){
      args = {
        asset: $scope.asset.asset,
        recipient: $scope.paramRecipient,
        quantity:nxt.util.convertNQT($scope.paramAmountNQT, 8)
      };
      if ($scope.paramMessage) {
        args.txnMessage = $scope.paramMessage;
        args.txnMessageType = 'to_recipient';
      }

      $rootScope.executeTransaction('transferAsset', args).then(
        function (items) {
          console.log(items)
          if (items) {
            $scope.$evalAsync(function () {
              $scope.success = true;
            });
          }
        }
      );
    }else{
      args = {
        recipient: $scope.paramRecipient,
        amountNXT: nxt.util.convertNQT($scope.paramAmountNQT, 8),
        deadline: $scope.paramDeadline
      };
      if ($scope.paramMessage) {
        args.txnMessage = $scope.paramMessage;
        args.txnMessageType = 'to_recipient';
      }

      $rootScope.executeTransaction('sendMoney', args).then(
        function (items) {
          if (items) {
            $scope.$evalAsync(function () {
              $scope.success = true;
            });
          }
        }
      );
    }
  }

  $scope.signin = function () {
    $rootScope.loginWizard('signin', {}, false /* stay on same url */);
  }

});
})();
