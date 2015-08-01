(function () {
'use strict';

function getOS() {
  if (navigator.appVersion.indexOf("Win")!=-1) return 'WIN';
  if (navigator.appVersion.indexOf("Mac")!=-1) return 'MAC';
  if (navigator.appVersion.indexOf("X11")!=-1) return 'LINUX';
  if (navigator.appVersion.indexOf("Linux")!=-1) return 'LINUX';
  throw new Error('Could not detect OS');
}

var engine = {
  TYPE_NXT: {
    commands: {
      WIN: {
        start: {
          command: 'java',
          args: ['-cp', 'nxt.jar;lib\\*;conf', 'nxt.Nxt']
        }
      },
      LINUX: {
        start: {
          command: 'java',
          args: ['-cp', 'nxt.jar:lib/*:conf', 'nxt.Nxt']
        }
      },
      MAC: {
        start: {
          command: 'java',
          args: ['-cp', 'nxt.jar:lib/*:conf', 'nxt.Nxt'],
          extra: '../../../../Resources/'
        }
      }
    },
    listeners: { stdout: [], stderr: [], exit: [], start: [], ready: [] },
    messages: [],
    server: null
  },
  TYPE_FIM: {
    commands: {
      WIN: {
        start: {
          command: 'java',
          args: ['-cp', 'fim.jar;lib\\*;conf', 'nxt.Nxt']
        }
      },
      LINUX: {
        start: {
          command: 'java',
          args: ['-cp', 'fim.jar:lib/*:conf', 'nxt.Nxt']
        }
      },
      MAC: {
        start: {
          command: 'java',
          args: ['-cp', 'fim.jar:lib/*:conf', 'nxt.Nxt'],
          extra: '../../../../Resources/'
        }
      }
    },
    listeners: { stdout: [], stderr: [], exit: [], start: [], ready: [] },
    messages: [],
    server: null
  }
};

var path;
if (isNodeJS) {
  path = require('path');

  // SIGTERM AND SIGINT will trigger the exit event.
  process.once("SIGTERM", function () {
    process.exit(0);
  });

  process.once("SIGINT", function () {
    process.exit(0);
  });

  // And the exit event shuts down the child.
  process.once("exit", function () {
    try {
      if (engine.TYPE_NXT.server) {
        engine.TYPE_NXT.server.shutdown();
      }
    } catch (e) { console.log('NodeJS exit - shutdown nxt', e) }
    try {
      if (engine.TYPE_FIM.server) {
        engine.TYPE_FIM.server.shutdown();
      }
    } catch (e) { console.log('NodeJS exit - shutdown fim', e) }
  });

  // This is a somewhat ugly approach, but it has the advantage of working
  // in conjunction with most of what third parties might choose to do with
  // uncaughtException listeners, while preserving whatever the exception is.
  process.once("uncaughtException", function (error) {
    // If this was the last of the listeners, then shut down the child and rethrow.
    // Our assumption here is that any other code listening for an uncaught
    // exception is going to do the sensible thing and call process.exit().
    if (process.listeners("uncaughtException").length === 0) {
      console.log('uncaughtException', error);
      child.shutdown();
      throw error;
    }
  });  
}

var module = angular.module('fim.base');
module.factory('serverService', function ($timeout) {

function notifyListeners(listeners, data) {
  for (var i=0; i<listeners.length; i++) {
    listeners[i].call(null, data);
  }
}

function maybeNotifyServerReady(id, line) {
  if (!engine[id].isReady && line.indexOf(' started successfully.') != -1) {
    notifyListeners(engine[id].listeners.ready, 'Server is ready');
    engine[id].isReady = true;
  }
}

var NON_WHITESPACE = /\S/;
var BUFFER_SIZE = 2000;

return {
  getDir: function (id) {
    /* Allow this to be called from web context without errors */
    try { 
      /* @dependency on nxt.js this must match the TYPE_FIM and TYPE_NXT constant values */
      var dir  = id == 'TYPE_NXT' ? 'nxt' : 'fim';
      var path = require('path');
      /* MAC OS support */
      var ret;
      if (engine[id].commands[getOS()].start.extra) {
        ret = path.join(path.dirname( process.execPath ), engine[id].commands[getOS()].start.extra, dir);
      }
      else {
        ret = path.join(path.dirname( process.execPath ), dir); 
      }
      console.log('serverService-getDir', ret);
      return ret;
    } catch(e) {
      console.log('server-service.js getCWD', e);
      return '';
    }
  },
  getConfFilePath: function (id, fileName) {
    if (isNodeJS) {
      var path = require('path');
      return path.join(this.getDir(id), 'conf', fileName);
    }
    return '';
  },  
  getStartCommand: function (id) {
    return engine[id].commands[getOS()].start;
  },
  isNodeJS: function () { return isNodeJS; },
  startServer: function (id) {
    if (this.isRunning(id)) {
      throw new Error('Server '+id+' already running');
    }
    var self      = this;
    var start_options = {  cwd: this.getDir(id) };

    engine[id].isReady = false;

    var os        = getOS();
    notifyListeners(engine[id].listeners.stdout, 'Detected Operating System '+os);
    notifyListeners(engine[id].listeners.stdout, 'Starting mofowallet in '+start_options.cwd);    

    var spawn     = require('child_process').spawn;
    var child     = engine[id].server = spawn(engine[id].commands[os].start.command, engine[id].commands[os].start.args, start_options);
 
    child.shutdown = function () {
      try {
        this.kill("SIGTERM");
      } 
      finally {
        engine[id].server  = null;
        engine[id].isReady = false;
      }
    }

    child.onstdout = function (data) {
      var lines = data.toString().split(/(\r?\n)/g);
      for (var i=0; i<lines.length; i++) {
        if (lines[i].match(NON_WHITESPACE)) {
          self.write(id, lines[i]);
          notifyListeners(engine[id].listeners.stdout, lines[i]);
          maybeNotifyServerReady(id, lines[i]);
        }
      }
    }

    child.onstderr = function (data) {
      var lines = data.toString().split(/(\r?\n)/g);
      for (var i=0; i<lines.length; i++) {
        if (lines[i].match(NON_WHITESPACE)) {
          self.write(id, lines[i]);
          notifyListeners(engine[id].listeners.stderr, lines[i]);
          maybeNotifyServerReady(id, lines[i]);
        }
      }
    }

    child.onexit = function (code, signal) {
      self.write(id, 'Exit event. code='+code);
      notifyListeners(engine[id].listeners.exit, code);

      // Helper function added to the child process to manage shutdown.
      console.log("Child process terminated with code: " + code);
      // process.exit(1);
      engine[id].isReady = false;
      engine[id].server  = null;
      $rootScope.$apply();
    }

    child.stdout.on('data', child.onstdout);
    child.stderr.on('data', child.onstderr);
    child.on('exit', child.onexit);

    notifyListeners(engine[id].listeners.start, 'Starting server');
  },
  stopServer: function (id) {
    if (engine[id].server) {
      engine[id].server.shutdown();
      engine[id].server  = null;
      engine[id].isReady = false;
    }
    $timeout(function () { notifyListeners(engine[id].listeners.exit, 'Stopping server'); }, 1000, false);
  },
  isRunning: function (id) {
    return !!(engine[id].server);
  },
  isReady: function (id) {
    return engine[id].isReady;
  },
  addListener: function (id, type, listener) {
    engine[id].listeners[type].push(listener);
  }, 
  removeListener: function (id, type, listener) {
    engine[id].listeners[type] = engine[id].listeners[type].filter(function (_listener) { return _listener != listener; });
  },
  getMessages: function (id) {
    return engine[id].messages;
  },
  write: function (id, msg) {
    engine[id].messages.push({ data: msg });
    while (engine[id].messages.length > BUFFER_SIZE) {
      engine[id].messages.shift();
    }
  }
};
});
})();