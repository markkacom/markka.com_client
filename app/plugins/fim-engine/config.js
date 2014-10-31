(function () {
'use strict';
var module = angular.module('fim.base');
module.run(function (plugins) {  
  plugins.register({
    id:       'fim-engine',
    extends:  'system',
    templateURL:  'plugins/fim-engine/partials/status.html'
  });
});
})();