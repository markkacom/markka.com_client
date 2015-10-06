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

function generateSpeechBubbleBootstrapCSS() {
  var fromMe = getCSS('btn btn-primary', ['background-color', 'color']);
  var fromThem = getCSS('alert alert-info', ['background-color', 'color']);
  //var fromThem = getCSS('jumbotron', ['background-color', 'color']);
  var background = window.getComputedStyle(document.body).getPropertyValue('background-color');
  var styleElement = document.getElementById('speech-bubble-css');
  if (!styleElement) {
    styleElement = document.createElement('style');
    styleElement.setAttribute('id', 'speech-bubble-css');
    styleElement.setAttribute('type', 'text/css');
    document.head.appendChild(styleElement);
  }
  var html = [
    '.chat .fromMe { color:',fromMe[1],' !important; margin-left:30px; background:',fromMe[0],' !important; }\n',
    '.chat .fromMe:before { border-right:20px solid ',fromMe[0],' !important;}\n',
    '.chat .fromMe:after { background:',background,' !important;}\n',
    '.chat .fromThem { color:',fromThem[1],' !important; margin-right:30px; background:',fromThem[0],' !important;}\n',
    '.chat .fromThem:before { border-left:20px solid ',fromThem[0],' !important;}\n',
    '.chat .fromThem:after { background:',background,' !important;}\n',
  ].join('');
  if (styleElement.innerHTML != html) {
    styleElement.innerHTML = html;
  }
}

module.config(function($routeProvider) {
  $routeProvider
    .when('/messenger/:id_rs?', {
      templateUrl: 'partials/messenger.html',
      controller: 'MessengerController'
    });
});

