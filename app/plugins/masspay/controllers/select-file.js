(function () {
'use strict';
var module = angular.module('fim.base');
module.controller('MassPayPluginFileModalController', function(items, $modalInstance, $scope) {
  $scope.items = items;
  $scope.items.textContent = null;
  
  $scope.close = function () {
    $modalInstance.close($scope.items);
  };

  $scope.dismiss = function () {
    $modalInstance.dismiss();
  };

  window.onMasspayFileSelected = function (event) {
    var reader    = new FileReader();
    reader.onload = function(event) {
      $scope.$evalAsync(function () {
        $scope.items.fileContent = event.target.result;
      });
    };
    reader.onerror = function (event) {
      $scope.$evalAsync(function () {
        $scope.items.fileContent = null;  
      });      
    };
    reader.onabort = function (event) {
      $scope.$evalAsync(function () {
        $scope.items.fileContent = null;  
      });
    };  

    $scope.$evalAsync(function () {
      $scope.items.file = event.target.files[0];
      reader.readAsText($scope.items.file);  
    });
  }
})
})();