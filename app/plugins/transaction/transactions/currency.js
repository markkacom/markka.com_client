// currency buy
// currency sell
// currency reserve claim
// currency reserve increase
// delete currency
// issue currency
// publish exchange offer
// transfer currency
(function () {
'use strict';
var module = angular.module('fim.base');
module.run(function (plugins, modals, $q, $rootScope, nxt) {

  /* disable until monetary system is ready */
  if (!$rootScope.MONETARY_SYSTEM) {
    return;
  }
  
  var plugin = plugins.get('transaction');

  plugin.add({
    label: 'Issue Currency',
    id: 'issueCurrency',
    execute: function (senderRS, args) {
      args = args||{};
      return plugin.create(angular.extend(args, {
        title: 'Issue currency',
        message: 'Issue a new currency',
        senderRS: senderRS,
        requestType: 'issueCurrency',
        canHaveRecipient: false,
        createArguments: function (items) {
          return {
            name: items.name,
            code: String(items.code).toUpperCase(),
            description: items.description,
            type: items.type,
            initialSupply: items.initialSupply, 
            reserveSupply: items.reserveSupply,
            maxSupply: items.maxSupply,
            issuanceHeight: items.issuanceHeight,
            minReservePerUnitNQT: items.minReservePerUnitNQT,
            minDifficulty: items.minDifficulty,
            maxDifficulty: items.maxDifficulty,
            ruleset: 0, // for future use, always set to 0
            algorithm: items.algorithm,
            decimals: items.decimals
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
            else if ( ! plugin.ALPHABET.test(text)) { this.errorMsg = 'Invalid character'; }
            else if (plugin.getByteLen(text) < 3 || plugin.getByteLen(text) > 10) { this.errorMsg = 'To much characters'; }
            return ! this.errorMsg;
          },
          required: true
        }, {
          label: 'Code',
          name: 'code',
          type: 'text',
          value: args.code||'',
          validate: function (text) { 
            this.errorMsg = null;
            if (!text) { this.errorMsg = null; }
            else if ( ! plugin.ALPHABET.test(text)) { this.errorMsg = 'Invalid character'; }
            else if (plugin.getByteLen(text) > 10) { this.errorMsg = 'To much characters'; }
            else if (plugin.getByteLen(text) < 3) { this.errorMsg = 'Not enaough characters'; }
            return ! this.errorMsg;
          },
          required: true
        }, {
          label: 'Description',
          name: 'description',
          type: 'textarea',
          value: args.code||'',
          validate: function (text) { 
            this.errorMsg = null;
            if (!text) { this.errorMsg = null; }
            else if (plugin.getByteLen(text) > 1000) { this.errorMsg = 'To much characters'; }
            return ! this.errorMsg;
          },
          required: true
        }, {
          label: 'Type',
          name: 'type',
          type: 'text',
          value: args.type||'',
          required: true
        }, {
          label: 'Max supply',
          name: 'maxSupply',
          type: 'text',
          value: args.maxSupply||'',
          validate: function (text) { 
            this.errorMsg = null;
            if (!text) { this.errorMsg = null; }
            else if ( ! plugin.isNumeric(text)) { this.errorMsg = 'Must be a number'; }
            return ! this.errorMsg;
          },
          required: true
        }, {
          label: 'Initial supply',
          name: 'initialSupply',
          type: 'text',
          value: args.initialSupply||'',
          validate: function (text) { 
            this.errorMsg = null;
            if (!text) { this.errorMsg = null; }
            else if ( ! plugin.isNumeric(text)) { this.errorMsg = 'Must be a number'; }
            return ! this.errorMsg;
          },
          required: true
        }, {
          label: 'Decimals',
          name: 'decimals',
          type: 'text',
          value: args.decimals||'',
          validate: function (text) { 
            this.errorMsg = null;
            if (!text) { this.errorMsg = null; }
            else if ( ! plugin.isNumeric(text)) { this.errorMsg = 'Must be a number'; }
            return ! this.errorMsg;
          },
          required: true
        }, {
          label: 'Issuance Height',
          name: 'issuanceHeight',
          type: 'text',
          value: args.issuanceHeight||'',
          validate: function (text) { 
            this.errorMsg = null;
            if (!text) { this.errorMsg = null; }
            else if ( ! plugin.isNumeric(text)) { this.errorMsg = 'Must be a number'; }
            return ! this.errorMsg;
          },
          required: true
        }, {
          label: 'Minimum FIM value per unit to allow the currency to become active',
          name: 'minReservePerUnitNQT',
          type: 'money',
          value: args.minReservePerUnitNQT||'',
          required: false
        }, {
          label: 'Number of units that will be distributed to founders',
          name: 'reserveSupply',
          type: 'text',
          value: args.reserveSupply||'',
          validate: function (text) { 
            this.errorMsg = null;
            if (!text) { this.errorMsg = null; }
            else if ( ! plugin.isNumeric(text)) { this.errorMsg = 'Must be a number'; }
            return ! this.errorMsg;
          },
          required: false
        }, {
          label: 'Minimum difficult',
          name: 'minDifficulty',
          type: 'text',
          value: args.minDifficulty||'',
          validate: function (text) { 
            this.errorMsg = null;
            if (!text) { this.errorMsg = null; }
            else if ( ! plugin.isNumeric(text)) { this.errorMsg = 'Must be a number'; }
            return ! this.errorMsg;
          },
          required: false
        }, {
          label: 'Maximum difficulty',
          name: 'maxDifficulty',
          type: 'text',
          value: args.maxDifficulty||'',
          validate: function (text) { 
            this.errorMsg = null;
            if (!text) { this.errorMsg = null; }
            else if ( ! plugin.isNumeric(text)) { this.errorMsg = 'Must be a number'; }
            return ! this.errorMsg;
          },
          required: false
        }, {
          label: 'Algorithm',
          name: 'algorithm',
          type: 'text',
          value: args.algorithm||'',
          required: false
        }]
      }));
    }
  });
});
})();
