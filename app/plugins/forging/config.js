(function () {
'use strict';

/* Only include this plugin when we run as desktop app */
try {
  var isNodeJS = typeof require == 'function' && require('child_process');
  if (!isNodeJS)
    return;
} catch (e) {
  return;
}

var module = angular.module('fim.base');
module.run(function (modals, plugins, $q) {

  var config = {
    senderRS: { type: String }
  };
  
  /* Register as plugin */
  plugins.register({
    id: 'forging',
    extends: 'accounts',
    label: 'Forging',
    create: function (args) {
      if (plugins.validate(args, config)) {
        var deferred = $q.defer();
        modals.open('forgingStart', {
          resolve: {
            items: function () {
              return angular.copy(args);
            }
          },
          close: function (items) {
            deferred.resolve(items);
          },
          cancel: function () {
            deferred.resolve(null);
          }
        });
        return deferred.promise;
      }
    }
  });

  /* Register modal dialogs */
  modals.register('forgingStart', { 
    templateUrl: 'plugins/forging/partials/forging-start-modal.html', 
    controller: 'ForgingPluginCreateModalController' 
  });
});

})();