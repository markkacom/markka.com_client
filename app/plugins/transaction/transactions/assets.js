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
module.run(function (plugins, modals, $q, $rootScope, nxt) {
  
  var plugin = plugins.get('transaction');

  plugin.add({
    label: 'Issue Asset',
    id: 'issueAsset',
    execute: function (senderRS, args) {
      var api = nxt.get(senderRS);
      args = args||{};
      return plugin.create(angular.extend(args, {
        title: 'Issue Asset',
        message: 'Issue a new asset on the asset exchange (costs 1000 '+api.engine.symbol+')',
        senderRS: senderRS,
        feeNXT: '1000',
        requestType: 'issueAsset',
        canHaveRecipient: false,
        editSender: true,
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
        }]
      }));
    }
  });

  plugin.add({
    label: 'Transfer Asset',
    id: 'transferAsset',
    exclude: false,
    execute: function (senderRS, args) {
      var api = nxt.get(senderRS);
      args = args||{};

      return plugin.create(angular.extend(args, {
        title: 'Transfer Asset',
        message: 'Transfer asset',
        senderRS: senderRS,
        requestType: 'transferAsset',
        canHaveRecipient: true,
        editRecipient: true,
        editAsset: true,
        initialize: function (items) {
          var api = nxt.get(senderRS);
          api.engine.socket().getAccountAssets({account:senderRS, firstIndex:0, lastIndex: 40}).then(
            function (data) {
              console.log(data);
              $rootScope.$evalAsync(function () {
                var error = data.error || data.errorDescription;
                if (error) {
                  console.log(error);
                  items.assets = [];
                }
                else {
                  items.assets = data
                }
              });
            }
          );
        },
        onAssetChange: function (items) {
          console.log("onAssetChange", items);
          if (items.asset) {
            var api = nxt.get(senderRS);
            api.engine.socket().getAsset({asset:items.asset}).then(
              function (data) {
                $rootScope.$evalAsync(function () {
                  var error = data.error || data.errorDescription;
                  if (error) {
                    console.log(error);
                    plugin.getField(items, 'name').value = '';
                    plugin.getField(items, 'decimals').value = '';
                  }
                  else {
                    plugin.getField(items, 'name').value = data.name;
                    plugin.getField(items, 'decimals').value = data.decimals;
                  }
                });
              }
            );
          }
        },
        createArguments: function (items) {
          return {
            recipient: nxt.util.convertRSAddress(items.recipient),
            asset: items.asset,
            quantityQNT: nxt.util.convertToQNT(items.quantity, items.decimals)
          }
        },
        fields: [{
          label: 'Name',
          name: 'name',
          readonly: true,
          value: args.name||'',
          type: 'text'
        }, {
          label: 'Decimals',
          name: 'decimals',
          readonly: true,
          value: args.decimals||'',
          type: 'text'
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
    execute: function (senderRS, args) {
      var api = nxt.get(senderRS);
      args = args||{};

      function reCalculateOrderTotal(items) {
        var decimals    = plugin.getField(items, 'decimals');
        var quantity    = plugin.getField(items, 'quantity');
        var price       = plugin.getField(items, 'priceNXT');
        var total       = plugin.getField(items, 'totalNXT');

        var quantityQNT = new BigInteger(nxt.util.convertToQNT(quantity.value, parseInt(decimals.value)));
        var priceNQT    = new BigInteger(nxt.util.calculatePricePerWholeQNT(nxt.util.convertToNQT(price.value), parseInt(decimals.value)));
        if (priceNQT.toString() == "0" || quantityQNT.toString() == "0") {
          total.value   = '';
        }
        else {
          total.value   = nxt.util.convertToNXT(quantityQNT.multiply(priceNQT))
        }
      }
 
      return plugin.create(angular.extend(args, {
        title: 'Buy Asset',
        message: 'Place buy order for asset',
        senderRS: senderRS,
        requestType: 'placeBidOrder',
        canHaveRecipient: false,
        createArguments: function (items) {
          var quantityQNT = nxt.util.convertToQNT(items.quantity, parseInt(items.decimals));
          var priceNQT    = nxt.util.calculatePricePerWholeQNT(nxt.util.convertToNQT(items.priceNXT), parseInt(items.decimals));

          return {
            priceNQT:     priceNQT,
            asset:        items.asset,
            quantityQNT:  quantityQNT
          }
        },
        fields: [{
          label: 'Asset',
          name: 'asset',
          type: 'text',
          value: args.asset||'',
          onchange: function (items) {
            if (this.value) {
              var api = nxt.get(senderRS), self = this;
              api.engine.socket().getAsset({asset:this.value}).then(
                function (data) {
                  var error = data.error || data.errorDescription;
                  if (error) {
                    self.errorMsg = error;
                  }
                  $rootScope.$evalAsync(function () {
                    plugin.getField(items, 'name').value = data.name;
                    plugin.getField(items, 'decimals').value = data.decimals;
                    plugin.getField(items, 'quantity').precision = String(data.decimals);
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
          required: true
        }, {
          label: 'Name',
          name: 'name',
          readonly: true,
          value: args.name||'',
          type: 'text'
        }, {
          label: 'Decimals',
          name: 'decimals',
          readonly: true,
          value: args.decimals||'',
          type: 'text'
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
          label: 'Price',
          name: 'priceNXT',
          type: 'money',
          precision: String(0), // important !! must be a string or (f.precision || 8) will not work
          onchange: function (items) {
            reCalculateOrderTotal(items)
          },
          value: args.priceNXT||'',
          required: true
        }, {
          label: 'Total',
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
    execute: function (senderRS, args) {
      var api = nxt.get(senderRS);
      args = args||{};

      function reCalculateOrderTotal(items) {
        var decimals    = plugin.getField(items, 'decimals');
        var quantity    = plugin.getField(items, 'quantity');
        var price       = plugin.getField(items, 'priceNXT');
        var total       = plugin.getField(items, 'totalNXT');

        var quantityQNT = new BigInteger(nxt.util.convertToQNT(quantity.value, parseInt(decimals.value)));
        var priceNQT    = new BigInteger(nxt.util.calculatePricePerWholeQNT(nxt.util.convertToNQT(price.value), parseInt(decimals.value)));
        if (priceNQT.toString() == "0" || quantityQNT.toString() == "0") {
          total.value   = '';
        }
        else {
          total.value   = nxt.util.convertToNXT(quantityQNT.multiply(priceNQT))
        }
      }
 
      return plugin.create(angular.extend(args, {
        title: 'Sell Asset',
        message: 'Place sell order for asset',
        senderRS: senderRS,
        requestType: 'placeAskOrder',
        canHaveRecipient: false,
        createArguments: function (items) {
          var quantityQNT = nxt.util.convertToQNT(items.quantity, parseInt(items.decimals));
          var priceNQT    = nxt.util.calculatePricePerWholeQNT(nxt.util.convertToNQT(items.priceNXT), parseInt(items.decimals));

          return {
            priceNQT:     priceNQT,
            asset:        items.asset,
            quantityQNT:  quantityQNT
          }
        },
        fields: [{
          label: 'Asset',
          name: 'asset',
          type: 'text',
          value: args.asset||'',
          onchange: function (items) {
            if (this.value) {
              var api = nxt.get(senderRS), self = this;
              api.engine.socket().getAsset({asset:this.value}).then(
                function (data) {
                  var error = data.error || data.errorDescription;
                  if (error) {
                    self.errorMsg = error;
                  }
                  $rootScope.$evalAsync(function () {
                    plugin.getField(items, 'name').value = data.name;
                    plugin.getField(items, 'decimals').value = data.decimals;
                    plugin.getField(items, 'quantity').precision = String(data.decimals);
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
          required: true
        }, {
          label: 'Name',
          name: 'name',
          readonly: true,
          value: args.name||'',
          type: 'text'
        }, {
          label: 'Decimals',
          name: 'decimals',
          readonly: true,
          value: args.decimals||'',
          type: 'text'
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
          label: 'Price',
          name: 'priceNXT',
          type: 'money',
          precision: String(0), // important !! must be a string or (f.precision || 8) will not work
          onchange: function (items) {
            reCalculateOrderTotal(items)
          },
          value: args.priceNXT||'',
          required: true
        }, {
          label: 'Total',
          name: 'totalNXT',
          readonly: true,
          value: args.totalNXT||'',
          type: 'text'
        }]
      }));
    }
  });

  plugin.add({
    label: 'Cancel sell order',
    id: 'cancelAskOrder',
    exclude: true,
    execute: function (senderRS, args) {
      var api = nxt.get(senderRS);
      args = args||{};

      return plugin.create(angular.extend(args, {
        title: 'Cancel order',
        message: 'Cancel sell order',
        senderRS: senderRS,
        requestType: 'cancelAskOrder',
        canHaveRecipient: false,
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
              var api = nxt.get(senderRS), self = this;
              api.engine.socket().getAskOrder({order:this.value}).then(
                function (data) {
                  var error = data.error || data.errorDescription;
                  if (error) {
                    self.errorMsg = error;
                  }
                  $rootScope.$evalAsync(function () {
                    plugin.getField(items, 'asset').value    = data.asset;
                    plugin.getField(items, 'name').value     = data.name;
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
          label: 'Asset',
          name: 'asset',
          type: 'text',
          value: args.asset||'',
          readonly: true
        }, {
          label: 'Name',
          name: 'name',
          readonly: true,
          value: args.name||'',
          type: 'text'
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
    execute: function (senderRS, args) {
      var api = nxt.get(senderRS);
      args = args||{};

      return plugin.create(angular.extend(args, {
        title: 'Cancel order',
        message: 'Cancel buy order',
        senderRS: senderRS,
        requestType: 'cancelBidOrder',
        canHaveRecipient: false,
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
              var api = nxt.get(senderRS), self = this;
              api.engine.socket().getBidOrder({order:this.value}).then(
                function (data) {
                  var error = data.error || data.errorDescription;
                  if (error) {
                    self.errorMsg = error;
                  }
                  $rootScope.$evalAsync(function () {
                    plugin.getField(items, 'asset').value    = data.asset;
                    plugin.getField(items, 'name').value     = data.name;
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
          label: 'Asset',
          name: 'asset',
          type: 'text',
          value: args.asset||'',
          readonly: true
        }, {
          label: 'Name',
          name: 'name',
          readonly: true,
          value: args.name||'',
          type: 'text'
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

});
})();