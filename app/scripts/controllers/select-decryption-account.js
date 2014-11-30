(function () {
'use strict';
var module = angular.module('fim.base');
module.controller('selectDecryptionAccountController', function (items, $modalInstance, $scope, modals) {

  $scope.items = items;

  $scope.promptForSecretphrase = function (id_rs) {
    modals.open('secretPhrase', {
      resolve: {
        items: function () {
          return { 
            sender: id_rs
          }
        }
      },
      close: function (items) {
        $modalInstance.close();
      },
      cancel: function (error) {
        $modalInstance.dismiss();
      }
    }); 
  }

  $scope.dismiss = function () {
    $modalInstance.dismiss();
  }

});
})();



