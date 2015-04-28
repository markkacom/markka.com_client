(function () {
'use strict';
var module = angular.module('fim.base');

module.config(function($routeProvider) {
  $routeProvider.when('/search/:engine/:category/:query?', {
    templateUrl: 'partials/search.html',
    controller: 'SearchController'
  })
});

module.controller('SearchController', function ($scope, nxt, $routeParams, $rootScope, SearchProvider, $location) {

  $rootScope.paramEngine  = $routeParams.engine;
  $scope.paramEngine      = $routeParams.engine;
  $scope.paramCategory    = $routeParams.category;
  $scope.paramQuery       = $routeParams.query || '';

  if ($scope.paramEngine == 'fim') {
    var api = nxt.fim();
  }
  else if ($scope.paramEngine == 'nxt') {
    var api = nxt.nxt();
  }
  else {
    $location.path('home/fim/activity/latest');
    return;
  }

  if (['accounts', 'assets', 'currencies', 'market', 'aliases'].indexOf($scope.paramCategory) == -1) {
    $location.path('/home/fim/activity/latest');
    return;
  }

  /* Breadcrumbs */
  $scope.breadcrumb = [];
  $scope.breadcrumb.push({
    label: 'translate.home',
    href:  "#/home/"+$scope.paramEngine+"/activity/latest",
    translate: true
  });
  $scope.breadcrumb.push({
    label: 'translate.search',
    active:  true,
    translate: true
  });
  $scope.breadcrumb.push({
    label: $scope.paramEngine.toUpperCase(),
    active: true,
  });
  $scope.breadcrumb.push({
    label: 'translate.'+$scope.paramCategory,
    active: true,
    translate: true
  });  
  $scope.breadcrumb.push({
    label: $scope.paramQuery,
    active:  true,
  });

  var reload_promise = null;
  function reload() {
    $scope.provider = new SearchProvider(api, $scope, 10, $scope.paramCategory, $scope.paramQuery);
    reload_promise = $scope.provider.reload();
    reload_promise.then(function () {
      reload_promise = null;
    });
  }
  reload();

  $scope.doSearch = function () {
    $location.path('/search/'+$scope.paramEngine+'/'+$scope.paramCategory+'/'+$scope.paramQuery);
  }

  $scope.$watch('paramQuery', function () {
    if (reload_promise) {
      reload_promise.then(function () {
        reload();
      })
    }
    else {
      reload();
    }
    window.locaction
  });

});
})();