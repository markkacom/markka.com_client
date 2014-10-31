(function () {
'use strict';
var module = angular.module('fim.base');
module.controller('AccountsPluginReceiveMoneyModalController', function(items, $modalInstance, $scope, $http, $timeout, modals, plugins) {

  var account = items.account;
  var api = items.api;
  $scope.items  = items;
  $scope.engine = api.type;
  $scope.symbol = api.engine.symbol;
  $scope.faucet_warning = '';

  function init() {

    if ($scope.engine == 'TYPE_NXT') {
      http(status.dgex).success(function (data) {
        setStatus('online', data && data.status == 'online');
      }).error(function () {
        setStatus('online', false);
      });
    }
    else {
      http(status.fimk).success(function (data) {
        setStatus('online', data && data.status == 'online');
      }).error(function () {
        setStatus('online', false);
      });
    }

    $scope.loading = true;
    $scope.message = 'Please wait';
    $scope.status  = 'Determining if public key was published';
    $scope.icon    = 'fa fa-cog fa-spin';

    /* Since because of blockchain reorg it is possible that a public key was unpublished
       we must always check the blockchain for public key information */
    api.getAccountPublicKey({account:account.id_rs}).then(
      function (data) {
        if ((data.publicKey||'').length > 0) {
          $timeout(function () {
            $scope.status = 'Public key is published';
            $scope.icon   = 'fa fa-check';

            /* The public key is in the blockchain - update the database with this info */
            account.update({
              isPublished: true,
              publicKey: data.publicKey
            }).then(
              function () {
                $timeout(function () {
                  $scope.loading = false;
                  $scope.isPublished = true;
                  $scope.address = account.id_rs;
                }, 1000);
              }
            );
          }, 1000);
        }
      },

      /* If there is no public key the response is {"errorCode":5,"errorDescription":"Unknown account"} */
      function (data) {
        if (data.errorCode == 5) {
          $timeout(function () {
            $scope.status = 'Public key was not published';
            $scope.icon   = 'fa fa-exclamation-triangle';

            /* The public key is not in the blockchain - update the database with this info */
            account.update({
              isPublished: false
            }).then(
              function () {
                $timeout(function () {
                  /* If the public key itself is in the database we're done, 
                     if not we require the secretphrase to calculate the public key 
                      and store it in the database */
                  if ((account.publicKey||'').length > 0) {
                    $scope.loading = false;
                    $scope.isPublished = false;
                    $scope.address = account.id_rs + ':' + account.publicKey;
                  }
                  else {
                    modals.open('secretPhrase', {
                      resolve: {
                        items: function () {
                          return { 
                            sender: account.id_rs,
                            message: 'This account has no published public key and we don\'t seem to have a copy of it either. '+
                                      'Please one-time provide the secret phrase for this account so we can calculate the public key for you.'
                          }
                        }
                      },
                      close: function (items) {
                        var publicKey = api.crypto.secretPhraseToPublicKey(items.secretPhrase);
                        account.update({ publicKey: publicKey }).then(
                          function () {
                            $timeout(function () {
                              $scope.loading = false;
                              $scope.isPublished = false;
                              $scope.address = account.id_rs + ':' + account.publicKey;
                            }, 1000);
                          }
                        );
                      },
                      cancel: function (error) {
                        $modalInstance.dismiss();
                      }
                    });
                  }
                }, 1000);
              }
            );
          }, 1000);
        }
        else {
          $scope.$evalAsync(function () {
            $scope.message = 'Unexpected Error';
            $scope.status  = 'Please close this dialog and try again.';
            $scope.icon    = 'fa fa-exclamation-triangle';
          })
        }
      }
    );
  }

  $scope.dismiss = function () {
    $modalInstance.dismiss();
  };

  function setStatus(key, status) {
    $timeout(function () {
      $scope[key] = status;
    }, 240);
  }

  function http(args) {
    var options = angular.extend({
      method: 'GET',
      dataType: 'json',
      headers: {'Content-Type': 'application/x-www-form-urlencoded'},
      timeout: 30 * 1000      
    }, args);
    return $http(options);
  }  

  var status = {
    dgex: { url: 'https://dgex.com/faucet.cgi?status' },
    fimk: { url: 'http://fimk.fi/faucet.cgi?status' }
  };

  var post = {
    dgex: function () {
      return { 
        url: 'https://dgex.com/faucet.cgi?' + 
              'email=' + encodeURIComponent($scope.items.email) + 
              '&account=' + encodeURIComponent(account.id_rs) +
              '&publickey=' +  encodeURIComponent(account.publicKey)
      };
    },
    fimk: function () {
      return { 
        url: 'http://fimk.fi/faucet.cgi?' +
              'email=' + encodeURIComponent($scope.items.email) + 
              '&account=' + encodeURIComponent(account.id_rs) +
              '&publickey=' +  encodeURIComponent(account.publicKey)
      };
    }
  };

  $scope.send = function () {
    var key = $scope.engine == 'TYPE_NXT' ? 'dgex' : 'fimk';
    http(post[key]()).success(
      function () {
        plugins.get('alerts').success({
          title: 'Faucet submission success',
          html: 'You have been emailed the confirmation link you must complete to activate the faucet transfer.<br>'+
                'After confirming the email it takes between 10 seconds and several minutes until you receive your transaction.'
        }).then(
          function () {
            $modalInstance.close(items);
          }
        );
      }
    ).error(
      function () {
        $scope.$evalAsync(function () {
          $scope.faucet_warning = 'Something went wrong.'
        });
      }
    );
  }  

  init();

});
})();