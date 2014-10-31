(function () {
'use strict';
var module = angular.module('fim.base');

module.controller('homeController', function ($scope, plugins, settings, $timeout, $state) {
  // plugins.get('wallet').createOnWalletFileSelectedPromise().then(
  //   function () { 
  //     $state.go('accounts');
  //   },
  //   function () { /* XXX - TODO - Must provide feedback here */ }
  // );

  $scope.selectedThemeName = settings.get('themes.default.theme');

  settings.resolve('themes.default.theme', function (theme) {
    $timeout(function () {
      var s = (theme||'');
      $scope.selectedThemeName = s[0].toUpperCase() + s.slice(1);
    });
  });

}); 

})();
