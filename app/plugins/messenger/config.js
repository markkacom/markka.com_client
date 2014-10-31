(function () {
'use strict';
var module = angular.module('fim.base');
module.config(function($stateProvider) {  
  $stateProvider.state('messenger', {
    url: '/messenger/:folder/:message',
    views: {
      '': { 
        templateUrl: 'plugins/messenger/partials/messenger.html',
        controller: 'MessengerPlugin'
      },
      'folders@messenger': {
        templateUrl: 'plugins/messenger/partials/messenger-folders.html',
        controller: 'MessengerPluginFoldersController'
      },
      'inbox@messenger': {
        templateUrl: 'plugins/messenger/partials/messenger-inbox.html',
        controller: 'MessengerPluginInboxController'
      },
      'detail@messenger': {
        templateUrl: 'plugins/messenger/partials/messenger-detail.html',
        controller: 'MessengerPluginDetailController'
      }
    }
  });
});

module.run(function (plugins) {  

  /* Register as plugin */
  plugins.register({
    id: 'messenger',
    extends: 'app',
    sref: 'messenger',
    label: 'Messenger'
  });

});

})();