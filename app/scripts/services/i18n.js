(function () {
'use strict';
var module = angular.module('fim.base');
module.factory('i18n', function () {

  var PKAnnouncementBlockPassed = true;

  var messages = {
    "recipient_unknown": "The recipient account is an unknown account, meaning it has never had an incoming or outgoing transaction. Please double check your recipient address before submitting.",
    "recipient_unknown_pka": "The recipient account is an unknown account, meaning it has never had an incoming or outgoing transaction. To submit this request you must supply the recipient public key also.",
    "recipient_no_public_key_pka": "The recipient account does not have a public key, meaning it has never had an outgoing transaction. The account has a balance of __nxt__ FIM. To submit this request you must supply the recipient public key also.",
    "recipient_malformed": "The recipient account is malformed, please adjust.",
    "recipient_info": "The recipient account has a public key and a balance of __nxt__ FIM.",
    "recipient_no_public_key": "The recipient account does not have a public key, meaning it has never had an outgoing transaction. The account has a balance of __nxt__ FIM. Please double check your recipient address before submitting.",
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