/*
 * grunt-google-translate
 * https://github.com/MartyIce/grunt-google-translate
 *
 * Copyright (c) 2014 Marty Mavis
 * Licensed under the MIT license.
 */

'use strict';

module.exports = function(grunt) {

/* Part of MOFO Wallet project. */
function Iterator(array) {
  this.cursor = 0;
  this.length = array.length;
  this.array  = array;
}
Iterator.prototype = {
  hasMore: function () {
    return this.cursor < this.length;
  },
  next: function () {
    return this.array[this.cursor++];
  }
};

grunt.registerMultiTask('google_translate', 'Automatically generate localized json files using angular-translate source files, and Google Translate REST API', function() {

  var TRACE = false;
  function trace(name) { if (TRACE) { console.log(name); } }

  // Merge task-specific and/or target-specific options with these defaults.
  var options = this.options({
    googleApiKey: '',
    sourceLanguageCode: 'en',
    srcPath: './il8n/**/en.json',
    restrictToLanguages: []
  });

  console.log('api: ' + options.googleApiKey);
  if(options.googleApiKey.length === 0) {
    grunt.fail.fatal('A Google API key must be provided in order to access their REST API.');
  }

  var done = this.async();

  var rest = require('restler');
  var cheerio = require('cheerio');
  var q = require('q');

  // load existing en json files
  var sourceFiles = grunt.file.expand([options.srcPath]);

  if(sourceFiles.length === 0) {
    grunt.fail.fatal('No source files found in directory \'' + options.srcPath + '\'');
  }
  for(var fileIndex = 0, fileCount = sourceFiles.length; fileIndex < fileCount; fileIndex++) {
    if(grunt.file.exists(sourceFiles[fileIndex])) {
      if(options.sourceLanguageCode !== 'en'){
        if(sourceFiles[fileIndex].indexOf('en.json') >= 0) {
          sourceFiles[fileIndex] = sourceFiles[fileIndex].replace('en.json', options.sourceLanguageCode + '.json');
        }
      }
      grunt.log.writeln('we will translate: ' + sourceFiles[fileIndex]);
    }
  }

  q.all([retrieveLangDescriptions(), retrieveSupportedGoogleLanguages()]).then(function(results) {
    var allLangDescriptions = results[0];
    var supportedLangDescriptions = [];
    var googleSupportedLanguages = results[1].filter(function (lang) { return lang != 'en' });

    grunt.log.writeln('lang descriptions: ' + allLangDescriptions.length);
    if(options.restrictToLanguages != null && options.restrictToLanguages.length > 0) {
      grunt.log.writeln('we\'re translating: ' + options.restrictToLanguages);
    }
    else {
      grunt.log.writeln('we\'re translating: ' + googleSupportedLanguages);
    }


    grunt.log.writeln('translating...');
    buildLanguages(googleSupportedLanguages).then(function(languageTranslations) {
      var langDesc = findLanguageDescription(allLangDescriptions, options.sourceLanguageCode);
      supportedLangDescriptions.splice(0, 0, langDesc);

      for(var i = 0; i < languageTranslations.length; i++) {
        var languageTranslation = languageTranslations[i];
        if (languageTranslation.language !== options.sourceLanguageCode) {
          langDesc = findLanguageDescription(supportedLangDescriptions, languageTranslation.language);
          if (!langDesc) {
            langDesc = findLanguageDescription(allLangDescriptions, languageTranslation.language);
            if (langDesc !== null) {
              supportedLangDescriptions.push(langDesc);
            }
          }
        }
        for (var j = 0; j < languageTranslation.translations.length; j++) {
          if (languageTranslation.language !== options.sourceLanguageCode) {
            grunt.log.writeln('writing file: ' + languageTranslation.translations[j].file);
            grunt.file.write(languageTranslation.translations[j].file, JSON.stringify(languageTranslation.translations[j].translation, null, '  '));
          }
        }
      }
      grunt.file.write('languages.json', JSON.stringify(supportedLangDescriptions, null, '  '));
      done();
    });
  }, function (error) {
      console.log(error);
      done();
  });

  function retrieveLangDescriptions() {
    trace('retrieveLangDescriptions');
    var deferred = q.defer();
    rest.get('http://en.wikipedia.org/wiki/List_of_ISO_639-1_codes').on('complete', function (result) {
      if (result instanceof Error) {
        console.log('Error:', result.message);
        deferred.reject(new Error(result));
      } 
      else {
        var $ = cheerio.load(result);
        var rows = $('table.wikitable > tr:has(td:has(a[href]))'); //.filter(' > td');
        var allLangs = [];
        for(var i = 0, count = rows.length; i < count; i++) {
            var lang = $(rows[i]).find('td:nth-child(3)').text();
            var nativeName = $(rows[i]).find('td:nth-child(4)').text();
            var code = $(rows[i]).find('td:nth-child(5)').text();
            allLangs.push({ code: code, displayText: nativeName + ' - (' + lang + ')'});
        }
        deferred.resolve(allLangs);
      }
    });
    return deferred.promise;
  }

  function retrieveSupportedGoogleLanguages() {
    trace('retrieveSupportedGoogleLanguages');
    var deferred = q.defer();

    var languages = [];
    rest.get('https://www.googleapis.com/language/translate/v2/languages?key=' + options.googleApiKey).on('complete', function(result) {
      if (result instanceof Error) {
        console.log('Error:', result.message);
        deferred.reject(new Error(result));
      } 
      else {
        grunt.log.writeln('google supports: ' + result.data.languages.length + ' languages');
        grunt.log.writeln('languages: ' + result.data.languages.map(function (l) { return l.language }).join(', '));

        var language = null;
        for (var i = 0, count = result.data.languages.length; i < count; i++) {
          language = result.data.languages[i].language;
          if(options.restrictToLanguages && options.restrictToLanguages.length > 0) {
            if(options.restrictToLanguages.indexOf(language) >= 0) {
              languages.push(language);
            }
          }
          else {
            languages.push(language);
          }
        }
        deferred.resolve(languages);
      }
    });
    return deferred.promise;
  }

  function execPromisesSequantially(createPromiseFunc, deferred, result) {
    trace('execPromisesSequantially');
    var deferred = deferred||q.defer();
    var result = result||[];
    var promise = createPromiseFunc();
    if (promise) {
      promise.then(function (value) {
        result.push(value);
        setTimeout(function () { execPromisesSequantially(createPromiseFunc, deferred, result) }, 1000);        
      }).catch(function (error) { console.log(error) });
    } 
    else {
      deferred.resolve(result);
    }
    return deferred.promise;
  }

  function buildLanguages(googleSupportedLanguages) {
    trace('buildLanguages');
    var deferred = q.defer();
    var iterator = new Iterator(googleSupportedLanguages);
    var promise = execPromisesSequantially(function () {
      if (iterator.hasMore()) {
        return buildLanguage(iterator.next());
      }
    });
    promise.then(function (translations) {
      deferred.resolve(translations);
    }).catch(function (error) { console.log(error) });
    return deferred.promise;
  }

  function buildLanguage(supportedLanguage) {
    trace('buildLanguage');
    var deferred = q.defer();
    var returnValue = { language: supportedLanguage, translations: []};

    var iterator = new Iterator(sourceFiles);
    var promise = execPromisesSequantially(function () {
      if (iterator.hasMore()) {
        return buildSourceFile(iterator.next(),supportedLanguage);
      }
    });
    promise.then(function (translations) {
      returnValue.translations = returnValue.translations.concat(translations);
      deferred.resolve(returnValue);      
    }).catch(function (error) { console.log(error) });

    return deferred.promise;
  }

  function deletePath(object, path) {
    trace('deletePath');
    var path = path.split('.'), key;
    for (var i=0; i<path.length; i++) {
      if (typeof object != 'object' || !object) {
        return;
      }
      key = path[i];
      if (i==path.length-1) {
        if (typeof object[key] != 'undefined') {
          delete object[key];
        }
      }
      else {
        object = object[key];
      }
    }
  }

  function buildSourceFile(sourceFile, supportedLanguage) {
    trace('buildSourceFile');
    var deferred = q.defer();

    var originalEnFile = grunt.file.readJSON(sourceFile);
    var translatedFile = sourceFile.replace(options.sourceLanguageCode + '.', supportedLanguage + '.');
    var translatedJson = null;

    if(grunt.file.exists(translatedFile)) {
      translatedJson = grunt.file.readJSON(translatedFile);
    }
    else {
      translatedJson = {};
    }

    /* the force_translate key has a special meaning, keys listed there are translated 
       even when a translation for that key already exists  */
    var force_translate = originalEnFile['force_translate'] || [];
    delete originalEnFile['force_translate'];

    for (var i=0; i<force_translate.length; i++) {
      deletePath(translatedJson, force_translate[i]);
    }

    // traverse file, looking for keys that aren't present, and translate
    var translation = {file: translatedFile, translation: translatedJson};
    traverseLangFile(translatedJson, supportedLanguage, originalEnFile).then(function() {
      deferred.resolve(translation);
    }).catch(function (error) { console.log(error) });

    return deferred.promise;
  }

  function traverseLangFile(translation, language, sourceObject) {
    trace('traverseLangFile');
    var deferred = q.defer();

    var fragmentsToTranslate = [];
    findFragmentsToTranslate(sourceObject, translation, fragmentsToTranslate);
    if (fragmentsToTranslate.length == 0) {
      deferred.resolve();
    }

    function processSlice() {
      var slice = fragmentsToTranslate.splice(0, 10);
      var promise = translateFragments(slice, language).then(function(result) {
        for(var i = 0, count = slice.length; i < count; i++) {
          var frag = slice[i];
          frag.translatedObject[frag.propertyName] = restoreVariableReplacements(result.data.translations[i].translatedText.replace('&#39;', '\''));
        }

        if (fragmentsToTranslate.length > 0) {
          setTimeout(processSlice, 1000);
        }
        else {
          deferred.resolve();
        }   
      }).catch(function (error) { console.log(error) });
    }
    processSlice();
    return deferred.promise;
  }

  function findLanguageDescription(supportedLangDescriptions, language) {
    trace('findLanguageDescription');
    var returnValue = null;
    for(var j = 0; j < supportedLangDescriptions.length; j++) {
      if(supportedLangDescriptions[j].code === language) {
        returnValue = supportedLangDescriptions[j];
        break;
      }
    }
    return returnValue;
  }

  function findFragmentsToTranslate(sourceObject, translatedObject, fragmentsToTranslate) {
    trace('findFragmentsToTranslate');
    for(var propertyName in sourceObject) {
      if(typeof sourceObject[propertyName] === 'string') {
        if(!translatedObject.hasOwnProperty(propertyName)) {
          fragmentsToTranslate.push({
            'translatedObject' : translatedObject,
            'propertyName' : propertyName,
            'sourceFragment': sourceObject[propertyName]
          });
        }
      }
      else {
        if(!translatedObject.hasOwnProperty(propertyName)) {
          translatedObject[propertyName] = {};
        }
        findFragmentsToTranslate(sourceObject[propertyName], translatedObject[propertyName], fragmentsToTranslate);
      }
    }
  }
  
  function translateFragments(fragmentsToTranslate, language) {
    trace('translateFragments');
    var deferred = q.defer();

    if(fragmentsToTranslate.length > 0) {
      var queryString = 'https://www.googleapis.com/language/translate/v2?key=' + options.googleApiKey +
          '&source=' + options.sourceLanguageCode +
          '&target=' + language;
      for(var i = 0; i < fragmentsToTranslate.length; i++) {
        queryString = queryString + '&q=' + escapeVariableReplacements(fragmentsToTranslate[i].sourceFragment);
      }

      grunt.log.writeln();
      grunt.log.writeln(queryString);

      var request = rest.get(queryString, {timeout:3000});
      request.on('complete', function(result) {
        if (result instanceof Error) {
          console.log('Error:', result.message);
          deferred.reject(new Error(result));
        } 
        else {
          grunt.log.writeln('>> ' + JSON.stringify(result));
          deferred.resolve(result);
        }
      });
    }
    else {
      setTimeout(function() { deferred.resolve(); });
    }

    return deferred.promise;
  }

  function escapeVariableReplacements(str) {
    trace('escapeVariableReplacements');
    var out = str.replace(/\{\{[^\{\}]+\}\}/g, function(v) { 
      return '<!--'+v.replace('{{','').replace('}}','')+'-->'
    });
    return encodeURIComponent(out);
  }

  function restoreVariableReplacements(str) {
    trace('restoreVariableReplacements');
    // var decoded = decodeURIComponent(str);
    var decoded = str;
    decoded = decoded.replace(/--><!--/g, '--> <!--');
    var out = decoded.replace(/<!--[^<]+-->/g, function (v) { 
      return '{{'+v.replace('<!--', '').replace('-->', '')+'}}'
    });
    if (out.indexOf('{{') != -1) {
        grunt.log.writeln();
        grunt.log.writeln(out);
    }
    return out;
  }
});
};