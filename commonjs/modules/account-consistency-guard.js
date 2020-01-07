"use strict";

var ls = window.localStorage;
var accountKey = "____activeAccount____";
var ACG = {
  initialise: function initialise(tabAccount, validate, invalidate) {
    window.addEventListener('storage', function () {
      var newAccount = ls.getItem(accountKey);

      if (newAccount) {
        if (newAccount !== tabAccount) {
          invalidate();
        } else {
          validate();
        }
      }
    });
  },
  changeAccount: function changeAccount(newAccount) {
    ls.setItem(accountKey, newAccount);
  }
};
module.exports = ACG;