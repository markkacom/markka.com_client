/**
 * The MIT License (MIT)
 * Copyright (c) 2016 Krypto Fin ry and the FIMK Developers
 *
 * Permission is hereby granted, free of charge, to any person obtaining a copy of
 * this software and associated documentation files (the "Software"), to deal in
 * the Software without restriction, including without limitation the rights to
 * use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of
 * the Software, and to permit persons to whom the Software is furnished to do so,
 * subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be included in all
 * copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
 * SOFTWARE.
 * */
(function () {
'use strict';
var module = angular.module('fim.base');
module.factory('UserService', function ($q, nxt, KeyService, plugins, i18n, $rootScope) {

  function signTransaction(progress, api, args, data, secretPhrase, publicKey) {
    progress.setMessage('Signing Transaction')
    var signature = api.crypto.signBytes(
        data.unsignedTransactionBytes,
        converters.stringToHexString(secretPhrase)
    )
    if (!api.crypto.verifyBytes(signature, data.unsignedTransactionBytes, publicKey)) {
      progress.setErrorMessage(i18n.format('error_signature_verification_client'))
      progress.enableCloseBtn()
      return
    }
    var payload = api.verifyAndSignTransactionBytes(
        data.unsignedTransactionBytes, signature, args.requestType, args, api.type
    )
    if (!payload) {
      progress.setErrorMessage(i18n.format('error_signature_verification_server'))
      progress.enableCloseBtn()
      return
    }
    return payload
  }

  function broadcast(socket, progress, payload) {
    progress.setMessage('Broadcasting Transaction')
    if (!socket.is_connected) {
      progress.setErrorMessage("No connection with server, try later")
      progress.enableCloseBtn()
      return
    }
    socket.callAPIFunction({requestType: 'broadcastTransaction', transactionBytes: payload}).then(
        function (data) {
          progress.animateProgress().then(
              function () {
                progress.setMessage('Transaction sent successfully')
                progress.enableCloseBtn()
                // if ($scope.items.autoSubmit) {
                //   progress.close();
                //   $modalInstance.close($scope.items);
                // } else {
                //   progress.onclose = function () {
                //     $modalInstance.close($scope.items);
                //   };
                // }
              }
          )
        },
        function (data) {
          progress.setMessage(JSON.stringify(data))
          progress.enableCloseBtn()
        }
    )
  }

  function sendTransaction(api, args, account, publicKey, secretPhrase) {
    args.requestType  = "registerRewardApplicant";
    args.publicKey    = publicKey;

    plugins.get('alerts').progress({ title: "Please wait" }).then(
        function (progress) {
          var socket = api.engine.socket();

          // if (items.autoSubmit) {
          //   progress.onclose = function () {
          //     $modalInstance.close($scope.items);
          //   };
          // }

          progress.setMessage('Creating Transaction');
          if (!socket.is_connected) {
            progress.setErrorMessage("No connection with server, try later");
            progress.enableCloseBtn();
            return;
          }
          socket.callAPIFunction(args).then(
              function (data) {
                var error = data.errorDescription || data.error
                if (error) {
                  progress.setErrorMessage(error)
                  progress.enableCloseBtn()
                  return
                }
                /* Secretphrase was send to the server */
                if (args.secretPhrase) {
                  progress.animateProgress().then(
                      function () {
                        new Audio('images/beep.wav').play()
                        progress.setMessage('Operation complete')
                        progress.enableCloseBtn()
                        // progress.onclose = function () {
                        //   $modalInstance.close($scope.items);
                        // };
                      }
                  )
                } else {  /* Must sign the txn client side */
                  var payload = signTransaction(progress, api, args, data, secretPhrase, publicKey)
                  if (payload) {
                    broadcast(socket, progress, payload)
                  } else {
                    progress.setMessage('Not signed')
                    progress.enableCloseBtn()
                  }
                }
              },
              function (data) {
                progress.setMessage(JSON.stringify(data));
                progress.enableCloseBtn();
              }
          );
        }
    );
  }

  function registerRewardApplicant(api, account, secretPhrase) {
    var txnArguments = {
      feeNQT: "0",
      deadline: "1440",
      amountNQT: "0",
      sender: account.accountRS,
      recipient: account.account,
    }
    sendTransaction(api, txnArguments, account, account.publicKey, secretPhrase)
  }

  var SERVICE = {

    currentAccount: null,
    currentWallet: null,
    userAccounts: [],

    isCurrentAccount: function (id_rs) {
      return this.currentAccount && this.currentAccount.id_rs == id_rs;
    },

    setCurrentAccount: function (account) {
      if (this.currentAccount) {
        $rootScope.$emit('onCloseCurrentAccount', this.currentAccount);
      }
      $rootScope.currentAccount = this.currentAccount = account;

      var api = nxt.get(account.id_rs);
      this.currentAccount.symbol_lower = api.engine.symbol_lower;
      $rootScope.$emit('onOpenCurrentAccount', this.currentAccount);

      api.engine.socket().getAccount({account: account.id_rs}).then(
          function (a) {
            $rootScope.$evalAsync(function () {
              SERVICE.currentAccount.name = a.accountName

              registerRewardApplicant(api, a, account.secretPhrase)

            })
          }
      )

      return this.currentAccount
    },

    setCurrentWallet: function (wallet) {
      if (this.currentWallet) {
        $rootScope.$emit('onCloseCurrentWallet', this.currentWallet);
      }
      this.currentWallet = wallet;
      $rootScope.$emit('onOpenCurrentWallet', this.currentWallet);

      this.userAccounts.length = 0;
      $rootScope.userAccounts = this.userAccounts = (wallet.entries||[]);
      this.userAccounts.forEach(function (a) {
        a.label = a.id_rs;
        var api = nxt.get(a.id_rs);
        if (!a.publicKey) {
          a.publicKey = api.crypto.secretPhraseToPublicKey(a.secretPhrase);
        }
        if (!a.type) {
          a.type = api.type;
        }
      });
      this.loadAccountData(new Iterator(this.userAccounts));
    },

    logout: function () {
      if (this.currentAccount) {
        $rootScope.$emit('onCloseCurrentAccount', this.currentAccount);
      }
      $rootScope.currentAccount = this.currentAccount = null;
      this.currentWallet = null;
      $rootScope.userAccounts = this.userAccounts = [];
      KeyService.lock();
      nxt.fim().lock();
      if (ENABLE_DUAL_ENGINES) {
        nxt.nxt().lock();
      }
    },

    loadAccountData: function (iterator) {
      if (!iterator.hasMore()) return;
      try {
        var account = iterator.next();
        var api = nxt.get(account.id_rs);
        var socket = api.engine.socket();
        if (!socket) {
          this.loadAccountData(iterator);
          return;
        }
        else {
          socket.callAPIFunction({ requestType: 'getAccount', account: account.id_rs }).then(
            function (a) {
              $rootScope.$evalAsync(function () {

                account.name = a.accountName;
                account.description = a.description;
                account.balance = nxt.util.convertToNXT(a.unconfirmedBalanceNQT);
                if (a.accountColorName) {
                  account.balance += ' '+a.accountColorName;
                  account.symbol = a.accountColorName;
                  account.accountColorId = a.accountColorId;
                }
                else {
                  account.balance += ' '+api.engine.symbol;
                  account.symbol = api.engine.symbol;
                  account.accountColorId = '0';
                }
                account.label = account.name || account.id_rs;
              });

              this.loadAccountData(iterator);
            }.bind(this)
          );
        }
      }
      catch (e) {
        console.log('Error UserService.loadAccountData()', e);
        this.loadAccountData(iterator);
      }
    },

    refresh: function (id_rs) {
      for (var i=0; i<this.userAccounts.length; i++) {
        if (this.userAccounts[i].id_rs == id_rs) {
          this.loadAccountData(new Iterator([this.userAccounts[i]]));
          break;
        }
      }
    }
  };

  $rootScope.isCurrentAccount = SERVICE.isCurrentAccount;
  return SERVICE;

});
})();