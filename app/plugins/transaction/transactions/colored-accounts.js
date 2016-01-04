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
module.run(function (plugins, modals, $q, $rootScope, nxt, $translate, KeyService) {

  var plugin = plugins.get('transaction');

  plugin.add({
    id: 'accountColorCreate',
    execute: function (args) {
      args = args||{};
      return plugin.create(angular.extend(args, {
        title: 'Create Account Color',
        message: 'Use this form to create a new account color (costs 10 FIM).<br>'+
                 'The name is used for display purposes so keep it short.<br><br>'+
                 'After creating your account color you must assign it to at least one new account, '+
                 'sending FIMK to that account will automatically make that colored FIMK.<br>'+
                 'Sending colored FIMK, assets or a message from that account to any other account will automatically make that other account a colored account.<br>'+
                 'To change back colored FIMK to normal FIMK send it to the account that created the account color.',
        requestType: 'accountColorCreate',
        feeNXT: '10000',
        createArguments: function (items) {
          return {
            name: items.name,
            description: items.description||""
          }
        },
        fields: [
          plugin.fields('text').create('name', { label: 'Name', required: true,
            validate: function (text) {
              if (text) {
                if (!plugin.ALPHABET.test(text)) throw 'Invalid character';
                if (plugin.getByteLen(text) > 10) throw 'To much characters';
              }
            }
          }),
          plugin.fields('checkbox').create('showDescription', { label: 'Provide an optional description', value: false,
            onchange: function (fields) {
              fields.description.hide = !this.value;
              if (fields.description.hide) {
                fields.description.value = '';
              }
            }
          }),
          plugin.fields('textarea').create('description', { label: 'Description', hide: true,
            validate: function (text) {
              if (text) {
                if (!plugin.ALPHABET.test(text)) throw 'Invalid character';
                if (plugin.getByteLen(text) > 1000) throw 'To much characters';
              }
            }
          })
        ]
      }));
    }
  });

  var lazy_lookup_account = function (api, field) {
    api.engine.socket().callAPIFunction({requestType:'getAccount',account: field.value }).then(
      function (data) {
        field.$evalAsync(function () {
          if (data.errorDescription != 'Unknown account') {
            field.errorMsg = 'Cannot assign color to existing account';
          }
        });
      }
    );
  }.debounce(500);

  plugin.add({
    id: 'accountColorAssign',
    execute: function (args) {
      args = args||{};
      var api = nxt.get($rootScope.currentAccount.id_rs);
      return plugin.create(angular.extend(args, {
        title: 'Assign Account Color',
        message: 'Assign an account color to a new account',
        requestType: 'accountColorAssign',
        createArguments: function (items) {
          return {
            recipient: nxt.util.convertRSAddress(items.recipient),
            accountColorId: items.accountColorId
          }
        },
        fields: [
          plugin.fields('autocomplete').create('recipient', { label: 'Recipient (searches wallet)', required: true,
            wait: 500,
            template: [
              '<a class="monospace">',
                '<span class="font-bold" ng-bind="match.model.label||match.model.value"></span>&nbsp;&nbsp;',
                '<span ng-if="match.model.label!=match.model.value" class="pull-right" ng-bind="match.model.value"></span>',
              '</a>'
            ].join(''),
            validate: function (text) {
              if (text) {
                if (!api.createAddress().set(text)) {
                  throw "Invalid address";
                }
                lazy_lookup_account(api, this);
              }
            },
            getResults: function (text) {
              var query = (text||'').toLowerCase();
              var deferred = $q.defer();
              if (KeyService.wallet) {
                var results = [];
                KeyService.wallet.entries.forEach(function (account) {
                  if (/^FIM-/.test(account.id_rs)) {
                    results.push({
                      value: account.id_rs,
                      label: account.name||''
                    });
                  }
                });
                results = results.filter(function (e) {
                  return e.value.toLowerCase().indexOf(query)!=-1 || e.label.toLowerCase().indexOf(query)!=-1;
                });
                deferred.resolve(results);
              }
              else {
                deferred.resolve(null);
              }
              return deferred.promise;
            }
          }),
          plugin.fields('account-color').create('accountColorId', { label: 'Account Color', required: true })
        ]
      }));
    }
  });
});
})();