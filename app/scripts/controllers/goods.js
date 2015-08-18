(function () {
'use strict';
var module = angular.module('fim.base');

module.controller('GoodsCtrl', function($location, $q, $scope, modals, $routeParams, nxt, db, plugins, requests, $timeout, 
  ActivityProvider, MessagesProvider, BlocksProvider, AliasProvider, NamespacedAliasProvider, AssetsProvider, CurrencyProvider, AccountProvider, 
  BuyOrderProvider, SellOrderProvider, AccountPostProvider, AccountForgerProvider, AccountLessorsProvider, 
  dateParser, dateFilter, accountsService, PaymentsProvider, $rootScope, serverService, shoppingCartService, GoodsProvider, GoodsPostProvider) {

		$scope.id_rs          = $routeParams.id_rs;
		$scope.paramTimestamp = 0; //nxt.util.convertToEpochTimestamp(Date.now()) + (24 * 60 * 60);
    $scope.filter         = {};

		var api = nxt.get($scope.id_rs);
		// console.log(api);

		$scope.shoppingCart = shoppingCartService.get();
		// console.log($scope.shoppingCart);

		// var getAllGoodsargs = {
		// 	requestType: 'getDGSGoods',
		// 	seller: $scope.id_rs
		// }
		// api.engine.socket().callAPIFunction(getAllGoodsargs).then(function(data) {
		// 	console.log(data);
		// 	$scope.allGoods = data.goods;
		// 	console.log($scope.allGoods.goods);
		// })

		$scope.deleteGood = function(good) {
			var deleteGoodArgs = {
				requestType: 'dgsDelisting',
				goods: good.goods
			}
        plugins.get('transaction').get('dgsDelisting').execute($scope.id_rs, deleteGoodArgs).then(function(deletedGood) {
          $scope.showGoods.allGoods.splice(deletedGood, 1);
        })
		}

		$scope.details = function(goodsDetails) {
			// console.log(goodsDetails);
			$location.path('/goods/'+$scope.id_rs+'/'+goodsDetails.goods);
		}

		$scope.add = function() {
			var args = {
        requestType: 'dgsListing'
      }
	    plugins.get('transaction').get('dgsListing').execute($scope.id_rs, args).then(function(addedGoods) {
        $scope.isAdded = addedGoods;
        $scope.priceNQT = nxt.util.convertToNQT(addedGoods.priceNXT);
      })
		}

	  $scope.showGoods = new GoodsProvider(api, $scope, $scope.id_rs);
  	 $scope.showGoods.reload();

  	$scope.provider = new GoodsPostProvider(api, $scope, 5, $scope.id_rs);
    $scope.provider.reload();
      
    $scope.$watch('showGoods', function(s, data) {
      console.log("goods:", data);
    });

	});
})();