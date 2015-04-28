(function () {
'use strict';
var module = angular.module('fim.base');
module.config(function($routeProvider) {  
  $routeProvider
    .when('/authenticate/:challenger_id_rs/:identifier_id_rs/:challenger_name/{challenger_url:.*}', {
      templateUrl: 'plugins/authenticate/partials/authenticate.html',
      controller: 'AuthenticatePlugin'
    });

  // $stateProvider.state('authenticate', {
  //   url: '/authenticate/:challenger_id_rs/:identifier_id_rs/:challenger_name/{challenger_url:.*}',
  //   templateUrl: 'plugins/authenticate/partials/authenticate.html',
  //   controller: 'AuthenticatePlugin'
  // });
});
module.run(function (modals) {
  modals.register('authSendProgress', { 
    templateUrl: 'plugins/authenticate/partials/progress.html', 
    controller: 'AuthenticatePluginSendModal' 
  });
})
})();