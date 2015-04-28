(function () {
'use strict';
var module = angular.module('fim.base');  
module.factory('settings', function($log, db, $timeout) {

  function resolve(id, value) {
    var list = [];
    if (registry[id].resolve) {
      list.push(registry[id].resolve);
    }
    angular.forEach(resolvers, function (_resolvers, _id) {
      if (_id == id) {
        list = list.concat(_resolvers);
      }
    });
    $timeout(function () {
      angular.forEach(list, function (_resolve) {
        _resolve(value);
      })
    });
  }

  db.settings.addObserver(null, {
    create: function (settings) {
      angular.forEach(settings, function (setting) { 
        registry[setting.id] = setting;
        resolve(setting.id, setting.value); 
      });
    },
    update: function (settings) {
      angular.forEach(settings, function (setting) { 
        angular.extend(registry[setting.id], setting);
        resolve(setting.id, setting.value); 
      });      
    },
    remove: function (settings) {
      angular.forEach(settings, function (setting) { 
        delete registry[setting.id];
      });
    }
  });

  var stored_settings = null;
  var registry        = {};
  var resolvers       = {};
  var initializers    = [];  

  db.settings.toArray().then(
    function (settings) {
      stored_settings  = {};
      angular.forEach(settings, function (stored_setting) {
        stored_settings[stored_setting.id] = stored_setting.value;
      });
      db.transaction('rw', db.settings, function () {
        angular.forEach(initializers, function (initializer, index) {
          initialize(initializer);
        });
        initializers = null;
      }).catch(function (e) { console.error(e); });
    }
  ).catch(function (e) { console.error(e); });

  function initialize(setting) {
    if (setting.id in registry) {
      throw new Error('Duplicate initialization of setting '+setting.id);
    }

    /* Validate that the type and value are a match */
    if (setting.type && !(new Object(setting.value) instanceof setting.type)) {
      throw new Error("Setting for "+setting.id+" of wrong type");
    }

    /* Store default settings in local registry */
    registry[setting.id] = setting;
    registry[setting.id].__initialized = true;

    var stored_setting = stored_settings[setting.id];
    if (stored_setting==undefined) {
      db.settings.add({ id: setting.id, value: setting.value, label: setting.label }).catch(function (e) { console.error(e); });
    }
    else {
      registry[setting.id].value = stored_setting;
    }
    if (setting.resolve || resolvers[setting.id]) {
      $timeout(function () {
        resolve(setting.id, stored_setting==undefined ? setting.value : stored_setting);
      });
    }
  }

  return {
    // DEBUG
    __registry: registry,

    /**
     * Returns a setting directly from memory.
     *
     * @param key String
     * @returns Object
     */
    get: function (key) {
      return registry[key] ? registry[key].value : undefined;
    },

    /**
     * All settings have a unique id which is made from several nested namespaces.
     * Namespaces are separated with dots to form unique ids.
     *
     * Settings have a type to protect against unsupported values. Users can use 
     * one of these values for type: String, Number, Boolean, Object.
     *
     * A setting of undefined is never supported, use null in that case and Object 
     * as type.
     *
     * @param settings Array of { id: String, value: Object, label: String, type: Object, resolve: Function }
     */
    initialize: function (settings) {
      if (stored_settings == null) {
        initializers = initializers.concat(settings);
      }
      else {
        db.transaction('rw', db.settings, function () {
          angular.forEach(settings, function (setting) {
            initialize(setting);
          });
        }).catch(function (e) { console.error(e); });
      }
    },

    /**
     * Update a setting.
     */
    update: function (id, value) {
      console.log('update.setting', { id: id, value: value });
      var setting = registry[id];
      console.log('update.setting-setting', setting);
      if (!setting) {
        throw new Error("Unknown setting "+id);
      }

      /* Validate that the type and value are a match */
      if (setting.type == undefined) {
        console.log('WARNING. Setting type is undefined for "'+id+'"');
      }
      else if (!(new Object(value) instanceof setting.type)) {
        throw new Error("Setting for "+setting.id+" of wrong type");
      }

      if (setting.type != undefined) {
        setting.value = value;
        db.settings.put({
          id:    setting.id,
          value: setting.value,
          label: setting.label
        }).catch(function (e) { console.error(e); });
      }
    },

    /**
     * Accepts an iterator function that iterates over all settings that have a key
     * that (partially) matches the provided setting key.
     *
     * This allows to iterate over all settings for a certain namespace.
     * 
     * @param key String (partial) key
     */
    getAll: function (prefix, callback) {
      var settings = [];
      angular.forEach(registry, function (setting, key) {
        if (key.indexOf(prefix) == 0) {
          settings.push(setting);
        }
      });
      console.log('getAll.'+prefix, settings);
      callback(settings);
    },

    /**
     * Option to register a resolve listener for a plugin.
     *
     * @param key String (partial) key
     * @param resolve Function
     * */
    resolve: function (key, resolve, $scope) {
      if (!resolvers[key]) {
        resolvers[key] = [];
      }
      resolvers[key].push(resolve);
      if (registry[key] && registry[key].__initialized) {
        resolve(registry[key].value);
      }
      if ($scope) {
        $scope.$on('$destroy', function () {
          for (var i=0; i<resolvers[key].length; i++) {
            if (resolvers[key][i] == resolve) {
              resolvers[key].splice(i, 1);
            }
          }
        });
      }
    }
  }
});
})();