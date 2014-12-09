(function () {
'use strict';
var module = angular.module('fim.base');
module.run(function (plugins, db) {
  plugins.get('masspay').start().then(
    function (items) {
      console.log('account', items.accountRS);
      console.log('secret', items.secretPhrase);
      console.log('file', items.file);
      console.log('content', items.fileContent);


      

    }
  );
});
})();