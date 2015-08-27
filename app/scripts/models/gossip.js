(function () {
'use strict';
var module = angular.module('fim.base');
module.factory('GossipModel', function() {
  var GossipModel = null;
  return {
    initialize: function (db) {
      GossipModel = db.gossips.defineClass({

        /* as it says */
        primaryKey: Number,

        /* properties coming from the server */
        id: String,               // Long.toUnsignedString(id)
        senderPublicKey: String,  // Convert.toHexString(senderPublicKey)
        recipient: String,        // Long.toUnsignedString(recipient)        
        message: String,          // Convert.toHexString(message)
        topic: String,            // Long.toUnsignedString(topic)
        timestamp: Number,        // int
        signature: String,        // Convert.toHexString(signature)
        senderRS: String,

        /* properties calculated and added client side */
        recipientRS: String,
        chatId: Number,           // ID of the db chat object
        localTimestamp: Number    // Timestamp received/send in local time
      });

      GossipModel.prototype.save = function () {
        return db.gossips.put(this);
      };

      GossipModel.prototype.delete = function () {
        return db.gossips.delete(this.primaryKey);
      };

      GossipModel.prototype.update = function (properties) {
        angular.extend(this, properties);
        return db.gossips.update(this.primaryKey, properties);
      };

      return GossipModel;
    },
    get: function () {
      return GossipModel;
    }
  };
});

})();