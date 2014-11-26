(function () {
'use strict';

/* Only include this plugin when we run as desktop app */
if (!isNodeJS) return;

var module = angular.module('fim.base');
module.run(function (modals, plugins, $q) {

  var config = {
    senderRS: { type: String }
  };

  var icon_play = 'fa fa-play';
  var icon_stop = 'fa fa-circle-o-notch fa-spin';
  var rs_state  = {};
  
  /* Register as plugin */
  plugins.register({
    id: 'forging',
    extends: 'accounts',
    label: 'Forging',
    icon: icon_play,
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
    },
    setIsForging: function (id_rs, is_forging) {
      rs_state[id_rs] = is_forging;
      this.icon = is_forging ? icon_stop : icon_play;
    },
    oninstall: function (id_rs) {
      if (rs_state[id_rs]) {
        this.icon = icon_stop;
      }
      else {
        this.icon = icon_play;
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