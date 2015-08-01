(function () {
'use strict';
var module = angular.module('fim.base');
module.run(function (nxt, timeagoService, $rootScope) {

  function convertNQT(amount, decimals) {
    if (typeof amount == 'undefined') {
      return '0';
    }
    var negative        = '',
        decimals        = decimals || 8,
        afterComma      = '',
        amount          = new BigInteger(String(amount)),
        factor          = String(Math.pow(10, decimals)),
        fractionalPart  = amount.mod(new BigInteger(factor)).toString();

    amount = amount.divide(new BigInteger(factor));
    if (amount.compareTo(BigInteger.ZERO) < 0) {
      amount = amount.abs();
      negative = '-';
    }
    if (fractionalPart && fractionalPart != "0") {
      afterComma = '.';
      for (var i=fractionalPart.length; i<decimals; i++) {
        afterComma += '0';
      }
      afterComma += fractionalPart.replace(/0+$/, "");
    }
    amount = amount.toString();
    return negative + amount + afterComma;
  }

  function convertToNQT(amountNXT) {
    if (typeof amountNXT == 'undefined') {
      return '0';
    }
    amountNXT   = String(amountNXT).replace(/,/g,'');
    var parts   = amountNXT.split(".");
    var amount  = parts[0];
    if (parts.length == 1) {
      var fraction = "00000000";
    } 
    else if (parts.length == 2) {
      if (parts[1].length <= 8) {
        var fraction = parts[1];
      } 
      else {
        var fraction = parts[1].substring(0, 8);
      }
    } 
    else {
      throw "Invalid input";
    }
    for (var i=fraction.length; i<8; i++) {
      fraction += "0";
    }
    var result = amount + "" + fraction;
    if (!/^\d+$/.test(result)) {
      throw "Invalid input.";
    }
    result = result.replace(/^0+/, "");
    if (result === "") {
      result = "0";
    }
    return result;
  }

  function convertToQNT(quantity, decimals) {
    if (typeof quantity == 'undefined') {
      return '0';
    }   
    quantity  = String(quantity);
    var parts = quantity.split(".");
    var qnt   = parts[0];
    if (parts.length == 1) {
      if (decimals) {
        for (var i = 0; i < decimals; i++) {
          qnt += "0";
        }
      }
    } 
    else if (parts.length == 2) {
      var fraction = parts[1];
      if (fraction.length > decimals) {
        throw "Fraction can only have " + decimals + " decimals max.";
      } 
      else if (fraction.length < decimals) {
        for (var i = fraction.length; i < decimals; i++) {
          fraction += "0";
        }
      }
      qnt += fraction;
    } 
    else {
      throw "Incorrect input";
    }
    //in case there's a comma or something else in there.. at this point there should only be numbers
    if (!/^\d+$/.test(qnt)) {
      throw "Invalid input. Only numbers and a dot are accepted.";
    }
    //remove leading zeroes
    return qnt.replace(/^0+/, "");
  }

  function convertToQNTf(quantity, decimals) {
    if (typeof quantity == 'undefined') {
      return '0';
    }     
    quantity = String(quantity);
    if (quantity.length < decimals) {
      for (var i = quantity.length; i < decimals; i++) {
        quantity = "0" + quantity;
      }
    }
    var afterComma = "";
    if (decimals) {
      afterComma = "." + quantity.substring(quantity.length - decimals);
      quantity = quantity.substring(0, quantity.length - decimals);
      if (!quantity) {
        quantity = "0";
      }
      afterComma = afterComma.replace(/0+$/, "");
      if (afterComma == ".") {
        afterComma = "";
      }
    }
    return quantity + afterComma;
  }

  function commaFormat(amount) {
    if (typeof amount == 'undefined') {
      return '0';
    }      
    var neg    = amount.indexOf('-') == 0 && (amount.shift());
    amount     = amount.split('.'); // input is result of convertNQT
    var parts  = amount[0].split("").reverse().join("").split(/(\d{3})/).reverse();
    var format = [];
    for(var i=0;i<parts.length;i++) { 
      if (parts[i]) {
        format.push(parts[i].split('').reverse().join(''));
      }
    }
    return (neg?'-':'')+format.join(',')+(amount.length==2?('.'+amount[1]):'');
  }

  function timestampToDate(timestamp) {
    var date = new Date(Date.UTC(2013, 10, 24, 12, 0, 0, 0) + timestamp * 1000);
    return date;
  }

  var ONE_HOUR_MS = 60 * 60 * 1000;

  /* EVerything older than 1 hour is considered old !! */  
  function timestampIsOld(timestamp) {
    var date = timestampToDate(timestamp);
    var now  = Date.now();
    return (now - date.getTime()) > ONE_HOUR_MS;
  }

  /**
   * Formats a timestamp in NXT epoch format to a Date string
   * @param timestamp Number
   * @returns String
   */
  var timeago_cache = {};
  var timeago_cache_count = 0;
  var date_cache = {};
  var date_cache_count = 0;

  /* timeago functionality functionality removed since it required jquery */

  function formatTimestamp(timestamp, use_timeago) {
    if (timestamp) {
      if (use_timeago) {
        if (timeago_cache[timestamp]) {
          return timeago_cache[timestamp];
        }
        if (timeago_cache_count++ > 1000) {
          timeago_cache_count = 0;
          timeago_cache = {};
        }
        var date = new Date(Date.UTC(2013, 10, 24, 12, 0, 0, 0) + timestamp * 1000);
        return timeago_cache[timestamp] = timeagoService.format(date);
      }
      else {
        if (date_cache[timestamp]) {
          return date_cache[timestamp];
        }
        var options = {
          second: "2-digit",
          minute: "2-digit",
          hour: "2-digit",
          day: "numeric",
          month: "numeric",
          year: "2-digit"
        };
        if (date_cache_count++ > 1000) {
          date_cache_count = 0;
          date_cache = {};
        }
        var date = new Date(Date.UTC(2013, 10, 24, 12, 0, 0, 0) + timestamp * 1000);
        return date_cache[timestamp] = date.toLocaleDateString("en-US", options);
      }
    }
    return '';
  }

  $rootScope.$on('$translateChangeSuccess', function () {
    timeago_cache = {};
    timeago_cache_count = 0;
    date_cache = {};
    date_cache_count = 0;
  });  

  /**
   * Converts an UTC timestamp to a NXT epoch timestamp.
   * @param timestamp Number
   * @returns String
   */
  function convertToEpochTimestamp(timestamp) {
    return Math.floor((timestamp - Date.UTC(2013, 10, 24, 12, 0, 0, 0)) / 1000);
  }

  /**
   * Formats an asset quantity
   * @param quantityQNT String
   * @param decimals Number
   * @returns String
   */
  // function formatQuantity(quantityQNT, decimals) {}

  /**
   * Used for ask and bid orders to calculate the price per whole quant
   * @param priceNQT String
   * @param decimals Number
   * @returns String
   */
  function formatOrderPricePerWholeQNT(priceNQT, decimals) {
    var price = new BigInteger(String(priceNQT));
    return commaFormat(price.multiply(new BigInteger("" + Math.pow(10, decimals))).toString());
  }

  /**
   * Used to calc the total amount of NQT involved in this order
   * @param priceNQT String
   * @param quantityQNT String
   * @returns String
   */
  function calculateOrderTotalNQT(priceNQT, quantityQNT) {
    quantityQNT = new BigInteger(String(quantityQNT));
    priceNQT = new BigInteger(String(priceNQT));
    var orderTotal = quantityQNT.multiply(priceNQT);
    return orderTotal.toString();
  }

  function calculateOrderPricePerWholeQNT(price, decimals) {
    if (typeof price != "object") {
      price = new BigInteger(String(price));
    }
    return nxt.util.convertToNXT(price.multiply(new BigInteger("" + Math.pow(10, decimals))));
  }  

  function calculatePricePerWholeQNT(price, decimals) {
    price = String(price);
    if (decimals) {
      var toRemove = price.slice(-decimals);

      if (!/^[0]+$/.test(toRemove)) {
        //return new Big(price).div(new Big(Math.pow(10, decimals))).round(8, 0);
        throw $.t("error_invalid_input");
      } 
      else {
        return price.slice(0, -decimals);
      }
    } else {
      return price;
    }
  }  

  function convertFromHex16(hex) {
    var j;
    var hexes = hex.match(/.{1,4}/g) || [];
    var back = "";
    for (j = 0; j < hexes.length; j++) {
      back += String.fromCharCode(parseInt(hexes[j], 16));
    }

    return back;
  }

  function convertFromHex8(hex) {
    var hex = hex.toString(); //force conversion
    var str = '';
    for (var i = 0; i < hex.length; i += 2)
      str += String.fromCharCode(parseInt(hex.substr(i, 2), 16));
    return str;
  }

  function convertRSAddress(text) {
    var api = null;
    if (text.indexOf('FIM-') == 0) { api = nxt.fim(); }
    else if (text.indexOf('NXT-') == 0) { api = nxt.nxt(); }
    if (api) {
      var address = api.createAddress();
      if (address.set(text)) {
        return address.account_id();
      }
    }
  }

  nxt.util = {
    
    convertToNXT: function (amountNQT) {
      return commaFormat(convertNQT(amountNQT, 8));
    },
    
    convertNQT: convertNQT,
    convertToNQT: convertToNQT,
    convertToQNTf: convertToQNTf,
    convertToQNT: convertToQNT,
    commaFormat: commaFormat,
    formatOrderPricePerWholeQNT: formatOrderPricePerWholeQNT,
    calculateOrderTotalNQT: calculateOrderTotalNQT,
    timestampToDate: timestampToDate,
    timestampIsOld: timestampIsOld,
    formatTimestamp: formatTimestamp,
    calculatePricePerWholeQNT: calculatePricePerWholeQNT,
    calculateOrderPricePerWholeQNT: calculateOrderPricePerWholeQNT,
    convertFromHex16:convertFromHex16,
    convertFromHex8:convertFromHex8,
    convertToEpochTimestamp: convertToEpochTimestamp,
    convertRSAddress: convertRSAddress,

    /**
     * @param nxtA String
     * @param nxtB String
     * @returns String
     * */
    safeAdd: function (nxtA, nxtB, format) {
      var a = new BigInteger(String(nxtA));
      var b = new BigInteger(String(nxtB));
      return a.add(b).toString();
    }
  };

});
})();