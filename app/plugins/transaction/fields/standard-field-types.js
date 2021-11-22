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
module.run(function (plugins, $q, $rootScope, $templateCache, $translate, nxt) {

  var plugin = plugins.get('transaction');

  /**
   * Arguments can be given either as a literal (string, boolean, number),
   * as a Promise, as a Function that returns a literal (meaning not a Promise)
   * or a function that returns a Promise.
   */
  function evalSetFieldData(target, name, value, $scope) {
    if (typeof value == 'function') {
      value = value.call(target);
    }
    if (value && typeof value == 'object' && typeof value.then == 'function') {
      $q.when(value).then(function (_val) {
        $scope.$evalAsync(function () {
          target[name] = value;
        })
      });
    }
    else {
      target[name] = value;
    }
  }

  /**
   * Base field from which all other fields are derived.
   * The opts for this field type apply for all other fields.
   *
   * Available options:
   *
   *  - label (Literal||Function||Promise)
   *    The label above the field
   *
   *  - value (Literal||Function||Promise)
   *    The field value
   *
   *  - required (Boolean||Function||Promise)
   *    If the field is required to have a value and be "valid"
   *
   *  - readonly (Boolean||Function||Promise)
   *    The field is read only
   *
   *  - validate (Function(text))
   *    Function that validates the field value, must throw a String
   *    which will become the error message.
   *
   *    function validate (text, fields) {
   *      if (text != 'a') {
   *        throw "Value must be 'a'";
   *      }
   *      // to access another field refer to 'fields' which holds all other field
   *      // value keyed by field name
   *      if (fields.password.value != text) {
   *        throw "Value is not equal to other field"
   *      }
   *    }
   *
   *  - watch (String space delimited)
   *    Name of other field(s) to observe, runs the validate function when a change to
   *    one of those fields is detected.
   *
   *    Usage: "watch: 'passwordConfirm userName'"
   *    Will watch both the passwordConfirm and userName fields and call validate when they change.
   *    Validate is always called when the field itself changes .
   *
   */
  function CreateStandardField(fieldName, opts) {
    var field = { name: fieldName };
    evalSetFieldData(field, 'label', opts.label, opts.$scope||$rootScope);
    evalSetFieldData(field, 'value', opts.value, opts.$scope||$rootScope);
    evalSetFieldData(field, 'required', opts.required, opts.$scope||$rootScope);
    evalSetFieldData(field, 'readonly', opts.readonly, opts.$scope||$rootScope);
    evalSetFieldData(field, 'hide', opts.hide, opts.$scope||$rootScope);
    evalSetFieldData(field, 'placeHolder', opts.placeHolder, opts.$scope||$rootScope);
    if (opts.validate) {
      if (typeof opts.validate != 'function') {
        throw new Error('validate option is not a function');
      }
      field.validate = function (text, items) {
        this.errorMsg = null;
        try {
          // only prepare and pass 'fields' arg if validate has 2 or more formal arguments.
          if (opts.validate.length > 1) {
            var fields = {};
            items.fields.forEach(function (f) { fields[f.name] = f });
            opts.validate.call(this, text, fields);
          }
          else {
            opts.validate.call(this, text);
          }
          return true;
        }
        catch (ex) {
          if (typeof ex != 'string') throw ex;
          this.errorMsg = ex;
        }
      }
      if (angular.isString(opts.watch)) {
        field.watch = ['f.value'].concat(
          opts.watch.trim().split(/\s+/).map(
            function (n) {
              return (n == fieldName) ? '' : 'items.fields_map.'+n+'.value'
            }
          )
        );
      }
      else {
        field.watch = 'f.value';
      }
      console.log('Field watch value: %s', field.watch);
    }
    field.onchange = function (items) {
      if (typeof opts.onchange == 'function') {
        // only prepare and pass 'fields' arg if onchange has a formal argument.
        if (opts.onchange.length > 0) {
          var fields = {};
          items.fields.forEach(function (f) { fields[f.name] = f });
          opts.onchange.call(this, fields);
        }
        else {
          opts.onchange.call(this);
        }
      }
    }
    field.changed = function (no_validate) {
      if (!no_validate) {
        this.validate(this.value, this.getScopeItems());
      }
      this.onchange(this.getScopeItems());
    }
    field.initialize = function (items) {
      if (typeof opts.initialize == 'function') {
        // only prepare and pass 'fields' arg if onchange has a formal argument.
        if (opts.initialize.length > 0) {
          var fields = {};
          items.fields.forEach(function (f) { fields[f.name] = f });
          opts.initialize.call(this, fields);
        }
        else {
          opts.initialize.call(this);
        }
      }
    }
    return field;
  }

  /**
   * Creates a static text field
   * @inherits from CreateStandardField
   *
   * Usage:
   * plugin.fields('static').create('nameOfField')
   *
   * The value is treated as HTML.
   */
  plugin.addField('static', {
    create: function (fieldName, opts) {
      var field  = CreateStandardField(fieldName, opts);
      field.type = 'static';
      return field;
    }
  });

  /**
   * Creates an input type=text
   * @inherits from CreateStandardField
   *
   * Usage:
   * plugin.fields('text').create('nameOfField', {})
   */
  plugin.addField('text', {
    create: function (fieldName, opts) {
      var field  = CreateStandardField(fieldName, opts);
      field.type = 'input';
      return field;
    }
  });

  /**
   * Creates an input type=text money
   * @inherits from CreateStandardField
   *
   * Usage:
   * plugin.fields('money').create('nameOfField', {})
   *
   * Required Arguments:
   *
   * - precision (Number)
   */
  plugin.addField('money', {
    create: function (fieldName, opts) {
      var custom_validate = opts.validate;
      opts.validate = function (text) {
        if (typeof custom_validate == 'function') {
          custom_validate.call(this,text);
        }
        if (text) {
          var regexp = this.precision == 0 ? new RegExp('^\\d+$') : new RegExp('^\\d+(\\.)?(\\d{1,'+this.precision+'})?$');
          if (!regexp.test(text)) {
            if (this.precision == 0 && new RegExp('\\.').test(text)) throw 'No decimals places allowed';
            else if (new RegExp('^\\d+\\.\\d{9,}$').test(text)) throw 'Only '+this.precision+' decimals allowed';
            else throw 'Allowed format is 12.345';
          }
        }
      }
      var field  = CreateStandardField(fieldName, opts);
      field.type = 'text';
      field.precision = angular.isDefined(opts.precision) ? parseInt(opts.precision) : 0;
      return field;
    }
  });

  /**
   * Creates a textarea
   * @inherits from CreateStandardField
   *
   * Usage:
   * plugin.fields('textarea').create('nameOfField', {})
   */
  plugin.addField('textarea', {
    create: function (fieldName, opts) {
      var field  = CreateStandardField(fieldName, opts);
      field.type = 'textarea-v2';
      return field;
    }
  });

  /**
   * Creates an input type=text
   * @inherits from CreateStandardField
   *
   * Usage:
   * plugin.fields('password').create('nameOfField', {})
   */
  plugin.addField('password', {
    create: function (fieldName, opts) {
      var field  = CreateStandardField(fieldName, opts);
      field.type = 'input';
      field.inputType = 'password';
      return field;
    }
  });

  /**
   * Creates an input type=radio
   * @inherits from CreateStandardField
   *
   * Usage:
   * plugin.fields('radio').create('nameOfField', {
   *    options: Array[ {label: String, value: Literal} ]
   * })
   */
  plugin.addField('radio', {
    create: function (fieldName, opts) {
      var field  = CreateStandardField(fieldName, opts);
      field.type = 'radio-v2';
      evalSetFieldData(field, 'options', opts.options, opts.$scope||$rootScope);
      return field;
    }
  });

  /**
   * Creates an input type=checkbox
   * @inherits from CreateStandardField
   * Value is either true or valse
   *
   * Usage:
   * plugin.fields('checkbox').create('nameOfField')
   */
  plugin.addField('checkbox', {
    create: function (fieldName, opts) {
      var field  = CreateStandardField(fieldName, opts);
      field.type = 'checkbox';
      field.inline_label = field.label;
      delete field.label;
      return field;
    }
  });

  /**
   * Creates a hidden field
   * @inherits from CreateStandardField
   *
   * Usage:
   * plugin.fields('hidden').create('nameOfField')
   */
  plugin.addField('hidden', {
    create: function (fieldName, opts) {
      var field  = CreateStandardField(fieldName, opts);
      field.type = 'hidden';
      field.hide = true;
      return field;
    }
  });

  /**
   * Creates a standard autocomplete field.
   * @inherits from CreateStandardField
   *
   * Usage:
   * plugins.fields('autocomplete').create('nameOfField', {
   *    template: [
   *       '<a class="monospace">',
   *          '<span class="font-bold" ng-bind="match.model.label"></span>&nbsp;&nbsp;',
   *          '<span class="pull-right" ng-bind="match.model.value"></span>',
   *       '</a>'
   *    ].join(''),
   *    templateURL: String||Function||Promise,
   *    getResults: Function(text) {
   *        @returns Promise(array)
   *    }
   * });
   *
   * Other arguments:
   *
   *  - templateURL (String||Function||Promise)
   *    URL matching either a real file url or an entry in $templateCache
   *
   *  - template (String)
   *    Alternative to templateURL where you provide the template content
   *    as string (HTML). The ID used to store in $templateCache is created
   *    from the field name.
   *
   *  - getResults (Function(text))
   *    Function that receives the input element value
   *
   *  - wait (Literal)
   *    Minimal wait time after last character typed before typeahead kicks-in
   */
  plugin.addField('autocomplete', {
    create: function (fieldName, opts) {
      var field  = CreateStandardField(fieldName, opts);
      field.type = 'autocomplete';
      evalSetFieldData(field, 'templateURL', opts.templateURL, opts.$scope||$rootScope);
      if (opts.template) {
        field.templateURL = fieldName+'-auto-generated-template.html';
        $templateCache.put(field.templateURL, opts.template);
      }
      if (typeof opts.getResults != 'function') {
        throw new Error('getResults is missing or not a function');
      }
      field.wait = opts.wait||0;
      field.getResults = opts.getResults;
      return field;
    }
  });

  /**
   * Generic account field.
   * @inherits from CreateStandardField
   *
   * Required arguments:
   *
   *  - api (either nxt.nxt() or nxt.fim())
   *
   * Optionsl arguuments:
   *
   *  - accountColorId (String)
   *    Limits results to accounts from the same account color
   */
  plugin.addField('account', {
    create: function (name, opts) {
      var scope = opts.$scope||$rootScope;
      var format_account_label = function (data) {
        return ['<a href="#/accounts/',data.accountRS,'/activity/latest" target="_blank">',data.accountName||data.accountRS,'</a>'].join('');
      };
      var lazy_lookup_account = debounce(
        function (field) {
          scope.$evalAsync(function () {
            field.warnMsg  = null;
            field.__label  = '';
          });
          opts.api.engine.socket().callAPIFunction({ requestType: 'getAccount', account: field.value }).then(
            function (data) {
              scope.$evalAsync(function () {
                if (data.errorDescription=='Unknown account') {
                  field.warnMsg = 'Account does not exist';
                  return;
                }
                if (!angular.isString(data.publicKey)) {
                  field.warnMsg = 'Account has no publickey';
                }
                field.__label = format_account_label(data);
              });
            }
          );
        },
      500);
      var field = plugin.fields('autocomplete').create(name, angular.extend(opts, {
        wait: 500,
        label: opts.label,
        template: [
          '<a class="monospace">',
            '<span class="font-bold" ng-bind="match.model.label||match.model.value"></span>&nbsp;&nbsp;',
            '<span ng-if="match.model.label!=match.model.value" class="pull-right" ng-bind="match.model.value"></span>',
          '</a>'
        ].join(''),
        validate: function (text) {
          if (text && !opts.api.createAddress().set(text)) {
            throw "Invalid "+opts.api.engine.symbol+" address";
          }
          if (text) {
            lazy_lookup_account(this);
          }
        },
        getResults: function (query) {
          var deferred = $q.defer();
          // if query starts with FIM- or NXT- remove that part
          // since the indexer does not use the FIM- or NXT- prefix
          query = (query||"").toLowerCase();
          var regexp = opts.api.engine.type == nxt.TYPE_NXT ? (/^FIM-/) : (/^NXT-/);
          if (query.indexOf(regexp)==0) {
            query = query.replace(regexp,'');
          }
          var args = {
            requestType: 'searchAccountIdentifiers',
            query: query,
            firstIndex: 0,
            lastIndex: 15
          };
          if (opts.accountColorId && opts.accountColorId != '0') {
            args.accountColorId = opts.accountColorId;
          }
          opts.api.engine.socket().callAPIFunction(args).then(
            function (data) {
              var accounts = data.accounts||[];
              if (accounts.length == 1 &&
                  accounts[0].accountEmail == accounts[0].accountRS &&
                  accounts[0].accountEmail == query) {
                deferred.resolve([]);
              }
              else {
                deferred.resolve(accounts.map(
                  function (obj) {
                    var v = {
                      label: obj.accountEmail,
                      value: obj.accountRS
                    };
                    if ("FIM-"+v.label==v.value || "NXT-"+v.label==v.value) {
                      v.label = v.value;
                    }
                    return v;
                  }
                ));
              }
            },
            deferred.reject
          );
          return deferred.promise;
        }
      }));
      return field;
    }
  });

  /**
   * Generic asset field.
   * @inherits from CreateStandardField
   *
   * Required arguments:
   *
   *  - api (either nxt.nxt() or nxt.fim())
   *
   * Optional arguments:
   *
   *  - account (String||Function||Promise)
   *    Limits results to assets owned by this account
   *
   * Extra methods/properties:
   *
   *  - asset (Object)
   *    Where "value" will contain the asset identtifier, the asset
   *    property contains the full JSONData.asset response.
   */
  plugin.addField('asset', {
    create: function (name, opts) {
      var scope = opts.$scope||$rootScope;
      var format_asset_label = function (data) {
        return [
          '<a class="font-bold" href="#/assets/',opts.api.engine.symbol_lower,'/13664938383416975974/trade" target="_blank">',data.name,'</a> (',
          '<a href="#/accounts/',data.accountRS,'/activity/latest" target="_blank">',data.accountName||data.accountRS,'</a>)'
        ].join('');
      };
      var lazy_lookup_asset = debounce(
        function (field) {
          field.asset = null;
          scope.$evalAsync(function () {
            field.errorMsg = null;
            field.__label  = '';
          });
          opts.api.engine.socket().callAPIFunction({ requestType: 'getAsset', asset: field.value }).then(
            function (data) {
              scope.$evalAsync(function () {
                if (data.asset == field.value) {
                  field.asset = data;
                  field.__label = format_asset_label(data);
                }
                else {
                  field.errorMsg = 'Asset does not exist';
                }
                field.changed(true);
              });
            }
          );
        },
      500);
      // load and remember all assets owned by account
      var account_assets_promise = null;
      var get_account_assets = function (account) {
        if (account_assets_promise) {
          return account_assets_promise;
        }
        var deferred = $q.defer();
        opts.api.engine.socket().callAPIFunction({requestType:'getAccountAssets',account:account}).then(deferred.resolve);
        return account_assets_promise = deferred.promise;
      };
      var field = plugin.fields('autocomplete').create(name, angular.extend(opts, {
        wait: 500,
        label: opts.label,
        template: [
          '<a class="monospace">',
            '<span class="font-bold">{{match.model.value + "&nbsp;" + match.model.name}}</span>&nbsp;&nbsp;',
            '<span class="pull-right" ng-bind="match.model.accountName||match.model.accountRS"></span>',
          '</a>'
        ].join(''),
        validate: function (text) {
          if (text && !/\d+/.test) {
            throw "Not a valid asset identifier";
          }
          if (text) {
            lazy_lookup_asset(this);
          }
        },
        getResults: function (query) {
          var deferred = $q.defer();
          var promise;
          if (opts.account) {
            promise = get_account_assets(opts.account);
          }
          else {
            promise = opts.api.engine.socket().callAPIFunction({
              requestType: 'searchAssets',
              query: 'NAME:'+query+'*',
              firstIndex: 0,
              lastIndex: 15
            });
          }
          promise.then(
            function (data) {
              var assets = data.assets||data.accountAssets||[];
              deferred.resolve(assets.map(
                function (d) {
                  return {
                    value: d.asset,
                    name: d.name,
                    accountName: d.accountName,
                    accountRS: d.accountRS
                  };
                }
              ));
            }
          );
          return deferred.promise;
        }
      }));
      return field;
    }
  });

  /**
   * Generic marketplace field.
   * @inherits from CreateStandardField
   *
   * Required arguments:
   *
   *  - api (either nxt.nxt() or nxt.fim())
   *
   * Optional arguments:
   *
   *  - account (String||Function||Promise)
   *    Limits results to items owned by this account
   */
  plugin.addField('goods', {
    create: function (name, opts) {
      var scope = opts.$scope || $rootScope;
      var format_goods_label = function (data) {
        return [
          '<a class="font-bold" href="#/goods/', opts.api.engine.symbol_lower, '/" target="_blank">', data.name, '</a> (',
          '<a href="#/accounts/', data.accountRS, '/activity/latest" target="_blank">', data.accountName || data.accountRS, '</a>)'
        ].join('');
      };
      var lazy_lookup_goods = debounce(
        function (field) {
          field.goods = null;
          scope.$evalAsync(function () {
            field.errorMsg = null;
            field.__label = '';
          });
          opts.api.engine.socket().callAPIFunction({requestType: 'getDGSGood', goods: field.value}).then(
            function (data) {
              scope.$evalAsync(function () {
                if (data.goods == field.value) {
                  field.goods = data;
                  field.__label = format_goods_label(data);
                } else {
                  field.errorMsg = 'Goods does not exist';
                }
                field.changed(true);
              });
            }
          );
        },
        500);
      var account_goods_promise = null;
      var get_account_goods = function (account) {
        if (account_goods_promise) {
          return account_goods_promise;
        }
        var deferred = $q.defer();
        opts.api.engine.socket().callAPIFunction({
          requestType: 'getDGSGoods',
          seller: account
        }).then(deferred.resolve);
        return account_goods_promise = deferred.promise;
      };
      var field = plugin.fields('autocomplete').create(name, angular.extend(opts, {
        wait: 500,
        label: opts.label,
        template: [
          '<a class="monospace">',
          '<span class="font-bold">{{match.model.value + "&nbsp;" + match.model.name}}</span>&nbsp;&nbsp;',
          '<span class="pull-right" ng-bind="match.model.accountName||match.model.accountRS"></span>',
          '</a>'
        ].join(''),
        validate: function (text) {
          if (text && !/\d+/.test) {
            throw "Not a valid goods identifier";
          }
          if (text) {
            lazy_lookup_goods(this);
          }
        },
        getResults: function (query) {
          var deferred = $q.defer();
          var promise;
          if (opts.account) {
            promise = get_account_goods(opts.account);
          } else {
            promise = opts.api.engine.socket().callAPIFunction({
              requestType: 'searchDGSGoods',
              query: 'NAME:' + query + '*',
              firstIndex: 0,
              lastIndex: 15
            });
          }
          promise.then(
            function (data) {
              var goods = data.goods || data.accountGoods || [];
              deferred.resolve(goods.map(
                function (d) {
                  return {
                    value: d.goods,
                    name: d.name,
                    accountName: d.seller,
                    accountRS: d.sellerRS
                  };
                }
              ));
            }
          );
          return deferred.promise;
        }
      }));
      return field;
    }
  });

  /**
   * Generic alias field.
   * @inherits from CreateStandardField
   *
   * Required arguments:
   *
   *  - api (either nxt.nxt() or nxt.fim())
   *
   * Optional arguments:
   *
   *  - account (String||Function||Promise)
   *    Limits results to aliases owned by this account
   *
   * Extra methods/properties:
   *
   *  - alias (Object)
   *    Where "value" will contain the aliasName property, the alias
   *    property contains the full JSONData.alias response.
   *
   */
  plugin.addField('alias', {
    create: function (name, opts) {
      var scope = opts.$scope||$rootScope;
      var format_alias_label = function (data) {
        return ['<a href="#/accounts/',data.accountRS,'/activity/latest" target="_blank">',data.accountName||data.accountRS,'</a>'].join('')
      };
      var lazy_lookup_alias = debounce(
        function (field) {
          field.alias = null;
          scope.$evalAsync(function () {
            field.warnMsg = null;
            field.__label  = '';
          });
          opts.api.engine.socket().callAPIFunction({ requestType: 'getAlias', aliasName: field.value }).then(
            function (data) {
              scope.$evalAsync(function () {
                if (angular.isString(data.alias)) {
                  field.alias   = data;
                  field.warnMsg = 'Alias exists';
                  field.__label = format_alias_label(data);
                }
                else {
                  field.warnMsg = 'Alias available';
                }
              });
            }
          );
        },
      500);
      var field = plugin.fields('autocomplete').create(name, angular.extend(opts, {
        wait: 500,
        label: opts.label,
        template: [
          '<a class="monospace">',
            '<span class="font-bold">{{match.model.aliasName}}</span>&nbsp;&nbsp;',
            '<span class="pull-right" ng-bind="match.model.aliasURI"></span>',
          '</a>'
        ].join(''),
        validate: function (text) {
          if (text) {
            lazy_lookup_alias(this);
          }
        },
        getResults: function (query) {
          var deferred = $q.defer();
          if (query.length < 2) {
            deferred.resolve(null);
          }
          else {
            var args = {
              requestType: 'getAliasesLike',
              aliasPrefix: query,
              firstIndex: 0,
              lastIndex: 15
            };
            if (opts.account) {
              args.account = opts.account;
            }
            opts.api.engine.socket().callAPIFunction(args).then(
              function (data) {
                var aliases = data.aliases||[];
                deferred.resolve(aliases.map(
                  function (d) {
                    d.value = d.aliasName;
                    return d;
                  }
                ));
              }
            );
          }
          return deferred.promise;
        }
      }));
      return field;
    }
  });

  /**
   * Generic namespaced-alias field.
   * @inherits from CreateStandardField
   *
   * Required arguments:
   *
   *  - api (either nxt.nxt() or nxt.fim())
   *
   *  - account (String||Function||Promise)
   *    Default is current logged in account
   *
   * Extra methods/properties:
   *
   *  - alias (Object)
   *    Where "value" will contain the aliasName property, the alias
   *    property contains the full JSONData.alias response.
   *
   */
  plugin.addField('namespaced-alias', {
    create: function (name, opts) {
      opts.account = opts.account || $rootScope.currentAccount.id_rs;
      var api = nxt.get(opts.account);
      if (api.engine.type != nxt.TYPE_FIM) {
        throw new Error('Namespaced aliases not supported on platform: '+api.engine.symbol);
      }
      var scope = opts.$scope||$rootScope;
      var lazy_lookup_alias = debounce(
        function (field) {
          field.alias = null;
          field.onchange(field.getScopeItems());
          scope.$evalAsync(function () {
            field.warnMsg = null;
            field.__label  = '';
          });
          if (field.value) {
            api.engine.socket().callAPIFunction({ requestType: 'getNamespacedAlias',
                                                  aliasName: field.value,
                                                  account: opts.account }).then(
              function (data) {
                scope.$evalAsync(function () {
                  if (angular.isString(data.alias)) {
                    field.alias   = data;
                    field.warnMsg = 'Last changed '+nxt.util.formatTimestamp(data.timestamp);
                    field.onchange(field.getScopeItems());
                  }
                  else {
                    field.warnMsg = 'Unused';
                  }
                });
              }
            );
          }
        },
      500);
      var field = plugin.fields('autocomplete').create(name, angular.extend(opts, {
        wait: 500,
        label: opts.label,
        template: [
          '<a class="monospace">',
            '<span class="font-bold">{{match.model.aliasName}}</span>&nbsp;&nbsp;',
            '<span class="pull-right" ng-bind="match.model.aliasURI"></span>',
          '</a>'
        ].join(''),
        validate: function (text) {
          lazy_lookup_alias(this);
        },
        getResults: function (query) {
          var deferred = $q.defer();
          var args = {
            requestType: 'getNamespacedAliases',
            account: opts.account,
            filter: query,
            firstIndex: 0,
            lastIndex: 15
          };
          api.engine.socket().callAPIFunction(args).then(
            function (data) {
              var aliases = data.aliases||[];
              deferred.resolve(aliases.map(
                function (d) {
                  d.value = d.aliasName;
                  return d;
                }
              ));
            }
          );
          return deferred.promise;
        }
      }));
      return field;
    }
  });

  /**
   * Generic account-color field.
   * @inherits from CreateStandardField
   *
   * Required arguments:
   *
   *  - api (either nxt.nxt() or nxt.fim())
   *
   *  - account (String||Function||Promise)
   *    Default is current logged in account
   *
   * Extra methods/properties:
   *
   *  - accountColor (Object)
   *    Where "value" will contain the accountColorId property, the accountColor
   *    property contains the full JSONData.accountColor response.
   *
   */
  plugin.addField('account-color', {
    create: function (name, opts) {
      opts = opts||{};
      opts.account = opts.account || $rootScope.currentAccount.id_rs;
      var api = nxt.get(opts.account);
      if (api.engine.type != nxt.TYPE_FIM) {
        throw new Error('Account colors not supported on platform: '+api.engine.symbol);
      }
      var scope = opts.$scope||$rootScope;
      var lazy_lookup_color = function (field) {
        field.accountColor = null;
        field.onchange(field.getScopeItems());
        scope.$evalAsync(function () {
          field.errorMsg = null;
          field.__label  = '';
        });
        if (field.value) {
          api.engine.socket().callAPIFunction({ requestType: 'accountColorGet', accountColorId: field.value }).then(
            function (data) {
              scope.$evalAsync(function () {
                if (data.errorDescription != 'Unknown accountColor') {
                  field.accountColor = data;
                  field.onchange(field.getScopeItems());
                  field.__label  = data.accountColorName;
                }
                else {
                  field.errorMsg = 'Not found';
                }
              });
            }
          );
        }
      }.debounce(500);
      var field = plugin.fields('autocomplete').create(name, angular.extend(opts, {
        wait: 500,
        label: opts.label,
        template: [
          '<a class="monospace">',
            '<span class="font-bold">{{match.model.accountColorName}}</span>&nbsp;&nbsp;',
            '<span class="pull-right" ng-bind="match.model.accountColorId"></span>',
          '</a>'
        ].join(''),
        validate: function (text) {
          lazy_lookup_color(this);
        },
        getResults: function (query) {
          var deferred = $q.defer();
          var args = {
            requestType: 'accountColorSearch',
            account: opts.account,
            name: query,
            firstIndex: 0,
            lastIndex: 15,
            includeAccountInfo: false,
            includeDescription: false
          };
          api.engine.socket().callAPIFunction(args).then(
            function (data) {
              var accountColors = data.accountColors||[];
              deferred.resolve(accountColors.map(
                function (d) {
                  d.value = d.accountColorId;
                  return d;
                }
              ));
            }
          );
          return deferred.promise;
        }
      }));
      return field;
    }
  });

});
})();
