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
// goods
(function () {
'use strict';
var module = angular.module('fim.base');
module.run(function (plugins, modals, $q, $rootScope, nxt, publicKeyService) {

  var plugin = plugins.get('transaction');

  // Add Goods

  plugin.add({
    label: 'Add Marketplace Item',
    id: 'dgsListing',
    exclude: true,
    execute: function (args) {
      args = args || {}
      var api = nxt.get($rootScope.currentAccount.id_rs);
      return plugin.create(angular.extend(args, {
        title: 'Add Marketplace Item',
        message: 'Create a Marketplace item with no length restricted tags. <br/>Item will automatically be removed after 6 months. <br/>Change this in "Assign Expiry" screen (section "Advanced") after item is added.',
        requestType: 'dgsListing',
        canHaveRecipient: false,
        initialize: function (items) {
          api.engine.socket().callAPIFunction({requestType: 'getDGSGood', goods: args.goods}).then(
              function (data) {
                $rootScope.$evalAsync(function () {
                  var error = data.error || data.errorDescription;
                  if (error) {
                    console.log(error)
                  } else {
                    plugin.getField(items, 'name').value = data.name
                    plugin.getField(items, 'tags').value = data.tags

                    var s = new BigInteger(data.priceNQT).toString()
                    var price = items.asset.value == '0'
                        ? nxt.util.convertToNXT(s)
                        : nxt.util.convertToAsset(s, items.asset.asset.decimals)
                    plugin.getField(items, 'priceNXT').value = price

                    var v = JSON.parse(data.description)
                    plugin.getField(items, 'description').value = v.description
                    plugin.getField(items, 'image').value = v.image
                    plugin.getField(items, 'callback').value = v.callback
                  }
                });
              }
          );
        },
        createArguments: function (items) {
          var tags = (items.tags||'').split(',');
          tags.forEach(function (tag, index) { tags[index] = String(tag).trim() });
          tags = tags.filter(function (tag) { return tag.length > 0 });
          var asset = plugin.getField(items, 'asset').asset
          if (!asset && items.asset.value != '0') throw Error("Wrong asset")
          var price = items.asset.value == '0'
              ? nxt.util.convertToNQT(items.priceNXT)
              : nxt.util.convertToQNT(items.priceNXT, asset.decimals)
          return {
            name: items.name,
            description: JSON.stringify({ description: items.description, image: items.image || '', callback: items.callback || '' }),
            tags: items.tags,
            quantity: String(items.quantity),
            priceNQT: price,
            asset: items.asset
          }
        },
        fields: [{
          label: 'Name',
          name: 'name',
          type: 'text',
          value: ''
        }, {
          label: 'Description',
          name: 'description',
          type: 'textarea',
          value: ''
        }, {
          label: 'ImageURL',
          name: 'image',
          type: 'text',
          value: ''
        }, {
          label: 'Notification server URL (if applicable)',
          name: 'callback',
          type: 'text',
          value: ''
        }, {
          label: 'Tags',
          name: 'tags',
          type: 'textarea',
          value: ''
        }, plugin.fields('asset').create('asset', {
          label: 'Asset for pricing',
          required: false,
          //account: $rootScope.currentAccount.id_rs,
          value: '0',
          api: api,
          onchange: function (items) {
            var currencyName = items.asset.value == '0'
                ? 'FIMK'
                : items.asset.asset ? items.asset.asset.name : '?'
            items.priceNXT.label = 'Price ' + currencyName
            items.priceNXT.precision = items.asset.asset ? items.asset.asset.decimals : '?'
          }
        }), {
          label: 'Price FIMK',
          name: 'priceNXT',
          type: 'money',
          value: '',
          precision: '8'
        }, {
          label: 'Quantity',
          name: 'quantity',
          type: 'text',
          value: '',
          validate: function (text) {
            this.errorMsg = null;
            if (!text) { this.errorMsg = null; }
            else if ( ! plugin.isInteger(text, 1)) { this.errorMsg = 'Must be a number greater than 0'; }
            return ! this.errorMsg;
          },
        }]
      }));
    }
  });

  // Delete Goods

  plugin.add({
    label: 'Delete Item',
    id: 'dgsDelisting',
    exclude: true,
    execute: function (args) {
      args = args||{};
      return plugin.create(angular.extend(args, {
        title: 'Delete Item',
        message: 'Delete a Marketplace item having id '+args.goods,
        requestType: 'dgsDelisting',
        createArguments: function (items) {
          return {
            goods: items.goods
          }
        }
      }));
    }
  });

  // Purchase Goods

  plugin.add({
    label: 'Purchase Item',
    id: 'dgsPurchase',
    exclude: true,
    execute: function (args) {
      //console.log(args);
      args = args||{};
      return plugin.create(angular.extend(args, {
        title: 'Purchase Item',
        message: 'Pay to complete Marketplace purchases',
        requestType: 'dgsPurchase',
        canHaveRecipient: false,
        abc: true,
        createArguments: function (items) {
          return {
            goods: items.goods,
            quantity: String(items.quantity),
            deliveryDeadlineTimestamp: items.deliveryDeadlineTimestamp,
            priceNQT: nxt.util.convertToQNT(items.priceNXT, args.assetDecimals),
            recipient: nxt.util.convertRSAddress(items.recipient)
          }
        },
        fields: [{
          label: 'Name',
          name: 'name',
          type: 'text',
          readonly: true,
          value: args.name||''
        },
        {
          label: 'Price',
          name: 'priceNXT',
          type: 'money',
          readonly: true,
          value: args.priceNXT||'',
          //precision: '8'
        },
        {
          label: 'Quantity',
          name: 'quantity',
          type: 'text',
          value: args.quantity||''
        },
        {
          label: 'Recipient',
          name: 'recipient',
          type: 'text',
          value: args.recipient||'',
          readonly: true
        }]
      }));
    }
  });

  // Rebate Goods

  plugin.add({
    label: 'Give Rebate',
    id: 'dgsRefund',
    exclude: true,
    execute: function (args) {
      args = args || {}
      return plugin.create(angular.extend(args, {
        title: 'Give Rebate',
        requestType: 'dgsRefund',
        canHaveRecipient: false,
        initialize: function (items) {
          var api = nxt.get($rootScope.currentAccount.id_rs);
          var call_arg = { requestType: 'getDGSPurchase', purchase: items.purchase };
          api.engine.socket().callAPIFunction(call_arg).then(
            function (data) {
              $rootScope.$evalAsync(function () {
                var error = data.error || data.errorDescription;
                if (error) {
                  console.log(error);
                  plugin.getField(items, 'name').value = '';
                  plugin.getField(items, 'priceNXT').value = '';
                  plugin.getField(items, 'quantity').value = '';
                  plugin.getField(items, 'totalPriceNXT').value = '';
                } else {
                  args.asset = data.asset
                  args.assetName = data.assetName
                  args.assetDecimals = data.assetDecimals
                  plugin.getField(items, 'topMessage').value = `Return some "${args.assetName}" to buyer`;

                  plugin.getField(items, 'name').value = data.name + ' ('+data.goods+')';
                  plugin.getField(items, 'priceNXT').value =
                      nxt.util.convertToAsset(data.priceNQT, args.assetDecimals) + ' ' + args.assetName
                  plugin.getField(items, 'quantity').value = data.quantity;
                  var sum = new BigInteger(data.priceNQT).multiply(new BigInteger("" + data.quantity)).toString()
                  plugin.getField(items, 'totalPriceNXT').value =
                      nxt.util.convertToAsset(sum, args.assetDecimals) + ' ' + args.assetName;
                }
              });
            }
          );
        },
        createArguments: function (items) {
          return {
            purchase: items.purchase,
            refundNQT: nxt.util.convertToQNT(items.refundNXT, args.assetDecimals)
          }
        },
        fields: [{
          name: 'topMessage',
          type: 'static',
          value: ''
        },
        {
          label: 'Purchase',
          name: 'purchase',
          type: 'text',
          value: args.purchase||'',
          readonly: true
        },
        {
          label: 'Name',
          name: 'name',
          type: 'text',
          readonly: true
        },
        {
          label: 'Price',
          name: 'priceNXT',
          type: 'text',
          readonly: true
        },
        {
          label: 'Quantity',
          name: 'quantity',
          type: 'text',
          readonly: true
        },
        {
          label: 'Total',
          name: 'totalPriceNXT',
          type: 'text',
          readonly: true
        },
        {
          label: 'Refund',
          name: 'refundNXT',
          type: 'money',
          value: args.refundNXT || ''
        }]
      }));
    }
  });

  // Confirm Delivery Goods

  plugin.add({
    label: 'Confirm Item',
    id: 'dgsDelivery',
    exclude: true,
    execute: function (args) {
      args = args||{};
      return plugin.create(angular.extend(args, {
        title: 'Confirm Item',
        message: 'Pay to complete Marketplace purchases',
        requestType: 'dgsDelivery',
        canHaveRecipient: false,
        initialize: function (items) {
          var api = nxt.get($rootScope.currentAccount.id_rs);
          var call_arg = { requestType: 'getDGSPurchase', purchase: items.purchase };
          api.engine.socket().callAPIFunction(call_arg).then(
            function (data) {
              args.asset = data.asset
              args.assetName = data.assetName
              args.assetDecimals = data.assetDecimals
              $rootScope.$evalAsync(function () {
                var error = data.error || data.errorDescription;
                if (error) {
                  console.log(error);
                  plugin.getField(items, 'buyerRS').value = '';
                  plugin.getField(items, 'name').value = '';
                }
                else {
                  plugin.getField(items, 'buyerRS').value = data.buyerRS;
                  plugin.getField(items, 'name').value = data.name + ' ('+data.goods+')';

                  /* Must get buyer public key */
                  publicKeyService.get(data.buyerRS).then(
                    function (publicKey) {
                      items.recipientPublicKey = publicKey;
                    }
                  );
                }
              });
            }
          );
        },
        createArguments: function (items) {
          var api = nxt.get($rootScope.currentAccount.id_rs);
          var options = {
            account: api.crypto.getAccountIdFromPublicKey(items.recipientPublicKey, false),
            publicKey: items.recipientPublicKey
          };
          var encrypted = api.crypto.encryptNote(items.data, options, $rootScope.currentAccount.secretPhrase);
          return {
            purchase: items.purchase,
            goodsData: encrypted.message,
            goodsNonce: encrypted.nonce,
            goodsIsText: 'true',
            discountNQT: nxt.util.convertToQNT(items.discountNXT, args.assetDecimals) || '0'
          };
        },
        fields: [{
          label: 'Buyer',
          name: 'buyerRS',
          type: 'text',
          readonly: true
        },
        {
          label: 'Purchase',
          name: 'purchase',
          type: 'text',
          readonly: true,
          value: args.purchase||''
        },
        {
          label: 'Good',
          name: 'name',
          type: 'text',
          readonly: true
        },
        {
          label: 'Discount',
          name: 'discountNXT',
          type: 'money',
          value: '0'
        },
        {
          label: 'Data',
          name: 'data',
          type: 'textarea'
        }]
      }));
    }
  });
});
})();
