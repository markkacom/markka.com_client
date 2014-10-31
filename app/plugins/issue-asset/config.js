(function () {
'use strict';
var module = angular.module('fim.base');
module.run(function (modals, plugins, $q) {

  var config = {
    senderRS:           { type: String }
  };
  
  /* Register as plugin */
  plugins.register({
    id: 'issue-asset',
    extends: 'accounts',
    label: 'Issue Asset',
    create: function (args) {
      if (plugins.validate(args, config)) {
        var deferred = $q.defer();
        modals.open('issueAssetCreate', {
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
  modals.register('issueAssetCreate', { 
    templateUrl: 'plugins/issue-asset/views/issue-asset-modal.html', 
    controller: 'IssueAssetPluginModalController' 
  });
});

})();