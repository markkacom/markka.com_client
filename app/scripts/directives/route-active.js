(function () {
	'use strict';
	var module = angular.module('fim.base');
	module.directive('routeActive', function($location, $rootScope) {
		return {
			link: function(scope, element, attrs) {
				var matcher 		= attrs.routeActive, 
					  activeClass = attrs.routeActiveClass || 'active',
					  matcherList = scope.$eval(attrs.routeActiveList);

				function normalize(path) {
					if (path[0] === '#') { path = path.substring(1); }
					if (path[0] === '/') { path = path.substring(1); }
					return path;
				}

				function update() {
					var path 		 = normalize($location.path()||'');
					var matchers = matcherList || [matcher];
					for (var i=0; i<matchers.length; i++) {
						if (matchers[i] && path.indexOf(matchers[i]) == 0) {
							element.addClass(activeClass);
							return;
						}
					}
					element.removeClass(activeClass);
				}

				$rootScope.$on('$locationChangeSuccess', function(event) {
					update();
				});

				attrs.$observe('routeActive', function (value) {
					matcher = value;
					update();
				});
				update();
			}
		}
	});

})();