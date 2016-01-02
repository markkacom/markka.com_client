// set account info
(function () {
'use strict';
var module = angular.module('fim.base');
module.run(function (plugins, modals, $q, $rootScope, nxt) {
  
  var plugin = plugins.get('transaction');

  /**
   * Account identifiers can be set for your own account. But only 'standard' ids can 
   * can be set just like that. These involve names that end with @fimk.fi you can 
   * either assign that name to your account. Or if you prefer get a secret
   * that another account can use to assign that name to your account.
   *
   * If you want a 'non-standard' name that ends in something else then @fimk.fi you
   * need to provide the secret to an verification authority. The verification authority 
   * will verify that the email address you provide actually belongs to you and if it
   * does provide you with a secret that you must provide when registering the
   * identifier for your account.
   */

  var lazy_lookup_identifier = function (api, field) {
    api.engine.socket().callAPIFunction({requestType:'getAccountByIdentifier',identifier: field.value,
        includeLessors:'false',includeAssets:'false',includeCurrencies:'false'}).then(
      function (data) {
        field.$evalAsync(function () {
          if (data.errorDescription == 'Unknown identifier') {
            field.warnMsg = 'Available'
          }
          else {
            field.errorMsg = 'Unavailable';
          }
        });
      }
    );
  }.debounce(500);

  /**
   * Set a standard identifier for your own account.
   * Identifier must end with @fimk.fi.
   **/
  plugin.add({
    id: 'setStandardAccountIdentifier',
    execute: function (args) {
      args = args||{};
      var api = nxt.get($rootScope.currentAccount.id_rs);
      return plugin.create(angular.extend(args, {
        title: 'Set Account Name',
        message: 'Standard names must end with <i>@fimk.fi</i>',
        requestType: 'setAccountIdentifier',
        createArguments: function (items) {
          return {
            name: items.name,
            description: items.description||""
          }
        },
        fields: [
          plugin.fields('text').create('identifier', { label: 'Name', required: true, 
            validate: function (text, fields) {
              this.warnMsg = null;
              this.errorMsg = null;
              if (text) {
                if (plugin.getByteLen(text) > 100) throw 'To much characters';
                if (!/^[^@]+@fimk.fi$/.test(this.value)) throw 'Standard name must end with @fimk.fi';
                lazy_lookup_identifier(api, this);
              }
            }
          })
        ]
      }))
    }
  });

  /**
   * Set an account identifier for another account.
   */

  /**
   * Create a custom name request 
   **/
  plugin.add({
    id: 'setStandardAccountIdentifier',
    execute: function (args) {
      args = args||{};
      var api = nxt.get($rootScope.currentAccount.id_rs);
      return plugin.create(angular.extend(args, {
        title: 'Set Account Name',
        message: null,
        requestType: 'setAccountIdentifier',
        createArguments: function (items) {
          return {
            name: items.name,
            description: items.description||""
          }
        },
        fields: [
          plugin.fields('text').create('identifier', { label: 'Name', required: true, 
            validate: function (text, fields) {
              this.warnMsg = null;
              this.errorMsg = null;
              if (text) {
                if (plugin.getByteLen(text) > 100) throw 'To much characters';
                if (!/^[^@]+@fimk.fi$/.test(this.value)) throw 'Standard name must end with @fimk.fi';
                lazy_lookup_identifier(api, this);
              }
            }
          }),
          plugin.fields('checkbox').create('showAuthorizationRequest', { value: false, label: 'Request free account name (names cost 0.1 FIM)', 
            onchange: function (fields) {
              fields.authorizationRequest.hide = !this.value;
              fields.authorizationRequestMsg.hide = !this.value;
            }
          }),
          plugin.fields('static').create('authorizationRequestMsg', { hide: true, 
            value: 'Hello <b>world</b><br>How are you?'
          }),
          plugin.fields('textarea').create('authorizationRequest', { label: 'Authorization request', hide: true })
        ]
      }))
    }
  });





  // plugin.add({
  //   id: 'setAccountIdentifier',
  //   execute: function (args) {
  //     args = args||{};
  //     var api = nxt.get($rootScope.currentAccount.id_rs);
  //     var lazy_lookup_identifier = function (field) {
  //       api.engine.socket().callAPIFunction({requestType:'getAccountByIdentifier',identifier:field.value,
  //           includeLessors:'false',includeAssets:'false',includeCurrencies:'false'}).then(
  //         function (data) {
  //           field.$evalAsync(function () {
  //             if (data.errorDescription == 'Unknown identifier') {
  //               field.warnMsg = 'Available'
  //             }
  //             else {
  //               field.errorMsg = 'Unavailable';
  //             }
  //           });
  //         }
  //       );
  //     }.debounce(500);
  //     return plugin.create(angular.extend(args, {
  //       title: 'Set Account Name',
  //       message: null,
  //       requestType: 'setAccountIdentifier',
  //       createArguments: function (items) {
  //         return {
  //           name: items.name,
  //           description: items.description||""
  //         }
  //       },
  //       fields: [
  //         plugin.fields('text').create('identifier', { label: 'Name', required: true, 
  //           validate: function (text, fields) {
  //             this.warnMsg = null;
  //             this.errorMsg = null;
  //             if (text) {
  //               if (plugin.getByteLen(text) > 100) throw 'To much characters';
  //               if (fields.useStandardName.value) {
  //                 if (!/^[^@]+@fimk.fi$/.test(this.value)) throw 'Standard name must end with @fimk.fi';
  //               }
  //               else {
  //                 if (/^[^@]+@fimk.fi$/.test(this.value)) throw 'Custom name cannot end with @fimk.fi';
  //                 if (text.indexOf('@')==-1) throw 'Name must be a valid email address';
  //               }
  //               lazy_lookup_identifier(this);
  //             }
  //           }
  //         }),
  //         plugin.fields('checkbox').create('useStandardName', { value: true, label: 'Use standard @fimk.fi name (unselect for custom name)', 
  //           onchange: function (fields) {
  //             fields.identifier.changed();
  //             fields.authorizationRequest.hide = true;
  //             fields.authorizationResponse.hide = true;
  //             fields.nameIsAuthorized.hide = true;

  //             fields.nameIsAuthorized.value = false;
  //             fields.authorizationRequest.value = null;

  //             if (!this.value) {
  //               fields.nameIsAuthorized.hide = false;
  //             }
  //             fields.nameIsAuthorized.changed();
  //           }
  //         }),
  //         plugin.fields('checkbox').create('nameIsAuthorized', { value: true, label: 'I have an authorization for this name', hide: true, 
  //           onchange: function (fields) {
  //             fields.authorizationRequest.hide = true;
  //             fields.authorizationResponse.hide = true;

  //             if (this.value) {
  //               fields.authorizationResponse.hide = false;
  //               fields.authorizationRequest.value = null;
  //             }
  //             else {
  //               fields.authorizationRequest.hide = false;
  //             }
  //           }
  //         }),
  //         plugin.fields('textarea').create('authorizationRequest', { label: 'Authorization request', hide: true }),
  //         plugin.fields('textarea').create('authorizationResponse', { label: 'Authorization response', hide: true })
  //       ]
  //     }));
  //   }
  // });

  plugin.add({
    label: 'Set account identifier',
    id: 'setAccountIdentifierXXX',
    execute: function (args) {
      args = args||{};
      return plugin.create(angular.extend(args, {
        title: 'Set account identifier',
        message: 'Set an account identifier',
        requestType: 'setAccountIdentifier',
        canHaveRecipient: true,
        editRecipient: true,
        recipient: $rootScope.currentAccount.id_rs,
        createArguments: function (items) {
          return { 
            recipient: nxt.util.convertRSAddress(items.recipient),
            identifier: items.identifier, // String
            signatory: items.signatory ? nxt.util.convertRSAddress(items.signatory) : '0', // numeric address
            signature: items.signature||"" // hex string
          }
        },
        fields: [{
          label: 'Identifier',
          name: 'identifier',
          type: 'text',
          value: args.identifier||'',
          validate: function (text) { 
            this.errorMsg = null;
            if (!text) { this.errorMsg = null; }
            else {
              if (plugin.getByteLen(text) > 100) { this.errorMsg = 'To much characters'; }
              else if (text.indexOf('@')==-1) { this.errorMsg = 'Invalid email address'; }
            }
            return ! this.errorMsg;
          },
          required: false
        }, {
          label: 'Signatory',
          name: 'signatory',
          type: 'text',
          value: args.signatory||'',
          validate: function (text) { 
            this.errorMsg = null;
            if (!text) { this.errorMsg = null; }
            else {
              if (!plugins.get('transaction').validators.address(text)) { this.errorMsg = 'Invalid address'; }
            }
            return ! this.errorMsg;
          },
          required: false
        }, {
          label: 'Signature',
          name: 'signature',
          type: 'textarea',
          value: args.signature||'',
          validate: function (text) { 
            this.errorMsg = null;
            if (!text) { this.errorMsg = null; }
            else {
              if (plugin.getByteLen(text) > 1000) { this.errorMsg = 'To much characters'; }
            }
            return ! this.errorMsg;
          },
          required: false
        }]
      }));
    }
  });

  plugin.add({
    label: 'Set verification authority',
    id: 'setVerificationAuthority',
    execute: function (args) {
      args = args||{};
      return plugin.create(angular.extend(args, {
        title: 'Set verification authority',
        message: 'Set verification authority',
        requestType: 'setVerificationAuthority',
        canHaveRecipient: true,
        editRecipient: true,
        createArguments: function (items) {
          return { 
            recipient: nxt.util.convertRSAddress(items.recipient),
            period: parseInt(items.period)
          }
        },
        fields: [{
          label: 'Period (between 1 and 100000)',
          name: 'period',
          type: 'text',
          value: args.period||'100000',
          required: false
        }]
      }));
    }
  });

  plugin.add({
    label: 'Request free account identifier',
    id: 'requestFreeAccountIdentifier',
    execute: function (args) {
      args = args||{};
      return plugin.create(angular.extend(args, {
        title: 'Request free account identifier',
        message: 'Request free account identifier',
        onclose: function (items) {
          var deferred = $q.defer();
          modals.open('account-identifier', {
            resolve: {
              items: function () { 
                return {
                  identifier: items.identifier,
                  signatory: $rootScope.currentAccount.id_rs,
                  signature: nxt.util.sign(items.identifier, $rootScope.currentAccount.secretPhrase)
                }; 
              }
            },
            close: function (ok) {
              ok ? deferred.resolve() : deferred.reject();
            }
          });
          return deferred.promise;
        },
        fields: [{
          label: 'Identifier',
          name: 'identifier',
          type: 'text',
          value: args.identifier||'',
          validate: function (text) { 
            this.errorMsg = null;
            if (!text) { this.errorMsg = null; }
            else {
              if (plugin.getByteLen(text) > 100) { this.errorMsg = 'To much characters'; }
              else if (text.indexOf('@')==-1) { this.errorMsg = 'Invalid email address'; }
            }
            return ! this.errorMsg;
          },
          required: false
        }]
      }));
    }
  });
});
})();