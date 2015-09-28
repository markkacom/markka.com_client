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