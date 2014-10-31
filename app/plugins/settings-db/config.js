(function () {
'use strict';
var module = angular.module('fim.base');
module.run(function (plugins) {  
  plugins.register({
    id: 'database',
    extends: 'settings',
    label: 'Database',
    icon_class: 'glyphicon glyphicon-wrench',
    templateURL: 'plugins/settings-db/partials/settings-db.html',
  });
});
})();