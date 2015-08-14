(function () {
'use strict';
var module = angular.module('fim.base');

module.controller('SearchGoodsCtrl', function($location, $q, $scope, modals, $routeParams, nxt, db, plugins, requests, $timeout, 
  ActivityProvider, MessagesProvider, BlocksProvider, AliasProvider, NamespacedAliasProvider, AssetsProvider, CurrencyProvider, AccountProvider, 
  BuyOrderProvider, SellOrderProvider, AccountPostProvider, AccountForgerProvider, AccountLessorsProvider, 
  dateParser, dateFilter, accountsService, PaymentsProvider, $rootScope, serverService, shoppingCartService) {

		$scope.id_rs          = $routeParams.id_rs;
		// $scope.tags = [];

		var api = nxt.get($scope.id_rs);
		// console.log(api);

		$scope.shoppingCart = shoppingCartService.get();
		// console.log($scope.shoppingCart);

		var getAllGoodsargs = {
			requestType: 'getDGSGoods',
			seller: $scope.id_rs
		}
		api.engine.socket().callAPIFunction(getAllGoodsargs).then(function(data) {
			// console.log(data);
			$scope.allGoods = data.goods;
			// console.log($scope.allGoods.goods);
		})

		$scope.search = function(query) {
			$scope.tags = [];
			var search_args = {
				requestType: 'searchDGSGoods',
				tag: query
			}

			api.engine.socket().callAPIFunction(search_args).then(function(searchData) {
				$scope.searchedGoods = searchData.goods;
				// console.log($scope.searchedGoods)
				$scope.searchedGoods.forEach(function(good) {
					try {
					  	var data = JSON.parse(good.description);
					} catch(ex) {
					  	console.log("Unable to parse");
					}
					if(data) {
					  	good.description = data.description;
					  	good.image = data.image;
						good.callback = data.callback;
					}
				});

				$scope.searchedGoods.forEach(function(eachGoods) {
					eachGoods.parsedTags.forEach(function(eachTags) {
						$scope.tags.push(eachTags);
					})
				})
						var unique = function(origArr) {
						    var newArr = [],
						        origLen = origArr.length,
						        found, x, y;

						    for (x = 0; x < origLen; x++) {
						        found = undefined;
						        for (y = 0; y < newArr.length; y++) {
						            if (origArr[x] === newArr[y]) {
						                found = true;
						                break;
						            }
						        }
						        if (!found) {
						            newArr.push(origArr[x]);
						        }
						    }
						    return newArr;
						}

						$scope.uniqueTags = unique($scope.tags);
			})
		}

		$scope.details = function(goodsDetails) {
			// console.log(goodsDetails);
			$location.path('/accounts/'+$scope.id_rs+'/goods/'+goodsDetails.goods+'/details');
		}

		$scope.addToCart = function(goodsDetails) {
			var cartDetails = shoppingCartService.add(goodsDetails);
			// console.log(cartDetails);
			$location.path('/accounts/'+$scope.id_rs+'/goods/viewcart');
		}

	})
})();