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
    execute: function (senderRS, args) {
      args = args||{};
      return plugin.create(angular.extend(args, {
        title: 'Devious Item',
        message: 'Create a Marketplace item with no length restricted tags',
        senderRS: senderRS,
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
          value: args.name||''
        }, {
          label: 'Description',
          name: 'description',
          type: 'textarea',
          value: args.description||''
        }, {
          label: 'ImageURL',
          name: 'image',
          type: 'image',
          value: args.image||''
        }, {
          label: 'Callback',
          name: 'callback',
          type: 'image',
          value: args.callback||''
        }, {
          label: 'Tags',
          name: 'tags',
          type: 'textarea',
          value: args.tags||''
        }, {
          label: 'Price FIMK',
          name: 'priceNXT',
          type: 'money',
          value: args.priceNXT||''
        }, {
          label: 'Quantity',
          name: 'quantity',
          type: 'text',
          value: args.quantity||''
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
        createArguments: function (items) {
          return {
            goods: items.goods, 
            // priceNQT: items.priceNQT,
            quantity: String(items.quantity),
            deliveryDeadlineTimestamp: items.deliveryDeadlineTimestamp,
            priceNQT: nxt.util.convertToNQT(items.priceNQT),
            recipient: items.recipient
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
    label: 'Rebate Item',
    id: 'dgsRefund',
    exclude: true,
    execute: function (senderRS, args) {
      args = args||{};
      return plugin.create(angular.extend(args, {
        title: 'Rebate Item',
        message: 'Pay to complete Marketplace purchases',
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