(function () {
'use strict';
var module = angular.module('fim.base');
module.controller('FaucetPluginController', function($scope, $rootScope, $timeout, plugins, nxt, $http) {

  $scope.items = {};
  $scope.items.email    = '';
  $scope.items.account  = '';
  $scope.items.sendButtonTxt = 'Send';
  $scope.items.type = '';
  $scope.items.success = '';
  $scope.items.error = '';

  $scope.dgex_online = false;
  $scope.fimk_online = false;

  $scope.selectAccount = function () {
    plugins.get('contacts').select({
      get_all: true
    }).then(
      function (account) {
        console.log('account', account);
        $('form[name=faucetForm] input[name=account]').val(account.id_rs).change();
        $('form[name=faucetForm] input[name=publickey]').val(account.publicKey).change();
      }
    );
  }

  $scope.localCreateAccount = function () {
    plugins.get('accounts').add({
      callback: function (items) {
        if (items) {
          $('form[name=faucetForm] input[name=account]').val(items.id_rs).change();
          $('form[name=faucetForm] input[name=publickey]').val(items.publicKey).change();
        }
      }
    });
  }

  $scope.accountChanged = function () {
    var id_rs         = $scope.items.account || '';
    var api           = nxt.get(id_rs);
    $scope.items.type = api ? api.type : '';
    if (!api) {
      $scope.faucetForm.account.$setValidity('required', false);
    }
    else {
      var address = api.createAddress();
      if (!address.set(id_rs)) {
        $scope.faucetForm.account.$setValidity('required', false);
      }
      else {
        $scope.faucetForm.account.$setValidity('required', true);
      }
      $timeout(function () {
        $scope.items.sendButtonTxt = api.type == nxt.TYPE_NXT ? 'Send to DGEX' : 'Send to Krypto Fin ry';
      });
    }
  }

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
              '&account=' + encodeURIComponent($scope.items.account) +
              '&publickey=' +  encodeURIComponent($scope.items.publicKey)
      };
    },
    fimk: function () {
      return { 
        url: 'http://fimk.fi/faucet.cgi?' +
              'email=' + encodeURIComponent($scope.items.email) + 
              '&account=' + encodeURIComponent($scope.items.account) +
              '&publickey=' +  encodeURIComponent($scope.items.publicKey)
      };
    }
  };

  http(status.dgex).success(
    function (data) {
      setStatus('dgex_online', data && data.status == 'online');
    }
  ).error(
    function () {
      setStatus('dgex_online', false);
    }
  );

  http(status.fimk).success(
    function (data) {
      setStatus('fimk_online', data && data.status == 'online');
    }
  ).error(
    function () {
      setStatus('fimk_online', false);
    }
  );

  $scope.send = function () {
    var key = $scope.items.type == nxt.TYPE_NXT ? 'dgex' : 'fimk';
    http(post[key]()).success(
      function () {
        $scope.$evalAsync(function () {
          $scope.sendSuccess = true;
          $scope.items.error = '';
          $scope.items.success = 'You have been emailed the confirmation link you must complete to activate the faucet transfer';
        });
      }
    ).error(
      function () {
        $scope.$evalAsync(function () {
          $scope.sendSuccess = false;
          $scope.items.error = 'Failed';
          $scope.items.success = '';
        });
      }
    );
  }
});
})();