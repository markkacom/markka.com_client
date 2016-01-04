/**
 * The MIT License (MIT)
 * Copyright (c) 2016 Krypto Fin ry and the FIMK Developers
 *
 * Permission is hereby granted, free of charge, to any person obtaining a copy of
 * this software and associated documentation files (the "Software"), to deal in
 * the Software without restriction, including without limitation the rights to
 * use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of
 * the Software, and to permit persons to whom the Software is furnished to do so,
 * subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be included in all
 * copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
 * SOFTWARE.
 * */
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