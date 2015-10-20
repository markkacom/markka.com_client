// set account info
(function () {
'use strict';
var module = angular.module('fim.base');
module.run(function (plugins, modals, $q, $rootScope, nxt) {
  
  var plugin = plugins.get('transaction');

  plugin.add({
    label: 'Set account identifier',
    id: 'setAccountIdentifier',
    execute: function (args) {
      args = args||{};
      return plugin.create(angular.extend(args, {
        title: 'Set account identifier',
        message: 'Set an account identifier',
        requestType: 'setAccountIdentifier',
        canHaveRecipient: true,
        createArguments: function (items) {
          return { 
            recipient: nxt.util.convertRSAddress(items.recipient),
            identifier: items.identifier, // String
            signatory: items.signatory ? nxt.util.convertRSAddress(items.signatory) : '0', // numeric address
            signature: items.signature||"" // hex string
          }
        },
        fields: [{
          label: 'Identifier',
          name: 'identifier',
          type: 'text',
          value: args.identifier||'',
          validate: function (text) { 
            this.errorMsg = null;
            if (!text) { this.errorMsg = null; }
            else {
              if (plugin.getByteLen(text) > 100) { this.errorMsg = 'To much characters'; }
              else if (text.indexOf('@')==-1) { this.errorMsg = 'Invalid email address'; }
            }
            return ! this.errorMsg;
          },
          required: false
        }, {
          label: 'Signatory',
          name: 'signatory',
          type: 'text',
          value: args.signatory||'',
          validate: function (text) { 
            this.errorMsg = null;
            if (!text) { this.errorMsg = null; }
            else {
              if (!plugins.get('transaction').validators.address(text)) { this.errorMsg = 'Invalid address'; }
            }
            return ! this.errorMsg;
          },
          required: false
        }, {
          label: 'Signature',
          name: 'signature',
          type: 'textarea',
          value: args.signature||'',
          validate: function (text) { 
            this.errorMsg = null;
            if (!text) { this.errorMsg = null; }
            else {
              if (plugin.getByteLen(text) > 1000) { this.errorMsg = 'To much characters'; }
            }
            return ! this.errorMsg;
          },
          required: false
        }]
      }));
    }
  });  

});
})();