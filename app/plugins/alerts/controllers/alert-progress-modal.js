(function () {
'use strict';
var module = angular.module('fim.base');
module.controller('AlertProgressModalController', function (items, $modalInstance, $scope, $timeout, $q) {
  
  $scope.items = items;
  $scope.items.title = items.title || 'Please wait';
  $scope.items.message = items.message || 'Please wait';
  $scope.items.progressValue = 0;
  $scope.items.closeDisabled = true;
  $scope.items.hasError = false;
  items.progress = {
    close: function () {
      var deferred = $q.defer();
      $modalInstance.result.then(function () {
        deferred.resolve();
      });
      $modalInstance.close();
      if (this.onclose) {
        this.onclose();
      }
      return deferred.promise;
    },

    setMessage: function (message) {
      $scope.$evalAsync(function () {
        $scope.items.message = message;
      });
    },

    setErrorMessage: function (message) {
      $scope.$evalAsync(function () {
        $scope.items.message = message;
        $scope.items.hasError = true;
      });
    },

    animateProgress: function (value) {
      var deferred = $q.defer();
      function frame() {
        if ($scope.items.progressValue < 100) {
          $scope.items.progressValue += 10;  
          $timeout(frame, 20);
        }
        else {
          $timeout(deferred.resolve, 20);
        }
      }
      $timeout(frame, 10);
      return deferred.promise;
    },

    enableCloseBtn: function () {
      $scope.$evalAsync(function () {
        $scope.items.closeDisabled = false;
      });
    }
  }

  /* The cancel button forwards to the deferred that will be rejected */
  $scope.dismiss = function () {
    items.progress.close();
  }
});
})();