module.controller('MessengerController', function($location, $q, $scope, modals, $rootScope, 
  $routeParams, nxt, plugins, GossipChatMessagesProvider, Gossip, Emoji, 
  KeyService, $timeout, settings, publicKeyService, GossipChatListProvider, $interval) {
  
  $rootScope.unread = false;

  var unread_interval = $interval(function() { $rootScope.unread = false }, 5000);
  $scope.$on('$destroy', function () {  $interval.cancel(unread_interval) });

  /* might not have been started */
  Gossip.onActivated();
  $scope.gossipUI = Gossip.ui;

  $scope.id_rs   = $routeParams.id_rs;
  $scope.message = { 
    text: '', 
    html: '',
    name: '',
    recipient: '',
    recipientPublicKey: '',
    recipientValid: false
  };
  $scope.emoji   = { groups: Emoji.groups };
  $scope.ui      = {};
  $scope.ui.emojiCollapse = true;
  $scope.ui.editRecipient = false;
  $scope.ui.chat          = null;
  $scope.ui.sendOffline   = false;
  $scope.ui.isTyping      = false;

  var typing_timeout = null;

  /* have to login first */
  if (!$rootScope.currentAccount) {
    $rootScope.destURL = $location.url();
    $location.path('/login-to');
    return;
  }

  var api = nxt.get($rootScope.currentAccount.id_rs);
  if (!api) {
    $location.path('/login-to');
    return;
  }

  $scope.feeCost = api.engine.feeCost + ' ' + api.engine.symbol;
  
  generateSpeechBubbleBootstrapCSS();
  settings.resolve('themes.default.theme', function () {
    $timeout(function () {
      generateSpeechBubbleBootstrapCSS();
    });
  });

  $scope.chatListProvider = new GossipChatListProvider(api, $scope, $rootScope.currentAccount.id_rs);
  var promise = $scope.chatListProvider.reload();

  /* enable the add contact editor */
  if ($routeParams.id_rs == 'new') {
    $scope.ui.editRecipient = true;
  }
  /* empty url - load contacts and select first one or go to add contact */
  else if (!$scope.id_rs) {
    promise.then(
      function () {
        var chat = $scope.chatListProvider.entities[0];
        if (chat) {
          $location.path('/messenger/'+chat.otherRS);
        }
        else {
          $location.path('/messenger/new');
        }
      }
    );
  }
  /* contact id provided */
  else {
    promise.then(
      function () {
        /* look up the chat in the provider */
        var provider = $scope.chatListProvider;
        for (var i=0; i<provider.entities.length; i++) {
          if (provider.entities[i].otherRS == $scope.id_rs) {
            $scope.$evalAsync(function () {
              var chat = $scope.ui.chat = provider.entities[i];
              /* sends a ping if user is offline */
              if (chat.provider && !chat.provider.online) {
                Gossip.ping(chat.otherRS);
              }
              /* create the messages provider */ 
              $scope.chatMessagesProvider = new GossipChatMessagesProvider(api, $scope, 8, $rootScope.currentAccount.id_rs, $scope.id_rs);
              $scope.chatMessagesProvider.reload().then(
                function () {
                  $scope.$evalAsync(function () {
                    $scope.contactName = $scope.chatMessagesProvider.accountTwoName;
                  });
                }
              );
            });
            return;
          }
        }
        /* if it aint there - assume it's an account we want to add */
        $scope.$evalAsync(function () {
          $scope.message.recipient = $scope.id_rs;
          $scope.ui.editRecipient  = true;
          $scope.accountChanged();
        });
      }
    );
  }

  var unregister = Gossip.addListener(
                      Gossip.IS_TYPING_TOPIC, 
                      $scope.id_rs, 
                      $rootScope.currentAccount.id_rs, 
  function (gossip) {
    $scope.$evalAsync(
      function () {
        $scope.ui.isTyping = true;
        $timeout(function () {
          $scope.ui.isTyping = false;
        }, 10*1000);
      }
    );
  });
  $scope.$on('$destroy', unregister);

  $scope.reload = function () {
    if ($scope.chatListProvider) {
      $scope.chatListProvider.reload();
    }
    if ($scope.chatMessagesProvider) {
      $scope.chatMessagesProvider.reload();
    }
  }

  $scope.messageChanged = function () {
    /* notifies that the user is typing a message */
    if (!$scope.gossipUI.isDisabled) {
      if (!typing_timeout) {
        typing_timeout = $timeout(function () { typing_timeout = null }, 15*1000, false);
        Gossip.sendGossip($scope.id_rs, "typing", Gossip.IS_TYPING_TOPIC);
      }
    }
    $scope.message.html = Emoji.emojifi($scope.message.text);
  }

  $scope.accountChanged = function () {
    $scope.$evalAsync(function () {
      $scope.message.recipientValid = false;
      $scope.message.recipientPublicKey = '';
      $scope.message.name = '';

      var id_rs = $scope.message.recipient;
      if (id_rs && id_rs.trim().length > 0) {
        var address = api.createAddress();
        if (address.set(id_rs)) {
          $scope.message.recipientValid = true;

          /* see if we can look up the name and public key */
          var arg = {account:id_rs, requestType:'getAccount'};
          api.engine.socket().callAPIFunction(arg).then(function (data) {
            if (data.publicKey || data.accountName) {
              $scope.$evalAsync(function () {
                if (data.publicKey) {
                  $scope.message.recipientPublicKey = data.publicKey;
                  publicKeyService.set(id_rs, data.publicKey);
                }
                $scope.message.name = data.accountName;
              });
            }
          });
        }
      }
    });
  }

  $scope.insertEmoji = function (name) {
    $scope.$evalAsync(function () {
      $scope.message.text += ':'+Emoji.toBase32(name)+':';
      $scope.message.html = Emoji.emojifi($scope.message.text);
    });
  }

  /* Handler for the New Message button. 
   * Based on message type (gossip or blockchain) this action has a different effect */ 
  $scope.newMessage = function () {
    $scope.ui.editRecipient = true;
    $scope.slide.offCanvas  = false;
    $scope.chatMessagesProvider = null;
  }

  /* Handler for the Send Message button. 
   * Based on message type (gossip or blockchain) this action has a different effect */ 
  $scope.sendDirectMessage = function () {
    if ($scope.ui.sendOffline) {
      plugins.get('transaction').get('sendMessage').execute($rootScope.currentAccount.id_rs, { 
        recipient: $scope.id_rs,
        message: $scope.message.text,
        autoSubmit: true,
      }).then(function (items) {
        $scope.$evalAsync(function () {
          if (items != null) {
            $scope.ui.emojiCollapse  = true;
            $scope.message.text = '';
            $scope.message.html = '';
            $scope.message.recipient = '';
            $scope.message.recipientPublicKey = '';
            $scope.message.send = true;
            $timeout(function () { $scope.message.send = false }, 5000);
          }
        });
      });
    }
    else {
      Gossip.message($scope.id_rs, $scope.message.text).then(
        function (data) {
          console.log(data);
          $scope.$evalAsync(function () {
            $scope.ui.emojiCollapse  = true;
            $scope.message.text = '';
            $scope.message.html = '';
            $scope.message.recipient = '';
            $scope.message.recipientPublicKey = '';
            $scope.message.send = true;
            $timeout(function () { $scope.message.send = false }, 5000);
          });
          // TODO - update the chat in GossipChatListProvider last timestamp!
          // $timeout(function () { $scope.chatListProvider.reload() }, 3000);
          $timeout.cancel(typing_timeout);
          typing_timeout = null;
        }
      );
    }
  };

  $scope.addContact = function (id_rs) {
    
    /* dont add duplicates */
    var provider = $scope.chatListProvider;
    for (var i=0; i<provider.entities.length; i++) {
      if (provider.entities[i].otherRS == id_rs) {
        $location.path('/messenger/'+id_rs);
        return;
      }
    }

    /* store the chat in the db - then go to its page */
    Gossip.getChatService().add(id_rs).then(
      function (chat) {
        $location.path('/messenger/'+id_rs);
      }
    );
  }

  $scope.removeContact = function (id_rs) {
    plugins.get('alerts').confirm({
      title: 'Remove contact',
      message: 'Do you want to remove this contact? Removal cannot be undone.'
    }).then(
      function (value) {
        if (value) {
          Gossip.removeContact(id_rs).then(
            function () {
              /* deleted the active account - navigate away */
              if ($scope.id_rs == id_rs) {
                $location.path('/messenger');
              }
            }
          );
        }
      }
    );
  }

  $scope.goOnlineAgain = function () {
    Gossip.setEnabled();
  }

  $scope.activateTextbox = function() {
    $rootScope.unread = false;
  }

  /* @param item is an entry from ChatMessagesProvider */
  $scope.removeMessage = function (item) {
    if (item.remover) {
      plugins.get('alerts').confirm({
        title: 'Remove message',
        message: 'Do you want to remove this message? Removal cannot be undone.'
      }).then(
        function (value) {
          if (value) {
            item.remover(item);
          }
        }
      );
    }
  }
});
})();