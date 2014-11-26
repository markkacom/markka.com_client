(function () {
'use strict';
var module = angular.module('fim.base');
module.run(function (settings) {

  settings.initialize([{
    id: 'mofowallet.always.start.nxt',
    value: false,
    type: Boolean,
    label: 'Always start NXT server on startup'
  },{
    id: 'mofowallet.always.start.fimk',
    value: false,
    type: Boolean,
    label: 'Always start FIMK server on startup'
  },{
    id: 'mofowallet.never.start.nxt',
    value: false,
    type: Boolean,
    label: 'Never start NXT server on startup'
  },{
    id: 'mofowallet.never.start.fimk',
    value: false,
    type: Boolean,
    label: 'Never start FIMK server on startup'
  }]);

});
module.controller('StartServerModalController', function(items, $modalInstance, $scope, settings) {

  $scope.items = items;
  $scope.activities = items.activities;

  var always_key = 'mofowallet.always.start.'+(items.type == 'TYPE_NXT'?'nxt':'fimk');
  var never_key = 'mofowallet.never.start.'+(items.type == 'TYPE_NXT'?'nxt':'fimk');  

  $scope.items.alwaysStart = settings.get(always_key);
  $scope.items.neverStart = settings.get(never_key);

  $scope.close = function () {
    $modalInstance.close(false);
  }

  $scope.startServer = function () {
    $modalInstance.close(true);
  }

  $scope.alwaysStartChanged = function () {
    settings.update(always_key, $scope.items.alwaysStart);
  }

  $scope.neverStartChanged = function () {
    settings.update(never_key, $scope.items.neverStart);    
  }

});
})();