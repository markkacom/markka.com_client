(function () {
'use strict';
var module = angular.module('fim.base');
module.config(function($routeProvider) {  
  $routeProvider
    .when('/settings/:id', {
      templateUrl:  'plugins/settings/partials/settings.html',
      controller:   'SettingsPlugin'
    });
});

module.run(function (plugins) {  

  /* Register as plugin */
  plugins.register({
    id: 'settings'
  });

});

})();