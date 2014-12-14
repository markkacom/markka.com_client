(function () {
'use strict';
var module = angular.module('fim.base');
module.controller('SettingsPluginWalletController', function($scope, $timeout, plugins, db, alerts, nxt, $sce) {

  var walletPlugin  = plugins.get('wallet');
  $scope.fileName   = '';

  function load() {
    $scope.entries  = [];
    $scope.wallet   = walletPlugin.getWallet();    
    $scope.file     = walletPlugin.getFile();    
    $scope.label    = formatFile($scope.file);  
    $scope.fileName = ($scope.file && $scope.file.name) || '';

    angular.forEach(walletPlugin.getKeys(), function (key) {
      var entry = $scope.wallet[key];
      $scope.entries.push({
        name:   entry.name,
        id_rs:  entry.id_rs
      });
    });
  }

  load();

  plugins.get('wallet').createOnWalletFileSelectedPromise($scope).then(
    function () { 
      $timeout(function () { 
        load();
      }); 
    },
    function () { /* Must provide feedback here */ }
  );

  function bytesToSize(bytes) {
     if(bytes == 0) return '0 Byte';
     var k = 1000;
     var sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB', 'PB', 'EB', 'ZB', 'YB'];
     var i = Math.floor(Math.log(bytes) / Math.log(k));
     return (bytes / Math.pow(k, i)).toPrecision(3) + ' ' + sizes[i];
  }

  function formatFile(file) {
    return file ? ('File: ' + file.name + ' | ' + bytesToSize(file.size) + ' | last modified: ' + $.timeago(file.lastModifiedDate)) : '';
  }  

  /* XXX TODO investigate if using a modal window will help to detect native save as to complete
              it could be that a closed modal dialog does not return until you closed all open
              save as dialogs... possibly hopefully.. 
              now there is no way to detect succesfull native save as */
  $scope.backupWallet = function () {
    walletPlugin.save($scope.fileName);
  }

  $scope.showSecretPhrase = function (key) {
    var entry = $scope.wallet[key];
    if (entry) {
      plugins.get('alerts').info({
        title: 'Secretphrase for ' + entry.id_rs,
        message: entry.secretPhrase
      });
    }
  }

  $scope.removeSecretPhrase = function (key) {
    var entry = $scope.wallet[key];
    if (entry) {
      plugins.get('alerts').confirm({ 
        html: $sce.trustAsHtml('<p>Please confirm that you want to remove this account from your wallet.<br>'+
              'You must save/backup your wallet for the removal to take effect.</p>')
      }).then(
        function (remove_from_wallet) {
          if (remove_from_wallet) {
            $scope.$evalAsync(function () {
              walletPlugin.remove(key);
              plugins.get('alerts').confirm({ 
                html: $sce.trustAsHtml('<p>Do you want to remove this account from mofo\'s database too?<br>'+
                        'If you choose not to remove the account from the database you can remove it later from within the accounts section.</p>')
              }).then(
                function (remove_from_db) {
                  if (remove_from_db) {
                    db.accounts.delete(key).then(
                      function () {
                        load();
                      }
                    );
                  }
                  else {
                    load();
                  }
                }
              );
            });
          }
        }
      );
    }
  }

});
})();