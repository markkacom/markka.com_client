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
  KeyService, $timeout, settings, publicKeyService, GossipChatListProvider, $interval, AccountAutocompleteProvider) {

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
    $rootScope.loginWizard('signin', {}, $location.url());
    $location.path('/start');
    return;
  }

  var api = nxt.get($rootScope.currentAccount.id_rs);
  if (!api) {
    $location.path('/start');
    return;
  }

  $scope.accountSearchProvider = new AccountAutocompleteProvider(api);
  $scope.feeCost = api.engine.feeCost + ' ' + api.engine.symbol;

  generateSpeechBubbleBootstrapCSS();
  settings.resolve('themes.default.theme', function () {
    $timeout(generateSpeechBubbleBootstrapCSS);
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
              /* make sure the public key of our contact was loaded from the network
                 if no public key could be found we should not create the GossipChatMessagesProvider
                 but wait until we receive it from a transaction */
              publicKeyService.get($scope.id_rs).then(
                /* we dont actually use the public key, it just has to be in the cache */
                function () {
                  /* create the messages provider */
                  $scope.chatMessagesProvider = new GossipChatMessagesProvider(api, $scope, 8, $rootScope.currentAccount.id_rs, $scope.id_rs);
                  $scope.chatMessagesProvider.reload().then(
                    function () {
                      $scope.$evalAsync(function () {
                        $scope.contactName = $scope.chatMessagesProvider.accountTwoName;
                      });
                    }
                  );
                }
              );
            });
            return;
          }
        }
        /* if it aint there - assume it's an account we want to add */
        $scope.$evalAsync(function () {
          $scope.message.recipient = '';
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
                if (!$scope.message.name) {
                  $scope.message.name = data.accountName;
                }
              });
            }
          });
          return;
        }
      }
      $scope.message.name = '';
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