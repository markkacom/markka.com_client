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
module.factory('PrivateAccountsProvider', function (nxt, $q, IndexedEntityProvider, AssetInfoProvider) {

  /**
    public static final byte TYPE_FIMKRYPTO = 40;

    private static final byte SUBTYPE_FIMKRYPTO_NAMESPACED_ALIAS_ASSIGNMENT = 0;
    private static final byte SUBTYPE_FIMKRYPTO_PRIVATE_ASSET_ADD_ACCOUNT = 1;
    private static final byte SUBTYPE_FIMKRYPTO_PRIVATE_ASSET_REMOVE_ACCOUNT = 2;
    private static final byte SUBTYPE_FIMKRYPTO_PRIVATE_ASSET_SET_FEE = 3;
   */

  function PrivateAccountsProvider(api, $scope, pageSize, asset) {
    this.init(api, $scope, pageSize);
    this.asset = asset;
    this.showWhat = 'all'; // all, allowed, prohibited
    this.orderFee = '0';
    this.tradeFee = '0';

    this.subscribe('blockPoppedNew', this.blockPopped);
    this.subscribe('blockPushedNew', this.blockPushed);

    var self = this;
    api.engine.socket().getAsset({asset: asset, includeDetails: 'true'}).then(function (asset) {
      var issuer_id  = nxt.util.convertRSAddress(asset.issuerRS);
      self.subscribe('removedUnConfirmedTransactions-'+issuer_id, self.removedUnConfirmedTransactions);
      self.subscribe('addedUnConfirmedTransactions-'+issuer_id, self.addedUnConfirmedTransactions);
      self.subscribe('addedConfirmedTransactions-'+issuer_id, self.addedConfirmedTransactions);
      self.$scope.$evalAsync(function () {
        self.orderFee = nxt.util.convertToQNTf(String(asset.orderFeePercentage), 6)||'0';
        self.tradeFee = nxt.util.convertToQNTf(String(asset.tradeFeePercentage), 6)||'0';
      });
    });
  }
  angular.extend(PrivateAccountsProvider.prototype, IndexedEntityProvider.prototype, {
    sortFunction: function (a,b) {
      return a.confirmations - b.confirmations;
    },
    uniqueKey: function (txn_or_account) {
      if (txn_or_account.id_rs) {
        return txn_or_account.id_rs;
      }
      return txn_or_account.recipientRS;
    },
    getData: function (firstIndex) {
      var deferred = $q.defer();
      var args = {
        asset:          this.asset,
        firstIndex:     firstIndex,
        lastIndex:      firstIndex + this.pageSize
      }
      switch (this.showWhat) {
        case "allowed":
          args.allowed = true;
          break;
        case "prohibited":
          args.allowed = false;
          break;
      }
      this.api.engine.socket().getAssetPrivateAccounts(args).then(deferred.resolve, deferred.reject);
      return deferred.promise;
    },
    dataIterator: function (data) {
      var accounts = data.accounts || [];
      for (var i=0; i<accounts.length; i++) {
        var a      = accounts[i];
        //a.quantity = nxt.util.convertToQNTf(a.quantityQNT, a.decimals);
      }
      return new Iterator(accounts);
    },

    /**
     * This iterator serves a double purpose.
     * a. prepares a list of model objects based of blockchain events (websockets)
     * b. update the trade and order fee when an appropriate transaction is seen
     */
    transactionIterator: function (transactions) {
      console.log('transactionIterator', transactions);
      var t, data = [];
      for (var i=0, t; i<transactions.length; i++) {
        t = transactions[i];
        if (t.type == 40 && t.subtype == 3) {
          this.orderFee = nxt.util.convertToQNTf(String(t.attachment.orderFeePercentage), 6)||'0';
          this.tradeFee = nxt.util.convertToQNTf(String(t.attachment.tradeFeePercentage), 6)||'0'
          continue;
        }
        if (t.type != 40 || (t.subtype != 1 && t.subtype != 2)) { continue;  } /* filter type */
        if (!t.attachment || t.attachment.asset != this.asset) { continue; } /* filter asset */
        /* partial update is enough */
        data.push({
          id_rs: t.recipientRS,
          name: t.recipientName,
          allowed: t.subtype == 1,
          confirmations: 0
        });
      }
      return new Iterator(data);
    },
    blockPopped: function () {
      var self = this;
      this.$scope.$evalAsync(function () {
        self.forEach(function (entity) {
          try { entity.confirmations--; } catch (e) {}
        });
      });
    },
    blockPushed: function () {
      var self = this;
      this.$scope.$evalAsync(function () {
        self.forEach(function (entity) {
          try { entity.confirmations++; } catch (e) {}
        });
      });
    }
  });
  return PrivateAccountsProvider;
});
})();