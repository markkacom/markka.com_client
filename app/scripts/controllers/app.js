(function () {
'use strict';
var uriParser = null;
var module = angular.module('fim.base');
module.run(function ($rootScope) {
  if (window.localStorage.getItem("lompsa.testnet") == null) {
    window.localStorage.setItem("lompsa.testnet", IS_TEST_NET);
  }
  $rootScope.FIM_SERVER_VERSION = null;
  $rootScope.TITLE = WALLET_NAME+' '+VERSION;
  $rootScope.WALLET_NAME = WALLET_NAME;
  $rootScope.paramEngine = 'fim';
  $rootScope.enableDualEngines = ENABLE_DUAL_ENGINES;
  $rootScope.isTestnet = window.localStorage.getItem("lompsa.testnet")=="true";
  $rootScope.forceLocalHost = FORCE_LOCAL_HOST;
  $rootScope.privateEnabled = $rootScope.isTestnet;
  $rootScope.multiLanguage = true;
  $rootScope.MONETARY_SYSTEM = false;
  $rootScope.TRADE_UI_ONLY = TRADE_UI_ONLY;
  $rootScope.currentAccount = typeof CURRENT_ACCOUNT != "undefined" ? angular.copy(CURRENT_ACCOUNT) : null;
});
module.controller('AppController', function($rootScope, $scope, $modal, $q, $log,  
  $timeout, modals, $window, plugins, serverService, db, settings, $location, 
  nxt, $route, $translate, accountsService, BlockchainDownloadProvider, UserDataProvider) {

  $rootScope.userData = new UserDataProvider($scope);

  $scope.toggleTestNet = function () {
    window.localStorage.setItem("lompsa.testnet", !$rootScope.isTestnet);
    $scope.reloadMofoWallet();
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

  // $rootScope.$on('$translatePartialLoaderStructureChanged', function () {
  //   $translate.refresh();
  // });

  $rootScope.loginAddAccount = function () {
    modals.open('welcome', {
      resolve: {
        items: function () { 
          return {}; 
        }
      }
    });
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
});

})();
