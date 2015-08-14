// goods
(function () {
'use strict';
var module = angular.module('fim.base');
module.run(function (plugins, modals, $q, $rootScope, nxt) {
  
  var plugin = plugins.get('transaction');

  // Add Goods

  plugin.add({
    label: 'Devious Good',
    id: 'dgsListing',
    exclude: true,
    execute: function (senderRS, args) {
      args = args||{};
      return plugin.create(angular.extend(args, {
        title: 'Devious Good',
        message: 'Create a DGS good with no length restricted tags',
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
          label: 'Price',
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
    label: 'Devious Good',
    id: 'dgsDelisting',
    exclude: true,
    execute: function (senderRS, args) {
      args = args||{};
      return plugin.create(angular.extend(args, {
        title: 'Devious Good',
        message: 'Delete a DGS good with no length restricted tags',
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
    label: 'Devious Good',
    id: 'dgsPurchase',
    exclude: true,
    execute: function (senderRS, args) {
      console.log(args);
      args = args||{};
      return plugin.create(angular.extend(args, {
        title: 'Devious Good',
        message: 'Purchase a DGS good',
        senderRS: senderRS,
        requestType: 'dgsPurchase',
        canHaveRecipient: false,
        createArguments: function (items) {
          return {
            goods: items.goods, 
            priceNQT: items.priceNQT,
            quantity: String(items.quantity),
            deliveryDeadlineTimestamp: items.deliveryDeadlineTimestamp
            // priceNQT: nxt.util.convertToNQT(items.priceNXT)
          }
        },
        fields: [{
          label: 'Quantity',
          name: 'quantity',
          type: 'text',
          value: args.quantity||''
        }, 
        {
          label: 'deliveryDeadlineTimestamp',
          name: 'deliveryDeadlineTimestamp',
          type: 'text',
          value: args.deliveryDeadlineTimestamp||''
        }]
      }));
    }
  });
});
})();