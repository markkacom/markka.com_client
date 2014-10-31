(function () {
'use strict';
var module = angular.module('fim.base');
module.factory('Contact', function() {
  var Contact = null;
  return {
    initialize: function (db) {
      Contact = db.contacts.defineClass({
        id_rs: String,
        name: String,
        email: String,
        website: String,
        publicKey: String
      });

      Contact.prototype.update = function (properties) {
        angular.extend(this, properties);
        return db.contacts.update(this.id_rs, properties);
      };      

      Contact.prototype.save = function () {
        return db.contacts.put(this);
      };

      Contact.prototype.save = function () {
        return db.contacts.put(this);
      };

      return Contact;
    },
    get: function () {
      return Contact;
    }
  };

  return Contact;
});

})();