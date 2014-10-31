(function () {
'use strict';

var module = angular.module('fim.base');

module.config(function($translateProvider) {

  $translateProvider.preferredLanguage('en');
  
  $translateProvider.translations('en', {
    'TITLE': 'Hello',
    'FOO': 'This is a paragraph'
  });
 
  $translateProvider.translations('nl', {
    'TITLE': 'Hallo',
    'FOO': 'Dies ist ein Paragraph'
  }); 
  
});

})();

