(function () {
'use strict';
var module = angular.module('fim.base');
module.config(function($stateProvider) {  
  $stateProvider.state('blocks', {
    url: '/blocks/:engine/:height',
    templateUrl: 'plugins/blocks/partials/blocks.html',
    controller: 'BlocksPlugin'
  });
});

module.run(function (modals, plugins, nxt, alerts, $q, db, $timeout) {

  var explorers = [{
    id: 'nxt',
    label: 'NXT',
    table: 'nxtblocks'
  }, {
    id: 'fimk',
    label: 'FIMK',
    table: 'fimblocks'
  }];

  var sub_menu = [];
  angular.forEach(explorers, function (explorer) {
    sub_menu.push({
      label_pair: [explorer.label, 'loading', '*'],
      sref: "blocks({ engine: '"+explorer.id+"'})"
    })
  });

  function loadBlocks() {
    var deferred = $q.defer();
    var sub = [];
    var iterator = new Iterator(explorers);

    function next() {
      var explorer = iterator.next();
      db[explorer.table].orderBy('height').last().then(
        function (block) {
          if (block) {
            sub.push({
              label_pair: [explorer.label, nxt.util.formatTimestamp(block.timestamp), block.height],
              sref: "blocks({ engine: '"+explorer.id+"', height: '"+block.height+"'})"
            });
          }
          iterator.hasMore() ? next() : deferred.resolve(sub);
        }
      );
    }
    next();
    return deferred.promise;
  }

  function load() {
    loadBlocks().then(function (_sub_menu) {
      $timeout(function () {
        sub_menu = _sub_menu;
      });
    });
  }
  load();

  plugins.register({
    id: 'blocks',
    extends: 'app',
    sref: 'blocks',
    sub_menu: function () {
      return sub_menu;
    },
    sub_menu_activate: load,
    label: 'Blocks',
    icon_class: 'glyphicon glyphicon-road'
  });

});
})();