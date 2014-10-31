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

module.controller('ForgingPluginCreateModalController', function(items, $modalInstance, $scope, $timeout, nxt, settings, $q, plugins, db) {

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

  function status(msg) {
    $timeout(function () {
      $scope.items.status = msg;
    });    
  }

  function do_op(method) {
    var deferred = $q.defer();
    $scope.engine.getNode($scope.items.host).then(
      function (node) {
        api[method]({sender: $scope.items.senderRS}, node).then(
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
      }
    );
    return deferred.promise;
  }

  $scope.startForging = function () {
    do_op('startForging').then(
      function (items) {
        status('Started forging | deadline=' + items.deadline + ' seconds');
      },
      function (error) {
        status(JSON.stringify(error));
      }
    );
  };

  $scope.stopForging = function () {
    do_op('stopForging').then(
      function (items) {
        status('Stopped forging');
      },
      function (error) {
        status(JSON.stringify(error));
      }
    );
  };

  // $scope.getForging = function () {
  //   do_op('getForging').then(
  //     function (items) {

  //     },
  //     function (error) {
  //       status(JSON.stringify(error));
  //     }
  //   );
  // };
});
})();