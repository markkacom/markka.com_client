(function () {
'use strict';
var module = angular.module('fim.base');
module.factory('MasspayPluginPayment', function () {
  var MasspayPluginPayment = null;
  return {
    initialize: function (db) {
      MasspayPluginPayment = db.masspay_payments.defineClass({
        index: Number,
        senderRS: String,
        recipientRS: String,
        amountNQT: String,
        feeNQT: String,
        deadline: Number,
        message: String,
        messageIsPublic: Boolean,
        transactionBytes: String,
        transactionResult: String,
        transactionSuccess: Boolean,
        broadcastResult: String,
        broadcastSuccess: Boolean,
        created: Boolean,
        broadcasted: Boolean,
        blockchainStatus: String
      });

      MasspayPluginPayment.prototype.update = function (properties) {
        angular.extend(this, properties);
        return db.masspay_payments.update(this.id, properties);
      };      

      MasspayPluginPayment.prototype.save = function () {
        return db.masspay_payments.put(this);
      };

      MasspayPluginPayment.prototype.delete = function () {
        return db.masspay_payments.delete(this.id);
      };

      return MasspayPluginPayment;
    },
    get: function () {
      return MasspayPluginPayment;
    }
  };

  return MasspayPluginPayment;
});

})();