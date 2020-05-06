(function(){function r(e,n,t){function o(i,f){if(!n[i]){if(!e[i]){var c="function"==typeof require&&require;if(!f&&c)return c(i,!0);if(u)return u(i,!0);var a=new Error("Cannot find module '"+i+"'");throw a.code="MODULE_NOT_FOUND",a}var p=n[i]={exports:{}};e[i][0].call(p.exports,function(r){var n=e[i][1][r];return o(n||r)},p,p.exports,r,e,n,t)}return n[i].exports}for(var u="function"==typeof require&&require,i=0;i<t.length;i++)o(t[i]);return o}return r})()({1:[function(require,module,exports){
(function (global,Buffer){
(function (global, factory) {
  typeof exports === 'object' && typeof module !== 'undefined' ? module.exports = factory() :
  typeof define === 'function' && define.amd ? define('amplitude', factory) :
  (global = global || self, global.amplitude = factory());
}(this, function () { 'use strict';

  function _typeof(obj) {
    if (typeof Symbol === "function" && typeof Symbol.iterator === "symbol") {
      _typeof = function (obj) {
        return typeof obj;
      };
    } else {
      _typeof = function (obj) {
        return obj && typeof Symbol === "function" && obj.constructor === Symbol && obj !== Symbol.prototype ? "symbol" : typeof obj;
      };
    }

    return _typeof(obj);
  }

  function _classCallCheck(instance, Constructor) {
    if (!(instance instanceof Constructor)) {
      throw new TypeError("Cannot call a class as a function");
    }
  }

  function _defineProperties(target, props) {
    for (var i = 0; i < props.length; i++) {
      var descriptor = props[i];
      descriptor.enumerable = descriptor.enumerable || false;
      descriptor.configurable = true;
      if ("value" in descriptor) descriptor.writable = true;
      Object.defineProperty(target, descriptor.key, descriptor);
    }
  }

  function _createClass(Constructor, protoProps, staticProps) {
    if (protoProps) _defineProperties(Constructor.prototype, protoProps);
    if (staticProps) _defineProperties(Constructor, staticProps);
    return Constructor;
  }

  function _defineProperty(obj, key, value) {
    if (key in obj) {
      Object.defineProperty(obj, key, {
        value: value,
        enumerable: true,
        configurable: true,
        writable: true
      });
    } else {
      obj[key] = value;
    }

    return obj;
  }

  function _objectSpread(target) {
    for (var i = 1; i < arguments.length; i++) {
      var source = arguments[i] != null ? arguments[i] : {};
      var ownKeys = Object.keys(source);

      if (typeof Object.getOwnPropertySymbols === 'function') {
        ownKeys = ownKeys.concat(Object.getOwnPropertySymbols(source).filter(function (sym) {
          return Object.getOwnPropertyDescriptor(source, sym).enumerable;
        }));
      }

      ownKeys.forEach(function (key) {
        _defineProperty(target, key, source[key]);
      });
    }

    return target;
  }

  var Constants = {
    DEFAULT_INSTANCE: '$default_instance',
    API_VERSION: 2,
    MAX_STRING_LENGTH: 4096,
    MAX_PROPERTY_KEYS: 1000,
    IDENTIFY_EVENT: '$identify',
    GROUP_IDENTIFY_EVENT: '$groupidentify',
    // localStorageKeys
    LAST_EVENT_ID: 'amplitude_lastEventId',
    LAST_EVENT_TIME: 'amplitude_lastEventTime',
    LAST_IDENTIFY_ID: 'amplitude_lastIdentifyId',
    LAST_SEQUENCE_NUMBER: 'amplitude_lastSequenceNumber',
    SESSION_ID: 'amplitude_sessionId',
    // Used in cookie as well
    DEVICE_ID: 'amplitude_deviceId',
    OPT_OUT: 'amplitude_optOut',
    USER_ID: 'amplitude_userId',
    COOKIE_TEST: 'amplitude_cookie_test',
    COOKIE_PREFIX: "amp",
    // revenue keys
    REVENUE_EVENT: 'revenue_amount',
    REVENUE_PRODUCT_ID: '$productId',
    REVENUE_QUANTITY: '$quantity',
    REVENUE_PRICE: '$price',
    REVENUE_REVENUE_TYPE: '$revenueType',
    AMP_DEVICE_ID_PARAM: 'amp_device_id',
    // url param
    REFERRER: 'referrer',
    // UTM Params
    UTM_SOURCE: 'utm_source',
    UTM_MEDIUM: 'utm_medium',
    UTM_CAMPAIGN: 'utm_campaign',
    UTM_TERM: 'utm_term',
    UTM_CONTENT: 'utm_content'
  };

  /* jshint bitwise: false */

  /*
   * UTF-8 encoder/decoder
   * http://www.webtoolkit.info/
   */
  var UTF8 = {
    encode: function encode(s) {
      var utftext = '';

      for (var n = 0; n < s.length; n++) {
        var c = s.charCodeAt(n);

        if (c < 128) {
          utftext += String.fromCharCode(c);
        } else if (c > 127 && c < 2048) {
          utftext += String.fromCharCode(c >> 6 | 192);
          utftext += String.fromCharCode(c & 63 | 128);
        } else {
          utftext += String.fromCharCode(c >> 12 | 224);
          utftext += String.fromCharCode(c >> 6 & 63 | 128);
          utftext += String.fromCharCode(c & 63 | 128);
        }
      }

      return utftext;
    },
    decode: function decode(utftext) {
      var s = '';
      var i = 0;
      var c = 0,
          c1 = 0,
          c2 = 0;

      while (i < utftext.length) {
        c = utftext.charCodeAt(i);

        if (c < 128) {
          s += String.fromCharCode(c);
          i++;
        } else if (c > 191 && c < 224) {
          c1 = utftext.charCodeAt(i + 1);
          s += String.fromCharCode((c & 31) << 6 | c1 & 63);
          i += 2;
        } else {
          c1 = utftext.charCodeAt(i + 1);
          c2 = utftext.charCodeAt(i + 2);
          s += String.fromCharCode((c & 15) << 12 | (c1 & 63) << 6 | c2 & 63);
          i += 3;
        }
      }

      return s;
    }
  };

  /* jshint bitwise: false */
  /*
   * Base64 encoder/decoder
   * http://www.webtoolkit.info/
   */

  var Base64 = {
    _keyStr: 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/=',
    encode: function encode(input) {
      try {
        if (window.btoa && window.atob) {
          return window.btoa(unescape(encodeURIComponent(input)));
        }
      } catch (e) {//log(e);
      }

      return Base64._encode(input);
    },
    _encode: function _encode(input) {
      var output = '';
      var chr1, chr2, chr3, enc1, enc2, enc3, enc4;
      var i = 0;
      input = UTF8.encode(input);

      while (i < input.length) {
        chr1 = input.charCodeAt(i++);
        chr2 = input.charCodeAt(i++);
        chr3 = input.charCodeAt(i++);
        enc1 = chr1 >> 2;
        enc2 = (chr1 & 3) << 4 | chr2 >> 4;
        enc3 = (chr2 & 15) << 2 | chr3 >> 6;
        enc4 = chr3 & 63;

        if (isNaN(chr2)) {
          enc3 = enc4 = 64;
        } else if (isNaN(chr3)) {
          enc4 = 64;
        }

        output = output + Base64._keyStr.charAt(enc1) + Base64._keyStr.charAt(enc2) + Base64._keyStr.charAt(enc3) + Base64._keyStr.charAt(enc4);
      }

      return output;
    },
    decode: function decode(input) {
      try {
        if (window.btoa && window.atob) {
          return decodeURIComponent(escape(window.atob(input)));
        }
      } catch (e) {//log(e);
      }

      return Base64._decode(input);
    },
    _decode: function _decode(input) {
      var output = '';
      var chr1, chr2, chr3;
      var enc1, enc2, enc3, enc4;
      var i = 0;
      input = input.replace(/[^A-Za-z0-9\+\/\=]/g, '');

      while (i < input.length) {
        enc1 = Base64._keyStr.indexOf(input.charAt(i++));
        enc2 = Base64._keyStr.indexOf(input.charAt(i++));
        enc3 = Base64._keyStr.indexOf(input.charAt(i++));
        enc4 = Base64._keyStr.indexOf(input.charAt(i++));
        chr1 = enc1 << 2 | enc2 >> 4;
        chr2 = (enc2 & 15) << 4 | enc3 >> 2;
        chr3 = (enc3 & 3) << 6 | enc4;
        output = output + String.fromCharCode(chr1);

        if (enc3 !== 64) {
          output = output + String.fromCharCode(chr2);
        }

        if (enc4 !== 64) {
          output = output + String.fromCharCode(chr3);
        }
      }

      output = UTF8.decode(output);
      return output;
    }
  };

  /**
   * toString ref.
   * @private
   */
  var toString = Object.prototype.toString;
  /**
   * Return the type of `val`.
   * @private
   * @param {Mixed} val
   * @return {String}
   * @api public
   */

  function type (val) {
    switch (toString.call(val)) {
      case '[object Date]':
        return 'date';

      case '[object RegExp]':
        return 'regexp';

      case '[object Arguments]':
        return 'arguments';

      case '[object Array]':
        return 'array';

      case '[object Error]':
        return 'error';
    }

    if (val === null) {
      return 'null';
    }

    if (val === undefined) {
      return 'undefined';
    }

    if (val !== val) {
      return 'nan';
    }

    if (val && val.nodeType === 1) {
      return 'element';
    }

    if (typeof Buffer !== 'undefined' && typeof Buffer.isBuffer === 'function' && Buffer.isBuffer(val)) {
      return 'buffer';
    }

    val = val.valueOf ? val.valueOf() : Object.prototype.valueOf.apply(val);
    return _typeof(val);
  }

  var logLevels = {
    DISABLE: 0,
    ERROR: 1,
    WARN: 2,
    INFO: 3
  };
  var logLevel = logLevels.WARN;

  var setLogLevel = function setLogLevel(logLevelName) {
    if (logLevels.hasOwnProperty(logLevelName)) {
      logLevel = logLevels[logLevelName];
    }
  };

  var getLogLevel = function getLogLevel() {
    return logLevel;
  };

  var log = {
    error: function error(s) {
      if (logLevel >= logLevels.ERROR) {
        _log(s);
      }
    },
    warn: function warn(s) {
      if (logLevel >= logLevels.WARN) {
        _log(s);
      }
    },
    info: function info(s) {
      if (logLevel >= logLevels.INFO) {
        _log(s);
      }
    }
  };

  var _log = function _log(s) {
    try {
      console.log('[Amplitude] ' + s);
    } catch (e) {// console logging not available
    }
  };

  var isEmptyString = function isEmptyString(str) {
    return !str || str.length === 0;
  };

  var sessionStorageEnabled = function sessionStorageEnabled() {
    try {
      if (window.sessionStorage) {
        return true;
      }
    } catch (e) {} // sessionStorage disabled


    return false;
  }; // truncate string values in event and user properties so that request size does not get too large


  var truncate = function truncate(value) {
    if (type(value) === 'array') {
      for (var i = 0; i < value.length; i++) {
        value[i] = truncate(value[i]);
      }
    } else if (type(value) === 'object') {
      for (var key in value) {
        if (value.hasOwnProperty(key)) {
          value[key] = truncate(value[key]);
        }
      }
    } else {
      value = _truncateValue(value);
    }

    return value;
  };

  var _truncateValue = function _truncateValue(value) {
    if (type(value) === 'string') {
      return value.length > Constants.MAX_STRING_LENGTH ? value.substring(0, Constants.MAX_STRING_LENGTH) : value;
    }

    return value;
  };

  var validateInput = function validateInput(input, name, expectedType) {
    if (type(input) !== expectedType) {
      log.error('Invalid ' + name + ' input type. Expected ' + expectedType + ' but received ' + type(input));
      return false;
    }

    return true;
  }; // do some basic sanitization and type checking, also catch property dicts with more than 1000 key/value pairs


  var validateProperties = function validateProperties(properties) {
    var propsType = type(properties);

    if (propsType !== 'object') {
      log.error('Error: invalid properties format. Expecting Javascript object, received ' + propsType + ', ignoring');
      return {};
    }

    if (Object.keys(properties).length > Constants.MAX_PROPERTY_KEYS) {
      log.error('Error: too many properties (more than 1000), ignoring');
      return {};
    }

    var copy = {}; // create a copy with all of the valid properties

    for (var property in properties) {
      if (!properties.hasOwnProperty(property)) {
        continue;
      } // validate key


      var key = property;
      var keyType = type(key);

      if (keyType !== 'string') {
        key = String(key);
        log.warn('WARNING: Non-string property key, received type ' + keyType + ', coercing to string "' + key + '"');
      } // validate value


      var value = validatePropertyValue(key, properties[property]);

      if (value === null) {
        continue;
      }

      copy[key] = value;
    }

    return copy;
  };

  var invalidValueTypes = ['nan', 'function', 'arguments', 'regexp', 'element'];

  var validatePropertyValue = function validatePropertyValue(key, value) {
    var valueType = type(value);

    if (invalidValueTypes.indexOf(valueType) !== -1) {
      log.warn('WARNING: Property key "' + key + '" with invalid value type ' + valueType + ', ignoring');
      value = null;
    } else if (valueType === 'undefined') {
      value = null;
    } else if (valueType === 'error') {
      value = String(value);
      log.warn('WARNING: Property key "' + key + '" with value type error, coercing to ' + value);
    } else if (valueType === 'array') {
      // check for nested arrays or objects
      var arrayCopy = [];

      for (var i = 0; i < value.length; i++) {
        var element = value[i];
        var elemType = type(element);

        if (elemType === 'array') {
          log.warn('WARNING: Cannot have ' + elemType + ' nested in an array property value, skipping');
          continue;
        } else if (elemType === 'object') {
          arrayCopy.push(validateProperties(element));
        } else {
          arrayCopy.push(validatePropertyValue(key, element));
        }
      }

      value = arrayCopy;
    } else if (valueType === 'object') {
      value = validateProperties(value);
    }

    return value;
  };

  var validateGroups = function validateGroups(groups) {
    var groupsType = type(groups);

    if (groupsType !== 'object') {
      log.error('Error: invalid groups format. Expecting Javascript object, received ' + groupsType + ', ignoring');
      return {};
    }

    var copy = {}; // create a copy with all of the valid properties

    for (var group in groups) {
      if (!groups.hasOwnProperty(group)) {
        continue;
      } // validate key


      var key = group;
      var keyType = type(key);

      if (keyType !== 'string') {
        key = String(key);
        log.warn('WARNING: Non-string groupType, received type ' + keyType + ', coercing to string "' + key + '"');
      } // validate value


      var value = validateGroupName(key, groups[group]);

      if (value === null) {
        continue;
      }

      copy[key] = value;
    }

    return copy;
  };

  var validateGroupName = function validateGroupName(key, groupName) {
    var groupNameType = type(groupName);

    if (groupNameType === 'string') {
      return groupName;
    }

    if (groupNameType === 'date' || groupNameType === 'number' || groupNameType === 'boolean') {
      groupName = String(groupName);
      log.warn('WARNING: Non-string groupName, received type ' + groupNameType + ', coercing to string "' + groupName + '"');
      return groupName;
    }

    if (groupNameType === 'array') {
      // check for nested arrays or objects
      var arrayCopy = [];

      for (var i = 0; i < groupName.length; i++) {
        var element = groupName[i];
        var elemType = type(element);

        if (elemType === 'array' || elemType === 'object') {
          log.warn('WARNING: Skipping nested ' + elemType + ' in array groupName');
          continue;
        } else if (elemType === 'string') {
          arrayCopy.push(element);
        } else if (elemType === 'date' || elemType === 'number' || elemType === 'boolean') {
          element = String(element);
          log.warn('WARNING: Non-string groupName, received type ' + elemType + ', coercing to string "' + element + '"');
          arrayCopy.push(element);
        }
      }

      return arrayCopy;
    }

    log.warn('WARNING: Non-string groupName, received type ' + groupNameType + '. Please use strings or array of strings for groupName');
  }; // parses the value of a url param (for example ?gclid=1234&...)


  var getQueryParam = function getQueryParam(name, query) {
    name = name.replace(/[\[]/, "\\[").replace(/[\]]/, "\\]");
    var regex = new RegExp("[\\?&]" + name + "=([^&#]*)");
    var results = regex.exec(query);
    return results === null ? undefined : decodeURIComponent(results[1].replace(/\+/g, " "));
  };

  var utils = {
    setLogLevel: setLogLevel,
    getLogLevel: getLogLevel,
    logLevels: logLevels,
    log: log,
    isEmptyString: isEmptyString,
    getQueryParam: getQueryParam,
    sessionStorageEnabled: sessionStorageEnabled,
    truncate: truncate,
    validateGroups: validateGroups,
    validateInput: validateInput,
    validateProperties: validateProperties
  };

  var getLocation = function getLocation() {
    return window.location;
  };

  var get = function get(name) {
    try {
      var ca = document.cookie.split(';');
      var value = null;

      for (var i = 0; i < ca.length; i++) {
        var c = ca[i];

        while (c.charAt(0) === ' ') {
          c = c.substring(1, c.length);
        }

        if (c.indexOf(name) === 0) {
          value = c.substring(name.length, c.length);
          break;
        }
      }

      return value;
    } catch (e) {
      return null;
    }
  };

  var set = function set(name, value, opts) {
    var expires = value !== null ? opts.expirationDays : -1;

    if (expires) {
      var date = new Date();
      date.setTime(date.getTime() + expires * 24 * 60 * 60 * 1000);
      expires = date;
    }

    var str = name + '=' + value;

    if (expires) {
      str += '; expires=' + expires.toUTCString();
    }

    str += '; path=/';

    if (opts.domain) {
      str += '; domain=' + opts.domain;
    }

    if (opts.secure) {
      str += '; Secure';
    }

    if (opts.sameSite) {
      str += '; SameSite=' + opts.sameSite;
    }

    document.cookie = str;
  }; // test that cookies are enabled - navigator.cookiesEnabled yields false positives in IE, need to test directly


  var areCookiesEnabled = function areCookiesEnabled() {
    var uid = String(new Date());

    try {
      set(Constants.COOKIE_TEST, uid, {});

      var _areCookiesEnabled = get(Constants.COOKIE_TEST + '=') === uid;

      set(Constants.COOKIE_TEST, null, {});
      return _areCookiesEnabled;
    } catch (e) {}

    return false;
  };

  var baseCookie = {
    set: set,
    get: get,
    areCookiesEnabled: areCookiesEnabled
  };

  var getHost = function getHost(url) {
    var a = document.createElement('a');
    a.href = url;
    return a.hostname || location.hostname;
  };

  var topDomain = function topDomain(url) {
    var host = getHost(url);
    var parts = host.split('.');
    var levels = [];

    for (var i = parts.length - 2; i >= 0; --i) {
      levels.push(parts.slice(i).join('.'));
    }

    for (var _i = 0; _i < levels.length; ++_i) {
      var cname = '__tld_test__';
      var domain = levels[_i];
      var opts = {
        domain: '.' + domain
      };
      baseCookie.set(cname, 1, opts);

      if (baseCookie.get(cname)) {
        baseCookie.set(cname, null, opts);
        return domain;
      }
    }

    return '';
  };

  /*
   * Cookie data
   */
  var _options = {
    expirationDays: undefined,
    domain: undefined
  };

  var reset = function reset() {
    _options = {
      expirationDays: undefined,
      domain: undefined
    };
  };

  var options = function options(opts) {
    if (arguments.length === 0) {
      return _options;
    }

    opts = opts || {};
    _options.expirationDays = opts.expirationDays;
    _options.secure = opts.secure;
    _options.sameSite = opts.sameSite;
    var domain = !utils.isEmptyString(opts.domain) ? opts.domain : '.' + topDomain(getLocation().href);
    var token = Math.random();
    _options.domain = domain;
    set$1('amplitude_test', token);
    var stored = get$1('amplitude_test');

    if (!stored || stored !== token) {
      domain = null;
    }

    remove('amplitude_test');
    _options.domain = domain;
    return _options;
  };

  var _domainSpecific = function _domainSpecific(name) {
    // differentiate between cookies on different domains
    var suffix = '';

    if (_options.domain) {
      suffix = _options.domain.charAt(0) === '.' ? _options.domain.substring(1) : _options.domain;
    }

    return name + suffix;
  };

  var get$1 = function get(name) {
    var nameEq = _domainSpecific(name) + '=';
    var value = baseCookie.get(nameEq);

    try {
      if (value) {
        return JSON.parse(Base64.decode(value));
      }
    } catch (e) {
      return null;
    }

    return null;
  };

  var set$1 = function set(name, value) {
    try {
      baseCookie.set(_domainSpecific(name), Base64.encode(JSON.stringify(value)), _options);
      return true;
    } catch (e) {
      return false;
    }
  };

  var setRaw = function setRaw(name, value) {
    try {
      baseCookie.set(_domainSpecific(name), value, _options);
      return true;
    } catch (e) {
      return false;
    }
  };

  var getRaw = function getRaw(name) {
    var nameEq = _domainSpecific(name) + '=';
    return baseCookie.get(nameEq);
  };

  var remove = function remove(name) {
    try {
      baseCookie.set(_domainSpecific(name), null, _options);
      return true;
    } catch (e) {
      return false;
    }
  };

  var Cookie = {
    reset: reset,
    options: options,
    get: get$1,
    set: set$1,
    remove: remove,
    setRaw: setRaw,
    getRaw: getRaw
  };

  /* jshint -W020, unused: false, noempty: false, boss: true */

  /*
   * Implement localStorage to support Firefox 2-3 and IE 5-7
   */
  var localStorage; // jshint ignore:line

  {
    // test that Window.localStorage is available and works
    var windowLocalStorageAvailable = function windowLocalStorageAvailable() {
      var uid = new Date();
      var result;

      try {
        window.localStorage.setItem(uid, uid);
        result = window.localStorage.getItem(uid) === String(uid);
        window.localStorage.removeItem(uid);
        return result;
      } catch (e) {// localStorage not available
      }

      return false;
    };

    if (windowLocalStorageAvailable()) {
      localStorage = window.localStorage;
    } else if (window.globalStorage) {
      // Firefox 2-3 use globalStorage
      // See https://developer.mozilla.org/en/dom/storage#globalStorage
      try {
        localStorage = window.globalStorage[window.location.hostname];
      } catch (e) {// Something bad happened...
      }
    } else if (typeof document !== 'undefined') {
      // IE 5-7 use userData
      // See http://msdn.microsoft.com/en-us/library/ms531424(v=vs.85).aspx
      var div = document.createElement('div'),
          attrKey = 'localStorage';
      div.style.display = 'none';
      document.getElementsByTagName('head')[0].appendChild(div);

      if (div.addBehavior) {
        div.addBehavior('#default#userdata');
        localStorage = {
          length: 0,
          setItem: function setItem(k, v) {
            div.load(attrKey);

            if (!div.getAttribute(k)) {
              this.length++;
            }

            div.setAttribute(k, v);
            div.save(attrKey);
          },
          getItem: function getItem(k) {
            div.load(attrKey);
            return div.getAttribute(k);
          },
          removeItem: function removeItem(k) {
            div.load(attrKey);

            if (div.getAttribute(k)) {
              this.length--;
            }

            div.removeAttribute(k);
            div.save(attrKey);
          },
          clear: function clear() {
            div.load(attrKey);
            var i = 0;
            var attr;

            while (attr = div.XMLDocument.documentElement.attributes[i++]) {
              div.removeAttribute(attr.name);
            }

            div.save(attrKey);
            this.length = 0;
          },
          key: function key(k) {
            div.load(attrKey);
            return div.XMLDocument.documentElement.attributes[k];
          }
        };
        div.load(attrKey);
        localStorage.length = div.XMLDocument.documentElement.attributes.length;
      }
    }

    if (!localStorage) {
      localStorage = {
        length: 0,
        setItem: function setItem(k, v) {},
        getItem: function getItem(k) {},
        removeItem: function removeItem(k) {},
        clear: function clear() {},
        key: function key(k) {}
      };
    }
  }

  var localStorage$1 = localStorage;

  /* jshint -W020, unused: false, noempty: false, boss: true */

  var cookieStorage = function cookieStorage() {
    this.storage = null;
  }; // test that cookies are enabled - navigator.cookiesEnabled yields false positives in IE, need to test directly


  cookieStorage.prototype._cookiesEnabled = function () {
    var uid = String(new Date());
    var result;

    try {
      Cookie.set(Constants.COOKIE_TEST, uid);
      result = Cookie.get(Constants.COOKIE_TEST) === uid;
      Cookie.remove(Constants.COOKIE_TEST);
      return result;
    } catch (e) {// cookies are not enabled
    }

    return false;
  };

  cookieStorage.prototype.getStorage = function () {
    if (this.storage !== null) {
      return this.storage;
    }

    if (this._cookiesEnabled()) {
      this.storage = Cookie;
    } else {
      // if cookies disabled, fallback to localstorage
      // note: localstorage does not persist across subdomains
      var keyPrefix = 'amp_cookiestore_';
      this.storage = {
        _options: {
          expirationDays: undefined,
          domain: undefined,
          secure: false
        },
        reset: function reset() {
          this._options = {
            expirationDays: undefined,
            domain: undefined,
            secure: false
          };
        },
        options: function options(opts) {
          if (arguments.length === 0) {
            return this._options;
          }

          opts = opts || {};
          this._options.expirationDays = opts.expirationDays || this._options.expirationDays; // localStorage is specific to subdomains

          this._options.domain = opts.domain || this._options.domain || window && window.location && window.location.hostname;
          return this._options.secure = opts.secure || false;
        },
        get: function get(name) {
          try {
            return JSON.parse(localStorage$1.getItem(keyPrefix + name));
          } catch (e) {}

          return null;
        },
        set: function set(name, value) {
          try {
            localStorage$1.setItem(keyPrefix + name, JSON.stringify(value));
            return true;
          } catch (e) {}

          return false;
        },
        remove: function remove(name) {
          try {
            localStorage$1.removeItem(keyPrefix + name);
          } catch (e) {
            return false;
          }
        }
      };
    }

    return this.storage;
  };

  var MetadataStorage =
  /*#__PURE__*/
  function () {
    function MetadataStorage(_ref) {
      var storageKey = _ref.storageKey,
          disableCookies = _ref.disableCookies,
          domain = _ref.domain,
          secure = _ref.secure,
          sameSite = _ref.sameSite,
          expirationDays = _ref.expirationDays;

      _classCallCheck(this, MetadataStorage);

      this.storageKey = storageKey;
      this.disableCookieStorage = !baseCookie.areCookiesEnabled() || disableCookies;
      this.domain = domain;
      this.secure = secure;
      this.sameSite = sameSite;
      this.expirationDays = expirationDays;
      this.cookieDomain = '';

      {
        var writableTopDomain = topDomain(getLocation().href);
        this.cookieDomain = domain || (writableTopDomain ? '.' + writableTopDomain : null);
      }
    }

    _createClass(MetadataStorage, [{
      key: "getCookieStorageKey",
      value: function getCookieStorageKey() {
        if (!this.domain) {
          return this.storageKey;
        }

        var suffix = this.domain.charAt(0) === '.' ? this.domain.substring(1) : this.domain;
        return "".concat(this.storageKey).concat(suffix ? "_".concat(suffix) : '');
      }
    }, {
      key: "save",
      value: function save(_ref2) {
        var deviceId = _ref2.deviceId,
            userId = _ref2.userId,
            optOut = _ref2.optOut,
            sessionId = _ref2.sessionId,
            lastEventTime = _ref2.lastEventTime,
            eventId = _ref2.eventId,
            identifyId = _ref2.identifyId,
            sequenceNumber = _ref2.sequenceNumber;
        // do not change the order of these items
        var value = [deviceId, Base64.encode(userId || ''), optOut ? '1' : '', sessionId ? sessionId.toString(32) : '0', lastEventTime ? lastEventTime.toString(32) : '0', eventId ? eventId.toString(32) : '0', identifyId ? identifyId.toString(32) : '0', sequenceNumber ? sequenceNumber.toString(32) : '0'].join('.');

        if (this.disableCookieStorage) {
          localStorage$1.setItem(this.storageKey, value);
        } else {
          baseCookie.set(this.getCookieStorageKey(), value, {
            domain: this.cookieDomain,
            secure: this.secure,
            sameSite: this.sameSite,
            expirationDays: this.expirationDays
          });
        }
      }
    }, {
      key: "load",
      value: function load() {
        var str;

        if (!this.disableCookieStorage) {
          str = baseCookie.get(this.getCookieStorageKey() + '=');
        }

        if (!str) {
          str = localStorage$1.getItem(this.storageKey);
        }

        if (!str) {
          return null;
        }

        var values = str.split('.');
        var userId = null;

        if (values[1]) {
          try {
            userId = Base64.decode(values[1]);
          } catch (e) {
            userId = null;
          }
        }

        return {
          deviceId: values[0],
          userId: userId,
          optOut: values[2] === '1',
          sessionId: parseInt(values[3], 32),
          lastEventTime: parseInt(values[4], 32),
          eventId: parseInt(values[5], 32),
          identifyId: parseInt(values[6], 32),
          sequenceNumber: parseInt(values[7], 32)
        };
      }
    }]);

    return MetadataStorage;
  }();

  var getUtmData = function getUtmData(rawCookie, query) {
    // Translate the utmz cookie format into url query string format.
    var cookie = rawCookie ? '?' + rawCookie.split('.').slice(-1)[0].replace(/\|/g, '&') : '';

    var fetchParam = function fetchParam(queryName, query, cookieName, cookie) {
      return utils.getQueryParam(queryName, query) || utils.getQueryParam(cookieName, cookie);
    };

    var utmSource = fetchParam(Constants.UTM_SOURCE, query, 'utmcsr', cookie);
    var utmMedium = fetchParam(Constants.UTM_MEDIUM, query, 'utmcmd', cookie);
    var utmCampaign = fetchParam(Constants.UTM_CAMPAIGN, query, 'utmccn', cookie);
    var utmTerm = fetchParam(Constants.UTM_TERM, query, 'utmctr', cookie);
    var utmContent = fetchParam(Constants.UTM_CONTENT, query, 'utmcct', cookie);
    var utmData = {};

    var addIfNotNull = function addIfNotNull(key, value) {
      if (!utils.isEmptyString(value)) {
        utmData[key] = value;
      }
    };

    addIfNotNull(Constants.UTM_SOURCE, utmSource);
    addIfNotNull(Constants.UTM_MEDIUM, utmMedium);
    addIfNotNull(Constants.UTM_CAMPAIGN, utmCampaign);
    addIfNotNull(Constants.UTM_TERM, utmTerm);
    addIfNotNull(Constants.UTM_CONTENT, utmContent);
    return utmData;
  };

  /*
   * Wrapper for a user properties JSON object that supports operations.
   * Note: if a user property is used in multiple operations on the same Identify object,
   * only the first operation will be saved, and the rest will be ignored.
   */

  var AMP_OP_ADD = '$add';
  var AMP_OP_APPEND = '$append';
  var AMP_OP_CLEAR_ALL = '$clearAll';
  var AMP_OP_PREPEND = '$prepend';
  var AMP_OP_SET = '$set';
  var AMP_OP_SET_ONCE = '$setOnce';
  var AMP_OP_UNSET = '$unset';
  /**
   * Identify API - instance constructor. Identify objects are a wrapper for user property operations.
   * Each method adds a user property operation to the Identify object, and returns the same Identify object,
   * allowing you to chain multiple method calls together.
   * Note: if the same user property is used in multiple operations on a single Identify object,
   * only the first operation on that property will be saved, and the rest will be ignored.
   * See [Readme]{@link https://github.com/amplitude/Amplitude-Javascript#user-properties-and-user-property-operations}
   * for more information on the Identify API and user property operations.
   * @constructor Identify
   * @public
   * @example var identify = new amplitude.Identify();
   */

  var Identify = function Identify() {
    this.userPropertiesOperations = {};
    this.properties = []; // keep track of keys that have been added
  };
  /**
   * Increment a user property by a given value (can also be negative to decrement).
   * If the user property does not have a value set yet, it will be initialized to 0 before being incremented.
   * @public
   * @param {string} property - The user property key.
   * @param {number|string} value - The amount by which to increment the user property. Allows numbers as strings (ex: '123').
   * @return {Identify} Returns the same Identify object, allowing you to chain multiple method calls together.
   * @example var identify = new amplitude.Identify().add('karma', 1).add('friends', 1);
   * amplitude.identify(identify); // send the Identify call
   */


  Identify.prototype.add = function (property, value) {
    if (type(value) === 'number' || type(value) === 'string') {
      this._addOperation(AMP_OP_ADD, property, value);
    } else {
      utils.log.error('Unsupported type for value: ' + type(value) + ', expecting number or string');
    }

    return this;
  };
  /**
   * Append a value or values to a user property.
   * If the user property does not have a value set yet,
   * it will be initialized to an empty list before the new values are appended.
   * If the user property has an existing value and it is not a list,
   * the existing value will be converted into a list with the new values appended.
   * @public
   * @param {string} property - The user property key.
   * @param {number|string|list|object} value - A value or values to append.
   * Values can be numbers, strings, lists, or object (key:value dict will be flattened).
   * @return {Identify} Returns the same Identify object, allowing you to chain multiple method calls together.
   * @example var identify = new amplitude.Identify().append('ab-tests', 'new-user-tests');
   * identify.append('some_list', [1, 2, 3, 4, 'values']);
   * amplitude.identify(identify); // send the Identify call
   */


  Identify.prototype.append = function (property, value) {
    this._addOperation(AMP_OP_APPEND, property, value);

    return this;
  };
  /**
   * Clear all user properties for the current user.
   * SDK user should instead call amplitude.clearUserProperties() instead of using this.
   * $clearAll needs to be sent on its own Identify object. If there are already other operations, then don't add $clearAll.
   * If $clearAll already in an Identify object, don't allow other operations to be added.
   * @private
   */


  Identify.prototype.clearAll = function () {
    if (Object.keys(this.userPropertiesOperations).length > 0) {
      if (!this.userPropertiesOperations.hasOwnProperty(AMP_OP_CLEAR_ALL)) {
        utils.log.error('Need to send $clearAll on its own Identify object without any other operations, skipping $clearAll');
      }

      return this;
    }

    this.userPropertiesOperations[AMP_OP_CLEAR_ALL] = '-';
    return this;
  };
  /**
   * Prepend a value or values to a user property.
   * Prepend means inserting the value or values at the front of a list.
   * If the user property does not have a value set yet,
   * it will be initialized to an empty list before the new values are prepended.
   * If the user property has an existing value and it is not a list,
   * the existing value will be converted into a list with the new values prepended.
   * @public
   * @param {string} property - The user property key.
   * @param {number|string|list|object} value - A value or values to prepend.
   * Values can be numbers, strings, lists, or object (key:value dict will be flattened).
   * @return {Identify} Returns the same Identify object, allowing you to chain multiple method calls together.
   * @example var identify = new amplitude.Identify().prepend('ab-tests', 'new-user-tests');
   * identify.prepend('some_list', [1, 2, 3, 4, 'values']);
   * amplitude.identify(identify); // send the Identify call
   */


  Identify.prototype.prepend = function (property, value) {
    this._addOperation(AMP_OP_PREPEND, property, value);

    return this;
  };
  /**
   * Sets the value of a given user property. If a value already exists, it will be overwriten with the new value.
   * @public
   * @param {string} property - The user property key.
   * @param {number|string|list|boolean|object} value - A value or values to set.
   * Values can be numbers, strings, lists, or object (key:value dict will be flattened).
   * @return {Identify} Returns the same Identify object, allowing you to chain multiple method calls together.
   * @example var identify = new amplitude.Identify().set('user_type', 'beta');
   * identify.set('name', {'first': 'John', 'last': 'Doe'}); // dict is flattened and becomes name.first: John, name.last: Doe
   * amplitude.identify(identify); // send the Identify call
   */


  Identify.prototype.set = function (property, value) {
    this._addOperation(AMP_OP_SET, property, value);

    return this;
  };
  /**
   * Sets the value of a given user property only once. Subsequent setOnce operations on that user property will be ignored;
   * however, that user property can still be modified through any of the other operations.
   * Useful for capturing properties such as 'initial_signup_date', 'initial_referrer', etc.
   * @public
   * @param {string} property - The user property key.
   * @param {number|string|list|boolean|object} value - A value or values to set once.
   * Values can be numbers, strings, lists, or object (key:value dict will be flattened).
   * @return {Identify} Returns the same Identify object, allowing you to chain multiple method calls together.
   * @example var identify = new amplitude.Identify().setOnce('sign_up_date', '2016-04-01');
   * amplitude.identify(identify); // send the Identify call
   */


  Identify.prototype.setOnce = function (property, value) {
    this._addOperation(AMP_OP_SET_ONCE, property, value);

    return this;
  };
  /**
   * Unset and remove a user property. This user property will no longer show up in a user's profile.
   * @public
   * @param {string} property - The user property key.
   * @return {Identify} Returns the same Identify object, allowing you to chain multiple method calls together.
   * @example var identify = new amplitude.Identify().unset('user_type').unset('age');
   * amplitude.identify(identify); // send the Identify call
   */


  Identify.prototype.unset = function (property) {
    this._addOperation(AMP_OP_UNSET, property, '-');

    return this;
  };
  /**
   * Helper function that adds operation to the Identify's object
   * Handle's filtering of duplicate user property keys, and filtering for clearAll.
   * @private
   */


  Identify.prototype._addOperation = function (operation, property, value) {
    // check that the identify doesn't already contain a clearAll
    if (this.userPropertiesOperations.hasOwnProperty(AMP_OP_CLEAR_ALL)) {
      utils.log.error('This identify already contains a $clearAll operation, skipping operation ' + operation);
      return;
    } // check that property wasn't already used in this Identify


    if (this.properties.indexOf(property) !== -1) {
      utils.log.error('User property "' + property + '" already used in this identify, skipping operation ' + operation);
      return;
    }

    if (!this.userPropertiesOperations.hasOwnProperty(operation)) {
      this.userPropertiesOperations[operation] = {};
    }

    this.userPropertiesOperations[operation][property] = value;
    this.properties.push(property);
  };

  var commonjsGlobal = typeof window !== 'undefined' ? window : typeof global !== 'undefined' ? global : typeof self !== 'undefined' ? self : {};

  function createCommonjsModule(fn, module) {
  	return module = { exports: {} }, fn(module, module.exports), module.exports;
  }

  var md5 = createCommonjsModule(function (module) {
  (function ($) {

    /*
    * Add integers, wrapping at 2^32. This uses 16-bit operations internally
    * to work around bugs in some JS interpreters.
    */
    function safeAdd (x, y) {
      var lsw = (x & 0xffff) + (y & 0xffff);
      var msw = (x >> 16) + (y >> 16) + (lsw >> 16);
      return (msw << 16) | (lsw & 0xffff)
    }

    /*
    * Bitwise rotate a 32-bit number to the left.
    */
    function bitRotateLeft (num, cnt) {
      return (num << cnt) | (num >>> (32 - cnt))
    }

    /*
    * These functions implement the four basic operations the algorithm uses.
    */
    function md5cmn (q, a, b, x, s, t) {
      return safeAdd(bitRotateLeft(safeAdd(safeAdd(a, q), safeAdd(x, t)), s), b)
    }
    function md5ff (a, b, c, d, x, s, t) {
      return md5cmn((b & c) | (~b & d), a, b, x, s, t)
    }
    function md5gg (a, b, c, d, x, s, t) {
      return md5cmn((b & d) | (c & ~d), a, b, x, s, t)
    }
    function md5hh (a, b, c, d, x, s, t) {
      return md5cmn(b ^ c ^ d, a, b, x, s, t)
    }
    function md5ii (a, b, c, d, x, s, t) {
      return md5cmn(c ^ (b | ~d), a, b, x, s, t)
    }

    /*
    * Calculate the MD5 of an array of little-endian words, and a bit length.
    */
    function binlMD5 (x, len) {
      /* append padding */
      x[len >> 5] |= 0x80 << (len % 32);
      x[((len + 64) >>> 9 << 4) + 14] = len;

      var i;
      var olda;
      var oldb;
      var oldc;
      var oldd;
      var a = 1732584193;
      var b = -271733879;
      var c = -1732584194;
      var d = 271733878;

      for (i = 0; i < x.length; i += 16) {
        olda = a;
        oldb = b;
        oldc = c;
        oldd = d;

        a = md5ff(a, b, c, d, x[i], 7, -680876936);
        d = md5ff(d, a, b, c, x[i + 1], 12, -389564586);
        c = md5ff(c, d, a, b, x[i + 2], 17, 606105819);
        b = md5ff(b, c, d, a, x[i + 3], 22, -1044525330);
        a = md5ff(a, b, c, d, x[i + 4], 7, -176418897);
        d = md5ff(d, a, b, c, x[i + 5], 12, 1200080426);
        c = md5ff(c, d, a, b, x[i + 6], 17, -1473231341);
        b = md5ff(b, c, d, a, x[i + 7], 22, -45705983);
        a = md5ff(a, b, c, d, x[i + 8], 7, 1770035416);
        d = md5ff(d, a, b, c, x[i + 9], 12, -1958414417);
        c = md5ff(c, d, a, b, x[i + 10], 17, -42063);
        b = md5ff(b, c, d, a, x[i + 11], 22, -1990404162);
        a = md5ff(a, b, c, d, x[i + 12], 7, 1804603682);
        d = md5ff(d, a, b, c, x[i + 13], 12, -40341101);
        c = md5ff(c, d, a, b, x[i + 14], 17, -1502002290);
        b = md5ff(b, c, d, a, x[i + 15], 22, 1236535329);

        a = md5gg(a, b, c, d, x[i + 1], 5, -165796510);
        d = md5gg(d, a, b, c, x[i + 6], 9, -1069501632);
        c = md5gg(c, d, a, b, x[i + 11], 14, 643717713);
        b = md5gg(b, c, d, a, x[i], 20, -373897302);
        a = md5gg(a, b, c, d, x[i + 5], 5, -701558691);
        d = md5gg(d, a, b, c, x[i + 10], 9, 38016083);
        c = md5gg(c, d, a, b, x[i + 15], 14, -660478335);
        b = md5gg(b, c, d, a, x[i + 4], 20, -405537848);
        a = md5gg(a, b, c, d, x[i + 9], 5, 568446438);
        d = md5gg(d, a, b, c, x[i + 14], 9, -1019803690);
        c = md5gg(c, d, a, b, x[i + 3], 14, -187363961);
        b = md5gg(b, c, d, a, x[i + 8], 20, 1163531501);
        a = md5gg(a, b, c, d, x[i + 13], 5, -1444681467);
        d = md5gg(d, a, b, c, x[i + 2], 9, -51403784);
        c = md5gg(c, d, a, b, x[i + 7], 14, 1735328473);
        b = md5gg(b, c, d, a, x[i + 12], 20, -1926607734);

        a = md5hh(a, b, c, d, x[i + 5], 4, -378558);
        d = md5hh(d, a, b, c, x[i + 8], 11, -2022574463);
        c = md5hh(c, d, a, b, x[i + 11], 16, 1839030562);
        b = md5hh(b, c, d, a, x[i + 14], 23, -35309556);
        a = md5hh(a, b, c, d, x[i + 1], 4, -1530992060);
        d = md5hh(d, a, b, c, x[i + 4], 11, 1272893353);
        c = md5hh(c, d, a, b, x[i + 7], 16, -155497632);
        b = md5hh(b, c, d, a, x[i + 10], 23, -1094730640);
        a = md5hh(a, b, c, d, x[i + 13], 4, 681279174);
        d = md5hh(d, a, b, c, x[i], 11, -358537222);
        c = md5hh(c, d, a, b, x[i + 3], 16, -722521979);
        b = md5hh(b, c, d, a, x[i + 6], 23, 76029189);
        a = md5hh(a, b, c, d, x[i + 9], 4, -640364487);
        d = md5hh(d, a, b, c, x[i + 12], 11, -421815835);
        c = md5hh(c, d, a, b, x[i + 15], 16, 530742520);
        b = md5hh(b, c, d, a, x[i + 2], 23, -995338651);

        a = md5ii(a, b, c, d, x[i], 6, -198630844);
        d = md5ii(d, a, b, c, x[i + 7], 10, 1126891415);
        c = md5ii(c, d, a, b, x[i + 14], 15, -1416354905);
        b = md5ii(b, c, d, a, x[i + 5], 21, -57434055);
        a = md5ii(a, b, c, d, x[i + 12], 6, 1700485571);
        d = md5ii(d, a, b, c, x[i + 3], 10, -1894986606);
        c = md5ii(c, d, a, b, x[i + 10], 15, -1051523);
        b = md5ii(b, c, d, a, x[i + 1], 21, -2054922799);
        a = md5ii(a, b, c, d, x[i + 8], 6, 1873313359);
        d = md5ii(d, a, b, c, x[i + 15], 10, -30611744);
        c = md5ii(c, d, a, b, x[i + 6], 15, -1560198380);
        b = md5ii(b, c, d, a, x[i + 13], 21, 1309151649);
        a = md5ii(a, b, c, d, x[i + 4], 6, -145523070);
        d = md5ii(d, a, b, c, x[i + 11], 10, -1120210379);
        c = md5ii(c, d, a, b, x[i + 2], 15, 718787259);
        b = md5ii(b, c, d, a, x[i + 9], 21, -343485551);

        a = safeAdd(a, olda);
        b = safeAdd(b, oldb);
        c = safeAdd(c, oldc);
        d = safeAdd(d, oldd);
      }
      return [a, b, c, d]
    }

    /*
    * Convert an array of little-endian words to a string
    */
    function binl2rstr (input) {
      var i;
      var output = '';
      var length32 = input.length * 32;
      for (i = 0; i < length32; i += 8) {
        output += String.fromCharCode((input[i >> 5] >>> (i % 32)) & 0xff);
      }
      return output
    }

    /*
    * Convert a raw string to an array of little-endian words
    * Characters >255 have their high-byte silently ignored.
    */
    function rstr2binl (input) {
      var i;
      var output = [];
      output[(input.length >> 2) - 1] = undefined;
      for (i = 0; i < output.length; i += 1) {
        output[i] = 0;
      }
      var length8 = input.length * 8;
      for (i = 0; i < length8; i += 8) {
        output[i >> 5] |= (input.charCodeAt(i / 8) & 0xff) << (i % 32);
      }
      return output
    }

    /*
    * Calculate the MD5 of a raw string
    */
    function rstrMD5 (s) {
      return binl2rstr(binlMD5(rstr2binl(s), s.length * 8))
    }

    /*
    * Calculate the HMAC-MD5, of a key and some data (raw strings)
    */
    function rstrHMACMD5 (key, data) {
      var i;
      var bkey = rstr2binl(key);
      var ipad = [];
      var opad = [];
      var hash;
      ipad[15] = opad[15] = undefined;
      if (bkey.length > 16) {
        bkey = binlMD5(bkey, key.length * 8);
      }
      for (i = 0; i < 16; i += 1) {
        ipad[i] = bkey[i] ^ 0x36363636;
        opad[i] = bkey[i] ^ 0x5c5c5c5c;
      }
      hash = binlMD5(ipad.concat(rstr2binl(data)), 512 + data.length * 8);
      return binl2rstr(binlMD5(opad.concat(hash), 512 + 128))
    }

    /*
    * Convert a raw string to a hex string
    */
    function rstr2hex (input) {
      var hexTab = '0123456789abcdef';
      var output = '';
      var x;
      var i;
      for (i = 0; i < input.length; i += 1) {
        x = input.charCodeAt(i);
        output += hexTab.charAt((x >>> 4) & 0x0f) + hexTab.charAt(x & 0x0f);
      }
      return output
    }

    /*
    * Encode a string as utf-8
    */
    function str2rstrUTF8 (input) {
      return unescape(encodeURIComponent(input))
    }

    /*
    * Take string arguments and return either raw or hex encoded strings
    */
    function rawMD5 (s) {
      return rstrMD5(str2rstrUTF8(s))
    }
    function hexMD5 (s) {
      return rstr2hex(rawMD5(s))
    }
    function rawHMACMD5 (k, d) {
      return rstrHMACMD5(str2rstrUTF8(k), str2rstrUTF8(d))
    }
    function hexHMACMD5 (k, d) {
      return rstr2hex(rawHMACMD5(k, d))
    }

    function md5 (string, key, raw) {
      if (!key) {
        if (!raw) {
          return hexMD5(string)
        }
        return rawMD5(string)
      }
      if (!raw) {
        return hexHMACMD5(key, string)
      }
      return rawHMACMD5(key, string)
    }

    if (module.exports) {
      module.exports = md5;
    } else {
      $.md5 = md5;
    }
  })(commonjsGlobal);
  });

  var strictUriEncode = function (str) {
  	return encodeURIComponent(str).replace(/[!'()*]/g, function (c) {
  		return '%' + c.charCodeAt(0).toString(16).toUpperCase();
  	});
  };

  /*
  object-assign
  (c) Sindre Sorhus
  @license MIT
  */
  /* eslint-disable no-unused-vars */
  var getOwnPropertySymbols = Object.getOwnPropertySymbols;
  var hasOwnProperty = Object.prototype.hasOwnProperty;
  var propIsEnumerable = Object.prototype.propertyIsEnumerable;

  function toObject(val) {
  	if (val === null || val === undefined) {
  		throw new TypeError('Object.assign cannot be called with null or undefined');
  	}

  	return Object(val);
  }

  function shouldUseNative() {
  	try {
  		if (!Object.assign) {
  			return false;
  		}

  		// Detect buggy property enumeration order in older V8 versions.

  		// https://bugs.chromium.org/p/v8/issues/detail?id=4118
  		var test1 = new String('abc');  // eslint-disable-line no-new-wrappers
  		test1[5] = 'de';
  		if (Object.getOwnPropertyNames(test1)[0] === '5') {
  			return false;
  		}

  		// https://bugs.chromium.org/p/v8/issues/detail?id=3056
  		var test2 = {};
  		for (var i = 0; i < 10; i++) {
  			test2['_' + String.fromCharCode(i)] = i;
  		}
  		var order2 = Object.getOwnPropertyNames(test2).map(function (n) {
  			return test2[n];
  		});
  		if (order2.join('') !== '0123456789') {
  			return false;
  		}

  		// https://bugs.chromium.org/p/v8/issues/detail?id=3056
  		var test3 = {};
  		'abcdefghijklmnopqrst'.split('').forEach(function (letter) {
  			test3[letter] = letter;
  		});
  		if (Object.keys(Object.assign({}, test3)).join('') !==
  				'abcdefghijklmnopqrst') {
  			return false;
  		}

  		return true;
  	} catch (err) {
  		// We don't expect any of the above to throw, but better to be safe.
  		return false;
  	}
  }

  var objectAssign = shouldUseNative() ? Object.assign : function (target, source) {
  	var from;
  	var to = toObject(target);
  	var symbols;

  	for (var s = 1; s < arguments.length; s++) {
  		from = Object(arguments[s]);

  		for (var key in from) {
  			if (hasOwnProperty.call(from, key)) {
  				to[key] = from[key];
  			}
  		}

  		if (getOwnPropertySymbols) {
  			symbols = getOwnPropertySymbols(from);
  			for (var i = 0; i < symbols.length; i++) {
  				if (propIsEnumerable.call(from, symbols[i])) {
  					to[symbols[i]] = from[symbols[i]];
  				}
  			}
  		}
  	}

  	return to;
  };

  var token = '%[a-f0-9]{2}';
  var singleMatcher = new RegExp(token, 'gi');
  var multiMatcher = new RegExp('(' + token + ')+', 'gi');

  function decodeComponents(components, split) {
  	try {
  		// Try to decode the entire string first
  		return decodeURIComponent(components.join(''));
  	} catch (err) {
  		// Do nothing
  	}

  	if (components.length === 1) {
  		return components;
  	}

  	split = split || 1;

  	// Split the array in 2 parts
  	var left = components.slice(0, split);
  	var right = components.slice(split);

  	return Array.prototype.concat.call([], decodeComponents(left), decodeComponents(right));
  }

  function decode(input) {
  	try {
  		return decodeURIComponent(input);
  	} catch (err) {
  		var tokens = input.match(singleMatcher);

  		for (var i = 1; i < tokens.length; i++) {
  			input = decodeComponents(tokens, i).join('');

  			tokens = input.match(singleMatcher);
  		}

  		return input;
  	}
  }

  function customDecodeURIComponent(input) {
  	// Keep track of all the replacements and prefill the map with the `BOM`
  	var replaceMap = {
  		'%FE%FF': '\uFFFD\uFFFD',
  		'%FF%FE': '\uFFFD\uFFFD'
  	};

  	var match = multiMatcher.exec(input);
  	while (match) {
  		try {
  			// Decode as big chunks as possible
  			replaceMap[match[0]] = decodeURIComponent(match[0]);
  		} catch (err) {
  			var result = decode(match[0]);

  			if (result !== match[0]) {
  				replaceMap[match[0]] = result;
  			}
  		}

  		match = multiMatcher.exec(input);
  	}

  	// Add `%C2` at the end of the map to make sure it does not replace the combinator before everything else
  	replaceMap['%C2'] = '\uFFFD';

  	var entries = Object.keys(replaceMap);

  	for (var i = 0; i < entries.length; i++) {
  		// Replace all decoded components
  		var key = entries[i];
  		input = input.replace(new RegExp(key, 'g'), replaceMap[key]);
  	}

  	return input;
  }

  var decodeUriComponent = function (encodedURI) {
  	if (typeof encodedURI !== 'string') {
  		throw new TypeError('Expected `encodedURI` to be of type `string`, got `' + typeof encodedURI + '`');
  	}

  	try {
  		encodedURI = encodedURI.replace(/\+/g, ' ');

  		// Try the built in decoder first
  		return decodeURIComponent(encodedURI);
  	} catch (err) {
  		// Fallback to a more advanced decoder
  		return customDecodeURIComponent(encodedURI);
  	}
  };

  function encoderForArrayFormat(opts) {
  	switch (opts.arrayFormat) {
  		case 'index':
  			return function (key, value, index) {
  				return value === null ? [
  					encode(key, opts),
  					'[',
  					index,
  					']'
  				].join('') : [
  					encode(key, opts),
  					'[',
  					encode(index, opts),
  					']=',
  					encode(value, opts)
  				].join('');
  			};

  		case 'bracket':
  			return function (key, value) {
  				return value === null ? encode(key, opts) : [
  					encode(key, opts),
  					'[]=',
  					encode(value, opts)
  				].join('');
  			};

  		default:
  			return function (key, value) {
  				return value === null ? encode(key, opts) : [
  					encode(key, opts),
  					'=',
  					encode(value, opts)
  				].join('');
  			};
  	}
  }

  function parserForArrayFormat(opts) {
  	var result;

  	switch (opts.arrayFormat) {
  		case 'index':
  			return function (key, value, accumulator) {
  				result = /\[(\d*)\]$/.exec(key);

  				key = key.replace(/\[\d*\]$/, '');

  				if (!result) {
  					accumulator[key] = value;
  					return;
  				}

  				if (accumulator[key] === undefined) {
  					accumulator[key] = {};
  				}

  				accumulator[key][result[1]] = value;
  			};

  		case 'bracket':
  			return function (key, value, accumulator) {
  				result = /(\[\])$/.exec(key);
  				key = key.replace(/\[\]$/, '');

  				if (!result) {
  					accumulator[key] = value;
  					return;
  				} else if (accumulator[key] === undefined) {
  					accumulator[key] = [value];
  					return;
  				}

  				accumulator[key] = [].concat(accumulator[key], value);
  			};

  		default:
  			return function (key, value, accumulator) {
  				if (accumulator[key] === undefined) {
  					accumulator[key] = value;
  					return;
  				}

  				accumulator[key] = [].concat(accumulator[key], value);
  			};
  	}
  }

  function encode(value, opts) {
  	if (opts.encode) {
  		return opts.strict ? strictUriEncode(value) : encodeURIComponent(value);
  	}

  	return value;
  }

  function keysSorter(input) {
  	if (Array.isArray(input)) {
  		return input.sort();
  	} else if (typeof input === 'object') {
  		return keysSorter(Object.keys(input)).sort(function (a, b) {
  			return Number(a) - Number(b);
  		}).map(function (key) {
  			return input[key];
  		});
  	}

  	return input;
  }

  function extract(str) {
  	var queryStart = str.indexOf('?');
  	if (queryStart === -1) {
  		return '';
  	}
  	return str.slice(queryStart + 1);
  }

  function parse(str, opts) {
  	opts = objectAssign({arrayFormat: 'none'}, opts);

  	var formatter = parserForArrayFormat(opts);

  	// Create an object with no prototype
  	// https://github.com/sindresorhus/query-string/issues/47
  	var ret = Object.create(null);

  	if (typeof str !== 'string') {
  		return ret;
  	}

  	str = str.trim().replace(/^[?#&]/, '');

  	if (!str) {
  		return ret;
  	}

  	str.split('&').forEach(function (param) {
  		var parts = param.replace(/\+/g, ' ').split('=');
  		// Firefox (pre 40) decodes `%3D` to `=`
  		// https://github.com/sindresorhus/query-string/pull/37
  		var key = parts.shift();
  		var val = parts.length > 0 ? parts.join('=') : undefined;

  		// missing `=` should be `null`:
  		// http://w3.org/TR/2012/WD-url-20120524/#collect-url-parameters
  		val = val === undefined ? null : decodeUriComponent(val);

  		formatter(decodeUriComponent(key), val, ret);
  	});

  	return Object.keys(ret).sort().reduce(function (result, key) {
  		var val = ret[key];
  		if (Boolean(val) && typeof val === 'object' && !Array.isArray(val)) {
  			// Sort object keys, not values
  			result[key] = keysSorter(val);
  		} else {
  			result[key] = val;
  		}

  		return result;
  	}, Object.create(null));
  }

  var extract_1 = extract;
  var parse_1 = parse;

  var stringify = function (obj, opts) {
  	var defaults = {
  		encode: true,
  		strict: true,
  		arrayFormat: 'none'
  	};

  	opts = objectAssign(defaults, opts);

  	if (opts.sort === false) {
  		opts.sort = function () {};
  	}

  	var formatter = encoderForArrayFormat(opts);

  	return obj ? Object.keys(obj).sort(opts.sort).map(function (key) {
  		var val = obj[key];

  		if (val === undefined) {
  			return '';
  		}

  		if (val === null) {
  			return encode(key, opts);
  		}

  		if (Array.isArray(val)) {
  			var result = [];

  			val.slice().forEach(function (val2) {
  				if (val2 === undefined) {
  					return;
  				}

  				result.push(formatter(key, val2, result.length));
  			});

  			return result.join('&');
  		}

  		return encode(key, opts) + '=' + encode(val, opts);
  	}).filter(function (x) {
  		return x.length > 0;
  	}).join('&') : '';
  };

  var parseUrl = function (str, opts) {
  	return {
  		url: str.split('?')[0] || '',
  		query: parse(extract(str), opts)
  	};
  };

  var queryString = {
  	extract: extract_1,
  	parse: parse_1,
  	stringify: stringify,
  	parseUrl: parseUrl
  };

  /*
   * Simple AJAX request object
   */

  var Request = function Request(url, data) {
    this.url = url;
    this.data = data || {};
  };

  Request.prototype.send = function (callback) {
    var isIE = window.XDomainRequest ? true : false;

    if (isIE) {
      var xdr = new window.XDomainRequest();
      xdr.open('POST', this.url, true);

      xdr.onload = function () {
        callback(200, xdr.responseText);
      };

      xdr.onerror = function () {
        // status code not available from xdr, try string matching on responseText
        if (xdr.responseText === 'Request Entity Too Large') {
          callback(413, xdr.responseText);
        } else {
          callback(500, xdr.responseText);
        }
      };

      xdr.ontimeout = function () {};

      xdr.onprogress = function () {};

      xdr.send(queryString.stringify(this.data));
    } else {
      var xhr = new XMLHttpRequest();
      xhr.open('POST', this.url, true);

      xhr.onreadystatechange = function () {
        if (xhr.readyState === 4) {
          callback(xhr.status, xhr.responseText);
        }
      };

      xhr.setRequestHeader('Content-Type', 'application/x-www-form-urlencoded; charset=UTF-8');
      xhr.send(queryString.stringify(this.data));
    } //log('sent request to ' + this.url + ' with data ' + decodeURIComponent(queryString(this.data)));

  };

  /*
   * Wrapper for logging Revenue data. Revenue objects get passed to amplitude.logRevenueV2 to send to Amplitude servers.
   * Note: price is the only required field. If quantity is not specified, then defaults to 1.
   */

  /**
   * Revenue API - instance constructor. Revenue objects are a wrapper for revenue data.
   * Each method updates a revenue property in the Revenue object, and returns the same Revenue object,
   * allowing you to chain multiple method calls together.
   * Note: price is a required field to log revenue events.
   * If quantity is not specified then defaults to 1.
   * See [Readme]{@link https://github.com/amplitude/Amplitude-Javascript#tracking-revenue} for more information
   * about logging Revenue.
   * @constructor Revenue
   * @public
   * @example var revenue = new amplitude.Revenue();
   */

  var Revenue = function Revenue() {
    // required fields
    this._price = null; // optional fields

    this._productId = null;
    this._quantity = 1;
    this._revenueType = null;
    this._properties = null;
  };
  /**
   * Set a value for the product identifer.
   * @public
   * @param {string} productId - The value for the product identifier. Empty and invalid strings are ignored.
   * @return {Revenue} Returns the same Revenue object, allowing you to chain multiple method calls together.
   * @example var revenue = new amplitude.Revenue().setProductId('productIdentifier').setPrice(10.99);
   * amplitude.logRevenueV2(revenue);
   */


  Revenue.prototype.setProductId = function setProductId(productId) {
    if (type(productId) !== 'string') {
      utils.log.error('Unsupported type for productId: ' + type(productId) + ', expecting string');
    } else if (utils.isEmptyString(productId)) {
      utils.log.error('Invalid empty productId');
    } else {
      this._productId = productId;
    }

    return this;
  };
  /**
   * Set a value for the quantity. Note revenue amount is calculated as price * quantity.
   * @public
   * @param {number} quantity - Integer value for the quantity. If not set, quantity defaults to 1.
   * @return {Revenue} Returns the same Revenue object, allowing you to chain multiple method calls together.
   * @example var revenue = new amplitude.Revenue().setProductId('productIdentifier').setPrice(10.99).setQuantity(5);
   * amplitude.logRevenueV2(revenue);
   */


  Revenue.prototype.setQuantity = function setQuantity(quantity) {
    if (type(quantity) !== 'number') {
      utils.log.error('Unsupported type for quantity: ' + type(quantity) + ', expecting number');
    } else {
      this._quantity = parseInt(quantity);
    }

    return this;
  };
  /**
   * Set a value for the price. This field is required for all revenue being logged.
   * Note revenue amount is calculated as price * quantity.
   * @public
   * @param {number} price - Double value for the quantity.
   * @return {Revenue} Returns the same Revenue object, allowing you to chain multiple method calls together.
   * @example var revenue = new amplitude.Revenue().setProductId('productIdentifier').setPrice(10.99);
   * amplitude.logRevenueV2(revenue);
   */


  Revenue.prototype.setPrice = function setPrice(price) {
    if (type(price) !== 'number') {
      utils.log.error('Unsupported type for price: ' + type(price) + ', expecting number');
    } else {
      this._price = price;
    }

    return this;
  };
  /**
   * Set a value for the revenueType (for example purchase, cost, tax, refund, etc).
   * @public
   * @param {string} revenueType - RevenueType to designate.
   * @return {Revenue} Returns the same Revenue object, allowing you to chain multiple method calls together.
   * @example var revenue = new amplitude.Revenue().setProductId('productIdentifier').setPrice(10.99).setRevenueType('purchase');
   * amplitude.logRevenueV2(revenue);
   */


  Revenue.prototype.setRevenueType = function setRevenueType(revenueType) {
    if (type(revenueType) !== 'string') {
      utils.log.error('Unsupported type for revenueType: ' + type(revenueType) + ', expecting string');
    } else {
      this._revenueType = revenueType;
    }

    return this;
  };
  /**
   * Set event properties for the revenue event.
   * @public
   * @param {object} eventProperties - Revenue event properties to set.
   * @return {Revenue} Returns the same Revenue object, allowing you to chain multiple method calls together.
   * @example var event_properties = {'city': 'San Francisco'};
   * var revenue = new amplitude.Revenue().setProductId('productIdentifier').setPrice(10.99).setEventProperties(event_properties);
   * amplitude.logRevenueV2(revenue);
  */


  Revenue.prototype.setEventProperties = function setEventProperties(eventProperties) {
    if (type(eventProperties) !== 'object') {
      utils.log.error('Unsupported type for eventProperties: ' + type(eventProperties) + ', expecting object');
    } else {
      this._properties = utils.validateProperties(eventProperties);
    }

    return this;
  };
  /**
   * @private
   */


  Revenue.prototype._isValidRevenue = function _isValidRevenue() {
    if (type(this._price) !== 'number') {
      utils.log.error('Invalid revenue, need to set price field');
      return false;
    }

    return true;
  };
  /**
   * @private
   */


  Revenue.prototype._toJSONObject = function _toJSONObject() {
    var obj = type(this._properties) === 'object' ? this._properties : {};

    if (this._productId !== null) {
      obj[Constants.REVENUE_PRODUCT_ID] = this._productId;
    }

    if (this._quantity !== null) {
      obj[Constants.REVENUE_QUANTITY] = this._quantity;
    }

    if (this._price !== null) {
      obj[Constants.REVENUE_PRICE] = this._price;
    }

    if (this._revenueType !== null) {
      obj[Constants.REVENUE_REVENUE_TYPE] = this._revenueType;
    }

    return obj;
  };

  var uaParser = createCommonjsModule(function (module, exports) {
  /*!
   * UAParser.js v0.7.19
   * Lightweight JavaScript-based User-Agent string parser
   * https://github.com/faisalman/ua-parser-js
   *
   * Copyright © 2012-2016 Faisal Salman <fyzlman@gmail.com>
   * Dual licensed under GPLv2 or MIT
   */

  (function (window, undefined$1) {

      //////////////
      // Constants
      /////////////


      var LIBVERSION  = '0.7.19',
          EMPTY       = '',
          UNKNOWN     = '?',
          FUNC_TYPE   = 'function',
          UNDEF_TYPE  = 'undefined',
          OBJ_TYPE    = 'object',
          STR_TYPE    = 'string',
          MAJOR       = 'major', // deprecated
          MODEL       = 'model',
          NAME        = 'name',
          TYPE        = 'type',
          VENDOR      = 'vendor',
          VERSION     = 'version',
          ARCHITECTURE= 'architecture',
          CONSOLE     = 'console',
          MOBILE      = 'mobile',
          TABLET      = 'tablet',
          SMARTTV     = 'smarttv',
          WEARABLE    = 'wearable',
          EMBEDDED    = 'embedded';


      ///////////
      // Helper
      //////////


      var util = {
          extend : function (regexes, extensions) {
              var margedRegexes = {};
              for (var i in regexes) {
                  if (extensions[i] && extensions[i].length % 2 === 0) {
                      margedRegexes[i] = extensions[i].concat(regexes[i]);
                  } else {
                      margedRegexes[i] = regexes[i];
                  }
              }
              return margedRegexes;
          },
          has : function (str1, str2) {
            if (typeof str1 === "string") {
              return str2.toLowerCase().indexOf(str1.toLowerCase()) !== -1;
            } else {
              return false;
            }
          },
          lowerize : function (str) {
              return str.toLowerCase();
          },
          major : function (version) {
              return typeof(version) === STR_TYPE ? version.replace(/[^\d\.]/g,'').split(".")[0] : undefined$1;
          },
          trim : function (str) {
            return str.replace(/^[\s\uFEFF\xA0]+|[\s\uFEFF\xA0]+$/g, '');
          }
      };


      ///////////////
      // Map helper
      //////////////


      var mapper = {

          rgx : function (ua, arrays) {

              //var result = {},
              var i = 0, j, k, p, q, matches, match;//, args = arguments;

              /*// construct object barebones
              for (p = 0; p < args[1].length; p++) {
                  q = args[1][p];
                  result[typeof q === OBJ_TYPE ? q[0] : q] = undefined;
              }*/

              // loop through all regexes maps
              while (i < arrays.length && !matches) {

                  var regex = arrays[i],       // even sequence (0,2,4,..)
                      props = arrays[i + 1];   // odd sequence (1,3,5,..)
                  j = k = 0;

                  // try matching uastring with regexes
                  while (j < regex.length && !matches) {

                      matches = regex[j++].exec(ua);

                      if (!!matches) {
                          for (p = 0; p < props.length; p++) {
                              match = matches[++k];
                              q = props[p];
                              // check if given property is actually array
                              if (typeof q === OBJ_TYPE && q.length > 0) {
                                  if (q.length == 2) {
                                      if (typeof q[1] == FUNC_TYPE) {
                                          // assign modified match
                                          this[q[0]] = q[1].call(this, match);
                                      } else {
                                          // assign given value, ignore regex match
                                          this[q[0]] = q[1];
                                      }
                                  } else if (q.length == 3) {
                                      // check whether function or regex
                                      if (typeof q[1] === FUNC_TYPE && !(q[1].exec && q[1].test)) {
                                          // call function (usually string mapper)
                                          this[q[0]] = match ? q[1].call(this, match, q[2]) : undefined$1;
                                      } else {
                                          // sanitize match using given regex
                                          this[q[0]] = match ? match.replace(q[1], q[2]) : undefined$1;
                                      }
                                  } else if (q.length == 4) {
                                          this[q[0]] = match ? q[3].call(this, match.replace(q[1], q[2])) : undefined$1;
                                  }
                              } else {
                                  this[q] = match ? match : undefined$1;
                              }
                          }
                      }
                  }
                  i += 2;
              }
              // console.log(this);
              //return this;
          },

          str : function (str, map) {

              for (var i in map) {
                  // check if array
                  if (typeof map[i] === OBJ_TYPE && map[i].length > 0) {
                      for (var j = 0; j < map[i].length; j++) {
                          if (util.has(map[i][j], str)) {
                              return (i === UNKNOWN) ? undefined$1 : i;
                          }
                      }
                  } else if (util.has(map[i], str)) {
                      return (i === UNKNOWN) ? undefined$1 : i;
                  }
              }
              return str;
          }
      };


      ///////////////
      // String map
      //////////////


      var maps = {

          browser : {
              oldsafari : {
                  version : {
                      '1.0'   : '/8',
                      '1.2'   : '/1',
                      '1.3'   : '/3',
                      '2.0'   : '/412',
                      '2.0.2' : '/416',
                      '2.0.3' : '/417',
                      '2.0.4' : '/419',
                      '?'     : '/'
                  }
              },
              name : {
                  'Opera Mobile' : 'Opera Mobi',
                  'IE Mobile'    : 'IEMobile'
              }
          },

          device : {
              amazon : {
                  model : {
                      'Fire Phone' : ['SD', 'KF']
                  }
              },
              sprint : {
                  model : {
                      'Evo Shift 4G' : '7373KT'
                  },
                  vendor : {
                      'HTC'       : 'APA',
                      'Sprint'    : 'Sprint'
                  }
              }
          },

          os : {
              windows : {
                  version : {
                      'ME'        : '4.90',
                      'NT 3.11'   : 'NT3.51',
                      'NT 4.0'    : 'NT4.0',
                      '2000'      : 'NT 5.0',
                      'XP'        : ['NT 5.1', 'NT 5.2'],
                      'Vista'     : 'NT 6.0',
                      '7'         : 'NT 6.1',
                      '8'         : 'NT 6.2',
                      '8.1'       : 'NT 6.3',
                      '10'        : ['NT 6.4', 'NT 10.0'],
                      'RT'        : 'ARM'
                  },
                  name : {
                      'Windows Phone' : 'Windows Phone OS'
                  }
              }
          }
      };


      //////////////
      // Regex map
      /////////////


      var regexes = {

          browser : [[

              // Presto based
              /(opera\smini)\/([\w\.-]+)/i,                                       // Opera Mini
              /(opera\s[mobiletab]+).+version\/([\w\.-]+)/i,                      // Opera Mobi/Tablet
              /(opera).+version\/([\w\.]+)/i,                                     // Opera > 9.80
              /(opera)[\/\s]+([\w\.]+)/i                                          // Opera < 9.80
              ], [NAME, VERSION], [

              /(opios)[\/\s]+([\w\.]+)/i                                          // Opera mini on iphone >= 8.0
              ], [[NAME, 'Opera Mini'], VERSION], [

              /\s(opr)\/([\w\.]+)/i                                               // Opera Webkit
              ], [[NAME, 'Opera'], VERSION], [

              // Mixed
              /(kindle)\/([\w\.]+)/i,                                             // Kindle
              /(lunascape|maxthon|netfront|jasmine|blazer)[\/\s]?([\w\.]*)/i,
                                                                                  // Lunascape/Maxthon/Netfront/Jasmine/Blazer

              // Trident based
              /(avant\s|iemobile|slim|baidu)(?:browser)?[\/\s]?([\w\.]*)/i,
                                                                                  // Avant/IEMobile/SlimBrowser/Baidu
              /(?:ms|\()(ie)\s([\w\.]+)/i,                                        // Internet Explorer

              // Webkit/KHTML based
              /(rekonq)\/([\w\.]*)/i,                                             // Rekonq
              /(chromium|flock|rockmelt|midori|epiphany|silk|skyfire|ovibrowser|bolt|iron|vivaldi|iridium|phantomjs|bowser|quark|qupzilla|falkon)\/([\w\.-]+)/i
                                                                                  // Chromium/Flock/RockMelt/Midori/Epiphany/Silk/Skyfire/Bolt/Iron/Iridium/PhantomJS/Bowser/QupZilla/Falkon
              ], [NAME, VERSION], [

              /(konqueror)\/([\w\.]+)/i                                           // Konqueror
              ], [[NAME, 'Konqueror'], VERSION], [

              /(trident).+rv[:\s]([\w\.]+).+like\sgecko/i                         // IE11
              ], [[NAME, 'IE'], VERSION], [

              /(edge|edgios|edga)\/((\d+)?[\w\.]+)/i                              // Microsoft Edge
              ], [[NAME, 'Edge'], VERSION], [

              /(yabrowser)\/([\w\.]+)/i                                           // Yandex
              ], [[NAME, 'Yandex'], VERSION], [

              /(puffin)\/([\w\.]+)/i                                              // Puffin
              ], [[NAME, 'Puffin'], VERSION], [

              /(focus)\/([\w\.]+)/i                                               // Firefox Focus
              ], [[NAME, 'Firefox Focus'], VERSION], [

              /(opt)\/([\w\.]+)/i                                                 // Opera Touch
              ], [[NAME, 'Opera Touch'], VERSION], [

              /((?:[\s\/])uc?\s?browser|(?:juc.+)ucweb)[\/\s]?([\w\.]+)/i         // UCBrowser
              ], [[NAME, 'UCBrowser'], VERSION], [

              /(comodo_dragon)\/([\w\.]+)/i                                       // Comodo Dragon
              ], [[NAME, /_/g, ' '], VERSION], [

              /((?:android.+)crmo|crios)\/([\w\.]+)/i,
              /android.+(chrome)\/([\w\.]+)\s+(?:mobile\s?safari)/i               // Chrome for Android/iOS
              ], [[NAME, 'Chrome Mobile'], VERSION], [

              /(micromessenger)\/([\w\.]+)/i                                      // WeChat
              ], [[NAME, 'WeChat'], VERSION], [

              /(brave)\/([\w\.]+)/i                                              // Brave browser
              ], [[NAME, 'Brave'], VERSION], [

              /(qqbrowserlite)\/([\w\.]+)/i                                       // QQBrowserLite
              ], [NAME, VERSION], [

              /(QQ)\/([\d\.]+)/i                                                  // QQ, aka ShouQ
              ], [NAME, VERSION], [

              /m?(qqbrowser)[\/\s]?([\w\.]+)/i                                    // QQBrowser
              ], [NAME, VERSION], [

              /(BIDUBrowser)[\/\s]?([\w\.]+)/i                                    // Baidu Browser
              ], [NAME, VERSION], [

              /(2345Explorer)[\/\s]?([\w\.]+)/i                                   // 2345 Browser
              ], [NAME, VERSION], [

              /(MetaSr)[\/\s]?([\w\.]+)/i                                         // SouGouBrowser
              ], [NAME], [

              /(LBBROWSER)/i                                      // LieBao Browser
              ], [NAME], [

              /xiaomi\/miuibrowser\/([\w\.]+)/i                                   // MIUI Browser
              ], [VERSION, [NAME, 'MIUI Browser']], [

              /;fbav\/([\w\.]+);/i                                                // Facebook App for iOS & Android
              ], [VERSION, [NAME, 'Facebook']], [

              /safari\s(line)\/([\w\.]+)/i,                                       // Line App for iOS
              /android.+(line)\/([\w\.]+)\/iab/i                                  // Line App for Android
              ], [NAME, VERSION], [

              /headlesschrome(?:\/([\w\.]+)|\s)/i                                 // Chrome Headless
              ], [VERSION, [NAME, 'Chrome Headless']], [

              /\swv\).+(chrome)\/([\w\.]+)/i                                      // Chrome WebView
              ], [[NAME, /(.+)/, '$1 WebView'], VERSION], [

              /((?:oculus|samsung)browser)\/([\w\.]+)/i
              ], [[NAME, /(.+(?:g|us))(.+)/, '$1 $2'], VERSION], [                // Oculus / Samsung Browser

              /android.+version\/([\w\.]+)\s+(?:mobile\s?safari|safari)*/i        // Android Browser
              ], [VERSION, [NAME, 'Android Browser']], [

              /(chrome|omniweb|arora|[tizenoka]{5}\s?browser)\/v?([\w\.]+)/i
                                                                                  // Chrome/OmniWeb/Arora/Tizen/Nokia
              ], [NAME, VERSION], [

              /(dolfin)\/([\w\.]+)/i                                              // Dolphin
              ], [[NAME, 'Dolphin'], VERSION], [

              /(coast)\/([\w\.]+)/i                                               // Opera Coast
              ], [[NAME, 'Opera Coast'], VERSION], [

              /fxios\/([\w\.-]+)/i                                                // Firefox for iOS
              ], [VERSION, [NAME, 'Firefox']], [

              /version\/([\w\.]+).+?mobile\/\w+\s(safari)/i                       // Mobile Safari
              ], [VERSION, [NAME, 'Mobile Safari']], [

              /version\/([\w\.]+).+?(mobile\s?safari|safari)/i                    // Safari & Safari Mobile
              ], [VERSION, NAME], [

              /webkit.+?(gsa)\/([\w\.]+).+?(mobile\s?safari|safari)(\/[\w\.]+)/i  // Google Search Appliance on iOS
              ], [[NAME, 'GSA'], VERSION], [

              /webkit.+?(mobile\s?safari|safari)(\/[\w\.]+)/i                     // Safari < 3.0
              ], [NAME, [VERSION, mapper.str, maps.browser.oldsafari.version]], [

              /(webkit|khtml)\/([\w\.]+)/i
              ], [NAME, VERSION], [

              // Gecko based
              /(navigator|netscape)\/([\w\.-]+)/i                                 // Netscape
              ], [[NAME, 'Netscape'], VERSION], [
              /(swiftfox)/i,                                                      // Swiftfox
              /(icedragon|iceweasel|camino|chimera|fennec|maemo\sbrowser|minimo|conkeror)[\/\s]?([\w\.\+]+)/i,
                                                                                  // IceDragon/Iceweasel/Camino/Chimera/Fennec/Maemo/Minimo/Conkeror
              /(firefox|seamonkey|k-meleon|icecat|iceape|firebird|phoenix|palemoon|basilisk|waterfox)\/([\w\.-]+)/i,

                                                                                  // Firefox/SeaMonkey/K-Meleon/IceCat/IceApe/Firebird/Phoenix
              /(mozilla)\/([\w\.]+).+rv\:.+gecko\/\d+/i,                          // Mozilla

              // Other
              /(polaris|lynx|dillo|icab|doris|amaya|w3m|netsurf|sleipnir)[\/\s]?([\w\.]+)/i,
                                                                                  // Polaris/Lynx/Dillo/iCab/Doris/Amaya/w3m/NetSurf/Sleipnir
              /(links)\s\(([\w\.]+)/i,                                            // Links
              /(gobrowser)\/?([\w\.]*)/i,                                         // GoBrowser
              /(ice\s?browser)\/v?([\w\._]+)/i,                                   // ICE Browser
              /(mosaic)[\/\s]([\w\.]+)/i                                          // Mosaic
              ], [NAME, VERSION]

              /* /////////////////////
              // Media players BEGIN
              ////////////////////////

              , [

              /(apple(?:coremedia|))\/((\d+)[\w\._]+)/i,                          // Generic Apple CoreMedia
              /(coremedia) v((\d+)[\w\._]+)/i
              ], [NAME, VERSION], [

              /(aqualung|lyssna|bsplayer)\/((\d+)?[\w\.-]+)/i                     // Aqualung/Lyssna/BSPlayer
              ], [NAME, VERSION], [

              /(ares|ossproxy)\s((\d+)[\w\.-]+)/i                                 // Ares/OSSProxy
              ], [NAME, VERSION], [

              /(audacious|audimusicstream|amarok|bass|core|dalvik|gnomemplayer|music on console|nsplayer|psp-internetradioplayer|videos)\/((\d+)[\w\.-]+)/i,
                                                                                  // Audacious/AudiMusicStream/Amarok/BASS/OpenCORE/Dalvik/GnomeMplayer/MoC
                                                                                  // NSPlayer/PSP-InternetRadioPlayer/Videos
              /(clementine|music player daemon)\s((\d+)[\w\.-]+)/i,               // Clementine/MPD
              /(lg player|nexplayer)\s((\d+)[\d\.]+)/i,
              /player\/(nexplayer|lg player)\s((\d+)[\w\.-]+)/i                   // NexPlayer/LG Player
              ], [NAME, VERSION], [
              /(nexplayer)\s((\d+)[\w\.-]+)/i                                     // Nexplayer
              ], [NAME, VERSION], [

              /(flrp)\/((\d+)[\w\.-]+)/i                                          // Flip Player
              ], [[NAME, 'Flip Player'], VERSION], [

              /(fstream|nativehost|queryseekspider|ia-archiver|facebookexternalhit)/i
                                                                                  // FStream/NativeHost/QuerySeekSpider/IA Archiver/facebookexternalhit
              ], [NAME], [

              /(gstreamer) souphttpsrc (?:\([^\)]+\)){0,1} libsoup\/((\d+)[\w\.-]+)/i
                                                                                  // Gstreamer
              ], [NAME, VERSION], [

              /(htc streaming player)\s[\w_]+\s\/\s((\d+)[\d\.]+)/i,              // HTC Streaming Player
              /(java|python-urllib|python-requests|wget|libcurl)\/((\d+)[\w\.-_]+)/i,
                                                                                  // Java/urllib/requests/wget/cURL
              /(lavf)((\d+)[\d\.]+)/i                                             // Lavf (FFMPEG)
              ], [NAME, VERSION], [

              /(htc_one_s)\/((\d+)[\d\.]+)/i                                      // HTC One S
              ], [[NAME, /_/g, ' '], VERSION], [

              /(mplayer)(?:\s|\/)(?:(?:sherpya-){0,1}svn)(?:-|\s)(r\d+(?:-\d+[\w\.-]+){0,1})/i
                                                                                  // MPlayer SVN
              ], [NAME, VERSION], [

              /(mplayer)(?:\s|\/|[unkow-]+)((\d+)[\w\.-]+)/i                      // MPlayer
              ], [NAME, VERSION], [

              /(mplayer)/i,                                                       // MPlayer (no other info)
              /(yourmuze)/i,                                                      // YourMuze
              /(media player classic|nero showtime)/i                             // Media Player Classic/Nero ShowTime
              ], [NAME], [

              /(nero (?:home|scout))\/((\d+)[\w\.-]+)/i                           // Nero Home/Nero Scout
              ], [NAME, VERSION], [

              /(nokia\d+)\/((\d+)[\w\.-]+)/i                                      // Nokia
              ], [NAME, VERSION], [

              /\s(songbird)\/((\d+)[\w\.-]+)/i                                    // Songbird/Philips-Songbird
              ], [NAME, VERSION], [

              /(winamp)3 version ((\d+)[\w\.-]+)/i,                               // Winamp
              /(winamp)\s((\d+)[\w\.-]+)/i,
              /(winamp)mpeg\/((\d+)[\w\.-]+)/i
              ], [NAME, VERSION], [

              /(ocms-bot|tapinradio|tunein radio|unknown|winamp|inlight radio)/i  // OCMS-bot/tap in radio/tunein/unknown/winamp (no other info)
                                                                                  // inlight radio
              ], [NAME], [

              /(quicktime|rma|radioapp|radioclientapplication|soundtap|totem|stagefright|streamium)\/((\d+)[\w\.-]+)/i
                                                                                  // QuickTime/RealMedia/RadioApp/RadioClientApplication/
                                                                                  // SoundTap/Totem/Stagefright/Streamium
              ], [NAME, VERSION], [

              /(smp)((\d+)[\d\.]+)/i                                              // SMP
              ], [NAME, VERSION], [

              /(vlc) media player - version ((\d+)[\w\.]+)/i,                     // VLC Videolan
              /(vlc)\/((\d+)[\w\.-]+)/i,
              /(xbmc|gvfs|xine|xmms|irapp)\/((\d+)[\w\.-]+)/i,                    // XBMC/gvfs/Xine/XMMS/irapp
              /(foobar2000)\/((\d+)[\d\.]+)/i,                                    // Foobar2000
              /(itunes)\/((\d+)[\d\.]+)/i                                         // iTunes
              ], [NAME, VERSION], [

              /(wmplayer)\/((\d+)[\w\.-]+)/i,                                     // Windows Media Player
              /(windows-media-player)\/((\d+)[\w\.-]+)/i
              ], [[NAME, /-/g, ' '], VERSION], [

              /windows\/((\d+)[\w\.-]+) upnp\/[\d\.]+ dlnadoc\/[\d\.]+ (home media server)/i
                                                                                  // Windows Media Server
              ], [VERSION, [NAME, 'Windows']], [

              /(com\.riseupradioalarm)\/((\d+)[\d\.]*)/i                          // RiseUP Radio Alarm
              ], [NAME, VERSION], [

              /(rad.io)\s((\d+)[\d\.]+)/i,                                        // Rad.io
              /(radio.(?:de|at|fr))\s((\d+)[\d\.]+)/i
              ], [[NAME, 'rad.io'], VERSION]

              //////////////////////
              // Media players END
              ////////////////////*/

          ],

          cpu : [[

              /(?:(amd|x(?:(?:86|64)[_-])?|wow|win)64)[;\)]/i                     // AMD64
              ], [[ARCHITECTURE, 'amd64']], [

              /(ia32(?=;))/i                                                      // IA32 (quicktime)
              ], [[ARCHITECTURE, util.lowerize]], [

              /((?:i[346]|x)86)[;\)]/i                                            // IA32
              ], [[ARCHITECTURE, 'ia32']], [

              // PocketPC mistakenly identified as PowerPC
              /windows\s(ce|mobile);\sppc;/i
              ], [[ARCHITECTURE, 'arm']], [

              /((?:ppc|powerpc)(?:64)?)(?:\smac|;|\))/i                           // PowerPC
              ], [[ARCHITECTURE, /ower/, '', util.lowerize]], [

              /(sun4\w)[;\)]/i                                                    // SPARC
              ], [[ARCHITECTURE, 'sparc']], [

              /((?:avr32|ia64(?=;))|68k(?=\))|arm(?:64|(?=v\d+[;l]))|(?=atmel\s)avr|(?:irix|mips|sparc)(?:64)?(?=;)|pa-risc)/i
                                                                                  // IA64, 68K, ARM/64, AVR/32, IRIX/64, MIPS/64, SPARC/64, PA-RISC
              ], [[ARCHITECTURE, util.lowerize]]
          ],

          device : [[

              /\((ipad|playbook);[\w\s\),;-]+(rim|apple)/i                        // iPad/PlayBook
              ], [MODEL, VENDOR, [TYPE, TABLET]], [

              /applecoremedia\/[\w\.]+ \((ipad)/                                  // iPad
              ], [MODEL, [VENDOR, 'Apple'], [TYPE, TABLET]], [

              /(apple\s{0,1}tv)/i                                                 // Apple TV
              ], [[MODEL, 'Apple TV'], [VENDOR, 'Apple']], [

              /(archos)\s(gamepad2?)/i,                                           // Archos
              /(hp).+(touchpad)/i,                                                // HP TouchPad
              /(hp).+(tablet)/i,                                                  // HP Tablet
              /(kindle)\/([\w\.]+)/i,                                             // Kindle
              /\s(nook)[\w\s]+build\/(\w+)/i,                                     // Nook
              /(dell)\s(strea[kpr\s\d]*[\dko])/i                                  // Dell Streak
              ], [VENDOR, MODEL, [TYPE, TABLET]], [

              /(kf[A-z]+)\sbuild\/.+silk\//i                                      // Kindle Fire HD
              ], [MODEL, [VENDOR, 'Amazon'], [TYPE, TABLET]], [
              /(sd|kf)[0349hijorstuw]+\sbuild\/.+silk\//i                         // Fire Phone
              ], [[MODEL, mapper.str, maps.device.amazon.model], [VENDOR, 'Amazon'], [TYPE, MOBILE]], [
              /android.+aft([bms])\sbuild/i                                       // Fire TV
              ], [MODEL, [VENDOR, 'Amazon'], [TYPE, SMARTTV]], [

              /\((ip[honed|\s\w*]+);.+(apple)/i                                   // iPod/iPhone
              ], [MODEL, VENDOR, [TYPE, MOBILE]], [
              /\((ip[honed|\s\w*]+);/i                                            // iPod/iPhone
              ], [MODEL, [VENDOR, 'Apple'], [TYPE, MOBILE]], [

              /(blackberry)[\s-]?(\w+)/i,                                         // BlackBerry
              /(blackberry|benq|palm(?=\-)|sonyericsson|acer|asus|dell|meizu|motorola|polytron)[\s_-]?([\w-]*)/i,
                                                                                  // BenQ/Palm/Sony-Ericsson/Acer/Asus/Dell/Meizu/Motorola/Polytron
              /(hp)\s([\w\s]+\w)/i,                                               // HP iPAQ
              /(asus)-?(\w+)/i                                                    // Asus
              ], [VENDOR, MODEL, [TYPE, MOBILE]], [
              /\(bb10;\s(\w+)/i                                                   // BlackBerry 10
              ], [MODEL, [VENDOR, 'BlackBerry'], [TYPE, MOBILE]], [
                                                                                  // Asus Tablets
              /android.+(transfo[prime\s]{4,10}\s\w+|eeepc|slider\s\w+|nexus 7|padfone|p00c)/i
              ], [MODEL, [VENDOR, 'Asus'], [TYPE, TABLET]], [

              /(sony)\s(tablet\s[ps])\sbuild\//i,                                  // Sony
              /(sony)?(?:sgp.+)\sbuild\//i
              ], [[VENDOR, 'Sony'], [MODEL, 'Xperia Tablet'], [TYPE, TABLET]], [
              /android.+\s([c-g]\d{4}|so[-l]\w+)(?=\sbuild\/|\).+chrome\/(?![1-6]{0,1}\d\.))/i
              ], [MODEL, [VENDOR, 'Sony'], [TYPE, MOBILE]], [

              /\s(ouya)\s/i,                                                      // Ouya
              /(nintendo)\s([wids3u]+)/i                                          // Nintendo
              ], [VENDOR, MODEL, [TYPE, CONSOLE]], [

              /android.+;\s(shield)\sbuild/i                                      // Nvidia
              ], [MODEL, [VENDOR, 'Nvidia'], [TYPE, CONSOLE]], [

              /(playstation\s[34portablevi]+)/i                                   // Playstation
              ], [MODEL, [VENDOR, 'Sony'], [TYPE, CONSOLE]], [

              /(sprint\s(\w+))/i                                                  // Sprint Phones
              ], [[VENDOR, mapper.str, maps.device.sprint.vendor], [MODEL, mapper.str, maps.device.sprint.model], [TYPE, MOBILE]], [

              /(lenovo)\s?(S(?:5000|6000)+(?:[-][\w+]))/i                         // Lenovo tablets
              ], [VENDOR, MODEL, [TYPE, TABLET]], [

              /(htc)[;_\s-]+([\w\s]+(?=\)|\sbuild)|\w+)/i,                        // HTC
              /(zte)-(\w*)/i,                                                     // ZTE
              /(alcatel|geeksphone|lenovo|nexian|panasonic|(?=;\s)sony)[_\s-]?([\w-]*)/i
                                                                                  // Alcatel/GeeksPhone/Lenovo/Nexian/Panasonic/Sony
              ], [VENDOR, [MODEL, /_/g, ' '], [TYPE, MOBILE]], [

              /(nexus\s9)/i                                                       // HTC Nexus 9
              ], [MODEL, [VENDOR, 'HTC'], [TYPE, TABLET]], [

              /d\/huawei([\w\s-]+)[;\)]/i,
              /(nexus\s6p)/i                                                      // Huawei
              ], [MODEL, [VENDOR, 'Huawei'], [TYPE, MOBILE]], [

              /(microsoft);\s(lumia[\s\w]+)/i                                     // Microsoft Lumia
              ], [VENDOR, MODEL, [TYPE, MOBILE]], [

              /[\s\(;](xbox(?:\sone)?)[\s\);]/i                                   // Microsoft Xbox
              ], [MODEL, [VENDOR, 'Microsoft'], [TYPE, CONSOLE]], [
              /(kin\.[onetw]{3})/i                                                // Microsoft Kin
              ], [[MODEL, /\./g, ' '], [VENDOR, 'Microsoft'], [TYPE, MOBILE]], [

                                                                                  // Motorola
              /\s(milestone|droid(?:[2-4x]|\s(?:bionic|x2|pro|razr))?:?(\s4g)?)[\w\s]+build\//i,
              /mot[\s-]?(\w*)/i,
              /(XT\d{3,4}) build\//i,
              /(nexus\s6)/i
              ], [MODEL, [VENDOR, 'Motorola'], [TYPE, MOBILE]], [
              /android.+\s(mz60\d|xoom[\s2]{0,2})\sbuild\//i
              ], [MODEL, [VENDOR, 'Motorola'], [TYPE, TABLET]], [

              /hbbtv\/\d+\.\d+\.\d+\s+\([\w\s]*;\s*(\w[^;]*);([^;]*)/i            // HbbTV devices
              ], [[VENDOR, util.trim], [MODEL, util.trim], [TYPE, SMARTTV]], [

              /hbbtv.+maple;(\d+)/i
              ], [[MODEL, /^/, 'SmartTV'], [VENDOR, 'Samsung'], [TYPE, SMARTTV]], [

              /\(dtv[\);].+(aquos)/i                                              // Sharp
              ], [MODEL, [VENDOR, 'Sharp'], [TYPE, SMARTTV]], [

              /android.+((sch-i[89]0\d|shw-m380s|gt-p\d{4}|gt-n\d+|sgh-t8[56]9|nexus 10))/i,
              /((SM-T\w+))/i
              ], [[VENDOR, 'Samsung'], MODEL, [TYPE, TABLET]], [                  // Samsung
              /smart-tv.+(samsung)/i
              ], [VENDOR, [TYPE, SMARTTV], MODEL], [
              /((s[cgp]h-\w+|gt-\w+|galaxy\snexus|sm-\w[\w\d]+))/i,
              /(sam[sung]*)[\s-]*(\w+-?[\w-]*)/i,
              /sec-((sgh\w+))/i
              ], [[VENDOR, 'Samsung'], MODEL, [TYPE, MOBILE]], [

              /sie-(\w*)/i                                                        // Siemens
              ], [MODEL, [VENDOR, 'Siemens'], [TYPE, MOBILE]], [

              /(maemo|nokia).*(n900|lumia\s\d+)/i,                                // Nokia
              /(nokia)[\s_-]?([\w-]*)/i
              ], [[VENDOR, 'Nokia'], MODEL, [TYPE, MOBILE]], [

              /android[x\d\.\s;]+\s([ab][1-7]\-?[0178a]\d\d?)/i                   // Acer
              ], [MODEL, [VENDOR, 'Acer'], [TYPE, TABLET]], [

              /android.+([vl]k\-?\d{3})\s+build/i                                 // LG Tablet
              ], [MODEL, [VENDOR, 'LG'], [TYPE, TABLET]], [
              /android\s3\.[\s\w;-]{10}(lg?)-([06cv9]{3,4})/i                     // LG Tablet
              ], [[VENDOR, 'LG'], MODEL, [TYPE, TABLET]], [
              /(lg) netcast\.tv/i                                                 // LG SmartTV
              ], [VENDOR, MODEL, [TYPE, SMARTTV]], [
              /(nexus\s[45])/i,                                                   // LG
              /lg[e;\s\/-]+(\w*)/i,
              /android.+lg(\-?[\d\w]+)\s+build/i
              ], [MODEL, [VENDOR, 'LG'], [TYPE, MOBILE]], [

              /android.+(ideatab[a-z0-9\-\s]+)/i                                  // Lenovo
              ], [MODEL, [VENDOR, 'Lenovo'], [TYPE, TABLET]], [

              /linux;.+((jolla));/i                                               // Jolla
              ], [VENDOR, MODEL, [TYPE, MOBILE]], [

              /((pebble))app\/[\d\.]+\s/i                                         // Pebble
              ], [VENDOR, MODEL, [TYPE, WEARABLE]], [

              /android.+;\s(oppo)\s?([\w\s]+)\sbuild/i                            // OPPO
              ], [VENDOR, MODEL, [TYPE, MOBILE]], [

              /crkey/i                                                            // Google Chromecast
              ], [[MODEL, 'Chromecast'], [VENDOR, 'Google']], [

              /android.+;\s(glass)\s\d/i                                          // Google Glass
              ], [MODEL, [VENDOR, 'Google'], [TYPE, WEARABLE]], [

              /android.+;\s(pixel c)[\s)]/i                                       // Google Pixel C
              ], [MODEL, [VENDOR, 'Google'], [TYPE, TABLET]], [

              /android.+;\s(pixel( [23])?( xl)?)\s/i                              // Google Pixel
              ], [MODEL, [VENDOR, 'Google'], [TYPE, MOBILE]], [

              /android.+;\s(\w+)\s+build\/hm\1/i,                                 // Xiaomi Hongmi 'numeric' models
              /android.+(hm[\s\-_]*note?[\s_]*(?:\d\w)?)\s+build/i,               // Xiaomi Hongmi
              /android.+(mi[\s\-_]*(?:one|one[\s_]plus|note lte)?[\s_]*(?:\d?\w?)[\s_]*(?:plus)?)\s+build/i,    // Xiaomi Mi
              /android.+(redmi[\s\-_]*(?:note)?(?:[\s_]*[\w\s]+))\s+build/i       // Redmi Phones
              ], [[MODEL, /_/g, ' '], [VENDOR, 'Xiaomi'], [TYPE, MOBILE]], [
              /android.+(mi[\s\-_]*(?:pad)(?:[\s_]*[\w\s]+))\s+build/i            // Mi Pad tablets
              ],[[MODEL, /_/g, ' '], [VENDOR, 'Xiaomi'], [TYPE, TABLET]], [
              /android.+;\s(m[1-5]\snote)\sbuild/i                                // Meizu Tablet
              ], [MODEL, [VENDOR, 'Meizu'], [TYPE, TABLET]], [
              /(mz)-([\w-]{2,})/i                                                 // Meizu Phone
              ], [[VENDOR, 'Meizu'], MODEL, [TYPE, MOBILE]], [

              /android.+a000(1)\s+build/i,                                        // OnePlus
              /android.+oneplus\s(a\d{4})\s+build/i
              ], [MODEL, [VENDOR, 'OnePlus'], [TYPE, MOBILE]], [

              /android.+[;\/]\s*(RCT[\d\w]+)\s+build/i                            // RCA Tablets
              ], [MODEL, [VENDOR, 'RCA'], [TYPE, TABLET]], [

              /android.+[;\/\s]+(Venue[\d\s]{2,7})\s+build/i                      // Dell Venue Tablets
              ], [MODEL, [VENDOR, 'Dell'], [TYPE, TABLET]], [

              /android.+[;\/]\s*(Q[T|M][\d\w]+)\s+build/i                         // Verizon Tablet
              ], [MODEL, [VENDOR, 'Verizon'], [TYPE, TABLET]], [

              /android.+[;\/]\s+(Barnes[&\s]+Noble\s+|BN[RT])(V?.*)\s+build/i     // Barnes & Noble Tablet
              ], [[VENDOR, 'Barnes & Noble'], MODEL, [TYPE, TABLET]], [

              /android.+[;\/]\s+(TM\d{3}.*\b)\s+build/i                           // Barnes & Noble Tablet
              ], [MODEL, [VENDOR, 'NuVision'], [TYPE, TABLET]], [

              /android.+;\s(k88)\sbuild/i                                         // ZTE K Series Tablet
              ], [MODEL, [VENDOR, 'ZTE'], [TYPE, TABLET]], [

              /android.+[;\/]\s*(gen\d{3})\s+build.*49h/i                         // Swiss GEN Mobile
              ], [MODEL, [VENDOR, 'Swiss'], [TYPE, MOBILE]], [

              /android.+[;\/]\s*(zur\d{3})\s+build/i                              // Swiss ZUR Tablet
              ], [MODEL, [VENDOR, 'Swiss'], [TYPE, TABLET]], [

              /android.+[;\/]\s*((Zeki)?TB.*\b)\s+build/i                         // Zeki Tablets
              ], [MODEL, [VENDOR, 'Zeki'], [TYPE, TABLET]], [

              /(android).+[;\/]\s+([YR]\d{2})\s+build/i,
              /android.+[;\/]\s+(Dragon[\-\s]+Touch\s+|DT)(\w{5})\sbuild/i        // Dragon Touch Tablet
              ], [[VENDOR, 'Dragon Touch'], MODEL, [TYPE, TABLET]], [

              /android.+[;\/]\s*(NS-?\w{0,9})\sbuild/i                            // Insignia Tablets
              ], [MODEL, [VENDOR, 'Insignia'], [TYPE, TABLET]], [

              /android.+[;\/]\s*((NX|Next)-?\w{0,9})\s+build/i                    // NextBook Tablets
              ], [MODEL, [VENDOR, 'NextBook'], [TYPE, TABLET]], [

              /android.+[;\/]\s*(Xtreme\_)?(V(1[045]|2[015]|30|40|60|7[05]|90))\s+build/i
              ], [[VENDOR, 'Voice'], MODEL, [TYPE, MOBILE]], [                    // Voice Xtreme Phones

              /android.+[;\/]\s*(LVTEL\-)?(V1[12])\s+build/i                     // LvTel Phones
              ], [[VENDOR, 'LvTel'], MODEL, [TYPE, MOBILE]], [

              /android.+;\s(PH-1)\s/i
              ], [MODEL, [VENDOR, 'Essential'], [TYPE, MOBILE]], [                // Essential PH-1

              /android.+[;\/]\s*(V(100MD|700NA|7011|917G).*\b)\s+build/i          // Envizen Tablets
              ], [MODEL, [VENDOR, 'Envizen'], [TYPE, TABLET]], [

              /android.+[;\/]\s*(Le[\s\-]+Pan)[\s\-]+(\w{1,9})\s+build/i          // Le Pan Tablets
              ], [VENDOR, MODEL, [TYPE, TABLET]], [

              /android.+[;\/]\s*(Trio[\s\-]*.*)\s+build/i                         // MachSpeed Tablets
              ], [MODEL, [VENDOR, 'MachSpeed'], [TYPE, TABLET]], [

              /android.+[;\/]\s*(Trinity)[\-\s]*(T\d{3})\s+build/i                // Trinity Tablets
              ], [VENDOR, MODEL, [TYPE, TABLET]], [

              /android.+[;\/]\s*TU_(1491)\s+build/i                               // Rotor Tablets
              ], [MODEL, [VENDOR, 'Rotor'], [TYPE, TABLET]], [

              /android.+(KS(.+))\s+build/i                                        // Amazon Kindle Tablets
              ], [MODEL, [VENDOR, 'Amazon'], [TYPE, TABLET]], [

              /android.+(Gigaset)[\s\-]+(Q\w{1,9})\s+build/i                      // Gigaset Tablets
              ], [VENDOR, MODEL, [TYPE, TABLET]], [

              /\s(tablet|tab)[;\/]/i,                                             // Unidentifiable Tablet
              /\s(mobile)(?:[;\/]|\ssafari)/i                                     // Unidentifiable Mobile
              ], [[TYPE, util.lowerize], VENDOR, MODEL], [

              /[\s\/\(](smart-?tv)[;\)]/i                                         // SmartTV
              ], [[TYPE, SMARTTV]], [

              /(android[\w\.\s\-]{0,9});.+build/i                                 // Generic Android Device
              ], [MODEL, [VENDOR, 'Generic']]


          /*//////////////////////////
              // TODO: move to string map
              ////////////////////////////

              /(C6603)/i                                                          // Sony Xperia Z C6603
              ], [[MODEL, 'Xperia Z C6603'], [VENDOR, 'Sony'], [TYPE, MOBILE]], [
              /(C6903)/i                                                          // Sony Xperia Z 1
              ], [[MODEL, 'Xperia Z 1'], [VENDOR, 'Sony'], [TYPE, MOBILE]], [

              /(SM-G900[F|H])/i                                                   // Samsung Galaxy S5
              ], [[MODEL, 'Galaxy S5'], [VENDOR, 'Samsung'], [TYPE, MOBILE]], [
              /(SM-G7102)/i                                                       // Samsung Galaxy Grand 2
              ], [[MODEL, 'Galaxy Grand 2'], [VENDOR, 'Samsung'], [TYPE, MOBILE]], [
              /(SM-G530H)/i                                                       // Samsung Galaxy Grand Prime
              ], [[MODEL, 'Galaxy Grand Prime'], [VENDOR, 'Samsung'], [TYPE, MOBILE]], [
              /(SM-G313HZ)/i                                                      // Samsung Galaxy V
              ], [[MODEL, 'Galaxy V'], [VENDOR, 'Samsung'], [TYPE, MOBILE]], [
              /(SM-T805)/i                                                        // Samsung Galaxy Tab S 10.5
              ], [[MODEL, 'Galaxy Tab S 10.5'], [VENDOR, 'Samsung'], [TYPE, TABLET]], [
              /(SM-G800F)/i                                                       // Samsung Galaxy S5 Mini
              ], [[MODEL, 'Galaxy S5 Mini'], [VENDOR, 'Samsung'], [TYPE, MOBILE]], [
              /(SM-T311)/i                                                        // Samsung Galaxy Tab 3 8.0
              ], [[MODEL, 'Galaxy Tab 3 8.0'], [VENDOR, 'Samsung'], [TYPE, TABLET]], [

              /(T3C)/i                                                            // Advan Vandroid T3C
              ], [MODEL, [VENDOR, 'Advan'], [TYPE, TABLET]], [
              /(ADVAN T1J\+)/i                                                    // Advan Vandroid T1J+
              ], [[MODEL, 'Vandroid T1J+'], [VENDOR, 'Advan'], [TYPE, TABLET]], [
              /(ADVAN S4A)/i                                                      // Advan Vandroid S4A
              ], [[MODEL, 'Vandroid S4A'], [VENDOR, 'Advan'], [TYPE, MOBILE]], [

              /(V972M)/i                                                          // ZTE V972M
              ], [MODEL, [VENDOR, 'ZTE'], [TYPE, MOBILE]], [

              /(i-mobile)\s(IQ\s[\d\.]+)/i                                        // i-mobile IQ
              ], [VENDOR, MODEL, [TYPE, MOBILE]], [
              /(IQ6.3)/i                                                          // i-mobile IQ IQ 6.3
              ], [[MODEL, 'IQ 6.3'], [VENDOR, 'i-mobile'], [TYPE, MOBILE]], [
              /(i-mobile)\s(i-style\s[\d\.]+)/i                                   // i-mobile i-STYLE
              ], [VENDOR, MODEL, [TYPE, MOBILE]], [
              /(i-STYLE2.1)/i                                                     // i-mobile i-STYLE 2.1
              ], [[MODEL, 'i-STYLE 2.1'], [VENDOR, 'i-mobile'], [TYPE, MOBILE]], [

              /(mobiistar touch LAI 512)/i                                        // mobiistar touch LAI 512
              ], [[MODEL, 'Touch LAI 512'], [VENDOR, 'mobiistar'], [TYPE, MOBILE]], [

              /////////////
              // END TODO
              ///////////*/

          ],

          engine : [[

              /windows.+\sedge\/([\w\.]+)/i                                       // EdgeHTML
              ], [VERSION, [NAME, 'EdgeHTML']], [

              /webkit\/537\.36.+chrome\/(?!27)/i                                  // Blink
              ], [[NAME, 'Blink']], [

              /(presto)\/([\w\.]+)/i,                                             // Presto
              /(webkit|trident|netfront|netsurf|amaya|lynx|w3m|goanna)\/([\w\.]+)/i,     
                                                                                  // WebKit/Trident/NetFront/NetSurf/Amaya/Lynx/w3m/Goanna
              /(khtml|tasman|links)[\/\s]\(?([\w\.]+)/i,                          // KHTML/Tasman/Links
              /(icab)[\/\s]([23]\.[\d\.]+)/i                                      // iCab
              ], [NAME, VERSION], [

              /rv\:([\w\.]{1,9}).+(gecko)/i                                       // Gecko
              ], [VERSION, NAME]
          ],

          os : [[

              // Windows based
              /microsoft\s(windows)\s(vista|xp)/i                                 // Windows (iTunes)
              ], [NAME, VERSION], [
              /(windows)\snt\s6\.2;\s(arm)/i,                                     // Windows RT
              /(windows\sphone(?:\sos)*)[\s\/]?([\d\.\s\w]*)/i,                   // Windows Phone
              /(windows\smobile|windows)[\s\/]?([ntce\d\.\s]+\w)/i
              ], [[NAME, mapper.str, maps.os.windows.name], [VERSION, mapper.str, maps.os.windows.version]], [
              /(win(?=3|9|n)|win\s9x\s)([nt\d\.]+)/i
              ], [[NAME, 'Windows'], [VERSION, mapper.str, maps.os.windows.version]], [

              // Mobile/Embedded OS
              /\((bb)(10);/i                                                      // BlackBerry 10
              ], [[NAME, 'BlackBerry'], VERSION], [
              /(blackberry)\w*\/?([\w\.]*)/i,                                     // Blackberry
              /(tizen)[\/\s]([\w\.]+)/i,                                          // Tizen
              /(android|webos|palm\sos|qnx|bada|rim\stablet\sos|meego|contiki)[\/\s-]?([\w\.]*)/i,
                                                                                  // Android/WebOS/Palm/QNX/Bada/RIM/MeeGo/Contiki
              /linux;.+(sailfish);/i                                              // Sailfish OS
              ], [NAME, VERSION], [
              /(symbian\s?os|symbos|s60(?=;))[\/\s-]?([\w\.]*)/i                  // Symbian
              ], [[NAME, 'Symbian'], VERSION], [
              /\((series40);/i                                                    // Series 40
              ], [NAME], [
              /mozilla.+\(mobile;.+gecko.+firefox/i                               // Firefox OS
              ], [[NAME, 'Firefox OS'], VERSION], [

              // Console
              /(nintendo|playstation)\s([wids34portablevu]+)/i,                   // Nintendo/Playstation

              // GNU/Linux based
              /(mint)[\/\s\(]?(\w*)/i,                                            // Mint
              /(mageia|vectorlinux)[;\s]/i,                                       // Mageia/VectorLinux
              /(joli|[kxln]?ubuntu|debian|suse|opensuse|gentoo|(?=\s)arch|slackware|fedora|mandriva|centos|pclinuxos|redhat|zenwalk|linpus)[\/\s-]?(?!chrom)([\w\.-]*)/i,
                                                                                  // Joli/Ubuntu/Debian/SUSE/Gentoo/Arch/Slackware
                                                                                  // Fedora/Mandriva/CentOS/PCLinuxOS/RedHat/Zenwalk/Linpus
              /(hurd|linux)\s?([\w\.]*)/i,                                        // Hurd/Linux
              /(gnu)\s?([\w\.]*)/i                                                // GNU
              ], [[NAME, 'Linux'], VERSION], [

              /(cros)\s[\w]+\s([\w\.]+\w)/i                                       // Chromium OS
              ], [[NAME, 'Chromium OS'], VERSION],[

              // Solaris
              /(sunos)\s?([\w\.\d]*)/i                                            // Solaris
              ], [[NAME, 'Solaris'], VERSION], [

              // BSD based
              /\s([frentopc-]{0,4}bsd|dragonfly)\s?([\w\.]*)/i                    // FreeBSD/NetBSD/OpenBSD/PC-BSD/DragonFly
              ], [[NAME, 'Linux'], VERSION],[

              /(iphone)(?:.*os\s*([\w]*)\slike\smac|;\sopera)/i                  // iOS
              ], [[NAME, 'iPhone'], [VERSION, /_/g, '.']], [

              /(ipad)(?:.*os\s*([\w]*)\slike\smac|;\sopera)/i                    // iOS
              ], [[NAME, 'iPad'], [VERSION, /_/g, '.']], [

              /(haiku)\s(\w+)/i                                                   // Haiku
              ], [NAME, VERSION],[

              /cfnetwork\/.+darwin/i,
              /ip[honead]{2,4}(?:.*os\s([\w]+)\slike\smac|;\sopera)/i             // iOS
              ], [[VERSION, /_/g, '.'], [NAME, 'iOS']], [

              /(mac\sos\sx)\s?([\w\s\.]*)/i,
              /(macintosh|mac(?=_powerpc)\s)/i                                    // Mac OS
              ], [[NAME, 'Mac'], [VERSION, /_/g, '.']], [

              // Other
              /((?:open)?solaris)[\/\s-]?([\w\.]*)/i,                             // Solaris
              /(aix)\s((\d)(?=\.|\)|\s)[\w\.])*/i,                                // AIX
              /(plan\s9|minix|beos|os\/2|amigaos|morphos|risc\sos|openvms|fuchsia)/i,
                                                                                  // Plan9/Minix/BeOS/OS2/AmigaOS/MorphOS/RISCOS/OpenVMS/Fuchsia
              /(unix)\s?([\w\.]*)/i                                               // UNIX
              ], [NAME, VERSION]
          ]
      };


      /////////////////
      // Constructor
      ////////////////
      /*
      var Browser = function (name, version) {
          this[NAME] = name;
          this[VERSION] = version;
      };
      var CPU = function (arch) {
          this[ARCHITECTURE] = arch;
      };
      var Device = function (vendor, model, type) {
          this[VENDOR] = vendor;
          this[MODEL] = model;
          this[TYPE] = type;
      };
      var Engine = Browser;
      var OS = Browser;
      */
      var UAParser = function (uastring, extensions) {

          if (typeof uastring === 'object') {
              extensions = uastring;
              uastring = undefined$1;
          }

          if (!(this instanceof UAParser)) {
              return new UAParser(uastring, extensions).getResult();
          }

          var ua = uastring || ((window && window.navigator && window.navigator.userAgent) ? window.navigator.userAgent : EMPTY);
          var rgxmap = extensions ? util.extend(regexes, extensions) : regexes;
          //var browser = new Browser();
          //var cpu = new CPU();
          //var device = new Device();
          //var engine = new Engine();
          //var os = new OS();

          this.getBrowser = function () {
              var browser = { name: undefined$1, version: undefined$1 };
              mapper.rgx.call(browser, ua, rgxmap.browser);
              browser.major = util.major(browser.version); // deprecated
              return browser;
          };
          this.getCPU = function () {
              var cpu = { architecture: undefined$1 };
              mapper.rgx.call(cpu, ua, rgxmap.cpu);
              return cpu;
          };
          this.getDevice = function () {
              var device = { vendor: undefined$1, model: undefined$1, type: undefined$1 };
              mapper.rgx.call(device, ua, rgxmap.device);
              return device;
          };
          this.getEngine = function () {
              var engine = { name: undefined$1, version: undefined$1 };
              mapper.rgx.call(engine, ua, rgxmap.engine);
              return engine;
          };
          this.getOS = function () {
              var os = { name: undefined$1, version: undefined$1 };
              mapper.rgx.call(os, ua, rgxmap.os);
              return os;
          };
          this.getResult = function () {
              return {
                  ua      : this.getUA(),
                  browser : this.getBrowser(),
                  engine  : this.getEngine(),
                  os      : this.getOS(),
                  device  : this.getDevice(),
                  cpu     : this.getCPU()
              };
          };
          this.getUA = function () {
              return ua;
          };
          this.setUA = function (uastring) {
              ua = uastring;
              //browser = new Browser();
              //cpu = new CPU();
              //device = new Device();
              //engine = new Engine();
              //os = new OS();
              return this;
          };
          return this;
      };

      UAParser.VERSION = LIBVERSION;
      UAParser.BROWSER = {
          NAME    : NAME,
          MAJOR   : MAJOR, // deprecated
          VERSION : VERSION
      };
      UAParser.CPU = {
          ARCHITECTURE : ARCHITECTURE
      };
      UAParser.DEVICE = {
          MODEL   : MODEL,
          VENDOR  : VENDOR,
          TYPE    : TYPE,
          CONSOLE : CONSOLE,
          MOBILE  : MOBILE,
          SMARTTV : SMARTTV,
          TABLET  : TABLET,
          WEARABLE: WEARABLE,
          EMBEDDED: EMBEDDED
      };
      UAParser.ENGINE = {
          NAME    : NAME,
          VERSION : VERSION
      };
      UAParser.OS = {
          NAME    : NAME,
          VERSION : VERSION
      };
      //UAParser.Utils = util;

      ///////////
      // Export
      //////////


      // check js environment
      {
          // nodejs env
          if (module.exports) {
              exports = module.exports = UAParser;
          }
          // TODO: test!!!!!!!!
          /*
          if (require && require.main === module && process) {
              // cli
              var jsonize = function (arr) {
                  var res = [];
                  for (var i in arr) {
                      res.push(new UAParser(arr[i]).getResult());
                  }
                  process.stdout.write(JSON.stringify(res, null, 2) + '\n');
              };
              if (process.stdin.isTTY) {
                  // via args
                  jsonize(process.argv.slice(2));
              } else {
                  // via pipe
                  var str = '';
                  process.stdin.on('readable', function() {
                      var read = process.stdin.read();
                      if (read !== null) {
                          str += read;
                      }
                  });
                  process.stdin.on('end', function () {
                      jsonize(str.replace(/\n$/, '').split('\n'));
                  });
              }
          }
          */
          exports.UAParser = UAParser;
      }

      // jQuery/Zepto specific (optional)
      // Note:
      //   In AMD env the global scope should be kept clean, but jQuery is an exception.
      //   jQuery always exports to global scope, unless jQuery.noConflict(true) is used,
      //   and we should catch that.
      var $ = window && (window.jQuery || window.Zepto);
      if (typeof $ !== UNDEF_TYPE && !$.ua) {
          var parser = new UAParser();
          $.ua = parser.getResult();
          $.ua.get = function () {
              return parser.getUA();
          };
          $.ua.set = function (uastring) {
              parser.setUA(uastring);
              var result = parser.getResult();
              for (var prop in result) {
                  $.ua[prop] = result[prop];
              }
          };
      }

  })(typeof window === 'object' ? window : commonjsGlobal);
  });
  var uaParser_1 = uaParser.UAParser;

  /* jshint bitwise: false, laxbreak: true */

  /**
   * Source: [jed's gist]{@link https://gist.github.com/982883}.
   * Returns a random v4 UUID of the form xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx,
   * where each x is replaced with a random hexadecimal digit from 0 to f, and
   * y is replaced with a random hexadecimal digit from 8 to b.
   * Used to generate UUIDs for deviceIds.
   * @private
   */
  var uuid = function uuid(a) {
    return a // if the placeholder was passed, return
    ? ( // a random number from 0 to 15
    a ^ // unless b is 8,
    Math.random() // in which case
    * 16 // a random number from
    >> a / 4 // 8 to 11
    ).toString(16) // in hexadecimal
    : ( // or otherwise a concatenated string:
    [1e7] + // 10000000 +
    -1e3 + // -1000 +
    -4e3 + // -4000 +
    -8e3 + // -80000000 +
    -1e11 // -100000000000,
    ).replace( // replacing
    /[018]/g, // zeroes, ones, and eights with
    uuid // random hex digits
    );
  };

  // A URL safe variation on the the list of Base64 characters 
  var base64Chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_';

  var base64Id = function base64Id() {
    var str = '';

    for (var i = 0; i < 22; ++i) {
      str += base64Chars.charAt(Math.floor(Math.random() * 64));
    }

    return str;
  };

  var version = "6.2.0";

  var getLanguage = function getLanguage() {
    return navigator && (navigator.languages && navigator.languages[0] || navigator.language || navigator.userLanguage) || '';
  };

  var language = {
    getLanguage: getLanguage
  };

  var platform = 'Web';

  var DEFAULT_OPTIONS = {
    apiEndpoint: 'api.amplitude.com',
    batchEvents: false,
    cookieExpiration: 365 * 10,
    cookieName: 'amplitude_id',
    // this is a deprecated option
    sameSiteCookie: 'None',
    cookieForceUpgrade: false,
    deferInitialization: false,
    disableCookies: false,
    deviceIdFromUrlParam: false,
    domain: '',
    eventUploadPeriodMillis: 30 * 1000,
    // 30s
    eventUploadThreshold: 30,
    forceHttps: true,
    includeGclid: false,
    includeReferrer: false,
    includeUtm: false,
    language: language.getLanguage(),
    logLevel: 'WARN',
    optOut: false,
    onError: function onError() {},
    platform: platform,
    savedMaxCount: 1000,
    saveEvents: true,
    saveParamsReferrerOncePerSession: true,
    secureCookie: false,
    sessionTimeout: 30 * 60 * 1000,
    trackingOptions: {
      city: true,
      country: true,
      carrier: true,
      device_manufacturer: true,
      device_model: true,
      dma: true,
      ip_address: true,
      language: true,
      os_name: true,
      os_version: true,
      platform: true,
      region: true,
      version_name: true
    },
    unsetParamsReferrerOnNewSession: false,
    unsentKey: 'amplitude_unsent',
    unsentIdentifyKey: 'amplitude_unsent_identify',
    uploadBatchSize: 100
  };

  var AsyncStorage;
  var DeviceInfo;
  /**
   * AmplitudeClient SDK API - instance constructor.
   * The Amplitude class handles creation of client instances, all you need to do is call amplitude.getInstance()
   * @constructor AmplitudeClient
   * @public
   * @example var amplitudeClient = new AmplitudeClient();
   */


  var AmplitudeClient = function AmplitudeClient(instanceName) {
    this._instanceName = utils.isEmptyString(instanceName) ? Constants.DEFAULT_INSTANCE : instanceName.toLowerCase();
    this._unsentEvents = [];
    this._unsentIdentifys = [];
    this._ua = new uaParser(navigator.userAgent).getResult();
    this.options = _objectSpread({}, DEFAULT_OPTIONS, {
      trackingOptions: _objectSpread({}, DEFAULT_OPTIONS.trackingOptions)
    });
    this.cookieStorage = new cookieStorage().getStorage();
    this._q = []; // queue for proxied functions before script load

    this._sending = false;
    this._updateScheduled = false;
    this._onInit = []; // event meta data

    this._eventId = 0;
    this._identifyId = 0;
    this._lastEventTime = null;
    this._newSession = false;
    this._sequenceNumber = 0;
    this._sessionId = null;
    this._isInitialized = false;
    this._userAgent = navigator && navigator.userAgent || null;
  };

  AmplitudeClient.prototype.Identify = Identify;
  AmplitudeClient.prototype.Revenue = Revenue;
  /**
   * Initializes the Amplitude Javascript SDK with your apiKey and any optional configurations.
   * This is required before any other methods can be called.
   * @public
   * @param {string} apiKey - The API key for your app.
   * @param {string} opt_userId - (optional) An identifier for this user.
   * @param {object} opt_config - (optional) Configuration options.
   * See [Readme]{@link https://github.com/amplitude/Amplitude-Javascript#configuration-options} for list of options and default values.
   * @param {function} opt_callback - (optional) Provide a callback function to run after initialization is complete.
   * @example amplitudeClient.init('API_KEY', 'USER_ID', {includeReferrer: true, includeUtm: true}, function() { alert('init complete'); });
   */

  AmplitudeClient.prototype.init = function init(apiKey, opt_userId, opt_config, opt_callback) {
    var _this = this;

    if (type(apiKey) !== 'string' || utils.isEmptyString(apiKey)) {
      utils.log.error('Invalid apiKey. Please re-initialize with a valid apiKey');
      return;
    }

    try {
      _parseConfig(this.options, opt_config);

      if (this.options.cookieName !== DEFAULT_OPTIONS.cookieName) {
        utils.log.warn('The cookieName option is deprecated. We will be ignoring it for newer cookies');
      }

      this.options.apiKey = apiKey;
      this._storageSuffix = '_' + apiKey + (this._instanceName === Constants.DEFAULT_INSTANCE ? '' : '_' + this._instanceName);
      this._storageSuffixV5 = apiKey.slice(0, 6);
      this._oldCookiename = this.options.cookieName + this._storageSuffix;
      this._unsentKey = this.options.unsentKey + this._storageSuffix;
      this._unsentIdentifyKey = this.options.unsentIdentifyKey + this._storageSuffix;
      this._cookieName = Constants.COOKIE_PREFIX + '_' + this._storageSuffixV5;
      this.cookieStorage.options({
        expirationDays: this.options.cookieExpiration,
        domain: this.options.domain,
        secure: this.options.secureCookie,
        sameSite: this.options.sameSiteCookie
      });
      this._metadataStorage = new MetadataStorage({
        storageKey: this._cookieName,
        disableCookies: this.options.disableCookies,
        expirationDays: this.options.cookieExpiration,
        domain: this.options.domain,
        secure: this.options.secureCookie,
        sameSite: this.options.sameSiteCookie
      });
      var hasOldCookie = !!this.cookieStorage.get(this._oldCookiename);
      var hasNewCookie = !!this._metadataStorage.load();
      this._useOldCookie = !hasNewCookie && hasOldCookie && !this.options.cookieForceUpgrade;
      var hasCookie = hasNewCookie || hasOldCookie;
      this.options.domain = this.cookieStorage.options().domain;

      if (this.options.deferInitialization && !hasCookie) {
        this._deferInitialization(apiKey, opt_userId, opt_config, opt_callback);

        return;
      }

      if (type(this.options.logLevel) === 'string') {
        utils.setLogLevel(this.options.logLevel);
      }

      var trackingOptions = _generateApiPropertiesTrackingConfig(this);

      this._apiPropertiesTrackingOptions = Object.keys(trackingOptions).length > 0 ? {
        tracking_options: trackingOptions
      } : {};

      if (this.options.cookieForceUpgrade && hasOldCookie) {
        if (!hasNewCookie) {
          _upgradeCookieData(this);
        }

        this.cookieStorage.remove(this._oldCookiename);
      }

      _loadCookieData(this);

      this._pendingReadStorage = true;

      var initFromStorage = function initFromStorage(deviceId) {
        // load deviceId and userId from input, or try to fetch existing value from cookie
        _this.options.deviceId = type(opt_config) === 'object' && type(opt_config.deviceId) === 'string' && !utils.isEmptyString(opt_config.deviceId) && opt_config.deviceId || _this.options.deviceIdFromUrlParam && _this._getDeviceIdFromUrlParam(_this._getUrlParams()) || _this.options.deviceId || deviceId || base64Id();
        _this.options.userId = type(opt_userId) === 'string' && !utils.isEmptyString(opt_userId) && opt_userId || type(opt_userId) === 'number' && opt_userId.toString() || _this.options.userId || null;
        var now = new Date().getTime();

        if (!_this._sessionId || !_this._lastEventTime || now - _this._lastEventTime > _this.options.sessionTimeout) {
          if (_this.options.unsetParamsReferrerOnNewSession) {
            _this._unsetUTMParams();
          }

          _this._newSession = true;
          _this._sessionId = now; // only capture UTM params and referrer if new session

          if (_this.options.saveParamsReferrerOncePerSession) {
            _this._trackParamsAndReferrer();
          }
        }

        if (!_this.options.saveParamsReferrerOncePerSession) {
          _this._trackParamsAndReferrer();
        } // load unsent events and identifies before any attempt to log new ones


        if (_this.options.saveEvents) {
          _validateUnsentEventQueue(_this._unsentEvents);

          _validateUnsentEventQueue(_this._unsentIdentifys);
        }

        _this._lastEventTime = now;

        _saveCookieData(_this);

        _this._pendingReadStorage = false;

        _this._sendEventsIfReady(); // try sending unsent events


        for (var i = 0; i < _this._onInit.length; i++) {
          _this._onInit[i](_this);
        }

        _this._onInit = [];
        _this._isInitialized = true;
      };

      if (AsyncStorage) {
        this._migrateUnsentEvents(function () {
          Promise.all([AsyncStorage.getItem(_this._storageSuffix), AsyncStorage.getItem(_this.options.unsentKey + _this._storageSuffix), AsyncStorage.getItem(_this.options.unsentIdentifyKey + _this._storageSuffix)]).then(function (values) {
            if (values[0]) {
              var cookieData = JSON.parse(values[0]);

              if (cookieData) {
                _loadCookieDataProps(_this, cookieData);
              }
            }

            if (_this.options.saveEvents) {
              _this._unsentEvents = _this._parseSavedUnsentEventsString(values[1]).map(function (event) {
                return {
                  event: event
                };
              }).concat(_this._unsentEvents);
              _this._unsentIdentifys = _this._parseSavedUnsentEventsString(values[2]).map(function (event) {
                return {
                  event: event
                };
              }).concat(_this._unsentIdentifys);
            }

            if (DeviceInfo) {
              Promise.all([DeviceInfo.getCarrier(), DeviceInfo.getModel(), DeviceInfo.getManufacturer(), DeviceInfo.getVersion(), DeviceInfo.getUniqueId()]).then(function (values) {
                _this.deviceInfo = {
                  carrier: values[0],
                  model: values[1],
                  manufacturer: values[2],
                  version: values[3]
                };
                initFromStorage(values[4]);

                _this.runQueuedFunctions();

                if (type(opt_callback) === 'function') {
                  opt_callback(_this);
                }
              }).catch(function (err) {
                _this.options.onError(err);
              });
            } else {
              initFromStorage();

              _this.runQueuedFunctions();
            }
          }).catch(function (err) {
            _this.options.onError(err);
          });
        });
      } else {
        if (this.options.saveEvents) {
          this._unsentEvents = this._loadSavedUnsentEvents(this.options.unsentKey).map(function (event) {
            return {
              event: event
            };
          }).concat(this._unsentEvents);
          this._unsentIdentifys = this._loadSavedUnsentEvents(this.options.unsentIdentifyKey).map(function (event) {
            return {
              event: event
            };
          }).concat(this._unsentIdentifys);
        }

        initFromStorage();
        this.runQueuedFunctions();

        if (type(opt_callback) === 'function') {
          opt_callback(this);
        }
      }
    } catch (err) {
      utils.log.error(err);
      this.options.onError(err);
    }
  }; // validate properties for unsent events


  var _validateUnsentEventQueue = function _validateUnsentEventQueue(queue) {
    for (var i = 0; i < queue.length; i++) {
      var userProperties = queue[i].event.user_properties;
      var eventProperties = queue[i].event.event_properties;
      var groups = queue[i].event.groups;
      queue[i].event.user_properties = utils.validateProperties(userProperties);
      queue[i].event.event_properties = utils.validateProperties(eventProperties);
      queue[i].event.groups = utils.validateGroups(groups);
    }
  };
  /**
   * @private
   */


  AmplitudeClient.prototype._migrateUnsentEvents = function _migrateUnsentEvents(cb) {
    var _this2 = this;

    Promise.all([AsyncStorage.getItem(this.options.unsentKey), AsyncStorage.getItem(this.options.unsentIdentifyKey)]).then(function (values) {
      if (_this2.options.saveEvents) {
        var unsentEventsString = values[0];
        var unsentIdentifyKey = values[1];
        var itemsToSet = [];
        var itemsToRemove = [];

        if (!!unsentEventsString) {
          itemsToSet.push(AsyncStorage.setItem(_this2.options.unsentKey + _this2._storageSuffix, JSON.stringify(unsentEventsString)));
          itemsToRemove.push(AsyncStorage.removeItem(_this2.options.unsentKey));
        }

        if (!!unsentIdentifyKey) {
          itemsToSet.push(AsyncStorage.setItem(_this2.options.unsentIdentifyKey + _this2._storageSuffix, JSON.stringify(unsentIdentifyKey)));
          itemsToRemove.push(AsyncStorage.removeItem(_this2.options.unsentIdentifyKey));
        }

        if (itemsToSet.length > 0) {
          Promise.all(itemsToSet).then(function () {
          }).catch(function (err) {
            _this2.options.onError(err);
          });
        }
      }
    }).then(cb).catch(function (err) {
      _this2.options.onError(err);
    });
  };
  /**
   * @private
   */


  AmplitudeClient.prototype._trackParamsAndReferrer = function _trackParamsAndReferrer() {
    if (this.options.includeUtm) {
      this._initUtmData();
    }

    if (this.options.includeReferrer) {
      this._saveReferrer(this._getReferrer());
    }

    if (this.options.includeGclid) {
      this._saveGclid(this._getUrlParams());
    }
  };
  /**
   * Parse and validate user specified config values and overwrite existing option value
   * DEFAULT_OPTIONS provides list of all config keys that are modifiable, as well as expected types for values
   * @private
   */


  var _parseConfig = function _parseConfig(options, config) {
    if (type(config) !== 'object') {
      return;
    } // validates config value is defined, is the correct type, and some additional value sanity checks


    var parseValidateAndLoad = function parseValidateAndLoad(key) {
      if (!options.hasOwnProperty(key)) {
        return; // skip bogus config values
      }

      var inputValue = config[key];
      var expectedType = type(options[key]);

      if (!utils.validateInput(inputValue, key + ' option', expectedType)) {
        return;
      }

      if (expectedType === 'boolean') {
        options[key] = !!inputValue;
      } else if (expectedType === 'string' && !utils.isEmptyString(inputValue) || expectedType === 'number' && inputValue > 0) {
        options[key] = inputValue;
      } else if (expectedType === 'object') {
        _parseConfig(options[key], inputValue);
      }
    };

    for (var key in config) {
      if (config.hasOwnProperty(key)) {
        parseValidateAndLoad(key);
      }
    }
  };
  /**
   * Run functions queued up by proxy loading snippet
   * @private
   */


  AmplitudeClient.prototype.runQueuedFunctions = function () {
    var queue = this._q;
    this._q = [];

    for (var i = 0; i < queue.length; i++) {
      var fn = this[queue[i][0]];

      if (type(fn) === 'function') {
        fn.apply(this, queue[i].slice(1));
      }
    }
  };
  /**
   * Check that the apiKey is set before calling a function. Logs a warning message if not set.
   * @private
   */


  AmplitudeClient.prototype._apiKeySet = function _apiKeySet(methodName) {
    if (utils.isEmptyString(this.options.apiKey)) {
      utils.log.error('Invalid apiKey. Please set a valid apiKey with init() before calling ' + methodName);
      return false;
    }

    return true;
  };
  /**
   * Load saved events from localStorage. JSON deserializes event array. Handles case where string is corrupted.
   * @private
   */


  AmplitudeClient.prototype._loadSavedUnsentEvents = function _loadSavedUnsentEvents(unsentKey) {
    var savedUnsentEventsString = this._getFromStorage(localStorage$1, unsentKey);

    var unsentEvents = this._parseSavedUnsentEventsString(savedUnsentEventsString, unsentKey);

    this._setInStorage(localStorage$1, unsentKey, JSON.stringify(unsentEvents));

    return unsentEvents;
  };
  /**
   * Load saved events from localStorage. JSON deserializes event array. Handles case where string is corrupted.
   * @private
   */


  AmplitudeClient.prototype._parseSavedUnsentEventsString = function _parseSavedUnsentEventsString(savedUnsentEventsString, unsentKey) {
    if (utils.isEmptyString(savedUnsentEventsString)) {
      return []; // new app, does not have any saved events
    }

    if (type(savedUnsentEventsString) === 'string') {
      try {
        var events = JSON.parse(savedUnsentEventsString);

        if (type(events) === 'array') {
          // handle case where JSON dumping of unsent events is corrupted
          return events;
        }
      } catch (e) {}
    }

    utils.log.error('Unable to load ' + unsentKey + ' events. Restart with a new empty queue.');
    return [];
  };
  /**
   * Returns true if a new session was created during initialization, otherwise false.
   * @public
   * @return {boolean} Whether a new session was created during initialization.
   */


  AmplitudeClient.prototype.isNewSession = function isNewSession() {
    return this._newSession;
  };
  /**
   * Store callbacks to call after init
   * @private
   */


  AmplitudeClient.prototype.onInit = function (callback) {
    if (this._isInitialized) {
      callback();
    } else {
      this._onInit.push(callback);
    }
  };
  /**
   * Returns the id of the current session.
   * @public
   * @return {number} Id of the current session.
   */


  AmplitudeClient.prototype.getSessionId = function getSessionId() {
    return this._sessionId;
  };
  /**
   * Increments the eventId and returns it.
   * @private
   */


  AmplitudeClient.prototype.nextEventId = function nextEventId() {
    this._eventId++;
    return this._eventId;
  };
  /**
   * Increments the identifyId and returns it.
   * @private
   */


  AmplitudeClient.prototype.nextIdentifyId = function nextIdentifyId() {
    this._identifyId++;
    return this._identifyId;
  };
  /**
   * Increments the sequenceNumber and returns it.
   * @private
   */


  AmplitudeClient.prototype.nextSequenceNumber = function nextSequenceNumber() {
    this._sequenceNumber++;
    return this._sequenceNumber;
  };
  /**
   * Returns the total count of unsent events and identifys
   * @private
   */


  AmplitudeClient.prototype._unsentCount = function _unsentCount() {
    return this._unsentEvents.length + this._unsentIdentifys.length;
  };
  /**
   * Send events if ready. Returns true if events are sent.
   * @private
   */


  AmplitudeClient.prototype._sendEventsIfReady = function _sendEventsIfReady() {
    if (this._unsentCount() === 0) {
      return false;
    } // if batching disabled, send any unsent events immediately


    if (!this.options.batchEvents) {
      this.sendEvents();
      return true;
    } // if batching enabled, check if min threshold met for batch size


    if (this._unsentCount() >= this.options.eventUploadThreshold) {
      this.sendEvents();
      return true;
    } // otherwise schedule an upload after 30s


    if (!this._updateScheduled) {
      // make sure we only schedule 1 upload
      this._updateScheduled = true;
      setTimeout(function () {
        this._updateScheduled = false;
        this.sendEvents();
      }.bind(this), this.options.eventUploadPeriodMillis);
    }

    return false; // an upload was scheduled, no events were uploaded
  };
  /**
   * Helper function to fetch values from storage
   * Storage argument allows for localStoraoge and sessionStoraoge
   * @private
   */


  AmplitudeClient.prototype._getFromStorage = function _getFromStorage(storage, key) {
    return storage.getItem(key + this._storageSuffix);
  };
  /**
   * Helper function to set values in storage
   * Storage argument allows for localStoraoge and sessionStoraoge
   * @private
   */


  AmplitudeClient.prototype._setInStorage = function _setInStorage(storage, key, value) {
    storage.setItem(key + this._storageSuffix, value);
  };
  /**
   * Fetches deviceId, userId, event meta data from amplitude cookie
   * @private
   */


  var _loadCookieData = function _loadCookieData(scope) {
    if (!scope._useOldCookie) {
      var props = scope._metadataStorage.load();

      if (type(props) === 'object') {
        _loadCookieDataProps(scope, props);
      }

      return;
    }

    var cookieData = scope.cookieStorage.get(scope._oldCookiename);

    if (type(cookieData) === 'object') {
      _loadCookieDataProps(scope, cookieData);

      return;
    }
  };

  var _upgradeCookieData = function _upgradeCookieData(scope) {
    var cookieData = scope.cookieStorage.get(scope._oldCookiename);

    if (type(cookieData) === 'object') {
      _loadCookieDataProps(scope, cookieData);

      _saveCookieData(scope);
    }
  };

  var _loadCookieDataProps = function _loadCookieDataProps(scope, cookieData) {
    if (cookieData.deviceId) {
      scope.options.deviceId = cookieData.deviceId;
    }

    if (cookieData.userId) {
      scope.options.userId = cookieData.userId;
    }

    if (cookieData.optOut !== null && cookieData.optOut !== undefined) {
      // Do not clobber config opt out value if cookieData has optOut as false
      if (cookieData.optOut !== false) {
        scope.options.optOut = cookieData.optOut;
      }
    }

    if (cookieData.sessionId) {
      scope._sessionId = parseInt(cookieData.sessionId, 10);
    }

    if (cookieData.lastEventTime) {
      scope._lastEventTime = parseInt(cookieData.lastEventTime, 10);
    }

    if (cookieData.eventId) {
      scope._eventId = parseInt(cookieData.eventId, 10);
    }

    if (cookieData.identifyId) {
      scope._identifyId = parseInt(cookieData.identifyId, 10);
    }

    if (cookieData.sequenceNumber) {
      scope._sequenceNumber = parseInt(cookieData.sequenceNumber, 10);
    }
  };
  /**
   * Saves deviceId, userId, event meta data to amplitude cookie
   * @private
   */


  var _saveCookieData = function _saveCookieData(scope) {
    var cookieData = {
      deviceId: scope.options.deviceId,
      userId: scope.options.userId,
      optOut: scope.options.optOut,
      sessionId: scope._sessionId,
      lastEventTime: scope._lastEventTime,
      eventId: scope._eventId,
      identifyId: scope._identifyId,
      sequenceNumber: scope._sequenceNumber
    };

    if (AsyncStorage) {
      AsyncStorage.setItem(scope._storageSuffix, JSON.stringify(cookieData));
    }

    if (scope._useOldCookie) {
      scope.cookieStorage.set(scope.options.cookieName + scope._storageSuffix, cookieData);
    } else {
      scope._metadataStorage.save(cookieData);
    }
  };
  /**
   * Parse the utm properties out of cookies and query for adding to user properties.
   * @private
   */


  AmplitudeClient.prototype._initUtmData = function _initUtmData(queryParams, cookieParams) {
    queryParams = queryParams || this._getUrlParams();
    cookieParams = cookieParams || this.cookieStorage.get('__utmz');
    var utmProperties = getUtmData(cookieParams, queryParams);

    _sendParamsReferrerUserProperties(this, utmProperties);
  };
  /**
   * Unset the utm params from the Amplitude instance and update the identify.
   * @private
   */


  AmplitudeClient.prototype._unsetUTMParams = function _unsetUTMParams() {
    var identify = new Identify();
    identify.unset(Constants.REFERRER);
    identify.unset(Constants.UTM_SOURCE);
    identify.unset(Constants.UTM_MEDIUM);
    identify.unset(Constants.UTM_CAMPAIGN);
    identify.unset(Constants.UTM_TERM);
    identify.unset(Constants.UTM_CONTENT);
    this.identify(identify);
  };
  /**
   * The calling function should determine when it is appropriate to send these user properties. This function
   * will no longer contain any session storage checking logic.
   * @private
   */


  var _sendParamsReferrerUserProperties = function _sendParamsReferrerUserProperties(scope, userProperties) {
    if (type(userProperties) !== 'object' || Object.keys(userProperties).length === 0) {
      return;
    } // setOnce the initial user properties


    var identify = new Identify();

    for (var key in userProperties) {
      if (userProperties.hasOwnProperty(key)) {
        identify.setOnce('initial_' + key, userProperties[key]);
        identify.set(key, userProperties[key]);
      }
    }

    scope.identify(identify);
  };
  /**
   * @private
   */


  AmplitudeClient.prototype._getReferrer = function _getReferrer() {
    return document.referrer;
  };
  /**
   * @private
   */


  AmplitudeClient.prototype._getUrlParams = function _getUrlParams() {
    return location.search;
  };
  /**
   * Try to fetch Google Gclid from url params.
   * @private
   */


  AmplitudeClient.prototype._saveGclid = function _saveGclid(urlParams) {
    var gclid = utils.getQueryParam('gclid', urlParams);

    if (utils.isEmptyString(gclid)) {
      return;
    }

    var gclidProperties = {
      'gclid': gclid
    };

    _sendParamsReferrerUserProperties(this, gclidProperties);
  };
  /**
   * Try to fetch Amplitude device id from url params.
   * @private
   */


  AmplitudeClient.prototype._getDeviceIdFromUrlParam = function _getDeviceIdFromUrlParam(urlParams) {
    return utils.getQueryParam(Constants.AMP_DEVICE_ID_PARAM, urlParams);
  };
  /**
   * Parse the domain from referrer info
   * @private
   */


  AmplitudeClient.prototype._getReferringDomain = function _getReferringDomain(referrer) {
    if (utils.isEmptyString(referrer)) {
      return null;
    }

    var parts = referrer.split('/');

    if (parts.length >= 3) {
      return parts[2];
    }

    return null;
  };
  /**
   * Fetch the referrer information, parse the domain and send.
   * Since user properties are propagated on the server, only send once per session, don't need to send with every event
   * @private
   */


  AmplitudeClient.prototype._saveReferrer = function _saveReferrer(referrer) {
    if (utils.isEmptyString(referrer)) {
      return;
    }

    var referrerInfo = {
      'referrer': referrer,
      'referring_domain': this._getReferringDomain(referrer)
    };

    _sendParamsReferrerUserProperties(this, referrerInfo);
  };
  /**
   * Saves unsent events and identifies to localStorage. JSON stringifies event queues before saving.
   * Note: this is called automatically every time events are logged, unless you explicitly set option saveEvents to false.
   * @private
   */


  AmplitudeClient.prototype.saveEvents = function saveEvents() {
    try {
      var serializedUnsentEvents = JSON.stringify(this._unsentEvents.map(function (_ref) {
        var event = _ref.event;
        return event;
      }));

      if (AsyncStorage) {
        AsyncStorage.setItem(this.options.unsentKey + this._storageSuffix, serializedUnsentEvents);
      } else {
        this._setInStorage(localStorage$1, this.options.unsentKey, serializedUnsentEvents);
      }
    } catch (e) {}

    try {
      var serializedIdentifys = JSON.stringify(this._unsentIdentifys.map(function (unsentIdentify) {
        return unsentIdentify.event;
      }));

      if (AsyncStorage) {
        AsyncStorage.setItem(this.options.unsentIdentifyKey + this._storageSuffix, serializedIdentifys);
      } else {
        this._setInStorage(localStorage$1, this.options.unsentIdentifyKey, serializedIdentifys);
      }
    } catch (e) {}
  };
  /**
   * Sets a customer domain for the amplitude cookie. Useful if you want to support cross-subdomain tracking.
   * @public
   * @param {string} domain to set.
   * @example amplitudeClient.setDomain('.amplitude.com');
   */


  AmplitudeClient.prototype.setDomain = function setDomain(domain) {
    if (this._shouldDeferCall()) {
      return this._q.push(['setDomain'].concat(Array.prototype.slice.call(arguments, 0)));
    }

    if (!utils.validateInput(domain, 'domain', 'string')) {
      return;
    }

    try {
      this.cookieStorage.options({
        expirationDays: this.options.cookieExpiration,
        secure: this.options.secureCookie,
        domain: domain,
        sameSite: this.options.sameSiteCookie
      });
      this.options.domain = this.cookieStorage.options().domain;

      _loadCookieData(this);

      _saveCookieData(this);
    } catch (e) {
      utils.log.error(e);
    }
  };
  /**
   * Sets an identifier for the current user.
   * @public
   * @param {string} userId - identifier to set. Can be null.
   * @example amplitudeClient.setUserId('joe@gmail.com');
   */


  AmplitudeClient.prototype.setUserId = function setUserId(userId) {
    if (this._shouldDeferCall()) {
      return this._q.push(['setUserId'].concat(Array.prototype.slice.call(arguments, 0)));
    }

    try {
      this.options.userId = userId !== undefined && userId !== null && '' + userId || null;

      _saveCookieData(this);
    } catch (e) {
      utils.log.error(e);
    }
  };
  /**
   * Add user to a group or groups. You need to specify a groupType and groupName(s).
   * For example you can group people by their organization.
   * In that case groupType is "orgId" and groupName would be the actual ID(s).
   * groupName can be a string or an array of strings to indicate a user in multiple gruups.
   * You can also call setGroup multiple times with different groupTypes to track multiple types of groups (up to 5 per app).
   * Note: this will also set groupType: groupName as a user property.
   * See the [SDK Readme]{@link https://github.com/amplitude/Amplitude-Javascript#setting-groups} for more information.
   * @public
   * @param {string} groupType - the group type (ex: orgId)
   * @param {string|list} groupName - the name of the group (ex: 15), or a list of names of the groups
   * @example amplitudeClient.setGroup('orgId', 15); // this adds the current user to orgId 15.
   */


  AmplitudeClient.prototype.setGroup = function (groupType, groupName) {
    if (this._shouldDeferCall()) {
      return this._q.push(['setGroup'].concat(Array.prototype.slice.call(arguments, 0)));
    }

    if (!this._apiKeySet('setGroup()') || !utils.validateInput(groupType, 'groupType', 'string') || utils.isEmptyString(groupType)) {
      return;
    }

    var groups = {};
    groups[groupType] = groupName;
    var identify = new Identify().set(groupType, groupName);

    this._logEvent(Constants.IDENTIFY_EVENT, null, null, identify.userPropertiesOperations, groups, null, null, null);
  };
  /**
   * Sets whether to opt current user out of tracking.
   * @public
   * @param {boolean} enable - if true then no events will be logged or sent.
   * @example: amplitude.setOptOut(true);
   */


  AmplitudeClient.prototype.setOptOut = function setOptOut(enable) {
    if (this._shouldDeferCall()) {
      return this._q.push(['setOptOut'].concat(Array.prototype.slice.call(arguments, 0)));
    }

    if (!utils.validateInput(enable, 'enable', 'boolean')) {
      return;
    }

    try {
      this.options.optOut = enable;

      _saveCookieData(this);
    } catch (e) {
      utils.log.error(e);
    }
  };

  AmplitudeClient.prototype.setSessionId = function setSessionId(sessionId) {
    if (!utils.validateInput(sessionId, 'sessionId', 'number')) {
      return;
    }

    try {
      this._sessionId = sessionId;

      _saveCookieData(this);
    } catch (e) {
      utils.log.error(e);
    }
  };

  AmplitudeClient.prototype.resetSessionId = function resetSessionId() {
    this.setSessionId(new Date().getTime());
  };
  /**
    * Regenerates a new random deviceId for current user. Note: this is not recommended unless you know what you
    * are doing. This can be used in conjunction with `setUserId(null)` to anonymize users after they log out.
    * With a null userId and a completely new deviceId, the current user would appear as a brand new user in dashboard.
    * This uses src/uuid.js to regenerate the deviceId.
    * @public
    */


  AmplitudeClient.prototype.regenerateDeviceId = function regenerateDeviceId() {
    if (this._shouldDeferCall()) {
      return this._q.push(['regenerateDeviceId'].concat(Array.prototype.slice.call(arguments, 0)));
    }

    this.setDeviceId(base64Id());
  };
  /**
    * Sets a custom deviceId for current user. Note: this is not recommended unless you know what you are doing
    * (like if you have your own system for managing deviceIds). Make sure the deviceId you set is sufficiently unique
    * (we recommend something like a UUID - see src/uuid.js for an example of how to generate) to prevent conflicts with other devices in our system.
    * @public
    * @param {string} deviceId - custom deviceId for current user.
    * @example amplitudeClient.setDeviceId('45f0954f-eb79-4463-ac8a-233a6f45a8f0');
    */


  AmplitudeClient.prototype.setDeviceId = function setDeviceId(deviceId) {
    if (this._shouldDeferCall()) {
      return this._q.push(['setDeviceId'].concat(Array.prototype.slice.call(arguments, 0)));
    }

    if (!utils.validateInput(deviceId, 'deviceId', 'string')) {
      return;
    }

    try {
      if (!utils.isEmptyString(deviceId)) {
        this.options.deviceId = '' + deviceId;

        _saveCookieData(this);
      }
    } catch (e) {
      utils.log.error(e);
    }
  };
  /**
   * Sets user properties for the current user.
   * @public
   * @param {object} - object with string keys and values for the user properties to set.
   * @param {boolean} - DEPRECATED opt_replace: in earlier versions of the JS SDK the user properties object was kept in
   * memory and replace = true would replace the object in memory. Now the properties are no longer stored in memory, so replace is deprecated.
   * @example amplitudeClient.setUserProperties({'gender': 'female', 'sign_up_complete': true})
   */


  AmplitudeClient.prototype.setUserProperties = function setUserProperties(userProperties) {
    if (this._shouldDeferCall()) {
      return this._q.push(['setUserProperties'].concat(Array.prototype.slice.call(arguments, 0)));
    }

    if (!this._apiKeySet('setUserProperties()') || !utils.validateInput(userProperties, 'userProperties', 'object')) {
      return;
    } // sanitize the userProperties dict before converting into identify


    var sanitized = utils.truncate(utils.validateProperties(userProperties));

    if (Object.keys(sanitized).length === 0) {
      return;
    } // convert userProperties into an identify call


    var identify = new Identify();

    for (var property in sanitized) {
      if (sanitized.hasOwnProperty(property)) {
        identify.set(property, sanitized[property]);
      }
    }

    this.identify(identify);
  };
  /**
   * Clear all of the user properties for the current user. Note: clearing user properties is irreversible!
   * @public
   * @example amplitudeClient.clearUserProperties();
   */


  AmplitudeClient.prototype.clearUserProperties = function clearUserProperties() {
    if (this._shouldDeferCall()) {
      return this._q.push(['clearUserProperties'].concat(Array.prototype.slice.call(arguments, 0)));
    }

    if (!this._apiKeySet('clearUserProperties()')) {
      return;
    }

    var identify = new Identify();
    identify.clearAll();
    this.identify(identify);
  };
  /**
   * Applies the proxied functions on the proxied object to an instance of the real object.
   * Used to convert proxied Identify and Revenue objects.
   * @private
   */


  var _convertProxyObjectToRealObject = function _convertProxyObjectToRealObject(instance, proxy) {
    for (var i = 0; i < proxy._q.length; i++) {
      var fn = instance[proxy._q[i][0]];

      if (type(fn) === 'function') {
        fn.apply(instance, proxy._q[i].slice(1));
      }
    }

    return instance;
  };
  /**
   * Send an identify call containing user property operations to Amplitude servers.
   * See [Readme]{@link https://github.com/amplitude/Amplitude-Javascript#user-properties-and-user-property-operations}
   * for more information on the Identify API and user property operations.
   * @param {Identify} identify_obj - the Identify object containing the user property operations to send.
   * @param {Amplitude~eventCallback} opt_callback - (optional) callback function to run when the identify event has been sent.
   * Note: the server response code and response body from the identify event upload are passed to the callback function.
   * @example
   * var identify = new amplitude.Identify().set('colors', ['rose', 'gold']).add('karma', 1).setOnce('sign_up_date', '2016-03-31');
   * amplitude.identify(identify);
   */


  AmplitudeClient.prototype.identify = function (identify_obj, opt_callback) {
    if (this._shouldDeferCall()) {
      return this._q.push(['identify'].concat(Array.prototype.slice.call(arguments, 0)));
    }

    if (!this._apiKeySet('identify()')) {
      if (type(opt_callback) === 'function') {
        opt_callback(0, 'No request sent', {
          reason: 'API key is not set'
        });
      }

      return;
    } // if identify input is a proxied object created by the async loading snippet, convert it into an identify object


    if (type(identify_obj) === 'object' && identify_obj.hasOwnProperty('_q')) {
      identify_obj = _convertProxyObjectToRealObject(new Identify(), identify_obj);
    }

    if (identify_obj instanceof Identify) {
      // only send if there are operations
      if (Object.keys(identify_obj.userPropertiesOperations).length > 0) {
        return this._logEvent(Constants.IDENTIFY_EVENT, null, null, identify_obj.userPropertiesOperations, null, null, null, opt_callback);
      } else {
        if (type(opt_callback) === 'function') {
          opt_callback(0, 'No request sent', {
            reason: 'No user property operations'
          });
        }
      }
    } else {
      utils.log.error('Invalid identify input type. Expected Identify object but saw ' + type(identify_obj));

      if (type(opt_callback) === 'function') {
        opt_callback(0, 'No request sent', {
          reason: 'Invalid identify input type'
        });
      }
    }
  };

  AmplitudeClient.prototype.groupIdentify = function (group_type, group_name, identify_obj, opt_callback) {
    if (this._shouldDeferCall()) {
      return this._q.push(['groupIdentify'].concat(Array.prototype.slice.call(arguments, 0)));
    }

    if (!this._apiKeySet('groupIdentify()')) {
      if (type(opt_callback) === 'function') {
        opt_callback(0, 'No request sent', {
          reason: 'API key is not set'
        });
      }

      return;
    }

    if (!utils.validateInput(group_type, 'group_type', 'string') || utils.isEmptyString(group_type)) {
      if (type(opt_callback) === 'function') {
        opt_callback(0, 'No request sent', {
          reason: 'Invalid group type'
        });
      }

      return;
    }

    if (group_name === null || group_name === undefined) {
      if (type(opt_callback) === 'function') {
        opt_callback(0, 'No request sent', {
          reason: 'Invalid group name'
        });
      }

      return;
    } // if identify input is a proxied object created by the async loading snippet, convert it into an identify object


    if (type(identify_obj) === 'object' && identify_obj.hasOwnProperty('_q')) {
      identify_obj = _convertProxyObjectToRealObject(new Identify(), identify_obj);
    }

    if (identify_obj instanceof Identify) {
      // only send if there are operations
      if (Object.keys(identify_obj.userPropertiesOperations).length > 0) {
        return this._logEvent(Constants.GROUP_IDENTIFY_EVENT, null, null, null, _defineProperty({}, group_type, group_name), identify_obj.userPropertiesOperations, null, opt_callback);
      } else {
        if (type(opt_callback) === 'function') {
          opt_callback(0, 'No request sent', {
            reason: 'No group property operations'
          });
        }
      }
    } else {
      utils.log.error('Invalid identify input type. Expected Identify object but saw ' + type(identify_obj));

      if (type(opt_callback) === 'function') {
        opt_callback(0, 'No request sent', {
          reason: 'Invalid identify input type'
        });
      }
    }
  };
  /**
   * Set a versionName for your application.
   * @public
   * @param {string} versionName - The version to set for your application.
   * @example amplitudeClient.setVersionName('1.12.3');
   */


  AmplitudeClient.prototype.setVersionName = function setVersionName(versionName) {
    if (this._shouldDeferCall()) {
      return this._q.push(['setVersionName'].concat(Array.prototype.slice.call(arguments, 0)));
    }

    if (!utils.validateInput(versionName, 'versionName', 'string')) {
      return;
    }

    this.options.versionName = versionName;
  };
  /**
   * Private logEvent method. Keeps apiProperties from being publicly exposed.
   * @private
   */


  AmplitudeClient.prototype._logEvent = function _logEvent(eventType, eventProperties, apiProperties, userProperties, groups, groupProperties, timestamp, callback) {
    {
      _loadCookieData(this); // reload cookie before each log event to sync event meta-data between windows and tabs

    }

    if (!eventType) {
      if (type(callback) === 'function') {
        callback(0, 'No request sent', {
          reason: 'Missing eventType'
        });
      }

      return;
    }

    if (this.options.optOut) {
      if (type(callback) === 'function') {
        callback(0, 'No request sent', {
          reason: 'optOut is set to true'
        });
      }

      return;
    }

    try {
      var eventId;

      if (eventType === Constants.IDENTIFY_EVENT || eventType === Constants.GROUP_IDENTIFY_EVENT) {
        eventId = this.nextIdentifyId();
      } else {
        eventId = this.nextEventId();
      }

      var sequenceNumber = this.nextSequenceNumber();
      var eventTime = type(timestamp) === 'number' ? timestamp : new Date().getTime();

      if (!this._sessionId || !this._lastEventTime || eventTime - this._lastEventTime > this.options.sessionTimeout) {
        this._sessionId = eventTime;
      }

      this._lastEventTime = eventTime;

      _saveCookieData(this);

      var osName = this._ua.browser.name;
      var osVersion = this._ua.browser.major;
      var deviceModel = this._ua.device.model;
      var deviceManufacturer = this._ua.device.vendor;
      var versionName;
      var carrier;

      userProperties = userProperties || {};

      var trackingOptions = _objectSpread({}, this._apiPropertiesTrackingOptions);

      apiProperties = _objectSpread({}, apiProperties || {}, trackingOptions);
      eventProperties = eventProperties || {};
      groups = groups || {};
      groupProperties = groupProperties || {};
      var event = {
        device_id: this.options.deviceId,
        user_id: this.options.userId,
        timestamp: eventTime,
        event_id: eventId,
        session_id: this._sessionId || -1,
        event_type: eventType,
        version_name: _shouldTrackField(this, 'version_name') ? this.options.versionName || versionName || null : null,
        platform: _shouldTrackField(this, 'platform') ? this.options.platform : null,
        os_name: _shouldTrackField(this, 'os_name') ? osName || null : null,
        os_version: _shouldTrackField(this, 'os_version') ? osVersion || null : null,
        device_model: _shouldTrackField(this, 'device_model') ? deviceModel || null : null,
        device_manufacturer: _shouldTrackField(this, 'device_manufacturer') ? deviceManufacturer || null : null,
        language: _shouldTrackField(this, 'language') ? this.options.language : null,
        carrier: _shouldTrackField(this, 'carrier') ? carrier || null : null,
        api_properties: apiProperties,
        event_properties: utils.truncate(utils.validateProperties(eventProperties)),
        user_properties: utils.truncate(utils.validateProperties(userProperties)),
        uuid: uuid(),
        library: {
          name: 'amplitude-js',
          version: version
        },
        sequence_number: sequenceNumber,
        // for ordering events and identifys
        groups: utils.truncate(utils.validateGroups(groups)),
        group_properties: utils.truncate(utils.validateProperties(groupProperties)),
        user_agent: this._userAgent
      };

      if (eventType === Constants.IDENTIFY_EVENT || eventType === Constants.GROUP_IDENTIFY_EVENT) {
        this._unsentIdentifys.push({
          event: event,
          callback: callback
        });

        this._limitEventsQueued(this._unsentIdentifys);
      } else {
        this._unsentEvents.push({
          event: event,
          callback: callback
        });

        this._limitEventsQueued(this._unsentEvents);
      }

      if (this.options.saveEvents) {
        this.saveEvents();
      }

      this._sendEventsIfReady(callback);

      return eventId;
    } catch (e) {
      utils.log.error(e);
    }
  };

  var _shouldTrackField = function _shouldTrackField(scope, field) {
    return !!scope.options.trackingOptions[field];
  };

  var _generateApiPropertiesTrackingConfig = function _generateApiPropertiesTrackingConfig(scope) {
    // to limit size of config payload, only send fields that have been disabled
    var fields = ['city', 'country', 'dma', 'ip_address', 'region'];
    var config = {};

    for (var i = 0; i < fields.length; i++) {
      var field = fields[i];

      if (!_shouldTrackField(scope, field)) {
        config[field] = false;
      }
    }

    return config;
  };
  /**
   * Remove old events from the beginning of the array if too many have accumulated. Default limit is 1000 events.
   * @private
   */


  AmplitudeClient.prototype._limitEventsQueued = function _limitEventsQueued(queue) {
    if (queue.length > this.options.savedMaxCount) {
      queue.splice(0, queue.length - this.options.savedMaxCount);
    }
  };
  /**
   * This is the callback for logEvent and identify calls. It gets called after the event/identify is uploaded,
   * and the server response code and response body from the upload request are passed to the callback function.
   * @callback Amplitude~eventCallback
   * @param {number} responseCode - Server response code for the event / identify upload request.
   * @param {string} responseBody - Server response body for the event / identify upload request.
   */

  /**
   * Log an event with eventType and eventProperties
   * @public
   * @param {string} eventType - name of event
   * @param {object} eventProperties - (optional) an object with string keys and values for the event properties.
   * @param {Amplitude~eventCallback} opt_callback - (optional) a callback function to run after the event is logged.
   * Note: the server response code and response body from the event upload are passed to the callback function.
   * @example amplitudeClient.logEvent('Clicked Homepage Button', {'finished_flow': false, 'clicks': 15});
   */


  AmplitudeClient.prototype.logEvent = function logEvent(eventType, eventProperties, opt_callback) {
    if (this._shouldDeferCall()) {
      return this._q.push(['logEvent'].concat(Array.prototype.slice.call(arguments, 0)));
    }

    return this.logEventWithTimestamp(eventType, eventProperties, null, opt_callback);
  };
  /**
   * Log an event with eventType and eventProperties and a custom timestamp
   * @public
   * @param {string} eventType - name of event
   * @param {object} eventProperties - (optional) an object with string keys and values for the event properties.
   * @param {number} timestamp - (optional) the custom timestamp as milliseconds since epoch.
   * @param {Amplitude~eventCallback} opt_callback - (optional) a callback function to run after the event is logged.
   * Note: the server response code and response body from the event upload are passed to the callback function.
   * @example amplitudeClient.logEvent('Clicked Homepage Button', {'finished_flow': false, 'clicks': 15});
   */


  AmplitudeClient.prototype.logEventWithTimestamp = function logEvent(eventType, eventProperties, timestamp, opt_callback) {
    if (this._shouldDeferCall()) {
      return this._q.push(['logEventWithTimestamp'].concat(Array.prototype.slice.call(arguments, 0)));
    }

    if (!this._apiKeySet('logEvent()')) {
      if (type(opt_callback) === 'function') {
        opt_callback(0, 'No request sent', {
          reason: 'API key not set'
        });
      }

      return -1;
    }

    if (!utils.validateInput(eventType, 'eventType', 'string')) {
      if (type(opt_callback) === 'function') {
        opt_callback(0, 'No request sent', {
          reason: 'Invalid type for eventType'
        });
      }

      return -1;
    }

    if (utils.isEmptyString(eventType)) {
      if (type(opt_callback) === 'function') {
        opt_callback(0, 'No request sent', {
          reason: 'Missing eventType'
        });
      }

      return -1;
    }

    return this._logEvent(eventType, eventProperties, null, null, null, null, timestamp, opt_callback);
  };
  /**
   * Log an event with eventType, eventProperties, and groups. Use this to set event-level groups.
   * Note: the group(s) set only apply for the specific event type being logged and does not persist on the user
   * (unless you explicitly set it with setGroup).
   * See the [SDK Readme]{@link https://github.com/amplitude/Amplitude-Javascript#setting-groups} for more information
   * about groups and Count by Distinct on the Amplitude platform.
   * @public
   * @param {string} eventType - name of event
   * @param {object} eventProperties - (optional) an object with string keys and values for the event properties.
   * @param {object} groups - (optional) an object with string groupType: groupName values for the event being logged.
   * groupName can be a string or an array of strings.
   * @param {Amplitude~eventCallback} opt_callback - (optional) a callback function to run after the event is logged.
   * Note: the server response code and response body from the event upload are passed to the callback function.
   * @example amplitudeClient.logEventWithGroups('Clicked Button', null, {'orgId': 24});
   */


  AmplitudeClient.prototype.logEventWithGroups = function (eventType, eventProperties, groups, opt_callback) {
    if (this._shouldDeferCall()) {
      return this._q.push(['logEventWithGroups'].concat(Array.prototype.slice.call(arguments, 0)));
    }

    if (!this._apiKeySet('logEventWithGroups()')) {
      if (type(opt_callback) === 'function') {
        opt_callback(0, 'No request sent', {
          reason: 'API key not set'
        });
      }

      return -1;
    }

    if (!utils.validateInput(eventType, 'eventType', 'string')) {
      if (type(opt_callback) === 'function') {
        opt_callback(0, 'No request sent', {
          reason: 'Invalid type for eventType'
        });
      }

      return -1;
    }

    return this._logEvent(eventType, eventProperties, null, null, groups, null, null, opt_callback);
  };
  /**
   * Test that n is a number or a numeric value.
   * @private
   */


  var _isNumber = function _isNumber(n) {
    return !isNaN(parseFloat(n)) && isFinite(n);
  };
  /**
   * Log revenue with Revenue interface. The new revenue interface allows for more revenue fields like
   * revenueType and event properties.
   * See [Readme]{@link https://github.com/amplitude/Amplitude-Javascript#tracking-revenue}
   * for more information on the Revenue interface and logging revenue.
   * @public
   * @param {Revenue} revenue_obj - the revenue object containing the revenue data being logged.
   * @example var revenue = new amplitude.Revenue().setProductId('productIdentifier').setPrice(10.99);
   * amplitude.logRevenueV2(revenue);
   */


  AmplitudeClient.prototype.logRevenueV2 = function logRevenueV2(revenue_obj) {
    if (this._shouldDeferCall()) {
      return this._q.push(['logRevenueV2'].concat(Array.prototype.slice.call(arguments, 0)));
    }

    if (!this._apiKeySet('logRevenueV2()')) {
      return;
    } // if revenue input is a proxied object created by the async loading snippet, convert it into an revenue object


    if (type(revenue_obj) === 'object' && revenue_obj.hasOwnProperty('_q')) {
      revenue_obj = _convertProxyObjectToRealObject(new Revenue(), revenue_obj);
    }

    if (revenue_obj instanceof Revenue) {
      // only send if revenue is valid
      if (revenue_obj && revenue_obj._isValidRevenue()) {
        return this.logEvent(Constants.REVENUE_EVENT, revenue_obj._toJSONObject());
      }
    } else {
      utils.log.error('Invalid revenue input type. Expected Revenue object but saw ' + type(revenue_obj));
    }
  };

  {
    /**
     * Log revenue event with a price, quantity, and product identifier. DEPRECATED - use logRevenueV2
     * @public
     * @deprecated
     * @param {number} price - price of revenue event
     * @param {number} quantity - (optional) quantity of products in revenue event. If no quantity specified default to 1.
     * @param {string} product - (optional) product identifier
     * @example amplitudeClient.logRevenue(3.99, 1, 'product_1234');
     */
    AmplitudeClient.prototype.logRevenue = function logRevenue(price, quantity, product) {
      if (this._shouldDeferCall()) {
        return this._q.push(['logRevenue'].concat(Array.prototype.slice.call(arguments, 0)));
      } // Test that the parameters are of the right type.


      if (!this._apiKeySet('logRevenue()') || !_isNumber(price) || quantity !== undefined && !_isNumber(quantity)) {
        // utils.log('Price and quantity arguments to logRevenue must be numbers');
        return -1;
      }

      return this._logEvent(Constants.REVENUE_EVENT, {}, {
        productId: product,
        special: 'revenue_amount',
        quantity: quantity || 1,
        price: price
      }, null, null, null, null, null);
    };
  }
  /**
   * Remove events in storage with event ids up to and including maxEventId.
   * @private
   */


  AmplitudeClient.prototype.removeEvents = function removeEvents(maxEventId, maxIdentifyId, status, response) {
    _removeEvents(this, '_unsentEvents', maxEventId, status, response);

    _removeEvents(this, '_unsentIdentifys', maxIdentifyId, status, response);
  };
  /**
   * Helper function to remove events up to maxId from a single queue.
   * Does a true filter in case events get out of order or old events are removed.
   * @private
   */


  var _removeEvents = function _removeEvents(scope, eventQueue, maxId, status, response) {
    if (maxId < 0) {
      return;
    }

    var filteredEvents = [];

    for (var i = 0; i < scope[eventQueue].length || 0; i++) {
      var unsentEvent = scope[eventQueue][i];

      if (unsentEvent.event.event_id > maxId) {
        filteredEvents.push(unsentEvent);
      } else {
        if (unsentEvent.callback) {
          unsentEvent.callback(status, response);
        }
      }
    }

    scope[eventQueue] = filteredEvents;
  };
  /**
   * Send unsent events. Note: this is called automatically after events are logged if option batchEvents is false.
   * If batchEvents is true, then events are only sent when batch criterias are met.
   * @private
   */


  AmplitudeClient.prototype.sendEvents = function sendEvents() {
    if (!this._apiKeySet('sendEvents()')) {
      this.removeEvents(Infinity, Infinity, 0, 'No request sent', {
        reason: 'API key not set'
      });
      return;
    }

    if (this.options.optOut) {
      this.removeEvents(Infinity, Infinity, 0, 'No request sent', {
        reason: 'Opt out is set to true'
      });
      return;
    } // How is it possible to get into this state?


    if (this._unsentCount() === 0) {
      return;
    } // We only make one request at a time. sendEvents will be invoked again once
    // the last request completes.


    if (this._sending) {
      return;
    }

    this._sending = true;
    var protocol = this.options.forceHttps ? 'https' : 'https:' === window.location.protocol ? 'https' : 'http';
    var url = protocol + '://' + this.options.apiEndpoint; // fetch events to send

    var numEvents = Math.min(this._unsentCount(), this.options.uploadBatchSize);

    var mergedEvents = this._mergeEventsAndIdentifys(numEvents);

    var maxEventId = mergedEvents.maxEventId;
    var maxIdentifyId = mergedEvents.maxIdentifyId;
    var events = JSON.stringify(mergedEvents.eventsToSend.map(function (_ref2) {
      var event = _ref2.event;
      return event;
    }));
    var uploadTime = new Date().getTime();
    var data = {
      client: this.options.apiKey,
      e: events,
      v: Constants.API_VERSION,
      upload_time: uploadTime,
      checksum: md5(Constants.API_VERSION + this.options.apiKey + events + uploadTime)
    };
    var scope = this;
    new Request(url, data).send(function (status, response) {
      scope._sending = false;

      try {
        if (status === 200 && response === 'success') {
          scope.removeEvents(maxEventId, maxIdentifyId, status, response); // Update the event cache after the removal of sent events.

          if (scope.options.saveEvents) {
            scope.saveEvents();
          } // Send more events if any queued during previous send.


          scope._sendEventsIfReady(); // handle payload too large

        } else if (status === 413) {
          // utils.log('request too large');
          // Can't even get this one massive event through. Drop it, even if it is an identify.
          if (scope.options.uploadBatchSize === 1) {
            scope.removeEvents(maxEventId, maxIdentifyId, status, response);
          } // The server complained about the length of the request. Backoff and try again.


          scope.options.uploadBatchSize = Math.ceil(numEvents / 2);
          scope.sendEvents();
        } // else {
        //  all the events are still queued, and will be retried when the next
        //  event is sent In the interest of debugging, it would be nice to have
        //  something like an event emitter for a better debugging experince
        //  here.
        // }

      } catch (e) {// utils.log('failed upload');
      }
    });
  };
  /**
   * Merge unsent events and identifys together in sequential order based on their sequence number, for uploading.
   * @private
   */


  AmplitudeClient.prototype._mergeEventsAndIdentifys = function _mergeEventsAndIdentifys(numEvents) {
    // coalesce events from both queues
    var eventsToSend = [];
    var eventIndex = 0;
    var maxEventId = -1;
    var identifyIndex = 0;
    var maxIdentifyId = -1;

    while (eventsToSend.length < numEvents) {
      var unsentEvent = void 0;
      var noIdentifys = identifyIndex >= this._unsentIdentifys.length;
      var noEvents = eventIndex >= this._unsentEvents.length; // case 0: no events or identifys left
      // note this should not happen, this means we have less events and identifys than expected

      if (noEvents && noIdentifys) {
        utils.log.error('Merging Events and Identifys, less events and identifys than expected');
        break;
      } // case 1: no identifys - grab from events
      else if (noIdentifys) {
          unsentEvent = this._unsentEvents[eventIndex++];
          maxEventId = unsentEvent.event.event_id; // case 2: no events - grab from identifys
        } else if (noEvents) {
          unsentEvent = this._unsentIdentifys[identifyIndex++];
          maxIdentifyId = unsentEvent.event.event_id; // case 3: need to compare sequence numbers
        } else {
          // events logged before v2.5.0 won't have a sequence number, put those first
          if (!('sequence_number' in this._unsentEvents[eventIndex].event) || this._unsentEvents[eventIndex].event.sequence_number < this._unsentIdentifys[identifyIndex].event.sequence_number) {
            unsentEvent = this._unsentEvents[eventIndex++];
            maxEventId = unsentEvent.event.event_id;
          } else {
            unsentEvent = this._unsentIdentifys[identifyIndex++];
            maxIdentifyId = unsentEvent.event.event_id;
          }
        }

      eventsToSend.push(unsentEvent);
    }

    return {
      eventsToSend: eventsToSend,
      maxEventId: maxEventId,
      maxIdentifyId: maxIdentifyId
    };
  };

  {
    /**
     * Set global user properties. Note this is deprecated, and we recommend using setUserProperties
     * @public
     * @deprecated
     */
    AmplitudeClient.prototype.setGlobalUserProperties = function setGlobalUserProperties(userProperties) {
      this.setUserProperties(userProperties);
    };
  }
  /**
   * Get the current version of Amplitude's Javascript SDK.
   * @public
   * @returns {number} version number
   * @example var amplitudeVersion = amplitude.__VERSION__;
   */


  AmplitudeClient.prototype.__VERSION__ = version;
  /**
   * Determines whether or not to push call to this._q or invoke it
   * @private
   */

  AmplitudeClient.prototype._shouldDeferCall = function _shouldDeferCall() {
    return this._pendingReadStorage || this._initializationDeferred;
  };
  /**
   * Defers Initialization by putting all functions into storage until users
   * have accepted terms for tracking
   * @private
   */


  AmplitudeClient.prototype._deferInitialization = function _deferInitialization() {
    this._initializationDeferred = true;

    this._q.push(['init'].concat(Array.prototype.slice.call(arguments, 0)));
  };
  /**
   * Enable tracking via logging events and dropping a cookie
   * Intended to be used with the deferInitialization configuration flag
   * This will drop a cookie and reset initialization deferred
   * @public
   */


  AmplitudeClient.prototype.enableTracking = function enableTracking() {
    // This will call init (which drops the cookie) and will run any pending tasks
    this._initializationDeferred = false;

    _saveCookieData(this);

    this.runQueuedFunctions();
  };

  /**
   * Amplitude SDK API - instance manager.
   * Function calls directly on amplitude have been deprecated. Please call methods on the default shared instance: amplitude.getInstance() instead.
   * See [Readme]{@link https://github.com/amplitude/Amplitude-Javascript#300-update-and-logging-events-to-multiple-amplitude-apps} for more information about this change.
   * @constructor Amplitude
   * @public
   * @example var amplitude = new Amplitude();
   */

  var Amplitude = function Amplitude() {
    this.options = _objectSpread({}, DEFAULT_OPTIONS);
    this._q = [];
    this._instances = {}; // mapping of instance names to instances
  };

  Amplitude.prototype.Identify = Identify;
  Amplitude.prototype.Revenue = Revenue;

  Amplitude.prototype.getInstance = function getInstance(instance) {
    instance = utils.isEmptyString(instance) ? Constants.DEFAULT_INSTANCE : instance.toLowerCase();
    var client = this._instances[instance];

    if (client === undefined) {
      client = new AmplitudeClient(instance);
      this._instances[instance] = client;
    }

    return client;
  };

  {
    /**
     * Run functions queued up by proxy loading snippet
     * @private
     */
    Amplitude.prototype.runQueuedFunctions = function () {
      // run queued up old versions of functions
      for (var i = 0; i < this._q.length; i++) {
        var fn = this[this._q[i][0]];

        if (type(fn) === 'function') {
          fn.apply(this, this._q[i].slice(1));
        }
      }

      this._q = []; // clear function queue after running
      // run queued up functions on instances

      for (var instance in this._instances) {
        if (this._instances.hasOwnProperty(instance)) {
          this._instances[instance].runQueuedFunctions();
        }
      }
    };
  }

  {
    /**
     * Initializes the Amplitude Javascript SDK with your apiKey and any optional configurations.
     * This is required before any other methods can be called.
     * @public
     * @param {string} apiKey - The API key for your app.
     * @param {string} opt_userId - (optional) An identifier for this user.
     * @param {object} opt_config - (optional) Configuration options.
     * See [Readme]{@link https://github.com/amplitude/Amplitude-Javascript#configuration-options} for list of options and default values.
     * @param {function} opt_callback - (optional) Provide a callback function to run after initialization is complete.
     * @deprecated Please use amplitude.getInstance().init(apiKey, opt_userId, opt_config, opt_callback);
     * @example amplitude.init('API_KEY', 'USER_ID', {includeReferrer: true, includeUtm: true}, function() { alert('init complete'); });
     */
    Amplitude.prototype.init = function init(apiKey, opt_userId, opt_config, opt_callback) {
      this.getInstance().init(apiKey, opt_userId, opt_config, function (instance) {
        // make options such as deviceId available for callback functions
        this.options = instance.options;

        if (type(opt_callback) === 'function') {
          opt_callback(instance);
        }
      }.bind(this));
    };
    /**
     * Returns true if a new session was created during initialization, otherwise false.
     * @public
     * @return {boolean} Whether a new session was created during initialization.
     * @deprecated Please use amplitude.getInstance().isNewSession();
     */


    Amplitude.prototype.isNewSession = function isNewSession() {
      return this.getInstance().isNewSession();
    };
    /**
     * Returns the id of the current session.
     * @public
     * @return {number} Id of the current session.
     * @deprecated Please use amplitude.getInstance().getSessionId();
     */


    Amplitude.prototype.getSessionId = function getSessionId() {
      return this.getInstance().getSessionId();
    };
    /**
     * Increments the eventId and returns it.
     * @private
     */


    Amplitude.prototype.nextEventId = function nextEventId() {
      return this.getInstance().nextEventId();
    };
    /**
     * Increments the identifyId and returns it.
     * @private
     */


    Amplitude.prototype.nextIdentifyId = function nextIdentifyId() {
      return this.getInstance().nextIdentifyId();
    };
    /**
     * Increments the sequenceNumber and returns it.
     * @private
     */


    Amplitude.prototype.nextSequenceNumber = function nextSequenceNumber() {
      return this.getInstance().nextSequenceNumber();
    };
    /**
     * Saves unsent events and identifies to localStorage. JSON stringifies event queues before saving.
     * Note: this is called automatically every time events are logged, unless you explicitly set option saveEvents to false.
     * @private
     */


    Amplitude.prototype.saveEvents = function saveEvents() {
      this.getInstance().saveEvents();
    };
    /**
     * Sets a customer domain for the amplitude cookie. Useful if you want to support cross-subdomain tracking.
     * @public
     * @param {string} domain to set.
     * @deprecated Please use amplitude.getInstance().setDomain(domain);
     * @example amplitude.setDomain('.amplitude.com');
     */


    Amplitude.prototype.setDomain = function setDomain(domain) {
      this.getInstance().setDomain(domain);
    };
    /**
     * Sets an identifier for the current user.
     * @public
     * @param {string} userId - identifier to set. Can be null.
     * @deprecated Please use amplitude.getInstance().setUserId(userId);
     * @example amplitude.setUserId('joe@gmail.com');
     */


    Amplitude.prototype.setUserId = function setUserId(userId) {
      this.getInstance().setUserId(userId);
    };
    /**
     * Add user to a group or groups. You need to specify a groupType and groupName(s).
     * For example you can group people by their organization.
     * In that case groupType is "orgId" and groupName would be the actual ID(s).
     * groupName can be a string or an array of strings to indicate a user in multiple gruups.
     * You can also call setGroup multiple times with different groupTypes to track multiple types of groups (up to 5 per app).
     * Note: this will also set groupType: groupName as a user property.
     * See the [SDK Readme]{@link https://github.com/amplitude/Amplitude-Javascript#setting-groups} for more information.
     * @public
     * @param {string} groupType - the group type (ex: orgId)
     * @param {string|list} groupName - the name of the group (ex: 15), or a list of names of the groups
     * @deprecated Please use amplitude.getInstance().setGroup(groupType, groupName);
     * @example amplitude.setGroup('orgId', 15); // this adds the current user to orgId 15.
     */


    Amplitude.prototype.setGroup = function (groupType, groupName) {
      this.getInstance().setGroup(groupType, groupName);
    };
    /**
     * Sets whether to opt current user out of tracking.
     * @public
     * @param {boolean} enable - if true then no events will be logged or sent.
     * @deprecated Please use amplitude.getInstance().setOptOut(enable);
     * @example: amplitude.setOptOut(true);
     */


    Amplitude.prototype.setOptOut = function setOptOut(enable) {
      this.getInstance().setOptOut(enable);
    };
    /**
      * Regenerates a new random deviceId for current user. Note: this is not recommended unless you know what you
      * are doing. This can be used in conjunction with `setUserId(null)` to anonymize users after they log out.
      * With a null userId and a completely new deviceId, the current user would appear as a brand new user in dashboard.
      * This uses src/uuid.js to regenerate the deviceId.
      * @public
      * @deprecated Please use amplitude.getInstance().regenerateDeviceId();
      */


    Amplitude.prototype.regenerateDeviceId = function regenerateDeviceId() {
      this.getInstance().regenerateDeviceId();
    };
    /**
      * Sets a custom deviceId for current user. Note: this is not recommended unless you know what you are doing
      * (like if you have your own system for managing deviceIds). Make sure the deviceId you set is sufficiently unique
      * (we recommend something like a UUID - see src/uuid.js for an example of how to generate) to prevent conflicts with other devices in our system.
      * @public
      * @param {string} deviceId - custom deviceId for current user.
      * @deprecated Please use amplitude.getInstance().setDeviceId(deviceId);
      * @example amplitude.setDeviceId('45f0954f-eb79-4463-ac8a-233a6f45a8f0');
      */


    Amplitude.prototype.setDeviceId = function setDeviceId(deviceId) {
      this.getInstance().setDeviceId(deviceId);
    };
    /**
     * Sets user properties for the current user.
     * @public
     * @param {object} - object with string keys and values for the user properties to set.
     * @param {boolean} - DEPRECATED opt_replace: in earlier versions of the JS SDK the user properties object was kept in
     * memory and replace = true would replace the object in memory. Now the properties are no longer stored in memory, so replace is deprecated.
     * @deprecated Please use amplitude.getInstance.setUserProperties(userProperties);
     * @example amplitude.setUserProperties({'gender': 'female', 'sign_up_complete': true})
     */


    Amplitude.prototype.setUserProperties = function setUserProperties(userProperties) {
      this.getInstance().setUserProperties(userProperties);
    };
    /**
     * Clear all of the user properties for the current user. Note: clearing user properties is irreversible!
     * @public
     * @deprecated Please use amplitude.getInstance().clearUserProperties();
     * @example amplitude.clearUserProperties();
     */


    Amplitude.prototype.clearUserProperties = function clearUserProperties() {
      this.getInstance().clearUserProperties();
    };
    /**
     * Send an identify call containing user property operations to Amplitude servers.
     * See [Readme]{@link https://github.com/amplitude/Amplitude-Javascript#user-properties-and-user-property-operations}
     * for more information on the Identify API and user property operations.
     * @param {Identify} identify_obj - the Identify object containing the user property operations to send.
     * @param {Amplitude~eventCallback} opt_callback - (optional) callback function to run when the identify event has been sent.
     * Note: the server response code and response body from the identify event upload are passed to the callback function.
     * @deprecated Please use amplitude.getInstance().identify(identify);
     * @example
     * var identify = new amplitude.Identify().set('colors', ['rose', 'gold']).add('karma', 1).setOnce('sign_up_date', '2016-03-31');
     * amplitude.identify(identify);
     */


    Amplitude.prototype.identify = function (identify_obj, opt_callback) {
      this.getInstance().identify(identify_obj, opt_callback);
    };
    /**
     * Set a versionName for your application.
     * @public
     * @param {string} versionName - The version to set for your application.
     * @deprecated Please use amplitude.getInstance().setVersionName(versionName);
     * @example amplitude.setVersionName('1.12.3');
     */


    Amplitude.prototype.setVersionName = function setVersionName(versionName) {
      this.getInstance().setVersionName(versionName);
    };
    /**
     * This is the callback for logEvent and identify calls. It gets called after the event/identify is uploaded,
     * and the server response code and response body from the upload request are passed to the callback function.
     * @callback Amplitude~eventCallback
     * @param {number} responseCode - Server response code for the event / identify upload request.
     * @param {string} responseBody - Server response body for the event / identify upload request.
     */

    /**
     * Log an event with eventType and eventProperties
     * @public
     * @param {string} eventType - name of event
     * @param {object} eventProperties - (optional) an object with string keys and values for the event properties.
     * @param {Amplitude~eventCallback} opt_callback - (optional) a callback function to run after the event is logged.
     * Note: the server response code and response body from the event upload are passed to the callback function.
     * @deprecated Please use amplitude.getInstance().logEvent(eventType, eventProperties, opt_callback);
     * @example amplitude.logEvent('Clicked Homepage Button', {'finished_flow': false, 'clicks': 15});
     */


    Amplitude.prototype.logEvent = function logEvent(eventType, eventProperties, opt_callback) {
      return this.getInstance().logEvent(eventType, eventProperties, opt_callback);
    };
    /**
     * Log an event with eventType, eventProperties, and groups. Use this to set event-level groups.
     * Note: the group(s) set only apply for the specific event type being logged and does not persist on the user
     * (unless you explicitly set it with setGroup).
     * See the [SDK Readme]{@link https://github.com/amplitude/Amplitude-Javascript#setting-groups} for more information
     * about groups and Count by Distinct on the Amplitude platform.
     * @public
     * @param {string} eventType - name of event
     * @param {object} eventProperties - (optional) an object with string keys and values for the event properties.
     * @param {object} groups - (optional) an object with string groupType: groupName values for the event being logged.
     * groupName can be a string or an array of strings.
     * @param {Amplitude~eventCallback} opt_callback - (optional) a callback function to run after the event is logged.
     * Note: the server response code and response body from the event upload are passed to the callback function.
     * Deprecated Please use amplitude.getInstance().logEventWithGroups(eventType, eventProperties, groups, opt_callback);
     * @example amplitude.logEventWithGroups('Clicked Button', null, {'orgId': 24});
     */


    Amplitude.prototype.logEventWithGroups = function (eventType, eventProperties, groups, opt_callback) {
      return this.getInstance().logEventWithGroups(eventType, eventProperties, groups, opt_callback);
    };
    /**
     * Log revenue with Revenue interface. The new revenue interface allows for more revenue fields like
     * revenueType and event properties.
     * See [Readme]{@link https://github.com/amplitude/Amplitude-Javascript#tracking-revenue}
     * for more information on the Revenue interface and logging revenue.
     * @public
     * @param {Revenue} revenue_obj - the revenue object containing the revenue data being logged.
     * @deprecated Please use amplitude.getInstance().logRevenueV2(revenue_obj);
     * @example var revenue = new amplitude.Revenue().setProductId('productIdentifier').setPrice(10.99);
     * amplitude.logRevenueV2(revenue);
     */


    Amplitude.prototype.logRevenueV2 = function logRevenueV2(revenue_obj) {
      return this.getInstance().logRevenueV2(revenue_obj);
    };
    /**
     * Log revenue event with a price, quantity, and product identifier. DEPRECATED - use logRevenueV2
     * @public
     * @param {number} price - price of revenue event
     * @param {number} quantity - (optional) quantity of products in revenue event. If no quantity specified default to 1.
     * @param {string} product - (optional) product identifier
     * @deprecated Please use amplitude.getInstance().logRevenueV2(revenue_obj);
     * @example amplitude.logRevenue(3.99, 1, 'product_1234');
     */


    Amplitude.prototype.logRevenue = function logRevenue(price, quantity, product) {
      return this.getInstance().logRevenue(price, quantity, product);
    };
    /**
     * Remove events in storage with event ids up to and including maxEventId.
     * @private
     */


    Amplitude.prototype.removeEvents = function removeEvents(maxEventId, maxIdentifyId) {
      this.getInstance().removeEvents(maxEventId, maxIdentifyId);
    };
    /**
     * Send unsent events. Note: this is called automatically after events are logged if option batchEvents is false.
     * If batchEvents is true, then events are only sent when batch criterias are met.
     * @private
     * @param {Amplitude~eventCallback} callback - (optional) callback to run after events are sent.
     * Note the server response code and response body are passed to the callback as input arguments.
     */


    Amplitude.prototype.sendEvents = function sendEvents(callback) {
      this.getInstance().sendEvents(callback);
    };
    /**
     * Set global user properties. Note this is deprecated, and we recommend using setUserProperties
     * @public
     * @deprecated
     */


    Amplitude.prototype.setGlobalUserProperties = function setGlobalUserProperties(userProperties) {
      this.getInstance().setUserProperties(userProperties);
    };
  }
  /**
   * Get the current version of Amplitude's Javascript SDK.
   * @public
   * @returns {number} version number
   * @example var amplitudeVersion = amplitude.__VERSION__;
   */


  Amplitude.prototype.__VERSION__ = version;

  /* jshint expr:true */
  var old = window.amplitude || {};
  var newInstance = new Amplitude();
  newInstance._q = old._q || [];

  for (var instance in old._iq) {
    // migrate each instance's queue
    if (old._iq.hasOwnProperty(instance)) {
      newInstance.getInstance(instance)._q = old._iq[instance]._q || [];
    }
  }

  {
    newInstance.runQueuedFunctions();
  } // export the instance

  return newInstance;

}));

}).call(this,typeof global !== "undefined" ? global : typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {},require("buffer").Buffer)

},{"buffer":4}],2:[function(require,module,exports){
(function (global){
"use strict";

// Use the fastest means possible to execute a task in its own turn, with
// priority over other events including IO, animation, reflow, and redraw
// events in browsers.
//
// An exception thrown by a task will permanently interrupt the processing of
// subsequent tasks. The higher level `asap` function ensures that if an
// exception is thrown by a task, that the task queue will continue flushing as
// soon as possible, but if you use `rawAsap` directly, you are responsible to
// either ensure that no exceptions are thrown from your task, or to manually
// call `rawAsap.requestFlush` if an exception is thrown.
module.exports = rawAsap;
function rawAsap(task) {
    if (!queue.length) {
        requestFlush();
        flushing = true;
    }
    // Equivalent to push, but avoids a function call.
    queue[queue.length] = task;
}

var queue = [];
// Once a flush has been requested, no further calls to `requestFlush` are
// necessary until the next `flush` completes.
var flushing = false;
// `requestFlush` is an implementation-specific method that attempts to kick
// off a `flush` event as quickly as possible. `flush` will attempt to exhaust
// the event queue before yielding to the browser's own event loop.
var requestFlush;
// The position of the next task to execute in the task queue. This is
// preserved between calls to `flush` so that it can be resumed if
// a task throws an exception.
var index = 0;
// If a task schedules additional tasks recursively, the task queue can grow
// unbounded. To prevent memory exhaustion, the task queue will periodically
// truncate already-completed tasks.
var capacity = 1024;

// The flush function processes all tasks that have been scheduled with
// `rawAsap` unless and until one of those tasks throws an exception.
// If a task throws an exception, `flush` ensures that its state will remain
// consistent and will resume where it left off when called again.
// However, `flush` does not make any arrangements to be called again if an
// exception is thrown.
function flush() {
    while (index < queue.length) {
        var currentIndex = index;
        // Advance the index before calling the task. This ensures that we will
        // begin flushing on the next task the task throws an error.
        index = index + 1;
        queue[currentIndex].call();
        // Prevent leaking memory for long chains of recursive calls to `asap`.
        // If we call `asap` within tasks scheduled by `asap`, the queue will
        // grow, but to avoid an O(n) walk for every task we execute, we don't
        // shift tasks off the queue after they have been executed.
        // Instead, we periodically shift 1024 tasks off the queue.
        if (index > capacity) {
            // Manually shift all values starting at the index back to the
            // beginning of the queue.
            for (var scan = 0, newLength = queue.length - index; scan < newLength; scan++) {
                queue[scan] = queue[scan + index];
            }
            queue.length -= index;
            index = 0;
        }
    }
    queue.length = 0;
    index = 0;
    flushing = false;
}

// `requestFlush` is implemented using a strategy based on data collected from
// every available SauceLabs Selenium web driver worker at time of writing.
// https://docs.google.com/spreadsheets/d/1mG-5UYGup5qxGdEMWkhP6BWCz053NUb2E1QoUTU16uA/edit#gid=783724593

// Safari 6 and 6.1 for desktop, iPad, and iPhone are the only browsers that
// have WebKitMutationObserver but not un-prefixed MutationObserver.
// Must use `global` or `self` instead of `window` to work in both frames and web
// workers. `global` is a provision of Browserify, Mr, Mrs, or Mop.

/* globals self */
var scope = typeof global !== "undefined" ? global : self;
var BrowserMutationObserver = scope.MutationObserver || scope.WebKitMutationObserver;

// MutationObservers are desirable because they have high priority and work
// reliably everywhere they are implemented.
// They are implemented in all modern browsers.
//
// - Android 4-4.3
// - Chrome 26-34
// - Firefox 14-29
// - Internet Explorer 11
// - iPad Safari 6-7.1
// - iPhone Safari 7-7.1
// - Safari 6-7
if (typeof BrowserMutationObserver === "function") {
    requestFlush = makeRequestCallFromMutationObserver(flush);

// MessageChannels are desirable because they give direct access to the HTML
// task queue, are implemented in Internet Explorer 10, Safari 5.0-1, and Opera
// 11-12, and in web workers in many engines.
// Although message channels yield to any queued rendering and IO tasks, they
// would be better than imposing the 4ms delay of timers.
// However, they do not work reliably in Internet Explorer or Safari.

// Internet Explorer 10 is the only browser that has setImmediate but does
// not have MutationObservers.
// Although setImmediate yields to the browser's renderer, it would be
// preferrable to falling back to setTimeout since it does not have
// the minimum 4ms penalty.
// Unfortunately there appears to be a bug in Internet Explorer 10 Mobile (and
// Desktop to a lesser extent) that renders both setImmediate and
// MessageChannel useless for the purposes of ASAP.
// https://github.com/kriskowal/q/issues/396

// Timers are implemented universally.
// We fall back to timers in workers in most engines, and in foreground
// contexts in the following browsers.
// However, note that even this simple case requires nuances to operate in a
// broad spectrum of browsers.
//
// - Firefox 3-13
// - Internet Explorer 6-9
// - iPad Safari 4.3
// - Lynx 2.8.7
} else {
    requestFlush = makeRequestCallFromTimer(flush);
}

// `requestFlush` requests that the high priority event queue be flushed as
// soon as possible.
// This is useful to prevent an error thrown in a task from stalling the event
// queue if the exception handled by Node.js’s
// `process.on("uncaughtException")` or by a domain.
rawAsap.requestFlush = requestFlush;

// To request a high priority event, we induce a mutation observer by toggling
// the text of a text node between "1" and "-1".
function makeRequestCallFromMutationObserver(callback) {
    var toggle = 1;
    var observer = new BrowserMutationObserver(callback);
    var node = document.createTextNode("");
    observer.observe(node, {characterData: true});
    return function requestCall() {
        toggle = -toggle;
        node.data = toggle;
    };
}

// The message channel technique was discovered by Malte Ubl and was the
// original foundation for this library.
// http://www.nonblocking.io/2011/06/windownexttick.html

// Safari 6.0.5 (at least) intermittently fails to create message ports on a
// page's first load. Thankfully, this version of Safari supports
// MutationObservers, so we don't need to fall back in that case.

// function makeRequestCallFromMessageChannel(callback) {
//     var channel = new MessageChannel();
//     channel.port1.onmessage = callback;
//     return function requestCall() {
//         channel.port2.postMessage(0);
//     };
// }

// For reasons explained above, we are also unable to use `setImmediate`
// under any circumstances.
// Even if we were, there is another bug in Internet Explorer 10.
// It is not sufficient to assign `setImmediate` to `requestFlush` because
// `setImmediate` must be called *by name* and therefore must be wrapped in a
// closure.
// Never forget.

// function makeRequestCallFromSetImmediate(callback) {
//     return function requestCall() {
//         setImmediate(callback);
//     };
// }

// Safari 6.0 has a problem where timers will get lost while the user is
// scrolling. This problem does not impact ASAP because Safari 6.0 supports
// mutation observers, so that implementation is used instead.
// However, if we ever elect to use timers in Safari, the prevalent work-around
// is to add a scroll event listener that calls for a flush.

// `setTimeout` does not call the passed callback if the delay is less than
// approximately 7 in web workers in Firefox 8 through 18, and sometimes not
// even then.

function makeRequestCallFromTimer(callback) {
    return function requestCall() {
        // We dispatch a timeout with a specified delay of 0 for engines that
        // can reliably accommodate that request. This will usually be snapped
        // to a 4 milisecond delay, but once we're flushing, there's no delay
        // between events.
        var timeoutHandle = setTimeout(handleTimer, 0);
        // However, since this timer gets frequently dropped in Firefox
        // workers, we enlist an interval handle that will try to fire
        // an event 20 times per second until it succeeds.
        var intervalHandle = setInterval(handleTimer, 50);

        function handleTimer() {
            // Whichever timer succeeds will cancel both timers and
            // execute the callback.
            clearTimeout(timeoutHandle);
            clearInterval(intervalHandle);
            callback();
        }
    };
}

// This is for `asap.js` only.
// Its name will be periodically randomized to break any code that depends on
// its existence.
rawAsap.makeRequestCallFromTimer = makeRequestCallFromTimer;

// ASAP was originally a nextTick shim included in Q. This was factored out
// into this ASAP package. It was later adapted to RSVP which made further
// amendments. These decisions, particularly to marginalize MessageChannel and
// to capture the MutationObserver implementation in a closure, were integrated
// back into ASAP proper.
// https://github.com/tildeio/rsvp.js/blob/cddf7232546a9cf858524b75cde6f9edf72620a7/lib/rsvp/asap.js

}).call(this,typeof global !== "undefined" ? global : typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {})

},{}],3:[function(require,module,exports){
'use strict'

exports.byteLength = byteLength
exports.toByteArray = toByteArray
exports.fromByteArray = fromByteArray

var lookup = []
var revLookup = []
var Arr = typeof Uint8Array !== 'undefined' ? Uint8Array : Array

var code = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/'
for (var i = 0, len = code.length; i < len; ++i) {
  lookup[i] = code[i]
  revLookup[code.charCodeAt(i)] = i
}

// Support decoding URL-safe base64 strings, as Node.js does.
// See: https://en.wikipedia.org/wiki/Base64#URL_applications
revLookup['-'.charCodeAt(0)] = 62
revLookup['_'.charCodeAt(0)] = 63

function getLens (b64) {
  var len = b64.length

  if (len % 4 > 0) {
    throw new Error('Invalid string. Length must be a multiple of 4')
  }

  // Trim off extra bytes after placeholder bytes are found
  // See: https://github.com/beatgammit/base64-js/issues/42
  var validLen = b64.indexOf('=')
  if (validLen === -1) validLen = len

  var placeHoldersLen = validLen === len
    ? 0
    : 4 - (validLen % 4)

  return [validLen, placeHoldersLen]
}

// base64 is 4/3 + up to two characters of the original data
function byteLength (b64) {
  var lens = getLens(b64)
  var validLen = lens[0]
  var placeHoldersLen = lens[1]
  return ((validLen + placeHoldersLen) * 3 / 4) - placeHoldersLen
}

function _byteLength (b64, validLen, placeHoldersLen) {
  return ((validLen + placeHoldersLen) * 3 / 4) - placeHoldersLen
}

function toByteArray (b64) {
  var tmp
  var lens = getLens(b64)
  var validLen = lens[0]
  var placeHoldersLen = lens[1]

  var arr = new Arr(_byteLength(b64, validLen, placeHoldersLen))

  var curByte = 0

  // if there are placeholders, only get up to the last complete 4 chars
  var len = placeHoldersLen > 0
    ? validLen - 4
    : validLen

  var i
  for (i = 0; i < len; i += 4) {
    tmp =
      (revLookup[b64.charCodeAt(i)] << 18) |
      (revLookup[b64.charCodeAt(i + 1)] << 12) |
      (revLookup[b64.charCodeAt(i + 2)] << 6) |
      revLookup[b64.charCodeAt(i + 3)]
    arr[curByte++] = (tmp >> 16) & 0xFF
    arr[curByte++] = (tmp >> 8) & 0xFF
    arr[curByte++] = tmp & 0xFF
  }

  if (placeHoldersLen === 2) {
    tmp =
      (revLookup[b64.charCodeAt(i)] << 2) |
      (revLookup[b64.charCodeAt(i + 1)] >> 4)
    arr[curByte++] = tmp & 0xFF
  }

  if (placeHoldersLen === 1) {
    tmp =
      (revLookup[b64.charCodeAt(i)] << 10) |
      (revLookup[b64.charCodeAt(i + 1)] << 4) |
      (revLookup[b64.charCodeAt(i + 2)] >> 2)
    arr[curByte++] = (tmp >> 8) & 0xFF
    arr[curByte++] = tmp & 0xFF
  }

  return arr
}

function tripletToBase64 (num) {
  return lookup[num >> 18 & 0x3F] +
    lookup[num >> 12 & 0x3F] +
    lookup[num >> 6 & 0x3F] +
    lookup[num & 0x3F]
}

function encodeChunk (uint8, start, end) {
  var tmp
  var output = []
  for (var i = start; i < end; i += 3) {
    tmp =
      ((uint8[i] << 16) & 0xFF0000) +
      ((uint8[i + 1] << 8) & 0xFF00) +
      (uint8[i + 2] & 0xFF)
    output.push(tripletToBase64(tmp))
  }
  return output.join('')
}

function fromByteArray (uint8) {
  var tmp
  var len = uint8.length
  var extraBytes = len % 3 // if we have 1 byte left, pad 2 bytes
  var parts = []
  var maxChunkLength = 16383 // must be multiple of 3

  // go through the array every three bytes, we'll deal with trailing stuff later
  for (var i = 0, len2 = len - extraBytes; i < len2; i += maxChunkLength) {
    parts.push(encodeChunk(
      uint8, i, (i + maxChunkLength) > len2 ? len2 : (i + maxChunkLength)
    ))
  }

  // pad the end with zeros, but make sure to not forget the extra bytes
  if (extraBytes === 1) {
    tmp = uint8[len - 1]
    parts.push(
      lookup[tmp >> 2] +
      lookup[(tmp << 4) & 0x3F] +
      '=='
    )
  } else if (extraBytes === 2) {
    tmp = (uint8[len - 2] << 8) + uint8[len - 1]
    parts.push(
      lookup[tmp >> 10] +
      lookup[(tmp >> 4) & 0x3F] +
      lookup[(tmp << 2) & 0x3F] +
      '='
    )
  }

  return parts.join('')
}

},{}],4:[function(require,module,exports){
(function (Buffer){
/*!
 * The buffer module from node.js, for the browser.
 *
 * @author   Feross Aboukhadijeh <https://feross.org>
 * @license  MIT
 */
/* eslint-disable no-proto */

'use strict'

var base64 = require('base64-js')
var ieee754 = require('ieee754')
var customInspectSymbol =
  (typeof Symbol === 'function' && typeof Symbol.for === 'function')
    ? Symbol.for('nodejs.util.inspect.custom')
    : null

exports.Buffer = Buffer
exports.SlowBuffer = SlowBuffer
exports.INSPECT_MAX_BYTES = 50

var K_MAX_LENGTH = 0x7fffffff
exports.kMaxLength = K_MAX_LENGTH

/**
 * If `Buffer.TYPED_ARRAY_SUPPORT`:
 *   === true    Use Uint8Array implementation (fastest)
 *   === false   Print warning and recommend using `buffer` v4.x which has an Object
 *               implementation (most compatible, even IE6)
 *
 * Browsers that support typed arrays are IE 10+, Firefox 4+, Chrome 7+, Safari 5.1+,
 * Opera 11.6+, iOS 4.2+.
 *
 * We report that the browser does not support typed arrays if the are not subclassable
 * using __proto__. Firefox 4-29 lacks support for adding new properties to `Uint8Array`
 * (See: https://bugzilla.mozilla.org/show_bug.cgi?id=695438). IE 10 lacks support
 * for __proto__ and has a buggy typed array implementation.
 */
Buffer.TYPED_ARRAY_SUPPORT = typedArraySupport()

if (!Buffer.TYPED_ARRAY_SUPPORT && typeof console !== 'undefined' &&
    typeof console.error === 'function') {
  console.error(
    'This browser lacks typed array (Uint8Array) support which is required by ' +
    '`buffer` v5.x. Use `buffer` v4.x if you require old browser support.'
  )
}

function typedArraySupport () {
  // Can typed array instances can be augmented?
  try {
    var arr = new Uint8Array(1)
    var proto = { foo: function () { return 42 } }
    Object.setPrototypeOf(proto, Uint8Array.prototype)
    Object.setPrototypeOf(arr, proto)
    return arr.foo() === 42
  } catch (e) {
    return false
  }
}

Object.defineProperty(Buffer.prototype, 'parent', {
  enumerable: true,
  get: function () {
    if (!Buffer.isBuffer(this)) return undefined
    return this.buffer
  }
})

Object.defineProperty(Buffer.prototype, 'offset', {
  enumerable: true,
  get: function () {
    if (!Buffer.isBuffer(this)) return undefined
    return this.byteOffset
  }
})

function createBuffer (length) {
  if (length > K_MAX_LENGTH) {
    throw new RangeError('The value "' + length + '" is invalid for option "size"')
  }
  // Return an augmented `Uint8Array` instance
  var buf = new Uint8Array(length)
  Object.setPrototypeOf(buf, Buffer.prototype)
  return buf
}

/**
 * The Buffer constructor returns instances of `Uint8Array` that have their
 * prototype changed to `Buffer.prototype`. Furthermore, `Buffer` is a subclass of
 * `Uint8Array`, so the returned instances will have all the node `Buffer` methods
 * and the `Uint8Array` methods. Square bracket notation works as expected -- it
 * returns a single octet.
 *
 * The `Uint8Array` prototype remains unmodified.
 */

function Buffer (arg, encodingOrOffset, length) {
  // Common case.
  if (typeof arg === 'number') {
    if (typeof encodingOrOffset === 'string') {
      throw new TypeError(
        'The "string" argument must be of type string. Received type number'
      )
    }
    return allocUnsafe(arg)
  }
  return from(arg, encodingOrOffset, length)
}

// Fix subarray() in ES2016. See: https://github.com/feross/buffer/pull/97
if (typeof Symbol !== 'undefined' && Symbol.species != null &&
    Buffer[Symbol.species] === Buffer) {
  Object.defineProperty(Buffer, Symbol.species, {
    value: null,
    configurable: true,
    enumerable: false,
    writable: false
  })
}

Buffer.poolSize = 8192 // not used by this implementation

function from (value, encodingOrOffset, length) {
  if (typeof value === 'string') {
    return fromString(value, encodingOrOffset)
  }

  if (ArrayBuffer.isView(value)) {
    return fromArrayLike(value)
  }

  if (value == null) {
    throw new TypeError(
      'The first argument must be one of type string, Buffer, ArrayBuffer, Array, ' +
      'or Array-like Object. Received type ' + (typeof value)
    )
  }

  if (isInstance(value, ArrayBuffer) ||
      (value && isInstance(value.buffer, ArrayBuffer))) {
    return fromArrayBuffer(value, encodingOrOffset, length)
  }

  if (typeof value === 'number') {
    throw new TypeError(
      'The "value" argument must not be of type number. Received type number'
    )
  }

  var valueOf = value.valueOf && value.valueOf()
  if (valueOf != null && valueOf !== value) {
    return Buffer.from(valueOf, encodingOrOffset, length)
  }

  var b = fromObject(value)
  if (b) return b

  if (typeof Symbol !== 'undefined' && Symbol.toPrimitive != null &&
      typeof value[Symbol.toPrimitive] === 'function') {
    return Buffer.from(
      value[Symbol.toPrimitive]('string'), encodingOrOffset, length
    )
  }

  throw new TypeError(
    'The first argument must be one of type string, Buffer, ArrayBuffer, Array, ' +
    'or Array-like Object. Received type ' + (typeof value)
  )
}

/**
 * Functionally equivalent to Buffer(arg, encoding) but throws a TypeError
 * if value is a number.
 * Buffer.from(str[, encoding])
 * Buffer.from(array)
 * Buffer.from(buffer)
 * Buffer.from(arrayBuffer[, byteOffset[, length]])
 **/
Buffer.from = function (value, encodingOrOffset, length) {
  return from(value, encodingOrOffset, length)
}

// Note: Change prototype *after* Buffer.from is defined to workaround Chrome bug:
// https://github.com/feross/buffer/pull/148
Object.setPrototypeOf(Buffer.prototype, Uint8Array.prototype)
Object.setPrototypeOf(Buffer, Uint8Array)

function assertSize (size) {
  if (typeof size !== 'number') {
    throw new TypeError('"size" argument must be of type number')
  } else if (size < 0) {
    throw new RangeError('The value "' + size + '" is invalid for option "size"')
  }
}

function alloc (size, fill, encoding) {
  assertSize(size)
  if (size <= 0) {
    return createBuffer(size)
  }
  if (fill !== undefined) {
    // Only pay attention to encoding if it's a string. This
    // prevents accidentally sending in a number that would
    // be interpretted as a start offset.
    return typeof encoding === 'string'
      ? createBuffer(size).fill(fill, encoding)
      : createBuffer(size).fill(fill)
  }
  return createBuffer(size)
}

/**
 * Creates a new filled Buffer instance.
 * alloc(size[, fill[, encoding]])
 **/
Buffer.alloc = function (size, fill, encoding) {
  return alloc(size, fill, encoding)
}

function allocUnsafe (size) {
  assertSize(size)
  return createBuffer(size < 0 ? 0 : checked(size) | 0)
}

/**
 * Equivalent to Buffer(num), by default creates a non-zero-filled Buffer instance.
 * */
Buffer.allocUnsafe = function (size) {
  return allocUnsafe(size)
}
/**
 * Equivalent to SlowBuffer(num), by default creates a non-zero-filled Buffer instance.
 */
Buffer.allocUnsafeSlow = function (size) {
  return allocUnsafe(size)
}

function fromString (string, encoding) {
  if (typeof encoding !== 'string' || encoding === '') {
    encoding = 'utf8'
  }

  if (!Buffer.isEncoding(encoding)) {
    throw new TypeError('Unknown encoding: ' + encoding)
  }

  var length = byteLength(string, encoding) | 0
  var buf = createBuffer(length)

  var actual = buf.write(string, encoding)

  if (actual !== length) {
    // Writing a hex string, for example, that contains invalid characters will
    // cause everything after the first invalid character to be ignored. (e.g.
    // 'abxxcd' will be treated as 'ab')
    buf = buf.slice(0, actual)
  }

  return buf
}

function fromArrayLike (array) {
  var length = array.length < 0 ? 0 : checked(array.length) | 0
  var buf = createBuffer(length)
  for (var i = 0; i < length; i += 1) {
    buf[i] = array[i] & 255
  }
  return buf
}

function fromArrayBuffer (array, byteOffset, length) {
  if (byteOffset < 0 || array.byteLength < byteOffset) {
    throw new RangeError('"offset" is outside of buffer bounds')
  }

  if (array.byteLength < byteOffset + (length || 0)) {
    throw new RangeError('"length" is outside of buffer bounds')
  }

  var buf
  if (byteOffset === undefined && length === undefined) {
    buf = new Uint8Array(array)
  } else if (length === undefined) {
    buf = new Uint8Array(array, byteOffset)
  } else {
    buf = new Uint8Array(array, byteOffset, length)
  }

  // Return an augmented `Uint8Array` instance
  Object.setPrototypeOf(buf, Buffer.prototype)

  return buf
}

function fromObject (obj) {
  if (Buffer.isBuffer(obj)) {
    var len = checked(obj.length) | 0
    var buf = createBuffer(len)

    if (buf.length === 0) {
      return buf
    }

    obj.copy(buf, 0, 0, len)
    return buf
  }

  if (obj.length !== undefined) {
    if (typeof obj.length !== 'number' || numberIsNaN(obj.length)) {
      return createBuffer(0)
    }
    return fromArrayLike(obj)
  }

  if (obj.type === 'Buffer' && Array.isArray(obj.data)) {
    return fromArrayLike(obj.data)
  }
}

function checked (length) {
  // Note: cannot use `length < K_MAX_LENGTH` here because that fails when
  // length is NaN (which is otherwise coerced to zero.)
  if (length >= K_MAX_LENGTH) {
    throw new RangeError('Attempt to allocate Buffer larger than maximum ' +
                         'size: 0x' + K_MAX_LENGTH.toString(16) + ' bytes')
  }
  return length | 0
}

function SlowBuffer (length) {
  if (+length != length) { // eslint-disable-line eqeqeq
    length = 0
  }
  return Buffer.alloc(+length)
}

Buffer.isBuffer = function isBuffer (b) {
  return b != null && b._isBuffer === true &&
    b !== Buffer.prototype // so Buffer.isBuffer(Buffer.prototype) will be false
}

Buffer.compare = function compare (a, b) {
  if (isInstance(a, Uint8Array)) a = Buffer.from(a, a.offset, a.byteLength)
  if (isInstance(b, Uint8Array)) b = Buffer.from(b, b.offset, b.byteLength)
  if (!Buffer.isBuffer(a) || !Buffer.isBuffer(b)) {
    throw new TypeError(
      'The "buf1", "buf2" arguments must be one of type Buffer or Uint8Array'
    )
  }

  if (a === b) return 0

  var x = a.length
  var y = b.length

  for (var i = 0, len = Math.min(x, y); i < len; ++i) {
    if (a[i] !== b[i]) {
      x = a[i]
      y = b[i]
      break
    }
  }

  if (x < y) return -1
  if (y < x) return 1
  return 0
}

Buffer.isEncoding = function isEncoding (encoding) {
  switch (String(encoding).toLowerCase()) {
    case 'hex':
    case 'utf8':
    case 'utf-8':
    case 'ascii':
    case 'latin1':
    case 'binary':
    case 'base64':
    case 'ucs2':
    case 'ucs-2':
    case 'utf16le':
    case 'utf-16le':
      return true
    default:
      return false
  }
}

Buffer.concat = function concat (list, length) {
  if (!Array.isArray(list)) {
    throw new TypeError('"list" argument must be an Array of Buffers')
  }

  if (list.length === 0) {
    return Buffer.alloc(0)
  }

  var i
  if (length === undefined) {
    length = 0
    for (i = 0; i < list.length; ++i) {
      length += list[i].length
    }
  }

  var buffer = Buffer.allocUnsafe(length)
  var pos = 0
  for (i = 0; i < list.length; ++i) {
    var buf = list[i]
    if (isInstance(buf, Uint8Array)) {
      buf = Buffer.from(buf)
    }
    if (!Buffer.isBuffer(buf)) {
      throw new TypeError('"list" argument must be an Array of Buffers')
    }
    buf.copy(buffer, pos)
    pos += buf.length
  }
  return buffer
}

function byteLength (string, encoding) {
  if (Buffer.isBuffer(string)) {
    return string.length
  }
  if (ArrayBuffer.isView(string) || isInstance(string, ArrayBuffer)) {
    return string.byteLength
  }
  if (typeof string !== 'string') {
    throw new TypeError(
      'The "string" argument must be one of type string, Buffer, or ArrayBuffer. ' +
      'Received type ' + typeof string
    )
  }

  var len = string.length
  var mustMatch = (arguments.length > 2 && arguments[2] === true)
  if (!mustMatch && len === 0) return 0

  // Use a for loop to avoid recursion
  var loweredCase = false
  for (;;) {
    switch (encoding) {
      case 'ascii':
      case 'latin1':
      case 'binary':
        return len
      case 'utf8':
      case 'utf-8':
        return utf8ToBytes(string).length
      case 'ucs2':
      case 'ucs-2':
      case 'utf16le':
      case 'utf-16le':
        return len * 2
      case 'hex':
        return len >>> 1
      case 'base64':
        return base64ToBytes(string).length
      default:
        if (loweredCase) {
          return mustMatch ? -1 : utf8ToBytes(string).length // assume utf8
        }
        encoding = ('' + encoding).toLowerCase()
        loweredCase = true
    }
  }
}
Buffer.byteLength = byteLength

function slowToString (encoding, start, end) {
  var loweredCase = false

  // No need to verify that "this.length <= MAX_UINT32" since it's a read-only
  // property of a typed array.

  // This behaves neither like String nor Uint8Array in that we set start/end
  // to their upper/lower bounds if the value passed is out of range.
  // undefined is handled specially as per ECMA-262 6th Edition,
  // Section 13.3.3.7 Runtime Semantics: KeyedBindingInitialization.
  if (start === undefined || start < 0) {
    start = 0
  }
  // Return early if start > this.length. Done here to prevent potential uint32
  // coercion fail below.
  if (start > this.length) {
    return ''
  }

  if (end === undefined || end > this.length) {
    end = this.length
  }

  if (end <= 0) {
    return ''
  }

  // Force coersion to uint32. This will also coerce falsey/NaN values to 0.
  end >>>= 0
  start >>>= 0

  if (end <= start) {
    return ''
  }

  if (!encoding) encoding = 'utf8'

  while (true) {
    switch (encoding) {
      case 'hex':
        return hexSlice(this, start, end)

      case 'utf8':
      case 'utf-8':
        return utf8Slice(this, start, end)

      case 'ascii':
        return asciiSlice(this, start, end)

      case 'latin1':
      case 'binary':
        return latin1Slice(this, start, end)

      case 'base64':
        return base64Slice(this, start, end)

      case 'ucs2':
      case 'ucs-2':
      case 'utf16le':
      case 'utf-16le':
        return utf16leSlice(this, start, end)

      default:
        if (loweredCase) throw new TypeError('Unknown encoding: ' + encoding)
        encoding = (encoding + '').toLowerCase()
        loweredCase = true
    }
  }
}

// This property is used by `Buffer.isBuffer` (and the `is-buffer` npm package)
// to detect a Buffer instance. It's not possible to use `instanceof Buffer`
// reliably in a browserify context because there could be multiple different
// copies of the 'buffer' package in use. This method works even for Buffer
// instances that were created from another copy of the `buffer` package.
// See: https://github.com/feross/buffer/issues/154
Buffer.prototype._isBuffer = true

function swap (b, n, m) {
  var i = b[n]
  b[n] = b[m]
  b[m] = i
}

Buffer.prototype.swap16 = function swap16 () {
  var len = this.length
  if (len % 2 !== 0) {
    throw new RangeError('Buffer size must be a multiple of 16-bits')
  }
  for (var i = 0; i < len; i += 2) {
    swap(this, i, i + 1)
  }
  return this
}

Buffer.prototype.swap32 = function swap32 () {
  var len = this.length
  if (len % 4 !== 0) {
    throw new RangeError('Buffer size must be a multiple of 32-bits')
  }
  for (var i = 0; i < len; i += 4) {
    swap(this, i, i + 3)
    swap(this, i + 1, i + 2)
  }
  return this
}

Buffer.prototype.swap64 = function swap64 () {
  var len = this.length
  if (len % 8 !== 0) {
    throw new RangeError('Buffer size must be a multiple of 64-bits')
  }
  for (var i = 0; i < len; i += 8) {
    swap(this, i, i + 7)
    swap(this, i + 1, i + 6)
    swap(this, i + 2, i + 5)
    swap(this, i + 3, i + 4)
  }
  return this
}

Buffer.prototype.toString = function toString () {
  var length = this.length
  if (length === 0) return ''
  if (arguments.length === 0) return utf8Slice(this, 0, length)
  return slowToString.apply(this, arguments)
}

Buffer.prototype.toLocaleString = Buffer.prototype.toString

Buffer.prototype.equals = function equals (b) {
  if (!Buffer.isBuffer(b)) throw new TypeError('Argument must be a Buffer')
  if (this === b) return true
  return Buffer.compare(this, b) === 0
}

Buffer.prototype.inspect = function inspect () {
  var str = ''
  var max = exports.INSPECT_MAX_BYTES
  str = this.toString('hex', 0, max).replace(/(.{2})/g, '$1 ').trim()
  if (this.length > max) str += ' ... '
  return '<Buffer ' + str + '>'
}
if (customInspectSymbol) {
  Buffer.prototype[customInspectSymbol] = Buffer.prototype.inspect
}

Buffer.prototype.compare = function compare (target, start, end, thisStart, thisEnd) {
  if (isInstance(target, Uint8Array)) {
    target = Buffer.from(target, target.offset, target.byteLength)
  }
  if (!Buffer.isBuffer(target)) {
    throw new TypeError(
      'The "target" argument must be one of type Buffer or Uint8Array. ' +
      'Received type ' + (typeof target)
    )
  }

  if (start === undefined) {
    start = 0
  }
  if (end === undefined) {
    end = target ? target.length : 0
  }
  if (thisStart === undefined) {
    thisStart = 0
  }
  if (thisEnd === undefined) {
    thisEnd = this.length
  }

  if (start < 0 || end > target.length || thisStart < 0 || thisEnd > this.length) {
    throw new RangeError('out of range index')
  }

  if (thisStart >= thisEnd && start >= end) {
    return 0
  }
  if (thisStart >= thisEnd) {
    return -1
  }
  if (start >= end) {
    return 1
  }

  start >>>= 0
  end >>>= 0
  thisStart >>>= 0
  thisEnd >>>= 0

  if (this === target) return 0

  var x = thisEnd - thisStart
  var y = end - start
  var len = Math.min(x, y)

  var thisCopy = this.slice(thisStart, thisEnd)
  var targetCopy = target.slice(start, end)

  for (var i = 0; i < len; ++i) {
    if (thisCopy[i] !== targetCopy[i]) {
      x = thisCopy[i]
      y = targetCopy[i]
      break
    }
  }

  if (x < y) return -1
  if (y < x) return 1
  return 0
}

// Finds either the first index of `val` in `buffer` at offset >= `byteOffset`,
// OR the last index of `val` in `buffer` at offset <= `byteOffset`.
//
// Arguments:
// - buffer - a Buffer to search
// - val - a string, Buffer, or number
// - byteOffset - an index into `buffer`; will be clamped to an int32
// - encoding - an optional encoding, relevant is val is a string
// - dir - true for indexOf, false for lastIndexOf
function bidirectionalIndexOf (buffer, val, byteOffset, encoding, dir) {
  // Empty buffer means no match
  if (buffer.length === 0) return -1

  // Normalize byteOffset
  if (typeof byteOffset === 'string') {
    encoding = byteOffset
    byteOffset = 0
  } else if (byteOffset > 0x7fffffff) {
    byteOffset = 0x7fffffff
  } else if (byteOffset < -0x80000000) {
    byteOffset = -0x80000000
  }
  byteOffset = +byteOffset // Coerce to Number.
  if (numberIsNaN(byteOffset)) {
    // byteOffset: it it's undefined, null, NaN, "foo", etc, search whole buffer
    byteOffset = dir ? 0 : (buffer.length - 1)
  }

  // Normalize byteOffset: negative offsets start from the end of the buffer
  if (byteOffset < 0) byteOffset = buffer.length + byteOffset
  if (byteOffset >= buffer.length) {
    if (dir) return -1
    else byteOffset = buffer.length - 1
  } else if (byteOffset < 0) {
    if (dir) byteOffset = 0
    else return -1
  }

  // Normalize val
  if (typeof val === 'string') {
    val = Buffer.from(val, encoding)
  }

  // Finally, search either indexOf (if dir is true) or lastIndexOf
  if (Buffer.isBuffer(val)) {
    // Special case: looking for empty string/buffer always fails
    if (val.length === 0) {
      return -1
    }
    return arrayIndexOf(buffer, val, byteOffset, encoding, dir)
  } else if (typeof val === 'number') {
    val = val & 0xFF // Search for a byte value [0-255]
    if (typeof Uint8Array.prototype.indexOf === 'function') {
      if (dir) {
        return Uint8Array.prototype.indexOf.call(buffer, val, byteOffset)
      } else {
        return Uint8Array.prototype.lastIndexOf.call(buffer, val, byteOffset)
      }
    }
    return arrayIndexOf(buffer, [val], byteOffset, encoding, dir)
  }

  throw new TypeError('val must be string, number or Buffer')
}

function arrayIndexOf (arr, val, byteOffset, encoding, dir) {
  var indexSize = 1
  var arrLength = arr.length
  var valLength = val.length

  if (encoding !== undefined) {
    encoding = String(encoding).toLowerCase()
    if (encoding === 'ucs2' || encoding === 'ucs-2' ||
        encoding === 'utf16le' || encoding === 'utf-16le') {
      if (arr.length < 2 || val.length < 2) {
        return -1
      }
      indexSize = 2
      arrLength /= 2
      valLength /= 2
      byteOffset /= 2
    }
  }

  function read (buf, i) {
    if (indexSize === 1) {
      return buf[i]
    } else {
      return buf.readUInt16BE(i * indexSize)
    }
  }

  var i
  if (dir) {
    var foundIndex = -1
    for (i = byteOffset; i < arrLength; i++) {
      if (read(arr, i) === read(val, foundIndex === -1 ? 0 : i - foundIndex)) {
        if (foundIndex === -1) foundIndex = i
        if (i - foundIndex + 1 === valLength) return foundIndex * indexSize
      } else {
        if (foundIndex !== -1) i -= i - foundIndex
        foundIndex = -1
      }
    }
  } else {
    if (byteOffset + valLength > arrLength) byteOffset = arrLength - valLength
    for (i = byteOffset; i >= 0; i--) {
      var found = true
      for (var j = 0; j < valLength; j++) {
        if (read(arr, i + j) !== read(val, j)) {
          found = false
          break
        }
      }
      if (found) return i
    }
  }

  return -1
}

Buffer.prototype.includes = function includes (val, byteOffset, encoding) {
  return this.indexOf(val, byteOffset, encoding) !== -1
}

Buffer.prototype.indexOf = function indexOf (val, byteOffset, encoding) {
  return bidirectionalIndexOf(this, val, byteOffset, encoding, true)
}

Buffer.prototype.lastIndexOf = function lastIndexOf (val, byteOffset, encoding) {
  return bidirectionalIndexOf(this, val, byteOffset, encoding, false)
}

function hexWrite (buf, string, offset, length) {
  offset = Number(offset) || 0
  var remaining = buf.length - offset
  if (!length) {
    length = remaining
  } else {
    length = Number(length)
    if (length > remaining) {
      length = remaining
    }
  }

  var strLen = string.length

  if (length > strLen / 2) {
    length = strLen / 2
  }
  for (var i = 0; i < length; ++i) {
    var parsed = parseInt(string.substr(i * 2, 2), 16)
    if (numberIsNaN(parsed)) return i
    buf[offset + i] = parsed
  }
  return i
}

function utf8Write (buf, string, offset, length) {
  return blitBuffer(utf8ToBytes(string, buf.length - offset), buf, offset, length)
}

function asciiWrite (buf, string, offset, length) {
  return blitBuffer(asciiToBytes(string), buf, offset, length)
}

function latin1Write (buf, string, offset, length) {
  return asciiWrite(buf, string, offset, length)
}

function base64Write (buf, string, offset, length) {
  return blitBuffer(base64ToBytes(string), buf, offset, length)
}

function ucs2Write (buf, string, offset, length) {
  return blitBuffer(utf16leToBytes(string, buf.length - offset), buf, offset, length)
}

Buffer.prototype.write = function write (string, offset, length, encoding) {
  // Buffer#write(string)
  if (offset === undefined) {
    encoding = 'utf8'
    length = this.length
    offset = 0
  // Buffer#write(string, encoding)
  } else if (length === undefined && typeof offset === 'string') {
    encoding = offset
    length = this.length
    offset = 0
  // Buffer#write(string, offset[, length][, encoding])
  } else if (isFinite(offset)) {
    offset = offset >>> 0
    if (isFinite(length)) {
      length = length >>> 0
      if (encoding === undefined) encoding = 'utf8'
    } else {
      encoding = length
      length = undefined
    }
  } else {
    throw new Error(
      'Buffer.write(string, encoding, offset[, length]) is no longer supported'
    )
  }

  var remaining = this.length - offset
  if (length === undefined || length > remaining) length = remaining

  if ((string.length > 0 && (length < 0 || offset < 0)) || offset > this.length) {
    throw new RangeError('Attempt to write outside buffer bounds')
  }

  if (!encoding) encoding = 'utf8'

  var loweredCase = false
  for (;;) {
    switch (encoding) {
      case 'hex':
        return hexWrite(this, string, offset, length)

      case 'utf8':
      case 'utf-8':
        return utf8Write(this, string, offset, length)

      case 'ascii':
        return asciiWrite(this, string, offset, length)

      case 'latin1':
      case 'binary':
        return latin1Write(this, string, offset, length)

      case 'base64':
        // Warning: maxLength not taken into account in base64Write
        return base64Write(this, string, offset, length)

      case 'ucs2':
      case 'ucs-2':
      case 'utf16le':
      case 'utf-16le':
        return ucs2Write(this, string, offset, length)

      default:
        if (loweredCase) throw new TypeError('Unknown encoding: ' + encoding)
        encoding = ('' + encoding).toLowerCase()
        loweredCase = true
    }
  }
}

Buffer.prototype.toJSON = function toJSON () {
  return {
    type: 'Buffer',
    data: Array.prototype.slice.call(this._arr || this, 0)
  }
}

function base64Slice (buf, start, end) {
  if (start === 0 && end === buf.length) {
    return base64.fromByteArray(buf)
  } else {
    return base64.fromByteArray(buf.slice(start, end))
  }
}

function utf8Slice (buf, start, end) {
  end = Math.min(buf.length, end)
  var res = []

  var i = start
  while (i < end) {
    var firstByte = buf[i]
    var codePoint = null
    var bytesPerSequence = (firstByte > 0xEF) ? 4
      : (firstByte > 0xDF) ? 3
        : (firstByte > 0xBF) ? 2
          : 1

    if (i + bytesPerSequence <= end) {
      var secondByte, thirdByte, fourthByte, tempCodePoint

      switch (bytesPerSequence) {
        case 1:
          if (firstByte < 0x80) {
            codePoint = firstByte
          }
          break
        case 2:
          secondByte = buf[i + 1]
          if ((secondByte & 0xC0) === 0x80) {
            tempCodePoint = (firstByte & 0x1F) << 0x6 | (secondByte & 0x3F)
            if (tempCodePoint > 0x7F) {
              codePoint = tempCodePoint
            }
          }
          break
        case 3:
          secondByte = buf[i + 1]
          thirdByte = buf[i + 2]
          if ((secondByte & 0xC0) === 0x80 && (thirdByte & 0xC0) === 0x80) {
            tempCodePoint = (firstByte & 0xF) << 0xC | (secondByte & 0x3F) << 0x6 | (thirdByte & 0x3F)
            if (tempCodePoint > 0x7FF && (tempCodePoint < 0xD800 || tempCodePoint > 0xDFFF)) {
              codePoint = tempCodePoint
            }
          }
          break
        case 4:
          secondByte = buf[i + 1]
          thirdByte = buf[i + 2]
          fourthByte = buf[i + 3]
          if ((secondByte & 0xC0) === 0x80 && (thirdByte & 0xC0) === 0x80 && (fourthByte & 0xC0) === 0x80) {
            tempCodePoint = (firstByte & 0xF) << 0x12 | (secondByte & 0x3F) << 0xC | (thirdByte & 0x3F) << 0x6 | (fourthByte & 0x3F)
            if (tempCodePoint > 0xFFFF && tempCodePoint < 0x110000) {
              codePoint = tempCodePoint
            }
          }
      }
    }

    if (codePoint === null) {
      // we did not generate a valid codePoint so insert a
      // replacement char (U+FFFD) and advance only 1 byte
      codePoint = 0xFFFD
      bytesPerSequence = 1
    } else if (codePoint > 0xFFFF) {
      // encode to utf16 (surrogate pair dance)
      codePoint -= 0x10000
      res.push(codePoint >>> 10 & 0x3FF | 0xD800)
      codePoint = 0xDC00 | codePoint & 0x3FF
    }

    res.push(codePoint)
    i += bytesPerSequence
  }

  return decodeCodePointsArray(res)
}

// Based on http://stackoverflow.com/a/22747272/680742, the browser with
// the lowest limit is Chrome, with 0x10000 args.
// We go 1 magnitude less, for safety
var MAX_ARGUMENTS_LENGTH = 0x1000

function decodeCodePointsArray (codePoints) {
  var len = codePoints.length
  if (len <= MAX_ARGUMENTS_LENGTH) {
    return String.fromCharCode.apply(String, codePoints) // avoid extra slice()
  }

  // Decode in chunks to avoid "call stack size exceeded".
  var res = ''
  var i = 0
  while (i < len) {
    res += String.fromCharCode.apply(
      String,
      codePoints.slice(i, i += MAX_ARGUMENTS_LENGTH)
    )
  }
  return res
}

function asciiSlice (buf, start, end) {
  var ret = ''
  end = Math.min(buf.length, end)

  for (var i = start; i < end; ++i) {
    ret += String.fromCharCode(buf[i] & 0x7F)
  }
  return ret
}

function latin1Slice (buf, start, end) {
  var ret = ''
  end = Math.min(buf.length, end)

  for (var i = start; i < end; ++i) {
    ret += String.fromCharCode(buf[i])
  }
  return ret
}

function hexSlice (buf, start, end) {
  var len = buf.length

  if (!start || start < 0) start = 0
  if (!end || end < 0 || end > len) end = len

  var out = ''
  for (var i = start; i < end; ++i) {
    out += hexSliceLookupTable[buf[i]]
  }
  return out
}

function utf16leSlice (buf, start, end) {
  var bytes = buf.slice(start, end)
  var res = ''
  for (var i = 0; i < bytes.length; i += 2) {
    res += String.fromCharCode(bytes[i] + (bytes[i + 1] * 256))
  }
  return res
}

Buffer.prototype.slice = function slice (start, end) {
  var len = this.length
  start = ~~start
  end = end === undefined ? len : ~~end

  if (start < 0) {
    start += len
    if (start < 0) start = 0
  } else if (start > len) {
    start = len
  }

  if (end < 0) {
    end += len
    if (end < 0) end = 0
  } else if (end > len) {
    end = len
  }

  if (end < start) end = start

  var newBuf = this.subarray(start, end)
  // Return an augmented `Uint8Array` instance
  Object.setPrototypeOf(newBuf, Buffer.prototype)

  return newBuf
}

/*
 * Need to make sure that buffer isn't trying to write out of bounds.
 */
function checkOffset (offset, ext, length) {
  if ((offset % 1) !== 0 || offset < 0) throw new RangeError('offset is not uint')
  if (offset + ext > length) throw new RangeError('Trying to access beyond buffer length')
}

Buffer.prototype.readUIntLE = function readUIntLE (offset, byteLength, noAssert) {
  offset = offset >>> 0
  byteLength = byteLength >>> 0
  if (!noAssert) checkOffset(offset, byteLength, this.length)

  var val = this[offset]
  var mul = 1
  var i = 0
  while (++i < byteLength && (mul *= 0x100)) {
    val += this[offset + i] * mul
  }

  return val
}

Buffer.prototype.readUIntBE = function readUIntBE (offset, byteLength, noAssert) {
  offset = offset >>> 0
  byteLength = byteLength >>> 0
  if (!noAssert) {
    checkOffset(offset, byteLength, this.length)
  }

  var val = this[offset + --byteLength]
  var mul = 1
  while (byteLength > 0 && (mul *= 0x100)) {
    val += this[offset + --byteLength] * mul
  }

  return val
}

Buffer.prototype.readUInt8 = function readUInt8 (offset, noAssert) {
  offset = offset >>> 0
  if (!noAssert) checkOffset(offset, 1, this.length)
  return this[offset]
}

Buffer.prototype.readUInt16LE = function readUInt16LE (offset, noAssert) {
  offset = offset >>> 0
  if (!noAssert) checkOffset(offset, 2, this.length)
  return this[offset] | (this[offset + 1] << 8)
}

Buffer.prototype.readUInt16BE = function readUInt16BE (offset, noAssert) {
  offset = offset >>> 0
  if (!noAssert) checkOffset(offset, 2, this.length)
  return (this[offset] << 8) | this[offset + 1]
}

Buffer.prototype.readUInt32LE = function readUInt32LE (offset, noAssert) {
  offset = offset >>> 0
  if (!noAssert) checkOffset(offset, 4, this.length)

  return ((this[offset]) |
      (this[offset + 1] << 8) |
      (this[offset + 2] << 16)) +
      (this[offset + 3] * 0x1000000)
}

Buffer.prototype.readUInt32BE = function readUInt32BE (offset, noAssert) {
  offset = offset >>> 0
  if (!noAssert) checkOffset(offset, 4, this.length)

  return (this[offset] * 0x1000000) +
    ((this[offset + 1] << 16) |
    (this[offset + 2] << 8) |
    this[offset + 3])
}

Buffer.prototype.readIntLE = function readIntLE (offset, byteLength, noAssert) {
  offset = offset >>> 0
  byteLength = byteLength >>> 0
  if (!noAssert) checkOffset(offset, byteLength, this.length)

  var val = this[offset]
  var mul = 1
  var i = 0
  while (++i < byteLength && (mul *= 0x100)) {
    val += this[offset + i] * mul
  }
  mul *= 0x80

  if (val >= mul) val -= Math.pow(2, 8 * byteLength)

  return val
}

Buffer.prototype.readIntBE = function readIntBE (offset, byteLength, noAssert) {
  offset = offset >>> 0
  byteLength = byteLength >>> 0
  if (!noAssert) checkOffset(offset, byteLength, this.length)

  var i = byteLength
  var mul = 1
  var val = this[offset + --i]
  while (i > 0 && (mul *= 0x100)) {
    val += this[offset + --i] * mul
  }
  mul *= 0x80

  if (val >= mul) val -= Math.pow(2, 8 * byteLength)

  return val
}

Buffer.prototype.readInt8 = function readInt8 (offset, noAssert) {
  offset = offset >>> 0
  if (!noAssert) checkOffset(offset, 1, this.length)
  if (!(this[offset] & 0x80)) return (this[offset])
  return ((0xff - this[offset] + 1) * -1)
}

Buffer.prototype.readInt16LE = function readInt16LE (offset, noAssert) {
  offset = offset >>> 0
  if (!noAssert) checkOffset(offset, 2, this.length)
  var val = this[offset] | (this[offset + 1] << 8)
  return (val & 0x8000) ? val | 0xFFFF0000 : val
}

Buffer.prototype.readInt16BE = function readInt16BE (offset, noAssert) {
  offset = offset >>> 0
  if (!noAssert) checkOffset(offset, 2, this.length)
  var val = this[offset + 1] | (this[offset] << 8)
  return (val & 0x8000) ? val | 0xFFFF0000 : val
}

Buffer.prototype.readInt32LE = function readInt32LE (offset, noAssert) {
  offset = offset >>> 0
  if (!noAssert) checkOffset(offset, 4, this.length)

  return (this[offset]) |
    (this[offset + 1] << 8) |
    (this[offset + 2] << 16) |
    (this[offset + 3] << 24)
}

Buffer.prototype.readInt32BE = function readInt32BE (offset, noAssert) {
  offset = offset >>> 0
  if (!noAssert) checkOffset(offset, 4, this.length)

  return (this[offset] << 24) |
    (this[offset + 1] << 16) |
    (this[offset + 2] << 8) |
    (this[offset + 3])
}

Buffer.prototype.readFloatLE = function readFloatLE (offset, noAssert) {
  offset = offset >>> 0
  if (!noAssert) checkOffset(offset, 4, this.length)
  return ieee754.read(this, offset, true, 23, 4)
}

Buffer.prototype.readFloatBE = function readFloatBE (offset, noAssert) {
  offset = offset >>> 0
  if (!noAssert) checkOffset(offset, 4, this.length)
  return ieee754.read(this, offset, false, 23, 4)
}

Buffer.prototype.readDoubleLE = function readDoubleLE (offset, noAssert) {
  offset = offset >>> 0
  if (!noAssert) checkOffset(offset, 8, this.length)
  return ieee754.read(this, offset, true, 52, 8)
}

Buffer.prototype.readDoubleBE = function readDoubleBE (offset, noAssert) {
  offset = offset >>> 0
  if (!noAssert) checkOffset(offset, 8, this.length)
  return ieee754.read(this, offset, false, 52, 8)
}

function checkInt (buf, value, offset, ext, max, min) {
  if (!Buffer.isBuffer(buf)) throw new TypeError('"buffer" argument must be a Buffer instance')
  if (value > max || value < min) throw new RangeError('"value" argument is out of bounds')
  if (offset + ext > buf.length) throw new RangeError('Index out of range')
}

Buffer.prototype.writeUIntLE = function writeUIntLE (value, offset, byteLength, noAssert) {
  value = +value
  offset = offset >>> 0
  byteLength = byteLength >>> 0
  if (!noAssert) {
    var maxBytes = Math.pow(2, 8 * byteLength) - 1
    checkInt(this, value, offset, byteLength, maxBytes, 0)
  }

  var mul = 1
  var i = 0
  this[offset] = value & 0xFF
  while (++i < byteLength && (mul *= 0x100)) {
    this[offset + i] = (value / mul) & 0xFF
  }

  return offset + byteLength
}

Buffer.prototype.writeUIntBE = function writeUIntBE (value, offset, byteLength, noAssert) {
  value = +value
  offset = offset >>> 0
  byteLength = byteLength >>> 0
  if (!noAssert) {
    var maxBytes = Math.pow(2, 8 * byteLength) - 1
    checkInt(this, value, offset, byteLength, maxBytes, 0)
  }

  var i = byteLength - 1
  var mul = 1
  this[offset + i] = value & 0xFF
  while (--i >= 0 && (mul *= 0x100)) {
    this[offset + i] = (value / mul) & 0xFF
  }

  return offset + byteLength
}

Buffer.prototype.writeUInt8 = function writeUInt8 (value, offset, noAssert) {
  value = +value
  offset = offset >>> 0
  if (!noAssert) checkInt(this, value, offset, 1, 0xff, 0)
  this[offset] = (value & 0xff)
  return offset + 1
}

Buffer.prototype.writeUInt16LE = function writeUInt16LE (value, offset, noAssert) {
  value = +value
  offset = offset >>> 0
  if (!noAssert) checkInt(this, value, offset, 2, 0xffff, 0)
  this[offset] = (value & 0xff)
  this[offset + 1] = (value >>> 8)
  return offset + 2
}

Buffer.prototype.writeUInt16BE = function writeUInt16BE (value, offset, noAssert) {
  value = +value
  offset = offset >>> 0
  if (!noAssert) checkInt(this, value, offset, 2, 0xffff, 0)
  this[offset] = (value >>> 8)
  this[offset + 1] = (value & 0xff)
  return offset + 2
}

Buffer.prototype.writeUInt32LE = function writeUInt32LE (value, offset, noAssert) {
  value = +value
  offset = offset >>> 0
  if (!noAssert) checkInt(this, value, offset, 4, 0xffffffff, 0)
  this[offset + 3] = (value >>> 24)
  this[offset + 2] = (value >>> 16)
  this[offset + 1] = (value >>> 8)
  this[offset] = (value & 0xff)
  return offset + 4
}

Buffer.prototype.writeUInt32BE = function writeUInt32BE (value, offset, noAssert) {
  value = +value
  offset = offset >>> 0
  if (!noAssert) checkInt(this, value, offset, 4, 0xffffffff, 0)
  this[offset] = (value >>> 24)
  this[offset + 1] = (value >>> 16)
  this[offset + 2] = (value >>> 8)
  this[offset + 3] = (value & 0xff)
  return offset + 4
}

Buffer.prototype.writeIntLE = function writeIntLE (value, offset, byteLength, noAssert) {
  value = +value
  offset = offset >>> 0
  if (!noAssert) {
    var limit = Math.pow(2, (8 * byteLength) - 1)

    checkInt(this, value, offset, byteLength, limit - 1, -limit)
  }

  var i = 0
  var mul = 1
  var sub = 0
  this[offset] = value & 0xFF
  while (++i < byteLength && (mul *= 0x100)) {
    if (value < 0 && sub === 0 && this[offset + i - 1] !== 0) {
      sub = 1
    }
    this[offset + i] = ((value / mul) >> 0) - sub & 0xFF
  }

  return offset + byteLength
}

Buffer.prototype.writeIntBE = function writeIntBE (value, offset, byteLength, noAssert) {
  value = +value
  offset = offset >>> 0
  if (!noAssert) {
    var limit = Math.pow(2, (8 * byteLength) - 1)

    checkInt(this, value, offset, byteLength, limit - 1, -limit)
  }

  var i = byteLength - 1
  var mul = 1
  var sub = 0
  this[offset + i] = value & 0xFF
  while (--i >= 0 && (mul *= 0x100)) {
    if (value < 0 && sub === 0 && this[offset + i + 1] !== 0) {
      sub = 1
    }
    this[offset + i] = ((value / mul) >> 0) - sub & 0xFF
  }

  return offset + byteLength
}

Buffer.prototype.writeInt8 = function writeInt8 (value, offset, noAssert) {
  value = +value
  offset = offset >>> 0
  if (!noAssert) checkInt(this, value, offset, 1, 0x7f, -0x80)
  if (value < 0) value = 0xff + value + 1
  this[offset] = (value & 0xff)
  return offset + 1
}

Buffer.prototype.writeInt16LE = function writeInt16LE (value, offset, noAssert) {
  value = +value
  offset = offset >>> 0
  if (!noAssert) checkInt(this, value, offset, 2, 0x7fff, -0x8000)
  this[offset] = (value & 0xff)
  this[offset + 1] = (value >>> 8)
  return offset + 2
}

Buffer.prototype.writeInt16BE = function writeInt16BE (value, offset, noAssert) {
  value = +value
  offset = offset >>> 0
  if (!noAssert) checkInt(this, value, offset, 2, 0x7fff, -0x8000)
  this[offset] = (value >>> 8)
  this[offset + 1] = (value & 0xff)
  return offset + 2
}

Buffer.prototype.writeInt32LE = function writeInt32LE (value, offset, noAssert) {
  value = +value
  offset = offset >>> 0
  if (!noAssert) checkInt(this, value, offset, 4, 0x7fffffff, -0x80000000)
  this[offset] = (value & 0xff)
  this[offset + 1] = (value >>> 8)
  this[offset + 2] = (value >>> 16)
  this[offset + 3] = (value >>> 24)
  return offset + 4
}

Buffer.prototype.writeInt32BE = function writeInt32BE (value, offset, noAssert) {
  value = +value
  offset = offset >>> 0
  if (!noAssert) checkInt(this, value, offset, 4, 0x7fffffff, -0x80000000)
  if (value < 0) value = 0xffffffff + value + 1
  this[offset] = (value >>> 24)
  this[offset + 1] = (value >>> 16)
  this[offset + 2] = (value >>> 8)
  this[offset + 3] = (value & 0xff)
  return offset + 4
}

function checkIEEE754 (buf, value, offset, ext, max, min) {
  if (offset + ext > buf.length) throw new RangeError('Index out of range')
  if (offset < 0) throw new RangeError('Index out of range')
}

function writeFloat (buf, value, offset, littleEndian, noAssert) {
  value = +value
  offset = offset >>> 0
  if (!noAssert) {
    checkIEEE754(buf, value, offset, 4, 3.4028234663852886e+38, -3.4028234663852886e+38)
  }
  ieee754.write(buf, value, offset, littleEndian, 23, 4)
  return offset + 4
}

Buffer.prototype.writeFloatLE = function writeFloatLE (value, offset, noAssert) {
  return writeFloat(this, value, offset, true, noAssert)
}

Buffer.prototype.writeFloatBE = function writeFloatBE (value, offset, noAssert) {
  return writeFloat(this, value, offset, false, noAssert)
}

function writeDouble (buf, value, offset, littleEndian, noAssert) {
  value = +value
  offset = offset >>> 0
  if (!noAssert) {
    checkIEEE754(buf, value, offset, 8, 1.7976931348623157E+308, -1.7976931348623157E+308)
  }
  ieee754.write(buf, value, offset, littleEndian, 52, 8)
  return offset + 8
}

Buffer.prototype.writeDoubleLE = function writeDoubleLE (value, offset, noAssert) {
  return writeDouble(this, value, offset, true, noAssert)
}

Buffer.prototype.writeDoubleBE = function writeDoubleBE (value, offset, noAssert) {
  return writeDouble(this, value, offset, false, noAssert)
}

// copy(targetBuffer, targetStart=0, sourceStart=0, sourceEnd=buffer.length)
Buffer.prototype.copy = function copy (target, targetStart, start, end) {
  if (!Buffer.isBuffer(target)) throw new TypeError('argument should be a Buffer')
  if (!start) start = 0
  if (!end && end !== 0) end = this.length
  if (targetStart >= target.length) targetStart = target.length
  if (!targetStart) targetStart = 0
  if (end > 0 && end < start) end = start

  // Copy 0 bytes; we're done
  if (end === start) return 0
  if (target.length === 0 || this.length === 0) return 0

  // Fatal error conditions
  if (targetStart < 0) {
    throw new RangeError('targetStart out of bounds')
  }
  if (start < 0 || start >= this.length) throw new RangeError('Index out of range')
  if (end < 0) throw new RangeError('sourceEnd out of bounds')

  // Are we oob?
  if (end > this.length) end = this.length
  if (target.length - targetStart < end - start) {
    end = target.length - targetStart + start
  }

  var len = end - start

  if (this === target && typeof Uint8Array.prototype.copyWithin === 'function') {
    // Use built-in when available, missing from IE11
    this.copyWithin(targetStart, start, end)
  } else if (this === target && start < targetStart && targetStart < end) {
    // descending copy from end
    for (var i = len - 1; i >= 0; --i) {
      target[i + targetStart] = this[i + start]
    }
  } else {
    Uint8Array.prototype.set.call(
      target,
      this.subarray(start, end),
      targetStart
    )
  }

  return len
}

// Usage:
//    buffer.fill(number[, offset[, end]])
//    buffer.fill(buffer[, offset[, end]])
//    buffer.fill(string[, offset[, end]][, encoding])
Buffer.prototype.fill = function fill (val, start, end, encoding) {
  // Handle string cases:
  if (typeof val === 'string') {
    if (typeof start === 'string') {
      encoding = start
      start = 0
      end = this.length
    } else if (typeof end === 'string') {
      encoding = end
      end = this.length
    }
    if (encoding !== undefined && typeof encoding !== 'string') {
      throw new TypeError('encoding must be a string')
    }
    if (typeof encoding === 'string' && !Buffer.isEncoding(encoding)) {
      throw new TypeError('Unknown encoding: ' + encoding)
    }
    if (val.length === 1) {
      var code = val.charCodeAt(0)
      if ((encoding === 'utf8' && code < 128) ||
          encoding === 'latin1') {
        // Fast path: If `val` fits into a single byte, use that numeric value.
        val = code
      }
    }
  } else if (typeof val === 'number') {
    val = val & 255
  } else if (typeof val === 'boolean') {
    val = Number(val)
  }

  // Invalid ranges are not set to a default, so can range check early.
  if (start < 0 || this.length < start || this.length < end) {
    throw new RangeError('Out of range index')
  }

  if (end <= start) {
    return this
  }

  start = start >>> 0
  end = end === undefined ? this.length : end >>> 0

  if (!val) val = 0

  var i
  if (typeof val === 'number') {
    for (i = start; i < end; ++i) {
      this[i] = val
    }
  } else {
    var bytes = Buffer.isBuffer(val)
      ? val
      : Buffer.from(val, encoding)
    var len = bytes.length
    if (len === 0) {
      throw new TypeError('The value "' + val +
        '" is invalid for argument "value"')
    }
    for (i = 0; i < end - start; ++i) {
      this[i + start] = bytes[i % len]
    }
  }

  return this
}

// HELPER FUNCTIONS
// ================

var INVALID_BASE64_RE = /[^+/0-9A-Za-z-_]/g

function base64clean (str) {
  // Node takes equal signs as end of the Base64 encoding
  str = str.split('=')[0]
  // Node strips out invalid characters like \n and \t from the string, base64-js does not
  str = str.trim().replace(INVALID_BASE64_RE, '')
  // Node converts strings with length < 2 to ''
  if (str.length < 2) return ''
  // Node allows for non-padded base64 strings (missing trailing ===), base64-js does not
  while (str.length % 4 !== 0) {
    str = str + '='
  }
  return str
}

function utf8ToBytes (string, units) {
  units = units || Infinity
  var codePoint
  var length = string.length
  var leadSurrogate = null
  var bytes = []

  for (var i = 0; i < length; ++i) {
    codePoint = string.charCodeAt(i)

    // is surrogate component
    if (codePoint > 0xD7FF && codePoint < 0xE000) {
      // last char was a lead
      if (!leadSurrogate) {
        // no lead yet
        if (codePoint > 0xDBFF) {
          // unexpected trail
          if ((units -= 3) > -1) bytes.push(0xEF, 0xBF, 0xBD)
          continue
        } else if (i + 1 === length) {
          // unpaired lead
          if ((units -= 3) > -1) bytes.push(0xEF, 0xBF, 0xBD)
          continue
        }

        // valid lead
        leadSurrogate = codePoint

        continue
      }

      // 2 leads in a row
      if (codePoint < 0xDC00) {
        if ((units -= 3) > -1) bytes.push(0xEF, 0xBF, 0xBD)
        leadSurrogate = codePoint
        continue
      }

      // valid surrogate pair
      codePoint = (leadSurrogate - 0xD800 << 10 | codePoint - 0xDC00) + 0x10000
    } else if (leadSurrogate) {
      // valid bmp char, but last char was a lead
      if ((units -= 3) > -1) bytes.push(0xEF, 0xBF, 0xBD)
    }

    leadSurrogate = null

    // encode utf8
    if (codePoint < 0x80) {
      if ((units -= 1) < 0) break
      bytes.push(codePoint)
    } else if (codePoint < 0x800) {
      if ((units -= 2) < 0) break
      bytes.push(
        codePoint >> 0x6 | 0xC0,
        codePoint & 0x3F | 0x80
      )
    } else if (codePoint < 0x10000) {
      if ((units -= 3) < 0) break
      bytes.push(
        codePoint >> 0xC | 0xE0,
        codePoint >> 0x6 & 0x3F | 0x80,
        codePoint & 0x3F | 0x80
      )
    } else if (codePoint < 0x110000) {
      if ((units -= 4) < 0) break
      bytes.push(
        codePoint >> 0x12 | 0xF0,
        codePoint >> 0xC & 0x3F | 0x80,
        codePoint >> 0x6 & 0x3F | 0x80,
        codePoint & 0x3F | 0x80
      )
    } else {
      throw new Error('Invalid code point')
    }
  }

  return bytes
}

function asciiToBytes (str) {
  var byteArray = []
  for (var i = 0; i < str.length; ++i) {
    // Node's code seems to be doing this and not & 0x7F..
    byteArray.push(str.charCodeAt(i) & 0xFF)
  }
  return byteArray
}

function utf16leToBytes (str, units) {
  var c, hi, lo
  var byteArray = []
  for (var i = 0; i < str.length; ++i) {
    if ((units -= 2) < 0) break

    c = str.charCodeAt(i)
    hi = c >> 8
    lo = c % 256
    byteArray.push(lo)
    byteArray.push(hi)
  }

  return byteArray
}

function base64ToBytes (str) {
  return base64.toByteArray(base64clean(str))
}

function blitBuffer (src, dst, offset, length) {
  for (var i = 0; i < length; ++i) {
    if ((i + offset >= dst.length) || (i >= src.length)) break
    dst[i + offset] = src[i]
  }
  return i
}

// ArrayBuffer or Uint8Array objects from other contexts (i.e. iframes) do not pass
// the `instanceof` check but they should be treated as of that type.
// See: https://github.com/feross/buffer/issues/166
function isInstance (obj, type) {
  return obj instanceof type ||
    (obj != null && obj.constructor != null && obj.constructor.name != null &&
      obj.constructor.name === type.name)
}
function numberIsNaN (obj) {
  // For IE11 support
  return obj !== obj // eslint-disable-line no-self-compare
}

// Create lookup table for `toString('hex')`
// See: https://github.com/feross/buffer/issues/219
var hexSliceLookupTable = (function () {
  var alphabet = '0123456789abcdef'
  var table = new Array(256)
  for (var i = 0; i < 16; ++i) {
    var i16 = i * 16
    for (var j = 0; j < 16; ++j) {
      table[i16 + j] = alphabet[i] + alphabet[j]
    }
  }
  return table
})()

}).call(this,require("buffer").Buffer)

},{"base64-js":3,"buffer":4,"ieee754":5}],5:[function(require,module,exports){
exports.read = function (buffer, offset, isLE, mLen, nBytes) {
  var e, m
  var eLen = (nBytes * 8) - mLen - 1
  var eMax = (1 << eLen) - 1
  var eBias = eMax >> 1
  var nBits = -7
  var i = isLE ? (nBytes - 1) : 0
  var d = isLE ? -1 : 1
  var s = buffer[offset + i]

  i += d

  e = s & ((1 << (-nBits)) - 1)
  s >>= (-nBits)
  nBits += eLen
  for (; nBits > 0; e = (e * 256) + buffer[offset + i], i += d, nBits -= 8) {}

  m = e & ((1 << (-nBits)) - 1)
  e >>= (-nBits)
  nBits += mLen
  for (; nBits > 0; m = (m * 256) + buffer[offset + i], i += d, nBits -= 8) {}

  if (e === 0) {
    e = 1 - eBias
  } else if (e === eMax) {
    return m ? NaN : ((s ? -1 : 1) * Infinity)
  } else {
    m = m + Math.pow(2, mLen)
    e = e - eBias
  }
  return (s ? -1 : 1) * m * Math.pow(2, e - mLen)
}

exports.write = function (buffer, value, offset, isLE, mLen, nBytes) {
  var e, m, c
  var eLen = (nBytes * 8) - mLen - 1
  var eMax = (1 << eLen) - 1
  var eBias = eMax >> 1
  var rt = (mLen === 23 ? Math.pow(2, -24) - Math.pow(2, -77) : 0)
  var i = isLE ? 0 : (nBytes - 1)
  var d = isLE ? 1 : -1
  var s = value < 0 || (value === 0 && 1 / value < 0) ? 1 : 0

  value = Math.abs(value)

  if (isNaN(value) || value === Infinity) {
    m = isNaN(value) ? 1 : 0
    e = eMax
  } else {
    e = Math.floor(Math.log(value) / Math.LN2)
    if (value * (c = Math.pow(2, -e)) < 1) {
      e--
      c *= 2
    }
    if (e + eBias >= 1) {
      value += rt / c
    } else {
      value += rt * Math.pow(2, 1 - eBias)
    }
    if (value * c >= 2) {
      e++
      c /= 2
    }

    if (e + eBias >= eMax) {
      m = 0
      e = eMax
    } else if (e + eBias >= 1) {
      m = ((value * c) - 1) * Math.pow(2, mLen)
      e = e + eBias
    } else {
      m = value * Math.pow(2, eBias - 1) * Math.pow(2, mLen)
      e = 0
    }
  }

  for (; mLen >= 8; buffer[offset + i] = m & 0xff, i += d, m /= 256, mLen -= 8) {}

  e = (e << mLen) | m
  eLen += mLen
  for (; eLen > 0; buffer[offset + i] = e & 0xff, i += d, e /= 256, eLen -= 8) {}

  buffer[offset + i - d] |= s * 128
}

},{}],6:[function(require,module,exports){
'use strict';

var asap = require('asap/raw');

function noop() {}

// States:
//
// 0 - pending
// 1 - fulfilled with _value
// 2 - rejected with _value
// 3 - adopted the state of another promise, _value
//
// once the state is no longer pending (0) it is immutable

// All `_` prefixed properties will be reduced to `_{random number}`
// at build time to obfuscate them and discourage their use.
// We don't use symbols or Object.defineProperty to fully hide them
// because the performance isn't good enough.


// to avoid using try/catch inside critical functions, we
// extract them to here.
var LAST_ERROR = null;
var IS_ERROR = {};
function getThen(obj) {
  try {
    return obj.then;
  } catch (ex) {
    LAST_ERROR = ex;
    return IS_ERROR;
  }
}

function tryCallOne(fn, a) {
  try {
    return fn(a);
  } catch (ex) {
    LAST_ERROR = ex;
    return IS_ERROR;
  }
}
function tryCallTwo(fn, a, b) {
  try {
    fn(a, b);
  } catch (ex) {
    LAST_ERROR = ex;
    return IS_ERROR;
  }
}

module.exports = Promise;

function Promise(fn) {
  if (typeof this !== 'object') {
    throw new TypeError('Promises must be constructed via new');
  }
  if (typeof fn !== 'function') {
    throw new TypeError('Promise constructor\'s argument is not a function');
  }
  this._h = 0;
  this._i = 0;
  this._j = null;
  this._k = null;
  if (fn === noop) return;
  doResolve(fn, this);
}
Promise._l = null;
Promise._m = null;
Promise._n = noop;

Promise.prototype.then = function(onFulfilled, onRejected) {
  if (this.constructor !== Promise) {
    return safeThen(this, onFulfilled, onRejected);
  }
  var res = new Promise(noop);
  handle(this, new Handler(onFulfilled, onRejected, res));
  return res;
};

function safeThen(self, onFulfilled, onRejected) {
  return new self.constructor(function (resolve, reject) {
    var res = new Promise(noop);
    res.then(resolve, reject);
    handle(self, new Handler(onFulfilled, onRejected, res));
  });
}
function handle(self, deferred) {
  while (self._i === 3) {
    self = self._j;
  }
  if (Promise._l) {
    Promise._l(self);
  }
  if (self._i === 0) {
    if (self._h === 0) {
      self._h = 1;
      self._k = deferred;
      return;
    }
    if (self._h === 1) {
      self._h = 2;
      self._k = [self._k, deferred];
      return;
    }
    self._k.push(deferred);
    return;
  }
  handleResolved(self, deferred);
}

function handleResolved(self, deferred) {
  asap(function() {
    var cb = self._i === 1 ? deferred.onFulfilled : deferred.onRejected;
    if (cb === null) {
      if (self._i === 1) {
        resolve(deferred.promise, self._j);
      } else {
        reject(deferred.promise, self._j);
      }
      return;
    }
    var ret = tryCallOne(cb, self._j);
    if (ret === IS_ERROR) {
      reject(deferred.promise, LAST_ERROR);
    } else {
      resolve(deferred.promise, ret);
    }
  });
}
function resolve(self, newValue) {
  // Promise Resolution Procedure: https://github.com/promises-aplus/promises-spec#the-promise-resolution-procedure
  if (newValue === self) {
    return reject(
      self,
      new TypeError('A promise cannot be resolved with itself.')
    );
  }
  if (
    newValue &&
    (typeof newValue === 'object' || typeof newValue === 'function')
  ) {
    var then = getThen(newValue);
    if (then === IS_ERROR) {
      return reject(self, LAST_ERROR);
    }
    if (
      then === self.then &&
      newValue instanceof Promise
    ) {
      self._i = 3;
      self._j = newValue;
      finale(self);
      return;
    } else if (typeof then === 'function') {
      doResolve(then.bind(newValue), self);
      return;
    }
  }
  self._i = 1;
  self._j = newValue;
  finale(self);
}

function reject(self, newValue) {
  self._i = 2;
  self._j = newValue;
  if (Promise._m) {
    Promise._m(self, newValue);
  }
  finale(self);
}
function finale(self) {
  if (self._h === 1) {
    handle(self, self._k);
    self._k = null;
  }
  if (self._h === 2) {
    for (var i = 0; i < self._k.length; i++) {
      handle(self, self._k[i]);
    }
    self._k = null;
  }
}

function Handler(onFulfilled, onRejected, promise){
  this.onFulfilled = typeof onFulfilled === 'function' ? onFulfilled : null;
  this.onRejected = typeof onRejected === 'function' ? onRejected : null;
  this.promise = promise;
}

/**
 * Take a potentially misbehaving resolver function and make sure
 * onFulfilled and onRejected are only called once.
 *
 * Makes no guarantees about asynchrony.
 */
function doResolve(fn, promise) {
  var done = false;
  var res = tryCallTwo(fn, function (value) {
    if (done) return;
    done = true;
    resolve(promise, value);
  }, function (reason) {
    if (done) return;
    done = true;
    reject(promise, reason);
  });
  if (!done && res === IS_ERROR) {
    done = true;
    reject(promise, LAST_ERROR);
  }
}

},{"asap/raw":2}],7:[function(require,module,exports){
'use strict';

//This file contains the ES6 extensions to the core Promises/A+ API

var Promise = require('./core.js');

module.exports = Promise;

/* Static Functions */

var TRUE = valuePromise(true);
var FALSE = valuePromise(false);
var NULL = valuePromise(null);
var UNDEFINED = valuePromise(undefined);
var ZERO = valuePromise(0);
var EMPTYSTRING = valuePromise('');

function valuePromise(value) {
  var p = new Promise(Promise._n);
  p._i = 1;
  p._j = value;
  return p;
}
Promise.resolve = function (value) {
  if (value instanceof Promise) return value;

  if (value === null) return NULL;
  if (value === undefined) return UNDEFINED;
  if (value === true) return TRUE;
  if (value === false) return FALSE;
  if (value === 0) return ZERO;
  if (value === '') return EMPTYSTRING;

  if (typeof value === 'object' || typeof value === 'function') {
    try {
      var then = value.then;
      if (typeof then === 'function') {
        return new Promise(then.bind(value));
      }
    } catch (ex) {
      return new Promise(function (resolve, reject) {
        reject(ex);
      });
    }
  }
  return valuePromise(value);
};

Promise.all = function (arr) {
  var args = Array.prototype.slice.call(arr);

  return new Promise(function (resolve, reject) {
    if (args.length === 0) return resolve([]);
    var remaining = args.length;
    function res(i, val) {
      if (val && (typeof val === 'object' || typeof val === 'function')) {
        if (val instanceof Promise && val.then === Promise.prototype.then) {
          while (val._i === 3) {
            val = val._j;
          }
          if (val._i === 1) return res(i, val._j);
          if (val._i === 2) reject(val._j);
          val.then(function (val) {
            res(i, val);
          }, reject);
          return;
        } else {
          var then = val.then;
          if (typeof then === 'function') {
            var p = new Promise(then.bind(val));
            p.then(function (val) {
              res(i, val);
            }, reject);
            return;
          }
        }
      }
      args[i] = val;
      if (--remaining === 0) {
        resolve(args);
      }
    }
    for (var i = 0; i < args.length; i++) {
      res(i, args[i]);
    }
  });
};

Promise.reject = function (value) {
  return new Promise(function (resolve, reject) {
    reject(value);
  });
};

Promise.race = function (values) {
  return new Promise(function (resolve, reject) {
    values.forEach(function(value){
      Promise.resolve(value).then(resolve, reject);
    });
  });
};

/* Prototype Methods */

Promise.prototype['catch'] = function (onRejected) {
  return this.then(null, onRejected);
};

},{"./core.js":6}],8:[function(require,module,exports){
'use strict';

var Promise = require('./core');

var DEFAULT_WHITELIST = [
  ReferenceError,
  TypeError,
  RangeError
];

var enabled = false;
exports.disable = disable;
function disable() {
  enabled = false;
  Promise._l = null;
  Promise._m = null;
}

exports.enable = enable;
function enable(options) {
  options = options || {};
  if (enabled) disable();
  enabled = true;
  var id = 0;
  var displayId = 0;
  var rejections = {};
  Promise._l = function (promise) {
    if (
      promise._i === 2 && // IS REJECTED
      rejections[promise._o]
    ) {
      if (rejections[promise._o].logged) {
        onHandled(promise._o);
      } else {
        clearTimeout(rejections[promise._o].timeout);
      }
      delete rejections[promise._o];
    }
  };
  Promise._m = function (promise, err) {
    if (promise._h === 0) { // not yet handled
      promise._o = id++;
      rejections[promise._o] = {
        displayId: null,
        error: err,
        timeout: setTimeout(
          onUnhandled.bind(null, promise._o),
          // For reference errors and type errors, this almost always
          // means the programmer made a mistake, so log them after just
          // 100ms
          // otherwise, wait 2 seconds to see if they get handled
          matchWhitelist(err, DEFAULT_WHITELIST)
            ? 100
            : 2000
        ),
        logged: false
      };
    }
  };
  function onUnhandled(id) {
    if (
      options.allRejections ||
      matchWhitelist(
        rejections[id].error,
        options.whitelist || DEFAULT_WHITELIST
      )
    ) {
      rejections[id].displayId = displayId++;
      if (options.onUnhandled) {
        rejections[id].logged = true;
        options.onUnhandled(
          rejections[id].displayId,
          rejections[id].error
        );
      } else {
        rejections[id].logged = true;
        logError(
          rejections[id].displayId,
          rejections[id].error
        );
      }
    }
  }
  function onHandled(id) {
    if (rejections[id].logged) {
      if (options.onHandled) {
        options.onHandled(rejections[id].displayId, rejections[id].error);
      } else if (!rejections[id].onUnhandled) {
        console.warn(
          'Promise Rejection Handled (id: ' + rejections[id].displayId + '):'
        );
        console.warn(
          '  This means you can ignore any previous messages of the form "Possible Unhandled Promise Rejection" with id ' +
          rejections[id].displayId + '.'
        );
      }
    }
  }
}

function logError(id, error) {
  console.warn('Possible Unhandled Promise Rejection (id: ' + id + '):');
  var errStr = (error && (error.stack || error)) + '';
  errStr.split('\n').forEach(function (line) {
    console.warn('  ' + line);
  });
}

function matchWhitelist(error, list) {
  return list.some(function (cls) {
    return error instanceof cls;
  });
}
},{"./core":6}],9:[function(require,module,exports){
"use strict";

var Logger = require('./modules/logger');

var PubSub = require('./modules/pubsub');

var Caller = require('./modules/caller');

var Dom = require('./modules/dom');

var InfoController = require('./modules/info-controller');

var AvatarController = require('./modules/avatar-controller');

var Store = require('./modules/store');

var Amplitute = require('./modules/amplitude');

var Cloudinary = require('./modules/cloudinary-image-picker');

var ACG = require('./modules/account-consistency-guard');

var ppbaConf = {};

function hexToRgb(hex, opacity) {
  var result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result ? "rgba(".concat(parseInt(result[1], 16), ", ").concat(parseInt(result[2], 16), ", ").concat(parseInt(result[3], 16), ", ").concat(opacity || 1, ")") : null;
}

if (typeof Promise === 'undefined') {
  require('promise/lib/rejection-tracking').enable();

  window.Promise = require('promise/lib/es6-extensions.js');
}

var afterRender = function afterRender() {
  if (Store.getFullWidth() === true) {
    Dom.addClass(document.getElementById("bac--puresdk-bac--header-apps--"), 'bac--fullwidth');
  }

  document.getElementById('bac--puresdk--apps--opener--').addEventListener('click', function (e) {
    e.preventDefault();
    e.stopPropagation();
    Dom.toggleClass(document.getElementById('bac--puresdk-apps-container--'), 'active');
  });
  document.getElementById('bac--user-avatar-top').addEventListener('click', function (e) {
    e.stopPropagation();
    Dom.removeClass(document.getElementById('bac--puresdk-apps-container--'), 'active');
    Dom.toggleClass(document.getElementById('bac--puresdk-user-sidebar--'), 'active');
  });
  window.addEventListener('click', function (e) {
    Dom.removeClass(document.getElementById('bac--puresdk-apps-container--'), 'active');
    Dom.removeClass(document.getElementById('bac--puresdk-user-sidebar--'), 'active');
  });
  AvatarController.init();
  var userData = Store.getUserData();
  AvatarController.setAvatar(userData.user.avatar_url);
  InfoController.init();
};

var PPBA = {
  setWindowName: function setWindowName(wn) {
    Store.setWindowName(wn);
  },
  setConfiguration: function setConfiguration(conf) {
    Store.setConfiguration(conf);
  },
  setHTMLTemplate: function setHTMLTemplate(template) {
    Store.setHTMLTemplate(template);
  },
  setVersionNumber: function setVersionNumber(version) {
    Store.setVersionNumber(version);
  },
  logEvent: function logEvent(eventName, props) {
    Amplitute.logEvent(eventName, props);
  },
  init: function init(conf) {
    Logger.log('initializing with conf: ', conf);

    if (conf) {
      if (conf.headerDivId) {
        Store.setHTMLContainer(conf.headerDivId);
      }

      if (conf.appsVisible !== null) {
        Store.setAppsVisible(conf.appsVisible);
      }

      if (conf.rootUrl) {
        Store.setRootUrl(conf.rootUrl);
      }

      if (conf.dev === true) {
        if (conf.devKeys) {
          Caller.setDevKeys(conf.devKeys);
          Store.setDev(true);
        }
      }

      if (conf.fullWidth) {
        Store.setFullWidth(conf.fullWidth);
      }

      if (conf.displaySupport) {
        Store.setDisplaySupport(conf.displaySupport);
      }

      if (conf.appInfo) {
        Store.setAppInfo(conf.appInfo); // if google tag manager is present it will push the user's info to dataLayer

        try {
          dataLayer.push({
            'app': conf.appInfo.name
          });
        } catch (e) {// no Google Tag has been set
        }
      }
      /* optional session url */


      if (conf.sessionEndpoint) {
        Store.setSessionEndpoint(conf.sessionEndpoint);
      }

      if (conf.apiRootFolder) {
        Store.setUrlVersionPrefix(conf.apiRootFolder);
      }
    }

    ppbaConf = conf;
    return true;
  },
  setupGoogleTag: function setupGoogleTag(user) {
    // if google tag manager is present it will push the user's info to dataLayer
    try {
      dataLayer.push({
        'userId': user.id,
        'user': "".concat(user.firstname, " ").concat(user.lastname),
        'tenant_id': user.tenant_id,
        'userType': user.user_type,
        'accountId': user.account_id,
        'accountName': user.account.name
      });
    } catch (e) {// no Google Tag has been set
    }
  },
  authenticate: function authenticate(_success) {
    var self = PPBA;
    Caller.makeCall({
      type: 'GET',
      endpoint: Store.getAuthenticationEndpoint(),
      callbacks: {
        success: function success(result) {
          // Logger.log(result);
          Store.setUserData(result);
          self.render();
          PPBA.getApps();
          ACG.changeAccount(result.user.account.sfid);
          ACG.initialise(result.user.account.sfid, function () {
            Dom.removeClass(document.getElementById('bac---invalid-account'), 'invalid');
          }, function () {
            Dom.addClass(document.getElementById('bac---invalid-account'), 'invalid');
          });
          PPBA.setupGoogleTag(result.user);
          Amplitute.init(result.user);
          Amplitute.logEvent('visit');

          _success(result);
        },
        fail: function fail(err) {
          window.location.href = Store.getLoginUrl();
        }
      }
    });
  },
  authenticatePromise: function authenticatePromise() {
    var self = PPBA;
    return Caller.promiseCall({
      type: 'GET',
      endpoint: Store.getAuthenticationEndpoint(),
      middlewares: {
        success: function success(result) {
          // Logger.log(result);
          Store.setUserData(result);
          self.render();
          PPBA.getApps();
          ACG.changeAccount(result.user.account.sfid);
          ACG.initialise(result.user.account.sfid, function () {
            Dom.removeClass(document.getElementById('bac---invalid-account'), 'invalid');
          }, function () {
            Dom.addClass(document.getElementById('bac---invalid-account'), 'invalid');
          });
          Amplitute.init(result.user);
          Amplitute.logEvent('visit');
          PPBA.setupGoogleTag(result.user);
        }
      }
    });
  },
  getApps: function getApps() {
    Caller.makeCall({
      type: 'GET',
      endpoint: Store.getAppsEndpoint(),
      callbacks: {
        success: function success(result) {
          Store.setApps(result);
          PPBA.renderApps(result.apps);
        },
        fail: function fail(err) {
          window.location.href = Store.getLoginUrl();
        }
      }
    });
  },
  getAvailableListeners: function getAvailableListeners() {
    return PubSub.getAvailableListeners();
  },
  subscribeListener: function subscribeListener(eventt, funct) {
    return PubSub.subscribe(eventt, funct);
  },
  getUserData: function getUserData() {
    return Store.getUserData();
  },
  setInputPlaceholder: function setInputPlaceholder(txt) {// document.getElementById(Store.getSearchInputId()).placeholder = txt;
  },
  changeAccount: function changeAccount(accountId) {
    Caller.makeCall({
      type: 'GET',
      endpoint: Store.getSwitchAccountEndpoint(accountId),
      callbacks: {
        success: function success(result) {
          Amplitute.logEvent('account change', {});
          ACG.changeAccount(accountId);
          window.location.href = '/apps';
        },
        fail: function fail(err) {
          alert('Sorry, something went wrong with your request. Plese try again');
        }
      }
    });
  },
  renderApps: function renderApps(apps) {
    var appTemplate = function appTemplate(app) {
      return "\n\t\t\t\t<a class=\"bac--image-link\" href=\"".concat(app.application_url, "\" style=\"background: #").concat(app.color, "\">\n\t\t\t\t\t<img src=\"").concat(app.icon, "\" />\n\t\t\t\t</a>\n\t\t\t\t\n\t\t\t\t<div class=\"bac--puresdk-app-text-container\">\n\t\t\t\t\t<a href=\"").concat(app.application_url, "\" class=\"bac--app-name\">").concat(app.name, "</a>\n\t\t\t\t\t<a href=\"").concat(app.application_url, "\" class=\"bac--app-description\">").concat(app.descr === null ? '-' : app.descr, "</a>\n\t\t\t\t</div>\n\t\t\t");
    };

    for (var i = 0; i < apps.length; i++) {
      var app = apps[i];
      var div = document.createElement("div");
      div.className = "bac--apps";
      div.innerHTML = appTemplate(app); // check to see if the user has access to the two main apps and remove disabled class

      if (app.application_url === '/app/groups') {
        Dom.removeClass(document.getElementById('bac--puresdk-groups-link--'), 'disabled');
      } else if (app.application_url === '/app/campaigns') {
        Dom.removeClass(document.getElementById('bac--puresdk-campaigns-link--'), 'disabled');
      }

      document.getElementById("bac--aps-actual-container").appendChild(div);
    } // finally check if the user is on any of the two main apps


    var appInfo = Store.getAppInfo();

    if (appInfo.root === "/app/groups") {
      Dom.addClass(document.getElementById('bac--puresdk-groups-link--'), 'selected');
    } else if (appInfo.root === "/app/campaigns") {
      Dom.addClass(document.getElementById('bac--puresdk-campaigns-link--'), 'selected');
    }
  },
  renderUser: function renderUser(user) {
    var userTemplate = function userTemplate(user) {
      return "\n\t\t\t\t<div class=\"bac--user-image\" id=\"bac--user-image\">\n\t\t\t\t\t<i class=\"fa fa-camera\"></i>\n\t\t\t   \t<div id=\"bac--user-image-file\"></div>\n\t\t\t   \t<div id=\"bac--user-image-upload-progress\">\n\t\t\t   \t\t<svg width='60px' height='60px' xmlns=\"http://www.w3.org/2000/svg\" viewBox=\"0 0 100 100\" preserveAspectRatio=\"xMidYMid\" class=\"uil-default\"><rect x=\"0\" y=\"0\" width=\"100\" height=\"100\" fill=\"none\" class=\"bk\"></rect><rect  x='46.5' y='40' width='7' height='20' rx='5' ry='5' fill='#ffffff' transform='rotate(0 50 50) translate(0 -30)'>  <animate attributeName='opacity' from='1' to='0' dur='1s' begin='-1s' repeatCount='indefinite'/></rect><rect  x='46.5' y='40' width='7' height='20' rx='5' ry='5' fill='#ffffff' transform='rotate(30 50 50) translate(0 -30)'>  <animate attributeName='opacity' from='1' to='0' dur='1s' begin='-0.9166666666666666s' repeatCount='indefinite'/></rect><rect  x='46.5' y='40' width='7' height='20' rx='5' ry='5' fill='#ffffff' transform='rotate(60 50 50) translate(0 -30)'>  <animate attributeName='opacity' from='1' to='0' dur='1s' begin='-0.8333333333333334s' repeatCount='indefinite'/></rect><rect  x='46.5' y='40' width='7' height='20' rx='5' ry='5' fill='#ffffff' transform='rotate(90 50 50) translate(0 -30)'>  <animate attributeName='opacity' from='1' to='0' dur='1s' begin='-0.75s' repeatCount='indefinite'/></rect><rect  x='46.5' y='40' width='7' height='20' rx='5' ry='5' fill='#ffffff' transform='rotate(120 50 50) translate(0 -30)'>  <animate attributeName='opacity' from='1' to='0' dur='1s' begin='-0.6666666666666666s' repeatCount='indefinite'/></rect><rect  x='46.5' y='40' width='7' height='20' rx='5' ry='5' fill='#ffffff' transform='rotate(150 50 50) translate(0 -30)'>  <animate attributeName='opacity' from='1' to='0' dur='1s' begin='-0.5833333333333334s' repeatCount='indefinite'/></rect><rect  x='46.5' y='40' width='7' height='20' rx='5' ry='5' fill='#ffffff' transform='rotate(180 50 50) translate(0 -30)'>  <animate attributeName='opacity' from='1' to='0' dur='1s' begin='-0.5s' repeatCount='indefinite'/></rect><rect  x='46.5' y='40' width='7' height='20' rx='5' ry='5' fill='#ffffff' transform='rotate(210 50 50) translate(0 -30)'>  <animate attributeName='opacity' from='1' to='0' dur='1s' begin='-0.4166666666666667s' repeatCount='indefinite'/></rect><rect  x='46.5' y='40' width='7' height='20' rx='5' ry='5' fill='#ffffff' transform='rotate(240 50 50) translate(0 -30)'>  <animate attributeName='opacity' from='1' to='0' dur='1s' begin='-0.3333333333333333s' repeatCount='indefinite'/></rect><rect  x='46.5' y='40' width='7' height='20' rx='5' ry='5' fill='#ffffff' transform='rotate(270 50 50) translate(0 -30)'>  <animate attributeName='opacity' from='1' to='0' dur='1s' begin='-0.25s' repeatCount='indefinite'/></rect><rect  x='46.5' y='40' width='7' height='20' rx='5' ry='5' fill='#ffffff' transform='rotate(300 50 50) translate(0 -30)'>  <animate attributeName='opacity' from='1' to='0' dur='1s' begin='-0.16666666666666666s' repeatCount='indefinite'/></rect><rect  x='46.5' y='40' width='7' height='20' rx='5' ry='5' fill='#ffffff' transform='rotate(330 50 50) translate(0 -30)'>  <animate attributeName='opacity' from='1' to='0' dur='1s' begin='-0.08333333333333333s' repeatCount='indefinite'/></rect></svg>\n\t\t\t\t\t</div>\n\t\t\t   </div>\n\t\t\t\t<div class=\"bac--user-name\">".concat(user.firstname, " ").concat(user.lastname, "</div>\n\t\t\t\t<div class=\"bac--user-email\">").concat(user.email, "</div>\n\t\t\t");
    };

    var div = document.createElement('div');
    div.className = "bac--user-sidebar-info";
    div.innerHTML = userTemplate(user);
    document.getElementById('bac--puresdk-user-details--').prepend(div);
    document.getElementById('bac--puresdk-user-avatar--').innerHTML = user.firstname.charAt(0) + user.lastname.charAt(0);
  },
  renderAccounts: function renderAccounts(accounts, currentAccount) {
    // Logger.log(currentAccount);
    var accountsTemplate = function accountsTemplate(account, isTheSelected) {
      return "\n\t\t\t\t<div class=\"bac--user-list-item-image\">\n\t\t\t\t\t<img src=\"".concat(account.sdk_square_logo_icon, "\" alt=\"\">\n\t\t\t\t</div>\n\t\t\t\t<div class=\"bac-user-app-details\">\n\t\t\t\t\t <span>").concat(account.name, "</span>\n\t\t\t\t</div>\n\t\t\t\t").concat(isTheSelected ? '<div id="bac--selected-acount-indicator" class="bac--selected-acount-indicator"></div>' : '', "\n\t\t\t");
    };

    var _loop = function _loop(i) {
      var account = accounts[i];
      var div = document.createElement('div');
      div.className = 'bac--user-list-item';
      div.innerHTML = accountsTemplate(account, account.sfid === currentAccount.sfid);

      if (account.sfid === currentAccount.sfid) {
        div.style.background = hexToRgb('#FFFFFF', 0.85);
      }

      div.onclick = function (e) {
        e.preventDefault();
        PPBA.changeAccount(account.sfid);
      };

      document.getElementById('bac--puresdk-user-businesses--').appendChild(div);
    };

    for (var i = 0; i < accounts.length; i++) {
      _loop(i);
    }
  },
  renderInfoBlocks: function renderInfoBlocks() {
    InfoController.renderInfoBlocks();
  },
  renderVersionNumber: function renderVersionNumber(version) {
    document.getElementById('puresdk-version-number').innerHTML = version;
  },
  renderZendesk: function renderZendesk() {
    if (Store.getDisplaySupport()) {
      var zdscript = document.createElement('script');
      zdscript.src = "https://static.zdassets.com/ekr/snippet.js?key=9868c71d-6793-42aa-b2fa-12419c7bd498";
      zdscript.id = "ze-snippet";
      zdscript.async = true;
      zdscript.type = 'text/javascript';
      document.getElementsByTagName('head')[0].appendChild(zdscript);
    }
  },
  styleAccount: function styleAccount(account) {
    var appInfo = Store.getAppInfo();
    var logo = document.createElement('img');
    logo.src = account.sdk_logo_icon;
    document.getElementById('bac--puresdk-account-logo--').prepend(logo);

    document.getElementById('bac--puresdk-account-logo--').onclick = function (e) {
      window.location.href = Store.getRootUrl();
    };

    document.getElementById("app-name-link-to-root").href = Store.getRootUrl();
    var rgbBg = hexToRgb(account.sdk_background_color, 0.15);
    document.getElementById('bac--puresdk-bac--header-apps--').style.cssText = "background: #" + account.sdk_background_color;
    document.getElementById('bac--user-sidebar-white-bg').style.cssText = "background-color: " + rgbBg; // if(document.getElementById('bac--puresdk-apps-name--')){
    // 	document.getElementById('bac--puresdk-apps-name--').style.cssText = "color: #" + account.sdk_font_color;
    // }
    // if(document.getElementById('bac--selected-acount-indicator')){
    // 	document.getElementById('bac--selected-acount-indicator').style.cssText = "background: #" + account.sdk_font_color;
    // }
  },
  goToLoginPage: function goToLoginPage() {
    window.location.href = Store.getLoginUrl();
  },

  /* LOADER */
  showLoader: function showLoader() {
    Dom.addClass(document.getElementById('bac--puresdk--loader--'), 'bac--puresdk-visible');
  },
  hideLoader: function hideLoader() {
    Dom.removeClass(document.getElementById('bac--puresdk--loader--'), 'bac--puresdk-visible');
  },
  openCloudinaryPicker: function openCloudinaryPicker(options) {
    Cloudinary.openModal(options);
  },

  /*
   type: one of:
   - success
   - info
   - warning
   - error
   text: the text to display
   options (optional): {
   		hideIn: milliseconds to hide it. -1 for not hiding it at all. Default is 5000
   }
   */
  setInfo: function setInfo(type, text, options) {
    InfoController.showInfo(type, text, options);
  },
  setTitleAndFavicon: function setTitleAndFavicon() {
    var favlink = document.querySelector("link[rel*='icon']") || document.createElement('link');
    favlink.href = 'https://cloudcdn.pureprofile.com/image/upload/v1/__assets_master__/b1a0c316ad7f4a679c2eee615814466c';
    favlink.rel = 'shortcut icon';
    document.getElementsByTagName('head')[0].appendChild(favlink);
    var appInfo = Store.getAppInfo();

    if (appInfo !== null) {
      document.title = "Pureprofile Access | ".concat(appInfo.name);
    } else {
      document.title = "Pureprofile Access";
    }
  },
  render: function render() {
    var whereTo = document.getElementById(Store.getHTLMContainer());

    if (whereTo === null) {
      Logger.error('the container with id "' + whereTo + '" has not been found on the document. The library is going to create it.');
      var div = document.createElement('div');
      div.id = Store.getHTLMContainer();
      div.style.width = '100%';
      div.style.height = "50px";
      div.style.position = "fixed";
      div.style.top = "0px";
      div.style.zIndex = "2147483647";
      document.body.insertBefore(div, document.body.firstChild);
      whereTo = document.getElementById(Store.getHTLMContainer());
    }

    whereTo.innerHTML = Store.getHTML();
    PPBA.renderUser(Store.getUserData().user);
    PPBA.renderInfoBlocks();
    PPBA.renderAccounts(Store.getUserData().user.accounts, Store.getUserData().user.account);
    PPBA.renderZendesk();
    PPBA.styleAccount(Store.getUserData().user.account);
    PPBA.setTitleAndFavicon();
    PPBA.renderVersionNumber(Store.getVersionNumber());

    if (Store.getAppsVisible() === false) {
      document.getElementById('bac--puresdk-apps-section--').style.cssText = "display:none";
    }

    afterRender();
  }
};
module.exports = PPBA;
},{"./modules/account-consistency-guard":11,"./modules/amplitude":12,"./modules/avatar-controller":13,"./modules/caller":14,"./modules/cloudinary-image-picker":15,"./modules/dom":16,"./modules/info-controller":17,"./modules/logger":18,"./modules/pubsub":20,"./modules/store":21,"promise/lib/es6-extensions.js":7,"promise/lib/rejection-tracking":8}],10:[function(require,module,exports){
"use strict";

/*!
 * PureProfile PureProfile Business Apps Development SDK
 *
 * version: 2.9.7-rc.4
 * date: 2020-05-06
 *
 * Copyright 2017, PureProfile
 * Released under MIT license
 * https://opensource.org/licenses/MIT
 */
var ppba = require('./PPBA');

ppba.setWindowName('PURESDK');
ppba.setConfiguration({
  "logs": false,
  "rootUrl": "/",
  "baseUrl": "api/v1/",
  "loginUrl": "signin",
  "searchInputId": "--puresdk--search--input--",
  "redirectUrlParam": "redirect_url"
});
ppba.setHTMLTemplate("<header class=\"bac--header-apps\" id=\"bac--puresdk-bac--header-apps--\">\n    <div class=\"bac--container\">\n        <div class=\"bac--logo\" id=\"bac--puresdk-account-logo--\">\n            <div class=\"bac--puresdk-app-name--\">\n                <svg width=\"8px\" height=\"12px\" viewBox=\"0 0 8 12\" version=\"1.1\" xmlns=\"http://www.w3.org/2000/svg\" xmlns:xlink=\"http://www.w3.org/1999/xlink\">\n                    <g id=\"PP-BA-Portal-Home_Desktop-v2\" stroke=\"none\" stroke-width=\"1\" fill=\"none\" fill-rule=\"evenodd\">\n                        <g id=\"PPCM-Listing_Connexion_01_Max_D\" transform=\"translate(-181.000000, -78.000000)\" fill=\"#333333\" fill-rule=\"nonzero\">\n                            <g id=\"elements-/-sdk-/-button-copy-3-elements-/-sdk-/-button\" transform=\"translate(164.000000, 70.000000)\">\n                                <g id=\"icons/apps/campaigns-icons-/-apps-/-40x40-/-back-arrow\" transform=\"translate(11.000000, 4.000000)\">\n                                    <g id=\"download-arrow\" transform=\"translate(6.500000, 4.000000)\">\n                                        <path d=\"M-0.882740944,2.77957989 C-1.25271133,2.4068067 -1.85255183,2.4068067 -2.22252221,2.77957989 C-2.5924926,3.15235308 -2.5924926,3.75673783 -2.22252221,4.12951102 L2.83010937,9.22042011 C3.20007975,9.5931933 3.79992025,9.5931933 4.16989063,9.22042011 L9.22252221,4.12951102 C9.5924926,3.75673783 9.5924926,3.15235308 9.22252221,2.77957989 C8.85255183,2.4068067 8.25271133,2.4068067 7.88274094,2.77957989 L3.5,7.19552342 L-0.882740944,2.77957989 Z\" id=\"Path\" transform=\"translate(3.500000, 6.000000) rotate(-270.000000) translate(-3.500000, -6.000000) \"></path>\n                                    </g>\n                                </g>\n                            </g>\n                        </g>\n                    </g>\n                </svg>\n                <a href=\"#\" id=\"app-name-link-to-root\">App Portal</a>\n            </div>\n        </div>\n        <div class=\"bac--user-actions\">\n            <svg id=\"bac--puresdk--loader--\" width=\"38\" height=\"38\" viewBox=\"0 0 44 44\" xmlns=\"http://www.w3.org/2000/svg\" stroke=\"#fff\" style=\"\n    margin-right: 10px;\n\">\n                <g fill=\"none\" fill-rule=\"evenodd\" stroke-width=\"2\">\n                    <circle cx=\"22\" cy=\"22\" r=\"16.6437\">\n                        <animate attributeName=\"r\" begin=\"0s\" dur=\"1.8s\" values=\"1; 20\" calcMode=\"spline\" keyTimes=\"0; 1\" keySplines=\"0.165, 0.84, 0.44, 1\" repeatCount=\"indefinite\"></animate>\n                        <animate attributeName=\"stroke-opacity\" begin=\"0s\" dur=\"1.8s\" values=\"1; 0\" calcMode=\"spline\" keyTimes=\"0; 1\" keySplines=\"0.3, 0.61, 0.355, 1\" repeatCount=\"indefinite\"></animate>\n                    </circle>\n                    <circle cx=\"22\" cy=\"22\" r=\"19.9282\">\n                        <animate attributeName=\"r\" begin=\"bac-0.9s\" dur=\"1.8s\" values=\"1; 20\" calcMode=\"spline\" keyTimes=\"0; 1\" keySplines=\"0.165, 0.84, 0.44, 1\" repeatCount=\"indefinite\"></animate>\n                        <animate attributeName=\"stroke-opacity\" begin=\"bac-0.9s\" dur=\"1.8s\" values=\"1; 0\" calcMode=\"spline\" keyTimes=\"0; 1\" keySplines=\"0.3, 0.61, 0.355, 1\" repeatCount=\"indefinite\"></animate>\n                    </circle>\n                </g>\n            </svg>\n            <div class=\"bac--user-apps\" id=\"bac--puresdk-apps-section--\">\n                <a href=\"/app/campaigns\" id=\"bac--puresdk-campaigns-link--\" class=\"bac--puresdk-apps-on-navbar-- disabled\">\n                    <svg width=\"15px\" height=\"13px\" viewBox=\"0 0 15 14\" version=\"1.1\" xmlns=\"http://www.w3.org/2000/svg\" xmlns:xlink=\"http://www.w3.org/1999/xlink\">\n                        <!-- Generator: sketchtool 59.1 (101010) - https://sketch.com -->\n                        <defs>\n                            <polygon id=\"path-1\" points=\"0 0.000150000007 14.3997498 0.000150000007 14.3997498 12.8996499 0 12.8996499\"></polygon>\n                        </defs>\n                        <g id=\"PP-BA-Portal-Home_Desktop-v2\" stroke=\"none\" stroke-width=\"1\" fill=\"none\" fill-rule=\"evenodd\">\n                            <g id=\"PPCM-Listing_Connexion_01_Max_D\" transform=\"translate(-1110.000000, -77.000000)\">\n                                <g id=\"elements-/-sdk-/-button\" transform=\"translate(1096.000000, 70.000000)\">\n                                    <g id=\"icons/apps/campaigns-icons-/-apps-/-40x40-/-campaigns\" transform=\"translate(11.000000, 4.000000)\">\n                                        <g id=\"Group-3\" transform=\"translate(3.000000, 3.500000)\">\n                                            <mask id=\"mask-2\" fill=\"white\">\n                                                <use xlink:href=\"#path-1\"></use>\n                                            </mask>\n                                            <g id=\"Clip-2\"></g>\n                                            <path d=\"M2.33325003,3.75364998 C2.04275003,3.85914998 1.79975004,4.03614998 1.59375004,4.28914998 C1.33325005,4.60914997 1.20625005,4.96664997 1.20625005,5.38214996 L1.20625005,5.55464996 C1.20625005,5.96914995 1.33275005,6.32164995 1.59175004,6.63114994 C1.79825004,6.87814994 2.04225003,7.05064994 2.33325003,7.15564994 L2.33325003,3.75364998 Z M5.78824989,7.24865008 C7.92024978,7.24865008 9.89574967,7.83565009 11.6667496,8.99365011 L11.6667496,1.83764998 C9.89424967,3.04715 7.89924978,3.65965001 5.73074989,3.65965001 L3.56875001,3.65965001 L3.56875001,7.24865008 L5.78824989,7.24865008 Z M5.29874986,12.8996499 C4.86124987,12.8996499 4.47474988,12.7356499 4.14924989,12.4111499 C3.8427499,12.1061499 3.6872499,11.7301499 3.6872499,11.2936499 L3.6872499,8.45164993 L3.05174992,8.45164993 L2.94074992,8.45414993 C2.12024994,8.45414993 1.42174996,8.17314993 0.865249977,7.61864994 C0.291249992,7.04664994 -0.000250000012,6.35214995 -0.000250000012,5.55464995 L-0.000250000012,5.38214996 C-0.000250000012,4.56514996 0.291749992,3.86514997 0.866249977,3.30264997 C1.44074996,2.74114998 2.13724994,2.45614998 2.93674992,2.45614998 L5.73074985,2.45614998 C8.05124979,2.45614998 10.1197497,1.68114999 11.8792497,0.152149999 C11.9757497,0.0556499995 12.1067497,0.000150000007 12.2492497,0.000150000007 C12.3367497,0.000150000007 12.4292497,0.0211499998 12.5237497,0.0631499995 C12.7452497,0.145149999 12.8732497,0.334149997 12.8732497,0.590149995 L12.8732497,4.14964997 L13.1342497,4.14964997 C13.4752496,4.14964997 13.7747496,4.27514996 14.0242496,4.52314996 C14.2687496,4.72114996 14.3997496,5.01464996 14.3997496,5.38214996 C14.3997496,5.74364995 14.2722496,6.04814995 14.0207496,6.28764995 C13.7717496,6.52414995 13.4737496,6.64414994 13.1342497,6.64414994 L12.8732497,6.64414994 L12.8732497,10.2031499 C12.8732497,10.4781499 12.7452497,10.6771499 12.5127497,10.7636499 L12.4427497,10.7761499 C12.3492497,10.7986499 12.3067497,10.8051499 12.2697497,10.8051499 C12.1567497,10.8051499 12.0352497,10.7666499 11.9077497,10.6911499 C10.1407497,9.19864992 8.09124979,8.45164993 5.78824985,8.45164993 L4.89374987,8.45164993 L4.89374987,11.2936499 C4.89374987,11.4131499 4.92974987,11.5046499 5.00774987,11.5826499 C5.08574987,11.6601499 5.17774986,11.6966499 5.29874986,11.6966499 C5.39824986,11.6966499 5.48874985,11.6546499 5.57524985,11.5681499 C5.66274985,11.4811499 5.70374985,11.3846499 5.70374985,11.2651499 L5.70374985,9.61464992 C5.70374985,9.23764992 5.92924984,9.01264993 6.30674983,9.01264993 C6.45274983,9.01264993 6.58924983,9.06814992 6.71324982,9.17764992 C6.84224982,9.29214992 6.91024982,9.44314992 6.91024982,9.61464992 L6.91024982,11.2651499 C6.91024982,11.6996499 6.75074982,12.0846499 6.43624983,12.4086499 C6.11974984,12.7346499 5.73674985,12.8996499 5.29874986,12.8996499 L5.29874986,12.8996499 Z\" id=\"Fill-1\" fill=\"#333333\" fill-rule=\"nonzero\" mask=\"url(#mask-2)\"></path>\n                                        </g>\n                                    </g>\n                                </g>\n                            </g>\n                        </g>\n                    </svg>\n                    Campaigns\n                </a>\n                <a href=\"/app/groups\" id=\"bac--puresdk-groups-link--\" class=\"bac--puresdk-apps-on-navbar-- disabled\">\n                    <svg width=\"20px\" height=\"13px\" viewBox=\"0 0 39 25\" version=\"1.1\" xmlns=\"http://www.w3.org/2000/svg\" xmlns:xlink=\"http://www.w3.org/1999/xlink\">\n                        <!-- Generator: sketchtool 59.1 (101010) - https://sketch.com -->\n                        <g id=\"PP-BA-Portal-Home_Desktop-v2\" stroke=\"none\" stroke-width=\"1\" fill=\"none\" fill-rule=\"evenodd\">\n                            <g id=\"PPCM-Listing_Connexion_01_Max_D\" transform=\"translate(-1244.000000, -71.000000)\" fill=\"#333333\" fill-rule=\"nonzero\">\n                                <g id=\"elements-/-sdk-/-button-copy-elements-/-sdk-/-button\" transform=\"translate(1243.000000, 70.000000)\">\n                                    <g id=\"icons/apps/campaigns-icons-/-apps-/-40x40-/-groups\" transform=\"translate(11.000000, 4.000000)\">\n                                        <g id=\"Group\" transform=\"translate(-9.250000, -2.250000)\">\n                                            <path d=\"M19.1151631,3 C22.8464491,3 26.1170825,6.2195122 26.1170825,9.91463415 C26.1170825,12.4756098 24.3205374,14.4878049 22.6161228,15.5121951 L22.6161228,16.1707317 L22.6161228,16.1707317 C22.9846449,16.3170732 23.6756238,16.5365854 24.4587332,16.7195122 L24.5047985,16.7195122 L24.5047985,16.7195122 C28.7888676,17.8536585 31,19.7560976 31,22.3536585 C30.9078695,23.0121951 30.3090211,24 29.1113244,24 L8.79654511,24 C7.59884837,24 7,23.0121951 7,22.3170732 C7,20.4878049 8.10556622,18.0365854 13.4491363,16.6829268 L13.4952015,16.6829268 L13.4952015,16.6829268 C14.2783109,16.5365854 14.9692898,16.3170732 15.2917466,16.2073171 L15.2917466,15.5121951 L15.2917466,15.5121951 C13.5873321,14.4512195 11.7907869,12.4756098 11.7907869,9.91463415 C11.7907869,6.2195122 15.0614203,3 18.7927063,3 L19.1151631,3 Z M19.1612284,5.67073171 L18.8387716,5.67073171 C16.9961612,5.67073171 15.2917466,7.7195122 15.2917466,9.87804878 C15.2917466,11.4512195 16.4894434,12.804878 17.6871401,13.4634146 C17.8253359,13.5365854 17.9174664,13.6097561 18.0095969,13.6829268 C18.743762,14.2660061 18.7896473,14.9455507 18.7925151,15.9627239 L18.7927063,16.5731707 L18.7927063,16.5731707 C18.7927063,18.402439 15.7984645,18.9878049 14.462572,19.2804878 C13.0345489,19.6097561 11.4222649,20.2682927 10.731286,21.2560976 L27.1765835,21.2560976 C26.6238004,20.4146341 25.3339731,19.7560976 23.3992322,19.2073171 C20.8195777,18.5853659 19.1612284,17.9268293 19.1612284,16.5365854 L19.1608159,15.7487527 C19.1625036,14.8217571 19.2127131,14.1628407 19.9443378,13.6463415 C20.0825336,13.5365854 20.2207294,13.4634146 20.3128599,13.4268293 C21.5105566,12.804878 22.7082534,11.4512195 22.7082534,9.87804878 C22.7082534,7.7195122 21.0038388,5.67073171 19.1612284,5.67073171 Z M10.6944444,1 C12.5462963,1 13.9351852,1.63708087 15,2.9112426 C14.0277778,3.36094675 13.1944444,3.99802761 12.4537037,4.78500986 C12.2222222,4.52268245 11.9907407,4.29783037 11.9444444,4.26035503 C11.5740741,3.92307692 11.2962963,3.81065089 10.6944444,3.81065089 L10.6944444,3.81065089 L10.4166667,3.81065089 C9.16666667,3.81065089 7.63888889,5.38461538 7.63888889,7.29585799 C7.63888889,8.60749507 8.65740741,9.73175542 9.58333333,10.2564103 C9.67592593,10.3313609 9.81481481,10.4063116 9.90740741,10.4812623 C10.6365741,11.0387081 10.6922743,11.68223 10.6948061,12.5122504 L10.6944444,13.2544379 C10.6944444,15.0532544 7.82407407,15.65286 6.71296296,15.877712 C5.74074074,16.1400394 4.62962963,16.5522682 3.98148148,17.1893491 L3.98148148,17.1893491 L7.77777778,17.1893491 C8.14814815,17.1893491 8.51851852,17.3767258 8.61111111,17.6765286 L8.61111111,17.6765286 L8.62851852,17.7436844 C8.63888889,17.832426 8.60185185,17.9163708 8.56481481,17.9763314 C7.63888889,18.5384615 6.99074074,19.1380671 6.52777778,19.7751479 C6.38888889,19.9250493 6.2037037,20 6.01851852,20 L6.01851852,20 L1.75925926,20 C0.601851852,20 0,19.025641 0,18.3510848 C0,16.6646943 0.972222222,14.4536489 5.74074074,13.1045365 L5.74074074,13.1045365 L5.78703704,13.1045365 C6.38888889,12.9921105 6.89814815,12.8422091 7.22222222,12.729783 L7.22222222,12.729783 L7.22222222,12.2800789 C5.74074074,11.3431953 4.16666667,9.5443787 4.16666667,7.25838264 C4.16666667,3.92307692 7.08333333,1 10.4166667,1 L10.4166667,1 Z M27.6467826,5.55111512e-17 C30.9593405,5.55111512e-17 33.8578287,2.93465347 33.8578287,6.28316832 C33.8578287,8.57821782 32.339573,10.3465347 30.8213173,11.3247525 L30.8213173,11.3247525 L30.8213173,11.7386139 C31.1433715,11.8891089 31.6954645,12.039604 32.2935652,12.190099 C37.0323634,13.5069307 38.0445338,15.7267327 37.9985261,17.3445545 C37.9985261,18.0594059 37.4004254,19 36.2502316,19 L36.2502316,19 L31.78748,19 C31.5574413,19 31.3734103,18.9247525 31.2813948,18.7742574 C30.7753095,18.1346535 30.1312011,17.5326733 29.2570538,17.0059406 C29.1190306,16.9306931 29.0730228,16.8178218 29.1190306,16.7049505 L29.1190306,16.7049505 L29.1595477,16.6089041 C29.2928376,16.3644787 29.6200038,16.2158416 29.9471701,16.2158416 L29.9471701,16.2158416 L34.0418597,16.2158416 C33.4897667,15.6891089 32.5696117,15.2376238 31.1893793,14.8613861 C29.3490693,14.409901 27.3707361,13.8079208 27.3707361,12.2653465 L27.3707361,12.2653465 L27.3704104,11.6950746 C27.3682201,10.742172 27.3736116,10.0455446 28.1068601,9.48118812 C28.2448834,9.36831683 28.4289144,9.29306931 28.4749221,9.25544554 C29.3950771,8.72871287 30.4072475,7.6 30.4072475,6.28316832 C30.4072475,4.32673267 28.8889918,2.78415842 27.6467826,2.78415842 L27.6467826,2.78415842 L27.3707361,2.78415842 C26.7266276,2.78415842 26.4045734,2.93465347 26.0365114,3.31089109 C25.9905037,3.34851485 25.7604649,3.64950495 25.5304262,3.95049505 C24.84031,3.12277228 23.9661627,2.48316832 23,1.99405941 C24.104186,0.63960396 25.4844184,5.55111512e-17 27.3707361,5.55111512e-17 L27.3707361,5.55111512e-17 Z\" id=\"Combined-Shape\"></path>\n                                        </g>\n                                    </g>\n                                </g>\n                            </g>\n                        </g>\n                    </svg>\n                    Groups\n                </a>\n                <a href=\"#\" id=\"bac--puresdk--apps--opener--\" class=\"bac--puresdk-apps-on-navbar--\">\n                    <svg width=\"13px\" height=\"13px\" viewBox=\"0 0 13 13\" version=\"1.1\" xmlns=\"http://www.w3.org/2000/svg\" xmlns:xlink=\"http://www.w3.org/1999/xlink\">\n                        <!-- Generator: sketchtool 59.1 (101010) - https://sketch.com -->\n                        <g id=\"PP-BA-Portal-Home_Desktop-v2\" stroke=\"none\" stroke-width=\"1\" fill=\"none\" fill-rule=\"evenodd\">\n                            <g id=\"PPCM-Listing_Connexion_01_Max_D\" transform=\"translate(-1378.000000, -78.000000)\" fill=\"#333333\" fill-rule=\"nonzero\">\n                                <g id=\"elements-/-sdk-/-button-copy-2-elements-/-sdk-/-button\" transform=\"translate(1363.000000, 70.000000)\">\n                                    <g id=\"icons/apps/campaigns-icons-/-apps-/-40x40-/-Otherapps\" transform=\"translate(11.000000, 4.000000)\">\n                                        <g id=\"e906\" transform=\"translate(4.000000, 4.000000)\">\n                                            <path d=\"M5.07812572,2.49999994e-06 L0.390625055,2.49999994e-06 C0.284830874,2.49999994e-06 0.193277944,0.0386579099 0.115966683,0.115969146 C0.0386554221,0.193280383 0,0.284833284 0,0.390627432 L0,5.07812661 C0,5.18392076 0.0386554221,5.27547366 0.115966683,5.3527849 C0.193277944,5.43009614 0.284830874,5.46875155 0.390625055,5.46875155 L1.17187517,5.46875155 C1.27766935,5.46875155 1.36922228,5.43009614 1.44653354,5.3527849 C1.5238448,5.27547366 1.56250022,5.18392076 1.56250022,5.07812661 L1.56250022,1.85546884 C1.56250022,1.85546884 1.57674189,1.80664093 1.60522481,1.70898429 C1.63370773,1.61132847 1.70898441,1.56250014 1.83105484,1.56250014 C1.83105484,1.56250014 1.83308943,1.56250014 1.83715859,1.56250014 C1.84122734,1.56250014 1.84733109,1.56250014 1.85546901,1.56250014 L3.57666092,1.56250014 C3.57666092,1.56250014 3.62752385,1.57674181 3.72924886,1.60522472 C3.83097429,1.63370763 3.88997513,1.71712262 3.90625097,1.85546884 L3.90625097,3.49121022 C3.90625097,3.49121022 3.8920093,3.55631438 3.86352638,3.68652269 C3.83504346,3.816731 3.71907636,3.88183516 3.51562591,3.88183516 C3.51562591,3.88183516 3.507488,3.88183516 3.49121174,3.88183516 L2.77099498,3.88183516 C2.66520038,3.88183516 2.57364786,3.92049098 2.4963366,3.99780222 C2.41902534,4.07511304 2.38036992,4.16666594 2.38036992,4.27246009 L2.38036992,5.05370995 C2.38036992,5.16764243 2.41902534,5.2612295 2.4963366,5.33447157 C2.57364786,5.40771406 2.66520038,5.44433488 2.77099498,5.44433488 L5.07812447,5.44433488 C5.18391865,5.44433488 5.27547158,5.40771406 5.35278284,5.33447157 C5.4300941,5.2612295 5.46874952,5.16764243 5.46874952,5.05370995 L5.46874952,0.390627432 C5.46874952,0.284833284 5.4300941,0.193280383 5.35278284,0.115969146 C5.27547158,0.0386579099 5.18391865,2.49999994e-06 5.07812447,2.49999994e-06 L5.07812572,2.49999994e-06 Z M12.1093762,0 L7.42187553,0 C7.31608135,0 7.22452842,0.0386579091 7.14721716,0.115969144 C7.0699059,0.193280379 7.03125048,0.284833278 7.03125048,0.390627424 L7.03125048,5.07812651 C7.03125048,5.18392065 7.0699059,5.27547355 7.14721716,5.35278479 C7.22452842,5.43009602 7.31608135,5.46875143 7.42187553,5.46875143 L8.20312564,5.46875143 C8.30891982,5.46875143 8.40047275,5.43009602 8.47778401,5.35278479 C8.55509528,5.27547355 8.5937507,5.18392065 8.5937507,5.07812651 L8.5937507,1.8554688 C8.5937507,1.8554688 8.60799237,1.81070965 8.63647529,1.72119133 C8.66495821,1.63167343 8.74023489,1.58691427 8.86230532,1.58691427 C8.86230532,1.58691427 8.8643399,1.58691427 8.86840907,1.58691427 C8.87247782,1.58691427 8.87858157,1.58691427 8.88671949,1.58691427 L10.6079114,1.58691427 C10.6079114,1.58691427 10.6587743,1.60115552 10.7604993,1.62963885 C10.8622248,1.65812176 10.9212256,1.74153674 10.9375014,1.87988297 L10.9375014,3.51562431 C10.9375014,3.51562431 10.9232598,3.58072847 10.8947769,3.71093677 C10.8662939,3.84114508 10.7503268,3.90624924 10.5468764,3.90624924 C10.5468764,3.90624924 10.5387385,3.90624924 10.5224622,3.90624924 L9.76562461,3.90624924 C9.65983043,3.90624924 9.5682775,3.94490465 9.49096624,4.02221588 C9.41365498,4.09952711 9.37499956,4.19108001 9.37499956,4.29687416 L9.37499956,5.07812401 C9.37499956,5.18391815 9.41365498,5.27547105 9.49096624,5.35278229 C9.5682775,5.43009352 9.65983043,5.46875143 9.76562461,5.46875143 L12.1093749,5.46875143 C12.2151691,5.46875143 12.3067221,5.43009352 12.3840333,5.35278229 C12.4613446,5.27547105 12.5,5.18391815 12.5,5.07812401 L12.5,0.390624924 C12.5,0.284830778 12.4613446,0.193277879 12.3840333,0.115966644 C12.3067221,0.0386554091 12.2151691,0 12.1093749,0 L12.1093762,0 Z M5.07812572,7.03124857 L0.390625055,7.03124857 C0.284830874,7.03124857 0.193277944,7.06990648 0.115966683,7.14721771 C0.0386554221,7.22452895 0,7.31608185 0,7.42187599 L0,12.1093751 C0,12.2151692 0.0386554221,12.3067221 0.115966683,12.3840334 C0.193277944,12.4613446 0.284830874,12.5 0.390625055,12.5 L1.17187517,12.5 C1.27766935,12.5 1.36922228,12.4613446 1.44653354,12.3840334 C1.5238448,12.3067221 1.56250022,12.2151692 1.56250022,12.1093751 L1.56250022,8.88671737 C1.56250022,8.88671737 1.57674189,8.84195822 1.60522481,8.7524399 C1.63370773,8.662922 1.70898441,8.61816284 1.83105484,8.61816284 C1.83105484,8.61816284 1.83308943,8.61816284 1.83715859,8.61816284 C1.84122734,8.61816284 1.84733109,8.61816284 1.85546901,8.61816284 L3.57666092,8.61816284 C3.57666092,8.61816284 3.62752385,8.63240409 3.72924886,8.66088742 C3.83097429,8.68937033 3.88997513,8.77278531 3.90625097,8.91113154 L3.90625097,10.5468729 C3.90625097,10.5468729 3.8920093,10.611977 3.86352638,10.7421853 C3.83504346,10.8723937 3.71907636,10.9374978 3.51562591,10.9374978 C3.51562591,10.9374978 3.507488,10.9374978 3.49121174,10.9374978 L2.77099498,10.9374978 C2.66520038,10.9374978 2.57364786,10.9761532 2.4963366,11.0534644 C2.41902534,11.1307757 2.38036992,11.2223286 2.38036992,11.3281227 L2.38036992,12.1093726 C2.38036992,12.2151667 2.41902534,12.3067196 2.4963366,12.3840309 C2.57364786,12.4613421 2.66520038,12.5 2.77099498,12.5 L5.07812447,12.5 C5.18391865,12.5 5.27547158,12.4613421 5.35278284,12.3840309 C5.4300941,12.3067196 5.46874952,12.2151667 5.46874952,12.1093726 L5.46874952,7.42187349 C5.46874952,7.31607935 5.4300941,7.22452645 5.35278284,7.14721521 C5.27547158,7.06990398 5.18391865,7.03124857 5.07812447,7.03124857 L5.07812572,7.03124857 Z M12.1093762,7.03124857 L7.42187553,7.03124857 C7.31608135,7.03124857 7.22452842,7.06990648 7.14721716,7.14721771 C7.0699059,7.22452895 7.03125048,7.31608185 7.03125048,7.42187599 L7.03125048,12.1093751 C7.03125048,12.2151692 7.0699059,12.3067221 7.14721716,12.3840334 C7.22452842,12.4613446 7.31608135,12.5 7.42187553,12.5 L8.20312564,12.5 C8.30891982,12.5 8.40047275,12.4613446 8.47778401,12.3840334 C8.55509528,12.3067221 8.5937507,12.2151692 8.5937507,12.1093751 L8.5937507,8.88671737 C8.5937507,8.88671737 8.60799237,8.84195822 8.63647529,8.7524399 C8.66495821,8.662922 8.74023489,8.61816284 8.86230532,8.61816284 C8.86230532,8.61816284 8.8643399,8.61816284 8.86840907,8.61816284 C8.87247782,8.61816284 8.87858157,8.61816284 8.88671949,8.61816284 L10.6079114,8.61816284 C10.6079114,8.61816284 10.6587743,8.63240409 10.7604993,8.66088742 C10.8622248,8.68937033 10.9212256,8.77278531 10.9375014,8.91113154 L10.9375014,10.5468729 C10.9375014,10.5468729 10.9232598,10.611977 10.8947769,10.7421853 C10.8662939,10.8723937 10.7503268,10.9374978 10.5468764,10.9374978 C10.5468764,10.9374978 10.5387385,10.9374978 10.5224622,10.9374978 L9.76562461,10.9374978 C9.65983043,10.9374978 9.5682775,10.9761532 9.49096624,11.0534644 C9.41365498,11.1307757 9.37499956,11.2223286 9.37499956,11.3281227 L9.37499956,12.1093726 C9.37499956,12.2151667 9.41365498,12.3067196 9.49096624,12.3840309 C9.5682775,12.4613421 9.65983043,12.5 9.76562461,12.5 L12.1093749,12.5 C12.2151691,12.5 12.3067221,12.4613421 12.3840333,12.3840309 C12.4613446,12.3067196 12.5,12.2151667 12.5,12.1093726 L12.5,7.42187349 C12.5,7.31607935 12.4613446,7.22452645 12.3840333,7.14721521 C12.3067221,7.06990398 12.2151691,7.03124857 12.1093749,7.03124857 L12.1093762,7.03124857 Z\" id=\"Shape\"></path>\n                                        </g>\n                                    </g>\n                                </g>\n                            </g>\n                        </g>\n                    </svg>\n                    Other apps\n                </a>\n                <div class=\"bac--apps-container\" id=\"bac--puresdk-apps-container--\">\n                    <div id=\"bac--aps-actual-container\"></div>\n                </div>\n            </div>\n            <div class=\"bac--user-avatar\" id=\"bac--user-avatar-top\">\n                <span class=\"bac--user-avatar-name\" id=\"bac--puresdk-user-avatar--\"></span>\n                <div id=\"bac--image-container-top\"></div>\n            </div>\n        </div>\n    </div>\n    <div id=\"bac--info-blocks-wrapper--\"></div>\n</header>\n<div class=\"bac--user-sidebar\" id=\"bac--puresdk-user-sidebar--\">\n    <div class=\"bac--user-sidebar-white-bg\" id=\"bac--user-sidebar-white-bg\">\n        <div id=\"bac--puresdk-user-details--\">\n            <div class=\"bac-user-acount-list-item\">\n                <a id=\"bac--logout--button\" href=\"/api/v1/sign-off\"><i class=\"fa fa-login-line\"></i> Log out</a>\n            </div>\n        </div>\n        <div class=\"bac--user-apps\" id=\"bac--puresdk-user-businesses--\">\n        </div>\n        <div class=\"bac--user-account-settings\">\n            <div id=\"puresdk-version-number\" class=\"puresdk-version-number\"></div>\n        </div>\n    </div>\n</div>\n\n\n<div class=\"bac--custom-modal add-question-modal --is-open\" id=\"bac--cloudinary--modal\">\n    <div class=\"custom-modal__wrapper\">\n        <div class=\"custom-modal__content\">\n            <h3>Add image</h3>\n            <a class=\"custom-modal__close-btn\" id=\"bac--cloudinary--closebtn\"><i class=\"fa fa-times-circle\"></i></a>\n        </div>\n\n        <div class=\"custom-modal__content\">\n            <div class=\"bac-search --icon-left\">\n                <input id=\"bac--cloudinary--search-input\" type=\"search\" name=\"search\" placeholder=\"Search for images...\"/>\n                <div class=\"bac-search__icon\"><i class=\"fa fa-search\"></i></div>\n            </div>\n            <br/>\n\n            <div class=\"back-button\" id=\"bac--cloudinary--back-button-container\">\n                <a class=\"goBack\" id=\"bac--cloudinary--go-back\"><i class=\"fa fa-angle-left\"></i>Go Back</a>\n            </div>\n\n            <br/>\n            <div class=\"cloud-images\">\n                <div class=\"cloud-images__container\" id=\"bac--cloudinary-itams-container\"></div>\n\n                <div class=\"cloud-images__pagination\" id=\"bac--cloudinary-pagination-container\">\n                    <ul id=\"bac--cloudinary-actual-pagination-container\"></ul>\n                </div>\n\n            </div>\n        </div>\n    </div>\n</div>\n<div id=\"bac---invalid-account\">You have switched to another account from another tab. Please either close this page\n    or switch to the right account to re-enable access</div>\n\n<input style=\"display:none\" type='file' id='bac---puresdk-avatar-file'>\n<input style=\"display:none\" type='button' id='bac---puresdk-avatar-submit' value='Upload!'>");
ppba.setVersionNumber('2.9.7-rc.4');
window.PURESDK = ppba;
var css = 'html,body,div,span,applet,object,iframe,h1,h2,h3,h4,h5,h6,p,blockquote,pre,a,abbr,acronym,address,big,cite,code,del,dfn,em,img,ins,kbd,q,s,samp,small,strike,strong,sub,sup,tt,var,b,u,i,center,dl,dt,dd,ol,ul,li,fieldset,form,label,legend,table,caption,tbody,tfoot,thead,tr,th,td,article,aside,canvas,details,embed,figure,figcaption,footer,header,hgroup,menu,nav,output,ruby,section,summary,time,mark,audio,video{margin:0;padding:0;border:0;font-size:100%;font:inherit;vertical-align:baseline}article,aside,details,figcaption,figure,footer,header,hgroup,menu,nav,section{display:block}body{line-height:1}ol,ul{list-style:none}blockquote,q{quotes:none}blockquote:before,blockquote:after,q:before,q:after{content:"";content:none}table{border-collapse:collapse;border-spacing:0}body{overflow-x:hidden}#bac---invalid-account{position:fixed;width:100%;height:100%;background:black;opacity:0.7;color:white;font-size:18px;text-align:center;padding-top:15%;display:none;z-index:100000000}#bac---invalid-account.invalid{display:block}#bac-wrapper{font-family:"Verdana", arial, sans-serif;color:white;min-height:100vh;position:relative}.bac-user-acount-list-item{background-color:transparent;text-align:center}.bac-user-acount-list-item #bac--logout--button{display:inline-block;padding:4px 8px;background-color:rgba(255,255,255,0.85);font-size:12px;border-radius:2px;margin:4px 0 26px 0}.bac-user-acount-list-item fa-login-line{margin-right:3px;position:relative;top:1px}.bac--container{max-width:1160px;margin:0 auto}.bac--container .bac--puresdk-app-name--{color:#333333;text-decoration:none;margin-right:16px;font-size:13px;display:inline-block;padding:6px 16px;background-color:rgba(255,255,255,0.75);position:relative;top:-6px;border-radius:4px;margin-left:20px}.bac--container .bac--puresdk-app-name--:hover{background-color:rgba(255,255,255,0.9)}.bac--container .bac--puresdk-app-name-- svg{margin-right:6px}.bac--container #app-name-link-to-root{text-decoration:none}.bac--header-apps{position:absolute;width:100%;height:50px;background-color:#475369;padding:5px 10px;z-index:9999999 !important}.bac--header-apps.bac--fullwidth{padding:0}.bac--header-apps.bac--fullwidth .bac--container{max-width:unset;padding-left:16px;padding-right:16px}.bac--header-apps .bac--container{height:100%;display:flex;align-items:center;justify-content:space-between}.bac--header-search{position:relative}.bac--header-search input{color:#fff;font-size:14px;height:35px;background-color:#6b7586;padding:0 5px 0 10px;border:none;border-radius:3px;min-width:400px;width:100%}.bac--header-search input:focus{outline:none}.bac--header-search input::-webkit-input-placeholder{font-style:normal !important;text-align:center;color:#fff;font-size:14px;font-weight:300;letter-spacing:0.5px}.bac--header-search input::-moz-placeholder{font-style:normal !important;text-align:center;color:#fff;font-size:14px;font-weight:300;letter-spacing:0.5px}.bac--header-search input:-ms-input-placeholder{font-style:normal !important;text-align:center;color:#fff;font-size:14px;font-weight:300;letter-spacing:0.5px}.bac--header-search i{position:absolute;top:8px;right:10px}.bac--user-actions{display:flex;align-items:center}.bac--user-actions #bac--puresdk-apps-section--{border-right:1px solid #adadad;height:40px;padding-top:13px}.bac--user-actions #bac--puresdk-apps-section-- a.bac--puresdk-apps-on-navbar--{color:#333333;text-decoration:none;margin-right:16px;font-size:13px;display:inline-block;padding:6px 16px;background-color:rgba(255,255,255,0.75);position:relative;top:-6px;border-radius:4px}.bac--user-actions #bac--puresdk-apps-section-- a.bac--puresdk-apps-on-navbar--.disabled{pointer-events:none;cursor:none;color:#adadad}.bac--user-actions #bac--puresdk-apps-section-- a.bac--puresdk-apps-on-navbar--.selected{pointer-events:none;background-color:#fff;border:1px solid #333333}.bac--user-actions #bac--puresdk-apps-section-- a.bac--puresdk-apps-on-navbar--:hover{background-color:rgba(255,255,255,0.9)}.bac--user-actions #bac--puresdk-apps-section-- a.bac--puresdk-apps-on-navbar-- svg{margin-right:6px}.bac--user-actions .bac--user-notifications{position:relative}.bac--user-actions .bac--user-notifications i{font-size:20px}.bac--user-actions #bac--puresdk--loader--{display:none}.bac--user-actions #bac--puresdk--loader--.bac--puresdk-visible{display:block}.bac--user-actions .bac--user-notifications-count{position:absolute;display:inline-block;height:15px;width:15px;line-height:15px;color:#fff;font-size:10px;text-align:center;background-color:#fc3b30;border-radius:50%;top:-5px;left:-5px}.bac--user-actions .bac--user-avatar,.bac--user-actions .bac--user-notifications{margin-left:20px}.bac--user-actions .bac--user-avatar{position:relative;overflow:hidden;border-radius:50%}.bac--user-actions .bac--user-avatar #bac--image-container-top{width:100%;heigth:100%;position:absolute;top:0;left:0;z-index:1;display:none}.bac--user-actions .bac--user-avatar #bac--image-container-top img{width:100%;height:100%;cursor:pointer}.bac--user-actions .bac--user-avatar #bac--image-container-top.bac--puresdk-visible{display:block}.bac--user-actions .bac--user-avatar-name{color:#fff;background-color:#adadad;display:inline-block;height:35px;width:35px;line-height:35px;text-align:center;font-size:14px}.bac--user-apps{position:relative}#bac--puresdk-apps-icon--{width:20px;display:inline-block;text-align:center;font-size:16px}.bac--puresdk-apps-name--{font-size:9px;width:20px;text-align:center}#bac--puresdk-user-businesses--{height:calc(100vh - 296px);overflow:auto}.bac--apps-container{background:#fff;position:absolute;top:45px;right:0px;display:flex;width:300px;flex-wrap:wrap;border-radius:10px;padding:15px;padding-right:0;justify-content:space-between;text-align:left;-webkit-box-shadow:0 0 10px 2px rgba(0,0,0,0.2);box-shadow:0 0 10px 2px rgba(0,0,0,0.2);opacity:0;visibility:hidden;transition:all 0.4s ease;max-height:500px}.bac--apps-container #bac--aps-actual-container{height:100%;overflow:scroll;max-height:475px;width:100%}.bac--apps-container.active{opacity:1;visibility:visible}.bac--apps-container:before{content:"";vertical-align:middle;margin:auto;position:absolute;display:block;left:0;right:-185px;bottom:calc(100% - 6px);width:12px;height:12px;transform:rotate(45deg);background-color:#fff}.bac--apps-container .bac--apps{width:100%;font-size:20px;margin-bottom:15px;text-align:left;height:33px}.bac--apps-container .bac--apps:last-child{margin-bottom:0}.bac--apps-container .bac--apps:hover{background:#f3f3f3}.bac--apps-container .bac--apps a.bac--image-link{display:inline-block;color:#fff;text-decoration:none;width:33px;height:33px}.bac--apps-container .bac--apps a.bac--image-link img{width:100%;height:100%}.bac--apps-container .bac--apps .bac--puresdk-app-text-container{display:inline-block;position:relative;left:-2px;width:calc(100% - 42px)}.bac--apps-container .bac--apps .bac--puresdk-app-text-container a{display:block;text-decoration:none;cursor:pointer;padding-left:8px}.bac--apps-container .bac--apps .bac--puresdk-app-text-container .bac--app-name{width:100%;color:#000;font-size:13px;padding-bottom:4px}.bac--apps-container .bac--apps .bac--puresdk-app-text-container .bac--app-description{color:#919191;font-size:11px;font-style:italic;line-height:1.3em;position:relative;top:-2px;overflow:hidden;white-space:nowrap;text-overflow:ellipsis}.bac--user-sidebar{background:white;font-family:"Verdana", arial, sans-serif;color:#333333;height:calc(100vh - 50px);box-sizing:border-box;width:320px;position:fixed;top:50px;right:0;z-index:999999;opacity:0;transform:translateX(100%);transition:all 0.4s ease}.bac--user-sidebar .bac--user-sidebar-white-bg{width:100%;height:100%}.bac--user-sidebar.active{opacity:1;transform:translateX(0%);-webkit-box-shadow:-1px 0px 12px 0px rgba(0,0,0,0.75);-moz-box-shadow:-1px 3px 12px 0px rgba(0,0,0,0.75);box-shadow:-1px 0px 12px 0px rgba(0,0,0,0.75)}.bac--user-sidebar .bac--user-list-item{display:flex;position:relative;cursor:pointer;align-items:center;padding:10px 10px 10px 40px;border-bottom:1px solid white}.bac--user-sidebar .bac--user-list-item:hover{background-color:rgba(255,255,255,0.1)}.bac--user-sidebar .bac--user-list-item .bac--selected-acount-indicator{position:absolute;right:0;height:100%;width:8px;background:#333333}.bac--user-sidebar .bac--user-list-item .bac--user-list-item-image{width:40px;height:40px;border-radius:3px;border:1px solid #333333;overflow:hidden;margin-right:20px;display:flex;align-items:center;justify-content:center}.bac--user-sidebar .bac--user-list-item .bac--user-list-item-image>img{width:auto;height:auto;max-width:100%;max-height:100%}.bac--user-sidebar .bac--user-list-item span{width:100%;display:block;margin-bottom:5px}.bac--user-sidebar .bac-user-app-details span{font-size:12px}.bac--user-sidebar .puresdk-version-number{width:100%;text-align:right;padding-right:10px;position:absolute;font-size:8px;opacity:0.5;right:0;bottom:0}.bac--user-sidebar-info{display:flex;justify-content:center;flex-wrap:wrap;text-align:center;padding:20px 20px 15px}.bac--user-sidebar-info .bac--user-image{border:1px #adadad solid;overflow:hidden;border-radius:50%;position:relative;cursor:pointer;display:inline-block;height:80px;width:80px;line-height:80px;text-align:center;color:#fff;border-radius:50%;background-color:#adadad;margin-bottom:15px}.bac--user-sidebar-info .bac--user-image #bac--user-image-file{display:none;position:absolute;z-index:1;top:0;left:0;width:100%;height:100%}.bac--user-sidebar-info .bac--user-image #bac--user-image-file img{width:100%;height:100%}.bac--user-sidebar-info .bac--user-image #bac--user-image-file.bac--puresdk-visible{display:block}.bac--user-sidebar-info .bac--user-image #bac--user-image-upload-progress{position:absolute;padding-top:10px;top:0;background:#666;z-index:4;display:none;width:100%;height:100%}.bac--user-sidebar-info .bac--user-image #bac--user-image-upload-progress.bac--puresdk-visible{display:block}.bac--user-sidebar-info .bac--user-image i{font-size:32px;font-size:32px;z-index:0;position:absolute;width:100%;left:0;background-color:rgba(0,0,0,0.5)}.bac--user-sidebar-info .bac--user-image:hover i{z-index:3}.bac--user-sidebar-info .bac--user-name{width:100%;text-align:center;font-size:18px;margin-bottom:10px}.bac--user-sidebar-info .bac--user-email{font-size:12px;font-weight:300}.bac--user-account-settings{position:absolute;bottom:10px;left:20px;width:90%;height:10px}#bac--puresdk-account-logo--{cursor:pointer;position:relative;color:#fff}#bac--puresdk-account-logo-- img{height:28px;top:3px;position:relative}#bac--info-blocks-wrapper--{position:fixed;top:0px;height:auto}#bac--info-blocks-wrapper-- .bac--puresdk-info-box--{border-radius:0 0 3px 3px;overflow:hidden;z-index:99999999;position:relative;margin-top:0;width:470px;left:calc(50vw - 235px);height:0px;-webkit-transition:top 0.4s;transition:all 0.4s}#bac--info-blocks-wrapper-- .bac--puresdk-info-box--.bac--success{background:#14DA9E}#bac--info-blocks-wrapper-- .bac--puresdk-info-box--.bac--success .bac--inner-info-box-- div.bac--info-icon--.fa-success{display:inline-block}#bac--info-blocks-wrapper-- .bac--puresdk-info-box--.bac--info{background-color:#5BC0DE}#bac--info-blocks-wrapper-- .bac--puresdk-info-box--.bac--info .bac--inner-info-box-- div.bac--info-icon--.fa-info-1{display:inline-block}#bac--info-blocks-wrapper-- .bac--puresdk-info-box--.bac--warning{background:#F0AD4E}#bac--info-blocks-wrapper-- .bac--puresdk-info-box--.bac--warning .bac--inner-info-box-- div.bac--info-icon--.fa-warning{display:inline-block}#bac--info-blocks-wrapper-- .bac--puresdk-info-box--.bac--error{background:#EF4100}#bac--info-blocks-wrapper-- .bac--puresdk-info-box--.bac--error .bac--inner-info-box-- div.bac--info-icon--.fa-error{display:inline-block}#bac--info-blocks-wrapper-- .bac--puresdk-info-box-- .bac--timer{-webkit-transition-timing-function:linear;transition-timing-function:linear;position:absolute;bottom:0px;opacity:0.5;height:2px !important;background:white;width:0%}#bac--info-blocks-wrapper-- .bac--puresdk-info-box-- .bac--timer.bac--fullwidth{width:100%}#bac--info-blocks-wrapper-- .bac--puresdk-info-box--.bac--active--{height:auto;margin-top:5px}#bac--info-blocks-wrapper-- .bac--puresdk-info-box-- .bac--inner-info-box--{width:100%;padding:11px 15px;color:white}#bac--info-blocks-wrapper-- .bac--puresdk-info-box-- .bac--inner-info-box-- div{display:inline-block;height:18px;position:relative}#bac--info-blocks-wrapper-- .bac--puresdk-info-box-- .bac--inner-info-box-- div.bac--info-icon--{display:none;top:0px}#bac--info-blocks-wrapper-- .bac--puresdk-info-box-- .bac--inner-info-box-- .bac--info-icon--{margin-right:15px;width:10px;top:2px}#bac--info-blocks-wrapper-- .bac--puresdk-info-box-- .bac--inner-info-box-- .bac--info-main-text--{width:380px;margin-right:15px;font-size:12px;text-align:center}#bac--info-blocks-wrapper-- .bac--puresdk-info-box-- .bac--inner-info-box-- .bac--info-close-button--{width:10px;cursor:pointer;top:2px}@media (min-width: 600px){.bac--container.bac--fullwidth .bac--container{padding-left:24px;padding-right:24px}}@media (min-width: 960px){.bac--container.bac--fullwidth .bac--container{padding-left:32px;padding-right:32px}}.bac--custom-modal{position:fixed;width:70%;height:80%;min-width:400px;left:0;right:0;top:0;bottom:0;margin:auto;border:1px solid #979797;border-radius:5px;box-shadow:0 0 71px 0 #2F3849;background:#fff;z-index:999;overflow:auto;display:none}.bac--custom-modal.is-open{display:block}.bac--custom-modal .custom-modal__close-btn{text-decoration:none;padding-top:2px;line-height:18px;height:20px;width:20px;border-radius:50%;color:#909ba4;text-align:center;position:absolute;top:20px;right:20px;font-size:20px}.bac--custom-modal .custom-modal__close-btn:hover{text-decoration:none;color:#455066;cursor:pointer}.bac--custom-modal .custom-modal__wrapper{height:100%;display:flex;flex-direction:column}.bac--custom-modal .custom-modal__wrapper iframe{width:100%;height:100%}.bac--custom-modal .custom-modal__content-wrapper{height:100%;overflow:auto;margin-bottom:104px;border-top:2px solid #C9CDD7}.bac--custom-modal .custom-modal__content-wrapper.no-margin{margin-bottom:0}.bac--custom-modal .custom-modal__content{padding:20px;position:relative}.bac--custom-modal .custom-modal__content h3{color:#2F3849;font-size:20px;font-weight:600;line-height:27px}.bac--custom-modal .custom-modal__save{position:absolute;right:0;bottom:0;width:100%;padding:30px 32px;background-color:#F2F2F4}.bac--custom-modal .custom-modal__save a,.bac--custom-modal .custom-modal__save button{font-size:14px;line-height:22px;height:44px;width:100%}.bac--custom-modal .custom-modal__splitter{height:30px;line-height:30px;padding:0 20px;border-color:#D3D3D3;border-style:solid;border-width:1px 0 1px 0;background-color:#F0F0F0;color:#676F82;font-size:13px;font-weight:600}.bac--custom-modal .custom-modal__box{display:inline-block;vertical-align:middle;height:165px;width:165px;border:2px solid red;border-radius:5px;text-align:center;font-size:12px;font-weight:600;color:#9097A8;text-decoration:none;margin:10px 20px 10px 0;transition:0.1s all}.bac--custom-modal .custom-modal__box i{font-size:70px;display:block;margin:25px 0}.bac--custom-modal .custom-modal__box.active{color:yellow;border-color:yellow;text-decoration:none}.bac--custom-modal .custom-modal__box:hover,.bac--custom-modal .custom-modal__box:active,.bac--custom-modal .custom-modal__box:focus{color:#1AC0B4;border-color:yellow;text-decoration:none}.cloud-images__container{display:flex;flex-wrap:wrap;justify-content:flex-start}.cloud-images__pagination{padding:20px}.cloud-images__pagination li{display:inline-block;margin-right:10px}.cloud-images__pagination li a{color:#fff;background-color:#5e6776;border-radius:20px;text-decoration:none;display:block;font-weight:200;height:35px;width:35px;line-height:35px;text-align:center}.cloud-images__pagination li.active a{background-color:#2f3849}.cloud-images__item{width:155px;height:170px;border:1px solid #eee;background-color:#fff;border-radius:3px;margin:0 15px 15px 0;text-align:center;position:relative;cursor:pointer}.cloud-images__item .cloud-images__item__type{height:115px;font-size:90px;line-height:140px;border-top-left-radius:3px;border-top-right-radius:3px;color:#a2a2a2;background-color:#e9eaeb}.cloud-images__item .cloud-images__item__type>img{width:auto;height:auto;max-width:100%;max-height:100%}.cloud-images__item .cloud-images__item__details{padding:10px 0}.cloud-images__item .cloud-images__item__details .cloud-images__item__details__name{font-size:12px;outline:none;padding:0 10px;color:#a5abb5;border:none;width:100%;background-color:transparent;height:15px;display:inline-block;word-break:break-all}.cloud-images__item .cloud-images__item__details .cloud-images__item__details__date{font-size:10px;bottom:6px;width:155px;height:15px;color:#a5abb5;display:inline-block}.cloud-images__item .cloud-images__item__actions{display:flex;align-items:center;justify-content:center;position:absolute;top:0;left:0;width:100%;height:115px;background-color:rgba(78,83,91,0.83);opacity:0;visibility:hidden;border-top-left-radius:3px;border-top-right-radius:3px;text-align:center;transition:0.3s opacity}.cloud-images__item .cloud-images__item__actions a{font-size:16px;color:#fff;text-decoration:none}.cloud-images__item:hover .cloud-images__item .cloud-images__item__actions{opacity:1;visibility:visible}',
    head = document.head || document.getElementsByTagName('head')[0],
    style = document.createElement('style');
style.type = 'text/css';

if (style.styleSheet) {
  style.styleSheet.cssText = css;
} else {
  style.appendChild(document.createTextNode(css));
}

head.appendChild(style);
var link = document.createElement('link');
link.href = 'https://access-fonts.pureprofile.com/styles.css';
link.rel = 'stylesheet';
document.getElementsByTagName('head')[0].appendChild(link);
module.exports = ppba;
},{"./PPBA":9}],11:[function(require,module,exports){
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
},{}],12:[function(require,module,exports){
"use strict";

var amplitude = require('amplitude-js');

var Store = require('./store');

var Amplitude = {
  init: function init(userInfo) {
    amplitude.getInstance().init('fb159ffba3f94dedf8575b597767d99d', userInfo.id);
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
},{"./store":21,"amplitude-js":1}],13:[function(require,module,exports){
"use strict";

var Store = require('./store');

var Logger = require('./logger');

var Dom = require('./dom');

var Caller = require('./caller');

var uploading = false;
var AvatarCtrl = {
  _submit: null,
  _file: null,
  _progress: null,
  _sidebar_avatar: null,
  _top_avatar: null,
  _top_avatar_container: null,
  init: function init() {
    AvatarCtrl._submit = document.getElementById('bac---puresdk-avatar-submit');
    AvatarCtrl._file = document.getElementById('bac---puresdk-avatar-file');
    AvatarCtrl._top_avatar_container = document.getElementById('bac--image-container-top');
    AvatarCtrl._progress = document.getElementById('bac--user-image-upload-progress');
    AvatarCtrl._sidebar_avatar = document.getElementById('bac--user-image-file');
    AvatarCtrl._top_avatar = document.getElementById('bac--user-avatar-top');

    AvatarCtrl._file.addEventListener('click', function (e) {
      e.stopPropagation();
    });

    AvatarCtrl._file.addEventListener('change', function (e) {
      AvatarCtrl.upload();
    });

    document.getElementById('bac--user-image').addEventListener('click', function (e) {
      e.stopPropagation();

      AvatarCtrl._file.click();
    });
  },
  upload: function upload() {
    if (uploading) {
      return;
    }

    uploading = true;

    if (AvatarCtrl._file.files.length === 0) {
      return;
    }

    var data = new FormData();
    data.append('file', AvatarCtrl._file.files[0]);

    var successCallback = function successCallback(data) {
      ;
    };

    var failCallback = function failCallback(data) {
      ;
    };

    var request = new XMLHttpRequest();

    request.onreadystatechange = function () {
      uploading = false;

      if (request.readyState == 4) {
        try {
          var imageData = JSON.parse(request.response).data;
          AvatarCtrl.setAvatar(imageData.url);
          Caller.makeCall({
            type: 'PUT',
            endpoint: Store.getAvatarUpdateUrl(),
            params: {
              user: {
                avatar_uuid: imageData.guid
              }
            },
            callbacks: {
              success: successCallback,
              fail: failCallback
            }
          });
        } catch (e) {
          var resp = {
            status: 'error',
            data: 'Unknown error occurred: [' + request.responseText + ']'
          };
        }

        Logger.log(request.response.status + ': ' + request.response.data);
      }
    }; // request.upload.addEventListener('progress', function(e){
    // 	Logger.log(e.loaded/e.total);
    // 	AvatarCtrl._progress.style.top = 100 - (e.loaded/e.total) * 100 + '%';
    // }, false);


    var url = Store.getAvatarUploadUrl();
    Dom.addClass(AvatarCtrl._progress, 'bac--puresdk-visible');
    request.open('POST', url);
    request.send(data);
  },
  setAvatar: function setAvatar(url) {
    if (!url) {
      return;
    }

    Dom.removeClass(AvatarCtrl._progress, 'bac--puresdk-visible');
    Dom.addClass(AvatarCtrl._sidebar_avatar, 'bac--puresdk-visible');
    var img = document.createElement('img');
    img.src = url;
    AvatarCtrl._sidebar_avatar.innerHTML = '';

    AvatarCtrl._sidebar_avatar.appendChild(img);

    Dom.addClass(AvatarCtrl._top_avatar_container, 'bac--puresdk-visible');
    var img_2 = document.createElement('img');
    img_2.src = url;
    AvatarCtrl._top_avatar_container.innerHTML = '';

    AvatarCtrl._top_avatar_container.appendChild(img_2); //  bac--image-container-top

  }
};
module.exports = AvatarCtrl;
},{"./caller":14,"./dom":16,"./logger":18,"./store":21}],14:[function(require,module,exports){
"use strict";

var Store = require('./store.js');

var Logger = require('./logger');

var paramsToGetVars = function paramsToGetVars(params) {
  var toReturn = [];

  for (var property in params) {
    if (params.hasOwnProperty(property)) {
      toReturn.push(property + '=' + params[property]);
    }
  }

  return toReturn.join('&');
};

var devKeys = null;
var Caller = {
  /*
  if the user sets
   */
  setDevKeys: function setDevKeys(keys) {
    devKeys = keys;
  },

  /*
  expecte attributes:
  - type (either GET, POST, DELETE, PUT)
  - endpoint
  - params (if any. A json with parameters to be passed back to the endpoint)
  - callbacks: an object with:
  	- success: the success callback
  	- fail: the fail callback
   */
  makeCall: function makeCall(attrs) {
    var endpointUrl = attrs.endpoint;
    var xhr = new XMLHttpRequest();

    if (attrs.type === 'GET' && attrs.params) {
      endpointUrl = endpointUrl + "?" + paramsToGetVars(attrs.params);
    }

    xhr.open(attrs.type, endpointUrl);

    if (devKeys != null) {
      xhr.setRequestHeader('x-pp-secret', devKeys.secret);
      xhr.setRequestHeader('x-pp-key', devKeys.key);
    }

    xhr.withCredentials = true;
    xhr.setRequestHeader('Content-Type', 'application/json');

    xhr.onload = function () {
      if (xhr.status >= 200 && xhr.status < 300) {
        attrs.callbacks.success(JSON.parse(xhr.responseText));
      } else if (xhr.status !== 200) {
        attrs.callbacks.fail(JSON.parse(xhr.responseText));
      }
    };

    if (!attrs.params) {
      attrs.params = {};
    }

    xhr.send(JSON.stringify(attrs.params));
  },
  promiseCall: function promiseCall(attrs) {
    return new Promise(function (resolve, reject) {
      var xhr = new XMLHttpRequest();

      if (attrs.type === 'GET' && attrs.params) {
        endpointUrl = endpointUrl + "?" + paramsToGetVars(attrs.params);
      }

      xhr.open(attrs.type, attrs.endpoint);
      xhr.withCredentials = true;

      if (devKeys != null) {
        xhr.setRequestHeader('x-pp-secret', devKeys.secret);
        xhr.setRequestHeader('x-pp-key', devKeys.key);
      }

      xhr.setRequestHeader('Content-Type', 'application/json');

      xhr.onload = function () {
        if (this.status >= 200 && this.status < 300) {
          attrs.middlewares.success(JSON.parse(xhr.responseText));
          resolve(JSON.parse(xhr.responseText));
        } else {
          window.location.href = Store.getLoginUrl();
        }
      };

      xhr.onerror = function () {
        window.location = Store.getLoginUrl();
      };

      xhr.send();
    });
  }
};
module.exports = Caller;
},{"./logger":18,"./store.js":21}],15:[function(require,module,exports){
"use strict";

var debouncedTimeout = null;
var currentQuery = '';
var limit = 8;
var latency = 500;
var initOptions;
var currentPage = 1;
var metaData = null;
var items = [];
var paginationData = null;

var PaginationHelper = require('./pagination-helper');

var Caller = require('./caller');

var Store = require('./store');

var Dom = require('./dom');

var CloudinaryPicker = {
  initialise: function initialise() {
    document.getElementById('bac--cloudinary--closebtn').onclick = function (e) {
      CloudinaryPicker.closeModal();
    };

    document.getElementById('bac--cloudinary--search-input').onkeyup = function (e) {
      CloudinaryPicker.handleSearch(e);
    };

    document.getElementById('bac--cloudinary--go-back').onclick = function (e) {
      CloudinaryPicker.goBack();
    };
  },

  /*
  options: {
  	onSelect: it expects a function. This function will be invoked exactly at the moment the user picks
  		a file from cloudinary. The function will take just one param which is the selected item object
    closeOnEsc: true / false
  }
   */
  openModal: function openModal(options) {
    CloudinaryPicker.initialise();
    initOptions = options;
    Dom.addClass(document.getElementById('bac--cloudinary--modal'), 'is-open');
    CloudinaryPicker.getImages({
      page: 1,
      limit: limit
    });
  },
  closeModal: function closeModal() {
    Dom.removeClass(document.getElementById('bac--cloudinary--modal'), 'is-open');
  },
  getImages: function getImages(options) {
    // TODO make the call and get the images
    Caller.makeCall({
      type: 'GET',
      endpoint: Store.getCloudinaryEndpoint(),
      params: options,
      callbacks: {
        success: function success(result) {
          CloudinaryPicker.onImagesResponse(result);
        },
        fail: function fail(err) {
          alert(err);
        }
      }
    });
  },
  handleSearch: function handleSearch(e) {
    if (debouncedTimeout) {
      clearTimeout(debouncedTimeout);
    }

    if (e.target.value === currentQuery) {
      return;
    }

    var query = e.target.value;
    currentQuery = query;
    var options = {
      page: 1,
      limit: limit,
      query: query
    };
    debouncedTimeout = setTimeout(function () {
      CloudinaryPicker.getImages(options);
    }, latency);
  },
  itemSelected: function itemSelected(item, e) {
    if (item.type == 'folder') {
      var params = {
        page: 1,
        limit: limit,
        parent: item.id
      }; // TODO set search input's value = ''

      currentQuery = '';
      CloudinaryPicker.getImages(params);
    } else {
      initOptions.onSelect(item);
      CloudinaryPicker.closeModal();
    }
  },
  onImagesResponse: function onImagesResponse(data) {
    paginationData = PaginationHelper.getPagesRange(currentPage, Math.ceil(data.meta.total / limit));
    metaData = data.meta;
    items = data.assets;
    CloudinaryPicker.render();
  },
  renderPaginationButtons: function renderPaginationButtons() {
    var toReturn = [];

    var createPaginationElement = function createPaginationElement(aClassName, aFunction, spanClassName, spanContent) {
      var li = document.createElement('li');
      var a = document.createElement('a');
      li.className = aClassName;
      a.onclick = aFunction;
      var span = document.createElement('span');
      span.className = spanClassName;

      if (spanContent) {
        span.innerHTML = spanContent;
      }

      a.appendChild(span);
      li.appendChild(a);
      return li;
    };

    if (paginationData.hasPrevious) {
      toReturn.push(createPaginationElement('disabled', function (e) {
        e.preventDefault();

        CloudinaryPicker._goToPage(1);
      }, 'fa fa-angle-double-left'));
      toReturn.push(createPaginationElement('disabled', function (e) {
        e.preventDefault();

        CloudinaryPicker._goToPage(currentPage - 1);
      }, 'fa fa-angle-left'));
    }

    for (var i = 0; i < paginationData.buttons.length; i++) {
      (function (i) {
        var btn = paginationData.buttons[i];
        toReturn.push(createPaginationElement(btn.runningpage ? "active" : "-", function (e) {
          e.preventDefault();

          CloudinaryPicker._goToPage(btn.pageno);
        }, 'number', btn.pageno));
      })(i);
    }

    if (paginationData.hasNext) {
      toReturn.push(createPaginationElement('disabled', function (e) {
        e.preventDefault();

        CloudinaryPicker._goToPage(currentPage + 1);
      }, 'fa fa-angle-right'));
      toReturn.push(createPaginationElement('disabled', function (e) {
        e.preventDefault();

        CloudinaryPicker._goToPage(Math.ceil(metaData.total / limit));
      }, 'fa fa-angle-double-right'));
    }

    document.getElementById('bac--cloudinary-actual-pagination-container').innerHTML = '';

    for (var _i = 0; _i < toReturn.length; _i++) {
      document.getElementById('bac--cloudinary-actual-pagination-container').appendChild(toReturn[_i]);
    }
  },
  _goToPage: function _goToPage(page) {
    if (page === currentPage) {
      return;
    }

    var params = {
      page: page,
      limit: limit
    };

    if (metaData.asset) {
      params.parent = metaData.asset;
    }

    if (currentQuery) {
      params.query = currentQuery;
    }

    currentPage = page;
    CloudinaryPicker.getImages(params);
  },
  goBack: function goBack() {
    var params = {
      page: 1,
      limit: limit
    };

    if (metaData.parent) {
      params.parent = metaData.parent;
    }

    if (currentQuery) {
      params.query = currentQuery;
    }

    CloudinaryPicker.getImages(params);
  },
  renderItems: function renderItems() {
    var oneItem = function oneItem(item) {
      var itemIcon = function itemIcon() {
        if (item.type != 'folder') {
          return "<img src=".concat(item.thumb, " alt=\"\"/>");
        } else {
          return "<i class=\"fa fa-folder-o\"></i>";
        }
      };

      var funct = function funct() {
        CloudinaryPicker.itemSelected(item);
      };

      var newDomEl = document.createElement('div');
      newDomEl.className = "cloud-images__item";
      newDomEl.onclick = funct;
      newDomEl.innerHTML = "\n\t\t\t\t\t\t  <div class=\"cloud-images__item__type\">\n\t\t\t\t\t\t\t\t".concat(itemIcon(), "\n\t\t\t\t\t\t  </div>\n\t\t\t\t\t\t  <div class=\"cloud-images__item__details\">\n\t\t\t\t\t\t\t\t<span class=\"cloud-images__item__details__name\">").concat(item.name, "</span>\n\t\t\t\t\t\t\t\t<span class=\"cloud-images__item__details__date\">").concat(item.crdate, "</span>\n\t\t\t\t\t\t  </div>\n\t\t\t\t\t\t  <div class=\"cloud-images__item__actions\">\n\t\t\t\t\t\t\t\t<a class=\"fa fa-pencil\"></a>\n\t\t\t\t\t\t  </div>");
      return newDomEl;
    };

    document.getElementById('bac--cloudinary-itams-container').innerHTML = '';

    for (var i = 0; i < items.length; i++) {
      document.getElementById('bac--cloudinary-itams-container').appendChild(oneItem(items[i]));
    }
  },
  render: function render() {
    if (metaData.asset) {
      Dom.removeClass(document.getElementById('bac--cloudinary--back-button-container'), 'hdn');
    } else {
      Dom.addClass(document.getElementById('bac--cloudinary--back-button-container'), 'hdn');
    }

    CloudinaryPicker.renderItems();

    if (metaData.total > limit) {
      Dom.removeClass(document.getElementById('bac--cloudinary-pagination-container'), 'hdn');
      CloudinaryPicker.renderPaginationButtons();
    } else {
      Dom.addClass(document.getElementById('bac--cloudinary-pagination-container'), 'hdn');
    }
  }
};
module.exports = CloudinaryPicker;
},{"./caller":14,"./dom":16,"./pagination-helper":19,"./store":21}],16:[function(require,module,exports){
"use strict";

var Dom = {
  hasClass: function hasClass(el, className) {
    if (el.classList) return el.classList.contains(className);else return new RegExp('(^| )' + className + '( |$)', 'gi').test(el.className);
  },
  removeClass: function removeClass(el, className) {
    if (el.classList) el.classList.remove(className);else el.className = el.className.replace(new RegExp('(^|\\b)' + className.split(' ').join('|') + '(\\b|$)', 'gi'), ' ');
  },
  addClass: function addClass(el, className) {
    if (el.classList) el.classList.add(className);else el.className += ' ' + className;
  },
  toggleClass: function toggleClass(el, className) {
    if (this.hasClass(el, className)) {
      this.removeClass(el, className);
    } else {
      this.addClass(el, className);
    }
  }
};
module.exports = Dom;
},{}],17:[function(require,module,exports){
"use strict";

var dom = require('./dom');

var defaultHideIn = 5000;
var lastIndex = 1;
var numOfInfoBlocks = 10;
var infoBlocks = [];
var InfoController = {
  renderInfoBlocks: function renderInfoBlocks() {
    var blocksTemplate = function blocksTemplate(index) {
      return "\n\t\t\t\t <div class=\"bac--puresdk-info-box--\" id=\"bac--puresdk-info-box--".concat(index, "\">\n\t\t\t\t \t<div class=\"bac--timer\" id=\"bac--timer").concat(index, "\"></div>\n\t\t\t\t\t <div class=\"bac--inner-info-box--\">\n\t\t\t\t\t \t\t<div class=\"bac--info-icon-- fa-success\"></div>\n\t\t\t\t\t \t\t<div class=\"bac--info-icon-- fa-warning\"></div>\n\t\t\t\t\t \t\t<div class=\"bac--info-icon-- fa-info-1\"></div>\n\t\t\t\t\t \t\t<div class=\"bac--info-icon-- fa-error\"></div>\n\t\t\t\t\t \t\t <div class=\"bac--info-main-text--\" id=\"bac--info-main-text--").concat(index, "\"></div>\n\t\t\t\t\t \t\t <div class=\"bac--info-close-button-- fa-close-1\" id=\"bac--info-close-button--").concat(index, "\"></div>\n\t\t\t\t\t</div>\n\t\t\t\t</div>\n\t\t  ");
    };

    var infoBlocksWrapper = document.getElementById('bac--info-blocks-wrapper--');
    var innerHtml = '';

    for (var i = 1; i < numOfInfoBlocks; i++) {
      innerHtml += blocksTemplate(i);
    }

    infoBlocksWrapper.innerHTML = innerHtml;
  },
  init: function init() {
    for (var i = 1; i < numOfInfoBlocks; i++) {
      (function x(i) {
        var closeFunction = function closeFunction() {
          dom.removeClass(document.getElementById('bac--puresdk-info-box--' + i), 'bac--active--');
          document.getElementById('bac--timer' + i).style.transition = '';
          dom.removeClass(document.getElementById('bac--timer' + i), 'bac--fullwidth');
          infoBlocks[i - 1].inUse = false;
          setTimeout(function () {
            if (infoBlocks[i - 1].closeTimeout) {
              clearTimeout(infoBlocks[i - 1].closeTimeout);
            }

            dom.removeClass(document.getElementById('bac--puresdk-info-box--' + i), 'bac--success');
            dom.removeClass(document.getElementById('bac--puresdk-info-box--' + i), 'bac--info');
            dom.removeClass(document.getElementById('bac--puresdk-info-box--' + i), 'bac--warning');
            dom.removeClass(document.getElementById('bac--puresdk-info-box--' + i), 'bac--error');
          }, 450);
        };

        var addText = function addText(text) {
          document.getElementById('bac--info-main-text--' + i).innerHTML = text;
        };

        var addTimeout = function addTimeout(timeoutMsecs) {
          document.getElementById('bac--timer' + i).style.transition = 'width ' + timeoutMsecs + 'ms';
          dom.addClass(document.getElementById('bac--timer' + i), 'bac--fullwidth');
          infoBlocks[i - 1].closeTimeout = setTimeout(function () {
            infoBlocks[i - 1].closeFunction();
          }, timeoutMsecs);
        };

        infoBlocks.push({
          id: i,
          inUse: false,
          element: document.getElementById('bac--puresdk-info-box--' + i),
          closeFunction: closeFunction,
          addText: addText,
          addTimeout: addTimeout,
          closeTimeout: false
        });

        document.getElementById('bac--info-close-button--' + i).onclick = function (e) {
          closeFunction(i);
        };
      })(i);
    }
  },

  /*
   type: one of:
  	- success
  	- info
  	- warning
  	- error
   text: the text to display
   options (optional): {
   		hideIn: milliseconds to hide it. -1 for not hiding it at all. Default is 5000
   }
   */
  showInfo: function showInfo(type, text, options) {
    for (var i = 0; i < numOfInfoBlocks; i++) {
      var infoBlock = infoBlocks[i];

      if (!infoBlock.inUse) {
        infoBlock.inUse = true;
        infoBlock.element.style.zIndex = lastIndex;
        infoBlock.addText(text);
        lastIndex += 1;
        var timeoutmSecs = defaultHideIn;
        var autoClose = true;

        if (options) {
          if (options.hideIn != null && options.hideIn != undefined && options.hideIn != -1) {
            timeoutmSecs = options.hideIn;
          } else if (options.hideIn === -1) {
            autoClose = false;
          }
        }

        if (autoClose) {
          infoBlock.addTimeout(timeoutmSecs);
        }

        dom.addClass(infoBlock.element, 'bac--' + type);
        dom.addClass(infoBlock.element, 'bac--active--');
        return;
      }
    }
  }
};
module.exports = InfoController;
},{"./dom":16}],18:[function(require,module,exports){
"use strict";

var Store = require('./store.js');

var Logger = {
  log: function log(what) {
    if (!Store.logsEnabled()) {
      return false;
    } else {
      Logger.log = console.log.bind(console);
      Logger.log(what);
    }
  },
  error: function error(err) {
    if (!Store.logsEnabled()) {
      return false;
    } else {
      Logger.error = console.error.bind(console);
      Logger.error(err);
    }
  }
};
module.exports = Logger;
},{"./store.js":21}],19:[function(require,module,exports){
"use strict";

var settings = {
  totalPageButtonsNumber: 8
};
var Paginator = {
  setSettings: function setSettings(setting) {
    for (var key in setting) {
      settings[key] = setting[key];
    }
  },
  getPagesRange: function getPagesRange(curpage, totalPagesOnResultSet) {
    var pageRange = [{
      pageno: curpage,
      runningpage: true
    }];
    var hasnextonright = true;
    var hasnextonleft = true;
    var i = 1;

    while (pageRange.length < settings.totalPageButtonsNumber && (hasnextonright || hasnextonleft)) {
      if (hasnextonleft) {
        if (curpage - i > 0) {
          pageRange.push({
            pageno: curpage - i,
            runningpage: false
          });
        } else {
          hasnextonleft = false;
        }
      }

      if (hasnextonright) {
        if (curpage + i - 1 < totalPagesOnResultSet) {
          pageRange.push({
            pageno: curpage + i,
            runningpage: false
          });
        } else {
          hasnextonright = false;
        }
      }

      i++;
    }

    var hasNext = curpage < totalPagesOnResultSet;
    var hasPrevious = curpage > 1;
    return {
      buttons: pageRange.sort(function (itemA, itemB) {
        return itemA.pageno - itemB.pageno;
      }),
      hasNext: hasNext,
      hasPrevious: hasPrevious
    };
  }
};
module.exports = Paginator;
},{}],20:[function(require,module,exports){
'use strict';

var Store = require('./store.js');

var Logger = require('./logger.js');

var availableListeners = {
  searchKeyUp: {
    info: 'Listener on keyUp of search input on top bar'
  },
  searchEnter: {
    info: 'Listener on enter key pressed on search input on top bar'
  },
  searchOnChange: {
    info: 'Listener on change of input value'
  }
};
var PubSub = {
  getAvailableListeners: function getAvailableListeners() {
    return availableListeners;
  },
  subscribe: function subscribe(eventt, funct) {
    if (eventt === "searchKeyUp") {
      var el = document.getElementById(Store.getSearchInputId());
      el.addEventListener('keyup', funct);
      return function () {
        el.removeEventListener('keyup', funct, false);
      };
    } else if (eventt === 'searchEnter') {
      var handlingFunct = function handlingFunct(e) {
        if (e.keyCode === 13) {
          funct(e);
        }
      };

      el.addEventListener('keydown', handlingFunct);
      return function () {
        el.removeEventListener('keydown', handlingFunct, false);
      };
    } else if (eventt === 'searchOnChange') {
      var el = document.getElementById(Store.getSearchInputId());
      el.addEventListener('change', funct);
      return function () {
        el.removeEventListener('keyup', funct, false);
      };
    } else {
      Logger.error('The event you tried to subscribe is not available by the library');
      Logger.log('The available events are: ', availableListeners);
      return function () {};
    }
  }
};
module.exports = PubSub;
},{"./logger.js":18,"./store.js":21}],21:[function(require,module,exports){
"use strict";

var state = {
  general: {
    fullWidth: false,
    displaySupport: false
  },
  userData: {},
  configuration: {
    sessionEndpoint: 'session',
    baseUrl: '/api/v1'
  },
  htmlTemplate: "",
  apps: null,
  versionNumber: '',
  dev: false,
  filePicker: {
    selectedFile: null
  },
  appInfo: null,
  sessionEndpointByUser: false
};

function assemble(literal, params) {
  return new Function(params, "return `" + literal + "`;");
}

var Store = {
  getState: function getState() {
    return Object.assign({}, state);
  },
  setWindowName: function setWindowName(wn) {
    state.general.windowName = wn;
  },
  setFullWidth: function setFullWidth(fw) {
    state.general.fullWidth = fw;
  },
  setDisplaySupport: function setDisplaySupport(display) {
    state.general.displaySupport = display;
  },
  setDev: function setDev(dev) {
    state.dev = dev;
  },
  setUrlVersionPrefix: function setUrlVersionPrefix(prefix) {
    state.configuration.baseUrl = prefix;
  },
  getDevUrlPart: function getDevUrlPart() {
    if (state.dev) {
      return "sandbox/";
    } else {
      return "";
    }
  },
  getFullBaseUrl: function getFullBaseUrl() {
    return state.configuration.rootUrl + state.configuration.baseUrl + Store.getDevUrlPart();
  },

  /*
   conf:
   - headerDivId
   - includeAppsMenu
   */
  setConfiguration: function setConfiguration(conf) {
    for (var key in conf) {
      state.configuration[key] = conf[key];
    }
  },
  setVersionNumber: function setVersionNumber(version) {
    state.versionNumber = version;
  },
  getVersionNumber: function getVersionNumber() {
    return state.versionNumber;
  },
  getAppsVisible: function getAppsVisible() {
    if (state.configuration.appsVisible === null || state.configuration.appsVisible === undefined) {
      return true;
    } else {
      return state.configuration.appsVisible;
    }
  },
  setAppsVisible: function setAppsVisible(appsVisible) {
    state.configuration.appsVisible = appsVisible;
  },
  setHTMLTemplate: function setHTMLTemplate(template) {
    state.htmlTemplate = template;
  },
  setApps: function setApps(apps) {
    state.apps = apps;
  },
  setAppInfo: function setAppInfo(appInfo) {
    state.appInfo = appInfo;
  },
  getAppInfo: function getAppInfo() {
    return state.appInfo;
  },
  getLoginUrl: function getLoginUrl() {
    return state.configuration.rootUrl + state.configuration.loginUrl; // + "?" + state.configuration.redirectUrlParam + "=" + window.location.href;
  },
  getAuthenticationEndpoint: function getAuthenticationEndpoint() {
    if (state.sessionEndpointByUser) {
      return Store.getFullBaseUrl() + state.configuration.sessionEndpoint;
    }

    return Store.getFullBaseUrl() + state.configuration.sessionEndpoint;
  },
  getSwitchAccountEndpoint: function getSwitchAccountEndpoint(accountId) {
    return Store.getFullBaseUrl() + 'accounts/switch/' + accountId;
  },
  getAppsEndpoint: function getAppsEndpoint() {
    return Store.getFullBaseUrl() + 'apps';
  },
  getCloudinaryEndpoint: function getCloudinaryEndpoint() {
    return Store.getFullBaseUrl() + 'assets';
  },
  logsEnabled: function logsEnabled() {
    return state.configuration.logs;
  },
  getSearchInputId: function getSearchInputId() {
    return state.configuration.searchInputId;
  },
  setHTMLContainer: function setHTMLContainer(id) {
    state.configuration.headerDivId = id;
  },
  getHTLMContainer: function getHTLMContainer() {
    if (state.configuration.headerDivId) {
      return state.configuration.headerDivId;
    } else {
      return "ppsdk-container";
    }
  },
  getHTML: function getHTML() {
    return state.htmlTemplate;
  },
  setSessionEndpoint: function setSessionEndpoint(sessionEndpoint) {
    if (sessionEndpoint.indexOf('/') === 0) {
      sessionEndpoint = sessionEndpoint.substring(1, sessionEndpoint.length - 1);
    }

    state.sessionEndpointByUser = true;
    state.configuration.sessionEndpoint = sessionEndpoint;
  },
  getWindowName: function getWindowName() {
    return state.general.windowName;
  },
  getFullWidth: function getFullWidth() {
    return state.general.fullWidth;
  },
  getDisplaySupport: function getDisplaySupport() {
    return state.general.displaySupport;
  },
  setUserData: function setUserData(userData) {
    state.userData = userData;
  },
  getUserData: function getUserData() {
    return state.userData;
  },
  setRootUrl: function setRootUrl(rootUrl) {
    state.configuration.rootUrl = rootUrl.replace(/\/?$/, '/');
    ;
  },
  getRootUrl: function getRootUrl() {
    return state.configuration.rootUrl;
  },
  getAvatarUploadUrl: function getAvatarUploadUrl() {
    return Store.getFullBaseUrl() + 'assets/upload';
  },
  getAvatarUpdateUrl: function getAvatarUpdateUrl() {
    return Store.getFullBaseUrl() + 'users/avatar';
  }
};
module.exports = Store;
},{}]},{},[10])
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uLy4uL25vZGVfbW9kdWxlcy9icm93c2VyLXBhY2svX3ByZWx1ZGUuanMiLCIuLi8uLi9ub2RlX21vZHVsZXMvYW1wbGl0dWRlLWpzL2FtcGxpdHVkZS51bWQuanMiLCIuLi8uLi9ub2RlX21vZHVsZXMvYXNhcC9icm93c2VyLXJhdy5qcyIsIi4uLy4uL25vZGVfbW9kdWxlcy9iYXNlNjQtanMvaW5kZXguanMiLCIuLi8uLi9ub2RlX21vZHVsZXMvYnVmZmVyL2luZGV4LmpzIiwiLi4vLi4vbm9kZV9tb2R1bGVzL2llZWU3NTQvaW5kZXguanMiLCIuLi8uLi9ub2RlX21vZHVsZXMvcHJvbWlzZS9saWIvY29yZS5qcyIsIi4uLy4uL25vZGVfbW9kdWxlcy9wcm9taXNlL2xpYi9lczYtZXh0ZW5zaW9ucy5qcyIsIi4uLy4uL25vZGVfbW9kdWxlcy9wcm9taXNlL2xpYi9yZWplY3Rpb24tdHJhY2tpbmcuanMiLCJQUEJBLmpzIiwiaW5kZXguanMiLCJtb2R1bGVzL2FjY291bnQtY29uc2lzdGVuY3ktZ3VhcmQuanMiLCJtb2R1bGVzL2FtcGxpdHVkZS5qcyIsIm1vZHVsZXMvYXZhdGFyLWNvbnRyb2xsZXIuanMiLCJtb2R1bGVzL2NhbGxlci5qcyIsIm1vZHVsZXMvY2xvdWRpbmFyeS1pbWFnZS1waWNrZXIuanMiLCJtb2R1bGVzL2RvbS5qcyIsIm1vZHVsZXMvaW5mby1jb250cm9sbGVyLmpzIiwibW9kdWxlcy9sb2dnZXIuanMiLCJtb2R1bGVzL3BhZ2luYXRpb24taGVscGVyLmpzIiwibW9kdWxlcy9wdWJzdWIuanMiLCJtb2R1bGVzL3N0b3JlLmpzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOztBQ0FBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7Ozs7O0FDemdMQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOzs7O0FDL05BO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7O0FDeEpBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7OztBQ3Z3REE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDcEZBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3JOQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDM0dBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDaEhBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNuYUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDMUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDdEJBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3JCQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUM5SEE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUN2R0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDL1BBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNwQkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDbEhBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDdEJBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3pEQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3BEQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0EiLCJmaWxlIjoiZ2VuZXJhdGVkLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXNDb250ZW50IjpbIihmdW5jdGlvbigpe2Z1bmN0aW9uIHIoZSxuLHQpe2Z1bmN0aW9uIG8oaSxmKXtpZighbltpXSl7aWYoIWVbaV0pe3ZhciBjPVwiZnVuY3Rpb25cIj09dHlwZW9mIHJlcXVpcmUmJnJlcXVpcmU7aWYoIWYmJmMpcmV0dXJuIGMoaSwhMCk7aWYodSlyZXR1cm4gdShpLCEwKTt2YXIgYT1uZXcgRXJyb3IoXCJDYW5ub3QgZmluZCBtb2R1bGUgJ1wiK2krXCInXCIpO3Rocm93IGEuY29kZT1cIk1PRFVMRV9OT1RfRk9VTkRcIixhfXZhciBwPW5baV09e2V4cG9ydHM6e319O2VbaV1bMF0uY2FsbChwLmV4cG9ydHMsZnVuY3Rpb24ocil7dmFyIG49ZVtpXVsxXVtyXTtyZXR1cm4gbyhufHxyKX0scCxwLmV4cG9ydHMscixlLG4sdCl9cmV0dXJuIG5baV0uZXhwb3J0c31mb3IodmFyIHU9XCJmdW5jdGlvblwiPT10eXBlb2YgcmVxdWlyZSYmcmVxdWlyZSxpPTA7aTx0Lmxlbmd0aDtpKyspbyh0W2ldKTtyZXR1cm4gb31yZXR1cm4gcn0pKCkiLCIoZnVuY3Rpb24gKGdsb2JhbCwgZmFjdG9yeSkge1xuICB0eXBlb2YgZXhwb3J0cyA9PT0gJ29iamVjdCcgJiYgdHlwZW9mIG1vZHVsZSAhPT0gJ3VuZGVmaW5lZCcgPyBtb2R1bGUuZXhwb3J0cyA9IGZhY3RvcnkoKSA6XG4gIHR5cGVvZiBkZWZpbmUgPT09ICdmdW5jdGlvbicgJiYgZGVmaW5lLmFtZCA/IGRlZmluZSgnYW1wbGl0dWRlJywgZmFjdG9yeSkgOlxuICAoZ2xvYmFsID0gZ2xvYmFsIHx8IHNlbGYsIGdsb2JhbC5hbXBsaXR1ZGUgPSBmYWN0b3J5KCkpO1xufSh0aGlzLCBmdW5jdGlvbiAoKSB7ICd1c2Ugc3RyaWN0JztcblxuICBmdW5jdGlvbiBfdHlwZW9mKG9iaikge1xuICAgIGlmICh0eXBlb2YgU3ltYm9sID09PSBcImZ1bmN0aW9uXCIgJiYgdHlwZW9mIFN5bWJvbC5pdGVyYXRvciA9PT0gXCJzeW1ib2xcIikge1xuICAgICAgX3R5cGVvZiA9IGZ1bmN0aW9uIChvYmopIHtcbiAgICAgICAgcmV0dXJuIHR5cGVvZiBvYmo7XG4gICAgICB9O1xuICAgIH0gZWxzZSB7XG4gICAgICBfdHlwZW9mID0gZnVuY3Rpb24gKG9iaikge1xuICAgICAgICByZXR1cm4gb2JqICYmIHR5cGVvZiBTeW1ib2wgPT09IFwiZnVuY3Rpb25cIiAmJiBvYmouY29uc3RydWN0b3IgPT09IFN5bWJvbCAmJiBvYmogIT09IFN5bWJvbC5wcm90b3R5cGUgPyBcInN5bWJvbFwiIDogdHlwZW9mIG9iajtcbiAgICAgIH07XG4gICAgfVxuXG4gICAgcmV0dXJuIF90eXBlb2Yob2JqKTtcbiAgfVxuXG4gIGZ1bmN0aW9uIF9jbGFzc0NhbGxDaGVjayhpbnN0YW5jZSwgQ29uc3RydWN0b3IpIHtcbiAgICBpZiAoIShpbnN0YW5jZSBpbnN0YW5jZW9mIENvbnN0cnVjdG9yKSkge1xuICAgICAgdGhyb3cgbmV3IFR5cGVFcnJvcihcIkNhbm5vdCBjYWxsIGEgY2xhc3MgYXMgYSBmdW5jdGlvblwiKTtcbiAgICB9XG4gIH1cblxuICBmdW5jdGlvbiBfZGVmaW5lUHJvcGVydGllcyh0YXJnZXQsIHByb3BzKSB7XG4gICAgZm9yICh2YXIgaSA9IDA7IGkgPCBwcm9wcy5sZW5ndGg7IGkrKykge1xuICAgICAgdmFyIGRlc2NyaXB0b3IgPSBwcm9wc1tpXTtcbiAgICAgIGRlc2NyaXB0b3IuZW51bWVyYWJsZSA9IGRlc2NyaXB0b3IuZW51bWVyYWJsZSB8fCBmYWxzZTtcbiAgICAgIGRlc2NyaXB0b3IuY29uZmlndXJhYmxlID0gdHJ1ZTtcbiAgICAgIGlmIChcInZhbHVlXCIgaW4gZGVzY3JpcHRvcikgZGVzY3JpcHRvci53cml0YWJsZSA9IHRydWU7XG4gICAgICBPYmplY3QuZGVmaW5lUHJvcGVydHkodGFyZ2V0LCBkZXNjcmlwdG9yLmtleSwgZGVzY3JpcHRvcik7XG4gICAgfVxuICB9XG5cbiAgZnVuY3Rpb24gX2NyZWF0ZUNsYXNzKENvbnN0cnVjdG9yLCBwcm90b1Byb3BzLCBzdGF0aWNQcm9wcykge1xuICAgIGlmIChwcm90b1Byb3BzKSBfZGVmaW5lUHJvcGVydGllcyhDb25zdHJ1Y3Rvci5wcm90b3R5cGUsIHByb3RvUHJvcHMpO1xuICAgIGlmIChzdGF0aWNQcm9wcykgX2RlZmluZVByb3BlcnRpZXMoQ29uc3RydWN0b3IsIHN0YXRpY1Byb3BzKTtcbiAgICByZXR1cm4gQ29uc3RydWN0b3I7XG4gIH1cblxuICBmdW5jdGlvbiBfZGVmaW5lUHJvcGVydHkob2JqLCBrZXksIHZhbHVlKSB7XG4gICAgaWYgKGtleSBpbiBvYmopIHtcbiAgICAgIE9iamVjdC5kZWZpbmVQcm9wZXJ0eShvYmosIGtleSwge1xuICAgICAgICB2YWx1ZTogdmFsdWUsXG4gICAgICAgIGVudW1lcmFibGU6IHRydWUsXG4gICAgICAgIGNvbmZpZ3VyYWJsZTogdHJ1ZSxcbiAgICAgICAgd3JpdGFibGU6IHRydWVcbiAgICAgIH0pO1xuICAgIH0gZWxzZSB7XG4gICAgICBvYmpba2V5XSA9IHZhbHVlO1xuICAgIH1cblxuICAgIHJldHVybiBvYmo7XG4gIH1cblxuICBmdW5jdGlvbiBfb2JqZWN0U3ByZWFkKHRhcmdldCkge1xuICAgIGZvciAodmFyIGkgPSAxOyBpIDwgYXJndW1lbnRzLmxlbmd0aDsgaSsrKSB7XG4gICAgICB2YXIgc291cmNlID0gYXJndW1lbnRzW2ldICE9IG51bGwgPyBhcmd1bWVudHNbaV0gOiB7fTtcbiAgICAgIHZhciBvd25LZXlzID0gT2JqZWN0LmtleXMoc291cmNlKTtcblxuICAgICAgaWYgKHR5cGVvZiBPYmplY3QuZ2V0T3duUHJvcGVydHlTeW1ib2xzID09PSAnZnVuY3Rpb24nKSB7XG4gICAgICAgIG93bktleXMgPSBvd25LZXlzLmNvbmNhdChPYmplY3QuZ2V0T3duUHJvcGVydHlTeW1ib2xzKHNvdXJjZSkuZmlsdGVyKGZ1bmN0aW9uIChzeW0pIHtcbiAgICAgICAgICByZXR1cm4gT2JqZWN0LmdldE93blByb3BlcnR5RGVzY3JpcHRvcihzb3VyY2UsIHN5bSkuZW51bWVyYWJsZTtcbiAgICAgICAgfSkpO1xuICAgICAgfVxuXG4gICAgICBvd25LZXlzLmZvckVhY2goZnVuY3Rpb24gKGtleSkge1xuICAgICAgICBfZGVmaW5lUHJvcGVydHkodGFyZ2V0LCBrZXksIHNvdXJjZVtrZXldKTtcbiAgICAgIH0pO1xuICAgIH1cblxuICAgIHJldHVybiB0YXJnZXQ7XG4gIH1cblxuICB2YXIgQ29uc3RhbnRzID0ge1xuICAgIERFRkFVTFRfSU5TVEFOQ0U6ICckZGVmYXVsdF9pbnN0YW5jZScsXG4gICAgQVBJX1ZFUlNJT046IDIsXG4gICAgTUFYX1NUUklOR19MRU5HVEg6IDQwOTYsXG4gICAgTUFYX1BST1BFUlRZX0tFWVM6IDEwMDAsXG4gICAgSURFTlRJRllfRVZFTlQ6ICckaWRlbnRpZnknLFxuICAgIEdST1VQX0lERU5USUZZX0VWRU5UOiAnJGdyb3VwaWRlbnRpZnknLFxuICAgIC8vIGxvY2FsU3RvcmFnZUtleXNcbiAgICBMQVNUX0VWRU5UX0lEOiAnYW1wbGl0dWRlX2xhc3RFdmVudElkJyxcbiAgICBMQVNUX0VWRU5UX1RJTUU6ICdhbXBsaXR1ZGVfbGFzdEV2ZW50VGltZScsXG4gICAgTEFTVF9JREVOVElGWV9JRDogJ2FtcGxpdHVkZV9sYXN0SWRlbnRpZnlJZCcsXG4gICAgTEFTVF9TRVFVRU5DRV9OVU1CRVI6ICdhbXBsaXR1ZGVfbGFzdFNlcXVlbmNlTnVtYmVyJyxcbiAgICBTRVNTSU9OX0lEOiAnYW1wbGl0dWRlX3Nlc3Npb25JZCcsXG4gICAgLy8gVXNlZCBpbiBjb29raWUgYXMgd2VsbFxuICAgIERFVklDRV9JRDogJ2FtcGxpdHVkZV9kZXZpY2VJZCcsXG4gICAgT1BUX09VVDogJ2FtcGxpdHVkZV9vcHRPdXQnLFxuICAgIFVTRVJfSUQ6ICdhbXBsaXR1ZGVfdXNlcklkJyxcbiAgICBDT09LSUVfVEVTVDogJ2FtcGxpdHVkZV9jb29raWVfdGVzdCcsXG4gICAgQ09PS0lFX1BSRUZJWDogXCJhbXBcIixcbiAgICAvLyByZXZlbnVlIGtleXNcbiAgICBSRVZFTlVFX0VWRU5UOiAncmV2ZW51ZV9hbW91bnQnLFxuICAgIFJFVkVOVUVfUFJPRFVDVF9JRDogJyRwcm9kdWN0SWQnLFxuICAgIFJFVkVOVUVfUVVBTlRJVFk6ICckcXVhbnRpdHknLFxuICAgIFJFVkVOVUVfUFJJQ0U6ICckcHJpY2UnLFxuICAgIFJFVkVOVUVfUkVWRU5VRV9UWVBFOiAnJHJldmVudWVUeXBlJyxcbiAgICBBTVBfREVWSUNFX0lEX1BBUkFNOiAnYW1wX2RldmljZV9pZCcsXG4gICAgLy8gdXJsIHBhcmFtXG4gICAgUkVGRVJSRVI6ICdyZWZlcnJlcicsXG4gICAgLy8gVVRNIFBhcmFtc1xuICAgIFVUTV9TT1VSQ0U6ICd1dG1fc291cmNlJyxcbiAgICBVVE1fTUVESVVNOiAndXRtX21lZGl1bScsXG4gICAgVVRNX0NBTVBBSUdOOiAndXRtX2NhbXBhaWduJyxcbiAgICBVVE1fVEVSTTogJ3V0bV90ZXJtJyxcbiAgICBVVE1fQ09OVEVOVDogJ3V0bV9jb250ZW50J1xuICB9O1xuXG4gIC8qIGpzaGludCBiaXR3aXNlOiBmYWxzZSAqL1xuXG4gIC8qXG4gICAqIFVURi04IGVuY29kZXIvZGVjb2RlclxuICAgKiBodHRwOi8vd3d3LndlYnRvb2xraXQuaW5mby9cbiAgICovXG4gIHZhciBVVEY4ID0ge1xuICAgIGVuY29kZTogZnVuY3Rpb24gZW5jb2RlKHMpIHtcbiAgICAgIHZhciB1dGZ0ZXh0ID0gJyc7XG5cbiAgICAgIGZvciAodmFyIG4gPSAwOyBuIDwgcy5sZW5ndGg7IG4rKykge1xuICAgICAgICB2YXIgYyA9IHMuY2hhckNvZGVBdChuKTtcblxuICAgICAgICBpZiAoYyA8IDEyOCkge1xuICAgICAgICAgIHV0ZnRleHQgKz0gU3RyaW5nLmZyb21DaGFyQ29kZShjKTtcbiAgICAgICAgfSBlbHNlIGlmIChjID4gMTI3ICYmIGMgPCAyMDQ4KSB7XG4gICAgICAgICAgdXRmdGV4dCArPSBTdHJpbmcuZnJvbUNoYXJDb2RlKGMgPj4gNiB8IDE5Mik7XG4gICAgICAgICAgdXRmdGV4dCArPSBTdHJpbmcuZnJvbUNoYXJDb2RlKGMgJiA2MyB8IDEyOCk7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgdXRmdGV4dCArPSBTdHJpbmcuZnJvbUNoYXJDb2RlKGMgPj4gMTIgfCAyMjQpO1xuICAgICAgICAgIHV0ZnRleHQgKz0gU3RyaW5nLmZyb21DaGFyQ29kZShjID4+IDYgJiA2MyB8IDEyOCk7XG4gICAgICAgICAgdXRmdGV4dCArPSBTdHJpbmcuZnJvbUNoYXJDb2RlKGMgJiA2MyB8IDEyOCk7XG4gICAgICAgIH1cbiAgICAgIH1cblxuICAgICAgcmV0dXJuIHV0ZnRleHQ7XG4gICAgfSxcbiAgICBkZWNvZGU6IGZ1bmN0aW9uIGRlY29kZSh1dGZ0ZXh0KSB7XG4gICAgICB2YXIgcyA9ICcnO1xuICAgICAgdmFyIGkgPSAwO1xuICAgICAgdmFyIGMgPSAwLFxuICAgICAgICAgIGMxID0gMCxcbiAgICAgICAgICBjMiA9IDA7XG5cbiAgICAgIHdoaWxlIChpIDwgdXRmdGV4dC5sZW5ndGgpIHtcbiAgICAgICAgYyA9IHV0ZnRleHQuY2hhckNvZGVBdChpKTtcblxuICAgICAgICBpZiAoYyA8IDEyOCkge1xuICAgICAgICAgIHMgKz0gU3RyaW5nLmZyb21DaGFyQ29kZShjKTtcbiAgICAgICAgICBpKys7XG4gICAgICAgIH0gZWxzZSBpZiAoYyA+IDE5MSAmJiBjIDwgMjI0KSB7XG4gICAgICAgICAgYzEgPSB1dGZ0ZXh0LmNoYXJDb2RlQXQoaSArIDEpO1xuICAgICAgICAgIHMgKz0gU3RyaW5nLmZyb21DaGFyQ29kZSgoYyAmIDMxKSA8PCA2IHwgYzEgJiA2Myk7XG4gICAgICAgICAgaSArPSAyO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgIGMxID0gdXRmdGV4dC5jaGFyQ29kZUF0KGkgKyAxKTtcbiAgICAgICAgICBjMiA9IHV0ZnRleHQuY2hhckNvZGVBdChpICsgMik7XG4gICAgICAgICAgcyArPSBTdHJpbmcuZnJvbUNoYXJDb2RlKChjICYgMTUpIDw8IDEyIHwgKGMxICYgNjMpIDw8IDYgfCBjMiAmIDYzKTtcbiAgICAgICAgICBpICs9IDM7XG4gICAgICAgIH1cbiAgICAgIH1cblxuICAgICAgcmV0dXJuIHM7XG4gICAgfVxuICB9O1xuXG4gIC8qIGpzaGludCBiaXR3aXNlOiBmYWxzZSAqL1xuICAvKlxuICAgKiBCYXNlNjQgZW5jb2Rlci9kZWNvZGVyXG4gICAqIGh0dHA6Ly93d3cud2VidG9vbGtpdC5pbmZvL1xuICAgKi9cblxuICB2YXIgQmFzZTY0ID0ge1xuICAgIF9rZXlTdHI6ICdBQkNERUZHSElKS0xNTk9QUVJTVFVWV1hZWmFiY2RlZmdoaWprbG1ub3BxcnN0dXZ3eHl6MDEyMzQ1Njc4OSsvPScsXG4gICAgZW5jb2RlOiBmdW5jdGlvbiBlbmNvZGUoaW5wdXQpIHtcbiAgICAgIHRyeSB7XG4gICAgICAgIGlmICh3aW5kb3cuYnRvYSAmJiB3aW5kb3cuYXRvYikge1xuICAgICAgICAgIHJldHVybiB3aW5kb3cuYnRvYSh1bmVzY2FwZShlbmNvZGVVUklDb21wb25lbnQoaW5wdXQpKSk7XG4gICAgICAgIH1cbiAgICAgIH0gY2F0Y2ggKGUpIHsvL2xvZyhlKTtcbiAgICAgIH1cblxuICAgICAgcmV0dXJuIEJhc2U2NC5fZW5jb2RlKGlucHV0KTtcbiAgICB9LFxuICAgIF9lbmNvZGU6IGZ1bmN0aW9uIF9lbmNvZGUoaW5wdXQpIHtcbiAgICAgIHZhciBvdXRwdXQgPSAnJztcbiAgICAgIHZhciBjaHIxLCBjaHIyLCBjaHIzLCBlbmMxLCBlbmMyLCBlbmMzLCBlbmM0O1xuICAgICAgdmFyIGkgPSAwO1xuICAgICAgaW5wdXQgPSBVVEY4LmVuY29kZShpbnB1dCk7XG5cbiAgICAgIHdoaWxlIChpIDwgaW5wdXQubGVuZ3RoKSB7XG4gICAgICAgIGNocjEgPSBpbnB1dC5jaGFyQ29kZUF0KGkrKyk7XG4gICAgICAgIGNocjIgPSBpbnB1dC5jaGFyQ29kZUF0KGkrKyk7XG4gICAgICAgIGNocjMgPSBpbnB1dC5jaGFyQ29kZUF0KGkrKyk7XG4gICAgICAgIGVuYzEgPSBjaHIxID4+IDI7XG4gICAgICAgIGVuYzIgPSAoY2hyMSAmIDMpIDw8IDQgfCBjaHIyID4+IDQ7XG4gICAgICAgIGVuYzMgPSAoY2hyMiAmIDE1KSA8PCAyIHwgY2hyMyA+PiA2O1xuICAgICAgICBlbmM0ID0gY2hyMyAmIDYzO1xuXG4gICAgICAgIGlmIChpc05hTihjaHIyKSkge1xuICAgICAgICAgIGVuYzMgPSBlbmM0ID0gNjQ7XG4gICAgICAgIH0gZWxzZSBpZiAoaXNOYU4oY2hyMykpIHtcbiAgICAgICAgICBlbmM0ID0gNjQ7XG4gICAgICAgIH1cblxuICAgICAgICBvdXRwdXQgPSBvdXRwdXQgKyBCYXNlNjQuX2tleVN0ci5jaGFyQXQoZW5jMSkgKyBCYXNlNjQuX2tleVN0ci5jaGFyQXQoZW5jMikgKyBCYXNlNjQuX2tleVN0ci5jaGFyQXQoZW5jMykgKyBCYXNlNjQuX2tleVN0ci5jaGFyQXQoZW5jNCk7XG4gICAgICB9XG5cbiAgICAgIHJldHVybiBvdXRwdXQ7XG4gICAgfSxcbiAgICBkZWNvZGU6IGZ1bmN0aW9uIGRlY29kZShpbnB1dCkge1xuICAgICAgdHJ5IHtcbiAgICAgICAgaWYgKHdpbmRvdy5idG9hICYmIHdpbmRvdy5hdG9iKSB7XG4gICAgICAgICAgcmV0dXJuIGRlY29kZVVSSUNvbXBvbmVudChlc2NhcGUod2luZG93LmF0b2IoaW5wdXQpKSk7XG4gICAgICAgIH1cbiAgICAgIH0gY2F0Y2ggKGUpIHsvL2xvZyhlKTtcbiAgICAgIH1cblxuICAgICAgcmV0dXJuIEJhc2U2NC5fZGVjb2RlKGlucHV0KTtcbiAgICB9LFxuICAgIF9kZWNvZGU6IGZ1bmN0aW9uIF9kZWNvZGUoaW5wdXQpIHtcbiAgICAgIHZhciBvdXRwdXQgPSAnJztcbiAgICAgIHZhciBjaHIxLCBjaHIyLCBjaHIzO1xuICAgICAgdmFyIGVuYzEsIGVuYzIsIGVuYzMsIGVuYzQ7XG4gICAgICB2YXIgaSA9IDA7XG4gICAgICBpbnB1dCA9IGlucHV0LnJlcGxhY2UoL1teQS1aYS16MC05XFwrXFwvXFw9XS9nLCAnJyk7XG5cbiAgICAgIHdoaWxlIChpIDwgaW5wdXQubGVuZ3RoKSB7XG4gICAgICAgIGVuYzEgPSBCYXNlNjQuX2tleVN0ci5pbmRleE9mKGlucHV0LmNoYXJBdChpKyspKTtcbiAgICAgICAgZW5jMiA9IEJhc2U2NC5fa2V5U3RyLmluZGV4T2YoaW5wdXQuY2hhckF0KGkrKykpO1xuICAgICAgICBlbmMzID0gQmFzZTY0Ll9rZXlTdHIuaW5kZXhPZihpbnB1dC5jaGFyQXQoaSsrKSk7XG4gICAgICAgIGVuYzQgPSBCYXNlNjQuX2tleVN0ci5pbmRleE9mKGlucHV0LmNoYXJBdChpKyspKTtcbiAgICAgICAgY2hyMSA9IGVuYzEgPDwgMiB8IGVuYzIgPj4gNDtcbiAgICAgICAgY2hyMiA9IChlbmMyICYgMTUpIDw8IDQgfCBlbmMzID4+IDI7XG4gICAgICAgIGNocjMgPSAoZW5jMyAmIDMpIDw8IDYgfCBlbmM0O1xuICAgICAgICBvdXRwdXQgPSBvdXRwdXQgKyBTdHJpbmcuZnJvbUNoYXJDb2RlKGNocjEpO1xuXG4gICAgICAgIGlmIChlbmMzICE9PSA2NCkge1xuICAgICAgICAgIG91dHB1dCA9IG91dHB1dCArIFN0cmluZy5mcm9tQ2hhckNvZGUoY2hyMik7XG4gICAgICAgIH1cblxuICAgICAgICBpZiAoZW5jNCAhPT0gNjQpIHtcbiAgICAgICAgICBvdXRwdXQgPSBvdXRwdXQgKyBTdHJpbmcuZnJvbUNoYXJDb2RlKGNocjMpO1xuICAgICAgICB9XG4gICAgICB9XG5cbiAgICAgIG91dHB1dCA9IFVURjguZGVjb2RlKG91dHB1dCk7XG4gICAgICByZXR1cm4gb3V0cHV0O1xuICAgIH1cbiAgfTtcblxuICAvKipcbiAgICogdG9TdHJpbmcgcmVmLlxuICAgKiBAcHJpdmF0ZVxuICAgKi9cbiAgdmFyIHRvU3RyaW5nID0gT2JqZWN0LnByb3RvdHlwZS50b1N0cmluZztcbiAgLyoqXG4gICAqIFJldHVybiB0aGUgdHlwZSBvZiBgdmFsYC5cbiAgICogQHByaXZhdGVcbiAgICogQHBhcmFtIHtNaXhlZH0gdmFsXG4gICAqIEByZXR1cm4ge1N0cmluZ31cbiAgICogQGFwaSBwdWJsaWNcbiAgICovXG5cbiAgZnVuY3Rpb24gdHlwZSAodmFsKSB7XG4gICAgc3dpdGNoICh0b1N0cmluZy5jYWxsKHZhbCkpIHtcbiAgICAgIGNhc2UgJ1tvYmplY3QgRGF0ZV0nOlxuICAgICAgICByZXR1cm4gJ2RhdGUnO1xuXG4gICAgICBjYXNlICdbb2JqZWN0IFJlZ0V4cF0nOlxuICAgICAgICByZXR1cm4gJ3JlZ2V4cCc7XG5cbiAgICAgIGNhc2UgJ1tvYmplY3QgQXJndW1lbnRzXSc6XG4gICAgICAgIHJldHVybiAnYXJndW1lbnRzJztcblxuICAgICAgY2FzZSAnW29iamVjdCBBcnJheV0nOlxuICAgICAgICByZXR1cm4gJ2FycmF5JztcblxuICAgICAgY2FzZSAnW29iamVjdCBFcnJvcl0nOlxuICAgICAgICByZXR1cm4gJ2Vycm9yJztcbiAgICB9XG5cbiAgICBpZiAodmFsID09PSBudWxsKSB7XG4gICAgICByZXR1cm4gJ251bGwnO1xuICAgIH1cblxuICAgIGlmICh2YWwgPT09IHVuZGVmaW5lZCkge1xuICAgICAgcmV0dXJuICd1bmRlZmluZWQnO1xuICAgIH1cblxuICAgIGlmICh2YWwgIT09IHZhbCkge1xuICAgICAgcmV0dXJuICduYW4nO1xuICAgIH1cblxuICAgIGlmICh2YWwgJiYgdmFsLm5vZGVUeXBlID09PSAxKSB7XG4gICAgICByZXR1cm4gJ2VsZW1lbnQnO1xuICAgIH1cblxuICAgIGlmICh0eXBlb2YgQnVmZmVyICE9PSAndW5kZWZpbmVkJyAmJiB0eXBlb2YgQnVmZmVyLmlzQnVmZmVyID09PSAnZnVuY3Rpb24nICYmIEJ1ZmZlci5pc0J1ZmZlcih2YWwpKSB7XG4gICAgICByZXR1cm4gJ2J1ZmZlcic7XG4gICAgfVxuXG4gICAgdmFsID0gdmFsLnZhbHVlT2YgPyB2YWwudmFsdWVPZigpIDogT2JqZWN0LnByb3RvdHlwZS52YWx1ZU9mLmFwcGx5KHZhbCk7XG4gICAgcmV0dXJuIF90eXBlb2YodmFsKTtcbiAgfVxuXG4gIHZhciBsb2dMZXZlbHMgPSB7XG4gICAgRElTQUJMRTogMCxcbiAgICBFUlJPUjogMSxcbiAgICBXQVJOOiAyLFxuICAgIElORk86IDNcbiAgfTtcbiAgdmFyIGxvZ0xldmVsID0gbG9nTGV2ZWxzLldBUk47XG5cbiAgdmFyIHNldExvZ0xldmVsID0gZnVuY3Rpb24gc2V0TG9nTGV2ZWwobG9nTGV2ZWxOYW1lKSB7XG4gICAgaWYgKGxvZ0xldmVscy5oYXNPd25Qcm9wZXJ0eShsb2dMZXZlbE5hbWUpKSB7XG4gICAgICBsb2dMZXZlbCA9IGxvZ0xldmVsc1tsb2dMZXZlbE5hbWVdO1xuICAgIH1cbiAgfTtcblxuICB2YXIgZ2V0TG9nTGV2ZWwgPSBmdW5jdGlvbiBnZXRMb2dMZXZlbCgpIHtcbiAgICByZXR1cm4gbG9nTGV2ZWw7XG4gIH07XG5cbiAgdmFyIGxvZyA9IHtcbiAgICBlcnJvcjogZnVuY3Rpb24gZXJyb3Iocykge1xuICAgICAgaWYgKGxvZ0xldmVsID49IGxvZ0xldmVscy5FUlJPUikge1xuICAgICAgICBfbG9nKHMpO1xuICAgICAgfVxuICAgIH0sXG4gICAgd2FybjogZnVuY3Rpb24gd2FybihzKSB7XG4gICAgICBpZiAobG9nTGV2ZWwgPj0gbG9nTGV2ZWxzLldBUk4pIHtcbiAgICAgICAgX2xvZyhzKTtcbiAgICAgIH1cbiAgICB9LFxuICAgIGluZm86IGZ1bmN0aW9uIGluZm8ocykge1xuICAgICAgaWYgKGxvZ0xldmVsID49IGxvZ0xldmVscy5JTkZPKSB7XG4gICAgICAgIF9sb2cocyk7XG4gICAgICB9XG4gICAgfVxuICB9O1xuXG4gIHZhciBfbG9nID0gZnVuY3Rpb24gX2xvZyhzKSB7XG4gICAgdHJ5IHtcbiAgICAgIGNvbnNvbGUubG9nKCdbQW1wbGl0dWRlXSAnICsgcyk7XG4gICAgfSBjYXRjaCAoZSkgey8vIGNvbnNvbGUgbG9nZ2luZyBub3QgYXZhaWxhYmxlXG4gICAgfVxuICB9O1xuXG4gIHZhciBpc0VtcHR5U3RyaW5nID0gZnVuY3Rpb24gaXNFbXB0eVN0cmluZyhzdHIpIHtcbiAgICByZXR1cm4gIXN0ciB8fCBzdHIubGVuZ3RoID09PSAwO1xuICB9O1xuXG4gIHZhciBzZXNzaW9uU3RvcmFnZUVuYWJsZWQgPSBmdW5jdGlvbiBzZXNzaW9uU3RvcmFnZUVuYWJsZWQoKSB7XG4gICAgdHJ5IHtcbiAgICAgIGlmICh3aW5kb3cuc2Vzc2lvblN0b3JhZ2UpIHtcbiAgICAgICAgcmV0dXJuIHRydWU7XG4gICAgICB9XG4gICAgfSBjYXRjaCAoZSkge30gLy8gc2Vzc2lvblN0b3JhZ2UgZGlzYWJsZWRcblxuXG4gICAgcmV0dXJuIGZhbHNlO1xuICB9OyAvLyB0cnVuY2F0ZSBzdHJpbmcgdmFsdWVzIGluIGV2ZW50IGFuZCB1c2VyIHByb3BlcnRpZXMgc28gdGhhdCByZXF1ZXN0IHNpemUgZG9lcyBub3QgZ2V0IHRvbyBsYXJnZVxuXG5cbiAgdmFyIHRydW5jYXRlID0gZnVuY3Rpb24gdHJ1bmNhdGUodmFsdWUpIHtcbiAgICBpZiAodHlwZSh2YWx1ZSkgPT09ICdhcnJheScpIHtcbiAgICAgIGZvciAodmFyIGkgPSAwOyBpIDwgdmFsdWUubGVuZ3RoOyBpKyspIHtcbiAgICAgICAgdmFsdWVbaV0gPSB0cnVuY2F0ZSh2YWx1ZVtpXSk7XG4gICAgICB9XG4gICAgfSBlbHNlIGlmICh0eXBlKHZhbHVlKSA9PT0gJ29iamVjdCcpIHtcbiAgICAgIGZvciAodmFyIGtleSBpbiB2YWx1ZSkge1xuICAgICAgICBpZiAodmFsdWUuaGFzT3duUHJvcGVydHkoa2V5KSkge1xuICAgICAgICAgIHZhbHVlW2tleV0gPSB0cnVuY2F0ZSh2YWx1ZVtrZXldKTtcbiAgICAgICAgfVxuICAgICAgfVxuICAgIH0gZWxzZSB7XG4gICAgICB2YWx1ZSA9IF90cnVuY2F0ZVZhbHVlKHZhbHVlKTtcbiAgICB9XG5cbiAgICByZXR1cm4gdmFsdWU7XG4gIH07XG5cbiAgdmFyIF90cnVuY2F0ZVZhbHVlID0gZnVuY3Rpb24gX3RydW5jYXRlVmFsdWUodmFsdWUpIHtcbiAgICBpZiAodHlwZSh2YWx1ZSkgPT09ICdzdHJpbmcnKSB7XG4gICAgICByZXR1cm4gdmFsdWUubGVuZ3RoID4gQ29uc3RhbnRzLk1BWF9TVFJJTkdfTEVOR1RIID8gdmFsdWUuc3Vic3RyaW5nKDAsIENvbnN0YW50cy5NQVhfU1RSSU5HX0xFTkdUSCkgOiB2YWx1ZTtcbiAgICB9XG5cbiAgICByZXR1cm4gdmFsdWU7XG4gIH07XG5cbiAgdmFyIHZhbGlkYXRlSW5wdXQgPSBmdW5jdGlvbiB2YWxpZGF0ZUlucHV0KGlucHV0LCBuYW1lLCBleHBlY3RlZFR5cGUpIHtcbiAgICBpZiAodHlwZShpbnB1dCkgIT09IGV4cGVjdGVkVHlwZSkge1xuICAgICAgbG9nLmVycm9yKCdJbnZhbGlkICcgKyBuYW1lICsgJyBpbnB1dCB0eXBlLiBFeHBlY3RlZCAnICsgZXhwZWN0ZWRUeXBlICsgJyBidXQgcmVjZWl2ZWQgJyArIHR5cGUoaW5wdXQpKTtcbiAgICAgIHJldHVybiBmYWxzZTtcbiAgICB9XG5cbiAgICByZXR1cm4gdHJ1ZTtcbiAgfTsgLy8gZG8gc29tZSBiYXNpYyBzYW5pdGl6YXRpb24gYW5kIHR5cGUgY2hlY2tpbmcsIGFsc28gY2F0Y2ggcHJvcGVydHkgZGljdHMgd2l0aCBtb3JlIHRoYW4gMTAwMCBrZXkvdmFsdWUgcGFpcnNcblxuXG4gIHZhciB2YWxpZGF0ZVByb3BlcnRpZXMgPSBmdW5jdGlvbiB2YWxpZGF0ZVByb3BlcnRpZXMocHJvcGVydGllcykge1xuICAgIHZhciBwcm9wc1R5cGUgPSB0eXBlKHByb3BlcnRpZXMpO1xuXG4gICAgaWYgKHByb3BzVHlwZSAhPT0gJ29iamVjdCcpIHtcbiAgICAgIGxvZy5lcnJvcignRXJyb3I6IGludmFsaWQgcHJvcGVydGllcyBmb3JtYXQuIEV4cGVjdGluZyBKYXZhc2NyaXB0IG9iamVjdCwgcmVjZWl2ZWQgJyArIHByb3BzVHlwZSArICcsIGlnbm9yaW5nJyk7XG4gICAgICByZXR1cm4ge307XG4gICAgfVxuXG4gICAgaWYgKE9iamVjdC5rZXlzKHByb3BlcnRpZXMpLmxlbmd0aCA+IENvbnN0YW50cy5NQVhfUFJPUEVSVFlfS0VZUykge1xuICAgICAgbG9nLmVycm9yKCdFcnJvcjogdG9vIG1hbnkgcHJvcGVydGllcyAobW9yZSB0aGFuIDEwMDApLCBpZ25vcmluZycpO1xuICAgICAgcmV0dXJuIHt9O1xuICAgIH1cblxuICAgIHZhciBjb3B5ID0ge307IC8vIGNyZWF0ZSBhIGNvcHkgd2l0aCBhbGwgb2YgdGhlIHZhbGlkIHByb3BlcnRpZXNcblxuICAgIGZvciAodmFyIHByb3BlcnR5IGluIHByb3BlcnRpZXMpIHtcbiAgICAgIGlmICghcHJvcGVydGllcy5oYXNPd25Qcm9wZXJ0eShwcm9wZXJ0eSkpIHtcbiAgICAgICAgY29udGludWU7XG4gICAgICB9IC8vIHZhbGlkYXRlIGtleVxuXG5cbiAgICAgIHZhciBrZXkgPSBwcm9wZXJ0eTtcbiAgICAgIHZhciBrZXlUeXBlID0gdHlwZShrZXkpO1xuXG4gICAgICBpZiAoa2V5VHlwZSAhPT0gJ3N0cmluZycpIHtcbiAgICAgICAga2V5ID0gU3RyaW5nKGtleSk7XG4gICAgICAgIGxvZy53YXJuKCdXQVJOSU5HOiBOb24tc3RyaW5nIHByb3BlcnR5IGtleSwgcmVjZWl2ZWQgdHlwZSAnICsga2V5VHlwZSArICcsIGNvZXJjaW5nIHRvIHN0cmluZyBcIicgKyBrZXkgKyAnXCInKTtcbiAgICAgIH0gLy8gdmFsaWRhdGUgdmFsdWVcblxuXG4gICAgICB2YXIgdmFsdWUgPSB2YWxpZGF0ZVByb3BlcnR5VmFsdWUoa2V5LCBwcm9wZXJ0aWVzW3Byb3BlcnR5XSk7XG5cbiAgICAgIGlmICh2YWx1ZSA9PT0gbnVsbCkge1xuICAgICAgICBjb250aW51ZTtcbiAgICAgIH1cblxuICAgICAgY29weVtrZXldID0gdmFsdWU7XG4gICAgfVxuXG4gICAgcmV0dXJuIGNvcHk7XG4gIH07XG5cbiAgdmFyIGludmFsaWRWYWx1ZVR5cGVzID0gWyduYW4nLCAnZnVuY3Rpb24nLCAnYXJndW1lbnRzJywgJ3JlZ2V4cCcsICdlbGVtZW50J107XG5cbiAgdmFyIHZhbGlkYXRlUHJvcGVydHlWYWx1ZSA9IGZ1bmN0aW9uIHZhbGlkYXRlUHJvcGVydHlWYWx1ZShrZXksIHZhbHVlKSB7XG4gICAgdmFyIHZhbHVlVHlwZSA9IHR5cGUodmFsdWUpO1xuXG4gICAgaWYgKGludmFsaWRWYWx1ZVR5cGVzLmluZGV4T2YodmFsdWVUeXBlKSAhPT0gLTEpIHtcbiAgICAgIGxvZy53YXJuKCdXQVJOSU5HOiBQcm9wZXJ0eSBrZXkgXCInICsga2V5ICsgJ1wiIHdpdGggaW52YWxpZCB2YWx1ZSB0eXBlICcgKyB2YWx1ZVR5cGUgKyAnLCBpZ25vcmluZycpO1xuICAgICAgdmFsdWUgPSBudWxsO1xuICAgIH0gZWxzZSBpZiAodmFsdWVUeXBlID09PSAndW5kZWZpbmVkJykge1xuICAgICAgdmFsdWUgPSBudWxsO1xuICAgIH0gZWxzZSBpZiAodmFsdWVUeXBlID09PSAnZXJyb3InKSB7XG4gICAgICB2YWx1ZSA9IFN0cmluZyh2YWx1ZSk7XG4gICAgICBsb2cud2FybignV0FSTklORzogUHJvcGVydHkga2V5IFwiJyArIGtleSArICdcIiB3aXRoIHZhbHVlIHR5cGUgZXJyb3IsIGNvZXJjaW5nIHRvICcgKyB2YWx1ZSk7XG4gICAgfSBlbHNlIGlmICh2YWx1ZVR5cGUgPT09ICdhcnJheScpIHtcbiAgICAgIC8vIGNoZWNrIGZvciBuZXN0ZWQgYXJyYXlzIG9yIG9iamVjdHNcbiAgICAgIHZhciBhcnJheUNvcHkgPSBbXTtcblxuICAgICAgZm9yICh2YXIgaSA9IDA7IGkgPCB2YWx1ZS5sZW5ndGg7IGkrKykge1xuICAgICAgICB2YXIgZWxlbWVudCA9IHZhbHVlW2ldO1xuICAgICAgICB2YXIgZWxlbVR5cGUgPSB0eXBlKGVsZW1lbnQpO1xuXG4gICAgICAgIGlmIChlbGVtVHlwZSA9PT0gJ2FycmF5Jykge1xuICAgICAgICAgIGxvZy53YXJuKCdXQVJOSU5HOiBDYW5ub3QgaGF2ZSAnICsgZWxlbVR5cGUgKyAnIG5lc3RlZCBpbiBhbiBhcnJheSBwcm9wZXJ0eSB2YWx1ZSwgc2tpcHBpbmcnKTtcbiAgICAgICAgICBjb250aW51ZTtcbiAgICAgICAgfSBlbHNlIGlmIChlbGVtVHlwZSA9PT0gJ29iamVjdCcpIHtcbiAgICAgICAgICBhcnJheUNvcHkucHVzaCh2YWxpZGF0ZVByb3BlcnRpZXMoZWxlbWVudCkpO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgIGFycmF5Q29weS5wdXNoKHZhbGlkYXRlUHJvcGVydHlWYWx1ZShrZXksIGVsZW1lbnQpKTtcbiAgICAgICAgfVxuICAgICAgfVxuXG4gICAgICB2YWx1ZSA9IGFycmF5Q29weTtcbiAgICB9IGVsc2UgaWYgKHZhbHVlVHlwZSA9PT0gJ29iamVjdCcpIHtcbiAgICAgIHZhbHVlID0gdmFsaWRhdGVQcm9wZXJ0aWVzKHZhbHVlKTtcbiAgICB9XG5cbiAgICByZXR1cm4gdmFsdWU7XG4gIH07XG5cbiAgdmFyIHZhbGlkYXRlR3JvdXBzID0gZnVuY3Rpb24gdmFsaWRhdGVHcm91cHMoZ3JvdXBzKSB7XG4gICAgdmFyIGdyb3Vwc1R5cGUgPSB0eXBlKGdyb3Vwcyk7XG5cbiAgICBpZiAoZ3JvdXBzVHlwZSAhPT0gJ29iamVjdCcpIHtcbiAgICAgIGxvZy5lcnJvcignRXJyb3I6IGludmFsaWQgZ3JvdXBzIGZvcm1hdC4gRXhwZWN0aW5nIEphdmFzY3JpcHQgb2JqZWN0LCByZWNlaXZlZCAnICsgZ3JvdXBzVHlwZSArICcsIGlnbm9yaW5nJyk7XG4gICAgICByZXR1cm4ge307XG4gICAgfVxuXG4gICAgdmFyIGNvcHkgPSB7fTsgLy8gY3JlYXRlIGEgY29weSB3aXRoIGFsbCBvZiB0aGUgdmFsaWQgcHJvcGVydGllc1xuXG4gICAgZm9yICh2YXIgZ3JvdXAgaW4gZ3JvdXBzKSB7XG4gICAgICBpZiAoIWdyb3Vwcy5oYXNPd25Qcm9wZXJ0eShncm91cCkpIHtcbiAgICAgICAgY29udGludWU7XG4gICAgICB9IC8vIHZhbGlkYXRlIGtleVxuXG5cbiAgICAgIHZhciBrZXkgPSBncm91cDtcbiAgICAgIHZhciBrZXlUeXBlID0gdHlwZShrZXkpO1xuXG4gICAgICBpZiAoa2V5VHlwZSAhPT0gJ3N0cmluZycpIHtcbiAgICAgICAga2V5ID0gU3RyaW5nKGtleSk7XG4gICAgICAgIGxvZy53YXJuKCdXQVJOSU5HOiBOb24tc3RyaW5nIGdyb3VwVHlwZSwgcmVjZWl2ZWQgdHlwZSAnICsga2V5VHlwZSArICcsIGNvZXJjaW5nIHRvIHN0cmluZyBcIicgKyBrZXkgKyAnXCInKTtcbiAgICAgIH0gLy8gdmFsaWRhdGUgdmFsdWVcblxuXG4gICAgICB2YXIgdmFsdWUgPSB2YWxpZGF0ZUdyb3VwTmFtZShrZXksIGdyb3Vwc1tncm91cF0pO1xuXG4gICAgICBpZiAodmFsdWUgPT09IG51bGwpIHtcbiAgICAgICAgY29udGludWU7XG4gICAgICB9XG5cbiAgICAgIGNvcHlba2V5XSA9IHZhbHVlO1xuICAgIH1cblxuICAgIHJldHVybiBjb3B5O1xuICB9O1xuXG4gIHZhciB2YWxpZGF0ZUdyb3VwTmFtZSA9IGZ1bmN0aW9uIHZhbGlkYXRlR3JvdXBOYW1lKGtleSwgZ3JvdXBOYW1lKSB7XG4gICAgdmFyIGdyb3VwTmFtZVR5cGUgPSB0eXBlKGdyb3VwTmFtZSk7XG5cbiAgICBpZiAoZ3JvdXBOYW1lVHlwZSA9PT0gJ3N0cmluZycpIHtcbiAgICAgIHJldHVybiBncm91cE5hbWU7XG4gICAgfVxuXG4gICAgaWYgKGdyb3VwTmFtZVR5cGUgPT09ICdkYXRlJyB8fCBncm91cE5hbWVUeXBlID09PSAnbnVtYmVyJyB8fCBncm91cE5hbWVUeXBlID09PSAnYm9vbGVhbicpIHtcbiAgICAgIGdyb3VwTmFtZSA9IFN0cmluZyhncm91cE5hbWUpO1xuICAgICAgbG9nLndhcm4oJ1dBUk5JTkc6IE5vbi1zdHJpbmcgZ3JvdXBOYW1lLCByZWNlaXZlZCB0eXBlICcgKyBncm91cE5hbWVUeXBlICsgJywgY29lcmNpbmcgdG8gc3RyaW5nIFwiJyArIGdyb3VwTmFtZSArICdcIicpO1xuICAgICAgcmV0dXJuIGdyb3VwTmFtZTtcbiAgICB9XG5cbiAgICBpZiAoZ3JvdXBOYW1lVHlwZSA9PT0gJ2FycmF5Jykge1xuICAgICAgLy8gY2hlY2sgZm9yIG5lc3RlZCBhcnJheXMgb3Igb2JqZWN0c1xuICAgICAgdmFyIGFycmF5Q29weSA9IFtdO1xuXG4gICAgICBmb3IgKHZhciBpID0gMDsgaSA8IGdyb3VwTmFtZS5sZW5ndGg7IGkrKykge1xuICAgICAgICB2YXIgZWxlbWVudCA9IGdyb3VwTmFtZVtpXTtcbiAgICAgICAgdmFyIGVsZW1UeXBlID0gdHlwZShlbGVtZW50KTtcblxuICAgICAgICBpZiAoZWxlbVR5cGUgPT09ICdhcnJheScgfHwgZWxlbVR5cGUgPT09ICdvYmplY3QnKSB7XG4gICAgICAgICAgbG9nLndhcm4oJ1dBUk5JTkc6IFNraXBwaW5nIG5lc3RlZCAnICsgZWxlbVR5cGUgKyAnIGluIGFycmF5IGdyb3VwTmFtZScpO1xuICAgICAgICAgIGNvbnRpbnVlO1xuICAgICAgICB9IGVsc2UgaWYgKGVsZW1UeXBlID09PSAnc3RyaW5nJykge1xuICAgICAgICAgIGFycmF5Q29weS5wdXNoKGVsZW1lbnQpO1xuICAgICAgICB9IGVsc2UgaWYgKGVsZW1UeXBlID09PSAnZGF0ZScgfHwgZWxlbVR5cGUgPT09ICdudW1iZXInIHx8IGVsZW1UeXBlID09PSAnYm9vbGVhbicpIHtcbiAgICAgICAgICBlbGVtZW50ID0gU3RyaW5nKGVsZW1lbnQpO1xuICAgICAgICAgIGxvZy53YXJuKCdXQVJOSU5HOiBOb24tc3RyaW5nIGdyb3VwTmFtZSwgcmVjZWl2ZWQgdHlwZSAnICsgZWxlbVR5cGUgKyAnLCBjb2VyY2luZyB0byBzdHJpbmcgXCInICsgZWxlbWVudCArICdcIicpO1xuICAgICAgICAgIGFycmF5Q29weS5wdXNoKGVsZW1lbnQpO1xuICAgICAgICB9XG4gICAgICB9XG5cbiAgICAgIHJldHVybiBhcnJheUNvcHk7XG4gICAgfVxuXG4gICAgbG9nLndhcm4oJ1dBUk5JTkc6IE5vbi1zdHJpbmcgZ3JvdXBOYW1lLCByZWNlaXZlZCB0eXBlICcgKyBncm91cE5hbWVUeXBlICsgJy4gUGxlYXNlIHVzZSBzdHJpbmdzIG9yIGFycmF5IG9mIHN0cmluZ3MgZm9yIGdyb3VwTmFtZScpO1xuICB9OyAvLyBwYXJzZXMgdGhlIHZhbHVlIG9mIGEgdXJsIHBhcmFtIChmb3IgZXhhbXBsZSA/Z2NsaWQ9MTIzNCYuLi4pXG5cblxuICB2YXIgZ2V0UXVlcnlQYXJhbSA9IGZ1bmN0aW9uIGdldFF1ZXJ5UGFyYW0obmFtZSwgcXVlcnkpIHtcbiAgICBuYW1lID0gbmFtZS5yZXBsYWNlKC9bXFxbXS8sIFwiXFxcXFtcIikucmVwbGFjZSgvW1xcXV0vLCBcIlxcXFxdXCIpO1xuICAgIHZhciByZWdleCA9IG5ldyBSZWdFeHAoXCJbXFxcXD8mXVwiICsgbmFtZSArIFwiPShbXiYjXSopXCIpO1xuICAgIHZhciByZXN1bHRzID0gcmVnZXguZXhlYyhxdWVyeSk7XG4gICAgcmV0dXJuIHJlc3VsdHMgPT09IG51bGwgPyB1bmRlZmluZWQgOiBkZWNvZGVVUklDb21wb25lbnQocmVzdWx0c1sxXS5yZXBsYWNlKC9cXCsvZywgXCIgXCIpKTtcbiAgfTtcblxuICB2YXIgdXRpbHMgPSB7XG4gICAgc2V0TG9nTGV2ZWw6IHNldExvZ0xldmVsLFxuICAgIGdldExvZ0xldmVsOiBnZXRMb2dMZXZlbCxcbiAgICBsb2dMZXZlbHM6IGxvZ0xldmVscyxcbiAgICBsb2c6IGxvZyxcbiAgICBpc0VtcHR5U3RyaW5nOiBpc0VtcHR5U3RyaW5nLFxuICAgIGdldFF1ZXJ5UGFyYW06IGdldFF1ZXJ5UGFyYW0sXG4gICAgc2Vzc2lvblN0b3JhZ2VFbmFibGVkOiBzZXNzaW9uU3RvcmFnZUVuYWJsZWQsXG4gICAgdHJ1bmNhdGU6IHRydW5jYXRlLFxuICAgIHZhbGlkYXRlR3JvdXBzOiB2YWxpZGF0ZUdyb3VwcyxcbiAgICB2YWxpZGF0ZUlucHV0OiB2YWxpZGF0ZUlucHV0LFxuICAgIHZhbGlkYXRlUHJvcGVydGllczogdmFsaWRhdGVQcm9wZXJ0aWVzXG4gIH07XG5cbiAgdmFyIGdldExvY2F0aW9uID0gZnVuY3Rpb24gZ2V0TG9jYXRpb24oKSB7XG4gICAgcmV0dXJuIHdpbmRvdy5sb2NhdGlvbjtcbiAgfTtcblxuICB2YXIgZ2V0ID0gZnVuY3Rpb24gZ2V0KG5hbWUpIHtcbiAgICB0cnkge1xuICAgICAgdmFyIGNhID0gZG9jdW1lbnQuY29va2llLnNwbGl0KCc7Jyk7XG4gICAgICB2YXIgdmFsdWUgPSBudWxsO1xuXG4gICAgICBmb3IgKHZhciBpID0gMDsgaSA8IGNhLmxlbmd0aDsgaSsrKSB7XG4gICAgICAgIHZhciBjID0gY2FbaV07XG5cbiAgICAgICAgd2hpbGUgKGMuY2hhckF0KDApID09PSAnICcpIHtcbiAgICAgICAgICBjID0gYy5zdWJzdHJpbmcoMSwgYy5sZW5ndGgpO1xuICAgICAgICB9XG5cbiAgICAgICAgaWYgKGMuaW5kZXhPZihuYW1lKSA9PT0gMCkge1xuICAgICAgICAgIHZhbHVlID0gYy5zdWJzdHJpbmcobmFtZS5sZW5ndGgsIGMubGVuZ3RoKTtcbiAgICAgICAgICBicmVhaztcbiAgICAgICAgfVxuICAgICAgfVxuXG4gICAgICByZXR1cm4gdmFsdWU7XG4gICAgfSBjYXRjaCAoZSkge1xuICAgICAgcmV0dXJuIG51bGw7XG4gICAgfVxuICB9O1xuXG4gIHZhciBzZXQgPSBmdW5jdGlvbiBzZXQobmFtZSwgdmFsdWUsIG9wdHMpIHtcbiAgICB2YXIgZXhwaXJlcyA9IHZhbHVlICE9PSBudWxsID8gb3B0cy5leHBpcmF0aW9uRGF5cyA6IC0xO1xuXG4gICAgaWYgKGV4cGlyZXMpIHtcbiAgICAgIHZhciBkYXRlID0gbmV3IERhdGUoKTtcbiAgICAgIGRhdGUuc2V0VGltZShkYXRlLmdldFRpbWUoKSArIGV4cGlyZXMgKiAyNCAqIDYwICogNjAgKiAxMDAwKTtcbiAgICAgIGV4cGlyZXMgPSBkYXRlO1xuICAgIH1cblxuICAgIHZhciBzdHIgPSBuYW1lICsgJz0nICsgdmFsdWU7XG5cbiAgICBpZiAoZXhwaXJlcykge1xuICAgICAgc3RyICs9ICc7IGV4cGlyZXM9JyArIGV4cGlyZXMudG9VVENTdHJpbmcoKTtcbiAgICB9XG5cbiAgICBzdHIgKz0gJzsgcGF0aD0vJztcblxuICAgIGlmIChvcHRzLmRvbWFpbikge1xuICAgICAgc3RyICs9ICc7IGRvbWFpbj0nICsgb3B0cy5kb21haW47XG4gICAgfVxuXG4gICAgaWYgKG9wdHMuc2VjdXJlKSB7XG4gICAgICBzdHIgKz0gJzsgU2VjdXJlJztcbiAgICB9XG5cbiAgICBpZiAob3B0cy5zYW1lU2l0ZSkge1xuICAgICAgc3RyICs9ICc7IFNhbWVTaXRlPScgKyBvcHRzLnNhbWVTaXRlO1xuICAgIH1cblxuICAgIGRvY3VtZW50LmNvb2tpZSA9IHN0cjtcbiAgfTsgLy8gdGVzdCB0aGF0IGNvb2tpZXMgYXJlIGVuYWJsZWQgLSBuYXZpZ2F0b3IuY29va2llc0VuYWJsZWQgeWllbGRzIGZhbHNlIHBvc2l0aXZlcyBpbiBJRSwgbmVlZCB0byB0ZXN0IGRpcmVjdGx5XG5cblxuICB2YXIgYXJlQ29va2llc0VuYWJsZWQgPSBmdW5jdGlvbiBhcmVDb29raWVzRW5hYmxlZCgpIHtcbiAgICB2YXIgdWlkID0gU3RyaW5nKG5ldyBEYXRlKCkpO1xuXG4gICAgdHJ5IHtcbiAgICAgIHNldChDb25zdGFudHMuQ09PS0lFX1RFU1QsIHVpZCwge30pO1xuXG4gICAgICB2YXIgX2FyZUNvb2tpZXNFbmFibGVkID0gZ2V0KENvbnN0YW50cy5DT09LSUVfVEVTVCArICc9JykgPT09IHVpZDtcblxuICAgICAgc2V0KENvbnN0YW50cy5DT09LSUVfVEVTVCwgbnVsbCwge30pO1xuICAgICAgcmV0dXJuIF9hcmVDb29raWVzRW5hYmxlZDtcbiAgICB9IGNhdGNoIChlKSB7fVxuXG4gICAgcmV0dXJuIGZhbHNlO1xuICB9O1xuXG4gIHZhciBiYXNlQ29va2llID0ge1xuICAgIHNldDogc2V0LFxuICAgIGdldDogZ2V0LFxuICAgIGFyZUNvb2tpZXNFbmFibGVkOiBhcmVDb29raWVzRW5hYmxlZFxuICB9O1xuXG4gIHZhciBnZXRIb3N0ID0gZnVuY3Rpb24gZ2V0SG9zdCh1cmwpIHtcbiAgICB2YXIgYSA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoJ2EnKTtcbiAgICBhLmhyZWYgPSB1cmw7XG4gICAgcmV0dXJuIGEuaG9zdG5hbWUgfHwgbG9jYXRpb24uaG9zdG5hbWU7XG4gIH07XG5cbiAgdmFyIHRvcERvbWFpbiA9IGZ1bmN0aW9uIHRvcERvbWFpbih1cmwpIHtcbiAgICB2YXIgaG9zdCA9IGdldEhvc3QodXJsKTtcbiAgICB2YXIgcGFydHMgPSBob3N0LnNwbGl0KCcuJyk7XG4gICAgdmFyIGxldmVscyA9IFtdO1xuXG4gICAgZm9yICh2YXIgaSA9IHBhcnRzLmxlbmd0aCAtIDI7IGkgPj0gMDsgLS1pKSB7XG4gICAgICBsZXZlbHMucHVzaChwYXJ0cy5zbGljZShpKS5qb2luKCcuJykpO1xuICAgIH1cblxuICAgIGZvciAodmFyIF9pID0gMDsgX2kgPCBsZXZlbHMubGVuZ3RoOyArK19pKSB7XG4gICAgICB2YXIgY25hbWUgPSAnX190bGRfdGVzdF9fJztcbiAgICAgIHZhciBkb21haW4gPSBsZXZlbHNbX2ldO1xuICAgICAgdmFyIG9wdHMgPSB7XG4gICAgICAgIGRvbWFpbjogJy4nICsgZG9tYWluXG4gICAgICB9O1xuICAgICAgYmFzZUNvb2tpZS5zZXQoY25hbWUsIDEsIG9wdHMpO1xuXG4gICAgICBpZiAoYmFzZUNvb2tpZS5nZXQoY25hbWUpKSB7XG4gICAgICAgIGJhc2VDb29raWUuc2V0KGNuYW1lLCBudWxsLCBvcHRzKTtcbiAgICAgICAgcmV0dXJuIGRvbWFpbjtcbiAgICAgIH1cbiAgICB9XG5cbiAgICByZXR1cm4gJyc7XG4gIH07XG5cbiAgLypcbiAgICogQ29va2llIGRhdGFcbiAgICovXG4gIHZhciBfb3B0aW9ucyA9IHtcbiAgICBleHBpcmF0aW9uRGF5czogdW5kZWZpbmVkLFxuICAgIGRvbWFpbjogdW5kZWZpbmVkXG4gIH07XG5cbiAgdmFyIHJlc2V0ID0gZnVuY3Rpb24gcmVzZXQoKSB7XG4gICAgX29wdGlvbnMgPSB7XG4gICAgICBleHBpcmF0aW9uRGF5czogdW5kZWZpbmVkLFxuICAgICAgZG9tYWluOiB1bmRlZmluZWRcbiAgICB9O1xuICB9O1xuXG4gIHZhciBvcHRpb25zID0gZnVuY3Rpb24gb3B0aW9ucyhvcHRzKSB7XG4gICAgaWYgKGFyZ3VtZW50cy5sZW5ndGggPT09IDApIHtcbiAgICAgIHJldHVybiBfb3B0aW9ucztcbiAgICB9XG5cbiAgICBvcHRzID0gb3B0cyB8fCB7fTtcbiAgICBfb3B0aW9ucy5leHBpcmF0aW9uRGF5cyA9IG9wdHMuZXhwaXJhdGlvbkRheXM7XG4gICAgX29wdGlvbnMuc2VjdXJlID0gb3B0cy5zZWN1cmU7XG4gICAgX29wdGlvbnMuc2FtZVNpdGUgPSBvcHRzLnNhbWVTaXRlO1xuICAgIHZhciBkb21haW4gPSAhdXRpbHMuaXNFbXB0eVN0cmluZyhvcHRzLmRvbWFpbikgPyBvcHRzLmRvbWFpbiA6ICcuJyArIHRvcERvbWFpbihnZXRMb2NhdGlvbigpLmhyZWYpO1xuICAgIHZhciB0b2tlbiA9IE1hdGgucmFuZG9tKCk7XG4gICAgX29wdGlvbnMuZG9tYWluID0gZG9tYWluO1xuICAgIHNldCQxKCdhbXBsaXR1ZGVfdGVzdCcsIHRva2VuKTtcbiAgICB2YXIgc3RvcmVkID0gZ2V0JDEoJ2FtcGxpdHVkZV90ZXN0Jyk7XG5cbiAgICBpZiAoIXN0b3JlZCB8fCBzdG9yZWQgIT09IHRva2VuKSB7XG4gICAgICBkb21haW4gPSBudWxsO1xuICAgIH1cblxuICAgIHJlbW92ZSgnYW1wbGl0dWRlX3Rlc3QnKTtcbiAgICBfb3B0aW9ucy5kb21haW4gPSBkb21haW47XG4gICAgcmV0dXJuIF9vcHRpb25zO1xuICB9O1xuXG4gIHZhciBfZG9tYWluU3BlY2lmaWMgPSBmdW5jdGlvbiBfZG9tYWluU3BlY2lmaWMobmFtZSkge1xuICAgIC8vIGRpZmZlcmVudGlhdGUgYmV0d2VlbiBjb29raWVzIG9uIGRpZmZlcmVudCBkb21haW5zXG4gICAgdmFyIHN1ZmZpeCA9ICcnO1xuXG4gICAgaWYgKF9vcHRpb25zLmRvbWFpbikge1xuICAgICAgc3VmZml4ID0gX29wdGlvbnMuZG9tYWluLmNoYXJBdCgwKSA9PT0gJy4nID8gX29wdGlvbnMuZG9tYWluLnN1YnN0cmluZygxKSA6IF9vcHRpb25zLmRvbWFpbjtcbiAgICB9XG5cbiAgICByZXR1cm4gbmFtZSArIHN1ZmZpeDtcbiAgfTtcblxuICB2YXIgZ2V0JDEgPSBmdW5jdGlvbiBnZXQobmFtZSkge1xuICAgIHZhciBuYW1lRXEgPSBfZG9tYWluU3BlY2lmaWMobmFtZSkgKyAnPSc7XG4gICAgdmFyIHZhbHVlID0gYmFzZUNvb2tpZS5nZXQobmFtZUVxKTtcblxuICAgIHRyeSB7XG4gICAgICBpZiAodmFsdWUpIHtcbiAgICAgICAgcmV0dXJuIEpTT04ucGFyc2UoQmFzZTY0LmRlY29kZSh2YWx1ZSkpO1xuICAgICAgfVxuICAgIH0gY2F0Y2ggKGUpIHtcbiAgICAgIHJldHVybiBudWxsO1xuICAgIH1cblxuICAgIHJldHVybiBudWxsO1xuICB9O1xuXG4gIHZhciBzZXQkMSA9IGZ1bmN0aW9uIHNldChuYW1lLCB2YWx1ZSkge1xuICAgIHRyeSB7XG4gICAgICBiYXNlQ29va2llLnNldChfZG9tYWluU3BlY2lmaWMobmFtZSksIEJhc2U2NC5lbmNvZGUoSlNPTi5zdHJpbmdpZnkodmFsdWUpKSwgX29wdGlvbnMpO1xuICAgICAgcmV0dXJuIHRydWU7XG4gICAgfSBjYXRjaCAoZSkge1xuICAgICAgcmV0dXJuIGZhbHNlO1xuICAgIH1cbiAgfTtcblxuICB2YXIgc2V0UmF3ID0gZnVuY3Rpb24gc2V0UmF3KG5hbWUsIHZhbHVlKSB7XG4gICAgdHJ5IHtcbiAgICAgIGJhc2VDb29raWUuc2V0KF9kb21haW5TcGVjaWZpYyhuYW1lKSwgdmFsdWUsIF9vcHRpb25zKTtcbiAgICAgIHJldHVybiB0cnVlO1xuICAgIH0gY2F0Y2ggKGUpIHtcbiAgICAgIHJldHVybiBmYWxzZTtcbiAgICB9XG4gIH07XG5cbiAgdmFyIGdldFJhdyA9IGZ1bmN0aW9uIGdldFJhdyhuYW1lKSB7XG4gICAgdmFyIG5hbWVFcSA9IF9kb21haW5TcGVjaWZpYyhuYW1lKSArICc9JztcbiAgICByZXR1cm4gYmFzZUNvb2tpZS5nZXQobmFtZUVxKTtcbiAgfTtcblxuICB2YXIgcmVtb3ZlID0gZnVuY3Rpb24gcmVtb3ZlKG5hbWUpIHtcbiAgICB0cnkge1xuICAgICAgYmFzZUNvb2tpZS5zZXQoX2RvbWFpblNwZWNpZmljKG5hbWUpLCBudWxsLCBfb3B0aW9ucyk7XG4gICAgICByZXR1cm4gdHJ1ZTtcbiAgICB9IGNhdGNoIChlKSB7XG4gICAgICByZXR1cm4gZmFsc2U7XG4gICAgfVxuICB9O1xuXG4gIHZhciBDb29raWUgPSB7XG4gICAgcmVzZXQ6IHJlc2V0LFxuICAgIG9wdGlvbnM6IG9wdGlvbnMsXG4gICAgZ2V0OiBnZXQkMSxcbiAgICBzZXQ6IHNldCQxLFxuICAgIHJlbW92ZTogcmVtb3ZlLFxuICAgIHNldFJhdzogc2V0UmF3LFxuICAgIGdldFJhdzogZ2V0UmF3XG4gIH07XG5cbiAgLyoganNoaW50IC1XMDIwLCB1bnVzZWQ6IGZhbHNlLCBub2VtcHR5OiBmYWxzZSwgYm9zczogdHJ1ZSAqL1xuXG4gIC8qXG4gICAqIEltcGxlbWVudCBsb2NhbFN0b3JhZ2UgdG8gc3VwcG9ydCBGaXJlZm94IDItMyBhbmQgSUUgNS03XG4gICAqL1xuICB2YXIgbG9jYWxTdG9yYWdlOyAvLyBqc2hpbnQgaWdub3JlOmxpbmVcblxuICB7XG4gICAgLy8gdGVzdCB0aGF0IFdpbmRvdy5sb2NhbFN0b3JhZ2UgaXMgYXZhaWxhYmxlIGFuZCB3b3Jrc1xuICAgIHZhciB3aW5kb3dMb2NhbFN0b3JhZ2VBdmFpbGFibGUgPSBmdW5jdGlvbiB3aW5kb3dMb2NhbFN0b3JhZ2VBdmFpbGFibGUoKSB7XG4gICAgICB2YXIgdWlkID0gbmV3IERhdGUoKTtcbiAgICAgIHZhciByZXN1bHQ7XG5cbiAgICAgIHRyeSB7XG4gICAgICAgIHdpbmRvdy5sb2NhbFN0b3JhZ2Uuc2V0SXRlbSh1aWQsIHVpZCk7XG4gICAgICAgIHJlc3VsdCA9IHdpbmRvdy5sb2NhbFN0b3JhZ2UuZ2V0SXRlbSh1aWQpID09PSBTdHJpbmcodWlkKTtcbiAgICAgICAgd2luZG93LmxvY2FsU3RvcmFnZS5yZW1vdmVJdGVtKHVpZCk7XG4gICAgICAgIHJldHVybiByZXN1bHQ7XG4gICAgICB9IGNhdGNoIChlKSB7Ly8gbG9jYWxTdG9yYWdlIG5vdCBhdmFpbGFibGVcbiAgICAgIH1cblxuICAgICAgcmV0dXJuIGZhbHNlO1xuICAgIH07XG5cbiAgICBpZiAod2luZG93TG9jYWxTdG9yYWdlQXZhaWxhYmxlKCkpIHtcbiAgICAgIGxvY2FsU3RvcmFnZSA9IHdpbmRvdy5sb2NhbFN0b3JhZ2U7XG4gICAgfSBlbHNlIGlmICh3aW5kb3cuZ2xvYmFsU3RvcmFnZSkge1xuICAgICAgLy8gRmlyZWZveCAyLTMgdXNlIGdsb2JhbFN0b3JhZ2VcbiAgICAgIC8vIFNlZSBodHRwczovL2RldmVsb3Blci5tb3ppbGxhLm9yZy9lbi9kb20vc3RvcmFnZSNnbG9iYWxTdG9yYWdlXG4gICAgICB0cnkge1xuICAgICAgICBsb2NhbFN0b3JhZ2UgPSB3aW5kb3cuZ2xvYmFsU3RvcmFnZVt3aW5kb3cubG9jYXRpb24uaG9zdG5hbWVdO1xuICAgICAgfSBjYXRjaCAoZSkgey8vIFNvbWV0aGluZyBiYWQgaGFwcGVuZWQuLi5cbiAgICAgIH1cbiAgICB9IGVsc2UgaWYgKHR5cGVvZiBkb2N1bWVudCAhPT0gJ3VuZGVmaW5lZCcpIHtcbiAgICAgIC8vIElFIDUtNyB1c2UgdXNlckRhdGFcbiAgICAgIC8vIFNlZSBodHRwOi8vbXNkbi5taWNyb3NvZnQuY29tL2VuLXVzL2xpYnJhcnkvbXM1MzE0MjQodj12cy44NSkuYXNweFxuICAgICAgdmFyIGRpdiA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoJ2RpdicpLFxuICAgICAgICAgIGF0dHJLZXkgPSAnbG9jYWxTdG9yYWdlJztcbiAgICAgIGRpdi5zdHlsZS5kaXNwbGF5ID0gJ25vbmUnO1xuICAgICAgZG9jdW1lbnQuZ2V0RWxlbWVudHNCeVRhZ05hbWUoJ2hlYWQnKVswXS5hcHBlbmRDaGlsZChkaXYpO1xuXG4gICAgICBpZiAoZGl2LmFkZEJlaGF2aW9yKSB7XG4gICAgICAgIGRpdi5hZGRCZWhhdmlvcignI2RlZmF1bHQjdXNlcmRhdGEnKTtcbiAgICAgICAgbG9jYWxTdG9yYWdlID0ge1xuICAgICAgICAgIGxlbmd0aDogMCxcbiAgICAgICAgICBzZXRJdGVtOiBmdW5jdGlvbiBzZXRJdGVtKGssIHYpIHtcbiAgICAgICAgICAgIGRpdi5sb2FkKGF0dHJLZXkpO1xuXG4gICAgICAgICAgICBpZiAoIWRpdi5nZXRBdHRyaWJ1dGUoaykpIHtcbiAgICAgICAgICAgICAgdGhpcy5sZW5ndGgrKztcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgZGl2LnNldEF0dHJpYnV0ZShrLCB2KTtcbiAgICAgICAgICAgIGRpdi5zYXZlKGF0dHJLZXkpO1xuICAgICAgICAgIH0sXG4gICAgICAgICAgZ2V0SXRlbTogZnVuY3Rpb24gZ2V0SXRlbShrKSB7XG4gICAgICAgICAgICBkaXYubG9hZChhdHRyS2V5KTtcbiAgICAgICAgICAgIHJldHVybiBkaXYuZ2V0QXR0cmlidXRlKGspO1xuICAgICAgICAgIH0sXG4gICAgICAgICAgcmVtb3ZlSXRlbTogZnVuY3Rpb24gcmVtb3ZlSXRlbShrKSB7XG4gICAgICAgICAgICBkaXYubG9hZChhdHRyS2V5KTtcblxuICAgICAgICAgICAgaWYgKGRpdi5nZXRBdHRyaWJ1dGUoaykpIHtcbiAgICAgICAgICAgICAgdGhpcy5sZW5ndGgtLTtcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgZGl2LnJlbW92ZUF0dHJpYnV0ZShrKTtcbiAgICAgICAgICAgIGRpdi5zYXZlKGF0dHJLZXkpO1xuICAgICAgICAgIH0sXG4gICAgICAgICAgY2xlYXI6IGZ1bmN0aW9uIGNsZWFyKCkge1xuICAgICAgICAgICAgZGl2LmxvYWQoYXR0cktleSk7XG4gICAgICAgICAgICB2YXIgaSA9IDA7XG4gICAgICAgICAgICB2YXIgYXR0cjtcblxuICAgICAgICAgICAgd2hpbGUgKGF0dHIgPSBkaXYuWE1MRG9jdW1lbnQuZG9jdW1lbnRFbGVtZW50LmF0dHJpYnV0ZXNbaSsrXSkge1xuICAgICAgICAgICAgICBkaXYucmVtb3ZlQXR0cmlidXRlKGF0dHIubmFtZSk7XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIGRpdi5zYXZlKGF0dHJLZXkpO1xuICAgICAgICAgICAgdGhpcy5sZW5ndGggPSAwO1xuICAgICAgICAgIH0sXG4gICAgICAgICAga2V5OiBmdW5jdGlvbiBrZXkoaykge1xuICAgICAgICAgICAgZGl2LmxvYWQoYXR0cktleSk7XG4gICAgICAgICAgICByZXR1cm4gZGl2LlhNTERvY3VtZW50LmRvY3VtZW50RWxlbWVudC5hdHRyaWJ1dGVzW2tdO1xuICAgICAgICAgIH1cbiAgICAgICAgfTtcbiAgICAgICAgZGl2LmxvYWQoYXR0cktleSk7XG4gICAgICAgIGxvY2FsU3RvcmFnZS5sZW5ndGggPSBkaXYuWE1MRG9jdW1lbnQuZG9jdW1lbnRFbGVtZW50LmF0dHJpYnV0ZXMubGVuZ3RoO1xuICAgICAgfVxuICAgIH1cblxuICAgIGlmICghbG9jYWxTdG9yYWdlKSB7XG4gICAgICBsb2NhbFN0b3JhZ2UgPSB7XG4gICAgICAgIGxlbmd0aDogMCxcbiAgICAgICAgc2V0SXRlbTogZnVuY3Rpb24gc2V0SXRlbShrLCB2KSB7fSxcbiAgICAgICAgZ2V0SXRlbTogZnVuY3Rpb24gZ2V0SXRlbShrKSB7fSxcbiAgICAgICAgcmVtb3ZlSXRlbTogZnVuY3Rpb24gcmVtb3ZlSXRlbShrKSB7fSxcbiAgICAgICAgY2xlYXI6IGZ1bmN0aW9uIGNsZWFyKCkge30sXG4gICAgICAgIGtleTogZnVuY3Rpb24ga2V5KGspIHt9XG4gICAgICB9O1xuICAgIH1cbiAgfVxuXG4gIHZhciBsb2NhbFN0b3JhZ2UkMSA9IGxvY2FsU3RvcmFnZTtcblxuICAvKiBqc2hpbnQgLVcwMjAsIHVudXNlZDogZmFsc2UsIG5vZW1wdHk6IGZhbHNlLCBib3NzOiB0cnVlICovXG5cbiAgdmFyIGNvb2tpZVN0b3JhZ2UgPSBmdW5jdGlvbiBjb29raWVTdG9yYWdlKCkge1xuICAgIHRoaXMuc3RvcmFnZSA9IG51bGw7XG4gIH07IC8vIHRlc3QgdGhhdCBjb29raWVzIGFyZSBlbmFibGVkIC0gbmF2aWdhdG9yLmNvb2tpZXNFbmFibGVkIHlpZWxkcyBmYWxzZSBwb3NpdGl2ZXMgaW4gSUUsIG5lZWQgdG8gdGVzdCBkaXJlY3RseVxuXG5cbiAgY29va2llU3RvcmFnZS5wcm90b3R5cGUuX2Nvb2tpZXNFbmFibGVkID0gZnVuY3Rpb24gKCkge1xuICAgIHZhciB1aWQgPSBTdHJpbmcobmV3IERhdGUoKSk7XG4gICAgdmFyIHJlc3VsdDtcblxuICAgIHRyeSB7XG4gICAgICBDb29raWUuc2V0KENvbnN0YW50cy5DT09LSUVfVEVTVCwgdWlkKTtcbiAgICAgIHJlc3VsdCA9IENvb2tpZS5nZXQoQ29uc3RhbnRzLkNPT0tJRV9URVNUKSA9PT0gdWlkO1xuICAgICAgQ29va2llLnJlbW92ZShDb25zdGFudHMuQ09PS0lFX1RFU1QpO1xuICAgICAgcmV0dXJuIHJlc3VsdDtcbiAgICB9IGNhdGNoIChlKSB7Ly8gY29va2llcyBhcmUgbm90IGVuYWJsZWRcbiAgICB9XG5cbiAgICByZXR1cm4gZmFsc2U7XG4gIH07XG5cbiAgY29va2llU3RvcmFnZS5wcm90b3R5cGUuZ2V0U3RvcmFnZSA9IGZ1bmN0aW9uICgpIHtcbiAgICBpZiAodGhpcy5zdG9yYWdlICE9PSBudWxsKSB7XG4gICAgICByZXR1cm4gdGhpcy5zdG9yYWdlO1xuICAgIH1cblxuICAgIGlmICh0aGlzLl9jb29raWVzRW5hYmxlZCgpKSB7XG4gICAgICB0aGlzLnN0b3JhZ2UgPSBDb29raWU7XG4gICAgfSBlbHNlIHtcbiAgICAgIC8vIGlmIGNvb2tpZXMgZGlzYWJsZWQsIGZhbGxiYWNrIHRvIGxvY2Fsc3RvcmFnZVxuICAgICAgLy8gbm90ZTogbG9jYWxzdG9yYWdlIGRvZXMgbm90IHBlcnNpc3QgYWNyb3NzIHN1YmRvbWFpbnNcbiAgICAgIHZhciBrZXlQcmVmaXggPSAnYW1wX2Nvb2tpZXN0b3JlXyc7XG4gICAgICB0aGlzLnN0b3JhZ2UgPSB7XG4gICAgICAgIF9vcHRpb25zOiB7XG4gICAgICAgICAgZXhwaXJhdGlvbkRheXM6IHVuZGVmaW5lZCxcbiAgICAgICAgICBkb21haW46IHVuZGVmaW5lZCxcbiAgICAgICAgICBzZWN1cmU6IGZhbHNlXG4gICAgICAgIH0sXG4gICAgICAgIHJlc2V0OiBmdW5jdGlvbiByZXNldCgpIHtcbiAgICAgICAgICB0aGlzLl9vcHRpb25zID0ge1xuICAgICAgICAgICAgZXhwaXJhdGlvbkRheXM6IHVuZGVmaW5lZCxcbiAgICAgICAgICAgIGRvbWFpbjogdW5kZWZpbmVkLFxuICAgICAgICAgICAgc2VjdXJlOiBmYWxzZVxuICAgICAgICAgIH07XG4gICAgICAgIH0sXG4gICAgICAgIG9wdGlvbnM6IGZ1bmN0aW9uIG9wdGlvbnMob3B0cykge1xuICAgICAgICAgIGlmIChhcmd1bWVudHMubGVuZ3RoID09PSAwKSB7XG4gICAgICAgICAgICByZXR1cm4gdGhpcy5fb3B0aW9ucztcbiAgICAgICAgICB9XG5cbiAgICAgICAgICBvcHRzID0gb3B0cyB8fCB7fTtcbiAgICAgICAgICB0aGlzLl9vcHRpb25zLmV4cGlyYXRpb25EYXlzID0gb3B0cy5leHBpcmF0aW9uRGF5cyB8fCB0aGlzLl9vcHRpb25zLmV4cGlyYXRpb25EYXlzOyAvLyBsb2NhbFN0b3JhZ2UgaXMgc3BlY2lmaWMgdG8gc3ViZG9tYWluc1xuXG4gICAgICAgICAgdGhpcy5fb3B0aW9ucy5kb21haW4gPSBvcHRzLmRvbWFpbiB8fCB0aGlzLl9vcHRpb25zLmRvbWFpbiB8fCB3aW5kb3cgJiYgd2luZG93LmxvY2F0aW9uICYmIHdpbmRvdy5sb2NhdGlvbi5ob3N0bmFtZTtcbiAgICAgICAgICByZXR1cm4gdGhpcy5fb3B0aW9ucy5zZWN1cmUgPSBvcHRzLnNlY3VyZSB8fCBmYWxzZTtcbiAgICAgICAgfSxcbiAgICAgICAgZ2V0OiBmdW5jdGlvbiBnZXQobmFtZSkge1xuICAgICAgICAgIHRyeSB7XG4gICAgICAgICAgICByZXR1cm4gSlNPTi5wYXJzZShsb2NhbFN0b3JhZ2UkMS5nZXRJdGVtKGtleVByZWZpeCArIG5hbWUpKTtcbiAgICAgICAgICB9IGNhdGNoIChlKSB7fVxuXG4gICAgICAgICAgcmV0dXJuIG51bGw7XG4gICAgICAgIH0sXG4gICAgICAgIHNldDogZnVuY3Rpb24gc2V0KG5hbWUsIHZhbHVlKSB7XG4gICAgICAgICAgdHJ5IHtcbiAgICAgICAgICAgIGxvY2FsU3RvcmFnZSQxLnNldEl0ZW0oa2V5UHJlZml4ICsgbmFtZSwgSlNPTi5zdHJpbmdpZnkodmFsdWUpKTtcbiAgICAgICAgICAgIHJldHVybiB0cnVlO1xuICAgICAgICAgIH0gY2F0Y2ggKGUpIHt9XG5cbiAgICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgICAgIH0sXG4gICAgICAgIHJlbW92ZTogZnVuY3Rpb24gcmVtb3ZlKG5hbWUpIHtcbiAgICAgICAgICB0cnkge1xuICAgICAgICAgICAgbG9jYWxTdG9yYWdlJDEucmVtb3ZlSXRlbShrZXlQcmVmaXggKyBuYW1lKTtcbiAgICAgICAgICB9IGNhdGNoIChlKSB7XG4gICAgICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICB9O1xuICAgIH1cblxuICAgIHJldHVybiB0aGlzLnN0b3JhZ2U7XG4gIH07XG5cbiAgdmFyIE1ldGFkYXRhU3RvcmFnZSA9XG4gIC8qI19fUFVSRV9fKi9cbiAgZnVuY3Rpb24gKCkge1xuICAgIGZ1bmN0aW9uIE1ldGFkYXRhU3RvcmFnZShfcmVmKSB7XG4gICAgICB2YXIgc3RvcmFnZUtleSA9IF9yZWYuc3RvcmFnZUtleSxcbiAgICAgICAgICBkaXNhYmxlQ29va2llcyA9IF9yZWYuZGlzYWJsZUNvb2tpZXMsXG4gICAgICAgICAgZG9tYWluID0gX3JlZi5kb21haW4sXG4gICAgICAgICAgc2VjdXJlID0gX3JlZi5zZWN1cmUsXG4gICAgICAgICAgc2FtZVNpdGUgPSBfcmVmLnNhbWVTaXRlLFxuICAgICAgICAgIGV4cGlyYXRpb25EYXlzID0gX3JlZi5leHBpcmF0aW9uRGF5cztcblxuICAgICAgX2NsYXNzQ2FsbENoZWNrKHRoaXMsIE1ldGFkYXRhU3RvcmFnZSk7XG5cbiAgICAgIHRoaXMuc3RvcmFnZUtleSA9IHN0b3JhZ2VLZXk7XG4gICAgICB0aGlzLmRpc2FibGVDb29raWVTdG9yYWdlID0gIWJhc2VDb29raWUuYXJlQ29va2llc0VuYWJsZWQoKSB8fCBkaXNhYmxlQ29va2llcztcbiAgICAgIHRoaXMuZG9tYWluID0gZG9tYWluO1xuICAgICAgdGhpcy5zZWN1cmUgPSBzZWN1cmU7XG4gICAgICB0aGlzLnNhbWVTaXRlID0gc2FtZVNpdGU7XG4gICAgICB0aGlzLmV4cGlyYXRpb25EYXlzID0gZXhwaXJhdGlvbkRheXM7XG4gICAgICB0aGlzLmNvb2tpZURvbWFpbiA9ICcnO1xuXG4gICAgICB7XG4gICAgICAgIHZhciB3cml0YWJsZVRvcERvbWFpbiA9IHRvcERvbWFpbihnZXRMb2NhdGlvbigpLmhyZWYpO1xuICAgICAgICB0aGlzLmNvb2tpZURvbWFpbiA9IGRvbWFpbiB8fCAod3JpdGFibGVUb3BEb21haW4gPyAnLicgKyB3cml0YWJsZVRvcERvbWFpbiA6IG51bGwpO1xuICAgICAgfVxuICAgIH1cblxuICAgIF9jcmVhdGVDbGFzcyhNZXRhZGF0YVN0b3JhZ2UsIFt7XG4gICAgICBrZXk6IFwiZ2V0Q29va2llU3RvcmFnZUtleVwiLFxuICAgICAgdmFsdWU6IGZ1bmN0aW9uIGdldENvb2tpZVN0b3JhZ2VLZXkoKSB7XG4gICAgICAgIGlmICghdGhpcy5kb21haW4pIHtcbiAgICAgICAgICByZXR1cm4gdGhpcy5zdG9yYWdlS2V5O1xuICAgICAgICB9XG5cbiAgICAgICAgdmFyIHN1ZmZpeCA9IHRoaXMuZG9tYWluLmNoYXJBdCgwKSA9PT0gJy4nID8gdGhpcy5kb21haW4uc3Vic3RyaW5nKDEpIDogdGhpcy5kb21haW47XG4gICAgICAgIHJldHVybiBcIlwiLmNvbmNhdCh0aGlzLnN0b3JhZ2VLZXkpLmNvbmNhdChzdWZmaXggPyBcIl9cIi5jb25jYXQoc3VmZml4KSA6ICcnKTtcbiAgICAgIH1cbiAgICB9LCB7XG4gICAgICBrZXk6IFwic2F2ZVwiLFxuICAgICAgdmFsdWU6IGZ1bmN0aW9uIHNhdmUoX3JlZjIpIHtcbiAgICAgICAgdmFyIGRldmljZUlkID0gX3JlZjIuZGV2aWNlSWQsXG4gICAgICAgICAgICB1c2VySWQgPSBfcmVmMi51c2VySWQsXG4gICAgICAgICAgICBvcHRPdXQgPSBfcmVmMi5vcHRPdXQsXG4gICAgICAgICAgICBzZXNzaW9uSWQgPSBfcmVmMi5zZXNzaW9uSWQsXG4gICAgICAgICAgICBsYXN0RXZlbnRUaW1lID0gX3JlZjIubGFzdEV2ZW50VGltZSxcbiAgICAgICAgICAgIGV2ZW50SWQgPSBfcmVmMi5ldmVudElkLFxuICAgICAgICAgICAgaWRlbnRpZnlJZCA9IF9yZWYyLmlkZW50aWZ5SWQsXG4gICAgICAgICAgICBzZXF1ZW5jZU51bWJlciA9IF9yZWYyLnNlcXVlbmNlTnVtYmVyO1xuICAgICAgICAvLyBkbyBub3QgY2hhbmdlIHRoZSBvcmRlciBvZiB0aGVzZSBpdGVtc1xuICAgICAgICB2YXIgdmFsdWUgPSBbZGV2aWNlSWQsIEJhc2U2NC5lbmNvZGUodXNlcklkIHx8ICcnKSwgb3B0T3V0ID8gJzEnIDogJycsIHNlc3Npb25JZCA/IHNlc3Npb25JZC50b1N0cmluZygzMikgOiAnMCcsIGxhc3RFdmVudFRpbWUgPyBsYXN0RXZlbnRUaW1lLnRvU3RyaW5nKDMyKSA6ICcwJywgZXZlbnRJZCA/IGV2ZW50SWQudG9TdHJpbmcoMzIpIDogJzAnLCBpZGVudGlmeUlkID8gaWRlbnRpZnlJZC50b1N0cmluZygzMikgOiAnMCcsIHNlcXVlbmNlTnVtYmVyID8gc2VxdWVuY2VOdW1iZXIudG9TdHJpbmcoMzIpIDogJzAnXS5qb2luKCcuJyk7XG5cbiAgICAgICAgaWYgKHRoaXMuZGlzYWJsZUNvb2tpZVN0b3JhZ2UpIHtcbiAgICAgICAgICBsb2NhbFN0b3JhZ2UkMS5zZXRJdGVtKHRoaXMuc3RvcmFnZUtleSwgdmFsdWUpO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgIGJhc2VDb29raWUuc2V0KHRoaXMuZ2V0Q29va2llU3RvcmFnZUtleSgpLCB2YWx1ZSwge1xuICAgICAgICAgICAgZG9tYWluOiB0aGlzLmNvb2tpZURvbWFpbixcbiAgICAgICAgICAgIHNlY3VyZTogdGhpcy5zZWN1cmUsXG4gICAgICAgICAgICBzYW1lU2l0ZTogdGhpcy5zYW1lU2l0ZSxcbiAgICAgICAgICAgIGV4cGlyYXRpb25EYXlzOiB0aGlzLmV4cGlyYXRpb25EYXlzXG4gICAgICAgICAgfSk7XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICB9LCB7XG4gICAgICBrZXk6IFwibG9hZFwiLFxuICAgICAgdmFsdWU6IGZ1bmN0aW9uIGxvYWQoKSB7XG4gICAgICAgIHZhciBzdHI7XG5cbiAgICAgICAgaWYgKCF0aGlzLmRpc2FibGVDb29raWVTdG9yYWdlKSB7XG4gICAgICAgICAgc3RyID0gYmFzZUNvb2tpZS5nZXQodGhpcy5nZXRDb29raWVTdG9yYWdlS2V5KCkgKyAnPScpO1xuICAgICAgICB9XG5cbiAgICAgICAgaWYgKCFzdHIpIHtcbiAgICAgICAgICBzdHIgPSBsb2NhbFN0b3JhZ2UkMS5nZXRJdGVtKHRoaXMuc3RvcmFnZUtleSk7XG4gICAgICAgIH1cblxuICAgICAgICBpZiAoIXN0cikge1xuICAgICAgICAgIHJldHVybiBudWxsO1xuICAgICAgICB9XG5cbiAgICAgICAgdmFyIHZhbHVlcyA9IHN0ci5zcGxpdCgnLicpO1xuICAgICAgICB2YXIgdXNlcklkID0gbnVsbDtcblxuICAgICAgICBpZiAodmFsdWVzWzFdKSB7XG4gICAgICAgICAgdHJ5IHtcbiAgICAgICAgICAgIHVzZXJJZCA9IEJhc2U2NC5kZWNvZGUodmFsdWVzWzFdKTtcbiAgICAgICAgICB9IGNhdGNoIChlKSB7XG4gICAgICAgICAgICB1c2VySWQgPSBudWxsO1xuICAgICAgICAgIH1cbiAgICAgICAgfVxuXG4gICAgICAgIHJldHVybiB7XG4gICAgICAgICAgZGV2aWNlSWQ6IHZhbHVlc1swXSxcbiAgICAgICAgICB1c2VySWQ6IHVzZXJJZCxcbiAgICAgICAgICBvcHRPdXQ6IHZhbHVlc1syXSA9PT0gJzEnLFxuICAgICAgICAgIHNlc3Npb25JZDogcGFyc2VJbnQodmFsdWVzWzNdLCAzMiksXG4gICAgICAgICAgbGFzdEV2ZW50VGltZTogcGFyc2VJbnQodmFsdWVzWzRdLCAzMiksXG4gICAgICAgICAgZXZlbnRJZDogcGFyc2VJbnQodmFsdWVzWzVdLCAzMiksXG4gICAgICAgICAgaWRlbnRpZnlJZDogcGFyc2VJbnQodmFsdWVzWzZdLCAzMiksXG4gICAgICAgICAgc2VxdWVuY2VOdW1iZXI6IHBhcnNlSW50KHZhbHVlc1s3XSwgMzIpXG4gICAgICAgIH07XG4gICAgICB9XG4gICAgfV0pO1xuXG4gICAgcmV0dXJuIE1ldGFkYXRhU3RvcmFnZTtcbiAgfSgpO1xuXG4gIHZhciBnZXRVdG1EYXRhID0gZnVuY3Rpb24gZ2V0VXRtRGF0YShyYXdDb29raWUsIHF1ZXJ5KSB7XG4gICAgLy8gVHJhbnNsYXRlIHRoZSB1dG16IGNvb2tpZSBmb3JtYXQgaW50byB1cmwgcXVlcnkgc3RyaW5nIGZvcm1hdC5cbiAgICB2YXIgY29va2llID0gcmF3Q29va2llID8gJz8nICsgcmF3Q29va2llLnNwbGl0KCcuJykuc2xpY2UoLTEpWzBdLnJlcGxhY2UoL1xcfC9nLCAnJicpIDogJyc7XG5cbiAgICB2YXIgZmV0Y2hQYXJhbSA9IGZ1bmN0aW9uIGZldGNoUGFyYW0ocXVlcnlOYW1lLCBxdWVyeSwgY29va2llTmFtZSwgY29va2llKSB7XG4gICAgICByZXR1cm4gdXRpbHMuZ2V0UXVlcnlQYXJhbShxdWVyeU5hbWUsIHF1ZXJ5KSB8fCB1dGlscy5nZXRRdWVyeVBhcmFtKGNvb2tpZU5hbWUsIGNvb2tpZSk7XG4gICAgfTtcblxuICAgIHZhciB1dG1Tb3VyY2UgPSBmZXRjaFBhcmFtKENvbnN0YW50cy5VVE1fU09VUkNFLCBxdWVyeSwgJ3V0bWNzcicsIGNvb2tpZSk7XG4gICAgdmFyIHV0bU1lZGl1bSA9IGZldGNoUGFyYW0oQ29uc3RhbnRzLlVUTV9NRURJVU0sIHF1ZXJ5LCAndXRtY21kJywgY29va2llKTtcbiAgICB2YXIgdXRtQ2FtcGFpZ24gPSBmZXRjaFBhcmFtKENvbnN0YW50cy5VVE1fQ0FNUEFJR04sIHF1ZXJ5LCAndXRtY2NuJywgY29va2llKTtcbiAgICB2YXIgdXRtVGVybSA9IGZldGNoUGFyYW0oQ29uc3RhbnRzLlVUTV9URVJNLCBxdWVyeSwgJ3V0bWN0cicsIGNvb2tpZSk7XG4gICAgdmFyIHV0bUNvbnRlbnQgPSBmZXRjaFBhcmFtKENvbnN0YW50cy5VVE1fQ09OVEVOVCwgcXVlcnksICd1dG1jY3QnLCBjb29raWUpO1xuICAgIHZhciB1dG1EYXRhID0ge307XG5cbiAgICB2YXIgYWRkSWZOb3ROdWxsID0gZnVuY3Rpb24gYWRkSWZOb3ROdWxsKGtleSwgdmFsdWUpIHtcbiAgICAgIGlmICghdXRpbHMuaXNFbXB0eVN0cmluZyh2YWx1ZSkpIHtcbiAgICAgICAgdXRtRGF0YVtrZXldID0gdmFsdWU7XG4gICAgICB9XG4gICAgfTtcblxuICAgIGFkZElmTm90TnVsbChDb25zdGFudHMuVVRNX1NPVVJDRSwgdXRtU291cmNlKTtcbiAgICBhZGRJZk5vdE51bGwoQ29uc3RhbnRzLlVUTV9NRURJVU0sIHV0bU1lZGl1bSk7XG4gICAgYWRkSWZOb3ROdWxsKENvbnN0YW50cy5VVE1fQ0FNUEFJR04sIHV0bUNhbXBhaWduKTtcbiAgICBhZGRJZk5vdE51bGwoQ29uc3RhbnRzLlVUTV9URVJNLCB1dG1UZXJtKTtcbiAgICBhZGRJZk5vdE51bGwoQ29uc3RhbnRzLlVUTV9DT05URU5ULCB1dG1Db250ZW50KTtcbiAgICByZXR1cm4gdXRtRGF0YTtcbiAgfTtcblxuICAvKlxuICAgKiBXcmFwcGVyIGZvciBhIHVzZXIgcHJvcGVydGllcyBKU09OIG9iamVjdCB0aGF0IHN1cHBvcnRzIG9wZXJhdGlvbnMuXG4gICAqIE5vdGU6IGlmIGEgdXNlciBwcm9wZXJ0eSBpcyB1c2VkIGluIG11bHRpcGxlIG9wZXJhdGlvbnMgb24gdGhlIHNhbWUgSWRlbnRpZnkgb2JqZWN0LFxuICAgKiBvbmx5IHRoZSBmaXJzdCBvcGVyYXRpb24gd2lsbCBiZSBzYXZlZCwgYW5kIHRoZSByZXN0IHdpbGwgYmUgaWdub3JlZC5cbiAgICovXG5cbiAgdmFyIEFNUF9PUF9BREQgPSAnJGFkZCc7XG4gIHZhciBBTVBfT1BfQVBQRU5EID0gJyRhcHBlbmQnO1xuICB2YXIgQU1QX09QX0NMRUFSX0FMTCA9ICckY2xlYXJBbGwnO1xuICB2YXIgQU1QX09QX1BSRVBFTkQgPSAnJHByZXBlbmQnO1xuICB2YXIgQU1QX09QX1NFVCA9ICckc2V0JztcbiAgdmFyIEFNUF9PUF9TRVRfT05DRSA9ICckc2V0T25jZSc7XG4gIHZhciBBTVBfT1BfVU5TRVQgPSAnJHVuc2V0JztcbiAgLyoqXG4gICAqIElkZW50aWZ5IEFQSSAtIGluc3RhbmNlIGNvbnN0cnVjdG9yLiBJZGVudGlmeSBvYmplY3RzIGFyZSBhIHdyYXBwZXIgZm9yIHVzZXIgcHJvcGVydHkgb3BlcmF0aW9ucy5cbiAgICogRWFjaCBtZXRob2QgYWRkcyBhIHVzZXIgcHJvcGVydHkgb3BlcmF0aW9uIHRvIHRoZSBJZGVudGlmeSBvYmplY3QsIGFuZCByZXR1cm5zIHRoZSBzYW1lIElkZW50aWZ5IG9iamVjdCxcbiAgICogYWxsb3dpbmcgeW91IHRvIGNoYWluIG11bHRpcGxlIG1ldGhvZCBjYWxscyB0b2dldGhlci5cbiAgICogTm90ZTogaWYgdGhlIHNhbWUgdXNlciBwcm9wZXJ0eSBpcyB1c2VkIGluIG11bHRpcGxlIG9wZXJhdGlvbnMgb24gYSBzaW5nbGUgSWRlbnRpZnkgb2JqZWN0LFxuICAgKiBvbmx5IHRoZSBmaXJzdCBvcGVyYXRpb24gb24gdGhhdCBwcm9wZXJ0eSB3aWxsIGJlIHNhdmVkLCBhbmQgdGhlIHJlc3Qgd2lsbCBiZSBpZ25vcmVkLlxuICAgKiBTZWUgW1JlYWRtZV17QGxpbmsgaHR0cHM6Ly9naXRodWIuY29tL2FtcGxpdHVkZS9BbXBsaXR1ZGUtSmF2YXNjcmlwdCN1c2VyLXByb3BlcnRpZXMtYW5kLXVzZXItcHJvcGVydHktb3BlcmF0aW9uc31cbiAgICogZm9yIG1vcmUgaW5mb3JtYXRpb24gb24gdGhlIElkZW50aWZ5IEFQSSBhbmQgdXNlciBwcm9wZXJ0eSBvcGVyYXRpb25zLlxuICAgKiBAY29uc3RydWN0b3IgSWRlbnRpZnlcbiAgICogQHB1YmxpY1xuICAgKiBAZXhhbXBsZSB2YXIgaWRlbnRpZnkgPSBuZXcgYW1wbGl0dWRlLklkZW50aWZ5KCk7XG4gICAqL1xuXG4gIHZhciBJZGVudGlmeSA9IGZ1bmN0aW9uIElkZW50aWZ5KCkge1xuICAgIHRoaXMudXNlclByb3BlcnRpZXNPcGVyYXRpb25zID0ge307XG4gICAgdGhpcy5wcm9wZXJ0aWVzID0gW107IC8vIGtlZXAgdHJhY2sgb2Yga2V5cyB0aGF0IGhhdmUgYmVlbiBhZGRlZFxuICB9O1xuICAvKipcbiAgICogSW5jcmVtZW50IGEgdXNlciBwcm9wZXJ0eSBieSBhIGdpdmVuIHZhbHVlIChjYW4gYWxzbyBiZSBuZWdhdGl2ZSB0byBkZWNyZW1lbnQpLlxuICAgKiBJZiB0aGUgdXNlciBwcm9wZXJ0eSBkb2VzIG5vdCBoYXZlIGEgdmFsdWUgc2V0IHlldCwgaXQgd2lsbCBiZSBpbml0aWFsaXplZCB0byAwIGJlZm9yZSBiZWluZyBpbmNyZW1lbnRlZC5cbiAgICogQHB1YmxpY1xuICAgKiBAcGFyYW0ge3N0cmluZ30gcHJvcGVydHkgLSBUaGUgdXNlciBwcm9wZXJ0eSBrZXkuXG4gICAqIEBwYXJhbSB7bnVtYmVyfHN0cmluZ30gdmFsdWUgLSBUaGUgYW1vdW50IGJ5IHdoaWNoIHRvIGluY3JlbWVudCB0aGUgdXNlciBwcm9wZXJ0eS4gQWxsb3dzIG51bWJlcnMgYXMgc3RyaW5ncyAoZXg6ICcxMjMnKS5cbiAgICogQHJldHVybiB7SWRlbnRpZnl9IFJldHVybnMgdGhlIHNhbWUgSWRlbnRpZnkgb2JqZWN0LCBhbGxvd2luZyB5b3UgdG8gY2hhaW4gbXVsdGlwbGUgbWV0aG9kIGNhbGxzIHRvZ2V0aGVyLlxuICAgKiBAZXhhbXBsZSB2YXIgaWRlbnRpZnkgPSBuZXcgYW1wbGl0dWRlLklkZW50aWZ5KCkuYWRkKCdrYXJtYScsIDEpLmFkZCgnZnJpZW5kcycsIDEpO1xuICAgKiBhbXBsaXR1ZGUuaWRlbnRpZnkoaWRlbnRpZnkpOyAvLyBzZW5kIHRoZSBJZGVudGlmeSBjYWxsXG4gICAqL1xuXG5cbiAgSWRlbnRpZnkucHJvdG90eXBlLmFkZCA9IGZ1bmN0aW9uIChwcm9wZXJ0eSwgdmFsdWUpIHtcbiAgICBpZiAodHlwZSh2YWx1ZSkgPT09ICdudW1iZXInIHx8IHR5cGUodmFsdWUpID09PSAnc3RyaW5nJykge1xuICAgICAgdGhpcy5fYWRkT3BlcmF0aW9uKEFNUF9PUF9BREQsIHByb3BlcnR5LCB2YWx1ZSk7XG4gICAgfSBlbHNlIHtcbiAgICAgIHV0aWxzLmxvZy5lcnJvcignVW5zdXBwb3J0ZWQgdHlwZSBmb3IgdmFsdWU6ICcgKyB0eXBlKHZhbHVlKSArICcsIGV4cGVjdGluZyBudW1iZXIgb3Igc3RyaW5nJyk7XG4gICAgfVxuXG4gICAgcmV0dXJuIHRoaXM7XG4gIH07XG4gIC8qKlxuICAgKiBBcHBlbmQgYSB2YWx1ZSBvciB2YWx1ZXMgdG8gYSB1c2VyIHByb3BlcnR5LlxuICAgKiBJZiB0aGUgdXNlciBwcm9wZXJ0eSBkb2VzIG5vdCBoYXZlIGEgdmFsdWUgc2V0IHlldCxcbiAgICogaXQgd2lsbCBiZSBpbml0aWFsaXplZCB0byBhbiBlbXB0eSBsaXN0IGJlZm9yZSB0aGUgbmV3IHZhbHVlcyBhcmUgYXBwZW5kZWQuXG4gICAqIElmIHRoZSB1c2VyIHByb3BlcnR5IGhhcyBhbiBleGlzdGluZyB2YWx1ZSBhbmQgaXQgaXMgbm90IGEgbGlzdCxcbiAgICogdGhlIGV4aXN0aW5nIHZhbHVlIHdpbGwgYmUgY29udmVydGVkIGludG8gYSBsaXN0IHdpdGggdGhlIG5ldyB2YWx1ZXMgYXBwZW5kZWQuXG4gICAqIEBwdWJsaWNcbiAgICogQHBhcmFtIHtzdHJpbmd9IHByb3BlcnR5IC0gVGhlIHVzZXIgcHJvcGVydHkga2V5LlxuICAgKiBAcGFyYW0ge251bWJlcnxzdHJpbmd8bGlzdHxvYmplY3R9IHZhbHVlIC0gQSB2YWx1ZSBvciB2YWx1ZXMgdG8gYXBwZW5kLlxuICAgKiBWYWx1ZXMgY2FuIGJlIG51bWJlcnMsIHN0cmluZ3MsIGxpc3RzLCBvciBvYmplY3QgKGtleTp2YWx1ZSBkaWN0IHdpbGwgYmUgZmxhdHRlbmVkKS5cbiAgICogQHJldHVybiB7SWRlbnRpZnl9IFJldHVybnMgdGhlIHNhbWUgSWRlbnRpZnkgb2JqZWN0LCBhbGxvd2luZyB5b3UgdG8gY2hhaW4gbXVsdGlwbGUgbWV0aG9kIGNhbGxzIHRvZ2V0aGVyLlxuICAgKiBAZXhhbXBsZSB2YXIgaWRlbnRpZnkgPSBuZXcgYW1wbGl0dWRlLklkZW50aWZ5KCkuYXBwZW5kKCdhYi10ZXN0cycsICduZXctdXNlci10ZXN0cycpO1xuICAgKiBpZGVudGlmeS5hcHBlbmQoJ3NvbWVfbGlzdCcsIFsxLCAyLCAzLCA0LCAndmFsdWVzJ10pO1xuICAgKiBhbXBsaXR1ZGUuaWRlbnRpZnkoaWRlbnRpZnkpOyAvLyBzZW5kIHRoZSBJZGVudGlmeSBjYWxsXG4gICAqL1xuXG5cbiAgSWRlbnRpZnkucHJvdG90eXBlLmFwcGVuZCA9IGZ1bmN0aW9uIChwcm9wZXJ0eSwgdmFsdWUpIHtcbiAgICB0aGlzLl9hZGRPcGVyYXRpb24oQU1QX09QX0FQUEVORCwgcHJvcGVydHksIHZhbHVlKTtcblxuICAgIHJldHVybiB0aGlzO1xuICB9O1xuICAvKipcbiAgICogQ2xlYXIgYWxsIHVzZXIgcHJvcGVydGllcyBmb3IgdGhlIGN1cnJlbnQgdXNlci5cbiAgICogU0RLIHVzZXIgc2hvdWxkIGluc3RlYWQgY2FsbCBhbXBsaXR1ZGUuY2xlYXJVc2VyUHJvcGVydGllcygpIGluc3RlYWQgb2YgdXNpbmcgdGhpcy5cbiAgICogJGNsZWFyQWxsIG5lZWRzIHRvIGJlIHNlbnQgb24gaXRzIG93biBJZGVudGlmeSBvYmplY3QuIElmIHRoZXJlIGFyZSBhbHJlYWR5IG90aGVyIG9wZXJhdGlvbnMsIHRoZW4gZG9uJ3QgYWRkICRjbGVhckFsbC5cbiAgICogSWYgJGNsZWFyQWxsIGFscmVhZHkgaW4gYW4gSWRlbnRpZnkgb2JqZWN0LCBkb24ndCBhbGxvdyBvdGhlciBvcGVyYXRpb25zIHRvIGJlIGFkZGVkLlxuICAgKiBAcHJpdmF0ZVxuICAgKi9cblxuXG4gIElkZW50aWZ5LnByb3RvdHlwZS5jbGVhckFsbCA9IGZ1bmN0aW9uICgpIHtcbiAgICBpZiAoT2JqZWN0LmtleXModGhpcy51c2VyUHJvcGVydGllc09wZXJhdGlvbnMpLmxlbmd0aCA+IDApIHtcbiAgICAgIGlmICghdGhpcy51c2VyUHJvcGVydGllc09wZXJhdGlvbnMuaGFzT3duUHJvcGVydHkoQU1QX09QX0NMRUFSX0FMTCkpIHtcbiAgICAgICAgdXRpbHMubG9nLmVycm9yKCdOZWVkIHRvIHNlbmQgJGNsZWFyQWxsIG9uIGl0cyBvd24gSWRlbnRpZnkgb2JqZWN0IHdpdGhvdXQgYW55IG90aGVyIG9wZXJhdGlvbnMsIHNraXBwaW5nICRjbGVhckFsbCcpO1xuICAgICAgfVxuXG4gICAgICByZXR1cm4gdGhpcztcbiAgICB9XG5cbiAgICB0aGlzLnVzZXJQcm9wZXJ0aWVzT3BlcmF0aW9uc1tBTVBfT1BfQ0xFQVJfQUxMXSA9ICctJztcbiAgICByZXR1cm4gdGhpcztcbiAgfTtcbiAgLyoqXG4gICAqIFByZXBlbmQgYSB2YWx1ZSBvciB2YWx1ZXMgdG8gYSB1c2VyIHByb3BlcnR5LlxuICAgKiBQcmVwZW5kIG1lYW5zIGluc2VydGluZyB0aGUgdmFsdWUgb3IgdmFsdWVzIGF0IHRoZSBmcm9udCBvZiBhIGxpc3QuXG4gICAqIElmIHRoZSB1c2VyIHByb3BlcnR5IGRvZXMgbm90IGhhdmUgYSB2YWx1ZSBzZXQgeWV0LFxuICAgKiBpdCB3aWxsIGJlIGluaXRpYWxpemVkIHRvIGFuIGVtcHR5IGxpc3QgYmVmb3JlIHRoZSBuZXcgdmFsdWVzIGFyZSBwcmVwZW5kZWQuXG4gICAqIElmIHRoZSB1c2VyIHByb3BlcnR5IGhhcyBhbiBleGlzdGluZyB2YWx1ZSBhbmQgaXQgaXMgbm90IGEgbGlzdCxcbiAgICogdGhlIGV4aXN0aW5nIHZhbHVlIHdpbGwgYmUgY29udmVydGVkIGludG8gYSBsaXN0IHdpdGggdGhlIG5ldyB2YWx1ZXMgcHJlcGVuZGVkLlxuICAgKiBAcHVibGljXG4gICAqIEBwYXJhbSB7c3RyaW5nfSBwcm9wZXJ0eSAtIFRoZSB1c2VyIHByb3BlcnR5IGtleS5cbiAgICogQHBhcmFtIHtudW1iZXJ8c3RyaW5nfGxpc3R8b2JqZWN0fSB2YWx1ZSAtIEEgdmFsdWUgb3IgdmFsdWVzIHRvIHByZXBlbmQuXG4gICAqIFZhbHVlcyBjYW4gYmUgbnVtYmVycywgc3RyaW5ncywgbGlzdHMsIG9yIG9iamVjdCAoa2V5OnZhbHVlIGRpY3Qgd2lsbCBiZSBmbGF0dGVuZWQpLlxuICAgKiBAcmV0dXJuIHtJZGVudGlmeX0gUmV0dXJucyB0aGUgc2FtZSBJZGVudGlmeSBvYmplY3QsIGFsbG93aW5nIHlvdSB0byBjaGFpbiBtdWx0aXBsZSBtZXRob2QgY2FsbHMgdG9nZXRoZXIuXG4gICAqIEBleGFtcGxlIHZhciBpZGVudGlmeSA9IG5ldyBhbXBsaXR1ZGUuSWRlbnRpZnkoKS5wcmVwZW5kKCdhYi10ZXN0cycsICduZXctdXNlci10ZXN0cycpO1xuICAgKiBpZGVudGlmeS5wcmVwZW5kKCdzb21lX2xpc3QnLCBbMSwgMiwgMywgNCwgJ3ZhbHVlcyddKTtcbiAgICogYW1wbGl0dWRlLmlkZW50aWZ5KGlkZW50aWZ5KTsgLy8gc2VuZCB0aGUgSWRlbnRpZnkgY2FsbFxuICAgKi9cblxuXG4gIElkZW50aWZ5LnByb3RvdHlwZS5wcmVwZW5kID0gZnVuY3Rpb24gKHByb3BlcnR5LCB2YWx1ZSkge1xuICAgIHRoaXMuX2FkZE9wZXJhdGlvbihBTVBfT1BfUFJFUEVORCwgcHJvcGVydHksIHZhbHVlKTtcblxuICAgIHJldHVybiB0aGlzO1xuICB9O1xuICAvKipcbiAgICogU2V0cyB0aGUgdmFsdWUgb2YgYSBnaXZlbiB1c2VyIHByb3BlcnR5LiBJZiBhIHZhbHVlIGFscmVhZHkgZXhpc3RzLCBpdCB3aWxsIGJlIG92ZXJ3cml0ZW4gd2l0aCB0aGUgbmV3IHZhbHVlLlxuICAgKiBAcHVibGljXG4gICAqIEBwYXJhbSB7c3RyaW5nfSBwcm9wZXJ0eSAtIFRoZSB1c2VyIHByb3BlcnR5IGtleS5cbiAgICogQHBhcmFtIHtudW1iZXJ8c3RyaW5nfGxpc3R8Ym9vbGVhbnxvYmplY3R9IHZhbHVlIC0gQSB2YWx1ZSBvciB2YWx1ZXMgdG8gc2V0LlxuICAgKiBWYWx1ZXMgY2FuIGJlIG51bWJlcnMsIHN0cmluZ3MsIGxpc3RzLCBvciBvYmplY3QgKGtleTp2YWx1ZSBkaWN0IHdpbGwgYmUgZmxhdHRlbmVkKS5cbiAgICogQHJldHVybiB7SWRlbnRpZnl9IFJldHVybnMgdGhlIHNhbWUgSWRlbnRpZnkgb2JqZWN0LCBhbGxvd2luZyB5b3UgdG8gY2hhaW4gbXVsdGlwbGUgbWV0aG9kIGNhbGxzIHRvZ2V0aGVyLlxuICAgKiBAZXhhbXBsZSB2YXIgaWRlbnRpZnkgPSBuZXcgYW1wbGl0dWRlLklkZW50aWZ5KCkuc2V0KCd1c2VyX3R5cGUnLCAnYmV0YScpO1xuICAgKiBpZGVudGlmeS5zZXQoJ25hbWUnLCB7J2ZpcnN0JzogJ0pvaG4nLCAnbGFzdCc6ICdEb2UnfSk7IC8vIGRpY3QgaXMgZmxhdHRlbmVkIGFuZCBiZWNvbWVzIG5hbWUuZmlyc3Q6IEpvaG4sIG5hbWUubGFzdDogRG9lXG4gICAqIGFtcGxpdHVkZS5pZGVudGlmeShpZGVudGlmeSk7IC8vIHNlbmQgdGhlIElkZW50aWZ5IGNhbGxcbiAgICovXG5cblxuICBJZGVudGlmeS5wcm90b3R5cGUuc2V0ID0gZnVuY3Rpb24gKHByb3BlcnR5LCB2YWx1ZSkge1xuICAgIHRoaXMuX2FkZE9wZXJhdGlvbihBTVBfT1BfU0VULCBwcm9wZXJ0eSwgdmFsdWUpO1xuXG4gICAgcmV0dXJuIHRoaXM7XG4gIH07XG4gIC8qKlxuICAgKiBTZXRzIHRoZSB2YWx1ZSBvZiBhIGdpdmVuIHVzZXIgcHJvcGVydHkgb25seSBvbmNlLiBTdWJzZXF1ZW50IHNldE9uY2Ugb3BlcmF0aW9ucyBvbiB0aGF0IHVzZXIgcHJvcGVydHkgd2lsbCBiZSBpZ25vcmVkO1xuICAgKiBob3dldmVyLCB0aGF0IHVzZXIgcHJvcGVydHkgY2FuIHN0aWxsIGJlIG1vZGlmaWVkIHRocm91Z2ggYW55IG9mIHRoZSBvdGhlciBvcGVyYXRpb25zLlxuICAgKiBVc2VmdWwgZm9yIGNhcHR1cmluZyBwcm9wZXJ0aWVzIHN1Y2ggYXMgJ2luaXRpYWxfc2lnbnVwX2RhdGUnLCAnaW5pdGlhbF9yZWZlcnJlcicsIGV0Yy5cbiAgICogQHB1YmxpY1xuICAgKiBAcGFyYW0ge3N0cmluZ30gcHJvcGVydHkgLSBUaGUgdXNlciBwcm9wZXJ0eSBrZXkuXG4gICAqIEBwYXJhbSB7bnVtYmVyfHN0cmluZ3xsaXN0fGJvb2xlYW58b2JqZWN0fSB2YWx1ZSAtIEEgdmFsdWUgb3IgdmFsdWVzIHRvIHNldCBvbmNlLlxuICAgKiBWYWx1ZXMgY2FuIGJlIG51bWJlcnMsIHN0cmluZ3MsIGxpc3RzLCBvciBvYmplY3QgKGtleTp2YWx1ZSBkaWN0IHdpbGwgYmUgZmxhdHRlbmVkKS5cbiAgICogQHJldHVybiB7SWRlbnRpZnl9IFJldHVybnMgdGhlIHNhbWUgSWRlbnRpZnkgb2JqZWN0LCBhbGxvd2luZyB5b3UgdG8gY2hhaW4gbXVsdGlwbGUgbWV0aG9kIGNhbGxzIHRvZ2V0aGVyLlxuICAgKiBAZXhhbXBsZSB2YXIgaWRlbnRpZnkgPSBuZXcgYW1wbGl0dWRlLklkZW50aWZ5KCkuc2V0T25jZSgnc2lnbl91cF9kYXRlJywgJzIwMTYtMDQtMDEnKTtcbiAgICogYW1wbGl0dWRlLmlkZW50aWZ5KGlkZW50aWZ5KTsgLy8gc2VuZCB0aGUgSWRlbnRpZnkgY2FsbFxuICAgKi9cblxuXG4gIElkZW50aWZ5LnByb3RvdHlwZS5zZXRPbmNlID0gZnVuY3Rpb24gKHByb3BlcnR5LCB2YWx1ZSkge1xuICAgIHRoaXMuX2FkZE9wZXJhdGlvbihBTVBfT1BfU0VUX09OQ0UsIHByb3BlcnR5LCB2YWx1ZSk7XG5cbiAgICByZXR1cm4gdGhpcztcbiAgfTtcbiAgLyoqXG4gICAqIFVuc2V0IGFuZCByZW1vdmUgYSB1c2VyIHByb3BlcnR5LiBUaGlzIHVzZXIgcHJvcGVydHkgd2lsbCBubyBsb25nZXIgc2hvdyB1cCBpbiBhIHVzZXIncyBwcm9maWxlLlxuICAgKiBAcHVibGljXG4gICAqIEBwYXJhbSB7c3RyaW5nfSBwcm9wZXJ0eSAtIFRoZSB1c2VyIHByb3BlcnR5IGtleS5cbiAgICogQHJldHVybiB7SWRlbnRpZnl9IFJldHVybnMgdGhlIHNhbWUgSWRlbnRpZnkgb2JqZWN0LCBhbGxvd2luZyB5b3UgdG8gY2hhaW4gbXVsdGlwbGUgbWV0aG9kIGNhbGxzIHRvZ2V0aGVyLlxuICAgKiBAZXhhbXBsZSB2YXIgaWRlbnRpZnkgPSBuZXcgYW1wbGl0dWRlLklkZW50aWZ5KCkudW5zZXQoJ3VzZXJfdHlwZScpLnVuc2V0KCdhZ2UnKTtcbiAgICogYW1wbGl0dWRlLmlkZW50aWZ5KGlkZW50aWZ5KTsgLy8gc2VuZCB0aGUgSWRlbnRpZnkgY2FsbFxuICAgKi9cblxuXG4gIElkZW50aWZ5LnByb3RvdHlwZS51bnNldCA9IGZ1bmN0aW9uIChwcm9wZXJ0eSkge1xuICAgIHRoaXMuX2FkZE9wZXJhdGlvbihBTVBfT1BfVU5TRVQsIHByb3BlcnR5LCAnLScpO1xuXG4gICAgcmV0dXJuIHRoaXM7XG4gIH07XG4gIC8qKlxuICAgKiBIZWxwZXIgZnVuY3Rpb24gdGhhdCBhZGRzIG9wZXJhdGlvbiB0byB0aGUgSWRlbnRpZnkncyBvYmplY3RcbiAgICogSGFuZGxlJ3MgZmlsdGVyaW5nIG9mIGR1cGxpY2F0ZSB1c2VyIHByb3BlcnR5IGtleXMsIGFuZCBmaWx0ZXJpbmcgZm9yIGNsZWFyQWxsLlxuICAgKiBAcHJpdmF0ZVxuICAgKi9cblxuXG4gIElkZW50aWZ5LnByb3RvdHlwZS5fYWRkT3BlcmF0aW9uID0gZnVuY3Rpb24gKG9wZXJhdGlvbiwgcHJvcGVydHksIHZhbHVlKSB7XG4gICAgLy8gY2hlY2sgdGhhdCB0aGUgaWRlbnRpZnkgZG9lc24ndCBhbHJlYWR5IGNvbnRhaW4gYSBjbGVhckFsbFxuICAgIGlmICh0aGlzLnVzZXJQcm9wZXJ0aWVzT3BlcmF0aW9ucy5oYXNPd25Qcm9wZXJ0eShBTVBfT1BfQ0xFQVJfQUxMKSkge1xuICAgICAgdXRpbHMubG9nLmVycm9yKCdUaGlzIGlkZW50aWZ5IGFscmVhZHkgY29udGFpbnMgYSAkY2xlYXJBbGwgb3BlcmF0aW9uLCBza2lwcGluZyBvcGVyYXRpb24gJyArIG9wZXJhdGlvbik7XG4gICAgICByZXR1cm47XG4gICAgfSAvLyBjaGVjayB0aGF0IHByb3BlcnR5IHdhc24ndCBhbHJlYWR5IHVzZWQgaW4gdGhpcyBJZGVudGlmeVxuXG5cbiAgICBpZiAodGhpcy5wcm9wZXJ0aWVzLmluZGV4T2YocHJvcGVydHkpICE9PSAtMSkge1xuICAgICAgdXRpbHMubG9nLmVycm9yKCdVc2VyIHByb3BlcnR5IFwiJyArIHByb3BlcnR5ICsgJ1wiIGFscmVhZHkgdXNlZCBpbiB0aGlzIGlkZW50aWZ5LCBza2lwcGluZyBvcGVyYXRpb24gJyArIG9wZXJhdGlvbik7XG4gICAgICByZXR1cm47XG4gICAgfVxuXG4gICAgaWYgKCF0aGlzLnVzZXJQcm9wZXJ0aWVzT3BlcmF0aW9ucy5oYXNPd25Qcm9wZXJ0eShvcGVyYXRpb24pKSB7XG4gICAgICB0aGlzLnVzZXJQcm9wZXJ0aWVzT3BlcmF0aW9uc1tvcGVyYXRpb25dID0ge307XG4gICAgfVxuXG4gICAgdGhpcy51c2VyUHJvcGVydGllc09wZXJhdGlvbnNbb3BlcmF0aW9uXVtwcm9wZXJ0eV0gPSB2YWx1ZTtcbiAgICB0aGlzLnByb3BlcnRpZXMucHVzaChwcm9wZXJ0eSk7XG4gIH07XG5cbiAgdmFyIGNvbW1vbmpzR2xvYmFsID0gdHlwZW9mIHdpbmRvdyAhPT0gJ3VuZGVmaW5lZCcgPyB3aW5kb3cgOiB0eXBlb2YgZ2xvYmFsICE9PSAndW5kZWZpbmVkJyA/IGdsb2JhbCA6IHR5cGVvZiBzZWxmICE9PSAndW5kZWZpbmVkJyA/IHNlbGYgOiB7fTtcblxuICBmdW5jdGlvbiBjcmVhdGVDb21tb25qc01vZHVsZShmbiwgbW9kdWxlKSB7XG4gIFx0cmV0dXJuIG1vZHVsZSA9IHsgZXhwb3J0czoge30gfSwgZm4obW9kdWxlLCBtb2R1bGUuZXhwb3J0cyksIG1vZHVsZS5leHBvcnRzO1xuICB9XG5cbiAgdmFyIG1kNSA9IGNyZWF0ZUNvbW1vbmpzTW9kdWxlKGZ1bmN0aW9uIChtb2R1bGUpIHtcbiAgKGZ1bmN0aW9uICgkKSB7XG5cbiAgICAvKlxuICAgICogQWRkIGludGVnZXJzLCB3cmFwcGluZyBhdCAyXjMyLiBUaGlzIHVzZXMgMTYtYml0IG9wZXJhdGlvbnMgaW50ZXJuYWxseVxuICAgICogdG8gd29yayBhcm91bmQgYnVncyBpbiBzb21lIEpTIGludGVycHJldGVycy5cbiAgICAqL1xuICAgIGZ1bmN0aW9uIHNhZmVBZGQgKHgsIHkpIHtcbiAgICAgIHZhciBsc3cgPSAoeCAmIDB4ZmZmZikgKyAoeSAmIDB4ZmZmZik7XG4gICAgICB2YXIgbXN3ID0gKHggPj4gMTYpICsgKHkgPj4gMTYpICsgKGxzdyA+PiAxNik7XG4gICAgICByZXR1cm4gKG1zdyA8PCAxNikgfCAobHN3ICYgMHhmZmZmKVxuICAgIH1cblxuICAgIC8qXG4gICAgKiBCaXR3aXNlIHJvdGF0ZSBhIDMyLWJpdCBudW1iZXIgdG8gdGhlIGxlZnQuXG4gICAgKi9cbiAgICBmdW5jdGlvbiBiaXRSb3RhdGVMZWZ0IChudW0sIGNudCkge1xuICAgICAgcmV0dXJuIChudW0gPDwgY250KSB8IChudW0gPj4+ICgzMiAtIGNudCkpXG4gICAgfVxuXG4gICAgLypcbiAgICAqIFRoZXNlIGZ1bmN0aW9ucyBpbXBsZW1lbnQgdGhlIGZvdXIgYmFzaWMgb3BlcmF0aW9ucyB0aGUgYWxnb3JpdGhtIHVzZXMuXG4gICAgKi9cbiAgICBmdW5jdGlvbiBtZDVjbW4gKHEsIGEsIGIsIHgsIHMsIHQpIHtcbiAgICAgIHJldHVybiBzYWZlQWRkKGJpdFJvdGF0ZUxlZnQoc2FmZUFkZChzYWZlQWRkKGEsIHEpLCBzYWZlQWRkKHgsIHQpKSwgcyksIGIpXG4gICAgfVxuICAgIGZ1bmN0aW9uIG1kNWZmIChhLCBiLCBjLCBkLCB4LCBzLCB0KSB7XG4gICAgICByZXR1cm4gbWQ1Y21uKChiICYgYykgfCAofmIgJiBkKSwgYSwgYiwgeCwgcywgdClcbiAgICB9XG4gICAgZnVuY3Rpb24gbWQ1Z2cgKGEsIGIsIGMsIGQsIHgsIHMsIHQpIHtcbiAgICAgIHJldHVybiBtZDVjbW4oKGIgJiBkKSB8IChjICYgfmQpLCBhLCBiLCB4LCBzLCB0KVxuICAgIH1cbiAgICBmdW5jdGlvbiBtZDVoaCAoYSwgYiwgYywgZCwgeCwgcywgdCkge1xuICAgICAgcmV0dXJuIG1kNWNtbihiIF4gYyBeIGQsIGEsIGIsIHgsIHMsIHQpXG4gICAgfVxuICAgIGZ1bmN0aW9uIG1kNWlpIChhLCBiLCBjLCBkLCB4LCBzLCB0KSB7XG4gICAgICByZXR1cm4gbWQ1Y21uKGMgXiAoYiB8IH5kKSwgYSwgYiwgeCwgcywgdClcbiAgICB9XG5cbiAgICAvKlxuICAgICogQ2FsY3VsYXRlIHRoZSBNRDUgb2YgYW4gYXJyYXkgb2YgbGl0dGxlLWVuZGlhbiB3b3JkcywgYW5kIGEgYml0IGxlbmd0aC5cbiAgICAqL1xuICAgIGZ1bmN0aW9uIGJpbmxNRDUgKHgsIGxlbikge1xuICAgICAgLyogYXBwZW5kIHBhZGRpbmcgKi9cbiAgICAgIHhbbGVuID4+IDVdIHw9IDB4ODAgPDwgKGxlbiAlIDMyKTtcbiAgICAgIHhbKChsZW4gKyA2NCkgPj4+IDkgPDwgNCkgKyAxNF0gPSBsZW47XG5cbiAgICAgIHZhciBpO1xuICAgICAgdmFyIG9sZGE7XG4gICAgICB2YXIgb2xkYjtcbiAgICAgIHZhciBvbGRjO1xuICAgICAgdmFyIG9sZGQ7XG4gICAgICB2YXIgYSA9IDE3MzI1ODQxOTM7XG4gICAgICB2YXIgYiA9IC0yNzE3MzM4Nzk7XG4gICAgICB2YXIgYyA9IC0xNzMyNTg0MTk0O1xuICAgICAgdmFyIGQgPSAyNzE3MzM4Nzg7XG5cbiAgICAgIGZvciAoaSA9IDA7IGkgPCB4Lmxlbmd0aDsgaSArPSAxNikge1xuICAgICAgICBvbGRhID0gYTtcbiAgICAgICAgb2xkYiA9IGI7XG4gICAgICAgIG9sZGMgPSBjO1xuICAgICAgICBvbGRkID0gZDtcblxuICAgICAgICBhID0gbWQ1ZmYoYSwgYiwgYywgZCwgeFtpXSwgNywgLTY4MDg3NjkzNik7XG4gICAgICAgIGQgPSBtZDVmZihkLCBhLCBiLCBjLCB4W2kgKyAxXSwgMTIsIC0zODk1NjQ1ODYpO1xuICAgICAgICBjID0gbWQ1ZmYoYywgZCwgYSwgYiwgeFtpICsgMl0sIDE3LCA2MDYxMDU4MTkpO1xuICAgICAgICBiID0gbWQ1ZmYoYiwgYywgZCwgYSwgeFtpICsgM10sIDIyLCAtMTA0NDUyNTMzMCk7XG4gICAgICAgIGEgPSBtZDVmZihhLCBiLCBjLCBkLCB4W2kgKyA0XSwgNywgLTE3NjQxODg5Nyk7XG4gICAgICAgIGQgPSBtZDVmZihkLCBhLCBiLCBjLCB4W2kgKyA1XSwgMTIsIDEyMDAwODA0MjYpO1xuICAgICAgICBjID0gbWQ1ZmYoYywgZCwgYSwgYiwgeFtpICsgNl0sIDE3LCAtMTQ3MzIzMTM0MSk7XG4gICAgICAgIGIgPSBtZDVmZihiLCBjLCBkLCBhLCB4W2kgKyA3XSwgMjIsIC00NTcwNTk4Myk7XG4gICAgICAgIGEgPSBtZDVmZihhLCBiLCBjLCBkLCB4W2kgKyA4XSwgNywgMTc3MDAzNTQxNik7XG4gICAgICAgIGQgPSBtZDVmZihkLCBhLCBiLCBjLCB4W2kgKyA5XSwgMTIsIC0xOTU4NDE0NDE3KTtcbiAgICAgICAgYyA9IG1kNWZmKGMsIGQsIGEsIGIsIHhbaSArIDEwXSwgMTcsIC00MjA2Myk7XG4gICAgICAgIGIgPSBtZDVmZihiLCBjLCBkLCBhLCB4W2kgKyAxMV0sIDIyLCAtMTk5MDQwNDE2Mik7XG4gICAgICAgIGEgPSBtZDVmZihhLCBiLCBjLCBkLCB4W2kgKyAxMl0sIDcsIDE4MDQ2MDM2ODIpO1xuICAgICAgICBkID0gbWQ1ZmYoZCwgYSwgYiwgYywgeFtpICsgMTNdLCAxMiwgLTQwMzQxMTAxKTtcbiAgICAgICAgYyA9IG1kNWZmKGMsIGQsIGEsIGIsIHhbaSArIDE0XSwgMTcsIC0xNTAyMDAyMjkwKTtcbiAgICAgICAgYiA9IG1kNWZmKGIsIGMsIGQsIGEsIHhbaSArIDE1XSwgMjIsIDEyMzY1MzUzMjkpO1xuXG4gICAgICAgIGEgPSBtZDVnZyhhLCBiLCBjLCBkLCB4W2kgKyAxXSwgNSwgLTE2NTc5NjUxMCk7XG4gICAgICAgIGQgPSBtZDVnZyhkLCBhLCBiLCBjLCB4W2kgKyA2XSwgOSwgLTEwNjk1MDE2MzIpO1xuICAgICAgICBjID0gbWQ1Z2coYywgZCwgYSwgYiwgeFtpICsgMTFdLCAxNCwgNjQzNzE3NzEzKTtcbiAgICAgICAgYiA9IG1kNWdnKGIsIGMsIGQsIGEsIHhbaV0sIDIwLCAtMzczODk3MzAyKTtcbiAgICAgICAgYSA9IG1kNWdnKGEsIGIsIGMsIGQsIHhbaSArIDVdLCA1LCAtNzAxNTU4NjkxKTtcbiAgICAgICAgZCA9IG1kNWdnKGQsIGEsIGIsIGMsIHhbaSArIDEwXSwgOSwgMzgwMTYwODMpO1xuICAgICAgICBjID0gbWQ1Z2coYywgZCwgYSwgYiwgeFtpICsgMTVdLCAxNCwgLTY2MDQ3ODMzNSk7XG4gICAgICAgIGIgPSBtZDVnZyhiLCBjLCBkLCBhLCB4W2kgKyA0XSwgMjAsIC00MDU1Mzc4NDgpO1xuICAgICAgICBhID0gbWQ1Z2coYSwgYiwgYywgZCwgeFtpICsgOV0sIDUsIDU2ODQ0NjQzOCk7XG4gICAgICAgIGQgPSBtZDVnZyhkLCBhLCBiLCBjLCB4W2kgKyAxNF0sIDksIC0xMDE5ODAzNjkwKTtcbiAgICAgICAgYyA9IG1kNWdnKGMsIGQsIGEsIGIsIHhbaSArIDNdLCAxNCwgLTE4NzM2Mzk2MSk7XG4gICAgICAgIGIgPSBtZDVnZyhiLCBjLCBkLCBhLCB4W2kgKyA4XSwgMjAsIDExNjM1MzE1MDEpO1xuICAgICAgICBhID0gbWQ1Z2coYSwgYiwgYywgZCwgeFtpICsgMTNdLCA1LCAtMTQ0NDY4MTQ2Nyk7XG4gICAgICAgIGQgPSBtZDVnZyhkLCBhLCBiLCBjLCB4W2kgKyAyXSwgOSwgLTUxNDAzNzg0KTtcbiAgICAgICAgYyA9IG1kNWdnKGMsIGQsIGEsIGIsIHhbaSArIDddLCAxNCwgMTczNTMyODQ3Myk7XG4gICAgICAgIGIgPSBtZDVnZyhiLCBjLCBkLCBhLCB4W2kgKyAxMl0sIDIwLCAtMTkyNjYwNzczNCk7XG5cbiAgICAgICAgYSA9IG1kNWhoKGEsIGIsIGMsIGQsIHhbaSArIDVdLCA0LCAtMzc4NTU4KTtcbiAgICAgICAgZCA9IG1kNWhoKGQsIGEsIGIsIGMsIHhbaSArIDhdLCAxMSwgLTIwMjI1NzQ0NjMpO1xuICAgICAgICBjID0gbWQ1aGgoYywgZCwgYSwgYiwgeFtpICsgMTFdLCAxNiwgMTgzOTAzMDU2Mik7XG4gICAgICAgIGIgPSBtZDVoaChiLCBjLCBkLCBhLCB4W2kgKyAxNF0sIDIzLCAtMzUzMDk1NTYpO1xuICAgICAgICBhID0gbWQ1aGgoYSwgYiwgYywgZCwgeFtpICsgMV0sIDQsIC0xNTMwOTkyMDYwKTtcbiAgICAgICAgZCA9IG1kNWhoKGQsIGEsIGIsIGMsIHhbaSArIDRdLCAxMSwgMTI3Mjg5MzM1Myk7XG4gICAgICAgIGMgPSBtZDVoaChjLCBkLCBhLCBiLCB4W2kgKyA3XSwgMTYsIC0xNTU0OTc2MzIpO1xuICAgICAgICBiID0gbWQ1aGgoYiwgYywgZCwgYSwgeFtpICsgMTBdLCAyMywgLTEwOTQ3MzA2NDApO1xuICAgICAgICBhID0gbWQ1aGgoYSwgYiwgYywgZCwgeFtpICsgMTNdLCA0LCA2ODEyNzkxNzQpO1xuICAgICAgICBkID0gbWQ1aGgoZCwgYSwgYiwgYywgeFtpXSwgMTEsIC0zNTg1MzcyMjIpO1xuICAgICAgICBjID0gbWQ1aGgoYywgZCwgYSwgYiwgeFtpICsgM10sIDE2LCAtNzIyNTIxOTc5KTtcbiAgICAgICAgYiA9IG1kNWhoKGIsIGMsIGQsIGEsIHhbaSArIDZdLCAyMywgNzYwMjkxODkpO1xuICAgICAgICBhID0gbWQ1aGgoYSwgYiwgYywgZCwgeFtpICsgOV0sIDQsIC02NDAzNjQ0ODcpO1xuICAgICAgICBkID0gbWQ1aGgoZCwgYSwgYiwgYywgeFtpICsgMTJdLCAxMSwgLTQyMTgxNTgzNSk7XG4gICAgICAgIGMgPSBtZDVoaChjLCBkLCBhLCBiLCB4W2kgKyAxNV0sIDE2LCA1MzA3NDI1MjApO1xuICAgICAgICBiID0gbWQ1aGgoYiwgYywgZCwgYSwgeFtpICsgMl0sIDIzLCAtOTk1MzM4NjUxKTtcblxuICAgICAgICBhID0gbWQ1aWkoYSwgYiwgYywgZCwgeFtpXSwgNiwgLTE5ODYzMDg0NCk7XG4gICAgICAgIGQgPSBtZDVpaShkLCBhLCBiLCBjLCB4W2kgKyA3XSwgMTAsIDExMjY4OTE0MTUpO1xuICAgICAgICBjID0gbWQ1aWkoYywgZCwgYSwgYiwgeFtpICsgMTRdLCAxNSwgLTE0MTYzNTQ5MDUpO1xuICAgICAgICBiID0gbWQ1aWkoYiwgYywgZCwgYSwgeFtpICsgNV0sIDIxLCAtNTc0MzQwNTUpO1xuICAgICAgICBhID0gbWQ1aWkoYSwgYiwgYywgZCwgeFtpICsgMTJdLCA2LCAxNzAwNDg1NTcxKTtcbiAgICAgICAgZCA9IG1kNWlpKGQsIGEsIGIsIGMsIHhbaSArIDNdLCAxMCwgLTE4OTQ5ODY2MDYpO1xuICAgICAgICBjID0gbWQ1aWkoYywgZCwgYSwgYiwgeFtpICsgMTBdLCAxNSwgLTEwNTE1MjMpO1xuICAgICAgICBiID0gbWQ1aWkoYiwgYywgZCwgYSwgeFtpICsgMV0sIDIxLCAtMjA1NDkyMjc5OSk7XG4gICAgICAgIGEgPSBtZDVpaShhLCBiLCBjLCBkLCB4W2kgKyA4XSwgNiwgMTg3MzMxMzM1OSk7XG4gICAgICAgIGQgPSBtZDVpaShkLCBhLCBiLCBjLCB4W2kgKyAxNV0sIDEwLCAtMzA2MTE3NDQpO1xuICAgICAgICBjID0gbWQ1aWkoYywgZCwgYSwgYiwgeFtpICsgNl0sIDE1LCAtMTU2MDE5ODM4MCk7XG4gICAgICAgIGIgPSBtZDVpaShiLCBjLCBkLCBhLCB4W2kgKyAxM10sIDIxLCAxMzA5MTUxNjQ5KTtcbiAgICAgICAgYSA9IG1kNWlpKGEsIGIsIGMsIGQsIHhbaSArIDRdLCA2LCAtMTQ1NTIzMDcwKTtcbiAgICAgICAgZCA9IG1kNWlpKGQsIGEsIGIsIGMsIHhbaSArIDExXSwgMTAsIC0xMTIwMjEwMzc5KTtcbiAgICAgICAgYyA9IG1kNWlpKGMsIGQsIGEsIGIsIHhbaSArIDJdLCAxNSwgNzE4Nzg3MjU5KTtcbiAgICAgICAgYiA9IG1kNWlpKGIsIGMsIGQsIGEsIHhbaSArIDldLCAyMSwgLTM0MzQ4NTU1MSk7XG5cbiAgICAgICAgYSA9IHNhZmVBZGQoYSwgb2xkYSk7XG4gICAgICAgIGIgPSBzYWZlQWRkKGIsIG9sZGIpO1xuICAgICAgICBjID0gc2FmZUFkZChjLCBvbGRjKTtcbiAgICAgICAgZCA9IHNhZmVBZGQoZCwgb2xkZCk7XG4gICAgICB9XG4gICAgICByZXR1cm4gW2EsIGIsIGMsIGRdXG4gICAgfVxuXG4gICAgLypcbiAgICAqIENvbnZlcnQgYW4gYXJyYXkgb2YgbGl0dGxlLWVuZGlhbiB3b3JkcyB0byBhIHN0cmluZ1xuICAgICovXG4gICAgZnVuY3Rpb24gYmlubDJyc3RyIChpbnB1dCkge1xuICAgICAgdmFyIGk7XG4gICAgICB2YXIgb3V0cHV0ID0gJyc7XG4gICAgICB2YXIgbGVuZ3RoMzIgPSBpbnB1dC5sZW5ndGggKiAzMjtcbiAgICAgIGZvciAoaSA9IDA7IGkgPCBsZW5ndGgzMjsgaSArPSA4KSB7XG4gICAgICAgIG91dHB1dCArPSBTdHJpbmcuZnJvbUNoYXJDb2RlKChpbnB1dFtpID4+IDVdID4+PiAoaSAlIDMyKSkgJiAweGZmKTtcbiAgICAgIH1cbiAgICAgIHJldHVybiBvdXRwdXRcbiAgICB9XG5cbiAgICAvKlxuICAgICogQ29udmVydCBhIHJhdyBzdHJpbmcgdG8gYW4gYXJyYXkgb2YgbGl0dGxlLWVuZGlhbiB3b3Jkc1xuICAgICogQ2hhcmFjdGVycyA+MjU1IGhhdmUgdGhlaXIgaGlnaC1ieXRlIHNpbGVudGx5IGlnbm9yZWQuXG4gICAgKi9cbiAgICBmdW5jdGlvbiByc3RyMmJpbmwgKGlucHV0KSB7XG4gICAgICB2YXIgaTtcbiAgICAgIHZhciBvdXRwdXQgPSBbXTtcbiAgICAgIG91dHB1dFsoaW5wdXQubGVuZ3RoID4+IDIpIC0gMV0gPSB1bmRlZmluZWQ7XG4gICAgICBmb3IgKGkgPSAwOyBpIDwgb3V0cHV0Lmxlbmd0aDsgaSArPSAxKSB7XG4gICAgICAgIG91dHB1dFtpXSA9IDA7XG4gICAgICB9XG4gICAgICB2YXIgbGVuZ3RoOCA9IGlucHV0Lmxlbmd0aCAqIDg7XG4gICAgICBmb3IgKGkgPSAwOyBpIDwgbGVuZ3RoODsgaSArPSA4KSB7XG4gICAgICAgIG91dHB1dFtpID4+IDVdIHw9IChpbnB1dC5jaGFyQ29kZUF0KGkgLyA4KSAmIDB4ZmYpIDw8IChpICUgMzIpO1xuICAgICAgfVxuICAgICAgcmV0dXJuIG91dHB1dFxuICAgIH1cblxuICAgIC8qXG4gICAgKiBDYWxjdWxhdGUgdGhlIE1ENSBvZiBhIHJhdyBzdHJpbmdcbiAgICAqL1xuICAgIGZ1bmN0aW9uIHJzdHJNRDUgKHMpIHtcbiAgICAgIHJldHVybiBiaW5sMnJzdHIoYmlubE1ENShyc3RyMmJpbmwocyksIHMubGVuZ3RoICogOCkpXG4gICAgfVxuXG4gICAgLypcbiAgICAqIENhbGN1bGF0ZSB0aGUgSE1BQy1NRDUsIG9mIGEga2V5IGFuZCBzb21lIGRhdGEgKHJhdyBzdHJpbmdzKVxuICAgICovXG4gICAgZnVuY3Rpb24gcnN0ckhNQUNNRDUgKGtleSwgZGF0YSkge1xuICAgICAgdmFyIGk7XG4gICAgICB2YXIgYmtleSA9IHJzdHIyYmlubChrZXkpO1xuICAgICAgdmFyIGlwYWQgPSBbXTtcbiAgICAgIHZhciBvcGFkID0gW107XG4gICAgICB2YXIgaGFzaDtcbiAgICAgIGlwYWRbMTVdID0gb3BhZFsxNV0gPSB1bmRlZmluZWQ7XG4gICAgICBpZiAoYmtleS5sZW5ndGggPiAxNikge1xuICAgICAgICBia2V5ID0gYmlubE1ENShia2V5LCBrZXkubGVuZ3RoICogOCk7XG4gICAgICB9XG4gICAgICBmb3IgKGkgPSAwOyBpIDwgMTY7IGkgKz0gMSkge1xuICAgICAgICBpcGFkW2ldID0gYmtleVtpXSBeIDB4MzYzNjM2MzY7XG4gICAgICAgIG9wYWRbaV0gPSBia2V5W2ldIF4gMHg1YzVjNWM1YztcbiAgICAgIH1cbiAgICAgIGhhc2ggPSBiaW5sTUQ1KGlwYWQuY29uY2F0KHJzdHIyYmlubChkYXRhKSksIDUxMiArIGRhdGEubGVuZ3RoICogOCk7XG4gICAgICByZXR1cm4gYmlubDJyc3RyKGJpbmxNRDUob3BhZC5jb25jYXQoaGFzaCksIDUxMiArIDEyOCkpXG4gICAgfVxuXG4gICAgLypcbiAgICAqIENvbnZlcnQgYSByYXcgc3RyaW5nIHRvIGEgaGV4IHN0cmluZ1xuICAgICovXG4gICAgZnVuY3Rpb24gcnN0cjJoZXggKGlucHV0KSB7XG4gICAgICB2YXIgaGV4VGFiID0gJzAxMjM0NTY3ODlhYmNkZWYnO1xuICAgICAgdmFyIG91dHB1dCA9ICcnO1xuICAgICAgdmFyIHg7XG4gICAgICB2YXIgaTtcbiAgICAgIGZvciAoaSA9IDA7IGkgPCBpbnB1dC5sZW5ndGg7IGkgKz0gMSkge1xuICAgICAgICB4ID0gaW5wdXQuY2hhckNvZGVBdChpKTtcbiAgICAgICAgb3V0cHV0ICs9IGhleFRhYi5jaGFyQXQoKHggPj4+IDQpICYgMHgwZikgKyBoZXhUYWIuY2hhckF0KHggJiAweDBmKTtcbiAgICAgIH1cbiAgICAgIHJldHVybiBvdXRwdXRcbiAgICB9XG5cbiAgICAvKlxuICAgICogRW5jb2RlIGEgc3RyaW5nIGFzIHV0Zi04XG4gICAgKi9cbiAgICBmdW5jdGlvbiBzdHIycnN0clVURjggKGlucHV0KSB7XG4gICAgICByZXR1cm4gdW5lc2NhcGUoZW5jb2RlVVJJQ29tcG9uZW50KGlucHV0KSlcbiAgICB9XG5cbiAgICAvKlxuICAgICogVGFrZSBzdHJpbmcgYXJndW1lbnRzIGFuZCByZXR1cm4gZWl0aGVyIHJhdyBvciBoZXggZW5jb2RlZCBzdHJpbmdzXG4gICAgKi9cbiAgICBmdW5jdGlvbiByYXdNRDUgKHMpIHtcbiAgICAgIHJldHVybiByc3RyTUQ1KHN0cjJyc3RyVVRGOChzKSlcbiAgICB9XG4gICAgZnVuY3Rpb24gaGV4TUQ1IChzKSB7XG4gICAgICByZXR1cm4gcnN0cjJoZXgocmF3TUQ1KHMpKVxuICAgIH1cbiAgICBmdW5jdGlvbiByYXdITUFDTUQ1IChrLCBkKSB7XG4gICAgICByZXR1cm4gcnN0ckhNQUNNRDUoc3RyMnJzdHJVVEY4KGspLCBzdHIycnN0clVURjgoZCkpXG4gICAgfVxuICAgIGZ1bmN0aW9uIGhleEhNQUNNRDUgKGssIGQpIHtcbiAgICAgIHJldHVybiByc3RyMmhleChyYXdITUFDTUQ1KGssIGQpKVxuICAgIH1cblxuICAgIGZ1bmN0aW9uIG1kNSAoc3RyaW5nLCBrZXksIHJhdykge1xuICAgICAgaWYgKCFrZXkpIHtcbiAgICAgICAgaWYgKCFyYXcpIHtcbiAgICAgICAgICByZXR1cm4gaGV4TUQ1KHN0cmluZylcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gcmF3TUQ1KHN0cmluZylcbiAgICAgIH1cbiAgICAgIGlmICghcmF3KSB7XG4gICAgICAgIHJldHVybiBoZXhITUFDTUQ1KGtleSwgc3RyaW5nKVxuICAgICAgfVxuICAgICAgcmV0dXJuIHJhd0hNQUNNRDUoa2V5LCBzdHJpbmcpXG4gICAgfVxuXG4gICAgaWYgKG1vZHVsZS5leHBvcnRzKSB7XG4gICAgICBtb2R1bGUuZXhwb3J0cyA9IG1kNTtcbiAgICB9IGVsc2Uge1xuICAgICAgJC5tZDUgPSBtZDU7XG4gICAgfVxuICB9KShjb21tb25qc0dsb2JhbCk7XG4gIH0pO1xuXG4gIHZhciBzdHJpY3RVcmlFbmNvZGUgPSBmdW5jdGlvbiAoc3RyKSB7XG4gIFx0cmV0dXJuIGVuY29kZVVSSUNvbXBvbmVudChzdHIpLnJlcGxhY2UoL1shJygpKl0vZywgZnVuY3Rpb24gKGMpIHtcbiAgXHRcdHJldHVybiAnJScgKyBjLmNoYXJDb2RlQXQoMCkudG9TdHJpbmcoMTYpLnRvVXBwZXJDYXNlKCk7XG4gIFx0fSk7XG4gIH07XG5cbiAgLypcbiAgb2JqZWN0LWFzc2lnblxuICAoYykgU2luZHJlIFNvcmh1c1xuICBAbGljZW5zZSBNSVRcbiAgKi9cbiAgLyogZXNsaW50LWRpc2FibGUgbm8tdW51c2VkLXZhcnMgKi9cbiAgdmFyIGdldE93blByb3BlcnR5U3ltYm9scyA9IE9iamVjdC5nZXRPd25Qcm9wZXJ0eVN5bWJvbHM7XG4gIHZhciBoYXNPd25Qcm9wZXJ0eSA9IE9iamVjdC5wcm90b3R5cGUuaGFzT3duUHJvcGVydHk7XG4gIHZhciBwcm9wSXNFbnVtZXJhYmxlID0gT2JqZWN0LnByb3RvdHlwZS5wcm9wZXJ0eUlzRW51bWVyYWJsZTtcblxuICBmdW5jdGlvbiB0b09iamVjdCh2YWwpIHtcbiAgXHRpZiAodmFsID09PSBudWxsIHx8IHZhbCA9PT0gdW5kZWZpbmVkKSB7XG4gIFx0XHR0aHJvdyBuZXcgVHlwZUVycm9yKCdPYmplY3QuYXNzaWduIGNhbm5vdCBiZSBjYWxsZWQgd2l0aCBudWxsIG9yIHVuZGVmaW5lZCcpO1xuICBcdH1cblxuICBcdHJldHVybiBPYmplY3QodmFsKTtcbiAgfVxuXG4gIGZ1bmN0aW9uIHNob3VsZFVzZU5hdGl2ZSgpIHtcbiAgXHR0cnkge1xuICBcdFx0aWYgKCFPYmplY3QuYXNzaWduKSB7XG4gIFx0XHRcdHJldHVybiBmYWxzZTtcbiAgXHRcdH1cblxuICBcdFx0Ly8gRGV0ZWN0IGJ1Z2d5IHByb3BlcnR5IGVudW1lcmF0aW9uIG9yZGVyIGluIG9sZGVyIFY4IHZlcnNpb25zLlxuXG4gIFx0XHQvLyBodHRwczovL2J1Z3MuY2hyb21pdW0ub3JnL3AvdjgvaXNzdWVzL2RldGFpbD9pZD00MTE4XG4gIFx0XHR2YXIgdGVzdDEgPSBuZXcgU3RyaW5nKCdhYmMnKTsgIC8vIGVzbGludC1kaXNhYmxlLWxpbmUgbm8tbmV3LXdyYXBwZXJzXG4gIFx0XHR0ZXN0MVs1XSA9ICdkZSc7XG4gIFx0XHRpZiAoT2JqZWN0LmdldE93blByb3BlcnR5TmFtZXModGVzdDEpWzBdID09PSAnNScpIHtcbiAgXHRcdFx0cmV0dXJuIGZhbHNlO1xuICBcdFx0fVxuXG4gIFx0XHQvLyBodHRwczovL2J1Z3MuY2hyb21pdW0ub3JnL3AvdjgvaXNzdWVzL2RldGFpbD9pZD0zMDU2XG4gIFx0XHR2YXIgdGVzdDIgPSB7fTtcbiAgXHRcdGZvciAodmFyIGkgPSAwOyBpIDwgMTA7IGkrKykge1xuICBcdFx0XHR0ZXN0MlsnXycgKyBTdHJpbmcuZnJvbUNoYXJDb2RlKGkpXSA9IGk7XG4gIFx0XHR9XG4gIFx0XHR2YXIgb3JkZXIyID0gT2JqZWN0LmdldE93blByb3BlcnR5TmFtZXModGVzdDIpLm1hcChmdW5jdGlvbiAobikge1xuICBcdFx0XHRyZXR1cm4gdGVzdDJbbl07XG4gIFx0XHR9KTtcbiAgXHRcdGlmIChvcmRlcjIuam9pbignJykgIT09ICcwMTIzNDU2Nzg5Jykge1xuICBcdFx0XHRyZXR1cm4gZmFsc2U7XG4gIFx0XHR9XG5cbiAgXHRcdC8vIGh0dHBzOi8vYnVncy5jaHJvbWl1bS5vcmcvcC92OC9pc3N1ZXMvZGV0YWlsP2lkPTMwNTZcbiAgXHRcdHZhciB0ZXN0MyA9IHt9O1xuICBcdFx0J2FiY2RlZmdoaWprbG1ub3BxcnN0Jy5zcGxpdCgnJykuZm9yRWFjaChmdW5jdGlvbiAobGV0dGVyKSB7XG4gIFx0XHRcdHRlc3QzW2xldHRlcl0gPSBsZXR0ZXI7XG4gIFx0XHR9KTtcbiAgXHRcdGlmIChPYmplY3Qua2V5cyhPYmplY3QuYXNzaWduKHt9LCB0ZXN0MykpLmpvaW4oJycpICE9PVxuICBcdFx0XHRcdCdhYmNkZWZnaGlqa2xtbm9wcXJzdCcpIHtcbiAgXHRcdFx0cmV0dXJuIGZhbHNlO1xuICBcdFx0fVxuXG4gIFx0XHRyZXR1cm4gdHJ1ZTtcbiAgXHR9IGNhdGNoIChlcnIpIHtcbiAgXHRcdC8vIFdlIGRvbid0IGV4cGVjdCBhbnkgb2YgdGhlIGFib3ZlIHRvIHRocm93LCBidXQgYmV0dGVyIHRvIGJlIHNhZmUuXG4gIFx0XHRyZXR1cm4gZmFsc2U7XG4gIFx0fVxuICB9XG5cbiAgdmFyIG9iamVjdEFzc2lnbiA9IHNob3VsZFVzZU5hdGl2ZSgpID8gT2JqZWN0LmFzc2lnbiA6IGZ1bmN0aW9uICh0YXJnZXQsIHNvdXJjZSkge1xuICBcdHZhciBmcm9tO1xuICBcdHZhciB0byA9IHRvT2JqZWN0KHRhcmdldCk7XG4gIFx0dmFyIHN5bWJvbHM7XG5cbiAgXHRmb3IgKHZhciBzID0gMTsgcyA8IGFyZ3VtZW50cy5sZW5ndGg7IHMrKykge1xuICBcdFx0ZnJvbSA9IE9iamVjdChhcmd1bWVudHNbc10pO1xuXG4gIFx0XHRmb3IgKHZhciBrZXkgaW4gZnJvbSkge1xuICBcdFx0XHRpZiAoaGFzT3duUHJvcGVydHkuY2FsbChmcm9tLCBrZXkpKSB7XG4gIFx0XHRcdFx0dG9ba2V5XSA9IGZyb21ba2V5XTtcbiAgXHRcdFx0fVxuICBcdFx0fVxuXG4gIFx0XHRpZiAoZ2V0T3duUHJvcGVydHlTeW1ib2xzKSB7XG4gIFx0XHRcdHN5bWJvbHMgPSBnZXRPd25Qcm9wZXJ0eVN5bWJvbHMoZnJvbSk7XG4gIFx0XHRcdGZvciAodmFyIGkgPSAwOyBpIDwgc3ltYm9scy5sZW5ndGg7IGkrKykge1xuICBcdFx0XHRcdGlmIChwcm9wSXNFbnVtZXJhYmxlLmNhbGwoZnJvbSwgc3ltYm9sc1tpXSkpIHtcbiAgXHRcdFx0XHRcdHRvW3N5bWJvbHNbaV1dID0gZnJvbVtzeW1ib2xzW2ldXTtcbiAgXHRcdFx0XHR9XG4gIFx0XHRcdH1cbiAgXHRcdH1cbiAgXHR9XG5cbiAgXHRyZXR1cm4gdG87XG4gIH07XG5cbiAgdmFyIHRva2VuID0gJyVbYS1mMC05XXsyfSc7XG4gIHZhciBzaW5nbGVNYXRjaGVyID0gbmV3IFJlZ0V4cCh0b2tlbiwgJ2dpJyk7XG4gIHZhciBtdWx0aU1hdGNoZXIgPSBuZXcgUmVnRXhwKCcoJyArIHRva2VuICsgJykrJywgJ2dpJyk7XG5cbiAgZnVuY3Rpb24gZGVjb2RlQ29tcG9uZW50cyhjb21wb25lbnRzLCBzcGxpdCkge1xuICBcdHRyeSB7XG4gIFx0XHQvLyBUcnkgdG8gZGVjb2RlIHRoZSBlbnRpcmUgc3RyaW5nIGZpcnN0XG4gIFx0XHRyZXR1cm4gZGVjb2RlVVJJQ29tcG9uZW50KGNvbXBvbmVudHMuam9pbignJykpO1xuICBcdH0gY2F0Y2ggKGVycikge1xuICBcdFx0Ly8gRG8gbm90aGluZ1xuICBcdH1cblxuICBcdGlmIChjb21wb25lbnRzLmxlbmd0aCA9PT0gMSkge1xuICBcdFx0cmV0dXJuIGNvbXBvbmVudHM7XG4gIFx0fVxuXG4gIFx0c3BsaXQgPSBzcGxpdCB8fCAxO1xuXG4gIFx0Ly8gU3BsaXQgdGhlIGFycmF5IGluIDIgcGFydHNcbiAgXHR2YXIgbGVmdCA9IGNvbXBvbmVudHMuc2xpY2UoMCwgc3BsaXQpO1xuICBcdHZhciByaWdodCA9IGNvbXBvbmVudHMuc2xpY2Uoc3BsaXQpO1xuXG4gIFx0cmV0dXJuIEFycmF5LnByb3RvdHlwZS5jb25jYXQuY2FsbChbXSwgZGVjb2RlQ29tcG9uZW50cyhsZWZ0KSwgZGVjb2RlQ29tcG9uZW50cyhyaWdodCkpO1xuICB9XG5cbiAgZnVuY3Rpb24gZGVjb2RlKGlucHV0KSB7XG4gIFx0dHJ5IHtcbiAgXHRcdHJldHVybiBkZWNvZGVVUklDb21wb25lbnQoaW5wdXQpO1xuICBcdH0gY2F0Y2ggKGVycikge1xuICBcdFx0dmFyIHRva2VucyA9IGlucHV0Lm1hdGNoKHNpbmdsZU1hdGNoZXIpO1xuXG4gIFx0XHRmb3IgKHZhciBpID0gMTsgaSA8IHRva2Vucy5sZW5ndGg7IGkrKykge1xuICBcdFx0XHRpbnB1dCA9IGRlY29kZUNvbXBvbmVudHModG9rZW5zLCBpKS5qb2luKCcnKTtcblxuICBcdFx0XHR0b2tlbnMgPSBpbnB1dC5tYXRjaChzaW5nbGVNYXRjaGVyKTtcbiAgXHRcdH1cblxuICBcdFx0cmV0dXJuIGlucHV0O1xuICBcdH1cbiAgfVxuXG4gIGZ1bmN0aW9uIGN1c3RvbURlY29kZVVSSUNvbXBvbmVudChpbnB1dCkge1xuICBcdC8vIEtlZXAgdHJhY2sgb2YgYWxsIHRoZSByZXBsYWNlbWVudHMgYW5kIHByZWZpbGwgdGhlIG1hcCB3aXRoIHRoZSBgQk9NYFxuICBcdHZhciByZXBsYWNlTWFwID0ge1xuICBcdFx0JyVGRSVGRic6ICdcXHVGRkZEXFx1RkZGRCcsXG4gIFx0XHQnJUZGJUZFJzogJ1xcdUZGRkRcXHVGRkZEJ1xuICBcdH07XG5cbiAgXHR2YXIgbWF0Y2ggPSBtdWx0aU1hdGNoZXIuZXhlYyhpbnB1dCk7XG4gIFx0d2hpbGUgKG1hdGNoKSB7XG4gIFx0XHR0cnkge1xuICBcdFx0XHQvLyBEZWNvZGUgYXMgYmlnIGNodW5rcyBhcyBwb3NzaWJsZVxuICBcdFx0XHRyZXBsYWNlTWFwW21hdGNoWzBdXSA9IGRlY29kZVVSSUNvbXBvbmVudChtYXRjaFswXSk7XG4gIFx0XHR9IGNhdGNoIChlcnIpIHtcbiAgXHRcdFx0dmFyIHJlc3VsdCA9IGRlY29kZShtYXRjaFswXSk7XG5cbiAgXHRcdFx0aWYgKHJlc3VsdCAhPT0gbWF0Y2hbMF0pIHtcbiAgXHRcdFx0XHRyZXBsYWNlTWFwW21hdGNoWzBdXSA9IHJlc3VsdDtcbiAgXHRcdFx0fVxuICBcdFx0fVxuXG4gIFx0XHRtYXRjaCA9IG11bHRpTWF0Y2hlci5leGVjKGlucHV0KTtcbiAgXHR9XG5cbiAgXHQvLyBBZGQgYCVDMmAgYXQgdGhlIGVuZCBvZiB0aGUgbWFwIHRvIG1ha2Ugc3VyZSBpdCBkb2VzIG5vdCByZXBsYWNlIHRoZSBjb21iaW5hdG9yIGJlZm9yZSBldmVyeXRoaW5nIGVsc2VcbiAgXHRyZXBsYWNlTWFwWyclQzInXSA9ICdcXHVGRkZEJztcblxuICBcdHZhciBlbnRyaWVzID0gT2JqZWN0LmtleXMocmVwbGFjZU1hcCk7XG5cbiAgXHRmb3IgKHZhciBpID0gMDsgaSA8IGVudHJpZXMubGVuZ3RoOyBpKyspIHtcbiAgXHRcdC8vIFJlcGxhY2UgYWxsIGRlY29kZWQgY29tcG9uZW50c1xuICBcdFx0dmFyIGtleSA9IGVudHJpZXNbaV07XG4gIFx0XHRpbnB1dCA9IGlucHV0LnJlcGxhY2UobmV3IFJlZ0V4cChrZXksICdnJyksIHJlcGxhY2VNYXBba2V5XSk7XG4gIFx0fVxuXG4gIFx0cmV0dXJuIGlucHV0O1xuICB9XG5cbiAgdmFyIGRlY29kZVVyaUNvbXBvbmVudCA9IGZ1bmN0aW9uIChlbmNvZGVkVVJJKSB7XG4gIFx0aWYgKHR5cGVvZiBlbmNvZGVkVVJJICE9PSAnc3RyaW5nJykge1xuICBcdFx0dGhyb3cgbmV3IFR5cGVFcnJvcignRXhwZWN0ZWQgYGVuY29kZWRVUklgIHRvIGJlIG9mIHR5cGUgYHN0cmluZ2AsIGdvdCBgJyArIHR5cGVvZiBlbmNvZGVkVVJJICsgJ2AnKTtcbiAgXHR9XG5cbiAgXHR0cnkge1xuICBcdFx0ZW5jb2RlZFVSSSA9IGVuY29kZWRVUkkucmVwbGFjZSgvXFwrL2csICcgJyk7XG5cbiAgXHRcdC8vIFRyeSB0aGUgYnVpbHQgaW4gZGVjb2RlciBmaXJzdFxuICBcdFx0cmV0dXJuIGRlY29kZVVSSUNvbXBvbmVudChlbmNvZGVkVVJJKTtcbiAgXHR9IGNhdGNoIChlcnIpIHtcbiAgXHRcdC8vIEZhbGxiYWNrIHRvIGEgbW9yZSBhZHZhbmNlZCBkZWNvZGVyXG4gIFx0XHRyZXR1cm4gY3VzdG9tRGVjb2RlVVJJQ29tcG9uZW50KGVuY29kZWRVUkkpO1xuICBcdH1cbiAgfTtcblxuICBmdW5jdGlvbiBlbmNvZGVyRm9yQXJyYXlGb3JtYXQob3B0cykge1xuICBcdHN3aXRjaCAob3B0cy5hcnJheUZvcm1hdCkge1xuICBcdFx0Y2FzZSAnaW5kZXgnOlxuICBcdFx0XHRyZXR1cm4gZnVuY3Rpb24gKGtleSwgdmFsdWUsIGluZGV4KSB7XG4gIFx0XHRcdFx0cmV0dXJuIHZhbHVlID09PSBudWxsID8gW1xuICBcdFx0XHRcdFx0ZW5jb2RlKGtleSwgb3B0cyksXG4gIFx0XHRcdFx0XHQnWycsXG4gIFx0XHRcdFx0XHRpbmRleCxcbiAgXHRcdFx0XHRcdCddJ1xuICBcdFx0XHRcdF0uam9pbignJykgOiBbXG4gIFx0XHRcdFx0XHRlbmNvZGUoa2V5LCBvcHRzKSxcbiAgXHRcdFx0XHRcdCdbJyxcbiAgXHRcdFx0XHRcdGVuY29kZShpbmRleCwgb3B0cyksXG4gIFx0XHRcdFx0XHQnXT0nLFxuICBcdFx0XHRcdFx0ZW5jb2RlKHZhbHVlLCBvcHRzKVxuICBcdFx0XHRcdF0uam9pbignJyk7XG4gIFx0XHRcdH07XG5cbiAgXHRcdGNhc2UgJ2JyYWNrZXQnOlxuICBcdFx0XHRyZXR1cm4gZnVuY3Rpb24gKGtleSwgdmFsdWUpIHtcbiAgXHRcdFx0XHRyZXR1cm4gdmFsdWUgPT09IG51bGwgPyBlbmNvZGUoa2V5LCBvcHRzKSA6IFtcbiAgXHRcdFx0XHRcdGVuY29kZShrZXksIG9wdHMpLFxuICBcdFx0XHRcdFx0J1tdPScsXG4gIFx0XHRcdFx0XHRlbmNvZGUodmFsdWUsIG9wdHMpXG4gIFx0XHRcdFx0XS5qb2luKCcnKTtcbiAgXHRcdFx0fTtcblxuICBcdFx0ZGVmYXVsdDpcbiAgXHRcdFx0cmV0dXJuIGZ1bmN0aW9uIChrZXksIHZhbHVlKSB7XG4gIFx0XHRcdFx0cmV0dXJuIHZhbHVlID09PSBudWxsID8gZW5jb2RlKGtleSwgb3B0cykgOiBbXG4gIFx0XHRcdFx0XHRlbmNvZGUoa2V5LCBvcHRzKSxcbiAgXHRcdFx0XHRcdCc9JyxcbiAgXHRcdFx0XHRcdGVuY29kZSh2YWx1ZSwgb3B0cylcbiAgXHRcdFx0XHRdLmpvaW4oJycpO1xuICBcdFx0XHR9O1xuICBcdH1cbiAgfVxuXG4gIGZ1bmN0aW9uIHBhcnNlckZvckFycmF5Rm9ybWF0KG9wdHMpIHtcbiAgXHR2YXIgcmVzdWx0O1xuXG4gIFx0c3dpdGNoIChvcHRzLmFycmF5Rm9ybWF0KSB7XG4gIFx0XHRjYXNlICdpbmRleCc6XG4gIFx0XHRcdHJldHVybiBmdW5jdGlvbiAoa2V5LCB2YWx1ZSwgYWNjdW11bGF0b3IpIHtcbiAgXHRcdFx0XHRyZXN1bHQgPSAvXFxbKFxcZCopXFxdJC8uZXhlYyhrZXkpO1xuXG4gIFx0XHRcdFx0a2V5ID0ga2V5LnJlcGxhY2UoL1xcW1xcZCpcXF0kLywgJycpO1xuXG4gIFx0XHRcdFx0aWYgKCFyZXN1bHQpIHtcbiAgXHRcdFx0XHRcdGFjY3VtdWxhdG9yW2tleV0gPSB2YWx1ZTtcbiAgXHRcdFx0XHRcdHJldHVybjtcbiAgXHRcdFx0XHR9XG5cbiAgXHRcdFx0XHRpZiAoYWNjdW11bGF0b3Jba2V5XSA9PT0gdW5kZWZpbmVkKSB7XG4gIFx0XHRcdFx0XHRhY2N1bXVsYXRvcltrZXldID0ge307XG4gIFx0XHRcdFx0fVxuXG4gIFx0XHRcdFx0YWNjdW11bGF0b3Jba2V5XVtyZXN1bHRbMV1dID0gdmFsdWU7XG4gIFx0XHRcdH07XG5cbiAgXHRcdGNhc2UgJ2JyYWNrZXQnOlxuICBcdFx0XHRyZXR1cm4gZnVuY3Rpb24gKGtleSwgdmFsdWUsIGFjY3VtdWxhdG9yKSB7XG4gIFx0XHRcdFx0cmVzdWx0ID0gLyhcXFtcXF0pJC8uZXhlYyhrZXkpO1xuICBcdFx0XHRcdGtleSA9IGtleS5yZXBsYWNlKC9cXFtcXF0kLywgJycpO1xuXG4gIFx0XHRcdFx0aWYgKCFyZXN1bHQpIHtcbiAgXHRcdFx0XHRcdGFjY3VtdWxhdG9yW2tleV0gPSB2YWx1ZTtcbiAgXHRcdFx0XHRcdHJldHVybjtcbiAgXHRcdFx0XHR9IGVsc2UgaWYgKGFjY3VtdWxhdG9yW2tleV0gPT09IHVuZGVmaW5lZCkge1xuICBcdFx0XHRcdFx0YWNjdW11bGF0b3Jba2V5XSA9IFt2YWx1ZV07XG4gIFx0XHRcdFx0XHRyZXR1cm47XG4gIFx0XHRcdFx0fVxuXG4gIFx0XHRcdFx0YWNjdW11bGF0b3Jba2V5XSA9IFtdLmNvbmNhdChhY2N1bXVsYXRvcltrZXldLCB2YWx1ZSk7XG4gIFx0XHRcdH07XG5cbiAgXHRcdGRlZmF1bHQ6XG4gIFx0XHRcdHJldHVybiBmdW5jdGlvbiAoa2V5LCB2YWx1ZSwgYWNjdW11bGF0b3IpIHtcbiAgXHRcdFx0XHRpZiAoYWNjdW11bGF0b3Jba2V5XSA9PT0gdW5kZWZpbmVkKSB7XG4gIFx0XHRcdFx0XHRhY2N1bXVsYXRvcltrZXldID0gdmFsdWU7XG4gIFx0XHRcdFx0XHRyZXR1cm47XG4gIFx0XHRcdFx0fVxuXG4gIFx0XHRcdFx0YWNjdW11bGF0b3Jba2V5XSA9IFtdLmNvbmNhdChhY2N1bXVsYXRvcltrZXldLCB2YWx1ZSk7XG4gIFx0XHRcdH07XG4gIFx0fVxuICB9XG5cbiAgZnVuY3Rpb24gZW5jb2RlKHZhbHVlLCBvcHRzKSB7XG4gIFx0aWYgKG9wdHMuZW5jb2RlKSB7XG4gIFx0XHRyZXR1cm4gb3B0cy5zdHJpY3QgPyBzdHJpY3RVcmlFbmNvZGUodmFsdWUpIDogZW5jb2RlVVJJQ29tcG9uZW50KHZhbHVlKTtcbiAgXHR9XG5cbiAgXHRyZXR1cm4gdmFsdWU7XG4gIH1cblxuICBmdW5jdGlvbiBrZXlzU29ydGVyKGlucHV0KSB7XG4gIFx0aWYgKEFycmF5LmlzQXJyYXkoaW5wdXQpKSB7XG4gIFx0XHRyZXR1cm4gaW5wdXQuc29ydCgpO1xuICBcdH0gZWxzZSBpZiAodHlwZW9mIGlucHV0ID09PSAnb2JqZWN0Jykge1xuICBcdFx0cmV0dXJuIGtleXNTb3J0ZXIoT2JqZWN0LmtleXMoaW5wdXQpKS5zb3J0KGZ1bmN0aW9uIChhLCBiKSB7XG4gIFx0XHRcdHJldHVybiBOdW1iZXIoYSkgLSBOdW1iZXIoYik7XG4gIFx0XHR9KS5tYXAoZnVuY3Rpb24gKGtleSkge1xuICBcdFx0XHRyZXR1cm4gaW5wdXRba2V5XTtcbiAgXHRcdH0pO1xuICBcdH1cblxuICBcdHJldHVybiBpbnB1dDtcbiAgfVxuXG4gIGZ1bmN0aW9uIGV4dHJhY3Qoc3RyKSB7XG4gIFx0dmFyIHF1ZXJ5U3RhcnQgPSBzdHIuaW5kZXhPZignPycpO1xuICBcdGlmIChxdWVyeVN0YXJ0ID09PSAtMSkge1xuICBcdFx0cmV0dXJuICcnO1xuICBcdH1cbiAgXHRyZXR1cm4gc3RyLnNsaWNlKHF1ZXJ5U3RhcnQgKyAxKTtcbiAgfVxuXG4gIGZ1bmN0aW9uIHBhcnNlKHN0ciwgb3B0cykge1xuICBcdG9wdHMgPSBvYmplY3RBc3NpZ24oe2FycmF5Rm9ybWF0OiAnbm9uZSd9LCBvcHRzKTtcblxuICBcdHZhciBmb3JtYXR0ZXIgPSBwYXJzZXJGb3JBcnJheUZvcm1hdChvcHRzKTtcblxuICBcdC8vIENyZWF0ZSBhbiBvYmplY3Qgd2l0aCBubyBwcm90b3R5cGVcbiAgXHQvLyBodHRwczovL2dpdGh1Yi5jb20vc2luZHJlc29yaHVzL3F1ZXJ5LXN0cmluZy9pc3N1ZXMvNDdcbiAgXHR2YXIgcmV0ID0gT2JqZWN0LmNyZWF0ZShudWxsKTtcblxuICBcdGlmICh0eXBlb2Ygc3RyICE9PSAnc3RyaW5nJykge1xuICBcdFx0cmV0dXJuIHJldDtcbiAgXHR9XG5cbiAgXHRzdHIgPSBzdHIudHJpbSgpLnJlcGxhY2UoL15bPyMmXS8sICcnKTtcblxuICBcdGlmICghc3RyKSB7XG4gIFx0XHRyZXR1cm4gcmV0O1xuICBcdH1cblxuICBcdHN0ci5zcGxpdCgnJicpLmZvckVhY2goZnVuY3Rpb24gKHBhcmFtKSB7XG4gIFx0XHR2YXIgcGFydHMgPSBwYXJhbS5yZXBsYWNlKC9cXCsvZywgJyAnKS5zcGxpdCgnPScpO1xuICBcdFx0Ly8gRmlyZWZveCAocHJlIDQwKSBkZWNvZGVzIGAlM0RgIHRvIGA9YFxuICBcdFx0Ly8gaHR0cHM6Ly9naXRodWIuY29tL3NpbmRyZXNvcmh1cy9xdWVyeS1zdHJpbmcvcHVsbC8zN1xuICBcdFx0dmFyIGtleSA9IHBhcnRzLnNoaWZ0KCk7XG4gIFx0XHR2YXIgdmFsID0gcGFydHMubGVuZ3RoID4gMCA/IHBhcnRzLmpvaW4oJz0nKSA6IHVuZGVmaW5lZDtcblxuICBcdFx0Ly8gbWlzc2luZyBgPWAgc2hvdWxkIGJlIGBudWxsYDpcbiAgXHRcdC8vIGh0dHA6Ly93My5vcmcvVFIvMjAxMi9XRC11cmwtMjAxMjA1MjQvI2NvbGxlY3QtdXJsLXBhcmFtZXRlcnNcbiAgXHRcdHZhbCA9IHZhbCA9PT0gdW5kZWZpbmVkID8gbnVsbCA6IGRlY29kZVVyaUNvbXBvbmVudCh2YWwpO1xuXG4gIFx0XHRmb3JtYXR0ZXIoZGVjb2RlVXJpQ29tcG9uZW50KGtleSksIHZhbCwgcmV0KTtcbiAgXHR9KTtcblxuICBcdHJldHVybiBPYmplY3Qua2V5cyhyZXQpLnNvcnQoKS5yZWR1Y2UoZnVuY3Rpb24gKHJlc3VsdCwga2V5KSB7XG4gIFx0XHR2YXIgdmFsID0gcmV0W2tleV07XG4gIFx0XHRpZiAoQm9vbGVhbih2YWwpICYmIHR5cGVvZiB2YWwgPT09ICdvYmplY3QnICYmICFBcnJheS5pc0FycmF5KHZhbCkpIHtcbiAgXHRcdFx0Ly8gU29ydCBvYmplY3Qga2V5cywgbm90IHZhbHVlc1xuICBcdFx0XHRyZXN1bHRba2V5XSA9IGtleXNTb3J0ZXIodmFsKTtcbiAgXHRcdH0gZWxzZSB7XG4gIFx0XHRcdHJlc3VsdFtrZXldID0gdmFsO1xuICBcdFx0fVxuXG4gIFx0XHRyZXR1cm4gcmVzdWx0O1xuICBcdH0sIE9iamVjdC5jcmVhdGUobnVsbCkpO1xuICB9XG5cbiAgdmFyIGV4dHJhY3RfMSA9IGV4dHJhY3Q7XG4gIHZhciBwYXJzZV8xID0gcGFyc2U7XG5cbiAgdmFyIHN0cmluZ2lmeSA9IGZ1bmN0aW9uIChvYmosIG9wdHMpIHtcbiAgXHR2YXIgZGVmYXVsdHMgPSB7XG4gIFx0XHRlbmNvZGU6IHRydWUsXG4gIFx0XHRzdHJpY3Q6IHRydWUsXG4gIFx0XHRhcnJheUZvcm1hdDogJ25vbmUnXG4gIFx0fTtcblxuICBcdG9wdHMgPSBvYmplY3RBc3NpZ24oZGVmYXVsdHMsIG9wdHMpO1xuXG4gIFx0aWYgKG9wdHMuc29ydCA9PT0gZmFsc2UpIHtcbiAgXHRcdG9wdHMuc29ydCA9IGZ1bmN0aW9uICgpIHt9O1xuICBcdH1cblxuICBcdHZhciBmb3JtYXR0ZXIgPSBlbmNvZGVyRm9yQXJyYXlGb3JtYXQob3B0cyk7XG5cbiAgXHRyZXR1cm4gb2JqID8gT2JqZWN0LmtleXMob2JqKS5zb3J0KG9wdHMuc29ydCkubWFwKGZ1bmN0aW9uIChrZXkpIHtcbiAgXHRcdHZhciB2YWwgPSBvYmpba2V5XTtcblxuICBcdFx0aWYgKHZhbCA9PT0gdW5kZWZpbmVkKSB7XG4gIFx0XHRcdHJldHVybiAnJztcbiAgXHRcdH1cblxuICBcdFx0aWYgKHZhbCA9PT0gbnVsbCkge1xuICBcdFx0XHRyZXR1cm4gZW5jb2RlKGtleSwgb3B0cyk7XG4gIFx0XHR9XG5cbiAgXHRcdGlmIChBcnJheS5pc0FycmF5KHZhbCkpIHtcbiAgXHRcdFx0dmFyIHJlc3VsdCA9IFtdO1xuXG4gIFx0XHRcdHZhbC5zbGljZSgpLmZvckVhY2goZnVuY3Rpb24gKHZhbDIpIHtcbiAgXHRcdFx0XHRpZiAodmFsMiA9PT0gdW5kZWZpbmVkKSB7XG4gIFx0XHRcdFx0XHRyZXR1cm47XG4gIFx0XHRcdFx0fVxuXG4gIFx0XHRcdFx0cmVzdWx0LnB1c2goZm9ybWF0dGVyKGtleSwgdmFsMiwgcmVzdWx0Lmxlbmd0aCkpO1xuICBcdFx0XHR9KTtcblxuICBcdFx0XHRyZXR1cm4gcmVzdWx0LmpvaW4oJyYnKTtcbiAgXHRcdH1cblxuICBcdFx0cmV0dXJuIGVuY29kZShrZXksIG9wdHMpICsgJz0nICsgZW5jb2RlKHZhbCwgb3B0cyk7XG4gIFx0fSkuZmlsdGVyKGZ1bmN0aW9uICh4KSB7XG4gIFx0XHRyZXR1cm4geC5sZW5ndGggPiAwO1xuICBcdH0pLmpvaW4oJyYnKSA6ICcnO1xuICB9O1xuXG4gIHZhciBwYXJzZVVybCA9IGZ1bmN0aW9uIChzdHIsIG9wdHMpIHtcbiAgXHRyZXR1cm4ge1xuICBcdFx0dXJsOiBzdHIuc3BsaXQoJz8nKVswXSB8fCAnJyxcbiAgXHRcdHF1ZXJ5OiBwYXJzZShleHRyYWN0KHN0ciksIG9wdHMpXG4gIFx0fTtcbiAgfTtcblxuICB2YXIgcXVlcnlTdHJpbmcgPSB7XG4gIFx0ZXh0cmFjdDogZXh0cmFjdF8xLFxuICBcdHBhcnNlOiBwYXJzZV8xLFxuICBcdHN0cmluZ2lmeTogc3RyaW5naWZ5LFxuICBcdHBhcnNlVXJsOiBwYXJzZVVybFxuICB9O1xuXG4gIC8qXG4gICAqIFNpbXBsZSBBSkFYIHJlcXVlc3Qgb2JqZWN0XG4gICAqL1xuXG4gIHZhciBSZXF1ZXN0ID0gZnVuY3Rpb24gUmVxdWVzdCh1cmwsIGRhdGEpIHtcbiAgICB0aGlzLnVybCA9IHVybDtcbiAgICB0aGlzLmRhdGEgPSBkYXRhIHx8IHt9O1xuICB9O1xuXG4gIFJlcXVlc3QucHJvdG90eXBlLnNlbmQgPSBmdW5jdGlvbiAoY2FsbGJhY2spIHtcbiAgICB2YXIgaXNJRSA9IHdpbmRvdy5YRG9tYWluUmVxdWVzdCA/IHRydWUgOiBmYWxzZTtcblxuICAgIGlmIChpc0lFKSB7XG4gICAgICB2YXIgeGRyID0gbmV3IHdpbmRvdy5YRG9tYWluUmVxdWVzdCgpO1xuICAgICAgeGRyLm9wZW4oJ1BPU1QnLCB0aGlzLnVybCwgdHJ1ZSk7XG5cbiAgICAgIHhkci5vbmxvYWQgPSBmdW5jdGlvbiAoKSB7XG4gICAgICAgIGNhbGxiYWNrKDIwMCwgeGRyLnJlc3BvbnNlVGV4dCk7XG4gICAgICB9O1xuXG4gICAgICB4ZHIub25lcnJvciA9IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgLy8gc3RhdHVzIGNvZGUgbm90IGF2YWlsYWJsZSBmcm9tIHhkciwgdHJ5IHN0cmluZyBtYXRjaGluZyBvbiByZXNwb25zZVRleHRcbiAgICAgICAgaWYgKHhkci5yZXNwb25zZVRleHQgPT09ICdSZXF1ZXN0IEVudGl0eSBUb28gTGFyZ2UnKSB7XG4gICAgICAgICAgY2FsbGJhY2soNDEzLCB4ZHIucmVzcG9uc2VUZXh0KTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICBjYWxsYmFjayg1MDAsIHhkci5yZXNwb25zZVRleHQpO1xuICAgICAgICB9XG4gICAgICB9O1xuXG4gICAgICB4ZHIub250aW1lb3V0ID0gZnVuY3Rpb24gKCkge307XG5cbiAgICAgIHhkci5vbnByb2dyZXNzID0gZnVuY3Rpb24gKCkge307XG5cbiAgICAgIHhkci5zZW5kKHF1ZXJ5U3RyaW5nLnN0cmluZ2lmeSh0aGlzLmRhdGEpKTtcbiAgICB9IGVsc2Uge1xuICAgICAgdmFyIHhociA9IG5ldyBYTUxIdHRwUmVxdWVzdCgpO1xuICAgICAgeGhyLm9wZW4oJ1BPU1QnLCB0aGlzLnVybCwgdHJ1ZSk7XG5cbiAgICAgIHhoci5vbnJlYWR5c3RhdGVjaGFuZ2UgPSBmdW5jdGlvbiAoKSB7XG4gICAgICAgIGlmICh4aHIucmVhZHlTdGF0ZSA9PT0gNCkge1xuICAgICAgICAgIGNhbGxiYWNrKHhoci5zdGF0dXMsIHhoci5yZXNwb25zZVRleHQpO1xuICAgICAgICB9XG4gICAgICB9O1xuXG4gICAgICB4aHIuc2V0UmVxdWVzdEhlYWRlcignQ29udGVudC1UeXBlJywgJ2FwcGxpY2F0aW9uL3gtd3d3LWZvcm0tdXJsZW5jb2RlZDsgY2hhcnNldD1VVEYtOCcpO1xuICAgICAgeGhyLnNlbmQocXVlcnlTdHJpbmcuc3RyaW5naWZ5KHRoaXMuZGF0YSkpO1xuICAgIH0gLy9sb2coJ3NlbnQgcmVxdWVzdCB0byAnICsgdGhpcy51cmwgKyAnIHdpdGggZGF0YSAnICsgZGVjb2RlVVJJQ29tcG9uZW50KHF1ZXJ5U3RyaW5nKHRoaXMuZGF0YSkpKTtcblxuICB9O1xuXG4gIC8qXG4gICAqIFdyYXBwZXIgZm9yIGxvZ2dpbmcgUmV2ZW51ZSBkYXRhLiBSZXZlbnVlIG9iamVjdHMgZ2V0IHBhc3NlZCB0byBhbXBsaXR1ZGUubG9nUmV2ZW51ZVYyIHRvIHNlbmQgdG8gQW1wbGl0dWRlIHNlcnZlcnMuXG4gICAqIE5vdGU6IHByaWNlIGlzIHRoZSBvbmx5IHJlcXVpcmVkIGZpZWxkLiBJZiBxdWFudGl0eSBpcyBub3Qgc3BlY2lmaWVkLCB0aGVuIGRlZmF1bHRzIHRvIDEuXG4gICAqL1xuXG4gIC8qKlxuICAgKiBSZXZlbnVlIEFQSSAtIGluc3RhbmNlIGNvbnN0cnVjdG9yLiBSZXZlbnVlIG9iamVjdHMgYXJlIGEgd3JhcHBlciBmb3IgcmV2ZW51ZSBkYXRhLlxuICAgKiBFYWNoIG1ldGhvZCB1cGRhdGVzIGEgcmV2ZW51ZSBwcm9wZXJ0eSBpbiB0aGUgUmV2ZW51ZSBvYmplY3QsIGFuZCByZXR1cm5zIHRoZSBzYW1lIFJldmVudWUgb2JqZWN0LFxuICAgKiBhbGxvd2luZyB5b3UgdG8gY2hhaW4gbXVsdGlwbGUgbWV0aG9kIGNhbGxzIHRvZ2V0aGVyLlxuICAgKiBOb3RlOiBwcmljZSBpcyBhIHJlcXVpcmVkIGZpZWxkIHRvIGxvZyByZXZlbnVlIGV2ZW50cy5cbiAgICogSWYgcXVhbnRpdHkgaXMgbm90IHNwZWNpZmllZCB0aGVuIGRlZmF1bHRzIHRvIDEuXG4gICAqIFNlZSBbUmVhZG1lXXtAbGluayBodHRwczovL2dpdGh1Yi5jb20vYW1wbGl0dWRlL0FtcGxpdHVkZS1KYXZhc2NyaXB0I3RyYWNraW5nLXJldmVudWV9IGZvciBtb3JlIGluZm9ybWF0aW9uXG4gICAqIGFib3V0IGxvZ2dpbmcgUmV2ZW51ZS5cbiAgICogQGNvbnN0cnVjdG9yIFJldmVudWVcbiAgICogQHB1YmxpY1xuICAgKiBAZXhhbXBsZSB2YXIgcmV2ZW51ZSA9IG5ldyBhbXBsaXR1ZGUuUmV2ZW51ZSgpO1xuICAgKi9cblxuICB2YXIgUmV2ZW51ZSA9IGZ1bmN0aW9uIFJldmVudWUoKSB7XG4gICAgLy8gcmVxdWlyZWQgZmllbGRzXG4gICAgdGhpcy5fcHJpY2UgPSBudWxsOyAvLyBvcHRpb25hbCBmaWVsZHNcblxuICAgIHRoaXMuX3Byb2R1Y3RJZCA9IG51bGw7XG4gICAgdGhpcy5fcXVhbnRpdHkgPSAxO1xuICAgIHRoaXMuX3JldmVudWVUeXBlID0gbnVsbDtcbiAgICB0aGlzLl9wcm9wZXJ0aWVzID0gbnVsbDtcbiAgfTtcbiAgLyoqXG4gICAqIFNldCBhIHZhbHVlIGZvciB0aGUgcHJvZHVjdCBpZGVudGlmZXIuXG4gICAqIEBwdWJsaWNcbiAgICogQHBhcmFtIHtzdHJpbmd9IHByb2R1Y3RJZCAtIFRoZSB2YWx1ZSBmb3IgdGhlIHByb2R1Y3QgaWRlbnRpZmllci4gRW1wdHkgYW5kIGludmFsaWQgc3RyaW5ncyBhcmUgaWdub3JlZC5cbiAgICogQHJldHVybiB7UmV2ZW51ZX0gUmV0dXJucyB0aGUgc2FtZSBSZXZlbnVlIG9iamVjdCwgYWxsb3dpbmcgeW91IHRvIGNoYWluIG11bHRpcGxlIG1ldGhvZCBjYWxscyB0b2dldGhlci5cbiAgICogQGV4YW1wbGUgdmFyIHJldmVudWUgPSBuZXcgYW1wbGl0dWRlLlJldmVudWUoKS5zZXRQcm9kdWN0SWQoJ3Byb2R1Y3RJZGVudGlmaWVyJykuc2V0UHJpY2UoMTAuOTkpO1xuICAgKiBhbXBsaXR1ZGUubG9nUmV2ZW51ZVYyKHJldmVudWUpO1xuICAgKi9cblxuXG4gIFJldmVudWUucHJvdG90eXBlLnNldFByb2R1Y3RJZCA9IGZ1bmN0aW9uIHNldFByb2R1Y3RJZChwcm9kdWN0SWQpIHtcbiAgICBpZiAodHlwZShwcm9kdWN0SWQpICE9PSAnc3RyaW5nJykge1xuICAgICAgdXRpbHMubG9nLmVycm9yKCdVbnN1cHBvcnRlZCB0eXBlIGZvciBwcm9kdWN0SWQ6ICcgKyB0eXBlKHByb2R1Y3RJZCkgKyAnLCBleHBlY3Rpbmcgc3RyaW5nJyk7XG4gICAgfSBlbHNlIGlmICh1dGlscy5pc0VtcHR5U3RyaW5nKHByb2R1Y3RJZCkpIHtcbiAgICAgIHV0aWxzLmxvZy5lcnJvcignSW52YWxpZCBlbXB0eSBwcm9kdWN0SWQnKTtcbiAgICB9IGVsc2Uge1xuICAgICAgdGhpcy5fcHJvZHVjdElkID0gcHJvZHVjdElkO1xuICAgIH1cblxuICAgIHJldHVybiB0aGlzO1xuICB9O1xuICAvKipcbiAgICogU2V0IGEgdmFsdWUgZm9yIHRoZSBxdWFudGl0eS4gTm90ZSByZXZlbnVlIGFtb3VudCBpcyBjYWxjdWxhdGVkIGFzIHByaWNlICogcXVhbnRpdHkuXG4gICAqIEBwdWJsaWNcbiAgICogQHBhcmFtIHtudW1iZXJ9IHF1YW50aXR5IC0gSW50ZWdlciB2YWx1ZSBmb3IgdGhlIHF1YW50aXR5LiBJZiBub3Qgc2V0LCBxdWFudGl0eSBkZWZhdWx0cyB0byAxLlxuICAgKiBAcmV0dXJuIHtSZXZlbnVlfSBSZXR1cm5zIHRoZSBzYW1lIFJldmVudWUgb2JqZWN0LCBhbGxvd2luZyB5b3UgdG8gY2hhaW4gbXVsdGlwbGUgbWV0aG9kIGNhbGxzIHRvZ2V0aGVyLlxuICAgKiBAZXhhbXBsZSB2YXIgcmV2ZW51ZSA9IG5ldyBhbXBsaXR1ZGUuUmV2ZW51ZSgpLnNldFByb2R1Y3RJZCgncHJvZHVjdElkZW50aWZpZXInKS5zZXRQcmljZSgxMC45OSkuc2V0UXVhbnRpdHkoNSk7XG4gICAqIGFtcGxpdHVkZS5sb2dSZXZlbnVlVjIocmV2ZW51ZSk7XG4gICAqL1xuXG5cbiAgUmV2ZW51ZS5wcm90b3R5cGUuc2V0UXVhbnRpdHkgPSBmdW5jdGlvbiBzZXRRdWFudGl0eShxdWFudGl0eSkge1xuICAgIGlmICh0eXBlKHF1YW50aXR5KSAhPT0gJ251bWJlcicpIHtcbiAgICAgIHV0aWxzLmxvZy5lcnJvcignVW5zdXBwb3J0ZWQgdHlwZSBmb3IgcXVhbnRpdHk6ICcgKyB0eXBlKHF1YW50aXR5KSArICcsIGV4cGVjdGluZyBudW1iZXInKTtcbiAgICB9IGVsc2Uge1xuICAgICAgdGhpcy5fcXVhbnRpdHkgPSBwYXJzZUludChxdWFudGl0eSk7XG4gICAgfVxuXG4gICAgcmV0dXJuIHRoaXM7XG4gIH07XG4gIC8qKlxuICAgKiBTZXQgYSB2YWx1ZSBmb3IgdGhlIHByaWNlLiBUaGlzIGZpZWxkIGlzIHJlcXVpcmVkIGZvciBhbGwgcmV2ZW51ZSBiZWluZyBsb2dnZWQuXG4gICAqIE5vdGUgcmV2ZW51ZSBhbW91bnQgaXMgY2FsY3VsYXRlZCBhcyBwcmljZSAqIHF1YW50aXR5LlxuICAgKiBAcHVibGljXG4gICAqIEBwYXJhbSB7bnVtYmVyfSBwcmljZSAtIERvdWJsZSB2YWx1ZSBmb3IgdGhlIHF1YW50aXR5LlxuICAgKiBAcmV0dXJuIHtSZXZlbnVlfSBSZXR1cm5zIHRoZSBzYW1lIFJldmVudWUgb2JqZWN0LCBhbGxvd2luZyB5b3UgdG8gY2hhaW4gbXVsdGlwbGUgbWV0aG9kIGNhbGxzIHRvZ2V0aGVyLlxuICAgKiBAZXhhbXBsZSB2YXIgcmV2ZW51ZSA9IG5ldyBhbXBsaXR1ZGUuUmV2ZW51ZSgpLnNldFByb2R1Y3RJZCgncHJvZHVjdElkZW50aWZpZXInKS5zZXRQcmljZSgxMC45OSk7XG4gICAqIGFtcGxpdHVkZS5sb2dSZXZlbnVlVjIocmV2ZW51ZSk7XG4gICAqL1xuXG5cbiAgUmV2ZW51ZS5wcm90b3R5cGUuc2V0UHJpY2UgPSBmdW5jdGlvbiBzZXRQcmljZShwcmljZSkge1xuICAgIGlmICh0eXBlKHByaWNlKSAhPT0gJ251bWJlcicpIHtcbiAgICAgIHV0aWxzLmxvZy5lcnJvcignVW5zdXBwb3J0ZWQgdHlwZSBmb3IgcHJpY2U6ICcgKyB0eXBlKHByaWNlKSArICcsIGV4cGVjdGluZyBudW1iZXInKTtcbiAgICB9IGVsc2Uge1xuICAgICAgdGhpcy5fcHJpY2UgPSBwcmljZTtcbiAgICB9XG5cbiAgICByZXR1cm4gdGhpcztcbiAgfTtcbiAgLyoqXG4gICAqIFNldCBhIHZhbHVlIGZvciB0aGUgcmV2ZW51ZVR5cGUgKGZvciBleGFtcGxlIHB1cmNoYXNlLCBjb3N0LCB0YXgsIHJlZnVuZCwgZXRjKS5cbiAgICogQHB1YmxpY1xuICAgKiBAcGFyYW0ge3N0cmluZ30gcmV2ZW51ZVR5cGUgLSBSZXZlbnVlVHlwZSB0byBkZXNpZ25hdGUuXG4gICAqIEByZXR1cm4ge1JldmVudWV9IFJldHVybnMgdGhlIHNhbWUgUmV2ZW51ZSBvYmplY3QsIGFsbG93aW5nIHlvdSB0byBjaGFpbiBtdWx0aXBsZSBtZXRob2QgY2FsbHMgdG9nZXRoZXIuXG4gICAqIEBleGFtcGxlIHZhciByZXZlbnVlID0gbmV3IGFtcGxpdHVkZS5SZXZlbnVlKCkuc2V0UHJvZHVjdElkKCdwcm9kdWN0SWRlbnRpZmllcicpLnNldFByaWNlKDEwLjk5KS5zZXRSZXZlbnVlVHlwZSgncHVyY2hhc2UnKTtcbiAgICogYW1wbGl0dWRlLmxvZ1JldmVudWVWMihyZXZlbnVlKTtcbiAgICovXG5cblxuICBSZXZlbnVlLnByb3RvdHlwZS5zZXRSZXZlbnVlVHlwZSA9IGZ1bmN0aW9uIHNldFJldmVudWVUeXBlKHJldmVudWVUeXBlKSB7XG4gICAgaWYgKHR5cGUocmV2ZW51ZVR5cGUpICE9PSAnc3RyaW5nJykge1xuICAgICAgdXRpbHMubG9nLmVycm9yKCdVbnN1cHBvcnRlZCB0eXBlIGZvciByZXZlbnVlVHlwZTogJyArIHR5cGUocmV2ZW51ZVR5cGUpICsgJywgZXhwZWN0aW5nIHN0cmluZycpO1xuICAgIH0gZWxzZSB7XG4gICAgICB0aGlzLl9yZXZlbnVlVHlwZSA9IHJldmVudWVUeXBlO1xuICAgIH1cblxuICAgIHJldHVybiB0aGlzO1xuICB9O1xuICAvKipcbiAgICogU2V0IGV2ZW50IHByb3BlcnRpZXMgZm9yIHRoZSByZXZlbnVlIGV2ZW50LlxuICAgKiBAcHVibGljXG4gICAqIEBwYXJhbSB7b2JqZWN0fSBldmVudFByb3BlcnRpZXMgLSBSZXZlbnVlIGV2ZW50IHByb3BlcnRpZXMgdG8gc2V0LlxuICAgKiBAcmV0dXJuIHtSZXZlbnVlfSBSZXR1cm5zIHRoZSBzYW1lIFJldmVudWUgb2JqZWN0LCBhbGxvd2luZyB5b3UgdG8gY2hhaW4gbXVsdGlwbGUgbWV0aG9kIGNhbGxzIHRvZ2V0aGVyLlxuICAgKiBAZXhhbXBsZSB2YXIgZXZlbnRfcHJvcGVydGllcyA9IHsnY2l0eSc6ICdTYW4gRnJhbmNpc2NvJ307XG4gICAqIHZhciByZXZlbnVlID0gbmV3IGFtcGxpdHVkZS5SZXZlbnVlKCkuc2V0UHJvZHVjdElkKCdwcm9kdWN0SWRlbnRpZmllcicpLnNldFByaWNlKDEwLjk5KS5zZXRFdmVudFByb3BlcnRpZXMoZXZlbnRfcHJvcGVydGllcyk7XG4gICAqIGFtcGxpdHVkZS5sb2dSZXZlbnVlVjIocmV2ZW51ZSk7XG4gICovXG5cblxuICBSZXZlbnVlLnByb3RvdHlwZS5zZXRFdmVudFByb3BlcnRpZXMgPSBmdW5jdGlvbiBzZXRFdmVudFByb3BlcnRpZXMoZXZlbnRQcm9wZXJ0aWVzKSB7XG4gICAgaWYgKHR5cGUoZXZlbnRQcm9wZXJ0aWVzKSAhPT0gJ29iamVjdCcpIHtcbiAgICAgIHV0aWxzLmxvZy5lcnJvcignVW5zdXBwb3J0ZWQgdHlwZSBmb3IgZXZlbnRQcm9wZXJ0aWVzOiAnICsgdHlwZShldmVudFByb3BlcnRpZXMpICsgJywgZXhwZWN0aW5nIG9iamVjdCcpO1xuICAgIH0gZWxzZSB7XG4gICAgICB0aGlzLl9wcm9wZXJ0aWVzID0gdXRpbHMudmFsaWRhdGVQcm9wZXJ0aWVzKGV2ZW50UHJvcGVydGllcyk7XG4gICAgfVxuXG4gICAgcmV0dXJuIHRoaXM7XG4gIH07XG4gIC8qKlxuICAgKiBAcHJpdmF0ZVxuICAgKi9cblxuXG4gIFJldmVudWUucHJvdG90eXBlLl9pc1ZhbGlkUmV2ZW51ZSA9IGZ1bmN0aW9uIF9pc1ZhbGlkUmV2ZW51ZSgpIHtcbiAgICBpZiAodHlwZSh0aGlzLl9wcmljZSkgIT09ICdudW1iZXInKSB7XG4gICAgICB1dGlscy5sb2cuZXJyb3IoJ0ludmFsaWQgcmV2ZW51ZSwgbmVlZCB0byBzZXQgcHJpY2UgZmllbGQnKTtcbiAgICAgIHJldHVybiBmYWxzZTtcbiAgICB9XG5cbiAgICByZXR1cm4gdHJ1ZTtcbiAgfTtcbiAgLyoqXG4gICAqIEBwcml2YXRlXG4gICAqL1xuXG5cbiAgUmV2ZW51ZS5wcm90b3R5cGUuX3RvSlNPTk9iamVjdCA9IGZ1bmN0aW9uIF90b0pTT05PYmplY3QoKSB7XG4gICAgdmFyIG9iaiA9IHR5cGUodGhpcy5fcHJvcGVydGllcykgPT09ICdvYmplY3QnID8gdGhpcy5fcHJvcGVydGllcyA6IHt9O1xuXG4gICAgaWYgKHRoaXMuX3Byb2R1Y3RJZCAhPT0gbnVsbCkge1xuICAgICAgb2JqW0NvbnN0YW50cy5SRVZFTlVFX1BST0RVQ1RfSURdID0gdGhpcy5fcHJvZHVjdElkO1xuICAgIH1cblxuICAgIGlmICh0aGlzLl9xdWFudGl0eSAhPT0gbnVsbCkge1xuICAgICAgb2JqW0NvbnN0YW50cy5SRVZFTlVFX1FVQU5USVRZXSA9IHRoaXMuX3F1YW50aXR5O1xuICAgIH1cblxuICAgIGlmICh0aGlzLl9wcmljZSAhPT0gbnVsbCkge1xuICAgICAgb2JqW0NvbnN0YW50cy5SRVZFTlVFX1BSSUNFXSA9IHRoaXMuX3ByaWNlO1xuICAgIH1cblxuICAgIGlmICh0aGlzLl9yZXZlbnVlVHlwZSAhPT0gbnVsbCkge1xuICAgICAgb2JqW0NvbnN0YW50cy5SRVZFTlVFX1JFVkVOVUVfVFlQRV0gPSB0aGlzLl9yZXZlbnVlVHlwZTtcbiAgICB9XG5cbiAgICByZXR1cm4gb2JqO1xuICB9O1xuXG4gIHZhciB1YVBhcnNlciA9IGNyZWF0ZUNvbW1vbmpzTW9kdWxlKGZ1bmN0aW9uIChtb2R1bGUsIGV4cG9ydHMpIHtcbiAgLyohXG4gICAqIFVBUGFyc2VyLmpzIHYwLjcuMTlcbiAgICogTGlnaHR3ZWlnaHQgSmF2YVNjcmlwdC1iYXNlZCBVc2VyLUFnZW50IHN0cmluZyBwYXJzZXJcbiAgICogaHR0cHM6Ly9naXRodWIuY29tL2ZhaXNhbG1hbi91YS1wYXJzZXItanNcbiAgICpcbiAgICogQ29weXJpZ2h0IMKpIDIwMTItMjAxNiBGYWlzYWwgU2FsbWFuIDxmeXpsbWFuQGdtYWlsLmNvbT5cbiAgICogRHVhbCBsaWNlbnNlZCB1bmRlciBHUEx2MiBvciBNSVRcbiAgICovXG5cbiAgKGZ1bmN0aW9uICh3aW5kb3csIHVuZGVmaW5lZCQxKSB7XG5cbiAgICAgIC8vLy8vLy8vLy8vLy8vXG4gICAgICAvLyBDb25zdGFudHNcbiAgICAgIC8vLy8vLy8vLy8vLy9cblxuXG4gICAgICB2YXIgTElCVkVSU0lPTiAgPSAnMC43LjE5JyxcbiAgICAgICAgICBFTVBUWSAgICAgICA9ICcnLFxuICAgICAgICAgIFVOS05PV04gICAgID0gJz8nLFxuICAgICAgICAgIEZVTkNfVFlQRSAgID0gJ2Z1bmN0aW9uJyxcbiAgICAgICAgICBVTkRFRl9UWVBFICA9ICd1bmRlZmluZWQnLFxuICAgICAgICAgIE9CSl9UWVBFICAgID0gJ29iamVjdCcsXG4gICAgICAgICAgU1RSX1RZUEUgICAgPSAnc3RyaW5nJyxcbiAgICAgICAgICBNQUpPUiAgICAgICA9ICdtYWpvcicsIC8vIGRlcHJlY2F0ZWRcbiAgICAgICAgICBNT0RFTCAgICAgICA9ICdtb2RlbCcsXG4gICAgICAgICAgTkFNRSAgICAgICAgPSAnbmFtZScsXG4gICAgICAgICAgVFlQRSAgICAgICAgPSAndHlwZScsXG4gICAgICAgICAgVkVORE9SICAgICAgPSAndmVuZG9yJyxcbiAgICAgICAgICBWRVJTSU9OICAgICA9ICd2ZXJzaW9uJyxcbiAgICAgICAgICBBUkNISVRFQ1RVUkU9ICdhcmNoaXRlY3R1cmUnLFxuICAgICAgICAgIENPTlNPTEUgICAgID0gJ2NvbnNvbGUnLFxuICAgICAgICAgIE1PQklMRSAgICAgID0gJ21vYmlsZScsXG4gICAgICAgICAgVEFCTEVUICAgICAgPSAndGFibGV0JyxcbiAgICAgICAgICBTTUFSVFRWICAgICA9ICdzbWFydHR2JyxcbiAgICAgICAgICBXRUFSQUJMRSAgICA9ICd3ZWFyYWJsZScsXG4gICAgICAgICAgRU1CRURERUQgICAgPSAnZW1iZWRkZWQnO1xuXG5cbiAgICAgIC8vLy8vLy8vLy8vXG4gICAgICAvLyBIZWxwZXJcbiAgICAgIC8vLy8vLy8vLy9cblxuXG4gICAgICB2YXIgdXRpbCA9IHtcbiAgICAgICAgICBleHRlbmQgOiBmdW5jdGlvbiAocmVnZXhlcywgZXh0ZW5zaW9ucykge1xuICAgICAgICAgICAgICB2YXIgbWFyZ2VkUmVnZXhlcyA9IHt9O1xuICAgICAgICAgICAgICBmb3IgKHZhciBpIGluIHJlZ2V4ZXMpIHtcbiAgICAgICAgICAgICAgICAgIGlmIChleHRlbnNpb25zW2ldICYmIGV4dGVuc2lvbnNbaV0ubGVuZ3RoICUgMiA9PT0gMCkge1xuICAgICAgICAgICAgICAgICAgICAgIG1hcmdlZFJlZ2V4ZXNbaV0gPSBleHRlbnNpb25zW2ldLmNvbmNhdChyZWdleGVzW2ldKTtcbiAgICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgICAgbWFyZ2VkUmVnZXhlc1tpXSA9IHJlZ2V4ZXNbaV07XG4gICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgcmV0dXJuIG1hcmdlZFJlZ2V4ZXM7XG4gICAgICAgICAgfSxcbiAgICAgICAgICBoYXMgOiBmdW5jdGlvbiAoc3RyMSwgc3RyMikge1xuICAgICAgICAgICAgaWYgKHR5cGVvZiBzdHIxID09PSBcInN0cmluZ1wiKSB7XG4gICAgICAgICAgICAgIHJldHVybiBzdHIyLnRvTG93ZXJDYXNlKCkuaW5kZXhPZihzdHIxLnRvTG93ZXJDYXNlKCkpICE9PSAtMTtcbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgIHJldHVybiBmYWxzZTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICB9LFxuICAgICAgICAgIGxvd2VyaXplIDogZnVuY3Rpb24gKHN0cikge1xuICAgICAgICAgICAgICByZXR1cm4gc3RyLnRvTG93ZXJDYXNlKCk7XG4gICAgICAgICAgfSxcbiAgICAgICAgICBtYWpvciA6IGZ1bmN0aW9uICh2ZXJzaW9uKSB7XG4gICAgICAgICAgICAgIHJldHVybiB0eXBlb2YodmVyc2lvbikgPT09IFNUUl9UWVBFID8gdmVyc2lvbi5yZXBsYWNlKC9bXlxcZFxcLl0vZywnJykuc3BsaXQoXCIuXCIpWzBdIDogdW5kZWZpbmVkJDE7XG4gICAgICAgICAgfSxcbiAgICAgICAgICB0cmltIDogZnVuY3Rpb24gKHN0cikge1xuICAgICAgICAgICAgcmV0dXJuIHN0ci5yZXBsYWNlKC9eW1xcc1xcdUZFRkZcXHhBMF0rfFtcXHNcXHVGRUZGXFx4QTBdKyQvZywgJycpO1xuICAgICAgICAgIH1cbiAgICAgIH07XG5cblxuICAgICAgLy8vLy8vLy8vLy8vLy8vXG4gICAgICAvLyBNYXAgaGVscGVyXG4gICAgICAvLy8vLy8vLy8vLy8vL1xuXG5cbiAgICAgIHZhciBtYXBwZXIgPSB7XG5cbiAgICAgICAgICByZ3ggOiBmdW5jdGlvbiAodWEsIGFycmF5cykge1xuXG4gICAgICAgICAgICAgIC8vdmFyIHJlc3VsdCA9IHt9LFxuICAgICAgICAgICAgICB2YXIgaSA9IDAsIGosIGssIHAsIHEsIG1hdGNoZXMsIG1hdGNoOy8vLCBhcmdzID0gYXJndW1lbnRzO1xuXG4gICAgICAgICAgICAgIC8qLy8gY29uc3RydWN0IG9iamVjdCBiYXJlYm9uZXNcbiAgICAgICAgICAgICAgZm9yIChwID0gMDsgcCA8IGFyZ3NbMV0ubGVuZ3RoOyBwKyspIHtcbiAgICAgICAgICAgICAgICAgIHEgPSBhcmdzWzFdW3BdO1xuICAgICAgICAgICAgICAgICAgcmVzdWx0W3R5cGVvZiBxID09PSBPQkpfVFlQRSA/IHFbMF0gOiBxXSA9IHVuZGVmaW5lZDtcbiAgICAgICAgICAgICAgfSovXG5cbiAgICAgICAgICAgICAgLy8gbG9vcCB0aHJvdWdoIGFsbCByZWdleGVzIG1hcHNcbiAgICAgICAgICAgICAgd2hpbGUgKGkgPCBhcnJheXMubGVuZ3RoICYmICFtYXRjaGVzKSB7XG5cbiAgICAgICAgICAgICAgICAgIHZhciByZWdleCA9IGFycmF5c1tpXSwgICAgICAgLy8gZXZlbiBzZXF1ZW5jZSAoMCwyLDQsLi4pXG4gICAgICAgICAgICAgICAgICAgICAgcHJvcHMgPSBhcnJheXNbaSArIDFdOyAgIC8vIG9kZCBzZXF1ZW5jZSAoMSwzLDUsLi4pXG4gICAgICAgICAgICAgICAgICBqID0gayA9IDA7XG5cbiAgICAgICAgICAgICAgICAgIC8vIHRyeSBtYXRjaGluZyB1YXN0cmluZyB3aXRoIHJlZ2V4ZXNcbiAgICAgICAgICAgICAgICAgIHdoaWxlIChqIDwgcmVnZXgubGVuZ3RoICYmICFtYXRjaGVzKSB7XG5cbiAgICAgICAgICAgICAgICAgICAgICBtYXRjaGVzID0gcmVnZXhbaisrXS5leGVjKHVhKTtcblxuICAgICAgICAgICAgICAgICAgICAgIGlmICghIW1hdGNoZXMpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgZm9yIChwID0gMDsgcCA8IHByb3BzLmxlbmd0aDsgcCsrKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICBtYXRjaCA9IG1hdGNoZXNbKytrXTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHEgPSBwcm9wc1twXTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIC8vIGNoZWNrIGlmIGdpdmVuIHByb3BlcnR5IGlzIGFjdHVhbGx5IGFycmF5XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICBpZiAodHlwZW9mIHEgPT09IE9CSl9UWVBFICYmIHEubGVuZ3RoID4gMCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGlmIChxLmxlbmd0aCA9PSAyKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGlmICh0eXBlb2YgcVsxXSA9PSBGVU5DX1RZUEUpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIC8vIGFzc2lnbiBtb2RpZmllZCBtYXRjaFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgdGhpc1txWzBdXSA9IHFbMV0uY2FsbCh0aGlzLCBtYXRjaCk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAvLyBhc3NpZ24gZ2l2ZW4gdmFsdWUsIGlnbm9yZSByZWdleCBtYXRjaFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgdGhpc1txWzBdXSA9IHFbMV07XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB9IGVsc2UgaWYgKHEubGVuZ3RoID09IDMpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgLy8gY2hlY2sgd2hldGhlciBmdW5jdGlvbiBvciByZWdleFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBpZiAodHlwZW9mIHFbMV0gPT09IEZVTkNfVFlQRSAmJiAhKHFbMV0uZXhlYyAmJiBxWzFdLnRlc3QpKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAvLyBjYWxsIGZ1bmN0aW9uICh1c3VhbGx5IHN0cmluZyBtYXBwZXIpXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB0aGlzW3FbMF1dID0gbWF0Y2ggPyBxWzFdLmNhbGwodGhpcywgbWF0Y2gsIHFbMl0pIDogdW5kZWZpbmVkJDE7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAvLyBzYW5pdGl6ZSBtYXRjaCB1c2luZyBnaXZlbiByZWdleFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgdGhpc1txWzBdXSA9IG1hdGNoID8gbWF0Y2gucmVwbGFjZShxWzFdLCBxWzJdKSA6IHVuZGVmaW5lZCQxO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgfSBlbHNlIGlmIChxLmxlbmd0aCA9PSA0KSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB0aGlzW3FbMF1dID0gbWF0Y2ggPyBxWzNdLmNhbGwodGhpcywgbWF0Y2gucmVwbGFjZShxWzFdLCBxWzJdKSkgOiB1bmRlZmluZWQkMTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHRoaXNbcV0gPSBtYXRjaCA/IG1hdGNoIDogdW5kZWZpbmVkJDE7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICBpICs9IDI7XG4gICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgLy8gY29uc29sZS5sb2codGhpcyk7XG4gICAgICAgICAgICAgIC8vcmV0dXJuIHRoaXM7XG4gICAgICAgICAgfSxcblxuICAgICAgICAgIHN0ciA6IGZ1bmN0aW9uIChzdHIsIG1hcCkge1xuXG4gICAgICAgICAgICAgIGZvciAodmFyIGkgaW4gbWFwKSB7XG4gICAgICAgICAgICAgICAgICAvLyBjaGVjayBpZiBhcnJheVxuICAgICAgICAgICAgICAgICAgaWYgKHR5cGVvZiBtYXBbaV0gPT09IE9CSl9UWVBFICYmIG1hcFtpXS5sZW5ndGggPiAwKSB7XG4gICAgICAgICAgICAgICAgICAgICAgZm9yICh2YXIgaiA9IDA7IGogPCBtYXBbaV0ubGVuZ3RoOyBqKyspIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgaWYgKHV0aWwuaGFzKG1hcFtpXVtqXSwgc3RyKSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuIChpID09PSBVTktOT1dOKSA/IHVuZGVmaW5lZCQxIDogaTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgIH0gZWxzZSBpZiAodXRpbC5oYXMobWFwW2ldLCBzdHIpKSB7XG4gICAgICAgICAgICAgICAgICAgICAgcmV0dXJuIChpID09PSBVTktOT1dOKSA/IHVuZGVmaW5lZCQxIDogaTtcbiAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICByZXR1cm4gc3RyO1xuICAgICAgICAgIH1cbiAgICAgIH07XG5cblxuICAgICAgLy8vLy8vLy8vLy8vLy8vXG4gICAgICAvLyBTdHJpbmcgbWFwXG4gICAgICAvLy8vLy8vLy8vLy8vL1xuXG5cbiAgICAgIHZhciBtYXBzID0ge1xuXG4gICAgICAgICAgYnJvd3NlciA6IHtcbiAgICAgICAgICAgICAgb2xkc2FmYXJpIDoge1xuICAgICAgICAgICAgICAgICAgdmVyc2lvbiA6IHtcbiAgICAgICAgICAgICAgICAgICAgICAnMS4wJyAgIDogJy84JyxcbiAgICAgICAgICAgICAgICAgICAgICAnMS4yJyAgIDogJy8xJyxcbiAgICAgICAgICAgICAgICAgICAgICAnMS4zJyAgIDogJy8zJyxcbiAgICAgICAgICAgICAgICAgICAgICAnMi4wJyAgIDogJy80MTInLFxuICAgICAgICAgICAgICAgICAgICAgICcyLjAuMicgOiAnLzQxNicsXG4gICAgICAgICAgICAgICAgICAgICAgJzIuMC4zJyA6ICcvNDE3JyxcbiAgICAgICAgICAgICAgICAgICAgICAnMi4wLjQnIDogJy80MTknLFxuICAgICAgICAgICAgICAgICAgICAgICc/JyAgICAgOiAnLydcbiAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgbmFtZSA6IHtcbiAgICAgICAgICAgICAgICAgICdPcGVyYSBNb2JpbGUnIDogJ09wZXJhIE1vYmknLFxuICAgICAgICAgICAgICAgICAgJ0lFIE1vYmlsZScgICAgOiAnSUVNb2JpbGUnXG4gICAgICAgICAgICAgIH1cbiAgICAgICAgICB9LFxuXG4gICAgICAgICAgZGV2aWNlIDoge1xuICAgICAgICAgICAgICBhbWF6b24gOiB7XG4gICAgICAgICAgICAgICAgICBtb2RlbCA6IHtcbiAgICAgICAgICAgICAgICAgICAgICAnRmlyZSBQaG9uZScgOiBbJ1NEJywgJ0tGJ11cbiAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgc3ByaW50IDoge1xuICAgICAgICAgICAgICAgICAgbW9kZWwgOiB7XG4gICAgICAgICAgICAgICAgICAgICAgJ0V2byBTaGlmdCA0RycgOiAnNzM3M0tUJ1xuICAgICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICAgIHZlbmRvciA6IHtcbiAgICAgICAgICAgICAgICAgICAgICAnSFRDJyAgICAgICA6ICdBUEEnLFxuICAgICAgICAgICAgICAgICAgICAgICdTcHJpbnQnICAgIDogJ1NwcmludCdcbiAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgfVxuICAgICAgICAgIH0sXG5cbiAgICAgICAgICBvcyA6IHtcbiAgICAgICAgICAgICAgd2luZG93cyA6IHtcbiAgICAgICAgICAgICAgICAgIHZlcnNpb24gOiB7XG4gICAgICAgICAgICAgICAgICAgICAgJ01FJyAgICAgICAgOiAnNC45MCcsXG4gICAgICAgICAgICAgICAgICAgICAgJ05UIDMuMTEnICAgOiAnTlQzLjUxJyxcbiAgICAgICAgICAgICAgICAgICAgICAnTlQgNC4wJyAgICA6ICdOVDQuMCcsXG4gICAgICAgICAgICAgICAgICAgICAgJzIwMDAnICAgICAgOiAnTlQgNS4wJyxcbiAgICAgICAgICAgICAgICAgICAgICAnWFAnICAgICAgICA6IFsnTlQgNS4xJywgJ05UIDUuMiddLFxuICAgICAgICAgICAgICAgICAgICAgICdWaXN0YScgICAgIDogJ05UIDYuMCcsXG4gICAgICAgICAgICAgICAgICAgICAgJzcnICAgICAgICAgOiAnTlQgNi4xJyxcbiAgICAgICAgICAgICAgICAgICAgICAnOCcgICAgICAgICA6ICdOVCA2LjInLFxuICAgICAgICAgICAgICAgICAgICAgICc4LjEnICAgICAgIDogJ05UIDYuMycsXG4gICAgICAgICAgICAgICAgICAgICAgJzEwJyAgICAgICAgOiBbJ05UIDYuNCcsICdOVCAxMC4wJ10sXG4gICAgICAgICAgICAgICAgICAgICAgJ1JUJyAgICAgICAgOiAnQVJNJ1xuICAgICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICAgIG5hbWUgOiB7XG4gICAgICAgICAgICAgICAgICAgICAgJ1dpbmRvd3MgUGhvbmUnIDogJ1dpbmRvd3MgUGhvbmUgT1MnXG4gICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgIH1cbiAgICAgICAgICB9XG4gICAgICB9O1xuXG5cbiAgICAgIC8vLy8vLy8vLy8vLy8vXG4gICAgICAvLyBSZWdleCBtYXBcbiAgICAgIC8vLy8vLy8vLy8vLy9cblxuXG4gICAgICB2YXIgcmVnZXhlcyA9IHtcblxuICAgICAgICAgIGJyb3dzZXIgOiBbW1xuXG4gICAgICAgICAgICAgIC8vIFByZXN0byBiYXNlZFxuICAgICAgICAgICAgICAvKG9wZXJhXFxzbWluaSlcXC8oW1xcd1xcLi1dKykvaSwgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAvLyBPcGVyYSBNaW5pXG4gICAgICAgICAgICAgIC8ob3BlcmFcXHNbbW9iaWxldGFiXSspLit2ZXJzaW9uXFwvKFtcXHdcXC4tXSspL2ksICAgICAgICAgICAgICAgICAgICAgIC8vIE9wZXJhIE1vYmkvVGFibGV0XG4gICAgICAgICAgICAgIC8ob3BlcmEpLit2ZXJzaW9uXFwvKFtcXHdcXC5dKykvaSwgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgLy8gT3BlcmEgPiA5LjgwXG4gICAgICAgICAgICAgIC8ob3BlcmEpW1xcL1xcc10rKFtcXHdcXC5dKykvaSAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIC8vIE9wZXJhIDwgOS44MFxuICAgICAgICAgICAgICBdLCBbTkFNRSwgVkVSU0lPTl0sIFtcblxuICAgICAgICAgICAgICAvKG9waW9zKVtcXC9cXHNdKyhbXFx3XFwuXSspL2kgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAvLyBPcGVyYSBtaW5pIG9uIGlwaG9uZSA+PSA4LjBcbiAgICAgICAgICAgICAgXSwgW1tOQU1FLCAnT3BlcmEgTWluaSddLCBWRVJTSU9OXSwgW1xuXG4gICAgICAgICAgICAgIC9cXHMob3ByKVxcLyhbXFx3XFwuXSspL2kgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIC8vIE9wZXJhIFdlYmtpdFxuICAgICAgICAgICAgICBdLCBbW05BTUUsICdPcGVyYSddLCBWRVJTSU9OXSwgW1xuXG4gICAgICAgICAgICAgIC8vIE1peGVkXG4gICAgICAgICAgICAgIC8oa2luZGxlKVxcLyhbXFx3XFwuXSspL2ksICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgLy8gS2luZGxlXG4gICAgICAgICAgICAgIC8obHVuYXNjYXBlfG1heHRob258bmV0ZnJvbnR8amFzbWluZXxibGF6ZXIpW1xcL1xcc10/KFtcXHdcXC5dKikvaSxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAvLyBMdW5hc2NhcGUvTWF4dGhvbi9OZXRmcm9udC9KYXNtaW5lL0JsYXplclxuXG4gICAgICAgICAgICAgIC8vIFRyaWRlbnQgYmFzZWRcbiAgICAgICAgICAgICAgLyhhdmFudFxcc3xpZW1vYmlsZXxzbGltfGJhaWR1KSg/OmJyb3dzZXIpP1tcXC9cXHNdPyhbXFx3XFwuXSopL2ksXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgLy8gQXZhbnQvSUVNb2JpbGUvU2xpbUJyb3dzZXIvQmFpZHVcbiAgICAgICAgICAgICAgLyg/Om1zfFxcKCkoaWUpXFxzKFtcXHdcXC5dKykvaSwgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgLy8gSW50ZXJuZXQgRXhwbG9yZXJcblxuICAgICAgICAgICAgICAvLyBXZWJraXQvS0hUTUwgYmFzZWRcbiAgICAgICAgICAgICAgLyhyZWtvbnEpXFwvKFtcXHdcXC5dKikvaSwgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAvLyBSZWtvbnFcbiAgICAgICAgICAgICAgLyhjaHJvbWl1bXxmbG9ja3xyb2NrbWVsdHxtaWRvcml8ZXBpcGhhbnl8c2lsa3xza3lmaXJlfG92aWJyb3dzZXJ8Ym9sdHxpcm9ufHZpdmFsZGl8aXJpZGl1bXxwaGFudG9tanN8Ym93c2VyfHF1YXJrfHF1cHppbGxhfGZhbGtvbilcXC8oW1xcd1xcLi1dKykvaVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIC8vIENocm9taXVtL0Zsb2NrL1JvY2tNZWx0L01pZG9yaS9FcGlwaGFueS9TaWxrL1NreWZpcmUvQm9sdC9Jcm9uL0lyaWRpdW0vUGhhbnRvbUpTL0Jvd3Nlci9RdXBaaWxsYS9GYWxrb25cbiAgICAgICAgICAgICAgXSwgW05BTUUsIFZFUlNJT05dLCBbXG5cbiAgICAgICAgICAgICAgLyhrb25xdWVyb3IpXFwvKFtcXHdcXC5dKykvaSAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAvLyBLb25xdWVyb3JcbiAgICAgICAgICAgICAgXSwgW1tOQU1FLCAnS29ucXVlcm9yJ10sIFZFUlNJT05dLCBbXG5cbiAgICAgICAgICAgICAgLyh0cmlkZW50KS4rcnZbOlxcc10oW1xcd1xcLl0rKS4rbGlrZVxcc2dlY2tvL2kgICAgICAgICAgICAgICAgICAgICAgICAgLy8gSUUxMVxuICAgICAgICAgICAgICBdLCBbW05BTUUsICdJRSddLCBWRVJTSU9OXSwgW1xuXG4gICAgICAgICAgICAgIC8oZWRnZXxlZGdpb3N8ZWRnYSlcXC8oKFxcZCspP1tcXHdcXC5dKykvaSAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIC8vIE1pY3Jvc29mdCBFZGdlXG4gICAgICAgICAgICAgIF0sIFtbTkFNRSwgJ0VkZ2UnXSwgVkVSU0lPTl0sIFtcblxuICAgICAgICAgICAgICAvKHlhYnJvd3NlcilcXC8oW1xcd1xcLl0rKS9pICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIC8vIFlhbmRleFxuICAgICAgICAgICAgICBdLCBbW05BTUUsICdZYW5kZXgnXSwgVkVSU0lPTl0sIFtcblxuICAgICAgICAgICAgICAvKHB1ZmZpbilcXC8oW1xcd1xcLl0rKS9pICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIC8vIFB1ZmZpblxuICAgICAgICAgICAgICBdLCBbW05BTUUsICdQdWZmaW4nXSwgVkVSU0lPTl0sIFtcblxuICAgICAgICAgICAgICAvKGZvY3VzKVxcLyhbXFx3XFwuXSspL2kgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIC8vIEZpcmVmb3ggRm9jdXNcbiAgICAgICAgICAgICAgXSwgW1tOQU1FLCAnRmlyZWZveCBGb2N1cyddLCBWRVJTSU9OXSwgW1xuXG4gICAgICAgICAgICAgIC8ob3B0KVxcLyhbXFx3XFwuXSspL2kgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgLy8gT3BlcmEgVG91Y2hcbiAgICAgICAgICAgICAgXSwgW1tOQU1FLCAnT3BlcmEgVG91Y2gnXSwgVkVSU0lPTl0sIFtcblxuICAgICAgICAgICAgICAvKCg/OltcXHNcXC9dKXVjP1xccz9icm93c2VyfCg/Omp1Yy4rKXVjd2ViKVtcXC9cXHNdPyhbXFx3XFwuXSspL2kgICAgICAgICAvLyBVQ0Jyb3dzZXJcbiAgICAgICAgICAgICAgXSwgW1tOQU1FLCAnVUNCcm93c2VyJ10sIFZFUlNJT05dLCBbXG5cbiAgICAgICAgICAgICAgLyhjb21vZG9fZHJhZ29uKVxcLyhbXFx3XFwuXSspL2kgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAvLyBDb21vZG8gRHJhZ29uXG4gICAgICAgICAgICAgIF0sIFtbTkFNRSwgL18vZywgJyAnXSwgVkVSU0lPTl0sIFtcblxuICAgICAgICAgICAgICAvKCg/OmFuZHJvaWQuKyljcm1vfGNyaW9zKVxcLyhbXFx3XFwuXSspL2ksXG4gICAgICAgICAgICAgIC9hbmRyb2lkLisoY2hyb21lKVxcLyhbXFx3XFwuXSspXFxzKyg/Om1vYmlsZVxccz9zYWZhcmkpL2kgICAgICAgICAgICAgICAvLyBDaHJvbWUgZm9yIEFuZHJvaWQvaU9TXG4gICAgICAgICAgICAgIF0sIFtbTkFNRSwgJ0Nocm9tZSBNb2JpbGUnXSwgVkVSU0lPTl0sIFtcblxuICAgICAgICAgICAgICAvKG1pY3JvbWVzc2VuZ2VyKVxcLyhbXFx3XFwuXSspL2kgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIC8vIFdlQ2hhdFxuICAgICAgICAgICAgICBdLCBbW05BTUUsICdXZUNoYXQnXSwgVkVSU0lPTl0sIFtcblxuICAgICAgICAgICAgICAvKGJyYXZlKVxcLyhbXFx3XFwuXSspL2kgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgLy8gQnJhdmUgYnJvd3NlclxuICAgICAgICAgICAgICBdLCBbW05BTUUsICdCcmF2ZSddLCBWRVJTSU9OXSwgW1xuXG4gICAgICAgICAgICAgIC8ocXFicm93c2VybGl0ZSlcXC8oW1xcd1xcLl0rKS9pICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgLy8gUVFCcm93c2VyTGl0ZVxuICAgICAgICAgICAgICBdLCBbTkFNRSwgVkVSU0lPTl0sIFtcblxuICAgICAgICAgICAgICAvKFFRKVxcLyhbXFxkXFwuXSspL2kgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIC8vIFFRLCBha2EgU2hvdVFcbiAgICAgICAgICAgICAgXSwgW05BTUUsIFZFUlNJT05dLCBbXG5cbiAgICAgICAgICAgICAgL20/KHFxYnJvd3NlcilbXFwvXFxzXT8oW1xcd1xcLl0rKS9pICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgLy8gUVFCcm93c2VyXG4gICAgICAgICAgICAgIF0sIFtOQU1FLCBWRVJTSU9OXSwgW1xuXG4gICAgICAgICAgICAgIC8oQklEVUJyb3dzZXIpW1xcL1xcc10/KFtcXHdcXC5dKykvaSAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIC8vIEJhaWR1IEJyb3dzZXJcbiAgICAgICAgICAgICAgXSwgW05BTUUsIFZFUlNJT05dLCBbXG5cbiAgICAgICAgICAgICAgLygyMzQ1RXhwbG9yZXIpW1xcL1xcc10/KFtcXHdcXC5dKykvaSAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgLy8gMjM0NSBCcm93c2VyXG4gICAgICAgICAgICAgIF0sIFtOQU1FLCBWRVJTSU9OXSwgW1xuXG4gICAgICAgICAgICAgIC8oTWV0YVNyKVtcXC9cXHNdPyhbXFx3XFwuXSspL2kgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIC8vIFNvdUdvdUJyb3dzZXJcbiAgICAgICAgICAgICAgXSwgW05BTUVdLCBbXG5cbiAgICAgICAgICAgICAgLyhMQkJST1dTRVIpL2kgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIC8vIExpZUJhbyBCcm93c2VyXG4gICAgICAgICAgICAgIF0sIFtOQU1FXSwgW1xuXG4gICAgICAgICAgICAgIC94aWFvbWlcXC9taXVpYnJvd3NlclxcLyhbXFx3XFwuXSspL2kgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIC8vIE1JVUkgQnJvd3NlclxuICAgICAgICAgICAgICBdLCBbVkVSU0lPTiwgW05BTUUsICdNSVVJIEJyb3dzZXInXV0sIFtcblxuICAgICAgICAgICAgICAvO2ZiYXZcXC8oW1xcd1xcLl0rKTsvaSAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIC8vIEZhY2Vib29rIEFwcCBmb3IgaU9TICYgQW5kcm9pZFxuICAgICAgICAgICAgICBdLCBbVkVSU0lPTiwgW05BTUUsICdGYWNlYm9vayddXSwgW1xuXG4gICAgICAgICAgICAgIC9zYWZhcmlcXHMobGluZSlcXC8oW1xcd1xcLl0rKS9pLCAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIC8vIExpbmUgQXBwIGZvciBpT1NcbiAgICAgICAgICAgICAgL2FuZHJvaWQuKyhsaW5lKVxcLyhbXFx3XFwuXSspXFwvaWFiL2kgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgLy8gTGluZSBBcHAgZm9yIEFuZHJvaWRcbiAgICAgICAgICAgICAgXSwgW05BTUUsIFZFUlNJT05dLCBbXG5cbiAgICAgICAgICAgICAgL2hlYWRsZXNzY2hyb21lKD86XFwvKFtcXHdcXC5dKyl8XFxzKS9pICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgLy8gQ2hyb21lIEhlYWRsZXNzXG4gICAgICAgICAgICAgIF0sIFtWRVJTSU9OLCBbTkFNRSwgJ0Nocm9tZSBIZWFkbGVzcyddXSwgW1xuXG4gICAgICAgICAgICAgIC9cXHN3dlxcKS4rKGNocm9tZSlcXC8oW1xcd1xcLl0rKS9pICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAvLyBDaHJvbWUgV2ViVmlld1xuICAgICAgICAgICAgICBdLCBbW05BTUUsIC8oLispLywgJyQxIFdlYlZpZXcnXSwgVkVSU0lPTl0sIFtcblxuICAgICAgICAgICAgICAvKCg/Om9jdWx1c3xzYW1zdW5nKWJyb3dzZXIpXFwvKFtcXHdcXC5dKykvaVxuICAgICAgICAgICAgICBdLCBbW05BTUUsIC8oLisoPzpnfHVzKSkoLispLywgJyQxICQyJ10sIFZFUlNJT05dLCBbICAgICAgICAgICAgICAgIC8vIE9jdWx1cyAvIFNhbXN1bmcgQnJvd3NlclxuXG4gICAgICAgICAgICAgIC9hbmRyb2lkLit2ZXJzaW9uXFwvKFtcXHdcXC5dKylcXHMrKD86bW9iaWxlXFxzP3NhZmFyaXxzYWZhcmkpKi9pICAgICAgICAvLyBBbmRyb2lkIEJyb3dzZXJcbiAgICAgICAgICAgICAgXSwgW1ZFUlNJT04sIFtOQU1FLCAnQW5kcm9pZCBCcm93c2VyJ11dLCBbXG5cbiAgICAgICAgICAgICAgLyhjaHJvbWV8b21uaXdlYnxhcm9yYXxbdGl6ZW5va2FdezV9XFxzP2Jyb3dzZXIpXFwvdj8oW1xcd1xcLl0rKS9pXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgLy8gQ2hyb21lL09tbmlXZWIvQXJvcmEvVGl6ZW4vTm9raWFcbiAgICAgICAgICAgICAgXSwgW05BTUUsIFZFUlNJT05dLCBbXG5cbiAgICAgICAgICAgICAgLyhkb2xmaW4pXFwvKFtcXHdcXC5dKykvaSAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAvLyBEb2xwaGluXG4gICAgICAgICAgICAgIF0sIFtbTkFNRSwgJ0RvbHBoaW4nXSwgVkVSU0lPTl0sIFtcblxuICAgICAgICAgICAgICAvKGNvYXN0KVxcLyhbXFx3XFwuXSspL2kgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIC8vIE9wZXJhIENvYXN0XG4gICAgICAgICAgICAgIF0sIFtbTkFNRSwgJ09wZXJhIENvYXN0J10sIFZFUlNJT05dLCBbXG5cbiAgICAgICAgICAgICAgL2Z4aW9zXFwvKFtcXHdcXC4tXSspL2kgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAvLyBGaXJlZm94IGZvciBpT1NcbiAgICAgICAgICAgICAgXSwgW1ZFUlNJT04sIFtOQU1FLCAnRmlyZWZveCddXSwgW1xuXG4gICAgICAgICAgICAgIC92ZXJzaW9uXFwvKFtcXHdcXC5dKykuKz9tb2JpbGVcXC9cXHcrXFxzKHNhZmFyaSkvaSAgICAgICAgICAgICAgICAgICAgICAgLy8gTW9iaWxlIFNhZmFyaVxuICAgICAgICAgICAgICBdLCBbVkVSU0lPTiwgW05BTUUsICdNb2JpbGUgU2FmYXJpJ11dLCBbXG5cbiAgICAgICAgICAgICAgL3ZlcnNpb25cXC8oW1xcd1xcLl0rKS4rPyhtb2JpbGVcXHM/c2FmYXJpfHNhZmFyaSkvaSAgICAgICAgICAgICAgICAgICAgLy8gU2FmYXJpICYgU2FmYXJpIE1vYmlsZVxuICAgICAgICAgICAgICBdLCBbVkVSU0lPTiwgTkFNRV0sIFtcblxuICAgICAgICAgICAgICAvd2Via2l0Lis/KGdzYSlcXC8oW1xcd1xcLl0rKS4rPyhtb2JpbGVcXHM/c2FmYXJpfHNhZmFyaSkoXFwvW1xcd1xcLl0rKS9pICAvLyBHb29nbGUgU2VhcmNoIEFwcGxpYW5jZSBvbiBpT1NcbiAgICAgICAgICAgICAgXSwgW1tOQU1FLCAnR1NBJ10sIFZFUlNJT05dLCBbXG5cbiAgICAgICAgICAgICAgL3dlYmtpdC4rPyhtb2JpbGVcXHM/c2FmYXJpfHNhZmFyaSkoXFwvW1xcd1xcLl0rKS9pICAgICAgICAgICAgICAgICAgICAgLy8gU2FmYXJpIDwgMy4wXG4gICAgICAgICAgICAgIF0sIFtOQU1FLCBbVkVSU0lPTiwgbWFwcGVyLnN0ciwgbWFwcy5icm93c2VyLm9sZHNhZmFyaS52ZXJzaW9uXV0sIFtcblxuICAgICAgICAgICAgICAvKHdlYmtpdHxraHRtbClcXC8oW1xcd1xcLl0rKS9pXG4gICAgICAgICAgICAgIF0sIFtOQU1FLCBWRVJTSU9OXSwgW1xuXG4gICAgICAgICAgICAgIC8vIEdlY2tvIGJhc2VkXG4gICAgICAgICAgICAgIC8obmF2aWdhdG9yfG5ldHNjYXBlKVxcLyhbXFx3XFwuLV0rKS9pICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgLy8gTmV0c2NhcGVcbiAgICAgICAgICAgICAgXSwgW1tOQU1FLCAnTmV0c2NhcGUnXSwgVkVSU0lPTl0sIFtcbiAgICAgICAgICAgICAgLyhzd2lmdGZveCkvaSwgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAvLyBTd2lmdGZveFxuICAgICAgICAgICAgICAvKGljZWRyYWdvbnxpY2V3ZWFzZWx8Y2FtaW5vfGNoaW1lcmF8ZmVubmVjfG1hZW1vXFxzYnJvd3NlcnxtaW5pbW98Y29ua2Vyb3IpW1xcL1xcc10/KFtcXHdcXC5cXCtdKykvaSxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAvLyBJY2VEcmFnb24vSWNld2Vhc2VsL0NhbWluby9DaGltZXJhL0Zlbm5lYy9NYWVtby9NaW5pbW8vQ29ua2Vyb3JcbiAgICAgICAgICAgICAgLyhmaXJlZm94fHNlYW1vbmtleXxrLW1lbGVvbnxpY2VjYXR8aWNlYXBlfGZpcmViaXJkfHBob2VuaXh8cGFsZW1vb258YmFzaWxpc2t8d2F0ZXJmb3gpXFwvKFtcXHdcXC4tXSspL2ksXG5cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAvLyBGaXJlZm94L1NlYU1vbmtleS9LLU1lbGVvbi9JY2VDYXQvSWNlQXBlL0ZpcmViaXJkL1Bob2VuaXhcbiAgICAgICAgICAgICAgLyhtb3ppbGxhKVxcLyhbXFx3XFwuXSspLitydlxcOi4rZ2Vja29cXC9cXGQrL2ksICAgICAgICAgICAgICAgICAgICAgICAgICAvLyBNb3ppbGxhXG5cbiAgICAgICAgICAgICAgLy8gT3RoZXJcbiAgICAgICAgICAgICAgLyhwb2xhcmlzfGx5bnh8ZGlsbG98aWNhYnxkb3Jpc3xhbWF5YXx3M218bmV0c3VyZnxzbGVpcG5pcilbXFwvXFxzXT8oW1xcd1xcLl0rKS9pLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIC8vIFBvbGFyaXMvTHlueC9EaWxsby9pQ2FiL0RvcmlzL0FtYXlhL3czbS9OZXRTdXJmL1NsZWlwbmlyXG4gICAgICAgICAgICAgIC8obGlua3MpXFxzXFwoKFtcXHdcXC5dKykvaSwgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIC8vIExpbmtzXG4gICAgICAgICAgICAgIC8oZ29icm93c2VyKVxcLz8oW1xcd1xcLl0qKS9pLCAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgLy8gR29Ccm93c2VyXG4gICAgICAgICAgICAgIC8oaWNlXFxzP2Jyb3dzZXIpXFwvdj8oW1xcd1xcLl9dKykvaSwgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIC8vIElDRSBCcm93c2VyXG4gICAgICAgICAgICAgIC8obW9zYWljKVtcXC9cXHNdKFtcXHdcXC5dKykvaSAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIC8vIE1vc2FpY1xuICAgICAgICAgICAgICBdLCBbTkFNRSwgVkVSU0lPTl1cblxuICAgICAgICAgICAgICAvKiAvLy8vLy8vLy8vLy8vLy8vLy8vLy9cbiAgICAgICAgICAgICAgLy8gTWVkaWEgcGxheWVycyBCRUdJTlxuICAgICAgICAgICAgICAvLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy9cblxuICAgICAgICAgICAgICAsIFtcblxuICAgICAgICAgICAgICAvKGFwcGxlKD86Y29yZW1lZGlhfCkpXFwvKChcXGQrKVtcXHdcXC5fXSspL2ksICAgICAgICAgICAgICAgICAgICAgICAgICAvLyBHZW5lcmljIEFwcGxlIENvcmVNZWRpYVxuICAgICAgICAgICAgICAvKGNvcmVtZWRpYSkgdigoXFxkKylbXFx3XFwuX10rKS9pXG4gICAgICAgICAgICAgIF0sIFtOQU1FLCBWRVJTSU9OXSwgW1xuXG4gICAgICAgICAgICAgIC8oYXF1YWx1bmd8bHlzc25hfGJzcGxheWVyKVxcLygoXFxkKyk/W1xcd1xcLi1dKykvaSAgICAgICAgICAgICAgICAgICAgIC8vIEFxdWFsdW5nL0x5c3NuYS9CU1BsYXllclxuICAgICAgICAgICAgICBdLCBbTkFNRSwgVkVSU0lPTl0sIFtcblxuICAgICAgICAgICAgICAvKGFyZXN8b3NzcHJveHkpXFxzKChcXGQrKVtcXHdcXC4tXSspL2kgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAvLyBBcmVzL09TU1Byb3h5XG4gICAgICAgICAgICAgIF0sIFtOQU1FLCBWRVJTSU9OXSwgW1xuXG4gICAgICAgICAgICAgIC8oYXVkYWNpb3VzfGF1ZGltdXNpY3N0cmVhbXxhbWFyb2t8YmFzc3xjb3JlfGRhbHZpa3xnbm9tZW1wbGF5ZXJ8bXVzaWMgb24gY29uc29sZXxuc3BsYXllcnxwc3AtaW50ZXJuZXRyYWRpb3BsYXllcnx2aWRlb3MpXFwvKChcXGQrKVtcXHdcXC4tXSspL2ksXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgLy8gQXVkYWNpb3VzL0F1ZGlNdXNpY1N0cmVhbS9BbWFyb2svQkFTUy9PcGVuQ09SRS9EYWx2aWsvR25vbWVNcGxheWVyL01vQ1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIC8vIE5TUGxheWVyL1BTUC1JbnRlcm5ldFJhZGlvUGxheWVyL1ZpZGVvc1xuICAgICAgICAgICAgICAvKGNsZW1lbnRpbmV8bXVzaWMgcGxheWVyIGRhZW1vbilcXHMoKFxcZCspW1xcd1xcLi1dKykvaSwgICAgICAgICAgICAgICAvLyBDbGVtZW50aW5lL01QRFxuICAgICAgICAgICAgICAvKGxnIHBsYXllcnxuZXhwbGF5ZXIpXFxzKChcXGQrKVtcXGRcXC5dKykvaSxcbiAgICAgICAgICAgICAgL3BsYXllclxcLyhuZXhwbGF5ZXJ8bGcgcGxheWVyKVxccygoXFxkKylbXFx3XFwuLV0rKS9pICAgICAgICAgICAgICAgICAgIC8vIE5leFBsYXllci9MRyBQbGF5ZXJcbiAgICAgICAgICAgICAgXSwgW05BTUUsIFZFUlNJT05dLCBbXG4gICAgICAgICAgICAgIC8obmV4cGxheWVyKVxccygoXFxkKylbXFx3XFwuLV0rKS9pICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIC8vIE5leHBsYXllclxuICAgICAgICAgICAgICBdLCBbTkFNRSwgVkVSU0lPTl0sIFtcblxuICAgICAgICAgICAgICAvKGZscnApXFwvKChcXGQrKVtcXHdcXC4tXSspL2kgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAvLyBGbGlwIFBsYXllclxuICAgICAgICAgICAgICBdLCBbW05BTUUsICdGbGlwIFBsYXllciddLCBWRVJTSU9OXSwgW1xuXG4gICAgICAgICAgICAgIC8oZnN0cmVhbXxuYXRpdmVob3N0fHF1ZXJ5c2Vla3NwaWRlcnxpYS1hcmNoaXZlcnxmYWNlYm9va2V4dGVybmFsaGl0KS9pXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgLy8gRlN0cmVhbS9OYXRpdmVIb3N0L1F1ZXJ5U2Vla1NwaWRlci9JQSBBcmNoaXZlci9mYWNlYm9va2V4dGVybmFsaGl0XG4gICAgICAgICAgICAgIF0sIFtOQU1FXSwgW1xuXG4gICAgICAgICAgICAgIC8oZ3N0cmVhbWVyKSBzb3VwaHR0cHNyYyAoPzpcXChbXlxcKV0rXFwpKXswLDF9IGxpYnNvdXBcXC8oKFxcZCspW1xcd1xcLi1dKykvaVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIC8vIEdzdHJlYW1lclxuICAgICAgICAgICAgICBdLCBbTkFNRSwgVkVSU0lPTl0sIFtcblxuICAgICAgICAgICAgICAvKGh0YyBzdHJlYW1pbmcgcGxheWVyKVxcc1tcXHdfXStcXHNcXC9cXHMoKFxcZCspW1xcZFxcLl0rKS9pLCAgICAgICAgICAgICAgLy8gSFRDIFN0cmVhbWluZyBQbGF5ZXJcbiAgICAgICAgICAgICAgLyhqYXZhfHB5dGhvbi11cmxsaWJ8cHl0aG9uLXJlcXVlc3RzfHdnZXR8bGliY3VybClcXC8oKFxcZCspW1xcd1xcLi1fXSspL2ksXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgLy8gSmF2YS91cmxsaWIvcmVxdWVzdHMvd2dldC9jVVJMXG4gICAgICAgICAgICAgIC8obGF2ZikoKFxcZCspW1xcZFxcLl0rKS9pICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgLy8gTGF2ZiAoRkZNUEVHKVxuICAgICAgICAgICAgICBdLCBbTkFNRSwgVkVSU0lPTl0sIFtcblxuICAgICAgICAgICAgICAvKGh0Y19vbmVfcylcXC8oKFxcZCspW1xcZFxcLl0rKS9pICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAvLyBIVEMgT25lIFNcbiAgICAgICAgICAgICAgXSwgW1tOQU1FLCAvXy9nLCAnICddLCBWRVJTSU9OXSwgW1xuXG4gICAgICAgICAgICAgIC8obXBsYXllcikoPzpcXHN8XFwvKSg/Oig/OnNoZXJweWEtKXswLDF9c3ZuKSg/Oi18XFxzKShyXFxkKyg/Oi1cXGQrW1xcd1xcLi1dKyl7MCwxfSkvaVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIC8vIE1QbGF5ZXIgU1ZOXG4gICAgICAgICAgICAgIF0sIFtOQU1FLCBWRVJTSU9OXSwgW1xuXG4gICAgICAgICAgICAgIC8obXBsYXllcikoPzpcXHN8XFwvfFt1bmtvdy1dKykoKFxcZCspW1xcd1xcLi1dKykvaSAgICAgICAgICAgICAgICAgICAgICAvLyBNUGxheWVyXG4gICAgICAgICAgICAgIF0sIFtOQU1FLCBWRVJTSU9OXSwgW1xuXG4gICAgICAgICAgICAgIC8obXBsYXllcikvaSwgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgLy8gTVBsYXllciAobm8gb3RoZXIgaW5mbylcbiAgICAgICAgICAgICAgLyh5b3VybXV6ZSkvaSwgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAvLyBZb3VyTXV6ZVxuICAgICAgICAgICAgICAvKG1lZGlhIHBsYXllciBjbGFzc2ljfG5lcm8gc2hvd3RpbWUpL2kgICAgICAgICAgICAgICAgICAgICAgICAgICAgIC8vIE1lZGlhIFBsYXllciBDbGFzc2ljL05lcm8gU2hvd1RpbWVcbiAgICAgICAgICAgICAgXSwgW05BTUVdLCBbXG5cbiAgICAgICAgICAgICAgLyhuZXJvICg/OmhvbWV8c2NvdXQpKVxcLygoXFxkKylbXFx3XFwuLV0rKS9pICAgICAgICAgICAgICAgICAgICAgICAgICAgLy8gTmVybyBIb21lL05lcm8gU2NvdXRcbiAgICAgICAgICAgICAgXSwgW05BTUUsIFZFUlNJT05dLCBbXG5cbiAgICAgICAgICAgICAgLyhub2tpYVxcZCspXFwvKChcXGQrKVtcXHdcXC4tXSspL2kgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIC8vIE5va2lhXG4gICAgICAgICAgICAgIF0sIFtOQU1FLCBWRVJTSU9OXSwgW1xuXG4gICAgICAgICAgICAgIC9cXHMoc29uZ2JpcmQpXFwvKChcXGQrKVtcXHdcXC4tXSspL2kgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAvLyBTb25nYmlyZC9QaGlsaXBzLVNvbmdiaXJkXG4gICAgICAgICAgICAgIF0sIFtOQU1FLCBWRVJTSU9OXSwgW1xuXG4gICAgICAgICAgICAgIC8od2luYW1wKTMgdmVyc2lvbiAoKFxcZCspW1xcd1xcLi1dKykvaSwgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgLy8gV2luYW1wXG4gICAgICAgICAgICAgIC8od2luYW1wKVxccygoXFxkKylbXFx3XFwuLV0rKS9pLFxuICAgICAgICAgICAgICAvKHdpbmFtcCltcGVnXFwvKChcXGQrKVtcXHdcXC4tXSspL2lcbiAgICAgICAgICAgICAgXSwgW05BTUUsIFZFUlNJT05dLCBbXG5cbiAgICAgICAgICAgICAgLyhvY21zLWJvdHx0YXBpbnJhZGlvfHR1bmVpbiByYWRpb3x1bmtub3dufHdpbmFtcHxpbmxpZ2h0IHJhZGlvKS9pICAvLyBPQ01TLWJvdC90YXAgaW4gcmFkaW8vdHVuZWluL3Vua25vd24vd2luYW1wIChubyBvdGhlciBpbmZvKVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIC8vIGlubGlnaHQgcmFkaW9cbiAgICAgICAgICAgICAgXSwgW05BTUVdLCBbXG5cbiAgICAgICAgICAgICAgLyhxdWlja3RpbWV8cm1hfHJhZGlvYXBwfHJhZGlvY2xpZW50YXBwbGljYXRpb258c291bmR0YXB8dG90ZW18c3RhZ2VmcmlnaHR8c3RyZWFtaXVtKVxcLygoXFxkKylbXFx3XFwuLV0rKS9pXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgLy8gUXVpY2tUaW1lL1JlYWxNZWRpYS9SYWRpb0FwcC9SYWRpb0NsaWVudEFwcGxpY2F0aW9uL1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIC8vIFNvdW5kVGFwL1RvdGVtL1N0YWdlZnJpZ2h0L1N0cmVhbWl1bVxuICAgICAgICAgICAgICBdLCBbTkFNRSwgVkVSU0lPTl0sIFtcblxuICAgICAgICAgICAgICAvKHNtcCkoKFxcZCspW1xcZFxcLl0rKS9pICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIC8vIFNNUFxuICAgICAgICAgICAgICBdLCBbTkFNRSwgVkVSU0lPTl0sIFtcblxuICAgICAgICAgICAgICAvKHZsYykgbWVkaWEgcGxheWVyIC0gdmVyc2lvbiAoKFxcZCspW1xcd1xcLl0rKS9pLCAgICAgICAgICAgICAgICAgICAgIC8vIFZMQyBWaWRlb2xhblxuICAgICAgICAgICAgICAvKHZsYylcXC8oKFxcZCspW1xcd1xcLi1dKykvaSxcbiAgICAgICAgICAgICAgLyh4Ym1jfGd2ZnN8eGluZXx4bW1zfGlyYXBwKVxcLygoXFxkKylbXFx3XFwuLV0rKS9pLCAgICAgICAgICAgICAgICAgICAgLy8gWEJNQy9ndmZzL1hpbmUvWE1NUy9pcmFwcFxuICAgICAgICAgICAgICAvKGZvb2JhcjIwMDApXFwvKChcXGQrKVtcXGRcXC5dKykvaSwgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAvLyBGb29iYXIyMDAwXG4gICAgICAgICAgICAgIC8oaXR1bmVzKVxcLygoXFxkKylbXFxkXFwuXSspL2kgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIC8vIGlUdW5lc1xuICAgICAgICAgICAgICBdLCBbTkFNRSwgVkVSU0lPTl0sIFtcblxuICAgICAgICAgICAgICAvKHdtcGxheWVyKVxcLygoXFxkKylbXFx3XFwuLV0rKS9pLCAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAvLyBXaW5kb3dzIE1lZGlhIFBsYXllclxuICAgICAgICAgICAgICAvKHdpbmRvd3MtbWVkaWEtcGxheWVyKVxcLygoXFxkKylbXFx3XFwuLV0rKS9pXG4gICAgICAgICAgICAgIF0sIFtbTkFNRSwgLy0vZywgJyAnXSwgVkVSU0lPTl0sIFtcblxuICAgICAgICAgICAgICAvd2luZG93c1xcLygoXFxkKylbXFx3XFwuLV0rKSB1cG5wXFwvW1xcZFxcLl0rIGRsbmFkb2NcXC9bXFxkXFwuXSsgKGhvbWUgbWVkaWEgc2VydmVyKS9pXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgLy8gV2luZG93cyBNZWRpYSBTZXJ2ZXJcbiAgICAgICAgICAgICAgXSwgW1ZFUlNJT04sIFtOQU1FLCAnV2luZG93cyddXSwgW1xuXG4gICAgICAgICAgICAgIC8oY29tXFwucmlzZXVwcmFkaW9hbGFybSlcXC8oKFxcZCspW1xcZFxcLl0qKS9pICAgICAgICAgICAgICAgICAgICAgICAgICAvLyBSaXNlVVAgUmFkaW8gQWxhcm1cbiAgICAgICAgICAgICAgXSwgW05BTUUsIFZFUlNJT05dLCBbXG5cbiAgICAgICAgICAgICAgLyhyYWQuaW8pXFxzKChcXGQrKVtcXGRcXC5dKykvaSwgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgLy8gUmFkLmlvXG4gICAgICAgICAgICAgIC8ocmFkaW8uKD86ZGV8YXR8ZnIpKVxccygoXFxkKylbXFxkXFwuXSspL2lcbiAgICAgICAgICAgICAgXSwgW1tOQU1FLCAncmFkLmlvJ10sIFZFUlNJT05dXG5cbiAgICAgICAgICAgICAgLy8vLy8vLy8vLy8vLy8vLy8vLy8vL1xuICAgICAgICAgICAgICAvLyBNZWRpYSBwbGF5ZXJzIEVORFxuICAgICAgICAgICAgICAvLy8vLy8vLy8vLy8vLy8vLy8vLyovXG5cbiAgICAgICAgICBdLFxuXG4gICAgICAgICAgY3B1IDogW1tcblxuICAgICAgICAgICAgICAvKD86KGFtZHx4KD86KD86ODZ8NjQpW18tXSk/fHdvd3x3aW4pNjQpWztcXCldL2kgICAgICAgICAgICAgICAgICAgICAvLyBBTUQ2NFxuICAgICAgICAgICAgICBdLCBbW0FSQ0hJVEVDVFVSRSwgJ2FtZDY0J11dLCBbXG5cbiAgICAgICAgICAgICAgLyhpYTMyKD89OykpL2kgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAvLyBJQTMyIChxdWlja3RpbWUpXG4gICAgICAgICAgICAgIF0sIFtbQVJDSElURUNUVVJFLCB1dGlsLmxvd2VyaXplXV0sIFtcblxuICAgICAgICAgICAgICAvKCg/OmlbMzQ2XXx4KTg2KVs7XFwpXS9pICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAvLyBJQTMyXG4gICAgICAgICAgICAgIF0sIFtbQVJDSElURUNUVVJFLCAnaWEzMiddXSwgW1xuXG4gICAgICAgICAgICAgIC8vIFBvY2tldFBDIG1pc3Rha2VubHkgaWRlbnRpZmllZCBhcyBQb3dlclBDXG4gICAgICAgICAgICAgIC93aW5kb3dzXFxzKGNlfG1vYmlsZSk7XFxzcHBjOy9pXG4gICAgICAgICAgICAgIF0sIFtbQVJDSElURUNUVVJFLCAnYXJtJ11dLCBbXG5cbiAgICAgICAgICAgICAgLygoPzpwcGN8cG93ZXJwYykoPzo2NCk/KSg/Olxcc21hY3w7fFxcKSkvaSAgICAgICAgICAgICAgICAgICAgICAgICAgIC8vIFBvd2VyUENcbiAgICAgICAgICAgICAgXSwgW1tBUkNISVRFQ1RVUkUsIC9vd2VyLywgJycsIHV0aWwubG93ZXJpemVdXSwgW1xuXG4gICAgICAgICAgICAgIC8oc3VuNFxcdylbO1xcKV0vaSAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAvLyBTUEFSQ1xuICAgICAgICAgICAgICBdLCBbW0FSQ0hJVEVDVFVSRSwgJ3NwYXJjJ11dLCBbXG5cbiAgICAgICAgICAgICAgLygoPzphdnIzMnxpYTY0KD89OykpfDY4ayg/PVxcKSl8YXJtKD86NjR8KD89dlxcZCtbO2xdKSl8KD89YXRtZWxcXHMpYXZyfCg/OmlyaXh8bWlwc3xzcGFyYykoPzo2NCk/KD89Oyl8cGEtcmlzYykvaVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIC8vIElBNjQsIDY4SywgQVJNLzY0LCBBVlIvMzIsIElSSVgvNjQsIE1JUFMvNjQsIFNQQVJDLzY0LCBQQS1SSVNDXG4gICAgICAgICAgICAgIF0sIFtbQVJDSElURUNUVVJFLCB1dGlsLmxvd2VyaXplXV1cbiAgICAgICAgICBdLFxuXG4gICAgICAgICAgZGV2aWNlIDogW1tcblxuICAgICAgICAgICAgICAvXFwoKGlwYWR8cGxheWJvb2spO1tcXHdcXHNcXCksOy1dKyhyaW18YXBwbGUpL2kgICAgICAgICAgICAgICAgICAgICAgICAvLyBpUGFkL1BsYXlCb29rXG4gICAgICAgICAgICAgIF0sIFtNT0RFTCwgVkVORE9SLCBbVFlQRSwgVEFCTEVUXV0sIFtcblxuICAgICAgICAgICAgICAvYXBwbGVjb3JlbWVkaWFcXC9bXFx3XFwuXSsgXFwoKGlwYWQpLyAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAvLyBpUGFkXG4gICAgICAgICAgICAgIF0sIFtNT0RFTCwgW1ZFTkRPUiwgJ0FwcGxlJ10sIFtUWVBFLCBUQUJMRVRdXSwgW1xuXG4gICAgICAgICAgICAgIC8oYXBwbGVcXHN7MCwxfXR2KS9pICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIC8vIEFwcGxlIFRWXG4gICAgICAgICAgICAgIF0sIFtbTU9ERUwsICdBcHBsZSBUViddLCBbVkVORE9SLCAnQXBwbGUnXV0sIFtcblxuICAgICAgICAgICAgICAvKGFyY2hvcylcXHMoZ2FtZXBhZDI/KS9pLCAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAvLyBBcmNob3NcbiAgICAgICAgICAgICAgLyhocCkuKyh0b3VjaHBhZCkvaSwgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAvLyBIUCBUb3VjaFBhZFxuICAgICAgICAgICAgICAvKGhwKS4rKHRhYmxldCkvaSwgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIC8vIEhQIFRhYmxldFxuICAgICAgICAgICAgICAvKGtpbmRsZSlcXC8oW1xcd1xcLl0rKS9pLCAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIC8vIEtpbmRsZVxuICAgICAgICAgICAgICAvXFxzKG5vb2spW1xcd1xcc10rYnVpbGRcXC8oXFx3KykvaSwgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgLy8gTm9va1xuICAgICAgICAgICAgICAvKGRlbGwpXFxzKHN0cmVhW2twclxcc1xcZF0qW1xcZGtvXSkvaSAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAvLyBEZWxsIFN0cmVha1xuICAgICAgICAgICAgICBdLCBbVkVORE9SLCBNT0RFTCwgW1RZUEUsIFRBQkxFVF1dLCBbXG5cbiAgICAgICAgICAgICAgLyhrZltBLXpdKylcXHNidWlsZFxcLy4rc2lsa1xcLy9pICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAvLyBLaW5kbGUgRmlyZSBIRFxuICAgICAgICAgICAgICBdLCBbTU9ERUwsIFtWRU5ET1IsICdBbWF6b24nXSwgW1RZUEUsIFRBQkxFVF1dLCBbXG4gICAgICAgICAgICAgIC8oc2R8a2YpWzAzNDloaWpvcnN0dXddK1xcc2J1aWxkXFwvLitzaWxrXFwvL2kgICAgICAgICAgICAgICAgICAgICAgICAgLy8gRmlyZSBQaG9uZVxuICAgICAgICAgICAgICBdLCBbW01PREVMLCBtYXBwZXIuc3RyLCBtYXBzLmRldmljZS5hbWF6b24ubW9kZWxdLCBbVkVORE9SLCAnQW1hem9uJ10sIFtUWVBFLCBNT0JJTEVdXSwgW1xuICAgICAgICAgICAgICAvYW5kcm9pZC4rYWZ0KFtibXNdKVxcc2J1aWxkL2kgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAvLyBGaXJlIFRWXG4gICAgICAgICAgICAgIF0sIFtNT0RFTCwgW1ZFTkRPUiwgJ0FtYXpvbiddLCBbVFlQRSwgU01BUlRUVl1dLCBbXG5cbiAgICAgICAgICAgICAgL1xcKChpcFtob25lZHxcXHNcXHcqXSspOy4rKGFwcGxlKS9pICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAvLyBpUG9kL2lQaG9uZVxuICAgICAgICAgICAgICBdLCBbTU9ERUwsIFZFTkRPUiwgW1RZUEUsIE1PQklMRV1dLCBbXG4gICAgICAgICAgICAgIC9cXCgoaXBbaG9uZWR8XFxzXFx3Kl0rKTsvaSAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgLy8gaVBvZC9pUGhvbmVcbiAgICAgICAgICAgICAgXSwgW01PREVMLCBbVkVORE9SLCAnQXBwbGUnXSwgW1RZUEUsIE1PQklMRV1dLCBbXG5cbiAgICAgICAgICAgICAgLyhibGFja2JlcnJ5KVtcXHMtXT8oXFx3KykvaSwgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIC8vIEJsYWNrQmVycnlcbiAgICAgICAgICAgICAgLyhibGFja2JlcnJ5fGJlbnF8cGFsbSg/PVxcLSl8c29ueWVyaWNzc29ufGFjZXJ8YXN1c3xkZWxsfG1laXp1fG1vdG9yb2xhfHBvbHl0cm9uKVtcXHNfLV0/KFtcXHctXSopL2ksXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgLy8gQmVuUS9QYWxtL1NvbnktRXJpY3Nzb24vQWNlci9Bc3VzL0RlbGwvTWVpenUvTW90b3JvbGEvUG9seXRyb25cbiAgICAgICAgICAgICAgLyhocClcXHMoW1xcd1xcc10rXFx3KS9pLCAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgLy8gSFAgaVBBUVxuICAgICAgICAgICAgICAvKGFzdXMpLT8oXFx3KykvaSAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAvLyBBc3VzXG4gICAgICAgICAgICAgIF0sIFtWRU5ET1IsIE1PREVMLCBbVFlQRSwgTU9CSUxFXV0sIFtcbiAgICAgICAgICAgICAgL1xcKGJiMTA7XFxzKFxcdyspL2kgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAvLyBCbGFja0JlcnJ5IDEwXG4gICAgICAgICAgICAgIF0sIFtNT0RFTCwgW1ZFTkRPUiwgJ0JsYWNrQmVycnknXSwgW1RZUEUsIE1PQklMRV1dLCBbXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgLy8gQXN1cyBUYWJsZXRzXG4gICAgICAgICAgICAgIC9hbmRyb2lkLisodHJhbnNmb1twcmltZVxcc117NCwxMH1cXHNcXHcrfGVlZXBjfHNsaWRlclxcc1xcdyt8bmV4dXMgN3xwYWRmb25lfHAwMGMpL2lcbiAgICAgICAgICAgICAgXSwgW01PREVMLCBbVkVORE9SLCAnQXN1cyddLCBbVFlQRSwgVEFCTEVUXV0sIFtcblxuICAgICAgICAgICAgICAvKHNvbnkpXFxzKHRhYmxldFxcc1twc10pXFxzYnVpbGRcXC8vaSwgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgLy8gU29ueVxuICAgICAgICAgICAgICAvKHNvbnkpPyg/OnNncC4rKVxcc2J1aWxkXFwvL2lcbiAgICAgICAgICAgICAgXSwgW1tWRU5ET1IsICdTb255J10sIFtNT0RFTCwgJ1hwZXJpYSBUYWJsZXQnXSwgW1RZUEUsIFRBQkxFVF1dLCBbXG4gICAgICAgICAgICAgIC9hbmRyb2lkLitcXHMoW2MtZ11cXGR7NH18c29bLWxdXFx3KykoPz1cXHNidWlsZFxcL3xcXCkuK2Nocm9tZVxcLyg/IVsxLTZdezAsMX1cXGRcXC4pKS9pXG4gICAgICAgICAgICAgIF0sIFtNT0RFTCwgW1ZFTkRPUiwgJ1NvbnknXSwgW1RZUEUsIE1PQklMRV1dLCBbXG5cbiAgICAgICAgICAgICAgL1xccyhvdXlhKVxccy9pLCAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIC8vIE91eWFcbiAgICAgICAgICAgICAgLyhuaW50ZW5kbylcXHMoW3dpZHMzdV0rKS9pICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgLy8gTmludGVuZG9cbiAgICAgICAgICAgICAgXSwgW1ZFTkRPUiwgTU9ERUwsIFtUWVBFLCBDT05TT0xFXV0sIFtcblxuICAgICAgICAgICAgICAvYW5kcm9pZC4rO1xccyhzaGllbGQpXFxzYnVpbGQvaSAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgLy8gTnZpZGlhXG4gICAgICAgICAgICAgIF0sIFtNT0RFTCwgW1ZFTkRPUiwgJ052aWRpYSddLCBbVFlQRSwgQ09OU09MRV1dLCBbXG5cbiAgICAgICAgICAgICAgLyhwbGF5c3RhdGlvblxcc1szNHBvcnRhYmxldmldKykvaSAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgLy8gUGxheXN0YXRpb25cbiAgICAgICAgICAgICAgXSwgW01PREVMLCBbVkVORE9SLCAnU29ueSddLCBbVFlQRSwgQ09OU09MRV1dLCBbXG5cbiAgICAgICAgICAgICAgLyhzcHJpbnRcXHMoXFx3KykpL2kgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIC8vIFNwcmludCBQaG9uZXNcbiAgICAgICAgICAgICAgXSwgW1tWRU5ET1IsIG1hcHBlci5zdHIsIG1hcHMuZGV2aWNlLnNwcmludC52ZW5kb3JdLCBbTU9ERUwsIG1hcHBlci5zdHIsIG1hcHMuZGV2aWNlLnNwcmludC5tb2RlbF0sIFtUWVBFLCBNT0JJTEVdXSwgW1xuXG4gICAgICAgICAgICAgIC8obGVub3ZvKVxccz8oUyg/OjUwMDB8NjAwMCkrKD86Wy1dW1xcdytdKSkvaSAgICAgICAgICAgICAgICAgICAgICAgICAvLyBMZW5vdm8gdGFibGV0c1xuICAgICAgICAgICAgICBdLCBbVkVORE9SLCBNT0RFTCwgW1RZUEUsIFRBQkxFVF1dLCBbXG5cbiAgICAgICAgICAgICAgLyhodGMpWztfXFxzLV0rKFtcXHdcXHNdKyg/PVxcKXxcXHNidWlsZCl8XFx3KykvaSwgICAgICAgICAgICAgICAgICAgICAgICAvLyBIVENcbiAgICAgICAgICAgICAgLyh6dGUpLShcXHcqKS9pLCAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgLy8gWlRFXG4gICAgICAgICAgICAgIC8oYWxjYXRlbHxnZWVrc3Bob25lfGxlbm92b3xuZXhpYW58cGFuYXNvbmljfCg/PTtcXHMpc29ueSlbX1xccy1dPyhbXFx3LV0qKS9pXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgLy8gQWxjYXRlbC9HZWVrc1Bob25lL0xlbm92by9OZXhpYW4vUGFuYXNvbmljL1NvbnlcbiAgICAgICAgICAgICAgXSwgW1ZFTkRPUiwgW01PREVMLCAvXy9nLCAnICddLCBbVFlQRSwgTU9CSUxFXV0sIFtcblxuICAgICAgICAgICAgICAvKG5leHVzXFxzOSkvaSAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAvLyBIVEMgTmV4dXMgOVxuICAgICAgICAgICAgICBdLCBbTU9ERUwsIFtWRU5ET1IsICdIVEMnXSwgW1RZUEUsIFRBQkxFVF1dLCBbXG5cbiAgICAgICAgICAgICAgL2RcXC9odWF3ZWkoW1xcd1xccy1dKylbO1xcKV0vaSxcbiAgICAgICAgICAgICAgLyhuZXh1c1xcczZwKS9pICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgLy8gSHVhd2VpXG4gICAgICAgICAgICAgIF0sIFtNT0RFTCwgW1ZFTkRPUiwgJ0h1YXdlaSddLCBbVFlQRSwgTU9CSUxFXV0sIFtcblxuICAgICAgICAgICAgICAvKG1pY3Jvc29mdCk7XFxzKGx1bWlhW1xcc1xcd10rKS9pICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIC8vIE1pY3Jvc29mdCBMdW1pYVxuICAgICAgICAgICAgICBdLCBbVkVORE9SLCBNT0RFTCwgW1RZUEUsIE1PQklMRV1dLCBbXG5cbiAgICAgICAgICAgICAgL1tcXHNcXCg7XSh4Ym94KD86XFxzb25lKT8pW1xcc1xcKTtdL2kgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIC8vIE1pY3Jvc29mdCBYYm94XG4gICAgICAgICAgICAgIF0sIFtNT0RFTCwgW1ZFTkRPUiwgJ01pY3Jvc29mdCddLCBbVFlQRSwgQ09OU09MRV1dLCBbXG4gICAgICAgICAgICAgIC8oa2luXFwuW29uZXR3XXszfSkvaSAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIC8vIE1pY3Jvc29mdCBLaW5cbiAgICAgICAgICAgICAgXSwgW1tNT0RFTCwgL1xcLi9nLCAnICddLCBbVkVORE9SLCAnTWljcm9zb2Z0J10sIFtUWVBFLCBNT0JJTEVdXSwgW1xuXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgLy8gTW90b3JvbGFcbiAgICAgICAgICAgICAgL1xccyhtaWxlc3RvbmV8ZHJvaWQoPzpbMi00eF18XFxzKD86YmlvbmljfHgyfHByb3xyYXpyKSk/Oj8oXFxzNGcpPylbXFx3XFxzXStidWlsZFxcLy9pLFxuICAgICAgICAgICAgICAvbW90W1xccy1dPyhcXHcqKS9pLFxuICAgICAgICAgICAgICAvKFhUXFxkezMsNH0pIGJ1aWxkXFwvL2ksXG4gICAgICAgICAgICAgIC8obmV4dXNcXHM2KS9pXG4gICAgICAgICAgICAgIF0sIFtNT0RFTCwgW1ZFTkRPUiwgJ01vdG9yb2xhJ10sIFtUWVBFLCBNT0JJTEVdXSwgW1xuICAgICAgICAgICAgICAvYW5kcm9pZC4rXFxzKG16NjBcXGR8eG9vbVtcXHMyXXswLDJ9KVxcc2J1aWxkXFwvL2lcbiAgICAgICAgICAgICAgXSwgW01PREVMLCBbVkVORE9SLCAnTW90b3JvbGEnXSwgW1RZUEUsIFRBQkxFVF1dLCBbXG5cbiAgICAgICAgICAgICAgL2hiYnR2XFwvXFxkK1xcLlxcZCtcXC5cXGQrXFxzK1xcKFtcXHdcXHNdKjtcXHMqKFxcd1teO10qKTsoW147XSopL2kgICAgICAgICAgICAvLyBIYmJUViBkZXZpY2VzXG4gICAgICAgICAgICAgIF0sIFtbVkVORE9SLCB1dGlsLnRyaW1dLCBbTU9ERUwsIHV0aWwudHJpbV0sIFtUWVBFLCBTTUFSVFRWXV0sIFtcblxuICAgICAgICAgICAgICAvaGJidHYuK21hcGxlOyhcXGQrKS9pXG4gICAgICAgICAgICAgIF0sIFtbTU9ERUwsIC9eLywgJ1NtYXJ0VFYnXSwgW1ZFTkRPUiwgJ1NhbXN1bmcnXSwgW1RZUEUsIFNNQVJUVFZdXSwgW1xuXG4gICAgICAgICAgICAgIC9cXChkdHZbXFwpO10uKyhhcXVvcykvaSAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAvLyBTaGFycFxuICAgICAgICAgICAgICBdLCBbTU9ERUwsIFtWRU5ET1IsICdTaGFycCddLCBbVFlQRSwgU01BUlRUVl1dLCBbXG5cbiAgICAgICAgICAgICAgL2FuZHJvaWQuKygoc2NoLWlbODldMFxcZHxzaHctbTM4MHN8Z3QtcFxcZHs0fXxndC1uXFxkK3xzZ2gtdDhbNTZdOXxuZXh1cyAxMCkpL2ksXG4gICAgICAgICAgICAgIC8oKFNNLVRcXHcrKSkvaVxuICAgICAgICAgICAgICBdLCBbW1ZFTkRPUiwgJ1NhbXN1bmcnXSwgTU9ERUwsIFtUWVBFLCBUQUJMRVRdXSwgWyAgICAgICAgICAgICAgICAgIC8vIFNhbXN1bmdcbiAgICAgICAgICAgICAgL3NtYXJ0LXR2Lisoc2Ftc3VuZykvaVxuICAgICAgICAgICAgICBdLCBbVkVORE9SLCBbVFlQRSwgU01BUlRUVl0sIE1PREVMXSwgW1xuICAgICAgICAgICAgICAvKChzW2NncF1oLVxcdyt8Z3QtXFx3K3xnYWxheHlcXHNuZXh1c3xzbS1cXHdbXFx3XFxkXSspKS9pLFxuICAgICAgICAgICAgICAvKHNhbVtzdW5nXSopW1xccy1dKihcXHcrLT9bXFx3LV0qKS9pLFxuICAgICAgICAgICAgICAvc2VjLSgoc2doXFx3KykpL2lcbiAgICAgICAgICAgICAgXSwgW1tWRU5ET1IsICdTYW1zdW5nJ10sIE1PREVMLCBbVFlQRSwgTU9CSUxFXV0sIFtcblxuICAgICAgICAgICAgICAvc2llLShcXHcqKS9pICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAvLyBTaWVtZW5zXG4gICAgICAgICAgICAgIF0sIFtNT0RFTCwgW1ZFTkRPUiwgJ1NpZW1lbnMnXSwgW1RZUEUsIE1PQklMRV1dLCBbXG5cbiAgICAgICAgICAgICAgLyhtYWVtb3xub2tpYSkuKihuOTAwfGx1bWlhXFxzXFxkKykvaSwgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIC8vIE5va2lhXG4gICAgICAgICAgICAgIC8obm9raWEpW1xcc18tXT8oW1xcdy1dKikvaVxuICAgICAgICAgICAgICBdLCBbW1ZFTkRPUiwgJ05va2lhJ10sIE1PREVMLCBbVFlQRSwgTU9CSUxFXV0sIFtcblxuICAgICAgICAgICAgICAvYW5kcm9pZFt4XFxkXFwuXFxzO10rXFxzKFthYl1bMS03XVxcLT9bMDE3OGFdXFxkXFxkPykvaSAgICAgICAgICAgICAgICAgICAvLyBBY2VyXG4gICAgICAgICAgICAgIF0sIFtNT0RFTCwgW1ZFTkRPUiwgJ0FjZXInXSwgW1RZUEUsIFRBQkxFVF1dLCBbXG5cbiAgICAgICAgICAgICAgL2FuZHJvaWQuKyhbdmxda1xcLT9cXGR7M30pXFxzK2J1aWxkL2kgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAvLyBMRyBUYWJsZXRcbiAgICAgICAgICAgICAgXSwgW01PREVMLCBbVkVORE9SLCAnTEcnXSwgW1RZUEUsIFRBQkxFVF1dLCBbXG4gICAgICAgICAgICAgIC9hbmRyb2lkXFxzM1xcLltcXHNcXHc7LV17MTB9KGxnPyktKFswNmN2OV17Myw0fSkvaSAgICAgICAgICAgICAgICAgICAgIC8vIExHIFRhYmxldFxuICAgICAgICAgICAgICBdLCBbW1ZFTkRPUiwgJ0xHJ10sIE1PREVMLCBbVFlQRSwgVEFCTEVUXV0sIFtcbiAgICAgICAgICAgICAgLyhsZykgbmV0Y2FzdFxcLnR2L2kgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgLy8gTEcgU21hcnRUVlxuICAgICAgICAgICAgICBdLCBbVkVORE9SLCBNT0RFTCwgW1RZUEUsIFNNQVJUVFZdXSwgW1xuICAgICAgICAgICAgICAvKG5leHVzXFxzWzQ1XSkvaSwgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAvLyBMR1xuICAgICAgICAgICAgICAvbGdbZTtcXHNcXC8tXSsoXFx3KikvaSxcbiAgICAgICAgICAgICAgL2FuZHJvaWQuK2xnKFxcLT9bXFxkXFx3XSspXFxzK2J1aWxkL2lcbiAgICAgICAgICAgICAgXSwgW01PREVMLCBbVkVORE9SLCAnTEcnXSwgW1RZUEUsIE1PQklMRV1dLCBbXG5cbiAgICAgICAgICAgICAgL2FuZHJvaWQuKyhpZGVhdGFiW2EtejAtOVxcLVxcc10rKS9pICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIC8vIExlbm92b1xuICAgICAgICAgICAgICBdLCBbTU9ERUwsIFtWRU5ET1IsICdMZW5vdm8nXSwgW1RZUEUsIFRBQkxFVF1dLCBbXG5cbiAgICAgICAgICAgICAgL2xpbnV4Oy4rKChqb2xsYSkpOy9pICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAvLyBKb2xsYVxuICAgICAgICAgICAgICBdLCBbVkVORE9SLCBNT0RFTCwgW1RZUEUsIE1PQklMRV1dLCBbXG5cbiAgICAgICAgICAgICAgLygocGViYmxlKSlhcHBcXC9bXFxkXFwuXStcXHMvaSAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgLy8gUGViYmxlXG4gICAgICAgICAgICAgIF0sIFtWRU5ET1IsIE1PREVMLCBbVFlQRSwgV0VBUkFCTEVdXSwgW1xuXG4gICAgICAgICAgICAgIC9hbmRyb2lkLis7XFxzKG9wcG8pXFxzPyhbXFx3XFxzXSspXFxzYnVpbGQvaSAgICAgICAgICAgICAgICAgICAgICAgICAgICAvLyBPUFBPXG4gICAgICAgICAgICAgIF0sIFtWRU5ET1IsIE1PREVMLCBbVFlQRSwgTU9CSUxFXV0sIFtcblxuICAgICAgICAgICAgICAvY3JrZXkvaSAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIC8vIEdvb2dsZSBDaHJvbWVjYXN0XG4gICAgICAgICAgICAgIF0sIFtbTU9ERUwsICdDaHJvbWVjYXN0J10sIFtWRU5ET1IsICdHb29nbGUnXV0sIFtcblxuICAgICAgICAgICAgICAvYW5kcm9pZC4rO1xccyhnbGFzcylcXHNcXGQvaSAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIC8vIEdvb2dsZSBHbGFzc1xuICAgICAgICAgICAgICBdLCBbTU9ERUwsIFtWRU5ET1IsICdHb29nbGUnXSwgW1RZUEUsIFdFQVJBQkxFXV0sIFtcblxuICAgICAgICAgICAgICAvYW5kcm9pZC4rO1xccyhwaXhlbCBjKVtcXHMpXS9pICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgLy8gR29vZ2xlIFBpeGVsIENcbiAgICAgICAgICAgICAgXSwgW01PREVMLCBbVkVORE9SLCAnR29vZ2xlJ10sIFtUWVBFLCBUQUJMRVRdXSwgW1xuXG4gICAgICAgICAgICAgIC9hbmRyb2lkLis7XFxzKHBpeGVsKCBbMjNdKT8oIHhsKT8pXFxzL2kgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAvLyBHb29nbGUgUGl4ZWxcbiAgICAgICAgICAgICAgXSwgW01PREVMLCBbVkVORE9SLCAnR29vZ2xlJ10sIFtUWVBFLCBNT0JJTEVdXSwgW1xuXG4gICAgICAgICAgICAgIC9hbmRyb2lkLis7XFxzKFxcdyspXFxzK2J1aWxkXFwvaG1cXDEvaSwgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAvLyBYaWFvbWkgSG9uZ21pICdudW1lcmljJyBtb2RlbHNcbiAgICAgICAgICAgICAgL2FuZHJvaWQuKyhobVtcXHNcXC1fXSpub3RlP1tcXHNfXSooPzpcXGRcXHcpPylcXHMrYnVpbGQvaSwgICAgICAgICAgICAgICAvLyBYaWFvbWkgSG9uZ21pXG4gICAgICAgICAgICAgIC9hbmRyb2lkLisobWlbXFxzXFwtX10qKD86b25lfG9uZVtcXHNfXXBsdXN8bm90ZSBsdGUpP1tcXHNfXSooPzpcXGQ/XFx3PylbXFxzX10qKD86cGx1cyk/KVxccytidWlsZC9pLCAgICAvLyBYaWFvbWkgTWlcbiAgICAgICAgICAgICAgL2FuZHJvaWQuKyhyZWRtaVtcXHNcXC1fXSooPzpub3RlKT8oPzpbXFxzX10qW1xcd1xcc10rKSlcXHMrYnVpbGQvaSAgICAgICAvLyBSZWRtaSBQaG9uZXNcbiAgICAgICAgICAgICAgXSwgW1tNT0RFTCwgL18vZywgJyAnXSwgW1ZFTkRPUiwgJ1hpYW9taSddLCBbVFlQRSwgTU9CSUxFXV0sIFtcbiAgICAgICAgICAgICAgL2FuZHJvaWQuKyhtaVtcXHNcXC1fXSooPzpwYWQpKD86W1xcc19dKltcXHdcXHNdKykpXFxzK2J1aWxkL2kgICAgICAgICAgICAvLyBNaSBQYWQgdGFibGV0c1xuICAgICAgICAgICAgICBdLFtbTU9ERUwsIC9fL2csICcgJ10sIFtWRU5ET1IsICdYaWFvbWknXSwgW1RZUEUsIFRBQkxFVF1dLCBbXG4gICAgICAgICAgICAgIC9hbmRyb2lkLis7XFxzKG1bMS01XVxcc25vdGUpXFxzYnVpbGQvaSAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgLy8gTWVpenUgVGFibGV0XG4gICAgICAgICAgICAgIF0sIFtNT0RFTCwgW1ZFTkRPUiwgJ01laXp1J10sIFtUWVBFLCBUQUJMRVRdXSwgW1xuICAgICAgICAgICAgICAvKG16KS0oW1xcdy1dezIsfSkvaSAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAvLyBNZWl6dSBQaG9uZVxuICAgICAgICAgICAgICBdLCBbW1ZFTkRPUiwgJ01laXp1J10sIE1PREVMLCBbVFlQRSwgTU9CSUxFXV0sIFtcblxuICAgICAgICAgICAgICAvYW5kcm9pZC4rYTAwMCgxKVxccytidWlsZC9pLCAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAvLyBPbmVQbHVzXG4gICAgICAgICAgICAgIC9hbmRyb2lkLitvbmVwbHVzXFxzKGFcXGR7NH0pXFxzK2J1aWxkL2lcbiAgICAgICAgICAgICAgXSwgW01PREVMLCBbVkVORE9SLCAnT25lUGx1cyddLCBbVFlQRSwgTU9CSUxFXV0sIFtcblxuICAgICAgICAgICAgICAvYW5kcm9pZC4rWztcXC9dXFxzKihSQ1RbXFxkXFx3XSspXFxzK2J1aWxkL2kgICAgICAgICAgICAgICAgICAgICAgICAgICAgLy8gUkNBIFRhYmxldHNcbiAgICAgICAgICAgICAgXSwgW01PREVMLCBbVkVORE9SLCAnUkNBJ10sIFtUWVBFLCBUQUJMRVRdXSwgW1xuXG4gICAgICAgICAgICAgIC9hbmRyb2lkLitbO1xcL1xcc10rKFZlbnVlW1xcZFxcc117Miw3fSlcXHMrYnVpbGQvaSAgICAgICAgICAgICAgICAgICAgICAvLyBEZWxsIFZlbnVlIFRhYmxldHNcbiAgICAgICAgICAgICAgXSwgW01PREVMLCBbVkVORE9SLCAnRGVsbCddLCBbVFlQRSwgVEFCTEVUXV0sIFtcblxuICAgICAgICAgICAgICAvYW5kcm9pZC4rWztcXC9dXFxzKihRW1R8TV1bXFxkXFx3XSspXFxzK2J1aWxkL2kgICAgICAgICAgICAgICAgICAgICAgICAgLy8gVmVyaXpvbiBUYWJsZXRcbiAgICAgICAgICAgICAgXSwgW01PREVMLCBbVkVORE9SLCAnVmVyaXpvbiddLCBbVFlQRSwgVEFCTEVUXV0sIFtcblxuICAgICAgICAgICAgICAvYW5kcm9pZC4rWztcXC9dXFxzKyhCYXJuZXNbJlxcc10rTm9ibGVcXHMrfEJOW1JUXSkoVj8uKilcXHMrYnVpbGQvaSAgICAgLy8gQmFybmVzICYgTm9ibGUgVGFibGV0XG4gICAgICAgICAgICAgIF0sIFtbVkVORE9SLCAnQmFybmVzICYgTm9ibGUnXSwgTU9ERUwsIFtUWVBFLCBUQUJMRVRdXSwgW1xuXG4gICAgICAgICAgICAgIC9hbmRyb2lkLitbO1xcL11cXHMrKFRNXFxkezN9LipcXGIpXFxzK2J1aWxkL2kgICAgICAgICAgICAgICAgICAgICAgICAgICAvLyBCYXJuZXMgJiBOb2JsZSBUYWJsZXRcbiAgICAgICAgICAgICAgXSwgW01PREVMLCBbVkVORE9SLCAnTnVWaXNpb24nXSwgW1RZUEUsIFRBQkxFVF1dLCBbXG5cbiAgICAgICAgICAgICAgL2FuZHJvaWQuKztcXHMoazg4KVxcc2J1aWxkL2kgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIC8vIFpURSBLIFNlcmllcyBUYWJsZXRcbiAgICAgICAgICAgICAgXSwgW01PREVMLCBbVkVORE9SLCAnWlRFJ10sIFtUWVBFLCBUQUJMRVRdXSwgW1xuXG4gICAgICAgICAgICAgIC9hbmRyb2lkLitbO1xcL11cXHMqKGdlblxcZHszfSlcXHMrYnVpbGQuKjQ5aC9pICAgICAgICAgICAgICAgICAgICAgICAgIC8vIFN3aXNzIEdFTiBNb2JpbGVcbiAgICAgICAgICAgICAgXSwgW01PREVMLCBbVkVORE9SLCAnU3dpc3MnXSwgW1RZUEUsIE1PQklMRV1dLCBbXG5cbiAgICAgICAgICAgICAgL2FuZHJvaWQuK1s7XFwvXVxccyooenVyXFxkezN9KVxccytidWlsZC9pICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgLy8gU3dpc3MgWlVSIFRhYmxldFxuICAgICAgICAgICAgICBdLCBbTU9ERUwsIFtWRU5ET1IsICdTd2lzcyddLCBbVFlQRSwgVEFCTEVUXV0sIFtcblxuICAgICAgICAgICAgICAvYW5kcm9pZC4rWztcXC9dXFxzKigoWmVraSk/VEIuKlxcYilcXHMrYnVpbGQvaSAgICAgICAgICAgICAgICAgICAgICAgICAvLyBaZWtpIFRhYmxldHNcbiAgICAgICAgICAgICAgXSwgW01PREVMLCBbVkVORE9SLCAnWmVraSddLCBbVFlQRSwgVEFCTEVUXV0sIFtcblxuICAgICAgICAgICAgICAvKGFuZHJvaWQpLitbO1xcL11cXHMrKFtZUl1cXGR7Mn0pXFxzK2J1aWxkL2ksXG4gICAgICAgICAgICAgIC9hbmRyb2lkLitbO1xcL11cXHMrKERyYWdvbltcXC1cXHNdK1RvdWNoXFxzK3xEVCkoXFx3ezV9KVxcc2J1aWxkL2kgICAgICAgIC8vIERyYWdvbiBUb3VjaCBUYWJsZXRcbiAgICAgICAgICAgICAgXSwgW1tWRU5ET1IsICdEcmFnb24gVG91Y2gnXSwgTU9ERUwsIFtUWVBFLCBUQUJMRVRdXSwgW1xuXG4gICAgICAgICAgICAgIC9hbmRyb2lkLitbO1xcL11cXHMqKE5TLT9cXHd7MCw5fSlcXHNidWlsZC9pICAgICAgICAgICAgICAgICAgICAgICAgICAgIC8vIEluc2lnbmlhIFRhYmxldHNcbiAgICAgICAgICAgICAgXSwgW01PREVMLCBbVkVORE9SLCAnSW5zaWduaWEnXSwgW1RZUEUsIFRBQkxFVF1dLCBbXG5cbiAgICAgICAgICAgICAgL2FuZHJvaWQuK1s7XFwvXVxccyooKE5YfE5leHQpLT9cXHd7MCw5fSlcXHMrYnVpbGQvaSAgICAgICAgICAgICAgICAgICAgLy8gTmV4dEJvb2sgVGFibGV0c1xuICAgICAgICAgICAgICBdLCBbTU9ERUwsIFtWRU5ET1IsICdOZXh0Qm9vayddLCBbVFlQRSwgVEFCTEVUXV0sIFtcblxuICAgICAgICAgICAgICAvYW5kcm9pZC4rWztcXC9dXFxzKihYdHJlbWVcXF8pPyhWKDFbMDQ1XXwyWzAxNV18MzB8NDB8NjB8N1swNV18OTApKVxccytidWlsZC9pXG4gICAgICAgICAgICAgIF0sIFtbVkVORE9SLCAnVm9pY2UnXSwgTU9ERUwsIFtUWVBFLCBNT0JJTEVdXSwgWyAgICAgICAgICAgICAgICAgICAgLy8gVm9pY2UgWHRyZW1lIFBob25lc1xuXG4gICAgICAgICAgICAgIC9hbmRyb2lkLitbO1xcL11cXHMqKExWVEVMXFwtKT8oVjFbMTJdKVxccytidWlsZC9pICAgICAgICAgICAgICAgICAgICAgLy8gTHZUZWwgUGhvbmVzXG4gICAgICAgICAgICAgIF0sIFtbVkVORE9SLCAnTHZUZWwnXSwgTU9ERUwsIFtUWVBFLCBNT0JJTEVdXSwgW1xuXG4gICAgICAgICAgICAgIC9hbmRyb2lkLis7XFxzKFBILTEpXFxzL2lcbiAgICAgICAgICAgICAgXSwgW01PREVMLCBbVkVORE9SLCAnRXNzZW50aWFsJ10sIFtUWVBFLCBNT0JJTEVdXSwgWyAgICAgICAgICAgICAgICAvLyBFc3NlbnRpYWwgUEgtMVxuXG4gICAgICAgICAgICAgIC9hbmRyb2lkLitbO1xcL11cXHMqKFYoMTAwTUR8NzAwTkF8NzAxMXw5MTdHKS4qXFxiKVxccytidWlsZC9pICAgICAgICAgIC8vIEVudml6ZW4gVGFibGV0c1xuICAgICAgICAgICAgICBdLCBbTU9ERUwsIFtWRU5ET1IsICdFbnZpemVuJ10sIFtUWVBFLCBUQUJMRVRdXSwgW1xuXG4gICAgICAgICAgICAgIC9hbmRyb2lkLitbO1xcL11cXHMqKExlW1xcc1xcLV0rUGFuKVtcXHNcXC1dKyhcXHd7MSw5fSlcXHMrYnVpbGQvaSAgICAgICAgICAvLyBMZSBQYW4gVGFibGV0c1xuICAgICAgICAgICAgICBdLCBbVkVORE9SLCBNT0RFTCwgW1RZUEUsIFRBQkxFVF1dLCBbXG5cbiAgICAgICAgICAgICAgL2FuZHJvaWQuK1s7XFwvXVxccyooVHJpb1tcXHNcXC1dKi4qKVxccytidWlsZC9pICAgICAgICAgICAgICAgICAgICAgICAgIC8vIE1hY2hTcGVlZCBUYWJsZXRzXG4gICAgICAgICAgICAgIF0sIFtNT0RFTCwgW1ZFTkRPUiwgJ01hY2hTcGVlZCddLCBbVFlQRSwgVEFCTEVUXV0sIFtcblxuICAgICAgICAgICAgICAvYW5kcm9pZC4rWztcXC9dXFxzKihUcmluaXR5KVtcXC1cXHNdKihUXFxkezN9KVxccytidWlsZC9pICAgICAgICAgICAgICAgIC8vIFRyaW5pdHkgVGFibGV0c1xuICAgICAgICAgICAgICBdLCBbVkVORE9SLCBNT0RFTCwgW1RZUEUsIFRBQkxFVF1dLCBbXG5cbiAgICAgICAgICAgICAgL2FuZHJvaWQuK1s7XFwvXVxccypUVV8oMTQ5MSlcXHMrYnVpbGQvaSAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAvLyBSb3RvciBUYWJsZXRzXG4gICAgICAgICAgICAgIF0sIFtNT0RFTCwgW1ZFTkRPUiwgJ1JvdG9yJ10sIFtUWVBFLCBUQUJMRVRdXSwgW1xuXG4gICAgICAgICAgICAgIC9hbmRyb2lkLisoS1MoLispKVxccytidWlsZC9pICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIC8vIEFtYXpvbiBLaW5kbGUgVGFibGV0c1xuICAgICAgICAgICAgICBdLCBbTU9ERUwsIFtWRU5ET1IsICdBbWF6b24nXSwgW1RZUEUsIFRBQkxFVF1dLCBbXG5cbiAgICAgICAgICAgICAgL2FuZHJvaWQuKyhHaWdhc2V0KVtcXHNcXC1dKyhRXFx3ezEsOX0pXFxzK2J1aWxkL2kgICAgICAgICAgICAgICAgICAgICAgLy8gR2lnYXNldCBUYWJsZXRzXG4gICAgICAgICAgICAgIF0sIFtWRU5ET1IsIE1PREVMLCBbVFlQRSwgVEFCTEVUXV0sIFtcblxuICAgICAgICAgICAgICAvXFxzKHRhYmxldHx0YWIpWztcXC9dL2ksICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgLy8gVW5pZGVudGlmaWFibGUgVGFibGV0XG4gICAgICAgICAgICAgIC9cXHMobW9iaWxlKSg/Ols7XFwvXXxcXHNzYWZhcmkpL2kgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgLy8gVW5pZGVudGlmaWFibGUgTW9iaWxlXG4gICAgICAgICAgICAgIF0sIFtbVFlQRSwgdXRpbC5sb3dlcml6ZV0sIFZFTkRPUiwgTU9ERUxdLCBbXG5cbiAgICAgICAgICAgICAgL1tcXHNcXC9cXChdKHNtYXJ0LT90dilbO1xcKV0vaSAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgLy8gU21hcnRUVlxuICAgICAgICAgICAgICBdLCBbW1RZUEUsIFNNQVJUVFZdXSwgW1xuXG4gICAgICAgICAgICAgIC8oYW5kcm9pZFtcXHdcXC5cXHNcXC1dezAsOX0pOy4rYnVpbGQvaSAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIC8vIEdlbmVyaWMgQW5kcm9pZCBEZXZpY2VcbiAgICAgICAgICAgICAgXSwgW01PREVMLCBbVkVORE9SLCAnR2VuZXJpYyddXVxuXG5cbiAgICAgICAgICAvKi8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vXG4gICAgICAgICAgICAgIC8vIFRPRE86IG1vdmUgdG8gc3RyaW5nIG1hcFxuICAgICAgICAgICAgICAvLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vXG5cbiAgICAgICAgICAgICAgLyhDNjYwMykvaSAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAvLyBTb255IFhwZXJpYSBaIEM2NjAzXG4gICAgICAgICAgICAgIF0sIFtbTU9ERUwsICdYcGVyaWEgWiBDNjYwMyddLCBbVkVORE9SLCAnU29ueSddLCBbVFlQRSwgTU9CSUxFXV0sIFtcbiAgICAgICAgICAgICAgLyhDNjkwMykvaSAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAvLyBTb255IFhwZXJpYSBaIDFcbiAgICAgICAgICAgICAgXSwgW1tNT0RFTCwgJ1hwZXJpYSBaIDEnXSwgW1ZFTkRPUiwgJ1NvbnknXSwgW1RZUEUsIE1PQklMRV1dLCBbXG5cbiAgICAgICAgICAgICAgLyhTTS1HOTAwW0Z8SF0pL2kgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAvLyBTYW1zdW5nIEdhbGF4eSBTNVxuICAgICAgICAgICAgICBdLCBbW01PREVMLCAnR2FsYXh5IFM1J10sIFtWRU5ET1IsICdTYW1zdW5nJ10sIFtUWVBFLCBNT0JJTEVdXSwgW1xuICAgICAgICAgICAgICAvKFNNLUc3MTAyKS9pICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIC8vIFNhbXN1bmcgR2FsYXh5IEdyYW5kIDJcbiAgICAgICAgICAgICAgXSwgW1tNT0RFTCwgJ0dhbGF4eSBHcmFuZCAyJ10sIFtWRU5ET1IsICdTYW1zdW5nJ10sIFtUWVBFLCBNT0JJTEVdXSwgW1xuICAgICAgICAgICAgICAvKFNNLUc1MzBIKS9pICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIC8vIFNhbXN1bmcgR2FsYXh5IEdyYW5kIFByaW1lXG4gICAgICAgICAgICAgIF0sIFtbTU9ERUwsICdHYWxheHkgR3JhbmQgUHJpbWUnXSwgW1ZFTkRPUiwgJ1NhbXN1bmcnXSwgW1RZUEUsIE1PQklMRV1dLCBbXG4gICAgICAgICAgICAgIC8oU00tRzMxM0haKS9pICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgLy8gU2Ftc3VuZyBHYWxheHkgVlxuICAgICAgICAgICAgICBdLCBbW01PREVMLCAnR2FsYXh5IFYnXSwgW1ZFTkRPUiwgJ1NhbXN1bmcnXSwgW1RZUEUsIE1PQklMRV1dLCBbXG4gICAgICAgICAgICAgIC8oU00tVDgwNSkvaSAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgLy8gU2Ftc3VuZyBHYWxheHkgVGFiIFMgMTAuNVxuICAgICAgICAgICAgICBdLCBbW01PREVMLCAnR2FsYXh5IFRhYiBTIDEwLjUnXSwgW1ZFTkRPUiwgJ1NhbXN1bmcnXSwgW1RZUEUsIFRBQkxFVF1dLCBbXG4gICAgICAgICAgICAgIC8oU00tRzgwMEYpL2kgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgLy8gU2Ftc3VuZyBHYWxheHkgUzUgTWluaVxuICAgICAgICAgICAgICBdLCBbW01PREVMLCAnR2FsYXh5IFM1IE1pbmknXSwgW1ZFTkRPUiwgJ1NhbXN1bmcnXSwgW1RZUEUsIE1PQklMRV1dLCBbXG4gICAgICAgICAgICAgIC8oU00tVDMxMSkvaSAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgLy8gU2Ftc3VuZyBHYWxheHkgVGFiIDMgOC4wXG4gICAgICAgICAgICAgIF0sIFtbTU9ERUwsICdHYWxheHkgVGFiIDMgOC4wJ10sIFtWRU5ET1IsICdTYW1zdW5nJ10sIFtUWVBFLCBUQUJMRVRdXSwgW1xuXG4gICAgICAgICAgICAgIC8oVDNDKS9pICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgLy8gQWR2YW4gVmFuZHJvaWQgVDNDXG4gICAgICAgICAgICAgIF0sIFtNT0RFTCwgW1ZFTkRPUiwgJ0FkdmFuJ10sIFtUWVBFLCBUQUJMRVRdXSwgW1xuICAgICAgICAgICAgICAvKEFEVkFOIFQxSlxcKykvaSAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAvLyBBZHZhbiBWYW5kcm9pZCBUMUorXG4gICAgICAgICAgICAgIF0sIFtbTU9ERUwsICdWYW5kcm9pZCBUMUorJ10sIFtWRU5ET1IsICdBZHZhbiddLCBbVFlQRSwgVEFCTEVUXV0sIFtcbiAgICAgICAgICAgICAgLyhBRFZBTiBTNEEpL2kgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAvLyBBZHZhbiBWYW5kcm9pZCBTNEFcbiAgICAgICAgICAgICAgXSwgW1tNT0RFTCwgJ1ZhbmRyb2lkIFM0QSddLCBbVkVORE9SLCAnQWR2YW4nXSwgW1RZUEUsIE1PQklMRV1dLCBbXG5cbiAgICAgICAgICAgICAgLyhWOTcyTSkvaSAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAvLyBaVEUgVjk3Mk1cbiAgICAgICAgICAgICAgXSwgW01PREVMLCBbVkVORE9SLCAnWlRFJ10sIFtUWVBFLCBNT0JJTEVdXSwgW1xuXG4gICAgICAgICAgICAgIC8oaS1tb2JpbGUpXFxzKElRXFxzW1xcZFxcLl0rKS9pICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIC8vIGktbW9iaWxlIElRXG4gICAgICAgICAgICAgIF0sIFtWRU5ET1IsIE1PREVMLCBbVFlQRSwgTU9CSUxFXV0sIFtcbiAgICAgICAgICAgICAgLyhJUTYuMykvaSAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAvLyBpLW1vYmlsZSBJUSBJUSA2LjNcbiAgICAgICAgICAgICAgXSwgW1tNT0RFTCwgJ0lRIDYuMyddLCBbVkVORE9SLCAnaS1tb2JpbGUnXSwgW1RZUEUsIE1PQklMRV1dLCBbXG4gICAgICAgICAgICAgIC8oaS1tb2JpbGUpXFxzKGktc3R5bGVcXHNbXFxkXFwuXSspL2kgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIC8vIGktbW9iaWxlIGktU1RZTEVcbiAgICAgICAgICAgICAgXSwgW1ZFTkRPUiwgTU9ERUwsIFtUWVBFLCBNT0JJTEVdXSwgW1xuICAgICAgICAgICAgICAvKGktU1RZTEUyLjEpL2kgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIC8vIGktbW9iaWxlIGktU1RZTEUgMi4xXG4gICAgICAgICAgICAgIF0sIFtbTU9ERUwsICdpLVNUWUxFIDIuMSddLCBbVkVORE9SLCAnaS1tb2JpbGUnXSwgW1RZUEUsIE1PQklMRV1dLCBbXG5cbiAgICAgICAgICAgICAgLyhtb2JpaXN0YXIgdG91Y2ggTEFJIDUxMikvaSAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAvLyBtb2JpaXN0YXIgdG91Y2ggTEFJIDUxMlxuICAgICAgICAgICAgICBdLCBbW01PREVMLCAnVG91Y2ggTEFJIDUxMiddLCBbVkVORE9SLCAnbW9iaWlzdGFyJ10sIFtUWVBFLCBNT0JJTEVdXSwgW1xuXG4gICAgICAgICAgICAgIC8vLy8vLy8vLy8vLy9cbiAgICAgICAgICAgICAgLy8gRU5EIFRPRE9cbiAgICAgICAgICAgICAgLy8vLy8vLy8vLy8qL1xuXG4gICAgICAgICAgXSxcblxuICAgICAgICAgIGVuZ2luZSA6IFtbXG5cbiAgICAgICAgICAgICAgL3dpbmRvd3MuK1xcc2VkZ2VcXC8oW1xcd1xcLl0rKS9pICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgLy8gRWRnZUhUTUxcbiAgICAgICAgICAgICAgXSwgW1ZFUlNJT04sIFtOQU1FLCAnRWRnZUhUTUwnXV0sIFtcblxuICAgICAgICAgICAgICAvd2Via2l0XFwvNTM3XFwuMzYuK2Nocm9tZVxcLyg/ITI3KS9pICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIC8vIEJsaW5rXG4gICAgICAgICAgICAgIF0sIFtbTkFNRSwgJ0JsaW5rJ11dLCBbXG5cbiAgICAgICAgICAgICAgLyhwcmVzdG8pXFwvKFtcXHdcXC5dKykvaSwgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAvLyBQcmVzdG9cbiAgICAgICAgICAgICAgLyh3ZWJraXR8dHJpZGVudHxuZXRmcm9udHxuZXRzdXJmfGFtYXlhfGx5bnh8dzNtfGdvYW5uYSlcXC8oW1xcd1xcLl0rKS9pLCAgICAgXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgLy8gV2ViS2l0L1RyaWRlbnQvTmV0RnJvbnQvTmV0U3VyZi9BbWF5YS9MeW54L3czbS9Hb2FubmFcbiAgICAgICAgICAgICAgLyhraHRtbHx0YXNtYW58bGlua3MpW1xcL1xcc11cXCg/KFtcXHdcXC5dKykvaSwgICAgICAgICAgICAgICAgICAgICAgICAgIC8vIEtIVE1ML1Rhc21hbi9MaW5rc1xuICAgICAgICAgICAgICAvKGljYWIpW1xcL1xcc10oWzIzXVxcLltcXGRcXC5dKykvaSAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgLy8gaUNhYlxuICAgICAgICAgICAgICBdLCBbTkFNRSwgVkVSU0lPTl0sIFtcblxuICAgICAgICAgICAgICAvcnZcXDooW1xcd1xcLl17MSw5fSkuKyhnZWNrbykvaSAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIC8vIEdlY2tvXG4gICAgICAgICAgICAgIF0sIFtWRVJTSU9OLCBOQU1FXVxuICAgICAgICAgIF0sXG5cbiAgICAgICAgICBvcyA6IFtbXG5cbiAgICAgICAgICAgICAgLy8gV2luZG93cyBiYXNlZFxuICAgICAgICAgICAgICAvbWljcm9zb2Z0XFxzKHdpbmRvd3MpXFxzKHZpc3RhfHhwKS9pICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgLy8gV2luZG93cyAoaVR1bmVzKVxuICAgICAgICAgICAgICBdLCBbTkFNRSwgVkVSU0lPTl0sIFtcbiAgICAgICAgICAgICAgLyh3aW5kb3dzKVxcc250XFxzNlxcLjI7XFxzKGFybSkvaSwgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgLy8gV2luZG93cyBSVFxuICAgICAgICAgICAgICAvKHdpbmRvd3NcXHNwaG9uZSg/Olxcc29zKSopW1xcc1xcL10/KFtcXGRcXC5cXHNcXHddKikvaSwgICAgICAgICAgICAgICAgICAgLy8gV2luZG93cyBQaG9uZVxuICAgICAgICAgICAgICAvKHdpbmRvd3NcXHNtb2JpbGV8d2luZG93cylbXFxzXFwvXT8oW250Y2VcXGRcXC5cXHNdK1xcdykvaVxuICAgICAgICAgICAgICBdLCBbW05BTUUsIG1hcHBlci5zdHIsIG1hcHMub3Mud2luZG93cy5uYW1lXSwgW1ZFUlNJT04sIG1hcHBlci5zdHIsIG1hcHMub3Mud2luZG93cy52ZXJzaW9uXV0sIFtcbiAgICAgICAgICAgICAgLyh3aW4oPz0zfDl8bil8d2luXFxzOXhcXHMpKFtudFxcZFxcLl0rKS9pXG4gICAgICAgICAgICAgIF0sIFtbTkFNRSwgJ1dpbmRvd3MnXSwgW1ZFUlNJT04sIG1hcHBlci5zdHIsIG1hcHMub3Mud2luZG93cy52ZXJzaW9uXV0sIFtcblxuICAgICAgICAgICAgICAvLyBNb2JpbGUvRW1iZWRkZWQgT1NcbiAgICAgICAgICAgICAgL1xcKChiYikoMTApOy9pICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgLy8gQmxhY2tCZXJyeSAxMFxuICAgICAgICAgICAgICBdLCBbW05BTUUsICdCbGFja0JlcnJ5J10sIFZFUlNJT05dLCBbXG4gICAgICAgICAgICAgIC8oYmxhY2tiZXJyeSlcXHcqXFwvPyhbXFx3XFwuXSopL2ksICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIC8vIEJsYWNrYmVycnlcbiAgICAgICAgICAgICAgLyh0aXplbilbXFwvXFxzXShbXFx3XFwuXSspL2ksICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgLy8gVGl6ZW5cbiAgICAgICAgICAgICAgLyhhbmRyb2lkfHdlYm9zfHBhbG1cXHNvc3xxbnh8YmFkYXxyaW1cXHN0YWJsZXRcXHNvc3xtZWVnb3xjb250aWtpKVtcXC9cXHMtXT8oW1xcd1xcLl0qKS9pLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIC8vIEFuZHJvaWQvV2ViT1MvUGFsbS9RTlgvQmFkYS9SSU0vTWVlR28vQ29udGlraVxuICAgICAgICAgICAgICAvbGludXg7Lisoc2FpbGZpc2gpOy9pICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIC8vIFNhaWxmaXNoIE9TXG4gICAgICAgICAgICAgIF0sIFtOQU1FLCBWRVJTSU9OXSwgW1xuICAgICAgICAgICAgICAvKHN5bWJpYW5cXHM/b3N8c3ltYm9zfHM2MCg/PTspKVtcXC9cXHMtXT8oW1xcd1xcLl0qKS9pICAgICAgICAgICAgICAgICAgLy8gU3ltYmlhblxuICAgICAgICAgICAgICBdLCBbW05BTUUsICdTeW1iaWFuJ10sIFZFUlNJT05dLCBbXG4gICAgICAgICAgICAgIC9cXCgoc2VyaWVzNDApOy9pICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIC8vIFNlcmllcyA0MFxuICAgICAgICAgICAgICBdLCBbTkFNRV0sIFtcbiAgICAgICAgICAgICAgL21vemlsbGEuK1xcKG1vYmlsZTsuK2dlY2tvLitmaXJlZm94L2kgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgLy8gRmlyZWZveCBPU1xuICAgICAgICAgICAgICBdLCBbW05BTUUsICdGaXJlZm94IE9TJ10sIFZFUlNJT05dLCBbXG5cbiAgICAgICAgICAgICAgLy8gQ29uc29sZVxuICAgICAgICAgICAgICAvKG5pbnRlbmRvfHBsYXlzdGF0aW9uKVxccyhbd2lkczM0cG9ydGFibGV2dV0rKS9pLCAgICAgICAgICAgICAgICAgICAvLyBOaW50ZW5kby9QbGF5c3RhdGlvblxuXG4gICAgICAgICAgICAgIC8vIEdOVS9MaW51eCBiYXNlZFxuICAgICAgICAgICAgICAvKG1pbnQpW1xcL1xcc1xcKF0/KFxcdyopL2ksICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAvLyBNaW50XG4gICAgICAgICAgICAgIC8obWFnZWlhfHZlY3RvcmxpbnV4KVs7XFxzXS9pLCAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIC8vIE1hZ2VpYS9WZWN0b3JMaW51eFxuICAgICAgICAgICAgICAvKGpvbGl8W2t4bG5dP3VidW50dXxkZWJpYW58c3VzZXxvcGVuc3VzZXxnZW50b298KD89XFxzKWFyY2h8c2xhY2t3YXJlfGZlZG9yYXxtYW5kcml2YXxjZW50b3N8cGNsaW51eG9zfHJlZGhhdHx6ZW53YWxrfGxpbnB1cylbXFwvXFxzLV0/KD8hY2hyb20pKFtcXHdcXC4tXSopL2ksXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgLy8gSm9saS9VYnVudHUvRGViaWFuL1NVU0UvR2VudG9vL0FyY2gvU2xhY2t3YXJlXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgLy8gRmVkb3JhL01hbmRyaXZhL0NlbnRPUy9QQ0xpbnV4T1MvUmVkSGF0L1plbndhbGsvTGlucHVzXG4gICAgICAgICAgICAgIC8oaHVyZHxsaW51eClcXHM/KFtcXHdcXC5dKikvaSwgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgLy8gSHVyZC9MaW51eFxuICAgICAgICAgICAgICAvKGdudSlcXHM/KFtcXHdcXC5dKikvaSAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIC8vIEdOVVxuICAgICAgICAgICAgICBdLCBbW05BTUUsICdMaW51eCddLCBWRVJTSU9OXSwgW1xuXG4gICAgICAgICAgICAgIC8oY3JvcylcXHNbXFx3XStcXHMoW1xcd1xcLl0rXFx3KS9pICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgLy8gQ2hyb21pdW0gT1NcbiAgICAgICAgICAgICAgXSwgW1tOQU1FLCAnQ2hyb21pdW0gT1MnXSwgVkVSU0lPTl0sW1xuXG4gICAgICAgICAgICAgIC8vIFNvbGFyaXNcbiAgICAgICAgICAgICAgLyhzdW5vcylcXHM/KFtcXHdcXC5cXGRdKikvaSAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgLy8gU29sYXJpc1xuICAgICAgICAgICAgICBdLCBbW05BTUUsICdTb2xhcmlzJ10sIFZFUlNJT05dLCBbXG5cbiAgICAgICAgICAgICAgLy8gQlNEIGJhc2VkXG4gICAgICAgICAgICAgIC9cXHMoW2ZyZW50b3BjLV17MCw0fWJzZHxkcmFnb25mbHkpXFxzPyhbXFx3XFwuXSopL2kgICAgICAgICAgICAgICAgICAgIC8vIEZyZWVCU0QvTmV0QlNEL09wZW5CU0QvUEMtQlNEL0RyYWdvbkZseVxuICAgICAgICAgICAgICBdLCBbW05BTUUsICdMaW51eCddLCBWRVJTSU9OXSxbXG5cbiAgICAgICAgICAgICAgLyhpcGhvbmUpKD86Lipvc1xccyooW1xcd10qKVxcc2xpa2VcXHNtYWN8O1xcc29wZXJhKS9pICAgICAgICAgICAgICAgICAgLy8gaU9TXG4gICAgICAgICAgICAgIF0sIFtbTkFNRSwgJ2lQaG9uZSddLCBbVkVSU0lPTiwgL18vZywgJy4nXV0sIFtcblxuICAgICAgICAgICAgICAvKGlwYWQpKD86Lipvc1xccyooW1xcd10qKVxcc2xpa2VcXHNtYWN8O1xcc29wZXJhKS9pICAgICAgICAgICAgICAgICAgICAvLyBpT1NcbiAgICAgICAgICAgICAgXSwgW1tOQU1FLCAnaVBhZCddLCBbVkVSU0lPTiwgL18vZywgJy4nXV0sIFtcblxuICAgICAgICAgICAgICAvKGhhaWt1KVxccyhcXHcrKS9pICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgLy8gSGFpa3VcbiAgICAgICAgICAgICAgXSwgW05BTUUsIFZFUlNJT05dLFtcblxuICAgICAgICAgICAgICAvY2ZuZXR3b3JrXFwvLitkYXJ3aW4vaSxcbiAgICAgICAgICAgICAgL2lwW2hvbmVhZF17Miw0fSg/Oi4qb3NcXHMoW1xcd10rKVxcc2xpa2VcXHNtYWN8O1xcc29wZXJhKS9pICAgICAgICAgICAgIC8vIGlPU1xuICAgICAgICAgICAgICBdLCBbW1ZFUlNJT04sIC9fL2csICcuJ10sIFtOQU1FLCAnaU9TJ11dLCBbXG5cbiAgICAgICAgICAgICAgLyhtYWNcXHNvc1xcc3gpXFxzPyhbXFx3XFxzXFwuXSopL2ksXG4gICAgICAgICAgICAgIC8obWFjaW50b3NofG1hYyg/PV9wb3dlcnBjKVxccykvaSAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIC8vIE1hYyBPU1xuICAgICAgICAgICAgICBdLCBbW05BTUUsICdNYWMnXSwgW1ZFUlNJT04sIC9fL2csICcuJ11dLCBbXG5cbiAgICAgICAgICAgICAgLy8gT3RoZXJcbiAgICAgICAgICAgICAgLygoPzpvcGVuKT9zb2xhcmlzKVtcXC9cXHMtXT8oW1xcd1xcLl0qKS9pLCAgICAgICAgICAgICAgICAgICAgICAgICAgICAgLy8gU29sYXJpc1xuICAgICAgICAgICAgICAvKGFpeClcXHMoKFxcZCkoPz1cXC58XFwpfFxccylbXFx3XFwuXSkqL2ksICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAvLyBBSVhcbiAgICAgICAgICAgICAgLyhwbGFuXFxzOXxtaW5peHxiZW9zfG9zXFwvMnxhbWlnYW9zfG1vcnBob3N8cmlzY1xcc29zfG9wZW52bXN8ZnVjaHNpYSkvaSxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAvLyBQbGFuOS9NaW5peC9CZU9TL09TMi9BbWlnYU9TL01vcnBoT1MvUklTQ09TL09wZW5WTVMvRnVjaHNpYVxuICAgICAgICAgICAgICAvKHVuaXgpXFxzPyhbXFx3XFwuXSopL2kgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIC8vIFVOSVhcbiAgICAgICAgICAgICAgXSwgW05BTUUsIFZFUlNJT05dXG4gICAgICAgICAgXVxuICAgICAgfTtcblxuXG4gICAgICAvLy8vLy8vLy8vLy8vLy8vL1xuICAgICAgLy8gQ29uc3RydWN0b3JcbiAgICAgIC8vLy8vLy8vLy8vLy8vLy9cbiAgICAgIC8qXG4gICAgICB2YXIgQnJvd3NlciA9IGZ1bmN0aW9uIChuYW1lLCB2ZXJzaW9uKSB7XG4gICAgICAgICAgdGhpc1tOQU1FXSA9IG5hbWU7XG4gICAgICAgICAgdGhpc1tWRVJTSU9OXSA9IHZlcnNpb247XG4gICAgICB9O1xuICAgICAgdmFyIENQVSA9IGZ1bmN0aW9uIChhcmNoKSB7XG4gICAgICAgICAgdGhpc1tBUkNISVRFQ1RVUkVdID0gYXJjaDtcbiAgICAgIH07XG4gICAgICB2YXIgRGV2aWNlID0gZnVuY3Rpb24gKHZlbmRvciwgbW9kZWwsIHR5cGUpIHtcbiAgICAgICAgICB0aGlzW1ZFTkRPUl0gPSB2ZW5kb3I7XG4gICAgICAgICAgdGhpc1tNT0RFTF0gPSBtb2RlbDtcbiAgICAgICAgICB0aGlzW1RZUEVdID0gdHlwZTtcbiAgICAgIH07XG4gICAgICB2YXIgRW5naW5lID0gQnJvd3NlcjtcbiAgICAgIHZhciBPUyA9IEJyb3dzZXI7XG4gICAgICAqL1xuICAgICAgdmFyIFVBUGFyc2VyID0gZnVuY3Rpb24gKHVhc3RyaW5nLCBleHRlbnNpb25zKSB7XG5cbiAgICAgICAgICBpZiAodHlwZW9mIHVhc3RyaW5nID09PSAnb2JqZWN0Jykge1xuICAgICAgICAgICAgICBleHRlbnNpb25zID0gdWFzdHJpbmc7XG4gICAgICAgICAgICAgIHVhc3RyaW5nID0gdW5kZWZpbmVkJDE7XG4gICAgICAgICAgfVxuXG4gICAgICAgICAgaWYgKCEodGhpcyBpbnN0YW5jZW9mIFVBUGFyc2VyKSkge1xuICAgICAgICAgICAgICByZXR1cm4gbmV3IFVBUGFyc2VyKHVhc3RyaW5nLCBleHRlbnNpb25zKS5nZXRSZXN1bHQoKTtcbiAgICAgICAgICB9XG5cbiAgICAgICAgICB2YXIgdWEgPSB1YXN0cmluZyB8fCAoKHdpbmRvdyAmJiB3aW5kb3cubmF2aWdhdG9yICYmIHdpbmRvdy5uYXZpZ2F0b3IudXNlckFnZW50KSA/IHdpbmRvdy5uYXZpZ2F0b3IudXNlckFnZW50IDogRU1QVFkpO1xuICAgICAgICAgIHZhciByZ3htYXAgPSBleHRlbnNpb25zID8gdXRpbC5leHRlbmQocmVnZXhlcywgZXh0ZW5zaW9ucykgOiByZWdleGVzO1xuICAgICAgICAgIC8vdmFyIGJyb3dzZXIgPSBuZXcgQnJvd3NlcigpO1xuICAgICAgICAgIC8vdmFyIGNwdSA9IG5ldyBDUFUoKTtcbiAgICAgICAgICAvL3ZhciBkZXZpY2UgPSBuZXcgRGV2aWNlKCk7XG4gICAgICAgICAgLy92YXIgZW5naW5lID0gbmV3IEVuZ2luZSgpO1xuICAgICAgICAgIC8vdmFyIG9zID0gbmV3IE9TKCk7XG5cbiAgICAgICAgICB0aGlzLmdldEJyb3dzZXIgPSBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICAgIHZhciBicm93c2VyID0geyBuYW1lOiB1bmRlZmluZWQkMSwgdmVyc2lvbjogdW5kZWZpbmVkJDEgfTtcbiAgICAgICAgICAgICAgbWFwcGVyLnJneC5jYWxsKGJyb3dzZXIsIHVhLCByZ3htYXAuYnJvd3Nlcik7XG4gICAgICAgICAgICAgIGJyb3dzZXIubWFqb3IgPSB1dGlsLm1ham9yKGJyb3dzZXIudmVyc2lvbik7IC8vIGRlcHJlY2F0ZWRcbiAgICAgICAgICAgICAgcmV0dXJuIGJyb3dzZXI7XG4gICAgICAgICAgfTtcbiAgICAgICAgICB0aGlzLmdldENQVSA9IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgICAgdmFyIGNwdSA9IHsgYXJjaGl0ZWN0dXJlOiB1bmRlZmluZWQkMSB9O1xuICAgICAgICAgICAgICBtYXBwZXIucmd4LmNhbGwoY3B1LCB1YSwgcmd4bWFwLmNwdSk7XG4gICAgICAgICAgICAgIHJldHVybiBjcHU7XG4gICAgICAgICAgfTtcbiAgICAgICAgICB0aGlzLmdldERldmljZSA9IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgICAgdmFyIGRldmljZSA9IHsgdmVuZG9yOiB1bmRlZmluZWQkMSwgbW9kZWw6IHVuZGVmaW5lZCQxLCB0eXBlOiB1bmRlZmluZWQkMSB9O1xuICAgICAgICAgICAgICBtYXBwZXIucmd4LmNhbGwoZGV2aWNlLCB1YSwgcmd4bWFwLmRldmljZSk7XG4gICAgICAgICAgICAgIHJldHVybiBkZXZpY2U7XG4gICAgICAgICAgfTtcbiAgICAgICAgICB0aGlzLmdldEVuZ2luZSA9IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgICAgdmFyIGVuZ2luZSA9IHsgbmFtZTogdW5kZWZpbmVkJDEsIHZlcnNpb246IHVuZGVmaW5lZCQxIH07XG4gICAgICAgICAgICAgIG1hcHBlci5yZ3guY2FsbChlbmdpbmUsIHVhLCByZ3htYXAuZW5naW5lKTtcbiAgICAgICAgICAgICAgcmV0dXJuIGVuZ2luZTtcbiAgICAgICAgICB9O1xuICAgICAgICAgIHRoaXMuZ2V0T1MgPSBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICAgIHZhciBvcyA9IHsgbmFtZTogdW5kZWZpbmVkJDEsIHZlcnNpb246IHVuZGVmaW5lZCQxIH07XG4gICAgICAgICAgICAgIG1hcHBlci5yZ3guY2FsbChvcywgdWEsIHJneG1hcC5vcyk7XG4gICAgICAgICAgICAgIHJldHVybiBvcztcbiAgICAgICAgICB9O1xuICAgICAgICAgIHRoaXMuZ2V0UmVzdWx0ID0gZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgICByZXR1cm4ge1xuICAgICAgICAgICAgICAgICAgdWEgICAgICA6IHRoaXMuZ2V0VUEoKSxcbiAgICAgICAgICAgICAgICAgIGJyb3dzZXIgOiB0aGlzLmdldEJyb3dzZXIoKSxcbiAgICAgICAgICAgICAgICAgIGVuZ2luZSAgOiB0aGlzLmdldEVuZ2luZSgpLFxuICAgICAgICAgICAgICAgICAgb3MgICAgICA6IHRoaXMuZ2V0T1MoKSxcbiAgICAgICAgICAgICAgICAgIGRldmljZSAgOiB0aGlzLmdldERldmljZSgpLFxuICAgICAgICAgICAgICAgICAgY3B1ICAgICA6IHRoaXMuZ2V0Q1BVKClcbiAgICAgICAgICAgICAgfTtcbiAgICAgICAgICB9O1xuICAgICAgICAgIHRoaXMuZ2V0VUEgPSBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICAgIHJldHVybiB1YTtcbiAgICAgICAgICB9O1xuICAgICAgICAgIHRoaXMuc2V0VUEgPSBmdW5jdGlvbiAodWFzdHJpbmcpIHtcbiAgICAgICAgICAgICAgdWEgPSB1YXN0cmluZztcbiAgICAgICAgICAgICAgLy9icm93c2VyID0gbmV3IEJyb3dzZXIoKTtcbiAgICAgICAgICAgICAgLy9jcHUgPSBuZXcgQ1BVKCk7XG4gICAgICAgICAgICAgIC8vZGV2aWNlID0gbmV3IERldmljZSgpO1xuICAgICAgICAgICAgICAvL2VuZ2luZSA9IG5ldyBFbmdpbmUoKTtcbiAgICAgICAgICAgICAgLy9vcyA9IG5ldyBPUygpO1xuICAgICAgICAgICAgICByZXR1cm4gdGhpcztcbiAgICAgICAgICB9O1xuICAgICAgICAgIHJldHVybiB0aGlzO1xuICAgICAgfTtcblxuICAgICAgVUFQYXJzZXIuVkVSU0lPTiA9IExJQlZFUlNJT047XG4gICAgICBVQVBhcnNlci5CUk9XU0VSID0ge1xuICAgICAgICAgIE5BTUUgICAgOiBOQU1FLFxuICAgICAgICAgIE1BSk9SICAgOiBNQUpPUiwgLy8gZGVwcmVjYXRlZFxuICAgICAgICAgIFZFUlNJT04gOiBWRVJTSU9OXG4gICAgICB9O1xuICAgICAgVUFQYXJzZXIuQ1BVID0ge1xuICAgICAgICAgIEFSQ0hJVEVDVFVSRSA6IEFSQ0hJVEVDVFVSRVxuICAgICAgfTtcbiAgICAgIFVBUGFyc2VyLkRFVklDRSA9IHtcbiAgICAgICAgICBNT0RFTCAgIDogTU9ERUwsXG4gICAgICAgICAgVkVORE9SICA6IFZFTkRPUixcbiAgICAgICAgICBUWVBFICAgIDogVFlQRSxcbiAgICAgICAgICBDT05TT0xFIDogQ09OU09MRSxcbiAgICAgICAgICBNT0JJTEUgIDogTU9CSUxFLFxuICAgICAgICAgIFNNQVJUVFYgOiBTTUFSVFRWLFxuICAgICAgICAgIFRBQkxFVCAgOiBUQUJMRVQsXG4gICAgICAgICAgV0VBUkFCTEU6IFdFQVJBQkxFLFxuICAgICAgICAgIEVNQkVEREVEOiBFTUJFRERFRFxuICAgICAgfTtcbiAgICAgIFVBUGFyc2VyLkVOR0lORSA9IHtcbiAgICAgICAgICBOQU1FICAgIDogTkFNRSxcbiAgICAgICAgICBWRVJTSU9OIDogVkVSU0lPTlxuICAgICAgfTtcbiAgICAgIFVBUGFyc2VyLk9TID0ge1xuICAgICAgICAgIE5BTUUgICAgOiBOQU1FLFxuICAgICAgICAgIFZFUlNJT04gOiBWRVJTSU9OXG4gICAgICB9O1xuICAgICAgLy9VQVBhcnNlci5VdGlscyA9IHV0aWw7XG5cbiAgICAgIC8vLy8vLy8vLy8vXG4gICAgICAvLyBFeHBvcnRcbiAgICAgIC8vLy8vLy8vLy9cblxuXG4gICAgICAvLyBjaGVjayBqcyBlbnZpcm9ubWVudFxuICAgICAge1xuICAgICAgICAgIC8vIG5vZGVqcyBlbnZcbiAgICAgICAgICBpZiAobW9kdWxlLmV4cG9ydHMpIHtcbiAgICAgICAgICAgICAgZXhwb3J0cyA9IG1vZHVsZS5leHBvcnRzID0gVUFQYXJzZXI7XG4gICAgICAgICAgfVxuICAgICAgICAgIC8vIFRPRE86IHRlc3QhISEhISEhIVxuICAgICAgICAgIC8qXG4gICAgICAgICAgaWYgKHJlcXVpcmUgJiYgcmVxdWlyZS5tYWluID09PSBtb2R1bGUgJiYgcHJvY2Vzcykge1xuICAgICAgICAgICAgICAvLyBjbGlcbiAgICAgICAgICAgICAgdmFyIGpzb25pemUgPSBmdW5jdGlvbiAoYXJyKSB7XG4gICAgICAgICAgICAgICAgICB2YXIgcmVzID0gW107XG4gICAgICAgICAgICAgICAgICBmb3IgKHZhciBpIGluIGFycikge1xuICAgICAgICAgICAgICAgICAgICAgIHJlcy5wdXNoKG5ldyBVQVBhcnNlcihhcnJbaV0pLmdldFJlc3VsdCgpKTtcbiAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgIHByb2Nlc3Muc3Rkb3V0LndyaXRlKEpTT04uc3RyaW5naWZ5KHJlcywgbnVsbCwgMikgKyAnXFxuJyk7XG4gICAgICAgICAgICAgIH07XG4gICAgICAgICAgICAgIGlmIChwcm9jZXNzLnN0ZGluLmlzVFRZKSB7XG4gICAgICAgICAgICAgICAgICAvLyB2aWEgYXJnc1xuICAgICAgICAgICAgICAgICAganNvbml6ZShwcm9jZXNzLmFyZ3Yuc2xpY2UoMikpO1xuICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgLy8gdmlhIHBpcGVcbiAgICAgICAgICAgICAgICAgIHZhciBzdHIgPSAnJztcbiAgICAgICAgICAgICAgICAgIHByb2Nlc3Muc3RkaW4ub24oJ3JlYWRhYmxlJywgZnVuY3Rpb24oKSB7XG4gICAgICAgICAgICAgICAgICAgICAgdmFyIHJlYWQgPSBwcm9jZXNzLnN0ZGluLnJlYWQoKTtcbiAgICAgICAgICAgICAgICAgICAgICBpZiAocmVhZCAhPT0gbnVsbCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICBzdHIgKz0gcmVhZDtcbiAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgICAgIHByb2Nlc3Muc3RkaW4ub24oJ2VuZCcsIGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgICAgICAgICAgICBqc29uaXplKHN0ci5yZXBsYWNlKC9cXG4kLywgJycpLnNwbGl0KCdcXG4nKSk7XG4gICAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgfVxuICAgICAgICAgIH1cbiAgICAgICAgICAqL1xuICAgICAgICAgIGV4cG9ydHMuVUFQYXJzZXIgPSBVQVBhcnNlcjtcbiAgICAgIH1cblxuICAgICAgLy8galF1ZXJ5L1plcHRvIHNwZWNpZmljIChvcHRpb25hbClcbiAgICAgIC8vIE5vdGU6XG4gICAgICAvLyAgIEluIEFNRCBlbnYgdGhlIGdsb2JhbCBzY29wZSBzaG91bGQgYmUga2VwdCBjbGVhbiwgYnV0IGpRdWVyeSBpcyBhbiBleGNlcHRpb24uXG4gICAgICAvLyAgIGpRdWVyeSBhbHdheXMgZXhwb3J0cyB0byBnbG9iYWwgc2NvcGUsIHVubGVzcyBqUXVlcnkubm9Db25mbGljdCh0cnVlKSBpcyB1c2VkLFxuICAgICAgLy8gICBhbmQgd2Ugc2hvdWxkIGNhdGNoIHRoYXQuXG4gICAgICB2YXIgJCA9IHdpbmRvdyAmJiAod2luZG93LmpRdWVyeSB8fCB3aW5kb3cuWmVwdG8pO1xuICAgICAgaWYgKHR5cGVvZiAkICE9PSBVTkRFRl9UWVBFICYmICEkLnVhKSB7XG4gICAgICAgICAgdmFyIHBhcnNlciA9IG5ldyBVQVBhcnNlcigpO1xuICAgICAgICAgICQudWEgPSBwYXJzZXIuZ2V0UmVzdWx0KCk7XG4gICAgICAgICAgJC51YS5nZXQgPSBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICAgIHJldHVybiBwYXJzZXIuZ2V0VUEoKTtcbiAgICAgICAgICB9O1xuICAgICAgICAgICQudWEuc2V0ID0gZnVuY3Rpb24gKHVhc3RyaW5nKSB7XG4gICAgICAgICAgICAgIHBhcnNlci5zZXRVQSh1YXN0cmluZyk7XG4gICAgICAgICAgICAgIHZhciByZXN1bHQgPSBwYXJzZXIuZ2V0UmVzdWx0KCk7XG4gICAgICAgICAgICAgIGZvciAodmFyIHByb3AgaW4gcmVzdWx0KSB7XG4gICAgICAgICAgICAgICAgICAkLnVhW3Byb3BdID0gcmVzdWx0W3Byb3BdO1xuICAgICAgICAgICAgICB9XG4gICAgICAgICAgfTtcbiAgICAgIH1cblxuICB9KSh0eXBlb2Ygd2luZG93ID09PSAnb2JqZWN0JyA/IHdpbmRvdyA6IGNvbW1vbmpzR2xvYmFsKTtcbiAgfSk7XG4gIHZhciB1YVBhcnNlcl8xID0gdWFQYXJzZXIuVUFQYXJzZXI7XG5cbiAgLyoganNoaW50IGJpdHdpc2U6IGZhbHNlLCBsYXhicmVhazogdHJ1ZSAqL1xuXG4gIC8qKlxuICAgKiBTb3VyY2U6IFtqZWQncyBnaXN0XXtAbGluayBodHRwczovL2dpc3QuZ2l0aHViLmNvbS85ODI4ODN9LlxuICAgKiBSZXR1cm5zIGEgcmFuZG9tIHY0IFVVSUQgb2YgdGhlIGZvcm0geHh4eHh4eHgteHh4eC00eHh4LXl4eHgteHh4eHh4eHh4eHh4LFxuICAgKiB3aGVyZSBlYWNoIHggaXMgcmVwbGFjZWQgd2l0aCBhIHJhbmRvbSBoZXhhZGVjaW1hbCBkaWdpdCBmcm9tIDAgdG8gZiwgYW5kXG4gICAqIHkgaXMgcmVwbGFjZWQgd2l0aCBhIHJhbmRvbSBoZXhhZGVjaW1hbCBkaWdpdCBmcm9tIDggdG8gYi5cbiAgICogVXNlZCB0byBnZW5lcmF0ZSBVVUlEcyBmb3IgZGV2aWNlSWRzLlxuICAgKiBAcHJpdmF0ZVxuICAgKi9cbiAgdmFyIHV1aWQgPSBmdW5jdGlvbiB1dWlkKGEpIHtcbiAgICByZXR1cm4gYSAvLyBpZiB0aGUgcGxhY2Vob2xkZXIgd2FzIHBhc3NlZCwgcmV0dXJuXG4gICAgPyAoIC8vIGEgcmFuZG9tIG51bWJlciBmcm9tIDAgdG8gMTVcbiAgICBhIF4gLy8gdW5sZXNzIGIgaXMgOCxcbiAgICBNYXRoLnJhbmRvbSgpIC8vIGluIHdoaWNoIGNhc2VcbiAgICAqIDE2IC8vIGEgcmFuZG9tIG51bWJlciBmcm9tXG4gICAgPj4gYSAvIDQgLy8gOCB0byAxMVxuICAgICkudG9TdHJpbmcoMTYpIC8vIGluIGhleGFkZWNpbWFsXG4gICAgOiAoIC8vIG9yIG90aGVyd2lzZSBhIGNvbmNhdGVuYXRlZCBzdHJpbmc6XG4gICAgWzFlN10gKyAvLyAxMDAwMDAwMCArXG4gICAgLTFlMyArIC8vIC0xMDAwICtcbiAgICAtNGUzICsgLy8gLTQwMDAgK1xuICAgIC04ZTMgKyAvLyAtODAwMDAwMDAgK1xuICAgIC0xZTExIC8vIC0xMDAwMDAwMDAwMDAsXG4gICAgKS5yZXBsYWNlKCAvLyByZXBsYWNpbmdcbiAgICAvWzAxOF0vZywgLy8gemVyb2VzLCBvbmVzLCBhbmQgZWlnaHRzIHdpdGhcbiAgICB1dWlkIC8vIHJhbmRvbSBoZXggZGlnaXRzXG4gICAgKTtcbiAgfTtcblxuICAvLyBBIFVSTCBzYWZlIHZhcmlhdGlvbiBvbiB0aGUgdGhlIGxpc3Qgb2YgQmFzZTY0IGNoYXJhY3RlcnMgXG4gIHZhciBiYXNlNjRDaGFycyA9ICdBQkNERUZHSElKS0xNTk9QUVJTVFVWV1hZWmFiY2RlZmdoaWprbG1ub3BxcnN0dXZ3eHl6MDEyMzQ1Njc4OS1fJztcblxuICB2YXIgYmFzZTY0SWQgPSBmdW5jdGlvbiBiYXNlNjRJZCgpIHtcbiAgICB2YXIgc3RyID0gJyc7XG5cbiAgICBmb3IgKHZhciBpID0gMDsgaSA8IDIyOyArK2kpIHtcbiAgICAgIHN0ciArPSBiYXNlNjRDaGFycy5jaGFyQXQoTWF0aC5mbG9vcihNYXRoLnJhbmRvbSgpICogNjQpKTtcbiAgICB9XG5cbiAgICByZXR1cm4gc3RyO1xuICB9O1xuXG4gIHZhciB2ZXJzaW9uID0gXCI2LjIuMFwiO1xuXG4gIHZhciBnZXRMYW5ndWFnZSA9IGZ1bmN0aW9uIGdldExhbmd1YWdlKCkge1xuICAgIHJldHVybiBuYXZpZ2F0b3IgJiYgKG5hdmlnYXRvci5sYW5ndWFnZXMgJiYgbmF2aWdhdG9yLmxhbmd1YWdlc1swXSB8fCBuYXZpZ2F0b3IubGFuZ3VhZ2UgfHwgbmF2aWdhdG9yLnVzZXJMYW5ndWFnZSkgfHwgJyc7XG4gIH07XG5cbiAgdmFyIGxhbmd1YWdlID0ge1xuICAgIGdldExhbmd1YWdlOiBnZXRMYW5ndWFnZVxuICB9O1xuXG4gIHZhciBwbGF0Zm9ybSA9ICdXZWInO1xuXG4gIHZhciBERUZBVUxUX09QVElPTlMgPSB7XG4gICAgYXBpRW5kcG9pbnQ6ICdhcGkuYW1wbGl0dWRlLmNvbScsXG4gICAgYmF0Y2hFdmVudHM6IGZhbHNlLFxuICAgIGNvb2tpZUV4cGlyYXRpb246IDM2NSAqIDEwLFxuICAgIGNvb2tpZU5hbWU6ICdhbXBsaXR1ZGVfaWQnLFxuICAgIC8vIHRoaXMgaXMgYSBkZXByZWNhdGVkIG9wdGlvblxuICAgIHNhbWVTaXRlQ29va2llOiAnTm9uZScsXG4gICAgY29va2llRm9yY2VVcGdyYWRlOiBmYWxzZSxcbiAgICBkZWZlckluaXRpYWxpemF0aW9uOiBmYWxzZSxcbiAgICBkaXNhYmxlQ29va2llczogZmFsc2UsXG4gICAgZGV2aWNlSWRGcm9tVXJsUGFyYW06IGZhbHNlLFxuICAgIGRvbWFpbjogJycsXG4gICAgZXZlbnRVcGxvYWRQZXJpb2RNaWxsaXM6IDMwICogMTAwMCxcbiAgICAvLyAzMHNcbiAgICBldmVudFVwbG9hZFRocmVzaG9sZDogMzAsXG4gICAgZm9yY2VIdHRwczogdHJ1ZSxcbiAgICBpbmNsdWRlR2NsaWQ6IGZhbHNlLFxuICAgIGluY2x1ZGVSZWZlcnJlcjogZmFsc2UsXG4gICAgaW5jbHVkZVV0bTogZmFsc2UsXG4gICAgbGFuZ3VhZ2U6IGxhbmd1YWdlLmdldExhbmd1YWdlKCksXG4gICAgbG9nTGV2ZWw6ICdXQVJOJyxcbiAgICBvcHRPdXQ6IGZhbHNlLFxuICAgIG9uRXJyb3I6IGZ1bmN0aW9uIG9uRXJyb3IoKSB7fSxcbiAgICBwbGF0Zm9ybTogcGxhdGZvcm0sXG4gICAgc2F2ZWRNYXhDb3VudDogMTAwMCxcbiAgICBzYXZlRXZlbnRzOiB0cnVlLFxuICAgIHNhdmVQYXJhbXNSZWZlcnJlck9uY2VQZXJTZXNzaW9uOiB0cnVlLFxuICAgIHNlY3VyZUNvb2tpZTogZmFsc2UsXG4gICAgc2Vzc2lvblRpbWVvdXQ6IDMwICogNjAgKiAxMDAwLFxuICAgIHRyYWNraW5nT3B0aW9uczoge1xuICAgICAgY2l0eTogdHJ1ZSxcbiAgICAgIGNvdW50cnk6IHRydWUsXG4gICAgICBjYXJyaWVyOiB0cnVlLFxuICAgICAgZGV2aWNlX21hbnVmYWN0dXJlcjogdHJ1ZSxcbiAgICAgIGRldmljZV9tb2RlbDogdHJ1ZSxcbiAgICAgIGRtYTogdHJ1ZSxcbiAgICAgIGlwX2FkZHJlc3M6IHRydWUsXG4gICAgICBsYW5ndWFnZTogdHJ1ZSxcbiAgICAgIG9zX25hbWU6IHRydWUsXG4gICAgICBvc192ZXJzaW9uOiB0cnVlLFxuICAgICAgcGxhdGZvcm06IHRydWUsXG4gICAgICByZWdpb246IHRydWUsXG4gICAgICB2ZXJzaW9uX25hbWU6IHRydWVcbiAgICB9LFxuICAgIHVuc2V0UGFyYW1zUmVmZXJyZXJPbk5ld1Nlc3Npb246IGZhbHNlLFxuICAgIHVuc2VudEtleTogJ2FtcGxpdHVkZV91bnNlbnQnLFxuICAgIHVuc2VudElkZW50aWZ5S2V5OiAnYW1wbGl0dWRlX3Vuc2VudF9pZGVudGlmeScsXG4gICAgdXBsb2FkQmF0Y2hTaXplOiAxMDBcbiAgfTtcblxuICB2YXIgQXN5bmNTdG9yYWdlO1xuICB2YXIgRGV2aWNlSW5mbztcbiAgLyoqXG4gICAqIEFtcGxpdHVkZUNsaWVudCBTREsgQVBJIC0gaW5zdGFuY2UgY29uc3RydWN0b3IuXG4gICAqIFRoZSBBbXBsaXR1ZGUgY2xhc3MgaGFuZGxlcyBjcmVhdGlvbiBvZiBjbGllbnQgaW5zdGFuY2VzLCBhbGwgeW91IG5lZWQgdG8gZG8gaXMgY2FsbCBhbXBsaXR1ZGUuZ2V0SW5zdGFuY2UoKVxuICAgKiBAY29uc3RydWN0b3IgQW1wbGl0dWRlQ2xpZW50XG4gICAqIEBwdWJsaWNcbiAgICogQGV4YW1wbGUgdmFyIGFtcGxpdHVkZUNsaWVudCA9IG5ldyBBbXBsaXR1ZGVDbGllbnQoKTtcbiAgICovXG5cblxuICB2YXIgQW1wbGl0dWRlQ2xpZW50ID0gZnVuY3Rpb24gQW1wbGl0dWRlQ2xpZW50KGluc3RhbmNlTmFtZSkge1xuICAgIHRoaXMuX2luc3RhbmNlTmFtZSA9IHV0aWxzLmlzRW1wdHlTdHJpbmcoaW5zdGFuY2VOYW1lKSA/IENvbnN0YW50cy5ERUZBVUxUX0lOU1RBTkNFIDogaW5zdGFuY2VOYW1lLnRvTG93ZXJDYXNlKCk7XG4gICAgdGhpcy5fdW5zZW50RXZlbnRzID0gW107XG4gICAgdGhpcy5fdW5zZW50SWRlbnRpZnlzID0gW107XG4gICAgdGhpcy5fdWEgPSBuZXcgdWFQYXJzZXIobmF2aWdhdG9yLnVzZXJBZ2VudCkuZ2V0UmVzdWx0KCk7XG4gICAgdGhpcy5vcHRpb25zID0gX29iamVjdFNwcmVhZCh7fSwgREVGQVVMVF9PUFRJT05TLCB7XG4gICAgICB0cmFja2luZ09wdGlvbnM6IF9vYmplY3RTcHJlYWQoe30sIERFRkFVTFRfT1BUSU9OUy50cmFja2luZ09wdGlvbnMpXG4gICAgfSk7XG4gICAgdGhpcy5jb29raWVTdG9yYWdlID0gbmV3IGNvb2tpZVN0b3JhZ2UoKS5nZXRTdG9yYWdlKCk7XG4gICAgdGhpcy5fcSA9IFtdOyAvLyBxdWV1ZSBmb3IgcHJveGllZCBmdW5jdGlvbnMgYmVmb3JlIHNjcmlwdCBsb2FkXG5cbiAgICB0aGlzLl9zZW5kaW5nID0gZmFsc2U7XG4gICAgdGhpcy5fdXBkYXRlU2NoZWR1bGVkID0gZmFsc2U7XG4gICAgdGhpcy5fb25Jbml0ID0gW107IC8vIGV2ZW50IG1ldGEgZGF0YVxuXG4gICAgdGhpcy5fZXZlbnRJZCA9IDA7XG4gICAgdGhpcy5faWRlbnRpZnlJZCA9IDA7XG4gICAgdGhpcy5fbGFzdEV2ZW50VGltZSA9IG51bGw7XG4gICAgdGhpcy5fbmV3U2Vzc2lvbiA9IGZhbHNlO1xuICAgIHRoaXMuX3NlcXVlbmNlTnVtYmVyID0gMDtcbiAgICB0aGlzLl9zZXNzaW9uSWQgPSBudWxsO1xuICAgIHRoaXMuX2lzSW5pdGlhbGl6ZWQgPSBmYWxzZTtcbiAgICB0aGlzLl91c2VyQWdlbnQgPSBuYXZpZ2F0b3IgJiYgbmF2aWdhdG9yLnVzZXJBZ2VudCB8fCBudWxsO1xuICB9O1xuXG4gIEFtcGxpdHVkZUNsaWVudC5wcm90b3R5cGUuSWRlbnRpZnkgPSBJZGVudGlmeTtcbiAgQW1wbGl0dWRlQ2xpZW50LnByb3RvdHlwZS5SZXZlbnVlID0gUmV2ZW51ZTtcbiAgLyoqXG4gICAqIEluaXRpYWxpemVzIHRoZSBBbXBsaXR1ZGUgSmF2YXNjcmlwdCBTREsgd2l0aCB5b3VyIGFwaUtleSBhbmQgYW55IG9wdGlvbmFsIGNvbmZpZ3VyYXRpb25zLlxuICAgKiBUaGlzIGlzIHJlcXVpcmVkIGJlZm9yZSBhbnkgb3RoZXIgbWV0aG9kcyBjYW4gYmUgY2FsbGVkLlxuICAgKiBAcHVibGljXG4gICAqIEBwYXJhbSB7c3RyaW5nfSBhcGlLZXkgLSBUaGUgQVBJIGtleSBmb3IgeW91ciBhcHAuXG4gICAqIEBwYXJhbSB7c3RyaW5nfSBvcHRfdXNlcklkIC0gKG9wdGlvbmFsKSBBbiBpZGVudGlmaWVyIGZvciB0aGlzIHVzZXIuXG4gICAqIEBwYXJhbSB7b2JqZWN0fSBvcHRfY29uZmlnIC0gKG9wdGlvbmFsKSBDb25maWd1cmF0aW9uIG9wdGlvbnMuXG4gICAqIFNlZSBbUmVhZG1lXXtAbGluayBodHRwczovL2dpdGh1Yi5jb20vYW1wbGl0dWRlL0FtcGxpdHVkZS1KYXZhc2NyaXB0I2NvbmZpZ3VyYXRpb24tb3B0aW9uc30gZm9yIGxpc3Qgb2Ygb3B0aW9ucyBhbmQgZGVmYXVsdCB2YWx1ZXMuXG4gICAqIEBwYXJhbSB7ZnVuY3Rpb259IG9wdF9jYWxsYmFjayAtIChvcHRpb25hbCkgUHJvdmlkZSBhIGNhbGxiYWNrIGZ1bmN0aW9uIHRvIHJ1biBhZnRlciBpbml0aWFsaXphdGlvbiBpcyBjb21wbGV0ZS5cbiAgICogQGV4YW1wbGUgYW1wbGl0dWRlQ2xpZW50LmluaXQoJ0FQSV9LRVknLCAnVVNFUl9JRCcsIHtpbmNsdWRlUmVmZXJyZXI6IHRydWUsIGluY2x1ZGVVdG06IHRydWV9LCBmdW5jdGlvbigpIHsgYWxlcnQoJ2luaXQgY29tcGxldGUnKTsgfSk7XG4gICAqL1xuXG4gIEFtcGxpdHVkZUNsaWVudC5wcm90b3R5cGUuaW5pdCA9IGZ1bmN0aW9uIGluaXQoYXBpS2V5LCBvcHRfdXNlcklkLCBvcHRfY29uZmlnLCBvcHRfY2FsbGJhY2spIHtcbiAgICB2YXIgX3RoaXMgPSB0aGlzO1xuXG4gICAgaWYgKHR5cGUoYXBpS2V5KSAhPT0gJ3N0cmluZycgfHwgdXRpbHMuaXNFbXB0eVN0cmluZyhhcGlLZXkpKSB7XG4gICAgICB1dGlscy5sb2cuZXJyb3IoJ0ludmFsaWQgYXBpS2V5LiBQbGVhc2UgcmUtaW5pdGlhbGl6ZSB3aXRoIGEgdmFsaWQgYXBpS2V5Jyk7XG4gICAgICByZXR1cm47XG4gICAgfVxuXG4gICAgdHJ5IHtcbiAgICAgIF9wYXJzZUNvbmZpZyh0aGlzLm9wdGlvbnMsIG9wdF9jb25maWcpO1xuXG4gICAgICBpZiAodGhpcy5vcHRpb25zLmNvb2tpZU5hbWUgIT09IERFRkFVTFRfT1BUSU9OUy5jb29raWVOYW1lKSB7XG4gICAgICAgIHV0aWxzLmxvZy53YXJuKCdUaGUgY29va2llTmFtZSBvcHRpb24gaXMgZGVwcmVjYXRlZC4gV2Ugd2lsbCBiZSBpZ25vcmluZyBpdCBmb3IgbmV3ZXIgY29va2llcycpO1xuICAgICAgfVxuXG4gICAgICB0aGlzLm9wdGlvbnMuYXBpS2V5ID0gYXBpS2V5O1xuICAgICAgdGhpcy5fc3RvcmFnZVN1ZmZpeCA9ICdfJyArIGFwaUtleSArICh0aGlzLl9pbnN0YW5jZU5hbWUgPT09IENvbnN0YW50cy5ERUZBVUxUX0lOU1RBTkNFID8gJycgOiAnXycgKyB0aGlzLl9pbnN0YW5jZU5hbWUpO1xuICAgICAgdGhpcy5fc3RvcmFnZVN1ZmZpeFY1ID0gYXBpS2V5LnNsaWNlKDAsIDYpO1xuICAgICAgdGhpcy5fb2xkQ29va2llbmFtZSA9IHRoaXMub3B0aW9ucy5jb29raWVOYW1lICsgdGhpcy5fc3RvcmFnZVN1ZmZpeDtcbiAgICAgIHRoaXMuX3Vuc2VudEtleSA9IHRoaXMub3B0aW9ucy51bnNlbnRLZXkgKyB0aGlzLl9zdG9yYWdlU3VmZml4O1xuICAgICAgdGhpcy5fdW5zZW50SWRlbnRpZnlLZXkgPSB0aGlzLm9wdGlvbnMudW5zZW50SWRlbnRpZnlLZXkgKyB0aGlzLl9zdG9yYWdlU3VmZml4O1xuICAgICAgdGhpcy5fY29va2llTmFtZSA9IENvbnN0YW50cy5DT09LSUVfUFJFRklYICsgJ18nICsgdGhpcy5fc3RvcmFnZVN1ZmZpeFY1O1xuICAgICAgdGhpcy5jb29raWVTdG9yYWdlLm9wdGlvbnMoe1xuICAgICAgICBleHBpcmF0aW9uRGF5czogdGhpcy5vcHRpb25zLmNvb2tpZUV4cGlyYXRpb24sXG4gICAgICAgIGRvbWFpbjogdGhpcy5vcHRpb25zLmRvbWFpbixcbiAgICAgICAgc2VjdXJlOiB0aGlzLm9wdGlvbnMuc2VjdXJlQ29va2llLFxuICAgICAgICBzYW1lU2l0ZTogdGhpcy5vcHRpb25zLnNhbWVTaXRlQ29va2llXG4gICAgICB9KTtcbiAgICAgIHRoaXMuX21ldGFkYXRhU3RvcmFnZSA9IG5ldyBNZXRhZGF0YVN0b3JhZ2Uoe1xuICAgICAgICBzdG9yYWdlS2V5OiB0aGlzLl9jb29raWVOYW1lLFxuICAgICAgICBkaXNhYmxlQ29va2llczogdGhpcy5vcHRpb25zLmRpc2FibGVDb29raWVzLFxuICAgICAgICBleHBpcmF0aW9uRGF5czogdGhpcy5vcHRpb25zLmNvb2tpZUV4cGlyYXRpb24sXG4gICAgICAgIGRvbWFpbjogdGhpcy5vcHRpb25zLmRvbWFpbixcbiAgICAgICAgc2VjdXJlOiB0aGlzLm9wdGlvbnMuc2VjdXJlQ29va2llLFxuICAgICAgICBzYW1lU2l0ZTogdGhpcy5vcHRpb25zLnNhbWVTaXRlQ29va2llXG4gICAgICB9KTtcbiAgICAgIHZhciBoYXNPbGRDb29raWUgPSAhIXRoaXMuY29va2llU3RvcmFnZS5nZXQodGhpcy5fb2xkQ29va2llbmFtZSk7XG4gICAgICB2YXIgaGFzTmV3Q29va2llID0gISF0aGlzLl9tZXRhZGF0YVN0b3JhZ2UubG9hZCgpO1xuICAgICAgdGhpcy5fdXNlT2xkQ29va2llID0gIWhhc05ld0Nvb2tpZSAmJiBoYXNPbGRDb29raWUgJiYgIXRoaXMub3B0aW9ucy5jb29raWVGb3JjZVVwZ3JhZGU7XG4gICAgICB2YXIgaGFzQ29va2llID0gaGFzTmV3Q29va2llIHx8IGhhc09sZENvb2tpZTtcbiAgICAgIHRoaXMub3B0aW9ucy5kb21haW4gPSB0aGlzLmNvb2tpZVN0b3JhZ2Uub3B0aW9ucygpLmRvbWFpbjtcblxuICAgICAgaWYgKHRoaXMub3B0aW9ucy5kZWZlckluaXRpYWxpemF0aW9uICYmICFoYXNDb29raWUpIHtcbiAgICAgICAgdGhpcy5fZGVmZXJJbml0aWFsaXphdGlvbihhcGlLZXksIG9wdF91c2VySWQsIG9wdF9jb25maWcsIG9wdF9jYWxsYmFjayk7XG5cbiAgICAgICAgcmV0dXJuO1xuICAgICAgfVxuXG4gICAgICBpZiAodHlwZSh0aGlzLm9wdGlvbnMubG9nTGV2ZWwpID09PSAnc3RyaW5nJykge1xuICAgICAgICB1dGlscy5zZXRMb2dMZXZlbCh0aGlzLm9wdGlvbnMubG9nTGV2ZWwpO1xuICAgICAgfVxuXG4gICAgICB2YXIgdHJhY2tpbmdPcHRpb25zID0gX2dlbmVyYXRlQXBpUHJvcGVydGllc1RyYWNraW5nQ29uZmlnKHRoaXMpO1xuXG4gICAgICB0aGlzLl9hcGlQcm9wZXJ0aWVzVHJhY2tpbmdPcHRpb25zID0gT2JqZWN0LmtleXModHJhY2tpbmdPcHRpb25zKS5sZW5ndGggPiAwID8ge1xuICAgICAgICB0cmFja2luZ19vcHRpb25zOiB0cmFja2luZ09wdGlvbnNcbiAgICAgIH0gOiB7fTtcblxuICAgICAgaWYgKHRoaXMub3B0aW9ucy5jb29raWVGb3JjZVVwZ3JhZGUgJiYgaGFzT2xkQ29va2llKSB7XG4gICAgICAgIGlmICghaGFzTmV3Q29va2llKSB7XG4gICAgICAgICAgX3VwZ3JhZGVDb29raWVEYXRhKHRoaXMpO1xuICAgICAgICB9XG5cbiAgICAgICAgdGhpcy5jb29raWVTdG9yYWdlLnJlbW92ZSh0aGlzLl9vbGRDb29raWVuYW1lKTtcbiAgICAgIH1cblxuICAgICAgX2xvYWRDb29raWVEYXRhKHRoaXMpO1xuXG4gICAgICB0aGlzLl9wZW5kaW5nUmVhZFN0b3JhZ2UgPSB0cnVlO1xuXG4gICAgICB2YXIgaW5pdEZyb21TdG9yYWdlID0gZnVuY3Rpb24gaW5pdEZyb21TdG9yYWdlKGRldmljZUlkKSB7XG4gICAgICAgIC8vIGxvYWQgZGV2aWNlSWQgYW5kIHVzZXJJZCBmcm9tIGlucHV0LCBvciB0cnkgdG8gZmV0Y2ggZXhpc3RpbmcgdmFsdWUgZnJvbSBjb29raWVcbiAgICAgICAgX3RoaXMub3B0aW9ucy5kZXZpY2VJZCA9IHR5cGUob3B0X2NvbmZpZykgPT09ICdvYmplY3QnICYmIHR5cGUob3B0X2NvbmZpZy5kZXZpY2VJZCkgPT09ICdzdHJpbmcnICYmICF1dGlscy5pc0VtcHR5U3RyaW5nKG9wdF9jb25maWcuZGV2aWNlSWQpICYmIG9wdF9jb25maWcuZGV2aWNlSWQgfHwgX3RoaXMub3B0aW9ucy5kZXZpY2VJZEZyb21VcmxQYXJhbSAmJiBfdGhpcy5fZ2V0RGV2aWNlSWRGcm9tVXJsUGFyYW0oX3RoaXMuX2dldFVybFBhcmFtcygpKSB8fCBfdGhpcy5vcHRpb25zLmRldmljZUlkIHx8IGRldmljZUlkIHx8IGJhc2U2NElkKCk7XG4gICAgICAgIF90aGlzLm9wdGlvbnMudXNlcklkID0gdHlwZShvcHRfdXNlcklkKSA9PT0gJ3N0cmluZycgJiYgIXV0aWxzLmlzRW1wdHlTdHJpbmcob3B0X3VzZXJJZCkgJiYgb3B0X3VzZXJJZCB8fCB0eXBlKG9wdF91c2VySWQpID09PSAnbnVtYmVyJyAmJiBvcHRfdXNlcklkLnRvU3RyaW5nKCkgfHwgX3RoaXMub3B0aW9ucy51c2VySWQgfHwgbnVsbDtcbiAgICAgICAgdmFyIG5vdyA9IG5ldyBEYXRlKCkuZ2V0VGltZSgpO1xuXG4gICAgICAgIGlmICghX3RoaXMuX3Nlc3Npb25JZCB8fCAhX3RoaXMuX2xhc3RFdmVudFRpbWUgfHwgbm93IC0gX3RoaXMuX2xhc3RFdmVudFRpbWUgPiBfdGhpcy5vcHRpb25zLnNlc3Npb25UaW1lb3V0KSB7XG4gICAgICAgICAgaWYgKF90aGlzLm9wdGlvbnMudW5zZXRQYXJhbXNSZWZlcnJlck9uTmV3U2Vzc2lvbikge1xuICAgICAgICAgICAgX3RoaXMuX3Vuc2V0VVRNUGFyYW1zKCk7XG4gICAgICAgICAgfVxuXG4gICAgICAgICAgX3RoaXMuX25ld1Nlc3Npb24gPSB0cnVlO1xuICAgICAgICAgIF90aGlzLl9zZXNzaW9uSWQgPSBub3c7IC8vIG9ubHkgY2FwdHVyZSBVVE0gcGFyYW1zIGFuZCByZWZlcnJlciBpZiBuZXcgc2Vzc2lvblxuXG4gICAgICAgICAgaWYgKF90aGlzLm9wdGlvbnMuc2F2ZVBhcmFtc1JlZmVycmVyT25jZVBlclNlc3Npb24pIHtcbiAgICAgICAgICAgIF90aGlzLl90cmFja1BhcmFtc0FuZFJlZmVycmVyKCk7XG4gICAgICAgICAgfVxuICAgICAgICB9XG5cbiAgICAgICAgaWYgKCFfdGhpcy5vcHRpb25zLnNhdmVQYXJhbXNSZWZlcnJlck9uY2VQZXJTZXNzaW9uKSB7XG4gICAgICAgICAgX3RoaXMuX3RyYWNrUGFyYW1zQW5kUmVmZXJyZXIoKTtcbiAgICAgICAgfSAvLyBsb2FkIHVuc2VudCBldmVudHMgYW5kIGlkZW50aWZpZXMgYmVmb3JlIGFueSBhdHRlbXB0IHRvIGxvZyBuZXcgb25lc1xuXG5cbiAgICAgICAgaWYgKF90aGlzLm9wdGlvbnMuc2F2ZUV2ZW50cykge1xuICAgICAgICAgIF92YWxpZGF0ZVVuc2VudEV2ZW50UXVldWUoX3RoaXMuX3Vuc2VudEV2ZW50cyk7XG5cbiAgICAgICAgICBfdmFsaWRhdGVVbnNlbnRFdmVudFF1ZXVlKF90aGlzLl91bnNlbnRJZGVudGlmeXMpO1xuICAgICAgICB9XG5cbiAgICAgICAgX3RoaXMuX2xhc3RFdmVudFRpbWUgPSBub3c7XG5cbiAgICAgICAgX3NhdmVDb29raWVEYXRhKF90aGlzKTtcblxuICAgICAgICBfdGhpcy5fcGVuZGluZ1JlYWRTdG9yYWdlID0gZmFsc2U7XG5cbiAgICAgICAgX3RoaXMuX3NlbmRFdmVudHNJZlJlYWR5KCk7IC8vIHRyeSBzZW5kaW5nIHVuc2VudCBldmVudHNcblxuXG4gICAgICAgIGZvciAodmFyIGkgPSAwOyBpIDwgX3RoaXMuX29uSW5pdC5sZW5ndGg7IGkrKykge1xuICAgICAgICAgIF90aGlzLl9vbkluaXRbaV0oX3RoaXMpO1xuICAgICAgICB9XG5cbiAgICAgICAgX3RoaXMuX29uSW5pdCA9IFtdO1xuICAgICAgICBfdGhpcy5faXNJbml0aWFsaXplZCA9IHRydWU7XG4gICAgICB9O1xuXG4gICAgICBpZiAoQXN5bmNTdG9yYWdlKSB7XG4gICAgICAgIHRoaXMuX21pZ3JhdGVVbnNlbnRFdmVudHMoZnVuY3Rpb24gKCkge1xuICAgICAgICAgIFByb21pc2UuYWxsKFtBc3luY1N0b3JhZ2UuZ2V0SXRlbShfdGhpcy5fc3RvcmFnZVN1ZmZpeCksIEFzeW5jU3RvcmFnZS5nZXRJdGVtKF90aGlzLm9wdGlvbnMudW5zZW50S2V5ICsgX3RoaXMuX3N0b3JhZ2VTdWZmaXgpLCBBc3luY1N0b3JhZ2UuZ2V0SXRlbShfdGhpcy5vcHRpb25zLnVuc2VudElkZW50aWZ5S2V5ICsgX3RoaXMuX3N0b3JhZ2VTdWZmaXgpXSkudGhlbihmdW5jdGlvbiAodmFsdWVzKSB7XG4gICAgICAgICAgICBpZiAodmFsdWVzWzBdKSB7XG4gICAgICAgICAgICAgIHZhciBjb29raWVEYXRhID0gSlNPTi5wYXJzZSh2YWx1ZXNbMF0pO1xuXG4gICAgICAgICAgICAgIGlmIChjb29raWVEYXRhKSB7XG4gICAgICAgICAgICAgICAgX2xvYWRDb29raWVEYXRhUHJvcHMoX3RoaXMsIGNvb2tpZURhdGEpO1xuICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIGlmIChfdGhpcy5vcHRpb25zLnNhdmVFdmVudHMpIHtcbiAgICAgICAgICAgICAgX3RoaXMuX3Vuc2VudEV2ZW50cyA9IF90aGlzLl9wYXJzZVNhdmVkVW5zZW50RXZlbnRzU3RyaW5nKHZhbHVlc1sxXSkubWFwKGZ1bmN0aW9uIChldmVudCkge1xuICAgICAgICAgICAgICAgIHJldHVybiB7XG4gICAgICAgICAgICAgICAgICBldmVudDogZXZlbnRcbiAgICAgICAgICAgICAgICB9O1xuICAgICAgICAgICAgICB9KS5jb25jYXQoX3RoaXMuX3Vuc2VudEV2ZW50cyk7XG4gICAgICAgICAgICAgIF90aGlzLl91bnNlbnRJZGVudGlmeXMgPSBfdGhpcy5fcGFyc2VTYXZlZFVuc2VudEV2ZW50c1N0cmluZyh2YWx1ZXNbMl0pLm1hcChmdW5jdGlvbiAoZXZlbnQpIHtcbiAgICAgICAgICAgICAgICByZXR1cm4ge1xuICAgICAgICAgICAgICAgICAgZXZlbnQ6IGV2ZW50XG4gICAgICAgICAgICAgICAgfTtcbiAgICAgICAgICAgICAgfSkuY29uY2F0KF90aGlzLl91bnNlbnRJZGVudGlmeXMpO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICBpZiAoRGV2aWNlSW5mbykge1xuICAgICAgICAgICAgICBQcm9taXNlLmFsbChbRGV2aWNlSW5mby5nZXRDYXJyaWVyKCksIERldmljZUluZm8uZ2V0TW9kZWwoKSwgRGV2aWNlSW5mby5nZXRNYW51ZmFjdHVyZXIoKSwgRGV2aWNlSW5mby5nZXRWZXJzaW9uKCksIERldmljZUluZm8uZ2V0VW5pcXVlSWQoKV0pLnRoZW4oZnVuY3Rpb24gKHZhbHVlcykge1xuICAgICAgICAgICAgICAgIF90aGlzLmRldmljZUluZm8gPSB7XG4gICAgICAgICAgICAgICAgICBjYXJyaWVyOiB2YWx1ZXNbMF0sXG4gICAgICAgICAgICAgICAgICBtb2RlbDogdmFsdWVzWzFdLFxuICAgICAgICAgICAgICAgICAgbWFudWZhY3R1cmVyOiB2YWx1ZXNbMl0sXG4gICAgICAgICAgICAgICAgICB2ZXJzaW9uOiB2YWx1ZXNbM11cbiAgICAgICAgICAgICAgICB9O1xuICAgICAgICAgICAgICAgIGluaXRGcm9tU3RvcmFnZSh2YWx1ZXNbNF0pO1xuXG4gICAgICAgICAgICAgICAgX3RoaXMucnVuUXVldWVkRnVuY3Rpb25zKCk7XG5cbiAgICAgICAgICAgICAgICBpZiAodHlwZShvcHRfY2FsbGJhY2spID09PSAnZnVuY3Rpb24nKSB7XG4gICAgICAgICAgICAgICAgICBvcHRfY2FsbGJhY2soX3RoaXMpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgfSkuY2F0Y2goZnVuY3Rpb24gKGVycikge1xuICAgICAgICAgICAgICAgIF90aGlzLm9wdGlvbnMub25FcnJvcihlcnIpO1xuICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgIGluaXRGcm9tU3RvcmFnZSgpO1xuXG4gICAgICAgICAgICAgIF90aGlzLnJ1blF1ZXVlZEZ1bmN0aW9ucygpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgIH0pLmNhdGNoKGZ1bmN0aW9uIChlcnIpIHtcbiAgICAgICAgICAgIF90aGlzLm9wdGlvbnMub25FcnJvcihlcnIpO1xuICAgICAgICAgIH0pO1xuICAgICAgICB9KTtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIGlmICh0aGlzLm9wdGlvbnMuc2F2ZUV2ZW50cykge1xuICAgICAgICAgIHRoaXMuX3Vuc2VudEV2ZW50cyA9IHRoaXMuX2xvYWRTYXZlZFVuc2VudEV2ZW50cyh0aGlzLm9wdGlvbnMudW5zZW50S2V5KS5tYXAoZnVuY3Rpb24gKGV2ZW50KSB7XG4gICAgICAgICAgICByZXR1cm4ge1xuICAgICAgICAgICAgICBldmVudDogZXZlbnRcbiAgICAgICAgICAgIH07XG4gICAgICAgICAgfSkuY29uY2F0KHRoaXMuX3Vuc2VudEV2ZW50cyk7XG4gICAgICAgICAgdGhpcy5fdW5zZW50SWRlbnRpZnlzID0gdGhpcy5fbG9hZFNhdmVkVW5zZW50RXZlbnRzKHRoaXMub3B0aW9ucy51bnNlbnRJZGVudGlmeUtleSkubWFwKGZ1bmN0aW9uIChldmVudCkge1xuICAgICAgICAgICAgcmV0dXJuIHtcbiAgICAgICAgICAgICAgZXZlbnQ6IGV2ZW50XG4gICAgICAgICAgICB9O1xuICAgICAgICAgIH0pLmNvbmNhdCh0aGlzLl91bnNlbnRJZGVudGlmeXMpO1xuICAgICAgICB9XG5cbiAgICAgICAgaW5pdEZyb21TdG9yYWdlKCk7XG4gICAgICAgIHRoaXMucnVuUXVldWVkRnVuY3Rpb25zKCk7XG5cbiAgICAgICAgaWYgKHR5cGUob3B0X2NhbGxiYWNrKSA9PT0gJ2Z1bmN0aW9uJykge1xuICAgICAgICAgIG9wdF9jYWxsYmFjayh0aGlzKTtcbiAgICAgICAgfVxuICAgICAgfVxuICAgIH0gY2F0Y2ggKGVycikge1xuICAgICAgdXRpbHMubG9nLmVycm9yKGVycik7XG4gICAgICB0aGlzLm9wdGlvbnMub25FcnJvcihlcnIpO1xuICAgIH1cbiAgfTsgLy8gdmFsaWRhdGUgcHJvcGVydGllcyBmb3IgdW5zZW50IGV2ZW50c1xuXG5cbiAgdmFyIF92YWxpZGF0ZVVuc2VudEV2ZW50UXVldWUgPSBmdW5jdGlvbiBfdmFsaWRhdGVVbnNlbnRFdmVudFF1ZXVlKHF1ZXVlKSB7XG4gICAgZm9yICh2YXIgaSA9IDA7IGkgPCBxdWV1ZS5sZW5ndGg7IGkrKykge1xuICAgICAgdmFyIHVzZXJQcm9wZXJ0aWVzID0gcXVldWVbaV0uZXZlbnQudXNlcl9wcm9wZXJ0aWVzO1xuICAgICAgdmFyIGV2ZW50UHJvcGVydGllcyA9IHF1ZXVlW2ldLmV2ZW50LmV2ZW50X3Byb3BlcnRpZXM7XG4gICAgICB2YXIgZ3JvdXBzID0gcXVldWVbaV0uZXZlbnQuZ3JvdXBzO1xuICAgICAgcXVldWVbaV0uZXZlbnQudXNlcl9wcm9wZXJ0aWVzID0gdXRpbHMudmFsaWRhdGVQcm9wZXJ0aWVzKHVzZXJQcm9wZXJ0aWVzKTtcbiAgICAgIHF1ZXVlW2ldLmV2ZW50LmV2ZW50X3Byb3BlcnRpZXMgPSB1dGlscy52YWxpZGF0ZVByb3BlcnRpZXMoZXZlbnRQcm9wZXJ0aWVzKTtcbiAgICAgIHF1ZXVlW2ldLmV2ZW50Lmdyb3VwcyA9IHV0aWxzLnZhbGlkYXRlR3JvdXBzKGdyb3Vwcyk7XG4gICAgfVxuICB9O1xuICAvKipcbiAgICogQHByaXZhdGVcbiAgICovXG5cblxuICBBbXBsaXR1ZGVDbGllbnQucHJvdG90eXBlLl9taWdyYXRlVW5zZW50RXZlbnRzID0gZnVuY3Rpb24gX21pZ3JhdGVVbnNlbnRFdmVudHMoY2IpIHtcbiAgICB2YXIgX3RoaXMyID0gdGhpcztcblxuICAgIFByb21pc2UuYWxsKFtBc3luY1N0b3JhZ2UuZ2V0SXRlbSh0aGlzLm9wdGlvbnMudW5zZW50S2V5KSwgQXN5bmNTdG9yYWdlLmdldEl0ZW0odGhpcy5vcHRpb25zLnVuc2VudElkZW50aWZ5S2V5KV0pLnRoZW4oZnVuY3Rpb24gKHZhbHVlcykge1xuICAgICAgaWYgKF90aGlzMi5vcHRpb25zLnNhdmVFdmVudHMpIHtcbiAgICAgICAgdmFyIHVuc2VudEV2ZW50c1N0cmluZyA9IHZhbHVlc1swXTtcbiAgICAgICAgdmFyIHVuc2VudElkZW50aWZ5S2V5ID0gdmFsdWVzWzFdO1xuICAgICAgICB2YXIgaXRlbXNUb1NldCA9IFtdO1xuICAgICAgICB2YXIgaXRlbXNUb1JlbW92ZSA9IFtdO1xuXG4gICAgICAgIGlmICghIXVuc2VudEV2ZW50c1N0cmluZykge1xuICAgICAgICAgIGl0ZW1zVG9TZXQucHVzaChBc3luY1N0b3JhZ2Uuc2V0SXRlbShfdGhpczIub3B0aW9ucy51bnNlbnRLZXkgKyBfdGhpczIuX3N0b3JhZ2VTdWZmaXgsIEpTT04uc3RyaW5naWZ5KHVuc2VudEV2ZW50c1N0cmluZykpKTtcbiAgICAgICAgICBpdGVtc1RvUmVtb3ZlLnB1c2goQXN5bmNTdG9yYWdlLnJlbW92ZUl0ZW0oX3RoaXMyLm9wdGlvbnMudW5zZW50S2V5KSk7XG4gICAgICAgIH1cblxuICAgICAgICBpZiAoISF1bnNlbnRJZGVudGlmeUtleSkge1xuICAgICAgICAgIGl0ZW1zVG9TZXQucHVzaChBc3luY1N0b3JhZ2Uuc2V0SXRlbShfdGhpczIub3B0aW9ucy51bnNlbnRJZGVudGlmeUtleSArIF90aGlzMi5fc3RvcmFnZVN1ZmZpeCwgSlNPTi5zdHJpbmdpZnkodW5zZW50SWRlbnRpZnlLZXkpKSk7XG4gICAgICAgICAgaXRlbXNUb1JlbW92ZS5wdXNoKEFzeW5jU3RvcmFnZS5yZW1vdmVJdGVtKF90aGlzMi5vcHRpb25zLnVuc2VudElkZW50aWZ5S2V5KSk7XG4gICAgICAgIH1cblxuICAgICAgICBpZiAoaXRlbXNUb1NldC5sZW5ndGggPiAwKSB7XG4gICAgICAgICAgUHJvbWlzZS5hbGwoaXRlbXNUb1NldCkudGhlbihmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgfSkuY2F0Y2goZnVuY3Rpb24gKGVycikge1xuICAgICAgICAgICAgX3RoaXMyLm9wdGlvbnMub25FcnJvcihlcnIpO1xuICAgICAgICAgIH0pO1xuICAgICAgICB9XG4gICAgICB9XG4gICAgfSkudGhlbihjYikuY2F0Y2goZnVuY3Rpb24gKGVycikge1xuICAgICAgX3RoaXMyLm9wdGlvbnMub25FcnJvcihlcnIpO1xuICAgIH0pO1xuICB9O1xuICAvKipcbiAgICogQHByaXZhdGVcbiAgICovXG5cblxuICBBbXBsaXR1ZGVDbGllbnQucHJvdG90eXBlLl90cmFja1BhcmFtc0FuZFJlZmVycmVyID0gZnVuY3Rpb24gX3RyYWNrUGFyYW1zQW5kUmVmZXJyZXIoKSB7XG4gICAgaWYgKHRoaXMub3B0aW9ucy5pbmNsdWRlVXRtKSB7XG4gICAgICB0aGlzLl9pbml0VXRtRGF0YSgpO1xuICAgIH1cblxuICAgIGlmICh0aGlzLm9wdGlvbnMuaW5jbHVkZVJlZmVycmVyKSB7XG4gICAgICB0aGlzLl9zYXZlUmVmZXJyZXIodGhpcy5fZ2V0UmVmZXJyZXIoKSk7XG4gICAgfVxuXG4gICAgaWYgKHRoaXMub3B0aW9ucy5pbmNsdWRlR2NsaWQpIHtcbiAgICAgIHRoaXMuX3NhdmVHY2xpZCh0aGlzLl9nZXRVcmxQYXJhbXMoKSk7XG4gICAgfVxuICB9O1xuICAvKipcbiAgICogUGFyc2UgYW5kIHZhbGlkYXRlIHVzZXIgc3BlY2lmaWVkIGNvbmZpZyB2YWx1ZXMgYW5kIG92ZXJ3cml0ZSBleGlzdGluZyBvcHRpb24gdmFsdWVcbiAgICogREVGQVVMVF9PUFRJT05TIHByb3ZpZGVzIGxpc3Qgb2YgYWxsIGNvbmZpZyBrZXlzIHRoYXQgYXJlIG1vZGlmaWFibGUsIGFzIHdlbGwgYXMgZXhwZWN0ZWQgdHlwZXMgZm9yIHZhbHVlc1xuICAgKiBAcHJpdmF0ZVxuICAgKi9cblxuXG4gIHZhciBfcGFyc2VDb25maWcgPSBmdW5jdGlvbiBfcGFyc2VDb25maWcob3B0aW9ucywgY29uZmlnKSB7XG4gICAgaWYgKHR5cGUoY29uZmlnKSAhPT0gJ29iamVjdCcpIHtcbiAgICAgIHJldHVybjtcbiAgICB9IC8vIHZhbGlkYXRlcyBjb25maWcgdmFsdWUgaXMgZGVmaW5lZCwgaXMgdGhlIGNvcnJlY3QgdHlwZSwgYW5kIHNvbWUgYWRkaXRpb25hbCB2YWx1ZSBzYW5pdHkgY2hlY2tzXG5cblxuICAgIHZhciBwYXJzZVZhbGlkYXRlQW5kTG9hZCA9IGZ1bmN0aW9uIHBhcnNlVmFsaWRhdGVBbmRMb2FkKGtleSkge1xuICAgICAgaWYgKCFvcHRpb25zLmhhc093blByb3BlcnR5KGtleSkpIHtcbiAgICAgICAgcmV0dXJuOyAvLyBza2lwIGJvZ3VzIGNvbmZpZyB2YWx1ZXNcbiAgICAgIH1cblxuICAgICAgdmFyIGlucHV0VmFsdWUgPSBjb25maWdba2V5XTtcbiAgICAgIHZhciBleHBlY3RlZFR5cGUgPSB0eXBlKG9wdGlvbnNba2V5XSk7XG5cbiAgICAgIGlmICghdXRpbHMudmFsaWRhdGVJbnB1dChpbnB1dFZhbHVlLCBrZXkgKyAnIG9wdGlvbicsIGV4cGVjdGVkVHlwZSkpIHtcbiAgICAgICAgcmV0dXJuO1xuICAgICAgfVxuXG4gICAgICBpZiAoZXhwZWN0ZWRUeXBlID09PSAnYm9vbGVhbicpIHtcbiAgICAgICAgb3B0aW9uc1trZXldID0gISFpbnB1dFZhbHVlO1xuICAgICAgfSBlbHNlIGlmIChleHBlY3RlZFR5cGUgPT09ICdzdHJpbmcnICYmICF1dGlscy5pc0VtcHR5U3RyaW5nKGlucHV0VmFsdWUpIHx8IGV4cGVjdGVkVHlwZSA9PT0gJ251bWJlcicgJiYgaW5wdXRWYWx1ZSA+IDApIHtcbiAgICAgICAgb3B0aW9uc1trZXldID0gaW5wdXRWYWx1ZTtcbiAgICAgIH0gZWxzZSBpZiAoZXhwZWN0ZWRUeXBlID09PSAnb2JqZWN0Jykge1xuICAgICAgICBfcGFyc2VDb25maWcob3B0aW9uc1trZXldLCBpbnB1dFZhbHVlKTtcbiAgICAgIH1cbiAgICB9O1xuXG4gICAgZm9yICh2YXIga2V5IGluIGNvbmZpZykge1xuICAgICAgaWYgKGNvbmZpZy5oYXNPd25Qcm9wZXJ0eShrZXkpKSB7XG4gICAgICAgIHBhcnNlVmFsaWRhdGVBbmRMb2FkKGtleSk7XG4gICAgICB9XG4gICAgfVxuICB9O1xuICAvKipcbiAgICogUnVuIGZ1bmN0aW9ucyBxdWV1ZWQgdXAgYnkgcHJveHkgbG9hZGluZyBzbmlwcGV0XG4gICAqIEBwcml2YXRlXG4gICAqL1xuXG5cbiAgQW1wbGl0dWRlQ2xpZW50LnByb3RvdHlwZS5ydW5RdWV1ZWRGdW5jdGlvbnMgPSBmdW5jdGlvbiAoKSB7XG4gICAgdmFyIHF1ZXVlID0gdGhpcy5fcTtcbiAgICB0aGlzLl9xID0gW107XG5cbiAgICBmb3IgKHZhciBpID0gMDsgaSA8IHF1ZXVlLmxlbmd0aDsgaSsrKSB7XG4gICAgICB2YXIgZm4gPSB0aGlzW3F1ZXVlW2ldWzBdXTtcblxuICAgICAgaWYgKHR5cGUoZm4pID09PSAnZnVuY3Rpb24nKSB7XG4gICAgICAgIGZuLmFwcGx5KHRoaXMsIHF1ZXVlW2ldLnNsaWNlKDEpKTtcbiAgICAgIH1cbiAgICB9XG4gIH07XG4gIC8qKlxuICAgKiBDaGVjayB0aGF0IHRoZSBhcGlLZXkgaXMgc2V0IGJlZm9yZSBjYWxsaW5nIGEgZnVuY3Rpb24uIExvZ3MgYSB3YXJuaW5nIG1lc3NhZ2UgaWYgbm90IHNldC5cbiAgICogQHByaXZhdGVcbiAgICovXG5cblxuICBBbXBsaXR1ZGVDbGllbnQucHJvdG90eXBlLl9hcGlLZXlTZXQgPSBmdW5jdGlvbiBfYXBpS2V5U2V0KG1ldGhvZE5hbWUpIHtcbiAgICBpZiAodXRpbHMuaXNFbXB0eVN0cmluZyh0aGlzLm9wdGlvbnMuYXBpS2V5KSkge1xuICAgICAgdXRpbHMubG9nLmVycm9yKCdJbnZhbGlkIGFwaUtleS4gUGxlYXNlIHNldCBhIHZhbGlkIGFwaUtleSB3aXRoIGluaXQoKSBiZWZvcmUgY2FsbGluZyAnICsgbWV0aG9kTmFtZSk7XG4gICAgICByZXR1cm4gZmFsc2U7XG4gICAgfVxuXG4gICAgcmV0dXJuIHRydWU7XG4gIH07XG4gIC8qKlxuICAgKiBMb2FkIHNhdmVkIGV2ZW50cyBmcm9tIGxvY2FsU3RvcmFnZS4gSlNPTiBkZXNlcmlhbGl6ZXMgZXZlbnQgYXJyYXkuIEhhbmRsZXMgY2FzZSB3aGVyZSBzdHJpbmcgaXMgY29ycnVwdGVkLlxuICAgKiBAcHJpdmF0ZVxuICAgKi9cblxuXG4gIEFtcGxpdHVkZUNsaWVudC5wcm90b3R5cGUuX2xvYWRTYXZlZFVuc2VudEV2ZW50cyA9IGZ1bmN0aW9uIF9sb2FkU2F2ZWRVbnNlbnRFdmVudHModW5zZW50S2V5KSB7XG4gICAgdmFyIHNhdmVkVW5zZW50RXZlbnRzU3RyaW5nID0gdGhpcy5fZ2V0RnJvbVN0b3JhZ2UobG9jYWxTdG9yYWdlJDEsIHVuc2VudEtleSk7XG5cbiAgICB2YXIgdW5zZW50RXZlbnRzID0gdGhpcy5fcGFyc2VTYXZlZFVuc2VudEV2ZW50c1N0cmluZyhzYXZlZFVuc2VudEV2ZW50c1N0cmluZywgdW5zZW50S2V5KTtcblxuICAgIHRoaXMuX3NldEluU3RvcmFnZShsb2NhbFN0b3JhZ2UkMSwgdW5zZW50S2V5LCBKU09OLnN0cmluZ2lmeSh1bnNlbnRFdmVudHMpKTtcblxuICAgIHJldHVybiB1bnNlbnRFdmVudHM7XG4gIH07XG4gIC8qKlxuICAgKiBMb2FkIHNhdmVkIGV2ZW50cyBmcm9tIGxvY2FsU3RvcmFnZS4gSlNPTiBkZXNlcmlhbGl6ZXMgZXZlbnQgYXJyYXkuIEhhbmRsZXMgY2FzZSB3aGVyZSBzdHJpbmcgaXMgY29ycnVwdGVkLlxuICAgKiBAcHJpdmF0ZVxuICAgKi9cblxuXG4gIEFtcGxpdHVkZUNsaWVudC5wcm90b3R5cGUuX3BhcnNlU2F2ZWRVbnNlbnRFdmVudHNTdHJpbmcgPSBmdW5jdGlvbiBfcGFyc2VTYXZlZFVuc2VudEV2ZW50c1N0cmluZyhzYXZlZFVuc2VudEV2ZW50c1N0cmluZywgdW5zZW50S2V5KSB7XG4gICAgaWYgKHV0aWxzLmlzRW1wdHlTdHJpbmcoc2F2ZWRVbnNlbnRFdmVudHNTdHJpbmcpKSB7XG4gICAgICByZXR1cm4gW107IC8vIG5ldyBhcHAsIGRvZXMgbm90IGhhdmUgYW55IHNhdmVkIGV2ZW50c1xuICAgIH1cblxuICAgIGlmICh0eXBlKHNhdmVkVW5zZW50RXZlbnRzU3RyaW5nKSA9PT0gJ3N0cmluZycpIHtcbiAgICAgIHRyeSB7XG4gICAgICAgIHZhciBldmVudHMgPSBKU09OLnBhcnNlKHNhdmVkVW5zZW50RXZlbnRzU3RyaW5nKTtcblxuICAgICAgICBpZiAodHlwZShldmVudHMpID09PSAnYXJyYXknKSB7XG4gICAgICAgICAgLy8gaGFuZGxlIGNhc2Ugd2hlcmUgSlNPTiBkdW1waW5nIG9mIHVuc2VudCBldmVudHMgaXMgY29ycnVwdGVkXG4gICAgICAgICAgcmV0dXJuIGV2ZW50cztcbiAgICAgICAgfVxuICAgICAgfSBjYXRjaCAoZSkge31cbiAgICB9XG5cbiAgICB1dGlscy5sb2cuZXJyb3IoJ1VuYWJsZSB0byBsb2FkICcgKyB1bnNlbnRLZXkgKyAnIGV2ZW50cy4gUmVzdGFydCB3aXRoIGEgbmV3IGVtcHR5IHF1ZXVlLicpO1xuICAgIHJldHVybiBbXTtcbiAgfTtcbiAgLyoqXG4gICAqIFJldHVybnMgdHJ1ZSBpZiBhIG5ldyBzZXNzaW9uIHdhcyBjcmVhdGVkIGR1cmluZyBpbml0aWFsaXphdGlvbiwgb3RoZXJ3aXNlIGZhbHNlLlxuICAgKiBAcHVibGljXG4gICAqIEByZXR1cm4ge2Jvb2xlYW59IFdoZXRoZXIgYSBuZXcgc2Vzc2lvbiB3YXMgY3JlYXRlZCBkdXJpbmcgaW5pdGlhbGl6YXRpb24uXG4gICAqL1xuXG5cbiAgQW1wbGl0dWRlQ2xpZW50LnByb3RvdHlwZS5pc05ld1Nlc3Npb24gPSBmdW5jdGlvbiBpc05ld1Nlc3Npb24oKSB7XG4gICAgcmV0dXJuIHRoaXMuX25ld1Nlc3Npb247XG4gIH07XG4gIC8qKlxuICAgKiBTdG9yZSBjYWxsYmFja3MgdG8gY2FsbCBhZnRlciBpbml0XG4gICAqIEBwcml2YXRlXG4gICAqL1xuXG5cbiAgQW1wbGl0dWRlQ2xpZW50LnByb3RvdHlwZS5vbkluaXQgPSBmdW5jdGlvbiAoY2FsbGJhY2spIHtcbiAgICBpZiAodGhpcy5faXNJbml0aWFsaXplZCkge1xuICAgICAgY2FsbGJhY2soKTtcbiAgICB9IGVsc2Uge1xuICAgICAgdGhpcy5fb25Jbml0LnB1c2goY2FsbGJhY2spO1xuICAgIH1cbiAgfTtcbiAgLyoqXG4gICAqIFJldHVybnMgdGhlIGlkIG9mIHRoZSBjdXJyZW50IHNlc3Npb24uXG4gICAqIEBwdWJsaWNcbiAgICogQHJldHVybiB7bnVtYmVyfSBJZCBvZiB0aGUgY3VycmVudCBzZXNzaW9uLlxuICAgKi9cblxuXG4gIEFtcGxpdHVkZUNsaWVudC5wcm90b3R5cGUuZ2V0U2Vzc2lvbklkID0gZnVuY3Rpb24gZ2V0U2Vzc2lvbklkKCkge1xuICAgIHJldHVybiB0aGlzLl9zZXNzaW9uSWQ7XG4gIH07XG4gIC8qKlxuICAgKiBJbmNyZW1lbnRzIHRoZSBldmVudElkIGFuZCByZXR1cm5zIGl0LlxuICAgKiBAcHJpdmF0ZVxuICAgKi9cblxuXG4gIEFtcGxpdHVkZUNsaWVudC5wcm90b3R5cGUubmV4dEV2ZW50SWQgPSBmdW5jdGlvbiBuZXh0RXZlbnRJZCgpIHtcbiAgICB0aGlzLl9ldmVudElkKys7XG4gICAgcmV0dXJuIHRoaXMuX2V2ZW50SWQ7XG4gIH07XG4gIC8qKlxuICAgKiBJbmNyZW1lbnRzIHRoZSBpZGVudGlmeUlkIGFuZCByZXR1cm5zIGl0LlxuICAgKiBAcHJpdmF0ZVxuICAgKi9cblxuXG4gIEFtcGxpdHVkZUNsaWVudC5wcm90b3R5cGUubmV4dElkZW50aWZ5SWQgPSBmdW5jdGlvbiBuZXh0SWRlbnRpZnlJZCgpIHtcbiAgICB0aGlzLl9pZGVudGlmeUlkKys7XG4gICAgcmV0dXJuIHRoaXMuX2lkZW50aWZ5SWQ7XG4gIH07XG4gIC8qKlxuICAgKiBJbmNyZW1lbnRzIHRoZSBzZXF1ZW5jZU51bWJlciBhbmQgcmV0dXJucyBpdC5cbiAgICogQHByaXZhdGVcbiAgICovXG5cblxuICBBbXBsaXR1ZGVDbGllbnQucHJvdG90eXBlLm5leHRTZXF1ZW5jZU51bWJlciA9IGZ1bmN0aW9uIG5leHRTZXF1ZW5jZU51bWJlcigpIHtcbiAgICB0aGlzLl9zZXF1ZW5jZU51bWJlcisrO1xuICAgIHJldHVybiB0aGlzLl9zZXF1ZW5jZU51bWJlcjtcbiAgfTtcbiAgLyoqXG4gICAqIFJldHVybnMgdGhlIHRvdGFsIGNvdW50IG9mIHVuc2VudCBldmVudHMgYW5kIGlkZW50aWZ5c1xuICAgKiBAcHJpdmF0ZVxuICAgKi9cblxuXG4gIEFtcGxpdHVkZUNsaWVudC5wcm90b3R5cGUuX3Vuc2VudENvdW50ID0gZnVuY3Rpb24gX3Vuc2VudENvdW50KCkge1xuICAgIHJldHVybiB0aGlzLl91bnNlbnRFdmVudHMubGVuZ3RoICsgdGhpcy5fdW5zZW50SWRlbnRpZnlzLmxlbmd0aDtcbiAgfTtcbiAgLyoqXG4gICAqIFNlbmQgZXZlbnRzIGlmIHJlYWR5LiBSZXR1cm5zIHRydWUgaWYgZXZlbnRzIGFyZSBzZW50LlxuICAgKiBAcHJpdmF0ZVxuICAgKi9cblxuXG4gIEFtcGxpdHVkZUNsaWVudC5wcm90b3R5cGUuX3NlbmRFdmVudHNJZlJlYWR5ID0gZnVuY3Rpb24gX3NlbmRFdmVudHNJZlJlYWR5KCkge1xuICAgIGlmICh0aGlzLl91bnNlbnRDb3VudCgpID09PSAwKSB7XG4gICAgICByZXR1cm4gZmFsc2U7XG4gICAgfSAvLyBpZiBiYXRjaGluZyBkaXNhYmxlZCwgc2VuZCBhbnkgdW5zZW50IGV2ZW50cyBpbW1lZGlhdGVseVxuXG5cbiAgICBpZiAoIXRoaXMub3B0aW9ucy5iYXRjaEV2ZW50cykge1xuICAgICAgdGhpcy5zZW5kRXZlbnRzKCk7XG4gICAgICByZXR1cm4gdHJ1ZTtcbiAgICB9IC8vIGlmIGJhdGNoaW5nIGVuYWJsZWQsIGNoZWNrIGlmIG1pbiB0aHJlc2hvbGQgbWV0IGZvciBiYXRjaCBzaXplXG5cblxuICAgIGlmICh0aGlzLl91bnNlbnRDb3VudCgpID49IHRoaXMub3B0aW9ucy5ldmVudFVwbG9hZFRocmVzaG9sZCkge1xuICAgICAgdGhpcy5zZW5kRXZlbnRzKCk7XG4gICAgICByZXR1cm4gdHJ1ZTtcbiAgICB9IC8vIG90aGVyd2lzZSBzY2hlZHVsZSBhbiB1cGxvYWQgYWZ0ZXIgMzBzXG5cblxuICAgIGlmICghdGhpcy5fdXBkYXRlU2NoZWR1bGVkKSB7XG4gICAgICAvLyBtYWtlIHN1cmUgd2Ugb25seSBzY2hlZHVsZSAxIHVwbG9hZFxuICAgICAgdGhpcy5fdXBkYXRlU2NoZWR1bGVkID0gdHJ1ZTtcbiAgICAgIHNldFRpbWVvdXQoZnVuY3Rpb24gKCkge1xuICAgICAgICB0aGlzLl91cGRhdGVTY2hlZHVsZWQgPSBmYWxzZTtcbiAgICAgICAgdGhpcy5zZW5kRXZlbnRzKCk7XG4gICAgICB9LmJpbmQodGhpcyksIHRoaXMub3B0aW9ucy5ldmVudFVwbG9hZFBlcmlvZE1pbGxpcyk7XG4gICAgfVxuXG4gICAgcmV0dXJuIGZhbHNlOyAvLyBhbiB1cGxvYWQgd2FzIHNjaGVkdWxlZCwgbm8gZXZlbnRzIHdlcmUgdXBsb2FkZWRcbiAgfTtcbiAgLyoqXG4gICAqIEhlbHBlciBmdW5jdGlvbiB0byBmZXRjaCB2YWx1ZXMgZnJvbSBzdG9yYWdlXG4gICAqIFN0b3JhZ2UgYXJndW1lbnQgYWxsb3dzIGZvciBsb2NhbFN0b3Jhb2dlIGFuZCBzZXNzaW9uU3RvcmFvZ2VcbiAgICogQHByaXZhdGVcbiAgICovXG5cblxuICBBbXBsaXR1ZGVDbGllbnQucHJvdG90eXBlLl9nZXRGcm9tU3RvcmFnZSA9IGZ1bmN0aW9uIF9nZXRGcm9tU3RvcmFnZShzdG9yYWdlLCBrZXkpIHtcbiAgICByZXR1cm4gc3RvcmFnZS5nZXRJdGVtKGtleSArIHRoaXMuX3N0b3JhZ2VTdWZmaXgpO1xuICB9O1xuICAvKipcbiAgICogSGVscGVyIGZ1bmN0aW9uIHRvIHNldCB2YWx1ZXMgaW4gc3RvcmFnZVxuICAgKiBTdG9yYWdlIGFyZ3VtZW50IGFsbG93cyBmb3IgbG9jYWxTdG9yYW9nZSBhbmQgc2Vzc2lvblN0b3Jhb2dlXG4gICAqIEBwcml2YXRlXG4gICAqL1xuXG5cbiAgQW1wbGl0dWRlQ2xpZW50LnByb3RvdHlwZS5fc2V0SW5TdG9yYWdlID0gZnVuY3Rpb24gX3NldEluU3RvcmFnZShzdG9yYWdlLCBrZXksIHZhbHVlKSB7XG4gICAgc3RvcmFnZS5zZXRJdGVtKGtleSArIHRoaXMuX3N0b3JhZ2VTdWZmaXgsIHZhbHVlKTtcbiAgfTtcbiAgLyoqXG4gICAqIEZldGNoZXMgZGV2aWNlSWQsIHVzZXJJZCwgZXZlbnQgbWV0YSBkYXRhIGZyb20gYW1wbGl0dWRlIGNvb2tpZVxuICAgKiBAcHJpdmF0ZVxuICAgKi9cblxuXG4gIHZhciBfbG9hZENvb2tpZURhdGEgPSBmdW5jdGlvbiBfbG9hZENvb2tpZURhdGEoc2NvcGUpIHtcbiAgICBpZiAoIXNjb3BlLl91c2VPbGRDb29raWUpIHtcbiAgICAgIHZhciBwcm9wcyA9IHNjb3BlLl9tZXRhZGF0YVN0b3JhZ2UubG9hZCgpO1xuXG4gICAgICBpZiAodHlwZShwcm9wcykgPT09ICdvYmplY3QnKSB7XG4gICAgICAgIF9sb2FkQ29va2llRGF0YVByb3BzKHNjb3BlLCBwcm9wcyk7XG4gICAgICB9XG5cbiAgICAgIHJldHVybjtcbiAgICB9XG5cbiAgICB2YXIgY29va2llRGF0YSA9IHNjb3BlLmNvb2tpZVN0b3JhZ2UuZ2V0KHNjb3BlLl9vbGRDb29raWVuYW1lKTtcblxuICAgIGlmICh0eXBlKGNvb2tpZURhdGEpID09PSAnb2JqZWN0Jykge1xuICAgICAgX2xvYWRDb29raWVEYXRhUHJvcHMoc2NvcGUsIGNvb2tpZURhdGEpO1xuXG4gICAgICByZXR1cm47XG4gICAgfVxuICB9O1xuXG4gIHZhciBfdXBncmFkZUNvb2tpZURhdGEgPSBmdW5jdGlvbiBfdXBncmFkZUNvb2tpZURhdGEoc2NvcGUpIHtcbiAgICB2YXIgY29va2llRGF0YSA9IHNjb3BlLmNvb2tpZVN0b3JhZ2UuZ2V0KHNjb3BlLl9vbGRDb29raWVuYW1lKTtcblxuICAgIGlmICh0eXBlKGNvb2tpZURhdGEpID09PSAnb2JqZWN0Jykge1xuICAgICAgX2xvYWRDb29raWVEYXRhUHJvcHMoc2NvcGUsIGNvb2tpZURhdGEpO1xuXG4gICAgICBfc2F2ZUNvb2tpZURhdGEoc2NvcGUpO1xuICAgIH1cbiAgfTtcblxuICB2YXIgX2xvYWRDb29raWVEYXRhUHJvcHMgPSBmdW5jdGlvbiBfbG9hZENvb2tpZURhdGFQcm9wcyhzY29wZSwgY29va2llRGF0YSkge1xuICAgIGlmIChjb29raWVEYXRhLmRldmljZUlkKSB7XG4gICAgICBzY29wZS5vcHRpb25zLmRldmljZUlkID0gY29va2llRGF0YS5kZXZpY2VJZDtcbiAgICB9XG5cbiAgICBpZiAoY29va2llRGF0YS51c2VySWQpIHtcbiAgICAgIHNjb3BlLm9wdGlvbnMudXNlcklkID0gY29va2llRGF0YS51c2VySWQ7XG4gICAgfVxuXG4gICAgaWYgKGNvb2tpZURhdGEub3B0T3V0ICE9PSBudWxsICYmIGNvb2tpZURhdGEub3B0T3V0ICE9PSB1bmRlZmluZWQpIHtcbiAgICAgIC8vIERvIG5vdCBjbG9iYmVyIGNvbmZpZyBvcHQgb3V0IHZhbHVlIGlmIGNvb2tpZURhdGEgaGFzIG9wdE91dCBhcyBmYWxzZVxuICAgICAgaWYgKGNvb2tpZURhdGEub3B0T3V0ICE9PSBmYWxzZSkge1xuICAgICAgICBzY29wZS5vcHRpb25zLm9wdE91dCA9IGNvb2tpZURhdGEub3B0T3V0O1xuICAgICAgfVxuICAgIH1cblxuICAgIGlmIChjb29raWVEYXRhLnNlc3Npb25JZCkge1xuICAgICAgc2NvcGUuX3Nlc3Npb25JZCA9IHBhcnNlSW50KGNvb2tpZURhdGEuc2Vzc2lvbklkLCAxMCk7XG4gICAgfVxuXG4gICAgaWYgKGNvb2tpZURhdGEubGFzdEV2ZW50VGltZSkge1xuICAgICAgc2NvcGUuX2xhc3RFdmVudFRpbWUgPSBwYXJzZUludChjb29raWVEYXRhLmxhc3RFdmVudFRpbWUsIDEwKTtcbiAgICB9XG5cbiAgICBpZiAoY29va2llRGF0YS5ldmVudElkKSB7XG4gICAgICBzY29wZS5fZXZlbnRJZCA9IHBhcnNlSW50KGNvb2tpZURhdGEuZXZlbnRJZCwgMTApO1xuICAgIH1cblxuICAgIGlmIChjb29raWVEYXRhLmlkZW50aWZ5SWQpIHtcbiAgICAgIHNjb3BlLl9pZGVudGlmeUlkID0gcGFyc2VJbnQoY29va2llRGF0YS5pZGVudGlmeUlkLCAxMCk7XG4gICAgfVxuXG4gICAgaWYgKGNvb2tpZURhdGEuc2VxdWVuY2VOdW1iZXIpIHtcbiAgICAgIHNjb3BlLl9zZXF1ZW5jZU51bWJlciA9IHBhcnNlSW50KGNvb2tpZURhdGEuc2VxdWVuY2VOdW1iZXIsIDEwKTtcbiAgICB9XG4gIH07XG4gIC8qKlxuICAgKiBTYXZlcyBkZXZpY2VJZCwgdXNlcklkLCBldmVudCBtZXRhIGRhdGEgdG8gYW1wbGl0dWRlIGNvb2tpZVxuICAgKiBAcHJpdmF0ZVxuICAgKi9cblxuXG4gIHZhciBfc2F2ZUNvb2tpZURhdGEgPSBmdW5jdGlvbiBfc2F2ZUNvb2tpZURhdGEoc2NvcGUpIHtcbiAgICB2YXIgY29va2llRGF0YSA9IHtcbiAgICAgIGRldmljZUlkOiBzY29wZS5vcHRpb25zLmRldmljZUlkLFxuICAgICAgdXNlcklkOiBzY29wZS5vcHRpb25zLnVzZXJJZCxcbiAgICAgIG9wdE91dDogc2NvcGUub3B0aW9ucy5vcHRPdXQsXG4gICAgICBzZXNzaW9uSWQ6IHNjb3BlLl9zZXNzaW9uSWQsXG4gICAgICBsYXN0RXZlbnRUaW1lOiBzY29wZS5fbGFzdEV2ZW50VGltZSxcbiAgICAgIGV2ZW50SWQ6IHNjb3BlLl9ldmVudElkLFxuICAgICAgaWRlbnRpZnlJZDogc2NvcGUuX2lkZW50aWZ5SWQsXG4gICAgICBzZXF1ZW5jZU51bWJlcjogc2NvcGUuX3NlcXVlbmNlTnVtYmVyXG4gICAgfTtcblxuICAgIGlmIChBc3luY1N0b3JhZ2UpIHtcbiAgICAgIEFzeW5jU3RvcmFnZS5zZXRJdGVtKHNjb3BlLl9zdG9yYWdlU3VmZml4LCBKU09OLnN0cmluZ2lmeShjb29raWVEYXRhKSk7XG4gICAgfVxuXG4gICAgaWYgKHNjb3BlLl91c2VPbGRDb29raWUpIHtcbiAgICAgIHNjb3BlLmNvb2tpZVN0b3JhZ2Uuc2V0KHNjb3BlLm9wdGlvbnMuY29va2llTmFtZSArIHNjb3BlLl9zdG9yYWdlU3VmZml4LCBjb29raWVEYXRhKTtcbiAgICB9IGVsc2Uge1xuICAgICAgc2NvcGUuX21ldGFkYXRhU3RvcmFnZS5zYXZlKGNvb2tpZURhdGEpO1xuICAgIH1cbiAgfTtcbiAgLyoqXG4gICAqIFBhcnNlIHRoZSB1dG0gcHJvcGVydGllcyBvdXQgb2YgY29va2llcyBhbmQgcXVlcnkgZm9yIGFkZGluZyB0byB1c2VyIHByb3BlcnRpZXMuXG4gICAqIEBwcml2YXRlXG4gICAqL1xuXG5cbiAgQW1wbGl0dWRlQ2xpZW50LnByb3RvdHlwZS5faW5pdFV0bURhdGEgPSBmdW5jdGlvbiBfaW5pdFV0bURhdGEocXVlcnlQYXJhbXMsIGNvb2tpZVBhcmFtcykge1xuICAgIHF1ZXJ5UGFyYW1zID0gcXVlcnlQYXJhbXMgfHwgdGhpcy5fZ2V0VXJsUGFyYW1zKCk7XG4gICAgY29va2llUGFyYW1zID0gY29va2llUGFyYW1zIHx8IHRoaXMuY29va2llU3RvcmFnZS5nZXQoJ19fdXRteicpO1xuICAgIHZhciB1dG1Qcm9wZXJ0aWVzID0gZ2V0VXRtRGF0YShjb29raWVQYXJhbXMsIHF1ZXJ5UGFyYW1zKTtcblxuICAgIF9zZW5kUGFyYW1zUmVmZXJyZXJVc2VyUHJvcGVydGllcyh0aGlzLCB1dG1Qcm9wZXJ0aWVzKTtcbiAgfTtcbiAgLyoqXG4gICAqIFVuc2V0IHRoZSB1dG0gcGFyYW1zIGZyb20gdGhlIEFtcGxpdHVkZSBpbnN0YW5jZSBhbmQgdXBkYXRlIHRoZSBpZGVudGlmeS5cbiAgICogQHByaXZhdGVcbiAgICovXG5cblxuICBBbXBsaXR1ZGVDbGllbnQucHJvdG90eXBlLl91bnNldFVUTVBhcmFtcyA9IGZ1bmN0aW9uIF91bnNldFVUTVBhcmFtcygpIHtcbiAgICB2YXIgaWRlbnRpZnkgPSBuZXcgSWRlbnRpZnkoKTtcbiAgICBpZGVudGlmeS51bnNldChDb25zdGFudHMuUkVGRVJSRVIpO1xuICAgIGlkZW50aWZ5LnVuc2V0KENvbnN0YW50cy5VVE1fU09VUkNFKTtcbiAgICBpZGVudGlmeS51bnNldChDb25zdGFudHMuVVRNX01FRElVTSk7XG4gICAgaWRlbnRpZnkudW5zZXQoQ29uc3RhbnRzLlVUTV9DQU1QQUlHTik7XG4gICAgaWRlbnRpZnkudW5zZXQoQ29uc3RhbnRzLlVUTV9URVJNKTtcbiAgICBpZGVudGlmeS51bnNldChDb25zdGFudHMuVVRNX0NPTlRFTlQpO1xuICAgIHRoaXMuaWRlbnRpZnkoaWRlbnRpZnkpO1xuICB9O1xuICAvKipcbiAgICogVGhlIGNhbGxpbmcgZnVuY3Rpb24gc2hvdWxkIGRldGVybWluZSB3aGVuIGl0IGlzIGFwcHJvcHJpYXRlIHRvIHNlbmQgdGhlc2UgdXNlciBwcm9wZXJ0aWVzLiBUaGlzIGZ1bmN0aW9uXG4gICAqIHdpbGwgbm8gbG9uZ2VyIGNvbnRhaW4gYW55IHNlc3Npb24gc3RvcmFnZSBjaGVja2luZyBsb2dpYy5cbiAgICogQHByaXZhdGVcbiAgICovXG5cblxuICB2YXIgX3NlbmRQYXJhbXNSZWZlcnJlclVzZXJQcm9wZXJ0aWVzID0gZnVuY3Rpb24gX3NlbmRQYXJhbXNSZWZlcnJlclVzZXJQcm9wZXJ0aWVzKHNjb3BlLCB1c2VyUHJvcGVydGllcykge1xuICAgIGlmICh0eXBlKHVzZXJQcm9wZXJ0aWVzKSAhPT0gJ29iamVjdCcgfHwgT2JqZWN0LmtleXModXNlclByb3BlcnRpZXMpLmxlbmd0aCA9PT0gMCkge1xuICAgICAgcmV0dXJuO1xuICAgIH0gLy8gc2V0T25jZSB0aGUgaW5pdGlhbCB1c2VyIHByb3BlcnRpZXNcblxuXG4gICAgdmFyIGlkZW50aWZ5ID0gbmV3IElkZW50aWZ5KCk7XG5cbiAgICBmb3IgKHZhciBrZXkgaW4gdXNlclByb3BlcnRpZXMpIHtcbiAgICAgIGlmICh1c2VyUHJvcGVydGllcy5oYXNPd25Qcm9wZXJ0eShrZXkpKSB7XG4gICAgICAgIGlkZW50aWZ5LnNldE9uY2UoJ2luaXRpYWxfJyArIGtleSwgdXNlclByb3BlcnRpZXNba2V5XSk7XG4gICAgICAgIGlkZW50aWZ5LnNldChrZXksIHVzZXJQcm9wZXJ0aWVzW2tleV0pO1xuICAgICAgfVxuICAgIH1cblxuICAgIHNjb3BlLmlkZW50aWZ5KGlkZW50aWZ5KTtcbiAgfTtcbiAgLyoqXG4gICAqIEBwcml2YXRlXG4gICAqL1xuXG5cbiAgQW1wbGl0dWRlQ2xpZW50LnByb3RvdHlwZS5fZ2V0UmVmZXJyZXIgPSBmdW5jdGlvbiBfZ2V0UmVmZXJyZXIoKSB7XG4gICAgcmV0dXJuIGRvY3VtZW50LnJlZmVycmVyO1xuICB9O1xuICAvKipcbiAgICogQHByaXZhdGVcbiAgICovXG5cblxuICBBbXBsaXR1ZGVDbGllbnQucHJvdG90eXBlLl9nZXRVcmxQYXJhbXMgPSBmdW5jdGlvbiBfZ2V0VXJsUGFyYW1zKCkge1xuICAgIHJldHVybiBsb2NhdGlvbi5zZWFyY2g7XG4gIH07XG4gIC8qKlxuICAgKiBUcnkgdG8gZmV0Y2ggR29vZ2xlIEdjbGlkIGZyb20gdXJsIHBhcmFtcy5cbiAgICogQHByaXZhdGVcbiAgICovXG5cblxuICBBbXBsaXR1ZGVDbGllbnQucHJvdG90eXBlLl9zYXZlR2NsaWQgPSBmdW5jdGlvbiBfc2F2ZUdjbGlkKHVybFBhcmFtcykge1xuICAgIHZhciBnY2xpZCA9IHV0aWxzLmdldFF1ZXJ5UGFyYW0oJ2djbGlkJywgdXJsUGFyYW1zKTtcblxuICAgIGlmICh1dGlscy5pc0VtcHR5U3RyaW5nKGdjbGlkKSkge1xuICAgICAgcmV0dXJuO1xuICAgIH1cblxuICAgIHZhciBnY2xpZFByb3BlcnRpZXMgPSB7XG4gICAgICAnZ2NsaWQnOiBnY2xpZFxuICAgIH07XG5cbiAgICBfc2VuZFBhcmFtc1JlZmVycmVyVXNlclByb3BlcnRpZXModGhpcywgZ2NsaWRQcm9wZXJ0aWVzKTtcbiAgfTtcbiAgLyoqXG4gICAqIFRyeSB0byBmZXRjaCBBbXBsaXR1ZGUgZGV2aWNlIGlkIGZyb20gdXJsIHBhcmFtcy5cbiAgICogQHByaXZhdGVcbiAgICovXG5cblxuICBBbXBsaXR1ZGVDbGllbnQucHJvdG90eXBlLl9nZXREZXZpY2VJZEZyb21VcmxQYXJhbSA9IGZ1bmN0aW9uIF9nZXREZXZpY2VJZEZyb21VcmxQYXJhbSh1cmxQYXJhbXMpIHtcbiAgICByZXR1cm4gdXRpbHMuZ2V0UXVlcnlQYXJhbShDb25zdGFudHMuQU1QX0RFVklDRV9JRF9QQVJBTSwgdXJsUGFyYW1zKTtcbiAgfTtcbiAgLyoqXG4gICAqIFBhcnNlIHRoZSBkb21haW4gZnJvbSByZWZlcnJlciBpbmZvXG4gICAqIEBwcml2YXRlXG4gICAqL1xuXG5cbiAgQW1wbGl0dWRlQ2xpZW50LnByb3RvdHlwZS5fZ2V0UmVmZXJyaW5nRG9tYWluID0gZnVuY3Rpb24gX2dldFJlZmVycmluZ0RvbWFpbihyZWZlcnJlcikge1xuICAgIGlmICh1dGlscy5pc0VtcHR5U3RyaW5nKHJlZmVycmVyKSkge1xuICAgICAgcmV0dXJuIG51bGw7XG4gICAgfVxuXG4gICAgdmFyIHBhcnRzID0gcmVmZXJyZXIuc3BsaXQoJy8nKTtcblxuICAgIGlmIChwYXJ0cy5sZW5ndGggPj0gMykge1xuICAgICAgcmV0dXJuIHBhcnRzWzJdO1xuICAgIH1cblxuICAgIHJldHVybiBudWxsO1xuICB9O1xuICAvKipcbiAgICogRmV0Y2ggdGhlIHJlZmVycmVyIGluZm9ybWF0aW9uLCBwYXJzZSB0aGUgZG9tYWluIGFuZCBzZW5kLlxuICAgKiBTaW5jZSB1c2VyIHByb3BlcnRpZXMgYXJlIHByb3BhZ2F0ZWQgb24gdGhlIHNlcnZlciwgb25seSBzZW5kIG9uY2UgcGVyIHNlc3Npb24sIGRvbid0IG5lZWQgdG8gc2VuZCB3aXRoIGV2ZXJ5IGV2ZW50XG4gICAqIEBwcml2YXRlXG4gICAqL1xuXG5cbiAgQW1wbGl0dWRlQ2xpZW50LnByb3RvdHlwZS5fc2F2ZVJlZmVycmVyID0gZnVuY3Rpb24gX3NhdmVSZWZlcnJlcihyZWZlcnJlcikge1xuICAgIGlmICh1dGlscy5pc0VtcHR5U3RyaW5nKHJlZmVycmVyKSkge1xuICAgICAgcmV0dXJuO1xuICAgIH1cblxuICAgIHZhciByZWZlcnJlckluZm8gPSB7XG4gICAgICAncmVmZXJyZXInOiByZWZlcnJlcixcbiAgICAgICdyZWZlcnJpbmdfZG9tYWluJzogdGhpcy5fZ2V0UmVmZXJyaW5nRG9tYWluKHJlZmVycmVyKVxuICAgIH07XG5cbiAgICBfc2VuZFBhcmFtc1JlZmVycmVyVXNlclByb3BlcnRpZXModGhpcywgcmVmZXJyZXJJbmZvKTtcbiAgfTtcbiAgLyoqXG4gICAqIFNhdmVzIHVuc2VudCBldmVudHMgYW5kIGlkZW50aWZpZXMgdG8gbG9jYWxTdG9yYWdlLiBKU09OIHN0cmluZ2lmaWVzIGV2ZW50IHF1ZXVlcyBiZWZvcmUgc2F2aW5nLlxuICAgKiBOb3RlOiB0aGlzIGlzIGNhbGxlZCBhdXRvbWF0aWNhbGx5IGV2ZXJ5IHRpbWUgZXZlbnRzIGFyZSBsb2dnZWQsIHVubGVzcyB5b3UgZXhwbGljaXRseSBzZXQgb3B0aW9uIHNhdmVFdmVudHMgdG8gZmFsc2UuXG4gICAqIEBwcml2YXRlXG4gICAqL1xuXG5cbiAgQW1wbGl0dWRlQ2xpZW50LnByb3RvdHlwZS5zYXZlRXZlbnRzID0gZnVuY3Rpb24gc2F2ZUV2ZW50cygpIHtcbiAgICB0cnkge1xuICAgICAgdmFyIHNlcmlhbGl6ZWRVbnNlbnRFdmVudHMgPSBKU09OLnN0cmluZ2lmeSh0aGlzLl91bnNlbnRFdmVudHMubWFwKGZ1bmN0aW9uIChfcmVmKSB7XG4gICAgICAgIHZhciBldmVudCA9IF9yZWYuZXZlbnQ7XG4gICAgICAgIHJldHVybiBldmVudDtcbiAgICAgIH0pKTtcblxuICAgICAgaWYgKEFzeW5jU3RvcmFnZSkge1xuICAgICAgICBBc3luY1N0b3JhZ2Uuc2V0SXRlbSh0aGlzLm9wdGlvbnMudW5zZW50S2V5ICsgdGhpcy5fc3RvcmFnZVN1ZmZpeCwgc2VyaWFsaXplZFVuc2VudEV2ZW50cyk7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICB0aGlzLl9zZXRJblN0b3JhZ2UobG9jYWxTdG9yYWdlJDEsIHRoaXMub3B0aW9ucy51bnNlbnRLZXksIHNlcmlhbGl6ZWRVbnNlbnRFdmVudHMpO1xuICAgICAgfVxuICAgIH0gY2F0Y2ggKGUpIHt9XG5cbiAgICB0cnkge1xuICAgICAgdmFyIHNlcmlhbGl6ZWRJZGVudGlmeXMgPSBKU09OLnN0cmluZ2lmeSh0aGlzLl91bnNlbnRJZGVudGlmeXMubWFwKGZ1bmN0aW9uICh1bnNlbnRJZGVudGlmeSkge1xuICAgICAgICByZXR1cm4gdW5zZW50SWRlbnRpZnkuZXZlbnQ7XG4gICAgICB9KSk7XG5cbiAgICAgIGlmIChBc3luY1N0b3JhZ2UpIHtcbiAgICAgICAgQXN5bmNTdG9yYWdlLnNldEl0ZW0odGhpcy5vcHRpb25zLnVuc2VudElkZW50aWZ5S2V5ICsgdGhpcy5fc3RvcmFnZVN1ZmZpeCwgc2VyaWFsaXplZElkZW50aWZ5cyk7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICB0aGlzLl9zZXRJblN0b3JhZ2UobG9jYWxTdG9yYWdlJDEsIHRoaXMub3B0aW9ucy51bnNlbnRJZGVudGlmeUtleSwgc2VyaWFsaXplZElkZW50aWZ5cyk7XG4gICAgICB9XG4gICAgfSBjYXRjaCAoZSkge31cbiAgfTtcbiAgLyoqXG4gICAqIFNldHMgYSBjdXN0b21lciBkb21haW4gZm9yIHRoZSBhbXBsaXR1ZGUgY29va2llLiBVc2VmdWwgaWYgeW91IHdhbnQgdG8gc3VwcG9ydCBjcm9zcy1zdWJkb21haW4gdHJhY2tpbmcuXG4gICAqIEBwdWJsaWNcbiAgICogQHBhcmFtIHtzdHJpbmd9IGRvbWFpbiB0byBzZXQuXG4gICAqIEBleGFtcGxlIGFtcGxpdHVkZUNsaWVudC5zZXREb21haW4oJy5hbXBsaXR1ZGUuY29tJyk7XG4gICAqL1xuXG5cbiAgQW1wbGl0dWRlQ2xpZW50LnByb3RvdHlwZS5zZXREb21haW4gPSBmdW5jdGlvbiBzZXREb21haW4oZG9tYWluKSB7XG4gICAgaWYgKHRoaXMuX3Nob3VsZERlZmVyQ2FsbCgpKSB7XG4gICAgICByZXR1cm4gdGhpcy5fcS5wdXNoKFsnc2V0RG9tYWluJ10uY29uY2F0KEFycmF5LnByb3RvdHlwZS5zbGljZS5jYWxsKGFyZ3VtZW50cywgMCkpKTtcbiAgICB9XG5cbiAgICBpZiAoIXV0aWxzLnZhbGlkYXRlSW5wdXQoZG9tYWluLCAnZG9tYWluJywgJ3N0cmluZycpKSB7XG4gICAgICByZXR1cm47XG4gICAgfVxuXG4gICAgdHJ5IHtcbiAgICAgIHRoaXMuY29va2llU3RvcmFnZS5vcHRpb25zKHtcbiAgICAgICAgZXhwaXJhdGlvbkRheXM6IHRoaXMub3B0aW9ucy5jb29raWVFeHBpcmF0aW9uLFxuICAgICAgICBzZWN1cmU6IHRoaXMub3B0aW9ucy5zZWN1cmVDb29raWUsXG4gICAgICAgIGRvbWFpbjogZG9tYWluLFxuICAgICAgICBzYW1lU2l0ZTogdGhpcy5vcHRpb25zLnNhbWVTaXRlQ29va2llXG4gICAgICB9KTtcbiAgICAgIHRoaXMub3B0aW9ucy5kb21haW4gPSB0aGlzLmNvb2tpZVN0b3JhZ2Uub3B0aW9ucygpLmRvbWFpbjtcblxuICAgICAgX2xvYWRDb29raWVEYXRhKHRoaXMpO1xuXG4gICAgICBfc2F2ZUNvb2tpZURhdGEodGhpcyk7XG4gICAgfSBjYXRjaCAoZSkge1xuICAgICAgdXRpbHMubG9nLmVycm9yKGUpO1xuICAgIH1cbiAgfTtcbiAgLyoqXG4gICAqIFNldHMgYW4gaWRlbnRpZmllciBmb3IgdGhlIGN1cnJlbnQgdXNlci5cbiAgICogQHB1YmxpY1xuICAgKiBAcGFyYW0ge3N0cmluZ30gdXNlcklkIC0gaWRlbnRpZmllciB0byBzZXQuIENhbiBiZSBudWxsLlxuICAgKiBAZXhhbXBsZSBhbXBsaXR1ZGVDbGllbnQuc2V0VXNlcklkKCdqb2VAZ21haWwuY29tJyk7XG4gICAqL1xuXG5cbiAgQW1wbGl0dWRlQ2xpZW50LnByb3RvdHlwZS5zZXRVc2VySWQgPSBmdW5jdGlvbiBzZXRVc2VySWQodXNlcklkKSB7XG4gICAgaWYgKHRoaXMuX3Nob3VsZERlZmVyQ2FsbCgpKSB7XG4gICAgICByZXR1cm4gdGhpcy5fcS5wdXNoKFsnc2V0VXNlcklkJ10uY29uY2F0KEFycmF5LnByb3RvdHlwZS5zbGljZS5jYWxsKGFyZ3VtZW50cywgMCkpKTtcbiAgICB9XG5cbiAgICB0cnkge1xuICAgICAgdGhpcy5vcHRpb25zLnVzZXJJZCA9IHVzZXJJZCAhPT0gdW5kZWZpbmVkICYmIHVzZXJJZCAhPT0gbnVsbCAmJiAnJyArIHVzZXJJZCB8fCBudWxsO1xuXG4gICAgICBfc2F2ZUNvb2tpZURhdGEodGhpcyk7XG4gICAgfSBjYXRjaCAoZSkge1xuICAgICAgdXRpbHMubG9nLmVycm9yKGUpO1xuICAgIH1cbiAgfTtcbiAgLyoqXG4gICAqIEFkZCB1c2VyIHRvIGEgZ3JvdXAgb3IgZ3JvdXBzLiBZb3UgbmVlZCB0byBzcGVjaWZ5IGEgZ3JvdXBUeXBlIGFuZCBncm91cE5hbWUocykuXG4gICAqIEZvciBleGFtcGxlIHlvdSBjYW4gZ3JvdXAgcGVvcGxlIGJ5IHRoZWlyIG9yZ2FuaXphdGlvbi5cbiAgICogSW4gdGhhdCBjYXNlIGdyb3VwVHlwZSBpcyBcIm9yZ0lkXCIgYW5kIGdyb3VwTmFtZSB3b3VsZCBiZSB0aGUgYWN0dWFsIElEKHMpLlxuICAgKiBncm91cE5hbWUgY2FuIGJlIGEgc3RyaW5nIG9yIGFuIGFycmF5IG9mIHN0cmluZ3MgdG8gaW5kaWNhdGUgYSB1c2VyIGluIG11bHRpcGxlIGdydXVwcy5cbiAgICogWW91IGNhbiBhbHNvIGNhbGwgc2V0R3JvdXAgbXVsdGlwbGUgdGltZXMgd2l0aCBkaWZmZXJlbnQgZ3JvdXBUeXBlcyB0byB0cmFjayBtdWx0aXBsZSB0eXBlcyBvZiBncm91cHMgKHVwIHRvIDUgcGVyIGFwcCkuXG4gICAqIE5vdGU6IHRoaXMgd2lsbCBhbHNvIHNldCBncm91cFR5cGU6IGdyb3VwTmFtZSBhcyBhIHVzZXIgcHJvcGVydHkuXG4gICAqIFNlZSB0aGUgW1NESyBSZWFkbWVde0BsaW5rIGh0dHBzOi8vZ2l0aHViLmNvbS9hbXBsaXR1ZGUvQW1wbGl0dWRlLUphdmFzY3JpcHQjc2V0dGluZy1ncm91cHN9IGZvciBtb3JlIGluZm9ybWF0aW9uLlxuICAgKiBAcHVibGljXG4gICAqIEBwYXJhbSB7c3RyaW5nfSBncm91cFR5cGUgLSB0aGUgZ3JvdXAgdHlwZSAoZXg6IG9yZ0lkKVxuICAgKiBAcGFyYW0ge3N0cmluZ3xsaXN0fSBncm91cE5hbWUgLSB0aGUgbmFtZSBvZiB0aGUgZ3JvdXAgKGV4OiAxNSksIG9yIGEgbGlzdCBvZiBuYW1lcyBvZiB0aGUgZ3JvdXBzXG4gICAqIEBleGFtcGxlIGFtcGxpdHVkZUNsaWVudC5zZXRHcm91cCgnb3JnSWQnLCAxNSk7IC8vIHRoaXMgYWRkcyB0aGUgY3VycmVudCB1c2VyIHRvIG9yZ0lkIDE1LlxuICAgKi9cblxuXG4gIEFtcGxpdHVkZUNsaWVudC5wcm90b3R5cGUuc2V0R3JvdXAgPSBmdW5jdGlvbiAoZ3JvdXBUeXBlLCBncm91cE5hbWUpIHtcbiAgICBpZiAodGhpcy5fc2hvdWxkRGVmZXJDYWxsKCkpIHtcbiAgICAgIHJldHVybiB0aGlzLl9xLnB1c2goWydzZXRHcm91cCddLmNvbmNhdChBcnJheS5wcm90b3R5cGUuc2xpY2UuY2FsbChhcmd1bWVudHMsIDApKSk7XG4gICAgfVxuXG4gICAgaWYgKCF0aGlzLl9hcGlLZXlTZXQoJ3NldEdyb3VwKCknKSB8fCAhdXRpbHMudmFsaWRhdGVJbnB1dChncm91cFR5cGUsICdncm91cFR5cGUnLCAnc3RyaW5nJykgfHwgdXRpbHMuaXNFbXB0eVN0cmluZyhncm91cFR5cGUpKSB7XG4gICAgICByZXR1cm47XG4gICAgfVxuXG4gICAgdmFyIGdyb3VwcyA9IHt9O1xuICAgIGdyb3Vwc1tncm91cFR5cGVdID0gZ3JvdXBOYW1lO1xuICAgIHZhciBpZGVudGlmeSA9IG5ldyBJZGVudGlmeSgpLnNldChncm91cFR5cGUsIGdyb3VwTmFtZSk7XG5cbiAgICB0aGlzLl9sb2dFdmVudChDb25zdGFudHMuSURFTlRJRllfRVZFTlQsIG51bGwsIG51bGwsIGlkZW50aWZ5LnVzZXJQcm9wZXJ0aWVzT3BlcmF0aW9ucywgZ3JvdXBzLCBudWxsLCBudWxsLCBudWxsKTtcbiAgfTtcbiAgLyoqXG4gICAqIFNldHMgd2hldGhlciB0byBvcHQgY3VycmVudCB1c2VyIG91dCBvZiB0cmFja2luZy5cbiAgICogQHB1YmxpY1xuICAgKiBAcGFyYW0ge2Jvb2xlYW59IGVuYWJsZSAtIGlmIHRydWUgdGhlbiBubyBldmVudHMgd2lsbCBiZSBsb2dnZWQgb3Igc2VudC5cbiAgICogQGV4YW1wbGU6IGFtcGxpdHVkZS5zZXRPcHRPdXQodHJ1ZSk7XG4gICAqL1xuXG5cbiAgQW1wbGl0dWRlQ2xpZW50LnByb3RvdHlwZS5zZXRPcHRPdXQgPSBmdW5jdGlvbiBzZXRPcHRPdXQoZW5hYmxlKSB7XG4gICAgaWYgKHRoaXMuX3Nob3VsZERlZmVyQ2FsbCgpKSB7XG4gICAgICByZXR1cm4gdGhpcy5fcS5wdXNoKFsnc2V0T3B0T3V0J10uY29uY2F0KEFycmF5LnByb3RvdHlwZS5zbGljZS5jYWxsKGFyZ3VtZW50cywgMCkpKTtcbiAgICB9XG5cbiAgICBpZiAoIXV0aWxzLnZhbGlkYXRlSW5wdXQoZW5hYmxlLCAnZW5hYmxlJywgJ2Jvb2xlYW4nKSkge1xuICAgICAgcmV0dXJuO1xuICAgIH1cblxuICAgIHRyeSB7XG4gICAgICB0aGlzLm9wdGlvbnMub3B0T3V0ID0gZW5hYmxlO1xuXG4gICAgICBfc2F2ZUNvb2tpZURhdGEodGhpcyk7XG4gICAgfSBjYXRjaCAoZSkge1xuICAgICAgdXRpbHMubG9nLmVycm9yKGUpO1xuICAgIH1cbiAgfTtcblxuICBBbXBsaXR1ZGVDbGllbnQucHJvdG90eXBlLnNldFNlc3Npb25JZCA9IGZ1bmN0aW9uIHNldFNlc3Npb25JZChzZXNzaW9uSWQpIHtcbiAgICBpZiAoIXV0aWxzLnZhbGlkYXRlSW5wdXQoc2Vzc2lvbklkLCAnc2Vzc2lvbklkJywgJ251bWJlcicpKSB7XG4gICAgICByZXR1cm47XG4gICAgfVxuXG4gICAgdHJ5IHtcbiAgICAgIHRoaXMuX3Nlc3Npb25JZCA9IHNlc3Npb25JZDtcblxuICAgICAgX3NhdmVDb29raWVEYXRhKHRoaXMpO1xuICAgIH0gY2F0Y2ggKGUpIHtcbiAgICAgIHV0aWxzLmxvZy5lcnJvcihlKTtcbiAgICB9XG4gIH07XG5cbiAgQW1wbGl0dWRlQ2xpZW50LnByb3RvdHlwZS5yZXNldFNlc3Npb25JZCA9IGZ1bmN0aW9uIHJlc2V0U2Vzc2lvbklkKCkge1xuICAgIHRoaXMuc2V0U2Vzc2lvbklkKG5ldyBEYXRlKCkuZ2V0VGltZSgpKTtcbiAgfTtcbiAgLyoqXG4gICAgKiBSZWdlbmVyYXRlcyBhIG5ldyByYW5kb20gZGV2aWNlSWQgZm9yIGN1cnJlbnQgdXNlci4gTm90ZTogdGhpcyBpcyBub3QgcmVjb21tZW5kZWQgdW5sZXNzIHlvdSBrbm93IHdoYXQgeW91XG4gICAgKiBhcmUgZG9pbmcuIFRoaXMgY2FuIGJlIHVzZWQgaW4gY29uanVuY3Rpb24gd2l0aCBgc2V0VXNlcklkKG51bGwpYCB0byBhbm9ueW1pemUgdXNlcnMgYWZ0ZXIgdGhleSBsb2cgb3V0LlxuICAgICogV2l0aCBhIG51bGwgdXNlcklkIGFuZCBhIGNvbXBsZXRlbHkgbmV3IGRldmljZUlkLCB0aGUgY3VycmVudCB1c2VyIHdvdWxkIGFwcGVhciBhcyBhIGJyYW5kIG5ldyB1c2VyIGluIGRhc2hib2FyZC5cbiAgICAqIFRoaXMgdXNlcyBzcmMvdXVpZC5qcyB0byByZWdlbmVyYXRlIHRoZSBkZXZpY2VJZC5cbiAgICAqIEBwdWJsaWNcbiAgICAqL1xuXG5cbiAgQW1wbGl0dWRlQ2xpZW50LnByb3RvdHlwZS5yZWdlbmVyYXRlRGV2aWNlSWQgPSBmdW5jdGlvbiByZWdlbmVyYXRlRGV2aWNlSWQoKSB7XG4gICAgaWYgKHRoaXMuX3Nob3VsZERlZmVyQ2FsbCgpKSB7XG4gICAgICByZXR1cm4gdGhpcy5fcS5wdXNoKFsncmVnZW5lcmF0ZURldmljZUlkJ10uY29uY2F0KEFycmF5LnByb3RvdHlwZS5zbGljZS5jYWxsKGFyZ3VtZW50cywgMCkpKTtcbiAgICB9XG5cbiAgICB0aGlzLnNldERldmljZUlkKGJhc2U2NElkKCkpO1xuICB9O1xuICAvKipcbiAgICAqIFNldHMgYSBjdXN0b20gZGV2aWNlSWQgZm9yIGN1cnJlbnQgdXNlci4gTm90ZTogdGhpcyBpcyBub3QgcmVjb21tZW5kZWQgdW5sZXNzIHlvdSBrbm93IHdoYXQgeW91IGFyZSBkb2luZ1xuICAgICogKGxpa2UgaWYgeW91IGhhdmUgeW91ciBvd24gc3lzdGVtIGZvciBtYW5hZ2luZyBkZXZpY2VJZHMpLiBNYWtlIHN1cmUgdGhlIGRldmljZUlkIHlvdSBzZXQgaXMgc3VmZmljaWVudGx5IHVuaXF1ZVxuICAgICogKHdlIHJlY29tbWVuZCBzb21ldGhpbmcgbGlrZSBhIFVVSUQgLSBzZWUgc3JjL3V1aWQuanMgZm9yIGFuIGV4YW1wbGUgb2YgaG93IHRvIGdlbmVyYXRlKSB0byBwcmV2ZW50IGNvbmZsaWN0cyB3aXRoIG90aGVyIGRldmljZXMgaW4gb3VyIHN5c3RlbS5cbiAgICAqIEBwdWJsaWNcbiAgICAqIEBwYXJhbSB7c3RyaW5nfSBkZXZpY2VJZCAtIGN1c3RvbSBkZXZpY2VJZCBmb3IgY3VycmVudCB1c2VyLlxuICAgICogQGV4YW1wbGUgYW1wbGl0dWRlQ2xpZW50LnNldERldmljZUlkKCc0NWYwOTU0Zi1lYjc5LTQ0NjMtYWM4YS0yMzNhNmY0NWE4ZjAnKTtcbiAgICAqL1xuXG5cbiAgQW1wbGl0dWRlQ2xpZW50LnByb3RvdHlwZS5zZXREZXZpY2VJZCA9IGZ1bmN0aW9uIHNldERldmljZUlkKGRldmljZUlkKSB7XG4gICAgaWYgKHRoaXMuX3Nob3VsZERlZmVyQ2FsbCgpKSB7XG4gICAgICByZXR1cm4gdGhpcy5fcS5wdXNoKFsnc2V0RGV2aWNlSWQnXS5jb25jYXQoQXJyYXkucHJvdG90eXBlLnNsaWNlLmNhbGwoYXJndW1lbnRzLCAwKSkpO1xuICAgIH1cblxuICAgIGlmICghdXRpbHMudmFsaWRhdGVJbnB1dChkZXZpY2VJZCwgJ2RldmljZUlkJywgJ3N0cmluZycpKSB7XG4gICAgICByZXR1cm47XG4gICAgfVxuXG4gICAgdHJ5IHtcbiAgICAgIGlmICghdXRpbHMuaXNFbXB0eVN0cmluZyhkZXZpY2VJZCkpIHtcbiAgICAgICAgdGhpcy5vcHRpb25zLmRldmljZUlkID0gJycgKyBkZXZpY2VJZDtcblxuICAgICAgICBfc2F2ZUNvb2tpZURhdGEodGhpcyk7XG4gICAgICB9XG4gICAgfSBjYXRjaCAoZSkge1xuICAgICAgdXRpbHMubG9nLmVycm9yKGUpO1xuICAgIH1cbiAgfTtcbiAgLyoqXG4gICAqIFNldHMgdXNlciBwcm9wZXJ0aWVzIGZvciB0aGUgY3VycmVudCB1c2VyLlxuICAgKiBAcHVibGljXG4gICAqIEBwYXJhbSB7b2JqZWN0fSAtIG9iamVjdCB3aXRoIHN0cmluZyBrZXlzIGFuZCB2YWx1ZXMgZm9yIHRoZSB1c2VyIHByb3BlcnRpZXMgdG8gc2V0LlxuICAgKiBAcGFyYW0ge2Jvb2xlYW59IC0gREVQUkVDQVRFRCBvcHRfcmVwbGFjZTogaW4gZWFybGllciB2ZXJzaW9ucyBvZiB0aGUgSlMgU0RLIHRoZSB1c2VyIHByb3BlcnRpZXMgb2JqZWN0IHdhcyBrZXB0IGluXG4gICAqIG1lbW9yeSBhbmQgcmVwbGFjZSA9IHRydWUgd291bGQgcmVwbGFjZSB0aGUgb2JqZWN0IGluIG1lbW9yeS4gTm93IHRoZSBwcm9wZXJ0aWVzIGFyZSBubyBsb25nZXIgc3RvcmVkIGluIG1lbW9yeSwgc28gcmVwbGFjZSBpcyBkZXByZWNhdGVkLlxuICAgKiBAZXhhbXBsZSBhbXBsaXR1ZGVDbGllbnQuc2V0VXNlclByb3BlcnRpZXMoeydnZW5kZXInOiAnZmVtYWxlJywgJ3NpZ25fdXBfY29tcGxldGUnOiB0cnVlfSlcbiAgICovXG5cblxuICBBbXBsaXR1ZGVDbGllbnQucHJvdG90eXBlLnNldFVzZXJQcm9wZXJ0aWVzID0gZnVuY3Rpb24gc2V0VXNlclByb3BlcnRpZXModXNlclByb3BlcnRpZXMpIHtcbiAgICBpZiAodGhpcy5fc2hvdWxkRGVmZXJDYWxsKCkpIHtcbiAgICAgIHJldHVybiB0aGlzLl9xLnB1c2goWydzZXRVc2VyUHJvcGVydGllcyddLmNvbmNhdChBcnJheS5wcm90b3R5cGUuc2xpY2UuY2FsbChhcmd1bWVudHMsIDApKSk7XG4gICAgfVxuXG4gICAgaWYgKCF0aGlzLl9hcGlLZXlTZXQoJ3NldFVzZXJQcm9wZXJ0aWVzKCknKSB8fCAhdXRpbHMudmFsaWRhdGVJbnB1dCh1c2VyUHJvcGVydGllcywgJ3VzZXJQcm9wZXJ0aWVzJywgJ29iamVjdCcpKSB7XG4gICAgICByZXR1cm47XG4gICAgfSAvLyBzYW5pdGl6ZSB0aGUgdXNlclByb3BlcnRpZXMgZGljdCBiZWZvcmUgY29udmVydGluZyBpbnRvIGlkZW50aWZ5XG5cblxuICAgIHZhciBzYW5pdGl6ZWQgPSB1dGlscy50cnVuY2F0ZSh1dGlscy52YWxpZGF0ZVByb3BlcnRpZXModXNlclByb3BlcnRpZXMpKTtcblxuICAgIGlmIChPYmplY3Qua2V5cyhzYW5pdGl6ZWQpLmxlbmd0aCA9PT0gMCkge1xuICAgICAgcmV0dXJuO1xuICAgIH0gLy8gY29udmVydCB1c2VyUHJvcGVydGllcyBpbnRvIGFuIGlkZW50aWZ5IGNhbGxcblxuXG4gICAgdmFyIGlkZW50aWZ5ID0gbmV3IElkZW50aWZ5KCk7XG5cbiAgICBmb3IgKHZhciBwcm9wZXJ0eSBpbiBzYW5pdGl6ZWQpIHtcbiAgICAgIGlmIChzYW5pdGl6ZWQuaGFzT3duUHJvcGVydHkocHJvcGVydHkpKSB7XG4gICAgICAgIGlkZW50aWZ5LnNldChwcm9wZXJ0eSwgc2FuaXRpemVkW3Byb3BlcnR5XSk7XG4gICAgICB9XG4gICAgfVxuXG4gICAgdGhpcy5pZGVudGlmeShpZGVudGlmeSk7XG4gIH07XG4gIC8qKlxuICAgKiBDbGVhciBhbGwgb2YgdGhlIHVzZXIgcHJvcGVydGllcyBmb3IgdGhlIGN1cnJlbnQgdXNlci4gTm90ZTogY2xlYXJpbmcgdXNlciBwcm9wZXJ0aWVzIGlzIGlycmV2ZXJzaWJsZSFcbiAgICogQHB1YmxpY1xuICAgKiBAZXhhbXBsZSBhbXBsaXR1ZGVDbGllbnQuY2xlYXJVc2VyUHJvcGVydGllcygpO1xuICAgKi9cblxuXG4gIEFtcGxpdHVkZUNsaWVudC5wcm90b3R5cGUuY2xlYXJVc2VyUHJvcGVydGllcyA9IGZ1bmN0aW9uIGNsZWFyVXNlclByb3BlcnRpZXMoKSB7XG4gICAgaWYgKHRoaXMuX3Nob3VsZERlZmVyQ2FsbCgpKSB7XG4gICAgICByZXR1cm4gdGhpcy5fcS5wdXNoKFsnY2xlYXJVc2VyUHJvcGVydGllcyddLmNvbmNhdChBcnJheS5wcm90b3R5cGUuc2xpY2UuY2FsbChhcmd1bWVudHMsIDApKSk7XG4gICAgfVxuXG4gICAgaWYgKCF0aGlzLl9hcGlLZXlTZXQoJ2NsZWFyVXNlclByb3BlcnRpZXMoKScpKSB7XG4gICAgICByZXR1cm47XG4gICAgfVxuXG4gICAgdmFyIGlkZW50aWZ5ID0gbmV3IElkZW50aWZ5KCk7XG4gICAgaWRlbnRpZnkuY2xlYXJBbGwoKTtcbiAgICB0aGlzLmlkZW50aWZ5KGlkZW50aWZ5KTtcbiAgfTtcbiAgLyoqXG4gICAqIEFwcGxpZXMgdGhlIHByb3hpZWQgZnVuY3Rpb25zIG9uIHRoZSBwcm94aWVkIG9iamVjdCB0byBhbiBpbnN0YW5jZSBvZiB0aGUgcmVhbCBvYmplY3QuXG4gICAqIFVzZWQgdG8gY29udmVydCBwcm94aWVkIElkZW50aWZ5IGFuZCBSZXZlbnVlIG9iamVjdHMuXG4gICAqIEBwcml2YXRlXG4gICAqL1xuXG5cbiAgdmFyIF9jb252ZXJ0UHJveHlPYmplY3RUb1JlYWxPYmplY3QgPSBmdW5jdGlvbiBfY29udmVydFByb3h5T2JqZWN0VG9SZWFsT2JqZWN0KGluc3RhbmNlLCBwcm94eSkge1xuICAgIGZvciAodmFyIGkgPSAwOyBpIDwgcHJveHkuX3EubGVuZ3RoOyBpKyspIHtcbiAgICAgIHZhciBmbiA9IGluc3RhbmNlW3Byb3h5Ll9xW2ldWzBdXTtcblxuICAgICAgaWYgKHR5cGUoZm4pID09PSAnZnVuY3Rpb24nKSB7XG4gICAgICAgIGZuLmFwcGx5KGluc3RhbmNlLCBwcm94eS5fcVtpXS5zbGljZSgxKSk7XG4gICAgICB9XG4gICAgfVxuXG4gICAgcmV0dXJuIGluc3RhbmNlO1xuICB9O1xuICAvKipcbiAgICogU2VuZCBhbiBpZGVudGlmeSBjYWxsIGNvbnRhaW5pbmcgdXNlciBwcm9wZXJ0eSBvcGVyYXRpb25zIHRvIEFtcGxpdHVkZSBzZXJ2ZXJzLlxuICAgKiBTZWUgW1JlYWRtZV17QGxpbmsgaHR0cHM6Ly9naXRodWIuY29tL2FtcGxpdHVkZS9BbXBsaXR1ZGUtSmF2YXNjcmlwdCN1c2VyLXByb3BlcnRpZXMtYW5kLXVzZXItcHJvcGVydHktb3BlcmF0aW9uc31cbiAgICogZm9yIG1vcmUgaW5mb3JtYXRpb24gb24gdGhlIElkZW50aWZ5IEFQSSBhbmQgdXNlciBwcm9wZXJ0eSBvcGVyYXRpb25zLlxuICAgKiBAcGFyYW0ge0lkZW50aWZ5fSBpZGVudGlmeV9vYmogLSB0aGUgSWRlbnRpZnkgb2JqZWN0IGNvbnRhaW5pbmcgdGhlIHVzZXIgcHJvcGVydHkgb3BlcmF0aW9ucyB0byBzZW5kLlxuICAgKiBAcGFyYW0ge0FtcGxpdHVkZX5ldmVudENhbGxiYWNrfSBvcHRfY2FsbGJhY2sgLSAob3B0aW9uYWwpIGNhbGxiYWNrIGZ1bmN0aW9uIHRvIHJ1biB3aGVuIHRoZSBpZGVudGlmeSBldmVudCBoYXMgYmVlbiBzZW50LlxuICAgKiBOb3RlOiB0aGUgc2VydmVyIHJlc3BvbnNlIGNvZGUgYW5kIHJlc3BvbnNlIGJvZHkgZnJvbSB0aGUgaWRlbnRpZnkgZXZlbnQgdXBsb2FkIGFyZSBwYXNzZWQgdG8gdGhlIGNhbGxiYWNrIGZ1bmN0aW9uLlxuICAgKiBAZXhhbXBsZVxuICAgKiB2YXIgaWRlbnRpZnkgPSBuZXcgYW1wbGl0dWRlLklkZW50aWZ5KCkuc2V0KCdjb2xvcnMnLCBbJ3Jvc2UnLCAnZ29sZCddKS5hZGQoJ2thcm1hJywgMSkuc2V0T25jZSgnc2lnbl91cF9kYXRlJywgJzIwMTYtMDMtMzEnKTtcbiAgICogYW1wbGl0dWRlLmlkZW50aWZ5KGlkZW50aWZ5KTtcbiAgICovXG5cblxuICBBbXBsaXR1ZGVDbGllbnQucHJvdG90eXBlLmlkZW50aWZ5ID0gZnVuY3Rpb24gKGlkZW50aWZ5X29iaiwgb3B0X2NhbGxiYWNrKSB7XG4gICAgaWYgKHRoaXMuX3Nob3VsZERlZmVyQ2FsbCgpKSB7XG4gICAgICByZXR1cm4gdGhpcy5fcS5wdXNoKFsnaWRlbnRpZnknXS5jb25jYXQoQXJyYXkucHJvdG90eXBlLnNsaWNlLmNhbGwoYXJndW1lbnRzLCAwKSkpO1xuICAgIH1cblxuICAgIGlmICghdGhpcy5fYXBpS2V5U2V0KCdpZGVudGlmeSgpJykpIHtcbiAgICAgIGlmICh0eXBlKG9wdF9jYWxsYmFjaykgPT09ICdmdW5jdGlvbicpIHtcbiAgICAgICAgb3B0X2NhbGxiYWNrKDAsICdObyByZXF1ZXN0IHNlbnQnLCB7XG4gICAgICAgICAgcmVhc29uOiAnQVBJIGtleSBpcyBub3Qgc2V0J1xuICAgICAgICB9KTtcbiAgICAgIH1cblxuICAgICAgcmV0dXJuO1xuICAgIH0gLy8gaWYgaWRlbnRpZnkgaW5wdXQgaXMgYSBwcm94aWVkIG9iamVjdCBjcmVhdGVkIGJ5IHRoZSBhc3luYyBsb2FkaW5nIHNuaXBwZXQsIGNvbnZlcnQgaXQgaW50byBhbiBpZGVudGlmeSBvYmplY3RcblxuXG4gICAgaWYgKHR5cGUoaWRlbnRpZnlfb2JqKSA9PT0gJ29iamVjdCcgJiYgaWRlbnRpZnlfb2JqLmhhc093blByb3BlcnR5KCdfcScpKSB7XG4gICAgICBpZGVudGlmeV9vYmogPSBfY29udmVydFByb3h5T2JqZWN0VG9SZWFsT2JqZWN0KG5ldyBJZGVudGlmeSgpLCBpZGVudGlmeV9vYmopO1xuICAgIH1cblxuICAgIGlmIChpZGVudGlmeV9vYmogaW5zdGFuY2VvZiBJZGVudGlmeSkge1xuICAgICAgLy8gb25seSBzZW5kIGlmIHRoZXJlIGFyZSBvcGVyYXRpb25zXG4gICAgICBpZiAoT2JqZWN0LmtleXMoaWRlbnRpZnlfb2JqLnVzZXJQcm9wZXJ0aWVzT3BlcmF0aW9ucykubGVuZ3RoID4gMCkge1xuICAgICAgICByZXR1cm4gdGhpcy5fbG9nRXZlbnQoQ29uc3RhbnRzLklERU5USUZZX0VWRU5ULCBudWxsLCBudWxsLCBpZGVudGlmeV9vYmoudXNlclByb3BlcnRpZXNPcGVyYXRpb25zLCBudWxsLCBudWxsLCBudWxsLCBvcHRfY2FsbGJhY2spO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgaWYgKHR5cGUob3B0X2NhbGxiYWNrKSA9PT0gJ2Z1bmN0aW9uJykge1xuICAgICAgICAgIG9wdF9jYWxsYmFjaygwLCAnTm8gcmVxdWVzdCBzZW50Jywge1xuICAgICAgICAgICAgcmVhc29uOiAnTm8gdXNlciBwcm9wZXJ0eSBvcGVyYXRpb25zJ1xuICAgICAgICAgIH0pO1xuICAgICAgICB9XG4gICAgICB9XG4gICAgfSBlbHNlIHtcbiAgICAgIHV0aWxzLmxvZy5lcnJvcignSW52YWxpZCBpZGVudGlmeSBpbnB1dCB0eXBlLiBFeHBlY3RlZCBJZGVudGlmeSBvYmplY3QgYnV0IHNhdyAnICsgdHlwZShpZGVudGlmeV9vYmopKTtcblxuICAgICAgaWYgKHR5cGUob3B0X2NhbGxiYWNrKSA9PT0gJ2Z1bmN0aW9uJykge1xuICAgICAgICBvcHRfY2FsbGJhY2soMCwgJ05vIHJlcXVlc3Qgc2VudCcsIHtcbiAgICAgICAgICByZWFzb246ICdJbnZhbGlkIGlkZW50aWZ5IGlucHV0IHR5cGUnXG4gICAgICAgIH0pO1xuICAgICAgfVxuICAgIH1cbiAgfTtcblxuICBBbXBsaXR1ZGVDbGllbnQucHJvdG90eXBlLmdyb3VwSWRlbnRpZnkgPSBmdW5jdGlvbiAoZ3JvdXBfdHlwZSwgZ3JvdXBfbmFtZSwgaWRlbnRpZnlfb2JqLCBvcHRfY2FsbGJhY2spIHtcbiAgICBpZiAodGhpcy5fc2hvdWxkRGVmZXJDYWxsKCkpIHtcbiAgICAgIHJldHVybiB0aGlzLl9xLnB1c2goWydncm91cElkZW50aWZ5J10uY29uY2F0KEFycmF5LnByb3RvdHlwZS5zbGljZS5jYWxsKGFyZ3VtZW50cywgMCkpKTtcbiAgICB9XG5cbiAgICBpZiAoIXRoaXMuX2FwaUtleVNldCgnZ3JvdXBJZGVudGlmeSgpJykpIHtcbiAgICAgIGlmICh0eXBlKG9wdF9jYWxsYmFjaykgPT09ICdmdW5jdGlvbicpIHtcbiAgICAgICAgb3B0X2NhbGxiYWNrKDAsICdObyByZXF1ZXN0IHNlbnQnLCB7XG4gICAgICAgICAgcmVhc29uOiAnQVBJIGtleSBpcyBub3Qgc2V0J1xuICAgICAgICB9KTtcbiAgICAgIH1cblxuICAgICAgcmV0dXJuO1xuICAgIH1cblxuICAgIGlmICghdXRpbHMudmFsaWRhdGVJbnB1dChncm91cF90eXBlLCAnZ3JvdXBfdHlwZScsICdzdHJpbmcnKSB8fCB1dGlscy5pc0VtcHR5U3RyaW5nKGdyb3VwX3R5cGUpKSB7XG4gICAgICBpZiAodHlwZShvcHRfY2FsbGJhY2spID09PSAnZnVuY3Rpb24nKSB7XG4gICAgICAgIG9wdF9jYWxsYmFjaygwLCAnTm8gcmVxdWVzdCBzZW50Jywge1xuICAgICAgICAgIHJlYXNvbjogJ0ludmFsaWQgZ3JvdXAgdHlwZSdcbiAgICAgICAgfSk7XG4gICAgICB9XG5cbiAgICAgIHJldHVybjtcbiAgICB9XG5cbiAgICBpZiAoZ3JvdXBfbmFtZSA9PT0gbnVsbCB8fCBncm91cF9uYW1lID09PSB1bmRlZmluZWQpIHtcbiAgICAgIGlmICh0eXBlKG9wdF9jYWxsYmFjaykgPT09ICdmdW5jdGlvbicpIHtcbiAgICAgICAgb3B0X2NhbGxiYWNrKDAsICdObyByZXF1ZXN0IHNlbnQnLCB7XG4gICAgICAgICAgcmVhc29uOiAnSW52YWxpZCBncm91cCBuYW1lJ1xuICAgICAgICB9KTtcbiAgICAgIH1cblxuICAgICAgcmV0dXJuO1xuICAgIH0gLy8gaWYgaWRlbnRpZnkgaW5wdXQgaXMgYSBwcm94aWVkIG9iamVjdCBjcmVhdGVkIGJ5IHRoZSBhc3luYyBsb2FkaW5nIHNuaXBwZXQsIGNvbnZlcnQgaXQgaW50byBhbiBpZGVudGlmeSBvYmplY3RcblxuXG4gICAgaWYgKHR5cGUoaWRlbnRpZnlfb2JqKSA9PT0gJ29iamVjdCcgJiYgaWRlbnRpZnlfb2JqLmhhc093blByb3BlcnR5KCdfcScpKSB7XG4gICAgICBpZGVudGlmeV9vYmogPSBfY29udmVydFByb3h5T2JqZWN0VG9SZWFsT2JqZWN0KG5ldyBJZGVudGlmeSgpLCBpZGVudGlmeV9vYmopO1xuICAgIH1cblxuICAgIGlmIChpZGVudGlmeV9vYmogaW5zdGFuY2VvZiBJZGVudGlmeSkge1xuICAgICAgLy8gb25seSBzZW5kIGlmIHRoZXJlIGFyZSBvcGVyYXRpb25zXG4gICAgICBpZiAoT2JqZWN0LmtleXMoaWRlbnRpZnlfb2JqLnVzZXJQcm9wZXJ0aWVzT3BlcmF0aW9ucykubGVuZ3RoID4gMCkge1xuICAgICAgICByZXR1cm4gdGhpcy5fbG9nRXZlbnQoQ29uc3RhbnRzLkdST1VQX0lERU5USUZZX0VWRU5ULCBudWxsLCBudWxsLCBudWxsLCBfZGVmaW5lUHJvcGVydHkoe30sIGdyb3VwX3R5cGUsIGdyb3VwX25hbWUpLCBpZGVudGlmeV9vYmoudXNlclByb3BlcnRpZXNPcGVyYXRpb25zLCBudWxsLCBvcHRfY2FsbGJhY2spO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgaWYgKHR5cGUob3B0X2NhbGxiYWNrKSA9PT0gJ2Z1bmN0aW9uJykge1xuICAgICAgICAgIG9wdF9jYWxsYmFjaygwLCAnTm8gcmVxdWVzdCBzZW50Jywge1xuICAgICAgICAgICAgcmVhc29uOiAnTm8gZ3JvdXAgcHJvcGVydHkgb3BlcmF0aW9ucydcbiAgICAgICAgICB9KTtcbiAgICAgICAgfVxuICAgICAgfVxuICAgIH0gZWxzZSB7XG4gICAgICB1dGlscy5sb2cuZXJyb3IoJ0ludmFsaWQgaWRlbnRpZnkgaW5wdXQgdHlwZS4gRXhwZWN0ZWQgSWRlbnRpZnkgb2JqZWN0IGJ1dCBzYXcgJyArIHR5cGUoaWRlbnRpZnlfb2JqKSk7XG5cbiAgICAgIGlmICh0eXBlKG9wdF9jYWxsYmFjaykgPT09ICdmdW5jdGlvbicpIHtcbiAgICAgICAgb3B0X2NhbGxiYWNrKDAsICdObyByZXF1ZXN0IHNlbnQnLCB7XG4gICAgICAgICAgcmVhc29uOiAnSW52YWxpZCBpZGVudGlmeSBpbnB1dCB0eXBlJ1xuICAgICAgICB9KTtcbiAgICAgIH1cbiAgICB9XG4gIH07XG4gIC8qKlxuICAgKiBTZXQgYSB2ZXJzaW9uTmFtZSBmb3IgeW91ciBhcHBsaWNhdGlvbi5cbiAgICogQHB1YmxpY1xuICAgKiBAcGFyYW0ge3N0cmluZ30gdmVyc2lvbk5hbWUgLSBUaGUgdmVyc2lvbiB0byBzZXQgZm9yIHlvdXIgYXBwbGljYXRpb24uXG4gICAqIEBleGFtcGxlIGFtcGxpdHVkZUNsaWVudC5zZXRWZXJzaW9uTmFtZSgnMS4xMi4zJyk7XG4gICAqL1xuXG5cbiAgQW1wbGl0dWRlQ2xpZW50LnByb3RvdHlwZS5zZXRWZXJzaW9uTmFtZSA9IGZ1bmN0aW9uIHNldFZlcnNpb25OYW1lKHZlcnNpb25OYW1lKSB7XG4gICAgaWYgKHRoaXMuX3Nob3VsZERlZmVyQ2FsbCgpKSB7XG4gICAgICByZXR1cm4gdGhpcy5fcS5wdXNoKFsnc2V0VmVyc2lvbk5hbWUnXS5jb25jYXQoQXJyYXkucHJvdG90eXBlLnNsaWNlLmNhbGwoYXJndW1lbnRzLCAwKSkpO1xuICAgIH1cblxuICAgIGlmICghdXRpbHMudmFsaWRhdGVJbnB1dCh2ZXJzaW9uTmFtZSwgJ3ZlcnNpb25OYW1lJywgJ3N0cmluZycpKSB7XG4gICAgICByZXR1cm47XG4gICAgfVxuXG4gICAgdGhpcy5vcHRpb25zLnZlcnNpb25OYW1lID0gdmVyc2lvbk5hbWU7XG4gIH07XG4gIC8qKlxuICAgKiBQcml2YXRlIGxvZ0V2ZW50IG1ldGhvZC4gS2VlcHMgYXBpUHJvcGVydGllcyBmcm9tIGJlaW5nIHB1YmxpY2x5IGV4cG9zZWQuXG4gICAqIEBwcml2YXRlXG4gICAqL1xuXG5cbiAgQW1wbGl0dWRlQ2xpZW50LnByb3RvdHlwZS5fbG9nRXZlbnQgPSBmdW5jdGlvbiBfbG9nRXZlbnQoZXZlbnRUeXBlLCBldmVudFByb3BlcnRpZXMsIGFwaVByb3BlcnRpZXMsIHVzZXJQcm9wZXJ0aWVzLCBncm91cHMsIGdyb3VwUHJvcGVydGllcywgdGltZXN0YW1wLCBjYWxsYmFjaykge1xuICAgIHtcbiAgICAgIF9sb2FkQ29va2llRGF0YSh0aGlzKTsgLy8gcmVsb2FkIGNvb2tpZSBiZWZvcmUgZWFjaCBsb2cgZXZlbnQgdG8gc3luYyBldmVudCBtZXRhLWRhdGEgYmV0d2VlbiB3aW5kb3dzIGFuZCB0YWJzXG5cbiAgICB9XG5cbiAgICBpZiAoIWV2ZW50VHlwZSkge1xuICAgICAgaWYgKHR5cGUoY2FsbGJhY2spID09PSAnZnVuY3Rpb24nKSB7XG4gICAgICAgIGNhbGxiYWNrKDAsICdObyByZXF1ZXN0IHNlbnQnLCB7XG4gICAgICAgICAgcmVhc29uOiAnTWlzc2luZyBldmVudFR5cGUnXG4gICAgICAgIH0pO1xuICAgICAgfVxuXG4gICAgICByZXR1cm47XG4gICAgfVxuXG4gICAgaWYgKHRoaXMub3B0aW9ucy5vcHRPdXQpIHtcbiAgICAgIGlmICh0eXBlKGNhbGxiYWNrKSA9PT0gJ2Z1bmN0aW9uJykge1xuICAgICAgICBjYWxsYmFjaygwLCAnTm8gcmVxdWVzdCBzZW50Jywge1xuICAgICAgICAgIHJlYXNvbjogJ29wdE91dCBpcyBzZXQgdG8gdHJ1ZSdcbiAgICAgICAgfSk7XG4gICAgICB9XG5cbiAgICAgIHJldHVybjtcbiAgICB9XG5cbiAgICB0cnkge1xuICAgICAgdmFyIGV2ZW50SWQ7XG5cbiAgICAgIGlmIChldmVudFR5cGUgPT09IENvbnN0YW50cy5JREVOVElGWV9FVkVOVCB8fCBldmVudFR5cGUgPT09IENvbnN0YW50cy5HUk9VUF9JREVOVElGWV9FVkVOVCkge1xuICAgICAgICBldmVudElkID0gdGhpcy5uZXh0SWRlbnRpZnlJZCgpO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgZXZlbnRJZCA9IHRoaXMubmV4dEV2ZW50SWQoKTtcbiAgICAgIH1cblxuICAgICAgdmFyIHNlcXVlbmNlTnVtYmVyID0gdGhpcy5uZXh0U2VxdWVuY2VOdW1iZXIoKTtcbiAgICAgIHZhciBldmVudFRpbWUgPSB0eXBlKHRpbWVzdGFtcCkgPT09ICdudW1iZXInID8gdGltZXN0YW1wIDogbmV3IERhdGUoKS5nZXRUaW1lKCk7XG5cbiAgICAgIGlmICghdGhpcy5fc2Vzc2lvbklkIHx8ICF0aGlzLl9sYXN0RXZlbnRUaW1lIHx8IGV2ZW50VGltZSAtIHRoaXMuX2xhc3RFdmVudFRpbWUgPiB0aGlzLm9wdGlvbnMuc2Vzc2lvblRpbWVvdXQpIHtcbiAgICAgICAgdGhpcy5fc2Vzc2lvbklkID0gZXZlbnRUaW1lO1xuICAgICAgfVxuXG4gICAgICB0aGlzLl9sYXN0RXZlbnRUaW1lID0gZXZlbnRUaW1lO1xuXG4gICAgICBfc2F2ZUNvb2tpZURhdGEodGhpcyk7XG5cbiAgICAgIHZhciBvc05hbWUgPSB0aGlzLl91YS5icm93c2VyLm5hbWU7XG4gICAgICB2YXIgb3NWZXJzaW9uID0gdGhpcy5fdWEuYnJvd3Nlci5tYWpvcjtcbiAgICAgIHZhciBkZXZpY2VNb2RlbCA9IHRoaXMuX3VhLmRldmljZS5tb2RlbDtcbiAgICAgIHZhciBkZXZpY2VNYW51ZmFjdHVyZXIgPSB0aGlzLl91YS5kZXZpY2UudmVuZG9yO1xuICAgICAgdmFyIHZlcnNpb25OYW1lO1xuICAgICAgdmFyIGNhcnJpZXI7XG5cbiAgICAgIHVzZXJQcm9wZXJ0aWVzID0gdXNlclByb3BlcnRpZXMgfHwge307XG5cbiAgICAgIHZhciB0cmFja2luZ09wdGlvbnMgPSBfb2JqZWN0U3ByZWFkKHt9LCB0aGlzLl9hcGlQcm9wZXJ0aWVzVHJhY2tpbmdPcHRpb25zKTtcblxuICAgICAgYXBpUHJvcGVydGllcyA9IF9vYmplY3RTcHJlYWQoe30sIGFwaVByb3BlcnRpZXMgfHwge30sIHRyYWNraW5nT3B0aW9ucyk7XG4gICAgICBldmVudFByb3BlcnRpZXMgPSBldmVudFByb3BlcnRpZXMgfHwge307XG4gICAgICBncm91cHMgPSBncm91cHMgfHwge307XG4gICAgICBncm91cFByb3BlcnRpZXMgPSBncm91cFByb3BlcnRpZXMgfHwge307XG4gICAgICB2YXIgZXZlbnQgPSB7XG4gICAgICAgIGRldmljZV9pZDogdGhpcy5vcHRpb25zLmRldmljZUlkLFxuICAgICAgICB1c2VyX2lkOiB0aGlzLm9wdGlvbnMudXNlcklkLFxuICAgICAgICB0aW1lc3RhbXA6IGV2ZW50VGltZSxcbiAgICAgICAgZXZlbnRfaWQ6IGV2ZW50SWQsXG4gICAgICAgIHNlc3Npb25faWQ6IHRoaXMuX3Nlc3Npb25JZCB8fCAtMSxcbiAgICAgICAgZXZlbnRfdHlwZTogZXZlbnRUeXBlLFxuICAgICAgICB2ZXJzaW9uX25hbWU6IF9zaG91bGRUcmFja0ZpZWxkKHRoaXMsICd2ZXJzaW9uX25hbWUnKSA/IHRoaXMub3B0aW9ucy52ZXJzaW9uTmFtZSB8fCB2ZXJzaW9uTmFtZSB8fCBudWxsIDogbnVsbCxcbiAgICAgICAgcGxhdGZvcm06IF9zaG91bGRUcmFja0ZpZWxkKHRoaXMsICdwbGF0Zm9ybScpID8gdGhpcy5vcHRpb25zLnBsYXRmb3JtIDogbnVsbCxcbiAgICAgICAgb3NfbmFtZTogX3Nob3VsZFRyYWNrRmllbGQodGhpcywgJ29zX25hbWUnKSA/IG9zTmFtZSB8fCBudWxsIDogbnVsbCxcbiAgICAgICAgb3NfdmVyc2lvbjogX3Nob3VsZFRyYWNrRmllbGQodGhpcywgJ29zX3ZlcnNpb24nKSA/IG9zVmVyc2lvbiB8fCBudWxsIDogbnVsbCxcbiAgICAgICAgZGV2aWNlX21vZGVsOiBfc2hvdWxkVHJhY2tGaWVsZCh0aGlzLCAnZGV2aWNlX21vZGVsJykgPyBkZXZpY2VNb2RlbCB8fCBudWxsIDogbnVsbCxcbiAgICAgICAgZGV2aWNlX21hbnVmYWN0dXJlcjogX3Nob3VsZFRyYWNrRmllbGQodGhpcywgJ2RldmljZV9tYW51ZmFjdHVyZXInKSA/IGRldmljZU1hbnVmYWN0dXJlciB8fCBudWxsIDogbnVsbCxcbiAgICAgICAgbGFuZ3VhZ2U6IF9zaG91bGRUcmFja0ZpZWxkKHRoaXMsICdsYW5ndWFnZScpID8gdGhpcy5vcHRpb25zLmxhbmd1YWdlIDogbnVsbCxcbiAgICAgICAgY2FycmllcjogX3Nob3VsZFRyYWNrRmllbGQodGhpcywgJ2NhcnJpZXInKSA/IGNhcnJpZXIgfHwgbnVsbCA6IG51bGwsXG4gICAgICAgIGFwaV9wcm9wZXJ0aWVzOiBhcGlQcm9wZXJ0aWVzLFxuICAgICAgICBldmVudF9wcm9wZXJ0aWVzOiB1dGlscy50cnVuY2F0ZSh1dGlscy52YWxpZGF0ZVByb3BlcnRpZXMoZXZlbnRQcm9wZXJ0aWVzKSksXG4gICAgICAgIHVzZXJfcHJvcGVydGllczogdXRpbHMudHJ1bmNhdGUodXRpbHMudmFsaWRhdGVQcm9wZXJ0aWVzKHVzZXJQcm9wZXJ0aWVzKSksXG4gICAgICAgIHV1aWQ6IHV1aWQoKSxcbiAgICAgICAgbGlicmFyeToge1xuICAgICAgICAgIG5hbWU6ICdhbXBsaXR1ZGUtanMnLFxuICAgICAgICAgIHZlcnNpb246IHZlcnNpb25cbiAgICAgICAgfSxcbiAgICAgICAgc2VxdWVuY2VfbnVtYmVyOiBzZXF1ZW5jZU51bWJlcixcbiAgICAgICAgLy8gZm9yIG9yZGVyaW5nIGV2ZW50cyBhbmQgaWRlbnRpZnlzXG4gICAgICAgIGdyb3VwczogdXRpbHMudHJ1bmNhdGUodXRpbHMudmFsaWRhdGVHcm91cHMoZ3JvdXBzKSksXG4gICAgICAgIGdyb3VwX3Byb3BlcnRpZXM6IHV0aWxzLnRydW5jYXRlKHV0aWxzLnZhbGlkYXRlUHJvcGVydGllcyhncm91cFByb3BlcnRpZXMpKSxcbiAgICAgICAgdXNlcl9hZ2VudDogdGhpcy5fdXNlckFnZW50XG4gICAgICB9O1xuXG4gICAgICBpZiAoZXZlbnRUeXBlID09PSBDb25zdGFudHMuSURFTlRJRllfRVZFTlQgfHwgZXZlbnRUeXBlID09PSBDb25zdGFudHMuR1JPVVBfSURFTlRJRllfRVZFTlQpIHtcbiAgICAgICAgdGhpcy5fdW5zZW50SWRlbnRpZnlzLnB1c2goe1xuICAgICAgICAgIGV2ZW50OiBldmVudCxcbiAgICAgICAgICBjYWxsYmFjazogY2FsbGJhY2tcbiAgICAgICAgfSk7XG5cbiAgICAgICAgdGhpcy5fbGltaXRFdmVudHNRdWV1ZWQodGhpcy5fdW5zZW50SWRlbnRpZnlzKTtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIHRoaXMuX3Vuc2VudEV2ZW50cy5wdXNoKHtcbiAgICAgICAgICBldmVudDogZXZlbnQsXG4gICAgICAgICAgY2FsbGJhY2s6IGNhbGxiYWNrXG4gICAgICAgIH0pO1xuXG4gICAgICAgIHRoaXMuX2xpbWl0RXZlbnRzUXVldWVkKHRoaXMuX3Vuc2VudEV2ZW50cyk7XG4gICAgICB9XG5cbiAgICAgIGlmICh0aGlzLm9wdGlvbnMuc2F2ZUV2ZW50cykge1xuICAgICAgICB0aGlzLnNhdmVFdmVudHMoKTtcbiAgICAgIH1cblxuICAgICAgdGhpcy5fc2VuZEV2ZW50c0lmUmVhZHkoY2FsbGJhY2spO1xuXG4gICAgICByZXR1cm4gZXZlbnRJZDtcbiAgICB9IGNhdGNoIChlKSB7XG4gICAgICB1dGlscy5sb2cuZXJyb3IoZSk7XG4gICAgfVxuICB9O1xuXG4gIHZhciBfc2hvdWxkVHJhY2tGaWVsZCA9IGZ1bmN0aW9uIF9zaG91bGRUcmFja0ZpZWxkKHNjb3BlLCBmaWVsZCkge1xuICAgIHJldHVybiAhIXNjb3BlLm9wdGlvbnMudHJhY2tpbmdPcHRpb25zW2ZpZWxkXTtcbiAgfTtcblxuICB2YXIgX2dlbmVyYXRlQXBpUHJvcGVydGllc1RyYWNraW5nQ29uZmlnID0gZnVuY3Rpb24gX2dlbmVyYXRlQXBpUHJvcGVydGllc1RyYWNraW5nQ29uZmlnKHNjb3BlKSB7XG4gICAgLy8gdG8gbGltaXQgc2l6ZSBvZiBjb25maWcgcGF5bG9hZCwgb25seSBzZW5kIGZpZWxkcyB0aGF0IGhhdmUgYmVlbiBkaXNhYmxlZFxuICAgIHZhciBmaWVsZHMgPSBbJ2NpdHknLCAnY291bnRyeScsICdkbWEnLCAnaXBfYWRkcmVzcycsICdyZWdpb24nXTtcbiAgICB2YXIgY29uZmlnID0ge307XG5cbiAgICBmb3IgKHZhciBpID0gMDsgaSA8IGZpZWxkcy5sZW5ndGg7IGkrKykge1xuICAgICAgdmFyIGZpZWxkID0gZmllbGRzW2ldO1xuXG4gICAgICBpZiAoIV9zaG91bGRUcmFja0ZpZWxkKHNjb3BlLCBmaWVsZCkpIHtcbiAgICAgICAgY29uZmlnW2ZpZWxkXSA9IGZhbHNlO1xuICAgICAgfVxuICAgIH1cblxuICAgIHJldHVybiBjb25maWc7XG4gIH07XG4gIC8qKlxuICAgKiBSZW1vdmUgb2xkIGV2ZW50cyBmcm9tIHRoZSBiZWdpbm5pbmcgb2YgdGhlIGFycmF5IGlmIHRvbyBtYW55IGhhdmUgYWNjdW11bGF0ZWQuIERlZmF1bHQgbGltaXQgaXMgMTAwMCBldmVudHMuXG4gICAqIEBwcml2YXRlXG4gICAqL1xuXG5cbiAgQW1wbGl0dWRlQ2xpZW50LnByb3RvdHlwZS5fbGltaXRFdmVudHNRdWV1ZWQgPSBmdW5jdGlvbiBfbGltaXRFdmVudHNRdWV1ZWQocXVldWUpIHtcbiAgICBpZiAocXVldWUubGVuZ3RoID4gdGhpcy5vcHRpb25zLnNhdmVkTWF4Q291bnQpIHtcbiAgICAgIHF1ZXVlLnNwbGljZSgwLCBxdWV1ZS5sZW5ndGggLSB0aGlzLm9wdGlvbnMuc2F2ZWRNYXhDb3VudCk7XG4gICAgfVxuICB9O1xuICAvKipcbiAgICogVGhpcyBpcyB0aGUgY2FsbGJhY2sgZm9yIGxvZ0V2ZW50IGFuZCBpZGVudGlmeSBjYWxscy4gSXQgZ2V0cyBjYWxsZWQgYWZ0ZXIgdGhlIGV2ZW50L2lkZW50aWZ5IGlzIHVwbG9hZGVkLFxuICAgKiBhbmQgdGhlIHNlcnZlciByZXNwb25zZSBjb2RlIGFuZCByZXNwb25zZSBib2R5IGZyb20gdGhlIHVwbG9hZCByZXF1ZXN0IGFyZSBwYXNzZWQgdG8gdGhlIGNhbGxiYWNrIGZ1bmN0aW9uLlxuICAgKiBAY2FsbGJhY2sgQW1wbGl0dWRlfmV2ZW50Q2FsbGJhY2tcbiAgICogQHBhcmFtIHtudW1iZXJ9IHJlc3BvbnNlQ29kZSAtIFNlcnZlciByZXNwb25zZSBjb2RlIGZvciB0aGUgZXZlbnQgLyBpZGVudGlmeSB1cGxvYWQgcmVxdWVzdC5cbiAgICogQHBhcmFtIHtzdHJpbmd9IHJlc3BvbnNlQm9keSAtIFNlcnZlciByZXNwb25zZSBib2R5IGZvciB0aGUgZXZlbnQgLyBpZGVudGlmeSB1cGxvYWQgcmVxdWVzdC5cbiAgICovXG5cbiAgLyoqXG4gICAqIExvZyBhbiBldmVudCB3aXRoIGV2ZW50VHlwZSBhbmQgZXZlbnRQcm9wZXJ0aWVzXG4gICAqIEBwdWJsaWNcbiAgICogQHBhcmFtIHtzdHJpbmd9IGV2ZW50VHlwZSAtIG5hbWUgb2YgZXZlbnRcbiAgICogQHBhcmFtIHtvYmplY3R9IGV2ZW50UHJvcGVydGllcyAtIChvcHRpb25hbCkgYW4gb2JqZWN0IHdpdGggc3RyaW5nIGtleXMgYW5kIHZhbHVlcyBmb3IgdGhlIGV2ZW50IHByb3BlcnRpZXMuXG4gICAqIEBwYXJhbSB7QW1wbGl0dWRlfmV2ZW50Q2FsbGJhY2t9IG9wdF9jYWxsYmFjayAtIChvcHRpb25hbCkgYSBjYWxsYmFjayBmdW5jdGlvbiB0byBydW4gYWZ0ZXIgdGhlIGV2ZW50IGlzIGxvZ2dlZC5cbiAgICogTm90ZTogdGhlIHNlcnZlciByZXNwb25zZSBjb2RlIGFuZCByZXNwb25zZSBib2R5IGZyb20gdGhlIGV2ZW50IHVwbG9hZCBhcmUgcGFzc2VkIHRvIHRoZSBjYWxsYmFjayBmdW5jdGlvbi5cbiAgICogQGV4YW1wbGUgYW1wbGl0dWRlQ2xpZW50LmxvZ0V2ZW50KCdDbGlja2VkIEhvbWVwYWdlIEJ1dHRvbicsIHsnZmluaXNoZWRfZmxvdyc6IGZhbHNlLCAnY2xpY2tzJzogMTV9KTtcbiAgICovXG5cblxuICBBbXBsaXR1ZGVDbGllbnQucHJvdG90eXBlLmxvZ0V2ZW50ID0gZnVuY3Rpb24gbG9nRXZlbnQoZXZlbnRUeXBlLCBldmVudFByb3BlcnRpZXMsIG9wdF9jYWxsYmFjaykge1xuICAgIGlmICh0aGlzLl9zaG91bGREZWZlckNhbGwoKSkge1xuICAgICAgcmV0dXJuIHRoaXMuX3EucHVzaChbJ2xvZ0V2ZW50J10uY29uY2F0KEFycmF5LnByb3RvdHlwZS5zbGljZS5jYWxsKGFyZ3VtZW50cywgMCkpKTtcbiAgICB9XG5cbiAgICByZXR1cm4gdGhpcy5sb2dFdmVudFdpdGhUaW1lc3RhbXAoZXZlbnRUeXBlLCBldmVudFByb3BlcnRpZXMsIG51bGwsIG9wdF9jYWxsYmFjayk7XG4gIH07XG4gIC8qKlxuICAgKiBMb2cgYW4gZXZlbnQgd2l0aCBldmVudFR5cGUgYW5kIGV2ZW50UHJvcGVydGllcyBhbmQgYSBjdXN0b20gdGltZXN0YW1wXG4gICAqIEBwdWJsaWNcbiAgICogQHBhcmFtIHtzdHJpbmd9IGV2ZW50VHlwZSAtIG5hbWUgb2YgZXZlbnRcbiAgICogQHBhcmFtIHtvYmplY3R9IGV2ZW50UHJvcGVydGllcyAtIChvcHRpb25hbCkgYW4gb2JqZWN0IHdpdGggc3RyaW5nIGtleXMgYW5kIHZhbHVlcyBmb3IgdGhlIGV2ZW50IHByb3BlcnRpZXMuXG4gICAqIEBwYXJhbSB7bnVtYmVyfSB0aW1lc3RhbXAgLSAob3B0aW9uYWwpIHRoZSBjdXN0b20gdGltZXN0YW1wIGFzIG1pbGxpc2Vjb25kcyBzaW5jZSBlcG9jaC5cbiAgICogQHBhcmFtIHtBbXBsaXR1ZGV+ZXZlbnRDYWxsYmFja30gb3B0X2NhbGxiYWNrIC0gKG9wdGlvbmFsKSBhIGNhbGxiYWNrIGZ1bmN0aW9uIHRvIHJ1biBhZnRlciB0aGUgZXZlbnQgaXMgbG9nZ2VkLlxuICAgKiBOb3RlOiB0aGUgc2VydmVyIHJlc3BvbnNlIGNvZGUgYW5kIHJlc3BvbnNlIGJvZHkgZnJvbSB0aGUgZXZlbnQgdXBsb2FkIGFyZSBwYXNzZWQgdG8gdGhlIGNhbGxiYWNrIGZ1bmN0aW9uLlxuICAgKiBAZXhhbXBsZSBhbXBsaXR1ZGVDbGllbnQubG9nRXZlbnQoJ0NsaWNrZWQgSG9tZXBhZ2UgQnV0dG9uJywgeydmaW5pc2hlZF9mbG93JzogZmFsc2UsICdjbGlja3MnOiAxNX0pO1xuICAgKi9cblxuXG4gIEFtcGxpdHVkZUNsaWVudC5wcm90b3R5cGUubG9nRXZlbnRXaXRoVGltZXN0YW1wID0gZnVuY3Rpb24gbG9nRXZlbnQoZXZlbnRUeXBlLCBldmVudFByb3BlcnRpZXMsIHRpbWVzdGFtcCwgb3B0X2NhbGxiYWNrKSB7XG4gICAgaWYgKHRoaXMuX3Nob3VsZERlZmVyQ2FsbCgpKSB7XG4gICAgICByZXR1cm4gdGhpcy5fcS5wdXNoKFsnbG9nRXZlbnRXaXRoVGltZXN0YW1wJ10uY29uY2F0KEFycmF5LnByb3RvdHlwZS5zbGljZS5jYWxsKGFyZ3VtZW50cywgMCkpKTtcbiAgICB9XG5cbiAgICBpZiAoIXRoaXMuX2FwaUtleVNldCgnbG9nRXZlbnQoKScpKSB7XG4gICAgICBpZiAodHlwZShvcHRfY2FsbGJhY2spID09PSAnZnVuY3Rpb24nKSB7XG4gICAgICAgIG9wdF9jYWxsYmFjaygwLCAnTm8gcmVxdWVzdCBzZW50Jywge1xuICAgICAgICAgIHJlYXNvbjogJ0FQSSBrZXkgbm90IHNldCdcbiAgICAgICAgfSk7XG4gICAgICB9XG5cbiAgICAgIHJldHVybiAtMTtcbiAgICB9XG5cbiAgICBpZiAoIXV0aWxzLnZhbGlkYXRlSW5wdXQoZXZlbnRUeXBlLCAnZXZlbnRUeXBlJywgJ3N0cmluZycpKSB7XG4gICAgICBpZiAodHlwZShvcHRfY2FsbGJhY2spID09PSAnZnVuY3Rpb24nKSB7XG4gICAgICAgIG9wdF9jYWxsYmFjaygwLCAnTm8gcmVxdWVzdCBzZW50Jywge1xuICAgICAgICAgIHJlYXNvbjogJ0ludmFsaWQgdHlwZSBmb3IgZXZlbnRUeXBlJ1xuICAgICAgICB9KTtcbiAgICAgIH1cblxuICAgICAgcmV0dXJuIC0xO1xuICAgIH1cblxuICAgIGlmICh1dGlscy5pc0VtcHR5U3RyaW5nKGV2ZW50VHlwZSkpIHtcbiAgICAgIGlmICh0eXBlKG9wdF9jYWxsYmFjaykgPT09ICdmdW5jdGlvbicpIHtcbiAgICAgICAgb3B0X2NhbGxiYWNrKDAsICdObyByZXF1ZXN0IHNlbnQnLCB7XG4gICAgICAgICAgcmVhc29uOiAnTWlzc2luZyBldmVudFR5cGUnXG4gICAgICAgIH0pO1xuICAgICAgfVxuXG4gICAgICByZXR1cm4gLTE7XG4gICAgfVxuXG4gICAgcmV0dXJuIHRoaXMuX2xvZ0V2ZW50KGV2ZW50VHlwZSwgZXZlbnRQcm9wZXJ0aWVzLCBudWxsLCBudWxsLCBudWxsLCBudWxsLCB0aW1lc3RhbXAsIG9wdF9jYWxsYmFjayk7XG4gIH07XG4gIC8qKlxuICAgKiBMb2cgYW4gZXZlbnQgd2l0aCBldmVudFR5cGUsIGV2ZW50UHJvcGVydGllcywgYW5kIGdyb3Vwcy4gVXNlIHRoaXMgdG8gc2V0IGV2ZW50LWxldmVsIGdyb3Vwcy5cbiAgICogTm90ZTogdGhlIGdyb3VwKHMpIHNldCBvbmx5IGFwcGx5IGZvciB0aGUgc3BlY2lmaWMgZXZlbnQgdHlwZSBiZWluZyBsb2dnZWQgYW5kIGRvZXMgbm90IHBlcnNpc3Qgb24gdGhlIHVzZXJcbiAgICogKHVubGVzcyB5b3UgZXhwbGljaXRseSBzZXQgaXQgd2l0aCBzZXRHcm91cCkuXG4gICAqIFNlZSB0aGUgW1NESyBSZWFkbWVde0BsaW5rIGh0dHBzOi8vZ2l0aHViLmNvbS9hbXBsaXR1ZGUvQW1wbGl0dWRlLUphdmFzY3JpcHQjc2V0dGluZy1ncm91cHN9IGZvciBtb3JlIGluZm9ybWF0aW9uXG4gICAqIGFib3V0IGdyb3VwcyBhbmQgQ291bnQgYnkgRGlzdGluY3Qgb24gdGhlIEFtcGxpdHVkZSBwbGF0Zm9ybS5cbiAgICogQHB1YmxpY1xuICAgKiBAcGFyYW0ge3N0cmluZ30gZXZlbnRUeXBlIC0gbmFtZSBvZiBldmVudFxuICAgKiBAcGFyYW0ge29iamVjdH0gZXZlbnRQcm9wZXJ0aWVzIC0gKG9wdGlvbmFsKSBhbiBvYmplY3Qgd2l0aCBzdHJpbmcga2V5cyBhbmQgdmFsdWVzIGZvciB0aGUgZXZlbnQgcHJvcGVydGllcy5cbiAgICogQHBhcmFtIHtvYmplY3R9IGdyb3VwcyAtIChvcHRpb25hbCkgYW4gb2JqZWN0IHdpdGggc3RyaW5nIGdyb3VwVHlwZTogZ3JvdXBOYW1lIHZhbHVlcyBmb3IgdGhlIGV2ZW50IGJlaW5nIGxvZ2dlZC5cbiAgICogZ3JvdXBOYW1lIGNhbiBiZSBhIHN0cmluZyBvciBhbiBhcnJheSBvZiBzdHJpbmdzLlxuICAgKiBAcGFyYW0ge0FtcGxpdHVkZX5ldmVudENhbGxiYWNrfSBvcHRfY2FsbGJhY2sgLSAob3B0aW9uYWwpIGEgY2FsbGJhY2sgZnVuY3Rpb24gdG8gcnVuIGFmdGVyIHRoZSBldmVudCBpcyBsb2dnZWQuXG4gICAqIE5vdGU6IHRoZSBzZXJ2ZXIgcmVzcG9uc2UgY29kZSBhbmQgcmVzcG9uc2UgYm9keSBmcm9tIHRoZSBldmVudCB1cGxvYWQgYXJlIHBhc3NlZCB0byB0aGUgY2FsbGJhY2sgZnVuY3Rpb24uXG4gICAqIEBleGFtcGxlIGFtcGxpdHVkZUNsaWVudC5sb2dFdmVudFdpdGhHcm91cHMoJ0NsaWNrZWQgQnV0dG9uJywgbnVsbCwgeydvcmdJZCc6IDI0fSk7XG4gICAqL1xuXG5cbiAgQW1wbGl0dWRlQ2xpZW50LnByb3RvdHlwZS5sb2dFdmVudFdpdGhHcm91cHMgPSBmdW5jdGlvbiAoZXZlbnRUeXBlLCBldmVudFByb3BlcnRpZXMsIGdyb3Vwcywgb3B0X2NhbGxiYWNrKSB7XG4gICAgaWYgKHRoaXMuX3Nob3VsZERlZmVyQ2FsbCgpKSB7XG4gICAgICByZXR1cm4gdGhpcy5fcS5wdXNoKFsnbG9nRXZlbnRXaXRoR3JvdXBzJ10uY29uY2F0KEFycmF5LnByb3RvdHlwZS5zbGljZS5jYWxsKGFyZ3VtZW50cywgMCkpKTtcbiAgICB9XG5cbiAgICBpZiAoIXRoaXMuX2FwaUtleVNldCgnbG9nRXZlbnRXaXRoR3JvdXBzKCknKSkge1xuICAgICAgaWYgKHR5cGUob3B0X2NhbGxiYWNrKSA9PT0gJ2Z1bmN0aW9uJykge1xuICAgICAgICBvcHRfY2FsbGJhY2soMCwgJ05vIHJlcXVlc3Qgc2VudCcsIHtcbiAgICAgICAgICByZWFzb246ICdBUEkga2V5IG5vdCBzZXQnXG4gICAgICAgIH0pO1xuICAgICAgfVxuXG4gICAgICByZXR1cm4gLTE7XG4gICAgfVxuXG4gICAgaWYgKCF1dGlscy52YWxpZGF0ZUlucHV0KGV2ZW50VHlwZSwgJ2V2ZW50VHlwZScsICdzdHJpbmcnKSkge1xuICAgICAgaWYgKHR5cGUob3B0X2NhbGxiYWNrKSA9PT0gJ2Z1bmN0aW9uJykge1xuICAgICAgICBvcHRfY2FsbGJhY2soMCwgJ05vIHJlcXVlc3Qgc2VudCcsIHtcbiAgICAgICAgICByZWFzb246ICdJbnZhbGlkIHR5cGUgZm9yIGV2ZW50VHlwZSdcbiAgICAgICAgfSk7XG4gICAgICB9XG5cbiAgICAgIHJldHVybiAtMTtcbiAgICB9XG5cbiAgICByZXR1cm4gdGhpcy5fbG9nRXZlbnQoZXZlbnRUeXBlLCBldmVudFByb3BlcnRpZXMsIG51bGwsIG51bGwsIGdyb3VwcywgbnVsbCwgbnVsbCwgb3B0X2NhbGxiYWNrKTtcbiAgfTtcbiAgLyoqXG4gICAqIFRlc3QgdGhhdCBuIGlzIGEgbnVtYmVyIG9yIGEgbnVtZXJpYyB2YWx1ZS5cbiAgICogQHByaXZhdGVcbiAgICovXG5cblxuICB2YXIgX2lzTnVtYmVyID0gZnVuY3Rpb24gX2lzTnVtYmVyKG4pIHtcbiAgICByZXR1cm4gIWlzTmFOKHBhcnNlRmxvYXQobikpICYmIGlzRmluaXRlKG4pO1xuICB9O1xuICAvKipcbiAgICogTG9nIHJldmVudWUgd2l0aCBSZXZlbnVlIGludGVyZmFjZS4gVGhlIG5ldyByZXZlbnVlIGludGVyZmFjZSBhbGxvd3MgZm9yIG1vcmUgcmV2ZW51ZSBmaWVsZHMgbGlrZVxuICAgKiByZXZlbnVlVHlwZSBhbmQgZXZlbnQgcHJvcGVydGllcy5cbiAgICogU2VlIFtSZWFkbWVde0BsaW5rIGh0dHBzOi8vZ2l0aHViLmNvbS9hbXBsaXR1ZGUvQW1wbGl0dWRlLUphdmFzY3JpcHQjdHJhY2tpbmctcmV2ZW51ZX1cbiAgICogZm9yIG1vcmUgaW5mb3JtYXRpb24gb24gdGhlIFJldmVudWUgaW50ZXJmYWNlIGFuZCBsb2dnaW5nIHJldmVudWUuXG4gICAqIEBwdWJsaWNcbiAgICogQHBhcmFtIHtSZXZlbnVlfSByZXZlbnVlX29iaiAtIHRoZSByZXZlbnVlIG9iamVjdCBjb250YWluaW5nIHRoZSByZXZlbnVlIGRhdGEgYmVpbmcgbG9nZ2VkLlxuICAgKiBAZXhhbXBsZSB2YXIgcmV2ZW51ZSA9IG5ldyBhbXBsaXR1ZGUuUmV2ZW51ZSgpLnNldFByb2R1Y3RJZCgncHJvZHVjdElkZW50aWZpZXInKS5zZXRQcmljZSgxMC45OSk7XG4gICAqIGFtcGxpdHVkZS5sb2dSZXZlbnVlVjIocmV2ZW51ZSk7XG4gICAqL1xuXG5cbiAgQW1wbGl0dWRlQ2xpZW50LnByb3RvdHlwZS5sb2dSZXZlbnVlVjIgPSBmdW5jdGlvbiBsb2dSZXZlbnVlVjIocmV2ZW51ZV9vYmopIHtcbiAgICBpZiAodGhpcy5fc2hvdWxkRGVmZXJDYWxsKCkpIHtcbiAgICAgIHJldHVybiB0aGlzLl9xLnB1c2goWydsb2dSZXZlbnVlVjInXS5jb25jYXQoQXJyYXkucHJvdG90eXBlLnNsaWNlLmNhbGwoYXJndW1lbnRzLCAwKSkpO1xuICAgIH1cblxuICAgIGlmICghdGhpcy5fYXBpS2V5U2V0KCdsb2dSZXZlbnVlVjIoKScpKSB7XG4gICAgICByZXR1cm47XG4gICAgfSAvLyBpZiByZXZlbnVlIGlucHV0IGlzIGEgcHJveGllZCBvYmplY3QgY3JlYXRlZCBieSB0aGUgYXN5bmMgbG9hZGluZyBzbmlwcGV0LCBjb252ZXJ0IGl0IGludG8gYW4gcmV2ZW51ZSBvYmplY3RcblxuXG4gICAgaWYgKHR5cGUocmV2ZW51ZV9vYmopID09PSAnb2JqZWN0JyAmJiByZXZlbnVlX29iai5oYXNPd25Qcm9wZXJ0eSgnX3EnKSkge1xuICAgICAgcmV2ZW51ZV9vYmogPSBfY29udmVydFByb3h5T2JqZWN0VG9SZWFsT2JqZWN0KG5ldyBSZXZlbnVlKCksIHJldmVudWVfb2JqKTtcbiAgICB9XG5cbiAgICBpZiAocmV2ZW51ZV9vYmogaW5zdGFuY2VvZiBSZXZlbnVlKSB7XG4gICAgICAvLyBvbmx5IHNlbmQgaWYgcmV2ZW51ZSBpcyB2YWxpZFxuICAgICAgaWYgKHJldmVudWVfb2JqICYmIHJldmVudWVfb2JqLl9pc1ZhbGlkUmV2ZW51ZSgpKSB7XG4gICAgICAgIHJldHVybiB0aGlzLmxvZ0V2ZW50KENvbnN0YW50cy5SRVZFTlVFX0VWRU5ULCByZXZlbnVlX29iai5fdG9KU09OT2JqZWN0KCkpO1xuICAgICAgfVxuICAgIH0gZWxzZSB7XG4gICAgICB1dGlscy5sb2cuZXJyb3IoJ0ludmFsaWQgcmV2ZW51ZSBpbnB1dCB0eXBlLiBFeHBlY3RlZCBSZXZlbnVlIG9iamVjdCBidXQgc2F3ICcgKyB0eXBlKHJldmVudWVfb2JqKSk7XG4gICAgfVxuICB9O1xuXG4gIHtcbiAgICAvKipcbiAgICAgKiBMb2cgcmV2ZW51ZSBldmVudCB3aXRoIGEgcHJpY2UsIHF1YW50aXR5LCBhbmQgcHJvZHVjdCBpZGVudGlmaWVyLiBERVBSRUNBVEVEIC0gdXNlIGxvZ1JldmVudWVWMlxuICAgICAqIEBwdWJsaWNcbiAgICAgKiBAZGVwcmVjYXRlZFxuICAgICAqIEBwYXJhbSB7bnVtYmVyfSBwcmljZSAtIHByaWNlIG9mIHJldmVudWUgZXZlbnRcbiAgICAgKiBAcGFyYW0ge251bWJlcn0gcXVhbnRpdHkgLSAob3B0aW9uYWwpIHF1YW50aXR5IG9mIHByb2R1Y3RzIGluIHJldmVudWUgZXZlbnQuIElmIG5vIHF1YW50aXR5IHNwZWNpZmllZCBkZWZhdWx0IHRvIDEuXG4gICAgICogQHBhcmFtIHtzdHJpbmd9IHByb2R1Y3QgLSAob3B0aW9uYWwpIHByb2R1Y3QgaWRlbnRpZmllclxuICAgICAqIEBleGFtcGxlIGFtcGxpdHVkZUNsaWVudC5sb2dSZXZlbnVlKDMuOTksIDEsICdwcm9kdWN0XzEyMzQnKTtcbiAgICAgKi9cbiAgICBBbXBsaXR1ZGVDbGllbnQucHJvdG90eXBlLmxvZ1JldmVudWUgPSBmdW5jdGlvbiBsb2dSZXZlbnVlKHByaWNlLCBxdWFudGl0eSwgcHJvZHVjdCkge1xuICAgICAgaWYgKHRoaXMuX3Nob3VsZERlZmVyQ2FsbCgpKSB7XG4gICAgICAgIHJldHVybiB0aGlzLl9xLnB1c2goWydsb2dSZXZlbnVlJ10uY29uY2F0KEFycmF5LnByb3RvdHlwZS5zbGljZS5jYWxsKGFyZ3VtZW50cywgMCkpKTtcbiAgICAgIH0gLy8gVGVzdCB0aGF0IHRoZSBwYXJhbWV0ZXJzIGFyZSBvZiB0aGUgcmlnaHQgdHlwZS5cblxuXG4gICAgICBpZiAoIXRoaXMuX2FwaUtleVNldCgnbG9nUmV2ZW51ZSgpJykgfHwgIV9pc051bWJlcihwcmljZSkgfHwgcXVhbnRpdHkgIT09IHVuZGVmaW5lZCAmJiAhX2lzTnVtYmVyKHF1YW50aXR5KSkge1xuICAgICAgICAvLyB1dGlscy5sb2coJ1ByaWNlIGFuZCBxdWFudGl0eSBhcmd1bWVudHMgdG8gbG9nUmV2ZW51ZSBtdXN0IGJlIG51bWJlcnMnKTtcbiAgICAgICAgcmV0dXJuIC0xO1xuICAgICAgfVxuXG4gICAgICByZXR1cm4gdGhpcy5fbG9nRXZlbnQoQ29uc3RhbnRzLlJFVkVOVUVfRVZFTlQsIHt9LCB7XG4gICAgICAgIHByb2R1Y3RJZDogcHJvZHVjdCxcbiAgICAgICAgc3BlY2lhbDogJ3JldmVudWVfYW1vdW50JyxcbiAgICAgICAgcXVhbnRpdHk6IHF1YW50aXR5IHx8IDEsXG4gICAgICAgIHByaWNlOiBwcmljZVxuICAgICAgfSwgbnVsbCwgbnVsbCwgbnVsbCwgbnVsbCwgbnVsbCk7XG4gICAgfTtcbiAgfVxuICAvKipcbiAgICogUmVtb3ZlIGV2ZW50cyBpbiBzdG9yYWdlIHdpdGggZXZlbnQgaWRzIHVwIHRvIGFuZCBpbmNsdWRpbmcgbWF4RXZlbnRJZC5cbiAgICogQHByaXZhdGVcbiAgICovXG5cblxuICBBbXBsaXR1ZGVDbGllbnQucHJvdG90eXBlLnJlbW92ZUV2ZW50cyA9IGZ1bmN0aW9uIHJlbW92ZUV2ZW50cyhtYXhFdmVudElkLCBtYXhJZGVudGlmeUlkLCBzdGF0dXMsIHJlc3BvbnNlKSB7XG4gICAgX3JlbW92ZUV2ZW50cyh0aGlzLCAnX3Vuc2VudEV2ZW50cycsIG1heEV2ZW50SWQsIHN0YXR1cywgcmVzcG9uc2UpO1xuXG4gICAgX3JlbW92ZUV2ZW50cyh0aGlzLCAnX3Vuc2VudElkZW50aWZ5cycsIG1heElkZW50aWZ5SWQsIHN0YXR1cywgcmVzcG9uc2UpO1xuICB9O1xuICAvKipcbiAgICogSGVscGVyIGZ1bmN0aW9uIHRvIHJlbW92ZSBldmVudHMgdXAgdG8gbWF4SWQgZnJvbSBhIHNpbmdsZSBxdWV1ZS5cbiAgICogRG9lcyBhIHRydWUgZmlsdGVyIGluIGNhc2UgZXZlbnRzIGdldCBvdXQgb2Ygb3JkZXIgb3Igb2xkIGV2ZW50cyBhcmUgcmVtb3ZlZC5cbiAgICogQHByaXZhdGVcbiAgICovXG5cblxuICB2YXIgX3JlbW92ZUV2ZW50cyA9IGZ1bmN0aW9uIF9yZW1vdmVFdmVudHMoc2NvcGUsIGV2ZW50UXVldWUsIG1heElkLCBzdGF0dXMsIHJlc3BvbnNlKSB7XG4gICAgaWYgKG1heElkIDwgMCkge1xuICAgICAgcmV0dXJuO1xuICAgIH1cblxuICAgIHZhciBmaWx0ZXJlZEV2ZW50cyA9IFtdO1xuXG4gICAgZm9yICh2YXIgaSA9IDA7IGkgPCBzY29wZVtldmVudFF1ZXVlXS5sZW5ndGggfHwgMDsgaSsrKSB7XG4gICAgICB2YXIgdW5zZW50RXZlbnQgPSBzY29wZVtldmVudFF1ZXVlXVtpXTtcblxuICAgICAgaWYgKHVuc2VudEV2ZW50LmV2ZW50LmV2ZW50X2lkID4gbWF4SWQpIHtcbiAgICAgICAgZmlsdGVyZWRFdmVudHMucHVzaCh1bnNlbnRFdmVudCk7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICBpZiAodW5zZW50RXZlbnQuY2FsbGJhY2spIHtcbiAgICAgICAgICB1bnNlbnRFdmVudC5jYWxsYmFjayhzdGF0dXMsIHJlc3BvbnNlKTtcbiAgICAgICAgfVxuICAgICAgfVxuICAgIH1cblxuICAgIHNjb3BlW2V2ZW50UXVldWVdID0gZmlsdGVyZWRFdmVudHM7XG4gIH07XG4gIC8qKlxuICAgKiBTZW5kIHVuc2VudCBldmVudHMuIE5vdGU6IHRoaXMgaXMgY2FsbGVkIGF1dG9tYXRpY2FsbHkgYWZ0ZXIgZXZlbnRzIGFyZSBsb2dnZWQgaWYgb3B0aW9uIGJhdGNoRXZlbnRzIGlzIGZhbHNlLlxuICAgKiBJZiBiYXRjaEV2ZW50cyBpcyB0cnVlLCB0aGVuIGV2ZW50cyBhcmUgb25seSBzZW50IHdoZW4gYmF0Y2ggY3JpdGVyaWFzIGFyZSBtZXQuXG4gICAqIEBwcml2YXRlXG4gICAqL1xuXG5cbiAgQW1wbGl0dWRlQ2xpZW50LnByb3RvdHlwZS5zZW5kRXZlbnRzID0gZnVuY3Rpb24gc2VuZEV2ZW50cygpIHtcbiAgICBpZiAoIXRoaXMuX2FwaUtleVNldCgnc2VuZEV2ZW50cygpJykpIHtcbiAgICAgIHRoaXMucmVtb3ZlRXZlbnRzKEluZmluaXR5LCBJbmZpbml0eSwgMCwgJ05vIHJlcXVlc3Qgc2VudCcsIHtcbiAgICAgICAgcmVhc29uOiAnQVBJIGtleSBub3Qgc2V0J1xuICAgICAgfSk7XG4gICAgICByZXR1cm47XG4gICAgfVxuXG4gICAgaWYgKHRoaXMub3B0aW9ucy5vcHRPdXQpIHtcbiAgICAgIHRoaXMucmVtb3ZlRXZlbnRzKEluZmluaXR5LCBJbmZpbml0eSwgMCwgJ05vIHJlcXVlc3Qgc2VudCcsIHtcbiAgICAgICAgcmVhc29uOiAnT3B0IG91dCBpcyBzZXQgdG8gdHJ1ZSdcbiAgICAgIH0pO1xuICAgICAgcmV0dXJuO1xuICAgIH0gLy8gSG93IGlzIGl0IHBvc3NpYmxlIHRvIGdldCBpbnRvIHRoaXMgc3RhdGU/XG5cblxuICAgIGlmICh0aGlzLl91bnNlbnRDb3VudCgpID09PSAwKSB7XG4gICAgICByZXR1cm47XG4gICAgfSAvLyBXZSBvbmx5IG1ha2Ugb25lIHJlcXVlc3QgYXQgYSB0aW1lLiBzZW5kRXZlbnRzIHdpbGwgYmUgaW52b2tlZCBhZ2FpbiBvbmNlXG4gICAgLy8gdGhlIGxhc3QgcmVxdWVzdCBjb21wbGV0ZXMuXG5cblxuICAgIGlmICh0aGlzLl9zZW5kaW5nKSB7XG4gICAgICByZXR1cm47XG4gICAgfVxuXG4gICAgdGhpcy5fc2VuZGluZyA9IHRydWU7XG4gICAgdmFyIHByb3RvY29sID0gdGhpcy5vcHRpb25zLmZvcmNlSHR0cHMgPyAnaHR0cHMnIDogJ2h0dHBzOicgPT09IHdpbmRvdy5sb2NhdGlvbi5wcm90b2NvbCA/ICdodHRwcycgOiAnaHR0cCc7XG4gICAgdmFyIHVybCA9IHByb3RvY29sICsgJzovLycgKyB0aGlzLm9wdGlvbnMuYXBpRW5kcG9pbnQ7IC8vIGZldGNoIGV2ZW50cyB0byBzZW5kXG5cbiAgICB2YXIgbnVtRXZlbnRzID0gTWF0aC5taW4odGhpcy5fdW5zZW50Q291bnQoKSwgdGhpcy5vcHRpb25zLnVwbG9hZEJhdGNoU2l6ZSk7XG5cbiAgICB2YXIgbWVyZ2VkRXZlbnRzID0gdGhpcy5fbWVyZ2VFdmVudHNBbmRJZGVudGlmeXMobnVtRXZlbnRzKTtcblxuICAgIHZhciBtYXhFdmVudElkID0gbWVyZ2VkRXZlbnRzLm1heEV2ZW50SWQ7XG4gICAgdmFyIG1heElkZW50aWZ5SWQgPSBtZXJnZWRFdmVudHMubWF4SWRlbnRpZnlJZDtcbiAgICB2YXIgZXZlbnRzID0gSlNPTi5zdHJpbmdpZnkobWVyZ2VkRXZlbnRzLmV2ZW50c1RvU2VuZC5tYXAoZnVuY3Rpb24gKF9yZWYyKSB7XG4gICAgICB2YXIgZXZlbnQgPSBfcmVmMi5ldmVudDtcbiAgICAgIHJldHVybiBldmVudDtcbiAgICB9KSk7XG4gICAgdmFyIHVwbG9hZFRpbWUgPSBuZXcgRGF0ZSgpLmdldFRpbWUoKTtcbiAgICB2YXIgZGF0YSA9IHtcbiAgICAgIGNsaWVudDogdGhpcy5vcHRpb25zLmFwaUtleSxcbiAgICAgIGU6IGV2ZW50cyxcbiAgICAgIHY6IENvbnN0YW50cy5BUElfVkVSU0lPTixcbiAgICAgIHVwbG9hZF90aW1lOiB1cGxvYWRUaW1lLFxuICAgICAgY2hlY2tzdW06IG1kNShDb25zdGFudHMuQVBJX1ZFUlNJT04gKyB0aGlzLm9wdGlvbnMuYXBpS2V5ICsgZXZlbnRzICsgdXBsb2FkVGltZSlcbiAgICB9O1xuICAgIHZhciBzY29wZSA9IHRoaXM7XG4gICAgbmV3IFJlcXVlc3QodXJsLCBkYXRhKS5zZW5kKGZ1bmN0aW9uIChzdGF0dXMsIHJlc3BvbnNlKSB7XG4gICAgICBzY29wZS5fc2VuZGluZyA9IGZhbHNlO1xuXG4gICAgICB0cnkge1xuICAgICAgICBpZiAoc3RhdHVzID09PSAyMDAgJiYgcmVzcG9uc2UgPT09ICdzdWNjZXNzJykge1xuICAgICAgICAgIHNjb3BlLnJlbW92ZUV2ZW50cyhtYXhFdmVudElkLCBtYXhJZGVudGlmeUlkLCBzdGF0dXMsIHJlc3BvbnNlKTsgLy8gVXBkYXRlIHRoZSBldmVudCBjYWNoZSBhZnRlciB0aGUgcmVtb3ZhbCBvZiBzZW50IGV2ZW50cy5cblxuICAgICAgICAgIGlmIChzY29wZS5vcHRpb25zLnNhdmVFdmVudHMpIHtcbiAgICAgICAgICAgIHNjb3BlLnNhdmVFdmVudHMoKTtcbiAgICAgICAgICB9IC8vIFNlbmQgbW9yZSBldmVudHMgaWYgYW55IHF1ZXVlZCBkdXJpbmcgcHJldmlvdXMgc2VuZC5cblxuXG4gICAgICAgICAgc2NvcGUuX3NlbmRFdmVudHNJZlJlYWR5KCk7IC8vIGhhbmRsZSBwYXlsb2FkIHRvbyBsYXJnZVxuXG4gICAgICAgIH0gZWxzZSBpZiAoc3RhdHVzID09PSA0MTMpIHtcbiAgICAgICAgICAvLyB1dGlscy5sb2coJ3JlcXVlc3QgdG9vIGxhcmdlJyk7XG4gICAgICAgICAgLy8gQ2FuJ3QgZXZlbiBnZXQgdGhpcyBvbmUgbWFzc2l2ZSBldmVudCB0aHJvdWdoLiBEcm9wIGl0LCBldmVuIGlmIGl0IGlzIGFuIGlkZW50aWZ5LlxuICAgICAgICAgIGlmIChzY29wZS5vcHRpb25zLnVwbG9hZEJhdGNoU2l6ZSA9PT0gMSkge1xuICAgICAgICAgICAgc2NvcGUucmVtb3ZlRXZlbnRzKG1heEV2ZW50SWQsIG1heElkZW50aWZ5SWQsIHN0YXR1cywgcmVzcG9uc2UpO1xuICAgICAgICAgIH0gLy8gVGhlIHNlcnZlciBjb21wbGFpbmVkIGFib3V0IHRoZSBsZW5ndGggb2YgdGhlIHJlcXVlc3QuIEJhY2tvZmYgYW5kIHRyeSBhZ2Fpbi5cblxuXG4gICAgICAgICAgc2NvcGUub3B0aW9ucy51cGxvYWRCYXRjaFNpemUgPSBNYXRoLmNlaWwobnVtRXZlbnRzIC8gMik7XG4gICAgICAgICAgc2NvcGUuc2VuZEV2ZW50cygpO1xuICAgICAgICB9IC8vIGVsc2Uge1xuICAgICAgICAvLyAgYWxsIHRoZSBldmVudHMgYXJlIHN0aWxsIHF1ZXVlZCwgYW5kIHdpbGwgYmUgcmV0cmllZCB3aGVuIHRoZSBuZXh0XG4gICAgICAgIC8vICBldmVudCBpcyBzZW50IEluIHRoZSBpbnRlcmVzdCBvZiBkZWJ1Z2dpbmcsIGl0IHdvdWxkIGJlIG5pY2UgdG8gaGF2ZVxuICAgICAgICAvLyAgc29tZXRoaW5nIGxpa2UgYW4gZXZlbnQgZW1pdHRlciBmb3IgYSBiZXR0ZXIgZGVidWdnaW5nIGV4cGVyaW5jZVxuICAgICAgICAvLyAgaGVyZS5cbiAgICAgICAgLy8gfVxuXG4gICAgICB9IGNhdGNoIChlKSB7Ly8gdXRpbHMubG9nKCdmYWlsZWQgdXBsb2FkJyk7XG4gICAgICB9XG4gICAgfSk7XG4gIH07XG4gIC8qKlxuICAgKiBNZXJnZSB1bnNlbnQgZXZlbnRzIGFuZCBpZGVudGlmeXMgdG9nZXRoZXIgaW4gc2VxdWVudGlhbCBvcmRlciBiYXNlZCBvbiB0aGVpciBzZXF1ZW5jZSBudW1iZXIsIGZvciB1cGxvYWRpbmcuXG4gICAqIEBwcml2YXRlXG4gICAqL1xuXG5cbiAgQW1wbGl0dWRlQ2xpZW50LnByb3RvdHlwZS5fbWVyZ2VFdmVudHNBbmRJZGVudGlmeXMgPSBmdW5jdGlvbiBfbWVyZ2VFdmVudHNBbmRJZGVudGlmeXMobnVtRXZlbnRzKSB7XG4gICAgLy8gY29hbGVzY2UgZXZlbnRzIGZyb20gYm90aCBxdWV1ZXNcbiAgICB2YXIgZXZlbnRzVG9TZW5kID0gW107XG4gICAgdmFyIGV2ZW50SW5kZXggPSAwO1xuICAgIHZhciBtYXhFdmVudElkID0gLTE7XG4gICAgdmFyIGlkZW50aWZ5SW5kZXggPSAwO1xuICAgIHZhciBtYXhJZGVudGlmeUlkID0gLTE7XG5cbiAgICB3aGlsZSAoZXZlbnRzVG9TZW5kLmxlbmd0aCA8IG51bUV2ZW50cykge1xuICAgICAgdmFyIHVuc2VudEV2ZW50ID0gdm9pZCAwO1xuICAgICAgdmFyIG5vSWRlbnRpZnlzID0gaWRlbnRpZnlJbmRleCA+PSB0aGlzLl91bnNlbnRJZGVudGlmeXMubGVuZ3RoO1xuICAgICAgdmFyIG5vRXZlbnRzID0gZXZlbnRJbmRleCA+PSB0aGlzLl91bnNlbnRFdmVudHMubGVuZ3RoOyAvLyBjYXNlIDA6IG5vIGV2ZW50cyBvciBpZGVudGlmeXMgbGVmdFxuICAgICAgLy8gbm90ZSB0aGlzIHNob3VsZCBub3QgaGFwcGVuLCB0aGlzIG1lYW5zIHdlIGhhdmUgbGVzcyBldmVudHMgYW5kIGlkZW50aWZ5cyB0aGFuIGV4cGVjdGVkXG5cbiAgICAgIGlmIChub0V2ZW50cyAmJiBub0lkZW50aWZ5cykge1xuICAgICAgICB1dGlscy5sb2cuZXJyb3IoJ01lcmdpbmcgRXZlbnRzIGFuZCBJZGVudGlmeXMsIGxlc3MgZXZlbnRzIGFuZCBpZGVudGlmeXMgdGhhbiBleHBlY3RlZCcpO1xuICAgICAgICBicmVhaztcbiAgICAgIH0gLy8gY2FzZSAxOiBubyBpZGVudGlmeXMgLSBncmFiIGZyb20gZXZlbnRzXG4gICAgICBlbHNlIGlmIChub0lkZW50aWZ5cykge1xuICAgICAgICAgIHVuc2VudEV2ZW50ID0gdGhpcy5fdW5zZW50RXZlbnRzW2V2ZW50SW5kZXgrK107XG4gICAgICAgICAgbWF4RXZlbnRJZCA9IHVuc2VudEV2ZW50LmV2ZW50LmV2ZW50X2lkOyAvLyBjYXNlIDI6IG5vIGV2ZW50cyAtIGdyYWIgZnJvbSBpZGVudGlmeXNcbiAgICAgICAgfSBlbHNlIGlmIChub0V2ZW50cykge1xuICAgICAgICAgIHVuc2VudEV2ZW50ID0gdGhpcy5fdW5zZW50SWRlbnRpZnlzW2lkZW50aWZ5SW5kZXgrK107XG4gICAgICAgICAgbWF4SWRlbnRpZnlJZCA9IHVuc2VudEV2ZW50LmV2ZW50LmV2ZW50X2lkOyAvLyBjYXNlIDM6IG5lZWQgdG8gY29tcGFyZSBzZXF1ZW5jZSBudW1iZXJzXG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgLy8gZXZlbnRzIGxvZ2dlZCBiZWZvcmUgdjIuNS4wIHdvbid0IGhhdmUgYSBzZXF1ZW5jZSBudW1iZXIsIHB1dCB0aG9zZSBmaXJzdFxuICAgICAgICAgIGlmICghKCdzZXF1ZW5jZV9udW1iZXInIGluIHRoaXMuX3Vuc2VudEV2ZW50c1tldmVudEluZGV4XS5ldmVudCkgfHwgdGhpcy5fdW5zZW50RXZlbnRzW2V2ZW50SW5kZXhdLmV2ZW50LnNlcXVlbmNlX251bWJlciA8IHRoaXMuX3Vuc2VudElkZW50aWZ5c1tpZGVudGlmeUluZGV4XS5ldmVudC5zZXF1ZW5jZV9udW1iZXIpIHtcbiAgICAgICAgICAgIHVuc2VudEV2ZW50ID0gdGhpcy5fdW5zZW50RXZlbnRzW2V2ZW50SW5kZXgrK107XG4gICAgICAgICAgICBtYXhFdmVudElkID0gdW5zZW50RXZlbnQuZXZlbnQuZXZlbnRfaWQ7XG4gICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIHVuc2VudEV2ZW50ID0gdGhpcy5fdW5zZW50SWRlbnRpZnlzW2lkZW50aWZ5SW5kZXgrK107XG4gICAgICAgICAgICBtYXhJZGVudGlmeUlkID0gdW5zZW50RXZlbnQuZXZlbnQuZXZlbnRfaWQ7XG4gICAgICAgICAgfVxuICAgICAgICB9XG5cbiAgICAgIGV2ZW50c1RvU2VuZC5wdXNoKHVuc2VudEV2ZW50KTtcbiAgICB9XG5cbiAgICByZXR1cm4ge1xuICAgICAgZXZlbnRzVG9TZW5kOiBldmVudHNUb1NlbmQsXG4gICAgICBtYXhFdmVudElkOiBtYXhFdmVudElkLFxuICAgICAgbWF4SWRlbnRpZnlJZDogbWF4SWRlbnRpZnlJZFxuICAgIH07XG4gIH07XG5cbiAge1xuICAgIC8qKlxuICAgICAqIFNldCBnbG9iYWwgdXNlciBwcm9wZXJ0aWVzLiBOb3RlIHRoaXMgaXMgZGVwcmVjYXRlZCwgYW5kIHdlIHJlY29tbWVuZCB1c2luZyBzZXRVc2VyUHJvcGVydGllc1xuICAgICAqIEBwdWJsaWNcbiAgICAgKiBAZGVwcmVjYXRlZFxuICAgICAqL1xuICAgIEFtcGxpdHVkZUNsaWVudC5wcm90b3R5cGUuc2V0R2xvYmFsVXNlclByb3BlcnRpZXMgPSBmdW5jdGlvbiBzZXRHbG9iYWxVc2VyUHJvcGVydGllcyh1c2VyUHJvcGVydGllcykge1xuICAgICAgdGhpcy5zZXRVc2VyUHJvcGVydGllcyh1c2VyUHJvcGVydGllcyk7XG4gICAgfTtcbiAgfVxuICAvKipcbiAgICogR2V0IHRoZSBjdXJyZW50IHZlcnNpb24gb2YgQW1wbGl0dWRlJ3MgSmF2YXNjcmlwdCBTREsuXG4gICAqIEBwdWJsaWNcbiAgICogQHJldHVybnMge251bWJlcn0gdmVyc2lvbiBudW1iZXJcbiAgICogQGV4YW1wbGUgdmFyIGFtcGxpdHVkZVZlcnNpb24gPSBhbXBsaXR1ZGUuX19WRVJTSU9OX187XG4gICAqL1xuXG5cbiAgQW1wbGl0dWRlQ2xpZW50LnByb3RvdHlwZS5fX1ZFUlNJT05fXyA9IHZlcnNpb247XG4gIC8qKlxuICAgKiBEZXRlcm1pbmVzIHdoZXRoZXIgb3Igbm90IHRvIHB1c2ggY2FsbCB0byB0aGlzLl9xIG9yIGludm9rZSBpdFxuICAgKiBAcHJpdmF0ZVxuICAgKi9cblxuICBBbXBsaXR1ZGVDbGllbnQucHJvdG90eXBlLl9zaG91bGREZWZlckNhbGwgPSBmdW5jdGlvbiBfc2hvdWxkRGVmZXJDYWxsKCkge1xuICAgIHJldHVybiB0aGlzLl9wZW5kaW5nUmVhZFN0b3JhZ2UgfHwgdGhpcy5faW5pdGlhbGl6YXRpb25EZWZlcnJlZDtcbiAgfTtcbiAgLyoqXG4gICAqIERlZmVycyBJbml0aWFsaXphdGlvbiBieSBwdXR0aW5nIGFsbCBmdW5jdGlvbnMgaW50byBzdG9yYWdlIHVudGlsIHVzZXJzXG4gICAqIGhhdmUgYWNjZXB0ZWQgdGVybXMgZm9yIHRyYWNraW5nXG4gICAqIEBwcml2YXRlXG4gICAqL1xuXG5cbiAgQW1wbGl0dWRlQ2xpZW50LnByb3RvdHlwZS5fZGVmZXJJbml0aWFsaXphdGlvbiA9IGZ1bmN0aW9uIF9kZWZlckluaXRpYWxpemF0aW9uKCkge1xuICAgIHRoaXMuX2luaXRpYWxpemF0aW9uRGVmZXJyZWQgPSB0cnVlO1xuXG4gICAgdGhpcy5fcS5wdXNoKFsnaW5pdCddLmNvbmNhdChBcnJheS5wcm90b3R5cGUuc2xpY2UuY2FsbChhcmd1bWVudHMsIDApKSk7XG4gIH07XG4gIC8qKlxuICAgKiBFbmFibGUgdHJhY2tpbmcgdmlhIGxvZ2dpbmcgZXZlbnRzIGFuZCBkcm9wcGluZyBhIGNvb2tpZVxuICAgKiBJbnRlbmRlZCB0byBiZSB1c2VkIHdpdGggdGhlIGRlZmVySW5pdGlhbGl6YXRpb24gY29uZmlndXJhdGlvbiBmbGFnXG4gICAqIFRoaXMgd2lsbCBkcm9wIGEgY29va2llIGFuZCByZXNldCBpbml0aWFsaXphdGlvbiBkZWZlcnJlZFxuICAgKiBAcHVibGljXG4gICAqL1xuXG5cbiAgQW1wbGl0dWRlQ2xpZW50LnByb3RvdHlwZS5lbmFibGVUcmFja2luZyA9IGZ1bmN0aW9uIGVuYWJsZVRyYWNraW5nKCkge1xuICAgIC8vIFRoaXMgd2lsbCBjYWxsIGluaXQgKHdoaWNoIGRyb3BzIHRoZSBjb29raWUpIGFuZCB3aWxsIHJ1biBhbnkgcGVuZGluZyB0YXNrc1xuICAgIHRoaXMuX2luaXRpYWxpemF0aW9uRGVmZXJyZWQgPSBmYWxzZTtcblxuICAgIF9zYXZlQ29va2llRGF0YSh0aGlzKTtcblxuICAgIHRoaXMucnVuUXVldWVkRnVuY3Rpb25zKCk7XG4gIH07XG5cbiAgLyoqXG4gICAqIEFtcGxpdHVkZSBTREsgQVBJIC0gaW5zdGFuY2UgbWFuYWdlci5cbiAgICogRnVuY3Rpb24gY2FsbHMgZGlyZWN0bHkgb24gYW1wbGl0dWRlIGhhdmUgYmVlbiBkZXByZWNhdGVkLiBQbGVhc2UgY2FsbCBtZXRob2RzIG9uIHRoZSBkZWZhdWx0IHNoYXJlZCBpbnN0YW5jZTogYW1wbGl0dWRlLmdldEluc3RhbmNlKCkgaW5zdGVhZC5cbiAgICogU2VlIFtSZWFkbWVde0BsaW5rIGh0dHBzOi8vZ2l0aHViLmNvbS9hbXBsaXR1ZGUvQW1wbGl0dWRlLUphdmFzY3JpcHQjMzAwLXVwZGF0ZS1hbmQtbG9nZ2luZy1ldmVudHMtdG8tbXVsdGlwbGUtYW1wbGl0dWRlLWFwcHN9IGZvciBtb3JlIGluZm9ybWF0aW9uIGFib3V0IHRoaXMgY2hhbmdlLlxuICAgKiBAY29uc3RydWN0b3IgQW1wbGl0dWRlXG4gICAqIEBwdWJsaWNcbiAgICogQGV4YW1wbGUgdmFyIGFtcGxpdHVkZSA9IG5ldyBBbXBsaXR1ZGUoKTtcbiAgICovXG5cbiAgdmFyIEFtcGxpdHVkZSA9IGZ1bmN0aW9uIEFtcGxpdHVkZSgpIHtcbiAgICB0aGlzLm9wdGlvbnMgPSBfb2JqZWN0U3ByZWFkKHt9LCBERUZBVUxUX09QVElPTlMpO1xuICAgIHRoaXMuX3EgPSBbXTtcbiAgICB0aGlzLl9pbnN0YW5jZXMgPSB7fTsgLy8gbWFwcGluZyBvZiBpbnN0YW5jZSBuYW1lcyB0byBpbnN0YW5jZXNcbiAgfTtcblxuICBBbXBsaXR1ZGUucHJvdG90eXBlLklkZW50aWZ5ID0gSWRlbnRpZnk7XG4gIEFtcGxpdHVkZS5wcm90b3R5cGUuUmV2ZW51ZSA9IFJldmVudWU7XG5cbiAgQW1wbGl0dWRlLnByb3RvdHlwZS5nZXRJbnN0YW5jZSA9IGZ1bmN0aW9uIGdldEluc3RhbmNlKGluc3RhbmNlKSB7XG4gICAgaW5zdGFuY2UgPSB1dGlscy5pc0VtcHR5U3RyaW5nKGluc3RhbmNlKSA/IENvbnN0YW50cy5ERUZBVUxUX0lOU1RBTkNFIDogaW5zdGFuY2UudG9Mb3dlckNhc2UoKTtcbiAgICB2YXIgY2xpZW50ID0gdGhpcy5faW5zdGFuY2VzW2luc3RhbmNlXTtcblxuICAgIGlmIChjbGllbnQgPT09IHVuZGVmaW5lZCkge1xuICAgICAgY2xpZW50ID0gbmV3IEFtcGxpdHVkZUNsaWVudChpbnN0YW5jZSk7XG4gICAgICB0aGlzLl9pbnN0YW5jZXNbaW5zdGFuY2VdID0gY2xpZW50O1xuICAgIH1cblxuICAgIHJldHVybiBjbGllbnQ7XG4gIH07XG5cbiAge1xuICAgIC8qKlxuICAgICAqIFJ1biBmdW5jdGlvbnMgcXVldWVkIHVwIGJ5IHByb3h5IGxvYWRpbmcgc25pcHBldFxuICAgICAqIEBwcml2YXRlXG4gICAgICovXG4gICAgQW1wbGl0dWRlLnByb3RvdHlwZS5ydW5RdWV1ZWRGdW5jdGlvbnMgPSBmdW5jdGlvbiAoKSB7XG4gICAgICAvLyBydW4gcXVldWVkIHVwIG9sZCB2ZXJzaW9ucyBvZiBmdW5jdGlvbnNcbiAgICAgIGZvciAodmFyIGkgPSAwOyBpIDwgdGhpcy5fcS5sZW5ndGg7IGkrKykge1xuICAgICAgICB2YXIgZm4gPSB0aGlzW3RoaXMuX3FbaV1bMF1dO1xuXG4gICAgICAgIGlmICh0eXBlKGZuKSA9PT0gJ2Z1bmN0aW9uJykge1xuICAgICAgICAgIGZuLmFwcGx5KHRoaXMsIHRoaXMuX3FbaV0uc2xpY2UoMSkpO1xuICAgICAgICB9XG4gICAgICB9XG5cbiAgICAgIHRoaXMuX3EgPSBbXTsgLy8gY2xlYXIgZnVuY3Rpb24gcXVldWUgYWZ0ZXIgcnVubmluZ1xuICAgICAgLy8gcnVuIHF1ZXVlZCB1cCBmdW5jdGlvbnMgb24gaW5zdGFuY2VzXG5cbiAgICAgIGZvciAodmFyIGluc3RhbmNlIGluIHRoaXMuX2luc3RhbmNlcykge1xuICAgICAgICBpZiAodGhpcy5faW5zdGFuY2VzLmhhc093blByb3BlcnR5KGluc3RhbmNlKSkge1xuICAgICAgICAgIHRoaXMuX2luc3RhbmNlc1tpbnN0YW5jZV0ucnVuUXVldWVkRnVuY3Rpb25zKCk7XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICB9O1xuICB9XG5cbiAge1xuICAgIC8qKlxuICAgICAqIEluaXRpYWxpemVzIHRoZSBBbXBsaXR1ZGUgSmF2YXNjcmlwdCBTREsgd2l0aCB5b3VyIGFwaUtleSBhbmQgYW55IG9wdGlvbmFsIGNvbmZpZ3VyYXRpb25zLlxuICAgICAqIFRoaXMgaXMgcmVxdWlyZWQgYmVmb3JlIGFueSBvdGhlciBtZXRob2RzIGNhbiBiZSBjYWxsZWQuXG4gICAgICogQHB1YmxpY1xuICAgICAqIEBwYXJhbSB7c3RyaW5nfSBhcGlLZXkgLSBUaGUgQVBJIGtleSBmb3IgeW91ciBhcHAuXG4gICAgICogQHBhcmFtIHtzdHJpbmd9IG9wdF91c2VySWQgLSAob3B0aW9uYWwpIEFuIGlkZW50aWZpZXIgZm9yIHRoaXMgdXNlci5cbiAgICAgKiBAcGFyYW0ge29iamVjdH0gb3B0X2NvbmZpZyAtIChvcHRpb25hbCkgQ29uZmlndXJhdGlvbiBvcHRpb25zLlxuICAgICAqIFNlZSBbUmVhZG1lXXtAbGluayBodHRwczovL2dpdGh1Yi5jb20vYW1wbGl0dWRlL0FtcGxpdHVkZS1KYXZhc2NyaXB0I2NvbmZpZ3VyYXRpb24tb3B0aW9uc30gZm9yIGxpc3Qgb2Ygb3B0aW9ucyBhbmQgZGVmYXVsdCB2YWx1ZXMuXG4gICAgICogQHBhcmFtIHtmdW5jdGlvbn0gb3B0X2NhbGxiYWNrIC0gKG9wdGlvbmFsKSBQcm92aWRlIGEgY2FsbGJhY2sgZnVuY3Rpb24gdG8gcnVuIGFmdGVyIGluaXRpYWxpemF0aW9uIGlzIGNvbXBsZXRlLlxuICAgICAqIEBkZXByZWNhdGVkIFBsZWFzZSB1c2UgYW1wbGl0dWRlLmdldEluc3RhbmNlKCkuaW5pdChhcGlLZXksIG9wdF91c2VySWQsIG9wdF9jb25maWcsIG9wdF9jYWxsYmFjayk7XG4gICAgICogQGV4YW1wbGUgYW1wbGl0dWRlLmluaXQoJ0FQSV9LRVknLCAnVVNFUl9JRCcsIHtpbmNsdWRlUmVmZXJyZXI6IHRydWUsIGluY2x1ZGVVdG06IHRydWV9LCBmdW5jdGlvbigpIHsgYWxlcnQoJ2luaXQgY29tcGxldGUnKTsgfSk7XG4gICAgICovXG4gICAgQW1wbGl0dWRlLnByb3RvdHlwZS5pbml0ID0gZnVuY3Rpb24gaW5pdChhcGlLZXksIG9wdF91c2VySWQsIG9wdF9jb25maWcsIG9wdF9jYWxsYmFjaykge1xuICAgICAgdGhpcy5nZXRJbnN0YW5jZSgpLmluaXQoYXBpS2V5LCBvcHRfdXNlcklkLCBvcHRfY29uZmlnLCBmdW5jdGlvbiAoaW5zdGFuY2UpIHtcbiAgICAgICAgLy8gbWFrZSBvcHRpb25zIHN1Y2ggYXMgZGV2aWNlSWQgYXZhaWxhYmxlIGZvciBjYWxsYmFjayBmdW5jdGlvbnNcbiAgICAgICAgdGhpcy5vcHRpb25zID0gaW5zdGFuY2Uub3B0aW9ucztcblxuICAgICAgICBpZiAodHlwZShvcHRfY2FsbGJhY2spID09PSAnZnVuY3Rpb24nKSB7XG4gICAgICAgICAgb3B0X2NhbGxiYWNrKGluc3RhbmNlKTtcbiAgICAgICAgfVxuICAgICAgfS5iaW5kKHRoaXMpKTtcbiAgICB9O1xuICAgIC8qKlxuICAgICAqIFJldHVybnMgdHJ1ZSBpZiBhIG5ldyBzZXNzaW9uIHdhcyBjcmVhdGVkIGR1cmluZyBpbml0aWFsaXphdGlvbiwgb3RoZXJ3aXNlIGZhbHNlLlxuICAgICAqIEBwdWJsaWNcbiAgICAgKiBAcmV0dXJuIHtib29sZWFufSBXaGV0aGVyIGEgbmV3IHNlc3Npb24gd2FzIGNyZWF0ZWQgZHVyaW5nIGluaXRpYWxpemF0aW9uLlxuICAgICAqIEBkZXByZWNhdGVkIFBsZWFzZSB1c2UgYW1wbGl0dWRlLmdldEluc3RhbmNlKCkuaXNOZXdTZXNzaW9uKCk7XG4gICAgICovXG5cblxuICAgIEFtcGxpdHVkZS5wcm90b3R5cGUuaXNOZXdTZXNzaW9uID0gZnVuY3Rpb24gaXNOZXdTZXNzaW9uKCkge1xuICAgICAgcmV0dXJuIHRoaXMuZ2V0SW5zdGFuY2UoKS5pc05ld1Nlc3Npb24oKTtcbiAgICB9O1xuICAgIC8qKlxuICAgICAqIFJldHVybnMgdGhlIGlkIG9mIHRoZSBjdXJyZW50IHNlc3Npb24uXG4gICAgICogQHB1YmxpY1xuICAgICAqIEByZXR1cm4ge251bWJlcn0gSWQgb2YgdGhlIGN1cnJlbnQgc2Vzc2lvbi5cbiAgICAgKiBAZGVwcmVjYXRlZCBQbGVhc2UgdXNlIGFtcGxpdHVkZS5nZXRJbnN0YW5jZSgpLmdldFNlc3Npb25JZCgpO1xuICAgICAqL1xuXG5cbiAgICBBbXBsaXR1ZGUucHJvdG90eXBlLmdldFNlc3Npb25JZCA9IGZ1bmN0aW9uIGdldFNlc3Npb25JZCgpIHtcbiAgICAgIHJldHVybiB0aGlzLmdldEluc3RhbmNlKCkuZ2V0U2Vzc2lvbklkKCk7XG4gICAgfTtcbiAgICAvKipcbiAgICAgKiBJbmNyZW1lbnRzIHRoZSBldmVudElkIGFuZCByZXR1cm5zIGl0LlxuICAgICAqIEBwcml2YXRlXG4gICAgICovXG5cblxuICAgIEFtcGxpdHVkZS5wcm90b3R5cGUubmV4dEV2ZW50SWQgPSBmdW5jdGlvbiBuZXh0RXZlbnRJZCgpIHtcbiAgICAgIHJldHVybiB0aGlzLmdldEluc3RhbmNlKCkubmV4dEV2ZW50SWQoKTtcbiAgICB9O1xuICAgIC8qKlxuICAgICAqIEluY3JlbWVudHMgdGhlIGlkZW50aWZ5SWQgYW5kIHJldHVybnMgaXQuXG4gICAgICogQHByaXZhdGVcbiAgICAgKi9cblxuXG4gICAgQW1wbGl0dWRlLnByb3RvdHlwZS5uZXh0SWRlbnRpZnlJZCA9IGZ1bmN0aW9uIG5leHRJZGVudGlmeUlkKCkge1xuICAgICAgcmV0dXJuIHRoaXMuZ2V0SW5zdGFuY2UoKS5uZXh0SWRlbnRpZnlJZCgpO1xuICAgIH07XG4gICAgLyoqXG4gICAgICogSW5jcmVtZW50cyB0aGUgc2VxdWVuY2VOdW1iZXIgYW5kIHJldHVybnMgaXQuXG4gICAgICogQHByaXZhdGVcbiAgICAgKi9cblxuXG4gICAgQW1wbGl0dWRlLnByb3RvdHlwZS5uZXh0U2VxdWVuY2VOdW1iZXIgPSBmdW5jdGlvbiBuZXh0U2VxdWVuY2VOdW1iZXIoKSB7XG4gICAgICByZXR1cm4gdGhpcy5nZXRJbnN0YW5jZSgpLm5leHRTZXF1ZW5jZU51bWJlcigpO1xuICAgIH07XG4gICAgLyoqXG4gICAgICogU2F2ZXMgdW5zZW50IGV2ZW50cyBhbmQgaWRlbnRpZmllcyB0byBsb2NhbFN0b3JhZ2UuIEpTT04gc3RyaW5naWZpZXMgZXZlbnQgcXVldWVzIGJlZm9yZSBzYXZpbmcuXG4gICAgICogTm90ZTogdGhpcyBpcyBjYWxsZWQgYXV0b21hdGljYWxseSBldmVyeSB0aW1lIGV2ZW50cyBhcmUgbG9nZ2VkLCB1bmxlc3MgeW91IGV4cGxpY2l0bHkgc2V0IG9wdGlvbiBzYXZlRXZlbnRzIHRvIGZhbHNlLlxuICAgICAqIEBwcml2YXRlXG4gICAgICovXG5cblxuICAgIEFtcGxpdHVkZS5wcm90b3R5cGUuc2F2ZUV2ZW50cyA9IGZ1bmN0aW9uIHNhdmVFdmVudHMoKSB7XG4gICAgICB0aGlzLmdldEluc3RhbmNlKCkuc2F2ZUV2ZW50cygpO1xuICAgIH07XG4gICAgLyoqXG4gICAgICogU2V0cyBhIGN1c3RvbWVyIGRvbWFpbiBmb3IgdGhlIGFtcGxpdHVkZSBjb29raWUuIFVzZWZ1bCBpZiB5b3Ugd2FudCB0byBzdXBwb3J0IGNyb3NzLXN1YmRvbWFpbiB0cmFja2luZy5cbiAgICAgKiBAcHVibGljXG4gICAgICogQHBhcmFtIHtzdHJpbmd9IGRvbWFpbiB0byBzZXQuXG4gICAgICogQGRlcHJlY2F0ZWQgUGxlYXNlIHVzZSBhbXBsaXR1ZGUuZ2V0SW5zdGFuY2UoKS5zZXREb21haW4oZG9tYWluKTtcbiAgICAgKiBAZXhhbXBsZSBhbXBsaXR1ZGUuc2V0RG9tYWluKCcuYW1wbGl0dWRlLmNvbScpO1xuICAgICAqL1xuXG5cbiAgICBBbXBsaXR1ZGUucHJvdG90eXBlLnNldERvbWFpbiA9IGZ1bmN0aW9uIHNldERvbWFpbihkb21haW4pIHtcbiAgICAgIHRoaXMuZ2V0SW5zdGFuY2UoKS5zZXREb21haW4oZG9tYWluKTtcbiAgICB9O1xuICAgIC8qKlxuICAgICAqIFNldHMgYW4gaWRlbnRpZmllciBmb3IgdGhlIGN1cnJlbnQgdXNlci5cbiAgICAgKiBAcHVibGljXG4gICAgICogQHBhcmFtIHtzdHJpbmd9IHVzZXJJZCAtIGlkZW50aWZpZXIgdG8gc2V0LiBDYW4gYmUgbnVsbC5cbiAgICAgKiBAZGVwcmVjYXRlZCBQbGVhc2UgdXNlIGFtcGxpdHVkZS5nZXRJbnN0YW5jZSgpLnNldFVzZXJJZCh1c2VySWQpO1xuICAgICAqIEBleGFtcGxlIGFtcGxpdHVkZS5zZXRVc2VySWQoJ2pvZUBnbWFpbC5jb20nKTtcbiAgICAgKi9cblxuXG4gICAgQW1wbGl0dWRlLnByb3RvdHlwZS5zZXRVc2VySWQgPSBmdW5jdGlvbiBzZXRVc2VySWQodXNlcklkKSB7XG4gICAgICB0aGlzLmdldEluc3RhbmNlKCkuc2V0VXNlcklkKHVzZXJJZCk7XG4gICAgfTtcbiAgICAvKipcbiAgICAgKiBBZGQgdXNlciB0byBhIGdyb3VwIG9yIGdyb3Vwcy4gWW91IG5lZWQgdG8gc3BlY2lmeSBhIGdyb3VwVHlwZSBhbmQgZ3JvdXBOYW1lKHMpLlxuICAgICAqIEZvciBleGFtcGxlIHlvdSBjYW4gZ3JvdXAgcGVvcGxlIGJ5IHRoZWlyIG9yZ2FuaXphdGlvbi5cbiAgICAgKiBJbiB0aGF0IGNhc2UgZ3JvdXBUeXBlIGlzIFwib3JnSWRcIiBhbmQgZ3JvdXBOYW1lIHdvdWxkIGJlIHRoZSBhY3R1YWwgSUQocykuXG4gICAgICogZ3JvdXBOYW1lIGNhbiBiZSBhIHN0cmluZyBvciBhbiBhcnJheSBvZiBzdHJpbmdzIHRvIGluZGljYXRlIGEgdXNlciBpbiBtdWx0aXBsZSBncnV1cHMuXG4gICAgICogWW91IGNhbiBhbHNvIGNhbGwgc2V0R3JvdXAgbXVsdGlwbGUgdGltZXMgd2l0aCBkaWZmZXJlbnQgZ3JvdXBUeXBlcyB0byB0cmFjayBtdWx0aXBsZSB0eXBlcyBvZiBncm91cHMgKHVwIHRvIDUgcGVyIGFwcCkuXG4gICAgICogTm90ZTogdGhpcyB3aWxsIGFsc28gc2V0IGdyb3VwVHlwZTogZ3JvdXBOYW1lIGFzIGEgdXNlciBwcm9wZXJ0eS5cbiAgICAgKiBTZWUgdGhlIFtTREsgUmVhZG1lXXtAbGluayBodHRwczovL2dpdGh1Yi5jb20vYW1wbGl0dWRlL0FtcGxpdHVkZS1KYXZhc2NyaXB0I3NldHRpbmctZ3JvdXBzfSBmb3IgbW9yZSBpbmZvcm1hdGlvbi5cbiAgICAgKiBAcHVibGljXG4gICAgICogQHBhcmFtIHtzdHJpbmd9IGdyb3VwVHlwZSAtIHRoZSBncm91cCB0eXBlIChleDogb3JnSWQpXG4gICAgICogQHBhcmFtIHtzdHJpbmd8bGlzdH0gZ3JvdXBOYW1lIC0gdGhlIG5hbWUgb2YgdGhlIGdyb3VwIChleDogMTUpLCBvciBhIGxpc3Qgb2YgbmFtZXMgb2YgdGhlIGdyb3Vwc1xuICAgICAqIEBkZXByZWNhdGVkIFBsZWFzZSB1c2UgYW1wbGl0dWRlLmdldEluc3RhbmNlKCkuc2V0R3JvdXAoZ3JvdXBUeXBlLCBncm91cE5hbWUpO1xuICAgICAqIEBleGFtcGxlIGFtcGxpdHVkZS5zZXRHcm91cCgnb3JnSWQnLCAxNSk7IC8vIHRoaXMgYWRkcyB0aGUgY3VycmVudCB1c2VyIHRvIG9yZ0lkIDE1LlxuICAgICAqL1xuXG5cbiAgICBBbXBsaXR1ZGUucHJvdG90eXBlLnNldEdyb3VwID0gZnVuY3Rpb24gKGdyb3VwVHlwZSwgZ3JvdXBOYW1lKSB7XG4gICAgICB0aGlzLmdldEluc3RhbmNlKCkuc2V0R3JvdXAoZ3JvdXBUeXBlLCBncm91cE5hbWUpO1xuICAgIH07XG4gICAgLyoqXG4gICAgICogU2V0cyB3aGV0aGVyIHRvIG9wdCBjdXJyZW50IHVzZXIgb3V0IG9mIHRyYWNraW5nLlxuICAgICAqIEBwdWJsaWNcbiAgICAgKiBAcGFyYW0ge2Jvb2xlYW59IGVuYWJsZSAtIGlmIHRydWUgdGhlbiBubyBldmVudHMgd2lsbCBiZSBsb2dnZWQgb3Igc2VudC5cbiAgICAgKiBAZGVwcmVjYXRlZCBQbGVhc2UgdXNlIGFtcGxpdHVkZS5nZXRJbnN0YW5jZSgpLnNldE9wdE91dChlbmFibGUpO1xuICAgICAqIEBleGFtcGxlOiBhbXBsaXR1ZGUuc2V0T3B0T3V0KHRydWUpO1xuICAgICAqL1xuXG5cbiAgICBBbXBsaXR1ZGUucHJvdG90eXBlLnNldE9wdE91dCA9IGZ1bmN0aW9uIHNldE9wdE91dChlbmFibGUpIHtcbiAgICAgIHRoaXMuZ2V0SW5zdGFuY2UoKS5zZXRPcHRPdXQoZW5hYmxlKTtcbiAgICB9O1xuICAgIC8qKlxuICAgICAgKiBSZWdlbmVyYXRlcyBhIG5ldyByYW5kb20gZGV2aWNlSWQgZm9yIGN1cnJlbnQgdXNlci4gTm90ZTogdGhpcyBpcyBub3QgcmVjb21tZW5kZWQgdW5sZXNzIHlvdSBrbm93IHdoYXQgeW91XG4gICAgICAqIGFyZSBkb2luZy4gVGhpcyBjYW4gYmUgdXNlZCBpbiBjb25qdW5jdGlvbiB3aXRoIGBzZXRVc2VySWQobnVsbClgIHRvIGFub255bWl6ZSB1c2VycyBhZnRlciB0aGV5IGxvZyBvdXQuXG4gICAgICAqIFdpdGggYSBudWxsIHVzZXJJZCBhbmQgYSBjb21wbGV0ZWx5IG5ldyBkZXZpY2VJZCwgdGhlIGN1cnJlbnQgdXNlciB3b3VsZCBhcHBlYXIgYXMgYSBicmFuZCBuZXcgdXNlciBpbiBkYXNoYm9hcmQuXG4gICAgICAqIFRoaXMgdXNlcyBzcmMvdXVpZC5qcyB0byByZWdlbmVyYXRlIHRoZSBkZXZpY2VJZC5cbiAgICAgICogQHB1YmxpY1xuICAgICAgKiBAZGVwcmVjYXRlZCBQbGVhc2UgdXNlIGFtcGxpdHVkZS5nZXRJbnN0YW5jZSgpLnJlZ2VuZXJhdGVEZXZpY2VJZCgpO1xuICAgICAgKi9cblxuXG4gICAgQW1wbGl0dWRlLnByb3RvdHlwZS5yZWdlbmVyYXRlRGV2aWNlSWQgPSBmdW5jdGlvbiByZWdlbmVyYXRlRGV2aWNlSWQoKSB7XG4gICAgICB0aGlzLmdldEluc3RhbmNlKCkucmVnZW5lcmF0ZURldmljZUlkKCk7XG4gICAgfTtcbiAgICAvKipcbiAgICAgICogU2V0cyBhIGN1c3RvbSBkZXZpY2VJZCBmb3IgY3VycmVudCB1c2VyLiBOb3RlOiB0aGlzIGlzIG5vdCByZWNvbW1lbmRlZCB1bmxlc3MgeW91IGtub3cgd2hhdCB5b3UgYXJlIGRvaW5nXG4gICAgICAqIChsaWtlIGlmIHlvdSBoYXZlIHlvdXIgb3duIHN5c3RlbSBmb3IgbWFuYWdpbmcgZGV2aWNlSWRzKS4gTWFrZSBzdXJlIHRoZSBkZXZpY2VJZCB5b3Ugc2V0IGlzIHN1ZmZpY2llbnRseSB1bmlxdWVcbiAgICAgICogKHdlIHJlY29tbWVuZCBzb21ldGhpbmcgbGlrZSBhIFVVSUQgLSBzZWUgc3JjL3V1aWQuanMgZm9yIGFuIGV4YW1wbGUgb2YgaG93IHRvIGdlbmVyYXRlKSB0byBwcmV2ZW50IGNvbmZsaWN0cyB3aXRoIG90aGVyIGRldmljZXMgaW4gb3VyIHN5c3RlbS5cbiAgICAgICogQHB1YmxpY1xuICAgICAgKiBAcGFyYW0ge3N0cmluZ30gZGV2aWNlSWQgLSBjdXN0b20gZGV2aWNlSWQgZm9yIGN1cnJlbnQgdXNlci5cbiAgICAgICogQGRlcHJlY2F0ZWQgUGxlYXNlIHVzZSBhbXBsaXR1ZGUuZ2V0SW5zdGFuY2UoKS5zZXREZXZpY2VJZChkZXZpY2VJZCk7XG4gICAgICAqIEBleGFtcGxlIGFtcGxpdHVkZS5zZXREZXZpY2VJZCgnNDVmMDk1NGYtZWI3OS00NDYzLWFjOGEtMjMzYTZmNDVhOGYwJyk7XG4gICAgICAqL1xuXG5cbiAgICBBbXBsaXR1ZGUucHJvdG90eXBlLnNldERldmljZUlkID0gZnVuY3Rpb24gc2V0RGV2aWNlSWQoZGV2aWNlSWQpIHtcbiAgICAgIHRoaXMuZ2V0SW5zdGFuY2UoKS5zZXREZXZpY2VJZChkZXZpY2VJZCk7XG4gICAgfTtcbiAgICAvKipcbiAgICAgKiBTZXRzIHVzZXIgcHJvcGVydGllcyBmb3IgdGhlIGN1cnJlbnQgdXNlci5cbiAgICAgKiBAcHVibGljXG4gICAgICogQHBhcmFtIHtvYmplY3R9IC0gb2JqZWN0IHdpdGggc3RyaW5nIGtleXMgYW5kIHZhbHVlcyBmb3IgdGhlIHVzZXIgcHJvcGVydGllcyB0byBzZXQuXG4gICAgICogQHBhcmFtIHtib29sZWFufSAtIERFUFJFQ0FURUQgb3B0X3JlcGxhY2U6IGluIGVhcmxpZXIgdmVyc2lvbnMgb2YgdGhlIEpTIFNESyB0aGUgdXNlciBwcm9wZXJ0aWVzIG9iamVjdCB3YXMga2VwdCBpblxuICAgICAqIG1lbW9yeSBhbmQgcmVwbGFjZSA9IHRydWUgd291bGQgcmVwbGFjZSB0aGUgb2JqZWN0IGluIG1lbW9yeS4gTm93IHRoZSBwcm9wZXJ0aWVzIGFyZSBubyBsb25nZXIgc3RvcmVkIGluIG1lbW9yeSwgc28gcmVwbGFjZSBpcyBkZXByZWNhdGVkLlxuICAgICAqIEBkZXByZWNhdGVkIFBsZWFzZSB1c2UgYW1wbGl0dWRlLmdldEluc3RhbmNlLnNldFVzZXJQcm9wZXJ0aWVzKHVzZXJQcm9wZXJ0aWVzKTtcbiAgICAgKiBAZXhhbXBsZSBhbXBsaXR1ZGUuc2V0VXNlclByb3BlcnRpZXMoeydnZW5kZXInOiAnZmVtYWxlJywgJ3NpZ25fdXBfY29tcGxldGUnOiB0cnVlfSlcbiAgICAgKi9cblxuXG4gICAgQW1wbGl0dWRlLnByb3RvdHlwZS5zZXRVc2VyUHJvcGVydGllcyA9IGZ1bmN0aW9uIHNldFVzZXJQcm9wZXJ0aWVzKHVzZXJQcm9wZXJ0aWVzKSB7XG4gICAgICB0aGlzLmdldEluc3RhbmNlKCkuc2V0VXNlclByb3BlcnRpZXModXNlclByb3BlcnRpZXMpO1xuICAgIH07XG4gICAgLyoqXG4gICAgICogQ2xlYXIgYWxsIG9mIHRoZSB1c2VyIHByb3BlcnRpZXMgZm9yIHRoZSBjdXJyZW50IHVzZXIuIE5vdGU6IGNsZWFyaW5nIHVzZXIgcHJvcGVydGllcyBpcyBpcnJldmVyc2libGUhXG4gICAgICogQHB1YmxpY1xuICAgICAqIEBkZXByZWNhdGVkIFBsZWFzZSB1c2UgYW1wbGl0dWRlLmdldEluc3RhbmNlKCkuY2xlYXJVc2VyUHJvcGVydGllcygpO1xuICAgICAqIEBleGFtcGxlIGFtcGxpdHVkZS5jbGVhclVzZXJQcm9wZXJ0aWVzKCk7XG4gICAgICovXG5cblxuICAgIEFtcGxpdHVkZS5wcm90b3R5cGUuY2xlYXJVc2VyUHJvcGVydGllcyA9IGZ1bmN0aW9uIGNsZWFyVXNlclByb3BlcnRpZXMoKSB7XG4gICAgICB0aGlzLmdldEluc3RhbmNlKCkuY2xlYXJVc2VyUHJvcGVydGllcygpO1xuICAgIH07XG4gICAgLyoqXG4gICAgICogU2VuZCBhbiBpZGVudGlmeSBjYWxsIGNvbnRhaW5pbmcgdXNlciBwcm9wZXJ0eSBvcGVyYXRpb25zIHRvIEFtcGxpdHVkZSBzZXJ2ZXJzLlxuICAgICAqIFNlZSBbUmVhZG1lXXtAbGluayBodHRwczovL2dpdGh1Yi5jb20vYW1wbGl0dWRlL0FtcGxpdHVkZS1KYXZhc2NyaXB0I3VzZXItcHJvcGVydGllcy1hbmQtdXNlci1wcm9wZXJ0eS1vcGVyYXRpb25zfVxuICAgICAqIGZvciBtb3JlIGluZm9ybWF0aW9uIG9uIHRoZSBJZGVudGlmeSBBUEkgYW5kIHVzZXIgcHJvcGVydHkgb3BlcmF0aW9ucy5cbiAgICAgKiBAcGFyYW0ge0lkZW50aWZ5fSBpZGVudGlmeV9vYmogLSB0aGUgSWRlbnRpZnkgb2JqZWN0IGNvbnRhaW5pbmcgdGhlIHVzZXIgcHJvcGVydHkgb3BlcmF0aW9ucyB0byBzZW5kLlxuICAgICAqIEBwYXJhbSB7QW1wbGl0dWRlfmV2ZW50Q2FsbGJhY2t9IG9wdF9jYWxsYmFjayAtIChvcHRpb25hbCkgY2FsbGJhY2sgZnVuY3Rpb24gdG8gcnVuIHdoZW4gdGhlIGlkZW50aWZ5IGV2ZW50IGhhcyBiZWVuIHNlbnQuXG4gICAgICogTm90ZTogdGhlIHNlcnZlciByZXNwb25zZSBjb2RlIGFuZCByZXNwb25zZSBib2R5IGZyb20gdGhlIGlkZW50aWZ5IGV2ZW50IHVwbG9hZCBhcmUgcGFzc2VkIHRvIHRoZSBjYWxsYmFjayBmdW5jdGlvbi5cbiAgICAgKiBAZGVwcmVjYXRlZCBQbGVhc2UgdXNlIGFtcGxpdHVkZS5nZXRJbnN0YW5jZSgpLmlkZW50aWZ5KGlkZW50aWZ5KTtcbiAgICAgKiBAZXhhbXBsZVxuICAgICAqIHZhciBpZGVudGlmeSA9IG5ldyBhbXBsaXR1ZGUuSWRlbnRpZnkoKS5zZXQoJ2NvbG9ycycsIFsncm9zZScsICdnb2xkJ10pLmFkZCgna2FybWEnLCAxKS5zZXRPbmNlKCdzaWduX3VwX2RhdGUnLCAnMjAxNi0wMy0zMScpO1xuICAgICAqIGFtcGxpdHVkZS5pZGVudGlmeShpZGVudGlmeSk7XG4gICAgICovXG5cblxuICAgIEFtcGxpdHVkZS5wcm90b3R5cGUuaWRlbnRpZnkgPSBmdW5jdGlvbiAoaWRlbnRpZnlfb2JqLCBvcHRfY2FsbGJhY2spIHtcbiAgICAgIHRoaXMuZ2V0SW5zdGFuY2UoKS5pZGVudGlmeShpZGVudGlmeV9vYmosIG9wdF9jYWxsYmFjayk7XG4gICAgfTtcbiAgICAvKipcbiAgICAgKiBTZXQgYSB2ZXJzaW9uTmFtZSBmb3IgeW91ciBhcHBsaWNhdGlvbi5cbiAgICAgKiBAcHVibGljXG4gICAgICogQHBhcmFtIHtzdHJpbmd9IHZlcnNpb25OYW1lIC0gVGhlIHZlcnNpb24gdG8gc2V0IGZvciB5b3VyIGFwcGxpY2F0aW9uLlxuICAgICAqIEBkZXByZWNhdGVkIFBsZWFzZSB1c2UgYW1wbGl0dWRlLmdldEluc3RhbmNlKCkuc2V0VmVyc2lvbk5hbWUodmVyc2lvbk5hbWUpO1xuICAgICAqIEBleGFtcGxlIGFtcGxpdHVkZS5zZXRWZXJzaW9uTmFtZSgnMS4xMi4zJyk7XG4gICAgICovXG5cblxuICAgIEFtcGxpdHVkZS5wcm90b3R5cGUuc2V0VmVyc2lvbk5hbWUgPSBmdW5jdGlvbiBzZXRWZXJzaW9uTmFtZSh2ZXJzaW9uTmFtZSkge1xuICAgICAgdGhpcy5nZXRJbnN0YW5jZSgpLnNldFZlcnNpb25OYW1lKHZlcnNpb25OYW1lKTtcbiAgICB9O1xuICAgIC8qKlxuICAgICAqIFRoaXMgaXMgdGhlIGNhbGxiYWNrIGZvciBsb2dFdmVudCBhbmQgaWRlbnRpZnkgY2FsbHMuIEl0IGdldHMgY2FsbGVkIGFmdGVyIHRoZSBldmVudC9pZGVudGlmeSBpcyB1cGxvYWRlZCxcbiAgICAgKiBhbmQgdGhlIHNlcnZlciByZXNwb25zZSBjb2RlIGFuZCByZXNwb25zZSBib2R5IGZyb20gdGhlIHVwbG9hZCByZXF1ZXN0IGFyZSBwYXNzZWQgdG8gdGhlIGNhbGxiYWNrIGZ1bmN0aW9uLlxuICAgICAqIEBjYWxsYmFjayBBbXBsaXR1ZGV+ZXZlbnRDYWxsYmFja1xuICAgICAqIEBwYXJhbSB7bnVtYmVyfSByZXNwb25zZUNvZGUgLSBTZXJ2ZXIgcmVzcG9uc2UgY29kZSBmb3IgdGhlIGV2ZW50IC8gaWRlbnRpZnkgdXBsb2FkIHJlcXVlc3QuXG4gICAgICogQHBhcmFtIHtzdHJpbmd9IHJlc3BvbnNlQm9keSAtIFNlcnZlciByZXNwb25zZSBib2R5IGZvciB0aGUgZXZlbnQgLyBpZGVudGlmeSB1cGxvYWQgcmVxdWVzdC5cbiAgICAgKi9cblxuICAgIC8qKlxuICAgICAqIExvZyBhbiBldmVudCB3aXRoIGV2ZW50VHlwZSBhbmQgZXZlbnRQcm9wZXJ0aWVzXG4gICAgICogQHB1YmxpY1xuICAgICAqIEBwYXJhbSB7c3RyaW5nfSBldmVudFR5cGUgLSBuYW1lIG9mIGV2ZW50XG4gICAgICogQHBhcmFtIHtvYmplY3R9IGV2ZW50UHJvcGVydGllcyAtIChvcHRpb25hbCkgYW4gb2JqZWN0IHdpdGggc3RyaW5nIGtleXMgYW5kIHZhbHVlcyBmb3IgdGhlIGV2ZW50IHByb3BlcnRpZXMuXG4gICAgICogQHBhcmFtIHtBbXBsaXR1ZGV+ZXZlbnRDYWxsYmFja30gb3B0X2NhbGxiYWNrIC0gKG9wdGlvbmFsKSBhIGNhbGxiYWNrIGZ1bmN0aW9uIHRvIHJ1biBhZnRlciB0aGUgZXZlbnQgaXMgbG9nZ2VkLlxuICAgICAqIE5vdGU6IHRoZSBzZXJ2ZXIgcmVzcG9uc2UgY29kZSBhbmQgcmVzcG9uc2UgYm9keSBmcm9tIHRoZSBldmVudCB1cGxvYWQgYXJlIHBhc3NlZCB0byB0aGUgY2FsbGJhY2sgZnVuY3Rpb24uXG4gICAgICogQGRlcHJlY2F0ZWQgUGxlYXNlIHVzZSBhbXBsaXR1ZGUuZ2V0SW5zdGFuY2UoKS5sb2dFdmVudChldmVudFR5cGUsIGV2ZW50UHJvcGVydGllcywgb3B0X2NhbGxiYWNrKTtcbiAgICAgKiBAZXhhbXBsZSBhbXBsaXR1ZGUubG9nRXZlbnQoJ0NsaWNrZWQgSG9tZXBhZ2UgQnV0dG9uJywgeydmaW5pc2hlZF9mbG93JzogZmFsc2UsICdjbGlja3MnOiAxNX0pO1xuICAgICAqL1xuXG5cbiAgICBBbXBsaXR1ZGUucHJvdG90eXBlLmxvZ0V2ZW50ID0gZnVuY3Rpb24gbG9nRXZlbnQoZXZlbnRUeXBlLCBldmVudFByb3BlcnRpZXMsIG9wdF9jYWxsYmFjaykge1xuICAgICAgcmV0dXJuIHRoaXMuZ2V0SW5zdGFuY2UoKS5sb2dFdmVudChldmVudFR5cGUsIGV2ZW50UHJvcGVydGllcywgb3B0X2NhbGxiYWNrKTtcbiAgICB9O1xuICAgIC8qKlxuICAgICAqIExvZyBhbiBldmVudCB3aXRoIGV2ZW50VHlwZSwgZXZlbnRQcm9wZXJ0aWVzLCBhbmQgZ3JvdXBzLiBVc2UgdGhpcyB0byBzZXQgZXZlbnQtbGV2ZWwgZ3JvdXBzLlxuICAgICAqIE5vdGU6IHRoZSBncm91cChzKSBzZXQgb25seSBhcHBseSBmb3IgdGhlIHNwZWNpZmljIGV2ZW50IHR5cGUgYmVpbmcgbG9nZ2VkIGFuZCBkb2VzIG5vdCBwZXJzaXN0IG9uIHRoZSB1c2VyXG4gICAgICogKHVubGVzcyB5b3UgZXhwbGljaXRseSBzZXQgaXQgd2l0aCBzZXRHcm91cCkuXG4gICAgICogU2VlIHRoZSBbU0RLIFJlYWRtZV17QGxpbmsgaHR0cHM6Ly9naXRodWIuY29tL2FtcGxpdHVkZS9BbXBsaXR1ZGUtSmF2YXNjcmlwdCNzZXR0aW5nLWdyb3Vwc30gZm9yIG1vcmUgaW5mb3JtYXRpb25cbiAgICAgKiBhYm91dCBncm91cHMgYW5kIENvdW50IGJ5IERpc3RpbmN0IG9uIHRoZSBBbXBsaXR1ZGUgcGxhdGZvcm0uXG4gICAgICogQHB1YmxpY1xuICAgICAqIEBwYXJhbSB7c3RyaW5nfSBldmVudFR5cGUgLSBuYW1lIG9mIGV2ZW50XG4gICAgICogQHBhcmFtIHtvYmplY3R9IGV2ZW50UHJvcGVydGllcyAtIChvcHRpb25hbCkgYW4gb2JqZWN0IHdpdGggc3RyaW5nIGtleXMgYW5kIHZhbHVlcyBmb3IgdGhlIGV2ZW50IHByb3BlcnRpZXMuXG4gICAgICogQHBhcmFtIHtvYmplY3R9IGdyb3VwcyAtIChvcHRpb25hbCkgYW4gb2JqZWN0IHdpdGggc3RyaW5nIGdyb3VwVHlwZTogZ3JvdXBOYW1lIHZhbHVlcyBmb3IgdGhlIGV2ZW50IGJlaW5nIGxvZ2dlZC5cbiAgICAgKiBncm91cE5hbWUgY2FuIGJlIGEgc3RyaW5nIG9yIGFuIGFycmF5IG9mIHN0cmluZ3MuXG4gICAgICogQHBhcmFtIHtBbXBsaXR1ZGV+ZXZlbnRDYWxsYmFja30gb3B0X2NhbGxiYWNrIC0gKG9wdGlvbmFsKSBhIGNhbGxiYWNrIGZ1bmN0aW9uIHRvIHJ1biBhZnRlciB0aGUgZXZlbnQgaXMgbG9nZ2VkLlxuICAgICAqIE5vdGU6IHRoZSBzZXJ2ZXIgcmVzcG9uc2UgY29kZSBhbmQgcmVzcG9uc2UgYm9keSBmcm9tIHRoZSBldmVudCB1cGxvYWQgYXJlIHBhc3NlZCB0byB0aGUgY2FsbGJhY2sgZnVuY3Rpb24uXG4gICAgICogRGVwcmVjYXRlZCBQbGVhc2UgdXNlIGFtcGxpdHVkZS5nZXRJbnN0YW5jZSgpLmxvZ0V2ZW50V2l0aEdyb3VwcyhldmVudFR5cGUsIGV2ZW50UHJvcGVydGllcywgZ3JvdXBzLCBvcHRfY2FsbGJhY2spO1xuICAgICAqIEBleGFtcGxlIGFtcGxpdHVkZS5sb2dFdmVudFdpdGhHcm91cHMoJ0NsaWNrZWQgQnV0dG9uJywgbnVsbCwgeydvcmdJZCc6IDI0fSk7XG4gICAgICovXG5cblxuICAgIEFtcGxpdHVkZS5wcm90b3R5cGUubG9nRXZlbnRXaXRoR3JvdXBzID0gZnVuY3Rpb24gKGV2ZW50VHlwZSwgZXZlbnRQcm9wZXJ0aWVzLCBncm91cHMsIG9wdF9jYWxsYmFjaykge1xuICAgICAgcmV0dXJuIHRoaXMuZ2V0SW5zdGFuY2UoKS5sb2dFdmVudFdpdGhHcm91cHMoZXZlbnRUeXBlLCBldmVudFByb3BlcnRpZXMsIGdyb3Vwcywgb3B0X2NhbGxiYWNrKTtcbiAgICB9O1xuICAgIC8qKlxuICAgICAqIExvZyByZXZlbnVlIHdpdGggUmV2ZW51ZSBpbnRlcmZhY2UuIFRoZSBuZXcgcmV2ZW51ZSBpbnRlcmZhY2UgYWxsb3dzIGZvciBtb3JlIHJldmVudWUgZmllbGRzIGxpa2VcbiAgICAgKiByZXZlbnVlVHlwZSBhbmQgZXZlbnQgcHJvcGVydGllcy5cbiAgICAgKiBTZWUgW1JlYWRtZV17QGxpbmsgaHR0cHM6Ly9naXRodWIuY29tL2FtcGxpdHVkZS9BbXBsaXR1ZGUtSmF2YXNjcmlwdCN0cmFja2luZy1yZXZlbnVlfVxuICAgICAqIGZvciBtb3JlIGluZm9ybWF0aW9uIG9uIHRoZSBSZXZlbnVlIGludGVyZmFjZSBhbmQgbG9nZ2luZyByZXZlbnVlLlxuICAgICAqIEBwdWJsaWNcbiAgICAgKiBAcGFyYW0ge1JldmVudWV9IHJldmVudWVfb2JqIC0gdGhlIHJldmVudWUgb2JqZWN0IGNvbnRhaW5pbmcgdGhlIHJldmVudWUgZGF0YSBiZWluZyBsb2dnZWQuXG4gICAgICogQGRlcHJlY2F0ZWQgUGxlYXNlIHVzZSBhbXBsaXR1ZGUuZ2V0SW5zdGFuY2UoKS5sb2dSZXZlbnVlVjIocmV2ZW51ZV9vYmopO1xuICAgICAqIEBleGFtcGxlIHZhciByZXZlbnVlID0gbmV3IGFtcGxpdHVkZS5SZXZlbnVlKCkuc2V0UHJvZHVjdElkKCdwcm9kdWN0SWRlbnRpZmllcicpLnNldFByaWNlKDEwLjk5KTtcbiAgICAgKiBhbXBsaXR1ZGUubG9nUmV2ZW51ZVYyKHJldmVudWUpO1xuICAgICAqL1xuXG5cbiAgICBBbXBsaXR1ZGUucHJvdG90eXBlLmxvZ1JldmVudWVWMiA9IGZ1bmN0aW9uIGxvZ1JldmVudWVWMihyZXZlbnVlX29iaikge1xuICAgICAgcmV0dXJuIHRoaXMuZ2V0SW5zdGFuY2UoKS5sb2dSZXZlbnVlVjIocmV2ZW51ZV9vYmopO1xuICAgIH07XG4gICAgLyoqXG4gICAgICogTG9nIHJldmVudWUgZXZlbnQgd2l0aCBhIHByaWNlLCBxdWFudGl0eSwgYW5kIHByb2R1Y3QgaWRlbnRpZmllci4gREVQUkVDQVRFRCAtIHVzZSBsb2dSZXZlbnVlVjJcbiAgICAgKiBAcHVibGljXG4gICAgICogQHBhcmFtIHtudW1iZXJ9IHByaWNlIC0gcHJpY2Ugb2YgcmV2ZW51ZSBldmVudFxuICAgICAqIEBwYXJhbSB7bnVtYmVyfSBxdWFudGl0eSAtIChvcHRpb25hbCkgcXVhbnRpdHkgb2YgcHJvZHVjdHMgaW4gcmV2ZW51ZSBldmVudC4gSWYgbm8gcXVhbnRpdHkgc3BlY2lmaWVkIGRlZmF1bHQgdG8gMS5cbiAgICAgKiBAcGFyYW0ge3N0cmluZ30gcHJvZHVjdCAtIChvcHRpb25hbCkgcHJvZHVjdCBpZGVudGlmaWVyXG4gICAgICogQGRlcHJlY2F0ZWQgUGxlYXNlIHVzZSBhbXBsaXR1ZGUuZ2V0SW5zdGFuY2UoKS5sb2dSZXZlbnVlVjIocmV2ZW51ZV9vYmopO1xuICAgICAqIEBleGFtcGxlIGFtcGxpdHVkZS5sb2dSZXZlbnVlKDMuOTksIDEsICdwcm9kdWN0XzEyMzQnKTtcbiAgICAgKi9cblxuXG4gICAgQW1wbGl0dWRlLnByb3RvdHlwZS5sb2dSZXZlbnVlID0gZnVuY3Rpb24gbG9nUmV2ZW51ZShwcmljZSwgcXVhbnRpdHksIHByb2R1Y3QpIHtcbiAgICAgIHJldHVybiB0aGlzLmdldEluc3RhbmNlKCkubG9nUmV2ZW51ZShwcmljZSwgcXVhbnRpdHksIHByb2R1Y3QpO1xuICAgIH07XG4gICAgLyoqXG4gICAgICogUmVtb3ZlIGV2ZW50cyBpbiBzdG9yYWdlIHdpdGggZXZlbnQgaWRzIHVwIHRvIGFuZCBpbmNsdWRpbmcgbWF4RXZlbnRJZC5cbiAgICAgKiBAcHJpdmF0ZVxuICAgICAqL1xuXG5cbiAgICBBbXBsaXR1ZGUucHJvdG90eXBlLnJlbW92ZUV2ZW50cyA9IGZ1bmN0aW9uIHJlbW92ZUV2ZW50cyhtYXhFdmVudElkLCBtYXhJZGVudGlmeUlkKSB7XG4gICAgICB0aGlzLmdldEluc3RhbmNlKCkucmVtb3ZlRXZlbnRzKG1heEV2ZW50SWQsIG1heElkZW50aWZ5SWQpO1xuICAgIH07XG4gICAgLyoqXG4gICAgICogU2VuZCB1bnNlbnQgZXZlbnRzLiBOb3RlOiB0aGlzIGlzIGNhbGxlZCBhdXRvbWF0aWNhbGx5IGFmdGVyIGV2ZW50cyBhcmUgbG9nZ2VkIGlmIG9wdGlvbiBiYXRjaEV2ZW50cyBpcyBmYWxzZS5cbiAgICAgKiBJZiBiYXRjaEV2ZW50cyBpcyB0cnVlLCB0aGVuIGV2ZW50cyBhcmUgb25seSBzZW50IHdoZW4gYmF0Y2ggY3JpdGVyaWFzIGFyZSBtZXQuXG4gICAgICogQHByaXZhdGVcbiAgICAgKiBAcGFyYW0ge0FtcGxpdHVkZX5ldmVudENhbGxiYWNrfSBjYWxsYmFjayAtIChvcHRpb25hbCkgY2FsbGJhY2sgdG8gcnVuIGFmdGVyIGV2ZW50cyBhcmUgc2VudC5cbiAgICAgKiBOb3RlIHRoZSBzZXJ2ZXIgcmVzcG9uc2UgY29kZSBhbmQgcmVzcG9uc2UgYm9keSBhcmUgcGFzc2VkIHRvIHRoZSBjYWxsYmFjayBhcyBpbnB1dCBhcmd1bWVudHMuXG4gICAgICovXG5cblxuICAgIEFtcGxpdHVkZS5wcm90b3R5cGUuc2VuZEV2ZW50cyA9IGZ1bmN0aW9uIHNlbmRFdmVudHMoY2FsbGJhY2spIHtcbiAgICAgIHRoaXMuZ2V0SW5zdGFuY2UoKS5zZW5kRXZlbnRzKGNhbGxiYWNrKTtcbiAgICB9O1xuICAgIC8qKlxuICAgICAqIFNldCBnbG9iYWwgdXNlciBwcm9wZXJ0aWVzLiBOb3RlIHRoaXMgaXMgZGVwcmVjYXRlZCwgYW5kIHdlIHJlY29tbWVuZCB1c2luZyBzZXRVc2VyUHJvcGVydGllc1xuICAgICAqIEBwdWJsaWNcbiAgICAgKiBAZGVwcmVjYXRlZFxuICAgICAqL1xuXG5cbiAgICBBbXBsaXR1ZGUucHJvdG90eXBlLnNldEdsb2JhbFVzZXJQcm9wZXJ0aWVzID0gZnVuY3Rpb24gc2V0R2xvYmFsVXNlclByb3BlcnRpZXModXNlclByb3BlcnRpZXMpIHtcbiAgICAgIHRoaXMuZ2V0SW5zdGFuY2UoKS5zZXRVc2VyUHJvcGVydGllcyh1c2VyUHJvcGVydGllcyk7XG4gICAgfTtcbiAgfVxuICAvKipcbiAgICogR2V0IHRoZSBjdXJyZW50IHZlcnNpb24gb2YgQW1wbGl0dWRlJ3MgSmF2YXNjcmlwdCBTREsuXG4gICAqIEBwdWJsaWNcbiAgICogQHJldHVybnMge251bWJlcn0gdmVyc2lvbiBudW1iZXJcbiAgICogQGV4YW1wbGUgdmFyIGFtcGxpdHVkZVZlcnNpb24gPSBhbXBsaXR1ZGUuX19WRVJTSU9OX187XG4gICAqL1xuXG5cbiAgQW1wbGl0dWRlLnByb3RvdHlwZS5fX1ZFUlNJT05fXyA9IHZlcnNpb247XG5cbiAgLyoganNoaW50IGV4cHI6dHJ1ZSAqL1xuICB2YXIgb2xkID0gd2luZG93LmFtcGxpdHVkZSB8fCB7fTtcbiAgdmFyIG5ld0luc3RhbmNlID0gbmV3IEFtcGxpdHVkZSgpO1xuICBuZXdJbnN0YW5jZS5fcSA9IG9sZC5fcSB8fCBbXTtcblxuICBmb3IgKHZhciBpbnN0YW5jZSBpbiBvbGQuX2lxKSB7XG4gICAgLy8gbWlncmF0ZSBlYWNoIGluc3RhbmNlJ3MgcXVldWVcbiAgICBpZiAob2xkLl9pcS5oYXNPd25Qcm9wZXJ0eShpbnN0YW5jZSkpIHtcbiAgICAgIG5ld0luc3RhbmNlLmdldEluc3RhbmNlKGluc3RhbmNlKS5fcSA9IG9sZC5faXFbaW5zdGFuY2VdLl9xIHx8IFtdO1xuICAgIH1cbiAgfVxuXG4gIHtcbiAgICBuZXdJbnN0YW5jZS5ydW5RdWV1ZWRGdW5jdGlvbnMoKTtcbiAgfSAvLyBleHBvcnQgdGhlIGluc3RhbmNlXG5cbiAgcmV0dXJuIG5ld0luc3RhbmNlO1xuXG59KSk7XG4iLCJcInVzZSBzdHJpY3RcIjtcblxuLy8gVXNlIHRoZSBmYXN0ZXN0IG1lYW5zIHBvc3NpYmxlIHRvIGV4ZWN1dGUgYSB0YXNrIGluIGl0cyBvd24gdHVybiwgd2l0aFxuLy8gcHJpb3JpdHkgb3ZlciBvdGhlciBldmVudHMgaW5jbHVkaW5nIElPLCBhbmltYXRpb24sIHJlZmxvdywgYW5kIHJlZHJhd1xuLy8gZXZlbnRzIGluIGJyb3dzZXJzLlxuLy9cbi8vIEFuIGV4Y2VwdGlvbiB0aHJvd24gYnkgYSB0YXNrIHdpbGwgcGVybWFuZW50bHkgaW50ZXJydXB0IHRoZSBwcm9jZXNzaW5nIG9mXG4vLyBzdWJzZXF1ZW50IHRhc2tzLiBUaGUgaGlnaGVyIGxldmVsIGBhc2FwYCBmdW5jdGlvbiBlbnN1cmVzIHRoYXQgaWYgYW5cbi8vIGV4Y2VwdGlvbiBpcyB0aHJvd24gYnkgYSB0YXNrLCB0aGF0IHRoZSB0YXNrIHF1ZXVlIHdpbGwgY29udGludWUgZmx1c2hpbmcgYXNcbi8vIHNvb24gYXMgcG9zc2libGUsIGJ1dCBpZiB5b3UgdXNlIGByYXdBc2FwYCBkaXJlY3RseSwgeW91IGFyZSByZXNwb25zaWJsZSB0b1xuLy8gZWl0aGVyIGVuc3VyZSB0aGF0IG5vIGV4Y2VwdGlvbnMgYXJlIHRocm93biBmcm9tIHlvdXIgdGFzaywgb3IgdG8gbWFudWFsbHlcbi8vIGNhbGwgYHJhd0FzYXAucmVxdWVzdEZsdXNoYCBpZiBhbiBleGNlcHRpb24gaXMgdGhyb3duLlxubW9kdWxlLmV4cG9ydHMgPSByYXdBc2FwO1xuZnVuY3Rpb24gcmF3QXNhcCh0YXNrKSB7XG4gICAgaWYgKCFxdWV1ZS5sZW5ndGgpIHtcbiAgICAgICAgcmVxdWVzdEZsdXNoKCk7XG4gICAgICAgIGZsdXNoaW5nID0gdHJ1ZTtcbiAgICB9XG4gICAgLy8gRXF1aXZhbGVudCB0byBwdXNoLCBidXQgYXZvaWRzIGEgZnVuY3Rpb24gY2FsbC5cbiAgICBxdWV1ZVtxdWV1ZS5sZW5ndGhdID0gdGFzaztcbn1cblxudmFyIHF1ZXVlID0gW107XG4vLyBPbmNlIGEgZmx1c2ggaGFzIGJlZW4gcmVxdWVzdGVkLCBubyBmdXJ0aGVyIGNhbGxzIHRvIGByZXF1ZXN0Rmx1c2hgIGFyZVxuLy8gbmVjZXNzYXJ5IHVudGlsIHRoZSBuZXh0IGBmbHVzaGAgY29tcGxldGVzLlxudmFyIGZsdXNoaW5nID0gZmFsc2U7XG4vLyBgcmVxdWVzdEZsdXNoYCBpcyBhbiBpbXBsZW1lbnRhdGlvbi1zcGVjaWZpYyBtZXRob2QgdGhhdCBhdHRlbXB0cyB0byBraWNrXG4vLyBvZmYgYSBgZmx1c2hgIGV2ZW50IGFzIHF1aWNrbHkgYXMgcG9zc2libGUuIGBmbHVzaGAgd2lsbCBhdHRlbXB0IHRvIGV4aGF1c3Rcbi8vIHRoZSBldmVudCBxdWV1ZSBiZWZvcmUgeWllbGRpbmcgdG8gdGhlIGJyb3dzZXIncyBvd24gZXZlbnQgbG9vcC5cbnZhciByZXF1ZXN0Rmx1c2g7XG4vLyBUaGUgcG9zaXRpb24gb2YgdGhlIG5leHQgdGFzayB0byBleGVjdXRlIGluIHRoZSB0YXNrIHF1ZXVlLiBUaGlzIGlzXG4vLyBwcmVzZXJ2ZWQgYmV0d2VlbiBjYWxscyB0byBgZmx1c2hgIHNvIHRoYXQgaXQgY2FuIGJlIHJlc3VtZWQgaWZcbi8vIGEgdGFzayB0aHJvd3MgYW4gZXhjZXB0aW9uLlxudmFyIGluZGV4ID0gMDtcbi8vIElmIGEgdGFzayBzY2hlZHVsZXMgYWRkaXRpb25hbCB0YXNrcyByZWN1cnNpdmVseSwgdGhlIHRhc2sgcXVldWUgY2FuIGdyb3dcbi8vIHVuYm91bmRlZC4gVG8gcHJldmVudCBtZW1vcnkgZXhoYXVzdGlvbiwgdGhlIHRhc2sgcXVldWUgd2lsbCBwZXJpb2RpY2FsbHlcbi8vIHRydW5jYXRlIGFscmVhZHktY29tcGxldGVkIHRhc2tzLlxudmFyIGNhcGFjaXR5ID0gMTAyNDtcblxuLy8gVGhlIGZsdXNoIGZ1bmN0aW9uIHByb2Nlc3NlcyBhbGwgdGFza3MgdGhhdCBoYXZlIGJlZW4gc2NoZWR1bGVkIHdpdGhcbi8vIGByYXdBc2FwYCB1bmxlc3MgYW5kIHVudGlsIG9uZSBvZiB0aG9zZSB0YXNrcyB0aHJvd3MgYW4gZXhjZXB0aW9uLlxuLy8gSWYgYSB0YXNrIHRocm93cyBhbiBleGNlcHRpb24sIGBmbHVzaGAgZW5zdXJlcyB0aGF0IGl0cyBzdGF0ZSB3aWxsIHJlbWFpblxuLy8gY29uc2lzdGVudCBhbmQgd2lsbCByZXN1bWUgd2hlcmUgaXQgbGVmdCBvZmYgd2hlbiBjYWxsZWQgYWdhaW4uXG4vLyBIb3dldmVyLCBgZmx1c2hgIGRvZXMgbm90IG1ha2UgYW55IGFycmFuZ2VtZW50cyB0byBiZSBjYWxsZWQgYWdhaW4gaWYgYW5cbi8vIGV4Y2VwdGlvbiBpcyB0aHJvd24uXG5mdW5jdGlvbiBmbHVzaCgpIHtcbiAgICB3aGlsZSAoaW5kZXggPCBxdWV1ZS5sZW5ndGgpIHtcbiAgICAgICAgdmFyIGN1cnJlbnRJbmRleCA9IGluZGV4O1xuICAgICAgICAvLyBBZHZhbmNlIHRoZSBpbmRleCBiZWZvcmUgY2FsbGluZyB0aGUgdGFzay4gVGhpcyBlbnN1cmVzIHRoYXQgd2Ugd2lsbFxuICAgICAgICAvLyBiZWdpbiBmbHVzaGluZyBvbiB0aGUgbmV4dCB0YXNrIHRoZSB0YXNrIHRocm93cyBhbiBlcnJvci5cbiAgICAgICAgaW5kZXggPSBpbmRleCArIDE7XG4gICAgICAgIHF1ZXVlW2N1cnJlbnRJbmRleF0uY2FsbCgpO1xuICAgICAgICAvLyBQcmV2ZW50IGxlYWtpbmcgbWVtb3J5IGZvciBsb25nIGNoYWlucyBvZiByZWN1cnNpdmUgY2FsbHMgdG8gYGFzYXBgLlxuICAgICAgICAvLyBJZiB3ZSBjYWxsIGBhc2FwYCB3aXRoaW4gdGFza3Mgc2NoZWR1bGVkIGJ5IGBhc2FwYCwgdGhlIHF1ZXVlIHdpbGxcbiAgICAgICAgLy8gZ3JvdywgYnV0IHRvIGF2b2lkIGFuIE8obikgd2FsayBmb3IgZXZlcnkgdGFzayB3ZSBleGVjdXRlLCB3ZSBkb24ndFxuICAgICAgICAvLyBzaGlmdCB0YXNrcyBvZmYgdGhlIHF1ZXVlIGFmdGVyIHRoZXkgaGF2ZSBiZWVuIGV4ZWN1dGVkLlxuICAgICAgICAvLyBJbnN0ZWFkLCB3ZSBwZXJpb2RpY2FsbHkgc2hpZnQgMTAyNCB0YXNrcyBvZmYgdGhlIHF1ZXVlLlxuICAgICAgICBpZiAoaW5kZXggPiBjYXBhY2l0eSkge1xuICAgICAgICAgICAgLy8gTWFudWFsbHkgc2hpZnQgYWxsIHZhbHVlcyBzdGFydGluZyBhdCB0aGUgaW5kZXggYmFjayB0byB0aGVcbiAgICAgICAgICAgIC8vIGJlZ2lubmluZyBvZiB0aGUgcXVldWUuXG4gICAgICAgICAgICBmb3IgKHZhciBzY2FuID0gMCwgbmV3TGVuZ3RoID0gcXVldWUubGVuZ3RoIC0gaW5kZXg7IHNjYW4gPCBuZXdMZW5ndGg7IHNjYW4rKykge1xuICAgICAgICAgICAgICAgIHF1ZXVlW3NjYW5dID0gcXVldWVbc2NhbiArIGluZGV4XTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIHF1ZXVlLmxlbmd0aCAtPSBpbmRleDtcbiAgICAgICAgICAgIGluZGV4ID0gMDtcbiAgICAgICAgfVxuICAgIH1cbiAgICBxdWV1ZS5sZW5ndGggPSAwO1xuICAgIGluZGV4ID0gMDtcbiAgICBmbHVzaGluZyA9IGZhbHNlO1xufVxuXG4vLyBgcmVxdWVzdEZsdXNoYCBpcyBpbXBsZW1lbnRlZCB1c2luZyBhIHN0cmF0ZWd5IGJhc2VkIG9uIGRhdGEgY29sbGVjdGVkIGZyb21cbi8vIGV2ZXJ5IGF2YWlsYWJsZSBTYXVjZUxhYnMgU2VsZW5pdW0gd2ViIGRyaXZlciB3b3JrZXIgYXQgdGltZSBvZiB3cml0aW5nLlxuLy8gaHR0cHM6Ly9kb2NzLmdvb2dsZS5jb20vc3ByZWFkc2hlZXRzL2QvMW1HLTVVWUd1cDVxeEdkRU1Xa2hQNkJXQ3owNTNOVWIyRTFRb1VUVTE2dUEvZWRpdCNnaWQ9NzgzNzI0NTkzXG5cbi8vIFNhZmFyaSA2IGFuZCA2LjEgZm9yIGRlc2t0b3AsIGlQYWQsIGFuZCBpUGhvbmUgYXJlIHRoZSBvbmx5IGJyb3dzZXJzIHRoYXRcbi8vIGhhdmUgV2ViS2l0TXV0YXRpb25PYnNlcnZlciBidXQgbm90IHVuLXByZWZpeGVkIE11dGF0aW9uT2JzZXJ2ZXIuXG4vLyBNdXN0IHVzZSBgZ2xvYmFsYCBvciBgc2VsZmAgaW5zdGVhZCBvZiBgd2luZG93YCB0byB3b3JrIGluIGJvdGggZnJhbWVzIGFuZCB3ZWJcbi8vIHdvcmtlcnMuIGBnbG9iYWxgIGlzIGEgcHJvdmlzaW9uIG9mIEJyb3dzZXJpZnksIE1yLCBNcnMsIG9yIE1vcC5cblxuLyogZ2xvYmFscyBzZWxmICovXG52YXIgc2NvcGUgPSB0eXBlb2YgZ2xvYmFsICE9PSBcInVuZGVmaW5lZFwiID8gZ2xvYmFsIDogc2VsZjtcbnZhciBCcm93c2VyTXV0YXRpb25PYnNlcnZlciA9IHNjb3BlLk11dGF0aW9uT2JzZXJ2ZXIgfHwgc2NvcGUuV2ViS2l0TXV0YXRpb25PYnNlcnZlcjtcblxuLy8gTXV0YXRpb25PYnNlcnZlcnMgYXJlIGRlc2lyYWJsZSBiZWNhdXNlIHRoZXkgaGF2ZSBoaWdoIHByaW9yaXR5IGFuZCB3b3JrXG4vLyByZWxpYWJseSBldmVyeXdoZXJlIHRoZXkgYXJlIGltcGxlbWVudGVkLlxuLy8gVGhleSBhcmUgaW1wbGVtZW50ZWQgaW4gYWxsIG1vZGVybiBicm93c2Vycy5cbi8vXG4vLyAtIEFuZHJvaWQgNC00LjNcbi8vIC0gQ2hyb21lIDI2LTM0XG4vLyAtIEZpcmVmb3ggMTQtMjlcbi8vIC0gSW50ZXJuZXQgRXhwbG9yZXIgMTFcbi8vIC0gaVBhZCBTYWZhcmkgNi03LjFcbi8vIC0gaVBob25lIFNhZmFyaSA3LTcuMVxuLy8gLSBTYWZhcmkgNi03XG5pZiAodHlwZW9mIEJyb3dzZXJNdXRhdGlvbk9ic2VydmVyID09PSBcImZ1bmN0aW9uXCIpIHtcbiAgICByZXF1ZXN0Rmx1c2ggPSBtYWtlUmVxdWVzdENhbGxGcm9tTXV0YXRpb25PYnNlcnZlcihmbHVzaCk7XG5cbi8vIE1lc3NhZ2VDaGFubmVscyBhcmUgZGVzaXJhYmxlIGJlY2F1c2UgdGhleSBnaXZlIGRpcmVjdCBhY2Nlc3MgdG8gdGhlIEhUTUxcbi8vIHRhc2sgcXVldWUsIGFyZSBpbXBsZW1lbnRlZCBpbiBJbnRlcm5ldCBFeHBsb3JlciAxMCwgU2FmYXJpIDUuMC0xLCBhbmQgT3BlcmFcbi8vIDExLTEyLCBhbmQgaW4gd2ViIHdvcmtlcnMgaW4gbWFueSBlbmdpbmVzLlxuLy8gQWx0aG91Z2ggbWVzc2FnZSBjaGFubmVscyB5aWVsZCB0byBhbnkgcXVldWVkIHJlbmRlcmluZyBhbmQgSU8gdGFza3MsIHRoZXlcbi8vIHdvdWxkIGJlIGJldHRlciB0aGFuIGltcG9zaW5nIHRoZSA0bXMgZGVsYXkgb2YgdGltZXJzLlxuLy8gSG93ZXZlciwgdGhleSBkbyBub3Qgd29yayByZWxpYWJseSBpbiBJbnRlcm5ldCBFeHBsb3JlciBvciBTYWZhcmkuXG5cbi8vIEludGVybmV0IEV4cGxvcmVyIDEwIGlzIHRoZSBvbmx5IGJyb3dzZXIgdGhhdCBoYXMgc2V0SW1tZWRpYXRlIGJ1dCBkb2VzXG4vLyBub3QgaGF2ZSBNdXRhdGlvbk9ic2VydmVycy5cbi8vIEFsdGhvdWdoIHNldEltbWVkaWF0ZSB5aWVsZHMgdG8gdGhlIGJyb3dzZXIncyByZW5kZXJlciwgaXQgd291bGQgYmVcbi8vIHByZWZlcnJhYmxlIHRvIGZhbGxpbmcgYmFjayB0byBzZXRUaW1lb3V0IHNpbmNlIGl0IGRvZXMgbm90IGhhdmVcbi8vIHRoZSBtaW5pbXVtIDRtcyBwZW5hbHR5LlxuLy8gVW5mb3J0dW5hdGVseSB0aGVyZSBhcHBlYXJzIHRvIGJlIGEgYnVnIGluIEludGVybmV0IEV4cGxvcmVyIDEwIE1vYmlsZSAoYW5kXG4vLyBEZXNrdG9wIHRvIGEgbGVzc2VyIGV4dGVudCkgdGhhdCByZW5kZXJzIGJvdGggc2V0SW1tZWRpYXRlIGFuZFxuLy8gTWVzc2FnZUNoYW5uZWwgdXNlbGVzcyBmb3IgdGhlIHB1cnBvc2VzIG9mIEFTQVAuXG4vLyBodHRwczovL2dpdGh1Yi5jb20va3Jpc2tvd2FsL3EvaXNzdWVzLzM5NlxuXG4vLyBUaW1lcnMgYXJlIGltcGxlbWVudGVkIHVuaXZlcnNhbGx5LlxuLy8gV2UgZmFsbCBiYWNrIHRvIHRpbWVycyBpbiB3b3JrZXJzIGluIG1vc3QgZW5naW5lcywgYW5kIGluIGZvcmVncm91bmRcbi8vIGNvbnRleHRzIGluIHRoZSBmb2xsb3dpbmcgYnJvd3NlcnMuXG4vLyBIb3dldmVyLCBub3RlIHRoYXQgZXZlbiB0aGlzIHNpbXBsZSBjYXNlIHJlcXVpcmVzIG51YW5jZXMgdG8gb3BlcmF0ZSBpbiBhXG4vLyBicm9hZCBzcGVjdHJ1bSBvZiBicm93c2Vycy5cbi8vXG4vLyAtIEZpcmVmb3ggMy0xM1xuLy8gLSBJbnRlcm5ldCBFeHBsb3JlciA2LTlcbi8vIC0gaVBhZCBTYWZhcmkgNC4zXG4vLyAtIEx5bnggMi44Ljdcbn0gZWxzZSB7XG4gICAgcmVxdWVzdEZsdXNoID0gbWFrZVJlcXVlc3RDYWxsRnJvbVRpbWVyKGZsdXNoKTtcbn1cblxuLy8gYHJlcXVlc3RGbHVzaGAgcmVxdWVzdHMgdGhhdCB0aGUgaGlnaCBwcmlvcml0eSBldmVudCBxdWV1ZSBiZSBmbHVzaGVkIGFzXG4vLyBzb29uIGFzIHBvc3NpYmxlLlxuLy8gVGhpcyBpcyB1c2VmdWwgdG8gcHJldmVudCBhbiBlcnJvciB0aHJvd24gaW4gYSB0YXNrIGZyb20gc3RhbGxpbmcgdGhlIGV2ZW50XG4vLyBxdWV1ZSBpZiB0aGUgZXhjZXB0aW9uIGhhbmRsZWQgYnkgTm9kZS5qc+KAmXNcbi8vIGBwcm9jZXNzLm9uKFwidW5jYXVnaHRFeGNlcHRpb25cIilgIG9yIGJ5IGEgZG9tYWluLlxucmF3QXNhcC5yZXF1ZXN0Rmx1c2ggPSByZXF1ZXN0Rmx1c2g7XG5cbi8vIFRvIHJlcXVlc3QgYSBoaWdoIHByaW9yaXR5IGV2ZW50LCB3ZSBpbmR1Y2UgYSBtdXRhdGlvbiBvYnNlcnZlciBieSB0b2dnbGluZ1xuLy8gdGhlIHRleHQgb2YgYSB0ZXh0IG5vZGUgYmV0d2VlbiBcIjFcIiBhbmQgXCItMVwiLlxuZnVuY3Rpb24gbWFrZVJlcXVlc3RDYWxsRnJvbU11dGF0aW9uT2JzZXJ2ZXIoY2FsbGJhY2spIHtcbiAgICB2YXIgdG9nZ2xlID0gMTtcbiAgICB2YXIgb2JzZXJ2ZXIgPSBuZXcgQnJvd3Nlck11dGF0aW9uT2JzZXJ2ZXIoY2FsbGJhY2spO1xuICAgIHZhciBub2RlID0gZG9jdW1lbnQuY3JlYXRlVGV4dE5vZGUoXCJcIik7XG4gICAgb2JzZXJ2ZXIub2JzZXJ2ZShub2RlLCB7Y2hhcmFjdGVyRGF0YTogdHJ1ZX0pO1xuICAgIHJldHVybiBmdW5jdGlvbiByZXF1ZXN0Q2FsbCgpIHtcbiAgICAgICAgdG9nZ2xlID0gLXRvZ2dsZTtcbiAgICAgICAgbm9kZS5kYXRhID0gdG9nZ2xlO1xuICAgIH07XG59XG5cbi8vIFRoZSBtZXNzYWdlIGNoYW5uZWwgdGVjaG5pcXVlIHdhcyBkaXNjb3ZlcmVkIGJ5IE1hbHRlIFVibCBhbmQgd2FzIHRoZVxuLy8gb3JpZ2luYWwgZm91bmRhdGlvbiBmb3IgdGhpcyBsaWJyYXJ5LlxuLy8gaHR0cDovL3d3dy5ub25ibG9ja2luZy5pby8yMDExLzA2L3dpbmRvd25leHR0aWNrLmh0bWxcblxuLy8gU2FmYXJpIDYuMC41IChhdCBsZWFzdCkgaW50ZXJtaXR0ZW50bHkgZmFpbHMgdG8gY3JlYXRlIG1lc3NhZ2UgcG9ydHMgb24gYVxuLy8gcGFnZSdzIGZpcnN0IGxvYWQuIFRoYW5rZnVsbHksIHRoaXMgdmVyc2lvbiBvZiBTYWZhcmkgc3VwcG9ydHNcbi8vIE11dGF0aW9uT2JzZXJ2ZXJzLCBzbyB3ZSBkb24ndCBuZWVkIHRvIGZhbGwgYmFjayBpbiB0aGF0IGNhc2UuXG5cbi8vIGZ1bmN0aW9uIG1ha2VSZXF1ZXN0Q2FsbEZyb21NZXNzYWdlQ2hhbm5lbChjYWxsYmFjaykge1xuLy8gICAgIHZhciBjaGFubmVsID0gbmV3IE1lc3NhZ2VDaGFubmVsKCk7XG4vLyAgICAgY2hhbm5lbC5wb3J0MS5vbm1lc3NhZ2UgPSBjYWxsYmFjaztcbi8vICAgICByZXR1cm4gZnVuY3Rpb24gcmVxdWVzdENhbGwoKSB7XG4vLyAgICAgICAgIGNoYW5uZWwucG9ydDIucG9zdE1lc3NhZ2UoMCk7XG4vLyAgICAgfTtcbi8vIH1cblxuLy8gRm9yIHJlYXNvbnMgZXhwbGFpbmVkIGFib3ZlLCB3ZSBhcmUgYWxzbyB1bmFibGUgdG8gdXNlIGBzZXRJbW1lZGlhdGVgXG4vLyB1bmRlciBhbnkgY2lyY3Vtc3RhbmNlcy5cbi8vIEV2ZW4gaWYgd2Ugd2VyZSwgdGhlcmUgaXMgYW5vdGhlciBidWcgaW4gSW50ZXJuZXQgRXhwbG9yZXIgMTAuXG4vLyBJdCBpcyBub3Qgc3VmZmljaWVudCB0byBhc3NpZ24gYHNldEltbWVkaWF0ZWAgdG8gYHJlcXVlc3RGbHVzaGAgYmVjYXVzZVxuLy8gYHNldEltbWVkaWF0ZWAgbXVzdCBiZSBjYWxsZWQgKmJ5IG5hbWUqIGFuZCB0aGVyZWZvcmUgbXVzdCBiZSB3cmFwcGVkIGluIGFcbi8vIGNsb3N1cmUuXG4vLyBOZXZlciBmb3JnZXQuXG5cbi8vIGZ1bmN0aW9uIG1ha2VSZXF1ZXN0Q2FsbEZyb21TZXRJbW1lZGlhdGUoY2FsbGJhY2spIHtcbi8vICAgICByZXR1cm4gZnVuY3Rpb24gcmVxdWVzdENhbGwoKSB7XG4vLyAgICAgICAgIHNldEltbWVkaWF0ZShjYWxsYmFjayk7XG4vLyAgICAgfTtcbi8vIH1cblxuLy8gU2FmYXJpIDYuMCBoYXMgYSBwcm9ibGVtIHdoZXJlIHRpbWVycyB3aWxsIGdldCBsb3N0IHdoaWxlIHRoZSB1c2VyIGlzXG4vLyBzY3JvbGxpbmcuIFRoaXMgcHJvYmxlbSBkb2VzIG5vdCBpbXBhY3QgQVNBUCBiZWNhdXNlIFNhZmFyaSA2LjAgc3VwcG9ydHNcbi8vIG11dGF0aW9uIG9ic2VydmVycywgc28gdGhhdCBpbXBsZW1lbnRhdGlvbiBpcyB1c2VkIGluc3RlYWQuXG4vLyBIb3dldmVyLCBpZiB3ZSBldmVyIGVsZWN0IHRvIHVzZSB0aW1lcnMgaW4gU2FmYXJpLCB0aGUgcHJldmFsZW50IHdvcmstYXJvdW5kXG4vLyBpcyB0byBhZGQgYSBzY3JvbGwgZXZlbnQgbGlzdGVuZXIgdGhhdCBjYWxscyBmb3IgYSBmbHVzaC5cblxuLy8gYHNldFRpbWVvdXRgIGRvZXMgbm90IGNhbGwgdGhlIHBhc3NlZCBjYWxsYmFjayBpZiB0aGUgZGVsYXkgaXMgbGVzcyB0aGFuXG4vLyBhcHByb3hpbWF0ZWx5IDcgaW4gd2ViIHdvcmtlcnMgaW4gRmlyZWZveCA4IHRocm91Z2ggMTgsIGFuZCBzb21ldGltZXMgbm90XG4vLyBldmVuIHRoZW4uXG5cbmZ1bmN0aW9uIG1ha2VSZXF1ZXN0Q2FsbEZyb21UaW1lcihjYWxsYmFjaykge1xuICAgIHJldHVybiBmdW5jdGlvbiByZXF1ZXN0Q2FsbCgpIHtcbiAgICAgICAgLy8gV2UgZGlzcGF0Y2ggYSB0aW1lb3V0IHdpdGggYSBzcGVjaWZpZWQgZGVsYXkgb2YgMCBmb3IgZW5naW5lcyB0aGF0XG4gICAgICAgIC8vIGNhbiByZWxpYWJseSBhY2NvbW1vZGF0ZSB0aGF0IHJlcXVlc3QuIFRoaXMgd2lsbCB1c3VhbGx5IGJlIHNuYXBwZWRcbiAgICAgICAgLy8gdG8gYSA0IG1pbGlzZWNvbmQgZGVsYXksIGJ1dCBvbmNlIHdlJ3JlIGZsdXNoaW5nLCB0aGVyZSdzIG5vIGRlbGF5XG4gICAgICAgIC8vIGJldHdlZW4gZXZlbnRzLlxuICAgICAgICB2YXIgdGltZW91dEhhbmRsZSA9IHNldFRpbWVvdXQoaGFuZGxlVGltZXIsIDApO1xuICAgICAgICAvLyBIb3dldmVyLCBzaW5jZSB0aGlzIHRpbWVyIGdldHMgZnJlcXVlbnRseSBkcm9wcGVkIGluIEZpcmVmb3hcbiAgICAgICAgLy8gd29ya2Vycywgd2UgZW5saXN0IGFuIGludGVydmFsIGhhbmRsZSB0aGF0IHdpbGwgdHJ5IHRvIGZpcmVcbiAgICAgICAgLy8gYW4gZXZlbnQgMjAgdGltZXMgcGVyIHNlY29uZCB1bnRpbCBpdCBzdWNjZWVkcy5cbiAgICAgICAgdmFyIGludGVydmFsSGFuZGxlID0gc2V0SW50ZXJ2YWwoaGFuZGxlVGltZXIsIDUwKTtcblxuICAgICAgICBmdW5jdGlvbiBoYW5kbGVUaW1lcigpIHtcbiAgICAgICAgICAgIC8vIFdoaWNoZXZlciB0aW1lciBzdWNjZWVkcyB3aWxsIGNhbmNlbCBib3RoIHRpbWVycyBhbmRcbiAgICAgICAgICAgIC8vIGV4ZWN1dGUgdGhlIGNhbGxiYWNrLlxuICAgICAgICAgICAgY2xlYXJUaW1lb3V0KHRpbWVvdXRIYW5kbGUpO1xuICAgICAgICAgICAgY2xlYXJJbnRlcnZhbChpbnRlcnZhbEhhbmRsZSk7XG4gICAgICAgICAgICBjYWxsYmFjaygpO1xuICAgICAgICB9XG4gICAgfTtcbn1cblxuLy8gVGhpcyBpcyBmb3IgYGFzYXAuanNgIG9ubHkuXG4vLyBJdHMgbmFtZSB3aWxsIGJlIHBlcmlvZGljYWxseSByYW5kb21pemVkIHRvIGJyZWFrIGFueSBjb2RlIHRoYXQgZGVwZW5kcyBvblxuLy8gaXRzIGV4aXN0ZW5jZS5cbnJhd0FzYXAubWFrZVJlcXVlc3RDYWxsRnJvbVRpbWVyID0gbWFrZVJlcXVlc3RDYWxsRnJvbVRpbWVyO1xuXG4vLyBBU0FQIHdhcyBvcmlnaW5hbGx5IGEgbmV4dFRpY2sgc2hpbSBpbmNsdWRlZCBpbiBRLiBUaGlzIHdhcyBmYWN0b3JlZCBvdXRcbi8vIGludG8gdGhpcyBBU0FQIHBhY2thZ2UuIEl0IHdhcyBsYXRlciBhZGFwdGVkIHRvIFJTVlAgd2hpY2ggbWFkZSBmdXJ0aGVyXG4vLyBhbWVuZG1lbnRzLiBUaGVzZSBkZWNpc2lvbnMsIHBhcnRpY3VsYXJseSB0byBtYXJnaW5hbGl6ZSBNZXNzYWdlQ2hhbm5lbCBhbmRcbi8vIHRvIGNhcHR1cmUgdGhlIE11dGF0aW9uT2JzZXJ2ZXIgaW1wbGVtZW50YXRpb24gaW4gYSBjbG9zdXJlLCB3ZXJlIGludGVncmF0ZWRcbi8vIGJhY2sgaW50byBBU0FQIHByb3Blci5cbi8vIGh0dHBzOi8vZ2l0aHViLmNvbS90aWxkZWlvL3JzdnAuanMvYmxvYi9jZGRmNzIzMjU0NmE5Y2Y4NTg1MjRiNzVjZGU2ZjllZGY3MjYyMGE3L2xpYi9yc3ZwL2FzYXAuanNcbiIsIid1c2Ugc3RyaWN0J1xuXG5leHBvcnRzLmJ5dGVMZW5ndGggPSBieXRlTGVuZ3RoXG5leHBvcnRzLnRvQnl0ZUFycmF5ID0gdG9CeXRlQXJyYXlcbmV4cG9ydHMuZnJvbUJ5dGVBcnJheSA9IGZyb21CeXRlQXJyYXlcblxudmFyIGxvb2t1cCA9IFtdXG52YXIgcmV2TG9va3VwID0gW11cbnZhciBBcnIgPSB0eXBlb2YgVWludDhBcnJheSAhPT0gJ3VuZGVmaW5lZCcgPyBVaW50OEFycmF5IDogQXJyYXlcblxudmFyIGNvZGUgPSAnQUJDREVGR0hJSktMTU5PUFFSU1RVVldYWVphYmNkZWZnaGlqa2xtbm9wcXJzdHV2d3h5ejAxMjM0NTY3ODkrLydcbmZvciAodmFyIGkgPSAwLCBsZW4gPSBjb2RlLmxlbmd0aDsgaSA8IGxlbjsgKytpKSB7XG4gIGxvb2t1cFtpXSA9IGNvZGVbaV1cbiAgcmV2TG9va3VwW2NvZGUuY2hhckNvZGVBdChpKV0gPSBpXG59XG5cbi8vIFN1cHBvcnQgZGVjb2RpbmcgVVJMLXNhZmUgYmFzZTY0IHN0cmluZ3MsIGFzIE5vZGUuanMgZG9lcy5cbi8vIFNlZTogaHR0cHM6Ly9lbi53aWtpcGVkaWEub3JnL3dpa2kvQmFzZTY0I1VSTF9hcHBsaWNhdGlvbnNcbnJldkxvb2t1cFsnLScuY2hhckNvZGVBdCgwKV0gPSA2MlxucmV2TG9va3VwWydfJy5jaGFyQ29kZUF0KDApXSA9IDYzXG5cbmZ1bmN0aW9uIGdldExlbnMgKGI2NCkge1xuICB2YXIgbGVuID0gYjY0Lmxlbmd0aFxuXG4gIGlmIChsZW4gJSA0ID4gMCkge1xuICAgIHRocm93IG5ldyBFcnJvcignSW52YWxpZCBzdHJpbmcuIExlbmd0aCBtdXN0IGJlIGEgbXVsdGlwbGUgb2YgNCcpXG4gIH1cblxuICAvLyBUcmltIG9mZiBleHRyYSBieXRlcyBhZnRlciBwbGFjZWhvbGRlciBieXRlcyBhcmUgZm91bmRcbiAgLy8gU2VlOiBodHRwczovL2dpdGh1Yi5jb20vYmVhdGdhbW1pdC9iYXNlNjQtanMvaXNzdWVzLzQyXG4gIHZhciB2YWxpZExlbiA9IGI2NC5pbmRleE9mKCc9JylcbiAgaWYgKHZhbGlkTGVuID09PSAtMSkgdmFsaWRMZW4gPSBsZW5cblxuICB2YXIgcGxhY2VIb2xkZXJzTGVuID0gdmFsaWRMZW4gPT09IGxlblxuICAgID8gMFxuICAgIDogNCAtICh2YWxpZExlbiAlIDQpXG5cbiAgcmV0dXJuIFt2YWxpZExlbiwgcGxhY2VIb2xkZXJzTGVuXVxufVxuXG4vLyBiYXNlNjQgaXMgNC8zICsgdXAgdG8gdHdvIGNoYXJhY3RlcnMgb2YgdGhlIG9yaWdpbmFsIGRhdGFcbmZ1bmN0aW9uIGJ5dGVMZW5ndGggKGI2NCkge1xuICB2YXIgbGVucyA9IGdldExlbnMoYjY0KVxuICB2YXIgdmFsaWRMZW4gPSBsZW5zWzBdXG4gIHZhciBwbGFjZUhvbGRlcnNMZW4gPSBsZW5zWzFdXG4gIHJldHVybiAoKHZhbGlkTGVuICsgcGxhY2VIb2xkZXJzTGVuKSAqIDMgLyA0KSAtIHBsYWNlSG9sZGVyc0xlblxufVxuXG5mdW5jdGlvbiBfYnl0ZUxlbmd0aCAoYjY0LCB2YWxpZExlbiwgcGxhY2VIb2xkZXJzTGVuKSB7XG4gIHJldHVybiAoKHZhbGlkTGVuICsgcGxhY2VIb2xkZXJzTGVuKSAqIDMgLyA0KSAtIHBsYWNlSG9sZGVyc0xlblxufVxuXG5mdW5jdGlvbiB0b0J5dGVBcnJheSAoYjY0KSB7XG4gIHZhciB0bXBcbiAgdmFyIGxlbnMgPSBnZXRMZW5zKGI2NClcbiAgdmFyIHZhbGlkTGVuID0gbGVuc1swXVxuICB2YXIgcGxhY2VIb2xkZXJzTGVuID0gbGVuc1sxXVxuXG4gIHZhciBhcnIgPSBuZXcgQXJyKF9ieXRlTGVuZ3RoKGI2NCwgdmFsaWRMZW4sIHBsYWNlSG9sZGVyc0xlbikpXG5cbiAgdmFyIGN1ckJ5dGUgPSAwXG5cbiAgLy8gaWYgdGhlcmUgYXJlIHBsYWNlaG9sZGVycywgb25seSBnZXQgdXAgdG8gdGhlIGxhc3QgY29tcGxldGUgNCBjaGFyc1xuICB2YXIgbGVuID0gcGxhY2VIb2xkZXJzTGVuID4gMFxuICAgID8gdmFsaWRMZW4gLSA0XG4gICAgOiB2YWxpZExlblxuXG4gIHZhciBpXG4gIGZvciAoaSA9IDA7IGkgPCBsZW47IGkgKz0gNCkge1xuICAgIHRtcCA9XG4gICAgICAocmV2TG9va3VwW2I2NC5jaGFyQ29kZUF0KGkpXSA8PCAxOCkgfFxuICAgICAgKHJldkxvb2t1cFtiNjQuY2hhckNvZGVBdChpICsgMSldIDw8IDEyKSB8XG4gICAgICAocmV2TG9va3VwW2I2NC5jaGFyQ29kZUF0KGkgKyAyKV0gPDwgNikgfFxuICAgICAgcmV2TG9va3VwW2I2NC5jaGFyQ29kZUF0KGkgKyAzKV1cbiAgICBhcnJbY3VyQnl0ZSsrXSA9ICh0bXAgPj4gMTYpICYgMHhGRlxuICAgIGFycltjdXJCeXRlKytdID0gKHRtcCA+PiA4KSAmIDB4RkZcbiAgICBhcnJbY3VyQnl0ZSsrXSA9IHRtcCAmIDB4RkZcbiAgfVxuXG4gIGlmIChwbGFjZUhvbGRlcnNMZW4gPT09IDIpIHtcbiAgICB0bXAgPVxuICAgICAgKHJldkxvb2t1cFtiNjQuY2hhckNvZGVBdChpKV0gPDwgMikgfFxuICAgICAgKHJldkxvb2t1cFtiNjQuY2hhckNvZGVBdChpICsgMSldID4+IDQpXG4gICAgYXJyW2N1ckJ5dGUrK10gPSB0bXAgJiAweEZGXG4gIH1cblxuICBpZiAocGxhY2VIb2xkZXJzTGVuID09PSAxKSB7XG4gICAgdG1wID1cbiAgICAgIChyZXZMb29rdXBbYjY0LmNoYXJDb2RlQXQoaSldIDw8IDEwKSB8XG4gICAgICAocmV2TG9va3VwW2I2NC5jaGFyQ29kZUF0KGkgKyAxKV0gPDwgNCkgfFxuICAgICAgKHJldkxvb2t1cFtiNjQuY2hhckNvZGVBdChpICsgMildID4+IDIpXG4gICAgYXJyW2N1ckJ5dGUrK10gPSAodG1wID4+IDgpICYgMHhGRlxuICAgIGFycltjdXJCeXRlKytdID0gdG1wICYgMHhGRlxuICB9XG5cbiAgcmV0dXJuIGFyclxufVxuXG5mdW5jdGlvbiB0cmlwbGV0VG9CYXNlNjQgKG51bSkge1xuICByZXR1cm4gbG9va3VwW251bSA+PiAxOCAmIDB4M0ZdICtcbiAgICBsb29rdXBbbnVtID4+IDEyICYgMHgzRl0gK1xuICAgIGxvb2t1cFtudW0gPj4gNiAmIDB4M0ZdICtcbiAgICBsb29rdXBbbnVtICYgMHgzRl1cbn1cblxuZnVuY3Rpb24gZW5jb2RlQ2h1bmsgKHVpbnQ4LCBzdGFydCwgZW5kKSB7XG4gIHZhciB0bXBcbiAgdmFyIG91dHB1dCA9IFtdXG4gIGZvciAodmFyIGkgPSBzdGFydDsgaSA8IGVuZDsgaSArPSAzKSB7XG4gICAgdG1wID1cbiAgICAgICgodWludDhbaV0gPDwgMTYpICYgMHhGRjAwMDApICtcbiAgICAgICgodWludDhbaSArIDFdIDw8IDgpICYgMHhGRjAwKSArXG4gICAgICAodWludDhbaSArIDJdICYgMHhGRilcbiAgICBvdXRwdXQucHVzaCh0cmlwbGV0VG9CYXNlNjQodG1wKSlcbiAgfVxuICByZXR1cm4gb3V0cHV0LmpvaW4oJycpXG59XG5cbmZ1bmN0aW9uIGZyb21CeXRlQXJyYXkgKHVpbnQ4KSB7XG4gIHZhciB0bXBcbiAgdmFyIGxlbiA9IHVpbnQ4Lmxlbmd0aFxuICB2YXIgZXh0cmFCeXRlcyA9IGxlbiAlIDMgLy8gaWYgd2UgaGF2ZSAxIGJ5dGUgbGVmdCwgcGFkIDIgYnl0ZXNcbiAgdmFyIHBhcnRzID0gW11cbiAgdmFyIG1heENodW5rTGVuZ3RoID0gMTYzODMgLy8gbXVzdCBiZSBtdWx0aXBsZSBvZiAzXG5cbiAgLy8gZ28gdGhyb3VnaCB0aGUgYXJyYXkgZXZlcnkgdGhyZWUgYnl0ZXMsIHdlJ2xsIGRlYWwgd2l0aCB0cmFpbGluZyBzdHVmZiBsYXRlclxuICBmb3IgKHZhciBpID0gMCwgbGVuMiA9IGxlbiAtIGV4dHJhQnl0ZXM7IGkgPCBsZW4yOyBpICs9IG1heENodW5rTGVuZ3RoKSB7XG4gICAgcGFydHMucHVzaChlbmNvZGVDaHVuayhcbiAgICAgIHVpbnQ4LCBpLCAoaSArIG1heENodW5rTGVuZ3RoKSA+IGxlbjIgPyBsZW4yIDogKGkgKyBtYXhDaHVua0xlbmd0aClcbiAgICApKVxuICB9XG5cbiAgLy8gcGFkIHRoZSBlbmQgd2l0aCB6ZXJvcywgYnV0IG1ha2Ugc3VyZSB0byBub3QgZm9yZ2V0IHRoZSBleHRyYSBieXRlc1xuICBpZiAoZXh0cmFCeXRlcyA9PT0gMSkge1xuICAgIHRtcCA9IHVpbnQ4W2xlbiAtIDFdXG4gICAgcGFydHMucHVzaChcbiAgICAgIGxvb2t1cFt0bXAgPj4gMl0gK1xuICAgICAgbG9va3VwWyh0bXAgPDwgNCkgJiAweDNGXSArXG4gICAgICAnPT0nXG4gICAgKVxuICB9IGVsc2UgaWYgKGV4dHJhQnl0ZXMgPT09IDIpIHtcbiAgICB0bXAgPSAodWludDhbbGVuIC0gMl0gPDwgOCkgKyB1aW50OFtsZW4gLSAxXVxuICAgIHBhcnRzLnB1c2goXG4gICAgICBsb29rdXBbdG1wID4+IDEwXSArXG4gICAgICBsb29rdXBbKHRtcCA+PiA0KSAmIDB4M0ZdICtcbiAgICAgIGxvb2t1cFsodG1wIDw8IDIpICYgMHgzRl0gK1xuICAgICAgJz0nXG4gICAgKVxuICB9XG5cbiAgcmV0dXJuIHBhcnRzLmpvaW4oJycpXG59XG4iLCIvKiFcbiAqIFRoZSBidWZmZXIgbW9kdWxlIGZyb20gbm9kZS5qcywgZm9yIHRoZSBicm93c2VyLlxuICpcbiAqIEBhdXRob3IgICBGZXJvc3MgQWJvdWtoYWRpamVoIDxodHRwczovL2Zlcm9zcy5vcmc+XG4gKiBAbGljZW5zZSAgTUlUXG4gKi9cbi8qIGVzbGludC1kaXNhYmxlIG5vLXByb3RvICovXG5cbid1c2Ugc3RyaWN0J1xuXG52YXIgYmFzZTY0ID0gcmVxdWlyZSgnYmFzZTY0LWpzJylcbnZhciBpZWVlNzU0ID0gcmVxdWlyZSgnaWVlZTc1NCcpXG52YXIgY3VzdG9tSW5zcGVjdFN5bWJvbCA9XG4gICh0eXBlb2YgU3ltYm9sID09PSAnZnVuY3Rpb24nICYmIHR5cGVvZiBTeW1ib2wuZm9yID09PSAnZnVuY3Rpb24nKVxuICAgID8gU3ltYm9sLmZvcignbm9kZWpzLnV0aWwuaW5zcGVjdC5jdXN0b20nKVxuICAgIDogbnVsbFxuXG5leHBvcnRzLkJ1ZmZlciA9IEJ1ZmZlclxuZXhwb3J0cy5TbG93QnVmZmVyID0gU2xvd0J1ZmZlclxuZXhwb3J0cy5JTlNQRUNUX01BWF9CWVRFUyA9IDUwXG5cbnZhciBLX01BWF9MRU5HVEggPSAweDdmZmZmZmZmXG5leHBvcnRzLmtNYXhMZW5ndGggPSBLX01BWF9MRU5HVEhcblxuLyoqXG4gKiBJZiBgQnVmZmVyLlRZUEVEX0FSUkFZX1NVUFBPUlRgOlxuICogICA9PT0gdHJ1ZSAgICBVc2UgVWludDhBcnJheSBpbXBsZW1lbnRhdGlvbiAoZmFzdGVzdClcbiAqICAgPT09IGZhbHNlICAgUHJpbnQgd2FybmluZyBhbmQgcmVjb21tZW5kIHVzaW5nIGBidWZmZXJgIHY0Lnggd2hpY2ggaGFzIGFuIE9iamVjdFxuICogICAgICAgICAgICAgICBpbXBsZW1lbnRhdGlvbiAobW9zdCBjb21wYXRpYmxlLCBldmVuIElFNilcbiAqXG4gKiBCcm93c2VycyB0aGF0IHN1cHBvcnQgdHlwZWQgYXJyYXlzIGFyZSBJRSAxMCssIEZpcmVmb3ggNCssIENocm9tZSA3KywgU2FmYXJpIDUuMSssXG4gKiBPcGVyYSAxMS42KywgaU9TIDQuMisuXG4gKlxuICogV2UgcmVwb3J0IHRoYXQgdGhlIGJyb3dzZXIgZG9lcyBub3Qgc3VwcG9ydCB0eXBlZCBhcnJheXMgaWYgdGhlIGFyZSBub3Qgc3ViY2xhc3NhYmxlXG4gKiB1c2luZyBfX3Byb3RvX18uIEZpcmVmb3ggNC0yOSBsYWNrcyBzdXBwb3J0IGZvciBhZGRpbmcgbmV3IHByb3BlcnRpZXMgdG8gYFVpbnQ4QXJyYXlgXG4gKiAoU2VlOiBodHRwczovL2J1Z3ppbGxhLm1vemlsbGEub3JnL3Nob3dfYnVnLmNnaT9pZD02OTU0MzgpLiBJRSAxMCBsYWNrcyBzdXBwb3J0XG4gKiBmb3IgX19wcm90b19fIGFuZCBoYXMgYSBidWdneSB0eXBlZCBhcnJheSBpbXBsZW1lbnRhdGlvbi5cbiAqL1xuQnVmZmVyLlRZUEVEX0FSUkFZX1NVUFBPUlQgPSB0eXBlZEFycmF5U3VwcG9ydCgpXG5cbmlmICghQnVmZmVyLlRZUEVEX0FSUkFZX1NVUFBPUlQgJiYgdHlwZW9mIGNvbnNvbGUgIT09ICd1bmRlZmluZWQnICYmXG4gICAgdHlwZW9mIGNvbnNvbGUuZXJyb3IgPT09ICdmdW5jdGlvbicpIHtcbiAgY29uc29sZS5lcnJvcihcbiAgICAnVGhpcyBicm93c2VyIGxhY2tzIHR5cGVkIGFycmF5IChVaW50OEFycmF5KSBzdXBwb3J0IHdoaWNoIGlzIHJlcXVpcmVkIGJ5ICcgK1xuICAgICdgYnVmZmVyYCB2NS54LiBVc2UgYGJ1ZmZlcmAgdjQueCBpZiB5b3UgcmVxdWlyZSBvbGQgYnJvd3NlciBzdXBwb3J0LidcbiAgKVxufVxuXG5mdW5jdGlvbiB0eXBlZEFycmF5U3VwcG9ydCAoKSB7XG4gIC8vIENhbiB0eXBlZCBhcnJheSBpbnN0YW5jZXMgY2FuIGJlIGF1Z21lbnRlZD9cbiAgdHJ5IHtcbiAgICB2YXIgYXJyID0gbmV3IFVpbnQ4QXJyYXkoMSlcbiAgICB2YXIgcHJvdG8gPSB7IGZvbzogZnVuY3Rpb24gKCkgeyByZXR1cm4gNDIgfSB9XG4gICAgT2JqZWN0LnNldFByb3RvdHlwZU9mKHByb3RvLCBVaW50OEFycmF5LnByb3RvdHlwZSlcbiAgICBPYmplY3Quc2V0UHJvdG90eXBlT2YoYXJyLCBwcm90bylcbiAgICByZXR1cm4gYXJyLmZvbygpID09PSA0MlxuICB9IGNhdGNoIChlKSB7XG4gICAgcmV0dXJuIGZhbHNlXG4gIH1cbn1cblxuT2JqZWN0LmRlZmluZVByb3BlcnR5KEJ1ZmZlci5wcm90b3R5cGUsICdwYXJlbnQnLCB7XG4gIGVudW1lcmFibGU6IHRydWUsXG4gIGdldDogZnVuY3Rpb24gKCkge1xuICAgIGlmICghQnVmZmVyLmlzQnVmZmVyKHRoaXMpKSByZXR1cm4gdW5kZWZpbmVkXG4gICAgcmV0dXJuIHRoaXMuYnVmZmVyXG4gIH1cbn0pXG5cbk9iamVjdC5kZWZpbmVQcm9wZXJ0eShCdWZmZXIucHJvdG90eXBlLCAnb2Zmc2V0Jywge1xuICBlbnVtZXJhYmxlOiB0cnVlLFxuICBnZXQ6IGZ1bmN0aW9uICgpIHtcbiAgICBpZiAoIUJ1ZmZlci5pc0J1ZmZlcih0aGlzKSkgcmV0dXJuIHVuZGVmaW5lZFxuICAgIHJldHVybiB0aGlzLmJ5dGVPZmZzZXRcbiAgfVxufSlcblxuZnVuY3Rpb24gY3JlYXRlQnVmZmVyIChsZW5ndGgpIHtcbiAgaWYgKGxlbmd0aCA+IEtfTUFYX0xFTkdUSCkge1xuICAgIHRocm93IG5ldyBSYW5nZUVycm9yKCdUaGUgdmFsdWUgXCInICsgbGVuZ3RoICsgJ1wiIGlzIGludmFsaWQgZm9yIG9wdGlvbiBcInNpemVcIicpXG4gIH1cbiAgLy8gUmV0dXJuIGFuIGF1Z21lbnRlZCBgVWludDhBcnJheWAgaW5zdGFuY2VcbiAgdmFyIGJ1ZiA9IG5ldyBVaW50OEFycmF5KGxlbmd0aClcbiAgT2JqZWN0LnNldFByb3RvdHlwZU9mKGJ1ZiwgQnVmZmVyLnByb3RvdHlwZSlcbiAgcmV0dXJuIGJ1ZlxufVxuXG4vKipcbiAqIFRoZSBCdWZmZXIgY29uc3RydWN0b3IgcmV0dXJucyBpbnN0YW5jZXMgb2YgYFVpbnQ4QXJyYXlgIHRoYXQgaGF2ZSB0aGVpclxuICogcHJvdG90eXBlIGNoYW5nZWQgdG8gYEJ1ZmZlci5wcm90b3R5cGVgLiBGdXJ0aGVybW9yZSwgYEJ1ZmZlcmAgaXMgYSBzdWJjbGFzcyBvZlxuICogYFVpbnQ4QXJyYXlgLCBzbyB0aGUgcmV0dXJuZWQgaW5zdGFuY2VzIHdpbGwgaGF2ZSBhbGwgdGhlIG5vZGUgYEJ1ZmZlcmAgbWV0aG9kc1xuICogYW5kIHRoZSBgVWludDhBcnJheWAgbWV0aG9kcy4gU3F1YXJlIGJyYWNrZXQgbm90YXRpb24gd29ya3MgYXMgZXhwZWN0ZWQgLS0gaXRcbiAqIHJldHVybnMgYSBzaW5nbGUgb2N0ZXQuXG4gKlxuICogVGhlIGBVaW50OEFycmF5YCBwcm90b3R5cGUgcmVtYWlucyB1bm1vZGlmaWVkLlxuICovXG5cbmZ1bmN0aW9uIEJ1ZmZlciAoYXJnLCBlbmNvZGluZ09yT2Zmc2V0LCBsZW5ndGgpIHtcbiAgLy8gQ29tbW9uIGNhc2UuXG4gIGlmICh0eXBlb2YgYXJnID09PSAnbnVtYmVyJykge1xuICAgIGlmICh0eXBlb2YgZW5jb2RpbmdPck9mZnNldCA9PT0gJ3N0cmluZycpIHtcbiAgICAgIHRocm93IG5ldyBUeXBlRXJyb3IoXG4gICAgICAgICdUaGUgXCJzdHJpbmdcIiBhcmd1bWVudCBtdXN0IGJlIG9mIHR5cGUgc3RyaW5nLiBSZWNlaXZlZCB0eXBlIG51bWJlcidcbiAgICAgIClcbiAgICB9XG4gICAgcmV0dXJuIGFsbG9jVW5zYWZlKGFyZylcbiAgfVxuICByZXR1cm4gZnJvbShhcmcsIGVuY29kaW5nT3JPZmZzZXQsIGxlbmd0aClcbn1cblxuLy8gRml4IHN1YmFycmF5KCkgaW4gRVMyMDE2LiBTZWU6IGh0dHBzOi8vZ2l0aHViLmNvbS9mZXJvc3MvYnVmZmVyL3B1bGwvOTdcbmlmICh0eXBlb2YgU3ltYm9sICE9PSAndW5kZWZpbmVkJyAmJiBTeW1ib2wuc3BlY2llcyAhPSBudWxsICYmXG4gICAgQnVmZmVyW1N5bWJvbC5zcGVjaWVzXSA9PT0gQnVmZmVyKSB7XG4gIE9iamVjdC5kZWZpbmVQcm9wZXJ0eShCdWZmZXIsIFN5bWJvbC5zcGVjaWVzLCB7XG4gICAgdmFsdWU6IG51bGwsXG4gICAgY29uZmlndXJhYmxlOiB0cnVlLFxuICAgIGVudW1lcmFibGU6IGZhbHNlLFxuICAgIHdyaXRhYmxlOiBmYWxzZVxuICB9KVxufVxuXG5CdWZmZXIucG9vbFNpemUgPSA4MTkyIC8vIG5vdCB1c2VkIGJ5IHRoaXMgaW1wbGVtZW50YXRpb25cblxuZnVuY3Rpb24gZnJvbSAodmFsdWUsIGVuY29kaW5nT3JPZmZzZXQsIGxlbmd0aCkge1xuICBpZiAodHlwZW9mIHZhbHVlID09PSAnc3RyaW5nJykge1xuICAgIHJldHVybiBmcm9tU3RyaW5nKHZhbHVlLCBlbmNvZGluZ09yT2Zmc2V0KVxuICB9XG5cbiAgaWYgKEFycmF5QnVmZmVyLmlzVmlldyh2YWx1ZSkpIHtcbiAgICByZXR1cm4gZnJvbUFycmF5TGlrZSh2YWx1ZSlcbiAgfVxuXG4gIGlmICh2YWx1ZSA9PSBudWxsKSB7XG4gICAgdGhyb3cgbmV3IFR5cGVFcnJvcihcbiAgICAgICdUaGUgZmlyc3QgYXJndW1lbnQgbXVzdCBiZSBvbmUgb2YgdHlwZSBzdHJpbmcsIEJ1ZmZlciwgQXJyYXlCdWZmZXIsIEFycmF5LCAnICtcbiAgICAgICdvciBBcnJheS1saWtlIE9iamVjdC4gUmVjZWl2ZWQgdHlwZSAnICsgKHR5cGVvZiB2YWx1ZSlcbiAgICApXG4gIH1cblxuICBpZiAoaXNJbnN0YW5jZSh2YWx1ZSwgQXJyYXlCdWZmZXIpIHx8XG4gICAgICAodmFsdWUgJiYgaXNJbnN0YW5jZSh2YWx1ZS5idWZmZXIsIEFycmF5QnVmZmVyKSkpIHtcbiAgICByZXR1cm4gZnJvbUFycmF5QnVmZmVyKHZhbHVlLCBlbmNvZGluZ09yT2Zmc2V0LCBsZW5ndGgpXG4gIH1cblxuICBpZiAodHlwZW9mIHZhbHVlID09PSAnbnVtYmVyJykge1xuICAgIHRocm93IG5ldyBUeXBlRXJyb3IoXG4gICAgICAnVGhlIFwidmFsdWVcIiBhcmd1bWVudCBtdXN0IG5vdCBiZSBvZiB0eXBlIG51bWJlci4gUmVjZWl2ZWQgdHlwZSBudW1iZXInXG4gICAgKVxuICB9XG5cbiAgdmFyIHZhbHVlT2YgPSB2YWx1ZS52YWx1ZU9mICYmIHZhbHVlLnZhbHVlT2YoKVxuICBpZiAodmFsdWVPZiAhPSBudWxsICYmIHZhbHVlT2YgIT09IHZhbHVlKSB7XG4gICAgcmV0dXJuIEJ1ZmZlci5mcm9tKHZhbHVlT2YsIGVuY29kaW5nT3JPZmZzZXQsIGxlbmd0aClcbiAgfVxuXG4gIHZhciBiID0gZnJvbU9iamVjdCh2YWx1ZSlcbiAgaWYgKGIpIHJldHVybiBiXG5cbiAgaWYgKHR5cGVvZiBTeW1ib2wgIT09ICd1bmRlZmluZWQnICYmIFN5bWJvbC50b1ByaW1pdGl2ZSAhPSBudWxsICYmXG4gICAgICB0eXBlb2YgdmFsdWVbU3ltYm9sLnRvUHJpbWl0aXZlXSA9PT0gJ2Z1bmN0aW9uJykge1xuICAgIHJldHVybiBCdWZmZXIuZnJvbShcbiAgICAgIHZhbHVlW1N5bWJvbC50b1ByaW1pdGl2ZV0oJ3N0cmluZycpLCBlbmNvZGluZ09yT2Zmc2V0LCBsZW5ndGhcbiAgICApXG4gIH1cblxuICB0aHJvdyBuZXcgVHlwZUVycm9yKFxuICAgICdUaGUgZmlyc3QgYXJndW1lbnQgbXVzdCBiZSBvbmUgb2YgdHlwZSBzdHJpbmcsIEJ1ZmZlciwgQXJyYXlCdWZmZXIsIEFycmF5LCAnICtcbiAgICAnb3IgQXJyYXktbGlrZSBPYmplY3QuIFJlY2VpdmVkIHR5cGUgJyArICh0eXBlb2YgdmFsdWUpXG4gIClcbn1cblxuLyoqXG4gKiBGdW5jdGlvbmFsbHkgZXF1aXZhbGVudCB0byBCdWZmZXIoYXJnLCBlbmNvZGluZykgYnV0IHRocm93cyBhIFR5cGVFcnJvclxuICogaWYgdmFsdWUgaXMgYSBudW1iZXIuXG4gKiBCdWZmZXIuZnJvbShzdHJbLCBlbmNvZGluZ10pXG4gKiBCdWZmZXIuZnJvbShhcnJheSlcbiAqIEJ1ZmZlci5mcm9tKGJ1ZmZlcilcbiAqIEJ1ZmZlci5mcm9tKGFycmF5QnVmZmVyWywgYnl0ZU9mZnNldFssIGxlbmd0aF1dKVxuICoqL1xuQnVmZmVyLmZyb20gPSBmdW5jdGlvbiAodmFsdWUsIGVuY29kaW5nT3JPZmZzZXQsIGxlbmd0aCkge1xuICByZXR1cm4gZnJvbSh2YWx1ZSwgZW5jb2RpbmdPck9mZnNldCwgbGVuZ3RoKVxufVxuXG4vLyBOb3RlOiBDaGFuZ2UgcHJvdG90eXBlICphZnRlciogQnVmZmVyLmZyb20gaXMgZGVmaW5lZCB0byB3b3JrYXJvdW5kIENocm9tZSBidWc6XG4vLyBodHRwczovL2dpdGh1Yi5jb20vZmVyb3NzL2J1ZmZlci9wdWxsLzE0OFxuT2JqZWN0LnNldFByb3RvdHlwZU9mKEJ1ZmZlci5wcm90b3R5cGUsIFVpbnQ4QXJyYXkucHJvdG90eXBlKVxuT2JqZWN0LnNldFByb3RvdHlwZU9mKEJ1ZmZlciwgVWludDhBcnJheSlcblxuZnVuY3Rpb24gYXNzZXJ0U2l6ZSAoc2l6ZSkge1xuICBpZiAodHlwZW9mIHNpemUgIT09ICdudW1iZXInKSB7XG4gICAgdGhyb3cgbmV3IFR5cGVFcnJvcignXCJzaXplXCIgYXJndW1lbnQgbXVzdCBiZSBvZiB0eXBlIG51bWJlcicpXG4gIH0gZWxzZSBpZiAoc2l6ZSA8IDApIHtcbiAgICB0aHJvdyBuZXcgUmFuZ2VFcnJvcignVGhlIHZhbHVlIFwiJyArIHNpemUgKyAnXCIgaXMgaW52YWxpZCBmb3Igb3B0aW9uIFwic2l6ZVwiJylcbiAgfVxufVxuXG5mdW5jdGlvbiBhbGxvYyAoc2l6ZSwgZmlsbCwgZW5jb2RpbmcpIHtcbiAgYXNzZXJ0U2l6ZShzaXplKVxuICBpZiAoc2l6ZSA8PSAwKSB7XG4gICAgcmV0dXJuIGNyZWF0ZUJ1ZmZlcihzaXplKVxuICB9XG4gIGlmIChmaWxsICE9PSB1bmRlZmluZWQpIHtcbiAgICAvLyBPbmx5IHBheSBhdHRlbnRpb24gdG8gZW5jb2RpbmcgaWYgaXQncyBhIHN0cmluZy4gVGhpc1xuICAgIC8vIHByZXZlbnRzIGFjY2lkZW50YWxseSBzZW5kaW5nIGluIGEgbnVtYmVyIHRoYXQgd291bGRcbiAgICAvLyBiZSBpbnRlcnByZXR0ZWQgYXMgYSBzdGFydCBvZmZzZXQuXG4gICAgcmV0dXJuIHR5cGVvZiBlbmNvZGluZyA9PT0gJ3N0cmluZydcbiAgICAgID8gY3JlYXRlQnVmZmVyKHNpemUpLmZpbGwoZmlsbCwgZW5jb2RpbmcpXG4gICAgICA6IGNyZWF0ZUJ1ZmZlcihzaXplKS5maWxsKGZpbGwpXG4gIH1cbiAgcmV0dXJuIGNyZWF0ZUJ1ZmZlcihzaXplKVxufVxuXG4vKipcbiAqIENyZWF0ZXMgYSBuZXcgZmlsbGVkIEJ1ZmZlciBpbnN0YW5jZS5cbiAqIGFsbG9jKHNpemVbLCBmaWxsWywgZW5jb2RpbmddXSlcbiAqKi9cbkJ1ZmZlci5hbGxvYyA9IGZ1bmN0aW9uIChzaXplLCBmaWxsLCBlbmNvZGluZykge1xuICByZXR1cm4gYWxsb2Moc2l6ZSwgZmlsbCwgZW5jb2RpbmcpXG59XG5cbmZ1bmN0aW9uIGFsbG9jVW5zYWZlIChzaXplKSB7XG4gIGFzc2VydFNpemUoc2l6ZSlcbiAgcmV0dXJuIGNyZWF0ZUJ1ZmZlcihzaXplIDwgMCA/IDAgOiBjaGVja2VkKHNpemUpIHwgMClcbn1cblxuLyoqXG4gKiBFcXVpdmFsZW50IHRvIEJ1ZmZlcihudW0pLCBieSBkZWZhdWx0IGNyZWF0ZXMgYSBub24temVyby1maWxsZWQgQnVmZmVyIGluc3RhbmNlLlxuICogKi9cbkJ1ZmZlci5hbGxvY1Vuc2FmZSA9IGZ1bmN0aW9uIChzaXplKSB7XG4gIHJldHVybiBhbGxvY1Vuc2FmZShzaXplKVxufVxuLyoqXG4gKiBFcXVpdmFsZW50IHRvIFNsb3dCdWZmZXIobnVtKSwgYnkgZGVmYXVsdCBjcmVhdGVzIGEgbm9uLXplcm8tZmlsbGVkIEJ1ZmZlciBpbnN0YW5jZS5cbiAqL1xuQnVmZmVyLmFsbG9jVW5zYWZlU2xvdyA9IGZ1bmN0aW9uIChzaXplKSB7XG4gIHJldHVybiBhbGxvY1Vuc2FmZShzaXplKVxufVxuXG5mdW5jdGlvbiBmcm9tU3RyaW5nIChzdHJpbmcsIGVuY29kaW5nKSB7XG4gIGlmICh0eXBlb2YgZW5jb2RpbmcgIT09ICdzdHJpbmcnIHx8IGVuY29kaW5nID09PSAnJykge1xuICAgIGVuY29kaW5nID0gJ3V0ZjgnXG4gIH1cblxuICBpZiAoIUJ1ZmZlci5pc0VuY29kaW5nKGVuY29kaW5nKSkge1xuICAgIHRocm93IG5ldyBUeXBlRXJyb3IoJ1Vua25vd24gZW5jb2Rpbmc6ICcgKyBlbmNvZGluZylcbiAgfVxuXG4gIHZhciBsZW5ndGggPSBieXRlTGVuZ3RoKHN0cmluZywgZW5jb2RpbmcpIHwgMFxuICB2YXIgYnVmID0gY3JlYXRlQnVmZmVyKGxlbmd0aClcblxuICB2YXIgYWN0dWFsID0gYnVmLndyaXRlKHN0cmluZywgZW5jb2RpbmcpXG5cbiAgaWYgKGFjdHVhbCAhPT0gbGVuZ3RoKSB7XG4gICAgLy8gV3JpdGluZyBhIGhleCBzdHJpbmcsIGZvciBleGFtcGxlLCB0aGF0IGNvbnRhaW5zIGludmFsaWQgY2hhcmFjdGVycyB3aWxsXG4gICAgLy8gY2F1c2UgZXZlcnl0aGluZyBhZnRlciB0aGUgZmlyc3QgaW52YWxpZCBjaGFyYWN0ZXIgdG8gYmUgaWdub3JlZC4gKGUuZy5cbiAgICAvLyAnYWJ4eGNkJyB3aWxsIGJlIHRyZWF0ZWQgYXMgJ2FiJylcbiAgICBidWYgPSBidWYuc2xpY2UoMCwgYWN0dWFsKVxuICB9XG5cbiAgcmV0dXJuIGJ1ZlxufVxuXG5mdW5jdGlvbiBmcm9tQXJyYXlMaWtlIChhcnJheSkge1xuICB2YXIgbGVuZ3RoID0gYXJyYXkubGVuZ3RoIDwgMCA/IDAgOiBjaGVja2VkKGFycmF5Lmxlbmd0aCkgfCAwXG4gIHZhciBidWYgPSBjcmVhdGVCdWZmZXIobGVuZ3RoKVxuICBmb3IgKHZhciBpID0gMDsgaSA8IGxlbmd0aDsgaSArPSAxKSB7XG4gICAgYnVmW2ldID0gYXJyYXlbaV0gJiAyNTVcbiAgfVxuICByZXR1cm4gYnVmXG59XG5cbmZ1bmN0aW9uIGZyb21BcnJheUJ1ZmZlciAoYXJyYXksIGJ5dGVPZmZzZXQsIGxlbmd0aCkge1xuICBpZiAoYnl0ZU9mZnNldCA8IDAgfHwgYXJyYXkuYnl0ZUxlbmd0aCA8IGJ5dGVPZmZzZXQpIHtcbiAgICB0aHJvdyBuZXcgUmFuZ2VFcnJvcignXCJvZmZzZXRcIiBpcyBvdXRzaWRlIG9mIGJ1ZmZlciBib3VuZHMnKVxuICB9XG5cbiAgaWYgKGFycmF5LmJ5dGVMZW5ndGggPCBieXRlT2Zmc2V0ICsgKGxlbmd0aCB8fCAwKSkge1xuICAgIHRocm93IG5ldyBSYW5nZUVycm9yKCdcImxlbmd0aFwiIGlzIG91dHNpZGUgb2YgYnVmZmVyIGJvdW5kcycpXG4gIH1cblxuICB2YXIgYnVmXG4gIGlmIChieXRlT2Zmc2V0ID09PSB1bmRlZmluZWQgJiYgbGVuZ3RoID09PSB1bmRlZmluZWQpIHtcbiAgICBidWYgPSBuZXcgVWludDhBcnJheShhcnJheSlcbiAgfSBlbHNlIGlmIChsZW5ndGggPT09IHVuZGVmaW5lZCkge1xuICAgIGJ1ZiA9IG5ldyBVaW50OEFycmF5KGFycmF5LCBieXRlT2Zmc2V0KVxuICB9IGVsc2Uge1xuICAgIGJ1ZiA9IG5ldyBVaW50OEFycmF5KGFycmF5LCBieXRlT2Zmc2V0LCBsZW5ndGgpXG4gIH1cblxuICAvLyBSZXR1cm4gYW4gYXVnbWVudGVkIGBVaW50OEFycmF5YCBpbnN0YW5jZVxuICBPYmplY3Quc2V0UHJvdG90eXBlT2YoYnVmLCBCdWZmZXIucHJvdG90eXBlKVxuXG4gIHJldHVybiBidWZcbn1cblxuZnVuY3Rpb24gZnJvbU9iamVjdCAob2JqKSB7XG4gIGlmIChCdWZmZXIuaXNCdWZmZXIob2JqKSkge1xuICAgIHZhciBsZW4gPSBjaGVja2VkKG9iai5sZW5ndGgpIHwgMFxuICAgIHZhciBidWYgPSBjcmVhdGVCdWZmZXIobGVuKVxuXG4gICAgaWYgKGJ1Zi5sZW5ndGggPT09IDApIHtcbiAgICAgIHJldHVybiBidWZcbiAgICB9XG5cbiAgICBvYmouY29weShidWYsIDAsIDAsIGxlbilcbiAgICByZXR1cm4gYnVmXG4gIH1cblxuICBpZiAob2JqLmxlbmd0aCAhPT0gdW5kZWZpbmVkKSB7XG4gICAgaWYgKHR5cGVvZiBvYmoubGVuZ3RoICE9PSAnbnVtYmVyJyB8fCBudW1iZXJJc05hTihvYmoubGVuZ3RoKSkge1xuICAgICAgcmV0dXJuIGNyZWF0ZUJ1ZmZlcigwKVxuICAgIH1cbiAgICByZXR1cm4gZnJvbUFycmF5TGlrZShvYmopXG4gIH1cblxuICBpZiAob2JqLnR5cGUgPT09ICdCdWZmZXInICYmIEFycmF5LmlzQXJyYXkob2JqLmRhdGEpKSB7XG4gICAgcmV0dXJuIGZyb21BcnJheUxpa2Uob2JqLmRhdGEpXG4gIH1cbn1cblxuZnVuY3Rpb24gY2hlY2tlZCAobGVuZ3RoKSB7XG4gIC8vIE5vdGU6IGNhbm5vdCB1c2UgYGxlbmd0aCA8IEtfTUFYX0xFTkdUSGAgaGVyZSBiZWNhdXNlIHRoYXQgZmFpbHMgd2hlblxuICAvLyBsZW5ndGggaXMgTmFOICh3aGljaCBpcyBvdGhlcndpc2UgY29lcmNlZCB0byB6ZXJvLilcbiAgaWYgKGxlbmd0aCA+PSBLX01BWF9MRU5HVEgpIHtcbiAgICB0aHJvdyBuZXcgUmFuZ2VFcnJvcignQXR0ZW1wdCB0byBhbGxvY2F0ZSBCdWZmZXIgbGFyZ2VyIHRoYW4gbWF4aW11bSAnICtcbiAgICAgICAgICAgICAgICAgICAgICAgICAnc2l6ZTogMHgnICsgS19NQVhfTEVOR1RILnRvU3RyaW5nKDE2KSArICcgYnl0ZXMnKVxuICB9XG4gIHJldHVybiBsZW5ndGggfCAwXG59XG5cbmZ1bmN0aW9uIFNsb3dCdWZmZXIgKGxlbmd0aCkge1xuICBpZiAoK2xlbmd0aCAhPSBsZW5ndGgpIHsgLy8gZXNsaW50LWRpc2FibGUtbGluZSBlcWVxZXFcbiAgICBsZW5ndGggPSAwXG4gIH1cbiAgcmV0dXJuIEJ1ZmZlci5hbGxvYygrbGVuZ3RoKVxufVxuXG5CdWZmZXIuaXNCdWZmZXIgPSBmdW5jdGlvbiBpc0J1ZmZlciAoYikge1xuICByZXR1cm4gYiAhPSBudWxsICYmIGIuX2lzQnVmZmVyID09PSB0cnVlICYmXG4gICAgYiAhPT0gQnVmZmVyLnByb3RvdHlwZSAvLyBzbyBCdWZmZXIuaXNCdWZmZXIoQnVmZmVyLnByb3RvdHlwZSkgd2lsbCBiZSBmYWxzZVxufVxuXG5CdWZmZXIuY29tcGFyZSA9IGZ1bmN0aW9uIGNvbXBhcmUgKGEsIGIpIHtcbiAgaWYgKGlzSW5zdGFuY2UoYSwgVWludDhBcnJheSkpIGEgPSBCdWZmZXIuZnJvbShhLCBhLm9mZnNldCwgYS5ieXRlTGVuZ3RoKVxuICBpZiAoaXNJbnN0YW5jZShiLCBVaW50OEFycmF5KSkgYiA9IEJ1ZmZlci5mcm9tKGIsIGIub2Zmc2V0LCBiLmJ5dGVMZW5ndGgpXG4gIGlmICghQnVmZmVyLmlzQnVmZmVyKGEpIHx8ICFCdWZmZXIuaXNCdWZmZXIoYikpIHtcbiAgICB0aHJvdyBuZXcgVHlwZUVycm9yKFxuICAgICAgJ1RoZSBcImJ1ZjFcIiwgXCJidWYyXCIgYXJndW1lbnRzIG11c3QgYmUgb25lIG9mIHR5cGUgQnVmZmVyIG9yIFVpbnQ4QXJyYXknXG4gICAgKVxuICB9XG5cbiAgaWYgKGEgPT09IGIpIHJldHVybiAwXG5cbiAgdmFyIHggPSBhLmxlbmd0aFxuICB2YXIgeSA9IGIubGVuZ3RoXG5cbiAgZm9yICh2YXIgaSA9IDAsIGxlbiA9IE1hdGgubWluKHgsIHkpOyBpIDwgbGVuOyArK2kpIHtcbiAgICBpZiAoYVtpXSAhPT0gYltpXSkge1xuICAgICAgeCA9IGFbaV1cbiAgICAgIHkgPSBiW2ldXG4gICAgICBicmVha1xuICAgIH1cbiAgfVxuXG4gIGlmICh4IDwgeSkgcmV0dXJuIC0xXG4gIGlmICh5IDwgeCkgcmV0dXJuIDFcbiAgcmV0dXJuIDBcbn1cblxuQnVmZmVyLmlzRW5jb2RpbmcgPSBmdW5jdGlvbiBpc0VuY29kaW5nIChlbmNvZGluZykge1xuICBzd2l0Y2ggKFN0cmluZyhlbmNvZGluZykudG9Mb3dlckNhc2UoKSkge1xuICAgIGNhc2UgJ2hleCc6XG4gICAgY2FzZSAndXRmOCc6XG4gICAgY2FzZSAndXRmLTgnOlxuICAgIGNhc2UgJ2FzY2lpJzpcbiAgICBjYXNlICdsYXRpbjEnOlxuICAgIGNhc2UgJ2JpbmFyeSc6XG4gICAgY2FzZSAnYmFzZTY0JzpcbiAgICBjYXNlICd1Y3MyJzpcbiAgICBjYXNlICd1Y3MtMic6XG4gICAgY2FzZSAndXRmMTZsZSc6XG4gICAgY2FzZSAndXRmLTE2bGUnOlxuICAgICAgcmV0dXJuIHRydWVcbiAgICBkZWZhdWx0OlxuICAgICAgcmV0dXJuIGZhbHNlXG4gIH1cbn1cblxuQnVmZmVyLmNvbmNhdCA9IGZ1bmN0aW9uIGNvbmNhdCAobGlzdCwgbGVuZ3RoKSB7XG4gIGlmICghQXJyYXkuaXNBcnJheShsaXN0KSkge1xuICAgIHRocm93IG5ldyBUeXBlRXJyb3IoJ1wibGlzdFwiIGFyZ3VtZW50IG11c3QgYmUgYW4gQXJyYXkgb2YgQnVmZmVycycpXG4gIH1cblxuICBpZiAobGlzdC5sZW5ndGggPT09IDApIHtcbiAgICByZXR1cm4gQnVmZmVyLmFsbG9jKDApXG4gIH1cblxuICB2YXIgaVxuICBpZiAobGVuZ3RoID09PSB1bmRlZmluZWQpIHtcbiAgICBsZW5ndGggPSAwXG4gICAgZm9yIChpID0gMDsgaSA8IGxpc3QubGVuZ3RoOyArK2kpIHtcbiAgICAgIGxlbmd0aCArPSBsaXN0W2ldLmxlbmd0aFxuICAgIH1cbiAgfVxuXG4gIHZhciBidWZmZXIgPSBCdWZmZXIuYWxsb2NVbnNhZmUobGVuZ3RoKVxuICB2YXIgcG9zID0gMFxuICBmb3IgKGkgPSAwOyBpIDwgbGlzdC5sZW5ndGg7ICsraSkge1xuICAgIHZhciBidWYgPSBsaXN0W2ldXG4gICAgaWYgKGlzSW5zdGFuY2UoYnVmLCBVaW50OEFycmF5KSkge1xuICAgICAgYnVmID0gQnVmZmVyLmZyb20oYnVmKVxuICAgIH1cbiAgICBpZiAoIUJ1ZmZlci5pc0J1ZmZlcihidWYpKSB7XG4gICAgICB0aHJvdyBuZXcgVHlwZUVycm9yKCdcImxpc3RcIiBhcmd1bWVudCBtdXN0IGJlIGFuIEFycmF5IG9mIEJ1ZmZlcnMnKVxuICAgIH1cbiAgICBidWYuY29weShidWZmZXIsIHBvcylcbiAgICBwb3MgKz0gYnVmLmxlbmd0aFxuICB9XG4gIHJldHVybiBidWZmZXJcbn1cblxuZnVuY3Rpb24gYnl0ZUxlbmd0aCAoc3RyaW5nLCBlbmNvZGluZykge1xuICBpZiAoQnVmZmVyLmlzQnVmZmVyKHN0cmluZykpIHtcbiAgICByZXR1cm4gc3RyaW5nLmxlbmd0aFxuICB9XG4gIGlmIChBcnJheUJ1ZmZlci5pc1ZpZXcoc3RyaW5nKSB8fCBpc0luc3RhbmNlKHN0cmluZywgQXJyYXlCdWZmZXIpKSB7XG4gICAgcmV0dXJuIHN0cmluZy5ieXRlTGVuZ3RoXG4gIH1cbiAgaWYgKHR5cGVvZiBzdHJpbmcgIT09ICdzdHJpbmcnKSB7XG4gICAgdGhyb3cgbmV3IFR5cGVFcnJvcihcbiAgICAgICdUaGUgXCJzdHJpbmdcIiBhcmd1bWVudCBtdXN0IGJlIG9uZSBvZiB0eXBlIHN0cmluZywgQnVmZmVyLCBvciBBcnJheUJ1ZmZlci4gJyArXG4gICAgICAnUmVjZWl2ZWQgdHlwZSAnICsgdHlwZW9mIHN0cmluZ1xuICAgIClcbiAgfVxuXG4gIHZhciBsZW4gPSBzdHJpbmcubGVuZ3RoXG4gIHZhciBtdXN0TWF0Y2ggPSAoYXJndW1lbnRzLmxlbmd0aCA+IDIgJiYgYXJndW1lbnRzWzJdID09PSB0cnVlKVxuICBpZiAoIW11c3RNYXRjaCAmJiBsZW4gPT09IDApIHJldHVybiAwXG5cbiAgLy8gVXNlIGEgZm9yIGxvb3AgdG8gYXZvaWQgcmVjdXJzaW9uXG4gIHZhciBsb3dlcmVkQ2FzZSA9IGZhbHNlXG4gIGZvciAoOzspIHtcbiAgICBzd2l0Y2ggKGVuY29kaW5nKSB7XG4gICAgICBjYXNlICdhc2NpaSc6XG4gICAgICBjYXNlICdsYXRpbjEnOlxuICAgICAgY2FzZSAnYmluYXJ5JzpcbiAgICAgICAgcmV0dXJuIGxlblxuICAgICAgY2FzZSAndXRmOCc6XG4gICAgICBjYXNlICd1dGYtOCc6XG4gICAgICAgIHJldHVybiB1dGY4VG9CeXRlcyhzdHJpbmcpLmxlbmd0aFxuICAgICAgY2FzZSAndWNzMic6XG4gICAgICBjYXNlICd1Y3MtMic6XG4gICAgICBjYXNlICd1dGYxNmxlJzpcbiAgICAgIGNhc2UgJ3V0Zi0xNmxlJzpcbiAgICAgICAgcmV0dXJuIGxlbiAqIDJcbiAgICAgIGNhc2UgJ2hleCc6XG4gICAgICAgIHJldHVybiBsZW4gPj4+IDFcbiAgICAgIGNhc2UgJ2Jhc2U2NCc6XG4gICAgICAgIHJldHVybiBiYXNlNjRUb0J5dGVzKHN0cmluZykubGVuZ3RoXG4gICAgICBkZWZhdWx0OlxuICAgICAgICBpZiAobG93ZXJlZENhc2UpIHtcbiAgICAgICAgICByZXR1cm4gbXVzdE1hdGNoID8gLTEgOiB1dGY4VG9CeXRlcyhzdHJpbmcpLmxlbmd0aCAvLyBhc3N1bWUgdXRmOFxuICAgICAgICB9XG4gICAgICAgIGVuY29kaW5nID0gKCcnICsgZW5jb2RpbmcpLnRvTG93ZXJDYXNlKClcbiAgICAgICAgbG93ZXJlZENhc2UgPSB0cnVlXG4gICAgfVxuICB9XG59XG5CdWZmZXIuYnl0ZUxlbmd0aCA9IGJ5dGVMZW5ndGhcblxuZnVuY3Rpb24gc2xvd1RvU3RyaW5nIChlbmNvZGluZywgc3RhcnQsIGVuZCkge1xuICB2YXIgbG93ZXJlZENhc2UgPSBmYWxzZVxuXG4gIC8vIE5vIG5lZWQgdG8gdmVyaWZ5IHRoYXQgXCJ0aGlzLmxlbmd0aCA8PSBNQVhfVUlOVDMyXCIgc2luY2UgaXQncyBhIHJlYWQtb25seVxuICAvLyBwcm9wZXJ0eSBvZiBhIHR5cGVkIGFycmF5LlxuXG4gIC8vIFRoaXMgYmVoYXZlcyBuZWl0aGVyIGxpa2UgU3RyaW5nIG5vciBVaW50OEFycmF5IGluIHRoYXQgd2Ugc2V0IHN0YXJ0L2VuZFxuICAvLyB0byB0aGVpciB1cHBlci9sb3dlciBib3VuZHMgaWYgdGhlIHZhbHVlIHBhc3NlZCBpcyBvdXQgb2YgcmFuZ2UuXG4gIC8vIHVuZGVmaW5lZCBpcyBoYW5kbGVkIHNwZWNpYWxseSBhcyBwZXIgRUNNQS0yNjIgNnRoIEVkaXRpb24sXG4gIC8vIFNlY3Rpb24gMTMuMy4zLjcgUnVudGltZSBTZW1hbnRpY3M6IEtleWVkQmluZGluZ0luaXRpYWxpemF0aW9uLlxuICBpZiAoc3RhcnQgPT09IHVuZGVmaW5lZCB8fCBzdGFydCA8IDApIHtcbiAgICBzdGFydCA9IDBcbiAgfVxuICAvLyBSZXR1cm4gZWFybHkgaWYgc3RhcnQgPiB0aGlzLmxlbmd0aC4gRG9uZSBoZXJlIHRvIHByZXZlbnQgcG90ZW50aWFsIHVpbnQzMlxuICAvLyBjb2VyY2lvbiBmYWlsIGJlbG93LlxuICBpZiAoc3RhcnQgPiB0aGlzLmxlbmd0aCkge1xuICAgIHJldHVybiAnJ1xuICB9XG5cbiAgaWYgKGVuZCA9PT0gdW5kZWZpbmVkIHx8IGVuZCA+IHRoaXMubGVuZ3RoKSB7XG4gICAgZW5kID0gdGhpcy5sZW5ndGhcbiAgfVxuXG4gIGlmIChlbmQgPD0gMCkge1xuICAgIHJldHVybiAnJ1xuICB9XG5cbiAgLy8gRm9yY2UgY29lcnNpb24gdG8gdWludDMyLiBUaGlzIHdpbGwgYWxzbyBjb2VyY2UgZmFsc2V5L05hTiB2YWx1ZXMgdG8gMC5cbiAgZW5kID4+Pj0gMFxuICBzdGFydCA+Pj49IDBcblxuICBpZiAoZW5kIDw9IHN0YXJ0KSB7XG4gICAgcmV0dXJuICcnXG4gIH1cblxuICBpZiAoIWVuY29kaW5nKSBlbmNvZGluZyA9ICd1dGY4J1xuXG4gIHdoaWxlICh0cnVlKSB7XG4gICAgc3dpdGNoIChlbmNvZGluZykge1xuICAgICAgY2FzZSAnaGV4JzpcbiAgICAgICAgcmV0dXJuIGhleFNsaWNlKHRoaXMsIHN0YXJ0LCBlbmQpXG5cbiAgICAgIGNhc2UgJ3V0ZjgnOlxuICAgICAgY2FzZSAndXRmLTgnOlxuICAgICAgICByZXR1cm4gdXRmOFNsaWNlKHRoaXMsIHN0YXJ0LCBlbmQpXG5cbiAgICAgIGNhc2UgJ2FzY2lpJzpcbiAgICAgICAgcmV0dXJuIGFzY2lpU2xpY2UodGhpcywgc3RhcnQsIGVuZClcblxuICAgICAgY2FzZSAnbGF0aW4xJzpcbiAgICAgIGNhc2UgJ2JpbmFyeSc6XG4gICAgICAgIHJldHVybiBsYXRpbjFTbGljZSh0aGlzLCBzdGFydCwgZW5kKVxuXG4gICAgICBjYXNlICdiYXNlNjQnOlxuICAgICAgICByZXR1cm4gYmFzZTY0U2xpY2UodGhpcywgc3RhcnQsIGVuZClcblxuICAgICAgY2FzZSAndWNzMic6XG4gICAgICBjYXNlICd1Y3MtMic6XG4gICAgICBjYXNlICd1dGYxNmxlJzpcbiAgICAgIGNhc2UgJ3V0Zi0xNmxlJzpcbiAgICAgICAgcmV0dXJuIHV0ZjE2bGVTbGljZSh0aGlzLCBzdGFydCwgZW5kKVxuXG4gICAgICBkZWZhdWx0OlxuICAgICAgICBpZiAobG93ZXJlZENhc2UpIHRocm93IG5ldyBUeXBlRXJyb3IoJ1Vua25vd24gZW5jb2Rpbmc6ICcgKyBlbmNvZGluZylcbiAgICAgICAgZW5jb2RpbmcgPSAoZW5jb2RpbmcgKyAnJykudG9Mb3dlckNhc2UoKVxuICAgICAgICBsb3dlcmVkQ2FzZSA9IHRydWVcbiAgICB9XG4gIH1cbn1cblxuLy8gVGhpcyBwcm9wZXJ0eSBpcyB1c2VkIGJ5IGBCdWZmZXIuaXNCdWZmZXJgIChhbmQgdGhlIGBpcy1idWZmZXJgIG5wbSBwYWNrYWdlKVxuLy8gdG8gZGV0ZWN0IGEgQnVmZmVyIGluc3RhbmNlLiBJdCdzIG5vdCBwb3NzaWJsZSB0byB1c2UgYGluc3RhbmNlb2YgQnVmZmVyYFxuLy8gcmVsaWFibHkgaW4gYSBicm93c2VyaWZ5IGNvbnRleHQgYmVjYXVzZSB0aGVyZSBjb3VsZCBiZSBtdWx0aXBsZSBkaWZmZXJlbnRcbi8vIGNvcGllcyBvZiB0aGUgJ2J1ZmZlcicgcGFja2FnZSBpbiB1c2UuIFRoaXMgbWV0aG9kIHdvcmtzIGV2ZW4gZm9yIEJ1ZmZlclxuLy8gaW5zdGFuY2VzIHRoYXQgd2VyZSBjcmVhdGVkIGZyb20gYW5vdGhlciBjb3B5IG9mIHRoZSBgYnVmZmVyYCBwYWNrYWdlLlxuLy8gU2VlOiBodHRwczovL2dpdGh1Yi5jb20vZmVyb3NzL2J1ZmZlci9pc3N1ZXMvMTU0XG5CdWZmZXIucHJvdG90eXBlLl9pc0J1ZmZlciA9IHRydWVcblxuZnVuY3Rpb24gc3dhcCAoYiwgbiwgbSkge1xuICB2YXIgaSA9IGJbbl1cbiAgYltuXSA9IGJbbV1cbiAgYlttXSA9IGlcbn1cblxuQnVmZmVyLnByb3RvdHlwZS5zd2FwMTYgPSBmdW5jdGlvbiBzd2FwMTYgKCkge1xuICB2YXIgbGVuID0gdGhpcy5sZW5ndGhcbiAgaWYgKGxlbiAlIDIgIT09IDApIHtcbiAgICB0aHJvdyBuZXcgUmFuZ2VFcnJvcignQnVmZmVyIHNpemUgbXVzdCBiZSBhIG11bHRpcGxlIG9mIDE2LWJpdHMnKVxuICB9XG4gIGZvciAodmFyIGkgPSAwOyBpIDwgbGVuOyBpICs9IDIpIHtcbiAgICBzd2FwKHRoaXMsIGksIGkgKyAxKVxuICB9XG4gIHJldHVybiB0aGlzXG59XG5cbkJ1ZmZlci5wcm90b3R5cGUuc3dhcDMyID0gZnVuY3Rpb24gc3dhcDMyICgpIHtcbiAgdmFyIGxlbiA9IHRoaXMubGVuZ3RoXG4gIGlmIChsZW4gJSA0ICE9PSAwKSB7XG4gICAgdGhyb3cgbmV3IFJhbmdlRXJyb3IoJ0J1ZmZlciBzaXplIG11c3QgYmUgYSBtdWx0aXBsZSBvZiAzMi1iaXRzJylcbiAgfVxuICBmb3IgKHZhciBpID0gMDsgaSA8IGxlbjsgaSArPSA0KSB7XG4gICAgc3dhcCh0aGlzLCBpLCBpICsgMylcbiAgICBzd2FwKHRoaXMsIGkgKyAxLCBpICsgMilcbiAgfVxuICByZXR1cm4gdGhpc1xufVxuXG5CdWZmZXIucHJvdG90eXBlLnN3YXA2NCA9IGZ1bmN0aW9uIHN3YXA2NCAoKSB7XG4gIHZhciBsZW4gPSB0aGlzLmxlbmd0aFxuICBpZiAobGVuICUgOCAhPT0gMCkge1xuICAgIHRocm93IG5ldyBSYW5nZUVycm9yKCdCdWZmZXIgc2l6ZSBtdXN0IGJlIGEgbXVsdGlwbGUgb2YgNjQtYml0cycpXG4gIH1cbiAgZm9yICh2YXIgaSA9IDA7IGkgPCBsZW47IGkgKz0gOCkge1xuICAgIHN3YXAodGhpcywgaSwgaSArIDcpXG4gICAgc3dhcCh0aGlzLCBpICsgMSwgaSArIDYpXG4gICAgc3dhcCh0aGlzLCBpICsgMiwgaSArIDUpXG4gICAgc3dhcCh0aGlzLCBpICsgMywgaSArIDQpXG4gIH1cbiAgcmV0dXJuIHRoaXNcbn1cblxuQnVmZmVyLnByb3RvdHlwZS50b1N0cmluZyA9IGZ1bmN0aW9uIHRvU3RyaW5nICgpIHtcbiAgdmFyIGxlbmd0aCA9IHRoaXMubGVuZ3RoXG4gIGlmIChsZW5ndGggPT09IDApIHJldHVybiAnJ1xuICBpZiAoYXJndW1lbnRzLmxlbmd0aCA9PT0gMCkgcmV0dXJuIHV0ZjhTbGljZSh0aGlzLCAwLCBsZW5ndGgpXG4gIHJldHVybiBzbG93VG9TdHJpbmcuYXBwbHkodGhpcywgYXJndW1lbnRzKVxufVxuXG5CdWZmZXIucHJvdG90eXBlLnRvTG9jYWxlU3RyaW5nID0gQnVmZmVyLnByb3RvdHlwZS50b1N0cmluZ1xuXG5CdWZmZXIucHJvdG90eXBlLmVxdWFscyA9IGZ1bmN0aW9uIGVxdWFscyAoYikge1xuICBpZiAoIUJ1ZmZlci5pc0J1ZmZlcihiKSkgdGhyb3cgbmV3IFR5cGVFcnJvcignQXJndW1lbnQgbXVzdCBiZSBhIEJ1ZmZlcicpXG4gIGlmICh0aGlzID09PSBiKSByZXR1cm4gdHJ1ZVxuICByZXR1cm4gQnVmZmVyLmNvbXBhcmUodGhpcywgYikgPT09IDBcbn1cblxuQnVmZmVyLnByb3RvdHlwZS5pbnNwZWN0ID0gZnVuY3Rpb24gaW5zcGVjdCAoKSB7XG4gIHZhciBzdHIgPSAnJ1xuICB2YXIgbWF4ID0gZXhwb3J0cy5JTlNQRUNUX01BWF9CWVRFU1xuICBzdHIgPSB0aGlzLnRvU3RyaW5nKCdoZXgnLCAwLCBtYXgpLnJlcGxhY2UoLyguezJ9KS9nLCAnJDEgJykudHJpbSgpXG4gIGlmICh0aGlzLmxlbmd0aCA+IG1heCkgc3RyICs9ICcgLi4uICdcbiAgcmV0dXJuICc8QnVmZmVyICcgKyBzdHIgKyAnPidcbn1cbmlmIChjdXN0b21JbnNwZWN0U3ltYm9sKSB7XG4gIEJ1ZmZlci5wcm90b3R5cGVbY3VzdG9tSW5zcGVjdFN5bWJvbF0gPSBCdWZmZXIucHJvdG90eXBlLmluc3BlY3Rcbn1cblxuQnVmZmVyLnByb3RvdHlwZS5jb21wYXJlID0gZnVuY3Rpb24gY29tcGFyZSAodGFyZ2V0LCBzdGFydCwgZW5kLCB0aGlzU3RhcnQsIHRoaXNFbmQpIHtcbiAgaWYgKGlzSW5zdGFuY2UodGFyZ2V0LCBVaW50OEFycmF5KSkge1xuICAgIHRhcmdldCA9IEJ1ZmZlci5mcm9tKHRhcmdldCwgdGFyZ2V0Lm9mZnNldCwgdGFyZ2V0LmJ5dGVMZW5ndGgpXG4gIH1cbiAgaWYgKCFCdWZmZXIuaXNCdWZmZXIodGFyZ2V0KSkge1xuICAgIHRocm93IG5ldyBUeXBlRXJyb3IoXG4gICAgICAnVGhlIFwidGFyZ2V0XCIgYXJndW1lbnQgbXVzdCBiZSBvbmUgb2YgdHlwZSBCdWZmZXIgb3IgVWludDhBcnJheS4gJyArXG4gICAgICAnUmVjZWl2ZWQgdHlwZSAnICsgKHR5cGVvZiB0YXJnZXQpXG4gICAgKVxuICB9XG5cbiAgaWYgKHN0YXJ0ID09PSB1bmRlZmluZWQpIHtcbiAgICBzdGFydCA9IDBcbiAgfVxuICBpZiAoZW5kID09PSB1bmRlZmluZWQpIHtcbiAgICBlbmQgPSB0YXJnZXQgPyB0YXJnZXQubGVuZ3RoIDogMFxuICB9XG4gIGlmICh0aGlzU3RhcnQgPT09IHVuZGVmaW5lZCkge1xuICAgIHRoaXNTdGFydCA9IDBcbiAgfVxuICBpZiAodGhpc0VuZCA9PT0gdW5kZWZpbmVkKSB7XG4gICAgdGhpc0VuZCA9IHRoaXMubGVuZ3RoXG4gIH1cblxuICBpZiAoc3RhcnQgPCAwIHx8IGVuZCA+IHRhcmdldC5sZW5ndGggfHwgdGhpc1N0YXJ0IDwgMCB8fCB0aGlzRW5kID4gdGhpcy5sZW5ndGgpIHtcbiAgICB0aHJvdyBuZXcgUmFuZ2VFcnJvcignb3V0IG9mIHJhbmdlIGluZGV4JylcbiAgfVxuXG4gIGlmICh0aGlzU3RhcnQgPj0gdGhpc0VuZCAmJiBzdGFydCA+PSBlbmQpIHtcbiAgICByZXR1cm4gMFxuICB9XG4gIGlmICh0aGlzU3RhcnQgPj0gdGhpc0VuZCkge1xuICAgIHJldHVybiAtMVxuICB9XG4gIGlmIChzdGFydCA+PSBlbmQpIHtcbiAgICByZXR1cm4gMVxuICB9XG5cbiAgc3RhcnQgPj4+PSAwXG4gIGVuZCA+Pj49IDBcbiAgdGhpc1N0YXJ0ID4+Pj0gMFxuICB0aGlzRW5kID4+Pj0gMFxuXG4gIGlmICh0aGlzID09PSB0YXJnZXQpIHJldHVybiAwXG5cbiAgdmFyIHggPSB0aGlzRW5kIC0gdGhpc1N0YXJ0XG4gIHZhciB5ID0gZW5kIC0gc3RhcnRcbiAgdmFyIGxlbiA9IE1hdGgubWluKHgsIHkpXG5cbiAgdmFyIHRoaXNDb3B5ID0gdGhpcy5zbGljZSh0aGlzU3RhcnQsIHRoaXNFbmQpXG4gIHZhciB0YXJnZXRDb3B5ID0gdGFyZ2V0LnNsaWNlKHN0YXJ0LCBlbmQpXG5cbiAgZm9yICh2YXIgaSA9IDA7IGkgPCBsZW47ICsraSkge1xuICAgIGlmICh0aGlzQ29weVtpXSAhPT0gdGFyZ2V0Q29weVtpXSkge1xuICAgICAgeCA9IHRoaXNDb3B5W2ldXG4gICAgICB5ID0gdGFyZ2V0Q29weVtpXVxuICAgICAgYnJlYWtcbiAgICB9XG4gIH1cblxuICBpZiAoeCA8IHkpIHJldHVybiAtMVxuICBpZiAoeSA8IHgpIHJldHVybiAxXG4gIHJldHVybiAwXG59XG5cbi8vIEZpbmRzIGVpdGhlciB0aGUgZmlyc3QgaW5kZXggb2YgYHZhbGAgaW4gYGJ1ZmZlcmAgYXQgb2Zmc2V0ID49IGBieXRlT2Zmc2V0YCxcbi8vIE9SIHRoZSBsYXN0IGluZGV4IG9mIGB2YWxgIGluIGBidWZmZXJgIGF0IG9mZnNldCA8PSBgYnl0ZU9mZnNldGAuXG4vL1xuLy8gQXJndW1lbnRzOlxuLy8gLSBidWZmZXIgLSBhIEJ1ZmZlciB0byBzZWFyY2hcbi8vIC0gdmFsIC0gYSBzdHJpbmcsIEJ1ZmZlciwgb3IgbnVtYmVyXG4vLyAtIGJ5dGVPZmZzZXQgLSBhbiBpbmRleCBpbnRvIGBidWZmZXJgOyB3aWxsIGJlIGNsYW1wZWQgdG8gYW4gaW50MzJcbi8vIC0gZW5jb2RpbmcgLSBhbiBvcHRpb25hbCBlbmNvZGluZywgcmVsZXZhbnQgaXMgdmFsIGlzIGEgc3RyaW5nXG4vLyAtIGRpciAtIHRydWUgZm9yIGluZGV4T2YsIGZhbHNlIGZvciBsYXN0SW5kZXhPZlxuZnVuY3Rpb24gYmlkaXJlY3Rpb25hbEluZGV4T2YgKGJ1ZmZlciwgdmFsLCBieXRlT2Zmc2V0LCBlbmNvZGluZywgZGlyKSB7XG4gIC8vIEVtcHR5IGJ1ZmZlciBtZWFucyBubyBtYXRjaFxuICBpZiAoYnVmZmVyLmxlbmd0aCA9PT0gMCkgcmV0dXJuIC0xXG5cbiAgLy8gTm9ybWFsaXplIGJ5dGVPZmZzZXRcbiAgaWYgKHR5cGVvZiBieXRlT2Zmc2V0ID09PSAnc3RyaW5nJykge1xuICAgIGVuY29kaW5nID0gYnl0ZU9mZnNldFxuICAgIGJ5dGVPZmZzZXQgPSAwXG4gIH0gZWxzZSBpZiAoYnl0ZU9mZnNldCA+IDB4N2ZmZmZmZmYpIHtcbiAgICBieXRlT2Zmc2V0ID0gMHg3ZmZmZmZmZlxuICB9IGVsc2UgaWYgKGJ5dGVPZmZzZXQgPCAtMHg4MDAwMDAwMCkge1xuICAgIGJ5dGVPZmZzZXQgPSAtMHg4MDAwMDAwMFxuICB9XG4gIGJ5dGVPZmZzZXQgPSArYnl0ZU9mZnNldCAvLyBDb2VyY2UgdG8gTnVtYmVyLlxuICBpZiAobnVtYmVySXNOYU4oYnl0ZU9mZnNldCkpIHtcbiAgICAvLyBieXRlT2Zmc2V0OiBpdCBpdCdzIHVuZGVmaW5lZCwgbnVsbCwgTmFOLCBcImZvb1wiLCBldGMsIHNlYXJjaCB3aG9sZSBidWZmZXJcbiAgICBieXRlT2Zmc2V0ID0gZGlyID8gMCA6IChidWZmZXIubGVuZ3RoIC0gMSlcbiAgfVxuXG4gIC8vIE5vcm1hbGl6ZSBieXRlT2Zmc2V0OiBuZWdhdGl2ZSBvZmZzZXRzIHN0YXJ0IGZyb20gdGhlIGVuZCBvZiB0aGUgYnVmZmVyXG4gIGlmIChieXRlT2Zmc2V0IDwgMCkgYnl0ZU9mZnNldCA9IGJ1ZmZlci5sZW5ndGggKyBieXRlT2Zmc2V0XG4gIGlmIChieXRlT2Zmc2V0ID49IGJ1ZmZlci5sZW5ndGgpIHtcbiAgICBpZiAoZGlyKSByZXR1cm4gLTFcbiAgICBlbHNlIGJ5dGVPZmZzZXQgPSBidWZmZXIubGVuZ3RoIC0gMVxuICB9IGVsc2UgaWYgKGJ5dGVPZmZzZXQgPCAwKSB7XG4gICAgaWYgKGRpcikgYnl0ZU9mZnNldCA9IDBcbiAgICBlbHNlIHJldHVybiAtMVxuICB9XG5cbiAgLy8gTm9ybWFsaXplIHZhbFxuICBpZiAodHlwZW9mIHZhbCA9PT0gJ3N0cmluZycpIHtcbiAgICB2YWwgPSBCdWZmZXIuZnJvbSh2YWwsIGVuY29kaW5nKVxuICB9XG5cbiAgLy8gRmluYWxseSwgc2VhcmNoIGVpdGhlciBpbmRleE9mIChpZiBkaXIgaXMgdHJ1ZSkgb3IgbGFzdEluZGV4T2ZcbiAgaWYgKEJ1ZmZlci5pc0J1ZmZlcih2YWwpKSB7XG4gICAgLy8gU3BlY2lhbCBjYXNlOiBsb29raW5nIGZvciBlbXB0eSBzdHJpbmcvYnVmZmVyIGFsd2F5cyBmYWlsc1xuICAgIGlmICh2YWwubGVuZ3RoID09PSAwKSB7XG4gICAgICByZXR1cm4gLTFcbiAgICB9XG4gICAgcmV0dXJuIGFycmF5SW5kZXhPZihidWZmZXIsIHZhbCwgYnl0ZU9mZnNldCwgZW5jb2RpbmcsIGRpcilcbiAgfSBlbHNlIGlmICh0eXBlb2YgdmFsID09PSAnbnVtYmVyJykge1xuICAgIHZhbCA9IHZhbCAmIDB4RkYgLy8gU2VhcmNoIGZvciBhIGJ5dGUgdmFsdWUgWzAtMjU1XVxuICAgIGlmICh0eXBlb2YgVWludDhBcnJheS5wcm90b3R5cGUuaW5kZXhPZiA9PT0gJ2Z1bmN0aW9uJykge1xuICAgICAgaWYgKGRpcikge1xuICAgICAgICByZXR1cm4gVWludDhBcnJheS5wcm90b3R5cGUuaW5kZXhPZi5jYWxsKGJ1ZmZlciwgdmFsLCBieXRlT2Zmc2V0KVxuICAgICAgfSBlbHNlIHtcbiAgICAgICAgcmV0dXJuIFVpbnQ4QXJyYXkucHJvdG90eXBlLmxhc3RJbmRleE9mLmNhbGwoYnVmZmVyLCB2YWwsIGJ5dGVPZmZzZXQpXG4gICAgICB9XG4gICAgfVxuICAgIHJldHVybiBhcnJheUluZGV4T2YoYnVmZmVyLCBbdmFsXSwgYnl0ZU9mZnNldCwgZW5jb2RpbmcsIGRpcilcbiAgfVxuXG4gIHRocm93IG5ldyBUeXBlRXJyb3IoJ3ZhbCBtdXN0IGJlIHN0cmluZywgbnVtYmVyIG9yIEJ1ZmZlcicpXG59XG5cbmZ1bmN0aW9uIGFycmF5SW5kZXhPZiAoYXJyLCB2YWwsIGJ5dGVPZmZzZXQsIGVuY29kaW5nLCBkaXIpIHtcbiAgdmFyIGluZGV4U2l6ZSA9IDFcbiAgdmFyIGFyckxlbmd0aCA9IGFyci5sZW5ndGhcbiAgdmFyIHZhbExlbmd0aCA9IHZhbC5sZW5ndGhcblxuICBpZiAoZW5jb2RpbmcgIT09IHVuZGVmaW5lZCkge1xuICAgIGVuY29kaW5nID0gU3RyaW5nKGVuY29kaW5nKS50b0xvd2VyQ2FzZSgpXG4gICAgaWYgKGVuY29kaW5nID09PSAndWNzMicgfHwgZW5jb2RpbmcgPT09ICd1Y3MtMicgfHxcbiAgICAgICAgZW5jb2RpbmcgPT09ICd1dGYxNmxlJyB8fCBlbmNvZGluZyA9PT0gJ3V0Zi0xNmxlJykge1xuICAgICAgaWYgKGFyci5sZW5ndGggPCAyIHx8IHZhbC5sZW5ndGggPCAyKSB7XG4gICAgICAgIHJldHVybiAtMVxuICAgICAgfVxuICAgICAgaW5kZXhTaXplID0gMlxuICAgICAgYXJyTGVuZ3RoIC89IDJcbiAgICAgIHZhbExlbmd0aCAvPSAyXG4gICAgICBieXRlT2Zmc2V0IC89IDJcbiAgICB9XG4gIH1cblxuICBmdW5jdGlvbiByZWFkIChidWYsIGkpIHtcbiAgICBpZiAoaW5kZXhTaXplID09PSAxKSB7XG4gICAgICByZXR1cm4gYnVmW2ldXG4gICAgfSBlbHNlIHtcbiAgICAgIHJldHVybiBidWYucmVhZFVJbnQxNkJFKGkgKiBpbmRleFNpemUpXG4gICAgfVxuICB9XG5cbiAgdmFyIGlcbiAgaWYgKGRpcikge1xuICAgIHZhciBmb3VuZEluZGV4ID0gLTFcbiAgICBmb3IgKGkgPSBieXRlT2Zmc2V0OyBpIDwgYXJyTGVuZ3RoOyBpKyspIHtcbiAgICAgIGlmIChyZWFkKGFyciwgaSkgPT09IHJlYWQodmFsLCBmb3VuZEluZGV4ID09PSAtMSA/IDAgOiBpIC0gZm91bmRJbmRleCkpIHtcbiAgICAgICAgaWYgKGZvdW5kSW5kZXggPT09IC0xKSBmb3VuZEluZGV4ID0gaVxuICAgICAgICBpZiAoaSAtIGZvdW5kSW5kZXggKyAxID09PSB2YWxMZW5ndGgpIHJldHVybiBmb3VuZEluZGV4ICogaW5kZXhTaXplXG4gICAgICB9IGVsc2Uge1xuICAgICAgICBpZiAoZm91bmRJbmRleCAhPT0gLTEpIGkgLT0gaSAtIGZvdW5kSW5kZXhcbiAgICAgICAgZm91bmRJbmRleCA9IC0xXG4gICAgICB9XG4gICAgfVxuICB9IGVsc2Uge1xuICAgIGlmIChieXRlT2Zmc2V0ICsgdmFsTGVuZ3RoID4gYXJyTGVuZ3RoKSBieXRlT2Zmc2V0ID0gYXJyTGVuZ3RoIC0gdmFsTGVuZ3RoXG4gICAgZm9yIChpID0gYnl0ZU9mZnNldDsgaSA+PSAwOyBpLS0pIHtcbiAgICAgIHZhciBmb3VuZCA9IHRydWVcbiAgICAgIGZvciAodmFyIGogPSAwOyBqIDwgdmFsTGVuZ3RoOyBqKyspIHtcbiAgICAgICAgaWYgKHJlYWQoYXJyLCBpICsgaikgIT09IHJlYWQodmFsLCBqKSkge1xuICAgICAgICAgIGZvdW5kID0gZmFsc2VcbiAgICAgICAgICBicmVha1xuICAgICAgICB9XG4gICAgICB9XG4gICAgICBpZiAoZm91bmQpIHJldHVybiBpXG4gICAgfVxuICB9XG5cbiAgcmV0dXJuIC0xXG59XG5cbkJ1ZmZlci5wcm90b3R5cGUuaW5jbHVkZXMgPSBmdW5jdGlvbiBpbmNsdWRlcyAodmFsLCBieXRlT2Zmc2V0LCBlbmNvZGluZykge1xuICByZXR1cm4gdGhpcy5pbmRleE9mKHZhbCwgYnl0ZU9mZnNldCwgZW5jb2RpbmcpICE9PSAtMVxufVxuXG5CdWZmZXIucHJvdG90eXBlLmluZGV4T2YgPSBmdW5jdGlvbiBpbmRleE9mICh2YWwsIGJ5dGVPZmZzZXQsIGVuY29kaW5nKSB7XG4gIHJldHVybiBiaWRpcmVjdGlvbmFsSW5kZXhPZih0aGlzLCB2YWwsIGJ5dGVPZmZzZXQsIGVuY29kaW5nLCB0cnVlKVxufVxuXG5CdWZmZXIucHJvdG90eXBlLmxhc3RJbmRleE9mID0gZnVuY3Rpb24gbGFzdEluZGV4T2YgKHZhbCwgYnl0ZU9mZnNldCwgZW5jb2RpbmcpIHtcbiAgcmV0dXJuIGJpZGlyZWN0aW9uYWxJbmRleE9mKHRoaXMsIHZhbCwgYnl0ZU9mZnNldCwgZW5jb2RpbmcsIGZhbHNlKVxufVxuXG5mdW5jdGlvbiBoZXhXcml0ZSAoYnVmLCBzdHJpbmcsIG9mZnNldCwgbGVuZ3RoKSB7XG4gIG9mZnNldCA9IE51bWJlcihvZmZzZXQpIHx8IDBcbiAgdmFyIHJlbWFpbmluZyA9IGJ1Zi5sZW5ndGggLSBvZmZzZXRcbiAgaWYgKCFsZW5ndGgpIHtcbiAgICBsZW5ndGggPSByZW1haW5pbmdcbiAgfSBlbHNlIHtcbiAgICBsZW5ndGggPSBOdW1iZXIobGVuZ3RoKVxuICAgIGlmIChsZW5ndGggPiByZW1haW5pbmcpIHtcbiAgICAgIGxlbmd0aCA9IHJlbWFpbmluZ1xuICAgIH1cbiAgfVxuXG4gIHZhciBzdHJMZW4gPSBzdHJpbmcubGVuZ3RoXG5cbiAgaWYgKGxlbmd0aCA+IHN0ckxlbiAvIDIpIHtcbiAgICBsZW5ndGggPSBzdHJMZW4gLyAyXG4gIH1cbiAgZm9yICh2YXIgaSA9IDA7IGkgPCBsZW5ndGg7ICsraSkge1xuICAgIHZhciBwYXJzZWQgPSBwYXJzZUludChzdHJpbmcuc3Vic3RyKGkgKiAyLCAyKSwgMTYpXG4gICAgaWYgKG51bWJlcklzTmFOKHBhcnNlZCkpIHJldHVybiBpXG4gICAgYnVmW29mZnNldCArIGldID0gcGFyc2VkXG4gIH1cbiAgcmV0dXJuIGlcbn1cblxuZnVuY3Rpb24gdXRmOFdyaXRlIChidWYsIHN0cmluZywgb2Zmc2V0LCBsZW5ndGgpIHtcbiAgcmV0dXJuIGJsaXRCdWZmZXIodXRmOFRvQnl0ZXMoc3RyaW5nLCBidWYubGVuZ3RoIC0gb2Zmc2V0KSwgYnVmLCBvZmZzZXQsIGxlbmd0aClcbn1cblxuZnVuY3Rpb24gYXNjaWlXcml0ZSAoYnVmLCBzdHJpbmcsIG9mZnNldCwgbGVuZ3RoKSB7XG4gIHJldHVybiBibGl0QnVmZmVyKGFzY2lpVG9CeXRlcyhzdHJpbmcpLCBidWYsIG9mZnNldCwgbGVuZ3RoKVxufVxuXG5mdW5jdGlvbiBsYXRpbjFXcml0ZSAoYnVmLCBzdHJpbmcsIG9mZnNldCwgbGVuZ3RoKSB7XG4gIHJldHVybiBhc2NpaVdyaXRlKGJ1Ziwgc3RyaW5nLCBvZmZzZXQsIGxlbmd0aClcbn1cblxuZnVuY3Rpb24gYmFzZTY0V3JpdGUgKGJ1Ziwgc3RyaW5nLCBvZmZzZXQsIGxlbmd0aCkge1xuICByZXR1cm4gYmxpdEJ1ZmZlcihiYXNlNjRUb0J5dGVzKHN0cmluZyksIGJ1Ziwgb2Zmc2V0LCBsZW5ndGgpXG59XG5cbmZ1bmN0aW9uIHVjczJXcml0ZSAoYnVmLCBzdHJpbmcsIG9mZnNldCwgbGVuZ3RoKSB7XG4gIHJldHVybiBibGl0QnVmZmVyKHV0ZjE2bGVUb0J5dGVzKHN0cmluZywgYnVmLmxlbmd0aCAtIG9mZnNldCksIGJ1Ziwgb2Zmc2V0LCBsZW5ndGgpXG59XG5cbkJ1ZmZlci5wcm90b3R5cGUud3JpdGUgPSBmdW5jdGlvbiB3cml0ZSAoc3RyaW5nLCBvZmZzZXQsIGxlbmd0aCwgZW5jb2RpbmcpIHtcbiAgLy8gQnVmZmVyI3dyaXRlKHN0cmluZylcbiAgaWYgKG9mZnNldCA9PT0gdW5kZWZpbmVkKSB7XG4gICAgZW5jb2RpbmcgPSAndXRmOCdcbiAgICBsZW5ndGggPSB0aGlzLmxlbmd0aFxuICAgIG9mZnNldCA9IDBcbiAgLy8gQnVmZmVyI3dyaXRlKHN0cmluZywgZW5jb2RpbmcpXG4gIH0gZWxzZSBpZiAobGVuZ3RoID09PSB1bmRlZmluZWQgJiYgdHlwZW9mIG9mZnNldCA9PT0gJ3N0cmluZycpIHtcbiAgICBlbmNvZGluZyA9IG9mZnNldFxuICAgIGxlbmd0aCA9IHRoaXMubGVuZ3RoXG4gICAgb2Zmc2V0ID0gMFxuICAvLyBCdWZmZXIjd3JpdGUoc3RyaW5nLCBvZmZzZXRbLCBsZW5ndGhdWywgZW5jb2RpbmddKVxuICB9IGVsc2UgaWYgKGlzRmluaXRlKG9mZnNldCkpIHtcbiAgICBvZmZzZXQgPSBvZmZzZXQgPj4+IDBcbiAgICBpZiAoaXNGaW5pdGUobGVuZ3RoKSkge1xuICAgICAgbGVuZ3RoID0gbGVuZ3RoID4+PiAwXG4gICAgICBpZiAoZW5jb2RpbmcgPT09IHVuZGVmaW5lZCkgZW5jb2RpbmcgPSAndXRmOCdcbiAgICB9IGVsc2Uge1xuICAgICAgZW5jb2RpbmcgPSBsZW5ndGhcbiAgICAgIGxlbmd0aCA9IHVuZGVmaW5lZFxuICAgIH1cbiAgfSBlbHNlIHtcbiAgICB0aHJvdyBuZXcgRXJyb3IoXG4gICAgICAnQnVmZmVyLndyaXRlKHN0cmluZywgZW5jb2RpbmcsIG9mZnNldFssIGxlbmd0aF0pIGlzIG5vIGxvbmdlciBzdXBwb3J0ZWQnXG4gICAgKVxuICB9XG5cbiAgdmFyIHJlbWFpbmluZyA9IHRoaXMubGVuZ3RoIC0gb2Zmc2V0XG4gIGlmIChsZW5ndGggPT09IHVuZGVmaW5lZCB8fCBsZW5ndGggPiByZW1haW5pbmcpIGxlbmd0aCA9IHJlbWFpbmluZ1xuXG4gIGlmICgoc3RyaW5nLmxlbmd0aCA+IDAgJiYgKGxlbmd0aCA8IDAgfHwgb2Zmc2V0IDwgMCkpIHx8IG9mZnNldCA+IHRoaXMubGVuZ3RoKSB7XG4gICAgdGhyb3cgbmV3IFJhbmdlRXJyb3IoJ0F0dGVtcHQgdG8gd3JpdGUgb3V0c2lkZSBidWZmZXIgYm91bmRzJylcbiAgfVxuXG4gIGlmICghZW5jb2RpbmcpIGVuY29kaW5nID0gJ3V0ZjgnXG5cbiAgdmFyIGxvd2VyZWRDYXNlID0gZmFsc2VcbiAgZm9yICg7Oykge1xuICAgIHN3aXRjaCAoZW5jb2RpbmcpIHtcbiAgICAgIGNhc2UgJ2hleCc6XG4gICAgICAgIHJldHVybiBoZXhXcml0ZSh0aGlzLCBzdHJpbmcsIG9mZnNldCwgbGVuZ3RoKVxuXG4gICAgICBjYXNlICd1dGY4JzpcbiAgICAgIGNhc2UgJ3V0Zi04JzpcbiAgICAgICAgcmV0dXJuIHV0ZjhXcml0ZSh0aGlzLCBzdHJpbmcsIG9mZnNldCwgbGVuZ3RoKVxuXG4gICAgICBjYXNlICdhc2NpaSc6XG4gICAgICAgIHJldHVybiBhc2NpaVdyaXRlKHRoaXMsIHN0cmluZywgb2Zmc2V0LCBsZW5ndGgpXG5cbiAgICAgIGNhc2UgJ2xhdGluMSc6XG4gICAgICBjYXNlICdiaW5hcnknOlxuICAgICAgICByZXR1cm4gbGF0aW4xV3JpdGUodGhpcywgc3RyaW5nLCBvZmZzZXQsIGxlbmd0aClcblxuICAgICAgY2FzZSAnYmFzZTY0JzpcbiAgICAgICAgLy8gV2FybmluZzogbWF4TGVuZ3RoIG5vdCB0YWtlbiBpbnRvIGFjY291bnQgaW4gYmFzZTY0V3JpdGVcbiAgICAgICAgcmV0dXJuIGJhc2U2NFdyaXRlKHRoaXMsIHN0cmluZywgb2Zmc2V0LCBsZW5ndGgpXG5cbiAgICAgIGNhc2UgJ3VjczInOlxuICAgICAgY2FzZSAndWNzLTInOlxuICAgICAgY2FzZSAndXRmMTZsZSc6XG4gICAgICBjYXNlICd1dGYtMTZsZSc6XG4gICAgICAgIHJldHVybiB1Y3MyV3JpdGUodGhpcywgc3RyaW5nLCBvZmZzZXQsIGxlbmd0aClcblxuICAgICAgZGVmYXVsdDpcbiAgICAgICAgaWYgKGxvd2VyZWRDYXNlKSB0aHJvdyBuZXcgVHlwZUVycm9yKCdVbmtub3duIGVuY29kaW5nOiAnICsgZW5jb2RpbmcpXG4gICAgICAgIGVuY29kaW5nID0gKCcnICsgZW5jb2RpbmcpLnRvTG93ZXJDYXNlKClcbiAgICAgICAgbG93ZXJlZENhc2UgPSB0cnVlXG4gICAgfVxuICB9XG59XG5cbkJ1ZmZlci5wcm90b3R5cGUudG9KU09OID0gZnVuY3Rpb24gdG9KU09OICgpIHtcbiAgcmV0dXJuIHtcbiAgICB0eXBlOiAnQnVmZmVyJyxcbiAgICBkYXRhOiBBcnJheS5wcm90b3R5cGUuc2xpY2UuY2FsbCh0aGlzLl9hcnIgfHwgdGhpcywgMClcbiAgfVxufVxuXG5mdW5jdGlvbiBiYXNlNjRTbGljZSAoYnVmLCBzdGFydCwgZW5kKSB7XG4gIGlmIChzdGFydCA9PT0gMCAmJiBlbmQgPT09IGJ1Zi5sZW5ndGgpIHtcbiAgICByZXR1cm4gYmFzZTY0LmZyb21CeXRlQXJyYXkoYnVmKVxuICB9IGVsc2Uge1xuICAgIHJldHVybiBiYXNlNjQuZnJvbUJ5dGVBcnJheShidWYuc2xpY2Uoc3RhcnQsIGVuZCkpXG4gIH1cbn1cblxuZnVuY3Rpb24gdXRmOFNsaWNlIChidWYsIHN0YXJ0LCBlbmQpIHtcbiAgZW5kID0gTWF0aC5taW4oYnVmLmxlbmd0aCwgZW5kKVxuICB2YXIgcmVzID0gW11cblxuICB2YXIgaSA9IHN0YXJ0XG4gIHdoaWxlIChpIDwgZW5kKSB7XG4gICAgdmFyIGZpcnN0Qnl0ZSA9IGJ1ZltpXVxuICAgIHZhciBjb2RlUG9pbnQgPSBudWxsXG4gICAgdmFyIGJ5dGVzUGVyU2VxdWVuY2UgPSAoZmlyc3RCeXRlID4gMHhFRikgPyA0XG4gICAgICA6IChmaXJzdEJ5dGUgPiAweERGKSA/IDNcbiAgICAgICAgOiAoZmlyc3RCeXRlID4gMHhCRikgPyAyXG4gICAgICAgICAgOiAxXG5cbiAgICBpZiAoaSArIGJ5dGVzUGVyU2VxdWVuY2UgPD0gZW5kKSB7XG4gICAgICB2YXIgc2Vjb25kQnl0ZSwgdGhpcmRCeXRlLCBmb3VydGhCeXRlLCB0ZW1wQ29kZVBvaW50XG5cbiAgICAgIHN3aXRjaCAoYnl0ZXNQZXJTZXF1ZW5jZSkge1xuICAgICAgICBjYXNlIDE6XG4gICAgICAgICAgaWYgKGZpcnN0Qnl0ZSA8IDB4ODApIHtcbiAgICAgICAgICAgIGNvZGVQb2ludCA9IGZpcnN0Qnl0ZVxuICAgICAgICAgIH1cbiAgICAgICAgICBicmVha1xuICAgICAgICBjYXNlIDI6XG4gICAgICAgICAgc2Vjb25kQnl0ZSA9IGJ1ZltpICsgMV1cbiAgICAgICAgICBpZiAoKHNlY29uZEJ5dGUgJiAweEMwKSA9PT0gMHg4MCkge1xuICAgICAgICAgICAgdGVtcENvZGVQb2ludCA9IChmaXJzdEJ5dGUgJiAweDFGKSA8PCAweDYgfCAoc2Vjb25kQnl0ZSAmIDB4M0YpXG4gICAgICAgICAgICBpZiAodGVtcENvZGVQb2ludCA+IDB4N0YpIHtcbiAgICAgICAgICAgICAgY29kZVBvaW50ID0gdGVtcENvZGVQb2ludFxuICAgICAgICAgICAgfVxuICAgICAgICAgIH1cbiAgICAgICAgICBicmVha1xuICAgICAgICBjYXNlIDM6XG4gICAgICAgICAgc2Vjb25kQnl0ZSA9IGJ1ZltpICsgMV1cbiAgICAgICAgICB0aGlyZEJ5dGUgPSBidWZbaSArIDJdXG4gICAgICAgICAgaWYgKChzZWNvbmRCeXRlICYgMHhDMCkgPT09IDB4ODAgJiYgKHRoaXJkQnl0ZSAmIDB4QzApID09PSAweDgwKSB7XG4gICAgICAgICAgICB0ZW1wQ29kZVBvaW50ID0gKGZpcnN0Qnl0ZSAmIDB4RikgPDwgMHhDIHwgKHNlY29uZEJ5dGUgJiAweDNGKSA8PCAweDYgfCAodGhpcmRCeXRlICYgMHgzRilcbiAgICAgICAgICAgIGlmICh0ZW1wQ29kZVBvaW50ID4gMHg3RkYgJiYgKHRlbXBDb2RlUG9pbnQgPCAweEQ4MDAgfHwgdGVtcENvZGVQb2ludCA+IDB4REZGRikpIHtcbiAgICAgICAgICAgICAgY29kZVBvaW50ID0gdGVtcENvZGVQb2ludFxuICAgICAgICAgICAgfVxuICAgICAgICAgIH1cbiAgICAgICAgICBicmVha1xuICAgICAgICBjYXNlIDQ6XG4gICAgICAgICAgc2Vjb25kQnl0ZSA9IGJ1ZltpICsgMV1cbiAgICAgICAgICB0aGlyZEJ5dGUgPSBidWZbaSArIDJdXG4gICAgICAgICAgZm91cnRoQnl0ZSA9IGJ1ZltpICsgM11cbiAgICAgICAgICBpZiAoKHNlY29uZEJ5dGUgJiAweEMwKSA9PT0gMHg4MCAmJiAodGhpcmRCeXRlICYgMHhDMCkgPT09IDB4ODAgJiYgKGZvdXJ0aEJ5dGUgJiAweEMwKSA9PT0gMHg4MCkge1xuICAgICAgICAgICAgdGVtcENvZGVQb2ludCA9IChmaXJzdEJ5dGUgJiAweEYpIDw8IDB4MTIgfCAoc2Vjb25kQnl0ZSAmIDB4M0YpIDw8IDB4QyB8ICh0aGlyZEJ5dGUgJiAweDNGKSA8PCAweDYgfCAoZm91cnRoQnl0ZSAmIDB4M0YpXG4gICAgICAgICAgICBpZiAodGVtcENvZGVQb2ludCA+IDB4RkZGRiAmJiB0ZW1wQ29kZVBvaW50IDwgMHgxMTAwMDApIHtcbiAgICAgICAgICAgICAgY29kZVBvaW50ID0gdGVtcENvZGVQb2ludFxuICAgICAgICAgICAgfVxuICAgICAgICAgIH1cbiAgICAgIH1cbiAgICB9XG5cbiAgICBpZiAoY29kZVBvaW50ID09PSBudWxsKSB7XG4gICAgICAvLyB3ZSBkaWQgbm90IGdlbmVyYXRlIGEgdmFsaWQgY29kZVBvaW50IHNvIGluc2VydCBhXG4gICAgICAvLyByZXBsYWNlbWVudCBjaGFyIChVK0ZGRkQpIGFuZCBhZHZhbmNlIG9ubHkgMSBieXRlXG4gICAgICBjb2RlUG9pbnQgPSAweEZGRkRcbiAgICAgIGJ5dGVzUGVyU2VxdWVuY2UgPSAxXG4gICAgfSBlbHNlIGlmIChjb2RlUG9pbnQgPiAweEZGRkYpIHtcbiAgICAgIC8vIGVuY29kZSB0byB1dGYxNiAoc3Vycm9nYXRlIHBhaXIgZGFuY2UpXG4gICAgICBjb2RlUG9pbnQgLT0gMHgxMDAwMFxuICAgICAgcmVzLnB1c2goY29kZVBvaW50ID4+PiAxMCAmIDB4M0ZGIHwgMHhEODAwKVxuICAgICAgY29kZVBvaW50ID0gMHhEQzAwIHwgY29kZVBvaW50ICYgMHgzRkZcbiAgICB9XG5cbiAgICByZXMucHVzaChjb2RlUG9pbnQpXG4gICAgaSArPSBieXRlc1BlclNlcXVlbmNlXG4gIH1cblxuICByZXR1cm4gZGVjb2RlQ29kZVBvaW50c0FycmF5KHJlcylcbn1cblxuLy8gQmFzZWQgb24gaHR0cDovL3N0YWNrb3ZlcmZsb3cuY29tL2EvMjI3NDcyNzIvNjgwNzQyLCB0aGUgYnJvd3NlciB3aXRoXG4vLyB0aGUgbG93ZXN0IGxpbWl0IGlzIENocm9tZSwgd2l0aCAweDEwMDAwIGFyZ3MuXG4vLyBXZSBnbyAxIG1hZ25pdHVkZSBsZXNzLCBmb3Igc2FmZXR5XG52YXIgTUFYX0FSR1VNRU5UU19MRU5HVEggPSAweDEwMDBcblxuZnVuY3Rpb24gZGVjb2RlQ29kZVBvaW50c0FycmF5IChjb2RlUG9pbnRzKSB7XG4gIHZhciBsZW4gPSBjb2RlUG9pbnRzLmxlbmd0aFxuICBpZiAobGVuIDw9IE1BWF9BUkdVTUVOVFNfTEVOR1RIKSB7XG4gICAgcmV0dXJuIFN0cmluZy5mcm9tQ2hhckNvZGUuYXBwbHkoU3RyaW5nLCBjb2RlUG9pbnRzKSAvLyBhdm9pZCBleHRyYSBzbGljZSgpXG4gIH1cblxuICAvLyBEZWNvZGUgaW4gY2h1bmtzIHRvIGF2b2lkIFwiY2FsbCBzdGFjayBzaXplIGV4Y2VlZGVkXCIuXG4gIHZhciByZXMgPSAnJ1xuICB2YXIgaSA9IDBcbiAgd2hpbGUgKGkgPCBsZW4pIHtcbiAgICByZXMgKz0gU3RyaW5nLmZyb21DaGFyQ29kZS5hcHBseShcbiAgICAgIFN0cmluZyxcbiAgICAgIGNvZGVQb2ludHMuc2xpY2UoaSwgaSArPSBNQVhfQVJHVU1FTlRTX0xFTkdUSClcbiAgICApXG4gIH1cbiAgcmV0dXJuIHJlc1xufVxuXG5mdW5jdGlvbiBhc2NpaVNsaWNlIChidWYsIHN0YXJ0LCBlbmQpIHtcbiAgdmFyIHJldCA9ICcnXG4gIGVuZCA9IE1hdGgubWluKGJ1Zi5sZW5ndGgsIGVuZClcblxuICBmb3IgKHZhciBpID0gc3RhcnQ7IGkgPCBlbmQ7ICsraSkge1xuICAgIHJldCArPSBTdHJpbmcuZnJvbUNoYXJDb2RlKGJ1ZltpXSAmIDB4N0YpXG4gIH1cbiAgcmV0dXJuIHJldFxufVxuXG5mdW5jdGlvbiBsYXRpbjFTbGljZSAoYnVmLCBzdGFydCwgZW5kKSB7XG4gIHZhciByZXQgPSAnJ1xuICBlbmQgPSBNYXRoLm1pbihidWYubGVuZ3RoLCBlbmQpXG5cbiAgZm9yICh2YXIgaSA9IHN0YXJ0OyBpIDwgZW5kOyArK2kpIHtcbiAgICByZXQgKz0gU3RyaW5nLmZyb21DaGFyQ29kZShidWZbaV0pXG4gIH1cbiAgcmV0dXJuIHJldFxufVxuXG5mdW5jdGlvbiBoZXhTbGljZSAoYnVmLCBzdGFydCwgZW5kKSB7XG4gIHZhciBsZW4gPSBidWYubGVuZ3RoXG5cbiAgaWYgKCFzdGFydCB8fCBzdGFydCA8IDApIHN0YXJ0ID0gMFxuICBpZiAoIWVuZCB8fCBlbmQgPCAwIHx8IGVuZCA+IGxlbikgZW5kID0gbGVuXG5cbiAgdmFyIG91dCA9ICcnXG4gIGZvciAodmFyIGkgPSBzdGFydDsgaSA8IGVuZDsgKytpKSB7XG4gICAgb3V0ICs9IGhleFNsaWNlTG9va3VwVGFibGVbYnVmW2ldXVxuICB9XG4gIHJldHVybiBvdXRcbn1cblxuZnVuY3Rpb24gdXRmMTZsZVNsaWNlIChidWYsIHN0YXJ0LCBlbmQpIHtcbiAgdmFyIGJ5dGVzID0gYnVmLnNsaWNlKHN0YXJ0LCBlbmQpXG4gIHZhciByZXMgPSAnJ1xuICBmb3IgKHZhciBpID0gMDsgaSA8IGJ5dGVzLmxlbmd0aDsgaSArPSAyKSB7XG4gICAgcmVzICs9IFN0cmluZy5mcm9tQ2hhckNvZGUoYnl0ZXNbaV0gKyAoYnl0ZXNbaSArIDFdICogMjU2KSlcbiAgfVxuICByZXR1cm4gcmVzXG59XG5cbkJ1ZmZlci5wcm90b3R5cGUuc2xpY2UgPSBmdW5jdGlvbiBzbGljZSAoc3RhcnQsIGVuZCkge1xuICB2YXIgbGVuID0gdGhpcy5sZW5ndGhcbiAgc3RhcnQgPSB+fnN0YXJ0XG4gIGVuZCA9IGVuZCA9PT0gdW5kZWZpbmVkID8gbGVuIDogfn5lbmRcblxuICBpZiAoc3RhcnQgPCAwKSB7XG4gICAgc3RhcnQgKz0gbGVuXG4gICAgaWYgKHN0YXJ0IDwgMCkgc3RhcnQgPSAwXG4gIH0gZWxzZSBpZiAoc3RhcnQgPiBsZW4pIHtcbiAgICBzdGFydCA9IGxlblxuICB9XG5cbiAgaWYgKGVuZCA8IDApIHtcbiAgICBlbmQgKz0gbGVuXG4gICAgaWYgKGVuZCA8IDApIGVuZCA9IDBcbiAgfSBlbHNlIGlmIChlbmQgPiBsZW4pIHtcbiAgICBlbmQgPSBsZW5cbiAgfVxuXG4gIGlmIChlbmQgPCBzdGFydCkgZW5kID0gc3RhcnRcblxuICB2YXIgbmV3QnVmID0gdGhpcy5zdWJhcnJheShzdGFydCwgZW5kKVxuICAvLyBSZXR1cm4gYW4gYXVnbWVudGVkIGBVaW50OEFycmF5YCBpbnN0YW5jZVxuICBPYmplY3Quc2V0UHJvdG90eXBlT2YobmV3QnVmLCBCdWZmZXIucHJvdG90eXBlKVxuXG4gIHJldHVybiBuZXdCdWZcbn1cblxuLypcbiAqIE5lZWQgdG8gbWFrZSBzdXJlIHRoYXQgYnVmZmVyIGlzbid0IHRyeWluZyB0byB3cml0ZSBvdXQgb2YgYm91bmRzLlxuICovXG5mdW5jdGlvbiBjaGVja09mZnNldCAob2Zmc2V0LCBleHQsIGxlbmd0aCkge1xuICBpZiAoKG9mZnNldCAlIDEpICE9PSAwIHx8IG9mZnNldCA8IDApIHRocm93IG5ldyBSYW5nZUVycm9yKCdvZmZzZXQgaXMgbm90IHVpbnQnKVxuICBpZiAob2Zmc2V0ICsgZXh0ID4gbGVuZ3RoKSB0aHJvdyBuZXcgUmFuZ2VFcnJvcignVHJ5aW5nIHRvIGFjY2VzcyBiZXlvbmQgYnVmZmVyIGxlbmd0aCcpXG59XG5cbkJ1ZmZlci5wcm90b3R5cGUucmVhZFVJbnRMRSA9IGZ1bmN0aW9uIHJlYWRVSW50TEUgKG9mZnNldCwgYnl0ZUxlbmd0aCwgbm9Bc3NlcnQpIHtcbiAgb2Zmc2V0ID0gb2Zmc2V0ID4+PiAwXG4gIGJ5dGVMZW5ndGggPSBieXRlTGVuZ3RoID4+PiAwXG4gIGlmICghbm9Bc3NlcnQpIGNoZWNrT2Zmc2V0KG9mZnNldCwgYnl0ZUxlbmd0aCwgdGhpcy5sZW5ndGgpXG5cbiAgdmFyIHZhbCA9IHRoaXNbb2Zmc2V0XVxuICB2YXIgbXVsID0gMVxuICB2YXIgaSA9IDBcbiAgd2hpbGUgKCsraSA8IGJ5dGVMZW5ndGggJiYgKG11bCAqPSAweDEwMCkpIHtcbiAgICB2YWwgKz0gdGhpc1tvZmZzZXQgKyBpXSAqIG11bFxuICB9XG5cbiAgcmV0dXJuIHZhbFxufVxuXG5CdWZmZXIucHJvdG90eXBlLnJlYWRVSW50QkUgPSBmdW5jdGlvbiByZWFkVUludEJFIChvZmZzZXQsIGJ5dGVMZW5ndGgsIG5vQXNzZXJ0KSB7XG4gIG9mZnNldCA9IG9mZnNldCA+Pj4gMFxuICBieXRlTGVuZ3RoID0gYnl0ZUxlbmd0aCA+Pj4gMFxuICBpZiAoIW5vQXNzZXJ0KSB7XG4gICAgY2hlY2tPZmZzZXQob2Zmc2V0LCBieXRlTGVuZ3RoLCB0aGlzLmxlbmd0aClcbiAgfVxuXG4gIHZhciB2YWwgPSB0aGlzW29mZnNldCArIC0tYnl0ZUxlbmd0aF1cbiAgdmFyIG11bCA9IDFcbiAgd2hpbGUgKGJ5dGVMZW5ndGggPiAwICYmIChtdWwgKj0gMHgxMDApKSB7XG4gICAgdmFsICs9IHRoaXNbb2Zmc2V0ICsgLS1ieXRlTGVuZ3RoXSAqIG11bFxuICB9XG5cbiAgcmV0dXJuIHZhbFxufVxuXG5CdWZmZXIucHJvdG90eXBlLnJlYWRVSW50OCA9IGZ1bmN0aW9uIHJlYWRVSW50OCAob2Zmc2V0LCBub0Fzc2VydCkge1xuICBvZmZzZXQgPSBvZmZzZXQgPj4+IDBcbiAgaWYgKCFub0Fzc2VydCkgY2hlY2tPZmZzZXQob2Zmc2V0LCAxLCB0aGlzLmxlbmd0aClcbiAgcmV0dXJuIHRoaXNbb2Zmc2V0XVxufVxuXG5CdWZmZXIucHJvdG90eXBlLnJlYWRVSW50MTZMRSA9IGZ1bmN0aW9uIHJlYWRVSW50MTZMRSAob2Zmc2V0LCBub0Fzc2VydCkge1xuICBvZmZzZXQgPSBvZmZzZXQgPj4+IDBcbiAgaWYgKCFub0Fzc2VydCkgY2hlY2tPZmZzZXQob2Zmc2V0LCAyLCB0aGlzLmxlbmd0aClcbiAgcmV0dXJuIHRoaXNbb2Zmc2V0XSB8ICh0aGlzW29mZnNldCArIDFdIDw8IDgpXG59XG5cbkJ1ZmZlci5wcm90b3R5cGUucmVhZFVJbnQxNkJFID0gZnVuY3Rpb24gcmVhZFVJbnQxNkJFIChvZmZzZXQsIG5vQXNzZXJ0KSB7XG4gIG9mZnNldCA9IG9mZnNldCA+Pj4gMFxuICBpZiAoIW5vQXNzZXJ0KSBjaGVja09mZnNldChvZmZzZXQsIDIsIHRoaXMubGVuZ3RoKVxuICByZXR1cm4gKHRoaXNbb2Zmc2V0XSA8PCA4KSB8IHRoaXNbb2Zmc2V0ICsgMV1cbn1cblxuQnVmZmVyLnByb3RvdHlwZS5yZWFkVUludDMyTEUgPSBmdW5jdGlvbiByZWFkVUludDMyTEUgKG9mZnNldCwgbm9Bc3NlcnQpIHtcbiAgb2Zmc2V0ID0gb2Zmc2V0ID4+PiAwXG4gIGlmICghbm9Bc3NlcnQpIGNoZWNrT2Zmc2V0KG9mZnNldCwgNCwgdGhpcy5sZW5ndGgpXG5cbiAgcmV0dXJuICgodGhpc1tvZmZzZXRdKSB8XG4gICAgICAodGhpc1tvZmZzZXQgKyAxXSA8PCA4KSB8XG4gICAgICAodGhpc1tvZmZzZXQgKyAyXSA8PCAxNikpICtcbiAgICAgICh0aGlzW29mZnNldCArIDNdICogMHgxMDAwMDAwKVxufVxuXG5CdWZmZXIucHJvdG90eXBlLnJlYWRVSW50MzJCRSA9IGZ1bmN0aW9uIHJlYWRVSW50MzJCRSAob2Zmc2V0LCBub0Fzc2VydCkge1xuICBvZmZzZXQgPSBvZmZzZXQgPj4+IDBcbiAgaWYgKCFub0Fzc2VydCkgY2hlY2tPZmZzZXQob2Zmc2V0LCA0LCB0aGlzLmxlbmd0aClcblxuICByZXR1cm4gKHRoaXNbb2Zmc2V0XSAqIDB4MTAwMDAwMCkgK1xuICAgICgodGhpc1tvZmZzZXQgKyAxXSA8PCAxNikgfFxuICAgICh0aGlzW29mZnNldCArIDJdIDw8IDgpIHxcbiAgICB0aGlzW29mZnNldCArIDNdKVxufVxuXG5CdWZmZXIucHJvdG90eXBlLnJlYWRJbnRMRSA9IGZ1bmN0aW9uIHJlYWRJbnRMRSAob2Zmc2V0LCBieXRlTGVuZ3RoLCBub0Fzc2VydCkge1xuICBvZmZzZXQgPSBvZmZzZXQgPj4+IDBcbiAgYnl0ZUxlbmd0aCA9IGJ5dGVMZW5ndGggPj4+IDBcbiAgaWYgKCFub0Fzc2VydCkgY2hlY2tPZmZzZXQob2Zmc2V0LCBieXRlTGVuZ3RoLCB0aGlzLmxlbmd0aClcblxuICB2YXIgdmFsID0gdGhpc1tvZmZzZXRdXG4gIHZhciBtdWwgPSAxXG4gIHZhciBpID0gMFxuICB3aGlsZSAoKytpIDwgYnl0ZUxlbmd0aCAmJiAobXVsICo9IDB4MTAwKSkge1xuICAgIHZhbCArPSB0aGlzW29mZnNldCArIGldICogbXVsXG4gIH1cbiAgbXVsICo9IDB4ODBcblxuICBpZiAodmFsID49IG11bCkgdmFsIC09IE1hdGgucG93KDIsIDggKiBieXRlTGVuZ3RoKVxuXG4gIHJldHVybiB2YWxcbn1cblxuQnVmZmVyLnByb3RvdHlwZS5yZWFkSW50QkUgPSBmdW5jdGlvbiByZWFkSW50QkUgKG9mZnNldCwgYnl0ZUxlbmd0aCwgbm9Bc3NlcnQpIHtcbiAgb2Zmc2V0ID0gb2Zmc2V0ID4+PiAwXG4gIGJ5dGVMZW5ndGggPSBieXRlTGVuZ3RoID4+PiAwXG4gIGlmICghbm9Bc3NlcnQpIGNoZWNrT2Zmc2V0KG9mZnNldCwgYnl0ZUxlbmd0aCwgdGhpcy5sZW5ndGgpXG5cbiAgdmFyIGkgPSBieXRlTGVuZ3RoXG4gIHZhciBtdWwgPSAxXG4gIHZhciB2YWwgPSB0aGlzW29mZnNldCArIC0taV1cbiAgd2hpbGUgKGkgPiAwICYmIChtdWwgKj0gMHgxMDApKSB7XG4gICAgdmFsICs9IHRoaXNbb2Zmc2V0ICsgLS1pXSAqIG11bFxuICB9XG4gIG11bCAqPSAweDgwXG5cbiAgaWYgKHZhbCA+PSBtdWwpIHZhbCAtPSBNYXRoLnBvdygyLCA4ICogYnl0ZUxlbmd0aClcblxuICByZXR1cm4gdmFsXG59XG5cbkJ1ZmZlci5wcm90b3R5cGUucmVhZEludDggPSBmdW5jdGlvbiByZWFkSW50OCAob2Zmc2V0LCBub0Fzc2VydCkge1xuICBvZmZzZXQgPSBvZmZzZXQgPj4+IDBcbiAgaWYgKCFub0Fzc2VydCkgY2hlY2tPZmZzZXQob2Zmc2V0LCAxLCB0aGlzLmxlbmd0aClcbiAgaWYgKCEodGhpc1tvZmZzZXRdICYgMHg4MCkpIHJldHVybiAodGhpc1tvZmZzZXRdKVxuICByZXR1cm4gKCgweGZmIC0gdGhpc1tvZmZzZXRdICsgMSkgKiAtMSlcbn1cblxuQnVmZmVyLnByb3RvdHlwZS5yZWFkSW50MTZMRSA9IGZ1bmN0aW9uIHJlYWRJbnQxNkxFIChvZmZzZXQsIG5vQXNzZXJ0KSB7XG4gIG9mZnNldCA9IG9mZnNldCA+Pj4gMFxuICBpZiAoIW5vQXNzZXJ0KSBjaGVja09mZnNldChvZmZzZXQsIDIsIHRoaXMubGVuZ3RoKVxuICB2YXIgdmFsID0gdGhpc1tvZmZzZXRdIHwgKHRoaXNbb2Zmc2V0ICsgMV0gPDwgOClcbiAgcmV0dXJuICh2YWwgJiAweDgwMDApID8gdmFsIHwgMHhGRkZGMDAwMCA6IHZhbFxufVxuXG5CdWZmZXIucHJvdG90eXBlLnJlYWRJbnQxNkJFID0gZnVuY3Rpb24gcmVhZEludDE2QkUgKG9mZnNldCwgbm9Bc3NlcnQpIHtcbiAgb2Zmc2V0ID0gb2Zmc2V0ID4+PiAwXG4gIGlmICghbm9Bc3NlcnQpIGNoZWNrT2Zmc2V0KG9mZnNldCwgMiwgdGhpcy5sZW5ndGgpXG4gIHZhciB2YWwgPSB0aGlzW29mZnNldCArIDFdIHwgKHRoaXNbb2Zmc2V0XSA8PCA4KVxuICByZXR1cm4gKHZhbCAmIDB4ODAwMCkgPyB2YWwgfCAweEZGRkYwMDAwIDogdmFsXG59XG5cbkJ1ZmZlci5wcm90b3R5cGUucmVhZEludDMyTEUgPSBmdW5jdGlvbiByZWFkSW50MzJMRSAob2Zmc2V0LCBub0Fzc2VydCkge1xuICBvZmZzZXQgPSBvZmZzZXQgPj4+IDBcbiAgaWYgKCFub0Fzc2VydCkgY2hlY2tPZmZzZXQob2Zmc2V0LCA0LCB0aGlzLmxlbmd0aClcblxuICByZXR1cm4gKHRoaXNbb2Zmc2V0XSkgfFxuICAgICh0aGlzW29mZnNldCArIDFdIDw8IDgpIHxcbiAgICAodGhpc1tvZmZzZXQgKyAyXSA8PCAxNikgfFxuICAgICh0aGlzW29mZnNldCArIDNdIDw8IDI0KVxufVxuXG5CdWZmZXIucHJvdG90eXBlLnJlYWRJbnQzMkJFID0gZnVuY3Rpb24gcmVhZEludDMyQkUgKG9mZnNldCwgbm9Bc3NlcnQpIHtcbiAgb2Zmc2V0ID0gb2Zmc2V0ID4+PiAwXG4gIGlmICghbm9Bc3NlcnQpIGNoZWNrT2Zmc2V0KG9mZnNldCwgNCwgdGhpcy5sZW5ndGgpXG5cbiAgcmV0dXJuICh0aGlzW29mZnNldF0gPDwgMjQpIHxcbiAgICAodGhpc1tvZmZzZXQgKyAxXSA8PCAxNikgfFxuICAgICh0aGlzW29mZnNldCArIDJdIDw8IDgpIHxcbiAgICAodGhpc1tvZmZzZXQgKyAzXSlcbn1cblxuQnVmZmVyLnByb3RvdHlwZS5yZWFkRmxvYXRMRSA9IGZ1bmN0aW9uIHJlYWRGbG9hdExFIChvZmZzZXQsIG5vQXNzZXJ0KSB7XG4gIG9mZnNldCA9IG9mZnNldCA+Pj4gMFxuICBpZiAoIW5vQXNzZXJ0KSBjaGVja09mZnNldChvZmZzZXQsIDQsIHRoaXMubGVuZ3RoKVxuICByZXR1cm4gaWVlZTc1NC5yZWFkKHRoaXMsIG9mZnNldCwgdHJ1ZSwgMjMsIDQpXG59XG5cbkJ1ZmZlci5wcm90b3R5cGUucmVhZEZsb2F0QkUgPSBmdW5jdGlvbiByZWFkRmxvYXRCRSAob2Zmc2V0LCBub0Fzc2VydCkge1xuICBvZmZzZXQgPSBvZmZzZXQgPj4+IDBcbiAgaWYgKCFub0Fzc2VydCkgY2hlY2tPZmZzZXQob2Zmc2V0LCA0LCB0aGlzLmxlbmd0aClcbiAgcmV0dXJuIGllZWU3NTQucmVhZCh0aGlzLCBvZmZzZXQsIGZhbHNlLCAyMywgNClcbn1cblxuQnVmZmVyLnByb3RvdHlwZS5yZWFkRG91YmxlTEUgPSBmdW5jdGlvbiByZWFkRG91YmxlTEUgKG9mZnNldCwgbm9Bc3NlcnQpIHtcbiAgb2Zmc2V0ID0gb2Zmc2V0ID4+PiAwXG4gIGlmICghbm9Bc3NlcnQpIGNoZWNrT2Zmc2V0KG9mZnNldCwgOCwgdGhpcy5sZW5ndGgpXG4gIHJldHVybiBpZWVlNzU0LnJlYWQodGhpcywgb2Zmc2V0LCB0cnVlLCA1MiwgOClcbn1cblxuQnVmZmVyLnByb3RvdHlwZS5yZWFkRG91YmxlQkUgPSBmdW5jdGlvbiByZWFkRG91YmxlQkUgKG9mZnNldCwgbm9Bc3NlcnQpIHtcbiAgb2Zmc2V0ID0gb2Zmc2V0ID4+PiAwXG4gIGlmICghbm9Bc3NlcnQpIGNoZWNrT2Zmc2V0KG9mZnNldCwgOCwgdGhpcy5sZW5ndGgpXG4gIHJldHVybiBpZWVlNzU0LnJlYWQodGhpcywgb2Zmc2V0LCBmYWxzZSwgNTIsIDgpXG59XG5cbmZ1bmN0aW9uIGNoZWNrSW50IChidWYsIHZhbHVlLCBvZmZzZXQsIGV4dCwgbWF4LCBtaW4pIHtcbiAgaWYgKCFCdWZmZXIuaXNCdWZmZXIoYnVmKSkgdGhyb3cgbmV3IFR5cGVFcnJvcignXCJidWZmZXJcIiBhcmd1bWVudCBtdXN0IGJlIGEgQnVmZmVyIGluc3RhbmNlJylcbiAgaWYgKHZhbHVlID4gbWF4IHx8IHZhbHVlIDwgbWluKSB0aHJvdyBuZXcgUmFuZ2VFcnJvcignXCJ2YWx1ZVwiIGFyZ3VtZW50IGlzIG91dCBvZiBib3VuZHMnKVxuICBpZiAob2Zmc2V0ICsgZXh0ID4gYnVmLmxlbmd0aCkgdGhyb3cgbmV3IFJhbmdlRXJyb3IoJ0luZGV4IG91dCBvZiByYW5nZScpXG59XG5cbkJ1ZmZlci5wcm90b3R5cGUud3JpdGVVSW50TEUgPSBmdW5jdGlvbiB3cml0ZVVJbnRMRSAodmFsdWUsIG9mZnNldCwgYnl0ZUxlbmd0aCwgbm9Bc3NlcnQpIHtcbiAgdmFsdWUgPSArdmFsdWVcbiAgb2Zmc2V0ID0gb2Zmc2V0ID4+PiAwXG4gIGJ5dGVMZW5ndGggPSBieXRlTGVuZ3RoID4+PiAwXG4gIGlmICghbm9Bc3NlcnQpIHtcbiAgICB2YXIgbWF4Qnl0ZXMgPSBNYXRoLnBvdygyLCA4ICogYnl0ZUxlbmd0aCkgLSAxXG4gICAgY2hlY2tJbnQodGhpcywgdmFsdWUsIG9mZnNldCwgYnl0ZUxlbmd0aCwgbWF4Qnl0ZXMsIDApXG4gIH1cblxuICB2YXIgbXVsID0gMVxuICB2YXIgaSA9IDBcbiAgdGhpc1tvZmZzZXRdID0gdmFsdWUgJiAweEZGXG4gIHdoaWxlICgrK2kgPCBieXRlTGVuZ3RoICYmIChtdWwgKj0gMHgxMDApKSB7XG4gICAgdGhpc1tvZmZzZXQgKyBpXSA9ICh2YWx1ZSAvIG11bCkgJiAweEZGXG4gIH1cblxuICByZXR1cm4gb2Zmc2V0ICsgYnl0ZUxlbmd0aFxufVxuXG5CdWZmZXIucHJvdG90eXBlLndyaXRlVUludEJFID0gZnVuY3Rpb24gd3JpdGVVSW50QkUgKHZhbHVlLCBvZmZzZXQsIGJ5dGVMZW5ndGgsIG5vQXNzZXJ0KSB7XG4gIHZhbHVlID0gK3ZhbHVlXG4gIG9mZnNldCA9IG9mZnNldCA+Pj4gMFxuICBieXRlTGVuZ3RoID0gYnl0ZUxlbmd0aCA+Pj4gMFxuICBpZiAoIW5vQXNzZXJ0KSB7XG4gICAgdmFyIG1heEJ5dGVzID0gTWF0aC5wb3coMiwgOCAqIGJ5dGVMZW5ndGgpIC0gMVxuICAgIGNoZWNrSW50KHRoaXMsIHZhbHVlLCBvZmZzZXQsIGJ5dGVMZW5ndGgsIG1heEJ5dGVzLCAwKVxuICB9XG5cbiAgdmFyIGkgPSBieXRlTGVuZ3RoIC0gMVxuICB2YXIgbXVsID0gMVxuICB0aGlzW29mZnNldCArIGldID0gdmFsdWUgJiAweEZGXG4gIHdoaWxlICgtLWkgPj0gMCAmJiAobXVsICo9IDB4MTAwKSkge1xuICAgIHRoaXNbb2Zmc2V0ICsgaV0gPSAodmFsdWUgLyBtdWwpICYgMHhGRlxuICB9XG5cbiAgcmV0dXJuIG9mZnNldCArIGJ5dGVMZW5ndGhcbn1cblxuQnVmZmVyLnByb3RvdHlwZS53cml0ZVVJbnQ4ID0gZnVuY3Rpb24gd3JpdGVVSW50OCAodmFsdWUsIG9mZnNldCwgbm9Bc3NlcnQpIHtcbiAgdmFsdWUgPSArdmFsdWVcbiAgb2Zmc2V0ID0gb2Zmc2V0ID4+PiAwXG4gIGlmICghbm9Bc3NlcnQpIGNoZWNrSW50KHRoaXMsIHZhbHVlLCBvZmZzZXQsIDEsIDB4ZmYsIDApXG4gIHRoaXNbb2Zmc2V0XSA9ICh2YWx1ZSAmIDB4ZmYpXG4gIHJldHVybiBvZmZzZXQgKyAxXG59XG5cbkJ1ZmZlci5wcm90b3R5cGUud3JpdGVVSW50MTZMRSA9IGZ1bmN0aW9uIHdyaXRlVUludDE2TEUgKHZhbHVlLCBvZmZzZXQsIG5vQXNzZXJ0KSB7XG4gIHZhbHVlID0gK3ZhbHVlXG4gIG9mZnNldCA9IG9mZnNldCA+Pj4gMFxuICBpZiAoIW5vQXNzZXJ0KSBjaGVja0ludCh0aGlzLCB2YWx1ZSwgb2Zmc2V0LCAyLCAweGZmZmYsIDApXG4gIHRoaXNbb2Zmc2V0XSA9ICh2YWx1ZSAmIDB4ZmYpXG4gIHRoaXNbb2Zmc2V0ICsgMV0gPSAodmFsdWUgPj4+IDgpXG4gIHJldHVybiBvZmZzZXQgKyAyXG59XG5cbkJ1ZmZlci5wcm90b3R5cGUud3JpdGVVSW50MTZCRSA9IGZ1bmN0aW9uIHdyaXRlVUludDE2QkUgKHZhbHVlLCBvZmZzZXQsIG5vQXNzZXJ0KSB7XG4gIHZhbHVlID0gK3ZhbHVlXG4gIG9mZnNldCA9IG9mZnNldCA+Pj4gMFxuICBpZiAoIW5vQXNzZXJ0KSBjaGVja0ludCh0aGlzLCB2YWx1ZSwgb2Zmc2V0LCAyLCAweGZmZmYsIDApXG4gIHRoaXNbb2Zmc2V0XSA9ICh2YWx1ZSA+Pj4gOClcbiAgdGhpc1tvZmZzZXQgKyAxXSA9ICh2YWx1ZSAmIDB4ZmYpXG4gIHJldHVybiBvZmZzZXQgKyAyXG59XG5cbkJ1ZmZlci5wcm90b3R5cGUud3JpdGVVSW50MzJMRSA9IGZ1bmN0aW9uIHdyaXRlVUludDMyTEUgKHZhbHVlLCBvZmZzZXQsIG5vQXNzZXJ0KSB7XG4gIHZhbHVlID0gK3ZhbHVlXG4gIG9mZnNldCA9IG9mZnNldCA+Pj4gMFxuICBpZiAoIW5vQXNzZXJ0KSBjaGVja0ludCh0aGlzLCB2YWx1ZSwgb2Zmc2V0LCA0LCAweGZmZmZmZmZmLCAwKVxuICB0aGlzW29mZnNldCArIDNdID0gKHZhbHVlID4+PiAyNClcbiAgdGhpc1tvZmZzZXQgKyAyXSA9ICh2YWx1ZSA+Pj4gMTYpXG4gIHRoaXNbb2Zmc2V0ICsgMV0gPSAodmFsdWUgPj4+IDgpXG4gIHRoaXNbb2Zmc2V0XSA9ICh2YWx1ZSAmIDB4ZmYpXG4gIHJldHVybiBvZmZzZXQgKyA0XG59XG5cbkJ1ZmZlci5wcm90b3R5cGUud3JpdGVVSW50MzJCRSA9IGZ1bmN0aW9uIHdyaXRlVUludDMyQkUgKHZhbHVlLCBvZmZzZXQsIG5vQXNzZXJ0KSB7XG4gIHZhbHVlID0gK3ZhbHVlXG4gIG9mZnNldCA9IG9mZnNldCA+Pj4gMFxuICBpZiAoIW5vQXNzZXJ0KSBjaGVja0ludCh0aGlzLCB2YWx1ZSwgb2Zmc2V0LCA0LCAweGZmZmZmZmZmLCAwKVxuICB0aGlzW29mZnNldF0gPSAodmFsdWUgPj4+IDI0KVxuICB0aGlzW29mZnNldCArIDFdID0gKHZhbHVlID4+PiAxNilcbiAgdGhpc1tvZmZzZXQgKyAyXSA9ICh2YWx1ZSA+Pj4gOClcbiAgdGhpc1tvZmZzZXQgKyAzXSA9ICh2YWx1ZSAmIDB4ZmYpXG4gIHJldHVybiBvZmZzZXQgKyA0XG59XG5cbkJ1ZmZlci5wcm90b3R5cGUud3JpdGVJbnRMRSA9IGZ1bmN0aW9uIHdyaXRlSW50TEUgKHZhbHVlLCBvZmZzZXQsIGJ5dGVMZW5ndGgsIG5vQXNzZXJ0KSB7XG4gIHZhbHVlID0gK3ZhbHVlXG4gIG9mZnNldCA9IG9mZnNldCA+Pj4gMFxuICBpZiAoIW5vQXNzZXJ0KSB7XG4gICAgdmFyIGxpbWl0ID0gTWF0aC5wb3coMiwgKDggKiBieXRlTGVuZ3RoKSAtIDEpXG5cbiAgICBjaGVja0ludCh0aGlzLCB2YWx1ZSwgb2Zmc2V0LCBieXRlTGVuZ3RoLCBsaW1pdCAtIDEsIC1saW1pdClcbiAgfVxuXG4gIHZhciBpID0gMFxuICB2YXIgbXVsID0gMVxuICB2YXIgc3ViID0gMFxuICB0aGlzW29mZnNldF0gPSB2YWx1ZSAmIDB4RkZcbiAgd2hpbGUgKCsraSA8IGJ5dGVMZW5ndGggJiYgKG11bCAqPSAweDEwMCkpIHtcbiAgICBpZiAodmFsdWUgPCAwICYmIHN1YiA9PT0gMCAmJiB0aGlzW29mZnNldCArIGkgLSAxXSAhPT0gMCkge1xuICAgICAgc3ViID0gMVxuICAgIH1cbiAgICB0aGlzW29mZnNldCArIGldID0gKCh2YWx1ZSAvIG11bCkgPj4gMCkgLSBzdWIgJiAweEZGXG4gIH1cblxuICByZXR1cm4gb2Zmc2V0ICsgYnl0ZUxlbmd0aFxufVxuXG5CdWZmZXIucHJvdG90eXBlLndyaXRlSW50QkUgPSBmdW5jdGlvbiB3cml0ZUludEJFICh2YWx1ZSwgb2Zmc2V0LCBieXRlTGVuZ3RoLCBub0Fzc2VydCkge1xuICB2YWx1ZSA9ICt2YWx1ZVxuICBvZmZzZXQgPSBvZmZzZXQgPj4+IDBcbiAgaWYgKCFub0Fzc2VydCkge1xuICAgIHZhciBsaW1pdCA9IE1hdGgucG93KDIsICg4ICogYnl0ZUxlbmd0aCkgLSAxKVxuXG4gICAgY2hlY2tJbnQodGhpcywgdmFsdWUsIG9mZnNldCwgYnl0ZUxlbmd0aCwgbGltaXQgLSAxLCAtbGltaXQpXG4gIH1cblxuICB2YXIgaSA9IGJ5dGVMZW5ndGggLSAxXG4gIHZhciBtdWwgPSAxXG4gIHZhciBzdWIgPSAwXG4gIHRoaXNbb2Zmc2V0ICsgaV0gPSB2YWx1ZSAmIDB4RkZcbiAgd2hpbGUgKC0taSA+PSAwICYmIChtdWwgKj0gMHgxMDApKSB7XG4gICAgaWYgKHZhbHVlIDwgMCAmJiBzdWIgPT09IDAgJiYgdGhpc1tvZmZzZXQgKyBpICsgMV0gIT09IDApIHtcbiAgICAgIHN1YiA9IDFcbiAgICB9XG4gICAgdGhpc1tvZmZzZXQgKyBpXSA9ICgodmFsdWUgLyBtdWwpID4+IDApIC0gc3ViICYgMHhGRlxuICB9XG5cbiAgcmV0dXJuIG9mZnNldCArIGJ5dGVMZW5ndGhcbn1cblxuQnVmZmVyLnByb3RvdHlwZS53cml0ZUludDggPSBmdW5jdGlvbiB3cml0ZUludDggKHZhbHVlLCBvZmZzZXQsIG5vQXNzZXJ0KSB7XG4gIHZhbHVlID0gK3ZhbHVlXG4gIG9mZnNldCA9IG9mZnNldCA+Pj4gMFxuICBpZiAoIW5vQXNzZXJ0KSBjaGVja0ludCh0aGlzLCB2YWx1ZSwgb2Zmc2V0LCAxLCAweDdmLCAtMHg4MClcbiAgaWYgKHZhbHVlIDwgMCkgdmFsdWUgPSAweGZmICsgdmFsdWUgKyAxXG4gIHRoaXNbb2Zmc2V0XSA9ICh2YWx1ZSAmIDB4ZmYpXG4gIHJldHVybiBvZmZzZXQgKyAxXG59XG5cbkJ1ZmZlci5wcm90b3R5cGUud3JpdGVJbnQxNkxFID0gZnVuY3Rpb24gd3JpdGVJbnQxNkxFICh2YWx1ZSwgb2Zmc2V0LCBub0Fzc2VydCkge1xuICB2YWx1ZSA9ICt2YWx1ZVxuICBvZmZzZXQgPSBvZmZzZXQgPj4+IDBcbiAgaWYgKCFub0Fzc2VydCkgY2hlY2tJbnQodGhpcywgdmFsdWUsIG9mZnNldCwgMiwgMHg3ZmZmLCAtMHg4MDAwKVxuICB0aGlzW29mZnNldF0gPSAodmFsdWUgJiAweGZmKVxuICB0aGlzW29mZnNldCArIDFdID0gKHZhbHVlID4+PiA4KVxuICByZXR1cm4gb2Zmc2V0ICsgMlxufVxuXG5CdWZmZXIucHJvdG90eXBlLndyaXRlSW50MTZCRSA9IGZ1bmN0aW9uIHdyaXRlSW50MTZCRSAodmFsdWUsIG9mZnNldCwgbm9Bc3NlcnQpIHtcbiAgdmFsdWUgPSArdmFsdWVcbiAgb2Zmc2V0ID0gb2Zmc2V0ID4+PiAwXG4gIGlmICghbm9Bc3NlcnQpIGNoZWNrSW50KHRoaXMsIHZhbHVlLCBvZmZzZXQsIDIsIDB4N2ZmZiwgLTB4ODAwMClcbiAgdGhpc1tvZmZzZXRdID0gKHZhbHVlID4+PiA4KVxuICB0aGlzW29mZnNldCArIDFdID0gKHZhbHVlICYgMHhmZilcbiAgcmV0dXJuIG9mZnNldCArIDJcbn1cblxuQnVmZmVyLnByb3RvdHlwZS53cml0ZUludDMyTEUgPSBmdW5jdGlvbiB3cml0ZUludDMyTEUgKHZhbHVlLCBvZmZzZXQsIG5vQXNzZXJ0KSB7XG4gIHZhbHVlID0gK3ZhbHVlXG4gIG9mZnNldCA9IG9mZnNldCA+Pj4gMFxuICBpZiAoIW5vQXNzZXJ0KSBjaGVja0ludCh0aGlzLCB2YWx1ZSwgb2Zmc2V0LCA0LCAweDdmZmZmZmZmLCAtMHg4MDAwMDAwMClcbiAgdGhpc1tvZmZzZXRdID0gKHZhbHVlICYgMHhmZilcbiAgdGhpc1tvZmZzZXQgKyAxXSA9ICh2YWx1ZSA+Pj4gOClcbiAgdGhpc1tvZmZzZXQgKyAyXSA9ICh2YWx1ZSA+Pj4gMTYpXG4gIHRoaXNbb2Zmc2V0ICsgM10gPSAodmFsdWUgPj4+IDI0KVxuICByZXR1cm4gb2Zmc2V0ICsgNFxufVxuXG5CdWZmZXIucHJvdG90eXBlLndyaXRlSW50MzJCRSA9IGZ1bmN0aW9uIHdyaXRlSW50MzJCRSAodmFsdWUsIG9mZnNldCwgbm9Bc3NlcnQpIHtcbiAgdmFsdWUgPSArdmFsdWVcbiAgb2Zmc2V0ID0gb2Zmc2V0ID4+PiAwXG4gIGlmICghbm9Bc3NlcnQpIGNoZWNrSW50KHRoaXMsIHZhbHVlLCBvZmZzZXQsIDQsIDB4N2ZmZmZmZmYsIC0weDgwMDAwMDAwKVxuICBpZiAodmFsdWUgPCAwKSB2YWx1ZSA9IDB4ZmZmZmZmZmYgKyB2YWx1ZSArIDFcbiAgdGhpc1tvZmZzZXRdID0gKHZhbHVlID4+PiAyNClcbiAgdGhpc1tvZmZzZXQgKyAxXSA9ICh2YWx1ZSA+Pj4gMTYpXG4gIHRoaXNbb2Zmc2V0ICsgMl0gPSAodmFsdWUgPj4+IDgpXG4gIHRoaXNbb2Zmc2V0ICsgM10gPSAodmFsdWUgJiAweGZmKVxuICByZXR1cm4gb2Zmc2V0ICsgNFxufVxuXG5mdW5jdGlvbiBjaGVja0lFRUU3NTQgKGJ1ZiwgdmFsdWUsIG9mZnNldCwgZXh0LCBtYXgsIG1pbikge1xuICBpZiAob2Zmc2V0ICsgZXh0ID4gYnVmLmxlbmd0aCkgdGhyb3cgbmV3IFJhbmdlRXJyb3IoJ0luZGV4IG91dCBvZiByYW5nZScpXG4gIGlmIChvZmZzZXQgPCAwKSB0aHJvdyBuZXcgUmFuZ2VFcnJvcignSW5kZXggb3V0IG9mIHJhbmdlJylcbn1cblxuZnVuY3Rpb24gd3JpdGVGbG9hdCAoYnVmLCB2YWx1ZSwgb2Zmc2V0LCBsaXR0bGVFbmRpYW4sIG5vQXNzZXJ0KSB7XG4gIHZhbHVlID0gK3ZhbHVlXG4gIG9mZnNldCA9IG9mZnNldCA+Pj4gMFxuICBpZiAoIW5vQXNzZXJ0KSB7XG4gICAgY2hlY2tJRUVFNzU0KGJ1ZiwgdmFsdWUsIG9mZnNldCwgNCwgMy40MDI4MjM0NjYzODUyODg2ZSszOCwgLTMuNDAyODIzNDY2Mzg1Mjg4NmUrMzgpXG4gIH1cbiAgaWVlZTc1NC53cml0ZShidWYsIHZhbHVlLCBvZmZzZXQsIGxpdHRsZUVuZGlhbiwgMjMsIDQpXG4gIHJldHVybiBvZmZzZXQgKyA0XG59XG5cbkJ1ZmZlci5wcm90b3R5cGUud3JpdGVGbG9hdExFID0gZnVuY3Rpb24gd3JpdGVGbG9hdExFICh2YWx1ZSwgb2Zmc2V0LCBub0Fzc2VydCkge1xuICByZXR1cm4gd3JpdGVGbG9hdCh0aGlzLCB2YWx1ZSwgb2Zmc2V0LCB0cnVlLCBub0Fzc2VydClcbn1cblxuQnVmZmVyLnByb3RvdHlwZS53cml0ZUZsb2F0QkUgPSBmdW5jdGlvbiB3cml0ZUZsb2F0QkUgKHZhbHVlLCBvZmZzZXQsIG5vQXNzZXJ0KSB7XG4gIHJldHVybiB3cml0ZUZsb2F0KHRoaXMsIHZhbHVlLCBvZmZzZXQsIGZhbHNlLCBub0Fzc2VydClcbn1cblxuZnVuY3Rpb24gd3JpdGVEb3VibGUgKGJ1ZiwgdmFsdWUsIG9mZnNldCwgbGl0dGxlRW5kaWFuLCBub0Fzc2VydCkge1xuICB2YWx1ZSA9ICt2YWx1ZVxuICBvZmZzZXQgPSBvZmZzZXQgPj4+IDBcbiAgaWYgKCFub0Fzc2VydCkge1xuICAgIGNoZWNrSUVFRTc1NChidWYsIHZhbHVlLCBvZmZzZXQsIDgsIDEuNzk3NjkzMTM0ODYyMzE1N0UrMzA4LCAtMS43OTc2OTMxMzQ4NjIzMTU3RSszMDgpXG4gIH1cbiAgaWVlZTc1NC53cml0ZShidWYsIHZhbHVlLCBvZmZzZXQsIGxpdHRsZUVuZGlhbiwgNTIsIDgpXG4gIHJldHVybiBvZmZzZXQgKyA4XG59XG5cbkJ1ZmZlci5wcm90b3R5cGUud3JpdGVEb3VibGVMRSA9IGZ1bmN0aW9uIHdyaXRlRG91YmxlTEUgKHZhbHVlLCBvZmZzZXQsIG5vQXNzZXJ0KSB7XG4gIHJldHVybiB3cml0ZURvdWJsZSh0aGlzLCB2YWx1ZSwgb2Zmc2V0LCB0cnVlLCBub0Fzc2VydClcbn1cblxuQnVmZmVyLnByb3RvdHlwZS53cml0ZURvdWJsZUJFID0gZnVuY3Rpb24gd3JpdGVEb3VibGVCRSAodmFsdWUsIG9mZnNldCwgbm9Bc3NlcnQpIHtcbiAgcmV0dXJuIHdyaXRlRG91YmxlKHRoaXMsIHZhbHVlLCBvZmZzZXQsIGZhbHNlLCBub0Fzc2VydClcbn1cblxuLy8gY29weSh0YXJnZXRCdWZmZXIsIHRhcmdldFN0YXJ0PTAsIHNvdXJjZVN0YXJ0PTAsIHNvdXJjZUVuZD1idWZmZXIubGVuZ3RoKVxuQnVmZmVyLnByb3RvdHlwZS5jb3B5ID0gZnVuY3Rpb24gY29weSAodGFyZ2V0LCB0YXJnZXRTdGFydCwgc3RhcnQsIGVuZCkge1xuICBpZiAoIUJ1ZmZlci5pc0J1ZmZlcih0YXJnZXQpKSB0aHJvdyBuZXcgVHlwZUVycm9yKCdhcmd1bWVudCBzaG91bGQgYmUgYSBCdWZmZXInKVxuICBpZiAoIXN0YXJ0KSBzdGFydCA9IDBcbiAgaWYgKCFlbmQgJiYgZW5kICE9PSAwKSBlbmQgPSB0aGlzLmxlbmd0aFxuICBpZiAodGFyZ2V0U3RhcnQgPj0gdGFyZ2V0Lmxlbmd0aCkgdGFyZ2V0U3RhcnQgPSB0YXJnZXQubGVuZ3RoXG4gIGlmICghdGFyZ2V0U3RhcnQpIHRhcmdldFN0YXJ0ID0gMFxuICBpZiAoZW5kID4gMCAmJiBlbmQgPCBzdGFydCkgZW5kID0gc3RhcnRcblxuICAvLyBDb3B5IDAgYnl0ZXM7IHdlJ3JlIGRvbmVcbiAgaWYgKGVuZCA9PT0gc3RhcnQpIHJldHVybiAwXG4gIGlmICh0YXJnZXQubGVuZ3RoID09PSAwIHx8IHRoaXMubGVuZ3RoID09PSAwKSByZXR1cm4gMFxuXG4gIC8vIEZhdGFsIGVycm9yIGNvbmRpdGlvbnNcbiAgaWYgKHRhcmdldFN0YXJ0IDwgMCkge1xuICAgIHRocm93IG5ldyBSYW5nZUVycm9yKCd0YXJnZXRTdGFydCBvdXQgb2YgYm91bmRzJylcbiAgfVxuICBpZiAoc3RhcnQgPCAwIHx8IHN0YXJ0ID49IHRoaXMubGVuZ3RoKSB0aHJvdyBuZXcgUmFuZ2VFcnJvcignSW5kZXggb3V0IG9mIHJhbmdlJylcbiAgaWYgKGVuZCA8IDApIHRocm93IG5ldyBSYW5nZUVycm9yKCdzb3VyY2VFbmQgb3V0IG9mIGJvdW5kcycpXG5cbiAgLy8gQXJlIHdlIG9vYj9cbiAgaWYgKGVuZCA+IHRoaXMubGVuZ3RoKSBlbmQgPSB0aGlzLmxlbmd0aFxuICBpZiAodGFyZ2V0Lmxlbmd0aCAtIHRhcmdldFN0YXJ0IDwgZW5kIC0gc3RhcnQpIHtcbiAgICBlbmQgPSB0YXJnZXQubGVuZ3RoIC0gdGFyZ2V0U3RhcnQgKyBzdGFydFxuICB9XG5cbiAgdmFyIGxlbiA9IGVuZCAtIHN0YXJ0XG5cbiAgaWYgKHRoaXMgPT09IHRhcmdldCAmJiB0eXBlb2YgVWludDhBcnJheS5wcm90b3R5cGUuY29weVdpdGhpbiA9PT0gJ2Z1bmN0aW9uJykge1xuICAgIC8vIFVzZSBidWlsdC1pbiB3aGVuIGF2YWlsYWJsZSwgbWlzc2luZyBmcm9tIElFMTFcbiAgICB0aGlzLmNvcHlXaXRoaW4odGFyZ2V0U3RhcnQsIHN0YXJ0LCBlbmQpXG4gIH0gZWxzZSBpZiAodGhpcyA9PT0gdGFyZ2V0ICYmIHN0YXJ0IDwgdGFyZ2V0U3RhcnQgJiYgdGFyZ2V0U3RhcnQgPCBlbmQpIHtcbiAgICAvLyBkZXNjZW5kaW5nIGNvcHkgZnJvbSBlbmRcbiAgICBmb3IgKHZhciBpID0gbGVuIC0gMTsgaSA+PSAwOyAtLWkpIHtcbiAgICAgIHRhcmdldFtpICsgdGFyZ2V0U3RhcnRdID0gdGhpc1tpICsgc3RhcnRdXG4gICAgfVxuICB9IGVsc2Uge1xuICAgIFVpbnQ4QXJyYXkucHJvdG90eXBlLnNldC5jYWxsKFxuICAgICAgdGFyZ2V0LFxuICAgICAgdGhpcy5zdWJhcnJheShzdGFydCwgZW5kKSxcbiAgICAgIHRhcmdldFN0YXJ0XG4gICAgKVxuICB9XG5cbiAgcmV0dXJuIGxlblxufVxuXG4vLyBVc2FnZTpcbi8vICAgIGJ1ZmZlci5maWxsKG51bWJlclssIG9mZnNldFssIGVuZF1dKVxuLy8gICAgYnVmZmVyLmZpbGwoYnVmZmVyWywgb2Zmc2V0WywgZW5kXV0pXG4vLyAgICBidWZmZXIuZmlsbChzdHJpbmdbLCBvZmZzZXRbLCBlbmRdXVssIGVuY29kaW5nXSlcbkJ1ZmZlci5wcm90b3R5cGUuZmlsbCA9IGZ1bmN0aW9uIGZpbGwgKHZhbCwgc3RhcnQsIGVuZCwgZW5jb2RpbmcpIHtcbiAgLy8gSGFuZGxlIHN0cmluZyBjYXNlczpcbiAgaWYgKHR5cGVvZiB2YWwgPT09ICdzdHJpbmcnKSB7XG4gICAgaWYgKHR5cGVvZiBzdGFydCA9PT0gJ3N0cmluZycpIHtcbiAgICAgIGVuY29kaW5nID0gc3RhcnRcbiAgICAgIHN0YXJ0ID0gMFxuICAgICAgZW5kID0gdGhpcy5sZW5ndGhcbiAgICB9IGVsc2UgaWYgKHR5cGVvZiBlbmQgPT09ICdzdHJpbmcnKSB7XG4gICAgICBlbmNvZGluZyA9IGVuZFxuICAgICAgZW5kID0gdGhpcy5sZW5ndGhcbiAgICB9XG4gICAgaWYgKGVuY29kaW5nICE9PSB1bmRlZmluZWQgJiYgdHlwZW9mIGVuY29kaW5nICE9PSAnc3RyaW5nJykge1xuICAgICAgdGhyb3cgbmV3IFR5cGVFcnJvcignZW5jb2RpbmcgbXVzdCBiZSBhIHN0cmluZycpXG4gICAgfVxuICAgIGlmICh0eXBlb2YgZW5jb2RpbmcgPT09ICdzdHJpbmcnICYmICFCdWZmZXIuaXNFbmNvZGluZyhlbmNvZGluZykpIHtcbiAgICAgIHRocm93IG5ldyBUeXBlRXJyb3IoJ1Vua25vd24gZW5jb2Rpbmc6ICcgKyBlbmNvZGluZylcbiAgICB9XG4gICAgaWYgKHZhbC5sZW5ndGggPT09IDEpIHtcbiAgICAgIHZhciBjb2RlID0gdmFsLmNoYXJDb2RlQXQoMClcbiAgICAgIGlmICgoZW5jb2RpbmcgPT09ICd1dGY4JyAmJiBjb2RlIDwgMTI4KSB8fFxuICAgICAgICAgIGVuY29kaW5nID09PSAnbGF0aW4xJykge1xuICAgICAgICAvLyBGYXN0IHBhdGg6IElmIGB2YWxgIGZpdHMgaW50byBhIHNpbmdsZSBieXRlLCB1c2UgdGhhdCBudW1lcmljIHZhbHVlLlxuICAgICAgICB2YWwgPSBjb2RlXG4gICAgICB9XG4gICAgfVxuICB9IGVsc2UgaWYgKHR5cGVvZiB2YWwgPT09ICdudW1iZXInKSB7XG4gICAgdmFsID0gdmFsICYgMjU1XG4gIH0gZWxzZSBpZiAodHlwZW9mIHZhbCA9PT0gJ2Jvb2xlYW4nKSB7XG4gICAgdmFsID0gTnVtYmVyKHZhbClcbiAgfVxuXG4gIC8vIEludmFsaWQgcmFuZ2VzIGFyZSBub3Qgc2V0IHRvIGEgZGVmYXVsdCwgc28gY2FuIHJhbmdlIGNoZWNrIGVhcmx5LlxuICBpZiAoc3RhcnQgPCAwIHx8IHRoaXMubGVuZ3RoIDwgc3RhcnQgfHwgdGhpcy5sZW5ndGggPCBlbmQpIHtcbiAgICB0aHJvdyBuZXcgUmFuZ2VFcnJvcignT3V0IG9mIHJhbmdlIGluZGV4JylcbiAgfVxuXG4gIGlmIChlbmQgPD0gc3RhcnQpIHtcbiAgICByZXR1cm4gdGhpc1xuICB9XG5cbiAgc3RhcnQgPSBzdGFydCA+Pj4gMFxuICBlbmQgPSBlbmQgPT09IHVuZGVmaW5lZCA/IHRoaXMubGVuZ3RoIDogZW5kID4+PiAwXG5cbiAgaWYgKCF2YWwpIHZhbCA9IDBcblxuICB2YXIgaVxuICBpZiAodHlwZW9mIHZhbCA9PT0gJ251bWJlcicpIHtcbiAgICBmb3IgKGkgPSBzdGFydDsgaSA8IGVuZDsgKytpKSB7XG4gICAgICB0aGlzW2ldID0gdmFsXG4gICAgfVxuICB9IGVsc2Uge1xuICAgIHZhciBieXRlcyA9IEJ1ZmZlci5pc0J1ZmZlcih2YWwpXG4gICAgICA/IHZhbFxuICAgICAgOiBCdWZmZXIuZnJvbSh2YWwsIGVuY29kaW5nKVxuICAgIHZhciBsZW4gPSBieXRlcy5sZW5ndGhcbiAgICBpZiAobGVuID09PSAwKSB7XG4gICAgICB0aHJvdyBuZXcgVHlwZUVycm9yKCdUaGUgdmFsdWUgXCInICsgdmFsICtcbiAgICAgICAgJ1wiIGlzIGludmFsaWQgZm9yIGFyZ3VtZW50IFwidmFsdWVcIicpXG4gICAgfVxuICAgIGZvciAoaSA9IDA7IGkgPCBlbmQgLSBzdGFydDsgKytpKSB7XG4gICAgICB0aGlzW2kgKyBzdGFydF0gPSBieXRlc1tpICUgbGVuXVxuICAgIH1cbiAgfVxuXG4gIHJldHVybiB0aGlzXG59XG5cbi8vIEhFTFBFUiBGVU5DVElPTlNcbi8vID09PT09PT09PT09PT09PT1cblxudmFyIElOVkFMSURfQkFTRTY0X1JFID0gL1teKy8wLTlBLVphLXotX10vZ1xuXG5mdW5jdGlvbiBiYXNlNjRjbGVhbiAoc3RyKSB7XG4gIC8vIE5vZGUgdGFrZXMgZXF1YWwgc2lnbnMgYXMgZW5kIG9mIHRoZSBCYXNlNjQgZW5jb2RpbmdcbiAgc3RyID0gc3RyLnNwbGl0KCc9JylbMF1cbiAgLy8gTm9kZSBzdHJpcHMgb3V0IGludmFsaWQgY2hhcmFjdGVycyBsaWtlIFxcbiBhbmQgXFx0IGZyb20gdGhlIHN0cmluZywgYmFzZTY0LWpzIGRvZXMgbm90XG4gIHN0ciA9IHN0ci50cmltKCkucmVwbGFjZShJTlZBTElEX0JBU0U2NF9SRSwgJycpXG4gIC8vIE5vZGUgY29udmVydHMgc3RyaW5ncyB3aXRoIGxlbmd0aCA8IDIgdG8gJydcbiAgaWYgKHN0ci5sZW5ndGggPCAyKSByZXR1cm4gJydcbiAgLy8gTm9kZSBhbGxvd3MgZm9yIG5vbi1wYWRkZWQgYmFzZTY0IHN0cmluZ3MgKG1pc3NpbmcgdHJhaWxpbmcgPT09KSwgYmFzZTY0LWpzIGRvZXMgbm90XG4gIHdoaWxlIChzdHIubGVuZ3RoICUgNCAhPT0gMCkge1xuICAgIHN0ciA9IHN0ciArICc9J1xuICB9XG4gIHJldHVybiBzdHJcbn1cblxuZnVuY3Rpb24gdXRmOFRvQnl0ZXMgKHN0cmluZywgdW5pdHMpIHtcbiAgdW5pdHMgPSB1bml0cyB8fCBJbmZpbml0eVxuICB2YXIgY29kZVBvaW50XG4gIHZhciBsZW5ndGggPSBzdHJpbmcubGVuZ3RoXG4gIHZhciBsZWFkU3Vycm9nYXRlID0gbnVsbFxuICB2YXIgYnl0ZXMgPSBbXVxuXG4gIGZvciAodmFyIGkgPSAwOyBpIDwgbGVuZ3RoOyArK2kpIHtcbiAgICBjb2RlUG9pbnQgPSBzdHJpbmcuY2hhckNvZGVBdChpKVxuXG4gICAgLy8gaXMgc3Vycm9nYXRlIGNvbXBvbmVudFxuICAgIGlmIChjb2RlUG9pbnQgPiAweEQ3RkYgJiYgY29kZVBvaW50IDwgMHhFMDAwKSB7XG4gICAgICAvLyBsYXN0IGNoYXIgd2FzIGEgbGVhZFxuICAgICAgaWYgKCFsZWFkU3Vycm9nYXRlKSB7XG4gICAgICAgIC8vIG5vIGxlYWQgeWV0XG4gICAgICAgIGlmIChjb2RlUG9pbnQgPiAweERCRkYpIHtcbiAgICAgICAgICAvLyB1bmV4cGVjdGVkIHRyYWlsXG4gICAgICAgICAgaWYgKCh1bml0cyAtPSAzKSA+IC0xKSBieXRlcy5wdXNoKDB4RUYsIDB4QkYsIDB4QkQpXG4gICAgICAgICAgY29udGludWVcbiAgICAgICAgfSBlbHNlIGlmIChpICsgMSA9PT0gbGVuZ3RoKSB7XG4gICAgICAgICAgLy8gdW5wYWlyZWQgbGVhZFxuICAgICAgICAgIGlmICgodW5pdHMgLT0gMykgPiAtMSkgYnl0ZXMucHVzaCgweEVGLCAweEJGLCAweEJEKVxuICAgICAgICAgIGNvbnRpbnVlXG4gICAgICAgIH1cblxuICAgICAgICAvLyB2YWxpZCBsZWFkXG4gICAgICAgIGxlYWRTdXJyb2dhdGUgPSBjb2RlUG9pbnRcblxuICAgICAgICBjb250aW51ZVxuICAgICAgfVxuXG4gICAgICAvLyAyIGxlYWRzIGluIGEgcm93XG4gICAgICBpZiAoY29kZVBvaW50IDwgMHhEQzAwKSB7XG4gICAgICAgIGlmICgodW5pdHMgLT0gMykgPiAtMSkgYnl0ZXMucHVzaCgweEVGLCAweEJGLCAweEJEKVxuICAgICAgICBsZWFkU3Vycm9nYXRlID0gY29kZVBvaW50XG4gICAgICAgIGNvbnRpbnVlXG4gICAgICB9XG5cbiAgICAgIC8vIHZhbGlkIHN1cnJvZ2F0ZSBwYWlyXG4gICAgICBjb2RlUG9pbnQgPSAobGVhZFN1cnJvZ2F0ZSAtIDB4RDgwMCA8PCAxMCB8IGNvZGVQb2ludCAtIDB4REMwMCkgKyAweDEwMDAwXG4gICAgfSBlbHNlIGlmIChsZWFkU3Vycm9nYXRlKSB7XG4gICAgICAvLyB2YWxpZCBibXAgY2hhciwgYnV0IGxhc3QgY2hhciB3YXMgYSBsZWFkXG4gICAgICBpZiAoKHVuaXRzIC09IDMpID4gLTEpIGJ5dGVzLnB1c2goMHhFRiwgMHhCRiwgMHhCRClcbiAgICB9XG5cbiAgICBsZWFkU3Vycm9nYXRlID0gbnVsbFxuXG4gICAgLy8gZW5jb2RlIHV0ZjhcbiAgICBpZiAoY29kZVBvaW50IDwgMHg4MCkge1xuICAgICAgaWYgKCh1bml0cyAtPSAxKSA8IDApIGJyZWFrXG4gICAgICBieXRlcy5wdXNoKGNvZGVQb2ludClcbiAgICB9IGVsc2UgaWYgKGNvZGVQb2ludCA8IDB4ODAwKSB7XG4gICAgICBpZiAoKHVuaXRzIC09IDIpIDwgMCkgYnJlYWtcbiAgICAgIGJ5dGVzLnB1c2goXG4gICAgICAgIGNvZGVQb2ludCA+PiAweDYgfCAweEMwLFxuICAgICAgICBjb2RlUG9pbnQgJiAweDNGIHwgMHg4MFxuICAgICAgKVxuICAgIH0gZWxzZSBpZiAoY29kZVBvaW50IDwgMHgxMDAwMCkge1xuICAgICAgaWYgKCh1bml0cyAtPSAzKSA8IDApIGJyZWFrXG4gICAgICBieXRlcy5wdXNoKFxuICAgICAgICBjb2RlUG9pbnQgPj4gMHhDIHwgMHhFMCxcbiAgICAgICAgY29kZVBvaW50ID4+IDB4NiAmIDB4M0YgfCAweDgwLFxuICAgICAgICBjb2RlUG9pbnQgJiAweDNGIHwgMHg4MFxuICAgICAgKVxuICAgIH0gZWxzZSBpZiAoY29kZVBvaW50IDwgMHgxMTAwMDApIHtcbiAgICAgIGlmICgodW5pdHMgLT0gNCkgPCAwKSBicmVha1xuICAgICAgYnl0ZXMucHVzaChcbiAgICAgICAgY29kZVBvaW50ID4+IDB4MTIgfCAweEYwLFxuICAgICAgICBjb2RlUG9pbnQgPj4gMHhDICYgMHgzRiB8IDB4ODAsXG4gICAgICAgIGNvZGVQb2ludCA+PiAweDYgJiAweDNGIHwgMHg4MCxcbiAgICAgICAgY29kZVBvaW50ICYgMHgzRiB8IDB4ODBcbiAgICAgIClcbiAgICB9IGVsc2Uge1xuICAgICAgdGhyb3cgbmV3IEVycm9yKCdJbnZhbGlkIGNvZGUgcG9pbnQnKVxuICAgIH1cbiAgfVxuXG4gIHJldHVybiBieXRlc1xufVxuXG5mdW5jdGlvbiBhc2NpaVRvQnl0ZXMgKHN0cikge1xuICB2YXIgYnl0ZUFycmF5ID0gW11cbiAgZm9yICh2YXIgaSA9IDA7IGkgPCBzdHIubGVuZ3RoOyArK2kpIHtcbiAgICAvLyBOb2RlJ3MgY29kZSBzZWVtcyB0byBiZSBkb2luZyB0aGlzIGFuZCBub3QgJiAweDdGLi5cbiAgICBieXRlQXJyYXkucHVzaChzdHIuY2hhckNvZGVBdChpKSAmIDB4RkYpXG4gIH1cbiAgcmV0dXJuIGJ5dGVBcnJheVxufVxuXG5mdW5jdGlvbiB1dGYxNmxlVG9CeXRlcyAoc3RyLCB1bml0cykge1xuICB2YXIgYywgaGksIGxvXG4gIHZhciBieXRlQXJyYXkgPSBbXVxuICBmb3IgKHZhciBpID0gMDsgaSA8IHN0ci5sZW5ndGg7ICsraSkge1xuICAgIGlmICgodW5pdHMgLT0gMikgPCAwKSBicmVha1xuXG4gICAgYyA9IHN0ci5jaGFyQ29kZUF0KGkpXG4gICAgaGkgPSBjID4+IDhcbiAgICBsbyA9IGMgJSAyNTZcbiAgICBieXRlQXJyYXkucHVzaChsbylcbiAgICBieXRlQXJyYXkucHVzaChoaSlcbiAgfVxuXG4gIHJldHVybiBieXRlQXJyYXlcbn1cblxuZnVuY3Rpb24gYmFzZTY0VG9CeXRlcyAoc3RyKSB7XG4gIHJldHVybiBiYXNlNjQudG9CeXRlQXJyYXkoYmFzZTY0Y2xlYW4oc3RyKSlcbn1cblxuZnVuY3Rpb24gYmxpdEJ1ZmZlciAoc3JjLCBkc3QsIG9mZnNldCwgbGVuZ3RoKSB7XG4gIGZvciAodmFyIGkgPSAwOyBpIDwgbGVuZ3RoOyArK2kpIHtcbiAgICBpZiAoKGkgKyBvZmZzZXQgPj0gZHN0Lmxlbmd0aCkgfHwgKGkgPj0gc3JjLmxlbmd0aCkpIGJyZWFrXG4gICAgZHN0W2kgKyBvZmZzZXRdID0gc3JjW2ldXG4gIH1cbiAgcmV0dXJuIGlcbn1cblxuLy8gQXJyYXlCdWZmZXIgb3IgVWludDhBcnJheSBvYmplY3RzIGZyb20gb3RoZXIgY29udGV4dHMgKGkuZS4gaWZyYW1lcykgZG8gbm90IHBhc3Ncbi8vIHRoZSBgaW5zdGFuY2VvZmAgY2hlY2sgYnV0IHRoZXkgc2hvdWxkIGJlIHRyZWF0ZWQgYXMgb2YgdGhhdCB0eXBlLlxuLy8gU2VlOiBodHRwczovL2dpdGh1Yi5jb20vZmVyb3NzL2J1ZmZlci9pc3N1ZXMvMTY2XG5mdW5jdGlvbiBpc0luc3RhbmNlIChvYmosIHR5cGUpIHtcbiAgcmV0dXJuIG9iaiBpbnN0YW5jZW9mIHR5cGUgfHxcbiAgICAob2JqICE9IG51bGwgJiYgb2JqLmNvbnN0cnVjdG9yICE9IG51bGwgJiYgb2JqLmNvbnN0cnVjdG9yLm5hbWUgIT0gbnVsbCAmJlxuICAgICAgb2JqLmNvbnN0cnVjdG9yLm5hbWUgPT09IHR5cGUubmFtZSlcbn1cbmZ1bmN0aW9uIG51bWJlcklzTmFOIChvYmopIHtcbiAgLy8gRm9yIElFMTEgc3VwcG9ydFxuICByZXR1cm4gb2JqICE9PSBvYmogLy8gZXNsaW50LWRpc2FibGUtbGluZSBuby1zZWxmLWNvbXBhcmVcbn1cblxuLy8gQ3JlYXRlIGxvb2t1cCB0YWJsZSBmb3IgYHRvU3RyaW5nKCdoZXgnKWBcbi8vIFNlZTogaHR0cHM6Ly9naXRodWIuY29tL2Zlcm9zcy9idWZmZXIvaXNzdWVzLzIxOVxudmFyIGhleFNsaWNlTG9va3VwVGFibGUgPSAoZnVuY3Rpb24gKCkge1xuICB2YXIgYWxwaGFiZXQgPSAnMDEyMzQ1Njc4OWFiY2RlZidcbiAgdmFyIHRhYmxlID0gbmV3IEFycmF5KDI1NilcbiAgZm9yICh2YXIgaSA9IDA7IGkgPCAxNjsgKytpKSB7XG4gICAgdmFyIGkxNiA9IGkgKiAxNlxuICAgIGZvciAodmFyIGogPSAwOyBqIDwgMTY7ICsraikge1xuICAgICAgdGFibGVbaTE2ICsgal0gPSBhbHBoYWJldFtpXSArIGFscGhhYmV0W2pdXG4gICAgfVxuICB9XG4gIHJldHVybiB0YWJsZVxufSkoKVxuIiwiZXhwb3J0cy5yZWFkID0gZnVuY3Rpb24gKGJ1ZmZlciwgb2Zmc2V0LCBpc0xFLCBtTGVuLCBuQnl0ZXMpIHtcbiAgdmFyIGUsIG1cbiAgdmFyIGVMZW4gPSAobkJ5dGVzICogOCkgLSBtTGVuIC0gMVxuICB2YXIgZU1heCA9ICgxIDw8IGVMZW4pIC0gMVxuICB2YXIgZUJpYXMgPSBlTWF4ID4+IDFcbiAgdmFyIG5CaXRzID0gLTdcbiAgdmFyIGkgPSBpc0xFID8gKG5CeXRlcyAtIDEpIDogMFxuICB2YXIgZCA9IGlzTEUgPyAtMSA6IDFcbiAgdmFyIHMgPSBidWZmZXJbb2Zmc2V0ICsgaV1cblxuICBpICs9IGRcblxuICBlID0gcyAmICgoMSA8PCAoLW5CaXRzKSkgLSAxKVxuICBzID4+PSAoLW5CaXRzKVxuICBuQml0cyArPSBlTGVuXG4gIGZvciAoOyBuQml0cyA+IDA7IGUgPSAoZSAqIDI1NikgKyBidWZmZXJbb2Zmc2V0ICsgaV0sIGkgKz0gZCwgbkJpdHMgLT0gOCkge31cblxuICBtID0gZSAmICgoMSA8PCAoLW5CaXRzKSkgLSAxKVxuICBlID4+PSAoLW5CaXRzKVxuICBuQml0cyArPSBtTGVuXG4gIGZvciAoOyBuQml0cyA+IDA7IG0gPSAobSAqIDI1NikgKyBidWZmZXJbb2Zmc2V0ICsgaV0sIGkgKz0gZCwgbkJpdHMgLT0gOCkge31cblxuICBpZiAoZSA9PT0gMCkge1xuICAgIGUgPSAxIC0gZUJpYXNcbiAgfSBlbHNlIGlmIChlID09PSBlTWF4KSB7XG4gICAgcmV0dXJuIG0gPyBOYU4gOiAoKHMgPyAtMSA6IDEpICogSW5maW5pdHkpXG4gIH0gZWxzZSB7XG4gICAgbSA9IG0gKyBNYXRoLnBvdygyLCBtTGVuKVxuICAgIGUgPSBlIC0gZUJpYXNcbiAgfVxuICByZXR1cm4gKHMgPyAtMSA6IDEpICogbSAqIE1hdGgucG93KDIsIGUgLSBtTGVuKVxufVxuXG5leHBvcnRzLndyaXRlID0gZnVuY3Rpb24gKGJ1ZmZlciwgdmFsdWUsIG9mZnNldCwgaXNMRSwgbUxlbiwgbkJ5dGVzKSB7XG4gIHZhciBlLCBtLCBjXG4gIHZhciBlTGVuID0gKG5CeXRlcyAqIDgpIC0gbUxlbiAtIDFcbiAgdmFyIGVNYXggPSAoMSA8PCBlTGVuKSAtIDFcbiAgdmFyIGVCaWFzID0gZU1heCA+PiAxXG4gIHZhciBydCA9IChtTGVuID09PSAyMyA/IE1hdGgucG93KDIsIC0yNCkgLSBNYXRoLnBvdygyLCAtNzcpIDogMClcbiAgdmFyIGkgPSBpc0xFID8gMCA6IChuQnl0ZXMgLSAxKVxuICB2YXIgZCA9IGlzTEUgPyAxIDogLTFcbiAgdmFyIHMgPSB2YWx1ZSA8IDAgfHwgKHZhbHVlID09PSAwICYmIDEgLyB2YWx1ZSA8IDApID8gMSA6IDBcblxuICB2YWx1ZSA9IE1hdGguYWJzKHZhbHVlKVxuXG4gIGlmIChpc05hTih2YWx1ZSkgfHwgdmFsdWUgPT09IEluZmluaXR5KSB7XG4gICAgbSA9IGlzTmFOKHZhbHVlKSA/IDEgOiAwXG4gICAgZSA9IGVNYXhcbiAgfSBlbHNlIHtcbiAgICBlID0gTWF0aC5mbG9vcihNYXRoLmxvZyh2YWx1ZSkgLyBNYXRoLkxOMilcbiAgICBpZiAodmFsdWUgKiAoYyA9IE1hdGgucG93KDIsIC1lKSkgPCAxKSB7XG4gICAgICBlLS1cbiAgICAgIGMgKj0gMlxuICAgIH1cbiAgICBpZiAoZSArIGVCaWFzID49IDEpIHtcbiAgICAgIHZhbHVlICs9IHJ0IC8gY1xuICAgIH0gZWxzZSB7XG4gICAgICB2YWx1ZSArPSBydCAqIE1hdGgucG93KDIsIDEgLSBlQmlhcylcbiAgICB9XG4gICAgaWYgKHZhbHVlICogYyA+PSAyKSB7XG4gICAgICBlKytcbiAgICAgIGMgLz0gMlxuICAgIH1cblxuICAgIGlmIChlICsgZUJpYXMgPj0gZU1heCkge1xuICAgICAgbSA9IDBcbiAgICAgIGUgPSBlTWF4XG4gICAgfSBlbHNlIGlmIChlICsgZUJpYXMgPj0gMSkge1xuICAgICAgbSA9ICgodmFsdWUgKiBjKSAtIDEpICogTWF0aC5wb3coMiwgbUxlbilcbiAgICAgIGUgPSBlICsgZUJpYXNcbiAgICB9IGVsc2Uge1xuICAgICAgbSA9IHZhbHVlICogTWF0aC5wb3coMiwgZUJpYXMgLSAxKSAqIE1hdGgucG93KDIsIG1MZW4pXG4gICAgICBlID0gMFxuICAgIH1cbiAgfVxuXG4gIGZvciAoOyBtTGVuID49IDg7IGJ1ZmZlcltvZmZzZXQgKyBpXSA9IG0gJiAweGZmLCBpICs9IGQsIG0gLz0gMjU2LCBtTGVuIC09IDgpIHt9XG5cbiAgZSA9IChlIDw8IG1MZW4pIHwgbVxuICBlTGVuICs9IG1MZW5cbiAgZm9yICg7IGVMZW4gPiAwOyBidWZmZXJbb2Zmc2V0ICsgaV0gPSBlICYgMHhmZiwgaSArPSBkLCBlIC89IDI1NiwgZUxlbiAtPSA4KSB7fVxuXG4gIGJ1ZmZlcltvZmZzZXQgKyBpIC0gZF0gfD0gcyAqIDEyOFxufVxuIiwiJ3VzZSBzdHJpY3QnO1xuXG52YXIgYXNhcCA9IHJlcXVpcmUoJ2FzYXAvcmF3Jyk7XG5cbmZ1bmN0aW9uIG5vb3AoKSB7fVxuXG4vLyBTdGF0ZXM6XG4vL1xuLy8gMCAtIHBlbmRpbmdcbi8vIDEgLSBmdWxmaWxsZWQgd2l0aCBfdmFsdWVcbi8vIDIgLSByZWplY3RlZCB3aXRoIF92YWx1ZVxuLy8gMyAtIGFkb3B0ZWQgdGhlIHN0YXRlIG9mIGFub3RoZXIgcHJvbWlzZSwgX3ZhbHVlXG4vL1xuLy8gb25jZSB0aGUgc3RhdGUgaXMgbm8gbG9uZ2VyIHBlbmRpbmcgKDApIGl0IGlzIGltbXV0YWJsZVxuXG4vLyBBbGwgYF9gIHByZWZpeGVkIHByb3BlcnRpZXMgd2lsbCBiZSByZWR1Y2VkIHRvIGBfe3JhbmRvbSBudW1iZXJ9YFxuLy8gYXQgYnVpbGQgdGltZSB0byBvYmZ1c2NhdGUgdGhlbSBhbmQgZGlzY291cmFnZSB0aGVpciB1c2UuXG4vLyBXZSBkb24ndCB1c2Ugc3ltYm9scyBvciBPYmplY3QuZGVmaW5lUHJvcGVydHkgdG8gZnVsbHkgaGlkZSB0aGVtXG4vLyBiZWNhdXNlIHRoZSBwZXJmb3JtYW5jZSBpc24ndCBnb29kIGVub3VnaC5cblxuXG4vLyB0byBhdm9pZCB1c2luZyB0cnkvY2F0Y2ggaW5zaWRlIGNyaXRpY2FsIGZ1bmN0aW9ucywgd2Vcbi8vIGV4dHJhY3QgdGhlbSB0byBoZXJlLlxudmFyIExBU1RfRVJST1IgPSBudWxsO1xudmFyIElTX0VSUk9SID0ge307XG5mdW5jdGlvbiBnZXRUaGVuKG9iaikge1xuICB0cnkge1xuICAgIHJldHVybiBvYmoudGhlbjtcbiAgfSBjYXRjaCAoZXgpIHtcbiAgICBMQVNUX0VSUk9SID0gZXg7XG4gICAgcmV0dXJuIElTX0VSUk9SO1xuICB9XG59XG5cbmZ1bmN0aW9uIHRyeUNhbGxPbmUoZm4sIGEpIHtcbiAgdHJ5IHtcbiAgICByZXR1cm4gZm4oYSk7XG4gIH0gY2F0Y2ggKGV4KSB7XG4gICAgTEFTVF9FUlJPUiA9IGV4O1xuICAgIHJldHVybiBJU19FUlJPUjtcbiAgfVxufVxuZnVuY3Rpb24gdHJ5Q2FsbFR3byhmbiwgYSwgYikge1xuICB0cnkge1xuICAgIGZuKGEsIGIpO1xuICB9IGNhdGNoIChleCkge1xuICAgIExBU1RfRVJST1IgPSBleDtcbiAgICByZXR1cm4gSVNfRVJST1I7XG4gIH1cbn1cblxubW9kdWxlLmV4cG9ydHMgPSBQcm9taXNlO1xuXG5mdW5jdGlvbiBQcm9taXNlKGZuKSB7XG4gIGlmICh0eXBlb2YgdGhpcyAhPT0gJ29iamVjdCcpIHtcbiAgICB0aHJvdyBuZXcgVHlwZUVycm9yKCdQcm9taXNlcyBtdXN0IGJlIGNvbnN0cnVjdGVkIHZpYSBuZXcnKTtcbiAgfVxuICBpZiAodHlwZW9mIGZuICE9PSAnZnVuY3Rpb24nKSB7XG4gICAgdGhyb3cgbmV3IFR5cGVFcnJvcignUHJvbWlzZSBjb25zdHJ1Y3RvclxcJ3MgYXJndW1lbnQgaXMgbm90IGEgZnVuY3Rpb24nKTtcbiAgfVxuICB0aGlzLl9oID0gMDtcbiAgdGhpcy5faSA9IDA7XG4gIHRoaXMuX2ogPSBudWxsO1xuICB0aGlzLl9rID0gbnVsbDtcbiAgaWYgKGZuID09PSBub29wKSByZXR1cm47XG4gIGRvUmVzb2x2ZShmbiwgdGhpcyk7XG59XG5Qcm9taXNlLl9sID0gbnVsbDtcblByb21pc2UuX20gPSBudWxsO1xuUHJvbWlzZS5fbiA9IG5vb3A7XG5cblByb21pc2UucHJvdG90eXBlLnRoZW4gPSBmdW5jdGlvbihvbkZ1bGZpbGxlZCwgb25SZWplY3RlZCkge1xuICBpZiAodGhpcy5jb25zdHJ1Y3RvciAhPT0gUHJvbWlzZSkge1xuICAgIHJldHVybiBzYWZlVGhlbih0aGlzLCBvbkZ1bGZpbGxlZCwgb25SZWplY3RlZCk7XG4gIH1cbiAgdmFyIHJlcyA9IG5ldyBQcm9taXNlKG5vb3ApO1xuICBoYW5kbGUodGhpcywgbmV3IEhhbmRsZXIob25GdWxmaWxsZWQsIG9uUmVqZWN0ZWQsIHJlcykpO1xuICByZXR1cm4gcmVzO1xufTtcblxuZnVuY3Rpb24gc2FmZVRoZW4oc2VsZiwgb25GdWxmaWxsZWQsIG9uUmVqZWN0ZWQpIHtcbiAgcmV0dXJuIG5ldyBzZWxmLmNvbnN0cnVjdG9yKGZ1bmN0aW9uIChyZXNvbHZlLCByZWplY3QpIHtcbiAgICB2YXIgcmVzID0gbmV3IFByb21pc2Uobm9vcCk7XG4gICAgcmVzLnRoZW4ocmVzb2x2ZSwgcmVqZWN0KTtcbiAgICBoYW5kbGUoc2VsZiwgbmV3IEhhbmRsZXIob25GdWxmaWxsZWQsIG9uUmVqZWN0ZWQsIHJlcykpO1xuICB9KTtcbn1cbmZ1bmN0aW9uIGhhbmRsZShzZWxmLCBkZWZlcnJlZCkge1xuICB3aGlsZSAoc2VsZi5faSA9PT0gMykge1xuICAgIHNlbGYgPSBzZWxmLl9qO1xuICB9XG4gIGlmIChQcm9taXNlLl9sKSB7XG4gICAgUHJvbWlzZS5fbChzZWxmKTtcbiAgfVxuICBpZiAoc2VsZi5faSA9PT0gMCkge1xuICAgIGlmIChzZWxmLl9oID09PSAwKSB7XG4gICAgICBzZWxmLl9oID0gMTtcbiAgICAgIHNlbGYuX2sgPSBkZWZlcnJlZDtcbiAgICAgIHJldHVybjtcbiAgICB9XG4gICAgaWYgKHNlbGYuX2ggPT09IDEpIHtcbiAgICAgIHNlbGYuX2ggPSAyO1xuICAgICAgc2VsZi5fayA9IFtzZWxmLl9rLCBkZWZlcnJlZF07XG4gICAgICByZXR1cm47XG4gICAgfVxuICAgIHNlbGYuX2sucHVzaChkZWZlcnJlZCk7XG4gICAgcmV0dXJuO1xuICB9XG4gIGhhbmRsZVJlc29sdmVkKHNlbGYsIGRlZmVycmVkKTtcbn1cblxuZnVuY3Rpb24gaGFuZGxlUmVzb2x2ZWQoc2VsZiwgZGVmZXJyZWQpIHtcbiAgYXNhcChmdW5jdGlvbigpIHtcbiAgICB2YXIgY2IgPSBzZWxmLl9pID09PSAxID8gZGVmZXJyZWQub25GdWxmaWxsZWQgOiBkZWZlcnJlZC5vblJlamVjdGVkO1xuICAgIGlmIChjYiA9PT0gbnVsbCkge1xuICAgICAgaWYgKHNlbGYuX2kgPT09IDEpIHtcbiAgICAgICAgcmVzb2x2ZShkZWZlcnJlZC5wcm9taXNlLCBzZWxmLl9qKTtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIHJlamVjdChkZWZlcnJlZC5wcm9taXNlLCBzZWxmLl9qKTtcbiAgICAgIH1cbiAgICAgIHJldHVybjtcbiAgICB9XG4gICAgdmFyIHJldCA9IHRyeUNhbGxPbmUoY2IsIHNlbGYuX2opO1xuICAgIGlmIChyZXQgPT09IElTX0VSUk9SKSB7XG4gICAgICByZWplY3QoZGVmZXJyZWQucHJvbWlzZSwgTEFTVF9FUlJPUik7XG4gICAgfSBlbHNlIHtcbiAgICAgIHJlc29sdmUoZGVmZXJyZWQucHJvbWlzZSwgcmV0KTtcbiAgICB9XG4gIH0pO1xufVxuZnVuY3Rpb24gcmVzb2x2ZShzZWxmLCBuZXdWYWx1ZSkge1xuICAvLyBQcm9taXNlIFJlc29sdXRpb24gUHJvY2VkdXJlOiBodHRwczovL2dpdGh1Yi5jb20vcHJvbWlzZXMtYXBsdXMvcHJvbWlzZXMtc3BlYyN0aGUtcHJvbWlzZS1yZXNvbHV0aW9uLXByb2NlZHVyZVxuICBpZiAobmV3VmFsdWUgPT09IHNlbGYpIHtcbiAgICByZXR1cm4gcmVqZWN0KFxuICAgICAgc2VsZixcbiAgICAgIG5ldyBUeXBlRXJyb3IoJ0EgcHJvbWlzZSBjYW5ub3QgYmUgcmVzb2x2ZWQgd2l0aCBpdHNlbGYuJylcbiAgICApO1xuICB9XG4gIGlmIChcbiAgICBuZXdWYWx1ZSAmJlxuICAgICh0eXBlb2YgbmV3VmFsdWUgPT09ICdvYmplY3QnIHx8IHR5cGVvZiBuZXdWYWx1ZSA9PT0gJ2Z1bmN0aW9uJylcbiAgKSB7XG4gICAgdmFyIHRoZW4gPSBnZXRUaGVuKG5ld1ZhbHVlKTtcbiAgICBpZiAodGhlbiA9PT0gSVNfRVJST1IpIHtcbiAgICAgIHJldHVybiByZWplY3Qoc2VsZiwgTEFTVF9FUlJPUik7XG4gICAgfVxuICAgIGlmIChcbiAgICAgIHRoZW4gPT09IHNlbGYudGhlbiAmJlxuICAgICAgbmV3VmFsdWUgaW5zdGFuY2VvZiBQcm9taXNlXG4gICAgKSB7XG4gICAgICBzZWxmLl9pID0gMztcbiAgICAgIHNlbGYuX2ogPSBuZXdWYWx1ZTtcbiAgICAgIGZpbmFsZShzZWxmKTtcbiAgICAgIHJldHVybjtcbiAgICB9IGVsc2UgaWYgKHR5cGVvZiB0aGVuID09PSAnZnVuY3Rpb24nKSB7XG4gICAgICBkb1Jlc29sdmUodGhlbi5iaW5kKG5ld1ZhbHVlKSwgc2VsZik7XG4gICAgICByZXR1cm47XG4gICAgfVxuICB9XG4gIHNlbGYuX2kgPSAxO1xuICBzZWxmLl9qID0gbmV3VmFsdWU7XG4gIGZpbmFsZShzZWxmKTtcbn1cblxuZnVuY3Rpb24gcmVqZWN0KHNlbGYsIG5ld1ZhbHVlKSB7XG4gIHNlbGYuX2kgPSAyO1xuICBzZWxmLl9qID0gbmV3VmFsdWU7XG4gIGlmIChQcm9taXNlLl9tKSB7XG4gICAgUHJvbWlzZS5fbShzZWxmLCBuZXdWYWx1ZSk7XG4gIH1cbiAgZmluYWxlKHNlbGYpO1xufVxuZnVuY3Rpb24gZmluYWxlKHNlbGYpIHtcbiAgaWYgKHNlbGYuX2ggPT09IDEpIHtcbiAgICBoYW5kbGUoc2VsZiwgc2VsZi5fayk7XG4gICAgc2VsZi5fayA9IG51bGw7XG4gIH1cbiAgaWYgKHNlbGYuX2ggPT09IDIpIHtcbiAgICBmb3IgKHZhciBpID0gMDsgaSA8IHNlbGYuX2subGVuZ3RoOyBpKyspIHtcbiAgICAgIGhhbmRsZShzZWxmLCBzZWxmLl9rW2ldKTtcbiAgICB9XG4gICAgc2VsZi5fayA9IG51bGw7XG4gIH1cbn1cblxuZnVuY3Rpb24gSGFuZGxlcihvbkZ1bGZpbGxlZCwgb25SZWplY3RlZCwgcHJvbWlzZSl7XG4gIHRoaXMub25GdWxmaWxsZWQgPSB0eXBlb2Ygb25GdWxmaWxsZWQgPT09ICdmdW5jdGlvbicgPyBvbkZ1bGZpbGxlZCA6IG51bGw7XG4gIHRoaXMub25SZWplY3RlZCA9IHR5cGVvZiBvblJlamVjdGVkID09PSAnZnVuY3Rpb24nID8gb25SZWplY3RlZCA6IG51bGw7XG4gIHRoaXMucHJvbWlzZSA9IHByb21pc2U7XG59XG5cbi8qKlxuICogVGFrZSBhIHBvdGVudGlhbGx5IG1pc2JlaGF2aW5nIHJlc29sdmVyIGZ1bmN0aW9uIGFuZCBtYWtlIHN1cmVcbiAqIG9uRnVsZmlsbGVkIGFuZCBvblJlamVjdGVkIGFyZSBvbmx5IGNhbGxlZCBvbmNlLlxuICpcbiAqIE1ha2VzIG5vIGd1YXJhbnRlZXMgYWJvdXQgYXN5bmNocm9ueS5cbiAqL1xuZnVuY3Rpb24gZG9SZXNvbHZlKGZuLCBwcm9taXNlKSB7XG4gIHZhciBkb25lID0gZmFsc2U7XG4gIHZhciByZXMgPSB0cnlDYWxsVHdvKGZuLCBmdW5jdGlvbiAodmFsdWUpIHtcbiAgICBpZiAoZG9uZSkgcmV0dXJuO1xuICAgIGRvbmUgPSB0cnVlO1xuICAgIHJlc29sdmUocHJvbWlzZSwgdmFsdWUpO1xuICB9LCBmdW5jdGlvbiAocmVhc29uKSB7XG4gICAgaWYgKGRvbmUpIHJldHVybjtcbiAgICBkb25lID0gdHJ1ZTtcbiAgICByZWplY3QocHJvbWlzZSwgcmVhc29uKTtcbiAgfSk7XG4gIGlmICghZG9uZSAmJiByZXMgPT09IElTX0VSUk9SKSB7XG4gICAgZG9uZSA9IHRydWU7XG4gICAgcmVqZWN0KHByb21pc2UsIExBU1RfRVJST1IpO1xuICB9XG59XG4iLCIndXNlIHN0cmljdCc7XG5cbi8vVGhpcyBmaWxlIGNvbnRhaW5zIHRoZSBFUzYgZXh0ZW5zaW9ucyB0byB0aGUgY29yZSBQcm9taXNlcy9BKyBBUElcblxudmFyIFByb21pc2UgPSByZXF1aXJlKCcuL2NvcmUuanMnKTtcblxubW9kdWxlLmV4cG9ydHMgPSBQcm9taXNlO1xuXG4vKiBTdGF0aWMgRnVuY3Rpb25zICovXG5cbnZhciBUUlVFID0gdmFsdWVQcm9taXNlKHRydWUpO1xudmFyIEZBTFNFID0gdmFsdWVQcm9taXNlKGZhbHNlKTtcbnZhciBOVUxMID0gdmFsdWVQcm9taXNlKG51bGwpO1xudmFyIFVOREVGSU5FRCA9IHZhbHVlUHJvbWlzZSh1bmRlZmluZWQpO1xudmFyIFpFUk8gPSB2YWx1ZVByb21pc2UoMCk7XG52YXIgRU1QVFlTVFJJTkcgPSB2YWx1ZVByb21pc2UoJycpO1xuXG5mdW5jdGlvbiB2YWx1ZVByb21pc2UodmFsdWUpIHtcbiAgdmFyIHAgPSBuZXcgUHJvbWlzZShQcm9taXNlLl9uKTtcbiAgcC5faSA9IDE7XG4gIHAuX2ogPSB2YWx1ZTtcbiAgcmV0dXJuIHA7XG59XG5Qcm9taXNlLnJlc29sdmUgPSBmdW5jdGlvbiAodmFsdWUpIHtcbiAgaWYgKHZhbHVlIGluc3RhbmNlb2YgUHJvbWlzZSkgcmV0dXJuIHZhbHVlO1xuXG4gIGlmICh2YWx1ZSA9PT0gbnVsbCkgcmV0dXJuIE5VTEw7XG4gIGlmICh2YWx1ZSA9PT0gdW5kZWZpbmVkKSByZXR1cm4gVU5ERUZJTkVEO1xuICBpZiAodmFsdWUgPT09IHRydWUpIHJldHVybiBUUlVFO1xuICBpZiAodmFsdWUgPT09IGZhbHNlKSByZXR1cm4gRkFMU0U7XG4gIGlmICh2YWx1ZSA9PT0gMCkgcmV0dXJuIFpFUk87XG4gIGlmICh2YWx1ZSA9PT0gJycpIHJldHVybiBFTVBUWVNUUklORztcblxuICBpZiAodHlwZW9mIHZhbHVlID09PSAnb2JqZWN0JyB8fCB0eXBlb2YgdmFsdWUgPT09ICdmdW5jdGlvbicpIHtcbiAgICB0cnkge1xuICAgICAgdmFyIHRoZW4gPSB2YWx1ZS50aGVuO1xuICAgICAgaWYgKHR5cGVvZiB0aGVuID09PSAnZnVuY3Rpb24nKSB7XG4gICAgICAgIHJldHVybiBuZXcgUHJvbWlzZSh0aGVuLmJpbmQodmFsdWUpKTtcbiAgICAgIH1cbiAgICB9IGNhdGNoIChleCkge1xuICAgICAgcmV0dXJuIG5ldyBQcm9taXNlKGZ1bmN0aW9uIChyZXNvbHZlLCByZWplY3QpIHtcbiAgICAgICAgcmVqZWN0KGV4KTtcbiAgICAgIH0pO1xuICAgIH1cbiAgfVxuICByZXR1cm4gdmFsdWVQcm9taXNlKHZhbHVlKTtcbn07XG5cblByb21pc2UuYWxsID0gZnVuY3Rpb24gKGFycikge1xuICB2YXIgYXJncyA9IEFycmF5LnByb3RvdHlwZS5zbGljZS5jYWxsKGFycik7XG5cbiAgcmV0dXJuIG5ldyBQcm9taXNlKGZ1bmN0aW9uIChyZXNvbHZlLCByZWplY3QpIHtcbiAgICBpZiAoYXJncy5sZW5ndGggPT09IDApIHJldHVybiByZXNvbHZlKFtdKTtcbiAgICB2YXIgcmVtYWluaW5nID0gYXJncy5sZW5ndGg7XG4gICAgZnVuY3Rpb24gcmVzKGksIHZhbCkge1xuICAgICAgaWYgKHZhbCAmJiAodHlwZW9mIHZhbCA9PT0gJ29iamVjdCcgfHwgdHlwZW9mIHZhbCA9PT0gJ2Z1bmN0aW9uJykpIHtcbiAgICAgICAgaWYgKHZhbCBpbnN0YW5jZW9mIFByb21pc2UgJiYgdmFsLnRoZW4gPT09IFByb21pc2UucHJvdG90eXBlLnRoZW4pIHtcbiAgICAgICAgICB3aGlsZSAodmFsLl9pID09PSAzKSB7XG4gICAgICAgICAgICB2YWwgPSB2YWwuX2o7XG4gICAgICAgICAgfVxuICAgICAgICAgIGlmICh2YWwuX2kgPT09IDEpIHJldHVybiByZXMoaSwgdmFsLl9qKTtcbiAgICAgICAgICBpZiAodmFsLl9pID09PSAyKSByZWplY3QodmFsLl9qKTtcbiAgICAgICAgICB2YWwudGhlbihmdW5jdGlvbiAodmFsKSB7XG4gICAgICAgICAgICByZXMoaSwgdmFsKTtcbiAgICAgICAgICB9LCByZWplY3QpO1xuICAgICAgICAgIHJldHVybjtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICB2YXIgdGhlbiA9IHZhbC50aGVuO1xuICAgICAgICAgIGlmICh0eXBlb2YgdGhlbiA9PT0gJ2Z1bmN0aW9uJykge1xuICAgICAgICAgICAgdmFyIHAgPSBuZXcgUHJvbWlzZSh0aGVuLmJpbmQodmFsKSk7XG4gICAgICAgICAgICBwLnRoZW4oZnVuY3Rpb24gKHZhbCkge1xuICAgICAgICAgICAgICByZXMoaSwgdmFsKTtcbiAgICAgICAgICAgIH0sIHJlamVjdCk7XG4gICAgICAgICAgICByZXR1cm47XG4gICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICB9XG4gICAgICBhcmdzW2ldID0gdmFsO1xuICAgICAgaWYgKC0tcmVtYWluaW5nID09PSAwKSB7XG4gICAgICAgIHJlc29sdmUoYXJncyk7XG4gICAgICB9XG4gICAgfVxuICAgIGZvciAodmFyIGkgPSAwOyBpIDwgYXJncy5sZW5ndGg7IGkrKykge1xuICAgICAgcmVzKGksIGFyZ3NbaV0pO1xuICAgIH1cbiAgfSk7XG59O1xuXG5Qcm9taXNlLnJlamVjdCA9IGZ1bmN0aW9uICh2YWx1ZSkge1xuICByZXR1cm4gbmV3IFByb21pc2UoZnVuY3Rpb24gKHJlc29sdmUsIHJlamVjdCkge1xuICAgIHJlamVjdCh2YWx1ZSk7XG4gIH0pO1xufTtcblxuUHJvbWlzZS5yYWNlID0gZnVuY3Rpb24gKHZhbHVlcykge1xuICByZXR1cm4gbmV3IFByb21pc2UoZnVuY3Rpb24gKHJlc29sdmUsIHJlamVjdCkge1xuICAgIHZhbHVlcy5mb3JFYWNoKGZ1bmN0aW9uKHZhbHVlKXtcbiAgICAgIFByb21pc2UucmVzb2x2ZSh2YWx1ZSkudGhlbihyZXNvbHZlLCByZWplY3QpO1xuICAgIH0pO1xuICB9KTtcbn07XG5cbi8qIFByb3RvdHlwZSBNZXRob2RzICovXG5cblByb21pc2UucHJvdG90eXBlWydjYXRjaCddID0gZnVuY3Rpb24gKG9uUmVqZWN0ZWQpIHtcbiAgcmV0dXJuIHRoaXMudGhlbihudWxsLCBvblJlamVjdGVkKTtcbn07XG4iLCIndXNlIHN0cmljdCc7XG5cbnZhciBQcm9taXNlID0gcmVxdWlyZSgnLi9jb3JlJyk7XG5cbnZhciBERUZBVUxUX1dISVRFTElTVCA9IFtcbiAgUmVmZXJlbmNlRXJyb3IsXG4gIFR5cGVFcnJvcixcbiAgUmFuZ2VFcnJvclxuXTtcblxudmFyIGVuYWJsZWQgPSBmYWxzZTtcbmV4cG9ydHMuZGlzYWJsZSA9IGRpc2FibGU7XG5mdW5jdGlvbiBkaXNhYmxlKCkge1xuICBlbmFibGVkID0gZmFsc2U7XG4gIFByb21pc2UuX2wgPSBudWxsO1xuICBQcm9taXNlLl9tID0gbnVsbDtcbn1cblxuZXhwb3J0cy5lbmFibGUgPSBlbmFibGU7XG5mdW5jdGlvbiBlbmFibGUob3B0aW9ucykge1xuICBvcHRpb25zID0gb3B0aW9ucyB8fCB7fTtcbiAgaWYgKGVuYWJsZWQpIGRpc2FibGUoKTtcbiAgZW5hYmxlZCA9IHRydWU7XG4gIHZhciBpZCA9IDA7XG4gIHZhciBkaXNwbGF5SWQgPSAwO1xuICB2YXIgcmVqZWN0aW9ucyA9IHt9O1xuICBQcm9taXNlLl9sID0gZnVuY3Rpb24gKHByb21pc2UpIHtcbiAgICBpZiAoXG4gICAgICBwcm9taXNlLl9pID09PSAyICYmIC8vIElTIFJFSkVDVEVEXG4gICAgICByZWplY3Rpb25zW3Byb21pc2UuX29dXG4gICAgKSB7XG4gICAgICBpZiAocmVqZWN0aW9uc1twcm9taXNlLl9vXS5sb2dnZWQpIHtcbiAgICAgICAgb25IYW5kbGVkKHByb21pc2UuX28pO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgY2xlYXJUaW1lb3V0KHJlamVjdGlvbnNbcHJvbWlzZS5fb10udGltZW91dCk7XG4gICAgICB9XG4gICAgICBkZWxldGUgcmVqZWN0aW9uc1twcm9taXNlLl9vXTtcbiAgICB9XG4gIH07XG4gIFByb21pc2UuX20gPSBmdW5jdGlvbiAocHJvbWlzZSwgZXJyKSB7XG4gICAgaWYgKHByb21pc2UuX2ggPT09IDApIHsgLy8gbm90IHlldCBoYW5kbGVkXG4gICAgICBwcm9taXNlLl9vID0gaWQrKztcbiAgICAgIHJlamVjdGlvbnNbcHJvbWlzZS5fb10gPSB7XG4gICAgICAgIGRpc3BsYXlJZDogbnVsbCxcbiAgICAgICAgZXJyb3I6IGVycixcbiAgICAgICAgdGltZW91dDogc2V0VGltZW91dChcbiAgICAgICAgICBvblVuaGFuZGxlZC5iaW5kKG51bGwsIHByb21pc2UuX28pLFxuICAgICAgICAgIC8vIEZvciByZWZlcmVuY2UgZXJyb3JzIGFuZCB0eXBlIGVycm9ycywgdGhpcyBhbG1vc3QgYWx3YXlzXG4gICAgICAgICAgLy8gbWVhbnMgdGhlIHByb2dyYW1tZXIgbWFkZSBhIG1pc3Rha2UsIHNvIGxvZyB0aGVtIGFmdGVyIGp1c3RcbiAgICAgICAgICAvLyAxMDBtc1xuICAgICAgICAgIC8vIG90aGVyd2lzZSwgd2FpdCAyIHNlY29uZHMgdG8gc2VlIGlmIHRoZXkgZ2V0IGhhbmRsZWRcbiAgICAgICAgICBtYXRjaFdoaXRlbGlzdChlcnIsIERFRkFVTFRfV0hJVEVMSVNUKVxuICAgICAgICAgICAgPyAxMDBcbiAgICAgICAgICAgIDogMjAwMFxuICAgICAgICApLFxuICAgICAgICBsb2dnZWQ6IGZhbHNlXG4gICAgICB9O1xuICAgIH1cbiAgfTtcbiAgZnVuY3Rpb24gb25VbmhhbmRsZWQoaWQpIHtcbiAgICBpZiAoXG4gICAgICBvcHRpb25zLmFsbFJlamVjdGlvbnMgfHxcbiAgICAgIG1hdGNoV2hpdGVsaXN0KFxuICAgICAgICByZWplY3Rpb25zW2lkXS5lcnJvcixcbiAgICAgICAgb3B0aW9ucy53aGl0ZWxpc3QgfHwgREVGQVVMVF9XSElURUxJU1RcbiAgICAgIClcbiAgICApIHtcbiAgICAgIHJlamVjdGlvbnNbaWRdLmRpc3BsYXlJZCA9IGRpc3BsYXlJZCsrO1xuICAgICAgaWYgKG9wdGlvbnMub25VbmhhbmRsZWQpIHtcbiAgICAgICAgcmVqZWN0aW9uc1tpZF0ubG9nZ2VkID0gdHJ1ZTtcbiAgICAgICAgb3B0aW9ucy5vblVuaGFuZGxlZChcbiAgICAgICAgICByZWplY3Rpb25zW2lkXS5kaXNwbGF5SWQsXG4gICAgICAgICAgcmVqZWN0aW9uc1tpZF0uZXJyb3JcbiAgICAgICAgKTtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIHJlamVjdGlvbnNbaWRdLmxvZ2dlZCA9IHRydWU7XG4gICAgICAgIGxvZ0Vycm9yKFxuICAgICAgICAgIHJlamVjdGlvbnNbaWRdLmRpc3BsYXlJZCxcbiAgICAgICAgICByZWplY3Rpb25zW2lkXS5lcnJvclxuICAgICAgICApO1xuICAgICAgfVxuICAgIH1cbiAgfVxuICBmdW5jdGlvbiBvbkhhbmRsZWQoaWQpIHtcbiAgICBpZiAocmVqZWN0aW9uc1tpZF0ubG9nZ2VkKSB7XG4gICAgICBpZiAob3B0aW9ucy5vbkhhbmRsZWQpIHtcbiAgICAgICAgb3B0aW9ucy5vbkhhbmRsZWQocmVqZWN0aW9uc1tpZF0uZGlzcGxheUlkLCByZWplY3Rpb25zW2lkXS5lcnJvcik7XG4gICAgICB9IGVsc2UgaWYgKCFyZWplY3Rpb25zW2lkXS5vblVuaGFuZGxlZCkge1xuICAgICAgICBjb25zb2xlLndhcm4oXG4gICAgICAgICAgJ1Byb21pc2UgUmVqZWN0aW9uIEhhbmRsZWQgKGlkOiAnICsgcmVqZWN0aW9uc1tpZF0uZGlzcGxheUlkICsgJyk6J1xuICAgICAgICApO1xuICAgICAgICBjb25zb2xlLndhcm4oXG4gICAgICAgICAgJyAgVGhpcyBtZWFucyB5b3UgY2FuIGlnbm9yZSBhbnkgcHJldmlvdXMgbWVzc2FnZXMgb2YgdGhlIGZvcm0gXCJQb3NzaWJsZSBVbmhhbmRsZWQgUHJvbWlzZSBSZWplY3Rpb25cIiB3aXRoIGlkICcgK1xuICAgICAgICAgIHJlamVjdGlvbnNbaWRdLmRpc3BsYXlJZCArICcuJ1xuICAgICAgICApO1xuICAgICAgfVxuICAgIH1cbiAgfVxufVxuXG5mdW5jdGlvbiBsb2dFcnJvcihpZCwgZXJyb3IpIHtcbiAgY29uc29sZS53YXJuKCdQb3NzaWJsZSBVbmhhbmRsZWQgUHJvbWlzZSBSZWplY3Rpb24gKGlkOiAnICsgaWQgKyAnKTonKTtcbiAgdmFyIGVyclN0ciA9IChlcnJvciAmJiAoZXJyb3Iuc3RhY2sgfHwgZXJyb3IpKSArICcnO1xuICBlcnJTdHIuc3BsaXQoJ1xcbicpLmZvckVhY2goZnVuY3Rpb24gKGxpbmUpIHtcbiAgICBjb25zb2xlLndhcm4oJyAgJyArIGxpbmUpO1xuICB9KTtcbn1cblxuZnVuY3Rpb24gbWF0Y2hXaGl0ZWxpc3QoZXJyb3IsIGxpc3QpIHtcbiAgcmV0dXJuIGxpc3Quc29tZShmdW5jdGlvbiAoY2xzKSB7XG4gICAgcmV0dXJuIGVycm9yIGluc3RhbmNlb2YgY2xzO1xuICB9KTtcbn0iLCJcInVzZSBzdHJpY3RcIjtcblxudmFyIExvZ2dlciA9IHJlcXVpcmUoJy4vbW9kdWxlcy9sb2dnZXInKTtcblxudmFyIFB1YlN1YiA9IHJlcXVpcmUoJy4vbW9kdWxlcy9wdWJzdWInKTtcblxudmFyIENhbGxlciA9IHJlcXVpcmUoJy4vbW9kdWxlcy9jYWxsZXInKTtcblxudmFyIERvbSA9IHJlcXVpcmUoJy4vbW9kdWxlcy9kb20nKTtcblxudmFyIEluZm9Db250cm9sbGVyID0gcmVxdWlyZSgnLi9tb2R1bGVzL2luZm8tY29udHJvbGxlcicpO1xuXG52YXIgQXZhdGFyQ29udHJvbGxlciA9IHJlcXVpcmUoJy4vbW9kdWxlcy9hdmF0YXItY29udHJvbGxlcicpO1xuXG52YXIgU3RvcmUgPSByZXF1aXJlKCcuL21vZHVsZXMvc3RvcmUnKTtcblxudmFyIEFtcGxpdHV0ZSA9IHJlcXVpcmUoJy4vbW9kdWxlcy9hbXBsaXR1ZGUnKTtcblxudmFyIENsb3VkaW5hcnkgPSByZXF1aXJlKCcuL21vZHVsZXMvY2xvdWRpbmFyeS1pbWFnZS1waWNrZXInKTtcblxudmFyIEFDRyA9IHJlcXVpcmUoJy4vbW9kdWxlcy9hY2NvdW50LWNvbnNpc3RlbmN5LWd1YXJkJyk7XG5cbnZhciBwcGJhQ29uZiA9IHt9O1xuXG5mdW5jdGlvbiBoZXhUb1JnYihoZXgsIG9wYWNpdHkpIHtcbiAgdmFyIHJlc3VsdCA9IC9eIz8oW2EtZlxcZF17Mn0pKFthLWZcXGRdezJ9KShbYS1mXFxkXXsyfSkkL2kuZXhlYyhoZXgpO1xuICByZXR1cm4gcmVzdWx0ID8gXCJyZ2JhKFwiLmNvbmNhdChwYXJzZUludChyZXN1bHRbMV0sIDE2KSwgXCIsIFwiKS5jb25jYXQocGFyc2VJbnQocmVzdWx0WzJdLCAxNiksIFwiLCBcIikuY29uY2F0KHBhcnNlSW50KHJlc3VsdFszXSwgMTYpLCBcIiwgXCIpLmNvbmNhdChvcGFjaXR5IHx8IDEsIFwiKVwiKSA6IG51bGw7XG59XG5cbmlmICh0eXBlb2YgUHJvbWlzZSA9PT0gJ3VuZGVmaW5lZCcpIHtcbiAgcmVxdWlyZSgncHJvbWlzZS9saWIvcmVqZWN0aW9uLXRyYWNraW5nJykuZW5hYmxlKCk7XG5cbiAgd2luZG93LlByb21pc2UgPSByZXF1aXJlKCdwcm9taXNlL2xpYi9lczYtZXh0ZW5zaW9ucy5qcycpO1xufVxuXG52YXIgYWZ0ZXJSZW5kZXIgPSBmdW5jdGlvbiBhZnRlclJlbmRlcigpIHtcbiAgaWYgKFN0b3JlLmdldEZ1bGxXaWR0aCgpID09PSB0cnVlKSB7XG4gICAgRG9tLmFkZENsYXNzKGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKFwiYmFjLS1wdXJlc2RrLWJhYy0taGVhZGVyLWFwcHMtLVwiKSwgJ2JhYy0tZnVsbHdpZHRoJyk7XG4gIH1cblxuICBkb2N1bWVudC5nZXRFbGVtZW50QnlJZCgnYmFjLS1wdXJlc2RrLS1hcHBzLS1vcGVuZXItLScpLmFkZEV2ZW50TGlzdGVuZXIoJ2NsaWNrJywgZnVuY3Rpb24gKGUpIHtcbiAgICBlLnByZXZlbnREZWZhdWx0KCk7XG4gICAgZS5zdG9wUHJvcGFnYXRpb24oKTtcbiAgICBEb20udG9nZ2xlQ2xhc3MoZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoJ2JhYy0tcHVyZXNkay1hcHBzLWNvbnRhaW5lci0tJyksICdhY3RpdmUnKTtcbiAgfSk7XG4gIGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKCdiYWMtLXVzZXItYXZhdGFyLXRvcCcpLmFkZEV2ZW50TGlzdGVuZXIoJ2NsaWNrJywgZnVuY3Rpb24gKGUpIHtcbiAgICBlLnN0b3BQcm9wYWdhdGlvbigpO1xuICAgIERvbS5yZW1vdmVDbGFzcyhkb2N1bWVudC5nZXRFbGVtZW50QnlJZCgnYmFjLS1wdXJlc2RrLWFwcHMtY29udGFpbmVyLS0nKSwgJ2FjdGl2ZScpO1xuICAgIERvbS50b2dnbGVDbGFzcyhkb2N1bWVudC5nZXRFbGVtZW50QnlJZCgnYmFjLS1wdXJlc2RrLXVzZXItc2lkZWJhci0tJyksICdhY3RpdmUnKTtcbiAgfSk7XG4gIHdpbmRvdy5hZGRFdmVudExpc3RlbmVyKCdjbGljaycsIGZ1bmN0aW9uIChlKSB7XG4gICAgRG9tLnJlbW92ZUNsYXNzKGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKCdiYWMtLXB1cmVzZGstYXBwcy1jb250YWluZXItLScpLCAnYWN0aXZlJyk7XG4gICAgRG9tLnJlbW92ZUNsYXNzKGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKCdiYWMtLXB1cmVzZGstdXNlci1zaWRlYmFyLS0nKSwgJ2FjdGl2ZScpO1xuICB9KTtcbiAgQXZhdGFyQ29udHJvbGxlci5pbml0KCk7XG4gIHZhciB1c2VyRGF0YSA9IFN0b3JlLmdldFVzZXJEYXRhKCk7XG4gIEF2YXRhckNvbnRyb2xsZXIuc2V0QXZhdGFyKHVzZXJEYXRhLnVzZXIuYXZhdGFyX3VybCk7XG4gIEluZm9Db250cm9sbGVyLmluaXQoKTtcbn07XG5cbnZhciBQUEJBID0ge1xuICBzZXRXaW5kb3dOYW1lOiBmdW5jdGlvbiBzZXRXaW5kb3dOYW1lKHduKSB7XG4gICAgU3RvcmUuc2V0V2luZG93TmFtZSh3bik7XG4gIH0sXG4gIHNldENvbmZpZ3VyYXRpb246IGZ1bmN0aW9uIHNldENvbmZpZ3VyYXRpb24oY29uZikge1xuICAgIFN0b3JlLnNldENvbmZpZ3VyYXRpb24oY29uZik7XG4gIH0sXG4gIHNldEhUTUxUZW1wbGF0ZTogZnVuY3Rpb24gc2V0SFRNTFRlbXBsYXRlKHRlbXBsYXRlKSB7XG4gICAgU3RvcmUuc2V0SFRNTFRlbXBsYXRlKHRlbXBsYXRlKTtcbiAgfSxcbiAgc2V0VmVyc2lvbk51bWJlcjogZnVuY3Rpb24gc2V0VmVyc2lvbk51bWJlcih2ZXJzaW9uKSB7XG4gICAgU3RvcmUuc2V0VmVyc2lvbk51bWJlcih2ZXJzaW9uKTtcbiAgfSxcbiAgbG9nRXZlbnQ6IGZ1bmN0aW9uIGxvZ0V2ZW50KGV2ZW50TmFtZSwgcHJvcHMpIHtcbiAgICBBbXBsaXR1dGUubG9nRXZlbnQoZXZlbnROYW1lLCBwcm9wcyk7XG4gIH0sXG4gIGluaXQ6IGZ1bmN0aW9uIGluaXQoY29uZikge1xuICAgIExvZ2dlci5sb2coJ2luaXRpYWxpemluZyB3aXRoIGNvbmY6ICcsIGNvbmYpO1xuXG4gICAgaWYgKGNvbmYpIHtcbiAgICAgIGlmIChjb25mLmhlYWRlckRpdklkKSB7XG4gICAgICAgIFN0b3JlLnNldEhUTUxDb250YWluZXIoY29uZi5oZWFkZXJEaXZJZCk7XG4gICAgICB9XG5cbiAgICAgIGlmIChjb25mLmFwcHNWaXNpYmxlICE9PSBudWxsKSB7XG4gICAgICAgIFN0b3JlLnNldEFwcHNWaXNpYmxlKGNvbmYuYXBwc1Zpc2libGUpO1xuICAgICAgfVxuXG4gICAgICBpZiAoY29uZi5yb290VXJsKSB7XG4gICAgICAgIFN0b3JlLnNldFJvb3RVcmwoY29uZi5yb290VXJsKTtcbiAgICAgIH1cblxuICAgICAgaWYgKGNvbmYuZGV2ID09PSB0cnVlKSB7XG4gICAgICAgIGlmIChjb25mLmRldktleXMpIHtcbiAgICAgICAgICBDYWxsZXIuc2V0RGV2S2V5cyhjb25mLmRldktleXMpO1xuICAgICAgICAgIFN0b3JlLnNldERldih0cnVlKTtcbiAgICAgICAgfVxuICAgICAgfVxuXG4gICAgICBpZiAoY29uZi5mdWxsV2lkdGgpIHtcbiAgICAgICAgU3RvcmUuc2V0RnVsbFdpZHRoKGNvbmYuZnVsbFdpZHRoKTtcbiAgICAgIH1cblxuICAgICAgaWYgKGNvbmYuZGlzcGxheVN1cHBvcnQpIHtcbiAgICAgICAgU3RvcmUuc2V0RGlzcGxheVN1cHBvcnQoY29uZi5kaXNwbGF5U3VwcG9ydCk7XG4gICAgICB9XG5cbiAgICAgIGlmIChjb25mLmFwcEluZm8pIHtcbiAgICAgICAgU3RvcmUuc2V0QXBwSW5mbyhjb25mLmFwcEluZm8pOyAvLyBpZiBnb29nbGUgdGFnIG1hbmFnZXIgaXMgcHJlc2VudCBpdCB3aWxsIHB1c2ggdGhlIHVzZXIncyBpbmZvIHRvIGRhdGFMYXllclxuXG4gICAgICAgIHRyeSB7XG4gICAgICAgICAgZGF0YUxheWVyLnB1c2goe1xuICAgICAgICAgICAgJ2FwcCc6IGNvbmYuYXBwSW5mby5uYW1lXG4gICAgICAgICAgfSk7XG4gICAgICAgIH0gY2F0Y2ggKGUpIHsvLyBubyBHb29nbGUgVGFnIGhhcyBiZWVuIHNldFxuICAgICAgICB9XG4gICAgICB9XG4gICAgICAvKiBvcHRpb25hbCBzZXNzaW9uIHVybCAqL1xuXG5cbiAgICAgIGlmIChjb25mLnNlc3Npb25FbmRwb2ludCkge1xuICAgICAgICBTdG9yZS5zZXRTZXNzaW9uRW5kcG9pbnQoY29uZi5zZXNzaW9uRW5kcG9pbnQpO1xuICAgICAgfVxuXG4gICAgICBpZiAoY29uZi5hcGlSb290Rm9sZGVyKSB7XG4gICAgICAgIFN0b3JlLnNldFVybFZlcnNpb25QcmVmaXgoY29uZi5hcGlSb290Rm9sZGVyKTtcbiAgICAgIH1cbiAgICB9XG5cbiAgICBwcGJhQ29uZiA9IGNvbmY7XG4gICAgcmV0dXJuIHRydWU7XG4gIH0sXG4gIHNldHVwR29vZ2xlVGFnOiBmdW5jdGlvbiBzZXR1cEdvb2dsZVRhZyh1c2VyKSB7XG4gICAgLy8gaWYgZ29vZ2xlIHRhZyBtYW5hZ2VyIGlzIHByZXNlbnQgaXQgd2lsbCBwdXNoIHRoZSB1c2VyJ3MgaW5mbyB0byBkYXRhTGF5ZXJcbiAgICB0cnkge1xuICAgICAgZGF0YUxheWVyLnB1c2goe1xuICAgICAgICAndXNlcklkJzogdXNlci5pZCxcbiAgICAgICAgJ3VzZXInOiBcIlwiLmNvbmNhdCh1c2VyLmZpcnN0bmFtZSwgXCIgXCIpLmNvbmNhdCh1c2VyLmxhc3RuYW1lKSxcbiAgICAgICAgJ3RlbmFudF9pZCc6IHVzZXIudGVuYW50X2lkLFxuICAgICAgICAndXNlclR5cGUnOiB1c2VyLnVzZXJfdHlwZSxcbiAgICAgICAgJ2FjY291bnRJZCc6IHVzZXIuYWNjb3VudF9pZCxcbiAgICAgICAgJ2FjY291bnROYW1lJzogdXNlci5hY2NvdW50Lm5hbWVcbiAgICAgIH0pO1xuICAgIH0gY2F0Y2ggKGUpIHsvLyBubyBHb29nbGUgVGFnIGhhcyBiZWVuIHNldFxuICAgIH1cbiAgfSxcbiAgYXV0aGVudGljYXRlOiBmdW5jdGlvbiBhdXRoZW50aWNhdGUoX3N1Y2Nlc3MpIHtcbiAgICB2YXIgc2VsZiA9IFBQQkE7XG4gICAgQ2FsbGVyLm1ha2VDYWxsKHtcbiAgICAgIHR5cGU6ICdHRVQnLFxuICAgICAgZW5kcG9pbnQ6IFN0b3JlLmdldEF1dGhlbnRpY2F0aW9uRW5kcG9pbnQoKSxcbiAgICAgIGNhbGxiYWNrczoge1xuICAgICAgICBzdWNjZXNzOiBmdW5jdGlvbiBzdWNjZXNzKHJlc3VsdCkge1xuICAgICAgICAgIC8vIExvZ2dlci5sb2cocmVzdWx0KTtcbiAgICAgICAgICBTdG9yZS5zZXRVc2VyRGF0YShyZXN1bHQpO1xuICAgICAgICAgIHNlbGYucmVuZGVyKCk7XG4gICAgICAgICAgUFBCQS5nZXRBcHBzKCk7XG4gICAgICAgICAgQUNHLmNoYW5nZUFjY291bnQocmVzdWx0LnVzZXIuYWNjb3VudC5zZmlkKTtcbiAgICAgICAgICBBQ0cuaW5pdGlhbGlzZShyZXN1bHQudXNlci5hY2NvdW50LnNmaWQsIGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgIERvbS5yZW1vdmVDbGFzcyhkb2N1bWVudC5nZXRFbGVtZW50QnlJZCgnYmFjLS0taW52YWxpZC1hY2NvdW50JyksICdpbnZhbGlkJyk7XG4gICAgICAgICAgfSwgZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgRG9tLmFkZENsYXNzKGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKCdiYWMtLS1pbnZhbGlkLWFjY291bnQnKSwgJ2ludmFsaWQnKTtcbiAgICAgICAgICB9KTtcbiAgICAgICAgICBQUEJBLnNldHVwR29vZ2xlVGFnKHJlc3VsdC51c2VyKTtcbiAgICAgICAgICBBbXBsaXR1dGUuaW5pdChyZXN1bHQudXNlcik7XG4gICAgICAgICAgQW1wbGl0dXRlLmxvZ0V2ZW50KCd2aXNpdCcpO1xuXG4gICAgICAgICAgX3N1Y2Nlc3MocmVzdWx0KTtcbiAgICAgICAgfSxcbiAgICAgICAgZmFpbDogZnVuY3Rpb24gZmFpbChlcnIpIHtcbiAgICAgICAgICB3aW5kb3cubG9jYXRpb24uaHJlZiA9IFN0b3JlLmdldExvZ2luVXJsKCk7XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICB9KTtcbiAgfSxcbiAgYXV0aGVudGljYXRlUHJvbWlzZTogZnVuY3Rpb24gYXV0aGVudGljYXRlUHJvbWlzZSgpIHtcbiAgICB2YXIgc2VsZiA9IFBQQkE7XG4gICAgcmV0dXJuIENhbGxlci5wcm9taXNlQ2FsbCh7XG4gICAgICB0eXBlOiAnR0VUJyxcbiAgICAgIGVuZHBvaW50OiBTdG9yZS5nZXRBdXRoZW50aWNhdGlvbkVuZHBvaW50KCksXG4gICAgICBtaWRkbGV3YXJlczoge1xuICAgICAgICBzdWNjZXNzOiBmdW5jdGlvbiBzdWNjZXNzKHJlc3VsdCkge1xuICAgICAgICAgIC8vIExvZ2dlci5sb2cocmVzdWx0KTtcbiAgICAgICAgICBTdG9yZS5zZXRVc2VyRGF0YShyZXN1bHQpO1xuICAgICAgICAgIHNlbGYucmVuZGVyKCk7XG4gICAgICAgICAgUFBCQS5nZXRBcHBzKCk7XG4gICAgICAgICAgQUNHLmNoYW5nZUFjY291bnQocmVzdWx0LnVzZXIuYWNjb3VudC5zZmlkKTtcbiAgICAgICAgICBBQ0cuaW5pdGlhbGlzZShyZXN1bHQudXNlci5hY2NvdW50LnNmaWQsIGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgIERvbS5yZW1vdmVDbGFzcyhkb2N1bWVudC5nZXRFbGVtZW50QnlJZCgnYmFjLS0taW52YWxpZC1hY2NvdW50JyksICdpbnZhbGlkJyk7XG4gICAgICAgICAgfSwgZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgRG9tLmFkZENsYXNzKGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKCdiYWMtLS1pbnZhbGlkLWFjY291bnQnKSwgJ2ludmFsaWQnKTtcbiAgICAgICAgICB9KTtcbiAgICAgICAgICBBbXBsaXR1dGUuaW5pdChyZXN1bHQudXNlcik7XG4gICAgICAgICAgQW1wbGl0dXRlLmxvZ0V2ZW50KCd2aXNpdCcpO1xuICAgICAgICAgIFBQQkEuc2V0dXBHb29nbGVUYWcocmVzdWx0LnVzZXIpO1xuICAgICAgICB9XG4gICAgICB9XG4gICAgfSk7XG4gIH0sXG4gIGdldEFwcHM6IGZ1bmN0aW9uIGdldEFwcHMoKSB7XG4gICAgQ2FsbGVyLm1ha2VDYWxsKHtcbiAgICAgIHR5cGU6ICdHRVQnLFxuICAgICAgZW5kcG9pbnQ6IFN0b3JlLmdldEFwcHNFbmRwb2ludCgpLFxuICAgICAgY2FsbGJhY2tzOiB7XG4gICAgICAgIHN1Y2Nlc3M6IGZ1bmN0aW9uIHN1Y2Nlc3MocmVzdWx0KSB7XG4gICAgICAgICAgU3RvcmUuc2V0QXBwcyhyZXN1bHQpO1xuICAgICAgICAgIFBQQkEucmVuZGVyQXBwcyhyZXN1bHQuYXBwcyk7XG4gICAgICAgIH0sXG4gICAgICAgIGZhaWw6IGZ1bmN0aW9uIGZhaWwoZXJyKSB7XG4gICAgICAgICAgd2luZG93LmxvY2F0aW9uLmhyZWYgPSBTdG9yZS5nZXRMb2dpblVybCgpO1xuICAgICAgICB9XG4gICAgICB9XG4gICAgfSk7XG4gIH0sXG4gIGdldEF2YWlsYWJsZUxpc3RlbmVyczogZnVuY3Rpb24gZ2V0QXZhaWxhYmxlTGlzdGVuZXJzKCkge1xuICAgIHJldHVybiBQdWJTdWIuZ2V0QXZhaWxhYmxlTGlzdGVuZXJzKCk7XG4gIH0sXG4gIHN1YnNjcmliZUxpc3RlbmVyOiBmdW5jdGlvbiBzdWJzY3JpYmVMaXN0ZW5lcihldmVudHQsIGZ1bmN0KSB7XG4gICAgcmV0dXJuIFB1YlN1Yi5zdWJzY3JpYmUoZXZlbnR0LCBmdW5jdCk7XG4gIH0sXG4gIGdldFVzZXJEYXRhOiBmdW5jdGlvbiBnZXRVc2VyRGF0YSgpIHtcbiAgICByZXR1cm4gU3RvcmUuZ2V0VXNlckRhdGEoKTtcbiAgfSxcbiAgc2V0SW5wdXRQbGFjZWhvbGRlcjogZnVuY3Rpb24gc2V0SW5wdXRQbGFjZWhvbGRlcih0eHQpIHsvLyBkb2N1bWVudC5nZXRFbGVtZW50QnlJZChTdG9yZS5nZXRTZWFyY2hJbnB1dElkKCkpLnBsYWNlaG9sZGVyID0gdHh0O1xuICB9LFxuICBjaGFuZ2VBY2NvdW50OiBmdW5jdGlvbiBjaGFuZ2VBY2NvdW50KGFjY291bnRJZCkge1xuICAgIENhbGxlci5tYWtlQ2FsbCh7XG4gICAgICB0eXBlOiAnR0VUJyxcbiAgICAgIGVuZHBvaW50OiBTdG9yZS5nZXRTd2l0Y2hBY2NvdW50RW5kcG9pbnQoYWNjb3VudElkKSxcbiAgICAgIGNhbGxiYWNrczoge1xuICAgICAgICBzdWNjZXNzOiBmdW5jdGlvbiBzdWNjZXNzKHJlc3VsdCkge1xuICAgICAgICAgIEFtcGxpdHV0ZS5sb2dFdmVudCgnYWNjb3VudCBjaGFuZ2UnLCB7fSk7XG4gICAgICAgICAgQUNHLmNoYW5nZUFjY291bnQoYWNjb3VudElkKTtcbiAgICAgICAgICB3aW5kb3cubG9jYXRpb24uaHJlZiA9ICcvYXBwcyc7XG4gICAgICAgIH0sXG4gICAgICAgIGZhaWw6IGZ1bmN0aW9uIGZhaWwoZXJyKSB7XG4gICAgICAgICAgYWxlcnQoJ1NvcnJ5LCBzb21ldGhpbmcgd2VudCB3cm9uZyB3aXRoIHlvdXIgcmVxdWVzdC4gUGxlc2UgdHJ5IGFnYWluJyk7XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICB9KTtcbiAgfSxcbiAgcmVuZGVyQXBwczogZnVuY3Rpb24gcmVuZGVyQXBwcyhhcHBzKSB7XG4gICAgdmFyIGFwcFRlbXBsYXRlID0gZnVuY3Rpb24gYXBwVGVtcGxhdGUoYXBwKSB7XG4gICAgICByZXR1cm4gXCJcXG5cXHRcXHRcXHRcXHQ8YSBjbGFzcz1cXFwiYmFjLS1pbWFnZS1saW5rXFxcIiBocmVmPVxcXCJcIi5jb25jYXQoYXBwLmFwcGxpY2F0aW9uX3VybCwgXCJcXFwiIHN0eWxlPVxcXCJiYWNrZ3JvdW5kOiAjXCIpLmNvbmNhdChhcHAuY29sb3IsIFwiXFxcIj5cXG5cXHRcXHRcXHRcXHRcXHQ8aW1nIHNyYz1cXFwiXCIpLmNvbmNhdChhcHAuaWNvbiwgXCJcXFwiIC8+XFxuXFx0XFx0XFx0XFx0PC9hPlxcblxcdFxcdFxcdFxcdFxcblxcdFxcdFxcdFxcdDxkaXYgY2xhc3M9XFxcImJhYy0tcHVyZXNkay1hcHAtdGV4dC1jb250YWluZXJcXFwiPlxcblxcdFxcdFxcdFxcdFxcdDxhIGhyZWY9XFxcIlwiKS5jb25jYXQoYXBwLmFwcGxpY2F0aW9uX3VybCwgXCJcXFwiIGNsYXNzPVxcXCJiYWMtLWFwcC1uYW1lXFxcIj5cIikuY29uY2F0KGFwcC5uYW1lLCBcIjwvYT5cXG5cXHRcXHRcXHRcXHRcXHQ8YSBocmVmPVxcXCJcIikuY29uY2F0KGFwcC5hcHBsaWNhdGlvbl91cmwsIFwiXFxcIiBjbGFzcz1cXFwiYmFjLS1hcHAtZGVzY3JpcHRpb25cXFwiPlwiKS5jb25jYXQoYXBwLmRlc2NyID09PSBudWxsID8gJy0nIDogYXBwLmRlc2NyLCBcIjwvYT5cXG5cXHRcXHRcXHRcXHQ8L2Rpdj5cXG5cXHRcXHRcXHRcIik7XG4gICAgfTtcblxuICAgIGZvciAodmFyIGkgPSAwOyBpIDwgYXBwcy5sZW5ndGg7IGkrKykge1xuICAgICAgdmFyIGFwcCA9IGFwcHNbaV07XG4gICAgICB2YXIgZGl2ID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudChcImRpdlwiKTtcbiAgICAgIGRpdi5jbGFzc05hbWUgPSBcImJhYy0tYXBwc1wiO1xuICAgICAgZGl2LmlubmVySFRNTCA9IGFwcFRlbXBsYXRlKGFwcCk7IC8vIGNoZWNrIHRvIHNlZSBpZiB0aGUgdXNlciBoYXMgYWNjZXNzIHRvIHRoZSB0d28gbWFpbiBhcHBzIGFuZCByZW1vdmUgZGlzYWJsZWQgY2xhc3NcblxuICAgICAgaWYgKGFwcC5hcHBsaWNhdGlvbl91cmwgPT09ICcvYXBwL2dyb3VwcycpIHtcbiAgICAgICAgRG9tLnJlbW92ZUNsYXNzKGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKCdiYWMtLXB1cmVzZGstZ3JvdXBzLWxpbmstLScpLCAnZGlzYWJsZWQnKTtcbiAgICAgIH0gZWxzZSBpZiAoYXBwLmFwcGxpY2F0aW9uX3VybCA9PT0gJy9hcHAvY2FtcGFpZ25zJykge1xuICAgICAgICBEb20ucmVtb3ZlQ2xhc3MoZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoJ2JhYy0tcHVyZXNkay1jYW1wYWlnbnMtbGluay0tJyksICdkaXNhYmxlZCcpO1xuICAgICAgfVxuXG4gICAgICBkb2N1bWVudC5nZXRFbGVtZW50QnlJZChcImJhYy0tYXBzLWFjdHVhbC1jb250YWluZXJcIikuYXBwZW5kQ2hpbGQoZGl2KTtcbiAgICB9IC8vIGZpbmFsbHkgY2hlY2sgaWYgdGhlIHVzZXIgaXMgb24gYW55IG9mIHRoZSB0d28gbWFpbiBhcHBzXG5cblxuICAgIHZhciBhcHBJbmZvID0gU3RvcmUuZ2V0QXBwSW5mbygpO1xuXG4gICAgaWYgKGFwcEluZm8ucm9vdCA9PT0gXCIvYXBwL2dyb3Vwc1wiKSB7XG4gICAgICBEb20uYWRkQ2xhc3MoZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoJ2JhYy0tcHVyZXNkay1ncm91cHMtbGluay0tJyksICdzZWxlY3RlZCcpO1xuICAgIH0gZWxzZSBpZiAoYXBwSW5mby5yb290ID09PSBcIi9hcHAvY2FtcGFpZ25zXCIpIHtcbiAgICAgIERvbS5hZGRDbGFzcyhkb2N1bWVudC5nZXRFbGVtZW50QnlJZCgnYmFjLS1wdXJlc2RrLWNhbXBhaWducy1saW5rLS0nKSwgJ3NlbGVjdGVkJyk7XG4gICAgfVxuICB9LFxuICByZW5kZXJVc2VyOiBmdW5jdGlvbiByZW5kZXJVc2VyKHVzZXIpIHtcbiAgICB2YXIgdXNlclRlbXBsYXRlID0gZnVuY3Rpb24gdXNlclRlbXBsYXRlKHVzZXIpIHtcbiAgICAgIHJldHVybiBcIlxcblxcdFxcdFxcdFxcdDxkaXYgY2xhc3M9XFxcImJhYy0tdXNlci1pbWFnZVxcXCIgaWQ9XFxcImJhYy0tdXNlci1pbWFnZVxcXCI+XFxuXFx0XFx0XFx0XFx0XFx0PGkgY2xhc3M9XFxcImZhIGZhLWNhbWVyYVxcXCI+PC9pPlxcblxcdFxcdFxcdCAgIFxcdDxkaXYgaWQ9XFxcImJhYy0tdXNlci1pbWFnZS1maWxlXFxcIj48L2Rpdj5cXG5cXHRcXHRcXHQgICBcXHQ8ZGl2IGlkPVxcXCJiYWMtLXVzZXItaW1hZ2UtdXBsb2FkLXByb2dyZXNzXFxcIj5cXG5cXHRcXHRcXHQgICBcXHRcXHQ8c3ZnIHdpZHRoPSc2MHB4JyBoZWlnaHQ9JzYwcHgnIHhtbG5zPVxcXCJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2Z1xcXCIgdmlld0JveD1cXFwiMCAwIDEwMCAxMDBcXFwiIHByZXNlcnZlQXNwZWN0UmF0aW89XFxcInhNaWRZTWlkXFxcIiBjbGFzcz1cXFwidWlsLWRlZmF1bHRcXFwiPjxyZWN0IHg9XFxcIjBcXFwiIHk9XFxcIjBcXFwiIHdpZHRoPVxcXCIxMDBcXFwiIGhlaWdodD1cXFwiMTAwXFxcIiBmaWxsPVxcXCJub25lXFxcIiBjbGFzcz1cXFwiYmtcXFwiPjwvcmVjdD48cmVjdCAgeD0nNDYuNScgeT0nNDAnIHdpZHRoPSc3JyBoZWlnaHQ9JzIwJyByeD0nNScgcnk9JzUnIGZpbGw9JyNmZmZmZmYnIHRyYW5zZm9ybT0ncm90YXRlKDAgNTAgNTApIHRyYW5zbGF0ZSgwIC0zMCknPiAgPGFuaW1hdGUgYXR0cmlidXRlTmFtZT0nb3BhY2l0eScgZnJvbT0nMScgdG89JzAnIGR1cj0nMXMnIGJlZ2luPSctMXMnIHJlcGVhdENvdW50PSdpbmRlZmluaXRlJy8+PC9yZWN0PjxyZWN0ICB4PSc0Ni41JyB5PSc0MCcgd2lkdGg9JzcnIGhlaWdodD0nMjAnIHJ4PSc1JyByeT0nNScgZmlsbD0nI2ZmZmZmZicgdHJhbnNmb3JtPSdyb3RhdGUoMzAgNTAgNTApIHRyYW5zbGF0ZSgwIC0zMCknPiAgPGFuaW1hdGUgYXR0cmlidXRlTmFtZT0nb3BhY2l0eScgZnJvbT0nMScgdG89JzAnIGR1cj0nMXMnIGJlZ2luPSctMC45MTY2NjY2NjY2NjY2NjY2cycgcmVwZWF0Q291bnQ9J2luZGVmaW5pdGUnLz48L3JlY3Q+PHJlY3QgIHg9JzQ2LjUnIHk9JzQwJyB3aWR0aD0nNycgaGVpZ2h0PScyMCcgcng9JzUnIHJ5PSc1JyBmaWxsPScjZmZmZmZmJyB0cmFuc2Zvcm09J3JvdGF0ZSg2MCA1MCA1MCkgdHJhbnNsYXRlKDAgLTMwKSc+ICA8YW5pbWF0ZSBhdHRyaWJ1dGVOYW1lPSdvcGFjaXR5JyBmcm9tPScxJyB0bz0nMCcgZHVyPScxcycgYmVnaW49Jy0wLjgzMzMzMzMzMzMzMzMzMzRzJyByZXBlYXRDb3VudD0naW5kZWZpbml0ZScvPjwvcmVjdD48cmVjdCAgeD0nNDYuNScgeT0nNDAnIHdpZHRoPSc3JyBoZWlnaHQ9JzIwJyByeD0nNScgcnk9JzUnIGZpbGw9JyNmZmZmZmYnIHRyYW5zZm9ybT0ncm90YXRlKDkwIDUwIDUwKSB0cmFuc2xhdGUoMCAtMzApJz4gIDxhbmltYXRlIGF0dHJpYnV0ZU5hbWU9J29wYWNpdHknIGZyb209JzEnIHRvPScwJyBkdXI9JzFzJyBiZWdpbj0nLTAuNzVzJyByZXBlYXRDb3VudD0naW5kZWZpbml0ZScvPjwvcmVjdD48cmVjdCAgeD0nNDYuNScgeT0nNDAnIHdpZHRoPSc3JyBoZWlnaHQ9JzIwJyByeD0nNScgcnk9JzUnIGZpbGw9JyNmZmZmZmYnIHRyYW5zZm9ybT0ncm90YXRlKDEyMCA1MCA1MCkgdHJhbnNsYXRlKDAgLTMwKSc+ICA8YW5pbWF0ZSBhdHRyaWJ1dGVOYW1lPSdvcGFjaXR5JyBmcm9tPScxJyB0bz0nMCcgZHVyPScxcycgYmVnaW49Jy0wLjY2NjY2NjY2NjY2NjY2NjZzJyByZXBlYXRDb3VudD0naW5kZWZpbml0ZScvPjwvcmVjdD48cmVjdCAgeD0nNDYuNScgeT0nNDAnIHdpZHRoPSc3JyBoZWlnaHQ9JzIwJyByeD0nNScgcnk9JzUnIGZpbGw9JyNmZmZmZmYnIHRyYW5zZm9ybT0ncm90YXRlKDE1MCA1MCA1MCkgdHJhbnNsYXRlKDAgLTMwKSc+ICA8YW5pbWF0ZSBhdHRyaWJ1dGVOYW1lPSdvcGFjaXR5JyBmcm9tPScxJyB0bz0nMCcgZHVyPScxcycgYmVnaW49Jy0wLjU4MzMzMzMzMzMzMzMzMzRzJyByZXBlYXRDb3VudD0naW5kZWZpbml0ZScvPjwvcmVjdD48cmVjdCAgeD0nNDYuNScgeT0nNDAnIHdpZHRoPSc3JyBoZWlnaHQ9JzIwJyByeD0nNScgcnk9JzUnIGZpbGw9JyNmZmZmZmYnIHRyYW5zZm9ybT0ncm90YXRlKDE4MCA1MCA1MCkgdHJhbnNsYXRlKDAgLTMwKSc+ICA8YW5pbWF0ZSBhdHRyaWJ1dGVOYW1lPSdvcGFjaXR5JyBmcm9tPScxJyB0bz0nMCcgZHVyPScxcycgYmVnaW49Jy0wLjVzJyByZXBlYXRDb3VudD0naW5kZWZpbml0ZScvPjwvcmVjdD48cmVjdCAgeD0nNDYuNScgeT0nNDAnIHdpZHRoPSc3JyBoZWlnaHQ9JzIwJyByeD0nNScgcnk9JzUnIGZpbGw9JyNmZmZmZmYnIHRyYW5zZm9ybT0ncm90YXRlKDIxMCA1MCA1MCkgdHJhbnNsYXRlKDAgLTMwKSc+ICA8YW5pbWF0ZSBhdHRyaWJ1dGVOYW1lPSdvcGFjaXR5JyBmcm9tPScxJyB0bz0nMCcgZHVyPScxcycgYmVnaW49Jy0wLjQxNjY2NjY2NjY2NjY2NjdzJyByZXBlYXRDb3VudD0naW5kZWZpbml0ZScvPjwvcmVjdD48cmVjdCAgeD0nNDYuNScgeT0nNDAnIHdpZHRoPSc3JyBoZWlnaHQ9JzIwJyByeD0nNScgcnk9JzUnIGZpbGw9JyNmZmZmZmYnIHRyYW5zZm9ybT0ncm90YXRlKDI0MCA1MCA1MCkgdHJhbnNsYXRlKDAgLTMwKSc+ICA8YW5pbWF0ZSBhdHRyaWJ1dGVOYW1lPSdvcGFjaXR5JyBmcm9tPScxJyB0bz0nMCcgZHVyPScxcycgYmVnaW49Jy0wLjMzMzMzMzMzMzMzMzMzMzNzJyByZXBlYXRDb3VudD0naW5kZWZpbml0ZScvPjwvcmVjdD48cmVjdCAgeD0nNDYuNScgeT0nNDAnIHdpZHRoPSc3JyBoZWlnaHQ9JzIwJyByeD0nNScgcnk9JzUnIGZpbGw9JyNmZmZmZmYnIHRyYW5zZm9ybT0ncm90YXRlKDI3MCA1MCA1MCkgdHJhbnNsYXRlKDAgLTMwKSc+ICA8YW5pbWF0ZSBhdHRyaWJ1dGVOYW1lPSdvcGFjaXR5JyBmcm9tPScxJyB0bz0nMCcgZHVyPScxcycgYmVnaW49Jy0wLjI1cycgcmVwZWF0Q291bnQ9J2luZGVmaW5pdGUnLz48L3JlY3Q+PHJlY3QgIHg9JzQ2LjUnIHk9JzQwJyB3aWR0aD0nNycgaGVpZ2h0PScyMCcgcng9JzUnIHJ5PSc1JyBmaWxsPScjZmZmZmZmJyB0cmFuc2Zvcm09J3JvdGF0ZSgzMDAgNTAgNTApIHRyYW5zbGF0ZSgwIC0zMCknPiAgPGFuaW1hdGUgYXR0cmlidXRlTmFtZT0nb3BhY2l0eScgZnJvbT0nMScgdG89JzAnIGR1cj0nMXMnIGJlZ2luPSctMC4xNjY2NjY2NjY2NjY2NjY2NnMnIHJlcGVhdENvdW50PSdpbmRlZmluaXRlJy8+PC9yZWN0PjxyZWN0ICB4PSc0Ni41JyB5PSc0MCcgd2lkdGg9JzcnIGhlaWdodD0nMjAnIHJ4PSc1JyByeT0nNScgZmlsbD0nI2ZmZmZmZicgdHJhbnNmb3JtPSdyb3RhdGUoMzMwIDUwIDUwKSB0cmFuc2xhdGUoMCAtMzApJz4gIDxhbmltYXRlIGF0dHJpYnV0ZU5hbWU9J29wYWNpdHknIGZyb209JzEnIHRvPScwJyBkdXI9JzFzJyBiZWdpbj0nLTAuMDgzMzMzMzMzMzMzMzMzMzNzJyByZXBlYXRDb3VudD0naW5kZWZpbml0ZScvPjwvcmVjdD48L3N2Zz5cXG5cXHRcXHRcXHRcXHRcXHQ8L2Rpdj5cXG5cXHRcXHRcXHQgICA8L2Rpdj5cXG5cXHRcXHRcXHRcXHQ8ZGl2IGNsYXNzPVxcXCJiYWMtLXVzZXItbmFtZVxcXCI+XCIuY29uY2F0KHVzZXIuZmlyc3RuYW1lLCBcIiBcIikuY29uY2F0KHVzZXIubGFzdG5hbWUsIFwiPC9kaXY+XFxuXFx0XFx0XFx0XFx0PGRpdiBjbGFzcz1cXFwiYmFjLS11c2VyLWVtYWlsXFxcIj5cIikuY29uY2F0KHVzZXIuZW1haWwsIFwiPC9kaXY+XFxuXFx0XFx0XFx0XCIpO1xuICAgIH07XG5cbiAgICB2YXIgZGl2ID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudCgnZGl2Jyk7XG4gICAgZGl2LmNsYXNzTmFtZSA9IFwiYmFjLS11c2VyLXNpZGViYXItaW5mb1wiO1xuICAgIGRpdi5pbm5lckhUTUwgPSB1c2VyVGVtcGxhdGUodXNlcik7XG4gICAgZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoJ2JhYy0tcHVyZXNkay11c2VyLWRldGFpbHMtLScpLnByZXBlbmQoZGl2KTtcbiAgICBkb2N1bWVudC5nZXRFbGVtZW50QnlJZCgnYmFjLS1wdXJlc2RrLXVzZXItYXZhdGFyLS0nKS5pbm5lckhUTUwgPSB1c2VyLmZpcnN0bmFtZS5jaGFyQXQoMCkgKyB1c2VyLmxhc3RuYW1lLmNoYXJBdCgwKTtcbiAgfSxcbiAgcmVuZGVyQWNjb3VudHM6IGZ1bmN0aW9uIHJlbmRlckFjY291bnRzKGFjY291bnRzLCBjdXJyZW50QWNjb3VudCkge1xuICAgIC8vIExvZ2dlci5sb2coY3VycmVudEFjY291bnQpO1xuICAgIHZhciBhY2NvdW50c1RlbXBsYXRlID0gZnVuY3Rpb24gYWNjb3VudHNUZW1wbGF0ZShhY2NvdW50LCBpc1RoZVNlbGVjdGVkKSB7XG4gICAgICByZXR1cm4gXCJcXG5cXHRcXHRcXHRcXHQ8ZGl2IGNsYXNzPVxcXCJiYWMtLXVzZXItbGlzdC1pdGVtLWltYWdlXFxcIj5cXG5cXHRcXHRcXHRcXHRcXHQ8aW1nIHNyYz1cXFwiXCIuY29uY2F0KGFjY291bnQuc2RrX3NxdWFyZV9sb2dvX2ljb24sIFwiXFxcIiBhbHQ9XFxcIlxcXCI+XFxuXFx0XFx0XFx0XFx0PC9kaXY+XFxuXFx0XFx0XFx0XFx0PGRpdiBjbGFzcz1cXFwiYmFjLXVzZXItYXBwLWRldGFpbHNcXFwiPlxcblxcdFxcdFxcdFxcdFxcdCA8c3Bhbj5cIikuY29uY2F0KGFjY291bnQubmFtZSwgXCI8L3NwYW4+XFxuXFx0XFx0XFx0XFx0PC9kaXY+XFxuXFx0XFx0XFx0XFx0XCIpLmNvbmNhdChpc1RoZVNlbGVjdGVkID8gJzxkaXYgaWQ9XCJiYWMtLXNlbGVjdGVkLWFjb3VudC1pbmRpY2F0b3JcIiBjbGFzcz1cImJhYy0tc2VsZWN0ZWQtYWNvdW50LWluZGljYXRvclwiPjwvZGl2PicgOiAnJywgXCJcXG5cXHRcXHRcXHRcIik7XG4gICAgfTtcblxuICAgIHZhciBfbG9vcCA9IGZ1bmN0aW9uIF9sb29wKGkpIHtcbiAgICAgIHZhciBhY2NvdW50ID0gYWNjb3VudHNbaV07XG4gICAgICB2YXIgZGl2ID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudCgnZGl2Jyk7XG4gICAgICBkaXYuY2xhc3NOYW1lID0gJ2JhYy0tdXNlci1saXN0LWl0ZW0nO1xuICAgICAgZGl2LmlubmVySFRNTCA9IGFjY291bnRzVGVtcGxhdGUoYWNjb3VudCwgYWNjb3VudC5zZmlkID09PSBjdXJyZW50QWNjb3VudC5zZmlkKTtcblxuICAgICAgaWYgKGFjY291bnQuc2ZpZCA9PT0gY3VycmVudEFjY291bnQuc2ZpZCkge1xuICAgICAgICBkaXYuc3R5bGUuYmFja2dyb3VuZCA9IGhleFRvUmdiKCcjRkZGRkZGJywgMC44NSk7XG4gICAgICB9XG5cbiAgICAgIGRpdi5vbmNsaWNrID0gZnVuY3Rpb24gKGUpIHtcbiAgICAgICAgZS5wcmV2ZW50RGVmYXVsdCgpO1xuICAgICAgICBQUEJBLmNoYW5nZUFjY291bnQoYWNjb3VudC5zZmlkKTtcbiAgICAgIH07XG5cbiAgICAgIGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKCdiYWMtLXB1cmVzZGstdXNlci1idXNpbmVzc2VzLS0nKS5hcHBlbmRDaGlsZChkaXYpO1xuICAgIH07XG5cbiAgICBmb3IgKHZhciBpID0gMDsgaSA8IGFjY291bnRzLmxlbmd0aDsgaSsrKSB7XG4gICAgICBfbG9vcChpKTtcbiAgICB9XG4gIH0sXG4gIHJlbmRlckluZm9CbG9ja3M6IGZ1bmN0aW9uIHJlbmRlckluZm9CbG9ja3MoKSB7XG4gICAgSW5mb0NvbnRyb2xsZXIucmVuZGVySW5mb0Jsb2NrcygpO1xuICB9LFxuICByZW5kZXJWZXJzaW9uTnVtYmVyOiBmdW5jdGlvbiByZW5kZXJWZXJzaW9uTnVtYmVyKHZlcnNpb24pIHtcbiAgICBkb2N1bWVudC5nZXRFbGVtZW50QnlJZCgncHVyZXNkay12ZXJzaW9uLW51bWJlcicpLmlubmVySFRNTCA9IHZlcnNpb247XG4gIH0sXG4gIHJlbmRlclplbmRlc2s6IGZ1bmN0aW9uIHJlbmRlclplbmRlc2soKSB7XG4gICAgaWYgKFN0b3JlLmdldERpc3BsYXlTdXBwb3J0KCkpIHtcbiAgICAgIHZhciB6ZHNjcmlwdCA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoJ3NjcmlwdCcpO1xuICAgICAgemRzY3JpcHQuc3JjID0gXCJodHRwczovL3N0YXRpYy56ZGFzc2V0cy5jb20vZWtyL3NuaXBwZXQuanM/a2V5PTk4NjhjNzFkLTY3OTMtNDJhYS1iMmZhLTEyNDE5YzdiZDQ5OFwiO1xuICAgICAgemRzY3JpcHQuaWQgPSBcInplLXNuaXBwZXRcIjtcbiAgICAgIHpkc2NyaXB0LmFzeW5jID0gdHJ1ZTtcbiAgICAgIHpkc2NyaXB0LnR5cGUgPSAndGV4dC9qYXZhc2NyaXB0JztcbiAgICAgIGRvY3VtZW50LmdldEVsZW1lbnRzQnlUYWdOYW1lKCdoZWFkJylbMF0uYXBwZW5kQ2hpbGQoemRzY3JpcHQpO1xuICAgIH1cbiAgfSxcbiAgc3R5bGVBY2NvdW50OiBmdW5jdGlvbiBzdHlsZUFjY291bnQoYWNjb3VudCkge1xuICAgIHZhciBhcHBJbmZvID0gU3RvcmUuZ2V0QXBwSW5mbygpO1xuICAgIHZhciBsb2dvID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudCgnaW1nJyk7XG4gICAgbG9nby5zcmMgPSBhY2NvdW50LnNka19sb2dvX2ljb247XG4gICAgZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoJ2JhYy0tcHVyZXNkay1hY2NvdW50LWxvZ28tLScpLnByZXBlbmQobG9nbyk7XG5cbiAgICBkb2N1bWVudC5nZXRFbGVtZW50QnlJZCgnYmFjLS1wdXJlc2RrLWFjY291bnQtbG9nby0tJykub25jbGljayA9IGZ1bmN0aW9uIChlKSB7XG4gICAgICB3aW5kb3cubG9jYXRpb24uaHJlZiA9IFN0b3JlLmdldFJvb3RVcmwoKTtcbiAgICB9O1xuXG4gICAgZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoXCJhcHAtbmFtZS1saW5rLXRvLXJvb3RcIikuaHJlZiA9IFN0b3JlLmdldFJvb3RVcmwoKTtcbiAgICB2YXIgcmdiQmcgPSBoZXhUb1JnYihhY2NvdW50LnNka19iYWNrZ3JvdW5kX2NvbG9yLCAwLjE1KTtcbiAgICBkb2N1bWVudC5nZXRFbGVtZW50QnlJZCgnYmFjLS1wdXJlc2RrLWJhYy0taGVhZGVyLWFwcHMtLScpLnN0eWxlLmNzc1RleHQgPSBcImJhY2tncm91bmQ6ICNcIiArIGFjY291bnQuc2RrX2JhY2tncm91bmRfY29sb3I7XG4gICAgZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoJ2JhYy0tdXNlci1zaWRlYmFyLXdoaXRlLWJnJykuc3R5bGUuY3NzVGV4dCA9IFwiYmFja2dyb3VuZC1jb2xvcjogXCIgKyByZ2JCZzsgLy8gaWYoZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoJ2JhYy0tcHVyZXNkay1hcHBzLW5hbWUtLScpKXtcbiAgICAvLyBcdGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKCdiYWMtLXB1cmVzZGstYXBwcy1uYW1lLS0nKS5zdHlsZS5jc3NUZXh0ID0gXCJjb2xvcjogI1wiICsgYWNjb3VudC5zZGtfZm9udF9jb2xvcjtcbiAgICAvLyB9XG4gICAgLy8gaWYoZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoJ2JhYy0tc2VsZWN0ZWQtYWNvdW50LWluZGljYXRvcicpKXtcbiAgICAvLyBcdGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKCdiYWMtLXNlbGVjdGVkLWFjb3VudC1pbmRpY2F0b3InKS5zdHlsZS5jc3NUZXh0ID0gXCJiYWNrZ3JvdW5kOiAjXCIgKyBhY2NvdW50LnNka19mb250X2NvbG9yO1xuICAgIC8vIH1cbiAgfSxcbiAgZ29Ub0xvZ2luUGFnZTogZnVuY3Rpb24gZ29Ub0xvZ2luUGFnZSgpIHtcbiAgICB3aW5kb3cubG9jYXRpb24uaHJlZiA9IFN0b3JlLmdldExvZ2luVXJsKCk7XG4gIH0sXG5cbiAgLyogTE9BREVSICovXG4gIHNob3dMb2FkZXI6IGZ1bmN0aW9uIHNob3dMb2FkZXIoKSB7XG4gICAgRG9tLmFkZENsYXNzKGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKCdiYWMtLXB1cmVzZGstLWxvYWRlci0tJyksICdiYWMtLXB1cmVzZGstdmlzaWJsZScpO1xuICB9LFxuICBoaWRlTG9hZGVyOiBmdW5jdGlvbiBoaWRlTG9hZGVyKCkge1xuICAgIERvbS5yZW1vdmVDbGFzcyhkb2N1bWVudC5nZXRFbGVtZW50QnlJZCgnYmFjLS1wdXJlc2RrLS1sb2FkZXItLScpLCAnYmFjLS1wdXJlc2RrLXZpc2libGUnKTtcbiAgfSxcbiAgb3BlbkNsb3VkaW5hcnlQaWNrZXI6IGZ1bmN0aW9uIG9wZW5DbG91ZGluYXJ5UGlja2VyKG9wdGlvbnMpIHtcbiAgICBDbG91ZGluYXJ5Lm9wZW5Nb2RhbChvcHRpb25zKTtcbiAgfSxcblxuICAvKlxuICAgdHlwZTogb25lIG9mOlxuICAgLSBzdWNjZXNzXG4gICAtIGluZm9cbiAgIC0gd2FybmluZ1xuICAgLSBlcnJvclxuICAgdGV4dDogdGhlIHRleHQgdG8gZGlzcGxheVxuICAgb3B0aW9ucyAob3B0aW9uYWwpOiB7XG4gICBcdFx0aGlkZUluOiBtaWxsaXNlY29uZHMgdG8gaGlkZSBpdC4gLTEgZm9yIG5vdCBoaWRpbmcgaXQgYXQgYWxsLiBEZWZhdWx0IGlzIDUwMDBcbiAgIH1cbiAgICovXG4gIHNldEluZm86IGZ1bmN0aW9uIHNldEluZm8odHlwZSwgdGV4dCwgb3B0aW9ucykge1xuICAgIEluZm9Db250cm9sbGVyLnNob3dJbmZvKHR5cGUsIHRleHQsIG9wdGlvbnMpO1xuICB9LFxuICBzZXRUaXRsZUFuZEZhdmljb246IGZ1bmN0aW9uIHNldFRpdGxlQW5kRmF2aWNvbigpIHtcbiAgICB2YXIgZmF2bGluayA9IGRvY3VtZW50LnF1ZXJ5U2VsZWN0b3IoXCJsaW5rW3JlbCo9J2ljb24nXVwiKSB8fCBkb2N1bWVudC5jcmVhdGVFbGVtZW50KCdsaW5rJyk7XG4gICAgZmF2bGluay5ocmVmID0gJ2h0dHBzOi8vY2xvdWRjZG4ucHVyZXByb2ZpbGUuY29tL2ltYWdlL3VwbG9hZC92MS9fX2Fzc2V0c19tYXN0ZXJfXy9iMWEwYzMxNmFkN2Y0YTY3OWMyZWVlNjE1ODE0NDY2Yyc7XG4gICAgZmF2bGluay5yZWwgPSAnc2hvcnRjdXQgaWNvbic7XG4gICAgZG9jdW1lbnQuZ2V0RWxlbWVudHNCeVRhZ05hbWUoJ2hlYWQnKVswXS5hcHBlbmRDaGlsZChmYXZsaW5rKTtcbiAgICB2YXIgYXBwSW5mbyA9IFN0b3JlLmdldEFwcEluZm8oKTtcblxuICAgIGlmIChhcHBJbmZvICE9PSBudWxsKSB7XG4gICAgICBkb2N1bWVudC50aXRsZSA9IFwiUHVyZXByb2ZpbGUgQWNjZXNzIHwgXCIuY29uY2F0KGFwcEluZm8ubmFtZSk7XG4gICAgfSBlbHNlIHtcbiAgICAgIGRvY3VtZW50LnRpdGxlID0gXCJQdXJlcHJvZmlsZSBBY2Nlc3NcIjtcbiAgICB9XG4gIH0sXG4gIHJlbmRlcjogZnVuY3Rpb24gcmVuZGVyKCkge1xuICAgIHZhciB3aGVyZVRvID0gZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoU3RvcmUuZ2V0SFRMTUNvbnRhaW5lcigpKTtcblxuICAgIGlmICh3aGVyZVRvID09PSBudWxsKSB7XG4gICAgICBMb2dnZXIuZXJyb3IoJ3RoZSBjb250YWluZXIgd2l0aCBpZCBcIicgKyB3aGVyZVRvICsgJ1wiIGhhcyBub3QgYmVlbiBmb3VuZCBvbiB0aGUgZG9jdW1lbnQuIFRoZSBsaWJyYXJ5IGlzIGdvaW5nIHRvIGNyZWF0ZSBpdC4nKTtcbiAgICAgIHZhciBkaXYgPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KCdkaXYnKTtcbiAgICAgIGRpdi5pZCA9IFN0b3JlLmdldEhUTE1Db250YWluZXIoKTtcbiAgICAgIGRpdi5zdHlsZS53aWR0aCA9ICcxMDAlJztcbiAgICAgIGRpdi5zdHlsZS5oZWlnaHQgPSBcIjUwcHhcIjtcbiAgICAgIGRpdi5zdHlsZS5wb3NpdGlvbiA9IFwiZml4ZWRcIjtcbiAgICAgIGRpdi5zdHlsZS50b3AgPSBcIjBweFwiO1xuICAgICAgZGl2LnN0eWxlLnpJbmRleCA9IFwiMjE0NzQ4MzY0N1wiO1xuICAgICAgZG9jdW1lbnQuYm9keS5pbnNlcnRCZWZvcmUoZGl2LCBkb2N1bWVudC5ib2R5LmZpcnN0Q2hpbGQpO1xuICAgICAgd2hlcmVUbyA9IGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKFN0b3JlLmdldEhUTE1Db250YWluZXIoKSk7XG4gICAgfVxuXG4gICAgd2hlcmVUby5pbm5lckhUTUwgPSBTdG9yZS5nZXRIVE1MKCk7XG4gICAgUFBCQS5yZW5kZXJVc2VyKFN0b3JlLmdldFVzZXJEYXRhKCkudXNlcik7XG4gICAgUFBCQS5yZW5kZXJJbmZvQmxvY2tzKCk7XG4gICAgUFBCQS5yZW5kZXJBY2NvdW50cyhTdG9yZS5nZXRVc2VyRGF0YSgpLnVzZXIuYWNjb3VudHMsIFN0b3JlLmdldFVzZXJEYXRhKCkudXNlci5hY2NvdW50KTtcbiAgICBQUEJBLnJlbmRlclplbmRlc2soKTtcbiAgICBQUEJBLnN0eWxlQWNjb3VudChTdG9yZS5nZXRVc2VyRGF0YSgpLnVzZXIuYWNjb3VudCk7XG4gICAgUFBCQS5zZXRUaXRsZUFuZEZhdmljb24oKTtcbiAgICBQUEJBLnJlbmRlclZlcnNpb25OdW1iZXIoU3RvcmUuZ2V0VmVyc2lvbk51bWJlcigpKTtcblxuICAgIGlmIChTdG9yZS5nZXRBcHBzVmlzaWJsZSgpID09PSBmYWxzZSkge1xuICAgICAgZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoJ2JhYy0tcHVyZXNkay1hcHBzLXNlY3Rpb24tLScpLnN0eWxlLmNzc1RleHQgPSBcImRpc3BsYXk6bm9uZVwiO1xuICAgIH1cblxuICAgIGFmdGVyUmVuZGVyKCk7XG4gIH1cbn07XG5tb2R1bGUuZXhwb3J0cyA9IFBQQkE7IiwiXCJ1c2Ugc3RyaWN0XCI7XG5cbi8qIVxuICogUHVyZVByb2ZpbGUgUHVyZVByb2ZpbGUgQnVzaW5lc3MgQXBwcyBEZXZlbG9wbWVudCBTREtcbiAqXG4gKiB2ZXJzaW9uOiAyLjkuNy1yYy40XG4gKiBkYXRlOiAyMDIwLTA1LTA2XG4gKlxuICogQ29weXJpZ2h0IDIwMTcsIFB1cmVQcm9maWxlXG4gKiBSZWxlYXNlZCB1bmRlciBNSVQgbGljZW5zZVxuICogaHR0cHM6Ly9vcGVuc291cmNlLm9yZy9saWNlbnNlcy9NSVRcbiAqL1xudmFyIHBwYmEgPSByZXF1aXJlKCcuL1BQQkEnKTtcblxucHBiYS5zZXRXaW5kb3dOYW1lKCdQVVJFU0RLJyk7XG5wcGJhLnNldENvbmZpZ3VyYXRpb24oe1xuICBcImxvZ3NcIjogZmFsc2UsXG4gIFwicm9vdFVybFwiOiBcIi9cIixcbiAgXCJiYXNlVXJsXCI6IFwiYXBpL3YxL1wiLFxuICBcImxvZ2luVXJsXCI6IFwic2lnbmluXCIsXG4gIFwic2VhcmNoSW5wdXRJZFwiOiBcIi0tcHVyZXNkay0tc2VhcmNoLS1pbnB1dC0tXCIsXG4gIFwicmVkaXJlY3RVcmxQYXJhbVwiOiBcInJlZGlyZWN0X3VybFwiXG59KTtcbnBwYmEuc2V0SFRNTFRlbXBsYXRlKFwiPGhlYWRlciBjbGFzcz1cXFwiYmFjLS1oZWFkZXItYXBwc1xcXCIgaWQ9XFxcImJhYy0tcHVyZXNkay1iYWMtLWhlYWRlci1hcHBzLS1cXFwiPlxcbiAgICA8ZGl2IGNsYXNzPVxcXCJiYWMtLWNvbnRhaW5lclxcXCI+XFxuICAgICAgICA8ZGl2IGNsYXNzPVxcXCJiYWMtLWxvZ29cXFwiIGlkPVxcXCJiYWMtLXB1cmVzZGstYWNjb3VudC1sb2dvLS1cXFwiPlxcbiAgICAgICAgICAgIDxkaXYgY2xhc3M9XFxcImJhYy0tcHVyZXNkay1hcHAtbmFtZS0tXFxcIj5cXG4gICAgICAgICAgICAgICAgPHN2ZyB3aWR0aD1cXFwiOHB4XFxcIiBoZWlnaHQ9XFxcIjEycHhcXFwiIHZpZXdCb3g9XFxcIjAgMCA4IDEyXFxcIiB2ZXJzaW9uPVxcXCIxLjFcXFwiIHhtbG5zPVxcXCJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2Z1xcXCIgeG1sbnM6eGxpbms9XFxcImh0dHA6Ly93d3cudzMub3JnLzE5OTkveGxpbmtcXFwiPlxcbiAgICAgICAgICAgICAgICAgICAgPGcgaWQ9XFxcIlBQLUJBLVBvcnRhbC1Ib21lX0Rlc2t0b3AtdjJcXFwiIHN0cm9rZT1cXFwibm9uZVxcXCIgc3Ryb2tlLXdpZHRoPVxcXCIxXFxcIiBmaWxsPVxcXCJub25lXFxcIiBmaWxsLXJ1bGU9XFxcImV2ZW5vZGRcXFwiPlxcbiAgICAgICAgICAgICAgICAgICAgICAgIDxnIGlkPVxcXCJQUENNLUxpc3RpbmdfQ29ubmV4aW9uXzAxX01heF9EXFxcIiB0cmFuc2Zvcm09XFxcInRyYW5zbGF0ZSgtMTgxLjAwMDAwMCwgLTc4LjAwMDAwMClcXFwiIGZpbGw9XFxcIiMzMzMzMzNcXFwiIGZpbGwtcnVsZT1cXFwibm9uemVyb1xcXCI+XFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIDxnIGlkPVxcXCJlbGVtZW50cy0vLXNkay0vLWJ1dHRvbi1jb3B5LTMtZWxlbWVudHMtLy1zZGstLy1idXR0b25cXFwiIHRyYW5zZm9ybT1cXFwidHJhbnNsYXRlKDE2NC4wMDAwMDAsIDcwLjAwMDAwMClcXFwiPlxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgPGcgaWQ9XFxcImljb25zL2FwcHMvY2FtcGFpZ25zLWljb25zLS8tYXBwcy0vLTQweDQwLS8tYmFjay1hcnJvd1xcXCIgdHJhbnNmb3JtPVxcXCJ0cmFuc2xhdGUoMTEuMDAwMDAwLCA0LjAwMDAwMClcXFwiPlxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIDxnIGlkPVxcXCJkb3dubG9hZC1hcnJvd1xcXCIgdHJhbnNmb3JtPVxcXCJ0cmFuc2xhdGUoNi41MDAwMDAsIDQuMDAwMDAwKVxcXCI+XFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIDxwYXRoIGQ9XFxcIk0tMC44ODI3NDA5NDQsMi43Nzk1Nzk4OSBDLTEuMjUyNzExMzMsMi40MDY4MDY3IC0xLjg1MjU1MTgzLDIuNDA2ODA2NyAtMi4yMjI1MjIyMSwyLjc3OTU3OTg5IEMtMi41OTI0OTI2LDMuMTUyMzUzMDggLTIuNTkyNDkyNiwzLjc1NjczNzgzIC0yLjIyMjUyMjIxLDQuMTI5NTExMDIgTDIuODMwMTA5MzcsOS4yMjA0MjAxMSBDMy4yMDAwNzk3NSw5LjU5MzE5MzMgMy43OTk5MjAyNSw5LjU5MzE5MzMgNC4xNjk4OTA2Myw5LjIyMDQyMDExIEw5LjIyMjUyMjIxLDQuMTI5NTExMDIgQzkuNTkyNDkyNiwzLjc1NjczNzgzIDkuNTkyNDkyNiwzLjE1MjM1MzA4IDkuMjIyNTIyMjEsMi43Nzk1Nzk4OSBDOC44NTI1NTE4MywyLjQwNjgwNjcgOC4yNTI3MTEzMywyLjQwNjgwNjcgNy44ODI3NDA5NCwyLjc3OTU3OTg5IEwzLjUsNy4xOTU1MjM0MiBMLTAuODgyNzQwOTQ0LDIuNzc5NTc5ODkgWlxcXCIgaWQ9XFxcIlBhdGhcXFwiIHRyYW5zZm9ybT1cXFwidHJhbnNsYXRlKDMuNTAwMDAwLCA2LjAwMDAwMCkgcm90YXRlKC0yNzAuMDAwMDAwKSB0cmFuc2xhdGUoLTMuNTAwMDAwLCAtNi4wMDAwMDApIFxcXCI+PC9wYXRoPlxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIDwvZz5cXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIDwvZz5cXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgPC9nPlxcbiAgICAgICAgICAgICAgICAgICAgICAgIDwvZz5cXG4gICAgICAgICAgICAgICAgICAgIDwvZz5cXG4gICAgICAgICAgICAgICAgPC9zdmc+XFxuICAgICAgICAgICAgICAgIDxhIGhyZWY9XFxcIiNcXFwiIGlkPVxcXCJhcHAtbmFtZS1saW5rLXRvLXJvb3RcXFwiPkFwcCBQb3J0YWw8L2E+XFxuICAgICAgICAgICAgPC9kaXY+XFxuICAgICAgICA8L2Rpdj5cXG4gICAgICAgIDxkaXYgY2xhc3M9XFxcImJhYy0tdXNlci1hY3Rpb25zXFxcIj5cXG4gICAgICAgICAgICA8c3ZnIGlkPVxcXCJiYWMtLXB1cmVzZGstLWxvYWRlci0tXFxcIiB3aWR0aD1cXFwiMzhcXFwiIGhlaWdodD1cXFwiMzhcXFwiIHZpZXdCb3g9XFxcIjAgMCA0NCA0NFxcXCIgeG1sbnM9XFxcImh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnXFxcIiBzdHJva2U9XFxcIiNmZmZcXFwiIHN0eWxlPVxcXCJcXG4gICAgbWFyZ2luLXJpZ2h0OiAxMHB4O1xcblxcXCI+XFxuICAgICAgICAgICAgICAgIDxnIGZpbGw9XFxcIm5vbmVcXFwiIGZpbGwtcnVsZT1cXFwiZXZlbm9kZFxcXCIgc3Ryb2tlLXdpZHRoPVxcXCIyXFxcIj5cXG4gICAgICAgICAgICAgICAgICAgIDxjaXJjbGUgY3g9XFxcIjIyXFxcIiBjeT1cXFwiMjJcXFwiIHI9XFxcIjE2LjY0MzdcXFwiPlxcbiAgICAgICAgICAgICAgICAgICAgICAgIDxhbmltYXRlIGF0dHJpYnV0ZU5hbWU9XFxcInJcXFwiIGJlZ2luPVxcXCIwc1xcXCIgZHVyPVxcXCIxLjhzXFxcIiB2YWx1ZXM9XFxcIjE7IDIwXFxcIiBjYWxjTW9kZT1cXFwic3BsaW5lXFxcIiBrZXlUaW1lcz1cXFwiMDsgMVxcXCIga2V5U3BsaW5lcz1cXFwiMC4xNjUsIDAuODQsIDAuNDQsIDFcXFwiIHJlcGVhdENvdW50PVxcXCJpbmRlZmluaXRlXFxcIj48L2FuaW1hdGU+XFxuICAgICAgICAgICAgICAgICAgICAgICAgPGFuaW1hdGUgYXR0cmlidXRlTmFtZT1cXFwic3Ryb2tlLW9wYWNpdHlcXFwiIGJlZ2luPVxcXCIwc1xcXCIgZHVyPVxcXCIxLjhzXFxcIiB2YWx1ZXM9XFxcIjE7IDBcXFwiIGNhbGNNb2RlPVxcXCJzcGxpbmVcXFwiIGtleVRpbWVzPVxcXCIwOyAxXFxcIiBrZXlTcGxpbmVzPVxcXCIwLjMsIDAuNjEsIDAuMzU1LCAxXFxcIiByZXBlYXRDb3VudD1cXFwiaW5kZWZpbml0ZVxcXCI+PC9hbmltYXRlPlxcbiAgICAgICAgICAgICAgICAgICAgPC9jaXJjbGU+XFxuICAgICAgICAgICAgICAgICAgICA8Y2lyY2xlIGN4PVxcXCIyMlxcXCIgY3k9XFxcIjIyXFxcIiByPVxcXCIxOS45MjgyXFxcIj5cXG4gICAgICAgICAgICAgICAgICAgICAgICA8YW5pbWF0ZSBhdHRyaWJ1dGVOYW1lPVxcXCJyXFxcIiBiZWdpbj1cXFwiYmFjLTAuOXNcXFwiIGR1cj1cXFwiMS44c1xcXCIgdmFsdWVzPVxcXCIxOyAyMFxcXCIgY2FsY01vZGU9XFxcInNwbGluZVxcXCIga2V5VGltZXM9XFxcIjA7IDFcXFwiIGtleVNwbGluZXM9XFxcIjAuMTY1LCAwLjg0LCAwLjQ0LCAxXFxcIiByZXBlYXRDb3VudD1cXFwiaW5kZWZpbml0ZVxcXCI+PC9hbmltYXRlPlxcbiAgICAgICAgICAgICAgICAgICAgICAgIDxhbmltYXRlIGF0dHJpYnV0ZU5hbWU9XFxcInN0cm9rZS1vcGFjaXR5XFxcIiBiZWdpbj1cXFwiYmFjLTAuOXNcXFwiIGR1cj1cXFwiMS44c1xcXCIgdmFsdWVzPVxcXCIxOyAwXFxcIiBjYWxjTW9kZT1cXFwic3BsaW5lXFxcIiBrZXlUaW1lcz1cXFwiMDsgMVxcXCIga2V5U3BsaW5lcz1cXFwiMC4zLCAwLjYxLCAwLjM1NSwgMVxcXCIgcmVwZWF0Q291bnQ9XFxcImluZGVmaW5pdGVcXFwiPjwvYW5pbWF0ZT5cXG4gICAgICAgICAgICAgICAgICAgIDwvY2lyY2xlPlxcbiAgICAgICAgICAgICAgICA8L2c+XFxuICAgICAgICAgICAgPC9zdmc+XFxuICAgICAgICAgICAgPGRpdiBjbGFzcz1cXFwiYmFjLS11c2VyLWFwcHNcXFwiIGlkPVxcXCJiYWMtLXB1cmVzZGstYXBwcy1zZWN0aW9uLS1cXFwiPlxcbiAgICAgICAgICAgICAgICA8YSBocmVmPVxcXCIvYXBwL2NhbXBhaWduc1xcXCIgaWQ9XFxcImJhYy0tcHVyZXNkay1jYW1wYWlnbnMtbGluay0tXFxcIiBjbGFzcz1cXFwiYmFjLS1wdXJlc2RrLWFwcHMtb24tbmF2YmFyLS0gZGlzYWJsZWRcXFwiPlxcbiAgICAgICAgICAgICAgICAgICAgPHN2ZyB3aWR0aD1cXFwiMTVweFxcXCIgaGVpZ2h0PVxcXCIxM3B4XFxcIiB2aWV3Qm94PVxcXCIwIDAgMTUgMTRcXFwiIHZlcnNpb249XFxcIjEuMVxcXCIgeG1sbnM9XFxcImh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnXFxcIiB4bWxuczp4bGluaz1cXFwiaHR0cDovL3d3dy53My5vcmcvMTk5OS94bGlua1xcXCI+XFxuICAgICAgICAgICAgICAgICAgICAgICAgPCEtLSBHZW5lcmF0b3I6IHNrZXRjaHRvb2wgNTkuMSAoMTAxMDEwKSAtIGh0dHBzOi8vc2tldGNoLmNvbSAtLT5cXG4gICAgICAgICAgICAgICAgICAgICAgICA8ZGVmcz5cXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgPHBvbHlnb24gaWQ9XFxcInBhdGgtMVxcXCIgcG9pbnRzPVxcXCIwIDAuMDAwMTUwMDAwMDA3IDE0LjM5OTc0OTggMC4wMDAxNTAwMDAwMDcgMTQuMzk5NzQ5OCAxMi44OTk2NDk5IDAgMTIuODk5NjQ5OVxcXCI+PC9wb2x5Z29uPlxcbiAgICAgICAgICAgICAgICAgICAgICAgIDwvZGVmcz5cXG4gICAgICAgICAgICAgICAgICAgICAgICA8ZyBpZD1cXFwiUFAtQkEtUG9ydGFsLUhvbWVfRGVza3RvcC12MlxcXCIgc3Ryb2tlPVxcXCJub25lXFxcIiBzdHJva2Utd2lkdGg9XFxcIjFcXFwiIGZpbGw9XFxcIm5vbmVcXFwiIGZpbGwtcnVsZT1cXFwiZXZlbm9kZFxcXCI+XFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIDxnIGlkPVxcXCJQUENNLUxpc3RpbmdfQ29ubmV4aW9uXzAxX01heF9EXFxcIiB0cmFuc2Zvcm09XFxcInRyYW5zbGF0ZSgtMTExMC4wMDAwMDAsIC03Ny4wMDAwMDApXFxcIj5cXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIDxnIGlkPVxcXCJlbGVtZW50cy0vLXNkay0vLWJ1dHRvblxcXCIgdHJhbnNmb3JtPVxcXCJ0cmFuc2xhdGUoMTA5Ni4wMDAwMDAsIDcwLjAwMDAwMClcXFwiPlxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIDxnIGlkPVxcXCJpY29ucy9hcHBzL2NhbXBhaWducy1pY29ucy0vLWFwcHMtLy00MHg0MC0vLWNhbXBhaWduc1xcXCIgdHJhbnNmb3JtPVxcXCJ0cmFuc2xhdGUoMTEuMDAwMDAwLCA0LjAwMDAwMClcXFwiPlxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICA8ZyBpZD1cXFwiR3JvdXAtM1xcXCIgdHJhbnNmb3JtPVxcXCJ0cmFuc2xhdGUoMy4wMDAwMDAsIDMuNTAwMDAwKVxcXCI+XFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICA8bWFzayBpZD1cXFwibWFzay0yXFxcIiBmaWxsPVxcXCJ3aGl0ZVxcXCI+XFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgPHVzZSB4bGluazpocmVmPVxcXCIjcGF0aC0xXFxcIj48L3VzZT5cXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIDwvbWFzaz5cXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIDxnIGlkPVxcXCJDbGlwLTJcXFwiPjwvZz5cXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIDxwYXRoIGQ9XFxcIk0yLjMzMzI1MDAzLDMuNzUzNjQ5OTggQzIuMDQyNzUwMDMsMy44NTkxNDk5OCAxLjc5OTc1MDA0LDQuMDM2MTQ5OTggMS41OTM3NTAwNCw0LjI4OTE0OTk4IEMxLjMzMzI1MDA1LDQuNjA5MTQ5OTcgMS4yMDYyNTAwNSw0Ljk2NjY0OTk3IDEuMjA2MjUwMDUsNS4zODIxNDk5NiBMMS4yMDYyNTAwNSw1LjU1NDY0OTk2IEMxLjIwNjI1MDA1LDUuOTY5MTQ5OTUgMS4zMzI3NTAwNSw2LjMyMTY0OTk1IDEuNTkxNzUwMDQsNi42MzExNDk5NCBDMS43OTgyNTAwNCw2Ljg3ODE0OTk0IDIuMDQyMjUwMDMsNy4wNTA2NDk5NCAyLjMzMzI1MDAzLDcuMTU1NjQ5OTQgTDIuMzMzMjUwMDMsMy43NTM2NDk5OCBaIE01Ljc4ODI0OTg5LDcuMjQ4NjUwMDggQzcuOTIwMjQ5NzgsNy4yNDg2NTAwOCA5Ljg5NTc0OTY3LDcuODM1NjUwMDkgMTEuNjY2NzQ5Niw4Ljk5MzY1MDExIEwxMS42NjY3NDk2LDEuODM3NjQ5OTggQzkuODk0MjQ5NjcsMy4wNDcxNSA3Ljg5OTI0OTc4LDMuNjU5NjUwMDEgNS43MzA3NDk4OSwzLjY1OTY1MDAxIEwzLjU2ODc1MDAxLDMuNjU5NjUwMDEgTDMuNTY4NzUwMDEsNy4yNDg2NTAwOCBMNS43ODgyNDk4OSw3LjI0ODY1MDA4IFogTTUuMjk4NzQ5ODYsMTIuODk5NjQ5OSBDNC44NjEyNDk4NywxMi44OTk2NDk5IDQuNDc0NzQ5ODgsMTIuNzM1NjQ5OSA0LjE0OTI0OTg5LDEyLjQxMTE0OTkgQzMuODQyNzQ5OSwxMi4xMDYxNDk5IDMuNjg3MjQ5OSwxMS43MzAxNDk5IDMuNjg3MjQ5OSwxMS4yOTM2NDk5IEwzLjY4NzI0OTksOC40NTE2NDk5MyBMMy4wNTE3NDk5Miw4LjQ1MTY0OTkzIEwyLjk0MDc0OTkyLDguNDU0MTQ5OTMgQzIuMTIwMjQ5OTQsOC40NTQxNDk5MyAxLjQyMTc0OTk2LDguMTczMTQ5OTMgMC44NjUyNDk5NzcsNy42MTg2NDk5NCBDMC4yOTEyNDk5OTIsNy4wNDY2NDk5NCAtMC4wMDAyNTAwMDAwMTIsNi4zNTIxNDk5NSAtMC4wMDAyNTAwMDAwMTIsNS41NTQ2NDk5NSBMLTAuMDAwMjUwMDAwMDEyLDUuMzgyMTQ5OTYgQy0wLjAwMDI1MDAwMDAxMiw0LjU2NTE0OTk2IDAuMjkxNzQ5OTkyLDMuODY1MTQ5OTcgMC44NjYyNDk5NzcsMy4zMDI2NDk5NyBDMS40NDA3NDk5NiwyLjc0MTE0OTk4IDIuMTM3MjQ5OTQsMi40NTYxNDk5OCAyLjkzNjc0OTkyLDIuNDU2MTQ5OTggTDUuNzMwNzQ5ODUsMi40NTYxNDk5OCBDOC4wNTEyNDk3OSwyLjQ1NjE0OTk4IDEwLjExOTc0OTcsMS42ODExNDk5OSAxMS44NzkyNDk3LDAuMTUyMTQ5OTk5IEMxMS45NzU3NDk3LDAuMDU1NjQ5OTk5NSAxMi4xMDY3NDk3LDAuMDAwMTUwMDAwMDA3IDEyLjI0OTI0OTcsMC4wMDAxNTAwMDAwMDcgQzEyLjMzNjc0OTcsMC4wMDAxNTAwMDAwMDcgMTIuNDI5MjQ5NywwLjAyMTE0OTk5OTggMTIuNTIzNzQ5NywwLjA2MzE0OTk5OTUgQzEyLjc0NTI0OTcsMC4xNDUxNDk5OTkgMTIuODczMjQ5NywwLjMzNDE0OTk5NyAxMi44NzMyNDk3LDAuNTkwMTQ5OTk1IEwxMi44NzMyNDk3LDQuMTQ5NjQ5OTcgTDEzLjEzNDI0OTcsNC4xNDk2NDk5NyBDMTMuNDc1MjQ5Niw0LjE0OTY0OTk3IDEzLjc3NDc0OTYsNC4yNzUxNDk5NiAxNC4wMjQyNDk2LDQuNTIzMTQ5OTYgQzE0LjI2ODc0OTYsNC43MjExNDk5NiAxNC4zOTk3NDk2LDUuMDE0NjQ5OTYgMTQuMzk5NzQ5Niw1LjM4MjE0OTk2IEMxNC4zOTk3NDk2LDUuNzQzNjQ5OTUgMTQuMjcyMjQ5Niw2LjA0ODE0OTk1IDE0LjAyMDc0OTYsNi4yODc2NDk5NSBDMTMuNzcxNzQ5Niw2LjUyNDE0OTk1IDEzLjQ3Mzc0OTYsNi42NDQxNDk5NCAxMy4xMzQyNDk3LDYuNjQ0MTQ5OTQgTDEyLjg3MzI0OTcsNi42NDQxNDk5NCBMMTIuODczMjQ5NywxMC4yMDMxNDk5IEMxMi44NzMyNDk3LDEwLjQ3ODE0OTkgMTIuNzQ1MjQ5NywxMC42NzcxNDk5IDEyLjUxMjc0OTcsMTAuNzYzNjQ5OSBMMTIuNDQyNzQ5NywxMC43NzYxNDk5IEMxMi4zNDkyNDk3LDEwLjc5ODY0OTkgMTIuMzA2NzQ5NywxMC44MDUxNDk5IDEyLjI2OTc0OTcsMTAuODA1MTQ5OSBDMTIuMTU2NzQ5NywxMC44MDUxNDk5IDEyLjAzNTI0OTcsMTAuNzY2NjQ5OSAxMS45MDc3NDk3LDEwLjY5MTE0OTkgQzEwLjE0MDc0OTcsOS4xOTg2NDk5MiA4LjA5MTI0OTc5LDguNDUxNjQ5OTMgNS43ODgyNDk4NSw4LjQ1MTY0OTkzIEw0Ljg5Mzc0OTg3LDguNDUxNjQ5OTMgTDQuODkzNzQ5ODcsMTEuMjkzNjQ5OSBDNC44OTM3NDk4NywxMS40MTMxNDk5IDQuOTI5NzQ5ODcsMTEuNTA0NjQ5OSA1LjAwNzc0OTg3LDExLjU4MjY0OTkgQzUuMDg1NzQ5ODcsMTEuNjYwMTQ5OSA1LjE3Nzc0OTg2LDExLjY5NjY0OTkgNS4yOTg3NDk4NiwxMS42OTY2NDk5IEM1LjM5ODI0OTg2LDExLjY5NjY0OTkgNS40ODg3NDk4NSwxMS42NTQ2NDk5IDUuNTc1MjQ5ODUsMTEuNTY4MTQ5OSBDNS42NjI3NDk4NSwxMS40ODExNDk5IDUuNzAzNzQ5ODUsMTEuMzg0NjQ5OSA1LjcwMzc0OTg1LDExLjI2NTE0OTkgTDUuNzAzNzQ5ODUsOS42MTQ2NDk5MiBDNS43MDM3NDk4NSw5LjIzNzY0OTkyIDUuOTI5MjQ5ODQsOS4wMTI2NDk5MyA2LjMwNjc0OTgzLDkuMDEyNjQ5OTMgQzYuNDUyNzQ5ODMsOS4wMTI2NDk5MyA2LjU4OTI0OTgzLDkuMDY4MTQ5OTIgNi43MTMyNDk4Miw5LjE3NzY0OTkyIEM2Ljg0MjI0OTgyLDkuMjkyMTQ5OTIgNi45MTAyNDk4Miw5LjQ0MzE0OTkyIDYuOTEwMjQ5ODIsOS42MTQ2NDk5MiBMNi45MTAyNDk4MiwxMS4yNjUxNDk5IEM2LjkxMDI0OTgyLDExLjY5OTY0OTkgNi43NTA3NDk4MiwxMi4wODQ2NDk5IDYuNDM2MjQ5ODMsMTIuNDA4NjQ5OSBDNi4xMTk3NDk4NCwxMi43MzQ2NDk5IDUuNzM2NzQ5ODUsMTIuODk5NjQ5OSA1LjI5ODc0OTg2LDEyLjg5OTY0OTkgTDUuMjk4NzQ5ODYsMTIuODk5NjQ5OSBaXFxcIiBpZD1cXFwiRmlsbC0xXFxcIiBmaWxsPVxcXCIjMzMzMzMzXFxcIiBmaWxsLXJ1bGU9XFxcIm5vbnplcm9cXFwiIG1hc2s9XFxcInVybCgjbWFzay0yKVxcXCI+PC9wYXRoPlxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICA8L2c+XFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgPC9nPlxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgPC9nPlxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICA8L2c+XFxuICAgICAgICAgICAgICAgICAgICAgICAgPC9nPlxcbiAgICAgICAgICAgICAgICAgICAgPC9zdmc+XFxuICAgICAgICAgICAgICAgICAgICBDYW1wYWlnbnNcXG4gICAgICAgICAgICAgICAgPC9hPlxcbiAgICAgICAgICAgICAgICA8YSBocmVmPVxcXCIvYXBwL2dyb3Vwc1xcXCIgaWQ9XFxcImJhYy0tcHVyZXNkay1ncm91cHMtbGluay0tXFxcIiBjbGFzcz1cXFwiYmFjLS1wdXJlc2RrLWFwcHMtb24tbmF2YmFyLS0gZGlzYWJsZWRcXFwiPlxcbiAgICAgICAgICAgICAgICAgICAgPHN2ZyB3aWR0aD1cXFwiMjBweFxcXCIgaGVpZ2h0PVxcXCIxM3B4XFxcIiB2aWV3Qm94PVxcXCIwIDAgMzkgMjVcXFwiIHZlcnNpb249XFxcIjEuMVxcXCIgeG1sbnM9XFxcImh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnXFxcIiB4bWxuczp4bGluaz1cXFwiaHR0cDovL3d3dy53My5vcmcvMTk5OS94bGlua1xcXCI+XFxuICAgICAgICAgICAgICAgICAgICAgICAgPCEtLSBHZW5lcmF0b3I6IHNrZXRjaHRvb2wgNTkuMSAoMTAxMDEwKSAtIGh0dHBzOi8vc2tldGNoLmNvbSAtLT5cXG4gICAgICAgICAgICAgICAgICAgICAgICA8ZyBpZD1cXFwiUFAtQkEtUG9ydGFsLUhvbWVfRGVza3RvcC12MlxcXCIgc3Ryb2tlPVxcXCJub25lXFxcIiBzdHJva2Utd2lkdGg9XFxcIjFcXFwiIGZpbGw9XFxcIm5vbmVcXFwiIGZpbGwtcnVsZT1cXFwiZXZlbm9kZFxcXCI+XFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIDxnIGlkPVxcXCJQUENNLUxpc3RpbmdfQ29ubmV4aW9uXzAxX01heF9EXFxcIiB0cmFuc2Zvcm09XFxcInRyYW5zbGF0ZSgtMTI0NC4wMDAwMDAsIC03MS4wMDAwMDApXFxcIiBmaWxsPVxcXCIjMzMzMzMzXFxcIiBmaWxsLXJ1bGU9XFxcIm5vbnplcm9cXFwiPlxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgPGcgaWQ9XFxcImVsZW1lbnRzLS8tc2RrLS8tYnV0dG9uLWNvcHktZWxlbWVudHMtLy1zZGstLy1idXR0b25cXFwiIHRyYW5zZm9ybT1cXFwidHJhbnNsYXRlKDEyNDMuMDAwMDAwLCA3MC4wMDAwMDApXFxcIj5cXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICA8ZyBpZD1cXFwiaWNvbnMvYXBwcy9jYW1wYWlnbnMtaWNvbnMtLy1hcHBzLS8tNDB4NDAtLy1ncm91cHNcXFwiIHRyYW5zZm9ybT1cXFwidHJhbnNsYXRlKDExLjAwMDAwMCwgNC4wMDAwMDApXFxcIj5cXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgPGcgaWQ9XFxcIkdyb3VwXFxcIiB0cmFuc2Zvcm09XFxcInRyYW5zbGF0ZSgtOS4yNTAwMDAsIC0yLjI1MDAwMClcXFwiPlxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgPHBhdGggZD1cXFwiTTE5LjExNTE2MzEsMyBDMjIuODQ2NDQ5MSwzIDI2LjExNzA4MjUsNi4yMTk1MTIyIDI2LjExNzA4MjUsOS45MTQ2MzQxNSBDMjYuMTE3MDgyNSwxMi40NzU2MDk4IDI0LjMyMDUzNzQsMTQuNDg3ODA0OSAyMi42MTYxMjI4LDE1LjUxMjE5NTEgTDIyLjYxNjEyMjgsMTYuMTcwNzMxNyBMMjIuNjE2MTIyOCwxNi4xNzA3MzE3IEMyMi45ODQ2NDQ5LDE2LjMxNzA3MzIgMjMuNjc1NjIzOCwxNi41MzY1ODU0IDI0LjQ1ODczMzIsMTYuNzE5NTEyMiBMMjQuNTA0Nzk4NSwxNi43MTk1MTIyIEwyNC41MDQ3OTg1LDE2LjcxOTUxMjIgQzI4Ljc4ODg2NzYsMTcuODUzNjU4NSAzMSwxOS43NTYwOTc2IDMxLDIyLjM1MzY1ODUgQzMwLjkwNzg2OTUsMjMuMDEyMTk1MSAzMC4zMDkwMjExLDI0IDI5LjExMTMyNDQsMjQgTDguNzk2NTQ1MTEsMjQgQzcuNTk4ODQ4MzcsMjQgNywyMy4wMTIxOTUxIDcsMjIuMzE3MDczMiBDNywyMC40ODc4MDQ5IDguMTA1NTY2MjIsMTguMDM2NTg1NCAxMy40NDkxMzYzLDE2LjY4MjkyNjggTDEzLjQ5NTIwMTUsMTYuNjgyOTI2OCBMMTMuNDk1MjAxNSwxNi42ODI5MjY4IEMxNC4yNzgzMTA5LDE2LjUzNjU4NTQgMTQuOTY5Mjg5OCwxNi4zMTcwNzMyIDE1LjI5MTc0NjYsMTYuMjA3MzE3MSBMMTUuMjkxNzQ2NiwxNS41MTIxOTUxIEwxNS4yOTE3NDY2LDE1LjUxMjE5NTEgQzEzLjU4NzMzMjEsMTQuNDUxMjE5NSAxMS43OTA3ODY5LDEyLjQ3NTYwOTggMTEuNzkwNzg2OSw5LjkxNDYzNDE1IEMxMS43OTA3ODY5LDYuMjE5NTEyMiAxNS4wNjE0MjAzLDMgMTguNzkyNzA2MywzIEwxOS4xMTUxNjMxLDMgWiBNMTkuMTYxMjI4NCw1LjY3MDczMTcxIEwxOC44Mzg3NzE2LDUuNjcwNzMxNzEgQzE2Ljk5NjE2MTIsNS42NzA3MzE3MSAxNS4yOTE3NDY2LDcuNzE5NTEyMiAxNS4yOTE3NDY2LDkuODc4MDQ4NzggQzE1LjI5MTc0NjYsMTEuNDUxMjE5NSAxNi40ODk0NDM0LDEyLjgwNDg3OCAxNy42ODcxNDAxLDEzLjQ2MzQxNDYgQzE3LjgyNTMzNTksMTMuNTM2NTg1NCAxNy45MTc0NjY0LDEzLjYwOTc1NjEgMTguMDA5NTk2OSwxMy42ODI5MjY4IEMxOC43NDM3NjIsMTQuMjY2MDA2MSAxOC43ODk2NDczLDE0Ljk0NTU1MDcgMTguNzkyNTE1MSwxNS45NjI3MjM5IEwxOC43OTI3MDYzLDE2LjU3MzE3MDcgTDE4Ljc5MjcwNjMsMTYuNTczMTcwNyBDMTguNzkyNzA2MywxOC40MDI0MzkgMTUuNzk4NDY0NSwxOC45ODc4MDQ5IDE0LjQ2MjU3MiwxOS4yODA0ODc4IEMxMy4wMzQ1NDg5LDE5LjYwOTc1NjEgMTEuNDIyMjY0OSwyMC4yNjgyOTI3IDEwLjczMTI4NiwyMS4yNTYwOTc2IEwyNy4xNzY1ODM1LDIxLjI1NjA5NzYgQzI2LjYyMzgwMDQsMjAuNDE0NjM0MSAyNS4zMzM5NzMxLDE5Ljc1NjA5NzYgMjMuMzk5MjMyMiwxOS4yMDczMTcxIEMyMC44MTk1Nzc3LDE4LjU4NTM2NTkgMTkuMTYxMjI4NCwxNy45MjY4MjkzIDE5LjE2MTIyODQsMTYuNTM2NTg1NCBMMTkuMTYwODE1OSwxNS43NDg3NTI3IEMxOS4xNjI1MDM2LDE0LjgyMTc1NzEgMTkuMjEyNzEzMSwxNC4xNjI4NDA3IDE5Ljk0NDMzNzgsMTMuNjQ2MzQxNSBDMjAuMDgyNTMzNiwxMy41MzY1ODU0IDIwLjIyMDcyOTQsMTMuNDYzNDE0NiAyMC4zMTI4NTk5LDEzLjQyNjgyOTMgQzIxLjUxMDU1NjYsMTIuODA0ODc4IDIyLjcwODI1MzQsMTEuNDUxMjE5NSAyMi43MDgyNTM0LDkuODc4MDQ4NzggQzIyLjcwODI1MzQsNy43MTk1MTIyIDIxLjAwMzgzODgsNS42NzA3MzE3MSAxOS4xNjEyMjg0LDUuNjcwNzMxNzEgWiBNMTAuNjk0NDQ0NCwxIEMxMi41NDYyOTYzLDEgMTMuOTM1MTg1MiwxLjYzNzA4MDg3IDE1LDIuOTExMjQyNiBDMTQuMDI3Nzc3OCwzLjM2MDk0Njc1IDEzLjE5NDQ0NDQsMy45OTgwMjc2MSAxMi40NTM3MDM3LDQuNzg1MDA5ODYgQzEyLjIyMjIyMjIsNC41MjI2ODI0NSAxMS45OTA3NDA3LDQuMjk3ODMwMzcgMTEuOTQ0NDQ0NCw0LjI2MDM1NTAzIEMxMS41NzQwNzQxLDMuOTIzMDc2OTIgMTEuMjk2Mjk2MywzLjgxMDY1MDg5IDEwLjY5NDQ0NDQsMy44MTA2NTA4OSBMMTAuNjk0NDQ0NCwzLjgxMDY1MDg5IEwxMC40MTY2NjY3LDMuODEwNjUwODkgQzkuMTY2NjY2NjcsMy44MTA2NTA4OSA3LjYzODg4ODg5LDUuMzg0NjE1MzggNy42Mzg4ODg4OSw3LjI5NTg1Nzk5IEM3LjYzODg4ODg5LDguNjA3NDk1MDcgOC42NTc0MDc0MSw5LjczMTc1NTQyIDkuNTgzMzMzMzMsMTAuMjU2NDEwMyBDOS42NzU5MjU5MywxMC4zMzEzNjA5IDkuODE0ODE0ODEsMTAuNDA2MzExNiA5LjkwNzQwNzQxLDEwLjQ4MTI2MjMgQzEwLjYzNjU3NDEsMTEuMDM4NzA4MSAxMC42OTIyNzQzLDExLjY4MjIzIDEwLjY5NDgwNjEsMTIuNTEyMjUwNCBMMTAuNjk0NDQ0NCwxMy4yNTQ0Mzc5IEMxMC42OTQ0NDQ0LDE1LjA1MzI1NDQgNy44MjQwNzQwNywxNS42NTI4NiA2LjcxMjk2Mjk2LDE1Ljg3NzcxMiBDNS43NDA3NDA3NCwxNi4xNDAwMzk0IDQuNjI5NjI5NjMsMTYuNTUyMjY4MiAzLjk4MTQ4MTQ4LDE3LjE4OTM0OTEgTDMuOTgxNDgxNDgsMTcuMTg5MzQ5MSBMNy43Nzc3Nzc3OCwxNy4xODkzNDkxIEM4LjE0ODE0ODE1LDE3LjE4OTM0OTEgOC41MTg1MTg1MiwxNy4zNzY3MjU4IDguNjExMTExMTEsMTcuNjc2NTI4NiBMOC42MTExMTExMSwxNy42NzY1Mjg2IEw4LjYyODUxODUyLDE3Ljc0MzY4NDQgQzguNjM4ODg4ODksMTcuODMyNDI2IDguNjAxODUxODUsMTcuOTE2MzcwOCA4LjU2NDgxNDgxLDE3Ljk3NjMzMTQgQzcuNjM4ODg4ODksMTguNTM4NDYxNSA2Ljk5MDc0MDc0LDE5LjEzODA2NzEgNi41Mjc3Nzc3OCwxOS43NzUxNDc5IEM2LjM4ODg4ODg5LDE5LjkyNTA0OTMgNi4yMDM3MDM3LDIwIDYuMDE4NTE4NTIsMjAgTDYuMDE4NTE4NTIsMjAgTDEuNzU5MjU5MjYsMjAgQzAuNjAxODUxODUyLDIwIDAsMTkuMDI1NjQxIDAsMTguMzUxMDg0OCBDMCwxNi42NjQ2OTQzIDAuOTcyMjIyMjIyLDE0LjQ1MzY0ODkgNS43NDA3NDA3NCwxMy4xMDQ1MzY1IEw1Ljc0MDc0MDc0LDEzLjEwNDUzNjUgTDUuNzg3MDM3MDQsMTMuMTA0NTM2NSBDNi4zODg4ODg4OSwxMi45OTIxMTA1IDYuODk4MTQ4MTUsMTIuODQyMjA5MSA3LjIyMjIyMjIyLDEyLjcyOTc4MyBMNy4yMjIyMjIyMiwxMi43Mjk3ODMgTDcuMjIyMjIyMjIsMTIuMjgwMDc4OSBDNS43NDA3NDA3NCwxMS4zNDMxOTUzIDQuMTY2NjY2NjcsOS41NDQzNzg3IDQuMTY2NjY2NjcsNy4yNTgzODI2NCBDNC4xNjY2NjY2NywzLjkyMzA3NjkyIDcuMDgzMzMzMzMsMSAxMC40MTY2NjY3LDEgTDEwLjQxNjY2NjcsMSBaIE0yNy42NDY3ODI2LDUuNTUxMTE1MTJlLTE3IEMzMC45NTkzNDA1LDUuNTUxMTE1MTJlLTE3IDMzLjg1NzgyODcsMi45MzQ2NTM0NyAzMy44NTc4Mjg3LDYuMjgzMTY4MzIgQzMzLjg1NzgyODcsOC41NzgyMTc4MiAzMi4zMzk1NzMsMTAuMzQ2NTM0NyAzMC44MjEzMTczLDExLjMyNDc1MjUgTDMwLjgyMTMxNzMsMTEuMzI0NzUyNSBMMzAuODIxMzE3MywxMS43Mzg2MTM5IEMzMS4xNDMzNzE1LDExLjg4OTEwODkgMzEuNjk1NDY0NSwxMi4wMzk2MDQgMzIuMjkzNTY1MiwxMi4xOTAwOTkgQzM3LjAzMjM2MzQsMTMuNTA2OTMwNyAzOC4wNDQ1MzM4LDE1LjcyNjczMjcgMzcuOTk4NTI2MSwxNy4zNDQ1NTQ1IEMzNy45OTg1MjYxLDE4LjA1OTQwNTkgMzcuNDAwNDI1NCwxOSAzNi4yNTAyMzE2LDE5IEwzNi4yNTAyMzE2LDE5IEwzMS43ODc0OCwxOSBDMzEuNTU3NDQxMywxOSAzMS4zNzM0MTAzLDE4LjkyNDc1MjUgMzEuMjgxMzk0OCwxOC43NzQyNTc0IEMzMC43NzUzMDk1LDE4LjEzNDY1MzUgMzAuMTMxMjAxMSwxNy41MzI2NzMzIDI5LjI1NzA1MzgsMTcuMDA1OTQwNiBDMjkuMTE5MDMwNiwxNi45MzA2OTMxIDI5LjA3MzAyMjgsMTYuODE3ODIxOCAyOS4xMTkwMzA2LDE2LjcwNDk1MDUgTDI5LjExOTAzMDYsMTYuNzA0OTUwNSBMMjkuMTU5NTQ3NywxNi42MDg5MDQxIEMyOS4yOTI4Mzc2LDE2LjM2NDQ3ODcgMjkuNjIwMDAzOCwxNi4yMTU4NDE2IDI5Ljk0NzE3MDEsMTYuMjE1ODQxNiBMMjkuOTQ3MTcwMSwxNi4yMTU4NDE2IEwzNC4wNDE4NTk3LDE2LjIxNTg0MTYgQzMzLjQ4OTc2NjcsMTUuNjg5MTA4OSAzMi41Njk2MTE3LDE1LjIzNzYyMzggMzEuMTg5Mzc5MywxNC44NjEzODYxIEMyOS4zNDkwNjkzLDE0LjQwOTkwMSAyNy4zNzA3MzYxLDEzLjgwNzkyMDggMjcuMzcwNzM2MSwxMi4yNjUzNDY1IEwyNy4zNzA3MzYxLDEyLjI2NTM0NjUgTDI3LjM3MDQxMDQsMTEuNjk1MDc0NiBDMjcuMzY4MjIwMSwxMC43NDIxNzIgMjcuMzczNjExNiwxMC4wNDU1NDQ2IDI4LjEwNjg2MDEsOS40ODExODgxMiBDMjguMjQ0ODgzNCw5LjM2ODMxNjgzIDI4LjQyODkxNDQsOS4yOTMwNjkzMSAyOC40NzQ5MjIxLDkuMjU1NDQ1NTQgQzI5LjM5NTA3NzEsOC43Mjg3MTI4NyAzMC40MDcyNDc1LDcuNiAzMC40MDcyNDc1LDYuMjgzMTY4MzIgQzMwLjQwNzI0NzUsNC4zMjY3MzI2NyAyOC44ODg5OTE4LDIuNzg0MTU4NDIgMjcuNjQ2NzgyNiwyLjc4NDE1ODQyIEwyNy42NDY3ODI2LDIuNzg0MTU4NDIgTDI3LjM3MDczNjEsMi43ODQxNTg0MiBDMjYuNzI2NjI3NiwyLjc4NDE1ODQyIDI2LjQwNDU3MzQsMi45MzQ2NTM0NyAyNi4wMzY1MTE0LDMuMzEwODkxMDkgQzI1Ljk5MDUwMzcsMy4zNDg1MTQ4NSAyNS43NjA0NjQ5LDMuNjQ5NTA0OTUgMjUuNTMwNDI2MiwzLjk1MDQ5NTA1IEMyNC44NDAzMSwzLjEyMjc3MjI4IDIzLjk2NjE2MjcsMi40ODMxNjgzMiAyMywxLjk5NDA1OTQxIEMyNC4xMDQxODYsMC42Mzk2MDM5NiAyNS40ODQ0MTg0LDUuNTUxMTE1MTJlLTE3IDI3LjM3MDczNjEsNS41NTExMTUxMmUtMTcgTDI3LjM3MDczNjEsNS41NTExMTUxMmUtMTcgWlxcXCIgaWQ9XFxcIkNvbWJpbmVkLVNoYXBlXFxcIj48L3BhdGg+XFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIDwvZz5cXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICA8L2c+XFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICA8L2c+XFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIDwvZz5cXG4gICAgICAgICAgICAgICAgICAgICAgICA8L2c+XFxuICAgICAgICAgICAgICAgICAgICA8L3N2Zz5cXG4gICAgICAgICAgICAgICAgICAgIEdyb3Vwc1xcbiAgICAgICAgICAgICAgICA8L2E+XFxuICAgICAgICAgICAgICAgIDxhIGhyZWY9XFxcIiNcXFwiIGlkPVxcXCJiYWMtLXB1cmVzZGstLWFwcHMtLW9wZW5lci0tXFxcIiBjbGFzcz1cXFwiYmFjLS1wdXJlc2RrLWFwcHMtb24tbmF2YmFyLS1cXFwiPlxcbiAgICAgICAgICAgICAgICAgICAgPHN2ZyB3aWR0aD1cXFwiMTNweFxcXCIgaGVpZ2h0PVxcXCIxM3B4XFxcIiB2aWV3Qm94PVxcXCIwIDAgMTMgMTNcXFwiIHZlcnNpb249XFxcIjEuMVxcXCIgeG1sbnM9XFxcImh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnXFxcIiB4bWxuczp4bGluaz1cXFwiaHR0cDovL3d3dy53My5vcmcvMTk5OS94bGlua1xcXCI+XFxuICAgICAgICAgICAgICAgICAgICAgICAgPCEtLSBHZW5lcmF0b3I6IHNrZXRjaHRvb2wgNTkuMSAoMTAxMDEwKSAtIGh0dHBzOi8vc2tldGNoLmNvbSAtLT5cXG4gICAgICAgICAgICAgICAgICAgICAgICA8ZyBpZD1cXFwiUFAtQkEtUG9ydGFsLUhvbWVfRGVza3RvcC12MlxcXCIgc3Ryb2tlPVxcXCJub25lXFxcIiBzdHJva2Utd2lkdGg9XFxcIjFcXFwiIGZpbGw9XFxcIm5vbmVcXFwiIGZpbGwtcnVsZT1cXFwiZXZlbm9kZFxcXCI+XFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIDxnIGlkPVxcXCJQUENNLUxpc3RpbmdfQ29ubmV4aW9uXzAxX01heF9EXFxcIiB0cmFuc2Zvcm09XFxcInRyYW5zbGF0ZSgtMTM3OC4wMDAwMDAsIC03OC4wMDAwMDApXFxcIiBmaWxsPVxcXCIjMzMzMzMzXFxcIiBmaWxsLXJ1bGU9XFxcIm5vbnplcm9cXFwiPlxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgPGcgaWQ9XFxcImVsZW1lbnRzLS8tc2RrLS8tYnV0dG9uLWNvcHktMi1lbGVtZW50cy0vLXNkay0vLWJ1dHRvblxcXCIgdHJhbnNmb3JtPVxcXCJ0cmFuc2xhdGUoMTM2My4wMDAwMDAsIDcwLjAwMDAwMClcXFwiPlxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIDxnIGlkPVxcXCJpY29ucy9hcHBzL2NhbXBhaWducy1pY29ucy0vLWFwcHMtLy00MHg0MC0vLU90aGVyYXBwc1xcXCIgdHJhbnNmb3JtPVxcXCJ0cmFuc2xhdGUoMTEuMDAwMDAwLCA0LjAwMDAwMClcXFwiPlxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICA8ZyBpZD1cXFwiZTkwNlxcXCIgdHJhbnNmb3JtPVxcXCJ0cmFuc2xhdGUoNC4wMDAwMDAsIDQuMDAwMDAwKVxcXCI+XFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICA8cGF0aCBkPVxcXCJNNS4wNzgxMjU3MiwyLjQ5OTk5OTk0ZS0wNiBMMC4zOTA2MjUwNTUsMi40OTk5OTk5NGUtMDYgQzAuMjg0ODMwODc0LDIuNDk5OTk5OTRlLTA2IDAuMTkzMjc3OTQ0LDAuMDM4NjU3OTA5OSAwLjExNTk2NjY4MywwLjExNTk2OTE0NiBDMC4wMzg2NTU0MjIxLDAuMTkzMjgwMzgzIDAsMC4yODQ4MzMyODQgMCwwLjM5MDYyNzQzMiBMMCw1LjA3ODEyNjYxIEMwLDUuMTgzOTIwNzYgMC4wMzg2NTU0MjIxLDUuMjc1NDczNjYgMC4xMTU5NjY2ODMsNS4zNTI3ODQ5IEMwLjE5MzI3Nzk0NCw1LjQzMDA5NjE0IDAuMjg0ODMwODc0LDUuNDY4NzUxNTUgMC4zOTA2MjUwNTUsNS40Njg3NTE1NSBMMS4xNzE4NzUxNyw1LjQ2ODc1MTU1IEMxLjI3NzY2OTM1LDUuNDY4NzUxNTUgMS4zNjkyMjIyOCw1LjQzMDA5NjE0IDEuNDQ2NTMzNTQsNS4zNTI3ODQ5IEMxLjUyMzg0NDgsNS4yNzU0NzM2NiAxLjU2MjUwMDIyLDUuMTgzOTIwNzYgMS41NjI1MDAyMiw1LjA3ODEyNjYxIEwxLjU2MjUwMDIyLDEuODU1NDY4ODQgQzEuNTYyNTAwMjIsMS44NTU0Njg4NCAxLjU3Njc0MTg5LDEuODA2NjQwOTMgMS42MDUyMjQ4MSwxLjcwODk4NDI5IEMxLjYzMzcwNzczLDEuNjExMzI4NDcgMS43MDg5ODQ0MSwxLjU2MjUwMDE0IDEuODMxMDU0ODQsMS41NjI1MDAxNCBDMS44MzEwNTQ4NCwxLjU2MjUwMDE0IDEuODMzMDg5NDMsMS41NjI1MDAxNCAxLjgzNzE1ODU5LDEuNTYyNTAwMTQgQzEuODQxMjI3MzQsMS41NjI1MDAxNCAxLjg0NzMzMTA5LDEuNTYyNTAwMTQgMS44NTU0NjkwMSwxLjU2MjUwMDE0IEwzLjU3NjY2MDkyLDEuNTYyNTAwMTQgQzMuNTc2NjYwOTIsMS41NjI1MDAxNCAzLjYyNzUyMzg1LDEuNTc2NzQxODEgMy43MjkyNDg4NiwxLjYwNTIyNDcyIEMzLjgzMDk3NDI5LDEuNjMzNzA3NjMgMy44ODk5NzUxMywxLjcxNzEyMjYyIDMuOTA2MjUwOTcsMS44NTU0Njg4NCBMMy45MDYyNTA5NywzLjQ5MTIxMDIyIEMzLjkwNjI1MDk3LDMuNDkxMjEwMjIgMy44OTIwMDkzLDMuNTU2MzE0MzggMy44NjM1MjYzOCwzLjY4NjUyMjY5IEMzLjgzNTA0MzQ2LDMuODE2NzMxIDMuNzE5MDc2MzYsMy44ODE4MzUxNiAzLjUxNTYyNTkxLDMuODgxODM1MTYgQzMuNTE1NjI1OTEsMy44ODE4MzUxNiAzLjUwNzQ4OCwzLjg4MTgzNTE2IDMuNDkxMjExNzQsMy44ODE4MzUxNiBMMi43NzA5OTQ5OCwzLjg4MTgzNTE2IEMyLjY2NTIwMDM4LDMuODgxODM1MTYgMi41NzM2NDc4NiwzLjkyMDQ5MDk4IDIuNDk2MzM2NiwzLjk5NzgwMjIyIEMyLjQxOTAyNTM0LDQuMDc1MTEzMDQgMi4zODAzNjk5Miw0LjE2NjY2NTk0IDIuMzgwMzY5OTIsNC4yNzI0NjAwOSBMMi4zODAzNjk5Miw1LjA1MzcwOTk1IEMyLjM4MDM2OTkyLDUuMTY3NjQyNDMgMi40MTkwMjUzNCw1LjI2MTIyOTUgMi40OTYzMzY2LDUuMzM0NDcxNTcgQzIuNTczNjQ3ODYsNS40MDc3MTQwNiAyLjY2NTIwMDM4LDUuNDQ0MzM0ODggMi43NzA5OTQ5OCw1LjQ0NDMzNDg4IEw1LjA3ODEyNDQ3LDUuNDQ0MzM0ODggQzUuMTgzOTE4NjUsNS40NDQzMzQ4OCA1LjI3NTQ3MTU4LDUuNDA3NzE0MDYgNS4zNTI3ODI4NCw1LjMzNDQ3MTU3IEM1LjQzMDA5NDEsNS4yNjEyMjk1IDUuNDY4NzQ5NTIsNS4xNjc2NDI0MyA1LjQ2ODc0OTUyLDUuMDUzNzA5OTUgTDUuNDY4NzQ5NTIsMC4zOTA2Mjc0MzIgQzUuNDY4NzQ5NTIsMC4yODQ4MzMyODQgNS40MzAwOTQxLDAuMTkzMjgwMzgzIDUuMzUyNzgyODQsMC4xMTU5NjkxNDYgQzUuMjc1NDcxNTgsMC4wMzg2NTc5MDk5IDUuMTgzOTE4NjUsMi40OTk5OTk5NGUtMDYgNS4wNzgxMjQ0NywyLjQ5OTk5OTk0ZS0wNiBMNS4wNzgxMjU3MiwyLjQ5OTk5OTk0ZS0wNiBaIE0xMi4xMDkzNzYyLDAgTDcuNDIxODc1NTMsMCBDNy4zMTYwODEzNSwwIDcuMjI0NTI4NDIsMC4wMzg2NTc5MDkxIDcuMTQ3MjE3MTYsMC4xMTU5NjkxNDQgQzcuMDY5OTA1OSwwLjE5MzI4MDM3OSA3LjAzMTI1MDQ4LDAuMjg0ODMzMjc4IDcuMDMxMjUwNDgsMC4zOTA2Mjc0MjQgTDcuMDMxMjUwNDgsNS4wNzgxMjY1MSBDNy4wMzEyNTA0OCw1LjE4MzkyMDY1IDcuMDY5OTA1OSw1LjI3NTQ3MzU1IDcuMTQ3MjE3MTYsNS4zNTI3ODQ3OSBDNy4yMjQ1Mjg0Miw1LjQzMDA5NjAyIDcuMzE2MDgxMzUsNS40Njg3NTE0MyA3LjQyMTg3NTUzLDUuNDY4NzUxNDMgTDguMjAzMTI1NjQsNS40Njg3NTE0MyBDOC4zMDg5MTk4Miw1LjQ2ODc1MTQzIDguNDAwNDcyNzUsNS40MzAwOTYwMiA4LjQ3Nzc4NDAxLDUuMzUyNzg0NzkgQzguNTU1MDk1MjgsNS4yNzU0NzM1NSA4LjU5Mzc1MDcsNS4xODM5MjA2NSA4LjU5Mzc1MDcsNS4wNzgxMjY1MSBMOC41OTM3NTA3LDEuODU1NDY4OCBDOC41OTM3NTA3LDEuODU1NDY4OCA4LjYwNzk5MjM3LDEuODEwNzA5NjUgOC42MzY0NzUyOSwxLjcyMTE5MTMzIEM4LjY2NDk1ODIxLDEuNjMxNjczNDMgOC43NDAyMzQ4OSwxLjU4NjkxNDI3IDguODYyMzA1MzIsMS41ODY5MTQyNyBDOC44NjIzMDUzMiwxLjU4NjkxNDI3IDguODY0MzM5OSwxLjU4NjkxNDI3IDguODY4NDA5MDcsMS41ODY5MTQyNyBDOC44NzI0Nzc4MiwxLjU4NjkxNDI3IDguODc4NTgxNTcsMS41ODY5MTQyNyA4Ljg4NjcxOTQ5LDEuNTg2OTE0MjcgTDEwLjYwNzkxMTQsMS41ODY5MTQyNyBDMTAuNjA3OTExNCwxLjU4NjkxNDI3IDEwLjY1ODc3NDMsMS42MDExNTU1MiAxMC43NjA0OTkzLDEuNjI5NjM4ODUgQzEwLjg2MjIyNDgsMS42NTgxMjE3NiAxMC45MjEyMjU2LDEuNzQxNTM2NzQgMTAuOTM3NTAxNCwxLjg3OTg4Mjk3IEwxMC45Mzc1MDE0LDMuNTE1NjI0MzEgQzEwLjkzNzUwMTQsMy41MTU2MjQzMSAxMC45MjMyNTk4LDMuNTgwNzI4NDcgMTAuODk0Nzc2OSwzLjcxMDkzNjc3IEMxMC44NjYyOTM5LDMuODQxMTQ1MDggMTAuNzUwMzI2OCwzLjkwNjI0OTI0IDEwLjU0Njg3NjQsMy45MDYyNDkyNCBDMTAuNTQ2ODc2NCwzLjkwNjI0OTI0IDEwLjUzODczODUsMy45MDYyNDkyNCAxMC41MjI0NjIyLDMuOTA2MjQ5MjQgTDkuNzY1NjI0NjEsMy45MDYyNDkyNCBDOS42NTk4MzA0MywzLjkwNjI0OTI0IDkuNTY4Mjc3NSwzLjk0NDkwNDY1IDkuNDkwOTY2MjQsNC4wMjIyMTU4OCBDOS40MTM2NTQ5OCw0LjA5OTUyNzExIDkuMzc0OTk5NTYsNC4xOTEwODAwMSA5LjM3NDk5OTU2LDQuMjk2ODc0MTYgTDkuMzc0OTk5NTYsNS4wNzgxMjQwMSBDOS4zNzQ5OTk1Niw1LjE4MzkxODE1IDkuNDEzNjU0OTgsNS4yNzU0NzEwNSA5LjQ5MDk2NjI0LDUuMzUyNzgyMjkgQzkuNTY4Mjc3NSw1LjQzMDA5MzUyIDkuNjU5ODMwNDMsNS40Njg3NTE0MyA5Ljc2NTYyNDYxLDUuNDY4NzUxNDMgTDEyLjEwOTM3NDksNS40Njg3NTE0MyBDMTIuMjE1MTY5MSw1LjQ2ODc1MTQzIDEyLjMwNjcyMjEsNS40MzAwOTM1MiAxMi4zODQwMzMzLDUuMzUyNzgyMjkgQzEyLjQ2MTM0NDYsNS4yNzU0NzEwNSAxMi41LDUuMTgzOTE4MTUgMTIuNSw1LjA3ODEyNDAxIEwxMi41LDAuMzkwNjI0OTI0IEMxMi41LDAuMjg0ODMwNzc4IDEyLjQ2MTM0NDYsMC4xOTMyNzc4NzkgMTIuMzg0MDMzMywwLjExNTk2NjY0NCBDMTIuMzA2NzIyMSwwLjAzODY1NTQwOTEgMTIuMjE1MTY5MSwwIDEyLjEwOTM3NDksMCBMMTIuMTA5Mzc2MiwwIFogTTUuMDc4MTI1NzIsNy4wMzEyNDg1NyBMMC4zOTA2MjUwNTUsNy4wMzEyNDg1NyBDMC4yODQ4MzA4NzQsNy4wMzEyNDg1NyAwLjE5MzI3Nzk0NCw3LjA2OTkwNjQ4IDAuMTE1OTY2NjgzLDcuMTQ3MjE3NzEgQzAuMDM4NjU1NDIyMSw3LjIyNDUyODk1IDAsNy4zMTYwODE4NSAwLDcuNDIxODc1OTkgTDAsMTIuMTA5Mzc1MSBDMCwxMi4yMTUxNjkyIDAuMDM4NjU1NDIyMSwxMi4zMDY3MjIxIDAuMTE1OTY2NjgzLDEyLjM4NDAzMzQgQzAuMTkzMjc3OTQ0LDEyLjQ2MTM0NDYgMC4yODQ4MzA4NzQsMTIuNSAwLjM5MDYyNTA1NSwxMi41IEwxLjE3MTg3NTE3LDEyLjUgQzEuMjc3NjY5MzUsMTIuNSAxLjM2OTIyMjI4LDEyLjQ2MTM0NDYgMS40NDY1MzM1NCwxMi4zODQwMzM0IEMxLjUyMzg0NDgsMTIuMzA2NzIyMSAxLjU2MjUwMDIyLDEyLjIxNTE2OTIgMS41NjI1MDAyMiwxMi4xMDkzNzUxIEwxLjU2MjUwMDIyLDguODg2NzE3MzcgQzEuNTYyNTAwMjIsOC44ODY3MTczNyAxLjU3Njc0MTg5LDguODQxOTU4MjIgMS42MDUyMjQ4MSw4Ljc1MjQzOTkgQzEuNjMzNzA3NzMsOC42NjI5MjIgMS43MDg5ODQ0MSw4LjYxODE2Mjg0IDEuODMxMDU0ODQsOC42MTgxNjI4NCBDMS44MzEwNTQ4NCw4LjYxODE2Mjg0IDEuODMzMDg5NDMsOC42MTgxNjI4NCAxLjgzNzE1ODU5LDguNjE4MTYyODQgQzEuODQxMjI3MzQsOC42MTgxNjI4NCAxLjg0NzMzMTA5LDguNjE4MTYyODQgMS44NTU0NjkwMSw4LjYxODE2Mjg0IEwzLjU3NjY2MDkyLDguNjE4MTYyODQgQzMuNTc2NjYwOTIsOC42MTgxNjI4NCAzLjYyNzUyMzg1LDguNjMyNDA0MDkgMy43MjkyNDg4Niw4LjY2MDg4NzQyIEMzLjgzMDk3NDI5LDguNjg5MzcwMzMgMy44ODk5NzUxMyw4Ljc3Mjc4NTMxIDMuOTA2MjUwOTcsOC45MTExMzE1NCBMMy45MDYyNTA5NywxMC41NDY4NzI5IEMzLjkwNjI1MDk3LDEwLjU0Njg3MjkgMy44OTIwMDkzLDEwLjYxMTk3NyAzLjg2MzUyNjM4LDEwLjc0MjE4NTMgQzMuODM1MDQzNDYsMTAuODcyMzkzNyAzLjcxOTA3NjM2LDEwLjkzNzQ5NzggMy41MTU2MjU5MSwxMC45Mzc0OTc4IEMzLjUxNTYyNTkxLDEwLjkzNzQ5NzggMy41MDc0ODgsMTAuOTM3NDk3OCAzLjQ5MTIxMTc0LDEwLjkzNzQ5NzggTDIuNzcwOTk0OTgsMTAuOTM3NDk3OCBDMi42NjUyMDAzOCwxMC45Mzc0OTc4IDIuNTczNjQ3ODYsMTAuOTc2MTUzMiAyLjQ5NjMzNjYsMTEuMDUzNDY0NCBDMi40MTkwMjUzNCwxMS4xMzA3NzU3IDIuMzgwMzY5OTIsMTEuMjIyMzI4NiAyLjM4MDM2OTkyLDExLjMyODEyMjcgTDIuMzgwMzY5OTIsMTIuMTA5MzcyNiBDMi4zODAzNjk5MiwxMi4yMTUxNjY3IDIuNDE5MDI1MzQsMTIuMzA2NzE5NiAyLjQ5NjMzNjYsMTIuMzg0MDMwOSBDMi41NzM2NDc4NiwxMi40NjEzNDIxIDIuNjY1MjAwMzgsMTIuNSAyLjc3MDk5NDk4LDEyLjUgTDUuMDc4MTI0NDcsMTIuNSBDNS4xODM5MTg2NSwxMi41IDUuMjc1NDcxNTgsMTIuNDYxMzQyMSA1LjM1Mjc4Mjg0LDEyLjM4NDAzMDkgQzUuNDMwMDk0MSwxMi4zMDY3MTk2IDUuNDY4NzQ5NTIsMTIuMjE1MTY2NyA1LjQ2ODc0OTUyLDEyLjEwOTM3MjYgTDUuNDY4NzQ5NTIsNy40MjE4NzM0OSBDNS40Njg3NDk1Miw3LjMxNjA3OTM1IDUuNDMwMDk0MSw3LjIyNDUyNjQ1IDUuMzUyNzgyODQsNy4xNDcyMTUyMSBDNS4yNzU0NzE1OCw3LjA2OTkwMzk4IDUuMTgzOTE4NjUsNy4wMzEyNDg1NyA1LjA3ODEyNDQ3LDcuMDMxMjQ4NTcgTDUuMDc4MTI1NzIsNy4wMzEyNDg1NyBaIE0xMi4xMDkzNzYyLDcuMDMxMjQ4NTcgTDcuNDIxODc1NTMsNy4wMzEyNDg1NyBDNy4zMTYwODEzNSw3LjAzMTI0ODU3IDcuMjI0NTI4NDIsNy4wNjk5MDY0OCA3LjE0NzIxNzE2LDcuMTQ3MjE3NzEgQzcuMDY5OTA1OSw3LjIyNDUyODk1IDcuMDMxMjUwNDgsNy4zMTYwODE4NSA3LjAzMTI1MDQ4LDcuNDIxODc1OTkgTDcuMDMxMjUwNDgsMTIuMTA5Mzc1MSBDNy4wMzEyNTA0OCwxMi4yMTUxNjkyIDcuMDY5OTA1OSwxMi4zMDY3MjIxIDcuMTQ3MjE3MTYsMTIuMzg0MDMzNCBDNy4yMjQ1Mjg0MiwxMi40NjEzNDQ2IDcuMzE2MDgxMzUsMTIuNSA3LjQyMTg3NTUzLDEyLjUgTDguMjAzMTI1NjQsMTIuNSBDOC4zMDg5MTk4MiwxMi41IDguNDAwNDcyNzUsMTIuNDYxMzQ0NiA4LjQ3Nzc4NDAxLDEyLjM4NDAzMzQgQzguNTU1MDk1MjgsMTIuMzA2NzIyMSA4LjU5Mzc1MDcsMTIuMjE1MTY5MiA4LjU5Mzc1MDcsMTIuMTA5Mzc1MSBMOC41OTM3NTA3LDguODg2NzE3MzcgQzguNTkzNzUwNyw4Ljg4NjcxNzM3IDguNjA3OTkyMzcsOC44NDE5NTgyMiA4LjYzNjQ3NTI5LDguNzUyNDM5OSBDOC42NjQ5NTgyMSw4LjY2MjkyMiA4Ljc0MDIzNDg5LDguNjE4MTYyODQgOC44NjIzMDUzMiw4LjYxODE2Mjg0IEM4Ljg2MjMwNTMyLDguNjE4MTYyODQgOC44NjQzMzk5LDguNjE4MTYyODQgOC44Njg0MDkwNyw4LjYxODE2Mjg0IEM4Ljg3MjQ3NzgyLDguNjE4MTYyODQgOC44Nzg1ODE1Nyw4LjYxODE2Mjg0IDguODg2NzE5NDksOC42MTgxNjI4NCBMMTAuNjA3OTExNCw4LjYxODE2Mjg0IEMxMC42MDc5MTE0LDguNjE4MTYyODQgMTAuNjU4Nzc0Myw4LjYzMjQwNDA5IDEwLjc2MDQ5OTMsOC42NjA4ODc0MiBDMTAuODYyMjI0OCw4LjY4OTM3MDMzIDEwLjkyMTIyNTYsOC43NzI3ODUzMSAxMC45Mzc1MDE0LDguOTExMTMxNTQgTDEwLjkzNzUwMTQsMTAuNTQ2ODcyOSBDMTAuOTM3NTAxNCwxMC41NDY4NzI5IDEwLjkyMzI1OTgsMTAuNjExOTc3IDEwLjg5NDc3NjksMTAuNzQyMTg1MyBDMTAuODY2MjkzOSwxMC44NzIzOTM3IDEwLjc1MDMyNjgsMTAuOTM3NDk3OCAxMC41NDY4NzY0LDEwLjkzNzQ5NzggQzEwLjU0Njg3NjQsMTAuOTM3NDk3OCAxMC41Mzg3Mzg1LDEwLjkzNzQ5NzggMTAuNTIyNDYyMiwxMC45Mzc0OTc4IEw5Ljc2NTYyNDYxLDEwLjkzNzQ5NzggQzkuNjU5ODMwNDMsMTAuOTM3NDk3OCA5LjU2ODI3NzUsMTAuOTc2MTUzMiA5LjQ5MDk2NjI0LDExLjA1MzQ2NDQgQzkuNDEzNjU0OTgsMTEuMTMwNzc1NyA5LjM3NDk5OTU2LDExLjIyMjMyODYgOS4zNzQ5OTk1NiwxMS4zMjgxMjI3IEw5LjM3NDk5OTU2LDEyLjEwOTM3MjYgQzkuMzc0OTk5NTYsMTIuMjE1MTY2NyA5LjQxMzY1NDk4LDEyLjMwNjcxOTYgOS40OTA5NjYyNCwxMi4zODQwMzA5IEM5LjU2ODI3NzUsMTIuNDYxMzQyMSA5LjY1OTgzMDQzLDEyLjUgOS43NjU2MjQ2MSwxMi41IEwxMi4xMDkzNzQ5LDEyLjUgQzEyLjIxNTE2OTEsMTIuNSAxMi4zMDY3MjIxLDEyLjQ2MTM0MjEgMTIuMzg0MDMzMywxMi4zODQwMzA5IEMxMi40NjEzNDQ2LDEyLjMwNjcxOTYgMTIuNSwxMi4yMTUxNjY3IDEyLjUsMTIuMTA5MzcyNiBMMTIuNSw3LjQyMTg3MzQ5IEMxMi41LDcuMzE2MDc5MzUgMTIuNDYxMzQ0Niw3LjIyNDUyNjQ1IDEyLjM4NDAzMzMsNy4xNDcyMTUyMSBDMTIuMzA2NzIyMSw3LjA2OTkwMzk4IDEyLjIxNTE2OTEsNy4wMzEyNDg1NyAxMi4xMDkzNzQ5LDcuMDMxMjQ4NTcgTDEyLjEwOTM3NjIsNy4wMzEyNDg1NyBaXFxcIiBpZD1cXFwiU2hhcGVcXFwiPjwvcGF0aD5cXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgPC9nPlxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIDwvZz5cXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIDwvZz5cXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgPC9nPlxcbiAgICAgICAgICAgICAgICAgICAgICAgIDwvZz5cXG4gICAgICAgICAgICAgICAgICAgIDwvc3ZnPlxcbiAgICAgICAgICAgICAgICAgICAgT3RoZXIgYXBwc1xcbiAgICAgICAgICAgICAgICA8L2E+XFxuICAgICAgICAgICAgICAgIDxkaXYgY2xhc3M9XFxcImJhYy0tYXBwcy1jb250YWluZXJcXFwiIGlkPVxcXCJiYWMtLXB1cmVzZGstYXBwcy1jb250YWluZXItLVxcXCI+XFxuICAgICAgICAgICAgICAgICAgICA8ZGl2IGlkPVxcXCJiYWMtLWFwcy1hY3R1YWwtY29udGFpbmVyXFxcIj48L2Rpdj5cXG4gICAgICAgICAgICAgICAgPC9kaXY+XFxuICAgICAgICAgICAgPC9kaXY+XFxuICAgICAgICAgICAgPGRpdiBjbGFzcz1cXFwiYmFjLS11c2VyLWF2YXRhclxcXCIgaWQ9XFxcImJhYy0tdXNlci1hdmF0YXItdG9wXFxcIj5cXG4gICAgICAgICAgICAgICAgPHNwYW4gY2xhc3M9XFxcImJhYy0tdXNlci1hdmF0YXItbmFtZVxcXCIgaWQ9XFxcImJhYy0tcHVyZXNkay11c2VyLWF2YXRhci0tXFxcIj48L3NwYW4+XFxuICAgICAgICAgICAgICAgIDxkaXYgaWQ9XFxcImJhYy0taW1hZ2UtY29udGFpbmVyLXRvcFxcXCI+PC9kaXY+XFxuICAgICAgICAgICAgPC9kaXY+XFxuICAgICAgICA8L2Rpdj5cXG4gICAgPC9kaXY+XFxuICAgIDxkaXYgaWQ9XFxcImJhYy0taW5mby1ibG9ja3Mtd3JhcHBlci0tXFxcIj48L2Rpdj5cXG48L2hlYWRlcj5cXG48ZGl2IGNsYXNzPVxcXCJiYWMtLXVzZXItc2lkZWJhclxcXCIgaWQ9XFxcImJhYy0tcHVyZXNkay11c2VyLXNpZGViYXItLVxcXCI+XFxuICAgIDxkaXYgY2xhc3M9XFxcImJhYy0tdXNlci1zaWRlYmFyLXdoaXRlLWJnXFxcIiBpZD1cXFwiYmFjLS11c2VyLXNpZGViYXItd2hpdGUtYmdcXFwiPlxcbiAgICAgICAgPGRpdiBpZD1cXFwiYmFjLS1wdXJlc2RrLXVzZXItZGV0YWlscy0tXFxcIj5cXG4gICAgICAgICAgICA8ZGl2IGNsYXNzPVxcXCJiYWMtdXNlci1hY291bnQtbGlzdC1pdGVtXFxcIj5cXG4gICAgICAgICAgICAgICAgPGEgaWQ9XFxcImJhYy0tbG9nb3V0LS1idXR0b25cXFwiIGhyZWY9XFxcIi9hcGkvdjEvc2lnbi1vZmZcXFwiPjxpIGNsYXNzPVxcXCJmYSBmYS1sb2dpbi1saW5lXFxcIj48L2k+IExvZyBvdXQ8L2E+XFxuICAgICAgICAgICAgPC9kaXY+XFxuICAgICAgICA8L2Rpdj5cXG4gICAgICAgIDxkaXYgY2xhc3M9XFxcImJhYy0tdXNlci1hcHBzXFxcIiBpZD1cXFwiYmFjLS1wdXJlc2RrLXVzZXItYnVzaW5lc3Nlcy0tXFxcIj5cXG4gICAgICAgIDwvZGl2PlxcbiAgICAgICAgPGRpdiBjbGFzcz1cXFwiYmFjLS11c2VyLWFjY291bnQtc2V0dGluZ3NcXFwiPlxcbiAgICAgICAgICAgIDxkaXYgaWQ9XFxcInB1cmVzZGstdmVyc2lvbi1udW1iZXJcXFwiIGNsYXNzPVxcXCJwdXJlc2RrLXZlcnNpb24tbnVtYmVyXFxcIj48L2Rpdj5cXG4gICAgICAgIDwvZGl2PlxcbiAgICA8L2Rpdj5cXG48L2Rpdj5cXG5cXG5cXG48ZGl2IGNsYXNzPVxcXCJiYWMtLWN1c3RvbS1tb2RhbCBhZGQtcXVlc3Rpb24tbW9kYWwgLS1pcy1vcGVuXFxcIiBpZD1cXFwiYmFjLS1jbG91ZGluYXJ5LS1tb2RhbFxcXCI+XFxuICAgIDxkaXYgY2xhc3M9XFxcImN1c3RvbS1tb2RhbF9fd3JhcHBlclxcXCI+XFxuICAgICAgICA8ZGl2IGNsYXNzPVxcXCJjdXN0b20tbW9kYWxfX2NvbnRlbnRcXFwiPlxcbiAgICAgICAgICAgIDxoMz5BZGQgaW1hZ2U8L2gzPlxcbiAgICAgICAgICAgIDxhIGNsYXNzPVxcXCJjdXN0b20tbW9kYWxfX2Nsb3NlLWJ0blxcXCIgaWQ9XFxcImJhYy0tY2xvdWRpbmFyeS0tY2xvc2VidG5cXFwiPjxpIGNsYXNzPVxcXCJmYSBmYS10aW1lcy1jaXJjbGVcXFwiPjwvaT48L2E+XFxuICAgICAgICA8L2Rpdj5cXG5cXG4gICAgICAgIDxkaXYgY2xhc3M9XFxcImN1c3RvbS1tb2RhbF9fY29udGVudFxcXCI+XFxuICAgICAgICAgICAgPGRpdiBjbGFzcz1cXFwiYmFjLXNlYXJjaCAtLWljb24tbGVmdFxcXCI+XFxuICAgICAgICAgICAgICAgIDxpbnB1dCBpZD1cXFwiYmFjLS1jbG91ZGluYXJ5LS1zZWFyY2gtaW5wdXRcXFwiIHR5cGU9XFxcInNlYXJjaFxcXCIgbmFtZT1cXFwic2VhcmNoXFxcIiBwbGFjZWhvbGRlcj1cXFwiU2VhcmNoIGZvciBpbWFnZXMuLi5cXFwiLz5cXG4gICAgICAgICAgICAgICAgPGRpdiBjbGFzcz1cXFwiYmFjLXNlYXJjaF9faWNvblxcXCI+PGkgY2xhc3M9XFxcImZhIGZhLXNlYXJjaFxcXCI+PC9pPjwvZGl2PlxcbiAgICAgICAgICAgIDwvZGl2PlxcbiAgICAgICAgICAgIDxici8+XFxuXFxuICAgICAgICAgICAgPGRpdiBjbGFzcz1cXFwiYmFjay1idXR0b25cXFwiIGlkPVxcXCJiYWMtLWNsb3VkaW5hcnktLWJhY2stYnV0dG9uLWNvbnRhaW5lclxcXCI+XFxuICAgICAgICAgICAgICAgIDxhIGNsYXNzPVxcXCJnb0JhY2tcXFwiIGlkPVxcXCJiYWMtLWNsb3VkaW5hcnktLWdvLWJhY2tcXFwiPjxpIGNsYXNzPVxcXCJmYSBmYS1hbmdsZS1sZWZ0XFxcIj48L2k+R28gQmFjazwvYT5cXG4gICAgICAgICAgICA8L2Rpdj5cXG5cXG4gICAgICAgICAgICA8YnIvPlxcbiAgICAgICAgICAgIDxkaXYgY2xhc3M9XFxcImNsb3VkLWltYWdlc1xcXCI+XFxuICAgICAgICAgICAgICAgIDxkaXYgY2xhc3M9XFxcImNsb3VkLWltYWdlc19fY29udGFpbmVyXFxcIiBpZD1cXFwiYmFjLS1jbG91ZGluYXJ5LWl0YW1zLWNvbnRhaW5lclxcXCI+PC9kaXY+XFxuXFxuICAgICAgICAgICAgICAgIDxkaXYgY2xhc3M9XFxcImNsb3VkLWltYWdlc19fcGFnaW5hdGlvblxcXCIgaWQ9XFxcImJhYy0tY2xvdWRpbmFyeS1wYWdpbmF0aW9uLWNvbnRhaW5lclxcXCI+XFxuICAgICAgICAgICAgICAgICAgICA8dWwgaWQ9XFxcImJhYy0tY2xvdWRpbmFyeS1hY3R1YWwtcGFnaW5hdGlvbi1jb250YWluZXJcXFwiPjwvdWw+XFxuICAgICAgICAgICAgICAgIDwvZGl2PlxcblxcbiAgICAgICAgICAgIDwvZGl2PlxcbiAgICAgICAgPC9kaXY+XFxuICAgIDwvZGl2PlxcbjwvZGl2PlxcbjxkaXYgaWQ9XFxcImJhYy0tLWludmFsaWQtYWNjb3VudFxcXCI+WW91IGhhdmUgc3dpdGNoZWQgdG8gYW5vdGhlciBhY2NvdW50IGZyb20gYW5vdGhlciB0YWIuIFBsZWFzZSBlaXRoZXIgY2xvc2UgdGhpcyBwYWdlXFxuICAgIG9yIHN3aXRjaCB0byB0aGUgcmlnaHQgYWNjb3VudCB0byByZS1lbmFibGUgYWNjZXNzPC9kaXY+XFxuXFxuPGlucHV0IHN0eWxlPVxcXCJkaXNwbGF5Om5vbmVcXFwiIHR5cGU9J2ZpbGUnIGlkPSdiYWMtLS1wdXJlc2RrLWF2YXRhci1maWxlJz5cXG48aW5wdXQgc3R5bGU9XFxcImRpc3BsYXk6bm9uZVxcXCIgdHlwZT0nYnV0dG9uJyBpZD0nYmFjLS0tcHVyZXNkay1hdmF0YXItc3VibWl0JyB2YWx1ZT0nVXBsb2FkISc+XCIpO1xucHBiYS5zZXRWZXJzaW9uTnVtYmVyKCcyLjkuNy1yYy40Jyk7XG53aW5kb3cuUFVSRVNESyA9IHBwYmE7XG52YXIgY3NzID0gJ2h0bWwsYm9keSxkaXYsc3BhbixhcHBsZXQsb2JqZWN0LGlmcmFtZSxoMSxoMixoMyxoNCxoNSxoNixwLGJsb2NrcXVvdGUscHJlLGEsYWJicixhY3JvbnltLGFkZHJlc3MsYmlnLGNpdGUsY29kZSxkZWwsZGZuLGVtLGltZyxpbnMsa2JkLHEscyxzYW1wLHNtYWxsLHN0cmlrZSxzdHJvbmcsc3ViLHN1cCx0dCx2YXIsYix1LGksY2VudGVyLGRsLGR0LGRkLG9sLHVsLGxpLGZpZWxkc2V0LGZvcm0sbGFiZWwsbGVnZW5kLHRhYmxlLGNhcHRpb24sdGJvZHksdGZvb3QsdGhlYWQsdHIsdGgsdGQsYXJ0aWNsZSxhc2lkZSxjYW52YXMsZGV0YWlscyxlbWJlZCxmaWd1cmUsZmlnY2FwdGlvbixmb290ZXIsaGVhZGVyLGhncm91cCxtZW51LG5hdixvdXRwdXQscnVieSxzZWN0aW9uLHN1bW1hcnksdGltZSxtYXJrLGF1ZGlvLHZpZGVve21hcmdpbjowO3BhZGRpbmc6MDtib3JkZXI6MDtmb250LXNpemU6MTAwJTtmb250OmluaGVyaXQ7dmVydGljYWwtYWxpZ246YmFzZWxpbmV9YXJ0aWNsZSxhc2lkZSxkZXRhaWxzLGZpZ2NhcHRpb24sZmlndXJlLGZvb3RlcixoZWFkZXIsaGdyb3VwLG1lbnUsbmF2LHNlY3Rpb257ZGlzcGxheTpibG9ja31ib2R5e2xpbmUtaGVpZ2h0OjF9b2wsdWx7bGlzdC1zdHlsZTpub25lfWJsb2NrcXVvdGUscXtxdW90ZXM6bm9uZX1ibG9ja3F1b3RlOmJlZm9yZSxibG9ja3F1b3RlOmFmdGVyLHE6YmVmb3JlLHE6YWZ0ZXJ7Y29udGVudDpcIlwiO2NvbnRlbnQ6bm9uZX10YWJsZXtib3JkZXItY29sbGFwc2U6Y29sbGFwc2U7Ym9yZGVyLXNwYWNpbmc6MH1ib2R5e292ZXJmbG93LXg6aGlkZGVufSNiYWMtLS1pbnZhbGlkLWFjY291bnR7cG9zaXRpb246Zml4ZWQ7d2lkdGg6MTAwJTtoZWlnaHQ6MTAwJTtiYWNrZ3JvdW5kOmJsYWNrO29wYWNpdHk6MC43O2NvbG9yOndoaXRlO2ZvbnQtc2l6ZToxOHB4O3RleHQtYWxpZ246Y2VudGVyO3BhZGRpbmctdG9wOjE1JTtkaXNwbGF5Om5vbmU7ei1pbmRleDoxMDAwMDAwMDB9I2JhYy0tLWludmFsaWQtYWNjb3VudC5pbnZhbGlke2Rpc3BsYXk6YmxvY2t9I2JhYy13cmFwcGVye2ZvbnQtZmFtaWx5OlwiVmVyZGFuYVwiLCBhcmlhbCwgc2Fucy1zZXJpZjtjb2xvcjp3aGl0ZTttaW4taGVpZ2h0OjEwMHZoO3Bvc2l0aW9uOnJlbGF0aXZlfS5iYWMtdXNlci1hY291bnQtbGlzdC1pdGVte2JhY2tncm91bmQtY29sb3I6dHJhbnNwYXJlbnQ7dGV4dC1hbGlnbjpjZW50ZXJ9LmJhYy11c2VyLWFjb3VudC1saXN0LWl0ZW0gI2JhYy0tbG9nb3V0LS1idXR0b257ZGlzcGxheTppbmxpbmUtYmxvY2s7cGFkZGluZzo0cHggOHB4O2JhY2tncm91bmQtY29sb3I6cmdiYSgyNTUsMjU1LDI1NSwwLjg1KTtmb250LXNpemU6MTJweDtib3JkZXItcmFkaXVzOjJweDttYXJnaW46NHB4IDAgMjZweCAwfS5iYWMtdXNlci1hY291bnQtbGlzdC1pdGVtIGZhLWxvZ2luLWxpbmV7bWFyZ2luLXJpZ2h0OjNweDtwb3NpdGlvbjpyZWxhdGl2ZTt0b3A6MXB4fS5iYWMtLWNvbnRhaW5lcnttYXgtd2lkdGg6MTE2MHB4O21hcmdpbjowIGF1dG99LmJhYy0tY29udGFpbmVyIC5iYWMtLXB1cmVzZGstYXBwLW5hbWUtLXtjb2xvcjojMzMzMzMzO3RleHQtZGVjb3JhdGlvbjpub25lO21hcmdpbi1yaWdodDoxNnB4O2ZvbnQtc2l6ZToxM3B4O2Rpc3BsYXk6aW5saW5lLWJsb2NrO3BhZGRpbmc6NnB4IDE2cHg7YmFja2dyb3VuZC1jb2xvcjpyZ2JhKDI1NSwyNTUsMjU1LDAuNzUpO3Bvc2l0aW9uOnJlbGF0aXZlO3RvcDotNnB4O2JvcmRlci1yYWRpdXM6NHB4O21hcmdpbi1sZWZ0OjIwcHh9LmJhYy0tY29udGFpbmVyIC5iYWMtLXB1cmVzZGstYXBwLW5hbWUtLTpob3ZlcntiYWNrZ3JvdW5kLWNvbG9yOnJnYmEoMjU1LDI1NSwyNTUsMC45KX0uYmFjLS1jb250YWluZXIgLmJhYy0tcHVyZXNkay1hcHAtbmFtZS0tIHN2Z3ttYXJnaW4tcmlnaHQ6NnB4fS5iYWMtLWNvbnRhaW5lciAjYXBwLW5hbWUtbGluay10by1yb290e3RleHQtZGVjb3JhdGlvbjpub25lfS5iYWMtLWhlYWRlci1hcHBze3Bvc2l0aW9uOmFic29sdXRlO3dpZHRoOjEwMCU7aGVpZ2h0OjUwcHg7YmFja2dyb3VuZC1jb2xvcjojNDc1MzY5O3BhZGRpbmc6NXB4IDEwcHg7ei1pbmRleDo5OTk5OTk5ICFpbXBvcnRhbnR9LmJhYy0taGVhZGVyLWFwcHMuYmFjLS1mdWxsd2lkdGh7cGFkZGluZzowfS5iYWMtLWhlYWRlci1hcHBzLmJhYy0tZnVsbHdpZHRoIC5iYWMtLWNvbnRhaW5lcnttYXgtd2lkdGg6dW5zZXQ7cGFkZGluZy1sZWZ0OjE2cHg7cGFkZGluZy1yaWdodDoxNnB4fS5iYWMtLWhlYWRlci1hcHBzIC5iYWMtLWNvbnRhaW5lcntoZWlnaHQ6MTAwJTtkaXNwbGF5OmZsZXg7YWxpZ24taXRlbXM6Y2VudGVyO2p1c3RpZnktY29udGVudDpzcGFjZS1iZXR3ZWVufS5iYWMtLWhlYWRlci1zZWFyY2h7cG9zaXRpb246cmVsYXRpdmV9LmJhYy0taGVhZGVyLXNlYXJjaCBpbnB1dHtjb2xvcjojZmZmO2ZvbnQtc2l6ZToxNHB4O2hlaWdodDozNXB4O2JhY2tncm91bmQtY29sb3I6IzZiNzU4NjtwYWRkaW5nOjAgNXB4IDAgMTBweDtib3JkZXI6bm9uZTtib3JkZXItcmFkaXVzOjNweDttaW4td2lkdGg6NDAwcHg7d2lkdGg6MTAwJX0uYmFjLS1oZWFkZXItc2VhcmNoIGlucHV0OmZvY3Vze291dGxpbmU6bm9uZX0uYmFjLS1oZWFkZXItc2VhcmNoIGlucHV0Ojotd2Via2l0LWlucHV0LXBsYWNlaG9sZGVye2ZvbnQtc3R5bGU6bm9ybWFsICFpbXBvcnRhbnQ7dGV4dC1hbGlnbjpjZW50ZXI7Y29sb3I6I2ZmZjtmb250LXNpemU6MTRweDtmb250LXdlaWdodDozMDA7bGV0dGVyLXNwYWNpbmc6MC41cHh9LmJhYy0taGVhZGVyLXNlYXJjaCBpbnB1dDo6LW1vei1wbGFjZWhvbGRlcntmb250LXN0eWxlOm5vcm1hbCAhaW1wb3J0YW50O3RleHQtYWxpZ246Y2VudGVyO2NvbG9yOiNmZmY7Zm9udC1zaXplOjE0cHg7Zm9udC13ZWlnaHQ6MzAwO2xldHRlci1zcGFjaW5nOjAuNXB4fS5iYWMtLWhlYWRlci1zZWFyY2ggaW5wdXQ6LW1zLWlucHV0LXBsYWNlaG9sZGVye2ZvbnQtc3R5bGU6bm9ybWFsICFpbXBvcnRhbnQ7dGV4dC1hbGlnbjpjZW50ZXI7Y29sb3I6I2ZmZjtmb250LXNpemU6MTRweDtmb250LXdlaWdodDozMDA7bGV0dGVyLXNwYWNpbmc6MC41cHh9LmJhYy0taGVhZGVyLXNlYXJjaCBpe3Bvc2l0aW9uOmFic29sdXRlO3RvcDo4cHg7cmlnaHQ6MTBweH0uYmFjLS11c2VyLWFjdGlvbnN7ZGlzcGxheTpmbGV4O2FsaWduLWl0ZW1zOmNlbnRlcn0uYmFjLS11c2VyLWFjdGlvbnMgI2JhYy0tcHVyZXNkay1hcHBzLXNlY3Rpb24tLXtib3JkZXItcmlnaHQ6MXB4IHNvbGlkICNhZGFkYWQ7aGVpZ2h0OjQwcHg7cGFkZGluZy10b3A6MTNweH0uYmFjLS11c2VyLWFjdGlvbnMgI2JhYy0tcHVyZXNkay1hcHBzLXNlY3Rpb24tLSBhLmJhYy0tcHVyZXNkay1hcHBzLW9uLW5hdmJhci0te2NvbG9yOiMzMzMzMzM7dGV4dC1kZWNvcmF0aW9uOm5vbmU7bWFyZ2luLXJpZ2h0OjE2cHg7Zm9udC1zaXplOjEzcHg7ZGlzcGxheTppbmxpbmUtYmxvY2s7cGFkZGluZzo2cHggMTZweDtiYWNrZ3JvdW5kLWNvbG9yOnJnYmEoMjU1LDI1NSwyNTUsMC43NSk7cG9zaXRpb246cmVsYXRpdmU7dG9wOi02cHg7Ym9yZGVyLXJhZGl1czo0cHh9LmJhYy0tdXNlci1hY3Rpb25zICNiYWMtLXB1cmVzZGstYXBwcy1zZWN0aW9uLS0gYS5iYWMtLXB1cmVzZGstYXBwcy1vbi1uYXZiYXItLS5kaXNhYmxlZHtwb2ludGVyLWV2ZW50czpub25lO2N1cnNvcjpub25lO2NvbG9yOiNhZGFkYWR9LmJhYy0tdXNlci1hY3Rpb25zICNiYWMtLXB1cmVzZGstYXBwcy1zZWN0aW9uLS0gYS5iYWMtLXB1cmVzZGstYXBwcy1vbi1uYXZiYXItLS5zZWxlY3RlZHtwb2ludGVyLWV2ZW50czpub25lO2JhY2tncm91bmQtY29sb3I6I2ZmZjtib3JkZXI6MXB4IHNvbGlkICMzMzMzMzN9LmJhYy0tdXNlci1hY3Rpb25zICNiYWMtLXB1cmVzZGstYXBwcy1zZWN0aW9uLS0gYS5iYWMtLXB1cmVzZGstYXBwcy1vbi1uYXZiYXItLTpob3ZlcntiYWNrZ3JvdW5kLWNvbG9yOnJnYmEoMjU1LDI1NSwyNTUsMC45KX0uYmFjLS11c2VyLWFjdGlvbnMgI2JhYy0tcHVyZXNkay1hcHBzLXNlY3Rpb24tLSBhLmJhYy0tcHVyZXNkay1hcHBzLW9uLW5hdmJhci0tIHN2Z3ttYXJnaW4tcmlnaHQ6NnB4fS5iYWMtLXVzZXItYWN0aW9ucyAuYmFjLS11c2VyLW5vdGlmaWNhdGlvbnN7cG9zaXRpb246cmVsYXRpdmV9LmJhYy0tdXNlci1hY3Rpb25zIC5iYWMtLXVzZXItbm90aWZpY2F0aW9ucyBpe2ZvbnQtc2l6ZToyMHB4fS5iYWMtLXVzZXItYWN0aW9ucyAjYmFjLS1wdXJlc2RrLS1sb2FkZXItLXtkaXNwbGF5Om5vbmV9LmJhYy0tdXNlci1hY3Rpb25zICNiYWMtLXB1cmVzZGstLWxvYWRlci0tLmJhYy0tcHVyZXNkay12aXNpYmxle2Rpc3BsYXk6YmxvY2t9LmJhYy0tdXNlci1hY3Rpb25zIC5iYWMtLXVzZXItbm90aWZpY2F0aW9ucy1jb3VudHtwb3NpdGlvbjphYnNvbHV0ZTtkaXNwbGF5OmlubGluZS1ibG9jaztoZWlnaHQ6MTVweDt3aWR0aDoxNXB4O2xpbmUtaGVpZ2h0OjE1cHg7Y29sb3I6I2ZmZjtmb250LXNpemU6MTBweDt0ZXh0LWFsaWduOmNlbnRlcjtiYWNrZ3JvdW5kLWNvbG9yOiNmYzNiMzA7Ym9yZGVyLXJhZGl1czo1MCU7dG9wOi01cHg7bGVmdDotNXB4fS5iYWMtLXVzZXItYWN0aW9ucyAuYmFjLS11c2VyLWF2YXRhciwuYmFjLS11c2VyLWFjdGlvbnMgLmJhYy0tdXNlci1ub3RpZmljYXRpb25ze21hcmdpbi1sZWZ0OjIwcHh9LmJhYy0tdXNlci1hY3Rpb25zIC5iYWMtLXVzZXItYXZhdGFye3Bvc2l0aW9uOnJlbGF0aXZlO292ZXJmbG93OmhpZGRlbjtib3JkZXItcmFkaXVzOjUwJX0uYmFjLS11c2VyLWFjdGlvbnMgLmJhYy0tdXNlci1hdmF0YXIgI2JhYy0taW1hZ2UtY29udGFpbmVyLXRvcHt3aWR0aDoxMDAlO2hlaWd0aDoxMDAlO3Bvc2l0aW9uOmFic29sdXRlO3RvcDowO2xlZnQ6MDt6LWluZGV4OjE7ZGlzcGxheTpub25lfS5iYWMtLXVzZXItYWN0aW9ucyAuYmFjLS11c2VyLWF2YXRhciAjYmFjLS1pbWFnZS1jb250YWluZXItdG9wIGltZ3t3aWR0aDoxMDAlO2hlaWdodDoxMDAlO2N1cnNvcjpwb2ludGVyfS5iYWMtLXVzZXItYWN0aW9ucyAuYmFjLS11c2VyLWF2YXRhciAjYmFjLS1pbWFnZS1jb250YWluZXItdG9wLmJhYy0tcHVyZXNkay12aXNpYmxle2Rpc3BsYXk6YmxvY2t9LmJhYy0tdXNlci1hY3Rpb25zIC5iYWMtLXVzZXItYXZhdGFyLW5hbWV7Y29sb3I6I2ZmZjtiYWNrZ3JvdW5kLWNvbG9yOiNhZGFkYWQ7ZGlzcGxheTppbmxpbmUtYmxvY2s7aGVpZ2h0OjM1cHg7d2lkdGg6MzVweDtsaW5lLWhlaWdodDozNXB4O3RleHQtYWxpZ246Y2VudGVyO2ZvbnQtc2l6ZToxNHB4fS5iYWMtLXVzZXItYXBwc3twb3NpdGlvbjpyZWxhdGl2ZX0jYmFjLS1wdXJlc2RrLWFwcHMtaWNvbi0te3dpZHRoOjIwcHg7ZGlzcGxheTppbmxpbmUtYmxvY2s7dGV4dC1hbGlnbjpjZW50ZXI7Zm9udC1zaXplOjE2cHh9LmJhYy0tcHVyZXNkay1hcHBzLW5hbWUtLXtmb250LXNpemU6OXB4O3dpZHRoOjIwcHg7dGV4dC1hbGlnbjpjZW50ZXJ9I2JhYy0tcHVyZXNkay11c2VyLWJ1c2luZXNzZXMtLXtoZWlnaHQ6Y2FsYygxMDB2aCAtIDI5NnB4KTtvdmVyZmxvdzphdXRvfS5iYWMtLWFwcHMtY29udGFpbmVye2JhY2tncm91bmQ6I2ZmZjtwb3NpdGlvbjphYnNvbHV0ZTt0b3A6NDVweDtyaWdodDowcHg7ZGlzcGxheTpmbGV4O3dpZHRoOjMwMHB4O2ZsZXgtd3JhcDp3cmFwO2JvcmRlci1yYWRpdXM6MTBweDtwYWRkaW5nOjE1cHg7cGFkZGluZy1yaWdodDowO2p1c3RpZnktY29udGVudDpzcGFjZS1iZXR3ZWVuO3RleHQtYWxpZ246bGVmdDstd2Via2l0LWJveC1zaGFkb3c6MCAwIDEwcHggMnB4IHJnYmEoMCwwLDAsMC4yKTtib3gtc2hhZG93OjAgMCAxMHB4IDJweCByZ2JhKDAsMCwwLDAuMik7b3BhY2l0eTowO3Zpc2liaWxpdHk6aGlkZGVuO3RyYW5zaXRpb246YWxsIDAuNHMgZWFzZTttYXgtaGVpZ2h0OjUwMHB4fS5iYWMtLWFwcHMtY29udGFpbmVyICNiYWMtLWFwcy1hY3R1YWwtY29udGFpbmVye2hlaWdodDoxMDAlO292ZXJmbG93OnNjcm9sbDttYXgtaGVpZ2h0OjQ3NXB4O3dpZHRoOjEwMCV9LmJhYy0tYXBwcy1jb250YWluZXIuYWN0aXZle29wYWNpdHk6MTt2aXNpYmlsaXR5OnZpc2libGV9LmJhYy0tYXBwcy1jb250YWluZXI6YmVmb3Jle2NvbnRlbnQ6XCJcIjt2ZXJ0aWNhbC1hbGlnbjptaWRkbGU7bWFyZ2luOmF1dG87cG9zaXRpb246YWJzb2x1dGU7ZGlzcGxheTpibG9jaztsZWZ0OjA7cmlnaHQ6LTE4NXB4O2JvdHRvbTpjYWxjKDEwMCUgLSA2cHgpO3dpZHRoOjEycHg7aGVpZ2h0OjEycHg7dHJhbnNmb3JtOnJvdGF0ZSg0NWRlZyk7YmFja2dyb3VuZC1jb2xvcjojZmZmfS5iYWMtLWFwcHMtY29udGFpbmVyIC5iYWMtLWFwcHN7d2lkdGg6MTAwJTtmb250LXNpemU6MjBweDttYXJnaW4tYm90dG9tOjE1cHg7dGV4dC1hbGlnbjpsZWZ0O2hlaWdodDozM3B4fS5iYWMtLWFwcHMtY29udGFpbmVyIC5iYWMtLWFwcHM6bGFzdC1jaGlsZHttYXJnaW4tYm90dG9tOjB9LmJhYy0tYXBwcy1jb250YWluZXIgLmJhYy0tYXBwczpob3ZlcntiYWNrZ3JvdW5kOiNmM2YzZjN9LmJhYy0tYXBwcy1jb250YWluZXIgLmJhYy0tYXBwcyBhLmJhYy0taW1hZ2UtbGlua3tkaXNwbGF5OmlubGluZS1ibG9jaztjb2xvcjojZmZmO3RleHQtZGVjb3JhdGlvbjpub25lO3dpZHRoOjMzcHg7aGVpZ2h0OjMzcHh9LmJhYy0tYXBwcy1jb250YWluZXIgLmJhYy0tYXBwcyBhLmJhYy0taW1hZ2UtbGluayBpbWd7d2lkdGg6MTAwJTtoZWlnaHQ6MTAwJX0uYmFjLS1hcHBzLWNvbnRhaW5lciAuYmFjLS1hcHBzIC5iYWMtLXB1cmVzZGstYXBwLXRleHQtY29udGFpbmVye2Rpc3BsYXk6aW5saW5lLWJsb2NrO3Bvc2l0aW9uOnJlbGF0aXZlO2xlZnQ6LTJweDt3aWR0aDpjYWxjKDEwMCUgLSA0MnB4KX0uYmFjLS1hcHBzLWNvbnRhaW5lciAuYmFjLS1hcHBzIC5iYWMtLXB1cmVzZGstYXBwLXRleHQtY29udGFpbmVyIGF7ZGlzcGxheTpibG9jazt0ZXh0LWRlY29yYXRpb246bm9uZTtjdXJzb3I6cG9pbnRlcjtwYWRkaW5nLWxlZnQ6OHB4fS5iYWMtLWFwcHMtY29udGFpbmVyIC5iYWMtLWFwcHMgLmJhYy0tcHVyZXNkay1hcHAtdGV4dC1jb250YWluZXIgLmJhYy0tYXBwLW5hbWV7d2lkdGg6MTAwJTtjb2xvcjojMDAwO2ZvbnQtc2l6ZToxM3B4O3BhZGRpbmctYm90dG9tOjRweH0uYmFjLS1hcHBzLWNvbnRhaW5lciAuYmFjLS1hcHBzIC5iYWMtLXB1cmVzZGstYXBwLXRleHQtY29udGFpbmVyIC5iYWMtLWFwcC1kZXNjcmlwdGlvbntjb2xvcjojOTE5MTkxO2ZvbnQtc2l6ZToxMXB4O2ZvbnQtc3R5bGU6aXRhbGljO2xpbmUtaGVpZ2h0OjEuM2VtO3Bvc2l0aW9uOnJlbGF0aXZlO3RvcDotMnB4O292ZXJmbG93OmhpZGRlbjt3aGl0ZS1zcGFjZTpub3dyYXA7dGV4dC1vdmVyZmxvdzplbGxpcHNpc30uYmFjLS11c2VyLXNpZGViYXJ7YmFja2dyb3VuZDp3aGl0ZTtmb250LWZhbWlseTpcIlZlcmRhbmFcIiwgYXJpYWwsIHNhbnMtc2VyaWY7Y29sb3I6IzMzMzMzMztoZWlnaHQ6Y2FsYygxMDB2aCAtIDUwcHgpO2JveC1zaXppbmc6Ym9yZGVyLWJveDt3aWR0aDozMjBweDtwb3NpdGlvbjpmaXhlZDt0b3A6NTBweDtyaWdodDowO3otaW5kZXg6OTk5OTk5O29wYWNpdHk6MDt0cmFuc2Zvcm06dHJhbnNsYXRlWCgxMDAlKTt0cmFuc2l0aW9uOmFsbCAwLjRzIGVhc2V9LmJhYy0tdXNlci1zaWRlYmFyIC5iYWMtLXVzZXItc2lkZWJhci13aGl0ZS1iZ3t3aWR0aDoxMDAlO2hlaWdodDoxMDAlfS5iYWMtLXVzZXItc2lkZWJhci5hY3RpdmV7b3BhY2l0eToxO3RyYW5zZm9ybTp0cmFuc2xhdGVYKDAlKTstd2Via2l0LWJveC1zaGFkb3c6LTFweCAwcHggMTJweCAwcHggcmdiYSgwLDAsMCwwLjc1KTstbW96LWJveC1zaGFkb3c6LTFweCAzcHggMTJweCAwcHggcmdiYSgwLDAsMCwwLjc1KTtib3gtc2hhZG93Oi0xcHggMHB4IDEycHggMHB4IHJnYmEoMCwwLDAsMC43NSl9LmJhYy0tdXNlci1zaWRlYmFyIC5iYWMtLXVzZXItbGlzdC1pdGVte2Rpc3BsYXk6ZmxleDtwb3NpdGlvbjpyZWxhdGl2ZTtjdXJzb3I6cG9pbnRlcjthbGlnbi1pdGVtczpjZW50ZXI7cGFkZGluZzoxMHB4IDEwcHggMTBweCA0MHB4O2JvcmRlci1ib3R0b206MXB4IHNvbGlkIHdoaXRlfS5iYWMtLXVzZXItc2lkZWJhciAuYmFjLS11c2VyLWxpc3QtaXRlbTpob3ZlcntiYWNrZ3JvdW5kLWNvbG9yOnJnYmEoMjU1LDI1NSwyNTUsMC4xKX0uYmFjLS11c2VyLXNpZGViYXIgLmJhYy0tdXNlci1saXN0LWl0ZW0gLmJhYy0tc2VsZWN0ZWQtYWNvdW50LWluZGljYXRvcntwb3NpdGlvbjphYnNvbHV0ZTtyaWdodDowO2hlaWdodDoxMDAlO3dpZHRoOjhweDtiYWNrZ3JvdW5kOiMzMzMzMzN9LmJhYy0tdXNlci1zaWRlYmFyIC5iYWMtLXVzZXItbGlzdC1pdGVtIC5iYWMtLXVzZXItbGlzdC1pdGVtLWltYWdle3dpZHRoOjQwcHg7aGVpZ2h0OjQwcHg7Ym9yZGVyLXJhZGl1czozcHg7Ym9yZGVyOjFweCBzb2xpZCAjMzMzMzMzO292ZXJmbG93OmhpZGRlbjttYXJnaW4tcmlnaHQ6MjBweDtkaXNwbGF5OmZsZXg7YWxpZ24taXRlbXM6Y2VudGVyO2p1c3RpZnktY29udGVudDpjZW50ZXJ9LmJhYy0tdXNlci1zaWRlYmFyIC5iYWMtLXVzZXItbGlzdC1pdGVtIC5iYWMtLXVzZXItbGlzdC1pdGVtLWltYWdlPmltZ3t3aWR0aDphdXRvO2hlaWdodDphdXRvO21heC13aWR0aDoxMDAlO21heC1oZWlnaHQ6MTAwJX0uYmFjLS11c2VyLXNpZGViYXIgLmJhYy0tdXNlci1saXN0LWl0ZW0gc3Bhbnt3aWR0aDoxMDAlO2Rpc3BsYXk6YmxvY2s7bWFyZ2luLWJvdHRvbTo1cHh9LmJhYy0tdXNlci1zaWRlYmFyIC5iYWMtdXNlci1hcHAtZGV0YWlscyBzcGFue2ZvbnQtc2l6ZToxMnB4fS5iYWMtLXVzZXItc2lkZWJhciAucHVyZXNkay12ZXJzaW9uLW51bWJlcnt3aWR0aDoxMDAlO3RleHQtYWxpZ246cmlnaHQ7cGFkZGluZy1yaWdodDoxMHB4O3Bvc2l0aW9uOmFic29sdXRlO2ZvbnQtc2l6ZTo4cHg7b3BhY2l0eTowLjU7cmlnaHQ6MDtib3R0b206MH0uYmFjLS11c2VyLXNpZGViYXItaW5mb3tkaXNwbGF5OmZsZXg7anVzdGlmeS1jb250ZW50OmNlbnRlcjtmbGV4LXdyYXA6d3JhcDt0ZXh0LWFsaWduOmNlbnRlcjtwYWRkaW5nOjIwcHggMjBweCAxNXB4fS5iYWMtLXVzZXItc2lkZWJhci1pbmZvIC5iYWMtLXVzZXItaW1hZ2V7Ym9yZGVyOjFweCAjYWRhZGFkIHNvbGlkO292ZXJmbG93OmhpZGRlbjtib3JkZXItcmFkaXVzOjUwJTtwb3NpdGlvbjpyZWxhdGl2ZTtjdXJzb3I6cG9pbnRlcjtkaXNwbGF5OmlubGluZS1ibG9jaztoZWlnaHQ6ODBweDt3aWR0aDo4MHB4O2xpbmUtaGVpZ2h0OjgwcHg7dGV4dC1hbGlnbjpjZW50ZXI7Y29sb3I6I2ZmZjtib3JkZXItcmFkaXVzOjUwJTtiYWNrZ3JvdW5kLWNvbG9yOiNhZGFkYWQ7bWFyZ2luLWJvdHRvbToxNXB4fS5iYWMtLXVzZXItc2lkZWJhci1pbmZvIC5iYWMtLXVzZXItaW1hZ2UgI2JhYy0tdXNlci1pbWFnZS1maWxle2Rpc3BsYXk6bm9uZTtwb3NpdGlvbjphYnNvbHV0ZTt6LWluZGV4OjE7dG9wOjA7bGVmdDowO3dpZHRoOjEwMCU7aGVpZ2h0OjEwMCV9LmJhYy0tdXNlci1zaWRlYmFyLWluZm8gLmJhYy0tdXNlci1pbWFnZSAjYmFjLS11c2VyLWltYWdlLWZpbGUgaW1ne3dpZHRoOjEwMCU7aGVpZ2h0OjEwMCV9LmJhYy0tdXNlci1zaWRlYmFyLWluZm8gLmJhYy0tdXNlci1pbWFnZSAjYmFjLS11c2VyLWltYWdlLWZpbGUuYmFjLS1wdXJlc2RrLXZpc2libGV7ZGlzcGxheTpibG9ja30uYmFjLS11c2VyLXNpZGViYXItaW5mbyAuYmFjLS11c2VyLWltYWdlICNiYWMtLXVzZXItaW1hZ2UtdXBsb2FkLXByb2dyZXNze3Bvc2l0aW9uOmFic29sdXRlO3BhZGRpbmctdG9wOjEwcHg7dG9wOjA7YmFja2dyb3VuZDojNjY2O3otaW5kZXg6NDtkaXNwbGF5Om5vbmU7d2lkdGg6MTAwJTtoZWlnaHQ6MTAwJX0uYmFjLS11c2VyLXNpZGViYXItaW5mbyAuYmFjLS11c2VyLWltYWdlICNiYWMtLXVzZXItaW1hZ2UtdXBsb2FkLXByb2dyZXNzLmJhYy0tcHVyZXNkay12aXNpYmxle2Rpc3BsYXk6YmxvY2t9LmJhYy0tdXNlci1zaWRlYmFyLWluZm8gLmJhYy0tdXNlci1pbWFnZSBpe2ZvbnQtc2l6ZTozMnB4O2ZvbnQtc2l6ZTozMnB4O3otaW5kZXg6MDtwb3NpdGlvbjphYnNvbHV0ZTt3aWR0aDoxMDAlO2xlZnQ6MDtiYWNrZ3JvdW5kLWNvbG9yOnJnYmEoMCwwLDAsMC41KX0uYmFjLS11c2VyLXNpZGViYXItaW5mbyAuYmFjLS11c2VyLWltYWdlOmhvdmVyIGl7ei1pbmRleDozfS5iYWMtLXVzZXItc2lkZWJhci1pbmZvIC5iYWMtLXVzZXItbmFtZXt3aWR0aDoxMDAlO3RleHQtYWxpZ246Y2VudGVyO2ZvbnQtc2l6ZToxOHB4O21hcmdpbi1ib3R0b206MTBweH0uYmFjLS11c2VyLXNpZGViYXItaW5mbyAuYmFjLS11c2VyLWVtYWlse2ZvbnQtc2l6ZToxMnB4O2ZvbnQtd2VpZ2h0OjMwMH0uYmFjLS11c2VyLWFjY291bnQtc2V0dGluZ3N7cG9zaXRpb246YWJzb2x1dGU7Ym90dG9tOjEwcHg7bGVmdDoyMHB4O3dpZHRoOjkwJTtoZWlnaHQ6MTBweH0jYmFjLS1wdXJlc2RrLWFjY291bnQtbG9nby0te2N1cnNvcjpwb2ludGVyO3Bvc2l0aW9uOnJlbGF0aXZlO2NvbG9yOiNmZmZ9I2JhYy0tcHVyZXNkay1hY2NvdW50LWxvZ28tLSBpbWd7aGVpZ2h0OjI4cHg7dG9wOjNweDtwb3NpdGlvbjpyZWxhdGl2ZX0jYmFjLS1pbmZvLWJsb2Nrcy13cmFwcGVyLS17cG9zaXRpb246Zml4ZWQ7dG9wOjBweDtoZWlnaHQ6YXV0b30jYmFjLS1pbmZvLWJsb2Nrcy13cmFwcGVyLS0gLmJhYy0tcHVyZXNkay1pbmZvLWJveC0te2JvcmRlci1yYWRpdXM6MCAwIDNweCAzcHg7b3ZlcmZsb3c6aGlkZGVuO3otaW5kZXg6OTk5OTk5OTk7cG9zaXRpb246cmVsYXRpdmU7bWFyZ2luLXRvcDowO3dpZHRoOjQ3MHB4O2xlZnQ6Y2FsYyg1MHZ3IC0gMjM1cHgpO2hlaWdodDowcHg7LXdlYmtpdC10cmFuc2l0aW9uOnRvcCAwLjRzO3RyYW5zaXRpb246YWxsIDAuNHN9I2JhYy0taW5mby1ibG9ja3Mtd3JhcHBlci0tIC5iYWMtLXB1cmVzZGstaW5mby1ib3gtLS5iYWMtLXN1Y2Nlc3N7YmFja2dyb3VuZDojMTREQTlFfSNiYWMtLWluZm8tYmxvY2tzLXdyYXBwZXItLSAuYmFjLS1wdXJlc2RrLWluZm8tYm94LS0uYmFjLS1zdWNjZXNzIC5iYWMtLWlubmVyLWluZm8tYm94LS0gZGl2LmJhYy0taW5mby1pY29uLS0uZmEtc3VjY2Vzc3tkaXNwbGF5OmlubGluZS1ibG9ja30jYmFjLS1pbmZvLWJsb2Nrcy13cmFwcGVyLS0gLmJhYy0tcHVyZXNkay1pbmZvLWJveC0tLmJhYy0taW5mb3tiYWNrZ3JvdW5kLWNvbG9yOiM1QkMwREV9I2JhYy0taW5mby1ibG9ja3Mtd3JhcHBlci0tIC5iYWMtLXB1cmVzZGstaW5mby1ib3gtLS5iYWMtLWluZm8gLmJhYy0taW5uZXItaW5mby1ib3gtLSBkaXYuYmFjLS1pbmZvLWljb24tLS5mYS1pbmZvLTF7ZGlzcGxheTppbmxpbmUtYmxvY2t9I2JhYy0taW5mby1ibG9ja3Mtd3JhcHBlci0tIC5iYWMtLXB1cmVzZGstaW5mby1ib3gtLS5iYWMtLXdhcm5pbmd7YmFja2dyb3VuZDojRjBBRDRFfSNiYWMtLWluZm8tYmxvY2tzLXdyYXBwZXItLSAuYmFjLS1wdXJlc2RrLWluZm8tYm94LS0uYmFjLS13YXJuaW5nIC5iYWMtLWlubmVyLWluZm8tYm94LS0gZGl2LmJhYy0taW5mby1pY29uLS0uZmEtd2FybmluZ3tkaXNwbGF5OmlubGluZS1ibG9ja30jYmFjLS1pbmZvLWJsb2Nrcy13cmFwcGVyLS0gLmJhYy0tcHVyZXNkay1pbmZvLWJveC0tLmJhYy0tZXJyb3J7YmFja2dyb3VuZDojRUY0MTAwfSNiYWMtLWluZm8tYmxvY2tzLXdyYXBwZXItLSAuYmFjLS1wdXJlc2RrLWluZm8tYm94LS0uYmFjLS1lcnJvciAuYmFjLS1pbm5lci1pbmZvLWJveC0tIGRpdi5iYWMtLWluZm8taWNvbi0tLmZhLWVycm9ye2Rpc3BsYXk6aW5saW5lLWJsb2NrfSNiYWMtLWluZm8tYmxvY2tzLXdyYXBwZXItLSAuYmFjLS1wdXJlc2RrLWluZm8tYm94LS0gLmJhYy0tdGltZXJ7LXdlYmtpdC10cmFuc2l0aW9uLXRpbWluZy1mdW5jdGlvbjpsaW5lYXI7dHJhbnNpdGlvbi10aW1pbmctZnVuY3Rpb246bGluZWFyO3Bvc2l0aW9uOmFic29sdXRlO2JvdHRvbTowcHg7b3BhY2l0eTowLjU7aGVpZ2h0OjJweCAhaW1wb3J0YW50O2JhY2tncm91bmQ6d2hpdGU7d2lkdGg6MCV9I2JhYy0taW5mby1ibG9ja3Mtd3JhcHBlci0tIC5iYWMtLXB1cmVzZGstaW5mby1ib3gtLSAuYmFjLS10aW1lci5iYWMtLWZ1bGx3aWR0aHt3aWR0aDoxMDAlfSNiYWMtLWluZm8tYmxvY2tzLXdyYXBwZXItLSAuYmFjLS1wdXJlc2RrLWluZm8tYm94LS0uYmFjLS1hY3RpdmUtLXtoZWlnaHQ6YXV0bzttYXJnaW4tdG9wOjVweH0jYmFjLS1pbmZvLWJsb2Nrcy13cmFwcGVyLS0gLmJhYy0tcHVyZXNkay1pbmZvLWJveC0tIC5iYWMtLWlubmVyLWluZm8tYm94LS17d2lkdGg6MTAwJTtwYWRkaW5nOjExcHggMTVweDtjb2xvcjp3aGl0ZX0jYmFjLS1pbmZvLWJsb2Nrcy13cmFwcGVyLS0gLmJhYy0tcHVyZXNkay1pbmZvLWJveC0tIC5iYWMtLWlubmVyLWluZm8tYm94LS0gZGl2e2Rpc3BsYXk6aW5saW5lLWJsb2NrO2hlaWdodDoxOHB4O3Bvc2l0aW9uOnJlbGF0aXZlfSNiYWMtLWluZm8tYmxvY2tzLXdyYXBwZXItLSAuYmFjLS1wdXJlc2RrLWluZm8tYm94LS0gLmJhYy0taW5uZXItaW5mby1ib3gtLSBkaXYuYmFjLS1pbmZvLWljb24tLXtkaXNwbGF5Om5vbmU7dG9wOjBweH0jYmFjLS1pbmZvLWJsb2Nrcy13cmFwcGVyLS0gLmJhYy0tcHVyZXNkay1pbmZvLWJveC0tIC5iYWMtLWlubmVyLWluZm8tYm94LS0gLmJhYy0taW5mby1pY29uLS17bWFyZ2luLXJpZ2h0OjE1cHg7d2lkdGg6MTBweDt0b3A6MnB4fSNiYWMtLWluZm8tYmxvY2tzLXdyYXBwZXItLSAuYmFjLS1wdXJlc2RrLWluZm8tYm94LS0gLmJhYy0taW5uZXItaW5mby1ib3gtLSAuYmFjLS1pbmZvLW1haW4tdGV4dC0te3dpZHRoOjM4MHB4O21hcmdpbi1yaWdodDoxNXB4O2ZvbnQtc2l6ZToxMnB4O3RleHQtYWxpZ246Y2VudGVyfSNiYWMtLWluZm8tYmxvY2tzLXdyYXBwZXItLSAuYmFjLS1wdXJlc2RrLWluZm8tYm94LS0gLmJhYy0taW5uZXItaW5mby1ib3gtLSAuYmFjLS1pbmZvLWNsb3NlLWJ1dHRvbi0te3dpZHRoOjEwcHg7Y3Vyc29yOnBvaW50ZXI7dG9wOjJweH1AbWVkaWEgKG1pbi13aWR0aDogNjAwcHgpey5iYWMtLWNvbnRhaW5lci5iYWMtLWZ1bGx3aWR0aCAuYmFjLS1jb250YWluZXJ7cGFkZGluZy1sZWZ0OjI0cHg7cGFkZGluZy1yaWdodDoyNHB4fX1AbWVkaWEgKG1pbi13aWR0aDogOTYwcHgpey5iYWMtLWNvbnRhaW5lci5iYWMtLWZ1bGx3aWR0aCAuYmFjLS1jb250YWluZXJ7cGFkZGluZy1sZWZ0OjMycHg7cGFkZGluZy1yaWdodDozMnB4fX0uYmFjLS1jdXN0b20tbW9kYWx7cG9zaXRpb246Zml4ZWQ7d2lkdGg6NzAlO2hlaWdodDo4MCU7bWluLXdpZHRoOjQwMHB4O2xlZnQ6MDtyaWdodDowO3RvcDowO2JvdHRvbTowO21hcmdpbjphdXRvO2JvcmRlcjoxcHggc29saWQgIzk3OTc5Nztib3JkZXItcmFkaXVzOjVweDtib3gtc2hhZG93OjAgMCA3MXB4IDAgIzJGMzg0OTtiYWNrZ3JvdW5kOiNmZmY7ei1pbmRleDo5OTk7b3ZlcmZsb3c6YXV0bztkaXNwbGF5Om5vbmV9LmJhYy0tY3VzdG9tLW1vZGFsLmlzLW9wZW57ZGlzcGxheTpibG9ja30uYmFjLS1jdXN0b20tbW9kYWwgLmN1c3RvbS1tb2RhbF9fY2xvc2UtYnRue3RleHQtZGVjb3JhdGlvbjpub25lO3BhZGRpbmctdG9wOjJweDtsaW5lLWhlaWdodDoxOHB4O2hlaWdodDoyMHB4O3dpZHRoOjIwcHg7Ym9yZGVyLXJhZGl1czo1MCU7Y29sb3I6IzkwOWJhNDt0ZXh0LWFsaWduOmNlbnRlcjtwb3NpdGlvbjphYnNvbHV0ZTt0b3A6MjBweDtyaWdodDoyMHB4O2ZvbnQtc2l6ZToyMHB4fS5iYWMtLWN1c3RvbS1tb2RhbCAuY3VzdG9tLW1vZGFsX19jbG9zZS1idG46aG92ZXJ7dGV4dC1kZWNvcmF0aW9uOm5vbmU7Y29sb3I6IzQ1NTA2NjtjdXJzb3I6cG9pbnRlcn0uYmFjLS1jdXN0b20tbW9kYWwgLmN1c3RvbS1tb2RhbF9fd3JhcHBlcntoZWlnaHQ6MTAwJTtkaXNwbGF5OmZsZXg7ZmxleC1kaXJlY3Rpb246Y29sdW1ufS5iYWMtLWN1c3RvbS1tb2RhbCAuY3VzdG9tLW1vZGFsX193cmFwcGVyIGlmcmFtZXt3aWR0aDoxMDAlO2hlaWdodDoxMDAlfS5iYWMtLWN1c3RvbS1tb2RhbCAuY3VzdG9tLW1vZGFsX19jb250ZW50LXdyYXBwZXJ7aGVpZ2h0OjEwMCU7b3ZlcmZsb3c6YXV0bzttYXJnaW4tYm90dG9tOjEwNHB4O2JvcmRlci10b3A6MnB4IHNvbGlkICNDOUNERDd9LmJhYy0tY3VzdG9tLW1vZGFsIC5jdXN0b20tbW9kYWxfX2NvbnRlbnQtd3JhcHBlci5uby1tYXJnaW57bWFyZ2luLWJvdHRvbTowfS5iYWMtLWN1c3RvbS1tb2RhbCAuY3VzdG9tLW1vZGFsX19jb250ZW50e3BhZGRpbmc6MjBweDtwb3NpdGlvbjpyZWxhdGl2ZX0uYmFjLS1jdXN0b20tbW9kYWwgLmN1c3RvbS1tb2RhbF9fY29udGVudCBoM3tjb2xvcjojMkYzODQ5O2ZvbnQtc2l6ZToyMHB4O2ZvbnQtd2VpZ2h0OjYwMDtsaW5lLWhlaWdodDoyN3B4fS5iYWMtLWN1c3RvbS1tb2RhbCAuY3VzdG9tLW1vZGFsX19zYXZle3Bvc2l0aW9uOmFic29sdXRlO3JpZ2h0OjA7Ym90dG9tOjA7d2lkdGg6MTAwJTtwYWRkaW5nOjMwcHggMzJweDtiYWNrZ3JvdW5kLWNvbG9yOiNGMkYyRjR9LmJhYy0tY3VzdG9tLW1vZGFsIC5jdXN0b20tbW9kYWxfX3NhdmUgYSwuYmFjLS1jdXN0b20tbW9kYWwgLmN1c3RvbS1tb2RhbF9fc2F2ZSBidXR0b257Zm9udC1zaXplOjE0cHg7bGluZS1oZWlnaHQ6MjJweDtoZWlnaHQ6NDRweDt3aWR0aDoxMDAlfS5iYWMtLWN1c3RvbS1tb2RhbCAuY3VzdG9tLW1vZGFsX19zcGxpdHRlcntoZWlnaHQ6MzBweDtsaW5lLWhlaWdodDozMHB4O3BhZGRpbmc6MCAyMHB4O2JvcmRlci1jb2xvcjojRDNEM0QzO2JvcmRlci1zdHlsZTpzb2xpZDtib3JkZXItd2lkdGg6MXB4IDAgMXB4IDA7YmFja2dyb3VuZC1jb2xvcjojRjBGMEYwO2NvbG9yOiM2NzZGODI7Zm9udC1zaXplOjEzcHg7Zm9udC13ZWlnaHQ6NjAwfS5iYWMtLWN1c3RvbS1tb2RhbCAuY3VzdG9tLW1vZGFsX19ib3h7ZGlzcGxheTppbmxpbmUtYmxvY2s7dmVydGljYWwtYWxpZ246bWlkZGxlO2hlaWdodDoxNjVweDt3aWR0aDoxNjVweDtib3JkZXI6MnB4IHNvbGlkIHJlZDtib3JkZXItcmFkaXVzOjVweDt0ZXh0LWFsaWduOmNlbnRlcjtmb250LXNpemU6MTJweDtmb250LXdlaWdodDo2MDA7Y29sb3I6IzkwOTdBODt0ZXh0LWRlY29yYXRpb246bm9uZTttYXJnaW46MTBweCAyMHB4IDEwcHggMDt0cmFuc2l0aW9uOjAuMXMgYWxsfS5iYWMtLWN1c3RvbS1tb2RhbCAuY3VzdG9tLW1vZGFsX19ib3ggaXtmb250LXNpemU6NzBweDtkaXNwbGF5OmJsb2NrO21hcmdpbjoyNXB4IDB9LmJhYy0tY3VzdG9tLW1vZGFsIC5jdXN0b20tbW9kYWxfX2JveC5hY3RpdmV7Y29sb3I6eWVsbG93O2JvcmRlci1jb2xvcjp5ZWxsb3c7dGV4dC1kZWNvcmF0aW9uOm5vbmV9LmJhYy0tY3VzdG9tLW1vZGFsIC5jdXN0b20tbW9kYWxfX2JveDpob3ZlciwuYmFjLS1jdXN0b20tbW9kYWwgLmN1c3RvbS1tb2RhbF9fYm94OmFjdGl2ZSwuYmFjLS1jdXN0b20tbW9kYWwgLmN1c3RvbS1tb2RhbF9fYm94OmZvY3Vze2NvbG9yOiMxQUMwQjQ7Ym9yZGVyLWNvbG9yOnllbGxvdzt0ZXh0LWRlY29yYXRpb246bm9uZX0uY2xvdWQtaW1hZ2VzX19jb250YWluZXJ7ZGlzcGxheTpmbGV4O2ZsZXgtd3JhcDp3cmFwO2p1c3RpZnktY29udGVudDpmbGV4LXN0YXJ0fS5jbG91ZC1pbWFnZXNfX3BhZ2luYXRpb257cGFkZGluZzoyMHB4fS5jbG91ZC1pbWFnZXNfX3BhZ2luYXRpb24gbGl7ZGlzcGxheTppbmxpbmUtYmxvY2s7bWFyZ2luLXJpZ2h0OjEwcHh9LmNsb3VkLWltYWdlc19fcGFnaW5hdGlvbiBsaSBhe2NvbG9yOiNmZmY7YmFja2dyb3VuZC1jb2xvcjojNWU2Nzc2O2JvcmRlci1yYWRpdXM6MjBweDt0ZXh0LWRlY29yYXRpb246bm9uZTtkaXNwbGF5OmJsb2NrO2ZvbnQtd2VpZ2h0OjIwMDtoZWlnaHQ6MzVweDt3aWR0aDozNXB4O2xpbmUtaGVpZ2h0OjM1cHg7dGV4dC1hbGlnbjpjZW50ZXJ9LmNsb3VkLWltYWdlc19fcGFnaW5hdGlvbiBsaS5hY3RpdmUgYXtiYWNrZ3JvdW5kLWNvbG9yOiMyZjM4NDl9LmNsb3VkLWltYWdlc19faXRlbXt3aWR0aDoxNTVweDtoZWlnaHQ6MTcwcHg7Ym9yZGVyOjFweCBzb2xpZCAjZWVlO2JhY2tncm91bmQtY29sb3I6I2ZmZjtib3JkZXItcmFkaXVzOjNweDttYXJnaW46MCAxNXB4IDE1cHggMDt0ZXh0LWFsaWduOmNlbnRlcjtwb3NpdGlvbjpyZWxhdGl2ZTtjdXJzb3I6cG9pbnRlcn0uY2xvdWQtaW1hZ2VzX19pdGVtIC5jbG91ZC1pbWFnZXNfX2l0ZW1fX3R5cGV7aGVpZ2h0OjExNXB4O2ZvbnQtc2l6ZTo5MHB4O2xpbmUtaGVpZ2h0OjE0MHB4O2JvcmRlci10b3AtbGVmdC1yYWRpdXM6M3B4O2JvcmRlci10b3AtcmlnaHQtcmFkaXVzOjNweDtjb2xvcjojYTJhMmEyO2JhY2tncm91bmQtY29sb3I6I2U5ZWFlYn0uY2xvdWQtaW1hZ2VzX19pdGVtIC5jbG91ZC1pbWFnZXNfX2l0ZW1fX3R5cGU+aW1ne3dpZHRoOmF1dG87aGVpZ2h0OmF1dG87bWF4LXdpZHRoOjEwMCU7bWF4LWhlaWdodDoxMDAlfS5jbG91ZC1pbWFnZXNfX2l0ZW0gLmNsb3VkLWltYWdlc19faXRlbV9fZGV0YWlsc3twYWRkaW5nOjEwcHggMH0uY2xvdWQtaW1hZ2VzX19pdGVtIC5jbG91ZC1pbWFnZXNfX2l0ZW1fX2RldGFpbHMgLmNsb3VkLWltYWdlc19faXRlbV9fZGV0YWlsc19fbmFtZXtmb250LXNpemU6MTJweDtvdXRsaW5lOm5vbmU7cGFkZGluZzowIDEwcHg7Y29sb3I6I2E1YWJiNTtib3JkZXI6bm9uZTt3aWR0aDoxMDAlO2JhY2tncm91bmQtY29sb3I6dHJhbnNwYXJlbnQ7aGVpZ2h0OjE1cHg7ZGlzcGxheTppbmxpbmUtYmxvY2s7d29yZC1icmVhazpicmVhay1hbGx9LmNsb3VkLWltYWdlc19faXRlbSAuY2xvdWQtaW1hZ2VzX19pdGVtX19kZXRhaWxzIC5jbG91ZC1pbWFnZXNfX2l0ZW1fX2RldGFpbHNfX2RhdGV7Zm9udC1zaXplOjEwcHg7Ym90dG9tOjZweDt3aWR0aDoxNTVweDtoZWlnaHQ6MTVweDtjb2xvcjojYTVhYmI1O2Rpc3BsYXk6aW5saW5lLWJsb2NrfS5jbG91ZC1pbWFnZXNfX2l0ZW0gLmNsb3VkLWltYWdlc19faXRlbV9fYWN0aW9uc3tkaXNwbGF5OmZsZXg7YWxpZ24taXRlbXM6Y2VudGVyO2p1c3RpZnktY29udGVudDpjZW50ZXI7cG9zaXRpb246YWJzb2x1dGU7dG9wOjA7bGVmdDowO3dpZHRoOjEwMCU7aGVpZ2h0OjExNXB4O2JhY2tncm91bmQtY29sb3I6cmdiYSg3OCw4Myw5MSwwLjgzKTtvcGFjaXR5OjA7dmlzaWJpbGl0eTpoaWRkZW47Ym9yZGVyLXRvcC1sZWZ0LXJhZGl1czozcHg7Ym9yZGVyLXRvcC1yaWdodC1yYWRpdXM6M3B4O3RleHQtYWxpZ246Y2VudGVyO3RyYW5zaXRpb246MC4zcyBvcGFjaXR5fS5jbG91ZC1pbWFnZXNfX2l0ZW0gLmNsb3VkLWltYWdlc19faXRlbV9fYWN0aW9ucyBhe2ZvbnQtc2l6ZToxNnB4O2NvbG9yOiNmZmY7dGV4dC1kZWNvcmF0aW9uOm5vbmV9LmNsb3VkLWltYWdlc19faXRlbTpob3ZlciAuY2xvdWQtaW1hZ2VzX19pdGVtIC5jbG91ZC1pbWFnZXNfX2l0ZW1fX2FjdGlvbnN7b3BhY2l0eToxO3Zpc2liaWxpdHk6dmlzaWJsZX0nLFxuICAgIGhlYWQgPSBkb2N1bWVudC5oZWFkIHx8IGRvY3VtZW50LmdldEVsZW1lbnRzQnlUYWdOYW1lKCdoZWFkJylbMF0sXG4gICAgc3R5bGUgPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KCdzdHlsZScpO1xuc3R5bGUudHlwZSA9ICd0ZXh0L2Nzcyc7XG5cbmlmIChzdHlsZS5zdHlsZVNoZWV0KSB7XG4gIHN0eWxlLnN0eWxlU2hlZXQuY3NzVGV4dCA9IGNzcztcbn0gZWxzZSB7XG4gIHN0eWxlLmFwcGVuZENoaWxkKGRvY3VtZW50LmNyZWF0ZVRleHROb2RlKGNzcykpO1xufVxuXG5oZWFkLmFwcGVuZENoaWxkKHN0eWxlKTtcbnZhciBsaW5rID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudCgnbGluaycpO1xubGluay5ocmVmID0gJ2h0dHBzOi8vYWNjZXNzLWZvbnRzLnB1cmVwcm9maWxlLmNvbS9zdHlsZXMuY3NzJztcbmxpbmsucmVsID0gJ3N0eWxlc2hlZXQnO1xuZG9jdW1lbnQuZ2V0RWxlbWVudHNCeVRhZ05hbWUoJ2hlYWQnKVswXS5hcHBlbmRDaGlsZChsaW5rKTtcbm1vZHVsZS5leHBvcnRzID0gcHBiYTsiLCJcInVzZSBzdHJpY3RcIjtcblxudmFyIGxzID0gd2luZG93LmxvY2FsU3RvcmFnZTtcbnZhciBhY2NvdW50S2V5ID0gXCJfX19fYWN0aXZlQWNjb3VudF9fX19cIjtcbnZhciBBQ0cgPSB7XG4gIGluaXRpYWxpc2U6IGZ1bmN0aW9uIGluaXRpYWxpc2UodGFiQWNjb3VudCwgdmFsaWRhdGUsIGludmFsaWRhdGUpIHtcbiAgICB3aW5kb3cuYWRkRXZlbnRMaXN0ZW5lcignc3RvcmFnZScsIGZ1bmN0aW9uICgpIHtcbiAgICAgIHZhciBuZXdBY2NvdW50ID0gbHMuZ2V0SXRlbShhY2NvdW50S2V5KTtcblxuICAgICAgaWYgKG5ld0FjY291bnQpIHtcbiAgICAgICAgaWYgKG5ld0FjY291bnQgIT09IHRhYkFjY291bnQpIHtcbiAgICAgICAgICBpbnZhbGlkYXRlKCk7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgdmFsaWRhdGUoKTtcbiAgICAgICAgfVxuICAgICAgfVxuICAgIH0pO1xuICB9LFxuICBjaGFuZ2VBY2NvdW50OiBmdW5jdGlvbiBjaGFuZ2VBY2NvdW50KG5ld0FjY291bnQpIHtcbiAgICBscy5zZXRJdGVtKGFjY291bnRLZXksIG5ld0FjY291bnQpO1xuICB9XG59O1xubW9kdWxlLmV4cG9ydHMgPSBBQ0c7IiwiXCJ1c2Ugc3RyaWN0XCI7XG5cbnZhciBhbXBsaXR1ZGUgPSByZXF1aXJlKCdhbXBsaXR1ZGUtanMnKTtcblxudmFyIFN0b3JlID0gcmVxdWlyZSgnLi9zdG9yZScpO1xuXG52YXIgQW1wbGl0dWRlID0ge1xuICBpbml0OiBmdW5jdGlvbiBpbml0KHVzZXJJbmZvKSB7XG4gICAgYW1wbGl0dWRlLmdldEluc3RhbmNlKCkuaW5pdCgnZmIxNTlmZmJhM2Y5NGRlZGY4NTc1YjU5Nzc2N2Q5OWQnLCB1c2VySW5mby5pZCk7XG4gICAgdmFyIGlkZW50aWZ5ID0gbmV3IGFtcGxpdHVkZS5JZGVudGlmeSgpLnNldCgnZmlyc3RuYW1lJywgdXNlckluZm8uZmlyc3RuYW1lKS5zZXQoJ2xhc3RuYW1lJywgdXNlckluZm8ubGFzdG5hbWUpLnNldCgnYWNjb3VudCcsIHVzZXJJbmZvLmFjY291bnQubmFtZSkuc2V0KCdwdXJlcHJvZmlsZV91c2VyJywgdXNlckluZm8uZW1haWwuc3Vic3RyaW5nKHVzZXJJbmZvLmVtYWlsLmxhc3RJbmRleE9mKFwiQFwiKSArIDEpLnRvTG93ZXJDYXNlKCkgPT09IFwicHVyZXByb2ZpbGUuY29tXCIpO1xuICAgIGFtcGxpdHVkZS5nZXRJbnN0YW5jZSgpLmlkZW50aWZ5KGlkZW50aWZ5KTtcbiAgfSxcbiAgbG9nRXZlbnQ6IGZ1bmN0aW9uIGxvZ0V2ZW50KGV2ZW50LCBwcm9wZXJ0aWVzKSB7XG4gICAgaWYgKCFwcm9wZXJ0aWVzKSB7XG4gICAgICBwcm9wZXJ0aWVzID0ge307XG4gICAgfVxuXG4gICAgcHJvcGVydGllcy5hcHAgPSBTdG9yZS5nZXRBcHBJbmZvKCkubmFtZTtcbiAgICBhbXBsaXR1ZGUuZ2V0SW5zdGFuY2UoKS5sb2dFdmVudChldmVudCwgcHJvcGVydGllcyk7XG4gIH1cbn07XG5tb2R1bGUuZXhwb3J0cyA9IEFtcGxpdHVkZTsiLCJcInVzZSBzdHJpY3RcIjtcblxudmFyIFN0b3JlID0gcmVxdWlyZSgnLi9zdG9yZScpO1xuXG52YXIgTG9nZ2VyID0gcmVxdWlyZSgnLi9sb2dnZXInKTtcblxudmFyIERvbSA9IHJlcXVpcmUoJy4vZG9tJyk7XG5cbnZhciBDYWxsZXIgPSByZXF1aXJlKCcuL2NhbGxlcicpO1xuXG52YXIgdXBsb2FkaW5nID0gZmFsc2U7XG52YXIgQXZhdGFyQ3RybCA9IHtcbiAgX3N1Ym1pdDogbnVsbCxcbiAgX2ZpbGU6IG51bGwsXG4gIF9wcm9ncmVzczogbnVsbCxcbiAgX3NpZGViYXJfYXZhdGFyOiBudWxsLFxuICBfdG9wX2F2YXRhcjogbnVsbCxcbiAgX3RvcF9hdmF0YXJfY29udGFpbmVyOiBudWxsLFxuICBpbml0OiBmdW5jdGlvbiBpbml0KCkge1xuICAgIEF2YXRhckN0cmwuX3N1Ym1pdCA9IGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKCdiYWMtLS1wdXJlc2RrLWF2YXRhci1zdWJtaXQnKTtcbiAgICBBdmF0YXJDdHJsLl9maWxlID0gZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoJ2JhYy0tLXB1cmVzZGstYXZhdGFyLWZpbGUnKTtcbiAgICBBdmF0YXJDdHJsLl90b3BfYXZhdGFyX2NvbnRhaW5lciA9IGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKCdiYWMtLWltYWdlLWNvbnRhaW5lci10b3AnKTtcbiAgICBBdmF0YXJDdHJsLl9wcm9ncmVzcyA9IGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKCdiYWMtLXVzZXItaW1hZ2UtdXBsb2FkLXByb2dyZXNzJyk7XG4gICAgQXZhdGFyQ3RybC5fc2lkZWJhcl9hdmF0YXIgPSBkb2N1bWVudC5nZXRFbGVtZW50QnlJZCgnYmFjLS11c2VyLWltYWdlLWZpbGUnKTtcbiAgICBBdmF0YXJDdHJsLl90b3BfYXZhdGFyID0gZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoJ2JhYy0tdXNlci1hdmF0YXItdG9wJyk7XG5cbiAgICBBdmF0YXJDdHJsLl9maWxlLmFkZEV2ZW50TGlzdGVuZXIoJ2NsaWNrJywgZnVuY3Rpb24gKGUpIHtcbiAgICAgIGUuc3RvcFByb3BhZ2F0aW9uKCk7XG4gICAgfSk7XG5cbiAgICBBdmF0YXJDdHJsLl9maWxlLmFkZEV2ZW50TGlzdGVuZXIoJ2NoYW5nZScsIGZ1bmN0aW9uIChlKSB7XG4gICAgICBBdmF0YXJDdHJsLnVwbG9hZCgpO1xuICAgIH0pO1xuXG4gICAgZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoJ2JhYy0tdXNlci1pbWFnZScpLmFkZEV2ZW50TGlzdGVuZXIoJ2NsaWNrJywgZnVuY3Rpb24gKGUpIHtcbiAgICAgIGUuc3RvcFByb3BhZ2F0aW9uKCk7XG5cbiAgICAgIEF2YXRhckN0cmwuX2ZpbGUuY2xpY2soKTtcbiAgICB9KTtcbiAgfSxcbiAgdXBsb2FkOiBmdW5jdGlvbiB1cGxvYWQoKSB7XG4gICAgaWYgKHVwbG9hZGluZykge1xuICAgICAgcmV0dXJuO1xuICAgIH1cblxuICAgIHVwbG9hZGluZyA9IHRydWU7XG5cbiAgICBpZiAoQXZhdGFyQ3RybC5fZmlsZS5maWxlcy5sZW5ndGggPT09IDApIHtcbiAgICAgIHJldHVybjtcbiAgICB9XG5cbiAgICB2YXIgZGF0YSA9IG5ldyBGb3JtRGF0YSgpO1xuICAgIGRhdGEuYXBwZW5kKCdmaWxlJywgQXZhdGFyQ3RybC5fZmlsZS5maWxlc1swXSk7XG5cbiAgICB2YXIgc3VjY2Vzc0NhbGxiYWNrID0gZnVuY3Rpb24gc3VjY2Vzc0NhbGxiYWNrKGRhdGEpIHtcbiAgICAgIDtcbiAgICB9O1xuXG4gICAgdmFyIGZhaWxDYWxsYmFjayA9IGZ1bmN0aW9uIGZhaWxDYWxsYmFjayhkYXRhKSB7XG4gICAgICA7XG4gICAgfTtcblxuICAgIHZhciByZXF1ZXN0ID0gbmV3IFhNTEh0dHBSZXF1ZXN0KCk7XG5cbiAgICByZXF1ZXN0Lm9ucmVhZHlzdGF0ZWNoYW5nZSA9IGZ1bmN0aW9uICgpIHtcbiAgICAgIHVwbG9hZGluZyA9IGZhbHNlO1xuXG4gICAgICBpZiAocmVxdWVzdC5yZWFkeVN0YXRlID09IDQpIHtcbiAgICAgICAgdHJ5IHtcbiAgICAgICAgICB2YXIgaW1hZ2VEYXRhID0gSlNPTi5wYXJzZShyZXF1ZXN0LnJlc3BvbnNlKS5kYXRhO1xuICAgICAgICAgIEF2YXRhckN0cmwuc2V0QXZhdGFyKGltYWdlRGF0YS51cmwpO1xuICAgICAgICAgIENhbGxlci5tYWtlQ2FsbCh7XG4gICAgICAgICAgICB0eXBlOiAnUFVUJyxcbiAgICAgICAgICAgIGVuZHBvaW50OiBTdG9yZS5nZXRBdmF0YXJVcGRhdGVVcmwoKSxcbiAgICAgICAgICAgIHBhcmFtczoge1xuICAgICAgICAgICAgICB1c2VyOiB7XG4gICAgICAgICAgICAgICAgYXZhdGFyX3V1aWQ6IGltYWdlRGF0YS5ndWlkXG4gICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICBjYWxsYmFja3M6IHtcbiAgICAgICAgICAgICAgc3VjY2Vzczogc3VjY2Vzc0NhbGxiYWNrLFxuICAgICAgICAgICAgICBmYWlsOiBmYWlsQ2FsbGJhY2tcbiAgICAgICAgICAgIH1cbiAgICAgICAgICB9KTtcbiAgICAgICAgfSBjYXRjaCAoZSkge1xuICAgICAgICAgIHZhciByZXNwID0ge1xuICAgICAgICAgICAgc3RhdHVzOiAnZXJyb3InLFxuICAgICAgICAgICAgZGF0YTogJ1Vua25vd24gZXJyb3Igb2NjdXJyZWQ6IFsnICsgcmVxdWVzdC5yZXNwb25zZVRleHQgKyAnXSdcbiAgICAgICAgICB9O1xuICAgICAgICB9XG5cbiAgICAgICAgTG9nZ2VyLmxvZyhyZXF1ZXN0LnJlc3BvbnNlLnN0YXR1cyArICc6ICcgKyByZXF1ZXN0LnJlc3BvbnNlLmRhdGEpO1xuICAgICAgfVxuICAgIH07IC8vIHJlcXVlc3QudXBsb2FkLmFkZEV2ZW50TGlzdGVuZXIoJ3Byb2dyZXNzJywgZnVuY3Rpb24oZSl7XG4gICAgLy8gXHRMb2dnZXIubG9nKGUubG9hZGVkL2UudG90YWwpO1xuICAgIC8vIFx0QXZhdGFyQ3RybC5fcHJvZ3Jlc3Muc3R5bGUudG9wID0gMTAwIC0gKGUubG9hZGVkL2UudG90YWwpICogMTAwICsgJyUnO1xuICAgIC8vIH0sIGZhbHNlKTtcblxuXG4gICAgdmFyIHVybCA9IFN0b3JlLmdldEF2YXRhclVwbG9hZFVybCgpO1xuICAgIERvbS5hZGRDbGFzcyhBdmF0YXJDdHJsLl9wcm9ncmVzcywgJ2JhYy0tcHVyZXNkay12aXNpYmxlJyk7XG4gICAgcmVxdWVzdC5vcGVuKCdQT1NUJywgdXJsKTtcbiAgICByZXF1ZXN0LnNlbmQoZGF0YSk7XG4gIH0sXG4gIHNldEF2YXRhcjogZnVuY3Rpb24gc2V0QXZhdGFyKHVybCkge1xuICAgIGlmICghdXJsKSB7XG4gICAgICByZXR1cm47XG4gICAgfVxuXG4gICAgRG9tLnJlbW92ZUNsYXNzKEF2YXRhckN0cmwuX3Byb2dyZXNzLCAnYmFjLS1wdXJlc2RrLXZpc2libGUnKTtcbiAgICBEb20uYWRkQ2xhc3MoQXZhdGFyQ3RybC5fc2lkZWJhcl9hdmF0YXIsICdiYWMtLXB1cmVzZGstdmlzaWJsZScpO1xuICAgIHZhciBpbWcgPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KCdpbWcnKTtcbiAgICBpbWcuc3JjID0gdXJsO1xuICAgIEF2YXRhckN0cmwuX3NpZGViYXJfYXZhdGFyLmlubmVySFRNTCA9ICcnO1xuXG4gICAgQXZhdGFyQ3RybC5fc2lkZWJhcl9hdmF0YXIuYXBwZW5kQ2hpbGQoaW1nKTtcblxuICAgIERvbS5hZGRDbGFzcyhBdmF0YXJDdHJsLl90b3BfYXZhdGFyX2NvbnRhaW5lciwgJ2JhYy0tcHVyZXNkay12aXNpYmxlJyk7XG4gICAgdmFyIGltZ18yID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudCgnaW1nJyk7XG4gICAgaW1nXzIuc3JjID0gdXJsO1xuICAgIEF2YXRhckN0cmwuX3RvcF9hdmF0YXJfY29udGFpbmVyLmlubmVySFRNTCA9ICcnO1xuXG4gICAgQXZhdGFyQ3RybC5fdG9wX2F2YXRhcl9jb250YWluZXIuYXBwZW5kQ2hpbGQoaW1nXzIpOyAvLyAgYmFjLS1pbWFnZS1jb250YWluZXItdG9wXG5cbiAgfVxufTtcbm1vZHVsZS5leHBvcnRzID0gQXZhdGFyQ3RybDsiLCJcInVzZSBzdHJpY3RcIjtcblxudmFyIFN0b3JlID0gcmVxdWlyZSgnLi9zdG9yZS5qcycpO1xuXG52YXIgTG9nZ2VyID0gcmVxdWlyZSgnLi9sb2dnZXInKTtcblxudmFyIHBhcmFtc1RvR2V0VmFycyA9IGZ1bmN0aW9uIHBhcmFtc1RvR2V0VmFycyhwYXJhbXMpIHtcbiAgdmFyIHRvUmV0dXJuID0gW107XG5cbiAgZm9yICh2YXIgcHJvcGVydHkgaW4gcGFyYW1zKSB7XG4gICAgaWYgKHBhcmFtcy5oYXNPd25Qcm9wZXJ0eShwcm9wZXJ0eSkpIHtcbiAgICAgIHRvUmV0dXJuLnB1c2gocHJvcGVydHkgKyAnPScgKyBwYXJhbXNbcHJvcGVydHldKTtcbiAgICB9XG4gIH1cblxuICByZXR1cm4gdG9SZXR1cm4uam9pbignJicpO1xufTtcblxudmFyIGRldktleXMgPSBudWxsO1xudmFyIENhbGxlciA9IHtcbiAgLypcbiAgaWYgdGhlIHVzZXIgc2V0c1xuICAgKi9cbiAgc2V0RGV2S2V5czogZnVuY3Rpb24gc2V0RGV2S2V5cyhrZXlzKSB7XG4gICAgZGV2S2V5cyA9IGtleXM7XG4gIH0sXG5cbiAgLypcbiAgZXhwZWN0ZSBhdHRyaWJ1dGVzOlxuICAtIHR5cGUgKGVpdGhlciBHRVQsIFBPU1QsIERFTEVURSwgUFVUKVxuICAtIGVuZHBvaW50XG4gIC0gcGFyYW1zIChpZiBhbnkuIEEganNvbiB3aXRoIHBhcmFtZXRlcnMgdG8gYmUgcGFzc2VkIGJhY2sgdG8gdGhlIGVuZHBvaW50KVxuICAtIGNhbGxiYWNrczogYW4gb2JqZWN0IHdpdGg6XG4gIFx0LSBzdWNjZXNzOiB0aGUgc3VjY2VzcyBjYWxsYmFja1xuICBcdC0gZmFpbDogdGhlIGZhaWwgY2FsbGJhY2tcbiAgICovXG4gIG1ha2VDYWxsOiBmdW5jdGlvbiBtYWtlQ2FsbChhdHRycykge1xuICAgIHZhciBlbmRwb2ludFVybCA9IGF0dHJzLmVuZHBvaW50O1xuICAgIHZhciB4aHIgPSBuZXcgWE1MSHR0cFJlcXVlc3QoKTtcblxuICAgIGlmIChhdHRycy50eXBlID09PSAnR0VUJyAmJiBhdHRycy5wYXJhbXMpIHtcbiAgICAgIGVuZHBvaW50VXJsID0gZW5kcG9pbnRVcmwgKyBcIj9cIiArIHBhcmFtc1RvR2V0VmFycyhhdHRycy5wYXJhbXMpO1xuICAgIH1cblxuICAgIHhoci5vcGVuKGF0dHJzLnR5cGUsIGVuZHBvaW50VXJsKTtcblxuICAgIGlmIChkZXZLZXlzICE9IG51bGwpIHtcbiAgICAgIHhoci5zZXRSZXF1ZXN0SGVhZGVyKCd4LXBwLXNlY3JldCcsIGRldktleXMuc2VjcmV0KTtcbiAgICAgIHhoci5zZXRSZXF1ZXN0SGVhZGVyKCd4LXBwLWtleScsIGRldktleXMua2V5KTtcbiAgICB9XG5cbiAgICB4aHIud2l0aENyZWRlbnRpYWxzID0gdHJ1ZTtcbiAgICB4aHIuc2V0UmVxdWVzdEhlYWRlcignQ29udGVudC1UeXBlJywgJ2FwcGxpY2F0aW9uL2pzb24nKTtcblxuICAgIHhoci5vbmxvYWQgPSBmdW5jdGlvbiAoKSB7XG4gICAgICBpZiAoeGhyLnN0YXR1cyA+PSAyMDAgJiYgeGhyLnN0YXR1cyA8IDMwMCkge1xuICAgICAgICBhdHRycy5jYWxsYmFja3Muc3VjY2VzcyhKU09OLnBhcnNlKHhoci5yZXNwb25zZVRleHQpKTtcbiAgICAgIH0gZWxzZSBpZiAoeGhyLnN0YXR1cyAhPT0gMjAwKSB7XG4gICAgICAgIGF0dHJzLmNhbGxiYWNrcy5mYWlsKEpTT04ucGFyc2UoeGhyLnJlc3BvbnNlVGV4dCkpO1xuICAgICAgfVxuICAgIH07XG5cbiAgICBpZiAoIWF0dHJzLnBhcmFtcykge1xuICAgICAgYXR0cnMucGFyYW1zID0ge307XG4gICAgfVxuXG4gICAgeGhyLnNlbmQoSlNPTi5zdHJpbmdpZnkoYXR0cnMucGFyYW1zKSk7XG4gIH0sXG4gIHByb21pc2VDYWxsOiBmdW5jdGlvbiBwcm9taXNlQ2FsbChhdHRycykge1xuICAgIHJldHVybiBuZXcgUHJvbWlzZShmdW5jdGlvbiAocmVzb2x2ZSwgcmVqZWN0KSB7XG4gICAgICB2YXIgeGhyID0gbmV3IFhNTEh0dHBSZXF1ZXN0KCk7XG5cbiAgICAgIGlmIChhdHRycy50eXBlID09PSAnR0VUJyAmJiBhdHRycy5wYXJhbXMpIHtcbiAgICAgICAgZW5kcG9pbnRVcmwgPSBlbmRwb2ludFVybCArIFwiP1wiICsgcGFyYW1zVG9HZXRWYXJzKGF0dHJzLnBhcmFtcyk7XG4gICAgICB9XG5cbiAgICAgIHhoci5vcGVuKGF0dHJzLnR5cGUsIGF0dHJzLmVuZHBvaW50KTtcbiAgICAgIHhoci53aXRoQ3JlZGVudGlhbHMgPSB0cnVlO1xuXG4gICAgICBpZiAoZGV2S2V5cyAhPSBudWxsKSB7XG4gICAgICAgIHhoci5zZXRSZXF1ZXN0SGVhZGVyKCd4LXBwLXNlY3JldCcsIGRldktleXMuc2VjcmV0KTtcbiAgICAgICAgeGhyLnNldFJlcXVlc3RIZWFkZXIoJ3gtcHAta2V5JywgZGV2S2V5cy5rZXkpO1xuICAgICAgfVxuXG4gICAgICB4aHIuc2V0UmVxdWVzdEhlYWRlcignQ29udGVudC1UeXBlJywgJ2FwcGxpY2F0aW9uL2pzb24nKTtcblxuICAgICAgeGhyLm9ubG9hZCA9IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgaWYgKHRoaXMuc3RhdHVzID49IDIwMCAmJiB0aGlzLnN0YXR1cyA8IDMwMCkge1xuICAgICAgICAgIGF0dHJzLm1pZGRsZXdhcmVzLnN1Y2Nlc3MoSlNPTi5wYXJzZSh4aHIucmVzcG9uc2VUZXh0KSk7XG4gICAgICAgICAgcmVzb2x2ZShKU09OLnBhcnNlKHhoci5yZXNwb25zZVRleHQpKTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICB3aW5kb3cubG9jYXRpb24uaHJlZiA9IFN0b3JlLmdldExvZ2luVXJsKCk7XG4gICAgICAgIH1cbiAgICAgIH07XG5cbiAgICAgIHhoci5vbmVycm9yID0gZnVuY3Rpb24gKCkge1xuICAgICAgICB3aW5kb3cubG9jYXRpb24gPSBTdG9yZS5nZXRMb2dpblVybCgpO1xuICAgICAgfTtcblxuICAgICAgeGhyLnNlbmQoKTtcbiAgICB9KTtcbiAgfVxufTtcbm1vZHVsZS5leHBvcnRzID0gQ2FsbGVyOyIsIlwidXNlIHN0cmljdFwiO1xuXG52YXIgZGVib3VuY2VkVGltZW91dCA9IG51bGw7XG52YXIgY3VycmVudFF1ZXJ5ID0gJyc7XG52YXIgbGltaXQgPSA4O1xudmFyIGxhdGVuY3kgPSA1MDA7XG52YXIgaW5pdE9wdGlvbnM7XG52YXIgY3VycmVudFBhZ2UgPSAxO1xudmFyIG1ldGFEYXRhID0gbnVsbDtcbnZhciBpdGVtcyA9IFtdO1xudmFyIHBhZ2luYXRpb25EYXRhID0gbnVsbDtcblxudmFyIFBhZ2luYXRpb25IZWxwZXIgPSByZXF1aXJlKCcuL3BhZ2luYXRpb24taGVscGVyJyk7XG5cbnZhciBDYWxsZXIgPSByZXF1aXJlKCcuL2NhbGxlcicpO1xuXG52YXIgU3RvcmUgPSByZXF1aXJlKCcuL3N0b3JlJyk7XG5cbnZhciBEb20gPSByZXF1aXJlKCcuL2RvbScpO1xuXG52YXIgQ2xvdWRpbmFyeVBpY2tlciA9IHtcbiAgaW5pdGlhbGlzZTogZnVuY3Rpb24gaW5pdGlhbGlzZSgpIHtcbiAgICBkb2N1bWVudC5nZXRFbGVtZW50QnlJZCgnYmFjLS1jbG91ZGluYXJ5LS1jbG9zZWJ0bicpLm9uY2xpY2sgPSBmdW5jdGlvbiAoZSkge1xuICAgICAgQ2xvdWRpbmFyeVBpY2tlci5jbG9zZU1vZGFsKCk7XG4gICAgfTtcblxuICAgIGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKCdiYWMtLWNsb3VkaW5hcnktLXNlYXJjaC1pbnB1dCcpLm9ua2V5dXAgPSBmdW5jdGlvbiAoZSkge1xuICAgICAgQ2xvdWRpbmFyeVBpY2tlci5oYW5kbGVTZWFyY2goZSk7XG4gICAgfTtcblxuICAgIGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKCdiYWMtLWNsb3VkaW5hcnktLWdvLWJhY2snKS5vbmNsaWNrID0gZnVuY3Rpb24gKGUpIHtcbiAgICAgIENsb3VkaW5hcnlQaWNrZXIuZ29CYWNrKCk7XG4gICAgfTtcbiAgfSxcblxuICAvKlxuICBvcHRpb25zOiB7XG4gIFx0b25TZWxlY3Q6IGl0IGV4cGVjdHMgYSBmdW5jdGlvbi4gVGhpcyBmdW5jdGlvbiB3aWxsIGJlIGludm9rZWQgZXhhY3RseSBhdCB0aGUgbW9tZW50IHRoZSB1c2VyIHBpY2tzXG4gIFx0XHRhIGZpbGUgZnJvbSBjbG91ZGluYXJ5LiBUaGUgZnVuY3Rpb24gd2lsbCB0YWtlIGp1c3Qgb25lIHBhcmFtIHdoaWNoIGlzIHRoZSBzZWxlY3RlZCBpdGVtIG9iamVjdFxuICAgIGNsb3NlT25Fc2M6IHRydWUgLyBmYWxzZVxuICB9XG4gICAqL1xuICBvcGVuTW9kYWw6IGZ1bmN0aW9uIG9wZW5Nb2RhbChvcHRpb25zKSB7XG4gICAgQ2xvdWRpbmFyeVBpY2tlci5pbml0aWFsaXNlKCk7XG4gICAgaW5pdE9wdGlvbnMgPSBvcHRpb25zO1xuICAgIERvbS5hZGRDbGFzcyhkb2N1bWVudC5nZXRFbGVtZW50QnlJZCgnYmFjLS1jbG91ZGluYXJ5LS1tb2RhbCcpLCAnaXMtb3BlbicpO1xuICAgIENsb3VkaW5hcnlQaWNrZXIuZ2V0SW1hZ2VzKHtcbiAgICAgIHBhZ2U6IDEsXG4gICAgICBsaW1pdDogbGltaXRcbiAgICB9KTtcbiAgfSxcbiAgY2xvc2VNb2RhbDogZnVuY3Rpb24gY2xvc2VNb2RhbCgpIHtcbiAgICBEb20ucmVtb3ZlQ2xhc3MoZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoJ2JhYy0tY2xvdWRpbmFyeS0tbW9kYWwnKSwgJ2lzLW9wZW4nKTtcbiAgfSxcbiAgZ2V0SW1hZ2VzOiBmdW5jdGlvbiBnZXRJbWFnZXMob3B0aW9ucykge1xuICAgIC8vIFRPRE8gbWFrZSB0aGUgY2FsbCBhbmQgZ2V0IHRoZSBpbWFnZXNcbiAgICBDYWxsZXIubWFrZUNhbGwoe1xuICAgICAgdHlwZTogJ0dFVCcsXG4gICAgICBlbmRwb2ludDogU3RvcmUuZ2V0Q2xvdWRpbmFyeUVuZHBvaW50KCksXG4gICAgICBwYXJhbXM6IG9wdGlvbnMsXG4gICAgICBjYWxsYmFja3M6IHtcbiAgICAgICAgc3VjY2VzczogZnVuY3Rpb24gc3VjY2VzcyhyZXN1bHQpIHtcbiAgICAgICAgICBDbG91ZGluYXJ5UGlja2VyLm9uSW1hZ2VzUmVzcG9uc2UocmVzdWx0KTtcbiAgICAgICAgfSxcbiAgICAgICAgZmFpbDogZnVuY3Rpb24gZmFpbChlcnIpIHtcbiAgICAgICAgICBhbGVydChlcnIpO1xuICAgICAgICB9XG4gICAgICB9XG4gICAgfSk7XG4gIH0sXG4gIGhhbmRsZVNlYXJjaDogZnVuY3Rpb24gaGFuZGxlU2VhcmNoKGUpIHtcbiAgICBpZiAoZGVib3VuY2VkVGltZW91dCkge1xuICAgICAgY2xlYXJUaW1lb3V0KGRlYm91bmNlZFRpbWVvdXQpO1xuICAgIH1cblxuICAgIGlmIChlLnRhcmdldC52YWx1ZSA9PT0gY3VycmVudFF1ZXJ5KSB7XG4gICAgICByZXR1cm47XG4gICAgfVxuXG4gICAgdmFyIHF1ZXJ5ID0gZS50YXJnZXQudmFsdWU7XG4gICAgY3VycmVudFF1ZXJ5ID0gcXVlcnk7XG4gICAgdmFyIG9wdGlvbnMgPSB7XG4gICAgICBwYWdlOiAxLFxuICAgICAgbGltaXQ6IGxpbWl0LFxuICAgICAgcXVlcnk6IHF1ZXJ5XG4gICAgfTtcbiAgICBkZWJvdW5jZWRUaW1lb3V0ID0gc2V0VGltZW91dChmdW5jdGlvbiAoKSB7XG4gICAgICBDbG91ZGluYXJ5UGlja2VyLmdldEltYWdlcyhvcHRpb25zKTtcbiAgICB9LCBsYXRlbmN5KTtcbiAgfSxcbiAgaXRlbVNlbGVjdGVkOiBmdW5jdGlvbiBpdGVtU2VsZWN0ZWQoaXRlbSwgZSkge1xuICAgIGlmIChpdGVtLnR5cGUgPT0gJ2ZvbGRlcicpIHtcbiAgICAgIHZhciBwYXJhbXMgPSB7XG4gICAgICAgIHBhZ2U6IDEsXG4gICAgICAgIGxpbWl0OiBsaW1pdCxcbiAgICAgICAgcGFyZW50OiBpdGVtLmlkXG4gICAgICB9OyAvLyBUT0RPIHNldCBzZWFyY2ggaW5wdXQncyB2YWx1ZSA9ICcnXG5cbiAgICAgIGN1cnJlbnRRdWVyeSA9ICcnO1xuICAgICAgQ2xvdWRpbmFyeVBpY2tlci5nZXRJbWFnZXMocGFyYW1zKTtcbiAgICB9IGVsc2Uge1xuICAgICAgaW5pdE9wdGlvbnMub25TZWxlY3QoaXRlbSk7XG4gICAgICBDbG91ZGluYXJ5UGlja2VyLmNsb3NlTW9kYWwoKTtcbiAgICB9XG4gIH0sXG4gIG9uSW1hZ2VzUmVzcG9uc2U6IGZ1bmN0aW9uIG9uSW1hZ2VzUmVzcG9uc2UoZGF0YSkge1xuICAgIHBhZ2luYXRpb25EYXRhID0gUGFnaW5hdGlvbkhlbHBlci5nZXRQYWdlc1JhbmdlKGN1cnJlbnRQYWdlLCBNYXRoLmNlaWwoZGF0YS5tZXRhLnRvdGFsIC8gbGltaXQpKTtcbiAgICBtZXRhRGF0YSA9IGRhdGEubWV0YTtcbiAgICBpdGVtcyA9IGRhdGEuYXNzZXRzO1xuICAgIENsb3VkaW5hcnlQaWNrZXIucmVuZGVyKCk7XG4gIH0sXG4gIHJlbmRlclBhZ2luYXRpb25CdXR0b25zOiBmdW5jdGlvbiByZW5kZXJQYWdpbmF0aW9uQnV0dG9ucygpIHtcbiAgICB2YXIgdG9SZXR1cm4gPSBbXTtcblxuICAgIHZhciBjcmVhdGVQYWdpbmF0aW9uRWxlbWVudCA9IGZ1bmN0aW9uIGNyZWF0ZVBhZ2luYXRpb25FbGVtZW50KGFDbGFzc05hbWUsIGFGdW5jdGlvbiwgc3BhbkNsYXNzTmFtZSwgc3BhbkNvbnRlbnQpIHtcbiAgICAgIHZhciBsaSA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoJ2xpJyk7XG4gICAgICB2YXIgYSA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoJ2EnKTtcbiAgICAgIGxpLmNsYXNzTmFtZSA9IGFDbGFzc05hbWU7XG4gICAgICBhLm9uY2xpY2sgPSBhRnVuY3Rpb247XG4gICAgICB2YXIgc3BhbiA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoJ3NwYW4nKTtcbiAgICAgIHNwYW4uY2xhc3NOYW1lID0gc3BhbkNsYXNzTmFtZTtcblxuICAgICAgaWYgKHNwYW5Db250ZW50KSB7XG4gICAgICAgIHNwYW4uaW5uZXJIVE1MID0gc3BhbkNvbnRlbnQ7XG4gICAgICB9XG5cbiAgICAgIGEuYXBwZW5kQ2hpbGQoc3Bhbik7XG4gICAgICBsaS5hcHBlbmRDaGlsZChhKTtcbiAgICAgIHJldHVybiBsaTtcbiAgICB9O1xuXG4gICAgaWYgKHBhZ2luYXRpb25EYXRhLmhhc1ByZXZpb3VzKSB7XG4gICAgICB0b1JldHVybi5wdXNoKGNyZWF0ZVBhZ2luYXRpb25FbGVtZW50KCdkaXNhYmxlZCcsIGZ1bmN0aW9uIChlKSB7XG4gICAgICAgIGUucHJldmVudERlZmF1bHQoKTtcblxuICAgICAgICBDbG91ZGluYXJ5UGlja2VyLl9nb1RvUGFnZSgxKTtcbiAgICAgIH0sICdmYSBmYS1hbmdsZS1kb3VibGUtbGVmdCcpKTtcbiAgICAgIHRvUmV0dXJuLnB1c2goY3JlYXRlUGFnaW5hdGlvbkVsZW1lbnQoJ2Rpc2FibGVkJywgZnVuY3Rpb24gKGUpIHtcbiAgICAgICAgZS5wcmV2ZW50RGVmYXVsdCgpO1xuXG4gICAgICAgIENsb3VkaW5hcnlQaWNrZXIuX2dvVG9QYWdlKGN1cnJlbnRQYWdlIC0gMSk7XG4gICAgICB9LCAnZmEgZmEtYW5nbGUtbGVmdCcpKTtcbiAgICB9XG5cbiAgICBmb3IgKHZhciBpID0gMDsgaSA8IHBhZ2luYXRpb25EYXRhLmJ1dHRvbnMubGVuZ3RoOyBpKyspIHtcbiAgICAgIChmdW5jdGlvbiAoaSkge1xuICAgICAgICB2YXIgYnRuID0gcGFnaW5hdGlvbkRhdGEuYnV0dG9uc1tpXTtcbiAgICAgICAgdG9SZXR1cm4ucHVzaChjcmVhdGVQYWdpbmF0aW9uRWxlbWVudChidG4ucnVubmluZ3BhZ2UgPyBcImFjdGl2ZVwiIDogXCItXCIsIGZ1bmN0aW9uIChlKSB7XG4gICAgICAgICAgZS5wcmV2ZW50RGVmYXVsdCgpO1xuXG4gICAgICAgICAgQ2xvdWRpbmFyeVBpY2tlci5fZ29Ub1BhZ2UoYnRuLnBhZ2Vubyk7XG4gICAgICAgIH0sICdudW1iZXInLCBidG4ucGFnZW5vKSk7XG4gICAgICB9KShpKTtcbiAgICB9XG5cbiAgICBpZiAocGFnaW5hdGlvbkRhdGEuaGFzTmV4dCkge1xuICAgICAgdG9SZXR1cm4ucHVzaChjcmVhdGVQYWdpbmF0aW9uRWxlbWVudCgnZGlzYWJsZWQnLCBmdW5jdGlvbiAoZSkge1xuICAgICAgICBlLnByZXZlbnREZWZhdWx0KCk7XG5cbiAgICAgICAgQ2xvdWRpbmFyeVBpY2tlci5fZ29Ub1BhZ2UoY3VycmVudFBhZ2UgKyAxKTtcbiAgICAgIH0sICdmYSBmYS1hbmdsZS1yaWdodCcpKTtcbiAgICAgIHRvUmV0dXJuLnB1c2goY3JlYXRlUGFnaW5hdGlvbkVsZW1lbnQoJ2Rpc2FibGVkJywgZnVuY3Rpb24gKGUpIHtcbiAgICAgICAgZS5wcmV2ZW50RGVmYXVsdCgpO1xuXG4gICAgICAgIENsb3VkaW5hcnlQaWNrZXIuX2dvVG9QYWdlKE1hdGguY2VpbChtZXRhRGF0YS50b3RhbCAvIGxpbWl0KSk7XG4gICAgICB9LCAnZmEgZmEtYW5nbGUtZG91YmxlLXJpZ2h0JykpO1xuICAgIH1cblxuICAgIGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKCdiYWMtLWNsb3VkaW5hcnktYWN0dWFsLXBhZ2luYXRpb24tY29udGFpbmVyJykuaW5uZXJIVE1MID0gJyc7XG5cbiAgICBmb3IgKHZhciBfaSA9IDA7IF9pIDwgdG9SZXR1cm4ubGVuZ3RoOyBfaSsrKSB7XG4gICAgICBkb2N1bWVudC5nZXRFbGVtZW50QnlJZCgnYmFjLS1jbG91ZGluYXJ5LWFjdHVhbC1wYWdpbmF0aW9uLWNvbnRhaW5lcicpLmFwcGVuZENoaWxkKHRvUmV0dXJuW19pXSk7XG4gICAgfVxuICB9LFxuICBfZ29Ub1BhZ2U6IGZ1bmN0aW9uIF9nb1RvUGFnZShwYWdlKSB7XG4gICAgaWYgKHBhZ2UgPT09IGN1cnJlbnRQYWdlKSB7XG4gICAgICByZXR1cm47XG4gICAgfVxuXG4gICAgdmFyIHBhcmFtcyA9IHtcbiAgICAgIHBhZ2U6IHBhZ2UsXG4gICAgICBsaW1pdDogbGltaXRcbiAgICB9O1xuXG4gICAgaWYgKG1ldGFEYXRhLmFzc2V0KSB7XG4gICAgICBwYXJhbXMucGFyZW50ID0gbWV0YURhdGEuYXNzZXQ7XG4gICAgfVxuXG4gICAgaWYgKGN1cnJlbnRRdWVyeSkge1xuICAgICAgcGFyYW1zLnF1ZXJ5ID0gY3VycmVudFF1ZXJ5O1xuICAgIH1cblxuICAgIGN1cnJlbnRQYWdlID0gcGFnZTtcbiAgICBDbG91ZGluYXJ5UGlja2VyLmdldEltYWdlcyhwYXJhbXMpO1xuICB9LFxuICBnb0JhY2s6IGZ1bmN0aW9uIGdvQmFjaygpIHtcbiAgICB2YXIgcGFyYW1zID0ge1xuICAgICAgcGFnZTogMSxcbiAgICAgIGxpbWl0OiBsaW1pdFxuICAgIH07XG5cbiAgICBpZiAobWV0YURhdGEucGFyZW50KSB7XG4gICAgICBwYXJhbXMucGFyZW50ID0gbWV0YURhdGEucGFyZW50O1xuICAgIH1cblxuICAgIGlmIChjdXJyZW50UXVlcnkpIHtcbiAgICAgIHBhcmFtcy5xdWVyeSA9IGN1cnJlbnRRdWVyeTtcbiAgICB9XG5cbiAgICBDbG91ZGluYXJ5UGlja2VyLmdldEltYWdlcyhwYXJhbXMpO1xuICB9LFxuICByZW5kZXJJdGVtczogZnVuY3Rpb24gcmVuZGVySXRlbXMoKSB7XG4gICAgdmFyIG9uZUl0ZW0gPSBmdW5jdGlvbiBvbmVJdGVtKGl0ZW0pIHtcbiAgICAgIHZhciBpdGVtSWNvbiA9IGZ1bmN0aW9uIGl0ZW1JY29uKCkge1xuICAgICAgICBpZiAoaXRlbS50eXBlICE9ICdmb2xkZXInKSB7XG4gICAgICAgICAgcmV0dXJuIFwiPGltZyBzcmM9XCIuY29uY2F0KGl0ZW0udGh1bWIsIFwiIGFsdD1cXFwiXFxcIi8+XCIpO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgIHJldHVybiBcIjxpIGNsYXNzPVxcXCJmYSBmYS1mb2xkZXItb1xcXCI+PC9pPlwiO1xuICAgICAgICB9XG4gICAgICB9O1xuXG4gICAgICB2YXIgZnVuY3QgPSBmdW5jdGlvbiBmdW5jdCgpIHtcbiAgICAgICAgQ2xvdWRpbmFyeVBpY2tlci5pdGVtU2VsZWN0ZWQoaXRlbSk7XG4gICAgICB9O1xuXG4gICAgICB2YXIgbmV3RG9tRWwgPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KCdkaXYnKTtcbiAgICAgIG5ld0RvbUVsLmNsYXNzTmFtZSA9IFwiY2xvdWQtaW1hZ2VzX19pdGVtXCI7XG4gICAgICBuZXdEb21FbC5vbmNsaWNrID0gZnVuY3Q7XG4gICAgICBuZXdEb21FbC5pbm5lckhUTUwgPSBcIlxcblxcdFxcdFxcdFxcdFxcdFxcdCAgPGRpdiBjbGFzcz1cXFwiY2xvdWQtaW1hZ2VzX19pdGVtX190eXBlXFxcIj5cXG5cXHRcXHRcXHRcXHRcXHRcXHRcXHRcXHRcIi5jb25jYXQoaXRlbUljb24oKSwgXCJcXG5cXHRcXHRcXHRcXHRcXHRcXHQgIDwvZGl2PlxcblxcdFxcdFxcdFxcdFxcdFxcdCAgPGRpdiBjbGFzcz1cXFwiY2xvdWQtaW1hZ2VzX19pdGVtX19kZXRhaWxzXFxcIj5cXG5cXHRcXHRcXHRcXHRcXHRcXHRcXHRcXHQ8c3BhbiBjbGFzcz1cXFwiY2xvdWQtaW1hZ2VzX19pdGVtX19kZXRhaWxzX19uYW1lXFxcIj5cIikuY29uY2F0KGl0ZW0ubmFtZSwgXCI8L3NwYW4+XFxuXFx0XFx0XFx0XFx0XFx0XFx0XFx0XFx0PHNwYW4gY2xhc3M9XFxcImNsb3VkLWltYWdlc19faXRlbV9fZGV0YWlsc19fZGF0ZVxcXCI+XCIpLmNvbmNhdChpdGVtLmNyZGF0ZSwgXCI8L3NwYW4+XFxuXFx0XFx0XFx0XFx0XFx0XFx0ICA8L2Rpdj5cXG5cXHRcXHRcXHRcXHRcXHRcXHQgIDxkaXYgY2xhc3M9XFxcImNsb3VkLWltYWdlc19faXRlbV9fYWN0aW9uc1xcXCI+XFxuXFx0XFx0XFx0XFx0XFx0XFx0XFx0XFx0PGEgY2xhc3M9XFxcImZhIGZhLXBlbmNpbFxcXCI+PC9hPlxcblxcdFxcdFxcdFxcdFxcdFxcdCAgPC9kaXY+XCIpO1xuICAgICAgcmV0dXJuIG5ld0RvbUVsO1xuICAgIH07XG5cbiAgICBkb2N1bWVudC5nZXRFbGVtZW50QnlJZCgnYmFjLS1jbG91ZGluYXJ5LWl0YW1zLWNvbnRhaW5lcicpLmlubmVySFRNTCA9ICcnO1xuXG4gICAgZm9yICh2YXIgaSA9IDA7IGkgPCBpdGVtcy5sZW5ndGg7IGkrKykge1xuICAgICAgZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoJ2JhYy0tY2xvdWRpbmFyeS1pdGFtcy1jb250YWluZXInKS5hcHBlbmRDaGlsZChvbmVJdGVtKGl0ZW1zW2ldKSk7XG4gICAgfVxuICB9LFxuICByZW5kZXI6IGZ1bmN0aW9uIHJlbmRlcigpIHtcbiAgICBpZiAobWV0YURhdGEuYXNzZXQpIHtcbiAgICAgIERvbS5yZW1vdmVDbGFzcyhkb2N1bWVudC5nZXRFbGVtZW50QnlJZCgnYmFjLS1jbG91ZGluYXJ5LS1iYWNrLWJ1dHRvbi1jb250YWluZXInKSwgJ2hkbicpO1xuICAgIH0gZWxzZSB7XG4gICAgICBEb20uYWRkQ2xhc3MoZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoJ2JhYy0tY2xvdWRpbmFyeS0tYmFjay1idXR0b24tY29udGFpbmVyJyksICdoZG4nKTtcbiAgICB9XG5cbiAgICBDbG91ZGluYXJ5UGlja2VyLnJlbmRlckl0ZW1zKCk7XG5cbiAgICBpZiAobWV0YURhdGEudG90YWwgPiBsaW1pdCkge1xuICAgICAgRG9tLnJlbW92ZUNsYXNzKGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKCdiYWMtLWNsb3VkaW5hcnktcGFnaW5hdGlvbi1jb250YWluZXInKSwgJ2hkbicpO1xuICAgICAgQ2xvdWRpbmFyeVBpY2tlci5yZW5kZXJQYWdpbmF0aW9uQnV0dG9ucygpO1xuICAgIH0gZWxzZSB7XG4gICAgICBEb20uYWRkQ2xhc3MoZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoJ2JhYy0tY2xvdWRpbmFyeS1wYWdpbmF0aW9uLWNvbnRhaW5lcicpLCAnaGRuJyk7XG4gICAgfVxuICB9XG59O1xubW9kdWxlLmV4cG9ydHMgPSBDbG91ZGluYXJ5UGlja2VyOyIsIlwidXNlIHN0cmljdFwiO1xuXG52YXIgRG9tID0ge1xuICBoYXNDbGFzczogZnVuY3Rpb24gaGFzQ2xhc3MoZWwsIGNsYXNzTmFtZSkge1xuICAgIGlmIChlbC5jbGFzc0xpc3QpIHJldHVybiBlbC5jbGFzc0xpc3QuY29udGFpbnMoY2xhc3NOYW1lKTtlbHNlIHJldHVybiBuZXcgUmVnRXhwKCcoXnwgKScgKyBjbGFzc05hbWUgKyAnKCB8JCknLCAnZ2knKS50ZXN0KGVsLmNsYXNzTmFtZSk7XG4gIH0sXG4gIHJlbW92ZUNsYXNzOiBmdW5jdGlvbiByZW1vdmVDbGFzcyhlbCwgY2xhc3NOYW1lKSB7XG4gICAgaWYgKGVsLmNsYXNzTGlzdCkgZWwuY2xhc3NMaXN0LnJlbW92ZShjbGFzc05hbWUpO2Vsc2UgZWwuY2xhc3NOYW1lID0gZWwuY2xhc3NOYW1lLnJlcGxhY2UobmV3IFJlZ0V4cCgnKF58XFxcXGIpJyArIGNsYXNzTmFtZS5zcGxpdCgnICcpLmpvaW4oJ3wnKSArICcoXFxcXGJ8JCknLCAnZ2knKSwgJyAnKTtcbiAgfSxcbiAgYWRkQ2xhc3M6IGZ1bmN0aW9uIGFkZENsYXNzKGVsLCBjbGFzc05hbWUpIHtcbiAgICBpZiAoZWwuY2xhc3NMaXN0KSBlbC5jbGFzc0xpc3QuYWRkKGNsYXNzTmFtZSk7ZWxzZSBlbC5jbGFzc05hbWUgKz0gJyAnICsgY2xhc3NOYW1lO1xuICB9LFxuICB0b2dnbGVDbGFzczogZnVuY3Rpb24gdG9nZ2xlQ2xhc3MoZWwsIGNsYXNzTmFtZSkge1xuICAgIGlmICh0aGlzLmhhc0NsYXNzKGVsLCBjbGFzc05hbWUpKSB7XG4gICAgICB0aGlzLnJlbW92ZUNsYXNzKGVsLCBjbGFzc05hbWUpO1xuICAgIH0gZWxzZSB7XG4gICAgICB0aGlzLmFkZENsYXNzKGVsLCBjbGFzc05hbWUpO1xuICAgIH1cbiAgfVxufTtcbm1vZHVsZS5leHBvcnRzID0gRG9tOyIsIlwidXNlIHN0cmljdFwiO1xuXG52YXIgZG9tID0gcmVxdWlyZSgnLi9kb20nKTtcblxudmFyIGRlZmF1bHRIaWRlSW4gPSA1MDAwO1xudmFyIGxhc3RJbmRleCA9IDE7XG52YXIgbnVtT2ZJbmZvQmxvY2tzID0gMTA7XG52YXIgaW5mb0Jsb2NrcyA9IFtdO1xudmFyIEluZm9Db250cm9sbGVyID0ge1xuICByZW5kZXJJbmZvQmxvY2tzOiBmdW5jdGlvbiByZW5kZXJJbmZvQmxvY2tzKCkge1xuICAgIHZhciBibG9ja3NUZW1wbGF0ZSA9IGZ1bmN0aW9uIGJsb2Nrc1RlbXBsYXRlKGluZGV4KSB7XG4gICAgICByZXR1cm4gXCJcXG5cXHRcXHRcXHRcXHQgPGRpdiBjbGFzcz1cXFwiYmFjLS1wdXJlc2RrLWluZm8tYm94LS1cXFwiIGlkPVxcXCJiYWMtLXB1cmVzZGstaW5mby1ib3gtLVwiLmNvbmNhdChpbmRleCwgXCJcXFwiPlxcblxcdFxcdFxcdFxcdCBcXHQ8ZGl2IGNsYXNzPVxcXCJiYWMtLXRpbWVyXFxcIiBpZD1cXFwiYmFjLS10aW1lclwiKS5jb25jYXQoaW5kZXgsIFwiXFxcIj48L2Rpdj5cXG5cXHRcXHRcXHRcXHRcXHQgPGRpdiBjbGFzcz1cXFwiYmFjLS1pbm5lci1pbmZvLWJveC0tXFxcIj5cXG5cXHRcXHRcXHRcXHRcXHQgXFx0XFx0PGRpdiBjbGFzcz1cXFwiYmFjLS1pbmZvLWljb24tLSBmYS1zdWNjZXNzXFxcIj48L2Rpdj5cXG5cXHRcXHRcXHRcXHRcXHQgXFx0XFx0PGRpdiBjbGFzcz1cXFwiYmFjLS1pbmZvLWljb24tLSBmYS13YXJuaW5nXFxcIj48L2Rpdj5cXG5cXHRcXHRcXHRcXHRcXHQgXFx0XFx0PGRpdiBjbGFzcz1cXFwiYmFjLS1pbmZvLWljb24tLSBmYS1pbmZvLTFcXFwiPjwvZGl2PlxcblxcdFxcdFxcdFxcdFxcdCBcXHRcXHQ8ZGl2IGNsYXNzPVxcXCJiYWMtLWluZm8taWNvbi0tIGZhLWVycm9yXFxcIj48L2Rpdj5cXG5cXHRcXHRcXHRcXHRcXHQgXFx0XFx0IDxkaXYgY2xhc3M9XFxcImJhYy0taW5mby1tYWluLXRleHQtLVxcXCIgaWQ9XFxcImJhYy0taW5mby1tYWluLXRleHQtLVwiKS5jb25jYXQoaW5kZXgsIFwiXFxcIj48L2Rpdj5cXG5cXHRcXHRcXHRcXHRcXHQgXFx0XFx0IDxkaXYgY2xhc3M9XFxcImJhYy0taW5mby1jbG9zZS1idXR0b24tLSBmYS1jbG9zZS0xXFxcIiBpZD1cXFwiYmFjLS1pbmZvLWNsb3NlLWJ1dHRvbi0tXCIpLmNvbmNhdChpbmRleCwgXCJcXFwiPjwvZGl2PlxcblxcdFxcdFxcdFxcdFxcdDwvZGl2PlxcblxcdFxcdFxcdFxcdDwvZGl2PlxcblxcdFxcdCAgXCIpO1xuICAgIH07XG5cbiAgICB2YXIgaW5mb0Jsb2Nrc1dyYXBwZXIgPSBkb2N1bWVudC5nZXRFbGVtZW50QnlJZCgnYmFjLS1pbmZvLWJsb2Nrcy13cmFwcGVyLS0nKTtcbiAgICB2YXIgaW5uZXJIdG1sID0gJyc7XG5cbiAgICBmb3IgKHZhciBpID0gMTsgaSA8IG51bU9mSW5mb0Jsb2NrczsgaSsrKSB7XG4gICAgICBpbm5lckh0bWwgKz0gYmxvY2tzVGVtcGxhdGUoaSk7XG4gICAgfVxuXG4gICAgaW5mb0Jsb2Nrc1dyYXBwZXIuaW5uZXJIVE1MID0gaW5uZXJIdG1sO1xuICB9LFxuICBpbml0OiBmdW5jdGlvbiBpbml0KCkge1xuICAgIGZvciAodmFyIGkgPSAxOyBpIDwgbnVtT2ZJbmZvQmxvY2tzOyBpKyspIHtcbiAgICAgIChmdW5jdGlvbiB4KGkpIHtcbiAgICAgICAgdmFyIGNsb3NlRnVuY3Rpb24gPSBmdW5jdGlvbiBjbG9zZUZ1bmN0aW9uKCkge1xuICAgICAgICAgIGRvbS5yZW1vdmVDbGFzcyhkb2N1bWVudC5nZXRFbGVtZW50QnlJZCgnYmFjLS1wdXJlc2RrLWluZm8tYm94LS0nICsgaSksICdiYWMtLWFjdGl2ZS0tJyk7XG4gICAgICAgICAgZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoJ2JhYy0tdGltZXInICsgaSkuc3R5bGUudHJhbnNpdGlvbiA9ICcnO1xuICAgICAgICAgIGRvbS5yZW1vdmVDbGFzcyhkb2N1bWVudC5nZXRFbGVtZW50QnlJZCgnYmFjLS10aW1lcicgKyBpKSwgJ2JhYy0tZnVsbHdpZHRoJyk7XG4gICAgICAgICAgaW5mb0Jsb2Nrc1tpIC0gMV0uaW5Vc2UgPSBmYWxzZTtcbiAgICAgICAgICBzZXRUaW1lb3V0KGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgIGlmIChpbmZvQmxvY2tzW2kgLSAxXS5jbG9zZVRpbWVvdXQpIHtcbiAgICAgICAgICAgICAgY2xlYXJUaW1lb3V0KGluZm9CbG9ja3NbaSAtIDFdLmNsb3NlVGltZW91dCk7XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIGRvbS5yZW1vdmVDbGFzcyhkb2N1bWVudC5nZXRFbGVtZW50QnlJZCgnYmFjLS1wdXJlc2RrLWluZm8tYm94LS0nICsgaSksICdiYWMtLXN1Y2Nlc3MnKTtcbiAgICAgICAgICAgIGRvbS5yZW1vdmVDbGFzcyhkb2N1bWVudC5nZXRFbGVtZW50QnlJZCgnYmFjLS1wdXJlc2RrLWluZm8tYm94LS0nICsgaSksICdiYWMtLWluZm8nKTtcbiAgICAgICAgICAgIGRvbS5yZW1vdmVDbGFzcyhkb2N1bWVudC5nZXRFbGVtZW50QnlJZCgnYmFjLS1wdXJlc2RrLWluZm8tYm94LS0nICsgaSksICdiYWMtLXdhcm5pbmcnKTtcbiAgICAgICAgICAgIGRvbS5yZW1vdmVDbGFzcyhkb2N1bWVudC5nZXRFbGVtZW50QnlJZCgnYmFjLS1wdXJlc2RrLWluZm8tYm94LS0nICsgaSksICdiYWMtLWVycm9yJyk7XG4gICAgICAgICAgfSwgNDUwKTtcbiAgICAgICAgfTtcblxuICAgICAgICB2YXIgYWRkVGV4dCA9IGZ1bmN0aW9uIGFkZFRleHQodGV4dCkge1xuICAgICAgICAgIGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKCdiYWMtLWluZm8tbWFpbi10ZXh0LS0nICsgaSkuaW5uZXJIVE1MID0gdGV4dDtcbiAgICAgICAgfTtcblxuICAgICAgICB2YXIgYWRkVGltZW91dCA9IGZ1bmN0aW9uIGFkZFRpbWVvdXQodGltZW91dE1zZWNzKSB7XG4gICAgICAgICAgZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoJ2JhYy0tdGltZXInICsgaSkuc3R5bGUudHJhbnNpdGlvbiA9ICd3aWR0aCAnICsgdGltZW91dE1zZWNzICsgJ21zJztcbiAgICAgICAgICBkb20uYWRkQ2xhc3MoZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoJ2JhYy0tdGltZXInICsgaSksICdiYWMtLWZ1bGx3aWR0aCcpO1xuICAgICAgICAgIGluZm9CbG9ja3NbaSAtIDFdLmNsb3NlVGltZW91dCA9IHNldFRpbWVvdXQoZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgaW5mb0Jsb2Nrc1tpIC0gMV0uY2xvc2VGdW5jdGlvbigpO1xuICAgICAgICAgIH0sIHRpbWVvdXRNc2Vjcyk7XG4gICAgICAgIH07XG5cbiAgICAgICAgaW5mb0Jsb2Nrcy5wdXNoKHtcbiAgICAgICAgICBpZDogaSxcbiAgICAgICAgICBpblVzZTogZmFsc2UsXG4gICAgICAgICAgZWxlbWVudDogZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoJ2JhYy0tcHVyZXNkay1pbmZvLWJveC0tJyArIGkpLFxuICAgICAgICAgIGNsb3NlRnVuY3Rpb246IGNsb3NlRnVuY3Rpb24sXG4gICAgICAgICAgYWRkVGV4dDogYWRkVGV4dCxcbiAgICAgICAgICBhZGRUaW1lb3V0OiBhZGRUaW1lb3V0LFxuICAgICAgICAgIGNsb3NlVGltZW91dDogZmFsc2VcbiAgICAgICAgfSk7XG5cbiAgICAgICAgZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoJ2JhYy0taW5mby1jbG9zZS1idXR0b24tLScgKyBpKS5vbmNsaWNrID0gZnVuY3Rpb24gKGUpIHtcbiAgICAgICAgICBjbG9zZUZ1bmN0aW9uKGkpO1xuICAgICAgICB9O1xuICAgICAgfSkoaSk7XG4gICAgfVxuICB9LFxuXG4gIC8qXG4gICB0eXBlOiBvbmUgb2Y6XG4gIFx0LSBzdWNjZXNzXG4gIFx0LSBpbmZvXG4gIFx0LSB3YXJuaW5nXG4gIFx0LSBlcnJvclxuICAgdGV4dDogdGhlIHRleHQgdG8gZGlzcGxheVxuICAgb3B0aW9ucyAob3B0aW9uYWwpOiB7XG4gICBcdFx0aGlkZUluOiBtaWxsaXNlY29uZHMgdG8gaGlkZSBpdC4gLTEgZm9yIG5vdCBoaWRpbmcgaXQgYXQgYWxsLiBEZWZhdWx0IGlzIDUwMDBcbiAgIH1cbiAgICovXG4gIHNob3dJbmZvOiBmdW5jdGlvbiBzaG93SW5mbyh0eXBlLCB0ZXh0LCBvcHRpb25zKSB7XG4gICAgZm9yICh2YXIgaSA9IDA7IGkgPCBudW1PZkluZm9CbG9ja3M7IGkrKykge1xuICAgICAgdmFyIGluZm9CbG9jayA9IGluZm9CbG9ja3NbaV07XG5cbiAgICAgIGlmICghaW5mb0Jsb2NrLmluVXNlKSB7XG4gICAgICAgIGluZm9CbG9jay5pblVzZSA9IHRydWU7XG4gICAgICAgIGluZm9CbG9jay5lbGVtZW50LnN0eWxlLnpJbmRleCA9IGxhc3RJbmRleDtcbiAgICAgICAgaW5mb0Jsb2NrLmFkZFRleHQodGV4dCk7XG4gICAgICAgIGxhc3RJbmRleCArPSAxO1xuICAgICAgICB2YXIgdGltZW91dG1TZWNzID0gZGVmYXVsdEhpZGVJbjtcbiAgICAgICAgdmFyIGF1dG9DbG9zZSA9IHRydWU7XG5cbiAgICAgICAgaWYgKG9wdGlvbnMpIHtcbiAgICAgICAgICBpZiAob3B0aW9ucy5oaWRlSW4gIT0gbnVsbCAmJiBvcHRpb25zLmhpZGVJbiAhPSB1bmRlZmluZWQgJiYgb3B0aW9ucy5oaWRlSW4gIT0gLTEpIHtcbiAgICAgICAgICAgIHRpbWVvdXRtU2VjcyA9IG9wdGlvbnMuaGlkZUluO1xuICAgICAgICAgIH0gZWxzZSBpZiAob3B0aW9ucy5oaWRlSW4gPT09IC0xKSB7XG4gICAgICAgICAgICBhdXRvQ2xvc2UgPSBmYWxzZTtcbiAgICAgICAgICB9XG4gICAgICAgIH1cblxuICAgICAgICBpZiAoYXV0b0Nsb3NlKSB7XG4gICAgICAgICAgaW5mb0Jsb2NrLmFkZFRpbWVvdXQodGltZW91dG1TZWNzKTtcbiAgICAgICAgfVxuXG4gICAgICAgIGRvbS5hZGRDbGFzcyhpbmZvQmxvY2suZWxlbWVudCwgJ2JhYy0tJyArIHR5cGUpO1xuICAgICAgICBkb20uYWRkQ2xhc3MoaW5mb0Jsb2NrLmVsZW1lbnQsICdiYWMtLWFjdGl2ZS0tJyk7XG4gICAgICAgIHJldHVybjtcbiAgICAgIH1cbiAgICB9XG4gIH1cbn07XG5tb2R1bGUuZXhwb3J0cyA9IEluZm9Db250cm9sbGVyOyIsIlwidXNlIHN0cmljdFwiO1xuXG52YXIgU3RvcmUgPSByZXF1aXJlKCcuL3N0b3JlLmpzJyk7XG5cbnZhciBMb2dnZXIgPSB7XG4gIGxvZzogZnVuY3Rpb24gbG9nKHdoYXQpIHtcbiAgICBpZiAoIVN0b3JlLmxvZ3NFbmFibGVkKCkpIHtcbiAgICAgIHJldHVybiBmYWxzZTtcbiAgICB9IGVsc2Uge1xuICAgICAgTG9nZ2VyLmxvZyA9IGNvbnNvbGUubG9nLmJpbmQoY29uc29sZSk7XG4gICAgICBMb2dnZXIubG9nKHdoYXQpO1xuICAgIH1cbiAgfSxcbiAgZXJyb3I6IGZ1bmN0aW9uIGVycm9yKGVycikge1xuICAgIGlmICghU3RvcmUubG9nc0VuYWJsZWQoKSkge1xuICAgICAgcmV0dXJuIGZhbHNlO1xuICAgIH0gZWxzZSB7XG4gICAgICBMb2dnZXIuZXJyb3IgPSBjb25zb2xlLmVycm9yLmJpbmQoY29uc29sZSk7XG4gICAgICBMb2dnZXIuZXJyb3IoZXJyKTtcbiAgICB9XG4gIH1cbn07XG5tb2R1bGUuZXhwb3J0cyA9IExvZ2dlcjsiLCJcInVzZSBzdHJpY3RcIjtcblxudmFyIHNldHRpbmdzID0ge1xuICB0b3RhbFBhZ2VCdXR0b25zTnVtYmVyOiA4XG59O1xudmFyIFBhZ2luYXRvciA9IHtcbiAgc2V0U2V0dGluZ3M6IGZ1bmN0aW9uIHNldFNldHRpbmdzKHNldHRpbmcpIHtcbiAgICBmb3IgKHZhciBrZXkgaW4gc2V0dGluZykge1xuICAgICAgc2V0dGluZ3Nba2V5XSA9IHNldHRpbmdba2V5XTtcbiAgICB9XG4gIH0sXG4gIGdldFBhZ2VzUmFuZ2U6IGZ1bmN0aW9uIGdldFBhZ2VzUmFuZ2UoY3VycGFnZSwgdG90YWxQYWdlc09uUmVzdWx0U2V0KSB7XG4gICAgdmFyIHBhZ2VSYW5nZSA9IFt7XG4gICAgICBwYWdlbm86IGN1cnBhZ2UsXG4gICAgICBydW5uaW5ncGFnZTogdHJ1ZVxuICAgIH1dO1xuICAgIHZhciBoYXNuZXh0b25yaWdodCA9IHRydWU7XG4gICAgdmFyIGhhc25leHRvbmxlZnQgPSB0cnVlO1xuICAgIHZhciBpID0gMTtcblxuICAgIHdoaWxlIChwYWdlUmFuZ2UubGVuZ3RoIDwgc2V0dGluZ3MudG90YWxQYWdlQnV0dG9uc051bWJlciAmJiAoaGFzbmV4dG9ucmlnaHQgfHwgaGFzbmV4dG9ubGVmdCkpIHtcbiAgICAgIGlmIChoYXNuZXh0b25sZWZ0KSB7XG4gICAgICAgIGlmIChjdXJwYWdlIC0gaSA+IDApIHtcbiAgICAgICAgICBwYWdlUmFuZ2UucHVzaCh7XG4gICAgICAgICAgICBwYWdlbm86IGN1cnBhZ2UgLSBpLFxuICAgICAgICAgICAgcnVubmluZ3BhZ2U6IGZhbHNlXG4gICAgICAgICAgfSk7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgaGFzbmV4dG9ubGVmdCA9IGZhbHNlO1xuICAgICAgICB9XG4gICAgICB9XG5cbiAgICAgIGlmIChoYXNuZXh0b25yaWdodCkge1xuICAgICAgICBpZiAoY3VycGFnZSArIGkgLSAxIDwgdG90YWxQYWdlc09uUmVzdWx0U2V0KSB7XG4gICAgICAgICAgcGFnZVJhbmdlLnB1c2goe1xuICAgICAgICAgICAgcGFnZW5vOiBjdXJwYWdlICsgaSxcbiAgICAgICAgICAgIHJ1bm5pbmdwYWdlOiBmYWxzZVxuICAgICAgICAgIH0pO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgIGhhc25leHRvbnJpZ2h0ID0gZmFsc2U7XG4gICAgICAgIH1cbiAgICAgIH1cblxuICAgICAgaSsrO1xuICAgIH1cblxuICAgIHZhciBoYXNOZXh0ID0gY3VycGFnZSA8IHRvdGFsUGFnZXNPblJlc3VsdFNldDtcbiAgICB2YXIgaGFzUHJldmlvdXMgPSBjdXJwYWdlID4gMTtcbiAgICByZXR1cm4ge1xuICAgICAgYnV0dG9uczogcGFnZVJhbmdlLnNvcnQoZnVuY3Rpb24gKGl0ZW1BLCBpdGVtQikge1xuICAgICAgICByZXR1cm4gaXRlbUEucGFnZW5vIC0gaXRlbUIucGFnZW5vO1xuICAgICAgfSksXG4gICAgICBoYXNOZXh0OiBoYXNOZXh0LFxuICAgICAgaGFzUHJldmlvdXM6IGhhc1ByZXZpb3VzXG4gICAgfTtcbiAgfVxufTtcbm1vZHVsZS5leHBvcnRzID0gUGFnaW5hdG9yOyIsIid1c2Ugc3RyaWN0JztcblxudmFyIFN0b3JlID0gcmVxdWlyZSgnLi9zdG9yZS5qcycpO1xuXG52YXIgTG9nZ2VyID0gcmVxdWlyZSgnLi9sb2dnZXIuanMnKTtcblxudmFyIGF2YWlsYWJsZUxpc3RlbmVycyA9IHtcbiAgc2VhcmNoS2V5VXA6IHtcbiAgICBpbmZvOiAnTGlzdGVuZXIgb24ga2V5VXAgb2Ygc2VhcmNoIGlucHV0IG9uIHRvcCBiYXInXG4gIH0sXG4gIHNlYXJjaEVudGVyOiB7XG4gICAgaW5mbzogJ0xpc3RlbmVyIG9uIGVudGVyIGtleSBwcmVzc2VkIG9uIHNlYXJjaCBpbnB1dCBvbiB0b3AgYmFyJ1xuICB9LFxuICBzZWFyY2hPbkNoYW5nZToge1xuICAgIGluZm86ICdMaXN0ZW5lciBvbiBjaGFuZ2Ugb2YgaW5wdXQgdmFsdWUnXG4gIH1cbn07XG52YXIgUHViU3ViID0ge1xuICBnZXRBdmFpbGFibGVMaXN0ZW5lcnM6IGZ1bmN0aW9uIGdldEF2YWlsYWJsZUxpc3RlbmVycygpIHtcbiAgICByZXR1cm4gYXZhaWxhYmxlTGlzdGVuZXJzO1xuICB9LFxuICBzdWJzY3JpYmU6IGZ1bmN0aW9uIHN1YnNjcmliZShldmVudHQsIGZ1bmN0KSB7XG4gICAgaWYgKGV2ZW50dCA9PT0gXCJzZWFyY2hLZXlVcFwiKSB7XG4gICAgICB2YXIgZWwgPSBkb2N1bWVudC5nZXRFbGVtZW50QnlJZChTdG9yZS5nZXRTZWFyY2hJbnB1dElkKCkpO1xuICAgICAgZWwuYWRkRXZlbnRMaXN0ZW5lcigna2V5dXAnLCBmdW5jdCk7XG4gICAgICByZXR1cm4gZnVuY3Rpb24gKCkge1xuICAgICAgICBlbC5yZW1vdmVFdmVudExpc3RlbmVyKCdrZXl1cCcsIGZ1bmN0LCBmYWxzZSk7XG4gICAgICB9O1xuICAgIH0gZWxzZSBpZiAoZXZlbnR0ID09PSAnc2VhcmNoRW50ZXInKSB7XG4gICAgICB2YXIgaGFuZGxpbmdGdW5jdCA9IGZ1bmN0aW9uIGhhbmRsaW5nRnVuY3QoZSkge1xuICAgICAgICBpZiAoZS5rZXlDb2RlID09PSAxMykge1xuICAgICAgICAgIGZ1bmN0KGUpO1xuICAgICAgICB9XG4gICAgICB9O1xuXG4gICAgICBlbC5hZGRFdmVudExpc3RlbmVyKCdrZXlkb3duJywgaGFuZGxpbmdGdW5jdCk7XG4gICAgICByZXR1cm4gZnVuY3Rpb24gKCkge1xuICAgICAgICBlbC5yZW1vdmVFdmVudExpc3RlbmVyKCdrZXlkb3duJywgaGFuZGxpbmdGdW5jdCwgZmFsc2UpO1xuICAgICAgfTtcbiAgICB9IGVsc2UgaWYgKGV2ZW50dCA9PT0gJ3NlYXJjaE9uQ2hhbmdlJykge1xuICAgICAgdmFyIGVsID0gZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoU3RvcmUuZ2V0U2VhcmNoSW5wdXRJZCgpKTtcbiAgICAgIGVsLmFkZEV2ZW50TGlzdGVuZXIoJ2NoYW5nZScsIGZ1bmN0KTtcbiAgICAgIHJldHVybiBmdW5jdGlvbiAoKSB7XG4gICAgICAgIGVsLnJlbW92ZUV2ZW50TGlzdGVuZXIoJ2tleXVwJywgZnVuY3QsIGZhbHNlKTtcbiAgICAgIH07XG4gICAgfSBlbHNlIHtcbiAgICAgIExvZ2dlci5lcnJvcignVGhlIGV2ZW50IHlvdSB0cmllZCB0byBzdWJzY3JpYmUgaXMgbm90IGF2YWlsYWJsZSBieSB0aGUgbGlicmFyeScpO1xuICAgICAgTG9nZ2VyLmxvZygnVGhlIGF2YWlsYWJsZSBldmVudHMgYXJlOiAnLCBhdmFpbGFibGVMaXN0ZW5lcnMpO1xuICAgICAgcmV0dXJuIGZ1bmN0aW9uICgpIHt9O1xuICAgIH1cbiAgfVxufTtcbm1vZHVsZS5leHBvcnRzID0gUHViU3ViOyIsIlwidXNlIHN0cmljdFwiO1xuXG52YXIgc3RhdGUgPSB7XG4gIGdlbmVyYWw6IHtcbiAgICBmdWxsV2lkdGg6IGZhbHNlLFxuICAgIGRpc3BsYXlTdXBwb3J0OiBmYWxzZVxuICB9LFxuICB1c2VyRGF0YToge30sXG4gIGNvbmZpZ3VyYXRpb246IHtcbiAgICBzZXNzaW9uRW5kcG9pbnQ6ICdzZXNzaW9uJyxcbiAgICBiYXNlVXJsOiAnL2FwaS92MSdcbiAgfSxcbiAgaHRtbFRlbXBsYXRlOiBcIlwiLFxuICBhcHBzOiBudWxsLFxuICB2ZXJzaW9uTnVtYmVyOiAnJyxcbiAgZGV2OiBmYWxzZSxcbiAgZmlsZVBpY2tlcjoge1xuICAgIHNlbGVjdGVkRmlsZTogbnVsbFxuICB9LFxuICBhcHBJbmZvOiBudWxsLFxuICBzZXNzaW9uRW5kcG9pbnRCeVVzZXI6IGZhbHNlXG59O1xuXG5mdW5jdGlvbiBhc3NlbWJsZShsaXRlcmFsLCBwYXJhbXMpIHtcbiAgcmV0dXJuIG5ldyBGdW5jdGlvbihwYXJhbXMsIFwicmV0dXJuIGBcIiArIGxpdGVyYWwgKyBcImA7XCIpO1xufVxuXG52YXIgU3RvcmUgPSB7XG4gIGdldFN0YXRlOiBmdW5jdGlvbiBnZXRTdGF0ZSgpIHtcbiAgICByZXR1cm4gT2JqZWN0LmFzc2lnbih7fSwgc3RhdGUpO1xuICB9LFxuICBzZXRXaW5kb3dOYW1lOiBmdW5jdGlvbiBzZXRXaW5kb3dOYW1lKHduKSB7XG4gICAgc3RhdGUuZ2VuZXJhbC53aW5kb3dOYW1lID0gd247XG4gIH0sXG4gIHNldEZ1bGxXaWR0aDogZnVuY3Rpb24gc2V0RnVsbFdpZHRoKGZ3KSB7XG4gICAgc3RhdGUuZ2VuZXJhbC5mdWxsV2lkdGggPSBmdztcbiAgfSxcbiAgc2V0RGlzcGxheVN1cHBvcnQ6IGZ1bmN0aW9uIHNldERpc3BsYXlTdXBwb3J0KGRpc3BsYXkpIHtcbiAgICBzdGF0ZS5nZW5lcmFsLmRpc3BsYXlTdXBwb3J0ID0gZGlzcGxheTtcbiAgfSxcbiAgc2V0RGV2OiBmdW5jdGlvbiBzZXREZXYoZGV2KSB7XG4gICAgc3RhdGUuZGV2ID0gZGV2O1xuICB9LFxuICBzZXRVcmxWZXJzaW9uUHJlZml4OiBmdW5jdGlvbiBzZXRVcmxWZXJzaW9uUHJlZml4KHByZWZpeCkge1xuICAgIHN0YXRlLmNvbmZpZ3VyYXRpb24uYmFzZVVybCA9IHByZWZpeDtcbiAgfSxcbiAgZ2V0RGV2VXJsUGFydDogZnVuY3Rpb24gZ2V0RGV2VXJsUGFydCgpIHtcbiAgICBpZiAoc3RhdGUuZGV2KSB7XG4gICAgICByZXR1cm4gXCJzYW5kYm94L1wiO1xuICAgIH0gZWxzZSB7XG4gICAgICByZXR1cm4gXCJcIjtcbiAgICB9XG4gIH0sXG4gIGdldEZ1bGxCYXNlVXJsOiBmdW5jdGlvbiBnZXRGdWxsQmFzZVVybCgpIHtcbiAgICByZXR1cm4gc3RhdGUuY29uZmlndXJhdGlvbi5yb290VXJsICsgc3RhdGUuY29uZmlndXJhdGlvbi5iYXNlVXJsICsgU3RvcmUuZ2V0RGV2VXJsUGFydCgpO1xuICB9LFxuXG4gIC8qXG4gICBjb25mOlxuICAgLSBoZWFkZXJEaXZJZFxuICAgLSBpbmNsdWRlQXBwc01lbnVcbiAgICovXG4gIHNldENvbmZpZ3VyYXRpb246IGZ1bmN0aW9uIHNldENvbmZpZ3VyYXRpb24oY29uZikge1xuICAgIGZvciAodmFyIGtleSBpbiBjb25mKSB7XG4gICAgICBzdGF0ZS5jb25maWd1cmF0aW9uW2tleV0gPSBjb25mW2tleV07XG4gICAgfVxuICB9LFxuICBzZXRWZXJzaW9uTnVtYmVyOiBmdW5jdGlvbiBzZXRWZXJzaW9uTnVtYmVyKHZlcnNpb24pIHtcbiAgICBzdGF0ZS52ZXJzaW9uTnVtYmVyID0gdmVyc2lvbjtcbiAgfSxcbiAgZ2V0VmVyc2lvbk51bWJlcjogZnVuY3Rpb24gZ2V0VmVyc2lvbk51bWJlcigpIHtcbiAgICByZXR1cm4gc3RhdGUudmVyc2lvbk51bWJlcjtcbiAgfSxcbiAgZ2V0QXBwc1Zpc2libGU6IGZ1bmN0aW9uIGdldEFwcHNWaXNpYmxlKCkge1xuICAgIGlmIChzdGF0ZS5jb25maWd1cmF0aW9uLmFwcHNWaXNpYmxlID09PSBudWxsIHx8IHN0YXRlLmNvbmZpZ3VyYXRpb24uYXBwc1Zpc2libGUgPT09IHVuZGVmaW5lZCkge1xuICAgICAgcmV0dXJuIHRydWU7XG4gICAgfSBlbHNlIHtcbiAgICAgIHJldHVybiBzdGF0ZS5jb25maWd1cmF0aW9uLmFwcHNWaXNpYmxlO1xuICAgIH1cbiAgfSxcbiAgc2V0QXBwc1Zpc2libGU6IGZ1bmN0aW9uIHNldEFwcHNWaXNpYmxlKGFwcHNWaXNpYmxlKSB7XG4gICAgc3RhdGUuY29uZmlndXJhdGlvbi5hcHBzVmlzaWJsZSA9IGFwcHNWaXNpYmxlO1xuICB9LFxuICBzZXRIVE1MVGVtcGxhdGU6IGZ1bmN0aW9uIHNldEhUTUxUZW1wbGF0ZSh0ZW1wbGF0ZSkge1xuICAgIHN0YXRlLmh0bWxUZW1wbGF0ZSA9IHRlbXBsYXRlO1xuICB9LFxuICBzZXRBcHBzOiBmdW5jdGlvbiBzZXRBcHBzKGFwcHMpIHtcbiAgICBzdGF0ZS5hcHBzID0gYXBwcztcbiAgfSxcbiAgc2V0QXBwSW5mbzogZnVuY3Rpb24gc2V0QXBwSW5mbyhhcHBJbmZvKSB7XG4gICAgc3RhdGUuYXBwSW5mbyA9IGFwcEluZm87XG4gIH0sXG4gIGdldEFwcEluZm86IGZ1bmN0aW9uIGdldEFwcEluZm8oKSB7XG4gICAgcmV0dXJuIHN0YXRlLmFwcEluZm87XG4gIH0sXG4gIGdldExvZ2luVXJsOiBmdW5jdGlvbiBnZXRMb2dpblVybCgpIHtcbiAgICByZXR1cm4gc3RhdGUuY29uZmlndXJhdGlvbi5yb290VXJsICsgc3RhdGUuY29uZmlndXJhdGlvbi5sb2dpblVybDsgLy8gKyBcIj9cIiArIHN0YXRlLmNvbmZpZ3VyYXRpb24ucmVkaXJlY3RVcmxQYXJhbSArIFwiPVwiICsgd2luZG93LmxvY2F0aW9uLmhyZWY7XG4gIH0sXG4gIGdldEF1dGhlbnRpY2F0aW9uRW5kcG9pbnQ6IGZ1bmN0aW9uIGdldEF1dGhlbnRpY2F0aW9uRW5kcG9pbnQoKSB7XG4gICAgaWYgKHN0YXRlLnNlc3Npb25FbmRwb2ludEJ5VXNlcikge1xuICAgICAgcmV0dXJuIFN0b3JlLmdldEZ1bGxCYXNlVXJsKCkgKyBzdGF0ZS5jb25maWd1cmF0aW9uLnNlc3Npb25FbmRwb2ludDtcbiAgICB9XG5cbiAgICByZXR1cm4gU3RvcmUuZ2V0RnVsbEJhc2VVcmwoKSArIHN0YXRlLmNvbmZpZ3VyYXRpb24uc2Vzc2lvbkVuZHBvaW50O1xuICB9LFxuICBnZXRTd2l0Y2hBY2NvdW50RW5kcG9pbnQ6IGZ1bmN0aW9uIGdldFN3aXRjaEFjY291bnRFbmRwb2ludChhY2NvdW50SWQpIHtcbiAgICByZXR1cm4gU3RvcmUuZ2V0RnVsbEJhc2VVcmwoKSArICdhY2NvdW50cy9zd2l0Y2gvJyArIGFjY291bnRJZDtcbiAgfSxcbiAgZ2V0QXBwc0VuZHBvaW50OiBmdW5jdGlvbiBnZXRBcHBzRW5kcG9pbnQoKSB7XG4gICAgcmV0dXJuIFN0b3JlLmdldEZ1bGxCYXNlVXJsKCkgKyAnYXBwcyc7XG4gIH0sXG4gIGdldENsb3VkaW5hcnlFbmRwb2ludDogZnVuY3Rpb24gZ2V0Q2xvdWRpbmFyeUVuZHBvaW50KCkge1xuICAgIHJldHVybiBTdG9yZS5nZXRGdWxsQmFzZVVybCgpICsgJ2Fzc2V0cyc7XG4gIH0sXG4gIGxvZ3NFbmFibGVkOiBmdW5jdGlvbiBsb2dzRW5hYmxlZCgpIHtcbiAgICByZXR1cm4gc3RhdGUuY29uZmlndXJhdGlvbi5sb2dzO1xuICB9LFxuICBnZXRTZWFyY2hJbnB1dElkOiBmdW5jdGlvbiBnZXRTZWFyY2hJbnB1dElkKCkge1xuICAgIHJldHVybiBzdGF0ZS5jb25maWd1cmF0aW9uLnNlYXJjaElucHV0SWQ7XG4gIH0sXG4gIHNldEhUTUxDb250YWluZXI6IGZ1bmN0aW9uIHNldEhUTUxDb250YWluZXIoaWQpIHtcbiAgICBzdGF0ZS5jb25maWd1cmF0aW9uLmhlYWRlckRpdklkID0gaWQ7XG4gIH0sXG4gIGdldEhUTE1Db250YWluZXI6IGZ1bmN0aW9uIGdldEhUTE1Db250YWluZXIoKSB7XG4gICAgaWYgKHN0YXRlLmNvbmZpZ3VyYXRpb24uaGVhZGVyRGl2SWQpIHtcbiAgICAgIHJldHVybiBzdGF0ZS5jb25maWd1cmF0aW9uLmhlYWRlckRpdklkO1xuICAgIH0gZWxzZSB7XG4gICAgICByZXR1cm4gXCJwcHNkay1jb250YWluZXJcIjtcbiAgICB9XG4gIH0sXG4gIGdldEhUTUw6IGZ1bmN0aW9uIGdldEhUTUwoKSB7XG4gICAgcmV0dXJuIHN0YXRlLmh0bWxUZW1wbGF0ZTtcbiAgfSxcbiAgc2V0U2Vzc2lvbkVuZHBvaW50OiBmdW5jdGlvbiBzZXRTZXNzaW9uRW5kcG9pbnQoc2Vzc2lvbkVuZHBvaW50KSB7XG4gICAgaWYgKHNlc3Npb25FbmRwb2ludC5pbmRleE9mKCcvJykgPT09IDApIHtcbiAgICAgIHNlc3Npb25FbmRwb2ludCA9IHNlc3Npb25FbmRwb2ludC5zdWJzdHJpbmcoMSwgc2Vzc2lvbkVuZHBvaW50Lmxlbmd0aCAtIDEpO1xuICAgIH1cblxuICAgIHN0YXRlLnNlc3Npb25FbmRwb2ludEJ5VXNlciA9IHRydWU7XG4gICAgc3RhdGUuY29uZmlndXJhdGlvbi5zZXNzaW9uRW5kcG9pbnQgPSBzZXNzaW9uRW5kcG9pbnQ7XG4gIH0sXG4gIGdldFdpbmRvd05hbWU6IGZ1bmN0aW9uIGdldFdpbmRvd05hbWUoKSB7XG4gICAgcmV0dXJuIHN0YXRlLmdlbmVyYWwud2luZG93TmFtZTtcbiAgfSxcbiAgZ2V0RnVsbFdpZHRoOiBmdW5jdGlvbiBnZXRGdWxsV2lkdGgoKSB7XG4gICAgcmV0dXJuIHN0YXRlLmdlbmVyYWwuZnVsbFdpZHRoO1xuICB9LFxuICBnZXREaXNwbGF5U3VwcG9ydDogZnVuY3Rpb24gZ2V0RGlzcGxheVN1cHBvcnQoKSB7XG4gICAgcmV0dXJuIHN0YXRlLmdlbmVyYWwuZGlzcGxheVN1cHBvcnQ7XG4gIH0sXG4gIHNldFVzZXJEYXRhOiBmdW5jdGlvbiBzZXRVc2VyRGF0YSh1c2VyRGF0YSkge1xuICAgIHN0YXRlLnVzZXJEYXRhID0gdXNlckRhdGE7XG4gIH0sXG4gIGdldFVzZXJEYXRhOiBmdW5jdGlvbiBnZXRVc2VyRGF0YSgpIHtcbiAgICByZXR1cm4gc3RhdGUudXNlckRhdGE7XG4gIH0sXG4gIHNldFJvb3RVcmw6IGZ1bmN0aW9uIHNldFJvb3RVcmwocm9vdFVybCkge1xuICAgIHN0YXRlLmNvbmZpZ3VyYXRpb24ucm9vdFVybCA9IHJvb3RVcmwucmVwbGFjZSgvXFwvPyQvLCAnLycpO1xuICAgIDtcbiAgfSxcbiAgZ2V0Um9vdFVybDogZnVuY3Rpb24gZ2V0Um9vdFVybCgpIHtcbiAgICByZXR1cm4gc3RhdGUuY29uZmlndXJhdGlvbi5yb290VXJsO1xuICB9LFxuICBnZXRBdmF0YXJVcGxvYWRVcmw6IGZ1bmN0aW9uIGdldEF2YXRhclVwbG9hZFVybCgpIHtcbiAgICByZXR1cm4gU3RvcmUuZ2V0RnVsbEJhc2VVcmwoKSArICdhc3NldHMvdXBsb2FkJztcbiAgfSxcbiAgZ2V0QXZhdGFyVXBkYXRlVXJsOiBmdW5jdGlvbiBnZXRBdmF0YXJVcGRhdGVVcmwoKSB7XG4gICAgcmV0dXJuIFN0b3JlLmdldEZ1bGxCYXNlVXJsKCkgKyAndXNlcnMvYXZhdGFyJztcbiAgfVxufTtcbm1vZHVsZS5leHBvcnRzID0gU3RvcmU7Il19
