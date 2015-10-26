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
module.run(function (plugins, modals, $q, $rootScope, nxt, OrderEntryProvider) {
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
            else if (plugin.getByteLen(text) > 100) { this.errorMsg = 'To much characters'; }
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
          label: 'Private Asset',
          name: 'private',
          type: 'radio',
          value: args['private']||false,
          show: 'privateEnabled'
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
    label: 'Transfer Asset',
    id: 'transferAsset',
    execute: function (args) {
      var api = nxt.get($rootScope.currentAccount.id_rs);
      args = args||{};
      return plugin.create(angular.extend(args, {
        title: 'Transfer Asset',
        message: 'Transfer asset',
        requestType: 'transferAsset',
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
            asset: items.asset,
            quantityQNT: nxt.util.convertToQNT(items.quantity, items.decimals)
          }
        },
        fields: [{
          label: 'Decimals',
          name: 'decimals',
          readonly: true,
          value: args.decimals||'',
          type: 'text',
          required: true, /* required but hidden ensures we always look up the decimals info */
          show: 'false'
        }, {
          label: 'Quantity',
          name: 'quantity',
          type: 'text',
          value: args.quantity||'',
          validate: function (text) {
            this.errorMsg = null;
            if (!text) { this.errorMsg = null; }
            else if ( ! plugin.isNumeric(text)) { this.errorMsg = 'Must be a number'; }
            return ! this.errorMsg;
          },
          required: true
        }]
      }));
    }
  });
  plugin.add({
    label: 'Buy Asset',
    id: 'buyAsset',
    exclude: true,
    execute: function (args) {
      var api = nxt.get($rootScope.currentAccount.id_rs);
      args = args||{};
      function reCalculateOrderTotal(items) {
        var decimals      = plugin.getField(items, 'decimals');
        var quantity      = plugin.getField(items, 'quantity');
        var price         = plugin.getField(items, 'priceNXT');
        var total         = plugin.getField(items, 'totalNXT');
        var fee           = plugin.getField(items, 'orderFeeNXT');
        total.value       = '';
        total.label       = 'Total';
        fee.value         = '';
        var provider      = new OrderEntryProvider(api, null, items.asset, parseInt(decimals.value), null, items.privateAsset);
        provider.quantity = quantity.value;
        provider.priceNXT = price.value;
        provider.reCalculate().then(
          function () {
            fee.value         = provider.orderFeeNXT;
            total.value       = provider.totalPriceNXT;
            if (items.privateAsset) {
              total.setLabel(items, provider);
            }
          }
        )
      }
      return plugin.create(angular.extend(args, {
        title: 'Buy Asset',
        message: 'Place buy order for asset',
        requestType: 'placeBidOrder',
        canHaveRecipient: false,
        editAsset: true,
        initialize: function (items) {
          this.onAssetChange(items);
        },
        onAssetChange: function (items) {
          genericOnAssetChange(this, items, api).then(
            function (data) {
              $rootScope.$evalAsync(function () {
                reCalculateOrderTotal(items);
              });
            }
          );
        },
        createArguments: function (items) {
          var quantityQNT = nxt.util.convertToQNT(items.quantity, parseInt(items.decimals));
          var priceNQT    = nxt.util.calculatePricePerWholeQNT(nxt.util.convertToNQT(items.priceNXT), parseInt(items.decimals));
          var arg         = {
            priceNQT:     priceNQT,
            asset:        items.asset,
            quantityQNT:  quantityQNT
          };
          if (items.orderFeeNXT) {
            arg.orderFeeNQT = nxt.util.convertToNQT(items.orderFeeNXT);
          }
          return arg;
        },
        fields: [{
          label: 'Decimals',
          name: 'decimals',
          readonly: true,
          value: args.decimals||'',
          type: 'text',
          required: true,
          show: 'false'
        }, {
          label: 'Price',
          name: 'priceNXT',
          type: 'money',
          precision: String(8), // important !! must be a string or (f.precision || 8) will not work
          onchange: function (items) {
            reCalculateOrderTotal(items)
          },
          value: args.priceNXT||'',
          required: true
        }, {
          label: 'Quantity',
          name: 'quantity',
          type: 'money',
          value: args.quantity||'',
          onchange: function (items) {
            reCalculateOrderTotal(items)
          },
          required: true
        }, {
          name: 'orderFeeNQT',
          value: args.orderFeeNQT||''
        }, {
          label: 'Fee (plus transaction cost '+api.engine.feeCost+' '+api.engine.symbol+')',
          name: 'orderFeeNXT',
          readonly: true,
          value: args.orderFeeNXT||'',
          type: 'text',
          show: 'false'
        }, {
          label: 'Total expected price',
          setLabel: function (items, provider) {
            if (items.privateAsset && items.privateAsset.orderFeePercentage != "0") {
              this.label = 'Total expected price '+provider.totalPriceNXT+' '+api.engine.symbol+
                           ' (fee '+items.privateAsset.orderFee+'% + '+api.engine.feeCost+' '+api.engine.symbol+')';
            }
            else {
              this.label = 'Total expected price (transaction fee '+api.engine.feeCost+' '+api.engine.symbol+')';
            }
          },
          name: 'totalNXT',
          readonly: true,
          value: args.totalNXT||'',
          type: 'text'
        }]
      }));
    }
  });
  plugin.add({
    label: 'Sell Asset',
    id: 'sellAsset',
    exclude: true,
    execute: function (args) {
      var api = nxt.get($rootScope.currentAccount.id_rs);
      args = args||{};
      var privateAsset = null;
      function reCalculateOrderTotal(items) {
        var decimals      = plugin.getField(items, 'decimals');
        var quantity      = plugin.getField(items, 'quantity');
        var price         = plugin.getField(items, 'priceNXT');
        var total         = plugin.getField(items, 'totalNXT');
        var totalQuantity = plugin.getField(items, 'totalQuantity');
        total.value         = '';
        totalQuantity.value = '';
        totalQuantity.label = 'Total '+items.assetName;
        var provider      = new OrderEntryProvider(api, null, items.asset, parseInt(decimals.value), null, items.privateAsset);
        provider.quantity = quantity.value;
        provider.priceNXT = price.value;
        provider.reCalculate().then(
          function () {
            totalQuantity.value = provider.totalQuantity;
            totalQuantity.setLabel(items, provider);
            total.value = provider.totalNXT;
            total.setLabel(items, provider);
            items.orderFeeQNT = provider.orderFeeQNT;
          }
        );
      }
      return plugin.create(angular.extend(args, {
        title: 'Sell Asset',
        message: 'Place sell order for asset',
        requestType: 'placeAskOrder',
        canHaveRecipient: false,
        editAsset: true,
        editAssetAccount: $rootScope.currentAccount.id_rs,
        initialize: function (items) {
          this.onAssetChange(items);
        },
        onAssetChange: function (items) {
          genericOnAssetChange(this, items, api).then(
            function (data) {
              $rootScope.$evalAsync(function () {
                reCalculateOrderTotal(items);
              });
            }
          );
        },
        createArguments: function (items) {
          var quantityQNT = nxt.util.convertToQNT(items.quantity, parseInt(items.decimals));
          var priceNQT    = nxt.util.calculatePricePerWholeQNT(nxt.util.convertToNQT(items.priceNXT), parseInt(items.decimals));
          var arg         = {
            priceNQT:     priceNQT,
            asset:        items.asset,
            quantityQNT:  quantityQNT
          };
          if (items.orderFeeQNT) {
            arg.orderFeeQNT = items.orderFeeQNT;
          }
          return arg;
        },
        fields: [{
          label: 'Decimals',
          name: 'decimals',
          readonly: true,
          value: args.decimals||'',
          type: 'text',
          required: true,
          show: 'false'
        }, {
          label: 'Price',
          name: 'priceNXT',
          type: 'money',
          precision: String(8), // important !! must be a string or (f.precision || 8) will not work
          onchange: function (items) {
            reCalculateOrderTotal(items)
          },
          value: args.priceNXT||'',
          required: true
        }, {
          label: 'Quantity',
          name: 'quantity',
          type: 'money',
          value: args.quantity||'',
          onchange: function (items) {
            reCalculateOrderTotal(items)
          },
          required: true
        }, {
          label: 'Total',
          setLabel: function (items, provider) {
            this.label = 'Total '+api.engine.symbol+' you receive'
          },
          name: 'totalNXT',
          readonly: true,
          value: args.totalNXT||'',
          type: 'text'
        }, {
          label: 'Total assets',
          setLabel: function (items, provider) {
            if (items.privateAsset && items.privateAsset.orderFeePercentage != "0") {
              this.label = 'Total '+items.assetName+' required (fee '+items.privateAsset.orderFee+'%)';
            }
          },
          name: 'totalQuantity',
          readonly: true,
          value: args.totalQuantity||'',
          type: 'text',
          show: 'items.privateAsset && items.privateAsset.orderFeePercentage != "0"'
        }, {
          name: 'orderFeeQNT',
          value: args.orderFeeQNT||''
        }]
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
    label: 'Cancel buy order',
    id: 'cancelBidOrder',
    exclude: true,
    execute: function (args) {
      var api = nxt.get($rootScope.currentAccount.id_rs);
      args = args||{};
      return plugin.create(angular.extend(args, {
        title: 'Cancel order',
        message: 'Cancel buy order',
        requestType: 'cancelBidOrder',
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
              api.engine.socket().getBidOrder({order:this.value}).then(
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
    execute: function (senderRS, args) {
      var api = nxt.get(senderRS);
      args = args||{};
      return plugin.create(angular.extend(args, {
        title: 'Private asset fee',
        message: 'Set private asset fee',
        senderRS: senderRS,
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