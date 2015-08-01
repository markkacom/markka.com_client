/* Source modified from timeago jquery plugin */
(function () {
'use strict';
var module = angular.module('fim.base');
module.factory('timeagoService', function ($translate, $rootScope) {

  var SERVICE = {
    format: function (timestamp) {
      if (timestamp instanceof Date) {
        return inWords(timestamp);
      } 
      else if (typeof timestamp === "string") {
        return inWords(parse(timestamp));
      } 
      else if (typeof timestamp === "number") {
        return inWords(new Date(timestamp));
      } 
      else {
        return inWords(datetime(timestamp));
      }
    }
  };

  function inWords(date) {
    return inWordsImpl(distance(date));
  }

  function distance(date) {
    return (new Date().getTime() - date.getTime());
  }

  var settings = {};

  function initSettings() {
    settings = {
      refreshMillis: 60000,
      allowPast: true,
      allowFuture: false,
      localeTitle: false,
      cutoff: 0,
      strings: {
        prefixAgo: null,
        prefixFromNow: null,
        suffixAgo: $translate.instant('time.suffixAgo'),
        suffixFromNow: $translate.instant('time.suffixFromNow'),
        inPast: $translate.instant('time.inPast'),
        seconds: $translate.instant('time.seconds'),
        minute: $translate.instant('time.minute'),
        minutes: function (val) { return $translate.instant('time.minutes', { val:val }) },
        hour: $translate.instant('time.hour'),
        hours: function (val) { return $translate.instant('time.hours', { val:val }) },
        day: $translate.instant('time.day'),
        days: function (val) { return $translate.instant('time.days', {val:val}) },
        month: $translate.instant('time.month'),
        months: function (val) { return $translate.instant('time.months', { val:val }) },
        year: $translate.instant('time.year'),
        years: function (val) { return $translate.instant('time.years', { val:val }) },
        wordSeparator: " "
      }
    };
  }
  
  initSettings();
  $rootScope.$on('$translateChangeSuccess', function () {
    initSettings();
  });

  function inWordsImpl(distanceMillis) {
    if(!settings.allowPast && !settings.allowFuture) {
        throw 'timeago allowPast and allowFuture settings can not both be set to false.';
    }

    var $l     = settings.strings;
    var prefix = $l.prefixAgo;
    var suffix = $l.suffixAgo;
    if (settings.allowFuture) {
      if (distanceMillis < 0) {
        prefix = $l.prefixFromNow;
        suffix = $l.suffixFromNow;
      }
    }

    if(!settings.allowPast && distanceMillis >= 0) {
      return settings.strings.inPast;
    }

    var seconds = Math.abs(distanceMillis) / 1000;
    var minutes = seconds / 60;
    var hours = minutes / 60;
    var days = hours / 24;
    var years = days / 365;

    function substitute(stringOrFunction, number) {      
      return angular.isFunction(stringOrFunction) ? stringOrFunction(number) : stringOrFunction;
    }

    var words = seconds < 45 && substitute($l.seconds, Math.round(seconds)) ||
      seconds < 90 && substitute($l.minute, 1) ||
      minutes < 45 && substitute($l.minutes, Math.round(minutes)) ||
      minutes < 90 && substitute($l.hour, 1) ||
      hours < 24 && substitute($l.hours, Math.round(hours)) ||
      hours < 42 && substitute($l.day, 1) ||
      days < 30 && substitute($l.days, Math.round(days)) ||
      days < 45 && substitute($l.month, 1) ||
      days < 365 && substitute($l.months, Math.round(days / 30)) ||
      years < 1.5 && substitute($l.year, 1) ||
      substitute($l.years, Math.round(years));

    var separator = $l.wordSeparator || "";
    if ($l.wordSeparator === undefined) { separator = " "; }
    return [prefix, words, suffix].join(separator).trim();
  }

  function parse(iso8601) {
    var s = iso8601.trim();
    s = s.replace(/\.\d+/,""); // remove milliseconds
    s = s.replace(/-/,"/").replace(/-/,"/");
    s = s.replace(/T/," ").replace(/Z/," UTC");
    s = s.replace(/([\+\-]\d\d)\:?(\d\d)/," $1$2"); // -04:00 -> -0400
    s = s.replace(/([\+\-]\d\d)$/," $100"); // +09 -> +0900
    return new Date(s);
  }

  return SERVICE;
});

})();