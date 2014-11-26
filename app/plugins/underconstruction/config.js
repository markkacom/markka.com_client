(function () {
'use strict';
var module = angular.module('fim.base');
module.config(function($stateProvider) {  
  $stateProvider.state('messenger', {
    url: '/messenger/:id_type',
    views: {
      '': { 
        templateUrl: 'plugins/underconstruction/partials/main.html',
        controller: 'UnderconstructionPlugin'
      } 
    }
  });

  // $stateProvider.state('exchange', {
  //   url: '/exchange/:id_type',
  //   views: {
  //     '': { 
  //       templateUrl: 'plugins/underconstruction/partials/main.html',
  //       controller: 'UnderconstructionPlugin'
  //     } 
  //   }
  // });  
});

module.run(function (plugins) {

  // plugins.register({
  //   id: 'exchange',
  //   extends: 'app',
  //   sref: 'exchange',
  //   label: 'Exchange',
  //   icon_class: 'glyphicon glyphicon-transfer'    
  // });

  plugins.register({
    id: 'messenger',
    extends: 'app',
    sref: 'messenger',
    label: 'Messenger',
    icon_class: 'glyphicon glyphicon-comment'    
  });  
});

})();