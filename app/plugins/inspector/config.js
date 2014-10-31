(function () {
'use strict';
var module = angular.module('fim.base');
module.run(function (modals, plugins, nxt, alerts, $q, db, $timeout) {

  var baseTranslator = {
    timestamp: function (value) {
      return ['Date', nxt.util.formatTimestamp(value)];
    },
    amountNQT: function (value) {
      return ['Amount', nxt.util.convertToNXT(value)]
    },
    feeNQT: function (value) {
      return ['Fee', nxt.util.convertToNXT(value)]
    },
    senderRS: function (value) {
      return ['Sender', value+'&nbsp;<a href="#" onclick="angular.element(this).scope().goToAccount(\''+value+'\')">(open)</a>']
    },
    recipientRS: function (value) {
      return ['Recipient', value+'&nbsp;<a href="#" onclick="angular.element(this).scope().goToAccount(\''+value+'\')">(open)</a>']
    },
    nextLesseeRS: function (value) {
      return ['Next Lessee', value+'&nbsp;<a href="#" onclick="angular.element(this).scope().goToAccount(\''+value+'\')">(open)</a>']
    },
    currentLesseeRS: function (value) {
      return ['Current Lessee', value+'&nbsp;<a href="#" onclick="angular.element(this).scope().goToAccount(\''+value+'\')">(open)</a>']
    },
    accountRS: function (value) {
      return ['Account', value+'&nbsp;<a href="#" onclick="angular.element(this).scope().goToAccount(\''+value+'\')">(open)</a>']
    },
  };

  function TransactionTranslator(api, transaction) {
    angular.extend(this, baseTranslator);
    this.attachment = {
      message: function (value) {
        return ['Message', value];
      },
      encryptedMessage: function (value) {
        return ['Encrypted Message', JSON.stringify(transaction)];
      }
    }
  }

  function AssetTranslator(api, asset) {
    angular.extend(this, baseTranslator);
  }

  function AccountTranslator(api, account) {
    angular.extend(this, baseTranslator);
    this.balanceNQT = function (value) {
      return ['Balance', nxt.util.convertToNXT(value)]
    }
    this.effectiveBalanceNXT = function (value) {
      return ['Effective Balance', nxt.util.commaFormat(String(value))]
    }
    this.unconfirmedBalanceNQT = function (value) {
      return ['Unconfirmed Balance', nxt.util.convertToNXT(value)]
    }
    this.forgedBalanceNQT = function (value) {
      return ['Forged Balance', nxt.util.convertToNXT(value)]
    }
    this.garanteedBalanceNQT = function (value) {
      return ['Garanteed Balance', nxt.util.convertToNXT(value)]
    }
  }  

  plugins.register({
    id: 'inspector',
    label: 'Inspector',
    inspect: function (object) {
      modals.open('inspectObject', {
        resolve: {
          items: function () {
            return object;
          }
        }
      });
    },
    createTransactionTranslator: function (api, object) {
      return new TransactionTranslator(api, object);
    },
    createAssetTranslator: function (api, object) {
      return new AssetTranslator(api, object);
    },
    createAccountTranslator: function (api, object) {
      return new AccountTranslator(api, object);
    }    
  });

  modals.register('inspectObject', { 
    templateUrl: 'plugins/inspector/partials/inspect.html', 
    controller: 'InspectorPluginInspectModalController'
  });

});
})();