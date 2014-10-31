(function () {
'use strict';

function isEmpty(s) {
  return !s || s.trim().length == 0;
}

var module = angular.module('fim.base');
module.controller('AccountsPlugin', function($state, $q, $rootScope, 
  $scope, modals, $stateParams, $location, nxt, $timeout, db, 
  $log, alerts, plugins, selectionService) {

  /* Install accounts section plugins */
  $scope.plugins         = { create: [], open: [] };
  plugins.install('accounts', function (plugin) {

    /* Skip if unique to certain engine */
    if (plugin.supported && !plugin.supported($stateParams.id_rs)) {
      return;
    }

    if (plugin.create) {
      $scope.plugins.create.push(plugin);
    }
    else if (plugin.open) {
      $scope.plugins.open.push(plugin);
    }
  });

  $scope.accounts               = [];
  $scope.selectedAccount        = null;

  $scope.engine                 = null;
  $scope.symbol                 = '';
  $scope.feeCost                = '';
  $scope.blockTime              = 0;  
  $scope.publicKeyStatusUnknown = true;

  $scope.transactions           = [];  

  /* Poll for new transactions every 10 seconds */
  var interval = setInterval(function interval() { 
    $scope.refresh() 
  }, 10 * 1000);

  /* Cleanup when scope is destroyed */
  $scope.$on("$destroy", function() { 
    clearInterval(interval);

    /* Stop the backfill transaction downloader for this account */
    if ($scope.selectedAccount) {
      nxt.get($scope.selectedAccount.id_rs).stopDownloadingTransactions($scope.selectedAccount);
    }
  });

  /* Load accounts from database */
  db.accounts.orderBy('name').toArray().then(
    function (accounts) {
      $timeout(function () { 
        $scope.accounts = accounts;
        fixlocation();
      });
    }
  ).catch(alerts.catch("Could not load accounts"));  

  /* Register CRUD observer for accounts */
  db.accounts.addObserver($scope, 
    db.createObserver($scope, 'accounts', 'id_rs', {
      finally: function () {
        fixlocation(); /* if the selectedAccount is removed from the db this triggers a page reload */
      }
    })
  );

  if ($stateParams.action == 'show') {
    var selected = $scope.selectedAccount = {
      id_rs: $stateParams.id_rs,
      update: function (args) {
        angular.extend(this, args);
      }
    };
    $scope.symbol     = nxt.get(selected.id_rs).engine.symbol;
    $scope.feeCost    = nxt.get(selected.id_rs).engine.feeCost;
    $scope.blockTime  = nxt.get(selected.id_rs).engine.blockTime; 
    $timeout(function () {
      $scope.refresh();  
    });
  }

  /* Always get as much initial data from db on startup */
  if ($stateParams.id_rs) {
    db.accounts.where('id_rs').equals($stateParams.id_rs).first().then(
      function (account) {
        if (account) {
          $timeout(function() {
            $scope.selectedAccount = account;         
          });
        }
      }
    )
  } 

  /* handler for rendered transaction identifier onmouseover events */
  $scope.onTransactionIdentifierMouseOver = function (element) {
    var type  = element.getAttribute('data-type');
    var value = element.getAttribute('data-value');
    var api   = nxt.get($scope.selectedAccount.id_rs);
    console.log('onTransactionIdentifierMouseOver', {type:type,value:value});
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
    var api   = nxt.get($scope.selectedAccount.id_rs);
    console.log('onTransactionIdentifierMouseLeave', {type:type,value:value});
    switch (type) {
      case api.renderer.TYPE.ACCOUNT: {
        break;
      }
    }    
    return false;
  } 


  /* Called once the database returned the accounts - selects account based on URI or fixes URI */
  function fixlocation() {
    if ($stateParams.action != 'show') {
      /* URL contains account ID - make that account the selected account */
      var selected = $scope.accounts[UTILS.findFirstPropIndex($scope.accounts, $stateParams, 'id_rs', 'id_rs')];
      if (selected) {
        var changed       = (selected !== $scope.selectedAccount);
        $scope.selectedAccount = selected;
    
        var api           = nxt.get(selected.id_rs);
        $scope.engine     = api.type;
        $scope.symbol     = api.engine.symbol;
        $scope.feeCost    = api.engine.feeCost;
        $scope.blockTime  = api.engine.blockTime; 

        $scope.refresh();
      }
      /* URL is empty forward to /#/accounts/ */
      else if (!$stateParams.id_rs || $stateParams.id_rs.trim().length == 0) {
        if ($scope.accounts.length > 0) {
          $state.go('accounts', {id_rs: $scope.accounts[0].id_rs});
        }      
      }
      /* URL is not empty but that account is not in the database - go to first known good account */
      else if ($scope.accounts.length > 0) {
        $state.go('accounts', {id_rs: $scope.accounts[0].id_rs});
      }
      else {
        $state.go('accounts');
      }
    }
  };  

  /* Used as update interval and when selectedAccount changes - 
     updates the database with info from the server

     All HTTP requests started within this method must be cancelled when the method
     is called again. 
   */
  $scope.refresh = function () {
    var selected = $scope.selectedAccount;
    if (selected === null) {
      return;
    }

    /* Start the downloader if it's not yet running */
    var downloader = nxt.get(selected.id_rs).downloadTransactions(selected);

    /* Look for unconfirmed transactions */ 
    downloader.getUnconfirmedTransactions();

    /* Fetch account info */
    nxt.get(selected.id_rs).getAccount({ account: selected.id_rs }).then(
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
  };

  /* account select ng-change */
  $scope.updateSelection = function () {
    $state.go('accounts', {id_rs: $scope.selectedAccount.id_rs});
  }

  /* Find an account by id_rs */
  $scope.findAccount = function (id_rs) {
    return UTILS.findFirst($scope.accounts, function (account) {
      return account.id_rs === id_rs;
    });
  };

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
            api: nxt.get($scope.selectedAccount.id_rs)
          };
        }
      }
    });    
  }

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
        $timeout(function () {
          transactions.sort(sorter);
          $scope.transactions = transactions;

          /* Tell all children the transactions array changed */
          $scope.$broadcast('transaction-length-changed');

          // $scope.tableParams.total(transactions.length);
          // $scope.tableParams.reload(); 
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

        // $scope.tableParams.total($scope.transactions.length);
        // $scope.tableParams.reload(); 
      }
    };

    /* Register transactions CRUD observer */
    engine.db.transactions.addObserver($scope, observer);
  });


});

})();