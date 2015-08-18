(function() {
  'use strict';
  var module = angular.module('fim.base');

  module.controller('GoodsCtrl', function($location, $scope, $routeParams, nxt, plugins, shoppingCartService, AllGoodsProvider) {

    $scope.id_rs = $routeParams.id_rs;

    var api = nxt.get($scope.id_rs);

    $scope.shoppingCart = shoppingCartService.get();

    $scope.deleteGood = function(good) {
      var deleteGoodArgs = {
        requestType: 'dgsDelisting',
        goods: good.goods
      }
      plugins.get('transaction').get('dgsDelisting').execute($scope.id_rs, deleteGoodArgs).then(function(deletedGood) {
        $scope.showGoods.entities.splice(deletedGood, 1);
      })
    }

    $scope.details = function(goodsDetails) {
      $location.path('/goods/' + $scope.id_rs + '/' + goodsDetails.goods);
    }

    $scope.add = function() {
      var args = {
        requestType: 'dgsListing'
      }
      plugins.get('transaction').get('dgsListing').execute($scope.id_rs, args).then(function(addedGoods) {
        $scope.isAdded = addedGoods;
        $scope.priceNQT = nxt.util.convertToNQT(addedGoods.priceNXT);
      })
    }

    $scope.showGoods = new AllGoodsProvider(api, $scope, 10, $scope.id_rs);
    $scope.showGoods.reload();
  });
})();