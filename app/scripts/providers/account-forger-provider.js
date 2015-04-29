(function () {
'use strict';
var module = angular.module('fim.base');
module.factory('AccountForgerProvider', function (nxt, $q, $timeout, $interval, serverService, $rootScope) {
  
  // http://stackoverflow.com/a/8212878
  function millisecondsToStr (milliseconds) {
    // TIP: to find current time in milliseconds, use:
    // var  current_time_milliseconds = new Date().getTime();

    function numberEnding (number) {
      return (number > 1) ? 's' : ''; 
    }

    var temp = Math.floor(milliseconds / 1000);
    var years = Math.floor(temp / 31536000);
    if (years) {
      return years + ' year' + numberEnding(years);
    }
    //TODO: Months! Maybe weeks? 
    var days = Math.floor((temp %= 31536000) / 86400);
    if (days) {
      return days + ' day' + numberEnding(days);
    }
    var hours = Math.floor((temp %= 86400) / 3600);
    if (hours) {
      return hours + ' hour' + numberEnding(hours);
    }
    var minutes = Math.floor((temp %= 3600) / 60);
    if (minutes) {
      return minutes + ' minute' + numberEnding(minutes);
    }
    var seconds = temp % 60;
    if (seconds) {
      return seconds + ' second' + numberEnding(seconds);
    }
    return 'less than a second'; //'just now' //or other string you like;
  }

  function AccountForgerProvider(api, $scope, account) {
    var self        = this;
    this.api        = api;
    this.$scope     = $scope;
    this.account    = account;

    this.isLoading  = false;
    this.isForging  = false;
    this.deadline   = 0;
    this.hitTime    = 0;
    this.remaining  = 0;
    this.interval   = null;

    $scope.$on('$destroy', function () {
      $interval.cancel(self.interval);
      self.interval = null;
    });

    serverService.addListener(api.engine.type, 'exit', angular.bind(this, this.onServerExit));
    serverService.addListener(api.engine.type, 'ready', angular.bind(this, this.reload));

    this.socket().subscribe('blockPoppedNew', angular.bind(this, this.reload), $scope);
    this.socket().subscribe('blockPushedNew', angular.bind(this, this.reload), $scope);    
  }
  AccountForgerProvider.prototype = {
    socket: function () {
      if ($rootScope.forceLocalHost) {
        return this.api.engine.socket();  
      }
      return this.api.engine.localSocket();      
    },

    reload: function () {
      var self = this;
      this.$scope.$evalAsync(function () {
        self.isLoading        = true;
        $timeout(function () {  self.getNetworkData(); }, 1, false);        
      });
    },

    getNetworkData: function () {
      var self = this, args = { account:this.account, includeForging: 'true' };
      this.socket().getAccount(args).then(
        function (a) {
          self.$scope.$evalAsync(function () {
            self.isLoading  = false;
            self.isForging  = a.isForging;
            self.deadline   = a.deadline;          
            self.hitTime    = a.hitTime;
            self.now        = Date.now();

            var handler     = self.createIntervalHandler(self);
            self.remaining  = handler();

            $interval.cancel(self.interval);
            $interval(handler, 1000);
          });
        },
        function (data) {
          self.$scope.$evalAsync(function () {
            self.isLoading = false;
          });
        }
      );
    },

    onServerExit: function () {
      var self = this;
      this.$scope.$evalAsync(function () {
        self.isForging  = false;
        self.deadline   = Number.MAX_VALUE;
        self.hitTime    = Number.MAX_VALUE;
      });
    },

    createIntervalHandler: function (self) {
      return function () {
        var shift = Date.now() - self.now;
        self.remaining = millisecondsToStr(Math.round(self.deadline - (shift/1000)) * 1000);
      }
    }
  };
  return AccountForgerProvider;
});
})();