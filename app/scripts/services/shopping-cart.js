// (function () {
'use strict';
var module = angular.module('fim.base');
    module.service('shoppingCartService', function($http, $q) {
        return {
            add: function(item) {
                var shoppingCart = [];
                try { 
                    shoppingCart = JSON.parse(localStorage.shoppingCart); 
                } 
                catch(ex) { 
                    localStorage.shoppingCart = JSON.stringify([]);  
                } 
                shoppingCart.push(item); 
                localStorage.shoppingCart = JSON.stringify(shoppingCart);
            },

            get: function() {
                try {
                    var shoppingCart = JSON.parse(localStorage.shoppingCart); 
                    return shoppingCart;  
                }
                catch(ex) {
                    localStorage.shoppingCart = JSON.stringify([]);
                }
            },
            
            removeItem: function(index) {
                var shoppingCart = JSON.parse(localStorage.shoppingCart);
                shoppingCart.splice(index, 1);
                localStorage.shoppingCart = JSON.stringify(shoppingCart);   
            }

        }

    })

// })();