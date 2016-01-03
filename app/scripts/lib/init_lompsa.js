(function () {
  try {
    window.isNodeJS = typeof require == 'function' && require('child_process');
  } catch (e) {
    window.isNodeJS = false;
  }
  window.DEBUG = false;

  var entityMap = {"&":"&amp;","<":"&lt;",">":"&gt;",'"':'&quot;',"'":'&#39;',"/":'&#x2F;',"\n":'<br>'};
  window.escapeHtml = function (string) {
    return String(string).replace(/[&<>"'\/]|[\n]/g, function (s) {
      return entityMap[s];
    });
  }

  // Returns a function, that, as long as it continues to be invoked, will not
  // be triggered. The function will be called after it stops being called for
  // N milliseconds. If `immediate` is passed, trigger the function on the
  // leading edge, instead of the trailing.
  //
  // Source: underscore.js
  window.debounce = function (func, wait, immediate) {
    var timeout;
    return function() {
      var context = this, args = arguments;
      var later = function() {
        timeout = null;
        if (!immediate) func.apply(context, args);
      };
      var callNow = immediate && !timeout;
      clearTimeout(timeout);
      timeout = setTimeout(later, wait);
      if (callNow) func.apply(context, args);
    };
  };

  Function.prototype.debounce = function (threshold, execAsap) {
    var func = this, timeout;
    return function debounced () {
      var obj = this, args = arguments;
      function delayed () {
        if (!execAsap)
          func.apply(obj, args);
        timeout = null; 
      };
      if (timeout)
        clearTimeout(timeout);
      else if (execAsap)
        func.apply(obj, args);
      timeout = setTimeout(delayed, threshold || 100); 
    };
  }
})();