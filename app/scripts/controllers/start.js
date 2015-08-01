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

  modals.register('welcome', { 
    templateUrl: 'partials/welcome-modal.html', 
    controller: 'WelcomeModalController' 
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

module.controller('StartController', function ($scope, settings, db, modals, plugins, $rootScope, serverService, $location, $timeout) {

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

  $scope.changeTheme = function (theme) {
    settings.update('themes.default.theme', theme.id);
  }

  /*settings.resolve('initialization.user_selected_language', function (value) {
    if (!$rootScope.multiLanguage || value) {
      maybeStartFIMKServer();
    }
    else {
      letUserSelectLanguage();
    }
  }, $scope);*/

  /*function letUserSelectLanguage() {
    modals.open('language', {
      resolve: {
        items: function () { return {}; }
      },
      close: function () {
        maybeStartFIMKServer();
      }
    });
  }*/  

  //maybeStartFIMKServer();

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
        },
        close: function () {
          maybeShowWelcomeScreen();
        }
      });
    }
    else {
      maybeShowWelcomeScreen();
    }
  }

  function maybeShowWelcomeScreen() {
    /*db.accounts.count(function (count) {
      if (count == 0) {
        $rootScope.showNewAccountModal();
      }
    });*/
  }

  /*$rootScope.showNewAccountModal = function () {
    modals.open('welcome', {
      resolve: {
        items: function () { 
          return {}; 
        }
      }
    });    
  }*/

  $scope.doSearch = function () {
    $location.path('/search/fim/accounts/'+$scope.searchQuery);
  }  

});

})();