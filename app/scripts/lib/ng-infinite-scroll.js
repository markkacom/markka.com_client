(function () {
/* ng-infinite-scroll - v1.0.0 - 2013-02-23 */
var mod;
mod = angular.module('infinite-scroll', []);

function JQueryWindowHeight() {
  return Math.max(document.documentElement.clientHeight, window.innerHeight || 0);
}

function JQueryElementHeight(element) {
  return element.offsetHeight;
}

function JQueryScrollTop() {
  var body = document.body;
  var docElem = document.documentElement;
  return window.pageYOffset || docElem.scrollTop || body.scrollTop;
}

function JQueryOffset(element) {
  var documentElem, box = { top: 0, left: 0 }, doc = element && element.ownerDocument;
  if (!doc) { 
    return;
  }
  documentElem = doc.documentElement;
  if ( typeof element.getBoundingClientRect !== undefined ) {
    box = element.getBoundingClientRect();
  }
  return {
    top: box.top + (window.pageYOffset || documentElem.scrollTop) - (documentElem.clientTop || 0),
    left: box.left + (window.pageXOffset || documentElem.scrollLeft) - (documentElem.clientLeft || 0)
  };
}

mod.directive('infiniteScroll', [
  '$rootScope', '$window', '$timeout', function($rootScope, $window, $timeout) {
    return {
      link: function(scope, elem, attrs) {
        var checkWhenEnabled, handler, scrollDistance, scrollEnabled;
        $window = angular.element($window);
        $window.height = JQueryWindowHeight; 
        $window.scrollTop = JQueryScrollTop;

        scrollDistance = 0;
        if (attrs.infiniteScrollDistance != null) {
          scope.$watch(attrs.infiniteScrollDistance, function(value) {
            return scrollDistance = parseInt(value, 10);
          });
        }
        scrollEnabled = true;
        checkWhenEnabled = false;
        if (attrs.infiniteScrollDisabled != null) {
          scope.$watch(attrs.infiniteScrollDisabled, function(value) {
            scrollEnabled = !value;
            if (scrollEnabled && checkWhenEnabled) {
              checkWhenEnabled = false;
              return handler();
            }
          });
        }
        handler = function() {
          var elementBottom, remaining, shouldScroll, windowBottom;
          windowBottom = $window.height() + $window.scrollTop();
          elementBottom = JQueryOffset(elem[0]).top + JQueryElementHeight(elem[0]);
          remaining = elementBottom - windowBottom;
          shouldScroll = remaining <= $window.height() * scrollDistance;
          if (shouldScroll && scrollEnabled) {
            if ($rootScope.$$phase) {
              return scope.$eval(attrs.infiniteScroll);
            } else {
              return scope.$apply(attrs.infiniteScroll);
            }
          } else if (shouldScroll) {
            return checkWhenEnabled = true;
          }
        };
        $window.on('scroll', handler);
        scope.$on('$destroy', function() {
          return $window.off('scroll', handler);
        });
        return $timeout((function() {
          if (attrs.infiniteScrollImmediateCheck) {
            if (scope.$eval(attrs.infiniteScrollImmediateCheck)) {
              return handler();
            }
          } else {
            return handler();
          }
        }), 0);
      }
    };
  }
]);
})();