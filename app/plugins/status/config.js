(function () {
'use strict';
var module = angular.module('fim.base');
module.run(function (plugins) {  

  /* Register as plugin */
  plugins.register({
    id:       'status',
    extends:  'system',
    templateURL:  'plugins/status/partials/status.html',
    popupTemplateURL: ''
  });
});
})();