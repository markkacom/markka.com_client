// set account info
(function () {
'use strict';
var module = angular.module('fim.base');
module.run(function (plugins, modals, $q, $rootScope, nxt, UserService) {
  
  var plugin = plugins.get('transaction');

  plugin.add({
    label: 'Set account info',
    id: 'setAccountInfo',
    execute: function (args) {
      args = args||{};
      return plugin.create(angular.extend(args, {
        title: 'Set account info',
        message: 'Set your publicly visible account name and description',
        requestType: 'setAccountInfo',
        canHaveRecipient: false,
        initialize: function (items) {
          var api = nxt.get(UserService.currentAccount.id_rs);
          api.engine.socket().getAccount({account: UserService.currentAccount.id_rs}).then(
            function (data) {
              $rootScope.$evalAsync(function () {
                plugin.getField(items, 'name').value = data.accountName||'';
                plugin.getField(items, 'description').value = data.description||'';
              });
            }
          );
        },
        createArguments: function (items) {
          return { 
            name: items.name,
            description: items.description
          }
        },
        fields: [{
          label: 'Name',
          name: 'name',
          type: 'text',
          value: args.name||'',
          validate: function (text) { 
            this.errorMsg = null;
            if (!text) { this.errorMsg = null; }
            else {
              if (plugin.getByteLen(text) > 100) { this.errorMsg = 'To much characters'; }
            }
            return ! this.errorMsg;
          },
          required: false
        }, {
          label: 'Description',
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
          required: false
        }]
      }));
    }
  });  

});
})();