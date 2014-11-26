(function () {
'use strict';
var module = angular.module('fim.base');
module.controller('AuthenticatePlugin', function($scope, $stateParams, modals, $q, nxt, plugins) {

  var FIMKRYPTO_RS = 'FIM-PDKH-PS4C-TBCV-9ZQHG';
  var FIMKRYPTO_PUBLICKEY = 'f2b53a29cc4ed80878546500ec7d167cd3686e61b7160a049ee3fdf68a435f44';
  $scope.lender = {}
  $scope.lender.name = $stateParams.name;
  $scope.lender.url = decodeURIComponent($stateParams.url);
  $scope.confirmed = false;

  function getSecretPhrase() {
    var deferred = $q.defer();
    modals.open('secretPhrase', {
      resolve: {
        items: function () {
          return {
            sender: $stateParams.id_rs
          }
        }
      },
      close: function (items) {
        deferred.resolve(items.secretPhrase);
      },
      cancel: function (error) {
        deferred.reject();
      }
    });
    return deferred.promise;
  }

  function getAccountRS(secretPhrase) {
    return nxt.fim().crypto.getAccountId(secretPhrase, true);
  }

  function decryptAlias(secretPhrase, aliasURI) {
    var api = nxt.fim();
    var privateKey = converters.hexStringToByteArray(api.crypto.getPrivateKey(secretPhrase));
    var publicKey = converters.hexStringToByteArray(FIMKRYPTO_PUBLICKEY);
    var data = converters.hexStringToByteArray(aliasURI);
    return api.crypto.decryptData(data, { 
      privateKey: privateKey,
      publicKey:  publicKey,
      nonce:      nonce
    });
  }

  /**
   * Reads and decrypts the personal data as JSON from the association 
   * namespaced alias.
   */
  function getAccountPersonalData(secretPhrase, id_rs) {
    var deferred = $q.defer();
    nxt.fim().getNamespacedAlias({
      account:    FIMKRYPTO_RS,
      aliasName:  'AUTHENTICATED:'+id_rs
    }).then(
      function (data) {
        deferred.resolve(decryptAlias(secretPhrase, data.aliasURI))
      }
    );
    return deferred.promise;
  }

  $scope.login = function () {
    getSecretPhrase().then(
      function (secretPhrase) {
        var id_rs = getAccountRS(secretPhrase);

        getAccountPersonalData(secretPhrase, id_rs).then(
          function (data_str) {

            /* Confirm this is the correct account */
            plugins.get('alerts').confirm({
              title: 'Confirm this is your account',
              message: data_str
            }).then(
              function (confirmed) {
                if (confirmed) {
                  $scope.$evalAsync(function () {
                    $scope.confirmed = true;
                  });
                }
              }
            );
          }
        );
      }
    );
  }

  $scope.send = function () {
    plugins.get('alerts').confirm({
      title: 'Are you sure',
      message: "Are you sure you want to do this?"
    }).then(
      function (confirmed) {
        if (confirmed) {

          

        }
      }
    );
  }

});
})();