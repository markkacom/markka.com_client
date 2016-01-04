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
module.factory('modals', function ($modal) {
var register = {};
var instance = {

  /**
   * Registers a modal with the modal service.
   *
   * @param options {
   *   templateUrl: '',
   *   controller: ''
   * }
   */
  register: function (name, options) {
    register[name] = {
      options: options,
      instance: null
    };
  },

  open: function (name, extraOptions) {
    var modal = register[name];
    if (!modal) { throw new Error('Modal "'+ name +'" is not registered'); }
    if (modal.instance) { throw new Error('Modal "'+ name +'" is already opened'); }

    var options = {};
    angular.copy(modal.options, options);
    angular.extend(options, extraOptions||{});

    options.keyboard = false;
    options.backdrop = 'static';

    modal.instance = $modal.open(options);
    if (options.opened) {
      modal.instance.opened.then(
        function () {
          options.opened();
        }
      );
    }
    modal.instance.result.then(
      function close(payload) {
        modal.instance = null;
        if (options.close) {
          options.close(payload);
        }
      },
      function cancel(payload) {
        modal.instance = null;
        if (options.cancel) {
          options.cancel(payload);
        }
      }
    );
  },

  close: function (name, payload) {
    var modal = register[name];
    if (!modal) { throw new Error('Modal "'+ name +'" is not registered'); }
    if (!modal.instance) { throw new Error('Modal "'+ name +'" is not opened'); }
    modal.instance.close(payload);
  },

  cancel: function (name, payload) {
    var modal = register[name];
    if (!modal) { throw new Error('Modal "'+ name +'" is not registered'); }
    if (!modal.instance) { throw new Error('Modal "'+ name +'" is not opened'); }
    modal.instance.cancel(payload);
  },

  isOpen: function (name) {
    var modal = register[name];
    return modal && modal.instance;
  },

  getInstance: function (name) {
    return register[name] ? register[name].instance : null;
  }
};
return instance;

});

})();