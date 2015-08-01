(function () {
'use strict';
var module = angular.module('fim.base');
module.run(function (plugins, modals, $q, $timeout, db, nxt, $sce) {  

  /* Global variables hidden from outside code | rely on the fact that 
     there is one wallet opened each time */
  var gPassword     = '';
  var gFile         = '';
  var gWallet       = null;
  var gMemoryWallet = null;
  var gDeferred     = null;

  /* Register as plugin */
  plugins.register({
    id:       'wallet',
    label:    'Wallet',
    extends:  'settings',
    icon_class:   'glyphicon glyphicon-briefcase',
    templateURL:  'plugins/wallet/partials/wallet-manager.html',    

    /* Returns the internal file object */
    getFile: function () {
      return gFile;
    },

    /* Returns a copy of the internal wallet object */
    getWallet: function () {
      return angular.copy(gWallet);
    },

    /* Returns all wallet entry keys */
    getKeys: function () {
      return gWallet ? Object.keys(gWallet) : [];
    },

    /* Do we have that key? */
    hasKey: function (key) {
      return ((gWallet && gWallet[key]) || (gMemoryWallet && gMemoryWallet[key]));
    },

    /* Remove an entry from the wallet */
    remove: function (key) {
      delete gWallet[key];
    },

    /* Returns the secretPhrase if any */
    getSecretPhrase: function (key) {
      if (gWallet && gWallet[key]) {
        return gWallet[key].secretPhrase;
      }
      else if (gMemoryWallet && gMemoryWallet[key]) {
        return gMemoryWallet[key].secretPhrase;
      }
      return null;
    },

    /* Prompts the user to open a wallet */
    promptForWallet: function () {
      return promptForWallet();
    },

    /* Saves a secretPhrase to the memory pool */
    saveToMemory: function (key, secretPhrase) {
      gMemoryWallet = gMemoryWallet || {};
      gMemoryWallet[key] = {
        id_rs:        key,
        secretPhrase: secretPhrase
      };
    },

    /**
     * Returns an entry from the wallet. If no wallet is open the user is prompted to
     * select a wallet file and to provide his password to unlock it.
     *
     * @returns Promise
     */
    getEntry: function (id_rs) {
      var deferred    = $q.defer();

      /* Wallet is open and key is available */
      if ((gWallet || gMemoryWallet) && _getEntry(id_rs)) {
        deferred.resolve(_getEntry(id_rs));
      }
      else {
        if (gWallet) {
          plugins.get('alerts').warn({ message: 'Key not found in wallet. Close dialog to select another wallet.'}).then(
            function () {
              promptForWallet().then(
                function () {
                  // recursive - try again now with other wallet
                  plugins.get('wallet').getEntry(id_rs).then(deferred.resolve, deferred.reject);
                },
                function () {
                  deferred.reject();
                }
              );
            }
          );
        }
        else {
          promptForWallet().then(
            function () {
              // recursive - try again now with other wallet
              plugins.get('wallet').getEntry(id_rs).then(deferred.resolve, deferred.reject);
            },
            function () {
              deferred.reject();
            }
          );
        }
      }
      return deferred.promise;
    },

    /**
     * Ads a new entry to the wallet and prompts the user to save it.
     * Returning a Promise is useless since we dont know when the saveas dialog completes.
     */
    addEntry: function (entry) {
      var self = this;
      var deferred = $q.defer();

      if (validateEntry(entry)) {
        if (gWallet) {
          gWallet[entry.id_rs] = entry;
          this.save(gFile.name, gPassword).then(deferred.resolve, deferred.reject);
        }
        else {
          plugins.get('alerts').confirm({ message: 'Do you want to store this secretphrase in an existing wallet?' }).then(
            function (value) {
              if (value) {
                promptForWallet().then(
                  function () {
                    // recursive - try again now with other wallet
                    plugins.get('wallet').addEntry(entry);
                  },
                  deferred.reject
                );
              }
              else {
                gWallet = {};
                gWallet[entry.id_rs] = entry;
                self.save().then(deferred.resolve, deferred.reject);
              }
            }
          );
        }
      }
      else {
        console.log('Invalid entry !!', entry);
        deferred.reject();
      }
      return deferred.promise;
    },

    /**
     * Creates a new Promise ($q.defer()) which is stored in the global gDeferred
     * variable. When the wallet is opened and decrypted in window.onWalletFileSelected
     * if the gDeferred variable is set it is called with resolve or reject result.
     */
    createOnWalletFileSelectedPromise: function ($scope) {
      if ($scope) {
        $scope.$on('$destroy', function () {
          if (gDeferred) {
            gDeferred.reject();
            gDeferred = null;
          }
        });
      }
      gDeferred = $q.defer();
      return gDeferred.promise;
    },

    /**
     * @returns Promise
     * */
    save: function (fileName, password) {
      if (gWallet === null) {
        throw new Error('No wallet opened, cannot save.')
      }

      var deferred    = $q.defer();
      saveWallet(password).then(
        function (items) {
          try {
            var serialized  = JSON.stringify(addPadding(gWallet));
            var encrypted   = encrypt(items.password, serialized);
            var blob        = new Blob([encrypted], {type: "text/plain;charset=utf-8"});
            saveAs(blob, fileName||'mofo.wallet');
          }
          catch (e) {
            deferred.reject(e);
          }
          $timeout(function () {
            deferred.resolve();
          }, 1000);
        },
        function () {
          deferred.reject();
        }
      );
      return deferred.promise;
    },

    /* Opens wallet manager */
    manager: function () {
      var deferred = $q.defer();
      modals.open('walletManager', {
        resolve: {
          items: function () {
            return {};
          }
        },
        close: function () {
          deferred.resolve();
        }
      });
      return deferred.promise;
    },

    confirmSaveToWallet: function () {
      var deferred = $q.defer();
      var html = ['<p class="lead">Do you want to save this secret phrase in a wallet?</p>',
                  '<p>A wallet is a file that you download and store on your computer.<br> ',
                  'A wallet is <b>not an alternavtive to remembering or writing down your secret phrase</b>.<br><br> ',
                  'A wallet is meant as a secure and convenient way of saving your secret phrase in a file, thats all, you still need to back it up somewhere save.<br><br>',
                  'To make life easier MofoWallet can not only store keys in a wallet, it can also read them from a wallet you provide.<br><br>',
                  'Add this account to your dashboard if you don\'t want to see this dialog.</p>']
      html = $sce.getTrustedHtml(html.join(''));
      plugins.get('alerts').confirm({ html: html }).then(
        function (confirmed) {
          deferred.resolve(confirmed);
        }
      );
      return deferred.promise;
    }
  });

  /* Register modal dialogs */
  modals.register('walletManager', { 
    templateUrl: 'plugins/wallet/partials/wallet-manager-modal.html', 
    controller: 'WalletManagerModalController' 
  });
  modals.register('walletPassword', { 
    templateUrl: 'plugins/wallet/partials/wallet-password-modal.html', 
    controller: 'WalletPasswordModalController' 
  });
  modals.register('walletOpen', { 
    templateUrl: 'plugins/wallet/partials/wallet-open-modal.html', 
    controller: 'WalletOpenModalController' 
  });
  modals.register('walletSave', { 
    templateUrl: 'plugins/wallet/partials/wallet-save-modal.html', 
    controller: 'WalletSaveModalController' 
  }); 

  /** 
   * Called from <input type="file" onchange="onWalletFileSelected(event)">
   * Prompts the user for a password, then decrypts the wallet.
   * You can register 
   */
  window.onWalletFileSelected = function (event) {
    gWallet     = null;
    gPassword   = null;
    gFile       = null;

    var selectedFile = event.target.files[0];
    var reader    = new FileReader();
    reader.onload = function(event) {
      var cipherText = event.target.result;
      promptForPassword(selectedFile, cipherText).then(
        function (password) {
          try {
            var text    = decrypt(password, cipherText);
            gWallet     = removePadding(JSON.parse(text));
            gPassword   = password;
            gFile       = selectedFile;

            /* Add all entries in the wallet to the accounts database */
            db.accounts.toArray().then(
              function (accounts) {
                var map = {};
                angular.forEach(accounts, function (a) { map[a.id_rs] = a} );

                db.transaction('rw', db.accounts, function () {
                  angular.forEach(gWallet, function (entry) {
                    if (!(entry.id_rs in map)) {
                      db.accounts.put({ 
                        id_rs: entry.id_rs, 
                        name: entry.name,
                        engine: nxt.get(entry.id_rs).type 
                      });
                    }
                  });
                });
              }
            );

            if (gDeferred) {
              gDeferred.resolve({password: password, file: selectedFile});
              gDeferred = null;
            }
          } 
          catch (e) {
            console.log('unlockWallet', e, e.stack);
            if (gDeferred) {
              gDeferred.reject();
              gDeferred = null;
            }
          }
        }
      ); 
    };
    reader.onerror = function (event) {
      if (gDeferred) {
        gDeferred.reject();
        gDeferred = null;
      }
    };
    reader.onabort = function (event) {
      if (gDeferred) {
        gDeferred.reject();
        gDeferred = null;
      }
    };
    reader.readAsText(selectedFile);    
  }

  function promptForPassword(file, cipherText) {
    var deferred = $q.defer();
    modals.open('walletPassword', {
      resolve: {
        items: function () {
          return {
            password: '',
            file: file,
            isPasswordCorrect: function (password) {
              try {                  
                decrypt(password, cipherText);
                return true;
              } 
              catch (e) {
                return false;
              }
            }
          };
        }
      },
      close: function (items) {
        deferred.resolve(items.password);
      },
      cancel: function () {
        deferred.reject();
      }
    });
    return deferred.promise;
  }

  /* Shows a modal with a `Open wallet` button once the user selected a wallet file he/she
     will be prompted for a password. If the decryption happens successfully the returned
     promise resolve is called otherwise reject is called.
     In the promise resolve the user can expect the wallet to be opened and decrypted. */
  function promptForWallet() {
    var deferred = $q.defer();
    modals.open('walletOpen', {
      resolve: {
        items: function () {
          return {};
        }
      },
      close: function () {
        deferred.resolve();
      },
      cancel: function () {
        deferred.reject();
      }
    });
    return deferred.promise;    
  }

  function saveWallet(file, password) {
    var deferred = $q.defer();
    modals.open('walletSave', {
      resolve: {
        items: function () {
          return {
            password: password || '',
            file:     file || ''
          };
        }
      },
      close: function (items) {
        deferred.resolve(items);
      },
      cancel: function () {
        deferred.reject();
      }
    });
    return deferred.promise;    
  }

  function _getEntry(id_rs) {
    if (gWallet && gWallet[id_rs]) {
      return gWallet[id_rs];
    }
    else if (gMemoryWallet && gMemoryWallet[id_rs]) {
      return gMemoryWallet[id_rs];
    }
    return null;
  }

});

var config   = {
  name:         String,
  id_rs:        String,
  secretPhrase: String
};
var configCount = Object.keys(config).length;

function validateEntry(entry) {
  var count = 0;
  for (var name in entry) {
    if (name in config) {
      if (new Object(entry[name]) instanceof config[name] && entry[name] !== undefined) {
        count++;
        continue;
      }
    }
    console.log('wallet.validateEntry Invalid entry for '+name, entry);
    return false;
  }
  return count == configCount;
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
    return JSON.stringify(jsonObj, undefined, 2);
  },

  parse: function (jsonStr) {
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

function addPadding(obj) {
  obj = angular.copy(obj);
  obj.padding = new Array(20000).join('ABCD');
  return obj;
}

function removePadding(obj) {
  delete obj.padding;
  return angular.copy(obj);
}

})();