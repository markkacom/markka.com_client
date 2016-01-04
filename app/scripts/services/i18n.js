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
module.factory('i18n', function () {

  var PKAnnouncementBlockPassed = true;

  var messages = {
    "recipient_unknown": "The recipient account is an unknown account, meaning it has never had an incoming or outgoing transaction. Please double check your recipient address before submitting.",
    "recipient_unknown_pka": "The recipient account is an unknown account, meaning it has never had an incoming or outgoing transaction. To submit this request you must supply the recipient public key also.",
    // "recipient_no_public_key_pka": "The recipient account does not have a public key, meaning it has never had an outgoing transaction. The account has a balance of __nxt__ __symbol__. To submit this request you must supply the recipient public key also.",
    "recipient_malformed": "The recipient account is malformed, please adjust.",
    "recipient_info": "The recipient account has a public key and a balance of __nxt__ __symbol__.",
    "recipient_no_public_key": "The recipient account does not have a public key, meaning it has never had an outgoing transaction. The account has a balance of __nxt__ __symbol__. Please double check your recipient address before submitting.",
    "recipient_problem": "There is a problem with the recipient account: __problem__",
    "recipient_malformed_suggestion": "The recipient address is malformed, did you mean __recipient__",
    "recipient_malformed_suggestion_plural": "The recipient address is malformed, did you mean any of the following: __multiple__",
    "error_signature_verification_client": "Could not verify signature (client side).",
    "error_signature_verification_server": "Could not verify signature (server side).",
  };

  return {
    format: function (id, args) {
      if (PKAnnouncementBlockPassed && ((id+'_pka') in messages)) {
        id = id+'_pka';
      }
      var msg = messages[id];
      if (args) {
        for (var x in args) {
          msg = msg.replace(x, args[x]);
        }
      }
      return msg;
    }
  };

});

})();