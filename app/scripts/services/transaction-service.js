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
    'use strict'
    var module = angular.module('fim.base')
    module.factory('TransactionService', function (plugins) {

        var SERVICE = {

            signTransaction: function (progress, api, args, data, secretPhrase, publicKey) {
                progress.setMessage('Signing Transaction')
                var signature = api.crypto.signBytes(
                    data.unsignedTransactionBytes,
                    converters.stringToHexString(secretPhrase)
                )
                if (!api.crypto.verifyBytes(signature, data.unsignedTransactionBytes, publicKey)) {
                    progress.setErrorMessage(i18n.format('error_signature_verification_client'))
                    progress.enableCloseBtn()
                    return
                }
                var payload = api.verifyAndSignTransactionBytes(
                    data.unsignedTransactionBytes, signature, args.requestType, args, api.type
                )
                if (!payload) {
                    progress.setErrorMessage(i18n.format('error_signature_verification_server'))
                    progress.enableCloseBtn()
                    return
                }
                return payload
            },

            broadcast: function (socket, progress, payload) {
                progress.setMessage('Broadcasting Transaction')
                if (!socket.is_connected) {
                    progress.setErrorMessage("No connection with server, try later")
                    progress.enableCloseBtn()
                    return
                }
                return socket.callAPIFunction({requestType: 'broadcastTransaction', transactionBytes: payload}).then(
                    function (data) {
                        progress.animateProgress().then(
                            function () {
                                progress.setMessage('Transaction sent successfully')
                                progress.enableCloseBtn()
                                // if ($scope.items.autoSubmit) {
                                //   progress.close();
                                //   $modalInstance.close($scope.items);
                                // } else {
                                //   progress.onclose = function () {
                                //     $modalInstance.close($scope.items);
                                //   };
                                // }
                            }
                        )
                    },
                    function (data) {
                        progress.setMessage(JSON.stringify(data))
                        progress.enableCloseBtn()
                    }
                )
            },

            sendTransaction: function (api, args, secretPhrase, autoclose) {
                plugins.get('alerts').progress({title: "Please wait"}).then(
                    function (progress) {
                        var socket = api.engine.socket()

                        // if (items.autoSubmit) {
                        //   progress.onclose = function () {
                        //     $modalInstance.close($scope.items);
                        //   };
                        // }

                        progress.setMessage('Creating Transaction')
                        if (!socket.is_connected) {
                            progress.setErrorMessage("No connection with server, try later")
                            progress.enableCloseBtn()
                            return
                        }
                        socket.callAPIFunction(args).then(
                            function (data) {
                                var error = data.errorDescription || data.error
                                if (error) {
                                    console.error("Error on sending login registration transaction (no fee). " + error)
                                    progress.close()
                                    return
                                }
                                /* Secretphrase was send to the server */
                                if (args.secretPhrase) {
                                    progress.animateProgress().then(
                                        function () {
                                            new Audio('images/beep.wav').play()
                                            progress.setMessage('Operation complete')
                                            progress.enableCloseBtn()
                                            // progress.onclose = function () {
                                            //   $modalInstance.close($scope.items);
                                            // };
                                        }
                                    )
                                } else {  /* Must sign the txn client side */
                                    var payload = SERVICE.signTransaction(progress, api, args, data, secretPhrase, args.publicKey)
                                    if (payload) {
                                        var promise = SERVICE.broadcast(socket, progress, payload)
                                        if (autoclose && promise) {
                                            promise.then(function () {
                                                console.debug("sign in is registered")
                                                progress.close()
                                            })
                                        }
                                    } else {
                                        progress.setMessage('Not signed')
                                        progress.enableCloseBtn()
                                    }
                                }
                            },
                            function (data) {
                                progress.setMessage(JSON.stringify(data))
                                progress.enableCloseBtn()
                            }
                        )
                    }
                )
            }
        }

        return SERVICE
    })
})()