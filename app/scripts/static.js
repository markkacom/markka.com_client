(function () {
'use strict';

var module = angular.module('fim.base');

module.value('assets', {
  'NULL': { symbol: '.', name: '.', decimals: 0, max: 0 },  // null asset for empty views
  'BTC': { symbol: 'BTC', name: 'Bitcoin', decimals: 8, max: 21000000 },
  'NXT': { symbol: 'NXT', name: 'Nxt', decimals: 8, max: 1000000000 },
  'NAS': { symbol: 'NAS', name: 'NAS', decimals: 8, max: 1000000000 },
  'FIMK': { symbol: 'FIMK', name: 'FIMKrypto', decimals: 8, max: 1000000000 },
  'DGEX': { symbol: 'DGEX', name: 'DGEX asset', decimals: 0, max: 100000 },
});

})();