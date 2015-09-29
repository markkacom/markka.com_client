// goods
(function () {
'use strict';
var module = angular.module('fim.base');
module.run(function (plugins, modals, $q, $rootScope, nxt) {
  
  var plugin = plugins.get('transaction');

  // Add Goods

  plugin.add({
    label: 'Devious Item',
    id: 'dgsListing',
    exclude: true,
    execute: function () {
      // args = args||{};
      return plugin.create(angular.extend({
        title: 'Devious Item',
        message: 'Create a Marketplace item with no length restricted tags',
        senderRS: $rootScope.currentAccount.id_rs,
        requestType: 'dgsListing',
        canHaveRecipient: false,
        createArguments: function (items) {
          return {
            name: items.name, 
            description: JSON.stringify({ description: items.description, image: items.image || '', callback: items.callback || '' }),
            tags: items.tags,
            quantity: String(items.quantity),
            priceNQT: nxt.util.convertToNQT(items.priceNXT)
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
          type: 'image',
          value: ''
        }, {
          label: 'Callback',
          name: 'callback',
          type: 'image',
          value: ''
        }, {
          label: 'Tags',
          name: 'tags',
          type: 'textarea',
          value: ''
        }, {
          label: 'Price FIMK',
          name: 'priceNXT',
          type: 'money',
          value: ''
        }, {
          label: 'Quantity',
          name: 'quantity',
          type: 'text',
          value: ''
        }]
      }));
    }
  });

  // Delete Goods

  plugin.add({
    label: 'Delete Item',
    id: 'dgsDelisting',
    exclude: true,
    execute: function (senderRS, args) {
      args = args||{};
      return plugin.create(angular.extend(args, {
        title: 'Delete Item',
        message: 'Delete a Marketplace item having id '+args.goods+' with no length restricted tags',
        // senderRS: senderRS,
        requestType: 'dgsDelisting',
        // canHaveRecipient: false,
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
    execute: function (senderRS, args) {
      console.log(args);
      args = args||{};
      return plugin.create(angular.extend(args, {
        title: 'Purchase Item',
        message: 'Pay to complete Marketplace purchases',
        requestType: 'dgsPurchase',
        // hideMessage: true,
        senderRS: senderRS,
        // editRecipient: (args.editRecipient===false) ? false : true,
        recipient: args.recipient||'',
        canHaveRecipient: false,
        abc: true,
        createArguments: function (items) {
          return {
            goods: items.goods, 
            // priceNQT: items.priceNQT,
            quantity: String(items.quantity),
            deliveryDeadlineTimestamp: items.deliveryDeadlineTimestamp,
            priceNQT: nxt.util.convertToNQT(items.priceNQT),
            recipient: items.recipient,
          }
        },
        fields: [{
          label: 'Name',
          name: 'name',
          type: 'text',
          value: args.name||''
        },
        {
          label: 'Price FIMK',
          name: 'price',
          type: 'text',
          readonly: true,
          value: args.priceNQT||''
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
          value: args.recipient||''
        }]
      }));
    }
  });

  // Rebate Goods

  plugin.add({
    label: 'Give Rebate',
    id: 'dgsRefund',
    exclude: true,
    execute: function (senderRS, args) {
      args = args||{};
      return plugin.create(angular.extend(args, {
        title: 'Give Rebate',
        message: 'Return some FIMK to buyer',
        senderRS: senderRS,
        requestType: 'dgsRefund',
        canHaveRecipient: false,
        createArguments: function (items) {
          return {
            purchase: items.purchase,
            refundNQT: nxt.util.convertToNQT(items.refundNQT)
          }
        },
        fields: [{
          label: 'Purchase',
          name: 'purchase',
          type: 'text',
          value: args.purchase||''
        },
        {
          label: 'Price FIMK',
          name: 'price',
          type: 'text',
          value: args.refundNQT||''
        }]
      }));
    }
  });

  // Confirm Delivery Goods

  plugin.add({
    label: 'Confirm Item',
    id: 'dgsDelivery',
    exclude: true,
    execute: function (senderRS, args) {
      args = args||{};
      return plugin.create(angular.extend(args, {
        title: 'Confirm Item',
        message: 'Pay to complete Marketplace purchases',
        senderRS: senderRS,
        requestType: 'dgsDelivery',
        canHaveRecipient: false,
        createArguments: function (items) {
          return {
            purchase: items.purchase,
            secretPhrase: items.secretPhrase,
            goodsToEncrypt: items.purchase
          }
        },
        fields: [{
          label: 'Purchase',
          name: 'purchase',
          type: 'text',
          value: args.purchase||''
        }]
      }));
    }
  });
});
})();