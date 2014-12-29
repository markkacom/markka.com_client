(function () {
'use strict';
var module = angular.module('fim.base');
module.controller('AccountsPluginSendProgressMoneyModalController', function(items, $modalInstance, $scope, $q, $interval, requests, nxt) {
  $scope.CREATE                 = 1;
  $scope.CREATE_FAILED          = 2
  $scope.CREATE_SUCCESS         = 3;
  $scope.SIGN                   = 4;
  $scope.SIGN_FAILED            = 5;
  $scope.SIGN_SUCCESS           = 6;
  $scope.BROADCAST              = 7;
  $scope.BROADCAST_DETERMINE    = 8;
  $scope.BROADCAST_UNCONFIRMED  = 9;
  $scope.BROADCAST_CONFIRMED    = 10;

  var api                       = items.api;
  $scope.items                  = items;
  $scope.method                 = items.method || 'sendMoney';

  $scope.title                  = 'Creating transaction';
  $scope.buttonDisabled         = false;
  $scope.buttonLabel            = 'Cancel';

  $scope.showCreatingTxn        = true;
  $scope.showSigningTxn         = false;
  $scope.showBroadcastingTxn    = false;
  $scope.state                  = $scope.CREATE;

  $scope.blockTimestamp         = '';
  $scope.numberOfConfirmations  = '';

  var observer = {
    start: function (methodName) {
      if (methodName == $scope.method) {
        setCreateState($scope.CREATE);
      }
      else if (methodName == 'sign') {
        setSignState($scope.SIGN);
      }
      else if (methodName == 'broadcastTransaction') {
        setBroadcastState($scope.BROADCAST);
      }
    },
    success: function (methodName, data) {
      if (methodName == $scope.method) {
        setCreateState($scope.CREATE_SUCCESS);
      }
      else if (methodName == 'sign') {
        setSignState($scope.SIGN_SUCCESS);
      }
      else if (methodName == 'broadcastTransaction') {
        setBroadcastState($scope.BROADCAST_DETERMINE);
        determineBroadcastState(data.transaction, data.fullHash);
      }
    },
    failed: function (methodName, data) {
      if (methodName == $scope.method) {
        $scope.errorMessage = data.errorDescription;
        setCreateState($scope.CREATE_FAILED);
      }
      else if (methodName == 'sign') {
        $scope.errorMessage = data.errorDescription;
        setSignState($scope.SIGN_FAILED);
      }
      else if (methodName == 'broadcastTransaction') {
        setBroadcastState($scope.BROADCAST_DETERMINE);
        determineBroadcastState(null, data.fullHash);        
      }
    }
  };

  var canceller                 = $q.defer();
  var podium                    = requests.theater.createPodium('send-progress', $scope);
  var options                   = { priority: 5, podium: podium };
  api[$scope.method](items.args, null, canceller, observer);

  function setCreateState(state) {
    delay(function () {
      $scope.showCreateTxn = true;
      $scope.create_state = state;
      switch (state) {
        case $scope.CREATE: {
          $scope.title           = 'Creating transaction';
          $scope.buttonDisabled  = false;
          $scope.buttonLabel     = 'Cancel';
          break;
        }
        case $scope.CREATE_FAILED: {
          $scope.title           = 'Failed to create transaction';
          $scope.buttonDisabled  = false;
          $scope.buttonLabel     = 'Close';
          break;
        }
        case $scope.CREATE_SUCCESS: {
          $scope.buttonDisabled  = false;
          $scope.buttonLabel     = 'Cancel';
          break;
        }
      }
    });
  }

  function setSignState(state) {
    delay(function () {
      $scope.showSignTxn = true;
      $scope.sign_state = state;
      switch (state) {
        case $scope.SIGN: {
          $scope.title           = 'Signing transaction';
          $scope.buttonDisabled  = true;
          $scope.buttonLabel     = 'Cancel';
          break;
        }
        case $scope.SIGN_FAILED: {
          $scope.title           = 'Failed to sign transaction';
          $scope.buttonDisabled  = false;
          $scope.buttonLabel     = 'Close';
          break;
        }
        case $scope.SIGN_SUCCESS: {
          $scope.buttonDisabled  = true;
          $scope.buttonLabel     = 'Cancel';
          break;
        }
      }
    });
  }

  function setBroadcastState(state, fn) {
    delay(function () {
      $scope.showBroadcastTxn = true;
      $scope.broadcast_state = state;
      switch (state) {
        case $scope.BROADCAST: {
          $scope.title           = 'Broadcasting transaction';
          $scope.buttonDisabled  = true;
          $scope.buttonLabel     = 'Cancel';
          break;
        }
        case $scope.BROADCAST_DETERMINE: {
          $scope.title           = 'Determining broadcast status';
          $scope.buttonDisabled  = false;
          $scope.buttonLabel     = 'OK';
          break;
        }
        case $scope.BROADCAST_UNCONFIRMED: {
          $scope.title           = 'Broadcast was successfull';
          $scope.buttonDisabled  = false;
          $scope.buttonLabel     = 'OK';
          break;
        }
        case $scope.BROADCAST_CONFIRMED: {
          $scope.title           = 'Transaction confirmed';
          $scope.buttonDisabled  = false;
          $scope.buttonLabel     = 'OK';
          break;
        }
      }
      fn && fn.call();
    });
  }

  /**
   * All state change handlers are called from an interval so updates to the
   * UI occur at a certain speed. This is for the user to be able to see the
   * state changes since some changes (create to sign, sign to broadcast) are 
   * to fast to observe. 
   */
  var delayed = [], delay_interval = null;
  function delay(fn) {
    delayed.push(fn);
    if (delay_interval == null) {
      delay_interval = $interval(function () {
        if (delayed.length) {
          var _fn = delayed.splice(0, 1);
          if (_fn && _fn[0]) {
            $scope.$evalAsync(_fn[0]);
          }
        }
      }, 500, 0, false);
      $scope.$on('destroy', function () {
        $interval.cancel(delay_interval);
      });
    }
  }

  /* Phase is either CREATE, SIGN or BROADCAST and is determined by which show** scope
     variables are set to true. */
  function getPhase() {
    if ($scope.showCreateTxn && !$scope.showSignTxn && !$scope.showBroadcastTxn) {
      return $scope.CREATE;
    }
    else if ($scope.showCreateTxn && $scope.showSignTxn && !$scope.showBroadcastTxn) {
      return $scope.SIGN;
    }
    return $scope.BROADCAST;
  }
 
  $scope.buttonAction = function () {
    switch (getPhase()) {
      case $scope.CREATE: {
        switch ($scope.create_state) {
          case $scope.CREATE:
            canceller.resolve();
          case $scope.CREATE_FAILED:
            $modalInstance.dismiss();
            break;
        }
        break;
      }
      case $scope.SIGN:{
        switch ($scope.sign_state) {
          case $scope.SIGN_FAILED:
            $modalInstance.dismiss();
            break;
        }
        break;
      }
      case $scope.BROADCAST:{
        switch ($scope.broadcast_state) {
          case $scope.BROADCAST_DETERMINE: 
          case $scope.BROADCAST_UNCONFIRMED:
          case $scope.BROADCAST_CONFIRMED:
            $modalInstance.close();
            break;
        }
        break;
      }
    }
  }

  var determine_interval = null;
  function determineBroadcastState(transaction_id, fullHash) {
    determineState();
    determine_interval = $interval(function () { determineState(transaction_id, fullHash); }, 5 * 1000);
    $scope.$on('destroy', function () {
      $interval.cancel(determine_interval);
    });
  }

  function determineState(transaction_id, fullHash) {
    var args    = transaction_id ? {transaction: transaction_id} : {fullHash: fullHash};
    var options = { priority: 5, podium: podium };
    var promise = api.getTransaction(args, options);
    promise.then(
      function (data) {
        if (data.blockTimestamp) {
          setBroadcastState($scope.BROADCAST_CONFIRMED, function () {
            $scope.blockTimestamp         = nxt.util.formatTimestamp(data.blockTimestamp);;
            $scope.numberOfConfirmations  = data.confirmations;
          });
        }
        else {
          setBroadcastState($scope.BROADCAST_UNCONFIRMED);
        }
      }
    );
  }

});
})();