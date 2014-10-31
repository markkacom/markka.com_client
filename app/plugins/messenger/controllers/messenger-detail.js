(function () {
'use strict';
var module = angular.module('fim.base');
module.controller('MessengerPluginDetailController', function($state,$scope) {
  $scope.detail = {};
  $scope.detail.sender_rs = 'NXT-8E6V-YBWH-5VMR-26ESD';
  $scope.detail.recipient_rs = 'NXT-JXRD-GKMR-WD9Y-83CK7';
  $scope.detail.content = 'Hello i am content';
  $scope.detail.date = '22 april 2014 08:01';
});
})();