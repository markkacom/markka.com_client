(function() {
  'use strict';
  var module = angular.module('fim.base');
  module.factory('DecryptedMessageProvider', function(nxt, $q, IndexedEntityProvider) {

    function DecryptedMessageProvider(api, $scope, decryptedData, decryptedNonce, account) {
      this.init(api, $scope, decryptedData, decryptedNonce, account);
      this.account = account;
      this.decryptedData = decryptedData;
      this.decryptedNonce = decryptedNonce;
    }
    angular.extend(DecryptedMessageProvider.prototype, IndexedEntityProvider.prototype, {

      uniqueKey: function(good) {
        return good.decryptedMessage;
      },
      sortFunction: function(a, b) {
        return a.index - b.index;
      },

      getData: function() {
        var deferred = $q.defer();
        var args = {
          includeCounts: true,
          requestType: 'decryptFrom',
          account: this.account,
          data: this.decryptedData,
          nonce: this.decryptedNonce
          // secretPhrase: "I won't tell you"
        }
        this.api.engine.socket().callAPIFunction(args).then(deferred.resolve, deferred.reject);
        return deferred.promise;
      },

      dataIterator: function(data) {
        var goods = data;
        var index = this.entities.length > 0 ? this.entities[this.entities.length - 1].index : 0;
        for (var i = 0; i < goods.length; i++) {
          var a = goods[i];
        }
        return new Iterator([goods]);
      }
    });
    return DecryptedMessageProvider;
  });
})();