(function () {
'use strict';
var module = angular.module('fim.base');
module.run(function (plugins, modals, $q, $timeout) {  
  plugins.register({
    id:       'faucet',
    label:    'Faucet',
    author:   'DGEX',
    version:  '0.1',    
    extends:  'plugins',
    icon_class:   'glyphicon glyphicon-gift',
    templateURL:  'plugins/faucet/partials/faucet.html',    
  });
});
})();