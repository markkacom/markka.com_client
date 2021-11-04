/**
 * The MIT License (MIT)
 * Copyright (c) 2021 Krypto Fin ry and the FIMK Developers
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
// assign expiry info

(function () {
  'use strict';
  var module = angular.module('fim.base');
  module.run(function (plugins, modals, $q, $rootScope, nxt) {

    var plugin = plugins.get('transaction');

    plugin.add({
      id: 'assignExpiry',
      //exclude: $rootScope.TRADE_UI_ONLY,
      execute: function (args) {
        args = args || {};
        let epochTimeNow = nxt.util.convertToEpochTimestamp(Date.now())
        let api = nxt.get($rootScope.currentAccount.id_rs);
        return plugin.create(angular.extend(args, {
          title: 'Assign Expiry',
          message: 'Assign expiry to asset, marketplace',
          requestType: 'setNamespacedAlias',
          createArguments: function (items) {
            return {
              aliasName: `(FTR)`,
              aliasURI: `${items.asset}|${items.expiry}`
            }
          },
          fields: [
            plugin.fields('asset').create('asset', {
              value: args.asset || '',
              label: 'Asset',
              required: true,
              //account: $rootScope.currentAccount.id_rs,  //todo revert this
              api: api
            }),
            plugin.fields('text').create('expiry', {
              value: args.expiry || epochTimeNow,
              label: 'Expiration time', required: true,
              validate: function (text) {
                if (text && !plugin.isNumeric(text)) throw 'Must be a number';
              },
              onchange: function (fields) {
                fields.expiryDisplayed.hide = !this.value;
                if (this.value) {
                  fields.expiryDisplayed.value = nxt.util.formatTimestamp(this.value)
                }
              }
            }),
            plugin.fields('static').create('expiryDisplayed', {
              hide: false,
              value: nxt.util.formatTimestamp(epochTimeNow)
            })
          ]
        }));
      }
    });
  });
})();
