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
        localTimestamp: Number,   // Timestamp received/send in local time

        /* indicates the message was received or not */
        received: Boolean
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