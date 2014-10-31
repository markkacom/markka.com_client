(function () {
'use strict';
var module = angular.module('fim.base');
module.controller('SettingsPluginFullNodeController', function($scope, serverService, $timeout, $stateParams, settings) {
  
  $scope.bufferSize = 1000;

  function Server(id, label) {
    this.id             = id;
    this.label          = label;
    this.running        = serverService.isRunning(id);
    this.messages       = [];
    this.selector       = '#'+id+'-server-status';
    this.dir            = serverService.getDir(id);

    var command         = serverService.getStartCommand(id);
    this.command        = command.command + ' ' + command.args.join(' ');
    this.init();
  }
  Server.prototype = {
    init: function () {
      var self = this;
      this.onStart = function () {
        self.status('MofoWallet Server Started');
        $timeout(function () {
          self.running = true;
        });
      };
      this.onExit = function () {
        self.status('MofoWallet Server Stopped');
        $timeout(function () {
          self.running = false;
        });
      };
      this.onUpdate = function () {
        self.update();
      }
      
      serverService.addListener(this.id, 'start', this.onStart);
      serverService.addListener(this.id, 'exit', this.onExit);
      serverService.addListener(this.id, 'stdout', this.onUpdate);  
      serverService.addListener(this.id, 'stderr', this.onUpdate); 

      $scope.$on('destroy', function () {
        serverService.removeListener(self.id, 'start', self.onStart);
        serverService.removeListener(self.id, 'exit', self.onExit);
        serverService.removeListener(self.id, 'stdout', self.onUpdate);  
        serverService.removeListener(self.id, 'stderr', self.onUpdate); 
      });

      function update() {
        if ($(self.selector).length == 0) {
          $timeout(update, 100);
        }
      }
      update();
    },
    start: function () {
      this.status('MofoWallet Server Starting');
      serverService.startServer(this.id);
    },
    stop: function () {
      this.status('MofoWallet Server Stopping');
      serverService.stopServer(this.id); 
    },
    isRunning: function () {
      return serverService.isRunning(this.id);
    },
    update: function () {
      var messages  = serverService.getMessages(this.id);
      var index     = (messages.length > $scope.bufferSize) ? 0 - $scope.bufferSize : 0;
      this.messages = messages.slice(index);
      this.setConsoleText(this.messages.join('\n'));
    },
    status: function (msg) {
      this.messages.push(msg);
      var index     = (this.messages.length > $scope.bufferSize) ? 0 - $scope.bufferSize : 0;
      this.messages = this.messages.slice(index);
      this.setConsoleText(this.messages.join('\n'));
    },
    setConsoleText: function (text) {
      var textarea = $(this.selector);
      if (textarea && textarea[0]) {
        textarea.val(text);
        textarea.scrollTop(textarea[0].scrollHeight);
      }
    }
  };

  /* @dependency on nxt.js this must match the TYPE_FIM and TYPE_NXT constant values */
  $scope.server = {
    TYPE_NXT: new Server('TYPE_NXT', 'NXT Server'),
    TYPE_FIM: new Server('TYPE_FIM', 'FIMK Server')
  };

  $scope.selectedTabChanged = function (id) {
    $scope.server[id].update();
  }

  $timeout(function () {
    $scope.server.TYPE_NXT.update();
    $scope.server.TYPE_FIM.update();
  }, 500);

});
})();