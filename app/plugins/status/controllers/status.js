(function () {
'use strict';
var module = angular.module('fim.base');
module.controller('StatusPlugin', function($scope, serverService, nxt, $interval, $http) {

  var SERVER_STATE_INTERVAL = 1000 * 2;

  $scope.$on("$destroy", function() { 
    nxt.fim().requestHandler.removeObserver(fimRequestObserver);
    nxt.nxt().requestHandler.removeObserver(nxtRequestObserver);   

    serverService.removeListener('TYPE_NXT', 'exit', nxtServerOnExit);
    serverService.removeListener('TYPE_NXT', 'start', nxtServerOnStart);
    serverService.removeListener('TYPE_FIM', 'exit', fimServerOnExit);
    serverService.removeListener('TYPE_FIM', 'start', fimServerOnStart);

    if (fimServerInterval) {
      $interval.cancel(fimServerInterval);
    }
    if (nxtServerInterval) {
      $interval.cancel(nxtServerInterval);
    }
  });  

  $scope.fim = {
    server_running: serverService.isRunning('TYPE_FIM'),
    port: nxt.fim().engine.port,
    test_net: nxt.fim().test,
    requests: []
  };

  $scope.nxt = {
    server_running: serverService.isRunning('TYPE_NXT'),
    port: nxt.nxt().engine.port,
    test_net: nxt.nxt().test,
    requests: []    
  }; 

  function removeEntry(requests, methodName, url) {
    var index = -1;
    for (var i=0; i<requests.length; i++) {
      if (requests[i].methodName == methodName && requests[i].url == url) {
        index = i;
        break;
      }
    }
    if (index != -1) {
      requests.splice(index, 1);
    }
  }

  function createRequestObserver(engine) {
    return {
      start: function (methodName, node) {
        $scope.$evalAsync(function () {
          $scope[engine].requests.unshift({
            // clazz: 'info',
            font_awsome: 'fa fa-circle-o-notch fa-spin',
            methodName: methodName,
            url: node.url.replace(/^(http:\/\/)/,''),
            use_cors: node.require_cors_proxy
          });
          $scope[engine].requests = $scope[engine].requests.slice(0, 6);
        });
      },
      success: function (methodName, node, data, tries_left) {
        $scope.$evalAsync(function () {
          var url = node.url.replace(/^(http:\/\/)/,'');
          removeEntry($scope[engine].requests, methodName, url);

          $scope[engine].requests.unshift({
            glyph_icon: 'glyphicon glyphicon-ok',
            methodName: methodName,
            url: url,
            use_cors: node.require_cors_proxy,
            tries_left: tries_left
          });
          $scope[engine].requests = $scope[engine].requests.slice(0, 6);
        });
      },
      failed: function (methodName, node, data, tries_left) {
        if (!node) return; /* Weirdness. Cant pinpoint when and why this keeps happening */
        $scope.$evalAsync(function () {
          var url = node.url.replace(/^(http:\/\/)/,'');
          removeEntry($scope[engine].requests, methodName, url);

          $scope[engine].requests.unshift({
            clazz: 'danger',
            glyph_icon: 'glyphicon glyphicon-remove',
            methodName: methodName,
            url: url,
            use_cors: node.require_cors_proxy,
            tries_left: tries_left            
          });
          $scope[engine].requests = $scope[engine].requests.slice(0, 6);
        });
      }
    }
  }

  var nxtRequestObserver = createRequestObserver('nxt');
  var fimRequestObserver = createRequestObserver('fim');

  nxt.fim().requestHandler.addObserver(fimRequestObserver);
  nxt.nxt().requestHandler.addObserver(nxtRequestObserver);

  function nxtServerOnExit() {
    $scope.$evalAsync(function () {
      $scope.nxt.server_running = false;
    });
  }

  function nxtServerOnStart() {
    $scope.$evalAsync(function () {
      $scope.nxt.server_running = true;
    });
  }

  function fimServerOnExit() {
    $scope.$evalAsync(function () {
      $scope.fim.server_running = false;
    });
  }

  function fimServerOnStart() {
    $scope.$evalAsync(function () {
      $scope.fim.server_running = true;
    });
  }

  serverService.addListener('TYPE_NXT', 'exit', nxtServerOnExit);
  serverService.addListener('TYPE_NXT', 'start', nxtServerOnStart);
  serverService.addListener('TYPE_FIM', 'exit', fimServerOnExit);
  serverService.addListener('TYPE_FIM', 'start', fimServerOnStart);

  /**
   * The downloadmonitor is a function that's supposed to be called from an interval.
   * It will do a getState request on the localhost and update the progressbar
   * and other indicators accordingly.
   */
  function createDownloadMonitor(type) {
    return function interval() {
      var id = type == 'TYPE_FIM' ? 'fim' : 'nxt';
      if ($scope[id].server_running) {
        var api = nxt.get(type);
        $http({
          method: 'GET', 
          dataType: 'json',
          url: api.engine.localhost+':'+api.engine.port+'/nxt?requestType=getState&random='+Math.random(),
        }).success(
          function (data, status, headers, config) {
            $scope.$evalAsync(function () {
              $scope[id].numberOfBlocks = data.numberOfBlocks;
              $scope[id].lastBlockchainFeederHeight = data.lastBlockchainFeederHeight;
              $scope[id].version = data.version;
            });
          }
        ).error(
          function (data, status, headers, config) {
            console.log('Could not getState from localhost',data);
          }
        );
      }
    }
  }

  var fimServerInterval = $interval(createDownloadMonitor('TYPE_FIM'), SERVER_STATE_INTERVAL);
  var nxtServerInterval = $interval(createDownloadMonitor('TYPE_NXT'), SERVER_STATE_INTERVAL);

});
})();