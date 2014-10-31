(function () {
'use strict';
var module = angular.module('fim.base');
module.run(function (plugins) {  
  plugins.register({
    id:       'nxt-engine',
    extends:  'system',
    templateURL:  'plugins/nxt-engine/partials/status.html'
  });
});
})();