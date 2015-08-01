(function () {
'use strict';
var module = angular.module('fim.base');
module.config(function($routeProvider) {  
  $routeProvider
    .when('/wallet', {
      templateUrl: 'partials/wallet.html',
      controller: 'WalletController'
    });
});
module.controller('WalletController', function($scope, $rootScope, WalletService, plugins) {
  var login = new WalletService();
  $scope.entries = [];

  function reload() {
    $scope.entries = login._getList().map(function (a) {
      return { name: a[0], cipher_key: a[1], account: a[2], engine: a[3] }
    });
  }
  reload();

  $scope.remove = function (a) {
    plugins.get('alerts').confirm({
      title: 'Remove key',
      message: "Do you want to remove this encrypted key? (cannot be undone)"
    }).then(
      function (confirmed) {
        if (confirmed) {
          var list = login._getList().filter(function (_a) {
            return !(a.name == _a[0] && a.cipher_key == _a[1] && a.account == _a[2] && a.engine == _a[3]);
          });
          login._saveList(list);
          $scope.$evalAsync(reload);
        }
      }
    );
  }

  $scope.loadBackup = function () {
    
  }
});
})();