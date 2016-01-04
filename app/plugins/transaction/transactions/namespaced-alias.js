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