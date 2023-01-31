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
module.factory('BlocksProvider', function (nxt, $q, EntityProvider) {

  function BlocksProvider(api, $scope, timestamp, account) {
    this.init(api, $scope, timestamp);
    this.account = account;

    if (this.account) {
      this.subscribe('blockPopped-'+this.account, angular.bind(this, this.blockPopped));
      this.subscribe('blockPushed-'+this.account, angular.bind(this, this.blockPushed));
    }
    else {
      this.subscribe('blockPoppedNew', angular.bind(this, this.blockPopped));
      this.subscribe('blockPushedNew', angular.bind(this, this.blockPushed));
    }
  }
  angular.extend(BlocksProvider.prototype, EntityProvider.prototype, {

    sortFunction: function (a, b) { return b.height - a.height; },
    uniqueKey: function (entity) { return entity.block;  },
    transactionIterator: function (blocks) { return new Iterator(blocks); },

    getData: function (timestamp) {
      var deferred = $q.defer();
      var self = this;
      var args = {
        timestamp: timestamp,
        includeAssetInfo: 'false',
        includeBlocks: 'true',
        includeTransactions: 'false'
      };
      if (this.account) {
        args.account = this.account;
      }
      this.api.engine.socket().getActivity(args).then(deferred.resolve, deferred.reject);
      return deferred.promise;
    },

    dataIterator: function (data) {
      var blocks = data.blocks || [];
      for (var i=0; i<blocks.length; i++) {
        var b = blocks[i];
        b.date              = nxt.util.formatTimestamp(b.timestamp);
        b.totalAmountNXT    = nxt.util.convertToNXT(b.totalAmountNQT);
        b.totalFeeNXT       = nxt.util.convertToNXT(b.totalFeeNQT);
        b.totalPOSRewardNXT = b.totalPOSRewardNQT ?
          (nxt.util.convertToNXT(b.totalPOSRewardNQT) + ' ' + this.api.engine.symbol) : 'none';
        b.rewardTotals = b.rewardTotals ? b.rewardTotals : "";
      }
      return new Iterator(blocks);
    },

    blockPushed: function (block) {
      var self = this;
      this.$scope.$evalAsync(function () {

        block.date              = nxt.util.formatTimestamp(block.timestamp);
        block.totalAmountNXT    = nxt.util.convertToNXT(block.totalAmountNQT);
        block.totalFeeNXT       = nxt.util.convertToNXT(block.totalFeeNQT);
        block.totalPOSRewardNXT = block.totalPOSRewardNQT ?
          (nxt.util.convertToNXT(block.totalPOSRewardNQT) + ' ' + self.api.engine.symbol) : 'none';

        var key = self.uniqueKey(block);
        if (self.duplicates[key]) {
          angular.extend(self.duplicates[key], block);
        }
        else {
          self.duplicates[key] = block;
          self.entities.unshift(block);
          if (self.entities.length > 20) {
            var last = self.entities.pop();
            if (last) {
              delete self.duplicates[self.uniqueKey(last)];
            }
          }
        }
        self.entities.sort(self.sortFunction);
      });
    },

    blockPopped: function (block) {
      var self = this;
      var length = this.entities.length;
      this.entities = this.entities.filter(
        function (entity) {
          if (self.uniqueKey(block) == self.uniqueKey(entity)) {
            delete self.duplicates[self.uniqueKey(entity)];
            return false;
          }
          return true;
        }
      );
      if (this.entities.length != length) {
        this.$scope.$evalAsync(function () {
          self.entities.sort(self.sortFunction);
        });
      }
    }
  });
  return BlocksProvider;
});
})();