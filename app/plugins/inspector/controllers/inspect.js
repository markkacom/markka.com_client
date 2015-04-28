(function () {
'use strict';
var module = angular.module('fim.base');
module.controller('InspectorPluginInspectModalController', function (items, $modalInstance, $scope, $sce, $timeout, $location, $rootScope) {

  $rootScope.$on("$routeChangeStart", function (event, next, current) {  
    $timeout(function () { $scope.close(); }, 1000, false);
  });
  
  $scope.items = items;
  var order = items.order ? items.order.split(',') : [];

  $scope.close = function () {
    $modalInstance.close($scope.items);
  }

  $scope.goToAccount = function (id_rs) {
    $timeout(function () {
      $location.path('/accounts/'+id_rs);
    });
    $scope.close();
  }

  $scope.goToAsset = function (asset_id, issuerRS) {
    var engine = issuerRS.indexOf('NXT-') == 0 ? 'nxt' : 'fimk';
    $timeout(function () {
      $location.path('/assets/'+engine+'/'+asset_id);
    });
    $scope.close();
  }

  function renderTable(object) {
    var s = ['<table class="table table-striped table-condensed table-hover"><tbody>'];
    var sorted = []
    angular.forEach(object, function (value, key) {
      sorted.push({key: key, value: value});
    });
    if (order.length > 0) {
      sorted.sort(function (a, b) {
        a = order.indexOf(a.key);
        b = order.indexOf(b.key);
        a = a == -1 ? Number.MAX_VALUE : a;
        b = b == -1 ? Number.MAX_VALUE : b;
        if (a < b) { return -1; }
        if (a > b) { return 1;  }
        return 0;
      });
    }
    angular.forEach(sorted, function (tuple) {
      renderObject(s, 0, tuple.key, tuple.value, items.translator||{});
    });
    s.push('</tbody></table>');
    return s.join('');
  }

  /* @returns Array [label, value] */
  function translate(_translator, key, value) {
    return _translator && _translator[key] ? _translator[key].call(null, value) : [key, value];
  }

  function capitalize(s) {
    return (typeof s == 'string') ? (s[0].toUpperCase() + s.slice(1)) : s;
  }

  function renderRow(s, indent, name, value, translator) {
    var tuple = translate(translator, name, value);
    s.push('<tr>');
    s.push('<td style="padding-left:',indent,'px;"><strong>',capitalize(tuple[0]),'</strong></td>');
    s.push('<td>',tuple[1],'</td>');
    s.push('</tr>');    
  }

  function renderObject(s, indent, name, object, translator) {
    var t = typeof object;
    if (t=='number'||t=='string'||t=='function'||t=='boolean'||object==null||object==undefined) {
      renderRow(s, indent, name, object, translator);
    }
    else {
      renderRow(s, indent, name, '');
      angular.forEach(object, function (value, key) {
        renderObject(s, indent+10, key, value, translator[name]||{});
      });
    }    
  }

  $scope.tableHTML = $sce.getTrustedHtml(renderTable(items.object));
});
})();
