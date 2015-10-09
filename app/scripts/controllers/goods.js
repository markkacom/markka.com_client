(function() {
var module = angular.module('fim.base');
module.config(function($routeProvider) {
  $routeProvider
    .when('/goods/:engine/:section/:id_rs?', {
      templateUrl: 'partials/goods.html',
      controller: 'GoodsCtrl'
    })
});

module.controller('GoodsCtrl', function($location, $rootScope, $scope, $http, $routeParams, nxt, plugins, 
  shoppingCartService, AllGoodsProvider, PastGoodsProvider, GoodsDetailsProvider, UserGoodsProvider, 
  SoldGoodsProvider, DeliveryConfirmedGoodsProvider, Gossip, db) {

  $scope.paramEngine  = $rootScope.paramEngine = $routeParams.engine;
  $scope.paramSection = $routeParams.section;  
  $scope.id_rs        = $routeParams.id_rs;

  var api             = $scope.paramEngine == 'fim' ? nxt.fim() : nxt.nxt();
  $scope.symbol       = api.engine.symbol;

  /* @param items Array of CartModel (@see models/cart.js) */
  function setupShoppingCart(items) {
    $scope.$evalAsync(function () {
      $scope.shoppingCart = items||[];
      $scope.shoppingCart.forEach(calculateItemTotal);
      calculateCartTotal();
    });
  }

  shoppingCartService.getAll(api.engine.symbol).then(setupShoppingCart);
  db.cart.addObserver($scope, { 
    finally: function () {
      shoppingCartService.getAll(api.engine.symbol).then(setupShoppingCart);
    }
  });

  switch ($scope.paramSection) {
    /* /goods/nxt/listing OR /goods/nxt/listing/NXT-7JDS-CS72-TNGS-BBE8E */
    case 'listing': {
      $scope.provider = new AllGoodsProvider(api, $scope, 10, $scope.id_rs);
      $scope.provider.reload();
      break;
    }
    /* /goods/nxt/tags/some-tag */
    case 'tags': {
      $scope.id_rs = null;
      $scope.provider = new AllGoodsProvider(api, $scope, 10, null, $routeParams.id_rs); /* we use id_rs for the tag parameter */
      $scope.provider.reload();
      break;
    }    
    /* /goods/nxt/pastorders/NXT-7JDS-CS72-TNGS-BBE8E */
    case 'pastorders': {
      if ($scope.id_rs) {
        $scope.provider = new PastGoodsProvider(api, $scope, 10, $scope.id_rs);
        $scope.provider.reload();
      }
      else {
        $location.path('/goods/'+$scope.paramEngine+'/listing');
      }
      break;
    }
    /* /goods/nxt/solditems/NXT-7JDS-CS72-TNGS-BBE8E */
    case 'solditems': {
      if ($scope.id_rs) {
        // for pending
        $scope.soldGoods = new SoldGoodsProvider(api, $scope, 10, $scope.id_rs);
        $scope.soldGoods.reload();

        // for Completed
        $scope.deliveryConfirmedGoods = new DeliveryConfirmedGoodsProvider(api, $scope, $scope.id_rs);
        $scope.deliveryConfirmedGoods.reload();
      }
      else {
        $location.path('/goods/'+$scope.paramEngine+'/listing');
      }
      break;
    }
    /* /goods/nxt/cart OR /goods/nxt/cart/NXT-7JDS-CS72-TNGS-BBE8E */
    case 'cart': {
      /* nothing to do here $scope.shoppingCart is setup elsewhere */
      break;      
    }
    /* /goods/nxt/142563763572767 */
    default: {
      $scope.provider = new GoodsDetailsProvider(api, $scope, $scope.paramSection);
      $scope.provider.reload();
      $scope.paramSection = 'detail';      
    }
  }

  /* @param item CartModel */
  $scope.quantityChanged = function (item) {
    $scope.$evalAsync(function () {
      calculateItemTotal(item);
      calculateCartTotal();
      item.save();
    });
  }

  function calculateCartTotal() {
    var totalNQT = '0';
    $scope.shoppingCart.forEach(function (item) { 
      totalNQT = (new BigInteger(totalNQT)).add(
                    new BigInteger(nxt.util.convertToNQT(item.totalNXT))).toString() 
    });
    $scope.totalNXT = nxt.util.convertToNXT(totalNQT.toString());
  }

  /* @param item CartModel */
  function calculateItemTotal(item) {
    if (item.count == 0) {
      item.totalNXT = '0';
    }
    else {
      item.totalNXT = nxt.util.convertToNXT((new BigInteger(item.priceNQT)).multiply(new BigInteger(""+item.count)).toString());
    }
  }

  $scope.msg = function(id) {
    plugins.get('transaction').get('sendMessage').execute($scope.id_rs, { recipient: id, editRecipient: false });
  }

  $scope.deleteGood = function(good) {
    plugins.get('transaction').get('dgsDelisting').execute({goods: good.goods});
  }

  $scope.add = function() {
    plugins.get('transaction').get('dgsListing').execute();
  }

  $scope.placeOrder = function() {
    var result = (new BigInteger(nxt.util.convertToNQT($scope.totalNXT))).compareTo(
                    new BigInteger(nxt.util.convertToNQT($rootScope.userData.balanceNXT)));
    if (result <= 0) {
      $scope.balanceError = "You don't have enough balance to place these orders.";
    }
    else {
      $scope.balanceError = ' ';
      var iterator = new Iterator($scope.shoppingCart);
      processCart(iterator);
    }
  }

  function processCart(iterator) {
    if (iterator.hasMore()) {
      var item = iterator.next();
      var order_args = {
        goods: item.goods,
        priceNXT: nxt.util.convertToNXT(item.priceNQT),
        quantity: item.count,
        name: item.name,
        deliveryDeadlineTimestamp: String(nxt.util.convertToEpochTimestamp(Date.now()) + 60 * 60 * 168),
        recipient: item.sellerRS
      }
      plugins.get('transaction').get('dgsPurchase').execute(order_args).then(
        function(data) {
          if(data) { 
            if (item.callback) {
              $http({
                url: item.callback,
                data: item,
                method: 'POST'
              }).success(function(data) {
                console.log(data);
              }).error(function(err) {
                console.log(err);
              });
            }
            item.delete().then(
              function () {
                if (iterator.hasMore()) {
                  processCart(iterator);
                }
                else {
                  $scope.$evalAsync(function () {
                    $scope.successful = "Payment Completed";
                  });
                }
              }              
            );
          }
        }
      );
    }
  }

  $scope.decrypt = function(encryptedMessage, index) {
    if(encryptedMessage) {
      var publicKey = api.crypto.secretPhraseToPublicKey($rootScope.currentAccount.secretPhrase);
      $scope.textMessage = index;
      $scope.decryptedMessage = Gossip.decryptMessage(publicKey, encryptedMessage.nonce, encryptedMessage.data)
    }
  }

  $scope.rebate = function(rebateOrder) {
    var rebate_args = {
      purchase: rebateOrder.purchase,
      refundNQT: rebateOrder.priceNQT
    }
    plugins.get('transaction').get('dgsRefund').execute(rebate_args);
  }

  $scope.confirmDelivery = function(deliveryItem) {
    var confirmDelivery_args = {
      purchase: deliveryItem.purchase
    }
    plugins.get('transaction').get('dgsDelivery').execute(confirmDelivery_args);
  }

  $scope.addToCart = function(details) {
    shoppingCartService.add($scope.symbol, details, 1).then(
      function () {
        $location.path('/goods/'+$scope.paramEngine+'/cart');
      }
    );
  }

});
})();