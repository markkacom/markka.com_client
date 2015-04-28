(function () {
'use strict';
var module = angular.module('fim.base');
module.factory('BlockchainDownloadProvider', function (nxt, $timeout, serverService) {

  var DOWNLOADING_THRESHOLD = 60 * 60 * 1000; // 1 hour in MS
  var nxt_genesis           = (new Date(Date.UTC(2014, 1, 7, 12, 23, 29, 5))).getTime();
  var fim_genesis           = (new Date(Date.UTC(2013, 10, 24, 12, 0, 0, 0))).getTime();

  function BlockchainDownloadProvider(api, $scope) {
    var self            = this;
    this.api            = api;
    this.$scope         = $scope;
    this.blockheight    = 0;
    this.downloading    = false;
    this.progress       = false;
    this.server_running = serverService.isRunning(api.engine.type);
    this.port           = api.engine.port,
    this.net_name       = api.test?'test-net':'main-net';
    this.test_net       = api.test;
    this.version        = 0; 
    this.application    = '';
    this.destroyed      = false;
    this.genesis        = api.type == 'TYPE_NXT' ? nxt_genesis : fim_genesis;
    this.remoteheight   = 0;

    var onexit          = angular.bind(this, this.onServerExit);
    var onstart         = angular.bind(this, this.onServerStart);
    var onready         = angular.bind(this, this.onServerReady);

    serverService.addListener(api.engine.type, 'exit', onexit);
    serverService.addListener(api.engine.type, 'start', onstart);
    serverService.addListener(api.engine.type, 'ready', onready);

    $scope.$on("$destroy", function() { 
      self.destroyed    = true;
      serverService.removeListener(api.engine.type, 'exit', onexit);
      serverService.removeListener(api.engine.type, 'start', onstart);
      serverService.removeListener(api.engine.type, 'ready', onready);
    });

    this.onSetCurrentBlockLocal = angular.bind(this, this.setCurrentBlockLocal);

    /* observes the local server */
    if (serverService.isReady(this.api.engine.type)) {
      api.engine.localSocket().subscribe('blockPopped', this.onSetCurrentBlockLocal, $scope);
      api.engine.localSocket().subscribe('blockPushed', this.onSetCurrentBlockLocal, $scope);
    }

    /* and observes the remote server */
    api.engine.socket().subscribe('blockPopped', angular.bind(this, this.setCurrentBlock), $scope);
    api.engine.socket().subscribe('blockPushed', angular.bind(this, this.setCurrentBlock), $scope);
  };
  BlockchainDownloadProvider.prototype = {
    load: function () {
      var self = this;
      this.$scope.$evalAsync(function () {
        $timeout(function () { self.getNetworkData(); }, 1, false);  
      });
    },

    getNetworkData: function () {
      var self = this;

      /* get remote server state */
      this.api.engine.socket().getBlockchainState().then(
        function (data) {
          self.$scope.$evalAsync(function () {
            self.remoteheight = data.height;
          });
        }
      );      

      /* get local server state */
      if (serverService.isReady(this.api.engine.type)) {
        var socket = this.api.engine.localSocket();
        socket.getBlockchainState().then(
          function (data) {
            self.setCurrentBlockLocal(data);
            socket.callAPIFunction({ requestType: "getBlockchainStatus" }).then(
              function (data) {
                self.$scope.$evalAsync(function () {
                  self.version     = data.version;
                  self.application = data.application;
                });
              }
            );
          }
        );
      }
    },

    setCurrentBlock: function (block) {
      var self = this;
      this.$scope.$evalAsync(function () {      
        self.remoteheight = block.height;
      });
    },

    setCurrentBlockLocal: function (block) {
      var self = this;
      this.$scope.$evalAsync(function () {
        var now          = Date.now();
        var total        = now - self.genesis; // the total time from genesis to now
        var date         = nxt.util.timestampToDate(block.timestamp);
        self.blockheight = block.height;

        var elapsed      = date.getTime() - self.genesis; // elapsed time from genesis to block
        self.progress    = (elapsed * 100) / total;
        self.downloading = (now - date.getTime()) > DOWNLOADING_THRESHOLD;
      });
    },

    onServerStart: function () {
      console.log('BlockchainDownloadProvider.onServerStart');
      var self = this;
      this.$scope.$evalAsync(function () {
        self.server_running = true;
      });
    },

    onServerReady: function () {
      console.log('BlockchainDownloadProvider.onServerReady');
      var self = this;
      $timeout(function () {
        var observer = {
          onopen: function () {
            self.api.engine.localSocket().removeObserver(this);
            self.load();
          }
        };
        self.api.engine.localSocket().addObserver(observer);
        self.api.engine.localSocket().subscribe('blockPopped', self.onSetCurrentBlockLocal, self.$scope);
        self.api.engine.localSocket().subscribe('blockPushed', self.onSetCurrentBlockLocal, self.$scope);        
        self.api.engine.localSocket().refresh();
      }, 1000, false);
    },

    onServerExit: function () {
      console.log('BlockchainDownloadProvider.onServerExit');
      var self = this;
      this.$scope.$evalAsync(function () {
        self.server_running = false;
        self.downloading    = false;
        self.api.engine.localSocket().unsubscribe('blockPopped', self.onSetCurrentBlockLocal);
        self.api.engine.localSocket().unsubscribe('blockPushed', self.onSetCurrentBlockLocal); 
        self.api.engine.localSocket().stop();
      });
    }
  }
  return BlockchainDownloadProvider;
});
})();