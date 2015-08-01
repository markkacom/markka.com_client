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