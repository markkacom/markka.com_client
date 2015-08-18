(function () {
'use strict';
var module = angular.module('fim.base');

module.controller('PastOrdersCtrl', function($scope, $routeParams, nxt, shoppingCartService) {

		$scope.id_rs          = $routeParams.id_rs;

		var api = nxt.get($scope.id_rs);

		$scope.shoppingCart = shoppingCartService.get();

		var past_orders_args = {
			requestType: 'getDGSPurchases',
			seller: $scope.id_rs
		}

		api.engine.socket().callAPIFunction(past_orders_args).then(function(data) {
			$scope.pastOrders = data;
			console.log(data);
		})

	})
})();