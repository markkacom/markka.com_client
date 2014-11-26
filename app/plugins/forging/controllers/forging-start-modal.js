(function () {
'use strict';

var module = angular.module('fim.base');
module.run(function (settings) {
  settings.initialize([{
    id:     'forging.allowed.hosts',
    value:  ['http://127.0.0.1', 'http://localhost', 'http://0.0.0.0'],
    type:   Array,
    label:  'Allowed hosts',
    resolve: function (value) { /* XXX TODO see if resolve can be made optional */ }
  }]);
});

module.controller('ForgingPluginCreateModalController', function(items, $modalInstance, $scope, $timeout, nxt, settings, $q, plugins, db, requests) {

  /* Requests podium */
  var podium         = requests.theater.createPodium('forging', $scope);
  var PLUGIN         = plugins.get('forging');

  $scope.dialogName  = 'Forging';
  $scope.dialogTitle = $scope.dialogName;
  $scope.setTitle = function (text) {
    $timeout(function () {
      $scope.dialogTitle = $scope.dialogName + (text?(' | ' + text):'');
    });
  };

  $scope.items        = items;
  $scope.items.status = 'unknown';
  $scope.items.name   = '';

  var api             = nxt.get(items.senderRS);
  $scope.engine       = api.engine;
  $scope.alowedHosts  = settings.get('forging.allowed.hosts');
  $scope.items.host   = $scope.alowedHosts[0];

  $scope.dismiss = function () {
    $modalInstance.dismiss();
  };

  db.accounts.where('id_rs').equals($scope.items.senderRS).first(
    function (account) {
      if (account) {
        $scope.items.name = account.name;
      }
    }
  );

  function do_op(method) {
    var deferred = $q.defer();
    api[method]({
      sender: $scope.items.senderRS
    }, {
      node:$scope.localhost, 
      priority:5, 
      podium:podium
    }).then(
      function (_items) {
        console.log('success', _items);
        deferred.resolve(_items);

        /* Offer to store secretPhrase in wallet */
        if (plugins.get('wallet') && !plugins.get('wallet').hasKey($scope.items.senderRS)) {
          plugins.get('alerts').confirm({ message: 'Do you want to save this secretphrase to your wallet?'}).then(
            function (value) {
              if (value) {
                plugins.get('wallet').addEntry({
                  secretPhrase: _items.secretPhrase,
                  id_rs:        $scope.items.senderRS,
                  name:         $scope.items.name
                }).then(
                  function () {
                    plugins.get('alerts').success({ message: 'You successfully saved the secretphrase to your wallet'});
                  },
                  function () {
                    plugins.get('alerts').error({ message: 'Could not save secretphrase to wallet'});
                  }
                );
              }
            }
          );
        }
      },
      function (error) {
        console.log('failed', error);
        deferred.reject(error);
      }
    );
    return deferred.promise;
  }

  $scope.startForging = function () {
    do_op('startForging').then(
      function (items) {
        $scope.$evalAsync(function () {
          PLUGIN.setIsForging($scope.items.senderRS, true);
          $scope.items.status = 'Account is forging. Next block in ' + items.remaining +'/'+ items.deadline + ' seconds';
        });
      },
      function (error) {
        $scope.$evalAsync(function () {
          PLUGIN.setIsForging($scope.items.senderRS, false);
          $scope.items.status = error.errorDescription || JSON.stringify(error);
        });
      }
    );
  }; 

  $scope.stopForging = function () {
    do_op('stopForging').then(
      function (items) {
        $scope.$evalAsync(function () {
          PLUGIN.setIsForging($scope.items.senderRS, false);
          $scope.items.status = 'Stopped forging';
        });
      },
      function (error) {
        $scope.$evalAsync(function () {
          PLUGIN.setIsForging($scope.items.senderRS, false);
          $scope.items.status = error.errorDescription || JSON.stringify(error);
        });
      }
    );
  };

  function getForging() {
    do_op('getForging').then(
      function (items) {
        $scope.$evalAsync(function () {
          if (items.remaining && items.deadline) {
            PLUGIN.setIsForging($scope.items.senderRS, true);
            $scope.items.status = 'Account is forging. Next block in ' + items.remaining +'/'+ items.deadline + ' seconds';
          }
          else {
            PLUGIN.setIsForging($scope.items.senderRS, false);
            $scope.items.status = 'Stopped forging';
          }
        });
      },
      function (error) {
        $scope.$evalAsync(function () {
          PLUGIN.setIsForging($scope.items.senderRS, false);
          $scope.items.status = error.errorDescription || JSON.stringify(error);
        });
      }
    );
  };

  api.engine.blockchainDownload().then(
    function (is_complete) { 
      if (is_complete) {
        api.engine.getLocalHostNode().then(
          function (node) {
            $scope.$evalAsync(function () {
              $scope.localhost = node;
              if (plugins.get('wallet') && plugins.get('wallet').hasKey($scope.items.senderRS)) {
                getForging();
              }
            });
          }
        );
      }
      else {
        plugins.get('alerts').info({
          title: 'Forging not allowed',
          message: 'You have to wait for the blockchain to fully download'
        }).then(
          function () {
            $modalInstance.dismiss();
          }
        );
      }
    }
  );

});
})();