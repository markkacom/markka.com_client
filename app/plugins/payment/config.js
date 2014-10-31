(function () {
'use strict';
var module = angular.module('fim.base');
module.run(function (modals, plugins, $q) {

  var config = {
    senderRS:           { type: String },
    recipientRS:        { type: String },
    recipientReadonly:  { type: Boolean },
    amountNXT:          { type: String },
    feeNXT:             { type: String },
    message:            { type: String },
    secretPhrase:       { type: String },
    recipientPublicKey: { type: String },
    showPublicKey:      { type: Boolean },
    skipSaveContact:    { type: Boolean },
    hidePublicKey:      { type: Boolean },
    publishPublicKey:   { type: Boolean }
  };
  
  /* Register as plugin */
  plugins.register({
    id: 'payment',
    extends: 'accounts',
    label: 'PAY',
    create: function (args) {
      if (plugins.validate(args, config)) {
        var deferred = $q.defer();
        modals.open('paymentCreate', {
          resolve: {
            items: function () {
              return angular.copy(args);
            }
          },
          close: function (items) {
            deferred.resolve(items);
          },
          cancel: function () {
            deferred.resolve(null);
          }
        });
        return deferred.promise;
      }
    }
  });

  /* Register modal dialogs */
  modals.register('paymentCreate', { 
    templateUrl: 'plugins/payment/partials/payment-create-modal.html', 
    controller: 'PaymentPluginCreateModalController' 
  });
});

})();