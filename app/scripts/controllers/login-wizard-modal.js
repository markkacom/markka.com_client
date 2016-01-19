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
module.run(function (modals, settings) {
  modals.register('login-wizard', {
    templateUrl: 'partials/login-wizard-modal.html',
    controller: 'LoginWizardController'
  });
});
module.controller('LoginWizardController', function (items, $scope, $modalInstance, $q, UserService,
  plugins, KeyService, $templateCache, $location, $rootScope, diceWords, nxt, $http, $translate, $timeout) {

$scope.items = items;
$scope.step = null;

var paths  = [];
var steps = {};

function addStep(config) {
  steps[config.id] = config;
}

function ready() {
  if (!items.step) {
    throw new Error('Caller must provide "step"');
  }
  goTo(items.step, items.config);
}

/**
 * Closes the dialog and navigates to 'items.goToLocation' if available or to @path
 * argument provided by caller.
 */
function close(path) {
  $location.path($scope.items.path || path);
  $modalInstance.close();
}

function goTo(stepId, config) {
  var step = $scope.step;
  if (step) {
    rememberCurrentState();
  }
  var nextStep = steps[stepId];
  if (!nextStep) {
    throw new Error('No step with id ('+stepId+') exists');
  }
  angular.extend($scope, scopeDefaults);
  initNextState(nextStep, config);
  if (step) {
    paths.push(step);
  }
  $scope.step = nextStep;
}

function rememberCurrentState() {
  var step = $scope.step;
  angular.forEach(step.$scope, function(value, key) {
    if (!angular.isFunction($scope[key])) {
      if (angular.isObject($scope[key]) || angular.isArray($scope[key])) {
        step.$scope[key] = angular.copy($scope[key]);
      }
      else {
        step.$scope[key] = $scope[key];
      }
    }
  });
}

function initNextState(nextStep, config) {
  if (angular.isObject(config)) {
    angular.extend(nextStep, config);
  }
  angular.extend($scope, nextStep.$scope);
  if (angular.isFunction(nextStep.initialize)) {
    nextStep.initialize($scope);
  }
  if (nextStep.template && !nextStep.templateURL) {
    var templateURL = nextStep.id + '-login-wizard-auto-generated-template.html';
    nextStep.templateURL = templateURL;
    if (!$templateCache.get(templateURL)) {
      var template = angular.isArray(nextStep.template) ? nextStep.template.join('') : nextStep.template;
      $templateCache.put(templateURL, template);
    }
  }
}

function goBack() {
  rememberCurrentState();
  var previousStep = paths.pop();
  if (!previousStep) {
    throw new Error('Something is wrong there is no previous step');
  }
  angular.extend($scope, scopeDefaults);
  initNextState(previousStep);
  $scope.step = previousStep;
}

var scopeDefaults = {
  title: '',
  description: '',
  $cancelButtonDisabled: function () {
    return false;
  },
  $cancelButtonLabel: 'Cancel',
  $cancelButtonClick: function () {
    $modalInstance.dismiss();
  },
  $nextButtonDisabled: function () {
    return false;
  },
  $nextButtonLabel: 'Continue',
  $nextButtonClick: function () {
    throw new Error('Current step did not provide "$nextButtonClick" handler');
  },
  $backButtonDisabled: function () {
    return false;
  },
  $backButtonLabel: 'Back',
  $backButtonClick: function () {
    goBack();
  },
  backupWallet: function () {
    var encrypted = KeyService.toString();
    var blob      = new Blob([encrypted], {type: "text/plain;charset=utf-8"});
    saveAs(blob, 'wallet.dat');
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

    /* only if using a word list of 7776 words or longer can we use 10 words,
       otherwise use 12 words */
    if (dice_words.length >= 7776) {
      words = words.slice(0, 10);
    }
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

function identifierIsAvailable(api, identifier) {
  var deferred = $q.defer();
  var args = {
    identifier: identifier,
    includeLessors: 'false',
    includeAssets: 'false',
    includeCurrencies: 'false',
    requestType: 'getAccountByIdentifier'
  };
  api.engine.socket().callAPIFunction(args).then(
    function (data) {
      if (data.errorDescription && data.errorDescription == "Unknown identifier") {
        deferred.resolve(true);
      }
      else {
        deferred.resolve(false);
      }
    },
    deferred.reject
  );
  return deferred.promise;
}

function createRegistrationURL(identifier, signature, signatory, publicKey, captcha) {
  return 'https://cloud.mofowallet.org:3001/api/register/'+identifier+'/'+signature+'/'+signatory+'/'+publicKey+'/'+captcha;
}

function registerIdentifier(api, secretPhrase, identifier, captcha) {
  var deferred = $q.defer();
  var signatory = api.crypto.getAccountId(secretPhrase, true);
  var signature = nxt.util.sign(identifier, secretPhrase);
  var publicKey = api.crypto.secretPhraseToPublicKey(secretPhrase);
  var url       = createRegistrationURL(identifier, signature, signatory, publicKey, captcha);

  $http({ url: url, method: 'GET' }).success(
    function (data) {
      console.log(data);
      deferred.resolve(data);
    }
  ).error(deferred.reject);

  return deferred.promise;
}

function createRegisterCustomEmailURL(identifier, signature, signatory, publicKey, captcha) {
  return 'https://cloud.mofowallet.org:3001/api/registercustom/'+identifier+'/'+signature+'/'+signatory+'/'+publicKey+'/'+captcha;
}

function registerCustomEmail(api, secretPhrase, identifier, captcha) {
  var deferred = $q.defer();
  var signatory = api.crypto.getAccountId(secretPhrase, true);
  var signature = nxt.util.sign(identifier, secretPhrase);
  var publicKey = api.crypto.secretPhraseToPublicKey(secretPhrase);
  var url       = createRegisterCustomEmailURL(identifier, signature, signatory, publicKey, captcha);

  $http({ url: url, method: 'GET' }).success(
    function (data) {
      console.log(data);
      deferred.resolve(data);
    }
  ).error(deferred.reject);

  return deferred.promise;
}

function createFaucetURL(email, account, publickey) {
  return 'https://cloud.mofowallet.org:3001/api/faucet/'+email+'/'+account+'/'+publickey;
}

function applyForFaucet(api, secretPhrase, email) {
  var deferred = $q.defer();
  var account   = api.crypto.getAccountId(secretPhrase, true);
  var publicKey = api.crypto.secretPhraseToPublicKey(secretPhrase);
  var url       = createFaucetURL(email, account, publicKey);

  $http({ url: url, method: 'GET' }).success(
    function (data) {
      console.log(data);
      deferred.resolve(data);
    }
  ).error(deferred.reject);

  return deferred.promise;
}

addStep({
  id: 'signin',
  initialize: function () {
    $scope.configureDisabled = !KeyService.walletExists();
  },
  $scope: {
    title: $translate.instant('translate.signin_title'),
    openLabel: $translate.instant('translate.signin_open'),
    createLabel: $translate.instant('translate.signin_create'),
    enterLabel: $translate.instant('translate.signin_enter'),
    configureLabel: $translate.instant('translate.signin_configure'),
    configureDisabled: false,
    openWalletClick: function ($event) {  goTo('openWallet') },
    newAccountClick: function ($event) {  goTo('newAccount') },
    enterSecretClick: function ($event) { goTo('enterSecret') },
    configurateWallet: function ($event) { goTo('configurateWallet') }
  },
  template: [
    '<div class="row">',
      '<div class="col-xs-6">',
        '<button class="btn btn-block btn-primary" ng-click="openWalletClick($event)" style="margin-bottom: 8px">',
          '<i class="fa fa-unlock fa-2x fa-fw"></i><br><span ng-bind="openLabel"></span>',
        '</button>',
      '</div>',
      '<div class="col-xs-6">',
        '<button class="btn btn-block" ng-click="newAccountClick($event)" style="margin-bottom: 8px">',
          '<i class="fa fa-plus fa-2x fa-fw"></i><br><span ng-bind="createLabel"></span>',
        '</button>',
      '</div>',
      '<div class="col-xs-6">',
        '<button class="btn btn-block" ng-click="enterSecretClick($event)" style="margin-bottom: 8px">',
          '<i class="fa fa-pencil-square-o fa-2x fa-fw"></i><br><span ng-bind="enterLabel"></span>',
        '</button>',
      '</div>',
      '<div class="col-xs-6">',
        '<button class="btn btn-block" ng-click="configurateWallet($event)" ng-disabled="configureDisabled" style="margin-bottom: 8px">',
          '<i class="fa fa-cogs fa-2x fa-fw"></i><br><span ng-bind="configureLabel"></span>',
        '</button>',
      '</div>',
    '</div>'
  ],
  buttons: {
    cancel: true
  }
});

addStep({
  id: 'newAccount',
  initialize: function ($scope) {
    $scope.walletExists = KeyService.walletExists();
    $scope.walletUnlocked = KeyService.wallet && !KeyService.wallet.fileName;
    $scope.stage = 0;
    $scope.advanced = false; // Set 'advanced' to true to enable 'normal' account creation
    $scope.description = $scope.advanced ? $scope.descriptionAdvancedStage0 : $scope.descriptionStandardStage0;
    if (KeyService.wallet && !KeyService.wallet.fileName) {
      $scope.input.password = KeyService.wallet.password;
    }
    $scope.showWrongPasswordAlert = false;
    $scope.registerIdentifierErrorMessage = null;
    $scope.applyForFaucetErrorMessage = null;
    $scope.nextSecretPhrase();
    $scope.showSaveSuccess = false;
  },
  $scope: {
    title: $translate.instant('translate.newAccount_title'),
    input: {
      host: 'fimk.fi',
      name: '',
      password: '',
      passwordConfirm: '',
      secretPhraseRotatorIndex: null,
      secretPhrase: null,
      secretPhraseRotator: [],
      secret_clipped: false,
      secretStoredConfirmed: false,
      id_rs: '',
      nameIsNotAvailable: undefined,
      nameLookupInProgress: false,
      captcha: '',
      verification_email: '',
      standardEmail: true,
      customEmail: '',
      invalidEmail: false
    },
    advanced: false,
    stage: 0,
    showSaveSuccess: false,
    showBackupWalletControls: false,
    showWrongPasswordAlert: false,
    invalidEmailWarningLabel: $translate.instant('translate.invalid_email'),
    nameFieldPlaceholder: $translate.instant('translate.newAccount_name'),
    customEmailFieldPlaceholder: $translate.instant('translate.custom_email_address'),
    passwordFieldPlaceHolder: $translate.instant('translate.newAccount_password'),
    passwordConfirmFieldPlaceHolder: $translate.instant('translate.newAccount_passwordConfirm'),
    verificationEmailFieldPlaceholder: $translate.instant('translate.newAccount_verificationEmail'),
    advancedLabel: $translate.instant('translate.newAccount_advanced'),
    normalLabel: $translate.instant('translate.newAccount_normal'),
    secretPhraseLabel: $translate.instant('translate.newAccount_secretPhrase'),
    accountIdLabel: $translate.instant('translate.newAccount_accountId'),
    passwordConfirmWarningLabel: $translate.instant('translate.newAccount_passwordConfirmWarning'),
    nameNotAvailableWarningLabel: $translate.instant('translate.newAccount_nameNotAvailableWarning'),
    registerIdentifierErrorMessage: null,
    applyForFaucetErrorMessage: null,
    descriptionStandardStage0: $translate.instant('translate.newAccount_descriptionStandardStage0'),
    descriptionStandardStage1: $translate.instant('translate.newAccount_descriptionStandardStage1'),
    //descriptionStandardStage2: $translate.instant('translate.newAccount_descriptionStandardStage2'),
    descriptionAdvancedStage0: $translate.instant('translate.newAccount_descriptionAdvancedStage0'),
    descriptionAdvancedStage1: null,
    descriptionAdvancedStage2: null,
    createWalletDescription:   $translate.instant('translate.newAccount_createWalletDescription'),
    unlockWalletDescription:   $translate.instant('translate.newAccount_unlockWalletDescription'),
    backupUnlockedWalletDescription: $translate.instant('translate.newAccount_backupUnlockedWalletDescription'),
    saveToUnlockedWalletDescription: $translate.instant('translate.newAccount_saveToUnlockedWalletDescription'),
    saveToWalletButtonLabel: $translate.instant('translate.newAccount_saveToWallet'),
    unlockButtonLabel: $translate.instant('translate.newAccount_unlock'),
    createButtonLabel: $translate.instant('translate.newAccount_create'),
    backupWalletButtonLabel: $translate.instant('translate.newAccount_backupWallet'),
    savedSuccessAlertContents: $translate.instant('translate.newAccount_savedSuccess'),
    getIdentifier: function () {
      if ($scope.input.standardEmail) {
        return $scope.input.name + '@' + $scope.input.host;
      }
      return $scope.input.customEmail;
    },
    nameChanged: function () {
      $scope.input.nameIsNotAvailable = undefined;
      $scope.input.invalidEmail = undefined;
      if (!$scope.input.standardEmail) {
        if (!/(.+)@(.+)\.(.+){2,}/.test($scope.input.customEmail)) {
          $scope.input.invalidEmail = true;
          return;
        }
      }
      $scope.input.nameLookupInProgress = true;
      var api = nxt.fim();
      identifierIsAvailable(api, $scope.getIdentifier()).then(function (available) {
        $scope.$evalAsync(function () {
          $scope.input.nameIsNotAvailable = !available;
          $scope.input.nameLookupInProgress = false;
        });
      });
    },
    $nextButtonDisabled: function () {
      if ($scope.stage==0)
        return $scope.advanced ? $scope.nextButtonDisabledAdvancedStage0() : $scope.nextButtonDisabledStandardStage0();
      else if ($scope.stage==1)
        return $scope.advanced ? $scope.nextButtonDisabledAdvancedStage1() : $scope.nextButtonDisabledStandardStage1();
      else
        return $scope.advanced ? $scope.nextButtonDisabledAdvancedStage2() : $scope.nextButtonDisabledStandardStage2();
    },
    nextButtonDisabledStandardStage0: function () {
      if ($scope.input.standardEmail) {
        if (!$scope.input.password || !$scope.input.name)
          return true;
      }
      else {
        if (!$scope.input.password || !$scope.input.customEmail || $scope.input.invalidEmail)
          return true;
      }
      if (!$scope.walletExists && $scope.input.password!=$scope.input.passwordConfirm)
        return true;
      if ($scope.input.nameIsNotAvailable !== false)
        return true;
    },
    nextButtonDisabledStandardStage1: function () {
      return !$scope.input.secretPhrase || !$scope.input.secretStoredConfirmed || !$scope.input.captcha;
    },
    nextButtonDisabledStandardStage2: function () {
      return false; //!$scope.input.verification_email;
    },
    nextButtonDisabledAdvancedStage0: function () {
      return !$scope.input.secretPhrase || !$scope.input.secretStoredConfirmed
    },
    nextButtonDisabledAdvancedStage1: function () {
      return !$scope.showSaveSuccess;
    },
    nextButtonDisabledAdvancedStage2: function () {
    },
    $nextButtonClick: function () {
      if ($scope.stage==0)
        $scope.advanced ? $scope.nextButtonClickAdvancedStage0() : $scope.nextButtonClickStandardStage0();
      else if ($scope.stage==1)
        $scope.advanced ? $scope.nextButtonClickAdvancedStage1() : $scope.nextButtonClickStandardStage1();
      else
        $scope.advanced ? $scope.nextButtonClickAdvancedStage2() : $scope.nextButtonClickStandardStage2();
    },
    unlockWallet: function () {
      $scope.showWrongPasswordAlert = false;
      if (KeyService.wallet && !KeyService.wallet.fileName) {
        return KeyService.wallet;
      }
      else if (KeyService.walletExists()) {
        var wallet = KeyService.unlock($scope.input.password);
        if (!wallet) {
          $scope.showWrongPasswordAlert = true;
          return null;
        }
        UserService.setCurrentWallet(wallet);
        return wallet;
      }
      var wallet = KeyService.create($scope.input.password);
      wallet.save();
      UserService.setCurrentWallet(wallet);
      return wallet;
    },
    addToWallet: function () {
      KeyService.wallet.add($scope.input.id_rs, $scope.input.secretPhrase);
      UserService.refresh($scope.input.id_rs);
      $scope.showSaveSuccess = true;
      $scope.showBackupWalletControls = true;
    },
    createWallet: function () {
      var wallet = KeyService.create($scope.input.password);
      wallet.save();
      UserService.setCurrentWallet(wallet);
      KeyService.wallet.add($scope.input.id_rs, $scope.input.secretPhrase);
      UserService.refresh($scope.input.id_rs);
      $scope.showSaveSuccess = true;
      $scope.showBackupWalletControls = true;
    },
    nextButtonClickStandardStage0: function () {
      var wallet = $scope.unlockWallet();
      if (wallet) {
        $scope.stage=1;
        $scope.updateDescription();
        if ($scope.input.secretPhrase == null) {
          $scope.nextSecretPhrase();
        }
        $scope.input.secret_clipped = false;
        $scope.input.secretStoredConfirmed = false;
        $scope.input.captcha = '';
      }
    },
    nextButtonClickStandardStage1: function () {

      /* Add the secret phrase to the wallet */
      KeyService.wallet.add($scope.input.id_rs, $scope.input.secretPhrase);
      UserService.refresh($scope.input.id_rs);


      if ($scope.input.standardEmail) {
        /* Register the identifier */
        $scope.registerIdentifierErrorMessage = null;
        var api = nxt.fim();
        registerIdentifier(api, $scope.input.secretPhrase, $scope.getIdentifier(), $scope.input.captcha).then(
          function (data) {
            $scope.$evalAsync(function () {
              if (data.success) {
                $scope.stage=2;
                $scope.$nextButtonLabel = 'Sign in';
                $scope.updateDescription();
              }
              else {
                $scope.registerIdentifierErrorMessage = data.error || JSON.stringify(data);
              }
            });
          }
        );
      }
      else {
        /* Request that a verification is being send to the custom email */
        var api = nxt.fim();
        registerCustomEmail(api, $scope.input.secretPhrase, $scope.getIdentifier(), $scope.input.captcha).then(
          function (data) {
            $scope.$evalAsync(function () {
              if (data.success) {
                $scope.stage=2;
                $scope.$nextButtonLabel = 'Sign in';
                $scope.updateDescription();
              }
              else {
                $scope.registerIdentifierErrorMessage = data.error || JSON.stringify(data);
              }
            });
          }
        );
      }
    },
    $backButtonDisabled: function () {
      return $scope.stage==2 && !$scope.advanced;
    },
    nextButtonClickStandardStage2: function () {
      UserService.setCurrentAccount({id_rs: $scope.input.id_rs, secretPhrase: $scope.input.secretPhrase});
      close('/accounts/'+$scope.input.id_rs+'/activity/latest');
      //close('/messenger/FIM-R4X4-KMHT-RCXD-CLGFZ');
      // /* Contact the faucet for free FIMK */
      // $scope.applyForFaucetErrorMessage = null;
      // var api = nxt.fim();
      // applyForFaucet(api, $scope.input.secretPhrase, $scope.input.verification_email).then(
      //   function (data) {
      //     console.log('faucet response', data);
      //     $scope.$evalAsync(function () {
      //       if (data.success) {
      //         $scope.description = $translate.instant('translate.newAccount_checkemail');
      //         $scope.$nextButtonLabel = $translate.instant('translate.close');
      //         $scope.$nextButtonClick = $scope.$cancelButtonClick;
      //         $scope.$backButtonDisabled = function () { return true }
      //       }
      //       else {
      //         $scope.applyForFaucetErrorMessage = data.error || JSON.stringify(data);
      //       }
      //     });
      //   }
      // );
    },
    nextButtonClickAdvancedStage0: function () {
      $scope.stage=1;
      $scope.updateDescription();
      $scope.walletExists = KeyService.walletExists();
      $scope.walletUnlocked = KeyService.wallet && !KeyService.wallet.fileName;
      $scope.showSaveSuccess = false;
      $scope.showBackupWalletControls = false;
      $scope.showWrongPasswordAlert = false;
    },
    nextButtonClickAdvancedStage1: function () {
      UserService.setCurrentAccount({id_rs: $scope.input.id_rs, secretPhrase: $scope.input.secretPhrase});
      close('/accounts/'+$scope.input.id_rs+'/activity/latest');
    },
    nextButtonClickAdvancedStage2: function () {
    },
    $backButtonClick: function () {
      if ($scope.stage==0) {
        goBack();
      }
      else if ($scope.stage==1) {
        $scope.stage=0;
        $scope.updateDescription();
      }
      else {
        $scope.stage=1;
        $scope.$nextButtonLabel = scopeDefaults.$nextButtonLabel;
        $scope.updateDescription();
      }
    },
    toggleAdvanced: function () {
      $scope.advanced = !$scope.advanced;
      $scope.updateDescription();
    },
    updateDescription: function () {
      if ($scope.stage==0)
        $scope.description = $scope.advanced ? $scope.descriptionAdvancedStage0 : $scope.descriptionStandardStage0;
      else if ($scope.stage==1)
        $scope.description = $scope.advanced ? $scope.descriptionAdvancedStage1 : $scope.descriptionStandardStage1;
      else {
        if ($scope.input.standardEmail) {
          $scope.description = $scope.advanced ? $scope.descriptionAdvancedStage2 : $translate.instant('translate.newAccount_descriptionStandardStage2', {
            accountRS: $scope.input.id_rs, accountEmail: $scope.getIdentifier()
          });
        }
        else {
          $scope.description = $scope.advanced ? $scope.descriptionAdvancedStage2 : $translate.instant('translate.newCustomAccount_descriptionStandardStage2', {
            accountRS: $scope.input.id_rs, accountEmail: $scope.getIdentifier()
          });
        }
      }
    },
    nextSecretPhrase: function () {
      $scope.input.secret_clipped = false;
      $scope.input.id_rs_clipped = false;
      $scope.input.secretStoredConfirmed = false;
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
        var api = nxt.fim();
        $scope.input.id_rs = api.crypto.getAccountId($scope.input.secretPhrase, true);
        $scope.input.secretPhrase = $scope.input.secretPhraseRotator[$scope.input.secretPhraseRotatorIndex];
      }
      else {
        generatePassphrase().then(
          function (passphrase) {
            $scope.$evalAsync(function () {
              $scope.input.secretPhraseRotator.push(passphrase);
              $scope.input.secretPhrase = passphrase;
              var api = nxt.fim();
              $scope.input.id_rs = api.crypto.getAccountId($scope.input.secretPhrase, true);
            });
          }
        );
      }
    },
    previousSecretPhrase: function () {
      $scope.input.secret_clipped = false;
      $scope.input.secretStoredConfirmed = false;
      $scope.input.secretPhraseRotatorIndex--;
      $scope.input.secretPhrase = $scope.input.secretPhraseRotator[$scope.input.secretPhraseRotatorIndex];
      var api = nxt.fim();
      $scope.input.id_rs = api.crypto.getAccountId($scope.input.secretPhrase, true);
    },
    captchaExpiredCallback: function () {
      /* implement me (if needed at all) */
    }
  },
  template: [
    // -------------------------------------------------
    // FIMK standard new account
    '<div ng-show="!advanced">',
      // Stage 0
      // Enter name and wallet password
      // ------------------------------------------------
      '<div ng-show="stage==0">',
        '<div class="row">',
          '<div class="col-md-12">',
            '<div class="alert alert-warning" ng-show="showWrongPasswordAlert" style="margin-bottom:10px">',
              '<i class="fa fa-exclamation-triangle fa-fw"></i>&nbsp;<span translate="translate.wrong_password"></span>',
            '</div>',
          '</div>',
        '</div>',
        '<div class="row">',
          '<div class="col-md-12">',
            '<div class="form-group">',
              '<span class="pull-right">',
                '<span class="text-danger" ng-bind="nameNotAvailableWarningLabel" ng-show="input.nameIsNotAvailable"></span>',
                '<span class="text-danger" ng-bind="invalidEmailWarningLabel" ng-show="input.invalidEmail"></span>',
                '<span class="text-success" ng-show="input.nameIsNotAvailable===false"><i class="fa fa-check"></i></span>',
                '<span ng-show="input.nameLookupInProgress"><i class="fa fa-refresh fa-spin"></i></span>',
              '</span>',
              '<label>User name</label>',
              '<div class="input-group" ng-if="input.standardEmail">',
                '<input type="text" class="form-control" ng-model="input.name" placeholder="{{nameFieldPlaceholder}}" ng-change="nameChanged()">',
                '<span class="input-group-addon font-bold" style="width:40%;text-align:left">@<span ng-bind="input.host"></span></span>',
                '<div class="input-group-btn">',
                  '<div class="btn-group" uib-dropdown>',
                    '<button type="button" class="btn btn-default" uib-dropdown-toggle>', // style="min-width:200px;text-align:left"
                      '<span class="pull-right"><span class="caret"></span></span>',
                    '</button>',
                    '<ul class="uib-dropdown-menu dropdown-menu-right" role="menu">',
                      '<li role="menuitem"><a href ng-click="input.host=\'fimk.fi\';nameChanged()">{{input.name}}@fimk.fi</a></li>',
                      '<li role="menuitem"><a href ng-click="input.host=\'lompsa.com\';nameChanged()">{{input.name}}@lompsa.com</a></li>',
                    '</ul>',
                  '</div>',
                '</div>',
              '</div>',
              '<div ng-if="!input.standardEmail">',
                '<input type="text" class="form-control" ng-model="input.customEmail" placeholder="{{customEmailFieldPlaceholder}}" ng-change="nameChanged()">',
              '</div>',
              '<div>',
                '<a href ng-click="input.standardEmail=true" translate="translate.use_standard_email" ng-show="!input.standardEmail"></a>',
                '<a href ng-click="input.standardEmail=false" translate="translate.use_custom_email" ng-show="input.standardEmail"></a>',
              '</div>',
            '</div>',
            '<div class="form-group">',
              '<span class="pull-right text-danger" ng-bind="passwordConfirmWarningLabel" ng-show="!walletExists && input.password && input.password!=input.passwordConfirm"></span>',
              '<label>Wallet password</label>',
              '<input class="form-control monospace" ng-model="input.password" type="password" placeholder="{{passwordFieldPlaceholder}}">',
              '<input class="form-control monospace" ng-model="input.passwordConfirm" type="password" placeholder="{{passwordConfirmFieldPlaceholder}}" ng-if="!walletExists" style="margin-top:8px">',
            '</div>',
          '</div>',
        '</div>',
        '<div class="row">',
          '<div class="col-md-12">',
            '<div class="form-group">',
              '<a href class="pull-right" ng-click="toggleAdvanced()" ng-bind="advancedLabel">advanced</a>',
            '</div>',
          '</div>',
        '</div>',
      '</div>',
      // Stage 1
      // write down secretphrase and solve captcha
      '<div ng-show="stage==1">',
        '<div class="row">',
          '<div class="col-md-12">',
            '<div class="alert alert-warning" ng-show="registerIdentifierErrorMessage" style="margin-bottom:10px">',
              '<i class="fa fa-exclamation-triangle fa-fw"></i>&nbsp;<span ng-bind="registerIdentifierErrorMessage"></span>',
            '</div>',
          '</div>',
        '</div>',
        '<div class="form-group">',
          '<span class="pull-right">',
            '<span ng-if="input.secretPhraseRotatorIndex>1">&nbsp;&nbsp;<a href ng-click="previousSecretPhrase()"><i class="fa fa-step-backward"></i></a></span>',
            '&nbsp;&nbsp;<a href ng-click="nextSecretPhrase()"><i class="fa fa-step-forward"></i></a>',
          '</span>',
          '<label ng-bind="secretPhraseLabel"></label>',
          '<div class="input-group">',
            '<textarea class="form-control monospace" rows="2" ng-model="input.secretPhrase" readonly></textarea>',
            // browser clipboard
            '<span class="input-group-addon btn btn-default" type="button" ng-if="!isNodeJS" clip-copy="input.secretPhrase" clip-click="input.secret_clipped=true;">',
              '<i class="fa fa-fw" ng-class="{\'fa-check\':input.secret_clipped,\'fa-clipboard\':!input.secret_clipped}"></i>&nbsp;<span translate="translate.copy"></span></span>',
            // nwjs clipboard
            '<span class="input-group-addon btn btn-default" type="button" ng-if="isNodeJS" ng-click="clipboardCopy(input.secretPhrase); input.secret_clipped=true;">',
              '<i class="fa fa-fw" ng-class="{\'fa-check\':a.__secret_clipped,\'fa-clipboard\':!input.secret_clipped}"></i>&nbsp;<span translate="translate.copy"></span></span>',
          '</div>',
        '</div>',
        '<div class="form-group">',
          '<div class="checkbox" style="margin-top: 8px">',
            '<label>',
              '<input type="checkbox" ng-model="input.secretStoredConfirmed" ng-disabled="!input.secretPhrase">&nbsp;',
              '<span translate="translate.checkbox_confirm_secret_saved"></span>',
            '</label>',
          '</div>',
        '</div>',
        '<div class="form-group">',
          '<no-captcha expired-callback="captchaExpiredCallback" g-recaptcha-response="input.captcha" theme="light" style="margin-top: 8px"></no-captcha>',
        '</div>',
      '</div>',
      // Stage 2
      // enter email address get free FIMK
      '<div ng-show="stage==2">',
        '<div class="row">',
          '<div class="col-md-12">',
            '<div class="alert alert-warning" ng-show="applyForFaucetErrorMessage" style="margin-bottom:10px">',
              '<i class="fa fa-exclamation-triangle fa-fw"></i>&nbsp;<span ng-bind="applyForFaucetErrorMessage"></span>',
            '</div>',
          '</div>',
        '</div>',
        // '<div class="row">',
        //   '<div class="col-md-12">',
        //     '<div class="form-group">',
        //       '<label>Email address</label>',
        //       '<input type="text" class="form-control" ng-model="input.verification_email" placeholder="{{verificationEmailFieldPlaceholder}}">',
        //     '</div>',
        //   '</div>',
        // '</div>',
      '</div>',
    '</div>',
    // Advanced create account
    '<div ng-show="advanced">',
      // Stage 0
      // Select a new secret phrase
      '<div ng-show="stage==0">',
        '<div class="row">',
          '<div class="col-md-12">',
            '<div class="form-group">',
              '<span class="pull-right">',
                '<span ng-if="input.secretPhraseRotatorIndex>1">&nbsp;&nbsp;<a href ng-click="previousSecretPhrase()"><i class="fa fa-step-backward"></i></a></span>',
                '&nbsp;&nbsp;<a href ng-click="nextSecretPhrase()"><i class="fa fa-step-forward"></i></a>',
              '</span>',
              '<label ng-bind="secretPhraseLabel"></label>',
              '<div class="input-group">',
                '<textarea class="form-control monospace" rows="2" ng-model="input.secretPhrase" readonly></textarea>',
                // browser clipboard
                '<span class="input-group-addon btn btn-default" type="button" ng-if="!isNodeJS" clip-copy="input.secretPhrase" clip-click="input.secret_clipped=true;">',
                  '<i class="fa fa-fw" ng-class="{\'fa-check\':input.secret_clipped,\'fa-clipboard\':!input.secret_clipped}"></i>&nbsp;<span translate="translate.copy"></span></span>',
                // nwjs clipboard
                '<span class="input-group-addon btn btn-default" type="button" ng-if="isNodeJS" ng-click="clipboardCopy(input.secretPhrase); input.secret_clipped=true;">',
                  '<i class="fa fa-fw" ng-class="{\'fa-check\':input.secret_clipped,\'fa-clipboard\':!input.secret_clipped}"></i>&nbsp;<span translate="translate.copy"></span></span>',
              '</div>',
            '</div>',
            '<div class="form-group">',
              '<label ng-bind="accountIdLabel"></label>',
              '<div class="input-group">',
                '<span class="form-control monospace" ng-bind="input.id_rs"></span>',
                // browser clipboard
                '<span class="input-group-addon btn btn-default" type="button" ng-if="!isNodeJS" clip-copy="input.id_rs" clip-click="input.id_rs_clipped=true;">',
                  '<i class="fa fa-fw" ng-class="{\'fa-check\':input.id_rs_clipped,\'fa-clipboard\':!input.id_rs_clipped}"></i>&nbsp;<span translate="translate.copy"></span></span>',
                // nwjs clipboard
                '<span class="input-group-addon btn btn-default" type="button" ng-if="isNodeJS" ng-click="clipboardCopy(input.id_rs); input.id_rs_clipped=true;">',
                  '<i class="fa fa-fw" ng-class="{\'fa-check\':input.id_rs_clipped,\'fa-clipboard\':!input.id_rs_clipped}"></i>&nbsp;<span translate="translate.copy"></span></span>',
              '</div>',
            '</div>',
            '<div class="form-group">',
              '<div class="checkbox" style="margin-top: 8px">',
                '<label>',
                  '<input type="checkbox" ng-model="input.secretStoredConfirmed" ng-disabled="!input.secretPhrase">&nbsp;',
                  '<span translate="translate.checkbox_confirm_secret_saved"></span>',
                '</label>',
              '</div>',
            '</div>',
          '</div>',
        '</div>',
        '<div class="row">',
          '<div class="col-md-12">',
            '<div class="form-group">',
              '<a href class="pull-right" ng-click="toggleAdvanced()" ng-bind="normalLabel"></a>',
            '</div>',
          '</div>',
        '</div>',
      '</div>',
      // Stage 1
      // Save secret to wallet
      '<div ng-show="stage==1">',
        // wallet is unlocked - save on click
        '<div class="row" ng-show="walletUnlocked && walletExists">',
          '<div class="col-md-12">',
            '<div>',
              '<div class="well well-sm" ng-bind-html="saveToUnlockedWalletDescription" style="margin-bottom:10px"></div>',
              '<button class="btn btn-default" ng-click="addToWallet()" style="margin-bottom:10px" ng-disabled="showSaveSuccess">',
                '<i class="fa fa-plus fa-fw"></i>&nbsp;<span ng-bind-html="saveToWalletButtonLabel"></span>',
              '</button>',
            '</div>',
            '<div ng-show="showSaveSuccess">',
              '<div class="well well-sm" ng-bind-html="backupUnlockedWalletDescription" style="margin-bottom:10px"></div>',
              '<button class="btn btn-default" ng-click="backupWallet()">',
                '<i class="fa fa-floppy-o fa-fw"></i>&nbsp;<span ng-bind-html="backupWalletButtonLabel"></span>',
              '</button>',
            '</div>',
          '</div>',
        '</div>',
        // wallet is locked
        '<div class="row" ng-show="!walletUnlocked && walletExists">',
          '<div class="col-md-12">',
            '<div class="well well-sm" ng-bind-html="unlockWalletDescription" style="margin-bottom:10px"></div>',
            '<div class="alert alert-success" ng-show="showSaveSuccess" style="margin-bottom:10px">',
              '<i class="fa fa-check fa-fw"></i>&nbsp;<span>{{savedSuccessAlertContents}}</span>',
            '</div>',
            '<div class="form-group">',
              '<span class="input-group">',
                '<input class="form-control" type="password" placeholder="{{passwordFieldPlaceHolder}}" ng-model="input.password" ng-disabled="showSaveSuccess">',
                '<span class="input-group-btn">',
                  '<button ng-if="!showSaveSuccess" class="btn btn-primary" type="button" ng-click="unlockWallet() && addToWallet()" ng-disabled="!input.password || showSaveSuccess"><i class="fa fa-floppy-o fa-fw"></i>&nbsp;&nbsp;{{unlockButtonLabel}}</button>',
                  '<button ng-if="showBackupWalletControls" class="btn btn-default" ng-click="backupWallet()">',
                    '<i class="fa fa-floppy-o fa-fw"></i>&nbsp;<span ng-bind-html="backupWalletButtonLabel"></span>',
                  '</button>',
                '</span>',
              '</span>',
            '</div>',
          '</div>',
        '</div>',
        // wallet does not exist - must provide password twice
        '<div class="row" ng-show="!walletUnlocked && !walletExists">',
          '<div class="col-md-12">',
            '<div class="well well-sm" ng-bind-html="createWalletDescription" style="margin-bottom:10px"></div>',
            '<div class="alert alert-success" ng-show="showSaveSuccess" style="margin-bottom:10px">',
              '<i class="fa fa-check fa-fw"></i>&nbsp;<span>{{savedSuccessAlertContents}}</span>',
            '</div>',
            '<div class="form-group">',
              '<input class="form-control" type="password" placeholder="{{passwordFieldPlaceHolder}}" ng-model="input.password" ng-disabled="showSaveSuccess">',
            '</div>',
            '<div class="form-group">',
              '<span class="input-group">',
                '<input class="form-control" type="password" placeholder="{{passwordConfirmFieldPlaceHolder}}" ng-model="input.passwordConfirm" ng-disabled="showSaveSuccess">',
                '<span class="input-group-btn">',
                  '<button ng-if="!showSaveSuccess" class="btn btn-primary" type="button" ng-click="createWallet()" ng-disabled="!input.password || showSaveSuccess || input.password != input.passwordConfirm"><i class="fa fa-floppy-o fa-fw"></i>&nbsp;&nbsp;{{createButtonLabel}}</button>',
                  '<button ng-if="showBackupWalletControls" class="btn btn-default" ng-click="backupWallet()">',
                    '<i class="fa fa-floppy-o fa-fw"></i>&nbsp;<span ng-bind-html="backupWalletButtonLabel"></span>',
                  '</button>',
                '</span>',
              '</span>',
            '</div>',
          '</div>',
        '</div>',
      '</div>',
      // Stage 2
      // Account created secret saved to wallet



    '</div>',
  ],
  buttons: {
    cancel: true,
    back: true,
    next: true
  }
});
/* enterSecret */
addStep({
  id: 'enterSecret',
  initialize: function ($scope) {
    $scope.engines = [];
    $scope.engines.push({ engine: 'fim', imgSrc: 'images/fimk-coin.png', label: 'FIMK' });
    //$scope.engines.push({ engine: 'nxt', imgSrc: 'images/nxt-coin.png', label: 'NXT' });

    $scope.showSaveSuccess = false;
    $scope.showWrongPasswordAlert = false;
    $scope.showSaveSecretControls = false;
    $scope.showBackupWalletControls = false;

    $scope.walletExists = KeyService.walletExists();
    $scope.walletUnlocked = KeyService.wallet && !KeyService.wallet.fileName;
  },
  $scope: {
    title: $translate.instant('translate.enterSecret_title'),
    textareaPlaceholder: $translate.instant('translate.enterSecret_placeholder'),
    accountIdLabel: $translate.instant('translate.enterSecret_accountId'),
    $nextButtonLabel: $translate.instant('translate.enterSecret_signin'),
    addToWalletButtonLabel: $translate.instant('translate.enterSecret_addToWallet'),
    createWalletDescription: $translate.instant('translate.enterSecret_createWalletDescription'),
    unlockWalletDescription: $translate.instant('translate.enterSecret_unlockWalletDescription'),
    passwordFieldPlaceHolder: $translate.instant('translate.enterSecret_password'),
    passwordConfirmFieldPlaceHolder: $translate.instant('translate.enterSecret_passwordConfirm'),
    unlockButtonLabel: $translate.instant('translate.enterSecret_unlock'),
    createButtonLabel: $translate.instant('translate.enterSecret_create'),
    backupWalletButtonLabel: $translate.instant('translate.enterSecret_backupWallet'),
    savedSuccessAlertContents: $translate.instant('translate.enterSecret_savedSuccess'),
    showWrongPasswordAlert: false,
    showSaveSuccess: false,
    walletExists: false,
    walletUnlocked: false,
    input: {
      engine: 'fim',
      secretPhrase: '',
      id_rs: '',
      password: '',
      passwordConfirm: ''
    },
    secretPhraseChanged: function () {
      var api = nxt.get($scope.input.engine);
      var id_rs = api.crypto.getAccountId($scope.input.secretPhrase, true);
      $scope.input.id_rs = id_rs;
    },
    unlock: function () {
      var wallet = KeyService.unlock($scope.input.password);
      if (wallet) {
        $scope.showWrongPasswordAlert = false;
        $scope.showSaveSuccess = true;
        $scope.showBackupWalletControls = true;
        UserService.setCurrentWallet(wallet);
        KeyService.wallet.add($scope.input.id_rs, $scope.input.secretPhrase);
        UserService.refresh($scope.input.id_rs);
      }
      else {
        $scope.showWrongPasswordAlert = true;
      }
    },
    addToWallet: function () {
      KeyService.wallet.add($scope.input.id_rs, $scope.input.secretPhrase);
      UserService.refresh($scope.input.id_rs);
      $scope.showSaveSuccess = true;
      $scope.showBackupWalletControls = true;
    },
    createWallet: function () {
      var wallet = KeyService.create($scope.input.password);
      wallet.save();
      UserService.setCurrentWallet(wallet);
      KeyService.wallet.add($scope.input.id_rs, $scope.input.secretPhrase);
      UserService.refresh($scope.input.id_rs);
      $scope.showSaveSuccess = true;
      $scope.showBackupWalletControls = true;
    },
    $nextButtonDisabled: function () {
      return !$scope.input.secretPhrase;
    },
    $nextButtonClick: function () {
      UserService.setCurrentAccount({id_rs: $scope.input.id_rs, secretPhrase: $scope.input.secretPhrase});
      close('/accounts/'+$scope.input.id_rs+'/activity/latest');
      //$location.path('/accounts/'+$scope.input.id_rs+'/activity/latest');
      //$modalInstance.close();
    }
  },
  template: [
    '<div class="row">',
      '<div class="col-md-12">',
        '<div class="alert alert-warning" ng-show="showWrongPasswordAlert" style="margin-bottom:10px">',
          '<i class="fa fa-exclamation-triangle fa-fw"></i>&nbsp;<span translate="translate.wrong_password"></span>',
        '</div>',
      '</div>',
    '</div>',
    '<div class="row" ng-if="engines.length>1">',
      '<div class="col-md-12" style="margin-bottom:10px">',
        '<div class="btn-group">',
          '<label ng-repeat="b in engines" class="btn btn-default" ng-model="input.engine" btn-radio="b.engine" ng-change="secretPhraseChanged()" ng-disabled="showSaveSuccess || showSaveSecretControls">',
            '<img ng-src="{{b.imgSrc}}" style="height:18px;margin-bottom:4px">&nbsp;&nbsp;{{b.label}}',
          '</label>',
        '</div>',
      '</div>',
    '</div>',
    '<div class="row">',
      '<div class="col-md-12">',
        '<form>',
          '<div class="form-group">',
            '<textarea class="form-control" rows="3" ng-model="input.secretPhrase" placeholder="{{textareaPlaceholder}}" ng-trim="false" ng-change="secretPhraseChanged()" ng-disabled="showSaveSuccess || showSaveSecretControls"></textarea>',
            '<span ng-show="input.id_rs">',
              '<small>{{accountIdLabel}}&nbsp;<a target="_blank" href="#/accounts/{{input.id_rs}}/activity/latest" ng-bind="input.id_rs"></a>',
                '<span class="pull-right"><a href ng-click="showSaveSecretControls=!showSaveSecretControls"><i class="fa fa-plus fa-fw"></i>&nbsp;Add to wallet</a></span>',
              '</small>',
            '</span>',
          '</div>',
        '</form>',
      '</div>',
    '</div>',
    '<div ng-show="showSaveSecretControls" style="margin-top:10px">',
      // wallet is unlocked - save on click
      '<div class="row" ng-show="walletUnlocked && walletExists">',
        '<div class="col-md-12">',
          '<button class="btn" ng-class="{\'btn-success\':showSaveSuccess, \'btn-default\':!showSaveSuccess}" ng-click="addToWallet()" ng-disabled="showSaveSuccess || !input.secretPhrase">',
            '<i class="fa fa-fw" ng-class="{\'fa-plus\':!showSaveSuccess,\'fa-check\':showSaveSuccess}"></i>&nbsp;<span ng-bind-html="addToWalletButtonLabel"></span>',
          '</button>',
          '<button ng-if="showBackupWalletControls" class="btn btn-default" ng-click="backupWallet()">',
            '<i class="fa fa-floppy-o fa-fw"></i>&nbsp;<span ng-bind-html="backupWalletButtonLabel"></span>',
          '</button>',
        '</div>',
      '</div>',
      // wallet is locked
      '<div class="row" ng-show="!walletUnlocked && walletExists">',
        '<div class="col-md-12">',
          '<div class="well well-sm" ng-bind-html="unlockWalletDescription" style="margin-bottom:10px"></div>',
          '<div class="alert alert-success" ng-show="showSaveSuccess" style="margin-bottom:10px">',
            '<i class="fa fa-check fa-fw"></i>&nbsp;<span>{{savedSuccessAlertContents}}</span>',
          '</div>',
          '<div class="form-group">',
            '<span class="input-group">',
              '<input class="form-control" type="password" placeholder="{{passwordFieldPlaceHolder}}" ng-model="input.password" ng-disabled="showSaveSuccess">',
              '<span class="input-group-btn">',
                '<button ng-if="!showSaveSuccess" class="btn btn-primary" type="button" ng-click="unlock()" ng-disabled="!input.password || showSaveSuccess"><i class="fa fa-floppy-o fa-fw"></i>&nbsp;&nbsp;{{unlockButtonLabel}}</button>',
                '<button ng-if="showBackupWalletControls" class="btn btn-default" ng-click="backupWallet()">',
                  '<i class="fa fa-floppy-o fa-fw"></i>&nbsp;<span ng-bind-html="backupWalletButtonLabel"></span>',
                '</button>',
              '</span>',
            '</span>',
          '</div>',
        '</div>',
      '</div>',
      // wallet does not exist - must provide password twice
      '<div class="row" ng-show="!walletUnlocked && !walletExists">',
        '<div class="col-md-12" ng-if="!walletExists">',
          '<div class="well well-sm" ng-bind-html="createWalletDescription" style="margin-bottom:10px"></div>',
          '<div class="alert alert-success" ng-show="showSaveSuccess" style="margin-bottom:10px">',
            '<i class="fa fa-check fa-fw"></i>&nbsp;<span>{{savedSuccessAlertContents}}</span>',
          '</div>',
          '<div class="form-group">',
            '<input class="form-control" type="password" placeholder="{{passwordFieldPlaceHolder}}" ng-model="input.password" ng-disabled="showSaveSuccess">',
          '</div>',
          '<div class="form-group">',
            '<span class="input-group">',
              '<input class="form-control" type="password" placeholder="{{passwordConfirmFieldPlaceHolder}}" ng-model="input.passwordConfirm" ng-disabled="showSaveSuccess">',
              '<span class="input-group-btn">',
                '<button ng-if="!showSaveSuccess" class="btn btn-primary" type="button" ng-click="createWallet()" ng-disabled="!input.password || showSaveSuccess || input.password != input.passwordConfirm"><i class="fa fa-floppy-o fa-fw"></i>&nbsp;&nbsp;{{createButtonLabel}}</button>',
                '<button ng-if="showBackupWalletControls" class="btn btn-default" ng-click="backupWallet()">',
                  '<i class="fa fa-floppy-o fa-fw"></i>&nbsp;<span ng-bind-html="backupWalletButtonLabel"></span>',
                '</button>',
              '</span>',
            '</span>',
          '</div>',
        '</div>',
      '</div>',
    '</div>'
  ],
  buttons: {
    cancel: true,
    back: true,
    next: true
  }
});
/* logout */
addStep({
  id: 'logout',
  initialize: function ($scope) {
    $scope.description = 'Currently logged in as '+UserService.currentAccount.id_rs+' click "Log out" to log out';
  },
  $scope: {
    title: 'Log out',
    description: null,
    $nextButtonLabel: 'Log out',
    $nextButtonClick: function () {
      UserService.logout();
      plugins.get('alerts').success({ message: 'Successfully logged out' }).then(
        function () {
          $modalInstance.close();
        }
      );
    }
  },
  buttons: {
    cancel: true,
    next: true
  }
});
/* configurateWallet */
addStep({
  id: 'configurateWallet',
  initialize: function ($scope) {
    if (!KeyService.wallet) {
      $scope.description = $translate.instant('translate.configurateWallet_description1');
    }
    else if (KeyService.wallet.fileName) {
      $scope.description = $translate.instant('translate.configurateWallet_description2', {fileName:KeyService.wallet.fileName});
    }
    else {
      $scope.description = null;
      $scope.input.accounts = UserService.userAccounts;
      UserService.loadAccountData(new Iterator(UserService.userAccounts));
      if (UserService.currentAccount) {
        $scope.input.accounts.forEach(function (account) {
          account.__isOpen = account.id_rs == UserService.currentAccount.id_rs;
        });
      }
    }
  },
  $scope: {
    title: $translate.instant('translate.configurateWallet_title'),
    description: null,
    input: {
      accounts: []
    },
    secretPhraseLabel: $translate.instant('translate.configurateWallet_secretPhrase'),
    accountIdLabel: $translate.instant('translate.configurateWallet_accountId'),
    publicKeyLabel: $translate.instant('translate.configurateWallet_publicKey'),
    accountInfoLabel: $translate.instant('translate.configurateWallet_accountInfo'),
    accountInfoButtonLabel: $translate.instant('translate.configurateWallet_accountInfoButtonLabel'),
    accountNamePlaceholder: $translate.instant('translate.configurateWallet_accountName'),
    accountDescriptionPlaceholder: $translate.instant('translate.configurateWallet_accountDescription'),
    removeAccount: function (account) {
      plugins.get('alerts').confirm({
        title: $translate.instant('translate.configurateWallet_removetitle'),
        message: $translate.instant('translate.configurateWallet_removemessage'),
      }).then(
        function (confirmed) {
          if (confirmed) {
            $scope.$evalAsync(function () {
              KeyService.wallet.remove(account.id_rs);
              $scope.input.accounts = UserService.userAccounts = UserService.userAccounts.filter(function (a) {
                return a.id_rs != account.id_rs;
              });
            });
          }
        }
      );
    },
    signin: function (account) {
      UserService.setCurrentAccount(account);
    },
    signout: function (account) {
      UserService.logout();
    }
  },
  template: [
    '<div class="row" ng-show="input.accounts.length">',
      '<div class="col-xs-12">',
        '<accordion close-others="true">',
          '<accordion-group ng-repeat="a in input.accounts" panel-class="panel-primary" is-open="a.__isOpen">',
            '<accordion-heading>',
              '<span class="font-bold">',
                '<span ng-bind="a.label"></span>',
                '<span ng-if="a.label != a.id_rs"><br><span style="font-size:12px" ng-bind="a.id_rs"></span></span>',
              '</span>',
              '<span class="pull-right" ng-bind="a.balance">/span>',
            '</accordion-heading>',
            '<div>',
              '<div style="margin-bottom: 8px" ng-if="a.type == \'TYPE_FIM\'">',
                '<div class="btn-toolbar" role="toolbar">',
                  '<div class="btn-group  pull-right" role="group">',
                    '<button ng-click="signin(a)" type="button" class="btn btn-primary" ng-if="!isCurrentAccount(a.id_rs)"><i class="fa fa-sign-in fa-fw"></i>&nbsp;&nbsp;<span translate="translate.sign_in"></span></button>',
                    '<button ng-click="signout(a)" type="button" class="btn btn-default" ng-if="isCurrentAccount(a.id_rs)"><i class="fa fa-sign-out fa-fw"></i>&nbsp;&nbsp;<span translate="translate.sign_out"></span></button>',
                    '<button ng-click="removeAccount(a)" type="button" class="btn btn-danger"><i class="fa fa-times fa-fw"></i>&nbsp;&nbsp;<span translate="translate.remove"></span></button>',
                  '</div>',
                  '<div class="btn-group" role="group">',
                    '<a class="btn btn-default" href="#/accounts/{{a.id_rs}}/activity/latest" target="_blank"><i class="fa fa-home"></i>&nbsp;&nbsp;<span translate="translate.home"></span></a>',
                  '</div>',
                '</div>',
              '</div>',
              '<div class="form-group">',
                '<label ng-bind="secretPhraseLabel"></label>',
                '<div class="input-group">',
                  '<textarea class="form-control monospace" rows="2" ng-model="a.secretPhrase" readonly></textarea>',
                  // browser clipboard
                  '<span class="input-group-addon btn btn-default" type="button" ng-if="!isNodeJS" clip-copy="a.secretPhrase" clip-click="a.__secret_clipped=true;">',
                    '<i class="fa fa-fw" ng-class="{\'fa-check\':a.__secret_clipped,\'fa-clipboard\':!a.__secret_clipped}"></i>&nbsp;<span translate="translate.copy"></span></span>',
                  // nwjs clipboard
                  '<span class="input-group-addon btn btn-default" type="button" ng-if="isNodeJS" ng-click="clipboardCopy(a.secretPhrase); a.__secret_clipped=true;">',
                    '<i class="fa fa-fw" ng-class="{\'fa-check\':a.__secret_clipped,\'fa-clipboard\':!a.__secret_clipped}"></i>&nbsp;<span translate="translate.copy"></span></span>',
                '</div>',
              '</div>',
              '<div class="form-group">',
                '<label ng-bind="accountIdLabel"></label>',
                '<div class="input-group">',
                  '<input class="form-control monospace" ng-model="a.id_rs" readonly>',
                  // browser clipboard
                  '<span class="input-group-addon btn btn-default" type="button" ng-if="!isNodeJS" clip-copy="a.id_rs" clip-click="a.__id_rs_clipped=true;">',
                    '<i class="fa fa-fw" ng-class="{\'fa-check\':a.__id_rs_clipped,\'fa-clipboard\':!a.__id_rs_clipped}"></i>&nbsp;<span translate="translate.copy"></span></span>',
                  // nwjs clipboard
                  '<span class="input-group-addon btn btn-default" type="button" ng-if="isNodeJS" ng-click="clipboardCopy(a.id_rs); a.__id_rs_clipped=true;">',
                    '<i class="fa fa-fw" ng-class="{\'fa-check\':a.__id_rs_clipped,\'fa-clipboard\':!a.__id_rs_clipped}"></i>&nbsp;<span translate="translate.copy"></span></span>',
                '</div>',
              '</div>',
              '<div class="form-group">',
                '<label ng-bind="publicKeyLabel"></label>',
                '<div class="input-group">',
                  '<input class="form-control monospace" ng-model="a.publicKey" readonly>',
                  // browser clipboard
                  '<span class="input-group-addon btn btn-default" type="button" ng-if="!isNodeJS" clip-copy="a.publicKey" clip-click="a.__publickey_clipped=true;">',
                    '<i class="fa fa-fw" ng-class="{\'fa-check\':a.__publickey_clipped,\'fa-clipboard\':!a.__publickey_clipped}"></i>&nbsp;<span translate="translate.copy"></span></span>',
                  // nwjs clipboard
                  '<span class="input-group-addon btn btn-default" type="button" ng-if="isNodeJS" ng-click="clipboardCopy(a.publicKey); a.__publickey_clipped=true;">',
                    '<i class="fa fa-fw" ng-class="{\'fa-check\':a.__publickey_clipped,\'fa-clipboard\':!a.__publickey_clipped}"></i>&nbsp;<span translate="translate.copy"></span></span>',
                '</div>',
              '</div>',
              /*
              '<div class="form-group">',
                '<label ng-bind="accountInfoLabel"></label>',
                '<a ng-show="isCurrentAccount(a.id_rs)" class="pull-right" href ng-click="executeTransaction(\'setAccountInfo\')" ng-bind="accountInfoButtonLabel"></a>',
                '<div>',
                  '<input class="form-control monospace" ng-model="a.name" placeholder="{{accountNamePlaceholder}}" style="margin-bottom:8px">',
                  '<textarea class="form-control monospace" rows="2" ng-model="a.description" placeholder="{{accountDescriptionPlaceholder}}"></textarea>',
                '</div>',
              '</div>',
              */
            '</div>',
          '</accordion-group>',
        '</accordion>',
      '</div>',
    '</div>'
  ],
  buttons: {
    cancel: true,
    back: true
  }
});
/* openWallet */
addStep({
  id: 'openWallet',
  initialize: function ($scope) {
    $scope.input.accounts = [];

    $scope.showSaveSuccess = false;
    $scope.showWrongPasswordAlert = false;
    $scope.showBackupWalletControls = false;
    $scope.none_selected = true;

    $scope.walletExists = KeyService.walletExists();
    $scope.walletUnlocked = KeyService.wallet && !KeyService.wallet.fileName;

    if (!$scope.walletExists) {
      $scope.input.type = 'external';
    }
  },
  $scope: {
    title: $translate.instant('translate.openWallet_title'),
    description: null,
    descriptionSelectAccountExternal: $translate.instant('translate.openWallet_descriptionSelectAccountExternal'),
    input: {
      type: 'internal',
      password: '',
      password2: '',
      passwordConfirm: '',
      cipherTextOverride: '',
      accounts: [],
      selectedFile: ''
    },
    openLocalLabel: $translate.instant('translate.openWallet_openLocal'),
    openExternalLabel: $translate.instant('translate.openWallet_openExternal'),
    allLabel: $translate.instant('translate.openWallet_allLabel'),
    showWrongPasswordAlert: false,
    showFileErrorAlert: false,
    addToWalletButtonLabel: $translate.instant('translate.openWallet_addToWallet'),
    createWalletDescription: $translate.instant('translate.openWallet_createWalletDescription'),
    unlockWalletDescription: $translate.instant('translate.openWallet_unlockWalletDescription'),
    passwordFieldPlaceHolder: $translate.instant('translate.openWallet_password'),
    passwordConfirmFieldPlaceHolder: $translate.instant('translate.openWallet_passwordConfirm'),
    unlockButtonLabel: $translate.instant('translate.openWallet_unlock'),
    createButtonLabel: $translate.instant('translate.openWallet_create'),
    backupWalletButtonLabel: $translate.instant('translate.openWallet_backup'),
    savedSuccessAlertContents: $translate.instant('translate.openWallet_savedSuccessAlert'),
    showSaveSuccess: false,
    walletExists: false,
    walletUnlocked: false,
    selectedAccount: function (account) {
      UserService.setCurrentAccount({id_rs: account.id_rs, secretPhrase: account.secretPhrase});
      close('/accounts/'+account.id_rs+'/activity/latest');
    },
    unlock: function () {
      var wallet = $scope.input.type == 'internal' ?
        KeyService.unlock($scope.input.password) :
        KeyService.unlock($scope.input.password, $scope.input.cipherTextOverride, $scope.input.selectedFile);
      if (wallet) {
        $scope.showWrongPasswordAlert = false;
        UserService.setCurrentWallet(wallet);
        $scope.input.accounts = UserService.userAccounts;
      }
      else {
        $scope.showWrongPasswordAlert = true;
      }
    },
    unlockDisabled: function () {
      if ($scope.input.accounts.length) {
        return true;
      }
      if ($scope.input.type == 'internal') {
        return !$scope.input.password;
      }
      return !$scope.input.selectedFile || !$scope.input.password;
    },
    walletFileChanged: function (event) {
      $scope.$evalAsync(function () {
        $scope.showFileErrorAlert = false;
        $scope.showWrongPasswordAlert = false;
        var selectedFile = event.target.files[0];
        $scope.input.selectedFile = selectedFile.name;
        var reader    = new FileReader();
        reader.onload = function(event) {
          $scope.input.cipherTextOverride = event.target.result;
          if (!isValidHex($scope.input.cipherTextOverride)) {
            $scope.input.cipherTextOverride = converters.stringToHexString($scope.input.cipherTextOverride);
          }
          $scope.$digest();
        };
        reader.onerror = function (event) {
          $scope.showFileErrorAlert = true;
          $scope.$digest();
        };
        reader.onabort = function (event) {};
        reader.readAsText(selectedFile);
      });
    },
    selectAllCheckboxes: function () {
      var none_selected = true;
      for (var i=0; i<$scope.input.accounts.length; i++) {
        if ($scope.input.accounts[i].$selected) {
          none_selected = false;
          break;
        }
      }
      $scope.input.accounts.forEach(function (a) {
        a.$selected = none_selected;
      });
      $scope.accountCheckedChanged();
    },
    addToWallet: function () {
      $scope.input.accounts.forEach(function (a) {
        if (a.$selected && a.type == 'TYPE_FIM') {
          KeyService.wallet.add(a.id_rs, a.secretPhrase);
          UserService.refresh(a.id_rs);
        }
      });
      $scope.showSaveSuccess = true;
      $scope.showBackupWalletControls = true;
    },
    unlockThenAddAccounts: function () {
      var wallet = KeyService.unlock($scope.input.password2);
      if (wallet) {
        $scope.showWrongPasswordAlert = false;
        var accounts = angular.copy($scope.input.accounts).filter(function (account) {
          return account.type == 'TYPE_FIM';
        });
        UserService.setCurrentWallet(wallet);

        $scope.input.accounts = accounts;
        $scope.input.accounts.forEach(function (a) {
          if (a.$selected) {
            KeyService.wallet.add(a.id_rs, a.secretPhrase);
            UserService.refresh(a.id_rs);
          }
        });

        $scope.showBackupWalletControls = true;
        $scope.showSaveSuccess = true;
      }
      else {
        $scope.showWrongPasswordAlert = true;
      }
    },
    createWallet: function () {
      var wallet = KeyService.create($scope.input.password);
      wallet.save();

      var accounts = angular.copy($scope.input.accounts).filter(function (account) {
        return account.type == 'TYPE_FIM';
      });
      UserService.setCurrentWallet(wallet);

      $scope.input.accounts = accounts;
      $scope.input.accounts.forEach(function (a) {
        if (a.$selected) {
          KeyService.wallet.add(a.id_rs, a.secretPhrase);
          UserService.refresh(a.id_rs);
        }
      });
      $scope.showSaveSuccess = true;
      $scope.showBackupWalletControls = true;
    },
    accountCheckedChanged: function () {
      $scope.none_selected = true;
      for (var i=0; i<$scope.input.accounts.length; i++) {
        if ($scope.input.accounts[i].$selected) {
          $scope.none_selected = false;
          break;
        }
      }
    }
  },
  template: [
    '<div class="row">',
      '<div class="col-md-12" style="margin-bottom:10px">',
        '<div class="alert alert-warning" ng-show="showWrongPasswordAlert" style="margin-bottom:10px">',
          '<i class="fa fa-exclamation-triangle fa-fw"></i>&nbsp;<span translate="translate.wrong_password"></span>',
        '</div>',
        '<div class="alert alert-warning" ng-show="showFileErrorAlert" style="margin-bottom:10px">',
          '<i class="fa fa-exclamation-triangle fa-fw"></i>&nbsp;File error',
        '</div>',
        '<div class="btn-group">',
          '<label class="btn btn-default" ng-model="input.type" btn-radio="\'internal\'" ng-disabled="input.accounts.length" ng-if="walletExists">',
            '<i class="fa fa-file-o fa-fw"></i>&nbsp;&nbsp;<span ng-bind="openLocalLabel"></span>',
          '</label>',
          '<label class="btn btn-default" ng-model="input.type" btn-radio="\'external\'" ng-disabled="input.accounts.length">',
            '<i class="fa fa-folder-open-o fa-fw"></i>&nbsp;&nbsp;<span ng-bind="openExternalLabel"></span>',
          '</label>',
        '</div>',
      '</div>',
    '</div>',
    '<div class="row">',
      '<div class="col-md-12">',
        '<div class="form-group" ng-if="input.type==\'external\'">',
          '<span class="input-group" style="margin-bottom: 8px">',
            '<span class="input-group-btn">',
              '<span class="btn btn-default btn-block btn-file" ng-disabled="input.accounts.length">',
                '<i class="fa fa-folder-open fa-fw"></i>&nbsp;&nbsp;<span translate="translate.open_wallet"></span>',
                '<input type="file" onchange="angular.element(this).scope().walletFileChanged(event)">',
              '</span>',
            '</span>',
            '<span class="form-control" ng-bind="input.selectedFile"></span>',
          '</span>',
        '</div>',
        '<div class="form-group">',
          '<span class="input-group" style="margin-bottom: 8px">',
            '<input class="form-control" type="password" placeholder="{{passwordFieldPlaceHolder}}" ng-model="input.password" ng-disabled="input.accounts.length">',
            '<span class="input-group-btn">',
              '<button class="btn btn-primary" type="button" ng-click="unlock()" ng-disabled="unlockDisabled()"><i class="fa fa-unlock fa-fw"></i>&nbsp;&nbsp;Unlock</button>',
            '</span>',
          '</span>',
        '</div>',
      '</div>',
    '</div>',
    // lists contained accounts for external wallet
    '<div ng-if="input.type==\'external\'">',
      '<div class="row" ng-show="input.accounts.length">',
        '<div class="col-xs-12">',
          '<div class="well well-sm" style="margin-bottom:10px">',
            '<span ng-bind="descriptionSelectAccountExternal"></span>',
            '<span class="pull-right"><a href ng-bind="allLabel" ng-click="selectAllCheckboxes()"></a></span>',
          '</div>',
        '</div>',
        '<div ng-repeat="a in input.accounts">',
          '<div class="col-xs-11">',
            '<button class="btn btn-primary btn-block elipses monospace" style="margin-bottom: 8px; text-align:left; padding-left:10px" ng-click="selectedAccount(a)" ng-disabled="a.type!=\'TYPE_FIM\'">',
              '<span class="font-bold">',
                '<span ng-bind="a.label"></span>',
                '<span ng-if="a.label != a.id_rs"><br><small ng-bind="a.id_rs"></small></span>',
              '</span>',
              '<span class="pull-right" ng-bind="a.balance">/span>',
            '</button>',
          '</div>',
          '<div  class="col-xs-1">',
            '<div class="checkbox" style="margin-bottom: 8px;">',
              '<label>',
                '<input type="checkbox" ng-model="a.$selected" ng-change="accountCheckedChanged()" ng-disabled="a.type!=\'TYPE_FIM\'">',
              '</label>',
            '</div>',
          '</div>',
        '</div>',
        '<div class="col-md-12" ng-hide="none_selected">',
          // wallet is unlocked - save on click
          '<div class="row" ng-show="walletUnlocked && walletExists">',
            '<div class="col-md-12">',
              '<button class="btn" ng-class="{\'btn-success\':showSaveSuccess, \'btn-default\':!showSaveSuccess}" ng-click="addToWallet()" ng-disabled="showSaveSuccess">',
                '<i class="fa fa-fw" ng-class="{\'fa-plus\':!showSaveSuccess,\'fa-check\':showSaveSuccess}"></i>&nbsp;<span ng-bind-html="addToWalletButtonLabel"></span>',
              '</button>',
              '<button ng-if="showBackupWalletControls" class="btn btn-default" ng-click="backupWallet()">',
                '<i class="fa fa-floppy-o fa-fw"></i>&nbsp;<span ng-bind-html="backupWalletButtonLabel"></span>',
              '</button>',
            '</div>',
          '</div>',
          // wallet is locked
          '<div class="row" ng-show="!walletUnlocked && walletExists">',
            '<div class="col-md-12">',
              '<div class="well well-sm" ng-bind-html="unlockWalletDescription" style="margin-bottom:10px"></div>',
              '<div class="alert alert-success" ng-show="showSaveSuccess" style="margin-bottom:10px">',
                '<i class="fa fa-check fa-fw"></i>&nbsp;<span>{{savedSuccessAlertContents}}</span>',
              '</div>',
              '<div class="form-group">',
                '<span class="input-group">',
                  '<input class="form-control" type="password" placeholder="{{passwordFieldPlaceHolder}}" ng-model="input.password2" ng-disabled="showSaveSuccess">',
                  '<span class="input-group-btn">',
                    '<button ng-if="!showSaveSuccess" class="btn btn-primary" type="button" ng-click="unlockThenAddAccounts()" ng-disabled="!input.password2 || showSaveSuccess"><i class="fa fa-floppy-o fa-fw"></i>&nbsp;&nbsp;{{unlockButtonLabel}}</button>',
                    '<button ng-if="showBackupWalletControls" class="btn btn-default" ng-click="backupWallet()">',
                      '<i class="fa fa-floppy-o fa-fw"></i>&nbsp;<span ng-bind-html="backupWalletButtonLabel"></span>',
                    '</button>',
                  '</span>',
                '</span>',
              '</div>',
            '</div>',
          '</div>',
          // wallet does not exist - must provide password twice
          '<div class="row" ng-show="!walletUnlocked && !walletExists">',
            '<div class="col-md-12" ng-if="!walletExists">',
              '<div class="well well-sm" ng-bind-html="createWalletDescription" style="margin-bottom:10px"></div>',
              '<div class="alert alert-success" ng-show="showSaveSuccess" style="margin-bottom:10px">',
                '<i class="fa fa-check fa-fw"></i>&nbsp;<span>{{savedSuccessAlertContents}}</span>',
              '</div>',
              '<div class="form-group">',
                '<input class="form-control" type="password" placeholder="{{passwordFieldPlaceHolder}}" ng-model="input.password2" ng-disabled="showSaveSuccess">',
              '</div>',
              '<div class="form-group">',
                '<span class="input-group">',
                  '<input class="form-control" type="password" placeholder="{{passwordConfirmFieldPlaceHolder}}" ng-model="input.passwordConfirm" ng-disabled="showSaveSuccess">',
                  '<span class="input-group-btn">',
                    '<button ng-if="!showSaveSuccess" class="btn btn-primary" type="button" ng-click="createWallet()" ng-disabled="!input.password2 || showSaveSuccess || input.password2 != input.passwordConfirm"><i class="fa fa-floppy-o fa-fw"></i>&nbsp;&nbsp;{{createButtonLabel}}</button>',
                    '<button ng-if="showBackupWalletControls" class="btn btn-default" ng-click="backupWallet()">',
                      '<i class="fa fa-floppy-o fa-fw"></i>&nbsp;<span ng-bind-html="backupWalletButtonLabel"></span>',
                    '</button>',
                  '</span>',
                '</span>',
              '</div>',
            '</div>',
          '</div>',
        '</div>',
      '</div>',
    '</div>',
    // lists contained accounts for internal wallet
    '<div ng-if="input.type==\'internal\'">',
      '<div class="row" ng-show="input.accounts.length">',
        '<div ng-repeat="a in input.accounts">',
          '<div class="col-xs-12">',
            '<button class="btn btn-primary btn-block elipses monospace" style="margin-bottom: 8px; text-align:left; padding-left:10px" ng-click="selectedAccount(a)" ng-disabled="a.type!=\'TYPE_FIM\'">',
              '<span class="font-bold">',
                '<span ng-bind="a.label"></span>',
                '<span ng-if="a.label != a.id_rs"><br><small ng-bind="a.id_rs"></small></span>',
              '</span>',
              '<span class="pull-right" ng-bind="a.balance">/span>',
            '</button>',
          '</div>',
        '</div>',
      '</div>',
    '</div>'
  ],
  buttons: {
    cancel: true,
    back: true
  }
});

ready();
});
})();