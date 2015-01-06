/**
 * The nxt service embodies all interactions with both the NXT protocol and the 
 * public FIM/NXT nodes. The request management (connecting with public nodes) and 
 * the promise based javascript API are additions made for MofoWallet.
 *
 * A substantial part concerning mostly encryption and the byte level transaction
 * handling is based on the original NXT wallet version 1.2.6.
 *
 * Usage:
 *
 *   // You need a reference to the service for these samples
 *   // To get a reference to an *engine* provide either the engine id or an account id.
 *   var api = nxt.get('FIM-XXXX-AAAA-BB**');
 *   var api = nxt.get('TYPE_FIM');
 *   var api = nxt.get('TYPE_NXT');
 *
 *   // The nxt.get() method returns a ServerAPI object which is smart since it extends itself
 *   // to include all available NXT API methods as methods on itself.
 *   // The JS API is configured through a config object that declares inputs and outputs
 *   // for each method. @see NXT_API
 *   api.getState();
 *   api.sendMoney({sender:123455, recipient: 23456, amountNQT: 1000000});
 *   api.getBlockId({height: 250001})
 *
 *   // All NXT API methods return a Promise that resolves when the API call (network)
 *   // returns. API methods can have instructions in their config that indicate how to 
 *   // transform or filter the returned data.
 *   api.getState().then(function (state) {
 *     console.log('numberOfBlocks', state.numberOfBlocks)
 *     console.log('version', state.version)
 *   })
 */
