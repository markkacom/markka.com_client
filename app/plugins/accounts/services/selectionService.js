(function () {
'use strict';

var module = angular.module('fim.base');
module.factory('selectionService', function () {

  var listeners = [];
  var listener_to_id = {};

  function notifyListeners(new_selection, old_selection) {
    angular.forEach(listeners, function (listener) {
      try {
        listener(new_selection, old_selection);
      } 
      catch (ex) {
        console.log('Error in selectedAccount listener', ex, ex.stack);
        throw ex;
      }
    });
  }
  
  return {

    /**
     * Returns the currently selected account.
     */    
    selection: null,

    /**
     * Sets the selectedAccount. Triggers the listeners to fire only if the 
     * new selection is diferent then the current selection.
     */
    set: function (account) {
      var old_selection = this.selection;
      this.selection    = account;
      if (old_selection !== this.selection) {
        notifyListeners(this.selection, old_selection);
      }
    },

    /** 
     * Register a listener for when the selected account changes
     */
    addListener: function (listener, id) {
      if (id) {
        listener_to_id[id] = listener;
      }
      listeners.push(listener);
    },

    /**
     * Remove a listener either by direct reference or by id
     */
    removeListener: function (listener_or_id) {
      var listener = listener_or_id;
      if (typeof listener != 'function') {
        listener = listener_to_id[listener_or_id];
      }
      if (listener) {
        var index = listeners.indexOf(listener_or_id);
        if (index != -1) {
          listeners.splice(index, 1);
        } 
      }
    }
  }
});

})();