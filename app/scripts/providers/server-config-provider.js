(function () {
'use strict';

var PROPERTIES = {

  "PEER NETWORKING": {
    "nxt.shareMyAddress": "Announce my IP address/hostname to peers and allow them to share it with other peers. If disabled, peer networking servlet will not be started at all.",
    "nxt.peerServerPort": "Port for incoming peer to peer networking requests, if enabled.",
    "nxt.peerServerHost": "Host interface on which to listen for peer networking requests, default all. Use 0.0.0.0 to listen on all IPv4 interfaces or :: to listen on all IPv4 and IPv6 interfaces",
    "nxt.myAddress": "My externally visible IP address or host name, to be announced to peers. It can optionally include a port number, which will also be announced to peers, and may be different from nxt.peerServerPort (useful if you do port forwarding behind a router).",
    "nxt.myPlatform": "My platform, to be announced to peers.",
    "nxt.myHallmark": "My hallmark, if available.",
    "nxt.wellKnownPeers": "A list of well known peer addresses / host names, separated by '; '.",
    "nxt.knownBlacklistedPeers": "Known bad peers to be blacklisted",
    "nxt.knownWhitelistedPeers": "Known peers to be whitelisted (FIMKrypto only)",
    "nxt.testnetPeers": "Peers used for testnet only.",
    "nxt.maxNumberOfConnectedPublicPeers": "Maintain active connections with at least that many peers.",
    "nxt.connectTimeout": "Peer networking connect timeout for outgoing connections.",
    "nxt.readTimeout": "Peer networking read timeout for outgoing connections.",
    "nxt.peerServerIdleTimeout": "Peer networking server idle timeout, milliseconds.",
    "nxt.enableHallmarkProtection": "Use the peer hallmark to only connect with peers above the defined push/pull hallmark thresholds. Disabling hallmark protection also disables weighting of peers by hallmark weight, so connecting to any of your peers becomes equally likely.",
    "nxt.pushThreshold": "Hallmark threshold to use when sending data to peers.",
    "nxt.pullThreshold": "Hallmark threshold to use when requesting data from peers.",
    "nxt.blacklistingPeriod": "Blacklist peers for 600000 milliseconds (i.e. 10 minutes by default).",
    "nxt.sendToPeersLimit": "Consider a new transaction or block sent after 10 peers have received it.",
    "nxt.enablePeerServerDoSFilter": "Enable the Jetty Denial of Service Filter for the peer networking server.",
    "nxt.enablePeerServerGZIPFilter": "Compress Http responses for the peer networking server.",
    "nxt.isTestnet": "Use testnet, leave set to false unless you are really testing. Never unlock your real accounts on testnet! Use separate accounts for testing only. When using testnet, all custom port settings will be ignored, and hardcoded ports of 6884 (peer networking), 6885 (UI) and 6886 (API) will be used.",
    "nxt.savePeers": "Save known peers in the database",
    "nxt.usePeersDb": "Set to false to disable use of the peers database. This will not delete saved peers.",
    "nxt.getMorePeers": "Set to false to disable getting more peers from the currently connected peers. Only useful when debugging and want to limit the peers to those in peersDb or wellKnownPeers.",
    "nxt.isOffline": "Set to true to run offline - do not connect to peers and do not listen for incoming peer connections. This is equivalent to setting nxt.shareMyAddress=false, nxt.wellKnownPeers=, nxt.testnetPeers= and nxt.usePeersDb=false, and if set to true overrides those properties.",
    "nxt.enableTransactionRebroadcasting": "Enable re-broadcasting of new transactions until they are received back from at least one peer, or found in the blockchain. This feature can optionally be disabled, to avoid the risk of revealing that this node is the submitter of such re-broadcasted new transactions.",
    "nxt.numberOfForkConfirmations": "Verify batches of blocks downloaded from a single peer with that many other peers.",
    "nxt.testnetNumberOfForkConfirmations": "Verify batches of blocks downloaded from a single peer with that many other peers."
  },

  "API SERVER": {
    "nxt.enableAPIServer": "Accept http/json API requests.",
    "nxt.allowedBotHosts": "Hosts from which to allow http/json API requests, if enabled. Set to * to allow all. Can also specify networks in CIDR notation, e.g. 192.168.1.0/24.",
    "nxt.apiServerPort": "Port for http/json API requests.",
    "nxt.apiServerHost": "Host interface on which to listen for http/json API request, default localhost only. Set to 0.0.0.0 to allow the API server to accept requests from all network interfaces.",
    "nxt.apiServerIdleTimeout": "Idle timeout for http/json API request connections, milliseconds.",
    "nxt.apiResourceBase": "Directory with html and javascript files for the new client UI, and admin tools utilizing the http/json API.",
    "nxt.apiWelcomeFile": "Default page for the API server.",
    "nxt.javadocResourceBase": "Java API documentation directory, optional.",
    "nxt.apiServerCORS": "Enable Cross Origin Filter for the API server.",
    "nxt.apiSSL": "Enable SSL for the API server (also need to set nxt.keyStorePath and nxt.keyStorePassword).",
    "nxt.apiServerEnforcePOST": "Enforce requests that require POST to only be accepted when submitted as POST.",
    "nxt.enableAPIServerGZIPFilter": "Compress Http responses for the API server."
  },

  "WEBSOCKET SERVER": {
    "nxt.enableWebsockets": "Accept websocket/json API requests.",
    "nxt.websocketServerPort": "Port for websocket/json API requests.",
    "nxt.websocketServerHost": "Host interface on which to listen for websocket/json API request, default localhost only. Set to 0.0.0.0 to allow the API server to accept requests from all network interfaces.",
    "nxt.websocketSSL": "Enable SSL for the WEBSOCKET server (also need to set nxt.keyStorePath and nxt.keyStorePassword)."
  },

  "OLD NRS USER INTERFACE": {
    "nxt.enableUIServer": "Enable the deprecated NRS user interface.",
    "nxt.allowedUserHosts": "Hosts from which to allow NRS user interface requests, if enabled. Set to * to allow all.",
    "nxt.uiServerPort": "Port for NRS user interface server.",
    "nxt.uiServerHost": "Host interface for NRS user interface server, default localhost only. Set to 0.0.0.0 to allow the UI to be accessed on all network interfaces.",
    "nxt.uiServerIdleTimeout": "Idle timeout for NRS user interface server, milliseconds.",
    "nxt.uiResourceBase": "Directory with html and javascript files for the NRS client user interface.",
    "nxt.uiServerCORS": "Enable Cross Origin Filter for NRS user interface server.",
    "nxt.uiSSL": "Enable SSL for the NRS user interface (also need to set nxt.keyStorePath and nxt.keyStorePassword).",
    "nxt.uiServerEnforcePOST": "Enforce requests that require POST to only be accepted when submitted as POST.",
  },

  "DEBUGGING": {
    "nxt.enableLogTraceback": "Include caller traceback in log messages.",
    "nxt.enableStackTraces": "Enable logging of exception stack traces.",
    "nxt.communicationLoggingMask": "Used for debugging peer to peer communications. 1=exceptions, 2=non 200 response, 4=200 response",
    "nxt.debugTraceAccounts": "Track balances of the following accounts and related events for debugging purposes.",
    "nxt.debugTraceLog": "File name for logging tracked account balances.",
    "nxt.debugTraceSeparator": "Separator character for trace log.",
    "nxt.debugTraceQuote": "Quote character for trace log.",
    "nxt.debugLogUnconfirmed": "Log changes to unconfirmed balances.",
  },

  "DATABASE": {
    "nxt.dbUrl": "Database connection JDBC url, see the H2 documentation for possible customizations. Append ;AUTO_SERVER=TRUE to enable automatic mixed mode access. The nxt_db folder is expected to be in the current working directory, will be created if missing.",
    "nxt.testDbUrl": "Database connection JDBC url to use with the test network, if isTestnet=true",
    "nxt.dbLoginTimeout": "Database connection timeout in seconds.",
    "nxt.dbDefaultLockTimeout": "Database default lock timeout in seconds.",
    "nxt.maxDbConnections": "Maximum simultaneous database connections.",
    "nxt.dbCacheKB": "The memory allocated to database cache, in kB. If set to 0, the cache size varies from a minimum of 16MB for heap sizes 160MB or less, to a maximum of 256MB for heap sizes 640MB or higher.",
    "nxt.trimDerivedTables": "Enable trimming of derived objects tables.",
    "nxt.maxRollback": "If trimming enabled, maintain enough previous height records to allow rollback of at least that many blocks. Must be at least 1440 to allow normal fork resolution. After increasing this value, a full re-scan needs to be done in order for previously trimmed records to be re-created and preserved."
  },

  "MINT": {
    "nxt.mint.serverAddress": "Address of the NXT server to which the mint worker submits its transactions (default: localhost)",
    "nxt.mint.currencyCode": "Specify a mintable currency code",
    "nxt.mint.secretPhrase": "Secret phrase for the minting account, this secret phrase is sent to the host specified by nxt.mint.serverAddress therefore do not specify secret phrase of an account with lots of funds",
    "nxt.mint.unitsPerMint": "Number of units to mint per transaction The minting difficulty grows linearly with the number of units per mint",
    "nxt.mint.initialNonce": "The initial nonce used for minting. Set to 0 to start with a random nonce",
    "nxt.mint.threadPoolSize": "Number of concurrency threads used for minting. Set to 0 allocate one thread per processor core",
    "nxt.mint.isSubmitted": "When set to false mint transactions are not submitted when a hash is solved. Set this value to true to perform actual minting"
  },

  "FIM Specific": {
    "nxt.allowedToForge": "For public nodes, only allow these accounts to forge. Values can be a ; delimited list of accounts, an empty value (for no forging allowed) or a * to allow all accounts to forge. "
  },

  "JETTY": {
    "nxt.peerServerDoSFilter.maxRequestsPerSec": "Settings for the Jetty Denial Of Service Filter, used for the peer networking server only.",
    "nxt.peerServerDoSFilter.delayMs": "Settings for the Jetty Denial Of Service Filter, used for the peer networking server only.",
    "nxt.peerServerDoSFilter.maxRequestMs": "Settings for the Jetty Denial Of Service Filter, used for the peer networking server only.",
    "nxt.keyStorePath": "keystore file, required if uiSSL or apiSSL are enabled.",
    "nxt.keyStorePassword": "password, required if uiSSL or apiSSL are enabled."
  },

  "Developers only": {
    "nxt.forceValidate": "Force re-validation of blocks and transaction at start.",
    "nxt.forceScan": "Force re-build of derived objects tables at start.",
    "nxt.dumpPeersVersion": "Print a list of peers having this version on exit.",
    "nxt.enableDebugAPI": "Enable API requests used for blockchain and database manipulation.",
    "nxt.timeMultiplier": "Scale epoch time for faster forging. Only works when offline."
  }
};

var TEST_DEFAULT = {
  "nxt.shareMyAddress": 1,
  "nxt.peerServerPort": 2,
  "nxt.peerServerHost": 3,
  "nxt.myAddress": 4,
  "nxt.myPlatform": 5,
  "nxt.myHallmark": 6,
};

var TEST_USER = {
  "nxt.shareMyAddress": 3,
  "nxt.peerServerPort": 4,
  "nxt.peerServerHost": 5,
  "nxt.myAddress": 7,
  "nxt.myPlatform": 9,
  "nxt.myHallmark": 10,
};

var module = angular.module('fim.base');
module.factory('ServerConfigProvider', function (serverService, plugins) {
  if (isNodeJS) {
    var fs = require('fs');
    var properties = require('java-properties');  
    var os = require('os');
  }
  
  function ServerConfigProvider(api, $scope) {
    this.api               = api;
    this.$scope            = $scope;
    this.defaultConfigPath = serverService.getConfFilePath(api.engine.type, 'nxt-default.properties');
    this.userConfigPath    = serverService.getConfFilePath(api.engine.type, 'nxt.properties');
    this.defaultConfig     = {};
    this.userConfig        = {};
    this.config            = {};
    this.rows              = [];
  }
  ServerConfigProvider.prototype = {
    load: function () {
      this.defaultConfig   = /*TEST_DEFAULT;*/ this.readConfig(this.defaultConfigPath);
      this.userConfig      = /*TEST_USER;*/ this.readConfig(this.userConfigPath);
      this.config          = angular.copy(this.defaultConfig);
      angular.extend(this.defaultConfig, this.userConfig);

      for (var name in PROPERTIES) {
        this.rows.push({ type: 0, name: name });
        for (var key in PROPERTIES[name]) {
          this.rows.push({ 
            type: 1, 
            name: key, 
            value: this.config[key], 
            description: PROPERTIES[name][key] 
          });
        }
      }
    },

    readConfig: function (path) {
      try {
        var values = properties.of(path);
        return values.objs;
      } catch (e) {
        console.log('Could not read config file', e);
        return {};
      }
    },

    serialize: function (objs) {
      var ret = [];
      for (var name in objs) {
        ret.push(name+'='+objs[name]);
      }
      return ret.join(os.EOL);
    },

    onchange: function (key, newValue) {
      this.config[key] = newValue;
    },

    onsave: function (key) {
      this.userConfig[key] = this.config[key];
      for (var name in this.userConfig) {
        if (this.userConfig[name] == this.defaultConfig[name]) {
          delete this.userConfig[name];
        }
      }
      fs.writeFile(this.userConfigPath, this.serialize(this.userConfig), 
        function (err) {
          if (err) {
            plugins.get('alerts').danger({title: 'Save failed', message: 'Failure, setting not saved'});
          }
          else {
            plugins.get('alerts').success({title: 'Save sucess', message: 'Setting saved'});
          }
        }
      );
    },

    /* Given a span/btn (the restore btn) try and find the sibling <input>
      <input>
      <span class="input-group-btn">
        <span class="btn btn-success">
     */
    onrestore: function (key, element) {
      var input = element.parent().parent().find('input');
      input.val( this.config[key] = this.userConfig[key] = this.defaultConfig[key] );
      for (var name in this.userConfig) {
        if (this.userConfig[name] == this.defaultConfig[name]) {
          delete this.userConfig[name];
        }
      }
      fs.writeFile(this.userConfigPath, this.serialize(this.userConfig), 
        function (err) {
          if (err) {
            plugins.get('alerts').danger({title: 'Restore failed', message: 'Failure, setting not restored'});
          }
          else {
            plugins.get('alerts').success({title: 'Restore sucess', message: 'Setting restored'});
          }
        }
      );
    }
  };
  return ServerConfigProvider;
});
})();