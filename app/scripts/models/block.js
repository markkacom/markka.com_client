(function () {
'use strict';
var module = angular.module('fim.base');
module.factory('Block', function() {
  var Block = null;
  return {
    initialize: function (db) {
      Block = db.blocks.defineClass({
        id: String,
        generator_rs: String,
        fee_nxt: String,
        height: Number
      });

      Block.prototype.save = function () {
        return db.blocks.put(this);
      };

      return Block;
    },
    get: function () {
      return Block;
    }
  };
});

})();