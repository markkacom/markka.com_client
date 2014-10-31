(function () {
'use strict';
var module = angular.module('fim.base');
module.factory('modals', function ($modal) {
var instance;

function init() {
  instance.register('secretPhrase', { templateUrl: 'partials/secretphrase-modal.html', controller: 'secretPhraseModalController' });
}

var register = {};

instance = {

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
    // Go over all modals, if there is a modal opened we'll wait 2 seconds before opening
    // the next modal. If no modal is open we'll open this modal after 50 ms.
    var modal = register[name];
    if (!modal) { throw new Error('Modal "'+ name +'" is not registered'); }
    if (modal.instance) { throw new Error('Modal "'+ name +'" is already opened'); }

    var options = {};
    angular.copy(modal.options, options);
    angular.extend(options, extraOptions||{});

    options.keyboard = false;
    options.backdrop = 'static';

    modal.instance = $modal.open(options);
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
  }
};
init();
return instance;

});

})();