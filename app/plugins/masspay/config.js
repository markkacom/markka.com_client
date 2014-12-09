(function () {
'use strict';
var module = angular.module('fim.base');
module.run(function (plugins, modals, $q, $timeout) {
  var gDeferred     = null;
  var gSelectedFile = null;

  plugins.register({
    id:       'masspay',
    label:    'Mass Payer',
    author:   'FIMKrypto',
    version:  '0.1',
    extends:  'plugins',
    icon_class:   'glyphicon glyphicon-th',
    templateURL:  'plugins/masspay/partials/masspay.html',    
    createOnWalletFileSelectedPromise: function () {
      gDeferred = $q.defer();
      return gDeferred.promise;
    },
    save: function (content) {
      var blob = new Blob([content], {type: "text/plain;charset=utf-8"});
      saveAs(blob, gSelectedFile?gSelectedFile.name:'mass-pay.csv');
    },
    start: function () {
      modals.open('massPaySelectAccount', {
        resolve: {
          items: function () {
            return {};
          }
        },
        close: function (items) {

          console.log('account', items.accountRS);
          console.log('secret', items.secretPhrase);

        }
      });
    }
  });

  /** 
   * Called from <input type="file" onchange="onCSVFileSelected(event)">
   * Prompts the user for file which is then loaded and it's contents put in the CSV control.
   */
  window.onMassPayFileSelected = function (event) {
    gSelectedFile = event.target.files[0];
    var reader    = new FileReader();
    reader.onload = function(event) {
      gDeferred.resolve({content: event.target.result, file: gSelectedFile});
    };
    reader.onerror = function (event) {
      if (gDeferred) {
        gDeferred.reject();
        gDeferred = null;
      }
    };
    reader.onabort = function (event) {
      if (gDeferred) {
        gDeferred.reject();
        gDeferred = null;
      }
    };
    reader.readAsText(gSelectedFile);    
  };

  modals.register('massPaySelectAccount', { 
    templateUrl: 'plugins/masspay/partials/select-account.html', 
    controller: 'MassPayPluginAccountModalController' 
  });  
});
})();