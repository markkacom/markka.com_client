/**
 * The MIT License (MIT)
 * Copyright (c) 2016 Krypto Fin ry and the FIMK Developers
 *
 * Permission is hereby granted, free of charge, to any person obtaining a copy of
 * this software and associated documentation files (the "Software"), to deal in
 * the Software without restriction, including without limitation the rights to
 * use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of
 * the Software, and to permit persons to whom the Software is furnished to do so,
 * subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be included in all
 * copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
 * SOFTWARE.
 * */
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