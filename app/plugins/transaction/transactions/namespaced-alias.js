(function () {
'use strict';
var module = angular.module('fim.base');
module.run(function (plugins, modals, $q, $rootScope, nxt) {
  
  var plugin = plugins.get('transaction');

  plugin.add({
    label: 'Set Namespaced Alias',
    id: 'setNamespacedAlias',
    exclude: $rootScope.TRADE_UI_ONLY,
    execute: function (senderRS, args) {
      args = args||{};
      return plugin.create(angular.extend(args, {
        title: 'Set Namespaced Alias',
        message: 'Set or update a namespaced alias',
        senderRS: senderRS,
        requestType: 'setNamespacedAlias',
        canHaveRecipient: false,
        createArguments: function (items) {
          return {
            aliasName: items.aliasName,
            aliasURI: items.aliasURI
          }
        },
        fields: [{
          label: 'Alias Name',
          name: 'aliasName',
          type: 'text',
          value: args.aliasName||'',
          validate: function (text) { 
            this.errorMsg = null;
            if (!text) { this.errorMsg = null; }
            else if ( ! plugin.EXTENDED_ALPHABET.test(text)) { this.errorMsg = 'Invalid character'; }
            else if (plugin.getByteLen(text) > 100) { this.errorMsg = 'To much characters'; }
            return ! this.errorMsg;
          },
          required: true
        }, {
          label: 'Alias Value',
          name: 'aliasURI',
          type: 'textarea',
          value: args.aliasURI||'',
          validate: function (text) { 
            this.errorMsg = null;
            if (!text) { this.errorMsg = null; }
            else if (plugin.getByteLen(text) > 1000) { this.errorMsg = 'To much characters'; }
            return ! this.errorMsg;
          },
          required: true
        }]
      }));
    }
  });
});
})();