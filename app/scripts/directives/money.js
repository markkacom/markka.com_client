(function () {
'use strict';

var module = angular.module('fim.base');

module.filter('money', function () {
  return function (input, decimals) {
    var precision = parseInt(decimals || 0);
    return parseFloat(input).toFixed(precision).replace(/(\.0+)$/, '');
  }
});

module.directive('money', function($timeout) {

  function JQueryHasClass(element, clazz) {
    var className=" "+clazz+" ",rclass=/[\t\r\n]/g;
    if (element.nodeType === 1 && (" " + element.className + " ").replace(rclass, " ").indexOf(className) >= 0) {
      return true;
    }
    return false;
  }

  function JQueryClosestByClass(element, clazz) {
    while (element) {
      if (JQueryHasClass(element, clazz)) {
        return element;
      }
      element = element.parentNode;
    }
    return null;
  }

  return {
    restrict: 'A',
    require: 'ngModel',
    link: function(scope, element, attrs, ngModelCtrl){
      function formatPrecision(value) {
        var precision = parseInt(attrs.precision || 0);
        return value ? parseFloat(value).toFixed(precision).replace(/(\.0+)$/, '') : '';
      }
      function fromUser(text) {
        var precision = parseInt(attrs.precision || 0);
        var regexp    = precision == 0 ? new RegExp('^\\d+$') : new RegExp('^\\d+(\\.)?(\\d{1,'+precision+'})?$');
        var old       = ngModelCtrl.$modelValue;
        var empty     = ngModelCtrl.$isEmpty(text) || text == undefined;
        text          = empty ? '0' : text;
        if (regexp.test(text)) {
          return text; 
        }
        else {          
          if (precision == 0 && new RegExp('\\.$').test(text)) {
            var msg = 'No decimals places allowed'
          } else {
            var msg = new RegExp('^\\d+\\.\\d{9,}$').test(text) ? ('Only '+precision+' decimals allowed') : 'Allowed format is 12.345';            
          }
          // $(element[0]).popover('destroy');
          // $(element[0]).popover({
          //   html: false,
          //   content: msg,
          //   placement: 'auto top',
          //   container: 'body'
          // });
          angular.element(JQueryClosestByClass(element[0], 'form-group')).addClass('has-error');
          // $(element[0]).popover('show');
          $timeout(function () {
            // $(element[0]).popover('destroy');
            angular.element(JQueryClosestByClass(element[0], 'form-group')).removeClass('has-error');
          }, 2000);

          ngModelCtrl.$setViewValue(old);
          ngModelCtrl.$render();
          return old;
        }
      }
      ngModelCtrl.$parsers.push(fromUser);

      ngModelCtrl.$formatters.push(function (viewValue) {
        return formatPrecision(viewValue);
      });

      element.bind('blur', function () {
        var value = ngModelCtrl.$modelValue;
        if (value) {
          ngModelCtrl.$viewValue = formatPrecision(value);
          ngModelCtrl.$render();
        }
      });
    }
  }
});

})();