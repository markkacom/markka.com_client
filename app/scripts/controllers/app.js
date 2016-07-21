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
var uriParser = null;
var module = angular.module('fim.base');
module.run(function ($rootScope, $location) {

  if (window.localStorage.getItem("lompsa.testnet") == null) {
    window.localStorage.setItem("lompsa.testnet", IS_TEST_NET?"true":"false");
  }

  $rootScope.isTestnet = window.localStorage.getItem("lompsa.testnet")=="true";
  /*if (TRADE_UI_ONLY) {
    $rootScope.isTestnet = true;
  }*/
  if ($rootScope.isTestnet) {
    ENABLE_DUAL_ENGINES=false;
  }

  $rootScope.FIM_SERVER_VERSION = null;
  $rootScope.TITLE = WALLET_NAME+' '+VERSION;
  $rootScope.WALLET_NAME = WALLET_NAME;
  $rootScope.paramEngine = 'fim';
  $rootScope.enableDualEngines = $rootScope.isTestnet ? false : ENABLE_DUAL_ENGINES;
  $rootScope.forceLocalHost = FORCE_LOCAL_HOST;
  $rootScope.privateEnabled = true;
  $rootScope.multiLanguage = true;
  $rootScope.MONETARY_SYSTEM = false;
  $rootScope.TRADE_UI_ONLY = TRADE_UI_ONLY;
  $rootScope.currentAccount = typeof CURRENT_ACCOUNT != "undefined" ? angular.copy(CURRENT_ACCOUNT) : null;

  if (("www.mofowallet.com" == window.location.host ||
       "mofowallet.com" == window.location.host) && (window.location.protocol != "https:")) {
    window.location.protocol = "https:";
  }
  else if ("fimkrypto.github.io" == window.location.host) {
    window.location = "https://www.mofowallet.com/launch.html" + window.location.hash;
  }
  else if ("lompsa.com" == window.location.host && window.location.protocol != "https:") {
    window.location = "https://lompsa.com/" + window.location.hash;
  }

  // if ($rootScope.isTestnet) {
  //   if ($location.path().indexOf('/start') != 0) {
  //     $location.path('/start');
  //     return;
  //   }
  // }
});
module.controller('AppController', function($rootScope, $scope, $modal, $q, $log,
  $timeout, modals, $window, plugins, serverService, db, settings, $location,
  nxt, $route, $translate, accountsService, BlockchainDownloadProvider, UserDataProvider, UserService) {

  $rootScope.userData = new UserDataProvider($scope);

  $scope.toggleTestNet = function () {
    var value = $rootScope.isTestnet ? "false":"true";
    window.localStorage.setItem("lompsa.testnet", value);
    $scope.reloadMofoWallet();
  }

  $rootScope.loginWizard = function (step, config, path) {
    var deferred = $q.defer();
    modals.open('login-wizard', {
      resolve: {
        items: function () {
          return {
            step: step,
            config: config,
            path: path
          };
        }
      },
      close: function (items) {
        deferred.resolve();
      }
    });
    return deferred.promise;
  }

  $rootScope.logout = function () {
    $rootScope.$evalAsync(function () {
      UserService.logout();
      $location.path('start');
    });
  }

  $scope.mainMenuCollapsed=true;
  $scope.collapseMainMenu = function () {
    $timeout(function () {
      $scope.mainMenuCollapsed=true;
    }, 1000);
  }

  /* Only run when in NodeJS environment */
  if (isNodeJS) {
    $rootScope.fimDownloadProvider = new BlockchainDownloadProvider(nxt.fim(), $scope);
    $rootScope.fimDownloadProvider.load();
    if ($rootScope.enableDualEngines) {
      $rootScope.nxtDownloadProvider = new BlockchainDownloadProvider(nxt.nxt(), $scope);
      $rootScope.nxtDownloadProvider.load();
    }
  }

  /* Install app plugins | these all get a menu entry */
  $scope.plugins = [];
  plugins.install('app', function (plugin) {
    console.log('install-app-plugin', plugin)
    $scope.plugins.push(plugin);
  });

  /* Install system plugins | shown at the bottom of each page OR ANYWHERE by making them position:absolute */
  $scope.systemPlugins = [];
  if (isNodeJS) {
    plugins.install('system', function (plugin) {
      console.log('install-system-plugin', plugin)
      $scope.systemPlugins.push(plugin);
    });
  }

  function getIsSmallDevice() {
    return window.getComputedStyle(document.getElementById('smallScreenTest')).getPropertyValue('display') == 'block';
  }

  $rootScope.IS_SMALL_DEVICE = getIsSmallDevice();

  angular.element($window).bind('resize', function () {
    $rootScope.$evalAsync(function () {
      $rootScope.IS_SMALL_DEVICE = getIsSmallDevice();
    })
  });

  $scope.isNodeJS = isNodeJS;

  $rootScope.setCurrentAccount = function (account) {
    UserService.setCurrentAccount(account);
  }

  $rootScope.loadUserAccountData = function (menu_is_open) {
    if (menu_is_open) {
      UserService.loadAccountData(new Iterator(UserService.userAccounts));
    }
  }

  $rootScope.availableLanguages = [
    ['en', 'English', 'English', true],
    ['fi', 'Suomi', 'Finnish', true],
    ['af', 'Afrikaans', 'Afrikaans'],
    ['sq', 'Shqip', 'Albanian'],
    ['ar', 'العربية', 'Arabic'],
    ['az', 'azərbaycan dili', 'Azerbaijani'],
    ['eu', 'euskara', 'Basque'],
    ['bn', 'বাংলা', 'Bengali'],
    ['be', 'беларуская мова', 'Belarusian'],
    ['bg', 'български език', 'Bulgarian'],
    ['ca', 'català', 'Catalan'],
    ['zh', '简化中国', 'Chinese_Simplified'],
    ['zh-TW', '中國傳統', 'Chinese_Traditional'],
    ['hr', 'hrvatski jezik', 'Croatian'],
    ['cs', 'čeština, český jazyk', 'Czech'],
    ['da', 'dansk', 'Danish'],
    ['nl', 'Nederlands', 'Dutch'],
    ['eo', 'Esperanto', 'Esperanto'],
    ['et', 'eesti', 'Estonian'],
    ['tl', 'Wikang Filipino', 'Filipino'],
    ['fr', 'Français', 'French'],
    ['gl', 'Galego', 'Galician'],
    ['ka', 'ქართული', 'Georgian'],
    ['de', 'Deutsch', 'German'],
    ['el', 'Ελληνικά', 'Greek'],
    ['gu', 'ગુજરાતી', 'Gujarati'],
    ['ht', 'Kreyòl Ayisyen', 'Haitian_Creole'],
    ['iw', 'עברית', 'Hebrew'],
    ['hi', 'हिन्दी', 'Hindi'],
    ['hu', 'Magyar', 'Hungarian'],
    ['is', 'Íslenska', 'Icelandic'],
    ['id', 'Bahasa Indonesia', 'Indonesian'],
    ['ga', 'Gaeilge', 'Irish'],
    ['it', 'Italiano', 'Italian'],
    ['ja', '日本語', 'Japanese'],
    ['kn', 'ಕನ್ನಡ', 'Kannada'],
    ['ko', '조선말', 'Korean'],
    ['la', 'Latina', 'Latin'],
    ['lv', 'Latviešu', 'Latvian'],
    ['lt', 'Lietuvių', 'Lithuanian'],
    ['mk', 'Mакедонски', 'Macedonian'],
    ['ms', 'Bahasa Melayu', 'Malay'],
    ['mt', 'Malti', 'Maltese'],
    ['no', 'Norsk', 'Norwegian'],
    ['fa', 'فارسی', 'Persian'],
    ['pl', 'Polski', 'Polish'],
    ['pt', 'Português', 'Portuguese'],
    ['ro', 'Română', 'Romanian'],
    ['ru', 'Русский', 'Russian'],
    ['sr', 'Српски', 'Serbian'],
    ['sk', 'Slovenčina', 'Slovak'],
    ['sl', 'Slovenščina', 'Slovenian'],
    ['es', 'Español', 'Spanish'],
    ['sw', 'Kiswahili', 'Swahili'],
    ['sv', 'Svenska', 'Swedish'],
    ['ta', 'தமிழ்', 'Tamil'],
    ['te', 'తెలుగు', 'Telugu'],
    ['th', 'ไทย', 'Thai'],
    ['tr', 'Türkçe', 'Turkish'],
    ['uk', 'українська мова', 'Ukrainian'],
    ['ur', 'اردو', 'Urdu'],
    ['vi', 'Việtnam', 'Vietnamese'],
    ['cy', 'Cymraeg', 'Welsh'],
    ['yi', 'ייִדיש', 'Yiddish']
  ];
  $rootScope.availableLanguages.forEach(function (entry) {
    $rootScope.availableLanguages[entry[0]] = entry[1];
  });

  $rootScope.langCode = $translate.preferredLanguage();
  $rootScope.langName = $rootScope.availableLanguages[$rootScope.langCode];
  $rootScope.setLang  = function (langCode) {
    $rootScope.langCode = langCode;
    $rootScope.langName = $rootScope.availableLanguages[langCode];
    $translate.use(langCode);
  }

  if (!$rootScope.multiLanguage) {
    $rootScope.setLang('en');
  }

  $scope.showLanguageModal = function () {
    modals.open('language', {
      resolve: {
        items: function () { return {}; }
      },
      close: function () {
      }
    });
  }

  $scope.showAboutModal = function () {
    modals.open('about', {
      resolve: {
        items: function () { return {}; }
      },
      close: function () {
      }
    });
  }

  $scope.reloadMofoWallet = function () {
    try {
      if (isNodeJS) {
        var wait = 0;
        if (serverService.isRunning('TYPE_FIM')) {
          serverService.stopServer('TYPE_FIM');
          wait += 5000;
        }
        if (serverService.isRunning('TYPE_NXT')) {
          serverService.stopServer('TYPE_NXT');
          wait += 5000;
        }
        $timeout(function () {
          require('nw.gui').Window.get().window.location.reload();
        }, wait, false);
      }
      else {
        window.location.reload();
      }
    } catch (e) {
      console.log(e)
    }
  }

  $scope.openDevTools = function () {
    try {
      require('nw.gui').Window.get().showDevTools();
    } catch (e) {
      console.log(e)
    }
  }

  /* handler for rendered transaction identifier onclick events */
  $scope.onTransactionIdentifierClick = function (element) {
    var type   = element.getAttribute('data-type');
    var value  = element.getAttribute('data-value');
    if (element.getAttribute('data-engine')) {
      var api  = nxt.get(element.getAttribute('data-engine'));
    }
    else if (type == 'ACCOUNT') {
      var api  = nxt.get(value);
    }
    // console.log('onTransactionIdentifierClick', {type:type,value:value});
    switch (type) {
      // case api.renderer.TYPE.ACCOUNT: {
      //   var deferred  = plugins.get('alerts').wait({ message: 'Downloading Account Data' });
      //   var canceller = $q.defer();

      //   /* Clicking Cancel in the dialog cause reject and thus catch to be called */
      //   deferred.promise.catch(
      //     function () {
      //       canceller.resolve();
      //     }
      //   );

      //   api.getAccount({account:value}, null, canceller).then(
      //     function (account) {

      //       /* Close the Wait modal */
      //       deferred.resolve();

      //       var inspector = plugins.get('inspector');
      //       inspector.inspect({
      //         title: 'Account Details',
      //         object: account,
      //         order: 'accountRS,balanceNQT,effectiveBalanceNXT,unconfirmedBalanceNQT,forgedBalanceNQT,garanteedBalanceNQT',
      //         translator: inspector.createAccountTranslator(api, account)
      //       });
      //     },
      //     function (error) {
      //       deferred.resolve();
      //     }
      //   );
      //   break;
      // }
      case api.renderer.TYPE.JSON: {
        try {
          var transaction = JSON.parse(decodeURIComponent(value));
        } catch (e) {
          var input = decodeURIComponent(value||'');
          console.log('plugin: accounts JSON error',input);
          var transaction = { error: e, input: input};
        }
        var inspector = plugins.get('inspector');
        inspector.inspect({
          title: 'Transaction Details',
          object: transaction,
          order: 'timestamp,senderRS,recipientRS,amountNQT,attachment,type,feeNQT',
          translator: inspector.createTransactionTranslator(api, transaction)
        });
        break;
      }
      case api.renderer.TYPE.ASSET_ID: {
        var asset = api.assets.get(decodeURIComponent(value));
        var inspector = plugins.get('inspector');
        inspector.inspect({
          title: 'Asset Details',
          object: asset,
          order: 'name,asset,numberOfTrades,description,quantityQNT,decimals,accountRS',
          translator: inspector.createAssetTranslator(api, asset)
        });
        break;
      }
    }
    return false;
  }

  if (isNodeJS) {
    $scope.clipboardCopy = function (text) {
      var gui = require('nw.gui');
      var clipboard = gui.Clipboard.get();
      clipboard.set(text, 'text');
    }
  }

  $rootScope.followUser = function (id_rs) {
    var deferred = $q.defer();
    var api = nxt.get(id_rs);
    if (!api) {
      deferred.resolve(false);
      return;
    }
    var args = {
      id_rs: id_rs,
      publicKey: '',
      engine: api.engine.type,
      name: '',
      excluded: false
    };
    api.engine.socket().getAccount({ account:id_rs }).then(
      function (a) {
        args.name = a.accountName;
      }
    );

    plugins.get('alerts').confirm({
      title: 'Follow account',
      html: 'Do you want to follow this account?<br>By following this account it will be added to your dashboard.'
    }).then(
      function (confirmed) {
        if (confirm) {
          db.accounts.put(args).then(function () {
            deferred.resolve(true);
          }, function () {
            deferred.resolve(false);
          });
        }
        else {
          deferred.resolve(false);
        }
      }
    );
    return deferred.promise;
  }

  $rootScope.unFollowUser = function (id_rs) {
    accountsService.getFirst(id_rs).then(function (item) {
      if (item) {
        plugins.get('alerts').confirm({
          title: 'Unfollow account',
          html: 'Are you sure you want to unfollow this account?<br>By un following this account it will be removed from your dashboard.'
        }).then(
          function (confirmed) {
            if (confirmed) {
              item.delete();
            }
          }
        );
      }
    });
  }

  $rootScope.executeTransaction = function (id, arg) {
    arg = arg||{};
    if (plugins.get('transaction').get(id).execute.length == 1) {
      return plugins.get('transaction').get(id).execute(arg);
    }
    else {
      return plugins.get('transaction').get(id).execute($scope.id_rs, arg);
    }
  }
});

})();
