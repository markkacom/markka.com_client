(function () {
'use strict';
var module = angular.module('fim.base');
module.factory('KeyService', function ($q, $timeout, $interval, $rootScope) {

  var unlockedKeys = {};

  var SERVICE = {
    wallet: null,
    lock: function () {
      unlockedKeys = {};
      this.wallet = null;
    },
    unlock: function (password, cipher_text_override) {
      return this.wallet = loadWallet(password, cipher_text_override);
    },
    get: function (id_rs) {
      if (this.wallet) {
        return this.wallet.get(id_rs);
      }
      if (unlockedKeys[id_rs]) {
        return unlockedKeys[id_rs];
      }
      return null;
    },
    create: function (password) {
      return this.wallet = new Wallet([], password);
    },
    walletExists: function () {
      return typeof window.localStorage.getItem("mofo.key.service") == 'string';
    },
    remember: function (id_rs, secretPhrase) {
      unlockedKeys[id_rs] = secretPhrase;
    },
    remove: function () {
      window.localStorage.removeItem("mofo.key.service");
      this.wallet = null;
      unlockedKeys = {};
    },
    toString: function () {
      return encryptJSONObject(this.wallet.entries, this.wallet.password);
    }
  };

  function Wallet(entries, password) {
    this.password = password;
    this.mapped = {};
    this.entries = [];
    for (var i=0; i<entries.length;i++) {
      if (!this.mapped[entries[i].id_rs]) {
        this.entries.push(entries[i]);
        this.mapped[entries[i].id_rs] = entries[i].secretPhrase;
      }
    }
  }
  Wallet.prototype = {
    save: function () {
      var encrypted = encryptJSONObject(this.entries, this.password);
      window.localStorage.setItem("mofo.key.service", encrypted);
    },

    add: function (id_rs, secretPhrase) {
      if (this.mapped[id_rs]) return;
      this.entries.push({id_rs:id_rs, secretPhrase:secretPhrase});
      this.mapped[id_rs] = secretPhrase;
      this.save();
    },

    remove: function (id_rs) {
      this.entries = this.entries.filter(function (e) { return e.id_rs != id_rs});
      delete this.mapped[id_rs];
      this.save();
    },

    get: function (id_rs) {
      return this.mapped[id_rs];
    }
  };

  /**
   * Reads the encrypted wallet list from localStorage and decrypts it.
   * When @cipher_text_override is provided we use that instead of reading
   * from localstorage.
   * Returns an array of objects.
   *
   * @param password
   * @param cipher_text_override
   * @return Array of Object
   */
  function loadWallet(password, cipher_text_override) {
    var text = cipher_text_override || window.localStorage.getItem("mofo.key.service");
    if (!text) {
      return null;
    }
    var list = decryptJSONObject(text, password);
    if (list == null) {
      return null;
    }
    /* support legacy wallets that have a slightly different JSON schema */
    if (!Array.isArray(list)) {
      var temp = [];
      angular.forEach(list, function (value, name) {
        if (name !== 'padding') {
          temp.push({id_rs: value.id_rs, secretPhrase:value.secretPhrase});
        }
      });
      list = temp;
    }
    return new Wallet(list, password);
  }

  /**
   * Encrypts a JSONObject, first turns it into a string then encrypts the string
   * with the provided password.
   *
   * @param Object (JSON object)
   * @returns String (encrypted)
   */
  function encryptJSONObject(object, password) {
    var text = JSON.stringify(object);
    return encrypt(password, text);
  }

  /**
   * Decrypts a piece of encrypted stringified JSONObject, parses the decerypted
   * string into a JSON object.
   *
   * @param cipherText String
   * @returns Object or null
   */
  function decryptJSONObject(cipherText, password) {
    try {
      var text = decrypt(password, cipherText);
      var object = JSON.parse(text);
      return typeof object == 'object' ? object : null;
    } catch (e) {
      // console.log(e);
      // console.log('password',password);
      // console.log('text',text);
      // console.log('cipherText', cipherText);
      return null;
    }
  } 

  // Formats and wraps the ciphertext, salt and iv as JSON document
  var WalletFormatter = {
    stringify: function (cipherParams) {
      var jsonObj = {
        ct: cipherParams.ciphertext.toString(CryptoJS.enc.Base64)
      };
      if (cipherParams.iv) {
          jsonObj.iv = cipherParams.iv.toString();
      }
      if (cipherParams.salt) {
          jsonObj.s = cipherParams.salt.toString();
      }
      var json = JSON.stringify(jsonObj, undefined, 2);
      return converters.stringToHexString(json);
    },
    parse: function (jsonStr) {
      jsonStr = converters.hexStringToString(jsonStr);
      var jsonObj = JSON.parse(jsonStr);
      var cipherParams = CryptoJS.lib.CipherParams.create({
          ciphertext: CryptoJS.enc.Base64.parse(jsonObj.ct)
      });
      if (jsonObj.iv) {
          cipherParams.iv = CryptoJS.enc.Hex.parse(jsonObj.iv)
      }
      if (jsonObj.s) {
          cipherParams.salt = CryptoJS.enc.Hex.parse(jsonObj.s)
      }
      return cipherParams;
    }
  };

  /**
   * @param passPhrase String
   * @param plaintext String
   * @returns String
   */
  function encrypt(passPhrase, plainText) {
    if (!window.crypto && !window.msCrypto) {
      throw new Error('FIX ME !! Should use mouse initiated seed!!!'); // 
    }

    var passByte  = converters.stringToByteArray(passPhrase);
    var key       = CryptoJS.SHA256(converters.byteArrayToWordArray(passByte));
    var tmp       = new Uint8Array(16);

    if (window.crypto) {
      window.crypto.getRandomValues(tmp);
    } else {
      window.msCrypto.getRandomValues(tmp);
    }

    var iv        = converters.byteArrayToWordArray(tmp);
    var encrypted = CryptoJS.AES.encrypt(plainText, key.toString(CryptoJS.enc.Hex), { 
      iv: iv,
      format: WalletFormatter
    });
    return encrypted.toString();
  }

  /**
   * @param password String
   * @param cypherText String
   * @returns String
   */
  function decrypt(passPhrase, cipherText) {
    var passByte  = converters.stringToByteArray(passPhrase);
    var key       = CryptoJS.SHA256(converters.byteArrayToWordArray(passByte));
    var decrypted = CryptoJS.AES.decrypt(cipherText, key.toString(CryptoJS.enc.Hex), { 
      format: WalletFormatter 
    });
    return decrypted.toString(CryptoJS.enc.Utf8);
  }

  return SERVICE;
});
})();