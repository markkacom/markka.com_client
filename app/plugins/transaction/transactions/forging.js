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
// start forging
// stop forging
(function () {
'use strict';
var module = angular.module('fim.base');
module.run(function (plugins, modals, $q, $rootScope, nxt) {

  var plugin = plugins.get('transaction');
  plugin.add({
    label: 'Start Forging',
    id: 'startForging',
    exclude: $rootScope.TRADE_UI_ONLY,
    execute: function (senderRS) {
      return plugin.create({
        title: 'Start Forging',
        message: 'Starting forging will send your passphrase to the server',
        requestType: 'startForging',
        senderRS: senderRS,
        canHaveRecipient: false,
        hideMessage: true,
        hideFee: true,
        forceLocal: true,
        createArguments: function (items) {
          return {
            secretPhrase: items.secretPhrase
          }
        },
        fields: []
      });
    }
  });

  plugin.add({
    label: 'Stop Forging',
    id: 'stopForging',
    exclude: $rootScope.TRADE_UI_ONLY,
    execute: function (senderRS) {
      return plugin.create({
        title: 'Stop Forging',
        message: 'Stopping forging will send your passphrase to the server',
        requestType: 'stopForging',
        senderRS: senderRS,
        canHaveRecipient: false,
        hideMessage: true,
        hideFee: true,
        forceLocal: true,
        createArguments: function (items) {
          return {
            secretPhrase: items.secretPhrase
          }
        },
        fields: []
      });
    }
  });

});
})();