(function () {
'use strict';

var DEBUG = false;

var module = angular.module('fim.base');
module.factory('nxt', function ($modal, $http, $q, modals, i18n, alerts, db, settings, $timeout, $sce, serverService, corsproxy, plugins, requests) {

  var BLACKLIST_MILLISECONDS = Number.MAX_VALUE;
  var BLOCKCHAIN_STATUS_MILLISECONDS = Number.MAX_VALUE;
  
  var HTTP_TIMEOUT_SHORT = Number.MAX_VALUE;
  var HTTP_TIMEOUT_LONG = Number.MAX_VALUE;
  var TIMEOUT_SHORT = function () { return HTTP_TIMEOUT_SHORT; };
  var TIMEOUT_LONG = function () { return HTTP_TIMEOUT_LONG; };

  var FAILED_RETRIES = 0;

  /* Register settings */
  settings.initialize([{
    id: 'nxt.request.failed.retries',
    value: 10, /* lots of failing public nxt nodes */
    type: Number,
    label: 'Failed request retry count',
    resolve: function (value) {
      FAILED_RETRIES = value;
    }
  },{
    id: 'nxt.http.timeout.short',
    value: (5 * 1000),
    type: Number,
    label: 'HTTP timeout short',
    resolve: function (value) {
      HTTP_TIMEOUT_SHORT = value;
    }
  },{
    id: 'nxt.http.timeout.long',
    value: (15 * 1000),
    type: Number,
    label: 'HTTP timeout long',
    resolve: function (value) {
      HTTP_TIMEOUT_LONG = value;
    }
  },{
    id: 'nxt.blacklist.milliseconds',
    value: (15 * 1000),
    type: Number,
    label: 'Blacklist timeout',
    resolve: function (value) {
      BLACKLIST_MILLISECONDS = value;
    }
  }, {
    id: 'nxt.blockchain.status.milliseconds',
    value: (15 * 1000),
    type: Number,
    label: 'Blockchain status interval',
    resolve: function (value) {
      BLOCKCHAIN_STATUS_MILLISECONDS = value;
    }
  }, {
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
  }, {
    id: 'fim.localhost.force',
    value: false,
    type: Boolean,
    label: 'fim force localhost',
    resolve: function (value) {
      INSTANCE.fim().engine.must_use_localhost = value;
    }
  }, {
    id: 'nxt.localhost.force',
    value: false,
    type: Boolean,
    label: 'nxt force localhost',
    resolve: function (value) {
      INSTANCE.nxt().engine.must_use_localhost = value;
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
      return this.api[TYPE_NXT] || (this.api[TYPE_NXT] = new ServerAPI(TYPE_NXT, false /* isTestnet */));
    },
    fim: function () {
      return this.api[TYPE_FIM] || (this.api[TYPE_FIM] = new ServerAPI(TYPE_FIM, false /* isTestnet */));
    },
    get: function (arg) {
      if (arg == TYPE_NXT || arg.indexOf('NXT-')==0) {
        return this.nxt();
      }
      if (arg == TYPE_FIM || arg.indexOf('FIM-')==0) {
        return this.fim();
      }
      console.log('Could not determine engine', arg);
    },
    crypto: function (arg) {
      if (arg == TYPE_NXT || arg.indexOf('NXT-')==0) {
        return this.nxt().crypto;
      }
      if (arg == TYPE_FIM || arg.indexOf('FIM-')==0) {
        return this.fim().crypto;
      }
      console.log('Could not determine engine', arg);      
    }
  };

  var TRANSACTION_ARGS = {
    dontBroadcast:                {type: Boolean, argument: false},
    sender:                       {type: String, argument: false},
    senderRS:                     {type: String, argument: false},
    engine:                       {type: String, argument: false},
    publicKey:                    {type: String}, // sender public key
    secretPhrase:                 {type: String},
    message:                      {type: String},
    messageIsText:                {type: String},
    feeNQT:                       {type: String, required: true},
    deadline:                     {type: String, required: true},
    encryptedMessageData:         {type: String},
    encryptedMessageNonce:        {type: String},
    messageToEncrypt:             {type: String},
    messageToEncryptIsText:       {type: String},
    encryptToSelfMessageData:     {type: String},
    encryptToSelfMessageNonce:    {type: String},
    messageToEncryptToSelf:       {type: String},
    messageToEncryptToSelfIsText: {type: String},
    note_to_self:                 {type: Boolean, argument: false},
    encrypt_message:              {type: Boolean, argument: false},
    public_message:               {type: Boolean, argument: false}
  }

  var canceller = $q.defer();
  var NXT_API = {
    getAccountTransactions: {
      args: {
        account:    {type: String, required: true}, 
        timestamp:  {type: Number},
        type:       {type: Number},
        subtype:    {type: Number}, 
        firstIndex: {type: Number},
        lastIndex:  {type: Number}
      },
      returns: {
        property: 'transactions'
      }
    },
    getAccountTransactionIds: {
      args: {
        account:    {type: String, required: true}, 
        timestamp:  {type: Number},
        type:       {type: Number},
        subtype:    {type: Number}, 
        firstIndex: {type: Number},
        lastIndex:  {type: Number}
      },
      returns: {
        property: 'transactionIds'
      }
    },
    getUnconfirmedTransactions: {
      args: {
        account:    {type: String, required: true}
      },
      returns: {
        property: 'unconfirmedTransactions'
      }
    },
    getBalance: {
      args: {
        account:      {type: String, required: true}
      }
    },
    getAccount: {
      args: {
        account:      {type: String, required: true} 
      }
    },
    startForging: {
      args: {
        secretPhrase: {type: String, required: true},
        sender:       {type: String, argument: false}
      }
    },
    stopForging: {
      args: {
        secretPhrase: {type: String, required: true},
        sender:       {type: String, argument: false}
      }
    },
    getForging: {
      args: {
        secretPhrase: {type: String, required: true},
        sender:       {type: String, argument: false}
      }
    }, 
    sendMoney: {
      args: {
        sender:                       {type: String, argument: false},
        senderRS:                     {type: String, argument: false},
        engine:                       {type: String, argument: false},
        dontBroadcast:                {type: Boolean, argument: false},
        publicKey:                    {type: String}, // sender public key
        secretPhrase:                 {type: String},
        recipient:                    {type: String},
        recipientRS:                  {type: String},
        recipientPublicKey:           {type: String},
        message:                      {type: String},
        messageIsText:                {type: String},
        amountNQT:                    {type: String, required: true},
        feeNQT:                       {type: String, required: true},
        deadline:                     {type: String, required: true},
        encryptedMessageData:         {type: String},
        encryptedMessageNonce:        {type: String},
        messageToEncrypt:             {type: String},
        messageToEncryptIsText:       {type: String},
        encryptToSelfMessageData:     {type: String},
        encryptToSelfMessageNonce:    {type: String},
        messageToEncryptToSelf:       {type: String},
        messageToEncryptToSelfIsText: {type: String},
        note_to_self:                 {type: Boolean, argument: false},
        encrypt_message:              {type: Boolean, argument: false},
        public_message:               {type: Boolean, argument: false}
      }
    },
    sendMessage: {
      args: {
        sender:                       {type: String, argument: false},
        senderRS:                     {type: String, argument: false},
        engine:                       {type: String, argument: false},
        dontBroadcast:                {type: Boolean, argument: false},
        publicKey:                    {type: String}, // sender public key
        secretPhrase:                 {type: String},
        recipient:                    {type: String},
        recipientRS:                  {type: String},
        recipientPublicKey:           {type: String},
        message:                      {type: String},
        messageIsText:                {type: String},
        feeNQT:                       {type: String, required: true},
        deadline:                     {type: String, required: true},
        encryptedMessageData:         {type: String},
        encryptedMessageNonce:        {type: String},
        messageToEncrypt:             {type: String},
        messageToEncryptIsText:       {type: String},
        encryptToSelfMessageData:     {type: String},
        encryptToSelfMessageNonce:    {type: String},
        messageToEncryptToSelf:       {type: String},
        messageToEncryptToSelfIsText: {type: String},
        note_to_self:                 {type: Boolean, argument: false},
        encrypt_message:              {type: Boolean, argument: false},
        public_message:               {type: Boolean, argument: false}
      }
    },  
    placeAskOrder: {
      args: angular.extend({
        asset:        {type: String, required: true},
        quantityQNT:  {type: String, required: true},
        priceNQT:     {type: String, required: true},
      }, TRANSACTION_ARGS)
    },  
    placeBidOrder: {
      args: angular.extend({
        asset:        {type: String, required: true},
        quantityQNT:  {type: String, required: true},
        priceNQT:     {type: String, required: true},
      }, TRANSACTION_ARGS)
    },
    cancelAskOrder: {
      args: angular.extend({
        order:          {type: String, required: true}
      }, TRANSACTION_ARGS)
    },
    cancelBidOrder: {
      args: angular.extend({
        order:          {type: String, required: true}
      }, TRANSACTION_ARGS)
    },
    getAccountPublicKey: {
      args: {
        account: {type: String, required: true}
      }
    },
    broadcastTransaction: {
      args: {
        transactionBytes: {type: String, required: true}
      },
      requirePost: true
    },
    getState: {
      args: {
        caller:          {type: String, argument: false}
      }
    },
    getBlock: {
      args: {
        block: {type: String, required: true}
      }
    },
    getBlockId: {
      args: {
        height: {type: Number, required: true}
      }
    },
    getAlias: {
      args: {
        alias:      {type: String},
        aliasName:  {type: String}
      }
    },
    setAlias: {
      args: {
        sender:         {type: String, argument: false},
        publicKey:      {type: String}, // sender public key
        deadline:       {type: String, required: true},
        feeNQT:         {type: String, required: true},
        secretPhrase:   {type: String},
        aliasName:      {type: String},
        aliasURI:       {type: String}
      }
    },
    getAliases: {
      args: {
        timestamp:      {type: Number},
        account:        {type: String, required: true}
      },
      returns: {
        property: 'aliases'
      }
    },
    getNamespacedAlias: {
      args: {
        account:        {type: String},
        alias:          {type: String},
        aliasName:      {type: String}
      }
    },
    setNamespacedAlias: {
      args: {
        sender:         {type: String, argument: false},
        publicKey:      {type: String}, // sender public key
        deadline:       {type: String, required: true},
        feeNQT:         {type: String, required: true},
        secretPhrase:   {type: String},
        aliasName:      {type: String},
        aliasURI:       {type: String}
      }
    },
    getNamespacedAliases: {
      args: {
        account:    {type: String, required: true},
        filter:     {type: String},
        timestamp:  {type: Number},
        firstIndex: {type: Number},
        lastIndex:  {type: Number}
      },
      returns: {
        property: 'aliases'
      }
    },
    getTransaction: {
      args: {
        transaction:  {type: String},
        fullHash:     {type: String}
      }
    },
    getAllAssets: {
      args: {
        firstIndex: {type: Number},
        lastIndex:  {type: Number}
      },
      returns: {
        property: 'assets'
      }
    },
    getTrades: {
      args: {
        asset:      {type: String},
        firstIndex: {type: Number},
        lastIndex:  {type: Number}
      },
      returns: {
        property: 'trades'
      }
    },
    getAskOrders: {
      args: {
        asset:      {type: String},
        limit:      {type: Number}
      },
      returns: {
        property: 'askOrders'
      }
    },
    getBidOrders: {
      args: {
        asset:      {type: String},
        limit:      {type: Number}
      },
      returns: {
        property: 'bidOrders'
      }
    },
    getAsset: {
      args: {
        asset:      {type: String}
      }
    },
    getAllTrades: {
      args: {
        timestamp:        {type: Number},
        firstIndex:       {type: Number}, /* NXT 1.3.1 + */
        lastIndex:        {type: Number}, /* NXT 1.3.1 + */
        includeAssetInfo: {type: Boolean} /* NXT 1.3.1 + */
      },
      returns: {
        property: 'trades'
      }      
    },
    getAccountCurrentAskOrderIds: {
      args: {
        account:          {type: String, required: true},
        asset:            {type: String, required: true},
      },
      returns: {
        property: 'askOrderIds'
      }
    },
    getAccountCurrentBidOrderIds: {
      args: {
        account:          {type: String, required: true},
        asset:            {type: String, required: true},
      },
      returns: {
        property: 'bidOrderIds'
      }
    },
    getAskOrder: {
      args: {
        order:          {type: String, required: true}
      },
    },
    getBidOrder: {
      args: {
        order:          {type: String, required: true}
      },
    },
    // returns { blocks: [], transactions: [], trades: [] }
    mofoGetActivity: {
      args: {
        timestamp:          {type: Number},
        account:            {type: String},
        includeAssetInfo:   {type: Boolean},
        includeBlocks:      {type: Boolean},
        includeTrades:      {type: Boolean},
        transactionFilter:  {type: String}
      }
    },
    mofoCombine: {
      args: {
        combinedRequest:    {type: String, required: true},
      },
      returns: {
        property: 'responses'
      },
      requirePost: true
    }
  };

  function verifyEngineType(_type) {
    if (_type != TYPE_FIM && _type != TYPE_NXT) throw new Error('Unsupported engine type');
  }

  function dbError(namespace, deferred) {
    return function (error) {
      console.log('DB.Error.'+namespace, error);
      if (deferred) {
        deferred.reject(error);
      }
    }
  }

  function netError(namespace, deferred) {
    return function (error) {
      console.log('Net.Error.'+namespace, error);
      if (deferred) {
        deferred.reject(error);
      }
    }    
  }

  /* @param _type Engine type */
  function SecretPhraseProvider(_type) {
    verifyEngineType(_type);
    this.type = _type;
  };
  SecretPhraseProvider.prototype = {
    provideSecretPhrase: function (methodName, methodConfig, args) {
      var deferred = $q.defer();
      var self = this;
      if (methodConfig.args.secretPhrase && !('secretPhrase' in args)) {
        modals.open('secretPhrase', {
          resolve: {
            items: function () {
              return angular.copy(args);
            }
          },
          close: function (items) {
            try {
              angular.extend(args, {
                secretPhrase: items.secretPhrase,
                publicKey: INSTANCE.crypto(self.type).secretPhraseToPublicKey(items.secretPhrase)
              });
              deferred.resolve(args);
            } catch (error) {
              deferred.reject(error);
            }
          },
          cancel: function (error) {
            deferred.reject(error);
          }
        });
      }
      else {
        deferred.resolve();
      }
      return deferred.promise;
    }
  };

  /**
   * @param _type Engine type 
   * @param _test Boolean for test network
   */
  function AbstractEngine(_type, _test) {
    verifyEngineType(_type);
    this.type  = _type;
    this.port  = _type == TYPE_FIM ? (_test ? 6886 : 7886) : (_test ? 6876 : 7876);
    this.net   = _test ? 'test' : 'main';
    this.blockTime = _type == TYPE_FIM ? 30 : 60;
    this.feeCost   = _type == TYPE_FIM ? 0.1 : 1;
    this.symbol    = _type == TYPE_FIM ? 'FIM' : 'NXT';
    this.promise   = undefined;
    this.nodes     = [];
    
    /* Set through settings service */
    this.localhost      = 'http://127.0.0.1';
    this.localHostNode  = null;

    /* Currently set from the fim-engine and nxt-engine plugins from an iterval that tests
       constantly for an available localhost API, this combined with a test if the
       blockchain was actually downloaded in full. */
    this.can_use_localhost = false;

    /* Setting available from the public nodes section. If set to true no attempt will be 
       made to use any public node. This is enforced in the getNode2 method where it will
       always return localhost node if set to true. */
    this.must_use_localhost = false;

    /**
     * Provide scoped db access | note that db.transactions points to something 
     * like nxttransactions_test
     *
     * Usage: 
     *    engine.db.transactions.orderBy('name')
     **/
    var prefix = this.type == TYPE_NXT ? 'nxt' : 'fim';
    var self   = this;
    this.db    = {};
    angular.forEach(['transactions', 'blocks', 'assets', 'trades', 'asks', 'bids'], function (kind) {
      var table = prefix+kind+(_test?'_test':'');
      self.db[kind] = db[table];
    });
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

    /* Returns a long-lived promise that is used to cache invocations before the 
       nodes are read from the database. Once the nodes are read from the database
       invoking this method is resolved instantly. */
    init: function (callback) {
      if (!this.promise) {
        var deferred = $q.defer();
        this.promise = deferred.promise;        
        var self     = this;
        db.nodes.where('port').equals(this.port).toArray().then(
          function (nodes) {
            self.nodes = nodes;
            angular.forEach(nodes, function (node) {
              console.log(node.url, node.scan_height);
            });
            deferred.resolve();
          }
        );
        db.nodes.addObserver(null, {
          create: function (nodes) {
            nodes = nodes.filter(function (node) {
              return node.port == self.port;
            });
            self.nodes = self.nodes.concat(nodes);
          },
          update: function (nodes) {
            angular.forEach(nodes, function (node) {
              if (node.port == self.port) {
                var index = UTILS.findFirstPropIndex(self.nodes, node, 'url');
                if (index > 0) {
                  angular.extend(self.nodes[index], node);
                }
              }
            });
          },
          remove: function (nodes) {
            angular.forEach(nodes, function (node) {
              if (node.port == self.port) {
                var index = UTILS.findFirstPropIndex(self.nodes, node, 'url');
                if (index >= 0 && index < self.nodes.length) {
                  self.nodes.splice(index, 1);
                }
              }
            });
          }
        });
      }
      return this.promise;
    },

    serverIsRunning: function () {
      return serverService.isRunning(this.type);
    },

    getLocalHostNode: function () {
      var deferred = $q.defer();
      if (this.localHostNode === null) {
        for (var i=0; i<this.nodes.length; i++) {
          if (this.nodes[i].url && this.nodes[i].url == this.localhost) {
            this.localHostNode = this.nodes[i];
            break;
          }
        }

        /* Not in the database have to add it first */
        if (this.localHostNode === null) {
          var self = this;
          db.nodes.add({
            port: this.port,
            url: this.localhost,
            supports_cors: true,
            downloaded: 0,
            success_timestamp: 0,
            failed_timestamp: 0,
            start_timestamp: 0
          }).then(
            function () {
              db.nodes.where('port').equals(self.port).first().then(
                function (node) {
                  self.localHostNode = node;
                  deferred.resolve(node);
                }
              );
            },
            deferred.reject
          );
        }
        else {
          deferred.resolve(this.localHostNode);
        }
      }
      else {
        deferred.resolve(this.localHostNode);
      }
      return deferred.promise;
    },

    constants: function () {
      return this._constants[this.type][this.net];
    },

    /* Part of NodeProvider interface */
    getAllNodes: function () {
      return this.nodes;
    },

    /* Part of NodeProvider interface */
    getNode2: function (options) {
      var deferred = $q.defer();
      var self = this;
      options = options || {};
      this.init().then(
        function () {
          /* When a localhost API is available it will override all other rules
             This basically means a server is running and the blockchain has fully downloaded */
          if (self.can_use_localhost || self.must_use_localhost) {
            self.getLocalHostNode().then(
              function (node) {

                /* XXX - Is this actually needed for localhost nodes? Since there is only 1 ?? */
                node.update({ start_timestamp: Date.now()}).then(
                  function () {
                    deferred.resolve(node);
                  },
                  deferred.reject
                );
              },
              deferred.reject
            );
          }
          /* We can only use the forced node */
          else if (options && options.node) {
            var node = options.node;
            node.update({ start_timestamp: Date.now()}).then(
              function () {
                deferred.resolve(node);
              },
              deferred.reject
            );
          }
          /* In all other cases select a node from the pool */
          else {
            /* We know the height so that MUST match */
            var nodes = self.nodes.filter(function (node) { 
              if (/* Filter blacklisted nodes */ node.blacklisted == true ||
                  /* Filter localhost */         node.url == self.localhost ||
                  /* Filter forks */             node.onfork == true || /* value is a Boolean object !! */
                  /* Filter options.not */       (options.not ? options.not.indexOf(node)!=-1 : false)) {
                return false;
              }
              return true;
            });

            if (self.nodes.length == 0) {
              alerts.failed('There are no registered public nodes');
              deferred.reject();
            }
            else if (nodes.length == 0) {
              console.log('All ('+self.symbol+') public nodes are blacklisted.');
              deferred.reject();
            }
            else {
              
              /* Sort. Oldest start time first */
              nodes.sort(function (a,b) { 
                if (a.start_timestamp < b.start_timestamp)
                   return -1;
                if (a.start_timestamp > b.start_timestamp)
                  return 1;
                return 0;
              });

              var node = nodes[0];
              node.update({ start_timestamp: Date.now()}).then(
                function () {
                  deferred.resolve(node);
                },
                deferred.reject
              );
            }
          }
        }
      );
      return deferred.promise;
    },
    blockchainDownload: function () {
      var deferred = $q.defer();
      var self = this;
      this.getLocalHostNode().then(
        function (node) {
          INSTANCE.get(self.type).getState({},{priority:5, node:node}).then(
            function (data) {
              deferred.resolve((data.lastBlockchainFeederHeight - data.numberOfBlocks) <= 25);
            },
            deferred.reject
          )
        },
        deferred.reject
      );
      return deferred.promise;
    }    
  };

  function ActorObserver(requestHandler, methodName, deferred) {
    this.requestHandler = requestHandler;
    this.methodName = methodName;
    this.deferred = deferred;
    this.complete = false;
  }
  ActorObserver.prototype = {

    /* HTTP request started */
    start: function (node) {
      this.requestHandler.notify('start', [this.methodName, node]);
    },

    /* HTTP request started (request is a retry on a different node) */
    retry: function (node, tries_left) {
      this.requestHandler.notify('start', [this.methodName, node, tries_left]);
    },

    /* HTTP request completed */
    success: function (node, data, tries_left) {
      this.complete = true;
      this.requestHandler.notify('success', [this.methodName, node, data, tries_left]);
      if (data.error && !data.errorDescription) {
        data.errorDescription = data.error;
      }
      if (data.errorCode && !data.errorDescription) {
        data.errorDescription = (data.errorMessage ? data.errorMessage : "Unknown error occured.");
      }
      if (data.errorDescription) {
        this.deferred.reject(data);
      }
      else {
        this.deferred.resolve(data);
      }
    },

    /* HTTP request returned non success code */
    failed: function (node, data, tries_left) {
      this.requestHandler.notify('failed', [this.methodName, node, data, tries_left]);
    },

    /* Actor was destroyed */
    destroy: function (reason) {
      if (!this.complete) {
        this.deferred.reject(reason);
      }
      this.deferred = null;
      this.requestHandler = null;
      this.methodName = null;
    }
  };  

  function RequestHandler(engine) {
    this.engine = engine;
    this.observers = [];
  };
  RequestHandler.prototype = {

    /**
     * Adds an observer thats called for the various events in the lifecycle 
     * of a request.
     *
     * @param observer Object { 
     *   start:     fn(methodName, node),
     *   success:   fn(methodName, node, data, tries_left), 
     *   failed:    fn(methodName, node, data, tries_left),
     * }
     */
    addObserver: function (observer) {
      if (this.observers.indexOf(observer) == -1) {
        this.observers.push(observer);
      }
    },
    removeObserver: function (observer) {
      var index = this.observers.indexOf(observer);
      if (index != -1) {
        this.observers.splice(index, 1);
      }
    },
    notify: function (method, args) {
      for (var i=0; i<this.observers.length; i++) {
        this.observers[i][method].apply(this.observers[i], args);
      }
    },
    
    createObserver: function (methodName, deferred) {
      return new ActorObserver(this, methodName, deferred);
    },

    /**
     * @param methodName    String
     * @param methodConfig  Object
     * @param args          Object
     * @param options       Object contains the podium property and others
     * @returns Promise
     **/
    sendRequest: function (methodName, methodConfig, args, options) {
      var deferred = $q.defer();
      var builder = requests.createRequestBuilder(methodName, methodConfig, args);
      var actor = options.podium.createActor(builder, this.engine, options);
      if (actor) {
        actor.addObserver(this.createObserver(methodName, deferred));  
      }
      else {
        deferred.reject();
      }
      return deferred.promise;
    }
  };

  /**
   * Wrapper for getState API method. All properties returned from getState (see BlockchainStatus.methods)
   * are available as methods on this class that all return a Promise. There is a minimum wait period set
   * through the "nxt.blockchain.status.milliseconds" setting that tells how long to wait between calls to 
   * the server. If elapsed time since last server call is less than the minimum the cached value is returned.
   *
   * Usage:
   *   
   *   state.time().then(function (time) {
   *     console.log('The time is ' + time);
   *   })
   *
   */
  function BlockchainStatus(api) {
    this.last = 0;
    this.api = api;
    this.methods = "application|version|nxtversion|time|lastBlock|cumulativeDifficulty|totalEffectiveBalanceNXT|numberOfBlocks|numberOfTransactions|numberOfAccounts|numberOfAssets|numberOfOrders|numberOfTrades|numberOfAliases|numberOfPolls|numberOfVotes|numberOfPeers|numberOfUnlockedAccounts|lastBlockchainFeeder|lastBlockchainFeederHeight|isScanning|availableProcessors|maxMemory|totalMemory|freeMemory".split('|');
    this.data = {};    
    this.promise = null;
    this.installMethods(this);    
  };
  BlockchainStatus.prototype = {
    installMethods: function (self) {
      angular.forEach(this.methods, function (name) {
        self[name] = function (force) {
          var deferred  = $q.defer();
          var now       = Date.now();
          var elapsed   = now - self.last;
          if (elapsed > BLOCKCHAIN_STATUS_MILLISECONDS) {
            self.last   = now;
            self.api.getState().then(
              function (data) {
                self.data = data;
                deferred.resolve(self.data[name]);
              },
              function (error) {
                console.log('getState error - returning cached data', error);
                self.last = (now - BLOCKCHAIN_STATUS_MILLISECONDS) + 1000; /* Allow next network request within ONE second */
                deferred.resolve(self.data[name]);
              }
            )
          }
          else {
            deferred.resolve(self.data[name]); /* Return from cache */
          }
          return deferred.promise;
        };
      });
    }
  };

  /**
   * Blocks are stored in the database, info is kept at a minimum. 
   */
  function Blockchain(_type, _test, api) {
    this.api    = api;
    this.state  = new BlockchainStatus(api);
    this.lastBlock = null;
    var self = this;
    api.engine.db.blocks.orderBy('height').last().then(
      function (block) {
        self.lastBlock = block;
      }
    );
  };
  Blockchain.prototype = {

    /**
     * Get a block by ID, will try the DB first and consult the server if not
     * found. Downloaded blocks are stored in the DB.
     * 
     * @param id String
     * @returns Promise -> Block
     */
    getBlock: function (id, force) {
      var self = this;
      var deferred = $q.defer();

      function get_it(args, callback) {
        self.api.getBlock(args).then(
          function (block) {
            block.id = id;
            self.api.engine.db.blocks.put(block).then(
              function () {
                try {
                  if (!self.lastBlock || block.height > self.lastBlock.height) {
                    self.lastBlock = block;
                  }
                }
                finally {
                  callback.call();
                }
              }
            );
          }
        ).catch(netError('Blockchain.getBlock', deferred))
      }

      if (force) {
        get_it({block:id}, function () {
          deferred.resolve(block);
        });
      }
      else {
        this.api.engine.db.blocks.where('id').equals(id).first().then(
          function (block) {
            if (block !== undefined) {
              deferred.resolve(block);
            }
            else {
              get_it({block:id}, function () {
                deferred.resolve(block);
              });
            }
          }
        ).catch(dbError('Blockchain.getBlock', deferred));
      }
      return deferred.promise;
    },

    /**
     * Get a block by height, will try the DB first and consult the server if not
     * found. Downloaded blocks are stored in the DB.
     * 
     * @param height Number
     * @returns Promise -> Block
     */
    getBlockFromHeight: function (height) {
      var self = this;
      var deferred = $q.defer();
      this.api.engine.db.blocks.where('height').equals(height).first().then(
        function (block) {
          if (block !== undefined) {
            deferred.resolve(block);
          }
          else {
            self.api.getBlockId({height:height}).then(
              function (data) {
                self.getBlock(data.id).then(  /* Stores result in DB */
                  function (block) {
                    block.id = data.id;
                    deferred.resolve(block);
                  }                  
                ).catch(deferred.reject);
              }
            ).catch(deferred.reject)
          }
        }
      ).catch(dbError('Blockchain.getBlockFromHeight', deferred));
      return deferred.promise;      
    },

    /**
     * Returns the lastBlock. No deferred stuff returns directly from a property 
     * on this instance. The property is updated when appropriate.
     *
     * @returns Block
     */
    getLastBlock: function () {
      return this.lastBlock;
    },
    getHeight: function () {
      return this.lastBlock ? this.lastBlock.height : 0;
    },

    /**
     * A scheduler should call
     *
     *
     * */
    getNewBlocks: function () {
      /* 
      Look at the heighest block in db. 
        If it's more than 10 seconds old.
          Call state.lastBlock() to check if we might have a new block. 
            If there is a new block download it.
              If the new block has the same height as a previous block from a fork, 
              it is overwritten.
      */
      var self = this;
      this.api.engine.db.blocks.orderBy('height').last().then(
        function (block) {
          if (block) {
            var converted = (new Date(Date.UTC(2013, 10, 24, 12, 0, 0, 0) + block.timestamp * 1000)).getTime();
            var elapsed   = Date.now() - converted;
            if (elapsed > BLOCKCHAIN_STATUS_MILLISECONDS) {
              self.state.lastBlock().then(
                function (id) {
                  if (id && id != block.id) {
                    self.getBlock(id);
                  }
                }
              );
            }
          }
          else {
            self.state.lastBlock().then(
              function (id) {
                if (id) {
                  self.getBlock(id);
                }
              }
            );
          }
        }
      ).catch(dbError('Blockchain.getNewBlocks.firstBlock'));
    }
  };

  function AssetsManager(api) {
    this.api = api;
    this.assets = {};
    var self = this;
    this.readAssets = $q.defer();
    api.engine.db.assets.toArray().then(
      function (assets) {
        for (var i=0; i<assets.length; i++) {
          var a = assets[i];
          self.assets[a.asset] = a;
          self.count++;
        }
        self.readAssets.resolve(assets.length);
      }
    );
  }
  AssetsManager.prototype = {
    init: function () {
      var deferred = $q.defer();
      var self = this;
      this.readAssets.promise.then(
        function (count) {
          self.api.getAllAssets({
            firstIndex: count-1, 
            lastIndex: 9999
          },{ 
            priority:5 
          }).then(
            function success(_assets) {
              db.transaction('rw', self.api.engine.db.assets, 
                function () {              
                  for (var i=0,l=_assets.length; i<l; i++) {
                    self.api.engine.db.assets.put(_assets[i]);
                  }
                }
              ).then(deferred.resolve).catch(deferred.reject);
            },
            deferred.reject
          );
        }
      );
      return deferred.promise;
    },
    get: function (asset_id) {
      return this.assets[asset_id];
    },
    getName: function (asset_id) {
      return this.assets[asset_id] ? this.assets[asset_id].name : '..' ;
    },
    getDecimals: function (asset_id) {
      return this.assets[asset_id] ? this.assets[asset_id].decimals : 0;
    },
    getQuantityQNT: function (asset_id) {
      return this.assets[asset_id] ? this.assets[asset_id].quantityQNT : '0';
    },
    getDescription: function (asset_id) {
      return this.assets[asset_id] ? this.assets[asset_id].description : '';
    },
    getNumberOfTrades: function (asset_id) {
      return this.assets[asset_id] ? this.assets[asset_id].numberOfTrades : '';
    },
    getAccountRS: function (asset_id) {
      return this.assets[asset_id] ? this.assets[asset_id].accountRS : '';
    },
    getAll: function () {
      var result = [];
      for (var name in this.assets) {
        result.push(this.assets[name]);
      }
      return result
    }
  };

  function MessageDecoder(api) {
    this.api    = api;
    this.keys   = [];
    this.values = [];
    this.priv   = {};
  };
  MessageDecoder.prototype = {
    MAX_SIZE: 1000,
    SLIZE_SIZE: 100,
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
      if (!privateKey) {
        var wallet = plugins.get('wallet');
        if (wallet && wallet.hasKey(id_rs)) {
          var secretPhrase = wallet.getSecretPhrase(id_rs);
          if (secretPhrase) {
            privateKey = converters.hexStringToByteArray(this.api.crypto.getPrivateKey(secretPhrase));
            this.priv[id_rs] = privateKey;
          }
        }
      }
      return privateKey;
    },
    tryToDecryptMessage: function (transaction) {
      var privateKey, publicKey, data, nonce, isText;
      if (transaction.attachment.encryptedMessage) {
        if (this.getPrivateKey(transaction.senderRS)) {
          privateKey   = this.getPrivateKey(transaction.senderRS);
          publicKey = converters.hexStringToByteArray(transaction.attachment.recipientPublicKey);
        }
        else if (this.getPrivateKey(transaction.recipientRS)) {
          privateKey   = this.getPrivateKey(transaction.recipientRS);
          publicKey = converters.hexStringToByteArray(transaction.senderPublicKey);
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
          publicKey = converters.hexStringToByteArray(transaction.attachment.recipientPublicKey);
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
      self.templates[type] = ['<a href data-engine="',self.api.type,'" data-type="',type,'" data-value="__VALUE__" class="txn txn-',
        type,'" onclick="event.preventDefault(); if (angular.element(this).scope().onTransactionIdentifierClick) { angular.element(this).scope().onTransactionIdentifierClick(this) }" ',
        'onmouseover="if (angular.element(this).scope().onTransactionIdentifierMouseOver) { angular.element(this).scope().onTransactionIdentifierMouseOver(this) }" ',
        'onmouseleave="if (angular.element(this).scope().onTransactionIdentifierMouseLeave) { angular.element(this).scope().onTransactionIdentifierMouseLeave(this) }">__LABEL__</a>'].join('')
    });    
  }
  Renderer.prototype = {
    getIcon: function (transaction) {
      try {
        return this.CONSTANTS[transaction.type][transaction.subtype];
      } 
      catch (e) {
        return null;
      }
    },
    getHTML: function (transaction, translator) {
      return $sce.trustAsHtml(this._renderTransaction(transaction, translator));
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
    _renderTransaction: function (transaction, translator) {
      var self = this;
      var api  = this.api;
      var TYPE = this.TYPE;
      var util = INSTANCE.util;

      var maxLength = 100;
      function crop(value) {
        value = String(value);
        if (value.length > maxLength) {
          return String(value).substr(0, maxLength) + ' ..'
        }
        return value;
      }

      /* @param type see TYPE
         @param label String 
         @param value String optional if not provided label is used
         @returns String */
      function render(type, label, value) {
        var template = self.templates[type];
        if (type == TYPE.ACCOUNT && translator) { /* This works only if you call with a label argument only */
          value = label;
          try { label = translator(label); } catch (e) {}
        }
        return template.replace(/__LABEL__/g, crop(label)).replace(/__VALUE__/g, encodeURIComponent(value||label));
      }

      function translate(id_rs) {
        return translator ? translator(id_rs) : id_rs;
      }

      function label(transaction) {
        var constant = self.CONSTANTS[transaction.type] ? self.CONSTANTS[transaction.type][transaction.subtype] : null;
        if (constant) {
          // return '<span class="label label-'+constant.clazz+' label-'+constant.label.toLowerCase()+
          //         ' label-rendered-transaction"><i class="'+constant.icon+'"></i>&nbsp;&nbsp;'+constant.label+'</span>';
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
        var decoded = self.api.decoder.decode(transaction);
        if (decoded) {
          var html = ['&nbsp;<span>'];
          if (transaction.attachment.encryptToSelfMessage) {
            html.push('<i class="fa fa-comment-o"></i>');
          }
          else if (transaction.attachment.encryptedMessage) {
            html.push('<i class="fa fa-comments-o"></i>');
          }
          else {
            html.push('<i class="fa fa-unlock"></i>');
          }
          if (decoded.text) {
            var css = '';//'overflow: hidden;text-overflow: ellipsis;white-space: nowrap;width: 180px; max-width: 180px; display:inline-block; vertical-align: text-bottom;';
            html.push('&nbsp;<span style="',css,'" data-text="',encodeURIComponent(decoded.text),'" data-sender="',transaction.senderRS,'" data-recipient="',transaction.recipientRS,'" ',
            '>',decoded.text,'</span></span>');
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

      switch (transaction.type) {
        case 0: {
          switch (transaction.subtype) {
            case 0: return sprintf('%s %s <strong>paid</strong> %s %s <strong>to</strong> %s (%s) %s %s',
                              label(transaction),
                              render(TYPE.ACCOUNT, transaction.senderRS),
                              util.convertToNXT(transaction.amountNQT), 
                              api.engine.symbol, 
                              render(TYPE.ACCOUNT, transaction.recipientRS),
                              render(TYPE.JSON,'details',JSON.stringify(transaction)),
                              fee(transaction),
                              message(transaction));
          }
        }
        case 1: {
          switch (transaction.subtype) {
            case 0: 
              // if (transaction.attachment && transaction.attachment['version.PublicKeyAnnouncement']) {
              //       return sprintf('%s %s <strong>published public key</strong> for %s (%s) %s %s', 
              //                 label(transaction),
              //                 render(TYPE.ACCOUNT, transaction.senderRS), 
              //                 render(TYPE.ACCOUNT, transaction.recipientRS), 
              //                 render(TYPE.JSON,'details',JSON.stringify(transaction)),
              //                 fee(transaction),
              //                 message(transaction));
              // }
              // else {
                    return sprintf('%s %s <strong>sent a message</strong> to %s (%s) %s %s', 
                              label(transaction),
                              render(TYPE.ACCOUNT, transaction.senderRS), 
                              render(TYPE.ACCOUNT, transaction.recipientRS), 
                              render(TYPE.JSON,'details',JSON.stringify(transaction)),
                              fee(transaction),
                              message(transaction));

              // }
            case 1: return sprintf('%s %s <strong>set alias</strong> %s <strong>to</strong> %s (%s) %s %s', 
                              label(transaction),
                              render(TYPE.ACCOUNT, transaction.senderRS), 
                              render(TYPE.ALIAS_NAME, transaction.attachment.alias), 
                              render(TYPE.ALIAS_URI, transaction.attachment.uri),
                              render(TYPE.JSON,'details',JSON.stringify(transaction)),
                              fee(transaction),
                              message(transaction));
            case 2: return sprintf('%s %s <strong>created poll</strong> %s (%s) %s %s',
                              label(transaction),
                              render(TYPE.ACCOUNT, transaction.senderRS),
                              render(TYPE.POLL_NAME, transaction.attachment.name),
                              render(TYPE.JSON,'details',JSON.stringify(transaction)),
                              fee(transaction),
                              message(transaction));
            case 3: return sprintf('%s %s <strong>casted vote</strong> for %s (%s) %s %s',
                              label(transaction),
                              render(TYPE.ACCOUNT, transaction.senderRS),
                              render(TYPE.POLL_ID, transaction.attachment.pollId),
                              render(TYPE.JSON,'details',JSON.stringify(transaction)),
                              fee(transaction),
                              message(transaction));
            case 4: return sprintf('%s %s <strong>announced hub</strong> (%s) %s %s',
                              label(transaction),
                              render(TYPE.ACCOUNT, transaction.senderRS),                        
                              render(TYPE.JSON,'details',JSON.stringify(transaction)),
                              fee(transaction),
                              message(transaction));
            case 5: return sprintf('%s %s <strong>registered name</strong> %s (%s) (%s) %s %s',
                              label(transaction),
                              render(TYPE.ACCOUNT, transaction.senderRS),
                              render(TYPE.ACCOUNT_NAME, transaction.attachment.name),
                              render(TYPE.DESCRIPTION,'description',transaction.attachment.description),
                              render(TYPE.JSON,'details',JSON.stringify(transaction)),                              
                              fee(transaction),
                              message(transaction));
            case 6: return sprintf('%s %s <strong>offered alias</strong> %s <strong>for sale</strong> for %s %s (%s) %s %s',
                              label(transaction),
                              render(TYPE.ACCOUNT, transaction.senderRS),
                              render(TYPE.ALIAS_NAME, transaction.attachment.alias), 
                              util.convertToNXT(transaction.attachment.priceNQT),
                              api.engine.symbol,
                              render(TYPE.JSON,'details',JSON.stringify(transaction)),
                              fee(transaction),
                              message(transaction));
            case 7: return sprintf('%s %s <strong>bought alias</strong> %s <strong>from</strong> %s (%s) %s %s',
                              label(transaction),
                              render(TYPE.ACCOUNT, transaction.senderRS),
                              render(TYPE.ALIAS_NAME, transaction.attachment.alias), 
                              render(TYPE.ACCOUNT, transaction.recipientRS),
                              render(TYPE.JSON,'details',JSON.stringify(transaction)),
                              fee(transaction),
                              message(transaction));
          }      
        }
        case 2: {
          switch (transaction.subtype) {
            case 0: return sprintf('%s %s <strong>issued asset</strong> %s (%s) %s %s',
                              label(transaction),
                              render(TYPE.ACCOUNT, transaction.senderRS),
                              render(TYPE.ASSET_NAME, transaction.attachment.name), 
                              render(TYPE.JSON,'details',JSON.stringify(transaction)),
                              fee(transaction),
                              message(transaction));
            case 1: return sprintf('%s %s <strong>transfered</strong> %s %s <strong>to</strong> %s (%s) %s %s',
                              label(transaction),
                              render(TYPE.ACCOUNT, transaction.senderRS),
                              formatQuantity(transaction.attachment.quantityQNT, api.assets.getDecimals(transaction.attachment.asset)),
                              render(TYPE.ASSET_ID, api.assets.getName(transaction.attachment.asset), transaction.attachment.asset), 
                              render(TYPE.ACCOUNT, transaction.recipientRS),
                              render(TYPE.JSON,'details',JSON.stringify(transaction)),
                              fee(transaction),
                              message(transaction));
            case 2: return sprintf('%s %s <strong>placed sell order</strong> for %s %s at %s %s <strong>total</strong> %s %s (%s) %s %s',
                              label(transaction),
                              render(TYPE.ACCOUNT, transaction.senderRS),
                              formatQuantity(transaction.attachment.quantityQNT, api.assets.getDecimals(transaction.attachment.asset)),
                              render(TYPE.ASSET_ID, api.assets.getName(transaction.attachment.asset), transaction.attachment.asset),
                              formatOrderPricePerWholeQNT(transaction.attachment.priceNQT, api.assets.getDecimals(transaction.attachment.asset)),
                              api.engine.symbol,
                              formatOrderTotal(transaction.attachment.priceNQT, transaction.attachment.quantityQNT, api.assets.getDecimals(transaction.attachment.asset)),
                              api.engine.symbol,
                              render(TYPE.JSON,'details',JSON.stringify(transaction)),
                              fee(transaction),
                              message(transaction)); 
            case 3: return sprintf('%s %s <strong>placed buy order</strong> for %s %s at %s %s <strong>total</strong> %s %s (%s) %s %s',
                              label(transaction),
                              render(TYPE.ACCOUNT, transaction.senderRS),
                              formatQuantity(transaction.attachment.quantityQNT, api.assets.getDecimals(transaction.attachment.asset)),
                              render(TYPE.ASSET_ID, api.assets.getName(transaction.attachment.asset), transaction.attachment.asset),
                              formatOrderPricePerWholeQNT(transaction.attachment.priceNQT, api.assets.getDecimals(transaction.attachment.asset)),
                              api.engine.symbol,
                              formatOrderTotal(transaction.attachment.priceNQT, transaction.attachment.quantityQNT, api.assets.getDecimals(transaction.attachment.asset)),
                              api.engine.symbol,
                              render(TYPE.JSON,'details',JSON.stringify(transaction)),
                              fee(transaction),
                              message(transaction));
            case 4: return sprintf('%s %s <strong>cancelled sell order</strong> %s (%s) %s %s',
                              label(transaction),
                              render(TYPE.ACCOUNT, transaction.senderRS),
                              render(TYPE.ASK_ORDER, transaction.attachment.order),
                              render(TYPE.JSON,'details',JSON.stringify(transaction)),
                              fee(transaction),
                              message(transaction));
            case 5: return sprintf('%s %s <strong>cancelled buy order</strong> %s (%s) %s %s',
                              label(transaction),
                              render(TYPE.ACCOUNT, transaction.senderRS),
                              render(TYPE.BID_ORDER, transaction.attachment.order),
                              render(TYPE.JSON,'details',JSON.stringify(transaction)),
                              fee(transaction),
                              message(transaction));
          } 
        }
        case 3: {
          switch (transaction.subtype) {
            case 0: return sprintf('%s %s <strong>listed good</strong> %s <strong>quantity</strong> %s <strong>for</strong> %s %s (%s) (%s) (%s) %s %s',
                              label(transaction),
                              render(TYPE.ACCOUNT, transaction.senderRS),
                              render(TYPE.GOODS_NAME, transaction.attachment.name, transaction.transaction),
                              util.commaFormat(String(transaction.attachment.quantity)),
                              util.convertToNXT(transaction.attachment.priceNQT),
                              api.engine.symbol,
                              render(TYPE.DESCRIPTION,'description',transaction.attachment.description),
                              render(TYPE.TAGS,'tags',transaction.attachment.tags),
                              render(TYPE.JSON,'details',JSON.stringify(transaction)),                              
                              fee(transaction),
                              message(transaction)); 
            case 1: return sprintf('%s %s <strong>delisted good</strong> %s (%s) %s %s',
                              label(transaction),
                              render(TYPE.ACCOUNT, transaction.senderRS),
                              render(TYPE.GOODS, transaction.attachment.goods),
                              render(TYPE.JSON,'details',JSON.stringify(transaction)),
                              fee(transaction),
                              message(transaction));
            case 2: return sprintf('%s %s <strong>changed price</strong> of %s to %s %s (%s) %s %s',
                              label(transaction),
                              render(TYPE.ACCOUNT, transaction.senderRS),
                              render(TYPE.GOODS, transaction.attachment.goods),
                              util.convertToNXT(transaction.attachment.priceNQT),
                              api.engine.symbol,
                              render(TYPE.JSON,'details',JSON.stringify(transaction)),
                              fee(transaction),
                              message(transaction));
            case 3: return sprintf('%s %s <strong>changed quantity</strong> of %s by %s (%s) %s %s',
                              label(transaction),
                              render(TYPE.ACCOUNT, transaction.senderRS),
                              render(TYPE.GOODS, transaction.attachment.goods),
                              transaction.attachment.deltaQuantity,
                              render(TYPE.JSON,'details',JSON.stringify(transaction)),
                              fee(transaction),
                              message(transaction));
            case 4: return sprintf('%s %s <strong>purchased</strong> %s %s <strong>from</strong> %s <strong>for</strong> %s %s (%s) (%s) %s %s',
                              label(transaction),
                              render(TYPE.ACCOUNT, transaction.senderRS),
                              util.commaFormat(String(transaction.attachment.quantity)),
                              render(TYPE.GOODS, transaction.attachment.goods),
                              render(TYPE.ACCOUNT, transaction.recipientRS),
                              util.convertToNXT(transaction.attachment.priceNQT),
                              api.engine.symbol,
                              render(TYPE.DELIVERY_DEADLINE,'deadline',transaction.attachment.deliveryDeadlineTimestamp),
                              render(TYPE.JSON,'details',JSON.stringify(transaction)),
                              fee(transaction),
                              message(transaction));
            case 5: return sprintf('%s %s <strong>delivered purchase</strong> %s <strong>to</strong> %s <strong>with discount</strong> %s %s (%s) %s %s',
                              label(transaction),
                              render(TYPE.ACCOUNT, transaction.senderRS),
                              render(TYPE.PURCHASE, transaction.attachment.purchase),
                              render(TYPE.ACCOUNT, transaction.recipientRS),
                              util.convertToNXT(transaction.attachment.discountNQT),
                              api.engine.symbol,
                              render(TYPE.JSON,'details',JSON.stringify(transaction)),
                              fee(transaction),
                              message(transaction));
            case 6: return sprintf('%s %s <strong>gave feedback for purchase</strong> %s (%s) %s %s',
                              label(transaction),
                              render(TYPE.ACCOUNT, transaction.senderRS),
                              render(TYPE.PURCHASE, transaction.attachment.purchase),
                              render(TYPE.JSON,'details',JSON.stringify(transaction)),
                              fee(transaction),
                              message(transaction));
            case 7: return  sprintf('%s %s <strong>gave refund</strong> of %s %s <strong>for</strong> %s (%s) %s %s',
                              label(transaction),
                              render(TYPE.ACCOUNT, transaction.senderRS),
                              util.convertToNXT(transaction.attachment.discountNQT),
                              api.engine.symbol,
                              render(TYPE.PURCHASE, transaction.attachment.purchase),
                              render(TYPE.JSON,'details',JSON.stringify(transaction)),
                              fee(transaction),
                              message(transaction));
          } 
        }
        case 4: {
          switch (transaction.subtype) {
            case 0: return sprintf('%s %s <strong>leased</strong> %s %s <strong>to</strong> %s <strong>for a period of</strong> %s blocks (%s) %s %s',
                              label(transaction),
                              render(TYPE.ACCOUNT, transaction.senderRS),
                              util.convertToNXT(transaction.amountNQT),
                              api.engine.symbol,
                              render(TYPE.ACCOUNT, transaction.recipientRS),
                              transaction.attachment.period,
                              render(TYPE.JSON,'details',JSON.stringify(transaction)),
                              fee(transaction),
                              message(transaction));
          }
        }
        case 40: {
          switch (transaction.subtype) {
            case 0: return sprintf('%s %s <strong>set namespaced alias</strong> %s <strong>to</strong> %s (%s) %s %s', 
                              label(transaction),
                              render(TYPE.ACCOUNT, transaction.senderRS), 
                              render(TYPE.ALIAS_NAME, transaction.attachment.alias), 
                              render(TYPE.ALIAS_URI, transaction.attachment.uri),
                              render(TYPE.JSON,'details',JSON.stringify(transaction)),
                              fee(transaction),
                              message(transaction));
          }
        }
      }
    } 
  };

  function stackTrace() {
    var e = new Error();
    var stack = e.stack.replace(/^[^\(]+?[\n$]/gm, '')
      .replace(/^\s+at\s+/gm, '')
      .replace(/^Object.<anonymous>\s*\(/gm, '{anonymous}()@')
      .split('\n')
    return stack[2];
  }  

  /**
   * @param _type Engine type 
   * @param _test Boolean for test network
   */
  function ServerAPI(_type, _test) {
    verifyEngineType(_type);
    
    this.installMethods(this);

    this.type                 = _type;
    this.test                 = _test;
    this.downloaders          = {};
    this.engine               = new AbstractEngine(_type, _test);
    this.secretPhraseProvider = new SecretPhraseProvider(_type);
    this.requestHandler       = new RequestHandler(this.engine);
    this.blockchain           = new Blockchain(_type, _test, this);
    this.crypto               = new Crypto(_type, this);
    this.assets               = new AssetsManager(this);
    this.renderer             = new Renderer(this);
    this.decoder              = new MessageDecoder(this);    

    /* Registers AbstractEngine as NodeProvider with the requests service */
    requests.registerNodeProvider(this.engine);

    (function (blockchain) {
      setInterval(function () { blockchain.getNewBlocks() }, 10 * 1000);
      setTimeout( function () { blockchain.getNewBlocks() }, 100);
    })(this.blockchain);   
  };
  ServerAPI.prototype = {

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
    },

    /* Extends another object with all methods defined on *base* */
    installMethods: function (self) {
      angular.forEach(NXT_API, function (methodConfig, methodName) {

        /* Add method for API function.
           
           @param args Object
           @param node Node (optional)
           @param canceller Deferred (optional)
           @param observer Object (optional) {
              start:    fn(methodName),
              success:  fn(methodName),
              failed:   fn(methodName)
           }
           @returns Promise
         */
        self[methodName] = function (args, node, canceller, observer) {

        /* Add method for API function.
           
           @param args Object
           @param options Node (optional)
           @param observer Object (optional) {
              start:    fn(methodName),
              success:  fn(methodName),
              failed:   fn(methodName)
           }
           @returns Promise
         */
        // //////////////////////////////////////////////////////////////
        //
        // THIS IS THE NEW API
        //
        // //////////////////////////////////////////////////////////////

        // self[methodName] = function (args, options, observer) {

          args = angular.copy(args) || {};

          // //////////////////////////////////////////////////////////////
          // Hack - compatibility with new API
          if (node && typeof node == 'object' && (typeof node.priority == 'number' || node.podium || node.node)) {
            var options = node;
          }
          else {
            var options = options || {};
            if (node) {
              options.node = node;
            }
          }
          if (canceller && typeof canceller == 'object' && (canceller.start || canceller.success || canceller.failed)) {
            var observer = canceller;
          }
          // //////////////////////////////////////////////////////////////

          // options.trace = stackTrace();

          var deferred = $q.defer();
          self.secretPhraseProvider.provideSecretPhrase(methodName, methodConfig, args).then(
            function () {

              /* Remove the publicKey that was added by SecretPhraseProvider */
              // XXX TODO Fix SecretPhraseProvider - addition of publicKey does not work for all request types
              if (['startForging', 'stopForging', 'getForging'].indexOf(methodName) != -1) {
                delete args.publicKey;
              }

              /* Message Attachment support (encrypts messages) */
              self.addMessageData(args, methodName);              
              
              /* Test for missing arguments */
              for (var argName in methodConfig.args) {
                var argConfig = methodConfig.args[argName];
                if (argConfig.required && !(argName in args)) {
                  deferred.reject("Missing required argument in "+methodName+" ["+argName+"]");
                  return;
                }
              }

              /* Remember this before it's filtered out */
              var dontBroadcast = args.dontBroadcast;

              /* Test argument type and unknown arguments */
              for (var argName in args) {
                var argValue = args[argName];
                if (!(argName in methodConfig.args)) {
                  deferred.reject("Unexpected argument for "+methodName+" ["+argName+"]");
                  return;
                }
                if (!(new Object(argValue) instanceof methodConfig.args[argName].type)) {
                  deferred.reject("Argument for "+methodName+" ["+argName+"] of wrong type");
                  return;
                }

                /* Filter out non-arguments [argument=false] */
                if (methodConfig.args[argName].argument === false) {
                  delete args[argName];
                }
              }

              /* NEVER send the secretPhrase to the server */
              var secretPhrase = args.secretPhrase;
              if ('secretPhrase' in args) {

                /* UNLESS if we are doing one of these calls */
                if (['startForging', 'stopForging', 'getForging'].indexOf(methodName) == -1) {
                  delete args.secretPhrase;
                }
              }

              /* Sanity check - make absolutely sure secretPhrase is only send to whitelisted servers */
              if (['startForging', 'stopForging', 'getForging'].indexOf(methodName) != -1) {
                if (!options.node) {
                  deferred.reject('Unexpected error. You must provide a forced node for this operation');
                  return;
                }
                // console.log('allowed.hosts', settings.get('forging.allowed.hosts'));
                // console.log('node_ref.force.url', node_ref.force.url);
                if ((settings.get('forging.allowed.hosts') || []).indexOf(options.node.url) == -1) {
                  deferred.reject('Unexpected error. Blocked sending of secrethrase to unknown host.');
                  return;
                }
              }

              /* @optional observer supported */
              if (observer) { observer.start(methodName, args); }

              /* Prepare the podium */
              if (!options.podium) {
                if (!requests.theater.podiums['main']) {
                  requests.theater.createPodium('main', null);
                }
                options.podium = requests.theater.podiums['main'];
              }

              /* Make the call to the server */
              self.requestHandler.sendRequest(methodName, methodConfig, args, options).then(
              //self.requestHandler.sendRequest(methodName, methodConfig, args, node_ref, canceller).then(
                function (data) {

                  /* Store the height on the Node */
                  if (methodName == 'getState') {
                    if (options.node_out) {
                      options.node_out.update({
                        lastBlock: data.lastBlock,
                        lastBlockchainFeeder: data.lastBlockchainFeeder,
                        numberOfBlocks: data.numberOfBlocks
                      });
                    }
                  }

                  /* @optional observer supported */
                  if (observer) { observer.success(methodName, data); }

                  /* The server prepared an unsigned transaction that we must sign and broadcast */
                  if (secretPhrase && data.unsignedTransactionBytes) {

                    /* @optional observer supported */
                    if (observer) { observer.start('sign'); }

                    var publicKey   = self.crypto.secretPhraseToPublicKey(secretPhrase);
                    var signature   = self.crypto.signBytes(data.unsignedTransactionBytes, converters.stringToHexString(secretPhrase));

                    /* Required by verifyAndSignTransactionBytes */
                    args.publicKey  = publicKey;

                    if (!self.crypto.verifyBytes(signature, data.unsignedTransactionBytes, publicKey)) {
                      var msg = i18n.format('error_signature_verification_client');

                      /* @optional observer supported */
                      if (observer) { observer.failed('sign', msg); }

                      deferred.reject(msg);
                      return;
                    } 
                    else {
                      var payload = verifyAndSignTransactionBytes(data.unsignedTransactionBytes, signature, methodName, 
                                        args, self.type, self.engine.constants());
                      if (!payload) {
                        var msg = i18n.format('error_signature_verification_server');

                        /* @optional observer supported */
                        if (observer) { observer.failed('sign', msg); }

                        deferred.reject(msg);
                        return;
                      } 

                      /* @optional observer supported */
                      if (observer) { observer.success('sign', msg); }

                      var fullHash = self.crypto.calculateFullHash(data.unsignedTransactionBytes, signature);

                      if (dontBroadcast) {
                        deferred.resolve(angular.extend({ transactionBytes: payload, fullHash: fullHash }, data));
                      }
                      else {

                        /* TODO.. Built in an option not to broadcast a transaction 
                                  Then later on the transaction can be broadcasted by clicking 'broadcast' 
                                  in the transactions list
                                  
                                  As soon as a transaction is created it should be put in the database with
                                  status 'not broadcasted', then when it is broadcasted the transaction in 
                                  the database must be updated.

                           XXX..  You must broadcast the signed transaction on the same node that created
                                  it or it's rejected with a message of 'Double spending'.

                                  This seems to no be the case anymore.

                                  */

                        /* @optional observer supported */
                        if (observer) { observer.start('broadcastTransaction'); }

                        self.broadcastTransaction({transactionBytes: payload}, { podium: options.podium, node: options.node_out }).then(
                          function (data) {
                            data = angular.extend({ fullHash: fullHash }, data);

                            /* @optional observer supported */
                            if (observer) { observer.success('broadcastTransaction', data); }

                            deferred.resolve(data);

                            /* Update unconfirmed transactions 
                               TODO this is avery brute approach, a solution with an observer that detects the new
                                    transaction would be much better. */
                            var id_rs = self.crypto.getAccountId(secretPhrase, true);                                    
                            for (var i=3; i<7; i++) {
                              $timeout(function () {                                
                                INSTANCE.transactions.getUnconfirmedTransactions(id_rs, self, requests.mainStage, 20 /*, options.node_out */);
                              }, i*1000);
                            }

                            /* It is possible for a transaction to end up in a block before we call getUnconfirmed */
                            $timeout(function () {  
                              INSTANCE.transactions.getNewestTransactions(id_rs, self, requests.mainStage, 20);
                            }, 10*1000);
                          }
                        ).catch(
                          function (error) {
                            error = angular.extend({ fullHash: fullHash }, error);

                             /* @optional observer supported */
                            if (observer) { observer.failed('broadcastTransaction', error); }

                            deferred.reject(error);
                          }
                        );
                      }
                    }
                  }
                  else if (methodConfig.returns) {
                    if (methodConfig.returns.property) {
                      deferred.resolve(data[methodConfig.returns.property]);
                    }
                  }
                  else {

                    /* Add the secretPhrase so callers can store it to the wallet after their operations succeed */
                    if (secretPhrase && !('secretPhrase' in data)) {
                      data.secretPhrase = secretPhrase;
                    }
                    deferred.resolve(data);
                  }
                }
              ).catch(
                function (error) {

                   /* @optional observer supported */
                  if (observer) { observer.failed(methodName, error); }

                  deferred.reject(error);
                }
              );
            }
          ).catch(deferred.reject);
          return deferred.promise;
        };
      });
    },    


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

  /* Utility for determining if a block has passed */
  function blockPassed(_type, height) {
    return INSTANCE.api[_type].blockchain.getHeight() > height;
  }

  function verifyAndSignTransactionBytes(transactionBytes, signature, requestType, data, _type, constants) {
    verifyEngineType(_type);
    var transaction   = {};
    var byteArray     = converters.hexStringToByteArray(transactionBytes);
    transaction.type  = byteArray[0];

    if (blockPassed(_type, constants.DIGITAL_GOODS_STORE_BLOCK)) {
      transaction.version = (byteArray[1] & 0xF0) >> 4;
      transaction.subtype = byteArray[1] & 0x0F;
    } 
    else {
      transaction.subtype = byteArray[1];
    }

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

        if (!blockPassed(_type, constants.DIGITAL_GOODS_STORE_BLOCK)) {
          var messageLength = String(converters.byteArrayToSignedInt32(byteArray, pos));
          pos += 4;
          var slice = byteArray.slice(pos, pos + messageLength);
          transaction.message = converters.byteArrayToHexString(slice);
          if (transaction.message !== data.message) {
            return false;
          }
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
        if (!blockPassed(_type, constants.DIGITAL_GOODS_STORE_BLOCK)) {
          var commentLength = converters.byteArrayToSignedShort(byteArray, pos);
          pos += 2;
          transaction.comment = converters.byteArrayToString(byteArray, pos, commentLength);
          if (transaction.comment !== data.comment) {
            return false;
          }
        }

        if (transaction.asset !== data.asset || transaction.quantityQNT !== data.quantityQNT) {
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

    if (blockPassed(_type, constants.DIGITAL_GOODS_STORE_BLOCK)) {
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
     * Asks the server an account public key
     * @param account String
     * @returns Promise that returns a hex-string 
     */
    this.getAccountPublicKey = function (account) {
      var deferred = $q.defer();
      api.getAccountPublicKey({account:account}, {priority:5, podium: requests.mainStage}).then(
        function (data) {
          deferred.resolve(data.publicKey);
        }
      ).catch(deferred.reject);
      return deferred.promise; 
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
     * @param account       String
     * @param secretPhrase  String
     * @returns Promise ByteArray 
     */
    this.getSharedKeyWithAccount = function (account, secretPhrase) {
      var deferred = $q.defer();
      if (account in _sharedKeys) {
        deferred.resolve(_sharedKeys[account]);
      }
      else {
        var privateKey  = converters.hexStringToByteArray(this.getPrivateKey(secretPhrase));
        this.getAccountPublicKey(account).then(
          function (publicKeyHex) {
            var publicKey   = converters.hexStringToByteArray(publicKeyHex);
            var sharedKey   = getSharedKey(privateKey, publicKey);

            var sharedKeys  = Object.keys(_sharedKeys);
            if (sharedKeys.length > 50) {
              delete _sharedKeys[sharedKeys[0]];
            }
            deferred.response((_sharedKeys[account] = sharedKey));
          }
        );
      }
      return deferred.promise();
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