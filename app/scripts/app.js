(function () {
'use strict';

/* Handle nodejs exceptions */
if (typeof process != 'undefined') {
  process.on('uncaughtException', function(err) {
    console.log('Caught exception: ' + err);
  });
}

var module = angular.module('fim.base', [
  'ngAnimate',
  // 'ngCookies',
  // 'ngResource',
  'ui.router',
  'ui.bootstrap',
  'ngSanitize',
  'ngTouch',
  'angular-loading-bar',  
  // 'ngGrid',
  'pascalprecht.translate',
  'ngTable',
  'ui.validate'
]);

module.run(function ($log, $rootScope, serverService) {
  $log.log('fim.base application started');
});

module.config(function($httpProvider) {
  delete $httpProvider.defaults.headers.common['X-Requested-With'];
});


})();