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
module.factory('nxt', function ($modal, $http, $q, modals, i18n, alerts, db, settings, $timeout, $sce, serverService, corsproxy, plugins) {

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
      },
      supports_batch: true,
      timeout: TIMEOUT_SHORT
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
      },
      supports_batch: true,
      timeout: TIMEOUT_SHORT
    },
    getUnconfirmedTransactions: {
      args: {
        account:    {type: String, required: true}
      },
      returns: {
        property: 'unconfirmedTransactions'
      },
      supports_batch: true,
      timeout: TIMEOUT_SHORT
    },
    getBalance: {
      args: {
        account:      {type: String, required: true}
      },
      supports_batch: true,
      timeout: TIMEOUT_SHORT
    },
    getAccount: {
      args: {
        account:      {type: String, required: true} 
      },
      supports_batch: true,
      timeout: TIMEOUT_SHORT
    },
    startForging: {
      args: {
        secretPhrase: {type: String, required: true},
        sender:       {type: String, argument: false}
      },
      timeout: TIMEOUT_LONG
    },
    stopForging: {
      args: {
        secretPhrase: {type: String, required: true},
        sender:       {type: String, argument: false}
      },
      timeout: TIMEOUT_LONG
    },
    getForging: {
      args: {
        secretPhrase: {type: String, required: true},
        sender:       {type: String, argument: false}
      },
      timeout: TIMEOUT_LONG
    }, 
    sendMoney: {
      args: {
        sender:                       {type: String, argument: false},
        senderRS:                     {type: String, argument: false},
        engine:                       {type: String, argument: false},
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
      },
      timeout: TIMEOUT_LONG
    },
    sendMessage: {
      args: {
        sender:                       {type: String, argument: false},
        senderRS:                     {type: String, argument: false},
        engine:                       {type: String, argument: false},
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
      },
      timeout: TIMEOUT_LONG
    },    
    getAccountPublicKey: {
      args: {
        account: {type: String, required: true}
      },
      supports_batch: true,
      timeout: TIMEOUT_SHORT
    },
    broadcastTransaction: {
      args: {
        transactionBytes: {type: String, required: true}
      },
      requirePost: true,
      timeout: TIMEOUT_LONG
    },
    getState: {
      args: {},
      supports_batch: true,
      timeout: TIMEOUT_SHORT
    },
    getBlock: {
      args: {
        block: {type: String, required: true}
      },
      supports_batch: true,
      timeout: TIMEOUT_SHORT
    },
    getBlockId: {
      args: {
        height: {type: Number, required: true}
      },
      supports_batch: true,
      timeout: TIMEOUT_SHORT
    },
    getAlias: {
      args: {
        alias:      {type: String},
        aliasName:  {type: String}
      },
      supports_batch: true,
      timeout: TIMEOUT_SHORT
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
      },
      timeout: TIMEOUT_LONG
    },
    getAliases: {
      args: {
        timestamp:      {type: Number},
        account:        {type: String, required: true}
      },
      returns: {
        property: 'aliases'
      },
      supports_batch: true,
      timeout: TIMEOUT_SHORT
    },
    getNamespacedAlias: {
      args: {
        account:        {type: String},
        alias:          {type: String},
        aliasName:      {type: String}
      },
      supports_batch: true,
      timeout: TIMEOUT_SHORT
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
      },
      timeout: TIMEOUT_LONG
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
      },
      supports_batch: true,
      timeout: TIMEOUT_SHORT
    },
    getTransaction: {
      args: {
        transaction:  {type: String},
        fullHash:     {type: String}
      },
      supports_batch: true,
      timeout: TIMEOUT_SHORT
    },
    getAllAssets: {
      args: {},
      returns: {
        property: 'assets'
      },
      supports_batch: true,
      timeout: TIMEOUT_SHORT
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
    this.localhost     = 'http://127.0.0.1';
    this.localHostNode = null;

    /* Currently set from the fim-engine and nxt-engine plugins from an iterval that tests
       constantly tests for an available localhost API, this combined with a test if the
       blockchain was actually downloaded in full. */
    this.can_use_localhost = false;

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
    angular.forEach(['transactions', 'blocks', 'assets'], function (kind) {
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
    init: function () {
      if (!this.promise) {
        var deferred = $q.defer();
        this.promise = deferred.promise;        
        var self     = this;
        db.nodes.where('port').equals(this.port).toArray().then(
          function (nodes) {
            self.nodes = nodes;
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
      var self = this;
      var deferred = $q.defer();
      if (this.localHostNode === null) {
        for (var i=0; i<this.nodes.length; i++) {
          if (this.nodes[i].url == this.localhost) {
            this.localHostNode = this.nodes[i];
            break;
          }
        }

        /* Not in the database have to add it first */
        if (this.localHostNode === null) {
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
              db.nodes.where('port').equals(this.port).first().then(
                function (node) {
                  this.localHostNode = node;
                  deferred.resolve(node);
                }
              );
            }
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

    /* @param node_ref Object optional { force: node, force_once: node }
     * @returns Node */
    getNode: function (node_ref) {
      var deferred = $q.defer();
      var self = this;
      this.init().then(
        function () {
          /* When a localhost API is available it will override all other rules
             This basically means a server is running and the blockchain has fully downloaded */
          if (self.can_use_localhost) {
            self.getLocalHostNode().then(
              function (node) {

                /* XXX - Is this actually needed for localhost nodes? Since there is only 1 ?? */
                node.update({ start_timestamp: Date.now()}).then(
                  function () {
                    deferred.resolve(node);
                  }
                );
              }
            );
          }
          /* force_once means we must force a node but only once */
          else if (node_ref && node_ref.force_once) {
            var node = node_ref.force_once;
            delete node_ref.force_once;
            node.update({ start_timestamp: Date.now()}).then(
              function () {
                deferred.resolve(node);
              }
            );
          }
          /* force means we can only use the forced node */
          else if (node_ref && node_ref.force) {
            var node = node_ref.force;
            node.update({ start_timestamp: Date.now()}).then(
              function () {
                deferred.resolve(node);
              }
            );
          }
          /* in all other cases select a node from the pool */
          else {
            var nodes = self.nodes.filter(function (node) { 
                      /* Filter blacklisted nodes */
              return ((Date.now() - node.failed_timestamp) > BLACKLIST_MILLISECONDS) &&
                      /* Filter localhost */
                      node.url != self.localhost;
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
                }
              );
            }
          }
        }
      );
      return deferred.promise;
    },

    constants: function () {
      return this._constants[this.type][this.net];
    }
  };

  function RequestHandler(engine) {
    this.engine = engine;
    this.pending = {};
    this.observers = [];

    /**
     * By enabling request batching we'll allow certain request types to be
     * reused by multiple calls. A request batch occurs when a request is 
     * started while another caller is still waiting for his same request
     * to finish. In this case the new caller is scheduled to run after 
     * the first caller received his data.
     *
     * Windows bug: On linux all seems to work fine. But on windows it is 
     * causing calls to getState to never return.
     *
     * DISABLED FOR NOW..
     */
    this.enableRequestBatch = false;
  };
  RequestHandler.prototype = {
    /**
     * Adds an observer thats called for the various events in the lifecycle 
     * of a request.
     *
     * @param observer Object { 
     *    start:    fn(methodName, node),
     *    success:  fn(methodName, node, data, tries_left), 
     *    failed:   fn(methodName, node, data, tries_left) 
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
    /**
     * @param methodName String
     * @param methodConfig Object
     * @param args Object
     * @param node_ref Object [optional] force which node to use with node_ref.force
     *                                   access the used node through node_ref.value
     * @param canceller $q.defer() that cancels the request when resolved
     **/
    sendRequest: function (methodName, methodConfig, args, node_ref, canceller) {
      if (node_ref.force && methodConfig.batch) { throw new Error('Cannot use batch requests and force node at the same time'); }
      var deferred = $q.defer();
      if (methodConfig.supports_batch && this.enableRequestBatch) {
        var fingerprint = this.getFingerPrint(methodName, args);
        if (!this.pending[fingerprint]) {
          this.pending[fingerprint] = this.retry(FAILED_RETRIES, methodName, methodConfig, args, null, canceller);
        }
        this.pending[fingerprint].then(deferred.resolve, deferred.reject);
      }
      else {
        this.retry(FAILED_RETRIES, methodName, methodConfig, args, node_ref, canceller).then(deferred.resolve, deferred.reject);
      }
      return deferred.promise;
    },
    retry: function (tries_left, methodName, methodConfig, args, node_ref, canceller) {
      var self = this;
      var deferred = $q.defer();
      var fingerprint = methodConfig.supports_batch && this.enableRequestBatch ? 
                          this.getFingerPrint(methodName, args) : null;
      node_ref = node_ref || {};
      this.doInternalRequest(methodName, methodConfig, args, node_ref, canceller).then(
        function (data) {
          self.notify('success', [methodName, node_ref.value, data, tries_left]);
          if (methodConfig.supports_batch && self.enableRequestBatch) {
            delete self.pending[fingerprint];
          }
          deferred.resolve(data);
        },
        function (error) {
          self.notify('failed', [methodName, node_ref.value, error, tries_left]);
          if (methodConfig.supports_batch && self.enableRequestBatch) {
            delete self.pending[fingerprint];
          }
          if (tries_left > 0 && (error && error.retryable)) {
            console.log('RequestHandler.retry.'+methodName+' tries_left='+tries_left, args);
            self.retry(tries_left-1, methodName, methodConfig, args, node_ref, canceller).then(deferred.resolve, deferred.reject);
          } 
          else {
            deferred.reject(error);
          }
        }
      )
      return deferred.promise;
    },
    doInternalRequest: function (methodName, methodConfig, args, node_ref, canceller) {
      var self = this;
      var deferred = $q.defer();
      this.getNode(node_ref).then(
        function (node) {
          if (node_ref && typeof node_ref == 'object') {
            node_ref.value = node;
          }

          var force_cors = corsproxy.requiresProxy(node);
          var promise = (methodConfig.args.secretPhrase || methodConfig.requirePost) ? 
                          self.do_post(methodName, args, node, canceller, force_cors) : 
                          self.do_get(methodName, args, node, canceller, force_cors);

          self.notify('start', [methodName, node]);
          promise.then(
            function (data) {
              
              /* This host does not allow public API access | must remove from db */
              if (data && data.errorCode == 7 /* && data.errorDescription == 'Not allowed' */) {
                node.delete().then(
                  function () {
                    deferred.reject(data);
                  }
                );
                return;
              }

              if (data.errorCode && !data.errorDescription) {
                data.errorDescription = (data.errorMessage ? data.errorMessage : "Unknown error occured.");
              }

              if (data.errorDescription) {
                deferred.reject(data);
              }
              else {
                deferred.resolve(data);
              }
            },
            /* Retries are only performed for HTTP level errors, not for valid API error messages */
            function (data) {
              data = data||{};
              data.retryable = true;
              deferred.reject(data)
            }
          );
        },
        deferred.reject
      );
      return deferred.promise;      
    },
    /* POST does not have support for proxifying urls to use cors server */
    do_post: function (requestType, args, node, _canceller, force_cors) {
      var self = this;
      var deferred = $q.defer();
      if (node) {
        var qs = "";
        if (Array.isArray(args)) {
          angular.forEach(args, function (tuple) {
            for (var name in tuple) {
              qs += '&' + name + '=' + encodeURIComponent(tuple[name]);
            }    
          });
        }
        else {
          for (var name in args) {
            qs += '&' + name + '=' + encodeURIComponent(args[name]);
          }
        }

        console.log(node.url+' START.'+requestType, args);        
        this.http(node, {
                    method: 'POST',
                    /*dataType: 'json',*/
                    /* Proxify the url if needed */
                    url: force_cors ? corsproxy.proxify(node, this.create_url(node, requestType)) : this.create_url(node, requestType),
                    data: qs,
                    headers: {'Content-Type': 'application/x-www-form-urlencoded'},
                    timeout: this.createTimeout(requestType, _canceller ? _canceller.promise : canceller.promise)
                  }).then(deferred.resolve, deferred.reject);
      }
      else {
        deferred.reject();
      }
      return deferred.promise;
    },
    do_get: function (requestType, args, node, _canceller, force_cors) {
      var self = this;
      var deferred = $q.defer();
      if (node) {
        var url = this.create_url(node, requestType);
        if (Array.isArray(args)) {
          angular.forEach(args, function (tuple) {
            for (var name in tuple) {
              url += '&' + name + '=' + encodeURIComponent(tuple[name]);
            }    
          });
        }
        else {
          for (var name in args) {
            url += '&' + name + '=' + encodeURIComponent(args[name]);
          }    
        }

        console.log(node.url+' START.'+requestType, args);
        this.http(node, { 
                    method: 'GET', 
                    dataType: 'json',
                    /* Proxify the url if needed */
                    url: force_cors ? corsproxy.proxify(node, url) : url,
                    timeout: this.createTimeout(requestType, _canceller ? _canceller.promise : canceller.promise)

                  }).then(deferred.resolve, deferred.reject);
      }
      else {
        deferred.reject();
      }
      return deferred.promise;
    },
    /* Creates a timeout that cancels the request after a preset amount of milliseconds (see the
       timeout properties on NXT_API members) and/or when the provided promise is resolved */
    createTimeout: function (requestType, promise) {
      var deferred = $q.defer();
      var ms = NXT_API[requestType].timeout();
      var timeout  = $timeout(
        function () { 
          deferred.resolve({errorDescription: 'Timeout'});
        }, ms);
      if (promise) {
        promise.then(
          function () {
            $timeout.cancel(timeout);
            deferred.resolve();
          }
        );
      }
      return deferred.promise;
    },
    http: function (node, args) {
      var self = this;
      var deferred = $q.defer();
      $http(args).success(
        function (data, status, headers, config) {
          console.log(node.url+' SUCCESS', DEBUG?{data:data,status:status,headers:headers,config:config}:status);
          node.update({success_timestamp: Date.now(), success_status: status});
          deferred.resolve(data);
        }
      ).error(
        function (data, status, headers, config) {
          console.log(node.url+' FAILURE', DEBUG?{data:data,status:status,headers:headers,config:config}:status);
          node.update({failed_timestamp: Date.now(), failed_status: status});
          deferred.reject(data);
        }
      );
      return deferred.promise;
    },
    /* creates a fingerprint made up of methodname and all arguments (names and values)
     * @returns a pending promise for this method with the same args OR undefined */
    getFingerPrint: function(methodName, args) {
      var keys = Object.keys(args||{});
      keys.sort();
      var hash = [];
      keys.forEach(function (key) { hash.push(key, args[key]); });
      return methodName + hash.join('');
    },
    getNode: function (node_ref) {
      if (node_ref && node_ref.force) {
        var deferred = $q.defer();
        deferred.resolve(node_ref.force);
        return deferred.promise;
      }
      return this.engine.getNode(node_ref);
    },
    create_url: function (node, requestType) {
      return [node.url,':',node.port,'/nxt?requestType=',requestType,'&random=',Math.random()].join('');
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
   *   state.time().then(
   *     function (time) {
   *       console.log('The time is ' + time);
   *     }
   *   )
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

  function TransactionDownloader(account, api) {
    var self        = this;
    this.account    = account;
    this.api        = api;
    this.busy          = false;
    this.isBackFilling = false;
    this.canceller  = null;

    /* Always start backfilling */
    this.startBackfilling();
  }
  TransactionDownloader.prototype = {

    /**
     * Downloads transactions until it finds all downloaded transactions in a pack
     * are already in the database.
     **/
    downloadTransactions: function (pack_size) {
      this.canceller = $q.defer();
      this.stopBackfill = false;
      this.download(pack_size||10, false);
    },

    /**
     * Forcefully download all transactions. This increases the pack size for the number
     * of transactions to start with. For the rest it works the same downloadTransactions.
     **/
    downloadAllTransactions: function (pack_size) {
      this.canceller = $q.defer();
      this.stopBackfill = false;
      this.download(pack_size||250, true);
    },

    download: function (pack_size, all) {
      var self = this;
      this.api.getAccountTransactions({
        account:    self.account.id_rs,
        firstIndex: 0,
        lastIndex:  20
      }).then(
        function (transactions) {
          db.transaction("rw", self.api.engine.db.transactions, function () {
            angular.forEach(transactions, function (transaction) {
              self.api.engine.db.transactions.put(transaction);
            });
          });

          /* Go get the rest */
          self.getTransactions(20, pack_size, true);
        }
      );
    },

    startBackfilling: function () {
      if (!this.isBackFilling) {
        this.backfillTransactions();
      }
    },

    stopBackfilling: function () {
      if (this.canceller) {
        this.canceller.resolve();
        this.canceller = null;
        this.stopBackfill = true;
      }
    },

    /**
     * Backfill all pending transactions for this account.
     **/
    backfillTransactions: function () {
      this.isBackFilling = true;
      var self = this;
      this.api.engine.db.transactions.where('related_rs_a').equals(this.account.id_rs).
                                      or('related_rs_b').equals(this.account.id_rs).
                                      sortBy('related_index').then(
        function success(pending_transactions) {
          if (pending_transactions.length > 0 && !this.stopBackfill) {

            /* Download the pending transaction from the network */
            var pending = pending_transactions[0];
            self.api.getTransaction({transaction: pending.transaction}).then(
              function success(transaction) {

                /* Replace the object in the database | this removes the related_rs_a and related_rs_b fields */
                self.api.engine.db.transactions.put(transaction, transaction.transaction).then(
                  function success() {

                    /* Backfill the next one */
                    $timeout(function () {
                      self.backfillTransactions();  
                    }, 0, false /* NO! digest+apply */);                    
                  }
                );
              }
            );
          }
          else {
            self.isBackFilling = false;
          }
        }
      );
    },

    getTransactions: function (start, count, download_all) {
      var self = this;
      var firstIndex = start;
      var lastIndex = start + count - 1;

      function process(iterator, _index, done) {
        var id = iterator.next();
        self.api.engine.db.transactions.where('transaction').equals(id).first().then(
          function (transaction) {
            /* It's not in our database */
            if (transaction === undefined) {

              /* In order for sorting to work we need to store a sort key that indicates the order */
              self.api.engine.db.transactions.put({
                transaction: id,
                related_rs_a: self.account.id_rs,
                related_index: firstIndex+_index
              }).then(
                function () {
                  if (iterator.hasMore()) { 
                    process(iterator, _index+1, done); 
                  }
                  else {
                    done.call();
                  }
                }
              );
            }
            /* Transaction is in the database but could still be pending for another account */
            else if (transaction && transaction.related_rs_a && transaction.related_rs_a != self.account.id_rs) {

              /* Add current account as related_rs_b */
              self.api.engine.db.transactions.update(id, {
                related_rs_b: self.account.id_rs,
                related_index: firstIndex+_index /* XXX will this put us at the start of the queue ? */
              }).then(
                function () {
                  if (iterator.hasMore()) { 
                    process(iterator, _index+1, done); 
                  }
                  else {
                    done.call();
                  }
                }
              );
            }
            else {
              if (iterator.hasMore()) { 
                process(iterator, _index+1, done); 
              }
              else {
                done.call();
              }
            }
          }
        );
      }

      this.api.getAccountTransactionIds({
        account:    this.account.id_rs,
        firstIndex: firstIndex,
        lastIndex:  lastIndex        
      }).then(
        function (transaction_ids) {
          if (!transaction_ids) return;
          var iterator = new Iterator(transaction_ids);
          if (iterator.hasMore()) { 
            db.transaction("rw", self.api.engine.db.transactions, function () {
              process(iterator, 0, function done() {

                /* Call from timeout to break out transaction block */
                $timeout(function () {

                  /* Start the backfilling process */
                  self.startBackfilling();

                  /* In case we are downloading the whole set of transactions we can continue
                     with the next batch where the previous retrieval has left off.
                     To determine where to continue we count the total number of transactions
                     in the db and simply ask the network for the first batch of transactions
                     following that number. */
                  if (download_all) {
                    self.countTransactionsInDB().then(
                      function (_count) {
                        if (_count > 0) {
                          self.getTransactions(_count-1, count, download_all);
                        }
                      }
                    );
                  }
                }, 0, false);
              });
            });
          } 
        }
      );
    },

    countTransactionsInDB: function () {
      var deferred = $q.defer();
      this.api.engine.db.transactions.where('senderRS').equals(this.account.id_rs).
                                      or('recipientRS').equals(this.account.id_rs).
                                      or('related_rs_a').equals(this.account.id_rs).
                                      or('related_rs_b').equals(this.account.id_rs).count(
        function (count) {
          deferred.resolve(count);
        }
      );
      return deferred.promise;
    },

    /**
     * Called on controller activation for selected account and on interval afterwards.
     * Asks the server for unconfirmed transactions
     */
    getUnconfirmedTransactions: function () {
      var self = this;

      /* XXX TODO Require that all account objects in the database have a numeric id */
      if (!this.account.id || this.account.id.length < 10) {
        var address = this.api.createAddress();
        if (address.set(this.account.id_rs)) {
          this.account.id = address.account_id();
        }        
      }

      this.api.getUnconfirmedTransactions(
        {account: this.account.id}, 
        null, this.canceller
      ).then(
        function (transactions) { 
          db.transaction('rw', self.api.engine.db.transactions, function () {
            angular.forEach(transactions, function (transaction) {
              self.api.engine.db.transactions.put(transaction);
            });
          });
        },
        function (error) {
          if (error && error.errorCode != 5) {
            console.log("Could not get transactions");
          }
        }
      );
    },

    // processTransaction: function (transaction, next) {
    //   var self = this;
    //   this.api.engine.db.transactions.where('transaction').equals(transaction.transaction).count(
    //     function (count) {
    //       if (count == 0) {
    //         self.inserted++;
    //         self.api.engine.db.transactions.put(transaction).then(function () { next(true) });
    //       }
    //       else {
    //         next(false);
    //       }
    //     }
    //   );
    // }
  };

  function AssetsManager(api) {
    this.api = api;
    this.assets = {};
    this.init();      /* Load from database */
  }
  AssetsManager.prototype = {
    init: function () {
      var self = this;
      this.api.engine.db.assets.toArray().then(
        function (assets) {
          angular.forEach(assets, function (asset) {
            self.assets[assets.asset] = asset;
          });
          self.download();  /* Update from network */          
        }
      );
    },
    download: function () {
      var self = this;
      this.api.getAllAssets().then(
        function (assets) {
          db.transaction('rw', self.api.engine.db.assets, function () {
            angular.forEach(assets, function (asset) {
              self.api.engine.db.assets.where('asset').equals(asset.asset).first().then(
                function (existing_asset) {
                  if (existing_asset) {
                    self.api.engine.db.assets.update(asset.asset, asset);
                  }
                  else {
                    self.api.engine.db.assets.add(asset); 
                  }
                }
              );
              self.assets[asset.asset] = asset;
            });
          });
        }
      );
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
        return template.replace(/__LABEL__/g, label).replace(/__VALUE__/g, encodeURIComponent(value||label));
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
            var css = 'overflow: hidden;text-overflow: ellipsis;white-space: nowrap;width: 180px; max-width: 180px; display:inline-block; vertical-align: text-bottom;';
            html.push('&nbsp;<span style="',css,'" data-text="',JSON.stringify(decoded.text),'">',decoded.text,'</span></span>');
          }
          else {
            html.push('&nbsp;encrypted&nbsp;<a href="#" ',
                      'onclick="event.preventDefault(); if (angular.element(this).scope().onMessageUnlockClick) { ',
                      'angular.element(this).scope().onMessageUnlockClick(this) }">',
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
              if (transaction.attachment && transaction.attachment['version.PublicKeyAnnouncement']) {
                    return sprintf('%s %s <strong>published public key</strong> for %s (%s) %s %s', 
                              label(transaction),
                              render(TYPE.ACCOUNT, transaction.senderRS), 
                              render(TYPE.ACCOUNT, transaction.recipientRS), 
                              render(TYPE.JSON,'details',JSON.stringify(transaction)),
                              fee(transaction),
                              message(transaction));
              }
              else {
                    return sprintf('%s %s <strong>sent a message</strong> to %s (%s) %s %s', 
                              label(transaction),
                              render(TYPE.ACCOUNT, transaction.senderRS), 
                              render(TYPE.ACCOUNT, transaction.recipientRS), 
                              render(TYPE.JSON,'details',JSON.stringify(transaction)),
                              fee(transaction),
                              message(transaction));

              }
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

    (function (blockchain) {
      setInterval(function () { blockchain.getNewBlocks() }, 10 * 1000);
      setTimeout( function () { blockchain.getNewBlocks() }, 100);
    })(this.blockchain);   
  };
  ServerAPI.prototype = {

    /* Non intrusive transaction downloader - 
        works only when it's needed - 
          this method can be called repeatedly */
    downloadTransactions: function (account, get_all) {
      if (!(account.id_rs in this.downloaders)) {
        var d = this.downloaders[account.id_rs] = new TransactionDownloader(account, this);
      } else {
        var d = this.downloaders[account.id_rs];
      }
      if (get_all) {
        d.downloadTransactions(50, true);
      }
      else {
        d.downloadTransactions(10);
      }
      return d;
    },

    /* Called when we navigate away from the accounts section.
       XXX This could use better separation from the accounts plugin */
    stopDownloadingTransactions: function (account) {
      var d = this.downloaders[account.id_rs];
      if (d) {
        d.stopBackfilling();
      }
    },

    /* Creates the NxtAddress for this coin */
    createAddress: function () {
      return new NxtAddress(this.type == TYPE_NXT ? 'NXT' : 'FIM');
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

          args = angular.copy(args) || {};
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

              /* With sendRequest you can forcefully set the node to use through passing an object like:
                 {force: Node} if you provide an object as the node_ref argument the Node that was used will
                 be in the out property. {value: Node} */
              var node_ref = { force: node, value: null };

              /* Sanity check - make absolutely sure secretPhrase is only send to whitelisted servers */
              if (['startForging', 'stopForging', 'getForging'].indexOf(methodName) != -1) {
                if (!node_ref.force) {
                  deferred.reject('Unexpected error. You must provide a forced node for this operation');
                  return;
                }
                // console.log('allowed.hosts', settings.get('forging.allowed.hosts'));
                // console.log('node_ref.force.url', node_ref.force.url);
                if ((settings.get('forging.allowed.hosts') || []).indexOf(node_ref.force.url) == -1) {
                  deferred.reject('Unexpected error. Blocked sending of secrethrase to unknown host.');
                  return;
                }
              }

              /* @optional observer supported */
              if (observer) { observer.start(methodName, args); }

              /* Make the call to the server */
              self.requestHandler.sendRequest(methodName, methodConfig, args, node_ref, canceller).then(
                function (data) {

                  /* @optional observer supported */
                  if (observer) { observer.success(methodName); }

                  /* The server prepared an unsigned transaction that we must sign and broadcast */
                  if (secretPhrase && data.unsignedTransactionBytes) {
                    var publicKey   = self.crypto.secretPhraseToPublicKey(secretPhrase);
                    var signature   = self.crypto.signBytes(data.unsignedTransactionBytes, converters.stringToHexString(secretPhrase));

                    /* Required by verifyAndSignTransactionBytes */
                    args.publicKey  = publicKey;

                    if (!self.crypto.verifyBytes(signature, data.unsignedTransactionBytes, publicKey)) {
                      deferred.reject(i18n.format('error_signature_verification_client'));
                      return;
                    } 
                    else {
                      var payload = verifyAndSignTransactionBytes(data.unsignedTransactionBytes, signature, methodName, 
                                        args, self.type, self.engine.constants());
                      if (!payload) {
                        deferred.reject(i18n.format('error_signature_verification_server'));
                        return;
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

                                  */

                        /* @optional observer supported */
                        if (observer) { observer.start('broadcastTransaction'); }

                        self.broadcastTransaction({transactionBytes: payload}, node_ref.value, canceller).then(
                          function (data) {

                             /* @optional observer supported */
                            if (observer) { observer.success('broadcastTransaction'); }

                            deferred.resolve(data);
                          }
                        ).catch(
                          function (error) {

                             /* @optional observer supported */
                            if (observer) { observer.failed('broadcastTransaction'); }

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
                  if (observer) { observer.failed(methodName); }

                  deferred.reject(error);
                }
              );
            }
          ).catch(deferred.reject);
          return deferred.promise;
        };
      });
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
      api.getAccountPublicKey({account:account}).then(
        function (data) {
          deferred.resolve(data.publicKey);
        }
      ).catch(alerts.catch('Could not get publickey'));
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