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
module.factory('diceWords', function ($q, $http, $rootScope) {
  var cached = {};
  var diceWords = {
    getAvailableSets: function () {
      return ['en','fi'/*,'de', 'fr','it','jp','nl','pl','sv'*/];
    },
    resolveURL: function (fileName) {
      if (isNodeJS) { return 'dice-words/' + fileName; }
      return window.location.protocol + '//' + window.location.hostname + ':' + window.location.port + '/dice-words/' + fileName
    },
    getWords: function (key) {
      var deferred = $q.defer();
      if (cached[key]) {
        deferred.resolve(cached[key]);
      }
      else {
        var sets = this.getAvailableSets();
        if (sets.indexOf(key)==-1) {
          key = 'en';
        }
        var file = key+'.txt';
        $http({
          url: this.resolveURL(file),
          method: 'GET'
        }).
        success(function(data) {
          var words = data.match(/[^\r\n]+/g);
          if (hasDuplicates(words)) {
            console.log('Word list ['+file+'] contains duplicates');
            deferred.reject();
          }
          else {
            cached[key] = words;
            deferred.resolve(cached[key]);
          }
        }.bind(this)).
        error(function(err) {
          console.log(err);
          deferred.reject();
        });
      }
      return deferred.promise;
    }
  };

  function hasDuplicates(array) {
    var duplicates = {}, key;
    for (var i=0; i<array.length; i++) {
      key = array[i];
      if (duplicates.hasOwnProperty(key)) {
        console.log('Duplicate: '+key);
        return true;
      }
      duplicates[key] = 1;
    }
  }

  return diceWords;
});
})();