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
module.factory('MofoSocket', function ($q, $timeout, $interval, $rootScope) {

  function MofoSocket(engine, force_local, force_remote) {
    this.call_id      = 0;
    this.engine       = engine;
    this.callbacks    = {};
    this.timeout_ms   = 60 * 1000;
    this.debug        = false;
    this.debugEvents  = false;
    this.keepAlive    = true;
    this.alive_ms     = 120 * 1000;
    this.alive_cb     = null;
    this.topics       = {};
    this.pending_send = [];
    this.force_local  = force_local||false;
    this.force_remote = force_remote||false;
    this.observers    = [];

    this.createIsOpenPromise();
    this.refresh();
  }
  MofoSocket.prototype = {
    installMethods: [
      'callAPIFunction',
      'getAccountAssets',
      'getAccountCurrencies',
      'getActivity',
      'getRecentTransactions',
      'getComments',
      'getCommentCount',
      'getAccountPosts',
      'getAssetPosts',
      'getAccounts',
      'getAccount',
      'getAsset',
      'getForgingStats',
      'getActivityStatistics',
      'getAskOrder',
      'getBidOrder',
      'getAssetChartData',
      'getAssetOrders',
      'getAssetTrades',
      'getMyOpenOrders',
      'getBlockchainState',
      'getAccountLessors',
      'search',
      'getAssetPrivateAccounts'
    ],

    dump: function () {
      console.log('MofoSocket topics', this.topics);
    },

    createIsOpenPromise: function () {
      var self = this;
      if (this.is_open) {
        this.is_open.reject();
      }
      this.is_open = $q.defer();
      this.is_open.promise.then(
        function () {
          for (var i=0; i<self.pending_send.length; i++) {
            if (self.debug) { console.log('WEBSOCKET - in promise send', self.pending_send[i]) }
            self.socket.send(JSON.stringify(self.pending_send[i]));
          }
          self.pending_send.length = 0;
        }
      );
    },

    /**
     * Subscribe to a topic on the remote server
     **/
    subscribe: function (topic, callback, $scope) {
      if (this.debug) { console.log('subscribe', topic); }
      topic = topic.toUpperCase();
      if (!this.topics[topic]) {
        this.topics[topic] = [];
        this._send(['subscribe', topic]);
      }
      var duplicate = false;
      for (var i=0; i<this.topics[topic].length; i++) {
        if (this.topics[topic][i] === callback) {
          duplicate = true;
          break;
        }
      }
      if (!duplicate) {
        this.topics[topic].push(callback);
      }
      if ($scope) {
        $scope.$on('$destroy', this._createUnsubscribeHandler(this, topic, callback));
      }
    },

    /**
     * UnSubscribe from a topic on the remote server
     **/
    unsubscribe: function (topic, callback) {
      topic = topic.toUpperCase();
      if (this.topics[topic]) {
        this.topics[topic] = this.topics[topic].filter(function (cb) {
          return cb !== callback;
        });
        if (this.topics[topic].length == 0) {
          delete this.topics[topic];
          this._send(['unsubscribe', topic]);
        }
      }
    },

    /**
     * Call a method on the remote server.
     *
     * @param method String
     * @param argv Object
     * @returns Promise
     **/
    _rpc: function (method, argv) {
      if (this.debug) { console.log('WEBSOCKET - rpc method='+method, argv) }
      var deferred    = $q.defer();
      var call_id     = String(this.call_id++);
      var socket_args = ['call', call_id, method, argv||{}];

      this.callbacks[call_id] = {
        deferred: deferred,
        timeout:  $timeout(this._createTimeoutHandler(this, call_id), this.timeout_ms, false)
      };

      this._send(socket_args);
      return deferred.promise;
    },

    _createTimeoutHandler: function (self, call_id) {
      return function () {
        var deferred = self.callbacks[call_id].deferred;
        delete self.callbacks[call_id];
        deferred.reject({ "error": "timeout" });
      }
    },

    _createKeepAliveIntervalHandler: function (self) {
      return function () {
        self._send('ping');
      }
    },

    _createDelayedRefreshHandler: function (self) {
      return function () {
        self.refresh();
      }
    },

    _createUnsubscribeHandler: function (self, topic, callback) {
      return function () {
        self.unsubscribe(topic, callback);
      }
    },

    /* Obtain server version for local FIMK connection only */
    _maybeGetServerVersion: function () {
      if (this.engine.type == 'TYPE_FIM') {
        if (!this.server_version) {
          var _this = this;
          this.callAPIFunction({requestType:'getState'}).then(
            function (data) {
              $rootScope.$evalAsync(function () {
                _this.server_version = 'FIMK '+data.version;
                $rootScope.FIM_SERVER_VERSION = _this.server_version;
              });
            }
          );
        }
      }
    },

    /* called from nxt.AbstractEngine upon server ready */
    stopAndRefresh: function () {
      this.createIsOpenPromise();
      if (this.socket) {
        this.url = null;
        this.socket.close();
      }
      else {
        this.refresh();
      }
    },

    stop: function () {
      if (this.socket) {
        this.url = null;
        this.socket.close();
      }
    },

    refresh: function () {
      if (this.debug) {
        console.log('WEBSOCKET - refresh ' + this.engine.symbol);
        console.trace('WEBSOCKET - refresh ' + this.engine.symbol);
      }
      var self = this;

      function createSocket(url) {
        if (self.debug) { console.log('WEBSOCKET - refresh CREATE NEW SOCKET old='+self.url+' new='+url) }
        self.url              = url;
        self.socket           = new WebSocket(url);
        self.socket.onclose   = function (evt) { self.onclose(evt) };
        self.socket.onopen    = function (evt) { self.onopen(evt) };
        self.socket.onerror   = function (evt) { self.onmessage(evt) };
        self.socket.onmessage = function (evt) { self.onmessage(evt) };
      }

      function setSocketURL(url) {
        if (self.socket) {
          // connecting or open - kill and reconnect only on new url or if on localhost
          if (self.socket.readyState == 0 || self.socket.readyState == 1) {
            if (self.url != url || self.force_local) {
              self.createIsOpenPromise();

              self.socket.onclose = function () { createSocket(url) };
              if (self.debug) { console.log('WEBSOCKET - refresh CLOSING SOCKET') }
              self.socket.close();
              return;
            }
          }
          // closing
          else if (self.socket.readyState == 2) {
            self.socket.onclose = function () { createSocket(url) }
            return;
          }
          // closed
          else if (self.socket.readyState == 3) {
            createSocket(url);
            return;
          }
        }
        else {
          createSocket(url);
        }
      }

      /* force remote trumps force local */
      if (this.force_remote) {
        this.engine.getSocketNodeURL(true).then(setSocketURL);
      } else if (this.force_local) {
        var protocol = window.location.protocol == 'https:' ? 'wss:' : 'ws:';
        var url = protocol + '//' + (window.location.hostname||'localhost') + ':' + this.engine.port + '/ws/';
        setSocketURL(url);
      } else {
        this.engine.getSocketNodeURL().then(setSocketURL);
      }
    },

    _send: function (argv) {
      if (this.socket && this.socket.readyState == 1) {
        var message = JSON.stringify(argv);
        if (this.debug) { console.log('WEBSOCKET - _send ' + new Date(), message) }
        this.socket.send(message);
      }
      else {
        this.pending_send.push(argv);
      }
    },

    onopen: function (event) {
      this._notifyObservers('onopen', event);

      if (this.debug) { console.log('WEBSOCKET - onopen ' + new Date(), {socket: this.socket, event: event }) }

      this.is_open.resolve();
      this.is_connected = true;

      var topics = [];
      for (var topic in this.topics) {
        topics.push(topic);
      }
      if (topics.length > 0) {
        this._send(['subscribe', topics]);
      }
      if (this.keepAlive) {
        var self = this;
        this.alive_cb = $interval(this._createKeepAliveIntervalHandler(this), this.alive_ms, false);
      }

      this._maybeGetServerVersion();
    },

    onclose: function (event) {
      this.is_connected = false;
      this._notifyObservers('onclose', event);

      if (this.debug) { console.log('WEBSOCKET - onclose ' + new Date(), {socket: this.socket, event: event }) }
      if (this.alive_cb) {
        $interval.cancel(this.alive_cb);
        this.alive_cb = null;
      }

      /* if connected to a remote node auto reconnect,
         if connected to localhost only reconnect when server is running */
      if (this.force_local) {
        if (this.engine.serverIsRunning) {
          $timeout(this._createDelayedRefreshHandler(this), 2000, false);
        }
      } else {
        $timeout(this._createDelayedRefreshHandler(this), 2000, false);
      }
      this.socket = null;
    },

    onerror: function (event) {
      this._notifyObservers('onerror', event);

      console.log('WEBSOCKET - onerror REMOVE BAD URL ['+this.url+']'+new Date(), {event: event });

      this.engine.urlPool.badURL(this.url);
    },

    onmessage: function (event) {
      var message = event.data;
      if (this.debug) { console.log('WEBSOCKET - onmessage ' + new Date(), message) }
      if (message == "pong" || !message) { return }
      try {
        var data = JSON.parse(message);
      }
      catch (e) {
        if (this.debug) { console.log('WEBSOCKET - JSON parse error', {socket: this.socket, event: event }) }
        return;
      }
      if (!Array.isArray(data)) {
        throw new Error('WEBSOCKET - Expected an array', event);
      }

      var op = data[0];
      if (op == "response") {
        this.response(data[1], data[2]);
      }
      else if (op == "notify") {
        if (this.debugEvents) { console.log('EVENT', data[1], data[2]); }
        this.notify(data[1], data[2]);
      }
      else {
        throw new Error('WEBSOCKET - Unsupported operation', event);
      }
    },

    notify: function (topic, data) {
      var listeners = this.topics[topic];
      if (listeners) {
        for (var i=0; i<listeners.length; i++) {
          if (typeof listeners[i] == 'function') {
            listeners[i].call(null, data);
          }
          else {
            console.log('Listener '+i+' of '+topic+' is not a function');
          }
        }
      }
    },

    response: function (call_id, data) {
      if (this.callbacks[call_id]) {
        var deferred = this.callbacks[call_id].deferred;
        $timeout.cancel(this.callbacks[call_id].timeout);
        delete this.callbacks[call_id];
        deferred.resolve(data);
      }
    },

    _createObserverRemoveHandler: function (self, observer) {
      return function () {
        observer.__removeDestroyListener = null;
        self.removeObserver(observer);
      }
    },

    addObserver: function (observer, $scope) {
      for (var i=0; i<this.observers.length; i++) {
        if (this.observers[i] === observer) {
          return;
        }
      }
      this.observers.push(observer);
      if ($scope) {
        observer.__removeDestroyListener = $scope.$on('$destroy', this._createObserverRemoveHandler(this, observer));
      }
    },

    removeObserver: function (observer) {
      this.observers = this.observers.filter(function (_observer) {
        return _observer !== observer;
      });
      if (observer.__removeDestroyListener) {
        observer.__removeDestroyListener();
      }
    },

    _notifyObservers: function (type, event) {
      for (var i=0; i<this.observers.length; i++) {
        if (this.observers[i][type]) {
          this.observers[i][type](event);
        }
      }
    }
  };

  function installMethod(name, proto) {
    proto[name] = function (argv) {
      return this._rpc(name, argv);
    }
  }

  angular.forEach(MofoSocket.prototype.installMethods,
    function (name) {
      installMethod(name, MofoSocket.prototype);
    }
  );

  return MofoSocket;

});
})();