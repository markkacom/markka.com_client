/**
 * The MIT License (MIT)
 * Copyright (c) 2016 Krypto Fin ry and the FIMK Developers
 *
 * Permission is hereby granted, free of charge, to any person obtaining a copy of
 * this software and associated documentation files (the "Software"), to deal in
 * the Software without restriction, including without limitation the rights to
 * use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of
 * the Software, and to permit persons to whom the Software is furnished to do so,
 * subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be included in all
 * copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
 * SOFTWARE.
 * */
(function () {
'use strict';
var module = angular.module('fim.base');
module.run(function (modals, plugins, settings) {

  /* Register as plugin */
  var plugin = plugins.register({
    registry: {},
    id: 'themes',
    label: 'Themes',
    extends: 'settings',
    icon_class:   'glyphicon glyphicon-fire',
    templateURL: 'plugins/themes/partials/themes.html',
    switchTo: function (id) {
      document.getElementById('bootswatch.style').setAttribute('href', this.registry[id].url);
    },
    register: function (id, label, url) {
      this.registry[id] = { label: label, url: url, id: id };
    },
    default: function () {
      return this.registry['spacelab'];
    }
  });

  /* Register styles */
  angular.forEach(['amelia','cerulean','cosmo','custom','cyborg','darkly',
                   /*'default',*/'flatly','journal','lumen','paper','readable',
                   'sandstone','simplex','slate','spacelab','superhero',
                   'united','yeti', 'google'],
    function (id) {
      var capitalized = id.charAt(0).toUpperCase() + id.slice(1);
      plugin.register(id, capitalized, 'plugins/themes/css/'+id+'.bootstrap.min.css');
    }
  );

  /* Set default setting / load setting theme from db */
  settings.initialize([{
    id: 'themes.default.theme',
    value: 'google',
    type: String,
    label: 'Default theme',
    resolve: function (value) {
      plugin.switchTo(value);
    }
  }]);
});
})();