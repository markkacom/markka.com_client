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
// pay dividend
// issue asset
// place sell order
// place buy order
// cancel sell order
// cancel buy order
// transfer asset
(function () {
'use strict';
var module = angular.module('fim.base');
module.run(function (plugins, modals, $q, $rootScope, nxt, OrderEntryProvider, UserService) {
  var plugin = plugins.get('transaction');

  plugin.add({
    label: 'Issue Asset',
    id: 'issueAsset',
    execute: function (args) {
      var api = nxt.get($rootScope.currentAccount.id_rs);
      args = args||{};
      return plugin.create(angular.extend(args, {
        title: 'Issue Asset',
        message: 'Issue a new asset on the asset exchange (costs 1000 '+api.engine.symbol+')',
        feeNXT: '1000',
        requestType: 'issueAsset',
        canHaveRecipient: false,
        createArguments: function (items) {
          var args = {
            name:         items.name,
            description:  items.description,
            decimals:     parseInt(items.decimals)
          };
          args.quantityQNT = String(items.quantity);
          if (args.decimals > 0) {
            for (var i = 0; i < args.decimals; i++) {
              args.quantityQNT += "0";
            }
          }
          if ($rootScope.privateEnabled) {
            args.type = items['private'] ? 1 : 0;
          }
          return args;
        },
        fields: [{
          label: 'Asset Name',
          name: 'name',
          type: 'text',
          value: args.name||'',
          validate: function (text) {
            this.errorMsg = null;
            if (!text) { this.errorMsg = null; }
            else if ( ! plugin.ALPHABET.test(text)) { this.errorMsg = 'Invalid character'; }
            else if (plugin.getByteLen(text) < 3 || plugin.getByteLen(text) > 10) { this.errorMsg = 'Invalid length (3,10)'; }
            return ! this.errorMsg;
          },
          required: true
        }, {
          label: 'Quantity',
          name: 'quantity',
          type: 'text',
          value: args.quantity||'',
          validate: function (text) {
            this.errorMsg = null;
            if (!text) { this.errorMsg = null; }
            else if ( ! plugin.isInteger(text)) { this.errorMsg = 'Must be a number'; }
            return ! this.errorMsg;
          },
          required: true
        }, {
          label: 'Decimals',
          name: 'decimals',
          type: 'text',
          value: args.decimals||'',
          validate: function (text) {
            this.errorMsg = null;
            if (!text) { this.errorMsg = null; }
            else if ( ! plugin.isInteger(text, 0, 8)) { this.errorMsg = 'Must be a number between 0 and 8'; }
            return ! this.errorMsg;
          },
          required: true
        }, {
          label: 'Asset Description',
          name: 'description',
          type: 'textarea',
          value: args.description||'',
          validate: function (text) {
            this.errorMsg = null;
            if (!text) { this.errorMsg = null; }
            else {
              if (plugin.getByteLen(text) > 1000) { this.errorMsg = 'To much characters'; }
            }
            return ! this.errorMsg;
          },
          required: true
        }, {
          label: 'Private Asset (costs 10,000 FIM)',
          name: 'private',
          type: 'radio',
          value: args['private']||false,
          show: 'privateEnabled',
          onchange: function (items) {
            items.feeNXT = this.value ? 10000 : 1000;
          }
        }]
      }));
    }
  });
  /* handles the variables expected by the view in transaction-modal.html */
  function genericOnAssetChange(self, items, api) {
    var deferred = $q.defer();
    $rootScope.$evalAsync(function () {
      var decimals = plugin.getField(items, 'decimals');
      if (decimals) {
        decimals.value = '';
      }
      items.assetName       = '';
      items.assetIssuerName = '';
      items.assetIssuerRS   = '';
      items.privateAsset    = null;
      /* only lookup if asset id consists of at least 9 numbers only */
      if (/\d{9}/.test(items.asset)) {
        api.engine.socket().getAsset({asset:items.asset,includeDetails:"true"}).then(
          function (data) {
            $rootScope.$evalAsync(function () {
              var error = data.error || data.errorDescription;
              if (error) {
                console.log(error);
                self.errorMsg = error;
                deferred.reject();
              }
              else {
                var decimals = plugin.getField(items, 'decimals');
                if (decimals) {
                  decimals.value = data.decimals;
                }
                var quantity = plugin.getField(items, 'quantity');
                if (quantity) {
                  quantity.precision = String(data.decimals);
                }
                items.assetName       = data.name;
                items.assetIssuerName = data.issuerName||data.issuerRS;
                items.assetIssuerRS   = data.issuerRS;
                if ($rootScope.privateEnabled) {
                  items.privateAsset = null;
                  if (angular.isDefined(data.orderFeePercentage)) {
                    items.privateAsset = {
                      orderFeePercentage: String(data.orderFeePercentage||0),
                      tradeFeePercentage: String(data.tradeFeePercentage||0)
                    };
                    items.privateAsset.orderFee = nxt.util.convertToQNTf(items.privateAsset.orderFeePercentage, 6);
                  }
                }
                deferred.resolve(data);
              }
            });
          }
        );
      }
    });
    return deferred.promise;
  }
  plugin.add({
    id: 'transferAsset',
    execute: function (args) {
      var api = nxt.get($rootScope.currentAccount.id_rs);
      args = args||{};
      return plugin.create(angular.extend(args, {
        title: 'Transfer Asset',
        message: null,
        requestType: 'transferAsset',
        createArguments: function (items, fields) {
          var args = {
            recipient: plugin.isNumeric(items.recipient) ? items.recipient : nxt.util.convertRSAddress(items.recipient)
          }
          if (items.recipientPublicKey) {
            args.recipientPublicKey = items.recipientPublicKey;
          }
          if (fields.asset.value === "0") {
            args.amountNQT = nxt.util.convertToNQT(items.quantity)
            this.requestType = "sendMoney";
          } else {
            args.asset = items.asset
            args.quantityQNT = nxt.util.convertToQNT(items.quantity, fields.asset.asset.decimals)
          }
          return args
        },
        fields: [
          plugin.fields('asset').create('asset', { value: args.asset||'', label: 'Asset (0 means FIMK)', required: true, account: $rootScope.currentAccount.id_rs, api: api}),
          plugin.fields('account').create('recipient', { value: args.recipient||'', label: 'Recipient', required: true,
            api:api, accountColorId: UserService.currentAccount.accountColorId }),
          plugin.fields('text').create('quantity', { value: args.quantity||'', label: 'Quantity', required: true,
            validate: function (text) {
              if (text && !plugin.isNumeric(text)) throw 'Must be a number';
            }
          })
        ]
      }));
    }
  });

  plugin.add({
    id: 'buyAsset',
    exclude: true,
    execute: function (args) {
      var api = nxt.get($rootScope.currentAccount.id_rs);
      args = args||{};
      function reCalculateOrderTotal(fields) {
        fields.asset.$evalAsync(function () {
          fields.totalNXT.value     = '';
          fields.totalNXT.label     = 'Total';
          fields.orderFeeNXT.value  = '';
          if (fields.asset.asset) {
            var asset    = fields.asset.asset;

            var assetIsExpired = asset.expiry ? nxt.util.convertToEpochTimestamp(Date.now()) > asset.expiry : false;
            if (assetIsExpired) {
              fields.asset.errorMsg = "Disabled. Asset is expired";
              fields.quantity.value = null;  // to disable button "Pay now"
              return
            }

            var decimals = asset.decimals;
            var orderFee = nxt.util.convertToQNTf(asset.orderFeePercentage, 6);
            var provider = new OrderEntryProvider(api, null, asset.asset, decimals, null, {
              orderFeePercentage: String(asset.orderFeePercentage||0),
              tradeFeePercentage: String(asset.tradeFeePercentage||0),
              orderFee: orderFee
            });
            provider.quantity = fields.quantity.value;
            provider.priceNXT = fields.priceNXT.value;
            provider.reCalculate().then(
              function () {
                fields.asset.$evalAsync(function () {
                  fields.orderFeeNXT.value  = provider.orderFeeNXT;
                  fields.orderFeeNQT.value  = provider.orderFeeNQT;
                  fields.totalNXT.value     = provider.totalPriceNXT;
                  if (asset.type == 1) {
                    if (asset.orderFeePercentage != 0) {
                      fields.totalNXT.label = 'Total expected price '+provider.totalPriceNXT+' '+(asset.accountColorName||api.engine.symbol)+
                                              ' (fee '+orderFee+'% + '+api.engine.feeCost+' '+(asset.accountColorName||api.engine.symbol)+')';
                    }
                    else {
                      fields.totalNXT.label = 'Total expected price (transaction fee '+api.engine.feeCost+' '+(asset.accountColorName||api.engine.symbol)+')';
                    }
                  }
                });
              }
            );
          }
        });
      }
      return plugin.create(angular.extend(args, {
        title: 'Buy Asset',
        message: args.description || 'Place buy order for asset',
        requestType: 'placeBidOrder',
        createArguments: function (items, fields) {
          var decimals    = fields.asset.asset ? fields.asset.asset.decimals : fields.decimals.value;
          var quantityQNT = nxt.util.convertToQNT(items.quantity||'0', decimals);
          var priceNQT    = nxt.util.calculatePricePerWholeQNT(nxt.util.convertToNQT(items.priceNXT||'0'), decimals);
          var arg         = {
            priceNQT:     priceNQT,
            asset:        items.asset,
            quantityQNT:  quantityQNT
          };
          if (fields.orderFeeNQT.value) {
            arg.orderFeeNQT = fields.orderFeeNQT.value;
          }
          return arg;
        },
        fields: [
          plugin.fields('asset').create('asset', { value: args.asset||'', label: 'Asset', required: true, api: api,
            onchange: function (fields) {
              fields.quantity.precision = 0;
              if (this.asset) {
                fields.quantity.precision = this.asset.decimals;
              }
              reCalculateOrderTotal(fields);
            },
            validate: function (text) {
              //if (!text) { this.errorMsg = null; }
              return !this.errorMsg;
            },
          }),
          plugin.fields('money').create('priceNXT', { value: args.priceNXT||'', label: 'Price', required: true, precision: 8,
            onchange: function (fields) {
              reCalculateOrderTotal(fields);
            }
          }),
          plugin.fields('money').create('quantity', { value: args.quantity||'', label: 'Quantity', required: true, precision:(args.decimals||0),
            onchange: function (fields) {
              reCalculateOrderTotal(fields);
            }
          }),
          plugin.fields('text').create('orderFeeNXT', { value: args.orderFeeNXT||'', readonly: true,
            label: 'Fee (plus transaction cost '+api.engine.feeCost+' '+api.engine.symbol+')'
          }),
          plugin.fields('text').create('totalNXT', { value: args.totalNXT||'', readonly: true,
            label: 'Total expected price'
          }),
          plugin.fields('hidden').create('decimals', {value:args.decimals||''}),
          plugin.fields('hidden').create('orderFeeNQT', {value:args.orderFeeNQT||''})
        ]
      }));
    }
  });

  plugin.add({
    id: 'sellAsset',
    execute: function (args) {
      var api = nxt.get($rootScope.currentAccount.id_rs);
      args = args||{};
      var privateAsset = null;
      function reCalculateOrderTotal(fields) {
        fields.asset.$evalAsync(function () {
          fields.totalNXT.value       = '';
          fields.totalQuantity.value  = '';
          fields.totalQuantity.label  = 'Total required';
          fields.orderFeeQNT.value    = '';

          if (fields.asset.asset) {
            var asset    = fields.asset.asset;

            var assetIsExpired = asset.expiry ? nxt.util.convertToEpochTimestamp(Date.now()) > asset.expiry : false;
            if (assetIsExpired) {
              fields.asset.errorMsg = "Disabled. Asset is expired";
              fields.quantity.value = null;  // to disable button "Pay now"
              return
            }

            var decimals = asset.decimals;
            var orderFee = nxt.util.convertToQNTf(asset.orderFeePercentage, 6);
            var provider = new OrderEntryProvider(api, null, asset.asset, decimals, null, {
              orderFeePercentage: String(asset.orderFeePercentage||0),
              tradeFeePercentage: String(asset.tradeFeePercentage||0),
              orderFee: orderFee
            });
            provider.quantity = fields.quantity.value;
            provider.priceNXT = fields.priceNXT.value;
            provider.reCalculate().then(
              function () {
                fields.asset.$evalAsync(function () {
                  fields.totalQuantity.value = provider.totalQuantity;
                  fields.totalNXT.value      = provider.totalNXT;
                  fields.totalNXT.label      = 'Total '+(asset.accountColorName||api.engine.symbol)+' you receive';

                  if (asset.type == 1 && asset.orderFeePercentage != 0) {
                    fields.totalQuantity.label = 'Total '+asset.assetName+' required (fee '+orderFee+'%)';
                    fields.orderFeeQNT.value   = provider.orderFeeQNT;
                  }
                  else {
                    fields.totalQuantity.label = 'Total '+asset.name+' required';
                  }
                });
              }
            );
          }
        });
      }
      return plugin.create(angular.extend(args, {
        title: 'Sell Asset',
        message: 'Place sell order for asset',
        requestType: 'placeAskOrder',
        createArguments: function (items, fields) {
          var decimals    = fields.asset.asset ? fields.asset.asset.decimals : fields.decimals.value;
          var quantityQNT = nxt.util.convertToQNT(items.quantity, decimals);
          var priceNQT    = nxt.util.calculatePricePerWholeQNT(nxt.util.convertToNQT(items.priceNXT), decimals);
          var arg         = {
            priceNQT:     priceNQT,
            asset:        items.asset,
            quantityQNT:  quantityQNT
          };
          if (fields.orderFeeQNT.value) {
            arg.orderFeeQNT = fields.orderFeeQNT.value;
          }
          return arg;
        },
        fields: [
          plugin.fields('asset').create('asset', { value: args.asset||'', label: 'Asset', required: true, api: api,
            onchange: function (fields) {
              fields.quantity.precision = 0;
              if (this.asset) {
                fields.quantity.precision = this.asset.decimals;
              }
              reCalculateOrderTotal(fields);
            }
          }),
          plugin.fields('money').create('priceNXT', { value: args.priceNXT||'', label: 'Price', required: true, precision: 8,
            onchange: function (fields) {
              reCalculateOrderTotal(fields);
            }
          }),
          plugin.fields('money').create('quantity', { value: args.quantity||'', label: 'Quantity', required: true, precision:(args.decimals||0),
            onchange: function (fields) {
              reCalculateOrderTotal(fields);
            }
          }),
          plugin.fields('text').create('totalQuantity', { value: args.totalQuantity||'', readonly: true,
            label: 'Total required'
          }),
          plugin.fields('text').create('totalNXT', { value: args.totalNXT||'', readonly: true,
            label: 'Total you receive'
          }),
          plugin.fields('hidden').create('orderFeeQNT', {value:args.orderFeeQNT||''}),
          plugin.fields('hidden').create('decimals', {value:args.decimals||''})
        ]
      }));
    }
  });

  plugin.add({
    label: 'Cancel sell order',
    id: 'cancelAskOrder',
    exclude: true,
    execute: function (args) {
      var api = nxt.get($rootScope.currentAccount.id_rs);
      args = args||{};
      return plugin.create(angular.extend(args, {
        title: 'Cancel order',
        message: 'Cancel sell order',
        requestType: 'cancelAskOrder',
        canHaveRecipient: false,
        editAsset: true,
        editAssetReadonly: true,
        initialize: function (items) {
          plugin.getField(items, 'order').onchange(items);
        },
        createArguments: function (items) {
          return { order: items.order };
        },
        fields: [{
          label: 'Order',
          name: 'order',
          type: 'text',
          precision: String(0),
          onchange: function (items) {
            if (this.value) {
              var self = this;
              api.engine.socket().getAskOrder({order:this.value}).then(
                function (data) {
                  var error = data.error || data.errorDescription;
                  if (error) {
                    self.errorMsg = error;
                  }
                  $rootScope.$evalAsync(function () {
                    items.asset           = data.asset;
                    items.assetName       = data.name;
                    items.assetIssuerName = data.issuerName||data.issuerRS;
                    items.assetIssuerRS   = data.issuerRS;
                    plugin.getField(items, 'price').value    = data.priceNQT ? nxt.util.calculateOrderPricePerWholeQNT(data.priceNQT, data.decimals) : '';
                    plugin.getField(items, 'quantity').value = data.quantityQNT ? nxt.util.convertToQNTf(data.quantityQNT, data.decimals) : '';
                  });
                }
              );
            }
          },
          validate: function (text) {
            this.errorMsg = null;
            if (!text) { this.errorMsg = null; }
            return ! this.errorMsg;
          },
          value: args.order||'',
          required: true
        }, {
          label: 'Price',
          name: 'price',
          readonly: true,
          value: args.price||'',
          type: 'text'
        }, {
          label: 'Quantity',
          name: 'quantity',
          readonly: true,
          value: args.quantity||'',
          type: 'text'
        }]
      }));
    }
  });

  plugin.add({
    id: 'cancelBidOrder',
    exclude: true,
    execute: function (args) {
      var api = nxt.get($rootScope.currentAccount.id_rs);
      args = args||{};
      return plugin.create(angular.extend(args, {
        title: 'Cancel buy order',
        requestType: 'cancelBidOrder',
        createArguments: function (items) {
          return { order: items.order };
        },
        fields: [
          plugin.fields('asset').create('asset', { value: args.asset||'', label: 'Asset', readonly: true, api: api,
            onchange: function (fields) {
              fields.quantity.label = 'Quantity';
              if (this.asset) {
                fields.quantity.label += ' ('+this.asset.name+')';
              }
            }
          }),
          plugin.fields('text').create('order', { value: args.order||'', required: true, label: 'Order',
            initialize: function (fields) {
              this.changed(true);
            },
            onchange: function (fields) {
              if (this.value) {
                var self = this;
                api.engine.socket().getBidOrder({order:this.value}).then(
                  function (data) {
                    self.$evalAsync(function () {
                      var error = data.error || data.errorDescription;
                      if (error) {
                        self.errorMsg = error;
                      }
                      fields.asset.value    = data.asset;
                      fields.asset.changed();
                      fields.price.value    = data.priceNQT ? nxt.util.calculateOrderPricePerWholeQNT(data.priceNQT, data.decimals) : '';
                      fields.quantity.value = data.quantityQNT ? nxt.util.convertToQNTf(data.quantityQNT, data.decimals) : '';
                    });
                  }
                );
              }
            }
          }),
          plugin.fields('text').create('price', { value: args.price||'', label: 'Price ('+$rootScope.currentAccount.symbol+')', readonly: true }),
          plugin.fields('text').create('quantity', { value: args.quantity||'', label: 'Quantity', readonly: true })
        ]
      }));
    }
  });

  plugin.add({
    label: 'Add private account',
    id: 'addPrivateAssetAccount',
    exclude: $rootScope.TRADE_UI_ONLY,
    execute: function (args) {
      var api = nxt.get($rootScope.currentAccount.id_rs);
      args = args||{};
      return plugin.create(angular.extend(args, {
        title: 'Add private account',
        message: 'Add private account',
        requestType: 'addPrivateAssetAccount',
        canHaveRecipient: true,
        editRecipient: true,
        editAsset: true,
        editAssetAccount: $rootScope.currentAccount.id_rs,
        initialize: function (items) {
          this.onAssetChange(items);
        },
        onAssetChange: function (items) {
          genericOnAssetChange(this, items, api);
        },
        createArguments: function (items) {
          return {
            recipient: nxt.util.convertRSAddress(items.recipient),
            asset: items.asset
          }
        },
        fields: []
      }));
    }
  });
  plugin.add({
    label: 'Remove private account',
    id: 'removePrivateAssetAccount',
    exclude: $rootScope.TRADE_UI_ONLY,
    execute: function (args) {
      var api = nxt.get($rootScope.currentAccount.id_rs);
      args = args||{};
      return plugin.create(angular.extend(args, {
        title: 'Remove private account',
        message: 'Remove private account',
        requestType: 'removePrivateAssetAccount',
        canHaveRecipient: true,
        editRecipient: true,
        editAsset: true,
        editAssetAccount: $rootScope.currentAccount.id_rs,
        initialize: function (items) {
          this.onAssetChange(items);
        },
        onAssetChange: function (items) {
          genericOnAssetChange(this, items, api);
        },
        createArguments: function (items) {
          return {
            recipient: nxt.util.convertRSAddress(items.recipient),
            asset: items.asset
          }
        },
        fields: []
      }));
    }
  });
  plugin.add({
    label: 'Asset fee',
    id: 'setPrivateAssetFee',
    exclude: $rootScope.TRADE_UI_ONLY,
    execute: function (args) {
      var api = nxt.get(UserService.currentAccount.id_rs);
      args = args||{};
      return plugin.create(angular.extend(args, {
        title: 'Private asset fee',
        message: 'Set private asset fee',
        requestType: 'setPrivateAssetFee',
        canHaveRecipient: false,
        editAsset: true,
        editAssetAccount: $rootScope.currentAccount.id_rs,
        initialize: function (items) {
          this.onAssetChange(items);
        },
        onAssetChange: function (items) {
          genericOnAssetChange(this, items, api).then(
            function (data) {
              plugin.getField(items, 'tradeFee').value = nxt.util.convertToQNTf(String(data.tradeFeePercentage), 6)||'0';
              plugin.getField(items, 'orderFee').value = nxt.util.convertToQNTf(String(data.orderFeePercentage), 6)||'0';
            }
          );
        },
        createArguments: function (items) {
          return {
            asset: items.asset,
            tradeFeePercentage: nxt.util.convertToQNT(items.tradeFee, 6)||'0',
            orderFeePercentage: nxt.util.convertToQNT(items.orderFee, 6)||'0',
          }
        },
        fields: [{
          label: 'Order fee %',
          name: 'orderFee',
          value: args.orderFee||'0',
          type: 'text'
        }, {
          label: 'Trade fee %',
          name: 'tradeFee',
          value: args.tradeFee||'0',
          type: 'text'
        }]
      }));
    }
  });
});
})();
