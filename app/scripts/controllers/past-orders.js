(function () {
'use strict';
var module = angular.module('fim.base');

module.controller('PastOrdersCtrl', function($location, $q, $scope, modals, $routeParams, nxt, db, plugins, requests, $timeout, 
  ActivityProvider, MessagesProvider, BlocksProvider, AliasProvider, NamespacedAliasProvider, AssetsProvider, CurrencyProvider, AccountProvider, 
  BuyOrderProvider, SellOrderProvider, AccountPostProvider, AccountForgerProvider, AccountLessorsProvider, 
  dateParser, dateFilter, accountsService, PaymentsProvider, $rootScope, serverService, shoppingCartService) {

		$scope.id_rs          = $routeParams.id_rs;
		// $scope.tags = [];

		var api = nxt.get($scope.id_rs);
		// console.log(api);

		$scope.shoppingCart = shoppingCartService.get();
		// console.log($scope.shoppingCart);

		var past_orders_args = {
			requestType: 'getDGSPurchases',
			seller: $scope.id_rs
		}

		api.engine.socket().callAPIFunction(past_orders_args).then(function(data) {
			console.log(data);
		})

	})
})();