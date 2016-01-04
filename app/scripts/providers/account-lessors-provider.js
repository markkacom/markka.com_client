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
module.factory('AccountLessorsProvider', function (nxt, $q, $timeout) {

  function AccountLessorsProvider(api, $scope, account) {
    this.api        = api;
    this.$scope     = $scope;
    this.account    = account;

    this.isLoading  = false;
    this.entities   = [];
  }
  AccountLessorsProvider.prototype = {
    reload: function () {
      var self = this;
      this.$scope.$evalAsync(function () {
        self.isLoading        = true;
        $timeout(function () {  self.getNetworkData(); }, 1, false);
      });
    },

    getNetworkData: function () {
      var self = this, args = { account: this.account };
      this.api.engine.socket().getAccountLessors(args).then(
        function (data) {
          self.isLoading = false;
          self.entities.length = 0;
          self.$scope.$evalAsync(function () {
            for (var i=0; i<data.lessors.length; i++) {
              var lessor = data.lessors[i];
              lessor.guaranteedBalanceNXT = nxt.util.convertToNXT(lessor.guaranteedBalanceNQT);
              self.entities.push(lessor);
            }
          });
        },
        function (data) {
          self.$scope.$evalAsync(function () {
            self.isLoading = false;
          });
        }
      );
    }
  };
  return AccountLessorsProvider;
});
})();