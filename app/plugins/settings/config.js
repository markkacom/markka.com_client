(function () {
'use strict';
var module = angular.module('fim.base');
module.config(function($stateProvider) {  
  $stateProvider.state('settings', {
    url:          '/settings/:id',
    templateUrl:  'plugins/settings/partials/settings.html',
    controller:   'SettingsPlugin'
  });
});

module.run(function (plugins, $sce, serverService) {  

  var base_menu = []; 
  if (serverService.isNodeJS()) {
    var dev_tools = {
      clazz: 'info',
      html: $sce.trustAsHtml('<p><span class="glyphicon glyphicon-dashboard"></span>&nbsp;&nbsp;Dev Tools</p>'),
      click: function () {
        try { 
          require('nw.gui').Window.get().showDevTools();
        } catch (e) {
          console.log(e)
        }
      }
    };
    base_menu.push(dev_tools);
  }
  var reload = {
    clazz: 'info',
    html: $sce.trustAsHtml('<p><span class="glyphicon glyphicon-refresh"></span>&nbsp;&nbsp;Reload Application</p>'),
    click: function () {
      try { 
        if (serverService.isNodeJS()) {
          require('nw.gui').Window.get().window.location.reload();
        }
        else {
          window.location.reload();
        }
      } catch (e) {
        console.log(e)
      }
    }
  };
  base_menu.push(reload);

  var sub_menu = [];
  function load() {
    sub_menu = [];
    plugins.install('settings', function (plugin) {
      var content = '<p><span class="'+plugin.icon_class+'"></span>&nbsp;&nbsp;'+plugin.label+'</p>';
      sub_menu.push({
        sref: "settings({id: '"+plugin.id+"'})",
        html: $sce.trustAsHtml(content)
      });
    });
    sub_menu = sub_menu.concat(base_menu);
  }
  load();

  /* Register as plugin */
  plugins.register({
    id: 'settings',
    extends: 'app',
    sref: 'settings',
    label: 'Settings',
    sub_menu_html: function () {
      return sub_menu;
    },
    sub_menu_activate: load,
    icon_class: 'glyphicon glyphicon-wrench'
  });

});

})();