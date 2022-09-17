/**
 * The MIT License (MIT)
 * Copyright (c) 2022 Krypto Fin ry and the FIMK Developers
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

    // range {min: 0, minExclusive: 0, max: 100, maxExclusive: 0}
    function validateNumber(v, range) {
      if (v && !plugin.isNumeric(v)) return 'Must be a number'
      var n = Number.parseInt(v)
      if (range) {
        if ((angular.isDefined(range.min) && n < range.min) || (angular.isDefined(range.minExclusive) && n <= range.minExclusive)) {
          return 'wrong value'
        }
        if ((angular.isDefined(range.max) && n > range.max) || (angular.isDefined(range.maxExclusive) && n >= range.maxExclusive)) {
          return 'wrong value'
        }
      }
    }

    plugin.add({
      id: 'assignAssetRewarding',
      //exclude: $rootScope.TRADE_UI_ONLY,
      execute: function (args) {
        args = args || {};
        var api = nxt.get($rootScope.currentAccount.id_rs)
        return plugin.create(angular.extend(args, {
          title: 'Assign Asset Rewarding',
          message: 'Specify the rules for Asset Rewarding',
          requestType: 'assignAssetRewarding',
          createArguments: function (items) {
            var result = {
              asset: items.asset,
              target: items.target,
              lotteryType: items.lotteryType,
              frequency: items.frequency,
              baseAmount: items.baseAmount,
              balanceDivider: items.balanceDivider
            }
            if (items.target === 0) result.balanceAssetId = items.asset2
            if (items.target === 2) result.targetAccount = items.targetAccount
            return result
          },
          fields: [
            plugin.fields('asset').create('asset', {
              label: 'Asset',
              required: true,
              account: $rootScope.currentAccount.id_rs,
              api: api
            }),
            plugin.fields('text').create('frequency', {
              value: 1,
              label: 'Frequency (every N block)',
              required: true,
              validate: function (text) {
                this.errorMsg = validateNumber(text, {min: 0})
                return ! this.errorMsg
              }
            }),
            plugin.fields('text').create('baseAmount', {
              label: 'Base Amount',
              required: true,
              validate: function (text) {
                this.errorMsg = validateNumber(text, {minExclusive: 0})
                return ! this.errorMsg
              }
            }),
            plugin.fields('radio-v2').create('target', {
              label: 'Target type',
              required: true,
              options: [
                {label: "Registered candidates", value: 0},
                {label: "Forger", value: 1},
                {label: "Constant account", value: 2}
              ],
              onchange: function (dialog) {
                var isRegisteredCandidates = dialog.target.value == 0
                dialog.lotteryType.hide = !isRegisteredCandidates
                dialog.balanceDivider.hide = !isRegisteredCandidates
                dialog.asset2.hide = !isRegisteredCandidates
                dialog.targetAccount.hide = !(dialog.target.value == 2)
              }
            }),
            plugin.fields('radio-v2').create('lotteryType', {
              label: 'Lottery type',
              required: true,
              options: [
                {label: "Random probability candidate", value: 0},
                {label: "Random probability by candidate's balance", value: 1}
              ],
              onchange: function (dialog) {
                var isOption0 = dialog.lotteryType.value == 0
                dialog.balanceDivider.hide = !isOption0
              }
            }),
            plugin.fields('text').create('balanceDivider', {
              value: 1,
              label: 'Balance Divider',
              // required: true,
              hide: true,
              validate: function (text) {
                this.errorMsg = validateNumber(text, {minExclusive: 0})
                return ! this.errorMsg
              }
            }),
            plugin.fields('asset').create('asset2', {
              label: 'Asset used to weight the target account',
              required: false,
              hide: true,
              api: api
            }),
            plugin.fields('account').create('targetAccount', {
              label: 'Constant target account',
              required: false,
              hide: true,
              api: api
            }),

            //field formValid is trick to disable button OK until at least one of fields "asset" or "goods" will be filled
            //plugin.fields('text').create('formValid', {value: '', hide: true, required: true})
          ]
        }));
      }
    });
  });
})();
