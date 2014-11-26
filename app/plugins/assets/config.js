(function () {
'use strict';
var module = angular.module('fim.base');
module.config(function($stateProvider) {  
  $stateProvider.state('assets', {
    url: '/assets/:engine/:asset',
    views: {
      '': { 
        templateUrl: 'plugins/assets/partials/exchange.html',
        controller: 'ExchangePluginController'
      },
      'markets@assets': {
        templateUrl: 'plugins/assets/partials/markets.html',
        controller: 'ExchangePluginMarketsController'
      },      
      'bids@assets': {
        templateUrl: 'plugins/assets/partials/bids.html',
        controller: 'ExchangePluginBidsController'
      },
      'asks@assets': {
        templateUrl: 'plugins/assets/partials/asks.html',
        controller: 'ExchangePluginAsksController'
      },   
      'chart@assets': {
        templateUrl: 'plugins/assets/partials/chart.html',
        controller: 'ExchangePluginChartController'
      }, 
      'trades@assets': {
        templateUrl: 'plugins/assets/partials/trades.html',
        controller: 'ExchangePluginTradesController'
      },
      'info@assets': {
        templateUrl: 'plugins/assets/partials/info.html',
        controller: 'ExchangePluginInfoController'
      }
    }
  });
});

module.run(function (modals, plugins, $sce) {

  var sub_menu = [{
    sref: "assets({ engine: 'nxt', asset: '' })",
    html: $sce.trustAsHtml('NXT AE')
  }, {
    sref: "assets({ engine: 'fimk', asset: '' })",
    html: $sce.trustAsHtml('FIMK AE')
  }];

  plugins.register({
    id: 'assets',
    extends: 'app',
    sub_menu_html: function () {
      return sub_menu;
    },
    label: 'Assets',
    icon_class: 'glyphicon glyphicon-transfer'
  });  
});

})();