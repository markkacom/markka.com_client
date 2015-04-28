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