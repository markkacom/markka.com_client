(function () {
'use strict';
var module = angular.module('fim.base');
module.controller('PaymentPluginCreateModalController', function(items, $modalInstance, 
  $scope, nxt, $timeout, $filter, i18n, alerts, $sce, db, plugins) {

  $scope.dialogName  = 'Send Payment';
  $scope.dialogTitle = $scope.dialogName;
  $scope.setTitle = function (text) {
    $timeout(function () {
      $scope.dialogTitle = $scope.dialogName + (text?(' | ' + text):'');
    });
  };  

  $scope.show  = {};
  $scope.show.advanced = false;
  $scope.show.message  = false;

  $scope.items = items;
  $scope.items.showPublicKey      = items.showPublicKey || false;
  $scope.items.amountNXT          = items.amountNXT || '1';
  $scope.items.deadline           = items.deadline || '1440';
  $scope.items.secretPhrase       = items.secretPhrase || '';
  $scope.items.recipientPublicKey = items.recipientPublicKey || '';
  $scope.items.recipientRS        = items.recipientRS || '';
  $scope.items.recipientReadonly  = items.recipientReadonly || false;
  $scope.items.messagePublic      = items.messagePublic || false;
  $scope.items.message            = items.message || ''; /* Message at top of dialog */
  $scope.items.txnMessageType     = 'to_self';
  $scope.items.txnMessage         = '';

  $scope.recipientDescriptionHTML = null;
  $scope.recipientAlertLevel = 'info'; // success, info, warning, danger

  $scope.TYPE_FIM = nxt.TYPE_FIM;
  $scope.TYPE_NXT = nxt.TYPE_NXT;
  $scope.engine   = undefined;  

  $scope.isSending       = false;
  $scope.sendSuccess     = false;
  $scope.accounts        = [];
  $scope.selectedAccount = null;
  $scope.useSecretPhrase = false;
  //$scope.senderRSCalc    = { id: 'FIM-?', balance: '?' };  

  var called_twice = false;
  $scope.setEngine = function (engine) {
    if (called_twice) {
      throw new Error('Sanity check');
      called_twice = true;
    }
    $scope.engine = engine;
    $timeout(function () {
      $scope.recipientChanged();      
      $scope.items.feeNXT = engine == nxt.TYPE_FIM ? '0.1' : '1';
      $scope.senderRSCalc = engine == nxt.TYPE_FIM ? { id: 'FIM-?', balance: '?' } : { id: 'NXT-?', balance: '?' };
    });

    /* Loads accounts from database */
    var prefix = engine == nxt.TYPE_FIM ? 'FIM-' : 'NXT-';
    db.accounts.where('id_rs').startsWith(prefix).sortBy('name').then(
      function (accounts) {
        $timeout(function () { 
          if ($scope.items.publishPublicKey) { /* Filter out the recipient in case we're publishing the public key */
            accounts = accounts.filter(function (account) {
              return account.id_rs != $scope.items.recipientRS;
            });
          }
          $scope.accounts = accounts;
          $scope.selectedAccount = accounts[0];
          if ($scope.items.senderRS) {
            for (var i=0; i<$scope.accounts.length; i++) {
              if ($scope.accounts[i].id_rs == $scope.items.senderRS) {
                $scope.selectedAccount = accounts[i];
                break;
              }
            }
          }
          if ($scope.accounts.length == 0) { /* Show the secretphrase textbox in case there are no accounts */
            $scope.useSecretPhrase = true;
          }
        });
      }
    ).catch(alerts.catch("Could not load accounts"));      
  }

  if ($scope.items.recipientReadonly) {
    $scope.setEngine($scope.items.recipientRS.indexOf('FIM-') == 0 ? nxt.TYPE_FIM : nxt.TYPE_NXT);
  }

  $scope.setUseSecretPhrase = function (use) {
    $timeout(function () {
      $scope.useSecretPhrase = use;
    });
  }

  $scope.secretPhraseChanged = function () {
    $timeout(function () {
      $scope.senderRSCalc.id = nxt.crypto($scope.engine).getAccountId($scope.items.secretPhrase, true);
      $scope.senderRSCalc.balance = '?';
      nxt.get($scope.engine).getAccount({account:$scope.senderRSCalc.id}).then(
        function (account) {
          $timeout(function () {
            $scope.senderRSCalc.balance = nxt.util.convertToNXT(account.balanceNQT);
          });
        }
      );
    });
  };

  $scope.showAddAccount = function () {
    var account = {};
    plugins.get('accounts').add(account).then(
      function (items) {
        alerts.success("Successfully added account");
      }
    );
  };

  $scope.selectContact = function () {
    plugins.get('contacts').select({engine: $scope.engine}).then(
      function (items) {
        $timeout(function () {
          $scope.items.recipientRS = items.id_rs;
          $scope.recipientChanged();
        });
      }
    );
  };  

  $scope.formatAccount = function (account) {
    return account.id_rs + ' - ' + account.name;
  };

  $scope.to_trusted = function(html_code) {
    return $sce.trustAsHtml(html_code);
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
        var address = nxt.get($scope.engine).createAddress();
        if (address.set($scope.items.recipientRS)) {
          args.recipient = address.account_id();
        }
      }

      if ($scope.useSecretPhrase) {
        args.secretPhrase = $scope.items.secretPhrase;
        args.publicKey    = nxt.crypto($scope.engine).secretPhraseToPublicKey(args.secretPhrase);
      }
      else {
        args.sender = $scope.selectedAccount.id_rs;
      }

      if ($scope.show.message) {
        if ($scope.items.txnMessageType == "to_self") {

        }
        else if ($scope.items.txnMessageType == "to_recipient") {
          
        }
        else if ($scope.items.txnMessageType == "public") {
          args.messageIsText = 'true';
          args.message = $scope.items.txnMessage;
        }
        else {
          throw new Error('Not reached');
        }
      }

      $timeout(function () {
        $scope.isSending = true;
      });

      nxt.get($scope.engine).sendMoney(args).then(
        function (data) {
          $timeout(function () {
            // console.log('sendMoney',data);
            $scope.isSending    = false;
            $scope.sendSuccess  = true;
            angular.extend($scope.items, data);

            $timeout(function () {
              var downloader = nxt.get($scope.engine).startTransactionDownloader($scope.selectedAccount);
              downloader.getUnconfirmedTransactions();
            }, 1000);
          });          
        },
        function (error) {
          if (error) {
            alerts.failed('Could not send money: ' + error);
            console.log('sendMoney', error);
          }
          /* if there is no error object the call was cancelled */
          $timeout(function () {
            $scope.isSending    = false;
          });
        }
      );
    }
  };

  $scope.dismiss = function () {
    $modalInstance.dismiss();
  };

  function setDescription(level, html) {
    $timeout(function () {
      $scope.recipientAlertLevel = level;
      $scope.recipientDescriptionHTML = html;
    });
  }

  $scope.correctAddressMistake = function (element) {
    console.log('correctAddressMistake', element);
    $('form[name=paymentCreateForm] input[name=recipient]').val(element.getAttribute('data-address')).change();
  };

  $scope.recipientChanged = function () {
    //$scope.items.recipientPublicKey = null;
    $scope.recipientDescriptionHTML = null;
    $scope.items.showPublicKey = false;

    var account = $scope.items.recipientRS;
    var parts   = account.split(':');
    if (parts.length > 1) {
      $scope.items.recipientRS        = account = parts[0];
      $scope.items.recipientPublicKey = parts[1]; /* XXX this asumes no ':' character is ever in a public key */
      $scope.items.showPublicKey      = true;
    }

    var address = nxt.get($scope.engine).createAddress();
    if (address.set(account)) {
      nxt.get($scope.engine).getAccount({account: account}).then(
        function (account) {
          console.log('account', account);
          if (!account.publicKey) {
            $scope.items.showPublicKey = true;
            setDescription('warning', i18n.format('recipient_no_public_key', {__nxt__: nxt.util.convertToNXT(account.unconfirmedBalanceNQT), __symbol__: $scope.symbol }));
          }
          else {
            $scope.items.recipientPublicKey = account.publicKey;
            $scope.items.recipient = account.account;
            setDescription('info', i18n.format('recipient_info', {__nxt__: nxt.util.convertToNXT(account.unconfirmedBalanceNQT), __symbol__: $scope.symbol })); 
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