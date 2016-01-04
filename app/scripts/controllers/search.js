/**
 * The MIT License (MIT)
 * Copyright (c) 2016 Krypto Fin ry and the FIMK Developers
 *
 * Permission is hereby granted, free of charge, to any person obtaining a copy of
 * this software and associated documentation files (the "Software"), to deal in
 * the Software without restriction, including without limitation the rights to
 * use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of
 * the Software, and to permit persons to whom the Software is furnished to do so,
 * subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be included in all
 * copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
 * SOFTWARE.
 * */
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
  $scope.symbol           = api.engine.symbol;

  if (['accounts', 'assets', 'currencies', 'market', 'aliases'].indexOf($scope.paramCategory) == -1) {
    $location.path('/home/fim/activity/latest');
    return;
  }

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