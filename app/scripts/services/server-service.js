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
    serverDir = serverDir || ".";
    var fs = require('fs');
    var path = require('path');
    var jreDir = path.join(serverDir, "jre");
    //console.log("embedded jre '" + jreDir + "' exists: " + fs.existsSync(jreDir));
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

function getServerDir(id) {
    /* Allow this to be called from web context without errors */
    try {
      /* @dependency on nxt.js this must match the TYPE_FIM and TYPE_NXT constant values */
      var dir  = id == 'TYPE_NXT' ? 'nxt' : 'fim';
      var path = require('path');
      /* MAC OS support */
      var result;
      if (engine[id].commands[getOS()].start.extra) {
        result = path.join(path.dirname( process.execPath ), engine[id].commands[getOS()].start.extra, dir);
      } else {
        result = path.join(getUserDir(), dir);
      }
      return result;
    } catch(e) {
      console.log('server-service.js getCWD', e);
      return '';
    }
}

function getUserDir () {
    var remote = require("@electron/remote");
    if (!remote) return "";
    var path = require('path');
    var dir = path.join(remote.app.getPath("home"), ".fimk");
    var fs = require('fs');
    if (!fs.existsSync(dir)) {
      fs.mkdir(dir, function (err) {
        if (err) throw err;
      });
    }
    return dir;
}

function getConfigFilePath(id, fileName, useUserDir) {
  if (isNodeJS) {
    var path = require('path');
    if (!useUserDir) {
      return path.join(getServerDir(id), 'conf', fileName);
    }
    var userDir = getUserDir();
    return path.join(userDir, 'conf', fileName);
  }
  return '';
}

/**
 * Match version in server target dir and server files in the mofowallet app dir. Copy newer server to target dir.
 */
function checkServerFiles(appServerDir, targetServerDir) {
  if (appServerDir === targetServerDir) return

  var fs = require('fs')
  var path = require('path')

  // copy original (shipped with app) server files to target dir
  var readServerVersion = function(serverDir) {
    var configPath = path.join(serverDir, "/conf/fimk-default.properties")
    if (!fs.existsSync(configPath)) return null
    var data = fs.readFileSync(configPath, 'utf8');
    var text = data.toString()
    var versionLine = text.split(/\r?\n/).find(function(s) {return s.trim().startsWith("fimk.version")})
    return versionLine ? versionLine.trim().substring("fimk.version=".length) : ""
  }

  var origVersion = readServerVersion(appServerDir)
  var targetVersion = readServerVersion(targetServerDir)

  if (origVersion !== targetVersion) {
    // copy original (shipped with app) server files to target dir
    fs.cpSync(appServerDir, targetServerDir, { recursive: true })
  }
}


var NON_WHITESPACE = /\S/;
var BUFFER_SIZE = 2000;

//check and init server config file
/*
Effective server config file resides in the app dir that is overwritten on each installation.
The backup config that is not overwritten on installation resides in user homedir in the dir ".fimk/conf".
So user edits effective config then it is auto copied to backup config.
On first install the effective and backup configs is born from 'embedded-template.properties' is shipped with server.
*/

if (isNodeJS) {
  setTimeout(function () {
    var fs = require('fs')
    var path = require('path')
    var userDir = getUserDir()
    var configDir = path.join(userDir, 'conf')

    try {
      checkServerFiles(path.join(path.dirname(process.execPath), "fim"), getServerDir("TYPE_FIM"))

      if (!fs.existsSync(configDir)) {
        fs.mkdir(configDir, {recursive: true}, function (err) {
          if (err) throw err
        })
      }
      var configFile = path.join(configDir, "fimk.properties.bak")
      var effectiveConfigFile = path.join(getServerDir("TYPE_FIM"), 'conf', "fimk.properties")
      if (!fs.existsSync(configFile)) {
        if (fs.existsSync(effectiveConfigFile)) {
          fs.copyFileSync(effectiveConfigFile, configFile)
        } else {
          var virginConfigFile = path.join(getServerDir("TYPE_FIM"), 'conf', 'embedded-template.properties')
          var data = fs.readFileSync(virginConfigFile, 'utf8')
          var updatedData = data.replace("{DATA_DIR}", userDir.replaceAll("\\", "/"))
          fs.writeFileSync(configFile, updatedData, 'utf8')
        }
      }
      if (!fs.existsSync(effectiveConfigFile)) {
        fs.copyFileSync(configFile, effectiveConfigFile)
      }
    } catch (e) {
      console.error(e)
    }
  }, 200)
}


return {
  getUserDir: getUserDir,

  getDir: getServerDir,

  getConfigFilePath: getConfigFilePath,

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
