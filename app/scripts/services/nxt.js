(function () {
'use strict';

var module = angular.module('fim.base');
module.factory('nxt', function ($rootScope, $modal, $http, $q, modals, i18n, db, 
  settings, $timeout, $sce, serverService, plugins, requests, $interval, 
  $translate, MofoSocket, Emoji) {

  var FAILED_RETRIES = 0;

  /* Register settings */
  settings.initialize([{
    id: 'nxt.localhost',
    value: 'http://127.0.0.1',
    type: String,
    label: 'localhost',
    resolve: function (value) {
      INSTANCE.nxt().engine.localhost = value;
    }
  }, {
    id: 'fim.localhost',
    value: 'http://127.0.0.1',
    type: String,
    label: 'localhost',
    resolve: function (value) {
      INSTANCE.fim().engine.localhost = value;
    }
  }]);

  var TYPE_FIM  = 'TYPE_FIM';
  var TYPE_NXT  = 'TYPE_NXT';

  /* This is the factory instance */
  var INSTANCE = {
    TYPE_FIM: TYPE_FIM,
    TYPE_NXT: TYPE_NXT,
    api: {},
    nxt: function () {
      return this.api[TYPE_NXT] || (this.api[TYPE_NXT] = new ServerAPI(TYPE_NXT, $rootScope.isTestnet));
    },
    fim: function () {
      return this.api[TYPE_FIM] || (this.api[TYPE_FIM] = new ServerAPI(TYPE_FIM, $rootScope.isTestnet));
    },
    get: function (arg) {
      if (arg == TYPE_NXT || arg.toUpperCase().indexOf('NXT')==0) {
        return this.nxt();
      }
      if (arg == TYPE_FIM || arg.toUpperCase().indexOf('FIM')==0) {
        return this.fim();
      }
      console.log('Could not determine engine', arg);
    },
    crypto: function (arg) {
      if (arg == TYPE_NXT || arg.toUpperCase().indexOf('NXT')==0) {
        return this.nxt().crypto;
      }
      if (arg == TYPE_FIM || arg.toUpperCase().indexOf('FIM')==0) {
        return this.fim().crypto;
      }
      console.log('Could not determine engine', arg);      
    }
  };

  function verifyEngineType(_type) {
    if (_type != TYPE_FIM && _type != TYPE_NXT) throw new Error('Unsupported engine type');
  }

  /**
   * @param _type Engine type 
   * @param _test Boolean for test network
   */
  function AbstractEngine(_type, _test) {
    verifyEngineType(_type);
    this.type      = _type;
    this.test      = _test;
    this.port      = _type == TYPE_FIM ? (_test ? 6986 : 7986) : (_test ? 6976 : 7976);
    this.net       = _test ? 'test' : 'main';
    this.blockTime = _type == TYPE_FIM ? 30 : 60;
    this.feeCost   = _type == TYPE_FIM ? 0.1 : 1;
    this.symbol    = _type == TYPE_FIM ? 'FIM' : 'NXT';
    this.symbol_lower = this.symbol.toLowerCase();

    if ($rootScope.TRADE_UI_ONLY) {
      this.symbol = 'EUR';
    }

    this.localhost = 'http://localhost';

    if (_type == TYPE_FIM) {
      if ($rootScope.forceLocalHost) {
        this.urlPool = new URLPool(this, [window.location.hostname||'localhost'], window.location.protocol == 'https:'); 
      }
      else if (_test) {
        this.urlPool = new URLPool(this, [/*'188.166.36.203',*/ '188.166.0.145'], false);
      }
      else {
        this.urlPool = new URLPool(this, ['cloud.mofowallet.org'], true);
      }
    }
    else if (_type == TYPE_NXT) {
      if ($rootScope.forceLocalHost) {
        this.urlPool = new URLPool(this, [window.location.hostname||'localhost'], window.location.protocol == 'https:'); 
      }
      else if (_test) {
        console.log('There are no nxt testnet servers');
      }
      else {
        this.urlPool = new URLPool(this, ['cloud.mofowallet.org'], true);
      }
    }
    else {
      throw new Error('?');
    }
  };
  AbstractEngine.prototype = {
    
    /* Blockheight constants */
    _constants: {
      TYPE_FIM: {
        test: {
          DIGITAL_GOODS_STORE_BLOCK: 19530,
          PUBLIC_KEY_ANNOUNCEMENT_BLOCK: 19530,
          NAMESPACED_ALIAS_BLOCK: 19530
        },
        main: {
          DIGITAL_GOODS_STORE_BLOCK: 200000,
          PUBLIC_KEY_ANNOUNCEMENT_BLOCK: 200000,
          NAMESPACED_ALIAS_BLOCK: 200000
        }
      },
      TYPE_NXT: {
        test: {
        },
        main: {
          DIGITAL_GOODS_STORE_BLOCK: 213000,
          PUBLIC_KEY_ANNOUNCEMENT_BLOCK: 215000          
        }
      }
    },

    getLocalHostNode: function () {
      var deferred = $q.defer();
      if (!this.localhostNode) {
        this.localhostNode = {   
          port: this.port,
          url: this.localhost,
        };
      }
      deferred.resolve(this.localhostNode);
      return deferred.promise;
    },

    serverIsRunning: function () {
      return serverService.isRunning(this.type);
    },

    constants: function () {
      return this._constants[this.type][this.net];
    },

    getSocketNodeURL: function () {
      var deferred = $q.defer();
      deferred.resolve(this.urlPool.getRandom());
      return deferred.promise;
    },

    socket: function () {
      return this._socket || (this._socket = new MofoSocket(this));
    },

    localSocket: function () {
      return this._localSocket || (this._localSocket = new MofoSocket(this, true));
    }
  };

  function URLPool(engine, ips, tls) {
    this.engine = engine;
    this.ips = [];
    for (var i=0; i<ips.length; i++) {
      this.ips.push((tls ? 'wss' : 'ws') + '://' + ips[i] + ':' + this.engine.port + '/ws/');
    }
    this.good = angular.copy(this.ips);
  }
  URLPool.prototype = {
    getRandom: function () {
      return this.good[Math.floor(Math.random()*this.good.length)];
    },
    badURL: function (url) {
      this.good = this.good.filter(function (_url) { return _url != url });
      if (this.good.length == 0) {
        this.good = angular.copy(this.ips);
      }
    }
  }

  function MessageDecoder(api) {
    this.api    = api;
    this.keys   = [];
    this.values = [];
    this.priv   = {};
    this.pub    = {};
  };
  MessageDecoder.prototype = {
    MAX_SIZE: 1000,
    SLIZE_SIZE: 100,
    lock: function () {
      this.keys   = [];
      this.values = [];
      this.priv   = {};
      this.pub    = {};
    },
    /* @param transaction Transaction|JSON
       @returns { encrypted: Boolean, text: String } */
    decode: function (transaction) {
      if (!transaction.attachment) {
        return null;
      }
      var id = transaction.transaction;
      var index = this.keys.indexOf(id);
      if (index != -1) {
        return this.values[index];
      }
      else if (transaction.attachment.encryptedMessage || transaction.attachment.encryptToSelfMessage) {
        try {
          var decoded = this.tryToDecryptMessage(transaction);
          return this.persist(id, true, decoded);
        } 
        catch (e) {
         console.log(e);
         return null;
        }
      }
      else if (transaction.attachment.message) {
        if (!transaction.attachment["version.Message"]) {
          try {
            return this.persist(id, false, converters.hexStringToString(transaction.attachment.message));
          } 
          catch (err) { //legacy
            if (transaction.attachment.message.indexOf("feff") === 0) {
              return this.persist(id, false, INSTANCE.util.convertFromHex16(transaction.attachment.message));
            } 
            else {
              return this.persist(id, false, INSTANCE.util.convertFromHex8(transaction.attachment.message));
            }
          }
        } 
        else {
          return this.persist(id, false, String(transaction.attachment.message));
        }
      }
      return null;
    },
    persist: function (id, encrypted, decoded) {
      var obj = {encrypted:encrypted, text:decoded};
      if (decoded !== null) {
        this.keys.push(id);
        this.values.push(obj);
        if (this.keys.length > this.MAX_SIZE) {
          this.keys.splice(0, this.SLIZE_SIZE);
          this.values.splice(0, this.SLIZE_SIZE);
        }
      }
      return obj;
    },    
    getPrivateKey: function (id_rs) {
      var privateKey = this.priv[id_rs];
      if (!privateKey && $rootScope.currentAccount) {
        if (id_rs == $rootScope.currentAccount.id_rs) {
          var secretPhrase = $rootScope.currentAccount.secretPhrase;
          if (secretPhrase) {
            privateKey = converters.hexStringToByteArray(this.api.crypto.getPrivateKey(secretPhrase));
            this.priv[id_rs] = privateKey;
          }
        }
      }
      return privateKey;
    },
    /* used exclusively for decrypting crypt to self messages */
    getPublicKey: function (id_rs) {
      var publicKey = this.pub[id_rs];
      if (!publicKey && $rootScope.currentAccount) {
        var secretPhrase = $rootScope.currentAccount.secretPhrase;
        if (secretPhrase) {
          publicKey = converters.hexStringToByteArray(this.api.crypto.secretPhraseToPublicKey(secretPhrase));
          this.pub[id_rs] = publicKey;
        }
      }
      return publicKey;
    },
    tryToDecryptMessage: function (transaction) {
      var privateKey, publicKey, data, nonce, isText;
      if (transaction.attachment.encryptedMessage) {
        if (this.getPrivateKey(transaction.senderRS)) {
          privateKey   = this.getPrivateKey(transaction.senderRS);
          if (transaction.attachment.recipientPublicKey) {
            publicKey = converters.hexStringToByteArray(transaction.attachment.recipientPublicKey);
          }
        }
        else if (this.getPrivateKey(transaction.recipientRS)) {
          privateKey   = this.getPrivateKey(transaction.recipientRS);
          if (transaction.attachment.senderPublicKey) {
            publicKey = converters.hexStringToByteArray(transaction.attachment.senderPublicKey);
          }
        }
        if (privateKey && publicKey) {
          isText    = transaction.attachment.encryptedMessage.isText;
          nonce     = converters.hexStringToByteArray(transaction.attachment.encryptedMessage.nonce);
          data      = converters.hexStringToByteArray(transaction.attachment.encryptedMessage.data);
        }
      } 
      else if (transaction.attachment.encryptToSelfMessage) {
        privateKey   = this.getPrivateKey(transaction.senderRS);
        if (privateKey) {
          publicKey = this.getPublicKey(transaction.senderRS);
          isText    = transaction.attachment.encryptToSelfMessage.isText;
          nonce     = converters.hexStringToByteArray(transaction.attachment.encryptToSelfMessage.nonce);
          data      = converters.hexStringToByteArray(transaction.attachment.encryptToSelfMessage.data);
        }
      }
      if (privateKey && publicKey && data && nonce) {
        return this.api.crypto.decryptData(data, { 
          privateKey: privateKey,
          publicKey:  publicKey,
          nonce:      nonce
        });
      }
      return null;
    }
  };  

  function Renderer(api) {
    var self = this;
    this.api = api;
    this.TYPE = {
      ALIAS_NAME: 'ALIAS_NAME',
      ALIAS_URI: 'ALIAS_URI',
      ASSET_NAME: 'ASSET_NAME',
      ASSET_ID: 'ASSET_ID',
      ACCOUNT: 'ACCOUNT',
      ACCOUNT_NAME: 'ACCOUNT_NAME',
      ASK_ORDER: 'ASK_ORDER',
      BID_ORDER: 'BID_ORDER',
      GOODS: 'GOODS',
      GOODS_NAME: 'GOODS_NAME',
      PURCHASE: 'PURCHASE',
      NS_ALIAS_NAME: 'NS_ALIAS_NAME',
      POLL_NAME: 'POLL_NAME',
      POLL_ID: 'POLL_ID',
      TEXT: 'TEXT',
      DESCRIPTION: 'DESCRIPTION',
      ATTACHMENT: 'ATTACHMENT',
      TAGS: 'TAGS',
      DELIVERY_DEADLINE: 'DELIVERY_DEADLINE',
      JSON: 'JSON',
    };
    this.CONSTANTS = {
      0: {
        0: { label: 'Payment', icon: 'fa fa-money', clazz: 'warning' }
      },
      1: {
        0: { label: 'Message', icon: 'fa fa-envelope-o', clazz: 'info' },
        1: { label: 'Alias', icon: 'fa fa-cloud', clazz: 'success' },
        2: { label: 'Create', icon: 'fa fa-question', clazz: 'info' },
        3: { label: 'Cast', icon: 'fa fa-exclamation', clazz: 'info' },
        4: { label: 'Hub', icon: 'fa fa-bullhorn', clazz: 'info' },
        5: { label: 'Account', icon: 'fa fa-cogs', clazz: 'danger' },
        6: { label: 'Sell', icon: 'fa fa-cloud-upload', clazz: 'success' },
        7: { label: 'Buy', icon: 'fa fa-cloud-download', clazz: 'success' }
      },
      2: {
        0: { label: 'Issue', icon: 'fa fa-area-chart', clazz: 'success' },
        1: { label: 'Transfer', icon: 'fa fa-paper-plane-o', clazz: 'success' },
        2: { label: 'Ask', icon: 'fa fa-thumbs-o-down', clazz: 'primary' },
        3: { label: 'Bid', icon: 'fa fa-thumbs-o-up', clazz: 'primary' },
        4: { label: 'Cancel', icon: 'fa fa-thumbs-down', clazz: 'danger' },
        5: { label: 'Cancel', icon: 'fa fa-thumbs-up', clazz: 'danger' }
      },
      3: {
        0: { label: 'DGS List', icon: 'fa fa-shopping-cart', clazz: 'success' }, 
        1: { label: 'DGS Delist', icon: 'fa fa-shopping-cart', clazz: 'danger' }, 
        2: { label: 'DGS Change', icon: 'fa fa-sliders', clazz: 'info' }, 
        3: { label: 'DGS Change', icon: 'fa fa-sliders', clazz: 'info' }, 
        4: { label: 'Purchase', icon: 'fa fa-shopping-cart', clazz: 'primary' }, 
        5: { label: 'Delivery', icon: 'fa fa-truck', clazz: 'success' }, 
        6: { label: 'Feedback', icon: 'fa fa-comment-o', clazz: 'info' }, 
        7: { label: 'Refund', icon: 'fa fa-meh-o', clazz: 'danger' }
      },
      4: {
        0: { label: 'Lease Balance', icon: 'fa fa-rocket' } 
      },
      40: {
        0: { label: 'Private Alias', icon: 'fa fa-cubes' }
      }
    };
    this.templates = {};
    angular.forEach(this.TYPE, function (type) {
      self.templates[type] = ['<a href__HREF__ data-engine="',self.api.type,'" data-type="',type,'" data-value="__VALUE__" class="txn txn-',
        type,'"','__CLICK__',
        ' ','>__LABEL__</a>'].join('');
    });    
  }
  Renderer.prototype = {
    clickHandler: '" onclick="event.preventDefault(); if (angular.element(this).scope().onTransactionIdentifierClick) { angular.element(this).scope().onTransactionIdentifierClick(this) }" ',

    getHTML: function (transaction, translator, accountRS) {
      return $sce.trustAsHtml(this._renderTransaction(transaction, translator, accountRS));
    },

    _render: function (type, label, value, accountRS) {
      var template = this.templates[type], href = null, click = this.clickHandler;
      if (type == this.TYPE.ACCOUNT) {
        label = label||value;
        if (value == accountRS) {
          return '<b>'+escapeHtml(label)+'</b>';
        }        
        href  = '="#/accounts/'+encodeURIComponent(value)+'/activity/latest"';
        click = null;
      }
      else if (type == this.TYPE.ASSET_ID) {
        label = label||value;
        href  = '="#/assets/'+this.api.engine.symbol_lower+'/'+encodeURIComponent(value)+'/trade"';
        click = null;
      }

      var maxLength = 100;
      label = String(label);
      if (label.length > maxLength) {
        label = String(label).substr(0, maxLength) + ' ..'
      }
      var rendered = template.replace(/__LABEL__/g, escapeHtml(label)).replace(/__VALUE__/g, escapeHtml(value||label));
      rendered = rendered.replace(/__HREF__/g, href || '');
      rendered = rendered.replace(/__CLICK__/g, click || ''); // xss safe
      return rendered;
    },

    /**
     * Renders a transaction for use in a transaction table control. Supports user
     * interaction through clickable identifiers.
     * To respond to the click on an identifier create an onTransactionIdentifierClick 
     * method on the current $scope. The method will be called on identifier click
     * and is provided with the clicked element. See it's @data-type and @data-value
     * attributes for it's value.
     * To respond to mouseover, mouseleave use onTransactionIdentifierMouseOver and
     * onTransactionIdentifierMouseLeave a similar fashion.
     *
     * To attach the rendered HTML to the <td> in the table use this syntax:
     *  <td ng-bind-html="rendered_html">
     *
     * @param transaction String
     * @param translator Function translates account id_rs into human readable
     * @returns html String
     * */
    _renderTransaction: function (transaction, translator, accountRS) {
      var self = this;
      var api  = this.api;
      var TYPE = this.TYPE;
      var util = INSTANCE.util;

      /* @param type see TYPE
         @param label String 
         @param value String optional if not provided label is used
         @returns String */
      function render(type, label, value) {
        return self._render(type, label, value, accountRS);
      }

      function translate(id_rs) {
        return translator ? translator(id_rs) : id_rs;
      }

      function label(transaction) {
        var constant = self.CONSTANTS[transaction.type] ? self.CONSTANTS[transaction.type][transaction.subtype] : null;
        if (constant) {
          constant.clazz = 'default';
          return '<span class="btn btn-xs btn-'+constant.clazz+' btn-rendered-transaction pull-right">' +
                    '<i class="'+constant.icon+'"></i><small>&nbsp;&nbsp;&nbsp;&nbsp;<strong>'+constant.label+'</strong></small></span>';
        }
        return 'error';
      }

      function fee(transaction) {
        return '' // '(fee '+util.convertToNXT(transaction.feeNQT)+' '+api.engine.symbol+')'
      }

      function message(transaction) {
        var decoded = null;
        try {
          decoded = self.api.decoder.decode(transaction);
        } catch (e) {
          console.log(e);
        }
        if (decoded) {
          var html = ['&nbsp;<span>'];
          if (transaction.attachment.encryptToSelfMessage) {
            html.push('<i class="fa fa-key"></i>');
          }
          else if (transaction.attachment.encryptedMessage) {
            html.push('<i class="fa fa-key"></i>');
          }
          else {
            html.push('<i class="fa fa-unlock"></i>');
          }
          if (decoded.text) {
            var text = escapeHtml(decoded.text);
            html.push('&nbsp;<span data-text="',text,'" data-sender="',transaction.senderRS,'" data-recipient="',transaction.recipientRS,'" ',
            '>',Emoji.emojifi(text),'</span></span>');
          }
          else {
            html.push('&nbsp;encrypted&nbsp;<a href="#" ',
                      'onclick="event.preventDefault(); if (angular.element(this).scope().onMessageUnlockClick) { ',
                      'angular.element(this).scope().onMessageUnlockClick(this) }" data-recipient="',transaction.recipientRS,'" data-sender="',transaction.senderRS,'">',
                      'unlock&nbsp;<i class="fa fa-lock"></i></a></span>');
          }
          return html.join('');
        }
        return '';
      }

      function formatQuantity(quantityQNT, decimals) {
        return INSTANCE.util.convertToQNTf(quantityQNT, decimals);
      }

      function formatOrderPricePerWholeQNT(priceNQT, decimals) {
        return INSTANCE.util.calculateOrderPricePerWholeQNT(priceNQT, decimals);
      }      

      function formatOrderTotal(priceNQT, quantityQNT, decimals) {
        return INSTANCE.util.convertToNXT(INSTANCE.util.calculateOrderTotalNQT(priceNQT, quantityQNT));
      }

      /* It's a trade */
      if (transaction.tradeType) {
        var trade = transaction;
        if (trade.tradeType == "buy") {
          // "{{buyer}} bought {{quantity}} {{asset}} from {{seller}} at {{price}} {{symbol}} each total {{total}} {{symbol}} {{details}}'
          return $translate.instant('trade.buy', {
            buyer:      render(TYPE.ACCOUNT, trade.buyerName, trade.buyerRS),
            quantity:   formatQuantity(trade.quantityQNT, trade.decimals),
            asset:      render(TYPE.ASSET_ID, trade.name, trade.asset),
            seller:     render(TYPE.ACCOUNT, trade.sellerName, trade.sellerRS),
            price:      formatOrderPricePerWholeQNT(trade.priceNQT, trade.decimals),
            symbol:     api.engine.symbol,
            total:      formatOrderTotal(trade.priceNQT, trade.quantityQNT, trade.getDecimals),
            details:    render(TYPE.JSON,'details',JSON.stringify(transaction))
          });
        }
        else {
          // "{{seller}} sold {{quantity}} {{asset}} to {{buyer}} for {{price}} {{symbol}} each total {{total}} {{symbol}} {{details}}'
          return $translate.instant('trade.sell', {
            seller:     render(TYPE.ACCOUNT, trade.sellerName, trade.sellerRS),
            quantity:   formatQuantity(trade.quantityQNT, trade.decimals),
            asset:      render(TYPE.ASSET_ID, trade.name, trade.asset),
            buyer:      render(TYPE.ACCOUNT, trade.buyerName, trade.buyerRS),
            price:      formatOrderPricePerWholeQNT(trade.priceNQT, trade.decimals),
            symbol:     api.engine.symbol,
            total:      formatOrderTotal(trade.priceNQT, trade.quantityQNT, trade.getDecimals),
            details:    render(TYPE.JSON,'details',JSON.stringify(transaction))
          });
        }
      }
      else {
        switch (transaction.type) {
          case 0: {
            switch (transaction.subtype) {
              // "{{sender}} paid {{amount}} {{symbol}} to {{recipient}} {{details}} {{message}}'
              case 0: return $translate.instant('transaction.0.0', {
                sender:     render(TYPE.ACCOUNT, transaction.senderName, transaction.senderRS),
                amount:     util.convertToNXT(transaction.amountNQT),
                symbol:     api.engine.symbol, 
                recipient:  render(TYPE.ACCOUNT, transaction.recipientName, transaction.recipientRS),
                details:    render(TYPE.JSON,'details',JSON.stringify(transaction)),
                message:    message(transaction)
              });
            }
          }
          case 1: {
            switch (transaction.subtype) {
              // {{sender}} sent a message to {{recipient}} {{details}} {{message}}
              case 0: return $translate.instant('transaction.1.0', {
                sender:     render(TYPE.ACCOUNT, transaction.senderName, transaction.senderRS),
                recipient:  render(TYPE.ACCOUNT, transaction.recipientName, transaction.recipientRS), 
                details:    render(TYPE.JSON,'details',JSON.stringify(transaction)),
                message:    message(transaction)
              });
              // {{sender}} set alias {{aliasName}} to {{aliasURI}} {{details}} {{message}}
              case 1: return $translate.instant('transaction.1.1', {
                sender:     render(TYPE.ACCOUNT, transaction.senderName, transaction.senderRS),
                aliasName:  render(TYPE.ALIAS_NAME, transaction.attachment.alias), 
                aliasURI:   render(TYPE.ALIAS_URI, transaction.attachment.uri),
                details:    render(TYPE.JSON,'details',JSON.stringify(transaction)),
                message:    message(transaction)
              });
              // {{sender}} created poll {{pollId}} {{details}} {{message}}
              case 2: return $translate.instant('transaction.1.2', {
                sender:     render(TYPE.ACCOUNT, transaction.senderName, transaction.senderRS),
                pollId:     render(TYPE.POLL_NAME, transaction.attachment.name),
                details:    render(TYPE.JSON,'details',JSON.stringify(transaction)),
                message:    message(transaction)
              });
              // {{sender}} casted vote for {{pollId}} {{details}} {{message}}
              case 3: return $translate.instant('transaction.1.3', {
                sender:     render(TYPE.ACCOUNT, transaction.senderName, transaction.senderRS), 
                pollId:     render(TYPE.POLL_ID, transaction.attachment.pollId),
                details:    render(TYPE.JSON,'details',JSON.stringify(transaction)),
                message:    message(transaction)
              });
              // {{sender}} announced hub {{details}} {{message}}
              case 4: return $translate.instant('transaction.1.4', {
                sender:     render(TYPE.ACCOUNT, transaction.senderName, transaction.senderRS), 
                details:    render(TYPE.JSON,'details',JSON.stringify(transaction)),
                message:    message(transaction)
              });              
              // {{sender}} registered name {{name}} {{description}} {{details}} {{message}}
              case 5: return $translate.instant('transaction.1.5', {
                sender:     render(TYPE.ACCOUNT, transaction.senderRS, transaction.senderRS), 
                name:       render(TYPE.ACCOUNT_NAME, transaction.attachment.name),
                description:render(TYPE.DESCRIPTION,'description',transaction.attachment.description),
                details:    render(TYPE.JSON,'details',JSON.stringify(transaction)),
                message:    message(transaction)
              });
              // {{sender}} offered alias {{aliasName}} for sale for {{amount}} {{symbol}} {{details}} {{message}}
              case 6: return $translate.instant('transaction.1.6', {
                sender:     render(TYPE.ACCOUNT, transaction.senderName, transaction.senderRS), 
                aliasName:  render(TYPE.ALIAS_NAME, transaction.attachment.alias), 
                amount:     util.convertToNXT(transaction.attachment.priceNQT),
                symbol:     api.engine.symbol,
                details:    render(TYPE.JSON,'details',JSON.stringify(transaction)),
                message:    message(transaction)
              });
              // {{sender}} bought alias {{aliasName}} from {{recipient}} {{details}} {{message}}
              case 7: return $translate.instant('transaction.1.7', {
                sender:     render(TYPE.ACCOUNT, transaction.senderName, transaction.senderRS),
                aliasName:  render(TYPE.ALIAS_NAME, transaction.attachment.alias), 
                recipient:  render(TYPE.ACCOUNT, transaction.recipientName, transaction.recipientRS),
                details:    render(TYPE.JSON,'details',JSON.stringify(transaction)),
                message:    message(transaction)
              });
            }      
          }
          case 2: {
            switch (transaction.subtype) {
              // {{sender}} issued asset {{assetName}} {{details}} {{message}}
              case 0: return $translate.instant('transaction.2.0', {
                sender:     render(TYPE.ACCOUNT, transaction.senderName, transaction.senderRS), 
                assetName:  render(TYPE.ASSET_ID, transaction.attachment.name, transaction.transaction), 
                details:    render(TYPE.JSON,'details',JSON.stringify(transaction)),
                message:    message(transaction)
              });              
              // {{sender}} transfered {{quantity}} {{assetName}} to {{recipient}} {{details}} {{message}}
              case 1: return $translate.instant('transaction.2.1', {
                sender:     render(TYPE.ACCOUNT, transaction.senderName, transaction.senderRS), 
                quantity:   formatQuantity(transaction.attachment.quantityQNT, transaction.attachment.decimals),
                assetName:  render(TYPE.ASSET_ID, transaction.attachment.name, transaction.attachment.asset), 
                recipient:  render(TYPE.ACCOUNT, transaction.recipientName, transaction.recipientRS),
                details:    render(TYPE.JSON,'details',JSON.stringify(transaction)),
                message:    message(transaction)
              });                
              // {{sender}} placed sell order for {{quantity}} {{assetName}} at {{price}} {{symbol}} total {{total}} {{symbol}} {{details}} {{message}} 
              case 2: return $translate.instant('transaction.2.2', {
                sender:     render(TYPE.ACCOUNT, transaction.senderName, transaction.senderRS), 
                quantity:   formatQuantity(transaction.attachment.quantityQNT, transaction.attachment.decimals),
                assetName:  render(TYPE.ASSET_ID, transaction.attachment.name, transaction.attachment.asset),
                price:      formatOrderPricePerWholeQNT(transaction.attachment.priceNQT, transaction.attachment.decimals),
                symbol:     api.engine.symbol,
                total:      formatOrderTotal(transaction.attachment.priceNQT, transaction.attachment.quantityQNT, transaction.attachment.decimals),
                details:    render(TYPE.JSON,'details',JSON.stringify(transaction)),
                message:    message(transaction)
              });                
              // {{sender}} placed buy order for {{quantity}} {{assetName}} at {{price}} {{symbol}} total {{total}} {{symbol}} {{details}} {{message}} 
              case 3: return $translate.instant('transaction.2.3', {
                sender:     render(TYPE.ACCOUNT, transaction.senderName, transaction.senderRS), 
                quantity:   formatQuantity(transaction.attachment.quantityQNT, transaction.attachment.decimals),
                assetName:  render(TYPE.ASSET_ID, transaction.attachment.name, transaction.attachment.asset),
                price:      formatOrderPricePerWholeQNT(transaction.attachment.priceNQT, transaction.attachment.decimals),
                symbol:     api.engine.symbol,
                total:      formatOrderTotal(transaction.attachment.priceNQT, transaction.attachment.quantityQNT, transaction.attachment.decimals),
                details:    render(TYPE.JSON,'details',JSON.stringify(transaction)),
                message:    message(transaction)
              });               
              // {{sender}} cancelled sell order {{order}} {{details}} {{message}}
              case 4: return $translate.instant('transaction.2.4', {
                sender:     render(TYPE.ACCOUNT, transaction.senderName, transaction.senderRS), 
                order:      render(TYPE.ASK_ORDER, transaction.attachment.order),
                details:    render(TYPE.JSON,'details',JSON.stringify(transaction)),
                message:    message(transaction)
              }); 
              // {{sender}} cancelled buy order {{order}} {{details}} {{message}}
              case 5: return $translate.instant('transaction.2.5', {
                sender:     render(TYPE.ACCOUNT, transaction.senderName, transaction.senderRS), 
                order:      render(TYPE.BID_ORDER, transaction.attachment.order),
                details:    render(TYPE.JSON,'details',JSON.stringify(transaction)),
                message:    message(transaction)
              }); 
            } 
          }
          case 3: {
            switch (transaction.subtype) {
              // {{sender}} listed good {{goodsName}} quantity {{quantity}} for {{price}} {{symbol}} {{description}} {{tags}} {{details}} {{message}}
              case 0: return $translate.instant('transaction.3.0', {
                sender:    render(TYPE.ACCOUNT, transaction.senderName, transaction.senderRS), 
                goodsName: render(TYPE.GOODS_NAME, transaction.attachment.name, transaction.transaction),
                quantity:  util.commaFormat(String(transaction.attachment.quantity)),
                price:     util.convertToNXT(transaction.attachment.priceNQT),
                symbol:    api.engine.symbol,
                description: render(TYPE.DESCRIPTION,'description',transaction.attachment.description),
                tags:      render(TYPE.TAGS,'tags',transaction.attachment.tags),
                details:   render(TYPE.JSON,'details',JSON.stringify(transaction)),
                message:   message(transaction)
              });              
              // {{sender}} delisted good {{goodsName}} {{details}} {{message}}
              case 1: return $translate.instant('transaction.3.1', {
                sender:    render(TYPE.ACCOUNT, transaction.senderName, transaction.senderRS), 
                goodsName: render(TYPE.GOODS, transaction.attachment.goods),
                details:   render(TYPE.JSON,'details',JSON.stringify(transaction)),
                message:   message(transaction)
              }); 
              // {{sender}} changed price of {{goodsName}} to {{price}} {{symbol}} {{details}} {{message}}
              case 2: return $translate.instant('transaction.3.2', {
                sender:   render(TYPE.ACCOUNT, transaction.senderName, transaction.senderRS), 
                goodsName:render(TYPE.GOODS, transaction.attachment.goods),
                price:    util.convertToNXT(transaction.attachment.priceNQT),
                symbol:   api.engine.symbol,
                details:  render(TYPE.JSON,'details',JSON.stringify(transaction)),
                message:  message(transaction)
              }); 
              // {{sender}} changed quantity of {{goodsName}} by {{deltaQuantity}} {{details}} {{message}}
              case 3: return $translate.instant('transaction.3.3', {
                sender:        render(TYPE.ACCOUNT, transaction.senderName, transaction.senderRS), 
                goodsName:     render(TYPE.GOODS, transaction.attachment.goods),
                deltaQuantity: escapeHtml(transaction.attachment.deltaQuantity),
                details:       render(TYPE.JSON,'details',JSON.stringify(transaction)),
                message:       message(transaction)
              }); 
              // {{sender}} purchased {{quantity}} {{goodsName}} from {{recipient}} for {{price}} {{symbol}} {{deadline}} {{details}} {{message}}
              case 4: return $translate.instant('transaction.3.4', {
                sender:     render(TYPE.ACCOUNT, transaction.senderName, transaction.senderRS), 
                quantity:   util.commaFormat(String(transaction.attachment.quantity)),
                goodsName:  render(TYPE.GOODS, transaction.attachment.goods),
                recipient:  render(TYPE.ACCOUNT, transaction.recipientName, transaction.recipientRS),
                price:      util.convertToNXT(transaction.attachment.priceNQT),
                symbol:     api.engine.symbol,
                deadline:   render(TYPE.DELIVERY_DEADLINE,'deadline',transaction.attachment.deliveryDeadlineTimestamp),
                details:    render(TYPE.JSON,'details',JSON.stringify(transaction)),
                message:    message(transaction)
              });               
              // {{sender}} delivered purchase {{purchase}} to {{recipient}} with discount {{discount}} {{symbol}} {{details}} {{message}}
              case 5: return $translate.instant('transaction.3.5', {
                sender:    render(TYPE.ACCOUNT, transaction.senderName, transaction.senderRS),
                purchase:  render(TYPE.PURCHASE, transaction.attachment.purchase),
                recipient: render(TYPE.ACCOUNT, transaction.recipientName, transaction.recipientRS),
                discount:  util.convertToNXT(transaction.attachment.discountNQT),
                symbol:    api.engine.symbol,
                details:   render(TYPE.JSON,'details',JSON.stringify(transaction)),
                message:   message(transaction)
              });               
              // {{sender}} gave feedback for purchase {{purchase}} {{details}} {{message}}
              case 6: return $translate.instant('transaction.3.6', {
                sender:   render(TYPE.ACCOUNT, transaction.senderName, transaction.senderRS),
                purchase: render(TYPE.PURCHASE, transaction.attachment.purchase),
                details:  render(TYPE.JSON,'details',JSON.stringify(transaction)),
                message:  message(transaction)
              });              
              // {{sender}} gave refund of {{discount}} {{symbol}} for {{purchase}} {{details}} {{message}}
              case 7: return $translate.instant('transaction.3.7', {
                sender:  render(TYPE.ACCOUNT, transaction.senderName, transaction.senderRS),
                discount:util.convertToNXT(transaction.attachment.discountNQT),
                symbol:  api.engine.symbol,
                purchase:render(TYPE.PURCHASE, transaction.attachment.purchase),
                details: render(TYPE.JSON,'details',JSON.stringify(transaction)),
                message: message(transaction)
              });               
            } 
          }
          case 4: {
            switch (transaction.subtype) {
              // {{sender}} leased his balance to {{recipient}} for a period of {{period}} blocks {{details}} {{message}}
              case 0: return $translate.instant('transaction.4.0', {
                sender:   render(TYPE.ACCOUNT, transaction.senderName, transaction.senderRS),
                recipient:render(TYPE.ACCOUNT, transaction.recipientName, transaction.recipientRS),
                period:   escapeHtml(transaction.attachment.period),
                details:  render(TYPE.JSON,'details',JSON.stringify(transaction)),
                message:  message(transaction)
              });               
            }
          }
          case 5: {
            switch (transaction.subtype) {
              // {{sender}} issued currency {{code}} at height {{height}} {{details}} {{message}}
              // attachment.put("name", name);
              // attachment.put("code", code);
              // attachment.put("description", description);
              // attachment.put("type", type);
              // attachment.put("initialSupply", initialSupply);
              // attachment.put("reserveSupply", reserveSupply);
              // attachment.put("maxSupply", maxSupply);
              // attachment.put("issuanceHeight", issuanceHeight);
              // attachment.put("minReservePerUnitNQT", minReservePerUnitNQT);
              // attachment.put("minDifficulty", minDifficulty);
              // attachment.put("maxDifficulty", maxDifficulty);
              // attachment.put("ruleset", ruleset);
              // attachment.put("algorithm", algorithm);
              // attachment.put("decimals", decimals);
              case 0: return $translate.instant('transaction.5.0', {
                sender:   render(TYPE.ACCOUNT, transaction.senderName, transaction.senderRS),
                code:     escapeHtml(transaction.attachment.code),
                height:   escapeHtml(transaction.attachment.issuanceHeight),
                details:  render(TYPE.JSON,'details', JSON.stringify(transaction)),
                message:  message(transaction)
              });
              // {{sender}} became a founder of {{code}} with {{amount}} {{symbol}} per unit {{details}} {{message}}
              // attachment.put("currency", Convert.toUnsignedLong(currencyId));
              // attachment.put("amountPerUnitNQT", amountPerUnitNQT);
              // json.put("name", currency.getName());
              // json.put("code", currency.getCode());
              // json.put("type", currency.getType());
              // json.put("decimals", currency.getDecimals());
              // json.put("issuanceHeight", currency.getIssuanceHeight());
              // putAccount(json, "issuerAccount", currency.getAccountId());
              case 1: return $translate.instant('transaction.5.1', {
                sender:   render(TYPE.ACCOUNT, transaction.senderName, transaction.senderRS),
                code:     escapeHtml(transaction.attachment.code),
                amount:   escapeHtml(transaction.attachment.amountPerUnitNQT),
                symbol:   api.engine.symbol,
                details:  render(TYPE.JSON,'details', JSON.stringify(transaction)),
                message:  message(transaction)
              });
              // {{sender}} claimed {{units}} units of {{code}} {{details}} {{message}}
              // attachment.put("currency", Convert.toUnsignedLong(currencyId));
              // attachment.put("units", units);              
              // json.put("name", currency.getName());
              // json.put("code", currency.getCode());
              // json.put("type", currency.getType());
              // json.put("decimals", currency.getDecimals());
              // json.put("issuanceHeight", currency.getIssuanceHeight());
              // putAccount(json, "issuerAccount", currency.getAccountId());
              case 2: return $translate.instant('transaction.5.2', {
                sender:   render(TYPE.ACCOUNT, transaction.senderName, transaction.senderRS),
                units:    escapeHtml(transaction.attachment.units),
                code:     escapeHtml(transaction.attachment.code),
                details:  render(TYPE.JSON,'details', JSON.stringify(transaction)),
                message:  message(transaction)
              });
              // {{sender}} transfered {{units}} {{code}} to {{recipient}} {{details}} {{message}}
              // attachment.put("currency", Convert.toUnsignedLong(currencyId));
              // attachment.put("units", units);
              // json.put("name", currency.getName());
              // json.put("code", currency.getCode());
              // json.put("type", currency.getType());
              // json.put("decimals", currency.getDecimals());
              // json.put("issuanceHeight", currency.getIssuanceHeight());
              // putAccount(json, "issuerAccount", currency.getAccountId());              
              case 3: return $translate.instant('transaction.5.3', {
                sender:     render(TYPE.ACCOUNT, transaction.senderName, transaction.senderRS),
                units:      transaction.attachment.units,
                code:       transaction.attachment.code,
                recipient:  render(TYPE.ACCOUNT, transaction.recipientName, transaction.recipientRS),
                details:    render(TYPE.JSON,'details', JSON.stringify(transaction)),
                message:    message(transaction)
              });
              // {{sender}} published exchange offer for {{code}} buy: {{buyRate}} {{symbol}} sell: {{sellRate}} {{symbol}} {{details}} {{message}}
              // attachment.put("currency", Convert.toUnsignedLong(currencyId));
              // attachment.put("buyRateNQT", buyRateNQT);
              // attachment.put("sellRateNQT", sellRateNQT);
              // attachment.put("totalBuyLimit", totalBuyLimit);
              // attachment.put("totalSellLimit", totalSellLimit);
              // attachment.put("initialBuySupply", initialBuySupply);
              // attachment.put("initialSellSupply", initialSellSupply);
              // attachment.put("expirationHeight", expirationHeight);  
              // json.put("name", currency.getName());
              // json.put("code", currency.getCode());
              // json.put("type", currency.getType());
              // json.put("decimals", currency.getDecimals());
              // json.put("issuanceHeight", currency.getIssuanceHeight());
              // putAccount(json, "issuerAccount", currency.getAccountId()); 
              case 4: return $translate.instant('transaction.5.4', {
                sender:     render(TYPE.ACCOUNT, transaction.senderName, transaction.senderRS),
                code:       escapeHtml(transaction.attachment.code),
                buyRate:    escapeHtml(transaction.attachment.buyRateNQT),
                sellRate:   escapeHtml(transaction.attachment.sellRateNQT),
                symbol:     api.engine.symbol,
                details:    render(TYPE.JSON,'details', JSON.stringify(transaction)),
                message:    message(transaction)
              });
              // {{sender}} wants to buy {{units}} {{code}} at {{rate}} {{symbol}} each total {{total}} {{symbol}} {{details}} {{message}}
              // attachment.put("currency", Convert.toUnsignedLong(currencyId));
              // attachment.put("rateNQT", rateNQT);
              // attachment.put("units", units);
              // json.put("name", currency.getName());
              // json.put("code", currency.getCode());
              // json.put("type", currency.getType());
              // json.put("decimals", currency.getDecimals());
              // json.put("issuanceHeight", currency.getIssuanceHeight());
              // putAccount(json, "issuerAccount", currency.getAccountId());               
              case 5: return $translate.instant('transaction.5.5', {
                sender:     render(TYPE.ACCOUNT, transaction.senderName, transaction.senderRS),
                units:      escapeHtml(transaction.attachment.units),
                code:       escapeHtml(transaction.attachment.code),
                rate:       util.convertToNXT(transaction.attachment.rateNQT),
                symbol:     api.engine.symbol,
                total:      'x',
                details:    render(TYPE.JSON,'details', JSON.stringify(transaction)),
                message:    message(transaction)
              });
              // {{sender}} wants to sell {{units}} {{code}} at {{rate}} {{symbol}} each total {{total}} {{symbol}} {{details}} {{message}}
              // attachment.put("currency", Convert.toUnsignedLong(currencyId));
              // attachment.put("rateNQT", rateNQT);
              // attachment.put("units", units);
              // json.put("name", currency.getName());
              // json.put("code", currency.getCode());
              // json.put("type", currency.getType());
              // json.put("decimals", currency.getDecimals());
              // json.put("issuanceHeight", currency.getIssuanceHeight());
              // putAccount(json, "issuerAccount", currency.getAccountId());   
              case 6: return $translate.instant('transaction.5.6', {
                sender:     render(TYPE.ACCOUNT, transaction.senderName, transaction.senderRS),
                units:      escapeHtml(transaction.attachment.units),
                code:       escapeHtml(transaction.attachment.code),
                rate:       util.convertToNXT(transaction.attachment.rateNQT),
                symbol:     api.engine.symbol,
                total:      'x',
                details:    render(TYPE.JSON,'details', JSON.stringify(transaction)),
                message:    message(transaction)
              });
              // {{sender}} minted {{units}} {{code}} {{details}} {{message}}
              // attachment.put("nonce", nonce);
              // attachment.put("currency", Convert.toUnsignedLong(currencyId));
              // attachment.put("units", units);
              // attachment.put("counter", counter);
              // json.put("name", currency.getName());
              // json.put("code", currency.getCode());
              // json.put("type", currency.getType());
              // json.put("decimals", currency.getDecimals());
              // json.put("issuanceHeight", currency.getIssuanceHeight());
              // putAccount(json, "issuerAccount", currency.getAccountId());  
              case 7: return $translate.instant('transaction.5.7', {
                sender:     render(TYPE.ACCOUNT, transaction.senderName, transaction.senderRS),
                units:      escapeHtml(transaction.attachment.units),
                code:       escapeHtml(transaction.attachment.code),
                details:    render(TYPE.JSON,'details', JSON.stringify(transaction)),
                message:    message(transaction)
              });
              // {{sender}} deleted currency {{code}} {{name}} {{details}} {{message}}
              // json.put("name", currency.getName());
              // json.put("code", currency.getCode());
              // json.put("type", currency.getType());
              // json.put("decimals", currency.getDecimals());
              // json.put("issuanceHeight", currency.getIssuanceHeight());
              // putAccount(json, "issuerAccount", currency.getAccountId());                
              case 8: return $translate.instant('transaction.5.8', {
                sender:     render(TYPE.ACCOUNT, transaction.senderName, transaction.senderRS),
                name:       escapeHtml(transaction.attachment.name),
                code:       escapeHtml(transaction.attachment.code),
                details:    render(TYPE.JSON,'details', JSON.stringify(transaction)),
                message:    message(transaction)
              });
            }
          }
          case 40: {
            switch (transaction.subtype) {
              // {{sender}} set namespaced alias {{aliasName}} to {{aliasURI}} {{details}} {{message}}
              case 0: return $translate.instant('transaction.40.0', {
                sender:    render(TYPE.ACCOUNT, transaction.senderName, transaction.senderRS),
                aliasName: render(TYPE.ALIAS_NAME, transaction.attachment.alias), 
                aliasURI:  render(TYPE.ALIAS_URI, transaction.attachment.uri),
                details:   render(TYPE.JSON,'details',JSON.stringify(transaction)),
                message:   message(transaction)
              });
              // {{sender}} adds {{recipient}} to {{assetName}} allowed accounts {{details}} {{message}}
              case 1: return $translate.instant('transaction.40.1', {
                sender:     render(TYPE.ACCOUNT, transaction.senderName, transaction.senderRS), 
                assetName:  render(TYPE.ASSET_ID, transaction.attachment.name, transaction.attachment.asset), 
                recipient:  render(TYPE.ACCOUNT, transaction.recipientName, transaction.recipientRS),
                details:    render(TYPE.JSON,'details',JSON.stringify(transaction)),
                message:    message(transaction)
              });
              // {{sender}} removed {{recipient}} from {{assetName}} allowed accounts {{details}} {{message}}
              case 2: return $translate.instant('transaction.40.2', {
                sender:     render(TYPE.ACCOUNT, transaction.senderName, transaction.senderRS), 
                assetName:  render(TYPE.ASSET_ID, transaction.attachment.name, transaction.attachment.asset), 
                recipient:  render(TYPE.ACCOUNT, transaction.recipientName, transaction.recipientRS),
                details:    render(TYPE.JSON,'details',JSON.stringify(transaction)),
                message:    message(transaction)
              });
              // {{sender}} set {{assetName}} order fee {{orderFee}}% trade fee {{tradeFee}}% {{details}} {{message}}
              case 3: return $translate.instant('transaction.40.3', {
                sender:     render(TYPE.ACCOUNT, transaction.senderName, transaction.senderRS), 
                assetName:  render(TYPE.ASSET_ID, transaction.attachment.name, transaction.attachment.asset), 
                orderFee:   INSTANCE.util.convertToQNTf(String(transaction.attachment.orderFeePercentage), 6)||'0',
                tradeFee:   INSTANCE.util.convertToQNTf(String(transaction.attachment.tradeFeePercentage), 6)||'0',
                details:    render(TYPE.JSON,'details',JSON.stringify(transaction)),
                message:    message(transaction)
              });
            }
          }
        }
      }
    } 
  };

  /**
   * @param _type Engine type 
   * @param _test Boolean for test network
   */
  function ServerAPI(_type, _test) {
    verifyEngineType(_type);
    this.type                 = _type;
    this.test                 = _test;
    this.downloaders          = {};
    this.engine               = new AbstractEngine(_type, _test);
    this.crypto               = new Crypto(_type, this);
    this.renderer             = new Renderer(this);
    this.decoder              = new MessageDecoder(this);    

    /* Registers AbstractEngine as NodeProvider with the requests service */
    requests.registerNodeProvider(this.engine);
  };
  ServerAPI.prototype = {
    lock: function () {
      if (this.decoder) {
        this.decoder.lock();
      }
    },

    /* Creates the NxtAddress for this coin */
    createAddress: function () {
      return new NxtAddress(this.type == TYPE_NXT ? 'NXT' : 'FIM');
    },

    /* Encrypts message with public and private key
     *
     * @param message String
     * @param recipient String
     * @param recipientPublicKey String
     * @param secretPhrase String
     *
     * @returns {
     *   message: String,
     *   nonce: String
     * }
     * */
    encryptMessage: function (message, recipient, recipientPublicKey, secretPhrase) {
      var options = { account: recipient };
      if (recipientPublicKey) { options.publicKey = recipientPublicKey};
      return this.crypto.encryptNote(message, options, secretPhrase);
    },

    /* Encrypts message data and adds that to data arg */
    addMessageData: function(data, requestType) {
      if (requestType == 'sendMoney' || requestType == 'sendMessage') {

        /* Encrypt message to recipient */
        if (data.encrypt_message && data.message) {
          var options = {};
          if (data.recipient) {
            options.account = data.recipient;
          } 
          else if (data.encryptedMessageRecipient) {
            options.account = data.encryptedMessageRecipient;
            delete data.encryptedMessageRecipient;
          }

          if (data.recipientPublicKey) {
            options.publicKey = data.recipientPublicKey;
          }

          var encrypted = this.crypto.encryptNote(data.message, options, data.secretPhrase);
          
          data.encryptedMessageData = encrypted.message;
          data.encryptedMessageNonce = encrypted.nonce;
          data.messageToEncryptIsText = "true";

          delete data.encrypt_message;
          delete data.message;
        } 

        /* Encrypt message to self */
        else if (data.note_to_self && data.message) {
          var encrypted = this.crypto.encryptNote(data.message, {
            "publicKey": converters.hexStringToByteArray(this.crypto.secretPhraseToPublicKey(data.secretPhrase))
          }, data.secretPhrase);

          data.encryptToSelfMessageData = encrypted.message;
          data.encryptToSelfMessageNonce = encrypted.nonce;
          data.messageToEncryptToSelfIsText = "true";

          delete data.note_to_self;
          delete data.message;
        } 

        /* Public message */
        else if (data.public_message && data.message) {
          data.messageIsText = 'true';

          delete data.public_message;
        }
      }
    }
  };

  // /////////////////////////////////////////////////////////////////////////////////////////////
  // /////////////////////////////////////////////////////////////////////////////////////////////
  //
  //
  //
  //
  // Start verifyAndSignTransactionBytes
  //
  //
  //
  //
  // /////////////////////////////////////////////////////////////////////////////////////////////
  // /////////////////////////////////////////////////////////////////////////////////////////////

  ServerAPI.prototype.verifyAndSignTransactionBytes = verifyAndSignTransactionBytes;

  function verifyAndSignTransactionBytes(transactionBytes, signature, requestType, data, _type, constants) {
    verifyEngineType(_type);
    var transaction   = {};
    var byteArray     = converters.hexStringToByteArray(transactionBytes);
    transaction.type  = byteArray[0];

    transaction.version = (byteArray[1] & 0xF0) >> 4;
    transaction.subtype = byteArray[1] & 0x0F;

    transaction.timestamp = String(converters.byteArrayToSignedInt32(byteArray, 2));
    transaction.deadline  = String(converters.byteArrayToSignedShort(byteArray, 6));
    if (_type == TYPE_FIM) {
      transaction.recipient = String(converters.byteArrayToBigInteger(byteArray, 8)); /* XXX - prevent transaction replay */
      transaction.publicKey = converters.byteArrayToHexString(byteArray.slice(16, 48));
    }
    else { /* if (_type == TYPE_NXT) */
      transaction.publicKey = converters.byteArrayToHexString(byteArray.slice(8, 40));
      transaction.recipient = String(converters.byteArrayToBigInteger(byteArray, 40));
    }

    transaction.amountNQT = String(converters.byteArrayToBigInteger(byteArray, 48));
    transaction.feeNQT    = String(converters.byteArrayToBigInteger(byteArray, 56));

    var refHash = byteArray.slice(64, 96);
    transaction.referencedTransactionFullHash = converters.byteArrayToHexString(refHash);
    if (transaction.referencedTransactionFullHash == "0000000000000000000000000000000000000000000000000000000000000000") {
      transaction.referencedTransactionFullHash = "";
    }
    //transaction.referencedTransactionId = converters.byteArrayToBigInteger([refHash[7], refHash[6], refHash[5], refHash[4], refHash[3], refHash[2], refHash[1], refHash[0]], 0);

    transaction.flags = 0;

    if (transaction.version > 0) {
      transaction.flags         = converters.byteArrayToSignedInt32(byteArray, 160);
      transaction.ecBlockHeight = String(converters.byteArrayToSignedInt32(byteArray, 164));
      transaction.ecBlockId     = String(converters.byteArrayToBigInteger(byteArray, 168));
    }

    if (!("amountNQT" in data)) {
      data.amountNQT = "0";
    }

    if (!("recipient" in data)) {
      data.recipient = "1739068987193023818";
      if (_type == TYPE_FIM) {
        data.recipientRS = "FIM-MRCC-2YLS-8M54-3CMAJ";
      }
      else { /* if (_type == TYPE_NXT) */
        data.recipientRS = "NXT-MRCC-2YLS-8M54-3CMAJ";
      }
    }

    if (transaction.publicKey != data.publicKey) {
      console.log('verifyAndSignTransactionBytes.failed | transaction.publicKey != data.publicKey', transaction, data);
      return false;
    }

    if (transaction.deadline !== data.deadline) {
      console.log('verifyAndSignTransactionBytes.failed | transaction.deadline !== data.deadline', transaction, data);
      return false;
    }

    if (transaction.recipient !== data.recipient) {
      if (data.recipient == "1739068987193023818" && transaction.recipient == "0") {
        //ok
      } else {
        console.log('verifyAndSignTransactionBytes.failed | transaction.recipient !== data.recipient', transaction, data);
        return false;
      }
    }

    if (transaction.amountNQT !== data.amountNQT || transaction.feeNQT !== data.feeNQT) {
      console.log('verifyAndSignTransactionBytes.failed | transaction.amountNQT !== data.amountNQT || transaction.feeNQT !== data.feeNQT', transaction, data);
      return false;
    }

    if ("referencedTransactionFullHash" in data) {
      if (transaction.referencedTransactionFullHash !== data.referencedTransactionFullHash) {
        console.log('verifyAndSignTransactionBytes.failed | transaction.referencedTransactionFullHash !== data.referencedTransactionFullHash', transaction, data);
        return false;
      }
    } 
    else if (transaction.referencedTransactionFullHash !== "") {
      console.log('verifyAndSignTransactionBytes.failed | transaction.referencedTransactionFullHash !== ""', transaction, data);
      return false;
    }

    if (transaction.version > 0) {
      //has empty attachment, so no attachmentVersion byte...
      if (requestType == "sendMoney" || requestType == "sendMessage") {
        var pos = 176;
      } 
      else {
        var pos = 177;
      }
    } 
    else {
      var pos = 160;
    }

    switch (requestType) {
      case "sendMoney":
        if (transaction.type !== 0 || transaction.subtype !== 0) {
          console.log('verifyAndSignTransactionBytes.failed | transaction.type !== 0 || transaction.subtype !== 0', transaction);
          return false;
        }
        break;
      case "sendMessage":
        if (transaction.type !== 1 || transaction.subtype !== 0) {
          return false;
        }
        break;
      case "setAlias":
        if (transaction.type !== 1 || transaction.subtype !== 1) {
          return false;
        }

        var aliasLength = parseInt(byteArray[pos], 10);
        pos++;
        transaction.aliasName = converters.byteArrayToString(byteArray, pos, aliasLength);
        pos += aliasLength;
        var uriLength = converters.byteArrayToSignedShort(byteArray, pos);
        pos += 2;
        transaction.aliasURI = converters.byteArrayToString(byteArray, pos, uriLength);
        pos += uriLength;
        if (transaction.aliasName !== data.aliasName || transaction.aliasURI !== data.aliasURI) {
          return false;
        }
        break;
      case "setNamespacedAlias":
        if (transaction.type !== 40 || transaction.subtype !== 0) {
          return false;
        }

        var aliasLength = parseInt(byteArray[pos], 10);
        pos++;
        transaction.aliasName = converters.byteArrayToString(byteArray, pos, aliasLength);
        pos += aliasLength;
        var uriLength = converters.byteArrayToSignedShort(byteArray, pos);
        pos += 2;
        transaction.aliasURI = converters.byteArrayToString(byteArray, pos, uriLength);
        pos += uriLength;
        if (transaction.aliasName !== data.aliasName || transaction.aliasURI !== data.aliasURI) {
          return false;
        }
        break;
      case "createPoll":
        if (transaction.type !== 1 || transaction.subtype !== 2) {
          return false;
        }

        var nameLength = converters.byteArrayToSignedShort(byteArray, pos);
        pos += 2;
        transaction.name = converters.byteArrayToString(byteArray, pos, nameLength);
        pos += nameLength;
        var descriptionLength = converters.byteArrayToSignedShort(byteArray, pos);
        pos += 2;
        transaction.description = converters.byteArrayToString(byteArray, pos, descriptionLength);
        pos += descriptionLength;
        var nr_options = byteArray[pos];
        pos++;
        for (var i = 0; i < nr_options; i++) {
          var optionLength = converters.byteArrayToSignedShort(byteArray, pos);
          pos += 2;
          transaction["option" + i] = converters.byteArrayToString(byteArray, pos, optionLength);
          pos += optionLength;
        }

        transaction.minNumberOfOptions = String(byteArray[pos]);
        pos++;
        transaction.maxNumberOfOptions = String(byteArray[pos]);
        pos++;
        transaction.optionsAreBinary = String(byteArray[pos]);
        pos++;

        if (transaction.name !== data.name || transaction.description !== data.description || 
            transaction.minNumberOfOptions !== data.minNumberOfOptions || 
            transaction.maxNumberOfOptions !== data.maxNumberOfOptions || 
            transaction.optionsAreBinary !== data.optionsAreBinary) {
          return false;
        }

        for (var i = 0; i < nr_options; i++) {
          if (transaction["option" + i] !== data["option" + i]) {
            return false;
          }
        }

        if (("option" + i) in data) {
          return false;
        }
        break;
      case "castVote":
        if (transaction.type !== 1 || transaction.subtype !== 3) {
          return false;
        }

        transaction.poll = String(converters.byteArrayToBigInteger(byteArray, pos));
        pos += 8;
        var voteLength = byteArray[pos];
        pos++;
        transaction.votes = [];
        for (var i = 0; i < voteLength; i++) {
          transaction.votes.push(byteArray[pos]);
          pos++;
        }
        return false;

        break;
      case "hubAnnouncement":
        if (transaction.type !== 1 || transaction.subtype != 4) {
          return false;
        }

        var minFeePerByte = String(converters.byteArrayToBigInteger(byteArray, pos));
        pos += 8;
        var numberOfUris = parseInt(byteArray[pos], 10);
        pos++;
        var uris = [];
        for (var i = 0; i < numberOfUris; i++) {
          var uriLength = parseInt(byteArray[pos], 10);
          pos++;
          uris[i] = converters.byteArrayToString(byteArray, pos, uriLength);
          pos += uriLength;
        }

        //do validation

        return false;

        break;
      case "setAccountInfo":
        if (transaction.type !== 1 || transaction.subtype != 5) {
          return false;
        }

        var nameLength = parseInt(byteArray[pos], 10);
        pos++;
        transaction.name = converters.byteArrayToString(byteArray, pos, nameLength);
        pos += nameLength;
        var descriptionLength = converters.byteArrayToSignedShort(byteArray, pos);
        pos += 2;
        transaction.description = converters.byteArrayToString(byteArray, pos, descriptionLength);
        pos += descriptionLength;
        if (transaction.name !== data.name || transaction.description !== data.description) {
          return false;
        }

        break;
      case "sellAlias":
        if (transaction.type !== 1 || transaction.subtype !== 6) {
          return false;
        }

        var aliasLength = parseInt(byteArray[pos], 10);
        pos++;
        transaction.alias = converters.byteArrayToString(byteArray, pos, aliasLength);
        pos += aliasLength;
        transaction.priceNQT = String(converters.byteArrayToBigInteger(byteArray, pos));
        pos += 8;
        if (transaction.alias !== data.aliasName || transaction.priceNQT !== data.priceNQT) {
          return false;
        }

        break;
      case "buyAlias":
        if (transaction.type !== 1 && transaction.subtype !== 7) {
          return false;
        }

        var aliasLength = parseInt(byteArray[pos], 10);
        pos++;
        transaction.alias = converters.byteArrayToString(byteArray, pos, aliasLength);
        pos += aliasLength;
        if (transaction.alias !== data.aliasName) {
          return false;
        }

        break;
      case "issueAsset":
        if (transaction.type !== 2 || transaction.subtype !== 0) {
          return false;
        }

        var nameLength = byteArray[pos];
        pos++;
        transaction.name = converters.byteArrayToString(byteArray, pos, nameLength);
        pos += nameLength;
        var descriptionLength = converters.byteArrayToSignedShort(byteArray, pos);
        pos += 2;
        transaction.description = converters.byteArrayToString(byteArray, pos, descriptionLength);
        pos += descriptionLength;
        transaction.quantityQNT = String(converters.byteArrayToBigInteger(byteArray, pos));
        pos += 8;
        transaction.decimals = byteArray[pos];
        pos++;

        if (transaction.name !== data.name || transaction.description !== data.description || 
            transaction.quantityQNT !== data.quantityQNT || transaction.decimals !== data.decimals) {
          return false;
        }

        break;
      case "transferAsset":
        if (transaction.type !== 2 || transaction.subtype !== 1) {
          return false;
        }

        transaction.asset = String(converters.byteArrayToBigInteger(byteArray, pos));
        pos += 8;
        transaction.quantityQNT = String(converters.byteArrayToBigInteger(byteArray, pos));
        pos += 8;
        if (transaction.asset !== data.asset || transaction.quantityQNT !== data.quantityQNT) {
          return false;
        }
        break;
      case "addPrivateAssetAccount":
        if (transaction.type !== 40 || transaction.subtype !== 1) {
          return false;
        }
        transaction.asset = String(converters.byteArrayToBigInteger(byteArray, pos));
        pos += 8;
        if (transaction.asset !== data.asset) {
          return false;
        }
        break;
      case "removePrivateAssetAccount":
        if (transaction.type !== 40 || transaction.subtype !== 2) {
          return false;
        }
        transaction.asset = String(converters.byteArrayToBigInteger(byteArray, pos));
        pos += 8;
        if (transaction.asset !== data.asset) {
          return false;
        }
        break;
      case "setPrivateAssetFee":
        if (transaction.type !== 40 || transaction.subtype !== 3) {
          return false;
        }
        transaction.asset = String(converters.byteArrayToBigInteger(byteArray, pos));
        pos += 8;
        transaction.orderFeePercentage = String(converters.byteArrayToSignedInt32(byteArray, pos));
        pos += 4;
        transaction.tradeFeePercentage = String(converters.byteArrayToSignedInt32(byteArray, pos));
        pos += 4;
        if (transaction.asset !== data.asset || transaction.orderFeePercentage !== data.orderFeePercentage ||
            transaction.tradeFeePercentage !== data.tradeFeePercentage) {
          return false;
        }
        break;
      case "placeAskOrder":
      case "placeBidOrder":
        if (transaction.type !== 2) {
          return false;
        } 
        else if (requestType == "placeAskOrder" && transaction.subtype !== 2) {
          return false;
        } 
        else if (requestType == "placeBidOrder" && transaction.subtype !== 3) {
          return false;
        }

        transaction.asset = String(converters.byteArrayToBigInteger(byteArray, pos));
        pos += 8;
        transaction.quantityQNT = String(converters.byteArrayToBigInteger(byteArray, pos));
        pos += 8;
        transaction.priceNQT = String(converters.byteArrayToBigInteger(byteArray, pos));
        pos += 8;

        if (transaction.asset !== data.asset || transaction.quantityQNT !== data.quantityQNT || 
            transaction.priceNQT !== data.priceNQT) {
          return false;
        }
        break;
      case "cancelAskOrder":
      case "cancelBidOrder":
        if (transaction.type !== 2) {
          return false;
        } 
        else if (requestType == "cancelAskOrder" && transaction.subtype !== 4) {
          return false;
        } 
        else if (requestType == "cancelBidOrder" && transaction.subtype !== 5) {
          return false;
        }

        transaction.order = String(converters.byteArrayToBigInteger(byteArray, pos));
        pos += 8;
        if (transaction.order !== data.order) {
          return false;
        }

        break;
      case "dgsListing":
        if (transaction.type !== 3 && transaction.subtype != 0) {
          return false;
        }

        var nameLength = converters.byteArrayToSignedShort(byteArray, pos);
        pos += 2;
        transaction.name = converters.byteArrayToString(byteArray, pos, nameLength);
        pos += nameLength;
        var descriptionLength = converters.byteArrayToSignedShort(byteArray, pos);
        pos += 2;
        transaction.description = converters.byteArrayToString(byteArray, pos, descriptionLength);
        pos += descriptionLength;
        var tagsLength = converters.byteArrayToSignedShort(byteArray, pos);
        pos += 2;
        transaction.tags = converters.byteArrayToString(byteArray, pos, tagsLength);
        pos += tagsLength;
        transaction.quantity = String(converters.byteArrayToSignedInt32(byteArray, pos));
        pos += 4;
        transaction.priceNQT = String(converters.byteArrayToBigInteger(byteArray, pos));
        pos += 8;

        if (transaction.name !== data.name || transaction.description !== data.description || 
            transaction.tags !== data.tags || transaction.quantity !== data.quantity || 
            transaction.priceNQT !== data.priceNQT) {
          return false;
        }

        break;
      case "dgsDelisting":
        if (transaction.type !== 3 && transaction.subtype !== 1) {
          return false;
        }

        transaction.goods = String(converters.byteArrayToBigInteger(byteArray, pos));
        pos += 8;
        if (transaction.goods !== data.goods) {
          return false;
        }

        break;
      case "dgsPriceChange":
        if (transaction.type !== 3 && transaction.subtype !== 2) {
          return false;
        }

        transaction.goods = String(converters.byteArrayToBigInteger(byteArray, pos));
        pos += 8;
        transaction.priceNQT = String(converters.byteArrayToBigInteger(byteArray, pos));
        pos += 8;
        if (transaction.goods !== data.goods || transaction.priceNQT !== data.priceNQT) {
          return false;
        }

        break;
      case "dgsQuantityChange":
        if (transaction.type !== 3 && transaction.subtype !== 3) {
          return false;
        }

        transaction.goods = String(converters.byteArrayToBigInteger(byteArray, pos));
        pos += 8;
        transaction.deltaQuantity = String(converters.byteArrayToSignedInt32(byteArray, pos));
        pos += 4;
        if (transaction.goods !== data.goods || transaction.deltaQuantity !== data.deltaQuantity) {
          return false;
        }

        break;
      case "dgsPurchase":
        if (transaction.type !== 3 && transaction.subtype !== 4) {
          return false;
        }

        transaction.goods = String(converters.byteArrayToBigInteger(byteArray, pos));
        pos += 8;
        transaction.quantity = String(converters.byteArrayToSignedInt32(byteArray, pos));
        pos += 4;
        transaction.priceNQT = String(converters.byteArrayToBigInteger(byteArray, pos));
        pos += 8;
        transaction.deliveryDeadlineTimestamp = String(converters.byteArrayToSignedInt32(byteArray, pos));
        pos += 4;

        if (transaction.goods !== data.goods || transaction.quantity !== data.quantity || 
            transaction.priceNQT !== data.priceNQT || 
            transaction.deliveryDeadlineTimestamp !== data.deliveryDeadlineTimestamp) {
          return false;
        }

        break;
      case "dgsDelivery":
        if (transaction.type !== 3 && transaction.subtype !== 5) {
          return false;
        }

        transaction.purchase = String(converters.byteArrayToBigInteger(byteArray, pos));
        pos += 8;
        var encryptedGoodsLength = converters.byteArrayToSignedShort(byteArray, pos);
        var goodsLength = converters.byteArrayToSignedInt32(byteArray, pos);
        transaction.goodsIsText = goodsLength < 0; // ugly hack??
        if (goodsLength < 0) {
          goodsLength &= 2147483647;
        }

        pos += 4;
        transaction.goodsData = converters.byteArrayToHexString(byteArray.slice(pos, pos + encryptedGoodsLength));
        pos += encryptedGoodsLength;
        transaction.goodsNonce = converters.byteArrayToHexString(byteArray.slice(pos, pos + 32));
        pos += 32;
        transaction.discountNQT = String(converters.byteArrayToBigInteger(byteArray, pos));
        pos += 8;
        var goodsIsText = (transaction.goodsIsText ? "true" : "false");
        if (goodsIsText != data.goodsIsText) {
          return false;
        }

        if (transaction.purchase !== data.purchase || transaction.goodsData !== data.goodsData || 
            transaction.goodsNonce !== data.goodsNonce || transaction.discountNQT !== data.discountNQT) {
          return false;
        }

        break;
      case "dgsFeedback":
        if (transaction.type !== 3 && transaction.subtype !== 6) {
          return false;
        }

        transaction.purchase = String(converters.byteArrayToBigInteger(byteArray, pos));
        pos += 8;
        if (transaction.purchase !== data.purchase) {
          return false;
        }

        break;
      case "dgsRefund":
        if (transaction.type !== 3 && transaction.subtype !== 7) {
          return false;
        }

        transaction.purchase = String(converters.byteArrayToBigInteger(byteArray, pos));
        pos += 8;
        transaction.refundNQT = String(converters.byteArrayToBigInteger(byteArray, pos));
        pos += 8;
        if (transaction.purchase !== data.purchase || transaction.refundNQT !== data.refundNQT) {
          return false;
        }

        break;
      case "leaseBalance":
        if (transaction.type !== 4 && transaction.subtype !== 0) {
          return false;
        }

        transaction.period = String(converters.byteArrayToSignedShort(byteArray, pos));
        pos += 2;

        if (transaction.period !== data.period) {
          return false;
        }

        break;
      default:
        //invalid requestType..
        return false;
    }

    var position = 1;

    //non-encrypted message
    if ((transaction.flags & position) != 0 || (requestType == "sendMessage" && data.message)) {
      var attachmentVersion = byteArray[pos];
      pos++;
      var messageLength = converters.byteArrayToSignedInt32(byteArray, pos);
      transaction.messageIsText = messageLength < 0; // ugly hack??

      if (messageLength < 0) {
        messageLength &= 2147483647;
      }

      pos += 4;
      if (transaction.messageIsText) {
        transaction.message = converters.byteArrayToString(byteArray, pos, messageLength);
      } 
      else {
        var slice = byteArray.slice(pos, pos + messageLength);
        transaction.message = converters.byteArrayToHexString(slice);
      }

      pos += messageLength;
      var messageIsText = (transaction.messageIsText ? "true" : "false");
      if (messageIsText != data.messageIsText) {
        return false;
      }

      if (transaction.message !== data.message) {
        return false;
      }
    } 
    else if (data.message) {
      return false;
    }

    position <<= 1;

    //encrypted note
    if ((transaction.flags & position) != 0) {
      var attachmentVersion = byteArray[pos];
      pos++;
      var encryptedMessageLength = converters.byteArrayToSignedInt32(byteArray, pos);
      transaction.messageToEncryptIsText = encryptedMessageLength < 0;

      if (encryptedMessageLength < 0) {
        encryptedMessageLength &= 2147483647; // http://en.wikipedia.org/wiki/2147483647
      }

      pos += 4;
      transaction.encryptedMessageData = converters.byteArrayToHexString(byteArray.slice(pos, pos + encryptedMessageLength));
      pos += encryptedMessageLength;
      transaction.encryptedMessageNonce = converters.byteArrayToHexString(byteArray.slice(pos, pos + 32));
      pos += 32;
      var messageToEncryptIsText = (transaction.messageToEncryptIsText ? "true" : "false");
      if (messageToEncryptIsText != data.messageToEncryptIsText) {
        return false;
      }

      if (transaction.encryptedMessageData !== data.encryptedMessageData || transaction.encryptedMessageNonce !== data.encryptedMessageNonce) {
        return false;
      }
    } 
    else if (data.encryptedMessageData) {
      return false;
    }

    position <<= 1;

    if ((transaction.flags & position) != 0) {
      var attachmentVersion = byteArray[pos];
      pos++;
      var recipientPublicKey = converters.byteArrayToHexString(byteArray.slice(pos, pos + 32));
      if (recipientPublicKey != data.recipientPublicKey) {
        return false;
      }
      pos += 32;
    } 
    else if (data.recipientPublicKey) {
      return false;
    }

    position <<= 1;

    if ((transaction.flags & position) != 0) {
      var attachmentVersion = byteArray[pos];
      pos++;
      var encryptedToSelfMessageLength = converters.byteArrayToSignedInt32(byteArray, pos);
      transaction.messageToEncryptToSelfIsText = encryptedToSelfMessageLength < 0;

      if (encryptedToSelfMessageLength < 0) {
        encryptedToSelfMessageLength &= 2147483647;
      }

      pos += 4;
      transaction.encryptToSelfMessageData = converters.byteArrayToHexString(byteArray.slice(pos, pos + encryptedToSelfMessageLength));
      pos += encryptedToSelfMessageLength;
      transaction.encryptToSelfMessageNonce = converters.byteArrayToHexString(byteArray.slice(pos, pos + 32));
      pos += 32;

      var messageToEncryptToSelfIsText = (transaction.messageToEncryptToSelfIsText ? "true" : "false");
      if (messageToEncryptToSelfIsText != data.messageToEncryptToSelfIsText) {
        return false;
      }

      if (transaction.encryptToSelfMessageData !== data.encryptToSelfMessageData || 
          transaction.encryptToSelfMessageNonce !== data.encryptToSelfMessageNonce) {
        return false;
      }
    } 
    else if (data.encryptToSelfMessageData) {
      return false;
    }

    return transactionBytes.substr(0, 192) + signature + transactionBytes.substr(320);
  };

  // /////////////////////////////////////////////////////////////////////////////////////////////
  // /////////////////////////////////////////////////////////////////////////////////////////////
  //
  //
  //
  //
  // Start Crypto
  //
  //
  //
  //
  // /////////////////////////////////////////////////////////////////////////////////////////////
  // /////////////////////////////////////////////////////////////////////////////////////////////

  function Crypto(_type, api) {
    var self = this;
    var _sharedKeys = {};
    var _hash = {
      init: SHA256_init,
      update: SHA256_write,
      getBytes: SHA256_finalize
    };

    /**
     * @param unsignedTransaction hex-string
     * @param signature hex-string
     * @returns hex-string 
     */
    this.calculateFullHash = function (unsignedTransaction, signature) {
      var unsignedTransactionBytes = converters.hexStringToByteArray(unsignedTransaction);
      var signatureBytes = converters.hexStringToByteArray(signature);
      var signatureHash = simpleHash(signatureBytes);

      _hash.init();
      _hash.update(unsignedTransactionBytes);
      _hash.update(signatureHash);      
      var fullHash = _hash.getBytes();
      
      return converters.byteArrayToHexString(fullHash);
    }

    /**
     * @param fullHashHex hex-string
     * @returns string
     */
    this.calculateTransactionId = function (fullHashHex) {
      var slice         = (converters.hexStringToByteArray(fullHashHex)).slice(0, 8);
      var transactionId = byteArrayToBigInteger(slice).toString();
      return transactionId;
    }

    /**
     * @param secretPhrase Ascii String
     * @returns hex-string 
     */
    this.secretPhraseToPublicKey = function (secretPhrase) {
      var secretHex = converters.stringToHexString(secretPhrase);
      var secretPhraseBytes = converters.hexStringToByteArray(secretHex);
      var digest = simpleHash(secretPhraseBytes);
      return converters.byteArrayToHexString(curve25519.keygen(digest).p);
    }

    /**
     * @param secretPhrase Ascii String
     * @returns hex-string 
     */
    this.getPrivateKey = function (secretPhrase) {
      SHA256_init();
      SHA256_write(converters.stringToByteArray(secretPhrase));
      return converters.shortArrayToHexString(curve25519_clamp(converters.byteArrayToShortArray(SHA256_finalize())));
    }

    /**
     * @param secretPhrase Ascii String
     * @returns String 
     */
    this.getAccountId = function (secretPhrase, RSFormat) {
      var publicKey = this.secretPhraseToPublicKey(secretPhrase);
      return this.getAccountIdFromPublicKey(publicKey, RSFormat);
    }

    /**
     * @param secretPhrase Hex String
     * @returns String 
     */  
    this.getAccountIdFromPublicKey = function (publicKey, RSFormat) {
      _hash.init();
      _hash.update(converters.hexStringToByteArray(publicKey));

      var account   = _hash.getBytes();
      var slice     = (converters.hexStringToByteArray(converters.byteArrayToHexString(account))).slice(0, 8);
      var accountId = byteArrayToBigInteger(slice).toString();

      if (RSFormat) {
        var address = api.createAddress();
        return address.set(accountId) ? address.toString() : '';
      } 
      return accountId;
    }

    /**
     * @param key1 ByteArray
     * @param key2 ByteArray
     * @returns ByteArray 
     */
    function getSharedKey(key1, key2) {
      return converters.shortArrayToByteArray(
                curve25519_(converters.byteArrayToShortArray(key1), 
                            converters.byteArrayToShortArray(key2), null));
    }
    this.getSharedKey = getSharedKey;

    /**
     * @param message       Hex String
     * @param secretPhrase  Hex String
     * @returns Hex String
     */
    this.signBytes = function (message, secretPhrase) {
      var messageBytes      = converters.hexStringToByteArray(message);
      var secretPhraseBytes = converters.hexStringToByteArray(secretPhrase);

      var digest = simpleHash(secretPhraseBytes);
      var s = curve25519.keygen(digest).s;
      var m = simpleHash(messageBytes);

      _hash.init();
      _hash.update(m);
      _hash.update(s);
      var x = _hash.getBytes();

      var y = curve25519.keygen(x).p;

      _hash.init();
      _hash.update(m);
      _hash.update(y);
      var h = _hash.getBytes();

      var v = curve25519.sign(h, x, s);

      return converters.byteArrayToHexString(v.concat(h));
    }

    /**
     * @param signature     Hex String
     * @param message       Hex String
     * @param publicKey     Hex String
     * @returns Boolean
     */
    this.verifyBytes = function (signature, message, publicKey) {
      var signatureBytes  = converters.hexStringToByteArray(signature);
      var messageBytes    = converters.hexStringToByteArray(message);
      var publicKeyBytes  = converters.hexStringToByteArray(publicKey);
      var v = signatureBytes.slice(0, 32);
      var h = signatureBytes.slice(32);
      var y = curve25519.verify(v, h, publicKeyBytes);

      var m = simpleHash(messageBytes);

      _hash.init();
      _hash.update(m);
      _hash.update(y);
      var h2 = _hash.getBytes();

      return areByteArraysEqual(h, h2);
    }

    /**
     * @param message ByteArray
     * @returns ByteArray
     */
    function simpleHash(message) {
      _hash.init();
      _hash.update(message);
      return _hash.getBytes();
    }

    /**
     * @param bytes1 ByteArray
     * @param bytes2 ByteArray   
     * @returns Boolean
     */
    function areByteArraysEqual(bytes1, bytes2) {
      if (bytes1.length !== bytes2.length) {
        return false;
      }
      for (var i = 0; i < bytes1.length; ++i) {
        if (bytes1[i] !== bytes2[i])
          return false;
      }
      return true;
    }

    /**
     * @param curve ShortArray
     * @returns ShortArray
     */
    function curve25519_clamp(curve) {
      curve[0] &= 0xFFF8;
      curve[15] &= 0x7FFF;
      curve[15] |= 0x4000;
      return curve;
    }

    /**
     * @param byteArray ByteArray
     * @param startIndex Int
     * @returns BigInteger
     */
    function byteArrayToBigInteger(byteArray, startIndex) {
      var value = new BigInteger("0", 10);
      var temp1, temp2;
      for (var i = byteArray.length - 1; i >= 0; i--) {
        temp1 = value.multiply(new BigInteger("256", 10));
        temp2 = temp1.add(new BigInteger(byteArray[i].toString(10), 10));
        value = temp2;
      }
      return value;
    }

    function aesEncrypt(plaintext, options) {
      if (!window.crypto && !window.msCrypto) {
        throw new Error('FIX ME !! Should use mouse initiated seed!!!'); // 
      }

      // CryptoJS likes WordArray parameters
      var text = converters.byteArrayToWordArray(plaintext);

      if (!options.sharedKey) {
        var sharedKey = getSharedKey(options.privateKey, options.publicKey);
      } else {
        var sharedKey = options.sharedKey.slice(0); //clone
      }

      for (var i = 0; i < 32; i++) {
        sharedKey[i] ^= options.nonce[i];
      }

      var key = CryptoJS.SHA256(converters.byteArrayToWordArray(sharedKey));

      var tmp = new Uint8Array(16);

      if (window.crypto) {
        window.crypto.getRandomValues(tmp);
      } else {
        window.msCrypto.getRandomValues(tmp);
      }

      var iv = converters.byteArrayToWordArray(tmp);
      var encrypted = CryptoJS.AES.encrypt(text, key, {
        iv: iv
      });

      var ivOut = converters.wordArrayToByteArray(encrypted.iv);

      var ciphertextOut = converters.wordArrayToByteArray(encrypted.ciphertext);

      return ivOut.concat(ciphertextOut);
    }

    function aesDecrypt(ivCiphertext, options) {
      if (ivCiphertext.length < 16 || ivCiphertext.length % 16 != 0) {
        throw {
          name: "invalid ciphertext"
        };
      }

      var iv = converters.byteArrayToWordArray(ivCiphertext.slice(0, 16));
      var ciphertext = converters.byteArrayToWordArray(ivCiphertext.slice(16));

      if (!options.sharedKey) {
        var sharedKey = getSharedKey(options.privateKey, options.publicKey);
      } else {
        var sharedKey = options.sharedKey.slice(0); //clone
      }

      for (var i = 0; i < 32; i++) {
        sharedKey[i] ^= options.nonce[i];
      }

      var key = CryptoJS.SHA256(converters.byteArrayToWordArray(sharedKey));

      var encrypted = CryptoJS.lib.CipherParams.create({
        ciphertext: ciphertext,
        iv: iv,
        key: key
      });

      var decrypted = CryptoJS.AES.decrypt(encrypted, key, {
        iv: iv
      });

      var plaintext = converters.wordArrayToByteArray(decrypted);

      return plaintext;
    }

    function encryptData(plaintext, options) {
      if (!window.crypto && !window.msCrypto) {
        throw {
          "errorCode": -1,
          "message": $.t("error_encryption_browser_support")
        };
      }

      if (!options.sharedKey) {
        options.sharedKey = getSharedKey(options.privateKey, options.publicKey);
      }

      var compressedPlaintext = pako.gzip(new Uint8Array(plaintext));

      options.nonce = new Uint8Array(32);

      if (window.crypto) {
        window.crypto.getRandomValues(options.nonce);
      } else {
        window.msCrypto.getRandomValues(options.nonce);
      }

      var data = aesEncrypt(compressedPlaintext, options);

      return {
        "nonce": options.nonce,
        "data": data
      };
    }

    function decryptData(data, options) {
      if (!options.sharedKey) {
        options.sharedKey = getSharedKey(options.privateKey, options.publicKey);
      }

      var compressedPlaintext = aesDecrypt(data, options);
      var binData = new Uint8Array(compressedPlaintext);
      var data = pako.inflate(binData);

      return converters.byteArrayToString(data);
    }
    this.decryptData = decryptData;

    /**
     * @param message String 
     * @param options Object { 
     *    account: String,    // recipient account id
     *    publicKey: String,  // recipient public key
     * }
     * @param secretPhrase String
     * @returns { message: String, nonce: String }
     */
    this.encryptNote = function(message, options, secretPhrase) {
      if (!options.sharedKey) {
        if (!options.privateKey) {
          options.privateKey = converters.hexStringToByteArray(this.getPrivateKey(secretPhrase));
        }
        if (!options.publicKey) {
          throw new Error('Missing publicKey argument');
        } 
        else if (typeof options.publicKey == "string") {
          options.publicKey = converters.hexStringToByteArray(options.publicKey);
        }
      }

      var encrypted = encryptData(converters.stringToByteArray(message), options);

      return {
        "message": converters.byteArrayToHexString(encrypted.data),
        "nonce": converters.byteArrayToHexString(encrypted.nonce)
      };
    }
  };

  /* Return the factory instance */
  return INSTANCE;

});
})();