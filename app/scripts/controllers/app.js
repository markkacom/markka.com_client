(function () {
'use strict';

var uriParser = null;
var module = angular.module('fim.base');

module.controller('appController', function($rootScope, $scope, $modal, $q, $log,  
  $timeout, modals, $window, plugins, alerts, serverService, db, settings, $state, nxt) {

  /* Install app plugins | these all get a menu entry */
  $scope.plugins = [];
  plugins.install('app', function (plugin) {
    console.log('install-app-plugin', plugin)
    $scope.plugins.push(plugin);
  });

  /* Install system plugins | shown at the bottom of each page OR ANYWHERE by making them position:absolute */
  $scope.systemPlugins = [];
  plugins.install('system', function (plugin) {
    console.log('install-system-plugin', plugin)
    $scope.systemPlugins.push(plugin);
  });

  $scope.alerts   = [];
  $scope.isNodeJS = isNodeJS;

  $rootScope.$on('$stateChangeError', function(event, toState, toParams, fromState, fromParams, error){
    $log.warn('STATE CHANGE ERROR');
    $log.error(event);
  });

  $scope.createAccount = function () {
    var account = {};
    plugins.get('accounts').add(account).then(
      function (items) {
        $state.go('accounts', {id_rs: items.id_rs});
      }
    );
  }

  $scope.stateIncludes = function (sref) {
    try { 
      return $state.includes(sref) 
    } 
    catch (e) { 
      return false 
    }
  }

  $rootScope.alert = {
    failed: function (msg) {
      var id = UTILS.uniqueID();
      var data = { type: 'danger', msg: msg, id:id };      
      $scope.alerts.push(data);
      $timeout(function () { $rootScope.closeAlert(id); }, 5000);
    },
    success: function (msg) {
      var id = UTILS.uniqueID();
      var data = { type: 'success', msg: msg, id:id };      
      $scope.alerts.push(data);
      $timeout(function () { $rootScope.closeAlert(id); }, 5000);
    }
  };

  $rootScope.closeAlert = function(id) {
    UTILS.removeFirst($scope.alerts, function (data) { 
      return data.id == id 
    });
  };

  /* handler for rendered transaction identifier onclick events */
  $scope.onTransactionIdentifierClick = function (element) {
    var type   = element.getAttribute('data-type');
    var value  = element.getAttribute('data-value');
    if (element.getAttribute('data-engine')) {
      var api  = nxt.get(element.getAttribute('data-engine'));
    }
    else if (type == 'ACCOUNT') {
      var api  = nxt.get(value);
    }
    // console.log('onTransactionIdentifierClick', {type:type,value:value});
    switch (type) {
      case api.renderer.TYPE.ACCOUNT: {
        var deferred  = plugins.get('alerts').wait({ message: 'Downloading Account Data' });
        var canceller = $q.defer();

        /* Clicking Cancel in the dialog cause reject and thus catch to be called */
        deferred.promise.catch(
          function () {
            canceller.resolve();
          }
        );

        api.getAccount({account:value}, null, canceller).then(
          function (account) {

            /* Close the Wait modal */
            deferred.resolve();

            var inspector = plugins.get('inspector');
            inspector.inspect({
              title: 'Account Details',
              object: account,
              order: 'accountRS,balanceNQT,effectiveBalanceNXT,unconfirmedBalanceNQT,forgedBalanceNQT,garanteedBalanceNQT',
              translator: inspector.createAccountTranslator(api, account)
            });
          },
          function (error) {
            alerts.failed('Could not download account');
            deferred.resolve();
          }
        );
        break;
      }
      case api.renderer.TYPE.JSON: {
        try {
          var transaction = JSON.parse(decodeURIComponent(value));
        } catch (e) {
          var input = decodeURIComponent(value||'');
          console.log('plugin: accounts JSON error',input);
          var transaction = { error: e, input: input};
        }
        var inspector = plugins.get('inspector');
        inspector.inspect({
          title: 'Transaction Details',
          object: transaction,
          order: 'timestamp,senderRS,recipientRS,amountNQT,attachment,type,feeNQT',
          translator: inspector.createTransactionTranslator(api, transaction)
        });
        break;
      }
      case api.renderer.TYPE.ASSET_ID: {
        var asset = api.assets.get(decodeURIComponent(value));
        var inspector = plugins.get('inspector');
        inspector.inspect({
          title: 'Asset Details',
          object: asset,
          order: 'name,asset,numberOfTrades,description,quantityQNT,decimals,accountRS',
          translator: inspector.createAssetTranslator(api, asset)
        });
        break;
      }
    }    
    return false;
  }

  /* This serves as a catch all. More detailed can be achieved by reimplementing this method
     on some more local scope (like accounts-messages.js) */
  $scope.onMessageUnlockClick = function (element) {
    var recipient_id_rs = element.getAttribute('data-recipient');
    var sender_id_rs = element.getAttribute('data-sender');
    modals.open('selectDecryptionAccount', {
      resolve: {
        items: function () {
          return { 
            recipientRS: recipient_id_rs,
            senderRS: sender_id_rs
          }
        }
      },
      close: function () {
        $state.go($state.current, {}, {reload: true});
      }
    });
  }

});

})();
