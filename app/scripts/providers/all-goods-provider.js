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
(function() {
  'use strict';
  var module = angular.module('fim.base');
  module.factory('AllGoodsProvider', function(nxt, $q, IndexedEntityProvider, $timeout) {

    function AllGoodsProvider(api, $scope, pageSize, account, tag) {
      this.init(api, $scope, pageSize, account);
      this.filter = null;
      this.tag = tag;
      this.account = account;
      if (this.account) {
        var account_id = nxt.util.convertRSAddress(this.account);
        this.subscribe('addedUnConfirmedTransactions-'+account_id, this.addedUnConfirmedTransactions);
      }
      else {
        this.subscribe('addedUnConfirmedTransactions', this.addedUnConfirmedTransactions);
      }
      this.subscribe('blockPushedNew', this.blockPushed);
    }
    angular.extend(AllGoodsProvider.prototype, IndexedEntityProvider.prototype, {

      uniqueKey: function(good) {
        return good.goods || good.transaction;
      },

      sortFunction: function(a, b) {
        if (a.timestamp < b.timestamp)      { return 1; }
        else if (a.timestamp > b.timestamp) { return -1; }
        else {
          if (a.transaction||a.goods < b.transaction||b.goods)      { return 1;  }
          else if (a.transaction||a.goods > b.transaction||b.goods) { return -1; }
        }
        return 0;
      },

      getData: function(firstIndex) {
        var deferred = $q.defer();
        var args = {
          firstIndex: firstIndex,
          lastIndex: firstIndex + this.pageSize,
          includeCounts: 'true',
          inStockOnly: 'true',
          hideDelisted: 'true',
          requestType: 'getDGSGoods'
        }
        if (this.account) {
          args.seller = this.account;
        }
        if (this.filter) {
          args.query = this.filter;
          args.requestType = 'searchDGSGoods';
          if (!/\*$/.test(args.query)) {
            args.query += '*';
          }
        }
        if (this.tag) {
          args.tag = this.tag;
          args.requestType = 'searchDGSGoods';
        }
        this.api.engine.socket().callAPIFunction(args).then(deferred.resolve, deferred.reject);
        return deferred.promise;
      },

      translate: function (item) {
        item.priceNXT = nxt.util.convertToAsset(item.priceNQT, item.assetDecimals);
        item.date = nxt.util.formatTimestamp(item.timestamp);
        if (!item.expiry || item.expiry === 2147483647) {
          var d = new Date(nxt.util.convertFromEpochTimestamp(item.timestamp));
          d.setMonth(d.getMonth() + 6);
          item.expiry = nxt.util.convertToEpochTimestamp(d);
        }
        item.isExpired = nxt.util.convertToEpochTimestamp(Date.now()) > item.expiry;
        item.expiry = item.expiry === 2147483647 ? null : nxt.util.formatTimestamp(item.expiry);
        if (item.tags) {
          var tags = item.tags.split(',');
          item.tagsHTML = '';
          for (var j=0; j<tags.length; j++) {
            if (j>0) {
              item.tagsHTML += ',';
            }
            item.tagsHTML += '<a href="#/goods/'+this.api.engine.symbol_lower+'/tags/'+tags[j]+'">'+tags[j]+'</a>';
          }
        }
      },

      dataIterator: function(data) {
        var goods = data.goods;
        for (var i = 0; i < goods.length; i++) {
          this.translate(goods[i]);
        }
        return new Iterator(goods);
      },

      /* @websocket */
      addedUnConfirmedTransactions: function (transactions) {
        var model_changed = false;
        transactions.forEach(function (transaction) {
          /* Look for all GOODS type transactions */
          if (transaction.type == 3) {
            switch (transaction.subtype) {
              case 0: { /* listing */
                model_changed = true;
                var item = {
                  goods: transaction.transaction,
                  name: transaction.attachment.name,
                  description: transaction.attachment.description,
                  quantity: transaction.attachment.quantity,
                  priceNQT: transaction.attachment.priceNQT,
                  seller: transaction.sender,
                  sellerRS: transaction.senderRS,
                  //tags: xxx
                  delisted: false,
                  timestamp: transaction.timestamp,
                  numberOfPurchases: 0,
                  numberOfPublicFeedbacks: 0
                };

                /* set unconfirmed to true so blockPushed knows that there are unconfirmed entries */
                item.unconfirmed = true;
                this.translate(item);
                this.add(item);
                break;
              }
              case 1: { /* delisting */
                var item = this.keys[transaction.attachment.goods];
                if (item) {
                  model_changed = true;
                  item.delisted = true;

                  /* set unconfirmed to true so blockPushed knows that there are unconfirmed entries */
                  item.unconfirmed = true;
                }
                break;
              }

              /* TODO
                  - add a cases for subtypes :
                    1. PRICE_CHANGE(2) - update price
                    2. QUANTITY_CHANGE(3) - update quantity
                    3. PURCHASE(4) - update remaining quantity and numberOfPurchases
                    4. DELIVERY(5) - ?? not sure if we need this
                    5. FEEDBACK(6) - update numberOfPublicFeedbacks
                    6. REFUND(7) - ?? not sure if needed
              */
            }
          }
        }.bind(this));

        /* only if something changed do a sort and digest ($evalAsync) */
        if (model_changed) {
          this.sort();
          this.$scope.$evalAsync(angular.noop);
        }
      },

      /* @websocket */
      blockPushed: function () {
        var must_reload = false;

        /* there is a new block
           look at all entries to see if there are any unconfirmed entries, if there are
           do a simple reload to get back in sync.. */
        this.forEach(function (item) {
          if (item.unconfirmed) {
            delete item.unconfirmed;
            must_reload = true;
          }
        });
        if (must_reload) {

          /* watch out not do spawn too many reloads (during blockchain download for instance) */
          if (this.reload_timeout) {
            $timeout.cancel(this.reload_timeout);
          }
          this.reload_timeout = $timeout(this.reload.bind(this), 1000, false);
        }
      }
    });
    return AllGoodsProvider;
  });
})();
