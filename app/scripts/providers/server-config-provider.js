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

var PROPERTIES = {

  "PEER NETWORKING": {
    "fimk.shareMyAddress": "Announce my IP address/hostname to peers and allow them to share it with other peers. If disabled, peer networking servlet will not be started at all.",
    "fimk.peerServerPort": "Port for incoming peer to peer networking requests, if enabled.",
    "fimk.peerServerHost": "Host interface on which to listen for peer networking requests, default all. Use 0.0.0.0 to listen on all IPv4 interfaces or :: to listen on all IPv4 and IPv6 interfaces",
    "fimk.myAddress": "My externally visible IP address or host name, to be announced to peers. It can optionally include a port number, which will also be announced to peers, and may be different from fimk.peerServerPort (useful if you do port forwarding behind a router).",
    "fimk.myPlatform": "My platform, to be announced to peers.",
    "fimk.myHallmark": "My hallmark, if available.",
    "fimk.wellKnownPeers": "A list of well known peer addresses / host names, separated by '; '.",
    "fimk.knownBlacklistedPeers": "Known bad peers to be blacklisted",
    "fimk.knownWhitelistedPeers": "Known peers to be whitelisted (FIMKrypto only)",
    "fimk.testnetPeers": "Peers used for testnet only.",
    "fimk.maxNumberOfConnectedPublicPeers": "Maintain active connections with at least that many peers.",
    "fimk.connectTimeout": "Peer networking connect timeout for outgoing connections.",
    "fimk.readTimeout": "Peer networking read timeout for outgoing connections.",
    "fimk.peerServerIdleTimeout": "Peer networking server idle timeout, milliseconds.",
    "fimk.enableHallmarkProtection": "Use the peer hallmark to only connect with peers above the defined push/pull hallmark thresholds. Disabling hallmark protection also disables weighting of peers by hallmark weight, so connecting to any of your peers becomes equally likely.",
    "fimk.pushThreshold": "Hallmark threshold to use when sending data to peers.",
    "fimk.pullThreshold": "Hallmark threshold to use when requesting data from peers.",
    "fimk.blacklistingPeriod": "Blacklist peers for 600000 milliseconds (i.e. 10 minutes by default).",
    "fimk.sendToPeersLimit": "Consider a new transaction or block sent after 10 peers have received it.",
    "fimk.enablePeerServerDoSFilter": "Enable the Jetty Denial of Service Filter for the peer networking server.",
    "fimk.enablePeerServerGZIPFilter": "Compress Http responses for the peer networking server.",
    "fimk.isTestnet": "Use testnet, leave set to false unless you are really testing. Never unlock your real accounts on testnet! Use separate accounts for testing only. When using testnet, all custom port settings will be ignored, and hardcoded ports of 6884 (peer networking), 6885 (UI) and 6886 (API) will be used.",
    "fimk.savePeers": "Save known peers in the database",
    "fimk.usePeersDb": "Set to false to disable use of the peers database. This will not delete saved peers.",
    "fimk.getMorePeers": "Set to false to disable getting more peers from the currently connected peers. Only useful when debugging and want to limit the peers to those in peersDb or wellKnownPeers.",
    "fimk.isOffline": "Set to true to run offline - do not connect to peers and do not listen for incoming peer connections. This is equivalent to setting fimk.shareMyAddress=false, fimk.wellKnownPeers=, fimk.testnetPeers= and fimk.usePeersDb=false, and if set to true overrides those properties.",
    "fimk.enableTransactionRebroadcasting": "Enable re-broadcasting of new transactions until they are received back from at least one peer, or found in the blockchain. This feature can optionally be disabled, to avoid the risk of revealing that this node is the submitter of such re-broadcasted new transactions.",
    "fimk.numberOfForkConfirmations": "Verify batches of blocks downloaded from a single peer with that many other peers.",
    "fimk.testnetNumberOfForkConfirmations": "Verify batches of blocks downloaded from a single peer with that many other peers."
  },

  "API SERVER": {
    "fimk.enableAPIServer": "Accept http/json API requests.",
    "fimk.allowedBotHosts": "Hosts from which to allow http/json API requests, if enabled. Set to * to allow all. Can also specify networks in CIDR notation, e.g. 192.168.1.0/24.",
    "fimk.apiServerPort": "Port for http/json API requests.",
    "fimk.apiServerHost": "Host interface on which to listen for http/json API request, default localhost only. Set to 0.0.0.0 to allow the API server to accept requests from all network interfaces.",
    "fimk.apiServerIdleTimeout": "Idle timeout for http/json API request connections, milliseconds.",
    "fimk.apiResourceBase": "Directory with html and javascript files for the new client UI, and admin tools utilizing the http/json API.",
    "fimk.apiWelcomeFile": "Default page for the API server.",
    "fimk.javadocResourceBase": "Java API documentation directory, optional.",
    "fimk.apiServerCORS": "Enable Cross Origin Filter for the API server.",
    "fimk.apiSSL": "Enable SSL for the API server (also need to set fimk.keyStorePath and fimk.keyStorePassword).",
    "fimk.apiServerEnforcePOST": "Enforce requests that require POST to only be accepted when submitted as POST.",
    "fimk.enableAPIServerGZIPFilter": "Compress Http responses for the API server."
  },

  "WEBSOCKET SERVER": {
    "fimk.enableWebsockets": "Accept websocket/json API requests.",
    "fimk.websocketServerPort": "Port for websocket/json API requests.",
    "fimk.websocketServerHost": "Host interface on which to listen for websocket/json API request, default localhost only. Set to 0.0.0.0 to allow the API server to accept requests from all network interfaces.",
    "fimk.websocketSSL": "Enable SSL for the WEBSOCKET server (also need to set fimk.keyStorePath and fimk.keyStorePassword)."
  },

  "OLD NRS USER INTERFACE": {
    "fimk.enableUIServer": "Enable the deprecated NRS user interface.",
    "fimk.allowedUserHosts": "Hosts from which to allow NRS user interface requests, if enabled. Set to * to allow all.",
    "fimk.uiServerPort": "Port for NRS user interface server.",
    "fimk.uiServerHost": "Host interface for NRS user interface server, default localhost only. Set to 0.0.0.0 to allow the UI to be accessed on all network interfaces.",
    "fimk.uiServerIdleTimeout": "Idle timeout for NRS user interface server, milliseconds.",
    "fimk.uiResourceBase": "Directory with html and javascript files for the NRS client user interface.",
    "fimk.uiServerCORS": "Enable Cross Origin Filter for NRS user interface server.",
    "fimk.uiSSL": "Enable SSL for the NRS user interface (also need to set fimk.keyStorePath and fimk.keyStorePassword).",
    "fimk.uiServerEnforcePOST": "Enforce requests that require POST to only be accepted when submitted as POST.",
  },

  "DEBUGGING": {
    "fimk.enableLogTraceback": "Include caller traceback in log messages.",
    "fimk.enableStackTraces": "Enable logging of exception stack traces.",
    "fimk.communicationLoggingMask": "Used for debugging peer to peer communications. 1=exceptions, 2=non 200 response, 4=200 response",
    "fimk.debugTraceAccounts": "Track balances of the following accounts and related events for debugging purposes.",
    "fimk.debugTraceLog": "File name for logging tracked account balances.",
    "fimk.debugTraceSeparator": "Separator character for trace log.",
    "fimk.debugTraceQuote": "Quote character for trace log.",
    "fimk.debugLogUnconfirmed": "Log changes to unconfirmed balances.",
  },

  "DATABASE": {
    "fimk.dbUrl": "Database connection JDBC url, see the H2 documentation for possible customizations. Append ;AUTO_SERVER=TRUE to enable automatic mixed mode access. The nxt_db folder is expected to be in the current working directory, will be created if missing.",
    "fimk.testDbUrl": "Database connection JDBC url to use with the test network, if isTestnet=true",
    "fimk.dbLoginTimeout": "Database connection timeout in seconds.",
    "fimk.dbDefaultLockTimeout": "Database default lock timeout in seconds.",
    "fimk.maxDbConnections": "Maximum simultaneous database connections.",
    "fimk.dbCacheKB": "The memory allocated to database cache, in kB. If set to 0, the cache size varies from a minimum of 16MB for heap sizes 160MB or less, to a maximum of 256MB for heap sizes 640MB or higher.",
    "fimk.trimDerivedTables": "Enable trimming of derived objects tables.",
    "fimk.maxRollback": "If trimming enabled, maintain enough previous height records to allow rollback of at least that many blocks. Must be at least 1440 to allow normal fork resolution. After increasing this value, a full re-scan needs to be done in order for previously trimmed records to be re-created and preserved."
  },

  "MINT": {
    "fimk.mint.serverAddress": "Address of the NXT server to which the mint worker submits its transactions (default: localhost)",
    "fimk.mint.currencyCode": "Specify a mintable currency code",
    "fimk.mint.secretPhrase": "Secret phrase for the minting account, this secret phrase is sent to the host specified by fimk.mint.serverAddress therefore do not specify secret phrase of an account with lots of funds",
    "fimk.mint.unitsPerMint": "Number of units to mint per transaction The minting difficulty grows linearly with the number of units per mint",
    "fimk.mint.initialNonce": "The initial nonce used for minting. Set to 0 to start with a random nonce",
    "fimk.mint.threadPoolSize": "Number of concurrency threads used for minting. Set to 0 allocate one thread per processor core",
    "fimk.mint.isSubmitted": "When set to false mint transactions are not submitted when a hash is solved. Set this value to true to perform actual minting"
  },

  "FIM Specific": {
    "fimk.allowedToForge": "For public nodes, only allow these accounts to forge. Values can be a ; delimited list of accounts, an empty value (for no forging allowed) or a * to allow all accounts to forge. "
  },

  "JETTY": {
    "fimk.peerServerDoSFilter.maxRequestsPerSec": "Settings for the Jetty Denial Of Service Filter, used for the peer networking server only.",
    "fimk.peerServerDoSFilter.delayMs": "Settings for the Jetty Denial Of Service Filter, used for the peer networking server only.",
    "fimk.peerServerDoSFilter.maxRequestMs": "Settings for the Jetty Denial Of Service Filter, used for the peer networking server only.",
    "fimk.keyStorePath": "keystore file, required if uiSSL or apiSSL are enabled.",
    "fimk.keyStorePassword": "password, required if uiSSL or apiSSL are enabled."
  },

  "Developers only": {
    "fimk.forceValidate": "Force re-validation of blocks and transaction at start.",
    "fimk.forceScan": "Force re-build of derived objects tables at start.",
    "fimk.dumpPeersVersion": "Print a list of peers having this version on exit.",
    "fimk.enableDebugAPI": "Enable API requests used for blockchain and database manipulation.",
    "fimk.timeMultiplier": "Scale epoch time for faster forging. Only works when offline."
  }
};

