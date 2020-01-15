(function(){function r(e,n,t){function o(i,f){if(!n[i]){if(!e[i]){var c="function"==typeof require&&require;if(!f&&c)return c(i,!0);if(u)return u(i,!0);var a=new Error("Cannot find module '"+i+"'");throw a.code="MODULE_NOT_FOUND",a}var p=n[i]={exports:{}};e[i][0].call(p.exports,function(r){var n=e[i][1][r];return o(n||r)},p,p.exports,r,e,n,t)}return n[i].exports}for(var u="function"==typeof require&&require,i=0;i<t.length;i++)o(t[i]);return o}return r})()({1:[function(require,module,exports){
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

},{}],2:[function(require,module,exports){
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

},{"asap/raw":1}],3:[function(require,module,exports){
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

},{"./core.js":2}],4:[function(require,module,exports){
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
},{"./core":2}],5:[function(require,module,exports){
"use strict";

var Logger = require('./modules/logger');

var PubSub = require('./modules/pubsub');

var Caller = require('./modules/caller');

var Dom = require('./modules/dom');

var InfoController = require('./modules/info-controller');

var AvatarController = require('./modules/avatar-controller');

var Store = require('./modules/store');

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
          ACG.initialise(result.user.account_sfid, function () {
            Dom.removeClass(document.getElementById('bac---invalid-account'), 'invalid');
          }, function () {
            Dom.addClass(document.getElementById('bac---invalid-account'), 'invalid');
          });
          PPBA.setupGoogleTag(result.user);

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
          ACG.initialise(result.user.account_sfid, function () {
            Dom.removeClass(document.getElementById('bac---invalid-account'), 'invalid');
          }, function () {
            Dom.addClass(document.getElementById('bac---invalid-account'), 'invalid');
          });
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
},{"./modules/account-consistency-guard":7,"./modules/avatar-controller":8,"./modules/caller":9,"./modules/cloudinary-image-picker":10,"./modules/dom":11,"./modules/info-controller":12,"./modules/logger":13,"./modules/pubsub":15,"./modules/store":16,"promise/lib/es6-extensions.js":3,"promise/lib/rejection-tracking":4}],6:[function(require,module,exports){
"use strict";

/*!
 * PureProfile PureProfile Business Apps Development SDK
 *
 * version: 2.9.5-rc2
 * date: 2020-01-15
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
ppba.setHTMLTemplate("<header class=\"bac--header-apps\" id=\"bac--puresdk-bac--header-apps--\">\n    <div class=\"bac--container\">\n        <div class=\"bac--logo\" id=\"bac--puresdk-account-logo--\">\n            <div class=\"bac--puresdk-app-name--\">\n                <svg width=\"8px\" height=\"12px\" viewBox=\"0 0 8 12\" version=\"1.1\" xmlns=\"http://www.w3.org/2000/svg\" xmlns:xlink=\"http://www.w3.org/1999/xlink\">\n                    <g id=\"PP-BA-Portal-Home_Desktop-v2\" stroke=\"none\" stroke-width=\"1\" fill=\"none\" fill-rule=\"evenodd\">\n                        <g id=\"PPCM-Listing_Connexion_01_Max_D\" transform=\"translate(-181.000000, -78.000000)\" fill=\"#333333\" fill-rule=\"nonzero\">\n                            <g id=\"elements-/-sdk-/-button-copy-3-elements-/-sdk-/-button\" transform=\"translate(164.000000, 70.000000)\">\n                                <g id=\"icons/apps/campaigns-icons-/-apps-/-40x40-/-back-arrow\" transform=\"translate(11.000000, 4.000000)\">\n                                    <g id=\"download-arrow\" transform=\"translate(6.500000, 4.000000)\">\n                                        <path d=\"M-0.882740944,2.77957989 C-1.25271133,2.4068067 -1.85255183,2.4068067 -2.22252221,2.77957989 C-2.5924926,3.15235308 -2.5924926,3.75673783 -2.22252221,4.12951102 L2.83010937,9.22042011 C3.20007975,9.5931933 3.79992025,9.5931933 4.16989063,9.22042011 L9.22252221,4.12951102 C9.5924926,3.75673783 9.5924926,3.15235308 9.22252221,2.77957989 C8.85255183,2.4068067 8.25271133,2.4068067 7.88274094,2.77957989 L3.5,7.19552342 L-0.882740944,2.77957989 Z\" id=\"Path\" transform=\"translate(3.500000, 6.000000) rotate(-270.000000) translate(-3.500000, -6.000000) \"></path>\n                                    </g>\n                                </g>\n                            </g>\n                        </g>\n                    </g>\n                </svg>\n                <a href=\"#\" id=\"app-name-link-to-root\">App Portal</a>\n            </div>\n        </div>\n        <div class=\"bac--user-actions\">\n            <svg id=\"bac--puresdk--loader--\" width=\"38\" height=\"38\" viewBox=\"0 0 44 44\" xmlns=\"http://www.w3.org/2000/svg\" stroke=\"#fff\" style=\"\n    margin-right: 10px;\n\">\n                <g fill=\"none\" fill-rule=\"evenodd\" stroke-width=\"2\">\n                    <circle cx=\"22\" cy=\"22\" r=\"16.6437\">\n                        <animate attributeName=\"r\" begin=\"0s\" dur=\"1.8s\" values=\"1; 20\" calcMode=\"spline\" keyTimes=\"0; 1\" keySplines=\"0.165, 0.84, 0.44, 1\" repeatCount=\"indefinite\"></animate>\n                        <animate attributeName=\"stroke-opacity\" begin=\"0s\" dur=\"1.8s\" values=\"1; 0\" calcMode=\"spline\" keyTimes=\"0; 1\" keySplines=\"0.3, 0.61, 0.355, 1\" repeatCount=\"indefinite\"></animate>\n                    </circle>\n                    <circle cx=\"22\" cy=\"22\" r=\"19.9282\">\n                        <animate attributeName=\"r\" begin=\"bac-0.9s\" dur=\"1.8s\" values=\"1; 20\" calcMode=\"spline\" keyTimes=\"0; 1\" keySplines=\"0.165, 0.84, 0.44, 1\" repeatCount=\"indefinite\"></animate>\n                        <animate attributeName=\"stroke-opacity\" begin=\"bac-0.9s\" dur=\"1.8s\" values=\"1; 0\" calcMode=\"spline\" keyTimes=\"0; 1\" keySplines=\"0.3, 0.61, 0.355, 1\" repeatCount=\"indefinite\"></animate>\n                    </circle>\n                </g>\n            </svg>\n            <div class=\"bac--user-apps\" id=\"bac--puresdk-apps-section--\">\n                <a href=\"/app/campaigns\" id=\"bac--puresdk-campaigns-link--\" class=\"bac--puresdk-apps-on-navbar-- disabled\">\n                    <svg width=\"15px\" height=\"13px\" viewBox=\"0 0 15 14\" version=\"1.1\" xmlns=\"http://www.w3.org/2000/svg\" xmlns:xlink=\"http://www.w3.org/1999/xlink\">\n                        <!-- Generator: sketchtool 59.1 (101010) - https://sketch.com -->\n                        <title>2C64AE75-AC40-4311-8482-F2D8736340F3</title>\n                        <desc>Created with sketchtool.</desc>\n                        <defs>\n                            <polygon id=\"path-1\" points=\"0 0.000150000007 14.3997498 0.000150000007 14.3997498 12.8996499 0 12.8996499\"></polygon>\n                        </defs>\n                        <g id=\"PP-BA-Portal-Home_Desktop-v2\" stroke=\"none\" stroke-width=\"1\" fill=\"none\" fill-rule=\"evenodd\">\n                            <g id=\"PPCM-Listing_Connexion_01_Max_D\" transform=\"translate(-1110.000000, -77.000000)\">\n                                <g id=\"elements-/-sdk-/-button\" transform=\"translate(1096.000000, 70.000000)\">\n                                    <g id=\"icons/apps/campaigns-icons-/-apps-/-40x40-/-campaigns\" transform=\"translate(11.000000, 4.000000)\">\n                                        <g id=\"Group-3\" transform=\"translate(3.000000, 3.500000)\">\n                                            <mask id=\"mask-2\" fill=\"white\">\n                                                <use xlink:href=\"#path-1\"></use>\n                                            </mask>\n                                            <g id=\"Clip-2\"></g>\n                                            <path d=\"M2.33325003,3.75364998 C2.04275003,3.85914998 1.79975004,4.03614998 1.59375004,4.28914998 C1.33325005,4.60914997 1.20625005,4.96664997 1.20625005,5.38214996 L1.20625005,5.55464996 C1.20625005,5.96914995 1.33275005,6.32164995 1.59175004,6.63114994 C1.79825004,6.87814994 2.04225003,7.05064994 2.33325003,7.15564994 L2.33325003,3.75364998 Z M5.78824989,7.24865008 C7.92024978,7.24865008 9.89574967,7.83565009 11.6667496,8.99365011 L11.6667496,1.83764998 C9.89424967,3.04715 7.89924978,3.65965001 5.73074989,3.65965001 L3.56875001,3.65965001 L3.56875001,7.24865008 L5.78824989,7.24865008 Z M5.29874986,12.8996499 C4.86124987,12.8996499 4.47474988,12.7356499 4.14924989,12.4111499 C3.8427499,12.1061499 3.6872499,11.7301499 3.6872499,11.2936499 L3.6872499,8.45164993 L3.05174992,8.45164993 L2.94074992,8.45414993 C2.12024994,8.45414993 1.42174996,8.17314993 0.865249977,7.61864994 C0.291249992,7.04664994 -0.000250000012,6.35214995 -0.000250000012,5.55464995 L-0.000250000012,5.38214996 C-0.000250000012,4.56514996 0.291749992,3.86514997 0.866249977,3.30264997 C1.44074996,2.74114998 2.13724994,2.45614998 2.93674992,2.45614998 L5.73074985,2.45614998 C8.05124979,2.45614998 10.1197497,1.68114999 11.8792497,0.152149999 C11.9757497,0.0556499995 12.1067497,0.000150000007 12.2492497,0.000150000007 C12.3367497,0.000150000007 12.4292497,0.0211499998 12.5237497,0.0631499995 C12.7452497,0.145149999 12.8732497,0.334149997 12.8732497,0.590149995 L12.8732497,4.14964997 L13.1342497,4.14964997 C13.4752496,4.14964997 13.7747496,4.27514996 14.0242496,4.52314996 C14.2687496,4.72114996 14.3997496,5.01464996 14.3997496,5.38214996 C14.3997496,5.74364995 14.2722496,6.04814995 14.0207496,6.28764995 C13.7717496,6.52414995 13.4737496,6.64414994 13.1342497,6.64414994 L12.8732497,6.64414994 L12.8732497,10.2031499 C12.8732497,10.4781499 12.7452497,10.6771499 12.5127497,10.7636499 L12.4427497,10.7761499 C12.3492497,10.7986499 12.3067497,10.8051499 12.2697497,10.8051499 C12.1567497,10.8051499 12.0352497,10.7666499 11.9077497,10.6911499 C10.1407497,9.19864992 8.09124979,8.45164993 5.78824985,8.45164993 L4.89374987,8.45164993 L4.89374987,11.2936499 C4.89374987,11.4131499 4.92974987,11.5046499 5.00774987,11.5826499 C5.08574987,11.6601499 5.17774986,11.6966499 5.29874986,11.6966499 C5.39824986,11.6966499 5.48874985,11.6546499 5.57524985,11.5681499 C5.66274985,11.4811499 5.70374985,11.3846499 5.70374985,11.2651499 L5.70374985,9.61464992 C5.70374985,9.23764992 5.92924984,9.01264993 6.30674983,9.01264993 C6.45274983,9.01264993 6.58924983,9.06814992 6.71324982,9.17764992 C6.84224982,9.29214992 6.91024982,9.44314992 6.91024982,9.61464992 L6.91024982,11.2651499 C6.91024982,11.6996499 6.75074982,12.0846499 6.43624983,12.4086499 C6.11974984,12.7346499 5.73674985,12.8996499 5.29874986,12.8996499 L5.29874986,12.8996499 Z\" id=\"Fill-1\" fill=\"#333333\" fill-rule=\"nonzero\" mask=\"url(#mask-2)\"></path>\n                                        </g>\n                                    </g>\n                                </g>\n                            </g>\n                        </g>\n                    </svg>\n                    Campaigns\n                </a>\n                <a href=\"/app/groups\" id=\"bac--puresdk-groups-link--\" class=\"bac--puresdk-apps-on-navbar-- disabled\">\n                    <svg width=\"20px\" height=\"13px\" viewBox=\"0 0 39 25\" version=\"1.1\" xmlns=\"http://www.w3.org/2000/svg\" xmlns:xlink=\"http://www.w3.org/1999/xlink\">\n                        <!-- Generator: sketchtool 59.1 (101010) - https://sketch.com -->\n                        <title>302C75BC-BD78-45AF-B6AC-110237650B8F</title>\n                        <desc>Created with sketchtool.</desc>\n                        <g id=\"PP-BA-Portal-Home_Desktop-v2\" stroke=\"none\" stroke-width=\"1\" fill=\"none\" fill-rule=\"evenodd\">\n                            <g id=\"PPCM-Listing_Connexion_01_Max_D\" transform=\"translate(-1244.000000, -71.000000)\" fill=\"#333333\" fill-rule=\"nonzero\">\n                                <g id=\"elements-/-sdk-/-button-copy-elements-/-sdk-/-button\" transform=\"translate(1243.000000, 70.000000)\">\n                                    <g id=\"icons/apps/campaigns-icons-/-apps-/-40x40-/-groups\" transform=\"translate(11.000000, 4.000000)\">\n                                        <g id=\"Group\" transform=\"translate(-9.250000, -2.250000)\">\n                                            <path d=\"M19.1151631,3 C22.8464491,3 26.1170825,6.2195122 26.1170825,9.91463415 C26.1170825,12.4756098 24.3205374,14.4878049 22.6161228,15.5121951 L22.6161228,16.1707317 L22.6161228,16.1707317 C22.9846449,16.3170732 23.6756238,16.5365854 24.4587332,16.7195122 L24.5047985,16.7195122 L24.5047985,16.7195122 C28.7888676,17.8536585 31,19.7560976 31,22.3536585 C30.9078695,23.0121951 30.3090211,24 29.1113244,24 L8.79654511,24 C7.59884837,24 7,23.0121951 7,22.3170732 C7,20.4878049 8.10556622,18.0365854 13.4491363,16.6829268 L13.4952015,16.6829268 L13.4952015,16.6829268 C14.2783109,16.5365854 14.9692898,16.3170732 15.2917466,16.2073171 L15.2917466,15.5121951 L15.2917466,15.5121951 C13.5873321,14.4512195 11.7907869,12.4756098 11.7907869,9.91463415 C11.7907869,6.2195122 15.0614203,3 18.7927063,3 L19.1151631,3 Z M19.1612284,5.67073171 L18.8387716,5.67073171 C16.9961612,5.67073171 15.2917466,7.7195122 15.2917466,9.87804878 C15.2917466,11.4512195 16.4894434,12.804878 17.6871401,13.4634146 C17.8253359,13.5365854 17.9174664,13.6097561 18.0095969,13.6829268 C18.743762,14.2660061 18.7896473,14.9455507 18.7925151,15.9627239 L18.7927063,16.5731707 L18.7927063,16.5731707 C18.7927063,18.402439 15.7984645,18.9878049 14.462572,19.2804878 C13.0345489,19.6097561 11.4222649,20.2682927 10.731286,21.2560976 L27.1765835,21.2560976 C26.6238004,20.4146341 25.3339731,19.7560976 23.3992322,19.2073171 C20.8195777,18.5853659 19.1612284,17.9268293 19.1612284,16.5365854 L19.1608159,15.7487527 C19.1625036,14.8217571 19.2127131,14.1628407 19.9443378,13.6463415 C20.0825336,13.5365854 20.2207294,13.4634146 20.3128599,13.4268293 C21.5105566,12.804878 22.7082534,11.4512195 22.7082534,9.87804878 C22.7082534,7.7195122 21.0038388,5.67073171 19.1612284,5.67073171 Z M10.6944444,1 C12.5462963,1 13.9351852,1.63708087 15,2.9112426 C14.0277778,3.36094675 13.1944444,3.99802761 12.4537037,4.78500986 C12.2222222,4.52268245 11.9907407,4.29783037 11.9444444,4.26035503 C11.5740741,3.92307692 11.2962963,3.81065089 10.6944444,3.81065089 L10.6944444,3.81065089 L10.4166667,3.81065089 C9.16666667,3.81065089 7.63888889,5.38461538 7.63888889,7.29585799 C7.63888889,8.60749507 8.65740741,9.73175542 9.58333333,10.2564103 C9.67592593,10.3313609 9.81481481,10.4063116 9.90740741,10.4812623 C10.6365741,11.0387081 10.6922743,11.68223 10.6948061,12.5122504 L10.6944444,13.2544379 C10.6944444,15.0532544 7.82407407,15.65286 6.71296296,15.877712 C5.74074074,16.1400394 4.62962963,16.5522682 3.98148148,17.1893491 L3.98148148,17.1893491 L7.77777778,17.1893491 C8.14814815,17.1893491 8.51851852,17.3767258 8.61111111,17.6765286 L8.61111111,17.6765286 L8.62851852,17.7436844 C8.63888889,17.832426 8.60185185,17.9163708 8.56481481,17.9763314 C7.63888889,18.5384615 6.99074074,19.1380671 6.52777778,19.7751479 C6.38888889,19.9250493 6.2037037,20 6.01851852,20 L6.01851852,20 L1.75925926,20 C0.601851852,20 0,19.025641 0,18.3510848 C0,16.6646943 0.972222222,14.4536489 5.74074074,13.1045365 L5.74074074,13.1045365 L5.78703704,13.1045365 C6.38888889,12.9921105 6.89814815,12.8422091 7.22222222,12.729783 L7.22222222,12.729783 L7.22222222,12.2800789 C5.74074074,11.3431953 4.16666667,9.5443787 4.16666667,7.25838264 C4.16666667,3.92307692 7.08333333,1 10.4166667,1 L10.4166667,1 Z M27.6467826,5.55111512e-17 C30.9593405,5.55111512e-17 33.8578287,2.93465347 33.8578287,6.28316832 C33.8578287,8.57821782 32.339573,10.3465347 30.8213173,11.3247525 L30.8213173,11.3247525 L30.8213173,11.7386139 C31.1433715,11.8891089 31.6954645,12.039604 32.2935652,12.190099 C37.0323634,13.5069307 38.0445338,15.7267327 37.9985261,17.3445545 C37.9985261,18.0594059 37.4004254,19 36.2502316,19 L36.2502316,19 L31.78748,19 C31.5574413,19 31.3734103,18.9247525 31.2813948,18.7742574 C30.7753095,18.1346535 30.1312011,17.5326733 29.2570538,17.0059406 C29.1190306,16.9306931 29.0730228,16.8178218 29.1190306,16.7049505 L29.1190306,16.7049505 L29.1595477,16.6089041 C29.2928376,16.3644787 29.6200038,16.2158416 29.9471701,16.2158416 L29.9471701,16.2158416 L34.0418597,16.2158416 C33.4897667,15.6891089 32.5696117,15.2376238 31.1893793,14.8613861 C29.3490693,14.409901 27.3707361,13.8079208 27.3707361,12.2653465 L27.3707361,12.2653465 L27.3704104,11.6950746 C27.3682201,10.742172 27.3736116,10.0455446 28.1068601,9.48118812 C28.2448834,9.36831683 28.4289144,9.29306931 28.4749221,9.25544554 C29.3950771,8.72871287 30.4072475,7.6 30.4072475,6.28316832 C30.4072475,4.32673267 28.8889918,2.78415842 27.6467826,2.78415842 L27.6467826,2.78415842 L27.3707361,2.78415842 C26.7266276,2.78415842 26.4045734,2.93465347 26.0365114,3.31089109 C25.9905037,3.34851485 25.7604649,3.64950495 25.5304262,3.95049505 C24.84031,3.12277228 23.9661627,2.48316832 23,1.99405941 C24.104186,0.63960396 25.4844184,5.55111512e-17 27.3707361,5.55111512e-17 L27.3707361,5.55111512e-17 Z\" id=\"Combined-Shape\"></path>\n                                        </g>\n                                    </g>\n                                </g>\n                            </g>\n                        </g>\n                    </svg>\n                    Groups\n                </a>\n                <a href=\"#\" id=\"bac--puresdk--apps--opener--\" class=\"bac--puresdk-apps-on-navbar--\">\n                    <svg width=\"13px\" height=\"13px\" viewBox=\"0 0 13 13\" version=\"1.1\" xmlns=\"http://www.w3.org/2000/svg\" xmlns:xlink=\"http://www.w3.org/1999/xlink\">\n                        <!-- Generator: sketchtool 59.1 (101010) - https://sketch.com -->\n                        <title>09B2DA56-DDAD-4C09-91E8-5D7194CB41FC</title>\n                        <desc>Created with sketchtool.</desc>\n                        <g id=\"PP-BA-Portal-Home_Desktop-v2\" stroke=\"none\" stroke-width=\"1\" fill=\"none\" fill-rule=\"evenodd\">\n                            <g id=\"PPCM-Listing_Connexion_01_Max_D\" transform=\"translate(-1378.000000, -78.000000)\" fill=\"#333333\" fill-rule=\"nonzero\">\n                                <g id=\"elements-/-sdk-/-button-copy-2-elements-/-sdk-/-button\" transform=\"translate(1363.000000, 70.000000)\">\n                                    <g id=\"icons/apps/campaigns-icons-/-apps-/-40x40-/-Otherapps\" transform=\"translate(11.000000, 4.000000)\">\n                                        <g id=\"e906\" transform=\"translate(4.000000, 4.000000)\">\n                                            <path d=\"M5.07812572,2.49999994e-06 L0.390625055,2.49999994e-06 C0.284830874,2.49999994e-06 0.193277944,0.0386579099 0.115966683,0.115969146 C0.0386554221,0.193280383 0,0.284833284 0,0.390627432 L0,5.07812661 C0,5.18392076 0.0386554221,5.27547366 0.115966683,5.3527849 C0.193277944,5.43009614 0.284830874,5.46875155 0.390625055,5.46875155 L1.17187517,5.46875155 C1.27766935,5.46875155 1.36922228,5.43009614 1.44653354,5.3527849 C1.5238448,5.27547366 1.56250022,5.18392076 1.56250022,5.07812661 L1.56250022,1.85546884 C1.56250022,1.85546884 1.57674189,1.80664093 1.60522481,1.70898429 C1.63370773,1.61132847 1.70898441,1.56250014 1.83105484,1.56250014 C1.83105484,1.56250014 1.83308943,1.56250014 1.83715859,1.56250014 C1.84122734,1.56250014 1.84733109,1.56250014 1.85546901,1.56250014 L3.57666092,1.56250014 C3.57666092,1.56250014 3.62752385,1.57674181 3.72924886,1.60522472 C3.83097429,1.63370763 3.88997513,1.71712262 3.90625097,1.85546884 L3.90625097,3.49121022 C3.90625097,3.49121022 3.8920093,3.55631438 3.86352638,3.68652269 C3.83504346,3.816731 3.71907636,3.88183516 3.51562591,3.88183516 C3.51562591,3.88183516 3.507488,3.88183516 3.49121174,3.88183516 L2.77099498,3.88183516 C2.66520038,3.88183516 2.57364786,3.92049098 2.4963366,3.99780222 C2.41902534,4.07511304 2.38036992,4.16666594 2.38036992,4.27246009 L2.38036992,5.05370995 C2.38036992,5.16764243 2.41902534,5.2612295 2.4963366,5.33447157 C2.57364786,5.40771406 2.66520038,5.44433488 2.77099498,5.44433488 L5.07812447,5.44433488 C5.18391865,5.44433488 5.27547158,5.40771406 5.35278284,5.33447157 C5.4300941,5.2612295 5.46874952,5.16764243 5.46874952,5.05370995 L5.46874952,0.390627432 C5.46874952,0.284833284 5.4300941,0.193280383 5.35278284,0.115969146 C5.27547158,0.0386579099 5.18391865,2.49999994e-06 5.07812447,2.49999994e-06 L5.07812572,2.49999994e-06 Z M12.1093762,0 L7.42187553,0 C7.31608135,0 7.22452842,0.0386579091 7.14721716,0.115969144 C7.0699059,0.193280379 7.03125048,0.284833278 7.03125048,0.390627424 L7.03125048,5.07812651 C7.03125048,5.18392065 7.0699059,5.27547355 7.14721716,5.35278479 C7.22452842,5.43009602 7.31608135,5.46875143 7.42187553,5.46875143 L8.20312564,5.46875143 C8.30891982,5.46875143 8.40047275,5.43009602 8.47778401,5.35278479 C8.55509528,5.27547355 8.5937507,5.18392065 8.5937507,5.07812651 L8.5937507,1.8554688 C8.5937507,1.8554688 8.60799237,1.81070965 8.63647529,1.72119133 C8.66495821,1.63167343 8.74023489,1.58691427 8.86230532,1.58691427 C8.86230532,1.58691427 8.8643399,1.58691427 8.86840907,1.58691427 C8.87247782,1.58691427 8.87858157,1.58691427 8.88671949,1.58691427 L10.6079114,1.58691427 C10.6079114,1.58691427 10.6587743,1.60115552 10.7604993,1.62963885 C10.8622248,1.65812176 10.9212256,1.74153674 10.9375014,1.87988297 L10.9375014,3.51562431 C10.9375014,3.51562431 10.9232598,3.58072847 10.8947769,3.71093677 C10.8662939,3.84114508 10.7503268,3.90624924 10.5468764,3.90624924 C10.5468764,3.90624924 10.5387385,3.90624924 10.5224622,3.90624924 L9.76562461,3.90624924 C9.65983043,3.90624924 9.5682775,3.94490465 9.49096624,4.02221588 C9.41365498,4.09952711 9.37499956,4.19108001 9.37499956,4.29687416 L9.37499956,5.07812401 C9.37499956,5.18391815 9.41365498,5.27547105 9.49096624,5.35278229 C9.5682775,5.43009352 9.65983043,5.46875143 9.76562461,5.46875143 L12.1093749,5.46875143 C12.2151691,5.46875143 12.3067221,5.43009352 12.3840333,5.35278229 C12.4613446,5.27547105 12.5,5.18391815 12.5,5.07812401 L12.5,0.390624924 C12.5,0.284830778 12.4613446,0.193277879 12.3840333,0.115966644 C12.3067221,0.0386554091 12.2151691,0 12.1093749,0 L12.1093762,0 Z M5.07812572,7.03124857 L0.390625055,7.03124857 C0.284830874,7.03124857 0.193277944,7.06990648 0.115966683,7.14721771 C0.0386554221,7.22452895 0,7.31608185 0,7.42187599 L0,12.1093751 C0,12.2151692 0.0386554221,12.3067221 0.115966683,12.3840334 C0.193277944,12.4613446 0.284830874,12.5 0.390625055,12.5 L1.17187517,12.5 C1.27766935,12.5 1.36922228,12.4613446 1.44653354,12.3840334 C1.5238448,12.3067221 1.56250022,12.2151692 1.56250022,12.1093751 L1.56250022,8.88671737 C1.56250022,8.88671737 1.57674189,8.84195822 1.60522481,8.7524399 C1.63370773,8.662922 1.70898441,8.61816284 1.83105484,8.61816284 C1.83105484,8.61816284 1.83308943,8.61816284 1.83715859,8.61816284 C1.84122734,8.61816284 1.84733109,8.61816284 1.85546901,8.61816284 L3.57666092,8.61816284 C3.57666092,8.61816284 3.62752385,8.63240409 3.72924886,8.66088742 C3.83097429,8.68937033 3.88997513,8.77278531 3.90625097,8.91113154 L3.90625097,10.5468729 C3.90625097,10.5468729 3.8920093,10.611977 3.86352638,10.7421853 C3.83504346,10.8723937 3.71907636,10.9374978 3.51562591,10.9374978 C3.51562591,10.9374978 3.507488,10.9374978 3.49121174,10.9374978 L2.77099498,10.9374978 C2.66520038,10.9374978 2.57364786,10.9761532 2.4963366,11.0534644 C2.41902534,11.1307757 2.38036992,11.2223286 2.38036992,11.3281227 L2.38036992,12.1093726 C2.38036992,12.2151667 2.41902534,12.3067196 2.4963366,12.3840309 C2.57364786,12.4613421 2.66520038,12.5 2.77099498,12.5 L5.07812447,12.5 C5.18391865,12.5 5.27547158,12.4613421 5.35278284,12.3840309 C5.4300941,12.3067196 5.46874952,12.2151667 5.46874952,12.1093726 L5.46874952,7.42187349 C5.46874952,7.31607935 5.4300941,7.22452645 5.35278284,7.14721521 C5.27547158,7.06990398 5.18391865,7.03124857 5.07812447,7.03124857 L5.07812572,7.03124857 Z M12.1093762,7.03124857 L7.42187553,7.03124857 C7.31608135,7.03124857 7.22452842,7.06990648 7.14721716,7.14721771 C7.0699059,7.22452895 7.03125048,7.31608185 7.03125048,7.42187599 L7.03125048,12.1093751 C7.03125048,12.2151692 7.0699059,12.3067221 7.14721716,12.3840334 C7.22452842,12.4613446 7.31608135,12.5 7.42187553,12.5 L8.20312564,12.5 C8.30891982,12.5 8.40047275,12.4613446 8.47778401,12.3840334 C8.55509528,12.3067221 8.5937507,12.2151692 8.5937507,12.1093751 L8.5937507,8.88671737 C8.5937507,8.88671737 8.60799237,8.84195822 8.63647529,8.7524399 C8.66495821,8.662922 8.74023489,8.61816284 8.86230532,8.61816284 C8.86230532,8.61816284 8.8643399,8.61816284 8.86840907,8.61816284 C8.87247782,8.61816284 8.87858157,8.61816284 8.88671949,8.61816284 L10.6079114,8.61816284 C10.6079114,8.61816284 10.6587743,8.63240409 10.7604993,8.66088742 C10.8622248,8.68937033 10.9212256,8.77278531 10.9375014,8.91113154 L10.9375014,10.5468729 C10.9375014,10.5468729 10.9232598,10.611977 10.8947769,10.7421853 C10.8662939,10.8723937 10.7503268,10.9374978 10.5468764,10.9374978 C10.5468764,10.9374978 10.5387385,10.9374978 10.5224622,10.9374978 L9.76562461,10.9374978 C9.65983043,10.9374978 9.5682775,10.9761532 9.49096624,11.0534644 C9.41365498,11.1307757 9.37499956,11.2223286 9.37499956,11.3281227 L9.37499956,12.1093726 C9.37499956,12.2151667 9.41365498,12.3067196 9.49096624,12.3840309 C9.5682775,12.4613421 9.65983043,12.5 9.76562461,12.5 L12.1093749,12.5 C12.2151691,12.5 12.3067221,12.4613421 12.3840333,12.3840309 C12.4613446,12.3067196 12.5,12.2151667 12.5,12.1093726 L12.5,7.42187349 C12.5,7.31607935 12.4613446,7.22452645 12.3840333,7.14721521 C12.3067221,7.06990398 12.2151691,7.03124857 12.1093749,7.03124857 L12.1093762,7.03124857 Z\" id=\"Shape\"></path>\n                                        </g>\n                                    </g>\n                                </g>\n                            </g>\n                        </g>\n                    </svg>\n                    Other apps\n                </a>\n                <div class=\"bac--apps-container\" id=\"bac--puresdk-apps-container--\">\n                    <div id=\"bac--aps-actual-container\"></div>\n                </div>\n            </div>\n            <div class=\"bac--user-avatar\" id=\"bac--user-avatar-top\">\n                <span class=\"bac--user-avatar-name\" id=\"bac--puresdk-user-avatar--\"></span>\n                <div id=\"bac--image-container-top\"></div>\n            </div>\n        </div>\n    </div>\n    <div id=\"bac--info-blocks-wrapper--\"></div>\n</header>\n<div class=\"bac--user-sidebar\" id=\"bac--puresdk-user-sidebar--\">\n    <div class=\"bac--user-sidebar-white-bg\" id=\"bac--user-sidebar-white-bg\">\n        <div id=\"bac--puresdk-user-details--\">\n            <div class=\"bac-user-acount-list-item\">\n                <a id=\"bac--logout--button\" href=\"/api/v1/sign-off\"><i class=\"fa fa-login-line\"></i> Log out</a>\n            </div>\n        </div>\n        <div class=\"bac--user-apps\" id=\"bac--puresdk-user-businesses--\">\n        </div>\n        <div class=\"bac--user-account-settings\">\n            <div id=\"puresdk-version-number\" class=\"puresdk-version-number\"></div>\n        </div>\n    </div>\n</div>\n\n\n<div class=\"bac--custom-modal add-question-modal --is-open\" id=\"bac--cloudinary--modal\">\n    <div class=\"custom-modal__wrapper\">\n        <div class=\"custom-modal__content\">\n            <h3>Add image</h3>\n            <a class=\"custom-modal__close-btn\" id=\"bac--cloudinary--closebtn\"><i class=\"fa fa-times-circle\"></i></a>\n        </div>\n\n        <div class=\"custom-modal__content\">\n            <div class=\"bac-search --icon-left\">\n                <input id=\"bac--cloudinary--search-input\" type=\"search\" name=\"search\" placeholder=\"Search for images...\"/>\n                <div class=\"bac-search__icon\"><i class=\"fa fa-search\"></i></div>\n            </div>\n            <br/>\n\n            <div class=\"back-button\" id=\"bac--cloudinary--back-button-container\">\n                <a class=\"goBack\" id=\"bac--cloudinary--go-back\"><i class=\"fa fa-angle-left\"></i>Go Back</a>\n            </div>\n\n            <br/>\n            <div class=\"cloud-images\">\n                <div class=\"cloud-images__container\" id=\"bac--cloudinary-itams-container\"></div>\n\n                <div class=\"cloud-images__pagination\" id=\"bac--cloudinary-pagination-container\">\n                    <ul id=\"bac--cloudinary-actual-pagination-container\"></ul>\n                </div>\n\n            </div>\n        </div>\n    </div>\n</div>\n<div id=\"bac---invalid-account\">You have switched to another account from another tab. Please either close this page\n    or switch to the right account to re-enable access</div>\n\n<input style=\"display:none\" type='file' id='bac---puresdk-avatar-file'>\n<input style=\"display:none\" type='button' id='bac---puresdk-avatar-submit' value='Upload!'>");
ppba.setVersionNumber('2.9.5-rc2');
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
},{"./PPBA":5}],7:[function(require,module,exports){
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
},{}],8:[function(require,module,exports){
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
},{"./caller":9,"./dom":11,"./logger":13,"./store":16}],9:[function(require,module,exports){
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
},{"./logger":13,"./store.js":16}],10:[function(require,module,exports){
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
},{"./caller":9,"./dom":11,"./pagination-helper":14,"./store":16}],11:[function(require,module,exports){
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
},{}],12:[function(require,module,exports){
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
},{"./dom":11}],13:[function(require,module,exports){
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
},{"./store.js":16}],14:[function(require,module,exports){
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
},{}],15:[function(require,module,exports){
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
},{"./logger.js":13,"./store.js":16}],16:[function(require,module,exports){
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
},{}]},{},[6])
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uLy4uL25vZGVfbW9kdWxlcy9icm93c2VyLXBhY2svX3ByZWx1ZGUuanMiLCIuLi8uLi9ub2RlX21vZHVsZXMvYXNhcC9icm93c2VyLXJhdy5qcyIsIi4uLy4uL25vZGVfbW9kdWxlcy9wcm9taXNlL2xpYi9jb3JlLmpzIiwiLi4vLi4vbm9kZV9tb2R1bGVzL3Byb21pc2UvbGliL2VzNi1leHRlbnNpb25zLmpzIiwiLi4vLi4vbm9kZV9tb2R1bGVzL3Byb21pc2UvbGliL3JlamVjdGlvbi10cmFja2luZy5qcyIsIlBQQkEuanMiLCJpbmRleC5qcyIsIm1vZHVsZXMvYWNjb3VudC1jb25zaXN0ZW5jeS1ndWFyZC5qcyIsIm1vZHVsZXMvYXZhdGFyLWNvbnRyb2xsZXIuanMiLCJtb2R1bGVzL2NhbGxlci5qcyIsIm1vZHVsZXMvY2xvdWRpbmFyeS1pbWFnZS1waWNrZXIuanMiLCJtb2R1bGVzL2RvbS5qcyIsIm1vZHVsZXMvaW5mby1jb250cm9sbGVyLmpzIiwibW9kdWxlcy9sb2dnZXIuanMiLCJtb2R1bGVzL3BhZ2luYXRpb24taGVscGVyLmpzIiwibW9kdWxlcy9wdWJzdWIuanMiLCJtb2R1bGVzL3N0b3JlLmpzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOztBQ0FBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7Ozs7QUMvTkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDck5BO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUMzR0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNoSEE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3ZaQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUMxQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUN0QkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDOUhBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDdkdBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQy9QQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDcEJBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ2xIQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3RCQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUN6REE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNwREE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBIiwiZmlsZSI6ImdlbmVyYXRlZC5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzQ29udGVudCI6WyIoZnVuY3Rpb24oKXtmdW5jdGlvbiByKGUsbix0KXtmdW5jdGlvbiBvKGksZil7aWYoIW5baV0pe2lmKCFlW2ldKXt2YXIgYz1cImZ1bmN0aW9uXCI9PXR5cGVvZiByZXF1aXJlJiZyZXF1aXJlO2lmKCFmJiZjKXJldHVybiBjKGksITApO2lmKHUpcmV0dXJuIHUoaSwhMCk7dmFyIGE9bmV3IEVycm9yKFwiQ2Fubm90IGZpbmQgbW9kdWxlICdcIitpK1wiJ1wiKTt0aHJvdyBhLmNvZGU9XCJNT0RVTEVfTk9UX0ZPVU5EXCIsYX12YXIgcD1uW2ldPXtleHBvcnRzOnt9fTtlW2ldWzBdLmNhbGwocC5leHBvcnRzLGZ1bmN0aW9uKHIpe3ZhciBuPWVbaV1bMV1bcl07cmV0dXJuIG8obnx8cil9LHAscC5leHBvcnRzLHIsZSxuLHQpfXJldHVybiBuW2ldLmV4cG9ydHN9Zm9yKHZhciB1PVwiZnVuY3Rpb25cIj09dHlwZW9mIHJlcXVpcmUmJnJlcXVpcmUsaT0wO2k8dC5sZW5ndGg7aSsrKW8odFtpXSk7cmV0dXJuIG99cmV0dXJuIHJ9KSgpIiwiXCJ1c2Ugc3RyaWN0XCI7XG5cbi8vIFVzZSB0aGUgZmFzdGVzdCBtZWFucyBwb3NzaWJsZSB0byBleGVjdXRlIGEgdGFzayBpbiBpdHMgb3duIHR1cm4sIHdpdGhcbi8vIHByaW9yaXR5IG92ZXIgb3RoZXIgZXZlbnRzIGluY2x1ZGluZyBJTywgYW5pbWF0aW9uLCByZWZsb3csIGFuZCByZWRyYXdcbi8vIGV2ZW50cyBpbiBicm93c2Vycy5cbi8vXG4vLyBBbiBleGNlcHRpb24gdGhyb3duIGJ5IGEgdGFzayB3aWxsIHBlcm1hbmVudGx5IGludGVycnVwdCB0aGUgcHJvY2Vzc2luZyBvZlxuLy8gc3Vic2VxdWVudCB0YXNrcy4gVGhlIGhpZ2hlciBsZXZlbCBgYXNhcGAgZnVuY3Rpb24gZW5zdXJlcyB0aGF0IGlmIGFuXG4vLyBleGNlcHRpb24gaXMgdGhyb3duIGJ5IGEgdGFzaywgdGhhdCB0aGUgdGFzayBxdWV1ZSB3aWxsIGNvbnRpbnVlIGZsdXNoaW5nIGFzXG4vLyBzb29uIGFzIHBvc3NpYmxlLCBidXQgaWYgeW91IHVzZSBgcmF3QXNhcGAgZGlyZWN0bHksIHlvdSBhcmUgcmVzcG9uc2libGUgdG9cbi8vIGVpdGhlciBlbnN1cmUgdGhhdCBubyBleGNlcHRpb25zIGFyZSB0aHJvd24gZnJvbSB5b3VyIHRhc2ssIG9yIHRvIG1hbnVhbGx5XG4vLyBjYWxsIGByYXdBc2FwLnJlcXVlc3RGbHVzaGAgaWYgYW4gZXhjZXB0aW9uIGlzIHRocm93bi5cbm1vZHVsZS5leHBvcnRzID0gcmF3QXNhcDtcbmZ1bmN0aW9uIHJhd0FzYXAodGFzaykge1xuICAgIGlmICghcXVldWUubGVuZ3RoKSB7XG4gICAgICAgIHJlcXVlc3RGbHVzaCgpO1xuICAgICAgICBmbHVzaGluZyA9IHRydWU7XG4gICAgfVxuICAgIC8vIEVxdWl2YWxlbnQgdG8gcHVzaCwgYnV0IGF2b2lkcyBhIGZ1bmN0aW9uIGNhbGwuXG4gICAgcXVldWVbcXVldWUubGVuZ3RoXSA9IHRhc2s7XG59XG5cbnZhciBxdWV1ZSA9IFtdO1xuLy8gT25jZSBhIGZsdXNoIGhhcyBiZWVuIHJlcXVlc3RlZCwgbm8gZnVydGhlciBjYWxscyB0byBgcmVxdWVzdEZsdXNoYCBhcmVcbi8vIG5lY2Vzc2FyeSB1bnRpbCB0aGUgbmV4dCBgZmx1c2hgIGNvbXBsZXRlcy5cbnZhciBmbHVzaGluZyA9IGZhbHNlO1xuLy8gYHJlcXVlc3RGbHVzaGAgaXMgYW4gaW1wbGVtZW50YXRpb24tc3BlY2lmaWMgbWV0aG9kIHRoYXQgYXR0ZW1wdHMgdG8ga2lja1xuLy8gb2ZmIGEgYGZsdXNoYCBldmVudCBhcyBxdWlja2x5IGFzIHBvc3NpYmxlLiBgZmx1c2hgIHdpbGwgYXR0ZW1wdCB0byBleGhhdXN0XG4vLyB0aGUgZXZlbnQgcXVldWUgYmVmb3JlIHlpZWxkaW5nIHRvIHRoZSBicm93c2VyJ3Mgb3duIGV2ZW50IGxvb3AuXG52YXIgcmVxdWVzdEZsdXNoO1xuLy8gVGhlIHBvc2l0aW9uIG9mIHRoZSBuZXh0IHRhc2sgdG8gZXhlY3V0ZSBpbiB0aGUgdGFzayBxdWV1ZS4gVGhpcyBpc1xuLy8gcHJlc2VydmVkIGJldHdlZW4gY2FsbHMgdG8gYGZsdXNoYCBzbyB0aGF0IGl0IGNhbiBiZSByZXN1bWVkIGlmXG4vLyBhIHRhc2sgdGhyb3dzIGFuIGV4Y2VwdGlvbi5cbnZhciBpbmRleCA9IDA7XG4vLyBJZiBhIHRhc2sgc2NoZWR1bGVzIGFkZGl0aW9uYWwgdGFza3MgcmVjdXJzaXZlbHksIHRoZSB0YXNrIHF1ZXVlIGNhbiBncm93XG4vLyB1bmJvdW5kZWQuIFRvIHByZXZlbnQgbWVtb3J5IGV4aGF1c3Rpb24sIHRoZSB0YXNrIHF1ZXVlIHdpbGwgcGVyaW9kaWNhbGx5XG4vLyB0cnVuY2F0ZSBhbHJlYWR5LWNvbXBsZXRlZCB0YXNrcy5cbnZhciBjYXBhY2l0eSA9IDEwMjQ7XG5cbi8vIFRoZSBmbHVzaCBmdW5jdGlvbiBwcm9jZXNzZXMgYWxsIHRhc2tzIHRoYXQgaGF2ZSBiZWVuIHNjaGVkdWxlZCB3aXRoXG4vLyBgcmF3QXNhcGAgdW5sZXNzIGFuZCB1bnRpbCBvbmUgb2YgdGhvc2UgdGFza3MgdGhyb3dzIGFuIGV4Y2VwdGlvbi5cbi8vIElmIGEgdGFzayB0aHJvd3MgYW4gZXhjZXB0aW9uLCBgZmx1c2hgIGVuc3VyZXMgdGhhdCBpdHMgc3RhdGUgd2lsbCByZW1haW5cbi8vIGNvbnNpc3RlbnQgYW5kIHdpbGwgcmVzdW1lIHdoZXJlIGl0IGxlZnQgb2ZmIHdoZW4gY2FsbGVkIGFnYWluLlxuLy8gSG93ZXZlciwgYGZsdXNoYCBkb2VzIG5vdCBtYWtlIGFueSBhcnJhbmdlbWVudHMgdG8gYmUgY2FsbGVkIGFnYWluIGlmIGFuXG4vLyBleGNlcHRpb24gaXMgdGhyb3duLlxuZnVuY3Rpb24gZmx1c2goKSB7XG4gICAgd2hpbGUgKGluZGV4IDwgcXVldWUubGVuZ3RoKSB7XG4gICAgICAgIHZhciBjdXJyZW50SW5kZXggPSBpbmRleDtcbiAgICAgICAgLy8gQWR2YW5jZSB0aGUgaW5kZXggYmVmb3JlIGNhbGxpbmcgdGhlIHRhc2suIFRoaXMgZW5zdXJlcyB0aGF0IHdlIHdpbGxcbiAgICAgICAgLy8gYmVnaW4gZmx1c2hpbmcgb24gdGhlIG5leHQgdGFzayB0aGUgdGFzayB0aHJvd3MgYW4gZXJyb3IuXG4gICAgICAgIGluZGV4ID0gaW5kZXggKyAxO1xuICAgICAgICBxdWV1ZVtjdXJyZW50SW5kZXhdLmNhbGwoKTtcbiAgICAgICAgLy8gUHJldmVudCBsZWFraW5nIG1lbW9yeSBmb3IgbG9uZyBjaGFpbnMgb2YgcmVjdXJzaXZlIGNhbGxzIHRvIGBhc2FwYC5cbiAgICAgICAgLy8gSWYgd2UgY2FsbCBgYXNhcGAgd2l0aGluIHRhc2tzIHNjaGVkdWxlZCBieSBgYXNhcGAsIHRoZSBxdWV1ZSB3aWxsXG4gICAgICAgIC8vIGdyb3csIGJ1dCB0byBhdm9pZCBhbiBPKG4pIHdhbGsgZm9yIGV2ZXJ5IHRhc2sgd2UgZXhlY3V0ZSwgd2UgZG9uJ3RcbiAgICAgICAgLy8gc2hpZnQgdGFza3Mgb2ZmIHRoZSBxdWV1ZSBhZnRlciB0aGV5IGhhdmUgYmVlbiBleGVjdXRlZC5cbiAgICAgICAgLy8gSW5zdGVhZCwgd2UgcGVyaW9kaWNhbGx5IHNoaWZ0IDEwMjQgdGFza3Mgb2ZmIHRoZSBxdWV1ZS5cbiAgICAgICAgaWYgKGluZGV4ID4gY2FwYWNpdHkpIHtcbiAgICAgICAgICAgIC8vIE1hbnVhbGx5IHNoaWZ0IGFsbCB2YWx1ZXMgc3RhcnRpbmcgYXQgdGhlIGluZGV4IGJhY2sgdG8gdGhlXG4gICAgICAgICAgICAvLyBiZWdpbm5pbmcgb2YgdGhlIHF1ZXVlLlxuICAgICAgICAgICAgZm9yICh2YXIgc2NhbiA9IDAsIG5ld0xlbmd0aCA9IHF1ZXVlLmxlbmd0aCAtIGluZGV4OyBzY2FuIDwgbmV3TGVuZ3RoOyBzY2FuKyspIHtcbiAgICAgICAgICAgICAgICBxdWV1ZVtzY2FuXSA9IHF1ZXVlW3NjYW4gKyBpbmRleF07XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBxdWV1ZS5sZW5ndGggLT0gaW5kZXg7XG4gICAgICAgICAgICBpbmRleCA9IDA7XG4gICAgICAgIH1cbiAgICB9XG4gICAgcXVldWUubGVuZ3RoID0gMDtcbiAgICBpbmRleCA9IDA7XG4gICAgZmx1c2hpbmcgPSBmYWxzZTtcbn1cblxuLy8gYHJlcXVlc3RGbHVzaGAgaXMgaW1wbGVtZW50ZWQgdXNpbmcgYSBzdHJhdGVneSBiYXNlZCBvbiBkYXRhIGNvbGxlY3RlZCBmcm9tXG4vLyBldmVyeSBhdmFpbGFibGUgU2F1Y2VMYWJzIFNlbGVuaXVtIHdlYiBkcml2ZXIgd29ya2VyIGF0IHRpbWUgb2Ygd3JpdGluZy5cbi8vIGh0dHBzOi8vZG9jcy5nb29nbGUuY29tL3NwcmVhZHNoZWV0cy9kLzFtRy01VVlHdXA1cXhHZEVNV2toUDZCV0N6MDUzTlViMkUxUW9VVFUxNnVBL2VkaXQjZ2lkPTc4MzcyNDU5M1xuXG4vLyBTYWZhcmkgNiBhbmQgNi4xIGZvciBkZXNrdG9wLCBpUGFkLCBhbmQgaVBob25lIGFyZSB0aGUgb25seSBicm93c2VycyB0aGF0XG4vLyBoYXZlIFdlYktpdE11dGF0aW9uT2JzZXJ2ZXIgYnV0IG5vdCB1bi1wcmVmaXhlZCBNdXRhdGlvbk9ic2VydmVyLlxuLy8gTXVzdCB1c2UgYGdsb2JhbGAgb3IgYHNlbGZgIGluc3RlYWQgb2YgYHdpbmRvd2AgdG8gd29yayBpbiBib3RoIGZyYW1lcyBhbmQgd2ViXG4vLyB3b3JrZXJzLiBgZ2xvYmFsYCBpcyBhIHByb3Zpc2lvbiBvZiBCcm93c2VyaWZ5LCBNciwgTXJzLCBvciBNb3AuXG5cbi8qIGdsb2JhbHMgc2VsZiAqL1xudmFyIHNjb3BlID0gdHlwZW9mIGdsb2JhbCAhPT0gXCJ1bmRlZmluZWRcIiA/IGdsb2JhbCA6IHNlbGY7XG52YXIgQnJvd3Nlck11dGF0aW9uT2JzZXJ2ZXIgPSBzY29wZS5NdXRhdGlvbk9ic2VydmVyIHx8IHNjb3BlLldlYktpdE11dGF0aW9uT2JzZXJ2ZXI7XG5cbi8vIE11dGF0aW9uT2JzZXJ2ZXJzIGFyZSBkZXNpcmFibGUgYmVjYXVzZSB0aGV5IGhhdmUgaGlnaCBwcmlvcml0eSBhbmQgd29ya1xuLy8gcmVsaWFibHkgZXZlcnl3aGVyZSB0aGV5IGFyZSBpbXBsZW1lbnRlZC5cbi8vIFRoZXkgYXJlIGltcGxlbWVudGVkIGluIGFsbCBtb2Rlcm4gYnJvd3NlcnMuXG4vL1xuLy8gLSBBbmRyb2lkIDQtNC4zXG4vLyAtIENocm9tZSAyNi0zNFxuLy8gLSBGaXJlZm94IDE0LTI5XG4vLyAtIEludGVybmV0IEV4cGxvcmVyIDExXG4vLyAtIGlQYWQgU2FmYXJpIDYtNy4xXG4vLyAtIGlQaG9uZSBTYWZhcmkgNy03LjFcbi8vIC0gU2FmYXJpIDYtN1xuaWYgKHR5cGVvZiBCcm93c2VyTXV0YXRpb25PYnNlcnZlciA9PT0gXCJmdW5jdGlvblwiKSB7XG4gICAgcmVxdWVzdEZsdXNoID0gbWFrZVJlcXVlc3RDYWxsRnJvbU11dGF0aW9uT2JzZXJ2ZXIoZmx1c2gpO1xuXG4vLyBNZXNzYWdlQ2hhbm5lbHMgYXJlIGRlc2lyYWJsZSBiZWNhdXNlIHRoZXkgZ2l2ZSBkaXJlY3QgYWNjZXNzIHRvIHRoZSBIVE1MXG4vLyB0YXNrIHF1ZXVlLCBhcmUgaW1wbGVtZW50ZWQgaW4gSW50ZXJuZXQgRXhwbG9yZXIgMTAsIFNhZmFyaSA1LjAtMSwgYW5kIE9wZXJhXG4vLyAxMS0xMiwgYW5kIGluIHdlYiB3b3JrZXJzIGluIG1hbnkgZW5naW5lcy5cbi8vIEFsdGhvdWdoIG1lc3NhZ2UgY2hhbm5lbHMgeWllbGQgdG8gYW55IHF1ZXVlZCByZW5kZXJpbmcgYW5kIElPIHRhc2tzLCB0aGV5XG4vLyB3b3VsZCBiZSBiZXR0ZXIgdGhhbiBpbXBvc2luZyB0aGUgNG1zIGRlbGF5IG9mIHRpbWVycy5cbi8vIEhvd2V2ZXIsIHRoZXkgZG8gbm90IHdvcmsgcmVsaWFibHkgaW4gSW50ZXJuZXQgRXhwbG9yZXIgb3IgU2FmYXJpLlxuXG4vLyBJbnRlcm5ldCBFeHBsb3JlciAxMCBpcyB0aGUgb25seSBicm93c2VyIHRoYXQgaGFzIHNldEltbWVkaWF0ZSBidXQgZG9lc1xuLy8gbm90IGhhdmUgTXV0YXRpb25PYnNlcnZlcnMuXG4vLyBBbHRob3VnaCBzZXRJbW1lZGlhdGUgeWllbGRzIHRvIHRoZSBicm93c2VyJ3MgcmVuZGVyZXIsIGl0IHdvdWxkIGJlXG4vLyBwcmVmZXJyYWJsZSB0byBmYWxsaW5nIGJhY2sgdG8gc2V0VGltZW91dCBzaW5jZSBpdCBkb2VzIG5vdCBoYXZlXG4vLyB0aGUgbWluaW11bSA0bXMgcGVuYWx0eS5cbi8vIFVuZm9ydHVuYXRlbHkgdGhlcmUgYXBwZWFycyB0byBiZSBhIGJ1ZyBpbiBJbnRlcm5ldCBFeHBsb3JlciAxMCBNb2JpbGUgKGFuZFxuLy8gRGVza3RvcCB0byBhIGxlc3NlciBleHRlbnQpIHRoYXQgcmVuZGVycyBib3RoIHNldEltbWVkaWF0ZSBhbmRcbi8vIE1lc3NhZ2VDaGFubmVsIHVzZWxlc3MgZm9yIHRoZSBwdXJwb3NlcyBvZiBBU0FQLlxuLy8gaHR0cHM6Ly9naXRodWIuY29tL2tyaXNrb3dhbC9xL2lzc3Vlcy8zOTZcblxuLy8gVGltZXJzIGFyZSBpbXBsZW1lbnRlZCB1bml2ZXJzYWxseS5cbi8vIFdlIGZhbGwgYmFjayB0byB0aW1lcnMgaW4gd29ya2VycyBpbiBtb3N0IGVuZ2luZXMsIGFuZCBpbiBmb3JlZ3JvdW5kXG4vLyBjb250ZXh0cyBpbiB0aGUgZm9sbG93aW5nIGJyb3dzZXJzLlxuLy8gSG93ZXZlciwgbm90ZSB0aGF0IGV2ZW4gdGhpcyBzaW1wbGUgY2FzZSByZXF1aXJlcyBudWFuY2VzIHRvIG9wZXJhdGUgaW4gYVxuLy8gYnJvYWQgc3BlY3RydW0gb2YgYnJvd3NlcnMuXG4vL1xuLy8gLSBGaXJlZm94IDMtMTNcbi8vIC0gSW50ZXJuZXQgRXhwbG9yZXIgNi05XG4vLyAtIGlQYWQgU2FmYXJpIDQuM1xuLy8gLSBMeW54IDIuOC43XG59IGVsc2Uge1xuICAgIHJlcXVlc3RGbHVzaCA9IG1ha2VSZXF1ZXN0Q2FsbEZyb21UaW1lcihmbHVzaCk7XG59XG5cbi8vIGByZXF1ZXN0Rmx1c2hgIHJlcXVlc3RzIHRoYXQgdGhlIGhpZ2ggcHJpb3JpdHkgZXZlbnQgcXVldWUgYmUgZmx1c2hlZCBhc1xuLy8gc29vbiBhcyBwb3NzaWJsZS5cbi8vIFRoaXMgaXMgdXNlZnVsIHRvIHByZXZlbnQgYW4gZXJyb3IgdGhyb3duIGluIGEgdGFzayBmcm9tIHN0YWxsaW5nIHRoZSBldmVudFxuLy8gcXVldWUgaWYgdGhlIGV4Y2VwdGlvbiBoYW5kbGVkIGJ5IE5vZGUuanPigJlzXG4vLyBgcHJvY2Vzcy5vbihcInVuY2F1Z2h0RXhjZXB0aW9uXCIpYCBvciBieSBhIGRvbWFpbi5cbnJhd0FzYXAucmVxdWVzdEZsdXNoID0gcmVxdWVzdEZsdXNoO1xuXG4vLyBUbyByZXF1ZXN0IGEgaGlnaCBwcmlvcml0eSBldmVudCwgd2UgaW5kdWNlIGEgbXV0YXRpb24gb2JzZXJ2ZXIgYnkgdG9nZ2xpbmdcbi8vIHRoZSB0ZXh0IG9mIGEgdGV4dCBub2RlIGJldHdlZW4gXCIxXCIgYW5kIFwiLTFcIi5cbmZ1bmN0aW9uIG1ha2VSZXF1ZXN0Q2FsbEZyb21NdXRhdGlvbk9ic2VydmVyKGNhbGxiYWNrKSB7XG4gICAgdmFyIHRvZ2dsZSA9IDE7XG4gICAgdmFyIG9ic2VydmVyID0gbmV3IEJyb3dzZXJNdXRhdGlvbk9ic2VydmVyKGNhbGxiYWNrKTtcbiAgICB2YXIgbm9kZSA9IGRvY3VtZW50LmNyZWF0ZVRleHROb2RlKFwiXCIpO1xuICAgIG9ic2VydmVyLm9ic2VydmUobm9kZSwge2NoYXJhY3RlckRhdGE6IHRydWV9KTtcbiAgICByZXR1cm4gZnVuY3Rpb24gcmVxdWVzdENhbGwoKSB7XG4gICAgICAgIHRvZ2dsZSA9IC10b2dnbGU7XG4gICAgICAgIG5vZGUuZGF0YSA9IHRvZ2dsZTtcbiAgICB9O1xufVxuXG4vLyBUaGUgbWVzc2FnZSBjaGFubmVsIHRlY2huaXF1ZSB3YXMgZGlzY292ZXJlZCBieSBNYWx0ZSBVYmwgYW5kIHdhcyB0aGVcbi8vIG9yaWdpbmFsIGZvdW5kYXRpb24gZm9yIHRoaXMgbGlicmFyeS5cbi8vIGh0dHA6Ly93d3cubm9uYmxvY2tpbmcuaW8vMjAxMS8wNi93aW5kb3duZXh0dGljay5odG1sXG5cbi8vIFNhZmFyaSA2LjAuNSAoYXQgbGVhc3QpIGludGVybWl0dGVudGx5IGZhaWxzIHRvIGNyZWF0ZSBtZXNzYWdlIHBvcnRzIG9uIGFcbi8vIHBhZ2UncyBmaXJzdCBsb2FkLiBUaGFua2Z1bGx5LCB0aGlzIHZlcnNpb24gb2YgU2FmYXJpIHN1cHBvcnRzXG4vLyBNdXRhdGlvbk9ic2VydmVycywgc28gd2UgZG9uJ3QgbmVlZCB0byBmYWxsIGJhY2sgaW4gdGhhdCBjYXNlLlxuXG4vLyBmdW5jdGlvbiBtYWtlUmVxdWVzdENhbGxGcm9tTWVzc2FnZUNoYW5uZWwoY2FsbGJhY2spIHtcbi8vICAgICB2YXIgY2hhbm5lbCA9IG5ldyBNZXNzYWdlQ2hhbm5lbCgpO1xuLy8gICAgIGNoYW5uZWwucG9ydDEub25tZXNzYWdlID0gY2FsbGJhY2s7XG4vLyAgICAgcmV0dXJuIGZ1bmN0aW9uIHJlcXVlc3RDYWxsKCkge1xuLy8gICAgICAgICBjaGFubmVsLnBvcnQyLnBvc3RNZXNzYWdlKDApO1xuLy8gICAgIH07XG4vLyB9XG5cbi8vIEZvciByZWFzb25zIGV4cGxhaW5lZCBhYm92ZSwgd2UgYXJlIGFsc28gdW5hYmxlIHRvIHVzZSBgc2V0SW1tZWRpYXRlYFxuLy8gdW5kZXIgYW55IGNpcmN1bXN0YW5jZXMuXG4vLyBFdmVuIGlmIHdlIHdlcmUsIHRoZXJlIGlzIGFub3RoZXIgYnVnIGluIEludGVybmV0IEV4cGxvcmVyIDEwLlxuLy8gSXQgaXMgbm90IHN1ZmZpY2llbnQgdG8gYXNzaWduIGBzZXRJbW1lZGlhdGVgIHRvIGByZXF1ZXN0Rmx1c2hgIGJlY2F1c2Vcbi8vIGBzZXRJbW1lZGlhdGVgIG11c3QgYmUgY2FsbGVkICpieSBuYW1lKiBhbmQgdGhlcmVmb3JlIG11c3QgYmUgd3JhcHBlZCBpbiBhXG4vLyBjbG9zdXJlLlxuLy8gTmV2ZXIgZm9yZ2V0LlxuXG4vLyBmdW5jdGlvbiBtYWtlUmVxdWVzdENhbGxGcm9tU2V0SW1tZWRpYXRlKGNhbGxiYWNrKSB7XG4vLyAgICAgcmV0dXJuIGZ1bmN0aW9uIHJlcXVlc3RDYWxsKCkge1xuLy8gICAgICAgICBzZXRJbW1lZGlhdGUoY2FsbGJhY2spO1xuLy8gICAgIH07XG4vLyB9XG5cbi8vIFNhZmFyaSA2LjAgaGFzIGEgcHJvYmxlbSB3aGVyZSB0aW1lcnMgd2lsbCBnZXQgbG9zdCB3aGlsZSB0aGUgdXNlciBpc1xuLy8gc2Nyb2xsaW5nLiBUaGlzIHByb2JsZW0gZG9lcyBub3QgaW1wYWN0IEFTQVAgYmVjYXVzZSBTYWZhcmkgNi4wIHN1cHBvcnRzXG4vLyBtdXRhdGlvbiBvYnNlcnZlcnMsIHNvIHRoYXQgaW1wbGVtZW50YXRpb24gaXMgdXNlZCBpbnN0ZWFkLlxuLy8gSG93ZXZlciwgaWYgd2UgZXZlciBlbGVjdCB0byB1c2UgdGltZXJzIGluIFNhZmFyaSwgdGhlIHByZXZhbGVudCB3b3JrLWFyb3VuZFxuLy8gaXMgdG8gYWRkIGEgc2Nyb2xsIGV2ZW50IGxpc3RlbmVyIHRoYXQgY2FsbHMgZm9yIGEgZmx1c2guXG5cbi8vIGBzZXRUaW1lb3V0YCBkb2VzIG5vdCBjYWxsIHRoZSBwYXNzZWQgY2FsbGJhY2sgaWYgdGhlIGRlbGF5IGlzIGxlc3MgdGhhblxuLy8gYXBwcm94aW1hdGVseSA3IGluIHdlYiB3b3JrZXJzIGluIEZpcmVmb3ggOCB0aHJvdWdoIDE4LCBhbmQgc29tZXRpbWVzIG5vdFxuLy8gZXZlbiB0aGVuLlxuXG5mdW5jdGlvbiBtYWtlUmVxdWVzdENhbGxGcm9tVGltZXIoY2FsbGJhY2spIHtcbiAgICByZXR1cm4gZnVuY3Rpb24gcmVxdWVzdENhbGwoKSB7XG4gICAgICAgIC8vIFdlIGRpc3BhdGNoIGEgdGltZW91dCB3aXRoIGEgc3BlY2lmaWVkIGRlbGF5IG9mIDAgZm9yIGVuZ2luZXMgdGhhdFxuICAgICAgICAvLyBjYW4gcmVsaWFibHkgYWNjb21tb2RhdGUgdGhhdCByZXF1ZXN0LiBUaGlzIHdpbGwgdXN1YWxseSBiZSBzbmFwcGVkXG4gICAgICAgIC8vIHRvIGEgNCBtaWxpc2Vjb25kIGRlbGF5LCBidXQgb25jZSB3ZSdyZSBmbHVzaGluZywgdGhlcmUncyBubyBkZWxheVxuICAgICAgICAvLyBiZXR3ZWVuIGV2ZW50cy5cbiAgICAgICAgdmFyIHRpbWVvdXRIYW5kbGUgPSBzZXRUaW1lb3V0KGhhbmRsZVRpbWVyLCAwKTtcbiAgICAgICAgLy8gSG93ZXZlciwgc2luY2UgdGhpcyB0aW1lciBnZXRzIGZyZXF1ZW50bHkgZHJvcHBlZCBpbiBGaXJlZm94XG4gICAgICAgIC8vIHdvcmtlcnMsIHdlIGVubGlzdCBhbiBpbnRlcnZhbCBoYW5kbGUgdGhhdCB3aWxsIHRyeSB0byBmaXJlXG4gICAgICAgIC8vIGFuIGV2ZW50IDIwIHRpbWVzIHBlciBzZWNvbmQgdW50aWwgaXQgc3VjY2VlZHMuXG4gICAgICAgIHZhciBpbnRlcnZhbEhhbmRsZSA9IHNldEludGVydmFsKGhhbmRsZVRpbWVyLCA1MCk7XG5cbiAgICAgICAgZnVuY3Rpb24gaGFuZGxlVGltZXIoKSB7XG4gICAgICAgICAgICAvLyBXaGljaGV2ZXIgdGltZXIgc3VjY2VlZHMgd2lsbCBjYW5jZWwgYm90aCB0aW1lcnMgYW5kXG4gICAgICAgICAgICAvLyBleGVjdXRlIHRoZSBjYWxsYmFjay5cbiAgICAgICAgICAgIGNsZWFyVGltZW91dCh0aW1lb3V0SGFuZGxlKTtcbiAgICAgICAgICAgIGNsZWFySW50ZXJ2YWwoaW50ZXJ2YWxIYW5kbGUpO1xuICAgICAgICAgICAgY2FsbGJhY2soKTtcbiAgICAgICAgfVxuICAgIH07XG59XG5cbi8vIFRoaXMgaXMgZm9yIGBhc2FwLmpzYCBvbmx5LlxuLy8gSXRzIG5hbWUgd2lsbCBiZSBwZXJpb2RpY2FsbHkgcmFuZG9taXplZCB0byBicmVhayBhbnkgY29kZSB0aGF0IGRlcGVuZHMgb25cbi8vIGl0cyBleGlzdGVuY2UuXG5yYXdBc2FwLm1ha2VSZXF1ZXN0Q2FsbEZyb21UaW1lciA9IG1ha2VSZXF1ZXN0Q2FsbEZyb21UaW1lcjtcblxuLy8gQVNBUCB3YXMgb3JpZ2luYWxseSBhIG5leHRUaWNrIHNoaW0gaW5jbHVkZWQgaW4gUS4gVGhpcyB3YXMgZmFjdG9yZWQgb3V0XG4vLyBpbnRvIHRoaXMgQVNBUCBwYWNrYWdlLiBJdCB3YXMgbGF0ZXIgYWRhcHRlZCB0byBSU1ZQIHdoaWNoIG1hZGUgZnVydGhlclxuLy8gYW1lbmRtZW50cy4gVGhlc2UgZGVjaXNpb25zLCBwYXJ0aWN1bGFybHkgdG8gbWFyZ2luYWxpemUgTWVzc2FnZUNoYW5uZWwgYW5kXG4vLyB0byBjYXB0dXJlIHRoZSBNdXRhdGlvbk9ic2VydmVyIGltcGxlbWVudGF0aW9uIGluIGEgY2xvc3VyZSwgd2VyZSBpbnRlZ3JhdGVkXG4vLyBiYWNrIGludG8gQVNBUCBwcm9wZXIuXG4vLyBodHRwczovL2dpdGh1Yi5jb20vdGlsZGVpby9yc3ZwLmpzL2Jsb2IvY2RkZjcyMzI1NDZhOWNmODU4NTI0Yjc1Y2RlNmY5ZWRmNzI2MjBhNy9saWIvcnN2cC9hc2FwLmpzXG4iLCIndXNlIHN0cmljdCc7XG5cbnZhciBhc2FwID0gcmVxdWlyZSgnYXNhcC9yYXcnKTtcblxuZnVuY3Rpb24gbm9vcCgpIHt9XG5cbi8vIFN0YXRlczpcbi8vXG4vLyAwIC0gcGVuZGluZ1xuLy8gMSAtIGZ1bGZpbGxlZCB3aXRoIF92YWx1ZVxuLy8gMiAtIHJlamVjdGVkIHdpdGggX3ZhbHVlXG4vLyAzIC0gYWRvcHRlZCB0aGUgc3RhdGUgb2YgYW5vdGhlciBwcm9taXNlLCBfdmFsdWVcbi8vXG4vLyBvbmNlIHRoZSBzdGF0ZSBpcyBubyBsb25nZXIgcGVuZGluZyAoMCkgaXQgaXMgaW1tdXRhYmxlXG5cbi8vIEFsbCBgX2AgcHJlZml4ZWQgcHJvcGVydGllcyB3aWxsIGJlIHJlZHVjZWQgdG8gYF97cmFuZG9tIG51bWJlcn1gXG4vLyBhdCBidWlsZCB0aW1lIHRvIG9iZnVzY2F0ZSB0aGVtIGFuZCBkaXNjb3VyYWdlIHRoZWlyIHVzZS5cbi8vIFdlIGRvbid0IHVzZSBzeW1ib2xzIG9yIE9iamVjdC5kZWZpbmVQcm9wZXJ0eSB0byBmdWxseSBoaWRlIHRoZW1cbi8vIGJlY2F1c2UgdGhlIHBlcmZvcm1hbmNlIGlzbid0IGdvb2QgZW5vdWdoLlxuXG5cbi8vIHRvIGF2b2lkIHVzaW5nIHRyeS9jYXRjaCBpbnNpZGUgY3JpdGljYWwgZnVuY3Rpb25zLCB3ZVxuLy8gZXh0cmFjdCB0aGVtIHRvIGhlcmUuXG52YXIgTEFTVF9FUlJPUiA9IG51bGw7XG52YXIgSVNfRVJST1IgPSB7fTtcbmZ1bmN0aW9uIGdldFRoZW4ob2JqKSB7XG4gIHRyeSB7XG4gICAgcmV0dXJuIG9iai50aGVuO1xuICB9IGNhdGNoIChleCkge1xuICAgIExBU1RfRVJST1IgPSBleDtcbiAgICByZXR1cm4gSVNfRVJST1I7XG4gIH1cbn1cblxuZnVuY3Rpb24gdHJ5Q2FsbE9uZShmbiwgYSkge1xuICB0cnkge1xuICAgIHJldHVybiBmbihhKTtcbiAgfSBjYXRjaCAoZXgpIHtcbiAgICBMQVNUX0VSUk9SID0gZXg7XG4gICAgcmV0dXJuIElTX0VSUk9SO1xuICB9XG59XG5mdW5jdGlvbiB0cnlDYWxsVHdvKGZuLCBhLCBiKSB7XG4gIHRyeSB7XG4gICAgZm4oYSwgYik7XG4gIH0gY2F0Y2ggKGV4KSB7XG4gICAgTEFTVF9FUlJPUiA9IGV4O1xuICAgIHJldHVybiBJU19FUlJPUjtcbiAgfVxufVxuXG5tb2R1bGUuZXhwb3J0cyA9IFByb21pc2U7XG5cbmZ1bmN0aW9uIFByb21pc2UoZm4pIHtcbiAgaWYgKHR5cGVvZiB0aGlzICE9PSAnb2JqZWN0Jykge1xuICAgIHRocm93IG5ldyBUeXBlRXJyb3IoJ1Byb21pc2VzIG11c3QgYmUgY29uc3RydWN0ZWQgdmlhIG5ldycpO1xuICB9XG4gIGlmICh0eXBlb2YgZm4gIT09ICdmdW5jdGlvbicpIHtcbiAgICB0aHJvdyBuZXcgVHlwZUVycm9yKCdQcm9taXNlIGNvbnN0cnVjdG9yXFwncyBhcmd1bWVudCBpcyBub3QgYSBmdW5jdGlvbicpO1xuICB9XG4gIHRoaXMuX2ggPSAwO1xuICB0aGlzLl9pID0gMDtcbiAgdGhpcy5faiA9IG51bGw7XG4gIHRoaXMuX2sgPSBudWxsO1xuICBpZiAoZm4gPT09IG5vb3ApIHJldHVybjtcbiAgZG9SZXNvbHZlKGZuLCB0aGlzKTtcbn1cblByb21pc2UuX2wgPSBudWxsO1xuUHJvbWlzZS5fbSA9IG51bGw7XG5Qcm9taXNlLl9uID0gbm9vcDtcblxuUHJvbWlzZS5wcm90b3R5cGUudGhlbiA9IGZ1bmN0aW9uKG9uRnVsZmlsbGVkLCBvblJlamVjdGVkKSB7XG4gIGlmICh0aGlzLmNvbnN0cnVjdG9yICE9PSBQcm9taXNlKSB7XG4gICAgcmV0dXJuIHNhZmVUaGVuKHRoaXMsIG9uRnVsZmlsbGVkLCBvblJlamVjdGVkKTtcbiAgfVxuICB2YXIgcmVzID0gbmV3IFByb21pc2Uobm9vcCk7XG4gIGhhbmRsZSh0aGlzLCBuZXcgSGFuZGxlcihvbkZ1bGZpbGxlZCwgb25SZWplY3RlZCwgcmVzKSk7XG4gIHJldHVybiByZXM7XG59O1xuXG5mdW5jdGlvbiBzYWZlVGhlbihzZWxmLCBvbkZ1bGZpbGxlZCwgb25SZWplY3RlZCkge1xuICByZXR1cm4gbmV3IHNlbGYuY29uc3RydWN0b3IoZnVuY3Rpb24gKHJlc29sdmUsIHJlamVjdCkge1xuICAgIHZhciByZXMgPSBuZXcgUHJvbWlzZShub29wKTtcbiAgICByZXMudGhlbihyZXNvbHZlLCByZWplY3QpO1xuICAgIGhhbmRsZShzZWxmLCBuZXcgSGFuZGxlcihvbkZ1bGZpbGxlZCwgb25SZWplY3RlZCwgcmVzKSk7XG4gIH0pO1xufVxuZnVuY3Rpb24gaGFuZGxlKHNlbGYsIGRlZmVycmVkKSB7XG4gIHdoaWxlIChzZWxmLl9pID09PSAzKSB7XG4gICAgc2VsZiA9IHNlbGYuX2o7XG4gIH1cbiAgaWYgKFByb21pc2UuX2wpIHtcbiAgICBQcm9taXNlLl9sKHNlbGYpO1xuICB9XG4gIGlmIChzZWxmLl9pID09PSAwKSB7XG4gICAgaWYgKHNlbGYuX2ggPT09IDApIHtcbiAgICAgIHNlbGYuX2ggPSAxO1xuICAgICAgc2VsZi5fayA9IGRlZmVycmVkO1xuICAgICAgcmV0dXJuO1xuICAgIH1cbiAgICBpZiAoc2VsZi5faCA9PT0gMSkge1xuICAgICAgc2VsZi5faCA9IDI7XG4gICAgICBzZWxmLl9rID0gW3NlbGYuX2ssIGRlZmVycmVkXTtcbiAgICAgIHJldHVybjtcbiAgICB9XG4gICAgc2VsZi5fay5wdXNoKGRlZmVycmVkKTtcbiAgICByZXR1cm47XG4gIH1cbiAgaGFuZGxlUmVzb2x2ZWQoc2VsZiwgZGVmZXJyZWQpO1xufVxuXG5mdW5jdGlvbiBoYW5kbGVSZXNvbHZlZChzZWxmLCBkZWZlcnJlZCkge1xuICBhc2FwKGZ1bmN0aW9uKCkge1xuICAgIHZhciBjYiA9IHNlbGYuX2kgPT09IDEgPyBkZWZlcnJlZC5vbkZ1bGZpbGxlZCA6IGRlZmVycmVkLm9uUmVqZWN0ZWQ7XG4gICAgaWYgKGNiID09PSBudWxsKSB7XG4gICAgICBpZiAoc2VsZi5faSA9PT0gMSkge1xuICAgICAgICByZXNvbHZlKGRlZmVycmVkLnByb21pc2UsIHNlbGYuX2opO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgcmVqZWN0KGRlZmVycmVkLnByb21pc2UsIHNlbGYuX2opO1xuICAgICAgfVxuICAgICAgcmV0dXJuO1xuICAgIH1cbiAgICB2YXIgcmV0ID0gdHJ5Q2FsbE9uZShjYiwgc2VsZi5faik7XG4gICAgaWYgKHJldCA9PT0gSVNfRVJST1IpIHtcbiAgICAgIHJlamVjdChkZWZlcnJlZC5wcm9taXNlLCBMQVNUX0VSUk9SKTtcbiAgICB9IGVsc2Uge1xuICAgICAgcmVzb2x2ZShkZWZlcnJlZC5wcm9taXNlLCByZXQpO1xuICAgIH1cbiAgfSk7XG59XG5mdW5jdGlvbiByZXNvbHZlKHNlbGYsIG5ld1ZhbHVlKSB7XG4gIC8vIFByb21pc2UgUmVzb2x1dGlvbiBQcm9jZWR1cmU6IGh0dHBzOi8vZ2l0aHViLmNvbS9wcm9taXNlcy1hcGx1cy9wcm9taXNlcy1zcGVjI3RoZS1wcm9taXNlLXJlc29sdXRpb24tcHJvY2VkdXJlXG4gIGlmIChuZXdWYWx1ZSA9PT0gc2VsZikge1xuICAgIHJldHVybiByZWplY3QoXG4gICAgICBzZWxmLFxuICAgICAgbmV3IFR5cGVFcnJvcignQSBwcm9taXNlIGNhbm5vdCBiZSByZXNvbHZlZCB3aXRoIGl0c2VsZi4nKVxuICAgICk7XG4gIH1cbiAgaWYgKFxuICAgIG5ld1ZhbHVlICYmXG4gICAgKHR5cGVvZiBuZXdWYWx1ZSA9PT0gJ29iamVjdCcgfHwgdHlwZW9mIG5ld1ZhbHVlID09PSAnZnVuY3Rpb24nKVxuICApIHtcbiAgICB2YXIgdGhlbiA9IGdldFRoZW4obmV3VmFsdWUpO1xuICAgIGlmICh0aGVuID09PSBJU19FUlJPUikge1xuICAgICAgcmV0dXJuIHJlamVjdChzZWxmLCBMQVNUX0VSUk9SKTtcbiAgICB9XG4gICAgaWYgKFxuICAgICAgdGhlbiA9PT0gc2VsZi50aGVuICYmXG4gICAgICBuZXdWYWx1ZSBpbnN0YW5jZW9mIFByb21pc2VcbiAgICApIHtcbiAgICAgIHNlbGYuX2kgPSAzO1xuICAgICAgc2VsZi5faiA9IG5ld1ZhbHVlO1xuICAgICAgZmluYWxlKHNlbGYpO1xuICAgICAgcmV0dXJuO1xuICAgIH0gZWxzZSBpZiAodHlwZW9mIHRoZW4gPT09ICdmdW5jdGlvbicpIHtcbiAgICAgIGRvUmVzb2x2ZSh0aGVuLmJpbmQobmV3VmFsdWUpLCBzZWxmKTtcbiAgICAgIHJldHVybjtcbiAgICB9XG4gIH1cbiAgc2VsZi5faSA9IDE7XG4gIHNlbGYuX2ogPSBuZXdWYWx1ZTtcbiAgZmluYWxlKHNlbGYpO1xufVxuXG5mdW5jdGlvbiByZWplY3Qoc2VsZiwgbmV3VmFsdWUpIHtcbiAgc2VsZi5faSA9IDI7XG4gIHNlbGYuX2ogPSBuZXdWYWx1ZTtcbiAgaWYgKFByb21pc2UuX20pIHtcbiAgICBQcm9taXNlLl9tKHNlbGYsIG5ld1ZhbHVlKTtcbiAgfVxuICBmaW5hbGUoc2VsZik7XG59XG5mdW5jdGlvbiBmaW5hbGUoc2VsZikge1xuICBpZiAoc2VsZi5faCA9PT0gMSkge1xuICAgIGhhbmRsZShzZWxmLCBzZWxmLl9rKTtcbiAgICBzZWxmLl9rID0gbnVsbDtcbiAgfVxuICBpZiAoc2VsZi5faCA9PT0gMikge1xuICAgIGZvciAodmFyIGkgPSAwOyBpIDwgc2VsZi5fay5sZW5ndGg7IGkrKykge1xuICAgICAgaGFuZGxlKHNlbGYsIHNlbGYuX2tbaV0pO1xuICAgIH1cbiAgICBzZWxmLl9rID0gbnVsbDtcbiAgfVxufVxuXG5mdW5jdGlvbiBIYW5kbGVyKG9uRnVsZmlsbGVkLCBvblJlamVjdGVkLCBwcm9taXNlKXtcbiAgdGhpcy5vbkZ1bGZpbGxlZCA9IHR5cGVvZiBvbkZ1bGZpbGxlZCA9PT0gJ2Z1bmN0aW9uJyA/IG9uRnVsZmlsbGVkIDogbnVsbDtcbiAgdGhpcy5vblJlamVjdGVkID0gdHlwZW9mIG9uUmVqZWN0ZWQgPT09ICdmdW5jdGlvbicgPyBvblJlamVjdGVkIDogbnVsbDtcbiAgdGhpcy5wcm9taXNlID0gcHJvbWlzZTtcbn1cblxuLyoqXG4gKiBUYWtlIGEgcG90ZW50aWFsbHkgbWlzYmVoYXZpbmcgcmVzb2x2ZXIgZnVuY3Rpb24gYW5kIG1ha2Ugc3VyZVxuICogb25GdWxmaWxsZWQgYW5kIG9uUmVqZWN0ZWQgYXJlIG9ubHkgY2FsbGVkIG9uY2UuXG4gKlxuICogTWFrZXMgbm8gZ3VhcmFudGVlcyBhYm91dCBhc3luY2hyb255LlxuICovXG5mdW5jdGlvbiBkb1Jlc29sdmUoZm4sIHByb21pc2UpIHtcbiAgdmFyIGRvbmUgPSBmYWxzZTtcbiAgdmFyIHJlcyA9IHRyeUNhbGxUd28oZm4sIGZ1bmN0aW9uICh2YWx1ZSkge1xuICAgIGlmIChkb25lKSByZXR1cm47XG4gICAgZG9uZSA9IHRydWU7XG4gICAgcmVzb2x2ZShwcm9taXNlLCB2YWx1ZSk7XG4gIH0sIGZ1bmN0aW9uIChyZWFzb24pIHtcbiAgICBpZiAoZG9uZSkgcmV0dXJuO1xuICAgIGRvbmUgPSB0cnVlO1xuICAgIHJlamVjdChwcm9taXNlLCByZWFzb24pO1xuICB9KTtcbiAgaWYgKCFkb25lICYmIHJlcyA9PT0gSVNfRVJST1IpIHtcbiAgICBkb25lID0gdHJ1ZTtcbiAgICByZWplY3QocHJvbWlzZSwgTEFTVF9FUlJPUik7XG4gIH1cbn1cbiIsIid1c2Ugc3RyaWN0JztcblxuLy9UaGlzIGZpbGUgY29udGFpbnMgdGhlIEVTNiBleHRlbnNpb25zIHRvIHRoZSBjb3JlIFByb21pc2VzL0ErIEFQSVxuXG52YXIgUHJvbWlzZSA9IHJlcXVpcmUoJy4vY29yZS5qcycpO1xuXG5tb2R1bGUuZXhwb3J0cyA9IFByb21pc2U7XG5cbi8qIFN0YXRpYyBGdW5jdGlvbnMgKi9cblxudmFyIFRSVUUgPSB2YWx1ZVByb21pc2UodHJ1ZSk7XG52YXIgRkFMU0UgPSB2YWx1ZVByb21pc2UoZmFsc2UpO1xudmFyIE5VTEwgPSB2YWx1ZVByb21pc2UobnVsbCk7XG52YXIgVU5ERUZJTkVEID0gdmFsdWVQcm9taXNlKHVuZGVmaW5lZCk7XG52YXIgWkVSTyA9IHZhbHVlUHJvbWlzZSgwKTtcbnZhciBFTVBUWVNUUklORyA9IHZhbHVlUHJvbWlzZSgnJyk7XG5cbmZ1bmN0aW9uIHZhbHVlUHJvbWlzZSh2YWx1ZSkge1xuICB2YXIgcCA9IG5ldyBQcm9taXNlKFByb21pc2UuX24pO1xuICBwLl9pID0gMTtcbiAgcC5faiA9IHZhbHVlO1xuICByZXR1cm4gcDtcbn1cblByb21pc2UucmVzb2x2ZSA9IGZ1bmN0aW9uICh2YWx1ZSkge1xuICBpZiAodmFsdWUgaW5zdGFuY2VvZiBQcm9taXNlKSByZXR1cm4gdmFsdWU7XG5cbiAgaWYgKHZhbHVlID09PSBudWxsKSByZXR1cm4gTlVMTDtcbiAgaWYgKHZhbHVlID09PSB1bmRlZmluZWQpIHJldHVybiBVTkRFRklORUQ7XG4gIGlmICh2YWx1ZSA9PT0gdHJ1ZSkgcmV0dXJuIFRSVUU7XG4gIGlmICh2YWx1ZSA9PT0gZmFsc2UpIHJldHVybiBGQUxTRTtcbiAgaWYgKHZhbHVlID09PSAwKSByZXR1cm4gWkVSTztcbiAgaWYgKHZhbHVlID09PSAnJykgcmV0dXJuIEVNUFRZU1RSSU5HO1xuXG4gIGlmICh0eXBlb2YgdmFsdWUgPT09ICdvYmplY3QnIHx8IHR5cGVvZiB2YWx1ZSA9PT0gJ2Z1bmN0aW9uJykge1xuICAgIHRyeSB7XG4gICAgICB2YXIgdGhlbiA9IHZhbHVlLnRoZW47XG4gICAgICBpZiAodHlwZW9mIHRoZW4gPT09ICdmdW5jdGlvbicpIHtcbiAgICAgICAgcmV0dXJuIG5ldyBQcm9taXNlKHRoZW4uYmluZCh2YWx1ZSkpO1xuICAgICAgfVxuICAgIH0gY2F0Y2ggKGV4KSB7XG4gICAgICByZXR1cm4gbmV3IFByb21pc2UoZnVuY3Rpb24gKHJlc29sdmUsIHJlamVjdCkge1xuICAgICAgICByZWplY3QoZXgpO1xuICAgICAgfSk7XG4gICAgfVxuICB9XG4gIHJldHVybiB2YWx1ZVByb21pc2UodmFsdWUpO1xufTtcblxuUHJvbWlzZS5hbGwgPSBmdW5jdGlvbiAoYXJyKSB7XG4gIHZhciBhcmdzID0gQXJyYXkucHJvdG90eXBlLnNsaWNlLmNhbGwoYXJyKTtcblxuICByZXR1cm4gbmV3IFByb21pc2UoZnVuY3Rpb24gKHJlc29sdmUsIHJlamVjdCkge1xuICAgIGlmIChhcmdzLmxlbmd0aCA9PT0gMCkgcmV0dXJuIHJlc29sdmUoW10pO1xuICAgIHZhciByZW1haW5pbmcgPSBhcmdzLmxlbmd0aDtcbiAgICBmdW5jdGlvbiByZXMoaSwgdmFsKSB7XG4gICAgICBpZiAodmFsICYmICh0eXBlb2YgdmFsID09PSAnb2JqZWN0JyB8fCB0eXBlb2YgdmFsID09PSAnZnVuY3Rpb24nKSkge1xuICAgICAgICBpZiAodmFsIGluc3RhbmNlb2YgUHJvbWlzZSAmJiB2YWwudGhlbiA9PT0gUHJvbWlzZS5wcm90b3R5cGUudGhlbikge1xuICAgICAgICAgIHdoaWxlICh2YWwuX2kgPT09IDMpIHtcbiAgICAgICAgICAgIHZhbCA9IHZhbC5fajtcbiAgICAgICAgICB9XG4gICAgICAgICAgaWYgKHZhbC5faSA9PT0gMSkgcmV0dXJuIHJlcyhpLCB2YWwuX2opO1xuICAgICAgICAgIGlmICh2YWwuX2kgPT09IDIpIHJlamVjdCh2YWwuX2opO1xuICAgICAgICAgIHZhbC50aGVuKGZ1bmN0aW9uICh2YWwpIHtcbiAgICAgICAgICAgIHJlcyhpLCB2YWwpO1xuICAgICAgICAgIH0sIHJlamVjdCk7XG4gICAgICAgICAgcmV0dXJuO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgIHZhciB0aGVuID0gdmFsLnRoZW47XG4gICAgICAgICAgaWYgKHR5cGVvZiB0aGVuID09PSAnZnVuY3Rpb24nKSB7XG4gICAgICAgICAgICB2YXIgcCA9IG5ldyBQcm9taXNlKHRoZW4uYmluZCh2YWwpKTtcbiAgICAgICAgICAgIHAudGhlbihmdW5jdGlvbiAodmFsKSB7XG4gICAgICAgICAgICAgIHJlcyhpLCB2YWwpO1xuICAgICAgICAgICAgfSwgcmVqZWN0KTtcbiAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICAgIGFyZ3NbaV0gPSB2YWw7XG4gICAgICBpZiAoLS1yZW1haW5pbmcgPT09IDApIHtcbiAgICAgICAgcmVzb2x2ZShhcmdzKTtcbiAgICAgIH1cbiAgICB9XG4gICAgZm9yICh2YXIgaSA9IDA7IGkgPCBhcmdzLmxlbmd0aDsgaSsrKSB7XG4gICAgICByZXMoaSwgYXJnc1tpXSk7XG4gICAgfVxuICB9KTtcbn07XG5cblByb21pc2UucmVqZWN0ID0gZnVuY3Rpb24gKHZhbHVlKSB7XG4gIHJldHVybiBuZXcgUHJvbWlzZShmdW5jdGlvbiAocmVzb2x2ZSwgcmVqZWN0KSB7XG4gICAgcmVqZWN0KHZhbHVlKTtcbiAgfSk7XG59O1xuXG5Qcm9taXNlLnJhY2UgPSBmdW5jdGlvbiAodmFsdWVzKSB7XG4gIHJldHVybiBuZXcgUHJvbWlzZShmdW5jdGlvbiAocmVzb2x2ZSwgcmVqZWN0KSB7XG4gICAgdmFsdWVzLmZvckVhY2goZnVuY3Rpb24odmFsdWUpe1xuICAgICAgUHJvbWlzZS5yZXNvbHZlKHZhbHVlKS50aGVuKHJlc29sdmUsIHJlamVjdCk7XG4gICAgfSk7XG4gIH0pO1xufTtcblxuLyogUHJvdG90eXBlIE1ldGhvZHMgKi9cblxuUHJvbWlzZS5wcm90b3R5cGVbJ2NhdGNoJ10gPSBmdW5jdGlvbiAob25SZWplY3RlZCkge1xuICByZXR1cm4gdGhpcy50aGVuKG51bGwsIG9uUmVqZWN0ZWQpO1xufTtcbiIsIid1c2Ugc3RyaWN0JztcblxudmFyIFByb21pc2UgPSByZXF1aXJlKCcuL2NvcmUnKTtcblxudmFyIERFRkFVTFRfV0hJVEVMSVNUID0gW1xuICBSZWZlcmVuY2VFcnJvcixcbiAgVHlwZUVycm9yLFxuICBSYW5nZUVycm9yXG5dO1xuXG52YXIgZW5hYmxlZCA9IGZhbHNlO1xuZXhwb3J0cy5kaXNhYmxlID0gZGlzYWJsZTtcbmZ1bmN0aW9uIGRpc2FibGUoKSB7XG4gIGVuYWJsZWQgPSBmYWxzZTtcbiAgUHJvbWlzZS5fbCA9IG51bGw7XG4gIFByb21pc2UuX20gPSBudWxsO1xufVxuXG5leHBvcnRzLmVuYWJsZSA9IGVuYWJsZTtcbmZ1bmN0aW9uIGVuYWJsZShvcHRpb25zKSB7XG4gIG9wdGlvbnMgPSBvcHRpb25zIHx8IHt9O1xuICBpZiAoZW5hYmxlZCkgZGlzYWJsZSgpO1xuICBlbmFibGVkID0gdHJ1ZTtcbiAgdmFyIGlkID0gMDtcbiAgdmFyIGRpc3BsYXlJZCA9IDA7XG4gIHZhciByZWplY3Rpb25zID0ge307XG4gIFByb21pc2UuX2wgPSBmdW5jdGlvbiAocHJvbWlzZSkge1xuICAgIGlmIChcbiAgICAgIHByb21pc2UuX2kgPT09IDIgJiYgLy8gSVMgUkVKRUNURURcbiAgICAgIHJlamVjdGlvbnNbcHJvbWlzZS5fb11cbiAgICApIHtcbiAgICAgIGlmIChyZWplY3Rpb25zW3Byb21pc2UuX29dLmxvZ2dlZCkge1xuICAgICAgICBvbkhhbmRsZWQocHJvbWlzZS5fbyk7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICBjbGVhclRpbWVvdXQocmVqZWN0aW9uc1twcm9taXNlLl9vXS50aW1lb3V0KTtcbiAgICAgIH1cbiAgICAgIGRlbGV0ZSByZWplY3Rpb25zW3Byb21pc2UuX29dO1xuICAgIH1cbiAgfTtcbiAgUHJvbWlzZS5fbSA9IGZ1bmN0aW9uIChwcm9taXNlLCBlcnIpIHtcbiAgICBpZiAocHJvbWlzZS5faCA9PT0gMCkgeyAvLyBub3QgeWV0IGhhbmRsZWRcbiAgICAgIHByb21pc2UuX28gPSBpZCsrO1xuICAgICAgcmVqZWN0aW9uc1twcm9taXNlLl9vXSA9IHtcbiAgICAgICAgZGlzcGxheUlkOiBudWxsLFxuICAgICAgICBlcnJvcjogZXJyLFxuICAgICAgICB0aW1lb3V0OiBzZXRUaW1lb3V0KFxuICAgICAgICAgIG9uVW5oYW5kbGVkLmJpbmQobnVsbCwgcHJvbWlzZS5fbyksXG4gICAgICAgICAgLy8gRm9yIHJlZmVyZW5jZSBlcnJvcnMgYW5kIHR5cGUgZXJyb3JzLCB0aGlzIGFsbW9zdCBhbHdheXNcbiAgICAgICAgICAvLyBtZWFucyB0aGUgcHJvZ3JhbW1lciBtYWRlIGEgbWlzdGFrZSwgc28gbG9nIHRoZW0gYWZ0ZXIganVzdFxuICAgICAgICAgIC8vIDEwMG1zXG4gICAgICAgICAgLy8gb3RoZXJ3aXNlLCB3YWl0IDIgc2Vjb25kcyB0byBzZWUgaWYgdGhleSBnZXQgaGFuZGxlZFxuICAgICAgICAgIG1hdGNoV2hpdGVsaXN0KGVyciwgREVGQVVMVF9XSElURUxJU1QpXG4gICAgICAgICAgICA/IDEwMFxuICAgICAgICAgICAgOiAyMDAwXG4gICAgICAgICksXG4gICAgICAgIGxvZ2dlZDogZmFsc2VcbiAgICAgIH07XG4gICAgfVxuICB9O1xuICBmdW5jdGlvbiBvblVuaGFuZGxlZChpZCkge1xuICAgIGlmIChcbiAgICAgIG9wdGlvbnMuYWxsUmVqZWN0aW9ucyB8fFxuICAgICAgbWF0Y2hXaGl0ZWxpc3QoXG4gICAgICAgIHJlamVjdGlvbnNbaWRdLmVycm9yLFxuICAgICAgICBvcHRpb25zLndoaXRlbGlzdCB8fCBERUZBVUxUX1dISVRFTElTVFxuICAgICAgKVxuICAgICkge1xuICAgICAgcmVqZWN0aW9uc1tpZF0uZGlzcGxheUlkID0gZGlzcGxheUlkKys7XG4gICAgICBpZiAob3B0aW9ucy5vblVuaGFuZGxlZCkge1xuICAgICAgICByZWplY3Rpb25zW2lkXS5sb2dnZWQgPSB0cnVlO1xuICAgICAgICBvcHRpb25zLm9uVW5oYW5kbGVkKFxuICAgICAgICAgIHJlamVjdGlvbnNbaWRdLmRpc3BsYXlJZCxcbiAgICAgICAgICByZWplY3Rpb25zW2lkXS5lcnJvclxuICAgICAgICApO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgcmVqZWN0aW9uc1tpZF0ubG9nZ2VkID0gdHJ1ZTtcbiAgICAgICAgbG9nRXJyb3IoXG4gICAgICAgICAgcmVqZWN0aW9uc1tpZF0uZGlzcGxheUlkLFxuICAgICAgICAgIHJlamVjdGlvbnNbaWRdLmVycm9yXG4gICAgICAgICk7XG4gICAgICB9XG4gICAgfVxuICB9XG4gIGZ1bmN0aW9uIG9uSGFuZGxlZChpZCkge1xuICAgIGlmIChyZWplY3Rpb25zW2lkXS5sb2dnZWQpIHtcbiAgICAgIGlmIChvcHRpb25zLm9uSGFuZGxlZCkge1xuICAgICAgICBvcHRpb25zLm9uSGFuZGxlZChyZWplY3Rpb25zW2lkXS5kaXNwbGF5SWQsIHJlamVjdGlvbnNbaWRdLmVycm9yKTtcbiAgICAgIH0gZWxzZSBpZiAoIXJlamVjdGlvbnNbaWRdLm9uVW5oYW5kbGVkKSB7XG4gICAgICAgIGNvbnNvbGUud2FybihcbiAgICAgICAgICAnUHJvbWlzZSBSZWplY3Rpb24gSGFuZGxlZCAoaWQ6ICcgKyByZWplY3Rpb25zW2lkXS5kaXNwbGF5SWQgKyAnKTonXG4gICAgICAgICk7XG4gICAgICAgIGNvbnNvbGUud2FybihcbiAgICAgICAgICAnICBUaGlzIG1lYW5zIHlvdSBjYW4gaWdub3JlIGFueSBwcmV2aW91cyBtZXNzYWdlcyBvZiB0aGUgZm9ybSBcIlBvc3NpYmxlIFVuaGFuZGxlZCBQcm9taXNlIFJlamVjdGlvblwiIHdpdGggaWQgJyArXG4gICAgICAgICAgcmVqZWN0aW9uc1tpZF0uZGlzcGxheUlkICsgJy4nXG4gICAgICAgICk7XG4gICAgICB9XG4gICAgfVxuICB9XG59XG5cbmZ1bmN0aW9uIGxvZ0Vycm9yKGlkLCBlcnJvcikge1xuICBjb25zb2xlLndhcm4oJ1Bvc3NpYmxlIFVuaGFuZGxlZCBQcm9taXNlIFJlamVjdGlvbiAoaWQ6ICcgKyBpZCArICcpOicpO1xuICB2YXIgZXJyU3RyID0gKGVycm9yICYmIChlcnJvci5zdGFjayB8fCBlcnJvcikpICsgJyc7XG4gIGVyclN0ci5zcGxpdCgnXFxuJykuZm9yRWFjaChmdW5jdGlvbiAobGluZSkge1xuICAgIGNvbnNvbGUud2FybignICAnICsgbGluZSk7XG4gIH0pO1xufVxuXG5mdW5jdGlvbiBtYXRjaFdoaXRlbGlzdChlcnJvciwgbGlzdCkge1xuICByZXR1cm4gbGlzdC5zb21lKGZ1bmN0aW9uIChjbHMpIHtcbiAgICByZXR1cm4gZXJyb3IgaW5zdGFuY2VvZiBjbHM7XG4gIH0pO1xufSIsIlwidXNlIHN0cmljdFwiO1xuXG52YXIgTG9nZ2VyID0gcmVxdWlyZSgnLi9tb2R1bGVzL2xvZ2dlcicpO1xuXG52YXIgUHViU3ViID0gcmVxdWlyZSgnLi9tb2R1bGVzL3B1YnN1YicpO1xuXG52YXIgQ2FsbGVyID0gcmVxdWlyZSgnLi9tb2R1bGVzL2NhbGxlcicpO1xuXG52YXIgRG9tID0gcmVxdWlyZSgnLi9tb2R1bGVzL2RvbScpO1xuXG52YXIgSW5mb0NvbnRyb2xsZXIgPSByZXF1aXJlKCcuL21vZHVsZXMvaW5mby1jb250cm9sbGVyJyk7XG5cbnZhciBBdmF0YXJDb250cm9sbGVyID0gcmVxdWlyZSgnLi9tb2R1bGVzL2F2YXRhci1jb250cm9sbGVyJyk7XG5cbnZhciBTdG9yZSA9IHJlcXVpcmUoJy4vbW9kdWxlcy9zdG9yZScpO1xuXG52YXIgQ2xvdWRpbmFyeSA9IHJlcXVpcmUoJy4vbW9kdWxlcy9jbG91ZGluYXJ5LWltYWdlLXBpY2tlcicpO1xuXG52YXIgQUNHID0gcmVxdWlyZSgnLi9tb2R1bGVzL2FjY291bnQtY29uc2lzdGVuY3ktZ3VhcmQnKTtcblxudmFyIHBwYmFDb25mID0ge307XG5cbmZ1bmN0aW9uIGhleFRvUmdiKGhleCwgb3BhY2l0eSkge1xuICB2YXIgcmVzdWx0ID0gL14jPyhbYS1mXFxkXXsyfSkoW2EtZlxcZF17Mn0pKFthLWZcXGRdezJ9KSQvaS5leGVjKGhleCk7XG4gIHJldHVybiByZXN1bHQgPyBcInJnYmEoXCIuY29uY2F0KHBhcnNlSW50KHJlc3VsdFsxXSwgMTYpLCBcIiwgXCIpLmNvbmNhdChwYXJzZUludChyZXN1bHRbMl0sIDE2KSwgXCIsIFwiKS5jb25jYXQocGFyc2VJbnQocmVzdWx0WzNdLCAxNiksIFwiLCBcIikuY29uY2F0KG9wYWNpdHkgfHwgMSwgXCIpXCIpIDogbnVsbDtcbn1cblxuaWYgKHR5cGVvZiBQcm9taXNlID09PSAndW5kZWZpbmVkJykge1xuICByZXF1aXJlKCdwcm9taXNlL2xpYi9yZWplY3Rpb24tdHJhY2tpbmcnKS5lbmFibGUoKTtcblxuICB3aW5kb3cuUHJvbWlzZSA9IHJlcXVpcmUoJ3Byb21pc2UvbGliL2VzNi1leHRlbnNpb25zLmpzJyk7XG59XG5cbnZhciBhZnRlclJlbmRlciA9IGZ1bmN0aW9uIGFmdGVyUmVuZGVyKCkge1xuICBpZiAoU3RvcmUuZ2V0RnVsbFdpZHRoKCkgPT09IHRydWUpIHtcbiAgICBEb20uYWRkQ2xhc3MoZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoXCJiYWMtLXB1cmVzZGstYmFjLS1oZWFkZXItYXBwcy0tXCIpLCAnYmFjLS1mdWxsd2lkdGgnKTtcbiAgfVxuXG4gIGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKCdiYWMtLXB1cmVzZGstLWFwcHMtLW9wZW5lci0tJykuYWRkRXZlbnRMaXN0ZW5lcignY2xpY2snLCBmdW5jdGlvbiAoZSkge1xuICAgIGUucHJldmVudERlZmF1bHQoKTtcbiAgICBlLnN0b3BQcm9wYWdhdGlvbigpO1xuICAgIERvbS50b2dnbGVDbGFzcyhkb2N1bWVudC5nZXRFbGVtZW50QnlJZCgnYmFjLS1wdXJlc2RrLWFwcHMtY29udGFpbmVyLS0nKSwgJ2FjdGl2ZScpO1xuICB9KTtcbiAgZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoJ2JhYy0tdXNlci1hdmF0YXItdG9wJykuYWRkRXZlbnRMaXN0ZW5lcignY2xpY2snLCBmdW5jdGlvbiAoZSkge1xuICAgIGUuc3RvcFByb3BhZ2F0aW9uKCk7XG4gICAgRG9tLnJlbW92ZUNsYXNzKGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKCdiYWMtLXB1cmVzZGstYXBwcy1jb250YWluZXItLScpLCAnYWN0aXZlJyk7XG4gICAgRG9tLnRvZ2dsZUNsYXNzKGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKCdiYWMtLXB1cmVzZGstdXNlci1zaWRlYmFyLS0nKSwgJ2FjdGl2ZScpO1xuICB9KTtcbiAgd2luZG93LmFkZEV2ZW50TGlzdGVuZXIoJ2NsaWNrJywgZnVuY3Rpb24gKGUpIHtcbiAgICBEb20ucmVtb3ZlQ2xhc3MoZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoJ2JhYy0tcHVyZXNkay1hcHBzLWNvbnRhaW5lci0tJyksICdhY3RpdmUnKTtcbiAgICBEb20ucmVtb3ZlQ2xhc3MoZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoJ2JhYy0tcHVyZXNkay11c2VyLXNpZGViYXItLScpLCAnYWN0aXZlJyk7XG4gIH0pO1xuICBBdmF0YXJDb250cm9sbGVyLmluaXQoKTtcbiAgdmFyIHVzZXJEYXRhID0gU3RvcmUuZ2V0VXNlckRhdGEoKTtcbiAgQXZhdGFyQ29udHJvbGxlci5zZXRBdmF0YXIodXNlckRhdGEudXNlci5hdmF0YXJfdXJsKTtcbiAgSW5mb0NvbnRyb2xsZXIuaW5pdCgpO1xufTtcblxudmFyIFBQQkEgPSB7XG4gIHNldFdpbmRvd05hbWU6IGZ1bmN0aW9uIHNldFdpbmRvd05hbWUod24pIHtcbiAgICBTdG9yZS5zZXRXaW5kb3dOYW1lKHduKTtcbiAgfSxcbiAgc2V0Q29uZmlndXJhdGlvbjogZnVuY3Rpb24gc2V0Q29uZmlndXJhdGlvbihjb25mKSB7XG4gICAgU3RvcmUuc2V0Q29uZmlndXJhdGlvbihjb25mKTtcbiAgfSxcbiAgc2V0SFRNTFRlbXBsYXRlOiBmdW5jdGlvbiBzZXRIVE1MVGVtcGxhdGUodGVtcGxhdGUpIHtcbiAgICBTdG9yZS5zZXRIVE1MVGVtcGxhdGUodGVtcGxhdGUpO1xuICB9LFxuICBzZXRWZXJzaW9uTnVtYmVyOiBmdW5jdGlvbiBzZXRWZXJzaW9uTnVtYmVyKHZlcnNpb24pIHtcbiAgICBTdG9yZS5zZXRWZXJzaW9uTnVtYmVyKHZlcnNpb24pO1xuICB9LFxuICBpbml0OiBmdW5jdGlvbiBpbml0KGNvbmYpIHtcbiAgICBMb2dnZXIubG9nKCdpbml0aWFsaXppbmcgd2l0aCBjb25mOiAnLCBjb25mKTtcblxuICAgIGlmIChjb25mKSB7XG4gICAgICBpZiAoY29uZi5oZWFkZXJEaXZJZCkge1xuICAgICAgICBTdG9yZS5zZXRIVE1MQ29udGFpbmVyKGNvbmYuaGVhZGVyRGl2SWQpO1xuICAgICAgfVxuXG4gICAgICBpZiAoY29uZi5hcHBzVmlzaWJsZSAhPT0gbnVsbCkge1xuICAgICAgICBTdG9yZS5zZXRBcHBzVmlzaWJsZShjb25mLmFwcHNWaXNpYmxlKTtcbiAgICAgIH1cblxuICAgICAgaWYgKGNvbmYucm9vdFVybCkge1xuICAgICAgICBTdG9yZS5zZXRSb290VXJsKGNvbmYucm9vdFVybCk7XG4gICAgICB9XG5cbiAgICAgIGlmIChjb25mLmRldiA9PT0gdHJ1ZSkge1xuICAgICAgICBpZiAoY29uZi5kZXZLZXlzKSB7XG4gICAgICAgICAgQ2FsbGVyLnNldERldktleXMoY29uZi5kZXZLZXlzKTtcbiAgICAgICAgICBTdG9yZS5zZXREZXYodHJ1ZSk7XG4gICAgICAgIH1cbiAgICAgIH1cblxuICAgICAgaWYgKGNvbmYuZnVsbFdpZHRoKSB7XG4gICAgICAgIFN0b3JlLnNldEZ1bGxXaWR0aChjb25mLmZ1bGxXaWR0aCk7XG4gICAgICB9XG5cbiAgICAgIGlmIChjb25mLmRpc3BsYXlTdXBwb3J0KSB7XG4gICAgICAgIFN0b3JlLnNldERpc3BsYXlTdXBwb3J0KGNvbmYuZGlzcGxheVN1cHBvcnQpO1xuICAgICAgfVxuXG4gICAgICBpZiAoY29uZi5hcHBJbmZvKSB7XG4gICAgICAgIFN0b3JlLnNldEFwcEluZm8oY29uZi5hcHBJbmZvKTsgLy8gaWYgZ29vZ2xlIHRhZyBtYW5hZ2VyIGlzIHByZXNlbnQgaXQgd2lsbCBwdXNoIHRoZSB1c2VyJ3MgaW5mbyB0byBkYXRhTGF5ZXJcblxuICAgICAgICB0cnkge1xuICAgICAgICAgIGRhdGFMYXllci5wdXNoKHtcbiAgICAgICAgICAgICdhcHAnOiBjb25mLmFwcEluZm8ubmFtZVxuICAgICAgICAgIH0pO1xuICAgICAgICB9IGNhdGNoIChlKSB7Ly8gbm8gR29vZ2xlIFRhZyBoYXMgYmVlbiBzZXRcbiAgICAgICAgfVxuICAgICAgfVxuICAgICAgLyogb3B0aW9uYWwgc2Vzc2lvbiB1cmwgKi9cblxuXG4gICAgICBpZiAoY29uZi5zZXNzaW9uRW5kcG9pbnQpIHtcbiAgICAgICAgU3RvcmUuc2V0U2Vzc2lvbkVuZHBvaW50KGNvbmYuc2Vzc2lvbkVuZHBvaW50KTtcbiAgICAgIH1cblxuICAgICAgaWYgKGNvbmYuYXBpUm9vdEZvbGRlcikge1xuICAgICAgICBTdG9yZS5zZXRVcmxWZXJzaW9uUHJlZml4KGNvbmYuYXBpUm9vdEZvbGRlcik7XG4gICAgICB9XG4gICAgfVxuXG4gICAgcHBiYUNvbmYgPSBjb25mO1xuICAgIHJldHVybiB0cnVlO1xuICB9LFxuICBzZXR1cEdvb2dsZVRhZzogZnVuY3Rpb24gc2V0dXBHb29nbGVUYWcodXNlcikge1xuICAgIC8vIGlmIGdvb2dsZSB0YWcgbWFuYWdlciBpcyBwcmVzZW50IGl0IHdpbGwgcHVzaCB0aGUgdXNlcidzIGluZm8gdG8gZGF0YUxheWVyXG4gICAgdHJ5IHtcbiAgICAgIGRhdGFMYXllci5wdXNoKHtcbiAgICAgICAgJ3VzZXJJZCc6IHVzZXIuaWQsXG4gICAgICAgICd1c2VyJzogXCJcIi5jb25jYXQodXNlci5maXJzdG5hbWUsIFwiIFwiKS5jb25jYXQodXNlci5sYXN0bmFtZSksXG4gICAgICAgICd0ZW5hbnRfaWQnOiB1c2VyLnRlbmFudF9pZCxcbiAgICAgICAgJ3VzZXJUeXBlJzogdXNlci51c2VyX3R5cGUsXG4gICAgICAgICdhY2NvdW50SWQnOiB1c2VyLmFjY291bnRfaWQsXG4gICAgICAgICdhY2NvdW50TmFtZSc6IHVzZXIuYWNjb3VudC5uYW1lXG4gICAgICB9KTtcbiAgICB9IGNhdGNoIChlKSB7Ly8gbm8gR29vZ2xlIFRhZyBoYXMgYmVlbiBzZXRcbiAgICB9XG4gIH0sXG4gIGF1dGhlbnRpY2F0ZTogZnVuY3Rpb24gYXV0aGVudGljYXRlKF9zdWNjZXNzKSB7XG4gICAgdmFyIHNlbGYgPSBQUEJBO1xuICAgIENhbGxlci5tYWtlQ2FsbCh7XG4gICAgICB0eXBlOiAnR0VUJyxcbiAgICAgIGVuZHBvaW50OiBTdG9yZS5nZXRBdXRoZW50aWNhdGlvbkVuZHBvaW50KCksXG4gICAgICBjYWxsYmFja3M6IHtcbiAgICAgICAgc3VjY2VzczogZnVuY3Rpb24gc3VjY2VzcyhyZXN1bHQpIHtcbiAgICAgICAgICAvLyBMb2dnZXIubG9nKHJlc3VsdCk7XG4gICAgICAgICAgU3RvcmUuc2V0VXNlckRhdGEocmVzdWx0KTtcbiAgICAgICAgICBzZWxmLnJlbmRlcigpO1xuICAgICAgICAgIFBQQkEuZ2V0QXBwcygpO1xuICAgICAgICAgIEFDRy5pbml0aWFsaXNlKHJlc3VsdC51c2VyLmFjY291bnRfc2ZpZCwgZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgRG9tLnJlbW92ZUNsYXNzKGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKCdiYWMtLS1pbnZhbGlkLWFjY291bnQnKSwgJ2ludmFsaWQnKTtcbiAgICAgICAgICB9LCBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICBEb20uYWRkQ2xhc3MoZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoJ2JhYy0tLWludmFsaWQtYWNjb3VudCcpLCAnaW52YWxpZCcpO1xuICAgICAgICAgIH0pO1xuICAgICAgICAgIFBQQkEuc2V0dXBHb29nbGVUYWcocmVzdWx0LnVzZXIpO1xuXG4gICAgICAgICAgX3N1Y2Nlc3MocmVzdWx0KTtcbiAgICAgICAgfSxcbiAgICAgICAgZmFpbDogZnVuY3Rpb24gZmFpbChlcnIpIHtcbiAgICAgICAgICB3aW5kb3cubG9jYXRpb24uaHJlZiA9IFN0b3JlLmdldExvZ2luVXJsKCk7XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICB9KTtcbiAgfSxcbiAgYXV0aGVudGljYXRlUHJvbWlzZTogZnVuY3Rpb24gYXV0aGVudGljYXRlUHJvbWlzZSgpIHtcbiAgICB2YXIgc2VsZiA9IFBQQkE7XG4gICAgcmV0dXJuIENhbGxlci5wcm9taXNlQ2FsbCh7XG4gICAgICB0eXBlOiAnR0VUJyxcbiAgICAgIGVuZHBvaW50OiBTdG9yZS5nZXRBdXRoZW50aWNhdGlvbkVuZHBvaW50KCksXG4gICAgICBtaWRkbGV3YXJlczoge1xuICAgICAgICBzdWNjZXNzOiBmdW5jdGlvbiBzdWNjZXNzKHJlc3VsdCkge1xuICAgICAgICAgIC8vIExvZ2dlci5sb2cocmVzdWx0KTtcbiAgICAgICAgICBTdG9yZS5zZXRVc2VyRGF0YShyZXN1bHQpO1xuICAgICAgICAgIHNlbGYucmVuZGVyKCk7XG4gICAgICAgICAgUFBCQS5nZXRBcHBzKCk7XG4gICAgICAgICAgQUNHLmluaXRpYWxpc2UocmVzdWx0LnVzZXIuYWNjb3VudF9zZmlkLCBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICBEb20ucmVtb3ZlQ2xhc3MoZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoJ2JhYy0tLWludmFsaWQtYWNjb3VudCcpLCAnaW52YWxpZCcpO1xuICAgICAgICAgIH0sIGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgIERvbS5hZGRDbGFzcyhkb2N1bWVudC5nZXRFbGVtZW50QnlJZCgnYmFjLS0taW52YWxpZC1hY2NvdW50JyksICdpbnZhbGlkJyk7XG4gICAgICAgICAgfSk7XG4gICAgICAgICAgUFBCQS5zZXR1cEdvb2dsZVRhZyhyZXN1bHQudXNlcik7XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICB9KTtcbiAgfSxcbiAgZ2V0QXBwczogZnVuY3Rpb24gZ2V0QXBwcygpIHtcbiAgICBDYWxsZXIubWFrZUNhbGwoe1xuICAgICAgdHlwZTogJ0dFVCcsXG4gICAgICBlbmRwb2ludDogU3RvcmUuZ2V0QXBwc0VuZHBvaW50KCksXG4gICAgICBjYWxsYmFja3M6IHtcbiAgICAgICAgc3VjY2VzczogZnVuY3Rpb24gc3VjY2VzcyhyZXN1bHQpIHtcbiAgICAgICAgICBTdG9yZS5zZXRBcHBzKHJlc3VsdCk7XG4gICAgICAgICAgUFBCQS5yZW5kZXJBcHBzKHJlc3VsdC5hcHBzKTtcbiAgICAgICAgfSxcbiAgICAgICAgZmFpbDogZnVuY3Rpb24gZmFpbChlcnIpIHtcbiAgICAgICAgICB3aW5kb3cubG9jYXRpb24uaHJlZiA9IFN0b3JlLmdldExvZ2luVXJsKCk7XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICB9KTtcbiAgfSxcbiAgZ2V0QXZhaWxhYmxlTGlzdGVuZXJzOiBmdW5jdGlvbiBnZXRBdmFpbGFibGVMaXN0ZW5lcnMoKSB7XG4gICAgcmV0dXJuIFB1YlN1Yi5nZXRBdmFpbGFibGVMaXN0ZW5lcnMoKTtcbiAgfSxcbiAgc3Vic2NyaWJlTGlzdGVuZXI6IGZ1bmN0aW9uIHN1YnNjcmliZUxpc3RlbmVyKGV2ZW50dCwgZnVuY3QpIHtcbiAgICByZXR1cm4gUHViU3ViLnN1YnNjcmliZShldmVudHQsIGZ1bmN0KTtcbiAgfSxcbiAgZ2V0VXNlckRhdGE6IGZ1bmN0aW9uIGdldFVzZXJEYXRhKCkge1xuICAgIHJldHVybiBTdG9yZS5nZXRVc2VyRGF0YSgpO1xuICB9LFxuICBzZXRJbnB1dFBsYWNlaG9sZGVyOiBmdW5jdGlvbiBzZXRJbnB1dFBsYWNlaG9sZGVyKHR4dCkgey8vIGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKFN0b3JlLmdldFNlYXJjaElucHV0SWQoKSkucGxhY2Vob2xkZXIgPSB0eHQ7XG4gIH0sXG4gIGNoYW5nZUFjY291bnQ6IGZ1bmN0aW9uIGNoYW5nZUFjY291bnQoYWNjb3VudElkKSB7XG4gICAgQ2FsbGVyLm1ha2VDYWxsKHtcbiAgICAgIHR5cGU6ICdHRVQnLFxuICAgICAgZW5kcG9pbnQ6IFN0b3JlLmdldFN3aXRjaEFjY291bnRFbmRwb2ludChhY2NvdW50SWQpLFxuICAgICAgY2FsbGJhY2tzOiB7XG4gICAgICAgIHN1Y2Nlc3M6IGZ1bmN0aW9uIHN1Y2Nlc3MocmVzdWx0KSB7XG4gICAgICAgICAgQUNHLmNoYW5nZUFjY291bnQoYWNjb3VudElkKTtcbiAgICAgICAgICB3aW5kb3cubG9jYXRpb24uaHJlZiA9ICcvYXBwcyc7XG4gICAgICAgIH0sXG4gICAgICAgIGZhaWw6IGZ1bmN0aW9uIGZhaWwoZXJyKSB7XG4gICAgICAgICAgYWxlcnQoJ1NvcnJ5LCBzb21ldGhpbmcgd2VudCB3cm9uZyB3aXRoIHlvdXIgcmVxdWVzdC4gUGxlc2UgdHJ5IGFnYWluJyk7XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICB9KTtcbiAgfSxcbiAgcmVuZGVyQXBwczogZnVuY3Rpb24gcmVuZGVyQXBwcyhhcHBzKSB7XG4gICAgdmFyIGFwcFRlbXBsYXRlID0gZnVuY3Rpb24gYXBwVGVtcGxhdGUoYXBwKSB7XG4gICAgICByZXR1cm4gXCJcXG5cXHRcXHRcXHRcXHQ8YSBjbGFzcz1cXFwiYmFjLS1pbWFnZS1saW5rXFxcIiBocmVmPVxcXCJcIi5jb25jYXQoYXBwLmFwcGxpY2F0aW9uX3VybCwgXCJcXFwiIHN0eWxlPVxcXCJiYWNrZ3JvdW5kOiAjXCIpLmNvbmNhdChhcHAuY29sb3IsIFwiXFxcIj5cXG5cXHRcXHRcXHRcXHRcXHQ8aW1nIHNyYz1cXFwiXCIpLmNvbmNhdChhcHAuaWNvbiwgXCJcXFwiIC8+XFxuXFx0XFx0XFx0XFx0PC9hPlxcblxcdFxcdFxcdFxcdFxcblxcdFxcdFxcdFxcdDxkaXYgY2xhc3M9XFxcImJhYy0tcHVyZXNkay1hcHAtdGV4dC1jb250YWluZXJcXFwiPlxcblxcdFxcdFxcdFxcdFxcdDxhIGhyZWY9XFxcIlwiKS5jb25jYXQoYXBwLmFwcGxpY2F0aW9uX3VybCwgXCJcXFwiIGNsYXNzPVxcXCJiYWMtLWFwcC1uYW1lXFxcIj5cIikuY29uY2F0KGFwcC5uYW1lLCBcIjwvYT5cXG5cXHRcXHRcXHRcXHRcXHQ8YSBocmVmPVxcXCJcIikuY29uY2F0KGFwcC5hcHBsaWNhdGlvbl91cmwsIFwiXFxcIiBjbGFzcz1cXFwiYmFjLS1hcHAtZGVzY3JpcHRpb25cXFwiPlwiKS5jb25jYXQoYXBwLmRlc2NyID09PSBudWxsID8gJy0nIDogYXBwLmRlc2NyLCBcIjwvYT5cXG5cXHRcXHRcXHRcXHQ8L2Rpdj5cXG5cXHRcXHRcXHRcIik7XG4gICAgfTtcblxuICAgIGZvciAodmFyIGkgPSAwOyBpIDwgYXBwcy5sZW5ndGg7IGkrKykge1xuICAgICAgdmFyIGFwcCA9IGFwcHNbaV07XG4gICAgICB2YXIgZGl2ID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudChcImRpdlwiKTtcbiAgICAgIGRpdi5jbGFzc05hbWUgPSBcImJhYy0tYXBwc1wiO1xuICAgICAgZGl2LmlubmVySFRNTCA9IGFwcFRlbXBsYXRlKGFwcCk7IC8vIGNoZWNrIHRvIHNlZSBpZiB0aGUgdXNlciBoYXMgYWNjZXNzIHRvIHRoZSB0d28gbWFpbiBhcHBzIGFuZCByZW1vdmUgZGlzYWJsZWQgY2xhc3NcblxuICAgICAgaWYgKGFwcC5hcHBsaWNhdGlvbl91cmwgPT09ICcvYXBwL2dyb3VwcycpIHtcbiAgICAgICAgRG9tLnJlbW92ZUNsYXNzKGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKCdiYWMtLXB1cmVzZGstZ3JvdXBzLWxpbmstLScpLCAnZGlzYWJsZWQnKTtcbiAgICAgIH0gZWxzZSBpZiAoYXBwLmFwcGxpY2F0aW9uX3VybCA9PT0gJy9hcHAvY2FtcGFpZ25zJykge1xuICAgICAgICBEb20ucmVtb3ZlQ2xhc3MoZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoJ2JhYy0tcHVyZXNkay1jYW1wYWlnbnMtbGluay0tJyksICdkaXNhYmxlZCcpO1xuICAgICAgfVxuXG4gICAgICBkb2N1bWVudC5nZXRFbGVtZW50QnlJZChcImJhYy0tYXBzLWFjdHVhbC1jb250YWluZXJcIikuYXBwZW5kQ2hpbGQoZGl2KTtcbiAgICB9IC8vIGZpbmFsbHkgY2hlY2sgaWYgdGhlIHVzZXIgaXMgb24gYW55IG9mIHRoZSB0d28gbWFpbiBhcHBzXG5cblxuICAgIHZhciBhcHBJbmZvID0gU3RvcmUuZ2V0QXBwSW5mbygpO1xuXG4gICAgaWYgKGFwcEluZm8ucm9vdCA9PT0gXCIvYXBwL2dyb3Vwc1wiKSB7XG4gICAgICBEb20uYWRkQ2xhc3MoZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoJ2JhYy0tcHVyZXNkay1ncm91cHMtbGluay0tJyksICdzZWxlY3RlZCcpO1xuICAgIH0gZWxzZSBpZiAoYXBwSW5mby5yb290ID09PSBcIi9hcHAvY2FtcGFpZ25zXCIpIHtcbiAgICAgIERvbS5hZGRDbGFzcyhkb2N1bWVudC5nZXRFbGVtZW50QnlJZCgnYmFjLS1wdXJlc2RrLWNhbXBhaWducy1saW5rLS0nKSwgJ3NlbGVjdGVkJyk7XG4gICAgfVxuICB9LFxuICByZW5kZXJVc2VyOiBmdW5jdGlvbiByZW5kZXJVc2VyKHVzZXIpIHtcbiAgICB2YXIgdXNlclRlbXBsYXRlID0gZnVuY3Rpb24gdXNlclRlbXBsYXRlKHVzZXIpIHtcbiAgICAgIHJldHVybiBcIlxcblxcdFxcdFxcdFxcdDxkaXYgY2xhc3M9XFxcImJhYy0tdXNlci1pbWFnZVxcXCIgaWQ9XFxcImJhYy0tdXNlci1pbWFnZVxcXCI+XFxuXFx0XFx0XFx0XFx0XFx0PGkgY2xhc3M9XFxcImZhIGZhLWNhbWVyYVxcXCI+PC9pPlxcblxcdFxcdFxcdCAgIFxcdDxkaXYgaWQ9XFxcImJhYy0tdXNlci1pbWFnZS1maWxlXFxcIj48L2Rpdj5cXG5cXHRcXHRcXHQgICBcXHQ8ZGl2IGlkPVxcXCJiYWMtLXVzZXItaW1hZ2UtdXBsb2FkLXByb2dyZXNzXFxcIj5cXG5cXHRcXHRcXHQgICBcXHRcXHQ8c3ZnIHdpZHRoPSc2MHB4JyBoZWlnaHQ9JzYwcHgnIHhtbG5zPVxcXCJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2Z1xcXCIgdmlld0JveD1cXFwiMCAwIDEwMCAxMDBcXFwiIHByZXNlcnZlQXNwZWN0UmF0aW89XFxcInhNaWRZTWlkXFxcIiBjbGFzcz1cXFwidWlsLWRlZmF1bHRcXFwiPjxyZWN0IHg9XFxcIjBcXFwiIHk9XFxcIjBcXFwiIHdpZHRoPVxcXCIxMDBcXFwiIGhlaWdodD1cXFwiMTAwXFxcIiBmaWxsPVxcXCJub25lXFxcIiBjbGFzcz1cXFwiYmtcXFwiPjwvcmVjdD48cmVjdCAgeD0nNDYuNScgeT0nNDAnIHdpZHRoPSc3JyBoZWlnaHQ9JzIwJyByeD0nNScgcnk9JzUnIGZpbGw9JyNmZmZmZmYnIHRyYW5zZm9ybT0ncm90YXRlKDAgNTAgNTApIHRyYW5zbGF0ZSgwIC0zMCknPiAgPGFuaW1hdGUgYXR0cmlidXRlTmFtZT0nb3BhY2l0eScgZnJvbT0nMScgdG89JzAnIGR1cj0nMXMnIGJlZ2luPSctMXMnIHJlcGVhdENvdW50PSdpbmRlZmluaXRlJy8+PC9yZWN0PjxyZWN0ICB4PSc0Ni41JyB5PSc0MCcgd2lkdGg9JzcnIGhlaWdodD0nMjAnIHJ4PSc1JyByeT0nNScgZmlsbD0nI2ZmZmZmZicgdHJhbnNmb3JtPSdyb3RhdGUoMzAgNTAgNTApIHRyYW5zbGF0ZSgwIC0zMCknPiAgPGFuaW1hdGUgYXR0cmlidXRlTmFtZT0nb3BhY2l0eScgZnJvbT0nMScgdG89JzAnIGR1cj0nMXMnIGJlZ2luPSctMC45MTY2NjY2NjY2NjY2NjY2cycgcmVwZWF0Q291bnQ9J2luZGVmaW5pdGUnLz48L3JlY3Q+PHJlY3QgIHg9JzQ2LjUnIHk9JzQwJyB3aWR0aD0nNycgaGVpZ2h0PScyMCcgcng9JzUnIHJ5PSc1JyBmaWxsPScjZmZmZmZmJyB0cmFuc2Zvcm09J3JvdGF0ZSg2MCA1MCA1MCkgdHJhbnNsYXRlKDAgLTMwKSc+ICA8YW5pbWF0ZSBhdHRyaWJ1dGVOYW1lPSdvcGFjaXR5JyBmcm9tPScxJyB0bz0nMCcgZHVyPScxcycgYmVnaW49Jy0wLjgzMzMzMzMzMzMzMzMzMzRzJyByZXBlYXRDb3VudD0naW5kZWZpbml0ZScvPjwvcmVjdD48cmVjdCAgeD0nNDYuNScgeT0nNDAnIHdpZHRoPSc3JyBoZWlnaHQ9JzIwJyByeD0nNScgcnk9JzUnIGZpbGw9JyNmZmZmZmYnIHRyYW5zZm9ybT0ncm90YXRlKDkwIDUwIDUwKSB0cmFuc2xhdGUoMCAtMzApJz4gIDxhbmltYXRlIGF0dHJpYnV0ZU5hbWU9J29wYWNpdHknIGZyb209JzEnIHRvPScwJyBkdXI9JzFzJyBiZWdpbj0nLTAuNzVzJyByZXBlYXRDb3VudD0naW5kZWZpbml0ZScvPjwvcmVjdD48cmVjdCAgeD0nNDYuNScgeT0nNDAnIHdpZHRoPSc3JyBoZWlnaHQ9JzIwJyByeD0nNScgcnk9JzUnIGZpbGw9JyNmZmZmZmYnIHRyYW5zZm9ybT0ncm90YXRlKDEyMCA1MCA1MCkgdHJhbnNsYXRlKDAgLTMwKSc+ICA8YW5pbWF0ZSBhdHRyaWJ1dGVOYW1lPSdvcGFjaXR5JyBmcm9tPScxJyB0bz0nMCcgZHVyPScxcycgYmVnaW49Jy0wLjY2NjY2NjY2NjY2NjY2NjZzJyByZXBlYXRDb3VudD0naW5kZWZpbml0ZScvPjwvcmVjdD48cmVjdCAgeD0nNDYuNScgeT0nNDAnIHdpZHRoPSc3JyBoZWlnaHQ9JzIwJyByeD0nNScgcnk9JzUnIGZpbGw9JyNmZmZmZmYnIHRyYW5zZm9ybT0ncm90YXRlKDE1MCA1MCA1MCkgdHJhbnNsYXRlKDAgLTMwKSc+ICA8YW5pbWF0ZSBhdHRyaWJ1dGVOYW1lPSdvcGFjaXR5JyBmcm9tPScxJyB0bz0nMCcgZHVyPScxcycgYmVnaW49Jy0wLjU4MzMzMzMzMzMzMzMzMzRzJyByZXBlYXRDb3VudD0naW5kZWZpbml0ZScvPjwvcmVjdD48cmVjdCAgeD0nNDYuNScgeT0nNDAnIHdpZHRoPSc3JyBoZWlnaHQ9JzIwJyByeD0nNScgcnk9JzUnIGZpbGw9JyNmZmZmZmYnIHRyYW5zZm9ybT0ncm90YXRlKDE4MCA1MCA1MCkgdHJhbnNsYXRlKDAgLTMwKSc+ICA8YW5pbWF0ZSBhdHRyaWJ1dGVOYW1lPSdvcGFjaXR5JyBmcm9tPScxJyB0bz0nMCcgZHVyPScxcycgYmVnaW49Jy0wLjVzJyByZXBlYXRDb3VudD0naW5kZWZpbml0ZScvPjwvcmVjdD48cmVjdCAgeD0nNDYuNScgeT0nNDAnIHdpZHRoPSc3JyBoZWlnaHQ9JzIwJyByeD0nNScgcnk9JzUnIGZpbGw9JyNmZmZmZmYnIHRyYW5zZm9ybT0ncm90YXRlKDIxMCA1MCA1MCkgdHJhbnNsYXRlKDAgLTMwKSc+ICA8YW5pbWF0ZSBhdHRyaWJ1dGVOYW1lPSdvcGFjaXR5JyBmcm9tPScxJyB0bz0nMCcgZHVyPScxcycgYmVnaW49Jy0wLjQxNjY2NjY2NjY2NjY2NjdzJyByZXBlYXRDb3VudD0naW5kZWZpbml0ZScvPjwvcmVjdD48cmVjdCAgeD0nNDYuNScgeT0nNDAnIHdpZHRoPSc3JyBoZWlnaHQ9JzIwJyByeD0nNScgcnk9JzUnIGZpbGw9JyNmZmZmZmYnIHRyYW5zZm9ybT0ncm90YXRlKDI0MCA1MCA1MCkgdHJhbnNsYXRlKDAgLTMwKSc+ICA8YW5pbWF0ZSBhdHRyaWJ1dGVOYW1lPSdvcGFjaXR5JyBmcm9tPScxJyB0bz0nMCcgZHVyPScxcycgYmVnaW49Jy0wLjMzMzMzMzMzMzMzMzMzMzNzJyByZXBlYXRDb3VudD0naW5kZWZpbml0ZScvPjwvcmVjdD48cmVjdCAgeD0nNDYuNScgeT0nNDAnIHdpZHRoPSc3JyBoZWlnaHQ9JzIwJyByeD0nNScgcnk9JzUnIGZpbGw9JyNmZmZmZmYnIHRyYW5zZm9ybT0ncm90YXRlKDI3MCA1MCA1MCkgdHJhbnNsYXRlKDAgLTMwKSc+ICA8YW5pbWF0ZSBhdHRyaWJ1dGVOYW1lPSdvcGFjaXR5JyBmcm9tPScxJyB0bz0nMCcgZHVyPScxcycgYmVnaW49Jy0wLjI1cycgcmVwZWF0Q291bnQ9J2luZGVmaW5pdGUnLz48L3JlY3Q+PHJlY3QgIHg9JzQ2LjUnIHk9JzQwJyB3aWR0aD0nNycgaGVpZ2h0PScyMCcgcng9JzUnIHJ5PSc1JyBmaWxsPScjZmZmZmZmJyB0cmFuc2Zvcm09J3JvdGF0ZSgzMDAgNTAgNTApIHRyYW5zbGF0ZSgwIC0zMCknPiAgPGFuaW1hdGUgYXR0cmlidXRlTmFtZT0nb3BhY2l0eScgZnJvbT0nMScgdG89JzAnIGR1cj0nMXMnIGJlZ2luPSctMC4xNjY2NjY2NjY2NjY2NjY2NnMnIHJlcGVhdENvdW50PSdpbmRlZmluaXRlJy8+PC9yZWN0PjxyZWN0ICB4PSc0Ni41JyB5PSc0MCcgd2lkdGg9JzcnIGhlaWdodD0nMjAnIHJ4PSc1JyByeT0nNScgZmlsbD0nI2ZmZmZmZicgdHJhbnNmb3JtPSdyb3RhdGUoMzMwIDUwIDUwKSB0cmFuc2xhdGUoMCAtMzApJz4gIDxhbmltYXRlIGF0dHJpYnV0ZU5hbWU9J29wYWNpdHknIGZyb209JzEnIHRvPScwJyBkdXI9JzFzJyBiZWdpbj0nLTAuMDgzMzMzMzMzMzMzMzMzMzNzJyByZXBlYXRDb3VudD0naW5kZWZpbml0ZScvPjwvcmVjdD48L3N2Zz5cXG5cXHRcXHRcXHRcXHRcXHQ8L2Rpdj5cXG5cXHRcXHRcXHQgICA8L2Rpdj5cXG5cXHRcXHRcXHRcXHQ8ZGl2IGNsYXNzPVxcXCJiYWMtLXVzZXItbmFtZVxcXCI+XCIuY29uY2F0KHVzZXIuZmlyc3RuYW1lLCBcIiBcIikuY29uY2F0KHVzZXIubGFzdG5hbWUsIFwiPC9kaXY+XFxuXFx0XFx0XFx0XFx0PGRpdiBjbGFzcz1cXFwiYmFjLS11c2VyLWVtYWlsXFxcIj5cIikuY29uY2F0KHVzZXIuZW1haWwsIFwiPC9kaXY+XFxuXFx0XFx0XFx0XCIpO1xuICAgIH07XG5cbiAgICB2YXIgZGl2ID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudCgnZGl2Jyk7XG4gICAgZGl2LmNsYXNzTmFtZSA9IFwiYmFjLS11c2VyLXNpZGViYXItaW5mb1wiO1xuICAgIGRpdi5pbm5lckhUTUwgPSB1c2VyVGVtcGxhdGUodXNlcik7XG4gICAgZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoJ2JhYy0tcHVyZXNkay11c2VyLWRldGFpbHMtLScpLnByZXBlbmQoZGl2KTtcbiAgICBkb2N1bWVudC5nZXRFbGVtZW50QnlJZCgnYmFjLS1wdXJlc2RrLXVzZXItYXZhdGFyLS0nKS5pbm5lckhUTUwgPSB1c2VyLmZpcnN0bmFtZS5jaGFyQXQoMCkgKyB1c2VyLmxhc3RuYW1lLmNoYXJBdCgwKTtcbiAgfSxcbiAgcmVuZGVyQWNjb3VudHM6IGZ1bmN0aW9uIHJlbmRlckFjY291bnRzKGFjY291bnRzLCBjdXJyZW50QWNjb3VudCkge1xuICAgIC8vIExvZ2dlci5sb2coY3VycmVudEFjY291bnQpO1xuICAgIHZhciBhY2NvdW50c1RlbXBsYXRlID0gZnVuY3Rpb24gYWNjb3VudHNUZW1wbGF0ZShhY2NvdW50LCBpc1RoZVNlbGVjdGVkKSB7XG4gICAgICByZXR1cm4gXCJcXG5cXHRcXHRcXHRcXHQ8ZGl2IGNsYXNzPVxcXCJiYWMtLXVzZXItbGlzdC1pdGVtLWltYWdlXFxcIj5cXG5cXHRcXHRcXHRcXHRcXHQ8aW1nIHNyYz1cXFwiXCIuY29uY2F0KGFjY291bnQuc2RrX3NxdWFyZV9sb2dvX2ljb24sIFwiXFxcIiBhbHQ9XFxcIlxcXCI+XFxuXFx0XFx0XFx0XFx0PC9kaXY+XFxuXFx0XFx0XFx0XFx0PGRpdiBjbGFzcz1cXFwiYmFjLXVzZXItYXBwLWRldGFpbHNcXFwiPlxcblxcdFxcdFxcdFxcdFxcdCA8c3Bhbj5cIikuY29uY2F0KGFjY291bnQubmFtZSwgXCI8L3NwYW4+XFxuXFx0XFx0XFx0XFx0PC9kaXY+XFxuXFx0XFx0XFx0XFx0XCIpLmNvbmNhdChpc1RoZVNlbGVjdGVkID8gJzxkaXYgaWQ9XCJiYWMtLXNlbGVjdGVkLWFjb3VudC1pbmRpY2F0b3JcIiBjbGFzcz1cImJhYy0tc2VsZWN0ZWQtYWNvdW50LWluZGljYXRvclwiPjwvZGl2PicgOiAnJywgXCJcXG5cXHRcXHRcXHRcIik7XG4gICAgfTtcblxuICAgIHZhciBfbG9vcCA9IGZ1bmN0aW9uIF9sb29wKGkpIHtcbiAgICAgIHZhciBhY2NvdW50ID0gYWNjb3VudHNbaV07XG4gICAgICB2YXIgZGl2ID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudCgnZGl2Jyk7XG4gICAgICBkaXYuY2xhc3NOYW1lID0gJ2JhYy0tdXNlci1saXN0LWl0ZW0nO1xuICAgICAgZGl2LmlubmVySFRNTCA9IGFjY291bnRzVGVtcGxhdGUoYWNjb3VudCwgYWNjb3VudC5zZmlkID09PSBjdXJyZW50QWNjb3VudC5zZmlkKTtcblxuICAgICAgaWYgKGFjY291bnQuc2ZpZCA9PT0gY3VycmVudEFjY291bnQuc2ZpZCkge1xuICAgICAgICBkaXYuc3R5bGUuYmFja2dyb3VuZCA9IGhleFRvUmdiKCcjRkZGRkZGJywgMC44NSk7XG4gICAgICB9XG5cbiAgICAgIGRpdi5vbmNsaWNrID0gZnVuY3Rpb24gKGUpIHtcbiAgICAgICAgZS5wcmV2ZW50RGVmYXVsdCgpO1xuICAgICAgICBQUEJBLmNoYW5nZUFjY291bnQoYWNjb3VudC5zZmlkKTtcbiAgICAgIH07XG5cbiAgICAgIGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKCdiYWMtLXB1cmVzZGstdXNlci1idXNpbmVzc2VzLS0nKS5hcHBlbmRDaGlsZChkaXYpO1xuICAgIH07XG5cbiAgICBmb3IgKHZhciBpID0gMDsgaSA8IGFjY291bnRzLmxlbmd0aDsgaSsrKSB7XG4gICAgICBfbG9vcChpKTtcbiAgICB9XG4gIH0sXG4gIHJlbmRlckluZm9CbG9ja3M6IGZ1bmN0aW9uIHJlbmRlckluZm9CbG9ja3MoKSB7XG4gICAgSW5mb0NvbnRyb2xsZXIucmVuZGVySW5mb0Jsb2NrcygpO1xuICB9LFxuICByZW5kZXJWZXJzaW9uTnVtYmVyOiBmdW5jdGlvbiByZW5kZXJWZXJzaW9uTnVtYmVyKHZlcnNpb24pIHtcbiAgICBkb2N1bWVudC5nZXRFbGVtZW50QnlJZCgncHVyZXNkay12ZXJzaW9uLW51bWJlcicpLmlubmVySFRNTCA9IHZlcnNpb247XG4gIH0sXG4gIHJlbmRlclplbmRlc2s6IGZ1bmN0aW9uIHJlbmRlclplbmRlc2soKSB7XG4gICAgaWYgKFN0b3JlLmdldERpc3BsYXlTdXBwb3J0KCkpIHtcbiAgICAgIHZhciB6ZHNjcmlwdCA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoJ3NjcmlwdCcpO1xuICAgICAgemRzY3JpcHQuc3JjID0gXCJodHRwczovL3N0YXRpYy56ZGFzc2V0cy5jb20vZWtyL3NuaXBwZXQuanM/a2V5PTk4NjhjNzFkLTY3OTMtNDJhYS1iMmZhLTEyNDE5YzdiZDQ5OFwiO1xuICAgICAgemRzY3JpcHQuaWQgPSBcInplLXNuaXBwZXRcIjtcbiAgICAgIHpkc2NyaXB0LmFzeW5jID0gdHJ1ZTtcbiAgICAgIHpkc2NyaXB0LnR5cGUgPSAndGV4dC9qYXZhc2NyaXB0JztcbiAgICAgIGRvY3VtZW50LmdldEVsZW1lbnRzQnlUYWdOYW1lKCdoZWFkJylbMF0uYXBwZW5kQ2hpbGQoemRzY3JpcHQpO1xuICAgIH1cbiAgfSxcbiAgc3R5bGVBY2NvdW50OiBmdW5jdGlvbiBzdHlsZUFjY291bnQoYWNjb3VudCkge1xuICAgIHZhciBhcHBJbmZvID0gU3RvcmUuZ2V0QXBwSW5mbygpO1xuICAgIHZhciBsb2dvID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudCgnaW1nJyk7XG4gICAgbG9nby5zcmMgPSBhY2NvdW50LnNka19sb2dvX2ljb247XG4gICAgZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoJ2JhYy0tcHVyZXNkay1hY2NvdW50LWxvZ28tLScpLnByZXBlbmQobG9nbyk7XG5cbiAgICBkb2N1bWVudC5nZXRFbGVtZW50QnlJZCgnYmFjLS1wdXJlc2RrLWFjY291bnQtbG9nby0tJykub25jbGljayA9IGZ1bmN0aW9uIChlKSB7XG4gICAgICB3aW5kb3cubG9jYXRpb24uaHJlZiA9IFN0b3JlLmdldFJvb3RVcmwoKTtcbiAgICB9O1xuXG4gICAgZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoXCJhcHAtbmFtZS1saW5rLXRvLXJvb3RcIikuaHJlZiA9IFN0b3JlLmdldFJvb3RVcmwoKTtcbiAgICB2YXIgcmdiQmcgPSBoZXhUb1JnYihhY2NvdW50LnNka19iYWNrZ3JvdW5kX2NvbG9yLCAwLjE1KTtcbiAgICBkb2N1bWVudC5nZXRFbGVtZW50QnlJZCgnYmFjLS1wdXJlc2RrLWJhYy0taGVhZGVyLWFwcHMtLScpLnN0eWxlLmNzc1RleHQgPSBcImJhY2tncm91bmQ6ICNcIiArIGFjY291bnQuc2RrX2JhY2tncm91bmRfY29sb3I7XG4gICAgZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoJ2JhYy0tdXNlci1zaWRlYmFyLXdoaXRlLWJnJykuc3R5bGUuY3NzVGV4dCA9IFwiYmFja2dyb3VuZC1jb2xvcjogXCIgKyByZ2JCZzsgLy8gaWYoZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoJ2JhYy0tcHVyZXNkay1hcHBzLW5hbWUtLScpKXtcbiAgICAvLyBcdGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKCdiYWMtLXB1cmVzZGstYXBwcy1uYW1lLS0nKS5zdHlsZS5jc3NUZXh0ID0gXCJjb2xvcjogI1wiICsgYWNjb3VudC5zZGtfZm9udF9jb2xvcjtcbiAgICAvLyB9XG4gICAgLy8gaWYoZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoJ2JhYy0tc2VsZWN0ZWQtYWNvdW50LWluZGljYXRvcicpKXtcbiAgICAvLyBcdGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKCdiYWMtLXNlbGVjdGVkLWFjb3VudC1pbmRpY2F0b3InKS5zdHlsZS5jc3NUZXh0ID0gXCJiYWNrZ3JvdW5kOiAjXCIgKyBhY2NvdW50LnNka19mb250X2NvbG9yO1xuICAgIC8vIH1cbiAgfSxcbiAgZ29Ub0xvZ2luUGFnZTogZnVuY3Rpb24gZ29Ub0xvZ2luUGFnZSgpIHtcbiAgICB3aW5kb3cubG9jYXRpb24uaHJlZiA9IFN0b3JlLmdldExvZ2luVXJsKCk7XG4gIH0sXG5cbiAgLyogTE9BREVSICovXG4gIHNob3dMb2FkZXI6IGZ1bmN0aW9uIHNob3dMb2FkZXIoKSB7XG4gICAgRG9tLmFkZENsYXNzKGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKCdiYWMtLXB1cmVzZGstLWxvYWRlci0tJyksICdiYWMtLXB1cmVzZGstdmlzaWJsZScpO1xuICB9LFxuICBoaWRlTG9hZGVyOiBmdW5jdGlvbiBoaWRlTG9hZGVyKCkge1xuICAgIERvbS5yZW1vdmVDbGFzcyhkb2N1bWVudC5nZXRFbGVtZW50QnlJZCgnYmFjLS1wdXJlc2RrLS1sb2FkZXItLScpLCAnYmFjLS1wdXJlc2RrLXZpc2libGUnKTtcbiAgfSxcbiAgb3BlbkNsb3VkaW5hcnlQaWNrZXI6IGZ1bmN0aW9uIG9wZW5DbG91ZGluYXJ5UGlja2VyKG9wdGlvbnMpIHtcbiAgICBDbG91ZGluYXJ5Lm9wZW5Nb2RhbChvcHRpb25zKTtcbiAgfSxcblxuICAvKlxuICAgdHlwZTogb25lIG9mOlxuICAgLSBzdWNjZXNzXG4gICAtIGluZm9cbiAgIC0gd2FybmluZ1xuICAgLSBlcnJvclxuICAgdGV4dDogdGhlIHRleHQgdG8gZGlzcGxheVxuICAgb3B0aW9ucyAob3B0aW9uYWwpOiB7XG4gICBcdFx0aGlkZUluOiBtaWxsaXNlY29uZHMgdG8gaGlkZSBpdC4gLTEgZm9yIG5vdCBoaWRpbmcgaXQgYXQgYWxsLiBEZWZhdWx0IGlzIDUwMDBcbiAgIH1cbiAgICovXG4gIHNldEluZm86IGZ1bmN0aW9uIHNldEluZm8odHlwZSwgdGV4dCwgb3B0aW9ucykge1xuICAgIEluZm9Db250cm9sbGVyLnNob3dJbmZvKHR5cGUsIHRleHQsIG9wdGlvbnMpO1xuICB9LFxuICBzZXRUaXRsZUFuZEZhdmljb246IGZ1bmN0aW9uIHNldFRpdGxlQW5kRmF2aWNvbigpIHtcbiAgICB2YXIgZmF2bGluayA9IGRvY3VtZW50LnF1ZXJ5U2VsZWN0b3IoXCJsaW5rW3JlbCo9J2ljb24nXVwiKSB8fCBkb2N1bWVudC5jcmVhdGVFbGVtZW50KCdsaW5rJyk7XG4gICAgZmF2bGluay5ocmVmID0gJ2h0dHBzOi8vY2xvdWRjZG4ucHVyZXByb2ZpbGUuY29tL2ltYWdlL3VwbG9hZC92MS9fX2Fzc2V0c19tYXN0ZXJfXy9iMWEwYzMxNmFkN2Y0YTY3OWMyZWVlNjE1ODE0NDY2Yyc7XG4gICAgZmF2bGluay5yZWwgPSAnc2hvcnRjdXQgaWNvbic7XG4gICAgZG9jdW1lbnQuZ2V0RWxlbWVudHNCeVRhZ05hbWUoJ2hlYWQnKVswXS5hcHBlbmRDaGlsZChmYXZsaW5rKTtcbiAgICB2YXIgYXBwSW5mbyA9IFN0b3JlLmdldEFwcEluZm8oKTtcblxuICAgIGlmIChhcHBJbmZvICE9PSBudWxsKSB7XG4gICAgICBkb2N1bWVudC50aXRsZSA9IFwiUHVyZXByb2ZpbGUgQWNjZXNzIHwgXCIuY29uY2F0KGFwcEluZm8ubmFtZSk7XG4gICAgfSBlbHNlIHtcbiAgICAgIGRvY3VtZW50LnRpdGxlID0gXCJQdXJlcHJvZmlsZSBBY2Nlc3NcIjtcbiAgICB9XG4gIH0sXG4gIHJlbmRlcjogZnVuY3Rpb24gcmVuZGVyKCkge1xuICAgIHZhciB3aGVyZVRvID0gZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoU3RvcmUuZ2V0SFRMTUNvbnRhaW5lcigpKTtcblxuICAgIGlmICh3aGVyZVRvID09PSBudWxsKSB7XG4gICAgICBMb2dnZXIuZXJyb3IoJ3RoZSBjb250YWluZXIgd2l0aCBpZCBcIicgKyB3aGVyZVRvICsgJ1wiIGhhcyBub3QgYmVlbiBmb3VuZCBvbiB0aGUgZG9jdW1lbnQuIFRoZSBsaWJyYXJ5IGlzIGdvaW5nIHRvIGNyZWF0ZSBpdC4nKTtcbiAgICAgIHZhciBkaXYgPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KCdkaXYnKTtcbiAgICAgIGRpdi5pZCA9IFN0b3JlLmdldEhUTE1Db250YWluZXIoKTtcbiAgICAgIGRpdi5zdHlsZS53aWR0aCA9ICcxMDAlJztcbiAgICAgIGRpdi5zdHlsZS5oZWlnaHQgPSBcIjUwcHhcIjtcbiAgICAgIGRpdi5zdHlsZS5wb3NpdGlvbiA9IFwiZml4ZWRcIjtcbiAgICAgIGRpdi5zdHlsZS50b3AgPSBcIjBweFwiO1xuICAgICAgZGl2LnN0eWxlLnpJbmRleCA9IFwiMjE0NzQ4MzY0N1wiO1xuICAgICAgZG9jdW1lbnQuYm9keS5pbnNlcnRCZWZvcmUoZGl2LCBkb2N1bWVudC5ib2R5LmZpcnN0Q2hpbGQpO1xuICAgICAgd2hlcmVUbyA9IGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKFN0b3JlLmdldEhUTE1Db250YWluZXIoKSk7XG4gICAgfVxuXG4gICAgd2hlcmVUby5pbm5lckhUTUwgPSBTdG9yZS5nZXRIVE1MKCk7XG4gICAgUFBCQS5yZW5kZXJVc2VyKFN0b3JlLmdldFVzZXJEYXRhKCkudXNlcik7XG4gICAgUFBCQS5yZW5kZXJJbmZvQmxvY2tzKCk7XG4gICAgUFBCQS5yZW5kZXJBY2NvdW50cyhTdG9yZS5nZXRVc2VyRGF0YSgpLnVzZXIuYWNjb3VudHMsIFN0b3JlLmdldFVzZXJEYXRhKCkudXNlci5hY2NvdW50KTtcbiAgICBQUEJBLnJlbmRlclplbmRlc2soKTtcbiAgICBQUEJBLnN0eWxlQWNjb3VudChTdG9yZS5nZXRVc2VyRGF0YSgpLnVzZXIuYWNjb3VudCk7XG4gICAgUFBCQS5zZXRUaXRsZUFuZEZhdmljb24oKTtcbiAgICBQUEJBLnJlbmRlclZlcnNpb25OdW1iZXIoU3RvcmUuZ2V0VmVyc2lvbk51bWJlcigpKTtcblxuICAgIGlmIChTdG9yZS5nZXRBcHBzVmlzaWJsZSgpID09PSBmYWxzZSkge1xuICAgICAgZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoJ2JhYy0tcHVyZXNkay1hcHBzLXNlY3Rpb24tLScpLnN0eWxlLmNzc1RleHQgPSBcImRpc3BsYXk6bm9uZVwiO1xuICAgIH1cblxuICAgIGFmdGVyUmVuZGVyKCk7XG4gIH1cbn07XG5tb2R1bGUuZXhwb3J0cyA9IFBQQkE7IiwiXCJ1c2Ugc3RyaWN0XCI7XG5cbi8qIVxuICogUHVyZVByb2ZpbGUgUHVyZVByb2ZpbGUgQnVzaW5lc3MgQXBwcyBEZXZlbG9wbWVudCBTREtcbiAqXG4gKiB2ZXJzaW9uOiAyLjkuNS1yYzJcbiAqIGRhdGU6IDIwMjAtMDEtMTVcbiAqXG4gKiBDb3B5cmlnaHQgMjAxNywgUHVyZVByb2ZpbGVcbiAqIFJlbGVhc2VkIHVuZGVyIE1JVCBsaWNlbnNlXG4gKiBodHRwczovL29wZW5zb3VyY2Uub3JnL2xpY2Vuc2VzL01JVFxuICovXG52YXIgcHBiYSA9IHJlcXVpcmUoJy4vUFBCQScpO1xuXG5wcGJhLnNldFdpbmRvd05hbWUoJ1BVUkVTREsnKTtcbnBwYmEuc2V0Q29uZmlndXJhdGlvbih7XG4gIFwibG9nc1wiOiBmYWxzZSxcbiAgXCJyb290VXJsXCI6IFwiL1wiLFxuICBcImJhc2VVcmxcIjogXCJhcGkvdjEvXCIsXG4gIFwibG9naW5VcmxcIjogXCJzaWduaW5cIixcbiAgXCJzZWFyY2hJbnB1dElkXCI6IFwiLS1wdXJlc2RrLS1zZWFyY2gtLWlucHV0LS1cIixcbiAgXCJyZWRpcmVjdFVybFBhcmFtXCI6IFwicmVkaXJlY3RfdXJsXCJcbn0pO1xucHBiYS5zZXRIVE1MVGVtcGxhdGUoXCI8aGVhZGVyIGNsYXNzPVxcXCJiYWMtLWhlYWRlci1hcHBzXFxcIiBpZD1cXFwiYmFjLS1wdXJlc2RrLWJhYy0taGVhZGVyLWFwcHMtLVxcXCI+XFxuICAgIDxkaXYgY2xhc3M9XFxcImJhYy0tY29udGFpbmVyXFxcIj5cXG4gICAgICAgIDxkaXYgY2xhc3M9XFxcImJhYy0tbG9nb1xcXCIgaWQ9XFxcImJhYy0tcHVyZXNkay1hY2NvdW50LWxvZ28tLVxcXCI+XFxuICAgICAgICAgICAgPGRpdiBjbGFzcz1cXFwiYmFjLS1wdXJlc2RrLWFwcC1uYW1lLS1cXFwiPlxcbiAgICAgICAgICAgICAgICA8c3ZnIHdpZHRoPVxcXCI4cHhcXFwiIGhlaWdodD1cXFwiMTJweFxcXCIgdmlld0JveD1cXFwiMCAwIDggMTJcXFwiIHZlcnNpb249XFxcIjEuMVxcXCIgeG1sbnM9XFxcImh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnXFxcIiB4bWxuczp4bGluaz1cXFwiaHR0cDovL3d3dy53My5vcmcvMTk5OS94bGlua1xcXCI+XFxuICAgICAgICAgICAgICAgICAgICA8ZyBpZD1cXFwiUFAtQkEtUG9ydGFsLUhvbWVfRGVza3RvcC12MlxcXCIgc3Ryb2tlPVxcXCJub25lXFxcIiBzdHJva2Utd2lkdGg9XFxcIjFcXFwiIGZpbGw9XFxcIm5vbmVcXFwiIGZpbGwtcnVsZT1cXFwiZXZlbm9kZFxcXCI+XFxuICAgICAgICAgICAgICAgICAgICAgICAgPGcgaWQ9XFxcIlBQQ00tTGlzdGluZ19Db25uZXhpb25fMDFfTWF4X0RcXFwiIHRyYW5zZm9ybT1cXFwidHJhbnNsYXRlKC0xODEuMDAwMDAwLCAtNzguMDAwMDAwKVxcXCIgZmlsbD1cXFwiIzMzMzMzM1xcXCIgZmlsbC1ydWxlPVxcXCJub256ZXJvXFxcIj5cXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgPGcgaWQ9XFxcImVsZW1lbnRzLS8tc2RrLS8tYnV0dG9uLWNvcHktMy1lbGVtZW50cy0vLXNkay0vLWJ1dHRvblxcXCIgdHJhbnNmb3JtPVxcXCJ0cmFuc2xhdGUoMTY0LjAwMDAwMCwgNzAuMDAwMDAwKVxcXCI+XFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICA8ZyBpZD1cXFwiaWNvbnMvYXBwcy9jYW1wYWlnbnMtaWNvbnMtLy1hcHBzLS8tNDB4NDAtLy1iYWNrLWFycm93XFxcIiB0cmFuc2Zvcm09XFxcInRyYW5zbGF0ZSgxMS4wMDAwMDAsIDQuMDAwMDAwKVxcXCI+XFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgPGcgaWQ9XFxcImRvd25sb2FkLWFycm93XFxcIiB0cmFuc2Zvcm09XFxcInRyYW5zbGF0ZSg2LjUwMDAwMCwgNC4wMDAwMDApXFxcIj5cXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgPHBhdGggZD1cXFwiTS0wLjg4Mjc0MDk0NCwyLjc3OTU3OTg5IEMtMS4yNTI3MTEzMywyLjQwNjgwNjcgLTEuODUyNTUxODMsMi40MDY4MDY3IC0yLjIyMjUyMjIxLDIuNzc5NTc5ODkgQy0yLjU5MjQ5MjYsMy4xNTIzNTMwOCAtMi41OTI0OTI2LDMuNzU2NzM3ODMgLTIuMjIyNTIyMjEsNC4xMjk1MTEwMiBMMi44MzAxMDkzNyw5LjIyMDQyMDExIEMzLjIwMDA3OTc1LDkuNTkzMTkzMyAzLjc5OTkyMDI1LDkuNTkzMTkzMyA0LjE2OTg5MDYzLDkuMjIwNDIwMTEgTDkuMjIyNTIyMjEsNC4xMjk1MTEwMiBDOS41OTI0OTI2LDMuNzU2NzM3ODMgOS41OTI0OTI2LDMuMTUyMzUzMDggOS4yMjI1MjIyMSwyLjc3OTU3OTg5IEM4Ljg1MjU1MTgzLDIuNDA2ODA2NyA4LjI1MjcxMTMzLDIuNDA2ODA2NyA3Ljg4Mjc0MDk0LDIuNzc5NTc5ODkgTDMuNSw3LjE5NTUyMzQyIEwtMC44ODI3NDA5NDQsMi43Nzk1Nzk4OSBaXFxcIiBpZD1cXFwiUGF0aFxcXCIgdHJhbnNmb3JtPVxcXCJ0cmFuc2xhdGUoMy41MDAwMDAsIDYuMDAwMDAwKSByb3RhdGUoLTI3MC4wMDAwMDApIHRyYW5zbGF0ZSgtMy41MDAwMDAsIC02LjAwMDAwMCkgXFxcIj48L3BhdGg+XFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgPC9nPlxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgPC9nPlxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICA8L2c+XFxuICAgICAgICAgICAgICAgICAgICAgICAgPC9nPlxcbiAgICAgICAgICAgICAgICAgICAgPC9nPlxcbiAgICAgICAgICAgICAgICA8L3N2Zz5cXG4gICAgICAgICAgICAgICAgPGEgaHJlZj1cXFwiI1xcXCIgaWQ9XFxcImFwcC1uYW1lLWxpbmstdG8tcm9vdFxcXCI+QXBwIFBvcnRhbDwvYT5cXG4gICAgICAgICAgICA8L2Rpdj5cXG4gICAgICAgIDwvZGl2PlxcbiAgICAgICAgPGRpdiBjbGFzcz1cXFwiYmFjLS11c2VyLWFjdGlvbnNcXFwiPlxcbiAgICAgICAgICAgIDxzdmcgaWQ9XFxcImJhYy0tcHVyZXNkay0tbG9hZGVyLS1cXFwiIHdpZHRoPVxcXCIzOFxcXCIgaGVpZ2h0PVxcXCIzOFxcXCIgdmlld0JveD1cXFwiMCAwIDQ0IDQ0XFxcIiB4bWxucz1cXFwiaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmdcXFwiIHN0cm9rZT1cXFwiI2ZmZlxcXCIgc3R5bGU9XFxcIlxcbiAgICBtYXJnaW4tcmlnaHQ6IDEwcHg7XFxuXFxcIj5cXG4gICAgICAgICAgICAgICAgPGcgZmlsbD1cXFwibm9uZVxcXCIgZmlsbC1ydWxlPVxcXCJldmVub2RkXFxcIiBzdHJva2Utd2lkdGg9XFxcIjJcXFwiPlxcbiAgICAgICAgICAgICAgICAgICAgPGNpcmNsZSBjeD1cXFwiMjJcXFwiIGN5PVxcXCIyMlxcXCIgcj1cXFwiMTYuNjQzN1xcXCI+XFxuICAgICAgICAgICAgICAgICAgICAgICAgPGFuaW1hdGUgYXR0cmlidXRlTmFtZT1cXFwiclxcXCIgYmVnaW49XFxcIjBzXFxcIiBkdXI9XFxcIjEuOHNcXFwiIHZhbHVlcz1cXFwiMTsgMjBcXFwiIGNhbGNNb2RlPVxcXCJzcGxpbmVcXFwiIGtleVRpbWVzPVxcXCIwOyAxXFxcIiBrZXlTcGxpbmVzPVxcXCIwLjE2NSwgMC44NCwgMC40NCwgMVxcXCIgcmVwZWF0Q291bnQ9XFxcImluZGVmaW5pdGVcXFwiPjwvYW5pbWF0ZT5cXG4gICAgICAgICAgICAgICAgICAgICAgICA8YW5pbWF0ZSBhdHRyaWJ1dGVOYW1lPVxcXCJzdHJva2Utb3BhY2l0eVxcXCIgYmVnaW49XFxcIjBzXFxcIiBkdXI9XFxcIjEuOHNcXFwiIHZhbHVlcz1cXFwiMTsgMFxcXCIgY2FsY01vZGU9XFxcInNwbGluZVxcXCIga2V5VGltZXM9XFxcIjA7IDFcXFwiIGtleVNwbGluZXM9XFxcIjAuMywgMC42MSwgMC4zNTUsIDFcXFwiIHJlcGVhdENvdW50PVxcXCJpbmRlZmluaXRlXFxcIj48L2FuaW1hdGU+XFxuICAgICAgICAgICAgICAgICAgICA8L2NpcmNsZT5cXG4gICAgICAgICAgICAgICAgICAgIDxjaXJjbGUgY3g9XFxcIjIyXFxcIiBjeT1cXFwiMjJcXFwiIHI9XFxcIjE5LjkyODJcXFwiPlxcbiAgICAgICAgICAgICAgICAgICAgICAgIDxhbmltYXRlIGF0dHJpYnV0ZU5hbWU9XFxcInJcXFwiIGJlZ2luPVxcXCJiYWMtMC45c1xcXCIgZHVyPVxcXCIxLjhzXFxcIiB2YWx1ZXM9XFxcIjE7IDIwXFxcIiBjYWxjTW9kZT1cXFwic3BsaW5lXFxcIiBrZXlUaW1lcz1cXFwiMDsgMVxcXCIga2V5U3BsaW5lcz1cXFwiMC4xNjUsIDAuODQsIDAuNDQsIDFcXFwiIHJlcGVhdENvdW50PVxcXCJpbmRlZmluaXRlXFxcIj48L2FuaW1hdGU+XFxuICAgICAgICAgICAgICAgICAgICAgICAgPGFuaW1hdGUgYXR0cmlidXRlTmFtZT1cXFwic3Ryb2tlLW9wYWNpdHlcXFwiIGJlZ2luPVxcXCJiYWMtMC45c1xcXCIgZHVyPVxcXCIxLjhzXFxcIiB2YWx1ZXM9XFxcIjE7IDBcXFwiIGNhbGNNb2RlPVxcXCJzcGxpbmVcXFwiIGtleVRpbWVzPVxcXCIwOyAxXFxcIiBrZXlTcGxpbmVzPVxcXCIwLjMsIDAuNjEsIDAuMzU1LCAxXFxcIiByZXBlYXRDb3VudD1cXFwiaW5kZWZpbml0ZVxcXCI+PC9hbmltYXRlPlxcbiAgICAgICAgICAgICAgICAgICAgPC9jaXJjbGU+XFxuICAgICAgICAgICAgICAgIDwvZz5cXG4gICAgICAgICAgICA8L3N2Zz5cXG4gICAgICAgICAgICA8ZGl2IGNsYXNzPVxcXCJiYWMtLXVzZXItYXBwc1xcXCIgaWQ9XFxcImJhYy0tcHVyZXNkay1hcHBzLXNlY3Rpb24tLVxcXCI+XFxuICAgICAgICAgICAgICAgIDxhIGhyZWY9XFxcIi9hcHAvY2FtcGFpZ25zXFxcIiBpZD1cXFwiYmFjLS1wdXJlc2RrLWNhbXBhaWducy1saW5rLS1cXFwiIGNsYXNzPVxcXCJiYWMtLXB1cmVzZGstYXBwcy1vbi1uYXZiYXItLSBkaXNhYmxlZFxcXCI+XFxuICAgICAgICAgICAgICAgICAgICA8c3ZnIHdpZHRoPVxcXCIxNXB4XFxcIiBoZWlnaHQ9XFxcIjEzcHhcXFwiIHZpZXdCb3g9XFxcIjAgMCAxNSAxNFxcXCIgdmVyc2lvbj1cXFwiMS4xXFxcIiB4bWxucz1cXFwiaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmdcXFwiIHhtbG5zOnhsaW5rPVxcXCJodHRwOi8vd3d3LnczLm9yZy8xOTk5L3hsaW5rXFxcIj5cXG4gICAgICAgICAgICAgICAgICAgICAgICA8IS0tIEdlbmVyYXRvcjogc2tldGNodG9vbCA1OS4xICgxMDEwMTApIC0gaHR0cHM6Ly9za2V0Y2guY29tIC0tPlxcbiAgICAgICAgICAgICAgICAgICAgICAgIDx0aXRsZT4yQzY0QUU3NS1BQzQwLTQzMTEtODQ4Mi1GMkQ4NzM2MzQwRjM8L3RpdGxlPlxcbiAgICAgICAgICAgICAgICAgICAgICAgIDxkZXNjPkNyZWF0ZWQgd2l0aCBza2V0Y2h0b29sLjwvZGVzYz5cXG4gICAgICAgICAgICAgICAgICAgICAgICA8ZGVmcz5cXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgPHBvbHlnb24gaWQ9XFxcInBhdGgtMVxcXCIgcG9pbnRzPVxcXCIwIDAuMDAwMTUwMDAwMDA3IDE0LjM5OTc0OTggMC4wMDAxNTAwMDAwMDcgMTQuMzk5NzQ5OCAxMi44OTk2NDk5IDAgMTIuODk5NjQ5OVxcXCI+PC9wb2x5Z29uPlxcbiAgICAgICAgICAgICAgICAgICAgICAgIDwvZGVmcz5cXG4gICAgICAgICAgICAgICAgICAgICAgICA8ZyBpZD1cXFwiUFAtQkEtUG9ydGFsLUhvbWVfRGVza3RvcC12MlxcXCIgc3Ryb2tlPVxcXCJub25lXFxcIiBzdHJva2Utd2lkdGg9XFxcIjFcXFwiIGZpbGw9XFxcIm5vbmVcXFwiIGZpbGwtcnVsZT1cXFwiZXZlbm9kZFxcXCI+XFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIDxnIGlkPVxcXCJQUENNLUxpc3RpbmdfQ29ubmV4aW9uXzAxX01heF9EXFxcIiB0cmFuc2Zvcm09XFxcInRyYW5zbGF0ZSgtMTExMC4wMDAwMDAsIC03Ny4wMDAwMDApXFxcIj5cXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIDxnIGlkPVxcXCJlbGVtZW50cy0vLXNkay0vLWJ1dHRvblxcXCIgdHJhbnNmb3JtPVxcXCJ0cmFuc2xhdGUoMTA5Ni4wMDAwMDAsIDcwLjAwMDAwMClcXFwiPlxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIDxnIGlkPVxcXCJpY29ucy9hcHBzL2NhbXBhaWducy1pY29ucy0vLWFwcHMtLy00MHg0MC0vLWNhbXBhaWduc1xcXCIgdHJhbnNmb3JtPVxcXCJ0cmFuc2xhdGUoMTEuMDAwMDAwLCA0LjAwMDAwMClcXFwiPlxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICA8ZyBpZD1cXFwiR3JvdXAtM1xcXCIgdHJhbnNmb3JtPVxcXCJ0cmFuc2xhdGUoMy4wMDAwMDAsIDMuNTAwMDAwKVxcXCI+XFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICA8bWFzayBpZD1cXFwibWFzay0yXFxcIiBmaWxsPVxcXCJ3aGl0ZVxcXCI+XFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgPHVzZSB4bGluazpocmVmPVxcXCIjcGF0aC0xXFxcIj48L3VzZT5cXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIDwvbWFzaz5cXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIDxnIGlkPVxcXCJDbGlwLTJcXFwiPjwvZz5cXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIDxwYXRoIGQ9XFxcIk0yLjMzMzI1MDAzLDMuNzUzNjQ5OTggQzIuMDQyNzUwMDMsMy44NTkxNDk5OCAxLjc5OTc1MDA0LDQuMDM2MTQ5OTggMS41OTM3NTAwNCw0LjI4OTE0OTk4IEMxLjMzMzI1MDA1LDQuNjA5MTQ5OTcgMS4yMDYyNTAwNSw0Ljk2NjY0OTk3IDEuMjA2MjUwMDUsNS4zODIxNDk5NiBMMS4yMDYyNTAwNSw1LjU1NDY0OTk2IEMxLjIwNjI1MDA1LDUuOTY5MTQ5OTUgMS4zMzI3NTAwNSw2LjMyMTY0OTk1IDEuNTkxNzUwMDQsNi42MzExNDk5NCBDMS43OTgyNTAwNCw2Ljg3ODE0OTk0IDIuMDQyMjUwMDMsNy4wNTA2NDk5NCAyLjMzMzI1MDAzLDcuMTU1NjQ5OTQgTDIuMzMzMjUwMDMsMy43NTM2NDk5OCBaIE01Ljc4ODI0OTg5LDcuMjQ4NjUwMDggQzcuOTIwMjQ5NzgsNy4yNDg2NTAwOCA5Ljg5NTc0OTY3LDcuODM1NjUwMDkgMTEuNjY2NzQ5Niw4Ljk5MzY1MDExIEwxMS42NjY3NDk2LDEuODM3NjQ5OTggQzkuODk0MjQ5NjcsMy4wNDcxNSA3Ljg5OTI0OTc4LDMuNjU5NjUwMDEgNS43MzA3NDk4OSwzLjY1OTY1MDAxIEwzLjU2ODc1MDAxLDMuNjU5NjUwMDEgTDMuNTY4NzUwMDEsNy4yNDg2NTAwOCBMNS43ODgyNDk4OSw3LjI0ODY1MDA4IFogTTUuMjk4NzQ5ODYsMTIuODk5NjQ5OSBDNC44NjEyNDk4NywxMi44OTk2NDk5IDQuNDc0NzQ5ODgsMTIuNzM1NjQ5OSA0LjE0OTI0OTg5LDEyLjQxMTE0OTkgQzMuODQyNzQ5OSwxMi4xMDYxNDk5IDMuNjg3MjQ5OSwxMS43MzAxNDk5IDMuNjg3MjQ5OSwxMS4yOTM2NDk5IEwzLjY4NzI0OTksOC40NTE2NDk5MyBMMy4wNTE3NDk5Miw4LjQ1MTY0OTkzIEwyLjk0MDc0OTkyLDguNDU0MTQ5OTMgQzIuMTIwMjQ5OTQsOC40NTQxNDk5MyAxLjQyMTc0OTk2LDguMTczMTQ5OTMgMC44NjUyNDk5NzcsNy42MTg2NDk5NCBDMC4yOTEyNDk5OTIsNy4wNDY2NDk5NCAtMC4wMDAyNTAwMDAwMTIsNi4zNTIxNDk5NSAtMC4wMDAyNTAwMDAwMTIsNS41NTQ2NDk5NSBMLTAuMDAwMjUwMDAwMDEyLDUuMzgyMTQ5OTYgQy0wLjAwMDI1MDAwMDAxMiw0LjU2NTE0OTk2IDAuMjkxNzQ5OTkyLDMuODY1MTQ5OTcgMC44NjYyNDk5NzcsMy4zMDI2NDk5NyBDMS40NDA3NDk5NiwyLjc0MTE0OTk4IDIuMTM3MjQ5OTQsMi40NTYxNDk5OCAyLjkzNjc0OTkyLDIuNDU2MTQ5OTggTDUuNzMwNzQ5ODUsMi40NTYxNDk5OCBDOC4wNTEyNDk3OSwyLjQ1NjE0OTk4IDEwLjExOTc0OTcsMS42ODExNDk5OSAxMS44NzkyNDk3LDAuMTUyMTQ5OTk5IEMxMS45NzU3NDk3LDAuMDU1NjQ5OTk5NSAxMi4xMDY3NDk3LDAuMDAwMTUwMDAwMDA3IDEyLjI0OTI0OTcsMC4wMDAxNTAwMDAwMDcgQzEyLjMzNjc0OTcsMC4wMDAxNTAwMDAwMDcgMTIuNDI5MjQ5NywwLjAyMTE0OTk5OTggMTIuNTIzNzQ5NywwLjA2MzE0OTk5OTUgQzEyLjc0NTI0OTcsMC4xNDUxNDk5OTkgMTIuODczMjQ5NywwLjMzNDE0OTk5NyAxMi44NzMyNDk3LDAuNTkwMTQ5OTk1IEwxMi44NzMyNDk3LDQuMTQ5NjQ5OTcgTDEzLjEzNDI0OTcsNC4xNDk2NDk5NyBDMTMuNDc1MjQ5Niw0LjE0OTY0OTk3IDEzLjc3NDc0OTYsNC4yNzUxNDk5NiAxNC4wMjQyNDk2LDQuNTIzMTQ5OTYgQzE0LjI2ODc0OTYsNC43MjExNDk5NiAxNC4zOTk3NDk2LDUuMDE0NjQ5OTYgMTQuMzk5NzQ5Niw1LjM4MjE0OTk2IEMxNC4zOTk3NDk2LDUuNzQzNjQ5OTUgMTQuMjcyMjQ5Niw2LjA0ODE0OTk1IDE0LjAyMDc0OTYsNi4yODc2NDk5NSBDMTMuNzcxNzQ5Niw2LjUyNDE0OTk1IDEzLjQ3Mzc0OTYsNi42NDQxNDk5NCAxMy4xMzQyNDk3LDYuNjQ0MTQ5OTQgTDEyLjg3MzI0OTcsNi42NDQxNDk5NCBMMTIuODczMjQ5NywxMC4yMDMxNDk5IEMxMi44NzMyNDk3LDEwLjQ3ODE0OTkgMTIuNzQ1MjQ5NywxMC42NzcxNDk5IDEyLjUxMjc0OTcsMTAuNzYzNjQ5OSBMMTIuNDQyNzQ5NywxMC43NzYxNDk5IEMxMi4zNDkyNDk3LDEwLjc5ODY0OTkgMTIuMzA2NzQ5NywxMC44MDUxNDk5IDEyLjI2OTc0OTcsMTAuODA1MTQ5OSBDMTIuMTU2NzQ5NywxMC44MDUxNDk5IDEyLjAzNTI0OTcsMTAuNzY2NjQ5OSAxMS45MDc3NDk3LDEwLjY5MTE0OTkgQzEwLjE0MDc0OTcsOS4xOTg2NDk5MiA4LjA5MTI0OTc5LDguNDUxNjQ5OTMgNS43ODgyNDk4NSw4LjQ1MTY0OTkzIEw0Ljg5Mzc0OTg3LDguNDUxNjQ5OTMgTDQuODkzNzQ5ODcsMTEuMjkzNjQ5OSBDNC44OTM3NDk4NywxMS40MTMxNDk5IDQuOTI5NzQ5ODcsMTEuNTA0NjQ5OSA1LjAwNzc0OTg3LDExLjU4MjY0OTkgQzUuMDg1NzQ5ODcsMTEuNjYwMTQ5OSA1LjE3Nzc0OTg2LDExLjY5NjY0OTkgNS4yOTg3NDk4NiwxMS42OTY2NDk5IEM1LjM5ODI0OTg2LDExLjY5NjY0OTkgNS40ODg3NDk4NSwxMS42NTQ2NDk5IDUuNTc1MjQ5ODUsMTEuNTY4MTQ5OSBDNS42NjI3NDk4NSwxMS40ODExNDk5IDUuNzAzNzQ5ODUsMTEuMzg0NjQ5OSA1LjcwMzc0OTg1LDExLjI2NTE0OTkgTDUuNzAzNzQ5ODUsOS42MTQ2NDk5MiBDNS43MDM3NDk4NSw5LjIzNzY0OTkyIDUuOTI5MjQ5ODQsOS4wMTI2NDk5MyA2LjMwNjc0OTgzLDkuMDEyNjQ5OTMgQzYuNDUyNzQ5ODMsOS4wMTI2NDk5MyA2LjU4OTI0OTgzLDkuMDY4MTQ5OTIgNi43MTMyNDk4Miw5LjE3NzY0OTkyIEM2Ljg0MjI0OTgyLDkuMjkyMTQ5OTIgNi45MTAyNDk4Miw5LjQ0MzE0OTkyIDYuOTEwMjQ5ODIsOS42MTQ2NDk5MiBMNi45MTAyNDk4MiwxMS4yNjUxNDk5IEM2LjkxMDI0OTgyLDExLjY5OTY0OTkgNi43NTA3NDk4MiwxMi4wODQ2NDk5IDYuNDM2MjQ5ODMsMTIuNDA4NjQ5OSBDNi4xMTk3NDk4NCwxMi43MzQ2NDk5IDUuNzM2NzQ5ODUsMTIuODk5NjQ5OSA1LjI5ODc0OTg2LDEyLjg5OTY0OTkgTDUuMjk4NzQ5ODYsMTIuODk5NjQ5OSBaXFxcIiBpZD1cXFwiRmlsbC0xXFxcIiBmaWxsPVxcXCIjMzMzMzMzXFxcIiBmaWxsLXJ1bGU9XFxcIm5vbnplcm9cXFwiIG1hc2s9XFxcInVybCgjbWFzay0yKVxcXCI+PC9wYXRoPlxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICA8L2c+XFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgPC9nPlxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgPC9nPlxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICA8L2c+XFxuICAgICAgICAgICAgICAgICAgICAgICAgPC9nPlxcbiAgICAgICAgICAgICAgICAgICAgPC9zdmc+XFxuICAgICAgICAgICAgICAgICAgICBDYW1wYWlnbnNcXG4gICAgICAgICAgICAgICAgPC9hPlxcbiAgICAgICAgICAgICAgICA8YSBocmVmPVxcXCIvYXBwL2dyb3Vwc1xcXCIgaWQ9XFxcImJhYy0tcHVyZXNkay1ncm91cHMtbGluay0tXFxcIiBjbGFzcz1cXFwiYmFjLS1wdXJlc2RrLWFwcHMtb24tbmF2YmFyLS0gZGlzYWJsZWRcXFwiPlxcbiAgICAgICAgICAgICAgICAgICAgPHN2ZyB3aWR0aD1cXFwiMjBweFxcXCIgaGVpZ2h0PVxcXCIxM3B4XFxcIiB2aWV3Qm94PVxcXCIwIDAgMzkgMjVcXFwiIHZlcnNpb249XFxcIjEuMVxcXCIgeG1sbnM9XFxcImh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnXFxcIiB4bWxuczp4bGluaz1cXFwiaHR0cDovL3d3dy53My5vcmcvMTk5OS94bGlua1xcXCI+XFxuICAgICAgICAgICAgICAgICAgICAgICAgPCEtLSBHZW5lcmF0b3I6IHNrZXRjaHRvb2wgNTkuMSAoMTAxMDEwKSAtIGh0dHBzOi8vc2tldGNoLmNvbSAtLT5cXG4gICAgICAgICAgICAgICAgICAgICAgICA8dGl0bGU+MzAyQzc1QkMtQkQ3OC00NUFGLUI2QUMtMTEwMjM3NjUwQjhGPC90aXRsZT5cXG4gICAgICAgICAgICAgICAgICAgICAgICA8ZGVzYz5DcmVhdGVkIHdpdGggc2tldGNodG9vbC48L2Rlc2M+XFxuICAgICAgICAgICAgICAgICAgICAgICAgPGcgaWQ9XFxcIlBQLUJBLVBvcnRhbC1Ib21lX0Rlc2t0b3AtdjJcXFwiIHN0cm9rZT1cXFwibm9uZVxcXCIgc3Ryb2tlLXdpZHRoPVxcXCIxXFxcIiBmaWxsPVxcXCJub25lXFxcIiBmaWxsLXJ1bGU9XFxcImV2ZW5vZGRcXFwiPlxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICA8ZyBpZD1cXFwiUFBDTS1MaXN0aW5nX0Nvbm5leGlvbl8wMV9NYXhfRFxcXCIgdHJhbnNmb3JtPVxcXCJ0cmFuc2xhdGUoLTEyNDQuMDAwMDAwLCAtNzEuMDAwMDAwKVxcXCIgZmlsbD1cXFwiIzMzMzMzM1xcXCIgZmlsbC1ydWxlPVxcXCJub256ZXJvXFxcIj5cXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIDxnIGlkPVxcXCJlbGVtZW50cy0vLXNkay0vLWJ1dHRvbi1jb3B5LWVsZW1lbnRzLS8tc2RrLS8tYnV0dG9uXFxcIiB0cmFuc2Zvcm09XFxcInRyYW5zbGF0ZSgxMjQzLjAwMDAwMCwgNzAuMDAwMDAwKVxcXCI+XFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgPGcgaWQ9XFxcImljb25zL2FwcHMvY2FtcGFpZ25zLWljb25zLS8tYXBwcy0vLTQweDQwLS8tZ3JvdXBzXFxcIiB0cmFuc2Zvcm09XFxcInRyYW5zbGF0ZSgxMS4wMDAwMDAsIDQuMDAwMDAwKVxcXCI+XFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIDxnIGlkPVxcXCJHcm91cFxcXCIgdHJhbnNmb3JtPVxcXCJ0cmFuc2xhdGUoLTkuMjUwMDAwLCAtMi4yNTAwMDApXFxcIj5cXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIDxwYXRoIGQ9XFxcIk0xOS4xMTUxNjMxLDMgQzIyLjg0NjQ0OTEsMyAyNi4xMTcwODI1LDYuMjE5NTEyMiAyNi4xMTcwODI1LDkuOTE0NjM0MTUgQzI2LjExNzA4MjUsMTIuNDc1NjA5OCAyNC4zMjA1Mzc0LDE0LjQ4NzgwNDkgMjIuNjE2MTIyOCwxNS41MTIxOTUxIEwyMi42MTYxMjI4LDE2LjE3MDczMTcgTDIyLjYxNjEyMjgsMTYuMTcwNzMxNyBDMjIuOTg0NjQ0OSwxNi4zMTcwNzMyIDIzLjY3NTYyMzgsMTYuNTM2NTg1NCAyNC40NTg3MzMyLDE2LjcxOTUxMjIgTDI0LjUwNDc5ODUsMTYuNzE5NTEyMiBMMjQuNTA0Nzk4NSwxNi43MTk1MTIyIEMyOC43ODg4Njc2LDE3Ljg1MzY1ODUgMzEsMTkuNzU2MDk3NiAzMSwyMi4zNTM2NTg1IEMzMC45MDc4Njk1LDIzLjAxMjE5NTEgMzAuMzA5MDIxMSwyNCAyOS4xMTEzMjQ0LDI0IEw4Ljc5NjU0NTExLDI0IEM3LjU5ODg0ODM3LDI0IDcsMjMuMDEyMTk1MSA3LDIyLjMxNzA3MzIgQzcsMjAuNDg3ODA0OSA4LjEwNTU2NjIyLDE4LjAzNjU4NTQgMTMuNDQ5MTM2MywxNi42ODI5MjY4IEwxMy40OTUyMDE1LDE2LjY4MjkyNjggTDEzLjQ5NTIwMTUsMTYuNjgyOTI2OCBDMTQuMjc4MzEwOSwxNi41MzY1ODU0IDE0Ljk2OTI4OTgsMTYuMzE3MDczMiAxNS4yOTE3NDY2LDE2LjIwNzMxNzEgTDE1LjI5MTc0NjYsMTUuNTEyMTk1MSBMMTUuMjkxNzQ2NiwxNS41MTIxOTUxIEMxMy41ODczMzIxLDE0LjQ1MTIxOTUgMTEuNzkwNzg2OSwxMi40NzU2MDk4IDExLjc5MDc4NjksOS45MTQ2MzQxNSBDMTEuNzkwNzg2OSw2LjIxOTUxMjIgMTUuMDYxNDIwMywzIDE4Ljc5MjcwNjMsMyBMMTkuMTE1MTYzMSwzIFogTTE5LjE2MTIyODQsNS42NzA3MzE3MSBMMTguODM4NzcxNiw1LjY3MDczMTcxIEMxNi45OTYxNjEyLDUuNjcwNzMxNzEgMTUuMjkxNzQ2Niw3LjcxOTUxMjIgMTUuMjkxNzQ2Niw5Ljg3ODA0ODc4IEMxNS4yOTE3NDY2LDExLjQ1MTIxOTUgMTYuNDg5NDQzNCwxMi44MDQ4NzggMTcuNjg3MTQwMSwxMy40NjM0MTQ2IEMxNy44MjUzMzU5LDEzLjUzNjU4NTQgMTcuOTE3NDY2NCwxMy42MDk3NTYxIDE4LjAwOTU5NjksMTMuNjgyOTI2OCBDMTguNzQzNzYyLDE0LjI2NjAwNjEgMTguNzg5NjQ3MywxNC45NDU1NTA3IDE4Ljc5MjUxNTEsMTUuOTYyNzIzOSBMMTguNzkyNzA2MywxNi41NzMxNzA3IEwxOC43OTI3MDYzLDE2LjU3MzE3MDcgQzE4Ljc5MjcwNjMsMTguNDAyNDM5IDE1Ljc5ODQ2NDUsMTguOTg3ODA0OSAxNC40NjI1NzIsMTkuMjgwNDg3OCBDMTMuMDM0NTQ4OSwxOS42MDk3NTYxIDExLjQyMjI2NDksMjAuMjY4MjkyNyAxMC43MzEyODYsMjEuMjU2MDk3NiBMMjcuMTc2NTgzNSwyMS4yNTYwOTc2IEMyNi42MjM4MDA0LDIwLjQxNDYzNDEgMjUuMzMzOTczMSwxOS43NTYwOTc2IDIzLjM5OTIzMjIsMTkuMjA3MzE3MSBDMjAuODE5NTc3NywxOC41ODUzNjU5IDE5LjE2MTIyODQsMTcuOTI2ODI5MyAxOS4xNjEyMjg0LDE2LjUzNjU4NTQgTDE5LjE2MDgxNTksMTUuNzQ4NzUyNyBDMTkuMTYyNTAzNiwxNC44MjE3NTcxIDE5LjIxMjcxMzEsMTQuMTYyODQwNyAxOS45NDQzMzc4LDEzLjY0NjM0MTUgQzIwLjA4MjUzMzYsMTMuNTM2NTg1NCAyMC4yMjA3Mjk0LDEzLjQ2MzQxNDYgMjAuMzEyODU5OSwxMy40MjY4MjkzIEMyMS41MTA1NTY2LDEyLjgwNDg3OCAyMi43MDgyNTM0LDExLjQ1MTIxOTUgMjIuNzA4MjUzNCw5Ljg3ODA0ODc4IEMyMi43MDgyNTM0LDcuNzE5NTEyMiAyMS4wMDM4Mzg4LDUuNjcwNzMxNzEgMTkuMTYxMjI4NCw1LjY3MDczMTcxIFogTTEwLjY5NDQ0NDQsMSBDMTIuNTQ2Mjk2MywxIDEzLjkzNTE4NTIsMS42MzcwODA4NyAxNSwyLjkxMTI0MjYgQzE0LjAyNzc3NzgsMy4zNjA5NDY3NSAxMy4xOTQ0NDQ0LDMuOTk4MDI3NjEgMTIuNDUzNzAzNyw0Ljc4NTAwOTg2IEMxMi4yMjIyMjIyLDQuNTIyNjgyNDUgMTEuOTkwNzQwNyw0LjI5NzgzMDM3IDExLjk0NDQ0NDQsNC4yNjAzNTUwMyBDMTEuNTc0MDc0MSwzLjkyMzA3NjkyIDExLjI5NjI5NjMsMy44MTA2NTA4OSAxMC42OTQ0NDQ0LDMuODEwNjUwODkgTDEwLjY5NDQ0NDQsMy44MTA2NTA4OSBMMTAuNDE2NjY2NywzLjgxMDY1MDg5IEM5LjE2NjY2NjY3LDMuODEwNjUwODkgNy42Mzg4ODg4OSw1LjM4NDYxNTM4IDcuNjM4ODg4ODksNy4yOTU4NTc5OSBDNy42Mzg4ODg4OSw4LjYwNzQ5NTA3IDguNjU3NDA3NDEsOS43MzE3NTU0MiA5LjU4MzMzMzMzLDEwLjI1NjQxMDMgQzkuNjc1OTI1OTMsMTAuMzMxMzYwOSA5LjgxNDgxNDgxLDEwLjQwNjMxMTYgOS45MDc0MDc0MSwxMC40ODEyNjIzIEMxMC42MzY1NzQxLDExLjAzODcwODEgMTAuNjkyMjc0MywxMS42ODIyMyAxMC42OTQ4MDYxLDEyLjUxMjI1MDQgTDEwLjY5NDQ0NDQsMTMuMjU0NDM3OSBDMTAuNjk0NDQ0NCwxNS4wNTMyNTQ0IDcuODI0MDc0MDcsMTUuNjUyODYgNi43MTI5NjI5NiwxNS44Nzc3MTIgQzUuNzQwNzQwNzQsMTYuMTQwMDM5NCA0LjYyOTYyOTYzLDE2LjU1MjI2ODIgMy45ODE0ODE0OCwxNy4xODkzNDkxIEwzLjk4MTQ4MTQ4LDE3LjE4OTM0OTEgTDcuNzc3Nzc3NzgsMTcuMTg5MzQ5MSBDOC4xNDgxNDgxNSwxNy4xODkzNDkxIDguNTE4NTE4NTIsMTcuMzc2NzI1OCA4LjYxMTExMTExLDE3LjY3NjUyODYgTDguNjExMTExMTEsMTcuNjc2NTI4NiBMOC42Mjg1MTg1MiwxNy43NDM2ODQ0IEM4LjYzODg4ODg5LDE3LjgzMjQyNiA4LjYwMTg1MTg1LDE3LjkxNjM3MDggOC41NjQ4MTQ4MSwxNy45NzYzMzE0IEM3LjYzODg4ODg5LDE4LjUzODQ2MTUgNi45OTA3NDA3NCwxOS4xMzgwNjcxIDYuNTI3Nzc3NzgsMTkuNzc1MTQ3OSBDNi4zODg4ODg4OSwxOS45MjUwNDkzIDYuMjAzNzAzNywyMCA2LjAxODUxODUyLDIwIEw2LjAxODUxODUyLDIwIEwxLjc1OTI1OTI2LDIwIEMwLjYwMTg1MTg1MiwyMCAwLDE5LjAyNTY0MSAwLDE4LjM1MTA4NDggQzAsMTYuNjY0Njk0MyAwLjk3MjIyMjIyMiwxNC40NTM2NDg5IDUuNzQwNzQwNzQsMTMuMTA0NTM2NSBMNS43NDA3NDA3NCwxMy4xMDQ1MzY1IEw1Ljc4NzAzNzA0LDEzLjEwNDUzNjUgQzYuMzg4ODg4ODksMTIuOTkyMTEwNSA2Ljg5ODE0ODE1LDEyLjg0MjIwOTEgNy4yMjIyMjIyMiwxMi43Mjk3ODMgTDcuMjIyMjIyMjIsMTIuNzI5NzgzIEw3LjIyMjIyMjIyLDEyLjI4MDA3ODkgQzUuNzQwNzQwNzQsMTEuMzQzMTk1MyA0LjE2NjY2NjY3LDkuNTQ0Mzc4NyA0LjE2NjY2NjY3LDcuMjU4MzgyNjQgQzQuMTY2NjY2NjcsMy45MjMwNzY5MiA3LjA4MzMzMzMzLDEgMTAuNDE2NjY2NywxIEwxMC40MTY2NjY3LDEgWiBNMjcuNjQ2NzgyNiw1LjU1MTExNTEyZS0xNyBDMzAuOTU5MzQwNSw1LjU1MTExNTEyZS0xNyAzMy44NTc4Mjg3LDIuOTM0NjUzNDcgMzMuODU3ODI4Nyw2LjI4MzE2ODMyIEMzMy44NTc4Mjg3LDguNTc4MjE3ODIgMzIuMzM5NTczLDEwLjM0NjUzNDcgMzAuODIxMzE3MywxMS4zMjQ3NTI1IEwzMC44MjEzMTczLDExLjMyNDc1MjUgTDMwLjgyMTMxNzMsMTEuNzM4NjEzOSBDMzEuMTQzMzcxNSwxMS44ODkxMDg5IDMxLjY5NTQ2NDUsMTIuMDM5NjA0IDMyLjI5MzU2NTIsMTIuMTkwMDk5IEMzNy4wMzIzNjM0LDEzLjUwNjkzMDcgMzguMDQ0NTMzOCwxNS43MjY3MzI3IDM3Ljk5ODUyNjEsMTcuMzQ0NTU0NSBDMzcuOTk4NTI2MSwxOC4wNTk0MDU5IDM3LjQwMDQyNTQsMTkgMzYuMjUwMjMxNiwxOSBMMzYuMjUwMjMxNiwxOSBMMzEuNzg3NDgsMTkgQzMxLjU1NzQ0MTMsMTkgMzEuMzczNDEwMywxOC45MjQ3NTI1IDMxLjI4MTM5NDgsMTguNzc0MjU3NCBDMzAuNzc1MzA5NSwxOC4xMzQ2NTM1IDMwLjEzMTIwMTEsMTcuNTMyNjczMyAyOS4yNTcwNTM4LDE3LjAwNTk0MDYgQzI5LjExOTAzMDYsMTYuOTMwNjkzMSAyOS4wNzMwMjI4LDE2LjgxNzgyMTggMjkuMTE5MDMwNiwxNi43MDQ5NTA1IEwyOS4xMTkwMzA2LDE2LjcwNDk1MDUgTDI5LjE1OTU0NzcsMTYuNjA4OTA0MSBDMjkuMjkyODM3NiwxNi4zNjQ0Nzg3IDI5LjYyMDAwMzgsMTYuMjE1ODQxNiAyOS45NDcxNzAxLDE2LjIxNTg0MTYgTDI5Ljk0NzE3MDEsMTYuMjE1ODQxNiBMMzQuMDQxODU5NywxNi4yMTU4NDE2IEMzMy40ODk3NjY3LDE1LjY4OTEwODkgMzIuNTY5NjExNywxNS4yMzc2MjM4IDMxLjE4OTM3OTMsMTQuODYxMzg2MSBDMjkuMzQ5MDY5MywxNC40MDk5MDEgMjcuMzcwNzM2MSwxMy44MDc5MjA4IDI3LjM3MDczNjEsMTIuMjY1MzQ2NSBMMjcuMzcwNzM2MSwxMi4yNjUzNDY1IEwyNy4zNzA0MTA0LDExLjY5NTA3NDYgQzI3LjM2ODIyMDEsMTAuNzQyMTcyIDI3LjM3MzYxMTYsMTAuMDQ1NTQ0NiAyOC4xMDY4NjAxLDkuNDgxMTg4MTIgQzI4LjI0NDg4MzQsOS4zNjgzMTY4MyAyOC40Mjg5MTQ0LDkuMjkzMDY5MzEgMjguNDc0OTIyMSw5LjI1NTQ0NTU0IEMyOS4zOTUwNzcxLDguNzI4NzEyODcgMzAuNDA3MjQ3NSw3LjYgMzAuNDA3MjQ3NSw2LjI4MzE2ODMyIEMzMC40MDcyNDc1LDQuMzI2NzMyNjcgMjguODg4OTkxOCwyLjc4NDE1ODQyIDI3LjY0Njc4MjYsMi43ODQxNTg0MiBMMjcuNjQ2NzgyNiwyLjc4NDE1ODQyIEwyNy4zNzA3MzYxLDIuNzg0MTU4NDIgQzI2LjcyNjYyNzYsMi43ODQxNTg0MiAyNi40MDQ1NzM0LDIuOTM0NjUzNDcgMjYuMDM2NTExNCwzLjMxMDg5MTA5IEMyNS45OTA1MDM3LDMuMzQ4NTE0ODUgMjUuNzYwNDY0OSwzLjY0OTUwNDk1IDI1LjUzMDQyNjIsMy45NTA0OTUwNSBDMjQuODQwMzEsMy4xMjI3NzIyOCAyMy45NjYxNjI3LDIuNDgzMTY4MzIgMjMsMS45OTQwNTk0MSBDMjQuMTA0MTg2LDAuNjM5NjAzOTYgMjUuNDg0NDE4NCw1LjU1MTExNTEyZS0xNyAyNy4zNzA3MzYxLDUuNTUxMTE1MTJlLTE3IEwyNy4zNzA3MzYxLDUuNTUxMTE1MTJlLTE3IFpcXFwiIGlkPVxcXCJDb21iaW5lZC1TaGFwZVxcXCI+PC9wYXRoPlxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICA8L2c+XFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgPC9nPlxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgPC9nPlxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICA8L2c+XFxuICAgICAgICAgICAgICAgICAgICAgICAgPC9nPlxcbiAgICAgICAgICAgICAgICAgICAgPC9zdmc+XFxuICAgICAgICAgICAgICAgICAgICBHcm91cHNcXG4gICAgICAgICAgICAgICAgPC9hPlxcbiAgICAgICAgICAgICAgICA8YSBocmVmPVxcXCIjXFxcIiBpZD1cXFwiYmFjLS1wdXJlc2RrLS1hcHBzLS1vcGVuZXItLVxcXCIgY2xhc3M9XFxcImJhYy0tcHVyZXNkay1hcHBzLW9uLW5hdmJhci0tXFxcIj5cXG4gICAgICAgICAgICAgICAgICAgIDxzdmcgd2lkdGg9XFxcIjEzcHhcXFwiIGhlaWdodD1cXFwiMTNweFxcXCIgdmlld0JveD1cXFwiMCAwIDEzIDEzXFxcIiB2ZXJzaW9uPVxcXCIxLjFcXFwiIHhtbG5zPVxcXCJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2Z1xcXCIgeG1sbnM6eGxpbms9XFxcImh0dHA6Ly93d3cudzMub3JnLzE5OTkveGxpbmtcXFwiPlxcbiAgICAgICAgICAgICAgICAgICAgICAgIDwhLS0gR2VuZXJhdG9yOiBza2V0Y2h0b29sIDU5LjEgKDEwMTAxMCkgLSBodHRwczovL3NrZXRjaC5jb20gLS0+XFxuICAgICAgICAgICAgICAgICAgICAgICAgPHRpdGxlPjA5QjJEQTU2LUREQUQtNEMwOS05MUU4LTVENzE5NENCNDFGQzwvdGl0bGU+XFxuICAgICAgICAgICAgICAgICAgICAgICAgPGRlc2M+Q3JlYXRlZCB3aXRoIHNrZXRjaHRvb2wuPC9kZXNjPlxcbiAgICAgICAgICAgICAgICAgICAgICAgIDxnIGlkPVxcXCJQUC1CQS1Qb3J0YWwtSG9tZV9EZXNrdG9wLXYyXFxcIiBzdHJva2U9XFxcIm5vbmVcXFwiIHN0cm9rZS13aWR0aD1cXFwiMVxcXCIgZmlsbD1cXFwibm9uZVxcXCIgZmlsbC1ydWxlPVxcXCJldmVub2RkXFxcIj5cXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgPGcgaWQ9XFxcIlBQQ00tTGlzdGluZ19Db25uZXhpb25fMDFfTWF4X0RcXFwiIHRyYW5zZm9ybT1cXFwidHJhbnNsYXRlKC0xMzc4LjAwMDAwMCwgLTc4LjAwMDAwMClcXFwiIGZpbGw9XFxcIiMzMzMzMzNcXFwiIGZpbGwtcnVsZT1cXFwibm9uemVyb1xcXCI+XFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICA8ZyBpZD1cXFwiZWxlbWVudHMtLy1zZGstLy1idXR0b24tY29weS0yLWVsZW1lbnRzLS8tc2RrLS8tYnV0dG9uXFxcIiB0cmFuc2Zvcm09XFxcInRyYW5zbGF0ZSgxMzYzLjAwMDAwMCwgNzAuMDAwMDAwKVxcXCI+XFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgPGcgaWQ9XFxcImljb25zL2FwcHMvY2FtcGFpZ25zLWljb25zLS8tYXBwcy0vLTQweDQwLS8tT3RoZXJhcHBzXFxcIiB0cmFuc2Zvcm09XFxcInRyYW5zbGF0ZSgxMS4wMDAwMDAsIDQuMDAwMDAwKVxcXCI+XFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIDxnIGlkPVxcXCJlOTA2XFxcIiB0cmFuc2Zvcm09XFxcInRyYW5zbGF0ZSg0LjAwMDAwMCwgNC4wMDAwMDApXFxcIj5cXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIDxwYXRoIGQ9XFxcIk01LjA3ODEyNTcyLDIuNDk5OTk5OTRlLTA2IEwwLjM5MDYyNTA1NSwyLjQ5OTk5OTk0ZS0wNiBDMC4yODQ4MzA4NzQsMi40OTk5OTk5NGUtMDYgMC4xOTMyNzc5NDQsMC4wMzg2NTc5MDk5IDAuMTE1OTY2NjgzLDAuMTE1OTY5MTQ2IEMwLjAzODY1NTQyMjEsMC4xOTMyODAzODMgMCwwLjI4NDgzMzI4NCAwLDAuMzkwNjI3NDMyIEwwLDUuMDc4MTI2NjEgQzAsNS4xODM5MjA3NiAwLjAzODY1NTQyMjEsNS4yNzU0NzM2NiAwLjExNTk2NjY4Myw1LjM1Mjc4NDkgQzAuMTkzMjc3OTQ0LDUuNDMwMDk2MTQgMC4yODQ4MzA4NzQsNS40Njg3NTE1NSAwLjM5MDYyNTA1NSw1LjQ2ODc1MTU1IEwxLjE3MTg3NTE3LDUuNDY4NzUxNTUgQzEuMjc3NjY5MzUsNS40Njg3NTE1NSAxLjM2OTIyMjI4LDUuNDMwMDk2MTQgMS40NDY1MzM1NCw1LjM1Mjc4NDkgQzEuNTIzODQ0OCw1LjI3NTQ3MzY2IDEuNTYyNTAwMjIsNS4xODM5MjA3NiAxLjU2MjUwMDIyLDUuMDc4MTI2NjEgTDEuNTYyNTAwMjIsMS44NTU0Njg4NCBDMS41NjI1MDAyMiwxLjg1NTQ2ODg0IDEuNTc2NzQxODksMS44MDY2NDA5MyAxLjYwNTIyNDgxLDEuNzA4OTg0MjkgQzEuNjMzNzA3NzMsMS42MTEzMjg0NyAxLjcwODk4NDQxLDEuNTYyNTAwMTQgMS44MzEwNTQ4NCwxLjU2MjUwMDE0IEMxLjgzMTA1NDg0LDEuNTYyNTAwMTQgMS44MzMwODk0MywxLjU2MjUwMDE0IDEuODM3MTU4NTksMS41NjI1MDAxNCBDMS44NDEyMjczNCwxLjU2MjUwMDE0IDEuODQ3MzMxMDksMS41NjI1MDAxNCAxLjg1NTQ2OTAxLDEuNTYyNTAwMTQgTDMuNTc2NjYwOTIsMS41NjI1MDAxNCBDMy41NzY2NjA5MiwxLjU2MjUwMDE0IDMuNjI3NTIzODUsMS41NzY3NDE4MSAzLjcyOTI0ODg2LDEuNjA1MjI0NzIgQzMuODMwOTc0MjksMS42MzM3MDc2MyAzLjg4OTk3NTEzLDEuNzE3MTIyNjIgMy45MDYyNTA5NywxLjg1NTQ2ODg0IEwzLjkwNjI1MDk3LDMuNDkxMjEwMjIgQzMuOTA2MjUwOTcsMy40OTEyMTAyMiAzLjg5MjAwOTMsMy41NTYzMTQzOCAzLjg2MzUyNjM4LDMuNjg2NTIyNjkgQzMuODM1MDQzNDYsMy44MTY3MzEgMy43MTkwNzYzNiwzLjg4MTgzNTE2IDMuNTE1NjI1OTEsMy44ODE4MzUxNiBDMy41MTU2MjU5MSwzLjg4MTgzNTE2IDMuNTA3NDg4LDMuODgxODM1MTYgMy40OTEyMTE3NCwzLjg4MTgzNTE2IEwyLjc3MDk5NDk4LDMuODgxODM1MTYgQzIuNjY1MjAwMzgsMy44ODE4MzUxNiAyLjU3MzY0Nzg2LDMuOTIwNDkwOTggMi40OTYzMzY2LDMuOTk3ODAyMjIgQzIuNDE5MDI1MzQsNC4wNzUxMTMwNCAyLjM4MDM2OTkyLDQuMTY2NjY1OTQgMi4zODAzNjk5Miw0LjI3MjQ2MDA5IEwyLjM4MDM2OTkyLDUuMDUzNzA5OTUgQzIuMzgwMzY5OTIsNS4xNjc2NDI0MyAyLjQxOTAyNTM0LDUuMjYxMjI5NSAyLjQ5NjMzNjYsNS4zMzQ0NzE1NyBDMi41NzM2NDc4Niw1LjQwNzcxNDA2IDIuNjY1MjAwMzgsNS40NDQzMzQ4OCAyLjc3MDk5NDk4LDUuNDQ0MzM0ODggTDUuMDc4MTI0NDcsNS40NDQzMzQ4OCBDNS4xODM5MTg2NSw1LjQ0NDMzNDg4IDUuMjc1NDcxNTgsNS40MDc3MTQwNiA1LjM1Mjc4Mjg0LDUuMzM0NDcxNTcgQzUuNDMwMDk0MSw1LjI2MTIyOTUgNS40Njg3NDk1Miw1LjE2NzY0MjQzIDUuNDY4NzQ5NTIsNS4wNTM3MDk5NSBMNS40Njg3NDk1MiwwLjM5MDYyNzQzMiBDNS40Njg3NDk1MiwwLjI4NDgzMzI4NCA1LjQzMDA5NDEsMC4xOTMyODAzODMgNS4zNTI3ODI4NCwwLjExNTk2OTE0NiBDNS4yNzU0NzE1OCwwLjAzODY1NzkwOTkgNS4xODM5MTg2NSwyLjQ5OTk5OTk0ZS0wNiA1LjA3ODEyNDQ3LDIuNDk5OTk5OTRlLTA2IEw1LjA3ODEyNTcyLDIuNDk5OTk5OTRlLTA2IFogTTEyLjEwOTM3NjIsMCBMNy40MjE4NzU1MywwIEM3LjMxNjA4MTM1LDAgNy4yMjQ1Mjg0MiwwLjAzODY1NzkwOTEgNy4xNDcyMTcxNiwwLjExNTk2OTE0NCBDNy4wNjk5MDU5LDAuMTkzMjgwMzc5IDcuMDMxMjUwNDgsMC4yODQ4MzMyNzggNy4wMzEyNTA0OCwwLjM5MDYyNzQyNCBMNy4wMzEyNTA0OCw1LjA3ODEyNjUxIEM3LjAzMTI1MDQ4LDUuMTgzOTIwNjUgNy4wNjk5MDU5LDUuMjc1NDczNTUgNy4xNDcyMTcxNiw1LjM1Mjc4NDc5IEM3LjIyNDUyODQyLDUuNDMwMDk2MDIgNy4zMTYwODEzNSw1LjQ2ODc1MTQzIDcuNDIxODc1NTMsNS40Njg3NTE0MyBMOC4yMDMxMjU2NCw1LjQ2ODc1MTQzIEM4LjMwODkxOTgyLDUuNDY4NzUxNDMgOC40MDA0NzI3NSw1LjQzMDA5NjAyIDguNDc3Nzg0MDEsNS4zNTI3ODQ3OSBDOC41NTUwOTUyOCw1LjI3NTQ3MzU1IDguNTkzNzUwNyw1LjE4MzkyMDY1IDguNTkzNzUwNyw1LjA3ODEyNjUxIEw4LjU5Mzc1MDcsMS44NTU0Njg4IEM4LjU5Mzc1MDcsMS44NTU0Njg4IDguNjA3OTkyMzcsMS44MTA3MDk2NSA4LjYzNjQ3NTI5LDEuNzIxMTkxMzMgQzguNjY0OTU4MjEsMS42MzE2NzM0MyA4Ljc0MDIzNDg5LDEuNTg2OTE0MjcgOC44NjIzMDUzMiwxLjU4NjkxNDI3IEM4Ljg2MjMwNTMyLDEuNTg2OTE0MjcgOC44NjQzMzk5LDEuNTg2OTE0MjcgOC44Njg0MDkwNywxLjU4NjkxNDI3IEM4Ljg3MjQ3NzgyLDEuNTg2OTE0MjcgOC44Nzg1ODE1NywxLjU4NjkxNDI3IDguODg2NzE5NDksMS41ODY5MTQyNyBMMTAuNjA3OTExNCwxLjU4NjkxNDI3IEMxMC42MDc5MTE0LDEuNTg2OTE0MjcgMTAuNjU4Nzc0MywxLjYwMTE1NTUyIDEwLjc2MDQ5OTMsMS42Mjk2Mzg4NSBDMTAuODYyMjI0OCwxLjY1ODEyMTc2IDEwLjkyMTIyNTYsMS43NDE1MzY3NCAxMC45Mzc1MDE0LDEuODc5ODgyOTcgTDEwLjkzNzUwMTQsMy41MTU2MjQzMSBDMTAuOTM3NTAxNCwzLjUxNTYyNDMxIDEwLjkyMzI1OTgsMy41ODA3Mjg0NyAxMC44OTQ3NzY5LDMuNzEwOTM2NzcgQzEwLjg2NjI5MzksMy44NDExNDUwOCAxMC43NTAzMjY4LDMuOTA2MjQ5MjQgMTAuNTQ2ODc2NCwzLjkwNjI0OTI0IEMxMC41NDY4NzY0LDMuOTA2MjQ5MjQgMTAuNTM4NzM4NSwzLjkwNjI0OTI0IDEwLjUyMjQ2MjIsMy45MDYyNDkyNCBMOS43NjU2MjQ2MSwzLjkwNjI0OTI0IEM5LjY1OTgzMDQzLDMuOTA2MjQ5MjQgOS41NjgyNzc1LDMuOTQ0OTA0NjUgOS40OTA5NjYyNCw0LjAyMjIxNTg4IEM5LjQxMzY1NDk4LDQuMDk5NTI3MTEgOS4zNzQ5OTk1Niw0LjE5MTA4MDAxIDkuMzc0OTk5NTYsNC4yOTY4NzQxNiBMOS4zNzQ5OTk1Niw1LjA3ODEyNDAxIEM5LjM3NDk5OTU2LDUuMTgzOTE4MTUgOS40MTM2NTQ5OCw1LjI3NTQ3MTA1IDkuNDkwOTY2MjQsNS4zNTI3ODIyOSBDOS41NjgyNzc1LDUuNDMwMDkzNTIgOS42NTk4MzA0Myw1LjQ2ODc1MTQzIDkuNzY1NjI0NjEsNS40Njg3NTE0MyBMMTIuMTA5Mzc0OSw1LjQ2ODc1MTQzIEMxMi4yMTUxNjkxLDUuNDY4NzUxNDMgMTIuMzA2NzIyMSw1LjQzMDA5MzUyIDEyLjM4NDAzMzMsNS4zNTI3ODIyOSBDMTIuNDYxMzQ0Niw1LjI3NTQ3MTA1IDEyLjUsNS4xODM5MTgxNSAxMi41LDUuMDc4MTI0MDEgTDEyLjUsMC4zOTA2MjQ5MjQgQzEyLjUsMC4yODQ4MzA3NzggMTIuNDYxMzQ0NiwwLjE5MzI3Nzg3OSAxMi4zODQwMzMzLDAuMTE1OTY2NjQ0IEMxMi4zMDY3MjIxLDAuMDM4NjU1NDA5MSAxMi4yMTUxNjkxLDAgMTIuMTA5Mzc0OSwwIEwxMi4xMDkzNzYyLDAgWiBNNS4wNzgxMjU3Miw3LjAzMTI0ODU3IEwwLjM5MDYyNTA1NSw3LjAzMTI0ODU3IEMwLjI4NDgzMDg3NCw3LjAzMTI0ODU3IDAuMTkzMjc3OTQ0LDcuMDY5OTA2NDggMC4xMTU5NjY2ODMsNy4xNDcyMTc3MSBDMC4wMzg2NTU0MjIxLDcuMjI0NTI4OTUgMCw3LjMxNjA4MTg1IDAsNy40MjE4NzU5OSBMMCwxMi4xMDkzNzUxIEMwLDEyLjIxNTE2OTIgMC4wMzg2NTU0MjIxLDEyLjMwNjcyMjEgMC4xMTU5NjY2ODMsMTIuMzg0MDMzNCBDMC4xOTMyNzc5NDQsMTIuNDYxMzQ0NiAwLjI4NDgzMDg3NCwxMi41IDAuMzkwNjI1MDU1LDEyLjUgTDEuMTcxODc1MTcsMTIuNSBDMS4yNzc2NjkzNSwxMi41IDEuMzY5MjIyMjgsMTIuNDYxMzQ0NiAxLjQ0NjUzMzU0LDEyLjM4NDAzMzQgQzEuNTIzODQ0OCwxMi4zMDY3MjIxIDEuNTYyNTAwMjIsMTIuMjE1MTY5MiAxLjU2MjUwMDIyLDEyLjEwOTM3NTEgTDEuNTYyNTAwMjIsOC44ODY3MTczNyBDMS41NjI1MDAyMiw4Ljg4NjcxNzM3IDEuNTc2NzQxODksOC44NDE5NTgyMiAxLjYwNTIyNDgxLDguNzUyNDM5OSBDMS42MzM3MDc3Myw4LjY2MjkyMiAxLjcwODk4NDQxLDguNjE4MTYyODQgMS44MzEwNTQ4NCw4LjYxODE2Mjg0IEMxLjgzMTA1NDg0LDguNjE4MTYyODQgMS44MzMwODk0Myw4LjYxODE2Mjg0IDEuODM3MTU4NTksOC42MTgxNjI4NCBDMS44NDEyMjczNCw4LjYxODE2Mjg0IDEuODQ3MzMxMDksOC42MTgxNjI4NCAxLjg1NTQ2OTAxLDguNjE4MTYyODQgTDMuNTc2NjYwOTIsOC42MTgxNjI4NCBDMy41NzY2NjA5Miw4LjYxODE2Mjg0IDMuNjI3NTIzODUsOC42MzI0MDQwOSAzLjcyOTI0ODg2LDguNjYwODg3NDIgQzMuODMwOTc0MjksOC42ODkzNzAzMyAzLjg4OTk3NTEzLDguNzcyNzg1MzEgMy45MDYyNTA5Nyw4LjkxMTEzMTU0IEwzLjkwNjI1MDk3LDEwLjU0Njg3MjkgQzMuOTA2MjUwOTcsMTAuNTQ2ODcyOSAzLjg5MjAwOTMsMTAuNjExOTc3IDMuODYzNTI2MzgsMTAuNzQyMTg1MyBDMy44MzUwNDM0NiwxMC44NzIzOTM3IDMuNzE5MDc2MzYsMTAuOTM3NDk3OCAzLjUxNTYyNTkxLDEwLjkzNzQ5NzggQzMuNTE1NjI1OTEsMTAuOTM3NDk3OCAzLjUwNzQ4OCwxMC45Mzc0OTc4IDMuNDkxMjExNzQsMTAuOTM3NDk3OCBMMi43NzA5OTQ5OCwxMC45Mzc0OTc4IEMyLjY2NTIwMDM4LDEwLjkzNzQ5NzggMi41NzM2NDc4NiwxMC45NzYxNTMyIDIuNDk2MzM2NiwxMS4wNTM0NjQ0IEMyLjQxOTAyNTM0LDExLjEzMDc3NTcgMi4zODAzNjk5MiwxMS4yMjIzMjg2IDIuMzgwMzY5OTIsMTEuMzI4MTIyNyBMMi4zODAzNjk5MiwxMi4xMDkzNzI2IEMyLjM4MDM2OTkyLDEyLjIxNTE2NjcgMi40MTkwMjUzNCwxMi4zMDY3MTk2IDIuNDk2MzM2NiwxMi4zODQwMzA5IEMyLjU3MzY0Nzg2LDEyLjQ2MTM0MjEgMi42NjUyMDAzOCwxMi41IDIuNzcwOTk0OTgsMTIuNSBMNS4wNzgxMjQ0NywxMi41IEM1LjE4MzkxODY1LDEyLjUgNS4yNzU0NzE1OCwxMi40NjEzNDIxIDUuMzUyNzgyODQsMTIuMzg0MDMwOSBDNS40MzAwOTQxLDEyLjMwNjcxOTYgNS40Njg3NDk1MiwxMi4yMTUxNjY3IDUuNDY4NzQ5NTIsMTIuMTA5MzcyNiBMNS40Njg3NDk1Miw3LjQyMTg3MzQ5IEM1LjQ2ODc0OTUyLDcuMzE2MDc5MzUgNS40MzAwOTQxLDcuMjI0NTI2NDUgNS4zNTI3ODI4NCw3LjE0NzIxNTIxIEM1LjI3NTQ3MTU4LDcuMDY5OTAzOTggNS4xODM5MTg2NSw3LjAzMTI0ODU3IDUuMDc4MTI0NDcsNy4wMzEyNDg1NyBMNS4wNzgxMjU3Miw3LjAzMTI0ODU3IFogTTEyLjEwOTM3NjIsNy4wMzEyNDg1NyBMNy40MjE4NzU1Myw3LjAzMTI0ODU3IEM3LjMxNjA4MTM1LDcuMDMxMjQ4NTcgNy4yMjQ1Mjg0Miw3LjA2OTkwNjQ4IDcuMTQ3MjE3MTYsNy4xNDcyMTc3MSBDNy4wNjk5MDU5LDcuMjI0NTI4OTUgNy4wMzEyNTA0OCw3LjMxNjA4MTg1IDcuMDMxMjUwNDgsNy40MjE4NzU5OSBMNy4wMzEyNTA0OCwxMi4xMDkzNzUxIEM3LjAzMTI1MDQ4LDEyLjIxNTE2OTIgNy4wNjk5MDU5LDEyLjMwNjcyMjEgNy4xNDcyMTcxNiwxMi4zODQwMzM0IEM3LjIyNDUyODQyLDEyLjQ2MTM0NDYgNy4zMTYwODEzNSwxMi41IDcuNDIxODc1NTMsMTIuNSBMOC4yMDMxMjU2NCwxMi41IEM4LjMwODkxOTgyLDEyLjUgOC40MDA0NzI3NSwxMi40NjEzNDQ2IDguNDc3Nzg0MDEsMTIuMzg0MDMzNCBDOC41NTUwOTUyOCwxMi4zMDY3MjIxIDguNTkzNzUwNywxMi4yMTUxNjkyIDguNTkzNzUwNywxMi4xMDkzNzUxIEw4LjU5Mzc1MDcsOC44ODY3MTczNyBDOC41OTM3NTA3LDguODg2NzE3MzcgOC42MDc5OTIzNyw4Ljg0MTk1ODIyIDguNjM2NDc1MjksOC43NTI0Mzk5IEM4LjY2NDk1ODIxLDguNjYyOTIyIDguNzQwMjM0ODksOC42MTgxNjI4NCA4Ljg2MjMwNTMyLDguNjE4MTYyODQgQzguODYyMzA1MzIsOC42MTgxNjI4NCA4Ljg2NDMzOTksOC42MTgxNjI4NCA4Ljg2ODQwOTA3LDguNjE4MTYyODQgQzguODcyNDc3ODIsOC42MTgxNjI4NCA4Ljg3ODU4MTU3LDguNjE4MTYyODQgOC44ODY3MTk0OSw4LjYxODE2Mjg0IEwxMC42MDc5MTE0LDguNjE4MTYyODQgQzEwLjYwNzkxMTQsOC42MTgxNjI4NCAxMC42NTg3NzQzLDguNjMyNDA0MDkgMTAuNzYwNDk5Myw4LjY2MDg4NzQyIEMxMC44NjIyMjQ4LDguNjg5MzcwMzMgMTAuOTIxMjI1Niw4Ljc3Mjc4NTMxIDEwLjkzNzUwMTQsOC45MTExMzE1NCBMMTAuOTM3NTAxNCwxMC41NDY4NzI5IEMxMC45Mzc1MDE0LDEwLjU0Njg3MjkgMTAuOTIzMjU5OCwxMC42MTE5NzcgMTAuODk0Nzc2OSwxMC43NDIxODUzIEMxMC44NjYyOTM5LDEwLjg3MjM5MzcgMTAuNzUwMzI2OCwxMC45Mzc0OTc4IDEwLjU0Njg3NjQsMTAuOTM3NDk3OCBDMTAuNTQ2ODc2NCwxMC45Mzc0OTc4IDEwLjUzODczODUsMTAuOTM3NDk3OCAxMC41MjI0NjIyLDEwLjkzNzQ5NzggTDkuNzY1NjI0NjEsMTAuOTM3NDk3OCBDOS42NTk4MzA0MywxMC45Mzc0OTc4IDkuNTY4Mjc3NSwxMC45NzYxNTMyIDkuNDkwOTY2MjQsMTEuMDUzNDY0NCBDOS40MTM2NTQ5OCwxMS4xMzA3NzU3IDkuMzc0OTk5NTYsMTEuMjIyMzI4NiA5LjM3NDk5OTU2LDExLjMyODEyMjcgTDkuMzc0OTk5NTYsMTIuMTA5MzcyNiBDOS4zNzQ5OTk1NiwxMi4yMTUxNjY3IDkuNDEzNjU0OTgsMTIuMzA2NzE5NiA5LjQ5MDk2NjI0LDEyLjM4NDAzMDkgQzkuNTY4Mjc3NSwxMi40NjEzNDIxIDkuNjU5ODMwNDMsMTIuNSA5Ljc2NTYyNDYxLDEyLjUgTDEyLjEwOTM3NDksMTIuNSBDMTIuMjE1MTY5MSwxMi41IDEyLjMwNjcyMjEsMTIuNDYxMzQyMSAxMi4zODQwMzMzLDEyLjM4NDAzMDkgQzEyLjQ2MTM0NDYsMTIuMzA2NzE5NiAxMi41LDEyLjIxNTE2NjcgMTIuNSwxMi4xMDkzNzI2IEwxMi41LDcuNDIxODczNDkgQzEyLjUsNy4zMTYwNzkzNSAxMi40NjEzNDQ2LDcuMjI0NTI2NDUgMTIuMzg0MDMzMyw3LjE0NzIxNTIxIEMxMi4zMDY3MjIxLDcuMDY5OTAzOTggMTIuMjE1MTY5MSw3LjAzMTI0ODU3IDEyLjEwOTM3NDksNy4wMzEyNDg1NyBMMTIuMTA5Mzc2Miw3LjAzMTI0ODU3IFpcXFwiIGlkPVxcXCJTaGFwZVxcXCI+PC9wYXRoPlxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICA8L2c+XFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgPC9nPlxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgPC9nPlxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICA8L2c+XFxuICAgICAgICAgICAgICAgICAgICAgICAgPC9nPlxcbiAgICAgICAgICAgICAgICAgICAgPC9zdmc+XFxuICAgICAgICAgICAgICAgICAgICBPdGhlciBhcHBzXFxuICAgICAgICAgICAgICAgIDwvYT5cXG4gICAgICAgICAgICAgICAgPGRpdiBjbGFzcz1cXFwiYmFjLS1hcHBzLWNvbnRhaW5lclxcXCIgaWQ9XFxcImJhYy0tcHVyZXNkay1hcHBzLWNvbnRhaW5lci0tXFxcIj5cXG4gICAgICAgICAgICAgICAgICAgIDxkaXYgaWQ9XFxcImJhYy0tYXBzLWFjdHVhbC1jb250YWluZXJcXFwiPjwvZGl2PlxcbiAgICAgICAgICAgICAgICA8L2Rpdj5cXG4gICAgICAgICAgICA8L2Rpdj5cXG4gICAgICAgICAgICA8ZGl2IGNsYXNzPVxcXCJiYWMtLXVzZXItYXZhdGFyXFxcIiBpZD1cXFwiYmFjLS11c2VyLWF2YXRhci10b3BcXFwiPlxcbiAgICAgICAgICAgICAgICA8c3BhbiBjbGFzcz1cXFwiYmFjLS11c2VyLWF2YXRhci1uYW1lXFxcIiBpZD1cXFwiYmFjLS1wdXJlc2RrLXVzZXItYXZhdGFyLS1cXFwiPjwvc3Bhbj5cXG4gICAgICAgICAgICAgICAgPGRpdiBpZD1cXFwiYmFjLS1pbWFnZS1jb250YWluZXItdG9wXFxcIj48L2Rpdj5cXG4gICAgICAgICAgICA8L2Rpdj5cXG4gICAgICAgIDwvZGl2PlxcbiAgICA8L2Rpdj5cXG4gICAgPGRpdiBpZD1cXFwiYmFjLS1pbmZvLWJsb2Nrcy13cmFwcGVyLS1cXFwiPjwvZGl2PlxcbjwvaGVhZGVyPlxcbjxkaXYgY2xhc3M9XFxcImJhYy0tdXNlci1zaWRlYmFyXFxcIiBpZD1cXFwiYmFjLS1wdXJlc2RrLXVzZXItc2lkZWJhci0tXFxcIj5cXG4gICAgPGRpdiBjbGFzcz1cXFwiYmFjLS11c2VyLXNpZGViYXItd2hpdGUtYmdcXFwiIGlkPVxcXCJiYWMtLXVzZXItc2lkZWJhci13aGl0ZS1iZ1xcXCI+XFxuICAgICAgICA8ZGl2IGlkPVxcXCJiYWMtLXB1cmVzZGstdXNlci1kZXRhaWxzLS1cXFwiPlxcbiAgICAgICAgICAgIDxkaXYgY2xhc3M9XFxcImJhYy11c2VyLWFjb3VudC1saXN0LWl0ZW1cXFwiPlxcbiAgICAgICAgICAgICAgICA8YSBpZD1cXFwiYmFjLS1sb2dvdXQtLWJ1dHRvblxcXCIgaHJlZj1cXFwiL2FwaS92MS9zaWduLW9mZlxcXCI+PGkgY2xhc3M9XFxcImZhIGZhLWxvZ2luLWxpbmVcXFwiPjwvaT4gTG9nIG91dDwvYT5cXG4gICAgICAgICAgICA8L2Rpdj5cXG4gICAgICAgIDwvZGl2PlxcbiAgICAgICAgPGRpdiBjbGFzcz1cXFwiYmFjLS11c2VyLWFwcHNcXFwiIGlkPVxcXCJiYWMtLXB1cmVzZGstdXNlci1idXNpbmVzc2VzLS1cXFwiPlxcbiAgICAgICAgPC9kaXY+XFxuICAgICAgICA8ZGl2IGNsYXNzPVxcXCJiYWMtLXVzZXItYWNjb3VudC1zZXR0aW5nc1xcXCI+XFxuICAgICAgICAgICAgPGRpdiBpZD1cXFwicHVyZXNkay12ZXJzaW9uLW51bWJlclxcXCIgY2xhc3M9XFxcInB1cmVzZGstdmVyc2lvbi1udW1iZXJcXFwiPjwvZGl2PlxcbiAgICAgICAgPC9kaXY+XFxuICAgIDwvZGl2PlxcbjwvZGl2PlxcblxcblxcbjxkaXYgY2xhc3M9XFxcImJhYy0tY3VzdG9tLW1vZGFsIGFkZC1xdWVzdGlvbi1tb2RhbCAtLWlzLW9wZW5cXFwiIGlkPVxcXCJiYWMtLWNsb3VkaW5hcnktLW1vZGFsXFxcIj5cXG4gICAgPGRpdiBjbGFzcz1cXFwiY3VzdG9tLW1vZGFsX193cmFwcGVyXFxcIj5cXG4gICAgICAgIDxkaXYgY2xhc3M9XFxcImN1c3RvbS1tb2RhbF9fY29udGVudFxcXCI+XFxuICAgICAgICAgICAgPGgzPkFkZCBpbWFnZTwvaDM+XFxuICAgICAgICAgICAgPGEgY2xhc3M9XFxcImN1c3RvbS1tb2RhbF9fY2xvc2UtYnRuXFxcIiBpZD1cXFwiYmFjLS1jbG91ZGluYXJ5LS1jbG9zZWJ0blxcXCI+PGkgY2xhc3M9XFxcImZhIGZhLXRpbWVzLWNpcmNsZVxcXCI+PC9pPjwvYT5cXG4gICAgICAgIDwvZGl2PlxcblxcbiAgICAgICAgPGRpdiBjbGFzcz1cXFwiY3VzdG9tLW1vZGFsX19jb250ZW50XFxcIj5cXG4gICAgICAgICAgICA8ZGl2IGNsYXNzPVxcXCJiYWMtc2VhcmNoIC0taWNvbi1sZWZ0XFxcIj5cXG4gICAgICAgICAgICAgICAgPGlucHV0IGlkPVxcXCJiYWMtLWNsb3VkaW5hcnktLXNlYXJjaC1pbnB1dFxcXCIgdHlwZT1cXFwic2VhcmNoXFxcIiBuYW1lPVxcXCJzZWFyY2hcXFwiIHBsYWNlaG9sZGVyPVxcXCJTZWFyY2ggZm9yIGltYWdlcy4uLlxcXCIvPlxcbiAgICAgICAgICAgICAgICA8ZGl2IGNsYXNzPVxcXCJiYWMtc2VhcmNoX19pY29uXFxcIj48aSBjbGFzcz1cXFwiZmEgZmEtc2VhcmNoXFxcIj48L2k+PC9kaXY+XFxuICAgICAgICAgICAgPC9kaXY+XFxuICAgICAgICAgICAgPGJyLz5cXG5cXG4gICAgICAgICAgICA8ZGl2IGNsYXNzPVxcXCJiYWNrLWJ1dHRvblxcXCIgaWQ9XFxcImJhYy0tY2xvdWRpbmFyeS0tYmFjay1idXR0b24tY29udGFpbmVyXFxcIj5cXG4gICAgICAgICAgICAgICAgPGEgY2xhc3M9XFxcImdvQmFja1xcXCIgaWQ9XFxcImJhYy0tY2xvdWRpbmFyeS0tZ28tYmFja1xcXCI+PGkgY2xhc3M9XFxcImZhIGZhLWFuZ2xlLWxlZnRcXFwiPjwvaT5HbyBCYWNrPC9hPlxcbiAgICAgICAgICAgIDwvZGl2PlxcblxcbiAgICAgICAgICAgIDxici8+XFxuICAgICAgICAgICAgPGRpdiBjbGFzcz1cXFwiY2xvdWQtaW1hZ2VzXFxcIj5cXG4gICAgICAgICAgICAgICAgPGRpdiBjbGFzcz1cXFwiY2xvdWQtaW1hZ2VzX19jb250YWluZXJcXFwiIGlkPVxcXCJiYWMtLWNsb3VkaW5hcnktaXRhbXMtY29udGFpbmVyXFxcIj48L2Rpdj5cXG5cXG4gICAgICAgICAgICAgICAgPGRpdiBjbGFzcz1cXFwiY2xvdWQtaW1hZ2VzX19wYWdpbmF0aW9uXFxcIiBpZD1cXFwiYmFjLS1jbG91ZGluYXJ5LXBhZ2luYXRpb24tY29udGFpbmVyXFxcIj5cXG4gICAgICAgICAgICAgICAgICAgIDx1bCBpZD1cXFwiYmFjLS1jbG91ZGluYXJ5LWFjdHVhbC1wYWdpbmF0aW9uLWNvbnRhaW5lclxcXCI+PC91bD5cXG4gICAgICAgICAgICAgICAgPC9kaXY+XFxuXFxuICAgICAgICAgICAgPC9kaXY+XFxuICAgICAgICA8L2Rpdj5cXG4gICAgPC9kaXY+XFxuPC9kaXY+XFxuPGRpdiBpZD1cXFwiYmFjLS0taW52YWxpZC1hY2NvdW50XFxcIj5Zb3UgaGF2ZSBzd2l0Y2hlZCB0byBhbm90aGVyIGFjY291bnQgZnJvbSBhbm90aGVyIHRhYi4gUGxlYXNlIGVpdGhlciBjbG9zZSB0aGlzIHBhZ2VcXG4gICAgb3Igc3dpdGNoIHRvIHRoZSByaWdodCBhY2NvdW50IHRvIHJlLWVuYWJsZSBhY2Nlc3M8L2Rpdj5cXG5cXG48aW5wdXQgc3R5bGU9XFxcImRpc3BsYXk6bm9uZVxcXCIgdHlwZT0nZmlsZScgaWQ9J2JhYy0tLXB1cmVzZGstYXZhdGFyLWZpbGUnPlxcbjxpbnB1dCBzdHlsZT1cXFwiZGlzcGxheTpub25lXFxcIiB0eXBlPSdidXR0b24nIGlkPSdiYWMtLS1wdXJlc2RrLWF2YXRhci1zdWJtaXQnIHZhbHVlPSdVcGxvYWQhJz5cIik7XG5wcGJhLnNldFZlcnNpb25OdW1iZXIoJzIuOS41LXJjMicpO1xud2luZG93LlBVUkVTREsgPSBwcGJhO1xudmFyIGNzcyA9ICdodG1sLGJvZHksZGl2LHNwYW4sYXBwbGV0LG9iamVjdCxpZnJhbWUsaDEsaDIsaDMsaDQsaDUsaDYscCxibG9ja3F1b3RlLHByZSxhLGFiYnIsYWNyb255bSxhZGRyZXNzLGJpZyxjaXRlLGNvZGUsZGVsLGRmbixlbSxpbWcsaW5zLGtiZCxxLHMsc2FtcCxzbWFsbCxzdHJpa2Usc3Ryb25nLHN1YixzdXAsdHQsdmFyLGIsdSxpLGNlbnRlcixkbCxkdCxkZCxvbCx1bCxsaSxmaWVsZHNldCxmb3JtLGxhYmVsLGxlZ2VuZCx0YWJsZSxjYXB0aW9uLHRib2R5LHRmb290LHRoZWFkLHRyLHRoLHRkLGFydGljbGUsYXNpZGUsY2FudmFzLGRldGFpbHMsZW1iZWQsZmlndXJlLGZpZ2NhcHRpb24sZm9vdGVyLGhlYWRlcixoZ3JvdXAsbWVudSxuYXYsb3V0cHV0LHJ1Ynksc2VjdGlvbixzdW1tYXJ5LHRpbWUsbWFyayxhdWRpbyx2aWRlb3ttYXJnaW46MDtwYWRkaW5nOjA7Ym9yZGVyOjA7Zm9udC1zaXplOjEwMCU7Zm9udDppbmhlcml0O3ZlcnRpY2FsLWFsaWduOmJhc2VsaW5lfWFydGljbGUsYXNpZGUsZGV0YWlscyxmaWdjYXB0aW9uLGZpZ3VyZSxmb290ZXIsaGVhZGVyLGhncm91cCxtZW51LG5hdixzZWN0aW9ue2Rpc3BsYXk6YmxvY2t9Ym9keXtsaW5lLWhlaWdodDoxfW9sLHVse2xpc3Qtc3R5bGU6bm9uZX1ibG9ja3F1b3RlLHF7cXVvdGVzOm5vbmV9YmxvY2txdW90ZTpiZWZvcmUsYmxvY2txdW90ZTphZnRlcixxOmJlZm9yZSxxOmFmdGVye2NvbnRlbnQ6XCJcIjtjb250ZW50Om5vbmV9dGFibGV7Ym9yZGVyLWNvbGxhcHNlOmNvbGxhcHNlO2JvcmRlci1zcGFjaW5nOjB9Ym9keXtvdmVyZmxvdy14OmhpZGRlbn0jYmFjLS0taW52YWxpZC1hY2NvdW50e3Bvc2l0aW9uOmZpeGVkO3dpZHRoOjEwMCU7aGVpZ2h0OjEwMCU7YmFja2dyb3VuZDpibGFjaztvcGFjaXR5OjAuNztjb2xvcjp3aGl0ZTtmb250LXNpemU6MThweDt0ZXh0LWFsaWduOmNlbnRlcjtwYWRkaW5nLXRvcDoxNSU7ZGlzcGxheTpub25lO3otaW5kZXg6MTAwMDAwMDAwfSNiYWMtLS1pbnZhbGlkLWFjY291bnQuaW52YWxpZHtkaXNwbGF5OmJsb2NrfSNiYWMtd3JhcHBlcntmb250LWZhbWlseTpcIlZlcmRhbmFcIiwgYXJpYWwsIHNhbnMtc2VyaWY7Y29sb3I6d2hpdGU7bWluLWhlaWdodDoxMDB2aDtwb3NpdGlvbjpyZWxhdGl2ZX0uYmFjLXVzZXItYWNvdW50LWxpc3QtaXRlbXtiYWNrZ3JvdW5kLWNvbG9yOnRyYW5zcGFyZW50O3RleHQtYWxpZ246Y2VudGVyfS5iYWMtdXNlci1hY291bnQtbGlzdC1pdGVtICNiYWMtLWxvZ291dC0tYnV0dG9ue2Rpc3BsYXk6aW5saW5lLWJsb2NrO3BhZGRpbmc6NHB4IDhweDtiYWNrZ3JvdW5kLWNvbG9yOnJnYmEoMjU1LDI1NSwyNTUsMC44NSk7Zm9udC1zaXplOjEycHg7Ym9yZGVyLXJhZGl1czoycHg7bWFyZ2luOjRweCAwIDI2cHggMH0uYmFjLXVzZXItYWNvdW50LWxpc3QtaXRlbSBmYS1sb2dpbi1saW5le21hcmdpbi1yaWdodDozcHg7cG9zaXRpb246cmVsYXRpdmU7dG9wOjFweH0uYmFjLS1jb250YWluZXJ7bWF4LXdpZHRoOjExNjBweDttYXJnaW46MCBhdXRvfS5iYWMtLWNvbnRhaW5lciAuYmFjLS1wdXJlc2RrLWFwcC1uYW1lLS17Y29sb3I6IzMzMzMzMzt0ZXh0LWRlY29yYXRpb246bm9uZTttYXJnaW4tcmlnaHQ6MTZweDtmb250LXNpemU6MTNweDtkaXNwbGF5OmlubGluZS1ibG9jaztwYWRkaW5nOjZweCAxNnB4O2JhY2tncm91bmQtY29sb3I6cmdiYSgyNTUsMjU1LDI1NSwwLjc1KTtwb3NpdGlvbjpyZWxhdGl2ZTt0b3A6LTZweDtib3JkZXItcmFkaXVzOjRweDttYXJnaW4tbGVmdDoyMHB4fS5iYWMtLWNvbnRhaW5lciAuYmFjLS1wdXJlc2RrLWFwcC1uYW1lLS06aG92ZXJ7YmFja2dyb3VuZC1jb2xvcjpyZ2JhKDI1NSwyNTUsMjU1LDAuOSl9LmJhYy0tY29udGFpbmVyIC5iYWMtLXB1cmVzZGstYXBwLW5hbWUtLSBzdmd7bWFyZ2luLXJpZ2h0OjZweH0uYmFjLS1jb250YWluZXIgI2FwcC1uYW1lLWxpbmstdG8tcm9vdHt0ZXh0LWRlY29yYXRpb246bm9uZX0uYmFjLS1oZWFkZXItYXBwc3twb3NpdGlvbjphYnNvbHV0ZTt3aWR0aDoxMDAlO2hlaWdodDo1MHB4O2JhY2tncm91bmQtY29sb3I6IzQ3NTM2OTtwYWRkaW5nOjVweCAxMHB4O3otaW5kZXg6OTk5OTk5OSAhaW1wb3J0YW50fS5iYWMtLWhlYWRlci1hcHBzLmJhYy0tZnVsbHdpZHRoe3BhZGRpbmc6MH0uYmFjLS1oZWFkZXItYXBwcy5iYWMtLWZ1bGx3aWR0aCAuYmFjLS1jb250YWluZXJ7bWF4LXdpZHRoOnVuc2V0O3BhZGRpbmctbGVmdDoxNnB4O3BhZGRpbmctcmlnaHQ6MTZweH0uYmFjLS1oZWFkZXItYXBwcyAuYmFjLS1jb250YWluZXJ7aGVpZ2h0OjEwMCU7ZGlzcGxheTpmbGV4O2FsaWduLWl0ZW1zOmNlbnRlcjtqdXN0aWZ5LWNvbnRlbnQ6c3BhY2UtYmV0d2Vlbn0uYmFjLS1oZWFkZXItc2VhcmNoe3Bvc2l0aW9uOnJlbGF0aXZlfS5iYWMtLWhlYWRlci1zZWFyY2ggaW5wdXR7Y29sb3I6I2ZmZjtmb250LXNpemU6MTRweDtoZWlnaHQ6MzVweDtiYWNrZ3JvdW5kLWNvbG9yOiM2Yjc1ODY7cGFkZGluZzowIDVweCAwIDEwcHg7Ym9yZGVyOm5vbmU7Ym9yZGVyLXJhZGl1czozcHg7bWluLXdpZHRoOjQwMHB4O3dpZHRoOjEwMCV9LmJhYy0taGVhZGVyLXNlYXJjaCBpbnB1dDpmb2N1c3tvdXRsaW5lOm5vbmV9LmJhYy0taGVhZGVyLXNlYXJjaCBpbnB1dDo6LXdlYmtpdC1pbnB1dC1wbGFjZWhvbGRlcntmb250LXN0eWxlOm5vcm1hbCAhaW1wb3J0YW50O3RleHQtYWxpZ246Y2VudGVyO2NvbG9yOiNmZmY7Zm9udC1zaXplOjE0cHg7Zm9udC13ZWlnaHQ6MzAwO2xldHRlci1zcGFjaW5nOjAuNXB4fS5iYWMtLWhlYWRlci1zZWFyY2ggaW5wdXQ6Oi1tb3otcGxhY2Vob2xkZXJ7Zm9udC1zdHlsZTpub3JtYWwgIWltcG9ydGFudDt0ZXh0LWFsaWduOmNlbnRlcjtjb2xvcjojZmZmO2ZvbnQtc2l6ZToxNHB4O2ZvbnQtd2VpZ2h0OjMwMDtsZXR0ZXItc3BhY2luZzowLjVweH0uYmFjLS1oZWFkZXItc2VhcmNoIGlucHV0Oi1tcy1pbnB1dC1wbGFjZWhvbGRlcntmb250LXN0eWxlOm5vcm1hbCAhaW1wb3J0YW50O3RleHQtYWxpZ246Y2VudGVyO2NvbG9yOiNmZmY7Zm9udC1zaXplOjE0cHg7Zm9udC13ZWlnaHQ6MzAwO2xldHRlci1zcGFjaW5nOjAuNXB4fS5iYWMtLWhlYWRlci1zZWFyY2ggaXtwb3NpdGlvbjphYnNvbHV0ZTt0b3A6OHB4O3JpZ2h0OjEwcHh9LmJhYy0tdXNlci1hY3Rpb25ze2Rpc3BsYXk6ZmxleDthbGlnbi1pdGVtczpjZW50ZXJ9LmJhYy0tdXNlci1hY3Rpb25zICNiYWMtLXB1cmVzZGstYXBwcy1zZWN0aW9uLS17Ym9yZGVyLXJpZ2h0OjFweCBzb2xpZCAjYWRhZGFkO2hlaWdodDo0MHB4O3BhZGRpbmctdG9wOjEzcHh9LmJhYy0tdXNlci1hY3Rpb25zICNiYWMtLXB1cmVzZGstYXBwcy1zZWN0aW9uLS0gYS5iYWMtLXB1cmVzZGstYXBwcy1vbi1uYXZiYXItLXtjb2xvcjojMzMzMzMzO3RleHQtZGVjb3JhdGlvbjpub25lO21hcmdpbi1yaWdodDoxNnB4O2ZvbnQtc2l6ZToxM3B4O2Rpc3BsYXk6aW5saW5lLWJsb2NrO3BhZGRpbmc6NnB4IDE2cHg7YmFja2dyb3VuZC1jb2xvcjpyZ2JhKDI1NSwyNTUsMjU1LDAuNzUpO3Bvc2l0aW9uOnJlbGF0aXZlO3RvcDotNnB4O2JvcmRlci1yYWRpdXM6NHB4fS5iYWMtLXVzZXItYWN0aW9ucyAjYmFjLS1wdXJlc2RrLWFwcHMtc2VjdGlvbi0tIGEuYmFjLS1wdXJlc2RrLWFwcHMtb24tbmF2YmFyLS0uZGlzYWJsZWR7cG9pbnRlci1ldmVudHM6bm9uZTtjdXJzb3I6bm9uZTtjb2xvcjojYWRhZGFkfS5iYWMtLXVzZXItYWN0aW9ucyAjYmFjLS1wdXJlc2RrLWFwcHMtc2VjdGlvbi0tIGEuYmFjLS1wdXJlc2RrLWFwcHMtb24tbmF2YmFyLS0uc2VsZWN0ZWR7cG9pbnRlci1ldmVudHM6bm9uZTtiYWNrZ3JvdW5kLWNvbG9yOiNmZmY7Ym9yZGVyOjFweCBzb2xpZCAjMzMzMzMzfS5iYWMtLXVzZXItYWN0aW9ucyAjYmFjLS1wdXJlc2RrLWFwcHMtc2VjdGlvbi0tIGEuYmFjLS1wdXJlc2RrLWFwcHMtb24tbmF2YmFyLS06aG92ZXJ7YmFja2dyb3VuZC1jb2xvcjpyZ2JhKDI1NSwyNTUsMjU1LDAuOSl9LmJhYy0tdXNlci1hY3Rpb25zICNiYWMtLXB1cmVzZGstYXBwcy1zZWN0aW9uLS0gYS5iYWMtLXB1cmVzZGstYXBwcy1vbi1uYXZiYXItLSBzdmd7bWFyZ2luLXJpZ2h0OjZweH0uYmFjLS11c2VyLWFjdGlvbnMgLmJhYy0tdXNlci1ub3RpZmljYXRpb25ze3Bvc2l0aW9uOnJlbGF0aXZlfS5iYWMtLXVzZXItYWN0aW9ucyAuYmFjLS11c2VyLW5vdGlmaWNhdGlvbnMgaXtmb250LXNpemU6MjBweH0uYmFjLS11c2VyLWFjdGlvbnMgI2JhYy0tcHVyZXNkay0tbG9hZGVyLS17ZGlzcGxheTpub25lfS5iYWMtLXVzZXItYWN0aW9ucyAjYmFjLS1wdXJlc2RrLS1sb2FkZXItLS5iYWMtLXB1cmVzZGstdmlzaWJsZXtkaXNwbGF5OmJsb2NrfS5iYWMtLXVzZXItYWN0aW9ucyAuYmFjLS11c2VyLW5vdGlmaWNhdGlvbnMtY291bnR7cG9zaXRpb246YWJzb2x1dGU7ZGlzcGxheTppbmxpbmUtYmxvY2s7aGVpZ2h0OjE1cHg7d2lkdGg6MTVweDtsaW5lLWhlaWdodDoxNXB4O2NvbG9yOiNmZmY7Zm9udC1zaXplOjEwcHg7dGV4dC1hbGlnbjpjZW50ZXI7YmFja2dyb3VuZC1jb2xvcjojZmMzYjMwO2JvcmRlci1yYWRpdXM6NTAlO3RvcDotNXB4O2xlZnQ6LTVweH0uYmFjLS11c2VyLWFjdGlvbnMgLmJhYy0tdXNlci1hdmF0YXIsLmJhYy0tdXNlci1hY3Rpb25zIC5iYWMtLXVzZXItbm90aWZpY2F0aW9uc3ttYXJnaW4tbGVmdDoyMHB4fS5iYWMtLXVzZXItYWN0aW9ucyAuYmFjLS11c2VyLWF2YXRhcntwb3NpdGlvbjpyZWxhdGl2ZTtvdmVyZmxvdzpoaWRkZW47Ym9yZGVyLXJhZGl1czo1MCV9LmJhYy0tdXNlci1hY3Rpb25zIC5iYWMtLXVzZXItYXZhdGFyICNiYWMtLWltYWdlLWNvbnRhaW5lci10b3B7d2lkdGg6MTAwJTtoZWlndGg6MTAwJTtwb3NpdGlvbjphYnNvbHV0ZTt0b3A6MDtsZWZ0OjA7ei1pbmRleDoxO2Rpc3BsYXk6bm9uZX0uYmFjLS11c2VyLWFjdGlvbnMgLmJhYy0tdXNlci1hdmF0YXIgI2JhYy0taW1hZ2UtY29udGFpbmVyLXRvcCBpbWd7d2lkdGg6MTAwJTtoZWlnaHQ6MTAwJTtjdXJzb3I6cG9pbnRlcn0uYmFjLS11c2VyLWFjdGlvbnMgLmJhYy0tdXNlci1hdmF0YXIgI2JhYy0taW1hZ2UtY29udGFpbmVyLXRvcC5iYWMtLXB1cmVzZGstdmlzaWJsZXtkaXNwbGF5OmJsb2NrfS5iYWMtLXVzZXItYWN0aW9ucyAuYmFjLS11c2VyLWF2YXRhci1uYW1le2NvbG9yOiNmZmY7YmFja2dyb3VuZC1jb2xvcjojYWRhZGFkO2Rpc3BsYXk6aW5saW5lLWJsb2NrO2hlaWdodDozNXB4O3dpZHRoOjM1cHg7bGluZS1oZWlnaHQ6MzVweDt0ZXh0LWFsaWduOmNlbnRlcjtmb250LXNpemU6MTRweH0uYmFjLS11c2VyLWFwcHN7cG9zaXRpb246cmVsYXRpdmV9I2JhYy0tcHVyZXNkay1hcHBzLWljb24tLXt3aWR0aDoyMHB4O2Rpc3BsYXk6aW5saW5lLWJsb2NrO3RleHQtYWxpZ246Y2VudGVyO2ZvbnQtc2l6ZToxNnB4fS5iYWMtLXB1cmVzZGstYXBwcy1uYW1lLS17Zm9udC1zaXplOjlweDt3aWR0aDoyMHB4O3RleHQtYWxpZ246Y2VudGVyfSNiYWMtLXB1cmVzZGstdXNlci1idXNpbmVzc2VzLS17aGVpZ2h0OmNhbGMoMTAwdmggLSAyOTZweCk7b3ZlcmZsb3c6YXV0b30uYmFjLS1hcHBzLWNvbnRhaW5lcntiYWNrZ3JvdW5kOiNmZmY7cG9zaXRpb246YWJzb2x1dGU7dG9wOjQ1cHg7cmlnaHQ6MHB4O2Rpc3BsYXk6ZmxleDt3aWR0aDozMDBweDtmbGV4LXdyYXA6d3JhcDtib3JkZXItcmFkaXVzOjEwcHg7cGFkZGluZzoxNXB4O3BhZGRpbmctcmlnaHQ6MDtqdXN0aWZ5LWNvbnRlbnQ6c3BhY2UtYmV0d2Vlbjt0ZXh0LWFsaWduOmxlZnQ7LXdlYmtpdC1ib3gtc2hhZG93OjAgMCAxMHB4IDJweCByZ2JhKDAsMCwwLDAuMik7Ym94LXNoYWRvdzowIDAgMTBweCAycHggcmdiYSgwLDAsMCwwLjIpO29wYWNpdHk6MDt2aXNpYmlsaXR5OmhpZGRlbjt0cmFuc2l0aW9uOmFsbCAwLjRzIGVhc2U7bWF4LWhlaWdodDo1MDBweH0uYmFjLS1hcHBzLWNvbnRhaW5lciAjYmFjLS1hcHMtYWN0dWFsLWNvbnRhaW5lcntoZWlnaHQ6MTAwJTtvdmVyZmxvdzpzY3JvbGw7bWF4LWhlaWdodDo0NzVweDt3aWR0aDoxMDAlfS5iYWMtLWFwcHMtY29udGFpbmVyLmFjdGl2ZXtvcGFjaXR5OjE7dmlzaWJpbGl0eTp2aXNpYmxlfS5iYWMtLWFwcHMtY29udGFpbmVyOmJlZm9yZXtjb250ZW50OlwiXCI7dmVydGljYWwtYWxpZ246bWlkZGxlO21hcmdpbjphdXRvO3Bvc2l0aW9uOmFic29sdXRlO2Rpc3BsYXk6YmxvY2s7bGVmdDowO3JpZ2h0Oi0xODVweDtib3R0b206Y2FsYygxMDAlIC0gNnB4KTt3aWR0aDoxMnB4O2hlaWdodDoxMnB4O3RyYW5zZm9ybTpyb3RhdGUoNDVkZWcpO2JhY2tncm91bmQtY29sb3I6I2ZmZn0uYmFjLS1hcHBzLWNvbnRhaW5lciAuYmFjLS1hcHBze3dpZHRoOjEwMCU7Zm9udC1zaXplOjIwcHg7bWFyZ2luLWJvdHRvbToxNXB4O3RleHQtYWxpZ246bGVmdDtoZWlnaHQ6MzNweH0uYmFjLS1hcHBzLWNvbnRhaW5lciAuYmFjLS1hcHBzOmxhc3QtY2hpbGR7bWFyZ2luLWJvdHRvbTowfS5iYWMtLWFwcHMtY29udGFpbmVyIC5iYWMtLWFwcHM6aG92ZXJ7YmFja2dyb3VuZDojZjNmM2YzfS5iYWMtLWFwcHMtY29udGFpbmVyIC5iYWMtLWFwcHMgYS5iYWMtLWltYWdlLWxpbmt7ZGlzcGxheTppbmxpbmUtYmxvY2s7Y29sb3I6I2ZmZjt0ZXh0LWRlY29yYXRpb246bm9uZTt3aWR0aDozM3B4O2hlaWdodDozM3B4fS5iYWMtLWFwcHMtY29udGFpbmVyIC5iYWMtLWFwcHMgYS5iYWMtLWltYWdlLWxpbmsgaW1ne3dpZHRoOjEwMCU7aGVpZ2h0OjEwMCV9LmJhYy0tYXBwcy1jb250YWluZXIgLmJhYy0tYXBwcyAuYmFjLS1wdXJlc2RrLWFwcC10ZXh0LWNvbnRhaW5lcntkaXNwbGF5OmlubGluZS1ibG9jaztwb3NpdGlvbjpyZWxhdGl2ZTtsZWZ0Oi0ycHg7d2lkdGg6Y2FsYygxMDAlIC0gNDJweCl9LmJhYy0tYXBwcy1jb250YWluZXIgLmJhYy0tYXBwcyAuYmFjLS1wdXJlc2RrLWFwcC10ZXh0LWNvbnRhaW5lciBhe2Rpc3BsYXk6YmxvY2s7dGV4dC1kZWNvcmF0aW9uOm5vbmU7Y3Vyc29yOnBvaW50ZXI7cGFkZGluZy1sZWZ0OjhweH0uYmFjLS1hcHBzLWNvbnRhaW5lciAuYmFjLS1hcHBzIC5iYWMtLXB1cmVzZGstYXBwLXRleHQtY29udGFpbmVyIC5iYWMtLWFwcC1uYW1le3dpZHRoOjEwMCU7Y29sb3I6IzAwMDtmb250LXNpemU6MTNweDtwYWRkaW5nLWJvdHRvbTo0cHh9LmJhYy0tYXBwcy1jb250YWluZXIgLmJhYy0tYXBwcyAuYmFjLS1wdXJlc2RrLWFwcC10ZXh0LWNvbnRhaW5lciAuYmFjLS1hcHAtZGVzY3JpcHRpb257Y29sb3I6IzkxOTE5MTtmb250LXNpemU6MTFweDtmb250LXN0eWxlOml0YWxpYztsaW5lLWhlaWdodDoxLjNlbTtwb3NpdGlvbjpyZWxhdGl2ZTt0b3A6LTJweDtvdmVyZmxvdzpoaWRkZW47d2hpdGUtc3BhY2U6bm93cmFwO3RleHQtb3ZlcmZsb3c6ZWxsaXBzaXN9LmJhYy0tdXNlci1zaWRlYmFye2JhY2tncm91bmQ6d2hpdGU7Zm9udC1mYW1pbHk6XCJWZXJkYW5hXCIsIGFyaWFsLCBzYW5zLXNlcmlmO2NvbG9yOiMzMzMzMzM7aGVpZ2h0OmNhbGMoMTAwdmggLSA1MHB4KTtib3gtc2l6aW5nOmJvcmRlci1ib3g7d2lkdGg6MzIwcHg7cG9zaXRpb246Zml4ZWQ7dG9wOjUwcHg7cmlnaHQ6MDt6LWluZGV4Ojk5OTk5OTtvcGFjaXR5OjA7dHJhbnNmb3JtOnRyYW5zbGF0ZVgoMTAwJSk7dHJhbnNpdGlvbjphbGwgMC40cyBlYXNlfS5iYWMtLXVzZXItc2lkZWJhciAuYmFjLS11c2VyLXNpZGViYXItd2hpdGUtYmd7d2lkdGg6MTAwJTtoZWlnaHQ6MTAwJX0uYmFjLS11c2VyLXNpZGViYXIuYWN0aXZle29wYWNpdHk6MTt0cmFuc2Zvcm06dHJhbnNsYXRlWCgwJSk7LXdlYmtpdC1ib3gtc2hhZG93Oi0xcHggMHB4IDEycHggMHB4IHJnYmEoMCwwLDAsMC43NSk7LW1vei1ib3gtc2hhZG93Oi0xcHggM3B4IDEycHggMHB4IHJnYmEoMCwwLDAsMC43NSk7Ym94LXNoYWRvdzotMXB4IDBweCAxMnB4IDBweCByZ2JhKDAsMCwwLDAuNzUpfS5iYWMtLXVzZXItc2lkZWJhciAuYmFjLS11c2VyLWxpc3QtaXRlbXtkaXNwbGF5OmZsZXg7cG9zaXRpb246cmVsYXRpdmU7Y3Vyc29yOnBvaW50ZXI7YWxpZ24taXRlbXM6Y2VudGVyO3BhZGRpbmc6MTBweCAxMHB4IDEwcHggNDBweDtib3JkZXItYm90dG9tOjFweCBzb2xpZCB3aGl0ZX0uYmFjLS11c2VyLXNpZGViYXIgLmJhYy0tdXNlci1saXN0LWl0ZW06aG92ZXJ7YmFja2dyb3VuZC1jb2xvcjpyZ2JhKDI1NSwyNTUsMjU1LDAuMSl9LmJhYy0tdXNlci1zaWRlYmFyIC5iYWMtLXVzZXItbGlzdC1pdGVtIC5iYWMtLXNlbGVjdGVkLWFjb3VudC1pbmRpY2F0b3J7cG9zaXRpb246YWJzb2x1dGU7cmlnaHQ6MDtoZWlnaHQ6MTAwJTt3aWR0aDo4cHg7YmFja2dyb3VuZDojMzMzMzMzfS5iYWMtLXVzZXItc2lkZWJhciAuYmFjLS11c2VyLWxpc3QtaXRlbSAuYmFjLS11c2VyLWxpc3QtaXRlbS1pbWFnZXt3aWR0aDo0MHB4O2hlaWdodDo0MHB4O2JvcmRlci1yYWRpdXM6M3B4O2JvcmRlcjoxcHggc29saWQgIzMzMzMzMztvdmVyZmxvdzpoaWRkZW47bWFyZ2luLXJpZ2h0OjIwcHg7ZGlzcGxheTpmbGV4O2FsaWduLWl0ZW1zOmNlbnRlcjtqdXN0aWZ5LWNvbnRlbnQ6Y2VudGVyfS5iYWMtLXVzZXItc2lkZWJhciAuYmFjLS11c2VyLWxpc3QtaXRlbSAuYmFjLS11c2VyLWxpc3QtaXRlbS1pbWFnZT5pbWd7d2lkdGg6YXV0bztoZWlnaHQ6YXV0bzttYXgtd2lkdGg6MTAwJTttYXgtaGVpZ2h0OjEwMCV9LmJhYy0tdXNlci1zaWRlYmFyIC5iYWMtLXVzZXItbGlzdC1pdGVtIHNwYW57d2lkdGg6MTAwJTtkaXNwbGF5OmJsb2NrO21hcmdpbi1ib3R0b206NXB4fS5iYWMtLXVzZXItc2lkZWJhciAuYmFjLXVzZXItYXBwLWRldGFpbHMgc3Bhbntmb250LXNpemU6MTJweH0uYmFjLS11c2VyLXNpZGViYXIgLnB1cmVzZGstdmVyc2lvbi1udW1iZXJ7d2lkdGg6MTAwJTt0ZXh0LWFsaWduOnJpZ2h0O3BhZGRpbmctcmlnaHQ6MTBweDtwb3NpdGlvbjphYnNvbHV0ZTtmb250LXNpemU6OHB4O29wYWNpdHk6MC41O3JpZ2h0OjA7Ym90dG9tOjB9LmJhYy0tdXNlci1zaWRlYmFyLWluZm97ZGlzcGxheTpmbGV4O2p1c3RpZnktY29udGVudDpjZW50ZXI7ZmxleC13cmFwOndyYXA7dGV4dC1hbGlnbjpjZW50ZXI7cGFkZGluZzoyMHB4IDIwcHggMTVweH0uYmFjLS11c2VyLXNpZGViYXItaW5mbyAuYmFjLS11c2VyLWltYWdle2JvcmRlcjoxcHggI2FkYWRhZCBzb2xpZDtvdmVyZmxvdzpoaWRkZW47Ym9yZGVyLXJhZGl1czo1MCU7cG9zaXRpb246cmVsYXRpdmU7Y3Vyc29yOnBvaW50ZXI7ZGlzcGxheTppbmxpbmUtYmxvY2s7aGVpZ2h0OjgwcHg7d2lkdGg6ODBweDtsaW5lLWhlaWdodDo4MHB4O3RleHQtYWxpZ246Y2VudGVyO2NvbG9yOiNmZmY7Ym9yZGVyLXJhZGl1czo1MCU7YmFja2dyb3VuZC1jb2xvcjojYWRhZGFkO21hcmdpbi1ib3R0b206MTVweH0uYmFjLS11c2VyLXNpZGViYXItaW5mbyAuYmFjLS11c2VyLWltYWdlICNiYWMtLXVzZXItaW1hZ2UtZmlsZXtkaXNwbGF5Om5vbmU7cG9zaXRpb246YWJzb2x1dGU7ei1pbmRleDoxO3RvcDowO2xlZnQ6MDt3aWR0aDoxMDAlO2hlaWdodDoxMDAlfS5iYWMtLXVzZXItc2lkZWJhci1pbmZvIC5iYWMtLXVzZXItaW1hZ2UgI2JhYy0tdXNlci1pbWFnZS1maWxlIGltZ3t3aWR0aDoxMDAlO2hlaWdodDoxMDAlfS5iYWMtLXVzZXItc2lkZWJhci1pbmZvIC5iYWMtLXVzZXItaW1hZ2UgI2JhYy0tdXNlci1pbWFnZS1maWxlLmJhYy0tcHVyZXNkay12aXNpYmxle2Rpc3BsYXk6YmxvY2t9LmJhYy0tdXNlci1zaWRlYmFyLWluZm8gLmJhYy0tdXNlci1pbWFnZSAjYmFjLS11c2VyLWltYWdlLXVwbG9hZC1wcm9ncmVzc3twb3NpdGlvbjphYnNvbHV0ZTtwYWRkaW5nLXRvcDoxMHB4O3RvcDowO2JhY2tncm91bmQ6IzY2Njt6LWluZGV4OjQ7ZGlzcGxheTpub25lO3dpZHRoOjEwMCU7aGVpZ2h0OjEwMCV9LmJhYy0tdXNlci1zaWRlYmFyLWluZm8gLmJhYy0tdXNlci1pbWFnZSAjYmFjLS11c2VyLWltYWdlLXVwbG9hZC1wcm9ncmVzcy5iYWMtLXB1cmVzZGstdmlzaWJsZXtkaXNwbGF5OmJsb2NrfS5iYWMtLXVzZXItc2lkZWJhci1pbmZvIC5iYWMtLXVzZXItaW1hZ2UgaXtmb250LXNpemU6MzJweDtmb250LXNpemU6MzJweDt6LWluZGV4OjA7cG9zaXRpb246YWJzb2x1dGU7d2lkdGg6MTAwJTtsZWZ0OjA7YmFja2dyb3VuZC1jb2xvcjpyZ2JhKDAsMCwwLDAuNSl9LmJhYy0tdXNlci1zaWRlYmFyLWluZm8gLmJhYy0tdXNlci1pbWFnZTpob3ZlciBpe3otaW5kZXg6M30uYmFjLS11c2VyLXNpZGViYXItaW5mbyAuYmFjLS11c2VyLW5hbWV7d2lkdGg6MTAwJTt0ZXh0LWFsaWduOmNlbnRlcjtmb250LXNpemU6MThweDttYXJnaW4tYm90dG9tOjEwcHh9LmJhYy0tdXNlci1zaWRlYmFyLWluZm8gLmJhYy0tdXNlci1lbWFpbHtmb250LXNpemU6MTJweDtmb250LXdlaWdodDozMDB9LmJhYy0tdXNlci1hY2NvdW50LXNldHRpbmdze3Bvc2l0aW9uOmFic29sdXRlO2JvdHRvbToxMHB4O2xlZnQ6MjBweDt3aWR0aDo5MCU7aGVpZ2h0OjEwcHh9I2JhYy0tcHVyZXNkay1hY2NvdW50LWxvZ28tLXtjdXJzb3I6cG9pbnRlcjtwb3NpdGlvbjpyZWxhdGl2ZTtjb2xvcjojZmZmfSNiYWMtLXB1cmVzZGstYWNjb3VudC1sb2dvLS0gaW1ne2hlaWdodDoyOHB4O3RvcDozcHg7cG9zaXRpb246cmVsYXRpdmV9I2JhYy0taW5mby1ibG9ja3Mtd3JhcHBlci0te3Bvc2l0aW9uOmZpeGVkO3RvcDowcHg7aGVpZ2h0OmF1dG99I2JhYy0taW5mby1ibG9ja3Mtd3JhcHBlci0tIC5iYWMtLXB1cmVzZGstaW5mby1ib3gtLXtib3JkZXItcmFkaXVzOjAgMCAzcHggM3B4O292ZXJmbG93OmhpZGRlbjt6LWluZGV4Ojk5OTk5OTk5O3Bvc2l0aW9uOnJlbGF0aXZlO21hcmdpbi10b3A6MDt3aWR0aDo0NzBweDtsZWZ0OmNhbGMoNTB2dyAtIDIzNXB4KTtoZWlnaHQ6MHB4Oy13ZWJraXQtdHJhbnNpdGlvbjp0b3AgMC40czt0cmFuc2l0aW9uOmFsbCAwLjRzfSNiYWMtLWluZm8tYmxvY2tzLXdyYXBwZXItLSAuYmFjLS1wdXJlc2RrLWluZm8tYm94LS0uYmFjLS1zdWNjZXNze2JhY2tncm91bmQ6IzE0REE5RX0jYmFjLS1pbmZvLWJsb2Nrcy13cmFwcGVyLS0gLmJhYy0tcHVyZXNkay1pbmZvLWJveC0tLmJhYy0tc3VjY2VzcyAuYmFjLS1pbm5lci1pbmZvLWJveC0tIGRpdi5iYWMtLWluZm8taWNvbi0tLmZhLXN1Y2Nlc3N7ZGlzcGxheTppbmxpbmUtYmxvY2t9I2JhYy0taW5mby1ibG9ja3Mtd3JhcHBlci0tIC5iYWMtLXB1cmVzZGstaW5mby1ib3gtLS5iYWMtLWluZm97YmFja2dyb3VuZC1jb2xvcjojNUJDMERFfSNiYWMtLWluZm8tYmxvY2tzLXdyYXBwZXItLSAuYmFjLS1wdXJlc2RrLWluZm8tYm94LS0uYmFjLS1pbmZvIC5iYWMtLWlubmVyLWluZm8tYm94LS0gZGl2LmJhYy0taW5mby1pY29uLS0uZmEtaW5mby0xe2Rpc3BsYXk6aW5saW5lLWJsb2NrfSNiYWMtLWluZm8tYmxvY2tzLXdyYXBwZXItLSAuYmFjLS1wdXJlc2RrLWluZm8tYm94LS0uYmFjLS13YXJuaW5ne2JhY2tncm91bmQ6I0YwQUQ0RX0jYmFjLS1pbmZvLWJsb2Nrcy13cmFwcGVyLS0gLmJhYy0tcHVyZXNkay1pbmZvLWJveC0tLmJhYy0td2FybmluZyAuYmFjLS1pbm5lci1pbmZvLWJveC0tIGRpdi5iYWMtLWluZm8taWNvbi0tLmZhLXdhcm5pbmd7ZGlzcGxheTppbmxpbmUtYmxvY2t9I2JhYy0taW5mby1ibG9ja3Mtd3JhcHBlci0tIC5iYWMtLXB1cmVzZGstaW5mby1ib3gtLS5iYWMtLWVycm9ye2JhY2tncm91bmQ6I0VGNDEwMH0jYmFjLS1pbmZvLWJsb2Nrcy13cmFwcGVyLS0gLmJhYy0tcHVyZXNkay1pbmZvLWJveC0tLmJhYy0tZXJyb3IgLmJhYy0taW5uZXItaW5mby1ib3gtLSBkaXYuYmFjLS1pbmZvLWljb24tLS5mYS1lcnJvcntkaXNwbGF5OmlubGluZS1ibG9ja30jYmFjLS1pbmZvLWJsb2Nrcy13cmFwcGVyLS0gLmJhYy0tcHVyZXNkay1pbmZvLWJveC0tIC5iYWMtLXRpbWVyey13ZWJraXQtdHJhbnNpdGlvbi10aW1pbmctZnVuY3Rpb246bGluZWFyO3RyYW5zaXRpb24tdGltaW5nLWZ1bmN0aW9uOmxpbmVhcjtwb3NpdGlvbjphYnNvbHV0ZTtib3R0b206MHB4O29wYWNpdHk6MC41O2hlaWdodDoycHggIWltcG9ydGFudDtiYWNrZ3JvdW5kOndoaXRlO3dpZHRoOjAlfSNiYWMtLWluZm8tYmxvY2tzLXdyYXBwZXItLSAuYmFjLS1wdXJlc2RrLWluZm8tYm94LS0gLmJhYy0tdGltZXIuYmFjLS1mdWxsd2lkdGh7d2lkdGg6MTAwJX0jYmFjLS1pbmZvLWJsb2Nrcy13cmFwcGVyLS0gLmJhYy0tcHVyZXNkay1pbmZvLWJveC0tLmJhYy0tYWN0aXZlLS17aGVpZ2h0OmF1dG87bWFyZ2luLXRvcDo1cHh9I2JhYy0taW5mby1ibG9ja3Mtd3JhcHBlci0tIC5iYWMtLXB1cmVzZGstaW5mby1ib3gtLSAuYmFjLS1pbm5lci1pbmZvLWJveC0te3dpZHRoOjEwMCU7cGFkZGluZzoxMXB4IDE1cHg7Y29sb3I6d2hpdGV9I2JhYy0taW5mby1ibG9ja3Mtd3JhcHBlci0tIC5iYWMtLXB1cmVzZGstaW5mby1ib3gtLSAuYmFjLS1pbm5lci1pbmZvLWJveC0tIGRpdntkaXNwbGF5OmlubGluZS1ibG9jaztoZWlnaHQ6MThweDtwb3NpdGlvbjpyZWxhdGl2ZX0jYmFjLS1pbmZvLWJsb2Nrcy13cmFwcGVyLS0gLmJhYy0tcHVyZXNkay1pbmZvLWJveC0tIC5iYWMtLWlubmVyLWluZm8tYm94LS0gZGl2LmJhYy0taW5mby1pY29uLS17ZGlzcGxheTpub25lO3RvcDowcHh9I2JhYy0taW5mby1ibG9ja3Mtd3JhcHBlci0tIC5iYWMtLXB1cmVzZGstaW5mby1ib3gtLSAuYmFjLS1pbm5lci1pbmZvLWJveC0tIC5iYWMtLWluZm8taWNvbi0te21hcmdpbi1yaWdodDoxNXB4O3dpZHRoOjEwcHg7dG9wOjJweH0jYmFjLS1pbmZvLWJsb2Nrcy13cmFwcGVyLS0gLmJhYy0tcHVyZXNkay1pbmZvLWJveC0tIC5iYWMtLWlubmVyLWluZm8tYm94LS0gLmJhYy0taW5mby1tYWluLXRleHQtLXt3aWR0aDozODBweDttYXJnaW4tcmlnaHQ6MTVweDtmb250LXNpemU6MTJweDt0ZXh0LWFsaWduOmNlbnRlcn0jYmFjLS1pbmZvLWJsb2Nrcy13cmFwcGVyLS0gLmJhYy0tcHVyZXNkay1pbmZvLWJveC0tIC5iYWMtLWlubmVyLWluZm8tYm94LS0gLmJhYy0taW5mby1jbG9zZS1idXR0b24tLXt3aWR0aDoxMHB4O2N1cnNvcjpwb2ludGVyO3RvcDoycHh9QG1lZGlhIChtaW4td2lkdGg6IDYwMHB4KXsuYmFjLS1jb250YWluZXIuYmFjLS1mdWxsd2lkdGggLmJhYy0tY29udGFpbmVye3BhZGRpbmctbGVmdDoyNHB4O3BhZGRpbmctcmlnaHQ6MjRweH19QG1lZGlhIChtaW4td2lkdGg6IDk2MHB4KXsuYmFjLS1jb250YWluZXIuYmFjLS1mdWxsd2lkdGggLmJhYy0tY29udGFpbmVye3BhZGRpbmctbGVmdDozMnB4O3BhZGRpbmctcmlnaHQ6MzJweH19LmJhYy0tY3VzdG9tLW1vZGFse3Bvc2l0aW9uOmZpeGVkO3dpZHRoOjcwJTtoZWlnaHQ6ODAlO21pbi13aWR0aDo0MDBweDtsZWZ0OjA7cmlnaHQ6MDt0b3A6MDtib3R0b206MDttYXJnaW46YXV0bztib3JkZXI6MXB4IHNvbGlkICM5Nzk3OTc7Ym9yZGVyLXJhZGl1czo1cHg7Ym94LXNoYWRvdzowIDAgNzFweCAwICMyRjM4NDk7YmFja2dyb3VuZDojZmZmO3otaW5kZXg6OTk5O292ZXJmbG93OmF1dG87ZGlzcGxheTpub25lfS5iYWMtLWN1c3RvbS1tb2RhbC5pcy1vcGVue2Rpc3BsYXk6YmxvY2t9LmJhYy0tY3VzdG9tLW1vZGFsIC5jdXN0b20tbW9kYWxfX2Nsb3NlLWJ0bnt0ZXh0LWRlY29yYXRpb246bm9uZTtwYWRkaW5nLXRvcDoycHg7bGluZS1oZWlnaHQ6MThweDtoZWlnaHQ6MjBweDt3aWR0aDoyMHB4O2JvcmRlci1yYWRpdXM6NTAlO2NvbG9yOiM5MDliYTQ7dGV4dC1hbGlnbjpjZW50ZXI7cG9zaXRpb246YWJzb2x1dGU7dG9wOjIwcHg7cmlnaHQ6MjBweDtmb250LXNpemU6MjBweH0uYmFjLS1jdXN0b20tbW9kYWwgLmN1c3RvbS1tb2RhbF9fY2xvc2UtYnRuOmhvdmVye3RleHQtZGVjb3JhdGlvbjpub25lO2NvbG9yOiM0NTUwNjY7Y3Vyc29yOnBvaW50ZXJ9LmJhYy0tY3VzdG9tLW1vZGFsIC5jdXN0b20tbW9kYWxfX3dyYXBwZXJ7aGVpZ2h0OjEwMCU7ZGlzcGxheTpmbGV4O2ZsZXgtZGlyZWN0aW9uOmNvbHVtbn0uYmFjLS1jdXN0b20tbW9kYWwgLmN1c3RvbS1tb2RhbF9fd3JhcHBlciBpZnJhbWV7d2lkdGg6MTAwJTtoZWlnaHQ6MTAwJX0uYmFjLS1jdXN0b20tbW9kYWwgLmN1c3RvbS1tb2RhbF9fY29udGVudC13cmFwcGVye2hlaWdodDoxMDAlO292ZXJmbG93OmF1dG87bWFyZ2luLWJvdHRvbToxMDRweDtib3JkZXItdG9wOjJweCBzb2xpZCAjQzlDREQ3fS5iYWMtLWN1c3RvbS1tb2RhbCAuY3VzdG9tLW1vZGFsX19jb250ZW50LXdyYXBwZXIubm8tbWFyZ2lue21hcmdpbi1ib3R0b206MH0uYmFjLS1jdXN0b20tbW9kYWwgLmN1c3RvbS1tb2RhbF9fY29udGVudHtwYWRkaW5nOjIwcHg7cG9zaXRpb246cmVsYXRpdmV9LmJhYy0tY3VzdG9tLW1vZGFsIC5jdXN0b20tbW9kYWxfX2NvbnRlbnQgaDN7Y29sb3I6IzJGMzg0OTtmb250LXNpemU6MjBweDtmb250LXdlaWdodDo2MDA7bGluZS1oZWlnaHQ6MjdweH0uYmFjLS1jdXN0b20tbW9kYWwgLmN1c3RvbS1tb2RhbF9fc2F2ZXtwb3NpdGlvbjphYnNvbHV0ZTtyaWdodDowO2JvdHRvbTowO3dpZHRoOjEwMCU7cGFkZGluZzozMHB4IDMycHg7YmFja2dyb3VuZC1jb2xvcjojRjJGMkY0fS5iYWMtLWN1c3RvbS1tb2RhbCAuY3VzdG9tLW1vZGFsX19zYXZlIGEsLmJhYy0tY3VzdG9tLW1vZGFsIC5jdXN0b20tbW9kYWxfX3NhdmUgYnV0dG9ue2ZvbnQtc2l6ZToxNHB4O2xpbmUtaGVpZ2h0OjIycHg7aGVpZ2h0OjQ0cHg7d2lkdGg6MTAwJX0uYmFjLS1jdXN0b20tbW9kYWwgLmN1c3RvbS1tb2RhbF9fc3BsaXR0ZXJ7aGVpZ2h0OjMwcHg7bGluZS1oZWlnaHQ6MzBweDtwYWRkaW5nOjAgMjBweDtib3JkZXItY29sb3I6I0QzRDNEMztib3JkZXItc3R5bGU6c29saWQ7Ym9yZGVyLXdpZHRoOjFweCAwIDFweCAwO2JhY2tncm91bmQtY29sb3I6I0YwRjBGMDtjb2xvcjojNjc2RjgyO2ZvbnQtc2l6ZToxM3B4O2ZvbnQtd2VpZ2h0OjYwMH0uYmFjLS1jdXN0b20tbW9kYWwgLmN1c3RvbS1tb2RhbF9fYm94e2Rpc3BsYXk6aW5saW5lLWJsb2NrO3ZlcnRpY2FsLWFsaWduOm1pZGRsZTtoZWlnaHQ6MTY1cHg7d2lkdGg6MTY1cHg7Ym9yZGVyOjJweCBzb2xpZCByZWQ7Ym9yZGVyLXJhZGl1czo1cHg7dGV4dC1hbGlnbjpjZW50ZXI7Zm9udC1zaXplOjEycHg7Zm9udC13ZWlnaHQ6NjAwO2NvbG9yOiM5MDk3QTg7dGV4dC1kZWNvcmF0aW9uOm5vbmU7bWFyZ2luOjEwcHggMjBweCAxMHB4IDA7dHJhbnNpdGlvbjowLjFzIGFsbH0uYmFjLS1jdXN0b20tbW9kYWwgLmN1c3RvbS1tb2RhbF9fYm94IGl7Zm9udC1zaXplOjcwcHg7ZGlzcGxheTpibG9jazttYXJnaW46MjVweCAwfS5iYWMtLWN1c3RvbS1tb2RhbCAuY3VzdG9tLW1vZGFsX19ib3guYWN0aXZle2NvbG9yOnllbGxvdztib3JkZXItY29sb3I6eWVsbG93O3RleHQtZGVjb3JhdGlvbjpub25lfS5iYWMtLWN1c3RvbS1tb2RhbCAuY3VzdG9tLW1vZGFsX19ib3g6aG92ZXIsLmJhYy0tY3VzdG9tLW1vZGFsIC5jdXN0b20tbW9kYWxfX2JveDphY3RpdmUsLmJhYy0tY3VzdG9tLW1vZGFsIC5jdXN0b20tbW9kYWxfX2JveDpmb2N1c3tjb2xvcjojMUFDMEI0O2JvcmRlci1jb2xvcjp5ZWxsb3c7dGV4dC1kZWNvcmF0aW9uOm5vbmV9LmNsb3VkLWltYWdlc19fY29udGFpbmVye2Rpc3BsYXk6ZmxleDtmbGV4LXdyYXA6d3JhcDtqdXN0aWZ5LWNvbnRlbnQ6ZmxleC1zdGFydH0uY2xvdWQtaW1hZ2VzX19wYWdpbmF0aW9ue3BhZGRpbmc6MjBweH0uY2xvdWQtaW1hZ2VzX19wYWdpbmF0aW9uIGxpe2Rpc3BsYXk6aW5saW5lLWJsb2NrO21hcmdpbi1yaWdodDoxMHB4fS5jbG91ZC1pbWFnZXNfX3BhZ2luYXRpb24gbGkgYXtjb2xvcjojZmZmO2JhY2tncm91bmQtY29sb3I6IzVlNjc3Njtib3JkZXItcmFkaXVzOjIwcHg7dGV4dC1kZWNvcmF0aW9uOm5vbmU7ZGlzcGxheTpibG9jaztmb250LXdlaWdodDoyMDA7aGVpZ2h0OjM1cHg7d2lkdGg6MzVweDtsaW5lLWhlaWdodDozNXB4O3RleHQtYWxpZ246Y2VudGVyfS5jbG91ZC1pbWFnZXNfX3BhZ2luYXRpb24gbGkuYWN0aXZlIGF7YmFja2dyb3VuZC1jb2xvcjojMmYzODQ5fS5jbG91ZC1pbWFnZXNfX2l0ZW17d2lkdGg6MTU1cHg7aGVpZ2h0OjE3MHB4O2JvcmRlcjoxcHggc29saWQgI2VlZTtiYWNrZ3JvdW5kLWNvbG9yOiNmZmY7Ym9yZGVyLXJhZGl1czozcHg7bWFyZ2luOjAgMTVweCAxNXB4IDA7dGV4dC1hbGlnbjpjZW50ZXI7cG9zaXRpb246cmVsYXRpdmU7Y3Vyc29yOnBvaW50ZXJ9LmNsb3VkLWltYWdlc19faXRlbSAuY2xvdWQtaW1hZ2VzX19pdGVtX190eXBle2hlaWdodDoxMTVweDtmb250LXNpemU6OTBweDtsaW5lLWhlaWdodDoxNDBweDtib3JkZXItdG9wLWxlZnQtcmFkaXVzOjNweDtib3JkZXItdG9wLXJpZ2h0LXJhZGl1czozcHg7Y29sb3I6I2EyYTJhMjtiYWNrZ3JvdW5kLWNvbG9yOiNlOWVhZWJ9LmNsb3VkLWltYWdlc19faXRlbSAuY2xvdWQtaW1hZ2VzX19pdGVtX190eXBlPmltZ3t3aWR0aDphdXRvO2hlaWdodDphdXRvO21heC13aWR0aDoxMDAlO21heC1oZWlnaHQ6MTAwJX0uY2xvdWQtaW1hZ2VzX19pdGVtIC5jbG91ZC1pbWFnZXNfX2l0ZW1fX2RldGFpbHN7cGFkZGluZzoxMHB4IDB9LmNsb3VkLWltYWdlc19faXRlbSAuY2xvdWQtaW1hZ2VzX19pdGVtX19kZXRhaWxzIC5jbG91ZC1pbWFnZXNfX2l0ZW1fX2RldGFpbHNfX25hbWV7Zm9udC1zaXplOjEycHg7b3V0bGluZTpub25lO3BhZGRpbmc6MCAxMHB4O2NvbG9yOiNhNWFiYjU7Ym9yZGVyOm5vbmU7d2lkdGg6MTAwJTtiYWNrZ3JvdW5kLWNvbG9yOnRyYW5zcGFyZW50O2hlaWdodDoxNXB4O2Rpc3BsYXk6aW5saW5lLWJsb2NrO3dvcmQtYnJlYWs6YnJlYWstYWxsfS5jbG91ZC1pbWFnZXNfX2l0ZW0gLmNsb3VkLWltYWdlc19faXRlbV9fZGV0YWlscyAuY2xvdWQtaW1hZ2VzX19pdGVtX19kZXRhaWxzX19kYXRle2ZvbnQtc2l6ZToxMHB4O2JvdHRvbTo2cHg7d2lkdGg6MTU1cHg7aGVpZ2h0OjE1cHg7Y29sb3I6I2E1YWJiNTtkaXNwbGF5OmlubGluZS1ibG9ja30uY2xvdWQtaW1hZ2VzX19pdGVtIC5jbG91ZC1pbWFnZXNfX2l0ZW1fX2FjdGlvbnN7ZGlzcGxheTpmbGV4O2FsaWduLWl0ZW1zOmNlbnRlcjtqdXN0aWZ5LWNvbnRlbnQ6Y2VudGVyO3Bvc2l0aW9uOmFic29sdXRlO3RvcDowO2xlZnQ6MDt3aWR0aDoxMDAlO2hlaWdodDoxMTVweDtiYWNrZ3JvdW5kLWNvbG9yOnJnYmEoNzgsODMsOTEsMC44Myk7b3BhY2l0eTowO3Zpc2liaWxpdHk6aGlkZGVuO2JvcmRlci10b3AtbGVmdC1yYWRpdXM6M3B4O2JvcmRlci10b3AtcmlnaHQtcmFkaXVzOjNweDt0ZXh0LWFsaWduOmNlbnRlcjt0cmFuc2l0aW9uOjAuM3Mgb3BhY2l0eX0uY2xvdWQtaW1hZ2VzX19pdGVtIC5jbG91ZC1pbWFnZXNfX2l0ZW1fX2FjdGlvbnMgYXtmb250LXNpemU6MTZweDtjb2xvcjojZmZmO3RleHQtZGVjb3JhdGlvbjpub25lfS5jbG91ZC1pbWFnZXNfX2l0ZW06aG92ZXIgLmNsb3VkLWltYWdlc19faXRlbSAuY2xvdWQtaW1hZ2VzX19pdGVtX19hY3Rpb25ze29wYWNpdHk6MTt2aXNpYmlsaXR5OnZpc2libGV9JyxcbiAgICBoZWFkID0gZG9jdW1lbnQuaGVhZCB8fCBkb2N1bWVudC5nZXRFbGVtZW50c0J5VGFnTmFtZSgnaGVhZCcpWzBdLFxuICAgIHN0eWxlID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudCgnc3R5bGUnKTtcbnN0eWxlLnR5cGUgPSAndGV4dC9jc3MnO1xuXG5pZiAoc3R5bGUuc3R5bGVTaGVldCkge1xuICBzdHlsZS5zdHlsZVNoZWV0LmNzc1RleHQgPSBjc3M7XG59IGVsc2Uge1xuICBzdHlsZS5hcHBlbmRDaGlsZChkb2N1bWVudC5jcmVhdGVUZXh0Tm9kZShjc3MpKTtcbn1cblxuaGVhZC5hcHBlbmRDaGlsZChzdHlsZSk7XG52YXIgbGluayA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoJ2xpbmsnKTtcbmxpbmsuaHJlZiA9ICdodHRwczovL2FjY2Vzcy1mb250cy5wdXJlcHJvZmlsZS5jb20vc3R5bGVzLmNzcyc7XG5saW5rLnJlbCA9ICdzdHlsZXNoZWV0JztcbmRvY3VtZW50LmdldEVsZW1lbnRzQnlUYWdOYW1lKCdoZWFkJylbMF0uYXBwZW5kQ2hpbGQobGluayk7XG5tb2R1bGUuZXhwb3J0cyA9IHBwYmE7IiwiXCJ1c2Ugc3RyaWN0XCI7XG5cbnZhciBscyA9IHdpbmRvdy5sb2NhbFN0b3JhZ2U7XG52YXIgYWNjb3VudEtleSA9IFwiX19fX2FjdGl2ZUFjY291bnRfX19fXCI7XG52YXIgQUNHID0ge1xuICBpbml0aWFsaXNlOiBmdW5jdGlvbiBpbml0aWFsaXNlKHRhYkFjY291bnQsIHZhbGlkYXRlLCBpbnZhbGlkYXRlKSB7XG4gICAgd2luZG93LmFkZEV2ZW50TGlzdGVuZXIoJ3N0b3JhZ2UnLCBmdW5jdGlvbiAoKSB7XG4gICAgICB2YXIgbmV3QWNjb3VudCA9IGxzLmdldEl0ZW0oYWNjb3VudEtleSk7XG5cbiAgICAgIGlmIChuZXdBY2NvdW50KSB7XG4gICAgICAgIGlmIChuZXdBY2NvdW50ICE9PSB0YWJBY2NvdW50KSB7XG4gICAgICAgICAgaW52YWxpZGF0ZSgpO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgIHZhbGlkYXRlKCk7XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICB9KTtcbiAgfSxcbiAgY2hhbmdlQWNjb3VudDogZnVuY3Rpb24gY2hhbmdlQWNjb3VudChuZXdBY2NvdW50KSB7XG4gICAgbHMuc2V0SXRlbShhY2NvdW50S2V5LCBuZXdBY2NvdW50KTtcbiAgfVxufTtcbm1vZHVsZS5leHBvcnRzID0gQUNHOyIsIlwidXNlIHN0cmljdFwiO1xuXG52YXIgU3RvcmUgPSByZXF1aXJlKCcuL3N0b3JlJyk7XG5cbnZhciBMb2dnZXIgPSByZXF1aXJlKCcuL2xvZ2dlcicpO1xuXG52YXIgRG9tID0gcmVxdWlyZSgnLi9kb20nKTtcblxudmFyIENhbGxlciA9IHJlcXVpcmUoJy4vY2FsbGVyJyk7XG5cbnZhciB1cGxvYWRpbmcgPSBmYWxzZTtcbnZhciBBdmF0YXJDdHJsID0ge1xuICBfc3VibWl0OiBudWxsLFxuICBfZmlsZTogbnVsbCxcbiAgX3Byb2dyZXNzOiBudWxsLFxuICBfc2lkZWJhcl9hdmF0YXI6IG51bGwsXG4gIF90b3BfYXZhdGFyOiBudWxsLFxuICBfdG9wX2F2YXRhcl9jb250YWluZXI6IG51bGwsXG4gIGluaXQ6IGZ1bmN0aW9uIGluaXQoKSB7XG4gICAgQXZhdGFyQ3RybC5fc3VibWl0ID0gZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoJ2JhYy0tLXB1cmVzZGstYXZhdGFyLXN1Ym1pdCcpO1xuICAgIEF2YXRhckN0cmwuX2ZpbGUgPSBkb2N1bWVudC5nZXRFbGVtZW50QnlJZCgnYmFjLS0tcHVyZXNkay1hdmF0YXItZmlsZScpO1xuICAgIEF2YXRhckN0cmwuX3RvcF9hdmF0YXJfY29udGFpbmVyID0gZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoJ2JhYy0taW1hZ2UtY29udGFpbmVyLXRvcCcpO1xuICAgIEF2YXRhckN0cmwuX3Byb2dyZXNzID0gZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoJ2JhYy0tdXNlci1pbWFnZS11cGxvYWQtcHJvZ3Jlc3MnKTtcbiAgICBBdmF0YXJDdHJsLl9zaWRlYmFyX2F2YXRhciA9IGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKCdiYWMtLXVzZXItaW1hZ2UtZmlsZScpO1xuICAgIEF2YXRhckN0cmwuX3RvcF9hdmF0YXIgPSBkb2N1bWVudC5nZXRFbGVtZW50QnlJZCgnYmFjLS11c2VyLWF2YXRhci10b3AnKTtcblxuICAgIEF2YXRhckN0cmwuX2ZpbGUuYWRkRXZlbnRMaXN0ZW5lcignY2xpY2snLCBmdW5jdGlvbiAoZSkge1xuICAgICAgZS5zdG9wUHJvcGFnYXRpb24oKTtcbiAgICB9KTtcblxuICAgIEF2YXRhckN0cmwuX2ZpbGUuYWRkRXZlbnRMaXN0ZW5lcignY2hhbmdlJywgZnVuY3Rpb24gKGUpIHtcbiAgICAgIEF2YXRhckN0cmwudXBsb2FkKCk7XG4gICAgfSk7XG5cbiAgICBkb2N1bWVudC5nZXRFbGVtZW50QnlJZCgnYmFjLS11c2VyLWltYWdlJykuYWRkRXZlbnRMaXN0ZW5lcignY2xpY2snLCBmdW5jdGlvbiAoZSkge1xuICAgICAgZS5zdG9wUHJvcGFnYXRpb24oKTtcblxuICAgICAgQXZhdGFyQ3RybC5fZmlsZS5jbGljaygpO1xuICAgIH0pO1xuICB9LFxuICB1cGxvYWQ6IGZ1bmN0aW9uIHVwbG9hZCgpIHtcbiAgICBpZiAodXBsb2FkaW5nKSB7XG4gICAgICByZXR1cm47XG4gICAgfVxuXG4gICAgdXBsb2FkaW5nID0gdHJ1ZTtcblxuICAgIGlmIChBdmF0YXJDdHJsLl9maWxlLmZpbGVzLmxlbmd0aCA9PT0gMCkge1xuICAgICAgcmV0dXJuO1xuICAgIH1cblxuICAgIHZhciBkYXRhID0gbmV3IEZvcm1EYXRhKCk7XG4gICAgZGF0YS5hcHBlbmQoJ2ZpbGUnLCBBdmF0YXJDdHJsLl9maWxlLmZpbGVzWzBdKTtcblxuICAgIHZhciBzdWNjZXNzQ2FsbGJhY2sgPSBmdW5jdGlvbiBzdWNjZXNzQ2FsbGJhY2soZGF0YSkge1xuICAgICAgO1xuICAgIH07XG5cbiAgICB2YXIgZmFpbENhbGxiYWNrID0gZnVuY3Rpb24gZmFpbENhbGxiYWNrKGRhdGEpIHtcbiAgICAgIDtcbiAgICB9O1xuXG4gICAgdmFyIHJlcXVlc3QgPSBuZXcgWE1MSHR0cFJlcXVlc3QoKTtcblxuICAgIHJlcXVlc3Qub25yZWFkeXN0YXRlY2hhbmdlID0gZnVuY3Rpb24gKCkge1xuICAgICAgdXBsb2FkaW5nID0gZmFsc2U7XG5cbiAgICAgIGlmIChyZXF1ZXN0LnJlYWR5U3RhdGUgPT0gNCkge1xuICAgICAgICB0cnkge1xuICAgICAgICAgIHZhciBpbWFnZURhdGEgPSBKU09OLnBhcnNlKHJlcXVlc3QucmVzcG9uc2UpLmRhdGE7XG4gICAgICAgICAgQXZhdGFyQ3RybC5zZXRBdmF0YXIoaW1hZ2VEYXRhLnVybCk7XG4gICAgICAgICAgQ2FsbGVyLm1ha2VDYWxsKHtcbiAgICAgICAgICAgIHR5cGU6ICdQVVQnLFxuICAgICAgICAgICAgZW5kcG9pbnQ6IFN0b3JlLmdldEF2YXRhclVwZGF0ZVVybCgpLFxuICAgICAgICAgICAgcGFyYW1zOiB7XG4gICAgICAgICAgICAgIHVzZXI6IHtcbiAgICAgICAgICAgICAgICBhdmF0YXJfdXVpZDogaW1hZ2VEYXRhLmd1aWRcbiAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIGNhbGxiYWNrczoge1xuICAgICAgICAgICAgICBzdWNjZXNzOiBzdWNjZXNzQ2FsbGJhY2ssXG4gICAgICAgICAgICAgIGZhaWw6IGZhaWxDYWxsYmFja1xuICAgICAgICAgICAgfVxuICAgICAgICAgIH0pO1xuICAgICAgICB9IGNhdGNoIChlKSB7XG4gICAgICAgICAgdmFyIHJlc3AgPSB7XG4gICAgICAgICAgICBzdGF0dXM6ICdlcnJvcicsXG4gICAgICAgICAgICBkYXRhOiAnVW5rbm93biBlcnJvciBvY2N1cnJlZDogWycgKyByZXF1ZXN0LnJlc3BvbnNlVGV4dCArICddJ1xuICAgICAgICAgIH07XG4gICAgICAgIH1cblxuICAgICAgICBMb2dnZXIubG9nKHJlcXVlc3QucmVzcG9uc2Uuc3RhdHVzICsgJzogJyArIHJlcXVlc3QucmVzcG9uc2UuZGF0YSk7XG4gICAgICB9XG4gICAgfTsgLy8gcmVxdWVzdC51cGxvYWQuYWRkRXZlbnRMaXN0ZW5lcigncHJvZ3Jlc3MnLCBmdW5jdGlvbihlKXtcbiAgICAvLyBcdExvZ2dlci5sb2coZS5sb2FkZWQvZS50b3RhbCk7XG4gICAgLy8gXHRBdmF0YXJDdHJsLl9wcm9ncmVzcy5zdHlsZS50b3AgPSAxMDAgLSAoZS5sb2FkZWQvZS50b3RhbCkgKiAxMDAgKyAnJSc7XG4gICAgLy8gfSwgZmFsc2UpO1xuXG5cbiAgICB2YXIgdXJsID0gU3RvcmUuZ2V0QXZhdGFyVXBsb2FkVXJsKCk7XG4gICAgRG9tLmFkZENsYXNzKEF2YXRhckN0cmwuX3Byb2dyZXNzLCAnYmFjLS1wdXJlc2RrLXZpc2libGUnKTtcbiAgICByZXF1ZXN0Lm9wZW4oJ1BPU1QnLCB1cmwpO1xuICAgIHJlcXVlc3Quc2VuZChkYXRhKTtcbiAgfSxcbiAgc2V0QXZhdGFyOiBmdW5jdGlvbiBzZXRBdmF0YXIodXJsKSB7XG4gICAgaWYgKCF1cmwpIHtcbiAgICAgIHJldHVybjtcbiAgICB9XG5cbiAgICBEb20ucmVtb3ZlQ2xhc3MoQXZhdGFyQ3RybC5fcHJvZ3Jlc3MsICdiYWMtLXB1cmVzZGstdmlzaWJsZScpO1xuICAgIERvbS5hZGRDbGFzcyhBdmF0YXJDdHJsLl9zaWRlYmFyX2F2YXRhciwgJ2JhYy0tcHVyZXNkay12aXNpYmxlJyk7XG4gICAgdmFyIGltZyA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoJ2ltZycpO1xuICAgIGltZy5zcmMgPSB1cmw7XG4gICAgQXZhdGFyQ3RybC5fc2lkZWJhcl9hdmF0YXIuaW5uZXJIVE1MID0gJyc7XG5cbiAgICBBdmF0YXJDdHJsLl9zaWRlYmFyX2F2YXRhci5hcHBlbmRDaGlsZChpbWcpO1xuXG4gICAgRG9tLmFkZENsYXNzKEF2YXRhckN0cmwuX3RvcF9hdmF0YXJfY29udGFpbmVyLCAnYmFjLS1wdXJlc2RrLXZpc2libGUnKTtcbiAgICB2YXIgaW1nXzIgPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KCdpbWcnKTtcbiAgICBpbWdfMi5zcmMgPSB1cmw7XG4gICAgQXZhdGFyQ3RybC5fdG9wX2F2YXRhcl9jb250YWluZXIuaW5uZXJIVE1MID0gJyc7XG5cbiAgICBBdmF0YXJDdHJsLl90b3BfYXZhdGFyX2NvbnRhaW5lci5hcHBlbmRDaGlsZChpbWdfMik7IC8vICBiYWMtLWltYWdlLWNvbnRhaW5lci10b3BcblxuICB9XG59O1xubW9kdWxlLmV4cG9ydHMgPSBBdmF0YXJDdHJsOyIsIlwidXNlIHN0cmljdFwiO1xuXG52YXIgU3RvcmUgPSByZXF1aXJlKCcuL3N0b3JlLmpzJyk7XG5cbnZhciBMb2dnZXIgPSByZXF1aXJlKCcuL2xvZ2dlcicpO1xuXG52YXIgcGFyYW1zVG9HZXRWYXJzID0gZnVuY3Rpb24gcGFyYW1zVG9HZXRWYXJzKHBhcmFtcykge1xuICB2YXIgdG9SZXR1cm4gPSBbXTtcblxuICBmb3IgKHZhciBwcm9wZXJ0eSBpbiBwYXJhbXMpIHtcbiAgICBpZiAocGFyYW1zLmhhc093blByb3BlcnR5KHByb3BlcnR5KSkge1xuICAgICAgdG9SZXR1cm4ucHVzaChwcm9wZXJ0eSArICc9JyArIHBhcmFtc1twcm9wZXJ0eV0pO1xuICAgIH1cbiAgfVxuXG4gIHJldHVybiB0b1JldHVybi5qb2luKCcmJyk7XG59O1xuXG52YXIgZGV2S2V5cyA9IG51bGw7XG52YXIgQ2FsbGVyID0ge1xuICAvKlxuICBpZiB0aGUgdXNlciBzZXRzXG4gICAqL1xuICBzZXREZXZLZXlzOiBmdW5jdGlvbiBzZXREZXZLZXlzKGtleXMpIHtcbiAgICBkZXZLZXlzID0ga2V5cztcbiAgfSxcblxuICAvKlxuICBleHBlY3RlIGF0dHJpYnV0ZXM6XG4gIC0gdHlwZSAoZWl0aGVyIEdFVCwgUE9TVCwgREVMRVRFLCBQVVQpXG4gIC0gZW5kcG9pbnRcbiAgLSBwYXJhbXMgKGlmIGFueS4gQSBqc29uIHdpdGggcGFyYW1ldGVycyB0byBiZSBwYXNzZWQgYmFjayB0byB0aGUgZW5kcG9pbnQpXG4gIC0gY2FsbGJhY2tzOiBhbiBvYmplY3Qgd2l0aDpcbiAgXHQtIHN1Y2Nlc3M6IHRoZSBzdWNjZXNzIGNhbGxiYWNrXG4gIFx0LSBmYWlsOiB0aGUgZmFpbCBjYWxsYmFja1xuICAgKi9cbiAgbWFrZUNhbGw6IGZ1bmN0aW9uIG1ha2VDYWxsKGF0dHJzKSB7XG4gICAgdmFyIGVuZHBvaW50VXJsID0gYXR0cnMuZW5kcG9pbnQ7XG4gICAgdmFyIHhociA9IG5ldyBYTUxIdHRwUmVxdWVzdCgpO1xuXG4gICAgaWYgKGF0dHJzLnR5cGUgPT09ICdHRVQnICYmIGF0dHJzLnBhcmFtcykge1xuICAgICAgZW5kcG9pbnRVcmwgPSBlbmRwb2ludFVybCArIFwiP1wiICsgcGFyYW1zVG9HZXRWYXJzKGF0dHJzLnBhcmFtcyk7XG4gICAgfVxuXG4gICAgeGhyLm9wZW4oYXR0cnMudHlwZSwgZW5kcG9pbnRVcmwpO1xuXG4gICAgaWYgKGRldktleXMgIT0gbnVsbCkge1xuICAgICAgeGhyLnNldFJlcXVlc3RIZWFkZXIoJ3gtcHAtc2VjcmV0JywgZGV2S2V5cy5zZWNyZXQpO1xuICAgICAgeGhyLnNldFJlcXVlc3RIZWFkZXIoJ3gtcHAta2V5JywgZGV2S2V5cy5rZXkpO1xuICAgIH1cblxuICAgIHhoci53aXRoQ3JlZGVudGlhbHMgPSB0cnVlO1xuICAgIHhoci5zZXRSZXF1ZXN0SGVhZGVyKCdDb250ZW50LVR5cGUnLCAnYXBwbGljYXRpb24vanNvbicpO1xuXG4gICAgeGhyLm9ubG9hZCA9IGZ1bmN0aW9uICgpIHtcbiAgICAgIGlmICh4aHIuc3RhdHVzID49IDIwMCAmJiB4aHIuc3RhdHVzIDwgMzAwKSB7XG4gICAgICAgIGF0dHJzLmNhbGxiYWNrcy5zdWNjZXNzKEpTT04ucGFyc2UoeGhyLnJlc3BvbnNlVGV4dCkpO1xuICAgICAgfSBlbHNlIGlmICh4aHIuc3RhdHVzICE9PSAyMDApIHtcbiAgICAgICAgYXR0cnMuY2FsbGJhY2tzLmZhaWwoSlNPTi5wYXJzZSh4aHIucmVzcG9uc2VUZXh0KSk7XG4gICAgICB9XG4gICAgfTtcblxuICAgIGlmICghYXR0cnMucGFyYW1zKSB7XG4gICAgICBhdHRycy5wYXJhbXMgPSB7fTtcbiAgICB9XG5cbiAgICB4aHIuc2VuZChKU09OLnN0cmluZ2lmeShhdHRycy5wYXJhbXMpKTtcbiAgfSxcbiAgcHJvbWlzZUNhbGw6IGZ1bmN0aW9uIHByb21pc2VDYWxsKGF0dHJzKSB7XG4gICAgcmV0dXJuIG5ldyBQcm9taXNlKGZ1bmN0aW9uIChyZXNvbHZlLCByZWplY3QpIHtcbiAgICAgIHZhciB4aHIgPSBuZXcgWE1MSHR0cFJlcXVlc3QoKTtcblxuICAgICAgaWYgKGF0dHJzLnR5cGUgPT09ICdHRVQnICYmIGF0dHJzLnBhcmFtcykge1xuICAgICAgICBlbmRwb2ludFVybCA9IGVuZHBvaW50VXJsICsgXCI/XCIgKyBwYXJhbXNUb0dldFZhcnMoYXR0cnMucGFyYW1zKTtcbiAgICAgIH1cblxuICAgICAgeGhyLm9wZW4oYXR0cnMudHlwZSwgYXR0cnMuZW5kcG9pbnQpO1xuICAgICAgeGhyLndpdGhDcmVkZW50aWFscyA9IHRydWU7XG5cbiAgICAgIGlmIChkZXZLZXlzICE9IG51bGwpIHtcbiAgICAgICAgeGhyLnNldFJlcXVlc3RIZWFkZXIoJ3gtcHAtc2VjcmV0JywgZGV2S2V5cy5zZWNyZXQpO1xuICAgICAgICB4aHIuc2V0UmVxdWVzdEhlYWRlcigneC1wcC1rZXknLCBkZXZLZXlzLmtleSk7XG4gICAgICB9XG5cbiAgICAgIHhoci5zZXRSZXF1ZXN0SGVhZGVyKCdDb250ZW50LVR5cGUnLCAnYXBwbGljYXRpb24vanNvbicpO1xuXG4gICAgICB4aHIub25sb2FkID0gZnVuY3Rpb24gKCkge1xuICAgICAgICBpZiAodGhpcy5zdGF0dXMgPj0gMjAwICYmIHRoaXMuc3RhdHVzIDwgMzAwKSB7XG4gICAgICAgICAgYXR0cnMubWlkZGxld2FyZXMuc3VjY2VzcyhKU09OLnBhcnNlKHhoci5yZXNwb25zZVRleHQpKTtcbiAgICAgICAgICByZXNvbHZlKEpTT04ucGFyc2UoeGhyLnJlc3BvbnNlVGV4dCkpO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgIHdpbmRvdy5sb2NhdGlvbi5ocmVmID0gU3RvcmUuZ2V0TG9naW5VcmwoKTtcbiAgICAgICAgfVxuICAgICAgfTtcblxuICAgICAgeGhyLm9uZXJyb3IgPSBmdW5jdGlvbiAoKSB7XG4gICAgICAgIHdpbmRvdy5sb2NhdGlvbiA9IFN0b3JlLmdldExvZ2luVXJsKCk7XG4gICAgICB9O1xuXG4gICAgICB4aHIuc2VuZCgpO1xuICAgIH0pO1xuICB9XG59O1xubW9kdWxlLmV4cG9ydHMgPSBDYWxsZXI7IiwiXCJ1c2Ugc3RyaWN0XCI7XG5cbnZhciBkZWJvdW5jZWRUaW1lb3V0ID0gbnVsbDtcbnZhciBjdXJyZW50UXVlcnkgPSAnJztcbnZhciBsaW1pdCA9IDg7XG52YXIgbGF0ZW5jeSA9IDUwMDtcbnZhciBpbml0T3B0aW9ucztcbnZhciBjdXJyZW50UGFnZSA9IDE7XG52YXIgbWV0YURhdGEgPSBudWxsO1xudmFyIGl0ZW1zID0gW107XG52YXIgcGFnaW5hdGlvbkRhdGEgPSBudWxsO1xuXG52YXIgUGFnaW5hdGlvbkhlbHBlciA9IHJlcXVpcmUoJy4vcGFnaW5hdGlvbi1oZWxwZXInKTtcblxudmFyIENhbGxlciA9IHJlcXVpcmUoJy4vY2FsbGVyJyk7XG5cbnZhciBTdG9yZSA9IHJlcXVpcmUoJy4vc3RvcmUnKTtcblxudmFyIERvbSA9IHJlcXVpcmUoJy4vZG9tJyk7XG5cbnZhciBDbG91ZGluYXJ5UGlja2VyID0ge1xuICBpbml0aWFsaXNlOiBmdW5jdGlvbiBpbml0aWFsaXNlKCkge1xuICAgIGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKCdiYWMtLWNsb3VkaW5hcnktLWNsb3NlYnRuJykub25jbGljayA9IGZ1bmN0aW9uIChlKSB7XG4gICAgICBDbG91ZGluYXJ5UGlja2VyLmNsb3NlTW9kYWwoKTtcbiAgICB9O1xuXG4gICAgZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoJ2JhYy0tY2xvdWRpbmFyeS0tc2VhcmNoLWlucHV0Jykub25rZXl1cCA9IGZ1bmN0aW9uIChlKSB7XG4gICAgICBDbG91ZGluYXJ5UGlja2VyLmhhbmRsZVNlYXJjaChlKTtcbiAgICB9O1xuXG4gICAgZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoJ2JhYy0tY2xvdWRpbmFyeS0tZ28tYmFjaycpLm9uY2xpY2sgPSBmdW5jdGlvbiAoZSkge1xuICAgICAgQ2xvdWRpbmFyeVBpY2tlci5nb0JhY2soKTtcbiAgICB9O1xuICB9LFxuXG4gIC8qXG4gIG9wdGlvbnM6IHtcbiAgXHRvblNlbGVjdDogaXQgZXhwZWN0cyBhIGZ1bmN0aW9uLiBUaGlzIGZ1bmN0aW9uIHdpbGwgYmUgaW52b2tlZCBleGFjdGx5IGF0IHRoZSBtb21lbnQgdGhlIHVzZXIgcGlja3NcbiAgXHRcdGEgZmlsZSBmcm9tIGNsb3VkaW5hcnkuIFRoZSBmdW5jdGlvbiB3aWxsIHRha2UganVzdCBvbmUgcGFyYW0gd2hpY2ggaXMgdGhlIHNlbGVjdGVkIGl0ZW0gb2JqZWN0XG4gICAgY2xvc2VPbkVzYzogdHJ1ZSAvIGZhbHNlXG4gIH1cbiAgICovXG4gIG9wZW5Nb2RhbDogZnVuY3Rpb24gb3Blbk1vZGFsKG9wdGlvbnMpIHtcbiAgICBDbG91ZGluYXJ5UGlja2VyLmluaXRpYWxpc2UoKTtcbiAgICBpbml0T3B0aW9ucyA9IG9wdGlvbnM7XG4gICAgRG9tLmFkZENsYXNzKGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKCdiYWMtLWNsb3VkaW5hcnktLW1vZGFsJyksICdpcy1vcGVuJyk7XG4gICAgQ2xvdWRpbmFyeVBpY2tlci5nZXRJbWFnZXMoe1xuICAgICAgcGFnZTogMSxcbiAgICAgIGxpbWl0OiBsaW1pdFxuICAgIH0pO1xuICB9LFxuICBjbG9zZU1vZGFsOiBmdW5jdGlvbiBjbG9zZU1vZGFsKCkge1xuICAgIERvbS5yZW1vdmVDbGFzcyhkb2N1bWVudC5nZXRFbGVtZW50QnlJZCgnYmFjLS1jbG91ZGluYXJ5LS1tb2RhbCcpLCAnaXMtb3BlbicpO1xuICB9LFxuICBnZXRJbWFnZXM6IGZ1bmN0aW9uIGdldEltYWdlcyhvcHRpb25zKSB7XG4gICAgLy8gVE9ETyBtYWtlIHRoZSBjYWxsIGFuZCBnZXQgdGhlIGltYWdlc1xuICAgIENhbGxlci5tYWtlQ2FsbCh7XG4gICAgICB0eXBlOiAnR0VUJyxcbiAgICAgIGVuZHBvaW50OiBTdG9yZS5nZXRDbG91ZGluYXJ5RW5kcG9pbnQoKSxcbiAgICAgIHBhcmFtczogb3B0aW9ucyxcbiAgICAgIGNhbGxiYWNrczoge1xuICAgICAgICBzdWNjZXNzOiBmdW5jdGlvbiBzdWNjZXNzKHJlc3VsdCkge1xuICAgICAgICAgIENsb3VkaW5hcnlQaWNrZXIub25JbWFnZXNSZXNwb25zZShyZXN1bHQpO1xuICAgICAgICB9LFxuICAgICAgICBmYWlsOiBmdW5jdGlvbiBmYWlsKGVycikge1xuICAgICAgICAgIGFsZXJ0KGVycik7XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICB9KTtcbiAgfSxcbiAgaGFuZGxlU2VhcmNoOiBmdW5jdGlvbiBoYW5kbGVTZWFyY2goZSkge1xuICAgIGlmIChkZWJvdW5jZWRUaW1lb3V0KSB7XG4gICAgICBjbGVhclRpbWVvdXQoZGVib3VuY2VkVGltZW91dCk7XG4gICAgfVxuXG4gICAgaWYgKGUudGFyZ2V0LnZhbHVlID09PSBjdXJyZW50UXVlcnkpIHtcbiAgICAgIHJldHVybjtcbiAgICB9XG5cbiAgICB2YXIgcXVlcnkgPSBlLnRhcmdldC52YWx1ZTtcbiAgICBjdXJyZW50UXVlcnkgPSBxdWVyeTtcbiAgICB2YXIgb3B0aW9ucyA9IHtcbiAgICAgIHBhZ2U6IDEsXG4gICAgICBsaW1pdDogbGltaXQsXG4gICAgICBxdWVyeTogcXVlcnlcbiAgICB9O1xuICAgIGRlYm91bmNlZFRpbWVvdXQgPSBzZXRUaW1lb3V0KGZ1bmN0aW9uICgpIHtcbiAgICAgIENsb3VkaW5hcnlQaWNrZXIuZ2V0SW1hZ2VzKG9wdGlvbnMpO1xuICAgIH0sIGxhdGVuY3kpO1xuICB9LFxuICBpdGVtU2VsZWN0ZWQ6IGZ1bmN0aW9uIGl0ZW1TZWxlY3RlZChpdGVtLCBlKSB7XG4gICAgaWYgKGl0ZW0udHlwZSA9PSAnZm9sZGVyJykge1xuICAgICAgdmFyIHBhcmFtcyA9IHtcbiAgICAgICAgcGFnZTogMSxcbiAgICAgICAgbGltaXQ6IGxpbWl0LFxuICAgICAgICBwYXJlbnQ6IGl0ZW0uaWRcbiAgICAgIH07IC8vIFRPRE8gc2V0IHNlYXJjaCBpbnB1dCdzIHZhbHVlID0gJydcblxuICAgICAgY3VycmVudFF1ZXJ5ID0gJyc7XG4gICAgICBDbG91ZGluYXJ5UGlja2VyLmdldEltYWdlcyhwYXJhbXMpO1xuICAgIH0gZWxzZSB7XG4gICAgICBpbml0T3B0aW9ucy5vblNlbGVjdChpdGVtKTtcbiAgICAgIENsb3VkaW5hcnlQaWNrZXIuY2xvc2VNb2RhbCgpO1xuICAgIH1cbiAgfSxcbiAgb25JbWFnZXNSZXNwb25zZTogZnVuY3Rpb24gb25JbWFnZXNSZXNwb25zZShkYXRhKSB7XG4gICAgcGFnaW5hdGlvbkRhdGEgPSBQYWdpbmF0aW9uSGVscGVyLmdldFBhZ2VzUmFuZ2UoY3VycmVudFBhZ2UsIE1hdGguY2VpbChkYXRhLm1ldGEudG90YWwgLyBsaW1pdCkpO1xuICAgIG1ldGFEYXRhID0gZGF0YS5tZXRhO1xuICAgIGl0ZW1zID0gZGF0YS5hc3NldHM7XG4gICAgQ2xvdWRpbmFyeVBpY2tlci5yZW5kZXIoKTtcbiAgfSxcbiAgcmVuZGVyUGFnaW5hdGlvbkJ1dHRvbnM6IGZ1bmN0aW9uIHJlbmRlclBhZ2luYXRpb25CdXR0b25zKCkge1xuICAgIHZhciB0b1JldHVybiA9IFtdO1xuXG4gICAgdmFyIGNyZWF0ZVBhZ2luYXRpb25FbGVtZW50ID0gZnVuY3Rpb24gY3JlYXRlUGFnaW5hdGlvbkVsZW1lbnQoYUNsYXNzTmFtZSwgYUZ1bmN0aW9uLCBzcGFuQ2xhc3NOYW1lLCBzcGFuQ29udGVudCkge1xuICAgICAgdmFyIGxpID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudCgnbGknKTtcbiAgICAgIHZhciBhID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudCgnYScpO1xuICAgICAgbGkuY2xhc3NOYW1lID0gYUNsYXNzTmFtZTtcbiAgICAgIGEub25jbGljayA9IGFGdW5jdGlvbjtcbiAgICAgIHZhciBzcGFuID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudCgnc3BhbicpO1xuICAgICAgc3Bhbi5jbGFzc05hbWUgPSBzcGFuQ2xhc3NOYW1lO1xuXG4gICAgICBpZiAoc3BhbkNvbnRlbnQpIHtcbiAgICAgICAgc3Bhbi5pbm5lckhUTUwgPSBzcGFuQ29udGVudDtcbiAgICAgIH1cblxuICAgICAgYS5hcHBlbmRDaGlsZChzcGFuKTtcbiAgICAgIGxpLmFwcGVuZENoaWxkKGEpO1xuICAgICAgcmV0dXJuIGxpO1xuICAgIH07XG5cbiAgICBpZiAocGFnaW5hdGlvbkRhdGEuaGFzUHJldmlvdXMpIHtcbiAgICAgIHRvUmV0dXJuLnB1c2goY3JlYXRlUGFnaW5hdGlvbkVsZW1lbnQoJ2Rpc2FibGVkJywgZnVuY3Rpb24gKGUpIHtcbiAgICAgICAgZS5wcmV2ZW50RGVmYXVsdCgpO1xuXG4gICAgICAgIENsb3VkaW5hcnlQaWNrZXIuX2dvVG9QYWdlKDEpO1xuICAgICAgfSwgJ2ZhIGZhLWFuZ2xlLWRvdWJsZS1sZWZ0JykpO1xuICAgICAgdG9SZXR1cm4ucHVzaChjcmVhdGVQYWdpbmF0aW9uRWxlbWVudCgnZGlzYWJsZWQnLCBmdW5jdGlvbiAoZSkge1xuICAgICAgICBlLnByZXZlbnREZWZhdWx0KCk7XG5cbiAgICAgICAgQ2xvdWRpbmFyeVBpY2tlci5fZ29Ub1BhZ2UoY3VycmVudFBhZ2UgLSAxKTtcbiAgICAgIH0sICdmYSBmYS1hbmdsZS1sZWZ0JykpO1xuICAgIH1cblxuICAgIGZvciAodmFyIGkgPSAwOyBpIDwgcGFnaW5hdGlvbkRhdGEuYnV0dG9ucy5sZW5ndGg7IGkrKykge1xuICAgICAgKGZ1bmN0aW9uIChpKSB7XG4gICAgICAgIHZhciBidG4gPSBwYWdpbmF0aW9uRGF0YS5idXR0b25zW2ldO1xuICAgICAgICB0b1JldHVybi5wdXNoKGNyZWF0ZVBhZ2luYXRpb25FbGVtZW50KGJ0bi5ydW5uaW5ncGFnZSA/IFwiYWN0aXZlXCIgOiBcIi1cIiwgZnVuY3Rpb24gKGUpIHtcbiAgICAgICAgICBlLnByZXZlbnREZWZhdWx0KCk7XG5cbiAgICAgICAgICBDbG91ZGluYXJ5UGlja2VyLl9nb1RvUGFnZShidG4ucGFnZW5vKTtcbiAgICAgICAgfSwgJ251bWJlcicsIGJ0bi5wYWdlbm8pKTtcbiAgICAgIH0pKGkpO1xuICAgIH1cblxuICAgIGlmIChwYWdpbmF0aW9uRGF0YS5oYXNOZXh0KSB7XG4gICAgICB0b1JldHVybi5wdXNoKGNyZWF0ZVBhZ2luYXRpb25FbGVtZW50KCdkaXNhYmxlZCcsIGZ1bmN0aW9uIChlKSB7XG4gICAgICAgIGUucHJldmVudERlZmF1bHQoKTtcblxuICAgICAgICBDbG91ZGluYXJ5UGlja2VyLl9nb1RvUGFnZShjdXJyZW50UGFnZSArIDEpO1xuICAgICAgfSwgJ2ZhIGZhLWFuZ2xlLXJpZ2h0JykpO1xuICAgICAgdG9SZXR1cm4ucHVzaChjcmVhdGVQYWdpbmF0aW9uRWxlbWVudCgnZGlzYWJsZWQnLCBmdW5jdGlvbiAoZSkge1xuICAgICAgICBlLnByZXZlbnREZWZhdWx0KCk7XG5cbiAgICAgICAgQ2xvdWRpbmFyeVBpY2tlci5fZ29Ub1BhZ2UoTWF0aC5jZWlsKG1ldGFEYXRhLnRvdGFsIC8gbGltaXQpKTtcbiAgICAgIH0sICdmYSBmYS1hbmdsZS1kb3VibGUtcmlnaHQnKSk7XG4gICAgfVxuXG4gICAgZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoJ2JhYy0tY2xvdWRpbmFyeS1hY3R1YWwtcGFnaW5hdGlvbi1jb250YWluZXInKS5pbm5lckhUTUwgPSAnJztcblxuICAgIGZvciAodmFyIF9pID0gMDsgX2kgPCB0b1JldHVybi5sZW5ndGg7IF9pKyspIHtcbiAgICAgIGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKCdiYWMtLWNsb3VkaW5hcnktYWN0dWFsLXBhZ2luYXRpb24tY29udGFpbmVyJykuYXBwZW5kQ2hpbGQodG9SZXR1cm5bX2ldKTtcbiAgICB9XG4gIH0sXG4gIF9nb1RvUGFnZTogZnVuY3Rpb24gX2dvVG9QYWdlKHBhZ2UpIHtcbiAgICBpZiAocGFnZSA9PT0gY3VycmVudFBhZ2UpIHtcbiAgICAgIHJldHVybjtcbiAgICB9XG5cbiAgICB2YXIgcGFyYW1zID0ge1xuICAgICAgcGFnZTogcGFnZSxcbiAgICAgIGxpbWl0OiBsaW1pdFxuICAgIH07XG5cbiAgICBpZiAobWV0YURhdGEuYXNzZXQpIHtcbiAgICAgIHBhcmFtcy5wYXJlbnQgPSBtZXRhRGF0YS5hc3NldDtcbiAgICB9XG5cbiAgICBpZiAoY3VycmVudFF1ZXJ5KSB7XG4gICAgICBwYXJhbXMucXVlcnkgPSBjdXJyZW50UXVlcnk7XG4gICAgfVxuXG4gICAgY3VycmVudFBhZ2UgPSBwYWdlO1xuICAgIENsb3VkaW5hcnlQaWNrZXIuZ2V0SW1hZ2VzKHBhcmFtcyk7XG4gIH0sXG4gIGdvQmFjazogZnVuY3Rpb24gZ29CYWNrKCkge1xuICAgIHZhciBwYXJhbXMgPSB7XG4gICAgICBwYWdlOiAxLFxuICAgICAgbGltaXQ6IGxpbWl0XG4gICAgfTtcblxuICAgIGlmIChtZXRhRGF0YS5wYXJlbnQpIHtcbiAgICAgIHBhcmFtcy5wYXJlbnQgPSBtZXRhRGF0YS5wYXJlbnQ7XG4gICAgfVxuXG4gICAgaWYgKGN1cnJlbnRRdWVyeSkge1xuICAgICAgcGFyYW1zLnF1ZXJ5ID0gY3VycmVudFF1ZXJ5O1xuICAgIH1cblxuICAgIENsb3VkaW5hcnlQaWNrZXIuZ2V0SW1hZ2VzKHBhcmFtcyk7XG4gIH0sXG4gIHJlbmRlckl0ZW1zOiBmdW5jdGlvbiByZW5kZXJJdGVtcygpIHtcbiAgICB2YXIgb25lSXRlbSA9IGZ1bmN0aW9uIG9uZUl0ZW0oaXRlbSkge1xuICAgICAgdmFyIGl0ZW1JY29uID0gZnVuY3Rpb24gaXRlbUljb24oKSB7XG4gICAgICAgIGlmIChpdGVtLnR5cGUgIT0gJ2ZvbGRlcicpIHtcbiAgICAgICAgICByZXR1cm4gXCI8aW1nIHNyYz1cIi5jb25jYXQoaXRlbS50aHVtYiwgXCIgYWx0PVxcXCJcXFwiLz5cIik7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgcmV0dXJuIFwiPGkgY2xhc3M9XFxcImZhIGZhLWZvbGRlci1vXFxcIj48L2k+XCI7XG4gICAgICAgIH1cbiAgICAgIH07XG5cbiAgICAgIHZhciBmdW5jdCA9IGZ1bmN0aW9uIGZ1bmN0KCkge1xuICAgICAgICBDbG91ZGluYXJ5UGlja2VyLml0ZW1TZWxlY3RlZChpdGVtKTtcbiAgICAgIH07XG5cbiAgICAgIHZhciBuZXdEb21FbCA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoJ2RpdicpO1xuICAgICAgbmV3RG9tRWwuY2xhc3NOYW1lID0gXCJjbG91ZC1pbWFnZXNfX2l0ZW1cIjtcbiAgICAgIG5ld0RvbUVsLm9uY2xpY2sgPSBmdW5jdDtcbiAgICAgIG5ld0RvbUVsLmlubmVySFRNTCA9IFwiXFxuXFx0XFx0XFx0XFx0XFx0XFx0ICA8ZGl2IGNsYXNzPVxcXCJjbG91ZC1pbWFnZXNfX2l0ZW1fX3R5cGVcXFwiPlxcblxcdFxcdFxcdFxcdFxcdFxcdFxcdFxcdFwiLmNvbmNhdChpdGVtSWNvbigpLCBcIlxcblxcdFxcdFxcdFxcdFxcdFxcdCAgPC9kaXY+XFxuXFx0XFx0XFx0XFx0XFx0XFx0ICA8ZGl2IGNsYXNzPVxcXCJjbG91ZC1pbWFnZXNfX2l0ZW1fX2RldGFpbHNcXFwiPlxcblxcdFxcdFxcdFxcdFxcdFxcdFxcdFxcdDxzcGFuIGNsYXNzPVxcXCJjbG91ZC1pbWFnZXNfX2l0ZW1fX2RldGFpbHNfX25hbWVcXFwiPlwiKS5jb25jYXQoaXRlbS5uYW1lLCBcIjwvc3Bhbj5cXG5cXHRcXHRcXHRcXHRcXHRcXHRcXHRcXHQ8c3BhbiBjbGFzcz1cXFwiY2xvdWQtaW1hZ2VzX19pdGVtX19kZXRhaWxzX19kYXRlXFxcIj5cIikuY29uY2F0KGl0ZW0uY3JkYXRlLCBcIjwvc3Bhbj5cXG5cXHRcXHRcXHRcXHRcXHRcXHQgIDwvZGl2PlxcblxcdFxcdFxcdFxcdFxcdFxcdCAgPGRpdiBjbGFzcz1cXFwiY2xvdWQtaW1hZ2VzX19pdGVtX19hY3Rpb25zXFxcIj5cXG5cXHRcXHRcXHRcXHRcXHRcXHRcXHRcXHQ8YSBjbGFzcz1cXFwiZmEgZmEtcGVuY2lsXFxcIj48L2E+XFxuXFx0XFx0XFx0XFx0XFx0XFx0ICA8L2Rpdj5cIik7XG4gICAgICByZXR1cm4gbmV3RG9tRWw7XG4gICAgfTtcblxuICAgIGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKCdiYWMtLWNsb3VkaW5hcnktaXRhbXMtY29udGFpbmVyJykuaW5uZXJIVE1MID0gJyc7XG5cbiAgICBmb3IgKHZhciBpID0gMDsgaSA8IGl0ZW1zLmxlbmd0aDsgaSsrKSB7XG4gICAgICBkb2N1bWVudC5nZXRFbGVtZW50QnlJZCgnYmFjLS1jbG91ZGluYXJ5LWl0YW1zLWNvbnRhaW5lcicpLmFwcGVuZENoaWxkKG9uZUl0ZW0oaXRlbXNbaV0pKTtcbiAgICB9XG4gIH0sXG4gIHJlbmRlcjogZnVuY3Rpb24gcmVuZGVyKCkge1xuICAgIGlmIChtZXRhRGF0YS5hc3NldCkge1xuICAgICAgRG9tLnJlbW92ZUNsYXNzKGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKCdiYWMtLWNsb3VkaW5hcnktLWJhY2stYnV0dG9uLWNvbnRhaW5lcicpLCAnaGRuJyk7XG4gICAgfSBlbHNlIHtcbiAgICAgIERvbS5hZGRDbGFzcyhkb2N1bWVudC5nZXRFbGVtZW50QnlJZCgnYmFjLS1jbG91ZGluYXJ5LS1iYWNrLWJ1dHRvbi1jb250YWluZXInKSwgJ2hkbicpO1xuICAgIH1cblxuICAgIENsb3VkaW5hcnlQaWNrZXIucmVuZGVySXRlbXMoKTtcblxuICAgIGlmIChtZXRhRGF0YS50b3RhbCA+IGxpbWl0KSB7XG4gICAgICBEb20ucmVtb3ZlQ2xhc3MoZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoJ2JhYy0tY2xvdWRpbmFyeS1wYWdpbmF0aW9uLWNvbnRhaW5lcicpLCAnaGRuJyk7XG4gICAgICBDbG91ZGluYXJ5UGlja2VyLnJlbmRlclBhZ2luYXRpb25CdXR0b25zKCk7XG4gICAgfSBlbHNlIHtcbiAgICAgIERvbS5hZGRDbGFzcyhkb2N1bWVudC5nZXRFbGVtZW50QnlJZCgnYmFjLS1jbG91ZGluYXJ5LXBhZ2luYXRpb24tY29udGFpbmVyJyksICdoZG4nKTtcbiAgICB9XG4gIH1cbn07XG5tb2R1bGUuZXhwb3J0cyA9IENsb3VkaW5hcnlQaWNrZXI7IiwiXCJ1c2Ugc3RyaWN0XCI7XG5cbnZhciBEb20gPSB7XG4gIGhhc0NsYXNzOiBmdW5jdGlvbiBoYXNDbGFzcyhlbCwgY2xhc3NOYW1lKSB7XG4gICAgaWYgKGVsLmNsYXNzTGlzdCkgcmV0dXJuIGVsLmNsYXNzTGlzdC5jb250YWlucyhjbGFzc05hbWUpO2Vsc2UgcmV0dXJuIG5ldyBSZWdFeHAoJyhefCApJyArIGNsYXNzTmFtZSArICcoIHwkKScsICdnaScpLnRlc3QoZWwuY2xhc3NOYW1lKTtcbiAgfSxcbiAgcmVtb3ZlQ2xhc3M6IGZ1bmN0aW9uIHJlbW92ZUNsYXNzKGVsLCBjbGFzc05hbWUpIHtcbiAgICBpZiAoZWwuY2xhc3NMaXN0KSBlbC5jbGFzc0xpc3QucmVtb3ZlKGNsYXNzTmFtZSk7ZWxzZSBlbC5jbGFzc05hbWUgPSBlbC5jbGFzc05hbWUucmVwbGFjZShuZXcgUmVnRXhwKCcoXnxcXFxcYiknICsgY2xhc3NOYW1lLnNwbGl0KCcgJykuam9pbignfCcpICsgJyhcXFxcYnwkKScsICdnaScpLCAnICcpO1xuICB9LFxuICBhZGRDbGFzczogZnVuY3Rpb24gYWRkQ2xhc3MoZWwsIGNsYXNzTmFtZSkge1xuICAgIGlmIChlbC5jbGFzc0xpc3QpIGVsLmNsYXNzTGlzdC5hZGQoY2xhc3NOYW1lKTtlbHNlIGVsLmNsYXNzTmFtZSArPSAnICcgKyBjbGFzc05hbWU7XG4gIH0sXG4gIHRvZ2dsZUNsYXNzOiBmdW5jdGlvbiB0b2dnbGVDbGFzcyhlbCwgY2xhc3NOYW1lKSB7XG4gICAgaWYgKHRoaXMuaGFzQ2xhc3MoZWwsIGNsYXNzTmFtZSkpIHtcbiAgICAgIHRoaXMucmVtb3ZlQ2xhc3MoZWwsIGNsYXNzTmFtZSk7XG4gICAgfSBlbHNlIHtcbiAgICAgIHRoaXMuYWRkQ2xhc3MoZWwsIGNsYXNzTmFtZSk7XG4gICAgfVxuICB9XG59O1xubW9kdWxlLmV4cG9ydHMgPSBEb207IiwiXCJ1c2Ugc3RyaWN0XCI7XG5cbnZhciBkb20gPSByZXF1aXJlKCcuL2RvbScpO1xuXG52YXIgZGVmYXVsdEhpZGVJbiA9IDUwMDA7XG52YXIgbGFzdEluZGV4ID0gMTtcbnZhciBudW1PZkluZm9CbG9ja3MgPSAxMDtcbnZhciBpbmZvQmxvY2tzID0gW107XG52YXIgSW5mb0NvbnRyb2xsZXIgPSB7XG4gIHJlbmRlckluZm9CbG9ja3M6IGZ1bmN0aW9uIHJlbmRlckluZm9CbG9ja3MoKSB7XG4gICAgdmFyIGJsb2Nrc1RlbXBsYXRlID0gZnVuY3Rpb24gYmxvY2tzVGVtcGxhdGUoaW5kZXgpIHtcbiAgICAgIHJldHVybiBcIlxcblxcdFxcdFxcdFxcdCA8ZGl2IGNsYXNzPVxcXCJiYWMtLXB1cmVzZGstaW5mby1ib3gtLVxcXCIgaWQ9XFxcImJhYy0tcHVyZXNkay1pbmZvLWJveC0tXCIuY29uY2F0KGluZGV4LCBcIlxcXCI+XFxuXFx0XFx0XFx0XFx0IFxcdDxkaXYgY2xhc3M9XFxcImJhYy0tdGltZXJcXFwiIGlkPVxcXCJiYWMtLXRpbWVyXCIpLmNvbmNhdChpbmRleCwgXCJcXFwiPjwvZGl2PlxcblxcdFxcdFxcdFxcdFxcdCA8ZGl2IGNsYXNzPVxcXCJiYWMtLWlubmVyLWluZm8tYm94LS1cXFwiPlxcblxcdFxcdFxcdFxcdFxcdCBcXHRcXHQ8ZGl2IGNsYXNzPVxcXCJiYWMtLWluZm8taWNvbi0tIGZhLXN1Y2Nlc3NcXFwiPjwvZGl2PlxcblxcdFxcdFxcdFxcdFxcdCBcXHRcXHQ8ZGl2IGNsYXNzPVxcXCJiYWMtLWluZm8taWNvbi0tIGZhLXdhcm5pbmdcXFwiPjwvZGl2PlxcblxcdFxcdFxcdFxcdFxcdCBcXHRcXHQ8ZGl2IGNsYXNzPVxcXCJiYWMtLWluZm8taWNvbi0tIGZhLWluZm8tMVxcXCI+PC9kaXY+XFxuXFx0XFx0XFx0XFx0XFx0IFxcdFxcdDxkaXYgY2xhc3M9XFxcImJhYy0taW5mby1pY29uLS0gZmEtZXJyb3JcXFwiPjwvZGl2PlxcblxcdFxcdFxcdFxcdFxcdCBcXHRcXHQgPGRpdiBjbGFzcz1cXFwiYmFjLS1pbmZvLW1haW4tdGV4dC0tXFxcIiBpZD1cXFwiYmFjLS1pbmZvLW1haW4tdGV4dC0tXCIpLmNvbmNhdChpbmRleCwgXCJcXFwiPjwvZGl2PlxcblxcdFxcdFxcdFxcdFxcdCBcXHRcXHQgPGRpdiBjbGFzcz1cXFwiYmFjLS1pbmZvLWNsb3NlLWJ1dHRvbi0tIGZhLWNsb3NlLTFcXFwiIGlkPVxcXCJiYWMtLWluZm8tY2xvc2UtYnV0dG9uLS1cIikuY29uY2F0KGluZGV4LCBcIlxcXCI+PC9kaXY+XFxuXFx0XFx0XFx0XFx0XFx0PC9kaXY+XFxuXFx0XFx0XFx0XFx0PC9kaXY+XFxuXFx0XFx0ICBcIik7XG4gICAgfTtcblxuICAgIHZhciBpbmZvQmxvY2tzV3JhcHBlciA9IGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKCdiYWMtLWluZm8tYmxvY2tzLXdyYXBwZXItLScpO1xuICAgIHZhciBpbm5lckh0bWwgPSAnJztcblxuICAgIGZvciAodmFyIGkgPSAxOyBpIDwgbnVtT2ZJbmZvQmxvY2tzOyBpKyspIHtcbiAgICAgIGlubmVySHRtbCArPSBibG9ja3NUZW1wbGF0ZShpKTtcbiAgICB9XG5cbiAgICBpbmZvQmxvY2tzV3JhcHBlci5pbm5lckhUTUwgPSBpbm5lckh0bWw7XG4gIH0sXG4gIGluaXQ6IGZ1bmN0aW9uIGluaXQoKSB7XG4gICAgZm9yICh2YXIgaSA9IDE7IGkgPCBudW1PZkluZm9CbG9ja3M7IGkrKykge1xuICAgICAgKGZ1bmN0aW9uIHgoaSkge1xuICAgICAgICB2YXIgY2xvc2VGdW5jdGlvbiA9IGZ1bmN0aW9uIGNsb3NlRnVuY3Rpb24oKSB7XG4gICAgICAgICAgZG9tLnJlbW92ZUNsYXNzKGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKCdiYWMtLXB1cmVzZGstaW5mby1ib3gtLScgKyBpKSwgJ2JhYy0tYWN0aXZlLS0nKTtcbiAgICAgICAgICBkb2N1bWVudC5nZXRFbGVtZW50QnlJZCgnYmFjLS10aW1lcicgKyBpKS5zdHlsZS50cmFuc2l0aW9uID0gJyc7XG4gICAgICAgICAgZG9tLnJlbW92ZUNsYXNzKGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKCdiYWMtLXRpbWVyJyArIGkpLCAnYmFjLS1mdWxsd2lkdGgnKTtcbiAgICAgICAgICBpbmZvQmxvY2tzW2kgLSAxXS5pblVzZSA9IGZhbHNlO1xuICAgICAgICAgIHNldFRpbWVvdXQoZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgaWYgKGluZm9CbG9ja3NbaSAtIDFdLmNsb3NlVGltZW91dCkge1xuICAgICAgICAgICAgICBjbGVhclRpbWVvdXQoaW5mb0Jsb2Nrc1tpIC0gMV0uY2xvc2VUaW1lb3V0KTtcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgZG9tLnJlbW92ZUNsYXNzKGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKCdiYWMtLXB1cmVzZGstaW5mby1ib3gtLScgKyBpKSwgJ2JhYy0tc3VjY2VzcycpO1xuICAgICAgICAgICAgZG9tLnJlbW92ZUNsYXNzKGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKCdiYWMtLXB1cmVzZGstaW5mby1ib3gtLScgKyBpKSwgJ2JhYy0taW5mbycpO1xuICAgICAgICAgICAgZG9tLnJlbW92ZUNsYXNzKGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKCdiYWMtLXB1cmVzZGstaW5mby1ib3gtLScgKyBpKSwgJ2JhYy0td2FybmluZycpO1xuICAgICAgICAgICAgZG9tLnJlbW92ZUNsYXNzKGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKCdiYWMtLXB1cmVzZGstaW5mby1ib3gtLScgKyBpKSwgJ2JhYy0tZXJyb3InKTtcbiAgICAgICAgICB9LCA0NTApO1xuICAgICAgICB9O1xuXG4gICAgICAgIHZhciBhZGRUZXh0ID0gZnVuY3Rpb24gYWRkVGV4dCh0ZXh0KSB7XG4gICAgICAgICAgZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoJ2JhYy0taW5mby1tYWluLXRleHQtLScgKyBpKS5pbm5lckhUTUwgPSB0ZXh0O1xuICAgICAgICB9O1xuXG4gICAgICAgIHZhciBhZGRUaW1lb3V0ID0gZnVuY3Rpb24gYWRkVGltZW91dCh0aW1lb3V0TXNlY3MpIHtcbiAgICAgICAgICBkb2N1bWVudC5nZXRFbGVtZW50QnlJZCgnYmFjLS10aW1lcicgKyBpKS5zdHlsZS50cmFuc2l0aW9uID0gJ3dpZHRoICcgKyB0aW1lb3V0TXNlY3MgKyAnbXMnO1xuICAgICAgICAgIGRvbS5hZGRDbGFzcyhkb2N1bWVudC5nZXRFbGVtZW50QnlJZCgnYmFjLS10aW1lcicgKyBpKSwgJ2JhYy0tZnVsbHdpZHRoJyk7XG4gICAgICAgICAgaW5mb0Jsb2Nrc1tpIC0gMV0uY2xvc2VUaW1lb3V0ID0gc2V0VGltZW91dChmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICBpbmZvQmxvY2tzW2kgLSAxXS5jbG9zZUZ1bmN0aW9uKCk7XG4gICAgICAgICAgfSwgdGltZW91dE1zZWNzKTtcbiAgICAgICAgfTtcblxuICAgICAgICBpbmZvQmxvY2tzLnB1c2goe1xuICAgICAgICAgIGlkOiBpLFxuICAgICAgICAgIGluVXNlOiBmYWxzZSxcbiAgICAgICAgICBlbGVtZW50OiBkb2N1bWVudC5nZXRFbGVtZW50QnlJZCgnYmFjLS1wdXJlc2RrLWluZm8tYm94LS0nICsgaSksXG4gICAgICAgICAgY2xvc2VGdW5jdGlvbjogY2xvc2VGdW5jdGlvbixcbiAgICAgICAgICBhZGRUZXh0OiBhZGRUZXh0LFxuICAgICAgICAgIGFkZFRpbWVvdXQ6IGFkZFRpbWVvdXQsXG4gICAgICAgICAgY2xvc2VUaW1lb3V0OiBmYWxzZVxuICAgICAgICB9KTtcblxuICAgICAgICBkb2N1bWVudC5nZXRFbGVtZW50QnlJZCgnYmFjLS1pbmZvLWNsb3NlLWJ1dHRvbi0tJyArIGkpLm9uY2xpY2sgPSBmdW5jdGlvbiAoZSkge1xuICAgICAgICAgIGNsb3NlRnVuY3Rpb24oaSk7XG4gICAgICAgIH07XG4gICAgICB9KShpKTtcbiAgICB9XG4gIH0sXG5cbiAgLypcbiAgIHR5cGU6IG9uZSBvZjpcbiAgXHQtIHN1Y2Nlc3NcbiAgXHQtIGluZm9cbiAgXHQtIHdhcm5pbmdcbiAgXHQtIGVycm9yXG4gICB0ZXh0OiB0aGUgdGV4dCB0byBkaXNwbGF5XG4gICBvcHRpb25zIChvcHRpb25hbCk6IHtcbiAgIFx0XHRoaWRlSW46IG1pbGxpc2Vjb25kcyB0byBoaWRlIGl0LiAtMSBmb3Igbm90IGhpZGluZyBpdCBhdCBhbGwuIERlZmF1bHQgaXMgNTAwMFxuICAgfVxuICAgKi9cbiAgc2hvd0luZm86IGZ1bmN0aW9uIHNob3dJbmZvKHR5cGUsIHRleHQsIG9wdGlvbnMpIHtcbiAgICBmb3IgKHZhciBpID0gMDsgaSA8IG51bU9mSW5mb0Jsb2NrczsgaSsrKSB7XG4gICAgICB2YXIgaW5mb0Jsb2NrID0gaW5mb0Jsb2Nrc1tpXTtcblxuICAgICAgaWYgKCFpbmZvQmxvY2suaW5Vc2UpIHtcbiAgICAgICAgaW5mb0Jsb2NrLmluVXNlID0gdHJ1ZTtcbiAgICAgICAgaW5mb0Jsb2NrLmVsZW1lbnQuc3R5bGUuekluZGV4ID0gbGFzdEluZGV4O1xuICAgICAgICBpbmZvQmxvY2suYWRkVGV4dCh0ZXh0KTtcbiAgICAgICAgbGFzdEluZGV4ICs9IDE7XG4gICAgICAgIHZhciB0aW1lb3V0bVNlY3MgPSBkZWZhdWx0SGlkZUluO1xuICAgICAgICB2YXIgYXV0b0Nsb3NlID0gdHJ1ZTtcblxuICAgICAgICBpZiAob3B0aW9ucykge1xuICAgICAgICAgIGlmIChvcHRpb25zLmhpZGVJbiAhPSBudWxsICYmIG9wdGlvbnMuaGlkZUluICE9IHVuZGVmaW5lZCAmJiBvcHRpb25zLmhpZGVJbiAhPSAtMSkge1xuICAgICAgICAgICAgdGltZW91dG1TZWNzID0gb3B0aW9ucy5oaWRlSW47XG4gICAgICAgICAgfSBlbHNlIGlmIChvcHRpb25zLmhpZGVJbiA9PT0gLTEpIHtcbiAgICAgICAgICAgIGF1dG9DbG9zZSA9IGZhbHNlO1xuICAgICAgICAgIH1cbiAgICAgICAgfVxuXG4gICAgICAgIGlmIChhdXRvQ2xvc2UpIHtcbiAgICAgICAgICBpbmZvQmxvY2suYWRkVGltZW91dCh0aW1lb3V0bVNlY3MpO1xuICAgICAgICB9XG5cbiAgICAgICAgZG9tLmFkZENsYXNzKGluZm9CbG9jay5lbGVtZW50LCAnYmFjLS0nICsgdHlwZSk7XG4gICAgICAgIGRvbS5hZGRDbGFzcyhpbmZvQmxvY2suZWxlbWVudCwgJ2JhYy0tYWN0aXZlLS0nKTtcbiAgICAgICAgcmV0dXJuO1xuICAgICAgfVxuICAgIH1cbiAgfVxufTtcbm1vZHVsZS5leHBvcnRzID0gSW5mb0NvbnRyb2xsZXI7IiwiXCJ1c2Ugc3RyaWN0XCI7XG5cbnZhciBTdG9yZSA9IHJlcXVpcmUoJy4vc3RvcmUuanMnKTtcblxudmFyIExvZ2dlciA9IHtcbiAgbG9nOiBmdW5jdGlvbiBsb2cod2hhdCkge1xuICAgIGlmICghU3RvcmUubG9nc0VuYWJsZWQoKSkge1xuICAgICAgcmV0dXJuIGZhbHNlO1xuICAgIH0gZWxzZSB7XG4gICAgICBMb2dnZXIubG9nID0gY29uc29sZS5sb2cuYmluZChjb25zb2xlKTtcbiAgICAgIExvZ2dlci5sb2cod2hhdCk7XG4gICAgfVxuICB9LFxuICBlcnJvcjogZnVuY3Rpb24gZXJyb3IoZXJyKSB7XG4gICAgaWYgKCFTdG9yZS5sb2dzRW5hYmxlZCgpKSB7XG4gICAgICByZXR1cm4gZmFsc2U7XG4gICAgfSBlbHNlIHtcbiAgICAgIExvZ2dlci5lcnJvciA9IGNvbnNvbGUuZXJyb3IuYmluZChjb25zb2xlKTtcbiAgICAgIExvZ2dlci5lcnJvcihlcnIpO1xuICAgIH1cbiAgfVxufTtcbm1vZHVsZS5leHBvcnRzID0gTG9nZ2VyOyIsIlwidXNlIHN0cmljdFwiO1xuXG52YXIgc2V0dGluZ3MgPSB7XG4gIHRvdGFsUGFnZUJ1dHRvbnNOdW1iZXI6IDhcbn07XG52YXIgUGFnaW5hdG9yID0ge1xuICBzZXRTZXR0aW5nczogZnVuY3Rpb24gc2V0U2V0dGluZ3Moc2V0dGluZykge1xuICAgIGZvciAodmFyIGtleSBpbiBzZXR0aW5nKSB7XG4gICAgICBzZXR0aW5nc1trZXldID0gc2V0dGluZ1trZXldO1xuICAgIH1cbiAgfSxcbiAgZ2V0UGFnZXNSYW5nZTogZnVuY3Rpb24gZ2V0UGFnZXNSYW5nZShjdXJwYWdlLCB0b3RhbFBhZ2VzT25SZXN1bHRTZXQpIHtcbiAgICB2YXIgcGFnZVJhbmdlID0gW3tcbiAgICAgIHBhZ2VubzogY3VycGFnZSxcbiAgICAgIHJ1bm5pbmdwYWdlOiB0cnVlXG4gICAgfV07XG4gICAgdmFyIGhhc25leHRvbnJpZ2h0ID0gdHJ1ZTtcbiAgICB2YXIgaGFzbmV4dG9ubGVmdCA9IHRydWU7XG4gICAgdmFyIGkgPSAxO1xuXG4gICAgd2hpbGUgKHBhZ2VSYW5nZS5sZW5ndGggPCBzZXR0aW5ncy50b3RhbFBhZ2VCdXR0b25zTnVtYmVyICYmIChoYXNuZXh0b25yaWdodCB8fCBoYXNuZXh0b25sZWZ0KSkge1xuICAgICAgaWYgKGhhc25leHRvbmxlZnQpIHtcbiAgICAgICAgaWYgKGN1cnBhZ2UgLSBpID4gMCkge1xuICAgICAgICAgIHBhZ2VSYW5nZS5wdXNoKHtcbiAgICAgICAgICAgIHBhZ2VubzogY3VycGFnZSAtIGksXG4gICAgICAgICAgICBydW5uaW5ncGFnZTogZmFsc2VcbiAgICAgICAgICB9KTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICBoYXNuZXh0b25sZWZ0ID0gZmFsc2U7XG4gICAgICAgIH1cbiAgICAgIH1cblxuICAgICAgaWYgKGhhc25leHRvbnJpZ2h0KSB7XG4gICAgICAgIGlmIChjdXJwYWdlICsgaSAtIDEgPCB0b3RhbFBhZ2VzT25SZXN1bHRTZXQpIHtcbiAgICAgICAgICBwYWdlUmFuZ2UucHVzaCh7XG4gICAgICAgICAgICBwYWdlbm86IGN1cnBhZ2UgKyBpLFxuICAgICAgICAgICAgcnVubmluZ3BhZ2U6IGZhbHNlXG4gICAgICAgICAgfSk7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgaGFzbmV4dG9ucmlnaHQgPSBmYWxzZTtcbiAgICAgICAgfVxuICAgICAgfVxuXG4gICAgICBpKys7XG4gICAgfVxuXG4gICAgdmFyIGhhc05leHQgPSBjdXJwYWdlIDwgdG90YWxQYWdlc09uUmVzdWx0U2V0O1xuICAgIHZhciBoYXNQcmV2aW91cyA9IGN1cnBhZ2UgPiAxO1xuICAgIHJldHVybiB7XG4gICAgICBidXR0b25zOiBwYWdlUmFuZ2Uuc29ydChmdW5jdGlvbiAoaXRlbUEsIGl0ZW1CKSB7XG4gICAgICAgIHJldHVybiBpdGVtQS5wYWdlbm8gLSBpdGVtQi5wYWdlbm87XG4gICAgICB9KSxcbiAgICAgIGhhc05leHQ6IGhhc05leHQsXG4gICAgICBoYXNQcmV2aW91czogaGFzUHJldmlvdXNcbiAgICB9O1xuICB9XG59O1xubW9kdWxlLmV4cG9ydHMgPSBQYWdpbmF0b3I7IiwiJ3VzZSBzdHJpY3QnO1xuXG52YXIgU3RvcmUgPSByZXF1aXJlKCcuL3N0b3JlLmpzJyk7XG5cbnZhciBMb2dnZXIgPSByZXF1aXJlKCcuL2xvZ2dlci5qcycpO1xuXG52YXIgYXZhaWxhYmxlTGlzdGVuZXJzID0ge1xuICBzZWFyY2hLZXlVcDoge1xuICAgIGluZm86ICdMaXN0ZW5lciBvbiBrZXlVcCBvZiBzZWFyY2ggaW5wdXQgb24gdG9wIGJhcidcbiAgfSxcbiAgc2VhcmNoRW50ZXI6IHtcbiAgICBpbmZvOiAnTGlzdGVuZXIgb24gZW50ZXIga2V5IHByZXNzZWQgb24gc2VhcmNoIGlucHV0IG9uIHRvcCBiYXInXG4gIH0sXG4gIHNlYXJjaE9uQ2hhbmdlOiB7XG4gICAgaW5mbzogJ0xpc3RlbmVyIG9uIGNoYW5nZSBvZiBpbnB1dCB2YWx1ZSdcbiAgfVxufTtcbnZhciBQdWJTdWIgPSB7XG4gIGdldEF2YWlsYWJsZUxpc3RlbmVyczogZnVuY3Rpb24gZ2V0QXZhaWxhYmxlTGlzdGVuZXJzKCkge1xuICAgIHJldHVybiBhdmFpbGFibGVMaXN0ZW5lcnM7XG4gIH0sXG4gIHN1YnNjcmliZTogZnVuY3Rpb24gc3Vic2NyaWJlKGV2ZW50dCwgZnVuY3QpIHtcbiAgICBpZiAoZXZlbnR0ID09PSBcInNlYXJjaEtleVVwXCIpIHtcbiAgICAgIHZhciBlbCA9IGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKFN0b3JlLmdldFNlYXJjaElucHV0SWQoKSk7XG4gICAgICBlbC5hZGRFdmVudExpc3RlbmVyKCdrZXl1cCcsIGZ1bmN0KTtcbiAgICAgIHJldHVybiBmdW5jdGlvbiAoKSB7XG4gICAgICAgIGVsLnJlbW92ZUV2ZW50TGlzdGVuZXIoJ2tleXVwJywgZnVuY3QsIGZhbHNlKTtcbiAgICAgIH07XG4gICAgfSBlbHNlIGlmIChldmVudHQgPT09ICdzZWFyY2hFbnRlcicpIHtcbiAgICAgIHZhciBoYW5kbGluZ0Z1bmN0ID0gZnVuY3Rpb24gaGFuZGxpbmdGdW5jdChlKSB7XG4gICAgICAgIGlmIChlLmtleUNvZGUgPT09IDEzKSB7XG4gICAgICAgICAgZnVuY3QoZSk7XG4gICAgICAgIH1cbiAgICAgIH07XG5cbiAgICAgIGVsLmFkZEV2ZW50TGlzdGVuZXIoJ2tleWRvd24nLCBoYW5kbGluZ0Z1bmN0KTtcbiAgICAgIHJldHVybiBmdW5jdGlvbiAoKSB7XG4gICAgICAgIGVsLnJlbW92ZUV2ZW50TGlzdGVuZXIoJ2tleWRvd24nLCBoYW5kbGluZ0Z1bmN0LCBmYWxzZSk7XG4gICAgICB9O1xuICAgIH0gZWxzZSBpZiAoZXZlbnR0ID09PSAnc2VhcmNoT25DaGFuZ2UnKSB7XG4gICAgICB2YXIgZWwgPSBkb2N1bWVudC5nZXRFbGVtZW50QnlJZChTdG9yZS5nZXRTZWFyY2hJbnB1dElkKCkpO1xuICAgICAgZWwuYWRkRXZlbnRMaXN0ZW5lcignY2hhbmdlJywgZnVuY3QpO1xuICAgICAgcmV0dXJuIGZ1bmN0aW9uICgpIHtcbiAgICAgICAgZWwucmVtb3ZlRXZlbnRMaXN0ZW5lcigna2V5dXAnLCBmdW5jdCwgZmFsc2UpO1xuICAgICAgfTtcbiAgICB9IGVsc2Uge1xuICAgICAgTG9nZ2VyLmVycm9yKCdUaGUgZXZlbnQgeW91IHRyaWVkIHRvIHN1YnNjcmliZSBpcyBub3QgYXZhaWxhYmxlIGJ5IHRoZSBsaWJyYXJ5Jyk7XG4gICAgICBMb2dnZXIubG9nKCdUaGUgYXZhaWxhYmxlIGV2ZW50cyBhcmU6ICcsIGF2YWlsYWJsZUxpc3RlbmVycyk7XG4gICAgICByZXR1cm4gZnVuY3Rpb24gKCkge307XG4gICAgfVxuICB9XG59O1xubW9kdWxlLmV4cG9ydHMgPSBQdWJTdWI7IiwiXCJ1c2Ugc3RyaWN0XCI7XG5cbnZhciBzdGF0ZSA9IHtcbiAgZ2VuZXJhbDoge1xuICAgIGZ1bGxXaWR0aDogZmFsc2UsXG4gICAgZGlzcGxheVN1cHBvcnQ6IGZhbHNlXG4gIH0sXG4gIHVzZXJEYXRhOiB7fSxcbiAgY29uZmlndXJhdGlvbjoge1xuICAgIHNlc3Npb25FbmRwb2ludDogJ3Nlc3Npb24nLFxuICAgIGJhc2VVcmw6ICcvYXBpL3YxJ1xuICB9LFxuICBodG1sVGVtcGxhdGU6IFwiXCIsXG4gIGFwcHM6IG51bGwsXG4gIHZlcnNpb25OdW1iZXI6ICcnLFxuICBkZXY6IGZhbHNlLFxuICBmaWxlUGlja2VyOiB7XG4gICAgc2VsZWN0ZWRGaWxlOiBudWxsXG4gIH0sXG4gIGFwcEluZm86IG51bGwsXG4gIHNlc3Npb25FbmRwb2ludEJ5VXNlcjogZmFsc2Vcbn07XG5cbmZ1bmN0aW9uIGFzc2VtYmxlKGxpdGVyYWwsIHBhcmFtcykge1xuICByZXR1cm4gbmV3IEZ1bmN0aW9uKHBhcmFtcywgXCJyZXR1cm4gYFwiICsgbGl0ZXJhbCArIFwiYDtcIik7XG59XG5cbnZhciBTdG9yZSA9IHtcbiAgZ2V0U3RhdGU6IGZ1bmN0aW9uIGdldFN0YXRlKCkge1xuICAgIHJldHVybiBPYmplY3QuYXNzaWduKHt9LCBzdGF0ZSk7XG4gIH0sXG4gIHNldFdpbmRvd05hbWU6IGZ1bmN0aW9uIHNldFdpbmRvd05hbWUod24pIHtcbiAgICBzdGF0ZS5nZW5lcmFsLndpbmRvd05hbWUgPSB3bjtcbiAgfSxcbiAgc2V0RnVsbFdpZHRoOiBmdW5jdGlvbiBzZXRGdWxsV2lkdGgoZncpIHtcbiAgICBzdGF0ZS5nZW5lcmFsLmZ1bGxXaWR0aCA9IGZ3O1xuICB9LFxuICBzZXREaXNwbGF5U3VwcG9ydDogZnVuY3Rpb24gc2V0RGlzcGxheVN1cHBvcnQoZGlzcGxheSkge1xuICAgIHN0YXRlLmdlbmVyYWwuZGlzcGxheVN1cHBvcnQgPSBkaXNwbGF5O1xuICB9LFxuICBzZXREZXY6IGZ1bmN0aW9uIHNldERldihkZXYpIHtcbiAgICBzdGF0ZS5kZXYgPSBkZXY7XG4gIH0sXG4gIHNldFVybFZlcnNpb25QcmVmaXg6IGZ1bmN0aW9uIHNldFVybFZlcnNpb25QcmVmaXgocHJlZml4KSB7XG4gICAgc3RhdGUuY29uZmlndXJhdGlvbi5iYXNlVXJsID0gcHJlZml4O1xuICB9LFxuICBnZXREZXZVcmxQYXJ0OiBmdW5jdGlvbiBnZXREZXZVcmxQYXJ0KCkge1xuICAgIGlmIChzdGF0ZS5kZXYpIHtcbiAgICAgIHJldHVybiBcInNhbmRib3gvXCI7XG4gICAgfSBlbHNlIHtcbiAgICAgIHJldHVybiBcIlwiO1xuICAgIH1cbiAgfSxcbiAgZ2V0RnVsbEJhc2VVcmw6IGZ1bmN0aW9uIGdldEZ1bGxCYXNlVXJsKCkge1xuICAgIHJldHVybiBzdGF0ZS5jb25maWd1cmF0aW9uLnJvb3RVcmwgKyBzdGF0ZS5jb25maWd1cmF0aW9uLmJhc2VVcmwgKyBTdG9yZS5nZXREZXZVcmxQYXJ0KCk7XG4gIH0sXG5cbiAgLypcbiAgIGNvbmY6XG4gICAtIGhlYWRlckRpdklkXG4gICAtIGluY2x1ZGVBcHBzTWVudVxuICAgKi9cbiAgc2V0Q29uZmlndXJhdGlvbjogZnVuY3Rpb24gc2V0Q29uZmlndXJhdGlvbihjb25mKSB7XG4gICAgZm9yICh2YXIga2V5IGluIGNvbmYpIHtcbiAgICAgIHN0YXRlLmNvbmZpZ3VyYXRpb25ba2V5XSA9IGNvbmZba2V5XTtcbiAgICB9XG4gIH0sXG4gIHNldFZlcnNpb25OdW1iZXI6IGZ1bmN0aW9uIHNldFZlcnNpb25OdW1iZXIodmVyc2lvbikge1xuICAgIHN0YXRlLnZlcnNpb25OdW1iZXIgPSB2ZXJzaW9uO1xuICB9LFxuICBnZXRWZXJzaW9uTnVtYmVyOiBmdW5jdGlvbiBnZXRWZXJzaW9uTnVtYmVyKCkge1xuICAgIHJldHVybiBzdGF0ZS52ZXJzaW9uTnVtYmVyO1xuICB9LFxuICBnZXRBcHBzVmlzaWJsZTogZnVuY3Rpb24gZ2V0QXBwc1Zpc2libGUoKSB7XG4gICAgaWYgKHN0YXRlLmNvbmZpZ3VyYXRpb24uYXBwc1Zpc2libGUgPT09IG51bGwgfHwgc3RhdGUuY29uZmlndXJhdGlvbi5hcHBzVmlzaWJsZSA9PT0gdW5kZWZpbmVkKSB7XG4gICAgICByZXR1cm4gdHJ1ZTtcbiAgICB9IGVsc2Uge1xuICAgICAgcmV0dXJuIHN0YXRlLmNvbmZpZ3VyYXRpb24uYXBwc1Zpc2libGU7XG4gICAgfVxuICB9LFxuICBzZXRBcHBzVmlzaWJsZTogZnVuY3Rpb24gc2V0QXBwc1Zpc2libGUoYXBwc1Zpc2libGUpIHtcbiAgICBzdGF0ZS5jb25maWd1cmF0aW9uLmFwcHNWaXNpYmxlID0gYXBwc1Zpc2libGU7XG4gIH0sXG4gIHNldEhUTUxUZW1wbGF0ZTogZnVuY3Rpb24gc2V0SFRNTFRlbXBsYXRlKHRlbXBsYXRlKSB7XG4gICAgc3RhdGUuaHRtbFRlbXBsYXRlID0gdGVtcGxhdGU7XG4gIH0sXG4gIHNldEFwcHM6IGZ1bmN0aW9uIHNldEFwcHMoYXBwcykge1xuICAgIHN0YXRlLmFwcHMgPSBhcHBzO1xuICB9LFxuICBzZXRBcHBJbmZvOiBmdW5jdGlvbiBzZXRBcHBJbmZvKGFwcEluZm8pIHtcbiAgICBzdGF0ZS5hcHBJbmZvID0gYXBwSW5mbztcbiAgfSxcbiAgZ2V0QXBwSW5mbzogZnVuY3Rpb24gZ2V0QXBwSW5mbygpIHtcbiAgICByZXR1cm4gc3RhdGUuYXBwSW5mbztcbiAgfSxcbiAgZ2V0TG9naW5Vcmw6IGZ1bmN0aW9uIGdldExvZ2luVXJsKCkge1xuICAgIHJldHVybiBzdGF0ZS5jb25maWd1cmF0aW9uLnJvb3RVcmwgKyBzdGF0ZS5jb25maWd1cmF0aW9uLmxvZ2luVXJsOyAvLyArIFwiP1wiICsgc3RhdGUuY29uZmlndXJhdGlvbi5yZWRpcmVjdFVybFBhcmFtICsgXCI9XCIgKyB3aW5kb3cubG9jYXRpb24uaHJlZjtcbiAgfSxcbiAgZ2V0QXV0aGVudGljYXRpb25FbmRwb2ludDogZnVuY3Rpb24gZ2V0QXV0aGVudGljYXRpb25FbmRwb2ludCgpIHtcbiAgICBpZiAoc3RhdGUuc2Vzc2lvbkVuZHBvaW50QnlVc2VyKSB7XG4gICAgICByZXR1cm4gU3RvcmUuZ2V0RnVsbEJhc2VVcmwoKSArIHN0YXRlLmNvbmZpZ3VyYXRpb24uc2Vzc2lvbkVuZHBvaW50O1xuICAgIH1cblxuICAgIHJldHVybiBTdG9yZS5nZXRGdWxsQmFzZVVybCgpICsgc3RhdGUuY29uZmlndXJhdGlvbi5zZXNzaW9uRW5kcG9pbnQ7XG4gIH0sXG4gIGdldFN3aXRjaEFjY291bnRFbmRwb2ludDogZnVuY3Rpb24gZ2V0U3dpdGNoQWNjb3VudEVuZHBvaW50KGFjY291bnRJZCkge1xuICAgIHJldHVybiBTdG9yZS5nZXRGdWxsQmFzZVVybCgpICsgJ2FjY291bnRzL3N3aXRjaC8nICsgYWNjb3VudElkO1xuICB9LFxuICBnZXRBcHBzRW5kcG9pbnQ6IGZ1bmN0aW9uIGdldEFwcHNFbmRwb2ludCgpIHtcbiAgICByZXR1cm4gU3RvcmUuZ2V0RnVsbEJhc2VVcmwoKSArICdhcHBzJztcbiAgfSxcbiAgZ2V0Q2xvdWRpbmFyeUVuZHBvaW50OiBmdW5jdGlvbiBnZXRDbG91ZGluYXJ5RW5kcG9pbnQoKSB7XG4gICAgcmV0dXJuIFN0b3JlLmdldEZ1bGxCYXNlVXJsKCkgKyAnYXNzZXRzJztcbiAgfSxcbiAgbG9nc0VuYWJsZWQ6IGZ1bmN0aW9uIGxvZ3NFbmFibGVkKCkge1xuICAgIHJldHVybiBzdGF0ZS5jb25maWd1cmF0aW9uLmxvZ3M7XG4gIH0sXG4gIGdldFNlYXJjaElucHV0SWQ6IGZ1bmN0aW9uIGdldFNlYXJjaElucHV0SWQoKSB7XG4gICAgcmV0dXJuIHN0YXRlLmNvbmZpZ3VyYXRpb24uc2VhcmNoSW5wdXRJZDtcbiAgfSxcbiAgc2V0SFRNTENvbnRhaW5lcjogZnVuY3Rpb24gc2V0SFRNTENvbnRhaW5lcihpZCkge1xuICAgIHN0YXRlLmNvbmZpZ3VyYXRpb24uaGVhZGVyRGl2SWQgPSBpZDtcbiAgfSxcbiAgZ2V0SFRMTUNvbnRhaW5lcjogZnVuY3Rpb24gZ2V0SFRMTUNvbnRhaW5lcigpIHtcbiAgICBpZiAoc3RhdGUuY29uZmlndXJhdGlvbi5oZWFkZXJEaXZJZCkge1xuICAgICAgcmV0dXJuIHN0YXRlLmNvbmZpZ3VyYXRpb24uaGVhZGVyRGl2SWQ7XG4gICAgfSBlbHNlIHtcbiAgICAgIHJldHVybiBcInBwc2RrLWNvbnRhaW5lclwiO1xuICAgIH1cbiAgfSxcbiAgZ2V0SFRNTDogZnVuY3Rpb24gZ2V0SFRNTCgpIHtcbiAgICByZXR1cm4gc3RhdGUuaHRtbFRlbXBsYXRlO1xuICB9LFxuICBzZXRTZXNzaW9uRW5kcG9pbnQ6IGZ1bmN0aW9uIHNldFNlc3Npb25FbmRwb2ludChzZXNzaW9uRW5kcG9pbnQpIHtcbiAgICBpZiAoc2Vzc2lvbkVuZHBvaW50LmluZGV4T2YoJy8nKSA9PT0gMCkge1xuICAgICAgc2Vzc2lvbkVuZHBvaW50ID0gc2Vzc2lvbkVuZHBvaW50LnN1YnN0cmluZygxLCBzZXNzaW9uRW5kcG9pbnQubGVuZ3RoIC0gMSk7XG4gICAgfVxuXG4gICAgc3RhdGUuc2Vzc2lvbkVuZHBvaW50QnlVc2VyID0gdHJ1ZTtcbiAgICBzdGF0ZS5jb25maWd1cmF0aW9uLnNlc3Npb25FbmRwb2ludCA9IHNlc3Npb25FbmRwb2ludDtcbiAgfSxcbiAgZ2V0V2luZG93TmFtZTogZnVuY3Rpb24gZ2V0V2luZG93TmFtZSgpIHtcbiAgICByZXR1cm4gc3RhdGUuZ2VuZXJhbC53aW5kb3dOYW1lO1xuICB9LFxuICBnZXRGdWxsV2lkdGg6IGZ1bmN0aW9uIGdldEZ1bGxXaWR0aCgpIHtcbiAgICByZXR1cm4gc3RhdGUuZ2VuZXJhbC5mdWxsV2lkdGg7XG4gIH0sXG4gIGdldERpc3BsYXlTdXBwb3J0OiBmdW5jdGlvbiBnZXREaXNwbGF5U3VwcG9ydCgpIHtcbiAgICByZXR1cm4gc3RhdGUuZ2VuZXJhbC5kaXNwbGF5U3VwcG9ydDtcbiAgfSxcbiAgc2V0VXNlckRhdGE6IGZ1bmN0aW9uIHNldFVzZXJEYXRhKHVzZXJEYXRhKSB7XG4gICAgc3RhdGUudXNlckRhdGEgPSB1c2VyRGF0YTtcbiAgfSxcbiAgZ2V0VXNlckRhdGE6IGZ1bmN0aW9uIGdldFVzZXJEYXRhKCkge1xuICAgIHJldHVybiBzdGF0ZS51c2VyRGF0YTtcbiAgfSxcbiAgc2V0Um9vdFVybDogZnVuY3Rpb24gc2V0Um9vdFVybChyb290VXJsKSB7XG4gICAgc3RhdGUuY29uZmlndXJhdGlvbi5yb290VXJsID0gcm9vdFVybC5yZXBsYWNlKC9cXC8/JC8sICcvJyk7XG4gICAgO1xuICB9LFxuICBnZXRSb290VXJsOiBmdW5jdGlvbiBnZXRSb290VXJsKCkge1xuICAgIHJldHVybiBzdGF0ZS5jb25maWd1cmF0aW9uLnJvb3RVcmw7XG4gIH0sXG4gIGdldEF2YXRhclVwbG9hZFVybDogZnVuY3Rpb24gZ2V0QXZhdGFyVXBsb2FkVXJsKCkge1xuICAgIHJldHVybiBTdG9yZS5nZXRGdWxsQmFzZVVybCgpICsgJ2Fzc2V0cy91cGxvYWQnO1xuICB9LFxuICBnZXRBdmF0YXJVcGRhdGVVcmw6IGZ1bmN0aW9uIGdldEF2YXRhclVwZGF0ZVVybCgpIHtcbiAgICByZXR1cm4gU3RvcmUuZ2V0RnVsbEJhc2VVcmwoKSArICd1c2Vycy9hdmF0YXInO1xuICB9XG59O1xubW9kdWxlLmV4cG9ydHMgPSBTdG9yZTsiXX0=
