(function () {
'use strict';
var module = angular.module('fim.base');
module.directive('menuClose', function ($parse) {    
  return {
    restrict: 'A',
    link: function (scope, element, attrs) {
      var expression = attrs.menuClose, invoke = $parse(expression);
      element.on('click', function (e) {
        window.setTimeout(function () {
          scope.$apply(function () {
            invoke(scope, { $event: e });
          });
        }, 300);
      });
    }
  };
});
})();