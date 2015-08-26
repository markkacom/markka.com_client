(function() {
  'use strict';
  var module = angular.module('fim.base');
  module.config(function($routeProvider) {
    $routeProvider
      .when('/goods/:id_rs/:listing', {
        templateUrl: 'partials/goods.html',
        controller: 'GoodsCtrl'
      })
  });

  module.controller('GoodsCtrl', function($location, $scope, $http, $routeParams, nxt, plugins, shoppingCartService, AllGoodsProvider, PastGoodsProvider, GoodsDetailsProvider, UserGoodsProvider) {

    $scope.id_rs = $routeParams.id_rs;
    $scope.paramSection = $routeParams.listing;

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
        // $scope.priceNQT = nxt.util.convertToNQT(addedGoods.priceNXT);
      })
    }

    if ($scope.paramSection == 'listing') {
      $scope.showGoods = new AllGoodsProvider(api, $scope, 10, $scope.id_rs);
      $scope.showGoods.reload();
    } else if ($scope.paramSection == 'cart') {
      $scope.shoppingCart = shoppingCartService.get();

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
            name: shoppingCartGoods.name,
            deliveryDeadlineTimestamp: String(nxt.util.convertToEpochTimestamp(Date.now()) + 60 * 60 * 168)
          }
          plugins.get('transaction').get('dgsPurchase').execute($scope.id_rs, order_args).then(function(data) {
            if(data) {  
              $http({
                url: shoppingCartGoods.callback,
                data: shoppingCartGoods,
                method: 'POST'
              }).success(function(data) {
                console.log(data);
              }).error(function(err) {
                console.log(err);
              })
              shoppingCartService.removeItem(0);
              shoppingCart.splice(0, 1);
              processCart(shoppingCart);
            }
          });
        }
      }

      $scope.remove = function(index) {
        var abc = shoppingCartService.removeItem(index);
        $scope.shoppingCart.splice(index, 1);
      }
    } else if ($scope.paramSection == "pastorders") {

      $scope.shoppingCart = shoppingCartService.get();

      $scope.pastGoods = new PastGoodsProvider(api, $scope, 10, $scope.id_rs);
      $scope.pastGoods.reload();
    } else if ($scope.paramSection == "viewlisting") {
      $scope.showGoods = new UserGoodsProvider(api, $scope, 10, $scope.id_rs);
      $scope.showGoods.reload();
    } else {

      $scope.goodsDetails = new GoodsDetailsProvider(api, $scope, $scope.paramSection);
      $scope.goodsDetails.reload();
      $scope.good = $scope.goodsDetails.entities;

      $scope.addToCart = function(goodsDetails) {
        var cartDetails = shoppingCartService.add(goodsDetails);
        $location.path('/goods/' + $scope.id_rs + '/cart');
      }
    }
  }).filter('parseImage', function() {
    return function(item) {
      var data = JSON.parse(item);
      return data.image;
    }
  }).filter('parseDescription', function() {
    return function(item) {
      var data = JSON.parse(item);
      return data.description;
    }
  })
})();