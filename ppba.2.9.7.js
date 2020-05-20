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
          // console.log(result);
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
          // console.log(result);
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
 * version: 2.9.7
 * date: 2020-05-20
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
ppba.setVersionNumber('2.9.7');
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
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uLy4uL25vZGVfbW9kdWxlcy9icm93c2VyLXBhY2svX3ByZWx1ZGUuanMiLCIuLi8uLi9ub2RlX21vZHVsZXMvYW1wbGl0dWRlLWpzL2FtcGxpdHVkZS51bWQuanMiLCIuLi8uLi9ub2RlX21vZHVsZXMvYXNhcC9icm93c2VyLXJhdy5qcyIsIi4uLy4uL25vZGVfbW9kdWxlcy9iYXNlNjQtanMvaW5kZXguanMiLCIuLi8uLi9ub2RlX21vZHVsZXMvYnVmZmVyL2luZGV4LmpzIiwiLi4vLi4vbm9kZV9tb2R1bGVzL2llZWU3NTQvaW5kZXguanMiLCIuLi8uLi9ub2RlX21vZHVsZXMvcHJvbWlzZS9saWIvY29yZS5qcyIsIi4uLy4uL25vZGVfbW9kdWxlcy9wcm9taXNlL2xpYi9lczYtZXh0ZW5zaW9ucy5qcyIsIi4uLy4uL25vZGVfbW9kdWxlcy9wcm9taXNlL2xpYi9yZWplY3Rpb24tdHJhY2tpbmcuanMiLCJQUEJBLmpzIiwiaW5kZXguanMiLCJtb2R1bGVzL2FjY291bnQtY29uc2lzdGVuY3ktZ3VhcmQuanMiLCJtb2R1bGVzL2FtcGxpdHVkZS5qcyIsIm1vZHVsZXMvYXZhdGFyLWNvbnRyb2xsZXIuanMiLCJtb2R1bGVzL2NhbGxlci5qcyIsIm1vZHVsZXMvY2xvdWRpbmFyeS1pbWFnZS1waWNrZXIuanMiLCJtb2R1bGVzL2RvbS5qcyIsIm1vZHVsZXMvaW5mby1jb250cm9sbGVyLmpzIiwibW9kdWxlcy9sb2dnZXIuanMiLCJtb2R1bGVzL3BhZ2luYXRpb24taGVscGVyLmpzIiwibW9kdWxlcy9wdWJzdWIuanMiLCJtb2R1bGVzL3N0b3JlLmpzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOztBQ0FBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7Ozs7O0FDemdMQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOzs7O0FDL05BO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7O0FDeEpBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7OztBQ3Z3REE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDcEZBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3JOQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDM0dBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDaEhBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNuYUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDMUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDdEJBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDdEJBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQzlIQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3ZHQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUMvUEE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3BCQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNsSEE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUN0QkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDekRBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDcERBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQSIsImZpbGUiOiJnZW5lcmF0ZWQuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlc0NvbnRlbnQiOlsiKGZ1bmN0aW9uKCl7ZnVuY3Rpb24gcihlLG4sdCl7ZnVuY3Rpb24gbyhpLGYpe2lmKCFuW2ldKXtpZighZVtpXSl7dmFyIGM9XCJmdW5jdGlvblwiPT10eXBlb2YgcmVxdWlyZSYmcmVxdWlyZTtpZighZiYmYylyZXR1cm4gYyhpLCEwKTtpZih1KXJldHVybiB1KGksITApO3ZhciBhPW5ldyBFcnJvcihcIkNhbm5vdCBmaW5kIG1vZHVsZSAnXCIraStcIidcIik7dGhyb3cgYS5jb2RlPVwiTU9EVUxFX05PVF9GT1VORFwiLGF9dmFyIHA9bltpXT17ZXhwb3J0czp7fX07ZVtpXVswXS5jYWxsKHAuZXhwb3J0cyxmdW5jdGlvbihyKXt2YXIgbj1lW2ldWzFdW3JdO3JldHVybiBvKG58fHIpfSxwLHAuZXhwb3J0cyxyLGUsbix0KX1yZXR1cm4gbltpXS5leHBvcnRzfWZvcih2YXIgdT1cImZ1bmN0aW9uXCI9PXR5cGVvZiByZXF1aXJlJiZyZXF1aXJlLGk9MDtpPHQubGVuZ3RoO2krKylvKHRbaV0pO3JldHVybiBvfXJldHVybiByfSkoKSIsIihmdW5jdGlvbiAoZ2xvYmFsLCBmYWN0b3J5KSB7XG4gIHR5cGVvZiBleHBvcnRzID09PSAnb2JqZWN0JyAmJiB0eXBlb2YgbW9kdWxlICE9PSAndW5kZWZpbmVkJyA/IG1vZHVsZS5leHBvcnRzID0gZmFjdG9yeSgpIDpcbiAgdHlwZW9mIGRlZmluZSA9PT0gJ2Z1bmN0aW9uJyAmJiBkZWZpbmUuYW1kID8gZGVmaW5lKCdhbXBsaXR1ZGUnLCBmYWN0b3J5KSA6XG4gIChnbG9iYWwgPSBnbG9iYWwgfHwgc2VsZiwgZ2xvYmFsLmFtcGxpdHVkZSA9IGZhY3RvcnkoKSk7XG59KHRoaXMsIGZ1bmN0aW9uICgpIHsgJ3VzZSBzdHJpY3QnO1xuXG4gIGZ1bmN0aW9uIF90eXBlb2Yob2JqKSB7XG4gICAgaWYgKHR5cGVvZiBTeW1ib2wgPT09IFwiZnVuY3Rpb25cIiAmJiB0eXBlb2YgU3ltYm9sLml0ZXJhdG9yID09PSBcInN5bWJvbFwiKSB7XG4gICAgICBfdHlwZW9mID0gZnVuY3Rpb24gKG9iaikge1xuICAgICAgICByZXR1cm4gdHlwZW9mIG9iajtcbiAgICAgIH07XG4gICAgfSBlbHNlIHtcbiAgICAgIF90eXBlb2YgPSBmdW5jdGlvbiAob2JqKSB7XG4gICAgICAgIHJldHVybiBvYmogJiYgdHlwZW9mIFN5bWJvbCA9PT0gXCJmdW5jdGlvblwiICYmIG9iai5jb25zdHJ1Y3RvciA9PT0gU3ltYm9sICYmIG9iaiAhPT0gU3ltYm9sLnByb3RvdHlwZSA/IFwic3ltYm9sXCIgOiB0eXBlb2Ygb2JqO1xuICAgICAgfTtcbiAgICB9XG5cbiAgICByZXR1cm4gX3R5cGVvZihvYmopO1xuICB9XG5cbiAgZnVuY3Rpb24gX2NsYXNzQ2FsbENoZWNrKGluc3RhbmNlLCBDb25zdHJ1Y3Rvcikge1xuICAgIGlmICghKGluc3RhbmNlIGluc3RhbmNlb2YgQ29uc3RydWN0b3IpKSB7XG4gICAgICB0aHJvdyBuZXcgVHlwZUVycm9yKFwiQ2Fubm90IGNhbGwgYSBjbGFzcyBhcyBhIGZ1bmN0aW9uXCIpO1xuICAgIH1cbiAgfVxuXG4gIGZ1bmN0aW9uIF9kZWZpbmVQcm9wZXJ0aWVzKHRhcmdldCwgcHJvcHMpIHtcbiAgICBmb3IgKHZhciBpID0gMDsgaSA8IHByb3BzLmxlbmd0aDsgaSsrKSB7XG4gICAgICB2YXIgZGVzY3JpcHRvciA9IHByb3BzW2ldO1xuICAgICAgZGVzY3JpcHRvci5lbnVtZXJhYmxlID0gZGVzY3JpcHRvci5lbnVtZXJhYmxlIHx8IGZhbHNlO1xuICAgICAgZGVzY3JpcHRvci5jb25maWd1cmFibGUgPSB0cnVlO1xuICAgICAgaWYgKFwidmFsdWVcIiBpbiBkZXNjcmlwdG9yKSBkZXNjcmlwdG9yLndyaXRhYmxlID0gdHJ1ZTtcbiAgICAgIE9iamVjdC5kZWZpbmVQcm9wZXJ0eSh0YXJnZXQsIGRlc2NyaXB0b3Iua2V5LCBkZXNjcmlwdG9yKTtcbiAgICB9XG4gIH1cblxuICBmdW5jdGlvbiBfY3JlYXRlQ2xhc3MoQ29uc3RydWN0b3IsIHByb3RvUHJvcHMsIHN0YXRpY1Byb3BzKSB7XG4gICAgaWYgKHByb3RvUHJvcHMpIF9kZWZpbmVQcm9wZXJ0aWVzKENvbnN0cnVjdG9yLnByb3RvdHlwZSwgcHJvdG9Qcm9wcyk7XG4gICAgaWYgKHN0YXRpY1Byb3BzKSBfZGVmaW5lUHJvcGVydGllcyhDb25zdHJ1Y3Rvciwgc3RhdGljUHJvcHMpO1xuICAgIHJldHVybiBDb25zdHJ1Y3RvcjtcbiAgfVxuXG4gIGZ1bmN0aW9uIF9kZWZpbmVQcm9wZXJ0eShvYmosIGtleSwgdmFsdWUpIHtcbiAgICBpZiAoa2V5IGluIG9iaikge1xuICAgICAgT2JqZWN0LmRlZmluZVByb3BlcnR5KG9iaiwga2V5LCB7XG4gICAgICAgIHZhbHVlOiB2YWx1ZSxcbiAgICAgICAgZW51bWVyYWJsZTogdHJ1ZSxcbiAgICAgICAgY29uZmlndXJhYmxlOiB0cnVlLFxuICAgICAgICB3cml0YWJsZTogdHJ1ZVxuICAgICAgfSk7XG4gICAgfSBlbHNlIHtcbiAgICAgIG9ialtrZXldID0gdmFsdWU7XG4gICAgfVxuXG4gICAgcmV0dXJuIG9iajtcbiAgfVxuXG4gIGZ1bmN0aW9uIF9vYmplY3RTcHJlYWQodGFyZ2V0KSB7XG4gICAgZm9yICh2YXIgaSA9IDE7IGkgPCBhcmd1bWVudHMubGVuZ3RoOyBpKyspIHtcbiAgICAgIHZhciBzb3VyY2UgPSBhcmd1bWVudHNbaV0gIT0gbnVsbCA/IGFyZ3VtZW50c1tpXSA6IHt9O1xuICAgICAgdmFyIG93bktleXMgPSBPYmplY3Qua2V5cyhzb3VyY2UpO1xuXG4gICAgICBpZiAodHlwZW9mIE9iamVjdC5nZXRPd25Qcm9wZXJ0eVN5bWJvbHMgPT09ICdmdW5jdGlvbicpIHtcbiAgICAgICAgb3duS2V5cyA9IG93bktleXMuY29uY2F0KE9iamVjdC5nZXRPd25Qcm9wZXJ0eVN5bWJvbHMoc291cmNlKS5maWx0ZXIoZnVuY3Rpb24gKHN5bSkge1xuICAgICAgICAgIHJldHVybiBPYmplY3QuZ2V0T3duUHJvcGVydHlEZXNjcmlwdG9yKHNvdXJjZSwgc3ltKS5lbnVtZXJhYmxlO1xuICAgICAgICB9KSk7XG4gICAgICB9XG5cbiAgICAgIG93bktleXMuZm9yRWFjaChmdW5jdGlvbiAoa2V5KSB7XG4gICAgICAgIF9kZWZpbmVQcm9wZXJ0eSh0YXJnZXQsIGtleSwgc291cmNlW2tleV0pO1xuICAgICAgfSk7XG4gICAgfVxuXG4gICAgcmV0dXJuIHRhcmdldDtcbiAgfVxuXG4gIHZhciBDb25zdGFudHMgPSB7XG4gICAgREVGQVVMVF9JTlNUQU5DRTogJyRkZWZhdWx0X2luc3RhbmNlJyxcbiAgICBBUElfVkVSU0lPTjogMixcbiAgICBNQVhfU1RSSU5HX0xFTkdUSDogNDA5NixcbiAgICBNQVhfUFJPUEVSVFlfS0VZUzogMTAwMCxcbiAgICBJREVOVElGWV9FVkVOVDogJyRpZGVudGlmeScsXG4gICAgR1JPVVBfSURFTlRJRllfRVZFTlQ6ICckZ3JvdXBpZGVudGlmeScsXG4gICAgLy8gbG9jYWxTdG9yYWdlS2V5c1xuICAgIExBU1RfRVZFTlRfSUQ6ICdhbXBsaXR1ZGVfbGFzdEV2ZW50SWQnLFxuICAgIExBU1RfRVZFTlRfVElNRTogJ2FtcGxpdHVkZV9sYXN0RXZlbnRUaW1lJyxcbiAgICBMQVNUX0lERU5USUZZX0lEOiAnYW1wbGl0dWRlX2xhc3RJZGVudGlmeUlkJyxcbiAgICBMQVNUX1NFUVVFTkNFX05VTUJFUjogJ2FtcGxpdHVkZV9sYXN0U2VxdWVuY2VOdW1iZXInLFxuICAgIFNFU1NJT05fSUQ6ICdhbXBsaXR1ZGVfc2Vzc2lvbklkJyxcbiAgICAvLyBVc2VkIGluIGNvb2tpZSBhcyB3ZWxsXG4gICAgREVWSUNFX0lEOiAnYW1wbGl0dWRlX2RldmljZUlkJyxcbiAgICBPUFRfT1VUOiAnYW1wbGl0dWRlX29wdE91dCcsXG4gICAgVVNFUl9JRDogJ2FtcGxpdHVkZV91c2VySWQnLFxuICAgIENPT0tJRV9URVNUOiAnYW1wbGl0dWRlX2Nvb2tpZV90ZXN0JyxcbiAgICBDT09LSUVfUFJFRklYOiBcImFtcFwiLFxuICAgIC8vIHJldmVudWUga2V5c1xuICAgIFJFVkVOVUVfRVZFTlQ6ICdyZXZlbnVlX2Ftb3VudCcsXG4gICAgUkVWRU5VRV9QUk9EVUNUX0lEOiAnJHByb2R1Y3RJZCcsXG4gICAgUkVWRU5VRV9RVUFOVElUWTogJyRxdWFudGl0eScsXG4gICAgUkVWRU5VRV9QUklDRTogJyRwcmljZScsXG4gICAgUkVWRU5VRV9SRVZFTlVFX1RZUEU6ICckcmV2ZW51ZVR5cGUnLFxuICAgIEFNUF9ERVZJQ0VfSURfUEFSQU06ICdhbXBfZGV2aWNlX2lkJyxcbiAgICAvLyB1cmwgcGFyYW1cbiAgICBSRUZFUlJFUjogJ3JlZmVycmVyJyxcbiAgICAvLyBVVE0gUGFyYW1zXG4gICAgVVRNX1NPVVJDRTogJ3V0bV9zb3VyY2UnLFxuICAgIFVUTV9NRURJVU06ICd1dG1fbWVkaXVtJyxcbiAgICBVVE1fQ0FNUEFJR046ICd1dG1fY2FtcGFpZ24nLFxuICAgIFVUTV9URVJNOiAndXRtX3Rlcm0nLFxuICAgIFVUTV9DT05URU5UOiAndXRtX2NvbnRlbnQnXG4gIH07XG5cbiAgLyoganNoaW50IGJpdHdpc2U6IGZhbHNlICovXG5cbiAgLypcbiAgICogVVRGLTggZW5jb2Rlci9kZWNvZGVyXG4gICAqIGh0dHA6Ly93d3cud2VidG9vbGtpdC5pbmZvL1xuICAgKi9cbiAgdmFyIFVURjggPSB7XG4gICAgZW5jb2RlOiBmdW5jdGlvbiBlbmNvZGUocykge1xuICAgICAgdmFyIHV0ZnRleHQgPSAnJztcblxuICAgICAgZm9yICh2YXIgbiA9IDA7IG4gPCBzLmxlbmd0aDsgbisrKSB7XG4gICAgICAgIHZhciBjID0gcy5jaGFyQ29kZUF0KG4pO1xuXG4gICAgICAgIGlmIChjIDwgMTI4KSB7XG4gICAgICAgICAgdXRmdGV4dCArPSBTdHJpbmcuZnJvbUNoYXJDb2RlKGMpO1xuICAgICAgICB9IGVsc2UgaWYgKGMgPiAxMjcgJiYgYyA8IDIwNDgpIHtcbiAgICAgICAgICB1dGZ0ZXh0ICs9IFN0cmluZy5mcm9tQ2hhckNvZGUoYyA+PiA2IHwgMTkyKTtcbiAgICAgICAgICB1dGZ0ZXh0ICs9IFN0cmluZy5mcm9tQ2hhckNvZGUoYyAmIDYzIHwgMTI4KTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICB1dGZ0ZXh0ICs9IFN0cmluZy5mcm9tQ2hhckNvZGUoYyA+PiAxMiB8IDIyNCk7XG4gICAgICAgICAgdXRmdGV4dCArPSBTdHJpbmcuZnJvbUNoYXJDb2RlKGMgPj4gNiAmIDYzIHwgMTI4KTtcbiAgICAgICAgICB1dGZ0ZXh0ICs9IFN0cmluZy5mcm9tQ2hhckNvZGUoYyAmIDYzIHwgMTI4KTtcbiAgICAgICAgfVxuICAgICAgfVxuXG4gICAgICByZXR1cm4gdXRmdGV4dDtcbiAgICB9LFxuICAgIGRlY29kZTogZnVuY3Rpb24gZGVjb2RlKHV0ZnRleHQpIHtcbiAgICAgIHZhciBzID0gJyc7XG4gICAgICB2YXIgaSA9IDA7XG4gICAgICB2YXIgYyA9IDAsXG4gICAgICAgICAgYzEgPSAwLFxuICAgICAgICAgIGMyID0gMDtcblxuICAgICAgd2hpbGUgKGkgPCB1dGZ0ZXh0Lmxlbmd0aCkge1xuICAgICAgICBjID0gdXRmdGV4dC5jaGFyQ29kZUF0KGkpO1xuXG4gICAgICAgIGlmIChjIDwgMTI4KSB7XG4gICAgICAgICAgcyArPSBTdHJpbmcuZnJvbUNoYXJDb2RlKGMpO1xuICAgICAgICAgIGkrKztcbiAgICAgICAgfSBlbHNlIGlmIChjID4gMTkxICYmIGMgPCAyMjQpIHtcbiAgICAgICAgICBjMSA9IHV0ZnRleHQuY2hhckNvZGVBdChpICsgMSk7XG4gICAgICAgICAgcyArPSBTdHJpbmcuZnJvbUNoYXJDb2RlKChjICYgMzEpIDw8IDYgfCBjMSAmIDYzKTtcbiAgICAgICAgICBpICs9IDI7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgYzEgPSB1dGZ0ZXh0LmNoYXJDb2RlQXQoaSArIDEpO1xuICAgICAgICAgIGMyID0gdXRmdGV4dC5jaGFyQ29kZUF0KGkgKyAyKTtcbiAgICAgICAgICBzICs9IFN0cmluZy5mcm9tQ2hhckNvZGUoKGMgJiAxNSkgPDwgMTIgfCAoYzEgJiA2MykgPDwgNiB8IGMyICYgNjMpO1xuICAgICAgICAgIGkgKz0gMztcbiAgICAgICAgfVxuICAgICAgfVxuXG4gICAgICByZXR1cm4gcztcbiAgICB9XG4gIH07XG5cbiAgLyoganNoaW50IGJpdHdpc2U6IGZhbHNlICovXG4gIC8qXG4gICAqIEJhc2U2NCBlbmNvZGVyL2RlY29kZXJcbiAgICogaHR0cDovL3d3dy53ZWJ0b29sa2l0LmluZm8vXG4gICAqL1xuXG4gIHZhciBCYXNlNjQgPSB7XG4gICAgX2tleVN0cjogJ0FCQ0RFRkdISUpLTE1OT1BRUlNUVVZXWFlaYWJjZGVmZ2hpamtsbW5vcHFyc3R1dnd4eXowMTIzNDU2Nzg5Ky89JyxcbiAgICBlbmNvZGU6IGZ1bmN0aW9uIGVuY29kZShpbnB1dCkge1xuICAgICAgdHJ5IHtcbiAgICAgICAgaWYgKHdpbmRvdy5idG9hICYmIHdpbmRvdy5hdG9iKSB7XG4gICAgICAgICAgcmV0dXJuIHdpbmRvdy5idG9hKHVuZXNjYXBlKGVuY29kZVVSSUNvbXBvbmVudChpbnB1dCkpKTtcbiAgICAgICAgfVxuICAgICAgfSBjYXRjaCAoZSkgey8vbG9nKGUpO1xuICAgICAgfVxuXG4gICAgICByZXR1cm4gQmFzZTY0Ll9lbmNvZGUoaW5wdXQpO1xuICAgIH0sXG4gICAgX2VuY29kZTogZnVuY3Rpb24gX2VuY29kZShpbnB1dCkge1xuICAgICAgdmFyIG91dHB1dCA9ICcnO1xuICAgICAgdmFyIGNocjEsIGNocjIsIGNocjMsIGVuYzEsIGVuYzIsIGVuYzMsIGVuYzQ7XG4gICAgICB2YXIgaSA9IDA7XG4gICAgICBpbnB1dCA9IFVURjguZW5jb2RlKGlucHV0KTtcblxuICAgICAgd2hpbGUgKGkgPCBpbnB1dC5sZW5ndGgpIHtcbiAgICAgICAgY2hyMSA9IGlucHV0LmNoYXJDb2RlQXQoaSsrKTtcbiAgICAgICAgY2hyMiA9IGlucHV0LmNoYXJDb2RlQXQoaSsrKTtcbiAgICAgICAgY2hyMyA9IGlucHV0LmNoYXJDb2RlQXQoaSsrKTtcbiAgICAgICAgZW5jMSA9IGNocjEgPj4gMjtcbiAgICAgICAgZW5jMiA9IChjaHIxICYgMykgPDwgNCB8IGNocjIgPj4gNDtcbiAgICAgICAgZW5jMyA9IChjaHIyICYgMTUpIDw8IDIgfCBjaHIzID4+IDY7XG4gICAgICAgIGVuYzQgPSBjaHIzICYgNjM7XG5cbiAgICAgICAgaWYgKGlzTmFOKGNocjIpKSB7XG4gICAgICAgICAgZW5jMyA9IGVuYzQgPSA2NDtcbiAgICAgICAgfSBlbHNlIGlmIChpc05hTihjaHIzKSkge1xuICAgICAgICAgIGVuYzQgPSA2NDtcbiAgICAgICAgfVxuXG4gICAgICAgIG91dHB1dCA9IG91dHB1dCArIEJhc2U2NC5fa2V5U3RyLmNoYXJBdChlbmMxKSArIEJhc2U2NC5fa2V5U3RyLmNoYXJBdChlbmMyKSArIEJhc2U2NC5fa2V5U3RyLmNoYXJBdChlbmMzKSArIEJhc2U2NC5fa2V5U3RyLmNoYXJBdChlbmM0KTtcbiAgICAgIH1cblxuICAgICAgcmV0dXJuIG91dHB1dDtcbiAgICB9LFxuICAgIGRlY29kZTogZnVuY3Rpb24gZGVjb2RlKGlucHV0KSB7XG4gICAgICB0cnkge1xuICAgICAgICBpZiAod2luZG93LmJ0b2EgJiYgd2luZG93LmF0b2IpIHtcbiAgICAgICAgICByZXR1cm4gZGVjb2RlVVJJQ29tcG9uZW50KGVzY2FwZSh3aW5kb3cuYXRvYihpbnB1dCkpKTtcbiAgICAgICAgfVxuICAgICAgfSBjYXRjaCAoZSkgey8vbG9nKGUpO1xuICAgICAgfVxuXG4gICAgICByZXR1cm4gQmFzZTY0Ll9kZWNvZGUoaW5wdXQpO1xuICAgIH0sXG4gICAgX2RlY29kZTogZnVuY3Rpb24gX2RlY29kZShpbnB1dCkge1xuICAgICAgdmFyIG91dHB1dCA9ICcnO1xuICAgICAgdmFyIGNocjEsIGNocjIsIGNocjM7XG4gICAgICB2YXIgZW5jMSwgZW5jMiwgZW5jMywgZW5jNDtcbiAgICAgIHZhciBpID0gMDtcbiAgICAgIGlucHV0ID0gaW5wdXQucmVwbGFjZSgvW15BLVphLXowLTlcXCtcXC9cXD1dL2csICcnKTtcblxuICAgICAgd2hpbGUgKGkgPCBpbnB1dC5sZW5ndGgpIHtcbiAgICAgICAgZW5jMSA9IEJhc2U2NC5fa2V5U3RyLmluZGV4T2YoaW5wdXQuY2hhckF0KGkrKykpO1xuICAgICAgICBlbmMyID0gQmFzZTY0Ll9rZXlTdHIuaW5kZXhPZihpbnB1dC5jaGFyQXQoaSsrKSk7XG4gICAgICAgIGVuYzMgPSBCYXNlNjQuX2tleVN0ci5pbmRleE9mKGlucHV0LmNoYXJBdChpKyspKTtcbiAgICAgICAgZW5jNCA9IEJhc2U2NC5fa2V5U3RyLmluZGV4T2YoaW5wdXQuY2hhckF0KGkrKykpO1xuICAgICAgICBjaHIxID0gZW5jMSA8PCAyIHwgZW5jMiA+PiA0O1xuICAgICAgICBjaHIyID0gKGVuYzIgJiAxNSkgPDwgNCB8IGVuYzMgPj4gMjtcbiAgICAgICAgY2hyMyA9IChlbmMzICYgMykgPDwgNiB8IGVuYzQ7XG4gICAgICAgIG91dHB1dCA9IG91dHB1dCArIFN0cmluZy5mcm9tQ2hhckNvZGUoY2hyMSk7XG5cbiAgICAgICAgaWYgKGVuYzMgIT09IDY0KSB7XG4gICAgICAgICAgb3V0cHV0ID0gb3V0cHV0ICsgU3RyaW5nLmZyb21DaGFyQ29kZShjaHIyKTtcbiAgICAgICAgfVxuXG4gICAgICAgIGlmIChlbmM0ICE9PSA2NCkge1xuICAgICAgICAgIG91dHB1dCA9IG91dHB1dCArIFN0cmluZy5mcm9tQ2hhckNvZGUoY2hyMyk7XG4gICAgICAgIH1cbiAgICAgIH1cblxuICAgICAgb3V0cHV0ID0gVVRGOC5kZWNvZGUob3V0cHV0KTtcbiAgICAgIHJldHVybiBvdXRwdXQ7XG4gICAgfVxuICB9O1xuXG4gIC8qKlxuICAgKiB0b1N0cmluZyByZWYuXG4gICAqIEBwcml2YXRlXG4gICAqL1xuICB2YXIgdG9TdHJpbmcgPSBPYmplY3QucHJvdG90eXBlLnRvU3RyaW5nO1xuICAvKipcbiAgICogUmV0dXJuIHRoZSB0eXBlIG9mIGB2YWxgLlxuICAgKiBAcHJpdmF0ZVxuICAgKiBAcGFyYW0ge01peGVkfSB2YWxcbiAgICogQHJldHVybiB7U3RyaW5nfVxuICAgKiBAYXBpIHB1YmxpY1xuICAgKi9cblxuICBmdW5jdGlvbiB0eXBlICh2YWwpIHtcbiAgICBzd2l0Y2ggKHRvU3RyaW5nLmNhbGwodmFsKSkge1xuICAgICAgY2FzZSAnW29iamVjdCBEYXRlXSc6XG4gICAgICAgIHJldHVybiAnZGF0ZSc7XG5cbiAgICAgIGNhc2UgJ1tvYmplY3QgUmVnRXhwXSc6XG4gICAgICAgIHJldHVybiAncmVnZXhwJztcblxuICAgICAgY2FzZSAnW29iamVjdCBBcmd1bWVudHNdJzpcbiAgICAgICAgcmV0dXJuICdhcmd1bWVudHMnO1xuXG4gICAgICBjYXNlICdbb2JqZWN0IEFycmF5XSc6XG4gICAgICAgIHJldHVybiAnYXJyYXknO1xuXG4gICAgICBjYXNlICdbb2JqZWN0IEVycm9yXSc6XG4gICAgICAgIHJldHVybiAnZXJyb3InO1xuICAgIH1cblxuICAgIGlmICh2YWwgPT09IG51bGwpIHtcbiAgICAgIHJldHVybiAnbnVsbCc7XG4gICAgfVxuXG4gICAgaWYgKHZhbCA9PT0gdW5kZWZpbmVkKSB7XG4gICAgICByZXR1cm4gJ3VuZGVmaW5lZCc7XG4gICAgfVxuXG4gICAgaWYgKHZhbCAhPT0gdmFsKSB7XG4gICAgICByZXR1cm4gJ25hbic7XG4gICAgfVxuXG4gICAgaWYgKHZhbCAmJiB2YWwubm9kZVR5cGUgPT09IDEpIHtcbiAgICAgIHJldHVybiAnZWxlbWVudCc7XG4gICAgfVxuXG4gICAgaWYgKHR5cGVvZiBCdWZmZXIgIT09ICd1bmRlZmluZWQnICYmIHR5cGVvZiBCdWZmZXIuaXNCdWZmZXIgPT09ICdmdW5jdGlvbicgJiYgQnVmZmVyLmlzQnVmZmVyKHZhbCkpIHtcbiAgICAgIHJldHVybiAnYnVmZmVyJztcbiAgICB9XG5cbiAgICB2YWwgPSB2YWwudmFsdWVPZiA/IHZhbC52YWx1ZU9mKCkgOiBPYmplY3QucHJvdG90eXBlLnZhbHVlT2YuYXBwbHkodmFsKTtcbiAgICByZXR1cm4gX3R5cGVvZih2YWwpO1xuICB9XG5cbiAgdmFyIGxvZ0xldmVscyA9IHtcbiAgICBESVNBQkxFOiAwLFxuICAgIEVSUk9SOiAxLFxuICAgIFdBUk46IDIsXG4gICAgSU5GTzogM1xuICB9O1xuICB2YXIgbG9nTGV2ZWwgPSBsb2dMZXZlbHMuV0FSTjtcblxuICB2YXIgc2V0TG9nTGV2ZWwgPSBmdW5jdGlvbiBzZXRMb2dMZXZlbChsb2dMZXZlbE5hbWUpIHtcbiAgICBpZiAobG9nTGV2ZWxzLmhhc093blByb3BlcnR5KGxvZ0xldmVsTmFtZSkpIHtcbiAgICAgIGxvZ0xldmVsID0gbG9nTGV2ZWxzW2xvZ0xldmVsTmFtZV07XG4gICAgfVxuICB9O1xuXG4gIHZhciBnZXRMb2dMZXZlbCA9IGZ1bmN0aW9uIGdldExvZ0xldmVsKCkge1xuICAgIHJldHVybiBsb2dMZXZlbDtcbiAgfTtcblxuICB2YXIgbG9nID0ge1xuICAgIGVycm9yOiBmdW5jdGlvbiBlcnJvcihzKSB7XG4gICAgICBpZiAobG9nTGV2ZWwgPj0gbG9nTGV2ZWxzLkVSUk9SKSB7XG4gICAgICAgIF9sb2cocyk7XG4gICAgICB9XG4gICAgfSxcbiAgICB3YXJuOiBmdW5jdGlvbiB3YXJuKHMpIHtcbiAgICAgIGlmIChsb2dMZXZlbCA+PSBsb2dMZXZlbHMuV0FSTikge1xuICAgICAgICBfbG9nKHMpO1xuICAgICAgfVxuICAgIH0sXG4gICAgaW5mbzogZnVuY3Rpb24gaW5mbyhzKSB7XG4gICAgICBpZiAobG9nTGV2ZWwgPj0gbG9nTGV2ZWxzLklORk8pIHtcbiAgICAgICAgX2xvZyhzKTtcbiAgICAgIH1cbiAgICB9XG4gIH07XG5cbiAgdmFyIF9sb2cgPSBmdW5jdGlvbiBfbG9nKHMpIHtcbiAgICB0cnkge1xuICAgICAgY29uc29sZS5sb2coJ1tBbXBsaXR1ZGVdICcgKyBzKTtcbiAgICB9IGNhdGNoIChlKSB7Ly8gY29uc29sZSBsb2dnaW5nIG5vdCBhdmFpbGFibGVcbiAgICB9XG4gIH07XG5cbiAgdmFyIGlzRW1wdHlTdHJpbmcgPSBmdW5jdGlvbiBpc0VtcHR5U3RyaW5nKHN0cikge1xuICAgIHJldHVybiAhc3RyIHx8IHN0ci5sZW5ndGggPT09IDA7XG4gIH07XG5cbiAgdmFyIHNlc3Npb25TdG9yYWdlRW5hYmxlZCA9IGZ1bmN0aW9uIHNlc3Npb25TdG9yYWdlRW5hYmxlZCgpIHtcbiAgICB0cnkge1xuICAgICAgaWYgKHdpbmRvdy5zZXNzaW9uU3RvcmFnZSkge1xuICAgICAgICByZXR1cm4gdHJ1ZTtcbiAgICAgIH1cbiAgICB9IGNhdGNoIChlKSB7fSAvLyBzZXNzaW9uU3RvcmFnZSBkaXNhYmxlZFxuXG5cbiAgICByZXR1cm4gZmFsc2U7XG4gIH07IC8vIHRydW5jYXRlIHN0cmluZyB2YWx1ZXMgaW4gZXZlbnQgYW5kIHVzZXIgcHJvcGVydGllcyBzbyB0aGF0IHJlcXVlc3Qgc2l6ZSBkb2VzIG5vdCBnZXQgdG9vIGxhcmdlXG5cblxuICB2YXIgdHJ1bmNhdGUgPSBmdW5jdGlvbiB0cnVuY2F0ZSh2YWx1ZSkge1xuICAgIGlmICh0eXBlKHZhbHVlKSA9PT0gJ2FycmF5Jykge1xuICAgICAgZm9yICh2YXIgaSA9IDA7IGkgPCB2YWx1ZS5sZW5ndGg7IGkrKykge1xuICAgICAgICB2YWx1ZVtpXSA9IHRydW5jYXRlKHZhbHVlW2ldKTtcbiAgICAgIH1cbiAgICB9IGVsc2UgaWYgKHR5cGUodmFsdWUpID09PSAnb2JqZWN0Jykge1xuICAgICAgZm9yICh2YXIga2V5IGluIHZhbHVlKSB7XG4gICAgICAgIGlmICh2YWx1ZS5oYXNPd25Qcm9wZXJ0eShrZXkpKSB7XG4gICAgICAgICAgdmFsdWVba2V5XSA9IHRydW5jYXRlKHZhbHVlW2tleV0pO1xuICAgICAgICB9XG4gICAgICB9XG4gICAgfSBlbHNlIHtcbiAgICAgIHZhbHVlID0gX3RydW5jYXRlVmFsdWUodmFsdWUpO1xuICAgIH1cblxuICAgIHJldHVybiB2YWx1ZTtcbiAgfTtcblxuICB2YXIgX3RydW5jYXRlVmFsdWUgPSBmdW5jdGlvbiBfdHJ1bmNhdGVWYWx1ZSh2YWx1ZSkge1xuICAgIGlmICh0eXBlKHZhbHVlKSA9PT0gJ3N0cmluZycpIHtcbiAgICAgIHJldHVybiB2YWx1ZS5sZW5ndGggPiBDb25zdGFudHMuTUFYX1NUUklOR19MRU5HVEggPyB2YWx1ZS5zdWJzdHJpbmcoMCwgQ29uc3RhbnRzLk1BWF9TVFJJTkdfTEVOR1RIKSA6IHZhbHVlO1xuICAgIH1cblxuICAgIHJldHVybiB2YWx1ZTtcbiAgfTtcblxuICB2YXIgdmFsaWRhdGVJbnB1dCA9IGZ1bmN0aW9uIHZhbGlkYXRlSW5wdXQoaW5wdXQsIG5hbWUsIGV4cGVjdGVkVHlwZSkge1xuICAgIGlmICh0eXBlKGlucHV0KSAhPT0gZXhwZWN0ZWRUeXBlKSB7XG4gICAgICBsb2cuZXJyb3IoJ0ludmFsaWQgJyArIG5hbWUgKyAnIGlucHV0IHR5cGUuIEV4cGVjdGVkICcgKyBleHBlY3RlZFR5cGUgKyAnIGJ1dCByZWNlaXZlZCAnICsgdHlwZShpbnB1dCkpO1xuICAgICAgcmV0dXJuIGZhbHNlO1xuICAgIH1cblxuICAgIHJldHVybiB0cnVlO1xuICB9OyAvLyBkbyBzb21lIGJhc2ljIHNhbml0aXphdGlvbiBhbmQgdHlwZSBjaGVja2luZywgYWxzbyBjYXRjaCBwcm9wZXJ0eSBkaWN0cyB3aXRoIG1vcmUgdGhhbiAxMDAwIGtleS92YWx1ZSBwYWlyc1xuXG5cbiAgdmFyIHZhbGlkYXRlUHJvcGVydGllcyA9IGZ1bmN0aW9uIHZhbGlkYXRlUHJvcGVydGllcyhwcm9wZXJ0aWVzKSB7XG4gICAgdmFyIHByb3BzVHlwZSA9IHR5cGUocHJvcGVydGllcyk7XG5cbiAgICBpZiAocHJvcHNUeXBlICE9PSAnb2JqZWN0Jykge1xuICAgICAgbG9nLmVycm9yKCdFcnJvcjogaW52YWxpZCBwcm9wZXJ0aWVzIGZvcm1hdC4gRXhwZWN0aW5nIEphdmFzY3JpcHQgb2JqZWN0LCByZWNlaXZlZCAnICsgcHJvcHNUeXBlICsgJywgaWdub3JpbmcnKTtcbiAgICAgIHJldHVybiB7fTtcbiAgICB9XG5cbiAgICBpZiAoT2JqZWN0LmtleXMocHJvcGVydGllcykubGVuZ3RoID4gQ29uc3RhbnRzLk1BWF9QUk9QRVJUWV9LRVlTKSB7XG4gICAgICBsb2cuZXJyb3IoJ0Vycm9yOiB0b28gbWFueSBwcm9wZXJ0aWVzIChtb3JlIHRoYW4gMTAwMCksIGlnbm9yaW5nJyk7XG4gICAgICByZXR1cm4ge307XG4gICAgfVxuXG4gICAgdmFyIGNvcHkgPSB7fTsgLy8gY3JlYXRlIGEgY29weSB3aXRoIGFsbCBvZiB0aGUgdmFsaWQgcHJvcGVydGllc1xuXG4gICAgZm9yICh2YXIgcHJvcGVydHkgaW4gcHJvcGVydGllcykge1xuICAgICAgaWYgKCFwcm9wZXJ0aWVzLmhhc093blByb3BlcnR5KHByb3BlcnR5KSkge1xuICAgICAgICBjb250aW51ZTtcbiAgICAgIH0gLy8gdmFsaWRhdGUga2V5XG5cblxuICAgICAgdmFyIGtleSA9IHByb3BlcnR5O1xuICAgICAgdmFyIGtleVR5cGUgPSB0eXBlKGtleSk7XG5cbiAgICAgIGlmIChrZXlUeXBlICE9PSAnc3RyaW5nJykge1xuICAgICAgICBrZXkgPSBTdHJpbmcoa2V5KTtcbiAgICAgICAgbG9nLndhcm4oJ1dBUk5JTkc6IE5vbi1zdHJpbmcgcHJvcGVydHkga2V5LCByZWNlaXZlZCB0eXBlICcgKyBrZXlUeXBlICsgJywgY29lcmNpbmcgdG8gc3RyaW5nIFwiJyArIGtleSArICdcIicpO1xuICAgICAgfSAvLyB2YWxpZGF0ZSB2YWx1ZVxuXG5cbiAgICAgIHZhciB2YWx1ZSA9IHZhbGlkYXRlUHJvcGVydHlWYWx1ZShrZXksIHByb3BlcnRpZXNbcHJvcGVydHldKTtcblxuICAgICAgaWYgKHZhbHVlID09PSBudWxsKSB7XG4gICAgICAgIGNvbnRpbnVlO1xuICAgICAgfVxuXG4gICAgICBjb3B5W2tleV0gPSB2YWx1ZTtcbiAgICB9XG5cbiAgICByZXR1cm4gY29weTtcbiAgfTtcblxuICB2YXIgaW52YWxpZFZhbHVlVHlwZXMgPSBbJ25hbicsICdmdW5jdGlvbicsICdhcmd1bWVudHMnLCAncmVnZXhwJywgJ2VsZW1lbnQnXTtcblxuICB2YXIgdmFsaWRhdGVQcm9wZXJ0eVZhbHVlID0gZnVuY3Rpb24gdmFsaWRhdGVQcm9wZXJ0eVZhbHVlKGtleSwgdmFsdWUpIHtcbiAgICB2YXIgdmFsdWVUeXBlID0gdHlwZSh2YWx1ZSk7XG5cbiAgICBpZiAoaW52YWxpZFZhbHVlVHlwZXMuaW5kZXhPZih2YWx1ZVR5cGUpICE9PSAtMSkge1xuICAgICAgbG9nLndhcm4oJ1dBUk5JTkc6IFByb3BlcnR5IGtleSBcIicgKyBrZXkgKyAnXCIgd2l0aCBpbnZhbGlkIHZhbHVlIHR5cGUgJyArIHZhbHVlVHlwZSArICcsIGlnbm9yaW5nJyk7XG4gICAgICB2YWx1ZSA9IG51bGw7XG4gICAgfSBlbHNlIGlmICh2YWx1ZVR5cGUgPT09ICd1bmRlZmluZWQnKSB7XG4gICAgICB2YWx1ZSA9IG51bGw7XG4gICAgfSBlbHNlIGlmICh2YWx1ZVR5cGUgPT09ICdlcnJvcicpIHtcbiAgICAgIHZhbHVlID0gU3RyaW5nKHZhbHVlKTtcbiAgICAgIGxvZy53YXJuKCdXQVJOSU5HOiBQcm9wZXJ0eSBrZXkgXCInICsga2V5ICsgJ1wiIHdpdGggdmFsdWUgdHlwZSBlcnJvciwgY29lcmNpbmcgdG8gJyArIHZhbHVlKTtcbiAgICB9IGVsc2UgaWYgKHZhbHVlVHlwZSA9PT0gJ2FycmF5Jykge1xuICAgICAgLy8gY2hlY2sgZm9yIG5lc3RlZCBhcnJheXMgb3Igb2JqZWN0c1xuICAgICAgdmFyIGFycmF5Q29weSA9IFtdO1xuXG4gICAgICBmb3IgKHZhciBpID0gMDsgaSA8IHZhbHVlLmxlbmd0aDsgaSsrKSB7XG4gICAgICAgIHZhciBlbGVtZW50ID0gdmFsdWVbaV07XG4gICAgICAgIHZhciBlbGVtVHlwZSA9IHR5cGUoZWxlbWVudCk7XG5cbiAgICAgICAgaWYgKGVsZW1UeXBlID09PSAnYXJyYXknKSB7XG4gICAgICAgICAgbG9nLndhcm4oJ1dBUk5JTkc6IENhbm5vdCBoYXZlICcgKyBlbGVtVHlwZSArICcgbmVzdGVkIGluIGFuIGFycmF5IHByb3BlcnR5IHZhbHVlLCBza2lwcGluZycpO1xuICAgICAgICAgIGNvbnRpbnVlO1xuICAgICAgICB9IGVsc2UgaWYgKGVsZW1UeXBlID09PSAnb2JqZWN0Jykge1xuICAgICAgICAgIGFycmF5Q29weS5wdXNoKHZhbGlkYXRlUHJvcGVydGllcyhlbGVtZW50KSk7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgYXJyYXlDb3B5LnB1c2godmFsaWRhdGVQcm9wZXJ0eVZhbHVlKGtleSwgZWxlbWVudCkpO1xuICAgICAgICB9XG4gICAgICB9XG5cbiAgICAgIHZhbHVlID0gYXJyYXlDb3B5O1xuICAgIH0gZWxzZSBpZiAodmFsdWVUeXBlID09PSAnb2JqZWN0Jykge1xuICAgICAgdmFsdWUgPSB2YWxpZGF0ZVByb3BlcnRpZXModmFsdWUpO1xuICAgIH1cblxuICAgIHJldHVybiB2YWx1ZTtcbiAgfTtcblxuICB2YXIgdmFsaWRhdGVHcm91cHMgPSBmdW5jdGlvbiB2YWxpZGF0ZUdyb3Vwcyhncm91cHMpIHtcbiAgICB2YXIgZ3JvdXBzVHlwZSA9IHR5cGUoZ3JvdXBzKTtcblxuICAgIGlmIChncm91cHNUeXBlICE9PSAnb2JqZWN0Jykge1xuICAgICAgbG9nLmVycm9yKCdFcnJvcjogaW52YWxpZCBncm91cHMgZm9ybWF0LiBFeHBlY3RpbmcgSmF2YXNjcmlwdCBvYmplY3QsIHJlY2VpdmVkICcgKyBncm91cHNUeXBlICsgJywgaWdub3JpbmcnKTtcbiAgICAgIHJldHVybiB7fTtcbiAgICB9XG5cbiAgICB2YXIgY29weSA9IHt9OyAvLyBjcmVhdGUgYSBjb3B5IHdpdGggYWxsIG9mIHRoZSB2YWxpZCBwcm9wZXJ0aWVzXG5cbiAgICBmb3IgKHZhciBncm91cCBpbiBncm91cHMpIHtcbiAgICAgIGlmICghZ3JvdXBzLmhhc093blByb3BlcnR5KGdyb3VwKSkge1xuICAgICAgICBjb250aW51ZTtcbiAgICAgIH0gLy8gdmFsaWRhdGUga2V5XG5cblxuICAgICAgdmFyIGtleSA9IGdyb3VwO1xuICAgICAgdmFyIGtleVR5cGUgPSB0eXBlKGtleSk7XG5cbiAgICAgIGlmIChrZXlUeXBlICE9PSAnc3RyaW5nJykge1xuICAgICAgICBrZXkgPSBTdHJpbmcoa2V5KTtcbiAgICAgICAgbG9nLndhcm4oJ1dBUk5JTkc6IE5vbi1zdHJpbmcgZ3JvdXBUeXBlLCByZWNlaXZlZCB0eXBlICcgKyBrZXlUeXBlICsgJywgY29lcmNpbmcgdG8gc3RyaW5nIFwiJyArIGtleSArICdcIicpO1xuICAgICAgfSAvLyB2YWxpZGF0ZSB2YWx1ZVxuXG5cbiAgICAgIHZhciB2YWx1ZSA9IHZhbGlkYXRlR3JvdXBOYW1lKGtleSwgZ3JvdXBzW2dyb3VwXSk7XG5cbiAgICAgIGlmICh2YWx1ZSA9PT0gbnVsbCkge1xuICAgICAgICBjb250aW51ZTtcbiAgICAgIH1cblxuICAgICAgY29weVtrZXldID0gdmFsdWU7XG4gICAgfVxuXG4gICAgcmV0dXJuIGNvcHk7XG4gIH07XG5cbiAgdmFyIHZhbGlkYXRlR3JvdXBOYW1lID0gZnVuY3Rpb24gdmFsaWRhdGVHcm91cE5hbWUoa2V5LCBncm91cE5hbWUpIHtcbiAgICB2YXIgZ3JvdXBOYW1lVHlwZSA9IHR5cGUoZ3JvdXBOYW1lKTtcblxuICAgIGlmIChncm91cE5hbWVUeXBlID09PSAnc3RyaW5nJykge1xuICAgICAgcmV0dXJuIGdyb3VwTmFtZTtcbiAgICB9XG5cbiAgICBpZiAoZ3JvdXBOYW1lVHlwZSA9PT0gJ2RhdGUnIHx8IGdyb3VwTmFtZVR5cGUgPT09ICdudW1iZXInIHx8IGdyb3VwTmFtZVR5cGUgPT09ICdib29sZWFuJykge1xuICAgICAgZ3JvdXBOYW1lID0gU3RyaW5nKGdyb3VwTmFtZSk7XG4gICAgICBsb2cud2FybignV0FSTklORzogTm9uLXN0cmluZyBncm91cE5hbWUsIHJlY2VpdmVkIHR5cGUgJyArIGdyb3VwTmFtZVR5cGUgKyAnLCBjb2VyY2luZyB0byBzdHJpbmcgXCInICsgZ3JvdXBOYW1lICsgJ1wiJyk7XG4gICAgICByZXR1cm4gZ3JvdXBOYW1lO1xuICAgIH1cblxuICAgIGlmIChncm91cE5hbWVUeXBlID09PSAnYXJyYXknKSB7XG4gICAgICAvLyBjaGVjayBmb3IgbmVzdGVkIGFycmF5cyBvciBvYmplY3RzXG4gICAgICB2YXIgYXJyYXlDb3B5ID0gW107XG5cbiAgICAgIGZvciAodmFyIGkgPSAwOyBpIDwgZ3JvdXBOYW1lLmxlbmd0aDsgaSsrKSB7XG4gICAgICAgIHZhciBlbGVtZW50ID0gZ3JvdXBOYW1lW2ldO1xuICAgICAgICB2YXIgZWxlbVR5cGUgPSB0eXBlKGVsZW1lbnQpO1xuXG4gICAgICAgIGlmIChlbGVtVHlwZSA9PT0gJ2FycmF5JyB8fCBlbGVtVHlwZSA9PT0gJ29iamVjdCcpIHtcbiAgICAgICAgICBsb2cud2FybignV0FSTklORzogU2tpcHBpbmcgbmVzdGVkICcgKyBlbGVtVHlwZSArICcgaW4gYXJyYXkgZ3JvdXBOYW1lJyk7XG4gICAgICAgICAgY29udGludWU7XG4gICAgICAgIH0gZWxzZSBpZiAoZWxlbVR5cGUgPT09ICdzdHJpbmcnKSB7XG4gICAgICAgICAgYXJyYXlDb3B5LnB1c2goZWxlbWVudCk7XG4gICAgICAgIH0gZWxzZSBpZiAoZWxlbVR5cGUgPT09ICdkYXRlJyB8fCBlbGVtVHlwZSA9PT0gJ251bWJlcicgfHwgZWxlbVR5cGUgPT09ICdib29sZWFuJykge1xuICAgICAgICAgIGVsZW1lbnQgPSBTdHJpbmcoZWxlbWVudCk7XG4gICAgICAgICAgbG9nLndhcm4oJ1dBUk5JTkc6IE5vbi1zdHJpbmcgZ3JvdXBOYW1lLCByZWNlaXZlZCB0eXBlICcgKyBlbGVtVHlwZSArICcsIGNvZXJjaW5nIHRvIHN0cmluZyBcIicgKyBlbGVtZW50ICsgJ1wiJyk7XG4gICAgICAgICAgYXJyYXlDb3B5LnB1c2goZWxlbWVudCk7XG4gICAgICAgIH1cbiAgICAgIH1cblxuICAgICAgcmV0dXJuIGFycmF5Q29weTtcbiAgICB9XG5cbiAgICBsb2cud2FybignV0FSTklORzogTm9uLXN0cmluZyBncm91cE5hbWUsIHJlY2VpdmVkIHR5cGUgJyArIGdyb3VwTmFtZVR5cGUgKyAnLiBQbGVhc2UgdXNlIHN0cmluZ3Mgb3IgYXJyYXkgb2Ygc3RyaW5ncyBmb3IgZ3JvdXBOYW1lJyk7XG4gIH07IC8vIHBhcnNlcyB0aGUgdmFsdWUgb2YgYSB1cmwgcGFyYW0gKGZvciBleGFtcGxlID9nY2xpZD0xMjM0Ji4uLilcblxuXG4gIHZhciBnZXRRdWVyeVBhcmFtID0gZnVuY3Rpb24gZ2V0UXVlcnlQYXJhbShuYW1lLCBxdWVyeSkge1xuICAgIG5hbWUgPSBuYW1lLnJlcGxhY2UoL1tcXFtdLywgXCJcXFxcW1wiKS5yZXBsYWNlKC9bXFxdXS8sIFwiXFxcXF1cIik7XG4gICAgdmFyIHJlZ2V4ID0gbmV3IFJlZ0V4cChcIltcXFxcPyZdXCIgKyBuYW1lICsgXCI9KFteJiNdKilcIik7XG4gICAgdmFyIHJlc3VsdHMgPSByZWdleC5leGVjKHF1ZXJ5KTtcbiAgICByZXR1cm4gcmVzdWx0cyA9PT0gbnVsbCA/IHVuZGVmaW5lZCA6IGRlY29kZVVSSUNvbXBvbmVudChyZXN1bHRzWzFdLnJlcGxhY2UoL1xcKy9nLCBcIiBcIikpO1xuICB9O1xuXG4gIHZhciB1dGlscyA9IHtcbiAgICBzZXRMb2dMZXZlbDogc2V0TG9nTGV2ZWwsXG4gICAgZ2V0TG9nTGV2ZWw6IGdldExvZ0xldmVsLFxuICAgIGxvZ0xldmVsczogbG9nTGV2ZWxzLFxuICAgIGxvZzogbG9nLFxuICAgIGlzRW1wdHlTdHJpbmc6IGlzRW1wdHlTdHJpbmcsXG4gICAgZ2V0UXVlcnlQYXJhbTogZ2V0UXVlcnlQYXJhbSxcbiAgICBzZXNzaW9uU3RvcmFnZUVuYWJsZWQ6IHNlc3Npb25TdG9yYWdlRW5hYmxlZCxcbiAgICB0cnVuY2F0ZTogdHJ1bmNhdGUsXG4gICAgdmFsaWRhdGVHcm91cHM6IHZhbGlkYXRlR3JvdXBzLFxuICAgIHZhbGlkYXRlSW5wdXQ6IHZhbGlkYXRlSW5wdXQsXG4gICAgdmFsaWRhdGVQcm9wZXJ0aWVzOiB2YWxpZGF0ZVByb3BlcnRpZXNcbiAgfTtcblxuICB2YXIgZ2V0TG9jYXRpb24gPSBmdW5jdGlvbiBnZXRMb2NhdGlvbigpIHtcbiAgICByZXR1cm4gd2luZG93LmxvY2F0aW9uO1xuICB9O1xuXG4gIHZhciBnZXQgPSBmdW5jdGlvbiBnZXQobmFtZSkge1xuICAgIHRyeSB7XG4gICAgICB2YXIgY2EgPSBkb2N1bWVudC5jb29raWUuc3BsaXQoJzsnKTtcbiAgICAgIHZhciB2YWx1ZSA9IG51bGw7XG5cbiAgICAgIGZvciAodmFyIGkgPSAwOyBpIDwgY2EubGVuZ3RoOyBpKyspIHtcbiAgICAgICAgdmFyIGMgPSBjYVtpXTtcblxuICAgICAgICB3aGlsZSAoYy5jaGFyQXQoMCkgPT09ICcgJykge1xuICAgICAgICAgIGMgPSBjLnN1YnN0cmluZygxLCBjLmxlbmd0aCk7XG4gICAgICAgIH1cblxuICAgICAgICBpZiAoYy5pbmRleE9mKG5hbWUpID09PSAwKSB7XG4gICAgICAgICAgdmFsdWUgPSBjLnN1YnN0cmluZyhuYW1lLmxlbmd0aCwgYy5sZW5ndGgpO1xuICAgICAgICAgIGJyZWFrO1xuICAgICAgICB9XG4gICAgICB9XG5cbiAgICAgIHJldHVybiB2YWx1ZTtcbiAgICB9IGNhdGNoIChlKSB7XG4gICAgICByZXR1cm4gbnVsbDtcbiAgICB9XG4gIH07XG5cbiAgdmFyIHNldCA9IGZ1bmN0aW9uIHNldChuYW1lLCB2YWx1ZSwgb3B0cykge1xuICAgIHZhciBleHBpcmVzID0gdmFsdWUgIT09IG51bGwgPyBvcHRzLmV4cGlyYXRpb25EYXlzIDogLTE7XG5cbiAgICBpZiAoZXhwaXJlcykge1xuICAgICAgdmFyIGRhdGUgPSBuZXcgRGF0ZSgpO1xuICAgICAgZGF0ZS5zZXRUaW1lKGRhdGUuZ2V0VGltZSgpICsgZXhwaXJlcyAqIDI0ICogNjAgKiA2MCAqIDEwMDApO1xuICAgICAgZXhwaXJlcyA9IGRhdGU7XG4gICAgfVxuXG4gICAgdmFyIHN0ciA9IG5hbWUgKyAnPScgKyB2YWx1ZTtcblxuICAgIGlmIChleHBpcmVzKSB7XG4gICAgICBzdHIgKz0gJzsgZXhwaXJlcz0nICsgZXhwaXJlcy50b1VUQ1N0cmluZygpO1xuICAgIH1cblxuICAgIHN0ciArPSAnOyBwYXRoPS8nO1xuXG4gICAgaWYgKG9wdHMuZG9tYWluKSB7XG4gICAgICBzdHIgKz0gJzsgZG9tYWluPScgKyBvcHRzLmRvbWFpbjtcbiAgICB9XG5cbiAgICBpZiAob3B0cy5zZWN1cmUpIHtcbiAgICAgIHN0ciArPSAnOyBTZWN1cmUnO1xuICAgIH1cblxuICAgIGlmIChvcHRzLnNhbWVTaXRlKSB7XG4gICAgICBzdHIgKz0gJzsgU2FtZVNpdGU9JyArIG9wdHMuc2FtZVNpdGU7XG4gICAgfVxuXG4gICAgZG9jdW1lbnQuY29va2llID0gc3RyO1xuICB9OyAvLyB0ZXN0IHRoYXQgY29va2llcyBhcmUgZW5hYmxlZCAtIG5hdmlnYXRvci5jb29raWVzRW5hYmxlZCB5aWVsZHMgZmFsc2UgcG9zaXRpdmVzIGluIElFLCBuZWVkIHRvIHRlc3QgZGlyZWN0bHlcblxuXG4gIHZhciBhcmVDb29raWVzRW5hYmxlZCA9IGZ1bmN0aW9uIGFyZUNvb2tpZXNFbmFibGVkKCkge1xuICAgIHZhciB1aWQgPSBTdHJpbmcobmV3IERhdGUoKSk7XG5cbiAgICB0cnkge1xuICAgICAgc2V0KENvbnN0YW50cy5DT09LSUVfVEVTVCwgdWlkLCB7fSk7XG5cbiAgICAgIHZhciBfYXJlQ29va2llc0VuYWJsZWQgPSBnZXQoQ29uc3RhbnRzLkNPT0tJRV9URVNUICsgJz0nKSA9PT0gdWlkO1xuXG4gICAgICBzZXQoQ29uc3RhbnRzLkNPT0tJRV9URVNULCBudWxsLCB7fSk7XG4gICAgICByZXR1cm4gX2FyZUNvb2tpZXNFbmFibGVkO1xuICAgIH0gY2F0Y2ggKGUpIHt9XG5cbiAgICByZXR1cm4gZmFsc2U7XG4gIH07XG5cbiAgdmFyIGJhc2VDb29raWUgPSB7XG4gICAgc2V0OiBzZXQsXG4gICAgZ2V0OiBnZXQsXG4gICAgYXJlQ29va2llc0VuYWJsZWQ6IGFyZUNvb2tpZXNFbmFibGVkXG4gIH07XG5cbiAgdmFyIGdldEhvc3QgPSBmdW5jdGlvbiBnZXRIb3N0KHVybCkge1xuICAgIHZhciBhID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudCgnYScpO1xuICAgIGEuaHJlZiA9IHVybDtcbiAgICByZXR1cm4gYS5ob3N0bmFtZSB8fCBsb2NhdGlvbi5ob3N0bmFtZTtcbiAgfTtcblxuICB2YXIgdG9wRG9tYWluID0gZnVuY3Rpb24gdG9wRG9tYWluKHVybCkge1xuICAgIHZhciBob3N0ID0gZ2V0SG9zdCh1cmwpO1xuICAgIHZhciBwYXJ0cyA9IGhvc3Quc3BsaXQoJy4nKTtcbiAgICB2YXIgbGV2ZWxzID0gW107XG5cbiAgICBmb3IgKHZhciBpID0gcGFydHMubGVuZ3RoIC0gMjsgaSA+PSAwOyAtLWkpIHtcbiAgICAgIGxldmVscy5wdXNoKHBhcnRzLnNsaWNlKGkpLmpvaW4oJy4nKSk7XG4gICAgfVxuXG4gICAgZm9yICh2YXIgX2kgPSAwOyBfaSA8IGxldmVscy5sZW5ndGg7ICsrX2kpIHtcbiAgICAgIHZhciBjbmFtZSA9ICdfX3RsZF90ZXN0X18nO1xuICAgICAgdmFyIGRvbWFpbiA9IGxldmVsc1tfaV07XG4gICAgICB2YXIgb3B0cyA9IHtcbiAgICAgICAgZG9tYWluOiAnLicgKyBkb21haW5cbiAgICAgIH07XG4gICAgICBiYXNlQ29va2llLnNldChjbmFtZSwgMSwgb3B0cyk7XG5cbiAgICAgIGlmIChiYXNlQ29va2llLmdldChjbmFtZSkpIHtcbiAgICAgICAgYmFzZUNvb2tpZS5zZXQoY25hbWUsIG51bGwsIG9wdHMpO1xuICAgICAgICByZXR1cm4gZG9tYWluO1xuICAgICAgfVxuICAgIH1cblxuICAgIHJldHVybiAnJztcbiAgfTtcblxuICAvKlxuICAgKiBDb29raWUgZGF0YVxuICAgKi9cbiAgdmFyIF9vcHRpb25zID0ge1xuICAgIGV4cGlyYXRpb25EYXlzOiB1bmRlZmluZWQsXG4gICAgZG9tYWluOiB1bmRlZmluZWRcbiAgfTtcblxuICB2YXIgcmVzZXQgPSBmdW5jdGlvbiByZXNldCgpIHtcbiAgICBfb3B0aW9ucyA9IHtcbiAgICAgIGV4cGlyYXRpb25EYXlzOiB1bmRlZmluZWQsXG4gICAgICBkb21haW46IHVuZGVmaW5lZFxuICAgIH07XG4gIH07XG5cbiAgdmFyIG9wdGlvbnMgPSBmdW5jdGlvbiBvcHRpb25zKG9wdHMpIHtcbiAgICBpZiAoYXJndW1lbnRzLmxlbmd0aCA9PT0gMCkge1xuICAgICAgcmV0dXJuIF9vcHRpb25zO1xuICAgIH1cblxuICAgIG9wdHMgPSBvcHRzIHx8IHt9O1xuICAgIF9vcHRpb25zLmV4cGlyYXRpb25EYXlzID0gb3B0cy5leHBpcmF0aW9uRGF5cztcbiAgICBfb3B0aW9ucy5zZWN1cmUgPSBvcHRzLnNlY3VyZTtcbiAgICBfb3B0aW9ucy5zYW1lU2l0ZSA9IG9wdHMuc2FtZVNpdGU7XG4gICAgdmFyIGRvbWFpbiA9ICF1dGlscy5pc0VtcHR5U3RyaW5nKG9wdHMuZG9tYWluKSA/IG9wdHMuZG9tYWluIDogJy4nICsgdG9wRG9tYWluKGdldExvY2F0aW9uKCkuaHJlZik7XG4gICAgdmFyIHRva2VuID0gTWF0aC5yYW5kb20oKTtcbiAgICBfb3B0aW9ucy5kb21haW4gPSBkb21haW47XG4gICAgc2V0JDEoJ2FtcGxpdHVkZV90ZXN0JywgdG9rZW4pO1xuICAgIHZhciBzdG9yZWQgPSBnZXQkMSgnYW1wbGl0dWRlX3Rlc3QnKTtcblxuICAgIGlmICghc3RvcmVkIHx8IHN0b3JlZCAhPT0gdG9rZW4pIHtcbiAgICAgIGRvbWFpbiA9IG51bGw7XG4gICAgfVxuXG4gICAgcmVtb3ZlKCdhbXBsaXR1ZGVfdGVzdCcpO1xuICAgIF9vcHRpb25zLmRvbWFpbiA9IGRvbWFpbjtcbiAgICByZXR1cm4gX29wdGlvbnM7XG4gIH07XG5cbiAgdmFyIF9kb21haW5TcGVjaWZpYyA9IGZ1bmN0aW9uIF9kb21haW5TcGVjaWZpYyhuYW1lKSB7XG4gICAgLy8gZGlmZmVyZW50aWF0ZSBiZXR3ZWVuIGNvb2tpZXMgb24gZGlmZmVyZW50IGRvbWFpbnNcbiAgICB2YXIgc3VmZml4ID0gJyc7XG5cbiAgICBpZiAoX29wdGlvbnMuZG9tYWluKSB7XG4gICAgICBzdWZmaXggPSBfb3B0aW9ucy5kb21haW4uY2hhckF0KDApID09PSAnLicgPyBfb3B0aW9ucy5kb21haW4uc3Vic3RyaW5nKDEpIDogX29wdGlvbnMuZG9tYWluO1xuICAgIH1cblxuICAgIHJldHVybiBuYW1lICsgc3VmZml4O1xuICB9O1xuXG4gIHZhciBnZXQkMSA9IGZ1bmN0aW9uIGdldChuYW1lKSB7XG4gICAgdmFyIG5hbWVFcSA9IF9kb21haW5TcGVjaWZpYyhuYW1lKSArICc9JztcbiAgICB2YXIgdmFsdWUgPSBiYXNlQ29va2llLmdldChuYW1lRXEpO1xuXG4gICAgdHJ5IHtcbiAgICAgIGlmICh2YWx1ZSkge1xuICAgICAgICByZXR1cm4gSlNPTi5wYXJzZShCYXNlNjQuZGVjb2RlKHZhbHVlKSk7XG4gICAgICB9XG4gICAgfSBjYXRjaCAoZSkge1xuICAgICAgcmV0dXJuIG51bGw7XG4gICAgfVxuXG4gICAgcmV0dXJuIG51bGw7XG4gIH07XG5cbiAgdmFyIHNldCQxID0gZnVuY3Rpb24gc2V0KG5hbWUsIHZhbHVlKSB7XG4gICAgdHJ5IHtcbiAgICAgIGJhc2VDb29raWUuc2V0KF9kb21haW5TcGVjaWZpYyhuYW1lKSwgQmFzZTY0LmVuY29kZShKU09OLnN0cmluZ2lmeSh2YWx1ZSkpLCBfb3B0aW9ucyk7XG4gICAgICByZXR1cm4gdHJ1ZTtcbiAgICB9IGNhdGNoIChlKSB7XG4gICAgICByZXR1cm4gZmFsc2U7XG4gICAgfVxuICB9O1xuXG4gIHZhciBzZXRSYXcgPSBmdW5jdGlvbiBzZXRSYXcobmFtZSwgdmFsdWUpIHtcbiAgICB0cnkge1xuICAgICAgYmFzZUNvb2tpZS5zZXQoX2RvbWFpblNwZWNpZmljKG5hbWUpLCB2YWx1ZSwgX29wdGlvbnMpO1xuICAgICAgcmV0dXJuIHRydWU7XG4gICAgfSBjYXRjaCAoZSkge1xuICAgICAgcmV0dXJuIGZhbHNlO1xuICAgIH1cbiAgfTtcblxuICB2YXIgZ2V0UmF3ID0gZnVuY3Rpb24gZ2V0UmF3KG5hbWUpIHtcbiAgICB2YXIgbmFtZUVxID0gX2RvbWFpblNwZWNpZmljKG5hbWUpICsgJz0nO1xuICAgIHJldHVybiBiYXNlQ29va2llLmdldChuYW1lRXEpO1xuICB9O1xuXG4gIHZhciByZW1vdmUgPSBmdW5jdGlvbiByZW1vdmUobmFtZSkge1xuICAgIHRyeSB7XG4gICAgICBiYXNlQ29va2llLnNldChfZG9tYWluU3BlY2lmaWMobmFtZSksIG51bGwsIF9vcHRpb25zKTtcbiAgICAgIHJldHVybiB0cnVlO1xuICAgIH0gY2F0Y2ggKGUpIHtcbiAgICAgIHJldHVybiBmYWxzZTtcbiAgICB9XG4gIH07XG5cbiAgdmFyIENvb2tpZSA9IHtcbiAgICByZXNldDogcmVzZXQsXG4gICAgb3B0aW9uczogb3B0aW9ucyxcbiAgICBnZXQ6IGdldCQxLFxuICAgIHNldDogc2V0JDEsXG4gICAgcmVtb3ZlOiByZW1vdmUsXG4gICAgc2V0UmF3OiBzZXRSYXcsXG4gICAgZ2V0UmF3OiBnZXRSYXdcbiAgfTtcblxuICAvKiBqc2hpbnQgLVcwMjAsIHVudXNlZDogZmFsc2UsIG5vZW1wdHk6IGZhbHNlLCBib3NzOiB0cnVlICovXG5cbiAgLypcbiAgICogSW1wbGVtZW50IGxvY2FsU3RvcmFnZSB0byBzdXBwb3J0IEZpcmVmb3ggMi0zIGFuZCBJRSA1LTdcbiAgICovXG4gIHZhciBsb2NhbFN0b3JhZ2U7IC8vIGpzaGludCBpZ25vcmU6bGluZVxuXG4gIHtcbiAgICAvLyB0ZXN0IHRoYXQgV2luZG93LmxvY2FsU3RvcmFnZSBpcyBhdmFpbGFibGUgYW5kIHdvcmtzXG4gICAgdmFyIHdpbmRvd0xvY2FsU3RvcmFnZUF2YWlsYWJsZSA9IGZ1bmN0aW9uIHdpbmRvd0xvY2FsU3RvcmFnZUF2YWlsYWJsZSgpIHtcbiAgICAgIHZhciB1aWQgPSBuZXcgRGF0ZSgpO1xuICAgICAgdmFyIHJlc3VsdDtcblxuICAgICAgdHJ5IHtcbiAgICAgICAgd2luZG93LmxvY2FsU3RvcmFnZS5zZXRJdGVtKHVpZCwgdWlkKTtcbiAgICAgICAgcmVzdWx0ID0gd2luZG93LmxvY2FsU3RvcmFnZS5nZXRJdGVtKHVpZCkgPT09IFN0cmluZyh1aWQpO1xuICAgICAgICB3aW5kb3cubG9jYWxTdG9yYWdlLnJlbW92ZUl0ZW0odWlkKTtcbiAgICAgICAgcmV0dXJuIHJlc3VsdDtcbiAgICAgIH0gY2F0Y2ggKGUpIHsvLyBsb2NhbFN0b3JhZ2Ugbm90IGF2YWlsYWJsZVxuICAgICAgfVxuXG4gICAgICByZXR1cm4gZmFsc2U7XG4gICAgfTtcblxuICAgIGlmICh3aW5kb3dMb2NhbFN0b3JhZ2VBdmFpbGFibGUoKSkge1xuICAgICAgbG9jYWxTdG9yYWdlID0gd2luZG93LmxvY2FsU3RvcmFnZTtcbiAgICB9IGVsc2UgaWYgKHdpbmRvdy5nbG9iYWxTdG9yYWdlKSB7XG4gICAgICAvLyBGaXJlZm94IDItMyB1c2UgZ2xvYmFsU3RvcmFnZVxuICAgICAgLy8gU2VlIGh0dHBzOi8vZGV2ZWxvcGVyLm1vemlsbGEub3JnL2VuL2RvbS9zdG9yYWdlI2dsb2JhbFN0b3JhZ2VcbiAgICAgIHRyeSB7XG4gICAgICAgIGxvY2FsU3RvcmFnZSA9IHdpbmRvdy5nbG9iYWxTdG9yYWdlW3dpbmRvdy5sb2NhdGlvbi5ob3N0bmFtZV07XG4gICAgICB9IGNhdGNoIChlKSB7Ly8gU29tZXRoaW5nIGJhZCBoYXBwZW5lZC4uLlxuICAgICAgfVxuICAgIH0gZWxzZSBpZiAodHlwZW9mIGRvY3VtZW50ICE9PSAndW5kZWZpbmVkJykge1xuICAgICAgLy8gSUUgNS03IHVzZSB1c2VyRGF0YVxuICAgICAgLy8gU2VlIGh0dHA6Ly9tc2RuLm1pY3Jvc29mdC5jb20vZW4tdXMvbGlicmFyeS9tczUzMTQyNCh2PXZzLjg1KS5hc3B4XG4gICAgICB2YXIgZGl2ID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudCgnZGl2JyksXG4gICAgICAgICAgYXR0cktleSA9ICdsb2NhbFN0b3JhZ2UnO1xuICAgICAgZGl2LnN0eWxlLmRpc3BsYXkgPSAnbm9uZSc7XG4gICAgICBkb2N1bWVudC5nZXRFbGVtZW50c0J5VGFnTmFtZSgnaGVhZCcpWzBdLmFwcGVuZENoaWxkKGRpdik7XG5cbiAgICAgIGlmIChkaXYuYWRkQmVoYXZpb3IpIHtcbiAgICAgICAgZGl2LmFkZEJlaGF2aW9yKCcjZGVmYXVsdCN1c2VyZGF0YScpO1xuICAgICAgICBsb2NhbFN0b3JhZ2UgPSB7XG4gICAgICAgICAgbGVuZ3RoOiAwLFxuICAgICAgICAgIHNldEl0ZW06IGZ1bmN0aW9uIHNldEl0ZW0oaywgdikge1xuICAgICAgICAgICAgZGl2LmxvYWQoYXR0cktleSk7XG5cbiAgICAgICAgICAgIGlmICghZGl2LmdldEF0dHJpYnV0ZShrKSkge1xuICAgICAgICAgICAgICB0aGlzLmxlbmd0aCsrO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICBkaXYuc2V0QXR0cmlidXRlKGssIHYpO1xuICAgICAgICAgICAgZGl2LnNhdmUoYXR0cktleSk7XG4gICAgICAgICAgfSxcbiAgICAgICAgICBnZXRJdGVtOiBmdW5jdGlvbiBnZXRJdGVtKGspIHtcbiAgICAgICAgICAgIGRpdi5sb2FkKGF0dHJLZXkpO1xuICAgICAgICAgICAgcmV0dXJuIGRpdi5nZXRBdHRyaWJ1dGUoayk7XG4gICAgICAgICAgfSxcbiAgICAgICAgICByZW1vdmVJdGVtOiBmdW5jdGlvbiByZW1vdmVJdGVtKGspIHtcbiAgICAgICAgICAgIGRpdi5sb2FkKGF0dHJLZXkpO1xuXG4gICAgICAgICAgICBpZiAoZGl2LmdldEF0dHJpYnV0ZShrKSkge1xuICAgICAgICAgICAgICB0aGlzLmxlbmd0aC0tO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICBkaXYucmVtb3ZlQXR0cmlidXRlKGspO1xuICAgICAgICAgICAgZGl2LnNhdmUoYXR0cktleSk7XG4gICAgICAgICAgfSxcbiAgICAgICAgICBjbGVhcjogZnVuY3Rpb24gY2xlYXIoKSB7XG4gICAgICAgICAgICBkaXYubG9hZChhdHRyS2V5KTtcbiAgICAgICAgICAgIHZhciBpID0gMDtcbiAgICAgICAgICAgIHZhciBhdHRyO1xuXG4gICAgICAgICAgICB3aGlsZSAoYXR0ciA9IGRpdi5YTUxEb2N1bWVudC5kb2N1bWVudEVsZW1lbnQuYXR0cmlidXRlc1tpKytdKSB7XG4gICAgICAgICAgICAgIGRpdi5yZW1vdmVBdHRyaWJ1dGUoYXR0ci5uYW1lKTtcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgZGl2LnNhdmUoYXR0cktleSk7XG4gICAgICAgICAgICB0aGlzLmxlbmd0aCA9IDA7XG4gICAgICAgICAgfSxcbiAgICAgICAgICBrZXk6IGZ1bmN0aW9uIGtleShrKSB7XG4gICAgICAgICAgICBkaXYubG9hZChhdHRyS2V5KTtcbiAgICAgICAgICAgIHJldHVybiBkaXYuWE1MRG9jdW1lbnQuZG9jdW1lbnRFbGVtZW50LmF0dHJpYnV0ZXNba107XG4gICAgICAgICAgfVxuICAgICAgICB9O1xuICAgICAgICBkaXYubG9hZChhdHRyS2V5KTtcbiAgICAgICAgbG9jYWxTdG9yYWdlLmxlbmd0aCA9IGRpdi5YTUxEb2N1bWVudC5kb2N1bWVudEVsZW1lbnQuYXR0cmlidXRlcy5sZW5ndGg7XG4gICAgICB9XG4gICAgfVxuXG4gICAgaWYgKCFsb2NhbFN0b3JhZ2UpIHtcbiAgICAgIGxvY2FsU3RvcmFnZSA9IHtcbiAgICAgICAgbGVuZ3RoOiAwLFxuICAgICAgICBzZXRJdGVtOiBmdW5jdGlvbiBzZXRJdGVtKGssIHYpIHt9LFxuICAgICAgICBnZXRJdGVtOiBmdW5jdGlvbiBnZXRJdGVtKGspIHt9LFxuICAgICAgICByZW1vdmVJdGVtOiBmdW5jdGlvbiByZW1vdmVJdGVtKGspIHt9LFxuICAgICAgICBjbGVhcjogZnVuY3Rpb24gY2xlYXIoKSB7fSxcbiAgICAgICAga2V5OiBmdW5jdGlvbiBrZXkoaykge31cbiAgICAgIH07XG4gICAgfVxuICB9XG5cbiAgdmFyIGxvY2FsU3RvcmFnZSQxID0gbG9jYWxTdG9yYWdlO1xuXG4gIC8qIGpzaGludCAtVzAyMCwgdW51c2VkOiBmYWxzZSwgbm9lbXB0eTogZmFsc2UsIGJvc3M6IHRydWUgKi9cblxuICB2YXIgY29va2llU3RvcmFnZSA9IGZ1bmN0aW9uIGNvb2tpZVN0b3JhZ2UoKSB7XG4gICAgdGhpcy5zdG9yYWdlID0gbnVsbDtcbiAgfTsgLy8gdGVzdCB0aGF0IGNvb2tpZXMgYXJlIGVuYWJsZWQgLSBuYXZpZ2F0b3IuY29va2llc0VuYWJsZWQgeWllbGRzIGZhbHNlIHBvc2l0aXZlcyBpbiBJRSwgbmVlZCB0byB0ZXN0IGRpcmVjdGx5XG5cblxuICBjb29raWVTdG9yYWdlLnByb3RvdHlwZS5fY29va2llc0VuYWJsZWQgPSBmdW5jdGlvbiAoKSB7XG4gICAgdmFyIHVpZCA9IFN0cmluZyhuZXcgRGF0ZSgpKTtcbiAgICB2YXIgcmVzdWx0O1xuXG4gICAgdHJ5IHtcbiAgICAgIENvb2tpZS5zZXQoQ29uc3RhbnRzLkNPT0tJRV9URVNULCB1aWQpO1xuICAgICAgcmVzdWx0ID0gQ29va2llLmdldChDb25zdGFudHMuQ09PS0lFX1RFU1QpID09PSB1aWQ7XG4gICAgICBDb29raWUucmVtb3ZlKENvbnN0YW50cy5DT09LSUVfVEVTVCk7XG4gICAgICByZXR1cm4gcmVzdWx0O1xuICAgIH0gY2F0Y2ggKGUpIHsvLyBjb29raWVzIGFyZSBub3QgZW5hYmxlZFxuICAgIH1cblxuICAgIHJldHVybiBmYWxzZTtcbiAgfTtcblxuICBjb29raWVTdG9yYWdlLnByb3RvdHlwZS5nZXRTdG9yYWdlID0gZnVuY3Rpb24gKCkge1xuICAgIGlmICh0aGlzLnN0b3JhZ2UgIT09IG51bGwpIHtcbiAgICAgIHJldHVybiB0aGlzLnN0b3JhZ2U7XG4gICAgfVxuXG4gICAgaWYgKHRoaXMuX2Nvb2tpZXNFbmFibGVkKCkpIHtcbiAgICAgIHRoaXMuc3RvcmFnZSA9IENvb2tpZTtcbiAgICB9IGVsc2Uge1xuICAgICAgLy8gaWYgY29va2llcyBkaXNhYmxlZCwgZmFsbGJhY2sgdG8gbG9jYWxzdG9yYWdlXG4gICAgICAvLyBub3RlOiBsb2NhbHN0b3JhZ2UgZG9lcyBub3QgcGVyc2lzdCBhY3Jvc3Mgc3ViZG9tYWluc1xuICAgICAgdmFyIGtleVByZWZpeCA9ICdhbXBfY29va2llc3RvcmVfJztcbiAgICAgIHRoaXMuc3RvcmFnZSA9IHtcbiAgICAgICAgX29wdGlvbnM6IHtcbiAgICAgICAgICBleHBpcmF0aW9uRGF5czogdW5kZWZpbmVkLFxuICAgICAgICAgIGRvbWFpbjogdW5kZWZpbmVkLFxuICAgICAgICAgIHNlY3VyZTogZmFsc2VcbiAgICAgICAgfSxcbiAgICAgICAgcmVzZXQ6IGZ1bmN0aW9uIHJlc2V0KCkge1xuICAgICAgICAgIHRoaXMuX29wdGlvbnMgPSB7XG4gICAgICAgICAgICBleHBpcmF0aW9uRGF5czogdW5kZWZpbmVkLFxuICAgICAgICAgICAgZG9tYWluOiB1bmRlZmluZWQsXG4gICAgICAgICAgICBzZWN1cmU6IGZhbHNlXG4gICAgICAgICAgfTtcbiAgICAgICAgfSxcbiAgICAgICAgb3B0aW9uczogZnVuY3Rpb24gb3B0aW9ucyhvcHRzKSB7XG4gICAgICAgICAgaWYgKGFyZ3VtZW50cy5sZW5ndGggPT09IDApIHtcbiAgICAgICAgICAgIHJldHVybiB0aGlzLl9vcHRpb25zO1xuICAgICAgICAgIH1cblxuICAgICAgICAgIG9wdHMgPSBvcHRzIHx8IHt9O1xuICAgICAgICAgIHRoaXMuX29wdGlvbnMuZXhwaXJhdGlvbkRheXMgPSBvcHRzLmV4cGlyYXRpb25EYXlzIHx8IHRoaXMuX29wdGlvbnMuZXhwaXJhdGlvbkRheXM7IC8vIGxvY2FsU3RvcmFnZSBpcyBzcGVjaWZpYyB0byBzdWJkb21haW5zXG5cbiAgICAgICAgICB0aGlzLl9vcHRpb25zLmRvbWFpbiA9IG9wdHMuZG9tYWluIHx8IHRoaXMuX29wdGlvbnMuZG9tYWluIHx8IHdpbmRvdyAmJiB3aW5kb3cubG9jYXRpb24gJiYgd2luZG93LmxvY2F0aW9uLmhvc3RuYW1lO1xuICAgICAgICAgIHJldHVybiB0aGlzLl9vcHRpb25zLnNlY3VyZSA9IG9wdHMuc2VjdXJlIHx8IGZhbHNlO1xuICAgICAgICB9LFxuICAgICAgICBnZXQ6IGZ1bmN0aW9uIGdldChuYW1lKSB7XG4gICAgICAgICAgdHJ5IHtcbiAgICAgICAgICAgIHJldHVybiBKU09OLnBhcnNlKGxvY2FsU3RvcmFnZSQxLmdldEl0ZW0oa2V5UHJlZml4ICsgbmFtZSkpO1xuICAgICAgICAgIH0gY2F0Y2ggKGUpIHt9XG5cbiAgICAgICAgICByZXR1cm4gbnVsbDtcbiAgICAgICAgfSxcbiAgICAgICAgc2V0OiBmdW5jdGlvbiBzZXQobmFtZSwgdmFsdWUpIHtcbiAgICAgICAgICB0cnkge1xuICAgICAgICAgICAgbG9jYWxTdG9yYWdlJDEuc2V0SXRlbShrZXlQcmVmaXggKyBuYW1lLCBKU09OLnN0cmluZ2lmeSh2YWx1ZSkpO1xuICAgICAgICAgICAgcmV0dXJuIHRydWU7XG4gICAgICAgICAgfSBjYXRjaCAoZSkge31cblxuICAgICAgICAgIHJldHVybiBmYWxzZTtcbiAgICAgICAgfSxcbiAgICAgICAgcmVtb3ZlOiBmdW5jdGlvbiByZW1vdmUobmFtZSkge1xuICAgICAgICAgIHRyeSB7XG4gICAgICAgICAgICBsb2NhbFN0b3JhZ2UkMS5yZW1vdmVJdGVtKGtleVByZWZpeCArIG5hbWUpO1xuICAgICAgICAgIH0gY2F0Y2ggKGUpIHtcbiAgICAgICAgICAgIHJldHVybiBmYWxzZTtcbiAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgIH07XG4gICAgfVxuXG4gICAgcmV0dXJuIHRoaXMuc3RvcmFnZTtcbiAgfTtcblxuICB2YXIgTWV0YWRhdGFTdG9yYWdlID1cbiAgLyojX19QVVJFX18qL1xuICBmdW5jdGlvbiAoKSB7XG4gICAgZnVuY3Rpb24gTWV0YWRhdGFTdG9yYWdlKF9yZWYpIHtcbiAgICAgIHZhciBzdG9yYWdlS2V5ID0gX3JlZi5zdG9yYWdlS2V5LFxuICAgICAgICAgIGRpc2FibGVDb29raWVzID0gX3JlZi5kaXNhYmxlQ29va2llcyxcbiAgICAgICAgICBkb21haW4gPSBfcmVmLmRvbWFpbixcbiAgICAgICAgICBzZWN1cmUgPSBfcmVmLnNlY3VyZSxcbiAgICAgICAgICBzYW1lU2l0ZSA9IF9yZWYuc2FtZVNpdGUsXG4gICAgICAgICAgZXhwaXJhdGlvbkRheXMgPSBfcmVmLmV4cGlyYXRpb25EYXlzO1xuXG4gICAgICBfY2xhc3NDYWxsQ2hlY2sodGhpcywgTWV0YWRhdGFTdG9yYWdlKTtcblxuICAgICAgdGhpcy5zdG9yYWdlS2V5ID0gc3RvcmFnZUtleTtcbiAgICAgIHRoaXMuZGlzYWJsZUNvb2tpZVN0b3JhZ2UgPSAhYmFzZUNvb2tpZS5hcmVDb29raWVzRW5hYmxlZCgpIHx8IGRpc2FibGVDb29raWVzO1xuICAgICAgdGhpcy5kb21haW4gPSBkb21haW47XG4gICAgICB0aGlzLnNlY3VyZSA9IHNlY3VyZTtcbiAgICAgIHRoaXMuc2FtZVNpdGUgPSBzYW1lU2l0ZTtcbiAgICAgIHRoaXMuZXhwaXJhdGlvbkRheXMgPSBleHBpcmF0aW9uRGF5cztcbiAgICAgIHRoaXMuY29va2llRG9tYWluID0gJyc7XG5cbiAgICAgIHtcbiAgICAgICAgdmFyIHdyaXRhYmxlVG9wRG9tYWluID0gdG9wRG9tYWluKGdldExvY2F0aW9uKCkuaHJlZik7XG4gICAgICAgIHRoaXMuY29va2llRG9tYWluID0gZG9tYWluIHx8ICh3cml0YWJsZVRvcERvbWFpbiA/ICcuJyArIHdyaXRhYmxlVG9wRG9tYWluIDogbnVsbCk7XG4gICAgICB9XG4gICAgfVxuXG4gICAgX2NyZWF0ZUNsYXNzKE1ldGFkYXRhU3RvcmFnZSwgW3tcbiAgICAgIGtleTogXCJnZXRDb29raWVTdG9yYWdlS2V5XCIsXG4gICAgICB2YWx1ZTogZnVuY3Rpb24gZ2V0Q29va2llU3RvcmFnZUtleSgpIHtcbiAgICAgICAgaWYgKCF0aGlzLmRvbWFpbikge1xuICAgICAgICAgIHJldHVybiB0aGlzLnN0b3JhZ2VLZXk7XG4gICAgICAgIH1cblxuICAgICAgICB2YXIgc3VmZml4ID0gdGhpcy5kb21haW4uY2hhckF0KDApID09PSAnLicgPyB0aGlzLmRvbWFpbi5zdWJzdHJpbmcoMSkgOiB0aGlzLmRvbWFpbjtcbiAgICAgICAgcmV0dXJuIFwiXCIuY29uY2F0KHRoaXMuc3RvcmFnZUtleSkuY29uY2F0KHN1ZmZpeCA/IFwiX1wiLmNvbmNhdChzdWZmaXgpIDogJycpO1xuICAgICAgfVxuICAgIH0sIHtcbiAgICAgIGtleTogXCJzYXZlXCIsXG4gICAgICB2YWx1ZTogZnVuY3Rpb24gc2F2ZShfcmVmMikge1xuICAgICAgICB2YXIgZGV2aWNlSWQgPSBfcmVmMi5kZXZpY2VJZCxcbiAgICAgICAgICAgIHVzZXJJZCA9IF9yZWYyLnVzZXJJZCxcbiAgICAgICAgICAgIG9wdE91dCA9IF9yZWYyLm9wdE91dCxcbiAgICAgICAgICAgIHNlc3Npb25JZCA9IF9yZWYyLnNlc3Npb25JZCxcbiAgICAgICAgICAgIGxhc3RFdmVudFRpbWUgPSBfcmVmMi5sYXN0RXZlbnRUaW1lLFxuICAgICAgICAgICAgZXZlbnRJZCA9IF9yZWYyLmV2ZW50SWQsXG4gICAgICAgICAgICBpZGVudGlmeUlkID0gX3JlZjIuaWRlbnRpZnlJZCxcbiAgICAgICAgICAgIHNlcXVlbmNlTnVtYmVyID0gX3JlZjIuc2VxdWVuY2VOdW1iZXI7XG4gICAgICAgIC8vIGRvIG5vdCBjaGFuZ2UgdGhlIG9yZGVyIG9mIHRoZXNlIGl0ZW1zXG4gICAgICAgIHZhciB2YWx1ZSA9IFtkZXZpY2VJZCwgQmFzZTY0LmVuY29kZSh1c2VySWQgfHwgJycpLCBvcHRPdXQgPyAnMScgOiAnJywgc2Vzc2lvbklkID8gc2Vzc2lvbklkLnRvU3RyaW5nKDMyKSA6ICcwJywgbGFzdEV2ZW50VGltZSA/IGxhc3RFdmVudFRpbWUudG9TdHJpbmcoMzIpIDogJzAnLCBldmVudElkID8gZXZlbnRJZC50b1N0cmluZygzMikgOiAnMCcsIGlkZW50aWZ5SWQgPyBpZGVudGlmeUlkLnRvU3RyaW5nKDMyKSA6ICcwJywgc2VxdWVuY2VOdW1iZXIgPyBzZXF1ZW5jZU51bWJlci50b1N0cmluZygzMikgOiAnMCddLmpvaW4oJy4nKTtcblxuICAgICAgICBpZiAodGhpcy5kaXNhYmxlQ29va2llU3RvcmFnZSkge1xuICAgICAgICAgIGxvY2FsU3RvcmFnZSQxLnNldEl0ZW0odGhpcy5zdG9yYWdlS2V5LCB2YWx1ZSk7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgYmFzZUNvb2tpZS5zZXQodGhpcy5nZXRDb29raWVTdG9yYWdlS2V5KCksIHZhbHVlLCB7XG4gICAgICAgICAgICBkb21haW46IHRoaXMuY29va2llRG9tYWluLFxuICAgICAgICAgICAgc2VjdXJlOiB0aGlzLnNlY3VyZSxcbiAgICAgICAgICAgIHNhbWVTaXRlOiB0aGlzLnNhbWVTaXRlLFxuICAgICAgICAgICAgZXhwaXJhdGlvbkRheXM6IHRoaXMuZXhwaXJhdGlvbkRheXNcbiAgICAgICAgICB9KTtcbiAgICAgICAgfVxuICAgICAgfVxuICAgIH0sIHtcbiAgICAgIGtleTogXCJsb2FkXCIsXG4gICAgICB2YWx1ZTogZnVuY3Rpb24gbG9hZCgpIHtcbiAgICAgICAgdmFyIHN0cjtcblxuICAgICAgICBpZiAoIXRoaXMuZGlzYWJsZUNvb2tpZVN0b3JhZ2UpIHtcbiAgICAgICAgICBzdHIgPSBiYXNlQ29va2llLmdldCh0aGlzLmdldENvb2tpZVN0b3JhZ2VLZXkoKSArICc9Jyk7XG4gICAgICAgIH1cblxuICAgICAgICBpZiAoIXN0cikge1xuICAgICAgICAgIHN0ciA9IGxvY2FsU3RvcmFnZSQxLmdldEl0ZW0odGhpcy5zdG9yYWdlS2V5KTtcbiAgICAgICAgfVxuXG4gICAgICAgIGlmICghc3RyKSB7XG4gICAgICAgICAgcmV0dXJuIG51bGw7XG4gICAgICAgIH1cblxuICAgICAgICB2YXIgdmFsdWVzID0gc3RyLnNwbGl0KCcuJyk7XG4gICAgICAgIHZhciB1c2VySWQgPSBudWxsO1xuXG4gICAgICAgIGlmICh2YWx1ZXNbMV0pIHtcbiAgICAgICAgICB0cnkge1xuICAgICAgICAgICAgdXNlcklkID0gQmFzZTY0LmRlY29kZSh2YWx1ZXNbMV0pO1xuICAgICAgICAgIH0gY2F0Y2ggKGUpIHtcbiAgICAgICAgICAgIHVzZXJJZCA9IG51bGw7XG4gICAgICAgICAgfVxuICAgICAgICB9XG5cbiAgICAgICAgcmV0dXJuIHtcbiAgICAgICAgICBkZXZpY2VJZDogdmFsdWVzWzBdLFxuICAgICAgICAgIHVzZXJJZDogdXNlcklkLFxuICAgICAgICAgIG9wdE91dDogdmFsdWVzWzJdID09PSAnMScsXG4gICAgICAgICAgc2Vzc2lvbklkOiBwYXJzZUludCh2YWx1ZXNbM10sIDMyKSxcbiAgICAgICAgICBsYXN0RXZlbnRUaW1lOiBwYXJzZUludCh2YWx1ZXNbNF0sIDMyKSxcbiAgICAgICAgICBldmVudElkOiBwYXJzZUludCh2YWx1ZXNbNV0sIDMyKSxcbiAgICAgICAgICBpZGVudGlmeUlkOiBwYXJzZUludCh2YWx1ZXNbNl0sIDMyKSxcbiAgICAgICAgICBzZXF1ZW5jZU51bWJlcjogcGFyc2VJbnQodmFsdWVzWzddLCAzMilcbiAgICAgICAgfTtcbiAgICAgIH1cbiAgICB9XSk7XG5cbiAgICByZXR1cm4gTWV0YWRhdGFTdG9yYWdlO1xuICB9KCk7XG5cbiAgdmFyIGdldFV0bURhdGEgPSBmdW5jdGlvbiBnZXRVdG1EYXRhKHJhd0Nvb2tpZSwgcXVlcnkpIHtcbiAgICAvLyBUcmFuc2xhdGUgdGhlIHV0bXogY29va2llIGZvcm1hdCBpbnRvIHVybCBxdWVyeSBzdHJpbmcgZm9ybWF0LlxuICAgIHZhciBjb29raWUgPSByYXdDb29raWUgPyAnPycgKyByYXdDb29raWUuc3BsaXQoJy4nKS5zbGljZSgtMSlbMF0ucmVwbGFjZSgvXFx8L2csICcmJykgOiAnJztcblxuICAgIHZhciBmZXRjaFBhcmFtID0gZnVuY3Rpb24gZmV0Y2hQYXJhbShxdWVyeU5hbWUsIHF1ZXJ5LCBjb29raWVOYW1lLCBjb29raWUpIHtcbiAgICAgIHJldHVybiB1dGlscy5nZXRRdWVyeVBhcmFtKHF1ZXJ5TmFtZSwgcXVlcnkpIHx8IHV0aWxzLmdldFF1ZXJ5UGFyYW0oY29va2llTmFtZSwgY29va2llKTtcbiAgICB9O1xuXG4gICAgdmFyIHV0bVNvdXJjZSA9IGZldGNoUGFyYW0oQ29uc3RhbnRzLlVUTV9TT1VSQ0UsIHF1ZXJ5LCAndXRtY3NyJywgY29va2llKTtcbiAgICB2YXIgdXRtTWVkaXVtID0gZmV0Y2hQYXJhbShDb25zdGFudHMuVVRNX01FRElVTSwgcXVlcnksICd1dG1jbWQnLCBjb29raWUpO1xuICAgIHZhciB1dG1DYW1wYWlnbiA9IGZldGNoUGFyYW0oQ29uc3RhbnRzLlVUTV9DQU1QQUlHTiwgcXVlcnksICd1dG1jY24nLCBjb29raWUpO1xuICAgIHZhciB1dG1UZXJtID0gZmV0Y2hQYXJhbShDb25zdGFudHMuVVRNX1RFUk0sIHF1ZXJ5LCAndXRtY3RyJywgY29va2llKTtcbiAgICB2YXIgdXRtQ29udGVudCA9IGZldGNoUGFyYW0oQ29uc3RhbnRzLlVUTV9DT05URU5ULCBxdWVyeSwgJ3V0bWNjdCcsIGNvb2tpZSk7XG4gICAgdmFyIHV0bURhdGEgPSB7fTtcblxuICAgIHZhciBhZGRJZk5vdE51bGwgPSBmdW5jdGlvbiBhZGRJZk5vdE51bGwoa2V5LCB2YWx1ZSkge1xuICAgICAgaWYgKCF1dGlscy5pc0VtcHR5U3RyaW5nKHZhbHVlKSkge1xuICAgICAgICB1dG1EYXRhW2tleV0gPSB2YWx1ZTtcbiAgICAgIH1cbiAgICB9O1xuXG4gICAgYWRkSWZOb3ROdWxsKENvbnN0YW50cy5VVE1fU09VUkNFLCB1dG1Tb3VyY2UpO1xuICAgIGFkZElmTm90TnVsbChDb25zdGFudHMuVVRNX01FRElVTSwgdXRtTWVkaXVtKTtcbiAgICBhZGRJZk5vdE51bGwoQ29uc3RhbnRzLlVUTV9DQU1QQUlHTiwgdXRtQ2FtcGFpZ24pO1xuICAgIGFkZElmTm90TnVsbChDb25zdGFudHMuVVRNX1RFUk0sIHV0bVRlcm0pO1xuICAgIGFkZElmTm90TnVsbChDb25zdGFudHMuVVRNX0NPTlRFTlQsIHV0bUNvbnRlbnQpO1xuICAgIHJldHVybiB1dG1EYXRhO1xuICB9O1xuXG4gIC8qXG4gICAqIFdyYXBwZXIgZm9yIGEgdXNlciBwcm9wZXJ0aWVzIEpTT04gb2JqZWN0IHRoYXQgc3VwcG9ydHMgb3BlcmF0aW9ucy5cbiAgICogTm90ZTogaWYgYSB1c2VyIHByb3BlcnR5IGlzIHVzZWQgaW4gbXVsdGlwbGUgb3BlcmF0aW9ucyBvbiB0aGUgc2FtZSBJZGVudGlmeSBvYmplY3QsXG4gICAqIG9ubHkgdGhlIGZpcnN0IG9wZXJhdGlvbiB3aWxsIGJlIHNhdmVkLCBhbmQgdGhlIHJlc3Qgd2lsbCBiZSBpZ25vcmVkLlxuICAgKi9cblxuICB2YXIgQU1QX09QX0FERCA9ICckYWRkJztcbiAgdmFyIEFNUF9PUF9BUFBFTkQgPSAnJGFwcGVuZCc7XG4gIHZhciBBTVBfT1BfQ0xFQVJfQUxMID0gJyRjbGVhckFsbCc7XG4gIHZhciBBTVBfT1BfUFJFUEVORCA9ICckcHJlcGVuZCc7XG4gIHZhciBBTVBfT1BfU0VUID0gJyRzZXQnO1xuICB2YXIgQU1QX09QX1NFVF9PTkNFID0gJyRzZXRPbmNlJztcbiAgdmFyIEFNUF9PUF9VTlNFVCA9ICckdW5zZXQnO1xuICAvKipcbiAgICogSWRlbnRpZnkgQVBJIC0gaW5zdGFuY2UgY29uc3RydWN0b3IuIElkZW50aWZ5IG9iamVjdHMgYXJlIGEgd3JhcHBlciBmb3IgdXNlciBwcm9wZXJ0eSBvcGVyYXRpb25zLlxuICAgKiBFYWNoIG1ldGhvZCBhZGRzIGEgdXNlciBwcm9wZXJ0eSBvcGVyYXRpb24gdG8gdGhlIElkZW50aWZ5IG9iamVjdCwgYW5kIHJldHVybnMgdGhlIHNhbWUgSWRlbnRpZnkgb2JqZWN0LFxuICAgKiBhbGxvd2luZyB5b3UgdG8gY2hhaW4gbXVsdGlwbGUgbWV0aG9kIGNhbGxzIHRvZ2V0aGVyLlxuICAgKiBOb3RlOiBpZiB0aGUgc2FtZSB1c2VyIHByb3BlcnR5IGlzIHVzZWQgaW4gbXVsdGlwbGUgb3BlcmF0aW9ucyBvbiBhIHNpbmdsZSBJZGVudGlmeSBvYmplY3QsXG4gICAqIG9ubHkgdGhlIGZpcnN0IG9wZXJhdGlvbiBvbiB0aGF0IHByb3BlcnR5IHdpbGwgYmUgc2F2ZWQsIGFuZCB0aGUgcmVzdCB3aWxsIGJlIGlnbm9yZWQuXG4gICAqIFNlZSBbUmVhZG1lXXtAbGluayBodHRwczovL2dpdGh1Yi5jb20vYW1wbGl0dWRlL0FtcGxpdHVkZS1KYXZhc2NyaXB0I3VzZXItcHJvcGVydGllcy1hbmQtdXNlci1wcm9wZXJ0eS1vcGVyYXRpb25zfVxuICAgKiBmb3IgbW9yZSBpbmZvcm1hdGlvbiBvbiB0aGUgSWRlbnRpZnkgQVBJIGFuZCB1c2VyIHByb3BlcnR5IG9wZXJhdGlvbnMuXG4gICAqIEBjb25zdHJ1Y3RvciBJZGVudGlmeVxuICAgKiBAcHVibGljXG4gICAqIEBleGFtcGxlIHZhciBpZGVudGlmeSA9IG5ldyBhbXBsaXR1ZGUuSWRlbnRpZnkoKTtcbiAgICovXG5cbiAgdmFyIElkZW50aWZ5ID0gZnVuY3Rpb24gSWRlbnRpZnkoKSB7XG4gICAgdGhpcy51c2VyUHJvcGVydGllc09wZXJhdGlvbnMgPSB7fTtcbiAgICB0aGlzLnByb3BlcnRpZXMgPSBbXTsgLy8ga2VlcCB0cmFjayBvZiBrZXlzIHRoYXQgaGF2ZSBiZWVuIGFkZGVkXG4gIH07XG4gIC8qKlxuICAgKiBJbmNyZW1lbnQgYSB1c2VyIHByb3BlcnR5IGJ5IGEgZ2l2ZW4gdmFsdWUgKGNhbiBhbHNvIGJlIG5lZ2F0aXZlIHRvIGRlY3JlbWVudCkuXG4gICAqIElmIHRoZSB1c2VyIHByb3BlcnR5IGRvZXMgbm90IGhhdmUgYSB2YWx1ZSBzZXQgeWV0LCBpdCB3aWxsIGJlIGluaXRpYWxpemVkIHRvIDAgYmVmb3JlIGJlaW5nIGluY3JlbWVudGVkLlxuICAgKiBAcHVibGljXG4gICAqIEBwYXJhbSB7c3RyaW5nfSBwcm9wZXJ0eSAtIFRoZSB1c2VyIHByb3BlcnR5IGtleS5cbiAgICogQHBhcmFtIHtudW1iZXJ8c3RyaW5nfSB2YWx1ZSAtIFRoZSBhbW91bnQgYnkgd2hpY2ggdG8gaW5jcmVtZW50IHRoZSB1c2VyIHByb3BlcnR5LiBBbGxvd3MgbnVtYmVycyBhcyBzdHJpbmdzIChleDogJzEyMycpLlxuICAgKiBAcmV0dXJuIHtJZGVudGlmeX0gUmV0dXJucyB0aGUgc2FtZSBJZGVudGlmeSBvYmplY3QsIGFsbG93aW5nIHlvdSB0byBjaGFpbiBtdWx0aXBsZSBtZXRob2QgY2FsbHMgdG9nZXRoZXIuXG4gICAqIEBleGFtcGxlIHZhciBpZGVudGlmeSA9IG5ldyBhbXBsaXR1ZGUuSWRlbnRpZnkoKS5hZGQoJ2thcm1hJywgMSkuYWRkKCdmcmllbmRzJywgMSk7XG4gICAqIGFtcGxpdHVkZS5pZGVudGlmeShpZGVudGlmeSk7IC8vIHNlbmQgdGhlIElkZW50aWZ5IGNhbGxcbiAgICovXG5cblxuICBJZGVudGlmeS5wcm90b3R5cGUuYWRkID0gZnVuY3Rpb24gKHByb3BlcnR5LCB2YWx1ZSkge1xuICAgIGlmICh0eXBlKHZhbHVlKSA9PT0gJ251bWJlcicgfHwgdHlwZSh2YWx1ZSkgPT09ICdzdHJpbmcnKSB7XG4gICAgICB0aGlzLl9hZGRPcGVyYXRpb24oQU1QX09QX0FERCwgcHJvcGVydHksIHZhbHVlKTtcbiAgICB9IGVsc2Uge1xuICAgICAgdXRpbHMubG9nLmVycm9yKCdVbnN1cHBvcnRlZCB0eXBlIGZvciB2YWx1ZTogJyArIHR5cGUodmFsdWUpICsgJywgZXhwZWN0aW5nIG51bWJlciBvciBzdHJpbmcnKTtcbiAgICB9XG5cbiAgICByZXR1cm4gdGhpcztcbiAgfTtcbiAgLyoqXG4gICAqIEFwcGVuZCBhIHZhbHVlIG9yIHZhbHVlcyB0byBhIHVzZXIgcHJvcGVydHkuXG4gICAqIElmIHRoZSB1c2VyIHByb3BlcnR5IGRvZXMgbm90IGhhdmUgYSB2YWx1ZSBzZXQgeWV0LFxuICAgKiBpdCB3aWxsIGJlIGluaXRpYWxpemVkIHRvIGFuIGVtcHR5IGxpc3QgYmVmb3JlIHRoZSBuZXcgdmFsdWVzIGFyZSBhcHBlbmRlZC5cbiAgICogSWYgdGhlIHVzZXIgcHJvcGVydHkgaGFzIGFuIGV4aXN0aW5nIHZhbHVlIGFuZCBpdCBpcyBub3QgYSBsaXN0LFxuICAgKiB0aGUgZXhpc3RpbmcgdmFsdWUgd2lsbCBiZSBjb252ZXJ0ZWQgaW50byBhIGxpc3Qgd2l0aCB0aGUgbmV3IHZhbHVlcyBhcHBlbmRlZC5cbiAgICogQHB1YmxpY1xuICAgKiBAcGFyYW0ge3N0cmluZ30gcHJvcGVydHkgLSBUaGUgdXNlciBwcm9wZXJ0eSBrZXkuXG4gICAqIEBwYXJhbSB7bnVtYmVyfHN0cmluZ3xsaXN0fG9iamVjdH0gdmFsdWUgLSBBIHZhbHVlIG9yIHZhbHVlcyB0byBhcHBlbmQuXG4gICAqIFZhbHVlcyBjYW4gYmUgbnVtYmVycywgc3RyaW5ncywgbGlzdHMsIG9yIG9iamVjdCAoa2V5OnZhbHVlIGRpY3Qgd2lsbCBiZSBmbGF0dGVuZWQpLlxuICAgKiBAcmV0dXJuIHtJZGVudGlmeX0gUmV0dXJucyB0aGUgc2FtZSBJZGVudGlmeSBvYmplY3QsIGFsbG93aW5nIHlvdSB0byBjaGFpbiBtdWx0aXBsZSBtZXRob2QgY2FsbHMgdG9nZXRoZXIuXG4gICAqIEBleGFtcGxlIHZhciBpZGVudGlmeSA9IG5ldyBhbXBsaXR1ZGUuSWRlbnRpZnkoKS5hcHBlbmQoJ2FiLXRlc3RzJywgJ25ldy11c2VyLXRlc3RzJyk7XG4gICAqIGlkZW50aWZ5LmFwcGVuZCgnc29tZV9saXN0JywgWzEsIDIsIDMsIDQsICd2YWx1ZXMnXSk7XG4gICAqIGFtcGxpdHVkZS5pZGVudGlmeShpZGVudGlmeSk7IC8vIHNlbmQgdGhlIElkZW50aWZ5IGNhbGxcbiAgICovXG5cblxuICBJZGVudGlmeS5wcm90b3R5cGUuYXBwZW5kID0gZnVuY3Rpb24gKHByb3BlcnR5LCB2YWx1ZSkge1xuICAgIHRoaXMuX2FkZE9wZXJhdGlvbihBTVBfT1BfQVBQRU5ELCBwcm9wZXJ0eSwgdmFsdWUpO1xuXG4gICAgcmV0dXJuIHRoaXM7XG4gIH07XG4gIC8qKlxuICAgKiBDbGVhciBhbGwgdXNlciBwcm9wZXJ0aWVzIGZvciB0aGUgY3VycmVudCB1c2VyLlxuICAgKiBTREsgdXNlciBzaG91bGQgaW5zdGVhZCBjYWxsIGFtcGxpdHVkZS5jbGVhclVzZXJQcm9wZXJ0aWVzKCkgaW5zdGVhZCBvZiB1c2luZyB0aGlzLlxuICAgKiAkY2xlYXJBbGwgbmVlZHMgdG8gYmUgc2VudCBvbiBpdHMgb3duIElkZW50aWZ5IG9iamVjdC4gSWYgdGhlcmUgYXJlIGFscmVhZHkgb3RoZXIgb3BlcmF0aW9ucywgdGhlbiBkb24ndCBhZGQgJGNsZWFyQWxsLlxuICAgKiBJZiAkY2xlYXJBbGwgYWxyZWFkeSBpbiBhbiBJZGVudGlmeSBvYmplY3QsIGRvbid0IGFsbG93IG90aGVyIG9wZXJhdGlvbnMgdG8gYmUgYWRkZWQuXG4gICAqIEBwcml2YXRlXG4gICAqL1xuXG5cbiAgSWRlbnRpZnkucHJvdG90eXBlLmNsZWFyQWxsID0gZnVuY3Rpb24gKCkge1xuICAgIGlmIChPYmplY3Qua2V5cyh0aGlzLnVzZXJQcm9wZXJ0aWVzT3BlcmF0aW9ucykubGVuZ3RoID4gMCkge1xuICAgICAgaWYgKCF0aGlzLnVzZXJQcm9wZXJ0aWVzT3BlcmF0aW9ucy5oYXNPd25Qcm9wZXJ0eShBTVBfT1BfQ0xFQVJfQUxMKSkge1xuICAgICAgICB1dGlscy5sb2cuZXJyb3IoJ05lZWQgdG8gc2VuZCAkY2xlYXJBbGwgb24gaXRzIG93biBJZGVudGlmeSBvYmplY3Qgd2l0aG91dCBhbnkgb3RoZXIgb3BlcmF0aW9ucywgc2tpcHBpbmcgJGNsZWFyQWxsJyk7XG4gICAgICB9XG5cbiAgICAgIHJldHVybiB0aGlzO1xuICAgIH1cblxuICAgIHRoaXMudXNlclByb3BlcnRpZXNPcGVyYXRpb25zW0FNUF9PUF9DTEVBUl9BTExdID0gJy0nO1xuICAgIHJldHVybiB0aGlzO1xuICB9O1xuICAvKipcbiAgICogUHJlcGVuZCBhIHZhbHVlIG9yIHZhbHVlcyB0byBhIHVzZXIgcHJvcGVydHkuXG4gICAqIFByZXBlbmQgbWVhbnMgaW5zZXJ0aW5nIHRoZSB2YWx1ZSBvciB2YWx1ZXMgYXQgdGhlIGZyb250IG9mIGEgbGlzdC5cbiAgICogSWYgdGhlIHVzZXIgcHJvcGVydHkgZG9lcyBub3QgaGF2ZSBhIHZhbHVlIHNldCB5ZXQsXG4gICAqIGl0IHdpbGwgYmUgaW5pdGlhbGl6ZWQgdG8gYW4gZW1wdHkgbGlzdCBiZWZvcmUgdGhlIG5ldyB2YWx1ZXMgYXJlIHByZXBlbmRlZC5cbiAgICogSWYgdGhlIHVzZXIgcHJvcGVydHkgaGFzIGFuIGV4aXN0aW5nIHZhbHVlIGFuZCBpdCBpcyBub3QgYSBsaXN0LFxuICAgKiB0aGUgZXhpc3RpbmcgdmFsdWUgd2lsbCBiZSBjb252ZXJ0ZWQgaW50byBhIGxpc3Qgd2l0aCB0aGUgbmV3IHZhbHVlcyBwcmVwZW5kZWQuXG4gICAqIEBwdWJsaWNcbiAgICogQHBhcmFtIHtzdHJpbmd9IHByb3BlcnR5IC0gVGhlIHVzZXIgcHJvcGVydHkga2V5LlxuICAgKiBAcGFyYW0ge251bWJlcnxzdHJpbmd8bGlzdHxvYmplY3R9IHZhbHVlIC0gQSB2YWx1ZSBvciB2YWx1ZXMgdG8gcHJlcGVuZC5cbiAgICogVmFsdWVzIGNhbiBiZSBudW1iZXJzLCBzdHJpbmdzLCBsaXN0cywgb3Igb2JqZWN0IChrZXk6dmFsdWUgZGljdCB3aWxsIGJlIGZsYXR0ZW5lZCkuXG4gICAqIEByZXR1cm4ge0lkZW50aWZ5fSBSZXR1cm5zIHRoZSBzYW1lIElkZW50aWZ5IG9iamVjdCwgYWxsb3dpbmcgeW91IHRvIGNoYWluIG11bHRpcGxlIG1ldGhvZCBjYWxscyB0b2dldGhlci5cbiAgICogQGV4YW1wbGUgdmFyIGlkZW50aWZ5ID0gbmV3IGFtcGxpdHVkZS5JZGVudGlmeSgpLnByZXBlbmQoJ2FiLXRlc3RzJywgJ25ldy11c2VyLXRlc3RzJyk7XG4gICAqIGlkZW50aWZ5LnByZXBlbmQoJ3NvbWVfbGlzdCcsIFsxLCAyLCAzLCA0LCAndmFsdWVzJ10pO1xuICAgKiBhbXBsaXR1ZGUuaWRlbnRpZnkoaWRlbnRpZnkpOyAvLyBzZW5kIHRoZSBJZGVudGlmeSBjYWxsXG4gICAqL1xuXG5cbiAgSWRlbnRpZnkucHJvdG90eXBlLnByZXBlbmQgPSBmdW5jdGlvbiAocHJvcGVydHksIHZhbHVlKSB7XG4gICAgdGhpcy5fYWRkT3BlcmF0aW9uKEFNUF9PUF9QUkVQRU5ELCBwcm9wZXJ0eSwgdmFsdWUpO1xuXG4gICAgcmV0dXJuIHRoaXM7XG4gIH07XG4gIC8qKlxuICAgKiBTZXRzIHRoZSB2YWx1ZSBvZiBhIGdpdmVuIHVzZXIgcHJvcGVydHkuIElmIGEgdmFsdWUgYWxyZWFkeSBleGlzdHMsIGl0IHdpbGwgYmUgb3ZlcndyaXRlbiB3aXRoIHRoZSBuZXcgdmFsdWUuXG4gICAqIEBwdWJsaWNcbiAgICogQHBhcmFtIHtzdHJpbmd9IHByb3BlcnR5IC0gVGhlIHVzZXIgcHJvcGVydHkga2V5LlxuICAgKiBAcGFyYW0ge251bWJlcnxzdHJpbmd8bGlzdHxib29sZWFufG9iamVjdH0gdmFsdWUgLSBBIHZhbHVlIG9yIHZhbHVlcyB0byBzZXQuXG4gICAqIFZhbHVlcyBjYW4gYmUgbnVtYmVycywgc3RyaW5ncywgbGlzdHMsIG9yIG9iamVjdCAoa2V5OnZhbHVlIGRpY3Qgd2lsbCBiZSBmbGF0dGVuZWQpLlxuICAgKiBAcmV0dXJuIHtJZGVudGlmeX0gUmV0dXJucyB0aGUgc2FtZSBJZGVudGlmeSBvYmplY3QsIGFsbG93aW5nIHlvdSB0byBjaGFpbiBtdWx0aXBsZSBtZXRob2QgY2FsbHMgdG9nZXRoZXIuXG4gICAqIEBleGFtcGxlIHZhciBpZGVudGlmeSA9IG5ldyBhbXBsaXR1ZGUuSWRlbnRpZnkoKS5zZXQoJ3VzZXJfdHlwZScsICdiZXRhJyk7XG4gICAqIGlkZW50aWZ5LnNldCgnbmFtZScsIHsnZmlyc3QnOiAnSm9obicsICdsYXN0JzogJ0RvZSd9KTsgLy8gZGljdCBpcyBmbGF0dGVuZWQgYW5kIGJlY29tZXMgbmFtZS5maXJzdDogSm9obiwgbmFtZS5sYXN0OiBEb2VcbiAgICogYW1wbGl0dWRlLmlkZW50aWZ5KGlkZW50aWZ5KTsgLy8gc2VuZCB0aGUgSWRlbnRpZnkgY2FsbFxuICAgKi9cblxuXG4gIElkZW50aWZ5LnByb3RvdHlwZS5zZXQgPSBmdW5jdGlvbiAocHJvcGVydHksIHZhbHVlKSB7XG4gICAgdGhpcy5fYWRkT3BlcmF0aW9uKEFNUF9PUF9TRVQsIHByb3BlcnR5LCB2YWx1ZSk7XG5cbiAgICByZXR1cm4gdGhpcztcbiAgfTtcbiAgLyoqXG4gICAqIFNldHMgdGhlIHZhbHVlIG9mIGEgZ2l2ZW4gdXNlciBwcm9wZXJ0eSBvbmx5IG9uY2UuIFN1YnNlcXVlbnQgc2V0T25jZSBvcGVyYXRpb25zIG9uIHRoYXQgdXNlciBwcm9wZXJ0eSB3aWxsIGJlIGlnbm9yZWQ7XG4gICAqIGhvd2V2ZXIsIHRoYXQgdXNlciBwcm9wZXJ0eSBjYW4gc3RpbGwgYmUgbW9kaWZpZWQgdGhyb3VnaCBhbnkgb2YgdGhlIG90aGVyIG9wZXJhdGlvbnMuXG4gICAqIFVzZWZ1bCBmb3IgY2FwdHVyaW5nIHByb3BlcnRpZXMgc3VjaCBhcyAnaW5pdGlhbF9zaWdudXBfZGF0ZScsICdpbml0aWFsX3JlZmVycmVyJywgZXRjLlxuICAgKiBAcHVibGljXG4gICAqIEBwYXJhbSB7c3RyaW5nfSBwcm9wZXJ0eSAtIFRoZSB1c2VyIHByb3BlcnR5IGtleS5cbiAgICogQHBhcmFtIHtudW1iZXJ8c3RyaW5nfGxpc3R8Ym9vbGVhbnxvYmplY3R9IHZhbHVlIC0gQSB2YWx1ZSBvciB2YWx1ZXMgdG8gc2V0IG9uY2UuXG4gICAqIFZhbHVlcyBjYW4gYmUgbnVtYmVycywgc3RyaW5ncywgbGlzdHMsIG9yIG9iamVjdCAoa2V5OnZhbHVlIGRpY3Qgd2lsbCBiZSBmbGF0dGVuZWQpLlxuICAgKiBAcmV0dXJuIHtJZGVudGlmeX0gUmV0dXJucyB0aGUgc2FtZSBJZGVudGlmeSBvYmplY3QsIGFsbG93aW5nIHlvdSB0byBjaGFpbiBtdWx0aXBsZSBtZXRob2QgY2FsbHMgdG9nZXRoZXIuXG4gICAqIEBleGFtcGxlIHZhciBpZGVudGlmeSA9IG5ldyBhbXBsaXR1ZGUuSWRlbnRpZnkoKS5zZXRPbmNlKCdzaWduX3VwX2RhdGUnLCAnMjAxNi0wNC0wMScpO1xuICAgKiBhbXBsaXR1ZGUuaWRlbnRpZnkoaWRlbnRpZnkpOyAvLyBzZW5kIHRoZSBJZGVudGlmeSBjYWxsXG4gICAqL1xuXG5cbiAgSWRlbnRpZnkucHJvdG90eXBlLnNldE9uY2UgPSBmdW5jdGlvbiAocHJvcGVydHksIHZhbHVlKSB7XG4gICAgdGhpcy5fYWRkT3BlcmF0aW9uKEFNUF9PUF9TRVRfT05DRSwgcHJvcGVydHksIHZhbHVlKTtcblxuICAgIHJldHVybiB0aGlzO1xuICB9O1xuICAvKipcbiAgICogVW5zZXQgYW5kIHJlbW92ZSBhIHVzZXIgcHJvcGVydHkuIFRoaXMgdXNlciBwcm9wZXJ0eSB3aWxsIG5vIGxvbmdlciBzaG93IHVwIGluIGEgdXNlcidzIHByb2ZpbGUuXG4gICAqIEBwdWJsaWNcbiAgICogQHBhcmFtIHtzdHJpbmd9IHByb3BlcnR5IC0gVGhlIHVzZXIgcHJvcGVydHkga2V5LlxuICAgKiBAcmV0dXJuIHtJZGVudGlmeX0gUmV0dXJucyB0aGUgc2FtZSBJZGVudGlmeSBvYmplY3QsIGFsbG93aW5nIHlvdSB0byBjaGFpbiBtdWx0aXBsZSBtZXRob2QgY2FsbHMgdG9nZXRoZXIuXG4gICAqIEBleGFtcGxlIHZhciBpZGVudGlmeSA9IG5ldyBhbXBsaXR1ZGUuSWRlbnRpZnkoKS51bnNldCgndXNlcl90eXBlJykudW5zZXQoJ2FnZScpO1xuICAgKiBhbXBsaXR1ZGUuaWRlbnRpZnkoaWRlbnRpZnkpOyAvLyBzZW5kIHRoZSBJZGVudGlmeSBjYWxsXG4gICAqL1xuXG5cbiAgSWRlbnRpZnkucHJvdG90eXBlLnVuc2V0ID0gZnVuY3Rpb24gKHByb3BlcnR5KSB7XG4gICAgdGhpcy5fYWRkT3BlcmF0aW9uKEFNUF9PUF9VTlNFVCwgcHJvcGVydHksICctJyk7XG5cbiAgICByZXR1cm4gdGhpcztcbiAgfTtcbiAgLyoqXG4gICAqIEhlbHBlciBmdW5jdGlvbiB0aGF0IGFkZHMgb3BlcmF0aW9uIHRvIHRoZSBJZGVudGlmeSdzIG9iamVjdFxuICAgKiBIYW5kbGUncyBmaWx0ZXJpbmcgb2YgZHVwbGljYXRlIHVzZXIgcHJvcGVydHkga2V5cywgYW5kIGZpbHRlcmluZyBmb3IgY2xlYXJBbGwuXG4gICAqIEBwcml2YXRlXG4gICAqL1xuXG5cbiAgSWRlbnRpZnkucHJvdG90eXBlLl9hZGRPcGVyYXRpb24gPSBmdW5jdGlvbiAob3BlcmF0aW9uLCBwcm9wZXJ0eSwgdmFsdWUpIHtcbiAgICAvLyBjaGVjayB0aGF0IHRoZSBpZGVudGlmeSBkb2Vzbid0IGFscmVhZHkgY29udGFpbiBhIGNsZWFyQWxsXG4gICAgaWYgKHRoaXMudXNlclByb3BlcnRpZXNPcGVyYXRpb25zLmhhc093blByb3BlcnR5KEFNUF9PUF9DTEVBUl9BTEwpKSB7XG4gICAgICB1dGlscy5sb2cuZXJyb3IoJ1RoaXMgaWRlbnRpZnkgYWxyZWFkeSBjb250YWlucyBhICRjbGVhckFsbCBvcGVyYXRpb24sIHNraXBwaW5nIG9wZXJhdGlvbiAnICsgb3BlcmF0aW9uKTtcbiAgICAgIHJldHVybjtcbiAgICB9IC8vIGNoZWNrIHRoYXQgcHJvcGVydHkgd2Fzbid0IGFscmVhZHkgdXNlZCBpbiB0aGlzIElkZW50aWZ5XG5cblxuICAgIGlmICh0aGlzLnByb3BlcnRpZXMuaW5kZXhPZihwcm9wZXJ0eSkgIT09IC0xKSB7XG4gICAgICB1dGlscy5sb2cuZXJyb3IoJ1VzZXIgcHJvcGVydHkgXCInICsgcHJvcGVydHkgKyAnXCIgYWxyZWFkeSB1c2VkIGluIHRoaXMgaWRlbnRpZnksIHNraXBwaW5nIG9wZXJhdGlvbiAnICsgb3BlcmF0aW9uKTtcbiAgICAgIHJldHVybjtcbiAgICB9XG5cbiAgICBpZiAoIXRoaXMudXNlclByb3BlcnRpZXNPcGVyYXRpb25zLmhhc093blByb3BlcnR5KG9wZXJhdGlvbikpIHtcbiAgICAgIHRoaXMudXNlclByb3BlcnRpZXNPcGVyYXRpb25zW29wZXJhdGlvbl0gPSB7fTtcbiAgICB9XG5cbiAgICB0aGlzLnVzZXJQcm9wZXJ0aWVzT3BlcmF0aW9uc1tvcGVyYXRpb25dW3Byb3BlcnR5XSA9IHZhbHVlO1xuICAgIHRoaXMucHJvcGVydGllcy5wdXNoKHByb3BlcnR5KTtcbiAgfTtcblxuICB2YXIgY29tbW9uanNHbG9iYWwgPSB0eXBlb2Ygd2luZG93ICE9PSAndW5kZWZpbmVkJyA/IHdpbmRvdyA6IHR5cGVvZiBnbG9iYWwgIT09ICd1bmRlZmluZWQnID8gZ2xvYmFsIDogdHlwZW9mIHNlbGYgIT09ICd1bmRlZmluZWQnID8gc2VsZiA6IHt9O1xuXG4gIGZ1bmN0aW9uIGNyZWF0ZUNvbW1vbmpzTW9kdWxlKGZuLCBtb2R1bGUpIHtcbiAgXHRyZXR1cm4gbW9kdWxlID0geyBleHBvcnRzOiB7fSB9LCBmbihtb2R1bGUsIG1vZHVsZS5leHBvcnRzKSwgbW9kdWxlLmV4cG9ydHM7XG4gIH1cblxuICB2YXIgbWQ1ID0gY3JlYXRlQ29tbW9uanNNb2R1bGUoZnVuY3Rpb24gKG1vZHVsZSkge1xuICAoZnVuY3Rpb24gKCQpIHtcblxuICAgIC8qXG4gICAgKiBBZGQgaW50ZWdlcnMsIHdyYXBwaW5nIGF0IDJeMzIuIFRoaXMgdXNlcyAxNi1iaXQgb3BlcmF0aW9ucyBpbnRlcm5hbGx5XG4gICAgKiB0byB3b3JrIGFyb3VuZCBidWdzIGluIHNvbWUgSlMgaW50ZXJwcmV0ZXJzLlxuICAgICovXG4gICAgZnVuY3Rpb24gc2FmZUFkZCAoeCwgeSkge1xuICAgICAgdmFyIGxzdyA9ICh4ICYgMHhmZmZmKSArICh5ICYgMHhmZmZmKTtcbiAgICAgIHZhciBtc3cgPSAoeCA+PiAxNikgKyAoeSA+PiAxNikgKyAobHN3ID4+IDE2KTtcbiAgICAgIHJldHVybiAobXN3IDw8IDE2KSB8IChsc3cgJiAweGZmZmYpXG4gICAgfVxuXG4gICAgLypcbiAgICAqIEJpdHdpc2Ugcm90YXRlIGEgMzItYml0IG51bWJlciB0byB0aGUgbGVmdC5cbiAgICAqL1xuICAgIGZ1bmN0aW9uIGJpdFJvdGF0ZUxlZnQgKG51bSwgY250KSB7XG4gICAgICByZXR1cm4gKG51bSA8PCBjbnQpIHwgKG51bSA+Pj4gKDMyIC0gY250KSlcbiAgICB9XG5cbiAgICAvKlxuICAgICogVGhlc2UgZnVuY3Rpb25zIGltcGxlbWVudCB0aGUgZm91ciBiYXNpYyBvcGVyYXRpb25zIHRoZSBhbGdvcml0aG0gdXNlcy5cbiAgICAqL1xuICAgIGZ1bmN0aW9uIG1kNWNtbiAocSwgYSwgYiwgeCwgcywgdCkge1xuICAgICAgcmV0dXJuIHNhZmVBZGQoYml0Um90YXRlTGVmdChzYWZlQWRkKHNhZmVBZGQoYSwgcSksIHNhZmVBZGQoeCwgdCkpLCBzKSwgYilcbiAgICB9XG4gICAgZnVuY3Rpb24gbWQ1ZmYgKGEsIGIsIGMsIGQsIHgsIHMsIHQpIHtcbiAgICAgIHJldHVybiBtZDVjbW4oKGIgJiBjKSB8ICh+YiAmIGQpLCBhLCBiLCB4LCBzLCB0KVxuICAgIH1cbiAgICBmdW5jdGlvbiBtZDVnZyAoYSwgYiwgYywgZCwgeCwgcywgdCkge1xuICAgICAgcmV0dXJuIG1kNWNtbigoYiAmIGQpIHwgKGMgJiB+ZCksIGEsIGIsIHgsIHMsIHQpXG4gICAgfVxuICAgIGZ1bmN0aW9uIG1kNWhoIChhLCBiLCBjLCBkLCB4LCBzLCB0KSB7XG4gICAgICByZXR1cm4gbWQ1Y21uKGIgXiBjIF4gZCwgYSwgYiwgeCwgcywgdClcbiAgICB9XG4gICAgZnVuY3Rpb24gbWQ1aWkgKGEsIGIsIGMsIGQsIHgsIHMsIHQpIHtcbiAgICAgIHJldHVybiBtZDVjbW4oYyBeIChiIHwgfmQpLCBhLCBiLCB4LCBzLCB0KVxuICAgIH1cblxuICAgIC8qXG4gICAgKiBDYWxjdWxhdGUgdGhlIE1ENSBvZiBhbiBhcnJheSBvZiBsaXR0bGUtZW5kaWFuIHdvcmRzLCBhbmQgYSBiaXQgbGVuZ3RoLlxuICAgICovXG4gICAgZnVuY3Rpb24gYmlubE1ENSAoeCwgbGVuKSB7XG4gICAgICAvKiBhcHBlbmQgcGFkZGluZyAqL1xuICAgICAgeFtsZW4gPj4gNV0gfD0gMHg4MCA8PCAobGVuICUgMzIpO1xuICAgICAgeFsoKGxlbiArIDY0KSA+Pj4gOSA8PCA0KSArIDE0XSA9IGxlbjtcblxuICAgICAgdmFyIGk7XG4gICAgICB2YXIgb2xkYTtcbiAgICAgIHZhciBvbGRiO1xuICAgICAgdmFyIG9sZGM7XG4gICAgICB2YXIgb2xkZDtcbiAgICAgIHZhciBhID0gMTczMjU4NDE5MztcbiAgICAgIHZhciBiID0gLTI3MTczMzg3OTtcbiAgICAgIHZhciBjID0gLTE3MzI1ODQxOTQ7XG4gICAgICB2YXIgZCA9IDI3MTczMzg3ODtcblxuICAgICAgZm9yIChpID0gMDsgaSA8IHgubGVuZ3RoOyBpICs9IDE2KSB7XG4gICAgICAgIG9sZGEgPSBhO1xuICAgICAgICBvbGRiID0gYjtcbiAgICAgICAgb2xkYyA9IGM7XG4gICAgICAgIG9sZGQgPSBkO1xuXG4gICAgICAgIGEgPSBtZDVmZihhLCBiLCBjLCBkLCB4W2ldLCA3LCAtNjgwODc2OTM2KTtcbiAgICAgICAgZCA9IG1kNWZmKGQsIGEsIGIsIGMsIHhbaSArIDFdLCAxMiwgLTM4OTU2NDU4Nik7XG4gICAgICAgIGMgPSBtZDVmZihjLCBkLCBhLCBiLCB4W2kgKyAyXSwgMTcsIDYwNjEwNTgxOSk7XG4gICAgICAgIGIgPSBtZDVmZihiLCBjLCBkLCBhLCB4W2kgKyAzXSwgMjIsIC0xMDQ0NTI1MzMwKTtcbiAgICAgICAgYSA9IG1kNWZmKGEsIGIsIGMsIGQsIHhbaSArIDRdLCA3LCAtMTc2NDE4ODk3KTtcbiAgICAgICAgZCA9IG1kNWZmKGQsIGEsIGIsIGMsIHhbaSArIDVdLCAxMiwgMTIwMDA4MDQyNik7XG4gICAgICAgIGMgPSBtZDVmZihjLCBkLCBhLCBiLCB4W2kgKyA2XSwgMTcsIC0xNDczMjMxMzQxKTtcbiAgICAgICAgYiA9IG1kNWZmKGIsIGMsIGQsIGEsIHhbaSArIDddLCAyMiwgLTQ1NzA1OTgzKTtcbiAgICAgICAgYSA9IG1kNWZmKGEsIGIsIGMsIGQsIHhbaSArIDhdLCA3LCAxNzcwMDM1NDE2KTtcbiAgICAgICAgZCA9IG1kNWZmKGQsIGEsIGIsIGMsIHhbaSArIDldLCAxMiwgLTE5NTg0MTQ0MTcpO1xuICAgICAgICBjID0gbWQ1ZmYoYywgZCwgYSwgYiwgeFtpICsgMTBdLCAxNywgLTQyMDYzKTtcbiAgICAgICAgYiA9IG1kNWZmKGIsIGMsIGQsIGEsIHhbaSArIDExXSwgMjIsIC0xOTkwNDA0MTYyKTtcbiAgICAgICAgYSA9IG1kNWZmKGEsIGIsIGMsIGQsIHhbaSArIDEyXSwgNywgMTgwNDYwMzY4Mik7XG4gICAgICAgIGQgPSBtZDVmZihkLCBhLCBiLCBjLCB4W2kgKyAxM10sIDEyLCAtNDAzNDExMDEpO1xuICAgICAgICBjID0gbWQ1ZmYoYywgZCwgYSwgYiwgeFtpICsgMTRdLCAxNywgLTE1MDIwMDIyOTApO1xuICAgICAgICBiID0gbWQ1ZmYoYiwgYywgZCwgYSwgeFtpICsgMTVdLCAyMiwgMTIzNjUzNTMyOSk7XG5cbiAgICAgICAgYSA9IG1kNWdnKGEsIGIsIGMsIGQsIHhbaSArIDFdLCA1LCAtMTY1Nzk2NTEwKTtcbiAgICAgICAgZCA9IG1kNWdnKGQsIGEsIGIsIGMsIHhbaSArIDZdLCA5LCAtMTA2OTUwMTYzMik7XG4gICAgICAgIGMgPSBtZDVnZyhjLCBkLCBhLCBiLCB4W2kgKyAxMV0sIDE0LCA2NDM3MTc3MTMpO1xuICAgICAgICBiID0gbWQ1Z2coYiwgYywgZCwgYSwgeFtpXSwgMjAsIC0zNzM4OTczMDIpO1xuICAgICAgICBhID0gbWQ1Z2coYSwgYiwgYywgZCwgeFtpICsgNV0sIDUsIC03MDE1NTg2OTEpO1xuICAgICAgICBkID0gbWQ1Z2coZCwgYSwgYiwgYywgeFtpICsgMTBdLCA5LCAzODAxNjA4Myk7XG4gICAgICAgIGMgPSBtZDVnZyhjLCBkLCBhLCBiLCB4W2kgKyAxNV0sIDE0LCAtNjYwNDc4MzM1KTtcbiAgICAgICAgYiA9IG1kNWdnKGIsIGMsIGQsIGEsIHhbaSArIDRdLCAyMCwgLTQwNTUzNzg0OCk7XG4gICAgICAgIGEgPSBtZDVnZyhhLCBiLCBjLCBkLCB4W2kgKyA5XSwgNSwgNTY4NDQ2NDM4KTtcbiAgICAgICAgZCA9IG1kNWdnKGQsIGEsIGIsIGMsIHhbaSArIDE0XSwgOSwgLTEwMTk4MDM2OTApO1xuICAgICAgICBjID0gbWQ1Z2coYywgZCwgYSwgYiwgeFtpICsgM10sIDE0LCAtMTg3MzYzOTYxKTtcbiAgICAgICAgYiA9IG1kNWdnKGIsIGMsIGQsIGEsIHhbaSArIDhdLCAyMCwgMTE2MzUzMTUwMSk7XG4gICAgICAgIGEgPSBtZDVnZyhhLCBiLCBjLCBkLCB4W2kgKyAxM10sIDUsIC0xNDQ0NjgxNDY3KTtcbiAgICAgICAgZCA9IG1kNWdnKGQsIGEsIGIsIGMsIHhbaSArIDJdLCA5LCAtNTE0MDM3ODQpO1xuICAgICAgICBjID0gbWQ1Z2coYywgZCwgYSwgYiwgeFtpICsgN10sIDE0LCAxNzM1MzI4NDczKTtcbiAgICAgICAgYiA9IG1kNWdnKGIsIGMsIGQsIGEsIHhbaSArIDEyXSwgMjAsIC0xOTI2NjA3NzM0KTtcblxuICAgICAgICBhID0gbWQ1aGgoYSwgYiwgYywgZCwgeFtpICsgNV0sIDQsIC0zNzg1NTgpO1xuICAgICAgICBkID0gbWQ1aGgoZCwgYSwgYiwgYywgeFtpICsgOF0sIDExLCAtMjAyMjU3NDQ2Myk7XG4gICAgICAgIGMgPSBtZDVoaChjLCBkLCBhLCBiLCB4W2kgKyAxMV0sIDE2LCAxODM5MDMwNTYyKTtcbiAgICAgICAgYiA9IG1kNWhoKGIsIGMsIGQsIGEsIHhbaSArIDE0XSwgMjMsIC0zNTMwOTU1Nik7XG4gICAgICAgIGEgPSBtZDVoaChhLCBiLCBjLCBkLCB4W2kgKyAxXSwgNCwgLTE1MzA5OTIwNjApO1xuICAgICAgICBkID0gbWQ1aGgoZCwgYSwgYiwgYywgeFtpICsgNF0sIDExLCAxMjcyODkzMzUzKTtcbiAgICAgICAgYyA9IG1kNWhoKGMsIGQsIGEsIGIsIHhbaSArIDddLCAxNiwgLTE1NTQ5NzYzMik7XG4gICAgICAgIGIgPSBtZDVoaChiLCBjLCBkLCBhLCB4W2kgKyAxMF0sIDIzLCAtMTA5NDczMDY0MCk7XG4gICAgICAgIGEgPSBtZDVoaChhLCBiLCBjLCBkLCB4W2kgKyAxM10sIDQsIDY4MTI3OTE3NCk7XG4gICAgICAgIGQgPSBtZDVoaChkLCBhLCBiLCBjLCB4W2ldLCAxMSwgLTM1ODUzNzIyMik7XG4gICAgICAgIGMgPSBtZDVoaChjLCBkLCBhLCBiLCB4W2kgKyAzXSwgMTYsIC03MjI1MjE5NzkpO1xuICAgICAgICBiID0gbWQ1aGgoYiwgYywgZCwgYSwgeFtpICsgNl0sIDIzLCA3NjAyOTE4OSk7XG4gICAgICAgIGEgPSBtZDVoaChhLCBiLCBjLCBkLCB4W2kgKyA5XSwgNCwgLTY0MDM2NDQ4Nyk7XG4gICAgICAgIGQgPSBtZDVoaChkLCBhLCBiLCBjLCB4W2kgKyAxMl0sIDExLCAtNDIxODE1ODM1KTtcbiAgICAgICAgYyA9IG1kNWhoKGMsIGQsIGEsIGIsIHhbaSArIDE1XSwgMTYsIDUzMDc0MjUyMCk7XG4gICAgICAgIGIgPSBtZDVoaChiLCBjLCBkLCBhLCB4W2kgKyAyXSwgMjMsIC05OTUzMzg2NTEpO1xuXG4gICAgICAgIGEgPSBtZDVpaShhLCBiLCBjLCBkLCB4W2ldLCA2LCAtMTk4NjMwODQ0KTtcbiAgICAgICAgZCA9IG1kNWlpKGQsIGEsIGIsIGMsIHhbaSArIDddLCAxMCwgMTEyNjg5MTQxNSk7XG4gICAgICAgIGMgPSBtZDVpaShjLCBkLCBhLCBiLCB4W2kgKyAxNF0sIDE1LCAtMTQxNjM1NDkwNSk7XG4gICAgICAgIGIgPSBtZDVpaShiLCBjLCBkLCBhLCB4W2kgKyA1XSwgMjEsIC01NzQzNDA1NSk7XG4gICAgICAgIGEgPSBtZDVpaShhLCBiLCBjLCBkLCB4W2kgKyAxMl0sIDYsIDE3MDA0ODU1NzEpO1xuICAgICAgICBkID0gbWQ1aWkoZCwgYSwgYiwgYywgeFtpICsgM10sIDEwLCAtMTg5NDk4NjYwNik7XG4gICAgICAgIGMgPSBtZDVpaShjLCBkLCBhLCBiLCB4W2kgKyAxMF0sIDE1LCAtMTA1MTUyMyk7XG4gICAgICAgIGIgPSBtZDVpaShiLCBjLCBkLCBhLCB4W2kgKyAxXSwgMjEsIC0yMDU0OTIyNzk5KTtcbiAgICAgICAgYSA9IG1kNWlpKGEsIGIsIGMsIGQsIHhbaSArIDhdLCA2LCAxODczMzEzMzU5KTtcbiAgICAgICAgZCA9IG1kNWlpKGQsIGEsIGIsIGMsIHhbaSArIDE1XSwgMTAsIC0zMDYxMTc0NCk7XG4gICAgICAgIGMgPSBtZDVpaShjLCBkLCBhLCBiLCB4W2kgKyA2XSwgMTUsIC0xNTYwMTk4MzgwKTtcbiAgICAgICAgYiA9IG1kNWlpKGIsIGMsIGQsIGEsIHhbaSArIDEzXSwgMjEsIDEzMDkxNTE2NDkpO1xuICAgICAgICBhID0gbWQ1aWkoYSwgYiwgYywgZCwgeFtpICsgNF0sIDYsIC0xNDU1MjMwNzApO1xuICAgICAgICBkID0gbWQ1aWkoZCwgYSwgYiwgYywgeFtpICsgMTFdLCAxMCwgLTExMjAyMTAzNzkpO1xuICAgICAgICBjID0gbWQ1aWkoYywgZCwgYSwgYiwgeFtpICsgMl0sIDE1LCA3MTg3ODcyNTkpO1xuICAgICAgICBiID0gbWQ1aWkoYiwgYywgZCwgYSwgeFtpICsgOV0sIDIxLCAtMzQzNDg1NTUxKTtcblxuICAgICAgICBhID0gc2FmZUFkZChhLCBvbGRhKTtcbiAgICAgICAgYiA9IHNhZmVBZGQoYiwgb2xkYik7XG4gICAgICAgIGMgPSBzYWZlQWRkKGMsIG9sZGMpO1xuICAgICAgICBkID0gc2FmZUFkZChkLCBvbGRkKTtcbiAgICAgIH1cbiAgICAgIHJldHVybiBbYSwgYiwgYywgZF1cbiAgICB9XG5cbiAgICAvKlxuICAgICogQ29udmVydCBhbiBhcnJheSBvZiBsaXR0bGUtZW5kaWFuIHdvcmRzIHRvIGEgc3RyaW5nXG4gICAgKi9cbiAgICBmdW5jdGlvbiBiaW5sMnJzdHIgKGlucHV0KSB7XG4gICAgICB2YXIgaTtcbiAgICAgIHZhciBvdXRwdXQgPSAnJztcbiAgICAgIHZhciBsZW5ndGgzMiA9IGlucHV0Lmxlbmd0aCAqIDMyO1xuICAgICAgZm9yIChpID0gMDsgaSA8IGxlbmd0aDMyOyBpICs9IDgpIHtcbiAgICAgICAgb3V0cHV0ICs9IFN0cmluZy5mcm9tQ2hhckNvZGUoKGlucHV0W2kgPj4gNV0gPj4+IChpICUgMzIpKSAmIDB4ZmYpO1xuICAgICAgfVxuICAgICAgcmV0dXJuIG91dHB1dFxuICAgIH1cblxuICAgIC8qXG4gICAgKiBDb252ZXJ0IGEgcmF3IHN0cmluZyB0byBhbiBhcnJheSBvZiBsaXR0bGUtZW5kaWFuIHdvcmRzXG4gICAgKiBDaGFyYWN0ZXJzID4yNTUgaGF2ZSB0aGVpciBoaWdoLWJ5dGUgc2lsZW50bHkgaWdub3JlZC5cbiAgICAqL1xuICAgIGZ1bmN0aW9uIHJzdHIyYmlubCAoaW5wdXQpIHtcbiAgICAgIHZhciBpO1xuICAgICAgdmFyIG91dHB1dCA9IFtdO1xuICAgICAgb3V0cHV0WyhpbnB1dC5sZW5ndGggPj4gMikgLSAxXSA9IHVuZGVmaW5lZDtcbiAgICAgIGZvciAoaSA9IDA7IGkgPCBvdXRwdXQubGVuZ3RoOyBpICs9IDEpIHtcbiAgICAgICAgb3V0cHV0W2ldID0gMDtcbiAgICAgIH1cbiAgICAgIHZhciBsZW5ndGg4ID0gaW5wdXQubGVuZ3RoICogODtcbiAgICAgIGZvciAoaSA9IDA7IGkgPCBsZW5ndGg4OyBpICs9IDgpIHtcbiAgICAgICAgb3V0cHV0W2kgPj4gNV0gfD0gKGlucHV0LmNoYXJDb2RlQXQoaSAvIDgpICYgMHhmZikgPDwgKGkgJSAzMik7XG4gICAgICB9XG4gICAgICByZXR1cm4gb3V0cHV0XG4gICAgfVxuXG4gICAgLypcbiAgICAqIENhbGN1bGF0ZSB0aGUgTUQ1IG9mIGEgcmF3IHN0cmluZ1xuICAgICovXG4gICAgZnVuY3Rpb24gcnN0ck1ENSAocykge1xuICAgICAgcmV0dXJuIGJpbmwycnN0cihiaW5sTUQ1KHJzdHIyYmlubChzKSwgcy5sZW5ndGggKiA4KSlcbiAgICB9XG5cbiAgICAvKlxuICAgICogQ2FsY3VsYXRlIHRoZSBITUFDLU1ENSwgb2YgYSBrZXkgYW5kIHNvbWUgZGF0YSAocmF3IHN0cmluZ3MpXG4gICAgKi9cbiAgICBmdW5jdGlvbiByc3RySE1BQ01ENSAoa2V5LCBkYXRhKSB7XG4gICAgICB2YXIgaTtcbiAgICAgIHZhciBia2V5ID0gcnN0cjJiaW5sKGtleSk7XG4gICAgICB2YXIgaXBhZCA9IFtdO1xuICAgICAgdmFyIG9wYWQgPSBbXTtcbiAgICAgIHZhciBoYXNoO1xuICAgICAgaXBhZFsxNV0gPSBvcGFkWzE1XSA9IHVuZGVmaW5lZDtcbiAgICAgIGlmIChia2V5Lmxlbmd0aCA+IDE2KSB7XG4gICAgICAgIGJrZXkgPSBiaW5sTUQ1KGJrZXksIGtleS5sZW5ndGggKiA4KTtcbiAgICAgIH1cbiAgICAgIGZvciAoaSA9IDA7IGkgPCAxNjsgaSArPSAxKSB7XG4gICAgICAgIGlwYWRbaV0gPSBia2V5W2ldIF4gMHgzNjM2MzYzNjtcbiAgICAgICAgb3BhZFtpXSA9IGJrZXlbaV0gXiAweDVjNWM1YzVjO1xuICAgICAgfVxuICAgICAgaGFzaCA9IGJpbmxNRDUoaXBhZC5jb25jYXQocnN0cjJiaW5sKGRhdGEpKSwgNTEyICsgZGF0YS5sZW5ndGggKiA4KTtcbiAgICAgIHJldHVybiBiaW5sMnJzdHIoYmlubE1ENShvcGFkLmNvbmNhdChoYXNoKSwgNTEyICsgMTI4KSlcbiAgICB9XG5cbiAgICAvKlxuICAgICogQ29udmVydCBhIHJhdyBzdHJpbmcgdG8gYSBoZXggc3RyaW5nXG4gICAgKi9cbiAgICBmdW5jdGlvbiByc3RyMmhleCAoaW5wdXQpIHtcbiAgICAgIHZhciBoZXhUYWIgPSAnMDEyMzQ1Njc4OWFiY2RlZic7XG4gICAgICB2YXIgb3V0cHV0ID0gJyc7XG4gICAgICB2YXIgeDtcbiAgICAgIHZhciBpO1xuICAgICAgZm9yIChpID0gMDsgaSA8IGlucHV0Lmxlbmd0aDsgaSArPSAxKSB7XG4gICAgICAgIHggPSBpbnB1dC5jaGFyQ29kZUF0KGkpO1xuICAgICAgICBvdXRwdXQgKz0gaGV4VGFiLmNoYXJBdCgoeCA+Pj4gNCkgJiAweDBmKSArIGhleFRhYi5jaGFyQXQoeCAmIDB4MGYpO1xuICAgICAgfVxuICAgICAgcmV0dXJuIG91dHB1dFxuICAgIH1cblxuICAgIC8qXG4gICAgKiBFbmNvZGUgYSBzdHJpbmcgYXMgdXRmLThcbiAgICAqL1xuICAgIGZ1bmN0aW9uIHN0cjJyc3RyVVRGOCAoaW5wdXQpIHtcbiAgICAgIHJldHVybiB1bmVzY2FwZShlbmNvZGVVUklDb21wb25lbnQoaW5wdXQpKVxuICAgIH1cblxuICAgIC8qXG4gICAgKiBUYWtlIHN0cmluZyBhcmd1bWVudHMgYW5kIHJldHVybiBlaXRoZXIgcmF3IG9yIGhleCBlbmNvZGVkIHN0cmluZ3NcbiAgICAqL1xuICAgIGZ1bmN0aW9uIHJhd01ENSAocykge1xuICAgICAgcmV0dXJuIHJzdHJNRDUoc3RyMnJzdHJVVEY4KHMpKVxuICAgIH1cbiAgICBmdW5jdGlvbiBoZXhNRDUgKHMpIHtcbiAgICAgIHJldHVybiByc3RyMmhleChyYXdNRDUocykpXG4gICAgfVxuICAgIGZ1bmN0aW9uIHJhd0hNQUNNRDUgKGssIGQpIHtcbiAgICAgIHJldHVybiByc3RySE1BQ01ENShzdHIycnN0clVURjgoayksIHN0cjJyc3RyVVRGOChkKSlcbiAgICB9XG4gICAgZnVuY3Rpb24gaGV4SE1BQ01ENSAoaywgZCkge1xuICAgICAgcmV0dXJuIHJzdHIyaGV4KHJhd0hNQUNNRDUoaywgZCkpXG4gICAgfVxuXG4gICAgZnVuY3Rpb24gbWQ1IChzdHJpbmcsIGtleSwgcmF3KSB7XG4gICAgICBpZiAoIWtleSkge1xuICAgICAgICBpZiAoIXJhdykge1xuICAgICAgICAgIHJldHVybiBoZXhNRDUoc3RyaW5nKVxuICAgICAgICB9XG4gICAgICAgIHJldHVybiByYXdNRDUoc3RyaW5nKVxuICAgICAgfVxuICAgICAgaWYgKCFyYXcpIHtcbiAgICAgICAgcmV0dXJuIGhleEhNQUNNRDUoa2V5LCBzdHJpbmcpXG4gICAgICB9XG4gICAgICByZXR1cm4gcmF3SE1BQ01ENShrZXksIHN0cmluZylcbiAgICB9XG5cbiAgICBpZiAobW9kdWxlLmV4cG9ydHMpIHtcbiAgICAgIG1vZHVsZS5leHBvcnRzID0gbWQ1O1xuICAgIH0gZWxzZSB7XG4gICAgICAkLm1kNSA9IG1kNTtcbiAgICB9XG4gIH0pKGNvbW1vbmpzR2xvYmFsKTtcbiAgfSk7XG5cbiAgdmFyIHN0cmljdFVyaUVuY29kZSA9IGZ1bmN0aW9uIChzdHIpIHtcbiAgXHRyZXR1cm4gZW5jb2RlVVJJQ29tcG9uZW50KHN0cikucmVwbGFjZSgvWyEnKCkqXS9nLCBmdW5jdGlvbiAoYykge1xuICBcdFx0cmV0dXJuICclJyArIGMuY2hhckNvZGVBdCgwKS50b1N0cmluZygxNikudG9VcHBlckNhc2UoKTtcbiAgXHR9KTtcbiAgfTtcblxuICAvKlxuICBvYmplY3QtYXNzaWduXG4gIChjKSBTaW5kcmUgU29yaHVzXG4gIEBsaWNlbnNlIE1JVFxuICAqL1xuICAvKiBlc2xpbnQtZGlzYWJsZSBuby11bnVzZWQtdmFycyAqL1xuICB2YXIgZ2V0T3duUHJvcGVydHlTeW1ib2xzID0gT2JqZWN0LmdldE93blByb3BlcnR5U3ltYm9scztcbiAgdmFyIGhhc093blByb3BlcnR5ID0gT2JqZWN0LnByb3RvdHlwZS5oYXNPd25Qcm9wZXJ0eTtcbiAgdmFyIHByb3BJc0VudW1lcmFibGUgPSBPYmplY3QucHJvdG90eXBlLnByb3BlcnR5SXNFbnVtZXJhYmxlO1xuXG4gIGZ1bmN0aW9uIHRvT2JqZWN0KHZhbCkge1xuICBcdGlmICh2YWwgPT09IG51bGwgfHwgdmFsID09PSB1bmRlZmluZWQpIHtcbiAgXHRcdHRocm93IG5ldyBUeXBlRXJyb3IoJ09iamVjdC5hc3NpZ24gY2Fubm90IGJlIGNhbGxlZCB3aXRoIG51bGwgb3IgdW5kZWZpbmVkJyk7XG4gIFx0fVxuXG4gIFx0cmV0dXJuIE9iamVjdCh2YWwpO1xuICB9XG5cbiAgZnVuY3Rpb24gc2hvdWxkVXNlTmF0aXZlKCkge1xuICBcdHRyeSB7XG4gIFx0XHRpZiAoIU9iamVjdC5hc3NpZ24pIHtcbiAgXHRcdFx0cmV0dXJuIGZhbHNlO1xuICBcdFx0fVxuXG4gIFx0XHQvLyBEZXRlY3QgYnVnZ3kgcHJvcGVydHkgZW51bWVyYXRpb24gb3JkZXIgaW4gb2xkZXIgVjggdmVyc2lvbnMuXG5cbiAgXHRcdC8vIGh0dHBzOi8vYnVncy5jaHJvbWl1bS5vcmcvcC92OC9pc3N1ZXMvZGV0YWlsP2lkPTQxMThcbiAgXHRcdHZhciB0ZXN0MSA9IG5ldyBTdHJpbmcoJ2FiYycpOyAgLy8gZXNsaW50LWRpc2FibGUtbGluZSBuby1uZXctd3JhcHBlcnNcbiAgXHRcdHRlc3QxWzVdID0gJ2RlJztcbiAgXHRcdGlmIChPYmplY3QuZ2V0T3duUHJvcGVydHlOYW1lcyh0ZXN0MSlbMF0gPT09ICc1Jykge1xuICBcdFx0XHRyZXR1cm4gZmFsc2U7XG4gIFx0XHR9XG5cbiAgXHRcdC8vIGh0dHBzOi8vYnVncy5jaHJvbWl1bS5vcmcvcC92OC9pc3N1ZXMvZGV0YWlsP2lkPTMwNTZcbiAgXHRcdHZhciB0ZXN0MiA9IHt9O1xuICBcdFx0Zm9yICh2YXIgaSA9IDA7IGkgPCAxMDsgaSsrKSB7XG4gIFx0XHRcdHRlc3QyWydfJyArIFN0cmluZy5mcm9tQ2hhckNvZGUoaSldID0gaTtcbiAgXHRcdH1cbiAgXHRcdHZhciBvcmRlcjIgPSBPYmplY3QuZ2V0T3duUHJvcGVydHlOYW1lcyh0ZXN0MikubWFwKGZ1bmN0aW9uIChuKSB7XG4gIFx0XHRcdHJldHVybiB0ZXN0MltuXTtcbiAgXHRcdH0pO1xuICBcdFx0aWYgKG9yZGVyMi5qb2luKCcnKSAhPT0gJzAxMjM0NTY3ODknKSB7XG4gIFx0XHRcdHJldHVybiBmYWxzZTtcbiAgXHRcdH1cblxuICBcdFx0Ly8gaHR0cHM6Ly9idWdzLmNocm9taXVtLm9yZy9wL3Y4L2lzc3Vlcy9kZXRhaWw/aWQ9MzA1NlxuICBcdFx0dmFyIHRlc3QzID0ge307XG4gIFx0XHQnYWJjZGVmZ2hpamtsbW5vcHFyc3QnLnNwbGl0KCcnKS5mb3JFYWNoKGZ1bmN0aW9uIChsZXR0ZXIpIHtcbiAgXHRcdFx0dGVzdDNbbGV0dGVyXSA9IGxldHRlcjtcbiAgXHRcdH0pO1xuICBcdFx0aWYgKE9iamVjdC5rZXlzKE9iamVjdC5hc3NpZ24oe30sIHRlc3QzKSkuam9pbignJykgIT09XG4gIFx0XHRcdFx0J2FiY2RlZmdoaWprbG1ub3BxcnN0Jykge1xuICBcdFx0XHRyZXR1cm4gZmFsc2U7XG4gIFx0XHR9XG5cbiAgXHRcdHJldHVybiB0cnVlO1xuICBcdH0gY2F0Y2ggKGVycikge1xuICBcdFx0Ly8gV2UgZG9uJ3QgZXhwZWN0IGFueSBvZiB0aGUgYWJvdmUgdG8gdGhyb3csIGJ1dCBiZXR0ZXIgdG8gYmUgc2FmZS5cbiAgXHRcdHJldHVybiBmYWxzZTtcbiAgXHR9XG4gIH1cblxuICB2YXIgb2JqZWN0QXNzaWduID0gc2hvdWxkVXNlTmF0aXZlKCkgPyBPYmplY3QuYXNzaWduIDogZnVuY3Rpb24gKHRhcmdldCwgc291cmNlKSB7XG4gIFx0dmFyIGZyb207XG4gIFx0dmFyIHRvID0gdG9PYmplY3QodGFyZ2V0KTtcbiAgXHR2YXIgc3ltYm9scztcblxuICBcdGZvciAodmFyIHMgPSAxOyBzIDwgYXJndW1lbnRzLmxlbmd0aDsgcysrKSB7XG4gIFx0XHRmcm9tID0gT2JqZWN0KGFyZ3VtZW50c1tzXSk7XG5cbiAgXHRcdGZvciAodmFyIGtleSBpbiBmcm9tKSB7XG4gIFx0XHRcdGlmIChoYXNPd25Qcm9wZXJ0eS5jYWxsKGZyb20sIGtleSkpIHtcbiAgXHRcdFx0XHR0b1trZXldID0gZnJvbVtrZXldO1xuICBcdFx0XHR9XG4gIFx0XHR9XG5cbiAgXHRcdGlmIChnZXRPd25Qcm9wZXJ0eVN5bWJvbHMpIHtcbiAgXHRcdFx0c3ltYm9scyA9IGdldE93blByb3BlcnR5U3ltYm9scyhmcm9tKTtcbiAgXHRcdFx0Zm9yICh2YXIgaSA9IDA7IGkgPCBzeW1ib2xzLmxlbmd0aDsgaSsrKSB7XG4gIFx0XHRcdFx0aWYgKHByb3BJc0VudW1lcmFibGUuY2FsbChmcm9tLCBzeW1ib2xzW2ldKSkge1xuICBcdFx0XHRcdFx0dG9bc3ltYm9sc1tpXV0gPSBmcm9tW3N5bWJvbHNbaV1dO1xuICBcdFx0XHRcdH1cbiAgXHRcdFx0fVxuICBcdFx0fVxuICBcdH1cblxuICBcdHJldHVybiB0bztcbiAgfTtcblxuICB2YXIgdG9rZW4gPSAnJVthLWYwLTldezJ9JztcbiAgdmFyIHNpbmdsZU1hdGNoZXIgPSBuZXcgUmVnRXhwKHRva2VuLCAnZ2knKTtcbiAgdmFyIG11bHRpTWF0Y2hlciA9IG5ldyBSZWdFeHAoJygnICsgdG9rZW4gKyAnKSsnLCAnZ2knKTtcblxuICBmdW5jdGlvbiBkZWNvZGVDb21wb25lbnRzKGNvbXBvbmVudHMsIHNwbGl0KSB7XG4gIFx0dHJ5IHtcbiAgXHRcdC8vIFRyeSB0byBkZWNvZGUgdGhlIGVudGlyZSBzdHJpbmcgZmlyc3RcbiAgXHRcdHJldHVybiBkZWNvZGVVUklDb21wb25lbnQoY29tcG9uZW50cy5qb2luKCcnKSk7XG4gIFx0fSBjYXRjaCAoZXJyKSB7XG4gIFx0XHQvLyBEbyBub3RoaW5nXG4gIFx0fVxuXG4gIFx0aWYgKGNvbXBvbmVudHMubGVuZ3RoID09PSAxKSB7XG4gIFx0XHRyZXR1cm4gY29tcG9uZW50cztcbiAgXHR9XG5cbiAgXHRzcGxpdCA9IHNwbGl0IHx8IDE7XG5cbiAgXHQvLyBTcGxpdCB0aGUgYXJyYXkgaW4gMiBwYXJ0c1xuICBcdHZhciBsZWZ0ID0gY29tcG9uZW50cy5zbGljZSgwLCBzcGxpdCk7XG4gIFx0dmFyIHJpZ2h0ID0gY29tcG9uZW50cy5zbGljZShzcGxpdCk7XG5cbiAgXHRyZXR1cm4gQXJyYXkucHJvdG90eXBlLmNvbmNhdC5jYWxsKFtdLCBkZWNvZGVDb21wb25lbnRzKGxlZnQpLCBkZWNvZGVDb21wb25lbnRzKHJpZ2h0KSk7XG4gIH1cblxuICBmdW5jdGlvbiBkZWNvZGUoaW5wdXQpIHtcbiAgXHR0cnkge1xuICBcdFx0cmV0dXJuIGRlY29kZVVSSUNvbXBvbmVudChpbnB1dCk7XG4gIFx0fSBjYXRjaCAoZXJyKSB7XG4gIFx0XHR2YXIgdG9rZW5zID0gaW5wdXQubWF0Y2goc2luZ2xlTWF0Y2hlcik7XG5cbiAgXHRcdGZvciAodmFyIGkgPSAxOyBpIDwgdG9rZW5zLmxlbmd0aDsgaSsrKSB7XG4gIFx0XHRcdGlucHV0ID0gZGVjb2RlQ29tcG9uZW50cyh0b2tlbnMsIGkpLmpvaW4oJycpO1xuXG4gIFx0XHRcdHRva2VucyA9IGlucHV0Lm1hdGNoKHNpbmdsZU1hdGNoZXIpO1xuICBcdFx0fVxuXG4gIFx0XHRyZXR1cm4gaW5wdXQ7XG4gIFx0fVxuICB9XG5cbiAgZnVuY3Rpb24gY3VzdG9tRGVjb2RlVVJJQ29tcG9uZW50KGlucHV0KSB7XG4gIFx0Ly8gS2VlcCB0cmFjayBvZiBhbGwgdGhlIHJlcGxhY2VtZW50cyBhbmQgcHJlZmlsbCB0aGUgbWFwIHdpdGggdGhlIGBCT01gXG4gIFx0dmFyIHJlcGxhY2VNYXAgPSB7XG4gIFx0XHQnJUZFJUZGJzogJ1xcdUZGRkRcXHVGRkZEJyxcbiAgXHRcdCclRkYlRkUnOiAnXFx1RkZGRFxcdUZGRkQnXG4gIFx0fTtcblxuICBcdHZhciBtYXRjaCA9IG11bHRpTWF0Y2hlci5leGVjKGlucHV0KTtcbiAgXHR3aGlsZSAobWF0Y2gpIHtcbiAgXHRcdHRyeSB7XG4gIFx0XHRcdC8vIERlY29kZSBhcyBiaWcgY2h1bmtzIGFzIHBvc3NpYmxlXG4gIFx0XHRcdHJlcGxhY2VNYXBbbWF0Y2hbMF1dID0gZGVjb2RlVVJJQ29tcG9uZW50KG1hdGNoWzBdKTtcbiAgXHRcdH0gY2F0Y2ggKGVycikge1xuICBcdFx0XHR2YXIgcmVzdWx0ID0gZGVjb2RlKG1hdGNoWzBdKTtcblxuICBcdFx0XHRpZiAocmVzdWx0ICE9PSBtYXRjaFswXSkge1xuICBcdFx0XHRcdHJlcGxhY2VNYXBbbWF0Y2hbMF1dID0gcmVzdWx0O1xuICBcdFx0XHR9XG4gIFx0XHR9XG5cbiAgXHRcdG1hdGNoID0gbXVsdGlNYXRjaGVyLmV4ZWMoaW5wdXQpO1xuICBcdH1cblxuICBcdC8vIEFkZCBgJUMyYCBhdCB0aGUgZW5kIG9mIHRoZSBtYXAgdG8gbWFrZSBzdXJlIGl0IGRvZXMgbm90IHJlcGxhY2UgdGhlIGNvbWJpbmF0b3IgYmVmb3JlIGV2ZXJ5dGhpbmcgZWxzZVxuICBcdHJlcGxhY2VNYXBbJyVDMiddID0gJ1xcdUZGRkQnO1xuXG4gIFx0dmFyIGVudHJpZXMgPSBPYmplY3Qua2V5cyhyZXBsYWNlTWFwKTtcblxuICBcdGZvciAodmFyIGkgPSAwOyBpIDwgZW50cmllcy5sZW5ndGg7IGkrKykge1xuICBcdFx0Ly8gUmVwbGFjZSBhbGwgZGVjb2RlZCBjb21wb25lbnRzXG4gIFx0XHR2YXIga2V5ID0gZW50cmllc1tpXTtcbiAgXHRcdGlucHV0ID0gaW5wdXQucmVwbGFjZShuZXcgUmVnRXhwKGtleSwgJ2cnKSwgcmVwbGFjZU1hcFtrZXldKTtcbiAgXHR9XG5cbiAgXHRyZXR1cm4gaW5wdXQ7XG4gIH1cblxuICB2YXIgZGVjb2RlVXJpQ29tcG9uZW50ID0gZnVuY3Rpb24gKGVuY29kZWRVUkkpIHtcbiAgXHRpZiAodHlwZW9mIGVuY29kZWRVUkkgIT09ICdzdHJpbmcnKSB7XG4gIFx0XHR0aHJvdyBuZXcgVHlwZUVycm9yKCdFeHBlY3RlZCBgZW5jb2RlZFVSSWAgdG8gYmUgb2YgdHlwZSBgc3RyaW5nYCwgZ290IGAnICsgdHlwZW9mIGVuY29kZWRVUkkgKyAnYCcpO1xuICBcdH1cblxuICBcdHRyeSB7XG4gIFx0XHRlbmNvZGVkVVJJID0gZW5jb2RlZFVSSS5yZXBsYWNlKC9cXCsvZywgJyAnKTtcblxuICBcdFx0Ly8gVHJ5IHRoZSBidWlsdCBpbiBkZWNvZGVyIGZpcnN0XG4gIFx0XHRyZXR1cm4gZGVjb2RlVVJJQ29tcG9uZW50KGVuY29kZWRVUkkpO1xuICBcdH0gY2F0Y2ggKGVycikge1xuICBcdFx0Ly8gRmFsbGJhY2sgdG8gYSBtb3JlIGFkdmFuY2VkIGRlY29kZXJcbiAgXHRcdHJldHVybiBjdXN0b21EZWNvZGVVUklDb21wb25lbnQoZW5jb2RlZFVSSSk7XG4gIFx0fVxuICB9O1xuXG4gIGZ1bmN0aW9uIGVuY29kZXJGb3JBcnJheUZvcm1hdChvcHRzKSB7XG4gIFx0c3dpdGNoIChvcHRzLmFycmF5Rm9ybWF0KSB7XG4gIFx0XHRjYXNlICdpbmRleCc6XG4gIFx0XHRcdHJldHVybiBmdW5jdGlvbiAoa2V5LCB2YWx1ZSwgaW5kZXgpIHtcbiAgXHRcdFx0XHRyZXR1cm4gdmFsdWUgPT09IG51bGwgPyBbXG4gIFx0XHRcdFx0XHRlbmNvZGUoa2V5LCBvcHRzKSxcbiAgXHRcdFx0XHRcdCdbJyxcbiAgXHRcdFx0XHRcdGluZGV4LFxuICBcdFx0XHRcdFx0J10nXG4gIFx0XHRcdFx0XS5qb2luKCcnKSA6IFtcbiAgXHRcdFx0XHRcdGVuY29kZShrZXksIG9wdHMpLFxuICBcdFx0XHRcdFx0J1snLFxuICBcdFx0XHRcdFx0ZW5jb2RlKGluZGV4LCBvcHRzKSxcbiAgXHRcdFx0XHRcdCddPScsXG4gIFx0XHRcdFx0XHRlbmNvZGUodmFsdWUsIG9wdHMpXG4gIFx0XHRcdFx0XS5qb2luKCcnKTtcbiAgXHRcdFx0fTtcblxuICBcdFx0Y2FzZSAnYnJhY2tldCc6XG4gIFx0XHRcdHJldHVybiBmdW5jdGlvbiAoa2V5LCB2YWx1ZSkge1xuICBcdFx0XHRcdHJldHVybiB2YWx1ZSA9PT0gbnVsbCA/IGVuY29kZShrZXksIG9wdHMpIDogW1xuICBcdFx0XHRcdFx0ZW5jb2RlKGtleSwgb3B0cyksXG4gIFx0XHRcdFx0XHQnW109JyxcbiAgXHRcdFx0XHRcdGVuY29kZSh2YWx1ZSwgb3B0cylcbiAgXHRcdFx0XHRdLmpvaW4oJycpO1xuICBcdFx0XHR9O1xuXG4gIFx0XHRkZWZhdWx0OlxuICBcdFx0XHRyZXR1cm4gZnVuY3Rpb24gKGtleSwgdmFsdWUpIHtcbiAgXHRcdFx0XHRyZXR1cm4gdmFsdWUgPT09IG51bGwgPyBlbmNvZGUoa2V5LCBvcHRzKSA6IFtcbiAgXHRcdFx0XHRcdGVuY29kZShrZXksIG9wdHMpLFxuICBcdFx0XHRcdFx0Jz0nLFxuICBcdFx0XHRcdFx0ZW5jb2RlKHZhbHVlLCBvcHRzKVxuICBcdFx0XHRcdF0uam9pbignJyk7XG4gIFx0XHRcdH07XG4gIFx0fVxuICB9XG5cbiAgZnVuY3Rpb24gcGFyc2VyRm9yQXJyYXlGb3JtYXQob3B0cykge1xuICBcdHZhciByZXN1bHQ7XG5cbiAgXHRzd2l0Y2ggKG9wdHMuYXJyYXlGb3JtYXQpIHtcbiAgXHRcdGNhc2UgJ2luZGV4JzpcbiAgXHRcdFx0cmV0dXJuIGZ1bmN0aW9uIChrZXksIHZhbHVlLCBhY2N1bXVsYXRvcikge1xuICBcdFx0XHRcdHJlc3VsdCA9IC9cXFsoXFxkKilcXF0kLy5leGVjKGtleSk7XG5cbiAgXHRcdFx0XHRrZXkgPSBrZXkucmVwbGFjZSgvXFxbXFxkKlxcXSQvLCAnJyk7XG5cbiAgXHRcdFx0XHRpZiAoIXJlc3VsdCkge1xuICBcdFx0XHRcdFx0YWNjdW11bGF0b3Jba2V5XSA9IHZhbHVlO1xuICBcdFx0XHRcdFx0cmV0dXJuO1xuICBcdFx0XHRcdH1cblxuICBcdFx0XHRcdGlmIChhY2N1bXVsYXRvcltrZXldID09PSB1bmRlZmluZWQpIHtcbiAgXHRcdFx0XHRcdGFjY3VtdWxhdG9yW2tleV0gPSB7fTtcbiAgXHRcdFx0XHR9XG5cbiAgXHRcdFx0XHRhY2N1bXVsYXRvcltrZXldW3Jlc3VsdFsxXV0gPSB2YWx1ZTtcbiAgXHRcdFx0fTtcblxuICBcdFx0Y2FzZSAnYnJhY2tldCc6XG4gIFx0XHRcdHJldHVybiBmdW5jdGlvbiAoa2V5LCB2YWx1ZSwgYWNjdW11bGF0b3IpIHtcbiAgXHRcdFx0XHRyZXN1bHQgPSAvKFxcW1xcXSkkLy5leGVjKGtleSk7XG4gIFx0XHRcdFx0a2V5ID0ga2V5LnJlcGxhY2UoL1xcW1xcXSQvLCAnJyk7XG5cbiAgXHRcdFx0XHRpZiAoIXJlc3VsdCkge1xuICBcdFx0XHRcdFx0YWNjdW11bGF0b3Jba2V5XSA9IHZhbHVlO1xuICBcdFx0XHRcdFx0cmV0dXJuO1xuICBcdFx0XHRcdH0gZWxzZSBpZiAoYWNjdW11bGF0b3Jba2V5XSA9PT0gdW5kZWZpbmVkKSB7XG4gIFx0XHRcdFx0XHRhY2N1bXVsYXRvcltrZXldID0gW3ZhbHVlXTtcbiAgXHRcdFx0XHRcdHJldHVybjtcbiAgXHRcdFx0XHR9XG5cbiAgXHRcdFx0XHRhY2N1bXVsYXRvcltrZXldID0gW10uY29uY2F0KGFjY3VtdWxhdG9yW2tleV0sIHZhbHVlKTtcbiAgXHRcdFx0fTtcblxuICBcdFx0ZGVmYXVsdDpcbiAgXHRcdFx0cmV0dXJuIGZ1bmN0aW9uIChrZXksIHZhbHVlLCBhY2N1bXVsYXRvcikge1xuICBcdFx0XHRcdGlmIChhY2N1bXVsYXRvcltrZXldID09PSB1bmRlZmluZWQpIHtcbiAgXHRcdFx0XHRcdGFjY3VtdWxhdG9yW2tleV0gPSB2YWx1ZTtcbiAgXHRcdFx0XHRcdHJldHVybjtcbiAgXHRcdFx0XHR9XG5cbiAgXHRcdFx0XHRhY2N1bXVsYXRvcltrZXldID0gW10uY29uY2F0KGFjY3VtdWxhdG9yW2tleV0sIHZhbHVlKTtcbiAgXHRcdFx0fTtcbiAgXHR9XG4gIH1cblxuICBmdW5jdGlvbiBlbmNvZGUodmFsdWUsIG9wdHMpIHtcbiAgXHRpZiAob3B0cy5lbmNvZGUpIHtcbiAgXHRcdHJldHVybiBvcHRzLnN0cmljdCA/IHN0cmljdFVyaUVuY29kZSh2YWx1ZSkgOiBlbmNvZGVVUklDb21wb25lbnQodmFsdWUpO1xuICBcdH1cblxuICBcdHJldHVybiB2YWx1ZTtcbiAgfVxuXG4gIGZ1bmN0aW9uIGtleXNTb3J0ZXIoaW5wdXQpIHtcbiAgXHRpZiAoQXJyYXkuaXNBcnJheShpbnB1dCkpIHtcbiAgXHRcdHJldHVybiBpbnB1dC5zb3J0KCk7XG4gIFx0fSBlbHNlIGlmICh0eXBlb2YgaW5wdXQgPT09ICdvYmplY3QnKSB7XG4gIFx0XHRyZXR1cm4ga2V5c1NvcnRlcihPYmplY3Qua2V5cyhpbnB1dCkpLnNvcnQoZnVuY3Rpb24gKGEsIGIpIHtcbiAgXHRcdFx0cmV0dXJuIE51bWJlcihhKSAtIE51bWJlcihiKTtcbiAgXHRcdH0pLm1hcChmdW5jdGlvbiAoa2V5KSB7XG4gIFx0XHRcdHJldHVybiBpbnB1dFtrZXldO1xuICBcdFx0fSk7XG4gIFx0fVxuXG4gIFx0cmV0dXJuIGlucHV0O1xuICB9XG5cbiAgZnVuY3Rpb24gZXh0cmFjdChzdHIpIHtcbiAgXHR2YXIgcXVlcnlTdGFydCA9IHN0ci5pbmRleE9mKCc/Jyk7XG4gIFx0aWYgKHF1ZXJ5U3RhcnQgPT09IC0xKSB7XG4gIFx0XHRyZXR1cm4gJyc7XG4gIFx0fVxuICBcdHJldHVybiBzdHIuc2xpY2UocXVlcnlTdGFydCArIDEpO1xuICB9XG5cbiAgZnVuY3Rpb24gcGFyc2Uoc3RyLCBvcHRzKSB7XG4gIFx0b3B0cyA9IG9iamVjdEFzc2lnbih7YXJyYXlGb3JtYXQ6ICdub25lJ30sIG9wdHMpO1xuXG4gIFx0dmFyIGZvcm1hdHRlciA9IHBhcnNlckZvckFycmF5Rm9ybWF0KG9wdHMpO1xuXG4gIFx0Ly8gQ3JlYXRlIGFuIG9iamVjdCB3aXRoIG5vIHByb3RvdHlwZVxuICBcdC8vIGh0dHBzOi8vZ2l0aHViLmNvbS9zaW5kcmVzb3JodXMvcXVlcnktc3RyaW5nL2lzc3Vlcy80N1xuICBcdHZhciByZXQgPSBPYmplY3QuY3JlYXRlKG51bGwpO1xuXG4gIFx0aWYgKHR5cGVvZiBzdHIgIT09ICdzdHJpbmcnKSB7XG4gIFx0XHRyZXR1cm4gcmV0O1xuICBcdH1cblxuICBcdHN0ciA9IHN0ci50cmltKCkucmVwbGFjZSgvXls/IyZdLywgJycpO1xuXG4gIFx0aWYgKCFzdHIpIHtcbiAgXHRcdHJldHVybiByZXQ7XG4gIFx0fVxuXG4gIFx0c3RyLnNwbGl0KCcmJykuZm9yRWFjaChmdW5jdGlvbiAocGFyYW0pIHtcbiAgXHRcdHZhciBwYXJ0cyA9IHBhcmFtLnJlcGxhY2UoL1xcKy9nLCAnICcpLnNwbGl0KCc9Jyk7XG4gIFx0XHQvLyBGaXJlZm94IChwcmUgNDApIGRlY29kZXMgYCUzRGAgdG8gYD1gXG4gIFx0XHQvLyBodHRwczovL2dpdGh1Yi5jb20vc2luZHJlc29yaHVzL3F1ZXJ5LXN0cmluZy9wdWxsLzM3XG4gIFx0XHR2YXIga2V5ID0gcGFydHMuc2hpZnQoKTtcbiAgXHRcdHZhciB2YWwgPSBwYXJ0cy5sZW5ndGggPiAwID8gcGFydHMuam9pbignPScpIDogdW5kZWZpbmVkO1xuXG4gIFx0XHQvLyBtaXNzaW5nIGA9YCBzaG91bGQgYmUgYG51bGxgOlxuICBcdFx0Ly8gaHR0cDovL3czLm9yZy9UUi8yMDEyL1dELXVybC0yMDEyMDUyNC8jY29sbGVjdC11cmwtcGFyYW1ldGVyc1xuICBcdFx0dmFsID0gdmFsID09PSB1bmRlZmluZWQgPyBudWxsIDogZGVjb2RlVXJpQ29tcG9uZW50KHZhbCk7XG5cbiAgXHRcdGZvcm1hdHRlcihkZWNvZGVVcmlDb21wb25lbnQoa2V5KSwgdmFsLCByZXQpO1xuICBcdH0pO1xuXG4gIFx0cmV0dXJuIE9iamVjdC5rZXlzKHJldCkuc29ydCgpLnJlZHVjZShmdW5jdGlvbiAocmVzdWx0LCBrZXkpIHtcbiAgXHRcdHZhciB2YWwgPSByZXRba2V5XTtcbiAgXHRcdGlmIChCb29sZWFuKHZhbCkgJiYgdHlwZW9mIHZhbCA9PT0gJ29iamVjdCcgJiYgIUFycmF5LmlzQXJyYXkodmFsKSkge1xuICBcdFx0XHQvLyBTb3J0IG9iamVjdCBrZXlzLCBub3QgdmFsdWVzXG4gIFx0XHRcdHJlc3VsdFtrZXldID0ga2V5c1NvcnRlcih2YWwpO1xuICBcdFx0fSBlbHNlIHtcbiAgXHRcdFx0cmVzdWx0W2tleV0gPSB2YWw7XG4gIFx0XHR9XG5cbiAgXHRcdHJldHVybiByZXN1bHQ7XG4gIFx0fSwgT2JqZWN0LmNyZWF0ZShudWxsKSk7XG4gIH1cblxuICB2YXIgZXh0cmFjdF8xID0gZXh0cmFjdDtcbiAgdmFyIHBhcnNlXzEgPSBwYXJzZTtcblxuICB2YXIgc3RyaW5naWZ5ID0gZnVuY3Rpb24gKG9iaiwgb3B0cykge1xuICBcdHZhciBkZWZhdWx0cyA9IHtcbiAgXHRcdGVuY29kZTogdHJ1ZSxcbiAgXHRcdHN0cmljdDogdHJ1ZSxcbiAgXHRcdGFycmF5Rm9ybWF0OiAnbm9uZSdcbiAgXHR9O1xuXG4gIFx0b3B0cyA9IG9iamVjdEFzc2lnbihkZWZhdWx0cywgb3B0cyk7XG5cbiAgXHRpZiAob3B0cy5zb3J0ID09PSBmYWxzZSkge1xuICBcdFx0b3B0cy5zb3J0ID0gZnVuY3Rpb24gKCkge307XG4gIFx0fVxuXG4gIFx0dmFyIGZvcm1hdHRlciA9IGVuY29kZXJGb3JBcnJheUZvcm1hdChvcHRzKTtcblxuICBcdHJldHVybiBvYmogPyBPYmplY3Qua2V5cyhvYmopLnNvcnQob3B0cy5zb3J0KS5tYXAoZnVuY3Rpb24gKGtleSkge1xuICBcdFx0dmFyIHZhbCA9IG9ialtrZXldO1xuXG4gIFx0XHRpZiAodmFsID09PSB1bmRlZmluZWQpIHtcbiAgXHRcdFx0cmV0dXJuICcnO1xuICBcdFx0fVxuXG4gIFx0XHRpZiAodmFsID09PSBudWxsKSB7XG4gIFx0XHRcdHJldHVybiBlbmNvZGUoa2V5LCBvcHRzKTtcbiAgXHRcdH1cblxuICBcdFx0aWYgKEFycmF5LmlzQXJyYXkodmFsKSkge1xuICBcdFx0XHR2YXIgcmVzdWx0ID0gW107XG5cbiAgXHRcdFx0dmFsLnNsaWNlKCkuZm9yRWFjaChmdW5jdGlvbiAodmFsMikge1xuICBcdFx0XHRcdGlmICh2YWwyID09PSB1bmRlZmluZWQpIHtcbiAgXHRcdFx0XHRcdHJldHVybjtcbiAgXHRcdFx0XHR9XG5cbiAgXHRcdFx0XHRyZXN1bHQucHVzaChmb3JtYXR0ZXIoa2V5LCB2YWwyLCByZXN1bHQubGVuZ3RoKSk7XG4gIFx0XHRcdH0pO1xuXG4gIFx0XHRcdHJldHVybiByZXN1bHQuam9pbignJicpO1xuICBcdFx0fVxuXG4gIFx0XHRyZXR1cm4gZW5jb2RlKGtleSwgb3B0cykgKyAnPScgKyBlbmNvZGUodmFsLCBvcHRzKTtcbiAgXHR9KS5maWx0ZXIoZnVuY3Rpb24gKHgpIHtcbiAgXHRcdHJldHVybiB4Lmxlbmd0aCA+IDA7XG4gIFx0fSkuam9pbignJicpIDogJyc7XG4gIH07XG5cbiAgdmFyIHBhcnNlVXJsID0gZnVuY3Rpb24gKHN0ciwgb3B0cykge1xuICBcdHJldHVybiB7XG4gIFx0XHR1cmw6IHN0ci5zcGxpdCgnPycpWzBdIHx8ICcnLFxuICBcdFx0cXVlcnk6IHBhcnNlKGV4dHJhY3Qoc3RyKSwgb3B0cylcbiAgXHR9O1xuICB9O1xuXG4gIHZhciBxdWVyeVN0cmluZyA9IHtcbiAgXHRleHRyYWN0OiBleHRyYWN0XzEsXG4gIFx0cGFyc2U6IHBhcnNlXzEsXG4gIFx0c3RyaW5naWZ5OiBzdHJpbmdpZnksXG4gIFx0cGFyc2VVcmw6IHBhcnNlVXJsXG4gIH07XG5cbiAgLypcbiAgICogU2ltcGxlIEFKQVggcmVxdWVzdCBvYmplY3RcbiAgICovXG5cbiAgdmFyIFJlcXVlc3QgPSBmdW5jdGlvbiBSZXF1ZXN0KHVybCwgZGF0YSkge1xuICAgIHRoaXMudXJsID0gdXJsO1xuICAgIHRoaXMuZGF0YSA9IGRhdGEgfHwge307XG4gIH07XG5cbiAgUmVxdWVzdC5wcm90b3R5cGUuc2VuZCA9IGZ1bmN0aW9uIChjYWxsYmFjaykge1xuICAgIHZhciBpc0lFID0gd2luZG93LlhEb21haW5SZXF1ZXN0ID8gdHJ1ZSA6IGZhbHNlO1xuXG4gICAgaWYgKGlzSUUpIHtcbiAgICAgIHZhciB4ZHIgPSBuZXcgd2luZG93LlhEb21haW5SZXF1ZXN0KCk7XG4gICAgICB4ZHIub3BlbignUE9TVCcsIHRoaXMudXJsLCB0cnVlKTtcblxuICAgICAgeGRyLm9ubG9hZCA9IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgY2FsbGJhY2soMjAwLCB4ZHIucmVzcG9uc2VUZXh0KTtcbiAgICAgIH07XG5cbiAgICAgIHhkci5vbmVycm9yID0gZnVuY3Rpb24gKCkge1xuICAgICAgICAvLyBzdGF0dXMgY29kZSBub3QgYXZhaWxhYmxlIGZyb20geGRyLCB0cnkgc3RyaW5nIG1hdGNoaW5nIG9uIHJlc3BvbnNlVGV4dFxuICAgICAgICBpZiAoeGRyLnJlc3BvbnNlVGV4dCA9PT0gJ1JlcXVlc3QgRW50aXR5IFRvbyBMYXJnZScpIHtcbiAgICAgICAgICBjYWxsYmFjayg0MTMsIHhkci5yZXNwb25zZVRleHQpO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgIGNhbGxiYWNrKDUwMCwgeGRyLnJlc3BvbnNlVGV4dCk7XG4gICAgICAgIH1cbiAgICAgIH07XG5cbiAgICAgIHhkci5vbnRpbWVvdXQgPSBmdW5jdGlvbiAoKSB7fTtcblxuICAgICAgeGRyLm9ucHJvZ3Jlc3MgPSBmdW5jdGlvbiAoKSB7fTtcblxuICAgICAgeGRyLnNlbmQocXVlcnlTdHJpbmcuc3RyaW5naWZ5KHRoaXMuZGF0YSkpO1xuICAgIH0gZWxzZSB7XG4gICAgICB2YXIgeGhyID0gbmV3IFhNTEh0dHBSZXF1ZXN0KCk7XG4gICAgICB4aHIub3BlbignUE9TVCcsIHRoaXMudXJsLCB0cnVlKTtcblxuICAgICAgeGhyLm9ucmVhZHlzdGF0ZWNoYW5nZSA9IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgaWYgKHhoci5yZWFkeVN0YXRlID09PSA0KSB7XG4gICAgICAgICAgY2FsbGJhY2soeGhyLnN0YXR1cywgeGhyLnJlc3BvbnNlVGV4dCk7XG4gICAgICAgIH1cbiAgICAgIH07XG5cbiAgICAgIHhoci5zZXRSZXF1ZXN0SGVhZGVyKCdDb250ZW50LVR5cGUnLCAnYXBwbGljYXRpb24veC13d3ctZm9ybS11cmxlbmNvZGVkOyBjaGFyc2V0PVVURi04Jyk7XG4gICAgICB4aHIuc2VuZChxdWVyeVN0cmluZy5zdHJpbmdpZnkodGhpcy5kYXRhKSk7XG4gICAgfSAvL2xvZygnc2VudCByZXF1ZXN0IHRvICcgKyB0aGlzLnVybCArICcgd2l0aCBkYXRhICcgKyBkZWNvZGVVUklDb21wb25lbnQocXVlcnlTdHJpbmcodGhpcy5kYXRhKSkpO1xuXG4gIH07XG5cbiAgLypcbiAgICogV3JhcHBlciBmb3IgbG9nZ2luZyBSZXZlbnVlIGRhdGEuIFJldmVudWUgb2JqZWN0cyBnZXQgcGFzc2VkIHRvIGFtcGxpdHVkZS5sb2dSZXZlbnVlVjIgdG8gc2VuZCB0byBBbXBsaXR1ZGUgc2VydmVycy5cbiAgICogTm90ZTogcHJpY2UgaXMgdGhlIG9ubHkgcmVxdWlyZWQgZmllbGQuIElmIHF1YW50aXR5IGlzIG5vdCBzcGVjaWZpZWQsIHRoZW4gZGVmYXVsdHMgdG8gMS5cbiAgICovXG5cbiAgLyoqXG4gICAqIFJldmVudWUgQVBJIC0gaW5zdGFuY2UgY29uc3RydWN0b3IuIFJldmVudWUgb2JqZWN0cyBhcmUgYSB3cmFwcGVyIGZvciByZXZlbnVlIGRhdGEuXG4gICAqIEVhY2ggbWV0aG9kIHVwZGF0ZXMgYSByZXZlbnVlIHByb3BlcnR5IGluIHRoZSBSZXZlbnVlIG9iamVjdCwgYW5kIHJldHVybnMgdGhlIHNhbWUgUmV2ZW51ZSBvYmplY3QsXG4gICAqIGFsbG93aW5nIHlvdSB0byBjaGFpbiBtdWx0aXBsZSBtZXRob2QgY2FsbHMgdG9nZXRoZXIuXG4gICAqIE5vdGU6IHByaWNlIGlzIGEgcmVxdWlyZWQgZmllbGQgdG8gbG9nIHJldmVudWUgZXZlbnRzLlxuICAgKiBJZiBxdWFudGl0eSBpcyBub3Qgc3BlY2lmaWVkIHRoZW4gZGVmYXVsdHMgdG8gMS5cbiAgICogU2VlIFtSZWFkbWVde0BsaW5rIGh0dHBzOi8vZ2l0aHViLmNvbS9hbXBsaXR1ZGUvQW1wbGl0dWRlLUphdmFzY3JpcHQjdHJhY2tpbmctcmV2ZW51ZX0gZm9yIG1vcmUgaW5mb3JtYXRpb25cbiAgICogYWJvdXQgbG9nZ2luZyBSZXZlbnVlLlxuICAgKiBAY29uc3RydWN0b3IgUmV2ZW51ZVxuICAgKiBAcHVibGljXG4gICAqIEBleGFtcGxlIHZhciByZXZlbnVlID0gbmV3IGFtcGxpdHVkZS5SZXZlbnVlKCk7XG4gICAqL1xuXG4gIHZhciBSZXZlbnVlID0gZnVuY3Rpb24gUmV2ZW51ZSgpIHtcbiAgICAvLyByZXF1aXJlZCBmaWVsZHNcbiAgICB0aGlzLl9wcmljZSA9IG51bGw7IC8vIG9wdGlvbmFsIGZpZWxkc1xuXG4gICAgdGhpcy5fcHJvZHVjdElkID0gbnVsbDtcbiAgICB0aGlzLl9xdWFudGl0eSA9IDE7XG4gICAgdGhpcy5fcmV2ZW51ZVR5cGUgPSBudWxsO1xuICAgIHRoaXMuX3Byb3BlcnRpZXMgPSBudWxsO1xuICB9O1xuICAvKipcbiAgICogU2V0IGEgdmFsdWUgZm9yIHRoZSBwcm9kdWN0IGlkZW50aWZlci5cbiAgICogQHB1YmxpY1xuICAgKiBAcGFyYW0ge3N0cmluZ30gcHJvZHVjdElkIC0gVGhlIHZhbHVlIGZvciB0aGUgcHJvZHVjdCBpZGVudGlmaWVyLiBFbXB0eSBhbmQgaW52YWxpZCBzdHJpbmdzIGFyZSBpZ25vcmVkLlxuICAgKiBAcmV0dXJuIHtSZXZlbnVlfSBSZXR1cm5zIHRoZSBzYW1lIFJldmVudWUgb2JqZWN0LCBhbGxvd2luZyB5b3UgdG8gY2hhaW4gbXVsdGlwbGUgbWV0aG9kIGNhbGxzIHRvZ2V0aGVyLlxuICAgKiBAZXhhbXBsZSB2YXIgcmV2ZW51ZSA9IG5ldyBhbXBsaXR1ZGUuUmV2ZW51ZSgpLnNldFByb2R1Y3RJZCgncHJvZHVjdElkZW50aWZpZXInKS5zZXRQcmljZSgxMC45OSk7XG4gICAqIGFtcGxpdHVkZS5sb2dSZXZlbnVlVjIocmV2ZW51ZSk7XG4gICAqL1xuXG5cbiAgUmV2ZW51ZS5wcm90b3R5cGUuc2V0UHJvZHVjdElkID0gZnVuY3Rpb24gc2V0UHJvZHVjdElkKHByb2R1Y3RJZCkge1xuICAgIGlmICh0eXBlKHByb2R1Y3RJZCkgIT09ICdzdHJpbmcnKSB7XG4gICAgICB1dGlscy5sb2cuZXJyb3IoJ1Vuc3VwcG9ydGVkIHR5cGUgZm9yIHByb2R1Y3RJZDogJyArIHR5cGUocHJvZHVjdElkKSArICcsIGV4cGVjdGluZyBzdHJpbmcnKTtcbiAgICB9IGVsc2UgaWYgKHV0aWxzLmlzRW1wdHlTdHJpbmcocHJvZHVjdElkKSkge1xuICAgICAgdXRpbHMubG9nLmVycm9yKCdJbnZhbGlkIGVtcHR5IHByb2R1Y3RJZCcpO1xuICAgIH0gZWxzZSB7XG4gICAgICB0aGlzLl9wcm9kdWN0SWQgPSBwcm9kdWN0SWQ7XG4gICAgfVxuXG4gICAgcmV0dXJuIHRoaXM7XG4gIH07XG4gIC8qKlxuICAgKiBTZXQgYSB2YWx1ZSBmb3IgdGhlIHF1YW50aXR5LiBOb3RlIHJldmVudWUgYW1vdW50IGlzIGNhbGN1bGF0ZWQgYXMgcHJpY2UgKiBxdWFudGl0eS5cbiAgICogQHB1YmxpY1xuICAgKiBAcGFyYW0ge251bWJlcn0gcXVhbnRpdHkgLSBJbnRlZ2VyIHZhbHVlIGZvciB0aGUgcXVhbnRpdHkuIElmIG5vdCBzZXQsIHF1YW50aXR5IGRlZmF1bHRzIHRvIDEuXG4gICAqIEByZXR1cm4ge1JldmVudWV9IFJldHVybnMgdGhlIHNhbWUgUmV2ZW51ZSBvYmplY3QsIGFsbG93aW5nIHlvdSB0byBjaGFpbiBtdWx0aXBsZSBtZXRob2QgY2FsbHMgdG9nZXRoZXIuXG4gICAqIEBleGFtcGxlIHZhciByZXZlbnVlID0gbmV3IGFtcGxpdHVkZS5SZXZlbnVlKCkuc2V0UHJvZHVjdElkKCdwcm9kdWN0SWRlbnRpZmllcicpLnNldFByaWNlKDEwLjk5KS5zZXRRdWFudGl0eSg1KTtcbiAgICogYW1wbGl0dWRlLmxvZ1JldmVudWVWMihyZXZlbnVlKTtcbiAgICovXG5cblxuICBSZXZlbnVlLnByb3RvdHlwZS5zZXRRdWFudGl0eSA9IGZ1bmN0aW9uIHNldFF1YW50aXR5KHF1YW50aXR5KSB7XG4gICAgaWYgKHR5cGUocXVhbnRpdHkpICE9PSAnbnVtYmVyJykge1xuICAgICAgdXRpbHMubG9nLmVycm9yKCdVbnN1cHBvcnRlZCB0eXBlIGZvciBxdWFudGl0eTogJyArIHR5cGUocXVhbnRpdHkpICsgJywgZXhwZWN0aW5nIG51bWJlcicpO1xuICAgIH0gZWxzZSB7XG4gICAgICB0aGlzLl9xdWFudGl0eSA9IHBhcnNlSW50KHF1YW50aXR5KTtcbiAgICB9XG5cbiAgICByZXR1cm4gdGhpcztcbiAgfTtcbiAgLyoqXG4gICAqIFNldCBhIHZhbHVlIGZvciB0aGUgcHJpY2UuIFRoaXMgZmllbGQgaXMgcmVxdWlyZWQgZm9yIGFsbCByZXZlbnVlIGJlaW5nIGxvZ2dlZC5cbiAgICogTm90ZSByZXZlbnVlIGFtb3VudCBpcyBjYWxjdWxhdGVkIGFzIHByaWNlICogcXVhbnRpdHkuXG4gICAqIEBwdWJsaWNcbiAgICogQHBhcmFtIHtudW1iZXJ9IHByaWNlIC0gRG91YmxlIHZhbHVlIGZvciB0aGUgcXVhbnRpdHkuXG4gICAqIEByZXR1cm4ge1JldmVudWV9IFJldHVybnMgdGhlIHNhbWUgUmV2ZW51ZSBvYmplY3QsIGFsbG93aW5nIHlvdSB0byBjaGFpbiBtdWx0aXBsZSBtZXRob2QgY2FsbHMgdG9nZXRoZXIuXG4gICAqIEBleGFtcGxlIHZhciByZXZlbnVlID0gbmV3IGFtcGxpdHVkZS5SZXZlbnVlKCkuc2V0UHJvZHVjdElkKCdwcm9kdWN0SWRlbnRpZmllcicpLnNldFByaWNlKDEwLjk5KTtcbiAgICogYW1wbGl0dWRlLmxvZ1JldmVudWVWMihyZXZlbnVlKTtcbiAgICovXG5cblxuICBSZXZlbnVlLnByb3RvdHlwZS5zZXRQcmljZSA9IGZ1bmN0aW9uIHNldFByaWNlKHByaWNlKSB7XG4gICAgaWYgKHR5cGUocHJpY2UpICE9PSAnbnVtYmVyJykge1xuICAgICAgdXRpbHMubG9nLmVycm9yKCdVbnN1cHBvcnRlZCB0eXBlIGZvciBwcmljZTogJyArIHR5cGUocHJpY2UpICsgJywgZXhwZWN0aW5nIG51bWJlcicpO1xuICAgIH0gZWxzZSB7XG4gICAgICB0aGlzLl9wcmljZSA9IHByaWNlO1xuICAgIH1cblxuICAgIHJldHVybiB0aGlzO1xuICB9O1xuICAvKipcbiAgICogU2V0IGEgdmFsdWUgZm9yIHRoZSByZXZlbnVlVHlwZSAoZm9yIGV4YW1wbGUgcHVyY2hhc2UsIGNvc3QsIHRheCwgcmVmdW5kLCBldGMpLlxuICAgKiBAcHVibGljXG4gICAqIEBwYXJhbSB7c3RyaW5nfSByZXZlbnVlVHlwZSAtIFJldmVudWVUeXBlIHRvIGRlc2lnbmF0ZS5cbiAgICogQHJldHVybiB7UmV2ZW51ZX0gUmV0dXJucyB0aGUgc2FtZSBSZXZlbnVlIG9iamVjdCwgYWxsb3dpbmcgeW91IHRvIGNoYWluIG11bHRpcGxlIG1ldGhvZCBjYWxscyB0b2dldGhlci5cbiAgICogQGV4YW1wbGUgdmFyIHJldmVudWUgPSBuZXcgYW1wbGl0dWRlLlJldmVudWUoKS5zZXRQcm9kdWN0SWQoJ3Byb2R1Y3RJZGVudGlmaWVyJykuc2V0UHJpY2UoMTAuOTkpLnNldFJldmVudWVUeXBlKCdwdXJjaGFzZScpO1xuICAgKiBhbXBsaXR1ZGUubG9nUmV2ZW51ZVYyKHJldmVudWUpO1xuICAgKi9cblxuXG4gIFJldmVudWUucHJvdG90eXBlLnNldFJldmVudWVUeXBlID0gZnVuY3Rpb24gc2V0UmV2ZW51ZVR5cGUocmV2ZW51ZVR5cGUpIHtcbiAgICBpZiAodHlwZShyZXZlbnVlVHlwZSkgIT09ICdzdHJpbmcnKSB7XG4gICAgICB1dGlscy5sb2cuZXJyb3IoJ1Vuc3VwcG9ydGVkIHR5cGUgZm9yIHJldmVudWVUeXBlOiAnICsgdHlwZShyZXZlbnVlVHlwZSkgKyAnLCBleHBlY3Rpbmcgc3RyaW5nJyk7XG4gICAgfSBlbHNlIHtcbiAgICAgIHRoaXMuX3JldmVudWVUeXBlID0gcmV2ZW51ZVR5cGU7XG4gICAgfVxuXG4gICAgcmV0dXJuIHRoaXM7XG4gIH07XG4gIC8qKlxuICAgKiBTZXQgZXZlbnQgcHJvcGVydGllcyBmb3IgdGhlIHJldmVudWUgZXZlbnQuXG4gICAqIEBwdWJsaWNcbiAgICogQHBhcmFtIHtvYmplY3R9IGV2ZW50UHJvcGVydGllcyAtIFJldmVudWUgZXZlbnQgcHJvcGVydGllcyB0byBzZXQuXG4gICAqIEByZXR1cm4ge1JldmVudWV9IFJldHVybnMgdGhlIHNhbWUgUmV2ZW51ZSBvYmplY3QsIGFsbG93aW5nIHlvdSB0byBjaGFpbiBtdWx0aXBsZSBtZXRob2QgY2FsbHMgdG9nZXRoZXIuXG4gICAqIEBleGFtcGxlIHZhciBldmVudF9wcm9wZXJ0aWVzID0geydjaXR5JzogJ1NhbiBGcmFuY2lzY28nfTtcbiAgICogdmFyIHJldmVudWUgPSBuZXcgYW1wbGl0dWRlLlJldmVudWUoKS5zZXRQcm9kdWN0SWQoJ3Byb2R1Y3RJZGVudGlmaWVyJykuc2V0UHJpY2UoMTAuOTkpLnNldEV2ZW50UHJvcGVydGllcyhldmVudF9wcm9wZXJ0aWVzKTtcbiAgICogYW1wbGl0dWRlLmxvZ1JldmVudWVWMihyZXZlbnVlKTtcbiAgKi9cblxuXG4gIFJldmVudWUucHJvdG90eXBlLnNldEV2ZW50UHJvcGVydGllcyA9IGZ1bmN0aW9uIHNldEV2ZW50UHJvcGVydGllcyhldmVudFByb3BlcnRpZXMpIHtcbiAgICBpZiAodHlwZShldmVudFByb3BlcnRpZXMpICE9PSAnb2JqZWN0Jykge1xuICAgICAgdXRpbHMubG9nLmVycm9yKCdVbnN1cHBvcnRlZCB0eXBlIGZvciBldmVudFByb3BlcnRpZXM6ICcgKyB0eXBlKGV2ZW50UHJvcGVydGllcykgKyAnLCBleHBlY3Rpbmcgb2JqZWN0Jyk7XG4gICAgfSBlbHNlIHtcbiAgICAgIHRoaXMuX3Byb3BlcnRpZXMgPSB1dGlscy52YWxpZGF0ZVByb3BlcnRpZXMoZXZlbnRQcm9wZXJ0aWVzKTtcbiAgICB9XG5cbiAgICByZXR1cm4gdGhpcztcbiAgfTtcbiAgLyoqXG4gICAqIEBwcml2YXRlXG4gICAqL1xuXG5cbiAgUmV2ZW51ZS5wcm90b3R5cGUuX2lzVmFsaWRSZXZlbnVlID0gZnVuY3Rpb24gX2lzVmFsaWRSZXZlbnVlKCkge1xuICAgIGlmICh0eXBlKHRoaXMuX3ByaWNlKSAhPT0gJ251bWJlcicpIHtcbiAgICAgIHV0aWxzLmxvZy5lcnJvcignSW52YWxpZCByZXZlbnVlLCBuZWVkIHRvIHNldCBwcmljZSBmaWVsZCcpO1xuICAgICAgcmV0dXJuIGZhbHNlO1xuICAgIH1cblxuICAgIHJldHVybiB0cnVlO1xuICB9O1xuICAvKipcbiAgICogQHByaXZhdGVcbiAgICovXG5cblxuICBSZXZlbnVlLnByb3RvdHlwZS5fdG9KU09OT2JqZWN0ID0gZnVuY3Rpb24gX3RvSlNPTk9iamVjdCgpIHtcbiAgICB2YXIgb2JqID0gdHlwZSh0aGlzLl9wcm9wZXJ0aWVzKSA9PT0gJ29iamVjdCcgPyB0aGlzLl9wcm9wZXJ0aWVzIDoge307XG5cbiAgICBpZiAodGhpcy5fcHJvZHVjdElkICE9PSBudWxsKSB7XG4gICAgICBvYmpbQ29uc3RhbnRzLlJFVkVOVUVfUFJPRFVDVF9JRF0gPSB0aGlzLl9wcm9kdWN0SWQ7XG4gICAgfVxuXG4gICAgaWYgKHRoaXMuX3F1YW50aXR5ICE9PSBudWxsKSB7XG4gICAgICBvYmpbQ29uc3RhbnRzLlJFVkVOVUVfUVVBTlRJVFldID0gdGhpcy5fcXVhbnRpdHk7XG4gICAgfVxuXG4gICAgaWYgKHRoaXMuX3ByaWNlICE9PSBudWxsKSB7XG4gICAgICBvYmpbQ29uc3RhbnRzLlJFVkVOVUVfUFJJQ0VdID0gdGhpcy5fcHJpY2U7XG4gICAgfVxuXG4gICAgaWYgKHRoaXMuX3JldmVudWVUeXBlICE9PSBudWxsKSB7XG4gICAgICBvYmpbQ29uc3RhbnRzLlJFVkVOVUVfUkVWRU5VRV9UWVBFXSA9IHRoaXMuX3JldmVudWVUeXBlO1xuICAgIH1cblxuICAgIHJldHVybiBvYmo7XG4gIH07XG5cbiAgdmFyIHVhUGFyc2VyID0gY3JlYXRlQ29tbW9uanNNb2R1bGUoZnVuY3Rpb24gKG1vZHVsZSwgZXhwb3J0cykge1xuICAvKiFcbiAgICogVUFQYXJzZXIuanMgdjAuNy4xOVxuICAgKiBMaWdodHdlaWdodCBKYXZhU2NyaXB0LWJhc2VkIFVzZXItQWdlbnQgc3RyaW5nIHBhcnNlclxuICAgKiBodHRwczovL2dpdGh1Yi5jb20vZmFpc2FsbWFuL3VhLXBhcnNlci1qc1xuICAgKlxuICAgKiBDb3B5cmlnaHQgwqkgMjAxMi0yMDE2IEZhaXNhbCBTYWxtYW4gPGZ5emxtYW5AZ21haWwuY29tPlxuICAgKiBEdWFsIGxpY2Vuc2VkIHVuZGVyIEdQTHYyIG9yIE1JVFxuICAgKi9cblxuICAoZnVuY3Rpb24gKHdpbmRvdywgdW5kZWZpbmVkJDEpIHtcblxuICAgICAgLy8vLy8vLy8vLy8vLy9cbiAgICAgIC8vIENvbnN0YW50c1xuICAgICAgLy8vLy8vLy8vLy8vL1xuXG5cbiAgICAgIHZhciBMSUJWRVJTSU9OICA9ICcwLjcuMTknLFxuICAgICAgICAgIEVNUFRZICAgICAgID0gJycsXG4gICAgICAgICAgVU5LTk9XTiAgICAgPSAnPycsXG4gICAgICAgICAgRlVOQ19UWVBFICAgPSAnZnVuY3Rpb24nLFxuICAgICAgICAgIFVOREVGX1RZUEUgID0gJ3VuZGVmaW5lZCcsXG4gICAgICAgICAgT0JKX1RZUEUgICAgPSAnb2JqZWN0JyxcbiAgICAgICAgICBTVFJfVFlQRSAgICA9ICdzdHJpbmcnLFxuICAgICAgICAgIE1BSk9SICAgICAgID0gJ21ham9yJywgLy8gZGVwcmVjYXRlZFxuICAgICAgICAgIE1PREVMICAgICAgID0gJ21vZGVsJyxcbiAgICAgICAgICBOQU1FICAgICAgICA9ICduYW1lJyxcbiAgICAgICAgICBUWVBFICAgICAgICA9ICd0eXBlJyxcbiAgICAgICAgICBWRU5ET1IgICAgICA9ICd2ZW5kb3InLFxuICAgICAgICAgIFZFUlNJT04gICAgID0gJ3ZlcnNpb24nLFxuICAgICAgICAgIEFSQ0hJVEVDVFVSRT0gJ2FyY2hpdGVjdHVyZScsXG4gICAgICAgICAgQ09OU09MRSAgICAgPSAnY29uc29sZScsXG4gICAgICAgICAgTU9CSUxFICAgICAgPSAnbW9iaWxlJyxcbiAgICAgICAgICBUQUJMRVQgICAgICA9ICd0YWJsZXQnLFxuICAgICAgICAgIFNNQVJUVFYgICAgID0gJ3NtYXJ0dHYnLFxuICAgICAgICAgIFdFQVJBQkxFICAgID0gJ3dlYXJhYmxlJyxcbiAgICAgICAgICBFTUJFRERFRCAgICA9ICdlbWJlZGRlZCc7XG5cblxuICAgICAgLy8vLy8vLy8vLy9cbiAgICAgIC8vIEhlbHBlclxuICAgICAgLy8vLy8vLy8vL1xuXG5cbiAgICAgIHZhciB1dGlsID0ge1xuICAgICAgICAgIGV4dGVuZCA6IGZ1bmN0aW9uIChyZWdleGVzLCBleHRlbnNpb25zKSB7XG4gICAgICAgICAgICAgIHZhciBtYXJnZWRSZWdleGVzID0ge307XG4gICAgICAgICAgICAgIGZvciAodmFyIGkgaW4gcmVnZXhlcykge1xuICAgICAgICAgICAgICAgICAgaWYgKGV4dGVuc2lvbnNbaV0gJiYgZXh0ZW5zaW9uc1tpXS5sZW5ndGggJSAyID09PSAwKSB7XG4gICAgICAgICAgICAgICAgICAgICAgbWFyZ2VkUmVnZXhlc1tpXSA9IGV4dGVuc2lvbnNbaV0uY29uY2F0KHJlZ2V4ZXNbaV0pO1xuICAgICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgICBtYXJnZWRSZWdleGVzW2ldID0gcmVnZXhlc1tpXTtcbiAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICByZXR1cm4gbWFyZ2VkUmVnZXhlcztcbiAgICAgICAgICB9LFxuICAgICAgICAgIGhhcyA6IGZ1bmN0aW9uIChzdHIxLCBzdHIyKSB7XG4gICAgICAgICAgICBpZiAodHlwZW9mIHN0cjEgPT09IFwic3RyaW5nXCIpIHtcbiAgICAgICAgICAgICAgcmV0dXJuIHN0cjIudG9Mb3dlckNhc2UoKS5pbmRleE9mKHN0cjEudG9Mb3dlckNhc2UoKSkgIT09IC0xO1xuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgICAgICAgICAgfVxuICAgICAgICAgIH0sXG4gICAgICAgICAgbG93ZXJpemUgOiBmdW5jdGlvbiAoc3RyKSB7XG4gICAgICAgICAgICAgIHJldHVybiBzdHIudG9Mb3dlckNhc2UoKTtcbiAgICAgICAgICB9LFxuICAgICAgICAgIG1ham9yIDogZnVuY3Rpb24gKHZlcnNpb24pIHtcbiAgICAgICAgICAgICAgcmV0dXJuIHR5cGVvZih2ZXJzaW9uKSA9PT0gU1RSX1RZUEUgPyB2ZXJzaW9uLnJlcGxhY2UoL1teXFxkXFwuXS9nLCcnKS5zcGxpdChcIi5cIilbMF0gOiB1bmRlZmluZWQkMTtcbiAgICAgICAgICB9LFxuICAgICAgICAgIHRyaW0gOiBmdW5jdGlvbiAoc3RyKSB7XG4gICAgICAgICAgICByZXR1cm4gc3RyLnJlcGxhY2UoL15bXFxzXFx1RkVGRlxceEEwXSt8W1xcc1xcdUZFRkZcXHhBMF0rJC9nLCAnJyk7XG4gICAgICAgICAgfVxuICAgICAgfTtcblxuXG4gICAgICAvLy8vLy8vLy8vLy8vLy9cbiAgICAgIC8vIE1hcCBoZWxwZXJcbiAgICAgIC8vLy8vLy8vLy8vLy8vXG5cblxuICAgICAgdmFyIG1hcHBlciA9IHtcblxuICAgICAgICAgIHJneCA6IGZ1bmN0aW9uICh1YSwgYXJyYXlzKSB7XG5cbiAgICAgICAgICAgICAgLy92YXIgcmVzdWx0ID0ge30sXG4gICAgICAgICAgICAgIHZhciBpID0gMCwgaiwgaywgcCwgcSwgbWF0Y2hlcywgbWF0Y2g7Ly8sIGFyZ3MgPSBhcmd1bWVudHM7XG5cbiAgICAgICAgICAgICAgLyovLyBjb25zdHJ1Y3Qgb2JqZWN0IGJhcmVib25lc1xuICAgICAgICAgICAgICBmb3IgKHAgPSAwOyBwIDwgYXJnc1sxXS5sZW5ndGg7IHArKykge1xuICAgICAgICAgICAgICAgICAgcSA9IGFyZ3NbMV1bcF07XG4gICAgICAgICAgICAgICAgICByZXN1bHRbdHlwZW9mIHEgPT09IE9CSl9UWVBFID8gcVswXSA6IHFdID0gdW5kZWZpbmVkO1xuICAgICAgICAgICAgICB9Ki9cblxuICAgICAgICAgICAgICAvLyBsb29wIHRocm91Z2ggYWxsIHJlZ2V4ZXMgbWFwc1xuICAgICAgICAgICAgICB3aGlsZSAoaSA8IGFycmF5cy5sZW5ndGggJiYgIW1hdGNoZXMpIHtcblxuICAgICAgICAgICAgICAgICAgdmFyIHJlZ2V4ID0gYXJyYXlzW2ldLCAgICAgICAvLyBldmVuIHNlcXVlbmNlICgwLDIsNCwuLilcbiAgICAgICAgICAgICAgICAgICAgICBwcm9wcyA9IGFycmF5c1tpICsgMV07ICAgLy8gb2RkIHNlcXVlbmNlICgxLDMsNSwuLilcbiAgICAgICAgICAgICAgICAgIGogPSBrID0gMDtcblxuICAgICAgICAgICAgICAgICAgLy8gdHJ5IG1hdGNoaW5nIHVhc3RyaW5nIHdpdGggcmVnZXhlc1xuICAgICAgICAgICAgICAgICAgd2hpbGUgKGogPCByZWdleC5sZW5ndGggJiYgIW1hdGNoZXMpIHtcblxuICAgICAgICAgICAgICAgICAgICAgIG1hdGNoZXMgPSByZWdleFtqKytdLmV4ZWModWEpO1xuXG4gICAgICAgICAgICAgICAgICAgICAgaWYgKCEhbWF0Y2hlcykge1xuICAgICAgICAgICAgICAgICAgICAgICAgICBmb3IgKHAgPSAwOyBwIDwgcHJvcHMubGVuZ3RoOyBwKyspIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIG1hdGNoID0gbWF0Y2hlc1srK2tdO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgcSA9IHByb3BzW3BdO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgLy8gY2hlY2sgaWYgZ2l2ZW4gcHJvcGVydHkgaXMgYWN0dWFsbHkgYXJyYXlcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGlmICh0eXBlb2YgcSA9PT0gT0JKX1RZUEUgJiYgcS5sZW5ndGggPiAwKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgaWYgKHEubGVuZ3RoID09IDIpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgaWYgKHR5cGVvZiBxWzFdID09IEZVTkNfVFlQRSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgLy8gYXNzaWduIG1vZGlmaWVkIG1hdGNoXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB0aGlzW3FbMF1dID0gcVsxXS5jYWxsKHRoaXMsIG1hdGNoKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIC8vIGFzc2lnbiBnaXZlbiB2YWx1ZSwgaWdub3JlIHJlZ2V4IG1hdGNoXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB0aGlzW3FbMF1dID0gcVsxXTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIH0gZWxzZSBpZiAocS5sZW5ndGggPT0gMykge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAvLyBjaGVjayB3aGV0aGVyIGZ1bmN0aW9uIG9yIHJlZ2V4XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGlmICh0eXBlb2YgcVsxXSA9PT0gRlVOQ19UWVBFICYmICEocVsxXS5leGVjICYmIHFbMV0udGVzdCkpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIC8vIGNhbGwgZnVuY3Rpb24gKHVzdWFsbHkgc3RyaW5nIG1hcHBlcilcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHRoaXNbcVswXV0gPSBtYXRjaCA/IHFbMV0uY2FsbCh0aGlzLCBtYXRjaCwgcVsyXSkgOiB1bmRlZmluZWQkMTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIC8vIHNhbml0aXplIG1hdGNoIHVzaW5nIGdpdmVuIHJlZ2V4XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB0aGlzW3FbMF1dID0gbWF0Y2ggPyBtYXRjaC5yZXBsYWNlKHFbMV0sIHFbMl0pIDogdW5kZWZpbmVkJDE7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB9IGVsc2UgaWYgKHEubGVuZ3RoID09IDQpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHRoaXNbcVswXV0gPSBtYXRjaCA/IHFbM10uY2FsbCh0aGlzLCBtYXRjaC5yZXBsYWNlKHFbMV0sIHFbMl0pKSA6IHVuZGVmaW5lZCQxO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgdGhpc1txXSA9IG1hdGNoID8gbWF0Y2ggOiB1bmRlZmluZWQkMTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgIGkgKz0gMjtcbiAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAvLyBjb25zb2xlLmxvZyh0aGlzKTtcbiAgICAgICAgICAgICAgLy9yZXR1cm4gdGhpcztcbiAgICAgICAgICB9LFxuXG4gICAgICAgICAgc3RyIDogZnVuY3Rpb24gKHN0ciwgbWFwKSB7XG5cbiAgICAgICAgICAgICAgZm9yICh2YXIgaSBpbiBtYXApIHtcbiAgICAgICAgICAgICAgICAgIC8vIGNoZWNrIGlmIGFycmF5XG4gICAgICAgICAgICAgICAgICBpZiAodHlwZW9mIG1hcFtpXSA9PT0gT0JKX1RZUEUgJiYgbWFwW2ldLmxlbmd0aCA+IDApIHtcbiAgICAgICAgICAgICAgICAgICAgICBmb3IgKHZhciBqID0gMDsgaiA8IG1hcFtpXS5sZW5ndGg7IGorKykge1xuICAgICAgICAgICAgICAgICAgICAgICAgICBpZiAodXRpbC5oYXMobWFwW2ldW2pdLCBzdHIpKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICByZXR1cm4gKGkgPT09IFVOS05PV04pID8gdW5kZWZpbmVkJDEgOiBpO1xuICAgICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgfSBlbHNlIGlmICh1dGlsLmhhcyhtYXBbaV0sIHN0cikpIHtcbiAgICAgICAgICAgICAgICAgICAgICByZXR1cm4gKGkgPT09IFVOS05PV04pID8gdW5kZWZpbmVkJDEgOiBpO1xuICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgIHJldHVybiBzdHI7XG4gICAgICAgICAgfVxuICAgICAgfTtcblxuXG4gICAgICAvLy8vLy8vLy8vLy8vLy9cbiAgICAgIC8vIFN0cmluZyBtYXBcbiAgICAgIC8vLy8vLy8vLy8vLy8vXG5cblxuICAgICAgdmFyIG1hcHMgPSB7XG5cbiAgICAgICAgICBicm93c2VyIDoge1xuICAgICAgICAgICAgICBvbGRzYWZhcmkgOiB7XG4gICAgICAgICAgICAgICAgICB2ZXJzaW9uIDoge1xuICAgICAgICAgICAgICAgICAgICAgICcxLjAnICAgOiAnLzgnLFxuICAgICAgICAgICAgICAgICAgICAgICcxLjInICAgOiAnLzEnLFxuICAgICAgICAgICAgICAgICAgICAgICcxLjMnICAgOiAnLzMnLFxuICAgICAgICAgICAgICAgICAgICAgICcyLjAnICAgOiAnLzQxMicsXG4gICAgICAgICAgICAgICAgICAgICAgJzIuMC4yJyA6ICcvNDE2JyxcbiAgICAgICAgICAgICAgICAgICAgICAnMi4wLjMnIDogJy80MTcnLFxuICAgICAgICAgICAgICAgICAgICAgICcyLjAuNCcgOiAnLzQxOScsXG4gICAgICAgICAgICAgICAgICAgICAgJz8nICAgICA6ICcvJ1xuICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICBuYW1lIDoge1xuICAgICAgICAgICAgICAgICAgJ09wZXJhIE1vYmlsZScgOiAnT3BlcmEgTW9iaScsXG4gICAgICAgICAgICAgICAgICAnSUUgTW9iaWxlJyAgICA6ICdJRU1vYmlsZSdcbiAgICAgICAgICAgICAgfVxuICAgICAgICAgIH0sXG5cbiAgICAgICAgICBkZXZpY2UgOiB7XG4gICAgICAgICAgICAgIGFtYXpvbiA6IHtcbiAgICAgICAgICAgICAgICAgIG1vZGVsIDoge1xuICAgICAgICAgICAgICAgICAgICAgICdGaXJlIFBob25lJyA6IFsnU0QnLCAnS0YnXVxuICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICBzcHJpbnQgOiB7XG4gICAgICAgICAgICAgICAgICBtb2RlbCA6IHtcbiAgICAgICAgICAgICAgICAgICAgICAnRXZvIFNoaWZ0IDRHJyA6ICc3MzczS1QnXG4gICAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgICAgdmVuZG9yIDoge1xuICAgICAgICAgICAgICAgICAgICAgICdIVEMnICAgICAgIDogJ0FQQScsXG4gICAgICAgICAgICAgICAgICAgICAgJ1NwcmludCcgICAgOiAnU3ByaW50J1xuICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICB9XG4gICAgICAgICAgfSxcblxuICAgICAgICAgIG9zIDoge1xuICAgICAgICAgICAgICB3aW5kb3dzIDoge1xuICAgICAgICAgICAgICAgICAgdmVyc2lvbiA6IHtcbiAgICAgICAgICAgICAgICAgICAgICAnTUUnICAgICAgICA6ICc0LjkwJyxcbiAgICAgICAgICAgICAgICAgICAgICAnTlQgMy4xMScgICA6ICdOVDMuNTEnLFxuICAgICAgICAgICAgICAgICAgICAgICdOVCA0LjAnICAgIDogJ05UNC4wJyxcbiAgICAgICAgICAgICAgICAgICAgICAnMjAwMCcgICAgICA6ICdOVCA1LjAnLFxuICAgICAgICAgICAgICAgICAgICAgICdYUCcgICAgICAgIDogWydOVCA1LjEnLCAnTlQgNS4yJ10sXG4gICAgICAgICAgICAgICAgICAgICAgJ1Zpc3RhJyAgICAgOiAnTlQgNi4wJyxcbiAgICAgICAgICAgICAgICAgICAgICAnNycgICAgICAgICA6ICdOVCA2LjEnLFxuICAgICAgICAgICAgICAgICAgICAgICc4JyAgICAgICAgIDogJ05UIDYuMicsXG4gICAgICAgICAgICAgICAgICAgICAgJzguMScgICAgICAgOiAnTlQgNi4zJyxcbiAgICAgICAgICAgICAgICAgICAgICAnMTAnICAgICAgICA6IFsnTlQgNi40JywgJ05UIDEwLjAnXSxcbiAgICAgICAgICAgICAgICAgICAgICAnUlQnICAgICAgICA6ICdBUk0nXG4gICAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgICAgbmFtZSA6IHtcbiAgICAgICAgICAgICAgICAgICAgICAnV2luZG93cyBQaG9uZScgOiAnV2luZG93cyBQaG9uZSBPUydcbiAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgfVxuICAgICAgICAgIH1cbiAgICAgIH07XG5cblxuICAgICAgLy8vLy8vLy8vLy8vLy9cbiAgICAgIC8vIFJlZ2V4IG1hcFxuICAgICAgLy8vLy8vLy8vLy8vL1xuXG5cbiAgICAgIHZhciByZWdleGVzID0ge1xuXG4gICAgICAgICAgYnJvd3NlciA6IFtbXG5cbiAgICAgICAgICAgICAgLy8gUHJlc3RvIGJhc2VkXG4gICAgICAgICAgICAgIC8ob3BlcmFcXHNtaW5pKVxcLyhbXFx3XFwuLV0rKS9pLCAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIC8vIE9wZXJhIE1pbmlcbiAgICAgICAgICAgICAgLyhvcGVyYVxcc1ttb2JpbGV0YWJdKykuK3ZlcnNpb25cXC8oW1xcd1xcLi1dKykvaSwgICAgICAgICAgICAgICAgICAgICAgLy8gT3BlcmEgTW9iaS9UYWJsZXRcbiAgICAgICAgICAgICAgLyhvcGVyYSkuK3ZlcnNpb25cXC8oW1xcd1xcLl0rKS9pLCAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAvLyBPcGVyYSA+IDkuODBcbiAgICAgICAgICAgICAgLyhvcGVyYSlbXFwvXFxzXSsoW1xcd1xcLl0rKS9pICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgLy8gT3BlcmEgPCA5LjgwXG4gICAgICAgICAgICAgIF0sIFtOQU1FLCBWRVJTSU9OXSwgW1xuXG4gICAgICAgICAgICAgIC8ob3Bpb3MpW1xcL1xcc10rKFtcXHdcXC5dKykvaSAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIC8vIE9wZXJhIG1pbmkgb24gaXBob25lID49IDguMFxuICAgICAgICAgICAgICBdLCBbW05BTUUsICdPcGVyYSBNaW5pJ10sIFZFUlNJT05dLCBbXG5cbiAgICAgICAgICAgICAgL1xccyhvcHIpXFwvKFtcXHdcXC5dKykvaSAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgLy8gT3BlcmEgV2Via2l0XG4gICAgICAgICAgICAgIF0sIFtbTkFNRSwgJ09wZXJhJ10sIFZFUlNJT05dLCBbXG5cbiAgICAgICAgICAgICAgLy8gTWl4ZWRcbiAgICAgICAgICAgICAgLyhraW5kbGUpXFwvKFtcXHdcXC5dKykvaSwgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAvLyBLaW5kbGVcbiAgICAgICAgICAgICAgLyhsdW5hc2NhcGV8bWF4dGhvbnxuZXRmcm9udHxqYXNtaW5lfGJsYXplcilbXFwvXFxzXT8oW1xcd1xcLl0qKS9pLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIC8vIEx1bmFzY2FwZS9NYXh0aG9uL05ldGZyb250L0phc21pbmUvQmxhemVyXG5cbiAgICAgICAgICAgICAgLy8gVHJpZGVudCBiYXNlZFxuICAgICAgICAgICAgICAvKGF2YW50XFxzfGllbW9iaWxlfHNsaW18YmFpZHUpKD86YnJvd3Nlcik/W1xcL1xcc10/KFtcXHdcXC5dKikvaSxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAvLyBBdmFudC9JRU1vYmlsZS9TbGltQnJvd3Nlci9CYWlkdVxuICAgICAgICAgICAgICAvKD86bXN8XFwoKShpZSlcXHMoW1xcd1xcLl0rKS9pLCAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAvLyBJbnRlcm5ldCBFeHBsb3JlclxuXG4gICAgICAgICAgICAgIC8vIFdlYmtpdC9LSFRNTCBiYXNlZFxuICAgICAgICAgICAgICAvKHJla29ucSlcXC8oW1xcd1xcLl0qKS9pLCAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIC8vIFJla29ucVxuICAgICAgICAgICAgICAvKGNocm9taXVtfGZsb2NrfHJvY2ttZWx0fG1pZG9yaXxlcGlwaGFueXxzaWxrfHNreWZpcmV8b3ZpYnJvd3Nlcnxib2x0fGlyb258dml2YWxkaXxpcmlkaXVtfHBoYW50b21qc3xib3dzZXJ8cXVhcmt8cXVwemlsbGF8ZmFsa29uKVxcLyhbXFx3XFwuLV0rKS9pXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgLy8gQ2hyb21pdW0vRmxvY2svUm9ja01lbHQvTWlkb3JpL0VwaXBoYW55L1NpbGsvU2t5ZmlyZS9Cb2x0L0lyb24vSXJpZGl1bS9QaGFudG9tSlMvQm93c2VyL1F1cFppbGxhL0ZhbGtvblxuICAgICAgICAgICAgICBdLCBbTkFNRSwgVkVSU0lPTl0sIFtcblxuICAgICAgICAgICAgICAvKGtvbnF1ZXJvcilcXC8oW1xcd1xcLl0rKS9pICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIC8vIEtvbnF1ZXJvclxuICAgICAgICAgICAgICBdLCBbW05BTUUsICdLb25xdWVyb3InXSwgVkVSU0lPTl0sIFtcblxuICAgICAgICAgICAgICAvKHRyaWRlbnQpLitydls6XFxzXShbXFx3XFwuXSspLitsaWtlXFxzZ2Vja28vaSAgICAgICAgICAgICAgICAgICAgICAgICAvLyBJRTExXG4gICAgICAgICAgICAgIF0sIFtbTkFNRSwgJ0lFJ10sIFZFUlNJT05dLCBbXG5cbiAgICAgICAgICAgICAgLyhlZGdlfGVkZ2lvc3xlZGdhKVxcLygoXFxkKyk/W1xcd1xcLl0rKS9pICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgLy8gTWljcm9zb2Z0IEVkZ2VcbiAgICAgICAgICAgICAgXSwgW1tOQU1FLCAnRWRnZSddLCBWRVJTSU9OXSwgW1xuXG4gICAgICAgICAgICAgIC8oeWFicm93c2VyKVxcLyhbXFx3XFwuXSspL2kgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgLy8gWWFuZGV4XG4gICAgICAgICAgICAgIF0sIFtbTkFNRSwgJ1lhbmRleCddLCBWRVJTSU9OXSwgW1xuXG4gICAgICAgICAgICAgIC8ocHVmZmluKVxcLyhbXFx3XFwuXSspL2kgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgLy8gUHVmZmluXG4gICAgICAgICAgICAgIF0sIFtbTkFNRSwgJ1B1ZmZpbiddLCBWRVJTSU9OXSwgW1xuXG4gICAgICAgICAgICAgIC8oZm9jdXMpXFwvKFtcXHdcXC5dKykvaSAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgLy8gRmlyZWZveCBGb2N1c1xuICAgICAgICAgICAgICBdLCBbW05BTUUsICdGaXJlZm94IEZvY3VzJ10sIFZFUlNJT05dLCBbXG5cbiAgICAgICAgICAgICAgLyhvcHQpXFwvKFtcXHdcXC5dKykvaSAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAvLyBPcGVyYSBUb3VjaFxuICAgICAgICAgICAgICBdLCBbW05BTUUsICdPcGVyYSBUb3VjaCddLCBWRVJTSU9OXSwgW1xuXG4gICAgICAgICAgICAgIC8oKD86W1xcc1xcL10pdWM/XFxzP2Jyb3dzZXJ8KD86anVjLispdWN3ZWIpW1xcL1xcc10/KFtcXHdcXC5dKykvaSAgICAgICAgIC8vIFVDQnJvd3NlclxuICAgICAgICAgICAgICBdLCBbW05BTUUsICdVQ0Jyb3dzZXInXSwgVkVSU0lPTl0sIFtcblxuICAgICAgICAgICAgICAvKGNvbW9kb19kcmFnb24pXFwvKFtcXHdcXC5dKykvaSAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIC8vIENvbW9kbyBEcmFnb25cbiAgICAgICAgICAgICAgXSwgW1tOQU1FLCAvXy9nLCAnICddLCBWRVJTSU9OXSwgW1xuXG4gICAgICAgICAgICAgIC8oKD86YW5kcm9pZC4rKWNybW98Y3Jpb3MpXFwvKFtcXHdcXC5dKykvaSxcbiAgICAgICAgICAgICAgL2FuZHJvaWQuKyhjaHJvbWUpXFwvKFtcXHdcXC5dKylcXHMrKD86bW9iaWxlXFxzP3NhZmFyaSkvaSAgICAgICAgICAgICAgIC8vIENocm9tZSBmb3IgQW5kcm9pZC9pT1NcbiAgICAgICAgICAgICAgXSwgW1tOQU1FLCAnQ2hyb21lIE1vYmlsZSddLCBWRVJTSU9OXSwgW1xuXG4gICAgICAgICAgICAgIC8obWljcm9tZXNzZW5nZXIpXFwvKFtcXHdcXC5dKykvaSAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgLy8gV2VDaGF0XG4gICAgICAgICAgICAgIF0sIFtbTkFNRSwgJ1dlQ2hhdCddLCBWRVJTSU9OXSwgW1xuXG4gICAgICAgICAgICAgIC8oYnJhdmUpXFwvKFtcXHdcXC5dKykvaSAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAvLyBCcmF2ZSBicm93c2VyXG4gICAgICAgICAgICAgIF0sIFtbTkFNRSwgJ0JyYXZlJ10sIFZFUlNJT05dLCBbXG5cbiAgICAgICAgICAgICAgLyhxcWJyb3dzZXJsaXRlKVxcLyhbXFx3XFwuXSspL2kgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAvLyBRUUJyb3dzZXJMaXRlXG4gICAgICAgICAgICAgIF0sIFtOQU1FLCBWRVJTSU9OXSwgW1xuXG4gICAgICAgICAgICAgIC8oUVEpXFwvKFtcXGRcXC5dKykvaSAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgLy8gUVEsIGFrYSBTaG91UVxuICAgICAgICAgICAgICBdLCBbTkFNRSwgVkVSU0lPTl0sIFtcblxuICAgICAgICAgICAgICAvbT8ocXFicm93c2VyKVtcXC9cXHNdPyhbXFx3XFwuXSspL2kgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAvLyBRUUJyb3dzZXJcbiAgICAgICAgICAgICAgXSwgW05BTUUsIFZFUlNJT05dLCBbXG5cbiAgICAgICAgICAgICAgLyhCSURVQnJvd3NlcilbXFwvXFxzXT8oW1xcd1xcLl0rKS9pICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgLy8gQmFpZHUgQnJvd3NlclxuICAgICAgICAgICAgICBdLCBbTkFNRSwgVkVSU0lPTl0sIFtcblxuICAgICAgICAgICAgICAvKDIzNDVFeHBsb3JlcilbXFwvXFxzXT8oW1xcd1xcLl0rKS9pICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAvLyAyMzQ1IEJyb3dzZXJcbiAgICAgICAgICAgICAgXSwgW05BTUUsIFZFUlNJT05dLCBbXG5cbiAgICAgICAgICAgICAgLyhNZXRhU3IpW1xcL1xcc10/KFtcXHdcXC5dKykvaSAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgLy8gU291R291QnJvd3NlclxuICAgICAgICAgICAgICBdLCBbTkFNRV0sIFtcblxuICAgICAgICAgICAgICAvKExCQlJPV1NFUikvaSAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgLy8gTGllQmFvIEJyb3dzZXJcbiAgICAgICAgICAgICAgXSwgW05BTUVdLCBbXG5cbiAgICAgICAgICAgICAgL3hpYW9taVxcL21pdWlicm93c2VyXFwvKFtcXHdcXC5dKykvaSAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgLy8gTUlVSSBCcm93c2VyXG4gICAgICAgICAgICAgIF0sIFtWRVJTSU9OLCBbTkFNRSwgJ01JVUkgQnJvd3NlciddXSwgW1xuXG4gICAgICAgICAgICAgIC87ZmJhdlxcLyhbXFx3XFwuXSspOy9pICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgLy8gRmFjZWJvb2sgQXBwIGZvciBpT1MgJiBBbmRyb2lkXG4gICAgICAgICAgICAgIF0sIFtWRVJTSU9OLCBbTkFNRSwgJ0ZhY2Vib29rJ11dLCBbXG5cbiAgICAgICAgICAgICAgL3NhZmFyaVxccyhsaW5lKVxcLyhbXFx3XFwuXSspL2ksICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgLy8gTGluZSBBcHAgZm9yIGlPU1xuICAgICAgICAgICAgICAvYW5kcm9pZC4rKGxpbmUpXFwvKFtcXHdcXC5dKylcXC9pYWIvaSAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAvLyBMaW5lIEFwcCBmb3IgQW5kcm9pZFxuICAgICAgICAgICAgICBdLCBbTkFNRSwgVkVSU0lPTl0sIFtcblxuICAgICAgICAgICAgICAvaGVhZGxlc3NjaHJvbWUoPzpcXC8oW1xcd1xcLl0rKXxcXHMpL2kgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAvLyBDaHJvbWUgSGVhZGxlc3NcbiAgICAgICAgICAgICAgXSwgW1ZFUlNJT04sIFtOQU1FLCAnQ2hyb21lIEhlYWRsZXNzJ11dLCBbXG5cbiAgICAgICAgICAgICAgL1xcc3d2XFwpLisoY2hyb21lKVxcLyhbXFx3XFwuXSspL2kgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIC8vIENocm9tZSBXZWJWaWV3XG4gICAgICAgICAgICAgIF0sIFtbTkFNRSwgLyguKykvLCAnJDEgV2ViVmlldyddLCBWRVJTSU9OXSwgW1xuXG4gICAgICAgICAgICAgIC8oKD86b2N1bHVzfHNhbXN1bmcpYnJvd3NlcilcXC8oW1xcd1xcLl0rKS9pXG4gICAgICAgICAgICAgIF0sIFtbTkFNRSwgLyguKyg/Omd8dXMpKSguKykvLCAnJDEgJDInXSwgVkVSU0lPTl0sIFsgICAgICAgICAgICAgICAgLy8gT2N1bHVzIC8gU2Ftc3VuZyBCcm93c2VyXG5cbiAgICAgICAgICAgICAgL2FuZHJvaWQuK3ZlcnNpb25cXC8oW1xcd1xcLl0rKVxccysoPzptb2JpbGVcXHM/c2FmYXJpfHNhZmFyaSkqL2kgICAgICAgIC8vIEFuZHJvaWQgQnJvd3NlclxuICAgICAgICAgICAgICBdLCBbVkVSU0lPTiwgW05BTUUsICdBbmRyb2lkIEJyb3dzZXInXV0sIFtcblxuICAgICAgICAgICAgICAvKGNocm9tZXxvbW5pd2VifGFyb3JhfFt0aXplbm9rYV17NX1cXHM/YnJvd3NlcilcXC92PyhbXFx3XFwuXSspL2lcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAvLyBDaHJvbWUvT21uaVdlYi9Bcm9yYS9UaXplbi9Ob2tpYVxuICAgICAgICAgICAgICBdLCBbTkFNRSwgVkVSU0lPTl0sIFtcblxuICAgICAgICAgICAgICAvKGRvbGZpbilcXC8oW1xcd1xcLl0rKS9pICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIC8vIERvbHBoaW5cbiAgICAgICAgICAgICAgXSwgW1tOQU1FLCAnRG9scGhpbiddLCBWRVJTSU9OXSwgW1xuXG4gICAgICAgICAgICAgIC8oY29hc3QpXFwvKFtcXHdcXC5dKykvaSAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgLy8gT3BlcmEgQ29hc3RcbiAgICAgICAgICAgICAgXSwgW1tOQU1FLCAnT3BlcmEgQ29hc3QnXSwgVkVSU0lPTl0sIFtcblxuICAgICAgICAgICAgICAvZnhpb3NcXC8oW1xcd1xcLi1dKykvaSAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIC8vIEZpcmVmb3ggZm9yIGlPU1xuICAgICAgICAgICAgICBdLCBbVkVSU0lPTiwgW05BTUUsICdGaXJlZm94J11dLCBbXG5cbiAgICAgICAgICAgICAgL3ZlcnNpb25cXC8oW1xcd1xcLl0rKS4rP21vYmlsZVxcL1xcdytcXHMoc2FmYXJpKS9pICAgICAgICAgICAgICAgICAgICAgICAvLyBNb2JpbGUgU2FmYXJpXG4gICAgICAgICAgICAgIF0sIFtWRVJTSU9OLCBbTkFNRSwgJ01vYmlsZSBTYWZhcmknXV0sIFtcblxuICAgICAgICAgICAgICAvdmVyc2lvblxcLyhbXFx3XFwuXSspLis/KG1vYmlsZVxccz9zYWZhcml8c2FmYXJpKS9pICAgICAgICAgICAgICAgICAgICAvLyBTYWZhcmkgJiBTYWZhcmkgTW9iaWxlXG4gICAgICAgICAgICAgIF0sIFtWRVJTSU9OLCBOQU1FXSwgW1xuXG4gICAgICAgICAgICAgIC93ZWJraXQuKz8oZ3NhKVxcLyhbXFx3XFwuXSspLis/KG1vYmlsZVxccz9zYWZhcml8c2FmYXJpKShcXC9bXFx3XFwuXSspL2kgIC8vIEdvb2dsZSBTZWFyY2ggQXBwbGlhbmNlIG9uIGlPU1xuICAgICAgICAgICAgICBdLCBbW05BTUUsICdHU0EnXSwgVkVSU0lPTl0sIFtcblxuICAgICAgICAgICAgICAvd2Via2l0Lis/KG1vYmlsZVxccz9zYWZhcml8c2FmYXJpKShcXC9bXFx3XFwuXSspL2kgICAgICAgICAgICAgICAgICAgICAvLyBTYWZhcmkgPCAzLjBcbiAgICAgICAgICAgICAgXSwgW05BTUUsIFtWRVJTSU9OLCBtYXBwZXIuc3RyLCBtYXBzLmJyb3dzZXIub2xkc2FmYXJpLnZlcnNpb25dXSwgW1xuXG4gICAgICAgICAgICAgIC8od2Via2l0fGtodG1sKVxcLyhbXFx3XFwuXSspL2lcbiAgICAgICAgICAgICAgXSwgW05BTUUsIFZFUlNJT05dLCBbXG5cbiAgICAgICAgICAgICAgLy8gR2Vja28gYmFzZWRcbiAgICAgICAgICAgICAgLyhuYXZpZ2F0b3J8bmV0c2NhcGUpXFwvKFtcXHdcXC4tXSspL2kgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAvLyBOZXRzY2FwZVxuICAgICAgICAgICAgICBdLCBbW05BTUUsICdOZXRzY2FwZSddLCBWRVJTSU9OXSwgW1xuICAgICAgICAgICAgICAvKHN3aWZ0Zm94KS9pLCAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIC8vIFN3aWZ0Zm94XG4gICAgICAgICAgICAgIC8oaWNlZHJhZ29ufGljZXdlYXNlbHxjYW1pbm98Y2hpbWVyYXxmZW5uZWN8bWFlbW9cXHNicm93c2VyfG1pbmltb3xjb25rZXJvcilbXFwvXFxzXT8oW1xcd1xcLlxcK10rKS9pLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIC8vIEljZURyYWdvbi9JY2V3ZWFzZWwvQ2FtaW5vL0NoaW1lcmEvRmVubmVjL01hZW1vL01pbmltby9Db25rZXJvclxuICAgICAgICAgICAgICAvKGZpcmVmb3h8c2VhbW9ua2V5fGstbWVsZW9ufGljZWNhdHxpY2VhcGV8ZmlyZWJpcmR8cGhvZW5peHxwYWxlbW9vbnxiYXNpbGlza3x3YXRlcmZveClcXC8oW1xcd1xcLi1dKykvaSxcblxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIC8vIEZpcmVmb3gvU2VhTW9ua2V5L0stTWVsZW9uL0ljZUNhdC9JY2VBcGUvRmlyZWJpcmQvUGhvZW5peFxuICAgICAgICAgICAgICAvKG1vemlsbGEpXFwvKFtcXHdcXC5dKykuK3J2XFw6LitnZWNrb1xcL1xcZCsvaSwgICAgICAgICAgICAgICAgICAgICAgICAgIC8vIE1vemlsbGFcblxuICAgICAgICAgICAgICAvLyBPdGhlclxuICAgICAgICAgICAgICAvKHBvbGFyaXN8bHlueHxkaWxsb3xpY2FifGRvcmlzfGFtYXlhfHczbXxuZXRzdXJmfHNsZWlwbmlyKVtcXC9cXHNdPyhbXFx3XFwuXSspL2ksXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgLy8gUG9sYXJpcy9MeW54L0RpbGxvL2lDYWIvRG9yaXMvQW1heWEvdzNtL05ldFN1cmYvU2xlaXBuaXJcbiAgICAgICAgICAgICAgLyhsaW5rcylcXHNcXCgoW1xcd1xcLl0rKS9pLCAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgLy8gTGlua3NcbiAgICAgICAgICAgICAgLyhnb2Jyb3dzZXIpXFwvPyhbXFx3XFwuXSopL2ksICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAvLyBHb0Jyb3dzZXJcbiAgICAgICAgICAgICAgLyhpY2VcXHM/YnJvd3NlcilcXC92PyhbXFx3XFwuX10rKS9pLCAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgLy8gSUNFIEJyb3dzZXJcbiAgICAgICAgICAgICAgLyhtb3NhaWMpW1xcL1xcc10oW1xcd1xcLl0rKS9pICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgLy8gTW9zYWljXG4gICAgICAgICAgICAgIF0sIFtOQU1FLCBWRVJTSU9OXVxuXG4gICAgICAgICAgICAgIC8qIC8vLy8vLy8vLy8vLy8vLy8vLy8vL1xuICAgICAgICAgICAgICAvLyBNZWRpYSBwbGF5ZXJzIEJFR0lOXG4gICAgICAgICAgICAgIC8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vL1xuXG4gICAgICAgICAgICAgICwgW1xuXG4gICAgICAgICAgICAgIC8oYXBwbGUoPzpjb3JlbWVkaWF8KSlcXC8oKFxcZCspW1xcd1xcLl9dKykvaSwgICAgICAgICAgICAgICAgICAgICAgICAgIC8vIEdlbmVyaWMgQXBwbGUgQ29yZU1lZGlhXG4gICAgICAgICAgICAgIC8oY29yZW1lZGlhKSB2KChcXGQrKVtcXHdcXC5fXSspL2lcbiAgICAgICAgICAgICAgXSwgW05BTUUsIFZFUlNJT05dLCBbXG5cbiAgICAgICAgICAgICAgLyhhcXVhbHVuZ3xseXNzbmF8YnNwbGF5ZXIpXFwvKChcXGQrKT9bXFx3XFwuLV0rKS9pICAgICAgICAgICAgICAgICAgICAgLy8gQXF1YWx1bmcvTHlzc25hL0JTUGxheWVyXG4gICAgICAgICAgICAgIF0sIFtOQU1FLCBWRVJTSU9OXSwgW1xuXG4gICAgICAgICAgICAgIC8oYXJlc3xvc3Nwcm94eSlcXHMoKFxcZCspW1xcd1xcLi1dKykvaSAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIC8vIEFyZXMvT1NTUHJveHlcbiAgICAgICAgICAgICAgXSwgW05BTUUsIFZFUlNJT05dLCBbXG5cbiAgICAgICAgICAgICAgLyhhdWRhY2lvdXN8YXVkaW11c2ljc3RyZWFtfGFtYXJva3xiYXNzfGNvcmV8ZGFsdmlrfGdub21lbXBsYXllcnxtdXNpYyBvbiBjb25zb2xlfG5zcGxheWVyfHBzcC1pbnRlcm5ldHJhZGlvcGxheWVyfHZpZGVvcylcXC8oKFxcZCspW1xcd1xcLi1dKykvaSxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAvLyBBdWRhY2lvdXMvQXVkaU11c2ljU3RyZWFtL0FtYXJvay9CQVNTL09wZW5DT1JFL0RhbHZpay9Hbm9tZU1wbGF5ZXIvTW9DXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgLy8gTlNQbGF5ZXIvUFNQLUludGVybmV0UmFkaW9QbGF5ZXIvVmlkZW9zXG4gICAgICAgICAgICAgIC8oY2xlbWVudGluZXxtdXNpYyBwbGF5ZXIgZGFlbW9uKVxccygoXFxkKylbXFx3XFwuLV0rKS9pLCAgICAgICAgICAgICAgIC8vIENsZW1lbnRpbmUvTVBEXG4gICAgICAgICAgICAgIC8obGcgcGxheWVyfG5leHBsYXllcilcXHMoKFxcZCspW1xcZFxcLl0rKS9pLFxuICAgICAgICAgICAgICAvcGxheWVyXFwvKG5leHBsYXllcnxsZyBwbGF5ZXIpXFxzKChcXGQrKVtcXHdcXC4tXSspL2kgICAgICAgICAgICAgICAgICAgLy8gTmV4UGxheWVyL0xHIFBsYXllclxuICAgICAgICAgICAgICBdLCBbTkFNRSwgVkVSU0lPTl0sIFtcbiAgICAgICAgICAgICAgLyhuZXhwbGF5ZXIpXFxzKChcXGQrKVtcXHdcXC4tXSspL2kgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgLy8gTmV4cGxheWVyXG4gICAgICAgICAgICAgIF0sIFtOQU1FLCBWRVJTSU9OXSwgW1xuXG4gICAgICAgICAgICAgIC8oZmxycClcXC8oKFxcZCspW1xcd1xcLi1dKykvaSAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIC8vIEZsaXAgUGxheWVyXG4gICAgICAgICAgICAgIF0sIFtbTkFNRSwgJ0ZsaXAgUGxheWVyJ10sIFZFUlNJT05dLCBbXG5cbiAgICAgICAgICAgICAgLyhmc3RyZWFtfG5hdGl2ZWhvc3R8cXVlcnlzZWVrc3BpZGVyfGlhLWFyY2hpdmVyfGZhY2Vib29rZXh0ZXJuYWxoaXQpL2lcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAvLyBGU3RyZWFtL05hdGl2ZUhvc3QvUXVlcnlTZWVrU3BpZGVyL0lBIEFyY2hpdmVyL2ZhY2Vib29rZXh0ZXJuYWxoaXRcbiAgICAgICAgICAgICAgXSwgW05BTUVdLCBbXG5cbiAgICAgICAgICAgICAgLyhnc3RyZWFtZXIpIHNvdXBodHRwc3JjICg/OlxcKFteXFwpXStcXCkpezAsMX0gbGlic291cFxcLygoXFxkKylbXFx3XFwuLV0rKS9pXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgLy8gR3N0cmVhbWVyXG4gICAgICAgICAgICAgIF0sIFtOQU1FLCBWRVJTSU9OXSwgW1xuXG4gICAgICAgICAgICAgIC8oaHRjIHN0cmVhbWluZyBwbGF5ZXIpXFxzW1xcd19dK1xcc1xcL1xccygoXFxkKylbXFxkXFwuXSspL2ksICAgICAgICAgICAgICAvLyBIVEMgU3RyZWFtaW5nIFBsYXllclxuICAgICAgICAgICAgICAvKGphdmF8cHl0aG9uLXVybGxpYnxweXRob24tcmVxdWVzdHN8d2dldHxsaWJjdXJsKVxcLygoXFxkKylbXFx3XFwuLV9dKykvaSxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAvLyBKYXZhL3VybGxpYi9yZXF1ZXN0cy93Z2V0L2NVUkxcbiAgICAgICAgICAgICAgLyhsYXZmKSgoXFxkKylbXFxkXFwuXSspL2kgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAvLyBMYXZmIChGRk1QRUcpXG4gICAgICAgICAgICAgIF0sIFtOQU1FLCBWRVJTSU9OXSwgW1xuXG4gICAgICAgICAgICAgIC8oaHRjX29uZV9zKVxcLygoXFxkKylbXFxkXFwuXSspL2kgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIC8vIEhUQyBPbmUgU1xuICAgICAgICAgICAgICBdLCBbW05BTUUsIC9fL2csICcgJ10sIFZFUlNJT05dLCBbXG5cbiAgICAgICAgICAgICAgLyhtcGxheWVyKSg/Olxcc3xcXC8pKD86KD86c2hlcnB5YS0pezAsMX1zdm4pKD86LXxcXHMpKHJcXGQrKD86LVxcZCtbXFx3XFwuLV0rKXswLDF9KS9pXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgLy8gTVBsYXllciBTVk5cbiAgICAgICAgICAgICAgXSwgW05BTUUsIFZFUlNJT05dLCBbXG5cbiAgICAgICAgICAgICAgLyhtcGxheWVyKSg/Olxcc3xcXC98W3Vua293LV0rKSgoXFxkKylbXFx3XFwuLV0rKS9pICAgICAgICAgICAgICAgICAgICAgIC8vIE1QbGF5ZXJcbiAgICAgICAgICAgICAgXSwgW05BTUUsIFZFUlNJT05dLCBbXG5cbiAgICAgICAgICAgICAgLyhtcGxheWVyKS9pLCAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAvLyBNUGxheWVyIChubyBvdGhlciBpbmZvKVxuICAgICAgICAgICAgICAvKHlvdXJtdXplKS9pLCAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIC8vIFlvdXJNdXplXG4gICAgICAgICAgICAgIC8obWVkaWEgcGxheWVyIGNsYXNzaWN8bmVybyBzaG93dGltZSkvaSAgICAgICAgICAgICAgICAgICAgICAgICAgICAgLy8gTWVkaWEgUGxheWVyIENsYXNzaWMvTmVybyBTaG93VGltZVxuICAgICAgICAgICAgICBdLCBbTkFNRV0sIFtcblxuICAgICAgICAgICAgICAvKG5lcm8gKD86aG9tZXxzY291dCkpXFwvKChcXGQrKVtcXHdcXC4tXSspL2kgICAgICAgICAgICAgICAgICAgICAgICAgICAvLyBOZXJvIEhvbWUvTmVybyBTY291dFxuICAgICAgICAgICAgICBdLCBbTkFNRSwgVkVSU0lPTl0sIFtcblxuICAgICAgICAgICAgICAvKG5va2lhXFxkKylcXC8oKFxcZCspW1xcd1xcLi1dKykvaSAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgLy8gTm9raWFcbiAgICAgICAgICAgICAgXSwgW05BTUUsIFZFUlNJT05dLCBbXG5cbiAgICAgICAgICAgICAgL1xccyhzb25nYmlyZClcXC8oKFxcZCspW1xcd1xcLi1dKykvaSAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIC8vIFNvbmdiaXJkL1BoaWxpcHMtU29uZ2JpcmRcbiAgICAgICAgICAgICAgXSwgW05BTUUsIFZFUlNJT05dLCBbXG5cbiAgICAgICAgICAgICAgLyh3aW5hbXApMyB2ZXJzaW9uICgoXFxkKylbXFx3XFwuLV0rKS9pLCAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAvLyBXaW5hbXBcbiAgICAgICAgICAgICAgLyh3aW5hbXApXFxzKChcXGQrKVtcXHdcXC4tXSspL2ksXG4gICAgICAgICAgICAgIC8od2luYW1wKW1wZWdcXC8oKFxcZCspW1xcd1xcLi1dKykvaVxuICAgICAgICAgICAgICBdLCBbTkFNRSwgVkVSU0lPTl0sIFtcblxuICAgICAgICAgICAgICAvKG9jbXMtYm90fHRhcGlucmFkaW98dHVuZWluIHJhZGlvfHVua25vd258d2luYW1wfGlubGlnaHQgcmFkaW8pL2kgIC8vIE9DTVMtYm90L3RhcCBpbiByYWRpby90dW5laW4vdW5rbm93bi93aW5hbXAgKG5vIG90aGVyIGluZm8pXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgLy8gaW5saWdodCByYWRpb1xuICAgICAgICAgICAgICBdLCBbTkFNRV0sIFtcblxuICAgICAgICAgICAgICAvKHF1aWNrdGltZXxybWF8cmFkaW9hcHB8cmFkaW9jbGllbnRhcHBsaWNhdGlvbnxzb3VuZHRhcHx0b3RlbXxzdGFnZWZyaWdodHxzdHJlYW1pdW0pXFwvKChcXGQrKVtcXHdcXC4tXSspL2lcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAvLyBRdWlja1RpbWUvUmVhbE1lZGlhL1JhZGlvQXBwL1JhZGlvQ2xpZW50QXBwbGljYXRpb24vXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgLy8gU291bmRUYXAvVG90ZW0vU3RhZ2VmcmlnaHQvU3RyZWFtaXVtXG4gICAgICAgICAgICAgIF0sIFtOQU1FLCBWRVJTSU9OXSwgW1xuXG4gICAgICAgICAgICAgIC8oc21wKSgoXFxkKylbXFxkXFwuXSspL2kgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgLy8gU01QXG4gICAgICAgICAgICAgIF0sIFtOQU1FLCBWRVJTSU9OXSwgW1xuXG4gICAgICAgICAgICAgIC8odmxjKSBtZWRpYSBwbGF5ZXIgLSB2ZXJzaW9uICgoXFxkKylbXFx3XFwuXSspL2ksICAgICAgICAgICAgICAgICAgICAgLy8gVkxDIFZpZGVvbGFuXG4gICAgICAgICAgICAgIC8odmxjKVxcLygoXFxkKylbXFx3XFwuLV0rKS9pLFxuICAgICAgICAgICAgICAvKHhibWN8Z3Zmc3x4aW5lfHhtbXN8aXJhcHApXFwvKChcXGQrKVtcXHdcXC4tXSspL2ksICAgICAgICAgICAgICAgICAgICAvLyBYQk1DL2d2ZnMvWGluZS9YTU1TL2lyYXBwXG4gICAgICAgICAgICAgIC8oZm9vYmFyMjAwMClcXC8oKFxcZCspW1xcZFxcLl0rKS9pLCAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIC8vIEZvb2JhcjIwMDBcbiAgICAgICAgICAgICAgLyhpdHVuZXMpXFwvKChcXGQrKVtcXGRcXC5dKykvaSAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgLy8gaVR1bmVzXG4gICAgICAgICAgICAgIF0sIFtOQU1FLCBWRVJTSU9OXSwgW1xuXG4gICAgICAgICAgICAgIC8od21wbGF5ZXIpXFwvKChcXGQrKVtcXHdcXC4tXSspL2ksICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIC8vIFdpbmRvd3MgTWVkaWEgUGxheWVyXG4gICAgICAgICAgICAgIC8od2luZG93cy1tZWRpYS1wbGF5ZXIpXFwvKChcXGQrKVtcXHdcXC4tXSspL2lcbiAgICAgICAgICAgICAgXSwgW1tOQU1FLCAvLS9nLCAnICddLCBWRVJTSU9OXSwgW1xuXG4gICAgICAgICAgICAgIC93aW5kb3dzXFwvKChcXGQrKVtcXHdcXC4tXSspIHVwbnBcXC9bXFxkXFwuXSsgZGxuYWRvY1xcL1tcXGRcXC5dKyAoaG9tZSBtZWRpYSBzZXJ2ZXIpL2lcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAvLyBXaW5kb3dzIE1lZGlhIFNlcnZlclxuICAgICAgICAgICAgICBdLCBbVkVSU0lPTiwgW05BTUUsICdXaW5kb3dzJ11dLCBbXG5cbiAgICAgICAgICAgICAgLyhjb21cXC5yaXNldXByYWRpb2FsYXJtKVxcLygoXFxkKylbXFxkXFwuXSopL2kgICAgICAgICAgICAgICAgICAgICAgICAgIC8vIFJpc2VVUCBSYWRpbyBBbGFybVxuICAgICAgICAgICAgICBdLCBbTkFNRSwgVkVSU0lPTl0sIFtcblxuICAgICAgICAgICAgICAvKHJhZC5pbylcXHMoKFxcZCspW1xcZFxcLl0rKS9pLCAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAvLyBSYWQuaW9cbiAgICAgICAgICAgICAgLyhyYWRpby4oPzpkZXxhdHxmcikpXFxzKChcXGQrKVtcXGRcXC5dKykvaVxuICAgICAgICAgICAgICBdLCBbW05BTUUsICdyYWQuaW8nXSwgVkVSU0lPTl1cblxuICAgICAgICAgICAgICAvLy8vLy8vLy8vLy8vLy8vLy8vLy8vXG4gICAgICAgICAgICAgIC8vIE1lZGlhIHBsYXllcnMgRU5EXG4gICAgICAgICAgICAgIC8vLy8vLy8vLy8vLy8vLy8vLy8vKi9cblxuICAgICAgICAgIF0sXG5cbiAgICAgICAgICBjcHUgOiBbW1xuXG4gICAgICAgICAgICAgIC8oPzooYW1kfHgoPzooPzo4Nnw2NClbXy1dKT98d293fHdpbik2NClbO1xcKV0vaSAgICAgICAgICAgICAgICAgICAgIC8vIEFNRDY0XG4gICAgICAgICAgICAgIF0sIFtbQVJDSElURUNUVVJFLCAnYW1kNjQnXV0sIFtcblxuICAgICAgICAgICAgICAvKGlhMzIoPz07KSkvaSAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIC8vIElBMzIgKHF1aWNrdGltZSlcbiAgICAgICAgICAgICAgXSwgW1tBUkNISVRFQ1RVUkUsIHV0aWwubG93ZXJpemVdXSwgW1xuXG4gICAgICAgICAgICAgIC8oKD86aVszNDZdfHgpODYpWztcXCldL2kgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIC8vIElBMzJcbiAgICAgICAgICAgICAgXSwgW1tBUkNISVRFQ1RVUkUsICdpYTMyJ11dLCBbXG5cbiAgICAgICAgICAgICAgLy8gUG9ja2V0UEMgbWlzdGFrZW5seSBpZGVudGlmaWVkIGFzIFBvd2VyUENcbiAgICAgICAgICAgICAgL3dpbmRvd3NcXHMoY2V8bW9iaWxlKTtcXHNwcGM7L2lcbiAgICAgICAgICAgICAgXSwgW1tBUkNISVRFQ1RVUkUsICdhcm0nXV0sIFtcblxuICAgICAgICAgICAgICAvKCg/OnBwY3xwb3dlcnBjKSg/OjY0KT8pKD86XFxzbWFjfDt8XFwpKS9pICAgICAgICAgICAgICAgICAgICAgICAgICAgLy8gUG93ZXJQQ1xuICAgICAgICAgICAgICBdLCBbW0FSQ0hJVEVDVFVSRSwgL293ZXIvLCAnJywgdXRpbC5sb3dlcml6ZV1dLCBbXG5cbiAgICAgICAgICAgICAgLyhzdW40XFx3KVs7XFwpXS9pICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIC8vIFNQQVJDXG4gICAgICAgICAgICAgIF0sIFtbQVJDSElURUNUVVJFLCAnc3BhcmMnXV0sIFtcblxuICAgICAgICAgICAgICAvKCg/OmF2cjMyfGlhNjQoPz07KSl8NjhrKD89XFwpKXxhcm0oPzo2NHwoPz12XFxkK1s7bF0pKXwoPz1hdG1lbFxccylhdnJ8KD86aXJpeHxtaXBzfHNwYXJjKSg/OjY0KT8oPz07KXxwYS1yaXNjKS9pXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgLy8gSUE2NCwgNjhLLCBBUk0vNjQsIEFWUi8zMiwgSVJJWC82NCwgTUlQUy82NCwgU1BBUkMvNjQsIFBBLVJJU0NcbiAgICAgICAgICAgICAgXSwgW1tBUkNISVRFQ1RVUkUsIHV0aWwubG93ZXJpemVdXVxuICAgICAgICAgIF0sXG5cbiAgICAgICAgICBkZXZpY2UgOiBbW1xuXG4gICAgICAgICAgICAgIC9cXCgoaXBhZHxwbGF5Ym9vayk7W1xcd1xcc1xcKSw7LV0rKHJpbXxhcHBsZSkvaSAgICAgICAgICAgICAgICAgICAgICAgIC8vIGlQYWQvUGxheUJvb2tcbiAgICAgICAgICAgICAgXSwgW01PREVMLCBWRU5ET1IsIFtUWVBFLCBUQUJMRVRdXSwgW1xuXG4gICAgICAgICAgICAgIC9hcHBsZWNvcmVtZWRpYVxcL1tcXHdcXC5dKyBcXCgoaXBhZCkvICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIC8vIGlQYWRcbiAgICAgICAgICAgICAgXSwgW01PREVMLCBbVkVORE9SLCAnQXBwbGUnXSwgW1RZUEUsIFRBQkxFVF1dLCBbXG5cbiAgICAgICAgICAgICAgLyhhcHBsZVxcc3swLDF9dHYpL2kgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgLy8gQXBwbGUgVFZcbiAgICAgICAgICAgICAgXSwgW1tNT0RFTCwgJ0FwcGxlIFRWJ10sIFtWRU5ET1IsICdBcHBsZSddXSwgW1xuXG4gICAgICAgICAgICAgIC8oYXJjaG9zKVxccyhnYW1lcGFkMj8pL2ksICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIC8vIEFyY2hvc1xuICAgICAgICAgICAgICAvKGhwKS4rKHRvdWNocGFkKS9pLCAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIC8vIEhQIFRvdWNoUGFkXG4gICAgICAgICAgICAgIC8oaHApLisodGFibGV0KS9pLCAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgLy8gSFAgVGFibGV0XG4gICAgICAgICAgICAgIC8oa2luZGxlKVxcLyhbXFx3XFwuXSspL2ksICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgLy8gS2luZGxlXG4gICAgICAgICAgICAgIC9cXHMobm9vaylbXFx3XFxzXStidWlsZFxcLyhcXHcrKS9pLCAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAvLyBOb29rXG4gICAgICAgICAgICAgIC8oZGVsbClcXHMoc3RyZWFba3ByXFxzXFxkXSpbXFxka29dKS9pICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIC8vIERlbGwgU3RyZWFrXG4gICAgICAgICAgICAgIF0sIFtWRU5ET1IsIE1PREVMLCBbVFlQRSwgVEFCTEVUXV0sIFtcblxuICAgICAgICAgICAgICAvKGtmW0Etel0rKVxcc2J1aWxkXFwvLitzaWxrXFwvL2kgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIC8vIEtpbmRsZSBGaXJlIEhEXG4gICAgICAgICAgICAgIF0sIFtNT0RFTCwgW1ZFTkRPUiwgJ0FtYXpvbiddLCBbVFlQRSwgVEFCTEVUXV0sIFtcbiAgICAgICAgICAgICAgLyhzZHxrZilbMDM0OWhpam9yc3R1d10rXFxzYnVpbGRcXC8uK3NpbGtcXC8vaSAgICAgICAgICAgICAgICAgICAgICAgICAvLyBGaXJlIFBob25lXG4gICAgICAgICAgICAgIF0sIFtbTU9ERUwsIG1hcHBlci5zdHIsIG1hcHMuZGV2aWNlLmFtYXpvbi5tb2RlbF0sIFtWRU5ET1IsICdBbWF6b24nXSwgW1RZUEUsIE1PQklMRV1dLCBbXG4gICAgICAgICAgICAgIC9hbmRyb2lkLithZnQoW2Jtc10pXFxzYnVpbGQvaSAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIC8vIEZpcmUgVFZcbiAgICAgICAgICAgICAgXSwgW01PREVMLCBbVkVORE9SLCAnQW1hem9uJ10sIFtUWVBFLCBTTUFSVFRWXV0sIFtcblxuICAgICAgICAgICAgICAvXFwoKGlwW2hvbmVkfFxcc1xcdypdKyk7LisoYXBwbGUpL2kgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIC8vIGlQb2QvaVBob25lXG4gICAgICAgICAgICAgIF0sIFtNT0RFTCwgVkVORE9SLCBbVFlQRSwgTU9CSUxFXV0sIFtcbiAgICAgICAgICAgICAgL1xcKChpcFtob25lZHxcXHNcXHcqXSspOy9pICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAvLyBpUG9kL2lQaG9uZVxuICAgICAgICAgICAgICBdLCBbTU9ERUwsIFtWRU5ET1IsICdBcHBsZSddLCBbVFlQRSwgTU9CSUxFXV0sIFtcblxuICAgICAgICAgICAgICAvKGJsYWNrYmVycnkpW1xccy1dPyhcXHcrKS9pLCAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgLy8gQmxhY2tCZXJyeVxuICAgICAgICAgICAgICAvKGJsYWNrYmVycnl8YmVucXxwYWxtKD89XFwtKXxzb255ZXJpY3Nzb258YWNlcnxhc3VzfGRlbGx8bWVpenV8bW90b3JvbGF8cG9seXRyb24pW1xcc18tXT8oW1xcdy1dKikvaSxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAvLyBCZW5RL1BhbG0vU29ueS1Fcmljc3Nvbi9BY2VyL0FzdXMvRGVsbC9NZWl6dS9Nb3Rvcm9sYS9Qb2x5dHJvblxuICAgICAgICAgICAgICAvKGhwKVxccyhbXFx3XFxzXStcXHcpL2ksICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAvLyBIUCBpUEFRXG4gICAgICAgICAgICAgIC8oYXN1cyktPyhcXHcrKS9pICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIC8vIEFzdXNcbiAgICAgICAgICAgICAgXSwgW1ZFTkRPUiwgTU9ERUwsIFtUWVBFLCBNT0JJTEVdXSwgW1xuICAgICAgICAgICAgICAvXFwoYmIxMDtcXHMoXFx3KykvaSAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIC8vIEJsYWNrQmVycnkgMTBcbiAgICAgICAgICAgICAgXSwgW01PREVMLCBbVkVORE9SLCAnQmxhY2tCZXJyeSddLCBbVFlQRSwgTU9CSUxFXV0sIFtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAvLyBBc3VzIFRhYmxldHNcbiAgICAgICAgICAgICAgL2FuZHJvaWQuKyh0cmFuc2ZvW3ByaW1lXFxzXXs0LDEwfVxcc1xcdyt8ZWVlcGN8c2xpZGVyXFxzXFx3K3xuZXh1cyA3fHBhZGZvbmV8cDAwYykvaVxuICAgICAgICAgICAgICBdLCBbTU9ERUwsIFtWRU5ET1IsICdBc3VzJ10sIFtUWVBFLCBUQUJMRVRdXSwgW1xuXG4gICAgICAgICAgICAgIC8oc29ueSlcXHModGFibGV0XFxzW3BzXSlcXHNidWlsZFxcLy9pLCAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAvLyBTb255XG4gICAgICAgICAgICAgIC8oc29ueSk/KD86c2dwLispXFxzYnVpbGRcXC8vaVxuICAgICAgICAgICAgICBdLCBbW1ZFTkRPUiwgJ1NvbnknXSwgW01PREVMLCAnWHBlcmlhIFRhYmxldCddLCBbVFlQRSwgVEFCTEVUXV0sIFtcbiAgICAgICAgICAgICAgL2FuZHJvaWQuK1xccyhbYy1nXVxcZHs0fXxzb1stbF1cXHcrKSg/PVxcc2J1aWxkXFwvfFxcKS4rY2hyb21lXFwvKD8hWzEtNl17MCwxfVxcZFxcLikpL2lcbiAgICAgICAgICAgICAgXSwgW01PREVMLCBbVkVORE9SLCAnU29ueSddLCBbVFlQRSwgTU9CSUxFXV0sIFtcblxuICAgICAgICAgICAgICAvXFxzKG91eWEpXFxzL2ksICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgLy8gT3V5YVxuICAgICAgICAgICAgICAvKG5pbnRlbmRvKVxccyhbd2lkczN1XSspL2kgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAvLyBOaW50ZW5kb1xuICAgICAgICAgICAgICBdLCBbVkVORE9SLCBNT0RFTCwgW1RZUEUsIENPTlNPTEVdXSwgW1xuXG4gICAgICAgICAgICAgIC9hbmRyb2lkLis7XFxzKHNoaWVsZClcXHNidWlsZC9pICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAvLyBOdmlkaWFcbiAgICAgICAgICAgICAgXSwgW01PREVMLCBbVkVORE9SLCAnTnZpZGlhJ10sIFtUWVBFLCBDT05TT0xFXV0sIFtcblxuICAgICAgICAgICAgICAvKHBsYXlzdGF0aW9uXFxzWzM0cG9ydGFibGV2aV0rKS9pICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAvLyBQbGF5c3RhdGlvblxuICAgICAgICAgICAgICBdLCBbTU9ERUwsIFtWRU5ET1IsICdTb255J10sIFtUWVBFLCBDT05TT0xFXV0sIFtcblxuICAgICAgICAgICAgICAvKHNwcmludFxccyhcXHcrKSkvaSAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgLy8gU3ByaW50IFBob25lc1xuICAgICAgICAgICAgICBdLCBbW1ZFTkRPUiwgbWFwcGVyLnN0ciwgbWFwcy5kZXZpY2Uuc3ByaW50LnZlbmRvcl0sIFtNT0RFTCwgbWFwcGVyLnN0ciwgbWFwcy5kZXZpY2Uuc3ByaW50Lm1vZGVsXSwgW1RZUEUsIE1PQklMRV1dLCBbXG5cbiAgICAgICAgICAgICAgLyhsZW5vdm8pXFxzPyhTKD86NTAwMHw2MDAwKSsoPzpbLV1bXFx3K10pKS9pICAgICAgICAgICAgICAgICAgICAgICAgIC8vIExlbm92byB0YWJsZXRzXG4gICAgICAgICAgICAgIF0sIFtWRU5ET1IsIE1PREVMLCBbVFlQRSwgVEFCTEVUXV0sIFtcblxuICAgICAgICAgICAgICAvKGh0YylbO19cXHMtXSsoW1xcd1xcc10rKD89XFwpfFxcc2J1aWxkKXxcXHcrKS9pLCAgICAgICAgICAgICAgICAgICAgICAgIC8vIEhUQ1xuICAgICAgICAgICAgICAvKHp0ZSktKFxcdyopL2ksICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAvLyBaVEVcbiAgICAgICAgICAgICAgLyhhbGNhdGVsfGdlZWtzcGhvbmV8bGVub3ZvfG5leGlhbnxwYW5hc29uaWN8KD89O1xccylzb255KVtfXFxzLV0/KFtcXHctXSopL2lcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAvLyBBbGNhdGVsL0dlZWtzUGhvbmUvTGVub3ZvL05leGlhbi9QYW5hc29uaWMvU29ueVxuICAgICAgICAgICAgICBdLCBbVkVORE9SLCBbTU9ERUwsIC9fL2csICcgJ10sIFtUWVBFLCBNT0JJTEVdXSwgW1xuXG4gICAgICAgICAgICAgIC8obmV4dXNcXHM5KS9pICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIC8vIEhUQyBOZXh1cyA5XG4gICAgICAgICAgICAgIF0sIFtNT0RFTCwgW1ZFTkRPUiwgJ0hUQyddLCBbVFlQRSwgVEFCTEVUXV0sIFtcblxuICAgICAgICAgICAgICAvZFxcL2h1YXdlaShbXFx3XFxzLV0rKVs7XFwpXS9pLFxuICAgICAgICAgICAgICAvKG5leHVzXFxzNnApL2kgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAvLyBIdWF3ZWlcbiAgICAgICAgICAgICAgXSwgW01PREVMLCBbVkVORE9SLCAnSHVhd2VpJ10sIFtUWVBFLCBNT0JJTEVdXSwgW1xuXG4gICAgICAgICAgICAgIC8obWljcm9zb2Z0KTtcXHMobHVtaWFbXFxzXFx3XSspL2kgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgLy8gTWljcm9zb2Z0IEx1bWlhXG4gICAgICAgICAgICAgIF0sIFtWRU5ET1IsIE1PREVMLCBbVFlQRSwgTU9CSUxFXV0sIFtcblxuICAgICAgICAgICAgICAvW1xcc1xcKDtdKHhib3goPzpcXHNvbmUpPylbXFxzXFwpO10vaSAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgLy8gTWljcm9zb2Z0IFhib3hcbiAgICAgICAgICAgICAgXSwgW01PREVMLCBbVkVORE9SLCAnTWljcm9zb2Z0J10sIFtUWVBFLCBDT05TT0xFXV0sIFtcbiAgICAgICAgICAgICAgLyhraW5cXC5bb25ldHddezN9KS9pICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgLy8gTWljcm9zb2Z0IEtpblxuICAgICAgICAgICAgICBdLCBbW01PREVMLCAvXFwuL2csICcgJ10sIFtWRU5ET1IsICdNaWNyb3NvZnQnXSwgW1RZUEUsIE1PQklMRV1dLCBbXG5cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAvLyBNb3Rvcm9sYVxuICAgICAgICAgICAgICAvXFxzKG1pbGVzdG9uZXxkcm9pZCg/OlsyLTR4XXxcXHMoPzpiaW9uaWN8eDJ8cHJvfHJhenIpKT86PyhcXHM0Zyk/KVtcXHdcXHNdK2J1aWxkXFwvL2ksXG4gICAgICAgICAgICAgIC9tb3RbXFxzLV0/KFxcdyopL2ksXG4gICAgICAgICAgICAgIC8oWFRcXGR7Myw0fSkgYnVpbGRcXC8vaSxcbiAgICAgICAgICAgICAgLyhuZXh1c1xcczYpL2lcbiAgICAgICAgICAgICAgXSwgW01PREVMLCBbVkVORE9SLCAnTW90b3JvbGEnXSwgW1RZUEUsIE1PQklMRV1dLCBbXG4gICAgICAgICAgICAgIC9hbmRyb2lkLitcXHMobXo2MFxcZHx4b29tW1xcczJdezAsMn0pXFxzYnVpbGRcXC8vaVxuICAgICAgICAgICAgICBdLCBbTU9ERUwsIFtWRU5ET1IsICdNb3Rvcm9sYSddLCBbVFlQRSwgVEFCTEVUXV0sIFtcblxuICAgICAgICAgICAgICAvaGJidHZcXC9cXGQrXFwuXFxkK1xcLlxcZCtcXHMrXFwoW1xcd1xcc10qO1xccyooXFx3W147XSopOyhbXjtdKikvaSAgICAgICAgICAgIC8vIEhiYlRWIGRldmljZXNcbiAgICAgICAgICAgICAgXSwgW1tWRU5ET1IsIHV0aWwudHJpbV0sIFtNT0RFTCwgdXRpbC50cmltXSwgW1RZUEUsIFNNQVJUVFZdXSwgW1xuXG4gICAgICAgICAgICAgIC9oYmJ0di4rbWFwbGU7KFxcZCspL2lcbiAgICAgICAgICAgICAgXSwgW1tNT0RFTCwgL14vLCAnU21hcnRUViddLCBbVkVORE9SLCAnU2Ftc3VuZyddLCBbVFlQRSwgU01BUlRUVl1dLCBbXG5cbiAgICAgICAgICAgICAgL1xcKGR0dltcXCk7XS4rKGFxdW9zKS9pICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIC8vIFNoYXJwXG4gICAgICAgICAgICAgIF0sIFtNT0RFTCwgW1ZFTkRPUiwgJ1NoYXJwJ10sIFtUWVBFLCBTTUFSVFRWXV0sIFtcblxuICAgICAgICAgICAgICAvYW5kcm9pZC4rKChzY2gtaVs4OV0wXFxkfHNody1tMzgwc3xndC1wXFxkezR9fGd0LW5cXGQrfHNnaC10OFs1Nl05fG5leHVzIDEwKSkvaSxcbiAgICAgICAgICAgICAgLygoU00tVFxcdyspKS9pXG4gICAgICAgICAgICAgIF0sIFtbVkVORE9SLCAnU2Ftc3VuZyddLCBNT0RFTCwgW1RZUEUsIFRBQkxFVF1dLCBbICAgICAgICAgICAgICAgICAgLy8gU2Ftc3VuZ1xuICAgICAgICAgICAgICAvc21hcnQtdHYuKyhzYW1zdW5nKS9pXG4gICAgICAgICAgICAgIF0sIFtWRU5ET1IsIFtUWVBFLCBTTUFSVFRWXSwgTU9ERUxdLCBbXG4gICAgICAgICAgICAgIC8oKHNbY2dwXWgtXFx3K3xndC1cXHcrfGdhbGF4eVxcc25leHVzfHNtLVxcd1tcXHdcXGRdKykpL2ksXG4gICAgICAgICAgICAgIC8oc2FtW3N1bmddKilbXFxzLV0qKFxcdystP1tcXHctXSopL2ksXG4gICAgICAgICAgICAgIC9zZWMtKChzZ2hcXHcrKSkvaVxuICAgICAgICAgICAgICBdLCBbW1ZFTkRPUiwgJ1NhbXN1bmcnXSwgTU9ERUwsIFtUWVBFLCBNT0JJTEVdXSwgW1xuXG4gICAgICAgICAgICAgIC9zaWUtKFxcdyopL2kgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIC8vIFNpZW1lbnNcbiAgICAgICAgICAgICAgXSwgW01PREVMLCBbVkVORE9SLCAnU2llbWVucyddLCBbVFlQRSwgTU9CSUxFXV0sIFtcblxuICAgICAgICAgICAgICAvKG1hZW1vfG5va2lhKS4qKG45MDB8bHVtaWFcXHNcXGQrKS9pLCAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgLy8gTm9raWFcbiAgICAgICAgICAgICAgLyhub2tpYSlbXFxzXy1dPyhbXFx3LV0qKS9pXG4gICAgICAgICAgICAgIF0sIFtbVkVORE9SLCAnTm9raWEnXSwgTU9ERUwsIFtUWVBFLCBNT0JJTEVdXSwgW1xuXG4gICAgICAgICAgICAgIC9hbmRyb2lkW3hcXGRcXC5cXHM7XStcXHMoW2FiXVsxLTddXFwtP1swMTc4YV1cXGRcXGQ/KS9pICAgICAgICAgICAgICAgICAgIC8vIEFjZXJcbiAgICAgICAgICAgICAgXSwgW01PREVMLCBbVkVORE9SLCAnQWNlciddLCBbVFlQRSwgVEFCTEVUXV0sIFtcblxuICAgICAgICAgICAgICAvYW5kcm9pZC4rKFt2bF1rXFwtP1xcZHszfSlcXHMrYnVpbGQvaSAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIC8vIExHIFRhYmxldFxuICAgICAgICAgICAgICBdLCBbTU9ERUwsIFtWRU5ET1IsICdMRyddLCBbVFlQRSwgVEFCTEVUXV0sIFtcbiAgICAgICAgICAgICAgL2FuZHJvaWRcXHMzXFwuW1xcc1xcdzstXXsxMH0obGc/KS0oWzA2Y3Y5XXszLDR9KS9pICAgICAgICAgICAgICAgICAgICAgLy8gTEcgVGFibGV0XG4gICAgICAgICAgICAgIF0sIFtbVkVORE9SLCAnTEcnXSwgTU9ERUwsIFtUWVBFLCBUQUJMRVRdXSwgW1xuICAgICAgICAgICAgICAvKGxnKSBuZXRjYXN0XFwudHYvaSAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAvLyBMRyBTbWFydFRWXG4gICAgICAgICAgICAgIF0sIFtWRU5ET1IsIE1PREVMLCBbVFlQRSwgU01BUlRUVl1dLCBbXG4gICAgICAgICAgICAgIC8obmV4dXNcXHNbNDVdKS9pLCAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIC8vIExHXG4gICAgICAgICAgICAgIC9sZ1tlO1xcc1xcLy1dKyhcXHcqKS9pLFxuICAgICAgICAgICAgICAvYW5kcm9pZC4rbGcoXFwtP1tcXGRcXHddKylcXHMrYnVpbGQvaVxuICAgICAgICAgICAgICBdLCBbTU9ERUwsIFtWRU5ET1IsICdMRyddLCBbVFlQRSwgTU9CSUxFXV0sIFtcblxuICAgICAgICAgICAgICAvYW5kcm9pZC4rKGlkZWF0YWJbYS16MC05XFwtXFxzXSspL2kgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgLy8gTGVub3ZvXG4gICAgICAgICAgICAgIF0sIFtNT0RFTCwgW1ZFTkRPUiwgJ0xlbm92byddLCBbVFlQRSwgVEFCTEVUXV0sIFtcblxuICAgICAgICAgICAgICAvbGludXg7LisoKGpvbGxhKSk7L2kgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIC8vIEpvbGxhXG4gICAgICAgICAgICAgIF0sIFtWRU5ET1IsIE1PREVMLCBbVFlQRSwgTU9CSUxFXV0sIFtcblxuICAgICAgICAgICAgICAvKChwZWJibGUpKWFwcFxcL1tcXGRcXC5dK1xccy9pICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAvLyBQZWJibGVcbiAgICAgICAgICAgICAgXSwgW1ZFTkRPUiwgTU9ERUwsIFtUWVBFLCBXRUFSQUJMRV1dLCBbXG5cbiAgICAgICAgICAgICAgL2FuZHJvaWQuKztcXHMob3BwbylcXHM/KFtcXHdcXHNdKylcXHNidWlsZC9pICAgICAgICAgICAgICAgICAgICAgICAgICAgIC8vIE9QUE9cbiAgICAgICAgICAgICAgXSwgW1ZFTkRPUiwgTU9ERUwsIFtUWVBFLCBNT0JJTEVdXSwgW1xuXG4gICAgICAgICAgICAgIC9jcmtleS9pICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgLy8gR29vZ2xlIENocm9tZWNhc3RcbiAgICAgICAgICAgICAgXSwgW1tNT0RFTCwgJ0Nocm9tZWNhc3QnXSwgW1ZFTkRPUiwgJ0dvb2dsZSddXSwgW1xuXG4gICAgICAgICAgICAgIC9hbmRyb2lkLis7XFxzKGdsYXNzKVxcc1xcZC9pICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgLy8gR29vZ2xlIEdsYXNzXG4gICAgICAgICAgICAgIF0sIFtNT0RFTCwgW1ZFTkRPUiwgJ0dvb2dsZSddLCBbVFlQRSwgV0VBUkFCTEVdXSwgW1xuXG4gICAgICAgICAgICAgIC9hbmRyb2lkLis7XFxzKHBpeGVsIGMpW1xccyldL2kgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAvLyBHb29nbGUgUGl4ZWwgQ1xuICAgICAgICAgICAgICBdLCBbTU9ERUwsIFtWRU5ET1IsICdHb29nbGUnXSwgW1RZUEUsIFRBQkxFVF1dLCBbXG5cbiAgICAgICAgICAgICAgL2FuZHJvaWQuKztcXHMocGl4ZWwoIFsyM10pPyggeGwpPylcXHMvaSAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIC8vIEdvb2dsZSBQaXhlbFxuICAgICAgICAgICAgICBdLCBbTU9ERUwsIFtWRU5ET1IsICdHb29nbGUnXSwgW1RZUEUsIE1PQklMRV1dLCBbXG5cbiAgICAgICAgICAgICAgL2FuZHJvaWQuKztcXHMoXFx3KylcXHMrYnVpbGRcXC9obVxcMS9pLCAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIC8vIFhpYW9taSBIb25nbWkgJ251bWVyaWMnIG1vZGVsc1xuICAgICAgICAgICAgICAvYW5kcm9pZC4rKGhtW1xcc1xcLV9dKm5vdGU/W1xcc19dKig/OlxcZFxcdyk/KVxccytidWlsZC9pLCAgICAgICAgICAgICAgIC8vIFhpYW9taSBIb25nbWlcbiAgICAgICAgICAgICAgL2FuZHJvaWQuKyhtaVtcXHNcXC1fXSooPzpvbmV8b25lW1xcc19dcGx1c3xub3RlIGx0ZSk/W1xcc19dKig/OlxcZD9cXHc/KVtcXHNfXSooPzpwbHVzKT8pXFxzK2J1aWxkL2ksICAgIC8vIFhpYW9taSBNaVxuICAgICAgICAgICAgICAvYW5kcm9pZC4rKHJlZG1pW1xcc1xcLV9dKig/Om5vdGUpPyg/OltcXHNfXSpbXFx3XFxzXSspKVxccytidWlsZC9pICAgICAgIC8vIFJlZG1pIFBob25lc1xuICAgICAgICAgICAgICBdLCBbW01PREVMLCAvXy9nLCAnICddLCBbVkVORE9SLCAnWGlhb21pJ10sIFtUWVBFLCBNT0JJTEVdXSwgW1xuICAgICAgICAgICAgICAvYW5kcm9pZC4rKG1pW1xcc1xcLV9dKig/OnBhZCkoPzpbXFxzX10qW1xcd1xcc10rKSlcXHMrYnVpbGQvaSAgICAgICAgICAgIC8vIE1pIFBhZCB0YWJsZXRzXG4gICAgICAgICAgICAgIF0sW1tNT0RFTCwgL18vZywgJyAnXSwgW1ZFTkRPUiwgJ1hpYW9taSddLCBbVFlQRSwgVEFCTEVUXV0sIFtcbiAgICAgICAgICAgICAgL2FuZHJvaWQuKztcXHMobVsxLTVdXFxzbm90ZSlcXHNidWlsZC9pICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAvLyBNZWl6dSBUYWJsZXRcbiAgICAgICAgICAgICAgXSwgW01PREVMLCBbVkVORE9SLCAnTWVpenUnXSwgW1RZUEUsIFRBQkxFVF1dLCBbXG4gICAgICAgICAgICAgIC8obXopLShbXFx3LV17Mix9KS9pICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIC8vIE1laXp1IFBob25lXG4gICAgICAgICAgICAgIF0sIFtbVkVORE9SLCAnTWVpenUnXSwgTU9ERUwsIFtUWVBFLCBNT0JJTEVdXSwgW1xuXG4gICAgICAgICAgICAgIC9hbmRyb2lkLithMDAwKDEpXFxzK2J1aWxkL2ksICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIC8vIE9uZVBsdXNcbiAgICAgICAgICAgICAgL2FuZHJvaWQuK29uZXBsdXNcXHMoYVxcZHs0fSlcXHMrYnVpbGQvaVxuICAgICAgICAgICAgICBdLCBbTU9ERUwsIFtWRU5ET1IsICdPbmVQbHVzJ10sIFtUWVBFLCBNT0JJTEVdXSwgW1xuXG4gICAgICAgICAgICAgIC9hbmRyb2lkLitbO1xcL11cXHMqKFJDVFtcXGRcXHddKylcXHMrYnVpbGQvaSAgICAgICAgICAgICAgICAgICAgICAgICAgICAvLyBSQ0EgVGFibGV0c1xuICAgICAgICAgICAgICBdLCBbTU9ERUwsIFtWRU5ET1IsICdSQ0EnXSwgW1RZUEUsIFRBQkxFVF1dLCBbXG5cbiAgICAgICAgICAgICAgL2FuZHJvaWQuK1s7XFwvXFxzXSsoVmVudWVbXFxkXFxzXXsyLDd9KVxccytidWlsZC9pICAgICAgICAgICAgICAgICAgICAgIC8vIERlbGwgVmVudWUgVGFibGV0c1xuICAgICAgICAgICAgICBdLCBbTU9ERUwsIFtWRU5ET1IsICdEZWxsJ10sIFtUWVBFLCBUQUJMRVRdXSwgW1xuXG4gICAgICAgICAgICAgIC9hbmRyb2lkLitbO1xcL11cXHMqKFFbVHxNXVtcXGRcXHddKylcXHMrYnVpbGQvaSAgICAgICAgICAgICAgICAgICAgICAgICAvLyBWZXJpem9uIFRhYmxldFxuICAgICAgICAgICAgICBdLCBbTU9ERUwsIFtWRU5ET1IsICdWZXJpem9uJ10sIFtUWVBFLCBUQUJMRVRdXSwgW1xuXG4gICAgICAgICAgICAgIC9hbmRyb2lkLitbO1xcL11cXHMrKEJhcm5lc1smXFxzXStOb2JsZVxccyt8Qk5bUlRdKShWPy4qKVxccytidWlsZC9pICAgICAvLyBCYXJuZXMgJiBOb2JsZSBUYWJsZXRcbiAgICAgICAgICAgICAgXSwgW1tWRU5ET1IsICdCYXJuZXMgJiBOb2JsZSddLCBNT0RFTCwgW1RZUEUsIFRBQkxFVF1dLCBbXG5cbiAgICAgICAgICAgICAgL2FuZHJvaWQuK1s7XFwvXVxccysoVE1cXGR7M30uKlxcYilcXHMrYnVpbGQvaSAgICAgICAgICAgICAgICAgICAgICAgICAgIC8vIEJhcm5lcyAmIE5vYmxlIFRhYmxldFxuICAgICAgICAgICAgICBdLCBbTU9ERUwsIFtWRU5ET1IsICdOdVZpc2lvbiddLCBbVFlQRSwgVEFCTEVUXV0sIFtcblxuICAgICAgICAgICAgICAvYW5kcm9pZC4rO1xccyhrODgpXFxzYnVpbGQvaSAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgLy8gWlRFIEsgU2VyaWVzIFRhYmxldFxuICAgICAgICAgICAgICBdLCBbTU9ERUwsIFtWRU5ET1IsICdaVEUnXSwgW1RZUEUsIFRBQkxFVF1dLCBbXG5cbiAgICAgICAgICAgICAgL2FuZHJvaWQuK1s7XFwvXVxccyooZ2VuXFxkezN9KVxccytidWlsZC4qNDloL2kgICAgICAgICAgICAgICAgICAgICAgICAgLy8gU3dpc3MgR0VOIE1vYmlsZVxuICAgICAgICAgICAgICBdLCBbTU9ERUwsIFtWRU5ET1IsICdTd2lzcyddLCBbVFlQRSwgTU9CSUxFXV0sIFtcblxuICAgICAgICAgICAgICAvYW5kcm9pZC4rWztcXC9dXFxzKih6dXJcXGR7M30pXFxzK2J1aWxkL2kgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAvLyBTd2lzcyBaVVIgVGFibGV0XG4gICAgICAgICAgICAgIF0sIFtNT0RFTCwgW1ZFTkRPUiwgJ1N3aXNzJ10sIFtUWVBFLCBUQUJMRVRdXSwgW1xuXG4gICAgICAgICAgICAgIC9hbmRyb2lkLitbO1xcL11cXHMqKChaZWtpKT9UQi4qXFxiKVxccytidWlsZC9pICAgICAgICAgICAgICAgICAgICAgICAgIC8vIFpla2kgVGFibGV0c1xuICAgICAgICAgICAgICBdLCBbTU9ERUwsIFtWRU5ET1IsICdaZWtpJ10sIFtUWVBFLCBUQUJMRVRdXSwgW1xuXG4gICAgICAgICAgICAgIC8oYW5kcm9pZCkuK1s7XFwvXVxccysoW1lSXVxcZHsyfSlcXHMrYnVpbGQvaSxcbiAgICAgICAgICAgICAgL2FuZHJvaWQuK1s7XFwvXVxccysoRHJhZ29uW1xcLVxcc10rVG91Y2hcXHMrfERUKShcXHd7NX0pXFxzYnVpbGQvaSAgICAgICAgLy8gRHJhZ29uIFRvdWNoIFRhYmxldFxuICAgICAgICAgICAgICBdLCBbW1ZFTkRPUiwgJ0RyYWdvbiBUb3VjaCddLCBNT0RFTCwgW1RZUEUsIFRBQkxFVF1dLCBbXG5cbiAgICAgICAgICAgICAgL2FuZHJvaWQuK1s7XFwvXVxccyooTlMtP1xcd3swLDl9KVxcc2J1aWxkL2kgICAgICAgICAgICAgICAgICAgICAgICAgICAgLy8gSW5zaWduaWEgVGFibGV0c1xuICAgICAgICAgICAgICBdLCBbTU9ERUwsIFtWRU5ET1IsICdJbnNpZ25pYSddLCBbVFlQRSwgVEFCTEVUXV0sIFtcblxuICAgICAgICAgICAgICAvYW5kcm9pZC4rWztcXC9dXFxzKigoTlh8TmV4dCktP1xcd3swLDl9KVxccytidWlsZC9pICAgICAgICAgICAgICAgICAgICAvLyBOZXh0Qm9vayBUYWJsZXRzXG4gICAgICAgICAgICAgIF0sIFtNT0RFTCwgW1ZFTkRPUiwgJ05leHRCb29rJ10sIFtUWVBFLCBUQUJMRVRdXSwgW1xuXG4gICAgICAgICAgICAgIC9hbmRyb2lkLitbO1xcL11cXHMqKFh0cmVtZVxcXyk/KFYoMVswNDVdfDJbMDE1XXwzMHw0MHw2MHw3WzA1XXw5MCkpXFxzK2J1aWxkL2lcbiAgICAgICAgICAgICAgXSwgW1tWRU5ET1IsICdWb2ljZSddLCBNT0RFTCwgW1RZUEUsIE1PQklMRV1dLCBbICAgICAgICAgICAgICAgICAgICAvLyBWb2ljZSBYdHJlbWUgUGhvbmVzXG5cbiAgICAgICAgICAgICAgL2FuZHJvaWQuK1s7XFwvXVxccyooTFZURUxcXC0pPyhWMVsxMl0pXFxzK2J1aWxkL2kgICAgICAgICAgICAgICAgICAgICAvLyBMdlRlbCBQaG9uZXNcbiAgICAgICAgICAgICAgXSwgW1tWRU5ET1IsICdMdlRlbCddLCBNT0RFTCwgW1RZUEUsIE1PQklMRV1dLCBbXG5cbiAgICAgICAgICAgICAgL2FuZHJvaWQuKztcXHMoUEgtMSlcXHMvaVxuICAgICAgICAgICAgICBdLCBbTU9ERUwsIFtWRU5ET1IsICdFc3NlbnRpYWwnXSwgW1RZUEUsIE1PQklMRV1dLCBbICAgICAgICAgICAgICAgIC8vIEVzc2VudGlhbCBQSC0xXG5cbiAgICAgICAgICAgICAgL2FuZHJvaWQuK1s7XFwvXVxccyooVigxMDBNRHw3MDBOQXw3MDExfDkxN0cpLipcXGIpXFxzK2J1aWxkL2kgICAgICAgICAgLy8gRW52aXplbiBUYWJsZXRzXG4gICAgICAgICAgICAgIF0sIFtNT0RFTCwgW1ZFTkRPUiwgJ0Vudml6ZW4nXSwgW1RZUEUsIFRBQkxFVF1dLCBbXG5cbiAgICAgICAgICAgICAgL2FuZHJvaWQuK1s7XFwvXVxccyooTGVbXFxzXFwtXStQYW4pW1xcc1xcLV0rKFxcd3sxLDl9KVxccytidWlsZC9pICAgICAgICAgIC8vIExlIFBhbiBUYWJsZXRzXG4gICAgICAgICAgICAgIF0sIFtWRU5ET1IsIE1PREVMLCBbVFlQRSwgVEFCTEVUXV0sIFtcblxuICAgICAgICAgICAgICAvYW5kcm9pZC4rWztcXC9dXFxzKihUcmlvW1xcc1xcLV0qLiopXFxzK2J1aWxkL2kgICAgICAgICAgICAgICAgICAgICAgICAgLy8gTWFjaFNwZWVkIFRhYmxldHNcbiAgICAgICAgICAgICAgXSwgW01PREVMLCBbVkVORE9SLCAnTWFjaFNwZWVkJ10sIFtUWVBFLCBUQUJMRVRdXSwgW1xuXG4gICAgICAgICAgICAgIC9hbmRyb2lkLitbO1xcL11cXHMqKFRyaW5pdHkpW1xcLVxcc10qKFRcXGR7M30pXFxzK2J1aWxkL2kgICAgICAgICAgICAgICAgLy8gVHJpbml0eSBUYWJsZXRzXG4gICAgICAgICAgICAgIF0sIFtWRU5ET1IsIE1PREVMLCBbVFlQRSwgVEFCTEVUXV0sIFtcblxuICAgICAgICAgICAgICAvYW5kcm9pZC4rWztcXC9dXFxzKlRVXygxNDkxKVxccytidWlsZC9pICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIC8vIFJvdG9yIFRhYmxldHNcbiAgICAgICAgICAgICAgXSwgW01PREVMLCBbVkVORE9SLCAnUm90b3InXSwgW1RZUEUsIFRBQkxFVF1dLCBbXG5cbiAgICAgICAgICAgICAgL2FuZHJvaWQuKyhLUyguKykpXFxzK2J1aWxkL2kgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgLy8gQW1hem9uIEtpbmRsZSBUYWJsZXRzXG4gICAgICAgICAgICAgIF0sIFtNT0RFTCwgW1ZFTkRPUiwgJ0FtYXpvbiddLCBbVFlQRSwgVEFCTEVUXV0sIFtcblxuICAgICAgICAgICAgICAvYW5kcm9pZC4rKEdpZ2FzZXQpW1xcc1xcLV0rKFFcXHd7MSw5fSlcXHMrYnVpbGQvaSAgICAgICAgICAgICAgICAgICAgICAvLyBHaWdhc2V0IFRhYmxldHNcbiAgICAgICAgICAgICAgXSwgW1ZFTkRPUiwgTU9ERUwsIFtUWVBFLCBUQUJMRVRdXSwgW1xuXG4gICAgICAgICAgICAgIC9cXHModGFibGV0fHRhYilbO1xcL10vaSwgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAvLyBVbmlkZW50aWZpYWJsZSBUYWJsZXRcbiAgICAgICAgICAgICAgL1xccyhtb2JpbGUpKD86WztcXC9dfFxcc3NhZmFyaSkvaSAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAvLyBVbmlkZW50aWZpYWJsZSBNb2JpbGVcbiAgICAgICAgICAgICAgXSwgW1tUWVBFLCB1dGlsLmxvd2VyaXplXSwgVkVORE9SLCBNT0RFTF0sIFtcblxuICAgICAgICAgICAgICAvW1xcc1xcL1xcKF0oc21hcnQtP3R2KVs7XFwpXS9pICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAvLyBTbWFydFRWXG4gICAgICAgICAgICAgIF0sIFtbVFlQRSwgU01BUlRUVl1dLCBbXG5cbiAgICAgICAgICAgICAgLyhhbmRyb2lkW1xcd1xcLlxcc1xcLV17MCw5fSk7LitidWlsZC9pICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgLy8gR2VuZXJpYyBBbmRyb2lkIERldmljZVxuICAgICAgICAgICAgICBdLCBbTU9ERUwsIFtWRU5ET1IsICdHZW5lcmljJ11dXG5cblxuICAgICAgICAgIC8qLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy9cbiAgICAgICAgICAgICAgLy8gVE9ETzogbW92ZSB0byBzdHJpbmcgbWFwXG4gICAgICAgICAgICAgIC8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy9cblxuICAgICAgICAgICAgICAvKEM2NjAzKS9pICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIC8vIFNvbnkgWHBlcmlhIFogQzY2MDNcbiAgICAgICAgICAgICAgXSwgW1tNT0RFTCwgJ1hwZXJpYSBaIEM2NjAzJ10sIFtWRU5ET1IsICdTb255J10sIFtUWVBFLCBNT0JJTEVdXSwgW1xuICAgICAgICAgICAgICAvKEM2OTAzKS9pICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIC8vIFNvbnkgWHBlcmlhIFogMVxuICAgICAgICAgICAgICBdLCBbW01PREVMLCAnWHBlcmlhIFogMSddLCBbVkVORE9SLCAnU29ueSddLCBbVFlQRSwgTU9CSUxFXV0sIFtcblxuICAgICAgICAgICAgICAvKFNNLUc5MDBbRnxIXSkvaSAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIC8vIFNhbXN1bmcgR2FsYXh5IFM1XG4gICAgICAgICAgICAgIF0sIFtbTU9ERUwsICdHYWxheHkgUzUnXSwgW1ZFTkRPUiwgJ1NhbXN1bmcnXSwgW1RZUEUsIE1PQklMRV1dLCBbXG4gICAgICAgICAgICAgIC8oU00tRzcxMDIpL2kgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgLy8gU2Ftc3VuZyBHYWxheHkgR3JhbmQgMlxuICAgICAgICAgICAgICBdLCBbW01PREVMLCAnR2FsYXh5IEdyYW5kIDInXSwgW1ZFTkRPUiwgJ1NhbXN1bmcnXSwgW1RZUEUsIE1PQklMRV1dLCBbXG4gICAgICAgICAgICAgIC8oU00tRzUzMEgpL2kgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgLy8gU2Ftc3VuZyBHYWxheHkgR3JhbmQgUHJpbWVcbiAgICAgICAgICAgICAgXSwgW1tNT0RFTCwgJ0dhbGF4eSBHcmFuZCBQcmltZSddLCBbVkVORE9SLCAnU2Ftc3VuZyddLCBbVFlQRSwgTU9CSUxFXV0sIFtcbiAgICAgICAgICAgICAgLyhTTS1HMzEzSFopL2kgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAvLyBTYW1zdW5nIEdhbGF4eSBWXG4gICAgICAgICAgICAgIF0sIFtbTU9ERUwsICdHYWxheHkgViddLCBbVkVORE9SLCAnU2Ftc3VuZyddLCBbVFlQRSwgTU9CSUxFXV0sIFtcbiAgICAgICAgICAgICAgLyhTTS1UODA1KS9pICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAvLyBTYW1zdW5nIEdhbGF4eSBUYWIgUyAxMC41XG4gICAgICAgICAgICAgIF0sIFtbTU9ERUwsICdHYWxheHkgVGFiIFMgMTAuNSddLCBbVkVORE9SLCAnU2Ftc3VuZyddLCBbVFlQRSwgVEFCTEVUXV0sIFtcbiAgICAgICAgICAgICAgLyhTTS1HODAwRikvaSAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAvLyBTYW1zdW5nIEdhbGF4eSBTNSBNaW5pXG4gICAgICAgICAgICAgIF0sIFtbTU9ERUwsICdHYWxheHkgUzUgTWluaSddLCBbVkVORE9SLCAnU2Ftc3VuZyddLCBbVFlQRSwgTU9CSUxFXV0sIFtcbiAgICAgICAgICAgICAgLyhTTS1UMzExKS9pICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAvLyBTYW1zdW5nIEdhbGF4eSBUYWIgMyA4LjBcbiAgICAgICAgICAgICAgXSwgW1tNT0RFTCwgJ0dhbGF4eSBUYWIgMyA4LjAnXSwgW1ZFTkRPUiwgJ1NhbXN1bmcnXSwgW1RZUEUsIFRBQkxFVF1dLCBbXG5cbiAgICAgICAgICAgICAgLyhUM0MpL2kgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAvLyBBZHZhbiBWYW5kcm9pZCBUM0NcbiAgICAgICAgICAgICAgXSwgW01PREVMLCBbVkVORE9SLCAnQWR2YW4nXSwgW1RZUEUsIFRBQkxFVF1dLCBbXG4gICAgICAgICAgICAgIC8oQURWQU4gVDFKXFwrKS9pICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIC8vIEFkdmFuIFZhbmRyb2lkIFQxSitcbiAgICAgICAgICAgICAgXSwgW1tNT0RFTCwgJ1ZhbmRyb2lkIFQxSisnXSwgW1ZFTkRPUiwgJ0FkdmFuJ10sIFtUWVBFLCBUQUJMRVRdXSwgW1xuICAgICAgICAgICAgICAvKEFEVkFOIFM0QSkvaSAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIC8vIEFkdmFuIFZhbmRyb2lkIFM0QVxuICAgICAgICAgICAgICBdLCBbW01PREVMLCAnVmFuZHJvaWQgUzRBJ10sIFtWRU5ET1IsICdBZHZhbiddLCBbVFlQRSwgTU9CSUxFXV0sIFtcblxuICAgICAgICAgICAgICAvKFY5NzJNKS9pICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIC8vIFpURSBWOTcyTVxuICAgICAgICAgICAgICBdLCBbTU9ERUwsIFtWRU5ET1IsICdaVEUnXSwgW1RZUEUsIE1PQklMRV1dLCBbXG5cbiAgICAgICAgICAgICAgLyhpLW1vYmlsZSlcXHMoSVFcXHNbXFxkXFwuXSspL2kgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgLy8gaS1tb2JpbGUgSVFcbiAgICAgICAgICAgICAgXSwgW1ZFTkRPUiwgTU9ERUwsIFtUWVBFLCBNT0JJTEVdXSwgW1xuICAgICAgICAgICAgICAvKElRNi4zKS9pICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIC8vIGktbW9iaWxlIElRIElRIDYuM1xuICAgICAgICAgICAgICBdLCBbW01PREVMLCAnSVEgNi4zJ10sIFtWRU5ET1IsICdpLW1vYmlsZSddLCBbVFlQRSwgTU9CSUxFXV0sIFtcbiAgICAgICAgICAgICAgLyhpLW1vYmlsZSlcXHMoaS1zdHlsZVxcc1tcXGRcXC5dKykvaSAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgLy8gaS1tb2JpbGUgaS1TVFlMRVxuICAgICAgICAgICAgICBdLCBbVkVORE9SLCBNT0RFTCwgW1RZUEUsIE1PQklMRV1dLCBbXG4gICAgICAgICAgICAgIC8oaS1TVFlMRTIuMSkvaSAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgLy8gaS1tb2JpbGUgaS1TVFlMRSAyLjFcbiAgICAgICAgICAgICAgXSwgW1tNT0RFTCwgJ2ktU1RZTEUgMi4xJ10sIFtWRU5ET1IsICdpLW1vYmlsZSddLCBbVFlQRSwgTU9CSUxFXV0sIFtcblxuICAgICAgICAgICAgICAvKG1vYmlpc3RhciB0b3VjaCBMQUkgNTEyKS9pICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIC8vIG1vYmlpc3RhciB0b3VjaCBMQUkgNTEyXG4gICAgICAgICAgICAgIF0sIFtbTU9ERUwsICdUb3VjaCBMQUkgNTEyJ10sIFtWRU5ET1IsICdtb2JpaXN0YXInXSwgW1RZUEUsIE1PQklMRV1dLCBbXG5cbiAgICAgICAgICAgICAgLy8vLy8vLy8vLy8vL1xuICAgICAgICAgICAgICAvLyBFTkQgVE9ET1xuICAgICAgICAgICAgICAvLy8vLy8vLy8vLyovXG5cbiAgICAgICAgICBdLFxuXG4gICAgICAgICAgZW5naW5lIDogW1tcblxuICAgICAgICAgICAgICAvd2luZG93cy4rXFxzZWRnZVxcLyhbXFx3XFwuXSspL2kgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAvLyBFZGdlSFRNTFxuICAgICAgICAgICAgICBdLCBbVkVSU0lPTiwgW05BTUUsICdFZGdlSFRNTCddXSwgW1xuXG4gICAgICAgICAgICAgIC93ZWJraXRcXC81MzdcXC4zNi4rY2hyb21lXFwvKD8hMjcpL2kgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgLy8gQmxpbmtcbiAgICAgICAgICAgICAgXSwgW1tOQU1FLCAnQmxpbmsnXV0sIFtcblxuICAgICAgICAgICAgICAvKHByZXN0bylcXC8oW1xcd1xcLl0rKS9pLCAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIC8vIFByZXN0b1xuICAgICAgICAgICAgICAvKHdlYmtpdHx0cmlkZW50fG5ldGZyb250fG5ldHN1cmZ8YW1heWF8bHlueHx3M218Z29hbm5hKVxcLyhbXFx3XFwuXSspL2ksICAgICBcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAvLyBXZWJLaXQvVHJpZGVudC9OZXRGcm9udC9OZXRTdXJmL0FtYXlhL0x5bngvdzNtL0dvYW5uYVxuICAgICAgICAgICAgICAvKGtodG1sfHRhc21hbnxsaW5rcylbXFwvXFxzXVxcKD8oW1xcd1xcLl0rKS9pLCAgICAgICAgICAgICAgICAgICAgICAgICAgLy8gS0hUTUwvVGFzbWFuL0xpbmtzXG4gICAgICAgICAgICAgIC8oaWNhYilbXFwvXFxzXShbMjNdXFwuW1xcZFxcLl0rKS9pICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAvLyBpQ2FiXG4gICAgICAgICAgICAgIF0sIFtOQU1FLCBWRVJTSU9OXSwgW1xuXG4gICAgICAgICAgICAgIC9ydlxcOihbXFx3XFwuXXsxLDl9KS4rKGdlY2tvKS9pICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgLy8gR2Vja29cbiAgICAgICAgICAgICAgXSwgW1ZFUlNJT04sIE5BTUVdXG4gICAgICAgICAgXSxcblxuICAgICAgICAgIG9zIDogW1tcblxuICAgICAgICAgICAgICAvLyBXaW5kb3dzIGJhc2VkXG4gICAgICAgICAgICAgIC9taWNyb3NvZnRcXHMod2luZG93cylcXHModmlzdGF8eHApL2kgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAvLyBXaW5kb3dzIChpVHVuZXMpXG4gICAgICAgICAgICAgIF0sIFtOQU1FLCBWRVJTSU9OXSwgW1xuICAgICAgICAgICAgICAvKHdpbmRvd3MpXFxzbnRcXHM2XFwuMjtcXHMoYXJtKS9pLCAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAvLyBXaW5kb3dzIFJUXG4gICAgICAgICAgICAgIC8od2luZG93c1xcc3Bob25lKD86XFxzb3MpKilbXFxzXFwvXT8oW1xcZFxcLlxcc1xcd10qKS9pLCAgICAgICAgICAgICAgICAgICAvLyBXaW5kb3dzIFBob25lXG4gICAgICAgICAgICAgIC8od2luZG93c1xcc21vYmlsZXx3aW5kb3dzKVtcXHNcXC9dPyhbbnRjZVxcZFxcLlxcc10rXFx3KS9pXG4gICAgICAgICAgICAgIF0sIFtbTkFNRSwgbWFwcGVyLnN0ciwgbWFwcy5vcy53aW5kb3dzLm5hbWVdLCBbVkVSU0lPTiwgbWFwcGVyLnN0ciwgbWFwcy5vcy53aW5kb3dzLnZlcnNpb25dXSwgW1xuICAgICAgICAgICAgICAvKHdpbig/PTN8OXxuKXx3aW5cXHM5eFxccykoW250XFxkXFwuXSspL2lcbiAgICAgICAgICAgICAgXSwgW1tOQU1FLCAnV2luZG93cyddLCBbVkVSU0lPTiwgbWFwcGVyLnN0ciwgbWFwcy5vcy53aW5kb3dzLnZlcnNpb25dXSwgW1xuXG4gICAgICAgICAgICAgIC8vIE1vYmlsZS9FbWJlZGRlZCBPU1xuICAgICAgICAgICAgICAvXFwoKGJiKSgxMCk7L2kgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAvLyBCbGFja0JlcnJ5IDEwXG4gICAgICAgICAgICAgIF0sIFtbTkFNRSwgJ0JsYWNrQmVycnknXSwgVkVSU0lPTl0sIFtcbiAgICAgICAgICAgICAgLyhibGFja2JlcnJ5KVxcdypcXC8/KFtcXHdcXC5dKikvaSwgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgLy8gQmxhY2tiZXJyeVxuICAgICAgICAgICAgICAvKHRpemVuKVtcXC9cXHNdKFtcXHdcXC5dKykvaSwgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAvLyBUaXplblxuICAgICAgICAgICAgICAvKGFuZHJvaWR8d2Vib3N8cGFsbVxcc29zfHFueHxiYWRhfHJpbVxcc3RhYmxldFxcc29zfG1lZWdvfGNvbnRpa2kpW1xcL1xccy1dPyhbXFx3XFwuXSopL2ksXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgLy8gQW5kcm9pZC9XZWJPUy9QYWxtL1FOWC9CYWRhL1JJTS9NZWVHby9Db250aWtpXG4gICAgICAgICAgICAgIC9saW51eDsuKyhzYWlsZmlzaCk7L2kgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgLy8gU2FpbGZpc2ggT1NcbiAgICAgICAgICAgICAgXSwgW05BTUUsIFZFUlNJT05dLCBbXG4gICAgICAgICAgICAgIC8oc3ltYmlhblxccz9vc3xzeW1ib3N8czYwKD89OykpW1xcL1xccy1dPyhbXFx3XFwuXSopL2kgICAgICAgICAgICAgICAgICAvLyBTeW1iaWFuXG4gICAgICAgICAgICAgIF0sIFtbTkFNRSwgJ1N5bWJpYW4nXSwgVkVSU0lPTl0sIFtcbiAgICAgICAgICAgICAgL1xcKChzZXJpZXM0MCk7L2kgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgLy8gU2VyaWVzIDQwXG4gICAgICAgICAgICAgIF0sIFtOQU1FXSwgW1xuICAgICAgICAgICAgICAvbW96aWxsYS4rXFwobW9iaWxlOy4rZ2Vja28uK2ZpcmVmb3gvaSAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAvLyBGaXJlZm94IE9TXG4gICAgICAgICAgICAgIF0sIFtbTkFNRSwgJ0ZpcmVmb3ggT1MnXSwgVkVSU0lPTl0sIFtcblxuICAgICAgICAgICAgICAvLyBDb25zb2xlXG4gICAgICAgICAgICAgIC8obmludGVuZG98cGxheXN0YXRpb24pXFxzKFt3aWRzMzRwb3J0YWJsZXZ1XSspL2ksICAgICAgICAgICAgICAgICAgIC8vIE5pbnRlbmRvL1BsYXlzdGF0aW9uXG5cbiAgICAgICAgICAgICAgLy8gR05VL0xpbnV4IGJhc2VkXG4gICAgICAgICAgICAgIC8obWludClbXFwvXFxzXFwoXT8oXFx3KikvaSwgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIC8vIE1pbnRcbiAgICAgICAgICAgICAgLyhtYWdlaWF8dmVjdG9ybGludXgpWztcXHNdL2ksICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgLy8gTWFnZWlhL1ZlY3RvckxpbnV4XG4gICAgICAgICAgICAgIC8oam9saXxba3hsbl0/dWJ1bnR1fGRlYmlhbnxzdXNlfG9wZW5zdXNlfGdlbnRvb3woPz1cXHMpYXJjaHxzbGFja3dhcmV8ZmVkb3JhfG1hbmRyaXZhfGNlbnRvc3xwY2xpbnV4b3N8cmVkaGF0fHplbndhbGt8bGlucHVzKVtcXC9cXHMtXT8oPyFjaHJvbSkoW1xcd1xcLi1dKikvaSxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAvLyBKb2xpL1VidW50dS9EZWJpYW4vU1VTRS9HZW50b28vQXJjaC9TbGFja3dhcmVcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAvLyBGZWRvcmEvTWFuZHJpdmEvQ2VudE9TL1BDTGludXhPUy9SZWRIYXQvWmVud2Fsay9MaW5wdXNcbiAgICAgICAgICAgICAgLyhodXJkfGxpbnV4KVxccz8oW1xcd1xcLl0qKS9pLCAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAvLyBIdXJkL0xpbnV4XG4gICAgICAgICAgICAgIC8oZ251KVxccz8oW1xcd1xcLl0qKS9pICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgLy8gR05VXG4gICAgICAgICAgICAgIF0sIFtbTkFNRSwgJ0xpbnV4J10sIFZFUlNJT05dLCBbXG5cbiAgICAgICAgICAgICAgLyhjcm9zKVxcc1tcXHddK1xccyhbXFx3XFwuXStcXHcpL2kgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAvLyBDaHJvbWl1bSBPU1xuICAgICAgICAgICAgICBdLCBbW05BTUUsICdDaHJvbWl1bSBPUyddLCBWRVJTSU9OXSxbXG5cbiAgICAgICAgICAgICAgLy8gU29sYXJpc1xuICAgICAgICAgICAgICAvKHN1bm9zKVxccz8oW1xcd1xcLlxcZF0qKS9pICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAvLyBTb2xhcmlzXG4gICAgICAgICAgICAgIF0sIFtbTkFNRSwgJ1NvbGFyaXMnXSwgVkVSU0lPTl0sIFtcblxuICAgICAgICAgICAgICAvLyBCU0QgYmFzZWRcbiAgICAgICAgICAgICAgL1xccyhbZnJlbnRvcGMtXXswLDR9YnNkfGRyYWdvbmZseSlcXHM/KFtcXHdcXC5dKikvaSAgICAgICAgICAgICAgICAgICAgLy8gRnJlZUJTRC9OZXRCU0QvT3BlbkJTRC9QQy1CU0QvRHJhZ29uRmx5XG4gICAgICAgICAgICAgIF0sIFtbTkFNRSwgJ0xpbnV4J10sIFZFUlNJT05dLFtcblxuICAgICAgICAgICAgICAvKGlwaG9uZSkoPzouKm9zXFxzKihbXFx3XSopXFxzbGlrZVxcc21hY3w7XFxzb3BlcmEpL2kgICAgICAgICAgICAgICAgICAvLyBpT1NcbiAgICAgICAgICAgICAgXSwgW1tOQU1FLCAnaVBob25lJ10sIFtWRVJTSU9OLCAvXy9nLCAnLiddXSwgW1xuXG4gICAgICAgICAgICAgIC8oaXBhZCkoPzouKm9zXFxzKihbXFx3XSopXFxzbGlrZVxcc21hY3w7XFxzb3BlcmEpL2kgICAgICAgICAgICAgICAgICAgIC8vIGlPU1xuICAgICAgICAgICAgICBdLCBbW05BTUUsICdpUGFkJ10sIFtWRVJTSU9OLCAvXy9nLCAnLiddXSwgW1xuXG4gICAgICAgICAgICAgIC8oaGFpa3UpXFxzKFxcdyspL2kgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAvLyBIYWlrdVxuICAgICAgICAgICAgICBdLCBbTkFNRSwgVkVSU0lPTl0sW1xuXG4gICAgICAgICAgICAgIC9jZm5ldHdvcmtcXC8uK2Rhcndpbi9pLFxuICAgICAgICAgICAgICAvaXBbaG9uZWFkXXsyLDR9KD86Lipvc1xccyhbXFx3XSspXFxzbGlrZVxcc21hY3w7XFxzb3BlcmEpL2kgICAgICAgICAgICAgLy8gaU9TXG4gICAgICAgICAgICAgIF0sIFtbVkVSU0lPTiwgL18vZywgJy4nXSwgW05BTUUsICdpT1MnXV0sIFtcblxuICAgICAgICAgICAgICAvKG1hY1xcc29zXFxzeClcXHM/KFtcXHdcXHNcXC5dKikvaSxcbiAgICAgICAgICAgICAgLyhtYWNpbnRvc2h8bWFjKD89X3Bvd2VycGMpXFxzKS9pICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgLy8gTWFjIE9TXG4gICAgICAgICAgICAgIF0sIFtbTkFNRSwgJ01hYyddLCBbVkVSU0lPTiwgL18vZywgJy4nXV0sIFtcblxuICAgICAgICAgICAgICAvLyBPdGhlclxuICAgICAgICAgICAgICAvKCg/Om9wZW4pP3NvbGFyaXMpW1xcL1xccy1dPyhbXFx3XFwuXSopL2ksICAgICAgICAgICAgICAgICAgICAgICAgICAgICAvLyBTb2xhcmlzXG4gICAgICAgICAgICAgIC8oYWl4KVxccygoXFxkKSg/PVxcLnxcXCl8XFxzKVtcXHdcXC5dKSovaSwgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIC8vIEFJWFxuICAgICAgICAgICAgICAvKHBsYW5cXHM5fG1pbml4fGJlb3N8b3NcXC8yfGFtaWdhb3N8bW9ycGhvc3xyaXNjXFxzb3N8b3BlbnZtc3xmdWNoc2lhKS9pLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIC8vIFBsYW45L01pbml4L0JlT1MvT1MyL0FtaWdhT1MvTW9ycGhPUy9SSVNDT1MvT3BlblZNUy9GdWNoc2lhXG4gICAgICAgICAgICAgIC8odW5peClcXHM/KFtcXHdcXC5dKikvaSAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgLy8gVU5JWFxuICAgICAgICAgICAgICBdLCBbTkFNRSwgVkVSU0lPTl1cbiAgICAgICAgICBdXG4gICAgICB9O1xuXG5cbiAgICAgIC8vLy8vLy8vLy8vLy8vLy8vXG4gICAgICAvLyBDb25zdHJ1Y3RvclxuICAgICAgLy8vLy8vLy8vLy8vLy8vL1xuICAgICAgLypcbiAgICAgIHZhciBCcm93c2VyID0gZnVuY3Rpb24gKG5hbWUsIHZlcnNpb24pIHtcbiAgICAgICAgICB0aGlzW05BTUVdID0gbmFtZTtcbiAgICAgICAgICB0aGlzW1ZFUlNJT05dID0gdmVyc2lvbjtcbiAgICAgIH07XG4gICAgICB2YXIgQ1BVID0gZnVuY3Rpb24gKGFyY2gpIHtcbiAgICAgICAgICB0aGlzW0FSQ0hJVEVDVFVSRV0gPSBhcmNoO1xuICAgICAgfTtcbiAgICAgIHZhciBEZXZpY2UgPSBmdW5jdGlvbiAodmVuZG9yLCBtb2RlbCwgdHlwZSkge1xuICAgICAgICAgIHRoaXNbVkVORE9SXSA9IHZlbmRvcjtcbiAgICAgICAgICB0aGlzW01PREVMXSA9IG1vZGVsO1xuICAgICAgICAgIHRoaXNbVFlQRV0gPSB0eXBlO1xuICAgICAgfTtcbiAgICAgIHZhciBFbmdpbmUgPSBCcm93c2VyO1xuICAgICAgdmFyIE9TID0gQnJvd3NlcjtcbiAgICAgICovXG4gICAgICB2YXIgVUFQYXJzZXIgPSBmdW5jdGlvbiAodWFzdHJpbmcsIGV4dGVuc2lvbnMpIHtcblxuICAgICAgICAgIGlmICh0eXBlb2YgdWFzdHJpbmcgPT09ICdvYmplY3QnKSB7XG4gICAgICAgICAgICAgIGV4dGVuc2lvbnMgPSB1YXN0cmluZztcbiAgICAgICAgICAgICAgdWFzdHJpbmcgPSB1bmRlZmluZWQkMTtcbiAgICAgICAgICB9XG5cbiAgICAgICAgICBpZiAoISh0aGlzIGluc3RhbmNlb2YgVUFQYXJzZXIpKSB7XG4gICAgICAgICAgICAgIHJldHVybiBuZXcgVUFQYXJzZXIodWFzdHJpbmcsIGV4dGVuc2lvbnMpLmdldFJlc3VsdCgpO1xuICAgICAgICAgIH1cblxuICAgICAgICAgIHZhciB1YSA9IHVhc3RyaW5nIHx8ICgod2luZG93ICYmIHdpbmRvdy5uYXZpZ2F0b3IgJiYgd2luZG93Lm5hdmlnYXRvci51c2VyQWdlbnQpID8gd2luZG93Lm5hdmlnYXRvci51c2VyQWdlbnQgOiBFTVBUWSk7XG4gICAgICAgICAgdmFyIHJneG1hcCA9IGV4dGVuc2lvbnMgPyB1dGlsLmV4dGVuZChyZWdleGVzLCBleHRlbnNpb25zKSA6IHJlZ2V4ZXM7XG4gICAgICAgICAgLy92YXIgYnJvd3NlciA9IG5ldyBCcm93c2VyKCk7XG4gICAgICAgICAgLy92YXIgY3B1ID0gbmV3IENQVSgpO1xuICAgICAgICAgIC8vdmFyIGRldmljZSA9IG5ldyBEZXZpY2UoKTtcbiAgICAgICAgICAvL3ZhciBlbmdpbmUgPSBuZXcgRW5naW5lKCk7XG4gICAgICAgICAgLy92YXIgb3MgPSBuZXcgT1MoKTtcblxuICAgICAgICAgIHRoaXMuZ2V0QnJvd3NlciA9IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgICAgdmFyIGJyb3dzZXIgPSB7IG5hbWU6IHVuZGVmaW5lZCQxLCB2ZXJzaW9uOiB1bmRlZmluZWQkMSB9O1xuICAgICAgICAgICAgICBtYXBwZXIucmd4LmNhbGwoYnJvd3NlciwgdWEsIHJneG1hcC5icm93c2VyKTtcbiAgICAgICAgICAgICAgYnJvd3Nlci5tYWpvciA9IHV0aWwubWFqb3IoYnJvd3Nlci52ZXJzaW9uKTsgLy8gZGVwcmVjYXRlZFxuICAgICAgICAgICAgICByZXR1cm4gYnJvd3NlcjtcbiAgICAgICAgICB9O1xuICAgICAgICAgIHRoaXMuZ2V0Q1BVID0gZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgICB2YXIgY3B1ID0geyBhcmNoaXRlY3R1cmU6IHVuZGVmaW5lZCQxIH07XG4gICAgICAgICAgICAgIG1hcHBlci5yZ3guY2FsbChjcHUsIHVhLCByZ3htYXAuY3B1KTtcbiAgICAgICAgICAgICAgcmV0dXJuIGNwdTtcbiAgICAgICAgICB9O1xuICAgICAgICAgIHRoaXMuZ2V0RGV2aWNlID0gZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgICB2YXIgZGV2aWNlID0geyB2ZW5kb3I6IHVuZGVmaW5lZCQxLCBtb2RlbDogdW5kZWZpbmVkJDEsIHR5cGU6IHVuZGVmaW5lZCQxIH07XG4gICAgICAgICAgICAgIG1hcHBlci5yZ3guY2FsbChkZXZpY2UsIHVhLCByZ3htYXAuZGV2aWNlKTtcbiAgICAgICAgICAgICAgcmV0dXJuIGRldmljZTtcbiAgICAgICAgICB9O1xuICAgICAgICAgIHRoaXMuZ2V0RW5naW5lID0gZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgICB2YXIgZW5naW5lID0geyBuYW1lOiB1bmRlZmluZWQkMSwgdmVyc2lvbjogdW5kZWZpbmVkJDEgfTtcbiAgICAgICAgICAgICAgbWFwcGVyLnJneC5jYWxsKGVuZ2luZSwgdWEsIHJneG1hcC5lbmdpbmUpO1xuICAgICAgICAgICAgICByZXR1cm4gZW5naW5lO1xuICAgICAgICAgIH07XG4gICAgICAgICAgdGhpcy5nZXRPUyA9IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgICAgdmFyIG9zID0geyBuYW1lOiB1bmRlZmluZWQkMSwgdmVyc2lvbjogdW5kZWZpbmVkJDEgfTtcbiAgICAgICAgICAgICAgbWFwcGVyLnJneC5jYWxsKG9zLCB1YSwgcmd4bWFwLm9zKTtcbiAgICAgICAgICAgICAgcmV0dXJuIG9zO1xuICAgICAgICAgIH07XG4gICAgICAgICAgdGhpcy5nZXRSZXN1bHQgPSBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICAgIHJldHVybiB7XG4gICAgICAgICAgICAgICAgICB1YSAgICAgIDogdGhpcy5nZXRVQSgpLFxuICAgICAgICAgICAgICAgICAgYnJvd3NlciA6IHRoaXMuZ2V0QnJvd3NlcigpLFxuICAgICAgICAgICAgICAgICAgZW5naW5lICA6IHRoaXMuZ2V0RW5naW5lKCksXG4gICAgICAgICAgICAgICAgICBvcyAgICAgIDogdGhpcy5nZXRPUygpLFxuICAgICAgICAgICAgICAgICAgZGV2aWNlICA6IHRoaXMuZ2V0RGV2aWNlKCksXG4gICAgICAgICAgICAgICAgICBjcHUgICAgIDogdGhpcy5nZXRDUFUoKVxuICAgICAgICAgICAgICB9O1xuICAgICAgICAgIH07XG4gICAgICAgICAgdGhpcy5nZXRVQSA9IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgICAgcmV0dXJuIHVhO1xuICAgICAgICAgIH07XG4gICAgICAgICAgdGhpcy5zZXRVQSA9IGZ1bmN0aW9uICh1YXN0cmluZykge1xuICAgICAgICAgICAgICB1YSA9IHVhc3RyaW5nO1xuICAgICAgICAgICAgICAvL2Jyb3dzZXIgPSBuZXcgQnJvd3NlcigpO1xuICAgICAgICAgICAgICAvL2NwdSA9IG5ldyBDUFUoKTtcbiAgICAgICAgICAgICAgLy9kZXZpY2UgPSBuZXcgRGV2aWNlKCk7XG4gICAgICAgICAgICAgIC8vZW5naW5lID0gbmV3IEVuZ2luZSgpO1xuICAgICAgICAgICAgICAvL29zID0gbmV3IE9TKCk7XG4gICAgICAgICAgICAgIHJldHVybiB0aGlzO1xuICAgICAgICAgIH07XG4gICAgICAgICAgcmV0dXJuIHRoaXM7XG4gICAgICB9O1xuXG4gICAgICBVQVBhcnNlci5WRVJTSU9OID0gTElCVkVSU0lPTjtcbiAgICAgIFVBUGFyc2VyLkJST1dTRVIgPSB7XG4gICAgICAgICAgTkFNRSAgICA6IE5BTUUsXG4gICAgICAgICAgTUFKT1IgICA6IE1BSk9SLCAvLyBkZXByZWNhdGVkXG4gICAgICAgICAgVkVSU0lPTiA6IFZFUlNJT05cbiAgICAgIH07XG4gICAgICBVQVBhcnNlci5DUFUgPSB7XG4gICAgICAgICAgQVJDSElURUNUVVJFIDogQVJDSElURUNUVVJFXG4gICAgICB9O1xuICAgICAgVUFQYXJzZXIuREVWSUNFID0ge1xuICAgICAgICAgIE1PREVMICAgOiBNT0RFTCxcbiAgICAgICAgICBWRU5ET1IgIDogVkVORE9SLFxuICAgICAgICAgIFRZUEUgICAgOiBUWVBFLFxuICAgICAgICAgIENPTlNPTEUgOiBDT05TT0xFLFxuICAgICAgICAgIE1PQklMRSAgOiBNT0JJTEUsXG4gICAgICAgICAgU01BUlRUViA6IFNNQVJUVFYsXG4gICAgICAgICAgVEFCTEVUICA6IFRBQkxFVCxcbiAgICAgICAgICBXRUFSQUJMRTogV0VBUkFCTEUsXG4gICAgICAgICAgRU1CRURERUQ6IEVNQkVEREVEXG4gICAgICB9O1xuICAgICAgVUFQYXJzZXIuRU5HSU5FID0ge1xuICAgICAgICAgIE5BTUUgICAgOiBOQU1FLFxuICAgICAgICAgIFZFUlNJT04gOiBWRVJTSU9OXG4gICAgICB9O1xuICAgICAgVUFQYXJzZXIuT1MgPSB7XG4gICAgICAgICAgTkFNRSAgICA6IE5BTUUsXG4gICAgICAgICAgVkVSU0lPTiA6IFZFUlNJT05cbiAgICAgIH07XG4gICAgICAvL1VBUGFyc2VyLlV0aWxzID0gdXRpbDtcblxuICAgICAgLy8vLy8vLy8vLy9cbiAgICAgIC8vIEV4cG9ydFxuICAgICAgLy8vLy8vLy8vL1xuXG5cbiAgICAgIC8vIGNoZWNrIGpzIGVudmlyb25tZW50XG4gICAgICB7XG4gICAgICAgICAgLy8gbm9kZWpzIGVudlxuICAgICAgICAgIGlmIChtb2R1bGUuZXhwb3J0cykge1xuICAgICAgICAgICAgICBleHBvcnRzID0gbW9kdWxlLmV4cG9ydHMgPSBVQVBhcnNlcjtcbiAgICAgICAgICB9XG4gICAgICAgICAgLy8gVE9ETzogdGVzdCEhISEhISEhXG4gICAgICAgICAgLypcbiAgICAgICAgICBpZiAocmVxdWlyZSAmJiByZXF1aXJlLm1haW4gPT09IG1vZHVsZSAmJiBwcm9jZXNzKSB7XG4gICAgICAgICAgICAgIC8vIGNsaVxuICAgICAgICAgICAgICB2YXIganNvbml6ZSA9IGZ1bmN0aW9uIChhcnIpIHtcbiAgICAgICAgICAgICAgICAgIHZhciByZXMgPSBbXTtcbiAgICAgICAgICAgICAgICAgIGZvciAodmFyIGkgaW4gYXJyKSB7XG4gICAgICAgICAgICAgICAgICAgICAgcmVzLnB1c2gobmV3IFVBUGFyc2VyKGFycltpXSkuZ2V0UmVzdWx0KCkpO1xuICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgcHJvY2Vzcy5zdGRvdXQud3JpdGUoSlNPTi5zdHJpbmdpZnkocmVzLCBudWxsLCAyKSArICdcXG4nKTtcbiAgICAgICAgICAgICAgfTtcbiAgICAgICAgICAgICAgaWYgKHByb2Nlc3Muc3RkaW4uaXNUVFkpIHtcbiAgICAgICAgICAgICAgICAgIC8vIHZpYSBhcmdzXG4gICAgICAgICAgICAgICAgICBqc29uaXplKHByb2Nlc3MuYXJndi5zbGljZSgyKSk7XG4gICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAvLyB2aWEgcGlwZVxuICAgICAgICAgICAgICAgICAgdmFyIHN0ciA9ICcnO1xuICAgICAgICAgICAgICAgICAgcHJvY2Vzcy5zdGRpbi5vbigncmVhZGFibGUnLCBmdW5jdGlvbigpIHtcbiAgICAgICAgICAgICAgICAgICAgICB2YXIgcmVhZCA9IHByb2Nlc3Muc3RkaW4ucmVhZCgpO1xuICAgICAgICAgICAgICAgICAgICAgIGlmIChyZWFkICE9PSBudWxsKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgIHN0ciArPSByZWFkO1xuICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICAgICAgcHJvY2Vzcy5zdGRpbi5vbignZW5kJywgZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgICAgICAgICAgIGpzb25pemUoc3RyLnJlcGxhY2UoL1xcbiQvLCAnJykuc3BsaXQoJ1xcbicpKTtcbiAgICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICB9XG4gICAgICAgICAgfVxuICAgICAgICAgICovXG4gICAgICAgICAgZXhwb3J0cy5VQVBhcnNlciA9IFVBUGFyc2VyO1xuICAgICAgfVxuXG4gICAgICAvLyBqUXVlcnkvWmVwdG8gc3BlY2lmaWMgKG9wdGlvbmFsKVxuICAgICAgLy8gTm90ZTpcbiAgICAgIC8vICAgSW4gQU1EIGVudiB0aGUgZ2xvYmFsIHNjb3BlIHNob3VsZCBiZSBrZXB0IGNsZWFuLCBidXQgalF1ZXJ5IGlzIGFuIGV4Y2VwdGlvbi5cbiAgICAgIC8vICAgalF1ZXJ5IGFsd2F5cyBleHBvcnRzIHRvIGdsb2JhbCBzY29wZSwgdW5sZXNzIGpRdWVyeS5ub0NvbmZsaWN0KHRydWUpIGlzIHVzZWQsXG4gICAgICAvLyAgIGFuZCB3ZSBzaG91bGQgY2F0Y2ggdGhhdC5cbiAgICAgIHZhciAkID0gd2luZG93ICYmICh3aW5kb3cualF1ZXJ5IHx8IHdpbmRvdy5aZXB0byk7XG4gICAgICBpZiAodHlwZW9mICQgIT09IFVOREVGX1RZUEUgJiYgISQudWEpIHtcbiAgICAgICAgICB2YXIgcGFyc2VyID0gbmV3IFVBUGFyc2VyKCk7XG4gICAgICAgICAgJC51YSA9IHBhcnNlci5nZXRSZXN1bHQoKTtcbiAgICAgICAgICAkLnVhLmdldCA9IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgICAgcmV0dXJuIHBhcnNlci5nZXRVQSgpO1xuICAgICAgICAgIH07XG4gICAgICAgICAgJC51YS5zZXQgPSBmdW5jdGlvbiAodWFzdHJpbmcpIHtcbiAgICAgICAgICAgICAgcGFyc2VyLnNldFVBKHVhc3RyaW5nKTtcbiAgICAgICAgICAgICAgdmFyIHJlc3VsdCA9IHBhcnNlci5nZXRSZXN1bHQoKTtcbiAgICAgICAgICAgICAgZm9yICh2YXIgcHJvcCBpbiByZXN1bHQpIHtcbiAgICAgICAgICAgICAgICAgICQudWFbcHJvcF0gPSByZXN1bHRbcHJvcF07XG4gICAgICAgICAgICAgIH1cbiAgICAgICAgICB9O1xuICAgICAgfVxuXG4gIH0pKHR5cGVvZiB3aW5kb3cgPT09ICdvYmplY3QnID8gd2luZG93IDogY29tbW9uanNHbG9iYWwpO1xuICB9KTtcbiAgdmFyIHVhUGFyc2VyXzEgPSB1YVBhcnNlci5VQVBhcnNlcjtcblxuICAvKiBqc2hpbnQgYml0d2lzZTogZmFsc2UsIGxheGJyZWFrOiB0cnVlICovXG5cbiAgLyoqXG4gICAqIFNvdXJjZTogW2plZCdzIGdpc3Rde0BsaW5rIGh0dHBzOi8vZ2lzdC5naXRodWIuY29tLzk4Mjg4M30uXG4gICAqIFJldHVybnMgYSByYW5kb20gdjQgVVVJRCBvZiB0aGUgZm9ybSB4eHh4eHh4eC14eHh4LTR4eHgteXh4eC14eHh4eHh4eHh4eHgsXG4gICAqIHdoZXJlIGVhY2ggeCBpcyByZXBsYWNlZCB3aXRoIGEgcmFuZG9tIGhleGFkZWNpbWFsIGRpZ2l0IGZyb20gMCB0byBmLCBhbmRcbiAgICogeSBpcyByZXBsYWNlZCB3aXRoIGEgcmFuZG9tIGhleGFkZWNpbWFsIGRpZ2l0IGZyb20gOCB0byBiLlxuICAgKiBVc2VkIHRvIGdlbmVyYXRlIFVVSURzIGZvciBkZXZpY2VJZHMuXG4gICAqIEBwcml2YXRlXG4gICAqL1xuICB2YXIgdXVpZCA9IGZ1bmN0aW9uIHV1aWQoYSkge1xuICAgIHJldHVybiBhIC8vIGlmIHRoZSBwbGFjZWhvbGRlciB3YXMgcGFzc2VkLCByZXR1cm5cbiAgICA/ICggLy8gYSByYW5kb20gbnVtYmVyIGZyb20gMCB0byAxNVxuICAgIGEgXiAvLyB1bmxlc3MgYiBpcyA4LFxuICAgIE1hdGgucmFuZG9tKCkgLy8gaW4gd2hpY2ggY2FzZVxuICAgICogMTYgLy8gYSByYW5kb20gbnVtYmVyIGZyb21cbiAgICA+PiBhIC8gNCAvLyA4IHRvIDExXG4gICAgKS50b1N0cmluZygxNikgLy8gaW4gaGV4YWRlY2ltYWxcbiAgICA6ICggLy8gb3Igb3RoZXJ3aXNlIGEgY29uY2F0ZW5hdGVkIHN0cmluZzpcbiAgICBbMWU3XSArIC8vIDEwMDAwMDAwICtcbiAgICAtMWUzICsgLy8gLTEwMDAgK1xuICAgIC00ZTMgKyAvLyAtNDAwMCArXG4gICAgLThlMyArIC8vIC04MDAwMDAwMCArXG4gICAgLTFlMTEgLy8gLTEwMDAwMDAwMDAwMCxcbiAgICApLnJlcGxhY2UoIC8vIHJlcGxhY2luZ1xuICAgIC9bMDE4XS9nLCAvLyB6ZXJvZXMsIG9uZXMsIGFuZCBlaWdodHMgd2l0aFxuICAgIHV1aWQgLy8gcmFuZG9tIGhleCBkaWdpdHNcbiAgICApO1xuICB9O1xuXG4gIC8vIEEgVVJMIHNhZmUgdmFyaWF0aW9uIG9uIHRoZSB0aGUgbGlzdCBvZiBCYXNlNjQgY2hhcmFjdGVycyBcbiAgdmFyIGJhc2U2NENoYXJzID0gJ0FCQ0RFRkdISUpLTE1OT1BRUlNUVVZXWFlaYWJjZGVmZ2hpamtsbW5vcHFyc3R1dnd4eXowMTIzNDU2Nzg5LV8nO1xuXG4gIHZhciBiYXNlNjRJZCA9IGZ1bmN0aW9uIGJhc2U2NElkKCkge1xuICAgIHZhciBzdHIgPSAnJztcblxuICAgIGZvciAodmFyIGkgPSAwOyBpIDwgMjI7ICsraSkge1xuICAgICAgc3RyICs9IGJhc2U2NENoYXJzLmNoYXJBdChNYXRoLmZsb29yKE1hdGgucmFuZG9tKCkgKiA2NCkpO1xuICAgIH1cblxuICAgIHJldHVybiBzdHI7XG4gIH07XG5cbiAgdmFyIHZlcnNpb24gPSBcIjYuMi4wXCI7XG5cbiAgdmFyIGdldExhbmd1YWdlID0gZnVuY3Rpb24gZ2V0TGFuZ3VhZ2UoKSB7XG4gICAgcmV0dXJuIG5hdmlnYXRvciAmJiAobmF2aWdhdG9yLmxhbmd1YWdlcyAmJiBuYXZpZ2F0b3IubGFuZ3VhZ2VzWzBdIHx8IG5hdmlnYXRvci5sYW5ndWFnZSB8fCBuYXZpZ2F0b3IudXNlckxhbmd1YWdlKSB8fCAnJztcbiAgfTtcblxuICB2YXIgbGFuZ3VhZ2UgPSB7XG4gICAgZ2V0TGFuZ3VhZ2U6IGdldExhbmd1YWdlXG4gIH07XG5cbiAgdmFyIHBsYXRmb3JtID0gJ1dlYic7XG5cbiAgdmFyIERFRkFVTFRfT1BUSU9OUyA9IHtcbiAgICBhcGlFbmRwb2ludDogJ2FwaS5hbXBsaXR1ZGUuY29tJyxcbiAgICBiYXRjaEV2ZW50czogZmFsc2UsXG4gICAgY29va2llRXhwaXJhdGlvbjogMzY1ICogMTAsXG4gICAgY29va2llTmFtZTogJ2FtcGxpdHVkZV9pZCcsXG4gICAgLy8gdGhpcyBpcyBhIGRlcHJlY2F0ZWQgb3B0aW9uXG4gICAgc2FtZVNpdGVDb29raWU6ICdOb25lJyxcbiAgICBjb29raWVGb3JjZVVwZ3JhZGU6IGZhbHNlLFxuICAgIGRlZmVySW5pdGlhbGl6YXRpb246IGZhbHNlLFxuICAgIGRpc2FibGVDb29raWVzOiBmYWxzZSxcbiAgICBkZXZpY2VJZEZyb21VcmxQYXJhbTogZmFsc2UsXG4gICAgZG9tYWluOiAnJyxcbiAgICBldmVudFVwbG9hZFBlcmlvZE1pbGxpczogMzAgKiAxMDAwLFxuICAgIC8vIDMwc1xuICAgIGV2ZW50VXBsb2FkVGhyZXNob2xkOiAzMCxcbiAgICBmb3JjZUh0dHBzOiB0cnVlLFxuICAgIGluY2x1ZGVHY2xpZDogZmFsc2UsXG4gICAgaW5jbHVkZVJlZmVycmVyOiBmYWxzZSxcbiAgICBpbmNsdWRlVXRtOiBmYWxzZSxcbiAgICBsYW5ndWFnZTogbGFuZ3VhZ2UuZ2V0TGFuZ3VhZ2UoKSxcbiAgICBsb2dMZXZlbDogJ1dBUk4nLFxuICAgIG9wdE91dDogZmFsc2UsXG4gICAgb25FcnJvcjogZnVuY3Rpb24gb25FcnJvcigpIHt9LFxuICAgIHBsYXRmb3JtOiBwbGF0Zm9ybSxcbiAgICBzYXZlZE1heENvdW50OiAxMDAwLFxuICAgIHNhdmVFdmVudHM6IHRydWUsXG4gICAgc2F2ZVBhcmFtc1JlZmVycmVyT25jZVBlclNlc3Npb246IHRydWUsXG4gICAgc2VjdXJlQ29va2llOiBmYWxzZSxcbiAgICBzZXNzaW9uVGltZW91dDogMzAgKiA2MCAqIDEwMDAsXG4gICAgdHJhY2tpbmdPcHRpb25zOiB7XG4gICAgICBjaXR5OiB0cnVlLFxuICAgICAgY291bnRyeTogdHJ1ZSxcbiAgICAgIGNhcnJpZXI6IHRydWUsXG4gICAgICBkZXZpY2VfbWFudWZhY3R1cmVyOiB0cnVlLFxuICAgICAgZGV2aWNlX21vZGVsOiB0cnVlLFxuICAgICAgZG1hOiB0cnVlLFxuICAgICAgaXBfYWRkcmVzczogdHJ1ZSxcbiAgICAgIGxhbmd1YWdlOiB0cnVlLFxuICAgICAgb3NfbmFtZTogdHJ1ZSxcbiAgICAgIG9zX3ZlcnNpb246IHRydWUsXG4gICAgICBwbGF0Zm9ybTogdHJ1ZSxcbiAgICAgIHJlZ2lvbjogdHJ1ZSxcbiAgICAgIHZlcnNpb25fbmFtZTogdHJ1ZVxuICAgIH0sXG4gICAgdW5zZXRQYXJhbXNSZWZlcnJlck9uTmV3U2Vzc2lvbjogZmFsc2UsXG4gICAgdW5zZW50S2V5OiAnYW1wbGl0dWRlX3Vuc2VudCcsXG4gICAgdW5zZW50SWRlbnRpZnlLZXk6ICdhbXBsaXR1ZGVfdW5zZW50X2lkZW50aWZ5JyxcbiAgICB1cGxvYWRCYXRjaFNpemU6IDEwMFxuICB9O1xuXG4gIHZhciBBc3luY1N0b3JhZ2U7XG4gIHZhciBEZXZpY2VJbmZvO1xuICAvKipcbiAgICogQW1wbGl0dWRlQ2xpZW50IFNESyBBUEkgLSBpbnN0YW5jZSBjb25zdHJ1Y3Rvci5cbiAgICogVGhlIEFtcGxpdHVkZSBjbGFzcyBoYW5kbGVzIGNyZWF0aW9uIG9mIGNsaWVudCBpbnN0YW5jZXMsIGFsbCB5b3UgbmVlZCB0byBkbyBpcyBjYWxsIGFtcGxpdHVkZS5nZXRJbnN0YW5jZSgpXG4gICAqIEBjb25zdHJ1Y3RvciBBbXBsaXR1ZGVDbGllbnRcbiAgICogQHB1YmxpY1xuICAgKiBAZXhhbXBsZSB2YXIgYW1wbGl0dWRlQ2xpZW50ID0gbmV3IEFtcGxpdHVkZUNsaWVudCgpO1xuICAgKi9cblxuXG4gIHZhciBBbXBsaXR1ZGVDbGllbnQgPSBmdW5jdGlvbiBBbXBsaXR1ZGVDbGllbnQoaW5zdGFuY2VOYW1lKSB7XG4gICAgdGhpcy5faW5zdGFuY2VOYW1lID0gdXRpbHMuaXNFbXB0eVN0cmluZyhpbnN0YW5jZU5hbWUpID8gQ29uc3RhbnRzLkRFRkFVTFRfSU5TVEFOQ0UgOiBpbnN0YW5jZU5hbWUudG9Mb3dlckNhc2UoKTtcbiAgICB0aGlzLl91bnNlbnRFdmVudHMgPSBbXTtcbiAgICB0aGlzLl91bnNlbnRJZGVudGlmeXMgPSBbXTtcbiAgICB0aGlzLl91YSA9IG5ldyB1YVBhcnNlcihuYXZpZ2F0b3IudXNlckFnZW50KS5nZXRSZXN1bHQoKTtcbiAgICB0aGlzLm9wdGlvbnMgPSBfb2JqZWN0U3ByZWFkKHt9LCBERUZBVUxUX09QVElPTlMsIHtcbiAgICAgIHRyYWNraW5nT3B0aW9uczogX29iamVjdFNwcmVhZCh7fSwgREVGQVVMVF9PUFRJT05TLnRyYWNraW5nT3B0aW9ucylcbiAgICB9KTtcbiAgICB0aGlzLmNvb2tpZVN0b3JhZ2UgPSBuZXcgY29va2llU3RvcmFnZSgpLmdldFN0b3JhZ2UoKTtcbiAgICB0aGlzLl9xID0gW107IC8vIHF1ZXVlIGZvciBwcm94aWVkIGZ1bmN0aW9ucyBiZWZvcmUgc2NyaXB0IGxvYWRcblxuICAgIHRoaXMuX3NlbmRpbmcgPSBmYWxzZTtcbiAgICB0aGlzLl91cGRhdGVTY2hlZHVsZWQgPSBmYWxzZTtcbiAgICB0aGlzLl9vbkluaXQgPSBbXTsgLy8gZXZlbnQgbWV0YSBkYXRhXG5cbiAgICB0aGlzLl9ldmVudElkID0gMDtcbiAgICB0aGlzLl9pZGVudGlmeUlkID0gMDtcbiAgICB0aGlzLl9sYXN0RXZlbnRUaW1lID0gbnVsbDtcbiAgICB0aGlzLl9uZXdTZXNzaW9uID0gZmFsc2U7XG4gICAgdGhpcy5fc2VxdWVuY2VOdW1iZXIgPSAwO1xuICAgIHRoaXMuX3Nlc3Npb25JZCA9IG51bGw7XG4gICAgdGhpcy5faXNJbml0aWFsaXplZCA9IGZhbHNlO1xuICAgIHRoaXMuX3VzZXJBZ2VudCA9IG5hdmlnYXRvciAmJiBuYXZpZ2F0b3IudXNlckFnZW50IHx8IG51bGw7XG4gIH07XG5cbiAgQW1wbGl0dWRlQ2xpZW50LnByb3RvdHlwZS5JZGVudGlmeSA9IElkZW50aWZ5O1xuICBBbXBsaXR1ZGVDbGllbnQucHJvdG90eXBlLlJldmVudWUgPSBSZXZlbnVlO1xuICAvKipcbiAgICogSW5pdGlhbGl6ZXMgdGhlIEFtcGxpdHVkZSBKYXZhc2NyaXB0IFNESyB3aXRoIHlvdXIgYXBpS2V5IGFuZCBhbnkgb3B0aW9uYWwgY29uZmlndXJhdGlvbnMuXG4gICAqIFRoaXMgaXMgcmVxdWlyZWQgYmVmb3JlIGFueSBvdGhlciBtZXRob2RzIGNhbiBiZSBjYWxsZWQuXG4gICAqIEBwdWJsaWNcbiAgICogQHBhcmFtIHtzdHJpbmd9IGFwaUtleSAtIFRoZSBBUEkga2V5IGZvciB5b3VyIGFwcC5cbiAgICogQHBhcmFtIHtzdHJpbmd9IG9wdF91c2VySWQgLSAob3B0aW9uYWwpIEFuIGlkZW50aWZpZXIgZm9yIHRoaXMgdXNlci5cbiAgICogQHBhcmFtIHtvYmplY3R9IG9wdF9jb25maWcgLSAob3B0aW9uYWwpIENvbmZpZ3VyYXRpb24gb3B0aW9ucy5cbiAgICogU2VlIFtSZWFkbWVde0BsaW5rIGh0dHBzOi8vZ2l0aHViLmNvbS9hbXBsaXR1ZGUvQW1wbGl0dWRlLUphdmFzY3JpcHQjY29uZmlndXJhdGlvbi1vcHRpb25zfSBmb3IgbGlzdCBvZiBvcHRpb25zIGFuZCBkZWZhdWx0IHZhbHVlcy5cbiAgICogQHBhcmFtIHtmdW5jdGlvbn0gb3B0X2NhbGxiYWNrIC0gKG9wdGlvbmFsKSBQcm92aWRlIGEgY2FsbGJhY2sgZnVuY3Rpb24gdG8gcnVuIGFmdGVyIGluaXRpYWxpemF0aW9uIGlzIGNvbXBsZXRlLlxuICAgKiBAZXhhbXBsZSBhbXBsaXR1ZGVDbGllbnQuaW5pdCgnQVBJX0tFWScsICdVU0VSX0lEJywge2luY2x1ZGVSZWZlcnJlcjogdHJ1ZSwgaW5jbHVkZVV0bTogdHJ1ZX0sIGZ1bmN0aW9uKCkgeyBhbGVydCgnaW5pdCBjb21wbGV0ZScpOyB9KTtcbiAgICovXG5cbiAgQW1wbGl0dWRlQ2xpZW50LnByb3RvdHlwZS5pbml0ID0gZnVuY3Rpb24gaW5pdChhcGlLZXksIG9wdF91c2VySWQsIG9wdF9jb25maWcsIG9wdF9jYWxsYmFjaykge1xuICAgIHZhciBfdGhpcyA9IHRoaXM7XG5cbiAgICBpZiAodHlwZShhcGlLZXkpICE9PSAnc3RyaW5nJyB8fCB1dGlscy5pc0VtcHR5U3RyaW5nKGFwaUtleSkpIHtcbiAgICAgIHV0aWxzLmxvZy5lcnJvcignSW52YWxpZCBhcGlLZXkuIFBsZWFzZSByZS1pbml0aWFsaXplIHdpdGggYSB2YWxpZCBhcGlLZXknKTtcbiAgICAgIHJldHVybjtcbiAgICB9XG5cbiAgICB0cnkge1xuICAgICAgX3BhcnNlQ29uZmlnKHRoaXMub3B0aW9ucywgb3B0X2NvbmZpZyk7XG5cbiAgICAgIGlmICh0aGlzLm9wdGlvbnMuY29va2llTmFtZSAhPT0gREVGQVVMVF9PUFRJT05TLmNvb2tpZU5hbWUpIHtcbiAgICAgICAgdXRpbHMubG9nLndhcm4oJ1RoZSBjb29raWVOYW1lIG9wdGlvbiBpcyBkZXByZWNhdGVkLiBXZSB3aWxsIGJlIGlnbm9yaW5nIGl0IGZvciBuZXdlciBjb29raWVzJyk7XG4gICAgICB9XG5cbiAgICAgIHRoaXMub3B0aW9ucy5hcGlLZXkgPSBhcGlLZXk7XG4gICAgICB0aGlzLl9zdG9yYWdlU3VmZml4ID0gJ18nICsgYXBpS2V5ICsgKHRoaXMuX2luc3RhbmNlTmFtZSA9PT0gQ29uc3RhbnRzLkRFRkFVTFRfSU5TVEFOQ0UgPyAnJyA6ICdfJyArIHRoaXMuX2luc3RhbmNlTmFtZSk7XG4gICAgICB0aGlzLl9zdG9yYWdlU3VmZml4VjUgPSBhcGlLZXkuc2xpY2UoMCwgNik7XG4gICAgICB0aGlzLl9vbGRDb29raWVuYW1lID0gdGhpcy5vcHRpb25zLmNvb2tpZU5hbWUgKyB0aGlzLl9zdG9yYWdlU3VmZml4O1xuICAgICAgdGhpcy5fdW5zZW50S2V5ID0gdGhpcy5vcHRpb25zLnVuc2VudEtleSArIHRoaXMuX3N0b3JhZ2VTdWZmaXg7XG4gICAgICB0aGlzLl91bnNlbnRJZGVudGlmeUtleSA9IHRoaXMub3B0aW9ucy51bnNlbnRJZGVudGlmeUtleSArIHRoaXMuX3N0b3JhZ2VTdWZmaXg7XG4gICAgICB0aGlzLl9jb29raWVOYW1lID0gQ29uc3RhbnRzLkNPT0tJRV9QUkVGSVggKyAnXycgKyB0aGlzLl9zdG9yYWdlU3VmZml4VjU7XG4gICAgICB0aGlzLmNvb2tpZVN0b3JhZ2Uub3B0aW9ucyh7XG4gICAgICAgIGV4cGlyYXRpb25EYXlzOiB0aGlzLm9wdGlvbnMuY29va2llRXhwaXJhdGlvbixcbiAgICAgICAgZG9tYWluOiB0aGlzLm9wdGlvbnMuZG9tYWluLFxuICAgICAgICBzZWN1cmU6IHRoaXMub3B0aW9ucy5zZWN1cmVDb29raWUsXG4gICAgICAgIHNhbWVTaXRlOiB0aGlzLm9wdGlvbnMuc2FtZVNpdGVDb29raWVcbiAgICAgIH0pO1xuICAgICAgdGhpcy5fbWV0YWRhdGFTdG9yYWdlID0gbmV3IE1ldGFkYXRhU3RvcmFnZSh7XG4gICAgICAgIHN0b3JhZ2VLZXk6IHRoaXMuX2Nvb2tpZU5hbWUsXG4gICAgICAgIGRpc2FibGVDb29raWVzOiB0aGlzLm9wdGlvbnMuZGlzYWJsZUNvb2tpZXMsXG4gICAgICAgIGV4cGlyYXRpb25EYXlzOiB0aGlzLm9wdGlvbnMuY29va2llRXhwaXJhdGlvbixcbiAgICAgICAgZG9tYWluOiB0aGlzLm9wdGlvbnMuZG9tYWluLFxuICAgICAgICBzZWN1cmU6IHRoaXMub3B0aW9ucy5zZWN1cmVDb29raWUsXG4gICAgICAgIHNhbWVTaXRlOiB0aGlzLm9wdGlvbnMuc2FtZVNpdGVDb29raWVcbiAgICAgIH0pO1xuICAgICAgdmFyIGhhc09sZENvb2tpZSA9ICEhdGhpcy5jb29raWVTdG9yYWdlLmdldCh0aGlzLl9vbGRDb29raWVuYW1lKTtcbiAgICAgIHZhciBoYXNOZXdDb29raWUgPSAhIXRoaXMuX21ldGFkYXRhU3RvcmFnZS5sb2FkKCk7XG4gICAgICB0aGlzLl91c2VPbGRDb29raWUgPSAhaGFzTmV3Q29va2llICYmIGhhc09sZENvb2tpZSAmJiAhdGhpcy5vcHRpb25zLmNvb2tpZUZvcmNlVXBncmFkZTtcbiAgICAgIHZhciBoYXNDb29raWUgPSBoYXNOZXdDb29raWUgfHwgaGFzT2xkQ29va2llO1xuICAgICAgdGhpcy5vcHRpb25zLmRvbWFpbiA9IHRoaXMuY29va2llU3RvcmFnZS5vcHRpb25zKCkuZG9tYWluO1xuXG4gICAgICBpZiAodGhpcy5vcHRpb25zLmRlZmVySW5pdGlhbGl6YXRpb24gJiYgIWhhc0Nvb2tpZSkge1xuICAgICAgICB0aGlzLl9kZWZlckluaXRpYWxpemF0aW9uKGFwaUtleSwgb3B0X3VzZXJJZCwgb3B0X2NvbmZpZywgb3B0X2NhbGxiYWNrKTtcblxuICAgICAgICByZXR1cm47XG4gICAgICB9XG5cbiAgICAgIGlmICh0eXBlKHRoaXMub3B0aW9ucy5sb2dMZXZlbCkgPT09ICdzdHJpbmcnKSB7XG4gICAgICAgIHV0aWxzLnNldExvZ0xldmVsKHRoaXMub3B0aW9ucy5sb2dMZXZlbCk7XG4gICAgICB9XG5cbiAgICAgIHZhciB0cmFja2luZ09wdGlvbnMgPSBfZ2VuZXJhdGVBcGlQcm9wZXJ0aWVzVHJhY2tpbmdDb25maWcodGhpcyk7XG5cbiAgICAgIHRoaXMuX2FwaVByb3BlcnRpZXNUcmFja2luZ09wdGlvbnMgPSBPYmplY3Qua2V5cyh0cmFja2luZ09wdGlvbnMpLmxlbmd0aCA+IDAgPyB7XG4gICAgICAgIHRyYWNraW5nX29wdGlvbnM6IHRyYWNraW5nT3B0aW9uc1xuICAgICAgfSA6IHt9O1xuXG4gICAgICBpZiAodGhpcy5vcHRpb25zLmNvb2tpZUZvcmNlVXBncmFkZSAmJiBoYXNPbGRDb29raWUpIHtcbiAgICAgICAgaWYgKCFoYXNOZXdDb29raWUpIHtcbiAgICAgICAgICBfdXBncmFkZUNvb2tpZURhdGEodGhpcyk7XG4gICAgICAgIH1cblxuICAgICAgICB0aGlzLmNvb2tpZVN0b3JhZ2UucmVtb3ZlKHRoaXMuX29sZENvb2tpZW5hbWUpO1xuICAgICAgfVxuXG4gICAgICBfbG9hZENvb2tpZURhdGEodGhpcyk7XG5cbiAgICAgIHRoaXMuX3BlbmRpbmdSZWFkU3RvcmFnZSA9IHRydWU7XG5cbiAgICAgIHZhciBpbml0RnJvbVN0b3JhZ2UgPSBmdW5jdGlvbiBpbml0RnJvbVN0b3JhZ2UoZGV2aWNlSWQpIHtcbiAgICAgICAgLy8gbG9hZCBkZXZpY2VJZCBhbmQgdXNlcklkIGZyb20gaW5wdXQsIG9yIHRyeSB0byBmZXRjaCBleGlzdGluZyB2YWx1ZSBmcm9tIGNvb2tpZVxuICAgICAgICBfdGhpcy5vcHRpb25zLmRldmljZUlkID0gdHlwZShvcHRfY29uZmlnKSA9PT0gJ29iamVjdCcgJiYgdHlwZShvcHRfY29uZmlnLmRldmljZUlkKSA9PT0gJ3N0cmluZycgJiYgIXV0aWxzLmlzRW1wdHlTdHJpbmcob3B0X2NvbmZpZy5kZXZpY2VJZCkgJiYgb3B0X2NvbmZpZy5kZXZpY2VJZCB8fCBfdGhpcy5vcHRpb25zLmRldmljZUlkRnJvbVVybFBhcmFtICYmIF90aGlzLl9nZXREZXZpY2VJZEZyb21VcmxQYXJhbShfdGhpcy5fZ2V0VXJsUGFyYW1zKCkpIHx8IF90aGlzLm9wdGlvbnMuZGV2aWNlSWQgfHwgZGV2aWNlSWQgfHwgYmFzZTY0SWQoKTtcbiAgICAgICAgX3RoaXMub3B0aW9ucy51c2VySWQgPSB0eXBlKG9wdF91c2VySWQpID09PSAnc3RyaW5nJyAmJiAhdXRpbHMuaXNFbXB0eVN0cmluZyhvcHRfdXNlcklkKSAmJiBvcHRfdXNlcklkIHx8IHR5cGUob3B0X3VzZXJJZCkgPT09ICdudW1iZXInICYmIG9wdF91c2VySWQudG9TdHJpbmcoKSB8fCBfdGhpcy5vcHRpb25zLnVzZXJJZCB8fCBudWxsO1xuICAgICAgICB2YXIgbm93ID0gbmV3IERhdGUoKS5nZXRUaW1lKCk7XG5cbiAgICAgICAgaWYgKCFfdGhpcy5fc2Vzc2lvbklkIHx8ICFfdGhpcy5fbGFzdEV2ZW50VGltZSB8fCBub3cgLSBfdGhpcy5fbGFzdEV2ZW50VGltZSA+IF90aGlzLm9wdGlvbnMuc2Vzc2lvblRpbWVvdXQpIHtcbiAgICAgICAgICBpZiAoX3RoaXMub3B0aW9ucy51bnNldFBhcmFtc1JlZmVycmVyT25OZXdTZXNzaW9uKSB7XG4gICAgICAgICAgICBfdGhpcy5fdW5zZXRVVE1QYXJhbXMoKTtcbiAgICAgICAgICB9XG5cbiAgICAgICAgICBfdGhpcy5fbmV3U2Vzc2lvbiA9IHRydWU7XG4gICAgICAgICAgX3RoaXMuX3Nlc3Npb25JZCA9IG5vdzsgLy8gb25seSBjYXB0dXJlIFVUTSBwYXJhbXMgYW5kIHJlZmVycmVyIGlmIG5ldyBzZXNzaW9uXG5cbiAgICAgICAgICBpZiAoX3RoaXMub3B0aW9ucy5zYXZlUGFyYW1zUmVmZXJyZXJPbmNlUGVyU2Vzc2lvbikge1xuICAgICAgICAgICAgX3RoaXMuX3RyYWNrUGFyYW1zQW5kUmVmZXJyZXIoKTtcbiAgICAgICAgICB9XG4gICAgICAgIH1cblxuICAgICAgICBpZiAoIV90aGlzLm9wdGlvbnMuc2F2ZVBhcmFtc1JlZmVycmVyT25jZVBlclNlc3Npb24pIHtcbiAgICAgICAgICBfdGhpcy5fdHJhY2tQYXJhbXNBbmRSZWZlcnJlcigpO1xuICAgICAgICB9IC8vIGxvYWQgdW5zZW50IGV2ZW50cyBhbmQgaWRlbnRpZmllcyBiZWZvcmUgYW55IGF0dGVtcHQgdG8gbG9nIG5ldyBvbmVzXG5cblxuICAgICAgICBpZiAoX3RoaXMub3B0aW9ucy5zYXZlRXZlbnRzKSB7XG4gICAgICAgICAgX3ZhbGlkYXRlVW5zZW50RXZlbnRRdWV1ZShfdGhpcy5fdW5zZW50RXZlbnRzKTtcblxuICAgICAgICAgIF92YWxpZGF0ZVVuc2VudEV2ZW50UXVldWUoX3RoaXMuX3Vuc2VudElkZW50aWZ5cyk7XG4gICAgICAgIH1cblxuICAgICAgICBfdGhpcy5fbGFzdEV2ZW50VGltZSA9IG5vdztcblxuICAgICAgICBfc2F2ZUNvb2tpZURhdGEoX3RoaXMpO1xuXG4gICAgICAgIF90aGlzLl9wZW5kaW5nUmVhZFN0b3JhZ2UgPSBmYWxzZTtcblxuICAgICAgICBfdGhpcy5fc2VuZEV2ZW50c0lmUmVhZHkoKTsgLy8gdHJ5IHNlbmRpbmcgdW5zZW50IGV2ZW50c1xuXG5cbiAgICAgICAgZm9yICh2YXIgaSA9IDA7IGkgPCBfdGhpcy5fb25Jbml0Lmxlbmd0aDsgaSsrKSB7XG4gICAgICAgICAgX3RoaXMuX29uSW5pdFtpXShfdGhpcyk7XG4gICAgICAgIH1cblxuICAgICAgICBfdGhpcy5fb25Jbml0ID0gW107XG4gICAgICAgIF90aGlzLl9pc0luaXRpYWxpemVkID0gdHJ1ZTtcbiAgICAgIH07XG5cbiAgICAgIGlmIChBc3luY1N0b3JhZ2UpIHtcbiAgICAgICAgdGhpcy5fbWlncmF0ZVVuc2VudEV2ZW50cyhmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgUHJvbWlzZS5hbGwoW0FzeW5jU3RvcmFnZS5nZXRJdGVtKF90aGlzLl9zdG9yYWdlU3VmZml4KSwgQXN5bmNTdG9yYWdlLmdldEl0ZW0oX3RoaXMub3B0aW9ucy51bnNlbnRLZXkgKyBfdGhpcy5fc3RvcmFnZVN1ZmZpeCksIEFzeW5jU3RvcmFnZS5nZXRJdGVtKF90aGlzLm9wdGlvbnMudW5zZW50SWRlbnRpZnlLZXkgKyBfdGhpcy5fc3RvcmFnZVN1ZmZpeCldKS50aGVuKGZ1bmN0aW9uICh2YWx1ZXMpIHtcbiAgICAgICAgICAgIGlmICh2YWx1ZXNbMF0pIHtcbiAgICAgICAgICAgICAgdmFyIGNvb2tpZURhdGEgPSBKU09OLnBhcnNlKHZhbHVlc1swXSk7XG5cbiAgICAgICAgICAgICAgaWYgKGNvb2tpZURhdGEpIHtcbiAgICAgICAgICAgICAgICBfbG9hZENvb2tpZURhdGFQcm9wcyhfdGhpcywgY29va2llRGF0YSk7XG4gICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgaWYgKF90aGlzLm9wdGlvbnMuc2F2ZUV2ZW50cykge1xuICAgICAgICAgICAgICBfdGhpcy5fdW5zZW50RXZlbnRzID0gX3RoaXMuX3BhcnNlU2F2ZWRVbnNlbnRFdmVudHNTdHJpbmcodmFsdWVzWzFdKS5tYXAoZnVuY3Rpb24gKGV2ZW50KSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIHtcbiAgICAgICAgICAgICAgICAgIGV2ZW50OiBldmVudFxuICAgICAgICAgICAgICAgIH07XG4gICAgICAgICAgICAgIH0pLmNvbmNhdChfdGhpcy5fdW5zZW50RXZlbnRzKTtcbiAgICAgICAgICAgICAgX3RoaXMuX3Vuc2VudElkZW50aWZ5cyA9IF90aGlzLl9wYXJzZVNhdmVkVW5zZW50RXZlbnRzU3RyaW5nKHZhbHVlc1syXSkubWFwKGZ1bmN0aW9uIChldmVudCkge1xuICAgICAgICAgICAgICAgIHJldHVybiB7XG4gICAgICAgICAgICAgICAgICBldmVudDogZXZlbnRcbiAgICAgICAgICAgICAgICB9O1xuICAgICAgICAgICAgICB9KS5jb25jYXQoX3RoaXMuX3Vuc2VudElkZW50aWZ5cyk7XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIGlmIChEZXZpY2VJbmZvKSB7XG4gICAgICAgICAgICAgIFByb21pc2UuYWxsKFtEZXZpY2VJbmZvLmdldENhcnJpZXIoKSwgRGV2aWNlSW5mby5nZXRNb2RlbCgpLCBEZXZpY2VJbmZvLmdldE1hbnVmYWN0dXJlcigpLCBEZXZpY2VJbmZvLmdldFZlcnNpb24oKSwgRGV2aWNlSW5mby5nZXRVbmlxdWVJZCgpXSkudGhlbihmdW5jdGlvbiAodmFsdWVzKSB7XG4gICAgICAgICAgICAgICAgX3RoaXMuZGV2aWNlSW5mbyA9IHtcbiAgICAgICAgICAgICAgICAgIGNhcnJpZXI6IHZhbHVlc1swXSxcbiAgICAgICAgICAgICAgICAgIG1vZGVsOiB2YWx1ZXNbMV0sXG4gICAgICAgICAgICAgICAgICBtYW51ZmFjdHVyZXI6IHZhbHVlc1syXSxcbiAgICAgICAgICAgICAgICAgIHZlcnNpb246IHZhbHVlc1szXVxuICAgICAgICAgICAgICAgIH07XG4gICAgICAgICAgICAgICAgaW5pdEZyb21TdG9yYWdlKHZhbHVlc1s0XSk7XG5cbiAgICAgICAgICAgICAgICBfdGhpcy5ydW5RdWV1ZWRGdW5jdGlvbnMoKTtcblxuICAgICAgICAgICAgICAgIGlmICh0eXBlKG9wdF9jYWxsYmFjaykgPT09ICdmdW5jdGlvbicpIHtcbiAgICAgICAgICAgICAgICAgIG9wdF9jYWxsYmFjayhfdGhpcyk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICB9KS5jYXRjaChmdW5jdGlvbiAoZXJyKSB7XG4gICAgICAgICAgICAgICAgX3RoaXMub3B0aW9ucy5vbkVycm9yKGVycik7XG4gICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgaW5pdEZyb21TdG9yYWdlKCk7XG5cbiAgICAgICAgICAgICAgX3RoaXMucnVuUXVldWVkRnVuY3Rpb25zKCk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgfSkuY2F0Y2goZnVuY3Rpb24gKGVycikge1xuICAgICAgICAgICAgX3RoaXMub3B0aW9ucy5vbkVycm9yKGVycik7XG4gICAgICAgICAgfSk7XG4gICAgICAgIH0pO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgaWYgKHRoaXMub3B0aW9ucy5zYXZlRXZlbnRzKSB7XG4gICAgICAgICAgdGhpcy5fdW5zZW50RXZlbnRzID0gdGhpcy5fbG9hZFNhdmVkVW5zZW50RXZlbnRzKHRoaXMub3B0aW9ucy51bnNlbnRLZXkpLm1hcChmdW5jdGlvbiAoZXZlbnQpIHtcbiAgICAgICAgICAgIHJldHVybiB7XG4gICAgICAgICAgICAgIGV2ZW50OiBldmVudFxuICAgICAgICAgICAgfTtcbiAgICAgICAgICB9KS5jb25jYXQodGhpcy5fdW5zZW50RXZlbnRzKTtcbiAgICAgICAgICB0aGlzLl91bnNlbnRJZGVudGlmeXMgPSB0aGlzLl9sb2FkU2F2ZWRVbnNlbnRFdmVudHModGhpcy5vcHRpb25zLnVuc2VudElkZW50aWZ5S2V5KS5tYXAoZnVuY3Rpb24gKGV2ZW50KSB7XG4gICAgICAgICAgICByZXR1cm4ge1xuICAgICAgICAgICAgICBldmVudDogZXZlbnRcbiAgICAgICAgICAgIH07XG4gICAgICAgICAgfSkuY29uY2F0KHRoaXMuX3Vuc2VudElkZW50aWZ5cyk7XG4gICAgICAgIH1cblxuICAgICAgICBpbml0RnJvbVN0b3JhZ2UoKTtcbiAgICAgICAgdGhpcy5ydW5RdWV1ZWRGdW5jdGlvbnMoKTtcblxuICAgICAgICBpZiAodHlwZShvcHRfY2FsbGJhY2spID09PSAnZnVuY3Rpb24nKSB7XG4gICAgICAgICAgb3B0X2NhbGxiYWNrKHRoaXMpO1xuICAgICAgICB9XG4gICAgICB9XG4gICAgfSBjYXRjaCAoZXJyKSB7XG4gICAgICB1dGlscy5sb2cuZXJyb3IoZXJyKTtcbiAgICAgIHRoaXMub3B0aW9ucy5vbkVycm9yKGVycik7XG4gICAgfVxuICB9OyAvLyB2YWxpZGF0ZSBwcm9wZXJ0aWVzIGZvciB1bnNlbnQgZXZlbnRzXG5cblxuICB2YXIgX3ZhbGlkYXRlVW5zZW50RXZlbnRRdWV1ZSA9IGZ1bmN0aW9uIF92YWxpZGF0ZVVuc2VudEV2ZW50UXVldWUocXVldWUpIHtcbiAgICBmb3IgKHZhciBpID0gMDsgaSA8IHF1ZXVlLmxlbmd0aDsgaSsrKSB7XG4gICAgICB2YXIgdXNlclByb3BlcnRpZXMgPSBxdWV1ZVtpXS5ldmVudC51c2VyX3Byb3BlcnRpZXM7XG4gICAgICB2YXIgZXZlbnRQcm9wZXJ0aWVzID0gcXVldWVbaV0uZXZlbnQuZXZlbnRfcHJvcGVydGllcztcbiAgICAgIHZhciBncm91cHMgPSBxdWV1ZVtpXS5ldmVudC5ncm91cHM7XG4gICAgICBxdWV1ZVtpXS5ldmVudC51c2VyX3Byb3BlcnRpZXMgPSB1dGlscy52YWxpZGF0ZVByb3BlcnRpZXModXNlclByb3BlcnRpZXMpO1xuICAgICAgcXVldWVbaV0uZXZlbnQuZXZlbnRfcHJvcGVydGllcyA9IHV0aWxzLnZhbGlkYXRlUHJvcGVydGllcyhldmVudFByb3BlcnRpZXMpO1xuICAgICAgcXVldWVbaV0uZXZlbnQuZ3JvdXBzID0gdXRpbHMudmFsaWRhdGVHcm91cHMoZ3JvdXBzKTtcbiAgICB9XG4gIH07XG4gIC8qKlxuICAgKiBAcHJpdmF0ZVxuICAgKi9cblxuXG4gIEFtcGxpdHVkZUNsaWVudC5wcm90b3R5cGUuX21pZ3JhdGVVbnNlbnRFdmVudHMgPSBmdW5jdGlvbiBfbWlncmF0ZVVuc2VudEV2ZW50cyhjYikge1xuICAgIHZhciBfdGhpczIgPSB0aGlzO1xuXG4gICAgUHJvbWlzZS5hbGwoW0FzeW5jU3RvcmFnZS5nZXRJdGVtKHRoaXMub3B0aW9ucy51bnNlbnRLZXkpLCBBc3luY1N0b3JhZ2UuZ2V0SXRlbSh0aGlzLm9wdGlvbnMudW5zZW50SWRlbnRpZnlLZXkpXSkudGhlbihmdW5jdGlvbiAodmFsdWVzKSB7XG4gICAgICBpZiAoX3RoaXMyLm9wdGlvbnMuc2F2ZUV2ZW50cykge1xuICAgICAgICB2YXIgdW5zZW50RXZlbnRzU3RyaW5nID0gdmFsdWVzWzBdO1xuICAgICAgICB2YXIgdW5zZW50SWRlbnRpZnlLZXkgPSB2YWx1ZXNbMV07XG4gICAgICAgIHZhciBpdGVtc1RvU2V0ID0gW107XG4gICAgICAgIHZhciBpdGVtc1RvUmVtb3ZlID0gW107XG5cbiAgICAgICAgaWYgKCEhdW5zZW50RXZlbnRzU3RyaW5nKSB7XG4gICAgICAgICAgaXRlbXNUb1NldC5wdXNoKEFzeW5jU3RvcmFnZS5zZXRJdGVtKF90aGlzMi5vcHRpb25zLnVuc2VudEtleSArIF90aGlzMi5fc3RvcmFnZVN1ZmZpeCwgSlNPTi5zdHJpbmdpZnkodW5zZW50RXZlbnRzU3RyaW5nKSkpO1xuICAgICAgICAgIGl0ZW1zVG9SZW1vdmUucHVzaChBc3luY1N0b3JhZ2UucmVtb3ZlSXRlbShfdGhpczIub3B0aW9ucy51bnNlbnRLZXkpKTtcbiAgICAgICAgfVxuXG4gICAgICAgIGlmICghIXVuc2VudElkZW50aWZ5S2V5KSB7XG4gICAgICAgICAgaXRlbXNUb1NldC5wdXNoKEFzeW5jU3RvcmFnZS5zZXRJdGVtKF90aGlzMi5vcHRpb25zLnVuc2VudElkZW50aWZ5S2V5ICsgX3RoaXMyLl9zdG9yYWdlU3VmZml4LCBKU09OLnN0cmluZ2lmeSh1bnNlbnRJZGVudGlmeUtleSkpKTtcbiAgICAgICAgICBpdGVtc1RvUmVtb3ZlLnB1c2goQXN5bmNTdG9yYWdlLnJlbW92ZUl0ZW0oX3RoaXMyLm9wdGlvbnMudW5zZW50SWRlbnRpZnlLZXkpKTtcbiAgICAgICAgfVxuXG4gICAgICAgIGlmIChpdGVtc1RvU2V0Lmxlbmd0aCA+IDApIHtcbiAgICAgICAgICBQcm9taXNlLmFsbChpdGVtc1RvU2V0KS50aGVuKGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICB9KS5jYXRjaChmdW5jdGlvbiAoZXJyKSB7XG4gICAgICAgICAgICBfdGhpczIub3B0aW9ucy5vbkVycm9yKGVycik7XG4gICAgICAgICAgfSk7XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICB9KS50aGVuKGNiKS5jYXRjaChmdW5jdGlvbiAoZXJyKSB7XG4gICAgICBfdGhpczIub3B0aW9ucy5vbkVycm9yKGVycik7XG4gICAgfSk7XG4gIH07XG4gIC8qKlxuICAgKiBAcHJpdmF0ZVxuICAgKi9cblxuXG4gIEFtcGxpdHVkZUNsaWVudC5wcm90b3R5cGUuX3RyYWNrUGFyYW1zQW5kUmVmZXJyZXIgPSBmdW5jdGlvbiBfdHJhY2tQYXJhbXNBbmRSZWZlcnJlcigpIHtcbiAgICBpZiAodGhpcy5vcHRpb25zLmluY2x1ZGVVdG0pIHtcbiAgICAgIHRoaXMuX2luaXRVdG1EYXRhKCk7XG4gICAgfVxuXG4gICAgaWYgKHRoaXMub3B0aW9ucy5pbmNsdWRlUmVmZXJyZXIpIHtcbiAgICAgIHRoaXMuX3NhdmVSZWZlcnJlcih0aGlzLl9nZXRSZWZlcnJlcigpKTtcbiAgICB9XG5cbiAgICBpZiAodGhpcy5vcHRpb25zLmluY2x1ZGVHY2xpZCkge1xuICAgICAgdGhpcy5fc2F2ZUdjbGlkKHRoaXMuX2dldFVybFBhcmFtcygpKTtcbiAgICB9XG4gIH07XG4gIC8qKlxuICAgKiBQYXJzZSBhbmQgdmFsaWRhdGUgdXNlciBzcGVjaWZpZWQgY29uZmlnIHZhbHVlcyBhbmQgb3ZlcndyaXRlIGV4aXN0aW5nIG9wdGlvbiB2YWx1ZVxuICAgKiBERUZBVUxUX09QVElPTlMgcHJvdmlkZXMgbGlzdCBvZiBhbGwgY29uZmlnIGtleXMgdGhhdCBhcmUgbW9kaWZpYWJsZSwgYXMgd2VsbCBhcyBleHBlY3RlZCB0eXBlcyBmb3IgdmFsdWVzXG4gICAqIEBwcml2YXRlXG4gICAqL1xuXG5cbiAgdmFyIF9wYXJzZUNvbmZpZyA9IGZ1bmN0aW9uIF9wYXJzZUNvbmZpZyhvcHRpb25zLCBjb25maWcpIHtcbiAgICBpZiAodHlwZShjb25maWcpICE9PSAnb2JqZWN0Jykge1xuICAgICAgcmV0dXJuO1xuICAgIH0gLy8gdmFsaWRhdGVzIGNvbmZpZyB2YWx1ZSBpcyBkZWZpbmVkLCBpcyB0aGUgY29ycmVjdCB0eXBlLCBhbmQgc29tZSBhZGRpdGlvbmFsIHZhbHVlIHNhbml0eSBjaGVja3NcblxuXG4gICAgdmFyIHBhcnNlVmFsaWRhdGVBbmRMb2FkID0gZnVuY3Rpb24gcGFyc2VWYWxpZGF0ZUFuZExvYWQoa2V5KSB7XG4gICAgICBpZiAoIW9wdGlvbnMuaGFzT3duUHJvcGVydHkoa2V5KSkge1xuICAgICAgICByZXR1cm47IC8vIHNraXAgYm9ndXMgY29uZmlnIHZhbHVlc1xuICAgICAgfVxuXG4gICAgICB2YXIgaW5wdXRWYWx1ZSA9IGNvbmZpZ1trZXldO1xuICAgICAgdmFyIGV4cGVjdGVkVHlwZSA9IHR5cGUob3B0aW9uc1trZXldKTtcblxuICAgICAgaWYgKCF1dGlscy52YWxpZGF0ZUlucHV0KGlucHV0VmFsdWUsIGtleSArICcgb3B0aW9uJywgZXhwZWN0ZWRUeXBlKSkge1xuICAgICAgICByZXR1cm47XG4gICAgICB9XG5cbiAgICAgIGlmIChleHBlY3RlZFR5cGUgPT09ICdib29sZWFuJykge1xuICAgICAgICBvcHRpb25zW2tleV0gPSAhIWlucHV0VmFsdWU7XG4gICAgICB9IGVsc2UgaWYgKGV4cGVjdGVkVHlwZSA9PT0gJ3N0cmluZycgJiYgIXV0aWxzLmlzRW1wdHlTdHJpbmcoaW5wdXRWYWx1ZSkgfHwgZXhwZWN0ZWRUeXBlID09PSAnbnVtYmVyJyAmJiBpbnB1dFZhbHVlID4gMCkge1xuICAgICAgICBvcHRpb25zW2tleV0gPSBpbnB1dFZhbHVlO1xuICAgICAgfSBlbHNlIGlmIChleHBlY3RlZFR5cGUgPT09ICdvYmplY3QnKSB7XG4gICAgICAgIF9wYXJzZUNvbmZpZyhvcHRpb25zW2tleV0sIGlucHV0VmFsdWUpO1xuICAgICAgfVxuICAgIH07XG5cbiAgICBmb3IgKHZhciBrZXkgaW4gY29uZmlnKSB7XG4gICAgICBpZiAoY29uZmlnLmhhc093blByb3BlcnR5KGtleSkpIHtcbiAgICAgICAgcGFyc2VWYWxpZGF0ZUFuZExvYWQoa2V5KTtcbiAgICAgIH1cbiAgICB9XG4gIH07XG4gIC8qKlxuICAgKiBSdW4gZnVuY3Rpb25zIHF1ZXVlZCB1cCBieSBwcm94eSBsb2FkaW5nIHNuaXBwZXRcbiAgICogQHByaXZhdGVcbiAgICovXG5cblxuICBBbXBsaXR1ZGVDbGllbnQucHJvdG90eXBlLnJ1blF1ZXVlZEZ1bmN0aW9ucyA9IGZ1bmN0aW9uICgpIHtcbiAgICB2YXIgcXVldWUgPSB0aGlzLl9xO1xuICAgIHRoaXMuX3EgPSBbXTtcblxuICAgIGZvciAodmFyIGkgPSAwOyBpIDwgcXVldWUubGVuZ3RoOyBpKyspIHtcbiAgICAgIHZhciBmbiA9IHRoaXNbcXVldWVbaV1bMF1dO1xuXG4gICAgICBpZiAodHlwZShmbikgPT09ICdmdW5jdGlvbicpIHtcbiAgICAgICAgZm4uYXBwbHkodGhpcywgcXVldWVbaV0uc2xpY2UoMSkpO1xuICAgICAgfVxuICAgIH1cbiAgfTtcbiAgLyoqXG4gICAqIENoZWNrIHRoYXQgdGhlIGFwaUtleSBpcyBzZXQgYmVmb3JlIGNhbGxpbmcgYSBmdW5jdGlvbi4gTG9ncyBhIHdhcm5pbmcgbWVzc2FnZSBpZiBub3Qgc2V0LlxuICAgKiBAcHJpdmF0ZVxuICAgKi9cblxuXG4gIEFtcGxpdHVkZUNsaWVudC5wcm90b3R5cGUuX2FwaUtleVNldCA9IGZ1bmN0aW9uIF9hcGlLZXlTZXQobWV0aG9kTmFtZSkge1xuICAgIGlmICh1dGlscy5pc0VtcHR5U3RyaW5nKHRoaXMub3B0aW9ucy5hcGlLZXkpKSB7XG4gICAgICB1dGlscy5sb2cuZXJyb3IoJ0ludmFsaWQgYXBpS2V5LiBQbGVhc2Ugc2V0IGEgdmFsaWQgYXBpS2V5IHdpdGggaW5pdCgpIGJlZm9yZSBjYWxsaW5nICcgKyBtZXRob2ROYW1lKTtcbiAgICAgIHJldHVybiBmYWxzZTtcbiAgICB9XG5cbiAgICByZXR1cm4gdHJ1ZTtcbiAgfTtcbiAgLyoqXG4gICAqIExvYWQgc2F2ZWQgZXZlbnRzIGZyb20gbG9jYWxTdG9yYWdlLiBKU09OIGRlc2VyaWFsaXplcyBldmVudCBhcnJheS4gSGFuZGxlcyBjYXNlIHdoZXJlIHN0cmluZyBpcyBjb3JydXB0ZWQuXG4gICAqIEBwcml2YXRlXG4gICAqL1xuXG5cbiAgQW1wbGl0dWRlQ2xpZW50LnByb3RvdHlwZS5fbG9hZFNhdmVkVW5zZW50RXZlbnRzID0gZnVuY3Rpb24gX2xvYWRTYXZlZFVuc2VudEV2ZW50cyh1bnNlbnRLZXkpIHtcbiAgICB2YXIgc2F2ZWRVbnNlbnRFdmVudHNTdHJpbmcgPSB0aGlzLl9nZXRGcm9tU3RvcmFnZShsb2NhbFN0b3JhZ2UkMSwgdW5zZW50S2V5KTtcblxuICAgIHZhciB1bnNlbnRFdmVudHMgPSB0aGlzLl9wYXJzZVNhdmVkVW5zZW50RXZlbnRzU3RyaW5nKHNhdmVkVW5zZW50RXZlbnRzU3RyaW5nLCB1bnNlbnRLZXkpO1xuXG4gICAgdGhpcy5fc2V0SW5TdG9yYWdlKGxvY2FsU3RvcmFnZSQxLCB1bnNlbnRLZXksIEpTT04uc3RyaW5naWZ5KHVuc2VudEV2ZW50cykpO1xuXG4gICAgcmV0dXJuIHVuc2VudEV2ZW50cztcbiAgfTtcbiAgLyoqXG4gICAqIExvYWQgc2F2ZWQgZXZlbnRzIGZyb20gbG9jYWxTdG9yYWdlLiBKU09OIGRlc2VyaWFsaXplcyBldmVudCBhcnJheS4gSGFuZGxlcyBjYXNlIHdoZXJlIHN0cmluZyBpcyBjb3JydXB0ZWQuXG4gICAqIEBwcml2YXRlXG4gICAqL1xuXG5cbiAgQW1wbGl0dWRlQ2xpZW50LnByb3RvdHlwZS5fcGFyc2VTYXZlZFVuc2VudEV2ZW50c1N0cmluZyA9IGZ1bmN0aW9uIF9wYXJzZVNhdmVkVW5zZW50RXZlbnRzU3RyaW5nKHNhdmVkVW5zZW50RXZlbnRzU3RyaW5nLCB1bnNlbnRLZXkpIHtcbiAgICBpZiAodXRpbHMuaXNFbXB0eVN0cmluZyhzYXZlZFVuc2VudEV2ZW50c1N0cmluZykpIHtcbiAgICAgIHJldHVybiBbXTsgLy8gbmV3IGFwcCwgZG9lcyBub3QgaGF2ZSBhbnkgc2F2ZWQgZXZlbnRzXG4gICAgfVxuXG4gICAgaWYgKHR5cGUoc2F2ZWRVbnNlbnRFdmVudHNTdHJpbmcpID09PSAnc3RyaW5nJykge1xuICAgICAgdHJ5IHtcbiAgICAgICAgdmFyIGV2ZW50cyA9IEpTT04ucGFyc2Uoc2F2ZWRVbnNlbnRFdmVudHNTdHJpbmcpO1xuXG4gICAgICAgIGlmICh0eXBlKGV2ZW50cykgPT09ICdhcnJheScpIHtcbiAgICAgICAgICAvLyBoYW5kbGUgY2FzZSB3aGVyZSBKU09OIGR1bXBpbmcgb2YgdW5zZW50IGV2ZW50cyBpcyBjb3JydXB0ZWRcbiAgICAgICAgICByZXR1cm4gZXZlbnRzO1xuICAgICAgICB9XG4gICAgICB9IGNhdGNoIChlKSB7fVxuICAgIH1cblxuICAgIHV0aWxzLmxvZy5lcnJvcignVW5hYmxlIHRvIGxvYWQgJyArIHVuc2VudEtleSArICcgZXZlbnRzLiBSZXN0YXJ0IHdpdGggYSBuZXcgZW1wdHkgcXVldWUuJyk7XG4gICAgcmV0dXJuIFtdO1xuICB9O1xuICAvKipcbiAgICogUmV0dXJucyB0cnVlIGlmIGEgbmV3IHNlc3Npb24gd2FzIGNyZWF0ZWQgZHVyaW5nIGluaXRpYWxpemF0aW9uLCBvdGhlcndpc2UgZmFsc2UuXG4gICAqIEBwdWJsaWNcbiAgICogQHJldHVybiB7Ym9vbGVhbn0gV2hldGhlciBhIG5ldyBzZXNzaW9uIHdhcyBjcmVhdGVkIGR1cmluZyBpbml0aWFsaXphdGlvbi5cbiAgICovXG5cblxuICBBbXBsaXR1ZGVDbGllbnQucHJvdG90eXBlLmlzTmV3U2Vzc2lvbiA9IGZ1bmN0aW9uIGlzTmV3U2Vzc2lvbigpIHtcbiAgICByZXR1cm4gdGhpcy5fbmV3U2Vzc2lvbjtcbiAgfTtcbiAgLyoqXG4gICAqIFN0b3JlIGNhbGxiYWNrcyB0byBjYWxsIGFmdGVyIGluaXRcbiAgICogQHByaXZhdGVcbiAgICovXG5cblxuICBBbXBsaXR1ZGVDbGllbnQucHJvdG90eXBlLm9uSW5pdCA9IGZ1bmN0aW9uIChjYWxsYmFjaykge1xuICAgIGlmICh0aGlzLl9pc0luaXRpYWxpemVkKSB7XG4gICAgICBjYWxsYmFjaygpO1xuICAgIH0gZWxzZSB7XG4gICAgICB0aGlzLl9vbkluaXQucHVzaChjYWxsYmFjayk7XG4gICAgfVxuICB9O1xuICAvKipcbiAgICogUmV0dXJucyB0aGUgaWQgb2YgdGhlIGN1cnJlbnQgc2Vzc2lvbi5cbiAgICogQHB1YmxpY1xuICAgKiBAcmV0dXJuIHtudW1iZXJ9IElkIG9mIHRoZSBjdXJyZW50IHNlc3Npb24uXG4gICAqL1xuXG5cbiAgQW1wbGl0dWRlQ2xpZW50LnByb3RvdHlwZS5nZXRTZXNzaW9uSWQgPSBmdW5jdGlvbiBnZXRTZXNzaW9uSWQoKSB7XG4gICAgcmV0dXJuIHRoaXMuX3Nlc3Npb25JZDtcbiAgfTtcbiAgLyoqXG4gICAqIEluY3JlbWVudHMgdGhlIGV2ZW50SWQgYW5kIHJldHVybnMgaXQuXG4gICAqIEBwcml2YXRlXG4gICAqL1xuXG5cbiAgQW1wbGl0dWRlQ2xpZW50LnByb3RvdHlwZS5uZXh0RXZlbnRJZCA9IGZ1bmN0aW9uIG5leHRFdmVudElkKCkge1xuICAgIHRoaXMuX2V2ZW50SWQrKztcbiAgICByZXR1cm4gdGhpcy5fZXZlbnRJZDtcbiAgfTtcbiAgLyoqXG4gICAqIEluY3JlbWVudHMgdGhlIGlkZW50aWZ5SWQgYW5kIHJldHVybnMgaXQuXG4gICAqIEBwcml2YXRlXG4gICAqL1xuXG5cbiAgQW1wbGl0dWRlQ2xpZW50LnByb3RvdHlwZS5uZXh0SWRlbnRpZnlJZCA9IGZ1bmN0aW9uIG5leHRJZGVudGlmeUlkKCkge1xuICAgIHRoaXMuX2lkZW50aWZ5SWQrKztcbiAgICByZXR1cm4gdGhpcy5faWRlbnRpZnlJZDtcbiAgfTtcbiAgLyoqXG4gICAqIEluY3JlbWVudHMgdGhlIHNlcXVlbmNlTnVtYmVyIGFuZCByZXR1cm5zIGl0LlxuICAgKiBAcHJpdmF0ZVxuICAgKi9cblxuXG4gIEFtcGxpdHVkZUNsaWVudC5wcm90b3R5cGUubmV4dFNlcXVlbmNlTnVtYmVyID0gZnVuY3Rpb24gbmV4dFNlcXVlbmNlTnVtYmVyKCkge1xuICAgIHRoaXMuX3NlcXVlbmNlTnVtYmVyKys7XG4gICAgcmV0dXJuIHRoaXMuX3NlcXVlbmNlTnVtYmVyO1xuICB9O1xuICAvKipcbiAgICogUmV0dXJucyB0aGUgdG90YWwgY291bnQgb2YgdW5zZW50IGV2ZW50cyBhbmQgaWRlbnRpZnlzXG4gICAqIEBwcml2YXRlXG4gICAqL1xuXG5cbiAgQW1wbGl0dWRlQ2xpZW50LnByb3RvdHlwZS5fdW5zZW50Q291bnQgPSBmdW5jdGlvbiBfdW5zZW50Q291bnQoKSB7XG4gICAgcmV0dXJuIHRoaXMuX3Vuc2VudEV2ZW50cy5sZW5ndGggKyB0aGlzLl91bnNlbnRJZGVudGlmeXMubGVuZ3RoO1xuICB9O1xuICAvKipcbiAgICogU2VuZCBldmVudHMgaWYgcmVhZHkuIFJldHVybnMgdHJ1ZSBpZiBldmVudHMgYXJlIHNlbnQuXG4gICAqIEBwcml2YXRlXG4gICAqL1xuXG5cbiAgQW1wbGl0dWRlQ2xpZW50LnByb3RvdHlwZS5fc2VuZEV2ZW50c0lmUmVhZHkgPSBmdW5jdGlvbiBfc2VuZEV2ZW50c0lmUmVhZHkoKSB7XG4gICAgaWYgKHRoaXMuX3Vuc2VudENvdW50KCkgPT09IDApIHtcbiAgICAgIHJldHVybiBmYWxzZTtcbiAgICB9IC8vIGlmIGJhdGNoaW5nIGRpc2FibGVkLCBzZW5kIGFueSB1bnNlbnQgZXZlbnRzIGltbWVkaWF0ZWx5XG5cblxuICAgIGlmICghdGhpcy5vcHRpb25zLmJhdGNoRXZlbnRzKSB7XG4gICAgICB0aGlzLnNlbmRFdmVudHMoKTtcbiAgICAgIHJldHVybiB0cnVlO1xuICAgIH0gLy8gaWYgYmF0Y2hpbmcgZW5hYmxlZCwgY2hlY2sgaWYgbWluIHRocmVzaG9sZCBtZXQgZm9yIGJhdGNoIHNpemVcblxuXG4gICAgaWYgKHRoaXMuX3Vuc2VudENvdW50KCkgPj0gdGhpcy5vcHRpb25zLmV2ZW50VXBsb2FkVGhyZXNob2xkKSB7XG4gICAgICB0aGlzLnNlbmRFdmVudHMoKTtcbiAgICAgIHJldHVybiB0cnVlO1xuICAgIH0gLy8gb3RoZXJ3aXNlIHNjaGVkdWxlIGFuIHVwbG9hZCBhZnRlciAzMHNcblxuXG4gICAgaWYgKCF0aGlzLl91cGRhdGVTY2hlZHVsZWQpIHtcbiAgICAgIC8vIG1ha2Ugc3VyZSB3ZSBvbmx5IHNjaGVkdWxlIDEgdXBsb2FkXG4gICAgICB0aGlzLl91cGRhdGVTY2hlZHVsZWQgPSB0cnVlO1xuICAgICAgc2V0VGltZW91dChmdW5jdGlvbiAoKSB7XG4gICAgICAgIHRoaXMuX3VwZGF0ZVNjaGVkdWxlZCA9IGZhbHNlO1xuICAgICAgICB0aGlzLnNlbmRFdmVudHMoKTtcbiAgICAgIH0uYmluZCh0aGlzKSwgdGhpcy5vcHRpb25zLmV2ZW50VXBsb2FkUGVyaW9kTWlsbGlzKTtcbiAgICB9XG5cbiAgICByZXR1cm4gZmFsc2U7IC8vIGFuIHVwbG9hZCB3YXMgc2NoZWR1bGVkLCBubyBldmVudHMgd2VyZSB1cGxvYWRlZFxuICB9O1xuICAvKipcbiAgICogSGVscGVyIGZ1bmN0aW9uIHRvIGZldGNoIHZhbHVlcyBmcm9tIHN0b3JhZ2VcbiAgICogU3RvcmFnZSBhcmd1bWVudCBhbGxvd3MgZm9yIGxvY2FsU3RvcmFvZ2UgYW5kIHNlc3Npb25TdG9yYW9nZVxuICAgKiBAcHJpdmF0ZVxuICAgKi9cblxuXG4gIEFtcGxpdHVkZUNsaWVudC5wcm90b3R5cGUuX2dldEZyb21TdG9yYWdlID0gZnVuY3Rpb24gX2dldEZyb21TdG9yYWdlKHN0b3JhZ2UsIGtleSkge1xuICAgIHJldHVybiBzdG9yYWdlLmdldEl0ZW0oa2V5ICsgdGhpcy5fc3RvcmFnZVN1ZmZpeCk7XG4gIH07XG4gIC8qKlxuICAgKiBIZWxwZXIgZnVuY3Rpb24gdG8gc2V0IHZhbHVlcyBpbiBzdG9yYWdlXG4gICAqIFN0b3JhZ2UgYXJndW1lbnQgYWxsb3dzIGZvciBsb2NhbFN0b3Jhb2dlIGFuZCBzZXNzaW9uU3RvcmFvZ2VcbiAgICogQHByaXZhdGVcbiAgICovXG5cblxuICBBbXBsaXR1ZGVDbGllbnQucHJvdG90eXBlLl9zZXRJblN0b3JhZ2UgPSBmdW5jdGlvbiBfc2V0SW5TdG9yYWdlKHN0b3JhZ2UsIGtleSwgdmFsdWUpIHtcbiAgICBzdG9yYWdlLnNldEl0ZW0oa2V5ICsgdGhpcy5fc3RvcmFnZVN1ZmZpeCwgdmFsdWUpO1xuICB9O1xuICAvKipcbiAgICogRmV0Y2hlcyBkZXZpY2VJZCwgdXNlcklkLCBldmVudCBtZXRhIGRhdGEgZnJvbSBhbXBsaXR1ZGUgY29va2llXG4gICAqIEBwcml2YXRlXG4gICAqL1xuXG5cbiAgdmFyIF9sb2FkQ29va2llRGF0YSA9IGZ1bmN0aW9uIF9sb2FkQ29va2llRGF0YShzY29wZSkge1xuICAgIGlmICghc2NvcGUuX3VzZU9sZENvb2tpZSkge1xuICAgICAgdmFyIHByb3BzID0gc2NvcGUuX21ldGFkYXRhU3RvcmFnZS5sb2FkKCk7XG5cbiAgICAgIGlmICh0eXBlKHByb3BzKSA9PT0gJ29iamVjdCcpIHtcbiAgICAgICAgX2xvYWRDb29raWVEYXRhUHJvcHMoc2NvcGUsIHByb3BzKTtcbiAgICAgIH1cblxuICAgICAgcmV0dXJuO1xuICAgIH1cblxuICAgIHZhciBjb29raWVEYXRhID0gc2NvcGUuY29va2llU3RvcmFnZS5nZXQoc2NvcGUuX29sZENvb2tpZW5hbWUpO1xuXG4gICAgaWYgKHR5cGUoY29va2llRGF0YSkgPT09ICdvYmplY3QnKSB7XG4gICAgICBfbG9hZENvb2tpZURhdGFQcm9wcyhzY29wZSwgY29va2llRGF0YSk7XG5cbiAgICAgIHJldHVybjtcbiAgICB9XG4gIH07XG5cbiAgdmFyIF91cGdyYWRlQ29va2llRGF0YSA9IGZ1bmN0aW9uIF91cGdyYWRlQ29va2llRGF0YShzY29wZSkge1xuICAgIHZhciBjb29raWVEYXRhID0gc2NvcGUuY29va2llU3RvcmFnZS5nZXQoc2NvcGUuX29sZENvb2tpZW5hbWUpO1xuXG4gICAgaWYgKHR5cGUoY29va2llRGF0YSkgPT09ICdvYmplY3QnKSB7XG4gICAgICBfbG9hZENvb2tpZURhdGFQcm9wcyhzY29wZSwgY29va2llRGF0YSk7XG5cbiAgICAgIF9zYXZlQ29va2llRGF0YShzY29wZSk7XG4gICAgfVxuICB9O1xuXG4gIHZhciBfbG9hZENvb2tpZURhdGFQcm9wcyA9IGZ1bmN0aW9uIF9sb2FkQ29va2llRGF0YVByb3BzKHNjb3BlLCBjb29raWVEYXRhKSB7XG4gICAgaWYgKGNvb2tpZURhdGEuZGV2aWNlSWQpIHtcbiAgICAgIHNjb3BlLm9wdGlvbnMuZGV2aWNlSWQgPSBjb29raWVEYXRhLmRldmljZUlkO1xuICAgIH1cblxuICAgIGlmIChjb29raWVEYXRhLnVzZXJJZCkge1xuICAgICAgc2NvcGUub3B0aW9ucy51c2VySWQgPSBjb29raWVEYXRhLnVzZXJJZDtcbiAgICB9XG5cbiAgICBpZiAoY29va2llRGF0YS5vcHRPdXQgIT09IG51bGwgJiYgY29va2llRGF0YS5vcHRPdXQgIT09IHVuZGVmaW5lZCkge1xuICAgICAgLy8gRG8gbm90IGNsb2JiZXIgY29uZmlnIG9wdCBvdXQgdmFsdWUgaWYgY29va2llRGF0YSBoYXMgb3B0T3V0IGFzIGZhbHNlXG4gICAgICBpZiAoY29va2llRGF0YS5vcHRPdXQgIT09IGZhbHNlKSB7XG4gICAgICAgIHNjb3BlLm9wdGlvbnMub3B0T3V0ID0gY29va2llRGF0YS5vcHRPdXQ7XG4gICAgICB9XG4gICAgfVxuXG4gICAgaWYgKGNvb2tpZURhdGEuc2Vzc2lvbklkKSB7XG4gICAgICBzY29wZS5fc2Vzc2lvbklkID0gcGFyc2VJbnQoY29va2llRGF0YS5zZXNzaW9uSWQsIDEwKTtcbiAgICB9XG5cbiAgICBpZiAoY29va2llRGF0YS5sYXN0RXZlbnRUaW1lKSB7XG4gICAgICBzY29wZS5fbGFzdEV2ZW50VGltZSA9IHBhcnNlSW50KGNvb2tpZURhdGEubGFzdEV2ZW50VGltZSwgMTApO1xuICAgIH1cblxuICAgIGlmIChjb29raWVEYXRhLmV2ZW50SWQpIHtcbiAgICAgIHNjb3BlLl9ldmVudElkID0gcGFyc2VJbnQoY29va2llRGF0YS5ldmVudElkLCAxMCk7XG4gICAgfVxuXG4gICAgaWYgKGNvb2tpZURhdGEuaWRlbnRpZnlJZCkge1xuICAgICAgc2NvcGUuX2lkZW50aWZ5SWQgPSBwYXJzZUludChjb29raWVEYXRhLmlkZW50aWZ5SWQsIDEwKTtcbiAgICB9XG5cbiAgICBpZiAoY29va2llRGF0YS5zZXF1ZW5jZU51bWJlcikge1xuICAgICAgc2NvcGUuX3NlcXVlbmNlTnVtYmVyID0gcGFyc2VJbnQoY29va2llRGF0YS5zZXF1ZW5jZU51bWJlciwgMTApO1xuICAgIH1cbiAgfTtcbiAgLyoqXG4gICAqIFNhdmVzIGRldmljZUlkLCB1c2VySWQsIGV2ZW50IG1ldGEgZGF0YSB0byBhbXBsaXR1ZGUgY29va2llXG4gICAqIEBwcml2YXRlXG4gICAqL1xuXG5cbiAgdmFyIF9zYXZlQ29va2llRGF0YSA9IGZ1bmN0aW9uIF9zYXZlQ29va2llRGF0YShzY29wZSkge1xuICAgIHZhciBjb29raWVEYXRhID0ge1xuICAgICAgZGV2aWNlSWQ6IHNjb3BlLm9wdGlvbnMuZGV2aWNlSWQsXG4gICAgICB1c2VySWQ6IHNjb3BlLm9wdGlvbnMudXNlcklkLFxuICAgICAgb3B0T3V0OiBzY29wZS5vcHRpb25zLm9wdE91dCxcbiAgICAgIHNlc3Npb25JZDogc2NvcGUuX3Nlc3Npb25JZCxcbiAgICAgIGxhc3RFdmVudFRpbWU6IHNjb3BlLl9sYXN0RXZlbnRUaW1lLFxuICAgICAgZXZlbnRJZDogc2NvcGUuX2V2ZW50SWQsXG4gICAgICBpZGVudGlmeUlkOiBzY29wZS5faWRlbnRpZnlJZCxcbiAgICAgIHNlcXVlbmNlTnVtYmVyOiBzY29wZS5fc2VxdWVuY2VOdW1iZXJcbiAgICB9O1xuXG4gICAgaWYgKEFzeW5jU3RvcmFnZSkge1xuICAgICAgQXN5bmNTdG9yYWdlLnNldEl0ZW0oc2NvcGUuX3N0b3JhZ2VTdWZmaXgsIEpTT04uc3RyaW5naWZ5KGNvb2tpZURhdGEpKTtcbiAgICB9XG5cbiAgICBpZiAoc2NvcGUuX3VzZU9sZENvb2tpZSkge1xuICAgICAgc2NvcGUuY29va2llU3RvcmFnZS5zZXQoc2NvcGUub3B0aW9ucy5jb29raWVOYW1lICsgc2NvcGUuX3N0b3JhZ2VTdWZmaXgsIGNvb2tpZURhdGEpO1xuICAgIH0gZWxzZSB7XG4gICAgICBzY29wZS5fbWV0YWRhdGFTdG9yYWdlLnNhdmUoY29va2llRGF0YSk7XG4gICAgfVxuICB9O1xuICAvKipcbiAgICogUGFyc2UgdGhlIHV0bSBwcm9wZXJ0aWVzIG91dCBvZiBjb29raWVzIGFuZCBxdWVyeSBmb3IgYWRkaW5nIHRvIHVzZXIgcHJvcGVydGllcy5cbiAgICogQHByaXZhdGVcbiAgICovXG5cblxuICBBbXBsaXR1ZGVDbGllbnQucHJvdG90eXBlLl9pbml0VXRtRGF0YSA9IGZ1bmN0aW9uIF9pbml0VXRtRGF0YShxdWVyeVBhcmFtcywgY29va2llUGFyYW1zKSB7XG4gICAgcXVlcnlQYXJhbXMgPSBxdWVyeVBhcmFtcyB8fCB0aGlzLl9nZXRVcmxQYXJhbXMoKTtcbiAgICBjb29raWVQYXJhbXMgPSBjb29raWVQYXJhbXMgfHwgdGhpcy5jb29raWVTdG9yYWdlLmdldCgnX191dG16Jyk7XG4gICAgdmFyIHV0bVByb3BlcnRpZXMgPSBnZXRVdG1EYXRhKGNvb2tpZVBhcmFtcywgcXVlcnlQYXJhbXMpO1xuXG4gICAgX3NlbmRQYXJhbXNSZWZlcnJlclVzZXJQcm9wZXJ0aWVzKHRoaXMsIHV0bVByb3BlcnRpZXMpO1xuICB9O1xuICAvKipcbiAgICogVW5zZXQgdGhlIHV0bSBwYXJhbXMgZnJvbSB0aGUgQW1wbGl0dWRlIGluc3RhbmNlIGFuZCB1cGRhdGUgdGhlIGlkZW50aWZ5LlxuICAgKiBAcHJpdmF0ZVxuICAgKi9cblxuXG4gIEFtcGxpdHVkZUNsaWVudC5wcm90b3R5cGUuX3Vuc2V0VVRNUGFyYW1zID0gZnVuY3Rpb24gX3Vuc2V0VVRNUGFyYW1zKCkge1xuICAgIHZhciBpZGVudGlmeSA9IG5ldyBJZGVudGlmeSgpO1xuICAgIGlkZW50aWZ5LnVuc2V0KENvbnN0YW50cy5SRUZFUlJFUik7XG4gICAgaWRlbnRpZnkudW5zZXQoQ29uc3RhbnRzLlVUTV9TT1VSQ0UpO1xuICAgIGlkZW50aWZ5LnVuc2V0KENvbnN0YW50cy5VVE1fTUVESVVNKTtcbiAgICBpZGVudGlmeS51bnNldChDb25zdGFudHMuVVRNX0NBTVBBSUdOKTtcbiAgICBpZGVudGlmeS51bnNldChDb25zdGFudHMuVVRNX1RFUk0pO1xuICAgIGlkZW50aWZ5LnVuc2V0KENvbnN0YW50cy5VVE1fQ09OVEVOVCk7XG4gICAgdGhpcy5pZGVudGlmeShpZGVudGlmeSk7XG4gIH07XG4gIC8qKlxuICAgKiBUaGUgY2FsbGluZyBmdW5jdGlvbiBzaG91bGQgZGV0ZXJtaW5lIHdoZW4gaXQgaXMgYXBwcm9wcmlhdGUgdG8gc2VuZCB0aGVzZSB1c2VyIHByb3BlcnRpZXMuIFRoaXMgZnVuY3Rpb25cbiAgICogd2lsbCBubyBsb25nZXIgY29udGFpbiBhbnkgc2Vzc2lvbiBzdG9yYWdlIGNoZWNraW5nIGxvZ2ljLlxuICAgKiBAcHJpdmF0ZVxuICAgKi9cblxuXG4gIHZhciBfc2VuZFBhcmFtc1JlZmVycmVyVXNlclByb3BlcnRpZXMgPSBmdW5jdGlvbiBfc2VuZFBhcmFtc1JlZmVycmVyVXNlclByb3BlcnRpZXMoc2NvcGUsIHVzZXJQcm9wZXJ0aWVzKSB7XG4gICAgaWYgKHR5cGUodXNlclByb3BlcnRpZXMpICE9PSAnb2JqZWN0JyB8fCBPYmplY3Qua2V5cyh1c2VyUHJvcGVydGllcykubGVuZ3RoID09PSAwKSB7XG4gICAgICByZXR1cm47XG4gICAgfSAvLyBzZXRPbmNlIHRoZSBpbml0aWFsIHVzZXIgcHJvcGVydGllc1xuXG5cbiAgICB2YXIgaWRlbnRpZnkgPSBuZXcgSWRlbnRpZnkoKTtcblxuICAgIGZvciAodmFyIGtleSBpbiB1c2VyUHJvcGVydGllcykge1xuICAgICAgaWYgKHVzZXJQcm9wZXJ0aWVzLmhhc093blByb3BlcnR5KGtleSkpIHtcbiAgICAgICAgaWRlbnRpZnkuc2V0T25jZSgnaW5pdGlhbF8nICsga2V5LCB1c2VyUHJvcGVydGllc1trZXldKTtcbiAgICAgICAgaWRlbnRpZnkuc2V0KGtleSwgdXNlclByb3BlcnRpZXNba2V5XSk7XG4gICAgICB9XG4gICAgfVxuXG4gICAgc2NvcGUuaWRlbnRpZnkoaWRlbnRpZnkpO1xuICB9O1xuICAvKipcbiAgICogQHByaXZhdGVcbiAgICovXG5cblxuICBBbXBsaXR1ZGVDbGllbnQucHJvdG90eXBlLl9nZXRSZWZlcnJlciA9IGZ1bmN0aW9uIF9nZXRSZWZlcnJlcigpIHtcbiAgICByZXR1cm4gZG9jdW1lbnQucmVmZXJyZXI7XG4gIH07XG4gIC8qKlxuICAgKiBAcHJpdmF0ZVxuICAgKi9cblxuXG4gIEFtcGxpdHVkZUNsaWVudC5wcm90b3R5cGUuX2dldFVybFBhcmFtcyA9IGZ1bmN0aW9uIF9nZXRVcmxQYXJhbXMoKSB7XG4gICAgcmV0dXJuIGxvY2F0aW9uLnNlYXJjaDtcbiAgfTtcbiAgLyoqXG4gICAqIFRyeSB0byBmZXRjaCBHb29nbGUgR2NsaWQgZnJvbSB1cmwgcGFyYW1zLlxuICAgKiBAcHJpdmF0ZVxuICAgKi9cblxuXG4gIEFtcGxpdHVkZUNsaWVudC5wcm90b3R5cGUuX3NhdmVHY2xpZCA9IGZ1bmN0aW9uIF9zYXZlR2NsaWQodXJsUGFyYW1zKSB7XG4gICAgdmFyIGdjbGlkID0gdXRpbHMuZ2V0UXVlcnlQYXJhbSgnZ2NsaWQnLCB1cmxQYXJhbXMpO1xuXG4gICAgaWYgKHV0aWxzLmlzRW1wdHlTdHJpbmcoZ2NsaWQpKSB7XG4gICAgICByZXR1cm47XG4gICAgfVxuXG4gICAgdmFyIGdjbGlkUHJvcGVydGllcyA9IHtcbiAgICAgICdnY2xpZCc6IGdjbGlkXG4gICAgfTtcblxuICAgIF9zZW5kUGFyYW1zUmVmZXJyZXJVc2VyUHJvcGVydGllcyh0aGlzLCBnY2xpZFByb3BlcnRpZXMpO1xuICB9O1xuICAvKipcbiAgICogVHJ5IHRvIGZldGNoIEFtcGxpdHVkZSBkZXZpY2UgaWQgZnJvbSB1cmwgcGFyYW1zLlxuICAgKiBAcHJpdmF0ZVxuICAgKi9cblxuXG4gIEFtcGxpdHVkZUNsaWVudC5wcm90b3R5cGUuX2dldERldmljZUlkRnJvbVVybFBhcmFtID0gZnVuY3Rpb24gX2dldERldmljZUlkRnJvbVVybFBhcmFtKHVybFBhcmFtcykge1xuICAgIHJldHVybiB1dGlscy5nZXRRdWVyeVBhcmFtKENvbnN0YW50cy5BTVBfREVWSUNFX0lEX1BBUkFNLCB1cmxQYXJhbXMpO1xuICB9O1xuICAvKipcbiAgICogUGFyc2UgdGhlIGRvbWFpbiBmcm9tIHJlZmVycmVyIGluZm9cbiAgICogQHByaXZhdGVcbiAgICovXG5cblxuICBBbXBsaXR1ZGVDbGllbnQucHJvdG90eXBlLl9nZXRSZWZlcnJpbmdEb21haW4gPSBmdW5jdGlvbiBfZ2V0UmVmZXJyaW5nRG9tYWluKHJlZmVycmVyKSB7XG4gICAgaWYgKHV0aWxzLmlzRW1wdHlTdHJpbmcocmVmZXJyZXIpKSB7XG4gICAgICByZXR1cm4gbnVsbDtcbiAgICB9XG5cbiAgICB2YXIgcGFydHMgPSByZWZlcnJlci5zcGxpdCgnLycpO1xuXG4gICAgaWYgKHBhcnRzLmxlbmd0aCA+PSAzKSB7XG4gICAgICByZXR1cm4gcGFydHNbMl07XG4gICAgfVxuXG4gICAgcmV0dXJuIG51bGw7XG4gIH07XG4gIC8qKlxuICAgKiBGZXRjaCB0aGUgcmVmZXJyZXIgaW5mb3JtYXRpb24sIHBhcnNlIHRoZSBkb21haW4gYW5kIHNlbmQuXG4gICAqIFNpbmNlIHVzZXIgcHJvcGVydGllcyBhcmUgcHJvcGFnYXRlZCBvbiB0aGUgc2VydmVyLCBvbmx5IHNlbmQgb25jZSBwZXIgc2Vzc2lvbiwgZG9uJ3QgbmVlZCB0byBzZW5kIHdpdGggZXZlcnkgZXZlbnRcbiAgICogQHByaXZhdGVcbiAgICovXG5cblxuICBBbXBsaXR1ZGVDbGllbnQucHJvdG90eXBlLl9zYXZlUmVmZXJyZXIgPSBmdW5jdGlvbiBfc2F2ZVJlZmVycmVyKHJlZmVycmVyKSB7XG4gICAgaWYgKHV0aWxzLmlzRW1wdHlTdHJpbmcocmVmZXJyZXIpKSB7XG4gICAgICByZXR1cm47XG4gICAgfVxuXG4gICAgdmFyIHJlZmVycmVySW5mbyA9IHtcbiAgICAgICdyZWZlcnJlcic6IHJlZmVycmVyLFxuICAgICAgJ3JlZmVycmluZ19kb21haW4nOiB0aGlzLl9nZXRSZWZlcnJpbmdEb21haW4ocmVmZXJyZXIpXG4gICAgfTtcblxuICAgIF9zZW5kUGFyYW1zUmVmZXJyZXJVc2VyUHJvcGVydGllcyh0aGlzLCByZWZlcnJlckluZm8pO1xuICB9O1xuICAvKipcbiAgICogU2F2ZXMgdW5zZW50IGV2ZW50cyBhbmQgaWRlbnRpZmllcyB0byBsb2NhbFN0b3JhZ2UuIEpTT04gc3RyaW5naWZpZXMgZXZlbnQgcXVldWVzIGJlZm9yZSBzYXZpbmcuXG4gICAqIE5vdGU6IHRoaXMgaXMgY2FsbGVkIGF1dG9tYXRpY2FsbHkgZXZlcnkgdGltZSBldmVudHMgYXJlIGxvZ2dlZCwgdW5sZXNzIHlvdSBleHBsaWNpdGx5IHNldCBvcHRpb24gc2F2ZUV2ZW50cyB0byBmYWxzZS5cbiAgICogQHByaXZhdGVcbiAgICovXG5cblxuICBBbXBsaXR1ZGVDbGllbnQucHJvdG90eXBlLnNhdmVFdmVudHMgPSBmdW5jdGlvbiBzYXZlRXZlbnRzKCkge1xuICAgIHRyeSB7XG4gICAgICB2YXIgc2VyaWFsaXplZFVuc2VudEV2ZW50cyA9IEpTT04uc3RyaW5naWZ5KHRoaXMuX3Vuc2VudEV2ZW50cy5tYXAoZnVuY3Rpb24gKF9yZWYpIHtcbiAgICAgICAgdmFyIGV2ZW50ID0gX3JlZi5ldmVudDtcbiAgICAgICAgcmV0dXJuIGV2ZW50O1xuICAgICAgfSkpO1xuXG4gICAgICBpZiAoQXN5bmNTdG9yYWdlKSB7XG4gICAgICAgIEFzeW5jU3RvcmFnZS5zZXRJdGVtKHRoaXMub3B0aW9ucy51bnNlbnRLZXkgKyB0aGlzLl9zdG9yYWdlU3VmZml4LCBzZXJpYWxpemVkVW5zZW50RXZlbnRzKTtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIHRoaXMuX3NldEluU3RvcmFnZShsb2NhbFN0b3JhZ2UkMSwgdGhpcy5vcHRpb25zLnVuc2VudEtleSwgc2VyaWFsaXplZFVuc2VudEV2ZW50cyk7XG4gICAgICB9XG4gICAgfSBjYXRjaCAoZSkge31cblxuICAgIHRyeSB7XG4gICAgICB2YXIgc2VyaWFsaXplZElkZW50aWZ5cyA9IEpTT04uc3RyaW5naWZ5KHRoaXMuX3Vuc2VudElkZW50aWZ5cy5tYXAoZnVuY3Rpb24gKHVuc2VudElkZW50aWZ5KSB7XG4gICAgICAgIHJldHVybiB1bnNlbnRJZGVudGlmeS5ldmVudDtcbiAgICAgIH0pKTtcblxuICAgICAgaWYgKEFzeW5jU3RvcmFnZSkge1xuICAgICAgICBBc3luY1N0b3JhZ2Uuc2V0SXRlbSh0aGlzLm9wdGlvbnMudW5zZW50SWRlbnRpZnlLZXkgKyB0aGlzLl9zdG9yYWdlU3VmZml4LCBzZXJpYWxpemVkSWRlbnRpZnlzKTtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIHRoaXMuX3NldEluU3RvcmFnZShsb2NhbFN0b3JhZ2UkMSwgdGhpcy5vcHRpb25zLnVuc2VudElkZW50aWZ5S2V5LCBzZXJpYWxpemVkSWRlbnRpZnlzKTtcbiAgICAgIH1cbiAgICB9IGNhdGNoIChlKSB7fVxuICB9O1xuICAvKipcbiAgICogU2V0cyBhIGN1c3RvbWVyIGRvbWFpbiBmb3IgdGhlIGFtcGxpdHVkZSBjb29raWUuIFVzZWZ1bCBpZiB5b3Ugd2FudCB0byBzdXBwb3J0IGNyb3NzLXN1YmRvbWFpbiB0cmFja2luZy5cbiAgICogQHB1YmxpY1xuICAgKiBAcGFyYW0ge3N0cmluZ30gZG9tYWluIHRvIHNldC5cbiAgICogQGV4YW1wbGUgYW1wbGl0dWRlQ2xpZW50LnNldERvbWFpbignLmFtcGxpdHVkZS5jb20nKTtcbiAgICovXG5cblxuICBBbXBsaXR1ZGVDbGllbnQucHJvdG90eXBlLnNldERvbWFpbiA9IGZ1bmN0aW9uIHNldERvbWFpbihkb21haW4pIHtcbiAgICBpZiAodGhpcy5fc2hvdWxkRGVmZXJDYWxsKCkpIHtcbiAgICAgIHJldHVybiB0aGlzLl9xLnB1c2goWydzZXREb21haW4nXS5jb25jYXQoQXJyYXkucHJvdG90eXBlLnNsaWNlLmNhbGwoYXJndW1lbnRzLCAwKSkpO1xuICAgIH1cblxuICAgIGlmICghdXRpbHMudmFsaWRhdGVJbnB1dChkb21haW4sICdkb21haW4nLCAnc3RyaW5nJykpIHtcbiAgICAgIHJldHVybjtcbiAgICB9XG5cbiAgICB0cnkge1xuICAgICAgdGhpcy5jb29raWVTdG9yYWdlLm9wdGlvbnMoe1xuICAgICAgICBleHBpcmF0aW9uRGF5czogdGhpcy5vcHRpb25zLmNvb2tpZUV4cGlyYXRpb24sXG4gICAgICAgIHNlY3VyZTogdGhpcy5vcHRpb25zLnNlY3VyZUNvb2tpZSxcbiAgICAgICAgZG9tYWluOiBkb21haW4sXG4gICAgICAgIHNhbWVTaXRlOiB0aGlzLm9wdGlvbnMuc2FtZVNpdGVDb29raWVcbiAgICAgIH0pO1xuICAgICAgdGhpcy5vcHRpb25zLmRvbWFpbiA9IHRoaXMuY29va2llU3RvcmFnZS5vcHRpb25zKCkuZG9tYWluO1xuXG4gICAgICBfbG9hZENvb2tpZURhdGEodGhpcyk7XG5cbiAgICAgIF9zYXZlQ29va2llRGF0YSh0aGlzKTtcbiAgICB9IGNhdGNoIChlKSB7XG4gICAgICB1dGlscy5sb2cuZXJyb3IoZSk7XG4gICAgfVxuICB9O1xuICAvKipcbiAgICogU2V0cyBhbiBpZGVudGlmaWVyIGZvciB0aGUgY3VycmVudCB1c2VyLlxuICAgKiBAcHVibGljXG4gICAqIEBwYXJhbSB7c3RyaW5nfSB1c2VySWQgLSBpZGVudGlmaWVyIHRvIHNldC4gQ2FuIGJlIG51bGwuXG4gICAqIEBleGFtcGxlIGFtcGxpdHVkZUNsaWVudC5zZXRVc2VySWQoJ2pvZUBnbWFpbC5jb20nKTtcbiAgICovXG5cblxuICBBbXBsaXR1ZGVDbGllbnQucHJvdG90eXBlLnNldFVzZXJJZCA9IGZ1bmN0aW9uIHNldFVzZXJJZCh1c2VySWQpIHtcbiAgICBpZiAodGhpcy5fc2hvdWxkRGVmZXJDYWxsKCkpIHtcbiAgICAgIHJldHVybiB0aGlzLl9xLnB1c2goWydzZXRVc2VySWQnXS5jb25jYXQoQXJyYXkucHJvdG90eXBlLnNsaWNlLmNhbGwoYXJndW1lbnRzLCAwKSkpO1xuICAgIH1cblxuICAgIHRyeSB7XG4gICAgICB0aGlzLm9wdGlvbnMudXNlcklkID0gdXNlcklkICE9PSB1bmRlZmluZWQgJiYgdXNlcklkICE9PSBudWxsICYmICcnICsgdXNlcklkIHx8IG51bGw7XG5cbiAgICAgIF9zYXZlQ29va2llRGF0YSh0aGlzKTtcbiAgICB9IGNhdGNoIChlKSB7XG4gICAgICB1dGlscy5sb2cuZXJyb3IoZSk7XG4gICAgfVxuICB9O1xuICAvKipcbiAgICogQWRkIHVzZXIgdG8gYSBncm91cCBvciBncm91cHMuIFlvdSBuZWVkIHRvIHNwZWNpZnkgYSBncm91cFR5cGUgYW5kIGdyb3VwTmFtZShzKS5cbiAgICogRm9yIGV4YW1wbGUgeW91IGNhbiBncm91cCBwZW9wbGUgYnkgdGhlaXIgb3JnYW5pemF0aW9uLlxuICAgKiBJbiB0aGF0IGNhc2UgZ3JvdXBUeXBlIGlzIFwib3JnSWRcIiBhbmQgZ3JvdXBOYW1lIHdvdWxkIGJlIHRoZSBhY3R1YWwgSUQocykuXG4gICAqIGdyb3VwTmFtZSBjYW4gYmUgYSBzdHJpbmcgb3IgYW4gYXJyYXkgb2Ygc3RyaW5ncyB0byBpbmRpY2F0ZSBhIHVzZXIgaW4gbXVsdGlwbGUgZ3J1dXBzLlxuICAgKiBZb3UgY2FuIGFsc28gY2FsbCBzZXRHcm91cCBtdWx0aXBsZSB0aW1lcyB3aXRoIGRpZmZlcmVudCBncm91cFR5cGVzIHRvIHRyYWNrIG11bHRpcGxlIHR5cGVzIG9mIGdyb3VwcyAodXAgdG8gNSBwZXIgYXBwKS5cbiAgICogTm90ZTogdGhpcyB3aWxsIGFsc28gc2V0IGdyb3VwVHlwZTogZ3JvdXBOYW1lIGFzIGEgdXNlciBwcm9wZXJ0eS5cbiAgICogU2VlIHRoZSBbU0RLIFJlYWRtZV17QGxpbmsgaHR0cHM6Ly9naXRodWIuY29tL2FtcGxpdHVkZS9BbXBsaXR1ZGUtSmF2YXNjcmlwdCNzZXR0aW5nLWdyb3Vwc30gZm9yIG1vcmUgaW5mb3JtYXRpb24uXG4gICAqIEBwdWJsaWNcbiAgICogQHBhcmFtIHtzdHJpbmd9IGdyb3VwVHlwZSAtIHRoZSBncm91cCB0eXBlIChleDogb3JnSWQpXG4gICAqIEBwYXJhbSB7c3RyaW5nfGxpc3R9IGdyb3VwTmFtZSAtIHRoZSBuYW1lIG9mIHRoZSBncm91cCAoZXg6IDE1KSwgb3IgYSBsaXN0IG9mIG5hbWVzIG9mIHRoZSBncm91cHNcbiAgICogQGV4YW1wbGUgYW1wbGl0dWRlQ2xpZW50LnNldEdyb3VwKCdvcmdJZCcsIDE1KTsgLy8gdGhpcyBhZGRzIHRoZSBjdXJyZW50IHVzZXIgdG8gb3JnSWQgMTUuXG4gICAqL1xuXG5cbiAgQW1wbGl0dWRlQ2xpZW50LnByb3RvdHlwZS5zZXRHcm91cCA9IGZ1bmN0aW9uIChncm91cFR5cGUsIGdyb3VwTmFtZSkge1xuICAgIGlmICh0aGlzLl9zaG91bGREZWZlckNhbGwoKSkge1xuICAgICAgcmV0dXJuIHRoaXMuX3EucHVzaChbJ3NldEdyb3VwJ10uY29uY2F0KEFycmF5LnByb3RvdHlwZS5zbGljZS5jYWxsKGFyZ3VtZW50cywgMCkpKTtcbiAgICB9XG5cbiAgICBpZiAoIXRoaXMuX2FwaUtleVNldCgnc2V0R3JvdXAoKScpIHx8ICF1dGlscy52YWxpZGF0ZUlucHV0KGdyb3VwVHlwZSwgJ2dyb3VwVHlwZScsICdzdHJpbmcnKSB8fCB1dGlscy5pc0VtcHR5U3RyaW5nKGdyb3VwVHlwZSkpIHtcbiAgICAgIHJldHVybjtcbiAgICB9XG5cbiAgICB2YXIgZ3JvdXBzID0ge307XG4gICAgZ3JvdXBzW2dyb3VwVHlwZV0gPSBncm91cE5hbWU7XG4gICAgdmFyIGlkZW50aWZ5ID0gbmV3IElkZW50aWZ5KCkuc2V0KGdyb3VwVHlwZSwgZ3JvdXBOYW1lKTtcblxuICAgIHRoaXMuX2xvZ0V2ZW50KENvbnN0YW50cy5JREVOVElGWV9FVkVOVCwgbnVsbCwgbnVsbCwgaWRlbnRpZnkudXNlclByb3BlcnRpZXNPcGVyYXRpb25zLCBncm91cHMsIG51bGwsIG51bGwsIG51bGwpO1xuICB9O1xuICAvKipcbiAgICogU2V0cyB3aGV0aGVyIHRvIG9wdCBjdXJyZW50IHVzZXIgb3V0IG9mIHRyYWNraW5nLlxuICAgKiBAcHVibGljXG4gICAqIEBwYXJhbSB7Ym9vbGVhbn0gZW5hYmxlIC0gaWYgdHJ1ZSB0aGVuIG5vIGV2ZW50cyB3aWxsIGJlIGxvZ2dlZCBvciBzZW50LlxuICAgKiBAZXhhbXBsZTogYW1wbGl0dWRlLnNldE9wdE91dCh0cnVlKTtcbiAgICovXG5cblxuICBBbXBsaXR1ZGVDbGllbnQucHJvdG90eXBlLnNldE9wdE91dCA9IGZ1bmN0aW9uIHNldE9wdE91dChlbmFibGUpIHtcbiAgICBpZiAodGhpcy5fc2hvdWxkRGVmZXJDYWxsKCkpIHtcbiAgICAgIHJldHVybiB0aGlzLl9xLnB1c2goWydzZXRPcHRPdXQnXS5jb25jYXQoQXJyYXkucHJvdG90eXBlLnNsaWNlLmNhbGwoYXJndW1lbnRzLCAwKSkpO1xuICAgIH1cblxuICAgIGlmICghdXRpbHMudmFsaWRhdGVJbnB1dChlbmFibGUsICdlbmFibGUnLCAnYm9vbGVhbicpKSB7XG4gICAgICByZXR1cm47XG4gICAgfVxuXG4gICAgdHJ5IHtcbiAgICAgIHRoaXMub3B0aW9ucy5vcHRPdXQgPSBlbmFibGU7XG5cbiAgICAgIF9zYXZlQ29va2llRGF0YSh0aGlzKTtcbiAgICB9IGNhdGNoIChlKSB7XG4gICAgICB1dGlscy5sb2cuZXJyb3IoZSk7XG4gICAgfVxuICB9O1xuXG4gIEFtcGxpdHVkZUNsaWVudC5wcm90b3R5cGUuc2V0U2Vzc2lvbklkID0gZnVuY3Rpb24gc2V0U2Vzc2lvbklkKHNlc3Npb25JZCkge1xuICAgIGlmICghdXRpbHMudmFsaWRhdGVJbnB1dChzZXNzaW9uSWQsICdzZXNzaW9uSWQnLCAnbnVtYmVyJykpIHtcbiAgICAgIHJldHVybjtcbiAgICB9XG5cbiAgICB0cnkge1xuICAgICAgdGhpcy5fc2Vzc2lvbklkID0gc2Vzc2lvbklkO1xuXG4gICAgICBfc2F2ZUNvb2tpZURhdGEodGhpcyk7XG4gICAgfSBjYXRjaCAoZSkge1xuICAgICAgdXRpbHMubG9nLmVycm9yKGUpO1xuICAgIH1cbiAgfTtcblxuICBBbXBsaXR1ZGVDbGllbnQucHJvdG90eXBlLnJlc2V0U2Vzc2lvbklkID0gZnVuY3Rpb24gcmVzZXRTZXNzaW9uSWQoKSB7XG4gICAgdGhpcy5zZXRTZXNzaW9uSWQobmV3IERhdGUoKS5nZXRUaW1lKCkpO1xuICB9O1xuICAvKipcbiAgICAqIFJlZ2VuZXJhdGVzIGEgbmV3IHJhbmRvbSBkZXZpY2VJZCBmb3IgY3VycmVudCB1c2VyLiBOb3RlOiB0aGlzIGlzIG5vdCByZWNvbW1lbmRlZCB1bmxlc3MgeW91IGtub3cgd2hhdCB5b3VcbiAgICAqIGFyZSBkb2luZy4gVGhpcyBjYW4gYmUgdXNlZCBpbiBjb25qdW5jdGlvbiB3aXRoIGBzZXRVc2VySWQobnVsbClgIHRvIGFub255bWl6ZSB1c2VycyBhZnRlciB0aGV5IGxvZyBvdXQuXG4gICAgKiBXaXRoIGEgbnVsbCB1c2VySWQgYW5kIGEgY29tcGxldGVseSBuZXcgZGV2aWNlSWQsIHRoZSBjdXJyZW50IHVzZXIgd291bGQgYXBwZWFyIGFzIGEgYnJhbmQgbmV3IHVzZXIgaW4gZGFzaGJvYXJkLlxuICAgICogVGhpcyB1c2VzIHNyYy91dWlkLmpzIHRvIHJlZ2VuZXJhdGUgdGhlIGRldmljZUlkLlxuICAgICogQHB1YmxpY1xuICAgICovXG5cblxuICBBbXBsaXR1ZGVDbGllbnQucHJvdG90eXBlLnJlZ2VuZXJhdGVEZXZpY2VJZCA9IGZ1bmN0aW9uIHJlZ2VuZXJhdGVEZXZpY2VJZCgpIHtcbiAgICBpZiAodGhpcy5fc2hvdWxkRGVmZXJDYWxsKCkpIHtcbiAgICAgIHJldHVybiB0aGlzLl9xLnB1c2goWydyZWdlbmVyYXRlRGV2aWNlSWQnXS5jb25jYXQoQXJyYXkucHJvdG90eXBlLnNsaWNlLmNhbGwoYXJndW1lbnRzLCAwKSkpO1xuICAgIH1cblxuICAgIHRoaXMuc2V0RGV2aWNlSWQoYmFzZTY0SWQoKSk7XG4gIH07XG4gIC8qKlxuICAgICogU2V0cyBhIGN1c3RvbSBkZXZpY2VJZCBmb3IgY3VycmVudCB1c2VyLiBOb3RlOiB0aGlzIGlzIG5vdCByZWNvbW1lbmRlZCB1bmxlc3MgeW91IGtub3cgd2hhdCB5b3UgYXJlIGRvaW5nXG4gICAgKiAobGlrZSBpZiB5b3UgaGF2ZSB5b3VyIG93biBzeXN0ZW0gZm9yIG1hbmFnaW5nIGRldmljZUlkcykuIE1ha2Ugc3VyZSB0aGUgZGV2aWNlSWQgeW91IHNldCBpcyBzdWZmaWNpZW50bHkgdW5pcXVlXG4gICAgKiAod2UgcmVjb21tZW5kIHNvbWV0aGluZyBsaWtlIGEgVVVJRCAtIHNlZSBzcmMvdXVpZC5qcyBmb3IgYW4gZXhhbXBsZSBvZiBob3cgdG8gZ2VuZXJhdGUpIHRvIHByZXZlbnQgY29uZmxpY3RzIHdpdGggb3RoZXIgZGV2aWNlcyBpbiBvdXIgc3lzdGVtLlxuICAgICogQHB1YmxpY1xuICAgICogQHBhcmFtIHtzdHJpbmd9IGRldmljZUlkIC0gY3VzdG9tIGRldmljZUlkIGZvciBjdXJyZW50IHVzZXIuXG4gICAgKiBAZXhhbXBsZSBhbXBsaXR1ZGVDbGllbnQuc2V0RGV2aWNlSWQoJzQ1ZjA5NTRmLWViNzktNDQ2My1hYzhhLTIzM2E2ZjQ1YThmMCcpO1xuICAgICovXG5cblxuICBBbXBsaXR1ZGVDbGllbnQucHJvdG90eXBlLnNldERldmljZUlkID0gZnVuY3Rpb24gc2V0RGV2aWNlSWQoZGV2aWNlSWQpIHtcbiAgICBpZiAodGhpcy5fc2hvdWxkRGVmZXJDYWxsKCkpIHtcbiAgICAgIHJldHVybiB0aGlzLl9xLnB1c2goWydzZXREZXZpY2VJZCddLmNvbmNhdChBcnJheS5wcm90b3R5cGUuc2xpY2UuY2FsbChhcmd1bWVudHMsIDApKSk7XG4gICAgfVxuXG4gICAgaWYgKCF1dGlscy52YWxpZGF0ZUlucHV0KGRldmljZUlkLCAnZGV2aWNlSWQnLCAnc3RyaW5nJykpIHtcbiAgICAgIHJldHVybjtcbiAgICB9XG5cbiAgICB0cnkge1xuICAgICAgaWYgKCF1dGlscy5pc0VtcHR5U3RyaW5nKGRldmljZUlkKSkge1xuICAgICAgICB0aGlzLm9wdGlvbnMuZGV2aWNlSWQgPSAnJyArIGRldmljZUlkO1xuXG4gICAgICAgIF9zYXZlQ29va2llRGF0YSh0aGlzKTtcbiAgICAgIH1cbiAgICB9IGNhdGNoIChlKSB7XG4gICAgICB1dGlscy5sb2cuZXJyb3IoZSk7XG4gICAgfVxuICB9O1xuICAvKipcbiAgICogU2V0cyB1c2VyIHByb3BlcnRpZXMgZm9yIHRoZSBjdXJyZW50IHVzZXIuXG4gICAqIEBwdWJsaWNcbiAgICogQHBhcmFtIHtvYmplY3R9IC0gb2JqZWN0IHdpdGggc3RyaW5nIGtleXMgYW5kIHZhbHVlcyBmb3IgdGhlIHVzZXIgcHJvcGVydGllcyB0byBzZXQuXG4gICAqIEBwYXJhbSB7Ym9vbGVhbn0gLSBERVBSRUNBVEVEIG9wdF9yZXBsYWNlOiBpbiBlYXJsaWVyIHZlcnNpb25zIG9mIHRoZSBKUyBTREsgdGhlIHVzZXIgcHJvcGVydGllcyBvYmplY3Qgd2FzIGtlcHQgaW5cbiAgICogbWVtb3J5IGFuZCByZXBsYWNlID0gdHJ1ZSB3b3VsZCByZXBsYWNlIHRoZSBvYmplY3QgaW4gbWVtb3J5LiBOb3cgdGhlIHByb3BlcnRpZXMgYXJlIG5vIGxvbmdlciBzdG9yZWQgaW4gbWVtb3J5LCBzbyByZXBsYWNlIGlzIGRlcHJlY2F0ZWQuXG4gICAqIEBleGFtcGxlIGFtcGxpdHVkZUNsaWVudC5zZXRVc2VyUHJvcGVydGllcyh7J2dlbmRlcic6ICdmZW1hbGUnLCAnc2lnbl91cF9jb21wbGV0ZSc6IHRydWV9KVxuICAgKi9cblxuXG4gIEFtcGxpdHVkZUNsaWVudC5wcm90b3R5cGUuc2V0VXNlclByb3BlcnRpZXMgPSBmdW5jdGlvbiBzZXRVc2VyUHJvcGVydGllcyh1c2VyUHJvcGVydGllcykge1xuICAgIGlmICh0aGlzLl9zaG91bGREZWZlckNhbGwoKSkge1xuICAgICAgcmV0dXJuIHRoaXMuX3EucHVzaChbJ3NldFVzZXJQcm9wZXJ0aWVzJ10uY29uY2F0KEFycmF5LnByb3RvdHlwZS5zbGljZS5jYWxsKGFyZ3VtZW50cywgMCkpKTtcbiAgICB9XG5cbiAgICBpZiAoIXRoaXMuX2FwaUtleVNldCgnc2V0VXNlclByb3BlcnRpZXMoKScpIHx8ICF1dGlscy52YWxpZGF0ZUlucHV0KHVzZXJQcm9wZXJ0aWVzLCAndXNlclByb3BlcnRpZXMnLCAnb2JqZWN0JykpIHtcbiAgICAgIHJldHVybjtcbiAgICB9IC8vIHNhbml0aXplIHRoZSB1c2VyUHJvcGVydGllcyBkaWN0IGJlZm9yZSBjb252ZXJ0aW5nIGludG8gaWRlbnRpZnlcblxuXG4gICAgdmFyIHNhbml0aXplZCA9IHV0aWxzLnRydW5jYXRlKHV0aWxzLnZhbGlkYXRlUHJvcGVydGllcyh1c2VyUHJvcGVydGllcykpO1xuXG4gICAgaWYgKE9iamVjdC5rZXlzKHNhbml0aXplZCkubGVuZ3RoID09PSAwKSB7XG4gICAgICByZXR1cm47XG4gICAgfSAvLyBjb252ZXJ0IHVzZXJQcm9wZXJ0aWVzIGludG8gYW4gaWRlbnRpZnkgY2FsbFxuXG5cbiAgICB2YXIgaWRlbnRpZnkgPSBuZXcgSWRlbnRpZnkoKTtcblxuICAgIGZvciAodmFyIHByb3BlcnR5IGluIHNhbml0aXplZCkge1xuICAgICAgaWYgKHNhbml0aXplZC5oYXNPd25Qcm9wZXJ0eShwcm9wZXJ0eSkpIHtcbiAgICAgICAgaWRlbnRpZnkuc2V0KHByb3BlcnR5LCBzYW5pdGl6ZWRbcHJvcGVydHldKTtcbiAgICAgIH1cbiAgICB9XG5cbiAgICB0aGlzLmlkZW50aWZ5KGlkZW50aWZ5KTtcbiAgfTtcbiAgLyoqXG4gICAqIENsZWFyIGFsbCBvZiB0aGUgdXNlciBwcm9wZXJ0aWVzIGZvciB0aGUgY3VycmVudCB1c2VyLiBOb3RlOiBjbGVhcmluZyB1c2VyIHByb3BlcnRpZXMgaXMgaXJyZXZlcnNpYmxlIVxuICAgKiBAcHVibGljXG4gICAqIEBleGFtcGxlIGFtcGxpdHVkZUNsaWVudC5jbGVhclVzZXJQcm9wZXJ0aWVzKCk7XG4gICAqL1xuXG5cbiAgQW1wbGl0dWRlQ2xpZW50LnByb3RvdHlwZS5jbGVhclVzZXJQcm9wZXJ0aWVzID0gZnVuY3Rpb24gY2xlYXJVc2VyUHJvcGVydGllcygpIHtcbiAgICBpZiAodGhpcy5fc2hvdWxkRGVmZXJDYWxsKCkpIHtcbiAgICAgIHJldHVybiB0aGlzLl9xLnB1c2goWydjbGVhclVzZXJQcm9wZXJ0aWVzJ10uY29uY2F0KEFycmF5LnByb3RvdHlwZS5zbGljZS5jYWxsKGFyZ3VtZW50cywgMCkpKTtcbiAgICB9XG5cbiAgICBpZiAoIXRoaXMuX2FwaUtleVNldCgnY2xlYXJVc2VyUHJvcGVydGllcygpJykpIHtcbiAgICAgIHJldHVybjtcbiAgICB9XG5cbiAgICB2YXIgaWRlbnRpZnkgPSBuZXcgSWRlbnRpZnkoKTtcbiAgICBpZGVudGlmeS5jbGVhckFsbCgpO1xuICAgIHRoaXMuaWRlbnRpZnkoaWRlbnRpZnkpO1xuICB9O1xuICAvKipcbiAgICogQXBwbGllcyB0aGUgcHJveGllZCBmdW5jdGlvbnMgb24gdGhlIHByb3hpZWQgb2JqZWN0IHRvIGFuIGluc3RhbmNlIG9mIHRoZSByZWFsIG9iamVjdC5cbiAgICogVXNlZCB0byBjb252ZXJ0IHByb3hpZWQgSWRlbnRpZnkgYW5kIFJldmVudWUgb2JqZWN0cy5cbiAgICogQHByaXZhdGVcbiAgICovXG5cblxuICB2YXIgX2NvbnZlcnRQcm94eU9iamVjdFRvUmVhbE9iamVjdCA9IGZ1bmN0aW9uIF9jb252ZXJ0UHJveHlPYmplY3RUb1JlYWxPYmplY3QoaW5zdGFuY2UsIHByb3h5KSB7XG4gICAgZm9yICh2YXIgaSA9IDA7IGkgPCBwcm94eS5fcS5sZW5ndGg7IGkrKykge1xuICAgICAgdmFyIGZuID0gaW5zdGFuY2VbcHJveHkuX3FbaV1bMF1dO1xuXG4gICAgICBpZiAodHlwZShmbikgPT09ICdmdW5jdGlvbicpIHtcbiAgICAgICAgZm4uYXBwbHkoaW5zdGFuY2UsIHByb3h5Ll9xW2ldLnNsaWNlKDEpKTtcbiAgICAgIH1cbiAgICB9XG5cbiAgICByZXR1cm4gaW5zdGFuY2U7XG4gIH07XG4gIC8qKlxuICAgKiBTZW5kIGFuIGlkZW50aWZ5IGNhbGwgY29udGFpbmluZyB1c2VyIHByb3BlcnR5IG9wZXJhdGlvbnMgdG8gQW1wbGl0dWRlIHNlcnZlcnMuXG4gICAqIFNlZSBbUmVhZG1lXXtAbGluayBodHRwczovL2dpdGh1Yi5jb20vYW1wbGl0dWRlL0FtcGxpdHVkZS1KYXZhc2NyaXB0I3VzZXItcHJvcGVydGllcy1hbmQtdXNlci1wcm9wZXJ0eS1vcGVyYXRpb25zfVxuICAgKiBmb3IgbW9yZSBpbmZvcm1hdGlvbiBvbiB0aGUgSWRlbnRpZnkgQVBJIGFuZCB1c2VyIHByb3BlcnR5IG9wZXJhdGlvbnMuXG4gICAqIEBwYXJhbSB7SWRlbnRpZnl9IGlkZW50aWZ5X29iaiAtIHRoZSBJZGVudGlmeSBvYmplY3QgY29udGFpbmluZyB0aGUgdXNlciBwcm9wZXJ0eSBvcGVyYXRpb25zIHRvIHNlbmQuXG4gICAqIEBwYXJhbSB7QW1wbGl0dWRlfmV2ZW50Q2FsbGJhY2t9IG9wdF9jYWxsYmFjayAtIChvcHRpb25hbCkgY2FsbGJhY2sgZnVuY3Rpb24gdG8gcnVuIHdoZW4gdGhlIGlkZW50aWZ5IGV2ZW50IGhhcyBiZWVuIHNlbnQuXG4gICAqIE5vdGU6IHRoZSBzZXJ2ZXIgcmVzcG9uc2UgY29kZSBhbmQgcmVzcG9uc2UgYm9keSBmcm9tIHRoZSBpZGVudGlmeSBldmVudCB1cGxvYWQgYXJlIHBhc3NlZCB0byB0aGUgY2FsbGJhY2sgZnVuY3Rpb24uXG4gICAqIEBleGFtcGxlXG4gICAqIHZhciBpZGVudGlmeSA9IG5ldyBhbXBsaXR1ZGUuSWRlbnRpZnkoKS5zZXQoJ2NvbG9ycycsIFsncm9zZScsICdnb2xkJ10pLmFkZCgna2FybWEnLCAxKS5zZXRPbmNlKCdzaWduX3VwX2RhdGUnLCAnMjAxNi0wMy0zMScpO1xuICAgKiBhbXBsaXR1ZGUuaWRlbnRpZnkoaWRlbnRpZnkpO1xuICAgKi9cblxuXG4gIEFtcGxpdHVkZUNsaWVudC5wcm90b3R5cGUuaWRlbnRpZnkgPSBmdW5jdGlvbiAoaWRlbnRpZnlfb2JqLCBvcHRfY2FsbGJhY2spIHtcbiAgICBpZiAodGhpcy5fc2hvdWxkRGVmZXJDYWxsKCkpIHtcbiAgICAgIHJldHVybiB0aGlzLl9xLnB1c2goWydpZGVudGlmeSddLmNvbmNhdChBcnJheS5wcm90b3R5cGUuc2xpY2UuY2FsbChhcmd1bWVudHMsIDApKSk7XG4gICAgfVxuXG4gICAgaWYgKCF0aGlzLl9hcGlLZXlTZXQoJ2lkZW50aWZ5KCknKSkge1xuICAgICAgaWYgKHR5cGUob3B0X2NhbGxiYWNrKSA9PT0gJ2Z1bmN0aW9uJykge1xuICAgICAgICBvcHRfY2FsbGJhY2soMCwgJ05vIHJlcXVlc3Qgc2VudCcsIHtcbiAgICAgICAgICByZWFzb246ICdBUEkga2V5IGlzIG5vdCBzZXQnXG4gICAgICAgIH0pO1xuICAgICAgfVxuXG4gICAgICByZXR1cm47XG4gICAgfSAvLyBpZiBpZGVudGlmeSBpbnB1dCBpcyBhIHByb3hpZWQgb2JqZWN0IGNyZWF0ZWQgYnkgdGhlIGFzeW5jIGxvYWRpbmcgc25pcHBldCwgY29udmVydCBpdCBpbnRvIGFuIGlkZW50aWZ5IG9iamVjdFxuXG5cbiAgICBpZiAodHlwZShpZGVudGlmeV9vYmopID09PSAnb2JqZWN0JyAmJiBpZGVudGlmeV9vYmouaGFzT3duUHJvcGVydHkoJ19xJykpIHtcbiAgICAgIGlkZW50aWZ5X29iaiA9IF9jb252ZXJ0UHJveHlPYmplY3RUb1JlYWxPYmplY3QobmV3IElkZW50aWZ5KCksIGlkZW50aWZ5X29iaik7XG4gICAgfVxuXG4gICAgaWYgKGlkZW50aWZ5X29iaiBpbnN0YW5jZW9mIElkZW50aWZ5KSB7XG4gICAgICAvLyBvbmx5IHNlbmQgaWYgdGhlcmUgYXJlIG9wZXJhdGlvbnNcbiAgICAgIGlmIChPYmplY3Qua2V5cyhpZGVudGlmeV9vYmoudXNlclByb3BlcnRpZXNPcGVyYXRpb25zKS5sZW5ndGggPiAwKSB7XG4gICAgICAgIHJldHVybiB0aGlzLl9sb2dFdmVudChDb25zdGFudHMuSURFTlRJRllfRVZFTlQsIG51bGwsIG51bGwsIGlkZW50aWZ5X29iai51c2VyUHJvcGVydGllc09wZXJhdGlvbnMsIG51bGwsIG51bGwsIG51bGwsIG9wdF9jYWxsYmFjayk7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICBpZiAodHlwZShvcHRfY2FsbGJhY2spID09PSAnZnVuY3Rpb24nKSB7XG4gICAgICAgICAgb3B0X2NhbGxiYWNrKDAsICdObyByZXF1ZXN0IHNlbnQnLCB7XG4gICAgICAgICAgICByZWFzb246ICdObyB1c2VyIHByb3BlcnR5IG9wZXJhdGlvbnMnXG4gICAgICAgICAgfSk7XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICB9IGVsc2Uge1xuICAgICAgdXRpbHMubG9nLmVycm9yKCdJbnZhbGlkIGlkZW50aWZ5IGlucHV0IHR5cGUuIEV4cGVjdGVkIElkZW50aWZ5IG9iamVjdCBidXQgc2F3ICcgKyB0eXBlKGlkZW50aWZ5X29iaikpO1xuXG4gICAgICBpZiAodHlwZShvcHRfY2FsbGJhY2spID09PSAnZnVuY3Rpb24nKSB7XG4gICAgICAgIG9wdF9jYWxsYmFjaygwLCAnTm8gcmVxdWVzdCBzZW50Jywge1xuICAgICAgICAgIHJlYXNvbjogJ0ludmFsaWQgaWRlbnRpZnkgaW5wdXQgdHlwZSdcbiAgICAgICAgfSk7XG4gICAgICB9XG4gICAgfVxuICB9O1xuXG4gIEFtcGxpdHVkZUNsaWVudC5wcm90b3R5cGUuZ3JvdXBJZGVudGlmeSA9IGZ1bmN0aW9uIChncm91cF90eXBlLCBncm91cF9uYW1lLCBpZGVudGlmeV9vYmosIG9wdF9jYWxsYmFjaykge1xuICAgIGlmICh0aGlzLl9zaG91bGREZWZlckNhbGwoKSkge1xuICAgICAgcmV0dXJuIHRoaXMuX3EucHVzaChbJ2dyb3VwSWRlbnRpZnknXS5jb25jYXQoQXJyYXkucHJvdG90eXBlLnNsaWNlLmNhbGwoYXJndW1lbnRzLCAwKSkpO1xuICAgIH1cblxuICAgIGlmICghdGhpcy5fYXBpS2V5U2V0KCdncm91cElkZW50aWZ5KCknKSkge1xuICAgICAgaWYgKHR5cGUob3B0X2NhbGxiYWNrKSA9PT0gJ2Z1bmN0aW9uJykge1xuICAgICAgICBvcHRfY2FsbGJhY2soMCwgJ05vIHJlcXVlc3Qgc2VudCcsIHtcbiAgICAgICAgICByZWFzb246ICdBUEkga2V5IGlzIG5vdCBzZXQnXG4gICAgICAgIH0pO1xuICAgICAgfVxuXG4gICAgICByZXR1cm47XG4gICAgfVxuXG4gICAgaWYgKCF1dGlscy52YWxpZGF0ZUlucHV0KGdyb3VwX3R5cGUsICdncm91cF90eXBlJywgJ3N0cmluZycpIHx8IHV0aWxzLmlzRW1wdHlTdHJpbmcoZ3JvdXBfdHlwZSkpIHtcbiAgICAgIGlmICh0eXBlKG9wdF9jYWxsYmFjaykgPT09ICdmdW5jdGlvbicpIHtcbiAgICAgICAgb3B0X2NhbGxiYWNrKDAsICdObyByZXF1ZXN0IHNlbnQnLCB7XG4gICAgICAgICAgcmVhc29uOiAnSW52YWxpZCBncm91cCB0eXBlJ1xuICAgICAgICB9KTtcbiAgICAgIH1cblxuICAgICAgcmV0dXJuO1xuICAgIH1cblxuICAgIGlmIChncm91cF9uYW1lID09PSBudWxsIHx8IGdyb3VwX25hbWUgPT09IHVuZGVmaW5lZCkge1xuICAgICAgaWYgKHR5cGUob3B0X2NhbGxiYWNrKSA9PT0gJ2Z1bmN0aW9uJykge1xuICAgICAgICBvcHRfY2FsbGJhY2soMCwgJ05vIHJlcXVlc3Qgc2VudCcsIHtcbiAgICAgICAgICByZWFzb246ICdJbnZhbGlkIGdyb3VwIG5hbWUnXG4gICAgICAgIH0pO1xuICAgICAgfVxuXG4gICAgICByZXR1cm47XG4gICAgfSAvLyBpZiBpZGVudGlmeSBpbnB1dCBpcyBhIHByb3hpZWQgb2JqZWN0IGNyZWF0ZWQgYnkgdGhlIGFzeW5jIGxvYWRpbmcgc25pcHBldCwgY29udmVydCBpdCBpbnRvIGFuIGlkZW50aWZ5IG9iamVjdFxuXG5cbiAgICBpZiAodHlwZShpZGVudGlmeV9vYmopID09PSAnb2JqZWN0JyAmJiBpZGVudGlmeV9vYmouaGFzT3duUHJvcGVydHkoJ19xJykpIHtcbiAgICAgIGlkZW50aWZ5X29iaiA9IF9jb252ZXJ0UHJveHlPYmplY3RUb1JlYWxPYmplY3QobmV3IElkZW50aWZ5KCksIGlkZW50aWZ5X29iaik7XG4gICAgfVxuXG4gICAgaWYgKGlkZW50aWZ5X29iaiBpbnN0YW5jZW9mIElkZW50aWZ5KSB7XG4gICAgICAvLyBvbmx5IHNlbmQgaWYgdGhlcmUgYXJlIG9wZXJhdGlvbnNcbiAgICAgIGlmIChPYmplY3Qua2V5cyhpZGVudGlmeV9vYmoudXNlclByb3BlcnRpZXNPcGVyYXRpb25zKS5sZW5ndGggPiAwKSB7XG4gICAgICAgIHJldHVybiB0aGlzLl9sb2dFdmVudChDb25zdGFudHMuR1JPVVBfSURFTlRJRllfRVZFTlQsIG51bGwsIG51bGwsIG51bGwsIF9kZWZpbmVQcm9wZXJ0eSh7fSwgZ3JvdXBfdHlwZSwgZ3JvdXBfbmFtZSksIGlkZW50aWZ5X29iai51c2VyUHJvcGVydGllc09wZXJhdGlvbnMsIG51bGwsIG9wdF9jYWxsYmFjayk7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICBpZiAodHlwZShvcHRfY2FsbGJhY2spID09PSAnZnVuY3Rpb24nKSB7XG4gICAgICAgICAgb3B0X2NhbGxiYWNrKDAsICdObyByZXF1ZXN0IHNlbnQnLCB7XG4gICAgICAgICAgICByZWFzb246ICdObyBncm91cCBwcm9wZXJ0eSBvcGVyYXRpb25zJ1xuICAgICAgICAgIH0pO1xuICAgICAgICB9XG4gICAgICB9XG4gICAgfSBlbHNlIHtcbiAgICAgIHV0aWxzLmxvZy5lcnJvcignSW52YWxpZCBpZGVudGlmeSBpbnB1dCB0eXBlLiBFeHBlY3RlZCBJZGVudGlmeSBvYmplY3QgYnV0IHNhdyAnICsgdHlwZShpZGVudGlmeV9vYmopKTtcblxuICAgICAgaWYgKHR5cGUob3B0X2NhbGxiYWNrKSA9PT0gJ2Z1bmN0aW9uJykge1xuICAgICAgICBvcHRfY2FsbGJhY2soMCwgJ05vIHJlcXVlc3Qgc2VudCcsIHtcbiAgICAgICAgICByZWFzb246ICdJbnZhbGlkIGlkZW50aWZ5IGlucHV0IHR5cGUnXG4gICAgICAgIH0pO1xuICAgICAgfVxuICAgIH1cbiAgfTtcbiAgLyoqXG4gICAqIFNldCBhIHZlcnNpb25OYW1lIGZvciB5b3VyIGFwcGxpY2F0aW9uLlxuICAgKiBAcHVibGljXG4gICAqIEBwYXJhbSB7c3RyaW5nfSB2ZXJzaW9uTmFtZSAtIFRoZSB2ZXJzaW9uIHRvIHNldCBmb3IgeW91ciBhcHBsaWNhdGlvbi5cbiAgICogQGV4YW1wbGUgYW1wbGl0dWRlQ2xpZW50LnNldFZlcnNpb25OYW1lKCcxLjEyLjMnKTtcbiAgICovXG5cblxuICBBbXBsaXR1ZGVDbGllbnQucHJvdG90eXBlLnNldFZlcnNpb25OYW1lID0gZnVuY3Rpb24gc2V0VmVyc2lvbk5hbWUodmVyc2lvbk5hbWUpIHtcbiAgICBpZiAodGhpcy5fc2hvdWxkRGVmZXJDYWxsKCkpIHtcbiAgICAgIHJldHVybiB0aGlzLl9xLnB1c2goWydzZXRWZXJzaW9uTmFtZSddLmNvbmNhdChBcnJheS5wcm90b3R5cGUuc2xpY2UuY2FsbChhcmd1bWVudHMsIDApKSk7XG4gICAgfVxuXG4gICAgaWYgKCF1dGlscy52YWxpZGF0ZUlucHV0KHZlcnNpb25OYW1lLCAndmVyc2lvbk5hbWUnLCAnc3RyaW5nJykpIHtcbiAgICAgIHJldHVybjtcbiAgICB9XG5cbiAgICB0aGlzLm9wdGlvbnMudmVyc2lvbk5hbWUgPSB2ZXJzaW9uTmFtZTtcbiAgfTtcbiAgLyoqXG4gICAqIFByaXZhdGUgbG9nRXZlbnQgbWV0aG9kLiBLZWVwcyBhcGlQcm9wZXJ0aWVzIGZyb20gYmVpbmcgcHVibGljbHkgZXhwb3NlZC5cbiAgICogQHByaXZhdGVcbiAgICovXG5cblxuICBBbXBsaXR1ZGVDbGllbnQucHJvdG90eXBlLl9sb2dFdmVudCA9IGZ1bmN0aW9uIF9sb2dFdmVudChldmVudFR5cGUsIGV2ZW50UHJvcGVydGllcywgYXBpUHJvcGVydGllcywgdXNlclByb3BlcnRpZXMsIGdyb3VwcywgZ3JvdXBQcm9wZXJ0aWVzLCB0aW1lc3RhbXAsIGNhbGxiYWNrKSB7XG4gICAge1xuICAgICAgX2xvYWRDb29raWVEYXRhKHRoaXMpOyAvLyByZWxvYWQgY29va2llIGJlZm9yZSBlYWNoIGxvZyBldmVudCB0byBzeW5jIGV2ZW50IG1ldGEtZGF0YSBiZXR3ZWVuIHdpbmRvd3MgYW5kIHRhYnNcblxuICAgIH1cblxuICAgIGlmICghZXZlbnRUeXBlKSB7XG4gICAgICBpZiAodHlwZShjYWxsYmFjaykgPT09ICdmdW5jdGlvbicpIHtcbiAgICAgICAgY2FsbGJhY2soMCwgJ05vIHJlcXVlc3Qgc2VudCcsIHtcbiAgICAgICAgICByZWFzb246ICdNaXNzaW5nIGV2ZW50VHlwZSdcbiAgICAgICAgfSk7XG4gICAgICB9XG5cbiAgICAgIHJldHVybjtcbiAgICB9XG5cbiAgICBpZiAodGhpcy5vcHRpb25zLm9wdE91dCkge1xuICAgICAgaWYgKHR5cGUoY2FsbGJhY2spID09PSAnZnVuY3Rpb24nKSB7XG4gICAgICAgIGNhbGxiYWNrKDAsICdObyByZXF1ZXN0IHNlbnQnLCB7XG4gICAgICAgICAgcmVhc29uOiAnb3B0T3V0IGlzIHNldCB0byB0cnVlJ1xuICAgICAgICB9KTtcbiAgICAgIH1cblxuICAgICAgcmV0dXJuO1xuICAgIH1cblxuICAgIHRyeSB7XG4gICAgICB2YXIgZXZlbnRJZDtcblxuICAgICAgaWYgKGV2ZW50VHlwZSA9PT0gQ29uc3RhbnRzLklERU5USUZZX0VWRU5UIHx8IGV2ZW50VHlwZSA9PT0gQ29uc3RhbnRzLkdST1VQX0lERU5USUZZX0VWRU5UKSB7XG4gICAgICAgIGV2ZW50SWQgPSB0aGlzLm5leHRJZGVudGlmeUlkKCk7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICBldmVudElkID0gdGhpcy5uZXh0RXZlbnRJZCgpO1xuICAgICAgfVxuXG4gICAgICB2YXIgc2VxdWVuY2VOdW1iZXIgPSB0aGlzLm5leHRTZXF1ZW5jZU51bWJlcigpO1xuICAgICAgdmFyIGV2ZW50VGltZSA9IHR5cGUodGltZXN0YW1wKSA9PT0gJ251bWJlcicgPyB0aW1lc3RhbXAgOiBuZXcgRGF0ZSgpLmdldFRpbWUoKTtcblxuICAgICAgaWYgKCF0aGlzLl9zZXNzaW9uSWQgfHwgIXRoaXMuX2xhc3RFdmVudFRpbWUgfHwgZXZlbnRUaW1lIC0gdGhpcy5fbGFzdEV2ZW50VGltZSA+IHRoaXMub3B0aW9ucy5zZXNzaW9uVGltZW91dCkge1xuICAgICAgICB0aGlzLl9zZXNzaW9uSWQgPSBldmVudFRpbWU7XG4gICAgICB9XG5cbiAgICAgIHRoaXMuX2xhc3RFdmVudFRpbWUgPSBldmVudFRpbWU7XG5cbiAgICAgIF9zYXZlQ29va2llRGF0YSh0aGlzKTtcblxuICAgICAgdmFyIG9zTmFtZSA9IHRoaXMuX3VhLmJyb3dzZXIubmFtZTtcbiAgICAgIHZhciBvc1ZlcnNpb24gPSB0aGlzLl91YS5icm93c2VyLm1ham9yO1xuICAgICAgdmFyIGRldmljZU1vZGVsID0gdGhpcy5fdWEuZGV2aWNlLm1vZGVsO1xuICAgICAgdmFyIGRldmljZU1hbnVmYWN0dXJlciA9IHRoaXMuX3VhLmRldmljZS52ZW5kb3I7XG4gICAgICB2YXIgdmVyc2lvbk5hbWU7XG4gICAgICB2YXIgY2FycmllcjtcblxuICAgICAgdXNlclByb3BlcnRpZXMgPSB1c2VyUHJvcGVydGllcyB8fCB7fTtcblxuICAgICAgdmFyIHRyYWNraW5nT3B0aW9ucyA9IF9vYmplY3RTcHJlYWQoe30sIHRoaXMuX2FwaVByb3BlcnRpZXNUcmFja2luZ09wdGlvbnMpO1xuXG4gICAgICBhcGlQcm9wZXJ0aWVzID0gX29iamVjdFNwcmVhZCh7fSwgYXBpUHJvcGVydGllcyB8fCB7fSwgdHJhY2tpbmdPcHRpb25zKTtcbiAgICAgIGV2ZW50UHJvcGVydGllcyA9IGV2ZW50UHJvcGVydGllcyB8fCB7fTtcbiAgICAgIGdyb3VwcyA9IGdyb3VwcyB8fCB7fTtcbiAgICAgIGdyb3VwUHJvcGVydGllcyA9IGdyb3VwUHJvcGVydGllcyB8fCB7fTtcbiAgICAgIHZhciBldmVudCA9IHtcbiAgICAgICAgZGV2aWNlX2lkOiB0aGlzLm9wdGlvbnMuZGV2aWNlSWQsXG4gICAgICAgIHVzZXJfaWQ6IHRoaXMub3B0aW9ucy51c2VySWQsXG4gICAgICAgIHRpbWVzdGFtcDogZXZlbnRUaW1lLFxuICAgICAgICBldmVudF9pZDogZXZlbnRJZCxcbiAgICAgICAgc2Vzc2lvbl9pZDogdGhpcy5fc2Vzc2lvbklkIHx8IC0xLFxuICAgICAgICBldmVudF90eXBlOiBldmVudFR5cGUsXG4gICAgICAgIHZlcnNpb25fbmFtZTogX3Nob3VsZFRyYWNrRmllbGQodGhpcywgJ3ZlcnNpb25fbmFtZScpID8gdGhpcy5vcHRpb25zLnZlcnNpb25OYW1lIHx8IHZlcnNpb25OYW1lIHx8IG51bGwgOiBudWxsLFxuICAgICAgICBwbGF0Zm9ybTogX3Nob3VsZFRyYWNrRmllbGQodGhpcywgJ3BsYXRmb3JtJykgPyB0aGlzLm9wdGlvbnMucGxhdGZvcm0gOiBudWxsLFxuICAgICAgICBvc19uYW1lOiBfc2hvdWxkVHJhY2tGaWVsZCh0aGlzLCAnb3NfbmFtZScpID8gb3NOYW1lIHx8IG51bGwgOiBudWxsLFxuICAgICAgICBvc192ZXJzaW9uOiBfc2hvdWxkVHJhY2tGaWVsZCh0aGlzLCAnb3NfdmVyc2lvbicpID8gb3NWZXJzaW9uIHx8IG51bGwgOiBudWxsLFxuICAgICAgICBkZXZpY2VfbW9kZWw6IF9zaG91bGRUcmFja0ZpZWxkKHRoaXMsICdkZXZpY2VfbW9kZWwnKSA/IGRldmljZU1vZGVsIHx8IG51bGwgOiBudWxsLFxuICAgICAgICBkZXZpY2VfbWFudWZhY3R1cmVyOiBfc2hvdWxkVHJhY2tGaWVsZCh0aGlzLCAnZGV2aWNlX21hbnVmYWN0dXJlcicpID8gZGV2aWNlTWFudWZhY3R1cmVyIHx8IG51bGwgOiBudWxsLFxuICAgICAgICBsYW5ndWFnZTogX3Nob3VsZFRyYWNrRmllbGQodGhpcywgJ2xhbmd1YWdlJykgPyB0aGlzLm9wdGlvbnMubGFuZ3VhZ2UgOiBudWxsLFxuICAgICAgICBjYXJyaWVyOiBfc2hvdWxkVHJhY2tGaWVsZCh0aGlzLCAnY2FycmllcicpID8gY2FycmllciB8fCBudWxsIDogbnVsbCxcbiAgICAgICAgYXBpX3Byb3BlcnRpZXM6IGFwaVByb3BlcnRpZXMsXG4gICAgICAgIGV2ZW50X3Byb3BlcnRpZXM6IHV0aWxzLnRydW5jYXRlKHV0aWxzLnZhbGlkYXRlUHJvcGVydGllcyhldmVudFByb3BlcnRpZXMpKSxcbiAgICAgICAgdXNlcl9wcm9wZXJ0aWVzOiB1dGlscy50cnVuY2F0ZSh1dGlscy52YWxpZGF0ZVByb3BlcnRpZXModXNlclByb3BlcnRpZXMpKSxcbiAgICAgICAgdXVpZDogdXVpZCgpLFxuICAgICAgICBsaWJyYXJ5OiB7XG4gICAgICAgICAgbmFtZTogJ2FtcGxpdHVkZS1qcycsXG4gICAgICAgICAgdmVyc2lvbjogdmVyc2lvblxuICAgICAgICB9LFxuICAgICAgICBzZXF1ZW5jZV9udW1iZXI6IHNlcXVlbmNlTnVtYmVyLFxuICAgICAgICAvLyBmb3Igb3JkZXJpbmcgZXZlbnRzIGFuZCBpZGVudGlmeXNcbiAgICAgICAgZ3JvdXBzOiB1dGlscy50cnVuY2F0ZSh1dGlscy52YWxpZGF0ZUdyb3Vwcyhncm91cHMpKSxcbiAgICAgICAgZ3JvdXBfcHJvcGVydGllczogdXRpbHMudHJ1bmNhdGUodXRpbHMudmFsaWRhdGVQcm9wZXJ0aWVzKGdyb3VwUHJvcGVydGllcykpLFxuICAgICAgICB1c2VyX2FnZW50OiB0aGlzLl91c2VyQWdlbnRcbiAgICAgIH07XG5cbiAgICAgIGlmIChldmVudFR5cGUgPT09IENvbnN0YW50cy5JREVOVElGWV9FVkVOVCB8fCBldmVudFR5cGUgPT09IENvbnN0YW50cy5HUk9VUF9JREVOVElGWV9FVkVOVCkge1xuICAgICAgICB0aGlzLl91bnNlbnRJZGVudGlmeXMucHVzaCh7XG4gICAgICAgICAgZXZlbnQ6IGV2ZW50LFxuICAgICAgICAgIGNhbGxiYWNrOiBjYWxsYmFja1xuICAgICAgICB9KTtcblxuICAgICAgICB0aGlzLl9saW1pdEV2ZW50c1F1ZXVlZCh0aGlzLl91bnNlbnRJZGVudGlmeXMpO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgdGhpcy5fdW5zZW50RXZlbnRzLnB1c2goe1xuICAgICAgICAgIGV2ZW50OiBldmVudCxcbiAgICAgICAgICBjYWxsYmFjazogY2FsbGJhY2tcbiAgICAgICAgfSk7XG5cbiAgICAgICAgdGhpcy5fbGltaXRFdmVudHNRdWV1ZWQodGhpcy5fdW5zZW50RXZlbnRzKTtcbiAgICAgIH1cblxuICAgICAgaWYgKHRoaXMub3B0aW9ucy5zYXZlRXZlbnRzKSB7XG4gICAgICAgIHRoaXMuc2F2ZUV2ZW50cygpO1xuICAgICAgfVxuXG4gICAgICB0aGlzLl9zZW5kRXZlbnRzSWZSZWFkeShjYWxsYmFjayk7XG5cbiAgICAgIHJldHVybiBldmVudElkO1xuICAgIH0gY2F0Y2ggKGUpIHtcbiAgICAgIHV0aWxzLmxvZy5lcnJvcihlKTtcbiAgICB9XG4gIH07XG5cbiAgdmFyIF9zaG91bGRUcmFja0ZpZWxkID0gZnVuY3Rpb24gX3Nob3VsZFRyYWNrRmllbGQoc2NvcGUsIGZpZWxkKSB7XG4gICAgcmV0dXJuICEhc2NvcGUub3B0aW9ucy50cmFja2luZ09wdGlvbnNbZmllbGRdO1xuICB9O1xuXG4gIHZhciBfZ2VuZXJhdGVBcGlQcm9wZXJ0aWVzVHJhY2tpbmdDb25maWcgPSBmdW5jdGlvbiBfZ2VuZXJhdGVBcGlQcm9wZXJ0aWVzVHJhY2tpbmdDb25maWcoc2NvcGUpIHtcbiAgICAvLyB0byBsaW1pdCBzaXplIG9mIGNvbmZpZyBwYXlsb2FkLCBvbmx5IHNlbmQgZmllbGRzIHRoYXQgaGF2ZSBiZWVuIGRpc2FibGVkXG4gICAgdmFyIGZpZWxkcyA9IFsnY2l0eScsICdjb3VudHJ5JywgJ2RtYScsICdpcF9hZGRyZXNzJywgJ3JlZ2lvbiddO1xuICAgIHZhciBjb25maWcgPSB7fTtcblxuICAgIGZvciAodmFyIGkgPSAwOyBpIDwgZmllbGRzLmxlbmd0aDsgaSsrKSB7XG4gICAgICB2YXIgZmllbGQgPSBmaWVsZHNbaV07XG5cbiAgICAgIGlmICghX3Nob3VsZFRyYWNrRmllbGQoc2NvcGUsIGZpZWxkKSkge1xuICAgICAgICBjb25maWdbZmllbGRdID0gZmFsc2U7XG4gICAgICB9XG4gICAgfVxuXG4gICAgcmV0dXJuIGNvbmZpZztcbiAgfTtcbiAgLyoqXG4gICAqIFJlbW92ZSBvbGQgZXZlbnRzIGZyb20gdGhlIGJlZ2lubmluZyBvZiB0aGUgYXJyYXkgaWYgdG9vIG1hbnkgaGF2ZSBhY2N1bXVsYXRlZC4gRGVmYXVsdCBsaW1pdCBpcyAxMDAwIGV2ZW50cy5cbiAgICogQHByaXZhdGVcbiAgICovXG5cblxuICBBbXBsaXR1ZGVDbGllbnQucHJvdG90eXBlLl9saW1pdEV2ZW50c1F1ZXVlZCA9IGZ1bmN0aW9uIF9saW1pdEV2ZW50c1F1ZXVlZChxdWV1ZSkge1xuICAgIGlmIChxdWV1ZS5sZW5ndGggPiB0aGlzLm9wdGlvbnMuc2F2ZWRNYXhDb3VudCkge1xuICAgICAgcXVldWUuc3BsaWNlKDAsIHF1ZXVlLmxlbmd0aCAtIHRoaXMub3B0aW9ucy5zYXZlZE1heENvdW50KTtcbiAgICB9XG4gIH07XG4gIC8qKlxuICAgKiBUaGlzIGlzIHRoZSBjYWxsYmFjayBmb3IgbG9nRXZlbnQgYW5kIGlkZW50aWZ5IGNhbGxzLiBJdCBnZXRzIGNhbGxlZCBhZnRlciB0aGUgZXZlbnQvaWRlbnRpZnkgaXMgdXBsb2FkZWQsXG4gICAqIGFuZCB0aGUgc2VydmVyIHJlc3BvbnNlIGNvZGUgYW5kIHJlc3BvbnNlIGJvZHkgZnJvbSB0aGUgdXBsb2FkIHJlcXVlc3QgYXJlIHBhc3NlZCB0byB0aGUgY2FsbGJhY2sgZnVuY3Rpb24uXG4gICAqIEBjYWxsYmFjayBBbXBsaXR1ZGV+ZXZlbnRDYWxsYmFja1xuICAgKiBAcGFyYW0ge251bWJlcn0gcmVzcG9uc2VDb2RlIC0gU2VydmVyIHJlc3BvbnNlIGNvZGUgZm9yIHRoZSBldmVudCAvIGlkZW50aWZ5IHVwbG9hZCByZXF1ZXN0LlxuICAgKiBAcGFyYW0ge3N0cmluZ30gcmVzcG9uc2VCb2R5IC0gU2VydmVyIHJlc3BvbnNlIGJvZHkgZm9yIHRoZSBldmVudCAvIGlkZW50aWZ5IHVwbG9hZCByZXF1ZXN0LlxuICAgKi9cblxuICAvKipcbiAgICogTG9nIGFuIGV2ZW50IHdpdGggZXZlbnRUeXBlIGFuZCBldmVudFByb3BlcnRpZXNcbiAgICogQHB1YmxpY1xuICAgKiBAcGFyYW0ge3N0cmluZ30gZXZlbnRUeXBlIC0gbmFtZSBvZiBldmVudFxuICAgKiBAcGFyYW0ge29iamVjdH0gZXZlbnRQcm9wZXJ0aWVzIC0gKG9wdGlvbmFsKSBhbiBvYmplY3Qgd2l0aCBzdHJpbmcga2V5cyBhbmQgdmFsdWVzIGZvciB0aGUgZXZlbnQgcHJvcGVydGllcy5cbiAgICogQHBhcmFtIHtBbXBsaXR1ZGV+ZXZlbnRDYWxsYmFja30gb3B0X2NhbGxiYWNrIC0gKG9wdGlvbmFsKSBhIGNhbGxiYWNrIGZ1bmN0aW9uIHRvIHJ1biBhZnRlciB0aGUgZXZlbnQgaXMgbG9nZ2VkLlxuICAgKiBOb3RlOiB0aGUgc2VydmVyIHJlc3BvbnNlIGNvZGUgYW5kIHJlc3BvbnNlIGJvZHkgZnJvbSB0aGUgZXZlbnQgdXBsb2FkIGFyZSBwYXNzZWQgdG8gdGhlIGNhbGxiYWNrIGZ1bmN0aW9uLlxuICAgKiBAZXhhbXBsZSBhbXBsaXR1ZGVDbGllbnQubG9nRXZlbnQoJ0NsaWNrZWQgSG9tZXBhZ2UgQnV0dG9uJywgeydmaW5pc2hlZF9mbG93JzogZmFsc2UsICdjbGlja3MnOiAxNX0pO1xuICAgKi9cblxuXG4gIEFtcGxpdHVkZUNsaWVudC5wcm90b3R5cGUubG9nRXZlbnQgPSBmdW5jdGlvbiBsb2dFdmVudChldmVudFR5cGUsIGV2ZW50UHJvcGVydGllcywgb3B0X2NhbGxiYWNrKSB7XG4gICAgaWYgKHRoaXMuX3Nob3VsZERlZmVyQ2FsbCgpKSB7XG4gICAgICByZXR1cm4gdGhpcy5fcS5wdXNoKFsnbG9nRXZlbnQnXS5jb25jYXQoQXJyYXkucHJvdG90eXBlLnNsaWNlLmNhbGwoYXJndW1lbnRzLCAwKSkpO1xuICAgIH1cblxuICAgIHJldHVybiB0aGlzLmxvZ0V2ZW50V2l0aFRpbWVzdGFtcChldmVudFR5cGUsIGV2ZW50UHJvcGVydGllcywgbnVsbCwgb3B0X2NhbGxiYWNrKTtcbiAgfTtcbiAgLyoqXG4gICAqIExvZyBhbiBldmVudCB3aXRoIGV2ZW50VHlwZSBhbmQgZXZlbnRQcm9wZXJ0aWVzIGFuZCBhIGN1c3RvbSB0aW1lc3RhbXBcbiAgICogQHB1YmxpY1xuICAgKiBAcGFyYW0ge3N0cmluZ30gZXZlbnRUeXBlIC0gbmFtZSBvZiBldmVudFxuICAgKiBAcGFyYW0ge29iamVjdH0gZXZlbnRQcm9wZXJ0aWVzIC0gKG9wdGlvbmFsKSBhbiBvYmplY3Qgd2l0aCBzdHJpbmcga2V5cyBhbmQgdmFsdWVzIGZvciB0aGUgZXZlbnQgcHJvcGVydGllcy5cbiAgICogQHBhcmFtIHtudW1iZXJ9IHRpbWVzdGFtcCAtIChvcHRpb25hbCkgdGhlIGN1c3RvbSB0aW1lc3RhbXAgYXMgbWlsbGlzZWNvbmRzIHNpbmNlIGVwb2NoLlxuICAgKiBAcGFyYW0ge0FtcGxpdHVkZX5ldmVudENhbGxiYWNrfSBvcHRfY2FsbGJhY2sgLSAob3B0aW9uYWwpIGEgY2FsbGJhY2sgZnVuY3Rpb24gdG8gcnVuIGFmdGVyIHRoZSBldmVudCBpcyBsb2dnZWQuXG4gICAqIE5vdGU6IHRoZSBzZXJ2ZXIgcmVzcG9uc2UgY29kZSBhbmQgcmVzcG9uc2UgYm9keSBmcm9tIHRoZSBldmVudCB1cGxvYWQgYXJlIHBhc3NlZCB0byB0aGUgY2FsbGJhY2sgZnVuY3Rpb24uXG4gICAqIEBleGFtcGxlIGFtcGxpdHVkZUNsaWVudC5sb2dFdmVudCgnQ2xpY2tlZCBIb21lcGFnZSBCdXR0b24nLCB7J2ZpbmlzaGVkX2Zsb3cnOiBmYWxzZSwgJ2NsaWNrcyc6IDE1fSk7XG4gICAqL1xuXG5cbiAgQW1wbGl0dWRlQ2xpZW50LnByb3RvdHlwZS5sb2dFdmVudFdpdGhUaW1lc3RhbXAgPSBmdW5jdGlvbiBsb2dFdmVudChldmVudFR5cGUsIGV2ZW50UHJvcGVydGllcywgdGltZXN0YW1wLCBvcHRfY2FsbGJhY2spIHtcbiAgICBpZiAodGhpcy5fc2hvdWxkRGVmZXJDYWxsKCkpIHtcbiAgICAgIHJldHVybiB0aGlzLl9xLnB1c2goWydsb2dFdmVudFdpdGhUaW1lc3RhbXAnXS5jb25jYXQoQXJyYXkucHJvdG90eXBlLnNsaWNlLmNhbGwoYXJndW1lbnRzLCAwKSkpO1xuICAgIH1cblxuICAgIGlmICghdGhpcy5fYXBpS2V5U2V0KCdsb2dFdmVudCgpJykpIHtcbiAgICAgIGlmICh0eXBlKG9wdF9jYWxsYmFjaykgPT09ICdmdW5jdGlvbicpIHtcbiAgICAgICAgb3B0X2NhbGxiYWNrKDAsICdObyByZXF1ZXN0IHNlbnQnLCB7XG4gICAgICAgICAgcmVhc29uOiAnQVBJIGtleSBub3Qgc2V0J1xuICAgICAgICB9KTtcbiAgICAgIH1cblxuICAgICAgcmV0dXJuIC0xO1xuICAgIH1cblxuICAgIGlmICghdXRpbHMudmFsaWRhdGVJbnB1dChldmVudFR5cGUsICdldmVudFR5cGUnLCAnc3RyaW5nJykpIHtcbiAgICAgIGlmICh0eXBlKG9wdF9jYWxsYmFjaykgPT09ICdmdW5jdGlvbicpIHtcbiAgICAgICAgb3B0X2NhbGxiYWNrKDAsICdObyByZXF1ZXN0IHNlbnQnLCB7XG4gICAgICAgICAgcmVhc29uOiAnSW52YWxpZCB0eXBlIGZvciBldmVudFR5cGUnXG4gICAgICAgIH0pO1xuICAgICAgfVxuXG4gICAgICByZXR1cm4gLTE7XG4gICAgfVxuXG4gICAgaWYgKHV0aWxzLmlzRW1wdHlTdHJpbmcoZXZlbnRUeXBlKSkge1xuICAgICAgaWYgKHR5cGUob3B0X2NhbGxiYWNrKSA9PT0gJ2Z1bmN0aW9uJykge1xuICAgICAgICBvcHRfY2FsbGJhY2soMCwgJ05vIHJlcXVlc3Qgc2VudCcsIHtcbiAgICAgICAgICByZWFzb246ICdNaXNzaW5nIGV2ZW50VHlwZSdcbiAgICAgICAgfSk7XG4gICAgICB9XG5cbiAgICAgIHJldHVybiAtMTtcbiAgICB9XG5cbiAgICByZXR1cm4gdGhpcy5fbG9nRXZlbnQoZXZlbnRUeXBlLCBldmVudFByb3BlcnRpZXMsIG51bGwsIG51bGwsIG51bGwsIG51bGwsIHRpbWVzdGFtcCwgb3B0X2NhbGxiYWNrKTtcbiAgfTtcbiAgLyoqXG4gICAqIExvZyBhbiBldmVudCB3aXRoIGV2ZW50VHlwZSwgZXZlbnRQcm9wZXJ0aWVzLCBhbmQgZ3JvdXBzLiBVc2UgdGhpcyB0byBzZXQgZXZlbnQtbGV2ZWwgZ3JvdXBzLlxuICAgKiBOb3RlOiB0aGUgZ3JvdXAocykgc2V0IG9ubHkgYXBwbHkgZm9yIHRoZSBzcGVjaWZpYyBldmVudCB0eXBlIGJlaW5nIGxvZ2dlZCBhbmQgZG9lcyBub3QgcGVyc2lzdCBvbiB0aGUgdXNlclxuICAgKiAodW5sZXNzIHlvdSBleHBsaWNpdGx5IHNldCBpdCB3aXRoIHNldEdyb3VwKS5cbiAgICogU2VlIHRoZSBbU0RLIFJlYWRtZV17QGxpbmsgaHR0cHM6Ly9naXRodWIuY29tL2FtcGxpdHVkZS9BbXBsaXR1ZGUtSmF2YXNjcmlwdCNzZXR0aW5nLWdyb3Vwc30gZm9yIG1vcmUgaW5mb3JtYXRpb25cbiAgICogYWJvdXQgZ3JvdXBzIGFuZCBDb3VudCBieSBEaXN0aW5jdCBvbiB0aGUgQW1wbGl0dWRlIHBsYXRmb3JtLlxuICAgKiBAcHVibGljXG4gICAqIEBwYXJhbSB7c3RyaW5nfSBldmVudFR5cGUgLSBuYW1lIG9mIGV2ZW50XG4gICAqIEBwYXJhbSB7b2JqZWN0fSBldmVudFByb3BlcnRpZXMgLSAob3B0aW9uYWwpIGFuIG9iamVjdCB3aXRoIHN0cmluZyBrZXlzIGFuZCB2YWx1ZXMgZm9yIHRoZSBldmVudCBwcm9wZXJ0aWVzLlxuICAgKiBAcGFyYW0ge29iamVjdH0gZ3JvdXBzIC0gKG9wdGlvbmFsKSBhbiBvYmplY3Qgd2l0aCBzdHJpbmcgZ3JvdXBUeXBlOiBncm91cE5hbWUgdmFsdWVzIGZvciB0aGUgZXZlbnQgYmVpbmcgbG9nZ2VkLlxuICAgKiBncm91cE5hbWUgY2FuIGJlIGEgc3RyaW5nIG9yIGFuIGFycmF5IG9mIHN0cmluZ3MuXG4gICAqIEBwYXJhbSB7QW1wbGl0dWRlfmV2ZW50Q2FsbGJhY2t9IG9wdF9jYWxsYmFjayAtIChvcHRpb25hbCkgYSBjYWxsYmFjayBmdW5jdGlvbiB0byBydW4gYWZ0ZXIgdGhlIGV2ZW50IGlzIGxvZ2dlZC5cbiAgICogTm90ZTogdGhlIHNlcnZlciByZXNwb25zZSBjb2RlIGFuZCByZXNwb25zZSBib2R5IGZyb20gdGhlIGV2ZW50IHVwbG9hZCBhcmUgcGFzc2VkIHRvIHRoZSBjYWxsYmFjayBmdW5jdGlvbi5cbiAgICogQGV4YW1wbGUgYW1wbGl0dWRlQ2xpZW50LmxvZ0V2ZW50V2l0aEdyb3VwcygnQ2xpY2tlZCBCdXR0b24nLCBudWxsLCB7J29yZ0lkJzogMjR9KTtcbiAgICovXG5cblxuICBBbXBsaXR1ZGVDbGllbnQucHJvdG90eXBlLmxvZ0V2ZW50V2l0aEdyb3VwcyA9IGZ1bmN0aW9uIChldmVudFR5cGUsIGV2ZW50UHJvcGVydGllcywgZ3JvdXBzLCBvcHRfY2FsbGJhY2spIHtcbiAgICBpZiAodGhpcy5fc2hvdWxkRGVmZXJDYWxsKCkpIHtcbiAgICAgIHJldHVybiB0aGlzLl9xLnB1c2goWydsb2dFdmVudFdpdGhHcm91cHMnXS5jb25jYXQoQXJyYXkucHJvdG90eXBlLnNsaWNlLmNhbGwoYXJndW1lbnRzLCAwKSkpO1xuICAgIH1cblxuICAgIGlmICghdGhpcy5fYXBpS2V5U2V0KCdsb2dFdmVudFdpdGhHcm91cHMoKScpKSB7XG4gICAgICBpZiAodHlwZShvcHRfY2FsbGJhY2spID09PSAnZnVuY3Rpb24nKSB7XG4gICAgICAgIG9wdF9jYWxsYmFjaygwLCAnTm8gcmVxdWVzdCBzZW50Jywge1xuICAgICAgICAgIHJlYXNvbjogJ0FQSSBrZXkgbm90IHNldCdcbiAgICAgICAgfSk7XG4gICAgICB9XG5cbiAgICAgIHJldHVybiAtMTtcbiAgICB9XG5cbiAgICBpZiAoIXV0aWxzLnZhbGlkYXRlSW5wdXQoZXZlbnRUeXBlLCAnZXZlbnRUeXBlJywgJ3N0cmluZycpKSB7XG4gICAgICBpZiAodHlwZShvcHRfY2FsbGJhY2spID09PSAnZnVuY3Rpb24nKSB7XG4gICAgICAgIG9wdF9jYWxsYmFjaygwLCAnTm8gcmVxdWVzdCBzZW50Jywge1xuICAgICAgICAgIHJlYXNvbjogJ0ludmFsaWQgdHlwZSBmb3IgZXZlbnRUeXBlJ1xuICAgICAgICB9KTtcbiAgICAgIH1cblxuICAgICAgcmV0dXJuIC0xO1xuICAgIH1cblxuICAgIHJldHVybiB0aGlzLl9sb2dFdmVudChldmVudFR5cGUsIGV2ZW50UHJvcGVydGllcywgbnVsbCwgbnVsbCwgZ3JvdXBzLCBudWxsLCBudWxsLCBvcHRfY2FsbGJhY2spO1xuICB9O1xuICAvKipcbiAgICogVGVzdCB0aGF0IG4gaXMgYSBudW1iZXIgb3IgYSBudW1lcmljIHZhbHVlLlxuICAgKiBAcHJpdmF0ZVxuICAgKi9cblxuXG4gIHZhciBfaXNOdW1iZXIgPSBmdW5jdGlvbiBfaXNOdW1iZXIobikge1xuICAgIHJldHVybiAhaXNOYU4ocGFyc2VGbG9hdChuKSkgJiYgaXNGaW5pdGUobik7XG4gIH07XG4gIC8qKlxuICAgKiBMb2cgcmV2ZW51ZSB3aXRoIFJldmVudWUgaW50ZXJmYWNlLiBUaGUgbmV3IHJldmVudWUgaW50ZXJmYWNlIGFsbG93cyBmb3IgbW9yZSByZXZlbnVlIGZpZWxkcyBsaWtlXG4gICAqIHJldmVudWVUeXBlIGFuZCBldmVudCBwcm9wZXJ0aWVzLlxuICAgKiBTZWUgW1JlYWRtZV17QGxpbmsgaHR0cHM6Ly9naXRodWIuY29tL2FtcGxpdHVkZS9BbXBsaXR1ZGUtSmF2YXNjcmlwdCN0cmFja2luZy1yZXZlbnVlfVxuICAgKiBmb3IgbW9yZSBpbmZvcm1hdGlvbiBvbiB0aGUgUmV2ZW51ZSBpbnRlcmZhY2UgYW5kIGxvZ2dpbmcgcmV2ZW51ZS5cbiAgICogQHB1YmxpY1xuICAgKiBAcGFyYW0ge1JldmVudWV9IHJldmVudWVfb2JqIC0gdGhlIHJldmVudWUgb2JqZWN0IGNvbnRhaW5pbmcgdGhlIHJldmVudWUgZGF0YSBiZWluZyBsb2dnZWQuXG4gICAqIEBleGFtcGxlIHZhciByZXZlbnVlID0gbmV3IGFtcGxpdHVkZS5SZXZlbnVlKCkuc2V0UHJvZHVjdElkKCdwcm9kdWN0SWRlbnRpZmllcicpLnNldFByaWNlKDEwLjk5KTtcbiAgICogYW1wbGl0dWRlLmxvZ1JldmVudWVWMihyZXZlbnVlKTtcbiAgICovXG5cblxuICBBbXBsaXR1ZGVDbGllbnQucHJvdG90eXBlLmxvZ1JldmVudWVWMiA9IGZ1bmN0aW9uIGxvZ1JldmVudWVWMihyZXZlbnVlX29iaikge1xuICAgIGlmICh0aGlzLl9zaG91bGREZWZlckNhbGwoKSkge1xuICAgICAgcmV0dXJuIHRoaXMuX3EucHVzaChbJ2xvZ1JldmVudWVWMiddLmNvbmNhdChBcnJheS5wcm90b3R5cGUuc2xpY2UuY2FsbChhcmd1bWVudHMsIDApKSk7XG4gICAgfVxuXG4gICAgaWYgKCF0aGlzLl9hcGlLZXlTZXQoJ2xvZ1JldmVudWVWMigpJykpIHtcbiAgICAgIHJldHVybjtcbiAgICB9IC8vIGlmIHJldmVudWUgaW5wdXQgaXMgYSBwcm94aWVkIG9iamVjdCBjcmVhdGVkIGJ5IHRoZSBhc3luYyBsb2FkaW5nIHNuaXBwZXQsIGNvbnZlcnQgaXQgaW50byBhbiByZXZlbnVlIG9iamVjdFxuXG5cbiAgICBpZiAodHlwZShyZXZlbnVlX29iaikgPT09ICdvYmplY3QnICYmIHJldmVudWVfb2JqLmhhc093blByb3BlcnR5KCdfcScpKSB7XG4gICAgICByZXZlbnVlX29iaiA9IF9jb252ZXJ0UHJveHlPYmplY3RUb1JlYWxPYmplY3QobmV3IFJldmVudWUoKSwgcmV2ZW51ZV9vYmopO1xuICAgIH1cblxuICAgIGlmIChyZXZlbnVlX29iaiBpbnN0YW5jZW9mIFJldmVudWUpIHtcbiAgICAgIC8vIG9ubHkgc2VuZCBpZiByZXZlbnVlIGlzIHZhbGlkXG4gICAgICBpZiAocmV2ZW51ZV9vYmogJiYgcmV2ZW51ZV9vYmouX2lzVmFsaWRSZXZlbnVlKCkpIHtcbiAgICAgICAgcmV0dXJuIHRoaXMubG9nRXZlbnQoQ29uc3RhbnRzLlJFVkVOVUVfRVZFTlQsIHJldmVudWVfb2JqLl90b0pTT05PYmplY3QoKSk7XG4gICAgICB9XG4gICAgfSBlbHNlIHtcbiAgICAgIHV0aWxzLmxvZy5lcnJvcignSW52YWxpZCByZXZlbnVlIGlucHV0IHR5cGUuIEV4cGVjdGVkIFJldmVudWUgb2JqZWN0IGJ1dCBzYXcgJyArIHR5cGUocmV2ZW51ZV9vYmopKTtcbiAgICB9XG4gIH07XG5cbiAge1xuICAgIC8qKlxuICAgICAqIExvZyByZXZlbnVlIGV2ZW50IHdpdGggYSBwcmljZSwgcXVhbnRpdHksIGFuZCBwcm9kdWN0IGlkZW50aWZpZXIuIERFUFJFQ0FURUQgLSB1c2UgbG9nUmV2ZW51ZVYyXG4gICAgICogQHB1YmxpY1xuICAgICAqIEBkZXByZWNhdGVkXG4gICAgICogQHBhcmFtIHtudW1iZXJ9IHByaWNlIC0gcHJpY2Ugb2YgcmV2ZW51ZSBldmVudFxuICAgICAqIEBwYXJhbSB7bnVtYmVyfSBxdWFudGl0eSAtIChvcHRpb25hbCkgcXVhbnRpdHkgb2YgcHJvZHVjdHMgaW4gcmV2ZW51ZSBldmVudC4gSWYgbm8gcXVhbnRpdHkgc3BlY2lmaWVkIGRlZmF1bHQgdG8gMS5cbiAgICAgKiBAcGFyYW0ge3N0cmluZ30gcHJvZHVjdCAtIChvcHRpb25hbCkgcHJvZHVjdCBpZGVudGlmaWVyXG4gICAgICogQGV4YW1wbGUgYW1wbGl0dWRlQ2xpZW50LmxvZ1JldmVudWUoMy45OSwgMSwgJ3Byb2R1Y3RfMTIzNCcpO1xuICAgICAqL1xuICAgIEFtcGxpdHVkZUNsaWVudC5wcm90b3R5cGUubG9nUmV2ZW51ZSA9IGZ1bmN0aW9uIGxvZ1JldmVudWUocHJpY2UsIHF1YW50aXR5LCBwcm9kdWN0KSB7XG4gICAgICBpZiAodGhpcy5fc2hvdWxkRGVmZXJDYWxsKCkpIHtcbiAgICAgICAgcmV0dXJuIHRoaXMuX3EucHVzaChbJ2xvZ1JldmVudWUnXS5jb25jYXQoQXJyYXkucHJvdG90eXBlLnNsaWNlLmNhbGwoYXJndW1lbnRzLCAwKSkpO1xuICAgICAgfSAvLyBUZXN0IHRoYXQgdGhlIHBhcmFtZXRlcnMgYXJlIG9mIHRoZSByaWdodCB0eXBlLlxuXG5cbiAgICAgIGlmICghdGhpcy5fYXBpS2V5U2V0KCdsb2dSZXZlbnVlKCknKSB8fCAhX2lzTnVtYmVyKHByaWNlKSB8fCBxdWFudGl0eSAhPT0gdW5kZWZpbmVkICYmICFfaXNOdW1iZXIocXVhbnRpdHkpKSB7XG4gICAgICAgIC8vIHV0aWxzLmxvZygnUHJpY2UgYW5kIHF1YW50aXR5IGFyZ3VtZW50cyB0byBsb2dSZXZlbnVlIG11c3QgYmUgbnVtYmVycycpO1xuICAgICAgICByZXR1cm4gLTE7XG4gICAgICB9XG5cbiAgICAgIHJldHVybiB0aGlzLl9sb2dFdmVudChDb25zdGFudHMuUkVWRU5VRV9FVkVOVCwge30sIHtcbiAgICAgICAgcHJvZHVjdElkOiBwcm9kdWN0LFxuICAgICAgICBzcGVjaWFsOiAncmV2ZW51ZV9hbW91bnQnLFxuICAgICAgICBxdWFudGl0eTogcXVhbnRpdHkgfHwgMSxcbiAgICAgICAgcHJpY2U6IHByaWNlXG4gICAgICB9LCBudWxsLCBudWxsLCBudWxsLCBudWxsLCBudWxsKTtcbiAgICB9O1xuICB9XG4gIC8qKlxuICAgKiBSZW1vdmUgZXZlbnRzIGluIHN0b3JhZ2Ugd2l0aCBldmVudCBpZHMgdXAgdG8gYW5kIGluY2x1ZGluZyBtYXhFdmVudElkLlxuICAgKiBAcHJpdmF0ZVxuICAgKi9cblxuXG4gIEFtcGxpdHVkZUNsaWVudC5wcm90b3R5cGUucmVtb3ZlRXZlbnRzID0gZnVuY3Rpb24gcmVtb3ZlRXZlbnRzKG1heEV2ZW50SWQsIG1heElkZW50aWZ5SWQsIHN0YXR1cywgcmVzcG9uc2UpIHtcbiAgICBfcmVtb3ZlRXZlbnRzKHRoaXMsICdfdW5zZW50RXZlbnRzJywgbWF4RXZlbnRJZCwgc3RhdHVzLCByZXNwb25zZSk7XG5cbiAgICBfcmVtb3ZlRXZlbnRzKHRoaXMsICdfdW5zZW50SWRlbnRpZnlzJywgbWF4SWRlbnRpZnlJZCwgc3RhdHVzLCByZXNwb25zZSk7XG4gIH07XG4gIC8qKlxuICAgKiBIZWxwZXIgZnVuY3Rpb24gdG8gcmVtb3ZlIGV2ZW50cyB1cCB0byBtYXhJZCBmcm9tIGEgc2luZ2xlIHF1ZXVlLlxuICAgKiBEb2VzIGEgdHJ1ZSBmaWx0ZXIgaW4gY2FzZSBldmVudHMgZ2V0IG91dCBvZiBvcmRlciBvciBvbGQgZXZlbnRzIGFyZSByZW1vdmVkLlxuICAgKiBAcHJpdmF0ZVxuICAgKi9cblxuXG4gIHZhciBfcmVtb3ZlRXZlbnRzID0gZnVuY3Rpb24gX3JlbW92ZUV2ZW50cyhzY29wZSwgZXZlbnRRdWV1ZSwgbWF4SWQsIHN0YXR1cywgcmVzcG9uc2UpIHtcbiAgICBpZiAobWF4SWQgPCAwKSB7XG4gICAgICByZXR1cm47XG4gICAgfVxuXG4gICAgdmFyIGZpbHRlcmVkRXZlbnRzID0gW107XG5cbiAgICBmb3IgKHZhciBpID0gMDsgaSA8IHNjb3BlW2V2ZW50UXVldWVdLmxlbmd0aCB8fCAwOyBpKyspIHtcbiAgICAgIHZhciB1bnNlbnRFdmVudCA9IHNjb3BlW2V2ZW50UXVldWVdW2ldO1xuXG4gICAgICBpZiAodW5zZW50RXZlbnQuZXZlbnQuZXZlbnRfaWQgPiBtYXhJZCkge1xuICAgICAgICBmaWx0ZXJlZEV2ZW50cy5wdXNoKHVuc2VudEV2ZW50KTtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIGlmICh1bnNlbnRFdmVudC5jYWxsYmFjaykge1xuICAgICAgICAgIHVuc2VudEV2ZW50LmNhbGxiYWNrKHN0YXR1cywgcmVzcG9uc2UpO1xuICAgICAgICB9XG4gICAgICB9XG4gICAgfVxuXG4gICAgc2NvcGVbZXZlbnRRdWV1ZV0gPSBmaWx0ZXJlZEV2ZW50cztcbiAgfTtcbiAgLyoqXG4gICAqIFNlbmQgdW5zZW50IGV2ZW50cy4gTm90ZTogdGhpcyBpcyBjYWxsZWQgYXV0b21hdGljYWxseSBhZnRlciBldmVudHMgYXJlIGxvZ2dlZCBpZiBvcHRpb24gYmF0Y2hFdmVudHMgaXMgZmFsc2UuXG4gICAqIElmIGJhdGNoRXZlbnRzIGlzIHRydWUsIHRoZW4gZXZlbnRzIGFyZSBvbmx5IHNlbnQgd2hlbiBiYXRjaCBjcml0ZXJpYXMgYXJlIG1ldC5cbiAgICogQHByaXZhdGVcbiAgICovXG5cblxuICBBbXBsaXR1ZGVDbGllbnQucHJvdG90eXBlLnNlbmRFdmVudHMgPSBmdW5jdGlvbiBzZW5kRXZlbnRzKCkge1xuICAgIGlmICghdGhpcy5fYXBpS2V5U2V0KCdzZW5kRXZlbnRzKCknKSkge1xuICAgICAgdGhpcy5yZW1vdmVFdmVudHMoSW5maW5pdHksIEluZmluaXR5LCAwLCAnTm8gcmVxdWVzdCBzZW50Jywge1xuICAgICAgICByZWFzb246ICdBUEkga2V5IG5vdCBzZXQnXG4gICAgICB9KTtcbiAgICAgIHJldHVybjtcbiAgICB9XG5cbiAgICBpZiAodGhpcy5vcHRpb25zLm9wdE91dCkge1xuICAgICAgdGhpcy5yZW1vdmVFdmVudHMoSW5maW5pdHksIEluZmluaXR5LCAwLCAnTm8gcmVxdWVzdCBzZW50Jywge1xuICAgICAgICByZWFzb246ICdPcHQgb3V0IGlzIHNldCB0byB0cnVlJ1xuICAgICAgfSk7XG4gICAgICByZXR1cm47XG4gICAgfSAvLyBIb3cgaXMgaXQgcG9zc2libGUgdG8gZ2V0IGludG8gdGhpcyBzdGF0ZT9cblxuXG4gICAgaWYgKHRoaXMuX3Vuc2VudENvdW50KCkgPT09IDApIHtcbiAgICAgIHJldHVybjtcbiAgICB9IC8vIFdlIG9ubHkgbWFrZSBvbmUgcmVxdWVzdCBhdCBhIHRpbWUuIHNlbmRFdmVudHMgd2lsbCBiZSBpbnZva2VkIGFnYWluIG9uY2VcbiAgICAvLyB0aGUgbGFzdCByZXF1ZXN0IGNvbXBsZXRlcy5cblxuXG4gICAgaWYgKHRoaXMuX3NlbmRpbmcpIHtcbiAgICAgIHJldHVybjtcbiAgICB9XG5cbiAgICB0aGlzLl9zZW5kaW5nID0gdHJ1ZTtcbiAgICB2YXIgcHJvdG9jb2wgPSB0aGlzLm9wdGlvbnMuZm9yY2VIdHRwcyA/ICdodHRwcycgOiAnaHR0cHM6JyA9PT0gd2luZG93LmxvY2F0aW9uLnByb3RvY29sID8gJ2h0dHBzJyA6ICdodHRwJztcbiAgICB2YXIgdXJsID0gcHJvdG9jb2wgKyAnOi8vJyArIHRoaXMub3B0aW9ucy5hcGlFbmRwb2ludDsgLy8gZmV0Y2ggZXZlbnRzIHRvIHNlbmRcblxuICAgIHZhciBudW1FdmVudHMgPSBNYXRoLm1pbih0aGlzLl91bnNlbnRDb3VudCgpLCB0aGlzLm9wdGlvbnMudXBsb2FkQmF0Y2hTaXplKTtcblxuICAgIHZhciBtZXJnZWRFdmVudHMgPSB0aGlzLl9tZXJnZUV2ZW50c0FuZElkZW50aWZ5cyhudW1FdmVudHMpO1xuXG4gICAgdmFyIG1heEV2ZW50SWQgPSBtZXJnZWRFdmVudHMubWF4RXZlbnRJZDtcbiAgICB2YXIgbWF4SWRlbnRpZnlJZCA9IG1lcmdlZEV2ZW50cy5tYXhJZGVudGlmeUlkO1xuICAgIHZhciBldmVudHMgPSBKU09OLnN0cmluZ2lmeShtZXJnZWRFdmVudHMuZXZlbnRzVG9TZW5kLm1hcChmdW5jdGlvbiAoX3JlZjIpIHtcbiAgICAgIHZhciBldmVudCA9IF9yZWYyLmV2ZW50O1xuICAgICAgcmV0dXJuIGV2ZW50O1xuICAgIH0pKTtcbiAgICB2YXIgdXBsb2FkVGltZSA9IG5ldyBEYXRlKCkuZ2V0VGltZSgpO1xuICAgIHZhciBkYXRhID0ge1xuICAgICAgY2xpZW50OiB0aGlzLm9wdGlvbnMuYXBpS2V5LFxuICAgICAgZTogZXZlbnRzLFxuICAgICAgdjogQ29uc3RhbnRzLkFQSV9WRVJTSU9OLFxuICAgICAgdXBsb2FkX3RpbWU6IHVwbG9hZFRpbWUsXG4gICAgICBjaGVja3N1bTogbWQ1KENvbnN0YW50cy5BUElfVkVSU0lPTiArIHRoaXMub3B0aW9ucy5hcGlLZXkgKyBldmVudHMgKyB1cGxvYWRUaW1lKVxuICAgIH07XG4gICAgdmFyIHNjb3BlID0gdGhpcztcbiAgICBuZXcgUmVxdWVzdCh1cmwsIGRhdGEpLnNlbmQoZnVuY3Rpb24gKHN0YXR1cywgcmVzcG9uc2UpIHtcbiAgICAgIHNjb3BlLl9zZW5kaW5nID0gZmFsc2U7XG5cbiAgICAgIHRyeSB7XG4gICAgICAgIGlmIChzdGF0dXMgPT09IDIwMCAmJiByZXNwb25zZSA9PT0gJ3N1Y2Nlc3MnKSB7XG4gICAgICAgICAgc2NvcGUucmVtb3ZlRXZlbnRzKG1heEV2ZW50SWQsIG1heElkZW50aWZ5SWQsIHN0YXR1cywgcmVzcG9uc2UpOyAvLyBVcGRhdGUgdGhlIGV2ZW50IGNhY2hlIGFmdGVyIHRoZSByZW1vdmFsIG9mIHNlbnQgZXZlbnRzLlxuXG4gICAgICAgICAgaWYgKHNjb3BlLm9wdGlvbnMuc2F2ZUV2ZW50cykge1xuICAgICAgICAgICAgc2NvcGUuc2F2ZUV2ZW50cygpO1xuICAgICAgICAgIH0gLy8gU2VuZCBtb3JlIGV2ZW50cyBpZiBhbnkgcXVldWVkIGR1cmluZyBwcmV2aW91cyBzZW5kLlxuXG5cbiAgICAgICAgICBzY29wZS5fc2VuZEV2ZW50c0lmUmVhZHkoKTsgLy8gaGFuZGxlIHBheWxvYWQgdG9vIGxhcmdlXG5cbiAgICAgICAgfSBlbHNlIGlmIChzdGF0dXMgPT09IDQxMykge1xuICAgICAgICAgIC8vIHV0aWxzLmxvZygncmVxdWVzdCB0b28gbGFyZ2UnKTtcbiAgICAgICAgICAvLyBDYW4ndCBldmVuIGdldCB0aGlzIG9uZSBtYXNzaXZlIGV2ZW50IHRocm91Z2guIERyb3AgaXQsIGV2ZW4gaWYgaXQgaXMgYW4gaWRlbnRpZnkuXG4gICAgICAgICAgaWYgKHNjb3BlLm9wdGlvbnMudXBsb2FkQmF0Y2hTaXplID09PSAxKSB7XG4gICAgICAgICAgICBzY29wZS5yZW1vdmVFdmVudHMobWF4RXZlbnRJZCwgbWF4SWRlbnRpZnlJZCwgc3RhdHVzLCByZXNwb25zZSk7XG4gICAgICAgICAgfSAvLyBUaGUgc2VydmVyIGNvbXBsYWluZWQgYWJvdXQgdGhlIGxlbmd0aCBvZiB0aGUgcmVxdWVzdC4gQmFja29mZiBhbmQgdHJ5IGFnYWluLlxuXG5cbiAgICAgICAgICBzY29wZS5vcHRpb25zLnVwbG9hZEJhdGNoU2l6ZSA9IE1hdGguY2VpbChudW1FdmVudHMgLyAyKTtcbiAgICAgICAgICBzY29wZS5zZW5kRXZlbnRzKCk7XG4gICAgICAgIH0gLy8gZWxzZSB7XG4gICAgICAgIC8vICBhbGwgdGhlIGV2ZW50cyBhcmUgc3RpbGwgcXVldWVkLCBhbmQgd2lsbCBiZSByZXRyaWVkIHdoZW4gdGhlIG5leHRcbiAgICAgICAgLy8gIGV2ZW50IGlzIHNlbnQgSW4gdGhlIGludGVyZXN0IG9mIGRlYnVnZ2luZywgaXQgd291bGQgYmUgbmljZSB0byBoYXZlXG4gICAgICAgIC8vICBzb21ldGhpbmcgbGlrZSBhbiBldmVudCBlbWl0dGVyIGZvciBhIGJldHRlciBkZWJ1Z2dpbmcgZXhwZXJpbmNlXG4gICAgICAgIC8vICBoZXJlLlxuICAgICAgICAvLyB9XG5cbiAgICAgIH0gY2F0Y2ggKGUpIHsvLyB1dGlscy5sb2coJ2ZhaWxlZCB1cGxvYWQnKTtcbiAgICAgIH1cbiAgICB9KTtcbiAgfTtcbiAgLyoqXG4gICAqIE1lcmdlIHVuc2VudCBldmVudHMgYW5kIGlkZW50aWZ5cyB0b2dldGhlciBpbiBzZXF1ZW50aWFsIG9yZGVyIGJhc2VkIG9uIHRoZWlyIHNlcXVlbmNlIG51bWJlciwgZm9yIHVwbG9hZGluZy5cbiAgICogQHByaXZhdGVcbiAgICovXG5cblxuICBBbXBsaXR1ZGVDbGllbnQucHJvdG90eXBlLl9tZXJnZUV2ZW50c0FuZElkZW50aWZ5cyA9IGZ1bmN0aW9uIF9tZXJnZUV2ZW50c0FuZElkZW50aWZ5cyhudW1FdmVudHMpIHtcbiAgICAvLyBjb2FsZXNjZSBldmVudHMgZnJvbSBib3RoIHF1ZXVlc1xuICAgIHZhciBldmVudHNUb1NlbmQgPSBbXTtcbiAgICB2YXIgZXZlbnRJbmRleCA9IDA7XG4gICAgdmFyIG1heEV2ZW50SWQgPSAtMTtcbiAgICB2YXIgaWRlbnRpZnlJbmRleCA9IDA7XG4gICAgdmFyIG1heElkZW50aWZ5SWQgPSAtMTtcblxuICAgIHdoaWxlIChldmVudHNUb1NlbmQubGVuZ3RoIDwgbnVtRXZlbnRzKSB7XG4gICAgICB2YXIgdW5zZW50RXZlbnQgPSB2b2lkIDA7XG4gICAgICB2YXIgbm9JZGVudGlmeXMgPSBpZGVudGlmeUluZGV4ID49IHRoaXMuX3Vuc2VudElkZW50aWZ5cy5sZW5ndGg7XG4gICAgICB2YXIgbm9FdmVudHMgPSBldmVudEluZGV4ID49IHRoaXMuX3Vuc2VudEV2ZW50cy5sZW5ndGg7IC8vIGNhc2UgMDogbm8gZXZlbnRzIG9yIGlkZW50aWZ5cyBsZWZ0XG4gICAgICAvLyBub3RlIHRoaXMgc2hvdWxkIG5vdCBoYXBwZW4sIHRoaXMgbWVhbnMgd2UgaGF2ZSBsZXNzIGV2ZW50cyBhbmQgaWRlbnRpZnlzIHRoYW4gZXhwZWN0ZWRcblxuICAgICAgaWYgKG5vRXZlbnRzICYmIG5vSWRlbnRpZnlzKSB7XG4gICAgICAgIHV0aWxzLmxvZy5lcnJvcignTWVyZ2luZyBFdmVudHMgYW5kIElkZW50aWZ5cywgbGVzcyBldmVudHMgYW5kIGlkZW50aWZ5cyB0aGFuIGV4cGVjdGVkJyk7XG4gICAgICAgIGJyZWFrO1xuICAgICAgfSAvLyBjYXNlIDE6IG5vIGlkZW50aWZ5cyAtIGdyYWIgZnJvbSBldmVudHNcbiAgICAgIGVsc2UgaWYgKG5vSWRlbnRpZnlzKSB7XG4gICAgICAgICAgdW5zZW50RXZlbnQgPSB0aGlzLl91bnNlbnRFdmVudHNbZXZlbnRJbmRleCsrXTtcbiAgICAgICAgICBtYXhFdmVudElkID0gdW5zZW50RXZlbnQuZXZlbnQuZXZlbnRfaWQ7IC8vIGNhc2UgMjogbm8gZXZlbnRzIC0gZ3JhYiBmcm9tIGlkZW50aWZ5c1xuICAgICAgICB9IGVsc2UgaWYgKG5vRXZlbnRzKSB7XG4gICAgICAgICAgdW5zZW50RXZlbnQgPSB0aGlzLl91bnNlbnRJZGVudGlmeXNbaWRlbnRpZnlJbmRleCsrXTtcbiAgICAgICAgICBtYXhJZGVudGlmeUlkID0gdW5zZW50RXZlbnQuZXZlbnQuZXZlbnRfaWQ7IC8vIGNhc2UgMzogbmVlZCB0byBjb21wYXJlIHNlcXVlbmNlIG51bWJlcnNcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAvLyBldmVudHMgbG9nZ2VkIGJlZm9yZSB2Mi41LjAgd29uJ3QgaGF2ZSBhIHNlcXVlbmNlIG51bWJlciwgcHV0IHRob3NlIGZpcnN0XG4gICAgICAgICAgaWYgKCEoJ3NlcXVlbmNlX251bWJlcicgaW4gdGhpcy5fdW5zZW50RXZlbnRzW2V2ZW50SW5kZXhdLmV2ZW50KSB8fCB0aGlzLl91bnNlbnRFdmVudHNbZXZlbnRJbmRleF0uZXZlbnQuc2VxdWVuY2VfbnVtYmVyIDwgdGhpcy5fdW5zZW50SWRlbnRpZnlzW2lkZW50aWZ5SW5kZXhdLmV2ZW50LnNlcXVlbmNlX251bWJlcikge1xuICAgICAgICAgICAgdW5zZW50RXZlbnQgPSB0aGlzLl91bnNlbnRFdmVudHNbZXZlbnRJbmRleCsrXTtcbiAgICAgICAgICAgIG1heEV2ZW50SWQgPSB1bnNlbnRFdmVudC5ldmVudC5ldmVudF9pZDtcbiAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgdW5zZW50RXZlbnQgPSB0aGlzLl91bnNlbnRJZGVudGlmeXNbaWRlbnRpZnlJbmRleCsrXTtcbiAgICAgICAgICAgIG1heElkZW50aWZ5SWQgPSB1bnNlbnRFdmVudC5ldmVudC5ldmVudF9pZDtcbiAgICAgICAgICB9XG4gICAgICAgIH1cblxuICAgICAgZXZlbnRzVG9TZW5kLnB1c2godW5zZW50RXZlbnQpO1xuICAgIH1cblxuICAgIHJldHVybiB7XG4gICAgICBldmVudHNUb1NlbmQ6IGV2ZW50c1RvU2VuZCxcbiAgICAgIG1heEV2ZW50SWQ6IG1heEV2ZW50SWQsXG4gICAgICBtYXhJZGVudGlmeUlkOiBtYXhJZGVudGlmeUlkXG4gICAgfTtcbiAgfTtcblxuICB7XG4gICAgLyoqXG4gICAgICogU2V0IGdsb2JhbCB1c2VyIHByb3BlcnRpZXMuIE5vdGUgdGhpcyBpcyBkZXByZWNhdGVkLCBhbmQgd2UgcmVjb21tZW5kIHVzaW5nIHNldFVzZXJQcm9wZXJ0aWVzXG4gICAgICogQHB1YmxpY1xuICAgICAqIEBkZXByZWNhdGVkXG4gICAgICovXG4gICAgQW1wbGl0dWRlQ2xpZW50LnByb3RvdHlwZS5zZXRHbG9iYWxVc2VyUHJvcGVydGllcyA9IGZ1bmN0aW9uIHNldEdsb2JhbFVzZXJQcm9wZXJ0aWVzKHVzZXJQcm9wZXJ0aWVzKSB7XG4gICAgICB0aGlzLnNldFVzZXJQcm9wZXJ0aWVzKHVzZXJQcm9wZXJ0aWVzKTtcbiAgICB9O1xuICB9XG4gIC8qKlxuICAgKiBHZXQgdGhlIGN1cnJlbnQgdmVyc2lvbiBvZiBBbXBsaXR1ZGUncyBKYXZhc2NyaXB0IFNESy5cbiAgICogQHB1YmxpY1xuICAgKiBAcmV0dXJucyB7bnVtYmVyfSB2ZXJzaW9uIG51bWJlclxuICAgKiBAZXhhbXBsZSB2YXIgYW1wbGl0dWRlVmVyc2lvbiA9IGFtcGxpdHVkZS5fX1ZFUlNJT05fXztcbiAgICovXG5cblxuICBBbXBsaXR1ZGVDbGllbnQucHJvdG90eXBlLl9fVkVSU0lPTl9fID0gdmVyc2lvbjtcbiAgLyoqXG4gICAqIERldGVybWluZXMgd2hldGhlciBvciBub3QgdG8gcHVzaCBjYWxsIHRvIHRoaXMuX3Egb3IgaW52b2tlIGl0XG4gICAqIEBwcml2YXRlXG4gICAqL1xuXG4gIEFtcGxpdHVkZUNsaWVudC5wcm90b3R5cGUuX3Nob3VsZERlZmVyQ2FsbCA9IGZ1bmN0aW9uIF9zaG91bGREZWZlckNhbGwoKSB7XG4gICAgcmV0dXJuIHRoaXMuX3BlbmRpbmdSZWFkU3RvcmFnZSB8fCB0aGlzLl9pbml0aWFsaXphdGlvbkRlZmVycmVkO1xuICB9O1xuICAvKipcbiAgICogRGVmZXJzIEluaXRpYWxpemF0aW9uIGJ5IHB1dHRpbmcgYWxsIGZ1bmN0aW9ucyBpbnRvIHN0b3JhZ2UgdW50aWwgdXNlcnNcbiAgICogaGF2ZSBhY2NlcHRlZCB0ZXJtcyBmb3IgdHJhY2tpbmdcbiAgICogQHByaXZhdGVcbiAgICovXG5cblxuICBBbXBsaXR1ZGVDbGllbnQucHJvdG90eXBlLl9kZWZlckluaXRpYWxpemF0aW9uID0gZnVuY3Rpb24gX2RlZmVySW5pdGlhbGl6YXRpb24oKSB7XG4gICAgdGhpcy5faW5pdGlhbGl6YXRpb25EZWZlcnJlZCA9IHRydWU7XG5cbiAgICB0aGlzLl9xLnB1c2goWydpbml0J10uY29uY2F0KEFycmF5LnByb3RvdHlwZS5zbGljZS5jYWxsKGFyZ3VtZW50cywgMCkpKTtcbiAgfTtcbiAgLyoqXG4gICAqIEVuYWJsZSB0cmFja2luZyB2aWEgbG9nZ2luZyBldmVudHMgYW5kIGRyb3BwaW5nIGEgY29va2llXG4gICAqIEludGVuZGVkIHRvIGJlIHVzZWQgd2l0aCB0aGUgZGVmZXJJbml0aWFsaXphdGlvbiBjb25maWd1cmF0aW9uIGZsYWdcbiAgICogVGhpcyB3aWxsIGRyb3AgYSBjb29raWUgYW5kIHJlc2V0IGluaXRpYWxpemF0aW9uIGRlZmVycmVkXG4gICAqIEBwdWJsaWNcbiAgICovXG5cblxuICBBbXBsaXR1ZGVDbGllbnQucHJvdG90eXBlLmVuYWJsZVRyYWNraW5nID0gZnVuY3Rpb24gZW5hYmxlVHJhY2tpbmcoKSB7XG4gICAgLy8gVGhpcyB3aWxsIGNhbGwgaW5pdCAod2hpY2ggZHJvcHMgdGhlIGNvb2tpZSkgYW5kIHdpbGwgcnVuIGFueSBwZW5kaW5nIHRhc2tzXG4gICAgdGhpcy5faW5pdGlhbGl6YXRpb25EZWZlcnJlZCA9IGZhbHNlO1xuXG4gICAgX3NhdmVDb29raWVEYXRhKHRoaXMpO1xuXG4gICAgdGhpcy5ydW5RdWV1ZWRGdW5jdGlvbnMoKTtcbiAgfTtcblxuICAvKipcbiAgICogQW1wbGl0dWRlIFNESyBBUEkgLSBpbnN0YW5jZSBtYW5hZ2VyLlxuICAgKiBGdW5jdGlvbiBjYWxscyBkaXJlY3RseSBvbiBhbXBsaXR1ZGUgaGF2ZSBiZWVuIGRlcHJlY2F0ZWQuIFBsZWFzZSBjYWxsIG1ldGhvZHMgb24gdGhlIGRlZmF1bHQgc2hhcmVkIGluc3RhbmNlOiBhbXBsaXR1ZGUuZ2V0SW5zdGFuY2UoKSBpbnN0ZWFkLlxuICAgKiBTZWUgW1JlYWRtZV17QGxpbmsgaHR0cHM6Ly9naXRodWIuY29tL2FtcGxpdHVkZS9BbXBsaXR1ZGUtSmF2YXNjcmlwdCMzMDAtdXBkYXRlLWFuZC1sb2dnaW5nLWV2ZW50cy10by1tdWx0aXBsZS1hbXBsaXR1ZGUtYXBwc30gZm9yIG1vcmUgaW5mb3JtYXRpb24gYWJvdXQgdGhpcyBjaGFuZ2UuXG4gICAqIEBjb25zdHJ1Y3RvciBBbXBsaXR1ZGVcbiAgICogQHB1YmxpY1xuICAgKiBAZXhhbXBsZSB2YXIgYW1wbGl0dWRlID0gbmV3IEFtcGxpdHVkZSgpO1xuICAgKi9cblxuICB2YXIgQW1wbGl0dWRlID0gZnVuY3Rpb24gQW1wbGl0dWRlKCkge1xuICAgIHRoaXMub3B0aW9ucyA9IF9vYmplY3RTcHJlYWQoe30sIERFRkFVTFRfT1BUSU9OUyk7XG4gICAgdGhpcy5fcSA9IFtdO1xuICAgIHRoaXMuX2luc3RhbmNlcyA9IHt9OyAvLyBtYXBwaW5nIG9mIGluc3RhbmNlIG5hbWVzIHRvIGluc3RhbmNlc1xuICB9O1xuXG4gIEFtcGxpdHVkZS5wcm90b3R5cGUuSWRlbnRpZnkgPSBJZGVudGlmeTtcbiAgQW1wbGl0dWRlLnByb3RvdHlwZS5SZXZlbnVlID0gUmV2ZW51ZTtcblxuICBBbXBsaXR1ZGUucHJvdG90eXBlLmdldEluc3RhbmNlID0gZnVuY3Rpb24gZ2V0SW5zdGFuY2UoaW5zdGFuY2UpIHtcbiAgICBpbnN0YW5jZSA9IHV0aWxzLmlzRW1wdHlTdHJpbmcoaW5zdGFuY2UpID8gQ29uc3RhbnRzLkRFRkFVTFRfSU5TVEFOQ0UgOiBpbnN0YW5jZS50b0xvd2VyQ2FzZSgpO1xuICAgIHZhciBjbGllbnQgPSB0aGlzLl9pbnN0YW5jZXNbaW5zdGFuY2VdO1xuXG4gICAgaWYgKGNsaWVudCA9PT0gdW5kZWZpbmVkKSB7XG4gICAgICBjbGllbnQgPSBuZXcgQW1wbGl0dWRlQ2xpZW50KGluc3RhbmNlKTtcbiAgICAgIHRoaXMuX2luc3RhbmNlc1tpbnN0YW5jZV0gPSBjbGllbnQ7XG4gICAgfVxuXG4gICAgcmV0dXJuIGNsaWVudDtcbiAgfTtcblxuICB7XG4gICAgLyoqXG4gICAgICogUnVuIGZ1bmN0aW9ucyBxdWV1ZWQgdXAgYnkgcHJveHkgbG9hZGluZyBzbmlwcGV0XG4gICAgICogQHByaXZhdGVcbiAgICAgKi9cbiAgICBBbXBsaXR1ZGUucHJvdG90eXBlLnJ1blF1ZXVlZEZ1bmN0aW9ucyA9IGZ1bmN0aW9uICgpIHtcbiAgICAgIC8vIHJ1biBxdWV1ZWQgdXAgb2xkIHZlcnNpb25zIG9mIGZ1bmN0aW9uc1xuICAgICAgZm9yICh2YXIgaSA9IDA7IGkgPCB0aGlzLl9xLmxlbmd0aDsgaSsrKSB7XG4gICAgICAgIHZhciBmbiA9IHRoaXNbdGhpcy5fcVtpXVswXV07XG5cbiAgICAgICAgaWYgKHR5cGUoZm4pID09PSAnZnVuY3Rpb24nKSB7XG4gICAgICAgICAgZm4uYXBwbHkodGhpcywgdGhpcy5fcVtpXS5zbGljZSgxKSk7XG4gICAgICAgIH1cbiAgICAgIH1cblxuICAgICAgdGhpcy5fcSA9IFtdOyAvLyBjbGVhciBmdW5jdGlvbiBxdWV1ZSBhZnRlciBydW5uaW5nXG4gICAgICAvLyBydW4gcXVldWVkIHVwIGZ1bmN0aW9ucyBvbiBpbnN0YW5jZXNcblxuICAgICAgZm9yICh2YXIgaW5zdGFuY2UgaW4gdGhpcy5faW5zdGFuY2VzKSB7XG4gICAgICAgIGlmICh0aGlzLl9pbnN0YW5jZXMuaGFzT3duUHJvcGVydHkoaW5zdGFuY2UpKSB7XG4gICAgICAgICAgdGhpcy5faW5zdGFuY2VzW2luc3RhbmNlXS5ydW5RdWV1ZWRGdW5jdGlvbnMoKTtcbiAgICAgICAgfVxuICAgICAgfVxuICAgIH07XG4gIH1cblxuICB7XG4gICAgLyoqXG4gICAgICogSW5pdGlhbGl6ZXMgdGhlIEFtcGxpdHVkZSBKYXZhc2NyaXB0IFNESyB3aXRoIHlvdXIgYXBpS2V5IGFuZCBhbnkgb3B0aW9uYWwgY29uZmlndXJhdGlvbnMuXG4gICAgICogVGhpcyBpcyByZXF1aXJlZCBiZWZvcmUgYW55IG90aGVyIG1ldGhvZHMgY2FuIGJlIGNhbGxlZC5cbiAgICAgKiBAcHVibGljXG4gICAgICogQHBhcmFtIHtzdHJpbmd9IGFwaUtleSAtIFRoZSBBUEkga2V5IGZvciB5b3VyIGFwcC5cbiAgICAgKiBAcGFyYW0ge3N0cmluZ30gb3B0X3VzZXJJZCAtIChvcHRpb25hbCkgQW4gaWRlbnRpZmllciBmb3IgdGhpcyB1c2VyLlxuICAgICAqIEBwYXJhbSB7b2JqZWN0fSBvcHRfY29uZmlnIC0gKG9wdGlvbmFsKSBDb25maWd1cmF0aW9uIG9wdGlvbnMuXG4gICAgICogU2VlIFtSZWFkbWVde0BsaW5rIGh0dHBzOi8vZ2l0aHViLmNvbS9hbXBsaXR1ZGUvQW1wbGl0dWRlLUphdmFzY3JpcHQjY29uZmlndXJhdGlvbi1vcHRpb25zfSBmb3IgbGlzdCBvZiBvcHRpb25zIGFuZCBkZWZhdWx0IHZhbHVlcy5cbiAgICAgKiBAcGFyYW0ge2Z1bmN0aW9ufSBvcHRfY2FsbGJhY2sgLSAob3B0aW9uYWwpIFByb3ZpZGUgYSBjYWxsYmFjayBmdW5jdGlvbiB0byBydW4gYWZ0ZXIgaW5pdGlhbGl6YXRpb24gaXMgY29tcGxldGUuXG4gICAgICogQGRlcHJlY2F0ZWQgUGxlYXNlIHVzZSBhbXBsaXR1ZGUuZ2V0SW5zdGFuY2UoKS5pbml0KGFwaUtleSwgb3B0X3VzZXJJZCwgb3B0X2NvbmZpZywgb3B0X2NhbGxiYWNrKTtcbiAgICAgKiBAZXhhbXBsZSBhbXBsaXR1ZGUuaW5pdCgnQVBJX0tFWScsICdVU0VSX0lEJywge2luY2x1ZGVSZWZlcnJlcjogdHJ1ZSwgaW5jbHVkZVV0bTogdHJ1ZX0sIGZ1bmN0aW9uKCkgeyBhbGVydCgnaW5pdCBjb21wbGV0ZScpOyB9KTtcbiAgICAgKi9cbiAgICBBbXBsaXR1ZGUucHJvdG90eXBlLmluaXQgPSBmdW5jdGlvbiBpbml0KGFwaUtleSwgb3B0X3VzZXJJZCwgb3B0X2NvbmZpZywgb3B0X2NhbGxiYWNrKSB7XG4gICAgICB0aGlzLmdldEluc3RhbmNlKCkuaW5pdChhcGlLZXksIG9wdF91c2VySWQsIG9wdF9jb25maWcsIGZ1bmN0aW9uIChpbnN0YW5jZSkge1xuICAgICAgICAvLyBtYWtlIG9wdGlvbnMgc3VjaCBhcyBkZXZpY2VJZCBhdmFpbGFibGUgZm9yIGNhbGxiYWNrIGZ1bmN0aW9uc1xuICAgICAgICB0aGlzLm9wdGlvbnMgPSBpbnN0YW5jZS5vcHRpb25zO1xuXG4gICAgICAgIGlmICh0eXBlKG9wdF9jYWxsYmFjaykgPT09ICdmdW5jdGlvbicpIHtcbiAgICAgICAgICBvcHRfY2FsbGJhY2soaW5zdGFuY2UpO1xuICAgICAgICB9XG4gICAgICB9LmJpbmQodGhpcykpO1xuICAgIH07XG4gICAgLyoqXG4gICAgICogUmV0dXJucyB0cnVlIGlmIGEgbmV3IHNlc3Npb24gd2FzIGNyZWF0ZWQgZHVyaW5nIGluaXRpYWxpemF0aW9uLCBvdGhlcndpc2UgZmFsc2UuXG4gICAgICogQHB1YmxpY1xuICAgICAqIEByZXR1cm4ge2Jvb2xlYW59IFdoZXRoZXIgYSBuZXcgc2Vzc2lvbiB3YXMgY3JlYXRlZCBkdXJpbmcgaW5pdGlhbGl6YXRpb24uXG4gICAgICogQGRlcHJlY2F0ZWQgUGxlYXNlIHVzZSBhbXBsaXR1ZGUuZ2V0SW5zdGFuY2UoKS5pc05ld1Nlc3Npb24oKTtcbiAgICAgKi9cblxuXG4gICAgQW1wbGl0dWRlLnByb3RvdHlwZS5pc05ld1Nlc3Npb24gPSBmdW5jdGlvbiBpc05ld1Nlc3Npb24oKSB7XG4gICAgICByZXR1cm4gdGhpcy5nZXRJbnN0YW5jZSgpLmlzTmV3U2Vzc2lvbigpO1xuICAgIH07XG4gICAgLyoqXG4gICAgICogUmV0dXJucyB0aGUgaWQgb2YgdGhlIGN1cnJlbnQgc2Vzc2lvbi5cbiAgICAgKiBAcHVibGljXG4gICAgICogQHJldHVybiB7bnVtYmVyfSBJZCBvZiB0aGUgY3VycmVudCBzZXNzaW9uLlxuICAgICAqIEBkZXByZWNhdGVkIFBsZWFzZSB1c2UgYW1wbGl0dWRlLmdldEluc3RhbmNlKCkuZ2V0U2Vzc2lvbklkKCk7XG4gICAgICovXG5cblxuICAgIEFtcGxpdHVkZS5wcm90b3R5cGUuZ2V0U2Vzc2lvbklkID0gZnVuY3Rpb24gZ2V0U2Vzc2lvbklkKCkge1xuICAgICAgcmV0dXJuIHRoaXMuZ2V0SW5zdGFuY2UoKS5nZXRTZXNzaW9uSWQoKTtcbiAgICB9O1xuICAgIC8qKlxuICAgICAqIEluY3JlbWVudHMgdGhlIGV2ZW50SWQgYW5kIHJldHVybnMgaXQuXG4gICAgICogQHByaXZhdGVcbiAgICAgKi9cblxuXG4gICAgQW1wbGl0dWRlLnByb3RvdHlwZS5uZXh0RXZlbnRJZCA9IGZ1bmN0aW9uIG5leHRFdmVudElkKCkge1xuICAgICAgcmV0dXJuIHRoaXMuZ2V0SW5zdGFuY2UoKS5uZXh0RXZlbnRJZCgpO1xuICAgIH07XG4gICAgLyoqXG4gICAgICogSW5jcmVtZW50cyB0aGUgaWRlbnRpZnlJZCBhbmQgcmV0dXJucyBpdC5cbiAgICAgKiBAcHJpdmF0ZVxuICAgICAqL1xuXG5cbiAgICBBbXBsaXR1ZGUucHJvdG90eXBlLm5leHRJZGVudGlmeUlkID0gZnVuY3Rpb24gbmV4dElkZW50aWZ5SWQoKSB7XG4gICAgICByZXR1cm4gdGhpcy5nZXRJbnN0YW5jZSgpLm5leHRJZGVudGlmeUlkKCk7XG4gICAgfTtcbiAgICAvKipcbiAgICAgKiBJbmNyZW1lbnRzIHRoZSBzZXF1ZW5jZU51bWJlciBhbmQgcmV0dXJucyBpdC5cbiAgICAgKiBAcHJpdmF0ZVxuICAgICAqL1xuXG5cbiAgICBBbXBsaXR1ZGUucHJvdG90eXBlLm5leHRTZXF1ZW5jZU51bWJlciA9IGZ1bmN0aW9uIG5leHRTZXF1ZW5jZU51bWJlcigpIHtcbiAgICAgIHJldHVybiB0aGlzLmdldEluc3RhbmNlKCkubmV4dFNlcXVlbmNlTnVtYmVyKCk7XG4gICAgfTtcbiAgICAvKipcbiAgICAgKiBTYXZlcyB1bnNlbnQgZXZlbnRzIGFuZCBpZGVudGlmaWVzIHRvIGxvY2FsU3RvcmFnZS4gSlNPTiBzdHJpbmdpZmllcyBldmVudCBxdWV1ZXMgYmVmb3JlIHNhdmluZy5cbiAgICAgKiBOb3RlOiB0aGlzIGlzIGNhbGxlZCBhdXRvbWF0aWNhbGx5IGV2ZXJ5IHRpbWUgZXZlbnRzIGFyZSBsb2dnZWQsIHVubGVzcyB5b3UgZXhwbGljaXRseSBzZXQgb3B0aW9uIHNhdmVFdmVudHMgdG8gZmFsc2UuXG4gICAgICogQHByaXZhdGVcbiAgICAgKi9cblxuXG4gICAgQW1wbGl0dWRlLnByb3RvdHlwZS5zYXZlRXZlbnRzID0gZnVuY3Rpb24gc2F2ZUV2ZW50cygpIHtcbiAgICAgIHRoaXMuZ2V0SW5zdGFuY2UoKS5zYXZlRXZlbnRzKCk7XG4gICAgfTtcbiAgICAvKipcbiAgICAgKiBTZXRzIGEgY3VzdG9tZXIgZG9tYWluIGZvciB0aGUgYW1wbGl0dWRlIGNvb2tpZS4gVXNlZnVsIGlmIHlvdSB3YW50IHRvIHN1cHBvcnQgY3Jvc3Mtc3ViZG9tYWluIHRyYWNraW5nLlxuICAgICAqIEBwdWJsaWNcbiAgICAgKiBAcGFyYW0ge3N0cmluZ30gZG9tYWluIHRvIHNldC5cbiAgICAgKiBAZGVwcmVjYXRlZCBQbGVhc2UgdXNlIGFtcGxpdHVkZS5nZXRJbnN0YW5jZSgpLnNldERvbWFpbihkb21haW4pO1xuICAgICAqIEBleGFtcGxlIGFtcGxpdHVkZS5zZXREb21haW4oJy5hbXBsaXR1ZGUuY29tJyk7XG4gICAgICovXG5cblxuICAgIEFtcGxpdHVkZS5wcm90b3R5cGUuc2V0RG9tYWluID0gZnVuY3Rpb24gc2V0RG9tYWluKGRvbWFpbikge1xuICAgICAgdGhpcy5nZXRJbnN0YW5jZSgpLnNldERvbWFpbihkb21haW4pO1xuICAgIH07XG4gICAgLyoqXG4gICAgICogU2V0cyBhbiBpZGVudGlmaWVyIGZvciB0aGUgY3VycmVudCB1c2VyLlxuICAgICAqIEBwdWJsaWNcbiAgICAgKiBAcGFyYW0ge3N0cmluZ30gdXNlcklkIC0gaWRlbnRpZmllciB0byBzZXQuIENhbiBiZSBudWxsLlxuICAgICAqIEBkZXByZWNhdGVkIFBsZWFzZSB1c2UgYW1wbGl0dWRlLmdldEluc3RhbmNlKCkuc2V0VXNlcklkKHVzZXJJZCk7XG4gICAgICogQGV4YW1wbGUgYW1wbGl0dWRlLnNldFVzZXJJZCgnam9lQGdtYWlsLmNvbScpO1xuICAgICAqL1xuXG5cbiAgICBBbXBsaXR1ZGUucHJvdG90eXBlLnNldFVzZXJJZCA9IGZ1bmN0aW9uIHNldFVzZXJJZCh1c2VySWQpIHtcbiAgICAgIHRoaXMuZ2V0SW5zdGFuY2UoKS5zZXRVc2VySWQodXNlcklkKTtcbiAgICB9O1xuICAgIC8qKlxuICAgICAqIEFkZCB1c2VyIHRvIGEgZ3JvdXAgb3IgZ3JvdXBzLiBZb3UgbmVlZCB0byBzcGVjaWZ5IGEgZ3JvdXBUeXBlIGFuZCBncm91cE5hbWUocykuXG4gICAgICogRm9yIGV4YW1wbGUgeW91IGNhbiBncm91cCBwZW9wbGUgYnkgdGhlaXIgb3JnYW5pemF0aW9uLlxuICAgICAqIEluIHRoYXQgY2FzZSBncm91cFR5cGUgaXMgXCJvcmdJZFwiIGFuZCBncm91cE5hbWUgd291bGQgYmUgdGhlIGFjdHVhbCBJRChzKS5cbiAgICAgKiBncm91cE5hbWUgY2FuIGJlIGEgc3RyaW5nIG9yIGFuIGFycmF5IG9mIHN0cmluZ3MgdG8gaW5kaWNhdGUgYSB1c2VyIGluIG11bHRpcGxlIGdydXVwcy5cbiAgICAgKiBZb3UgY2FuIGFsc28gY2FsbCBzZXRHcm91cCBtdWx0aXBsZSB0aW1lcyB3aXRoIGRpZmZlcmVudCBncm91cFR5cGVzIHRvIHRyYWNrIG11bHRpcGxlIHR5cGVzIG9mIGdyb3VwcyAodXAgdG8gNSBwZXIgYXBwKS5cbiAgICAgKiBOb3RlOiB0aGlzIHdpbGwgYWxzbyBzZXQgZ3JvdXBUeXBlOiBncm91cE5hbWUgYXMgYSB1c2VyIHByb3BlcnR5LlxuICAgICAqIFNlZSB0aGUgW1NESyBSZWFkbWVde0BsaW5rIGh0dHBzOi8vZ2l0aHViLmNvbS9hbXBsaXR1ZGUvQW1wbGl0dWRlLUphdmFzY3JpcHQjc2V0dGluZy1ncm91cHN9IGZvciBtb3JlIGluZm9ybWF0aW9uLlxuICAgICAqIEBwdWJsaWNcbiAgICAgKiBAcGFyYW0ge3N0cmluZ30gZ3JvdXBUeXBlIC0gdGhlIGdyb3VwIHR5cGUgKGV4OiBvcmdJZClcbiAgICAgKiBAcGFyYW0ge3N0cmluZ3xsaXN0fSBncm91cE5hbWUgLSB0aGUgbmFtZSBvZiB0aGUgZ3JvdXAgKGV4OiAxNSksIG9yIGEgbGlzdCBvZiBuYW1lcyBvZiB0aGUgZ3JvdXBzXG4gICAgICogQGRlcHJlY2F0ZWQgUGxlYXNlIHVzZSBhbXBsaXR1ZGUuZ2V0SW5zdGFuY2UoKS5zZXRHcm91cChncm91cFR5cGUsIGdyb3VwTmFtZSk7XG4gICAgICogQGV4YW1wbGUgYW1wbGl0dWRlLnNldEdyb3VwKCdvcmdJZCcsIDE1KTsgLy8gdGhpcyBhZGRzIHRoZSBjdXJyZW50IHVzZXIgdG8gb3JnSWQgMTUuXG4gICAgICovXG5cblxuICAgIEFtcGxpdHVkZS5wcm90b3R5cGUuc2V0R3JvdXAgPSBmdW5jdGlvbiAoZ3JvdXBUeXBlLCBncm91cE5hbWUpIHtcbiAgICAgIHRoaXMuZ2V0SW5zdGFuY2UoKS5zZXRHcm91cChncm91cFR5cGUsIGdyb3VwTmFtZSk7XG4gICAgfTtcbiAgICAvKipcbiAgICAgKiBTZXRzIHdoZXRoZXIgdG8gb3B0IGN1cnJlbnQgdXNlciBvdXQgb2YgdHJhY2tpbmcuXG4gICAgICogQHB1YmxpY1xuICAgICAqIEBwYXJhbSB7Ym9vbGVhbn0gZW5hYmxlIC0gaWYgdHJ1ZSB0aGVuIG5vIGV2ZW50cyB3aWxsIGJlIGxvZ2dlZCBvciBzZW50LlxuICAgICAqIEBkZXByZWNhdGVkIFBsZWFzZSB1c2UgYW1wbGl0dWRlLmdldEluc3RhbmNlKCkuc2V0T3B0T3V0KGVuYWJsZSk7XG4gICAgICogQGV4YW1wbGU6IGFtcGxpdHVkZS5zZXRPcHRPdXQodHJ1ZSk7XG4gICAgICovXG5cblxuICAgIEFtcGxpdHVkZS5wcm90b3R5cGUuc2V0T3B0T3V0ID0gZnVuY3Rpb24gc2V0T3B0T3V0KGVuYWJsZSkge1xuICAgICAgdGhpcy5nZXRJbnN0YW5jZSgpLnNldE9wdE91dChlbmFibGUpO1xuICAgIH07XG4gICAgLyoqXG4gICAgICAqIFJlZ2VuZXJhdGVzIGEgbmV3IHJhbmRvbSBkZXZpY2VJZCBmb3IgY3VycmVudCB1c2VyLiBOb3RlOiB0aGlzIGlzIG5vdCByZWNvbW1lbmRlZCB1bmxlc3MgeW91IGtub3cgd2hhdCB5b3VcbiAgICAgICogYXJlIGRvaW5nLiBUaGlzIGNhbiBiZSB1c2VkIGluIGNvbmp1bmN0aW9uIHdpdGggYHNldFVzZXJJZChudWxsKWAgdG8gYW5vbnltaXplIHVzZXJzIGFmdGVyIHRoZXkgbG9nIG91dC5cbiAgICAgICogV2l0aCBhIG51bGwgdXNlcklkIGFuZCBhIGNvbXBsZXRlbHkgbmV3IGRldmljZUlkLCB0aGUgY3VycmVudCB1c2VyIHdvdWxkIGFwcGVhciBhcyBhIGJyYW5kIG5ldyB1c2VyIGluIGRhc2hib2FyZC5cbiAgICAgICogVGhpcyB1c2VzIHNyYy91dWlkLmpzIHRvIHJlZ2VuZXJhdGUgdGhlIGRldmljZUlkLlxuICAgICAgKiBAcHVibGljXG4gICAgICAqIEBkZXByZWNhdGVkIFBsZWFzZSB1c2UgYW1wbGl0dWRlLmdldEluc3RhbmNlKCkucmVnZW5lcmF0ZURldmljZUlkKCk7XG4gICAgICAqL1xuXG5cbiAgICBBbXBsaXR1ZGUucHJvdG90eXBlLnJlZ2VuZXJhdGVEZXZpY2VJZCA9IGZ1bmN0aW9uIHJlZ2VuZXJhdGVEZXZpY2VJZCgpIHtcbiAgICAgIHRoaXMuZ2V0SW5zdGFuY2UoKS5yZWdlbmVyYXRlRGV2aWNlSWQoKTtcbiAgICB9O1xuICAgIC8qKlxuICAgICAgKiBTZXRzIGEgY3VzdG9tIGRldmljZUlkIGZvciBjdXJyZW50IHVzZXIuIE5vdGU6IHRoaXMgaXMgbm90IHJlY29tbWVuZGVkIHVubGVzcyB5b3Uga25vdyB3aGF0IHlvdSBhcmUgZG9pbmdcbiAgICAgICogKGxpa2UgaWYgeW91IGhhdmUgeW91ciBvd24gc3lzdGVtIGZvciBtYW5hZ2luZyBkZXZpY2VJZHMpLiBNYWtlIHN1cmUgdGhlIGRldmljZUlkIHlvdSBzZXQgaXMgc3VmZmljaWVudGx5IHVuaXF1ZVxuICAgICAgKiAod2UgcmVjb21tZW5kIHNvbWV0aGluZyBsaWtlIGEgVVVJRCAtIHNlZSBzcmMvdXVpZC5qcyBmb3IgYW4gZXhhbXBsZSBvZiBob3cgdG8gZ2VuZXJhdGUpIHRvIHByZXZlbnQgY29uZmxpY3RzIHdpdGggb3RoZXIgZGV2aWNlcyBpbiBvdXIgc3lzdGVtLlxuICAgICAgKiBAcHVibGljXG4gICAgICAqIEBwYXJhbSB7c3RyaW5nfSBkZXZpY2VJZCAtIGN1c3RvbSBkZXZpY2VJZCBmb3IgY3VycmVudCB1c2VyLlxuICAgICAgKiBAZGVwcmVjYXRlZCBQbGVhc2UgdXNlIGFtcGxpdHVkZS5nZXRJbnN0YW5jZSgpLnNldERldmljZUlkKGRldmljZUlkKTtcbiAgICAgICogQGV4YW1wbGUgYW1wbGl0dWRlLnNldERldmljZUlkKCc0NWYwOTU0Zi1lYjc5LTQ0NjMtYWM4YS0yMzNhNmY0NWE4ZjAnKTtcbiAgICAgICovXG5cblxuICAgIEFtcGxpdHVkZS5wcm90b3R5cGUuc2V0RGV2aWNlSWQgPSBmdW5jdGlvbiBzZXREZXZpY2VJZChkZXZpY2VJZCkge1xuICAgICAgdGhpcy5nZXRJbnN0YW5jZSgpLnNldERldmljZUlkKGRldmljZUlkKTtcbiAgICB9O1xuICAgIC8qKlxuICAgICAqIFNldHMgdXNlciBwcm9wZXJ0aWVzIGZvciB0aGUgY3VycmVudCB1c2VyLlxuICAgICAqIEBwdWJsaWNcbiAgICAgKiBAcGFyYW0ge29iamVjdH0gLSBvYmplY3Qgd2l0aCBzdHJpbmcga2V5cyBhbmQgdmFsdWVzIGZvciB0aGUgdXNlciBwcm9wZXJ0aWVzIHRvIHNldC5cbiAgICAgKiBAcGFyYW0ge2Jvb2xlYW59IC0gREVQUkVDQVRFRCBvcHRfcmVwbGFjZTogaW4gZWFybGllciB2ZXJzaW9ucyBvZiB0aGUgSlMgU0RLIHRoZSB1c2VyIHByb3BlcnRpZXMgb2JqZWN0IHdhcyBrZXB0IGluXG4gICAgICogbWVtb3J5IGFuZCByZXBsYWNlID0gdHJ1ZSB3b3VsZCByZXBsYWNlIHRoZSBvYmplY3QgaW4gbWVtb3J5LiBOb3cgdGhlIHByb3BlcnRpZXMgYXJlIG5vIGxvbmdlciBzdG9yZWQgaW4gbWVtb3J5LCBzbyByZXBsYWNlIGlzIGRlcHJlY2F0ZWQuXG4gICAgICogQGRlcHJlY2F0ZWQgUGxlYXNlIHVzZSBhbXBsaXR1ZGUuZ2V0SW5zdGFuY2Uuc2V0VXNlclByb3BlcnRpZXModXNlclByb3BlcnRpZXMpO1xuICAgICAqIEBleGFtcGxlIGFtcGxpdHVkZS5zZXRVc2VyUHJvcGVydGllcyh7J2dlbmRlcic6ICdmZW1hbGUnLCAnc2lnbl91cF9jb21wbGV0ZSc6IHRydWV9KVxuICAgICAqL1xuXG5cbiAgICBBbXBsaXR1ZGUucHJvdG90eXBlLnNldFVzZXJQcm9wZXJ0aWVzID0gZnVuY3Rpb24gc2V0VXNlclByb3BlcnRpZXModXNlclByb3BlcnRpZXMpIHtcbiAgICAgIHRoaXMuZ2V0SW5zdGFuY2UoKS5zZXRVc2VyUHJvcGVydGllcyh1c2VyUHJvcGVydGllcyk7XG4gICAgfTtcbiAgICAvKipcbiAgICAgKiBDbGVhciBhbGwgb2YgdGhlIHVzZXIgcHJvcGVydGllcyBmb3IgdGhlIGN1cnJlbnQgdXNlci4gTm90ZTogY2xlYXJpbmcgdXNlciBwcm9wZXJ0aWVzIGlzIGlycmV2ZXJzaWJsZSFcbiAgICAgKiBAcHVibGljXG4gICAgICogQGRlcHJlY2F0ZWQgUGxlYXNlIHVzZSBhbXBsaXR1ZGUuZ2V0SW5zdGFuY2UoKS5jbGVhclVzZXJQcm9wZXJ0aWVzKCk7XG4gICAgICogQGV4YW1wbGUgYW1wbGl0dWRlLmNsZWFyVXNlclByb3BlcnRpZXMoKTtcbiAgICAgKi9cblxuXG4gICAgQW1wbGl0dWRlLnByb3RvdHlwZS5jbGVhclVzZXJQcm9wZXJ0aWVzID0gZnVuY3Rpb24gY2xlYXJVc2VyUHJvcGVydGllcygpIHtcbiAgICAgIHRoaXMuZ2V0SW5zdGFuY2UoKS5jbGVhclVzZXJQcm9wZXJ0aWVzKCk7XG4gICAgfTtcbiAgICAvKipcbiAgICAgKiBTZW5kIGFuIGlkZW50aWZ5IGNhbGwgY29udGFpbmluZyB1c2VyIHByb3BlcnR5IG9wZXJhdGlvbnMgdG8gQW1wbGl0dWRlIHNlcnZlcnMuXG4gICAgICogU2VlIFtSZWFkbWVde0BsaW5rIGh0dHBzOi8vZ2l0aHViLmNvbS9hbXBsaXR1ZGUvQW1wbGl0dWRlLUphdmFzY3JpcHQjdXNlci1wcm9wZXJ0aWVzLWFuZC11c2VyLXByb3BlcnR5LW9wZXJhdGlvbnN9XG4gICAgICogZm9yIG1vcmUgaW5mb3JtYXRpb24gb24gdGhlIElkZW50aWZ5IEFQSSBhbmQgdXNlciBwcm9wZXJ0eSBvcGVyYXRpb25zLlxuICAgICAqIEBwYXJhbSB7SWRlbnRpZnl9IGlkZW50aWZ5X29iaiAtIHRoZSBJZGVudGlmeSBvYmplY3QgY29udGFpbmluZyB0aGUgdXNlciBwcm9wZXJ0eSBvcGVyYXRpb25zIHRvIHNlbmQuXG4gICAgICogQHBhcmFtIHtBbXBsaXR1ZGV+ZXZlbnRDYWxsYmFja30gb3B0X2NhbGxiYWNrIC0gKG9wdGlvbmFsKSBjYWxsYmFjayBmdW5jdGlvbiB0byBydW4gd2hlbiB0aGUgaWRlbnRpZnkgZXZlbnQgaGFzIGJlZW4gc2VudC5cbiAgICAgKiBOb3RlOiB0aGUgc2VydmVyIHJlc3BvbnNlIGNvZGUgYW5kIHJlc3BvbnNlIGJvZHkgZnJvbSB0aGUgaWRlbnRpZnkgZXZlbnQgdXBsb2FkIGFyZSBwYXNzZWQgdG8gdGhlIGNhbGxiYWNrIGZ1bmN0aW9uLlxuICAgICAqIEBkZXByZWNhdGVkIFBsZWFzZSB1c2UgYW1wbGl0dWRlLmdldEluc3RhbmNlKCkuaWRlbnRpZnkoaWRlbnRpZnkpO1xuICAgICAqIEBleGFtcGxlXG4gICAgICogdmFyIGlkZW50aWZ5ID0gbmV3IGFtcGxpdHVkZS5JZGVudGlmeSgpLnNldCgnY29sb3JzJywgWydyb3NlJywgJ2dvbGQnXSkuYWRkKCdrYXJtYScsIDEpLnNldE9uY2UoJ3NpZ25fdXBfZGF0ZScsICcyMDE2LTAzLTMxJyk7XG4gICAgICogYW1wbGl0dWRlLmlkZW50aWZ5KGlkZW50aWZ5KTtcbiAgICAgKi9cblxuXG4gICAgQW1wbGl0dWRlLnByb3RvdHlwZS5pZGVudGlmeSA9IGZ1bmN0aW9uIChpZGVudGlmeV9vYmosIG9wdF9jYWxsYmFjaykge1xuICAgICAgdGhpcy5nZXRJbnN0YW5jZSgpLmlkZW50aWZ5KGlkZW50aWZ5X29iaiwgb3B0X2NhbGxiYWNrKTtcbiAgICB9O1xuICAgIC8qKlxuICAgICAqIFNldCBhIHZlcnNpb25OYW1lIGZvciB5b3VyIGFwcGxpY2F0aW9uLlxuICAgICAqIEBwdWJsaWNcbiAgICAgKiBAcGFyYW0ge3N0cmluZ30gdmVyc2lvbk5hbWUgLSBUaGUgdmVyc2lvbiB0byBzZXQgZm9yIHlvdXIgYXBwbGljYXRpb24uXG4gICAgICogQGRlcHJlY2F0ZWQgUGxlYXNlIHVzZSBhbXBsaXR1ZGUuZ2V0SW5zdGFuY2UoKS5zZXRWZXJzaW9uTmFtZSh2ZXJzaW9uTmFtZSk7XG4gICAgICogQGV4YW1wbGUgYW1wbGl0dWRlLnNldFZlcnNpb25OYW1lKCcxLjEyLjMnKTtcbiAgICAgKi9cblxuXG4gICAgQW1wbGl0dWRlLnByb3RvdHlwZS5zZXRWZXJzaW9uTmFtZSA9IGZ1bmN0aW9uIHNldFZlcnNpb25OYW1lKHZlcnNpb25OYW1lKSB7XG4gICAgICB0aGlzLmdldEluc3RhbmNlKCkuc2V0VmVyc2lvbk5hbWUodmVyc2lvbk5hbWUpO1xuICAgIH07XG4gICAgLyoqXG4gICAgICogVGhpcyBpcyB0aGUgY2FsbGJhY2sgZm9yIGxvZ0V2ZW50IGFuZCBpZGVudGlmeSBjYWxscy4gSXQgZ2V0cyBjYWxsZWQgYWZ0ZXIgdGhlIGV2ZW50L2lkZW50aWZ5IGlzIHVwbG9hZGVkLFxuICAgICAqIGFuZCB0aGUgc2VydmVyIHJlc3BvbnNlIGNvZGUgYW5kIHJlc3BvbnNlIGJvZHkgZnJvbSB0aGUgdXBsb2FkIHJlcXVlc3QgYXJlIHBhc3NlZCB0byB0aGUgY2FsbGJhY2sgZnVuY3Rpb24uXG4gICAgICogQGNhbGxiYWNrIEFtcGxpdHVkZX5ldmVudENhbGxiYWNrXG4gICAgICogQHBhcmFtIHtudW1iZXJ9IHJlc3BvbnNlQ29kZSAtIFNlcnZlciByZXNwb25zZSBjb2RlIGZvciB0aGUgZXZlbnQgLyBpZGVudGlmeSB1cGxvYWQgcmVxdWVzdC5cbiAgICAgKiBAcGFyYW0ge3N0cmluZ30gcmVzcG9uc2VCb2R5IC0gU2VydmVyIHJlc3BvbnNlIGJvZHkgZm9yIHRoZSBldmVudCAvIGlkZW50aWZ5IHVwbG9hZCByZXF1ZXN0LlxuICAgICAqL1xuXG4gICAgLyoqXG4gICAgICogTG9nIGFuIGV2ZW50IHdpdGggZXZlbnRUeXBlIGFuZCBldmVudFByb3BlcnRpZXNcbiAgICAgKiBAcHVibGljXG4gICAgICogQHBhcmFtIHtzdHJpbmd9IGV2ZW50VHlwZSAtIG5hbWUgb2YgZXZlbnRcbiAgICAgKiBAcGFyYW0ge29iamVjdH0gZXZlbnRQcm9wZXJ0aWVzIC0gKG9wdGlvbmFsKSBhbiBvYmplY3Qgd2l0aCBzdHJpbmcga2V5cyBhbmQgdmFsdWVzIGZvciB0aGUgZXZlbnQgcHJvcGVydGllcy5cbiAgICAgKiBAcGFyYW0ge0FtcGxpdHVkZX5ldmVudENhbGxiYWNrfSBvcHRfY2FsbGJhY2sgLSAob3B0aW9uYWwpIGEgY2FsbGJhY2sgZnVuY3Rpb24gdG8gcnVuIGFmdGVyIHRoZSBldmVudCBpcyBsb2dnZWQuXG4gICAgICogTm90ZTogdGhlIHNlcnZlciByZXNwb25zZSBjb2RlIGFuZCByZXNwb25zZSBib2R5IGZyb20gdGhlIGV2ZW50IHVwbG9hZCBhcmUgcGFzc2VkIHRvIHRoZSBjYWxsYmFjayBmdW5jdGlvbi5cbiAgICAgKiBAZGVwcmVjYXRlZCBQbGVhc2UgdXNlIGFtcGxpdHVkZS5nZXRJbnN0YW5jZSgpLmxvZ0V2ZW50KGV2ZW50VHlwZSwgZXZlbnRQcm9wZXJ0aWVzLCBvcHRfY2FsbGJhY2spO1xuICAgICAqIEBleGFtcGxlIGFtcGxpdHVkZS5sb2dFdmVudCgnQ2xpY2tlZCBIb21lcGFnZSBCdXR0b24nLCB7J2ZpbmlzaGVkX2Zsb3cnOiBmYWxzZSwgJ2NsaWNrcyc6IDE1fSk7XG4gICAgICovXG5cblxuICAgIEFtcGxpdHVkZS5wcm90b3R5cGUubG9nRXZlbnQgPSBmdW5jdGlvbiBsb2dFdmVudChldmVudFR5cGUsIGV2ZW50UHJvcGVydGllcywgb3B0X2NhbGxiYWNrKSB7XG4gICAgICByZXR1cm4gdGhpcy5nZXRJbnN0YW5jZSgpLmxvZ0V2ZW50KGV2ZW50VHlwZSwgZXZlbnRQcm9wZXJ0aWVzLCBvcHRfY2FsbGJhY2spO1xuICAgIH07XG4gICAgLyoqXG4gICAgICogTG9nIGFuIGV2ZW50IHdpdGggZXZlbnRUeXBlLCBldmVudFByb3BlcnRpZXMsIGFuZCBncm91cHMuIFVzZSB0aGlzIHRvIHNldCBldmVudC1sZXZlbCBncm91cHMuXG4gICAgICogTm90ZTogdGhlIGdyb3VwKHMpIHNldCBvbmx5IGFwcGx5IGZvciB0aGUgc3BlY2lmaWMgZXZlbnQgdHlwZSBiZWluZyBsb2dnZWQgYW5kIGRvZXMgbm90IHBlcnNpc3Qgb24gdGhlIHVzZXJcbiAgICAgKiAodW5sZXNzIHlvdSBleHBsaWNpdGx5IHNldCBpdCB3aXRoIHNldEdyb3VwKS5cbiAgICAgKiBTZWUgdGhlIFtTREsgUmVhZG1lXXtAbGluayBodHRwczovL2dpdGh1Yi5jb20vYW1wbGl0dWRlL0FtcGxpdHVkZS1KYXZhc2NyaXB0I3NldHRpbmctZ3JvdXBzfSBmb3IgbW9yZSBpbmZvcm1hdGlvblxuICAgICAqIGFib3V0IGdyb3VwcyBhbmQgQ291bnQgYnkgRGlzdGluY3Qgb24gdGhlIEFtcGxpdHVkZSBwbGF0Zm9ybS5cbiAgICAgKiBAcHVibGljXG4gICAgICogQHBhcmFtIHtzdHJpbmd9IGV2ZW50VHlwZSAtIG5hbWUgb2YgZXZlbnRcbiAgICAgKiBAcGFyYW0ge29iamVjdH0gZXZlbnRQcm9wZXJ0aWVzIC0gKG9wdGlvbmFsKSBhbiBvYmplY3Qgd2l0aCBzdHJpbmcga2V5cyBhbmQgdmFsdWVzIGZvciB0aGUgZXZlbnQgcHJvcGVydGllcy5cbiAgICAgKiBAcGFyYW0ge29iamVjdH0gZ3JvdXBzIC0gKG9wdGlvbmFsKSBhbiBvYmplY3Qgd2l0aCBzdHJpbmcgZ3JvdXBUeXBlOiBncm91cE5hbWUgdmFsdWVzIGZvciB0aGUgZXZlbnQgYmVpbmcgbG9nZ2VkLlxuICAgICAqIGdyb3VwTmFtZSBjYW4gYmUgYSBzdHJpbmcgb3IgYW4gYXJyYXkgb2Ygc3RyaW5ncy5cbiAgICAgKiBAcGFyYW0ge0FtcGxpdHVkZX5ldmVudENhbGxiYWNrfSBvcHRfY2FsbGJhY2sgLSAob3B0aW9uYWwpIGEgY2FsbGJhY2sgZnVuY3Rpb24gdG8gcnVuIGFmdGVyIHRoZSBldmVudCBpcyBsb2dnZWQuXG4gICAgICogTm90ZTogdGhlIHNlcnZlciByZXNwb25zZSBjb2RlIGFuZCByZXNwb25zZSBib2R5IGZyb20gdGhlIGV2ZW50IHVwbG9hZCBhcmUgcGFzc2VkIHRvIHRoZSBjYWxsYmFjayBmdW5jdGlvbi5cbiAgICAgKiBEZXByZWNhdGVkIFBsZWFzZSB1c2UgYW1wbGl0dWRlLmdldEluc3RhbmNlKCkubG9nRXZlbnRXaXRoR3JvdXBzKGV2ZW50VHlwZSwgZXZlbnRQcm9wZXJ0aWVzLCBncm91cHMsIG9wdF9jYWxsYmFjayk7XG4gICAgICogQGV4YW1wbGUgYW1wbGl0dWRlLmxvZ0V2ZW50V2l0aEdyb3VwcygnQ2xpY2tlZCBCdXR0b24nLCBudWxsLCB7J29yZ0lkJzogMjR9KTtcbiAgICAgKi9cblxuXG4gICAgQW1wbGl0dWRlLnByb3RvdHlwZS5sb2dFdmVudFdpdGhHcm91cHMgPSBmdW5jdGlvbiAoZXZlbnRUeXBlLCBldmVudFByb3BlcnRpZXMsIGdyb3Vwcywgb3B0X2NhbGxiYWNrKSB7XG4gICAgICByZXR1cm4gdGhpcy5nZXRJbnN0YW5jZSgpLmxvZ0V2ZW50V2l0aEdyb3VwcyhldmVudFR5cGUsIGV2ZW50UHJvcGVydGllcywgZ3JvdXBzLCBvcHRfY2FsbGJhY2spO1xuICAgIH07XG4gICAgLyoqXG4gICAgICogTG9nIHJldmVudWUgd2l0aCBSZXZlbnVlIGludGVyZmFjZS4gVGhlIG5ldyByZXZlbnVlIGludGVyZmFjZSBhbGxvd3MgZm9yIG1vcmUgcmV2ZW51ZSBmaWVsZHMgbGlrZVxuICAgICAqIHJldmVudWVUeXBlIGFuZCBldmVudCBwcm9wZXJ0aWVzLlxuICAgICAqIFNlZSBbUmVhZG1lXXtAbGluayBodHRwczovL2dpdGh1Yi5jb20vYW1wbGl0dWRlL0FtcGxpdHVkZS1KYXZhc2NyaXB0I3RyYWNraW5nLXJldmVudWV9XG4gICAgICogZm9yIG1vcmUgaW5mb3JtYXRpb24gb24gdGhlIFJldmVudWUgaW50ZXJmYWNlIGFuZCBsb2dnaW5nIHJldmVudWUuXG4gICAgICogQHB1YmxpY1xuICAgICAqIEBwYXJhbSB7UmV2ZW51ZX0gcmV2ZW51ZV9vYmogLSB0aGUgcmV2ZW51ZSBvYmplY3QgY29udGFpbmluZyB0aGUgcmV2ZW51ZSBkYXRhIGJlaW5nIGxvZ2dlZC5cbiAgICAgKiBAZGVwcmVjYXRlZCBQbGVhc2UgdXNlIGFtcGxpdHVkZS5nZXRJbnN0YW5jZSgpLmxvZ1JldmVudWVWMihyZXZlbnVlX29iaik7XG4gICAgICogQGV4YW1wbGUgdmFyIHJldmVudWUgPSBuZXcgYW1wbGl0dWRlLlJldmVudWUoKS5zZXRQcm9kdWN0SWQoJ3Byb2R1Y3RJZGVudGlmaWVyJykuc2V0UHJpY2UoMTAuOTkpO1xuICAgICAqIGFtcGxpdHVkZS5sb2dSZXZlbnVlVjIocmV2ZW51ZSk7XG4gICAgICovXG5cblxuICAgIEFtcGxpdHVkZS5wcm90b3R5cGUubG9nUmV2ZW51ZVYyID0gZnVuY3Rpb24gbG9nUmV2ZW51ZVYyKHJldmVudWVfb2JqKSB7XG4gICAgICByZXR1cm4gdGhpcy5nZXRJbnN0YW5jZSgpLmxvZ1JldmVudWVWMihyZXZlbnVlX29iaik7XG4gICAgfTtcbiAgICAvKipcbiAgICAgKiBMb2cgcmV2ZW51ZSBldmVudCB3aXRoIGEgcHJpY2UsIHF1YW50aXR5LCBhbmQgcHJvZHVjdCBpZGVudGlmaWVyLiBERVBSRUNBVEVEIC0gdXNlIGxvZ1JldmVudWVWMlxuICAgICAqIEBwdWJsaWNcbiAgICAgKiBAcGFyYW0ge251bWJlcn0gcHJpY2UgLSBwcmljZSBvZiByZXZlbnVlIGV2ZW50XG4gICAgICogQHBhcmFtIHtudW1iZXJ9IHF1YW50aXR5IC0gKG9wdGlvbmFsKSBxdWFudGl0eSBvZiBwcm9kdWN0cyBpbiByZXZlbnVlIGV2ZW50LiBJZiBubyBxdWFudGl0eSBzcGVjaWZpZWQgZGVmYXVsdCB0byAxLlxuICAgICAqIEBwYXJhbSB7c3RyaW5nfSBwcm9kdWN0IC0gKG9wdGlvbmFsKSBwcm9kdWN0IGlkZW50aWZpZXJcbiAgICAgKiBAZGVwcmVjYXRlZCBQbGVhc2UgdXNlIGFtcGxpdHVkZS5nZXRJbnN0YW5jZSgpLmxvZ1JldmVudWVWMihyZXZlbnVlX29iaik7XG4gICAgICogQGV4YW1wbGUgYW1wbGl0dWRlLmxvZ1JldmVudWUoMy45OSwgMSwgJ3Byb2R1Y3RfMTIzNCcpO1xuICAgICAqL1xuXG5cbiAgICBBbXBsaXR1ZGUucHJvdG90eXBlLmxvZ1JldmVudWUgPSBmdW5jdGlvbiBsb2dSZXZlbnVlKHByaWNlLCBxdWFudGl0eSwgcHJvZHVjdCkge1xuICAgICAgcmV0dXJuIHRoaXMuZ2V0SW5zdGFuY2UoKS5sb2dSZXZlbnVlKHByaWNlLCBxdWFudGl0eSwgcHJvZHVjdCk7XG4gICAgfTtcbiAgICAvKipcbiAgICAgKiBSZW1vdmUgZXZlbnRzIGluIHN0b3JhZ2Ugd2l0aCBldmVudCBpZHMgdXAgdG8gYW5kIGluY2x1ZGluZyBtYXhFdmVudElkLlxuICAgICAqIEBwcml2YXRlXG4gICAgICovXG5cblxuICAgIEFtcGxpdHVkZS5wcm90b3R5cGUucmVtb3ZlRXZlbnRzID0gZnVuY3Rpb24gcmVtb3ZlRXZlbnRzKG1heEV2ZW50SWQsIG1heElkZW50aWZ5SWQpIHtcbiAgICAgIHRoaXMuZ2V0SW5zdGFuY2UoKS5yZW1vdmVFdmVudHMobWF4RXZlbnRJZCwgbWF4SWRlbnRpZnlJZCk7XG4gICAgfTtcbiAgICAvKipcbiAgICAgKiBTZW5kIHVuc2VudCBldmVudHMuIE5vdGU6IHRoaXMgaXMgY2FsbGVkIGF1dG9tYXRpY2FsbHkgYWZ0ZXIgZXZlbnRzIGFyZSBsb2dnZWQgaWYgb3B0aW9uIGJhdGNoRXZlbnRzIGlzIGZhbHNlLlxuICAgICAqIElmIGJhdGNoRXZlbnRzIGlzIHRydWUsIHRoZW4gZXZlbnRzIGFyZSBvbmx5IHNlbnQgd2hlbiBiYXRjaCBjcml0ZXJpYXMgYXJlIG1ldC5cbiAgICAgKiBAcHJpdmF0ZVxuICAgICAqIEBwYXJhbSB7QW1wbGl0dWRlfmV2ZW50Q2FsbGJhY2t9IGNhbGxiYWNrIC0gKG9wdGlvbmFsKSBjYWxsYmFjayB0byBydW4gYWZ0ZXIgZXZlbnRzIGFyZSBzZW50LlxuICAgICAqIE5vdGUgdGhlIHNlcnZlciByZXNwb25zZSBjb2RlIGFuZCByZXNwb25zZSBib2R5IGFyZSBwYXNzZWQgdG8gdGhlIGNhbGxiYWNrIGFzIGlucHV0IGFyZ3VtZW50cy5cbiAgICAgKi9cblxuXG4gICAgQW1wbGl0dWRlLnByb3RvdHlwZS5zZW5kRXZlbnRzID0gZnVuY3Rpb24gc2VuZEV2ZW50cyhjYWxsYmFjaykge1xuICAgICAgdGhpcy5nZXRJbnN0YW5jZSgpLnNlbmRFdmVudHMoY2FsbGJhY2spO1xuICAgIH07XG4gICAgLyoqXG4gICAgICogU2V0IGdsb2JhbCB1c2VyIHByb3BlcnRpZXMuIE5vdGUgdGhpcyBpcyBkZXByZWNhdGVkLCBhbmQgd2UgcmVjb21tZW5kIHVzaW5nIHNldFVzZXJQcm9wZXJ0aWVzXG4gICAgICogQHB1YmxpY1xuICAgICAqIEBkZXByZWNhdGVkXG4gICAgICovXG5cblxuICAgIEFtcGxpdHVkZS5wcm90b3R5cGUuc2V0R2xvYmFsVXNlclByb3BlcnRpZXMgPSBmdW5jdGlvbiBzZXRHbG9iYWxVc2VyUHJvcGVydGllcyh1c2VyUHJvcGVydGllcykge1xuICAgICAgdGhpcy5nZXRJbnN0YW5jZSgpLnNldFVzZXJQcm9wZXJ0aWVzKHVzZXJQcm9wZXJ0aWVzKTtcbiAgICB9O1xuICB9XG4gIC8qKlxuICAgKiBHZXQgdGhlIGN1cnJlbnQgdmVyc2lvbiBvZiBBbXBsaXR1ZGUncyBKYXZhc2NyaXB0IFNESy5cbiAgICogQHB1YmxpY1xuICAgKiBAcmV0dXJucyB7bnVtYmVyfSB2ZXJzaW9uIG51bWJlclxuICAgKiBAZXhhbXBsZSB2YXIgYW1wbGl0dWRlVmVyc2lvbiA9IGFtcGxpdHVkZS5fX1ZFUlNJT05fXztcbiAgICovXG5cblxuICBBbXBsaXR1ZGUucHJvdG90eXBlLl9fVkVSU0lPTl9fID0gdmVyc2lvbjtcblxuICAvKiBqc2hpbnQgZXhwcjp0cnVlICovXG4gIHZhciBvbGQgPSB3aW5kb3cuYW1wbGl0dWRlIHx8IHt9O1xuICB2YXIgbmV3SW5zdGFuY2UgPSBuZXcgQW1wbGl0dWRlKCk7XG4gIG5ld0luc3RhbmNlLl9xID0gb2xkLl9xIHx8IFtdO1xuXG4gIGZvciAodmFyIGluc3RhbmNlIGluIG9sZC5faXEpIHtcbiAgICAvLyBtaWdyYXRlIGVhY2ggaW5zdGFuY2UncyBxdWV1ZVxuICAgIGlmIChvbGQuX2lxLmhhc093blByb3BlcnR5KGluc3RhbmNlKSkge1xuICAgICAgbmV3SW5zdGFuY2UuZ2V0SW5zdGFuY2UoaW5zdGFuY2UpLl9xID0gb2xkLl9pcVtpbnN0YW5jZV0uX3EgfHwgW107XG4gICAgfVxuICB9XG5cbiAge1xuICAgIG5ld0luc3RhbmNlLnJ1blF1ZXVlZEZ1bmN0aW9ucygpO1xuICB9IC8vIGV4cG9ydCB0aGUgaW5zdGFuY2VcblxuICByZXR1cm4gbmV3SW5zdGFuY2U7XG5cbn0pKTtcbiIsIlwidXNlIHN0cmljdFwiO1xuXG4vLyBVc2UgdGhlIGZhc3Rlc3QgbWVhbnMgcG9zc2libGUgdG8gZXhlY3V0ZSBhIHRhc2sgaW4gaXRzIG93biB0dXJuLCB3aXRoXG4vLyBwcmlvcml0eSBvdmVyIG90aGVyIGV2ZW50cyBpbmNsdWRpbmcgSU8sIGFuaW1hdGlvbiwgcmVmbG93LCBhbmQgcmVkcmF3XG4vLyBldmVudHMgaW4gYnJvd3NlcnMuXG4vL1xuLy8gQW4gZXhjZXB0aW9uIHRocm93biBieSBhIHRhc2sgd2lsbCBwZXJtYW5lbnRseSBpbnRlcnJ1cHQgdGhlIHByb2Nlc3Npbmcgb2Zcbi8vIHN1YnNlcXVlbnQgdGFza3MuIFRoZSBoaWdoZXIgbGV2ZWwgYGFzYXBgIGZ1bmN0aW9uIGVuc3VyZXMgdGhhdCBpZiBhblxuLy8gZXhjZXB0aW9uIGlzIHRocm93biBieSBhIHRhc2ssIHRoYXQgdGhlIHRhc2sgcXVldWUgd2lsbCBjb250aW51ZSBmbHVzaGluZyBhc1xuLy8gc29vbiBhcyBwb3NzaWJsZSwgYnV0IGlmIHlvdSB1c2UgYHJhd0FzYXBgIGRpcmVjdGx5LCB5b3UgYXJlIHJlc3BvbnNpYmxlIHRvXG4vLyBlaXRoZXIgZW5zdXJlIHRoYXQgbm8gZXhjZXB0aW9ucyBhcmUgdGhyb3duIGZyb20geW91ciB0YXNrLCBvciB0byBtYW51YWxseVxuLy8gY2FsbCBgcmF3QXNhcC5yZXF1ZXN0Rmx1c2hgIGlmIGFuIGV4Y2VwdGlvbiBpcyB0aHJvd24uXG5tb2R1bGUuZXhwb3J0cyA9IHJhd0FzYXA7XG5mdW5jdGlvbiByYXdBc2FwKHRhc2spIHtcbiAgICBpZiAoIXF1ZXVlLmxlbmd0aCkge1xuICAgICAgICByZXF1ZXN0Rmx1c2goKTtcbiAgICAgICAgZmx1c2hpbmcgPSB0cnVlO1xuICAgIH1cbiAgICAvLyBFcXVpdmFsZW50IHRvIHB1c2gsIGJ1dCBhdm9pZHMgYSBmdW5jdGlvbiBjYWxsLlxuICAgIHF1ZXVlW3F1ZXVlLmxlbmd0aF0gPSB0YXNrO1xufVxuXG52YXIgcXVldWUgPSBbXTtcbi8vIE9uY2UgYSBmbHVzaCBoYXMgYmVlbiByZXF1ZXN0ZWQsIG5vIGZ1cnRoZXIgY2FsbHMgdG8gYHJlcXVlc3RGbHVzaGAgYXJlXG4vLyBuZWNlc3NhcnkgdW50aWwgdGhlIG5leHQgYGZsdXNoYCBjb21wbGV0ZXMuXG52YXIgZmx1c2hpbmcgPSBmYWxzZTtcbi8vIGByZXF1ZXN0Rmx1c2hgIGlzIGFuIGltcGxlbWVudGF0aW9uLXNwZWNpZmljIG1ldGhvZCB0aGF0IGF0dGVtcHRzIHRvIGtpY2tcbi8vIG9mZiBhIGBmbHVzaGAgZXZlbnQgYXMgcXVpY2tseSBhcyBwb3NzaWJsZS4gYGZsdXNoYCB3aWxsIGF0dGVtcHQgdG8gZXhoYXVzdFxuLy8gdGhlIGV2ZW50IHF1ZXVlIGJlZm9yZSB5aWVsZGluZyB0byB0aGUgYnJvd3NlcidzIG93biBldmVudCBsb29wLlxudmFyIHJlcXVlc3RGbHVzaDtcbi8vIFRoZSBwb3NpdGlvbiBvZiB0aGUgbmV4dCB0YXNrIHRvIGV4ZWN1dGUgaW4gdGhlIHRhc2sgcXVldWUuIFRoaXMgaXNcbi8vIHByZXNlcnZlZCBiZXR3ZWVuIGNhbGxzIHRvIGBmbHVzaGAgc28gdGhhdCBpdCBjYW4gYmUgcmVzdW1lZCBpZlxuLy8gYSB0YXNrIHRocm93cyBhbiBleGNlcHRpb24uXG52YXIgaW5kZXggPSAwO1xuLy8gSWYgYSB0YXNrIHNjaGVkdWxlcyBhZGRpdGlvbmFsIHRhc2tzIHJlY3Vyc2l2ZWx5LCB0aGUgdGFzayBxdWV1ZSBjYW4gZ3Jvd1xuLy8gdW5ib3VuZGVkLiBUbyBwcmV2ZW50IG1lbW9yeSBleGhhdXN0aW9uLCB0aGUgdGFzayBxdWV1ZSB3aWxsIHBlcmlvZGljYWxseVxuLy8gdHJ1bmNhdGUgYWxyZWFkeS1jb21wbGV0ZWQgdGFza3MuXG52YXIgY2FwYWNpdHkgPSAxMDI0O1xuXG4vLyBUaGUgZmx1c2ggZnVuY3Rpb24gcHJvY2Vzc2VzIGFsbCB0YXNrcyB0aGF0IGhhdmUgYmVlbiBzY2hlZHVsZWQgd2l0aFxuLy8gYHJhd0FzYXBgIHVubGVzcyBhbmQgdW50aWwgb25lIG9mIHRob3NlIHRhc2tzIHRocm93cyBhbiBleGNlcHRpb24uXG4vLyBJZiBhIHRhc2sgdGhyb3dzIGFuIGV4Y2VwdGlvbiwgYGZsdXNoYCBlbnN1cmVzIHRoYXQgaXRzIHN0YXRlIHdpbGwgcmVtYWluXG4vLyBjb25zaXN0ZW50IGFuZCB3aWxsIHJlc3VtZSB3aGVyZSBpdCBsZWZ0IG9mZiB3aGVuIGNhbGxlZCBhZ2Fpbi5cbi8vIEhvd2V2ZXIsIGBmbHVzaGAgZG9lcyBub3QgbWFrZSBhbnkgYXJyYW5nZW1lbnRzIHRvIGJlIGNhbGxlZCBhZ2FpbiBpZiBhblxuLy8gZXhjZXB0aW9uIGlzIHRocm93bi5cbmZ1bmN0aW9uIGZsdXNoKCkge1xuICAgIHdoaWxlIChpbmRleCA8IHF1ZXVlLmxlbmd0aCkge1xuICAgICAgICB2YXIgY3VycmVudEluZGV4ID0gaW5kZXg7XG4gICAgICAgIC8vIEFkdmFuY2UgdGhlIGluZGV4IGJlZm9yZSBjYWxsaW5nIHRoZSB0YXNrLiBUaGlzIGVuc3VyZXMgdGhhdCB3ZSB3aWxsXG4gICAgICAgIC8vIGJlZ2luIGZsdXNoaW5nIG9uIHRoZSBuZXh0IHRhc2sgdGhlIHRhc2sgdGhyb3dzIGFuIGVycm9yLlxuICAgICAgICBpbmRleCA9IGluZGV4ICsgMTtcbiAgICAgICAgcXVldWVbY3VycmVudEluZGV4XS5jYWxsKCk7XG4gICAgICAgIC8vIFByZXZlbnQgbGVha2luZyBtZW1vcnkgZm9yIGxvbmcgY2hhaW5zIG9mIHJlY3Vyc2l2ZSBjYWxscyB0byBgYXNhcGAuXG4gICAgICAgIC8vIElmIHdlIGNhbGwgYGFzYXBgIHdpdGhpbiB0YXNrcyBzY2hlZHVsZWQgYnkgYGFzYXBgLCB0aGUgcXVldWUgd2lsbFxuICAgICAgICAvLyBncm93LCBidXQgdG8gYXZvaWQgYW4gTyhuKSB3YWxrIGZvciBldmVyeSB0YXNrIHdlIGV4ZWN1dGUsIHdlIGRvbid0XG4gICAgICAgIC8vIHNoaWZ0IHRhc2tzIG9mZiB0aGUgcXVldWUgYWZ0ZXIgdGhleSBoYXZlIGJlZW4gZXhlY3V0ZWQuXG4gICAgICAgIC8vIEluc3RlYWQsIHdlIHBlcmlvZGljYWxseSBzaGlmdCAxMDI0IHRhc2tzIG9mZiB0aGUgcXVldWUuXG4gICAgICAgIGlmIChpbmRleCA+IGNhcGFjaXR5KSB7XG4gICAgICAgICAgICAvLyBNYW51YWxseSBzaGlmdCBhbGwgdmFsdWVzIHN0YXJ0aW5nIGF0IHRoZSBpbmRleCBiYWNrIHRvIHRoZVxuICAgICAgICAgICAgLy8gYmVnaW5uaW5nIG9mIHRoZSBxdWV1ZS5cbiAgICAgICAgICAgIGZvciAodmFyIHNjYW4gPSAwLCBuZXdMZW5ndGggPSBxdWV1ZS5sZW5ndGggLSBpbmRleDsgc2NhbiA8IG5ld0xlbmd0aDsgc2NhbisrKSB7XG4gICAgICAgICAgICAgICAgcXVldWVbc2Nhbl0gPSBxdWV1ZVtzY2FuICsgaW5kZXhdO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgcXVldWUubGVuZ3RoIC09IGluZGV4O1xuICAgICAgICAgICAgaW5kZXggPSAwO1xuICAgICAgICB9XG4gICAgfVxuICAgIHF1ZXVlLmxlbmd0aCA9IDA7XG4gICAgaW5kZXggPSAwO1xuICAgIGZsdXNoaW5nID0gZmFsc2U7XG59XG5cbi8vIGByZXF1ZXN0Rmx1c2hgIGlzIGltcGxlbWVudGVkIHVzaW5nIGEgc3RyYXRlZ3kgYmFzZWQgb24gZGF0YSBjb2xsZWN0ZWQgZnJvbVxuLy8gZXZlcnkgYXZhaWxhYmxlIFNhdWNlTGFicyBTZWxlbml1bSB3ZWIgZHJpdmVyIHdvcmtlciBhdCB0aW1lIG9mIHdyaXRpbmcuXG4vLyBodHRwczovL2RvY3MuZ29vZ2xlLmNvbS9zcHJlYWRzaGVldHMvZC8xbUctNVVZR3VwNXF4R2RFTVdraFA2QldDejA1M05VYjJFMVFvVVRVMTZ1QS9lZGl0I2dpZD03ODM3MjQ1OTNcblxuLy8gU2FmYXJpIDYgYW5kIDYuMSBmb3IgZGVza3RvcCwgaVBhZCwgYW5kIGlQaG9uZSBhcmUgdGhlIG9ubHkgYnJvd3NlcnMgdGhhdFxuLy8gaGF2ZSBXZWJLaXRNdXRhdGlvbk9ic2VydmVyIGJ1dCBub3QgdW4tcHJlZml4ZWQgTXV0YXRpb25PYnNlcnZlci5cbi8vIE11c3QgdXNlIGBnbG9iYWxgIG9yIGBzZWxmYCBpbnN0ZWFkIG9mIGB3aW5kb3dgIHRvIHdvcmsgaW4gYm90aCBmcmFtZXMgYW5kIHdlYlxuLy8gd29ya2Vycy4gYGdsb2JhbGAgaXMgYSBwcm92aXNpb24gb2YgQnJvd3NlcmlmeSwgTXIsIE1ycywgb3IgTW9wLlxuXG4vKiBnbG9iYWxzIHNlbGYgKi9cbnZhciBzY29wZSA9IHR5cGVvZiBnbG9iYWwgIT09IFwidW5kZWZpbmVkXCIgPyBnbG9iYWwgOiBzZWxmO1xudmFyIEJyb3dzZXJNdXRhdGlvbk9ic2VydmVyID0gc2NvcGUuTXV0YXRpb25PYnNlcnZlciB8fCBzY29wZS5XZWJLaXRNdXRhdGlvbk9ic2VydmVyO1xuXG4vLyBNdXRhdGlvbk9ic2VydmVycyBhcmUgZGVzaXJhYmxlIGJlY2F1c2UgdGhleSBoYXZlIGhpZ2ggcHJpb3JpdHkgYW5kIHdvcmtcbi8vIHJlbGlhYmx5IGV2ZXJ5d2hlcmUgdGhleSBhcmUgaW1wbGVtZW50ZWQuXG4vLyBUaGV5IGFyZSBpbXBsZW1lbnRlZCBpbiBhbGwgbW9kZXJuIGJyb3dzZXJzLlxuLy9cbi8vIC0gQW5kcm9pZCA0LTQuM1xuLy8gLSBDaHJvbWUgMjYtMzRcbi8vIC0gRmlyZWZveCAxNC0yOVxuLy8gLSBJbnRlcm5ldCBFeHBsb3JlciAxMVxuLy8gLSBpUGFkIFNhZmFyaSA2LTcuMVxuLy8gLSBpUGhvbmUgU2FmYXJpIDctNy4xXG4vLyAtIFNhZmFyaSA2LTdcbmlmICh0eXBlb2YgQnJvd3Nlck11dGF0aW9uT2JzZXJ2ZXIgPT09IFwiZnVuY3Rpb25cIikge1xuICAgIHJlcXVlc3RGbHVzaCA9IG1ha2VSZXF1ZXN0Q2FsbEZyb21NdXRhdGlvbk9ic2VydmVyKGZsdXNoKTtcblxuLy8gTWVzc2FnZUNoYW5uZWxzIGFyZSBkZXNpcmFibGUgYmVjYXVzZSB0aGV5IGdpdmUgZGlyZWN0IGFjY2VzcyB0byB0aGUgSFRNTFxuLy8gdGFzayBxdWV1ZSwgYXJlIGltcGxlbWVudGVkIGluIEludGVybmV0IEV4cGxvcmVyIDEwLCBTYWZhcmkgNS4wLTEsIGFuZCBPcGVyYVxuLy8gMTEtMTIsIGFuZCBpbiB3ZWIgd29ya2VycyBpbiBtYW55IGVuZ2luZXMuXG4vLyBBbHRob3VnaCBtZXNzYWdlIGNoYW5uZWxzIHlpZWxkIHRvIGFueSBxdWV1ZWQgcmVuZGVyaW5nIGFuZCBJTyB0YXNrcywgdGhleVxuLy8gd291bGQgYmUgYmV0dGVyIHRoYW4gaW1wb3NpbmcgdGhlIDRtcyBkZWxheSBvZiB0aW1lcnMuXG4vLyBIb3dldmVyLCB0aGV5IGRvIG5vdCB3b3JrIHJlbGlhYmx5IGluIEludGVybmV0IEV4cGxvcmVyIG9yIFNhZmFyaS5cblxuLy8gSW50ZXJuZXQgRXhwbG9yZXIgMTAgaXMgdGhlIG9ubHkgYnJvd3NlciB0aGF0IGhhcyBzZXRJbW1lZGlhdGUgYnV0IGRvZXNcbi8vIG5vdCBoYXZlIE11dGF0aW9uT2JzZXJ2ZXJzLlxuLy8gQWx0aG91Z2ggc2V0SW1tZWRpYXRlIHlpZWxkcyB0byB0aGUgYnJvd3NlcidzIHJlbmRlcmVyLCBpdCB3b3VsZCBiZVxuLy8gcHJlZmVycmFibGUgdG8gZmFsbGluZyBiYWNrIHRvIHNldFRpbWVvdXQgc2luY2UgaXQgZG9lcyBub3QgaGF2ZVxuLy8gdGhlIG1pbmltdW0gNG1zIHBlbmFsdHkuXG4vLyBVbmZvcnR1bmF0ZWx5IHRoZXJlIGFwcGVhcnMgdG8gYmUgYSBidWcgaW4gSW50ZXJuZXQgRXhwbG9yZXIgMTAgTW9iaWxlIChhbmRcbi8vIERlc2t0b3AgdG8gYSBsZXNzZXIgZXh0ZW50KSB0aGF0IHJlbmRlcnMgYm90aCBzZXRJbW1lZGlhdGUgYW5kXG4vLyBNZXNzYWdlQ2hhbm5lbCB1c2VsZXNzIGZvciB0aGUgcHVycG9zZXMgb2YgQVNBUC5cbi8vIGh0dHBzOi8vZ2l0aHViLmNvbS9rcmlza293YWwvcS9pc3N1ZXMvMzk2XG5cbi8vIFRpbWVycyBhcmUgaW1wbGVtZW50ZWQgdW5pdmVyc2FsbHkuXG4vLyBXZSBmYWxsIGJhY2sgdG8gdGltZXJzIGluIHdvcmtlcnMgaW4gbW9zdCBlbmdpbmVzLCBhbmQgaW4gZm9yZWdyb3VuZFxuLy8gY29udGV4dHMgaW4gdGhlIGZvbGxvd2luZyBicm93c2Vycy5cbi8vIEhvd2V2ZXIsIG5vdGUgdGhhdCBldmVuIHRoaXMgc2ltcGxlIGNhc2UgcmVxdWlyZXMgbnVhbmNlcyB0byBvcGVyYXRlIGluIGFcbi8vIGJyb2FkIHNwZWN0cnVtIG9mIGJyb3dzZXJzLlxuLy9cbi8vIC0gRmlyZWZveCAzLTEzXG4vLyAtIEludGVybmV0IEV4cGxvcmVyIDYtOVxuLy8gLSBpUGFkIFNhZmFyaSA0LjNcbi8vIC0gTHlueCAyLjguN1xufSBlbHNlIHtcbiAgICByZXF1ZXN0Rmx1c2ggPSBtYWtlUmVxdWVzdENhbGxGcm9tVGltZXIoZmx1c2gpO1xufVxuXG4vLyBgcmVxdWVzdEZsdXNoYCByZXF1ZXN0cyB0aGF0IHRoZSBoaWdoIHByaW9yaXR5IGV2ZW50IHF1ZXVlIGJlIGZsdXNoZWQgYXNcbi8vIHNvb24gYXMgcG9zc2libGUuXG4vLyBUaGlzIGlzIHVzZWZ1bCB0byBwcmV2ZW50IGFuIGVycm9yIHRocm93biBpbiBhIHRhc2sgZnJvbSBzdGFsbGluZyB0aGUgZXZlbnRcbi8vIHF1ZXVlIGlmIHRoZSBleGNlcHRpb24gaGFuZGxlZCBieSBOb2RlLmpz4oCZc1xuLy8gYHByb2Nlc3Mub24oXCJ1bmNhdWdodEV4Y2VwdGlvblwiKWAgb3IgYnkgYSBkb21haW4uXG5yYXdBc2FwLnJlcXVlc3RGbHVzaCA9IHJlcXVlc3RGbHVzaDtcblxuLy8gVG8gcmVxdWVzdCBhIGhpZ2ggcHJpb3JpdHkgZXZlbnQsIHdlIGluZHVjZSBhIG11dGF0aW9uIG9ic2VydmVyIGJ5IHRvZ2dsaW5nXG4vLyB0aGUgdGV4dCBvZiBhIHRleHQgbm9kZSBiZXR3ZWVuIFwiMVwiIGFuZCBcIi0xXCIuXG5mdW5jdGlvbiBtYWtlUmVxdWVzdENhbGxGcm9tTXV0YXRpb25PYnNlcnZlcihjYWxsYmFjaykge1xuICAgIHZhciB0b2dnbGUgPSAxO1xuICAgIHZhciBvYnNlcnZlciA9IG5ldyBCcm93c2VyTXV0YXRpb25PYnNlcnZlcihjYWxsYmFjayk7XG4gICAgdmFyIG5vZGUgPSBkb2N1bWVudC5jcmVhdGVUZXh0Tm9kZShcIlwiKTtcbiAgICBvYnNlcnZlci5vYnNlcnZlKG5vZGUsIHtjaGFyYWN0ZXJEYXRhOiB0cnVlfSk7XG4gICAgcmV0dXJuIGZ1bmN0aW9uIHJlcXVlc3RDYWxsKCkge1xuICAgICAgICB0b2dnbGUgPSAtdG9nZ2xlO1xuICAgICAgICBub2RlLmRhdGEgPSB0b2dnbGU7XG4gICAgfTtcbn1cblxuLy8gVGhlIG1lc3NhZ2UgY2hhbm5lbCB0ZWNobmlxdWUgd2FzIGRpc2NvdmVyZWQgYnkgTWFsdGUgVWJsIGFuZCB3YXMgdGhlXG4vLyBvcmlnaW5hbCBmb3VuZGF0aW9uIGZvciB0aGlzIGxpYnJhcnkuXG4vLyBodHRwOi8vd3d3Lm5vbmJsb2NraW5nLmlvLzIwMTEvMDYvd2luZG93bmV4dHRpY2suaHRtbFxuXG4vLyBTYWZhcmkgNi4wLjUgKGF0IGxlYXN0KSBpbnRlcm1pdHRlbnRseSBmYWlscyB0byBjcmVhdGUgbWVzc2FnZSBwb3J0cyBvbiBhXG4vLyBwYWdlJ3MgZmlyc3QgbG9hZC4gVGhhbmtmdWxseSwgdGhpcyB2ZXJzaW9uIG9mIFNhZmFyaSBzdXBwb3J0c1xuLy8gTXV0YXRpb25PYnNlcnZlcnMsIHNvIHdlIGRvbid0IG5lZWQgdG8gZmFsbCBiYWNrIGluIHRoYXQgY2FzZS5cblxuLy8gZnVuY3Rpb24gbWFrZVJlcXVlc3RDYWxsRnJvbU1lc3NhZ2VDaGFubmVsKGNhbGxiYWNrKSB7XG4vLyAgICAgdmFyIGNoYW5uZWwgPSBuZXcgTWVzc2FnZUNoYW5uZWwoKTtcbi8vICAgICBjaGFubmVsLnBvcnQxLm9ubWVzc2FnZSA9IGNhbGxiYWNrO1xuLy8gICAgIHJldHVybiBmdW5jdGlvbiByZXF1ZXN0Q2FsbCgpIHtcbi8vICAgICAgICAgY2hhbm5lbC5wb3J0Mi5wb3N0TWVzc2FnZSgwKTtcbi8vICAgICB9O1xuLy8gfVxuXG4vLyBGb3IgcmVhc29ucyBleHBsYWluZWQgYWJvdmUsIHdlIGFyZSBhbHNvIHVuYWJsZSB0byB1c2UgYHNldEltbWVkaWF0ZWBcbi8vIHVuZGVyIGFueSBjaXJjdW1zdGFuY2VzLlxuLy8gRXZlbiBpZiB3ZSB3ZXJlLCB0aGVyZSBpcyBhbm90aGVyIGJ1ZyBpbiBJbnRlcm5ldCBFeHBsb3JlciAxMC5cbi8vIEl0IGlzIG5vdCBzdWZmaWNpZW50IHRvIGFzc2lnbiBgc2V0SW1tZWRpYXRlYCB0byBgcmVxdWVzdEZsdXNoYCBiZWNhdXNlXG4vLyBgc2V0SW1tZWRpYXRlYCBtdXN0IGJlIGNhbGxlZCAqYnkgbmFtZSogYW5kIHRoZXJlZm9yZSBtdXN0IGJlIHdyYXBwZWQgaW4gYVxuLy8gY2xvc3VyZS5cbi8vIE5ldmVyIGZvcmdldC5cblxuLy8gZnVuY3Rpb24gbWFrZVJlcXVlc3RDYWxsRnJvbVNldEltbWVkaWF0ZShjYWxsYmFjaykge1xuLy8gICAgIHJldHVybiBmdW5jdGlvbiByZXF1ZXN0Q2FsbCgpIHtcbi8vICAgICAgICAgc2V0SW1tZWRpYXRlKGNhbGxiYWNrKTtcbi8vICAgICB9O1xuLy8gfVxuXG4vLyBTYWZhcmkgNi4wIGhhcyBhIHByb2JsZW0gd2hlcmUgdGltZXJzIHdpbGwgZ2V0IGxvc3Qgd2hpbGUgdGhlIHVzZXIgaXNcbi8vIHNjcm9sbGluZy4gVGhpcyBwcm9ibGVtIGRvZXMgbm90IGltcGFjdCBBU0FQIGJlY2F1c2UgU2FmYXJpIDYuMCBzdXBwb3J0c1xuLy8gbXV0YXRpb24gb2JzZXJ2ZXJzLCBzbyB0aGF0IGltcGxlbWVudGF0aW9uIGlzIHVzZWQgaW5zdGVhZC5cbi8vIEhvd2V2ZXIsIGlmIHdlIGV2ZXIgZWxlY3QgdG8gdXNlIHRpbWVycyBpbiBTYWZhcmksIHRoZSBwcmV2YWxlbnQgd29yay1hcm91bmRcbi8vIGlzIHRvIGFkZCBhIHNjcm9sbCBldmVudCBsaXN0ZW5lciB0aGF0IGNhbGxzIGZvciBhIGZsdXNoLlxuXG4vLyBgc2V0VGltZW91dGAgZG9lcyBub3QgY2FsbCB0aGUgcGFzc2VkIGNhbGxiYWNrIGlmIHRoZSBkZWxheSBpcyBsZXNzIHRoYW5cbi8vIGFwcHJveGltYXRlbHkgNyBpbiB3ZWIgd29ya2VycyBpbiBGaXJlZm94IDggdGhyb3VnaCAxOCwgYW5kIHNvbWV0aW1lcyBub3Rcbi8vIGV2ZW4gdGhlbi5cblxuZnVuY3Rpb24gbWFrZVJlcXVlc3RDYWxsRnJvbVRpbWVyKGNhbGxiYWNrKSB7XG4gICAgcmV0dXJuIGZ1bmN0aW9uIHJlcXVlc3RDYWxsKCkge1xuICAgICAgICAvLyBXZSBkaXNwYXRjaCBhIHRpbWVvdXQgd2l0aCBhIHNwZWNpZmllZCBkZWxheSBvZiAwIGZvciBlbmdpbmVzIHRoYXRcbiAgICAgICAgLy8gY2FuIHJlbGlhYmx5IGFjY29tbW9kYXRlIHRoYXQgcmVxdWVzdC4gVGhpcyB3aWxsIHVzdWFsbHkgYmUgc25hcHBlZFxuICAgICAgICAvLyB0byBhIDQgbWlsaXNlY29uZCBkZWxheSwgYnV0IG9uY2Ugd2UncmUgZmx1c2hpbmcsIHRoZXJlJ3Mgbm8gZGVsYXlcbiAgICAgICAgLy8gYmV0d2VlbiBldmVudHMuXG4gICAgICAgIHZhciB0aW1lb3V0SGFuZGxlID0gc2V0VGltZW91dChoYW5kbGVUaW1lciwgMCk7XG4gICAgICAgIC8vIEhvd2V2ZXIsIHNpbmNlIHRoaXMgdGltZXIgZ2V0cyBmcmVxdWVudGx5IGRyb3BwZWQgaW4gRmlyZWZveFxuICAgICAgICAvLyB3b3JrZXJzLCB3ZSBlbmxpc3QgYW4gaW50ZXJ2YWwgaGFuZGxlIHRoYXQgd2lsbCB0cnkgdG8gZmlyZVxuICAgICAgICAvLyBhbiBldmVudCAyMCB0aW1lcyBwZXIgc2Vjb25kIHVudGlsIGl0IHN1Y2NlZWRzLlxuICAgICAgICB2YXIgaW50ZXJ2YWxIYW5kbGUgPSBzZXRJbnRlcnZhbChoYW5kbGVUaW1lciwgNTApO1xuXG4gICAgICAgIGZ1bmN0aW9uIGhhbmRsZVRpbWVyKCkge1xuICAgICAgICAgICAgLy8gV2hpY2hldmVyIHRpbWVyIHN1Y2NlZWRzIHdpbGwgY2FuY2VsIGJvdGggdGltZXJzIGFuZFxuICAgICAgICAgICAgLy8gZXhlY3V0ZSB0aGUgY2FsbGJhY2suXG4gICAgICAgICAgICBjbGVhclRpbWVvdXQodGltZW91dEhhbmRsZSk7XG4gICAgICAgICAgICBjbGVhckludGVydmFsKGludGVydmFsSGFuZGxlKTtcbiAgICAgICAgICAgIGNhbGxiYWNrKCk7XG4gICAgICAgIH1cbiAgICB9O1xufVxuXG4vLyBUaGlzIGlzIGZvciBgYXNhcC5qc2Agb25seS5cbi8vIEl0cyBuYW1lIHdpbGwgYmUgcGVyaW9kaWNhbGx5IHJhbmRvbWl6ZWQgdG8gYnJlYWsgYW55IGNvZGUgdGhhdCBkZXBlbmRzIG9uXG4vLyBpdHMgZXhpc3RlbmNlLlxucmF3QXNhcC5tYWtlUmVxdWVzdENhbGxGcm9tVGltZXIgPSBtYWtlUmVxdWVzdENhbGxGcm9tVGltZXI7XG5cbi8vIEFTQVAgd2FzIG9yaWdpbmFsbHkgYSBuZXh0VGljayBzaGltIGluY2x1ZGVkIGluIFEuIFRoaXMgd2FzIGZhY3RvcmVkIG91dFxuLy8gaW50byB0aGlzIEFTQVAgcGFja2FnZS4gSXQgd2FzIGxhdGVyIGFkYXB0ZWQgdG8gUlNWUCB3aGljaCBtYWRlIGZ1cnRoZXJcbi8vIGFtZW5kbWVudHMuIFRoZXNlIGRlY2lzaW9ucywgcGFydGljdWxhcmx5IHRvIG1hcmdpbmFsaXplIE1lc3NhZ2VDaGFubmVsIGFuZFxuLy8gdG8gY2FwdHVyZSB0aGUgTXV0YXRpb25PYnNlcnZlciBpbXBsZW1lbnRhdGlvbiBpbiBhIGNsb3N1cmUsIHdlcmUgaW50ZWdyYXRlZFxuLy8gYmFjayBpbnRvIEFTQVAgcHJvcGVyLlxuLy8gaHR0cHM6Ly9naXRodWIuY29tL3RpbGRlaW8vcnN2cC5qcy9ibG9iL2NkZGY3MjMyNTQ2YTljZjg1ODUyNGI3NWNkZTZmOWVkZjcyNjIwYTcvbGliL3JzdnAvYXNhcC5qc1xuIiwiJ3VzZSBzdHJpY3QnXG5cbmV4cG9ydHMuYnl0ZUxlbmd0aCA9IGJ5dGVMZW5ndGhcbmV4cG9ydHMudG9CeXRlQXJyYXkgPSB0b0J5dGVBcnJheVxuZXhwb3J0cy5mcm9tQnl0ZUFycmF5ID0gZnJvbUJ5dGVBcnJheVxuXG52YXIgbG9va3VwID0gW11cbnZhciByZXZMb29rdXAgPSBbXVxudmFyIEFyciA9IHR5cGVvZiBVaW50OEFycmF5ICE9PSAndW5kZWZpbmVkJyA/IFVpbnQ4QXJyYXkgOiBBcnJheVxuXG52YXIgY29kZSA9ICdBQkNERUZHSElKS0xNTk9QUVJTVFVWV1hZWmFiY2RlZmdoaWprbG1ub3BxcnN0dXZ3eHl6MDEyMzQ1Njc4OSsvJ1xuZm9yICh2YXIgaSA9IDAsIGxlbiA9IGNvZGUubGVuZ3RoOyBpIDwgbGVuOyArK2kpIHtcbiAgbG9va3VwW2ldID0gY29kZVtpXVxuICByZXZMb29rdXBbY29kZS5jaGFyQ29kZUF0KGkpXSA9IGlcbn1cblxuLy8gU3VwcG9ydCBkZWNvZGluZyBVUkwtc2FmZSBiYXNlNjQgc3RyaW5ncywgYXMgTm9kZS5qcyBkb2VzLlxuLy8gU2VlOiBodHRwczovL2VuLndpa2lwZWRpYS5vcmcvd2lraS9CYXNlNjQjVVJMX2FwcGxpY2F0aW9uc1xucmV2TG9va3VwWyctJy5jaGFyQ29kZUF0KDApXSA9IDYyXG5yZXZMb29rdXBbJ18nLmNoYXJDb2RlQXQoMCldID0gNjNcblxuZnVuY3Rpb24gZ2V0TGVucyAoYjY0KSB7XG4gIHZhciBsZW4gPSBiNjQubGVuZ3RoXG5cbiAgaWYgKGxlbiAlIDQgPiAwKSB7XG4gICAgdGhyb3cgbmV3IEVycm9yKCdJbnZhbGlkIHN0cmluZy4gTGVuZ3RoIG11c3QgYmUgYSBtdWx0aXBsZSBvZiA0JylcbiAgfVxuXG4gIC8vIFRyaW0gb2ZmIGV4dHJhIGJ5dGVzIGFmdGVyIHBsYWNlaG9sZGVyIGJ5dGVzIGFyZSBmb3VuZFxuICAvLyBTZWU6IGh0dHBzOi8vZ2l0aHViLmNvbS9iZWF0Z2FtbWl0L2Jhc2U2NC1qcy9pc3N1ZXMvNDJcbiAgdmFyIHZhbGlkTGVuID0gYjY0LmluZGV4T2YoJz0nKVxuICBpZiAodmFsaWRMZW4gPT09IC0xKSB2YWxpZExlbiA9IGxlblxuXG4gIHZhciBwbGFjZUhvbGRlcnNMZW4gPSB2YWxpZExlbiA9PT0gbGVuXG4gICAgPyAwXG4gICAgOiA0IC0gKHZhbGlkTGVuICUgNClcblxuICByZXR1cm4gW3ZhbGlkTGVuLCBwbGFjZUhvbGRlcnNMZW5dXG59XG5cbi8vIGJhc2U2NCBpcyA0LzMgKyB1cCB0byB0d28gY2hhcmFjdGVycyBvZiB0aGUgb3JpZ2luYWwgZGF0YVxuZnVuY3Rpb24gYnl0ZUxlbmd0aCAoYjY0KSB7XG4gIHZhciBsZW5zID0gZ2V0TGVucyhiNjQpXG4gIHZhciB2YWxpZExlbiA9IGxlbnNbMF1cbiAgdmFyIHBsYWNlSG9sZGVyc0xlbiA9IGxlbnNbMV1cbiAgcmV0dXJuICgodmFsaWRMZW4gKyBwbGFjZUhvbGRlcnNMZW4pICogMyAvIDQpIC0gcGxhY2VIb2xkZXJzTGVuXG59XG5cbmZ1bmN0aW9uIF9ieXRlTGVuZ3RoIChiNjQsIHZhbGlkTGVuLCBwbGFjZUhvbGRlcnNMZW4pIHtcbiAgcmV0dXJuICgodmFsaWRMZW4gKyBwbGFjZUhvbGRlcnNMZW4pICogMyAvIDQpIC0gcGxhY2VIb2xkZXJzTGVuXG59XG5cbmZ1bmN0aW9uIHRvQnl0ZUFycmF5IChiNjQpIHtcbiAgdmFyIHRtcFxuICB2YXIgbGVucyA9IGdldExlbnMoYjY0KVxuICB2YXIgdmFsaWRMZW4gPSBsZW5zWzBdXG4gIHZhciBwbGFjZUhvbGRlcnNMZW4gPSBsZW5zWzFdXG5cbiAgdmFyIGFyciA9IG5ldyBBcnIoX2J5dGVMZW5ndGgoYjY0LCB2YWxpZExlbiwgcGxhY2VIb2xkZXJzTGVuKSlcblxuICB2YXIgY3VyQnl0ZSA9IDBcblxuICAvLyBpZiB0aGVyZSBhcmUgcGxhY2Vob2xkZXJzLCBvbmx5IGdldCB1cCB0byB0aGUgbGFzdCBjb21wbGV0ZSA0IGNoYXJzXG4gIHZhciBsZW4gPSBwbGFjZUhvbGRlcnNMZW4gPiAwXG4gICAgPyB2YWxpZExlbiAtIDRcbiAgICA6IHZhbGlkTGVuXG5cbiAgdmFyIGlcbiAgZm9yIChpID0gMDsgaSA8IGxlbjsgaSArPSA0KSB7XG4gICAgdG1wID1cbiAgICAgIChyZXZMb29rdXBbYjY0LmNoYXJDb2RlQXQoaSldIDw8IDE4KSB8XG4gICAgICAocmV2TG9va3VwW2I2NC5jaGFyQ29kZUF0KGkgKyAxKV0gPDwgMTIpIHxcbiAgICAgIChyZXZMb29rdXBbYjY0LmNoYXJDb2RlQXQoaSArIDIpXSA8PCA2KSB8XG4gICAgICByZXZMb29rdXBbYjY0LmNoYXJDb2RlQXQoaSArIDMpXVxuICAgIGFycltjdXJCeXRlKytdID0gKHRtcCA+PiAxNikgJiAweEZGXG4gICAgYXJyW2N1ckJ5dGUrK10gPSAodG1wID4+IDgpICYgMHhGRlxuICAgIGFycltjdXJCeXRlKytdID0gdG1wICYgMHhGRlxuICB9XG5cbiAgaWYgKHBsYWNlSG9sZGVyc0xlbiA9PT0gMikge1xuICAgIHRtcCA9XG4gICAgICAocmV2TG9va3VwW2I2NC5jaGFyQ29kZUF0KGkpXSA8PCAyKSB8XG4gICAgICAocmV2TG9va3VwW2I2NC5jaGFyQ29kZUF0KGkgKyAxKV0gPj4gNClcbiAgICBhcnJbY3VyQnl0ZSsrXSA9IHRtcCAmIDB4RkZcbiAgfVxuXG4gIGlmIChwbGFjZUhvbGRlcnNMZW4gPT09IDEpIHtcbiAgICB0bXAgPVxuICAgICAgKHJldkxvb2t1cFtiNjQuY2hhckNvZGVBdChpKV0gPDwgMTApIHxcbiAgICAgIChyZXZMb29rdXBbYjY0LmNoYXJDb2RlQXQoaSArIDEpXSA8PCA0KSB8XG4gICAgICAocmV2TG9va3VwW2I2NC5jaGFyQ29kZUF0KGkgKyAyKV0gPj4gMilcbiAgICBhcnJbY3VyQnl0ZSsrXSA9ICh0bXAgPj4gOCkgJiAweEZGXG4gICAgYXJyW2N1ckJ5dGUrK10gPSB0bXAgJiAweEZGXG4gIH1cblxuICByZXR1cm4gYXJyXG59XG5cbmZ1bmN0aW9uIHRyaXBsZXRUb0Jhc2U2NCAobnVtKSB7XG4gIHJldHVybiBsb29rdXBbbnVtID4+IDE4ICYgMHgzRl0gK1xuICAgIGxvb2t1cFtudW0gPj4gMTIgJiAweDNGXSArXG4gICAgbG9va3VwW251bSA+PiA2ICYgMHgzRl0gK1xuICAgIGxvb2t1cFtudW0gJiAweDNGXVxufVxuXG5mdW5jdGlvbiBlbmNvZGVDaHVuayAodWludDgsIHN0YXJ0LCBlbmQpIHtcbiAgdmFyIHRtcFxuICB2YXIgb3V0cHV0ID0gW11cbiAgZm9yICh2YXIgaSA9IHN0YXJ0OyBpIDwgZW5kOyBpICs9IDMpIHtcbiAgICB0bXAgPVxuICAgICAgKCh1aW50OFtpXSA8PCAxNikgJiAweEZGMDAwMCkgK1xuICAgICAgKCh1aW50OFtpICsgMV0gPDwgOCkgJiAweEZGMDApICtcbiAgICAgICh1aW50OFtpICsgMl0gJiAweEZGKVxuICAgIG91dHB1dC5wdXNoKHRyaXBsZXRUb0Jhc2U2NCh0bXApKVxuICB9XG4gIHJldHVybiBvdXRwdXQuam9pbignJylcbn1cblxuZnVuY3Rpb24gZnJvbUJ5dGVBcnJheSAodWludDgpIHtcbiAgdmFyIHRtcFxuICB2YXIgbGVuID0gdWludDgubGVuZ3RoXG4gIHZhciBleHRyYUJ5dGVzID0gbGVuICUgMyAvLyBpZiB3ZSBoYXZlIDEgYnl0ZSBsZWZ0LCBwYWQgMiBieXRlc1xuICB2YXIgcGFydHMgPSBbXVxuICB2YXIgbWF4Q2h1bmtMZW5ndGggPSAxNjM4MyAvLyBtdXN0IGJlIG11bHRpcGxlIG9mIDNcblxuICAvLyBnbyB0aHJvdWdoIHRoZSBhcnJheSBldmVyeSB0aHJlZSBieXRlcywgd2UnbGwgZGVhbCB3aXRoIHRyYWlsaW5nIHN0dWZmIGxhdGVyXG4gIGZvciAodmFyIGkgPSAwLCBsZW4yID0gbGVuIC0gZXh0cmFCeXRlczsgaSA8IGxlbjI7IGkgKz0gbWF4Q2h1bmtMZW5ndGgpIHtcbiAgICBwYXJ0cy5wdXNoKGVuY29kZUNodW5rKFxuICAgICAgdWludDgsIGksIChpICsgbWF4Q2h1bmtMZW5ndGgpID4gbGVuMiA/IGxlbjIgOiAoaSArIG1heENodW5rTGVuZ3RoKVxuICAgICkpXG4gIH1cblxuICAvLyBwYWQgdGhlIGVuZCB3aXRoIHplcm9zLCBidXQgbWFrZSBzdXJlIHRvIG5vdCBmb3JnZXQgdGhlIGV4dHJhIGJ5dGVzXG4gIGlmIChleHRyYUJ5dGVzID09PSAxKSB7XG4gICAgdG1wID0gdWludDhbbGVuIC0gMV1cbiAgICBwYXJ0cy5wdXNoKFxuICAgICAgbG9va3VwW3RtcCA+PiAyXSArXG4gICAgICBsb29rdXBbKHRtcCA8PCA0KSAmIDB4M0ZdICtcbiAgICAgICc9PSdcbiAgICApXG4gIH0gZWxzZSBpZiAoZXh0cmFCeXRlcyA9PT0gMikge1xuICAgIHRtcCA9ICh1aW50OFtsZW4gLSAyXSA8PCA4KSArIHVpbnQ4W2xlbiAtIDFdXG4gICAgcGFydHMucHVzaChcbiAgICAgIGxvb2t1cFt0bXAgPj4gMTBdICtcbiAgICAgIGxvb2t1cFsodG1wID4+IDQpICYgMHgzRl0gK1xuICAgICAgbG9va3VwWyh0bXAgPDwgMikgJiAweDNGXSArXG4gICAgICAnPSdcbiAgICApXG4gIH1cblxuICByZXR1cm4gcGFydHMuam9pbignJylcbn1cbiIsIi8qIVxuICogVGhlIGJ1ZmZlciBtb2R1bGUgZnJvbSBub2RlLmpzLCBmb3IgdGhlIGJyb3dzZXIuXG4gKlxuICogQGF1dGhvciAgIEZlcm9zcyBBYm91a2hhZGlqZWggPGh0dHBzOi8vZmVyb3NzLm9yZz5cbiAqIEBsaWNlbnNlICBNSVRcbiAqL1xuLyogZXNsaW50LWRpc2FibGUgbm8tcHJvdG8gKi9cblxuJ3VzZSBzdHJpY3QnXG5cbnZhciBiYXNlNjQgPSByZXF1aXJlKCdiYXNlNjQtanMnKVxudmFyIGllZWU3NTQgPSByZXF1aXJlKCdpZWVlNzU0JylcbnZhciBjdXN0b21JbnNwZWN0U3ltYm9sID1cbiAgKHR5cGVvZiBTeW1ib2wgPT09ICdmdW5jdGlvbicgJiYgdHlwZW9mIFN5bWJvbC5mb3IgPT09ICdmdW5jdGlvbicpXG4gICAgPyBTeW1ib2wuZm9yKCdub2RlanMudXRpbC5pbnNwZWN0LmN1c3RvbScpXG4gICAgOiBudWxsXG5cbmV4cG9ydHMuQnVmZmVyID0gQnVmZmVyXG5leHBvcnRzLlNsb3dCdWZmZXIgPSBTbG93QnVmZmVyXG5leHBvcnRzLklOU1BFQ1RfTUFYX0JZVEVTID0gNTBcblxudmFyIEtfTUFYX0xFTkdUSCA9IDB4N2ZmZmZmZmZcbmV4cG9ydHMua01heExlbmd0aCA9IEtfTUFYX0xFTkdUSFxuXG4vKipcbiAqIElmIGBCdWZmZXIuVFlQRURfQVJSQVlfU1VQUE9SVGA6XG4gKiAgID09PSB0cnVlICAgIFVzZSBVaW50OEFycmF5IGltcGxlbWVudGF0aW9uIChmYXN0ZXN0KVxuICogICA9PT0gZmFsc2UgICBQcmludCB3YXJuaW5nIGFuZCByZWNvbW1lbmQgdXNpbmcgYGJ1ZmZlcmAgdjQueCB3aGljaCBoYXMgYW4gT2JqZWN0XG4gKiAgICAgICAgICAgICAgIGltcGxlbWVudGF0aW9uIChtb3N0IGNvbXBhdGlibGUsIGV2ZW4gSUU2KVxuICpcbiAqIEJyb3dzZXJzIHRoYXQgc3VwcG9ydCB0eXBlZCBhcnJheXMgYXJlIElFIDEwKywgRmlyZWZveCA0KywgQ2hyb21lIDcrLCBTYWZhcmkgNS4xKyxcbiAqIE9wZXJhIDExLjYrLCBpT1MgNC4yKy5cbiAqXG4gKiBXZSByZXBvcnQgdGhhdCB0aGUgYnJvd3NlciBkb2VzIG5vdCBzdXBwb3J0IHR5cGVkIGFycmF5cyBpZiB0aGUgYXJlIG5vdCBzdWJjbGFzc2FibGVcbiAqIHVzaW5nIF9fcHJvdG9fXy4gRmlyZWZveCA0LTI5IGxhY2tzIHN1cHBvcnQgZm9yIGFkZGluZyBuZXcgcHJvcGVydGllcyB0byBgVWludDhBcnJheWBcbiAqIChTZWU6IGh0dHBzOi8vYnVnemlsbGEubW96aWxsYS5vcmcvc2hvd19idWcuY2dpP2lkPTY5NTQzOCkuIElFIDEwIGxhY2tzIHN1cHBvcnRcbiAqIGZvciBfX3Byb3RvX18gYW5kIGhhcyBhIGJ1Z2d5IHR5cGVkIGFycmF5IGltcGxlbWVudGF0aW9uLlxuICovXG5CdWZmZXIuVFlQRURfQVJSQVlfU1VQUE9SVCA9IHR5cGVkQXJyYXlTdXBwb3J0KClcblxuaWYgKCFCdWZmZXIuVFlQRURfQVJSQVlfU1VQUE9SVCAmJiB0eXBlb2YgY29uc29sZSAhPT0gJ3VuZGVmaW5lZCcgJiZcbiAgICB0eXBlb2YgY29uc29sZS5lcnJvciA9PT0gJ2Z1bmN0aW9uJykge1xuICBjb25zb2xlLmVycm9yKFxuICAgICdUaGlzIGJyb3dzZXIgbGFja3MgdHlwZWQgYXJyYXkgKFVpbnQ4QXJyYXkpIHN1cHBvcnQgd2hpY2ggaXMgcmVxdWlyZWQgYnkgJyArXG4gICAgJ2BidWZmZXJgIHY1LnguIFVzZSBgYnVmZmVyYCB2NC54IGlmIHlvdSByZXF1aXJlIG9sZCBicm93c2VyIHN1cHBvcnQuJ1xuICApXG59XG5cbmZ1bmN0aW9uIHR5cGVkQXJyYXlTdXBwb3J0ICgpIHtcbiAgLy8gQ2FuIHR5cGVkIGFycmF5IGluc3RhbmNlcyBjYW4gYmUgYXVnbWVudGVkP1xuICB0cnkge1xuICAgIHZhciBhcnIgPSBuZXcgVWludDhBcnJheSgxKVxuICAgIHZhciBwcm90byA9IHsgZm9vOiBmdW5jdGlvbiAoKSB7IHJldHVybiA0MiB9IH1cbiAgICBPYmplY3Quc2V0UHJvdG90eXBlT2YocHJvdG8sIFVpbnQ4QXJyYXkucHJvdG90eXBlKVxuICAgIE9iamVjdC5zZXRQcm90b3R5cGVPZihhcnIsIHByb3RvKVxuICAgIHJldHVybiBhcnIuZm9vKCkgPT09IDQyXG4gIH0gY2F0Y2ggKGUpIHtcbiAgICByZXR1cm4gZmFsc2VcbiAgfVxufVxuXG5PYmplY3QuZGVmaW5lUHJvcGVydHkoQnVmZmVyLnByb3RvdHlwZSwgJ3BhcmVudCcsIHtcbiAgZW51bWVyYWJsZTogdHJ1ZSxcbiAgZ2V0OiBmdW5jdGlvbiAoKSB7XG4gICAgaWYgKCFCdWZmZXIuaXNCdWZmZXIodGhpcykpIHJldHVybiB1bmRlZmluZWRcbiAgICByZXR1cm4gdGhpcy5idWZmZXJcbiAgfVxufSlcblxuT2JqZWN0LmRlZmluZVByb3BlcnR5KEJ1ZmZlci5wcm90b3R5cGUsICdvZmZzZXQnLCB7XG4gIGVudW1lcmFibGU6IHRydWUsXG4gIGdldDogZnVuY3Rpb24gKCkge1xuICAgIGlmICghQnVmZmVyLmlzQnVmZmVyKHRoaXMpKSByZXR1cm4gdW5kZWZpbmVkXG4gICAgcmV0dXJuIHRoaXMuYnl0ZU9mZnNldFxuICB9XG59KVxuXG5mdW5jdGlvbiBjcmVhdGVCdWZmZXIgKGxlbmd0aCkge1xuICBpZiAobGVuZ3RoID4gS19NQVhfTEVOR1RIKSB7XG4gICAgdGhyb3cgbmV3IFJhbmdlRXJyb3IoJ1RoZSB2YWx1ZSBcIicgKyBsZW5ndGggKyAnXCIgaXMgaW52YWxpZCBmb3Igb3B0aW9uIFwic2l6ZVwiJylcbiAgfVxuICAvLyBSZXR1cm4gYW4gYXVnbWVudGVkIGBVaW50OEFycmF5YCBpbnN0YW5jZVxuICB2YXIgYnVmID0gbmV3IFVpbnQ4QXJyYXkobGVuZ3RoKVxuICBPYmplY3Quc2V0UHJvdG90eXBlT2YoYnVmLCBCdWZmZXIucHJvdG90eXBlKVxuICByZXR1cm4gYnVmXG59XG5cbi8qKlxuICogVGhlIEJ1ZmZlciBjb25zdHJ1Y3RvciByZXR1cm5zIGluc3RhbmNlcyBvZiBgVWludDhBcnJheWAgdGhhdCBoYXZlIHRoZWlyXG4gKiBwcm90b3R5cGUgY2hhbmdlZCB0byBgQnVmZmVyLnByb3RvdHlwZWAuIEZ1cnRoZXJtb3JlLCBgQnVmZmVyYCBpcyBhIHN1YmNsYXNzIG9mXG4gKiBgVWludDhBcnJheWAsIHNvIHRoZSByZXR1cm5lZCBpbnN0YW5jZXMgd2lsbCBoYXZlIGFsbCB0aGUgbm9kZSBgQnVmZmVyYCBtZXRob2RzXG4gKiBhbmQgdGhlIGBVaW50OEFycmF5YCBtZXRob2RzLiBTcXVhcmUgYnJhY2tldCBub3RhdGlvbiB3b3JrcyBhcyBleHBlY3RlZCAtLSBpdFxuICogcmV0dXJucyBhIHNpbmdsZSBvY3RldC5cbiAqXG4gKiBUaGUgYFVpbnQ4QXJyYXlgIHByb3RvdHlwZSByZW1haW5zIHVubW9kaWZpZWQuXG4gKi9cblxuZnVuY3Rpb24gQnVmZmVyIChhcmcsIGVuY29kaW5nT3JPZmZzZXQsIGxlbmd0aCkge1xuICAvLyBDb21tb24gY2FzZS5cbiAgaWYgKHR5cGVvZiBhcmcgPT09ICdudW1iZXInKSB7XG4gICAgaWYgKHR5cGVvZiBlbmNvZGluZ09yT2Zmc2V0ID09PSAnc3RyaW5nJykge1xuICAgICAgdGhyb3cgbmV3IFR5cGVFcnJvcihcbiAgICAgICAgJ1RoZSBcInN0cmluZ1wiIGFyZ3VtZW50IG11c3QgYmUgb2YgdHlwZSBzdHJpbmcuIFJlY2VpdmVkIHR5cGUgbnVtYmVyJ1xuICAgICAgKVxuICAgIH1cbiAgICByZXR1cm4gYWxsb2NVbnNhZmUoYXJnKVxuICB9XG4gIHJldHVybiBmcm9tKGFyZywgZW5jb2RpbmdPck9mZnNldCwgbGVuZ3RoKVxufVxuXG4vLyBGaXggc3ViYXJyYXkoKSBpbiBFUzIwMTYuIFNlZTogaHR0cHM6Ly9naXRodWIuY29tL2Zlcm9zcy9idWZmZXIvcHVsbC85N1xuaWYgKHR5cGVvZiBTeW1ib2wgIT09ICd1bmRlZmluZWQnICYmIFN5bWJvbC5zcGVjaWVzICE9IG51bGwgJiZcbiAgICBCdWZmZXJbU3ltYm9sLnNwZWNpZXNdID09PSBCdWZmZXIpIHtcbiAgT2JqZWN0LmRlZmluZVByb3BlcnR5KEJ1ZmZlciwgU3ltYm9sLnNwZWNpZXMsIHtcbiAgICB2YWx1ZTogbnVsbCxcbiAgICBjb25maWd1cmFibGU6IHRydWUsXG4gICAgZW51bWVyYWJsZTogZmFsc2UsXG4gICAgd3JpdGFibGU6IGZhbHNlXG4gIH0pXG59XG5cbkJ1ZmZlci5wb29sU2l6ZSA9IDgxOTIgLy8gbm90IHVzZWQgYnkgdGhpcyBpbXBsZW1lbnRhdGlvblxuXG5mdW5jdGlvbiBmcm9tICh2YWx1ZSwgZW5jb2RpbmdPck9mZnNldCwgbGVuZ3RoKSB7XG4gIGlmICh0eXBlb2YgdmFsdWUgPT09ICdzdHJpbmcnKSB7XG4gICAgcmV0dXJuIGZyb21TdHJpbmcodmFsdWUsIGVuY29kaW5nT3JPZmZzZXQpXG4gIH1cblxuICBpZiAoQXJyYXlCdWZmZXIuaXNWaWV3KHZhbHVlKSkge1xuICAgIHJldHVybiBmcm9tQXJyYXlMaWtlKHZhbHVlKVxuICB9XG5cbiAgaWYgKHZhbHVlID09IG51bGwpIHtcbiAgICB0aHJvdyBuZXcgVHlwZUVycm9yKFxuICAgICAgJ1RoZSBmaXJzdCBhcmd1bWVudCBtdXN0IGJlIG9uZSBvZiB0eXBlIHN0cmluZywgQnVmZmVyLCBBcnJheUJ1ZmZlciwgQXJyYXksICcgK1xuICAgICAgJ29yIEFycmF5LWxpa2UgT2JqZWN0LiBSZWNlaXZlZCB0eXBlICcgKyAodHlwZW9mIHZhbHVlKVxuICAgIClcbiAgfVxuXG4gIGlmIChpc0luc3RhbmNlKHZhbHVlLCBBcnJheUJ1ZmZlcikgfHxcbiAgICAgICh2YWx1ZSAmJiBpc0luc3RhbmNlKHZhbHVlLmJ1ZmZlciwgQXJyYXlCdWZmZXIpKSkge1xuICAgIHJldHVybiBmcm9tQXJyYXlCdWZmZXIodmFsdWUsIGVuY29kaW5nT3JPZmZzZXQsIGxlbmd0aClcbiAgfVxuXG4gIGlmICh0eXBlb2YgdmFsdWUgPT09ICdudW1iZXInKSB7XG4gICAgdGhyb3cgbmV3IFR5cGVFcnJvcihcbiAgICAgICdUaGUgXCJ2YWx1ZVwiIGFyZ3VtZW50IG11c3Qgbm90IGJlIG9mIHR5cGUgbnVtYmVyLiBSZWNlaXZlZCB0eXBlIG51bWJlcidcbiAgICApXG4gIH1cblxuICB2YXIgdmFsdWVPZiA9IHZhbHVlLnZhbHVlT2YgJiYgdmFsdWUudmFsdWVPZigpXG4gIGlmICh2YWx1ZU9mICE9IG51bGwgJiYgdmFsdWVPZiAhPT0gdmFsdWUpIHtcbiAgICByZXR1cm4gQnVmZmVyLmZyb20odmFsdWVPZiwgZW5jb2RpbmdPck9mZnNldCwgbGVuZ3RoKVxuICB9XG5cbiAgdmFyIGIgPSBmcm9tT2JqZWN0KHZhbHVlKVxuICBpZiAoYikgcmV0dXJuIGJcblxuICBpZiAodHlwZW9mIFN5bWJvbCAhPT0gJ3VuZGVmaW5lZCcgJiYgU3ltYm9sLnRvUHJpbWl0aXZlICE9IG51bGwgJiZcbiAgICAgIHR5cGVvZiB2YWx1ZVtTeW1ib2wudG9QcmltaXRpdmVdID09PSAnZnVuY3Rpb24nKSB7XG4gICAgcmV0dXJuIEJ1ZmZlci5mcm9tKFxuICAgICAgdmFsdWVbU3ltYm9sLnRvUHJpbWl0aXZlXSgnc3RyaW5nJyksIGVuY29kaW5nT3JPZmZzZXQsIGxlbmd0aFxuICAgIClcbiAgfVxuXG4gIHRocm93IG5ldyBUeXBlRXJyb3IoXG4gICAgJ1RoZSBmaXJzdCBhcmd1bWVudCBtdXN0IGJlIG9uZSBvZiB0eXBlIHN0cmluZywgQnVmZmVyLCBBcnJheUJ1ZmZlciwgQXJyYXksICcgK1xuICAgICdvciBBcnJheS1saWtlIE9iamVjdC4gUmVjZWl2ZWQgdHlwZSAnICsgKHR5cGVvZiB2YWx1ZSlcbiAgKVxufVxuXG4vKipcbiAqIEZ1bmN0aW9uYWxseSBlcXVpdmFsZW50IHRvIEJ1ZmZlcihhcmcsIGVuY29kaW5nKSBidXQgdGhyb3dzIGEgVHlwZUVycm9yXG4gKiBpZiB2YWx1ZSBpcyBhIG51bWJlci5cbiAqIEJ1ZmZlci5mcm9tKHN0clssIGVuY29kaW5nXSlcbiAqIEJ1ZmZlci5mcm9tKGFycmF5KVxuICogQnVmZmVyLmZyb20oYnVmZmVyKVxuICogQnVmZmVyLmZyb20oYXJyYXlCdWZmZXJbLCBieXRlT2Zmc2V0WywgbGVuZ3RoXV0pXG4gKiovXG5CdWZmZXIuZnJvbSA9IGZ1bmN0aW9uICh2YWx1ZSwgZW5jb2RpbmdPck9mZnNldCwgbGVuZ3RoKSB7XG4gIHJldHVybiBmcm9tKHZhbHVlLCBlbmNvZGluZ09yT2Zmc2V0LCBsZW5ndGgpXG59XG5cbi8vIE5vdGU6IENoYW5nZSBwcm90b3R5cGUgKmFmdGVyKiBCdWZmZXIuZnJvbSBpcyBkZWZpbmVkIHRvIHdvcmthcm91bmQgQ2hyb21lIGJ1Zzpcbi8vIGh0dHBzOi8vZ2l0aHViLmNvbS9mZXJvc3MvYnVmZmVyL3B1bGwvMTQ4XG5PYmplY3Quc2V0UHJvdG90eXBlT2YoQnVmZmVyLnByb3RvdHlwZSwgVWludDhBcnJheS5wcm90b3R5cGUpXG5PYmplY3Quc2V0UHJvdG90eXBlT2YoQnVmZmVyLCBVaW50OEFycmF5KVxuXG5mdW5jdGlvbiBhc3NlcnRTaXplIChzaXplKSB7XG4gIGlmICh0eXBlb2Ygc2l6ZSAhPT0gJ251bWJlcicpIHtcbiAgICB0aHJvdyBuZXcgVHlwZUVycm9yKCdcInNpemVcIiBhcmd1bWVudCBtdXN0IGJlIG9mIHR5cGUgbnVtYmVyJylcbiAgfSBlbHNlIGlmIChzaXplIDwgMCkge1xuICAgIHRocm93IG5ldyBSYW5nZUVycm9yKCdUaGUgdmFsdWUgXCInICsgc2l6ZSArICdcIiBpcyBpbnZhbGlkIGZvciBvcHRpb24gXCJzaXplXCInKVxuICB9XG59XG5cbmZ1bmN0aW9uIGFsbG9jIChzaXplLCBmaWxsLCBlbmNvZGluZykge1xuICBhc3NlcnRTaXplKHNpemUpXG4gIGlmIChzaXplIDw9IDApIHtcbiAgICByZXR1cm4gY3JlYXRlQnVmZmVyKHNpemUpXG4gIH1cbiAgaWYgKGZpbGwgIT09IHVuZGVmaW5lZCkge1xuICAgIC8vIE9ubHkgcGF5IGF0dGVudGlvbiB0byBlbmNvZGluZyBpZiBpdCdzIGEgc3RyaW5nLiBUaGlzXG4gICAgLy8gcHJldmVudHMgYWNjaWRlbnRhbGx5IHNlbmRpbmcgaW4gYSBudW1iZXIgdGhhdCB3b3VsZFxuICAgIC8vIGJlIGludGVycHJldHRlZCBhcyBhIHN0YXJ0IG9mZnNldC5cbiAgICByZXR1cm4gdHlwZW9mIGVuY29kaW5nID09PSAnc3RyaW5nJ1xuICAgICAgPyBjcmVhdGVCdWZmZXIoc2l6ZSkuZmlsbChmaWxsLCBlbmNvZGluZylcbiAgICAgIDogY3JlYXRlQnVmZmVyKHNpemUpLmZpbGwoZmlsbClcbiAgfVxuICByZXR1cm4gY3JlYXRlQnVmZmVyKHNpemUpXG59XG5cbi8qKlxuICogQ3JlYXRlcyBhIG5ldyBmaWxsZWQgQnVmZmVyIGluc3RhbmNlLlxuICogYWxsb2Moc2l6ZVssIGZpbGxbLCBlbmNvZGluZ11dKVxuICoqL1xuQnVmZmVyLmFsbG9jID0gZnVuY3Rpb24gKHNpemUsIGZpbGwsIGVuY29kaW5nKSB7XG4gIHJldHVybiBhbGxvYyhzaXplLCBmaWxsLCBlbmNvZGluZylcbn1cblxuZnVuY3Rpb24gYWxsb2NVbnNhZmUgKHNpemUpIHtcbiAgYXNzZXJ0U2l6ZShzaXplKVxuICByZXR1cm4gY3JlYXRlQnVmZmVyKHNpemUgPCAwID8gMCA6IGNoZWNrZWQoc2l6ZSkgfCAwKVxufVxuXG4vKipcbiAqIEVxdWl2YWxlbnQgdG8gQnVmZmVyKG51bSksIGJ5IGRlZmF1bHQgY3JlYXRlcyBhIG5vbi16ZXJvLWZpbGxlZCBCdWZmZXIgaW5zdGFuY2UuXG4gKiAqL1xuQnVmZmVyLmFsbG9jVW5zYWZlID0gZnVuY3Rpb24gKHNpemUpIHtcbiAgcmV0dXJuIGFsbG9jVW5zYWZlKHNpemUpXG59XG4vKipcbiAqIEVxdWl2YWxlbnQgdG8gU2xvd0J1ZmZlcihudW0pLCBieSBkZWZhdWx0IGNyZWF0ZXMgYSBub24temVyby1maWxsZWQgQnVmZmVyIGluc3RhbmNlLlxuICovXG5CdWZmZXIuYWxsb2NVbnNhZmVTbG93ID0gZnVuY3Rpb24gKHNpemUpIHtcbiAgcmV0dXJuIGFsbG9jVW5zYWZlKHNpemUpXG59XG5cbmZ1bmN0aW9uIGZyb21TdHJpbmcgKHN0cmluZywgZW5jb2RpbmcpIHtcbiAgaWYgKHR5cGVvZiBlbmNvZGluZyAhPT0gJ3N0cmluZycgfHwgZW5jb2RpbmcgPT09ICcnKSB7XG4gICAgZW5jb2RpbmcgPSAndXRmOCdcbiAgfVxuXG4gIGlmICghQnVmZmVyLmlzRW5jb2RpbmcoZW5jb2RpbmcpKSB7XG4gICAgdGhyb3cgbmV3IFR5cGVFcnJvcignVW5rbm93biBlbmNvZGluZzogJyArIGVuY29kaW5nKVxuICB9XG5cbiAgdmFyIGxlbmd0aCA9IGJ5dGVMZW5ndGgoc3RyaW5nLCBlbmNvZGluZykgfCAwXG4gIHZhciBidWYgPSBjcmVhdGVCdWZmZXIobGVuZ3RoKVxuXG4gIHZhciBhY3R1YWwgPSBidWYud3JpdGUoc3RyaW5nLCBlbmNvZGluZylcblxuICBpZiAoYWN0dWFsICE9PSBsZW5ndGgpIHtcbiAgICAvLyBXcml0aW5nIGEgaGV4IHN0cmluZywgZm9yIGV4YW1wbGUsIHRoYXQgY29udGFpbnMgaW52YWxpZCBjaGFyYWN0ZXJzIHdpbGxcbiAgICAvLyBjYXVzZSBldmVyeXRoaW5nIGFmdGVyIHRoZSBmaXJzdCBpbnZhbGlkIGNoYXJhY3RlciB0byBiZSBpZ25vcmVkLiAoZS5nLlxuICAgIC8vICdhYnh4Y2QnIHdpbGwgYmUgdHJlYXRlZCBhcyAnYWInKVxuICAgIGJ1ZiA9IGJ1Zi5zbGljZSgwLCBhY3R1YWwpXG4gIH1cblxuICByZXR1cm4gYnVmXG59XG5cbmZ1bmN0aW9uIGZyb21BcnJheUxpa2UgKGFycmF5KSB7XG4gIHZhciBsZW5ndGggPSBhcnJheS5sZW5ndGggPCAwID8gMCA6IGNoZWNrZWQoYXJyYXkubGVuZ3RoKSB8IDBcbiAgdmFyIGJ1ZiA9IGNyZWF0ZUJ1ZmZlcihsZW5ndGgpXG4gIGZvciAodmFyIGkgPSAwOyBpIDwgbGVuZ3RoOyBpICs9IDEpIHtcbiAgICBidWZbaV0gPSBhcnJheVtpXSAmIDI1NVxuICB9XG4gIHJldHVybiBidWZcbn1cblxuZnVuY3Rpb24gZnJvbUFycmF5QnVmZmVyIChhcnJheSwgYnl0ZU9mZnNldCwgbGVuZ3RoKSB7XG4gIGlmIChieXRlT2Zmc2V0IDwgMCB8fCBhcnJheS5ieXRlTGVuZ3RoIDwgYnl0ZU9mZnNldCkge1xuICAgIHRocm93IG5ldyBSYW5nZUVycm9yKCdcIm9mZnNldFwiIGlzIG91dHNpZGUgb2YgYnVmZmVyIGJvdW5kcycpXG4gIH1cblxuICBpZiAoYXJyYXkuYnl0ZUxlbmd0aCA8IGJ5dGVPZmZzZXQgKyAobGVuZ3RoIHx8IDApKSB7XG4gICAgdGhyb3cgbmV3IFJhbmdlRXJyb3IoJ1wibGVuZ3RoXCIgaXMgb3V0c2lkZSBvZiBidWZmZXIgYm91bmRzJylcbiAgfVxuXG4gIHZhciBidWZcbiAgaWYgKGJ5dGVPZmZzZXQgPT09IHVuZGVmaW5lZCAmJiBsZW5ndGggPT09IHVuZGVmaW5lZCkge1xuICAgIGJ1ZiA9IG5ldyBVaW50OEFycmF5KGFycmF5KVxuICB9IGVsc2UgaWYgKGxlbmd0aCA9PT0gdW5kZWZpbmVkKSB7XG4gICAgYnVmID0gbmV3IFVpbnQ4QXJyYXkoYXJyYXksIGJ5dGVPZmZzZXQpXG4gIH0gZWxzZSB7XG4gICAgYnVmID0gbmV3IFVpbnQ4QXJyYXkoYXJyYXksIGJ5dGVPZmZzZXQsIGxlbmd0aClcbiAgfVxuXG4gIC8vIFJldHVybiBhbiBhdWdtZW50ZWQgYFVpbnQ4QXJyYXlgIGluc3RhbmNlXG4gIE9iamVjdC5zZXRQcm90b3R5cGVPZihidWYsIEJ1ZmZlci5wcm90b3R5cGUpXG5cbiAgcmV0dXJuIGJ1ZlxufVxuXG5mdW5jdGlvbiBmcm9tT2JqZWN0IChvYmopIHtcbiAgaWYgKEJ1ZmZlci5pc0J1ZmZlcihvYmopKSB7XG4gICAgdmFyIGxlbiA9IGNoZWNrZWQob2JqLmxlbmd0aCkgfCAwXG4gICAgdmFyIGJ1ZiA9IGNyZWF0ZUJ1ZmZlcihsZW4pXG5cbiAgICBpZiAoYnVmLmxlbmd0aCA9PT0gMCkge1xuICAgICAgcmV0dXJuIGJ1ZlxuICAgIH1cblxuICAgIG9iai5jb3B5KGJ1ZiwgMCwgMCwgbGVuKVxuICAgIHJldHVybiBidWZcbiAgfVxuXG4gIGlmIChvYmoubGVuZ3RoICE9PSB1bmRlZmluZWQpIHtcbiAgICBpZiAodHlwZW9mIG9iai5sZW5ndGggIT09ICdudW1iZXInIHx8IG51bWJlcklzTmFOKG9iai5sZW5ndGgpKSB7XG4gICAgICByZXR1cm4gY3JlYXRlQnVmZmVyKDApXG4gICAgfVxuICAgIHJldHVybiBmcm9tQXJyYXlMaWtlKG9iailcbiAgfVxuXG4gIGlmIChvYmoudHlwZSA9PT0gJ0J1ZmZlcicgJiYgQXJyYXkuaXNBcnJheShvYmouZGF0YSkpIHtcbiAgICByZXR1cm4gZnJvbUFycmF5TGlrZShvYmouZGF0YSlcbiAgfVxufVxuXG5mdW5jdGlvbiBjaGVja2VkIChsZW5ndGgpIHtcbiAgLy8gTm90ZTogY2Fubm90IHVzZSBgbGVuZ3RoIDwgS19NQVhfTEVOR1RIYCBoZXJlIGJlY2F1c2UgdGhhdCBmYWlscyB3aGVuXG4gIC8vIGxlbmd0aCBpcyBOYU4gKHdoaWNoIGlzIG90aGVyd2lzZSBjb2VyY2VkIHRvIHplcm8uKVxuICBpZiAobGVuZ3RoID49IEtfTUFYX0xFTkdUSCkge1xuICAgIHRocm93IG5ldyBSYW5nZUVycm9yKCdBdHRlbXB0IHRvIGFsbG9jYXRlIEJ1ZmZlciBsYXJnZXIgdGhhbiBtYXhpbXVtICcgK1xuICAgICAgICAgICAgICAgICAgICAgICAgICdzaXplOiAweCcgKyBLX01BWF9MRU5HVEgudG9TdHJpbmcoMTYpICsgJyBieXRlcycpXG4gIH1cbiAgcmV0dXJuIGxlbmd0aCB8IDBcbn1cblxuZnVuY3Rpb24gU2xvd0J1ZmZlciAobGVuZ3RoKSB7XG4gIGlmICgrbGVuZ3RoICE9IGxlbmd0aCkgeyAvLyBlc2xpbnQtZGlzYWJsZS1saW5lIGVxZXFlcVxuICAgIGxlbmd0aCA9IDBcbiAgfVxuICByZXR1cm4gQnVmZmVyLmFsbG9jKCtsZW5ndGgpXG59XG5cbkJ1ZmZlci5pc0J1ZmZlciA9IGZ1bmN0aW9uIGlzQnVmZmVyIChiKSB7XG4gIHJldHVybiBiICE9IG51bGwgJiYgYi5faXNCdWZmZXIgPT09IHRydWUgJiZcbiAgICBiICE9PSBCdWZmZXIucHJvdG90eXBlIC8vIHNvIEJ1ZmZlci5pc0J1ZmZlcihCdWZmZXIucHJvdG90eXBlKSB3aWxsIGJlIGZhbHNlXG59XG5cbkJ1ZmZlci5jb21wYXJlID0gZnVuY3Rpb24gY29tcGFyZSAoYSwgYikge1xuICBpZiAoaXNJbnN0YW5jZShhLCBVaW50OEFycmF5KSkgYSA9IEJ1ZmZlci5mcm9tKGEsIGEub2Zmc2V0LCBhLmJ5dGVMZW5ndGgpXG4gIGlmIChpc0luc3RhbmNlKGIsIFVpbnQ4QXJyYXkpKSBiID0gQnVmZmVyLmZyb20oYiwgYi5vZmZzZXQsIGIuYnl0ZUxlbmd0aClcbiAgaWYgKCFCdWZmZXIuaXNCdWZmZXIoYSkgfHwgIUJ1ZmZlci5pc0J1ZmZlcihiKSkge1xuICAgIHRocm93IG5ldyBUeXBlRXJyb3IoXG4gICAgICAnVGhlIFwiYnVmMVwiLCBcImJ1ZjJcIiBhcmd1bWVudHMgbXVzdCBiZSBvbmUgb2YgdHlwZSBCdWZmZXIgb3IgVWludDhBcnJheSdcbiAgICApXG4gIH1cblxuICBpZiAoYSA9PT0gYikgcmV0dXJuIDBcblxuICB2YXIgeCA9IGEubGVuZ3RoXG4gIHZhciB5ID0gYi5sZW5ndGhcblxuICBmb3IgKHZhciBpID0gMCwgbGVuID0gTWF0aC5taW4oeCwgeSk7IGkgPCBsZW47ICsraSkge1xuICAgIGlmIChhW2ldICE9PSBiW2ldKSB7XG4gICAgICB4ID0gYVtpXVxuICAgICAgeSA9IGJbaV1cbiAgICAgIGJyZWFrXG4gICAgfVxuICB9XG5cbiAgaWYgKHggPCB5KSByZXR1cm4gLTFcbiAgaWYgKHkgPCB4KSByZXR1cm4gMVxuICByZXR1cm4gMFxufVxuXG5CdWZmZXIuaXNFbmNvZGluZyA9IGZ1bmN0aW9uIGlzRW5jb2RpbmcgKGVuY29kaW5nKSB7XG4gIHN3aXRjaCAoU3RyaW5nKGVuY29kaW5nKS50b0xvd2VyQ2FzZSgpKSB7XG4gICAgY2FzZSAnaGV4JzpcbiAgICBjYXNlICd1dGY4JzpcbiAgICBjYXNlICd1dGYtOCc6XG4gICAgY2FzZSAnYXNjaWknOlxuICAgIGNhc2UgJ2xhdGluMSc6XG4gICAgY2FzZSAnYmluYXJ5JzpcbiAgICBjYXNlICdiYXNlNjQnOlxuICAgIGNhc2UgJ3VjczInOlxuICAgIGNhc2UgJ3Vjcy0yJzpcbiAgICBjYXNlICd1dGYxNmxlJzpcbiAgICBjYXNlICd1dGYtMTZsZSc6XG4gICAgICByZXR1cm4gdHJ1ZVxuICAgIGRlZmF1bHQ6XG4gICAgICByZXR1cm4gZmFsc2VcbiAgfVxufVxuXG5CdWZmZXIuY29uY2F0ID0gZnVuY3Rpb24gY29uY2F0IChsaXN0LCBsZW5ndGgpIHtcbiAgaWYgKCFBcnJheS5pc0FycmF5KGxpc3QpKSB7XG4gICAgdGhyb3cgbmV3IFR5cGVFcnJvcignXCJsaXN0XCIgYXJndW1lbnQgbXVzdCBiZSBhbiBBcnJheSBvZiBCdWZmZXJzJylcbiAgfVxuXG4gIGlmIChsaXN0Lmxlbmd0aCA9PT0gMCkge1xuICAgIHJldHVybiBCdWZmZXIuYWxsb2MoMClcbiAgfVxuXG4gIHZhciBpXG4gIGlmIChsZW5ndGggPT09IHVuZGVmaW5lZCkge1xuICAgIGxlbmd0aCA9IDBcbiAgICBmb3IgKGkgPSAwOyBpIDwgbGlzdC5sZW5ndGg7ICsraSkge1xuICAgICAgbGVuZ3RoICs9IGxpc3RbaV0ubGVuZ3RoXG4gICAgfVxuICB9XG5cbiAgdmFyIGJ1ZmZlciA9IEJ1ZmZlci5hbGxvY1Vuc2FmZShsZW5ndGgpXG4gIHZhciBwb3MgPSAwXG4gIGZvciAoaSA9IDA7IGkgPCBsaXN0Lmxlbmd0aDsgKytpKSB7XG4gICAgdmFyIGJ1ZiA9IGxpc3RbaV1cbiAgICBpZiAoaXNJbnN0YW5jZShidWYsIFVpbnQ4QXJyYXkpKSB7XG4gICAgICBidWYgPSBCdWZmZXIuZnJvbShidWYpXG4gICAgfVxuICAgIGlmICghQnVmZmVyLmlzQnVmZmVyKGJ1ZikpIHtcbiAgICAgIHRocm93IG5ldyBUeXBlRXJyb3IoJ1wibGlzdFwiIGFyZ3VtZW50IG11c3QgYmUgYW4gQXJyYXkgb2YgQnVmZmVycycpXG4gICAgfVxuICAgIGJ1Zi5jb3B5KGJ1ZmZlciwgcG9zKVxuICAgIHBvcyArPSBidWYubGVuZ3RoXG4gIH1cbiAgcmV0dXJuIGJ1ZmZlclxufVxuXG5mdW5jdGlvbiBieXRlTGVuZ3RoIChzdHJpbmcsIGVuY29kaW5nKSB7XG4gIGlmIChCdWZmZXIuaXNCdWZmZXIoc3RyaW5nKSkge1xuICAgIHJldHVybiBzdHJpbmcubGVuZ3RoXG4gIH1cbiAgaWYgKEFycmF5QnVmZmVyLmlzVmlldyhzdHJpbmcpIHx8IGlzSW5zdGFuY2Uoc3RyaW5nLCBBcnJheUJ1ZmZlcikpIHtcbiAgICByZXR1cm4gc3RyaW5nLmJ5dGVMZW5ndGhcbiAgfVxuICBpZiAodHlwZW9mIHN0cmluZyAhPT0gJ3N0cmluZycpIHtcbiAgICB0aHJvdyBuZXcgVHlwZUVycm9yKFxuICAgICAgJ1RoZSBcInN0cmluZ1wiIGFyZ3VtZW50IG11c3QgYmUgb25lIG9mIHR5cGUgc3RyaW5nLCBCdWZmZXIsIG9yIEFycmF5QnVmZmVyLiAnICtcbiAgICAgICdSZWNlaXZlZCB0eXBlICcgKyB0eXBlb2Ygc3RyaW5nXG4gICAgKVxuICB9XG5cbiAgdmFyIGxlbiA9IHN0cmluZy5sZW5ndGhcbiAgdmFyIG11c3RNYXRjaCA9IChhcmd1bWVudHMubGVuZ3RoID4gMiAmJiBhcmd1bWVudHNbMl0gPT09IHRydWUpXG4gIGlmICghbXVzdE1hdGNoICYmIGxlbiA9PT0gMCkgcmV0dXJuIDBcblxuICAvLyBVc2UgYSBmb3IgbG9vcCB0byBhdm9pZCByZWN1cnNpb25cbiAgdmFyIGxvd2VyZWRDYXNlID0gZmFsc2VcbiAgZm9yICg7Oykge1xuICAgIHN3aXRjaCAoZW5jb2RpbmcpIHtcbiAgICAgIGNhc2UgJ2FzY2lpJzpcbiAgICAgIGNhc2UgJ2xhdGluMSc6XG4gICAgICBjYXNlICdiaW5hcnknOlxuICAgICAgICByZXR1cm4gbGVuXG4gICAgICBjYXNlICd1dGY4JzpcbiAgICAgIGNhc2UgJ3V0Zi04JzpcbiAgICAgICAgcmV0dXJuIHV0ZjhUb0J5dGVzKHN0cmluZykubGVuZ3RoXG4gICAgICBjYXNlICd1Y3MyJzpcbiAgICAgIGNhc2UgJ3Vjcy0yJzpcbiAgICAgIGNhc2UgJ3V0ZjE2bGUnOlxuICAgICAgY2FzZSAndXRmLTE2bGUnOlxuICAgICAgICByZXR1cm4gbGVuICogMlxuICAgICAgY2FzZSAnaGV4JzpcbiAgICAgICAgcmV0dXJuIGxlbiA+Pj4gMVxuICAgICAgY2FzZSAnYmFzZTY0JzpcbiAgICAgICAgcmV0dXJuIGJhc2U2NFRvQnl0ZXMoc3RyaW5nKS5sZW5ndGhcbiAgICAgIGRlZmF1bHQ6XG4gICAgICAgIGlmIChsb3dlcmVkQ2FzZSkge1xuICAgICAgICAgIHJldHVybiBtdXN0TWF0Y2ggPyAtMSA6IHV0ZjhUb0J5dGVzKHN0cmluZykubGVuZ3RoIC8vIGFzc3VtZSB1dGY4XG4gICAgICAgIH1cbiAgICAgICAgZW5jb2RpbmcgPSAoJycgKyBlbmNvZGluZykudG9Mb3dlckNhc2UoKVxuICAgICAgICBsb3dlcmVkQ2FzZSA9IHRydWVcbiAgICB9XG4gIH1cbn1cbkJ1ZmZlci5ieXRlTGVuZ3RoID0gYnl0ZUxlbmd0aFxuXG5mdW5jdGlvbiBzbG93VG9TdHJpbmcgKGVuY29kaW5nLCBzdGFydCwgZW5kKSB7XG4gIHZhciBsb3dlcmVkQ2FzZSA9IGZhbHNlXG5cbiAgLy8gTm8gbmVlZCB0byB2ZXJpZnkgdGhhdCBcInRoaXMubGVuZ3RoIDw9IE1BWF9VSU5UMzJcIiBzaW5jZSBpdCdzIGEgcmVhZC1vbmx5XG4gIC8vIHByb3BlcnR5IG9mIGEgdHlwZWQgYXJyYXkuXG5cbiAgLy8gVGhpcyBiZWhhdmVzIG5laXRoZXIgbGlrZSBTdHJpbmcgbm9yIFVpbnQ4QXJyYXkgaW4gdGhhdCB3ZSBzZXQgc3RhcnQvZW5kXG4gIC8vIHRvIHRoZWlyIHVwcGVyL2xvd2VyIGJvdW5kcyBpZiB0aGUgdmFsdWUgcGFzc2VkIGlzIG91dCBvZiByYW5nZS5cbiAgLy8gdW5kZWZpbmVkIGlzIGhhbmRsZWQgc3BlY2lhbGx5IGFzIHBlciBFQ01BLTI2MiA2dGggRWRpdGlvbixcbiAgLy8gU2VjdGlvbiAxMy4zLjMuNyBSdW50aW1lIFNlbWFudGljczogS2V5ZWRCaW5kaW5nSW5pdGlhbGl6YXRpb24uXG4gIGlmIChzdGFydCA9PT0gdW5kZWZpbmVkIHx8IHN0YXJ0IDwgMCkge1xuICAgIHN0YXJ0ID0gMFxuICB9XG4gIC8vIFJldHVybiBlYXJseSBpZiBzdGFydCA+IHRoaXMubGVuZ3RoLiBEb25lIGhlcmUgdG8gcHJldmVudCBwb3RlbnRpYWwgdWludDMyXG4gIC8vIGNvZXJjaW9uIGZhaWwgYmVsb3cuXG4gIGlmIChzdGFydCA+IHRoaXMubGVuZ3RoKSB7XG4gICAgcmV0dXJuICcnXG4gIH1cblxuICBpZiAoZW5kID09PSB1bmRlZmluZWQgfHwgZW5kID4gdGhpcy5sZW5ndGgpIHtcbiAgICBlbmQgPSB0aGlzLmxlbmd0aFxuICB9XG5cbiAgaWYgKGVuZCA8PSAwKSB7XG4gICAgcmV0dXJuICcnXG4gIH1cblxuICAvLyBGb3JjZSBjb2Vyc2lvbiB0byB1aW50MzIuIFRoaXMgd2lsbCBhbHNvIGNvZXJjZSBmYWxzZXkvTmFOIHZhbHVlcyB0byAwLlxuICBlbmQgPj4+PSAwXG4gIHN0YXJ0ID4+Pj0gMFxuXG4gIGlmIChlbmQgPD0gc3RhcnQpIHtcbiAgICByZXR1cm4gJydcbiAgfVxuXG4gIGlmICghZW5jb2RpbmcpIGVuY29kaW5nID0gJ3V0ZjgnXG5cbiAgd2hpbGUgKHRydWUpIHtcbiAgICBzd2l0Y2ggKGVuY29kaW5nKSB7XG4gICAgICBjYXNlICdoZXgnOlxuICAgICAgICByZXR1cm4gaGV4U2xpY2UodGhpcywgc3RhcnQsIGVuZClcblxuICAgICAgY2FzZSAndXRmOCc6XG4gICAgICBjYXNlICd1dGYtOCc6XG4gICAgICAgIHJldHVybiB1dGY4U2xpY2UodGhpcywgc3RhcnQsIGVuZClcblxuICAgICAgY2FzZSAnYXNjaWknOlxuICAgICAgICByZXR1cm4gYXNjaWlTbGljZSh0aGlzLCBzdGFydCwgZW5kKVxuXG4gICAgICBjYXNlICdsYXRpbjEnOlxuICAgICAgY2FzZSAnYmluYXJ5JzpcbiAgICAgICAgcmV0dXJuIGxhdGluMVNsaWNlKHRoaXMsIHN0YXJ0LCBlbmQpXG5cbiAgICAgIGNhc2UgJ2Jhc2U2NCc6XG4gICAgICAgIHJldHVybiBiYXNlNjRTbGljZSh0aGlzLCBzdGFydCwgZW5kKVxuXG4gICAgICBjYXNlICd1Y3MyJzpcbiAgICAgIGNhc2UgJ3Vjcy0yJzpcbiAgICAgIGNhc2UgJ3V0ZjE2bGUnOlxuICAgICAgY2FzZSAndXRmLTE2bGUnOlxuICAgICAgICByZXR1cm4gdXRmMTZsZVNsaWNlKHRoaXMsIHN0YXJ0LCBlbmQpXG5cbiAgICAgIGRlZmF1bHQ6XG4gICAgICAgIGlmIChsb3dlcmVkQ2FzZSkgdGhyb3cgbmV3IFR5cGVFcnJvcignVW5rbm93biBlbmNvZGluZzogJyArIGVuY29kaW5nKVxuICAgICAgICBlbmNvZGluZyA9IChlbmNvZGluZyArICcnKS50b0xvd2VyQ2FzZSgpXG4gICAgICAgIGxvd2VyZWRDYXNlID0gdHJ1ZVxuICAgIH1cbiAgfVxufVxuXG4vLyBUaGlzIHByb3BlcnR5IGlzIHVzZWQgYnkgYEJ1ZmZlci5pc0J1ZmZlcmAgKGFuZCB0aGUgYGlzLWJ1ZmZlcmAgbnBtIHBhY2thZ2UpXG4vLyB0byBkZXRlY3QgYSBCdWZmZXIgaW5zdGFuY2UuIEl0J3Mgbm90IHBvc3NpYmxlIHRvIHVzZSBgaW5zdGFuY2VvZiBCdWZmZXJgXG4vLyByZWxpYWJseSBpbiBhIGJyb3dzZXJpZnkgY29udGV4dCBiZWNhdXNlIHRoZXJlIGNvdWxkIGJlIG11bHRpcGxlIGRpZmZlcmVudFxuLy8gY29waWVzIG9mIHRoZSAnYnVmZmVyJyBwYWNrYWdlIGluIHVzZS4gVGhpcyBtZXRob2Qgd29ya3MgZXZlbiBmb3IgQnVmZmVyXG4vLyBpbnN0YW5jZXMgdGhhdCB3ZXJlIGNyZWF0ZWQgZnJvbSBhbm90aGVyIGNvcHkgb2YgdGhlIGBidWZmZXJgIHBhY2thZ2UuXG4vLyBTZWU6IGh0dHBzOi8vZ2l0aHViLmNvbS9mZXJvc3MvYnVmZmVyL2lzc3Vlcy8xNTRcbkJ1ZmZlci5wcm90b3R5cGUuX2lzQnVmZmVyID0gdHJ1ZVxuXG5mdW5jdGlvbiBzd2FwIChiLCBuLCBtKSB7XG4gIHZhciBpID0gYltuXVxuICBiW25dID0gYlttXVxuICBiW21dID0gaVxufVxuXG5CdWZmZXIucHJvdG90eXBlLnN3YXAxNiA9IGZ1bmN0aW9uIHN3YXAxNiAoKSB7XG4gIHZhciBsZW4gPSB0aGlzLmxlbmd0aFxuICBpZiAobGVuICUgMiAhPT0gMCkge1xuICAgIHRocm93IG5ldyBSYW5nZUVycm9yKCdCdWZmZXIgc2l6ZSBtdXN0IGJlIGEgbXVsdGlwbGUgb2YgMTYtYml0cycpXG4gIH1cbiAgZm9yICh2YXIgaSA9IDA7IGkgPCBsZW47IGkgKz0gMikge1xuICAgIHN3YXAodGhpcywgaSwgaSArIDEpXG4gIH1cbiAgcmV0dXJuIHRoaXNcbn1cblxuQnVmZmVyLnByb3RvdHlwZS5zd2FwMzIgPSBmdW5jdGlvbiBzd2FwMzIgKCkge1xuICB2YXIgbGVuID0gdGhpcy5sZW5ndGhcbiAgaWYgKGxlbiAlIDQgIT09IDApIHtcbiAgICB0aHJvdyBuZXcgUmFuZ2VFcnJvcignQnVmZmVyIHNpemUgbXVzdCBiZSBhIG11bHRpcGxlIG9mIDMyLWJpdHMnKVxuICB9XG4gIGZvciAodmFyIGkgPSAwOyBpIDwgbGVuOyBpICs9IDQpIHtcbiAgICBzd2FwKHRoaXMsIGksIGkgKyAzKVxuICAgIHN3YXAodGhpcywgaSArIDEsIGkgKyAyKVxuICB9XG4gIHJldHVybiB0aGlzXG59XG5cbkJ1ZmZlci5wcm90b3R5cGUuc3dhcDY0ID0gZnVuY3Rpb24gc3dhcDY0ICgpIHtcbiAgdmFyIGxlbiA9IHRoaXMubGVuZ3RoXG4gIGlmIChsZW4gJSA4ICE9PSAwKSB7XG4gICAgdGhyb3cgbmV3IFJhbmdlRXJyb3IoJ0J1ZmZlciBzaXplIG11c3QgYmUgYSBtdWx0aXBsZSBvZiA2NC1iaXRzJylcbiAgfVxuICBmb3IgKHZhciBpID0gMDsgaSA8IGxlbjsgaSArPSA4KSB7XG4gICAgc3dhcCh0aGlzLCBpLCBpICsgNylcbiAgICBzd2FwKHRoaXMsIGkgKyAxLCBpICsgNilcbiAgICBzd2FwKHRoaXMsIGkgKyAyLCBpICsgNSlcbiAgICBzd2FwKHRoaXMsIGkgKyAzLCBpICsgNClcbiAgfVxuICByZXR1cm4gdGhpc1xufVxuXG5CdWZmZXIucHJvdG90eXBlLnRvU3RyaW5nID0gZnVuY3Rpb24gdG9TdHJpbmcgKCkge1xuICB2YXIgbGVuZ3RoID0gdGhpcy5sZW5ndGhcbiAgaWYgKGxlbmd0aCA9PT0gMCkgcmV0dXJuICcnXG4gIGlmIChhcmd1bWVudHMubGVuZ3RoID09PSAwKSByZXR1cm4gdXRmOFNsaWNlKHRoaXMsIDAsIGxlbmd0aClcbiAgcmV0dXJuIHNsb3dUb1N0cmluZy5hcHBseSh0aGlzLCBhcmd1bWVudHMpXG59XG5cbkJ1ZmZlci5wcm90b3R5cGUudG9Mb2NhbGVTdHJpbmcgPSBCdWZmZXIucHJvdG90eXBlLnRvU3RyaW5nXG5cbkJ1ZmZlci5wcm90b3R5cGUuZXF1YWxzID0gZnVuY3Rpb24gZXF1YWxzIChiKSB7XG4gIGlmICghQnVmZmVyLmlzQnVmZmVyKGIpKSB0aHJvdyBuZXcgVHlwZUVycm9yKCdBcmd1bWVudCBtdXN0IGJlIGEgQnVmZmVyJylcbiAgaWYgKHRoaXMgPT09IGIpIHJldHVybiB0cnVlXG4gIHJldHVybiBCdWZmZXIuY29tcGFyZSh0aGlzLCBiKSA9PT0gMFxufVxuXG5CdWZmZXIucHJvdG90eXBlLmluc3BlY3QgPSBmdW5jdGlvbiBpbnNwZWN0ICgpIHtcbiAgdmFyIHN0ciA9ICcnXG4gIHZhciBtYXggPSBleHBvcnRzLklOU1BFQ1RfTUFYX0JZVEVTXG4gIHN0ciA9IHRoaXMudG9TdHJpbmcoJ2hleCcsIDAsIG1heCkucmVwbGFjZSgvKC57Mn0pL2csICckMSAnKS50cmltKClcbiAgaWYgKHRoaXMubGVuZ3RoID4gbWF4KSBzdHIgKz0gJyAuLi4gJ1xuICByZXR1cm4gJzxCdWZmZXIgJyArIHN0ciArICc+J1xufVxuaWYgKGN1c3RvbUluc3BlY3RTeW1ib2wpIHtcbiAgQnVmZmVyLnByb3RvdHlwZVtjdXN0b21JbnNwZWN0U3ltYm9sXSA9IEJ1ZmZlci5wcm90b3R5cGUuaW5zcGVjdFxufVxuXG5CdWZmZXIucHJvdG90eXBlLmNvbXBhcmUgPSBmdW5jdGlvbiBjb21wYXJlICh0YXJnZXQsIHN0YXJ0LCBlbmQsIHRoaXNTdGFydCwgdGhpc0VuZCkge1xuICBpZiAoaXNJbnN0YW5jZSh0YXJnZXQsIFVpbnQ4QXJyYXkpKSB7XG4gICAgdGFyZ2V0ID0gQnVmZmVyLmZyb20odGFyZ2V0LCB0YXJnZXQub2Zmc2V0LCB0YXJnZXQuYnl0ZUxlbmd0aClcbiAgfVxuICBpZiAoIUJ1ZmZlci5pc0J1ZmZlcih0YXJnZXQpKSB7XG4gICAgdGhyb3cgbmV3IFR5cGVFcnJvcihcbiAgICAgICdUaGUgXCJ0YXJnZXRcIiBhcmd1bWVudCBtdXN0IGJlIG9uZSBvZiB0eXBlIEJ1ZmZlciBvciBVaW50OEFycmF5LiAnICtcbiAgICAgICdSZWNlaXZlZCB0eXBlICcgKyAodHlwZW9mIHRhcmdldClcbiAgICApXG4gIH1cblxuICBpZiAoc3RhcnQgPT09IHVuZGVmaW5lZCkge1xuICAgIHN0YXJ0ID0gMFxuICB9XG4gIGlmIChlbmQgPT09IHVuZGVmaW5lZCkge1xuICAgIGVuZCA9IHRhcmdldCA/IHRhcmdldC5sZW5ndGggOiAwXG4gIH1cbiAgaWYgKHRoaXNTdGFydCA9PT0gdW5kZWZpbmVkKSB7XG4gICAgdGhpc1N0YXJ0ID0gMFxuICB9XG4gIGlmICh0aGlzRW5kID09PSB1bmRlZmluZWQpIHtcbiAgICB0aGlzRW5kID0gdGhpcy5sZW5ndGhcbiAgfVxuXG4gIGlmIChzdGFydCA8IDAgfHwgZW5kID4gdGFyZ2V0Lmxlbmd0aCB8fCB0aGlzU3RhcnQgPCAwIHx8IHRoaXNFbmQgPiB0aGlzLmxlbmd0aCkge1xuICAgIHRocm93IG5ldyBSYW5nZUVycm9yKCdvdXQgb2YgcmFuZ2UgaW5kZXgnKVxuICB9XG5cbiAgaWYgKHRoaXNTdGFydCA+PSB0aGlzRW5kICYmIHN0YXJ0ID49IGVuZCkge1xuICAgIHJldHVybiAwXG4gIH1cbiAgaWYgKHRoaXNTdGFydCA+PSB0aGlzRW5kKSB7XG4gICAgcmV0dXJuIC0xXG4gIH1cbiAgaWYgKHN0YXJ0ID49IGVuZCkge1xuICAgIHJldHVybiAxXG4gIH1cblxuICBzdGFydCA+Pj49IDBcbiAgZW5kID4+Pj0gMFxuICB0aGlzU3RhcnQgPj4+PSAwXG4gIHRoaXNFbmQgPj4+PSAwXG5cbiAgaWYgKHRoaXMgPT09IHRhcmdldCkgcmV0dXJuIDBcblxuICB2YXIgeCA9IHRoaXNFbmQgLSB0aGlzU3RhcnRcbiAgdmFyIHkgPSBlbmQgLSBzdGFydFxuICB2YXIgbGVuID0gTWF0aC5taW4oeCwgeSlcblxuICB2YXIgdGhpc0NvcHkgPSB0aGlzLnNsaWNlKHRoaXNTdGFydCwgdGhpc0VuZClcbiAgdmFyIHRhcmdldENvcHkgPSB0YXJnZXQuc2xpY2Uoc3RhcnQsIGVuZClcblxuICBmb3IgKHZhciBpID0gMDsgaSA8IGxlbjsgKytpKSB7XG4gICAgaWYgKHRoaXNDb3B5W2ldICE9PSB0YXJnZXRDb3B5W2ldKSB7XG4gICAgICB4ID0gdGhpc0NvcHlbaV1cbiAgICAgIHkgPSB0YXJnZXRDb3B5W2ldXG4gICAgICBicmVha1xuICAgIH1cbiAgfVxuXG4gIGlmICh4IDwgeSkgcmV0dXJuIC0xXG4gIGlmICh5IDwgeCkgcmV0dXJuIDFcbiAgcmV0dXJuIDBcbn1cblxuLy8gRmluZHMgZWl0aGVyIHRoZSBmaXJzdCBpbmRleCBvZiBgdmFsYCBpbiBgYnVmZmVyYCBhdCBvZmZzZXQgPj0gYGJ5dGVPZmZzZXRgLFxuLy8gT1IgdGhlIGxhc3QgaW5kZXggb2YgYHZhbGAgaW4gYGJ1ZmZlcmAgYXQgb2Zmc2V0IDw9IGBieXRlT2Zmc2V0YC5cbi8vXG4vLyBBcmd1bWVudHM6XG4vLyAtIGJ1ZmZlciAtIGEgQnVmZmVyIHRvIHNlYXJjaFxuLy8gLSB2YWwgLSBhIHN0cmluZywgQnVmZmVyLCBvciBudW1iZXJcbi8vIC0gYnl0ZU9mZnNldCAtIGFuIGluZGV4IGludG8gYGJ1ZmZlcmA7IHdpbGwgYmUgY2xhbXBlZCB0byBhbiBpbnQzMlxuLy8gLSBlbmNvZGluZyAtIGFuIG9wdGlvbmFsIGVuY29kaW5nLCByZWxldmFudCBpcyB2YWwgaXMgYSBzdHJpbmdcbi8vIC0gZGlyIC0gdHJ1ZSBmb3IgaW5kZXhPZiwgZmFsc2UgZm9yIGxhc3RJbmRleE9mXG5mdW5jdGlvbiBiaWRpcmVjdGlvbmFsSW5kZXhPZiAoYnVmZmVyLCB2YWwsIGJ5dGVPZmZzZXQsIGVuY29kaW5nLCBkaXIpIHtcbiAgLy8gRW1wdHkgYnVmZmVyIG1lYW5zIG5vIG1hdGNoXG4gIGlmIChidWZmZXIubGVuZ3RoID09PSAwKSByZXR1cm4gLTFcblxuICAvLyBOb3JtYWxpemUgYnl0ZU9mZnNldFxuICBpZiAodHlwZW9mIGJ5dGVPZmZzZXQgPT09ICdzdHJpbmcnKSB7XG4gICAgZW5jb2RpbmcgPSBieXRlT2Zmc2V0XG4gICAgYnl0ZU9mZnNldCA9IDBcbiAgfSBlbHNlIGlmIChieXRlT2Zmc2V0ID4gMHg3ZmZmZmZmZikge1xuICAgIGJ5dGVPZmZzZXQgPSAweDdmZmZmZmZmXG4gIH0gZWxzZSBpZiAoYnl0ZU9mZnNldCA8IC0weDgwMDAwMDAwKSB7XG4gICAgYnl0ZU9mZnNldCA9IC0weDgwMDAwMDAwXG4gIH1cbiAgYnl0ZU9mZnNldCA9ICtieXRlT2Zmc2V0IC8vIENvZXJjZSB0byBOdW1iZXIuXG4gIGlmIChudW1iZXJJc05hTihieXRlT2Zmc2V0KSkge1xuICAgIC8vIGJ5dGVPZmZzZXQ6IGl0IGl0J3MgdW5kZWZpbmVkLCBudWxsLCBOYU4sIFwiZm9vXCIsIGV0Yywgc2VhcmNoIHdob2xlIGJ1ZmZlclxuICAgIGJ5dGVPZmZzZXQgPSBkaXIgPyAwIDogKGJ1ZmZlci5sZW5ndGggLSAxKVxuICB9XG5cbiAgLy8gTm9ybWFsaXplIGJ5dGVPZmZzZXQ6IG5lZ2F0aXZlIG9mZnNldHMgc3RhcnQgZnJvbSB0aGUgZW5kIG9mIHRoZSBidWZmZXJcbiAgaWYgKGJ5dGVPZmZzZXQgPCAwKSBieXRlT2Zmc2V0ID0gYnVmZmVyLmxlbmd0aCArIGJ5dGVPZmZzZXRcbiAgaWYgKGJ5dGVPZmZzZXQgPj0gYnVmZmVyLmxlbmd0aCkge1xuICAgIGlmIChkaXIpIHJldHVybiAtMVxuICAgIGVsc2UgYnl0ZU9mZnNldCA9IGJ1ZmZlci5sZW5ndGggLSAxXG4gIH0gZWxzZSBpZiAoYnl0ZU9mZnNldCA8IDApIHtcbiAgICBpZiAoZGlyKSBieXRlT2Zmc2V0ID0gMFxuICAgIGVsc2UgcmV0dXJuIC0xXG4gIH1cblxuICAvLyBOb3JtYWxpemUgdmFsXG4gIGlmICh0eXBlb2YgdmFsID09PSAnc3RyaW5nJykge1xuICAgIHZhbCA9IEJ1ZmZlci5mcm9tKHZhbCwgZW5jb2RpbmcpXG4gIH1cblxuICAvLyBGaW5hbGx5LCBzZWFyY2ggZWl0aGVyIGluZGV4T2YgKGlmIGRpciBpcyB0cnVlKSBvciBsYXN0SW5kZXhPZlxuICBpZiAoQnVmZmVyLmlzQnVmZmVyKHZhbCkpIHtcbiAgICAvLyBTcGVjaWFsIGNhc2U6IGxvb2tpbmcgZm9yIGVtcHR5IHN0cmluZy9idWZmZXIgYWx3YXlzIGZhaWxzXG4gICAgaWYgKHZhbC5sZW5ndGggPT09IDApIHtcbiAgICAgIHJldHVybiAtMVxuICAgIH1cbiAgICByZXR1cm4gYXJyYXlJbmRleE9mKGJ1ZmZlciwgdmFsLCBieXRlT2Zmc2V0LCBlbmNvZGluZywgZGlyKVxuICB9IGVsc2UgaWYgKHR5cGVvZiB2YWwgPT09ICdudW1iZXInKSB7XG4gICAgdmFsID0gdmFsICYgMHhGRiAvLyBTZWFyY2ggZm9yIGEgYnl0ZSB2YWx1ZSBbMC0yNTVdXG4gICAgaWYgKHR5cGVvZiBVaW50OEFycmF5LnByb3RvdHlwZS5pbmRleE9mID09PSAnZnVuY3Rpb24nKSB7XG4gICAgICBpZiAoZGlyKSB7XG4gICAgICAgIHJldHVybiBVaW50OEFycmF5LnByb3RvdHlwZS5pbmRleE9mLmNhbGwoYnVmZmVyLCB2YWwsIGJ5dGVPZmZzZXQpXG4gICAgICB9IGVsc2Uge1xuICAgICAgICByZXR1cm4gVWludDhBcnJheS5wcm90b3R5cGUubGFzdEluZGV4T2YuY2FsbChidWZmZXIsIHZhbCwgYnl0ZU9mZnNldClcbiAgICAgIH1cbiAgICB9XG4gICAgcmV0dXJuIGFycmF5SW5kZXhPZihidWZmZXIsIFt2YWxdLCBieXRlT2Zmc2V0LCBlbmNvZGluZywgZGlyKVxuICB9XG5cbiAgdGhyb3cgbmV3IFR5cGVFcnJvcigndmFsIG11c3QgYmUgc3RyaW5nLCBudW1iZXIgb3IgQnVmZmVyJylcbn1cblxuZnVuY3Rpb24gYXJyYXlJbmRleE9mIChhcnIsIHZhbCwgYnl0ZU9mZnNldCwgZW5jb2RpbmcsIGRpcikge1xuICB2YXIgaW5kZXhTaXplID0gMVxuICB2YXIgYXJyTGVuZ3RoID0gYXJyLmxlbmd0aFxuICB2YXIgdmFsTGVuZ3RoID0gdmFsLmxlbmd0aFxuXG4gIGlmIChlbmNvZGluZyAhPT0gdW5kZWZpbmVkKSB7XG4gICAgZW5jb2RpbmcgPSBTdHJpbmcoZW5jb2RpbmcpLnRvTG93ZXJDYXNlKClcbiAgICBpZiAoZW5jb2RpbmcgPT09ICd1Y3MyJyB8fCBlbmNvZGluZyA9PT0gJ3Vjcy0yJyB8fFxuICAgICAgICBlbmNvZGluZyA9PT0gJ3V0ZjE2bGUnIHx8IGVuY29kaW5nID09PSAndXRmLTE2bGUnKSB7XG4gICAgICBpZiAoYXJyLmxlbmd0aCA8IDIgfHwgdmFsLmxlbmd0aCA8IDIpIHtcbiAgICAgICAgcmV0dXJuIC0xXG4gICAgICB9XG4gICAgICBpbmRleFNpemUgPSAyXG4gICAgICBhcnJMZW5ndGggLz0gMlxuICAgICAgdmFsTGVuZ3RoIC89IDJcbiAgICAgIGJ5dGVPZmZzZXQgLz0gMlxuICAgIH1cbiAgfVxuXG4gIGZ1bmN0aW9uIHJlYWQgKGJ1ZiwgaSkge1xuICAgIGlmIChpbmRleFNpemUgPT09IDEpIHtcbiAgICAgIHJldHVybiBidWZbaV1cbiAgICB9IGVsc2Uge1xuICAgICAgcmV0dXJuIGJ1Zi5yZWFkVUludDE2QkUoaSAqIGluZGV4U2l6ZSlcbiAgICB9XG4gIH1cblxuICB2YXIgaVxuICBpZiAoZGlyKSB7XG4gICAgdmFyIGZvdW5kSW5kZXggPSAtMVxuICAgIGZvciAoaSA9IGJ5dGVPZmZzZXQ7IGkgPCBhcnJMZW5ndGg7IGkrKykge1xuICAgICAgaWYgKHJlYWQoYXJyLCBpKSA9PT0gcmVhZCh2YWwsIGZvdW5kSW5kZXggPT09IC0xID8gMCA6IGkgLSBmb3VuZEluZGV4KSkge1xuICAgICAgICBpZiAoZm91bmRJbmRleCA9PT0gLTEpIGZvdW5kSW5kZXggPSBpXG4gICAgICAgIGlmIChpIC0gZm91bmRJbmRleCArIDEgPT09IHZhbExlbmd0aCkgcmV0dXJuIGZvdW5kSW5kZXggKiBpbmRleFNpemVcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIGlmIChmb3VuZEluZGV4ICE9PSAtMSkgaSAtPSBpIC0gZm91bmRJbmRleFxuICAgICAgICBmb3VuZEluZGV4ID0gLTFcbiAgICAgIH1cbiAgICB9XG4gIH0gZWxzZSB7XG4gICAgaWYgKGJ5dGVPZmZzZXQgKyB2YWxMZW5ndGggPiBhcnJMZW5ndGgpIGJ5dGVPZmZzZXQgPSBhcnJMZW5ndGggLSB2YWxMZW5ndGhcbiAgICBmb3IgKGkgPSBieXRlT2Zmc2V0OyBpID49IDA7IGktLSkge1xuICAgICAgdmFyIGZvdW5kID0gdHJ1ZVxuICAgICAgZm9yICh2YXIgaiA9IDA7IGogPCB2YWxMZW5ndGg7IGorKykge1xuICAgICAgICBpZiAocmVhZChhcnIsIGkgKyBqKSAhPT0gcmVhZCh2YWwsIGopKSB7XG4gICAgICAgICAgZm91bmQgPSBmYWxzZVxuICAgICAgICAgIGJyZWFrXG4gICAgICAgIH1cbiAgICAgIH1cbiAgICAgIGlmIChmb3VuZCkgcmV0dXJuIGlcbiAgICB9XG4gIH1cblxuICByZXR1cm4gLTFcbn1cblxuQnVmZmVyLnByb3RvdHlwZS5pbmNsdWRlcyA9IGZ1bmN0aW9uIGluY2x1ZGVzICh2YWwsIGJ5dGVPZmZzZXQsIGVuY29kaW5nKSB7XG4gIHJldHVybiB0aGlzLmluZGV4T2YodmFsLCBieXRlT2Zmc2V0LCBlbmNvZGluZykgIT09IC0xXG59XG5cbkJ1ZmZlci5wcm90b3R5cGUuaW5kZXhPZiA9IGZ1bmN0aW9uIGluZGV4T2YgKHZhbCwgYnl0ZU9mZnNldCwgZW5jb2RpbmcpIHtcbiAgcmV0dXJuIGJpZGlyZWN0aW9uYWxJbmRleE9mKHRoaXMsIHZhbCwgYnl0ZU9mZnNldCwgZW5jb2RpbmcsIHRydWUpXG59XG5cbkJ1ZmZlci5wcm90b3R5cGUubGFzdEluZGV4T2YgPSBmdW5jdGlvbiBsYXN0SW5kZXhPZiAodmFsLCBieXRlT2Zmc2V0LCBlbmNvZGluZykge1xuICByZXR1cm4gYmlkaXJlY3Rpb25hbEluZGV4T2YodGhpcywgdmFsLCBieXRlT2Zmc2V0LCBlbmNvZGluZywgZmFsc2UpXG59XG5cbmZ1bmN0aW9uIGhleFdyaXRlIChidWYsIHN0cmluZywgb2Zmc2V0LCBsZW5ndGgpIHtcbiAgb2Zmc2V0ID0gTnVtYmVyKG9mZnNldCkgfHwgMFxuICB2YXIgcmVtYWluaW5nID0gYnVmLmxlbmd0aCAtIG9mZnNldFxuICBpZiAoIWxlbmd0aCkge1xuICAgIGxlbmd0aCA9IHJlbWFpbmluZ1xuICB9IGVsc2Uge1xuICAgIGxlbmd0aCA9IE51bWJlcihsZW5ndGgpXG4gICAgaWYgKGxlbmd0aCA+IHJlbWFpbmluZykge1xuICAgICAgbGVuZ3RoID0gcmVtYWluaW5nXG4gICAgfVxuICB9XG5cbiAgdmFyIHN0ckxlbiA9IHN0cmluZy5sZW5ndGhcblxuICBpZiAobGVuZ3RoID4gc3RyTGVuIC8gMikge1xuICAgIGxlbmd0aCA9IHN0ckxlbiAvIDJcbiAgfVxuICBmb3IgKHZhciBpID0gMDsgaSA8IGxlbmd0aDsgKytpKSB7XG4gICAgdmFyIHBhcnNlZCA9IHBhcnNlSW50KHN0cmluZy5zdWJzdHIoaSAqIDIsIDIpLCAxNilcbiAgICBpZiAobnVtYmVySXNOYU4ocGFyc2VkKSkgcmV0dXJuIGlcbiAgICBidWZbb2Zmc2V0ICsgaV0gPSBwYXJzZWRcbiAgfVxuICByZXR1cm4gaVxufVxuXG5mdW5jdGlvbiB1dGY4V3JpdGUgKGJ1Ziwgc3RyaW5nLCBvZmZzZXQsIGxlbmd0aCkge1xuICByZXR1cm4gYmxpdEJ1ZmZlcih1dGY4VG9CeXRlcyhzdHJpbmcsIGJ1Zi5sZW5ndGggLSBvZmZzZXQpLCBidWYsIG9mZnNldCwgbGVuZ3RoKVxufVxuXG5mdW5jdGlvbiBhc2NpaVdyaXRlIChidWYsIHN0cmluZywgb2Zmc2V0LCBsZW5ndGgpIHtcbiAgcmV0dXJuIGJsaXRCdWZmZXIoYXNjaWlUb0J5dGVzKHN0cmluZyksIGJ1Ziwgb2Zmc2V0LCBsZW5ndGgpXG59XG5cbmZ1bmN0aW9uIGxhdGluMVdyaXRlIChidWYsIHN0cmluZywgb2Zmc2V0LCBsZW5ndGgpIHtcbiAgcmV0dXJuIGFzY2lpV3JpdGUoYnVmLCBzdHJpbmcsIG9mZnNldCwgbGVuZ3RoKVxufVxuXG5mdW5jdGlvbiBiYXNlNjRXcml0ZSAoYnVmLCBzdHJpbmcsIG9mZnNldCwgbGVuZ3RoKSB7XG4gIHJldHVybiBibGl0QnVmZmVyKGJhc2U2NFRvQnl0ZXMoc3RyaW5nKSwgYnVmLCBvZmZzZXQsIGxlbmd0aClcbn1cblxuZnVuY3Rpb24gdWNzMldyaXRlIChidWYsIHN0cmluZywgb2Zmc2V0LCBsZW5ndGgpIHtcbiAgcmV0dXJuIGJsaXRCdWZmZXIodXRmMTZsZVRvQnl0ZXMoc3RyaW5nLCBidWYubGVuZ3RoIC0gb2Zmc2V0KSwgYnVmLCBvZmZzZXQsIGxlbmd0aClcbn1cblxuQnVmZmVyLnByb3RvdHlwZS53cml0ZSA9IGZ1bmN0aW9uIHdyaXRlIChzdHJpbmcsIG9mZnNldCwgbGVuZ3RoLCBlbmNvZGluZykge1xuICAvLyBCdWZmZXIjd3JpdGUoc3RyaW5nKVxuICBpZiAob2Zmc2V0ID09PSB1bmRlZmluZWQpIHtcbiAgICBlbmNvZGluZyA9ICd1dGY4J1xuICAgIGxlbmd0aCA9IHRoaXMubGVuZ3RoXG4gICAgb2Zmc2V0ID0gMFxuICAvLyBCdWZmZXIjd3JpdGUoc3RyaW5nLCBlbmNvZGluZylcbiAgfSBlbHNlIGlmIChsZW5ndGggPT09IHVuZGVmaW5lZCAmJiB0eXBlb2Ygb2Zmc2V0ID09PSAnc3RyaW5nJykge1xuICAgIGVuY29kaW5nID0gb2Zmc2V0XG4gICAgbGVuZ3RoID0gdGhpcy5sZW5ndGhcbiAgICBvZmZzZXQgPSAwXG4gIC8vIEJ1ZmZlciN3cml0ZShzdHJpbmcsIG9mZnNldFssIGxlbmd0aF1bLCBlbmNvZGluZ10pXG4gIH0gZWxzZSBpZiAoaXNGaW5pdGUob2Zmc2V0KSkge1xuICAgIG9mZnNldCA9IG9mZnNldCA+Pj4gMFxuICAgIGlmIChpc0Zpbml0ZShsZW5ndGgpKSB7XG4gICAgICBsZW5ndGggPSBsZW5ndGggPj4+IDBcbiAgICAgIGlmIChlbmNvZGluZyA9PT0gdW5kZWZpbmVkKSBlbmNvZGluZyA9ICd1dGY4J1xuICAgIH0gZWxzZSB7XG4gICAgICBlbmNvZGluZyA9IGxlbmd0aFxuICAgICAgbGVuZ3RoID0gdW5kZWZpbmVkXG4gICAgfVxuICB9IGVsc2Uge1xuICAgIHRocm93IG5ldyBFcnJvcihcbiAgICAgICdCdWZmZXIud3JpdGUoc3RyaW5nLCBlbmNvZGluZywgb2Zmc2V0WywgbGVuZ3RoXSkgaXMgbm8gbG9uZ2VyIHN1cHBvcnRlZCdcbiAgICApXG4gIH1cblxuICB2YXIgcmVtYWluaW5nID0gdGhpcy5sZW5ndGggLSBvZmZzZXRcbiAgaWYgKGxlbmd0aCA9PT0gdW5kZWZpbmVkIHx8IGxlbmd0aCA+IHJlbWFpbmluZykgbGVuZ3RoID0gcmVtYWluaW5nXG5cbiAgaWYgKChzdHJpbmcubGVuZ3RoID4gMCAmJiAobGVuZ3RoIDwgMCB8fCBvZmZzZXQgPCAwKSkgfHwgb2Zmc2V0ID4gdGhpcy5sZW5ndGgpIHtcbiAgICB0aHJvdyBuZXcgUmFuZ2VFcnJvcignQXR0ZW1wdCB0byB3cml0ZSBvdXRzaWRlIGJ1ZmZlciBib3VuZHMnKVxuICB9XG5cbiAgaWYgKCFlbmNvZGluZykgZW5jb2RpbmcgPSAndXRmOCdcblxuICB2YXIgbG93ZXJlZENhc2UgPSBmYWxzZVxuICBmb3IgKDs7KSB7XG4gICAgc3dpdGNoIChlbmNvZGluZykge1xuICAgICAgY2FzZSAnaGV4JzpcbiAgICAgICAgcmV0dXJuIGhleFdyaXRlKHRoaXMsIHN0cmluZywgb2Zmc2V0LCBsZW5ndGgpXG5cbiAgICAgIGNhc2UgJ3V0ZjgnOlxuICAgICAgY2FzZSAndXRmLTgnOlxuICAgICAgICByZXR1cm4gdXRmOFdyaXRlKHRoaXMsIHN0cmluZywgb2Zmc2V0LCBsZW5ndGgpXG5cbiAgICAgIGNhc2UgJ2FzY2lpJzpcbiAgICAgICAgcmV0dXJuIGFzY2lpV3JpdGUodGhpcywgc3RyaW5nLCBvZmZzZXQsIGxlbmd0aClcblxuICAgICAgY2FzZSAnbGF0aW4xJzpcbiAgICAgIGNhc2UgJ2JpbmFyeSc6XG4gICAgICAgIHJldHVybiBsYXRpbjFXcml0ZSh0aGlzLCBzdHJpbmcsIG9mZnNldCwgbGVuZ3RoKVxuXG4gICAgICBjYXNlICdiYXNlNjQnOlxuICAgICAgICAvLyBXYXJuaW5nOiBtYXhMZW5ndGggbm90IHRha2VuIGludG8gYWNjb3VudCBpbiBiYXNlNjRXcml0ZVxuICAgICAgICByZXR1cm4gYmFzZTY0V3JpdGUodGhpcywgc3RyaW5nLCBvZmZzZXQsIGxlbmd0aClcblxuICAgICAgY2FzZSAndWNzMic6XG4gICAgICBjYXNlICd1Y3MtMic6XG4gICAgICBjYXNlICd1dGYxNmxlJzpcbiAgICAgIGNhc2UgJ3V0Zi0xNmxlJzpcbiAgICAgICAgcmV0dXJuIHVjczJXcml0ZSh0aGlzLCBzdHJpbmcsIG9mZnNldCwgbGVuZ3RoKVxuXG4gICAgICBkZWZhdWx0OlxuICAgICAgICBpZiAobG93ZXJlZENhc2UpIHRocm93IG5ldyBUeXBlRXJyb3IoJ1Vua25vd24gZW5jb2Rpbmc6ICcgKyBlbmNvZGluZylcbiAgICAgICAgZW5jb2RpbmcgPSAoJycgKyBlbmNvZGluZykudG9Mb3dlckNhc2UoKVxuICAgICAgICBsb3dlcmVkQ2FzZSA9IHRydWVcbiAgICB9XG4gIH1cbn1cblxuQnVmZmVyLnByb3RvdHlwZS50b0pTT04gPSBmdW5jdGlvbiB0b0pTT04gKCkge1xuICByZXR1cm4ge1xuICAgIHR5cGU6ICdCdWZmZXInLFxuICAgIGRhdGE6IEFycmF5LnByb3RvdHlwZS5zbGljZS5jYWxsKHRoaXMuX2FyciB8fCB0aGlzLCAwKVxuICB9XG59XG5cbmZ1bmN0aW9uIGJhc2U2NFNsaWNlIChidWYsIHN0YXJ0LCBlbmQpIHtcbiAgaWYgKHN0YXJ0ID09PSAwICYmIGVuZCA9PT0gYnVmLmxlbmd0aCkge1xuICAgIHJldHVybiBiYXNlNjQuZnJvbUJ5dGVBcnJheShidWYpXG4gIH0gZWxzZSB7XG4gICAgcmV0dXJuIGJhc2U2NC5mcm9tQnl0ZUFycmF5KGJ1Zi5zbGljZShzdGFydCwgZW5kKSlcbiAgfVxufVxuXG5mdW5jdGlvbiB1dGY4U2xpY2UgKGJ1Ziwgc3RhcnQsIGVuZCkge1xuICBlbmQgPSBNYXRoLm1pbihidWYubGVuZ3RoLCBlbmQpXG4gIHZhciByZXMgPSBbXVxuXG4gIHZhciBpID0gc3RhcnRcbiAgd2hpbGUgKGkgPCBlbmQpIHtcbiAgICB2YXIgZmlyc3RCeXRlID0gYnVmW2ldXG4gICAgdmFyIGNvZGVQb2ludCA9IG51bGxcbiAgICB2YXIgYnl0ZXNQZXJTZXF1ZW5jZSA9IChmaXJzdEJ5dGUgPiAweEVGKSA/IDRcbiAgICAgIDogKGZpcnN0Qnl0ZSA+IDB4REYpID8gM1xuICAgICAgICA6IChmaXJzdEJ5dGUgPiAweEJGKSA/IDJcbiAgICAgICAgICA6IDFcblxuICAgIGlmIChpICsgYnl0ZXNQZXJTZXF1ZW5jZSA8PSBlbmQpIHtcbiAgICAgIHZhciBzZWNvbmRCeXRlLCB0aGlyZEJ5dGUsIGZvdXJ0aEJ5dGUsIHRlbXBDb2RlUG9pbnRcblxuICAgICAgc3dpdGNoIChieXRlc1BlclNlcXVlbmNlKSB7XG4gICAgICAgIGNhc2UgMTpcbiAgICAgICAgICBpZiAoZmlyc3RCeXRlIDwgMHg4MCkge1xuICAgICAgICAgICAgY29kZVBvaW50ID0gZmlyc3RCeXRlXG4gICAgICAgICAgfVxuICAgICAgICAgIGJyZWFrXG4gICAgICAgIGNhc2UgMjpcbiAgICAgICAgICBzZWNvbmRCeXRlID0gYnVmW2kgKyAxXVxuICAgICAgICAgIGlmICgoc2Vjb25kQnl0ZSAmIDB4QzApID09PSAweDgwKSB7XG4gICAgICAgICAgICB0ZW1wQ29kZVBvaW50ID0gKGZpcnN0Qnl0ZSAmIDB4MUYpIDw8IDB4NiB8IChzZWNvbmRCeXRlICYgMHgzRilcbiAgICAgICAgICAgIGlmICh0ZW1wQ29kZVBvaW50ID4gMHg3Rikge1xuICAgICAgICAgICAgICBjb2RlUG9pbnQgPSB0ZW1wQ29kZVBvaW50XG4gICAgICAgICAgICB9XG4gICAgICAgICAgfVxuICAgICAgICAgIGJyZWFrXG4gICAgICAgIGNhc2UgMzpcbiAgICAgICAgICBzZWNvbmRCeXRlID0gYnVmW2kgKyAxXVxuICAgICAgICAgIHRoaXJkQnl0ZSA9IGJ1ZltpICsgMl1cbiAgICAgICAgICBpZiAoKHNlY29uZEJ5dGUgJiAweEMwKSA9PT0gMHg4MCAmJiAodGhpcmRCeXRlICYgMHhDMCkgPT09IDB4ODApIHtcbiAgICAgICAgICAgIHRlbXBDb2RlUG9pbnQgPSAoZmlyc3RCeXRlICYgMHhGKSA8PCAweEMgfCAoc2Vjb25kQnl0ZSAmIDB4M0YpIDw8IDB4NiB8ICh0aGlyZEJ5dGUgJiAweDNGKVxuICAgICAgICAgICAgaWYgKHRlbXBDb2RlUG9pbnQgPiAweDdGRiAmJiAodGVtcENvZGVQb2ludCA8IDB4RDgwMCB8fCB0ZW1wQ29kZVBvaW50ID4gMHhERkZGKSkge1xuICAgICAgICAgICAgICBjb2RlUG9pbnQgPSB0ZW1wQ29kZVBvaW50XG4gICAgICAgICAgICB9XG4gICAgICAgICAgfVxuICAgICAgICAgIGJyZWFrXG4gICAgICAgIGNhc2UgNDpcbiAgICAgICAgICBzZWNvbmRCeXRlID0gYnVmW2kgKyAxXVxuICAgICAgICAgIHRoaXJkQnl0ZSA9IGJ1ZltpICsgMl1cbiAgICAgICAgICBmb3VydGhCeXRlID0gYnVmW2kgKyAzXVxuICAgICAgICAgIGlmICgoc2Vjb25kQnl0ZSAmIDB4QzApID09PSAweDgwICYmICh0aGlyZEJ5dGUgJiAweEMwKSA9PT0gMHg4MCAmJiAoZm91cnRoQnl0ZSAmIDB4QzApID09PSAweDgwKSB7XG4gICAgICAgICAgICB0ZW1wQ29kZVBvaW50ID0gKGZpcnN0Qnl0ZSAmIDB4RikgPDwgMHgxMiB8IChzZWNvbmRCeXRlICYgMHgzRikgPDwgMHhDIHwgKHRoaXJkQnl0ZSAmIDB4M0YpIDw8IDB4NiB8IChmb3VydGhCeXRlICYgMHgzRilcbiAgICAgICAgICAgIGlmICh0ZW1wQ29kZVBvaW50ID4gMHhGRkZGICYmIHRlbXBDb2RlUG9pbnQgPCAweDExMDAwMCkge1xuICAgICAgICAgICAgICBjb2RlUG9pbnQgPSB0ZW1wQ29kZVBvaW50XG4gICAgICAgICAgICB9XG4gICAgICAgICAgfVxuICAgICAgfVxuICAgIH1cblxuICAgIGlmIChjb2RlUG9pbnQgPT09IG51bGwpIHtcbiAgICAgIC8vIHdlIGRpZCBub3QgZ2VuZXJhdGUgYSB2YWxpZCBjb2RlUG9pbnQgc28gaW5zZXJ0IGFcbiAgICAgIC8vIHJlcGxhY2VtZW50IGNoYXIgKFUrRkZGRCkgYW5kIGFkdmFuY2Ugb25seSAxIGJ5dGVcbiAgICAgIGNvZGVQb2ludCA9IDB4RkZGRFxuICAgICAgYnl0ZXNQZXJTZXF1ZW5jZSA9IDFcbiAgICB9IGVsc2UgaWYgKGNvZGVQb2ludCA+IDB4RkZGRikge1xuICAgICAgLy8gZW5jb2RlIHRvIHV0ZjE2IChzdXJyb2dhdGUgcGFpciBkYW5jZSlcbiAgICAgIGNvZGVQb2ludCAtPSAweDEwMDAwXG4gICAgICByZXMucHVzaChjb2RlUG9pbnQgPj4+IDEwICYgMHgzRkYgfCAweEQ4MDApXG4gICAgICBjb2RlUG9pbnQgPSAweERDMDAgfCBjb2RlUG9pbnQgJiAweDNGRlxuICAgIH1cblxuICAgIHJlcy5wdXNoKGNvZGVQb2ludClcbiAgICBpICs9IGJ5dGVzUGVyU2VxdWVuY2VcbiAgfVxuXG4gIHJldHVybiBkZWNvZGVDb2RlUG9pbnRzQXJyYXkocmVzKVxufVxuXG4vLyBCYXNlZCBvbiBodHRwOi8vc3RhY2tvdmVyZmxvdy5jb20vYS8yMjc0NzI3Mi82ODA3NDIsIHRoZSBicm93c2VyIHdpdGhcbi8vIHRoZSBsb3dlc3QgbGltaXQgaXMgQ2hyb21lLCB3aXRoIDB4MTAwMDAgYXJncy5cbi8vIFdlIGdvIDEgbWFnbml0dWRlIGxlc3MsIGZvciBzYWZldHlcbnZhciBNQVhfQVJHVU1FTlRTX0xFTkdUSCA9IDB4MTAwMFxuXG5mdW5jdGlvbiBkZWNvZGVDb2RlUG9pbnRzQXJyYXkgKGNvZGVQb2ludHMpIHtcbiAgdmFyIGxlbiA9IGNvZGVQb2ludHMubGVuZ3RoXG4gIGlmIChsZW4gPD0gTUFYX0FSR1VNRU5UU19MRU5HVEgpIHtcbiAgICByZXR1cm4gU3RyaW5nLmZyb21DaGFyQ29kZS5hcHBseShTdHJpbmcsIGNvZGVQb2ludHMpIC8vIGF2b2lkIGV4dHJhIHNsaWNlKClcbiAgfVxuXG4gIC8vIERlY29kZSBpbiBjaHVua3MgdG8gYXZvaWQgXCJjYWxsIHN0YWNrIHNpemUgZXhjZWVkZWRcIi5cbiAgdmFyIHJlcyA9ICcnXG4gIHZhciBpID0gMFxuICB3aGlsZSAoaSA8IGxlbikge1xuICAgIHJlcyArPSBTdHJpbmcuZnJvbUNoYXJDb2RlLmFwcGx5KFxuICAgICAgU3RyaW5nLFxuICAgICAgY29kZVBvaW50cy5zbGljZShpLCBpICs9IE1BWF9BUkdVTUVOVFNfTEVOR1RIKVxuICAgIClcbiAgfVxuICByZXR1cm4gcmVzXG59XG5cbmZ1bmN0aW9uIGFzY2lpU2xpY2UgKGJ1Ziwgc3RhcnQsIGVuZCkge1xuICB2YXIgcmV0ID0gJydcbiAgZW5kID0gTWF0aC5taW4oYnVmLmxlbmd0aCwgZW5kKVxuXG4gIGZvciAodmFyIGkgPSBzdGFydDsgaSA8IGVuZDsgKytpKSB7XG4gICAgcmV0ICs9IFN0cmluZy5mcm9tQ2hhckNvZGUoYnVmW2ldICYgMHg3RilcbiAgfVxuICByZXR1cm4gcmV0XG59XG5cbmZ1bmN0aW9uIGxhdGluMVNsaWNlIChidWYsIHN0YXJ0LCBlbmQpIHtcbiAgdmFyIHJldCA9ICcnXG4gIGVuZCA9IE1hdGgubWluKGJ1Zi5sZW5ndGgsIGVuZClcblxuICBmb3IgKHZhciBpID0gc3RhcnQ7IGkgPCBlbmQ7ICsraSkge1xuICAgIHJldCArPSBTdHJpbmcuZnJvbUNoYXJDb2RlKGJ1ZltpXSlcbiAgfVxuICByZXR1cm4gcmV0XG59XG5cbmZ1bmN0aW9uIGhleFNsaWNlIChidWYsIHN0YXJ0LCBlbmQpIHtcbiAgdmFyIGxlbiA9IGJ1Zi5sZW5ndGhcblxuICBpZiAoIXN0YXJ0IHx8IHN0YXJ0IDwgMCkgc3RhcnQgPSAwXG4gIGlmICghZW5kIHx8IGVuZCA8IDAgfHwgZW5kID4gbGVuKSBlbmQgPSBsZW5cblxuICB2YXIgb3V0ID0gJydcbiAgZm9yICh2YXIgaSA9IHN0YXJ0OyBpIDwgZW5kOyArK2kpIHtcbiAgICBvdXQgKz0gaGV4U2xpY2VMb29rdXBUYWJsZVtidWZbaV1dXG4gIH1cbiAgcmV0dXJuIG91dFxufVxuXG5mdW5jdGlvbiB1dGYxNmxlU2xpY2UgKGJ1Ziwgc3RhcnQsIGVuZCkge1xuICB2YXIgYnl0ZXMgPSBidWYuc2xpY2Uoc3RhcnQsIGVuZClcbiAgdmFyIHJlcyA9ICcnXG4gIGZvciAodmFyIGkgPSAwOyBpIDwgYnl0ZXMubGVuZ3RoOyBpICs9IDIpIHtcbiAgICByZXMgKz0gU3RyaW5nLmZyb21DaGFyQ29kZShieXRlc1tpXSArIChieXRlc1tpICsgMV0gKiAyNTYpKVxuICB9XG4gIHJldHVybiByZXNcbn1cblxuQnVmZmVyLnByb3RvdHlwZS5zbGljZSA9IGZ1bmN0aW9uIHNsaWNlIChzdGFydCwgZW5kKSB7XG4gIHZhciBsZW4gPSB0aGlzLmxlbmd0aFxuICBzdGFydCA9IH5+c3RhcnRcbiAgZW5kID0gZW5kID09PSB1bmRlZmluZWQgPyBsZW4gOiB+fmVuZFxuXG4gIGlmIChzdGFydCA8IDApIHtcbiAgICBzdGFydCArPSBsZW5cbiAgICBpZiAoc3RhcnQgPCAwKSBzdGFydCA9IDBcbiAgfSBlbHNlIGlmIChzdGFydCA+IGxlbikge1xuICAgIHN0YXJ0ID0gbGVuXG4gIH1cblxuICBpZiAoZW5kIDwgMCkge1xuICAgIGVuZCArPSBsZW5cbiAgICBpZiAoZW5kIDwgMCkgZW5kID0gMFxuICB9IGVsc2UgaWYgKGVuZCA+IGxlbikge1xuICAgIGVuZCA9IGxlblxuICB9XG5cbiAgaWYgKGVuZCA8IHN0YXJ0KSBlbmQgPSBzdGFydFxuXG4gIHZhciBuZXdCdWYgPSB0aGlzLnN1YmFycmF5KHN0YXJ0LCBlbmQpXG4gIC8vIFJldHVybiBhbiBhdWdtZW50ZWQgYFVpbnQ4QXJyYXlgIGluc3RhbmNlXG4gIE9iamVjdC5zZXRQcm90b3R5cGVPZihuZXdCdWYsIEJ1ZmZlci5wcm90b3R5cGUpXG5cbiAgcmV0dXJuIG5ld0J1ZlxufVxuXG4vKlxuICogTmVlZCB0byBtYWtlIHN1cmUgdGhhdCBidWZmZXIgaXNuJ3QgdHJ5aW5nIHRvIHdyaXRlIG91dCBvZiBib3VuZHMuXG4gKi9cbmZ1bmN0aW9uIGNoZWNrT2Zmc2V0IChvZmZzZXQsIGV4dCwgbGVuZ3RoKSB7XG4gIGlmICgob2Zmc2V0ICUgMSkgIT09IDAgfHwgb2Zmc2V0IDwgMCkgdGhyb3cgbmV3IFJhbmdlRXJyb3IoJ29mZnNldCBpcyBub3QgdWludCcpXG4gIGlmIChvZmZzZXQgKyBleHQgPiBsZW5ndGgpIHRocm93IG5ldyBSYW5nZUVycm9yKCdUcnlpbmcgdG8gYWNjZXNzIGJleW9uZCBidWZmZXIgbGVuZ3RoJylcbn1cblxuQnVmZmVyLnByb3RvdHlwZS5yZWFkVUludExFID0gZnVuY3Rpb24gcmVhZFVJbnRMRSAob2Zmc2V0LCBieXRlTGVuZ3RoLCBub0Fzc2VydCkge1xuICBvZmZzZXQgPSBvZmZzZXQgPj4+IDBcbiAgYnl0ZUxlbmd0aCA9IGJ5dGVMZW5ndGggPj4+IDBcbiAgaWYgKCFub0Fzc2VydCkgY2hlY2tPZmZzZXQob2Zmc2V0LCBieXRlTGVuZ3RoLCB0aGlzLmxlbmd0aClcblxuICB2YXIgdmFsID0gdGhpc1tvZmZzZXRdXG4gIHZhciBtdWwgPSAxXG4gIHZhciBpID0gMFxuICB3aGlsZSAoKytpIDwgYnl0ZUxlbmd0aCAmJiAobXVsICo9IDB4MTAwKSkge1xuICAgIHZhbCArPSB0aGlzW29mZnNldCArIGldICogbXVsXG4gIH1cblxuICByZXR1cm4gdmFsXG59XG5cbkJ1ZmZlci5wcm90b3R5cGUucmVhZFVJbnRCRSA9IGZ1bmN0aW9uIHJlYWRVSW50QkUgKG9mZnNldCwgYnl0ZUxlbmd0aCwgbm9Bc3NlcnQpIHtcbiAgb2Zmc2V0ID0gb2Zmc2V0ID4+PiAwXG4gIGJ5dGVMZW5ndGggPSBieXRlTGVuZ3RoID4+PiAwXG4gIGlmICghbm9Bc3NlcnQpIHtcbiAgICBjaGVja09mZnNldChvZmZzZXQsIGJ5dGVMZW5ndGgsIHRoaXMubGVuZ3RoKVxuICB9XG5cbiAgdmFyIHZhbCA9IHRoaXNbb2Zmc2V0ICsgLS1ieXRlTGVuZ3RoXVxuICB2YXIgbXVsID0gMVxuICB3aGlsZSAoYnl0ZUxlbmd0aCA+IDAgJiYgKG11bCAqPSAweDEwMCkpIHtcbiAgICB2YWwgKz0gdGhpc1tvZmZzZXQgKyAtLWJ5dGVMZW5ndGhdICogbXVsXG4gIH1cblxuICByZXR1cm4gdmFsXG59XG5cbkJ1ZmZlci5wcm90b3R5cGUucmVhZFVJbnQ4ID0gZnVuY3Rpb24gcmVhZFVJbnQ4IChvZmZzZXQsIG5vQXNzZXJ0KSB7XG4gIG9mZnNldCA9IG9mZnNldCA+Pj4gMFxuICBpZiAoIW5vQXNzZXJ0KSBjaGVja09mZnNldChvZmZzZXQsIDEsIHRoaXMubGVuZ3RoKVxuICByZXR1cm4gdGhpc1tvZmZzZXRdXG59XG5cbkJ1ZmZlci5wcm90b3R5cGUucmVhZFVJbnQxNkxFID0gZnVuY3Rpb24gcmVhZFVJbnQxNkxFIChvZmZzZXQsIG5vQXNzZXJ0KSB7XG4gIG9mZnNldCA9IG9mZnNldCA+Pj4gMFxuICBpZiAoIW5vQXNzZXJ0KSBjaGVja09mZnNldChvZmZzZXQsIDIsIHRoaXMubGVuZ3RoKVxuICByZXR1cm4gdGhpc1tvZmZzZXRdIHwgKHRoaXNbb2Zmc2V0ICsgMV0gPDwgOClcbn1cblxuQnVmZmVyLnByb3RvdHlwZS5yZWFkVUludDE2QkUgPSBmdW5jdGlvbiByZWFkVUludDE2QkUgKG9mZnNldCwgbm9Bc3NlcnQpIHtcbiAgb2Zmc2V0ID0gb2Zmc2V0ID4+PiAwXG4gIGlmICghbm9Bc3NlcnQpIGNoZWNrT2Zmc2V0KG9mZnNldCwgMiwgdGhpcy5sZW5ndGgpXG4gIHJldHVybiAodGhpc1tvZmZzZXRdIDw8IDgpIHwgdGhpc1tvZmZzZXQgKyAxXVxufVxuXG5CdWZmZXIucHJvdG90eXBlLnJlYWRVSW50MzJMRSA9IGZ1bmN0aW9uIHJlYWRVSW50MzJMRSAob2Zmc2V0LCBub0Fzc2VydCkge1xuICBvZmZzZXQgPSBvZmZzZXQgPj4+IDBcbiAgaWYgKCFub0Fzc2VydCkgY2hlY2tPZmZzZXQob2Zmc2V0LCA0LCB0aGlzLmxlbmd0aClcblxuICByZXR1cm4gKCh0aGlzW29mZnNldF0pIHxcbiAgICAgICh0aGlzW29mZnNldCArIDFdIDw8IDgpIHxcbiAgICAgICh0aGlzW29mZnNldCArIDJdIDw8IDE2KSkgK1xuICAgICAgKHRoaXNbb2Zmc2V0ICsgM10gKiAweDEwMDAwMDApXG59XG5cbkJ1ZmZlci5wcm90b3R5cGUucmVhZFVJbnQzMkJFID0gZnVuY3Rpb24gcmVhZFVJbnQzMkJFIChvZmZzZXQsIG5vQXNzZXJ0KSB7XG4gIG9mZnNldCA9IG9mZnNldCA+Pj4gMFxuICBpZiAoIW5vQXNzZXJ0KSBjaGVja09mZnNldChvZmZzZXQsIDQsIHRoaXMubGVuZ3RoKVxuXG4gIHJldHVybiAodGhpc1tvZmZzZXRdICogMHgxMDAwMDAwKSArXG4gICAgKCh0aGlzW29mZnNldCArIDFdIDw8IDE2KSB8XG4gICAgKHRoaXNbb2Zmc2V0ICsgMl0gPDwgOCkgfFxuICAgIHRoaXNbb2Zmc2V0ICsgM10pXG59XG5cbkJ1ZmZlci5wcm90b3R5cGUucmVhZEludExFID0gZnVuY3Rpb24gcmVhZEludExFIChvZmZzZXQsIGJ5dGVMZW5ndGgsIG5vQXNzZXJ0KSB7XG4gIG9mZnNldCA9IG9mZnNldCA+Pj4gMFxuICBieXRlTGVuZ3RoID0gYnl0ZUxlbmd0aCA+Pj4gMFxuICBpZiAoIW5vQXNzZXJ0KSBjaGVja09mZnNldChvZmZzZXQsIGJ5dGVMZW5ndGgsIHRoaXMubGVuZ3RoKVxuXG4gIHZhciB2YWwgPSB0aGlzW29mZnNldF1cbiAgdmFyIG11bCA9IDFcbiAgdmFyIGkgPSAwXG4gIHdoaWxlICgrK2kgPCBieXRlTGVuZ3RoICYmIChtdWwgKj0gMHgxMDApKSB7XG4gICAgdmFsICs9IHRoaXNbb2Zmc2V0ICsgaV0gKiBtdWxcbiAgfVxuICBtdWwgKj0gMHg4MFxuXG4gIGlmICh2YWwgPj0gbXVsKSB2YWwgLT0gTWF0aC5wb3coMiwgOCAqIGJ5dGVMZW5ndGgpXG5cbiAgcmV0dXJuIHZhbFxufVxuXG5CdWZmZXIucHJvdG90eXBlLnJlYWRJbnRCRSA9IGZ1bmN0aW9uIHJlYWRJbnRCRSAob2Zmc2V0LCBieXRlTGVuZ3RoLCBub0Fzc2VydCkge1xuICBvZmZzZXQgPSBvZmZzZXQgPj4+IDBcbiAgYnl0ZUxlbmd0aCA9IGJ5dGVMZW5ndGggPj4+IDBcbiAgaWYgKCFub0Fzc2VydCkgY2hlY2tPZmZzZXQob2Zmc2V0LCBieXRlTGVuZ3RoLCB0aGlzLmxlbmd0aClcblxuICB2YXIgaSA9IGJ5dGVMZW5ndGhcbiAgdmFyIG11bCA9IDFcbiAgdmFyIHZhbCA9IHRoaXNbb2Zmc2V0ICsgLS1pXVxuICB3aGlsZSAoaSA+IDAgJiYgKG11bCAqPSAweDEwMCkpIHtcbiAgICB2YWwgKz0gdGhpc1tvZmZzZXQgKyAtLWldICogbXVsXG4gIH1cbiAgbXVsICo9IDB4ODBcblxuICBpZiAodmFsID49IG11bCkgdmFsIC09IE1hdGgucG93KDIsIDggKiBieXRlTGVuZ3RoKVxuXG4gIHJldHVybiB2YWxcbn1cblxuQnVmZmVyLnByb3RvdHlwZS5yZWFkSW50OCA9IGZ1bmN0aW9uIHJlYWRJbnQ4IChvZmZzZXQsIG5vQXNzZXJ0KSB7XG4gIG9mZnNldCA9IG9mZnNldCA+Pj4gMFxuICBpZiAoIW5vQXNzZXJ0KSBjaGVja09mZnNldChvZmZzZXQsIDEsIHRoaXMubGVuZ3RoKVxuICBpZiAoISh0aGlzW29mZnNldF0gJiAweDgwKSkgcmV0dXJuICh0aGlzW29mZnNldF0pXG4gIHJldHVybiAoKDB4ZmYgLSB0aGlzW29mZnNldF0gKyAxKSAqIC0xKVxufVxuXG5CdWZmZXIucHJvdG90eXBlLnJlYWRJbnQxNkxFID0gZnVuY3Rpb24gcmVhZEludDE2TEUgKG9mZnNldCwgbm9Bc3NlcnQpIHtcbiAgb2Zmc2V0ID0gb2Zmc2V0ID4+PiAwXG4gIGlmICghbm9Bc3NlcnQpIGNoZWNrT2Zmc2V0KG9mZnNldCwgMiwgdGhpcy5sZW5ndGgpXG4gIHZhciB2YWwgPSB0aGlzW29mZnNldF0gfCAodGhpc1tvZmZzZXQgKyAxXSA8PCA4KVxuICByZXR1cm4gKHZhbCAmIDB4ODAwMCkgPyB2YWwgfCAweEZGRkYwMDAwIDogdmFsXG59XG5cbkJ1ZmZlci5wcm90b3R5cGUucmVhZEludDE2QkUgPSBmdW5jdGlvbiByZWFkSW50MTZCRSAob2Zmc2V0LCBub0Fzc2VydCkge1xuICBvZmZzZXQgPSBvZmZzZXQgPj4+IDBcbiAgaWYgKCFub0Fzc2VydCkgY2hlY2tPZmZzZXQob2Zmc2V0LCAyLCB0aGlzLmxlbmd0aClcbiAgdmFyIHZhbCA9IHRoaXNbb2Zmc2V0ICsgMV0gfCAodGhpc1tvZmZzZXRdIDw8IDgpXG4gIHJldHVybiAodmFsICYgMHg4MDAwKSA/IHZhbCB8IDB4RkZGRjAwMDAgOiB2YWxcbn1cblxuQnVmZmVyLnByb3RvdHlwZS5yZWFkSW50MzJMRSA9IGZ1bmN0aW9uIHJlYWRJbnQzMkxFIChvZmZzZXQsIG5vQXNzZXJ0KSB7XG4gIG9mZnNldCA9IG9mZnNldCA+Pj4gMFxuICBpZiAoIW5vQXNzZXJ0KSBjaGVja09mZnNldChvZmZzZXQsIDQsIHRoaXMubGVuZ3RoKVxuXG4gIHJldHVybiAodGhpc1tvZmZzZXRdKSB8XG4gICAgKHRoaXNbb2Zmc2V0ICsgMV0gPDwgOCkgfFxuICAgICh0aGlzW29mZnNldCArIDJdIDw8IDE2KSB8XG4gICAgKHRoaXNbb2Zmc2V0ICsgM10gPDwgMjQpXG59XG5cbkJ1ZmZlci5wcm90b3R5cGUucmVhZEludDMyQkUgPSBmdW5jdGlvbiByZWFkSW50MzJCRSAob2Zmc2V0LCBub0Fzc2VydCkge1xuICBvZmZzZXQgPSBvZmZzZXQgPj4+IDBcbiAgaWYgKCFub0Fzc2VydCkgY2hlY2tPZmZzZXQob2Zmc2V0LCA0LCB0aGlzLmxlbmd0aClcblxuICByZXR1cm4gKHRoaXNbb2Zmc2V0XSA8PCAyNCkgfFxuICAgICh0aGlzW29mZnNldCArIDFdIDw8IDE2KSB8XG4gICAgKHRoaXNbb2Zmc2V0ICsgMl0gPDwgOCkgfFxuICAgICh0aGlzW29mZnNldCArIDNdKVxufVxuXG5CdWZmZXIucHJvdG90eXBlLnJlYWRGbG9hdExFID0gZnVuY3Rpb24gcmVhZEZsb2F0TEUgKG9mZnNldCwgbm9Bc3NlcnQpIHtcbiAgb2Zmc2V0ID0gb2Zmc2V0ID4+PiAwXG4gIGlmICghbm9Bc3NlcnQpIGNoZWNrT2Zmc2V0KG9mZnNldCwgNCwgdGhpcy5sZW5ndGgpXG4gIHJldHVybiBpZWVlNzU0LnJlYWQodGhpcywgb2Zmc2V0LCB0cnVlLCAyMywgNClcbn1cblxuQnVmZmVyLnByb3RvdHlwZS5yZWFkRmxvYXRCRSA9IGZ1bmN0aW9uIHJlYWRGbG9hdEJFIChvZmZzZXQsIG5vQXNzZXJ0KSB7XG4gIG9mZnNldCA9IG9mZnNldCA+Pj4gMFxuICBpZiAoIW5vQXNzZXJ0KSBjaGVja09mZnNldChvZmZzZXQsIDQsIHRoaXMubGVuZ3RoKVxuICByZXR1cm4gaWVlZTc1NC5yZWFkKHRoaXMsIG9mZnNldCwgZmFsc2UsIDIzLCA0KVxufVxuXG5CdWZmZXIucHJvdG90eXBlLnJlYWREb3VibGVMRSA9IGZ1bmN0aW9uIHJlYWREb3VibGVMRSAob2Zmc2V0LCBub0Fzc2VydCkge1xuICBvZmZzZXQgPSBvZmZzZXQgPj4+IDBcbiAgaWYgKCFub0Fzc2VydCkgY2hlY2tPZmZzZXQob2Zmc2V0LCA4LCB0aGlzLmxlbmd0aClcbiAgcmV0dXJuIGllZWU3NTQucmVhZCh0aGlzLCBvZmZzZXQsIHRydWUsIDUyLCA4KVxufVxuXG5CdWZmZXIucHJvdG90eXBlLnJlYWREb3VibGVCRSA9IGZ1bmN0aW9uIHJlYWREb3VibGVCRSAob2Zmc2V0LCBub0Fzc2VydCkge1xuICBvZmZzZXQgPSBvZmZzZXQgPj4+IDBcbiAgaWYgKCFub0Fzc2VydCkgY2hlY2tPZmZzZXQob2Zmc2V0LCA4LCB0aGlzLmxlbmd0aClcbiAgcmV0dXJuIGllZWU3NTQucmVhZCh0aGlzLCBvZmZzZXQsIGZhbHNlLCA1MiwgOClcbn1cblxuZnVuY3Rpb24gY2hlY2tJbnQgKGJ1ZiwgdmFsdWUsIG9mZnNldCwgZXh0LCBtYXgsIG1pbikge1xuICBpZiAoIUJ1ZmZlci5pc0J1ZmZlcihidWYpKSB0aHJvdyBuZXcgVHlwZUVycm9yKCdcImJ1ZmZlclwiIGFyZ3VtZW50IG11c3QgYmUgYSBCdWZmZXIgaW5zdGFuY2UnKVxuICBpZiAodmFsdWUgPiBtYXggfHwgdmFsdWUgPCBtaW4pIHRocm93IG5ldyBSYW5nZUVycm9yKCdcInZhbHVlXCIgYXJndW1lbnQgaXMgb3V0IG9mIGJvdW5kcycpXG4gIGlmIChvZmZzZXQgKyBleHQgPiBidWYubGVuZ3RoKSB0aHJvdyBuZXcgUmFuZ2VFcnJvcignSW5kZXggb3V0IG9mIHJhbmdlJylcbn1cblxuQnVmZmVyLnByb3RvdHlwZS53cml0ZVVJbnRMRSA9IGZ1bmN0aW9uIHdyaXRlVUludExFICh2YWx1ZSwgb2Zmc2V0LCBieXRlTGVuZ3RoLCBub0Fzc2VydCkge1xuICB2YWx1ZSA9ICt2YWx1ZVxuICBvZmZzZXQgPSBvZmZzZXQgPj4+IDBcbiAgYnl0ZUxlbmd0aCA9IGJ5dGVMZW5ndGggPj4+IDBcbiAgaWYgKCFub0Fzc2VydCkge1xuICAgIHZhciBtYXhCeXRlcyA9IE1hdGgucG93KDIsIDggKiBieXRlTGVuZ3RoKSAtIDFcbiAgICBjaGVja0ludCh0aGlzLCB2YWx1ZSwgb2Zmc2V0LCBieXRlTGVuZ3RoLCBtYXhCeXRlcywgMClcbiAgfVxuXG4gIHZhciBtdWwgPSAxXG4gIHZhciBpID0gMFxuICB0aGlzW29mZnNldF0gPSB2YWx1ZSAmIDB4RkZcbiAgd2hpbGUgKCsraSA8IGJ5dGVMZW5ndGggJiYgKG11bCAqPSAweDEwMCkpIHtcbiAgICB0aGlzW29mZnNldCArIGldID0gKHZhbHVlIC8gbXVsKSAmIDB4RkZcbiAgfVxuXG4gIHJldHVybiBvZmZzZXQgKyBieXRlTGVuZ3RoXG59XG5cbkJ1ZmZlci5wcm90b3R5cGUud3JpdGVVSW50QkUgPSBmdW5jdGlvbiB3cml0ZVVJbnRCRSAodmFsdWUsIG9mZnNldCwgYnl0ZUxlbmd0aCwgbm9Bc3NlcnQpIHtcbiAgdmFsdWUgPSArdmFsdWVcbiAgb2Zmc2V0ID0gb2Zmc2V0ID4+PiAwXG4gIGJ5dGVMZW5ndGggPSBieXRlTGVuZ3RoID4+PiAwXG4gIGlmICghbm9Bc3NlcnQpIHtcbiAgICB2YXIgbWF4Qnl0ZXMgPSBNYXRoLnBvdygyLCA4ICogYnl0ZUxlbmd0aCkgLSAxXG4gICAgY2hlY2tJbnQodGhpcywgdmFsdWUsIG9mZnNldCwgYnl0ZUxlbmd0aCwgbWF4Qnl0ZXMsIDApXG4gIH1cblxuICB2YXIgaSA9IGJ5dGVMZW5ndGggLSAxXG4gIHZhciBtdWwgPSAxXG4gIHRoaXNbb2Zmc2V0ICsgaV0gPSB2YWx1ZSAmIDB4RkZcbiAgd2hpbGUgKC0taSA+PSAwICYmIChtdWwgKj0gMHgxMDApKSB7XG4gICAgdGhpc1tvZmZzZXQgKyBpXSA9ICh2YWx1ZSAvIG11bCkgJiAweEZGXG4gIH1cblxuICByZXR1cm4gb2Zmc2V0ICsgYnl0ZUxlbmd0aFxufVxuXG5CdWZmZXIucHJvdG90eXBlLndyaXRlVUludDggPSBmdW5jdGlvbiB3cml0ZVVJbnQ4ICh2YWx1ZSwgb2Zmc2V0LCBub0Fzc2VydCkge1xuICB2YWx1ZSA9ICt2YWx1ZVxuICBvZmZzZXQgPSBvZmZzZXQgPj4+IDBcbiAgaWYgKCFub0Fzc2VydCkgY2hlY2tJbnQodGhpcywgdmFsdWUsIG9mZnNldCwgMSwgMHhmZiwgMClcbiAgdGhpc1tvZmZzZXRdID0gKHZhbHVlICYgMHhmZilcbiAgcmV0dXJuIG9mZnNldCArIDFcbn1cblxuQnVmZmVyLnByb3RvdHlwZS53cml0ZVVJbnQxNkxFID0gZnVuY3Rpb24gd3JpdGVVSW50MTZMRSAodmFsdWUsIG9mZnNldCwgbm9Bc3NlcnQpIHtcbiAgdmFsdWUgPSArdmFsdWVcbiAgb2Zmc2V0ID0gb2Zmc2V0ID4+PiAwXG4gIGlmICghbm9Bc3NlcnQpIGNoZWNrSW50KHRoaXMsIHZhbHVlLCBvZmZzZXQsIDIsIDB4ZmZmZiwgMClcbiAgdGhpc1tvZmZzZXRdID0gKHZhbHVlICYgMHhmZilcbiAgdGhpc1tvZmZzZXQgKyAxXSA9ICh2YWx1ZSA+Pj4gOClcbiAgcmV0dXJuIG9mZnNldCArIDJcbn1cblxuQnVmZmVyLnByb3RvdHlwZS53cml0ZVVJbnQxNkJFID0gZnVuY3Rpb24gd3JpdGVVSW50MTZCRSAodmFsdWUsIG9mZnNldCwgbm9Bc3NlcnQpIHtcbiAgdmFsdWUgPSArdmFsdWVcbiAgb2Zmc2V0ID0gb2Zmc2V0ID4+PiAwXG4gIGlmICghbm9Bc3NlcnQpIGNoZWNrSW50KHRoaXMsIHZhbHVlLCBvZmZzZXQsIDIsIDB4ZmZmZiwgMClcbiAgdGhpc1tvZmZzZXRdID0gKHZhbHVlID4+PiA4KVxuICB0aGlzW29mZnNldCArIDFdID0gKHZhbHVlICYgMHhmZilcbiAgcmV0dXJuIG9mZnNldCArIDJcbn1cblxuQnVmZmVyLnByb3RvdHlwZS53cml0ZVVJbnQzMkxFID0gZnVuY3Rpb24gd3JpdGVVSW50MzJMRSAodmFsdWUsIG9mZnNldCwgbm9Bc3NlcnQpIHtcbiAgdmFsdWUgPSArdmFsdWVcbiAgb2Zmc2V0ID0gb2Zmc2V0ID4+PiAwXG4gIGlmICghbm9Bc3NlcnQpIGNoZWNrSW50KHRoaXMsIHZhbHVlLCBvZmZzZXQsIDQsIDB4ZmZmZmZmZmYsIDApXG4gIHRoaXNbb2Zmc2V0ICsgM10gPSAodmFsdWUgPj4+IDI0KVxuICB0aGlzW29mZnNldCArIDJdID0gKHZhbHVlID4+PiAxNilcbiAgdGhpc1tvZmZzZXQgKyAxXSA9ICh2YWx1ZSA+Pj4gOClcbiAgdGhpc1tvZmZzZXRdID0gKHZhbHVlICYgMHhmZilcbiAgcmV0dXJuIG9mZnNldCArIDRcbn1cblxuQnVmZmVyLnByb3RvdHlwZS53cml0ZVVJbnQzMkJFID0gZnVuY3Rpb24gd3JpdGVVSW50MzJCRSAodmFsdWUsIG9mZnNldCwgbm9Bc3NlcnQpIHtcbiAgdmFsdWUgPSArdmFsdWVcbiAgb2Zmc2V0ID0gb2Zmc2V0ID4+PiAwXG4gIGlmICghbm9Bc3NlcnQpIGNoZWNrSW50KHRoaXMsIHZhbHVlLCBvZmZzZXQsIDQsIDB4ZmZmZmZmZmYsIDApXG4gIHRoaXNbb2Zmc2V0XSA9ICh2YWx1ZSA+Pj4gMjQpXG4gIHRoaXNbb2Zmc2V0ICsgMV0gPSAodmFsdWUgPj4+IDE2KVxuICB0aGlzW29mZnNldCArIDJdID0gKHZhbHVlID4+PiA4KVxuICB0aGlzW29mZnNldCArIDNdID0gKHZhbHVlICYgMHhmZilcbiAgcmV0dXJuIG9mZnNldCArIDRcbn1cblxuQnVmZmVyLnByb3RvdHlwZS53cml0ZUludExFID0gZnVuY3Rpb24gd3JpdGVJbnRMRSAodmFsdWUsIG9mZnNldCwgYnl0ZUxlbmd0aCwgbm9Bc3NlcnQpIHtcbiAgdmFsdWUgPSArdmFsdWVcbiAgb2Zmc2V0ID0gb2Zmc2V0ID4+PiAwXG4gIGlmICghbm9Bc3NlcnQpIHtcbiAgICB2YXIgbGltaXQgPSBNYXRoLnBvdygyLCAoOCAqIGJ5dGVMZW5ndGgpIC0gMSlcblxuICAgIGNoZWNrSW50KHRoaXMsIHZhbHVlLCBvZmZzZXQsIGJ5dGVMZW5ndGgsIGxpbWl0IC0gMSwgLWxpbWl0KVxuICB9XG5cbiAgdmFyIGkgPSAwXG4gIHZhciBtdWwgPSAxXG4gIHZhciBzdWIgPSAwXG4gIHRoaXNbb2Zmc2V0XSA9IHZhbHVlICYgMHhGRlxuICB3aGlsZSAoKytpIDwgYnl0ZUxlbmd0aCAmJiAobXVsICo9IDB4MTAwKSkge1xuICAgIGlmICh2YWx1ZSA8IDAgJiYgc3ViID09PSAwICYmIHRoaXNbb2Zmc2V0ICsgaSAtIDFdICE9PSAwKSB7XG4gICAgICBzdWIgPSAxXG4gICAgfVxuICAgIHRoaXNbb2Zmc2V0ICsgaV0gPSAoKHZhbHVlIC8gbXVsKSA+PiAwKSAtIHN1YiAmIDB4RkZcbiAgfVxuXG4gIHJldHVybiBvZmZzZXQgKyBieXRlTGVuZ3RoXG59XG5cbkJ1ZmZlci5wcm90b3R5cGUud3JpdGVJbnRCRSA9IGZ1bmN0aW9uIHdyaXRlSW50QkUgKHZhbHVlLCBvZmZzZXQsIGJ5dGVMZW5ndGgsIG5vQXNzZXJ0KSB7XG4gIHZhbHVlID0gK3ZhbHVlXG4gIG9mZnNldCA9IG9mZnNldCA+Pj4gMFxuICBpZiAoIW5vQXNzZXJ0KSB7XG4gICAgdmFyIGxpbWl0ID0gTWF0aC5wb3coMiwgKDggKiBieXRlTGVuZ3RoKSAtIDEpXG5cbiAgICBjaGVja0ludCh0aGlzLCB2YWx1ZSwgb2Zmc2V0LCBieXRlTGVuZ3RoLCBsaW1pdCAtIDEsIC1saW1pdClcbiAgfVxuXG4gIHZhciBpID0gYnl0ZUxlbmd0aCAtIDFcbiAgdmFyIG11bCA9IDFcbiAgdmFyIHN1YiA9IDBcbiAgdGhpc1tvZmZzZXQgKyBpXSA9IHZhbHVlICYgMHhGRlxuICB3aGlsZSAoLS1pID49IDAgJiYgKG11bCAqPSAweDEwMCkpIHtcbiAgICBpZiAodmFsdWUgPCAwICYmIHN1YiA9PT0gMCAmJiB0aGlzW29mZnNldCArIGkgKyAxXSAhPT0gMCkge1xuICAgICAgc3ViID0gMVxuICAgIH1cbiAgICB0aGlzW29mZnNldCArIGldID0gKCh2YWx1ZSAvIG11bCkgPj4gMCkgLSBzdWIgJiAweEZGXG4gIH1cblxuICByZXR1cm4gb2Zmc2V0ICsgYnl0ZUxlbmd0aFxufVxuXG5CdWZmZXIucHJvdG90eXBlLndyaXRlSW50OCA9IGZ1bmN0aW9uIHdyaXRlSW50OCAodmFsdWUsIG9mZnNldCwgbm9Bc3NlcnQpIHtcbiAgdmFsdWUgPSArdmFsdWVcbiAgb2Zmc2V0ID0gb2Zmc2V0ID4+PiAwXG4gIGlmICghbm9Bc3NlcnQpIGNoZWNrSW50KHRoaXMsIHZhbHVlLCBvZmZzZXQsIDEsIDB4N2YsIC0weDgwKVxuICBpZiAodmFsdWUgPCAwKSB2YWx1ZSA9IDB4ZmYgKyB2YWx1ZSArIDFcbiAgdGhpc1tvZmZzZXRdID0gKHZhbHVlICYgMHhmZilcbiAgcmV0dXJuIG9mZnNldCArIDFcbn1cblxuQnVmZmVyLnByb3RvdHlwZS53cml0ZUludDE2TEUgPSBmdW5jdGlvbiB3cml0ZUludDE2TEUgKHZhbHVlLCBvZmZzZXQsIG5vQXNzZXJ0KSB7XG4gIHZhbHVlID0gK3ZhbHVlXG4gIG9mZnNldCA9IG9mZnNldCA+Pj4gMFxuICBpZiAoIW5vQXNzZXJ0KSBjaGVja0ludCh0aGlzLCB2YWx1ZSwgb2Zmc2V0LCAyLCAweDdmZmYsIC0weDgwMDApXG4gIHRoaXNbb2Zmc2V0XSA9ICh2YWx1ZSAmIDB4ZmYpXG4gIHRoaXNbb2Zmc2V0ICsgMV0gPSAodmFsdWUgPj4+IDgpXG4gIHJldHVybiBvZmZzZXQgKyAyXG59XG5cbkJ1ZmZlci5wcm90b3R5cGUud3JpdGVJbnQxNkJFID0gZnVuY3Rpb24gd3JpdGVJbnQxNkJFICh2YWx1ZSwgb2Zmc2V0LCBub0Fzc2VydCkge1xuICB2YWx1ZSA9ICt2YWx1ZVxuICBvZmZzZXQgPSBvZmZzZXQgPj4+IDBcbiAgaWYgKCFub0Fzc2VydCkgY2hlY2tJbnQodGhpcywgdmFsdWUsIG9mZnNldCwgMiwgMHg3ZmZmLCAtMHg4MDAwKVxuICB0aGlzW29mZnNldF0gPSAodmFsdWUgPj4+IDgpXG4gIHRoaXNbb2Zmc2V0ICsgMV0gPSAodmFsdWUgJiAweGZmKVxuICByZXR1cm4gb2Zmc2V0ICsgMlxufVxuXG5CdWZmZXIucHJvdG90eXBlLndyaXRlSW50MzJMRSA9IGZ1bmN0aW9uIHdyaXRlSW50MzJMRSAodmFsdWUsIG9mZnNldCwgbm9Bc3NlcnQpIHtcbiAgdmFsdWUgPSArdmFsdWVcbiAgb2Zmc2V0ID0gb2Zmc2V0ID4+PiAwXG4gIGlmICghbm9Bc3NlcnQpIGNoZWNrSW50KHRoaXMsIHZhbHVlLCBvZmZzZXQsIDQsIDB4N2ZmZmZmZmYsIC0weDgwMDAwMDAwKVxuICB0aGlzW29mZnNldF0gPSAodmFsdWUgJiAweGZmKVxuICB0aGlzW29mZnNldCArIDFdID0gKHZhbHVlID4+PiA4KVxuICB0aGlzW29mZnNldCArIDJdID0gKHZhbHVlID4+PiAxNilcbiAgdGhpc1tvZmZzZXQgKyAzXSA9ICh2YWx1ZSA+Pj4gMjQpXG4gIHJldHVybiBvZmZzZXQgKyA0XG59XG5cbkJ1ZmZlci5wcm90b3R5cGUud3JpdGVJbnQzMkJFID0gZnVuY3Rpb24gd3JpdGVJbnQzMkJFICh2YWx1ZSwgb2Zmc2V0LCBub0Fzc2VydCkge1xuICB2YWx1ZSA9ICt2YWx1ZVxuICBvZmZzZXQgPSBvZmZzZXQgPj4+IDBcbiAgaWYgKCFub0Fzc2VydCkgY2hlY2tJbnQodGhpcywgdmFsdWUsIG9mZnNldCwgNCwgMHg3ZmZmZmZmZiwgLTB4ODAwMDAwMDApXG4gIGlmICh2YWx1ZSA8IDApIHZhbHVlID0gMHhmZmZmZmZmZiArIHZhbHVlICsgMVxuICB0aGlzW29mZnNldF0gPSAodmFsdWUgPj4+IDI0KVxuICB0aGlzW29mZnNldCArIDFdID0gKHZhbHVlID4+PiAxNilcbiAgdGhpc1tvZmZzZXQgKyAyXSA9ICh2YWx1ZSA+Pj4gOClcbiAgdGhpc1tvZmZzZXQgKyAzXSA9ICh2YWx1ZSAmIDB4ZmYpXG4gIHJldHVybiBvZmZzZXQgKyA0XG59XG5cbmZ1bmN0aW9uIGNoZWNrSUVFRTc1NCAoYnVmLCB2YWx1ZSwgb2Zmc2V0LCBleHQsIG1heCwgbWluKSB7XG4gIGlmIChvZmZzZXQgKyBleHQgPiBidWYubGVuZ3RoKSB0aHJvdyBuZXcgUmFuZ2VFcnJvcignSW5kZXggb3V0IG9mIHJhbmdlJylcbiAgaWYgKG9mZnNldCA8IDApIHRocm93IG5ldyBSYW5nZUVycm9yKCdJbmRleCBvdXQgb2YgcmFuZ2UnKVxufVxuXG5mdW5jdGlvbiB3cml0ZUZsb2F0IChidWYsIHZhbHVlLCBvZmZzZXQsIGxpdHRsZUVuZGlhbiwgbm9Bc3NlcnQpIHtcbiAgdmFsdWUgPSArdmFsdWVcbiAgb2Zmc2V0ID0gb2Zmc2V0ID4+PiAwXG4gIGlmICghbm9Bc3NlcnQpIHtcbiAgICBjaGVja0lFRUU3NTQoYnVmLCB2YWx1ZSwgb2Zmc2V0LCA0LCAzLjQwMjgyMzQ2NjM4NTI4ODZlKzM4LCAtMy40MDI4MjM0NjYzODUyODg2ZSszOClcbiAgfVxuICBpZWVlNzU0LndyaXRlKGJ1ZiwgdmFsdWUsIG9mZnNldCwgbGl0dGxlRW5kaWFuLCAyMywgNClcbiAgcmV0dXJuIG9mZnNldCArIDRcbn1cblxuQnVmZmVyLnByb3RvdHlwZS53cml0ZUZsb2F0TEUgPSBmdW5jdGlvbiB3cml0ZUZsb2F0TEUgKHZhbHVlLCBvZmZzZXQsIG5vQXNzZXJ0KSB7XG4gIHJldHVybiB3cml0ZUZsb2F0KHRoaXMsIHZhbHVlLCBvZmZzZXQsIHRydWUsIG5vQXNzZXJ0KVxufVxuXG5CdWZmZXIucHJvdG90eXBlLndyaXRlRmxvYXRCRSA9IGZ1bmN0aW9uIHdyaXRlRmxvYXRCRSAodmFsdWUsIG9mZnNldCwgbm9Bc3NlcnQpIHtcbiAgcmV0dXJuIHdyaXRlRmxvYXQodGhpcywgdmFsdWUsIG9mZnNldCwgZmFsc2UsIG5vQXNzZXJ0KVxufVxuXG5mdW5jdGlvbiB3cml0ZURvdWJsZSAoYnVmLCB2YWx1ZSwgb2Zmc2V0LCBsaXR0bGVFbmRpYW4sIG5vQXNzZXJ0KSB7XG4gIHZhbHVlID0gK3ZhbHVlXG4gIG9mZnNldCA9IG9mZnNldCA+Pj4gMFxuICBpZiAoIW5vQXNzZXJ0KSB7XG4gICAgY2hlY2tJRUVFNzU0KGJ1ZiwgdmFsdWUsIG9mZnNldCwgOCwgMS43OTc2OTMxMzQ4NjIzMTU3RSszMDgsIC0xLjc5NzY5MzEzNDg2MjMxNTdFKzMwOClcbiAgfVxuICBpZWVlNzU0LndyaXRlKGJ1ZiwgdmFsdWUsIG9mZnNldCwgbGl0dGxlRW5kaWFuLCA1MiwgOClcbiAgcmV0dXJuIG9mZnNldCArIDhcbn1cblxuQnVmZmVyLnByb3RvdHlwZS53cml0ZURvdWJsZUxFID0gZnVuY3Rpb24gd3JpdGVEb3VibGVMRSAodmFsdWUsIG9mZnNldCwgbm9Bc3NlcnQpIHtcbiAgcmV0dXJuIHdyaXRlRG91YmxlKHRoaXMsIHZhbHVlLCBvZmZzZXQsIHRydWUsIG5vQXNzZXJ0KVxufVxuXG5CdWZmZXIucHJvdG90eXBlLndyaXRlRG91YmxlQkUgPSBmdW5jdGlvbiB3cml0ZURvdWJsZUJFICh2YWx1ZSwgb2Zmc2V0LCBub0Fzc2VydCkge1xuICByZXR1cm4gd3JpdGVEb3VibGUodGhpcywgdmFsdWUsIG9mZnNldCwgZmFsc2UsIG5vQXNzZXJ0KVxufVxuXG4vLyBjb3B5KHRhcmdldEJ1ZmZlciwgdGFyZ2V0U3RhcnQ9MCwgc291cmNlU3RhcnQ9MCwgc291cmNlRW5kPWJ1ZmZlci5sZW5ndGgpXG5CdWZmZXIucHJvdG90eXBlLmNvcHkgPSBmdW5jdGlvbiBjb3B5ICh0YXJnZXQsIHRhcmdldFN0YXJ0LCBzdGFydCwgZW5kKSB7XG4gIGlmICghQnVmZmVyLmlzQnVmZmVyKHRhcmdldCkpIHRocm93IG5ldyBUeXBlRXJyb3IoJ2FyZ3VtZW50IHNob3VsZCBiZSBhIEJ1ZmZlcicpXG4gIGlmICghc3RhcnQpIHN0YXJ0ID0gMFxuICBpZiAoIWVuZCAmJiBlbmQgIT09IDApIGVuZCA9IHRoaXMubGVuZ3RoXG4gIGlmICh0YXJnZXRTdGFydCA+PSB0YXJnZXQubGVuZ3RoKSB0YXJnZXRTdGFydCA9IHRhcmdldC5sZW5ndGhcbiAgaWYgKCF0YXJnZXRTdGFydCkgdGFyZ2V0U3RhcnQgPSAwXG4gIGlmIChlbmQgPiAwICYmIGVuZCA8IHN0YXJ0KSBlbmQgPSBzdGFydFxuXG4gIC8vIENvcHkgMCBieXRlczsgd2UncmUgZG9uZVxuICBpZiAoZW5kID09PSBzdGFydCkgcmV0dXJuIDBcbiAgaWYgKHRhcmdldC5sZW5ndGggPT09IDAgfHwgdGhpcy5sZW5ndGggPT09IDApIHJldHVybiAwXG5cbiAgLy8gRmF0YWwgZXJyb3IgY29uZGl0aW9uc1xuICBpZiAodGFyZ2V0U3RhcnQgPCAwKSB7XG4gICAgdGhyb3cgbmV3IFJhbmdlRXJyb3IoJ3RhcmdldFN0YXJ0IG91dCBvZiBib3VuZHMnKVxuICB9XG4gIGlmIChzdGFydCA8IDAgfHwgc3RhcnQgPj0gdGhpcy5sZW5ndGgpIHRocm93IG5ldyBSYW5nZUVycm9yKCdJbmRleCBvdXQgb2YgcmFuZ2UnKVxuICBpZiAoZW5kIDwgMCkgdGhyb3cgbmV3IFJhbmdlRXJyb3IoJ3NvdXJjZUVuZCBvdXQgb2YgYm91bmRzJylcblxuICAvLyBBcmUgd2Ugb29iP1xuICBpZiAoZW5kID4gdGhpcy5sZW5ndGgpIGVuZCA9IHRoaXMubGVuZ3RoXG4gIGlmICh0YXJnZXQubGVuZ3RoIC0gdGFyZ2V0U3RhcnQgPCBlbmQgLSBzdGFydCkge1xuICAgIGVuZCA9IHRhcmdldC5sZW5ndGggLSB0YXJnZXRTdGFydCArIHN0YXJ0XG4gIH1cblxuICB2YXIgbGVuID0gZW5kIC0gc3RhcnRcblxuICBpZiAodGhpcyA9PT0gdGFyZ2V0ICYmIHR5cGVvZiBVaW50OEFycmF5LnByb3RvdHlwZS5jb3B5V2l0aGluID09PSAnZnVuY3Rpb24nKSB7XG4gICAgLy8gVXNlIGJ1aWx0LWluIHdoZW4gYXZhaWxhYmxlLCBtaXNzaW5nIGZyb20gSUUxMVxuICAgIHRoaXMuY29weVdpdGhpbih0YXJnZXRTdGFydCwgc3RhcnQsIGVuZClcbiAgfSBlbHNlIGlmICh0aGlzID09PSB0YXJnZXQgJiYgc3RhcnQgPCB0YXJnZXRTdGFydCAmJiB0YXJnZXRTdGFydCA8IGVuZCkge1xuICAgIC8vIGRlc2NlbmRpbmcgY29weSBmcm9tIGVuZFxuICAgIGZvciAodmFyIGkgPSBsZW4gLSAxOyBpID49IDA7IC0taSkge1xuICAgICAgdGFyZ2V0W2kgKyB0YXJnZXRTdGFydF0gPSB0aGlzW2kgKyBzdGFydF1cbiAgICB9XG4gIH0gZWxzZSB7XG4gICAgVWludDhBcnJheS5wcm90b3R5cGUuc2V0LmNhbGwoXG4gICAgICB0YXJnZXQsXG4gICAgICB0aGlzLnN1YmFycmF5KHN0YXJ0LCBlbmQpLFxuICAgICAgdGFyZ2V0U3RhcnRcbiAgICApXG4gIH1cblxuICByZXR1cm4gbGVuXG59XG5cbi8vIFVzYWdlOlxuLy8gICAgYnVmZmVyLmZpbGwobnVtYmVyWywgb2Zmc2V0WywgZW5kXV0pXG4vLyAgICBidWZmZXIuZmlsbChidWZmZXJbLCBvZmZzZXRbLCBlbmRdXSlcbi8vICAgIGJ1ZmZlci5maWxsKHN0cmluZ1ssIG9mZnNldFssIGVuZF1dWywgZW5jb2RpbmddKVxuQnVmZmVyLnByb3RvdHlwZS5maWxsID0gZnVuY3Rpb24gZmlsbCAodmFsLCBzdGFydCwgZW5kLCBlbmNvZGluZykge1xuICAvLyBIYW5kbGUgc3RyaW5nIGNhc2VzOlxuICBpZiAodHlwZW9mIHZhbCA9PT0gJ3N0cmluZycpIHtcbiAgICBpZiAodHlwZW9mIHN0YXJ0ID09PSAnc3RyaW5nJykge1xuICAgICAgZW5jb2RpbmcgPSBzdGFydFxuICAgICAgc3RhcnQgPSAwXG4gICAgICBlbmQgPSB0aGlzLmxlbmd0aFxuICAgIH0gZWxzZSBpZiAodHlwZW9mIGVuZCA9PT0gJ3N0cmluZycpIHtcbiAgICAgIGVuY29kaW5nID0gZW5kXG4gICAgICBlbmQgPSB0aGlzLmxlbmd0aFxuICAgIH1cbiAgICBpZiAoZW5jb2RpbmcgIT09IHVuZGVmaW5lZCAmJiB0eXBlb2YgZW5jb2RpbmcgIT09ICdzdHJpbmcnKSB7XG4gICAgICB0aHJvdyBuZXcgVHlwZUVycm9yKCdlbmNvZGluZyBtdXN0IGJlIGEgc3RyaW5nJylcbiAgICB9XG4gICAgaWYgKHR5cGVvZiBlbmNvZGluZyA9PT0gJ3N0cmluZycgJiYgIUJ1ZmZlci5pc0VuY29kaW5nKGVuY29kaW5nKSkge1xuICAgICAgdGhyb3cgbmV3IFR5cGVFcnJvcignVW5rbm93biBlbmNvZGluZzogJyArIGVuY29kaW5nKVxuICAgIH1cbiAgICBpZiAodmFsLmxlbmd0aCA9PT0gMSkge1xuICAgICAgdmFyIGNvZGUgPSB2YWwuY2hhckNvZGVBdCgwKVxuICAgICAgaWYgKChlbmNvZGluZyA9PT0gJ3V0ZjgnICYmIGNvZGUgPCAxMjgpIHx8XG4gICAgICAgICAgZW5jb2RpbmcgPT09ICdsYXRpbjEnKSB7XG4gICAgICAgIC8vIEZhc3QgcGF0aDogSWYgYHZhbGAgZml0cyBpbnRvIGEgc2luZ2xlIGJ5dGUsIHVzZSB0aGF0IG51bWVyaWMgdmFsdWUuXG4gICAgICAgIHZhbCA9IGNvZGVcbiAgICAgIH1cbiAgICB9XG4gIH0gZWxzZSBpZiAodHlwZW9mIHZhbCA9PT0gJ251bWJlcicpIHtcbiAgICB2YWwgPSB2YWwgJiAyNTVcbiAgfSBlbHNlIGlmICh0eXBlb2YgdmFsID09PSAnYm9vbGVhbicpIHtcbiAgICB2YWwgPSBOdW1iZXIodmFsKVxuICB9XG5cbiAgLy8gSW52YWxpZCByYW5nZXMgYXJlIG5vdCBzZXQgdG8gYSBkZWZhdWx0LCBzbyBjYW4gcmFuZ2UgY2hlY2sgZWFybHkuXG4gIGlmIChzdGFydCA8IDAgfHwgdGhpcy5sZW5ndGggPCBzdGFydCB8fCB0aGlzLmxlbmd0aCA8IGVuZCkge1xuICAgIHRocm93IG5ldyBSYW5nZUVycm9yKCdPdXQgb2YgcmFuZ2UgaW5kZXgnKVxuICB9XG5cbiAgaWYgKGVuZCA8PSBzdGFydCkge1xuICAgIHJldHVybiB0aGlzXG4gIH1cblxuICBzdGFydCA9IHN0YXJ0ID4+PiAwXG4gIGVuZCA9IGVuZCA9PT0gdW5kZWZpbmVkID8gdGhpcy5sZW5ndGggOiBlbmQgPj4+IDBcblxuICBpZiAoIXZhbCkgdmFsID0gMFxuXG4gIHZhciBpXG4gIGlmICh0eXBlb2YgdmFsID09PSAnbnVtYmVyJykge1xuICAgIGZvciAoaSA9IHN0YXJ0OyBpIDwgZW5kOyArK2kpIHtcbiAgICAgIHRoaXNbaV0gPSB2YWxcbiAgICB9XG4gIH0gZWxzZSB7XG4gICAgdmFyIGJ5dGVzID0gQnVmZmVyLmlzQnVmZmVyKHZhbClcbiAgICAgID8gdmFsXG4gICAgICA6IEJ1ZmZlci5mcm9tKHZhbCwgZW5jb2RpbmcpXG4gICAgdmFyIGxlbiA9IGJ5dGVzLmxlbmd0aFxuICAgIGlmIChsZW4gPT09IDApIHtcbiAgICAgIHRocm93IG5ldyBUeXBlRXJyb3IoJ1RoZSB2YWx1ZSBcIicgKyB2YWwgK1xuICAgICAgICAnXCIgaXMgaW52YWxpZCBmb3IgYXJndW1lbnQgXCJ2YWx1ZVwiJylcbiAgICB9XG4gICAgZm9yIChpID0gMDsgaSA8IGVuZCAtIHN0YXJ0OyArK2kpIHtcbiAgICAgIHRoaXNbaSArIHN0YXJ0XSA9IGJ5dGVzW2kgJSBsZW5dXG4gICAgfVxuICB9XG5cbiAgcmV0dXJuIHRoaXNcbn1cblxuLy8gSEVMUEVSIEZVTkNUSU9OU1xuLy8gPT09PT09PT09PT09PT09PVxuXG52YXIgSU5WQUxJRF9CQVNFNjRfUkUgPSAvW14rLzAtOUEtWmEtei1fXS9nXG5cbmZ1bmN0aW9uIGJhc2U2NGNsZWFuIChzdHIpIHtcbiAgLy8gTm9kZSB0YWtlcyBlcXVhbCBzaWducyBhcyBlbmQgb2YgdGhlIEJhc2U2NCBlbmNvZGluZ1xuICBzdHIgPSBzdHIuc3BsaXQoJz0nKVswXVxuICAvLyBOb2RlIHN0cmlwcyBvdXQgaW52YWxpZCBjaGFyYWN0ZXJzIGxpa2UgXFxuIGFuZCBcXHQgZnJvbSB0aGUgc3RyaW5nLCBiYXNlNjQtanMgZG9lcyBub3RcbiAgc3RyID0gc3RyLnRyaW0oKS5yZXBsYWNlKElOVkFMSURfQkFTRTY0X1JFLCAnJylcbiAgLy8gTm9kZSBjb252ZXJ0cyBzdHJpbmdzIHdpdGggbGVuZ3RoIDwgMiB0byAnJ1xuICBpZiAoc3RyLmxlbmd0aCA8IDIpIHJldHVybiAnJ1xuICAvLyBOb2RlIGFsbG93cyBmb3Igbm9uLXBhZGRlZCBiYXNlNjQgc3RyaW5ncyAobWlzc2luZyB0cmFpbGluZyA9PT0pLCBiYXNlNjQtanMgZG9lcyBub3RcbiAgd2hpbGUgKHN0ci5sZW5ndGggJSA0ICE9PSAwKSB7XG4gICAgc3RyID0gc3RyICsgJz0nXG4gIH1cbiAgcmV0dXJuIHN0clxufVxuXG5mdW5jdGlvbiB1dGY4VG9CeXRlcyAoc3RyaW5nLCB1bml0cykge1xuICB1bml0cyA9IHVuaXRzIHx8IEluZmluaXR5XG4gIHZhciBjb2RlUG9pbnRcbiAgdmFyIGxlbmd0aCA9IHN0cmluZy5sZW5ndGhcbiAgdmFyIGxlYWRTdXJyb2dhdGUgPSBudWxsXG4gIHZhciBieXRlcyA9IFtdXG5cbiAgZm9yICh2YXIgaSA9IDA7IGkgPCBsZW5ndGg7ICsraSkge1xuICAgIGNvZGVQb2ludCA9IHN0cmluZy5jaGFyQ29kZUF0KGkpXG5cbiAgICAvLyBpcyBzdXJyb2dhdGUgY29tcG9uZW50XG4gICAgaWYgKGNvZGVQb2ludCA+IDB4RDdGRiAmJiBjb2RlUG9pbnQgPCAweEUwMDApIHtcbiAgICAgIC8vIGxhc3QgY2hhciB3YXMgYSBsZWFkXG4gICAgICBpZiAoIWxlYWRTdXJyb2dhdGUpIHtcbiAgICAgICAgLy8gbm8gbGVhZCB5ZXRcbiAgICAgICAgaWYgKGNvZGVQb2ludCA+IDB4REJGRikge1xuICAgICAgICAgIC8vIHVuZXhwZWN0ZWQgdHJhaWxcbiAgICAgICAgICBpZiAoKHVuaXRzIC09IDMpID4gLTEpIGJ5dGVzLnB1c2goMHhFRiwgMHhCRiwgMHhCRClcbiAgICAgICAgICBjb250aW51ZVxuICAgICAgICB9IGVsc2UgaWYgKGkgKyAxID09PSBsZW5ndGgpIHtcbiAgICAgICAgICAvLyB1bnBhaXJlZCBsZWFkXG4gICAgICAgICAgaWYgKCh1bml0cyAtPSAzKSA+IC0xKSBieXRlcy5wdXNoKDB4RUYsIDB4QkYsIDB4QkQpXG4gICAgICAgICAgY29udGludWVcbiAgICAgICAgfVxuXG4gICAgICAgIC8vIHZhbGlkIGxlYWRcbiAgICAgICAgbGVhZFN1cnJvZ2F0ZSA9IGNvZGVQb2ludFxuXG4gICAgICAgIGNvbnRpbnVlXG4gICAgICB9XG5cbiAgICAgIC8vIDIgbGVhZHMgaW4gYSByb3dcbiAgICAgIGlmIChjb2RlUG9pbnQgPCAweERDMDApIHtcbiAgICAgICAgaWYgKCh1bml0cyAtPSAzKSA+IC0xKSBieXRlcy5wdXNoKDB4RUYsIDB4QkYsIDB4QkQpXG4gICAgICAgIGxlYWRTdXJyb2dhdGUgPSBjb2RlUG9pbnRcbiAgICAgICAgY29udGludWVcbiAgICAgIH1cblxuICAgICAgLy8gdmFsaWQgc3Vycm9nYXRlIHBhaXJcbiAgICAgIGNvZGVQb2ludCA9IChsZWFkU3Vycm9nYXRlIC0gMHhEODAwIDw8IDEwIHwgY29kZVBvaW50IC0gMHhEQzAwKSArIDB4MTAwMDBcbiAgICB9IGVsc2UgaWYgKGxlYWRTdXJyb2dhdGUpIHtcbiAgICAgIC8vIHZhbGlkIGJtcCBjaGFyLCBidXQgbGFzdCBjaGFyIHdhcyBhIGxlYWRcbiAgICAgIGlmICgodW5pdHMgLT0gMykgPiAtMSkgYnl0ZXMucHVzaCgweEVGLCAweEJGLCAweEJEKVxuICAgIH1cblxuICAgIGxlYWRTdXJyb2dhdGUgPSBudWxsXG5cbiAgICAvLyBlbmNvZGUgdXRmOFxuICAgIGlmIChjb2RlUG9pbnQgPCAweDgwKSB7XG4gICAgICBpZiAoKHVuaXRzIC09IDEpIDwgMCkgYnJlYWtcbiAgICAgIGJ5dGVzLnB1c2goY29kZVBvaW50KVxuICAgIH0gZWxzZSBpZiAoY29kZVBvaW50IDwgMHg4MDApIHtcbiAgICAgIGlmICgodW5pdHMgLT0gMikgPCAwKSBicmVha1xuICAgICAgYnl0ZXMucHVzaChcbiAgICAgICAgY29kZVBvaW50ID4+IDB4NiB8IDB4QzAsXG4gICAgICAgIGNvZGVQb2ludCAmIDB4M0YgfCAweDgwXG4gICAgICApXG4gICAgfSBlbHNlIGlmIChjb2RlUG9pbnQgPCAweDEwMDAwKSB7XG4gICAgICBpZiAoKHVuaXRzIC09IDMpIDwgMCkgYnJlYWtcbiAgICAgIGJ5dGVzLnB1c2goXG4gICAgICAgIGNvZGVQb2ludCA+PiAweEMgfCAweEUwLFxuICAgICAgICBjb2RlUG9pbnQgPj4gMHg2ICYgMHgzRiB8IDB4ODAsXG4gICAgICAgIGNvZGVQb2ludCAmIDB4M0YgfCAweDgwXG4gICAgICApXG4gICAgfSBlbHNlIGlmIChjb2RlUG9pbnQgPCAweDExMDAwMCkge1xuICAgICAgaWYgKCh1bml0cyAtPSA0KSA8IDApIGJyZWFrXG4gICAgICBieXRlcy5wdXNoKFxuICAgICAgICBjb2RlUG9pbnQgPj4gMHgxMiB8IDB4RjAsXG4gICAgICAgIGNvZGVQb2ludCA+PiAweEMgJiAweDNGIHwgMHg4MCxcbiAgICAgICAgY29kZVBvaW50ID4+IDB4NiAmIDB4M0YgfCAweDgwLFxuICAgICAgICBjb2RlUG9pbnQgJiAweDNGIHwgMHg4MFxuICAgICAgKVxuICAgIH0gZWxzZSB7XG4gICAgICB0aHJvdyBuZXcgRXJyb3IoJ0ludmFsaWQgY29kZSBwb2ludCcpXG4gICAgfVxuICB9XG5cbiAgcmV0dXJuIGJ5dGVzXG59XG5cbmZ1bmN0aW9uIGFzY2lpVG9CeXRlcyAoc3RyKSB7XG4gIHZhciBieXRlQXJyYXkgPSBbXVxuICBmb3IgKHZhciBpID0gMDsgaSA8IHN0ci5sZW5ndGg7ICsraSkge1xuICAgIC8vIE5vZGUncyBjb2RlIHNlZW1zIHRvIGJlIGRvaW5nIHRoaXMgYW5kIG5vdCAmIDB4N0YuLlxuICAgIGJ5dGVBcnJheS5wdXNoKHN0ci5jaGFyQ29kZUF0KGkpICYgMHhGRilcbiAgfVxuICByZXR1cm4gYnl0ZUFycmF5XG59XG5cbmZ1bmN0aW9uIHV0ZjE2bGVUb0J5dGVzIChzdHIsIHVuaXRzKSB7XG4gIHZhciBjLCBoaSwgbG9cbiAgdmFyIGJ5dGVBcnJheSA9IFtdXG4gIGZvciAodmFyIGkgPSAwOyBpIDwgc3RyLmxlbmd0aDsgKytpKSB7XG4gICAgaWYgKCh1bml0cyAtPSAyKSA8IDApIGJyZWFrXG5cbiAgICBjID0gc3RyLmNoYXJDb2RlQXQoaSlcbiAgICBoaSA9IGMgPj4gOFxuICAgIGxvID0gYyAlIDI1NlxuICAgIGJ5dGVBcnJheS5wdXNoKGxvKVxuICAgIGJ5dGVBcnJheS5wdXNoKGhpKVxuICB9XG5cbiAgcmV0dXJuIGJ5dGVBcnJheVxufVxuXG5mdW5jdGlvbiBiYXNlNjRUb0J5dGVzIChzdHIpIHtcbiAgcmV0dXJuIGJhc2U2NC50b0J5dGVBcnJheShiYXNlNjRjbGVhbihzdHIpKVxufVxuXG5mdW5jdGlvbiBibGl0QnVmZmVyIChzcmMsIGRzdCwgb2Zmc2V0LCBsZW5ndGgpIHtcbiAgZm9yICh2YXIgaSA9IDA7IGkgPCBsZW5ndGg7ICsraSkge1xuICAgIGlmICgoaSArIG9mZnNldCA+PSBkc3QubGVuZ3RoKSB8fCAoaSA+PSBzcmMubGVuZ3RoKSkgYnJlYWtcbiAgICBkc3RbaSArIG9mZnNldF0gPSBzcmNbaV1cbiAgfVxuICByZXR1cm4gaVxufVxuXG4vLyBBcnJheUJ1ZmZlciBvciBVaW50OEFycmF5IG9iamVjdHMgZnJvbSBvdGhlciBjb250ZXh0cyAoaS5lLiBpZnJhbWVzKSBkbyBub3QgcGFzc1xuLy8gdGhlIGBpbnN0YW5jZW9mYCBjaGVjayBidXQgdGhleSBzaG91bGQgYmUgdHJlYXRlZCBhcyBvZiB0aGF0IHR5cGUuXG4vLyBTZWU6IGh0dHBzOi8vZ2l0aHViLmNvbS9mZXJvc3MvYnVmZmVyL2lzc3Vlcy8xNjZcbmZ1bmN0aW9uIGlzSW5zdGFuY2UgKG9iaiwgdHlwZSkge1xuICByZXR1cm4gb2JqIGluc3RhbmNlb2YgdHlwZSB8fFxuICAgIChvYmogIT0gbnVsbCAmJiBvYmouY29uc3RydWN0b3IgIT0gbnVsbCAmJiBvYmouY29uc3RydWN0b3IubmFtZSAhPSBudWxsICYmXG4gICAgICBvYmouY29uc3RydWN0b3IubmFtZSA9PT0gdHlwZS5uYW1lKVxufVxuZnVuY3Rpb24gbnVtYmVySXNOYU4gKG9iaikge1xuICAvLyBGb3IgSUUxMSBzdXBwb3J0XG4gIHJldHVybiBvYmogIT09IG9iaiAvLyBlc2xpbnQtZGlzYWJsZS1saW5lIG5vLXNlbGYtY29tcGFyZVxufVxuXG4vLyBDcmVhdGUgbG9va3VwIHRhYmxlIGZvciBgdG9TdHJpbmcoJ2hleCcpYFxuLy8gU2VlOiBodHRwczovL2dpdGh1Yi5jb20vZmVyb3NzL2J1ZmZlci9pc3N1ZXMvMjE5XG52YXIgaGV4U2xpY2VMb29rdXBUYWJsZSA9IChmdW5jdGlvbiAoKSB7XG4gIHZhciBhbHBoYWJldCA9ICcwMTIzNDU2Nzg5YWJjZGVmJ1xuICB2YXIgdGFibGUgPSBuZXcgQXJyYXkoMjU2KVxuICBmb3IgKHZhciBpID0gMDsgaSA8IDE2OyArK2kpIHtcbiAgICB2YXIgaTE2ID0gaSAqIDE2XG4gICAgZm9yICh2YXIgaiA9IDA7IGogPCAxNjsgKytqKSB7XG4gICAgICB0YWJsZVtpMTYgKyBqXSA9IGFscGhhYmV0W2ldICsgYWxwaGFiZXRbal1cbiAgICB9XG4gIH1cbiAgcmV0dXJuIHRhYmxlXG59KSgpXG4iLCJleHBvcnRzLnJlYWQgPSBmdW5jdGlvbiAoYnVmZmVyLCBvZmZzZXQsIGlzTEUsIG1MZW4sIG5CeXRlcykge1xuICB2YXIgZSwgbVxuICB2YXIgZUxlbiA9IChuQnl0ZXMgKiA4KSAtIG1MZW4gLSAxXG4gIHZhciBlTWF4ID0gKDEgPDwgZUxlbikgLSAxXG4gIHZhciBlQmlhcyA9IGVNYXggPj4gMVxuICB2YXIgbkJpdHMgPSAtN1xuICB2YXIgaSA9IGlzTEUgPyAobkJ5dGVzIC0gMSkgOiAwXG4gIHZhciBkID0gaXNMRSA/IC0xIDogMVxuICB2YXIgcyA9IGJ1ZmZlcltvZmZzZXQgKyBpXVxuXG4gIGkgKz0gZFxuXG4gIGUgPSBzICYgKCgxIDw8ICgtbkJpdHMpKSAtIDEpXG4gIHMgPj49ICgtbkJpdHMpXG4gIG5CaXRzICs9IGVMZW5cbiAgZm9yICg7IG5CaXRzID4gMDsgZSA9IChlICogMjU2KSArIGJ1ZmZlcltvZmZzZXQgKyBpXSwgaSArPSBkLCBuQml0cyAtPSA4KSB7fVxuXG4gIG0gPSBlICYgKCgxIDw8ICgtbkJpdHMpKSAtIDEpXG4gIGUgPj49ICgtbkJpdHMpXG4gIG5CaXRzICs9IG1MZW5cbiAgZm9yICg7IG5CaXRzID4gMDsgbSA9IChtICogMjU2KSArIGJ1ZmZlcltvZmZzZXQgKyBpXSwgaSArPSBkLCBuQml0cyAtPSA4KSB7fVxuXG4gIGlmIChlID09PSAwKSB7XG4gICAgZSA9IDEgLSBlQmlhc1xuICB9IGVsc2UgaWYgKGUgPT09IGVNYXgpIHtcbiAgICByZXR1cm4gbSA/IE5hTiA6ICgocyA/IC0xIDogMSkgKiBJbmZpbml0eSlcbiAgfSBlbHNlIHtcbiAgICBtID0gbSArIE1hdGgucG93KDIsIG1MZW4pXG4gICAgZSA9IGUgLSBlQmlhc1xuICB9XG4gIHJldHVybiAocyA/IC0xIDogMSkgKiBtICogTWF0aC5wb3coMiwgZSAtIG1MZW4pXG59XG5cbmV4cG9ydHMud3JpdGUgPSBmdW5jdGlvbiAoYnVmZmVyLCB2YWx1ZSwgb2Zmc2V0LCBpc0xFLCBtTGVuLCBuQnl0ZXMpIHtcbiAgdmFyIGUsIG0sIGNcbiAgdmFyIGVMZW4gPSAobkJ5dGVzICogOCkgLSBtTGVuIC0gMVxuICB2YXIgZU1heCA9ICgxIDw8IGVMZW4pIC0gMVxuICB2YXIgZUJpYXMgPSBlTWF4ID4+IDFcbiAgdmFyIHJ0ID0gKG1MZW4gPT09IDIzID8gTWF0aC5wb3coMiwgLTI0KSAtIE1hdGgucG93KDIsIC03NykgOiAwKVxuICB2YXIgaSA9IGlzTEUgPyAwIDogKG5CeXRlcyAtIDEpXG4gIHZhciBkID0gaXNMRSA/IDEgOiAtMVxuICB2YXIgcyA9IHZhbHVlIDwgMCB8fCAodmFsdWUgPT09IDAgJiYgMSAvIHZhbHVlIDwgMCkgPyAxIDogMFxuXG4gIHZhbHVlID0gTWF0aC5hYnModmFsdWUpXG5cbiAgaWYgKGlzTmFOKHZhbHVlKSB8fCB2YWx1ZSA9PT0gSW5maW5pdHkpIHtcbiAgICBtID0gaXNOYU4odmFsdWUpID8gMSA6IDBcbiAgICBlID0gZU1heFxuICB9IGVsc2Uge1xuICAgIGUgPSBNYXRoLmZsb29yKE1hdGgubG9nKHZhbHVlKSAvIE1hdGguTE4yKVxuICAgIGlmICh2YWx1ZSAqIChjID0gTWF0aC5wb3coMiwgLWUpKSA8IDEpIHtcbiAgICAgIGUtLVxuICAgICAgYyAqPSAyXG4gICAgfVxuICAgIGlmIChlICsgZUJpYXMgPj0gMSkge1xuICAgICAgdmFsdWUgKz0gcnQgLyBjXG4gICAgfSBlbHNlIHtcbiAgICAgIHZhbHVlICs9IHJ0ICogTWF0aC5wb3coMiwgMSAtIGVCaWFzKVxuICAgIH1cbiAgICBpZiAodmFsdWUgKiBjID49IDIpIHtcbiAgICAgIGUrK1xuICAgICAgYyAvPSAyXG4gICAgfVxuXG4gICAgaWYgKGUgKyBlQmlhcyA+PSBlTWF4KSB7XG4gICAgICBtID0gMFxuICAgICAgZSA9IGVNYXhcbiAgICB9IGVsc2UgaWYgKGUgKyBlQmlhcyA+PSAxKSB7XG4gICAgICBtID0gKCh2YWx1ZSAqIGMpIC0gMSkgKiBNYXRoLnBvdygyLCBtTGVuKVxuICAgICAgZSA9IGUgKyBlQmlhc1xuICAgIH0gZWxzZSB7XG4gICAgICBtID0gdmFsdWUgKiBNYXRoLnBvdygyLCBlQmlhcyAtIDEpICogTWF0aC5wb3coMiwgbUxlbilcbiAgICAgIGUgPSAwXG4gICAgfVxuICB9XG5cbiAgZm9yICg7IG1MZW4gPj0gODsgYnVmZmVyW29mZnNldCArIGldID0gbSAmIDB4ZmYsIGkgKz0gZCwgbSAvPSAyNTYsIG1MZW4gLT0gOCkge31cblxuICBlID0gKGUgPDwgbUxlbikgfCBtXG4gIGVMZW4gKz0gbUxlblxuICBmb3IgKDsgZUxlbiA+IDA7IGJ1ZmZlcltvZmZzZXQgKyBpXSA9IGUgJiAweGZmLCBpICs9IGQsIGUgLz0gMjU2LCBlTGVuIC09IDgpIHt9XG5cbiAgYnVmZmVyW29mZnNldCArIGkgLSBkXSB8PSBzICogMTI4XG59XG4iLCIndXNlIHN0cmljdCc7XG5cbnZhciBhc2FwID0gcmVxdWlyZSgnYXNhcC9yYXcnKTtcblxuZnVuY3Rpb24gbm9vcCgpIHt9XG5cbi8vIFN0YXRlczpcbi8vXG4vLyAwIC0gcGVuZGluZ1xuLy8gMSAtIGZ1bGZpbGxlZCB3aXRoIF92YWx1ZVxuLy8gMiAtIHJlamVjdGVkIHdpdGggX3ZhbHVlXG4vLyAzIC0gYWRvcHRlZCB0aGUgc3RhdGUgb2YgYW5vdGhlciBwcm9taXNlLCBfdmFsdWVcbi8vXG4vLyBvbmNlIHRoZSBzdGF0ZSBpcyBubyBsb25nZXIgcGVuZGluZyAoMCkgaXQgaXMgaW1tdXRhYmxlXG5cbi8vIEFsbCBgX2AgcHJlZml4ZWQgcHJvcGVydGllcyB3aWxsIGJlIHJlZHVjZWQgdG8gYF97cmFuZG9tIG51bWJlcn1gXG4vLyBhdCBidWlsZCB0aW1lIHRvIG9iZnVzY2F0ZSB0aGVtIGFuZCBkaXNjb3VyYWdlIHRoZWlyIHVzZS5cbi8vIFdlIGRvbid0IHVzZSBzeW1ib2xzIG9yIE9iamVjdC5kZWZpbmVQcm9wZXJ0eSB0byBmdWxseSBoaWRlIHRoZW1cbi8vIGJlY2F1c2UgdGhlIHBlcmZvcm1hbmNlIGlzbid0IGdvb2QgZW5vdWdoLlxuXG5cbi8vIHRvIGF2b2lkIHVzaW5nIHRyeS9jYXRjaCBpbnNpZGUgY3JpdGljYWwgZnVuY3Rpb25zLCB3ZVxuLy8gZXh0cmFjdCB0aGVtIHRvIGhlcmUuXG52YXIgTEFTVF9FUlJPUiA9IG51bGw7XG52YXIgSVNfRVJST1IgPSB7fTtcbmZ1bmN0aW9uIGdldFRoZW4ob2JqKSB7XG4gIHRyeSB7XG4gICAgcmV0dXJuIG9iai50aGVuO1xuICB9IGNhdGNoIChleCkge1xuICAgIExBU1RfRVJST1IgPSBleDtcbiAgICByZXR1cm4gSVNfRVJST1I7XG4gIH1cbn1cblxuZnVuY3Rpb24gdHJ5Q2FsbE9uZShmbiwgYSkge1xuICB0cnkge1xuICAgIHJldHVybiBmbihhKTtcbiAgfSBjYXRjaCAoZXgpIHtcbiAgICBMQVNUX0VSUk9SID0gZXg7XG4gICAgcmV0dXJuIElTX0VSUk9SO1xuICB9XG59XG5mdW5jdGlvbiB0cnlDYWxsVHdvKGZuLCBhLCBiKSB7XG4gIHRyeSB7XG4gICAgZm4oYSwgYik7XG4gIH0gY2F0Y2ggKGV4KSB7XG4gICAgTEFTVF9FUlJPUiA9IGV4O1xuICAgIHJldHVybiBJU19FUlJPUjtcbiAgfVxufVxuXG5tb2R1bGUuZXhwb3J0cyA9IFByb21pc2U7XG5cbmZ1bmN0aW9uIFByb21pc2UoZm4pIHtcbiAgaWYgKHR5cGVvZiB0aGlzICE9PSAnb2JqZWN0Jykge1xuICAgIHRocm93IG5ldyBUeXBlRXJyb3IoJ1Byb21pc2VzIG11c3QgYmUgY29uc3RydWN0ZWQgdmlhIG5ldycpO1xuICB9XG4gIGlmICh0eXBlb2YgZm4gIT09ICdmdW5jdGlvbicpIHtcbiAgICB0aHJvdyBuZXcgVHlwZUVycm9yKCdQcm9taXNlIGNvbnN0cnVjdG9yXFwncyBhcmd1bWVudCBpcyBub3QgYSBmdW5jdGlvbicpO1xuICB9XG4gIHRoaXMuX2ggPSAwO1xuICB0aGlzLl9pID0gMDtcbiAgdGhpcy5faiA9IG51bGw7XG4gIHRoaXMuX2sgPSBudWxsO1xuICBpZiAoZm4gPT09IG5vb3ApIHJldHVybjtcbiAgZG9SZXNvbHZlKGZuLCB0aGlzKTtcbn1cblByb21pc2UuX2wgPSBudWxsO1xuUHJvbWlzZS5fbSA9IG51bGw7XG5Qcm9taXNlLl9uID0gbm9vcDtcblxuUHJvbWlzZS5wcm90b3R5cGUudGhlbiA9IGZ1bmN0aW9uKG9uRnVsZmlsbGVkLCBvblJlamVjdGVkKSB7XG4gIGlmICh0aGlzLmNvbnN0cnVjdG9yICE9PSBQcm9taXNlKSB7XG4gICAgcmV0dXJuIHNhZmVUaGVuKHRoaXMsIG9uRnVsZmlsbGVkLCBvblJlamVjdGVkKTtcbiAgfVxuICB2YXIgcmVzID0gbmV3IFByb21pc2Uobm9vcCk7XG4gIGhhbmRsZSh0aGlzLCBuZXcgSGFuZGxlcihvbkZ1bGZpbGxlZCwgb25SZWplY3RlZCwgcmVzKSk7XG4gIHJldHVybiByZXM7XG59O1xuXG5mdW5jdGlvbiBzYWZlVGhlbihzZWxmLCBvbkZ1bGZpbGxlZCwgb25SZWplY3RlZCkge1xuICByZXR1cm4gbmV3IHNlbGYuY29uc3RydWN0b3IoZnVuY3Rpb24gKHJlc29sdmUsIHJlamVjdCkge1xuICAgIHZhciByZXMgPSBuZXcgUHJvbWlzZShub29wKTtcbiAgICByZXMudGhlbihyZXNvbHZlLCByZWplY3QpO1xuICAgIGhhbmRsZShzZWxmLCBuZXcgSGFuZGxlcihvbkZ1bGZpbGxlZCwgb25SZWplY3RlZCwgcmVzKSk7XG4gIH0pO1xufVxuZnVuY3Rpb24gaGFuZGxlKHNlbGYsIGRlZmVycmVkKSB7XG4gIHdoaWxlIChzZWxmLl9pID09PSAzKSB7XG4gICAgc2VsZiA9IHNlbGYuX2o7XG4gIH1cbiAgaWYgKFByb21pc2UuX2wpIHtcbiAgICBQcm9taXNlLl9sKHNlbGYpO1xuICB9XG4gIGlmIChzZWxmLl9pID09PSAwKSB7XG4gICAgaWYgKHNlbGYuX2ggPT09IDApIHtcbiAgICAgIHNlbGYuX2ggPSAxO1xuICAgICAgc2VsZi5fayA9IGRlZmVycmVkO1xuICAgICAgcmV0dXJuO1xuICAgIH1cbiAgICBpZiAoc2VsZi5faCA9PT0gMSkge1xuICAgICAgc2VsZi5faCA9IDI7XG4gICAgICBzZWxmLl9rID0gW3NlbGYuX2ssIGRlZmVycmVkXTtcbiAgICAgIHJldHVybjtcbiAgICB9XG4gICAgc2VsZi5fay5wdXNoKGRlZmVycmVkKTtcbiAgICByZXR1cm47XG4gIH1cbiAgaGFuZGxlUmVzb2x2ZWQoc2VsZiwgZGVmZXJyZWQpO1xufVxuXG5mdW5jdGlvbiBoYW5kbGVSZXNvbHZlZChzZWxmLCBkZWZlcnJlZCkge1xuICBhc2FwKGZ1bmN0aW9uKCkge1xuICAgIHZhciBjYiA9IHNlbGYuX2kgPT09IDEgPyBkZWZlcnJlZC5vbkZ1bGZpbGxlZCA6IGRlZmVycmVkLm9uUmVqZWN0ZWQ7XG4gICAgaWYgKGNiID09PSBudWxsKSB7XG4gICAgICBpZiAoc2VsZi5faSA9PT0gMSkge1xuICAgICAgICByZXNvbHZlKGRlZmVycmVkLnByb21pc2UsIHNlbGYuX2opO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgcmVqZWN0KGRlZmVycmVkLnByb21pc2UsIHNlbGYuX2opO1xuICAgICAgfVxuICAgICAgcmV0dXJuO1xuICAgIH1cbiAgICB2YXIgcmV0ID0gdHJ5Q2FsbE9uZShjYiwgc2VsZi5faik7XG4gICAgaWYgKHJldCA9PT0gSVNfRVJST1IpIHtcbiAgICAgIHJlamVjdChkZWZlcnJlZC5wcm9taXNlLCBMQVNUX0VSUk9SKTtcbiAgICB9IGVsc2Uge1xuICAgICAgcmVzb2x2ZShkZWZlcnJlZC5wcm9taXNlLCByZXQpO1xuICAgIH1cbiAgfSk7XG59XG5mdW5jdGlvbiByZXNvbHZlKHNlbGYsIG5ld1ZhbHVlKSB7XG4gIC8vIFByb21pc2UgUmVzb2x1dGlvbiBQcm9jZWR1cmU6IGh0dHBzOi8vZ2l0aHViLmNvbS9wcm9taXNlcy1hcGx1cy9wcm9taXNlcy1zcGVjI3RoZS1wcm9taXNlLXJlc29sdXRpb24tcHJvY2VkdXJlXG4gIGlmIChuZXdWYWx1ZSA9PT0gc2VsZikge1xuICAgIHJldHVybiByZWplY3QoXG4gICAgICBzZWxmLFxuICAgICAgbmV3IFR5cGVFcnJvcignQSBwcm9taXNlIGNhbm5vdCBiZSByZXNvbHZlZCB3aXRoIGl0c2VsZi4nKVxuICAgICk7XG4gIH1cbiAgaWYgKFxuICAgIG5ld1ZhbHVlICYmXG4gICAgKHR5cGVvZiBuZXdWYWx1ZSA9PT0gJ29iamVjdCcgfHwgdHlwZW9mIG5ld1ZhbHVlID09PSAnZnVuY3Rpb24nKVxuICApIHtcbiAgICB2YXIgdGhlbiA9IGdldFRoZW4obmV3VmFsdWUpO1xuICAgIGlmICh0aGVuID09PSBJU19FUlJPUikge1xuICAgICAgcmV0dXJuIHJlamVjdChzZWxmLCBMQVNUX0VSUk9SKTtcbiAgICB9XG4gICAgaWYgKFxuICAgICAgdGhlbiA9PT0gc2VsZi50aGVuICYmXG4gICAgICBuZXdWYWx1ZSBpbnN0YW5jZW9mIFByb21pc2VcbiAgICApIHtcbiAgICAgIHNlbGYuX2kgPSAzO1xuICAgICAgc2VsZi5faiA9IG5ld1ZhbHVlO1xuICAgICAgZmluYWxlKHNlbGYpO1xuICAgICAgcmV0dXJuO1xuICAgIH0gZWxzZSBpZiAodHlwZW9mIHRoZW4gPT09ICdmdW5jdGlvbicpIHtcbiAgICAgIGRvUmVzb2x2ZSh0aGVuLmJpbmQobmV3VmFsdWUpLCBzZWxmKTtcbiAgICAgIHJldHVybjtcbiAgICB9XG4gIH1cbiAgc2VsZi5faSA9IDE7XG4gIHNlbGYuX2ogPSBuZXdWYWx1ZTtcbiAgZmluYWxlKHNlbGYpO1xufVxuXG5mdW5jdGlvbiByZWplY3Qoc2VsZiwgbmV3VmFsdWUpIHtcbiAgc2VsZi5faSA9IDI7XG4gIHNlbGYuX2ogPSBuZXdWYWx1ZTtcbiAgaWYgKFByb21pc2UuX20pIHtcbiAgICBQcm9taXNlLl9tKHNlbGYsIG5ld1ZhbHVlKTtcbiAgfVxuICBmaW5hbGUoc2VsZik7XG59XG5mdW5jdGlvbiBmaW5hbGUoc2VsZikge1xuICBpZiAoc2VsZi5faCA9PT0gMSkge1xuICAgIGhhbmRsZShzZWxmLCBzZWxmLl9rKTtcbiAgICBzZWxmLl9rID0gbnVsbDtcbiAgfVxuICBpZiAoc2VsZi5faCA9PT0gMikge1xuICAgIGZvciAodmFyIGkgPSAwOyBpIDwgc2VsZi5fay5sZW5ndGg7IGkrKykge1xuICAgICAgaGFuZGxlKHNlbGYsIHNlbGYuX2tbaV0pO1xuICAgIH1cbiAgICBzZWxmLl9rID0gbnVsbDtcbiAgfVxufVxuXG5mdW5jdGlvbiBIYW5kbGVyKG9uRnVsZmlsbGVkLCBvblJlamVjdGVkLCBwcm9taXNlKXtcbiAgdGhpcy5vbkZ1bGZpbGxlZCA9IHR5cGVvZiBvbkZ1bGZpbGxlZCA9PT0gJ2Z1bmN0aW9uJyA/IG9uRnVsZmlsbGVkIDogbnVsbDtcbiAgdGhpcy5vblJlamVjdGVkID0gdHlwZW9mIG9uUmVqZWN0ZWQgPT09ICdmdW5jdGlvbicgPyBvblJlamVjdGVkIDogbnVsbDtcbiAgdGhpcy5wcm9taXNlID0gcHJvbWlzZTtcbn1cblxuLyoqXG4gKiBUYWtlIGEgcG90ZW50aWFsbHkgbWlzYmVoYXZpbmcgcmVzb2x2ZXIgZnVuY3Rpb24gYW5kIG1ha2Ugc3VyZVxuICogb25GdWxmaWxsZWQgYW5kIG9uUmVqZWN0ZWQgYXJlIG9ubHkgY2FsbGVkIG9uY2UuXG4gKlxuICogTWFrZXMgbm8gZ3VhcmFudGVlcyBhYm91dCBhc3luY2hyb255LlxuICovXG5mdW5jdGlvbiBkb1Jlc29sdmUoZm4sIHByb21pc2UpIHtcbiAgdmFyIGRvbmUgPSBmYWxzZTtcbiAgdmFyIHJlcyA9IHRyeUNhbGxUd28oZm4sIGZ1bmN0aW9uICh2YWx1ZSkge1xuICAgIGlmIChkb25lKSByZXR1cm47XG4gICAgZG9uZSA9IHRydWU7XG4gICAgcmVzb2x2ZShwcm9taXNlLCB2YWx1ZSk7XG4gIH0sIGZ1bmN0aW9uIChyZWFzb24pIHtcbiAgICBpZiAoZG9uZSkgcmV0dXJuO1xuICAgIGRvbmUgPSB0cnVlO1xuICAgIHJlamVjdChwcm9taXNlLCByZWFzb24pO1xuICB9KTtcbiAgaWYgKCFkb25lICYmIHJlcyA9PT0gSVNfRVJST1IpIHtcbiAgICBkb25lID0gdHJ1ZTtcbiAgICByZWplY3QocHJvbWlzZSwgTEFTVF9FUlJPUik7XG4gIH1cbn1cbiIsIid1c2Ugc3RyaWN0JztcblxuLy9UaGlzIGZpbGUgY29udGFpbnMgdGhlIEVTNiBleHRlbnNpb25zIHRvIHRoZSBjb3JlIFByb21pc2VzL0ErIEFQSVxuXG52YXIgUHJvbWlzZSA9IHJlcXVpcmUoJy4vY29yZS5qcycpO1xuXG5tb2R1bGUuZXhwb3J0cyA9IFByb21pc2U7XG5cbi8qIFN0YXRpYyBGdW5jdGlvbnMgKi9cblxudmFyIFRSVUUgPSB2YWx1ZVByb21pc2UodHJ1ZSk7XG52YXIgRkFMU0UgPSB2YWx1ZVByb21pc2UoZmFsc2UpO1xudmFyIE5VTEwgPSB2YWx1ZVByb21pc2UobnVsbCk7XG52YXIgVU5ERUZJTkVEID0gdmFsdWVQcm9taXNlKHVuZGVmaW5lZCk7XG52YXIgWkVSTyA9IHZhbHVlUHJvbWlzZSgwKTtcbnZhciBFTVBUWVNUUklORyA9IHZhbHVlUHJvbWlzZSgnJyk7XG5cbmZ1bmN0aW9uIHZhbHVlUHJvbWlzZSh2YWx1ZSkge1xuICB2YXIgcCA9IG5ldyBQcm9taXNlKFByb21pc2UuX24pO1xuICBwLl9pID0gMTtcbiAgcC5faiA9IHZhbHVlO1xuICByZXR1cm4gcDtcbn1cblByb21pc2UucmVzb2x2ZSA9IGZ1bmN0aW9uICh2YWx1ZSkge1xuICBpZiAodmFsdWUgaW5zdGFuY2VvZiBQcm9taXNlKSByZXR1cm4gdmFsdWU7XG5cbiAgaWYgKHZhbHVlID09PSBudWxsKSByZXR1cm4gTlVMTDtcbiAgaWYgKHZhbHVlID09PSB1bmRlZmluZWQpIHJldHVybiBVTkRFRklORUQ7XG4gIGlmICh2YWx1ZSA9PT0gdHJ1ZSkgcmV0dXJuIFRSVUU7XG4gIGlmICh2YWx1ZSA9PT0gZmFsc2UpIHJldHVybiBGQUxTRTtcbiAgaWYgKHZhbHVlID09PSAwKSByZXR1cm4gWkVSTztcbiAgaWYgKHZhbHVlID09PSAnJykgcmV0dXJuIEVNUFRZU1RSSU5HO1xuXG4gIGlmICh0eXBlb2YgdmFsdWUgPT09ICdvYmplY3QnIHx8IHR5cGVvZiB2YWx1ZSA9PT0gJ2Z1bmN0aW9uJykge1xuICAgIHRyeSB7XG4gICAgICB2YXIgdGhlbiA9IHZhbHVlLnRoZW47XG4gICAgICBpZiAodHlwZW9mIHRoZW4gPT09ICdmdW5jdGlvbicpIHtcbiAgICAgICAgcmV0dXJuIG5ldyBQcm9taXNlKHRoZW4uYmluZCh2YWx1ZSkpO1xuICAgICAgfVxuICAgIH0gY2F0Y2ggKGV4KSB7XG4gICAgICByZXR1cm4gbmV3IFByb21pc2UoZnVuY3Rpb24gKHJlc29sdmUsIHJlamVjdCkge1xuICAgICAgICByZWplY3QoZXgpO1xuICAgICAgfSk7XG4gICAgfVxuICB9XG4gIHJldHVybiB2YWx1ZVByb21pc2UodmFsdWUpO1xufTtcblxuUHJvbWlzZS5hbGwgPSBmdW5jdGlvbiAoYXJyKSB7XG4gIHZhciBhcmdzID0gQXJyYXkucHJvdG90eXBlLnNsaWNlLmNhbGwoYXJyKTtcblxuICByZXR1cm4gbmV3IFByb21pc2UoZnVuY3Rpb24gKHJlc29sdmUsIHJlamVjdCkge1xuICAgIGlmIChhcmdzLmxlbmd0aCA9PT0gMCkgcmV0dXJuIHJlc29sdmUoW10pO1xuICAgIHZhciByZW1haW5pbmcgPSBhcmdzLmxlbmd0aDtcbiAgICBmdW5jdGlvbiByZXMoaSwgdmFsKSB7XG4gICAgICBpZiAodmFsICYmICh0eXBlb2YgdmFsID09PSAnb2JqZWN0JyB8fCB0eXBlb2YgdmFsID09PSAnZnVuY3Rpb24nKSkge1xuICAgICAgICBpZiAodmFsIGluc3RhbmNlb2YgUHJvbWlzZSAmJiB2YWwudGhlbiA9PT0gUHJvbWlzZS5wcm90b3R5cGUudGhlbikge1xuICAgICAgICAgIHdoaWxlICh2YWwuX2kgPT09IDMpIHtcbiAgICAgICAgICAgIHZhbCA9IHZhbC5fajtcbiAgICAgICAgICB9XG4gICAgICAgICAgaWYgKHZhbC5faSA9PT0gMSkgcmV0dXJuIHJlcyhpLCB2YWwuX2opO1xuICAgICAgICAgIGlmICh2YWwuX2kgPT09IDIpIHJlamVjdCh2YWwuX2opO1xuICAgICAgICAgIHZhbC50aGVuKGZ1bmN0aW9uICh2YWwpIHtcbiAgICAgICAgICAgIHJlcyhpLCB2YWwpO1xuICAgICAgICAgIH0sIHJlamVjdCk7XG4gICAgICAgICAgcmV0dXJuO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgIHZhciB0aGVuID0gdmFsLnRoZW47XG4gICAgICAgICAgaWYgKHR5cGVvZiB0aGVuID09PSAnZnVuY3Rpb24nKSB7XG4gICAgICAgICAgICB2YXIgcCA9IG5ldyBQcm9taXNlKHRoZW4uYmluZCh2YWwpKTtcbiAgICAgICAgICAgIHAudGhlbihmdW5jdGlvbiAodmFsKSB7XG4gICAgICAgICAgICAgIHJlcyhpLCB2YWwpO1xuICAgICAgICAgICAgfSwgcmVqZWN0KTtcbiAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICAgIGFyZ3NbaV0gPSB2YWw7XG4gICAgICBpZiAoLS1yZW1haW5pbmcgPT09IDApIHtcbiAgICAgICAgcmVzb2x2ZShhcmdzKTtcbiAgICAgIH1cbiAgICB9XG4gICAgZm9yICh2YXIgaSA9IDA7IGkgPCBhcmdzLmxlbmd0aDsgaSsrKSB7XG4gICAgICByZXMoaSwgYXJnc1tpXSk7XG4gICAgfVxuICB9KTtcbn07XG5cblByb21pc2UucmVqZWN0ID0gZnVuY3Rpb24gKHZhbHVlKSB7XG4gIHJldHVybiBuZXcgUHJvbWlzZShmdW5jdGlvbiAocmVzb2x2ZSwgcmVqZWN0KSB7XG4gICAgcmVqZWN0KHZhbHVlKTtcbiAgfSk7XG59O1xuXG5Qcm9taXNlLnJhY2UgPSBmdW5jdGlvbiAodmFsdWVzKSB7XG4gIHJldHVybiBuZXcgUHJvbWlzZShmdW5jdGlvbiAocmVzb2x2ZSwgcmVqZWN0KSB7XG4gICAgdmFsdWVzLmZvckVhY2goZnVuY3Rpb24odmFsdWUpe1xuICAgICAgUHJvbWlzZS5yZXNvbHZlKHZhbHVlKS50aGVuKHJlc29sdmUsIHJlamVjdCk7XG4gICAgfSk7XG4gIH0pO1xufTtcblxuLyogUHJvdG90eXBlIE1ldGhvZHMgKi9cblxuUHJvbWlzZS5wcm90b3R5cGVbJ2NhdGNoJ10gPSBmdW5jdGlvbiAob25SZWplY3RlZCkge1xuICByZXR1cm4gdGhpcy50aGVuKG51bGwsIG9uUmVqZWN0ZWQpO1xufTtcbiIsIid1c2Ugc3RyaWN0JztcblxudmFyIFByb21pc2UgPSByZXF1aXJlKCcuL2NvcmUnKTtcblxudmFyIERFRkFVTFRfV0hJVEVMSVNUID0gW1xuICBSZWZlcmVuY2VFcnJvcixcbiAgVHlwZUVycm9yLFxuICBSYW5nZUVycm9yXG5dO1xuXG52YXIgZW5hYmxlZCA9IGZhbHNlO1xuZXhwb3J0cy5kaXNhYmxlID0gZGlzYWJsZTtcbmZ1bmN0aW9uIGRpc2FibGUoKSB7XG4gIGVuYWJsZWQgPSBmYWxzZTtcbiAgUHJvbWlzZS5fbCA9IG51bGw7XG4gIFByb21pc2UuX20gPSBudWxsO1xufVxuXG5leHBvcnRzLmVuYWJsZSA9IGVuYWJsZTtcbmZ1bmN0aW9uIGVuYWJsZShvcHRpb25zKSB7XG4gIG9wdGlvbnMgPSBvcHRpb25zIHx8IHt9O1xuICBpZiAoZW5hYmxlZCkgZGlzYWJsZSgpO1xuICBlbmFibGVkID0gdHJ1ZTtcbiAgdmFyIGlkID0gMDtcbiAgdmFyIGRpc3BsYXlJZCA9IDA7XG4gIHZhciByZWplY3Rpb25zID0ge307XG4gIFByb21pc2UuX2wgPSBmdW5jdGlvbiAocHJvbWlzZSkge1xuICAgIGlmIChcbiAgICAgIHByb21pc2UuX2kgPT09IDIgJiYgLy8gSVMgUkVKRUNURURcbiAgICAgIHJlamVjdGlvbnNbcHJvbWlzZS5fb11cbiAgICApIHtcbiAgICAgIGlmIChyZWplY3Rpb25zW3Byb21pc2UuX29dLmxvZ2dlZCkge1xuICAgICAgICBvbkhhbmRsZWQocHJvbWlzZS5fbyk7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICBjbGVhclRpbWVvdXQocmVqZWN0aW9uc1twcm9taXNlLl9vXS50aW1lb3V0KTtcbiAgICAgIH1cbiAgICAgIGRlbGV0ZSByZWplY3Rpb25zW3Byb21pc2UuX29dO1xuICAgIH1cbiAgfTtcbiAgUHJvbWlzZS5fbSA9IGZ1bmN0aW9uIChwcm9taXNlLCBlcnIpIHtcbiAgICBpZiAocHJvbWlzZS5faCA9PT0gMCkgeyAvLyBub3QgeWV0IGhhbmRsZWRcbiAgICAgIHByb21pc2UuX28gPSBpZCsrO1xuICAgICAgcmVqZWN0aW9uc1twcm9taXNlLl9vXSA9IHtcbiAgICAgICAgZGlzcGxheUlkOiBudWxsLFxuICAgICAgICBlcnJvcjogZXJyLFxuICAgICAgICB0aW1lb3V0OiBzZXRUaW1lb3V0KFxuICAgICAgICAgIG9uVW5oYW5kbGVkLmJpbmQobnVsbCwgcHJvbWlzZS5fbyksXG4gICAgICAgICAgLy8gRm9yIHJlZmVyZW5jZSBlcnJvcnMgYW5kIHR5cGUgZXJyb3JzLCB0aGlzIGFsbW9zdCBhbHdheXNcbiAgICAgICAgICAvLyBtZWFucyB0aGUgcHJvZ3JhbW1lciBtYWRlIGEgbWlzdGFrZSwgc28gbG9nIHRoZW0gYWZ0ZXIganVzdFxuICAgICAgICAgIC8vIDEwMG1zXG4gICAgICAgICAgLy8gb3RoZXJ3aXNlLCB3YWl0IDIgc2Vjb25kcyB0byBzZWUgaWYgdGhleSBnZXQgaGFuZGxlZFxuICAgICAgICAgIG1hdGNoV2hpdGVsaXN0KGVyciwgREVGQVVMVF9XSElURUxJU1QpXG4gICAgICAgICAgICA/IDEwMFxuICAgICAgICAgICAgOiAyMDAwXG4gICAgICAgICksXG4gICAgICAgIGxvZ2dlZDogZmFsc2VcbiAgICAgIH07XG4gICAgfVxuICB9O1xuICBmdW5jdGlvbiBvblVuaGFuZGxlZChpZCkge1xuICAgIGlmIChcbiAgICAgIG9wdGlvbnMuYWxsUmVqZWN0aW9ucyB8fFxuICAgICAgbWF0Y2hXaGl0ZWxpc3QoXG4gICAgICAgIHJlamVjdGlvbnNbaWRdLmVycm9yLFxuICAgICAgICBvcHRpb25zLndoaXRlbGlzdCB8fCBERUZBVUxUX1dISVRFTElTVFxuICAgICAgKVxuICAgICkge1xuICAgICAgcmVqZWN0aW9uc1tpZF0uZGlzcGxheUlkID0gZGlzcGxheUlkKys7XG4gICAgICBpZiAob3B0aW9ucy5vblVuaGFuZGxlZCkge1xuICAgICAgICByZWplY3Rpb25zW2lkXS5sb2dnZWQgPSB0cnVlO1xuICAgICAgICBvcHRpb25zLm9uVW5oYW5kbGVkKFxuICAgICAgICAgIHJlamVjdGlvbnNbaWRdLmRpc3BsYXlJZCxcbiAgICAgICAgICByZWplY3Rpb25zW2lkXS5lcnJvclxuICAgICAgICApO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgcmVqZWN0aW9uc1tpZF0ubG9nZ2VkID0gdHJ1ZTtcbiAgICAgICAgbG9nRXJyb3IoXG4gICAgICAgICAgcmVqZWN0aW9uc1tpZF0uZGlzcGxheUlkLFxuICAgICAgICAgIHJlamVjdGlvbnNbaWRdLmVycm9yXG4gICAgICAgICk7XG4gICAgICB9XG4gICAgfVxuICB9XG4gIGZ1bmN0aW9uIG9uSGFuZGxlZChpZCkge1xuICAgIGlmIChyZWplY3Rpb25zW2lkXS5sb2dnZWQpIHtcbiAgICAgIGlmIChvcHRpb25zLm9uSGFuZGxlZCkge1xuICAgICAgICBvcHRpb25zLm9uSGFuZGxlZChyZWplY3Rpb25zW2lkXS5kaXNwbGF5SWQsIHJlamVjdGlvbnNbaWRdLmVycm9yKTtcbiAgICAgIH0gZWxzZSBpZiAoIXJlamVjdGlvbnNbaWRdLm9uVW5oYW5kbGVkKSB7XG4gICAgICAgIGNvbnNvbGUud2FybihcbiAgICAgICAgICAnUHJvbWlzZSBSZWplY3Rpb24gSGFuZGxlZCAoaWQ6ICcgKyByZWplY3Rpb25zW2lkXS5kaXNwbGF5SWQgKyAnKTonXG4gICAgICAgICk7XG4gICAgICAgIGNvbnNvbGUud2FybihcbiAgICAgICAgICAnICBUaGlzIG1lYW5zIHlvdSBjYW4gaWdub3JlIGFueSBwcmV2aW91cyBtZXNzYWdlcyBvZiB0aGUgZm9ybSBcIlBvc3NpYmxlIFVuaGFuZGxlZCBQcm9taXNlIFJlamVjdGlvblwiIHdpdGggaWQgJyArXG4gICAgICAgICAgcmVqZWN0aW9uc1tpZF0uZGlzcGxheUlkICsgJy4nXG4gICAgICAgICk7XG4gICAgICB9XG4gICAgfVxuICB9XG59XG5cbmZ1bmN0aW9uIGxvZ0Vycm9yKGlkLCBlcnJvcikge1xuICBjb25zb2xlLndhcm4oJ1Bvc3NpYmxlIFVuaGFuZGxlZCBQcm9taXNlIFJlamVjdGlvbiAoaWQ6ICcgKyBpZCArICcpOicpO1xuICB2YXIgZXJyU3RyID0gKGVycm9yICYmIChlcnJvci5zdGFjayB8fCBlcnJvcikpICsgJyc7XG4gIGVyclN0ci5zcGxpdCgnXFxuJykuZm9yRWFjaChmdW5jdGlvbiAobGluZSkge1xuICAgIGNvbnNvbGUud2FybignICAnICsgbGluZSk7XG4gIH0pO1xufVxuXG5mdW5jdGlvbiBtYXRjaFdoaXRlbGlzdChlcnJvciwgbGlzdCkge1xuICByZXR1cm4gbGlzdC5zb21lKGZ1bmN0aW9uIChjbHMpIHtcbiAgICByZXR1cm4gZXJyb3IgaW5zdGFuY2VvZiBjbHM7XG4gIH0pO1xufSIsIlwidXNlIHN0cmljdFwiO1xuXG52YXIgTG9nZ2VyID0gcmVxdWlyZSgnLi9tb2R1bGVzL2xvZ2dlcicpO1xuXG52YXIgUHViU3ViID0gcmVxdWlyZSgnLi9tb2R1bGVzL3B1YnN1YicpO1xuXG52YXIgQ2FsbGVyID0gcmVxdWlyZSgnLi9tb2R1bGVzL2NhbGxlcicpO1xuXG52YXIgRG9tID0gcmVxdWlyZSgnLi9tb2R1bGVzL2RvbScpO1xuXG52YXIgSW5mb0NvbnRyb2xsZXIgPSByZXF1aXJlKCcuL21vZHVsZXMvaW5mby1jb250cm9sbGVyJyk7XG5cbnZhciBBdmF0YXJDb250cm9sbGVyID0gcmVxdWlyZSgnLi9tb2R1bGVzL2F2YXRhci1jb250cm9sbGVyJyk7XG5cbnZhciBTdG9yZSA9IHJlcXVpcmUoJy4vbW9kdWxlcy9zdG9yZScpO1xuXG52YXIgQW1wbGl0dXRlID0gcmVxdWlyZSgnLi9tb2R1bGVzL2FtcGxpdHVkZScpO1xuXG52YXIgQ2xvdWRpbmFyeSA9IHJlcXVpcmUoJy4vbW9kdWxlcy9jbG91ZGluYXJ5LWltYWdlLXBpY2tlcicpO1xuXG52YXIgQUNHID0gcmVxdWlyZSgnLi9tb2R1bGVzL2FjY291bnQtY29uc2lzdGVuY3ktZ3VhcmQnKTtcblxudmFyIHBwYmFDb25mID0ge307XG5cbmZ1bmN0aW9uIGhleFRvUmdiKGhleCwgb3BhY2l0eSkge1xuICB2YXIgcmVzdWx0ID0gL14jPyhbYS1mXFxkXXsyfSkoW2EtZlxcZF17Mn0pKFthLWZcXGRdezJ9KSQvaS5leGVjKGhleCk7XG4gIHJldHVybiByZXN1bHQgPyBcInJnYmEoXCIuY29uY2F0KHBhcnNlSW50KHJlc3VsdFsxXSwgMTYpLCBcIiwgXCIpLmNvbmNhdChwYXJzZUludChyZXN1bHRbMl0sIDE2KSwgXCIsIFwiKS5jb25jYXQocGFyc2VJbnQocmVzdWx0WzNdLCAxNiksIFwiLCBcIikuY29uY2F0KG9wYWNpdHkgfHwgMSwgXCIpXCIpIDogbnVsbDtcbn1cblxuaWYgKHR5cGVvZiBQcm9taXNlID09PSAndW5kZWZpbmVkJykge1xuICByZXF1aXJlKCdwcm9taXNlL2xpYi9yZWplY3Rpb24tdHJhY2tpbmcnKS5lbmFibGUoKTtcblxuICB3aW5kb3cuUHJvbWlzZSA9IHJlcXVpcmUoJ3Byb21pc2UvbGliL2VzNi1leHRlbnNpb25zLmpzJyk7XG59XG5cbnZhciBhZnRlclJlbmRlciA9IGZ1bmN0aW9uIGFmdGVyUmVuZGVyKCkge1xuICBpZiAoU3RvcmUuZ2V0RnVsbFdpZHRoKCkgPT09IHRydWUpIHtcbiAgICBEb20uYWRkQ2xhc3MoZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoXCJiYWMtLXB1cmVzZGstYmFjLS1oZWFkZXItYXBwcy0tXCIpLCAnYmFjLS1mdWxsd2lkdGgnKTtcbiAgfVxuXG4gIGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKCdiYWMtLXB1cmVzZGstLWFwcHMtLW9wZW5lci0tJykuYWRkRXZlbnRMaXN0ZW5lcignY2xpY2snLCBmdW5jdGlvbiAoZSkge1xuICAgIGUucHJldmVudERlZmF1bHQoKTtcbiAgICBlLnN0b3BQcm9wYWdhdGlvbigpO1xuICAgIERvbS50b2dnbGVDbGFzcyhkb2N1bWVudC5nZXRFbGVtZW50QnlJZCgnYmFjLS1wdXJlc2RrLWFwcHMtY29udGFpbmVyLS0nKSwgJ2FjdGl2ZScpO1xuICB9KTtcbiAgZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoJ2JhYy0tdXNlci1hdmF0YXItdG9wJykuYWRkRXZlbnRMaXN0ZW5lcignY2xpY2snLCBmdW5jdGlvbiAoZSkge1xuICAgIGUuc3RvcFByb3BhZ2F0aW9uKCk7XG4gICAgRG9tLnJlbW92ZUNsYXNzKGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKCdiYWMtLXB1cmVzZGstYXBwcy1jb250YWluZXItLScpLCAnYWN0aXZlJyk7XG4gICAgRG9tLnRvZ2dsZUNsYXNzKGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKCdiYWMtLXB1cmVzZGstdXNlci1zaWRlYmFyLS0nKSwgJ2FjdGl2ZScpO1xuICB9KTtcbiAgd2luZG93LmFkZEV2ZW50TGlzdGVuZXIoJ2NsaWNrJywgZnVuY3Rpb24gKGUpIHtcbiAgICBEb20ucmVtb3ZlQ2xhc3MoZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoJ2JhYy0tcHVyZXNkay1hcHBzLWNvbnRhaW5lci0tJyksICdhY3RpdmUnKTtcbiAgICBEb20ucmVtb3ZlQ2xhc3MoZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoJ2JhYy0tcHVyZXNkay11c2VyLXNpZGViYXItLScpLCAnYWN0aXZlJyk7XG4gIH0pO1xuICBBdmF0YXJDb250cm9sbGVyLmluaXQoKTtcbiAgdmFyIHVzZXJEYXRhID0gU3RvcmUuZ2V0VXNlckRhdGEoKTtcbiAgQXZhdGFyQ29udHJvbGxlci5zZXRBdmF0YXIodXNlckRhdGEudXNlci5hdmF0YXJfdXJsKTtcbiAgSW5mb0NvbnRyb2xsZXIuaW5pdCgpO1xufTtcblxudmFyIFBQQkEgPSB7XG4gIHNldFdpbmRvd05hbWU6IGZ1bmN0aW9uIHNldFdpbmRvd05hbWUod24pIHtcbiAgICBTdG9yZS5zZXRXaW5kb3dOYW1lKHduKTtcbiAgfSxcbiAgc2V0Q29uZmlndXJhdGlvbjogZnVuY3Rpb24gc2V0Q29uZmlndXJhdGlvbihjb25mKSB7XG4gICAgU3RvcmUuc2V0Q29uZmlndXJhdGlvbihjb25mKTtcbiAgfSxcbiAgc2V0SFRNTFRlbXBsYXRlOiBmdW5jdGlvbiBzZXRIVE1MVGVtcGxhdGUodGVtcGxhdGUpIHtcbiAgICBTdG9yZS5zZXRIVE1MVGVtcGxhdGUodGVtcGxhdGUpO1xuICB9LFxuICBzZXRWZXJzaW9uTnVtYmVyOiBmdW5jdGlvbiBzZXRWZXJzaW9uTnVtYmVyKHZlcnNpb24pIHtcbiAgICBTdG9yZS5zZXRWZXJzaW9uTnVtYmVyKHZlcnNpb24pO1xuICB9LFxuICBsb2dFdmVudDogZnVuY3Rpb24gbG9nRXZlbnQoZXZlbnROYW1lLCBwcm9wcykge1xuICAgIEFtcGxpdHV0ZS5sb2dFdmVudChldmVudE5hbWUsIHByb3BzKTtcbiAgfSxcbiAgaW5pdDogZnVuY3Rpb24gaW5pdChjb25mKSB7XG4gICAgTG9nZ2VyLmxvZygnaW5pdGlhbGl6aW5nIHdpdGggY29uZjogJywgY29uZik7XG5cbiAgICBpZiAoY29uZikge1xuICAgICAgaWYgKGNvbmYuaGVhZGVyRGl2SWQpIHtcbiAgICAgICAgU3RvcmUuc2V0SFRNTENvbnRhaW5lcihjb25mLmhlYWRlckRpdklkKTtcbiAgICAgIH1cblxuICAgICAgaWYgKGNvbmYuYXBwc1Zpc2libGUgIT09IG51bGwpIHtcbiAgICAgICAgU3RvcmUuc2V0QXBwc1Zpc2libGUoY29uZi5hcHBzVmlzaWJsZSk7XG4gICAgICB9XG5cbiAgICAgIGlmIChjb25mLnJvb3RVcmwpIHtcbiAgICAgICAgU3RvcmUuc2V0Um9vdFVybChjb25mLnJvb3RVcmwpO1xuICAgICAgfVxuXG4gICAgICBpZiAoY29uZi5kZXYgPT09IHRydWUpIHtcbiAgICAgICAgaWYgKGNvbmYuZGV2S2V5cykge1xuICAgICAgICAgIENhbGxlci5zZXREZXZLZXlzKGNvbmYuZGV2S2V5cyk7XG4gICAgICAgICAgU3RvcmUuc2V0RGV2KHRydWUpO1xuICAgICAgICB9XG4gICAgICB9XG5cbiAgICAgIGlmIChjb25mLmZ1bGxXaWR0aCkge1xuICAgICAgICBTdG9yZS5zZXRGdWxsV2lkdGgoY29uZi5mdWxsV2lkdGgpO1xuICAgICAgfVxuXG4gICAgICBpZiAoY29uZi5kaXNwbGF5U3VwcG9ydCkge1xuICAgICAgICBTdG9yZS5zZXREaXNwbGF5U3VwcG9ydChjb25mLmRpc3BsYXlTdXBwb3J0KTtcbiAgICAgIH1cblxuICAgICAgaWYgKGNvbmYuYXBwSW5mbykge1xuICAgICAgICBTdG9yZS5zZXRBcHBJbmZvKGNvbmYuYXBwSW5mbyk7IC8vIGlmIGdvb2dsZSB0YWcgbWFuYWdlciBpcyBwcmVzZW50IGl0IHdpbGwgcHVzaCB0aGUgdXNlcidzIGluZm8gdG8gZGF0YUxheWVyXG5cbiAgICAgICAgdHJ5IHtcbiAgICAgICAgICBkYXRhTGF5ZXIucHVzaCh7XG4gICAgICAgICAgICAnYXBwJzogY29uZi5hcHBJbmZvLm5hbWVcbiAgICAgICAgICB9KTtcbiAgICAgICAgfSBjYXRjaCAoZSkgey8vIG5vIEdvb2dsZSBUYWcgaGFzIGJlZW4gc2V0XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICAgIC8qIG9wdGlvbmFsIHNlc3Npb24gdXJsICovXG5cblxuICAgICAgaWYgKGNvbmYuc2Vzc2lvbkVuZHBvaW50KSB7XG4gICAgICAgIFN0b3JlLnNldFNlc3Npb25FbmRwb2ludChjb25mLnNlc3Npb25FbmRwb2ludCk7XG4gICAgICB9XG5cbiAgICAgIGlmIChjb25mLmFwaVJvb3RGb2xkZXIpIHtcbiAgICAgICAgU3RvcmUuc2V0VXJsVmVyc2lvblByZWZpeChjb25mLmFwaVJvb3RGb2xkZXIpO1xuICAgICAgfVxuICAgIH1cblxuICAgIHBwYmFDb25mID0gY29uZjtcbiAgICByZXR1cm4gdHJ1ZTtcbiAgfSxcbiAgc2V0dXBHb29nbGVUYWc6IGZ1bmN0aW9uIHNldHVwR29vZ2xlVGFnKHVzZXIpIHtcbiAgICAvLyBpZiBnb29nbGUgdGFnIG1hbmFnZXIgaXMgcHJlc2VudCBpdCB3aWxsIHB1c2ggdGhlIHVzZXIncyBpbmZvIHRvIGRhdGFMYXllclxuICAgIHRyeSB7XG4gICAgICBkYXRhTGF5ZXIucHVzaCh7XG4gICAgICAgICd1c2VySWQnOiB1c2VyLmlkLFxuICAgICAgICAndXNlcic6IFwiXCIuY29uY2F0KHVzZXIuZmlyc3RuYW1lLCBcIiBcIikuY29uY2F0KHVzZXIubGFzdG5hbWUpLFxuICAgICAgICAndGVuYW50X2lkJzogdXNlci50ZW5hbnRfaWQsXG4gICAgICAgICd1c2VyVHlwZSc6IHVzZXIudXNlcl90eXBlLFxuICAgICAgICAnYWNjb3VudElkJzogdXNlci5hY2NvdW50X2lkLFxuICAgICAgICAnYWNjb3VudE5hbWUnOiB1c2VyLmFjY291bnQubmFtZVxuICAgICAgfSk7XG4gICAgfSBjYXRjaCAoZSkgey8vIG5vIEdvb2dsZSBUYWcgaGFzIGJlZW4gc2V0XG4gICAgfVxuICB9LFxuICBhdXRoZW50aWNhdGU6IGZ1bmN0aW9uIGF1dGhlbnRpY2F0ZShfc3VjY2Vzcykge1xuICAgIHZhciBzZWxmID0gUFBCQTtcbiAgICBDYWxsZXIubWFrZUNhbGwoe1xuICAgICAgdHlwZTogJ0dFVCcsXG4gICAgICBlbmRwb2ludDogU3RvcmUuZ2V0QXV0aGVudGljYXRpb25FbmRwb2ludCgpLFxuICAgICAgY2FsbGJhY2tzOiB7XG4gICAgICAgIHN1Y2Nlc3M6IGZ1bmN0aW9uIHN1Y2Nlc3MocmVzdWx0KSB7XG4gICAgICAgICAgLy8gY29uc29sZS5sb2cocmVzdWx0KTtcbiAgICAgICAgICBTdG9yZS5zZXRVc2VyRGF0YShyZXN1bHQpO1xuICAgICAgICAgIHNlbGYucmVuZGVyKCk7XG4gICAgICAgICAgUFBCQS5nZXRBcHBzKCk7XG4gICAgICAgICAgQUNHLmNoYW5nZUFjY291bnQocmVzdWx0LnVzZXIuYWNjb3VudC5zZmlkKTtcbiAgICAgICAgICBBQ0cuaW5pdGlhbGlzZShyZXN1bHQudXNlci5hY2NvdW50LnNmaWQsIGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgIERvbS5yZW1vdmVDbGFzcyhkb2N1bWVudC5nZXRFbGVtZW50QnlJZCgnYmFjLS0taW52YWxpZC1hY2NvdW50JyksICdpbnZhbGlkJyk7XG4gICAgICAgICAgfSwgZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgRG9tLmFkZENsYXNzKGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKCdiYWMtLS1pbnZhbGlkLWFjY291bnQnKSwgJ2ludmFsaWQnKTtcbiAgICAgICAgICB9KTtcbiAgICAgICAgICBQUEJBLnNldHVwR29vZ2xlVGFnKHJlc3VsdC51c2VyKTtcbiAgICAgICAgICBBbXBsaXR1dGUuaW5pdChyZXN1bHQudXNlcik7XG4gICAgICAgICAgQW1wbGl0dXRlLmxvZ0V2ZW50KCd2aXNpdCcpO1xuXG4gICAgICAgICAgX3N1Y2Nlc3MocmVzdWx0KTtcbiAgICAgICAgfSxcbiAgICAgICAgZmFpbDogZnVuY3Rpb24gZmFpbChlcnIpIHtcbiAgICAgICAgICB3aW5kb3cubG9jYXRpb24uaHJlZiA9IFN0b3JlLmdldExvZ2luVXJsKCk7XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICB9KTtcbiAgfSxcbiAgYXV0aGVudGljYXRlUHJvbWlzZTogZnVuY3Rpb24gYXV0aGVudGljYXRlUHJvbWlzZSgpIHtcbiAgICB2YXIgc2VsZiA9IFBQQkE7XG4gICAgcmV0dXJuIENhbGxlci5wcm9taXNlQ2FsbCh7XG4gICAgICB0eXBlOiAnR0VUJyxcbiAgICAgIGVuZHBvaW50OiBTdG9yZS5nZXRBdXRoZW50aWNhdGlvbkVuZHBvaW50KCksXG4gICAgICBtaWRkbGV3YXJlczoge1xuICAgICAgICBzdWNjZXNzOiBmdW5jdGlvbiBzdWNjZXNzKHJlc3VsdCkge1xuICAgICAgICAgIC8vIGNvbnNvbGUubG9nKHJlc3VsdCk7XG4gICAgICAgICAgU3RvcmUuc2V0VXNlckRhdGEocmVzdWx0KTtcbiAgICAgICAgICBzZWxmLnJlbmRlcigpO1xuICAgICAgICAgIFBQQkEuZ2V0QXBwcygpO1xuICAgICAgICAgIEFDRy5jaGFuZ2VBY2NvdW50KHJlc3VsdC51c2VyLmFjY291bnQuc2ZpZCk7XG4gICAgICAgICAgQUNHLmluaXRpYWxpc2UocmVzdWx0LnVzZXIuYWNjb3VudC5zZmlkLCBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICBEb20ucmVtb3ZlQ2xhc3MoZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoJ2JhYy0tLWludmFsaWQtYWNjb3VudCcpLCAnaW52YWxpZCcpO1xuICAgICAgICAgIH0sIGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgIERvbS5hZGRDbGFzcyhkb2N1bWVudC5nZXRFbGVtZW50QnlJZCgnYmFjLS0taW52YWxpZC1hY2NvdW50JyksICdpbnZhbGlkJyk7XG4gICAgICAgICAgfSk7XG4gICAgICAgICAgQW1wbGl0dXRlLmluaXQocmVzdWx0LnVzZXIpO1xuICAgICAgICAgIEFtcGxpdHV0ZS5sb2dFdmVudCgndmlzaXQnKTtcbiAgICAgICAgICBQUEJBLnNldHVwR29vZ2xlVGFnKHJlc3VsdC51c2VyKTtcbiAgICAgICAgfVxuICAgICAgfVxuICAgIH0pO1xuICB9LFxuICBnZXRBcHBzOiBmdW5jdGlvbiBnZXRBcHBzKCkge1xuICAgIENhbGxlci5tYWtlQ2FsbCh7XG4gICAgICB0eXBlOiAnR0VUJyxcbiAgICAgIGVuZHBvaW50OiBTdG9yZS5nZXRBcHBzRW5kcG9pbnQoKSxcbiAgICAgIGNhbGxiYWNrczoge1xuICAgICAgICBzdWNjZXNzOiBmdW5jdGlvbiBzdWNjZXNzKHJlc3VsdCkge1xuICAgICAgICAgIFN0b3JlLnNldEFwcHMocmVzdWx0KTtcbiAgICAgICAgICBQUEJBLnJlbmRlckFwcHMocmVzdWx0LmFwcHMpO1xuICAgICAgICB9LFxuICAgICAgICBmYWlsOiBmdW5jdGlvbiBmYWlsKGVycikge1xuICAgICAgICAgIHdpbmRvdy5sb2NhdGlvbi5ocmVmID0gU3RvcmUuZ2V0TG9naW5VcmwoKTtcbiAgICAgICAgfVxuICAgICAgfVxuICAgIH0pO1xuICB9LFxuICBnZXRBdmFpbGFibGVMaXN0ZW5lcnM6IGZ1bmN0aW9uIGdldEF2YWlsYWJsZUxpc3RlbmVycygpIHtcbiAgICByZXR1cm4gUHViU3ViLmdldEF2YWlsYWJsZUxpc3RlbmVycygpO1xuICB9LFxuICBzdWJzY3JpYmVMaXN0ZW5lcjogZnVuY3Rpb24gc3Vic2NyaWJlTGlzdGVuZXIoZXZlbnR0LCBmdW5jdCkge1xuICAgIHJldHVybiBQdWJTdWIuc3Vic2NyaWJlKGV2ZW50dCwgZnVuY3QpO1xuICB9LFxuICBnZXRVc2VyRGF0YTogZnVuY3Rpb24gZ2V0VXNlckRhdGEoKSB7XG4gICAgcmV0dXJuIFN0b3JlLmdldFVzZXJEYXRhKCk7XG4gIH0sXG4gIHNldElucHV0UGxhY2Vob2xkZXI6IGZ1bmN0aW9uIHNldElucHV0UGxhY2Vob2xkZXIodHh0KSB7Ly8gZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoU3RvcmUuZ2V0U2VhcmNoSW5wdXRJZCgpKS5wbGFjZWhvbGRlciA9IHR4dDtcbiAgfSxcbiAgY2hhbmdlQWNjb3VudDogZnVuY3Rpb24gY2hhbmdlQWNjb3VudChhY2NvdW50SWQpIHtcbiAgICBDYWxsZXIubWFrZUNhbGwoe1xuICAgICAgdHlwZTogJ0dFVCcsXG4gICAgICBlbmRwb2ludDogU3RvcmUuZ2V0U3dpdGNoQWNjb3VudEVuZHBvaW50KGFjY291bnRJZCksXG4gICAgICBjYWxsYmFja3M6IHtcbiAgICAgICAgc3VjY2VzczogZnVuY3Rpb24gc3VjY2VzcyhyZXN1bHQpIHtcbiAgICAgICAgICBBbXBsaXR1dGUubG9nRXZlbnQoJ2FjY291bnQgY2hhbmdlJywge30pO1xuICAgICAgICAgIEFDRy5jaGFuZ2VBY2NvdW50KGFjY291bnRJZCk7XG4gICAgICAgICAgd2luZG93LmxvY2F0aW9uLmhyZWYgPSAnL2FwcHMnO1xuICAgICAgICB9LFxuICAgICAgICBmYWlsOiBmdW5jdGlvbiBmYWlsKGVycikge1xuICAgICAgICAgIGFsZXJ0KCdTb3JyeSwgc29tZXRoaW5nIHdlbnQgd3Jvbmcgd2l0aCB5b3VyIHJlcXVlc3QuIFBsZXNlIHRyeSBhZ2FpbicpO1xuICAgICAgICB9XG4gICAgICB9XG4gICAgfSk7XG4gIH0sXG4gIHJlbmRlckFwcHM6IGZ1bmN0aW9uIHJlbmRlckFwcHMoYXBwcykge1xuICAgIHZhciBhcHBUZW1wbGF0ZSA9IGZ1bmN0aW9uIGFwcFRlbXBsYXRlKGFwcCkge1xuICAgICAgcmV0dXJuIFwiXFxuXFx0XFx0XFx0XFx0PGEgY2xhc3M9XFxcImJhYy0taW1hZ2UtbGlua1xcXCIgaHJlZj1cXFwiXCIuY29uY2F0KGFwcC5hcHBsaWNhdGlvbl91cmwsIFwiXFxcIiBzdHlsZT1cXFwiYmFja2dyb3VuZDogI1wiKS5jb25jYXQoYXBwLmNvbG9yLCBcIlxcXCI+XFxuXFx0XFx0XFx0XFx0XFx0PGltZyBzcmM9XFxcIlwiKS5jb25jYXQoYXBwLmljb24sIFwiXFxcIiAvPlxcblxcdFxcdFxcdFxcdDwvYT5cXG5cXHRcXHRcXHRcXHRcXG5cXHRcXHRcXHRcXHQ8ZGl2IGNsYXNzPVxcXCJiYWMtLXB1cmVzZGstYXBwLXRleHQtY29udGFpbmVyXFxcIj5cXG5cXHRcXHRcXHRcXHRcXHQ8YSBocmVmPVxcXCJcIikuY29uY2F0KGFwcC5hcHBsaWNhdGlvbl91cmwsIFwiXFxcIiBjbGFzcz1cXFwiYmFjLS1hcHAtbmFtZVxcXCI+XCIpLmNvbmNhdChhcHAubmFtZSwgXCI8L2E+XFxuXFx0XFx0XFx0XFx0XFx0PGEgaHJlZj1cXFwiXCIpLmNvbmNhdChhcHAuYXBwbGljYXRpb25fdXJsLCBcIlxcXCIgY2xhc3M9XFxcImJhYy0tYXBwLWRlc2NyaXB0aW9uXFxcIj5cIikuY29uY2F0KGFwcC5kZXNjciA9PT0gbnVsbCA/ICctJyA6IGFwcC5kZXNjciwgXCI8L2E+XFxuXFx0XFx0XFx0XFx0PC9kaXY+XFxuXFx0XFx0XFx0XCIpO1xuICAgIH07XG5cbiAgICBmb3IgKHZhciBpID0gMDsgaSA8IGFwcHMubGVuZ3RoOyBpKyspIHtcbiAgICAgIHZhciBhcHAgPSBhcHBzW2ldO1xuICAgICAgdmFyIGRpdiA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoXCJkaXZcIik7XG4gICAgICBkaXYuY2xhc3NOYW1lID0gXCJiYWMtLWFwcHNcIjtcbiAgICAgIGRpdi5pbm5lckhUTUwgPSBhcHBUZW1wbGF0ZShhcHApOyAvLyBjaGVjayB0byBzZWUgaWYgdGhlIHVzZXIgaGFzIGFjY2VzcyB0byB0aGUgdHdvIG1haW4gYXBwcyBhbmQgcmVtb3ZlIGRpc2FibGVkIGNsYXNzXG5cbiAgICAgIGlmIChhcHAuYXBwbGljYXRpb25fdXJsID09PSAnL2FwcC9ncm91cHMnKSB7XG4gICAgICAgIERvbS5yZW1vdmVDbGFzcyhkb2N1bWVudC5nZXRFbGVtZW50QnlJZCgnYmFjLS1wdXJlc2RrLWdyb3Vwcy1saW5rLS0nKSwgJ2Rpc2FibGVkJyk7XG4gICAgICB9IGVsc2UgaWYgKGFwcC5hcHBsaWNhdGlvbl91cmwgPT09ICcvYXBwL2NhbXBhaWducycpIHtcbiAgICAgICAgRG9tLnJlbW92ZUNsYXNzKGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKCdiYWMtLXB1cmVzZGstY2FtcGFpZ25zLWxpbmstLScpLCAnZGlzYWJsZWQnKTtcbiAgICAgIH1cblxuICAgICAgZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoXCJiYWMtLWFwcy1hY3R1YWwtY29udGFpbmVyXCIpLmFwcGVuZENoaWxkKGRpdik7XG4gICAgfSAvLyBmaW5hbGx5IGNoZWNrIGlmIHRoZSB1c2VyIGlzIG9uIGFueSBvZiB0aGUgdHdvIG1haW4gYXBwc1xuXG5cbiAgICB2YXIgYXBwSW5mbyA9IFN0b3JlLmdldEFwcEluZm8oKTtcblxuICAgIGlmIChhcHBJbmZvLnJvb3QgPT09IFwiL2FwcC9ncm91cHNcIikge1xuICAgICAgRG9tLmFkZENsYXNzKGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKCdiYWMtLXB1cmVzZGstZ3JvdXBzLWxpbmstLScpLCAnc2VsZWN0ZWQnKTtcbiAgICB9IGVsc2UgaWYgKGFwcEluZm8ucm9vdCA9PT0gXCIvYXBwL2NhbXBhaWduc1wiKSB7XG4gICAgICBEb20uYWRkQ2xhc3MoZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoJ2JhYy0tcHVyZXNkay1jYW1wYWlnbnMtbGluay0tJyksICdzZWxlY3RlZCcpO1xuICAgIH1cbiAgfSxcbiAgcmVuZGVyVXNlcjogZnVuY3Rpb24gcmVuZGVyVXNlcih1c2VyKSB7XG4gICAgdmFyIHVzZXJUZW1wbGF0ZSA9IGZ1bmN0aW9uIHVzZXJUZW1wbGF0ZSh1c2VyKSB7XG4gICAgICByZXR1cm4gXCJcXG5cXHRcXHRcXHRcXHQ8ZGl2IGNsYXNzPVxcXCJiYWMtLXVzZXItaW1hZ2VcXFwiIGlkPVxcXCJiYWMtLXVzZXItaW1hZ2VcXFwiPlxcblxcdFxcdFxcdFxcdFxcdDxpIGNsYXNzPVxcXCJmYSBmYS1jYW1lcmFcXFwiPjwvaT5cXG5cXHRcXHRcXHQgICBcXHQ8ZGl2IGlkPVxcXCJiYWMtLXVzZXItaW1hZ2UtZmlsZVxcXCI+PC9kaXY+XFxuXFx0XFx0XFx0ICAgXFx0PGRpdiBpZD1cXFwiYmFjLS11c2VyLWltYWdlLXVwbG9hZC1wcm9ncmVzc1xcXCI+XFxuXFx0XFx0XFx0ICAgXFx0XFx0PHN2ZyB3aWR0aD0nNjBweCcgaGVpZ2h0PSc2MHB4JyB4bWxucz1cXFwiaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmdcXFwiIHZpZXdCb3g9XFxcIjAgMCAxMDAgMTAwXFxcIiBwcmVzZXJ2ZUFzcGVjdFJhdGlvPVxcXCJ4TWlkWU1pZFxcXCIgY2xhc3M9XFxcInVpbC1kZWZhdWx0XFxcIj48cmVjdCB4PVxcXCIwXFxcIiB5PVxcXCIwXFxcIiB3aWR0aD1cXFwiMTAwXFxcIiBoZWlnaHQ9XFxcIjEwMFxcXCIgZmlsbD1cXFwibm9uZVxcXCIgY2xhc3M9XFxcImJrXFxcIj48L3JlY3Q+PHJlY3QgIHg9JzQ2LjUnIHk9JzQwJyB3aWR0aD0nNycgaGVpZ2h0PScyMCcgcng9JzUnIHJ5PSc1JyBmaWxsPScjZmZmZmZmJyB0cmFuc2Zvcm09J3JvdGF0ZSgwIDUwIDUwKSB0cmFuc2xhdGUoMCAtMzApJz4gIDxhbmltYXRlIGF0dHJpYnV0ZU5hbWU9J29wYWNpdHknIGZyb209JzEnIHRvPScwJyBkdXI9JzFzJyBiZWdpbj0nLTFzJyByZXBlYXRDb3VudD0naW5kZWZpbml0ZScvPjwvcmVjdD48cmVjdCAgeD0nNDYuNScgeT0nNDAnIHdpZHRoPSc3JyBoZWlnaHQ9JzIwJyByeD0nNScgcnk9JzUnIGZpbGw9JyNmZmZmZmYnIHRyYW5zZm9ybT0ncm90YXRlKDMwIDUwIDUwKSB0cmFuc2xhdGUoMCAtMzApJz4gIDxhbmltYXRlIGF0dHJpYnV0ZU5hbWU9J29wYWNpdHknIGZyb209JzEnIHRvPScwJyBkdXI9JzFzJyBiZWdpbj0nLTAuOTE2NjY2NjY2NjY2NjY2NnMnIHJlcGVhdENvdW50PSdpbmRlZmluaXRlJy8+PC9yZWN0PjxyZWN0ICB4PSc0Ni41JyB5PSc0MCcgd2lkdGg9JzcnIGhlaWdodD0nMjAnIHJ4PSc1JyByeT0nNScgZmlsbD0nI2ZmZmZmZicgdHJhbnNmb3JtPSdyb3RhdGUoNjAgNTAgNTApIHRyYW5zbGF0ZSgwIC0zMCknPiAgPGFuaW1hdGUgYXR0cmlidXRlTmFtZT0nb3BhY2l0eScgZnJvbT0nMScgdG89JzAnIGR1cj0nMXMnIGJlZ2luPSctMC44MzMzMzMzMzMzMzMzMzM0cycgcmVwZWF0Q291bnQ9J2luZGVmaW5pdGUnLz48L3JlY3Q+PHJlY3QgIHg9JzQ2LjUnIHk9JzQwJyB3aWR0aD0nNycgaGVpZ2h0PScyMCcgcng9JzUnIHJ5PSc1JyBmaWxsPScjZmZmZmZmJyB0cmFuc2Zvcm09J3JvdGF0ZSg5MCA1MCA1MCkgdHJhbnNsYXRlKDAgLTMwKSc+ICA8YW5pbWF0ZSBhdHRyaWJ1dGVOYW1lPSdvcGFjaXR5JyBmcm9tPScxJyB0bz0nMCcgZHVyPScxcycgYmVnaW49Jy0wLjc1cycgcmVwZWF0Q291bnQ9J2luZGVmaW5pdGUnLz48L3JlY3Q+PHJlY3QgIHg9JzQ2LjUnIHk9JzQwJyB3aWR0aD0nNycgaGVpZ2h0PScyMCcgcng9JzUnIHJ5PSc1JyBmaWxsPScjZmZmZmZmJyB0cmFuc2Zvcm09J3JvdGF0ZSgxMjAgNTAgNTApIHRyYW5zbGF0ZSgwIC0zMCknPiAgPGFuaW1hdGUgYXR0cmlidXRlTmFtZT0nb3BhY2l0eScgZnJvbT0nMScgdG89JzAnIGR1cj0nMXMnIGJlZ2luPSctMC42NjY2NjY2NjY2NjY2NjY2cycgcmVwZWF0Q291bnQ9J2luZGVmaW5pdGUnLz48L3JlY3Q+PHJlY3QgIHg9JzQ2LjUnIHk9JzQwJyB3aWR0aD0nNycgaGVpZ2h0PScyMCcgcng9JzUnIHJ5PSc1JyBmaWxsPScjZmZmZmZmJyB0cmFuc2Zvcm09J3JvdGF0ZSgxNTAgNTAgNTApIHRyYW5zbGF0ZSgwIC0zMCknPiAgPGFuaW1hdGUgYXR0cmlidXRlTmFtZT0nb3BhY2l0eScgZnJvbT0nMScgdG89JzAnIGR1cj0nMXMnIGJlZ2luPSctMC41ODMzMzMzMzMzMzMzMzM0cycgcmVwZWF0Q291bnQ9J2luZGVmaW5pdGUnLz48L3JlY3Q+PHJlY3QgIHg9JzQ2LjUnIHk9JzQwJyB3aWR0aD0nNycgaGVpZ2h0PScyMCcgcng9JzUnIHJ5PSc1JyBmaWxsPScjZmZmZmZmJyB0cmFuc2Zvcm09J3JvdGF0ZSgxODAgNTAgNTApIHRyYW5zbGF0ZSgwIC0zMCknPiAgPGFuaW1hdGUgYXR0cmlidXRlTmFtZT0nb3BhY2l0eScgZnJvbT0nMScgdG89JzAnIGR1cj0nMXMnIGJlZ2luPSctMC41cycgcmVwZWF0Q291bnQ9J2luZGVmaW5pdGUnLz48L3JlY3Q+PHJlY3QgIHg9JzQ2LjUnIHk9JzQwJyB3aWR0aD0nNycgaGVpZ2h0PScyMCcgcng9JzUnIHJ5PSc1JyBmaWxsPScjZmZmZmZmJyB0cmFuc2Zvcm09J3JvdGF0ZSgyMTAgNTAgNTApIHRyYW5zbGF0ZSgwIC0zMCknPiAgPGFuaW1hdGUgYXR0cmlidXRlTmFtZT0nb3BhY2l0eScgZnJvbT0nMScgdG89JzAnIGR1cj0nMXMnIGJlZ2luPSctMC40MTY2NjY2NjY2NjY2NjY3cycgcmVwZWF0Q291bnQ9J2luZGVmaW5pdGUnLz48L3JlY3Q+PHJlY3QgIHg9JzQ2LjUnIHk9JzQwJyB3aWR0aD0nNycgaGVpZ2h0PScyMCcgcng9JzUnIHJ5PSc1JyBmaWxsPScjZmZmZmZmJyB0cmFuc2Zvcm09J3JvdGF0ZSgyNDAgNTAgNTApIHRyYW5zbGF0ZSgwIC0zMCknPiAgPGFuaW1hdGUgYXR0cmlidXRlTmFtZT0nb3BhY2l0eScgZnJvbT0nMScgdG89JzAnIGR1cj0nMXMnIGJlZ2luPSctMC4zMzMzMzMzMzMzMzMzMzMzcycgcmVwZWF0Q291bnQ9J2luZGVmaW5pdGUnLz48L3JlY3Q+PHJlY3QgIHg9JzQ2LjUnIHk9JzQwJyB3aWR0aD0nNycgaGVpZ2h0PScyMCcgcng9JzUnIHJ5PSc1JyBmaWxsPScjZmZmZmZmJyB0cmFuc2Zvcm09J3JvdGF0ZSgyNzAgNTAgNTApIHRyYW5zbGF0ZSgwIC0zMCknPiAgPGFuaW1hdGUgYXR0cmlidXRlTmFtZT0nb3BhY2l0eScgZnJvbT0nMScgdG89JzAnIGR1cj0nMXMnIGJlZ2luPSctMC4yNXMnIHJlcGVhdENvdW50PSdpbmRlZmluaXRlJy8+PC9yZWN0PjxyZWN0ICB4PSc0Ni41JyB5PSc0MCcgd2lkdGg9JzcnIGhlaWdodD0nMjAnIHJ4PSc1JyByeT0nNScgZmlsbD0nI2ZmZmZmZicgdHJhbnNmb3JtPSdyb3RhdGUoMzAwIDUwIDUwKSB0cmFuc2xhdGUoMCAtMzApJz4gIDxhbmltYXRlIGF0dHJpYnV0ZU5hbWU9J29wYWNpdHknIGZyb209JzEnIHRvPScwJyBkdXI9JzFzJyBiZWdpbj0nLTAuMTY2NjY2NjY2NjY2NjY2NjZzJyByZXBlYXRDb3VudD0naW5kZWZpbml0ZScvPjwvcmVjdD48cmVjdCAgeD0nNDYuNScgeT0nNDAnIHdpZHRoPSc3JyBoZWlnaHQ9JzIwJyByeD0nNScgcnk9JzUnIGZpbGw9JyNmZmZmZmYnIHRyYW5zZm9ybT0ncm90YXRlKDMzMCA1MCA1MCkgdHJhbnNsYXRlKDAgLTMwKSc+ICA8YW5pbWF0ZSBhdHRyaWJ1dGVOYW1lPSdvcGFjaXR5JyBmcm9tPScxJyB0bz0nMCcgZHVyPScxcycgYmVnaW49Jy0wLjA4MzMzMzMzMzMzMzMzMzMzcycgcmVwZWF0Q291bnQ9J2luZGVmaW5pdGUnLz48L3JlY3Q+PC9zdmc+XFxuXFx0XFx0XFx0XFx0XFx0PC9kaXY+XFxuXFx0XFx0XFx0ICAgPC9kaXY+XFxuXFx0XFx0XFx0XFx0PGRpdiBjbGFzcz1cXFwiYmFjLS11c2VyLW5hbWVcXFwiPlwiLmNvbmNhdCh1c2VyLmZpcnN0bmFtZSwgXCIgXCIpLmNvbmNhdCh1c2VyLmxhc3RuYW1lLCBcIjwvZGl2PlxcblxcdFxcdFxcdFxcdDxkaXYgY2xhc3M9XFxcImJhYy0tdXNlci1lbWFpbFxcXCI+XCIpLmNvbmNhdCh1c2VyLmVtYWlsLCBcIjwvZGl2PlxcblxcdFxcdFxcdFwiKTtcbiAgICB9O1xuXG4gICAgdmFyIGRpdiA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoJ2RpdicpO1xuICAgIGRpdi5jbGFzc05hbWUgPSBcImJhYy0tdXNlci1zaWRlYmFyLWluZm9cIjtcbiAgICBkaXYuaW5uZXJIVE1MID0gdXNlclRlbXBsYXRlKHVzZXIpO1xuICAgIGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKCdiYWMtLXB1cmVzZGstdXNlci1kZXRhaWxzLS0nKS5wcmVwZW5kKGRpdik7XG4gICAgZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoJ2JhYy0tcHVyZXNkay11c2VyLWF2YXRhci0tJykuaW5uZXJIVE1MID0gdXNlci5maXJzdG5hbWUuY2hhckF0KDApICsgdXNlci5sYXN0bmFtZS5jaGFyQXQoMCk7XG4gIH0sXG4gIHJlbmRlckFjY291bnRzOiBmdW5jdGlvbiByZW5kZXJBY2NvdW50cyhhY2NvdW50cywgY3VycmVudEFjY291bnQpIHtcbiAgICAvLyBMb2dnZXIubG9nKGN1cnJlbnRBY2NvdW50KTtcbiAgICB2YXIgYWNjb3VudHNUZW1wbGF0ZSA9IGZ1bmN0aW9uIGFjY291bnRzVGVtcGxhdGUoYWNjb3VudCwgaXNUaGVTZWxlY3RlZCkge1xuICAgICAgcmV0dXJuIFwiXFxuXFx0XFx0XFx0XFx0PGRpdiBjbGFzcz1cXFwiYmFjLS11c2VyLWxpc3QtaXRlbS1pbWFnZVxcXCI+XFxuXFx0XFx0XFx0XFx0XFx0PGltZyBzcmM9XFxcIlwiLmNvbmNhdChhY2NvdW50LnNka19zcXVhcmVfbG9nb19pY29uLCBcIlxcXCIgYWx0PVxcXCJcXFwiPlxcblxcdFxcdFxcdFxcdDwvZGl2PlxcblxcdFxcdFxcdFxcdDxkaXYgY2xhc3M9XFxcImJhYy11c2VyLWFwcC1kZXRhaWxzXFxcIj5cXG5cXHRcXHRcXHRcXHRcXHQgPHNwYW4+XCIpLmNvbmNhdChhY2NvdW50Lm5hbWUsIFwiPC9zcGFuPlxcblxcdFxcdFxcdFxcdDwvZGl2PlxcblxcdFxcdFxcdFxcdFwiKS5jb25jYXQoaXNUaGVTZWxlY3RlZCA/ICc8ZGl2IGlkPVwiYmFjLS1zZWxlY3RlZC1hY291bnQtaW5kaWNhdG9yXCIgY2xhc3M9XCJiYWMtLXNlbGVjdGVkLWFjb3VudC1pbmRpY2F0b3JcIj48L2Rpdj4nIDogJycsIFwiXFxuXFx0XFx0XFx0XCIpO1xuICAgIH07XG5cbiAgICB2YXIgX2xvb3AgPSBmdW5jdGlvbiBfbG9vcChpKSB7XG4gICAgICB2YXIgYWNjb3VudCA9IGFjY291bnRzW2ldO1xuICAgICAgdmFyIGRpdiA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoJ2RpdicpO1xuICAgICAgZGl2LmNsYXNzTmFtZSA9ICdiYWMtLXVzZXItbGlzdC1pdGVtJztcbiAgICAgIGRpdi5pbm5lckhUTUwgPSBhY2NvdW50c1RlbXBsYXRlKGFjY291bnQsIGFjY291bnQuc2ZpZCA9PT0gY3VycmVudEFjY291bnQuc2ZpZCk7XG5cbiAgICAgIGlmIChhY2NvdW50LnNmaWQgPT09IGN1cnJlbnRBY2NvdW50LnNmaWQpIHtcbiAgICAgICAgZGl2LnN0eWxlLmJhY2tncm91bmQgPSBoZXhUb1JnYignI0ZGRkZGRicsIDAuODUpO1xuICAgICAgfVxuXG4gICAgICBkaXYub25jbGljayA9IGZ1bmN0aW9uIChlKSB7XG4gICAgICAgIGUucHJldmVudERlZmF1bHQoKTtcbiAgICAgICAgUFBCQS5jaGFuZ2VBY2NvdW50KGFjY291bnQuc2ZpZCk7XG4gICAgICB9O1xuXG4gICAgICBkb2N1bWVudC5nZXRFbGVtZW50QnlJZCgnYmFjLS1wdXJlc2RrLXVzZXItYnVzaW5lc3Nlcy0tJykuYXBwZW5kQ2hpbGQoZGl2KTtcbiAgICB9O1xuXG4gICAgZm9yICh2YXIgaSA9IDA7IGkgPCBhY2NvdW50cy5sZW5ndGg7IGkrKykge1xuICAgICAgX2xvb3AoaSk7XG4gICAgfVxuICB9LFxuICByZW5kZXJJbmZvQmxvY2tzOiBmdW5jdGlvbiByZW5kZXJJbmZvQmxvY2tzKCkge1xuICAgIEluZm9Db250cm9sbGVyLnJlbmRlckluZm9CbG9ja3MoKTtcbiAgfSxcbiAgcmVuZGVyVmVyc2lvbk51bWJlcjogZnVuY3Rpb24gcmVuZGVyVmVyc2lvbk51bWJlcih2ZXJzaW9uKSB7XG4gICAgZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoJ3B1cmVzZGstdmVyc2lvbi1udW1iZXInKS5pbm5lckhUTUwgPSB2ZXJzaW9uO1xuICB9LFxuICByZW5kZXJaZW5kZXNrOiBmdW5jdGlvbiByZW5kZXJaZW5kZXNrKCkge1xuICAgIGlmIChTdG9yZS5nZXREaXNwbGF5U3VwcG9ydCgpKSB7XG4gICAgICB2YXIgemRzY3JpcHQgPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KCdzY3JpcHQnKTtcbiAgICAgIHpkc2NyaXB0LnNyYyA9IFwiaHR0cHM6Ly9zdGF0aWMuemRhc3NldHMuY29tL2Vrci9zbmlwcGV0LmpzP2tleT05ODY4YzcxZC02NzkzLTQyYWEtYjJmYS0xMjQxOWM3YmQ0OThcIjtcbiAgICAgIHpkc2NyaXB0LmlkID0gXCJ6ZS1zbmlwcGV0XCI7XG4gICAgICB6ZHNjcmlwdC5hc3luYyA9IHRydWU7XG4gICAgICB6ZHNjcmlwdC50eXBlID0gJ3RleHQvamF2YXNjcmlwdCc7XG4gICAgICBkb2N1bWVudC5nZXRFbGVtZW50c0J5VGFnTmFtZSgnaGVhZCcpWzBdLmFwcGVuZENoaWxkKHpkc2NyaXB0KTtcbiAgICB9XG4gIH0sXG4gIHN0eWxlQWNjb3VudDogZnVuY3Rpb24gc3R5bGVBY2NvdW50KGFjY291bnQpIHtcbiAgICB2YXIgYXBwSW5mbyA9IFN0b3JlLmdldEFwcEluZm8oKTtcbiAgICB2YXIgbG9nbyA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoJ2ltZycpO1xuICAgIGxvZ28uc3JjID0gYWNjb3VudC5zZGtfbG9nb19pY29uO1xuICAgIGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKCdiYWMtLXB1cmVzZGstYWNjb3VudC1sb2dvLS0nKS5wcmVwZW5kKGxvZ28pO1xuXG4gICAgZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoJ2JhYy0tcHVyZXNkay1hY2NvdW50LWxvZ28tLScpLm9uY2xpY2sgPSBmdW5jdGlvbiAoZSkge1xuICAgICAgd2luZG93LmxvY2F0aW9uLmhyZWYgPSBTdG9yZS5nZXRSb290VXJsKCk7XG4gICAgfTtcblxuICAgIGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKFwiYXBwLW5hbWUtbGluay10by1yb290XCIpLmhyZWYgPSBTdG9yZS5nZXRSb290VXJsKCk7XG4gICAgdmFyIHJnYkJnID0gaGV4VG9SZ2IoYWNjb3VudC5zZGtfYmFja2dyb3VuZF9jb2xvciwgMC4xNSk7XG4gICAgZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoJ2JhYy0tcHVyZXNkay1iYWMtLWhlYWRlci1hcHBzLS0nKS5zdHlsZS5jc3NUZXh0ID0gXCJiYWNrZ3JvdW5kOiAjXCIgKyBhY2NvdW50LnNka19iYWNrZ3JvdW5kX2NvbG9yO1xuICAgIGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKCdiYWMtLXVzZXItc2lkZWJhci13aGl0ZS1iZycpLnN0eWxlLmNzc1RleHQgPSBcImJhY2tncm91bmQtY29sb3I6IFwiICsgcmdiQmc7IC8vIGlmKGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKCdiYWMtLXB1cmVzZGstYXBwcy1uYW1lLS0nKSl7XG4gICAgLy8gXHRkb2N1bWVudC5nZXRFbGVtZW50QnlJZCgnYmFjLS1wdXJlc2RrLWFwcHMtbmFtZS0tJykuc3R5bGUuY3NzVGV4dCA9IFwiY29sb3I6ICNcIiArIGFjY291bnQuc2RrX2ZvbnRfY29sb3I7XG4gICAgLy8gfVxuICAgIC8vIGlmKGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKCdiYWMtLXNlbGVjdGVkLWFjb3VudC1pbmRpY2F0b3InKSl7XG4gICAgLy8gXHRkb2N1bWVudC5nZXRFbGVtZW50QnlJZCgnYmFjLS1zZWxlY3RlZC1hY291bnQtaW5kaWNhdG9yJykuc3R5bGUuY3NzVGV4dCA9IFwiYmFja2dyb3VuZDogI1wiICsgYWNjb3VudC5zZGtfZm9udF9jb2xvcjtcbiAgICAvLyB9XG4gIH0sXG4gIGdvVG9Mb2dpblBhZ2U6IGZ1bmN0aW9uIGdvVG9Mb2dpblBhZ2UoKSB7XG4gICAgd2luZG93LmxvY2F0aW9uLmhyZWYgPSBTdG9yZS5nZXRMb2dpblVybCgpO1xuICB9LFxuXG4gIC8qIExPQURFUiAqL1xuICBzaG93TG9hZGVyOiBmdW5jdGlvbiBzaG93TG9hZGVyKCkge1xuICAgIERvbS5hZGRDbGFzcyhkb2N1bWVudC5nZXRFbGVtZW50QnlJZCgnYmFjLS1wdXJlc2RrLS1sb2FkZXItLScpLCAnYmFjLS1wdXJlc2RrLXZpc2libGUnKTtcbiAgfSxcbiAgaGlkZUxvYWRlcjogZnVuY3Rpb24gaGlkZUxvYWRlcigpIHtcbiAgICBEb20ucmVtb3ZlQ2xhc3MoZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoJ2JhYy0tcHVyZXNkay0tbG9hZGVyLS0nKSwgJ2JhYy0tcHVyZXNkay12aXNpYmxlJyk7XG4gIH0sXG4gIG9wZW5DbG91ZGluYXJ5UGlja2VyOiBmdW5jdGlvbiBvcGVuQ2xvdWRpbmFyeVBpY2tlcihvcHRpb25zKSB7XG4gICAgQ2xvdWRpbmFyeS5vcGVuTW9kYWwob3B0aW9ucyk7XG4gIH0sXG5cbiAgLypcbiAgIHR5cGU6IG9uZSBvZjpcbiAgIC0gc3VjY2Vzc1xuICAgLSBpbmZvXG4gICAtIHdhcm5pbmdcbiAgIC0gZXJyb3JcbiAgIHRleHQ6IHRoZSB0ZXh0IHRvIGRpc3BsYXlcbiAgIG9wdGlvbnMgKG9wdGlvbmFsKToge1xuICAgXHRcdGhpZGVJbjogbWlsbGlzZWNvbmRzIHRvIGhpZGUgaXQuIC0xIGZvciBub3QgaGlkaW5nIGl0IGF0IGFsbC4gRGVmYXVsdCBpcyA1MDAwXG4gICB9XG4gICAqL1xuICBzZXRJbmZvOiBmdW5jdGlvbiBzZXRJbmZvKHR5cGUsIHRleHQsIG9wdGlvbnMpIHtcbiAgICBJbmZvQ29udHJvbGxlci5zaG93SW5mbyh0eXBlLCB0ZXh0LCBvcHRpb25zKTtcbiAgfSxcbiAgc2V0VGl0bGVBbmRGYXZpY29uOiBmdW5jdGlvbiBzZXRUaXRsZUFuZEZhdmljb24oKSB7XG4gICAgdmFyIGZhdmxpbmsgPSBkb2N1bWVudC5xdWVyeVNlbGVjdG9yKFwibGlua1tyZWwqPSdpY29uJ11cIikgfHwgZG9jdW1lbnQuY3JlYXRlRWxlbWVudCgnbGluaycpO1xuICAgIGZhdmxpbmsuaHJlZiA9ICdodHRwczovL2Nsb3VkY2RuLnB1cmVwcm9maWxlLmNvbS9pbWFnZS91cGxvYWQvdjEvX19hc3NldHNfbWFzdGVyX18vYjFhMGMzMTZhZDdmNGE2NzljMmVlZTYxNTgxNDQ2NmMnO1xuICAgIGZhdmxpbmsucmVsID0gJ3Nob3J0Y3V0IGljb24nO1xuICAgIGRvY3VtZW50LmdldEVsZW1lbnRzQnlUYWdOYW1lKCdoZWFkJylbMF0uYXBwZW5kQ2hpbGQoZmF2bGluayk7XG4gICAgdmFyIGFwcEluZm8gPSBTdG9yZS5nZXRBcHBJbmZvKCk7XG5cbiAgICBpZiAoYXBwSW5mbyAhPT0gbnVsbCkge1xuICAgICAgZG9jdW1lbnQudGl0bGUgPSBcIlB1cmVwcm9maWxlIEFjY2VzcyB8IFwiLmNvbmNhdChhcHBJbmZvLm5hbWUpO1xuICAgIH0gZWxzZSB7XG4gICAgICBkb2N1bWVudC50aXRsZSA9IFwiUHVyZXByb2ZpbGUgQWNjZXNzXCI7XG4gICAgfVxuICB9LFxuICByZW5kZXI6IGZ1bmN0aW9uIHJlbmRlcigpIHtcbiAgICB2YXIgd2hlcmVUbyA9IGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKFN0b3JlLmdldEhUTE1Db250YWluZXIoKSk7XG5cbiAgICBpZiAod2hlcmVUbyA9PT0gbnVsbCkge1xuICAgICAgTG9nZ2VyLmVycm9yKCd0aGUgY29udGFpbmVyIHdpdGggaWQgXCInICsgd2hlcmVUbyArICdcIiBoYXMgbm90IGJlZW4gZm91bmQgb24gdGhlIGRvY3VtZW50LiBUaGUgbGlicmFyeSBpcyBnb2luZyB0byBjcmVhdGUgaXQuJyk7XG4gICAgICB2YXIgZGl2ID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudCgnZGl2Jyk7XG4gICAgICBkaXYuaWQgPSBTdG9yZS5nZXRIVExNQ29udGFpbmVyKCk7XG4gICAgICBkaXYuc3R5bGUud2lkdGggPSAnMTAwJSc7XG4gICAgICBkaXYuc3R5bGUuaGVpZ2h0ID0gXCI1MHB4XCI7XG4gICAgICBkaXYuc3R5bGUucG9zaXRpb24gPSBcImZpeGVkXCI7XG4gICAgICBkaXYuc3R5bGUudG9wID0gXCIwcHhcIjtcbiAgICAgIGRpdi5zdHlsZS56SW5kZXggPSBcIjIxNDc0ODM2NDdcIjtcbiAgICAgIGRvY3VtZW50LmJvZHkuaW5zZXJ0QmVmb3JlKGRpdiwgZG9jdW1lbnQuYm9keS5maXJzdENoaWxkKTtcbiAgICAgIHdoZXJlVG8gPSBkb2N1bWVudC5nZXRFbGVtZW50QnlJZChTdG9yZS5nZXRIVExNQ29udGFpbmVyKCkpO1xuICAgIH1cblxuICAgIHdoZXJlVG8uaW5uZXJIVE1MID0gU3RvcmUuZ2V0SFRNTCgpO1xuICAgIFBQQkEucmVuZGVyVXNlcihTdG9yZS5nZXRVc2VyRGF0YSgpLnVzZXIpO1xuICAgIFBQQkEucmVuZGVySW5mb0Jsb2NrcygpO1xuICAgIFBQQkEucmVuZGVyQWNjb3VudHMoU3RvcmUuZ2V0VXNlckRhdGEoKS51c2VyLmFjY291bnRzLCBTdG9yZS5nZXRVc2VyRGF0YSgpLnVzZXIuYWNjb3VudCk7XG4gICAgUFBCQS5yZW5kZXJaZW5kZXNrKCk7XG4gICAgUFBCQS5zdHlsZUFjY291bnQoU3RvcmUuZ2V0VXNlckRhdGEoKS51c2VyLmFjY291bnQpO1xuICAgIFBQQkEuc2V0VGl0bGVBbmRGYXZpY29uKCk7XG4gICAgUFBCQS5yZW5kZXJWZXJzaW9uTnVtYmVyKFN0b3JlLmdldFZlcnNpb25OdW1iZXIoKSk7XG5cbiAgICBpZiAoU3RvcmUuZ2V0QXBwc1Zpc2libGUoKSA9PT0gZmFsc2UpIHtcbiAgICAgIGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKCdiYWMtLXB1cmVzZGstYXBwcy1zZWN0aW9uLS0nKS5zdHlsZS5jc3NUZXh0ID0gXCJkaXNwbGF5Om5vbmVcIjtcbiAgICB9XG5cbiAgICBhZnRlclJlbmRlcigpO1xuICB9XG59O1xubW9kdWxlLmV4cG9ydHMgPSBQUEJBOyIsIlwidXNlIHN0cmljdFwiO1xuXG4vKiFcbiAqIFB1cmVQcm9maWxlIFB1cmVQcm9maWxlIEJ1c2luZXNzIEFwcHMgRGV2ZWxvcG1lbnQgU0RLXG4gKlxuICogdmVyc2lvbjogMi45LjdcbiAqIGRhdGU6IDIwMjAtMDUtMjBcbiAqXG4gKiBDb3B5cmlnaHQgMjAxNywgUHVyZVByb2ZpbGVcbiAqIFJlbGVhc2VkIHVuZGVyIE1JVCBsaWNlbnNlXG4gKiBodHRwczovL29wZW5zb3VyY2Uub3JnL2xpY2Vuc2VzL01JVFxuICovXG52YXIgcHBiYSA9IHJlcXVpcmUoJy4vUFBCQScpO1xuXG5wcGJhLnNldFdpbmRvd05hbWUoJ1BVUkVTREsnKTtcbnBwYmEuc2V0Q29uZmlndXJhdGlvbih7XG4gIFwibG9nc1wiOiBmYWxzZSxcbiAgXCJyb290VXJsXCI6IFwiL1wiLFxuICBcImJhc2VVcmxcIjogXCJhcGkvdjEvXCIsXG4gIFwibG9naW5VcmxcIjogXCJzaWduaW5cIixcbiAgXCJzZWFyY2hJbnB1dElkXCI6IFwiLS1wdXJlc2RrLS1zZWFyY2gtLWlucHV0LS1cIixcbiAgXCJyZWRpcmVjdFVybFBhcmFtXCI6IFwicmVkaXJlY3RfdXJsXCJcbn0pO1xucHBiYS5zZXRIVE1MVGVtcGxhdGUoXCI8aGVhZGVyIGNsYXNzPVxcXCJiYWMtLWhlYWRlci1hcHBzXFxcIiBpZD1cXFwiYmFjLS1wdXJlc2RrLWJhYy0taGVhZGVyLWFwcHMtLVxcXCI+XFxuICAgIDxkaXYgY2xhc3M9XFxcImJhYy0tY29udGFpbmVyXFxcIj5cXG4gICAgICAgIDxkaXYgY2xhc3M9XFxcImJhYy0tbG9nb1xcXCIgaWQ9XFxcImJhYy0tcHVyZXNkay1hY2NvdW50LWxvZ28tLVxcXCI+XFxuICAgICAgICAgICAgPGRpdiBjbGFzcz1cXFwiYmFjLS1wdXJlc2RrLWFwcC1uYW1lLS1cXFwiPlxcbiAgICAgICAgICAgICAgICA8c3ZnIHdpZHRoPVxcXCI4cHhcXFwiIGhlaWdodD1cXFwiMTJweFxcXCIgdmlld0JveD1cXFwiMCAwIDggMTJcXFwiIHZlcnNpb249XFxcIjEuMVxcXCIgeG1sbnM9XFxcImh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnXFxcIiB4bWxuczp4bGluaz1cXFwiaHR0cDovL3d3dy53My5vcmcvMTk5OS94bGlua1xcXCI+XFxuICAgICAgICAgICAgICAgICAgICA8ZyBpZD1cXFwiUFAtQkEtUG9ydGFsLUhvbWVfRGVza3RvcC12MlxcXCIgc3Ryb2tlPVxcXCJub25lXFxcIiBzdHJva2Utd2lkdGg9XFxcIjFcXFwiIGZpbGw9XFxcIm5vbmVcXFwiIGZpbGwtcnVsZT1cXFwiZXZlbm9kZFxcXCI+XFxuICAgICAgICAgICAgICAgICAgICAgICAgPGcgaWQ9XFxcIlBQQ00tTGlzdGluZ19Db25uZXhpb25fMDFfTWF4X0RcXFwiIHRyYW5zZm9ybT1cXFwidHJhbnNsYXRlKC0xODEuMDAwMDAwLCAtNzguMDAwMDAwKVxcXCIgZmlsbD1cXFwiIzMzMzMzM1xcXCIgZmlsbC1ydWxlPVxcXCJub256ZXJvXFxcIj5cXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgPGcgaWQ9XFxcImVsZW1lbnRzLS8tc2RrLS8tYnV0dG9uLWNvcHktMy1lbGVtZW50cy0vLXNkay0vLWJ1dHRvblxcXCIgdHJhbnNmb3JtPVxcXCJ0cmFuc2xhdGUoMTY0LjAwMDAwMCwgNzAuMDAwMDAwKVxcXCI+XFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICA8ZyBpZD1cXFwiaWNvbnMvYXBwcy9jYW1wYWlnbnMtaWNvbnMtLy1hcHBzLS8tNDB4NDAtLy1iYWNrLWFycm93XFxcIiB0cmFuc2Zvcm09XFxcInRyYW5zbGF0ZSgxMS4wMDAwMDAsIDQuMDAwMDAwKVxcXCI+XFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgPGcgaWQ9XFxcImRvd25sb2FkLWFycm93XFxcIiB0cmFuc2Zvcm09XFxcInRyYW5zbGF0ZSg2LjUwMDAwMCwgNC4wMDAwMDApXFxcIj5cXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgPHBhdGggZD1cXFwiTS0wLjg4Mjc0MDk0NCwyLjc3OTU3OTg5IEMtMS4yNTI3MTEzMywyLjQwNjgwNjcgLTEuODUyNTUxODMsMi40MDY4MDY3IC0yLjIyMjUyMjIxLDIuNzc5NTc5ODkgQy0yLjU5MjQ5MjYsMy4xNTIzNTMwOCAtMi41OTI0OTI2LDMuNzU2NzM3ODMgLTIuMjIyNTIyMjEsNC4xMjk1MTEwMiBMMi44MzAxMDkzNyw5LjIyMDQyMDExIEMzLjIwMDA3OTc1LDkuNTkzMTkzMyAzLjc5OTkyMDI1LDkuNTkzMTkzMyA0LjE2OTg5MDYzLDkuMjIwNDIwMTEgTDkuMjIyNTIyMjEsNC4xMjk1MTEwMiBDOS41OTI0OTI2LDMuNzU2NzM3ODMgOS41OTI0OTI2LDMuMTUyMzUzMDggOS4yMjI1MjIyMSwyLjc3OTU3OTg5IEM4Ljg1MjU1MTgzLDIuNDA2ODA2NyA4LjI1MjcxMTMzLDIuNDA2ODA2NyA3Ljg4Mjc0MDk0LDIuNzc5NTc5ODkgTDMuNSw3LjE5NTUyMzQyIEwtMC44ODI3NDA5NDQsMi43Nzk1Nzk4OSBaXFxcIiBpZD1cXFwiUGF0aFxcXCIgdHJhbnNmb3JtPVxcXCJ0cmFuc2xhdGUoMy41MDAwMDAsIDYuMDAwMDAwKSByb3RhdGUoLTI3MC4wMDAwMDApIHRyYW5zbGF0ZSgtMy41MDAwMDAsIC02LjAwMDAwMCkgXFxcIj48L3BhdGg+XFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgPC9nPlxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgPC9nPlxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICA8L2c+XFxuICAgICAgICAgICAgICAgICAgICAgICAgPC9nPlxcbiAgICAgICAgICAgICAgICAgICAgPC9nPlxcbiAgICAgICAgICAgICAgICA8L3N2Zz5cXG4gICAgICAgICAgICAgICAgPGEgaHJlZj1cXFwiI1xcXCIgaWQ9XFxcImFwcC1uYW1lLWxpbmstdG8tcm9vdFxcXCI+QXBwIFBvcnRhbDwvYT5cXG4gICAgICAgICAgICA8L2Rpdj5cXG4gICAgICAgIDwvZGl2PlxcbiAgICAgICAgPGRpdiBjbGFzcz1cXFwiYmFjLS11c2VyLWFjdGlvbnNcXFwiPlxcbiAgICAgICAgICAgIDxzdmcgaWQ9XFxcImJhYy0tcHVyZXNkay0tbG9hZGVyLS1cXFwiIHdpZHRoPVxcXCIzOFxcXCIgaGVpZ2h0PVxcXCIzOFxcXCIgdmlld0JveD1cXFwiMCAwIDQ0IDQ0XFxcIiB4bWxucz1cXFwiaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmdcXFwiIHN0cm9rZT1cXFwiI2ZmZlxcXCIgc3R5bGU9XFxcIlxcbiAgICBtYXJnaW4tcmlnaHQ6IDEwcHg7XFxuXFxcIj5cXG4gICAgICAgICAgICAgICAgPGcgZmlsbD1cXFwibm9uZVxcXCIgZmlsbC1ydWxlPVxcXCJldmVub2RkXFxcIiBzdHJva2Utd2lkdGg9XFxcIjJcXFwiPlxcbiAgICAgICAgICAgICAgICAgICAgPGNpcmNsZSBjeD1cXFwiMjJcXFwiIGN5PVxcXCIyMlxcXCIgcj1cXFwiMTYuNjQzN1xcXCI+XFxuICAgICAgICAgICAgICAgICAgICAgICAgPGFuaW1hdGUgYXR0cmlidXRlTmFtZT1cXFwiclxcXCIgYmVnaW49XFxcIjBzXFxcIiBkdXI9XFxcIjEuOHNcXFwiIHZhbHVlcz1cXFwiMTsgMjBcXFwiIGNhbGNNb2RlPVxcXCJzcGxpbmVcXFwiIGtleVRpbWVzPVxcXCIwOyAxXFxcIiBrZXlTcGxpbmVzPVxcXCIwLjE2NSwgMC44NCwgMC40NCwgMVxcXCIgcmVwZWF0Q291bnQ9XFxcImluZGVmaW5pdGVcXFwiPjwvYW5pbWF0ZT5cXG4gICAgICAgICAgICAgICAgICAgICAgICA8YW5pbWF0ZSBhdHRyaWJ1dGVOYW1lPVxcXCJzdHJva2Utb3BhY2l0eVxcXCIgYmVnaW49XFxcIjBzXFxcIiBkdXI9XFxcIjEuOHNcXFwiIHZhbHVlcz1cXFwiMTsgMFxcXCIgY2FsY01vZGU9XFxcInNwbGluZVxcXCIga2V5VGltZXM9XFxcIjA7IDFcXFwiIGtleVNwbGluZXM9XFxcIjAuMywgMC42MSwgMC4zNTUsIDFcXFwiIHJlcGVhdENvdW50PVxcXCJpbmRlZmluaXRlXFxcIj48L2FuaW1hdGU+XFxuICAgICAgICAgICAgICAgICAgICA8L2NpcmNsZT5cXG4gICAgICAgICAgICAgICAgICAgIDxjaXJjbGUgY3g9XFxcIjIyXFxcIiBjeT1cXFwiMjJcXFwiIHI9XFxcIjE5LjkyODJcXFwiPlxcbiAgICAgICAgICAgICAgICAgICAgICAgIDxhbmltYXRlIGF0dHJpYnV0ZU5hbWU9XFxcInJcXFwiIGJlZ2luPVxcXCJiYWMtMC45c1xcXCIgZHVyPVxcXCIxLjhzXFxcIiB2YWx1ZXM9XFxcIjE7IDIwXFxcIiBjYWxjTW9kZT1cXFwic3BsaW5lXFxcIiBrZXlUaW1lcz1cXFwiMDsgMVxcXCIga2V5U3BsaW5lcz1cXFwiMC4xNjUsIDAuODQsIDAuNDQsIDFcXFwiIHJlcGVhdENvdW50PVxcXCJpbmRlZmluaXRlXFxcIj48L2FuaW1hdGU+XFxuICAgICAgICAgICAgICAgICAgICAgICAgPGFuaW1hdGUgYXR0cmlidXRlTmFtZT1cXFwic3Ryb2tlLW9wYWNpdHlcXFwiIGJlZ2luPVxcXCJiYWMtMC45c1xcXCIgZHVyPVxcXCIxLjhzXFxcIiB2YWx1ZXM9XFxcIjE7IDBcXFwiIGNhbGNNb2RlPVxcXCJzcGxpbmVcXFwiIGtleVRpbWVzPVxcXCIwOyAxXFxcIiBrZXlTcGxpbmVzPVxcXCIwLjMsIDAuNjEsIDAuMzU1LCAxXFxcIiByZXBlYXRDb3VudD1cXFwiaW5kZWZpbml0ZVxcXCI+PC9hbmltYXRlPlxcbiAgICAgICAgICAgICAgICAgICAgPC9jaXJjbGU+XFxuICAgICAgICAgICAgICAgIDwvZz5cXG4gICAgICAgICAgICA8L3N2Zz5cXG4gICAgICAgICAgICA8ZGl2IGNsYXNzPVxcXCJiYWMtLXVzZXItYXBwc1xcXCIgaWQ9XFxcImJhYy0tcHVyZXNkay1hcHBzLXNlY3Rpb24tLVxcXCI+XFxuICAgICAgICAgICAgICAgIDxhIGhyZWY9XFxcIi9hcHAvY2FtcGFpZ25zXFxcIiBpZD1cXFwiYmFjLS1wdXJlc2RrLWNhbXBhaWducy1saW5rLS1cXFwiIGNsYXNzPVxcXCJiYWMtLXB1cmVzZGstYXBwcy1vbi1uYXZiYXItLSBkaXNhYmxlZFxcXCI+XFxuICAgICAgICAgICAgICAgICAgICA8c3ZnIHdpZHRoPVxcXCIxNXB4XFxcIiBoZWlnaHQ9XFxcIjEzcHhcXFwiIHZpZXdCb3g9XFxcIjAgMCAxNSAxNFxcXCIgdmVyc2lvbj1cXFwiMS4xXFxcIiB4bWxucz1cXFwiaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmdcXFwiIHhtbG5zOnhsaW5rPVxcXCJodHRwOi8vd3d3LnczLm9yZy8xOTk5L3hsaW5rXFxcIj5cXG4gICAgICAgICAgICAgICAgICAgICAgICA8IS0tIEdlbmVyYXRvcjogc2tldGNodG9vbCA1OS4xICgxMDEwMTApIC0gaHR0cHM6Ly9za2V0Y2guY29tIC0tPlxcbiAgICAgICAgICAgICAgICAgICAgICAgIDxkZWZzPlxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICA8cG9seWdvbiBpZD1cXFwicGF0aC0xXFxcIiBwb2ludHM9XFxcIjAgMC4wMDAxNTAwMDAwMDcgMTQuMzk5NzQ5OCAwLjAwMDE1MDAwMDAwNyAxNC4zOTk3NDk4IDEyLjg5OTY0OTkgMCAxMi44OTk2NDk5XFxcIj48L3BvbHlnb24+XFxuICAgICAgICAgICAgICAgICAgICAgICAgPC9kZWZzPlxcbiAgICAgICAgICAgICAgICAgICAgICAgIDxnIGlkPVxcXCJQUC1CQS1Qb3J0YWwtSG9tZV9EZXNrdG9wLXYyXFxcIiBzdHJva2U9XFxcIm5vbmVcXFwiIHN0cm9rZS13aWR0aD1cXFwiMVxcXCIgZmlsbD1cXFwibm9uZVxcXCIgZmlsbC1ydWxlPVxcXCJldmVub2RkXFxcIj5cXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgPGcgaWQ9XFxcIlBQQ00tTGlzdGluZ19Db25uZXhpb25fMDFfTWF4X0RcXFwiIHRyYW5zZm9ybT1cXFwidHJhbnNsYXRlKC0xMTEwLjAwMDAwMCwgLTc3LjAwMDAwMClcXFwiPlxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgPGcgaWQ9XFxcImVsZW1lbnRzLS8tc2RrLS8tYnV0dG9uXFxcIiB0cmFuc2Zvcm09XFxcInRyYW5zbGF0ZSgxMDk2LjAwMDAwMCwgNzAuMDAwMDAwKVxcXCI+XFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgPGcgaWQ9XFxcImljb25zL2FwcHMvY2FtcGFpZ25zLWljb25zLS8tYXBwcy0vLTQweDQwLS8tY2FtcGFpZ25zXFxcIiB0cmFuc2Zvcm09XFxcInRyYW5zbGF0ZSgxMS4wMDAwMDAsIDQuMDAwMDAwKVxcXCI+XFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIDxnIGlkPVxcXCJHcm91cC0zXFxcIiB0cmFuc2Zvcm09XFxcInRyYW5zbGF0ZSgzLjAwMDAwMCwgMy41MDAwMDApXFxcIj5cXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIDxtYXNrIGlkPVxcXCJtYXNrLTJcXFwiIGZpbGw9XFxcIndoaXRlXFxcIj5cXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICA8dXNlIHhsaW5rOmhyZWY9XFxcIiNwYXRoLTFcXFwiPjwvdXNlPlxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgPC9tYXNrPlxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgPGcgaWQ9XFxcIkNsaXAtMlxcXCI+PC9nPlxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgPHBhdGggZD1cXFwiTTIuMzMzMjUwMDMsMy43NTM2NDk5OCBDMi4wNDI3NTAwMywzLjg1OTE0OTk4IDEuNzk5NzUwMDQsNC4wMzYxNDk5OCAxLjU5Mzc1MDA0LDQuMjg5MTQ5OTggQzEuMzMzMjUwMDUsNC42MDkxNDk5NyAxLjIwNjI1MDA1LDQuOTY2NjQ5OTcgMS4yMDYyNTAwNSw1LjM4MjE0OTk2IEwxLjIwNjI1MDA1LDUuNTU0NjQ5OTYgQzEuMjA2MjUwMDUsNS45NjkxNDk5NSAxLjMzMjc1MDA1LDYuMzIxNjQ5OTUgMS41OTE3NTAwNCw2LjYzMTE0OTk0IEMxLjc5ODI1MDA0LDYuODc4MTQ5OTQgMi4wNDIyNTAwMyw3LjA1MDY0OTk0IDIuMzMzMjUwMDMsNy4xNTU2NDk5NCBMMi4zMzMyNTAwMywzLjc1MzY0OTk4IFogTTUuNzg4MjQ5ODksNy4yNDg2NTAwOCBDNy45MjAyNDk3OCw3LjI0ODY1MDA4IDkuODk1NzQ5NjcsNy44MzU2NTAwOSAxMS42NjY3NDk2LDguOTkzNjUwMTEgTDExLjY2Njc0OTYsMS44Mzc2NDk5OCBDOS44OTQyNDk2NywzLjA0NzE1IDcuODk5MjQ5NzgsMy42NTk2NTAwMSA1LjczMDc0OTg5LDMuNjU5NjUwMDEgTDMuNTY4NzUwMDEsMy42NTk2NTAwMSBMMy41Njg3NTAwMSw3LjI0ODY1MDA4IEw1Ljc4ODI0OTg5LDcuMjQ4NjUwMDggWiBNNS4yOTg3NDk4NiwxMi44OTk2NDk5IEM0Ljg2MTI0OTg3LDEyLjg5OTY0OTkgNC40NzQ3NDk4OCwxMi43MzU2NDk5IDQuMTQ5MjQ5ODksMTIuNDExMTQ5OSBDMy44NDI3NDk5LDEyLjEwNjE0OTkgMy42ODcyNDk5LDExLjczMDE0OTkgMy42ODcyNDk5LDExLjI5MzY0OTkgTDMuNjg3MjQ5OSw4LjQ1MTY0OTkzIEwzLjA1MTc0OTkyLDguNDUxNjQ5OTMgTDIuOTQwNzQ5OTIsOC40NTQxNDk5MyBDMi4xMjAyNDk5NCw4LjQ1NDE0OTkzIDEuNDIxNzQ5OTYsOC4xNzMxNDk5MyAwLjg2NTI0OTk3Nyw3LjYxODY0OTk0IEMwLjI5MTI0OTk5Miw3LjA0NjY0OTk0IC0wLjAwMDI1MDAwMDAxMiw2LjM1MjE0OTk1IC0wLjAwMDI1MDAwMDAxMiw1LjU1NDY0OTk1IEwtMC4wMDAyNTAwMDAwMTIsNS4zODIxNDk5NiBDLTAuMDAwMjUwMDAwMDEyLDQuNTY1MTQ5OTYgMC4yOTE3NDk5OTIsMy44NjUxNDk5NyAwLjg2NjI0OTk3NywzLjMwMjY0OTk3IEMxLjQ0MDc0OTk2LDIuNzQxMTQ5OTggMi4xMzcyNDk5NCwyLjQ1NjE0OTk4IDIuOTM2NzQ5OTIsMi40NTYxNDk5OCBMNS43MzA3NDk4NSwyLjQ1NjE0OTk4IEM4LjA1MTI0OTc5LDIuNDU2MTQ5OTggMTAuMTE5NzQ5NywxLjY4MTE0OTk5IDExLjg3OTI0OTcsMC4xNTIxNDk5OTkgQzExLjk3NTc0OTcsMC4wNTU2NDk5OTk1IDEyLjEwNjc0OTcsMC4wMDAxNTAwMDAwMDcgMTIuMjQ5MjQ5NywwLjAwMDE1MDAwMDAwNyBDMTIuMzM2NzQ5NywwLjAwMDE1MDAwMDAwNyAxMi40MjkyNDk3LDAuMDIxMTQ5OTk5OCAxMi41MjM3NDk3LDAuMDYzMTQ5OTk5NSBDMTIuNzQ1MjQ5NywwLjE0NTE0OTk5OSAxMi44NzMyNDk3LDAuMzM0MTQ5OTk3IDEyLjg3MzI0OTcsMC41OTAxNDk5OTUgTDEyLjg3MzI0OTcsNC4xNDk2NDk5NyBMMTMuMTM0MjQ5Nyw0LjE0OTY0OTk3IEMxMy40NzUyNDk2LDQuMTQ5NjQ5OTcgMTMuNzc0NzQ5Niw0LjI3NTE0OTk2IDE0LjAyNDI0OTYsNC41MjMxNDk5NiBDMTQuMjY4NzQ5Niw0LjcyMTE0OTk2IDE0LjM5OTc0OTYsNS4wMTQ2NDk5NiAxNC4zOTk3NDk2LDUuMzgyMTQ5OTYgQzE0LjM5OTc0OTYsNS43NDM2NDk5NSAxNC4yNzIyNDk2LDYuMDQ4MTQ5OTUgMTQuMDIwNzQ5Niw2LjI4NzY0OTk1IEMxMy43NzE3NDk2LDYuNTI0MTQ5OTUgMTMuNDczNzQ5Niw2LjY0NDE0OTk0IDEzLjEzNDI0OTcsNi42NDQxNDk5NCBMMTIuODczMjQ5Nyw2LjY0NDE0OTk0IEwxMi44NzMyNDk3LDEwLjIwMzE0OTkgQzEyLjg3MzI0OTcsMTAuNDc4MTQ5OSAxMi43NDUyNDk3LDEwLjY3NzE0OTkgMTIuNTEyNzQ5NywxMC43NjM2NDk5IEwxMi40NDI3NDk3LDEwLjc3NjE0OTkgQzEyLjM0OTI0OTcsMTAuNzk4NjQ5OSAxMi4zMDY3NDk3LDEwLjgwNTE0OTkgMTIuMjY5NzQ5NywxMC44MDUxNDk5IEMxMi4xNTY3NDk3LDEwLjgwNTE0OTkgMTIuMDM1MjQ5NywxMC43NjY2NDk5IDExLjkwNzc0OTcsMTAuNjkxMTQ5OSBDMTAuMTQwNzQ5Nyw5LjE5ODY0OTkyIDguMDkxMjQ5NzksOC40NTE2NDk5MyA1Ljc4ODI0OTg1LDguNDUxNjQ5OTMgTDQuODkzNzQ5ODcsOC40NTE2NDk5MyBMNC44OTM3NDk4NywxMS4yOTM2NDk5IEM0Ljg5Mzc0OTg3LDExLjQxMzE0OTkgNC45Mjk3NDk4NywxMS41MDQ2NDk5IDUuMDA3NzQ5ODcsMTEuNTgyNjQ5OSBDNS4wODU3NDk4NywxMS42NjAxNDk5IDUuMTc3NzQ5ODYsMTEuNjk2NjQ5OSA1LjI5ODc0OTg2LDExLjY5NjY0OTkgQzUuMzk4MjQ5ODYsMTEuNjk2NjQ5OSA1LjQ4ODc0OTg1LDExLjY1NDY0OTkgNS41NzUyNDk4NSwxMS41NjgxNDk5IEM1LjY2Mjc0OTg1LDExLjQ4MTE0OTkgNS43MDM3NDk4NSwxMS4zODQ2NDk5IDUuNzAzNzQ5ODUsMTEuMjY1MTQ5OSBMNS43MDM3NDk4NSw5LjYxNDY0OTkyIEM1LjcwMzc0OTg1LDkuMjM3NjQ5OTIgNS45MjkyNDk4NCw5LjAxMjY0OTkzIDYuMzA2NzQ5ODMsOS4wMTI2NDk5MyBDNi40NTI3NDk4Myw5LjAxMjY0OTkzIDYuNTg5MjQ5ODMsOS4wNjgxNDk5MiA2LjcxMzI0OTgyLDkuMTc3NjQ5OTIgQzYuODQyMjQ5ODIsOS4yOTIxNDk5MiA2LjkxMDI0OTgyLDkuNDQzMTQ5OTIgNi45MTAyNDk4Miw5LjYxNDY0OTkyIEw2LjkxMDI0OTgyLDExLjI2NTE0OTkgQzYuOTEwMjQ5ODIsMTEuNjk5NjQ5OSA2Ljc1MDc0OTgyLDEyLjA4NDY0OTkgNi40MzYyNDk4MywxMi40MDg2NDk5IEM2LjExOTc0OTg0LDEyLjczNDY0OTkgNS43MzY3NDk4NSwxMi44OTk2NDk5IDUuMjk4NzQ5ODYsMTIuODk5NjQ5OSBMNS4yOTg3NDk4NiwxMi44OTk2NDk5IFpcXFwiIGlkPVxcXCJGaWxsLTFcXFwiIGZpbGw9XFxcIiMzMzMzMzNcXFwiIGZpbGwtcnVsZT1cXFwibm9uemVyb1xcXCIgbWFzaz1cXFwidXJsKCNtYXNrLTIpXFxcIj48L3BhdGg+XFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIDwvZz5cXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICA8L2c+XFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICA8L2c+XFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIDwvZz5cXG4gICAgICAgICAgICAgICAgICAgICAgICA8L2c+XFxuICAgICAgICAgICAgICAgICAgICA8L3N2Zz5cXG4gICAgICAgICAgICAgICAgICAgIENhbXBhaWduc1xcbiAgICAgICAgICAgICAgICA8L2E+XFxuICAgICAgICAgICAgICAgIDxhIGhyZWY9XFxcIi9hcHAvZ3JvdXBzXFxcIiBpZD1cXFwiYmFjLS1wdXJlc2RrLWdyb3Vwcy1saW5rLS1cXFwiIGNsYXNzPVxcXCJiYWMtLXB1cmVzZGstYXBwcy1vbi1uYXZiYXItLSBkaXNhYmxlZFxcXCI+XFxuICAgICAgICAgICAgICAgICAgICA8c3ZnIHdpZHRoPVxcXCIyMHB4XFxcIiBoZWlnaHQ9XFxcIjEzcHhcXFwiIHZpZXdCb3g9XFxcIjAgMCAzOSAyNVxcXCIgdmVyc2lvbj1cXFwiMS4xXFxcIiB4bWxucz1cXFwiaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmdcXFwiIHhtbG5zOnhsaW5rPVxcXCJodHRwOi8vd3d3LnczLm9yZy8xOTk5L3hsaW5rXFxcIj5cXG4gICAgICAgICAgICAgICAgICAgICAgICA8IS0tIEdlbmVyYXRvcjogc2tldGNodG9vbCA1OS4xICgxMDEwMTApIC0gaHR0cHM6Ly9za2V0Y2guY29tIC0tPlxcbiAgICAgICAgICAgICAgICAgICAgICAgIDxnIGlkPVxcXCJQUC1CQS1Qb3J0YWwtSG9tZV9EZXNrdG9wLXYyXFxcIiBzdHJva2U9XFxcIm5vbmVcXFwiIHN0cm9rZS13aWR0aD1cXFwiMVxcXCIgZmlsbD1cXFwibm9uZVxcXCIgZmlsbC1ydWxlPVxcXCJldmVub2RkXFxcIj5cXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgPGcgaWQ9XFxcIlBQQ00tTGlzdGluZ19Db25uZXhpb25fMDFfTWF4X0RcXFwiIHRyYW5zZm9ybT1cXFwidHJhbnNsYXRlKC0xMjQ0LjAwMDAwMCwgLTcxLjAwMDAwMClcXFwiIGZpbGw9XFxcIiMzMzMzMzNcXFwiIGZpbGwtcnVsZT1cXFwibm9uemVyb1xcXCI+XFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICA8ZyBpZD1cXFwiZWxlbWVudHMtLy1zZGstLy1idXR0b24tY29weS1lbGVtZW50cy0vLXNkay0vLWJ1dHRvblxcXCIgdHJhbnNmb3JtPVxcXCJ0cmFuc2xhdGUoMTI0My4wMDAwMDAsIDcwLjAwMDAwMClcXFwiPlxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIDxnIGlkPVxcXCJpY29ucy9hcHBzL2NhbXBhaWducy1pY29ucy0vLWFwcHMtLy00MHg0MC0vLWdyb3Vwc1xcXCIgdHJhbnNmb3JtPVxcXCJ0cmFuc2xhdGUoMTEuMDAwMDAwLCA0LjAwMDAwMClcXFwiPlxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICA8ZyBpZD1cXFwiR3JvdXBcXFwiIHRyYW5zZm9ybT1cXFwidHJhbnNsYXRlKC05LjI1MDAwMCwgLTIuMjUwMDAwKVxcXCI+XFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICA8cGF0aCBkPVxcXCJNMTkuMTE1MTYzMSwzIEMyMi44NDY0NDkxLDMgMjYuMTE3MDgyNSw2LjIxOTUxMjIgMjYuMTE3MDgyNSw5LjkxNDYzNDE1IEMyNi4xMTcwODI1LDEyLjQ3NTYwOTggMjQuMzIwNTM3NCwxNC40ODc4MDQ5IDIyLjYxNjEyMjgsMTUuNTEyMTk1MSBMMjIuNjE2MTIyOCwxNi4xNzA3MzE3IEwyMi42MTYxMjI4LDE2LjE3MDczMTcgQzIyLjk4NDY0NDksMTYuMzE3MDczMiAyMy42NzU2MjM4LDE2LjUzNjU4NTQgMjQuNDU4NzMzMiwxNi43MTk1MTIyIEwyNC41MDQ3OTg1LDE2LjcxOTUxMjIgTDI0LjUwNDc5ODUsMTYuNzE5NTEyMiBDMjguNzg4ODY3NiwxNy44NTM2NTg1IDMxLDE5Ljc1NjA5NzYgMzEsMjIuMzUzNjU4NSBDMzAuOTA3ODY5NSwyMy4wMTIxOTUxIDMwLjMwOTAyMTEsMjQgMjkuMTExMzI0NCwyNCBMOC43OTY1NDUxMSwyNCBDNy41OTg4NDgzNywyNCA3LDIzLjAxMjE5NTEgNywyMi4zMTcwNzMyIEM3LDIwLjQ4NzgwNDkgOC4xMDU1NjYyMiwxOC4wMzY1ODU0IDEzLjQ0OTEzNjMsMTYuNjgyOTI2OCBMMTMuNDk1MjAxNSwxNi42ODI5MjY4IEwxMy40OTUyMDE1LDE2LjY4MjkyNjggQzE0LjI3ODMxMDksMTYuNTM2NTg1NCAxNC45NjkyODk4LDE2LjMxNzA3MzIgMTUuMjkxNzQ2NiwxNi4yMDczMTcxIEwxNS4yOTE3NDY2LDE1LjUxMjE5NTEgTDE1LjI5MTc0NjYsMTUuNTEyMTk1MSBDMTMuNTg3MzMyMSwxNC40NTEyMTk1IDExLjc5MDc4NjksMTIuNDc1NjA5OCAxMS43OTA3ODY5LDkuOTE0NjM0MTUgQzExLjc5MDc4NjksNi4yMTk1MTIyIDE1LjA2MTQyMDMsMyAxOC43OTI3MDYzLDMgTDE5LjExNTE2MzEsMyBaIE0xOS4xNjEyMjg0LDUuNjcwNzMxNzEgTDE4LjgzODc3MTYsNS42NzA3MzE3MSBDMTYuOTk2MTYxMiw1LjY3MDczMTcxIDE1LjI5MTc0NjYsNy43MTk1MTIyIDE1LjI5MTc0NjYsOS44NzgwNDg3OCBDMTUuMjkxNzQ2NiwxMS40NTEyMTk1IDE2LjQ4OTQ0MzQsMTIuODA0ODc4IDE3LjY4NzE0MDEsMTMuNDYzNDE0NiBDMTcuODI1MzM1OSwxMy41MzY1ODU0IDE3LjkxNzQ2NjQsMTMuNjA5NzU2MSAxOC4wMDk1OTY5LDEzLjY4MjkyNjggQzE4Ljc0Mzc2MiwxNC4yNjYwMDYxIDE4Ljc4OTY0NzMsMTQuOTQ1NTUwNyAxOC43OTI1MTUxLDE1Ljk2MjcyMzkgTDE4Ljc5MjcwNjMsMTYuNTczMTcwNyBMMTguNzkyNzA2MywxNi41NzMxNzA3IEMxOC43OTI3MDYzLDE4LjQwMjQzOSAxNS43OTg0NjQ1LDE4Ljk4NzgwNDkgMTQuNDYyNTcyLDE5LjI4MDQ4NzggQzEzLjAzNDU0ODksMTkuNjA5NzU2MSAxMS40MjIyNjQ5LDIwLjI2ODI5MjcgMTAuNzMxMjg2LDIxLjI1NjA5NzYgTDI3LjE3NjU4MzUsMjEuMjU2MDk3NiBDMjYuNjIzODAwNCwyMC40MTQ2MzQxIDI1LjMzMzk3MzEsMTkuNzU2MDk3NiAyMy4zOTkyMzIyLDE5LjIwNzMxNzEgQzIwLjgxOTU3NzcsMTguNTg1MzY1OSAxOS4xNjEyMjg0LDE3LjkyNjgyOTMgMTkuMTYxMjI4NCwxNi41MzY1ODU0IEwxOS4xNjA4MTU5LDE1Ljc0ODc1MjcgQzE5LjE2MjUwMzYsMTQuODIxNzU3MSAxOS4yMTI3MTMxLDE0LjE2Mjg0MDcgMTkuOTQ0MzM3OCwxMy42NDYzNDE1IEMyMC4wODI1MzM2LDEzLjUzNjU4NTQgMjAuMjIwNzI5NCwxMy40NjM0MTQ2IDIwLjMxMjg1OTksMTMuNDI2ODI5MyBDMjEuNTEwNTU2NiwxMi44MDQ4NzggMjIuNzA4MjUzNCwxMS40NTEyMTk1IDIyLjcwODI1MzQsOS44NzgwNDg3OCBDMjIuNzA4MjUzNCw3LjcxOTUxMjIgMjEuMDAzODM4OCw1LjY3MDczMTcxIDE5LjE2MTIyODQsNS42NzA3MzE3MSBaIE0xMC42OTQ0NDQ0LDEgQzEyLjU0NjI5NjMsMSAxMy45MzUxODUyLDEuNjM3MDgwODcgMTUsMi45MTEyNDI2IEMxNC4wMjc3Nzc4LDMuMzYwOTQ2NzUgMTMuMTk0NDQ0NCwzLjk5ODAyNzYxIDEyLjQ1MzcwMzcsNC43ODUwMDk4NiBDMTIuMjIyMjIyMiw0LjUyMjY4MjQ1IDExLjk5MDc0MDcsNC4yOTc4MzAzNyAxMS45NDQ0NDQ0LDQuMjYwMzU1MDMgQzExLjU3NDA3NDEsMy45MjMwNzY5MiAxMS4yOTYyOTYzLDMuODEwNjUwODkgMTAuNjk0NDQ0NCwzLjgxMDY1MDg5IEwxMC42OTQ0NDQ0LDMuODEwNjUwODkgTDEwLjQxNjY2NjcsMy44MTA2NTA4OSBDOS4xNjY2NjY2NywzLjgxMDY1MDg5IDcuNjM4ODg4ODksNS4zODQ2MTUzOCA3LjYzODg4ODg5LDcuMjk1ODU3OTkgQzcuNjM4ODg4ODksOC42MDc0OTUwNyA4LjY1NzQwNzQxLDkuNzMxNzU1NDIgOS41ODMzMzMzMywxMC4yNTY0MTAzIEM5LjY3NTkyNTkzLDEwLjMzMTM2MDkgOS44MTQ4MTQ4MSwxMC40MDYzMTE2IDkuOTA3NDA3NDEsMTAuNDgxMjYyMyBDMTAuNjM2NTc0MSwxMS4wMzg3MDgxIDEwLjY5MjI3NDMsMTEuNjgyMjMgMTAuNjk0ODA2MSwxMi41MTIyNTA0IEwxMC42OTQ0NDQ0LDEzLjI1NDQzNzkgQzEwLjY5NDQ0NDQsMTUuMDUzMjU0NCA3LjgyNDA3NDA3LDE1LjY1Mjg2IDYuNzEyOTYyOTYsMTUuODc3NzEyIEM1Ljc0MDc0MDc0LDE2LjE0MDAzOTQgNC42Mjk2Mjk2MywxNi41NTIyNjgyIDMuOTgxNDgxNDgsMTcuMTg5MzQ5MSBMMy45ODE0ODE0OCwxNy4xODkzNDkxIEw3Ljc3Nzc3Nzc4LDE3LjE4OTM0OTEgQzguMTQ4MTQ4MTUsMTcuMTg5MzQ5MSA4LjUxODUxODUyLDE3LjM3NjcyNTggOC42MTExMTExMSwxNy42NzY1Mjg2IEw4LjYxMTExMTExLDE3LjY3NjUyODYgTDguNjI4NTE4NTIsMTcuNzQzNjg0NCBDOC42Mzg4ODg4OSwxNy44MzI0MjYgOC42MDE4NTE4NSwxNy45MTYzNzA4IDguNTY0ODE0ODEsMTcuOTc2MzMxNCBDNy42Mzg4ODg4OSwxOC41Mzg0NjE1IDYuOTkwNzQwNzQsMTkuMTM4MDY3MSA2LjUyNzc3Nzc4LDE5Ljc3NTE0NzkgQzYuMzg4ODg4ODksMTkuOTI1MDQ5MyA2LjIwMzcwMzcsMjAgNi4wMTg1MTg1MiwyMCBMNi4wMTg1MTg1MiwyMCBMMS43NTkyNTkyNiwyMCBDMC42MDE4NTE4NTIsMjAgMCwxOS4wMjU2NDEgMCwxOC4zNTEwODQ4IEMwLDE2LjY2NDY5NDMgMC45NzIyMjIyMjIsMTQuNDUzNjQ4OSA1Ljc0MDc0MDc0LDEzLjEwNDUzNjUgTDUuNzQwNzQwNzQsMTMuMTA0NTM2NSBMNS43ODcwMzcwNCwxMy4xMDQ1MzY1IEM2LjM4ODg4ODg5LDEyLjk5MjExMDUgNi44OTgxNDgxNSwxMi44NDIyMDkxIDcuMjIyMjIyMjIsMTIuNzI5NzgzIEw3LjIyMjIyMjIyLDEyLjcyOTc4MyBMNy4yMjIyMjIyMiwxMi4yODAwNzg5IEM1Ljc0MDc0MDc0LDExLjM0MzE5NTMgNC4xNjY2NjY2Nyw5LjU0NDM3ODcgNC4xNjY2NjY2Nyw3LjI1ODM4MjY0IEM0LjE2NjY2NjY3LDMuOTIzMDc2OTIgNy4wODMzMzMzMywxIDEwLjQxNjY2NjcsMSBMMTAuNDE2NjY2NywxIFogTTI3LjY0Njc4MjYsNS41NTExMTUxMmUtMTcgQzMwLjk1OTM0MDUsNS41NTExMTUxMmUtMTcgMzMuODU3ODI4NywyLjkzNDY1MzQ3IDMzLjg1NzgyODcsNi4yODMxNjgzMiBDMzMuODU3ODI4Nyw4LjU3ODIxNzgyIDMyLjMzOTU3MywxMC4zNDY1MzQ3IDMwLjgyMTMxNzMsMTEuMzI0NzUyNSBMMzAuODIxMzE3MywxMS4zMjQ3NTI1IEwzMC44MjEzMTczLDExLjczODYxMzkgQzMxLjE0MzM3MTUsMTEuODg5MTA4OSAzMS42OTU0NjQ1LDEyLjAzOTYwNCAzMi4yOTM1NjUyLDEyLjE5MDA5OSBDMzcuMDMyMzYzNCwxMy41MDY5MzA3IDM4LjA0NDUzMzgsMTUuNzI2NzMyNyAzNy45OTg1MjYxLDE3LjM0NDU1NDUgQzM3Ljk5ODUyNjEsMTguMDU5NDA1OSAzNy40MDA0MjU0LDE5IDM2LjI1MDIzMTYsMTkgTDM2LjI1MDIzMTYsMTkgTDMxLjc4NzQ4LDE5IEMzMS41NTc0NDEzLDE5IDMxLjM3MzQxMDMsMTguOTI0NzUyNSAzMS4yODEzOTQ4LDE4Ljc3NDI1NzQgQzMwLjc3NTMwOTUsMTguMTM0NjUzNSAzMC4xMzEyMDExLDE3LjUzMjY3MzMgMjkuMjU3MDUzOCwxNy4wMDU5NDA2IEMyOS4xMTkwMzA2LDE2LjkzMDY5MzEgMjkuMDczMDIyOCwxNi44MTc4MjE4IDI5LjExOTAzMDYsMTYuNzA0OTUwNSBMMjkuMTE5MDMwNiwxNi43MDQ5NTA1IEwyOS4xNTk1NDc3LDE2LjYwODkwNDEgQzI5LjI5MjgzNzYsMTYuMzY0NDc4NyAyOS42MjAwMDM4LDE2LjIxNTg0MTYgMjkuOTQ3MTcwMSwxNi4yMTU4NDE2IEwyOS45NDcxNzAxLDE2LjIxNTg0MTYgTDM0LjA0MTg1OTcsMTYuMjE1ODQxNiBDMzMuNDg5NzY2NywxNS42ODkxMDg5IDMyLjU2OTYxMTcsMTUuMjM3NjIzOCAzMS4xODkzNzkzLDE0Ljg2MTM4NjEgQzI5LjM0OTA2OTMsMTQuNDA5OTAxIDI3LjM3MDczNjEsMTMuODA3OTIwOCAyNy4zNzA3MzYxLDEyLjI2NTM0NjUgTDI3LjM3MDczNjEsMTIuMjY1MzQ2NSBMMjcuMzcwNDEwNCwxMS42OTUwNzQ2IEMyNy4zNjgyMjAxLDEwLjc0MjE3MiAyNy4zNzM2MTE2LDEwLjA0NTU0NDYgMjguMTA2ODYwMSw5LjQ4MTE4ODEyIEMyOC4yNDQ4ODM0LDkuMzY4MzE2ODMgMjguNDI4OTE0NCw5LjI5MzA2OTMxIDI4LjQ3NDkyMjEsOS4yNTU0NDU1NCBDMjkuMzk1MDc3MSw4LjcyODcxMjg3IDMwLjQwNzI0NzUsNy42IDMwLjQwNzI0NzUsNi4yODMxNjgzMiBDMzAuNDA3MjQ3NSw0LjMyNjczMjY3IDI4Ljg4ODk5MTgsMi43ODQxNTg0MiAyNy42NDY3ODI2LDIuNzg0MTU4NDIgTDI3LjY0Njc4MjYsMi43ODQxNTg0MiBMMjcuMzcwNzM2MSwyLjc4NDE1ODQyIEMyNi43MjY2Mjc2LDIuNzg0MTU4NDIgMjYuNDA0NTczNCwyLjkzNDY1MzQ3IDI2LjAzNjUxMTQsMy4zMTA4OTEwOSBDMjUuOTkwNTAzNywzLjM0ODUxNDg1IDI1Ljc2MDQ2NDksMy42NDk1MDQ5NSAyNS41MzA0MjYyLDMuOTUwNDk1MDUgQzI0Ljg0MDMxLDMuMTIyNzcyMjggMjMuOTY2MTYyNywyLjQ4MzE2ODMyIDIzLDEuOTk0MDU5NDEgQzI0LjEwNDE4NiwwLjYzOTYwMzk2IDI1LjQ4NDQxODQsNS41NTExMTUxMmUtMTcgMjcuMzcwNzM2MSw1LjU1MTExNTEyZS0xNyBMMjcuMzcwNzM2MSw1LjU1MTExNTEyZS0xNyBaXFxcIiBpZD1cXFwiQ29tYmluZWQtU2hhcGVcXFwiPjwvcGF0aD5cXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgPC9nPlxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIDwvZz5cXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIDwvZz5cXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgPC9nPlxcbiAgICAgICAgICAgICAgICAgICAgICAgIDwvZz5cXG4gICAgICAgICAgICAgICAgICAgIDwvc3ZnPlxcbiAgICAgICAgICAgICAgICAgICAgR3JvdXBzXFxuICAgICAgICAgICAgICAgIDwvYT5cXG4gICAgICAgICAgICAgICAgPGEgaHJlZj1cXFwiI1xcXCIgaWQ9XFxcImJhYy0tcHVyZXNkay0tYXBwcy0tb3BlbmVyLS1cXFwiIGNsYXNzPVxcXCJiYWMtLXB1cmVzZGstYXBwcy1vbi1uYXZiYXItLVxcXCI+XFxuICAgICAgICAgICAgICAgICAgICA8c3ZnIHdpZHRoPVxcXCIxM3B4XFxcIiBoZWlnaHQ9XFxcIjEzcHhcXFwiIHZpZXdCb3g9XFxcIjAgMCAxMyAxM1xcXCIgdmVyc2lvbj1cXFwiMS4xXFxcIiB4bWxucz1cXFwiaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmdcXFwiIHhtbG5zOnhsaW5rPVxcXCJodHRwOi8vd3d3LnczLm9yZy8xOTk5L3hsaW5rXFxcIj5cXG4gICAgICAgICAgICAgICAgICAgICAgICA8IS0tIEdlbmVyYXRvcjogc2tldGNodG9vbCA1OS4xICgxMDEwMTApIC0gaHR0cHM6Ly9za2V0Y2guY29tIC0tPlxcbiAgICAgICAgICAgICAgICAgICAgICAgIDxnIGlkPVxcXCJQUC1CQS1Qb3J0YWwtSG9tZV9EZXNrdG9wLXYyXFxcIiBzdHJva2U9XFxcIm5vbmVcXFwiIHN0cm9rZS13aWR0aD1cXFwiMVxcXCIgZmlsbD1cXFwibm9uZVxcXCIgZmlsbC1ydWxlPVxcXCJldmVub2RkXFxcIj5cXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgPGcgaWQ9XFxcIlBQQ00tTGlzdGluZ19Db25uZXhpb25fMDFfTWF4X0RcXFwiIHRyYW5zZm9ybT1cXFwidHJhbnNsYXRlKC0xMzc4LjAwMDAwMCwgLTc4LjAwMDAwMClcXFwiIGZpbGw9XFxcIiMzMzMzMzNcXFwiIGZpbGwtcnVsZT1cXFwibm9uemVyb1xcXCI+XFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICA8ZyBpZD1cXFwiZWxlbWVudHMtLy1zZGstLy1idXR0b24tY29weS0yLWVsZW1lbnRzLS8tc2RrLS8tYnV0dG9uXFxcIiB0cmFuc2Zvcm09XFxcInRyYW5zbGF0ZSgxMzYzLjAwMDAwMCwgNzAuMDAwMDAwKVxcXCI+XFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgPGcgaWQ9XFxcImljb25zL2FwcHMvY2FtcGFpZ25zLWljb25zLS8tYXBwcy0vLTQweDQwLS8tT3RoZXJhcHBzXFxcIiB0cmFuc2Zvcm09XFxcInRyYW5zbGF0ZSgxMS4wMDAwMDAsIDQuMDAwMDAwKVxcXCI+XFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIDxnIGlkPVxcXCJlOTA2XFxcIiB0cmFuc2Zvcm09XFxcInRyYW5zbGF0ZSg0LjAwMDAwMCwgNC4wMDAwMDApXFxcIj5cXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIDxwYXRoIGQ9XFxcIk01LjA3ODEyNTcyLDIuNDk5OTk5OTRlLTA2IEwwLjM5MDYyNTA1NSwyLjQ5OTk5OTk0ZS0wNiBDMC4yODQ4MzA4NzQsMi40OTk5OTk5NGUtMDYgMC4xOTMyNzc5NDQsMC4wMzg2NTc5MDk5IDAuMTE1OTY2NjgzLDAuMTE1OTY5MTQ2IEMwLjAzODY1NTQyMjEsMC4xOTMyODAzODMgMCwwLjI4NDgzMzI4NCAwLDAuMzkwNjI3NDMyIEwwLDUuMDc4MTI2NjEgQzAsNS4xODM5MjA3NiAwLjAzODY1NTQyMjEsNS4yNzU0NzM2NiAwLjExNTk2NjY4Myw1LjM1Mjc4NDkgQzAuMTkzMjc3OTQ0LDUuNDMwMDk2MTQgMC4yODQ4MzA4NzQsNS40Njg3NTE1NSAwLjM5MDYyNTA1NSw1LjQ2ODc1MTU1IEwxLjE3MTg3NTE3LDUuNDY4NzUxNTUgQzEuMjc3NjY5MzUsNS40Njg3NTE1NSAxLjM2OTIyMjI4LDUuNDMwMDk2MTQgMS40NDY1MzM1NCw1LjM1Mjc4NDkgQzEuNTIzODQ0OCw1LjI3NTQ3MzY2IDEuNTYyNTAwMjIsNS4xODM5MjA3NiAxLjU2MjUwMDIyLDUuMDc4MTI2NjEgTDEuNTYyNTAwMjIsMS44NTU0Njg4NCBDMS41NjI1MDAyMiwxLjg1NTQ2ODg0IDEuNTc2NzQxODksMS44MDY2NDA5MyAxLjYwNTIyNDgxLDEuNzA4OTg0MjkgQzEuNjMzNzA3NzMsMS42MTEzMjg0NyAxLjcwODk4NDQxLDEuNTYyNTAwMTQgMS44MzEwNTQ4NCwxLjU2MjUwMDE0IEMxLjgzMTA1NDg0LDEuNTYyNTAwMTQgMS44MzMwODk0MywxLjU2MjUwMDE0IDEuODM3MTU4NTksMS41NjI1MDAxNCBDMS44NDEyMjczNCwxLjU2MjUwMDE0IDEuODQ3MzMxMDksMS41NjI1MDAxNCAxLjg1NTQ2OTAxLDEuNTYyNTAwMTQgTDMuNTc2NjYwOTIsMS41NjI1MDAxNCBDMy41NzY2NjA5MiwxLjU2MjUwMDE0IDMuNjI3NTIzODUsMS41NzY3NDE4MSAzLjcyOTI0ODg2LDEuNjA1MjI0NzIgQzMuODMwOTc0MjksMS42MzM3MDc2MyAzLjg4OTk3NTEzLDEuNzE3MTIyNjIgMy45MDYyNTA5NywxLjg1NTQ2ODg0IEwzLjkwNjI1MDk3LDMuNDkxMjEwMjIgQzMuOTA2MjUwOTcsMy40OTEyMTAyMiAzLjg5MjAwOTMsMy41NTYzMTQzOCAzLjg2MzUyNjM4LDMuNjg2NTIyNjkgQzMuODM1MDQzNDYsMy44MTY3MzEgMy43MTkwNzYzNiwzLjg4MTgzNTE2IDMuNTE1NjI1OTEsMy44ODE4MzUxNiBDMy41MTU2MjU5MSwzLjg4MTgzNTE2IDMuNTA3NDg4LDMuODgxODM1MTYgMy40OTEyMTE3NCwzLjg4MTgzNTE2IEwyLjc3MDk5NDk4LDMuODgxODM1MTYgQzIuNjY1MjAwMzgsMy44ODE4MzUxNiAyLjU3MzY0Nzg2LDMuOTIwNDkwOTggMi40OTYzMzY2LDMuOTk3ODAyMjIgQzIuNDE5MDI1MzQsNC4wNzUxMTMwNCAyLjM4MDM2OTkyLDQuMTY2NjY1OTQgMi4zODAzNjk5Miw0LjI3MjQ2MDA5IEwyLjM4MDM2OTkyLDUuMDUzNzA5OTUgQzIuMzgwMzY5OTIsNS4xNjc2NDI0MyAyLjQxOTAyNTM0LDUuMjYxMjI5NSAyLjQ5NjMzNjYsNS4zMzQ0NzE1NyBDMi41NzM2NDc4Niw1LjQwNzcxNDA2IDIuNjY1MjAwMzgsNS40NDQzMzQ4OCAyLjc3MDk5NDk4LDUuNDQ0MzM0ODggTDUuMDc4MTI0NDcsNS40NDQzMzQ4OCBDNS4xODM5MTg2NSw1LjQ0NDMzNDg4IDUuMjc1NDcxNTgsNS40MDc3MTQwNiA1LjM1Mjc4Mjg0LDUuMzM0NDcxNTcgQzUuNDMwMDk0MSw1LjI2MTIyOTUgNS40Njg3NDk1Miw1LjE2NzY0MjQzIDUuNDY4NzQ5NTIsNS4wNTM3MDk5NSBMNS40Njg3NDk1MiwwLjM5MDYyNzQzMiBDNS40Njg3NDk1MiwwLjI4NDgzMzI4NCA1LjQzMDA5NDEsMC4xOTMyODAzODMgNS4zNTI3ODI4NCwwLjExNTk2OTE0NiBDNS4yNzU0NzE1OCwwLjAzODY1NzkwOTkgNS4xODM5MTg2NSwyLjQ5OTk5OTk0ZS0wNiA1LjA3ODEyNDQ3LDIuNDk5OTk5OTRlLTA2IEw1LjA3ODEyNTcyLDIuNDk5OTk5OTRlLTA2IFogTTEyLjEwOTM3NjIsMCBMNy40MjE4NzU1MywwIEM3LjMxNjA4MTM1LDAgNy4yMjQ1Mjg0MiwwLjAzODY1NzkwOTEgNy4xNDcyMTcxNiwwLjExNTk2OTE0NCBDNy4wNjk5MDU5LDAuMTkzMjgwMzc5IDcuMDMxMjUwNDgsMC4yODQ4MzMyNzggNy4wMzEyNTA0OCwwLjM5MDYyNzQyNCBMNy4wMzEyNTA0OCw1LjA3ODEyNjUxIEM3LjAzMTI1MDQ4LDUuMTgzOTIwNjUgNy4wNjk5MDU5LDUuMjc1NDczNTUgNy4xNDcyMTcxNiw1LjM1Mjc4NDc5IEM3LjIyNDUyODQyLDUuNDMwMDk2MDIgNy4zMTYwODEzNSw1LjQ2ODc1MTQzIDcuNDIxODc1NTMsNS40Njg3NTE0MyBMOC4yMDMxMjU2NCw1LjQ2ODc1MTQzIEM4LjMwODkxOTgyLDUuNDY4NzUxNDMgOC40MDA0NzI3NSw1LjQzMDA5NjAyIDguNDc3Nzg0MDEsNS4zNTI3ODQ3OSBDOC41NTUwOTUyOCw1LjI3NTQ3MzU1IDguNTkzNzUwNyw1LjE4MzkyMDY1IDguNTkzNzUwNyw1LjA3ODEyNjUxIEw4LjU5Mzc1MDcsMS44NTU0Njg4IEM4LjU5Mzc1MDcsMS44NTU0Njg4IDguNjA3OTkyMzcsMS44MTA3MDk2NSA4LjYzNjQ3NTI5LDEuNzIxMTkxMzMgQzguNjY0OTU4MjEsMS42MzE2NzM0MyA4Ljc0MDIzNDg5LDEuNTg2OTE0MjcgOC44NjIzMDUzMiwxLjU4NjkxNDI3IEM4Ljg2MjMwNTMyLDEuNTg2OTE0MjcgOC44NjQzMzk5LDEuNTg2OTE0MjcgOC44Njg0MDkwNywxLjU4NjkxNDI3IEM4Ljg3MjQ3NzgyLDEuNTg2OTE0MjcgOC44Nzg1ODE1NywxLjU4NjkxNDI3IDguODg2NzE5NDksMS41ODY5MTQyNyBMMTAuNjA3OTExNCwxLjU4NjkxNDI3IEMxMC42MDc5MTE0LDEuNTg2OTE0MjcgMTAuNjU4Nzc0MywxLjYwMTE1NTUyIDEwLjc2MDQ5OTMsMS42Mjk2Mzg4NSBDMTAuODYyMjI0OCwxLjY1ODEyMTc2IDEwLjkyMTIyNTYsMS43NDE1MzY3NCAxMC45Mzc1MDE0LDEuODc5ODgyOTcgTDEwLjkzNzUwMTQsMy41MTU2MjQzMSBDMTAuOTM3NTAxNCwzLjUxNTYyNDMxIDEwLjkyMzI1OTgsMy41ODA3Mjg0NyAxMC44OTQ3NzY5LDMuNzEwOTM2NzcgQzEwLjg2NjI5MzksMy44NDExNDUwOCAxMC43NTAzMjY4LDMuOTA2MjQ5MjQgMTAuNTQ2ODc2NCwzLjkwNjI0OTI0IEMxMC41NDY4NzY0LDMuOTA2MjQ5MjQgMTAuNTM4NzM4NSwzLjkwNjI0OTI0IDEwLjUyMjQ2MjIsMy45MDYyNDkyNCBMOS43NjU2MjQ2MSwzLjkwNjI0OTI0IEM5LjY1OTgzMDQzLDMuOTA2MjQ5MjQgOS41NjgyNzc1LDMuOTQ0OTA0NjUgOS40OTA5NjYyNCw0LjAyMjIxNTg4IEM5LjQxMzY1NDk4LDQuMDk5NTI3MTEgOS4zNzQ5OTk1Niw0LjE5MTA4MDAxIDkuMzc0OTk5NTYsNC4yOTY4NzQxNiBMOS4zNzQ5OTk1Niw1LjA3ODEyNDAxIEM5LjM3NDk5OTU2LDUuMTgzOTE4MTUgOS40MTM2NTQ5OCw1LjI3NTQ3MTA1IDkuNDkwOTY2MjQsNS4zNTI3ODIyOSBDOS41NjgyNzc1LDUuNDMwMDkzNTIgOS42NTk4MzA0Myw1LjQ2ODc1MTQzIDkuNzY1NjI0NjEsNS40Njg3NTE0MyBMMTIuMTA5Mzc0OSw1LjQ2ODc1MTQzIEMxMi4yMTUxNjkxLDUuNDY4NzUxNDMgMTIuMzA2NzIyMSw1LjQzMDA5MzUyIDEyLjM4NDAzMzMsNS4zNTI3ODIyOSBDMTIuNDYxMzQ0Niw1LjI3NTQ3MTA1IDEyLjUsNS4xODM5MTgxNSAxMi41LDUuMDc4MTI0MDEgTDEyLjUsMC4zOTA2MjQ5MjQgQzEyLjUsMC4yODQ4MzA3NzggMTIuNDYxMzQ0NiwwLjE5MzI3Nzg3OSAxMi4zODQwMzMzLDAuMTE1OTY2NjQ0IEMxMi4zMDY3MjIxLDAuMDM4NjU1NDA5MSAxMi4yMTUxNjkxLDAgMTIuMTA5Mzc0OSwwIEwxMi4xMDkzNzYyLDAgWiBNNS4wNzgxMjU3Miw3LjAzMTI0ODU3IEwwLjM5MDYyNTA1NSw3LjAzMTI0ODU3IEMwLjI4NDgzMDg3NCw3LjAzMTI0ODU3IDAuMTkzMjc3OTQ0LDcuMDY5OTA2NDggMC4xMTU5NjY2ODMsNy4xNDcyMTc3MSBDMC4wMzg2NTU0MjIxLDcuMjI0NTI4OTUgMCw3LjMxNjA4MTg1IDAsNy40MjE4NzU5OSBMMCwxMi4xMDkzNzUxIEMwLDEyLjIxNTE2OTIgMC4wMzg2NTU0MjIxLDEyLjMwNjcyMjEgMC4xMTU5NjY2ODMsMTIuMzg0MDMzNCBDMC4xOTMyNzc5NDQsMTIuNDYxMzQ0NiAwLjI4NDgzMDg3NCwxMi41IDAuMzkwNjI1MDU1LDEyLjUgTDEuMTcxODc1MTcsMTIuNSBDMS4yNzc2NjkzNSwxMi41IDEuMzY5MjIyMjgsMTIuNDYxMzQ0NiAxLjQ0NjUzMzU0LDEyLjM4NDAzMzQgQzEuNTIzODQ0OCwxMi4zMDY3MjIxIDEuNTYyNTAwMjIsMTIuMjE1MTY5MiAxLjU2MjUwMDIyLDEyLjEwOTM3NTEgTDEuNTYyNTAwMjIsOC44ODY3MTczNyBDMS41NjI1MDAyMiw4Ljg4NjcxNzM3IDEuNTc2NzQxODksOC44NDE5NTgyMiAxLjYwNTIyNDgxLDguNzUyNDM5OSBDMS42MzM3MDc3Myw4LjY2MjkyMiAxLjcwODk4NDQxLDguNjE4MTYyODQgMS44MzEwNTQ4NCw4LjYxODE2Mjg0IEMxLjgzMTA1NDg0LDguNjE4MTYyODQgMS44MzMwODk0Myw4LjYxODE2Mjg0IDEuODM3MTU4NTksOC42MTgxNjI4NCBDMS44NDEyMjczNCw4LjYxODE2Mjg0IDEuODQ3MzMxMDksOC42MTgxNjI4NCAxLjg1NTQ2OTAxLDguNjE4MTYyODQgTDMuNTc2NjYwOTIsOC42MTgxNjI4NCBDMy41NzY2NjA5Miw4LjYxODE2Mjg0IDMuNjI3NTIzODUsOC42MzI0MDQwOSAzLjcyOTI0ODg2LDguNjYwODg3NDIgQzMuODMwOTc0MjksOC42ODkzNzAzMyAzLjg4OTk3NTEzLDguNzcyNzg1MzEgMy45MDYyNTA5Nyw4LjkxMTEzMTU0IEwzLjkwNjI1MDk3LDEwLjU0Njg3MjkgQzMuOTA2MjUwOTcsMTAuNTQ2ODcyOSAzLjg5MjAwOTMsMTAuNjExOTc3IDMuODYzNTI2MzgsMTAuNzQyMTg1MyBDMy44MzUwNDM0NiwxMC44NzIzOTM3IDMuNzE5MDc2MzYsMTAuOTM3NDk3OCAzLjUxNTYyNTkxLDEwLjkzNzQ5NzggQzMuNTE1NjI1OTEsMTAuOTM3NDk3OCAzLjUwNzQ4OCwxMC45Mzc0OTc4IDMuNDkxMjExNzQsMTAuOTM3NDk3OCBMMi43NzA5OTQ5OCwxMC45Mzc0OTc4IEMyLjY2NTIwMDM4LDEwLjkzNzQ5NzggMi41NzM2NDc4NiwxMC45NzYxNTMyIDIuNDk2MzM2NiwxMS4wNTM0NjQ0IEMyLjQxOTAyNTM0LDExLjEzMDc3NTcgMi4zODAzNjk5MiwxMS4yMjIzMjg2IDIuMzgwMzY5OTIsMTEuMzI4MTIyNyBMMi4zODAzNjk5MiwxMi4xMDkzNzI2IEMyLjM4MDM2OTkyLDEyLjIxNTE2NjcgMi40MTkwMjUzNCwxMi4zMDY3MTk2IDIuNDk2MzM2NiwxMi4zODQwMzA5IEMyLjU3MzY0Nzg2LDEyLjQ2MTM0MjEgMi42NjUyMDAzOCwxMi41IDIuNzcwOTk0OTgsMTIuNSBMNS4wNzgxMjQ0NywxMi41IEM1LjE4MzkxODY1LDEyLjUgNS4yNzU0NzE1OCwxMi40NjEzNDIxIDUuMzUyNzgyODQsMTIuMzg0MDMwOSBDNS40MzAwOTQxLDEyLjMwNjcxOTYgNS40Njg3NDk1MiwxMi4yMTUxNjY3IDUuNDY4NzQ5NTIsMTIuMTA5MzcyNiBMNS40Njg3NDk1Miw3LjQyMTg3MzQ5IEM1LjQ2ODc0OTUyLDcuMzE2MDc5MzUgNS40MzAwOTQxLDcuMjI0NTI2NDUgNS4zNTI3ODI4NCw3LjE0NzIxNTIxIEM1LjI3NTQ3MTU4LDcuMDY5OTAzOTggNS4xODM5MTg2NSw3LjAzMTI0ODU3IDUuMDc4MTI0NDcsNy4wMzEyNDg1NyBMNS4wNzgxMjU3Miw3LjAzMTI0ODU3IFogTTEyLjEwOTM3NjIsNy4wMzEyNDg1NyBMNy40MjE4NzU1Myw3LjAzMTI0ODU3IEM3LjMxNjA4MTM1LDcuMDMxMjQ4NTcgNy4yMjQ1Mjg0Miw3LjA2OTkwNjQ4IDcuMTQ3MjE3MTYsNy4xNDcyMTc3MSBDNy4wNjk5MDU5LDcuMjI0NTI4OTUgNy4wMzEyNTA0OCw3LjMxNjA4MTg1IDcuMDMxMjUwNDgsNy40MjE4NzU5OSBMNy4wMzEyNTA0OCwxMi4xMDkzNzUxIEM3LjAzMTI1MDQ4LDEyLjIxNTE2OTIgNy4wNjk5MDU5LDEyLjMwNjcyMjEgNy4xNDcyMTcxNiwxMi4zODQwMzM0IEM3LjIyNDUyODQyLDEyLjQ2MTM0NDYgNy4zMTYwODEzNSwxMi41IDcuNDIxODc1NTMsMTIuNSBMOC4yMDMxMjU2NCwxMi41IEM4LjMwODkxOTgyLDEyLjUgOC40MDA0NzI3NSwxMi40NjEzNDQ2IDguNDc3Nzg0MDEsMTIuMzg0MDMzNCBDOC41NTUwOTUyOCwxMi4zMDY3MjIxIDguNTkzNzUwNywxMi4yMTUxNjkyIDguNTkzNzUwNywxMi4xMDkzNzUxIEw4LjU5Mzc1MDcsOC44ODY3MTczNyBDOC41OTM3NTA3LDguODg2NzE3MzcgOC42MDc5OTIzNyw4Ljg0MTk1ODIyIDguNjM2NDc1MjksOC43NTI0Mzk5IEM4LjY2NDk1ODIxLDguNjYyOTIyIDguNzQwMjM0ODksOC42MTgxNjI4NCA4Ljg2MjMwNTMyLDguNjE4MTYyODQgQzguODYyMzA1MzIsOC42MTgxNjI4NCA4Ljg2NDMzOTksOC42MTgxNjI4NCA4Ljg2ODQwOTA3LDguNjE4MTYyODQgQzguODcyNDc3ODIsOC42MTgxNjI4NCA4Ljg3ODU4MTU3LDguNjE4MTYyODQgOC44ODY3MTk0OSw4LjYxODE2Mjg0IEwxMC42MDc5MTE0LDguNjE4MTYyODQgQzEwLjYwNzkxMTQsOC42MTgxNjI4NCAxMC42NTg3NzQzLDguNjMyNDA0MDkgMTAuNzYwNDk5Myw4LjY2MDg4NzQyIEMxMC44NjIyMjQ4LDguNjg5MzcwMzMgMTAuOTIxMjI1Niw4Ljc3Mjc4NTMxIDEwLjkzNzUwMTQsOC45MTExMzE1NCBMMTAuOTM3NTAxNCwxMC41NDY4NzI5IEMxMC45Mzc1MDE0LDEwLjU0Njg3MjkgMTAuOTIzMjU5OCwxMC42MTE5NzcgMTAuODk0Nzc2OSwxMC43NDIxODUzIEMxMC44NjYyOTM5LDEwLjg3MjM5MzcgMTAuNzUwMzI2OCwxMC45Mzc0OTc4IDEwLjU0Njg3NjQsMTAuOTM3NDk3OCBDMTAuNTQ2ODc2NCwxMC45Mzc0OTc4IDEwLjUzODczODUsMTAuOTM3NDk3OCAxMC41MjI0NjIyLDEwLjkzNzQ5NzggTDkuNzY1NjI0NjEsMTAuOTM3NDk3OCBDOS42NTk4MzA0MywxMC45Mzc0OTc4IDkuNTY4Mjc3NSwxMC45NzYxNTMyIDkuNDkwOTY2MjQsMTEuMDUzNDY0NCBDOS40MTM2NTQ5OCwxMS4xMzA3NzU3IDkuMzc0OTk5NTYsMTEuMjIyMzI4NiA5LjM3NDk5OTU2LDExLjMyODEyMjcgTDkuMzc0OTk5NTYsMTIuMTA5MzcyNiBDOS4zNzQ5OTk1NiwxMi4yMTUxNjY3IDkuNDEzNjU0OTgsMTIuMzA2NzE5NiA5LjQ5MDk2NjI0LDEyLjM4NDAzMDkgQzkuNTY4Mjc3NSwxMi40NjEzNDIxIDkuNjU5ODMwNDMsMTIuNSA5Ljc2NTYyNDYxLDEyLjUgTDEyLjEwOTM3NDksMTIuNSBDMTIuMjE1MTY5MSwxMi41IDEyLjMwNjcyMjEsMTIuNDYxMzQyMSAxMi4zODQwMzMzLDEyLjM4NDAzMDkgQzEyLjQ2MTM0NDYsMTIuMzA2NzE5NiAxMi41LDEyLjIxNTE2NjcgMTIuNSwxMi4xMDkzNzI2IEwxMi41LDcuNDIxODczNDkgQzEyLjUsNy4zMTYwNzkzNSAxMi40NjEzNDQ2LDcuMjI0NTI2NDUgMTIuMzg0MDMzMyw3LjE0NzIxNTIxIEMxMi4zMDY3MjIxLDcuMDY5OTAzOTggMTIuMjE1MTY5MSw3LjAzMTI0ODU3IDEyLjEwOTM3NDksNy4wMzEyNDg1NyBMMTIuMTA5Mzc2Miw3LjAzMTI0ODU3IFpcXFwiIGlkPVxcXCJTaGFwZVxcXCI+PC9wYXRoPlxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICA8L2c+XFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgPC9nPlxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgPC9nPlxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICA8L2c+XFxuICAgICAgICAgICAgICAgICAgICAgICAgPC9nPlxcbiAgICAgICAgICAgICAgICAgICAgPC9zdmc+XFxuICAgICAgICAgICAgICAgICAgICBPdGhlciBhcHBzXFxuICAgICAgICAgICAgICAgIDwvYT5cXG4gICAgICAgICAgICAgICAgPGRpdiBjbGFzcz1cXFwiYmFjLS1hcHBzLWNvbnRhaW5lclxcXCIgaWQ9XFxcImJhYy0tcHVyZXNkay1hcHBzLWNvbnRhaW5lci0tXFxcIj5cXG4gICAgICAgICAgICAgICAgICAgIDxkaXYgaWQ9XFxcImJhYy0tYXBzLWFjdHVhbC1jb250YWluZXJcXFwiPjwvZGl2PlxcbiAgICAgICAgICAgICAgICA8L2Rpdj5cXG4gICAgICAgICAgICA8L2Rpdj5cXG4gICAgICAgICAgICA8ZGl2IGNsYXNzPVxcXCJiYWMtLXVzZXItYXZhdGFyXFxcIiBpZD1cXFwiYmFjLS11c2VyLWF2YXRhci10b3BcXFwiPlxcbiAgICAgICAgICAgICAgICA8c3BhbiBjbGFzcz1cXFwiYmFjLS11c2VyLWF2YXRhci1uYW1lXFxcIiBpZD1cXFwiYmFjLS1wdXJlc2RrLXVzZXItYXZhdGFyLS1cXFwiPjwvc3Bhbj5cXG4gICAgICAgICAgICAgICAgPGRpdiBpZD1cXFwiYmFjLS1pbWFnZS1jb250YWluZXItdG9wXFxcIj48L2Rpdj5cXG4gICAgICAgICAgICA8L2Rpdj5cXG4gICAgICAgIDwvZGl2PlxcbiAgICA8L2Rpdj5cXG4gICAgPGRpdiBpZD1cXFwiYmFjLS1pbmZvLWJsb2Nrcy13cmFwcGVyLS1cXFwiPjwvZGl2PlxcbjwvaGVhZGVyPlxcbjxkaXYgY2xhc3M9XFxcImJhYy0tdXNlci1zaWRlYmFyXFxcIiBpZD1cXFwiYmFjLS1wdXJlc2RrLXVzZXItc2lkZWJhci0tXFxcIj5cXG4gICAgPGRpdiBjbGFzcz1cXFwiYmFjLS11c2VyLXNpZGViYXItd2hpdGUtYmdcXFwiIGlkPVxcXCJiYWMtLXVzZXItc2lkZWJhci13aGl0ZS1iZ1xcXCI+XFxuICAgICAgICA8ZGl2IGlkPVxcXCJiYWMtLXB1cmVzZGstdXNlci1kZXRhaWxzLS1cXFwiPlxcbiAgICAgICAgICAgIDxkaXYgY2xhc3M9XFxcImJhYy11c2VyLWFjb3VudC1saXN0LWl0ZW1cXFwiPlxcbiAgICAgICAgICAgICAgICA8YSBpZD1cXFwiYmFjLS1sb2dvdXQtLWJ1dHRvblxcXCIgaHJlZj1cXFwiL2FwaS92MS9zaWduLW9mZlxcXCI+PGkgY2xhc3M9XFxcImZhIGZhLWxvZ2luLWxpbmVcXFwiPjwvaT4gTG9nIG91dDwvYT5cXG4gICAgICAgICAgICA8L2Rpdj5cXG4gICAgICAgIDwvZGl2PlxcbiAgICAgICAgPGRpdiBjbGFzcz1cXFwiYmFjLS11c2VyLWFwcHNcXFwiIGlkPVxcXCJiYWMtLXB1cmVzZGstdXNlci1idXNpbmVzc2VzLS1cXFwiPlxcbiAgICAgICAgPC9kaXY+XFxuICAgICAgICA8ZGl2IGNsYXNzPVxcXCJiYWMtLXVzZXItYWNjb3VudC1zZXR0aW5nc1xcXCI+XFxuICAgICAgICAgICAgPGRpdiBpZD1cXFwicHVyZXNkay12ZXJzaW9uLW51bWJlclxcXCIgY2xhc3M9XFxcInB1cmVzZGstdmVyc2lvbi1udW1iZXJcXFwiPjwvZGl2PlxcbiAgICAgICAgPC9kaXY+XFxuICAgIDwvZGl2PlxcbjwvZGl2PlxcblxcblxcbjxkaXYgY2xhc3M9XFxcImJhYy0tY3VzdG9tLW1vZGFsIGFkZC1xdWVzdGlvbi1tb2RhbCAtLWlzLW9wZW5cXFwiIGlkPVxcXCJiYWMtLWNsb3VkaW5hcnktLW1vZGFsXFxcIj5cXG4gICAgPGRpdiBjbGFzcz1cXFwiY3VzdG9tLW1vZGFsX193cmFwcGVyXFxcIj5cXG4gICAgICAgIDxkaXYgY2xhc3M9XFxcImN1c3RvbS1tb2RhbF9fY29udGVudFxcXCI+XFxuICAgICAgICAgICAgPGgzPkFkZCBpbWFnZTwvaDM+XFxuICAgICAgICAgICAgPGEgY2xhc3M9XFxcImN1c3RvbS1tb2RhbF9fY2xvc2UtYnRuXFxcIiBpZD1cXFwiYmFjLS1jbG91ZGluYXJ5LS1jbG9zZWJ0blxcXCI+PGkgY2xhc3M9XFxcImZhIGZhLXRpbWVzLWNpcmNsZVxcXCI+PC9pPjwvYT5cXG4gICAgICAgIDwvZGl2PlxcblxcbiAgICAgICAgPGRpdiBjbGFzcz1cXFwiY3VzdG9tLW1vZGFsX19jb250ZW50XFxcIj5cXG4gICAgICAgICAgICA8ZGl2IGNsYXNzPVxcXCJiYWMtc2VhcmNoIC0taWNvbi1sZWZ0XFxcIj5cXG4gICAgICAgICAgICAgICAgPGlucHV0IGlkPVxcXCJiYWMtLWNsb3VkaW5hcnktLXNlYXJjaC1pbnB1dFxcXCIgdHlwZT1cXFwic2VhcmNoXFxcIiBuYW1lPVxcXCJzZWFyY2hcXFwiIHBsYWNlaG9sZGVyPVxcXCJTZWFyY2ggZm9yIGltYWdlcy4uLlxcXCIvPlxcbiAgICAgICAgICAgICAgICA8ZGl2IGNsYXNzPVxcXCJiYWMtc2VhcmNoX19pY29uXFxcIj48aSBjbGFzcz1cXFwiZmEgZmEtc2VhcmNoXFxcIj48L2k+PC9kaXY+XFxuICAgICAgICAgICAgPC9kaXY+XFxuICAgICAgICAgICAgPGJyLz5cXG5cXG4gICAgICAgICAgICA8ZGl2IGNsYXNzPVxcXCJiYWNrLWJ1dHRvblxcXCIgaWQ9XFxcImJhYy0tY2xvdWRpbmFyeS0tYmFjay1idXR0b24tY29udGFpbmVyXFxcIj5cXG4gICAgICAgICAgICAgICAgPGEgY2xhc3M9XFxcImdvQmFja1xcXCIgaWQ9XFxcImJhYy0tY2xvdWRpbmFyeS0tZ28tYmFja1xcXCI+PGkgY2xhc3M9XFxcImZhIGZhLWFuZ2xlLWxlZnRcXFwiPjwvaT5HbyBCYWNrPC9hPlxcbiAgICAgICAgICAgIDwvZGl2PlxcblxcbiAgICAgICAgICAgIDxici8+XFxuICAgICAgICAgICAgPGRpdiBjbGFzcz1cXFwiY2xvdWQtaW1hZ2VzXFxcIj5cXG4gICAgICAgICAgICAgICAgPGRpdiBjbGFzcz1cXFwiY2xvdWQtaW1hZ2VzX19jb250YWluZXJcXFwiIGlkPVxcXCJiYWMtLWNsb3VkaW5hcnktaXRhbXMtY29udGFpbmVyXFxcIj48L2Rpdj5cXG5cXG4gICAgICAgICAgICAgICAgPGRpdiBjbGFzcz1cXFwiY2xvdWQtaW1hZ2VzX19wYWdpbmF0aW9uXFxcIiBpZD1cXFwiYmFjLS1jbG91ZGluYXJ5LXBhZ2luYXRpb24tY29udGFpbmVyXFxcIj5cXG4gICAgICAgICAgICAgICAgICAgIDx1bCBpZD1cXFwiYmFjLS1jbG91ZGluYXJ5LWFjdHVhbC1wYWdpbmF0aW9uLWNvbnRhaW5lclxcXCI+PC91bD5cXG4gICAgICAgICAgICAgICAgPC9kaXY+XFxuXFxuICAgICAgICAgICAgPC9kaXY+XFxuICAgICAgICA8L2Rpdj5cXG4gICAgPC9kaXY+XFxuPC9kaXY+XFxuPGRpdiBpZD1cXFwiYmFjLS0taW52YWxpZC1hY2NvdW50XFxcIj5Zb3UgaGF2ZSBzd2l0Y2hlZCB0byBhbm90aGVyIGFjY291bnQgZnJvbSBhbm90aGVyIHRhYi4gUGxlYXNlIGVpdGhlciBjbG9zZSB0aGlzIHBhZ2VcXG4gICAgb3Igc3dpdGNoIHRvIHRoZSByaWdodCBhY2NvdW50IHRvIHJlLWVuYWJsZSBhY2Nlc3M8L2Rpdj5cXG5cXG48aW5wdXQgc3R5bGU9XFxcImRpc3BsYXk6bm9uZVxcXCIgdHlwZT0nZmlsZScgaWQ9J2JhYy0tLXB1cmVzZGstYXZhdGFyLWZpbGUnPlxcbjxpbnB1dCBzdHlsZT1cXFwiZGlzcGxheTpub25lXFxcIiB0eXBlPSdidXR0b24nIGlkPSdiYWMtLS1wdXJlc2RrLWF2YXRhci1zdWJtaXQnIHZhbHVlPSdVcGxvYWQhJz5cIik7XG5wcGJhLnNldFZlcnNpb25OdW1iZXIoJzIuOS43Jyk7XG53aW5kb3cuUFVSRVNESyA9IHBwYmE7XG52YXIgY3NzID0gJ2h0bWwsYm9keSxkaXYsc3BhbixhcHBsZXQsb2JqZWN0LGlmcmFtZSxoMSxoMixoMyxoNCxoNSxoNixwLGJsb2NrcXVvdGUscHJlLGEsYWJicixhY3JvbnltLGFkZHJlc3MsYmlnLGNpdGUsY29kZSxkZWwsZGZuLGVtLGltZyxpbnMsa2JkLHEscyxzYW1wLHNtYWxsLHN0cmlrZSxzdHJvbmcsc3ViLHN1cCx0dCx2YXIsYix1LGksY2VudGVyLGRsLGR0LGRkLG9sLHVsLGxpLGZpZWxkc2V0LGZvcm0sbGFiZWwsbGVnZW5kLHRhYmxlLGNhcHRpb24sdGJvZHksdGZvb3QsdGhlYWQsdHIsdGgsdGQsYXJ0aWNsZSxhc2lkZSxjYW52YXMsZGV0YWlscyxlbWJlZCxmaWd1cmUsZmlnY2FwdGlvbixmb290ZXIsaGVhZGVyLGhncm91cCxtZW51LG5hdixvdXRwdXQscnVieSxzZWN0aW9uLHN1bW1hcnksdGltZSxtYXJrLGF1ZGlvLHZpZGVve21hcmdpbjowO3BhZGRpbmc6MDtib3JkZXI6MDtmb250LXNpemU6MTAwJTtmb250OmluaGVyaXQ7dmVydGljYWwtYWxpZ246YmFzZWxpbmV9YXJ0aWNsZSxhc2lkZSxkZXRhaWxzLGZpZ2NhcHRpb24sZmlndXJlLGZvb3RlcixoZWFkZXIsaGdyb3VwLG1lbnUsbmF2LHNlY3Rpb257ZGlzcGxheTpibG9ja31ib2R5e2xpbmUtaGVpZ2h0OjF9b2wsdWx7bGlzdC1zdHlsZTpub25lfWJsb2NrcXVvdGUscXtxdW90ZXM6bm9uZX1ibG9ja3F1b3RlOmJlZm9yZSxibG9ja3F1b3RlOmFmdGVyLHE6YmVmb3JlLHE6YWZ0ZXJ7Y29udGVudDpcIlwiO2NvbnRlbnQ6bm9uZX10YWJsZXtib3JkZXItY29sbGFwc2U6Y29sbGFwc2U7Ym9yZGVyLXNwYWNpbmc6MH1ib2R5e292ZXJmbG93LXg6aGlkZGVufSNiYWMtLS1pbnZhbGlkLWFjY291bnR7cG9zaXRpb246Zml4ZWQ7d2lkdGg6MTAwJTtoZWlnaHQ6MTAwJTtiYWNrZ3JvdW5kOmJsYWNrO29wYWNpdHk6MC43O2NvbG9yOndoaXRlO2ZvbnQtc2l6ZToxOHB4O3RleHQtYWxpZ246Y2VudGVyO3BhZGRpbmctdG9wOjE1JTtkaXNwbGF5Om5vbmU7ei1pbmRleDoxMDAwMDAwMDB9I2JhYy0tLWludmFsaWQtYWNjb3VudC5pbnZhbGlke2Rpc3BsYXk6YmxvY2t9I2JhYy13cmFwcGVye2ZvbnQtZmFtaWx5OlwiVmVyZGFuYVwiLCBhcmlhbCwgc2Fucy1zZXJpZjtjb2xvcjp3aGl0ZTttaW4taGVpZ2h0OjEwMHZoO3Bvc2l0aW9uOnJlbGF0aXZlfS5iYWMtdXNlci1hY291bnQtbGlzdC1pdGVte2JhY2tncm91bmQtY29sb3I6dHJhbnNwYXJlbnQ7dGV4dC1hbGlnbjpjZW50ZXJ9LmJhYy11c2VyLWFjb3VudC1saXN0LWl0ZW0gI2JhYy0tbG9nb3V0LS1idXR0b257ZGlzcGxheTppbmxpbmUtYmxvY2s7cGFkZGluZzo0cHggOHB4O2JhY2tncm91bmQtY29sb3I6cmdiYSgyNTUsMjU1LDI1NSwwLjg1KTtmb250LXNpemU6MTJweDtib3JkZXItcmFkaXVzOjJweDttYXJnaW46NHB4IDAgMjZweCAwfS5iYWMtdXNlci1hY291bnQtbGlzdC1pdGVtIGZhLWxvZ2luLWxpbmV7bWFyZ2luLXJpZ2h0OjNweDtwb3NpdGlvbjpyZWxhdGl2ZTt0b3A6MXB4fS5iYWMtLWNvbnRhaW5lcnttYXgtd2lkdGg6MTE2MHB4O21hcmdpbjowIGF1dG99LmJhYy0tY29udGFpbmVyIC5iYWMtLXB1cmVzZGstYXBwLW5hbWUtLXtjb2xvcjojMzMzMzMzO3RleHQtZGVjb3JhdGlvbjpub25lO21hcmdpbi1yaWdodDoxNnB4O2ZvbnQtc2l6ZToxM3B4O2Rpc3BsYXk6aW5saW5lLWJsb2NrO3BhZGRpbmc6NnB4IDE2cHg7YmFja2dyb3VuZC1jb2xvcjpyZ2JhKDI1NSwyNTUsMjU1LDAuNzUpO3Bvc2l0aW9uOnJlbGF0aXZlO3RvcDotNnB4O2JvcmRlci1yYWRpdXM6NHB4O21hcmdpbi1sZWZ0OjIwcHh9LmJhYy0tY29udGFpbmVyIC5iYWMtLXB1cmVzZGstYXBwLW5hbWUtLTpob3ZlcntiYWNrZ3JvdW5kLWNvbG9yOnJnYmEoMjU1LDI1NSwyNTUsMC45KX0uYmFjLS1jb250YWluZXIgLmJhYy0tcHVyZXNkay1hcHAtbmFtZS0tIHN2Z3ttYXJnaW4tcmlnaHQ6NnB4fS5iYWMtLWNvbnRhaW5lciAjYXBwLW5hbWUtbGluay10by1yb290e3RleHQtZGVjb3JhdGlvbjpub25lfS5iYWMtLWhlYWRlci1hcHBze3Bvc2l0aW9uOmFic29sdXRlO3dpZHRoOjEwMCU7aGVpZ2h0OjUwcHg7YmFja2dyb3VuZC1jb2xvcjojNDc1MzY5O3BhZGRpbmc6NXB4IDEwcHg7ei1pbmRleDo5OTk5OTk5ICFpbXBvcnRhbnR9LmJhYy0taGVhZGVyLWFwcHMuYmFjLS1mdWxsd2lkdGh7cGFkZGluZzowfS5iYWMtLWhlYWRlci1hcHBzLmJhYy0tZnVsbHdpZHRoIC5iYWMtLWNvbnRhaW5lcnttYXgtd2lkdGg6dW5zZXQ7cGFkZGluZy1sZWZ0OjE2cHg7cGFkZGluZy1yaWdodDoxNnB4fS5iYWMtLWhlYWRlci1hcHBzIC5iYWMtLWNvbnRhaW5lcntoZWlnaHQ6MTAwJTtkaXNwbGF5OmZsZXg7YWxpZ24taXRlbXM6Y2VudGVyO2p1c3RpZnktY29udGVudDpzcGFjZS1iZXR3ZWVufS5iYWMtLWhlYWRlci1zZWFyY2h7cG9zaXRpb246cmVsYXRpdmV9LmJhYy0taGVhZGVyLXNlYXJjaCBpbnB1dHtjb2xvcjojZmZmO2ZvbnQtc2l6ZToxNHB4O2hlaWdodDozNXB4O2JhY2tncm91bmQtY29sb3I6IzZiNzU4NjtwYWRkaW5nOjAgNXB4IDAgMTBweDtib3JkZXI6bm9uZTtib3JkZXItcmFkaXVzOjNweDttaW4td2lkdGg6NDAwcHg7d2lkdGg6MTAwJX0uYmFjLS1oZWFkZXItc2VhcmNoIGlucHV0OmZvY3Vze291dGxpbmU6bm9uZX0uYmFjLS1oZWFkZXItc2VhcmNoIGlucHV0Ojotd2Via2l0LWlucHV0LXBsYWNlaG9sZGVye2ZvbnQtc3R5bGU6bm9ybWFsICFpbXBvcnRhbnQ7dGV4dC1hbGlnbjpjZW50ZXI7Y29sb3I6I2ZmZjtmb250LXNpemU6MTRweDtmb250LXdlaWdodDozMDA7bGV0dGVyLXNwYWNpbmc6MC41cHh9LmJhYy0taGVhZGVyLXNlYXJjaCBpbnB1dDo6LW1vei1wbGFjZWhvbGRlcntmb250LXN0eWxlOm5vcm1hbCAhaW1wb3J0YW50O3RleHQtYWxpZ246Y2VudGVyO2NvbG9yOiNmZmY7Zm9udC1zaXplOjE0cHg7Zm9udC13ZWlnaHQ6MzAwO2xldHRlci1zcGFjaW5nOjAuNXB4fS5iYWMtLWhlYWRlci1zZWFyY2ggaW5wdXQ6LW1zLWlucHV0LXBsYWNlaG9sZGVye2ZvbnQtc3R5bGU6bm9ybWFsICFpbXBvcnRhbnQ7dGV4dC1hbGlnbjpjZW50ZXI7Y29sb3I6I2ZmZjtmb250LXNpemU6MTRweDtmb250LXdlaWdodDozMDA7bGV0dGVyLXNwYWNpbmc6MC41cHh9LmJhYy0taGVhZGVyLXNlYXJjaCBpe3Bvc2l0aW9uOmFic29sdXRlO3RvcDo4cHg7cmlnaHQ6MTBweH0uYmFjLS11c2VyLWFjdGlvbnN7ZGlzcGxheTpmbGV4O2FsaWduLWl0ZW1zOmNlbnRlcn0uYmFjLS11c2VyLWFjdGlvbnMgI2JhYy0tcHVyZXNkay1hcHBzLXNlY3Rpb24tLXtib3JkZXItcmlnaHQ6MXB4IHNvbGlkICNhZGFkYWQ7aGVpZ2h0OjQwcHg7cGFkZGluZy10b3A6MTNweH0uYmFjLS11c2VyLWFjdGlvbnMgI2JhYy0tcHVyZXNkay1hcHBzLXNlY3Rpb24tLSBhLmJhYy0tcHVyZXNkay1hcHBzLW9uLW5hdmJhci0te2NvbG9yOiMzMzMzMzM7dGV4dC1kZWNvcmF0aW9uOm5vbmU7bWFyZ2luLXJpZ2h0OjE2cHg7Zm9udC1zaXplOjEzcHg7ZGlzcGxheTppbmxpbmUtYmxvY2s7cGFkZGluZzo2cHggMTZweDtiYWNrZ3JvdW5kLWNvbG9yOnJnYmEoMjU1LDI1NSwyNTUsMC43NSk7cG9zaXRpb246cmVsYXRpdmU7dG9wOi02cHg7Ym9yZGVyLXJhZGl1czo0cHh9LmJhYy0tdXNlci1hY3Rpb25zICNiYWMtLXB1cmVzZGstYXBwcy1zZWN0aW9uLS0gYS5iYWMtLXB1cmVzZGstYXBwcy1vbi1uYXZiYXItLS5kaXNhYmxlZHtwb2ludGVyLWV2ZW50czpub25lO2N1cnNvcjpub25lO2NvbG9yOiNhZGFkYWR9LmJhYy0tdXNlci1hY3Rpb25zICNiYWMtLXB1cmVzZGstYXBwcy1zZWN0aW9uLS0gYS5iYWMtLXB1cmVzZGstYXBwcy1vbi1uYXZiYXItLS5zZWxlY3RlZHtwb2ludGVyLWV2ZW50czpub25lO2JhY2tncm91bmQtY29sb3I6I2ZmZjtib3JkZXI6MXB4IHNvbGlkICMzMzMzMzN9LmJhYy0tdXNlci1hY3Rpb25zICNiYWMtLXB1cmVzZGstYXBwcy1zZWN0aW9uLS0gYS5iYWMtLXB1cmVzZGstYXBwcy1vbi1uYXZiYXItLTpob3ZlcntiYWNrZ3JvdW5kLWNvbG9yOnJnYmEoMjU1LDI1NSwyNTUsMC45KX0uYmFjLS11c2VyLWFjdGlvbnMgI2JhYy0tcHVyZXNkay1hcHBzLXNlY3Rpb24tLSBhLmJhYy0tcHVyZXNkay1hcHBzLW9uLW5hdmJhci0tIHN2Z3ttYXJnaW4tcmlnaHQ6NnB4fS5iYWMtLXVzZXItYWN0aW9ucyAuYmFjLS11c2VyLW5vdGlmaWNhdGlvbnN7cG9zaXRpb246cmVsYXRpdmV9LmJhYy0tdXNlci1hY3Rpb25zIC5iYWMtLXVzZXItbm90aWZpY2F0aW9ucyBpe2ZvbnQtc2l6ZToyMHB4fS5iYWMtLXVzZXItYWN0aW9ucyAjYmFjLS1wdXJlc2RrLS1sb2FkZXItLXtkaXNwbGF5Om5vbmV9LmJhYy0tdXNlci1hY3Rpb25zICNiYWMtLXB1cmVzZGstLWxvYWRlci0tLmJhYy0tcHVyZXNkay12aXNpYmxle2Rpc3BsYXk6YmxvY2t9LmJhYy0tdXNlci1hY3Rpb25zIC5iYWMtLXVzZXItbm90aWZpY2F0aW9ucy1jb3VudHtwb3NpdGlvbjphYnNvbHV0ZTtkaXNwbGF5OmlubGluZS1ibG9jaztoZWlnaHQ6MTVweDt3aWR0aDoxNXB4O2xpbmUtaGVpZ2h0OjE1cHg7Y29sb3I6I2ZmZjtmb250LXNpemU6MTBweDt0ZXh0LWFsaWduOmNlbnRlcjtiYWNrZ3JvdW5kLWNvbG9yOiNmYzNiMzA7Ym9yZGVyLXJhZGl1czo1MCU7dG9wOi01cHg7bGVmdDotNXB4fS5iYWMtLXVzZXItYWN0aW9ucyAuYmFjLS11c2VyLWF2YXRhciwuYmFjLS11c2VyLWFjdGlvbnMgLmJhYy0tdXNlci1ub3RpZmljYXRpb25ze21hcmdpbi1sZWZ0OjIwcHh9LmJhYy0tdXNlci1hY3Rpb25zIC5iYWMtLXVzZXItYXZhdGFye3Bvc2l0aW9uOnJlbGF0aXZlO292ZXJmbG93OmhpZGRlbjtib3JkZXItcmFkaXVzOjUwJX0uYmFjLS11c2VyLWFjdGlvbnMgLmJhYy0tdXNlci1hdmF0YXIgI2JhYy0taW1hZ2UtY29udGFpbmVyLXRvcHt3aWR0aDoxMDAlO2hlaWd0aDoxMDAlO3Bvc2l0aW9uOmFic29sdXRlO3RvcDowO2xlZnQ6MDt6LWluZGV4OjE7ZGlzcGxheTpub25lfS5iYWMtLXVzZXItYWN0aW9ucyAuYmFjLS11c2VyLWF2YXRhciAjYmFjLS1pbWFnZS1jb250YWluZXItdG9wIGltZ3t3aWR0aDoxMDAlO2hlaWdodDoxMDAlO2N1cnNvcjpwb2ludGVyfS5iYWMtLXVzZXItYWN0aW9ucyAuYmFjLS11c2VyLWF2YXRhciAjYmFjLS1pbWFnZS1jb250YWluZXItdG9wLmJhYy0tcHVyZXNkay12aXNpYmxle2Rpc3BsYXk6YmxvY2t9LmJhYy0tdXNlci1hY3Rpb25zIC5iYWMtLXVzZXItYXZhdGFyLW5hbWV7Y29sb3I6I2ZmZjtiYWNrZ3JvdW5kLWNvbG9yOiNhZGFkYWQ7ZGlzcGxheTppbmxpbmUtYmxvY2s7aGVpZ2h0OjM1cHg7d2lkdGg6MzVweDtsaW5lLWhlaWdodDozNXB4O3RleHQtYWxpZ246Y2VudGVyO2ZvbnQtc2l6ZToxNHB4fS5iYWMtLXVzZXItYXBwc3twb3NpdGlvbjpyZWxhdGl2ZX0jYmFjLS1wdXJlc2RrLWFwcHMtaWNvbi0te3dpZHRoOjIwcHg7ZGlzcGxheTppbmxpbmUtYmxvY2s7dGV4dC1hbGlnbjpjZW50ZXI7Zm9udC1zaXplOjE2cHh9LmJhYy0tcHVyZXNkay1hcHBzLW5hbWUtLXtmb250LXNpemU6OXB4O3dpZHRoOjIwcHg7dGV4dC1hbGlnbjpjZW50ZXJ9I2JhYy0tcHVyZXNkay11c2VyLWJ1c2luZXNzZXMtLXtoZWlnaHQ6Y2FsYygxMDB2aCAtIDI5NnB4KTtvdmVyZmxvdzphdXRvfS5iYWMtLWFwcHMtY29udGFpbmVye2JhY2tncm91bmQ6I2ZmZjtwb3NpdGlvbjphYnNvbHV0ZTt0b3A6NDVweDtyaWdodDowcHg7ZGlzcGxheTpmbGV4O3dpZHRoOjMwMHB4O2ZsZXgtd3JhcDp3cmFwO2JvcmRlci1yYWRpdXM6MTBweDtwYWRkaW5nOjE1cHg7cGFkZGluZy1yaWdodDowO2p1c3RpZnktY29udGVudDpzcGFjZS1iZXR3ZWVuO3RleHQtYWxpZ246bGVmdDstd2Via2l0LWJveC1zaGFkb3c6MCAwIDEwcHggMnB4IHJnYmEoMCwwLDAsMC4yKTtib3gtc2hhZG93OjAgMCAxMHB4IDJweCByZ2JhKDAsMCwwLDAuMik7b3BhY2l0eTowO3Zpc2liaWxpdHk6aGlkZGVuO3RyYW5zaXRpb246YWxsIDAuNHMgZWFzZTttYXgtaGVpZ2h0OjUwMHB4fS5iYWMtLWFwcHMtY29udGFpbmVyICNiYWMtLWFwcy1hY3R1YWwtY29udGFpbmVye2hlaWdodDoxMDAlO292ZXJmbG93OnNjcm9sbDttYXgtaGVpZ2h0OjQ3NXB4O3dpZHRoOjEwMCV9LmJhYy0tYXBwcy1jb250YWluZXIuYWN0aXZle29wYWNpdHk6MTt2aXNpYmlsaXR5OnZpc2libGV9LmJhYy0tYXBwcy1jb250YWluZXI6YmVmb3Jle2NvbnRlbnQ6XCJcIjt2ZXJ0aWNhbC1hbGlnbjptaWRkbGU7bWFyZ2luOmF1dG87cG9zaXRpb246YWJzb2x1dGU7ZGlzcGxheTpibG9jaztsZWZ0OjA7cmlnaHQ6LTE4NXB4O2JvdHRvbTpjYWxjKDEwMCUgLSA2cHgpO3dpZHRoOjEycHg7aGVpZ2h0OjEycHg7dHJhbnNmb3JtOnJvdGF0ZSg0NWRlZyk7YmFja2dyb3VuZC1jb2xvcjojZmZmfS5iYWMtLWFwcHMtY29udGFpbmVyIC5iYWMtLWFwcHN7d2lkdGg6MTAwJTtmb250LXNpemU6MjBweDttYXJnaW4tYm90dG9tOjE1cHg7dGV4dC1hbGlnbjpsZWZ0O2hlaWdodDozM3B4fS5iYWMtLWFwcHMtY29udGFpbmVyIC5iYWMtLWFwcHM6bGFzdC1jaGlsZHttYXJnaW4tYm90dG9tOjB9LmJhYy0tYXBwcy1jb250YWluZXIgLmJhYy0tYXBwczpob3ZlcntiYWNrZ3JvdW5kOiNmM2YzZjN9LmJhYy0tYXBwcy1jb250YWluZXIgLmJhYy0tYXBwcyBhLmJhYy0taW1hZ2UtbGlua3tkaXNwbGF5OmlubGluZS1ibG9jaztjb2xvcjojZmZmO3RleHQtZGVjb3JhdGlvbjpub25lO3dpZHRoOjMzcHg7aGVpZ2h0OjMzcHh9LmJhYy0tYXBwcy1jb250YWluZXIgLmJhYy0tYXBwcyBhLmJhYy0taW1hZ2UtbGluayBpbWd7d2lkdGg6MTAwJTtoZWlnaHQ6MTAwJX0uYmFjLS1hcHBzLWNvbnRhaW5lciAuYmFjLS1hcHBzIC5iYWMtLXB1cmVzZGstYXBwLXRleHQtY29udGFpbmVye2Rpc3BsYXk6aW5saW5lLWJsb2NrO3Bvc2l0aW9uOnJlbGF0aXZlO2xlZnQ6LTJweDt3aWR0aDpjYWxjKDEwMCUgLSA0MnB4KX0uYmFjLS1hcHBzLWNvbnRhaW5lciAuYmFjLS1hcHBzIC5iYWMtLXB1cmVzZGstYXBwLXRleHQtY29udGFpbmVyIGF7ZGlzcGxheTpibG9jazt0ZXh0LWRlY29yYXRpb246bm9uZTtjdXJzb3I6cG9pbnRlcjtwYWRkaW5nLWxlZnQ6OHB4fS5iYWMtLWFwcHMtY29udGFpbmVyIC5iYWMtLWFwcHMgLmJhYy0tcHVyZXNkay1hcHAtdGV4dC1jb250YWluZXIgLmJhYy0tYXBwLW5hbWV7d2lkdGg6MTAwJTtjb2xvcjojMDAwO2ZvbnQtc2l6ZToxM3B4O3BhZGRpbmctYm90dG9tOjRweH0uYmFjLS1hcHBzLWNvbnRhaW5lciAuYmFjLS1hcHBzIC5iYWMtLXB1cmVzZGstYXBwLXRleHQtY29udGFpbmVyIC5iYWMtLWFwcC1kZXNjcmlwdGlvbntjb2xvcjojOTE5MTkxO2ZvbnQtc2l6ZToxMXB4O2ZvbnQtc3R5bGU6aXRhbGljO2xpbmUtaGVpZ2h0OjEuM2VtO3Bvc2l0aW9uOnJlbGF0aXZlO3RvcDotMnB4O292ZXJmbG93OmhpZGRlbjt3aGl0ZS1zcGFjZTpub3dyYXA7dGV4dC1vdmVyZmxvdzplbGxpcHNpc30uYmFjLS11c2VyLXNpZGViYXJ7YmFja2dyb3VuZDp3aGl0ZTtmb250LWZhbWlseTpcIlZlcmRhbmFcIiwgYXJpYWwsIHNhbnMtc2VyaWY7Y29sb3I6IzMzMzMzMztoZWlnaHQ6Y2FsYygxMDB2aCAtIDUwcHgpO2JveC1zaXppbmc6Ym9yZGVyLWJveDt3aWR0aDozMjBweDtwb3NpdGlvbjpmaXhlZDt0b3A6NTBweDtyaWdodDowO3otaW5kZXg6OTk5OTk5O29wYWNpdHk6MDt0cmFuc2Zvcm06dHJhbnNsYXRlWCgxMDAlKTt0cmFuc2l0aW9uOmFsbCAwLjRzIGVhc2V9LmJhYy0tdXNlci1zaWRlYmFyIC5iYWMtLXVzZXItc2lkZWJhci13aGl0ZS1iZ3t3aWR0aDoxMDAlO2hlaWdodDoxMDAlfS5iYWMtLXVzZXItc2lkZWJhci5hY3RpdmV7b3BhY2l0eToxO3RyYW5zZm9ybTp0cmFuc2xhdGVYKDAlKTstd2Via2l0LWJveC1zaGFkb3c6LTFweCAwcHggMTJweCAwcHggcmdiYSgwLDAsMCwwLjc1KTstbW96LWJveC1zaGFkb3c6LTFweCAzcHggMTJweCAwcHggcmdiYSgwLDAsMCwwLjc1KTtib3gtc2hhZG93Oi0xcHggMHB4IDEycHggMHB4IHJnYmEoMCwwLDAsMC43NSl9LmJhYy0tdXNlci1zaWRlYmFyIC5iYWMtLXVzZXItbGlzdC1pdGVte2Rpc3BsYXk6ZmxleDtwb3NpdGlvbjpyZWxhdGl2ZTtjdXJzb3I6cG9pbnRlcjthbGlnbi1pdGVtczpjZW50ZXI7cGFkZGluZzoxMHB4IDEwcHggMTBweCA0MHB4O2JvcmRlci1ib3R0b206MXB4IHNvbGlkIHdoaXRlfS5iYWMtLXVzZXItc2lkZWJhciAuYmFjLS11c2VyLWxpc3QtaXRlbTpob3ZlcntiYWNrZ3JvdW5kLWNvbG9yOnJnYmEoMjU1LDI1NSwyNTUsMC4xKX0uYmFjLS11c2VyLXNpZGViYXIgLmJhYy0tdXNlci1saXN0LWl0ZW0gLmJhYy0tc2VsZWN0ZWQtYWNvdW50LWluZGljYXRvcntwb3NpdGlvbjphYnNvbHV0ZTtyaWdodDowO2hlaWdodDoxMDAlO3dpZHRoOjhweDtiYWNrZ3JvdW5kOiMzMzMzMzN9LmJhYy0tdXNlci1zaWRlYmFyIC5iYWMtLXVzZXItbGlzdC1pdGVtIC5iYWMtLXVzZXItbGlzdC1pdGVtLWltYWdle3dpZHRoOjQwcHg7aGVpZ2h0OjQwcHg7Ym9yZGVyLXJhZGl1czozcHg7Ym9yZGVyOjFweCBzb2xpZCAjMzMzMzMzO292ZXJmbG93OmhpZGRlbjttYXJnaW4tcmlnaHQ6MjBweDtkaXNwbGF5OmZsZXg7YWxpZ24taXRlbXM6Y2VudGVyO2p1c3RpZnktY29udGVudDpjZW50ZXJ9LmJhYy0tdXNlci1zaWRlYmFyIC5iYWMtLXVzZXItbGlzdC1pdGVtIC5iYWMtLXVzZXItbGlzdC1pdGVtLWltYWdlPmltZ3t3aWR0aDphdXRvO2hlaWdodDphdXRvO21heC13aWR0aDoxMDAlO21heC1oZWlnaHQ6MTAwJX0uYmFjLS11c2VyLXNpZGViYXIgLmJhYy0tdXNlci1saXN0LWl0ZW0gc3Bhbnt3aWR0aDoxMDAlO2Rpc3BsYXk6YmxvY2s7bWFyZ2luLWJvdHRvbTo1cHh9LmJhYy0tdXNlci1zaWRlYmFyIC5iYWMtdXNlci1hcHAtZGV0YWlscyBzcGFue2ZvbnQtc2l6ZToxMnB4fS5iYWMtLXVzZXItc2lkZWJhciAucHVyZXNkay12ZXJzaW9uLW51bWJlcnt3aWR0aDoxMDAlO3RleHQtYWxpZ246cmlnaHQ7cGFkZGluZy1yaWdodDoxMHB4O3Bvc2l0aW9uOmFic29sdXRlO2ZvbnQtc2l6ZTo4cHg7b3BhY2l0eTowLjU7cmlnaHQ6MDtib3R0b206MH0uYmFjLS11c2VyLXNpZGViYXItaW5mb3tkaXNwbGF5OmZsZXg7anVzdGlmeS1jb250ZW50OmNlbnRlcjtmbGV4LXdyYXA6d3JhcDt0ZXh0LWFsaWduOmNlbnRlcjtwYWRkaW5nOjIwcHggMjBweCAxNXB4fS5iYWMtLXVzZXItc2lkZWJhci1pbmZvIC5iYWMtLXVzZXItaW1hZ2V7Ym9yZGVyOjFweCAjYWRhZGFkIHNvbGlkO292ZXJmbG93OmhpZGRlbjtib3JkZXItcmFkaXVzOjUwJTtwb3NpdGlvbjpyZWxhdGl2ZTtjdXJzb3I6cG9pbnRlcjtkaXNwbGF5OmlubGluZS1ibG9jaztoZWlnaHQ6ODBweDt3aWR0aDo4MHB4O2xpbmUtaGVpZ2h0OjgwcHg7dGV4dC1hbGlnbjpjZW50ZXI7Y29sb3I6I2ZmZjtib3JkZXItcmFkaXVzOjUwJTtiYWNrZ3JvdW5kLWNvbG9yOiNhZGFkYWQ7bWFyZ2luLWJvdHRvbToxNXB4fS5iYWMtLXVzZXItc2lkZWJhci1pbmZvIC5iYWMtLXVzZXItaW1hZ2UgI2JhYy0tdXNlci1pbWFnZS1maWxle2Rpc3BsYXk6bm9uZTtwb3NpdGlvbjphYnNvbHV0ZTt6LWluZGV4OjE7dG9wOjA7bGVmdDowO3dpZHRoOjEwMCU7aGVpZ2h0OjEwMCV9LmJhYy0tdXNlci1zaWRlYmFyLWluZm8gLmJhYy0tdXNlci1pbWFnZSAjYmFjLS11c2VyLWltYWdlLWZpbGUgaW1ne3dpZHRoOjEwMCU7aGVpZ2h0OjEwMCV9LmJhYy0tdXNlci1zaWRlYmFyLWluZm8gLmJhYy0tdXNlci1pbWFnZSAjYmFjLS11c2VyLWltYWdlLWZpbGUuYmFjLS1wdXJlc2RrLXZpc2libGV7ZGlzcGxheTpibG9ja30uYmFjLS11c2VyLXNpZGViYXItaW5mbyAuYmFjLS11c2VyLWltYWdlICNiYWMtLXVzZXItaW1hZ2UtdXBsb2FkLXByb2dyZXNze3Bvc2l0aW9uOmFic29sdXRlO3BhZGRpbmctdG9wOjEwcHg7dG9wOjA7YmFja2dyb3VuZDojNjY2O3otaW5kZXg6NDtkaXNwbGF5Om5vbmU7d2lkdGg6MTAwJTtoZWlnaHQ6MTAwJX0uYmFjLS11c2VyLXNpZGViYXItaW5mbyAuYmFjLS11c2VyLWltYWdlICNiYWMtLXVzZXItaW1hZ2UtdXBsb2FkLXByb2dyZXNzLmJhYy0tcHVyZXNkay12aXNpYmxle2Rpc3BsYXk6YmxvY2t9LmJhYy0tdXNlci1zaWRlYmFyLWluZm8gLmJhYy0tdXNlci1pbWFnZSBpe2ZvbnQtc2l6ZTozMnB4O2ZvbnQtc2l6ZTozMnB4O3otaW5kZXg6MDtwb3NpdGlvbjphYnNvbHV0ZTt3aWR0aDoxMDAlO2xlZnQ6MDtiYWNrZ3JvdW5kLWNvbG9yOnJnYmEoMCwwLDAsMC41KX0uYmFjLS11c2VyLXNpZGViYXItaW5mbyAuYmFjLS11c2VyLWltYWdlOmhvdmVyIGl7ei1pbmRleDozfS5iYWMtLXVzZXItc2lkZWJhci1pbmZvIC5iYWMtLXVzZXItbmFtZXt3aWR0aDoxMDAlO3RleHQtYWxpZ246Y2VudGVyO2ZvbnQtc2l6ZToxOHB4O21hcmdpbi1ib3R0b206MTBweH0uYmFjLS11c2VyLXNpZGViYXItaW5mbyAuYmFjLS11c2VyLWVtYWlse2ZvbnQtc2l6ZToxMnB4O2ZvbnQtd2VpZ2h0OjMwMH0uYmFjLS11c2VyLWFjY291bnQtc2V0dGluZ3N7cG9zaXRpb246YWJzb2x1dGU7Ym90dG9tOjEwcHg7bGVmdDoyMHB4O3dpZHRoOjkwJTtoZWlnaHQ6MTBweH0jYmFjLS1wdXJlc2RrLWFjY291bnQtbG9nby0te2N1cnNvcjpwb2ludGVyO3Bvc2l0aW9uOnJlbGF0aXZlO2NvbG9yOiNmZmZ9I2JhYy0tcHVyZXNkay1hY2NvdW50LWxvZ28tLSBpbWd7aGVpZ2h0OjI4cHg7dG9wOjNweDtwb3NpdGlvbjpyZWxhdGl2ZX0jYmFjLS1pbmZvLWJsb2Nrcy13cmFwcGVyLS17cG9zaXRpb246Zml4ZWQ7dG9wOjBweDtoZWlnaHQ6YXV0b30jYmFjLS1pbmZvLWJsb2Nrcy13cmFwcGVyLS0gLmJhYy0tcHVyZXNkay1pbmZvLWJveC0te2JvcmRlci1yYWRpdXM6MCAwIDNweCAzcHg7b3ZlcmZsb3c6aGlkZGVuO3otaW5kZXg6OTk5OTk5OTk7cG9zaXRpb246cmVsYXRpdmU7bWFyZ2luLXRvcDowO3dpZHRoOjQ3MHB4O2xlZnQ6Y2FsYyg1MHZ3IC0gMjM1cHgpO2hlaWdodDowcHg7LXdlYmtpdC10cmFuc2l0aW9uOnRvcCAwLjRzO3RyYW5zaXRpb246YWxsIDAuNHN9I2JhYy0taW5mby1ibG9ja3Mtd3JhcHBlci0tIC5iYWMtLXB1cmVzZGstaW5mby1ib3gtLS5iYWMtLXN1Y2Nlc3N7YmFja2dyb3VuZDojMTREQTlFfSNiYWMtLWluZm8tYmxvY2tzLXdyYXBwZXItLSAuYmFjLS1wdXJlc2RrLWluZm8tYm94LS0uYmFjLS1zdWNjZXNzIC5iYWMtLWlubmVyLWluZm8tYm94LS0gZGl2LmJhYy0taW5mby1pY29uLS0uZmEtc3VjY2Vzc3tkaXNwbGF5OmlubGluZS1ibG9ja30jYmFjLS1pbmZvLWJsb2Nrcy13cmFwcGVyLS0gLmJhYy0tcHVyZXNkay1pbmZvLWJveC0tLmJhYy0taW5mb3tiYWNrZ3JvdW5kLWNvbG9yOiM1QkMwREV9I2JhYy0taW5mby1ibG9ja3Mtd3JhcHBlci0tIC5iYWMtLXB1cmVzZGstaW5mby1ib3gtLS5iYWMtLWluZm8gLmJhYy0taW5uZXItaW5mby1ib3gtLSBkaXYuYmFjLS1pbmZvLWljb24tLS5mYS1pbmZvLTF7ZGlzcGxheTppbmxpbmUtYmxvY2t9I2JhYy0taW5mby1ibG9ja3Mtd3JhcHBlci0tIC5iYWMtLXB1cmVzZGstaW5mby1ib3gtLS5iYWMtLXdhcm5pbmd7YmFja2dyb3VuZDojRjBBRDRFfSNiYWMtLWluZm8tYmxvY2tzLXdyYXBwZXItLSAuYmFjLS1wdXJlc2RrLWluZm8tYm94LS0uYmFjLS13YXJuaW5nIC5iYWMtLWlubmVyLWluZm8tYm94LS0gZGl2LmJhYy0taW5mby1pY29uLS0uZmEtd2FybmluZ3tkaXNwbGF5OmlubGluZS1ibG9ja30jYmFjLS1pbmZvLWJsb2Nrcy13cmFwcGVyLS0gLmJhYy0tcHVyZXNkay1pbmZvLWJveC0tLmJhYy0tZXJyb3J7YmFja2dyb3VuZDojRUY0MTAwfSNiYWMtLWluZm8tYmxvY2tzLXdyYXBwZXItLSAuYmFjLS1wdXJlc2RrLWluZm8tYm94LS0uYmFjLS1lcnJvciAuYmFjLS1pbm5lci1pbmZvLWJveC0tIGRpdi5iYWMtLWluZm8taWNvbi0tLmZhLWVycm9ye2Rpc3BsYXk6aW5saW5lLWJsb2NrfSNiYWMtLWluZm8tYmxvY2tzLXdyYXBwZXItLSAuYmFjLS1wdXJlc2RrLWluZm8tYm94LS0gLmJhYy0tdGltZXJ7LXdlYmtpdC10cmFuc2l0aW9uLXRpbWluZy1mdW5jdGlvbjpsaW5lYXI7dHJhbnNpdGlvbi10aW1pbmctZnVuY3Rpb246bGluZWFyO3Bvc2l0aW9uOmFic29sdXRlO2JvdHRvbTowcHg7b3BhY2l0eTowLjU7aGVpZ2h0OjJweCAhaW1wb3J0YW50O2JhY2tncm91bmQ6d2hpdGU7d2lkdGg6MCV9I2JhYy0taW5mby1ibG9ja3Mtd3JhcHBlci0tIC5iYWMtLXB1cmVzZGstaW5mby1ib3gtLSAuYmFjLS10aW1lci5iYWMtLWZ1bGx3aWR0aHt3aWR0aDoxMDAlfSNiYWMtLWluZm8tYmxvY2tzLXdyYXBwZXItLSAuYmFjLS1wdXJlc2RrLWluZm8tYm94LS0uYmFjLS1hY3RpdmUtLXtoZWlnaHQ6YXV0bzttYXJnaW4tdG9wOjVweH0jYmFjLS1pbmZvLWJsb2Nrcy13cmFwcGVyLS0gLmJhYy0tcHVyZXNkay1pbmZvLWJveC0tIC5iYWMtLWlubmVyLWluZm8tYm94LS17d2lkdGg6MTAwJTtwYWRkaW5nOjExcHggMTVweDtjb2xvcjp3aGl0ZX0jYmFjLS1pbmZvLWJsb2Nrcy13cmFwcGVyLS0gLmJhYy0tcHVyZXNkay1pbmZvLWJveC0tIC5iYWMtLWlubmVyLWluZm8tYm94LS0gZGl2e2Rpc3BsYXk6aW5saW5lLWJsb2NrO2hlaWdodDoxOHB4O3Bvc2l0aW9uOnJlbGF0aXZlfSNiYWMtLWluZm8tYmxvY2tzLXdyYXBwZXItLSAuYmFjLS1wdXJlc2RrLWluZm8tYm94LS0gLmJhYy0taW5uZXItaW5mby1ib3gtLSBkaXYuYmFjLS1pbmZvLWljb24tLXtkaXNwbGF5Om5vbmU7dG9wOjBweH0jYmFjLS1pbmZvLWJsb2Nrcy13cmFwcGVyLS0gLmJhYy0tcHVyZXNkay1pbmZvLWJveC0tIC5iYWMtLWlubmVyLWluZm8tYm94LS0gLmJhYy0taW5mby1pY29uLS17bWFyZ2luLXJpZ2h0OjE1cHg7d2lkdGg6MTBweDt0b3A6MnB4fSNiYWMtLWluZm8tYmxvY2tzLXdyYXBwZXItLSAuYmFjLS1wdXJlc2RrLWluZm8tYm94LS0gLmJhYy0taW5uZXItaW5mby1ib3gtLSAuYmFjLS1pbmZvLW1haW4tdGV4dC0te3dpZHRoOjM4MHB4O21hcmdpbi1yaWdodDoxNXB4O2ZvbnQtc2l6ZToxMnB4O3RleHQtYWxpZ246Y2VudGVyfSNiYWMtLWluZm8tYmxvY2tzLXdyYXBwZXItLSAuYmFjLS1wdXJlc2RrLWluZm8tYm94LS0gLmJhYy0taW5uZXItaW5mby1ib3gtLSAuYmFjLS1pbmZvLWNsb3NlLWJ1dHRvbi0te3dpZHRoOjEwcHg7Y3Vyc29yOnBvaW50ZXI7dG9wOjJweH1AbWVkaWEgKG1pbi13aWR0aDogNjAwcHgpey5iYWMtLWNvbnRhaW5lci5iYWMtLWZ1bGx3aWR0aCAuYmFjLS1jb250YWluZXJ7cGFkZGluZy1sZWZ0OjI0cHg7cGFkZGluZy1yaWdodDoyNHB4fX1AbWVkaWEgKG1pbi13aWR0aDogOTYwcHgpey5iYWMtLWNvbnRhaW5lci5iYWMtLWZ1bGx3aWR0aCAuYmFjLS1jb250YWluZXJ7cGFkZGluZy1sZWZ0OjMycHg7cGFkZGluZy1yaWdodDozMnB4fX0uYmFjLS1jdXN0b20tbW9kYWx7cG9zaXRpb246Zml4ZWQ7d2lkdGg6NzAlO2hlaWdodDo4MCU7bWluLXdpZHRoOjQwMHB4O2xlZnQ6MDtyaWdodDowO3RvcDowO2JvdHRvbTowO21hcmdpbjphdXRvO2JvcmRlcjoxcHggc29saWQgIzk3OTc5Nztib3JkZXItcmFkaXVzOjVweDtib3gtc2hhZG93OjAgMCA3MXB4IDAgIzJGMzg0OTtiYWNrZ3JvdW5kOiNmZmY7ei1pbmRleDo5OTk7b3ZlcmZsb3c6YXV0bztkaXNwbGF5Om5vbmV9LmJhYy0tY3VzdG9tLW1vZGFsLmlzLW9wZW57ZGlzcGxheTpibG9ja30uYmFjLS1jdXN0b20tbW9kYWwgLmN1c3RvbS1tb2RhbF9fY2xvc2UtYnRue3RleHQtZGVjb3JhdGlvbjpub25lO3BhZGRpbmctdG9wOjJweDtsaW5lLWhlaWdodDoxOHB4O2hlaWdodDoyMHB4O3dpZHRoOjIwcHg7Ym9yZGVyLXJhZGl1czo1MCU7Y29sb3I6IzkwOWJhNDt0ZXh0LWFsaWduOmNlbnRlcjtwb3NpdGlvbjphYnNvbHV0ZTt0b3A6MjBweDtyaWdodDoyMHB4O2ZvbnQtc2l6ZToyMHB4fS5iYWMtLWN1c3RvbS1tb2RhbCAuY3VzdG9tLW1vZGFsX19jbG9zZS1idG46aG92ZXJ7dGV4dC1kZWNvcmF0aW9uOm5vbmU7Y29sb3I6IzQ1NTA2NjtjdXJzb3I6cG9pbnRlcn0uYmFjLS1jdXN0b20tbW9kYWwgLmN1c3RvbS1tb2RhbF9fd3JhcHBlcntoZWlnaHQ6MTAwJTtkaXNwbGF5OmZsZXg7ZmxleC1kaXJlY3Rpb246Y29sdW1ufS5iYWMtLWN1c3RvbS1tb2RhbCAuY3VzdG9tLW1vZGFsX193cmFwcGVyIGlmcmFtZXt3aWR0aDoxMDAlO2hlaWdodDoxMDAlfS5iYWMtLWN1c3RvbS1tb2RhbCAuY3VzdG9tLW1vZGFsX19jb250ZW50LXdyYXBwZXJ7aGVpZ2h0OjEwMCU7b3ZlcmZsb3c6YXV0bzttYXJnaW4tYm90dG9tOjEwNHB4O2JvcmRlci10b3A6MnB4IHNvbGlkICNDOUNERDd9LmJhYy0tY3VzdG9tLW1vZGFsIC5jdXN0b20tbW9kYWxfX2NvbnRlbnQtd3JhcHBlci5uby1tYXJnaW57bWFyZ2luLWJvdHRvbTowfS5iYWMtLWN1c3RvbS1tb2RhbCAuY3VzdG9tLW1vZGFsX19jb250ZW50e3BhZGRpbmc6MjBweDtwb3NpdGlvbjpyZWxhdGl2ZX0uYmFjLS1jdXN0b20tbW9kYWwgLmN1c3RvbS1tb2RhbF9fY29udGVudCBoM3tjb2xvcjojMkYzODQ5O2ZvbnQtc2l6ZToyMHB4O2ZvbnQtd2VpZ2h0OjYwMDtsaW5lLWhlaWdodDoyN3B4fS5iYWMtLWN1c3RvbS1tb2RhbCAuY3VzdG9tLW1vZGFsX19zYXZle3Bvc2l0aW9uOmFic29sdXRlO3JpZ2h0OjA7Ym90dG9tOjA7d2lkdGg6MTAwJTtwYWRkaW5nOjMwcHggMzJweDtiYWNrZ3JvdW5kLWNvbG9yOiNGMkYyRjR9LmJhYy0tY3VzdG9tLW1vZGFsIC5jdXN0b20tbW9kYWxfX3NhdmUgYSwuYmFjLS1jdXN0b20tbW9kYWwgLmN1c3RvbS1tb2RhbF9fc2F2ZSBidXR0b257Zm9udC1zaXplOjE0cHg7bGluZS1oZWlnaHQ6MjJweDtoZWlnaHQ6NDRweDt3aWR0aDoxMDAlfS5iYWMtLWN1c3RvbS1tb2RhbCAuY3VzdG9tLW1vZGFsX19zcGxpdHRlcntoZWlnaHQ6MzBweDtsaW5lLWhlaWdodDozMHB4O3BhZGRpbmc6MCAyMHB4O2JvcmRlci1jb2xvcjojRDNEM0QzO2JvcmRlci1zdHlsZTpzb2xpZDtib3JkZXItd2lkdGg6MXB4IDAgMXB4IDA7YmFja2dyb3VuZC1jb2xvcjojRjBGMEYwO2NvbG9yOiM2NzZGODI7Zm9udC1zaXplOjEzcHg7Zm9udC13ZWlnaHQ6NjAwfS5iYWMtLWN1c3RvbS1tb2RhbCAuY3VzdG9tLW1vZGFsX19ib3h7ZGlzcGxheTppbmxpbmUtYmxvY2s7dmVydGljYWwtYWxpZ246bWlkZGxlO2hlaWdodDoxNjVweDt3aWR0aDoxNjVweDtib3JkZXI6MnB4IHNvbGlkIHJlZDtib3JkZXItcmFkaXVzOjVweDt0ZXh0LWFsaWduOmNlbnRlcjtmb250LXNpemU6MTJweDtmb250LXdlaWdodDo2MDA7Y29sb3I6IzkwOTdBODt0ZXh0LWRlY29yYXRpb246bm9uZTttYXJnaW46MTBweCAyMHB4IDEwcHggMDt0cmFuc2l0aW9uOjAuMXMgYWxsfS5iYWMtLWN1c3RvbS1tb2RhbCAuY3VzdG9tLW1vZGFsX19ib3ggaXtmb250LXNpemU6NzBweDtkaXNwbGF5OmJsb2NrO21hcmdpbjoyNXB4IDB9LmJhYy0tY3VzdG9tLW1vZGFsIC5jdXN0b20tbW9kYWxfX2JveC5hY3RpdmV7Y29sb3I6eWVsbG93O2JvcmRlci1jb2xvcjp5ZWxsb3c7dGV4dC1kZWNvcmF0aW9uOm5vbmV9LmJhYy0tY3VzdG9tLW1vZGFsIC5jdXN0b20tbW9kYWxfX2JveDpob3ZlciwuYmFjLS1jdXN0b20tbW9kYWwgLmN1c3RvbS1tb2RhbF9fYm94OmFjdGl2ZSwuYmFjLS1jdXN0b20tbW9kYWwgLmN1c3RvbS1tb2RhbF9fYm94OmZvY3Vze2NvbG9yOiMxQUMwQjQ7Ym9yZGVyLWNvbG9yOnllbGxvdzt0ZXh0LWRlY29yYXRpb246bm9uZX0uY2xvdWQtaW1hZ2VzX19jb250YWluZXJ7ZGlzcGxheTpmbGV4O2ZsZXgtd3JhcDp3cmFwO2p1c3RpZnktY29udGVudDpmbGV4LXN0YXJ0fS5jbG91ZC1pbWFnZXNfX3BhZ2luYXRpb257cGFkZGluZzoyMHB4fS5jbG91ZC1pbWFnZXNfX3BhZ2luYXRpb24gbGl7ZGlzcGxheTppbmxpbmUtYmxvY2s7bWFyZ2luLXJpZ2h0OjEwcHh9LmNsb3VkLWltYWdlc19fcGFnaW5hdGlvbiBsaSBhe2NvbG9yOiNmZmY7YmFja2dyb3VuZC1jb2xvcjojNWU2Nzc2O2JvcmRlci1yYWRpdXM6MjBweDt0ZXh0LWRlY29yYXRpb246bm9uZTtkaXNwbGF5OmJsb2NrO2ZvbnQtd2VpZ2h0OjIwMDtoZWlnaHQ6MzVweDt3aWR0aDozNXB4O2xpbmUtaGVpZ2h0OjM1cHg7dGV4dC1hbGlnbjpjZW50ZXJ9LmNsb3VkLWltYWdlc19fcGFnaW5hdGlvbiBsaS5hY3RpdmUgYXtiYWNrZ3JvdW5kLWNvbG9yOiMyZjM4NDl9LmNsb3VkLWltYWdlc19faXRlbXt3aWR0aDoxNTVweDtoZWlnaHQ6MTcwcHg7Ym9yZGVyOjFweCBzb2xpZCAjZWVlO2JhY2tncm91bmQtY29sb3I6I2ZmZjtib3JkZXItcmFkaXVzOjNweDttYXJnaW46MCAxNXB4IDE1cHggMDt0ZXh0LWFsaWduOmNlbnRlcjtwb3NpdGlvbjpyZWxhdGl2ZTtjdXJzb3I6cG9pbnRlcn0uY2xvdWQtaW1hZ2VzX19pdGVtIC5jbG91ZC1pbWFnZXNfX2l0ZW1fX3R5cGV7aGVpZ2h0OjExNXB4O2ZvbnQtc2l6ZTo5MHB4O2xpbmUtaGVpZ2h0OjE0MHB4O2JvcmRlci10b3AtbGVmdC1yYWRpdXM6M3B4O2JvcmRlci10b3AtcmlnaHQtcmFkaXVzOjNweDtjb2xvcjojYTJhMmEyO2JhY2tncm91bmQtY29sb3I6I2U5ZWFlYn0uY2xvdWQtaW1hZ2VzX19pdGVtIC5jbG91ZC1pbWFnZXNfX2l0ZW1fX3R5cGU+aW1ne3dpZHRoOmF1dG87aGVpZ2h0OmF1dG87bWF4LXdpZHRoOjEwMCU7bWF4LWhlaWdodDoxMDAlfS5jbG91ZC1pbWFnZXNfX2l0ZW0gLmNsb3VkLWltYWdlc19faXRlbV9fZGV0YWlsc3twYWRkaW5nOjEwcHggMH0uY2xvdWQtaW1hZ2VzX19pdGVtIC5jbG91ZC1pbWFnZXNfX2l0ZW1fX2RldGFpbHMgLmNsb3VkLWltYWdlc19faXRlbV9fZGV0YWlsc19fbmFtZXtmb250LXNpemU6MTJweDtvdXRsaW5lOm5vbmU7cGFkZGluZzowIDEwcHg7Y29sb3I6I2E1YWJiNTtib3JkZXI6bm9uZTt3aWR0aDoxMDAlO2JhY2tncm91bmQtY29sb3I6dHJhbnNwYXJlbnQ7aGVpZ2h0OjE1cHg7ZGlzcGxheTppbmxpbmUtYmxvY2s7d29yZC1icmVhazpicmVhay1hbGx9LmNsb3VkLWltYWdlc19faXRlbSAuY2xvdWQtaW1hZ2VzX19pdGVtX19kZXRhaWxzIC5jbG91ZC1pbWFnZXNfX2l0ZW1fX2RldGFpbHNfX2RhdGV7Zm9udC1zaXplOjEwcHg7Ym90dG9tOjZweDt3aWR0aDoxNTVweDtoZWlnaHQ6MTVweDtjb2xvcjojYTVhYmI1O2Rpc3BsYXk6aW5saW5lLWJsb2NrfS5jbG91ZC1pbWFnZXNfX2l0ZW0gLmNsb3VkLWltYWdlc19faXRlbV9fYWN0aW9uc3tkaXNwbGF5OmZsZXg7YWxpZ24taXRlbXM6Y2VudGVyO2p1c3RpZnktY29udGVudDpjZW50ZXI7cG9zaXRpb246YWJzb2x1dGU7dG9wOjA7bGVmdDowO3dpZHRoOjEwMCU7aGVpZ2h0OjExNXB4O2JhY2tncm91bmQtY29sb3I6cmdiYSg3OCw4Myw5MSwwLjgzKTtvcGFjaXR5OjA7dmlzaWJpbGl0eTpoaWRkZW47Ym9yZGVyLXRvcC1sZWZ0LXJhZGl1czozcHg7Ym9yZGVyLXRvcC1yaWdodC1yYWRpdXM6M3B4O3RleHQtYWxpZ246Y2VudGVyO3RyYW5zaXRpb246MC4zcyBvcGFjaXR5fS5jbG91ZC1pbWFnZXNfX2l0ZW0gLmNsb3VkLWltYWdlc19faXRlbV9fYWN0aW9ucyBhe2ZvbnQtc2l6ZToxNnB4O2NvbG9yOiNmZmY7dGV4dC1kZWNvcmF0aW9uOm5vbmV9LmNsb3VkLWltYWdlc19faXRlbTpob3ZlciAuY2xvdWQtaW1hZ2VzX19pdGVtIC5jbG91ZC1pbWFnZXNfX2l0ZW1fX2FjdGlvbnN7b3BhY2l0eToxO3Zpc2liaWxpdHk6dmlzaWJsZX0nLFxuICAgIGhlYWQgPSBkb2N1bWVudC5oZWFkIHx8IGRvY3VtZW50LmdldEVsZW1lbnRzQnlUYWdOYW1lKCdoZWFkJylbMF0sXG4gICAgc3R5bGUgPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KCdzdHlsZScpO1xuc3R5bGUudHlwZSA9ICd0ZXh0L2Nzcyc7XG5cbmlmIChzdHlsZS5zdHlsZVNoZWV0KSB7XG4gIHN0eWxlLnN0eWxlU2hlZXQuY3NzVGV4dCA9IGNzcztcbn0gZWxzZSB7XG4gIHN0eWxlLmFwcGVuZENoaWxkKGRvY3VtZW50LmNyZWF0ZVRleHROb2RlKGNzcykpO1xufVxuXG5oZWFkLmFwcGVuZENoaWxkKHN0eWxlKTtcbnZhciBsaW5rID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudCgnbGluaycpO1xubGluay5ocmVmID0gJ2h0dHBzOi8vYWNjZXNzLWZvbnRzLnB1cmVwcm9maWxlLmNvbS9zdHlsZXMuY3NzJztcbmxpbmsucmVsID0gJ3N0eWxlc2hlZXQnO1xuZG9jdW1lbnQuZ2V0RWxlbWVudHNCeVRhZ05hbWUoJ2hlYWQnKVswXS5hcHBlbmRDaGlsZChsaW5rKTtcbm1vZHVsZS5leHBvcnRzID0gcHBiYTsiLCJcInVzZSBzdHJpY3RcIjtcblxudmFyIGxzID0gd2luZG93LmxvY2FsU3RvcmFnZTtcbnZhciBhY2NvdW50S2V5ID0gXCJfX19fYWN0aXZlQWNjb3VudF9fX19cIjtcbnZhciBBQ0cgPSB7XG4gIGluaXRpYWxpc2U6IGZ1bmN0aW9uIGluaXRpYWxpc2UodGFiQWNjb3VudCwgdmFsaWRhdGUsIGludmFsaWRhdGUpIHtcbiAgICB3aW5kb3cuYWRkRXZlbnRMaXN0ZW5lcignc3RvcmFnZScsIGZ1bmN0aW9uICgpIHtcbiAgICAgIHZhciBuZXdBY2NvdW50ID0gbHMuZ2V0SXRlbShhY2NvdW50S2V5KTtcblxuICAgICAgaWYgKG5ld0FjY291bnQpIHtcbiAgICAgICAgaWYgKG5ld0FjY291bnQgIT09IHRhYkFjY291bnQpIHtcbiAgICAgICAgICBpbnZhbGlkYXRlKCk7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgdmFsaWRhdGUoKTtcbiAgICAgICAgfVxuICAgICAgfVxuICAgIH0pO1xuICB9LFxuICBjaGFuZ2VBY2NvdW50OiBmdW5jdGlvbiBjaGFuZ2VBY2NvdW50KG5ld0FjY291bnQpIHtcbiAgICBscy5zZXRJdGVtKGFjY291bnRLZXksIG5ld0FjY291bnQpO1xuICB9XG59O1xubW9kdWxlLmV4cG9ydHMgPSBBQ0c7IiwiXCJ1c2Ugc3RyaWN0XCI7XG5cbnZhciBhbXBsaXR1ZGUgPSByZXF1aXJlKCdhbXBsaXR1ZGUtanMnKTtcblxudmFyIFN0b3JlID0gcmVxdWlyZSgnLi9zdG9yZScpO1xuXG52YXIgQW1wbGl0dWRlID0ge1xuICBpbml0OiBmdW5jdGlvbiBpbml0KHVzZXJJbmZvKSB7XG4gICAgLy8gY29uc29sZS5sb2coa2V5LCB1c2VySW5mbyk7XG4gICAgYW1wbGl0dWRlLmdldEluc3RhbmNlKCkuaW5pdCh1c2VySW5mby5hbXBsaXR1ZGVfa2V5LCB1c2VySW5mby5pZCk7XG4gICAgdmFyIGlkZW50aWZ5ID0gbmV3IGFtcGxpdHVkZS5JZGVudGlmeSgpLnNldCgnZmlyc3RuYW1lJywgdXNlckluZm8uZmlyc3RuYW1lKS5zZXQoJ2xhc3RuYW1lJywgdXNlckluZm8ubGFzdG5hbWUpLnNldCgnYWNjb3VudCcsIHVzZXJJbmZvLmFjY291bnQubmFtZSkuc2V0KCdwdXJlcHJvZmlsZV91c2VyJywgdXNlckluZm8uZW1haWwuc3Vic3RyaW5nKHVzZXJJbmZvLmVtYWlsLmxhc3RJbmRleE9mKFwiQFwiKSArIDEpLnRvTG93ZXJDYXNlKCkgPT09IFwicHVyZXByb2ZpbGUuY29tXCIpO1xuICAgIGFtcGxpdHVkZS5nZXRJbnN0YW5jZSgpLmlkZW50aWZ5KGlkZW50aWZ5KTtcbiAgfSxcbiAgbG9nRXZlbnQ6IGZ1bmN0aW9uIGxvZ0V2ZW50KGV2ZW50LCBwcm9wZXJ0aWVzKSB7XG4gICAgaWYgKCFwcm9wZXJ0aWVzKSB7XG4gICAgICBwcm9wZXJ0aWVzID0ge307XG4gICAgfVxuXG4gICAgcHJvcGVydGllcy5hcHAgPSBTdG9yZS5nZXRBcHBJbmZvKCkubmFtZTtcbiAgICBhbXBsaXR1ZGUuZ2V0SW5zdGFuY2UoKS5sb2dFdmVudChldmVudCwgcHJvcGVydGllcyk7XG4gIH1cbn07XG5tb2R1bGUuZXhwb3J0cyA9IEFtcGxpdHVkZTsiLCJcInVzZSBzdHJpY3RcIjtcblxudmFyIFN0b3JlID0gcmVxdWlyZSgnLi9zdG9yZScpO1xuXG52YXIgTG9nZ2VyID0gcmVxdWlyZSgnLi9sb2dnZXInKTtcblxudmFyIERvbSA9IHJlcXVpcmUoJy4vZG9tJyk7XG5cbnZhciBDYWxsZXIgPSByZXF1aXJlKCcuL2NhbGxlcicpO1xuXG52YXIgdXBsb2FkaW5nID0gZmFsc2U7XG52YXIgQXZhdGFyQ3RybCA9IHtcbiAgX3N1Ym1pdDogbnVsbCxcbiAgX2ZpbGU6IG51bGwsXG4gIF9wcm9ncmVzczogbnVsbCxcbiAgX3NpZGViYXJfYXZhdGFyOiBudWxsLFxuICBfdG9wX2F2YXRhcjogbnVsbCxcbiAgX3RvcF9hdmF0YXJfY29udGFpbmVyOiBudWxsLFxuICBpbml0OiBmdW5jdGlvbiBpbml0KCkge1xuICAgIEF2YXRhckN0cmwuX3N1Ym1pdCA9IGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKCdiYWMtLS1wdXJlc2RrLWF2YXRhci1zdWJtaXQnKTtcbiAgICBBdmF0YXJDdHJsLl9maWxlID0gZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoJ2JhYy0tLXB1cmVzZGstYXZhdGFyLWZpbGUnKTtcbiAgICBBdmF0YXJDdHJsLl90b3BfYXZhdGFyX2NvbnRhaW5lciA9IGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKCdiYWMtLWltYWdlLWNvbnRhaW5lci10b3AnKTtcbiAgICBBdmF0YXJDdHJsLl9wcm9ncmVzcyA9IGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKCdiYWMtLXVzZXItaW1hZ2UtdXBsb2FkLXByb2dyZXNzJyk7XG4gICAgQXZhdGFyQ3RybC5fc2lkZWJhcl9hdmF0YXIgPSBkb2N1bWVudC5nZXRFbGVtZW50QnlJZCgnYmFjLS11c2VyLWltYWdlLWZpbGUnKTtcbiAgICBBdmF0YXJDdHJsLl90b3BfYXZhdGFyID0gZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoJ2JhYy0tdXNlci1hdmF0YXItdG9wJyk7XG5cbiAgICBBdmF0YXJDdHJsLl9maWxlLmFkZEV2ZW50TGlzdGVuZXIoJ2NsaWNrJywgZnVuY3Rpb24gKGUpIHtcbiAgICAgIGUuc3RvcFByb3BhZ2F0aW9uKCk7XG4gICAgfSk7XG5cbiAgICBBdmF0YXJDdHJsLl9maWxlLmFkZEV2ZW50TGlzdGVuZXIoJ2NoYW5nZScsIGZ1bmN0aW9uIChlKSB7XG4gICAgICBBdmF0YXJDdHJsLnVwbG9hZCgpO1xuICAgIH0pO1xuXG4gICAgZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoJ2JhYy0tdXNlci1pbWFnZScpLmFkZEV2ZW50TGlzdGVuZXIoJ2NsaWNrJywgZnVuY3Rpb24gKGUpIHtcbiAgICAgIGUuc3RvcFByb3BhZ2F0aW9uKCk7XG5cbiAgICAgIEF2YXRhckN0cmwuX2ZpbGUuY2xpY2soKTtcbiAgICB9KTtcbiAgfSxcbiAgdXBsb2FkOiBmdW5jdGlvbiB1cGxvYWQoKSB7XG4gICAgaWYgKHVwbG9hZGluZykge1xuICAgICAgcmV0dXJuO1xuICAgIH1cblxuICAgIHVwbG9hZGluZyA9IHRydWU7XG5cbiAgICBpZiAoQXZhdGFyQ3RybC5fZmlsZS5maWxlcy5sZW5ndGggPT09IDApIHtcbiAgICAgIHJldHVybjtcbiAgICB9XG5cbiAgICB2YXIgZGF0YSA9IG5ldyBGb3JtRGF0YSgpO1xuICAgIGRhdGEuYXBwZW5kKCdmaWxlJywgQXZhdGFyQ3RybC5fZmlsZS5maWxlc1swXSk7XG5cbiAgICB2YXIgc3VjY2Vzc0NhbGxiYWNrID0gZnVuY3Rpb24gc3VjY2Vzc0NhbGxiYWNrKGRhdGEpIHtcbiAgICAgIDtcbiAgICB9O1xuXG4gICAgdmFyIGZhaWxDYWxsYmFjayA9IGZ1bmN0aW9uIGZhaWxDYWxsYmFjayhkYXRhKSB7XG4gICAgICA7XG4gICAgfTtcblxuICAgIHZhciByZXF1ZXN0ID0gbmV3IFhNTEh0dHBSZXF1ZXN0KCk7XG5cbiAgICByZXF1ZXN0Lm9ucmVhZHlzdGF0ZWNoYW5nZSA9IGZ1bmN0aW9uICgpIHtcbiAgICAgIHVwbG9hZGluZyA9IGZhbHNlO1xuXG4gICAgICBpZiAocmVxdWVzdC5yZWFkeVN0YXRlID09IDQpIHtcbiAgICAgICAgdHJ5IHtcbiAgICAgICAgICB2YXIgaW1hZ2VEYXRhID0gSlNPTi5wYXJzZShyZXF1ZXN0LnJlc3BvbnNlKS5kYXRhO1xuICAgICAgICAgIEF2YXRhckN0cmwuc2V0QXZhdGFyKGltYWdlRGF0YS51cmwpO1xuICAgICAgICAgIENhbGxlci5tYWtlQ2FsbCh7XG4gICAgICAgICAgICB0eXBlOiAnUFVUJyxcbiAgICAgICAgICAgIGVuZHBvaW50OiBTdG9yZS5nZXRBdmF0YXJVcGRhdGVVcmwoKSxcbiAgICAgICAgICAgIHBhcmFtczoge1xuICAgICAgICAgICAgICB1c2VyOiB7XG4gICAgICAgICAgICAgICAgYXZhdGFyX3V1aWQ6IGltYWdlRGF0YS5ndWlkXG4gICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICBjYWxsYmFja3M6IHtcbiAgICAgICAgICAgICAgc3VjY2Vzczogc3VjY2Vzc0NhbGxiYWNrLFxuICAgICAgICAgICAgICBmYWlsOiBmYWlsQ2FsbGJhY2tcbiAgICAgICAgICAgIH1cbiAgICAgICAgICB9KTtcbiAgICAgICAgfSBjYXRjaCAoZSkge1xuICAgICAgICAgIHZhciByZXNwID0ge1xuICAgICAgICAgICAgc3RhdHVzOiAnZXJyb3InLFxuICAgICAgICAgICAgZGF0YTogJ1Vua25vd24gZXJyb3Igb2NjdXJyZWQ6IFsnICsgcmVxdWVzdC5yZXNwb25zZVRleHQgKyAnXSdcbiAgICAgICAgICB9O1xuICAgICAgICB9XG5cbiAgICAgICAgTG9nZ2VyLmxvZyhyZXF1ZXN0LnJlc3BvbnNlLnN0YXR1cyArICc6ICcgKyByZXF1ZXN0LnJlc3BvbnNlLmRhdGEpO1xuICAgICAgfVxuICAgIH07IC8vIHJlcXVlc3QudXBsb2FkLmFkZEV2ZW50TGlzdGVuZXIoJ3Byb2dyZXNzJywgZnVuY3Rpb24oZSl7XG4gICAgLy8gXHRMb2dnZXIubG9nKGUubG9hZGVkL2UudG90YWwpO1xuICAgIC8vIFx0QXZhdGFyQ3RybC5fcHJvZ3Jlc3Muc3R5bGUudG9wID0gMTAwIC0gKGUubG9hZGVkL2UudG90YWwpICogMTAwICsgJyUnO1xuICAgIC8vIH0sIGZhbHNlKTtcblxuXG4gICAgdmFyIHVybCA9IFN0b3JlLmdldEF2YXRhclVwbG9hZFVybCgpO1xuICAgIERvbS5hZGRDbGFzcyhBdmF0YXJDdHJsLl9wcm9ncmVzcywgJ2JhYy0tcHVyZXNkay12aXNpYmxlJyk7XG4gICAgcmVxdWVzdC5vcGVuKCdQT1NUJywgdXJsKTtcbiAgICByZXF1ZXN0LnNlbmQoZGF0YSk7XG4gIH0sXG4gIHNldEF2YXRhcjogZnVuY3Rpb24gc2V0QXZhdGFyKHVybCkge1xuICAgIGlmICghdXJsKSB7XG4gICAgICByZXR1cm47XG4gICAgfVxuXG4gICAgRG9tLnJlbW92ZUNsYXNzKEF2YXRhckN0cmwuX3Byb2dyZXNzLCAnYmFjLS1wdXJlc2RrLXZpc2libGUnKTtcbiAgICBEb20uYWRkQ2xhc3MoQXZhdGFyQ3RybC5fc2lkZWJhcl9hdmF0YXIsICdiYWMtLXB1cmVzZGstdmlzaWJsZScpO1xuICAgIHZhciBpbWcgPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KCdpbWcnKTtcbiAgICBpbWcuc3JjID0gdXJsO1xuICAgIEF2YXRhckN0cmwuX3NpZGViYXJfYXZhdGFyLmlubmVySFRNTCA9ICcnO1xuXG4gICAgQXZhdGFyQ3RybC5fc2lkZWJhcl9hdmF0YXIuYXBwZW5kQ2hpbGQoaW1nKTtcblxuICAgIERvbS5hZGRDbGFzcyhBdmF0YXJDdHJsLl90b3BfYXZhdGFyX2NvbnRhaW5lciwgJ2JhYy0tcHVyZXNkay12aXNpYmxlJyk7XG4gICAgdmFyIGltZ18yID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudCgnaW1nJyk7XG4gICAgaW1nXzIuc3JjID0gdXJsO1xuICAgIEF2YXRhckN0cmwuX3RvcF9hdmF0YXJfY29udGFpbmVyLmlubmVySFRNTCA9ICcnO1xuXG4gICAgQXZhdGFyQ3RybC5fdG9wX2F2YXRhcl9jb250YWluZXIuYXBwZW5kQ2hpbGQoaW1nXzIpOyAvLyAgYmFjLS1pbWFnZS1jb250YWluZXItdG9wXG5cbiAgfVxufTtcbm1vZHVsZS5leHBvcnRzID0gQXZhdGFyQ3RybDsiLCJcInVzZSBzdHJpY3RcIjtcblxudmFyIFN0b3JlID0gcmVxdWlyZSgnLi9zdG9yZS5qcycpO1xuXG52YXIgTG9nZ2VyID0gcmVxdWlyZSgnLi9sb2dnZXInKTtcblxudmFyIHBhcmFtc1RvR2V0VmFycyA9IGZ1bmN0aW9uIHBhcmFtc1RvR2V0VmFycyhwYXJhbXMpIHtcbiAgdmFyIHRvUmV0dXJuID0gW107XG5cbiAgZm9yICh2YXIgcHJvcGVydHkgaW4gcGFyYW1zKSB7XG4gICAgaWYgKHBhcmFtcy5oYXNPd25Qcm9wZXJ0eShwcm9wZXJ0eSkpIHtcbiAgICAgIHRvUmV0dXJuLnB1c2gocHJvcGVydHkgKyAnPScgKyBwYXJhbXNbcHJvcGVydHldKTtcbiAgICB9XG4gIH1cblxuICByZXR1cm4gdG9SZXR1cm4uam9pbignJicpO1xufTtcblxudmFyIGRldktleXMgPSBudWxsO1xudmFyIENhbGxlciA9IHtcbiAgLypcbiAgaWYgdGhlIHVzZXIgc2V0c1xuICAgKi9cbiAgc2V0RGV2S2V5czogZnVuY3Rpb24gc2V0RGV2S2V5cyhrZXlzKSB7XG4gICAgZGV2S2V5cyA9IGtleXM7XG4gIH0sXG5cbiAgLypcbiAgZXhwZWN0ZSBhdHRyaWJ1dGVzOlxuICAtIHR5cGUgKGVpdGhlciBHRVQsIFBPU1QsIERFTEVURSwgUFVUKVxuICAtIGVuZHBvaW50XG4gIC0gcGFyYW1zIChpZiBhbnkuIEEganNvbiB3aXRoIHBhcmFtZXRlcnMgdG8gYmUgcGFzc2VkIGJhY2sgdG8gdGhlIGVuZHBvaW50KVxuICAtIGNhbGxiYWNrczogYW4gb2JqZWN0IHdpdGg6XG4gIFx0LSBzdWNjZXNzOiB0aGUgc3VjY2VzcyBjYWxsYmFja1xuICBcdC0gZmFpbDogdGhlIGZhaWwgY2FsbGJhY2tcbiAgICovXG4gIG1ha2VDYWxsOiBmdW5jdGlvbiBtYWtlQ2FsbChhdHRycykge1xuICAgIHZhciBlbmRwb2ludFVybCA9IGF0dHJzLmVuZHBvaW50O1xuICAgIHZhciB4aHIgPSBuZXcgWE1MSHR0cFJlcXVlc3QoKTtcblxuICAgIGlmIChhdHRycy50eXBlID09PSAnR0VUJyAmJiBhdHRycy5wYXJhbXMpIHtcbiAgICAgIGVuZHBvaW50VXJsID0gZW5kcG9pbnRVcmwgKyBcIj9cIiArIHBhcmFtc1RvR2V0VmFycyhhdHRycy5wYXJhbXMpO1xuICAgIH1cblxuICAgIHhoci5vcGVuKGF0dHJzLnR5cGUsIGVuZHBvaW50VXJsKTtcblxuICAgIGlmIChkZXZLZXlzICE9IG51bGwpIHtcbiAgICAgIHhoci5zZXRSZXF1ZXN0SGVhZGVyKCd4LXBwLXNlY3JldCcsIGRldktleXMuc2VjcmV0KTtcbiAgICAgIHhoci5zZXRSZXF1ZXN0SGVhZGVyKCd4LXBwLWtleScsIGRldktleXMua2V5KTtcbiAgICB9XG5cbiAgICB4aHIud2l0aENyZWRlbnRpYWxzID0gdHJ1ZTtcbiAgICB4aHIuc2V0UmVxdWVzdEhlYWRlcignQ29udGVudC1UeXBlJywgJ2FwcGxpY2F0aW9uL2pzb24nKTtcblxuICAgIHhoci5vbmxvYWQgPSBmdW5jdGlvbiAoKSB7XG4gICAgICBpZiAoeGhyLnN0YXR1cyA+PSAyMDAgJiYgeGhyLnN0YXR1cyA8IDMwMCkge1xuICAgICAgICBhdHRycy5jYWxsYmFja3Muc3VjY2VzcyhKU09OLnBhcnNlKHhoci5yZXNwb25zZVRleHQpKTtcbiAgICAgIH0gZWxzZSBpZiAoeGhyLnN0YXR1cyAhPT0gMjAwKSB7XG4gICAgICAgIGF0dHJzLmNhbGxiYWNrcy5mYWlsKEpTT04ucGFyc2UoeGhyLnJlc3BvbnNlVGV4dCkpO1xuICAgICAgfVxuICAgIH07XG5cbiAgICBpZiAoIWF0dHJzLnBhcmFtcykge1xuICAgICAgYXR0cnMucGFyYW1zID0ge307XG4gICAgfVxuXG4gICAgeGhyLnNlbmQoSlNPTi5zdHJpbmdpZnkoYXR0cnMucGFyYW1zKSk7XG4gIH0sXG4gIHByb21pc2VDYWxsOiBmdW5jdGlvbiBwcm9taXNlQ2FsbChhdHRycykge1xuICAgIHJldHVybiBuZXcgUHJvbWlzZShmdW5jdGlvbiAocmVzb2x2ZSwgcmVqZWN0KSB7XG4gICAgICB2YXIgeGhyID0gbmV3IFhNTEh0dHBSZXF1ZXN0KCk7XG5cbiAgICAgIGlmIChhdHRycy50eXBlID09PSAnR0VUJyAmJiBhdHRycy5wYXJhbXMpIHtcbiAgICAgICAgZW5kcG9pbnRVcmwgPSBlbmRwb2ludFVybCArIFwiP1wiICsgcGFyYW1zVG9HZXRWYXJzKGF0dHJzLnBhcmFtcyk7XG4gICAgICB9XG5cbiAgICAgIHhoci5vcGVuKGF0dHJzLnR5cGUsIGF0dHJzLmVuZHBvaW50KTtcbiAgICAgIHhoci53aXRoQ3JlZGVudGlhbHMgPSB0cnVlO1xuXG4gICAgICBpZiAoZGV2S2V5cyAhPSBudWxsKSB7XG4gICAgICAgIHhoci5zZXRSZXF1ZXN0SGVhZGVyKCd4LXBwLXNlY3JldCcsIGRldktleXMuc2VjcmV0KTtcbiAgICAgICAgeGhyLnNldFJlcXVlc3RIZWFkZXIoJ3gtcHAta2V5JywgZGV2S2V5cy5rZXkpO1xuICAgICAgfVxuXG4gICAgICB4aHIuc2V0UmVxdWVzdEhlYWRlcignQ29udGVudC1UeXBlJywgJ2FwcGxpY2F0aW9uL2pzb24nKTtcblxuICAgICAgeGhyLm9ubG9hZCA9IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgaWYgKHRoaXMuc3RhdHVzID49IDIwMCAmJiB0aGlzLnN0YXR1cyA8IDMwMCkge1xuICAgICAgICAgIGF0dHJzLm1pZGRsZXdhcmVzLnN1Y2Nlc3MoSlNPTi5wYXJzZSh4aHIucmVzcG9uc2VUZXh0KSk7XG4gICAgICAgICAgcmVzb2x2ZShKU09OLnBhcnNlKHhoci5yZXNwb25zZVRleHQpKTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICB3aW5kb3cubG9jYXRpb24uaHJlZiA9IFN0b3JlLmdldExvZ2luVXJsKCk7XG4gICAgICAgIH1cbiAgICAgIH07XG5cbiAgICAgIHhoci5vbmVycm9yID0gZnVuY3Rpb24gKCkge1xuICAgICAgICB3aW5kb3cubG9jYXRpb24gPSBTdG9yZS5nZXRMb2dpblVybCgpO1xuICAgICAgfTtcblxuICAgICAgeGhyLnNlbmQoKTtcbiAgICB9KTtcbiAgfVxufTtcbm1vZHVsZS5leHBvcnRzID0gQ2FsbGVyOyIsIlwidXNlIHN0cmljdFwiO1xuXG52YXIgZGVib3VuY2VkVGltZW91dCA9IG51bGw7XG52YXIgY3VycmVudFF1ZXJ5ID0gJyc7XG52YXIgbGltaXQgPSA4O1xudmFyIGxhdGVuY3kgPSA1MDA7XG52YXIgaW5pdE9wdGlvbnM7XG52YXIgY3VycmVudFBhZ2UgPSAxO1xudmFyIG1ldGFEYXRhID0gbnVsbDtcbnZhciBpdGVtcyA9IFtdO1xudmFyIHBhZ2luYXRpb25EYXRhID0gbnVsbDtcblxudmFyIFBhZ2luYXRpb25IZWxwZXIgPSByZXF1aXJlKCcuL3BhZ2luYXRpb24taGVscGVyJyk7XG5cbnZhciBDYWxsZXIgPSByZXF1aXJlKCcuL2NhbGxlcicpO1xuXG52YXIgU3RvcmUgPSByZXF1aXJlKCcuL3N0b3JlJyk7XG5cbnZhciBEb20gPSByZXF1aXJlKCcuL2RvbScpO1xuXG52YXIgQ2xvdWRpbmFyeVBpY2tlciA9IHtcbiAgaW5pdGlhbGlzZTogZnVuY3Rpb24gaW5pdGlhbGlzZSgpIHtcbiAgICBkb2N1bWVudC5nZXRFbGVtZW50QnlJZCgnYmFjLS1jbG91ZGluYXJ5LS1jbG9zZWJ0bicpLm9uY2xpY2sgPSBmdW5jdGlvbiAoZSkge1xuICAgICAgQ2xvdWRpbmFyeVBpY2tlci5jbG9zZU1vZGFsKCk7XG4gICAgfTtcblxuICAgIGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKCdiYWMtLWNsb3VkaW5hcnktLXNlYXJjaC1pbnB1dCcpLm9ua2V5dXAgPSBmdW5jdGlvbiAoZSkge1xuICAgICAgQ2xvdWRpbmFyeVBpY2tlci5oYW5kbGVTZWFyY2goZSk7XG4gICAgfTtcblxuICAgIGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKCdiYWMtLWNsb3VkaW5hcnktLWdvLWJhY2snKS5vbmNsaWNrID0gZnVuY3Rpb24gKGUpIHtcbiAgICAgIENsb3VkaW5hcnlQaWNrZXIuZ29CYWNrKCk7XG4gICAgfTtcbiAgfSxcblxuICAvKlxuICBvcHRpb25zOiB7XG4gIFx0b25TZWxlY3Q6IGl0IGV4cGVjdHMgYSBmdW5jdGlvbi4gVGhpcyBmdW5jdGlvbiB3aWxsIGJlIGludm9rZWQgZXhhY3RseSBhdCB0aGUgbW9tZW50IHRoZSB1c2VyIHBpY2tzXG4gIFx0XHRhIGZpbGUgZnJvbSBjbG91ZGluYXJ5LiBUaGUgZnVuY3Rpb24gd2lsbCB0YWtlIGp1c3Qgb25lIHBhcmFtIHdoaWNoIGlzIHRoZSBzZWxlY3RlZCBpdGVtIG9iamVjdFxuICAgIGNsb3NlT25Fc2M6IHRydWUgLyBmYWxzZVxuICB9XG4gICAqL1xuICBvcGVuTW9kYWw6IGZ1bmN0aW9uIG9wZW5Nb2RhbChvcHRpb25zKSB7XG4gICAgQ2xvdWRpbmFyeVBpY2tlci5pbml0aWFsaXNlKCk7XG4gICAgaW5pdE9wdGlvbnMgPSBvcHRpb25zO1xuICAgIERvbS5hZGRDbGFzcyhkb2N1bWVudC5nZXRFbGVtZW50QnlJZCgnYmFjLS1jbG91ZGluYXJ5LS1tb2RhbCcpLCAnaXMtb3BlbicpO1xuICAgIENsb3VkaW5hcnlQaWNrZXIuZ2V0SW1hZ2VzKHtcbiAgICAgIHBhZ2U6IDEsXG4gICAgICBsaW1pdDogbGltaXRcbiAgICB9KTtcbiAgfSxcbiAgY2xvc2VNb2RhbDogZnVuY3Rpb24gY2xvc2VNb2RhbCgpIHtcbiAgICBEb20ucmVtb3ZlQ2xhc3MoZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoJ2JhYy0tY2xvdWRpbmFyeS0tbW9kYWwnKSwgJ2lzLW9wZW4nKTtcbiAgfSxcbiAgZ2V0SW1hZ2VzOiBmdW5jdGlvbiBnZXRJbWFnZXMob3B0aW9ucykge1xuICAgIC8vIFRPRE8gbWFrZSB0aGUgY2FsbCBhbmQgZ2V0IHRoZSBpbWFnZXNcbiAgICBDYWxsZXIubWFrZUNhbGwoe1xuICAgICAgdHlwZTogJ0dFVCcsXG4gICAgICBlbmRwb2ludDogU3RvcmUuZ2V0Q2xvdWRpbmFyeUVuZHBvaW50KCksXG4gICAgICBwYXJhbXM6IG9wdGlvbnMsXG4gICAgICBjYWxsYmFja3M6IHtcbiAgICAgICAgc3VjY2VzczogZnVuY3Rpb24gc3VjY2VzcyhyZXN1bHQpIHtcbiAgICAgICAgICBDbG91ZGluYXJ5UGlja2VyLm9uSW1hZ2VzUmVzcG9uc2UocmVzdWx0KTtcbiAgICAgICAgfSxcbiAgICAgICAgZmFpbDogZnVuY3Rpb24gZmFpbChlcnIpIHtcbiAgICAgICAgICBhbGVydChlcnIpO1xuICAgICAgICB9XG4gICAgICB9XG4gICAgfSk7XG4gIH0sXG4gIGhhbmRsZVNlYXJjaDogZnVuY3Rpb24gaGFuZGxlU2VhcmNoKGUpIHtcbiAgICBpZiAoZGVib3VuY2VkVGltZW91dCkge1xuICAgICAgY2xlYXJUaW1lb3V0KGRlYm91bmNlZFRpbWVvdXQpO1xuICAgIH1cblxuICAgIGlmIChlLnRhcmdldC52YWx1ZSA9PT0gY3VycmVudFF1ZXJ5KSB7XG4gICAgICByZXR1cm47XG4gICAgfVxuXG4gICAgdmFyIHF1ZXJ5ID0gZS50YXJnZXQudmFsdWU7XG4gICAgY3VycmVudFF1ZXJ5ID0gcXVlcnk7XG4gICAgdmFyIG9wdGlvbnMgPSB7XG4gICAgICBwYWdlOiAxLFxuICAgICAgbGltaXQ6IGxpbWl0LFxuICAgICAgcXVlcnk6IHF1ZXJ5XG4gICAgfTtcbiAgICBkZWJvdW5jZWRUaW1lb3V0ID0gc2V0VGltZW91dChmdW5jdGlvbiAoKSB7XG4gICAgICBDbG91ZGluYXJ5UGlja2VyLmdldEltYWdlcyhvcHRpb25zKTtcbiAgICB9LCBsYXRlbmN5KTtcbiAgfSxcbiAgaXRlbVNlbGVjdGVkOiBmdW5jdGlvbiBpdGVtU2VsZWN0ZWQoaXRlbSwgZSkge1xuICAgIGlmIChpdGVtLnR5cGUgPT0gJ2ZvbGRlcicpIHtcbiAgICAgIHZhciBwYXJhbXMgPSB7XG4gICAgICAgIHBhZ2U6IDEsXG4gICAgICAgIGxpbWl0OiBsaW1pdCxcbiAgICAgICAgcGFyZW50OiBpdGVtLmlkXG4gICAgICB9OyAvLyBUT0RPIHNldCBzZWFyY2ggaW5wdXQncyB2YWx1ZSA9ICcnXG5cbiAgICAgIGN1cnJlbnRRdWVyeSA9ICcnO1xuICAgICAgQ2xvdWRpbmFyeVBpY2tlci5nZXRJbWFnZXMocGFyYW1zKTtcbiAgICB9IGVsc2Uge1xuICAgICAgaW5pdE9wdGlvbnMub25TZWxlY3QoaXRlbSk7XG4gICAgICBDbG91ZGluYXJ5UGlja2VyLmNsb3NlTW9kYWwoKTtcbiAgICB9XG4gIH0sXG4gIG9uSW1hZ2VzUmVzcG9uc2U6IGZ1bmN0aW9uIG9uSW1hZ2VzUmVzcG9uc2UoZGF0YSkge1xuICAgIHBhZ2luYXRpb25EYXRhID0gUGFnaW5hdGlvbkhlbHBlci5nZXRQYWdlc1JhbmdlKGN1cnJlbnRQYWdlLCBNYXRoLmNlaWwoZGF0YS5tZXRhLnRvdGFsIC8gbGltaXQpKTtcbiAgICBtZXRhRGF0YSA9IGRhdGEubWV0YTtcbiAgICBpdGVtcyA9IGRhdGEuYXNzZXRzO1xuICAgIENsb3VkaW5hcnlQaWNrZXIucmVuZGVyKCk7XG4gIH0sXG4gIHJlbmRlclBhZ2luYXRpb25CdXR0b25zOiBmdW5jdGlvbiByZW5kZXJQYWdpbmF0aW9uQnV0dG9ucygpIHtcbiAgICB2YXIgdG9SZXR1cm4gPSBbXTtcblxuICAgIHZhciBjcmVhdGVQYWdpbmF0aW9uRWxlbWVudCA9IGZ1bmN0aW9uIGNyZWF0ZVBhZ2luYXRpb25FbGVtZW50KGFDbGFzc05hbWUsIGFGdW5jdGlvbiwgc3BhbkNsYXNzTmFtZSwgc3BhbkNvbnRlbnQpIHtcbiAgICAgIHZhciBsaSA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoJ2xpJyk7XG4gICAgICB2YXIgYSA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoJ2EnKTtcbiAgICAgIGxpLmNsYXNzTmFtZSA9IGFDbGFzc05hbWU7XG4gICAgICBhLm9uY2xpY2sgPSBhRnVuY3Rpb247XG4gICAgICB2YXIgc3BhbiA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoJ3NwYW4nKTtcbiAgICAgIHNwYW4uY2xhc3NOYW1lID0gc3BhbkNsYXNzTmFtZTtcblxuICAgICAgaWYgKHNwYW5Db250ZW50KSB7XG4gICAgICAgIHNwYW4uaW5uZXJIVE1MID0gc3BhbkNvbnRlbnQ7XG4gICAgICB9XG5cbiAgICAgIGEuYXBwZW5kQ2hpbGQoc3Bhbik7XG4gICAgICBsaS5hcHBlbmRDaGlsZChhKTtcbiAgICAgIHJldHVybiBsaTtcbiAgICB9O1xuXG4gICAgaWYgKHBhZ2luYXRpb25EYXRhLmhhc1ByZXZpb3VzKSB7XG4gICAgICB0b1JldHVybi5wdXNoKGNyZWF0ZVBhZ2luYXRpb25FbGVtZW50KCdkaXNhYmxlZCcsIGZ1bmN0aW9uIChlKSB7XG4gICAgICAgIGUucHJldmVudERlZmF1bHQoKTtcblxuICAgICAgICBDbG91ZGluYXJ5UGlja2VyLl9nb1RvUGFnZSgxKTtcbiAgICAgIH0sICdmYSBmYS1hbmdsZS1kb3VibGUtbGVmdCcpKTtcbiAgICAgIHRvUmV0dXJuLnB1c2goY3JlYXRlUGFnaW5hdGlvbkVsZW1lbnQoJ2Rpc2FibGVkJywgZnVuY3Rpb24gKGUpIHtcbiAgICAgICAgZS5wcmV2ZW50RGVmYXVsdCgpO1xuXG4gICAgICAgIENsb3VkaW5hcnlQaWNrZXIuX2dvVG9QYWdlKGN1cnJlbnRQYWdlIC0gMSk7XG4gICAgICB9LCAnZmEgZmEtYW5nbGUtbGVmdCcpKTtcbiAgICB9XG5cbiAgICBmb3IgKHZhciBpID0gMDsgaSA8IHBhZ2luYXRpb25EYXRhLmJ1dHRvbnMubGVuZ3RoOyBpKyspIHtcbiAgICAgIChmdW5jdGlvbiAoaSkge1xuICAgICAgICB2YXIgYnRuID0gcGFnaW5hdGlvbkRhdGEuYnV0dG9uc1tpXTtcbiAgICAgICAgdG9SZXR1cm4ucHVzaChjcmVhdGVQYWdpbmF0aW9uRWxlbWVudChidG4ucnVubmluZ3BhZ2UgPyBcImFjdGl2ZVwiIDogXCItXCIsIGZ1bmN0aW9uIChlKSB7XG4gICAgICAgICAgZS5wcmV2ZW50RGVmYXVsdCgpO1xuXG4gICAgICAgICAgQ2xvdWRpbmFyeVBpY2tlci5fZ29Ub1BhZ2UoYnRuLnBhZ2Vubyk7XG4gICAgICAgIH0sICdudW1iZXInLCBidG4ucGFnZW5vKSk7XG4gICAgICB9KShpKTtcbiAgICB9XG5cbiAgICBpZiAocGFnaW5hdGlvbkRhdGEuaGFzTmV4dCkge1xuICAgICAgdG9SZXR1cm4ucHVzaChjcmVhdGVQYWdpbmF0aW9uRWxlbWVudCgnZGlzYWJsZWQnLCBmdW5jdGlvbiAoZSkge1xuICAgICAgICBlLnByZXZlbnREZWZhdWx0KCk7XG5cbiAgICAgICAgQ2xvdWRpbmFyeVBpY2tlci5fZ29Ub1BhZ2UoY3VycmVudFBhZ2UgKyAxKTtcbiAgICAgIH0sICdmYSBmYS1hbmdsZS1yaWdodCcpKTtcbiAgICAgIHRvUmV0dXJuLnB1c2goY3JlYXRlUGFnaW5hdGlvbkVsZW1lbnQoJ2Rpc2FibGVkJywgZnVuY3Rpb24gKGUpIHtcbiAgICAgICAgZS5wcmV2ZW50RGVmYXVsdCgpO1xuXG4gICAgICAgIENsb3VkaW5hcnlQaWNrZXIuX2dvVG9QYWdlKE1hdGguY2VpbChtZXRhRGF0YS50b3RhbCAvIGxpbWl0KSk7XG4gICAgICB9LCAnZmEgZmEtYW5nbGUtZG91YmxlLXJpZ2h0JykpO1xuICAgIH1cblxuICAgIGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKCdiYWMtLWNsb3VkaW5hcnktYWN0dWFsLXBhZ2luYXRpb24tY29udGFpbmVyJykuaW5uZXJIVE1MID0gJyc7XG5cbiAgICBmb3IgKHZhciBfaSA9IDA7IF9pIDwgdG9SZXR1cm4ubGVuZ3RoOyBfaSsrKSB7XG4gICAgICBkb2N1bWVudC5nZXRFbGVtZW50QnlJZCgnYmFjLS1jbG91ZGluYXJ5LWFjdHVhbC1wYWdpbmF0aW9uLWNvbnRhaW5lcicpLmFwcGVuZENoaWxkKHRvUmV0dXJuW19pXSk7XG4gICAgfVxuICB9LFxuICBfZ29Ub1BhZ2U6IGZ1bmN0aW9uIF9nb1RvUGFnZShwYWdlKSB7XG4gICAgaWYgKHBhZ2UgPT09IGN1cnJlbnRQYWdlKSB7XG4gICAgICByZXR1cm47XG4gICAgfVxuXG4gICAgdmFyIHBhcmFtcyA9IHtcbiAgICAgIHBhZ2U6IHBhZ2UsXG4gICAgICBsaW1pdDogbGltaXRcbiAgICB9O1xuXG4gICAgaWYgKG1ldGFEYXRhLmFzc2V0KSB7XG4gICAgICBwYXJhbXMucGFyZW50ID0gbWV0YURhdGEuYXNzZXQ7XG4gICAgfVxuXG4gICAgaWYgKGN1cnJlbnRRdWVyeSkge1xuICAgICAgcGFyYW1zLnF1ZXJ5ID0gY3VycmVudFF1ZXJ5O1xuICAgIH1cblxuICAgIGN1cnJlbnRQYWdlID0gcGFnZTtcbiAgICBDbG91ZGluYXJ5UGlja2VyLmdldEltYWdlcyhwYXJhbXMpO1xuICB9LFxuICBnb0JhY2s6IGZ1bmN0aW9uIGdvQmFjaygpIHtcbiAgICB2YXIgcGFyYW1zID0ge1xuICAgICAgcGFnZTogMSxcbiAgICAgIGxpbWl0OiBsaW1pdFxuICAgIH07XG5cbiAgICBpZiAobWV0YURhdGEucGFyZW50KSB7XG4gICAgICBwYXJhbXMucGFyZW50ID0gbWV0YURhdGEucGFyZW50O1xuICAgIH1cblxuICAgIGlmIChjdXJyZW50UXVlcnkpIHtcbiAgICAgIHBhcmFtcy5xdWVyeSA9IGN1cnJlbnRRdWVyeTtcbiAgICB9XG5cbiAgICBDbG91ZGluYXJ5UGlja2VyLmdldEltYWdlcyhwYXJhbXMpO1xuICB9LFxuICByZW5kZXJJdGVtczogZnVuY3Rpb24gcmVuZGVySXRlbXMoKSB7XG4gICAgdmFyIG9uZUl0ZW0gPSBmdW5jdGlvbiBvbmVJdGVtKGl0ZW0pIHtcbiAgICAgIHZhciBpdGVtSWNvbiA9IGZ1bmN0aW9uIGl0ZW1JY29uKCkge1xuICAgICAgICBpZiAoaXRlbS50eXBlICE9ICdmb2xkZXInKSB7XG4gICAgICAgICAgcmV0dXJuIFwiPGltZyBzcmM9XCIuY29uY2F0KGl0ZW0udGh1bWIsIFwiIGFsdD1cXFwiXFxcIi8+XCIpO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgIHJldHVybiBcIjxpIGNsYXNzPVxcXCJmYSBmYS1mb2xkZXItb1xcXCI+PC9pPlwiO1xuICAgICAgICB9XG4gICAgICB9O1xuXG4gICAgICB2YXIgZnVuY3QgPSBmdW5jdGlvbiBmdW5jdCgpIHtcbiAgICAgICAgQ2xvdWRpbmFyeVBpY2tlci5pdGVtU2VsZWN0ZWQoaXRlbSk7XG4gICAgICB9O1xuXG4gICAgICB2YXIgbmV3RG9tRWwgPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KCdkaXYnKTtcbiAgICAgIG5ld0RvbUVsLmNsYXNzTmFtZSA9IFwiY2xvdWQtaW1hZ2VzX19pdGVtXCI7XG4gICAgICBuZXdEb21FbC5vbmNsaWNrID0gZnVuY3Q7XG4gICAgICBuZXdEb21FbC5pbm5lckhUTUwgPSBcIlxcblxcdFxcdFxcdFxcdFxcdFxcdCAgPGRpdiBjbGFzcz1cXFwiY2xvdWQtaW1hZ2VzX19pdGVtX190eXBlXFxcIj5cXG5cXHRcXHRcXHRcXHRcXHRcXHRcXHRcXHRcIi5jb25jYXQoaXRlbUljb24oKSwgXCJcXG5cXHRcXHRcXHRcXHRcXHRcXHQgIDwvZGl2PlxcblxcdFxcdFxcdFxcdFxcdFxcdCAgPGRpdiBjbGFzcz1cXFwiY2xvdWQtaW1hZ2VzX19pdGVtX19kZXRhaWxzXFxcIj5cXG5cXHRcXHRcXHRcXHRcXHRcXHRcXHRcXHQ8c3BhbiBjbGFzcz1cXFwiY2xvdWQtaW1hZ2VzX19pdGVtX19kZXRhaWxzX19uYW1lXFxcIj5cIikuY29uY2F0KGl0ZW0ubmFtZSwgXCI8L3NwYW4+XFxuXFx0XFx0XFx0XFx0XFx0XFx0XFx0XFx0PHNwYW4gY2xhc3M9XFxcImNsb3VkLWltYWdlc19faXRlbV9fZGV0YWlsc19fZGF0ZVxcXCI+XCIpLmNvbmNhdChpdGVtLmNyZGF0ZSwgXCI8L3NwYW4+XFxuXFx0XFx0XFx0XFx0XFx0XFx0ICA8L2Rpdj5cXG5cXHRcXHRcXHRcXHRcXHRcXHQgIDxkaXYgY2xhc3M9XFxcImNsb3VkLWltYWdlc19faXRlbV9fYWN0aW9uc1xcXCI+XFxuXFx0XFx0XFx0XFx0XFx0XFx0XFx0XFx0PGEgY2xhc3M9XFxcImZhIGZhLXBlbmNpbFxcXCI+PC9hPlxcblxcdFxcdFxcdFxcdFxcdFxcdCAgPC9kaXY+XCIpO1xuICAgICAgcmV0dXJuIG5ld0RvbUVsO1xuICAgIH07XG5cbiAgICBkb2N1bWVudC5nZXRFbGVtZW50QnlJZCgnYmFjLS1jbG91ZGluYXJ5LWl0YW1zLWNvbnRhaW5lcicpLmlubmVySFRNTCA9ICcnO1xuXG4gICAgZm9yICh2YXIgaSA9IDA7IGkgPCBpdGVtcy5sZW5ndGg7IGkrKykge1xuICAgICAgZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoJ2JhYy0tY2xvdWRpbmFyeS1pdGFtcy1jb250YWluZXInKS5hcHBlbmRDaGlsZChvbmVJdGVtKGl0ZW1zW2ldKSk7XG4gICAgfVxuICB9LFxuICByZW5kZXI6IGZ1bmN0aW9uIHJlbmRlcigpIHtcbiAgICBpZiAobWV0YURhdGEuYXNzZXQpIHtcbiAgICAgIERvbS5yZW1vdmVDbGFzcyhkb2N1bWVudC5nZXRFbGVtZW50QnlJZCgnYmFjLS1jbG91ZGluYXJ5LS1iYWNrLWJ1dHRvbi1jb250YWluZXInKSwgJ2hkbicpO1xuICAgIH0gZWxzZSB7XG4gICAgICBEb20uYWRkQ2xhc3MoZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoJ2JhYy0tY2xvdWRpbmFyeS0tYmFjay1idXR0b24tY29udGFpbmVyJyksICdoZG4nKTtcbiAgICB9XG5cbiAgICBDbG91ZGluYXJ5UGlja2VyLnJlbmRlckl0ZW1zKCk7XG5cbiAgICBpZiAobWV0YURhdGEudG90YWwgPiBsaW1pdCkge1xuICAgICAgRG9tLnJlbW92ZUNsYXNzKGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKCdiYWMtLWNsb3VkaW5hcnktcGFnaW5hdGlvbi1jb250YWluZXInKSwgJ2hkbicpO1xuICAgICAgQ2xvdWRpbmFyeVBpY2tlci5yZW5kZXJQYWdpbmF0aW9uQnV0dG9ucygpO1xuICAgIH0gZWxzZSB7XG4gICAgICBEb20uYWRkQ2xhc3MoZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoJ2JhYy0tY2xvdWRpbmFyeS1wYWdpbmF0aW9uLWNvbnRhaW5lcicpLCAnaGRuJyk7XG4gICAgfVxuICB9XG59O1xubW9kdWxlLmV4cG9ydHMgPSBDbG91ZGluYXJ5UGlja2VyOyIsIlwidXNlIHN0cmljdFwiO1xuXG52YXIgRG9tID0ge1xuICBoYXNDbGFzczogZnVuY3Rpb24gaGFzQ2xhc3MoZWwsIGNsYXNzTmFtZSkge1xuICAgIGlmIChlbC5jbGFzc0xpc3QpIHJldHVybiBlbC5jbGFzc0xpc3QuY29udGFpbnMoY2xhc3NOYW1lKTtlbHNlIHJldHVybiBuZXcgUmVnRXhwKCcoXnwgKScgKyBjbGFzc05hbWUgKyAnKCB8JCknLCAnZ2knKS50ZXN0KGVsLmNsYXNzTmFtZSk7XG4gIH0sXG4gIHJlbW92ZUNsYXNzOiBmdW5jdGlvbiByZW1vdmVDbGFzcyhlbCwgY2xhc3NOYW1lKSB7XG4gICAgaWYgKGVsLmNsYXNzTGlzdCkgZWwuY2xhc3NMaXN0LnJlbW92ZShjbGFzc05hbWUpO2Vsc2UgZWwuY2xhc3NOYW1lID0gZWwuY2xhc3NOYW1lLnJlcGxhY2UobmV3IFJlZ0V4cCgnKF58XFxcXGIpJyArIGNsYXNzTmFtZS5zcGxpdCgnICcpLmpvaW4oJ3wnKSArICcoXFxcXGJ8JCknLCAnZ2knKSwgJyAnKTtcbiAgfSxcbiAgYWRkQ2xhc3M6IGZ1bmN0aW9uIGFkZENsYXNzKGVsLCBjbGFzc05hbWUpIHtcbiAgICBpZiAoZWwuY2xhc3NMaXN0KSBlbC5jbGFzc0xpc3QuYWRkKGNsYXNzTmFtZSk7ZWxzZSBlbC5jbGFzc05hbWUgKz0gJyAnICsgY2xhc3NOYW1lO1xuICB9LFxuICB0b2dnbGVDbGFzczogZnVuY3Rpb24gdG9nZ2xlQ2xhc3MoZWwsIGNsYXNzTmFtZSkge1xuICAgIGlmICh0aGlzLmhhc0NsYXNzKGVsLCBjbGFzc05hbWUpKSB7XG4gICAgICB0aGlzLnJlbW92ZUNsYXNzKGVsLCBjbGFzc05hbWUpO1xuICAgIH0gZWxzZSB7XG4gICAgICB0aGlzLmFkZENsYXNzKGVsLCBjbGFzc05hbWUpO1xuICAgIH1cbiAgfVxufTtcbm1vZHVsZS5leHBvcnRzID0gRG9tOyIsIlwidXNlIHN0cmljdFwiO1xuXG52YXIgZG9tID0gcmVxdWlyZSgnLi9kb20nKTtcblxudmFyIGRlZmF1bHRIaWRlSW4gPSA1MDAwO1xudmFyIGxhc3RJbmRleCA9IDE7XG52YXIgbnVtT2ZJbmZvQmxvY2tzID0gMTA7XG52YXIgaW5mb0Jsb2NrcyA9IFtdO1xudmFyIEluZm9Db250cm9sbGVyID0ge1xuICByZW5kZXJJbmZvQmxvY2tzOiBmdW5jdGlvbiByZW5kZXJJbmZvQmxvY2tzKCkge1xuICAgIHZhciBibG9ja3NUZW1wbGF0ZSA9IGZ1bmN0aW9uIGJsb2Nrc1RlbXBsYXRlKGluZGV4KSB7XG4gICAgICByZXR1cm4gXCJcXG5cXHRcXHRcXHRcXHQgPGRpdiBjbGFzcz1cXFwiYmFjLS1wdXJlc2RrLWluZm8tYm94LS1cXFwiIGlkPVxcXCJiYWMtLXB1cmVzZGstaW5mby1ib3gtLVwiLmNvbmNhdChpbmRleCwgXCJcXFwiPlxcblxcdFxcdFxcdFxcdCBcXHQ8ZGl2IGNsYXNzPVxcXCJiYWMtLXRpbWVyXFxcIiBpZD1cXFwiYmFjLS10aW1lclwiKS5jb25jYXQoaW5kZXgsIFwiXFxcIj48L2Rpdj5cXG5cXHRcXHRcXHRcXHRcXHQgPGRpdiBjbGFzcz1cXFwiYmFjLS1pbm5lci1pbmZvLWJveC0tXFxcIj5cXG5cXHRcXHRcXHRcXHRcXHQgXFx0XFx0PGRpdiBjbGFzcz1cXFwiYmFjLS1pbmZvLWljb24tLSBmYS1zdWNjZXNzXFxcIj48L2Rpdj5cXG5cXHRcXHRcXHRcXHRcXHQgXFx0XFx0PGRpdiBjbGFzcz1cXFwiYmFjLS1pbmZvLWljb24tLSBmYS13YXJuaW5nXFxcIj48L2Rpdj5cXG5cXHRcXHRcXHRcXHRcXHQgXFx0XFx0PGRpdiBjbGFzcz1cXFwiYmFjLS1pbmZvLWljb24tLSBmYS1pbmZvLTFcXFwiPjwvZGl2PlxcblxcdFxcdFxcdFxcdFxcdCBcXHRcXHQ8ZGl2IGNsYXNzPVxcXCJiYWMtLWluZm8taWNvbi0tIGZhLWVycm9yXFxcIj48L2Rpdj5cXG5cXHRcXHRcXHRcXHRcXHQgXFx0XFx0IDxkaXYgY2xhc3M9XFxcImJhYy0taW5mby1tYWluLXRleHQtLVxcXCIgaWQ9XFxcImJhYy0taW5mby1tYWluLXRleHQtLVwiKS5jb25jYXQoaW5kZXgsIFwiXFxcIj48L2Rpdj5cXG5cXHRcXHRcXHRcXHRcXHQgXFx0XFx0IDxkaXYgY2xhc3M9XFxcImJhYy0taW5mby1jbG9zZS1idXR0b24tLSBmYS1jbG9zZS0xXFxcIiBpZD1cXFwiYmFjLS1pbmZvLWNsb3NlLWJ1dHRvbi0tXCIpLmNvbmNhdChpbmRleCwgXCJcXFwiPjwvZGl2PlxcblxcdFxcdFxcdFxcdFxcdDwvZGl2PlxcblxcdFxcdFxcdFxcdDwvZGl2PlxcblxcdFxcdCAgXCIpO1xuICAgIH07XG5cbiAgICB2YXIgaW5mb0Jsb2Nrc1dyYXBwZXIgPSBkb2N1bWVudC5nZXRFbGVtZW50QnlJZCgnYmFjLS1pbmZvLWJsb2Nrcy13cmFwcGVyLS0nKTtcbiAgICB2YXIgaW5uZXJIdG1sID0gJyc7XG5cbiAgICBmb3IgKHZhciBpID0gMTsgaSA8IG51bU9mSW5mb0Jsb2NrczsgaSsrKSB7XG4gICAgICBpbm5lckh0bWwgKz0gYmxvY2tzVGVtcGxhdGUoaSk7XG4gICAgfVxuXG4gICAgaW5mb0Jsb2Nrc1dyYXBwZXIuaW5uZXJIVE1MID0gaW5uZXJIdG1sO1xuICB9LFxuICBpbml0OiBmdW5jdGlvbiBpbml0KCkge1xuICAgIGZvciAodmFyIGkgPSAxOyBpIDwgbnVtT2ZJbmZvQmxvY2tzOyBpKyspIHtcbiAgICAgIChmdW5jdGlvbiB4KGkpIHtcbiAgICAgICAgdmFyIGNsb3NlRnVuY3Rpb24gPSBmdW5jdGlvbiBjbG9zZUZ1bmN0aW9uKCkge1xuICAgICAgICAgIGRvbS5yZW1vdmVDbGFzcyhkb2N1bWVudC5nZXRFbGVtZW50QnlJZCgnYmFjLS1wdXJlc2RrLWluZm8tYm94LS0nICsgaSksICdiYWMtLWFjdGl2ZS0tJyk7XG4gICAgICAgICAgZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoJ2JhYy0tdGltZXInICsgaSkuc3R5bGUudHJhbnNpdGlvbiA9ICcnO1xuICAgICAgICAgIGRvbS5yZW1vdmVDbGFzcyhkb2N1bWVudC5nZXRFbGVtZW50QnlJZCgnYmFjLS10aW1lcicgKyBpKSwgJ2JhYy0tZnVsbHdpZHRoJyk7XG4gICAgICAgICAgaW5mb0Jsb2Nrc1tpIC0gMV0uaW5Vc2UgPSBmYWxzZTtcbiAgICAgICAgICBzZXRUaW1lb3V0KGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgIGlmIChpbmZvQmxvY2tzW2kgLSAxXS5jbG9zZVRpbWVvdXQpIHtcbiAgICAgICAgICAgICAgY2xlYXJUaW1lb3V0KGluZm9CbG9ja3NbaSAtIDFdLmNsb3NlVGltZW91dCk7XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIGRvbS5yZW1vdmVDbGFzcyhkb2N1bWVudC5nZXRFbGVtZW50QnlJZCgnYmFjLS1wdXJlc2RrLWluZm8tYm94LS0nICsgaSksICdiYWMtLXN1Y2Nlc3MnKTtcbiAgICAgICAgICAgIGRvbS5yZW1vdmVDbGFzcyhkb2N1bWVudC5nZXRFbGVtZW50QnlJZCgnYmFjLS1wdXJlc2RrLWluZm8tYm94LS0nICsgaSksICdiYWMtLWluZm8nKTtcbiAgICAgICAgICAgIGRvbS5yZW1vdmVDbGFzcyhkb2N1bWVudC5nZXRFbGVtZW50QnlJZCgnYmFjLS1wdXJlc2RrLWluZm8tYm94LS0nICsgaSksICdiYWMtLXdhcm5pbmcnKTtcbiAgICAgICAgICAgIGRvbS5yZW1vdmVDbGFzcyhkb2N1bWVudC5nZXRFbGVtZW50QnlJZCgnYmFjLS1wdXJlc2RrLWluZm8tYm94LS0nICsgaSksICdiYWMtLWVycm9yJyk7XG4gICAgICAgICAgfSwgNDUwKTtcbiAgICAgICAgfTtcblxuICAgICAgICB2YXIgYWRkVGV4dCA9IGZ1bmN0aW9uIGFkZFRleHQodGV4dCkge1xuICAgICAgICAgIGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKCdiYWMtLWluZm8tbWFpbi10ZXh0LS0nICsgaSkuaW5uZXJIVE1MID0gdGV4dDtcbiAgICAgICAgfTtcblxuICAgICAgICB2YXIgYWRkVGltZW91dCA9IGZ1bmN0aW9uIGFkZFRpbWVvdXQodGltZW91dE1zZWNzKSB7XG4gICAgICAgICAgZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoJ2JhYy0tdGltZXInICsgaSkuc3R5bGUudHJhbnNpdGlvbiA9ICd3aWR0aCAnICsgdGltZW91dE1zZWNzICsgJ21zJztcbiAgICAgICAgICBkb20uYWRkQ2xhc3MoZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoJ2JhYy0tdGltZXInICsgaSksICdiYWMtLWZ1bGx3aWR0aCcpO1xuICAgICAgICAgIGluZm9CbG9ja3NbaSAtIDFdLmNsb3NlVGltZW91dCA9IHNldFRpbWVvdXQoZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgaW5mb0Jsb2Nrc1tpIC0gMV0uY2xvc2VGdW5jdGlvbigpO1xuICAgICAgICAgIH0sIHRpbWVvdXRNc2Vjcyk7XG4gICAgICAgIH07XG5cbiAgICAgICAgaW5mb0Jsb2Nrcy5wdXNoKHtcbiAgICAgICAgICBpZDogaSxcbiAgICAgICAgICBpblVzZTogZmFsc2UsXG4gICAgICAgICAgZWxlbWVudDogZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoJ2JhYy0tcHVyZXNkay1pbmZvLWJveC0tJyArIGkpLFxuICAgICAgICAgIGNsb3NlRnVuY3Rpb246IGNsb3NlRnVuY3Rpb24sXG4gICAgICAgICAgYWRkVGV4dDogYWRkVGV4dCxcbiAgICAgICAgICBhZGRUaW1lb3V0OiBhZGRUaW1lb3V0LFxuICAgICAgICAgIGNsb3NlVGltZW91dDogZmFsc2VcbiAgICAgICAgfSk7XG5cbiAgICAgICAgZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoJ2JhYy0taW5mby1jbG9zZS1idXR0b24tLScgKyBpKS5vbmNsaWNrID0gZnVuY3Rpb24gKGUpIHtcbiAgICAgICAgICBjbG9zZUZ1bmN0aW9uKGkpO1xuICAgICAgICB9O1xuICAgICAgfSkoaSk7XG4gICAgfVxuICB9LFxuXG4gIC8qXG4gICB0eXBlOiBvbmUgb2Y6XG4gIFx0LSBzdWNjZXNzXG4gIFx0LSBpbmZvXG4gIFx0LSB3YXJuaW5nXG4gIFx0LSBlcnJvclxuICAgdGV4dDogdGhlIHRleHQgdG8gZGlzcGxheVxuICAgb3B0aW9ucyAob3B0aW9uYWwpOiB7XG4gICBcdFx0aGlkZUluOiBtaWxsaXNlY29uZHMgdG8gaGlkZSBpdC4gLTEgZm9yIG5vdCBoaWRpbmcgaXQgYXQgYWxsLiBEZWZhdWx0IGlzIDUwMDBcbiAgIH1cbiAgICovXG4gIHNob3dJbmZvOiBmdW5jdGlvbiBzaG93SW5mbyh0eXBlLCB0ZXh0LCBvcHRpb25zKSB7XG4gICAgZm9yICh2YXIgaSA9IDA7IGkgPCBudW1PZkluZm9CbG9ja3M7IGkrKykge1xuICAgICAgdmFyIGluZm9CbG9jayA9IGluZm9CbG9ja3NbaV07XG5cbiAgICAgIGlmICghaW5mb0Jsb2NrLmluVXNlKSB7XG4gICAgICAgIGluZm9CbG9jay5pblVzZSA9IHRydWU7XG4gICAgICAgIGluZm9CbG9jay5lbGVtZW50LnN0eWxlLnpJbmRleCA9IGxhc3RJbmRleDtcbiAgICAgICAgaW5mb0Jsb2NrLmFkZFRleHQodGV4dCk7XG4gICAgICAgIGxhc3RJbmRleCArPSAxO1xuICAgICAgICB2YXIgdGltZW91dG1TZWNzID0gZGVmYXVsdEhpZGVJbjtcbiAgICAgICAgdmFyIGF1dG9DbG9zZSA9IHRydWU7XG5cbiAgICAgICAgaWYgKG9wdGlvbnMpIHtcbiAgICAgICAgICBpZiAob3B0aW9ucy5oaWRlSW4gIT0gbnVsbCAmJiBvcHRpb25zLmhpZGVJbiAhPSB1bmRlZmluZWQgJiYgb3B0aW9ucy5oaWRlSW4gIT0gLTEpIHtcbiAgICAgICAgICAgIHRpbWVvdXRtU2VjcyA9IG9wdGlvbnMuaGlkZUluO1xuICAgICAgICAgIH0gZWxzZSBpZiAob3B0aW9ucy5oaWRlSW4gPT09IC0xKSB7XG4gICAgICAgICAgICBhdXRvQ2xvc2UgPSBmYWxzZTtcbiAgICAgICAgICB9XG4gICAgICAgIH1cblxuICAgICAgICBpZiAoYXV0b0Nsb3NlKSB7XG4gICAgICAgICAgaW5mb0Jsb2NrLmFkZFRpbWVvdXQodGltZW91dG1TZWNzKTtcbiAgICAgICAgfVxuXG4gICAgICAgIGRvbS5hZGRDbGFzcyhpbmZvQmxvY2suZWxlbWVudCwgJ2JhYy0tJyArIHR5cGUpO1xuICAgICAgICBkb20uYWRkQ2xhc3MoaW5mb0Jsb2NrLmVsZW1lbnQsICdiYWMtLWFjdGl2ZS0tJyk7XG4gICAgICAgIHJldHVybjtcbiAgICAgIH1cbiAgICB9XG4gIH1cbn07XG5tb2R1bGUuZXhwb3J0cyA9IEluZm9Db250cm9sbGVyOyIsIlwidXNlIHN0cmljdFwiO1xuXG52YXIgU3RvcmUgPSByZXF1aXJlKCcuL3N0b3JlLmpzJyk7XG5cbnZhciBMb2dnZXIgPSB7XG4gIGxvZzogZnVuY3Rpb24gbG9nKHdoYXQpIHtcbiAgICBpZiAoIVN0b3JlLmxvZ3NFbmFibGVkKCkpIHtcbiAgICAgIHJldHVybiBmYWxzZTtcbiAgICB9IGVsc2Uge1xuICAgICAgTG9nZ2VyLmxvZyA9IGNvbnNvbGUubG9nLmJpbmQoY29uc29sZSk7XG4gICAgICBMb2dnZXIubG9nKHdoYXQpO1xuICAgIH1cbiAgfSxcbiAgZXJyb3I6IGZ1bmN0aW9uIGVycm9yKGVycikge1xuICAgIGlmICghU3RvcmUubG9nc0VuYWJsZWQoKSkge1xuICAgICAgcmV0dXJuIGZhbHNlO1xuICAgIH0gZWxzZSB7XG4gICAgICBMb2dnZXIuZXJyb3IgPSBjb25zb2xlLmVycm9yLmJpbmQoY29uc29sZSk7XG4gICAgICBMb2dnZXIuZXJyb3IoZXJyKTtcbiAgICB9XG4gIH1cbn07XG5tb2R1bGUuZXhwb3J0cyA9IExvZ2dlcjsiLCJcInVzZSBzdHJpY3RcIjtcblxudmFyIHNldHRpbmdzID0ge1xuICB0b3RhbFBhZ2VCdXR0b25zTnVtYmVyOiA4XG59O1xudmFyIFBhZ2luYXRvciA9IHtcbiAgc2V0U2V0dGluZ3M6IGZ1bmN0aW9uIHNldFNldHRpbmdzKHNldHRpbmcpIHtcbiAgICBmb3IgKHZhciBrZXkgaW4gc2V0dGluZykge1xuICAgICAgc2V0dGluZ3Nba2V5XSA9IHNldHRpbmdba2V5XTtcbiAgICB9XG4gIH0sXG4gIGdldFBhZ2VzUmFuZ2U6IGZ1bmN0aW9uIGdldFBhZ2VzUmFuZ2UoY3VycGFnZSwgdG90YWxQYWdlc09uUmVzdWx0U2V0KSB7XG4gICAgdmFyIHBhZ2VSYW5nZSA9IFt7XG4gICAgICBwYWdlbm86IGN1cnBhZ2UsXG4gICAgICBydW5uaW5ncGFnZTogdHJ1ZVxuICAgIH1dO1xuICAgIHZhciBoYXNuZXh0b25yaWdodCA9IHRydWU7XG4gICAgdmFyIGhhc25leHRvbmxlZnQgPSB0cnVlO1xuICAgIHZhciBpID0gMTtcblxuICAgIHdoaWxlIChwYWdlUmFuZ2UubGVuZ3RoIDwgc2V0dGluZ3MudG90YWxQYWdlQnV0dG9uc051bWJlciAmJiAoaGFzbmV4dG9ucmlnaHQgfHwgaGFzbmV4dG9ubGVmdCkpIHtcbiAgICAgIGlmIChoYXNuZXh0b25sZWZ0KSB7XG4gICAgICAgIGlmIChjdXJwYWdlIC0gaSA+IDApIHtcbiAgICAgICAgICBwYWdlUmFuZ2UucHVzaCh7XG4gICAgICAgICAgICBwYWdlbm86IGN1cnBhZ2UgLSBpLFxuICAgICAgICAgICAgcnVubmluZ3BhZ2U6IGZhbHNlXG4gICAgICAgICAgfSk7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgaGFzbmV4dG9ubGVmdCA9IGZhbHNlO1xuICAgICAgICB9XG4gICAgICB9XG5cbiAgICAgIGlmIChoYXNuZXh0b25yaWdodCkge1xuICAgICAgICBpZiAoY3VycGFnZSArIGkgLSAxIDwgdG90YWxQYWdlc09uUmVzdWx0U2V0KSB7XG4gICAgICAgICAgcGFnZVJhbmdlLnB1c2goe1xuICAgICAgICAgICAgcGFnZW5vOiBjdXJwYWdlICsgaSxcbiAgICAgICAgICAgIHJ1bm5pbmdwYWdlOiBmYWxzZVxuICAgICAgICAgIH0pO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgIGhhc25leHRvbnJpZ2h0ID0gZmFsc2U7XG4gICAgICAgIH1cbiAgICAgIH1cblxuICAgICAgaSsrO1xuICAgIH1cblxuICAgIHZhciBoYXNOZXh0ID0gY3VycGFnZSA8IHRvdGFsUGFnZXNPblJlc3VsdFNldDtcbiAgICB2YXIgaGFzUHJldmlvdXMgPSBjdXJwYWdlID4gMTtcbiAgICByZXR1cm4ge1xuICAgICAgYnV0dG9uczogcGFnZVJhbmdlLnNvcnQoZnVuY3Rpb24gKGl0ZW1BLCBpdGVtQikge1xuICAgICAgICByZXR1cm4gaXRlbUEucGFnZW5vIC0gaXRlbUIucGFnZW5vO1xuICAgICAgfSksXG4gICAgICBoYXNOZXh0OiBoYXNOZXh0LFxuICAgICAgaGFzUHJldmlvdXM6IGhhc1ByZXZpb3VzXG4gICAgfTtcbiAgfVxufTtcbm1vZHVsZS5leHBvcnRzID0gUGFnaW5hdG9yOyIsIid1c2Ugc3RyaWN0JztcblxudmFyIFN0b3JlID0gcmVxdWlyZSgnLi9zdG9yZS5qcycpO1xuXG52YXIgTG9nZ2VyID0gcmVxdWlyZSgnLi9sb2dnZXIuanMnKTtcblxudmFyIGF2YWlsYWJsZUxpc3RlbmVycyA9IHtcbiAgc2VhcmNoS2V5VXA6IHtcbiAgICBpbmZvOiAnTGlzdGVuZXIgb24ga2V5VXAgb2Ygc2VhcmNoIGlucHV0IG9uIHRvcCBiYXInXG4gIH0sXG4gIHNlYXJjaEVudGVyOiB7XG4gICAgaW5mbzogJ0xpc3RlbmVyIG9uIGVudGVyIGtleSBwcmVzc2VkIG9uIHNlYXJjaCBpbnB1dCBvbiB0b3AgYmFyJ1xuICB9LFxuICBzZWFyY2hPbkNoYW5nZToge1xuICAgIGluZm86ICdMaXN0ZW5lciBvbiBjaGFuZ2Ugb2YgaW5wdXQgdmFsdWUnXG4gIH1cbn07XG52YXIgUHViU3ViID0ge1xuICBnZXRBdmFpbGFibGVMaXN0ZW5lcnM6IGZ1bmN0aW9uIGdldEF2YWlsYWJsZUxpc3RlbmVycygpIHtcbiAgICByZXR1cm4gYXZhaWxhYmxlTGlzdGVuZXJzO1xuICB9LFxuICBzdWJzY3JpYmU6IGZ1bmN0aW9uIHN1YnNjcmliZShldmVudHQsIGZ1bmN0KSB7XG4gICAgaWYgKGV2ZW50dCA9PT0gXCJzZWFyY2hLZXlVcFwiKSB7XG4gICAgICB2YXIgZWwgPSBkb2N1bWVudC5nZXRFbGVtZW50QnlJZChTdG9yZS5nZXRTZWFyY2hJbnB1dElkKCkpO1xuICAgICAgZWwuYWRkRXZlbnRMaXN0ZW5lcigna2V5dXAnLCBmdW5jdCk7XG4gICAgICByZXR1cm4gZnVuY3Rpb24gKCkge1xuICAgICAgICBlbC5yZW1vdmVFdmVudExpc3RlbmVyKCdrZXl1cCcsIGZ1bmN0LCBmYWxzZSk7XG4gICAgICB9O1xuICAgIH0gZWxzZSBpZiAoZXZlbnR0ID09PSAnc2VhcmNoRW50ZXInKSB7XG4gICAgICB2YXIgaGFuZGxpbmdGdW5jdCA9IGZ1bmN0aW9uIGhhbmRsaW5nRnVuY3QoZSkge1xuICAgICAgICBpZiAoZS5rZXlDb2RlID09PSAxMykge1xuICAgICAgICAgIGZ1bmN0KGUpO1xuICAgICAgICB9XG4gICAgICB9O1xuXG4gICAgICBlbC5hZGRFdmVudExpc3RlbmVyKCdrZXlkb3duJywgaGFuZGxpbmdGdW5jdCk7XG4gICAgICByZXR1cm4gZnVuY3Rpb24gKCkge1xuICAgICAgICBlbC5yZW1vdmVFdmVudExpc3RlbmVyKCdrZXlkb3duJywgaGFuZGxpbmdGdW5jdCwgZmFsc2UpO1xuICAgICAgfTtcbiAgICB9IGVsc2UgaWYgKGV2ZW50dCA9PT0gJ3NlYXJjaE9uQ2hhbmdlJykge1xuICAgICAgdmFyIGVsID0gZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoU3RvcmUuZ2V0U2VhcmNoSW5wdXRJZCgpKTtcbiAgICAgIGVsLmFkZEV2ZW50TGlzdGVuZXIoJ2NoYW5nZScsIGZ1bmN0KTtcbiAgICAgIHJldHVybiBmdW5jdGlvbiAoKSB7XG4gICAgICAgIGVsLnJlbW92ZUV2ZW50TGlzdGVuZXIoJ2tleXVwJywgZnVuY3QsIGZhbHNlKTtcbiAgICAgIH07XG4gICAgfSBlbHNlIHtcbiAgICAgIExvZ2dlci5lcnJvcignVGhlIGV2ZW50IHlvdSB0cmllZCB0byBzdWJzY3JpYmUgaXMgbm90IGF2YWlsYWJsZSBieSB0aGUgbGlicmFyeScpO1xuICAgICAgTG9nZ2VyLmxvZygnVGhlIGF2YWlsYWJsZSBldmVudHMgYXJlOiAnLCBhdmFpbGFibGVMaXN0ZW5lcnMpO1xuICAgICAgcmV0dXJuIGZ1bmN0aW9uICgpIHt9O1xuICAgIH1cbiAgfVxufTtcbm1vZHVsZS5leHBvcnRzID0gUHViU3ViOyIsIlwidXNlIHN0cmljdFwiO1xuXG52YXIgc3RhdGUgPSB7XG4gIGdlbmVyYWw6IHtcbiAgICBmdWxsV2lkdGg6IGZhbHNlLFxuICAgIGRpc3BsYXlTdXBwb3J0OiBmYWxzZVxuICB9LFxuICB1c2VyRGF0YToge30sXG4gIGNvbmZpZ3VyYXRpb246IHtcbiAgICBzZXNzaW9uRW5kcG9pbnQ6ICdzZXNzaW9uJyxcbiAgICBiYXNlVXJsOiAnL2FwaS92MSdcbiAgfSxcbiAgaHRtbFRlbXBsYXRlOiBcIlwiLFxuICBhcHBzOiBudWxsLFxuICB2ZXJzaW9uTnVtYmVyOiAnJyxcbiAgZGV2OiBmYWxzZSxcbiAgZmlsZVBpY2tlcjoge1xuICAgIHNlbGVjdGVkRmlsZTogbnVsbFxuICB9LFxuICBhcHBJbmZvOiBudWxsLFxuICBzZXNzaW9uRW5kcG9pbnRCeVVzZXI6IGZhbHNlXG59O1xuXG5mdW5jdGlvbiBhc3NlbWJsZShsaXRlcmFsLCBwYXJhbXMpIHtcbiAgcmV0dXJuIG5ldyBGdW5jdGlvbihwYXJhbXMsIFwicmV0dXJuIGBcIiArIGxpdGVyYWwgKyBcImA7XCIpO1xufVxuXG52YXIgU3RvcmUgPSB7XG4gIGdldFN0YXRlOiBmdW5jdGlvbiBnZXRTdGF0ZSgpIHtcbiAgICByZXR1cm4gT2JqZWN0LmFzc2lnbih7fSwgc3RhdGUpO1xuICB9LFxuICBzZXRXaW5kb3dOYW1lOiBmdW5jdGlvbiBzZXRXaW5kb3dOYW1lKHduKSB7XG4gICAgc3RhdGUuZ2VuZXJhbC53aW5kb3dOYW1lID0gd247XG4gIH0sXG4gIHNldEZ1bGxXaWR0aDogZnVuY3Rpb24gc2V0RnVsbFdpZHRoKGZ3KSB7XG4gICAgc3RhdGUuZ2VuZXJhbC5mdWxsV2lkdGggPSBmdztcbiAgfSxcbiAgc2V0RGlzcGxheVN1cHBvcnQ6IGZ1bmN0aW9uIHNldERpc3BsYXlTdXBwb3J0KGRpc3BsYXkpIHtcbiAgICBzdGF0ZS5nZW5lcmFsLmRpc3BsYXlTdXBwb3J0ID0gZGlzcGxheTtcbiAgfSxcbiAgc2V0RGV2OiBmdW5jdGlvbiBzZXREZXYoZGV2KSB7XG4gICAgc3RhdGUuZGV2ID0gZGV2O1xuICB9LFxuICBzZXRVcmxWZXJzaW9uUHJlZml4OiBmdW5jdGlvbiBzZXRVcmxWZXJzaW9uUHJlZml4KHByZWZpeCkge1xuICAgIHN0YXRlLmNvbmZpZ3VyYXRpb24uYmFzZVVybCA9IHByZWZpeDtcbiAgfSxcbiAgZ2V0RGV2VXJsUGFydDogZnVuY3Rpb24gZ2V0RGV2VXJsUGFydCgpIHtcbiAgICBpZiAoc3RhdGUuZGV2KSB7XG4gICAgICByZXR1cm4gXCJzYW5kYm94L1wiO1xuICAgIH0gZWxzZSB7XG4gICAgICByZXR1cm4gXCJcIjtcbiAgICB9XG4gIH0sXG4gIGdldEZ1bGxCYXNlVXJsOiBmdW5jdGlvbiBnZXRGdWxsQmFzZVVybCgpIHtcbiAgICByZXR1cm4gc3RhdGUuY29uZmlndXJhdGlvbi5yb290VXJsICsgc3RhdGUuY29uZmlndXJhdGlvbi5iYXNlVXJsICsgU3RvcmUuZ2V0RGV2VXJsUGFydCgpO1xuICB9LFxuXG4gIC8qXG4gICBjb25mOlxuICAgLSBoZWFkZXJEaXZJZFxuICAgLSBpbmNsdWRlQXBwc01lbnVcbiAgICovXG4gIHNldENvbmZpZ3VyYXRpb246IGZ1bmN0aW9uIHNldENvbmZpZ3VyYXRpb24oY29uZikge1xuICAgIGZvciAodmFyIGtleSBpbiBjb25mKSB7XG4gICAgICBzdGF0ZS5jb25maWd1cmF0aW9uW2tleV0gPSBjb25mW2tleV07XG4gICAgfVxuICB9LFxuICBzZXRWZXJzaW9uTnVtYmVyOiBmdW5jdGlvbiBzZXRWZXJzaW9uTnVtYmVyKHZlcnNpb24pIHtcbiAgICBzdGF0ZS52ZXJzaW9uTnVtYmVyID0gdmVyc2lvbjtcbiAgfSxcbiAgZ2V0VmVyc2lvbk51bWJlcjogZnVuY3Rpb24gZ2V0VmVyc2lvbk51bWJlcigpIHtcbiAgICByZXR1cm4gc3RhdGUudmVyc2lvbk51bWJlcjtcbiAgfSxcbiAgZ2V0QXBwc1Zpc2libGU6IGZ1bmN0aW9uIGdldEFwcHNWaXNpYmxlKCkge1xuICAgIGlmIChzdGF0ZS5jb25maWd1cmF0aW9uLmFwcHNWaXNpYmxlID09PSBudWxsIHx8IHN0YXRlLmNvbmZpZ3VyYXRpb24uYXBwc1Zpc2libGUgPT09IHVuZGVmaW5lZCkge1xuICAgICAgcmV0dXJuIHRydWU7XG4gICAgfSBlbHNlIHtcbiAgICAgIHJldHVybiBzdGF0ZS5jb25maWd1cmF0aW9uLmFwcHNWaXNpYmxlO1xuICAgIH1cbiAgfSxcbiAgc2V0QXBwc1Zpc2libGU6IGZ1bmN0aW9uIHNldEFwcHNWaXNpYmxlKGFwcHNWaXNpYmxlKSB7XG4gICAgc3RhdGUuY29uZmlndXJhdGlvbi5hcHBzVmlzaWJsZSA9IGFwcHNWaXNpYmxlO1xuICB9LFxuICBzZXRIVE1MVGVtcGxhdGU6IGZ1bmN0aW9uIHNldEhUTUxUZW1wbGF0ZSh0ZW1wbGF0ZSkge1xuICAgIHN0YXRlLmh0bWxUZW1wbGF0ZSA9IHRlbXBsYXRlO1xuICB9LFxuICBzZXRBcHBzOiBmdW5jdGlvbiBzZXRBcHBzKGFwcHMpIHtcbiAgICBzdGF0ZS5hcHBzID0gYXBwcztcbiAgfSxcbiAgc2V0QXBwSW5mbzogZnVuY3Rpb24gc2V0QXBwSW5mbyhhcHBJbmZvKSB7XG4gICAgc3RhdGUuYXBwSW5mbyA9IGFwcEluZm87XG4gIH0sXG4gIGdldEFwcEluZm86IGZ1bmN0aW9uIGdldEFwcEluZm8oKSB7XG4gICAgcmV0dXJuIHN0YXRlLmFwcEluZm87XG4gIH0sXG4gIGdldExvZ2luVXJsOiBmdW5jdGlvbiBnZXRMb2dpblVybCgpIHtcbiAgICByZXR1cm4gc3RhdGUuY29uZmlndXJhdGlvbi5yb290VXJsICsgc3RhdGUuY29uZmlndXJhdGlvbi5sb2dpblVybDsgLy8gKyBcIj9cIiArIHN0YXRlLmNvbmZpZ3VyYXRpb24ucmVkaXJlY3RVcmxQYXJhbSArIFwiPVwiICsgd2luZG93LmxvY2F0aW9uLmhyZWY7XG4gIH0sXG4gIGdldEF1dGhlbnRpY2F0aW9uRW5kcG9pbnQ6IGZ1bmN0aW9uIGdldEF1dGhlbnRpY2F0aW9uRW5kcG9pbnQoKSB7XG4gICAgaWYgKHN0YXRlLnNlc3Npb25FbmRwb2ludEJ5VXNlcikge1xuICAgICAgcmV0dXJuIFN0b3JlLmdldEZ1bGxCYXNlVXJsKCkgKyBzdGF0ZS5jb25maWd1cmF0aW9uLnNlc3Npb25FbmRwb2ludDtcbiAgICB9XG5cbiAgICByZXR1cm4gU3RvcmUuZ2V0RnVsbEJhc2VVcmwoKSArIHN0YXRlLmNvbmZpZ3VyYXRpb24uc2Vzc2lvbkVuZHBvaW50O1xuICB9LFxuICBnZXRTd2l0Y2hBY2NvdW50RW5kcG9pbnQ6IGZ1bmN0aW9uIGdldFN3aXRjaEFjY291bnRFbmRwb2ludChhY2NvdW50SWQpIHtcbiAgICByZXR1cm4gU3RvcmUuZ2V0RnVsbEJhc2VVcmwoKSArICdhY2NvdW50cy9zd2l0Y2gvJyArIGFjY291bnRJZDtcbiAgfSxcbiAgZ2V0QXBwc0VuZHBvaW50OiBmdW5jdGlvbiBnZXRBcHBzRW5kcG9pbnQoKSB7XG4gICAgcmV0dXJuIFN0b3JlLmdldEZ1bGxCYXNlVXJsKCkgKyAnYXBwcyc7XG4gIH0sXG4gIGdldENsb3VkaW5hcnlFbmRwb2ludDogZnVuY3Rpb24gZ2V0Q2xvdWRpbmFyeUVuZHBvaW50KCkge1xuICAgIHJldHVybiBTdG9yZS5nZXRGdWxsQmFzZVVybCgpICsgJ2Fzc2V0cyc7XG4gIH0sXG4gIGxvZ3NFbmFibGVkOiBmdW5jdGlvbiBsb2dzRW5hYmxlZCgpIHtcbiAgICByZXR1cm4gc3RhdGUuY29uZmlndXJhdGlvbi5sb2dzO1xuICB9LFxuICBnZXRTZWFyY2hJbnB1dElkOiBmdW5jdGlvbiBnZXRTZWFyY2hJbnB1dElkKCkge1xuICAgIHJldHVybiBzdGF0ZS5jb25maWd1cmF0aW9uLnNlYXJjaElucHV0SWQ7XG4gIH0sXG4gIHNldEhUTUxDb250YWluZXI6IGZ1bmN0aW9uIHNldEhUTUxDb250YWluZXIoaWQpIHtcbiAgICBzdGF0ZS5jb25maWd1cmF0aW9uLmhlYWRlckRpdklkID0gaWQ7XG4gIH0sXG4gIGdldEhUTE1Db250YWluZXI6IGZ1bmN0aW9uIGdldEhUTE1Db250YWluZXIoKSB7XG4gICAgaWYgKHN0YXRlLmNvbmZpZ3VyYXRpb24uaGVhZGVyRGl2SWQpIHtcbiAgICAgIHJldHVybiBzdGF0ZS5jb25maWd1cmF0aW9uLmhlYWRlckRpdklkO1xuICAgIH0gZWxzZSB7XG4gICAgICByZXR1cm4gXCJwcHNkay1jb250YWluZXJcIjtcbiAgICB9XG4gIH0sXG4gIGdldEhUTUw6IGZ1bmN0aW9uIGdldEhUTUwoKSB7XG4gICAgcmV0dXJuIHN0YXRlLmh0bWxUZW1wbGF0ZTtcbiAgfSxcbiAgc2V0U2Vzc2lvbkVuZHBvaW50OiBmdW5jdGlvbiBzZXRTZXNzaW9uRW5kcG9pbnQoc2Vzc2lvbkVuZHBvaW50KSB7XG4gICAgaWYgKHNlc3Npb25FbmRwb2ludC5pbmRleE9mKCcvJykgPT09IDApIHtcbiAgICAgIHNlc3Npb25FbmRwb2ludCA9IHNlc3Npb25FbmRwb2ludC5zdWJzdHJpbmcoMSwgc2Vzc2lvbkVuZHBvaW50Lmxlbmd0aCAtIDEpO1xuICAgIH1cblxuICAgIHN0YXRlLnNlc3Npb25FbmRwb2ludEJ5VXNlciA9IHRydWU7XG4gICAgc3RhdGUuY29uZmlndXJhdGlvbi5zZXNzaW9uRW5kcG9pbnQgPSBzZXNzaW9uRW5kcG9pbnQ7XG4gIH0sXG4gIGdldFdpbmRvd05hbWU6IGZ1bmN0aW9uIGdldFdpbmRvd05hbWUoKSB7XG4gICAgcmV0dXJuIHN0YXRlLmdlbmVyYWwud2luZG93TmFtZTtcbiAgfSxcbiAgZ2V0RnVsbFdpZHRoOiBmdW5jdGlvbiBnZXRGdWxsV2lkdGgoKSB7XG4gICAgcmV0dXJuIHN0YXRlLmdlbmVyYWwuZnVsbFdpZHRoO1xuICB9LFxuICBnZXREaXNwbGF5U3VwcG9ydDogZnVuY3Rpb24gZ2V0RGlzcGxheVN1cHBvcnQoKSB7XG4gICAgcmV0dXJuIHN0YXRlLmdlbmVyYWwuZGlzcGxheVN1cHBvcnQ7XG4gIH0sXG4gIHNldFVzZXJEYXRhOiBmdW5jdGlvbiBzZXRVc2VyRGF0YSh1c2VyRGF0YSkge1xuICAgIHN0YXRlLnVzZXJEYXRhID0gdXNlckRhdGE7XG4gIH0sXG4gIGdldFVzZXJEYXRhOiBmdW5jdGlvbiBnZXRVc2VyRGF0YSgpIHtcbiAgICByZXR1cm4gc3RhdGUudXNlckRhdGE7XG4gIH0sXG4gIHNldFJvb3RVcmw6IGZ1bmN0aW9uIHNldFJvb3RVcmwocm9vdFVybCkge1xuICAgIHN0YXRlLmNvbmZpZ3VyYXRpb24ucm9vdFVybCA9IHJvb3RVcmwucmVwbGFjZSgvXFwvPyQvLCAnLycpO1xuICAgIDtcbiAgfSxcbiAgZ2V0Um9vdFVybDogZnVuY3Rpb24gZ2V0Um9vdFVybCgpIHtcbiAgICByZXR1cm4gc3RhdGUuY29uZmlndXJhdGlvbi5yb290VXJsO1xuICB9LFxuICBnZXRBdmF0YXJVcGxvYWRVcmw6IGZ1bmN0aW9uIGdldEF2YXRhclVwbG9hZFVybCgpIHtcbiAgICByZXR1cm4gU3RvcmUuZ2V0RnVsbEJhc2VVcmwoKSArICdhc3NldHMvdXBsb2FkJztcbiAgfSxcbiAgZ2V0QXZhdGFyVXBkYXRlVXJsOiBmdW5jdGlvbiBnZXRBdmF0YXJVcGRhdGVVcmwoKSB7XG4gICAgcmV0dXJuIFN0b3JlLmdldEZ1bGxCYXNlVXJsKCkgKyAndXNlcnMvYXZhdGFyJztcbiAgfVxufTtcbm1vZHVsZS5leHBvcnRzID0gU3RvcmU7Il19
