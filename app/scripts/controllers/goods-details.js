(function() {
  'use strict';
  var module = angular.module('fim.base');

  module.controller('GoodsDetailsCtrl', function($location, $scope, $routeParams, nxt, shoppingCartService) {

    $scope.id_rs = $routeParams.id_rs;
    $scope.goods_id = $routeParams.goods_id;

    var api = nxt.get($scope.id_rs);

    $scope.shoppingCart = shoppingCartService.get();

    var details_args = {
      requestType: 'getDGSGood',
      goods: $scope.goods_id
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

  })
})();