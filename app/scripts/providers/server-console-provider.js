(function () {
'use strict';
var module = angular.module('fim.base');
module.factory('ServerConsoleProvider', function (serverService, plugins, $interval) {
  function ServerConsoleProvider(api, $scope) {
    this.api = api;
    this.$scope = $scope;
    this.messages = serverService.getMessages(api.engine.type);
    this.isRunning = serverService.isRunning(api.engine.type);

    // var self = this;
    // $interval(function () {
    //   serverService.write(api.engine.type, 'Message - ' + new Date());
    // }, 100);

    var onmsg = angular.bind(this, this.onmsg);
    var onstart = angular.bind(this, this.onstart);
    var onexit = angular.bind(this, this.onexit);

    serverService.addListener(api.engine.type, 'stdout', onmsg);
    serverService.addListener(api.engine.type, 'stderr', onmsg);
    serverService.addListener(api.engine.type, 'start', onstart);
    serverService.addListener(api.engine.type, 'exit', onexit);    

    $scope.$on('$destroy', function () {
      serverService.removeListener(api.engine.type, 'stdout', onmsg);
      serverService.removeListener(api.engine.type, 'stderr', onmsg);
      serverService.removeListener(api.engine.type, 'start', onstart);
      serverService.removeListener(api.engine.type, 'exit', onexit);
    });
  }
  ServerConsoleProvider.prototype = {
    onmsg: function () {
      this.$scope.$evalAsync(function () {});
    },
    onstart: function () {
      var self = this;
      this.$scope.$evalAsync(function () {
        self.isRunning = true;
      });
    },
    onexit: function () {
      var self = this;
      this.$scope.$evalAsync(function () {
        self.isRunning = false;
      });
    }
  };
  return ServerConsoleProvider;  
});
})();