(function () {
'use strict';
var module = angular.module('fim.base');
module.factory('Setting', function() {
  var Setting = null;
  return {
    initialize: function (db) {
      Setting = db.settings.defineClass({
        id: String,
        label: String,
        value: Object
      });

      /* Instance methods */
      Setting.prototype.save = function () {
        return db.settings.put(this);
      };

      Setting.prototype.delete = function () {
        return db.settings.delete(this.id_rs);
      };

      Setting.prototype.update = function (properties) {
        angular.extend(this, properties);
        return db.settings.update(this.id, properties);
      };

      return Setting;
    },
    get: function () {
      return Setting;
    }
  };
});

})();