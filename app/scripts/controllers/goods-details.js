(function () {
'use strict';
var module = angular.module('fim.base');

module.controller('GoodsDetailsCtrl', function($location, $q, $scope, modals, $routeParams, nxt, db, plugins, requests, $timeout, 
  ActivityProvider, MessagesProvider, BlocksProvider, AliasProvider, NamespacedAliasProvider, AssetsProvider, CurrencyProvider, AccountProvider, 
  BuyOrderProvider, SellOrderProvider, AccountPostProvider, AccountForgerProvider, AccountLessorsProvider, 
  dateParser, dateFilter, accountsService, PaymentsProvider, $rootScope, serverService, shoppingCartService) {

		$scope.id_rs          = $routeParams.id_rs;
		$scope.goods_id		  = $routeParams.goods_id;

		var api = nxt.get($scope.id_rs);
		// console.log(api);

		$scope.shoppingCart = shoppingCartService.get();
		// console.log($scope.shoppingCart);

		var details_args = {
			requestType: 'getDGSGood',
			goods: $scope.goods_id
		}

		api.engine.socket().callAPIFunction(details_args).then(function(data){
			$scope.goodsDetails = data;
			// console.log(data);
		})

		$scope.addToCart = function(goodsDetails) {
			var cartDetails = shoppingCartService.add(goodsDetails);
			console.log(cartDetails);
			$location.path('/accounts/'+$scope.id_rs+'/goods/viewcart');
		}

	})
})();