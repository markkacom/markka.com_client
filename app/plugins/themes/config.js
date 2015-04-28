(function () {
'use strict';
var module = angular.module('fim.base');
module.run(function (modals, plugins, settings) { 
  
  /* Register as plugin */
  var plugin = plugins.register({
    registry: {},
    id: 'themes',
    label: 'Themes',
    extends: 'settings',
    icon_class:   'glyphicon glyphicon-fire',    
    templateURL: 'plugins/themes/partials/themes.html',    
    switchTo: function (id) {
      document.getElementById('bootswatch.style').setAttribute('href', this.registry[id].url);
    },
    register: function (id, label, url) {
      this.registry[id] = { label: label, url: url, id: id };
    },
    default: function () {
      return this.registry['spacelab'];
    }
  });

  /* Register styles */
  angular.forEach(['amelia','cerulean','cosmo','custom','cyborg','darkly',
                   /*'default',*/'flatly','journal','lumen','paper','readable',
                   'sandstone','simplex','slate','spacelab','superhero',
                   'united','yeti', 'google'], 
    function (id) {
      var capitalized = id.charAt(0).toUpperCase() + id.slice(1);
      plugin.register(id, capitalized, 'plugins/themes/css/'+id+'.bootstrap.min.css');
    }
  );

  /* Set default setting / load setting theme from db */
  settings.initialize([{
    id: 'themes.default.theme',
    value: 'yeti',
    type: String,
    label: 'Default theme',
    resolve: function (value) {
      plugin.switchTo(value);
    }
  }]);
});
})();