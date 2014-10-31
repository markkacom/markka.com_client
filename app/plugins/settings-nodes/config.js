(function () {
'use strict';
var module = angular.module('fim.base');
module.run(function (plugins) {  
  plugins.register({
    id: 'nodes',
    extends: 'settings',
    label: 'Public Nodes',
    icon_class: 'glyphicon glyphicon-tree-deciduous',
    templateURL: 'plugins/settings-nodes/partials/settings-nodes.html',
  });
});
})();