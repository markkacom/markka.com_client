(function () {
'use strict';

function isEmpty(s) {
  return !s || s.trim().length == 0;
}

var module = angular.module('fim.base');
module.controller('AccountsPlugin', function($state, $q, $rootScope, 
  $scope, modals, $stateParams, $location, nxt, $timeout, db, 
  $log, alerts, plugins, selectionService, requests, transactionService) {

  function isValid(api, id_rs) {
    var address = api.createAddress();
    if (address.set(id_rs)) {
      return true;
    }
    return false;
  }

  /* Address must be either a valid nxt or fim address */
  if (isValid(nxt.nxt(), $stateParams.id_rs)) {
    var api = nxt.nxt();
  }
  else if (isValid(nxt.fim(), $stateParams.id_rs)) {
    var api = nxt.fim();
  }
  else {
    $state.go('home', {}, {reload:true});
    return;
  }

  /* Requests podium */
  var podium                    = requests.theater.createPodium('accounts', $scope);

  $scope.accounts               = [];
  $scope.selectedAccount        = null;
  $scope.authenticated          = false;

  $scope.engine                 = null;
  $scope.symbol                 = '';
  $scope.feeCost                = '';
  $scope.blockTime              = 0;  
  $scope.publicKeyStatusUnknown = true;

  $scope.transactions           = [];

  /* See if the account is in the database */
  db.accounts.where('id_rs').equals($stateParams.id_rs).first().then(
    function (account) {
      $scope.$evalAsync(function () { asyncInit(account, $stateParams.id_rs);  });
    }
  ).catch(alerts.catch("Could not load accounts"));  

  function asyncInit(account, id_rs) {
    if (account) {
      init(account, true);
    }
    else {
      account = {
        id_rs: id_rs,
        update: function (args) {
          angular.extend(this, args);
        }
      };
      init(account, false);
    }
  }

  function init(selectedAccount, in_database) {
    $scope.selectedAccount = selectedAccount;

    /* Only install plugins for accounts that are in the database */
    if (in_database) {
      $scope.plugins = { create: [], open: [] };
      plugins.install('accounts', function (plugin) {

        /* Skip if unique to certain engine */
        if (plugin.supported && !plugin.supported($stateParams.id_rs)) {
          return;
        }

        /* Notify the plugin that it's being installed */
        if (plugin.oninstall) {
          plugin.oninstall(selectedAccount.id_rs);
        }

        if (plugin.create) {
          $scope.plugins.create.push(plugin);
        }
        else if (plugin.open) {
          $scope.plugins.open.push(plugin);
        }
      });
    }

    $scope.symbol     = api.engine.symbol;
    $scope.feeCost    = api.engine.feeCost;
    $scope.blockTime  = api.engine.blockTime; 

    $scope.refresh();
  }

  $scope.refresh = function () {
    var selected = $scope.selectedAccount;
    if (selected === null) {
      return;
    }

    /* Fetch unconfirmed transactions */
    transactionService.getUnconfirmedTransactions(selected.id_rs, api, podium, 10);

    /* Fetch transactions */
    transactionService.getNewestTransactions(selected.id_rs, api, podium, 10);

    /* Fetch account info */
    api.getAccount({ account: selected.id_rs }, { podium: podium, priority: 1 }).then(
      function (data) {
        $scope.$evalAsync(function () {
          $scope.publicKeyStatusUnknown = false;
          selected.update({
            guaranteedBalanceNXT: nxt.util.convertToNXT(data.guaranteedBalanceNQT),
            balanceNXT: nxt.util.convertToNXT(data.balanceNQT),
            effectiveBalanceNXT: nxt.util.commaFormat(String(data.effectiveBalanceNXT)),
            unconfirmedBalanceNXT: nxt.util.convertToNXT(data.unconfirmedBalanceNQT),
            forgedBalanceNXT: nxt.util.convertToNXT(data.forgedBalanceNQT),
            publicKey: data.publicKey,
            id: data.account,
            isPublished: !isEmpty(data.publicKey)
          });
        });
      },
      function (error) {

        /* Detects the Unknown Account error meaning no p*/
        if (error && error.errorCode == 5) {
          $scope.$evalAsync(function () {
            $scope.publicKeyStatusUnknown = false;
            $scope.errorCode = 5;
            selected.update({
              isPublished: false
            });
          });
        }
        else {
          alerts.failed((error && error.errorDescription)||error);
        }
      }
    );

    if (selected.id_rs.indexOf('FIM-') == 0) {
      api.getNamespacedAlias({
        account: 'FIM-M3YE-7Q2G-JEZS-HPHK4',
        aliasName: 'AUTHENTICATED:'+selected.id_rs,
      }, {
        podium: podium,
        priority: 2
      }).then(
        function (alias) {
          $scope.$evalAsync(function () {
            $scope.authenticated = true;
          });
        }
      ).catch(
        function (error) {
          $scope.$evalAsync(function () {
            $scope.authenticated = false;
          });
        }
      );
    }

  };

  /* handler for rendered transaction identifier onmouseover events */
  $scope.onTransactionIdentifierMouseOver = function (element) {
    var type  = element.getAttribute('data-type');
    var value = element.getAttribute('data-value');
    // console.log('onTransactionIdentifierMouseOver', {type:type,value:value});
    switch (type) {
      case api.renderer.TYPE.ACCOUNT: {
        break;
      }
    }    
    return false;
  }   

  /* handler for rendered transaction identifier onmouseover events */
  $scope.onTransactionIdentifierMouseLeave = function (element) {
    var type  = element.getAttribute('data-type');
    var value = element.getAttribute('data-value');
    // console.log('onTransactionIdentifierMouseLeave', {type:type,value:value});
    switch (type) {
      case api.renderer.TYPE.ACCOUNT: {
        break;
      }
    }    
    return false;
  }  

  $scope.showEditableID = function (rs_format) {
    if ($scope.selectedAccount) {
      plugins.get('alerts').prompt({
        title: 'Account address',
        value: (rs_format ? $scope.selectedAccount.id_rs : $scope.selectedAccount.id)
      });
    }
  };

  /* Show the add account modal dialog */
  $scope.addAccount = function () {
    var account = {};
    plugins.get('accounts').add(account).then(
      function (items) {
        console.log('accounts.addAccount', items);
        $state.go('accounts', {id_rs: items.id_rs});
      }
    );
  };  

  /* Show the remove account modal dialog */
  $scope.removeAccount = function (account) {
    plugins.get('alerts').confirm({
      title: 'Delete Account',
      message: 'Are you sure you want to delete this account?'
    }).then( 
      function (confirmed) {
        if (confirmed) {
          account.delete().then(
            function () {
              $state.go('accounts');
            }
          );
        }
      }
    );
  };

  $scope.showPublicKey = function () {
    if ($scope.selectedAccount) {
      plugins.get('alerts').info({
        title: 'Public Key',
        message: $scope.selectedAccount.publicKey
      });
    }
  };

  /* Show the edit account modal dialog */
  $scope.editAccount = function (account) {
    modals.open('accountsEdit', {
      resolve: {
        items: function () {
          return {
            name: account.name,
            id_rs: account.id_rs
          };
        }
      },
      close: function (items) {
        $timeout(function () {
          account.update(items);
        });        
      }
    });
  };

  $scope.sendMoney = function () {
    if ($scope.selectedAccount.isPublished === true) {
      modals.open('sendMoney', {
        resolve: {
          items: function () {
            return {
              senderRS: $scope.selectedAccount.id_rs
            };
          }
        }
      });
    }
    else {
      modals.open('sendMoneyNoPublicKey', {
        resolve: {
          items: function () {
            return {
              senderRS: $scope.selectedAccount.id_rs
            };
          }
        }
      });
    }
  }

  $scope.receiveMoney = function () {
    modals.open('receiveMoney', {
      resolve: {
        items: function () {
          return {
            account: $scope.selectedAccount,
            api: api
          };
        }
      }
    });
  }

  /**
   * The UI knows of the $scope.transactions only! It could hint at the transactions
   * downloader that it might need more transactions and the transactions downloader
   * will take care of that.
   * Since the UI observes the database it will know about the downloaded transactions
   */

  function find(array, id, value) {
    for(var i=0,l=array.length; i<l; i++) { if (array[i][id] == value) { return i; } }
    return -1;
  }

  function sorter(a,b) {
    var timestamp_a = a.timestamp||0;
    var timestamp_b = b.timestamp||0;
    if (timestamp_a > timestamp_b) {
      return -1;
    }
    else if (timestamp_a < timestamp_b) {
      return 1;
    }
    else {
      if (a.transaction < b.transaction) {
        return -1;
      }
      else if (a.transaction > b.transaction) {
        return 1;
      }
    }
    return 0;
  }

  function filter(array) {
    if ($scope.selectedAccount) {
      var id_rs = $scope.selectedAccount.id_rs
      return array.filter(
        function (t) { 
          return t.senderRS == id_rs || t.recipientRS == id_rs || 
                 t.related_rs_a == id_rs || t.related_rs_b == id_rs;
        });
    }
    return [];
  }

  var observer = null;
  $scope.$watch('selectedAccount', function (selectedAccount) {    
    $scope.transactions = [];
    if (!selectedAccount) return;

    /* Load transactions from database */
    var engine = nxt.get($scope.selectedAccount.id_rs).engine;
    engine.db.transactions.where('senderRS').equals($scope.selectedAccount.id_rs).
                              or('recipientRS').equals($scope.selectedAccount.id_rs).toArray().then(
      function (transactions) {
        $scope.$evalAsync(function () {
          transactions.sort(sorter);
          $scope.transactions = transactions;

          /* Tell all children the transactions array changed */
          $scope.$broadcast('transaction-length-changed');
        });
      }
    ).catch(alerts.catch("Could not load transactions from database"));

    /* Must use same observer */
    observer = observer || {
      create: function (transactions) {
        $scope.transactions = $scope.transactions.concat(filter(transactions));
        $scope.transactions.sort(sorter);
      },
      update: function (transactions) {
        angular.forEach(filter(transactions), function (t) {
          var index = find($scope.transactions, 'transaction', t.transaction);
          if (index != -1) {
            angular.extend($scope.transactions[index], t);
          }
        });
      },
      remove: function (transactions) {
        angular.forEach(filter(transactions), function (t) {
          var index = find($scope.transactions, 'transaction', t.transaction);
          if (index != -1) {
            $scope.transactions.splice(index, 1);
          }
        });
      },
      finally: function () { /* called from $timeout */

        /* Tell all children the transactions array changed */
        $scope.$broadcast('transaction-length-changed');
      }
    };

    /* Register transactions CRUD observer */
    engine.db.transactions.addObserver($scope, observer);
  });

});

})();