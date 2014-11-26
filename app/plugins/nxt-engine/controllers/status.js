(function () {
'use strict';
var module = angular.module('fim.base');
module.controller('NxtEngineStatusPlugin', function($scope, serverService, nxt, $interval, $http, db) {

  /* */
  var SERVER_STATE_INTERVAL = 1000 * 10;

  /* How many blocks before the end until we indicate the blockchain has finished downloading */
  var DOWNLOAD_DONE = 100;
  var api = nxt.nxt();
  var id = 'TYPE_NXT';
  var blocks_table = 'nxtblocks';

  $scope.server_running = serverService.isRunning(id);
  $scope.downloading = false;
  $scope.port = api.engine.port,
  $scope.net_name = api.test?'test-net':'main-net';
  $scope.test_net = api.test,
  $scope.requests = [];
  $scope.show_spinner = false;
  $scope.numberOfBlocks = 0;
  $scope.lastBlockchainFeederHeight = 0;
  $scope.version = 0;  
  $scope.blockheight = 0;

  $scope.$on("$destroy", function() { 
    api.requestHandler.removeObserver(observer);
    serverService.removeListener(id, 'exit', onExit);
    serverService.removeListener(id, 'start', onStart);
    $interval.cancel(interval);
  });

  var observer = {
    start: function (methodName, node) {
      $scope.$evalAsync(function () {
        $scope.requests.unshift({
          font_awsome: 'fa fa-circle-o-notch fa-spin',
          methodName: methodName,
          url: fixurl(node.url),
          use_cors: node.require_cors_proxy
        });
        $scope.requests = $scope.requests.slice(0, 6);
      });
    },
    success: function (methodName, node, data, tries_left) {
      $scope.$evalAsync(function () {
        var url = fixurl(node.url);
        if (url) {
          removeEntry($scope.requests, methodName, url);
          $scope.requests.unshift({
            glyph_icon: 'glyphicon glyphicon-ok',
            methodName: methodName,
            url: url,
            use_cors: node.require_cors_proxy,
            tries_left: tries_left
          });
          $scope.requests = $scope.requests.slice(0, 6);
        }
      });
    },
    failed: function (methodName, node, data, tries_left) {
      if (!node) return; /* Weirdness. Cant pinpoint when and why this keeps happening */
      $scope.$evalAsync(function () {
        var url = fixurl(node.url);
        if (url) {
          removeEntry($scope.requests, methodName, url);
          $scope.requests.unshift({
            clazz: 'danger',
            glyph_icon: 'glyphicon glyphicon-remove',
            methodName: methodName,
            url: url,
            use_cors: node.require_cors_proxy,
            tries_left: tries_left            
          });
          $scope.requests = $scope.requests.slice(0, 6);
        }
      });
    }
  };

  function fixurl(url) {
    return url ? url.replace(/^(http:\/\/)/,'') : '';
  }

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

  api.requestHandler.addObserver(observer);

  function onExit() {
    $scope.$evalAsync(function () {
      $scope.server_running = false;
      $scope.downloading = false;
    });
  }

  function onStart() {
    $scope.$evalAsync(function () {
      $scope.server_running = true;
    });
  }

  serverService.addListener(id, 'exit', onExit);
  serverService.addListener(id, 'start', onStart);

  // // Initialize one time
  // api.engine.getLocalHostNode();

  /* Downloadmonitor is called from an interval. Will do a getState request on the localhost 
   * and update the progressbar and other indicators accordingly. */
  var interval = $interval(function interval() {

    /* Update download state for running server */
    if ($scope.server_running) {
      // api.getState({}, {
      //   priority: 1,
      //   podium: requests.mainStage,
      //   node: api.engine.localHostNode
      // }).then(
      //   function (data) {
      //     $scope.$evalAsync(function () {
      //       $scope.numberOfBlocks = data.numberOfBlocks;
      //       $scope.lastBlockchainFeederHeight = data.lastBlockchainFeederHeight;
      //       $scope.version = data.version;
      //       $scope.downloading = ($scope.lastBlockchainFeederHeight - $scope.numberOfBlocks) > DOWNLOAD_DONE;
      //       //api.engine.can_use_localhost = !$scope.downloading;
      //     });
      //   },
      //   function (data) {
      //     console.log('Could not getState from localhost',data);

      //     /* XXX - not perfect */
      //     api.engine.can_use_localhost = false;          
      //   }
      // );

      $http({
        method: 'GET', 
        dataType: 'json',
        url: api.engine.localhost+':'+api.engine.port+'/nxt?requestType=getState&random='+Math.random(),
      }).success(
        function (data, status, headers, config) {
          $scope.$evalAsync(function () {
            $scope.numberOfBlocks = data.numberOfBlocks;
            $scope.lastBlockchainFeederHeight = data.lastBlockchainFeederHeight;
            $scope.version = data.version;
            $scope.downloading = ($scope.lastBlockchainFeederHeight - $scope.numberOfBlocks) > DOWNLOAD_DONE;

            //api.engine.can_use_localhost = !$scope.downloading;
          });
        }
      ).error(
        function (data, status, headers, config) {
          console.log('Could not getState from localhost',data);

          // XXX - not perfect
          api.engine.can_use_localhost = false;
        }
      );
    }
    else {
      /* XXX - not perfect */
      api.engine.can_use_localhost = false;
    }

    /* Update blockheight */
    db[blocks_table].orderBy('height').last().then(
      function (block) {
        if (block) {
          $scope.$evalAsync(function () {
            $scope.blockheight = block.height;
          });
        }
      }
    );    
  }, SERVER_STATE_INTERVAL);

});
})();