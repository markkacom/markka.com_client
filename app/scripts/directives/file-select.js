(function () {
'use strict';
var module = angular.module('fim.base');
module.directive('fileSelect', function () {
  return {
    restrict: 'A',
    link: function (scope, element, attrs) {
      element.on('change', function () {
        var input = element,
            numFiles = input.files ? input.files.length : 1,
            label = input.val().replace(/\\/g, '/').replace(/.*\//, '');
        
        var event;
        if (document.createEvent) {
          event = document.createEvent("HTMLEvents");
          event.initEvent("fileselect", true, true);
        } else {
          event = document.createEventObject();
          event.eventType = "fileselect";
        }
        event.eventName = "fileselect";
        if (document.createEvent) {
          element[0].dispatchEvent(event);
        } 
        else {
          element[0].fireEvent("on" + event.eventType, event);
        }        
        // input.trigger('fileselect', [numFiles, label]);
      });
    }
  };
});
})();