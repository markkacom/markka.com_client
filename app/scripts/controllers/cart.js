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
		// console.log($scope.shoppingCart);

		$scope.placeOrder = function() {
			$scope.shoppingCart.forEach(function(abc) {
				// console.log(abc);
				var time = new Date;
				console.log(time.getTime);
				var order_args = {
					requestType: "dgsPurchase",
					goods: abc.goods,
					priceNQT: abc.priceNQT,
					deliveryDeadlineTimestamp: nxt.util.convertToEpochTimestamp(Date.now()) + 60 * 60 * 168
				}
				plugins.get('transaction').get('dgsPurchase').execute($scope.id_rs, order_args);
			})
		}

		$scope.remove = function(index) {
			var abc = shoppingCartService.removeItem(index);
			$scope.shoppingCart.splice(index, 1);
		}
	});
})();


