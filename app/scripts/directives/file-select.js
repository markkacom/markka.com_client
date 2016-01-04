/**
 * The MIT License (MIT)
 * Copyright (c) 2016 Krypto Fin ry and the FIMK Developers
 *
 * Permission is hereby granted, free of charge, to any person obtaining a copy of
 * this software and associated documentation files (the "Software"), to deal in
 * the Software without restriction, including without limitation the rights to
 * use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of
 * the Software, and to permit persons to whom the Software is furnished to do so,
 * subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be included in all
 * copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
 * SOFTWARE.
 * */
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