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
module.config(function($routeProvider) {
  $routeProvider
    .when('/contacts', {
      templateUrl: 'plugins/contacts/partials/contacts.html',
      controller: 'ContactsPlugin'
    });
});

module.run(function (modals, plugins, $q) {

  /* Register as plugin */
  plugins.register({
    id:       'contacts',
    label:    'Contacts',
    extends:  'settings',
    icon_class:   'glyphicon glyphicon-user',
    templateURL:  'plugins/contacts/partials/contacts.html',
    select: function (args) {
      var deferred = $q.defer();
      modals.open('contactsSelect', {
        resolve: {
          items: function () {
            return args;
          }
        },
        close: function (contact) {
          deferred.resolve(contact);
        }
      });
      return deferred.promise;
    },
    add: function (args) {
      if (plugins.validate(args, {
            update:  {type: Boolean},
            message: {type: String},
            id_rs:   {type: String},
            name:    {type: String},
            email:   {type: String},
            website: {type: String}
          }))
      {
        var deferred = $q.defer();
        modals.open('contactsAdd', {
          resolve: {
            items: function () {
              return args;
            }
          },
          close: function () {
            deferred.resolve(true);
          },
          cancel: function () {
            deferred.resolve(false);
          }
        });
        return deferred.promise;
      }
    },
    update: function (args) {
      args.update = true
      return this.add(args);
    }
  });

  /* Register modal dialogs */
  modals.register('contactsAdd', {
    templateUrl: 'plugins/contacts/partials/contacts-add-modal.html',
    controller: 'ContactsPluginAddModalController'
  });
  modals.register('contactsDetail', {
    templateUrl: 'plugins/contacts/partials/contacts-detail-modal.html',
    controller: 'ContactsPluginDetailModalController'
  });
  modals.register('contactsEdit', {
    templateUrl: 'plugins/contacts/partials/contacts-edit-modal.html',
    controller: 'ContactsPluginEditModalController'
  });
  modals.register('contactsSelect', {
    templateUrl: 'plugins/contacts/partials/contacts-select-modal.html',
    controller: 'ContactsPluginSelectModalController'
  });
});

})();