var TEST_DEFAULT = {
  "fimk.shareMyAddress": 1,
  "fimk.peerServerPort": 2,
  "fimk.peerServerHost": 3,
  "fimk.myAddress": 4,
  "fimk.myPlatform": 5,
  "fimk.myHallmark": 6,
};

var TEST_USER = {
  "fimk.shareMyAddress": 3,
  "fimk.peerServerPort": 4,
  "fimk.peerServerHost": 5,
  "fimk.myAddress": 7,
  "fimk.myPlatform": 9,
  "fimk.myHallmark": 10,
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
    this.defaultConfigPath = serverService.getConfigFilePath(api.engine.type, 'fimk-default.properties', false);
    this.userConfigPath    = serverService.getConfigFilePath(api.engine.type, 'fimk.properties.bak', true);
    this.effectiveUserConfigPath    = serverService.getConfigFilePath(api.engine.type, 'fimk.properties', false);
    this.defaultConfig     = {};
    this.userConfig        = {};
    this.config            = {};
    this.rows              = [];
  }
  ServerConfigProvider.prototype = {
    load: function () {
      this.defaultConfig   = /*TEST_DEFAULT;*/ this.readConfig(this.defaultConfigPath);
      this.userConfig      = /*TEST_USER;*/ this.readConfig(this.effectiveUserConfigPath);
      this.config          = angular.copy(this.defaultConfig);
      angular.extend(this.defaultConfig, this.userConfig);

      for (var name in PROPERTIES) {
        this.rows.push({ type: 0, name: name });
        for (var key in PROPERTIES[name]) {
          this.rows.push({
            type: 1,
            name: key,
            value: this.userConfig[key] || this.config[key],
            description: PROPERTIES[name][key]
          });
        }
      }
    },

    readConfig: function (path) {
      try {
        var props = properties.of(path).objs;

        //backward compatibility (user may define properties started with "nxt.")
        //rename key prefixes "nxt." to "fimk."
        var keys = Object.keys(props);
        for (var i in keys) {
          var key = keys[i];
          if (key.startsWith("nxt.")) {
            var newKey = "fimk." + key.substr(4);
            props[newKey] = props[key];
            delete props[key];
          }
        }

        return props;
      } catch (e) {
        console.log('Could not read config file', e);
        return {};
      }
    },

    serialize: function (objs) {
      var result = []
      for (var name in objs) {
        if (objs[name]) result.push(name + '=' + objs[name])
      }
      return result.join(os.EOL)
    },

    onchange: function (key, newValue) {
      this.config[key] = newValue;
    },

    onsave: function (key) {
      this.userConfig[key] = this.config[key];
      fs.writeFileSync(this.effectiveUserConfigPath, this.serialize(this.userConfig),
        function (err) {
          if (err) {
            plugins.get('alerts').danger({title: 'Save failed', message: 'Failure, setting not saved'});
          }
          else {
            plugins.get('alerts').success({title: 'Save sucess', message: 'Setting saved'});
          }
        }
      );
      fs.copyFileSync(this.effectiveUserConfigPath, this.userConfigPath);
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
