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
          args: ['-cp', 'classes;lib\\*;conf', 'nxt.Nxt']
        }
      },
      LINUX: {
        start: {
          command: 'java',
          args: ['-cp', 'classes:lib/*:conf', 'nxt.Nxt']
        }
      },
      MAC: {
        start: {
          command: 'java',
          args: ['-cp', 'classes:lib/*:conf', 'nxt.Nxt'],
          extra: '../../../../Resources/'
        }
      }
    },
    listeners: { stdout: [], stderr: [], exit: [], start: [] },
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
    listeners: { stdout: [], stderr: [], exit: [], start: [] },
    messages: [],
    server: null
  }
};

try {
  var isNodeJS = typeof require == 'function' && require('child_process');
} catch (e) {
  var isNodeJS = false;
}

if (isNodeJS) {
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
module.factory('serverService', function () {

function notifyListeners(listeners, data) {
  for (var i=0; i<listeners.length; i++) {
    listeners[i].call(null, data);
  }
}

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
  getStartCommand: function (id) {
    return engine[id].commands[getOS()].start;
  },
  isNodeJS: function () { return isNodeJS; },
  startServer: function (id) {
    var messages  = engine[id].messages;
    var listeners = engine[id].listeners;
    var self      = this;
    var path      = require('path')
    var start_options = {  cwd: this.getDir(id) };    
    var commands  = engine[id].commands;

    var os        = getOS();
    notifyListeners(listeners.stdout, 'Detected Operating System '+os);
    notifyListeners(listeners.stdout, 'Starting mofowallet in '+start_options.cwd);    

    var spawn     = require('child_process').spawn;
    var child     = engine[id].server = spawn(commands[os].start.command, commands[os].start.args, start_options);
 
    child.shutdown = function () {
      try {
        this.kill("SIGTERM");
      } 
      finally {
        engine[id].server = null;
      }
    }

    child.onstdout = function (data) {
      messages.push(data.toString());
      notifyListeners(listeners.stdout, data);
    }

    child.onstderr = function (data) {
      messages.push(data.toString());
      notifyListeners(listeners.stderr, data);
    }

    child.onexit = function (code, signal) {
      messages.push('Exit event. code='+code);
      notifyListeners(listeners.exit, code);

      // Helper function added to the child process to manage shutdown.
      console.log("Child process terminated with code: " + code);
      // process.exit(1);
    }

    child.stdout.on('data', child.onstdout);
    child.stderr.on('data', child.onstderr);
    child.on('exit', child.onexit);

    notifyListeners(listeners.start, 'Starting server');
  },
  stopServer: function (id) {
    if (engine[id].server) {
      engine[id].server.shutdown();
      engine[id].server = null;
    }
  },
  isRunning: function (id) {
    return !!(engine[id].server);
  },
  addListener: function (id, type, listener) {
    engine[id].listeners[type].push(listener);
  }, 
  removeListener: function (id, type, listener) {
    engine[id].listeners[type] = engine[id].listeners[type].filter(function (_listener) { return _listener != listener; });
  },
  getMessages: function (id) {
    return engine[id].messages;
  }
};
});
})();