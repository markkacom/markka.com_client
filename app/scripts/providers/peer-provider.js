(function () {
'use strict';
var module = angular.module('fim.base');
module.factory('PeerProvider', function (nxt, requests, $timeout, $q, $rootScope) {

  var NON_CONNECTED = 0, CONNECTED = 1, DISCONNECTED = 2;

  function PeerProvider(api, $scope) {
    this.api        = api;
    this.$scope     = $scope;
    this.isLoading  = false;
    this.peers      = [];

    var socket      = this.socket();
    var update      = angular.bind(this, this.onUpdate);
    socket.subscribe("PEER_BLACKLIST", update, $scope);
    socket.subscribe("PEER_UNBLACKLIST", update, $scope);
    socket.subscribe("PEER_DEACTIVATE", update, $scope);
    socket.subscribe("PEER_REMOVE", angular.bind(this, this.onRemove), $scope);
    socket.subscribe("PEER_DOWNLOADED_VOLUME", update, $scope);
    socket.subscribe("PEER_UPLOADED_VOLUME", update, $scope);
    socket.subscribe("PEER_WEIGHT", update, $scope);
    socket.subscribe("PEER_ADDED_ACTIVE_PEER", update, $scope);
    socket.subscribe("PEER_CHANGED_ACTIVE_PEER", update, $scope);
    socket.subscribe("PEER_NEW_PEER", angular.bind(this, this.onNewPeer), $scope);

    var self = this, unregister = $rootScope.$on('$translateChangeSuccess', function () {
      $scope.$evalAsync(function () {
        angular.forEach(self.peers, function (peer) {
          self.format(peer);
        })
      });
    });
    $scope.$on('$destroy', unregister);    
  }
  PeerProvider.prototype = {
    socket: function () {
      return $rootScope.forceLocalHost ? this.api.engine.socket() : this.api.engine.localSocket();
    },

    reload: function () {
      var self = this;
      this.$scope.$evalAsync(function () {
        self.getNetworkData();
      });  
    },

    getNetworkData: function () {
      var self = this;
      var arg  = { requestType: "getPeers", includePeerInfo: true };
      this.socket().callAPIFunction(arg).then(
        function (data) {
          self.$scope.$evalAsync(function () {
            self.isLoading = false;
            self.peers = data.peers;
            angular.forEach(self.peers, function (p) {
              self.format(p);
            });
            self.sort();
          });
        },
        function (data) {
          self.$scope.$evalAsync(function () {
            self.isLoading = false;
          });
        }
      );
    },

    format: function (p) {
      switch (p.state) {
        case NON_CONNECTED:
          p.stateStr = 'Non connected';
          p.stateClass = '';
          break;
        case CONNECTED:
          p.stateStr = 'Connected';
          p.stateClass = 'success';
          break;
        case DISCONNECTED:
          p.stateStr = 'Disconnected';
          p.stateClass = 'danger';
          break
      }
      p.downloadedVolume = p.downloadedVolume || 0;;
      p.lastUpdatedStr = nxt.util.formatTimestamp(p.lastUpdated, true);
      //p.downloadedVolumeStr = formatVolume(p.downloadedVolume);
      p.downloadedVolumeBytes = nxt.util.commaFormat(""+p.downloadedVolume);
      //p.uploadedVolumeStr = formatVolume(p.uploadedVolume);
      p.uploadedVolumeBytes = nxt.util.commaFormat(""+p.uploadedVolume);
      p.weightStr = formatWeight(p.weight);
    },

    sort: function () {
      this.peers.sort(function (a,b) { 
        return b.downloadedVolume - a.downloadedVolume;
      });
    },

    onUpdate: function (peer) {
      peer.lastActivity = Date.now();
      for (var i=0; i<this.peers.length; i++) {
        if (this.peers[i].announcedAddress == peer.announcedAddress) {
          var self = this, existing = this.peers[i];
          this.$scope.$evalAsync(function () {
            angular.extend(existing, peer);
            self.format(existing);
            self.sort();
          });
          break;
        }
      }
    },

    onRemove: function (peer) {
      var self = this;
      this.$scope.$evalAsync(function () {
        self.peers = self.peers.filter(function (_peer) {
          return _peer.announcedAddress != peer.announcedAddress;
        });
      });
    },

    onNewPeer: function (peer) {
      var self = this;
      this.$scope.$evalAsync(function () {
        self.peers.push(peer);
        self.format(peer);
        self.sort();
      });
    }
  }

  function formatVolume(volume) {
    var sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    if (volume == 0) return '0 B';
    var i = parseInt(Math.floor(Math.log(volume) / Math.log(1024)));
    volume = Math.round(volume / Math.pow(1024, i), 2);
    var size = sizes[i];
    var digits = [], formattedVolume = "", i;
    do {
      digits[digits.length] = volume % 10;
      volume = Math.floor(volume / 10);
    } while (volume > 0);
    for (i = 0; i < digits.length; i++) {
      if (i > 0 && i % 3 == 0) {
        formattedVolume = "'" + formattedVolume;
      }
      formattedVolume = digits[i] + formattedVolume;
    }
    return formattedVolume + " " + size;
  }

  function formatWeight(weight) {
    var digits = [], formattedWeight = "", i;
    do {
      digits[digits.length] = weight % 10;
      weight = Math.floor(weight / 10);
    } while (weight > 0);
    for (i = 0; i < digits.length; i++) {
      if (i > 0 && i % 3 == 0) {
        formattedWeight = "'" + formattedWeight;
      }
      formattedWeight = digits[i] + formattedWeight;
    }
    return formattedWeight;
  }  
  return PeerProvider;
});
})();