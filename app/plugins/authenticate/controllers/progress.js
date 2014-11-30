(function () {
'use strict';
var module = angular.module('fim.base');
module.controller('AuthenticatePluginSendModal', function(items, $modalInstance, $scope, $q, $http, $timeout) {

  $scope.items    = items;
  $scope.message  = 'Sending data';
  var canceller   = $q.defer();

  $scope.close = function (success) {
    canceller.resolve();
    $modalInstance.close(success);
  };  

  function setMessage(txt) {
    $scope.$evalAsync(function () {
      $scope.message = txt;
    });  
  }

  $http( 
    angular.extend(items.http_args, {
      timeout: canceller.promise
    })
  ).success(
    function (data, status, headers, config) {
      setMessage('Send Successfully');
      $timeout(function () {
        $modalInstance.close(true);
      }, 2000);
    }
  ).error(
    function (data, status, headers, config) {
      setMessage('Send Failed');
      $timeout(function () {
        $modalInstance.close(false);
      }, 2000);      
    }
  );

});
})();