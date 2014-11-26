(function () {
'use strict';
var module = angular.module('fim.base');
module.config(function($stateProvider) {  
  $stateProvider.state('authenticate', {
    url: '/authenticate/:id_rs/:name/{url:.*}',
    templateUrl: 'plugins/authenticate/partials/authenticate.html',
    controller: 'AuthenticatePlugin'
  });
});
})();