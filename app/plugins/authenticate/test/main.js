(function () {
'use strict';
var module = angular.module('fim.base');
module.run(function (nxt, $q, modals) {

  var api = nxt.fim();

  var authenticator_rs = 'FIM-PDKH-PS4C-TBCV-9ZQHG';
  var authenticator_pass = 'CENSORED';
  var authenticator_publickey = 'f2b53a29cc4ed80878546500ec7d167cd3686e61b7160a049ee3fdf68a435f44';

  var customer_rs = 'FIM-BA8U-LVXC-WBFT-49C4S';
  var customer_publickey = 'abb02f3fcdcb9fd059ddce61b792cbbaf0b28561e55a845db51b292d6fe2c172';
  var customer_pass = 'CENSORED';
  var customer_data = JSON.stringify({ name:"Alice", sn:"123456789" });

  // 1. Customer identifies with Krypto Fin ry
  // 2. Krypto Fin translates personal data into <1000 character JSON string
  var PERSONAL_JSON = customer_data;

  // 3. Krypto Fin encrypts JSON with Krypto Fin private key and customer public key, 
  //    the encrypted JSON is stored as namespaced alias under Krypto Fin account. 
  //    Eg. JSON:FIM-XXX-YYYY:[encrypted data here]
  var options = {
    account: customer_rs,
    publicKey: customer_publickey
  };
  var ENCRYPTED     = api.crypto.encryptNote(PERSONAL_JSON, options, authenticator_pass);
  var ALIAS_NAME_1  = 'JSON:'+customer_rs;
  var ALIAS_VALUE_1 = JSON.stringify({n:ENCRYPTED.nonce,m:ENCRYPTED.message});

  modals.open('sendProgress', {
    resolve: {
      items: function () {
        return {
          api: api,
          method: 'setNamespacedAlias',
          args: {
            deadline:       '1440',
            feeNQT:         nxt.util.convertToNQT('0.1'),
            secretPhrase:   authenticator_pass,
            publicKey:      api.crypto.secretPhraseToPublicKey(authenticator_pass),
            aliasName:      ALIAS_NAME_1,
            aliasURI:       ALIAS_VALUE_1,
            sender:         authenticator_rs
          }
        };
      }
    },
    close: function (items) {

      // 4. Krypto Fin creates SHA256 HASH of JSON
      //    CHANGE THE JSON SLIGHTLY      
      var SHA256_HASH   = SHA256_hash(PERSONAL_JSON+PERSONAL_JSON);

      // (we could alter the JSON slightly to prevent an attacker has A. a hash of the 
      //  unencrypted data and B. the encrypted data) 

      // 5. Krypto Fin registers alias.. AUTHENTICATED:FIM-XXX-YYYY=ghdg7u4ghj337ryurg37rg83grgg
      //    where FIM-XXX-YYYY is the account of the customer and 
      //    ghdg7u4ghj337ryurg37rg83grgg is the SHA256 hash of the JSON 
      //    (we could alter the JSON slightly to prevent an attacker has A. a hash of the 
      //    unencrypted data and B. the encrypted data) this could be solved in the client 
      //    since the customer has to decrypt and send the decrypted contents to the party 
      //    he is identifying with.
      var ALIAS_NAME_2  = 'AUTHENTICATED:'+customer_rs;
      var ALIAS_VALUE_2 = SHA256_HASH;

      modals.open('sendProgress', {
        resolve: {
          items: function () {
            return {
              api: api,
              method: 'setNamespacedAlias',
              args: {
                deadline:       '1440',
                feeNQT:         nxt.util.convertToNQT('0.1'),
                secretPhrase:   authenticator_pass,
                publicKey:      api.crypto.secretPhraseToPublicKey(authenticator_pass),        
                aliasName:      ALIAS_NAME_2,
                aliasURI:       ALIAS_VALUE_2,
                sender:         authenticator_rs 
              }
            };
          }
        },
        close: function (items) {

          // 7. Customer wants to identify with lender 
          // 8. Customer reads namespaced alias set earlier (better than message since we can change that)
          api.getNamespacedAlias({
            account:        authenticator_rs,
            aliasName:      ALIAS_NAME_1
          }).then(
            function (alias /* { n: String, m: String } */) {

              // 9. Customer decrypts the JSON and slightly alters the JSON to match the JSON that the 
              //    hash was made for, then transmits unencrypted JSON to lender 
              //    (a change could be adding/removing/changing a single property in the JSON doc)
              var obj         = JSON.parse(alias.aliasURI);
              var PRIVATE_KEY = converters.hexStringToByteArray(api.crypto.getPrivateKey(customer_pass))
              var PUBLIC_KEY  = converters.hexStringToByteArray(authenticator_publickey);
              var NONCE       = converters.hexStringToByteArray(obj.n);
              var DATA        = converters.hexStringToByteArray(obj.m);

              var DECRYPTED   = api.crypto.decryptData(DATA, { 
                privateKey: PRIVATE_KEY,
                publicKey:  PUBLIC_KEY,
                nonce:      NONCE
              });

              // 10. Lender makes SHA256 HASH of JSON received from customer
              var SHA256_HASH_2 = SHA256_hash(PERSONAL_JSON+PERSONAL_JSON);

              // 11. Lender reads namespaced alias AUTHENTICATED:FIM-XXX-YYYY from 
              //     Krypto Fin ry namespace
              api.getNamespacedAlias({
                account:        authenticator_rs,
                aliasName:      'AUTHENTICATED:'+customer_rs
              }).then(

                function (alias) {

                  // 12. Lender compares his own calculated hash with that of the one in 
                  //     AUTHENTICATED:FIM-XXX-YYYY
                  if (alias.aliasURI == SHA256_HASH_2) {

                    // 13. If hashes check out, customer apparently gave the actual JSON he 
                    //     received from Krypto Fin ry in the first place

                    console.log('Test success');

                  }
                }
              );
            }
          )
        }
      })
    }
  });

});
})();