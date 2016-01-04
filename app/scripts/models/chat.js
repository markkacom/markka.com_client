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
module.factory('ChatModel', function() {
  var ChatModel = null;
  return {
    initialize: function (db) {
      ChatModel = db.chats.defineClass({
        id: Number,             /* auto id */
        accountRS: String,      /* currentAccount.id_rs */
        otherRS: String,        /* contact id */
        timestamp: Number,      /* last message */
        publicKey: String,      /* contact publicKey */
        name: String,           /* contact name */

        timestamp2: Number      /* timestamp of last blockchain message timestamp */
      });

      ChatModel.prototype.save = function () {
        /* do not save any field to the db, only those fields defined on the class */
        var update = { id: this.id };
        if (this.accountRS)   update.accountRS  = this.accountRS;
        if (this.otherRS)     update.otherRS    = this.otherRS;
        if (this.timestamp)   update.timestamp  = this.timestamp;
        if (this.publicKey)   update.publicKey  = this.publicKey;
        if (this.name)        update.name       = this.name;
        if (this.timestamp2)  update.timestamp2 = this.timestamp2;

        return db.chats.put(update);
      };

      ChatModel.prototype.delete = function () {
        return db.chats.delete(this.id);
      };

      ChatModel.prototype.update = function (properties) {
        angular.extend(this, properties);
        var update = {};
        if (properties.accountRS)   update.accountRS  = properties.accountRS;
        if (properties.otherRS)     update.otherRS    = properties.otherRS;
        if (properties.timestamp)   update.timestamp  = properties.timestamp;
        if (properties.publicKey)   update.publicKey  = properties.publicKey;
        if (properties.name)        update.name       = properties.name;
        if (properties.timestamp2)  update.timestamp2 = properties.timestamp2;
        return db.chats.update(this.id, update);
      };

      return ChatModel;
    },
    get: function () {
      return ChatModel;
    }
  };
});

})();