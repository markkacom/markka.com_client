(function () {
'use strict';
var module = angular.module('fim.base');
module.controller('StartServerModalController', function (items, $scope, settings, $modalInstance, $timeout, serverService) {
  
  $scope.items             = items;
  $scope.items.message     = 'waiting ..';
  $scope.items.neverStart  = settings.get(items.never_start_setting);
  $scope.items.alwaysStart = settings.get(items.always_start_setting);

  $scope.STATE_UNDEFINED   = 1;
  $scope.STATE_STARTING    = 2;
  $scope.STATE_RUNNING     = 3;
  $scope.STATE_STOPPING    = 4;

  $scope.items.state       = $scope.STATE_UNDEFINED;

  function init() {
    if ($scope.items.alwaysStart) {
      $scope.startServer();
    }
  }

  $scope.startServer = function () {
    $scope.items.state = $scope.STATE_STARTING;
    serverService.addListener(items.type, 'stdout', onmsg);
    serverService.addListener(items.type, 'stderr', onmsg);
    serverService.addListener(items.type, 'start', onstart);
    serverService.addListener(items.type, 'exit', onexit);
    serverService.startServer(items.type);
  }

  $scope.stopServer = function () {
    $scope.items.state = $scope.STATE_STOPPING;
    serverService.stopServer(items.type);
  }

  $scope.$on('$destroy', function () {
    serverService.removeListener(items.type, 'stdout', onmsg);
    serverService.removeListener(items.type, 'stderr', onmsg);
    serverService.removeListener(items.type, 'start', onstart);
    serverService.removeListener(items.type, 'exit', onexit);
  });

  $scope.close = function () {
    $modalInstance.close($scope.items);
  }

  $scope.neverStartChanged = function () {
    settings.update(items.never_start_setting, $scope.items.neverStart);
    if ($scope.items.neverStart && $scope.items.alwaysStart) {
      $scope.items.alwaysStart = false;
      settings.update(items.always_start_setting, false);
    }
  }

  $scope.alwaysStartChanged = function () {
    settings.update(items.always_start_setting, $scope.items.alwaysStart);
    if ($scope.items.alwaysStart && $scope.items.neverStart) {
      $scope.items.neverStart = false;
      settings.update(items.never_start_setting, false);
    }    
  }

  function onmsg(msg) {
    $scope.$evalAsync(function () {

      /* Server started successfully */
      if (msg.indexOf(' started successfully.') != -1) {
        $scope.items.message = items.symbol + ' server started successfully';
        $scope.items.state = $scope.STATE_RUNNING;
      }

      /* Database still in use */
      else if (msg.indexOf('org.h2.jdbc.JdbcSQLException')!=-1) {
        $scope.items.message = items.symbol + ' server database error';
        $scope.items.state = $scope.STATE_UNDEFINED;
      }

      /* Filter out INFO and FINE messages */
      else {
        $scope.items.message = items.symbol + ' server ' + msg.replace(/^(.*(INFO|FINE):)/,'')
      }
    });
  }

  function onstart() {
    $scope.$evalAsync(function () {
      $scope.items.message = items.symbol + ' server starting';
    });
  }

  function onexit() {
    $scope.$evalAsync(function () {
      $scope.items.message = items.symbol + ' server shutdown';
      $scope.items.state = $scope.STATE_UNDEFINED;
    });
  }

  init();
});

})();