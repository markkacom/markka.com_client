/**
 * The MIT License (MIT)
 * Copyright (c) 2022 Krypto Fin ry and the FIMK Developers
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
    module.factory('lompsaService', function ($q, $http) {

        var SERVICE = {

            fimkRates: function () {
                var deferred = $q.defer();
                $http.get('https://lompsa.com/fimkrates.txt')
                    .success(function (data) {
                        //todo
                        //temporary
                        data = "{\n" +
                            "  \"TIME\": \"2022-06-06 11:00:00\",\n" +
                            "  \"BTC\": 0.00000001,\n" +
                            "  \"EUR\": 0.0002910\n" +
                            "}";
                        deferred.resolve(JSON.parse(data));
                    })
                    .error(function (data) {
                        deferred.reject("error on requesting data from https://lompsa.com/fimkrates.txt " + (data || ""));
                    });
                return deferred.promise;
            }

        };

        return SERVICE;
    });
})();