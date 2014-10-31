(function () {
'use strict';
var module = angular.module('fim.base');

module.controller('SettingsThemesController', function($scope, plugins, settings, $timeout) {

  var theme_id          = settings.get('themes.default.theme');
  $scope.themes         = [];
  $scope.selectedTheme  = null;

  angular.forEach(plugins.get('themes').registry, function (theme) {
    $scope.themes.push(theme);
    if (theme.id == theme_id) {
      $scope.selectedTheme = theme;
    }
  });

  settings.resolve('themes.default.theme', function (value) {
    angular.forEach($scope.themes, function (theme) {
      if (theme.id == value) {
        $timeout(function () {
          $scope.selectedTheme = theme;
        });
      }
    });
  });

  $scope.changeTheme = function (theme) {
    settings.update('themes.default.theme', theme.id);
  }

});

})();