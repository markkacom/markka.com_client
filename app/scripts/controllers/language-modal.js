(function () {
'use strict';
var module = angular.module('fim.base');
module.controller('LanguageModalController', function (items, $scope, settings, $modalInstance) {
  $scope.items = items;
  $scope.close = function () {
    settings.update('initialization.user_selected_language', true);
    $modalInstance.close($scope.items);
  }
});
})();