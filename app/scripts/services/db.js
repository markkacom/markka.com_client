(function () {
'use strict';

function update(src, config) {
  var store = angular.copy(src);
  if (config.update) {
    angular.extend(store, config.update);
  }
  if (config.remove) {
    angular.forEach(config.remove, function (val, id) {
      delete store[id];
    })
  }
  return store;
}

function versions(updates, db) {
  var store = {};
  try {
    angular.forEach(updates, function (config, index) {
      store = update(store, config);
      db.version(index+1).stores(store);
    });
  }
  catch (e) {
    console.log('DB.open.update',e);
  }
}

var module = angular.module('fim.base');
module.factory('db', function ($log, $injector, $timeout, $rootScope) {

  var old_db = new Dexie('fimkrypto-db');
  old_db.delete();
  old_db = null;

  if (IS_TEST_NET) {
    var db = new Dexie('fimkrypto-db-test');
  }
  else {
    var db = new Dexie('fimkrypto-db2');
  }
  db.createObserver = createObserver;
  var masspay_payments = "++id,index,recipientRS,amountNQT,transactionSuccess,broadcastSuccess,blockchainStatus,created,broadcasted";
  var settings = "++id";
  var accounts = "id_rs,name";
  var nodes = "++id,port";
  var contacts = "++id,id_rs,name";
  versions([{
    update: {
      masspay_payments: masspay_payments,
      settings: settings,
      accounts: accounts,
      nodes: nodes,
      contacts: contacts
    }
  }], db);

  db.on('error', function (e) { console.error(e) });
  db.on('changes', function (changes, partial) {
    var tables = {};
    changes.forEach(function (change) {
      var table = (tables[change.table]||(tables[change.table]={create:[],update:[],remove:[]}));
      switch (change.type) {
        case 1: { // CREATED
          table.create.push(change.obj);
          break;
        }
        case 2: { // UPDATED
          table.update.push(change.obj);
          break;
        }
        case 3: { // DELETED
          table.remove.push(change.oldObj);
          break;
        }
      };
    });
    $rootScope.$evalAsync(function () {
      angular.forEach(tables, function (table, key) {
        db[key].notifyObservers(function (observer) {
          if (observer.create) {
            observer.create(table.create);
          }
          if (observer.update) {
            observer.update(table.update);
          }
          if (observer.remove) {
            observer.remove(table.remove);
          }
          if (!partial) {
            if (observer.finally) {
              observer.finally();
            }
          }
        });
      });
    });
  });

  try {
    db.open();
  }
  catch(e) {
    console.log('DB.open.error',e);
  }

  $injector.get('Setting').initialize(db);
  $injector.get('Account').initialize(db);
  $injector.get('Contact').initialize(db);
  $injector.get('Node').initialize(db);
  $injector.get('MasspayPluginPayment').initialize(db);

  function findFirstPropIndex(array, source, propertySource, propertyArray)  {
    propertyArray = propertyArray || propertySource;
    for (var i=0; i<array.length; i++) {
      if (source[propertySource] == array[i][propertyArray]) {
        return i;
      }
    }
    return -1;
  }

  /**
   * The default observer is enough for most CRUD requirements.
   * It works on all tables where a table is a list of model objects.
   *
   * @param $scope    Current scope
   * @param name      Name of the array on scope that should mirror the models
   * @param indexName Name of the index on the model
   * @param observer  Standard optional observer, if a method is defined it is 
   *                  called after the crud operations.
   * */
  function createObserver($scope, name, indexName, observer) {
    return {
      create: function (models) {
        $scope[name] = $scope[name].concat(models);
        if (observer && observer.create) {
          observer.create(models);
        }
      },
      update: function (models) {
        angular.forEach(models, function (model) {
          var index = findFirstPropIndex($scope[name], model, indexName);
          if (index > 0) {
            angular.extend($scope[name][index], model);
          }
        });
        if (observer && observer.update) {
          observer.update(models);
        }
      },
      remove: function (models) {
        angular.forEach(models, function (model) {
          var index = findFirstPropIndex($scope[name], model, indexName);
          var old = $scope[name][index];
          if (old) {
            $scope[name].splice(index, 1);
          }
        });
        if (observer && observer.remove) {
          observer.remove(models);
        }        
      }, 
      finally: function () {
        if (observer && observer.finally) {
          observer.finally();
        } 
      }
    };
  };
  return db;
});

})();