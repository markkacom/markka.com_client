(function () {
'use strict';
var module = angular.module('fim.base');
module.run(function (plugins) {
  plugins.get('masspay').start();
});
})();