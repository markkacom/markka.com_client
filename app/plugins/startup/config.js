(function () {
'use strict';
var module = angular.module('fim.base');
module.run(function (modals, plugins, $timeout, startupService) {

  var activities = [];

  plugins.register({
    id:       'startup',
    extends:  'system',
    templateURL:  'plugins/startup/partials/status.html',
    complete: false,
    showModal: function () {
      if (!modals.isOpen('startupModal')) {
        var self = this;
        modals.open('startupModal', {
          resolve: {
            items: function () {
              return {
                activities: startupService.activities
              };
            }
          },
          opened: function () {
            function tryit() {
              if ($('#startup-real-html-element')) {
                $timeout(function () { self.start() }, 100, false);
              }
              else {
                $timeout(tryit, 50, false);
              }
            }           
            tryit();            
          }
        });
      }
    },
    modalIsOpen: function () {
      return modals.isOpen('startupModal');
    },
    start: function () {
      startupService.start();
      startupService.deferred.promise.then(
        function () {
          if (modals.isOpen('startupModal')) {
            modals.close('startupModal');
          }
          plugins.get('startup').complete = true;
        }
      );
    }
  });

  modals.register('startupModal', { 
    templateUrl: 'plugins/startup/partials/startup.html', 
    controller: 'StartupModalController' 
  });
  modals.register('startNXTServerModal', { 
    templateUrl: 'plugins/startup/partials/start-server.html', 
    controller: 'StartServerModalController' 
  });
  modals.register('startFIMServerModal', { 
    templateUrl: 'plugins/startup/partials/start-server.html', 
    controller: 'StartServerModalController' 
  });

  $timeout(function () { plugins.get('startup').showModal() }, 1000, false);  
  // $timeout(function () { 
  //   modals.open('startNXTServerModal', {
  //     resolve: {
  //       items: function () {
  //         return {
  //           type: 'TYPE_NXT',
  //           engine: 'NXT'
  //         };
  //       }
  //     }
  //   });

  //   modals.open('startFIMServerModal', {
  //     resolve: {
  //       items: function () {
  //         return {
  //           type: 'TYPE_FIM',
  //           engine: 'FIMK',
  //         };
  //       }
  //     }
  //   });    

  // }, 100, false);  

});
})();