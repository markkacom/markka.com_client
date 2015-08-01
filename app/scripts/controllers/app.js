(function () {
'use strict';
var uriParser = null;
var module = angular.module('fim.base');
module.run(function ($rootScope) {
  $rootScope.FIM_SERVER_VERSION = null;
  $rootScope.TITLE = WALLET_NAME+' '+VERSION;
  $rootScope.WALLET_NAME = WALLET_NAME;
  $rootScope.paramEngine = 'fim';
  $rootScope.enableDualEngines = ENABLE_DUAL_ENGINES;
  $rootScope.isTestnet = IS_TEST_NET;
  $rootScope.forceLocalHost = FORCE_LOCAL_HOST;
  $rootScope.privateEnabled = PRIVATE_ENABLED;
  $rootScope.multiLanguage = true;
  $rootScope.MONETARY_SYSTEM = false;
  $rootScope.TRADE_UI_ONLY = TRADE_UI_ONLY;
});
module.controller('AppController', function($rootScope, $scope, $modal, $q, $log,  
  $timeout, modals, $window, plugins, serverService, db, settings, $location, 
  nxt, $route, $translate, accountsService, BlockchainDownloadProvider) {

  $scope.mainMenuCollapsed=true;
  $scope.collapseMainMenu = function () {
    $timeout(function () {
      $scope.mainMenuCollapsed=true;
    }, 1000);
  }

  $rootScope.selectedAccount = null;
  $rootScope.selectedAccountUnlocked = false;
  $rootScope.selectableAccounts = [];

  /* Only run when in NodeJS environment */
  if (isNodeJS) {
    $scope.fimDownloadProvider = new BlockchainDownloadProvider(nxt.fim(), $scope);
    $scope.fimDownloadProvider.load();
    if ($rootScope.enableDualEngines) {
      $scope.nxtDownloadProvider = new BlockchainDownloadProvider(nxt.nxt(), $scope);
      $scope.nxtDownloadProvider.load();
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

  function loadAccounts() {
    accountsService.getAll().then(function (accounts) {
      $scope.$evalAsync(function () {
        $rootScope.selectableAccounts = accounts;
        if (!$rootScope.selectedAccount) {
          var previous_id_rs = window.localStorage.getItem('mofowallet.selected.account');
          if (previous_id_rs) {
            for (var i=0;i<accounts.length; i++) {
              if (accounts[i].id_rs == previous_id_rs) {
                $rootScope.setSelectedAccount(accounts[i], true);  
                break;
              }
            }
          }
          else if ($rootScope.selectableAccounts[0]) {
            $rootScope.setSelectedAccount($rootScope.selectableAccounts[0], true);  
          }
        }
      });
    });
  }
  accountsService.onChange($rootScope, loadAccounts);
  loadAccounts();

  $rootScope.setSelectedAccount = function (account, dont_save) {
    window.localStorage.setItem('mofowallet.selected.account', account.id_rs);
    $rootScope.$evalAsync(function () {
      $rootScope.selectedAccount = account;
      $rootScope.selectedAccountUnlocked = plugins.get('wallet').hasKey(account.id_rs);
    });
    var api = nxt.get(account.id_rs);
    if (api) {
      api.engine.socket().getAccount({account:account.id_rs}).then(
        function (data) {
          $rootScope.$evalAsync(function () {
            $rootScope.selectedAccount.symbol = api.engine.symbol;
            $rootScope.selectedAccount.balanceNXT = nxt.util.convertToNXT(data.balanceNQT);
            $rootScope.selectedAccount.unconfirmedBalanceNXT = nxt.util.convertToNXT(data.unconfirmedBalanceNQT);
            $rootScope.selectedAccount.name = data.accountName;
            if (!dont_save) {
              $rootScope.selectedAccount.save();
            }
          });
        }
      );
    }
  }

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

  /* This serves as a catch all. More detailed can be achieved by reimplementing this method
     on some more local scope (like accounts-messages.js) */
  $scope.onMessageUnlockClick = function (element) {
    var recipient_id_rs = element.getAttribute('data-recipient');
    var sender_id_rs = element.getAttribute('data-sender');
    modals.open('selectDecryptionAccount', {
      resolve: {
        items: function () {
          return { 
            recipientRS: recipient_id_rs,
            senderRS: sender_id_rs
          }
        }
      },
      close: function () {        
        $route.reload();
      }
    });
  }

});

})();
