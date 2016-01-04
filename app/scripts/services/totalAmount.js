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
module.factory('totalAmount', function () {
  function totalAmount(t) {
    var type = t.type, subType = t.subType;
    switch (type) {
      case 0: /* TYPE_PAYMENT */
        switch (subtype) {
          case 0: /* SUBTYPE_PAYMENT_ORDINARY_PAYMENT */
          return { sender: neg(add(amountNQT(t),feeNQT(t))), recipient: amountNQT(t) };
          default: return null;
        }
      case 1: /* TYPE_MESSAGING */
        switch (subtype) {
          case 0: /* SUBTYPE_MESSAGING_ARBITRARY_MESSAGE */
          return { sender: neg(feeNQT(t)) };
          case 1: /* SUBTYPE_MESSAGING_ALIAS_ASSIGNMENT */
          return { sender: neg(feeNQT(t)) };
          case 2: /* SUBTYPE_MESSAGING_POLL_CREATION */
          return { sender: neg(feeNQT(t)) };
          case 3: /* SUBTYPE_MESSAGING_VOTE_CASTING */
          return { sender: neg(feeNQT(t)) };
          case 4: /* SUBTYPE_MESSAGING_HUB_ANNOUNCEMENT */
          return { sender: neg(feeNQT(t)) };
          case 5: /* SUBTYPE_MESSAGING_ACCOUNT_INFO */
          return { sender: neg(feeNQT(t)) };
          case 6: /* SUBTYPE_MESSAGING_ALIAS_SELL */
          return { sender: neg(feeNQT(t)) };
          case 7: /* SUBTYPE_MESSAGING_ALIAS_BUY */
          return { sender: add(neg(feeNQT(t),neg(priceNQT(t)))) };
          case 8: /* SUBTYPE_MESSAGING_ALIAS_DELETE */
          return { sender: neg(feeNQT(t)) };
          case 9: /* SUBTYPE_MESSAGING_PHASING_VOTE_CASTING */
          return { sender: neg(feeNQT(t)) };
          default: return null;
        }
      case 2: /* TYPE_COLORED_COINS */
        switch (subtype) {
          case 0: /* SUBTYPE_COLORED_COINS_ASSET_ISSUANCE */
          return { sender: neg(feeNQT(t)) };
          case 1: /* SUBTYPE_COLORED_COINS_ASSET_TRANSFER */
          return { sender: neg(feeNQT(t)) };
          case 2: /* SUBTYPE_COLORED_COINS_ASK_ORDER_PLACEMENT */
          return { sender: neg(feeNQT(t)) };
          case 3: /* SUBTYPE_COLORED_COINS_BID_ORDER_PLACEMENT */
          return { sender: add(neg(feeNQT(t), neg(multiply(quantityQNT(t),priceNQT(t))))) };
          case 4: /* SUBTYPE_COLORED_COINS_ASK_ORDER_CANCELLATION */
          return { sender: neg(feeNQT(t)) };
          case 5: /* SUBTYPE_COLORED_COINS_BID_ORDER_CANCELLATION */
          return { sender: add(neg(feeNQT(t), multiply(quantityQNT(t),priceNQT(t)))) };
          case 6: /* SUBTYPE_COLORED_COINS_DIVIDEND_PAYMENT */
          return { sender: neg(feeNQT(t)) }; /* TODO this is more complex - fix it */
          default: return null;
        }
      case 3: /* TYPE_DIGITAL_GOODS */
        switch (subtype) {
          case 0: /* SUBTYPE_DIGITAL_GOODS_LISTING */
          return { sender: neg(feeNQT(t)) };
          case 1: /* SUBTYPE_DIGITAL_GOODS_DELISTING */
          return { sender: neg(feeNQT(t)) };
          case 2: /* SUBTYPE_DIGITAL_GOODS_PRICE_CHANGE */
          return { sender: neg(feeNQT(t)) };
          case 3: /* SUBTYPE_DIGITAL_GOODS_QUANTITY_CHANGE */
          return { sender: neg(feeNQT(t)) };
          case 4: /* SUBTYPE_DIGITAL_GOODS_PURCHASE */
          return { sender: add(neg(feeNQT(t), neg(multiply(quantity(t),priceNQT(t))))) }
          case 5: /* SUBTYPE_DIGITAL_GOODS_DELIVERY */
          return { sender: neg(feeNQT(t)) };
          case 6: /* SUBTYPE_DIGITAL_GOODS_FEEDBACK */
          return { sender: neg(feeNQT(t)) };
          case 7: /* SUBTYPE_DIGITAL_GOODS_REFUND */
          return { sender: add(neg(feeNQT(t)),neg(refundNQT(t))) }; /* TODO should we include the recipient amountNQT ? */
          default: return null;
        }
      case 4: /* TYPE_ACCOUNT_CONTROL */
        switch (subtype) {
          case 0: /* SUBTYPE_ACCOUNT_CONTROL_EFFECTIVE_BALANCE_LEASING */
          return { sender: neg(feeNQT(t)) };
          default: return null;
        }
      case 5: /* TYPE_MONETARY_SYSTEM */
        switch (subtype) {
          case 0: /* SUBTYPE_MONETARY_SYSTEM_CURRENCY_ISSUANCE */
          return { sender: neg(feeNQT(t)) }; /* TODO fix me */
          case 1: /* SUBTYPE_MONETARY_SYSTEM_RESERVE_INCREASE */
          return { sender: neg(feeNQT(t)) }; /* TODO fix me */
          case 2: /* SUBTYPE_MONETARY_SYSTEM_RESERVE_CLAIM */
          return { sender: neg(feeNQT(t)) }; /* TODO fix me */
          case 3: /* SUBTYPE_MONETARY_SYSTEM_CURRENCY_TRANSFER */
          return { sender: neg(feeNQT(t)) }; /* TODO fix me */
          case 4: /* SUBTYPE_MONETARY_SYSTEM_PUBLISH_EXCHANGE_OFFER */
          return { sender: neg(feeNQT(t)) }; /* TODO fix me */
          case 5: /* SUBTYPE_MONETARY_SYSTEM_EXCHANGE_BUY */
          return { sender: neg(feeNQT(t)) }; /* TODO fix me */
          case 6: /* SUBTYPE_MONETARY_SYSTEM_EXCHANGE_SELL */
          return { sender: neg(feeNQT(t)) }; /* TODO fix me */
          case 7: /* SUBTYPE_MONETARY_SYSTEM_CURRENCY_MINTING */
          return { sender: neg(feeNQT(t)) }; /* TODO fix me */
          case 8: /* SUBTYPE_MONETARY_SYSTEM_CURRENCY_DELETION */
          return { sender: neg(feeNQT(t)) }; /* TODO fix me */
          default: return null;
        }
      case 6: /* TYPE_DATA */
        switch (subtype) {
          case 0: /* SUBTYPE_DATA_TAGGED_DATA_UPLOAD */
          return { sender: neg(feeNQT(t)) }; /* TODO fix me */
          case 1: /* SUBTYPE_DATA_TAGGED_DATA_EXTEND */
          return { sender: neg(feeNQT(t)) }; /* TODO fix me */
          default: return null;
        }
      default:
        return null;
    }
  }

  function add(a,b) {
    a = a instanceof BigInteger ? a : new BigInteger(a);
    b = b instanceof BigInteger ? b : new BigInteger(b);
    return a.add(b).toString();
  }

  function multiply(a,b) {
    a = a instanceof BigInteger ? a : new BigInteger(a);
    b = b instanceof BigInteger ? b : new BigInteger(b);
    return a.multiply(b).toString();
  }

  function neg(a) {
    a = a instanceof BigInteger ? a.toString() : a;
    return '-'+a;
  }

  function feeNQT(t) {
    return t.feeNQT;
  }

  function amountNQT(t) {
    return t.amountNQT;
  }

  function quantity(t) {
    return t.attachment.quantity;
  }

  function quantityQNT(t) {
    return t.attachment.quantityQNT;
  }

  function priceNQT() {
    return t.attachment.priceNQT;
  }

  function refundNQT(t) {
    return t.attachment.refundNQT;
  }

  return {
    calculate: function (transaction) {
      try {
        return totalAmount(transaction);
      }
      catch (e) {
        console.log('Exception in totalAmount.calculate');
        console.log('Affected transaction', transaction);
        console.log('Exception', e);
        return {};
      }
    }
  }
});
})();