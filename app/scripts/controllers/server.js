(function () {
'use strict';
var module = angular.module('fim.base');

module.config(function($routeProvider) {
  $routeProvider.when('/server/:engine/:section', {
    templateUrl: 'partials/server.html',
    controller: 'ServerController'
  });
});

module.filter('slice', function() {
  return function(arr, start, end) {
    return (arr || []).slice(start, end);
  };
});

module.directive('serverConfigTable', ['$compile', function($compile) {

  return {
    restrict: 'A',
    scope: { provider: '=' },
    link: function(scope, element, attrs) {
      var provider = scope.provider;
      var html = [], row;
      html.push('<table class="table table-condensed table-striped table-hover"><tbody>');
      for (var i=0; i<provider.rows.length; i++) {
        row = provider.rows[i];
        html.push('<tr>');
        switch (row.type) {
          case 0: {
            html.push('<td colspan="3"><h3><b>',row.name,'</b></h3></td>');
            break;
          }
          case 1: {
            html.push('<td style="vertical-align: middle;" nowrap>',row.name,'</td>',
                      '<td style="vertical-align: middle; min-width: 300px">',
                      '<div class="input-group">',
                      '<input class="form-control" ',
                      'value="',row.value,'" ',
                      'onchange="angular.element(this).scope().$parent.provider.onchange(\'',row.name,'\',this.value)">',
                      '<span class="input-group-btn">',
                      '<span class="btn btn-success" ',
                      'onclick="angular.element(this).scope().$parent.provider.onsave(\'',row.name,'\')" ',
                      'tooltip="Save">',
                      '<i class="fa fa-floppy-o"></i>',
                      '</span>',
                      '<span class="btn btn-default" ',
                      'onclick="angular.element(this).scope().$parent.provider.onrestore(\'',row.name,'\', angular.element(this))" ',
                      'tooltip="Reset">',
                      '<i class="fa fa-undo"></i>',
                      '</span>',
                      '</span>',
                      '</div>',
                      '</td>',
                      '<td style="vertical-align: middle; width: 100%">',row.description,'</td>');
            break;
          }
        }
        html.push('</tr>');
      }
      html.push('</tbody></table>');

      element.append(html.join(''));
    }
  };
}]);


module.controller('ServerController', function ($scope, $rootScope, nxt, $routeParams, serverService, $interval, 
  settings, ServerConfigProvider, PeerProvider, ServerConsoleProvider) {

  $rootScope.paramEngine  = $routeParams.engine;
  $scope.paramEngine      = $routeParams.engine;
  $scope.paramSection     = $routeParams.section;
  $scope.breadcrumb       = [];
  $scope.scrolllock       = true;

  if ($scope.paramEngine == 'fim') {
    var api  = nxt.fim();
    $scope.symbol = $scope.paramEngine.toUpperCase();
  }
  else if ($scope.paramEngine == 'nxt') {
    var api = nxt.nxt();
    $scope.symbol = $scope.paramEngine.toUpperCase();
  }
  else {
    $location.path('home/fim/activity/latest');
    return;
  }

  if (['console', 'config', 'peers'].indexOf($scope.paramSection) == -1) {
    $location.path('activity/'+$scope.paramEngine+'/activity/latest');
    return;
  }

  $scope.consoleProvider = new ServerConsoleProvider(api, $scope);  

  /* Breadcrumbs */
  $scope.breadcrumb.push({
    label: 'translate.home',
    href:  "#/home/"+$scope.paramEngine+"/activity/latest",
    translate: true
  });
  $scope.breadcrumb.push({
    label: 'translate.server',
    active: true,
    translate: true
  });  
  $scope.breadcrumb.push({
    label: $scope.paramEngine.toUpperCase(),
    active: true
  });  
  $scope.breadcrumb.push({
    label: 'translate.'+$scope.paramSection,
    active: true,
    translate: true
  });

  switch ($scope.paramSection) {
    case 'config': {
      $scope.provider = new ServerConfigProvider(api, $scope);
      $scope.provider.load();
      break;
    }
    case 'peers': {
      $scope.provider = new PeerProvider(api, $scope);
      $scope.provider.reload();
      break;
    }  
  }

  $scope.startServer = function (type) {
    serverService.startServer(type);
  }

  $scope.stopServer = function (type) {
    serverService.stopServer(type);
  }

  $scope.rescanChain = function (type) {

  }

  $scope.deleteChain = function (type) {

  }

  $scope.clearConsole = function () {
    serverService.getMessages(api.engine.type).length = 0;
  }

  /* always/never start preferences */

  $scope.items = {};
  var never_start_setting  = 'initialization.never_start_' + (api.engine.type == 'TYPE_NXT' ? 'nxt' : 'fimk');
  var always_start_setting = 'initialization.always_start_' + (api.engine.type == 'TYPE_NXT' ? 'nxt' : 'fimk');
  $scope.items.neverStart  = settings.get(never_start_setting);
  $scope.items.alwaysStart = settings.get(always_start_setting);

  $scope.neverStartChanged = function () {
    settings.update(never_start_setting, $scope.items.neverStart);
    if ($scope.items.neverStart && $scope.items.alwaysStart) {
      $scope.items.alwaysStart = false;
      settings.update(always_start_setting, false);
    }
  }

  $scope.alwaysStartChanged = function () {
    settings.update(always_start_setting, $scope.items.alwaysStart);
    if ($scope.items.alwaysStart && $scope.items.neverStart) {
      $scope.items.neverStart = false;
      settings.update(never_start_setting, false);
    }    
  }

});
})();