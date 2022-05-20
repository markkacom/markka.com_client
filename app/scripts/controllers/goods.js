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
(function() {

var module = angular.module('fim.base');

module.config(function($routeProvider) {
  $routeProvider
    .when('/goods/:engine/:section/:id_rs?', {
      templateUrl: 'partials/goods.html',
      controller: 'GoodsCtrl'
    })
});

function cutString(s, maxLen) {
  if (!s) return null;
  if (s.length > maxLen) return s.substr(0, maxLen - 3) + "...";
  return s;
}

module.controller('GoodsCtrl', function($location, $rootScope, $scope, $http, $routeParams, nxt, plugins,
  shoppingCartService, AllGoodsProvider, PastGoodsProvider, GoodsDetailsProvider, UserGoodsProvider,
  SoldGoodsProvider, DeliveryConfirmedGoodsProvider, Gossip, db) {

  var cartQRCodes = {}
  var goodsQRCode

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
    /*remove: function () {
      $scope.showQRCode(-1)
    },*/
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

      setTimeout(function() {
        var goods = {}
        Object.assign(goods, $scope.provider)
        goods.count = 1
        var newQRCode = updateQRCode('payQRCode', goodsQRCodeValue(goods), goodsQRCode)
        if (newQRCode) goodsQRCode = newQRCode
      }, 600);
    }
  }

  /* @param item CartModel */
  $scope.quantityChanged = function (item) {
    $scope.$evalAsync(function () {
      calculateItemTotal(item);
      calculateCartTotal();
      updateCartQRCodes(item);
      item.save();
    });
  }

  $scope.activeItemQRCode = -1;

  $scope.showQRCode = function (item) {
    updateCartQRCodes(item);
    $scope.$evalAsync(function () {
      $scope.activeItemQRCode = $scope.activeItemQRCode == item.goods ? -1 : item.goods
    });
  }

  function goodsQRCodeValue(item) {
    //example fimk:3/4?g=53282690084759346&c=1&p=50000&dt=null&nm=Kalevalakoru+Kuut...&dsc=Kalevalakorun+Kuutar-riipus%2C+pronssia
    //This sample contains DigitalGoodsPurchase transaction (type 3 subtype 4), goodsId=53282690084759346
    var obj = {
      g: item.goods, c: item.count, p: item.priceNXT,
      dt: item.deliveryDeadlineTimestamp || String(nxt.util.convertToEpochTimestamp(Date.now()) + 60 * 60 * 168),
      nm: cutString(item.name, 20),
      dsc: cutString(item.description, 40),
      sl: item.seller
    };
    const url = new URL("fimk:" + 3 + "/" + 4);
    url.search = new URLSearchParams(obj);
    return url.toString();
  }

  function updateQRCode(elementId, qrCodeValue, existingQRCode) {
    if (existingQRCode && existingQRCode._el.isConnected) {
      existingQRCode.clear()
      existingQRCode.makeCode(qrCodeValue)
    } else {
      var element = document.getElementById(elementId)
      if (element) {
        return  new QRCode(elementId, {
          text: qrCodeValue,
          width: 120,
          height: 120,
          colorDark: "#000000",
          colorLight: "#ffffff",
          correctLevel: QRCode.CorrectLevel.H
        })
      }
    }
  }

  function updateCartQRCodes(item) {
    if (!item) return
    setTimeout(function() {
      //cartQRCodes = cartQRCodes.filter(function(v) {return v._el.isConnected})
      $scope.$evalAsync(function () {
        var elementId = "payQRCode-" + item.goods
        var existingQRCode = cartQRCodes["" + item.goods]
        var newQRCode = updateQRCode(elementId, goodsQRCodeValue(item), existingQRCode)
        if (newQRCode) cartQRCodes["" + item.goods] = newQRCode

        /*$scope.shoppingCart.forEach(function(v, i) {
          var elementId = "payQRCode-" + v.goods
          var existingQRCode = cartQRCodes.length > i ? cartQRCodes[i] : null

          var newQRCode = updateQRCode(elementId, goodsQRCodeValue(v), existingQRCode)

          if (newQRCode) cartQRCodes.push(newQRCode)
        })*/
      });
    }, 500)
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
    if (result > 0) {
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