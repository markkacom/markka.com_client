(function () {
'use strict';
var module = angular.module('fim.base');
module.run(function (modals, plugins, $q) {
  
  var config = {
    senderRS:           { type: String },
    key:                { type: String },
    value:              { type: String }
  };
  
  /* Register as plugin */
  plugins.register({
    id: 'namespacedAlias',
    extends: 'accounts',
    label: 'FIMK Alias',
    supported: function (id_rs) {
      return id_rs ? id_rs.indexOf('FIM-')==0 : false;
    },
    create: function (args) {
      if (plugins.validate(args, config)) {
        var deferred = $q.defer();
        modals.open('namespacedAliasCreate', {
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
  modals.register('namespacedAliasCreate', { 
    templateUrl: 'plugins/namespaced-alias/partials/namespaced-alias-create-modal.html',
    controller: 'NamespacedAliasPluginCreateModalController' 
  });
});

})();