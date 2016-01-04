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

module.config(function($routeProvider) {
  $routeProvider.when('/start', {
    templateUrl: 'partials/start.html',
    controller: 'StartController'
  }).otherwise({
    redirectTo: '/start'
  });
});

/**
 * Application startup:
 *
 * 1. Ask user to select language (unless already selected)
 * 2. Ask user to start FIMK server (unless user selected to always or never start FIMK)
 * 3. Ask user to start NXT server (unless user selected to always or never start NXT)
 * 4. Ask user to add an account (unless he already has an account)
 *
 */

module.run(function (modals, settings) {
  modals.register('language', {
    templateUrl: 'partials/language-modal.html',
    controller: 'LanguageModalController'
  });

  modals.register('startServer', {
    templateUrl: 'partials/start-server-modal.html',
    controller: 'StartServerModalController'
  });

  settings.initialize([{
    id: 'initialization.always_start_fimk',
    value: false,
    type: Boolean,
    label: 'Always start FIMK server',
  }, {
    id: 'initialization.never_start_fimk',
    value: false,
    type: Boolean,
    label: 'Never start FIMK server',
  }, {
    id: 'initialization.always_start_nxt',
    value: false,
    type: Boolean,
    label: 'Always start NXT server',
  }, {
    id: 'initialization.never_start_nxt',
    value: false,
    type: Boolean,
    label: 'Never start NXT server',
  }, {
    id: 'initialization.user_selected_language',
    value: false,
    type: Boolean,
    label: 'User selected initial language'
  }]);
});

module.controller('StartController', function ($scope, settings, db, modals, plugins, $rootScope, serverService, $location, $timeout, ActivityProvider, nxt) {

  /* While on the landing page the <body> will have the class showing-landing-page */
  $rootScope.showingLandingPage = true;
  $scope.$on('$destroy', function () {
    $rootScope.showingLandingPage = false;
  });

  $scope.searchQuery = '';

  var theme_id = settings.get('themes.default.theme');
  $scope.themes = [];
  $scope.selectedTheme = null;

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

  $scope.provider = new ActivityProvider(nxt.fim(), $scope, 0, null, {all:true});
  $scope.provider.reload();

  $scope.changeTheme = function (theme) {
    settings.update('themes.default.theme', theme.id);
  }

  function maybeStartFIMKServer() {
    if (isNodeJS &&
        !settings.get('initialization.never_start_fimk') &&
        !serverService.isRunning('TYPE_FIM')) {
      modals.open('startServer', {
        resolve: {
          items: function () {
            return {
              type: 'TYPE_FIM',
              symbol: 'FIM',
              always_start_setting: 'initialization.always_start_fimk',
              never_start_setting: 'initialization.never_start_fimk'
            }
          }
        },
        close: function () {
          maybeStartNXTServer();
        }
      });
    }
    else {
      maybeStartNXTServer();
    }
  }

  function maybeStartNXTServer() {
    if (isNodeJS &&
        $rootScope.enableDualEngines &&
        !settings.get('initialization.never_start_nxt') &&
        !serverService.isRunning('TYPE_NXT')) {
      modals.open('startServer', {
        resolve: {
          items: function () {
            return {
              always_start_setting: 'initialization.always_start_nxt',
              never_start_setting: 'initialization.never_start_nxt',
              type: 'TYPE_NXT',
              symbol: 'NXT'
            }
          }
        }
      });
    }
  }

  $scope.doSearch = function () {
    $location.path('/search/fim/accounts/'+$scope.searchQuery);
  }

});

})();