(function () {
'use strict';
var module = angular.module('fim.base');
module.run(function (plugins, modals, $q, $rootScope, nxt) {
  
  var plugin = plugins.get('transaction');

  plugin.add({
    id: 'setNamespacedAlias',
    exclude: $rootScope.TRADE_UI_ONLY,
    execute: function (args) {
      args = args||{};
      return plugin.create(angular.extend(args, {
        title: 'Namespaced Alias',
        message: 'Create new or update existing alias.',
        requestType: 'setNamespacedAlias',
        createArguments: function (items) {
          return {
            aliasName: items.aliasName,
            aliasURI: items.aliasURI
          }
        },
        fields: [
          plugin.fields('namespaced-alias').create('aliasName', { label: 'Name', required: true, value: args.aliasName||'', 
            validate: function (text) {
              if (text) {
                if (!plugin.EXTENDED_ALPHABET.test(text)) throw 'Invalid character';
                if (plugin.getByteLen(text) > 100) throw 'To much characters';
              }
            },
            onchange: function (fields) {
              fields.aliasURI.value = this.alias ? this.alias.aliasURI : '';
              fields.aliasURI.changed();
            }
          }),
          plugin.fields('textarea').create('aliasURI', { label: 'Value', value: args.aliasURI||'',
            validate: function (text) {
              if (text) {
                if (!plugin.EXTENDED_ALPHABET.test(text)) throw 'Invalid character';
                if (plugin.getByteLen(text) > 1000) throw 'To much characters';
              }
            },
            onchange: function () {
              this.warnMsg = '';
              if (this.value) {
                var remain = 1000 - plugin.getByteLen(this.value);
                if (remain > 0) {
                  this.warnMsg = remain+' characters remain';
                }
                else {
                  this.warnMsg = 'Maximum reached';
                }
              }
            }
          })
        ]
      }));
    }
  });
});
})();