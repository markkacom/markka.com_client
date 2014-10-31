(function () {
'use strict';
var module = angular.module('fim.base');
module.config(function($stateProvider) {  
  $stateProvider.state('plugins', {
    url: '/plugins/:id',
    templateUrl: 'plugins/plugins/partials/plugins.html',
    controller: 'PluginsPlugin'
  });
});

module.run(function (modals, plugins, nxt, alerts, $q, $sce) {

  function content(name, author, version) {
    var content = '<p><h4>'+name+'<small class="pull-right">'+version+'</small>'+
                  '<br><br><small class="pull-right">Made by:&nbsp;<strong>'+author+'</strong></small><br></h4><p>';
    return $sce.trustAsHtml(content)
  }

  var sub_menu = [{
    sref: 'plugins({id: "faucet"})',
    html: content('Faucet','DGEX','0.1')
  },{
    sref: 'plugins({id: "masspay"})',
    html: content('Mass Pay','FIMKrypto','0.1')
  }];

  plugins.register({
    id: 'plugins',
    extends: 'app',
    sub_menu_html: function () {
      return sub_menu;
    },
    sref: 'plugins',
    label: 'Plugins',
    icon_class: 'glyphicon glyphicon-cog',
  });
});

})();