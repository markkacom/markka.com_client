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
    .when('/messenger/:id_rs', {
      templateUrl: 'partials/messenger.html',
      controller: 'MessengerController'
    });
});

module.controller('MessengerController', function($location, $q, $scope, modals, $rootScope, $routeParams, nxt, 
  plugins, ChatListProvider, ChatMessagesProvider, Emoji, KeyService, $timeout, settings) {

  $scope.id_rs          = $routeParams.id_rs;
  $scope.contactRS      = null;
  $scope.contactName    = null;
  $scope.message        = { text: '', html: '' };
  $scope.emoji          = { groups: Emoji.groups };

  $scope.ui             = {};
  $scope.ui.emojiCollapse  = true;
  $scope.ui.replyCollapse  = true;
  $scope.ui.transientReply = false;
  $scope.ui.permanentReply = false;

  $scope.breadcrumb     = [];

  var api = nxt.get($scope.id_rs);
  if (!api || (!$rootScope.currentAccount || $scope.id_rs != $rootScope.currentAccount.id_rs)) {
    $location.path('/login-to');
    return;
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
    }, 1000);
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
      $scope.breadcrumb[3].label = id_rs;
      $scope.breadcrumb[3].href = "#/accounts/"+id_rs+"/activity/latest";

      $scope.chatMessagesProvider = new ChatMessagesProvider(api, $scope, 8, $scope.id_rs, id_rs);
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

  $scope.toggleReply = function () {
    $scope.ui.replyCollapse=!$scope.ui.replyCollapse;
    $scope.ui.emojiCollapse=true;
    $scope.ui.transientReply = false;
    $scope.ui.permanentReply = false;
    $scope.message.text = '';
    $scope.message.html = '';
    $scope.message.send = false;
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

  $scope.sendDirectMessage = function () {
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