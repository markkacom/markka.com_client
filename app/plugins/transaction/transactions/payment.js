// send money
(function () {
'use strict';
var module = angular.module('fim.base');
module.run(function (plugins, modals, $q, $rootScope, nxt, UserService) {
  
  var plugin = plugins.get('transaction');
  plugin.add({
    id: 'sendMoney',
    execute: function (args) {
      args = args||{};
      var api = nxt.get(UserService.currentAccount.id_rs);
      return plugin.create(angular.extend(args, {
        title: 'Send '+UserService.currentAccount.symbol,
        message: 'Sends '+UserService.currentAccount.symbol+' to recipient',
        requestType: 'sendMoney',
        createArguments: function (items) {
          var _args = {
            recipient: nxt.util.convertRSAddress(items.recipient),
            amountNQT: nxt.util.convertToNQT(items.amountNXT)
          }
          if (items.recipientPublicKey) {
            _args.recipientPublicKey = items.recipientPublicKey;
          }
          return _args;
        },
        fields: [
          plugin.fields('account').create('recipient', { value: args.recipient||'', label: 'Recipient', required: true, 
            api:api, accountColorId: UserService.currentAccount.accountColorId }
          ),
          plugin.fields('money').create('amountNXT', { value: args.amountNXT||'', label: 'Amount ('+UserService.currentAccount.symbol+')', required: true }),
          {
            label: 'Recipient public key',
            name: 'recipientPublicKey',
            type: 'text',
            value: args.recipientPublicKey||'',
            required: false,
            show: 'show.showPublicKey'          
          }
        ]
      }));
    }
  });

  plugin.add({
    label: 'Tip User',
    id: 'tipUser',
    exclude: true,
    execute: function (args) {
      args = args||{};
      return plugin.create(angular.extend(args, {
        title: 'Send Money',
        message: 'Sends money to recipient',
        editRecipient: false,
        recipient: args.recipient||'',
        requestType: 'sendMoney',
        canHaveRecipient: true,
        createArguments: function (items) {
          var _args = {
            recipient: nxt.util.convertRSAddress(items.recipient),
            amountNQT: nxt.util.convertToNQT(items.amountNXT)
          }
          if (items.recipientPublicKey) {
            _args.recipientPublicKey = items.recipientPublicKey;
          }
          return _args;
        },
        fields: [/*{
          label: 'Recipient',
          name: 'recipient',
          type: 'text',
          value: args.recipient||'',
          readonly: true
        }, */{
          label: 'Recipient public key',
          name: 'recipientPublicKey',
          type: 'text',
          value: args.recipientPublicKey||'',
          required: false,
          show: 'show.showPublicKey'
        }, {
          label: 'Amount',
          name: 'amountNXT',
          type: 'money',
          value: args.amountNXT||'',
          required: true
        }]
      }));
    }
  });


});
})();