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
        var epochTimeNow = args.expiry || nxt.util.convertToEpochTimestamp(Date.now()) - 1
        var api = nxt.get($rootScope.currentAccount.id_rs);
        return plugin.create(angular.extend(args, {
          title: 'Assign Expiry',
          message: 'Assign expiry to asset or/and marketplace',
          requestType: 'setNamespacedAlias',
          createArguments: function (items) {
            return {
              aliasName: "(FTR.0.0)",
              aliasURI: items.asset + "|" + items.expiry + "|" + items.goods + "|" + items.expiry
            }
          },
          fields: [
            plugin.fields('asset').create('asset', {
              value: args.asset || '',
              label: 'Asset',
              required: false,
              account: $rootScope.currentAccount.id_rs,
              api: api,
              onchange: function (fields) {
                fields.formValid.value = this.value || fields.goods.value || '';
              }
            }),
            plugin.fields('goods').create('goods', {
              value: args.goods || '',
              label: 'Goods',
              required: false,
              account: $rootScope.currentAccount.id_rs,
              api: api,
              onchange: function (fields) {
                fields.formValid.value = this.value || fields.asset.value || '';
              }
            }),
            plugin.fields('text').create('expiry', {
              value: args.expiry || epochTimeNow,
              label: 'Expiration time (in blockchain time, seconds)', required: true,
              validate: function (text) {
                if (text && !plugin.isNumeric(text)) throw 'Must be a number';
                if (nxt.util.convertToEpochTimestamp(Date.now()) > text) {
                  throw 'Timestamp should be greater than transaction time (should be in future)'
                }
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
            }),
            //field formValid is trick to disable button OK until at least one of fields "asset" or "goods" will be filled
            plugin.fields('text').create('formValid', {value: '', hide: true, required: true})
          ]
        }));
      }
    });
  });
})();
