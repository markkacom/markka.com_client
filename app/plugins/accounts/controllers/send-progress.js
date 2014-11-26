(function () {
'use strict';
var module = angular.module('fim.base');
module.controller('AccountsPluginSendProgressMoneyModalController', function(items, $modalInstance, $scope, $q, $timeout) {

  $scope.items    = items;
  $scope.message  = '';
  $scope.method   = items.method || 'sendMoney';

  $scope.dismiss = function () {
    canceller.resolve();
    $modalInstance.dismiss();
  };  

  function setMessage(txt) {
    $scope.$evalAsync(function () {
      $scope.message = txt;
    });  
  }

  var observer = {
    start: function (methodName) {
      if (methodName == $scope.method) {
        setMessage('Creating transaction')
      }
      else if (methodName == 'broadcastTransaction') {
        $timeout(function () {
          setMessage('Broadcasting transaction')
        }, 1000);
      }
    },
    success: function (methodName) {
      if (methodName == $scope.method) {
        setMessage('Signing transaction');
      }
      else if (methodName == 'broadcastTransaction') {
        setMessage('Successfully sent transaction')
       $timeout(function () {
          $modalInstance.close();
        }, 1000);        
      }
    },
    failed: function (methodName) {
      if (methodName == $scope.method) {
        setMessage('Could not create transaction');
        $timeout(function () {
          $modalInstance.dismiss();
        }, 1000);
      }
      else if (methodName == 'broadcastTransaction') {
        setMessage('Could not broadcast transaction');
        $timeout(function () {
          $modalInstance.dismiss();
        }, 1000);
      }
    }
  };

  var canceller = $q.defer();

  items.api[$scope.method](items.args, null, canceller, observer).then(
    function (data) {
    },
    function (error) {
      $modalInstance.close(error);
    }
  );

});
})();