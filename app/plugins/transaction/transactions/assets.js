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

  plugin.add({
    label: 'Transfer Asset',
    id: 'transferAsset',
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
      var privateAsset = null;

      function reCalculateOrderTotal(items) {
        var decimals    = plugin.getField(items, 'decimals');
        var quantity    = plugin.getField(items, 'quantity');
        var price       = plugin.getField(items, 'priceNXT');
        var total       = plugin.getField(items, 'totalNXT');
        var fee         = plugin.getField(items, 'orderFeeNXT');

        var quantityQNT = new BigInteger(nxt.util.convertToQNT(quantity.value, parseInt(decimals.value)));
        var priceNQT    = new BigInteger(nxt.util.calculatePricePerWholeQNT(nxt.util.convertToNQT(price.value), parseInt(decimals.value)));
        var totalNQT    = '';
        if (priceNQT.toString() == "0" || quantityQNT.toString() == "0") {
          total.value   = '';
          fee.value     = '';
        }
        else {
          totalNQT      = quantityQNT.multiply(priceNQT);
          total.value   = nxt.util.convertToNXT(totalNQT);
        }
        if (privateAsset && totalNQT) {
          var feeNQT    = totalNQT.
                            multiply(new BigInteger(String(privateAsset.orderFeePercentage))).
                            divide(new BigInteger("100000000")).
                            toString();
          fee.value     = nxt.util.convertToNXT(feeNQT);
          items.orderFeeNQT = feeNQT;

          var effective = totalNQT.add(new BigInteger(feeNQT));
          total.value   = nxt.util.convertToNXT(effective.toString());
          total.setLabel(api.engine.symbol, privateAsset.orderFee, nxt.util.convertToNXT(feeNQT.toString()));
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
          var arg         = {
            priceNQT:     priceNQT,
            asset:        items.asset,
            quantityQNT:  quantityQNT
          };
          if (items.orderFeeNQT) {
            arg.orderFeeNQT = items.orderFeeNQT;
          }
          return arg;
        },
        initialize: function (items) {
          if (!items.autoSubmit) {
            plugin.getField(items, 'asset').onchange(items);
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
                  privateAsset = null;
                  if (angular.isDefined(data.orderFeePercentage)) {
                    privateAsset = {
                      orderFeePercentage: String(data.orderFeePercentage||0),
                      tradeFeePercentage: String(data.tradeFeePercentage||0)
                    };
                    privateAsset.orderFee = nxt.util.convertToQNTf(privateAsset.orderFeePercentage, 6);
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
          label: 'Total',
          setLabel: function (symbol, orderFee, feeNXT) {
            this.label = 'Total (order fee '+orderFee+'% = '+feeNXT+' '+api.engine.symbol+')';
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
    execute: function (senderRS, args) {
      var api = nxt.get(senderRS);
      args = args||{};
      var privateAsset = null;

      function reCalculateOrderTotal(items) {
        var decimals    = plugin.getField(items, 'decimals');
        var quantity    = plugin.getField(items, 'quantity');
        var price       = plugin.getField(items, 'priceNXT');
        var total       = plugin.getField(items, 'totalNXT');
        var fee         = plugin.getField(items, 'orderFeeQNT');

        var quantityQNT = new BigInteger(nxt.util.convertToQNT(quantity.value, parseInt(decimals.value)));
        var priceNQT    = new BigInteger(nxt.util.calculatePricePerWholeQNT(nxt.util.convertToNQT(price.value), parseInt(decimals.value)));
        var totalNQT    = '';
        if (priceNQT.toString() == "0" || quantityQNT.toString() == "0") {
          total.value   = '';
          fee.value     = '';
        }
        else {
          totalNQT      = quantityQNT.multiply(priceNQT);
          total.value   = nxt.util.convertToNXT(totalNQT); // what you'll receive
        }
        quantity.label  = 'Quantity';
        if (privateAsset && quantityQNT) {
          var feeQNT    = quantityQNT.
                            multiply(new BigInteger(String(privateAsset.orderFeePercentage))).
                            divide(new BigInteger("100000000")).
                            toString();
          fee.value     = feeQNT;
          items.orderFeeQNT = feeQNT;
          var effective = quantityQNT.add(new BigInteger(feeQNT)).toString();

          quantity.setLabel(privateAsset.orderFee, 
                            nxt.util.convertToQNTf(feeQNT, items.decimals),
                            nxt.util.convertToQNTf(effective, items.decimals));
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
        initialize: function (items) {
          if (items.autoSubmit) {
            plugin.getField(items, 'asset').onchange(items);
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
                  privateAsset = null;
                  if (angular.isDefined(data.orderFeePercentage)) {
                    privateAsset = {
                      orderFeePercentage: String(data.orderFeePercentage||0),
                      tradeFeePercentage: String(data.tradeFeePercentage||0)
                    };
                    privateAsset.orderFee = nxt.util.convertToQNTf(privateAsset.orderFeePercentage, 6);
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
          setLabel: function (orderFee, totalFee, totalQuantity) {
            this.label = 'Quantity (order fee '+orderFee+'% = '+totalFee+' total '+totalQuantity+')';
          },
          name: 'quantity',
          type: 'money',
          value: args.quantity||'',
          onchange: function (items) {
            reCalculateOrderTotal(items)
          },
          required: true
        }, {
          name: 'orderFeeQNT',
          value: args.orderFeeQNT||''
        }, {
          label: 'Total '+api.engine.symbol+' that you receive',
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

  plugin.add({
    label: 'Add private account',
    id: 'addPrivateAssetAccount',
    exclude: $rootScope.TRADE_UI_ONLY,
    execute: function (senderRS, args) {
      var api = nxt.get(senderRS);
      args = args||{};

      return plugin.create(angular.extend(args, {
        title: 'Add private account',
        message: 'Add private account',
        senderRS: senderRS,
        requestType: 'addPrivateAssetAccount',
        canHaveRecipient: true,
        editRecipient: angular.isDefined(args.editRecipient) ? args.editRecipient : true,
        editAsset: angular.isDefined(args.editAsset) ? args.editAsset : true,
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
                  items.assets = data.filter(function (a) { return a.type == 1 });
                }
              });
            }
          );
        },
        onAssetChange: function (items) {
          if (items.asset) {
            var api = nxt.get(senderRS);
            api.engine.socket().getAsset({asset:items.asset}).then(
              function (data) {
                $rootScope.$evalAsync(function () {
                  var error = data.error || data.errorDescription;
                  if (error) {
                    console.log(error);
                    plugin.getField(items, 'name').value = '';
                  }
                  else {
                    plugin.getField(items, 'name').value = data.name;
                  }
                });
              }
            );
          }
        },
        createArguments: function (items) {
          return {
            recipient: nxt.util.convertRSAddress(items.recipient),
            asset: items.asset
          }
        },
        fields: [{
          label: 'Name',
          name: 'name',
          readonly: true,
          value: args.name||'',
          type: 'text'
        }]
      }));
    }
  });

  plugin.add({
    label: 'Remove private account',
    id: 'removePrivateAssetAccount',
    exclude: $rootScope.TRADE_UI_ONLY,
    execute: function (senderRS, args) {
      var api = nxt.get(senderRS);
      args = args||{};

      return plugin.create(angular.extend(args, {
        title: 'Remove private account',
        message: 'Remove private account',
        senderRS: senderRS,
        requestType: 'removePrivateAssetAccount',
        canHaveRecipient: true,
        editRecipient: angular.isDefined(args.editRecipient) ? args.editRecipient : true,
        editAsset: angular.isDefined(args.editAsset) ? args.editAsset : true,
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
                  items.assets = data.filter(function (a) { return a.type == 1 });
                }
              });
            }
          );
        },
        onAssetChange: function (items) {
          if (items.asset) {
            var api = nxt.get(senderRS);
            api.engine.socket().getAsset({asset:items.asset}).then(
              function (data) {
                $rootScope.$evalAsync(function () {
                  var error = data.error || data.errorDescription;
                  if (error) {
                    console.log(error);
                    plugin.getField(items, 'name').value = '';
                  }
                  else {
                    plugin.getField(items, 'name').value = data.name;
                  }
                });
              }
            );
          }
        },
        createArguments: function (items) {
          return {
            recipient: nxt.util.convertRSAddress(items.recipient),
            asset: items.asset
          }
        },
        fields: [{
          label: 'Name',
          name: 'name',
          readonly: true,
          value: args.name||'',
          type: 'text'
        }]
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
        editAsset: angular.isDefined(args.editAsset) ? args.editAsset : true,
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
                  items.assets = data.filter(function (a) { return a.type == 1 });
                }
              });
            }
          );
        },
        onAssetChange: function (items) {
          if (items.asset) {
            var api = nxt.get(senderRS);
            api.engine.socket().getAsset({asset:items.asset}).then(
              function (data) {
                $rootScope.$evalAsync(function () {
                  var error = data.error || data.errorDescription;
                  if (error) {
                    console.log(error);
                    plugin.getField(items, 'name').value     = '';
                    plugin.getField(items, 'tradeFee').value = '';
                    plugin.getField(items, 'orderFee').value = '';
                  }
                  else {
                    plugin.getField(items, 'name').value     = data.name;
                    plugin.getField(items, 'tradeFee').value = nxt.util.convertToQNTf(String(data.tradeFeePercentage), 6)||'0';
                    plugin.getField(items, 'orderFee').value = nxt.util.convertToQNTf(String(data.orderFeePercentage), 6)||'0';
                  }
                });
              }
            );
          }
        },
        createArguments: function (items) {
          return {
            asset: items.asset,
            tradeFeePercentage: nxt.util.convertToQNT(items.tradeFee, 6)||'0',
            orderFeePercentage: nxt.util.convertToQNT(items.orderFee, 6)||'0',
          }
        },
        fields: [{
          label: 'Name',
          name: 'name',
          readonly: true,
          value: args.name||'',
          type: 'text'
        }, {
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