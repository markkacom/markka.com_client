(function() {
  'use strict';
  var module = angular.module('fim.base');

  module.controller('GoodsCtrl', function($location, $scope, $routeParams, nxt, plugins, shoppingCartService, AllGoodsProvider) {

    $scope.id_rs = $routeParams.id_rs;
    $scope.paramSection = $routeParams.listing;
    console.log($scope.paramSection);

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
      $location.path('/goods/' + $scope.id_rs+ '/' + goodsDetails.goods);
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

    if($scope.paramSection == 'listing') {  
      $scope.showGoods = new AllGoodsProvider(api, $scope, 10, $scope.id_rs);
      $scope.showGoods.reload();
      console.log($scope.showGoods);
      console.log('listing');
    }

    else {
      console.log('details');
      var details_args = {
        requestType: 'getDGSGood',
        goods: $scope.paramSection
      }

      api.engine.socket().callAPIFunction(details_args).then(function(data) {
        $scope.goodsDetails = data;
        console.log($scope.goodsDetails);
        $scope.desc = JSON.parse($scope.goodsDetails.description);
      })

      $scope.addToCart = function(goodsDetails) {
        var cartDetails = shoppingCartService.add(goodsDetails);
        console.log(cartDetails);
        $location.path('/goods/' + $scope.id_rs + '/goods/viewcart');
      }
    }
  });
})();