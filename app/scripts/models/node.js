(function () {
'use strict';
var module = angular.module('fim.base');
module.factory('Node', function() {
  var Node = null;
  return {
    initialize: function (db) {
      Node = db.nodes.defineClass({
        url: String,
        port: Number,
        downloaded: Number,
        success_timestamp: Number,
        failed_timestamp: Number,
        success_status: Number,
        failed_status: Number,
        start_timestamp: Number,
        supports_cors: Boolean,
        scan_height: Number,
        onfork: Boolean,
        version: String,
        lastBlock: String
      });

      Node.prototype.update = function (properties) {
        angular.extend(this, properties);
        return db.nodes.update(this.id, properties);
      };      

      Node.prototype.save = function () {
        return db.nodes.put(this);
      };

      Node.prototype.save = function () {
        return db.nodes.put(this);
      };

      Node.prototype.delete = function () {
        return db.nodes.delete(this.id);
      };

      return Node;
    },
    get: function () {
      return Node;
    }
  };

  return Node;
});

})();