var UTILS = (function (UTILS) {
'use strict';

UTILS.formatPrice = function(price, decimals) { 
  try {
    if (typeof price === 'string') {
      return parseFloat(price).toFixed(decimals);
    }
    else {
      return price.toFixed(decimals);
    }
  } catch (e) {
    return 'undef';
  }
};

var counter = 0;
UTILS.uniqueID = function () {
  return counter++;
};

UTILS.queryString = function (obj) {
  var qs=[];
  for (var name in obj) {
    qs.push(name+'='+obj[name]);
  }
  return qs.join('&');
};

UTILS.contains = function(obj, prop) {
  return typeof obj == 'object' && obj !== null && prop in obj;
};

UTILS.formatDate = function (date) {
  function padTwo(num) {
    return (num < 10) ? ('0' + num) : num;
  }
  var d = date;
  if (typeof d == 'number') {
    d = new Date(d);
  }
  return padTwo(d.getDate())+'-'+padTwo(d.getMonth())+' '+padTwo(d.getHours())+':'+padTwo(d.getMinutes())+':'+padTwo(d.getSeconds());  
};

UTILS.compareString = function (a, b) {
  var a_s = a.toLowerCase();
  var b_s = b.toLowerCase();
  if (a_s.name > b_s.name)
    return 1;
  if (a_s.name < b_s.name)
    return -1;
  return 0;  
};

UTILS.compareNumber = function (a, b) {
  return a - b; 
};

UTILS.isNumber = function (n) {
  return !isNaN(parseFloat(n)) && isFinite(n);
};

UTILS.findFirst = function (array, func) {
  for (var i=0; i<array.length; i++) {
    if (func(array[i])) {
      return array[i];
    }
  }
  return null;
};

UTILS.findFirstPropIndex = function (array, source, propertySource, propertyArray)  {
  propertyArray = propertyArray || propertySource;
  for (var i=0; i<array.length; i++) {
    if (source[propertySource] == array[i][propertyArray]) {
      return i;
    }
  }
  return -1;
};

UTILS.removeFirst = function (array, func) {
  for (var i=0; i<array.length; i++) {
    if (func(array[i])) {
      array.splice(i, 1);
      return true;
    }
  }
  return false;
};

UTILS.validateAmount = function (number, decimals) {
  if (!UTILS.isNumber(number)) {
    return { error: 'Invalid number' };
  }
  var parts = number.split('.');
  if (parts.length > 1 && parts[1].length > decimals) { // to many decimal places
    return { error: 'Max decimals ('+decimals+') exceeded' };
  }
  return true;
};

UTILS.each = function (array, func) {
  array.forEach(func);
};

return UTILS;

})(UTILS || {});