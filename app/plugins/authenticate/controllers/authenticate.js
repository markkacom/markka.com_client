(function () {
'use strict';
var module = angular.module('fim.base');
module.controller('AuthenticatePlugin', function($scope, $routeParams, modals, $q, nxt, plugins, requests) {

  var FIMKRYPTO_ALIAS     = "FIMKAUTHACCOUNT";
  var FIMKRYPTO_RS        = null;
  var FIMKRYPTO_PUBLICKEY = null;
  
  $scope.challenger_id_rs = $routeParams.challenger_id_rs;
  $scope.identifier_id_rs = $routeParams.identifier_id_rs;
  $scope.challenger_name  = decodeURIComponent($routeParams.challenger_name);
  $scope.challenger_url   = decodeURIComponent($routeParams.challenger_url);
  $scope.challenge_text   = getChallengeText();
  var secretPhrase        = null;
  $scope.confirmed        = false;

  // $scope.lender = {}
  // $scope.lender.name = $routeParams.name;
  // $scope.lender.url = decodeURIComponent($routeParams.url);
  // $scope.confirmed = false;

  $scope.login = function () {
    getSecretPhrase().then(
      function (_secretPhrase) {
        secretPhrase = _secretPhrase;
        var id_rs = getAccountRS(secretPhrase);

        getAccountPersonalData(secretPhrase, $scope.identifier_id_rs).then(
          function (data_str) {

            $scope.$evalAsync(function () {
              $scope.decryptedJSON = data_str; 
            });

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

                  createChalengeResponse(secretPhrase).then(
                    function (challenge) {
                      $scope.$evalAsync(function () {
                        $scope.challenge_response = challenge;
                      });
                    }
                  ).catch(
                    function (error) {
                      console.log('Failed', error);
                    }
                  );
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
      message: "Are you sure you want to send this data?"
    }).then(
      function (confirmed) {
        if (confirmed) {
          var options = createHTTPArgs($scope.challenger_url, {
            challenge: $scope.challenge_response,
            decrypted: $scope.decryptedJSON
          });
          $scope.$evalAsync(function () {
            $scope.http_args = options;
          });          
          sendData(options).then(
            function (success) {
              console.log($scope.challenger_url, success);
            }
          );
        }
      }
    );
  }  

  function getSecretPhrase() {
    var deferred = $q.defer();
    modals.open('secretPhrase', {
      resolve: {
        items: function () {
          return {
            sender: $scope.identifier_id_rs
          }
        }
      },
      close: function (items) {
        deferred.resolve(items.secretPhrase);
      },
      cancel: function () {
        deferred.reject();
      }
    });
    return deferred.promise;
  }

  function getAccountRS(secretPhrase) {
    return nxt.fim().crypto.getAccountId(secretPhrase, true);
  }

  function parseFinnishJSON(str) {
    var parts = str.match(/{data:(.*),nonce:(.*)}/);
    return {
      data: parts[1],
      nonce: parts[2]
    }
  }

  function decryptAlias(secretPhrase, aliasURI) {
    var api = nxt.fim();
    var message = parseFinnishJSON(aliasURI);
    var privateKey = converters.hexStringToByteArray(api.crypto.getPrivateKey(secretPhrase));
    var publicKey = converters.hexStringToByteArray(FIMKRYPTO_PUBLICKEY);
    var data = converters.hexStringToByteArray(message.data);
    var nonce = converters.hexStringToByteArray(message.nonce);
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
    getAuthenticator().then(
      function () {
        api.getNamespacedAlias({
          account:    FIMKRYPTO_RS,
          aliasName:  'AUTHENTICATED:'+id_rs
        }).then(
          function (data) {
            $scope.$evalAsync(function () {
              $scope.encryptedJSON = data.aliasURI; 
            });
            deferred.resolve(decryptAlias(secretPhrase, data.aliasURI));
          }
        );
      },
      deferred.reject
    );
    return deferred.promise;
  }

  /**
   * The challenge text is taken from the return URL, it is the protocol and
   * hostname combined.
   * 
   * Eg. From URL http://bobsloans.com/auth.cgi we get the challenge text
   *     http://bobloans.com
   *
   * @return String
   **/
  function getChallengeText() {
    var obj = document.createElement('a');
    obj.href = $scope.challenger_url;
    if (!obj.href) 
      throw new Error('Could not parse URL');
    return obj.protocol+'//'+obj.hostname;
  }

  function createChalengeResponse(secretPhrase) {
    var deferred = $q.defer();
    var api = nxt.fim();
    var address = api.createAddress();
    if (!address.set($scope.identifier_id_rs)) {
      deferred.reject('Invalid identifier address');
      return;
    }
    api.crypto.getAccountPublicKey($scope.challenger_id_rs).then(
      function (publicKey) {
        $scope.$evalAsync(function () {
          $scope.challenger_publicKey = publicKey;
        });

        var challenge_text = getChallengeText();
        var options = {
          account: address.account_id(),
          publicKey: publicKey
        };
        var encrypted = api.crypto.encryptNote(challenge_text, options, secretPhrase);
        var json = JSON.stringify({ message: encrypted.message, nonce: encrypted.nonce });
        deferred.resolve(json);
      }
    ).catch(deferred.reject);
    return deferred.promise;
  }

  function sendData(http_args) {
    var deferred = $q.defer();
    modals.open('authSendProgress', {
      resolve: {
        items: function () {
          return {
            http_args: http_args
          };
        }
      },
      close: function (success) {

      }
    });
    return deferred.promise;
  }

  function createHTTPArgs(url, args) {
    var qs = "";
    for (var name in args) {
      qs += '&' + name + '=' + encodeURIComponent(args[name]);
    }
    return {
      method: 'POST',
      url: url,
      data: qs,
      headers: {'Content-Type': 'application/x-www-form-urlencoded'}
    }; 
  }

  function getAuthenticator() {
    var deferred = $q.defer();
    api.getAlias({ aliasName: FIMKRYPTO_ALIAS}, { priority: 5, podium: requests.mainStage }).then(
      function (data) {
        var account_rs = (data.aliasURI||'').toUpperCase();
        api.getAccountPublicKey({ account: account_rs }, { priority: 5, podium: requests.mainStage }).then(
          function (data) {
            FIMKRYPTO_RS        = account_rs;
            FIMKRYPTO_PUBLICKEY = data.publicKey;
            deferred.resolve();
          },
          deferred.reject
        );
      },
      deferred.reject
    );
    return deferred.promise;
  }

});
})();