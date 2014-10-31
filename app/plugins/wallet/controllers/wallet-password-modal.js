(function () {
'use strict';
var module = angular.module('fim.base');
module.controller('WalletPasswordModalController', function (items, $modalInstance, $scope, $timeout) {
  $scope.items = items;
  $scope.items.wrongPassword = false;

  $scope.close = function () {
    if ($scope.items.isPasswordCorrect($scope.items.password)) {
      $modalInstance.close($scope.items);      
    }
    else {
      $timeout(function () {
        $scope.items.wrongPassword = true;
      });
    }
  }

  $scope.dismiss = function () {
    $modalInstance.dismiss();
  }  

  function bytesToSize(bytes) {
     if(bytes == 0) return '0 Byte';
     var k = 1000;
     var sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB', 'PB', 'EB', 'ZB', 'YB'];
     var i = Math.floor(Math.log(bytes) / Math.log(k));
     return (bytes / Math.pow(k, i)).toPrecision(3) + ' ' + sizes[i];
  }

  $scope.formatFile = function (file) {
    return 'File: ' + file.name + ' | ' + bytesToSize(file.size) + ' | last modified: ' + $.timeago(file.lastModifiedDate);
  }
});
})();