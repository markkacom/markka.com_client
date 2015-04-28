(function () {
'use strict';
var module = angular.module('fim.base');
module.controller('AlertWaitModalController', function (items, $modalInstance, $scope) {
  
  $scope.items = items;
  $scope.items.title = items.title || 'Please wait';
  $scope.items.message = items.message || 'Please wait';
  $scope.items.busy = 'busy' in items ? items.busy : true;
  $scope.items.btnLabel = items.btnLabel || 'Cancel';
  
  var deferred = items.deferred;

  /* Close when the promise is resolved */
  deferred.promise.then(
    function () {
      $modalInstance.close();
    }
  );

  /* The cancel button forwards to the deferred that will be rejected */
  $scope.dismiss = function () {
    deferred.reject();
    $modalInstance.dismiss();
  }
});
})();