"use strict";

var amplitude = require('amplitude-js');

var Store = require('./store');

var Amplitude = {
  init: function init(userInfo) {
    // console.log(key, userInfo);
    amplitude.getInstance().init(userInfo.amplitude_key, userInfo.id);
    var identify = new amplitude.Identify().set('firstname', userInfo.firstname).set('lastname', userInfo.lastname).set('account', userInfo.account.name).set('pureprofile_user', userInfo.email.substring(userInfo.email.lastIndexOf("@") + 1).toLowerCase() === "pureprofile.com");
    amplitude.getInstance().identify(identify);
  },
  logEvent: function logEvent(event, properties) {
    if (!properties) {
      properties = {};
    }

    properties.app = Store.getAppInfo().name;
    amplitude.getInstance().logEvent(event, properties);
  }
};
module.exports = Amplitude;