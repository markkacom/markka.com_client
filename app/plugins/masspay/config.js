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
    version:  '0.2',
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
      var deferred = $q.defer();
      modals.open('massPaySelectAccount', {
        resolve: {
          items: function () { return {}; }
        },
        close: function (items) {
          var accountRS = items.accountRS;
          var secretPhrase = items.secretPhrase;
          modals.open('massPaySelectFile', {
            resolve: {
              items: function () { return {}; }
            },
            close: function (items) {
              deferred.resolve({
                file: items.file,
                fileContent: items.fileContent,
                accountRS: accountRS,
                secretPhrase: secretPhrase
              });
            },
            cancel: deferred.reject
          });
        },
        cancel: deferred.reject
      });
      return deferred.promise;
    }
  });

  modals.register('massPaySelectAccount', { 
    templateUrl: 'plugins/masspay/partials/select-account.html', 
    controller: 'MassPayPluginAccountModalController' 
  });

  modals.register('massPaySelectFile', { 
    templateUrl: 'plugins/masspay/partials/select-file.html', 
    controller: 'MassPayPluginFileModalController' 
  });
});
})();