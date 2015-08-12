(function () {
'use strict';
var module = angular.module('fim.base');

module.controller('CartCtrl', function($location, $q, $scope, modals, $routeParams, nxt, db, plugins, requests, $timeout, 
  ActivityProvider, MessagesProvider, BlocksProvider, AliasProvider, NamespacedAliasProvider, AssetsProvider, CurrencyProvider, AccountProvider, 
  BuyOrderProvider, SellOrderProvider, AccountPostProvider, AccountForgerProvider, AccountLessorsProvider, 
  dateParser, dateFilter, accountsService, PaymentsProvider, $rootScope, serverService, shoppingCartService) {

		$scope.id_rs          = $routeParams.id_rs;

		var api = nxt.get($scope.id_rs);
		// console.log(api);

		$scope.shoppingCart = shoppingCartService.get();
		console.log($scope.shoppingCart);

		$scope.placeOrder = function() {
			processCart($scope.shoppingCart);
			/*$scope.shoppingCart.forEach(function(abc) {
				// console.log(abc);
				var time = new Date;
				console.log(time.getTime);
				var order_args = {
					requestType: "dgsPurchase",
					goods: abc.goods,
					priceNQT: abc.priceNQT,
					deliveryDeadlineTimestamp: String(nxt.util.convertToEpochTimestamp(Date.now()) + 60 * 60 * 168)
				}
				plugins.get('transaction').get('dgsPurchase').execute($scope.id_rs, order_args).then(function(abcd) {
					console.log('ok pressed', abcd);
				})
			})*/
		}

		function processCart(shoppingCart) {
			if(shoppingCart.length > 0) {
				var shoppingCartGoods = shoppingCart[0];
				var order_args = {
					requestType: "dgsPurchase",
					goods: shoppingCartGoods.goods,
					priceNQT: shoppingCartGoods.priceNQT,
					deliveryDeadlineTimestamp: String(nxt.util.convertToEpochTimestamp(Date.now()) + 60 * 60 * 168)
				}
				plugins.get('transaction').get('dgsPurchase').execute($scope.id_rs, order_args).then(function() {
					shoppingCartService.removeItem(0);
					shoppingCart.splice(0,1);
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


