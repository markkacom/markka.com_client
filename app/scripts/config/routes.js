(function () {
'use strict';

var module = angular.module('fim.base');

module.config(function($stateProvider, $urlRouterProvider) {
    
  $urlRouterProvider.otherwise('/home');
    
  $stateProvider
  .state('home', {
    url: '/home',
    views: {
      '': { 
        templateUrl: 'partials/home.html',
        controller: 'homeController'
      }
    }
  });
  // .state('server', {
  //   url: '/server',
  //   views: {
  //     '': { 
  //       templateUrl: 'partials/server.html',
  //       controller: 'serverController'
  //     }
  //   }
  // })  
  // .state('accounts', {
  //   url: '/accounts/:id_rs',
  //   views: {
  //     '': { 
  //       templateUrl: 'partials/accounts.html',
  //       controller: 'accountsController'
  //     },
  //     'accounts-tab@accounts': {
  //       templateUrl: 'partials/accounts-tab.html',
  //       controller: 'accountsTabController'
  //     },
  //     'list@accounts': {
  //       templateUrl: 'partials/accounts-list.html',
  //       controller: 'accountsListController'
  //     },
  //     'transactions@accounts': {
  //       templateUrl: 'partials/accounts-transactions.html',
  //       controller: 'accountsTransactionsController'
  //     }           
  //   }
  // })
  // .state('contacts', {
  //   url: '/contacts',
  //   views: {
  //     '': { templateUrl: 'partials/contacts.html' },
  //     'list@contacts': {
  //       templateUrl: 'partials/contacts-list.html',
  //       controller: 'contactsListController'
  //     },
  //     'detail@contacts': {
  //       templateUrl: 'partials/contacts-detail.html',
  //       controller: 'contactsDetailController'
  //     }           
  //   }
  // })
  // .state('exchange', {
  //   url: '/exchange/:base/:quote',
  //   views: {
  //     '': { 
  //       templateUrl: 'partials/exchange.html',
  //       controller: 'exchangeController'
  //     },
  //     'markets@exchange': {
  //       templateUrl: 'partials/markets.html',
  //       controller: 'marketsController'
  //     },
  //     'bids@exchange': {
  //       templateUrl: 'partials/bids.html',
  //       controller: 'bidsController'
  //     },
  //     'asks@exchange': {
  //       templateUrl: 'partials/asks.html',
  //       controller: 'asksController'
  //     },
  //     'trades@exchange': {
  //       templateUrl: 'partials/trades.html',
  //       controller: 'tradesController'
  //     },      
  //     'chart@exchange': {
  //       templateUrl: 'partials/chart.html',
  //       controller: 'chartController'
  //     },
  //     'overview@exchange': {
  //       templateUrl: 'partials/overview.html',
  //       controller: 'overviewController'
  //     }
  //   }    
  // })
  // .state('about', {
  //   url: '/about',
  //   views: {

  //     // the main template will be placed here (relatively named)
  //     '': { templateUrl: 'partials/about.html' }
  //   }        
  // });
});

})();