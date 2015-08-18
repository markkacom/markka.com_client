(function() {
  'use strict';
  var module = angular.module('fim.base');

  module.controller('CartCtrl', function($scope, $routeParams, nxt, plugins, shoppingCartService) {

    $scope.id_rs = $routeParams.id_rs;

    var api = nxt.get($scope.id_rs);

    $scope.shoppingCart = shoppingCartService.get();
    console.log($scope.shoppingCart);

    $scope.shoppingCart.forEach(function(good) {
      try {
        var data = JSON.parse(good.description);
      } catch (ex) {
        console.log("Unable to parse");
      }
      if (data) {
        good.description = data.description;
        good.image = data.image;
        good.callback = data.callback;
      }
    });

    $scope.placeOrder = function() {
      processCart($scope.shoppingCart);
    }

    function processCart(shoppingCart) {
      if (shoppingCart.length > 0) {
        var shoppingCartGoods = shoppingCart[0];
        var order_args = {
          requestType: "dgsPurchase",
          goods: shoppingCartGoods.goods,
          priceNQT: shoppingCartGoods.priceNQT,
          deliveryDeadlineTimestamp: String(nxt.util.convertToEpochTimestamp(Date.now()) + 60 * 60 * 168)
        }
        plugins.get('transaction').get('dgsPurchase').execute($scope.id_rs, order_args).then(function() {
          shoppingCartService.removeItem(0);
          shoppingCart.splice(0, 1);
          processCart(shoppingCart);
        });
      }
    }

    $scope.remove = function(index) {
      var abc = shoppingCartService.removeItem(index);
      $scope.shoppingCart.splice(index, 1);
    }
  });
})();