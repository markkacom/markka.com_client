(function () {
'use strict';
var module = angular.module('fim.base');
module.factory('CartModel', function() {
  var CartModel = null;
  return {
    initialize: function (db) {
      CartModel = db.cart.defineClass({
        id:    String,
        count: Number,
        goods: String
      });

      CartModel.prototype.save = function () {
        return db.cart.put(this);
      };

      CartModel.prototype.delete = function () {
        return db.cart.delete(this.id);
      };

      CartModel.prototype.update = function (properties) {
        angular.extend(this, properties);
        return db.cart.update(this.id, properties);
      };

      return CartModel;
    },
    get: function () {
      return CartModel;
    }
  };
});

})();