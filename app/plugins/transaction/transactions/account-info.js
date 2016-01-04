/**
 * The MIT License (MIT)
 * Copyright (c) 2016 Krypto Fin ry and the FIMK Developers
 *
 * Permission is hereby granted, free of charge, to any person obtaining a copy of
 * this software and associated documentation files (the "Software"), to deal in
 * the Software without restriction, including without limitation the rights to
 * use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of
 * the Software, and to permit persons to whom the Software is furnished to do so,
 * subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be included in all
 * copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
 * SOFTWARE.
 * */
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