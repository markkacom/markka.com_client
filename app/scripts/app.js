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
  'noCAPTCHA'
]);

module.config(function(noCAPTCHAProvider, $translateProvider) {
  noCAPTCHAProvider.setSiteKey('6Le7pBITAAAAANPHWrIsoP_ZvlxWr0bSjOPrlszc');
  noCAPTCHAProvider.setTheme('light');
  noCAPTCHAProvider.setLanguage($translateProvider.preferredLanguage());
});

module.run(function ($log, $rootScope, $translate, plugins, serverService) {
  $log.log('fim.base application started');
  /*  disable this code, which is needed for nw.js but not needed for Electron

  todo the same in Electron manner

  if (isNodeJS) {
    var win = require('nw.gui').Window.get();
    win.on('close', function (event) {

      var self = this;
      plugins.get('alerts').confirm({
        title: 'Close Mofowallet',
        message: 'Are you sure you want to exit Lompsa?'
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
  }*/
});

module.config(function($translateProvider, $httpProvider) {
  $translateProvider.useSanitizeValueStrategy(null);
  $translateProvider.useStaticFilesLoader({ prefix: './i18n/', suffix: '.json' });
  $translateProvider.preferredLanguage('fi');
  $translateProvider.useLocalStorage();

  delete $httpProvider.defaults.headers.common['X-Requested-With'];
});

})();

