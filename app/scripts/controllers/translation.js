(function () {
'use strict';
var module = angular.module('fim.base');

module.config(function($routeProvider) {
  $routeProvider.when('/translation/:lang', {
    templateUrl: 'partials/translation.html',
    controller: 'TranslationController'
  });
});

/* Load the English language table only once */
var ENGLISH_LANG_TABLE = null;

/* This assumes all lang values are always Strings */
function ObjectFlatner(obj) {
  this.obj  = obj;
  this.keys = [];
  this.map  = {};
  this.flatten(null, obj);
}
ObjectFlatner.prototype = {
  flatten: function (prefix, obj) {
    var _prefix = prefix ? prefix+'.' : '';
    for (var name in obj) {
      if (typeof obj[name] == 'string') {
        this.keys.push(_prefix+name);
        this.map[_prefix+name] = obj[name];
      }
      else {
        this.flatten(_prefix+name, obj[name]);
      }
    }
  },
  get: function (obj, path) {
    var result = obj, path = path.split('.');
    try {
      for (var i=0; i<path.length; i++) {
        result = result[path[i]];
      }
      return result;
    } catch (e) {}
    return null;
  },
  set: function (obj, path, value, only_if_missing) {
    path = path.split('.');
    for (var i=0; i<path.length; i++) {
      if ((i+1)<path.length) {
        if (obj[path[i]] === undefined) {
          obj = obj[path[i]] = {};
        }
        else {
          obj = obj[path[i]];
        }
      }
      else if (typeof obj[path[i]] === 'string' && only_if_missing) {
        continue;
      }
      else {
        obj[path[i]] = value;
      }
    }
  }
};

function getMyLangTable(langCode) {
  var str = window.localStorage.getItem('MYLANG-'+langCode) || null;
  return str ? JSON.parse(str) : {};
}

function setMyLangTable(langCode, table) {
  window.localStorage.setItem('MYLANG-'+langCode, JSON.stringify(table));
}

module.controller('TranslationController', function ($scope, $rootScope, $routeParams, $location, $http, $q) {

  $scope.paramLang    = $routeParams.lang;
  $scope.langFull     = $rootScope.availableLanguages[$routeParams.lang];
  $scope.targetLang   = $scope.paramLang;
  
  var ENGLISH_TABLE   = ENGLISH_LANG_TABLE;
  var TARGET_TABLE    = null;
  var MY_TABLE        = null;
  var flatner         = null;
  $scope.LANG_MODEL   = [];

  $scope.onTargetLanguageChange = function () {
    $location.path('/translation/'+$scope.targetLang)
  }

  $scope.storeTranslation = function (entry) {
    flatner.set(MY_TABLE, entry.key, entry.MY_TRANS);
    setMyLangTable($scope.paramLang, MY_TABLE);
  }

  $scope.download = function () {
    var pom = document.createElement('a');
    pom.setAttribute('href', 'data:text/plain;charset=utf-8,' + encodeURIComponent(JSON.stringify(MY_TABLE, null, '  ')));
    pom.setAttribute('download', $scope.paramLang+'.json');
    pom.style.display = 'none';
    document.body.appendChild(pom);
    pom.click();
    document.body.removeChild(pom);
  }

  function loadLangFile(langCode) {
    var deferred = $q.defer();
    $http.get('/i18n/'+langCode+'.json').
      success(function (data) {
        deferred.resolve(data);
      }).
      error(function (data) {
        deferred.reject(data);
      });
    return deferred.promise;
  }

  if (ENGLISH_LANG_TABLE == null) {
    loadLangFile('en').then(function (data) {
      $scope.$evalAsync(function () {
        ENGLISH_TABLE = ENGLISH_LANG_TABLE = data;
        loadLangFile($scope.paramLang).then(function (data) {
          $scope.$evalAsync(function () {
            TARGET_TABLE = data;
            buildModel();
          });
        });        
      });
    });
  }
  else {
    loadLangFile($scope.paramLang).then(function (data) {
      $scope.$evalAsync(function () {
        TARGET_TABLE = data;
        buildModel();
      });
    });
  }

  function buildModel() {
    flatner   = new ObjectFlatner(ENGLISH_TABLE);
    MY_TABLE  = getMyLangTable($scope.paramLang);

    var key, target_value;
    for (var i=0; i<flatner.keys.length; i++) {
      key          = flatner.keys[i];
      target_value = flatner.get(TARGET_TABLE, key);
      
      /* copy missing entries in TARGET_TABLE to MY_TABLE */
      flatner.set(MY_TABLE, key, target_value, true);

      /* build the lang model */
      $scope.LANG_MODEL.push({
        key:      key,
        ENGLISH:  flatner.map[key],
        TARGET:   target_value,
        MY_TRANS: flatner.get(MY_TABLE, key)
      });
    }
    setMyLangTable($scope.paramLang, MY_TABLE);
  }

});
})();