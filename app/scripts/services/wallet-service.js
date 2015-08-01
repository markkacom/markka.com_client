(function () {
'use strict';
var module = angular.module('fim.base');

var unlockedSecretPhrases = {};

module.factory('WalletService', function ($q, $timeout, $interval, $rootScope) {

  function WalletService($scope) {
    this.$scope    = $scope;
    this.keyExists = false;
    this.keySaved  = false;
  }
  WalletService.prototype = {

    /**
     * Returns the secretPhrase for the provided account if it's stored in the key cache. 
     * In case the key is not unlocked it is looked up in localStorage and decrypted
     * with the provided password.
     *
     * @param id_rs     String - NXT-XXX or FIM-XXX address
     * @param password  String - wallet password
     * @returns String
     */
    getSecretPhrase: function (id_rs, password) {
      if (this.hasSecretPhraseUnlocked(id_rs)) {
        return unlockedSecretPhrases[id_rs];
      }
      var list = this._getList();
      for (var i=0; i<list.length; i++) {
        if (e[2] == id_rs) {
          var cipher_key = e[1];
          var entry = this.decrypt(cipher_key, password);
          if (entry) {
            return entry.key;
          }
          break;
        }
      }
      return null;
    },

    hasSecretPhrase: function (id_rs) {
      return this.hasSecretPhraseUnlocked(id_rs) || this._hasAccount(id_rs);
    },

    hasSecretPhraseUnlocked: function (id_rs) {
      return typeof unlockedSecretPhrases[id_rs] == 'string';
    },

    forgetSecretPhrase: function (id_rs) {
      delete unlockedSecretPhrases[id_rs];
    },

    rememberSercetPhrase: function (id_rs, secretPhrase) {
      unlockedSecretPhrases[id_rs] = secretPhrase;
    },

    /**
     * Used in the login.html landing page to set the cipherkey
     */
    setKey: function (cipher_key) {
      var self = this;
      this.$scope.$evalAsync(function () {
        self.keyExists = self._hasKey(cipher_key);
      });
    },

    saveKey: function (engine, cipher_key, name, account_identifier) {
      var self = this;
      this.$scope.$evalAsync(function () {
        self.keyExists = self._hasKey(cipher_key);
        if (!self.keyExists) {
          var list = self._getList();
          list.push([name, cipher_key, account_identifier, engine]);
          self._saveList(list);
          self.keySaved = true;
        }
      });
    },

    /* @param key { key: '', account: '', engine: '' } 
       @returns String */
    encrypt: function (keyObj, password) {
      var text = JSON.stringify([keyObj.key,keyObj.account,keyObj.engine]);
      return encrypt(password, text);
    },

    /* @param cipher_key String
       @returns { key: '', account: '', engine: '' } */
    decrypt: function (cipher_key, password) {
      try {
        var text = decrypt(password, cipher_key);
        console.log('decrypted', text);
        var a = JSON.parse(text);
        return { key: a[0], account: a[1], engine: a[2] };
      } catch (e) {
        console.log(e);
        return null;
      }
    },

    _getUniqueName: function () {
      var base = 'MyKey_';
      var names = this._getNames();
      var i = 0;
      while (names.indexOf( String(base + i) ) != -1) {
        i++;
      }
      return base+i;
    },

    _getKeyName: function (cipher_key) {
      var list = this._getList();
      for (var i=0; i<list.length; i++) {
        if (list[i][1] == cipher_key) {
          return list[i][0];
        }
      }
    },

    _getKeyAccount: function (name) {
      var list = this._getList();
      for (var i=0; i<list.length; i++) {
        if (list[i][0] == name) {
          return list[i][2];
        }
      }
    },

    _hasName: function (name) {
      var list = this._getList();
      for (var i=0; i<list.length; i++) {
        if (list[i][0] == name) {
          return true;
        }
      }
    },

    _getNames: function () {
      return this._getList().map(function (entry) {
        return entry[0];
      });
    },

    _hasKey: function (cipher_key) {
      var list = this._getList();
      for (var i=0; i<list.length; i++) {
        if (list[i][1] == cipher_key) {
          return true;
        }
      }
      return false;
    },

    _hasAccount: function (id_rs) {
      var list = this._getList();
      for (var i=0; i<list.length; i++) {
        if (list[i][2] == id_rs) {
          return true;
        }
      }
      return false;
    },

    _getList: function () {
      return JSON.parse(window.localStorage.getItem("mofo.keys") || '[]');
    },

    _saveList: function (list) {
      window.localStorage.setItem("mofo.keys", JSON.stringify(list));
    }
  };

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
  return WalletService;
});
})();