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
    unlock: function (password) {
      return this.wallet = loadWallet(password);
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
    }
  };

  function Wallet(entries, password) {
    this.entries = entries;
    this.mapped = {};
    for (var i=0; i<this.entries.length; i++) {
      this.mapped[this.entries[i].id_rs] = this.entries[i].secretPhrase;
    }
    this.password = password;
  }
  Wallet.prototype = {
    save: function () {
      var encrypted = encryptJSONObject(this.entries, this.password);
      window.localStorage.setItem("mofo.key.service", encrypted);
    },

    add: function (id_rs, secretPhrase) {
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
   * Returns an array of objects.
   *
   * @param password
   * @return Array of Object
   */
  function loadWallet(password) {
    var text = window.localStorage.getItem("mofo.key.service");
    if (!text) {
      return null;
    }
    var list = decryptJSONObject(text, password);
    if (list == null) {
      return null;
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
      console.log(e);
      console.log('password',password);
      console.log('text',text);
      console.log('cipherText', cipherText);
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