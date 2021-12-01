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

function getOS() {
  if (navigator.appVersion.indexOf("Win")!=-1) return 'WIN';
  if (navigator.appVersion.indexOf("Mac")!=-1) return 'MAC';
  if (navigator.appVersion.indexOf("X11")!=-1) return 'LINUX';
  if (navigator.appVersion.indexOf("Linux")!=-1) return 'LINUX';
  throw new Error('Could not detect OS');
}

function commandToRunJava(embeddedJREVariant, systemJREVariant) {
  //curried function, should be resolved on invoking
  return function(serverDir) {
    serverDir = serverDir | ".";
    var fs = require('fs');
    var path = require('path');
    var jreDir = path.join(serverDir, "jre");
    console.log("embedded jre '" + jreDir + "' exists: " + fs.existsSync(jreDir));
    return fs.existsSync(jreDir) ? embeddedJREVariant : systemJREVariant
  }
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
          command: commandToRunJava("jre/bin/java.exe", "java"),
          args: ['-cp', 'fim.jar;lib/*;conf', 'nxt.Nxt']
        }
      },
      LINUX: {
        start: {
          command: commandToRunJava("jre/bin/java", "java"),
          args: ['-cp', 'fim.jar:lib/*:conf', 'nxt.Nxt']
        }
      },
      MAC: {
        start: {
          command: commandToRunJava("jre/bin/java", "java"),
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
module.factory('serverService', function ($timeout, $rootScope) {

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
    var serverDir = this.getDir(id);
    var start_options = {  cwd: serverDir };

    engine[id].isReady = false;

    var os        = getOS();
    notifyListeners(engine[id].listeners.stdout, 'Detected Operating System '+os);
    notifyListeners(engine[id].listeners.stdout, 'Starting mofowallet in '+start_options.cwd);

    var spawn     = require('child_process').spawn;
    var child     = engine[id].server = spawn(engine[id].commands[os].start.command(serverDir), engine[id].commands[os].start.args, start_options);

    child.shutdown = function () {
      try {
        this.kill("SIGTERM");
      }
      finally {
        $rootScope.$evalAsync(function () {
          engine[id].server  = null;
          engine[id].isReady = false;
        });
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
      $rootScope.$evalAsync(function () {
        engine[id].isReady = false;
        engine[id].server  = null;
      });
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
