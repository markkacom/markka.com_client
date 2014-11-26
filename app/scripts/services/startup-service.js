(function () {
var module = angular.module('fim.base');
module.factory('startupService', function (plugins, nxt, db, $timeout, $q, serverService, alerts, settings, modals) {

  function init() {
    SERVICE.registerActivity('scan-fork-nxt', new ScanFork(nxt.nxt()));
    SERVICE.registerActivity('scan-fork-fim', new ScanFork(nxt.fim()));

    // DEBUG
    //isNodeJS = true;

    if (isNodeJS) {
      SERVICE.registerActivity('start-server-nxt', new StartServer(nxt.nxt()), 'scan-fork-nxt');
      SERVICE.registerActivity('start-server-fim', new StartServer(nxt.fim()), 'scan-fork-fim');
    }

    SERVICE.registerActivity('load-accounts', new AccountLoader());
  }

  function removeActivity(array, clazz) {
    for (var i=0; i<array.length; i++) {
      if (array[i].clazz == clazz) {
        array.splice(i, 1);
        break;
      }
    }
  }

  /* This function is passed to ActivityInterface.start */
  function checkComplete(clazz) {
    if (!clazz.__complete && clazz.isDone()) {
      clazz.__complete = true;
      removeActivity(SERVICE.activities, clazz);
      if (SERVICE.activities.length == 0) {
        SERVICE.notifyDone();
      }
      else {
        SERVICE.start();
      }
    }
  }

  function canStart(activity) {
    if (activity.runAfterId) {
      for (var i=0; i<SERVICE.activities.length; i++) {
        if (SERVICE.activities[i].id == activity.runAfterId) {
          return false;
        }
      }
    }
    return true;
  }

  var SERVICE = {

    activities: [],
    deferred: $q.defer(),
    failed: [],

    start: function () {
      angular.forEach(this.activities, function (activity) {
        if (!activity.__started && canStart(activity)) {
          activity.__started = true;
          activity.clazz.start(checkComplete);
        }
      });
    },

    notifyDone: function () {
      console.log('And we are done !!!!');
      this.deferred.resolve();
    },

    registerActivity: function (id, clazz, runAfterId) {
      this.activities.push({id: id, clazz: clazz, runAfterId: runAfterId});
    }
  };

  /* @implements ActivityInterface */
  function ScanFork(api) {
    this.api        = api;
    this.base       = 'Scanning '+api.engine.symbol+' for forks';
    this.base2      = 'Fine tune '+api.engine.symbol+' nodes';
    this.total      = 0;
    this.scanCount  = 0;
    this.index      = 0;
    this.nodes      = [];

    /* ActivityInterface */
    this.message  = this.base;
    this.progress = 0;
  }
  ScanFork.prototype = {

    /* ActivityInterface */
    isDone: function () {
      if (this.scanCount >= this.nodes.length) {
        this.markForkedNodes();
        return true;
      }
      return false;
    },

    /* ActivityInterface */
    start: function (onSomeWorkDone) {
      this.onSomeWorkDone = onSomeWorkDone;
      var self = this;
      db.nodes.where('port').equals(this.api.engine.port).toArray().then(
        function (nodes) {
          $timeout(function () {
            self.total = nodes.length;  
          });          
          var iterator = new Iterator(nodes);          
          self.processNextNode(iterator);
        }
      );
    },

    /* Builds up an array of nodes and resets the database onfork field */
    processNextNode: function (iterator) {
      var self = this;      
      if (iterator.hasMore()) {
        var node = iterator.next();
        this.nodes.push(node);
        node.update({onfork:false}).then(
          function () { self.processNextNode(iterator) },
          function () { self.processNextNode(iterator) }
        );
      }
      else {
        angular.forEach(this.nodes, function (node) {
          self.startScan(node);
        });
      }
    },

    startScan: function (node) {
      var self = this;

      function checkLast() {
        self.scanCount++;
        if (self.scanCount >= self.nodes.length) {
          $timeout(function () { 

            self.total     = self.nodes.length;
            self.index     = 0;
            self.progress  = 0;
            self.message   = self.base2;
            self.syncNodes(self.nodes);

          }, 500);
        }
      }

      this.api.getState({},{node: node, priority: 5}).then(
        function success(data) {
          node.update({scan_height: data.numberOfBlocks, lastBlock: data.lastBlock, version: data.version}).then(
            function () { 
              self.index++;
              $timeout(function () {
                self.progress = (self.index * 100) / self.total;
                self.message  = self.base + ' ' + node.url;
              });
              checkLast();
            },
            checkLast
          );
        },
        function error(data) {
          self.index++;
          $timeout(function () {
            self.progress = (self.index * 100) / self.total;
            self.message  = self.base + ' possible fork ' + node.url;
          });
          checkLast();
        }
      );
    },

    syncNodes: function (nodes) {
      
      /* Find the lowest height but only if its less than 100 from the medium */
      function medium() {
        var m = nodes.map(function(v) {
          return v.scan_height;
        }).sort(function(a, b) {
          return a - b;
        });
        var middle = Math.floor((m.length - 1) / 2);
        if (m.length % 2) {
          return m[middle];
        } 
        else {
          return (m[middle] + m[middle + 1]) / 2.0;
        }
      }

      var self = this;
      var the_medium = medium();
      var the_lowest = Number.MAX_VALUE;
      angular.forEach(nodes, function (node) {
        if (node.scan_height > (the_medium-100) && node.scan_height < the_lowest) {
          the_lowest = node.scan_height;
        }
      });
      
      /* Find all the block ids for height: the_lowest */
      self.total = nodes.length;
      self.scanCount = 0;
      angular.forEach(nodes, function (node) {
        self.getBlockId(the_lowest, node);
      });
    },    

    getBlockId: function (height, node) {
      var self = this;
      this.api.getBlockId({height:height},{node: node, priority: 5}).then(
        function success(data) {
          node.update({scan_height: height, lastBlock: data.block}).then(
            function () { 
              self.index++;
              $timeout(function () {
                self.progress = (self.index * 100) / self.total;
                self.message  = self.base2 + ' ' + node.url;
              });
              self.scanCount++;
              self.onSomeWorkDone(self);
            },
            function () {
              self.scanCount++;
              self.onSomeWorkDone(self);
            }
          );
        },
        function error(data) {
          self.index++;
          $timeout(function () {
            self.progress = (self.index * 100) / self.total;
            self.message  = self.base2 + ' weak ' + node.url;
          });
          self.scanCount++;
          self.onSomeWorkDone(self);
        }
      );
    },

    /* Sets a marker on each node that is on a fork */
    markForkedNodes: function () {
    
      /* find the height that is on the most public nodes */
      var map = {};
      angular.forEach(this.nodes, function (node) {
        if (!map[node.scan_height]) {
          map[node.scan_height] = 1;
        }
        else {
          map[node.scan_height] += 1; 
        }
      });
      var majority_height = 0;
      var count = 0;
      angular.forEach(map, function (_count, height) {
        if (_count > count) {
          count = _count;
          majority_height = parseInt(height);
        }
      });

      var self = this;
      var iterator = new Iterator(this.nodes);
      db.transaction('rw', db.nodes, function () {
        self.markNode(iterator, majority_height);
      });
    },

    markNode: function (iterator, majority_height) {
      if (iterator.hasMore()) {
        var self = this;
        var node = iterator.next();
        if (typeof node.scan_height == 'number' && node.scan_height == majority_height) {
          node.update({ onfork: false }).then(
            function () { self.markNode(iterator, majority_height) },
            function () { self.markNode(iterator, majority_height) }
          );
        }
        else {
          node.update({ onfork: true }).then(
            function () { self.markNode(iterator, majority_height) },
            function () { self.markNode(iterator, majority_height) }
          );
        }
      }
    }    
  }

  /* @implements ActivityInterface */
  function DownloadAssets(api) {
    this.api      = api;

    /* ActivityInterface */
    this.progress = 100;
    this.message  = 'Downloading '+api.engine.symbol+' asset information';
  }
  DownloadAssets.prototype = {

    /* ActivityInterface */
    isDone: function () {
      return true;
    },

    /* ActivityInterface */
    start: function (onSomeWorkDone) {
      var self = this;
      this.api.assets.init().then(
        function () {
          onSomeWorkDone(self)
        },
        function () { 
          onSomeWorkDone(self)
        }
      );
    }
  }

  /* @implements ActivityInterface */
  function StartServer(api) {
    this.api      = api;
    this.base     = 'Starting '+api.engine.symbol+' server';

    /* ActivityInterface */
    this.progress = 100;
    this.message  = this.base;
  }
  StartServer.prototype = {

    /* ActivityInterface */
    isDone: function () {
      return true;
    },

    /* ActivityInterface */
    start: function (onSomeWorkDone) {

      var always_key = 'mofowallet.always.start.'+(this.api.type == 'TYPE_NXT'?'nxt':'fimk');
      var never_key = 'mofowallet.never.start.'+(this.api.type == 'TYPE_NXT'?'nxt':'fimk');      

      if (settings.get(never_key)) {
        console.log(never_key+' = true');
        onSomeWorkDone(this);
        return;
      }

      this.onSomeWorkDone = onSomeWorkDone;
      this.onmsg = this.createOnMsg();

      if (settings.get(always_key)) {
        console.log(always_key+' = true');
        serverService.addListener(this.api.type, 'stdout', this.onmsg);
        serverService.addListener(this.api.type, 'stderr', this.onmsg);
        serverService.addListener(this.api.type, 'start', this.onmsg);
        serverService.addListener(this.api.type, 'exit', this.onmsg);
        serverService.startServer(this.api.type);
        return;
      }

      var self = this;
      if (this.api.type == 'TYPE_NXT') {
        var modal_name = 'startNXTServerModal';
        var other_name = 'startNXTServerModal';
      }
      else {
        var other_name = 'startNXTServerModal';
        var modal_name = 'startNXTServerModal';
      }      
      
      function open() {
        modals.open(modal_name, {
          resolve: {
            items: function () {
              return {
                type: self.api.type,
                engine: self.api.engine.symbol.toUpperCase()
              };
            }
          }, 
          close: function (start_server) {
            if (start_server) {
              serverService.addListener(self.api.type, 'stdout', self.onmsg);
              serverService.addListener(self.api.type, 'stderr', self.onmsg);      
              serverService.addListener(self.api.type, 'start', self.onmsg);
              serverService.addListener(self.api.type, 'exit', self.onmsg);
              serverService.startServer(self.api.type);
            }
            else {
              onSomeWorkDone(self);
            }
          }
        });
      }

      if (modals.isOpen(other_name)) {
        /* Listen for the modal to close */
        modals.getInstance(other_name).result.then(function () {
          $timeout(open, 2000, false);
        });
      }
      else {
        open();
      }      
    },

    done: function () {
      serverService.removeListener(this.api.type, 'stdout', this.onmsg);
      serverService.removeListener(this.api.type, 'stderr', this.onmsg);
      serverService.removeListener(this.api.type, 'start', this.onmsg);
      serverService.removeListener(this.api.type, 'exit', this.onmsg);

      this.onmsg = null;

      this.onSomeWorkDone(this);
      this.onSomeWorkDone = null;
    },

    createOnMsg: function () {
      var self = this;
      return function (msg) {
        msg = msg.toString();

        /* Server started successfully */
        if (msg.indexOf(' started successfully.') != -1) {
          $timeout(function () {
            self.message = self.api.engine.symbol + ' server started successfully';
            $timeout(function () { 
              self.done(); 
            }, 1000, false);
          });
        }

        /* Database still in use */
        else if (msg.indexOf('org.h2.jdbc.JdbcSQLException')!=-1) {
          alerts.failed(self.api.engine.symbol+' Server Database Error');
          self.done();
        }

        /* Filter out INFO and FINE messages */
        else {
          $timeout(function () {
            self.message = self.api.engine.symbol + ' server ' + msg.replace(/^(.*(INFO|FINE):)/,'')
          });
        }
      }      
    }
  }

  /* ActivityInterface */
  function AccountLoader() {
    this.base     = 'Loading accounts ';

    /* ActivityInterface */
    this.progress = 100;
    this.message  = this.base;
  }
  AccountLoader.prototype = {

    /* ActivityInterface */
    isDone: function () {
      return true;
    },

    /* ActivityInterface */
    start: function (onSomeWorkDone) {
      var self = this;
      plugins.get('accounts').loadAccounts().then(
        function () {
          $timeout(function () {
            self.message  = 'Success loading accounts';
            $timeout(function () {
              onSomeWorkDone(self);
            }, 2000);              
          }, 2000);
        },
        function () {
          $timeout(function () {          
            self.message  = 'Failed loading accounts';
            $timeout(function () {
              onSomeWorkDone(self);
            }, 2000);              
          }, 2000);
        }
      )
    }
  }

  init();
  return SERVICE;
});

})();