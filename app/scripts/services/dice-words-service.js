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
      if (duplicates[key]) {
        console.log('Duplicate: '+key);
        return true;
      }
      duplicates[key] = 1;
    }
  }

  return diceWords;
});
})();