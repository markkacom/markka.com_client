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
// ..
(function () {
'use strict';
var module = angular.module('fim.base');
module.run(function (plugins, modals, $q, $rootScope, nxt) {

  var plugin = plugins.get('transaction');

  /**
   * Sends a message to recipient where the sender of the message can be selected
   * from a menu or entered by hand.
   */
  plugin.add({
    label: 'Send Message',
    id: 'accountMessage',
    exclude: true,
    execute: function (args) {
      args = args||{};
      return plugin.create(angular.extend(args, {
        title: 'Send Message',
        message: 'Send an encrypted (private) message to recipient',
        requestType: 'sendMessage',
        hideMessage: true,
        editRecipient: true,
        recipient: args.recipient||'',
        canHaveRecipient: true,
        createArguments: function (items) {
          var _args = {
            recipient: nxt.util.convertRSAddress(items.recipient),
            sender: nxt.util.convertRSAddress(items.senderRS),
            txnMessageType: 'to_recipient',
            txnMessage: items.message
          };
          if (items.recipientPublicKey) {
            _args.recipientPublicKey = items.recipientPublicKey;
          }
          return _args;
        },
        fields: [{
          label: 'Recipient public key',
          name: 'recipientPublicKey',
          type: 'text',
          value: args.recipientPublicKey||'',
          required: false,
          show: 'show.showPublicKey'
        }, {
          label: 'Message',
          name: 'message',
          type: 'textarea',
          value: args.message||'',
          validate: function (text) {
            this.errorMsg = null;
            if (!text) { this.errorMsg = null; }
            else {
              if (plugin.getByteLen(text) > 1000) { this.errorMsg = 'To much characters'; }
            }
            return ! this.errorMsg;
          },
          required: true
        }]
      }));
    }
  });

  plugin.add({
    label: 'Send message from',
    id: 'sendMessage',
    exclude: $rootScope.TRADE_UI_ONLY,
    execute: function (senderRS, args) {
      args = args||{};
      return plugin.create(angular.extend(args, {
        title: 'Send message from',
        message: 'Send an encrypted (private) message to recipient',
        requestType: 'sendMessage',
        hideMessage: true,
        senderRS: senderRS,
        editRecipient: (args.editRecipient===false) ? false : true,
        recipient: args.recipient||'',
        canHaveRecipient: true,
        createArguments: function (items) {
          var _args = {
            recipient: nxt.util.convertRSAddress(items.recipient),
            sender: nxt.util.convertRSAddress(items.senderRS),
            txnMessageType: 'to_recipient',
            txnMessage: items.message
          }
          if (items.recipientPublicKey) {
            _args.recipientPublicKey = items.recipientPublicKey;
          }
          return _args;
        },
        fields: [{
          label: 'Recipient public key',
          name: 'recipientPublicKey',
          type: 'text',
          value: args.recipientPublicKey||'',
          required: false,
          show: 'show.showPublicKey'
        }, {
          label: 'Message',
          name: 'message',
          type: 'textarea',
          value: args.message||'',
          validate: function (text) {
            this.errorMsg = null;
            if (!text) { this.errorMsg = null; }
            else {
              if (plugin.getByteLen(text) > 1000) { this.errorMsg = 'To much characters'; }
            }
            return ! this.errorMsg;
          },
          required: true
        }]
      }));
    }
  });

  plugin.add({
    label: 'Write post',
    id: 'accountPost',
    execute: function (senderRS, args) {
      args = args||{};
      return plugin.create(angular.extend(args, {
        title: 'Write post',
        message: 'Posts can be read by anyone and are permanantly stored in the blockchain',
        requestType: 'sendMessage',
        senderRS: senderRS,
        hideMessage: true,
        createArguments: function (items) {
          return {
            recipient: nxt.util.convertRSAddress(items.senderRS),
            txnMessageType: 'public',
            txnMessage: 'post1:' + items.message
          }
        },
        fields: [{
          label: 'Post',
          name: 'message',
          type: 'textarea',
          value: args.message||'',
          validate: function (text) {
            this.errorMsg = null;
            if (!text) { this.errorMsg = null; }
            else {
              var _text = 'post1:' + text;
              if (plugin.getByteLen(_text) > 1000) { this.errorMsg = 'To much characters'; }
            }
            return ! this.errorMsg;
          },
          required: true
        }]
      }));
    }
  });

  plugin.add({
    label: 'Write post',
    id: 'assetPost',
    exclude: true,
    execute: function (senderRS, args) {
      args = args||{};
      return plugin.create(angular.extend(args, {
        title: 'Write post',
        message: 'Posts can be read by anyone and are permanantly stored in the blockchain',
        requestType: 'sendMessage',
        senderRS: senderRS,
        hideMessage: true,
        createArguments: function (items) {
          return {
            recipient: nxt.util.convertRSAddress(items.senderRS),
            txnMessageType: 'public',
            txnMessage: 'post2:' + args.asset + ':' + items.message
          }
        },
        fields: [{
          label: 'Post',
          name: 'message',
          type: 'textarea',
          value: args.message||'',
          validate: function (text) {
            this.errorMsg = null;
            if (!text) { this.errorMsg = null; }
            else {
              var _text = 'post2:' + args.asset + ':' + text;
              if (plugin.getByteLen(_text) > 1000) { this.errorMsg = 'To much characters'; }
            }
            return ! this.errorMsg;
          },
          required: true
        }]
      }));
    }
  });

  plugin.add({
    label: 'Write comment',
    id: 'writeComment',
    exclude: true,
    execute: function (args) {
      args = args||{};
      return plugin.create(angular.extend(args, {
        title: 'Write comment',
        message: 'Comments can be read by anyone and are permanantly stored in the blockchain',
        requestType: 'sendMessage',
        hideMessage: true,
        createArguments: function (items) {
          return {
            recipient: nxt.util.convertRSAddress(items.recipient),
            sender: nxt.util.convertRSAddress(items.senderRS),
            txnMessageType: 'public',
            txnMessage: 'comm' + args.post_transaction_id + ':' + items.message
          }
        },
        fields: [{
          label: 'Recipient',
          name: 'recipient',
          type: 'text',
          value: args.recipient||'',
          readonly: true
        }, {
          label: 'Comment',
          name: 'message',
          type: 'textarea',
          value: args.message||'',
          validate: function (text) {
            this.errorMsg = null;
            if (!text) { this.errorMsg = null; }
            else {
              var _text = 'comm' + args.post_transaction_id + ':' + text;
              if (plugin.getByteLen(_text) > 1000) { this.errorMsg = 'To much characters'; }
            }
            return ! this.errorMsg;
          },
          required: true
        }]
      }));
    }
  });

});
})();