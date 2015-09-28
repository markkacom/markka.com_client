(function() {
  var module = angular.module('fim.base');
  module.config(function($routeProvider) {
    $routeProvider
      .when('/goods/:id_rs/:listing', {
        templateUrl: 'partials/goods.html',
        controller: 'GoodsCtrl'
      })
  });

  module.controller('GoodsCtrl', function($location, $rootScope, $scope, $http, $routeParams, nxt, plugins, shoppingCartService, AllGoodsProvider, PastGoodsProvider, GoodsDetailsProvider, UserGoodsProvider, SoldGoodsProvider, DeliveryConfirmedGoodsProvider, DecryptedMessageProvider) {

    $scope.id_rs = $routeParams.id_rs;
    $scope.paramSection = $routeParams.listing;

    var api = nxt.get($scope.id_rs);
    $scope.symbol= api.engine.symbol

    $scope.shoppingCart = shoppingCartService.get();

    $scope.deleteGood = function(good, index) {
      var deleteGoodArgs = {
        requestType: 'dgsDelisting',
        goods: good.goods
      }
      plugins.get('transaction').get('dgsDelisting').execute($scope.id_rs, deleteGoodArgs).then(function(deletedGood) {
        if(deletedGood) {
          $scope.showGoods.entities.splice(index, 1);
        }
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
      $scope.total = 0;
      $scope.shoppingCart.forEach(function(good) {
        $scope.total += parseFloat(good.priceNQT)
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
        $scope.balance = $rootScope.userData.balanceNXT;
          if($scope.total >= $scope.balance){
            processCart($scope.shoppingCart);
            $scope.balanceError = "You don't have enough balance to place these orders.";
          } else {
            $scope.balanceError = ' ';
          }
      }

      function processCart(shoppingCart) {
        if (shoppingCart.length > 0) {
          var shoppingCartGoods = shoppingCart[0];
          console.log(shoppingCartGoods);
          var order_args = {
            requestType: "dgsPurchase",
            goods: shoppingCartGoods.goods,
            priceNQT: shoppingCartGoods.priceNQT,
            name: shoppingCartGoods.name,
            deliveryDeadlineTimestamp: String(nxt.util.convertToEpochTimestamp(Date.now()) + 60 * 60 * 168),
            recipient: shoppingCartGoods.seller
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

                $scope.successful = "Payment Completed";
            }
          });
        }
      }

      $scope.remove = function(index, items) {
        var abc = shoppingCartService.removeItem(index);
        $scope.shoppingCart.splice(index, 1);
        $scope.total -= parseFloat(items.priceNQT);
      }
    } else if ($scope.paramSection == "pastorders") {

      $scope.shoppingCart = shoppingCartService.get();

      $scope.pastGoods = new PastGoodsProvider(api, $scope, 10, $scope.id_rs);
      $scope.pastGoods.reload();
      console.log($scope.pastGoods);
      $scope.msg = function(id) {
        var recipient_args = {
          recipient: id
        }
        plugins.get('transaction').get('sendMessage').execute($scope.id_rs, recipient_args);
      }
    } else if ($scope.paramSection == "viewlisting") {
      $scope.showGoods = new UserGoodsProvider(api, $scope, 10, $scope.id_rs);
      $scope.showGoods.reload();
    } else if ($scope.paramSection == 'solditems') {
      // for pending
      $scope.soldGoods = new SoldGoodsProvider(api, $scope, 10, $scope.id_rs);
      $scope.soldGoods.reload();

      // for Completed
      $scope.DeliveryConfirmedGoods = new DeliveryConfirmedGoodsProvider(api, $scope, $scope.id_rs);
      $scope.DeliveryConfirmedGoods.reload();

      $scope.decrypt = function(encryptedMessage, index) {
        if(encryptedMessage) {
          $scope.textMessage = index;
          $scope.DecryptedMessage = new DecryptedMessageProvider(api, $scope, encryptedMessage.data, encryptedMessage.nonce, $scope.id_rs, $rootScope.currentAccount.secretPhrase);
          $scope.DecryptedMessage.reload();
        }
      }
      $scope.rebate = function(rebateOrder) {
        var rebate_args = {
          requestType: "dgsRefund",
          purchase: rebateOrder.purchase,
          refundNQT: rebateOrder.priceNQT
        }
        plugins.get('transaction').get('dgsRefund').execute($scope.id_rs, rebate_args).then(function(data) {
        })
      }
      $scope.confirmDelivery = function(deliveryItem) {
        var confirmDelivery_args = {
          requestType: "dgsDelivery",
          purchase: deliveryItem.purchase
        }
        plugins.get('transaction').get('dgsDelivery').execute($scope.id_rs, confirmDelivery_args).then(function(data) {
        })
      }
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