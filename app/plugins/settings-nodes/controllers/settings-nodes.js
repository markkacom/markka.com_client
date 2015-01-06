(function () {
'use strict';
var module = angular.module('fim.base');
module.controller('SettingsPluginNodesController', function($scope, db, ngTableParams, $timeout, nxt, alerts, $http, settings) {

  $scope.TYPE_FIM = nxt.TYPE_FIM;  
  $scope.TYPE_NXT = nxt.TYPE_NXT;

  $scope.batchAddContents = '';
  $scope.nodes            = [];

  $scope.tableParams  = new ngTableParams({page: 1, count: 10}, {
    total: 0,
    getData: function($defer, params) {
      $defer.resolve($scope.nodes.slice((params.page() - 1) * params.count(), params.page() * params.count()));
    }
  });

  $scope.engines = [
    { 
      label: 'NXT', 
      type: nxt.TYPE_NXT, 
      port: 7876,
      key: 'nxt.localhost.force',
      more: {
        label: 'Find more nodes through peerexplorer.com',
        fn: function () {
          $http({method: 'GET', dataType: 'json', url: 'http://www.corsproxy.com/www.peerexplorer.com/api_openapi'}).success(
            function (data) {
              $timeout(function () {
                data.peers        = data.peers || [];
                $scope.batchAddContents += ($scope.batchAddContents?'\n':'') + data.peers.map(function (ip) { return 'http://' + ip }).join('\n');
              });
            }
          );
        }
      }
    },
    { 
      label: 'FIM (test)', 
      type: nxt.TYPE_FIM, 
      port: 6886,
      key: 'fim.localhost.force'
    },
    { 
      label: 'FIM', 
      type: nxt.TYPE_FIM, 
      port: 7886,
      key: 'fim.localhost.force'
    },
    { 
      label: 'NXT (test)', 
      type: nxt.TYPE_NXT, 
      port: 6876,
      key: 'nxt.localhost.force' 
    }
  ];
  $scope.selectedEngine   = $scope.engines[0];

  function find(array, id, value) {
    for(var i=0,l=array.length; i<l; i++) { if (array[i][id] == value) { return i; } }
    return -1;
  }

  function filter(array, port) {
    return array.filter(function (node) { return node.port == port });
  }  

  function sort(a,b) {
    return b.start_timestamp - a.start_timestamp;
  }

  var observer = null;
  $scope.selectedEngineChanged = function () {
    $scope.batchAddContents = '';
    $scope.batchAdd = false;

    var engine = $scope.selectedEngine;
    if (observer) {
      db.nodes.removeObserver(observer); 
    }
    $scope.$evalAsync(function () {
      $scope.localhostForce = settings.get($scope.selectedEngine.key);
    });

    /* Load nodes from database */
    db.nodes.where('port').equals(engine.port).toArray().then(
      function (nodes) {
        $scope.nodes = nodes;
        $scope.nodes.sort(sort);

        /* Create new observer/updater */
        observer = {
          create: function (nodes) {
            $scope.nodes = $scope.nodes.concat(filter(nodes, engine.port));
            $scope.nodes.sort(sort);
          },
          update: function (nodes) {
            angular.forEach(filter(nodes, engine.port), function (node) {
              var index = find($scope.nodes, 'id', node.id);
              if (index != -1) {
                angular.extend($scope.nodes[index], node);
              }
            });
            $scope.nodes.sort(sort);
          },
          remove: function (nodes) {
            angular.forEach(filter(nodes, engine.port), function (node) {
              var index = find($scope.nodes, 'id', node.id);
              if (index != -1) {
                $scope.nodes.splice(index, 1);
              }
            });
            $scope.nodes.sort(sort);
          },
          finally: function () { 
            /* Called from $timeout */
            $scope.tableParams.total($scope.nodes.length);
            $scope.tableParams.reload(); 
          }
        };
        db.nodes.addObserver($scope, observer); 

        /* Finally reload table */
        $timeout(function () {
          $scope.tableParams.total(nodes.length);
          $scope.tableParams.reload();
        });
      }
    );
  };
  $scope.selectedEngineChanged();

  $scope.localhostForceChanged = function () {
    settings.update($scope.selectedEngine.key, $scope.localhostForce);
  };

  settings.resolve('fim.localhost.force', function (value) {
    if ($scope.selectedEngine.key == 'fim.localhost.force') {
      $scope.$evalAsync(function () {
        $scope.localhostForce = value;
      });
    }
  });

  settings.resolve('nxt.localhost.force', function (value) {
    if ($scope.selectedEngine.key == 'fim.localhost.force') {
      $scope.$evalAsync(function () {
        $scope.localhostForce = value;
      });
    }
  });

  $scope.clearSelectedEngine = function () {
    db.nodes.where('port').equals($scope.selectedEngine.port).delete().then(
      function (nodes) {
        $timeout(function () {
          $scope.nodes = [];
          $scope.tableParams.total(0);
          $scope.tableParams.reload();
        });
      }
    );
  };

  $scope.saveNodes = function () {
    var nodes  = $scope.batchAddContents.split('\n');
    var port   = $scope.selectedEngine.port;

    db.nodes.where('port').equals(port).toArray().then(
      function (all_existing) {
        var existing_hash = {};
        angular.forEach(all_existing, function (existing_node) {
          existing_hash[existing_node.url] = 1;
        });

        db.transaction('rw', db.nodes, function() {
          var no_duplicates = {};
          angular.forEach(nodes, function (ip) {
            if (!(ip in existing_hash) && !(ip in no_duplicates)) {
              var t = ip.split('|');
              var url = t[0];
              var cors = t[1]=='CORS';

              no_duplicates[ip] = 1;
              db.nodes.add({
                url: url,
                supports_cors: cors,
                port: port,
                downloaded: 0,
                success_timestamp: 0,
                failed_timestamp: 0
              });
            }
          });
        });
      }
    );
  };

  // XXX - hack put in lib
  function formatDate(timestamp) {
    var seconds = 9999;
    // multiply by 1000 because Date() requires miliseconds
    var date = new Date(timestamp);
    var hh = date.getUTCHours();
    var mm = date.getUTCMinutes();
    var ss = date.getSeconds();
    //var ml = date.getTime()+'';
    // This line gives you 12-hour (not 24) time
    if (hh > 12) {hh = hh - 12;}
    // These lines ensure you have two-digits
    if (hh < 10) {hh = "0"+hh;}
    if (mm < 10) {mm = "0"+mm;}
    if (ss < 10) {ss = "0"+ss;}
    // This formats your string to HH:MM:SS
    return hh+":"+mm+":"+ss;//+":"+ml.substr(0, 3);
  }  
    
  // t.start_timestamp, t.success_timestamp, t.failed_timestamp
  $scope.formatStartTime = function (start, success, failed) {
    return formatDate(start);
  }

  $scope.formatTimestamp = function (timestamp) {
    return timestamp == 0 ? '' : $.timeago(timestamp);
  }

  $scope.formatSize = function (size) {
    if (size) {
      return size + ' bytes';
    }
    return '';
  }

  $scope.deleteNode = function (node) {
    db.nodes.delete(node.id);
  }

  $scope.unblackList = function (node) {
    node.update({failed_timestamp:0});
  }

});
})();
