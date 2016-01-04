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
module.factory('AccountProvider', function (nxt, $q, $timeout, db, $rootScope, UserService) {

  function AccountProvider(api, $scope, account) {
    this.api                    = api;
    this.$scope                 = $scope;
    this.account                = account;
    this.isLoading              = true;

    this.symbol                 = 'AA';
    this.name                   = '';
    this.description            = '';
    this.balanceNXT             = '0';
    this.unconfirmedBalanceNXT  = '0';
    this.effectiveBalanceNXT    = '0';
    this.forgedBalanceNXT       = '0';
    this.guaranteedBalanceNXT   = '0';
    this.leasingHeightFrom      = Number.MAX_VALUE;
    this.leasingHeightTo        = Number.MAX_VALUE;
    this.lesseeIdRS             = '';
    this.leaseRemaining         = 0;

    var account_id              = nxt.util.convertRSAddress(this.account);
    var delayedReload           = angular.bind(this, this.delayedReload);
    var socket                  = api.engine.socket();
    socket.subscribe('removedUnConfirmedTransactions-'+account_id, delayedReload, $scope);
    socket.subscribe('addedUnConfirmedTransactions-'+account_id, angular.bind(this, this.addedUnConfirmedTransactions), $scope);
    socket.subscribe('addedConfirmedTransactions-'+account_id, delayedReload, $scope);
    socket.subscribe('blockPoppedNew', angular.bind(this, this.blockPopped), $scope);
    socket.subscribe('blockPushedNew', angular.bind(this, this.blockPushed), $scope);
  }
  AccountProvider.prototype = {
    reload: function () {
      var self = this;
      this.$scope.$evalAsync(function () {
        self.isLoading        = true;
        $timeout(function () {  self.getNetworkData(); }, 1, false);
      });
    },
    getNetworkData: function () {
      var self = this, args = { account:this.account };
      if (UserService.currentAccount && UserService.currentAccount.id_rs == this.account) {
        args.includeAssetCount = 'true';
        args.includePurchasedProductsCount = 'true';
        args.includeSoldProductsCount = 'true';
      }
      this.api.engine.socket().getAccount(args).then(
        function (a) {
          self.$scope.$evalAsync(function () {
            self.isLoading              = false;
            self.symbol                 = a.accountColorName||self.api.engine.symbol;
            self.name                   = a.accountName;
            self.description            = a.description;
            self.balanceNXT             = nxt.util.convertToNXT(a.balanceNQT);
            self.unconfirmedBalanceNXT  = nxt.util.convertToNXT(a.unconfirmedBalanceNQT);
            self.effectiveBalanceNXT    = nxt.util.commaFormat(String(a.effectiveBalanceNXT));
            self.forgedBalanceNXT       = nxt.util.convertToNXT(a.forgedBalanceNQT);
            self.guaranteedBalanceNXT   = nxt.util.convertToNXT(a.guaranteedBalanceNQT);
            self.leasingHeightFrom      = a.leasingHeightFrom || Number.MAX_VALUE;
            self.leasingHeightTo        = a.leasingHeightTo || Number.MAX_VALUE;
            self.lesseeIdRS             = a.lesseeIdRS || '';
            self.publicKey              = a.publicKey;

            self.assetCount             = a.assetCount||'0';
            self.askOrderCount          = a.askOrderCount||'0';
            self.bidOrderCount          = a.bidOrderCount||'0';
            self.purchasedProductsCount = a.purchasedProductsCount||'0';
            self.soldProductsCount      = a.soldProductsCount||'0';

            if (a.lesseeIdRS) {
              self.leaseRemaining       = Math.max(a.leasingHeightTo - a.height, 0);
            }
            else {
              self.leaseRemaining       = 0;
            }
            if ($rootScope.TRADE_UI_ONLY) {
              db.accounts.put({
                id_rs: self.account,
                engine: self.api.engine.type,
                name: self.name||self.account
              });
            }
            if (UserService.isCurrentAccount(self.account)) {
              self.publicKey = self.api.crypto.secretPhraseToPublicKey($rootScope.currentAccount.secretPhrase);
            }
          });
        },
        function (data) {
          self.$scope.$evalAsync(function () {
            self.isLoading = false;
          });
        }
      );
    },
    addedUnConfirmedTransactions: function (transactions) {
      var t;
      for (var i=0; i<transactions.length; i++) {
        t = transactions[i];
        if (t.senderRS == this.account) {

        }
      }
    },
    blockPushed: function (block) {
      if (block.generator == this.account) {
        this.delayedReload();
      }
    },
    blockPopped: function (block) {
      if (block.generator == this.account) {
        this.delayedReload();
      }
    },
    delayedReload: function () {
      if (this.timeout) {
        clearTimeout(this.timeout);
      }
      var self = this;
      this.timeout = setTimeout(function () {
        self.timeout = null;
        self.reload();
      }, 1000);
    }
  };
  return AccountProvider;
});
})();