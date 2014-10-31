(function () {
'use strict';
var module = angular.module('fim.base');
module.run(function (plugins, modals, $q, $timeout) {
  plugins.register({
    id:       'scanner',
    label:    'Network Scanner',
    extends:  'plugins',
    icon_class:   'glyphicon glyphicon-road',
    templateURL:  'plugins/scanner/partials/scanner.html'
  });
});
})();