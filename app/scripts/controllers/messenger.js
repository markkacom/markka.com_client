(function () {
'use strict';
var module = angular.module('fim.base');

function getCSS(clazz, property) {
  var p = document.createElement("span");
  p.setAttribute("class", clazz);
  p.setAttribute("style", "display:none");
  document.body.appendChild(p);
  var result;
  if (Array.isArray(property)) {
    result = [];
    for (var i=0; i<property.length; i++) {
      result.push(window.getComputedStyle(p).getPropertyValue(property[i]));
    }
  }
  else {
    result = window.getComputedStyle(p).getPropertyValue(property);
  }
  p.parentNode.removeChild(p);
  return result;
}

module.config(function($routeProvider) {
  $routeProvider
    .when('/messenger/:id_rs/:type', {
      templateUrl: 'partials/messenger.html',
      controller: 'MessengerController'
    });
});

module.controller('MessengerController', function($location, $q, $scope, modals, $rootScope, $routeParams, nxt, 
  plugins, ChatListProvider, ChatMessagesProvider, GossipChatMessagesProvider, Gossip, Emoji, KeyService, $timeout, settings) {

  $scope.id_rs          = $routeParams.id_rs;
  $scope.paramType      = $routeParams.type;
  $scope.contactRS      = null;
  $scope.contactName    = null;
  $scope.message        = { 
    text: '', 
    html: '',
    recipient: '',
    recipientPublicKey:''
  };
  $scope.emoji          = { groups: Emoji.groups };

  $scope.ui             = {};
  $scope.ui.emojiCollapse  = true;
  $scope.ui.editRecipient  = false;

  $scope.breadcrumb     = [];

  var api = nxt.get($scope.id_rs);
  if (!api || (!$rootScope.currentAccount || $scope.id_rs != $rootScope.currentAccount.id_rs)) {
    $location.path('/login-to');
    return;
  }

  if (['gossip', 'blockchain'].indexOf($scope.paramType) == -1) {
    $scope.paramType = 'gossip';
  }

  $scope.feeCost        = api.engine.feeCost + ' ' + api.engine.symbol;;

  function generateSpeechBubbleBootstrapCSS() {
    var fromMe = getCSS('btn btn-primary', ['background-color', 'color']);
    var fromThem = getCSS('alert alert-info', ['background-color', 'color']);
    var background = window.getComputedStyle(document.body).getPropertyValue('background-color');
    var styleElement = document.getElementById('speech-bubble-css');
    if (!styleElement) {
      styleElement = document.createElement('style');
      styleElement.setAttribute('id', 'speech-bubble-css');
      styleElement.setAttribute('type', 'text/css');
      document.head.appendChild(styleElement);
    }
    styleElement.innerHTML = [
      '.chat .fromMe { color:',fromMe[1],' !important; background:',fromMe[0],' !important; }\n',
      '.chat .fromMe:before { border-right:20px solid ',fromMe[0],' !important;}\n',
      '.chat .fromMe:after { background:',background,' !important;}\n',
      '.chat .fromThem { color:',fromThem[1],' !important; background:',fromThem[0],' !important;}\n',
      '.chat .fromThem:before { border-left:20px solid ',fromThem[0],' !important;}\n',
      '.chat .fromThem:after { background:',background,' !important;}\n',
    ].join('');
  }
  
  generateSpeechBubbleBootstrapCSS();
  settings.resolve('themes.default.theme', function () {
    $timeout(function () {
      generateSpeechBubbleBootstrapCSS();
    });
  });

  /* Breadcrumbs */
  $scope.breadcrumb.push({
    label: 'translate.home',
    href:  "#/home/"+api.engine.symbol+"/activity/latest",
    translate: true
  });
  $scope.breadcrumb.push({
    label: $scope.id_rs,
    href:  "#/accounts/"+$scope.id_rs+"/activity/latest",
  });
  $scope.breadcrumb.push({
    label: 'translate.messenger',
    active:  true,
    translate: true
  });
  $scope.breadcrumb.push({
    label: $scope.contactName||$scope.contactRS,
    href:  "#/accounts/"+$scope.contactRS+"/activity/latest"
  });

  $scope.chatListProvider = new ChatListProvider(api, $scope, 6, $scope.id_rs);
  $scope.chatListProvider.reload().then(function () {
    var chat = $scope.chatListProvider.entities[0];
    if (chat) {
      $scope.showChats(chat.accountRS);
    }
  });

  function createMessageProvider(id_rs) {
    if ($scope.paramType == "gossip") {
      return new GossipChatMessagesProvider(api, $scope, 8, $scope.id_rs, id_rs);
    }
    return new ChatMessagesProvider(api, $scope, 8, $scope.id_rs, id_rs);
  }

  $scope.reload = function () {
    if ($scope.chatListProvider) {
      $scope.chatListProvider.reload();
    }
    if ($scope.chatMessagesProvider) {
      $scope.chatMessagesProvider.reload();
    }
  }

  $scope.showChats = function (id_rs) {
    $scope.$evalAsync(function () {
      $scope.slide.offCanvas = false;
      $scope.contactRS = id_rs;

      $scope.ui.editRecipient  = false;
      $scope.message.text = '';
      $scope.message.html = '';
      $scope.message.recipient = '';
      $scope.message.recipientPublicKey = '';

      $scope.breadcrumb[3].label = id_rs;
      $scope.breadcrumb[3].href = "#/accounts/"+id_rs+"/activity/latest";

      $scope.chatMessagesProvider = createMessageProvider(id_rs);
      $scope.chatMessagesProvider.reload().then(
        function () {
          $scope.$evalAsync(function () {
            $scope.breadcrumb[1].label = $scope.chatMessagesProvider.accountOneName || $scope.chatMessagesProvider.accountOne;
            $scope.contactName = $scope.chatMessagesProvider.accountTwoName;
            $scope.breadcrumb[3].label = $scope.contactName || id_rs;
          })
        }
      );      
    });
  }

  $scope.messageChanged = function () {
    $scope.message.html = Emoji.emojifi($scope.message.text);
  }

  $scope.insertEmoji = function (name) {
    $scope.$evalAsync(function () {
      $scope.message.text += ':'+Emoji.toBase32(name)+':';
      $scope.message.html = Emoji.emojifi($scope.message.text);
    });
  }

  $scope.sendMessage = function () {
    plugins.get('transaction').get('sendMessage').execute($scope.id_rs, {}).then(
      function (items) {
        if (items != null) {
          $scope.$evalAsync(function () {
            $scope.message.send = true;  
          });        
          $timeout(function () { $scope.message.send = false }, 5000);
        }
      }
    );
  }  

  $scope.newMessage = function () {
    switch ($scope.paramType) {
      case "gossip":
        $scope.ui.editRecipient = true;
        $scope.slide.offCanvas  = false;
        $scope.contactRS        = null;
        $scope.contactName      = null;

        $scope.chatMessagesProvider = null;
        break;
      default:
        $scope.sendMessage();
        break;
    }
  }

  $scope.sendDirectMessage = function () {
    switch ($scope.paramType) {
      case "gossip":
        sendGossipMessage();
        break;
      default:
        sendBlockchainMessage();
        break;
    }
  };

  function sendGossipMessage() {
    var recipient, recipientPublicKey;
    if ($scope.ui.editRecipient) {
      recipient = $scope.message.recipient;
      recipientPublicKey = $scope.message.recipientPublicKey;
    }
    else {
      recipient = $scope.contactRS;
      recipientPublicKey = null;
    }

    recipientPublicKey= null;

    if (recipientPublicKey) {
      Gossip.sendEncryptedGossip(api, 
                                 $rootScope.currentAccount.secretPhrase, 
                                 recipientPublicKey, 
                                 $scope.message.text, 
                                 "1").then(
        function () {
          $scope.$evalAsync(function () {
            $scope.ui.emojiCollapse  = true;
            $scope.message.text = '';
            $scope.message.html = '';
            $scope.message.recipient = '';
            $scope.message.recipientPublicKey = '';
            $scope.message.send = true;
            $timeout(function () { $scope.message.send = false }, 5000);
          });
          $timeout(function () { $scope.chatListProvider.reload() }, 3000);
        }
      );
    }
    else {
      Gossip.sendGossip(api, 
                        $rootScope.currentAccount.secretPhrase, 
                        recipient, 
                        $scope.message.text, 
                        "1").then(
        function () {
          $scope.$evalAsync(function () {
            $scope.ui.emojiCollapse  = true;
            $scope.message.text = '';
            $scope.message.html = '';
            $scope.message.recipient = '';
            $scope.message.recipientPublicKey = '';
            $scope.message.send = true;
            $timeout(function () { $scope.message.send = false }, 5000);
            $timeout(function () { $scope.chatListProvider.reload() }, 3000);
          });
        }
      );
    }
  }

  $scope.lookupPublicKey = function () {
    var arg = { requestType: "getAccountPublicKey", account: $scope.message.recipient };
    api.engine.socket().callAPIFunction(arg).then(
      function (data) {
        $scope.$evalAsync(function () {
          $scope.message.recipientPublicKey = data.publicKey;
        });
      }
    )
  }

  function sendBlockchainMessage() {
    plugins.get('transaction').get('sendMessage').execute($scope.id_rs, { 
      recipient: $scope.contactRS,
      message: $scope.message.text,
      editRecipient: false,
      autoSubmit: true,
      transient: !!$scope.ui.transientReply
    }).then(function (items) {
      $scope.$evalAsync(function () {
        if (items != null) {
          $scope.ui.emojiCollapse  = true;
          $scope.ui.replyCollapse  = true;
          $scope.ui.transientReply = false;
          $scope.ui.permanentReply = false;
          $scope.message.text = '';
          $scope.message.html = '';
          $scope.message.send = true;
          $timeout(function () { $scope.message.send = false }, 5000);
        }
      });
    });
  }
});

})();