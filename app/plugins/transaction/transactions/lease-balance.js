// lease balance
(function () {
'use strict';
var module = angular.module('fim.base');
module.run(function (plugins, modals, $q, $rootScope, nxt) {
  
  var plugin = plugins.get('transaction');

  plugin.add({
    label: 'Lease Balance',
    id: 'leaseBalance',
    execute: function (senderRS, args) {
      args = args||{};
      return plugin.create(angular.extend(args, {
        title: 'Lease Balance',
        message: 'Lease your balance to another account',
        senderRS: senderRS,
        requestType: 'leaseBalance',
        canHaveRecipient: true,
        editSender: true,
        editRecipient: true,
        createArguments: function (items) {
          return {
            recipient: nxt.util.convertRSAddress(items.recipient),
            period: items.period
          }
        },
        fields: [{
          label: 'Period',
          name: 'period',
          type: 'text',
          value: args.period||'',
          validate: function (text) { 
            this.errorMsg = null;
            if (!text) { this.errorMsg = null; }
            else if ( ! plugin.isInteger(text, 1440, 32767)) { this.errorMsg = 'Must be a number between 1440 and 32767'; }
            return ! this.errorMsg;
          },
          required: true
        }]
      }));
    }
  });
});
})();