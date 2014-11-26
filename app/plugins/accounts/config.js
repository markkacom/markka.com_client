(function () {
'use strict';
var module = angular.module('fim.base');
module.config(function($stateProvider) {  
  $stateProvider.state('accounts', {
    url: '/accounts/:id_rs/:action',
    views: {
      '': { 
        templateUrl: 'plugins/accounts/partials/accounts.html',
        controller: 'AccountsPlugin'
      },
      'transactions@accounts': {
        templateUrl: 'plugins/accounts/partials/accounts-transactions.html',
        controller: 'AccountsPluginTransactionsController'
      },
      'messages@accounts': {
        templateUrl: 'plugins/accounts/partials/accounts-messages.html',
        controller: 'AccountsPluginMessagesController'
      },      
      'namespacedAliases@accounts': {
        templateUrl: 'plugins/accounts/partials/accounts-namespaced-aliases.html',
        controller: 'AccountsPluginNamespacedAliasesController'
      } 
    }
  });
});

module.run(function (modals, plugins, nxt, alerts, $q, db, $timeout, $sce, $state) {

  function loadAccounts() {
    var deferred = $q.defer();
    var sub = [];
    db.accounts.orderBy('name').toArray().then(
      function (accounts) {
        angular.forEach(accounts, function (account) {
          if (account) {
            var symbol  = nxt.get(account.engine).engine.symbol;
            var balance = account.balanceNXT + ' ' + symbol;
            var content = '<p><h4 disable-nw-menu="true">'+account.name+'<small class="pull-right">'+balance+'</small>'+
                          '<br><br><small class="pull-right">'+account.id_rs+'</small><br></h4><p>';

                          // <img style="width:16px; height:16px; min-height:16px" src="images/'+symbol.toLowerCase()+'-icon.gif">

            sub.push({
              sref: "accounts({ id_rs: '"+account.id_rs+"'})",
              html: $sce.trustAsHtml(content)
            });
          }
        });
        deferred.resolve(sub);
      },
      deferred.reject
    );
    return deferred.promise;
  } 

  var add_account = {
    clazz: 'success',
    html: $sce.trustAsHtml('<p><h4 disable-nw-menu="true"><span class="glyphicon glyphicon-plus pull-right"></span><strong>Add Account</strong>&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;</h4></p>'),
    click: function () {
      var account = {}
      plugins.get('accounts').add(account).then(
        function (items) {
          $state.go('accounts', {id_rs: items.id_rs});
        }
      );
    }
  };

  var sub_menu    = [add_account];

  function load() {
    loadAccounts().then(function (_sub_menu) {
      $timeout(function () {
        sub_menu = [add_account].concat(_sub_menu);
      });
    });
  }
  db.accounts.addObserver(null, {
    finally: function () {
      load();      
    }
  });
  load();

  /* Register as plugin */
  plugins.register({
    id: 'accounts',
    extends: 'app',
    sref: 'accounts',
    label: 'Accounts',
    sub_menu_html: function () {
      return sub_menu;
    },
    sub_menu_activate: load,
    icon_class: 'glyphicon glyphicon-credit-card',
    detail: function (id_rs) {
      nxt.get(id_rs).getAccount({account: id_rs}).then(
        function (account) {
          modals.open('accountsDetail', {
            resolve: {
              items: function () {
                angular.extend(account, {
                  guaranteedBalanceNXT:   nxt.util.convertToNXT(account.guaranteedBalanceNQT),
                  balanceNXT:             nxt.util.convertToNXT(account.balanceNQT),
                  effectiveBalanceNXT:    nxt.util.commaFormat(String(account.effectiveBalanceNXT)),
                  unconfirmedBalanceNXT:  nxt.util.convertToNXT(account.unconfirmedBalanceNQT),
                  forgedBalanceNXT:       nxt.util.convertToNXT(account.forgedBalanceNQT)
                });
                return account;
              }
            }
          });
        },
        alerts.catch("Could not obtain account")
      );      
    },
    add: function (args) {
      var deferred = $q.defer();
      modals.open('accountsAdd', {
        resolve: {
          items: function () {
            return args;
          }
        },
        close: function (items) {
          deferred.resolve(items);
        },
        cancel: function () {
          deferred.reject();
        }
      });
      return deferred.promise
    },
    loadAccounts: function () {
      var deferred = $q.defer();
      loadAccounts().then(deferred.resolve, deferred.reject);
      return deferred.promise;
    }
  });

 

  /* Register modal dialogs */
  modals.register('accountsAdd', { 
    templateUrl: 'plugins/accounts/partials/accounts-add-modal.html', 
    controller: 'AccountsPluginAddModalController' 
  });
  modals.register('accountsDetail', { 
    templateUrl: 'plugins/accounts/partials/accounts-detail-modal.html', 
    controller: 'AccountsPluginDetailModalController' 
  });
  modals.register('accountsEdit', { 
    templateUrl: 'plugins/accounts/partials/accounts-edit-modal.html', 
    controller: 'AccountsPluginEditModalController' 
  });
  modals.register('sendMoney', { 
    templateUrl: 'plugins/accounts/partials/send-money-modal.html', 
    controller: 'AccountsPluginSendMoneyModalController' 
  });
  modals.register('sendMoneyNoPublicKey', { 
    templateUrl: 'plugins/accounts/partials/send-money-no-publickey-modal.html', 
    controller: 'AccountsPluginSendMoneyNoPublickeyModalController' 
  });
  modals.register('receiveMoney', { 
    templateUrl: 'plugins/accounts/partials/receive-money-modal.html', 
    controller: 'AccountsPluginReceiveMoneyModalController' 
  });
  modals.register('sendProgress', { 
    templateUrl: 'plugins/accounts/partials/send-progress.html', 
    controller: 'AccountsPluginSendProgressMoneyModalController' 
  });
});

})();