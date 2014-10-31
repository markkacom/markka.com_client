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
module.run(function (plugins) {  
  plugins.register({
    id: 'full-node',
    extends: 'settings',
    label: 'Local Server',
    icon_class: 'glyphicon glyphicon-hdd',
    templateURL: 'plugins/full-node/partials/full-node.html',
  });
});
})();