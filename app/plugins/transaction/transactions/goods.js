// goods
(function () {
'use strict';
var module = angular.module('fim.base');
module.run(function (plugins, modals, $q, $rootScope, nxt) {
  
  var plugin = plugins.get('transaction');

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
            description: items.description,
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
});
})();