(function () {
'use strict';
var module = angular.module('fim.base');  
module.factory('plugins', function($log) {
  var registry = {};
  return {

    /* Returns a plugin by id */
    get: function (id) {
      if (!(id in registry)) {
        throw new Error('No such plugin "'+id+'"');
      }
      return registry[id];
    },
    
    /* Registers a plugin */
    register: function (plugin) {
      registry[plugin.id] = plugin;
      return plugin;
    },  

    /* Call the callback for every plugin we find that matches the query */
    install: function (parentID, callback) {
      angular.forEach(registry, function (plugin, id) {
        if (plugin.extends == parentID) {
          callback(plugin);
        }
      });
    },

    /* Validates arguments based on a config object */
    validate: function (args, config) {
      /* Test for missing arguments */
      for (var argName in config) {
        var argConfig = config[argName];
        if (argConfig.required && !(argName in args)) {
          console.error("Missing required argument "+argName);
          return false;
        }
      }
      /* Test argument type and unknown arguments */
      for (var argName in args) {
        var argValue = args[argName];
        if (!(argName in config)) {
          console.error("Unexpected argument "+argName);
          return false;
        }
        if (!(new Object(argValue) instanceof config[argName].type) && !(argValue == undefined)) {
          console.error("Argument for "+argName+" of wrong type. Expecting "+config[argName].type+" but got "+argValue);
          return false;
        }
      }
      return true;
    }
  };
});
})();