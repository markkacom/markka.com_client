(function () {
'use strict';
var module = angular.module('fim.base');
module.controller('AccountsPluginSendMoneyModalController', function(items, $modalInstance, 
  $scope, nxt, $timeout, $filter, i18n, alerts, $sce, db, plugins, modals) {

  $scope.dialogName  = 'Send Money';
  $scope.dialogTitle = $scope.dialogName;
  $scope.setTitle = function (text) {
    $scope.$evalAsync(function () {
      $scope.dialogTitle = $scope.dialogName + (text?(' | ' + text):'');
    });
  };  

  $scope.show  = {};
  $scope.show.advanced = false;
  $scope.show.message  = false;

  $scope.items = items;
  $scope.items.showPublicKey      = items.showPublicKey || false;
  $scope.items.amountNXT          = items.amountNXT || '';
  $scope.items.deadline           = items.deadline || '1440';
  $scope.items.recipientPublicKey = items.recipientPublicKey || '';
  $scope.items.recipientRS        = items.recipientRS || '';
  $scope.items.senderRS           = items.senderRS || '';
  $scope.items.recipientReadonly  = items.recipientReadonly || false;
  $scope.items.messagePublic      = items.messagePublic || false;
  $scope.items.message            = items.message || ''; /* Message at top of dialog */
  $scope.items.txnMessageType     = 'to_recipient';
  $scope.items.txnMessage         = '';

  $scope.recipientDescriptionHTML = null;
  $scope.recipientAlertLevel      = 'info'; // success, info, warning, danger

  $scope.TYPE_FIM         = nxt.TYPE_FIM;
  $scope.TYPE_NXT         = nxt.TYPE_NXT;
  $scope.engine           = undefined;  

  $scope.isSending        = false;
  $scope.sendSuccess      = false;
  $scope.accounts         = [];
  $scope.selectedAccount  = null;

  var api = null;

  var called_twice = false;
  $scope.setEngine = function (engine) {
    if (called_twice) {
      throw new Error('Sanity check');
      called_twice = true;
    }
    api = nxt.get(engine);
    $scope.engine = engine;
    $scope.$evalAsync(function () {
      $scope.recipientChanged();      
      $scope.items.feeNXT = engine == nxt.TYPE_FIM ? '0.1' : '1';
    });

    /* Loads accounts from database */
    var prefix = engine == nxt.TYPE_FIM ? 'FIM-' : 'NXT-';
    db.accounts.where('id_rs').startsWith(prefix).sortBy('name').then(
      function (accounts) {
        $scope.accounts = accounts;
        $scope.selectedAccount = accounts[0];

        /* There was is a fixed sender account - select that */
        if ($scope.items.senderRS) {
          for (var i=0; i<$scope.accounts.length; i++) {
            if ($scope.accounts[i].id_rs == $scope.items.senderRS) {
              $scope.$evalAsync(function () {               
                $scope.selectedAccount = accounts[i];
              });
              break;
            }
          }
        }
      }
    ).catch(alerts.catch("Could not load accounts"));      
  }

  if ($scope.items.senderRS) {
    $scope.setEngine($scope.items.senderRS.indexOf('FIM-') == 0 ? nxt.TYPE_FIM : nxt.TYPE_NXT);
  }

  $scope.selectContact = function () {
    plugins.get('contacts').select({engine: $scope.engine}).then(
      function (items) {
        $scope.$evalAsync(function () {
          $scope.items.recipientRS = items.id_rs;
          $scope.recipientChanged();
        });
      }
    );
  };  

  $scope.formatAccount = function (account) {
    return account ? (account.id_rs + ' - ' + account.name) : '';
  };

  $scope.close = function () {
    if ($scope.sendSuccess) {
      if ($scope.items.skipSaveContact) {
        $modalInstance.close($scope.items);
      }
      else {
        /* See if the recipient is already a contact */
        db.contacts.where('id_rs').equals($scope.items.recipientRS).toArray().then(
          function (contacts) {
            if (contacts.length == 0) {
              plugins.get('contacts').add({
                message: 'Do you want to add this contact?', 
                id_rs: $scope.items.recipientRS
              }).then(
                function () {
                  $modalInstance.close($scope.items);
                }
              );
            }
            else {
              $modalInstance.close($scope.items);
            }
          }
        );
      }
    }
    else {
      var args = {
        amountNQT:   nxt.util.convertToNQT($scope.items.amountNXT),
        feeNQT:      nxt.util.convertToNQT($scope.items.feeNXT),
        deadline:    $scope.items.deadline,
        engine:      $scope.engine
      };  

      /* Either provide the recipient publicKey or recipient id */      
      if ($scope.items.recipientPublicKey) {
        args.recipientPublicKey = $scope.items.recipientPublicKey;
        args.recipient = nxt.crypto($scope.engine).getAccountIdFromPublicKey(args.recipientPublicKey, false);
      }
      else {
        var address = api.createAddress();
        if (address.set($scope.items.recipientRS)) {
          args.recipient = address.account_id();
        }
      }

      args.sender = $scope.selectedAccount.id_rs;

      if ($scope.show.message) {
        args.message = $scope.items.txnMessage;
        if ($scope.items.txnMessageType == "to_self") {
          args.note_to_self = true;
        }
        else if ($scope.items.txnMessageType == "to_recipient") {
          args.encrypt_message = true;
        }
        else if ($scope.items.txnMessageType == "public") {
          args.public_message = true;
        }
        else {
          throw new Error('Not reached');
        }
      }

      $scope.$evalAsync(function () {
        $scope.isSending = true;
      });

      modals.open('sendProgress', {
        resolve: {
          items: function () {
            return {
              api: api,
              args: args
            };
          }
        },
        close: function (items) {

          /* Schedule a check for unconfirmed transactions */
          var downloader = api.downloadTransactions($scope.selectedAccount);
          downloader.getUnconfirmedTransactions();

          $modalInstance.close($scope.items);
        },
        cancel: function () {
          $scope.$evalAsync(function () {
            $scope.isSending    = false;
          });
        }
      });
    }
  };

  $scope.dismiss = function () {
    $modalInstance.dismiss();
  };

  function setDescription(level, html) {
    $scope.$evalAsync(function () {
      $scope.recipientAlertLevel = level;
      $scope.recipientDescriptionHTML = $sce.trustAsHtml(html);
    });
  }

  $scope.correctAddressMistake = function (element) {
    console.log('correctAddressMistake', element);
    $('form[name=paymentCreateForm] input[name=recipient]').val(element.getAttribute('data-address')).change();
  };

  $scope.recipientChanged = function () {
    $scope.recipientDescriptionHTML = null;
    $scope.items.showPublicKey = false;

    var account = $scope.items.recipientRS;
    var parts   = account.split(':');
    if (parts.length > 1) {
      $scope.items.recipientRS        = account = parts[0];
      $scope.items.recipientPublicKey = parts[1]; /* XXX this asumes no ':' character is ever used in a public key */
      $scope.items.showPublicKey      = true;
    }

    var address = api.createAddress();
    if (address.set(account)) {
      api.getAccount({account: account}).then(
        function (account) {
          console.log('account', account);
          if (!account.publicKey) {
            $scope.items.showPublicKey = true;
            setDescription('warning', i18n.format('recipient_no_public_key', {__nxt__: nxt.util.convertToNXT(account.unconfirmedBalanceNQT) }));
          }
          else {
            $scope.items.recipientPublicKey = account.publicKey;
            $scope.items.recipient = account.account;
            setDescription('info', i18n.format('recipient_info', {__nxt__: nxt.util.convertToNXT(account.unconfirmedBalanceNQT) })); 
          }
        },
        function (error) {
          if (error.errorCode == 4) {
            setDescription('danger', i18n.format('recipient_malformed'));
          }
          else if (error.errorCode == 5) {
            if (!$scope.items.publishPublicKey) {
              setDescription('warning', i18n.format('recipient_unknown'));
            }
          }
          else {
            setDescription('danger', i18n.format('recipient_problem', {__problem__: String(error.errorDescription).escapeHTML()}));
          }
        }
      );
    }
    else {
      if (address.guess.length == 1) {
        setDescription('warning', i18n.format('recipient_malformed_suggestion', {
          __recipient__: '<span class="malformed_address" data-address="' + String(address.guess[0]).escapeHTML() + '" ' +
                         'onclick="angular.element(this).scope().correctAddressMistake(this)">' + 
                            address.format_guess(address.guess[0], account) + '</span>'
        }));
      }
      else if (address.guess.length > 1) {
        var html = '<ul>';
        for (var i = 0; i < address.guess.length; i++) {
          html += '<li>';
          html += '<span class="malformed_address" data-address="' + String(address.guess[i]).escapeHTML() + '" ' +
                         'onclick="angular.element(this).scope().correctAddressMistake(this)">' + 
                            address.format_guess(address.guess[i], account) + '</span>';
          html += '</li>';
        }
        html += '</ul>';
        setDescription('warning', i18n.format('recipient_malformed_suggestion_plural', { __multiple__: html }));
      }
      else if ($scope.items.recipientRS) {
        setDescription('danger', i18n.format('recipient_malformed'));
      }
    }
  };

});
})();