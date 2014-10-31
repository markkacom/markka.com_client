(function () {
'use strict';
var module = angular.module('fim.base');
module.controller('MasspayPluginController', function($scope, $rootScope, $timeout, plugins, nxt, $http, ngTableParams, $sce, modals, $q) {
  var PLUGIN = plugins.get('masspay');

  $scope.items            = {};
  $scope.items.csv        = '';
  $scope.items.file       = '';

  $scope.payments         = [];
  $scope.cumulativeNQT    = '0';

  $scope.selectedAccount  = null;
  var api                 = null;
  var secretPhrase        = null;

  $scope.tableParams = new ngTableParams({page: 1,count: 10 },{
    total: 0,
    getData: function($defer, params) {
      $defer.resolve($scope.payments.slice((params.page() - 1) * params.count(), params.page() * params.count()));
    }
  });

  function registerListener() {
    PLUGIN.createOnWalletFileSelectedPromise().then(
      function (items) {
        $timeout(function () {
          $scope.items.csv = items.content;
          $scope.items.file = items.file.name;
          $scope.load();
          registerListener();
        });
      }
    );
  }

  registerListener();

  $scope.selectAccount = function () {
    plugins.get('contacts').select({
      get_all: true
    }).then(
      function (account) {
        $timeout(function () {
          $scope.selectedAccount = account;
          api = nxt.get(account.id_rs);
        })
      }
    );
  }

  $scope.saveAs = function () {
    PLUGIN.save($scope.items.csv);
  }

  $scope.load = function () {
    $timeout(function () {
      $scope.payments = [];
      $scope.cumulativeNQT = '0';
      var lines = $scope.items.csv.split('\n');
      angular.forEach(lines, function (line) {
        var columns      = (line||'').trim().split(',');
        if (columns.length == 2) {
          var column_0   = columns[0].trim();
          var column_1   = columns[1].trim();
        }
        else if (columns.length == 3) {
          var column_0   = columns[0].trim();
          var column_1   = columns[1].trim();
          var column_2   = columns[2].trim();
        }
        else {
          return;
        }

        var amountNQT        = nxt.util.convertToNQT(column_1);
        $scope.cumulativeNQT = nxt.util.safeAdd($scope.cumulativeNQT, amountNQT);

        $scope.payments.push({
          recipientRS:    column_0,
          amountNQT:      amountNQT,
          amountNXT:      nxt.util.convertToNXT(amountNQT),
          unique_id:      column_2,
          cumulativeNXT:  nxt.util.convertToNXT($scope.cumulativeNQT),
          status:         'pending'
        });
      });
      $scope.tableParams.total($scope.payments.length);
      $scope.tableParams.reload();
    });
  }

  function getSecretPhrase(id_rs) {
    var deferred = $q.defer();
    if (!plugins.get('wallet').hasKey(id_rs) || !plugins.get('wallet').getEntry(id_rs).secretPhrase) {
      modals.open('secretPhrase', {
        resolve: {
          items: function () {
            return { 
              sender: id_rs
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
    }
    else {
      deferred.response(plugins.get('wallet').getEntry(id_rs).secretPhrase);
    }
    return deferred.promise;
  }

  function ensurePublicKey(account, secretPhrase) {
    var deferred = $q.defer();
    if (account.publicKey) {
      deferred.resolve(account.publicKey);
    }
    else {
      var publicKey = api.crypto.secretPhraseToPublicKey(secretPhrase);
      account.update({publicKey: publicKey}).then(
        function () {
          deferred.resolve(publicKey);
        }
      );
    }
    return deferred.promise;
  }

  $scope.execute = function () {
    var symbol = 100;
    var html = '<strong>Are you sure you want to execute this mass payment?</strong>';
    html += '<br>A total of <strong>'+nxt.util.convertToNXT($scope.cumulativeNQT)+' '+api.engine.symbol+'</strong> will be paid in <strong>'+$scope.payments.length+'</strong> transactions';

    plugins.get('alerts').confirm({ title: 'Mass Pay Plugin', html: $sce.trustAsHtml(html) }).then(
      function (confirmed) {
        if (confirmed) {
          getSecretPhrase($scope.selectedAccount.id_rs).then(
            function (_secretPhrase) {

              /* We require the public key - save it to the db just in case */
              ensurePublicKey($scope.selectedAccount, _secretPhrase).then(
                function () {
                  secretPhrase = _secretPhrase;
                  var iterator = new Iterator($scope.payments);
                  if (iterator.hasMore()) {
                    next(iterator);
                  }
                }
              );
            }
          );
        }
      }
    )
  }

  /* Always keep the status scrolled to the bottom */
  $("#masspay-status").change(function() {
    $('#masspay-status').scrollTop($('#masspay-status')[0].scrollHeight);
  });  

  var _status = [];
  function pushStatus(msg) {
    _status.push(msg);
    $('#masspay-status').val(_status.join('\n')).change();
  }

  function next(iterator) {
    var payment     = iterator.next();
    var recipientPublicKey = null;
    var recipientRS = payment.recipientRS;
    if (recipientRS.indexOf(':') != -1) {
      recipientRS = payment.recipientRS.split(':')[0];
      recipientPublicKey = payment.recipientRS.split(':')[1];
    }

    var address = api.createAddress();
    if (!address.set(recipientRS)) {
      pushStatus('Illegal address '+payment.recipientRS);
      return false;
    }

    var recipient = address.account_id();
    var args = {
      sender:       $scope.selectedAccount.id_rs,
      publicKey:    $scope.selectedAccount.publicKey,
      secretPhrase: secretPhrase,
      amountNQT:    payment.amountNQT,
      feeNQT:       nxt.util.convertToNQT(String(api.engine.feeCost)),
      deadline:     '1440',
      engine:       api.type,
      recipient:    recipient,
    };

    if (recipientPublicKey) {
      args.recipientPublicKey = recipientPublicKey;
    }

    if (payment.unique_id) {
      args.message = payment.unique_id;
      args.public_message = true;
    }

    api.sendMoney(args).then(
      function () {
        pushStatus('Success payment of '+nxt.util.convertToNXT(payment.amountNQT)+' '+api.engine.symbol+' to '+recipient);
        $timeout(function () {
          payment.status = 'success';
        });
        if (iterator.hasMore()) {
          next(iterator);
        }
      },
      function () {
        pushStatus('Failed payment of '+nxt.util.convertToNXT(payment.amountNQT)+' '+api.engine.symbol+' to '+recipient);
        $timeout(function () {
          payment.status = 'failed';
        });        
      }
    );
  }
});
})();