(function () {
'use strict';
var uriParser = null;
var module = angular.module('fim.base');
module.controller('AppController', function($rootScope, $scope, $modal, $q, $log,  
  $timeout, modals, $window, plugins, serverService, db, settings, $location, 
  nxt, $route, $translate) {

  $rootScope.FIM_SERVER_VERSION = null;
  $rootScope.TITLE = 'MofoWallet '+VERSION;
  $rootScope.paramEngine = 'fim';
  $rootScope.enableDualEngines = ENABLE_DUAL_ENGINES;
  $rootScope.isTestnet = IS_TEST_NET;
  $rootScope.forceLocalHost = FORCE_LOCAL_HOST;
  $rootScope.multiLanguage = true;
  $rootScope.MONETARY_SYSTEM = false;

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

  $scope.isNodeJS = isNodeJS;

  // $rootScope.$on('$translatePartialLoaderStructureChanged', function () {
  //   $translate.refresh();
  // });

  $rootScope.availableLanguages = {
    'af': 'Afrikaans',
    'sq': 'Shqip',
    'ar': 'العربية',
    'az': 'azərbaycan dili',
    'eu': 'euskara',
    'bn': 'বাংলা',
    'be': 'беларуская мова',
    'bg': 'български език',
    'ca': 'català',
    'zh': '简化中国',
    'zh-TW': '中國傳統',
    'hr': 'hrvatski jezik',
    'cs': 'čeština, český jazyk',
    'da': 'dansk',
    'nl': 'Nederlands',
    'en': 'English',
    'eo': 'Esperanto',
    'et': 'eesti',
    'tl': 'Wikang Filipino',
    'fi': 'Suomi',
    'fr': 'Français',
    'gl': 'Galego',
    'ka': 'ქართული',
    'de': 'Deutsch',
    'el': 'Ελληνικά',
    'gu': 'ગુજરાતી',
    'ht': 'Kreyòl Ayisyen',
    'iw': 'עברית',
    'hi': 'हिन्दी',
    'hu': 'Magyar',
    'is': 'Íslenska',
    'id': 'Bahasa Indonesia',
    'ga': 'Gaeilge',
    'it': 'Italiano',
    'ja': '日本語',
    'kn': 'ಕನ್ನಡ',
    'ko': '조선말',
    'la': 'Latina',
    'lv': 'Latviešu',
    'lt': 'Lietuvių',
    'mk': 'Mакедонски',
    'ms': 'Bahasa Melayu',
    'mt': 'Malti',
    'no': 'Norsk',
    'fa': 'فارسی',
    'pl': 'Polski',
    'pt': 'Português',
    'ro': 'Română',
    'ru': 'Русский',
    'sr': 'Српски',
    'sk': 'Slovenčina',
    'sl': 'Slovenščina',
    'es': 'Español',
    'sw': 'Kiswahili',
    'sv': 'Svenska',
    'ta': 'தமிழ்',
    'te': 'తెలుగు',
    'th': 'ไทย',
    'tr': 'Türkçe',
    'uk': 'українська мова',
    'ur': 'اردو',
    'vi': 'Việtnam',
    'cy': 'Cymraeg',
    'yi': 'ייִדיש'
  };

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
