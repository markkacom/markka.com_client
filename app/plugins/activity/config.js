(function () {
'use strict';
var module = angular.module('fim.base');
module.config(function($stateProvider) {  
  $stateProvider.state('activity', {
    url: '/activity/:engine/:timestamp/:count',
    templateUrl: 'plugins/activity/partials/activity.html',
    controller: 'ActivityPlugin'
  });
});

module.run(function (plugins, $sce) {

  function content(name) {
    var content = '<p><h4>'+name+'</h4><p>';
    return $sce.trustAsHtml(content)
  }

  var sub_menu = [{
    sref: 'activity({ engine: "nxt", timestamp: 0, count: 20 })',
    html: content('NXT')
  },{
    sref: 'activity({ engine: "fim", timestamp: 0, count: 20 })',
    html: content('FIM')
  }];  

  plugins.register({
    id: 'activity',
    extends: 'app',
    sref: 'activity',
    sub_menu_html: function () {
      return sub_menu;
    },
    label: 'Activity',
    icon_class: 'glyphicon glyphicon-road'
  });

});
})();