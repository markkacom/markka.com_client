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
module.run(function (plugins, modals, $q) {

  function _alert(args) {
    var deferred = $q.defer();
    modals.open('alert', {
      resolve: {
        items: function () {
          return args;
       }
      },
      close: function (items) {
        deferred.resolve();
      }
    });
    return deferred.promise;
  }

  /* Register as plugin */
  plugins.register({
    id:       'alerts',

    info: function (args) {
      args.title = args.title || 'Info';
      return _alert(angular.extend(args, {level: 'primary'}));
    },

    success: function (args) {
      args.title = args.title || 'Success';
      return _alert(angular.extend(args, {level: 'success'}));
    },

    warn: function (args) {
      args.title = args.title || 'Warning';
      return _alert(angular.extend(args, {level: 'warning'}));
    },

    error: function (args) {
      args.title = args.title || 'Error';
      return _alert(angular.extend(args, {level: 'danger'}));
    },

    /* @param args Object {message: String, title:String} */
    confirm: function (args) {
      args.title    = args.title || 'Confirm';
      args.level    = args.level || 'primary';
      var deferred  = $q.defer();
      modals.open('alertConfirm', {
        resolve: {
          items: function () {
            return args;
          }
        },
        close: function (value) {
          deferred.resolve(value);
        }
      });
      return deferred.promise;
    },

    /* @param args Object {message: String, title:String, value:String} */
    prompt: function (args) {
      args.title    = args.title || 'Prompt';
      args.level    = args.level || 'primary';
      var deferred  = $q.defer();
      modals.open('alertPrompt', {
        resolve: {
          items: function () {
            return args;
         }
        },
        close: function (value) {
          deferred.resolve(value);
        }
      });
      return deferred.promise;
    },

    /* @returns a deferred, close the dialog by resolving the deferred */
    wait: function (args) {
      var deferred  = $q.defer();
      args.title    = args.title || 'Please wait';
      args.level    = args.level || 'primary';
      args.deferred = deferred;
      modals.open('alertWait', {
        resolve: {
          items: function () {
            return args;
         }
        },
        close: function (value) {
          deferred.resolve(value);
        }
      });
      return deferred;
    },

    /* @returns a deferred thats resolved when the dialog is open. The deferred returns a progress
       object with which you control the contents in the dialog and that is used to close the dialog */
    progress: function (args) {
      var deferred  = $q.defer();
      args.title    = args.title || 'Please wait';
      args.level    = args.level || 'primary';
      modals.open('alertProgress', {
        resolve: {
          items: function () {
            return args;
         }
        },
        opened: function () {
          deferred.resolve(args.progress);
        }
      });
      return deferred.promise;
    }
  });

  /* Register modal dialogs */
  modals.register('alert', {
    templateUrl: 'plugins/alerts/partials/alert-modal.html',
    controller: 'AlertModalController'
  });
  modals.register('alertPrompt', {
    templateUrl: 'plugins/alerts/partials/alert-prompt-modal.html',
    controller: 'AlertPromptModalController'
  });
  modals.register('alertConfirm', {
    templateUrl: 'plugins/alerts/partials/alert-confirm-modal.html',
    controller: 'AlertConfirmModalController'
  });
  modals.register('alertWait', {
    templateUrl: 'plugins/alerts/partials/alert-wait-modal.html',
    controller: 'AlertWaitModalController'
  });
  modals.register('alertProgress', {
    templateUrl: 'plugins/alerts/partials/alert-progress-modal.html',
    controller: 'AlertProgressModalController'
  });
});
})();