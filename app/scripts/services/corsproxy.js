(function () {
'use strict';

/* This is how long we wait befor re-trying if a server works without CORS proxy */
var MIN_WAIT_BEFORE_RETRY = 15 * 60 * 1000; // 15 hour
var module = angular.module('fim.base');  
module.factory('corsproxy', function() {

  var registry = [

    /* FIMKrypto hosted CORS proxy */
    { template: 'http://178.62.236.32/corsproxy.php?mode=native&url=__URL__', escape: true, remove_protocol: false },     

    /* This is pretty good, seems to be always up */
    { template: 'https://cors-anywhere.herokuapp.com/__URL__', escape: false, remove_protocol: false }, 
  ];

  /* @param proxy Object entry from settings table
     @param url String url as string
     @returns String */
  function proxify(proxy, url) {
    if (proxy.remove_protocol) { url = url.replace(/^(http:\/\/)/, ''); }
    if (proxy.escape) { url = encodeURIComponent(url); }
    return proxy.template.replace('__URL__', url);
  }

  /* Rotates through the list of available proxy servers */
  var cursor = 0;
  function getNextProxy() {
    if (cursor < registry.length) {
      return registry[cursor++];  
    }
    cursor = 0;
    return registry[cursor];  
  }

  function reportError(error) {
    console.log('ERROR in corsproxy', error);
  }

  return {

    /**
     * Proxifies a url 
     * @param url String
     * @returns String
     **/
    proxify: function (node, url) {
      var proxy = getNextProxy();
      node.update({ last_used_proxy: proxy.id });
      return proxify(proxy, url);
    },

    /**
     * Tells the caller if this node is supposed to use a cors proxy
     * @param node Object node model
     * @returns Boolean
     **/
    requiresProxy: function (node) {
      return !node.supports_cors;
    }
  }
});
})();