(function () {
'use strict';
var module = angular.module('fim.base');
module.controller('SettingsPluginDBController', function($scope, db, $compile, ngTableParams, $timeout, plugins) {

  $scope.tables = db.tables;
  $scope.selectedTable = $scope.tables [0];

  $scope.clearSelectedTable = function () {
    if (window.confirm('All records will be deleted, this could have side effects.\nAre you sure you want to clear this table?')) {
      $scope.selectedTable.clear();
    }
  };

  $scope.deleteRow = function (row) {
    plugins.get('alerts').confirm({
      title: 'Delete row',
      message: 'Are you sure you want to delete this row?'
    }).then(
      function (value) {
        if (value) {
          $scope.selectedTable.delete(row[$scope.selectedTable.schema.primKey.name]);
        }
      }
    )
  };

  $scope.deleteDatabase = function () {
    plugins.get('alerts').confirm({
      title: 'Delete Database',
      message: 'WARNING!! This deletes your entire database. Are you sure?'
    }).then(
      function (value) {
        if (value) {
          window.indexedDB.deleteDatabase('fimkrypto-db2');
        }
      }
    )
  };

  var previousTable = null;
  var observer = {
    finally: function () {
      if ($scope.tableParams) {
        $scope.tableParams.reload();
      }
    }
  };

  $scope.selectedTableChanged = function () {
    var name    = $scope.selectedTable.name;
    var schema  = $scope.selectedTable.schema;

    /* Stop observing the previous table for changes */
    if (previousTable) {
      db[previousTable].removeObserver(observer);
      previousTable = null;
    }

    /* Count the number of records */
    db[name].count().then(
      function (count) {

        /* Observe table for changes */
        db[name].addObserver($scope, observer);

        $timeout(function () {
          $scope.tableParams = new ngTableParams({
              page: 1,
              count: 10
            }, 
            {
              total: count,
              getData: function($defer, params) {
                var start  = (params.page() - 1) * params.count();
                var length = params.page() * params.count();
                db[name].offset(start).limit(length).toArray().then(
                  function (rows) {
                    $defer.resolve(rows);
                  }
                );
              }
            }
          ); 
          var element = $compile(generateTableHTML(schema))($scope);
          angular.element(document.getElementById('settings-db-table-container')).replaceWith(element);
        });
      }
    );
  };

  function generateTableHTML(schema) {
    var html = [];
    html.push('<div id="settings-db-table-container">');
    html.push('<table ng-table="tableParams" class="table table-striped table-condensed table-hover">');
    html.push('<tr ng-repeat="t in $data">');
    html.push('<td><a href ng-click="deleteRow(t)">del</a></td>');
    angular.forEach(schema.instanceTemplate, function (type, id) {
      html.push('<td ');
      if (id == 'id_rs' || id == 'recipientRS' || id == 'senderRS') {
        html.push('style="white-space:nowrap" ');
      }
      html.push('data-title="\'',id,'\'" sortable="',id,'" header-class="text-left">{{t.',id,' | json}}</td>');
    });
    html.push('</tr>');
    html.push('</table>');
    html.push('</div>');
    return html.join('');
  }

  /* Initialize */
  $scope.selectedTableChanged();
});

})();