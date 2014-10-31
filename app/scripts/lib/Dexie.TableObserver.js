(function(){

  function TableObserverAddon(db) {
    
    db.Table.prototype.addObserver = function ($scope, observer) {
      var observers = this._observers || (this._observers = []);
      var index = observers.indexOf(observer);
      if (index === -1) {
        observers.push(observer);  
      }
      /* Auto remove observer when $scope was provided */
      if ($scope) {
        var self = this;
        $scope.$on("$destroy", function() { self.removeObserver(observer); });
      }
    };

    db.Table.prototype.removeObserver = function (observer) {
      var observers = this._observers || (this._observers = []);
      var index = observers.indexOf(observer);
      if (index !== -1) {
        observers.splice(index, 1);
      }
    };

    db.Table.prototype.notifyObservers = function (callback) {
      if (this._observers) {
        angular.forEach(this._observers, function (observer) {
          callback(observer);
        });
      }
    };
  }

  Dexie.addons.push(TableObserverAddon);
})();