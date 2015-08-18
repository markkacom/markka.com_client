(function () {
'use strict';
var module = angular.module('fim.base');

module.controller('SearchGoodsCtrl', function($location, $scope, $routeParams, nxt, shoppingCartService) {

		$scope.id_rs          = $routeParams.id_rs;

		var api = nxt.get($scope.id_rs);

		$scope.shoppingCart = shoppingCartService.get();

		var getAllGoodsargs = {
			requestType: 'getDGSGoods',
			seller: $scope.id_rs
		}
		api.engine.socket().callAPIFunction(getAllGoodsargs).then(function(data) {
			$scope.allGoods = data.goods;
		})

		$scope.search = function(query) {
			$scope.tags = [];
			var search_args = {
				requestType: 'searchDGSGoods',
				tag: query
			}

			api.engine.socket().callAPIFunction(search_args).then(function(searchData) {
				$scope.searchedGoods = searchData.goods;
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
			$location.path('/goods/'+$scope.id_rs+'/'+goodsDetails.goods);
		}

		$scope.addToCart = function(goodsDetails) {
			var cartDetails = shoppingCartService.add(goodsDetails);
			$location.path('/goods/'+$scope.id_rs+'/goods/viewcart');
		}

	})
})();