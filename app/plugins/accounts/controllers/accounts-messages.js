(function () {
'use strict';
var module = angular.module('fim.base');
module.controller('AccountsPluginMessagesController', 
  function($scope, alerts, $timeout, ngTableParams, nxt, modals, plugins, db, $filter, i18n, $sce, transactionService, requests) {  

  $scope.items                    = {};
  $scope.items.recipientRS        = null;
  $scope.items.messageContent     = null;
  $scope.items.recipientPublicKey = null;
  $scope.recipientDescriptionHTML = null;

  $scope.messages     = [];
  $scope.tableParams  = new ngTableParams({page: 1, count: 5 }, {
    total: 0,   // length of data
    getData: function($defer, params) {
      $defer.resolve($scope.messages.slice((params.page() - 1) * params.count(), params.page() * params.count()));
    }
  });

  $scope.$on('transaction-length-changed', function(event, mass) { 
    $scope.$evalAsync(function () {
      processMessages();
      $scope.tableParams.total($scope.messages.length);
      $scope.tableParams.reload(); 
    });
  });

  $scope.onMessageUnlockClick = function (element) {
    modals.open('selectDecryptionAccount', {
      resolve: {
        items: function () {
          return { 
            recipientRS: element.getAttribute('data-recipient'),
            senderRS: element.getAttribute('data-sender')
          }
        }
      },
      close: function () {
        $scope.$broadcast('transaction-length-changed');
      }
    });
  }  

  $scope.sendMessage = function (recipientRS, recipientPublicKey, message) {
    var api   = nxt.get($scope.selectedAccount.id_rs);
    var args  = {
      feeNQT:      nxt.util.convertToNQT(api.engine.feeCost),
      deadline:    '1440',
      engine:      api.type
    };  

    /* Either provide the recipient publicKey or recipient id */      
    if (recipientPublicKey) {
      args.recipientPublicKey = recipientPublicKey;
      args.recipient          = api.crypto.getAccountIdFromPublicKey(args.recipientPublicKey, false);
    }
    else {
      var address       = api.createAddress();
      if (address.set(recipientRS)) {
        args.recipient  = address.account_id();
      }
    }

    args.sender           = $scope.selectedAccount.id_rs;
    args.message          = message;
    args.encrypt_message  = true;

    modals.open('sendProgress', {
      resolve: {
        items: function () {
          return {
            api:      api,
            args:     args,
            method:   'sendMessage'
          };
        }
      },
      close: function (items) {
        $scope.$evalAsync(function () {
          $scope.showMessageSendSuccess = true;
          $scope.composeCollapse = true;
        });
      }
    });
  }

  /* Iterates the messages array upon change, must try to optimize as much as possible 
    since this might be called many times. */
  function processMessages() {
    var api = nxt.get($scope.selectedAccount.id_rs);
    $scope.messages = [];
    angular.forEach($scope.transactions, function (transaction) {
      if (transaction.type == 1 && transaction.subtype == 0) {
        var message   = {};
        
        /* This is pretty quick since the decoder holds a cache of decrypted text */
        var decoded   = api.decoder.decode(transaction);
        if (!decoded || (decoded && decoded.encrypted == true && decoded.text == null)) {
          message.html  = $sce.trustAsHtml('<span>encrypted&nbsp;<a href="#" '+
            'onclick="event.preventDefault(); if (angular.element(this).scope().onMessageUnlockClick) { '+
            'angular.element(this).scope().onMessageUnlockClick(this) }" data-recipient="'+transaction.recipientRS+
            '" data-sender="'+transaction.senderRS+'">'+
            'unlock&nbsp;<i class="fa fa-lock"></i></a></span>');
        }
        else {
          message.text  = decoded.text;
        }

        if (transaction.senderRS == $scope.selectedAccount.id_rs) {
          message.to  = transaction.recipientRS;
        }
        else {
          message.from = transaction.senderRS;
          message.publicKey = transaction.senderPublicKey;
        }
        message.date = nxt.util.formatTimestamp(transaction.timestamp);
        $scope.messages.push(message);
      }
    });
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

  function setDescription(level, html) {
    $scope.$evalAsync(function () {
      $scope.recipientAlertLevel = level;
      $scope.recipientDescriptionHTML = $sce.trustAsHtml(html);
    });
  }  

  $scope.correctAddressMistake = function (element) {
    console.log('correctAddressMistake', element);
    $('form[name=messageSendForm] input[name=recipient]').val(element.getAttribute('data-address')).change();
  };  

  $scope.recipientChanged = function () {
    $scope.recipientDescriptionHTML = null;
    var api     = nxt.get($scope.selectedAccount.id_rs);
    var account = $scope.items.recipientRS;
    var parts   = account.split(':');
    if (parts.length > 1) {
      $scope.items.recipientRS        = account = parts[0];
      $scope.items.recipientPublicKey = parts[1]; /* XXX this asumes no ':' character is ever used in a public key */
    }

    var address = api.createAddress();
    if (address.set(account)) {
      api.getAccount({account: account}).then(
        function (account) {
          if (!account.publicKey) {
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
