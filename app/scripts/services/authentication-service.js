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

module.factory('AuthenticationService', function($rootScope, $http, authService) {
var service = {
  login: function(user) {
    $http.post('https://login', { user: user }, { ignoreAuthModule: true })
    .success(function (data) {
      $http.defaults.headers.common.Authorization = data.authorizationToken;  // Step 1

      // Need to inform the http-auth-interceptor that
      // the user has logged in successfully.  To do this, we pass in a function that
      // will configure the request headers with the authorization token so
      // previously failed requests(aka with status == 401) will be resent with the
      // authorization token placed in the header
      authService.loginConfirmed(data, function(config) {  // Step 2 & 3
        config.headers.Authorization = data.authorizationToken;
        return config;
      });
    })
    .error(function (data, status) {
      $rootScope.$broadcast('event:auth-login-failed', status);
    });
  },
  logout: function() {
    $http.post('https://logout', {}, { ignoreAuthModule: true })
    .finally(function() {
      delete $http.defaults.headers.common.Authorization;
      $rootScope.$broadcast('event:auth-logout-complete');
    });
  },
  loginCancelled: function() {
    authService.loginCancelled();
  }
};
return service;
});

})();