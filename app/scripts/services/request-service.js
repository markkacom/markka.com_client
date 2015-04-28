(function () {
'use strict';

/**
 * The requests service uses the abstract term podium for a place of
 * related requests. The requests are actors that can perform on one 
 * podium at the time. An Actor can perform on a podium, performing 
 * means downloading a resource.
 *
 * Mofowallet is a special kind of theater, in mofowallet the audience
 * can look at several podiums at the same time. Podiums can also be 
 * created and destroyed.
 *
 * Since the audience can only look at some podiums at the same time only 
 * the visible podiums are the ones where it makes sense the actors 
 * are performing. Having actors perform on one of the hidden podiums
 * and not on the current visible podiums will lead to the audience 
 * missing an actor on the podiums that they are watching.
 *
 * Each time another podium is shown (a switch to another set) the 
 * curtains are briefly closed and opened again when the new podium is
 * in place. The closing of the curtains is the signal that the actors
 * must stop performing, upon opening the curtains the actors must start
 * performing in the order they apear in the script.
 *
 * The closing of the curtains in mofowallet terms can be the destruction
 * of a view. Before another view (a podium) is shown (open the curtains)
 * the previous view is destroyed (closing it's curtains). This can be
 * accomplished by listening for the $scope.$on('$destroy') event.
 * 
 * The opening of the curtains in mofowallet terms can be the creation
 * of a new view, to capture this in code terms this is simply the body
 * of code in the view thats run upon view creation. 
 *
 * ---------------------------------------------------------------------
 *
 * Like a heartbeat the pulse function keeps beating in the background, 
 * on each pulse of the requests service a check is performed if any
 * of the Actors have timed out, if that is the case those Actors are
 * destroyed.
 *
 * The same pulse function will check if there is room for more Actors
 * to start performing. If there is room Actor.perform is called on the
 * the next Actor (next is based on priority).
 *
 * ---------------------------------------------------------------------
 **/

var module = angular.module('fim.base');
module.factory('requests', function ($timeout, $q, $http) {
  var PULSE_MS         = 500;
  var BLACKLIST_PERIOD = 60 * 1000;
  var DEFAULT_TIMEOUT  = 180 * 1000;
  var DEFAULT_RETRY    = 10;
  var DEFAULT_GIVEUP   = 360 * 1000;
  var DEFAULT_PRIORITY = 0;


  // /* Calls perform on all Actors in the iterator */
  // function start_actors(iterator) {
  //   if (iterator.hasMore()) {
  //     var actor = iterator.next();
  //     if (actor.state !== actor.DESTROYED) {
  //       if (actor.options.node) {
  //         actor.perform(actor.options.node);
  //         start_actors(iterator);
  //       }
  //       else {
  //         actor.provider.getNode2().then(
  //           function (node) {
  //             if (node) {
  //               actor.perform(node);
  //             }
  //             start_actors(iterator);
  //           },
  //           function () {
  //             console.log('ERROR in pulse - getNode');
  //             start_actors(iterator);
  //           }
  //         );
  //       }
  //     }
  //   }
  //   else {
  //     $timeout(pulse, PULSE_MS, false);
  //   }
  // };

  // /* Repeatedly called */
  // function pulse() {
  //   var now = Date.now(), 
  //       pending = [], 
  //       active = 0;

  //   /* Destroy timedout and expired Actors */
  //   for (var name in SERVICE.theater.podiums) {
  //     var podium = SERVICE.theater.podiums[name];
  //     for (var j=0; j<podium.actors.length; j++) {
  //       var actor = podium.actors[j];

  //       /* Destroy stale Actors */
  //       if (actor.state !== actor.DESTROYED) {
  //         if (actor.started && ((now - actor.started) > actor.options.timeout)) {
  //           console.log('DESTROY Actor TIMEOUT', actor);
  //           if (actor.retry(actor.options.node_out)) {
  //             active++;
  //           }
  //         }
  //         else if ((now - actor.created) > actor.options.giveup) {
  //           console.log('DESTROY Actor GIVEUP', actor);
  //           actor.destroy('giveup');
  //         }
  //         else if (actor.state === actor.ACTIVE) {
  //           active++;
  //         }
  //         else if (actor.state === actor.PENDING) {
  //           pending.push(actor);
  //         }
  //       }
  //     }
  //   }

  //   /* Unblacklist blacklisted nodes */
  //   for (var i=0; i<SERVICE.providers.length; i++) {
  //     var nodes = SERVICE.providers[i].getAllNodes();
  //     for (var j=0; j<nodes.length; j++) {
  //       var node = nodes[j];
  //       if ((now - (node.failed_timestamp||0)) > BLACKLIST_PERIOD) {
  //         node.blacklisted = false;
  //       }
  //     }
  //   }

  //   /* Let other Actors perform if there is room on the podia */
  //   if (active < SERVICE.concurrent) {
  //     pending.sort(function compare(a, b) {
  //       if (a.options.priority > b.options.priority) { return -1; }
  //       if (a.options.priority < b.options.priority) { return 1; }
  //       return 0;
  //     });

  //     // if (pending.length > 0) {
  //     //   console.log('--------------------------------------------');
  //     //   console.log('-- Availabe Actors', pending);
  //     //   console.log('--');
  //     //   pending.forEach(function (actor, index) {
  //     //     console.log(index + ' ' + actor.builder.methodName + ' ' + actor.options.priority, actor.options.trace);
  //     //   });
        
  //     //   // console.log(printStackTrace().join('\n'));
  //     //   console.log('--------------------------------------------');      
  //     // }

  //     start_actors(new Iterator(pending));
  //   }
  //   else {
  //     console.log('NO ROOM for Actor active='+active+' max='+SERVICE.concurrent);
  //     $timeout(pulse, PULSE_MS, false);
  //   }
  // }
  // $timeout(pulse, PULSE_MS, false);

  /* The 'requests' service constructor */
  function Requests() {
    this.theater    = new Theater();
    this.concurrent = 6;
    this.providers  = [];
    this.mainStage  = this.theater.createPodium('mainstage', null);
  }
  Requests.prototype = {

    /* Creates an AbstractRequestBuilder for NXT family coins */
    createRequestBuilder: function (methodName, methodConfig, args) {
      return new AbstractRequestBuilder(methodName, methodConfig, args);
    },

    /* Has to implement NodeProvider interface (this is the AbstractEngine for NXT family coins) */
    registerNodeProvider: function (provider) {
      if (this.providers.indexOf(provider) == -1) {
        this.providers.push(provider);
      }
    }
  };

  function Theater() {
    this.podiums = {};
  }
  Theater.prototype = {

    /**
     * Creates a new Podium where Actors can perform on.
     *
     * @param name String Unique descriptive name (shown in debug logs)
     * @param $scope Object Optional $scope object     
     */
    createPodium: function (name, $scope) {
      /* If a podium still exists - kill it */
      if (name in this.podiums) {
        this.podiums[name].destroy();
        delete this.podiums[name];
      }
      var podium = new Podium(name, this);
      if ($scope) {
        var self = this;
        $scope.$on('$destroy', function () {
          console.log("PODIUM $scope.$on('$destroy')");
          podium.destroy();
          podium = null;
          delete self.podiums[name];
        });
      }
      return this.podiums[name] = podium;
    },
    destroy: function () {
      for (var name in this.podiums) {
        this.podiums[name].destroy();
        delete this.podiums[name];
      }
    }
  };

  function Podium(name, theater) {
    this.name = name;
    this.theater = theater;
    this.actors = [];
  }
  Podium.prototype = {

    /* @see Actor */
    createActor: function (builder, provider, options) {
      /* Guard against destroyed Podiums */
      if (this.actors) {
        var actor    = new Actor(builder, provider, options, this),
            index    = this.actors.length, 
            priority = actor.options.priority;

        for (var i=0; i<this.actors.length; i++) {
          if (this.actors[i].options.priority > priority) {
            index = i;
            break;
          }
        }
        this.actors.splice(index, 0, actor);

        return actor;
      }
    },  
    destroy: function () {
      if (this.theater) {
        /* Destroy remove the Actor from the array */
        var cloned = this.actors.slice();
        for (var i=0; i<cloned.length; i++) {
          cloned[i].destroy('podium destroyed')
        }
        delete this.theater.podiums[this.name];
        this.theater = null;
        this.actors = null;
      }
    },
    removeActor: function (actor) {
      var index = this.actors.indexOf(actor);
      this.actors.splice(index, 1);
    }
  };

  /**
   * An Actor is a delayed AJAX request. 
   *
   * When it's time for the actor to perform on the podium you'll call it's 
   * perform method which will kick off the actual HTTP request.
   *
   * It is possible to stop an Actor performing while he is playing, for this
   * we call Actor.destroy(). Destroying an Actor that is not playing or did 
   * not start will have no effect.
   *
   * @param builder AbstractRequestBuilder
   * @param options {
   *    timeout:      Number,   // default 5000  - Timeout in miliseconds
   *    retry_count:  Number,   // default 10    - How many times to retry
   *    giveup:       Number,   // default 30000 - When to consider request to old to even start
   *    node:         Node,     // Force to use this Node
   *    node_out:     Node,     // Returns the actual node used
   *    priority:     Number,   // 2 is higher then 1 is higher then 0
   * }
   * @param podium Podium
   */
  function Actor(builder, provider, options, podium) {
    this.builder    = builder;
    this.provider   = provider;
    this.options    = options;
    this.podium     = podium;
    this.state      = this.PENDING;
    this.created    = Date.now();
    this.retries    = 0;
    this.failed     = []; // list of Node that had an error

    this.options.timeout     = this.options.timeout || DEFAULT_TIMEOUT;
    this.options.retry_count = this.options.retry_count || DEFAULT_RETRY;
    this.options.giveup      = this.options.giveup || DEFAULT_GIVEUP;
    this.options.priority    = this.options.priority || DEFAULT_PRIORITY;

    this.observers  = [];
  }
  Actor.prototype = {
    PENDING:   0,
    ACTIVE:    1,
    DESTROYED: 2,

    /**
     * Adds an observer thats called for the various events in the lifecycle 
     * of an Actor.
     *
     * 1. start    
     *    Called right before the HTTP request is started for the first time
     *
     * 2. retry
     *    Same as start but called instead if the request is a retry
     *
     * 3. success
     *    HTTP request success
     *
     * 4. failed
     *    HTTP request failed
     *
     * 5. destroy
     *    Actor is destroyed expect nothing after this
     *
     * @param observer Object { 
     *    start:    fn(node),
     *    retry:    fn(node, tries_left),
     *    success:  fn(node, data, tries_left), 
     *    failed:   fn(node, data, tries_left),
     *    destroy:  fn(reason)
     * }
     */
    addObserver: function (observer) {
      this.observers.push(observer);
    },

    notify: function (method, args) {
      for (var i=0; i<this.observers.length; i++) {
        this.observers[i][method].apply(this.observers[i], args);
      }
    },

    /**
     * Kicks off an Actor performance (downloads a resource)
     * @param node Node
     */
    perform: function (node) {
      if (this.state !== this.DESTROYED) {        
        this.notify(this.retries == 0 ? 'start' : 'retry', [node]);

        this.http_args         = this.builder.build(node);

        if (!this.http_args.timeout) {
          this.canceller = $q.defer();
          this.http_args.timeout = this.canceller.promise;
        }
        this.options.node_out  = node;

        var self     = this;
        this.state   = this.ACTIVE;
        this.started = Date.now();

        console.log('START ' + this.builder.methodName + ' ' + this.options.priority, this.options.caller);

        $http(this.http_args).success(
          function (data, status, headers, config) {
            if (self.state !== self.DESTROYED) { 
              self.canceller = null;
              
              // /* special case .. must retry broadcastTransaction on multiple nodes */
              // if (self.builder.methodName == 'broadcastTransaction') {
              //   if (data.error) {
              //     if (!self.options.node) {

              //       console.log('broadcastTransaction REQUEST', self.http_args);
              //       console.log('broadcastTransaction RESPONSE', data);

              //       self.retry(node);
              //       return;
              //     }
              //   }
              // }

              console.log('SUCCESS ' + self.builder.methodName + ' ' + self.options.priority, self.options.caller);
              self.duration = Date.now() - self.started;
              self.notify('success', [node, data, (self.options.retry_count - self.retries)-1]);
              self.destroy('done');
            }
          }
        ).error(
          function (data, status, headers, config) {
            console.log('FAILED ');

            self.canceller = null;

            /* Blacklist the node in case of an HTTP error */
            node.failed_timestamp = Date.now();
            node.blacklisted = true;

            if (self.state !== self.DESTROYED) { 
              /* We have failed and need to determine if we will retry.
                 1. If we are on a foced Node (sendMoney) we cannot try another node and must fail. 
                 2. If the number of retries surpases retry_count we must fail. 
                 3. If we cannot obtain another Node we must fail */
              if (self.options.node) {
                self.duration = Date.now() - self.started;
                self.notify('failed', [node, data, (self.options.retry_count - self.retries)-1]);
                self.destroy('forced node');
              }
              else  {
                self.retry(node);
              }
            }
          }
        );
      }
    },

    /* Retry the same request on another node
       @param failed_node Node the node that just failed */
    retry: function (failed_node) {
      
      function retry(self) {
        self.provider.getNode2({not: self.failed}).then(
          function (node) {
            if (!node) {
              self.duration = Date.now() - self.started;
              self.notify('failed', [node, '', (self.options.retry_count - self.retries)-1]);
              self.destroy('no more nodes');
            }
            else {
              self.retries += 1;
              self.perform(node);
            }
          },
          function () {
            self.destroy('error could not get node');
          }
        );
      }

      var self = this;
      if (this.retries < this.options.retry_count) {
        this.failed.push(failed_node);

        /* It could be the request is still pending since we have timed-out */
        if (this.canceller) {
          this.canceller.promise.then(
            function () {
              self.canceller = null;
              retry(self);
            },
            function () {
              self.canceller = null;
              retry(self);
            }
          )
          this.canceller.resolve();
        }
        else {
          retry(this);
        }
        return true;
      }
      else {
        this.duration = Date.now() - this.started;
        this.notify('failed', [failed_node, '', (this.options.retry_count - this.retries)-1]);
        this.destroy('no retries');
        return false;        
      }
    },

    destroy: function (reason) {
      if (this.state !== this.DESTROYED) {
        this.state = this.DESTROYED;
        if (this.podium) {
          this.podium.removeActor(this);
        }

        if (this.canceller) {
          var self = this;
          this.canceller.promise.then(
            function () {
              console.log("ACTOR DESTROY - SUCCESS");
              self.canceller = null;
              self.notify('destroy', [reason]);
              delete self.observers;
            },
            function () {
              console.log('ACTOR DESTROY - FAILURE');
              self.canceller = null;
              self.notify('destroy', [reason]);
              delete self.observers;
            }
          )
          this.canceller.resolve();
        }
        else {
          this.notify('destroy', [reason]);
          delete this.observers;
        }
 
        /* release memory */
        delete this.options;
        delete this.podium;
        delete this.builder;
        delete this.failed;
      }
    }
  };

  /**
   * An AbstractRequestBuilder translates engine specific arguments into generic
   * AJAX lib arguments. There is an AbstractRequestBuilder implementation for coins
   * from the NXT family (like FIMK and NXT) and there will be an AbstractRequestBuilder
   * for coins belonging to the Bitcoin family.
   *
   * AbstractRequestBuilder receives it's arguments through it's Constructor and has a 
   * single method to translate those arguments into
   */
  function AbstractRequestBuilder(methodName, methodConfig, args) {
    this.methodName   = methodName;
    this.methodConfig = methodConfig;
    this.args         = args;
  }
  AbstractRequestBuilder.prototype = {

    /**
     * Given a Node and knowing method, config and args construct an arg Object
     * that can be passed to the $http service.
     *
     * @param node Node
     * @returns Object
     */
    build: function (node) {
      if (this.methodConfig.args.secretPhrase || this.methodConfig.requirePost) {
        var qs = "";
        if (Array.isArray(this.args)) {
          angular.forEach(this.args, function (tuple) {
            for (var name in tuple) {
              qs += (qs==''?'':'&') + name + '=' + encodeURIComponent(tuple[name]);
            }    
          });
        }
        else {
          for (var name in this.args) {
            qs += (qs==''?'':'&') + name + '=' + encodeURIComponent(this.args[name]);
          }
        }
        return {
          method: 'POST',
          url: this.create_url(node, this.methodName),
          data: qs,
          headers: {'Content-Type': 'application/x-www-form-urlencoded'}
        };
      }
      else {
        var url = this.create_url(node, this.methodName);
        if (Array.isArray(this.args)) {
          angular.forEach(this.args, function (tuple) {
            for (var name in tuple) {
              url += (qs==''?'':'&') + name + '=' + encodeURIComponent(tuple[name]);
            }    
          });
        }
        else {
          for (var name in this.args) {
            url += (qs==''?'':'&') + name + '=' + encodeURIComponent(this.args[name]);
          }    
        }
        return { 
          method: 'GET', 
          dataType: 'json',
          url: url
        }
      }
    },
    create_url: function (node, requestType) {
      return [node.url,':',node.port,'/nxt?requestType=',requestType,'&random=',Math.floor(Math.random() * 99999) + 1].join('');
    }
  };

  var SERVICE = new Requests();
  return SERVICE;
});
})();