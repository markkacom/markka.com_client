(function () {
'use strict';

function isValidHex(hex) { 
  var curCharCode = 0; 
  hex = hex.toLowerCase(); 
  for (var i=0; i<hex.length; i++) { 
    curCharCode = hex.charCodeAt(i); 
    if (!(curCharCode>47 && curCharCode<58 || curCharCode>96 && curCharCode<103)) { 
      return false;
    }
  }
  return true;
}

var module = angular.module('fim.base');
module.config(function($routeProvider) {  
  $routeProvider
    .when('/login-to/:action?', {
      templateUrl: 'partials/login-to.html',
      controller: 'LoginToController'
    });
});
module.run(function ($rootScope) {
  $rootScope.isCurrentAccount = function (id_rs) { 
    return $rootScope.currentAccount && $rootScope.currentAccount.id_rs == id_rs;
  };
})
module.controller('LoginToController', function($scope, $rootScope, KeyService, nxt, $location, $q, 
  $timeout, db, timeagoService, $routeParams, diceWords) {
  
  $scope.walletExists = KeyService.walletExists();
  $scope.walletUnlocked = !!KeyService.wallet;
  $scope.hideSecretphrase = true;
  $scope.is_remember = false;

  var cipherTextOverride = null;

  $scope.state = {};
  $scope.state.active = 0;
  $scope.input = {};
  $scope.input.password = '';
  $scope.input.passwordConfirm = '';
  $scope.input.secretPhrase = '';
  $scope.input.accounts = null;
  $scope.input.account = null;
  $scope.input.email = null;
  $scope.input.name = null;
  $scope.input.engine = null;
  $scope.input.secretPhraseRotator = null;
  $scope.input.secretPhraseRotatorIndex = null;
  $scope.input.confirmed = null;
  $scope.input.duplicateNameAccount = null;
  $scope.input.wallet='internal';
  $scope.input.selectedFile=null;

  $scope.alerts = {};
  $scope.alerts.wrongPassword = false;
  $scope.alerts.clipped = false;
  $scope.alerts.duplicateName = false;
  $scope.alerts.activated = false;
  $scope.alerts.activationBusy = false;
  $scope.alerts.fileError = false;

  var initializers = {
    2: function () {
      if ($scope.input.account) {
        $scope.input.secretPhrase = $scope.input.account.secretPhrase;
      }
    },
    4: function () {
      var api = nxt.get($scope.input.engine);
      $scope.input.id_rs = api.crypto.getAccountId($scope.input.secretPhrase, true);
      api.engine.socket().getAccount({ account:$scope.input.id_rs}).then(
        function (data) {
          $scope.$evalAsync(function () {
            $scope.input.name = data.accountName;
            $scope.input.description = data.description;
          });
        }
      )
    },
    9: function () {
      generatePassphrase().then(
        function (passphrase) {
          $scope.$evalAsync(function () {
            $scope.input.secretPhrase = passphrase;  
          });
        }
      );
      // $scope.input.secretPhrase = generatePassphrase();
    },
    11: function () {
      var api = nxt.get($scope.input.engine);
      $scope.input.id_rs = api.crypto.getAccountId($scope.input.secretPhrase, true);
    },
    12: function () {

    }
  };

  function generatePassphrase() {
    var deferred = $q.defer();
    var create = function (dice_words) {
      var words = [];
      var crypto = window.crypto || window.msCrypto;
      var random = new Uint32Array(128 / 32);
      crypto.getRandomValues(random);

      var x, w1, w2, w3, n=dice_words.length;
      for (var i=0; i<random.length; i++) {
        x = random[i];
        w1 = x % n;
        w2 = (((x / n) >> 0) + w1) % n;
        w3 = (((((x / n) >> 0) / n) >> 0) + w2) % n;

        words.push(dice_words[w1]);
        words.push(dice_words[w2]);
        words.push(dice_words[w3]);
      }
      crypto.getRandomValues(random);
      return words.join(" ");
    }
    diceWords.getWords($rootScope.langCode).then(
      function (words) {
        var passphrase = create(words);
        deferred.resolve(passphrase);
      }
    );
    return deferred.promise;
  }  

  var forcedBack = {page:null};

  $scope.goto = function (page, forcedBackPage) {
    forcedBack.page = typeof forcedBackPage == 'number' ? forcedBackPage : null;
    $scope.state.active = page;
    if (initializers[page]) {
      initializers[page].call();
    }
  }

  if ($routeParams.action == "create") {
    $scope.goto(9);
  }

  $scope.walletTypeChanged = function () {
    if ($scope.input.wallet == 'internal') {
      $scope.input.selectedFile=null;
      cipherTextOverride=null;
    }
  }

  $scope.walletFileChanged = function (event) {
    // console.log(event)
    $scope.$evalAsync(function () {
      $scope.alerts.fileError = false;
      var selectedFile = event.target.files[0];
      $scope.input.selectedFile = selectedFile.name;
      var reader    = new FileReader();
      reader.onload = function(event) {
        cipherTextOverride = event.target.result;
        if (!isValidHex(cipherTextOverride)) {
          cipherTextOverride = converters.stringToHexString(cipherTextOverride);
        }
      };
      reader.onerror = function (event) {
        $scope.$evalAsync(function () {
          $scope.alerts.fileError = true;
        });
      };
      reader.onabort = function (event) {};
      reader.readAsText(selectedFile); 
    });
  }

  $scope.selectedAccountChanged = function () {
    $scope.$evalAsync(function () {
      $scope.alerts = {};
      $scope.input.secretPhrase = $scope.input.account.secretPhrase;
    });
  }

  function setCurrentAccount(account) {
    if ($rootScope.currentAccount) {
      $rootScope.$emit('onCloseCurrentAccount', $rootScope.currentAccount);
    }
    $rootScope.currentAccount = angular.copy(account);
    $rootScope.$emit('onOpenCurrentAccount', $rootScope.currentAccount);

    var api = nxt.get(account.id_rs);
    api.engine.socket().getAccount({account:account.id_rs}).then(
      function (a) {
        $rootScope.$evalAsync(function () {
          $rootScope.currentAccount.name = a.accountName;
        });
      }
    );
    return $rootScope.currentAccount
  }

  $scope.backupWallet = function () {
    var encrypted   = KeyService.toString();
    var blob        = new Blob([encrypted], {type: "text/plain;charset=utf-8"});
    saveAs(blob, 'wallet.dat');
  }

  $scope.remember = function () {
    if ($rootScope.currentAccount) {
      var a = $rootScope.currentAccount;
      var api = nxt.get(a.id_rs);
      $scope.state.active = 3;
      $scope.is_remember = true;
      $scope.input.engine = api.engine.type == nxt.TYPE_FIM ? 'fim' : 'nxt';  
      $scope.input.secretPhrase = a.secretPhrase;
      $scope.walletExists = KeyService.walletExists();
      $scope.walletUnlocked = false;
    }
  }

  $scope.back = function (page) {
    if (forcedBack.page) {
      page = forcedBack.page;
    }
    forcedBack.page = null;
    $scope.alerts = {};
    $scope.state.active = typeof page == 'number' ? page : $scope.state.active-1;
    // if (initializers[$scope.state.active]) {
    //   initializers[$scope.state.active].call();
    // }    
  }

  $scope.logout = function () {
    if ($rootScope.currentAccount) {
      $rootScope.$emit('onCloseCurrentAccount', $rootScope.currentAccount);
    }    
    $rootScope.currentAccount = null;
    KeyService.lock();
    nxt.fim().lock();
    if (ENABLE_DUAL_ENGINES) {
      nxt.nxt().lock();
    }
    $scope.walletExists = KeyService.walletExists();
    $scope.walletUnlocked = false;
  }

  $scope.unlockWallet = function () {
    $scope.alerts = {};
    var wallet = KeyService.unlock($scope.input.password, cipherTextOverride);
    if (wallet) {
      $scope.input.accounts = angular.copy(wallet.entries);
      $scope.input.account = $scope.input.accounts[0];
      $scope.walletExists = true;
      $scope.walletUnlocked = true;      
    }
    else {
      $scope.alerts.wrongPassword = true;
    }
  }

  $scope.refreshWallet = function () {
    if (KeyService.wallet) {
      $scope.input.accounts = angular.copy(KeyService.wallet.entries);
      $scope.input.accounts.forEach(function (a) { a.label = a.id_rs });
      $scope.input.account = $scope.input.accounts[0];
      $scope.walletExists = true;
      $scope.walletUnlocked = true;
      lookupAccountInfo($scope.input.accounts);      
    }
  }  

  function lookupAccountInfo(accounts) {
    var list, api, engine = { fim:[], nxt:[] };
    for (var i=0; i<accounts.length; i++) {
      api  = nxt.get(accounts[i].id_rs);
      list = api.type == nxt.TYPE_FIM ? engine.fim : engine.nxt;
      list.push(accounts[i]);
    }
    if (engine.fim.length) { loadAccounts(nxt.fim(), new Iterator(engine.fim)); }
    if (engine.nxt.length) { loadAccounts(nxt.nxt(), new Iterator(engine.nxt)); }
  }

  function loadAccounts(api, iterator) {
    if (iterator.hasMore()) {
      var account = iterator.next();
      api.engine.socket().getAccount({account:account.id_rs}).then(
        function (a) {
          $scope.$evalAsync(function () {
            account.name = a.accountName;
            account.description = a.description;
            account.label = account.name ? (account.id_rs + ' - ' + account.name) : account.id_rs;

            db.accounts.put({
              id_rs: account.id_rs,
              engine: api.engine.type,
              name: account.name,
              excluded: false
            });
          });

          loadAccounts(api, iterator);
        }
      );
    }
  }

  $scope.selectAccountFromWallet = function () {
    var account = setCurrentAccount($scope.input.account);
    if ($rootScope.destURL) {
      var url = $rootScope.destURL;
      delete $rootScope.destURL;
      $timeout(function () { $location.path(url) }, 0, false);
    }
    else {
      $location.path('/accounts/'+account.id_rs+'/activity/latest');  
    }
 }

  $scope.selectAccountFromSecretPhrase = function () {
    var api = nxt.get($scope.input.engine);
    var id_rs = api.crypto.getAccountId($scope.input.secretPhrase, true);
    var account = setCurrentAccount({ id_rs: id_rs, secretPhrase: $scope.input.secretPhrase});
    if ($rootScope.destURL) {
      var url = $rootScope.destURL;
      delete $rootScope.destURL;
      $timeout(function () { $location.path(url) }, 0, false);
    }
    else {
      $location.path('/accounts/'+account.id_rs+'/activity/latest');
    }
  }

  $scope.saveSecretToWallet = function () {
    var api = nxt.get($scope.input.engine);
    var id_rs = api.crypto.getAccountId($scope.input.secretPhrase, true);
    $scope.input.account = { id_rs: id_rs, secretPhrase: $scope.input.secretPhrase};
    console.log('Saving account to wallet ',$scope.input.account);
    KeyService.wallet.add($scope.input.account.id_rs, $scope.input.account.secretPhrase);
  }

  $scope.createWallet = function () {
    var wallet = KeyService.create($scope.input.password);
    wallet.save();
    $scope.walletExists = true;
    $scope.walletUnlocked = true;
  }

  $scope.removeWallet = function () {
    KeyService.remove();
    $scope.walletExists = KeyService.walletExists();
    $scope.walletUnlocked = !!KeyService.wallet;
    $scope.input.password = '';
    $scope.input.passwordConfirm = '';
    $scope.input.secretPhrase = '';
    $scope.input.accounts = [];
    $scope.input.account = null;
    $scope.input.engine = null;     
    $scope.goto(0);
  }

  $scope.nextSecretPhrase = function () {
    if (typeof $scope.input.secretPhraseRotatorIndex != 'number') {
      $scope.input.secretPhraseRotatorIndex = 1;
    }
    else {
      $scope.input.secretPhraseRotatorIndex++;
    }
    if (!$scope.input.secretPhraseRotator) {
      $scope.input.secretPhraseRotator = [$scope.input.secretPhrase];
    }
    if ($scope.input.secretPhraseRotatorIndex < $scope.input.secretPhraseRotator.length) {
      $scope.input.secretPhrase = $scope.input.secretPhraseRotator[$scope.input.secretPhraseRotatorIndex];
    }
    else {
      generatePassphrase().then(
        function (passphrase) {
          $scope.$evalAsync(function () {
            $scope.input.secretPhraseRotator.push(passphrase);
            $scope.input.secretPhrase = passphrase;
          });
        }
      );
    }
  }

  $scope.previousSecretPhrase = function () {
    $scope.input.secretPhraseRotatorIndex--;
    $scope.input.secretPhrase = $scope.input.secretPhraseRotator[$scope.input.secretPhraseRotatorIndex];
  }

  function activateFIMKAccount() {
    var deferred = $q.defer();
    $scope.alerts.activationBusy = true;
    $timeout(function () {
      $scope.alerts.activationBusy = false;
      deferred.resolve();
    }, 2000);
    return deferred.promise;
  }

  $scope.activateAccount = function () {
    activateFIMKAccount().then(function () {
      $scope.alerts.activated = true;
    });
  }

  function checkDuplicateName() {
    var api = nxt.get($scope.input.engine);
    var args = { 
      requestType: 'searchAccounts',
      query: $scope.input.name
    };
    return api.engine.socket().callAPIFunction(args).then(
      function (data) {
        $scope.$evalAsync(function () {
          var a, accounts = data.accounts;
          for (var i=0; i<accounts.length; i++) {
            if (accounts[i].name == $scope.input.name) {
              $scope.alerts.duplicateName = true;
              $scope.input.duplicateNameAccount = accounts[i];
              return;
            }
          }
          $scope.alerts.duplicateName = false;
          $scope.input.duplicateNameAccount = null;
        });
      },
      function () {
        $scope.$evalAsync(function () {
          $scope.alerts.duplicateName = false;
          $scope.input.duplicateNameAccount = null;
        });
      }
    );
  }

  function checkDuplicateIdentifier() {
    var deferred = $q.defer();
    $scope.$evalAsync(function () {
      // DEBUG 
      //$scope.alerts.duplicateName = true;
      //$scope.input.duplicateNameAccount = { accountRS: 'FIM-FXUL-G7EA-SX4K-48EZH' }
      $scope.alerts.duplicateName = false;
      $scope.input.duplicateNameAccount = null;
    });
    deferred.resolve();
    return deferred.promise;
  }
  
  var busy = false, reload = null;
  $scope.nameChanged = function () {
    if (busy) {
      if (!reload) {
        reload = function () {
          $scope.nameChanged();
        }
      }
    }
    else {
      busy = true;
      var promise = $scope.input.engine == 'nxt' ? checkDuplicateName() : checkDuplicateIdentifier();
      promise.then(function () {
        busy = false;
        if (reload) {
          reload.call();
          reload = null;
        }
      })
    }
  }  
});
})();