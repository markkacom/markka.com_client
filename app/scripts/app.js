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
  'ngSanitize',
  'ngTouch',
  'ngTable',
  'ngRoute',
  'ngCookies',
  'ui.bootstrap',
  'ui.validate',
  'pascalprecht.translate',
  'infinite-scroll',
  'ngClipboard'
]);

module.config(function($routeProvider) {
  $routeProvider
    .when('/accounts/:id_rs/goods', {
      templateUrl: 'partials/goods.html',
      controller: 'GoodsCtrl'
    })
    .when('/accounts/:id_rs/goods/:goods_id/details', {
      templateUrl: 'partials/goods-details.html',
      controller: 'GoodsDetailsCtrl'
    })
});

module.run(function ($log, $rootScope, $translate, plugins, serverService) {
  $log.log('fim.base application started');
  if (isNodeJS) {
    var win = require('nw.gui').Window.get();
    win.on('close', function (event) {
    
      var self = this;
      plugins.get('alerts').confirm({
        title: 'Close Mofowallet',
        message: 'Are you sure you want to exit MofoWallet?'
      }).then( 
        function (confirmed) {
          if (confirmed) {
            var count = 0;
            angular.forEach(['TYPE_NXT','TYPE_FIM'], function (id) {
              if (serverService.isRunning(id)) {
                serverService.addListener(id, 'exit', function () {
                  count--;
                  if (count == 0) {
                    self.close(true);
                  }
                });

                count++;
                serverService.stopServer(id);
              }
            });
            if (count == 0) {
              self.hide();
              self.close(true);
            }
            else {
              plugins.get('alerts').wait({
                title: "Please wait",
                message: "Shutting down"
              });
            }
          }
        }
      );
    });
  }
});

module.config(function($translateProvider, $httpProvider) {
  $translateProvider.useSanitizeValueStrategy(null);
  $translateProvider.useStaticFilesLoader({ prefix: './i18n/', suffix: '.json' });
  $translateProvider.preferredLanguage('en');
  $translateProvider.useLocalStorage();

  delete $httpProvider.defaults.headers.common['X-Requested-With'];
});

module.config(['ngClipProvider', function(ngClipProvider) {
  ngClipProvider.setPath("ZeroClipboard.swf");
}]);

})();