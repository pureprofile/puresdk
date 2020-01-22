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
 * version: 2.9.5
 * date: 2020-01-22
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
ppba.setVersionNumber('2.9.5');
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
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uLy4uL25vZGVfbW9kdWxlcy9icm93c2VyLXBhY2svX3ByZWx1ZGUuanMiLCIuLi8uLi9ub2RlX21vZHVsZXMvYXNhcC9icm93c2VyLXJhdy5qcyIsIi4uLy4uL25vZGVfbW9kdWxlcy9wcm9taXNlL2xpYi9jb3JlLmpzIiwiLi4vLi4vbm9kZV9tb2R1bGVzL3Byb21pc2UvbGliL2VzNi1leHRlbnNpb25zLmpzIiwiLi4vLi4vbm9kZV9tb2R1bGVzL3Byb21pc2UvbGliL3JlamVjdGlvbi10cmFja2luZy5qcyIsIlBQQkEuanMiLCJpbmRleC5qcyIsIm1vZHVsZXMvYWNjb3VudC1jb25zaXN0ZW5jeS1ndWFyZC5qcyIsIm1vZHVsZXMvYXZhdGFyLWNvbnRyb2xsZXIuanMiLCJtb2R1bGVzL2NhbGxlci5qcyIsIm1vZHVsZXMvY2xvdWRpbmFyeS1pbWFnZS1waWNrZXIuanMiLCJtb2R1bGVzL2RvbS5qcyIsIm1vZHVsZXMvaW5mby1jb250cm9sbGVyLmpzIiwibW9kdWxlcy9sb2dnZXIuanMiLCJtb2R1bGVzL3BhZ2luYXRpb24taGVscGVyLmpzIiwibW9kdWxlcy9wdWJzdWIuanMiLCJtb2R1bGVzL3N0b3JlLmpzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOztBQ0FBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7Ozs7QUMvTkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDck5BO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUMzR0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNoSEE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3ZaQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUMxQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUN0QkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDOUhBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDdkdBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQy9QQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDcEJBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ2xIQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3RCQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUN6REE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNwREE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBIiwiZmlsZSI6ImdlbmVyYXRlZC5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzQ29udGVudCI6WyIoZnVuY3Rpb24oKXtmdW5jdGlvbiByKGUsbix0KXtmdW5jdGlvbiBvKGksZil7aWYoIW5baV0pe2lmKCFlW2ldKXt2YXIgYz1cImZ1bmN0aW9uXCI9PXR5cGVvZiByZXF1aXJlJiZyZXF1aXJlO2lmKCFmJiZjKXJldHVybiBjKGksITApO2lmKHUpcmV0dXJuIHUoaSwhMCk7dmFyIGE9bmV3IEVycm9yKFwiQ2Fubm90IGZpbmQgbW9kdWxlICdcIitpK1wiJ1wiKTt0aHJvdyBhLmNvZGU9XCJNT0RVTEVfTk9UX0ZPVU5EXCIsYX12YXIgcD1uW2ldPXtleHBvcnRzOnt9fTtlW2ldWzBdLmNhbGwocC5leHBvcnRzLGZ1bmN0aW9uKHIpe3ZhciBuPWVbaV1bMV1bcl07cmV0dXJuIG8obnx8cil9LHAscC5leHBvcnRzLHIsZSxuLHQpfXJldHVybiBuW2ldLmV4cG9ydHN9Zm9yKHZhciB1PVwiZnVuY3Rpb25cIj09dHlwZW9mIHJlcXVpcmUmJnJlcXVpcmUsaT0wO2k8dC5sZW5ndGg7aSsrKW8odFtpXSk7cmV0dXJuIG99cmV0dXJuIHJ9KSgpIiwiXCJ1c2Ugc3RyaWN0XCI7XG5cbi8vIFVzZSB0aGUgZmFzdGVzdCBtZWFucyBwb3NzaWJsZSB0byBleGVjdXRlIGEgdGFzayBpbiBpdHMgb3duIHR1cm4sIHdpdGhcbi8vIHByaW9yaXR5IG92ZXIgb3RoZXIgZXZlbnRzIGluY2x1ZGluZyBJTywgYW5pbWF0aW9uLCByZWZsb3csIGFuZCByZWRyYXdcbi8vIGV2ZW50cyBpbiBicm93c2Vycy5cbi8vXG4vLyBBbiBleGNlcHRpb24gdGhyb3duIGJ5IGEgdGFzayB3aWxsIHBlcm1hbmVudGx5IGludGVycnVwdCB0aGUgcHJvY2Vzc2luZyBvZlxuLy8gc3Vic2VxdWVudCB0YXNrcy4gVGhlIGhpZ2hlciBsZXZlbCBgYXNhcGAgZnVuY3Rpb24gZW5zdXJlcyB0aGF0IGlmIGFuXG4vLyBleGNlcHRpb24gaXMgdGhyb3duIGJ5IGEgdGFzaywgdGhhdCB0aGUgdGFzayBxdWV1ZSB3aWxsIGNvbnRpbnVlIGZsdXNoaW5nIGFzXG4vLyBzb29uIGFzIHBvc3NpYmxlLCBidXQgaWYgeW91IHVzZSBgcmF3QXNhcGAgZGlyZWN0bHksIHlvdSBhcmUgcmVzcG9uc2libGUgdG9cbi8vIGVpdGhlciBlbnN1cmUgdGhhdCBubyBleGNlcHRpb25zIGFyZSB0aHJvd24gZnJvbSB5b3VyIHRhc2ssIG9yIHRvIG1hbnVhbGx5XG4vLyBjYWxsIGByYXdBc2FwLnJlcXVlc3RGbHVzaGAgaWYgYW4gZXhjZXB0aW9uIGlzIHRocm93bi5cbm1vZHVsZS5leHBvcnRzID0gcmF3QXNhcDtcbmZ1bmN0aW9uIHJhd0FzYXAodGFzaykge1xuICAgIGlmICghcXVldWUubGVuZ3RoKSB7XG4gICAgICAgIHJlcXVlc3RGbHVzaCgpO1xuICAgICAgICBmbHVzaGluZyA9IHRydWU7XG4gICAgfVxuICAgIC8vIEVxdWl2YWxlbnQgdG8gcHVzaCwgYnV0IGF2b2lkcyBhIGZ1bmN0aW9uIGNhbGwuXG4gICAgcXVldWVbcXVldWUubGVuZ3RoXSA9IHRhc2s7XG59XG5cbnZhciBxdWV1ZSA9IFtdO1xuLy8gT25jZSBhIGZsdXNoIGhhcyBiZWVuIHJlcXVlc3RlZCwgbm8gZnVydGhlciBjYWxscyB0byBgcmVxdWVzdEZsdXNoYCBhcmVcbi8vIG5lY2Vzc2FyeSB1bnRpbCB0aGUgbmV4dCBgZmx1c2hgIGNvbXBsZXRlcy5cbnZhciBmbHVzaGluZyA9IGZhbHNlO1xuLy8gYHJlcXVlc3RGbHVzaGAgaXMgYW4gaW1wbGVtZW50YXRpb24tc3BlY2lmaWMgbWV0aG9kIHRoYXQgYXR0ZW1wdHMgdG8ga2lja1xuLy8gb2ZmIGEgYGZsdXNoYCBldmVudCBhcyBxdWlja2x5IGFzIHBvc3NpYmxlLiBgZmx1c2hgIHdpbGwgYXR0ZW1wdCB0byBleGhhdXN0XG4vLyB0aGUgZXZlbnQgcXVldWUgYmVmb3JlIHlpZWxkaW5nIHRvIHRoZSBicm93c2VyJ3Mgb3duIGV2ZW50IGxvb3AuXG52YXIgcmVxdWVzdEZsdXNoO1xuLy8gVGhlIHBvc2l0aW9uIG9mIHRoZSBuZXh0IHRhc2sgdG8gZXhlY3V0ZSBpbiB0aGUgdGFzayBxdWV1ZS4gVGhpcyBpc1xuLy8gcHJlc2VydmVkIGJldHdlZW4gY2FsbHMgdG8gYGZsdXNoYCBzbyB0aGF0IGl0IGNhbiBiZSByZXN1bWVkIGlmXG4vLyBhIHRhc2sgdGhyb3dzIGFuIGV4Y2VwdGlvbi5cbnZhciBpbmRleCA9IDA7XG4vLyBJZiBhIHRhc2sgc2NoZWR1bGVzIGFkZGl0aW9uYWwgdGFza3MgcmVjdXJzaXZlbHksIHRoZSB0YXNrIHF1ZXVlIGNhbiBncm93XG4vLyB1bmJvdW5kZWQuIFRvIHByZXZlbnQgbWVtb3J5IGV4aGF1c3Rpb24sIHRoZSB0YXNrIHF1ZXVlIHdpbGwgcGVyaW9kaWNhbGx5XG4vLyB0cnVuY2F0ZSBhbHJlYWR5LWNvbXBsZXRlZCB0YXNrcy5cbnZhciBjYXBhY2l0eSA9IDEwMjQ7XG5cbi8vIFRoZSBmbHVzaCBmdW5jdGlvbiBwcm9jZXNzZXMgYWxsIHRhc2tzIHRoYXQgaGF2ZSBiZWVuIHNjaGVkdWxlZCB3aXRoXG4vLyBgcmF3QXNhcGAgdW5sZXNzIGFuZCB1bnRpbCBvbmUgb2YgdGhvc2UgdGFza3MgdGhyb3dzIGFuIGV4Y2VwdGlvbi5cbi8vIElmIGEgdGFzayB0aHJvd3MgYW4gZXhjZXB0aW9uLCBgZmx1c2hgIGVuc3VyZXMgdGhhdCBpdHMgc3RhdGUgd2lsbCByZW1haW5cbi8vIGNvbnNpc3RlbnQgYW5kIHdpbGwgcmVzdW1lIHdoZXJlIGl0IGxlZnQgb2ZmIHdoZW4gY2FsbGVkIGFnYWluLlxuLy8gSG93ZXZlciwgYGZsdXNoYCBkb2VzIG5vdCBtYWtlIGFueSBhcnJhbmdlbWVudHMgdG8gYmUgY2FsbGVkIGFnYWluIGlmIGFuXG4vLyBleGNlcHRpb24gaXMgdGhyb3duLlxuZnVuY3Rpb24gZmx1c2goKSB7XG4gICAgd2hpbGUgKGluZGV4IDwgcXVldWUubGVuZ3RoKSB7XG4gICAgICAgIHZhciBjdXJyZW50SW5kZXggPSBpbmRleDtcbiAgICAgICAgLy8gQWR2YW5jZSB0aGUgaW5kZXggYmVmb3JlIGNhbGxpbmcgdGhlIHRhc2suIFRoaXMgZW5zdXJlcyB0aGF0IHdlIHdpbGxcbiAgICAgICAgLy8gYmVnaW4gZmx1c2hpbmcgb24gdGhlIG5leHQgdGFzayB0aGUgdGFzayB0aHJvd3MgYW4gZXJyb3IuXG4gICAgICAgIGluZGV4ID0gaW5kZXggKyAxO1xuICAgICAgICBxdWV1ZVtjdXJyZW50SW5kZXhdLmNhbGwoKTtcbiAgICAgICAgLy8gUHJldmVudCBsZWFraW5nIG1lbW9yeSBmb3IgbG9uZyBjaGFpbnMgb2YgcmVjdXJzaXZlIGNhbGxzIHRvIGBhc2FwYC5cbiAgICAgICAgLy8gSWYgd2UgY2FsbCBgYXNhcGAgd2l0aGluIHRhc2tzIHNjaGVkdWxlZCBieSBgYXNhcGAsIHRoZSBxdWV1ZSB3aWxsXG4gICAgICAgIC8vIGdyb3csIGJ1dCB0byBhdm9pZCBhbiBPKG4pIHdhbGsgZm9yIGV2ZXJ5IHRhc2sgd2UgZXhlY3V0ZSwgd2UgZG9uJ3RcbiAgICAgICAgLy8gc2hpZnQgdGFza3Mgb2ZmIHRoZSBxdWV1ZSBhZnRlciB0aGV5IGhhdmUgYmVlbiBleGVjdXRlZC5cbiAgICAgICAgLy8gSW5zdGVhZCwgd2UgcGVyaW9kaWNhbGx5IHNoaWZ0IDEwMjQgdGFza3Mgb2ZmIHRoZSBxdWV1ZS5cbiAgICAgICAgaWYgKGluZGV4ID4gY2FwYWNpdHkpIHtcbiAgICAgICAgICAgIC8vIE1hbnVhbGx5IHNoaWZ0IGFsbCB2YWx1ZXMgc3RhcnRpbmcgYXQgdGhlIGluZGV4IGJhY2sgdG8gdGhlXG4gICAgICAgICAgICAvLyBiZWdpbm5pbmcgb2YgdGhlIHF1ZXVlLlxuICAgICAgICAgICAgZm9yICh2YXIgc2NhbiA9IDAsIG5ld0xlbmd0aCA9IHF1ZXVlLmxlbmd0aCAtIGluZGV4OyBzY2FuIDwgbmV3TGVuZ3RoOyBzY2FuKyspIHtcbiAgICAgICAgICAgICAgICBxdWV1ZVtzY2FuXSA9IHF1ZXVlW3NjYW4gKyBpbmRleF07XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBxdWV1ZS5sZW5ndGggLT0gaW5kZXg7XG4gICAgICAgICAgICBpbmRleCA9IDA7XG4gICAgICAgIH1cbiAgICB9XG4gICAgcXVldWUubGVuZ3RoID0gMDtcbiAgICBpbmRleCA9IDA7XG4gICAgZmx1c2hpbmcgPSBmYWxzZTtcbn1cblxuLy8gYHJlcXVlc3RGbHVzaGAgaXMgaW1wbGVtZW50ZWQgdXNpbmcgYSBzdHJhdGVneSBiYXNlZCBvbiBkYXRhIGNvbGxlY3RlZCBmcm9tXG4vLyBldmVyeSBhdmFpbGFibGUgU2F1Y2VMYWJzIFNlbGVuaXVtIHdlYiBkcml2ZXIgd29ya2VyIGF0IHRpbWUgb2Ygd3JpdGluZy5cbi8vIGh0dHBzOi8vZG9jcy5nb29nbGUuY29tL3NwcmVhZHNoZWV0cy9kLzFtRy01VVlHdXA1cXhHZEVNV2toUDZCV0N6MDUzTlViMkUxUW9VVFUxNnVBL2VkaXQjZ2lkPTc4MzcyNDU5M1xuXG4vLyBTYWZhcmkgNiBhbmQgNi4xIGZvciBkZXNrdG9wLCBpUGFkLCBhbmQgaVBob25lIGFyZSB0aGUgb25seSBicm93c2VycyB0aGF0XG4vLyBoYXZlIFdlYktpdE11dGF0aW9uT2JzZXJ2ZXIgYnV0IG5vdCB1bi1wcmVmaXhlZCBNdXRhdGlvbk9ic2VydmVyLlxuLy8gTXVzdCB1c2UgYGdsb2JhbGAgb3IgYHNlbGZgIGluc3RlYWQgb2YgYHdpbmRvd2AgdG8gd29yayBpbiBib3RoIGZyYW1lcyBhbmQgd2ViXG4vLyB3b3JrZXJzLiBgZ2xvYmFsYCBpcyBhIHByb3Zpc2lvbiBvZiBCcm93c2VyaWZ5LCBNciwgTXJzLCBvciBNb3AuXG5cbi8qIGdsb2JhbHMgc2VsZiAqL1xudmFyIHNjb3BlID0gdHlwZW9mIGdsb2JhbCAhPT0gXCJ1bmRlZmluZWRcIiA/IGdsb2JhbCA6IHNlbGY7XG52YXIgQnJvd3Nlck11dGF0aW9uT2JzZXJ2ZXIgPSBzY29wZS5NdXRhdGlvbk9ic2VydmVyIHx8IHNjb3BlLldlYktpdE11dGF0aW9uT2JzZXJ2ZXI7XG5cbi8vIE11dGF0aW9uT2JzZXJ2ZXJzIGFyZSBkZXNpcmFibGUgYmVjYXVzZSB0aGV5IGhhdmUgaGlnaCBwcmlvcml0eSBhbmQgd29ya1xuLy8gcmVsaWFibHkgZXZlcnl3aGVyZSB0aGV5IGFyZSBpbXBsZW1lbnRlZC5cbi8vIFRoZXkgYXJlIGltcGxlbWVudGVkIGluIGFsbCBtb2Rlcm4gYnJvd3NlcnMuXG4vL1xuLy8gLSBBbmRyb2lkIDQtNC4zXG4vLyAtIENocm9tZSAyNi0zNFxuLy8gLSBGaXJlZm94IDE0LTI5XG4vLyAtIEludGVybmV0IEV4cGxvcmVyIDExXG4vLyAtIGlQYWQgU2FmYXJpIDYtNy4xXG4vLyAtIGlQaG9uZSBTYWZhcmkgNy03LjFcbi8vIC0gU2FmYXJpIDYtN1xuaWYgKHR5cGVvZiBCcm93c2VyTXV0YXRpb25PYnNlcnZlciA9PT0gXCJmdW5jdGlvblwiKSB7XG4gICAgcmVxdWVzdEZsdXNoID0gbWFrZVJlcXVlc3RDYWxsRnJvbU11dGF0aW9uT2JzZXJ2ZXIoZmx1c2gpO1xuXG4vLyBNZXNzYWdlQ2hhbm5lbHMgYXJlIGRlc2lyYWJsZSBiZWNhdXNlIHRoZXkgZ2l2ZSBkaXJlY3QgYWNjZXNzIHRvIHRoZSBIVE1MXG4vLyB0YXNrIHF1ZXVlLCBhcmUgaW1wbGVtZW50ZWQgaW4gSW50ZXJuZXQgRXhwbG9yZXIgMTAsIFNhZmFyaSA1LjAtMSwgYW5kIE9wZXJhXG4vLyAxMS0xMiwgYW5kIGluIHdlYiB3b3JrZXJzIGluIG1hbnkgZW5naW5lcy5cbi8vIEFsdGhvdWdoIG1lc3NhZ2UgY2hhbm5lbHMgeWllbGQgdG8gYW55IHF1ZXVlZCByZW5kZXJpbmcgYW5kIElPIHRhc2tzLCB0aGV5XG4vLyB3b3VsZCBiZSBiZXR0ZXIgdGhhbiBpbXBvc2luZyB0aGUgNG1zIGRlbGF5IG9mIHRpbWVycy5cbi8vIEhvd2V2ZXIsIHRoZXkgZG8gbm90IHdvcmsgcmVsaWFibHkgaW4gSW50ZXJuZXQgRXhwbG9yZXIgb3IgU2FmYXJpLlxuXG4vLyBJbnRlcm5ldCBFeHBsb3JlciAxMCBpcyB0aGUgb25seSBicm93c2VyIHRoYXQgaGFzIHNldEltbWVkaWF0ZSBidXQgZG9lc1xuLy8gbm90IGhhdmUgTXV0YXRpb25PYnNlcnZlcnMuXG4vLyBBbHRob3VnaCBzZXRJbW1lZGlhdGUgeWllbGRzIHRvIHRoZSBicm93c2VyJ3MgcmVuZGVyZXIsIGl0IHdvdWxkIGJlXG4vLyBwcmVmZXJyYWJsZSB0byBmYWxsaW5nIGJhY2sgdG8gc2V0VGltZW91dCBzaW5jZSBpdCBkb2VzIG5vdCBoYXZlXG4vLyB0aGUgbWluaW11bSA0bXMgcGVuYWx0eS5cbi8vIFVuZm9ydHVuYXRlbHkgdGhlcmUgYXBwZWFycyB0byBiZSBhIGJ1ZyBpbiBJbnRlcm5ldCBFeHBsb3JlciAxMCBNb2JpbGUgKGFuZFxuLy8gRGVza3RvcCB0byBhIGxlc3NlciBleHRlbnQpIHRoYXQgcmVuZGVycyBib3RoIHNldEltbWVkaWF0ZSBhbmRcbi8vIE1lc3NhZ2VDaGFubmVsIHVzZWxlc3MgZm9yIHRoZSBwdXJwb3NlcyBvZiBBU0FQLlxuLy8gaHR0cHM6Ly9naXRodWIuY29tL2tyaXNrb3dhbC9xL2lzc3Vlcy8zOTZcblxuLy8gVGltZXJzIGFyZSBpbXBsZW1lbnRlZCB1bml2ZXJzYWxseS5cbi8vIFdlIGZhbGwgYmFjayB0byB0aW1lcnMgaW4gd29ya2VycyBpbiBtb3N0IGVuZ2luZXMsIGFuZCBpbiBmb3JlZ3JvdW5kXG4vLyBjb250ZXh0cyBpbiB0aGUgZm9sbG93aW5nIGJyb3dzZXJzLlxuLy8gSG93ZXZlciwgbm90ZSB0aGF0IGV2ZW4gdGhpcyBzaW1wbGUgY2FzZSByZXF1aXJlcyBudWFuY2VzIHRvIG9wZXJhdGUgaW4gYVxuLy8gYnJvYWQgc3BlY3RydW0gb2YgYnJvd3NlcnMuXG4vL1xuLy8gLSBGaXJlZm94IDMtMTNcbi8vIC0gSW50ZXJuZXQgRXhwbG9yZXIgNi05XG4vLyAtIGlQYWQgU2FmYXJpIDQuM1xuLy8gLSBMeW54IDIuOC43XG59IGVsc2Uge1xuICAgIHJlcXVlc3RGbHVzaCA9IG1ha2VSZXF1ZXN0Q2FsbEZyb21UaW1lcihmbHVzaCk7XG59XG5cbi8vIGByZXF1ZXN0Rmx1c2hgIHJlcXVlc3RzIHRoYXQgdGhlIGhpZ2ggcHJpb3JpdHkgZXZlbnQgcXVldWUgYmUgZmx1c2hlZCBhc1xuLy8gc29vbiBhcyBwb3NzaWJsZS5cbi8vIFRoaXMgaXMgdXNlZnVsIHRvIHByZXZlbnQgYW4gZXJyb3IgdGhyb3duIGluIGEgdGFzayBmcm9tIHN0YWxsaW5nIHRoZSBldmVudFxuLy8gcXVldWUgaWYgdGhlIGV4Y2VwdGlvbiBoYW5kbGVkIGJ5IE5vZGUuanPigJlzXG4vLyBgcHJvY2Vzcy5vbihcInVuY2F1Z2h0RXhjZXB0aW9uXCIpYCBvciBieSBhIGRvbWFpbi5cbnJhd0FzYXAucmVxdWVzdEZsdXNoID0gcmVxdWVzdEZsdXNoO1xuXG4vLyBUbyByZXF1ZXN0IGEgaGlnaCBwcmlvcml0eSBldmVudCwgd2UgaW5kdWNlIGEgbXV0YXRpb24gb2JzZXJ2ZXIgYnkgdG9nZ2xpbmdcbi8vIHRoZSB0ZXh0IG9mIGEgdGV4dCBub2RlIGJldHdlZW4gXCIxXCIgYW5kIFwiLTFcIi5cbmZ1bmN0aW9uIG1ha2VSZXF1ZXN0Q2FsbEZyb21NdXRhdGlvbk9ic2VydmVyKGNhbGxiYWNrKSB7XG4gICAgdmFyIHRvZ2dsZSA9IDE7XG4gICAgdmFyIG9ic2VydmVyID0gbmV3IEJyb3dzZXJNdXRhdGlvbk9ic2VydmVyKGNhbGxiYWNrKTtcbiAgICB2YXIgbm9kZSA9IGRvY3VtZW50LmNyZWF0ZVRleHROb2RlKFwiXCIpO1xuICAgIG9ic2VydmVyLm9ic2VydmUobm9kZSwge2NoYXJhY3RlckRhdGE6IHRydWV9KTtcbiAgICByZXR1cm4gZnVuY3Rpb24gcmVxdWVzdENhbGwoKSB7XG4gICAgICAgIHRvZ2dsZSA9IC10b2dnbGU7XG4gICAgICAgIG5vZGUuZGF0YSA9IHRvZ2dsZTtcbiAgICB9O1xufVxuXG4vLyBUaGUgbWVzc2FnZSBjaGFubmVsIHRlY2huaXF1ZSB3YXMgZGlzY292ZXJlZCBieSBNYWx0ZSBVYmwgYW5kIHdhcyB0aGVcbi8vIG9yaWdpbmFsIGZvdW5kYXRpb24gZm9yIHRoaXMgbGlicmFyeS5cbi8vIGh0dHA6Ly93d3cubm9uYmxvY2tpbmcuaW8vMjAxMS8wNi93aW5kb3duZXh0dGljay5odG1sXG5cbi8vIFNhZmFyaSA2LjAuNSAoYXQgbGVhc3QpIGludGVybWl0dGVudGx5IGZhaWxzIHRvIGNyZWF0ZSBtZXNzYWdlIHBvcnRzIG9uIGFcbi8vIHBhZ2UncyBmaXJzdCBsb2FkLiBUaGFua2Z1bGx5LCB0aGlzIHZlcnNpb24gb2YgU2FmYXJpIHN1cHBvcnRzXG4vLyBNdXRhdGlvbk9ic2VydmVycywgc28gd2UgZG9uJ3QgbmVlZCB0byBmYWxsIGJhY2sgaW4gdGhhdCBjYXNlLlxuXG4vLyBmdW5jdGlvbiBtYWtlUmVxdWVzdENhbGxGcm9tTWVzc2FnZUNoYW5uZWwoY2FsbGJhY2spIHtcbi8vICAgICB2YXIgY2hhbm5lbCA9IG5ldyBNZXNzYWdlQ2hhbm5lbCgpO1xuLy8gICAgIGNoYW5uZWwucG9ydDEub25tZXNzYWdlID0gY2FsbGJhY2s7XG4vLyAgICAgcmV0dXJuIGZ1bmN0aW9uIHJlcXVlc3RDYWxsKCkge1xuLy8gICAgICAgICBjaGFubmVsLnBvcnQyLnBvc3RNZXNzYWdlKDApO1xuLy8gICAgIH07XG4vLyB9XG5cbi8vIEZvciByZWFzb25zIGV4cGxhaW5lZCBhYm92ZSwgd2UgYXJlIGFsc28gdW5hYmxlIHRvIHVzZSBgc2V0SW1tZWRpYXRlYFxuLy8gdW5kZXIgYW55IGNpcmN1bXN0YW5jZXMuXG4vLyBFdmVuIGlmIHdlIHdlcmUsIHRoZXJlIGlzIGFub3RoZXIgYnVnIGluIEludGVybmV0IEV4cGxvcmVyIDEwLlxuLy8gSXQgaXMgbm90IHN1ZmZpY2llbnQgdG8gYXNzaWduIGBzZXRJbW1lZGlhdGVgIHRvIGByZXF1ZXN0Rmx1c2hgIGJlY2F1c2Vcbi8vIGBzZXRJbW1lZGlhdGVgIG11c3QgYmUgY2FsbGVkICpieSBuYW1lKiBhbmQgdGhlcmVmb3JlIG11c3QgYmUgd3JhcHBlZCBpbiBhXG4vLyBjbG9zdXJlLlxuLy8gTmV2ZXIgZm9yZ2V0LlxuXG4vLyBmdW5jdGlvbiBtYWtlUmVxdWVzdENhbGxGcm9tU2V0SW1tZWRpYXRlKGNhbGxiYWNrKSB7XG4vLyAgICAgcmV0dXJuIGZ1bmN0aW9uIHJlcXVlc3RDYWxsKCkge1xuLy8gICAgICAgICBzZXRJbW1lZGlhdGUoY2FsbGJhY2spO1xuLy8gICAgIH07XG4vLyB9XG5cbi8vIFNhZmFyaSA2LjAgaGFzIGEgcHJvYmxlbSB3aGVyZSB0aW1lcnMgd2lsbCBnZXQgbG9zdCB3aGlsZSB0aGUgdXNlciBpc1xuLy8gc2Nyb2xsaW5nLiBUaGlzIHByb2JsZW0gZG9lcyBub3QgaW1wYWN0IEFTQVAgYmVjYXVzZSBTYWZhcmkgNi4wIHN1cHBvcnRzXG4vLyBtdXRhdGlvbiBvYnNlcnZlcnMsIHNvIHRoYXQgaW1wbGVtZW50YXRpb24gaXMgdXNlZCBpbnN0ZWFkLlxuLy8gSG93ZXZlciwgaWYgd2UgZXZlciBlbGVjdCB0byB1c2UgdGltZXJzIGluIFNhZmFyaSwgdGhlIHByZXZhbGVudCB3b3JrLWFyb3VuZFxuLy8gaXMgdG8gYWRkIGEgc2Nyb2xsIGV2ZW50IGxpc3RlbmVyIHRoYXQgY2FsbHMgZm9yIGEgZmx1c2guXG5cbi8vIGBzZXRUaW1lb3V0YCBkb2VzIG5vdCBjYWxsIHRoZSBwYXNzZWQgY2FsbGJhY2sgaWYgdGhlIGRlbGF5IGlzIGxlc3MgdGhhblxuLy8gYXBwcm94aW1hdGVseSA3IGluIHdlYiB3b3JrZXJzIGluIEZpcmVmb3ggOCB0aHJvdWdoIDE4LCBhbmQgc29tZXRpbWVzIG5vdFxuLy8gZXZlbiB0aGVuLlxuXG5mdW5jdGlvbiBtYWtlUmVxdWVzdENhbGxGcm9tVGltZXIoY2FsbGJhY2spIHtcbiAgICByZXR1cm4gZnVuY3Rpb24gcmVxdWVzdENhbGwoKSB7XG4gICAgICAgIC8vIFdlIGRpc3BhdGNoIGEgdGltZW91dCB3aXRoIGEgc3BlY2lmaWVkIGRlbGF5IG9mIDAgZm9yIGVuZ2luZXMgdGhhdFxuICAgICAgICAvLyBjYW4gcmVsaWFibHkgYWNjb21tb2RhdGUgdGhhdCByZXF1ZXN0LiBUaGlzIHdpbGwgdXN1YWxseSBiZSBzbmFwcGVkXG4gICAgICAgIC8vIHRvIGEgNCBtaWxpc2Vjb25kIGRlbGF5LCBidXQgb25jZSB3ZSdyZSBmbHVzaGluZywgdGhlcmUncyBubyBkZWxheVxuICAgICAgICAvLyBiZXR3ZWVuIGV2ZW50cy5cbiAgICAgICAgdmFyIHRpbWVvdXRIYW5kbGUgPSBzZXRUaW1lb3V0KGhhbmRsZVRpbWVyLCAwKTtcbiAgICAgICAgLy8gSG93ZXZlciwgc2luY2UgdGhpcyB0aW1lciBnZXRzIGZyZXF1ZW50bHkgZHJvcHBlZCBpbiBGaXJlZm94XG4gICAgICAgIC8vIHdvcmtlcnMsIHdlIGVubGlzdCBhbiBpbnRlcnZhbCBoYW5kbGUgdGhhdCB3aWxsIHRyeSB0byBmaXJlXG4gICAgICAgIC8vIGFuIGV2ZW50IDIwIHRpbWVzIHBlciBzZWNvbmQgdW50aWwgaXQgc3VjY2VlZHMuXG4gICAgICAgIHZhciBpbnRlcnZhbEhhbmRsZSA9IHNldEludGVydmFsKGhhbmRsZVRpbWVyLCA1MCk7XG5cbiAgICAgICAgZnVuY3Rpb24gaGFuZGxlVGltZXIoKSB7XG4gICAgICAgICAgICAvLyBXaGljaGV2ZXIgdGltZXIgc3VjY2VlZHMgd2lsbCBjYW5jZWwgYm90aCB0aW1lcnMgYW5kXG4gICAgICAgICAgICAvLyBleGVjdXRlIHRoZSBjYWxsYmFjay5cbiAgICAgICAgICAgIGNsZWFyVGltZW91dCh0aW1lb3V0SGFuZGxlKTtcbiAgICAgICAgICAgIGNsZWFySW50ZXJ2YWwoaW50ZXJ2YWxIYW5kbGUpO1xuICAgICAgICAgICAgY2FsbGJhY2soKTtcbiAgICAgICAgfVxuICAgIH07XG59XG5cbi8vIFRoaXMgaXMgZm9yIGBhc2FwLmpzYCBvbmx5LlxuLy8gSXRzIG5hbWUgd2lsbCBiZSBwZXJpb2RpY2FsbHkgcmFuZG9taXplZCB0byBicmVhayBhbnkgY29kZSB0aGF0IGRlcGVuZHMgb25cbi8vIGl0cyBleGlzdGVuY2UuXG5yYXdBc2FwLm1ha2VSZXF1ZXN0Q2FsbEZyb21UaW1lciA9IG1ha2VSZXF1ZXN0Q2FsbEZyb21UaW1lcjtcblxuLy8gQVNBUCB3YXMgb3JpZ2luYWxseSBhIG5leHRUaWNrIHNoaW0gaW5jbHVkZWQgaW4gUS4gVGhpcyB3YXMgZmFjdG9yZWQgb3V0XG4vLyBpbnRvIHRoaXMgQVNBUCBwYWNrYWdlLiBJdCB3YXMgbGF0ZXIgYWRhcHRlZCB0byBSU1ZQIHdoaWNoIG1hZGUgZnVydGhlclxuLy8gYW1lbmRtZW50cy4gVGhlc2UgZGVjaXNpb25zLCBwYXJ0aWN1bGFybHkgdG8gbWFyZ2luYWxpemUgTWVzc2FnZUNoYW5uZWwgYW5kXG4vLyB0byBjYXB0dXJlIHRoZSBNdXRhdGlvbk9ic2VydmVyIGltcGxlbWVudGF0aW9uIGluIGEgY2xvc3VyZSwgd2VyZSBpbnRlZ3JhdGVkXG4vLyBiYWNrIGludG8gQVNBUCBwcm9wZXIuXG4vLyBodHRwczovL2dpdGh1Yi5jb20vdGlsZGVpby9yc3ZwLmpzL2Jsb2IvY2RkZjcyMzI1NDZhOWNmODU4NTI0Yjc1Y2RlNmY5ZWRmNzI2MjBhNy9saWIvcnN2cC9hc2FwLmpzXG4iLCIndXNlIHN0cmljdCc7XG5cbnZhciBhc2FwID0gcmVxdWlyZSgnYXNhcC9yYXcnKTtcblxuZnVuY3Rpb24gbm9vcCgpIHt9XG5cbi8vIFN0YXRlczpcbi8vXG4vLyAwIC0gcGVuZGluZ1xuLy8gMSAtIGZ1bGZpbGxlZCB3aXRoIF92YWx1ZVxuLy8gMiAtIHJlamVjdGVkIHdpdGggX3ZhbHVlXG4vLyAzIC0gYWRvcHRlZCB0aGUgc3RhdGUgb2YgYW5vdGhlciBwcm9taXNlLCBfdmFsdWVcbi8vXG4vLyBvbmNlIHRoZSBzdGF0ZSBpcyBubyBsb25nZXIgcGVuZGluZyAoMCkgaXQgaXMgaW1tdXRhYmxlXG5cbi8vIEFsbCBgX2AgcHJlZml4ZWQgcHJvcGVydGllcyB3aWxsIGJlIHJlZHVjZWQgdG8gYF97cmFuZG9tIG51bWJlcn1gXG4vLyBhdCBidWlsZCB0aW1lIHRvIG9iZnVzY2F0ZSB0aGVtIGFuZCBkaXNjb3VyYWdlIHRoZWlyIHVzZS5cbi8vIFdlIGRvbid0IHVzZSBzeW1ib2xzIG9yIE9iamVjdC5kZWZpbmVQcm9wZXJ0eSB0byBmdWxseSBoaWRlIHRoZW1cbi8vIGJlY2F1c2UgdGhlIHBlcmZvcm1hbmNlIGlzbid0IGdvb2QgZW5vdWdoLlxuXG5cbi8vIHRvIGF2b2lkIHVzaW5nIHRyeS9jYXRjaCBpbnNpZGUgY3JpdGljYWwgZnVuY3Rpb25zLCB3ZVxuLy8gZXh0cmFjdCB0aGVtIHRvIGhlcmUuXG52YXIgTEFTVF9FUlJPUiA9IG51bGw7XG52YXIgSVNfRVJST1IgPSB7fTtcbmZ1bmN0aW9uIGdldFRoZW4ob2JqKSB7XG4gIHRyeSB7XG4gICAgcmV0dXJuIG9iai50aGVuO1xuICB9IGNhdGNoIChleCkge1xuICAgIExBU1RfRVJST1IgPSBleDtcbiAgICByZXR1cm4gSVNfRVJST1I7XG4gIH1cbn1cblxuZnVuY3Rpb24gdHJ5Q2FsbE9uZShmbiwgYSkge1xuICB0cnkge1xuICAgIHJldHVybiBmbihhKTtcbiAgfSBjYXRjaCAoZXgpIHtcbiAgICBMQVNUX0VSUk9SID0gZXg7XG4gICAgcmV0dXJuIElTX0VSUk9SO1xuICB9XG59XG5mdW5jdGlvbiB0cnlDYWxsVHdvKGZuLCBhLCBiKSB7XG4gIHRyeSB7XG4gICAgZm4oYSwgYik7XG4gIH0gY2F0Y2ggKGV4KSB7XG4gICAgTEFTVF9FUlJPUiA9IGV4O1xuICAgIHJldHVybiBJU19FUlJPUjtcbiAgfVxufVxuXG5tb2R1bGUuZXhwb3J0cyA9IFByb21pc2U7XG5cbmZ1bmN0aW9uIFByb21pc2UoZm4pIHtcbiAgaWYgKHR5cGVvZiB0aGlzICE9PSAnb2JqZWN0Jykge1xuICAgIHRocm93IG5ldyBUeXBlRXJyb3IoJ1Byb21pc2VzIG11c3QgYmUgY29uc3RydWN0ZWQgdmlhIG5ldycpO1xuICB9XG4gIGlmICh0eXBlb2YgZm4gIT09ICdmdW5jdGlvbicpIHtcbiAgICB0aHJvdyBuZXcgVHlwZUVycm9yKCdQcm9taXNlIGNvbnN0cnVjdG9yXFwncyBhcmd1bWVudCBpcyBub3QgYSBmdW5jdGlvbicpO1xuICB9XG4gIHRoaXMuX2ggPSAwO1xuICB0aGlzLl9pID0gMDtcbiAgdGhpcy5faiA9IG51bGw7XG4gIHRoaXMuX2sgPSBudWxsO1xuICBpZiAoZm4gPT09IG5vb3ApIHJldHVybjtcbiAgZG9SZXNvbHZlKGZuLCB0aGlzKTtcbn1cblByb21pc2UuX2wgPSBudWxsO1xuUHJvbWlzZS5fbSA9IG51bGw7XG5Qcm9taXNlLl9uID0gbm9vcDtcblxuUHJvbWlzZS5wcm90b3R5cGUudGhlbiA9IGZ1bmN0aW9uKG9uRnVsZmlsbGVkLCBvblJlamVjdGVkKSB7XG4gIGlmICh0aGlzLmNvbnN0cnVjdG9yICE9PSBQcm9taXNlKSB7XG4gICAgcmV0dXJuIHNhZmVUaGVuKHRoaXMsIG9uRnVsZmlsbGVkLCBvblJlamVjdGVkKTtcbiAgfVxuICB2YXIgcmVzID0gbmV3IFByb21pc2Uobm9vcCk7XG4gIGhhbmRsZSh0aGlzLCBuZXcgSGFuZGxlcihvbkZ1bGZpbGxlZCwgb25SZWplY3RlZCwgcmVzKSk7XG4gIHJldHVybiByZXM7XG59O1xuXG5mdW5jdGlvbiBzYWZlVGhlbihzZWxmLCBvbkZ1bGZpbGxlZCwgb25SZWplY3RlZCkge1xuICByZXR1cm4gbmV3IHNlbGYuY29uc3RydWN0b3IoZnVuY3Rpb24gKHJlc29sdmUsIHJlamVjdCkge1xuICAgIHZhciByZXMgPSBuZXcgUHJvbWlzZShub29wKTtcbiAgICByZXMudGhlbihyZXNvbHZlLCByZWplY3QpO1xuICAgIGhhbmRsZShzZWxmLCBuZXcgSGFuZGxlcihvbkZ1bGZpbGxlZCwgb25SZWplY3RlZCwgcmVzKSk7XG4gIH0pO1xufVxuZnVuY3Rpb24gaGFuZGxlKHNlbGYsIGRlZmVycmVkKSB7XG4gIHdoaWxlIChzZWxmLl9pID09PSAzKSB7XG4gICAgc2VsZiA9IHNlbGYuX2o7XG4gIH1cbiAgaWYgKFByb21pc2UuX2wpIHtcbiAgICBQcm9taXNlLl9sKHNlbGYpO1xuICB9XG4gIGlmIChzZWxmLl9pID09PSAwKSB7XG4gICAgaWYgKHNlbGYuX2ggPT09IDApIHtcbiAgICAgIHNlbGYuX2ggPSAxO1xuICAgICAgc2VsZi5fayA9IGRlZmVycmVkO1xuICAgICAgcmV0dXJuO1xuICAgIH1cbiAgICBpZiAoc2VsZi5faCA9PT0gMSkge1xuICAgICAgc2VsZi5faCA9IDI7XG4gICAgICBzZWxmLl9rID0gW3NlbGYuX2ssIGRlZmVycmVkXTtcbiAgICAgIHJldHVybjtcbiAgICB9XG4gICAgc2VsZi5fay5wdXNoKGRlZmVycmVkKTtcbiAgICByZXR1cm47XG4gIH1cbiAgaGFuZGxlUmVzb2x2ZWQoc2VsZiwgZGVmZXJyZWQpO1xufVxuXG5mdW5jdGlvbiBoYW5kbGVSZXNvbHZlZChzZWxmLCBkZWZlcnJlZCkge1xuICBhc2FwKGZ1bmN0aW9uKCkge1xuICAgIHZhciBjYiA9IHNlbGYuX2kgPT09IDEgPyBkZWZlcnJlZC5vbkZ1bGZpbGxlZCA6IGRlZmVycmVkLm9uUmVqZWN0ZWQ7XG4gICAgaWYgKGNiID09PSBudWxsKSB7XG4gICAgICBpZiAoc2VsZi5faSA9PT0gMSkge1xuICAgICAgICByZXNvbHZlKGRlZmVycmVkLnByb21pc2UsIHNlbGYuX2opO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgcmVqZWN0KGRlZmVycmVkLnByb21pc2UsIHNlbGYuX2opO1xuICAgICAgfVxuICAgICAgcmV0dXJuO1xuICAgIH1cbiAgICB2YXIgcmV0ID0gdHJ5Q2FsbE9uZShjYiwgc2VsZi5faik7XG4gICAgaWYgKHJldCA9PT0gSVNfRVJST1IpIHtcbiAgICAgIHJlamVjdChkZWZlcnJlZC5wcm9taXNlLCBMQVNUX0VSUk9SKTtcbiAgICB9IGVsc2Uge1xuICAgICAgcmVzb2x2ZShkZWZlcnJlZC5wcm9taXNlLCByZXQpO1xuICAgIH1cbiAgfSk7XG59XG5mdW5jdGlvbiByZXNvbHZlKHNlbGYsIG5ld1ZhbHVlKSB7XG4gIC8vIFByb21pc2UgUmVzb2x1dGlvbiBQcm9jZWR1cmU6IGh0dHBzOi8vZ2l0aHViLmNvbS9wcm9taXNlcy1hcGx1cy9wcm9taXNlcy1zcGVjI3RoZS1wcm9taXNlLXJlc29sdXRpb24tcHJvY2VkdXJlXG4gIGlmIChuZXdWYWx1ZSA9PT0gc2VsZikge1xuICAgIHJldHVybiByZWplY3QoXG4gICAgICBzZWxmLFxuICAgICAgbmV3IFR5cGVFcnJvcignQSBwcm9taXNlIGNhbm5vdCBiZSByZXNvbHZlZCB3aXRoIGl0c2VsZi4nKVxuICAgICk7XG4gIH1cbiAgaWYgKFxuICAgIG5ld1ZhbHVlICYmXG4gICAgKHR5cGVvZiBuZXdWYWx1ZSA9PT0gJ29iamVjdCcgfHwgdHlwZW9mIG5ld1ZhbHVlID09PSAnZnVuY3Rpb24nKVxuICApIHtcbiAgICB2YXIgdGhlbiA9IGdldFRoZW4obmV3VmFsdWUpO1xuICAgIGlmICh0aGVuID09PSBJU19FUlJPUikge1xuICAgICAgcmV0dXJuIHJlamVjdChzZWxmLCBMQVNUX0VSUk9SKTtcbiAgICB9XG4gICAgaWYgKFxuICAgICAgdGhlbiA9PT0gc2VsZi50aGVuICYmXG4gICAgICBuZXdWYWx1ZSBpbnN0YW5jZW9mIFByb21pc2VcbiAgICApIHtcbiAgICAgIHNlbGYuX2kgPSAzO1xuICAgICAgc2VsZi5faiA9IG5ld1ZhbHVlO1xuICAgICAgZmluYWxlKHNlbGYpO1xuICAgICAgcmV0dXJuO1xuICAgIH0gZWxzZSBpZiAodHlwZW9mIHRoZW4gPT09ICdmdW5jdGlvbicpIHtcbiAgICAgIGRvUmVzb2x2ZSh0aGVuLmJpbmQobmV3VmFsdWUpLCBzZWxmKTtcbiAgICAgIHJldHVybjtcbiAgICB9XG4gIH1cbiAgc2VsZi5faSA9IDE7XG4gIHNlbGYuX2ogPSBuZXdWYWx1ZTtcbiAgZmluYWxlKHNlbGYpO1xufVxuXG5mdW5jdGlvbiByZWplY3Qoc2VsZiwgbmV3VmFsdWUpIHtcbiAgc2VsZi5faSA9IDI7XG4gIHNlbGYuX2ogPSBuZXdWYWx1ZTtcbiAgaWYgKFByb21pc2UuX20pIHtcbiAgICBQcm9taXNlLl9tKHNlbGYsIG5ld1ZhbHVlKTtcbiAgfVxuICBmaW5hbGUoc2VsZik7XG59XG5mdW5jdGlvbiBmaW5hbGUoc2VsZikge1xuICBpZiAoc2VsZi5faCA9PT0gMSkge1xuICAgIGhhbmRsZShzZWxmLCBzZWxmLl9rKTtcbiAgICBzZWxmLl9rID0gbnVsbDtcbiAgfVxuICBpZiAoc2VsZi5faCA9PT0gMikge1xuICAgIGZvciAodmFyIGkgPSAwOyBpIDwgc2VsZi5fay5sZW5ndGg7IGkrKykge1xuICAgICAgaGFuZGxlKHNlbGYsIHNlbGYuX2tbaV0pO1xuICAgIH1cbiAgICBzZWxmLl9rID0gbnVsbDtcbiAgfVxufVxuXG5mdW5jdGlvbiBIYW5kbGVyKG9uRnVsZmlsbGVkLCBvblJlamVjdGVkLCBwcm9taXNlKXtcbiAgdGhpcy5vbkZ1bGZpbGxlZCA9IHR5cGVvZiBvbkZ1bGZpbGxlZCA9PT0gJ2Z1bmN0aW9uJyA/IG9uRnVsZmlsbGVkIDogbnVsbDtcbiAgdGhpcy5vblJlamVjdGVkID0gdHlwZW9mIG9uUmVqZWN0ZWQgPT09ICdmdW5jdGlvbicgPyBvblJlamVjdGVkIDogbnVsbDtcbiAgdGhpcy5wcm9taXNlID0gcHJvbWlzZTtcbn1cblxuLyoqXG4gKiBUYWtlIGEgcG90ZW50aWFsbHkgbWlzYmVoYXZpbmcgcmVzb2x2ZXIgZnVuY3Rpb24gYW5kIG1ha2Ugc3VyZVxuICogb25GdWxmaWxsZWQgYW5kIG9uUmVqZWN0ZWQgYXJlIG9ubHkgY2FsbGVkIG9uY2UuXG4gKlxuICogTWFrZXMgbm8gZ3VhcmFudGVlcyBhYm91dCBhc3luY2hyb255LlxuICovXG5mdW5jdGlvbiBkb1Jlc29sdmUoZm4sIHByb21pc2UpIHtcbiAgdmFyIGRvbmUgPSBmYWxzZTtcbiAgdmFyIHJlcyA9IHRyeUNhbGxUd28oZm4sIGZ1bmN0aW9uICh2YWx1ZSkge1xuICAgIGlmIChkb25lKSByZXR1cm47XG4gICAgZG9uZSA9IHRydWU7XG4gICAgcmVzb2x2ZShwcm9taXNlLCB2YWx1ZSk7XG4gIH0sIGZ1bmN0aW9uIChyZWFzb24pIHtcbiAgICBpZiAoZG9uZSkgcmV0dXJuO1xuICAgIGRvbmUgPSB0cnVlO1xuICAgIHJlamVjdChwcm9taXNlLCByZWFzb24pO1xuICB9KTtcbiAgaWYgKCFkb25lICYmIHJlcyA9PT0gSVNfRVJST1IpIHtcbiAgICBkb25lID0gdHJ1ZTtcbiAgICByZWplY3QocHJvbWlzZSwgTEFTVF9FUlJPUik7XG4gIH1cbn1cbiIsIid1c2Ugc3RyaWN0JztcblxuLy9UaGlzIGZpbGUgY29udGFpbnMgdGhlIEVTNiBleHRlbnNpb25zIHRvIHRoZSBjb3JlIFByb21pc2VzL0ErIEFQSVxuXG52YXIgUHJvbWlzZSA9IHJlcXVpcmUoJy4vY29yZS5qcycpO1xuXG5tb2R1bGUuZXhwb3J0cyA9IFByb21pc2U7XG5cbi8qIFN0YXRpYyBGdW5jdGlvbnMgKi9cblxudmFyIFRSVUUgPSB2YWx1ZVByb21pc2UodHJ1ZSk7XG52YXIgRkFMU0UgPSB2YWx1ZVByb21pc2UoZmFsc2UpO1xudmFyIE5VTEwgPSB2YWx1ZVByb21pc2UobnVsbCk7XG52YXIgVU5ERUZJTkVEID0gdmFsdWVQcm9taXNlKHVuZGVmaW5lZCk7XG52YXIgWkVSTyA9IHZhbHVlUHJvbWlzZSgwKTtcbnZhciBFTVBUWVNUUklORyA9IHZhbHVlUHJvbWlzZSgnJyk7XG5cbmZ1bmN0aW9uIHZhbHVlUHJvbWlzZSh2YWx1ZSkge1xuICB2YXIgcCA9IG5ldyBQcm9taXNlKFByb21pc2UuX24pO1xuICBwLl9pID0gMTtcbiAgcC5faiA9IHZhbHVlO1xuICByZXR1cm4gcDtcbn1cblByb21pc2UucmVzb2x2ZSA9IGZ1bmN0aW9uICh2YWx1ZSkge1xuICBpZiAodmFsdWUgaW5zdGFuY2VvZiBQcm9taXNlKSByZXR1cm4gdmFsdWU7XG5cbiAgaWYgKHZhbHVlID09PSBudWxsKSByZXR1cm4gTlVMTDtcbiAgaWYgKHZhbHVlID09PSB1bmRlZmluZWQpIHJldHVybiBVTkRFRklORUQ7XG4gIGlmICh2YWx1ZSA9PT0gdHJ1ZSkgcmV0dXJuIFRSVUU7XG4gIGlmICh2YWx1ZSA9PT0gZmFsc2UpIHJldHVybiBGQUxTRTtcbiAgaWYgKHZhbHVlID09PSAwKSByZXR1cm4gWkVSTztcbiAgaWYgKHZhbHVlID09PSAnJykgcmV0dXJuIEVNUFRZU1RSSU5HO1xuXG4gIGlmICh0eXBlb2YgdmFsdWUgPT09ICdvYmplY3QnIHx8IHR5cGVvZiB2YWx1ZSA9PT0gJ2Z1bmN0aW9uJykge1xuICAgIHRyeSB7XG4gICAgICB2YXIgdGhlbiA9IHZhbHVlLnRoZW47XG4gICAgICBpZiAodHlwZW9mIHRoZW4gPT09ICdmdW5jdGlvbicpIHtcbiAgICAgICAgcmV0dXJuIG5ldyBQcm9taXNlKHRoZW4uYmluZCh2YWx1ZSkpO1xuICAgICAgfVxuICAgIH0gY2F0Y2ggKGV4KSB7XG4gICAgICByZXR1cm4gbmV3IFByb21pc2UoZnVuY3Rpb24gKHJlc29sdmUsIHJlamVjdCkge1xuICAgICAgICByZWplY3QoZXgpO1xuICAgICAgfSk7XG4gICAgfVxuICB9XG4gIHJldHVybiB2YWx1ZVByb21pc2UodmFsdWUpO1xufTtcblxuUHJvbWlzZS5hbGwgPSBmdW5jdGlvbiAoYXJyKSB7XG4gIHZhciBhcmdzID0gQXJyYXkucHJvdG90eXBlLnNsaWNlLmNhbGwoYXJyKTtcblxuICByZXR1cm4gbmV3IFByb21pc2UoZnVuY3Rpb24gKHJlc29sdmUsIHJlamVjdCkge1xuICAgIGlmIChhcmdzLmxlbmd0aCA9PT0gMCkgcmV0dXJuIHJlc29sdmUoW10pO1xuICAgIHZhciByZW1haW5pbmcgPSBhcmdzLmxlbmd0aDtcbiAgICBmdW5jdGlvbiByZXMoaSwgdmFsKSB7XG4gICAgICBpZiAodmFsICYmICh0eXBlb2YgdmFsID09PSAnb2JqZWN0JyB8fCB0eXBlb2YgdmFsID09PSAnZnVuY3Rpb24nKSkge1xuICAgICAgICBpZiAodmFsIGluc3RhbmNlb2YgUHJvbWlzZSAmJiB2YWwudGhlbiA9PT0gUHJvbWlzZS5wcm90b3R5cGUudGhlbikge1xuICAgICAgICAgIHdoaWxlICh2YWwuX2kgPT09IDMpIHtcbiAgICAgICAgICAgIHZhbCA9IHZhbC5fajtcbiAgICAgICAgICB9XG4gICAgICAgICAgaWYgKHZhbC5faSA9PT0gMSkgcmV0dXJuIHJlcyhpLCB2YWwuX2opO1xuICAgICAgICAgIGlmICh2YWwuX2kgPT09IDIpIHJlamVjdCh2YWwuX2opO1xuICAgICAgICAgIHZhbC50aGVuKGZ1bmN0aW9uICh2YWwpIHtcbiAgICAgICAgICAgIHJlcyhpLCB2YWwpO1xuICAgICAgICAgIH0sIHJlamVjdCk7XG4gICAgICAgICAgcmV0dXJuO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgIHZhciB0aGVuID0gdmFsLnRoZW47XG4gICAgICAgICAgaWYgKHR5cGVvZiB0aGVuID09PSAnZnVuY3Rpb24nKSB7XG4gICAgICAgICAgICB2YXIgcCA9IG5ldyBQcm9taXNlKHRoZW4uYmluZCh2YWwpKTtcbiAgICAgICAgICAgIHAudGhlbihmdW5jdGlvbiAodmFsKSB7XG4gICAgICAgICAgICAgIHJlcyhpLCB2YWwpO1xuICAgICAgICAgICAgfSwgcmVqZWN0KTtcbiAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICAgIGFyZ3NbaV0gPSB2YWw7XG4gICAgICBpZiAoLS1yZW1haW5pbmcgPT09IDApIHtcbiAgICAgICAgcmVzb2x2ZShhcmdzKTtcbiAgICAgIH1cbiAgICB9XG4gICAgZm9yICh2YXIgaSA9IDA7IGkgPCBhcmdzLmxlbmd0aDsgaSsrKSB7XG4gICAgICByZXMoaSwgYXJnc1tpXSk7XG4gICAgfVxuICB9KTtcbn07XG5cblByb21pc2UucmVqZWN0ID0gZnVuY3Rpb24gKHZhbHVlKSB7XG4gIHJldHVybiBuZXcgUHJvbWlzZShmdW5jdGlvbiAocmVzb2x2ZSwgcmVqZWN0KSB7XG4gICAgcmVqZWN0KHZhbHVlKTtcbiAgfSk7XG59O1xuXG5Qcm9taXNlLnJhY2UgPSBmdW5jdGlvbiAodmFsdWVzKSB7XG4gIHJldHVybiBuZXcgUHJvbWlzZShmdW5jdGlvbiAocmVzb2x2ZSwgcmVqZWN0KSB7XG4gICAgdmFsdWVzLmZvckVhY2goZnVuY3Rpb24odmFsdWUpe1xuICAgICAgUHJvbWlzZS5yZXNvbHZlKHZhbHVlKS50aGVuKHJlc29sdmUsIHJlamVjdCk7XG4gICAgfSk7XG4gIH0pO1xufTtcblxuLyogUHJvdG90eXBlIE1ldGhvZHMgKi9cblxuUHJvbWlzZS5wcm90b3R5cGVbJ2NhdGNoJ10gPSBmdW5jdGlvbiAob25SZWplY3RlZCkge1xuICByZXR1cm4gdGhpcy50aGVuKG51bGwsIG9uUmVqZWN0ZWQpO1xufTtcbiIsIid1c2Ugc3RyaWN0JztcblxudmFyIFByb21pc2UgPSByZXF1aXJlKCcuL2NvcmUnKTtcblxudmFyIERFRkFVTFRfV0hJVEVMSVNUID0gW1xuICBSZWZlcmVuY2VFcnJvcixcbiAgVHlwZUVycm9yLFxuICBSYW5nZUVycm9yXG5dO1xuXG52YXIgZW5hYmxlZCA9IGZhbHNlO1xuZXhwb3J0cy5kaXNhYmxlID0gZGlzYWJsZTtcbmZ1bmN0aW9uIGRpc2FibGUoKSB7XG4gIGVuYWJsZWQgPSBmYWxzZTtcbiAgUHJvbWlzZS5fbCA9IG51bGw7XG4gIFByb21pc2UuX20gPSBudWxsO1xufVxuXG5leHBvcnRzLmVuYWJsZSA9IGVuYWJsZTtcbmZ1bmN0aW9uIGVuYWJsZShvcHRpb25zKSB7XG4gIG9wdGlvbnMgPSBvcHRpb25zIHx8IHt9O1xuICBpZiAoZW5hYmxlZCkgZGlzYWJsZSgpO1xuICBlbmFibGVkID0gdHJ1ZTtcbiAgdmFyIGlkID0gMDtcbiAgdmFyIGRpc3BsYXlJZCA9IDA7XG4gIHZhciByZWplY3Rpb25zID0ge307XG4gIFByb21pc2UuX2wgPSBmdW5jdGlvbiAocHJvbWlzZSkge1xuICAgIGlmIChcbiAgICAgIHByb21pc2UuX2kgPT09IDIgJiYgLy8gSVMgUkVKRUNURURcbiAgICAgIHJlamVjdGlvbnNbcHJvbWlzZS5fb11cbiAgICApIHtcbiAgICAgIGlmIChyZWplY3Rpb25zW3Byb21pc2UuX29dLmxvZ2dlZCkge1xuICAgICAgICBvbkhhbmRsZWQocHJvbWlzZS5fbyk7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICBjbGVhclRpbWVvdXQocmVqZWN0aW9uc1twcm9taXNlLl9vXS50aW1lb3V0KTtcbiAgICAgIH1cbiAgICAgIGRlbGV0ZSByZWplY3Rpb25zW3Byb21pc2UuX29dO1xuICAgIH1cbiAgfTtcbiAgUHJvbWlzZS5fbSA9IGZ1bmN0aW9uIChwcm9taXNlLCBlcnIpIHtcbiAgICBpZiAocHJvbWlzZS5faCA9PT0gMCkgeyAvLyBub3QgeWV0IGhhbmRsZWRcbiAgICAgIHByb21pc2UuX28gPSBpZCsrO1xuICAgICAgcmVqZWN0aW9uc1twcm9taXNlLl9vXSA9IHtcbiAgICAgICAgZGlzcGxheUlkOiBudWxsLFxuICAgICAgICBlcnJvcjogZXJyLFxuICAgICAgICB0aW1lb3V0OiBzZXRUaW1lb3V0KFxuICAgICAgICAgIG9uVW5oYW5kbGVkLmJpbmQobnVsbCwgcHJvbWlzZS5fbyksXG4gICAgICAgICAgLy8gRm9yIHJlZmVyZW5jZSBlcnJvcnMgYW5kIHR5cGUgZXJyb3JzLCB0aGlzIGFsbW9zdCBhbHdheXNcbiAgICAgICAgICAvLyBtZWFucyB0aGUgcHJvZ3JhbW1lciBtYWRlIGEgbWlzdGFrZSwgc28gbG9nIHRoZW0gYWZ0ZXIganVzdFxuICAgICAgICAgIC8vIDEwMG1zXG4gICAgICAgICAgLy8gb3RoZXJ3aXNlLCB3YWl0IDIgc2Vjb25kcyB0byBzZWUgaWYgdGhleSBnZXQgaGFuZGxlZFxuICAgICAgICAgIG1hdGNoV2hpdGVsaXN0KGVyciwgREVGQVVMVF9XSElURUxJU1QpXG4gICAgICAgICAgICA/IDEwMFxuICAgICAgICAgICAgOiAyMDAwXG4gICAgICAgICksXG4gICAgICAgIGxvZ2dlZDogZmFsc2VcbiAgICAgIH07XG4gICAgfVxuICB9O1xuICBmdW5jdGlvbiBvblVuaGFuZGxlZChpZCkge1xuICAgIGlmIChcbiAgICAgIG9wdGlvbnMuYWxsUmVqZWN0aW9ucyB8fFxuICAgICAgbWF0Y2hXaGl0ZWxpc3QoXG4gICAgICAgIHJlamVjdGlvbnNbaWRdLmVycm9yLFxuICAgICAgICBvcHRpb25zLndoaXRlbGlzdCB8fCBERUZBVUxUX1dISVRFTElTVFxuICAgICAgKVxuICAgICkge1xuICAgICAgcmVqZWN0aW9uc1tpZF0uZGlzcGxheUlkID0gZGlzcGxheUlkKys7XG4gICAgICBpZiAob3B0aW9ucy5vblVuaGFuZGxlZCkge1xuICAgICAgICByZWplY3Rpb25zW2lkXS5sb2dnZWQgPSB0cnVlO1xuICAgICAgICBvcHRpb25zLm9uVW5oYW5kbGVkKFxuICAgICAgICAgIHJlamVjdGlvbnNbaWRdLmRpc3BsYXlJZCxcbiAgICAgICAgICByZWplY3Rpb25zW2lkXS5lcnJvclxuICAgICAgICApO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgcmVqZWN0aW9uc1tpZF0ubG9nZ2VkID0gdHJ1ZTtcbiAgICAgICAgbG9nRXJyb3IoXG4gICAgICAgICAgcmVqZWN0aW9uc1tpZF0uZGlzcGxheUlkLFxuICAgICAgICAgIHJlamVjdGlvbnNbaWRdLmVycm9yXG4gICAgICAgICk7XG4gICAgICB9XG4gICAgfVxuICB9XG4gIGZ1bmN0aW9uIG9uSGFuZGxlZChpZCkge1xuICAgIGlmIChyZWplY3Rpb25zW2lkXS5sb2dnZWQpIHtcbiAgICAgIGlmIChvcHRpb25zLm9uSGFuZGxlZCkge1xuICAgICAgICBvcHRpb25zLm9uSGFuZGxlZChyZWplY3Rpb25zW2lkXS5kaXNwbGF5SWQsIHJlamVjdGlvbnNbaWRdLmVycm9yKTtcbiAgICAgIH0gZWxzZSBpZiAoIXJlamVjdGlvbnNbaWRdLm9uVW5oYW5kbGVkKSB7XG4gICAgICAgIGNvbnNvbGUud2FybihcbiAgICAgICAgICAnUHJvbWlzZSBSZWplY3Rpb24gSGFuZGxlZCAoaWQ6ICcgKyByZWplY3Rpb25zW2lkXS5kaXNwbGF5SWQgKyAnKTonXG4gICAgICAgICk7XG4gICAgICAgIGNvbnNvbGUud2FybihcbiAgICAgICAgICAnICBUaGlzIG1lYW5zIHlvdSBjYW4gaWdub3JlIGFueSBwcmV2aW91cyBtZXNzYWdlcyBvZiB0aGUgZm9ybSBcIlBvc3NpYmxlIFVuaGFuZGxlZCBQcm9taXNlIFJlamVjdGlvblwiIHdpdGggaWQgJyArXG4gICAgICAgICAgcmVqZWN0aW9uc1tpZF0uZGlzcGxheUlkICsgJy4nXG4gICAgICAgICk7XG4gICAgICB9XG4gICAgfVxuICB9XG59XG5cbmZ1bmN0aW9uIGxvZ0Vycm9yKGlkLCBlcnJvcikge1xuICBjb25zb2xlLndhcm4oJ1Bvc3NpYmxlIFVuaGFuZGxlZCBQcm9taXNlIFJlamVjdGlvbiAoaWQ6ICcgKyBpZCArICcpOicpO1xuICB2YXIgZXJyU3RyID0gKGVycm9yICYmIChlcnJvci5zdGFjayB8fCBlcnJvcikpICsgJyc7XG4gIGVyclN0ci5zcGxpdCgnXFxuJykuZm9yRWFjaChmdW5jdGlvbiAobGluZSkge1xuICAgIGNvbnNvbGUud2FybignICAnICsgbGluZSk7XG4gIH0pO1xufVxuXG5mdW5jdGlvbiBtYXRjaFdoaXRlbGlzdChlcnJvciwgbGlzdCkge1xuICByZXR1cm4gbGlzdC5zb21lKGZ1bmN0aW9uIChjbHMpIHtcbiAgICByZXR1cm4gZXJyb3IgaW5zdGFuY2VvZiBjbHM7XG4gIH0pO1xufSIsIlwidXNlIHN0cmljdFwiO1xuXG52YXIgTG9nZ2VyID0gcmVxdWlyZSgnLi9tb2R1bGVzL2xvZ2dlcicpO1xuXG52YXIgUHViU3ViID0gcmVxdWlyZSgnLi9tb2R1bGVzL3B1YnN1YicpO1xuXG52YXIgQ2FsbGVyID0gcmVxdWlyZSgnLi9tb2R1bGVzL2NhbGxlcicpO1xuXG52YXIgRG9tID0gcmVxdWlyZSgnLi9tb2R1bGVzL2RvbScpO1xuXG52YXIgSW5mb0NvbnRyb2xsZXIgPSByZXF1aXJlKCcuL21vZHVsZXMvaW5mby1jb250cm9sbGVyJyk7XG5cbnZhciBBdmF0YXJDb250cm9sbGVyID0gcmVxdWlyZSgnLi9tb2R1bGVzL2F2YXRhci1jb250cm9sbGVyJyk7XG5cbnZhciBTdG9yZSA9IHJlcXVpcmUoJy4vbW9kdWxlcy9zdG9yZScpO1xuXG52YXIgQ2xvdWRpbmFyeSA9IHJlcXVpcmUoJy4vbW9kdWxlcy9jbG91ZGluYXJ5LWltYWdlLXBpY2tlcicpO1xuXG52YXIgQUNHID0gcmVxdWlyZSgnLi9tb2R1bGVzL2FjY291bnQtY29uc2lzdGVuY3ktZ3VhcmQnKTtcblxudmFyIHBwYmFDb25mID0ge307XG5cbmZ1bmN0aW9uIGhleFRvUmdiKGhleCwgb3BhY2l0eSkge1xuICB2YXIgcmVzdWx0ID0gL14jPyhbYS1mXFxkXXsyfSkoW2EtZlxcZF17Mn0pKFthLWZcXGRdezJ9KSQvaS5leGVjKGhleCk7XG4gIHJldHVybiByZXN1bHQgPyBcInJnYmEoXCIuY29uY2F0KHBhcnNlSW50KHJlc3VsdFsxXSwgMTYpLCBcIiwgXCIpLmNvbmNhdChwYXJzZUludChyZXN1bHRbMl0sIDE2KSwgXCIsIFwiKS5jb25jYXQocGFyc2VJbnQocmVzdWx0WzNdLCAxNiksIFwiLCBcIikuY29uY2F0KG9wYWNpdHkgfHwgMSwgXCIpXCIpIDogbnVsbDtcbn1cblxuaWYgKHR5cGVvZiBQcm9taXNlID09PSAndW5kZWZpbmVkJykge1xuICByZXF1aXJlKCdwcm9taXNlL2xpYi9yZWplY3Rpb24tdHJhY2tpbmcnKS5lbmFibGUoKTtcblxuICB3aW5kb3cuUHJvbWlzZSA9IHJlcXVpcmUoJ3Byb21pc2UvbGliL2VzNi1leHRlbnNpb25zLmpzJyk7XG59XG5cbnZhciBhZnRlclJlbmRlciA9IGZ1bmN0aW9uIGFmdGVyUmVuZGVyKCkge1xuICBpZiAoU3RvcmUuZ2V0RnVsbFdpZHRoKCkgPT09IHRydWUpIHtcbiAgICBEb20uYWRkQ2xhc3MoZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoXCJiYWMtLXB1cmVzZGstYmFjLS1oZWFkZXItYXBwcy0tXCIpLCAnYmFjLS1mdWxsd2lkdGgnKTtcbiAgfVxuXG4gIGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKCdiYWMtLXB1cmVzZGstLWFwcHMtLW9wZW5lci0tJykuYWRkRXZlbnRMaXN0ZW5lcignY2xpY2snLCBmdW5jdGlvbiAoZSkge1xuICAgIGUucHJldmVudERlZmF1bHQoKTtcbiAgICBlLnN0b3BQcm9wYWdhdGlvbigpO1xuICAgIERvbS50b2dnbGVDbGFzcyhkb2N1bWVudC5nZXRFbGVtZW50QnlJZCgnYmFjLS1wdXJlc2RrLWFwcHMtY29udGFpbmVyLS0nKSwgJ2FjdGl2ZScpO1xuICB9KTtcbiAgZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoJ2JhYy0tdXNlci1hdmF0YXItdG9wJykuYWRkRXZlbnRMaXN0ZW5lcignY2xpY2snLCBmdW5jdGlvbiAoZSkge1xuICAgIGUuc3RvcFByb3BhZ2F0aW9uKCk7XG4gICAgRG9tLnJlbW92ZUNsYXNzKGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKCdiYWMtLXB1cmVzZGstYXBwcy1jb250YWluZXItLScpLCAnYWN0aXZlJyk7XG4gICAgRG9tLnRvZ2dsZUNsYXNzKGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKCdiYWMtLXB1cmVzZGstdXNlci1zaWRlYmFyLS0nKSwgJ2FjdGl2ZScpO1xuICB9KTtcbiAgd2luZG93LmFkZEV2ZW50TGlzdGVuZXIoJ2NsaWNrJywgZnVuY3Rpb24gKGUpIHtcbiAgICBEb20ucmVtb3ZlQ2xhc3MoZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoJ2JhYy0tcHVyZXNkay1hcHBzLWNvbnRhaW5lci0tJyksICdhY3RpdmUnKTtcbiAgICBEb20ucmVtb3ZlQ2xhc3MoZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoJ2JhYy0tcHVyZXNkay11c2VyLXNpZGViYXItLScpLCAnYWN0aXZlJyk7XG4gIH0pO1xuICBBdmF0YXJDb250cm9sbGVyLmluaXQoKTtcbiAgdmFyIHVzZXJEYXRhID0gU3RvcmUuZ2V0VXNlckRhdGEoKTtcbiAgQXZhdGFyQ29udHJvbGxlci5zZXRBdmF0YXIodXNlckRhdGEudXNlci5hdmF0YXJfdXJsKTtcbiAgSW5mb0NvbnRyb2xsZXIuaW5pdCgpO1xufTtcblxudmFyIFBQQkEgPSB7XG4gIHNldFdpbmRvd05hbWU6IGZ1bmN0aW9uIHNldFdpbmRvd05hbWUod24pIHtcbiAgICBTdG9yZS5zZXRXaW5kb3dOYW1lKHduKTtcbiAgfSxcbiAgc2V0Q29uZmlndXJhdGlvbjogZnVuY3Rpb24gc2V0Q29uZmlndXJhdGlvbihjb25mKSB7XG4gICAgU3RvcmUuc2V0Q29uZmlndXJhdGlvbihjb25mKTtcbiAgfSxcbiAgc2V0SFRNTFRlbXBsYXRlOiBmdW5jdGlvbiBzZXRIVE1MVGVtcGxhdGUodGVtcGxhdGUpIHtcbiAgICBTdG9yZS5zZXRIVE1MVGVtcGxhdGUodGVtcGxhdGUpO1xuICB9LFxuICBzZXRWZXJzaW9uTnVtYmVyOiBmdW5jdGlvbiBzZXRWZXJzaW9uTnVtYmVyKHZlcnNpb24pIHtcbiAgICBTdG9yZS5zZXRWZXJzaW9uTnVtYmVyKHZlcnNpb24pO1xuICB9LFxuICBpbml0OiBmdW5jdGlvbiBpbml0KGNvbmYpIHtcbiAgICBMb2dnZXIubG9nKCdpbml0aWFsaXppbmcgd2l0aCBjb25mOiAnLCBjb25mKTtcblxuICAgIGlmIChjb25mKSB7XG4gICAgICBpZiAoY29uZi5oZWFkZXJEaXZJZCkge1xuICAgICAgICBTdG9yZS5zZXRIVE1MQ29udGFpbmVyKGNvbmYuaGVhZGVyRGl2SWQpO1xuICAgICAgfVxuXG4gICAgICBpZiAoY29uZi5hcHBzVmlzaWJsZSAhPT0gbnVsbCkge1xuICAgICAgICBTdG9yZS5zZXRBcHBzVmlzaWJsZShjb25mLmFwcHNWaXNpYmxlKTtcbiAgICAgIH1cblxuICAgICAgaWYgKGNvbmYucm9vdFVybCkge1xuICAgICAgICBTdG9yZS5zZXRSb290VXJsKGNvbmYucm9vdFVybCk7XG4gICAgICB9XG5cbiAgICAgIGlmIChjb25mLmRldiA9PT0gdHJ1ZSkge1xuICAgICAgICBpZiAoY29uZi5kZXZLZXlzKSB7XG4gICAgICAgICAgQ2FsbGVyLnNldERldktleXMoY29uZi5kZXZLZXlzKTtcbiAgICAgICAgICBTdG9yZS5zZXREZXYodHJ1ZSk7XG4gICAgICAgIH1cbiAgICAgIH1cblxuICAgICAgaWYgKGNvbmYuZnVsbFdpZHRoKSB7XG4gICAgICAgIFN0b3JlLnNldEZ1bGxXaWR0aChjb25mLmZ1bGxXaWR0aCk7XG4gICAgICB9XG5cbiAgICAgIGlmIChjb25mLmRpc3BsYXlTdXBwb3J0KSB7XG4gICAgICAgIFN0b3JlLnNldERpc3BsYXlTdXBwb3J0KGNvbmYuZGlzcGxheVN1cHBvcnQpO1xuICAgICAgfVxuXG4gICAgICBpZiAoY29uZi5hcHBJbmZvKSB7XG4gICAgICAgIFN0b3JlLnNldEFwcEluZm8oY29uZi5hcHBJbmZvKTsgLy8gaWYgZ29vZ2xlIHRhZyBtYW5hZ2VyIGlzIHByZXNlbnQgaXQgd2lsbCBwdXNoIHRoZSB1c2VyJ3MgaW5mbyB0byBkYXRhTGF5ZXJcblxuICAgICAgICB0cnkge1xuICAgICAgICAgIGRhdGFMYXllci5wdXNoKHtcbiAgICAgICAgICAgICdhcHAnOiBjb25mLmFwcEluZm8ubmFtZVxuICAgICAgICAgIH0pO1xuICAgICAgICB9IGNhdGNoIChlKSB7Ly8gbm8gR29vZ2xlIFRhZyBoYXMgYmVlbiBzZXRcbiAgICAgICAgfVxuICAgICAgfVxuICAgICAgLyogb3B0aW9uYWwgc2Vzc2lvbiB1cmwgKi9cblxuXG4gICAgICBpZiAoY29uZi5zZXNzaW9uRW5kcG9pbnQpIHtcbiAgICAgICAgU3RvcmUuc2V0U2Vzc2lvbkVuZHBvaW50KGNvbmYuc2Vzc2lvbkVuZHBvaW50KTtcbiAgICAgIH1cblxuICAgICAgaWYgKGNvbmYuYXBpUm9vdEZvbGRlcikge1xuICAgICAgICBTdG9yZS5zZXRVcmxWZXJzaW9uUHJlZml4KGNvbmYuYXBpUm9vdEZvbGRlcik7XG4gICAgICB9XG4gICAgfVxuXG4gICAgcHBiYUNvbmYgPSBjb25mO1xuICAgIHJldHVybiB0cnVlO1xuICB9LFxuICBzZXR1cEdvb2dsZVRhZzogZnVuY3Rpb24gc2V0dXBHb29nbGVUYWcodXNlcikge1xuICAgIC8vIGlmIGdvb2dsZSB0YWcgbWFuYWdlciBpcyBwcmVzZW50IGl0IHdpbGwgcHVzaCB0aGUgdXNlcidzIGluZm8gdG8gZGF0YUxheWVyXG4gICAgdHJ5IHtcbiAgICAgIGRhdGFMYXllci5wdXNoKHtcbiAgICAgICAgJ3VzZXJJZCc6IHVzZXIuaWQsXG4gICAgICAgICd1c2VyJzogXCJcIi5jb25jYXQodXNlci5maXJzdG5hbWUsIFwiIFwiKS5jb25jYXQodXNlci5sYXN0bmFtZSksXG4gICAgICAgICd0ZW5hbnRfaWQnOiB1c2VyLnRlbmFudF9pZCxcbiAgICAgICAgJ3VzZXJUeXBlJzogdXNlci51c2VyX3R5cGUsXG4gICAgICAgICdhY2NvdW50SWQnOiB1c2VyLmFjY291bnRfaWQsXG4gICAgICAgICdhY2NvdW50TmFtZSc6IHVzZXIuYWNjb3VudC5uYW1lXG4gICAgICB9KTtcbiAgICB9IGNhdGNoIChlKSB7Ly8gbm8gR29vZ2xlIFRhZyBoYXMgYmVlbiBzZXRcbiAgICB9XG4gIH0sXG4gIGF1dGhlbnRpY2F0ZTogZnVuY3Rpb24gYXV0aGVudGljYXRlKF9zdWNjZXNzKSB7XG4gICAgdmFyIHNlbGYgPSBQUEJBO1xuICAgIENhbGxlci5tYWtlQ2FsbCh7XG4gICAgICB0eXBlOiAnR0VUJyxcbiAgICAgIGVuZHBvaW50OiBTdG9yZS5nZXRBdXRoZW50aWNhdGlvbkVuZHBvaW50KCksXG4gICAgICBjYWxsYmFja3M6IHtcbiAgICAgICAgc3VjY2VzczogZnVuY3Rpb24gc3VjY2VzcyhyZXN1bHQpIHtcbiAgICAgICAgICAvLyBMb2dnZXIubG9nKHJlc3VsdCk7XG4gICAgICAgICAgU3RvcmUuc2V0VXNlckRhdGEocmVzdWx0KTtcbiAgICAgICAgICBzZWxmLnJlbmRlcigpO1xuICAgICAgICAgIFBQQkEuZ2V0QXBwcygpO1xuICAgICAgICAgIEFDRy5pbml0aWFsaXNlKHJlc3VsdC51c2VyLmFjY291bnRfc2ZpZCwgZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgRG9tLnJlbW92ZUNsYXNzKGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKCdiYWMtLS1pbnZhbGlkLWFjY291bnQnKSwgJ2ludmFsaWQnKTtcbiAgICAgICAgICB9LCBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICBEb20uYWRkQ2xhc3MoZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoJ2JhYy0tLWludmFsaWQtYWNjb3VudCcpLCAnaW52YWxpZCcpO1xuICAgICAgICAgIH0pO1xuICAgICAgICAgIFBQQkEuc2V0dXBHb29nbGVUYWcocmVzdWx0LnVzZXIpO1xuXG4gICAgICAgICAgX3N1Y2Nlc3MocmVzdWx0KTtcbiAgICAgICAgfSxcbiAgICAgICAgZmFpbDogZnVuY3Rpb24gZmFpbChlcnIpIHtcbiAgICAgICAgICB3aW5kb3cubG9jYXRpb24uaHJlZiA9IFN0b3JlLmdldExvZ2luVXJsKCk7XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICB9KTtcbiAgfSxcbiAgYXV0aGVudGljYXRlUHJvbWlzZTogZnVuY3Rpb24gYXV0aGVudGljYXRlUHJvbWlzZSgpIHtcbiAgICB2YXIgc2VsZiA9IFBQQkE7XG4gICAgcmV0dXJuIENhbGxlci5wcm9taXNlQ2FsbCh7XG4gICAgICB0eXBlOiAnR0VUJyxcbiAgICAgIGVuZHBvaW50OiBTdG9yZS5nZXRBdXRoZW50aWNhdGlvbkVuZHBvaW50KCksXG4gICAgICBtaWRkbGV3YXJlczoge1xuICAgICAgICBzdWNjZXNzOiBmdW5jdGlvbiBzdWNjZXNzKHJlc3VsdCkge1xuICAgICAgICAgIC8vIExvZ2dlci5sb2cocmVzdWx0KTtcbiAgICAgICAgICBTdG9yZS5zZXRVc2VyRGF0YShyZXN1bHQpO1xuICAgICAgICAgIHNlbGYucmVuZGVyKCk7XG4gICAgICAgICAgUFBCQS5nZXRBcHBzKCk7XG4gICAgICAgICAgQUNHLmluaXRpYWxpc2UocmVzdWx0LnVzZXIuYWNjb3VudF9zZmlkLCBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICBEb20ucmVtb3ZlQ2xhc3MoZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoJ2JhYy0tLWludmFsaWQtYWNjb3VudCcpLCAnaW52YWxpZCcpO1xuICAgICAgICAgIH0sIGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgIERvbS5hZGRDbGFzcyhkb2N1bWVudC5nZXRFbGVtZW50QnlJZCgnYmFjLS0taW52YWxpZC1hY2NvdW50JyksICdpbnZhbGlkJyk7XG4gICAgICAgICAgfSk7XG4gICAgICAgICAgUFBCQS5zZXR1cEdvb2dsZVRhZyhyZXN1bHQudXNlcik7XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICB9KTtcbiAgfSxcbiAgZ2V0QXBwczogZnVuY3Rpb24gZ2V0QXBwcygpIHtcbiAgICBDYWxsZXIubWFrZUNhbGwoe1xuICAgICAgdHlwZTogJ0dFVCcsXG4gICAgICBlbmRwb2ludDogU3RvcmUuZ2V0QXBwc0VuZHBvaW50KCksXG4gICAgICBjYWxsYmFja3M6IHtcbiAgICAgICAgc3VjY2VzczogZnVuY3Rpb24gc3VjY2VzcyhyZXN1bHQpIHtcbiAgICAgICAgICBTdG9yZS5zZXRBcHBzKHJlc3VsdCk7XG4gICAgICAgICAgUFBCQS5yZW5kZXJBcHBzKHJlc3VsdC5hcHBzKTtcbiAgICAgICAgfSxcbiAgICAgICAgZmFpbDogZnVuY3Rpb24gZmFpbChlcnIpIHtcbiAgICAgICAgICB3aW5kb3cubG9jYXRpb24uaHJlZiA9IFN0b3JlLmdldExvZ2luVXJsKCk7XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICB9KTtcbiAgfSxcbiAgZ2V0QXZhaWxhYmxlTGlzdGVuZXJzOiBmdW5jdGlvbiBnZXRBdmFpbGFibGVMaXN0ZW5lcnMoKSB7XG4gICAgcmV0dXJuIFB1YlN1Yi5nZXRBdmFpbGFibGVMaXN0ZW5lcnMoKTtcbiAgfSxcbiAgc3Vic2NyaWJlTGlzdGVuZXI6IGZ1bmN0aW9uIHN1YnNjcmliZUxpc3RlbmVyKGV2ZW50dCwgZnVuY3QpIHtcbiAgICByZXR1cm4gUHViU3ViLnN1YnNjcmliZShldmVudHQsIGZ1bmN0KTtcbiAgfSxcbiAgZ2V0VXNlckRhdGE6IGZ1bmN0aW9uIGdldFVzZXJEYXRhKCkge1xuICAgIHJldHVybiBTdG9yZS5nZXRVc2VyRGF0YSgpO1xuICB9LFxuICBzZXRJbnB1dFBsYWNlaG9sZGVyOiBmdW5jdGlvbiBzZXRJbnB1dFBsYWNlaG9sZGVyKHR4dCkgey8vIGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKFN0b3JlLmdldFNlYXJjaElucHV0SWQoKSkucGxhY2Vob2xkZXIgPSB0eHQ7XG4gIH0sXG4gIGNoYW5nZUFjY291bnQ6IGZ1bmN0aW9uIGNoYW5nZUFjY291bnQoYWNjb3VudElkKSB7XG4gICAgQ2FsbGVyLm1ha2VDYWxsKHtcbiAgICAgIHR5cGU6ICdHRVQnLFxuICAgICAgZW5kcG9pbnQ6IFN0b3JlLmdldFN3aXRjaEFjY291bnRFbmRwb2ludChhY2NvdW50SWQpLFxuICAgICAgY2FsbGJhY2tzOiB7XG4gICAgICAgIHN1Y2Nlc3M6IGZ1bmN0aW9uIHN1Y2Nlc3MocmVzdWx0KSB7XG4gICAgICAgICAgQUNHLmNoYW5nZUFjY291bnQoYWNjb3VudElkKTtcbiAgICAgICAgICB3aW5kb3cubG9jYXRpb24uaHJlZiA9ICcvYXBwcyc7XG4gICAgICAgIH0sXG4gICAgICAgIGZhaWw6IGZ1bmN0aW9uIGZhaWwoZXJyKSB7XG4gICAgICAgICAgYWxlcnQoJ1NvcnJ5LCBzb21ldGhpbmcgd2VudCB3cm9uZyB3aXRoIHlvdXIgcmVxdWVzdC4gUGxlc2UgdHJ5IGFnYWluJyk7XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICB9KTtcbiAgfSxcbiAgcmVuZGVyQXBwczogZnVuY3Rpb24gcmVuZGVyQXBwcyhhcHBzKSB7XG4gICAgdmFyIGFwcFRlbXBsYXRlID0gZnVuY3Rpb24gYXBwVGVtcGxhdGUoYXBwKSB7XG4gICAgICByZXR1cm4gXCJcXG5cXHRcXHRcXHRcXHQ8YSBjbGFzcz1cXFwiYmFjLS1pbWFnZS1saW5rXFxcIiBocmVmPVxcXCJcIi5jb25jYXQoYXBwLmFwcGxpY2F0aW9uX3VybCwgXCJcXFwiIHN0eWxlPVxcXCJiYWNrZ3JvdW5kOiAjXCIpLmNvbmNhdChhcHAuY29sb3IsIFwiXFxcIj5cXG5cXHRcXHRcXHRcXHRcXHQ8aW1nIHNyYz1cXFwiXCIpLmNvbmNhdChhcHAuaWNvbiwgXCJcXFwiIC8+XFxuXFx0XFx0XFx0XFx0PC9hPlxcblxcdFxcdFxcdFxcdFxcblxcdFxcdFxcdFxcdDxkaXYgY2xhc3M9XFxcImJhYy0tcHVyZXNkay1hcHAtdGV4dC1jb250YWluZXJcXFwiPlxcblxcdFxcdFxcdFxcdFxcdDxhIGhyZWY9XFxcIlwiKS5jb25jYXQoYXBwLmFwcGxpY2F0aW9uX3VybCwgXCJcXFwiIGNsYXNzPVxcXCJiYWMtLWFwcC1uYW1lXFxcIj5cIikuY29uY2F0KGFwcC5uYW1lLCBcIjwvYT5cXG5cXHRcXHRcXHRcXHRcXHQ8YSBocmVmPVxcXCJcIikuY29uY2F0KGFwcC5hcHBsaWNhdGlvbl91cmwsIFwiXFxcIiBjbGFzcz1cXFwiYmFjLS1hcHAtZGVzY3JpcHRpb25cXFwiPlwiKS5jb25jYXQoYXBwLmRlc2NyID09PSBudWxsID8gJy0nIDogYXBwLmRlc2NyLCBcIjwvYT5cXG5cXHRcXHRcXHRcXHQ8L2Rpdj5cXG5cXHRcXHRcXHRcIik7XG4gICAgfTtcblxuICAgIGZvciAodmFyIGkgPSAwOyBpIDwgYXBwcy5sZW5ndGg7IGkrKykge1xuICAgICAgdmFyIGFwcCA9IGFwcHNbaV07XG4gICAgICB2YXIgZGl2ID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudChcImRpdlwiKTtcbiAgICAgIGRpdi5jbGFzc05hbWUgPSBcImJhYy0tYXBwc1wiO1xuICAgICAgZGl2LmlubmVySFRNTCA9IGFwcFRlbXBsYXRlKGFwcCk7IC8vIGNoZWNrIHRvIHNlZSBpZiB0aGUgdXNlciBoYXMgYWNjZXNzIHRvIHRoZSB0d28gbWFpbiBhcHBzIGFuZCByZW1vdmUgZGlzYWJsZWQgY2xhc3NcblxuICAgICAgaWYgKGFwcC5hcHBsaWNhdGlvbl91cmwgPT09ICcvYXBwL2dyb3VwcycpIHtcbiAgICAgICAgRG9tLnJlbW92ZUNsYXNzKGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKCdiYWMtLXB1cmVzZGstZ3JvdXBzLWxpbmstLScpLCAnZGlzYWJsZWQnKTtcbiAgICAgIH0gZWxzZSBpZiAoYXBwLmFwcGxpY2F0aW9uX3VybCA9PT0gJy9hcHAvY2FtcGFpZ25zJykge1xuICAgICAgICBEb20ucmVtb3ZlQ2xhc3MoZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoJ2JhYy0tcHVyZXNkay1jYW1wYWlnbnMtbGluay0tJyksICdkaXNhYmxlZCcpO1xuICAgICAgfVxuXG4gICAgICBkb2N1bWVudC5nZXRFbGVtZW50QnlJZChcImJhYy0tYXBzLWFjdHVhbC1jb250YWluZXJcIikuYXBwZW5kQ2hpbGQoZGl2KTtcbiAgICB9IC8vIGZpbmFsbHkgY2hlY2sgaWYgdGhlIHVzZXIgaXMgb24gYW55IG9mIHRoZSB0d28gbWFpbiBhcHBzXG5cblxuICAgIHZhciBhcHBJbmZvID0gU3RvcmUuZ2V0QXBwSW5mbygpO1xuXG4gICAgaWYgKGFwcEluZm8ucm9vdCA9PT0gXCIvYXBwL2dyb3Vwc1wiKSB7XG4gICAgICBEb20uYWRkQ2xhc3MoZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoJ2JhYy0tcHVyZXNkay1ncm91cHMtbGluay0tJyksICdzZWxlY3RlZCcpO1xuICAgIH0gZWxzZSBpZiAoYXBwSW5mby5yb290ID09PSBcIi9hcHAvY2FtcGFpZ25zXCIpIHtcbiAgICAgIERvbS5hZGRDbGFzcyhkb2N1bWVudC5nZXRFbGVtZW50QnlJZCgnYmFjLS1wdXJlc2RrLWNhbXBhaWducy1saW5rLS0nKSwgJ3NlbGVjdGVkJyk7XG4gICAgfVxuICB9LFxuICByZW5kZXJVc2VyOiBmdW5jdGlvbiByZW5kZXJVc2VyKHVzZXIpIHtcbiAgICB2YXIgdXNlclRlbXBsYXRlID0gZnVuY3Rpb24gdXNlclRlbXBsYXRlKHVzZXIpIHtcbiAgICAgIHJldHVybiBcIlxcblxcdFxcdFxcdFxcdDxkaXYgY2xhc3M9XFxcImJhYy0tdXNlci1pbWFnZVxcXCIgaWQ9XFxcImJhYy0tdXNlci1pbWFnZVxcXCI+XFxuXFx0XFx0XFx0XFx0XFx0PGkgY2xhc3M9XFxcImZhIGZhLWNhbWVyYVxcXCI+PC9pPlxcblxcdFxcdFxcdCAgIFxcdDxkaXYgaWQ9XFxcImJhYy0tdXNlci1pbWFnZS1maWxlXFxcIj48L2Rpdj5cXG5cXHRcXHRcXHQgICBcXHQ8ZGl2IGlkPVxcXCJiYWMtLXVzZXItaW1hZ2UtdXBsb2FkLXByb2dyZXNzXFxcIj5cXG5cXHRcXHRcXHQgICBcXHRcXHQ8c3ZnIHdpZHRoPSc2MHB4JyBoZWlnaHQ9JzYwcHgnIHhtbG5zPVxcXCJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2Z1xcXCIgdmlld0JveD1cXFwiMCAwIDEwMCAxMDBcXFwiIHByZXNlcnZlQXNwZWN0UmF0aW89XFxcInhNaWRZTWlkXFxcIiBjbGFzcz1cXFwidWlsLWRlZmF1bHRcXFwiPjxyZWN0IHg9XFxcIjBcXFwiIHk9XFxcIjBcXFwiIHdpZHRoPVxcXCIxMDBcXFwiIGhlaWdodD1cXFwiMTAwXFxcIiBmaWxsPVxcXCJub25lXFxcIiBjbGFzcz1cXFwiYmtcXFwiPjwvcmVjdD48cmVjdCAgeD0nNDYuNScgeT0nNDAnIHdpZHRoPSc3JyBoZWlnaHQ9JzIwJyByeD0nNScgcnk9JzUnIGZpbGw9JyNmZmZmZmYnIHRyYW5zZm9ybT0ncm90YXRlKDAgNTAgNTApIHRyYW5zbGF0ZSgwIC0zMCknPiAgPGFuaW1hdGUgYXR0cmlidXRlTmFtZT0nb3BhY2l0eScgZnJvbT0nMScgdG89JzAnIGR1cj0nMXMnIGJlZ2luPSctMXMnIHJlcGVhdENvdW50PSdpbmRlZmluaXRlJy8+PC9yZWN0PjxyZWN0ICB4PSc0Ni41JyB5PSc0MCcgd2lkdGg9JzcnIGhlaWdodD0nMjAnIHJ4PSc1JyByeT0nNScgZmlsbD0nI2ZmZmZmZicgdHJhbnNmb3JtPSdyb3RhdGUoMzAgNTAgNTApIHRyYW5zbGF0ZSgwIC0zMCknPiAgPGFuaW1hdGUgYXR0cmlidXRlTmFtZT0nb3BhY2l0eScgZnJvbT0nMScgdG89JzAnIGR1cj0nMXMnIGJlZ2luPSctMC45MTY2NjY2NjY2NjY2NjY2cycgcmVwZWF0Q291bnQ9J2luZGVmaW5pdGUnLz48L3JlY3Q+PHJlY3QgIHg9JzQ2LjUnIHk9JzQwJyB3aWR0aD0nNycgaGVpZ2h0PScyMCcgcng9JzUnIHJ5PSc1JyBmaWxsPScjZmZmZmZmJyB0cmFuc2Zvcm09J3JvdGF0ZSg2MCA1MCA1MCkgdHJhbnNsYXRlKDAgLTMwKSc+ICA8YW5pbWF0ZSBhdHRyaWJ1dGVOYW1lPSdvcGFjaXR5JyBmcm9tPScxJyB0bz0nMCcgZHVyPScxcycgYmVnaW49Jy0wLjgzMzMzMzMzMzMzMzMzMzRzJyByZXBlYXRDb3VudD0naW5kZWZpbml0ZScvPjwvcmVjdD48cmVjdCAgeD0nNDYuNScgeT0nNDAnIHdpZHRoPSc3JyBoZWlnaHQ9JzIwJyByeD0nNScgcnk9JzUnIGZpbGw9JyNmZmZmZmYnIHRyYW5zZm9ybT0ncm90YXRlKDkwIDUwIDUwKSB0cmFuc2xhdGUoMCAtMzApJz4gIDxhbmltYXRlIGF0dHJpYnV0ZU5hbWU9J29wYWNpdHknIGZyb209JzEnIHRvPScwJyBkdXI9JzFzJyBiZWdpbj0nLTAuNzVzJyByZXBlYXRDb3VudD0naW5kZWZpbml0ZScvPjwvcmVjdD48cmVjdCAgeD0nNDYuNScgeT0nNDAnIHdpZHRoPSc3JyBoZWlnaHQ9JzIwJyByeD0nNScgcnk9JzUnIGZpbGw9JyNmZmZmZmYnIHRyYW5zZm9ybT0ncm90YXRlKDEyMCA1MCA1MCkgdHJhbnNsYXRlKDAgLTMwKSc+ICA8YW5pbWF0ZSBhdHRyaWJ1dGVOYW1lPSdvcGFjaXR5JyBmcm9tPScxJyB0bz0nMCcgZHVyPScxcycgYmVnaW49Jy0wLjY2NjY2NjY2NjY2NjY2NjZzJyByZXBlYXRDb3VudD0naW5kZWZpbml0ZScvPjwvcmVjdD48cmVjdCAgeD0nNDYuNScgeT0nNDAnIHdpZHRoPSc3JyBoZWlnaHQ9JzIwJyByeD0nNScgcnk9JzUnIGZpbGw9JyNmZmZmZmYnIHRyYW5zZm9ybT0ncm90YXRlKDE1MCA1MCA1MCkgdHJhbnNsYXRlKDAgLTMwKSc+ICA8YW5pbWF0ZSBhdHRyaWJ1dGVOYW1lPSdvcGFjaXR5JyBmcm9tPScxJyB0bz0nMCcgZHVyPScxcycgYmVnaW49Jy0wLjU4MzMzMzMzMzMzMzMzMzRzJyByZXBlYXRDb3VudD0naW5kZWZpbml0ZScvPjwvcmVjdD48cmVjdCAgeD0nNDYuNScgeT0nNDAnIHdpZHRoPSc3JyBoZWlnaHQ9JzIwJyByeD0nNScgcnk9JzUnIGZpbGw9JyNmZmZmZmYnIHRyYW5zZm9ybT0ncm90YXRlKDE4MCA1MCA1MCkgdHJhbnNsYXRlKDAgLTMwKSc+ICA8YW5pbWF0ZSBhdHRyaWJ1dGVOYW1lPSdvcGFjaXR5JyBmcm9tPScxJyB0bz0nMCcgZHVyPScxcycgYmVnaW49Jy0wLjVzJyByZXBlYXRDb3VudD0naW5kZWZpbml0ZScvPjwvcmVjdD48cmVjdCAgeD0nNDYuNScgeT0nNDAnIHdpZHRoPSc3JyBoZWlnaHQ9JzIwJyByeD0nNScgcnk9JzUnIGZpbGw9JyNmZmZmZmYnIHRyYW5zZm9ybT0ncm90YXRlKDIxMCA1MCA1MCkgdHJhbnNsYXRlKDAgLTMwKSc+ICA8YW5pbWF0ZSBhdHRyaWJ1dGVOYW1lPSdvcGFjaXR5JyBmcm9tPScxJyB0bz0nMCcgZHVyPScxcycgYmVnaW49Jy0wLjQxNjY2NjY2NjY2NjY2NjdzJyByZXBlYXRDb3VudD0naW5kZWZpbml0ZScvPjwvcmVjdD48cmVjdCAgeD0nNDYuNScgeT0nNDAnIHdpZHRoPSc3JyBoZWlnaHQ9JzIwJyByeD0nNScgcnk9JzUnIGZpbGw9JyNmZmZmZmYnIHRyYW5zZm9ybT0ncm90YXRlKDI0MCA1MCA1MCkgdHJhbnNsYXRlKDAgLTMwKSc+ICA8YW5pbWF0ZSBhdHRyaWJ1dGVOYW1lPSdvcGFjaXR5JyBmcm9tPScxJyB0bz0nMCcgZHVyPScxcycgYmVnaW49Jy0wLjMzMzMzMzMzMzMzMzMzMzNzJyByZXBlYXRDb3VudD0naW5kZWZpbml0ZScvPjwvcmVjdD48cmVjdCAgeD0nNDYuNScgeT0nNDAnIHdpZHRoPSc3JyBoZWlnaHQ9JzIwJyByeD0nNScgcnk9JzUnIGZpbGw9JyNmZmZmZmYnIHRyYW5zZm9ybT0ncm90YXRlKDI3MCA1MCA1MCkgdHJhbnNsYXRlKDAgLTMwKSc+ICA8YW5pbWF0ZSBhdHRyaWJ1dGVOYW1lPSdvcGFjaXR5JyBmcm9tPScxJyB0bz0nMCcgZHVyPScxcycgYmVnaW49Jy0wLjI1cycgcmVwZWF0Q291bnQ9J2luZGVmaW5pdGUnLz48L3JlY3Q+PHJlY3QgIHg9JzQ2LjUnIHk9JzQwJyB3aWR0aD0nNycgaGVpZ2h0PScyMCcgcng9JzUnIHJ5PSc1JyBmaWxsPScjZmZmZmZmJyB0cmFuc2Zvcm09J3JvdGF0ZSgzMDAgNTAgNTApIHRyYW5zbGF0ZSgwIC0zMCknPiAgPGFuaW1hdGUgYXR0cmlidXRlTmFtZT0nb3BhY2l0eScgZnJvbT0nMScgdG89JzAnIGR1cj0nMXMnIGJlZ2luPSctMC4xNjY2NjY2NjY2NjY2NjY2NnMnIHJlcGVhdENvdW50PSdpbmRlZmluaXRlJy8+PC9yZWN0PjxyZWN0ICB4PSc0Ni41JyB5PSc0MCcgd2lkdGg9JzcnIGhlaWdodD0nMjAnIHJ4PSc1JyByeT0nNScgZmlsbD0nI2ZmZmZmZicgdHJhbnNmb3JtPSdyb3RhdGUoMzMwIDUwIDUwKSB0cmFuc2xhdGUoMCAtMzApJz4gIDxhbmltYXRlIGF0dHJpYnV0ZU5hbWU9J29wYWNpdHknIGZyb209JzEnIHRvPScwJyBkdXI9JzFzJyBiZWdpbj0nLTAuMDgzMzMzMzMzMzMzMzMzMzNzJyByZXBlYXRDb3VudD0naW5kZWZpbml0ZScvPjwvcmVjdD48L3N2Zz5cXG5cXHRcXHRcXHRcXHRcXHQ8L2Rpdj5cXG5cXHRcXHRcXHQgICA8L2Rpdj5cXG5cXHRcXHRcXHRcXHQ8ZGl2IGNsYXNzPVxcXCJiYWMtLXVzZXItbmFtZVxcXCI+XCIuY29uY2F0KHVzZXIuZmlyc3RuYW1lLCBcIiBcIikuY29uY2F0KHVzZXIubGFzdG5hbWUsIFwiPC9kaXY+XFxuXFx0XFx0XFx0XFx0PGRpdiBjbGFzcz1cXFwiYmFjLS11c2VyLWVtYWlsXFxcIj5cIikuY29uY2F0KHVzZXIuZW1haWwsIFwiPC9kaXY+XFxuXFx0XFx0XFx0XCIpO1xuICAgIH07XG5cbiAgICB2YXIgZGl2ID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudCgnZGl2Jyk7XG4gICAgZGl2LmNsYXNzTmFtZSA9IFwiYmFjLS11c2VyLXNpZGViYXItaW5mb1wiO1xuICAgIGRpdi5pbm5lckhUTUwgPSB1c2VyVGVtcGxhdGUodXNlcik7XG4gICAgZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoJ2JhYy0tcHVyZXNkay11c2VyLWRldGFpbHMtLScpLnByZXBlbmQoZGl2KTtcbiAgICBkb2N1bWVudC5nZXRFbGVtZW50QnlJZCgnYmFjLS1wdXJlc2RrLXVzZXItYXZhdGFyLS0nKS5pbm5lckhUTUwgPSB1c2VyLmZpcnN0bmFtZS5jaGFyQXQoMCkgKyB1c2VyLmxhc3RuYW1lLmNoYXJBdCgwKTtcbiAgfSxcbiAgcmVuZGVyQWNjb3VudHM6IGZ1bmN0aW9uIHJlbmRlckFjY291bnRzKGFjY291bnRzLCBjdXJyZW50QWNjb3VudCkge1xuICAgIC8vIExvZ2dlci5sb2coY3VycmVudEFjY291bnQpO1xuICAgIHZhciBhY2NvdW50c1RlbXBsYXRlID0gZnVuY3Rpb24gYWNjb3VudHNUZW1wbGF0ZShhY2NvdW50LCBpc1RoZVNlbGVjdGVkKSB7XG4gICAgICByZXR1cm4gXCJcXG5cXHRcXHRcXHRcXHQ8ZGl2IGNsYXNzPVxcXCJiYWMtLXVzZXItbGlzdC1pdGVtLWltYWdlXFxcIj5cXG5cXHRcXHRcXHRcXHRcXHQ8aW1nIHNyYz1cXFwiXCIuY29uY2F0KGFjY291bnQuc2RrX3NxdWFyZV9sb2dvX2ljb24sIFwiXFxcIiBhbHQ9XFxcIlxcXCI+XFxuXFx0XFx0XFx0XFx0PC9kaXY+XFxuXFx0XFx0XFx0XFx0PGRpdiBjbGFzcz1cXFwiYmFjLXVzZXItYXBwLWRldGFpbHNcXFwiPlxcblxcdFxcdFxcdFxcdFxcdCA8c3Bhbj5cIikuY29uY2F0KGFjY291bnQubmFtZSwgXCI8L3NwYW4+XFxuXFx0XFx0XFx0XFx0PC9kaXY+XFxuXFx0XFx0XFx0XFx0XCIpLmNvbmNhdChpc1RoZVNlbGVjdGVkID8gJzxkaXYgaWQ9XCJiYWMtLXNlbGVjdGVkLWFjb3VudC1pbmRpY2F0b3JcIiBjbGFzcz1cImJhYy0tc2VsZWN0ZWQtYWNvdW50LWluZGljYXRvclwiPjwvZGl2PicgOiAnJywgXCJcXG5cXHRcXHRcXHRcIik7XG4gICAgfTtcblxuICAgIHZhciBfbG9vcCA9IGZ1bmN0aW9uIF9sb29wKGkpIHtcbiAgICAgIHZhciBhY2NvdW50ID0gYWNjb3VudHNbaV07XG4gICAgICB2YXIgZGl2ID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudCgnZGl2Jyk7XG4gICAgICBkaXYuY2xhc3NOYW1lID0gJ2JhYy0tdXNlci1saXN0LWl0ZW0nO1xuICAgICAgZGl2LmlubmVySFRNTCA9IGFjY291bnRzVGVtcGxhdGUoYWNjb3VudCwgYWNjb3VudC5zZmlkID09PSBjdXJyZW50QWNjb3VudC5zZmlkKTtcblxuICAgICAgaWYgKGFjY291bnQuc2ZpZCA9PT0gY3VycmVudEFjY291bnQuc2ZpZCkge1xuICAgICAgICBkaXYuc3R5bGUuYmFja2dyb3VuZCA9IGhleFRvUmdiKCcjRkZGRkZGJywgMC44NSk7XG4gICAgICB9XG5cbiAgICAgIGRpdi5vbmNsaWNrID0gZnVuY3Rpb24gKGUpIHtcbiAgICAgICAgZS5wcmV2ZW50RGVmYXVsdCgpO1xuICAgICAgICBQUEJBLmNoYW5nZUFjY291bnQoYWNjb3VudC5zZmlkKTtcbiAgICAgIH07XG5cbiAgICAgIGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKCdiYWMtLXB1cmVzZGstdXNlci1idXNpbmVzc2VzLS0nKS5hcHBlbmRDaGlsZChkaXYpO1xuICAgIH07XG5cbiAgICBmb3IgKHZhciBpID0gMDsgaSA8IGFjY291bnRzLmxlbmd0aDsgaSsrKSB7XG4gICAgICBfbG9vcChpKTtcbiAgICB9XG4gIH0sXG4gIHJlbmRlckluZm9CbG9ja3M6IGZ1bmN0aW9uIHJlbmRlckluZm9CbG9ja3MoKSB7XG4gICAgSW5mb0NvbnRyb2xsZXIucmVuZGVySW5mb0Jsb2NrcygpO1xuICB9LFxuICByZW5kZXJWZXJzaW9uTnVtYmVyOiBmdW5jdGlvbiByZW5kZXJWZXJzaW9uTnVtYmVyKHZlcnNpb24pIHtcbiAgICBkb2N1bWVudC5nZXRFbGVtZW50QnlJZCgncHVyZXNkay12ZXJzaW9uLW51bWJlcicpLmlubmVySFRNTCA9IHZlcnNpb247XG4gIH0sXG4gIHJlbmRlclplbmRlc2s6IGZ1bmN0aW9uIHJlbmRlclplbmRlc2soKSB7XG4gICAgaWYgKFN0b3JlLmdldERpc3BsYXlTdXBwb3J0KCkpIHtcbiAgICAgIHZhciB6ZHNjcmlwdCA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoJ3NjcmlwdCcpO1xuICAgICAgemRzY3JpcHQuc3JjID0gXCJodHRwczovL3N0YXRpYy56ZGFzc2V0cy5jb20vZWtyL3NuaXBwZXQuanM/a2V5PTk4NjhjNzFkLTY3OTMtNDJhYS1iMmZhLTEyNDE5YzdiZDQ5OFwiO1xuICAgICAgemRzY3JpcHQuaWQgPSBcInplLXNuaXBwZXRcIjtcbiAgICAgIHpkc2NyaXB0LmFzeW5jID0gdHJ1ZTtcbiAgICAgIHpkc2NyaXB0LnR5cGUgPSAndGV4dC9qYXZhc2NyaXB0JztcbiAgICAgIGRvY3VtZW50LmdldEVsZW1lbnRzQnlUYWdOYW1lKCdoZWFkJylbMF0uYXBwZW5kQ2hpbGQoemRzY3JpcHQpO1xuICAgIH1cbiAgfSxcbiAgc3R5bGVBY2NvdW50OiBmdW5jdGlvbiBzdHlsZUFjY291bnQoYWNjb3VudCkge1xuICAgIHZhciBhcHBJbmZvID0gU3RvcmUuZ2V0QXBwSW5mbygpO1xuICAgIHZhciBsb2dvID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudCgnaW1nJyk7XG4gICAgbG9nby5zcmMgPSBhY2NvdW50LnNka19sb2dvX2ljb247XG4gICAgZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoJ2JhYy0tcHVyZXNkay1hY2NvdW50LWxvZ28tLScpLnByZXBlbmQobG9nbyk7XG5cbiAgICBkb2N1bWVudC5nZXRFbGVtZW50QnlJZCgnYmFjLS1wdXJlc2RrLWFjY291bnQtbG9nby0tJykub25jbGljayA9IGZ1bmN0aW9uIChlKSB7XG4gICAgICB3aW5kb3cubG9jYXRpb24uaHJlZiA9IFN0b3JlLmdldFJvb3RVcmwoKTtcbiAgICB9O1xuXG4gICAgZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoXCJhcHAtbmFtZS1saW5rLXRvLXJvb3RcIikuaHJlZiA9IFN0b3JlLmdldFJvb3RVcmwoKTtcbiAgICB2YXIgcmdiQmcgPSBoZXhUb1JnYihhY2NvdW50LnNka19iYWNrZ3JvdW5kX2NvbG9yLCAwLjE1KTtcbiAgICBkb2N1bWVudC5nZXRFbGVtZW50QnlJZCgnYmFjLS1wdXJlc2RrLWJhYy0taGVhZGVyLWFwcHMtLScpLnN0eWxlLmNzc1RleHQgPSBcImJhY2tncm91bmQ6ICNcIiArIGFjY291bnQuc2RrX2JhY2tncm91bmRfY29sb3I7XG4gICAgZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoJ2JhYy0tdXNlci1zaWRlYmFyLXdoaXRlLWJnJykuc3R5bGUuY3NzVGV4dCA9IFwiYmFja2dyb3VuZC1jb2xvcjogXCIgKyByZ2JCZzsgLy8gaWYoZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoJ2JhYy0tcHVyZXNkay1hcHBzLW5hbWUtLScpKXtcbiAgICAvLyBcdGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKCdiYWMtLXB1cmVzZGstYXBwcy1uYW1lLS0nKS5zdHlsZS5jc3NUZXh0ID0gXCJjb2xvcjogI1wiICsgYWNjb3VudC5zZGtfZm9udF9jb2xvcjtcbiAgICAvLyB9XG4gICAgLy8gaWYoZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoJ2JhYy0tc2VsZWN0ZWQtYWNvdW50LWluZGljYXRvcicpKXtcbiAgICAvLyBcdGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKCdiYWMtLXNlbGVjdGVkLWFjb3VudC1pbmRpY2F0b3InKS5zdHlsZS5jc3NUZXh0ID0gXCJiYWNrZ3JvdW5kOiAjXCIgKyBhY2NvdW50LnNka19mb250X2NvbG9yO1xuICAgIC8vIH1cbiAgfSxcbiAgZ29Ub0xvZ2luUGFnZTogZnVuY3Rpb24gZ29Ub0xvZ2luUGFnZSgpIHtcbiAgICB3aW5kb3cubG9jYXRpb24uaHJlZiA9IFN0b3JlLmdldExvZ2luVXJsKCk7XG4gIH0sXG5cbiAgLyogTE9BREVSICovXG4gIHNob3dMb2FkZXI6IGZ1bmN0aW9uIHNob3dMb2FkZXIoKSB7XG4gICAgRG9tLmFkZENsYXNzKGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKCdiYWMtLXB1cmVzZGstLWxvYWRlci0tJyksICdiYWMtLXB1cmVzZGstdmlzaWJsZScpO1xuICB9LFxuICBoaWRlTG9hZGVyOiBmdW5jdGlvbiBoaWRlTG9hZGVyKCkge1xuICAgIERvbS5yZW1vdmVDbGFzcyhkb2N1bWVudC5nZXRFbGVtZW50QnlJZCgnYmFjLS1wdXJlc2RrLS1sb2FkZXItLScpLCAnYmFjLS1wdXJlc2RrLXZpc2libGUnKTtcbiAgfSxcbiAgb3BlbkNsb3VkaW5hcnlQaWNrZXI6IGZ1bmN0aW9uIG9wZW5DbG91ZGluYXJ5UGlja2VyKG9wdGlvbnMpIHtcbiAgICBDbG91ZGluYXJ5Lm9wZW5Nb2RhbChvcHRpb25zKTtcbiAgfSxcblxuICAvKlxuICAgdHlwZTogb25lIG9mOlxuICAgLSBzdWNjZXNzXG4gICAtIGluZm9cbiAgIC0gd2FybmluZ1xuICAgLSBlcnJvclxuICAgdGV4dDogdGhlIHRleHQgdG8gZGlzcGxheVxuICAgb3B0aW9ucyAob3B0aW9uYWwpOiB7XG4gICBcdFx0aGlkZUluOiBtaWxsaXNlY29uZHMgdG8gaGlkZSBpdC4gLTEgZm9yIG5vdCBoaWRpbmcgaXQgYXQgYWxsLiBEZWZhdWx0IGlzIDUwMDBcbiAgIH1cbiAgICovXG4gIHNldEluZm86IGZ1bmN0aW9uIHNldEluZm8odHlwZSwgdGV4dCwgb3B0aW9ucykge1xuICAgIEluZm9Db250cm9sbGVyLnNob3dJbmZvKHR5cGUsIHRleHQsIG9wdGlvbnMpO1xuICB9LFxuICBzZXRUaXRsZUFuZEZhdmljb246IGZ1bmN0aW9uIHNldFRpdGxlQW5kRmF2aWNvbigpIHtcbiAgICB2YXIgZmF2bGluayA9IGRvY3VtZW50LnF1ZXJ5U2VsZWN0b3IoXCJsaW5rW3JlbCo9J2ljb24nXVwiKSB8fCBkb2N1bWVudC5jcmVhdGVFbGVtZW50KCdsaW5rJyk7XG4gICAgZmF2bGluay5ocmVmID0gJ2h0dHBzOi8vY2xvdWRjZG4ucHVyZXByb2ZpbGUuY29tL2ltYWdlL3VwbG9hZC92MS9fX2Fzc2V0c19tYXN0ZXJfXy9iMWEwYzMxNmFkN2Y0YTY3OWMyZWVlNjE1ODE0NDY2Yyc7XG4gICAgZmF2bGluay5yZWwgPSAnc2hvcnRjdXQgaWNvbic7XG4gICAgZG9jdW1lbnQuZ2V0RWxlbWVudHNCeVRhZ05hbWUoJ2hlYWQnKVswXS5hcHBlbmRDaGlsZChmYXZsaW5rKTtcbiAgICB2YXIgYXBwSW5mbyA9IFN0b3JlLmdldEFwcEluZm8oKTtcblxuICAgIGlmIChhcHBJbmZvICE9PSBudWxsKSB7XG4gICAgICBkb2N1bWVudC50aXRsZSA9IFwiUHVyZXByb2ZpbGUgQWNjZXNzIHwgXCIuY29uY2F0KGFwcEluZm8ubmFtZSk7XG4gICAgfSBlbHNlIHtcbiAgICAgIGRvY3VtZW50LnRpdGxlID0gXCJQdXJlcHJvZmlsZSBBY2Nlc3NcIjtcbiAgICB9XG4gIH0sXG4gIHJlbmRlcjogZnVuY3Rpb24gcmVuZGVyKCkge1xuICAgIHZhciB3aGVyZVRvID0gZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoU3RvcmUuZ2V0SFRMTUNvbnRhaW5lcigpKTtcblxuICAgIGlmICh3aGVyZVRvID09PSBudWxsKSB7XG4gICAgICBMb2dnZXIuZXJyb3IoJ3RoZSBjb250YWluZXIgd2l0aCBpZCBcIicgKyB3aGVyZVRvICsgJ1wiIGhhcyBub3QgYmVlbiBmb3VuZCBvbiB0aGUgZG9jdW1lbnQuIFRoZSBsaWJyYXJ5IGlzIGdvaW5nIHRvIGNyZWF0ZSBpdC4nKTtcbiAgICAgIHZhciBkaXYgPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KCdkaXYnKTtcbiAgICAgIGRpdi5pZCA9IFN0b3JlLmdldEhUTE1Db250YWluZXIoKTtcbiAgICAgIGRpdi5zdHlsZS53aWR0aCA9ICcxMDAlJztcbiAgICAgIGRpdi5zdHlsZS5oZWlnaHQgPSBcIjUwcHhcIjtcbiAgICAgIGRpdi5zdHlsZS5wb3NpdGlvbiA9IFwiZml4ZWRcIjtcbiAgICAgIGRpdi5zdHlsZS50b3AgPSBcIjBweFwiO1xuICAgICAgZGl2LnN0eWxlLnpJbmRleCA9IFwiMjE0NzQ4MzY0N1wiO1xuICAgICAgZG9jdW1lbnQuYm9keS5pbnNlcnRCZWZvcmUoZGl2LCBkb2N1bWVudC5ib2R5LmZpcnN0Q2hpbGQpO1xuICAgICAgd2hlcmVUbyA9IGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKFN0b3JlLmdldEhUTE1Db250YWluZXIoKSk7XG4gICAgfVxuXG4gICAgd2hlcmVUby5pbm5lckhUTUwgPSBTdG9yZS5nZXRIVE1MKCk7XG4gICAgUFBCQS5yZW5kZXJVc2VyKFN0b3JlLmdldFVzZXJEYXRhKCkudXNlcik7XG4gICAgUFBCQS5yZW5kZXJJbmZvQmxvY2tzKCk7XG4gICAgUFBCQS5yZW5kZXJBY2NvdW50cyhTdG9yZS5nZXRVc2VyRGF0YSgpLnVzZXIuYWNjb3VudHMsIFN0b3JlLmdldFVzZXJEYXRhKCkudXNlci5hY2NvdW50KTtcbiAgICBQUEJBLnJlbmRlclplbmRlc2soKTtcbiAgICBQUEJBLnN0eWxlQWNjb3VudChTdG9yZS5nZXRVc2VyRGF0YSgpLnVzZXIuYWNjb3VudCk7XG4gICAgUFBCQS5zZXRUaXRsZUFuZEZhdmljb24oKTtcbiAgICBQUEJBLnJlbmRlclZlcnNpb25OdW1iZXIoU3RvcmUuZ2V0VmVyc2lvbk51bWJlcigpKTtcblxuICAgIGlmIChTdG9yZS5nZXRBcHBzVmlzaWJsZSgpID09PSBmYWxzZSkge1xuICAgICAgZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoJ2JhYy0tcHVyZXNkay1hcHBzLXNlY3Rpb24tLScpLnN0eWxlLmNzc1RleHQgPSBcImRpc3BsYXk6bm9uZVwiO1xuICAgIH1cblxuICAgIGFmdGVyUmVuZGVyKCk7XG4gIH1cbn07XG5tb2R1bGUuZXhwb3J0cyA9IFBQQkE7IiwiXCJ1c2Ugc3RyaWN0XCI7XG5cbi8qIVxuICogUHVyZVByb2ZpbGUgUHVyZVByb2ZpbGUgQnVzaW5lc3MgQXBwcyBEZXZlbG9wbWVudCBTREtcbiAqXG4gKiB2ZXJzaW9uOiAyLjkuNVxuICogZGF0ZTogMjAyMC0wMS0yMlxuICpcbiAqIENvcHlyaWdodCAyMDE3LCBQdXJlUHJvZmlsZVxuICogUmVsZWFzZWQgdW5kZXIgTUlUIGxpY2Vuc2VcbiAqIGh0dHBzOi8vb3BlbnNvdXJjZS5vcmcvbGljZW5zZXMvTUlUXG4gKi9cbnZhciBwcGJhID0gcmVxdWlyZSgnLi9QUEJBJyk7XG5cbnBwYmEuc2V0V2luZG93TmFtZSgnUFVSRVNESycpO1xucHBiYS5zZXRDb25maWd1cmF0aW9uKHtcbiAgXCJsb2dzXCI6IGZhbHNlLFxuICBcInJvb3RVcmxcIjogXCIvXCIsXG4gIFwiYmFzZVVybFwiOiBcImFwaS92MS9cIixcbiAgXCJsb2dpblVybFwiOiBcInNpZ25pblwiLFxuICBcInNlYXJjaElucHV0SWRcIjogXCItLXB1cmVzZGstLXNlYXJjaC0taW5wdXQtLVwiLFxuICBcInJlZGlyZWN0VXJsUGFyYW1cIjogXCJyZWRpcmVjdF91cmxcIlxufSk7XG5wcGJhLnNldEhUTUxUZW1wbGF0ZShcIjxoZWFkZXIgY2xhc3M9XFxcImJhYy0taGVhZGVyLWFwcHNcXFwiIGlkPVxcXCJiYWMtLXB1cmVzZGstYmFjLS1oZWFkZXItYXBwcy0tXFxcIj5cXG4gICAgPGRpdiBjbGFzcz1cXFwiYmFjLS1jb250YWluZXJcXFwiPlxcbiAgICAgICAgPGRpdiBjbGFzcz1cXFwiYmFjLS1sb2dvXFxcIiBpZD1cXFwiYmFjLS1wdXJlc2RrLWFjY291bnQtbG9nby0tXFxcIj5cXG4gICAgICAgICAgICA8ZGl2IGNsYXNzPVxcXCJiYWMtLXB1cmVzZGstYXBwLW5hbWUtLVxcXCI+XFxuICAgICAgICAgICAgICAgIDxzdmcgd2lkdGg9XFxcIjhweFxcXCIgaGVpZ2h0PVxcXCIxMnB4XFxcIiB2aWV3Qm94PVxcXCIwIDAgOCAxMlxcXCIgdmVyc2lvbj1cXFwiMS4xXFxcIiB4bWxucz1cXFwiaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmdcXFwiIHhtbG5zOnhsaW5rPVxcXCJodHRwOi8vd3d3LnczLm9yZy8xOTk5L3hsaW5rXFxcIj5cXG4gICAgICAgICAgICAgICAgICAgIDxnIGlkPVxcXCJQUC1CQS1Qb3J0YWwtSG9tZV9EZXNrdG9wLXYyXFxcIiBzdHJva2U9XFxcIm5vbmVcXFwiIHN0cm9rZS13aWR0aD1cXFwiMVxcXCIgZmlsbD1cXFwibm9uZVxcXCIgZmlsbC1ydWxlPVxcXCJldmVub2RkXFxcIj5cXG4gICAgICAgICAgICAgICAgICAgICAgICA8ZyBpZD1cXFwiUFBDTS1MaXN0aW5nX0Nvbm5leGlvbl8wMV9NYXhfRFxcXCIgdHJhbnNmb3JtPVxcXCJ0cmFuc2xhdGUoLTE4MS4wMDAwMDAsIC03OC4wMDAwMDApXFxcIiBmaWxsPVxcXCIjMzMzMzMzXFxcIiBmaWxsLXJ1bGU9XFxcIm5vbnplcm9cXFwiPlxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICA8ZyBpZD1cXFwiZWxlbWVudHMtLy1zZGstLy1idXR0b24tY29weS0zLWVsZW1lbnRzLS8tc2RrLS8tYnV0dG9uXFxcIiB0cmFuc2Zvcm09XFxcInRyYW5zbGF0ZSgxNjQuMDAwMDAwLCA3MC4wMDAwMDApXFxcIj5cXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIDxnIGlkPVxcXCJpY29ucy9hcHBzL2NhbXBhaWducy1pY29ucy0vLWFwcHMtLy00MHg0MC0vLWJhY2stYXJyb3dcXFwiIHRyYW5zZm9ybT1cXFwidHJhbnNsYXRlKDExLjAwMDAwMCwgNC4wMDAwMDApXFxcIj5cXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICA8ZyBpZD1cXFwiZG93bmxvYWQtYXJyb3dcXFwiIHRyYW5zZm9ybT1cXFwidHJhbnNsYXRlKDYuNTAwMDAwLCA0LjAwMDAwMClcXFwiPlxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICA8cGF0aCBkPVxcXCJNLTAuODgyNzQwOTQ0LDIuNzc5NTc5ODkgQy0xLjI1MjcxMTMzLDIuNDA2ODA2NyAtMS44NTI1NTE4MywyLjQwNjgwNjcgLTIuMjIyNTIyMjEsMi43Nzk1Nzk4OSBDLTIuNTkyNDkyNiwzLjE1MjM1MzA4IC0yLjU5MjQ5MjYsMy43NTY3Mzc4MyAtMi4yMjI1MjIyMSw0LjEyOTUxMTAyIEwyLjgzMDEwOTM3LDkuMjIwNDIwMTEgQzMuMjAwMDc5NzUsOS41OTMxOTMzIDMuNzk5OTIwMjUsOS41OTMxOTMzIDQuMTY5ODkwNjMsOS4yMjA0MjAxMSBMOS4yMjI1MjIyMSw0LjEyOTUxMTAyIEM5LjU5MjQ5MjYsMy43NTY3Mzc4MyA5LjU5MjQ5MjYsMy4xNTIzNTMwOCA5LjIyMjUyMjIxLDIuNzc5NTc5ODkgQzguODUyNTUxODMsMi40MDY4MDY3IDguMjUyNzExMzMsMi40MDY4MDY3IDcuODgyNzQwOTQsMi43Nzk1Nzk4OSBMMy41LDcuMTk1NTIzNDIgTC0wLjg4Mjc0MDk0NCwyLjc3OTU3OTg5IFpcXFwiIGlkPVxcXCJQYXRoXFxcIiB0cmFuc2Zvcm09XFxcInRyYW5zbGF0ZSgzLjUwMDAwMCwgNi4wMDAwMDApIHJvdGF0ZSgtMjcwLjAwMDAwMCkgdHJhbnNsYXRlKC0zLjUwMDAwMCwgLTYuMDAwMDAwKSBcXFwiPjwvcGF0aD5cXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICA8L2c+XFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICA8L2c+XFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIDwvZz5cXG4gICAgICAgICAgICAgICAgICAgICAgICA8L2c+XFxuICAgICAgICAgICAgICAgICAgICA8L2c+XFxuICAgICAgICAgICAgICAgIDwvc3ZnPlxcbiAgICAgICAgICAgICAgICA8YSBocmVmPVxcXCIjXFxcIiBpZD1cXFwiYXBwLW5hbWUtbGluay10by1yb290XFxcIj5BcHAgUG9ydGFsPC9hPlxcbiAgICAgICAgICAgIDwvZGl2PlxcbiAgICAgICAgPC9kaXY+XFxuICAgICAgICA8ZGl2IGNsYXNzPVxcXCJiYWMtLXVzZXItYWN0aW9uc1xcXCI+XFxuICAgICAgICAgICAgPHN2ZyBpZD1cXFwiYmFjLS1wdXJlc2RrLS1sb2FkZXItLVxcXCIgd2lkdGg9XFxcIjM4XFxcIiBoZWlnaHQ9XFxcIjM4XFxcIiB2aWV3Qm94PVxcXCIwIDAgNDQgNDRcXFwiIHhtbG5zPVxcXCJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2Z1xcXCIgc3Ryb2tlPVxcXCIjZmZmXFxcIiBzdHlsZT1cXFwiXFxuICAgIG1hcmdpbi1yaWdodDogMTBweDtcXG5cXFwiPlxcbiAgICAgICAgICAgICAgICA8ZyBmaWxsPVxcXCJub25lXFxcIiBmaWxsLXJ1bGU9XFxcImV2ZW5vZGRcXFwiIHN0cm9rZS13aWR0aD1cXFwiMlxcXCI+XFxuICAgICAgICAgICAgICAgICAgICA8Y2lyY2xlIGN4PVxcXCIyMlxcXCIgY3k9XFxcIjIyXFxcIiByPVxcXCIxNi42NDM3XFxcIj5cXG4gICAgICAgICAgICAgICAgICAgICAgICA8YW5pbWF0ZSBhdHRyaWJ1dGVOYW1lPVxcXCJyXFxcIiBiZWdpbj1cXFwiMHNcXFwiIGR1cj1cXFwiMS44c1xcXCIgdmFsdWVzPVxcXCIxOyAyMFxcXCIgY2FsY01vZGU9XFxcInNwbGluZVxcXCIga2V5VGltZXM9XFxcIjA7IDFcXFwiIGtleVNwbGluZXM9XFxcIjAuMTY1LCAwLjg0LCAwLjQ0LCAxXFxcIiByZXBlYXRDb3VudD1cXFwiaW5kZWZpbml0ZVxcXCI+PC9hbmltYXRlPlxcbiAgICAgICAgICAgICAgICAgICAgICAgIDxhbmltYXRlIGF0dHJpYnV0ZU5hbWU9XFxcInN0cm9rZS1vcGFjaXR5XFxcIiBiZWdpbj1cXFwiMHNcXFwiIGR1cj1cXFwiMS44c1xcXCIgdmFsdWVzPVxcXCIxOyAwXFxcIiBjYWxjTW9kZT1cXFwic3BsaW5lXFxcIiBrZXlUaW1lcz1cXFwiMDsgMVxcXCIga2V5U3BsaW5lcz1cXFwiMC4zLCAwLjYxLCAwLjM1NSwgMVxcXCIgcmVwZWF0Q291bnQ9XFxcImluZGVmaW5pdGVcXFwiPjwvYW5pbWF0ZT5cXG4gICAgICAgICAgICAgICAgICAgIDwvY2lyY2xlPlxcbiAgICAgICAgICAgICAgICAgICAgPGNpcmNsZSBjeD1cXFwiMjJcXFwiIGN5PVxcXCIyMlxcXCIgcj1cXFwiMTkuOTI4MlxcXCI+XFxuICAgICAgICAgICAgICAgICAgICAgICAgPGFuaW1hdGUgYXR0cmlidXRlTmFtZT1cXFwiclxcXCIgYmVnaW49XFxcImJhYy0wLjlzXFxcIiBkdXI9XFxcIjEuOHNcXFwiIHZhbHVlcz1cXFwiMTsgMjBcXFwiIGNhbGNNb2RlPVxcXCJzcGxpbmVcXFwiIGtleVRpbWVzPVxcXCIwOyAxXFxcIiBrZXlTcGxpbmVzPVxcXCIwLjE2NSwgMC44NCwgMC40NCwgMVxcXCIgcmVwZWF0Q291bnQ9XFxcImluZGVmaW5pdGVcXFwiPjwvYW5pbWF0ZT5cXG4gICAgICAgICAgICAgICAgICAgICAgICA8YW5pbWF0ZSBhdHRyaWJ1dGVOYW1lPVxcXCJzdHJva2Utb3BhY2l0eVxcXCIgYmVnaW49XFxcImJhYy0wLjlzXFxcIiBkdXI9XFxcIjEuOHNcXFwiIHZhbHVlcz1cXFwiMTsgMFxcXCIgY2FsY01vZGU9XFxcInNwbGluZVxcXCIga2V5VGltZXM9XFxcIjA7IDFcXFwiIGtleVNwbGluZXM9XFxcIjAuMywgMC42MSwgMC4zNTUsIDFcXFwiIHJlcGVhdENvdW50PVxcXCJpbmRlZmluaXRlXFxcIj48L2FuaW1hdGU+XFxuICAgICAgICAgICAgICAgICAgICA8L2NpcmNsZT5cXG4gICAgICAgICAgICAgICAgPC9nPlxcbiAgICAgICAgICAgIDwvc3ZnPlxcbiAgICAgICAgICAgIDxkaXYgY2xhc3M9XFxcImJhYy0tdXNlci1hcHBzXFxcIiBpZD1cXFwiYmFjLS1wdXJlc2RrLWFwcHMtc2VjdGlvbi0tXFxcIj5cXG4gICAgICAgICAgICAgICAgPGEgaHJlZj1cXFwiL2FwcC9jYW1wYWlnbnNcXFwiIGlkPVxcXCJiYWMtLXB1cmVzZGstY2FtcGFpZ25zLWxpbmstLVxcXCIgY2xhc3M9XFxcImJhYy0tcHVyZXNkay1hcHBzLW9uLW5hdmJhci0tIGRpc2FibGVkXFxcIj5cXG4gICAgICAgICAgICAgICAgICAgIDxzdmcgd2lkdGg9XFxcIjE1cHhcXFwiIGhlaWdodD1cXFwiMTNweFxcXCIgdmlld0JveD1cXFwiMCAwIDE1IDE0XFxcIiB2ZXJzaW9uPVxcXCIxLjFcXFwiIHhtbG5zPVxcXCJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2Z1xcXCIgeG1sbnM6eGxpbms9XFxcImh0dHA6Ly93d3cudzMub3JnLzE5OTkveGxpbmtcXFwiPlxcbiAgICAgICAgICAgICAgICAgICAgICAgIDwhLS0gR2VuZXJhdG9yOiBza2V0Y2h0b29sIDU5LjEgKDEwMTAxMCkgLSBodHRwczovL3NrZXRjaC5jb20gLS0+XFxuICAgICAgICAgICAgICAgICAgICAgICAgPHRpdGxlPjJDNjRBRTc1LUFDNDAtNDMxMS04NDgyLUYyRDg3MzYzNDBGMzwvdGl0bGU+XFxuICAgICAgICAgICAgICAgICAgICAgICAgPGRlc2M+Q3JlYXRlZCB3aXRoIHNrZXRjaHRvb2wuPC9kZXNjPlxcbiAgICAgICAgICAgICAgICAgICAgICAgIDxkZWZzPlxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICA8cG9seWdvbiBpZD1cXFwicGF0aC0xXFxcIiBwb2ludHM9XFxcIjAgMC4wMDAxNTAwMDAwMDcgMTQuMzk5NzQ5OCAwLjAwMDE1MDAwMDAwNyAxNC4zOTk3NDk4IDEyLjg5OTY0OTkgMCAxMi44OTk2NDk5XFxcIj48L3BvbHlnb24+XFxuICAgICAgICAgICAgICAgICAgICAgICAgPC9kZWZzPlxcbiAgICAgICAgICAgICAgICAgICAgICAgIDxnIGlkPVxcXCJQUC1CQS1Qb3J0YWwtSG9tZV9EZXNrdG9wLXYyXFxcIiBzdHJva2U9XFxcIm5vbmVcXFwiIHN0cm9rZS13aWR0aD1cXFwiMVxcXCIgZmlsbD1cXFwibm9uZVxcXCIgZmlsbC1ydWxlPVxcXCJldmVub2RkXFxcIj5cXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgPGcgaWQ9XFxcIlBQQ00tTGlzdGluZ19Db25uZXhpb25fMDFfTWF4X0RcXFwiIHRyYW5zZm9ybT1cXFwidHJhbnNsYXRlKC0xMTEwLjAwMDAwMCwgLTc3LjAwMDAwMClcXFwiPlxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgPGcgaWQ9XFxcImVsZW1lbnRzLS8tc2RrLS8tYnV0dG9uXFxcIiB0cmFuc2Zvcm09XFxcInRyYW5zbGF0ZSgxMDk2LjAwMDAwMCwgNzAuMDAwMDAwKVxcXCI+XFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgPGcgaWQ9XFxcImljb25zL2FwcHMvY2FtcGFpZ25zLWljb25zLS8tYXBwcy0vLTQweDQwLS8tY2FtcGFpZ25zXFxcIiB0cmFuc2Zvcm09XFxcInRyYW5zbGF0ZSgxMS4wMDAwMDAsIDQuMDAwMDAwKVxcXCI+XFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIDxnIGlkPVxcXCJHcm91cC0zXFxcIiB0cmFuc2Zvcm09XFxcInRyYW5zbGF0ZSgzLjAwMDAwMCwgMy41MDAwMDApXFxcIj5cXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIDxtYXNrIGlkPVxcXCJtYXNrLTJcXFwiIGZpbGw9XFxcIndoaXRlXFxcIj5cXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICA8dXNlIHhsaW5rOmhyZWY9XFxcIiNwYXRoLTFcXFwiPjwvdXNlPlxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgPC9tYXNrPlxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgPGcgaWQ9XFxcIkNsaXAtMlxcXCI+PC9nPlxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgPHBhdGggZD1cXFwiTTIuMzMzMjUwMDMsMy43NTM2NDk5OCBDMi4wNDI3NTAwMywzLjg1OTE0OTk4IDEuNzk5NzUwMDQsNC4wMzYxNDk5OCAxLjU5Mzc1MDA0LDQuMjg5MTQ5OTggQzEuMzMzMjUwMDUsNC42MDkxNDk5NyAxLjIwNjI1MDA1LDQuOTY2NjQ5OTcgMS4yMDYyNTAwNSw1LjM4MjE0OTk2IEwxLjIwNjI1MDA1LDUuNTU0NjQ5OTYgQzEuMjA2MjUwMDUsNS45NjkxNDk5NSAxLjMzMjc1MDA1LDYuMzIxNjQ5OTUgMS41OTE3NTAwNCw2LjYzMTE0OTk0IEMxLjc5ODI1MDA0LDYuODc4MTQ5OTQgMi4wNDIyNTAwMyw3LjA1MDY0OTk0IDIuMzMzMjUwMDMsNy4xNTU2NDk5NCBMMi4zMzMyNTAwMywzLjc1MzY0OTk4IFogTTUuNzg4MjQ5ODksNy4yNDg2NTAwOCBDNy45MjAyNDk3OCw3LjI0ODY1MDA4IDkuODk1NzQ5NjcsNy44MzU2NTAwOSAxMS42NjY3NDk2LDguOTkzNjUwMTEgTDExLjY2Njc0OTYsMS44Mzc2NDk5OCBDOS44OTQyNDk2NywzLjA0NzE1IDcuODk5MjQ5NzgsMy42NTk2NTAwMSA1LjczMDc0OTg5LDMuNjU5NjUwMDEgTDMuNTY4NzUwMDEsMy42NTk2NTAwMSBMMy41Njg3NTAwMSw3LjI0ODY1MDA4IEw1Ljc4ODI0OTg5LDcuMjQ4NjUwMDggWiBNNS4yOTg3NDk4NiwxMi44OTk2NDk5IEM0Ljg2MTI0OTg3LDEyLjg5OTY0OTkgNC40NzQ3NDk4OCwxMi43MzU2NDk5IDQuMTQ5MjQ5ODksMTIuNDExMTQ5OSBDMy44NDI3NDk5LDEyLjEwNjE0OTkgMy42ODcyNDk5LDExLjczMDE0OTkgMy42ODcyNDk5LDExLjI5MzY0OTkgTDMuNjg3MjQ5OSw4LjQ1MTY0OTkzIEwzLjA1MTc0OTkyLDguNDUxNjQ5OTMgTDIuOTQwNzQ5OTIsOC40NTQxNDk5MyBDMi4xMjAyNDk5NCw4LjQ1NDE0OTkzIDEuNDIxNzQ5OTYsOC4xNzMxNDk5MyAwLjg2NTI0OTk3Nyw3LjYxODY0OTk0IEMwLjI5MTI0OTk5Miw3LjA0NjY0OTk0IC0wLjAwMDI1MDAwMDAxMiw2LjM1MjE0OTk1IC0wLjAwMDI1MDAwMDAxMiw1LjU1NDY0OTk1IEwtMC4wMDAyNTAwMDAwMTIsNS4zODIxNDk5NiBDLTAuMDAwMjUwMDAwMDEyLDQuNTY1MTQ5OTYgMC4yOTE3NDk5OTIsMy44NjUxNDk5NyAwLjg2NjI0OTk3NywzLjMwMjY0OTk3IEMxLjQ0MDc0OTk2LDIuNzQxMTQ5OTggMi4xMzcyNDk5NCwyLjQ1NjE0OTk4IDIuOTM2NzQ5OTIsMi40NTYxNDk5OCBMNS43MzA3NDk4NSwyLjQ1NjE0OTk4IEM4LjA1MTI0OTc5LDIuNDU2MTQ5OTggMTAuMTE5NzQ5NywxLjY4MTE0OTk5IDExLjg3OTI0OTcsMC4xNTIxNDk5OTkgQzExLjk3NTc0OTcsMC4wNTU2NDk5OTk1IDEyLjEwNjc0OTcsMC4wMDAxNTAwMDAwMDcgMTIuMjQ5MjQ5NywwLjAwMDE1MDAwMDAwNyBDMTIuMzM2NzQ5NywwLjAwMDE1MDAwMDAwNyAxMi40MjkyNDk3LDAuMDIxMTQ5OTk5OCAxMi41MjM3NDk3LDAuMDYzMTQ5OTk5NSBDMTIuNzQ1MjQ5NywwLjE0NTE0OTk5OSAxMi44NzMyNDk3LDAuMzM0MTQ5OTk3IDEyLjg3MzI0OTcsMC41OTAxNDk5OTUgTDEyLjg3MzI0OTcsNC4xNDk2NDk5NyBMMTMuMTM0MjQ5Nyw0LjE0OTY0OTk3IEMxMy40NzUyNDk2LDQuMTQ5NjQ5OTcgMTMuNzc0NzQ5Niw0LjI3NTE0OTk2IDE0LjAyNDI0OTYsNC41MjMxNDk5NiBDMTQuMjY4NzQ5Niw0LjcyMTE0OTk2IDE0LjM5OTc0OTYsNS4wMTQ2NDk5NiAxNC4zOTk3NDk2LDUuMzgyMTQ5OTYgQzE0LjM5OTc0OTYsNS43NDM2NDk5NSAxNC4yNzIyNDk2LDYuMDQ4MTQ5OTUgMTQuMDIwNzQ5Niw2LjI4NzY0OTk1IEMxMy43NzE3NDk2LDYuNTI0MTQ5OTUgMTMuNDczNzQ5Niw2LjY0NDE0OTk0IDEzLjEzNDI0OTcsNi42NDQxNDk5NCBMMTIuODczMjQ5Nyw2LjY0NDE0OTk0IEwxMi44NzMyNDk3LDEwLjIwMzE0OTkgQzEyLjg3MzI0OTcsMTAuNDc4MTQ5OSAxMi43NDUyNDk3LDEwLjY3NzE0OTkgMTIuNTEyNzQ5NywxMC43NjM2NDk5IEwxMi40NDI3NDk3LDEwLjc3NjE0OTkgQzEyLjM0OTI0OTcsMTAuNzk4NjQ5OSAxMi4zMDY3NDk3LDEwLjgwNTE0OTkgMTIuMjY5NzQ5NywxMC44MDUxNDk5IEMxMi4xNTY3NDk3LDEwLjgwNTE0OTkgMTIuMDM1MjQ5NywxMC43NjY2NDk5IDExLjkwNzc0OTcsMTAuNjkxMTQ5OSBDMTAuMTQwNzQ5Nyw5LjE5ODY0OTkyIDguMDkxMjQ5NzksOC40NTE2NDk5MyA1Ljc4ODI0OTg1LDguNDUxNjQ5OTMgTDQuODkzNzQ5ODcsOC40NTE2NDk5MyBMNC44OTM3NDk4NywxMS4yOTM2NDk5IEM0Ljg5Mzc0OTg3LDExLjQxMzE0OTkgNC45Mjk3NDk4NywxMS41MDQ2NDk5IDUuMDA3NzQ5ODcsMTEuNTgyNjQ5OSBDNS4wODU3NDk4NywxMS42NjAxNDk5IDUuMTc3NzQ5ODYsMTEuNjk2NjQ5OSA1LjI5ODc0OTg2LDExLjY5NjY0OTkgQzUuMzk4MjQ5ODYsMTEuNjk2NjQ5OSA1LjQ4ODc0OTg1LDExLjY1NDY0OTkgNS41NzUyNDk4NSwxMS41NjgxNDk5IEM1LjY2Mjc0OTg1LDExLjQ4MTE0OTkgNS43MDM3NDk4NSwxMS4zODQ2NDk5IDUuNzAzNzQ5ODUsMTEuMjY1MTQ5OSBMNS43MDM3NDk4NSw5LjYxNDY0OTkyIEM1LjcwMzc0OTg1LDkuMjM3NjQ5OTIgNS45MjkyNDk4NCw5LjAxMjY0OTkzIDYuMzA2NzQ5ODMsOS4wMTI2NDk5MyBDNi40NTI3NDk4Myw5LjAxMjY0OTkzIDYuNTg5MjQ5ODMsOS4wNjgxNDk5MiA2LjcxMzI0OTgyLDkuMTc3NjQ5OTIgQzYuODQyMjQ5ODIsOS4yOTIxNDk5MiA2LjkxMDI0OTgyLDkuNDQzMTQ5OTIgNi45MTAyNDk4Miw5LjYxNDY0OTkyIEw2LjkxMDI0OTgyLDExLjI2NTE0OTkgQzYuOTEwMjQ5ODIsMTEuNjk5NjQ5OSA2Ljc1MDc0OTgyLDEyLjA4NDY0OTkgNi40MzYyNDk4MywxMi40MDg2NDk5IEM2LjExOTc0OTg0LDEyLjczNDY0OTkgNS43MzY3NDk4NSwxMi44OTk2NDk5IDUuMjk4NzQ5ODYsMTIuODk5NjQ5OSBMNS4yOTg3NDk4NiwxMi44OTk2NDk5IFpcXFwiIGlkPVxcXCJGaWxsLTFcXFwiIGZpbGw9XFxcIiMzMzMzMzNcXFwiIGZpbGwtcnVsZT1cXFwibm9uemVyb1xcXCIgbWFzaz1cXFwidXJsKCNtYXNrLTIpXFxcIj48L3BhdGg+XFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIDwvZz5cXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICA8L2c+XFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICA8L2c+XFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIDwvZz5cXG4gICAgICAgICAgICAgICAgICAgICAgICA8L2c+XFxuICAgICAgICAgICAgICAgICAgICA8L3N2Zz5cXG4gICAgICAgICAgICAgICAgICAgIENhbXBhaWduc1xcbiAgICAgICAgICAgICAgICA8L2E+XFxuICAgICAgICAgICAgICAgIDxhIGhyZWY9XFxcIi9hcHAvZ3JvdXBzXFxcIiBpZD1cXFwiYmFjLS1wdXJlc2RrLWdyb3Vwcy1saW5rLS1cXFwiIGNsYXNzPVxcXCJiYWMtLXB1cmVzZGstYXBwcy1vbi1uYXZiYXItLSBkaXNhYmxlZFxcXCI+XFxuICAgICAgICAgICAgICAgICAgICA8c3ZnIHdpZHRoPVxcXCIyMHB4XFxcIiBoZWlnaHQ9XFxcIjEzcHhcXFwiIHZpZXdCb3g9XFxcIjAgMCAzOSAyNVxcXCIgdmVyc2lvbj1cXFwiMS4xXFxcIiB4bWxucz1cXFwiaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmdcXFwiIHhtbG5zOnhsaW5rPVxcXCJodHRwOi8vd3d3LnczLm9yZy8xOTk5L3hsaW5rXFxcIj5cXG4gICAgICAgICAgICAgICAgICAgICAgICA8IS0tIEdlbmVyYXRvcjogc2tldGNodG9vbCA1OS4xICgxMDEwMTApIC0gaHR0cHM6Ly9za2V0Y2guY29tIC0tPlxcbiAgICAgICAgICAgICAgICAgICAgICAgIDx0aXRsZT4zMDJDNzVCQy1CRDc4LTQ1QUYtQjZBQy0xMTAyMzc2NTBCOEY8L3RpdGxlPlxcbiAgICAgICAgICAgICAgICAgICAgICAgIDxkZXNjPkNyZWF0ZWQgd2l0aCBza2V0Y2h0b29sLjwvZGVzYz5cXG4gICAgICAgICAgICAgICAgICAgICAgICA8ZyBpZD1cXFwiUFAtQkEtUG9ydGFsLUhvbWVfRGVza3RvcC12MlxcXCIgc3Ryb2tlPVxcXCJub25lXFxcIiBzdHJva2Utd2lkdGg9XFxcIjFcXFwiIGZpbGw9XFxcIm5vbmVcXFwiIGZpbGwtcnVsZT1cXFwiZXZlbm9kZFxcXCI+XFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIDxnIGlkPVxcXCJQUENNLUxpc3RpbmdfQ29ubmV4aW9uXzAxX01heF9EXFxcIiB0cmFuc2Zvcm09XFxcInRyYW5zbGF0ZSgtMTI0NC4wMDAwMDAsIC03MS4wMDAwMDApXFxcIiBmaWxsPVxcXCIjMzMzMzMzXFxcIiBmaWxsLXJ1bGU9XFxcIm5vbnplcm9cXFwiPlxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgPGcgaWQ9XFxcImVsZW1lbnRzLS8tc2RrLS8tYnV0dG9uLWNvcHktZWxlbWVudHMtLy1zZGstLy1idXR0b25cXFwiIHRyYW5zZm9ybT1cXFwidHJhbnNsYXRlKDEyNDMuMDAwMDAwLCA3MC4wMDAwMDApXFxcIj5cXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICA8ZyBpZD1cXFwiaWNvbnMvYXBwcy9jYW1wYWlnbnMtaWNvbnMtLy1hcHBzLS8tNDB4NDAtLy1ncm91cHNcXFwiIHRyYW5zZm9ybT1cXFwidHJhbnNsYXRlKDExLjAwMDAwMCwgNC4wMDAwMDApXFxcIj5cXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgPGcgaWQ9XFxcIkdyb3VwXFxcIiB0cmFuc2Zvcm09XFxcInRyYW5zbGF0ZSgtOS4yNTAwMDAsIC0yLjI1MDAwMClcXFwiPlxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgPHBhdGggZD1cXFwiTTE5LjExNTE2MzEsMyBDMjIuODQ2NDQ5MSwzIDI2LjExNzA4MjUsNi4yMTk1MTIyIDI2LjExNzA4MjUsOS45MTQ2MzQxNSBDMjYuMTE3MDgyNSwxMi40NzU2MDk4IDI0LjMyMDUzNzQsMTQuNDg3ODA0OSAyMi42MTYxMjI4LDE1LjUxMjE5NTEgTDIyLjYxNjEyMjgsMTYuMTcwNzMxNyBMMjIuNjE2MTIyOCwxNi4xNzA3MzE3IEMyMi45ODQ2NDQ5LDE2LjMxNzA3MzIgMjMuNjc1NjIzOCwxNi41MzY1ODU0IDI0LjQ1ODczMzIsMTYuNzE5NTEyMiBMMjQuNTA0Nzk4NSwxNi43MTk1MTIyIEwyNC41MDQ3OTg1LDE2LjcxOTUxMjIgQzI4Ljc4ODg2NzYsMTcuODUzNjU4NSAzMSwxOS43NTYwOTc2IDMxLDIyLjM1MzY1ODUgQzMwLjkwNzg2OTUsMjMuMDEyMTk1MSAzMC4zMDkwMjExLDI0IDI5LjExMTMyNDQsMjQgTDguNzk2NTQ1MTEsMjQgQzcuNTk4ODQ4MzcsMjQgNywyMy4wMTIxOTUxIDcsMjIuMzE3MDczMiBDNywyMC40ODc4MDQ5IDguMTA1NTY2MjIsMTguMDM2NTg1NCAxMy40NDkxMzYzLDE2LjY4MjkyNjggTDEzLjQ5NTIwMTUsMTYuNjgyOTI2OCBMMTMuNDk1MjAxNSwxNi42ODI5MjY4IEMxNC4yNzgzMTA5LDE2LjUzNjU4NTQgMTQuOTY5Mjg5OCwxNi4zMTcwNzMyIDE1LjI5MTc0NjYsMTYuMjA3MzE3MSBMMTUuMjkxNzQ2NiwxNS41MTIxOTUxIEwxNS4yOTE3NDY2LDE1LjUxMjE5NTEgQzEzLjU4NzMzMjEsMTQuNDUxMjE5NSAxMS43OTA3ODY5LDEyLjQ3NTYwOTggMTEuNzkwNzg2OSw5LjkxNDYzNDE1IEMxMS43OTA3ODY5LDYuMjE5NTEyMiAxNS4wNjE0MjAzLDMgMTguNzkyNzA2MywzIEwxOS4xMTUxNjMxLDMgWiBNMTkuMTYxMjI4NCw1LjY3MDczMTcxIEwxOC44Mzg3NzE2LDUuNjcwNzMxNzEgQzE2Ljk5NjE2MTIsNS42NzA3MzE3MSAxNS4yOTE3NDY2LDcuNzE5NTEyMiAxNS4yOTE3NDY2LDkuODc4MDQ4NzggQzE1LjI5MTc0NjYsMTEuNDUxMjE5NSAxNi40ODk0NDM0LDEyLjgwNDg3OCAxNy42ODcxNDAxLDEzLjQ2MzQxNDYgQzE3LjgyNTMzNTksMTMuNTM2NTg1NCAxNy45MTc0NjY0LDEzLjYwOTc1NjEgMTguMDA5NTk2OSwxMy42ODI5MjY4IEMxOC43NDM3NjIsMTQuMjY2MDA2MSAxOC43ODk2NDczLDE0Ljk0NTU1MDcgMTguNzkyNTE1MSwxNS45NjI3MjM5IEwxOC43OTI3MDYzLDE2LjU3MzE3MDcgTDE4Ljc5MjcwNjMsMTYuNTczMTcwNyBDMTguNzkyNzA2MywxOC40MDI0MzkgMTUuNzk4NDY0NSwxOC45ODc4MDQ5IDE0LjQ2MjU3MiwxOS4yODA0ODc4IEMxMy4wMzQ1NDg5LDE5LjYwOTc1NjEgMTEuNDIyMjY0OSwyMC4yNjgyOTI3IDEwLjczMTI4NiwyMS4yNTYwOTc2IEwyNy4xNzY1ODM1LDIxLjI1NjA5NzYgQzI2LjYyMzgwMDQsMjAuNDE0NjM0MSAyNS4zMzM5NzMxLDE5Ljc1NjA5NzYgMjMuMzk5MjMyMiwxOS4yMDczMTcxIEMyMC44MTk1Nzc3LDE4LjU4NTM2NTkgMTkuMTYxMjI4NCwxNy45MjY4MjkzIDE5LjE2MTIyODQsMTYuNTM2NTg1NCBMMTkuMTYwODE1OSwxNS43NDg3NTI3IEMxOS4xNjI1MDM2LDE0LjgyMTc1NzEgMTkuMjEyNzEzMSwxNC4xNjI4NDA3IDE5Ljk0NDMzNzgsMTMuNjQ2MzQxNSBDMjAuMDgyNTMzNiwxMy41MzY1ODU0IDIwLjIyMDcyOTQsMTMuNDYzNDE0NiAyMC4zMTI4NTk5LDEzLjQyNjgyOTMgQzIxLjUxMDU1NjYsMTIuODA0ODc4IDIyLjcwODI1MzQsMTEuNDUxMjE5NSAyMi43MDgyNTM0LDkuODc4MDQ4NzggQzIyLjcwODI1MzQsNy43MTk1MTIyIDIxLjAwMzgzODgsNS42NzA3MzE3MSAxOS4xNjEyMjg0LDUuNjcwNzMxNzEgWiBNMTAuNjk0NDQ0NCwxIEMxMi41NDYyOTYzLDEgMTMuOTM1MTg1MiwxLjYzNzA4MDg3IDE1LDIuOTExMjQyNiBDMTQuMDI3Nzc3OCwzLjM2MDk0Njc1IDEzLjE5NDQ0NDQsMy45OTgwMjc2MSAxMi40NTM3MDM3LDQuNzg1MDA5ODYgQzEyLjIyMjIyMjIsNC41MjI2ODI0NSAxMS45OTA3NDA3LDQuMjk3ODMwMzcgMTEuOTQ0NDQ0NCw0LjI2MDM1NTAzIEMxMS41NzQwNzQxLDMuOTIzMDc2OTIgMTEuMjk2Mjk2MywzLjgxMDY1MDg5IDEwLjY5NDQ0NDQsMy44MTA2NTA4OSBMMTAuNjk0NDQ0NCwzLjgxMDY1MDg5IEwxMC40MTY2NjY3LDMuODEwNjUwODkgQzkuMTY2NjY2NjcsMy44MTA2NTA4OSA3LjYzODg4ODg5LDUuMzg0NjE1MzggNy42Mzg4ODg4OSw3LjI5NTg1Nzk5IEM3LjYzODg4ODg5LDguNjA3NDk1MDcgOC42NTc0MDc0MSw5LjczMTc1NTQyIDkuNTgzMzMzMzMsMTAuMjU2NDEwMyBDOS42NzU5MjU5MywxMC4zMzEzNjA5IDkuODE0ODE0ODEsMTAuNDA2MzExNiA5LjkwNzQwNzQxLDEwLjQ4MTI2MjMgQzEwLjYzNjU3NDEsMTEuMDM4NzA4MSAxMC42OTIyNzQzLDExLjY4MjIzIDEwLjY5NDgwNjEsMTIuNTEyMjUwNCBMMTAuNjk0NDQ0NCwxMy4yNTQ0Mzc5IEMxMC42OTQ0NDQ0LDE1LjA1MzI1NDQgNy44MjQwNzQwNywxNS42NTI4NiA2LjcxMjk2Mjk2LDE1Ljg3NzcxMiBDNS43NDA3NDA3NCwxNi4xNDAwMzk0IDQuNjI5NjI5NjMsMTYuNTUyMjY4MiAzLjk4MTQ4MTQ4LDE3LjE4OTM0OTEgTDMuOTgxNDgxNDgsMTcuMTg5MzQ5MSBMNy43Nzc3Nzc3OCwxNy4xODkzNDkxIEM4LjE0ODE0ODE1LDE3LjE4OTM0OTEgOC41MTg1MTg1MiwxNy4zNzY3MjU4IDguNjExMTExMTEsMTcuNjc2NTI4NiBMOC42MTExMTExMSwxNy42NzY1Mjg2IEw4LjYyODUxODUyLDE3Ljc0MzY4NDQgQzguNjM4ODg4ODksMTcuODMyNDI2IDguNjAxODUxODUsMTcuOTE2MzcwOCA4LjU2NDgxNDgxLDE3Ljk3NjMzMTQgQzcuNjM4ODg4ODksMTguNTM4NDYxNSA2Ljk5MDc0MDc0LDE5LjEzODA2NzEgNi41Mjc3Nzc3OCwxOS43NzUxNDc5IEM2LjM4ODg4ODg5LDE5LjkyNTA0OTMgNi4yMDM3MDM3LDIwIDYuMDE4NTE4NTIsMjAgTDYuMDE4NTE4NTIsMjAgTDEuNzU5MjU5MjYsMjAgQzAuNjAxODUxODUyLDIwIDAsMTkuMDI1NjQxIDAsMTguMzUxMDg0OCBDMCwxNi42NjQ2OTQzIDAuOTcyMjIyMjIyLDE0LjQ1MzY0ODkgNS43NDA3NDA3NCwxMy4xMDQ1MzY1IEw1Ljc0MDc0MDc0LDEzLjEwNDUzNjUgTDUuNzg3MDM3MDQsMTMuMTA0NTM2NSBDNi4zODg4ODg4OSwxMi45OTIxMTA1IDYuODk4MTQ4MTUsMTIuODQyMjA5MSA3LjIyMjIyMjIyLDEyLjcyOTc4MyBMNy4yMjIyMjIyMiwxMi43Mjk3ODMgTDcuMjIyMjIyMjIsMTIuMjgwMDc4OSBDNS43NDA3NDA3NCwxMS4zNDMxOTUzIDQuMTY2NjY2NjcsOS41NDQzNzg3IDQuMTY2NjY2NjcsNy4yNTgzODI2NCBDNC4xNjY2NjY2NywzLjkyMzA3NjkyIDcuMDgzMzMzMzMsMSAxMC40MTY2NjY3LDEgTDEwLjQxNjY2NjcsMSBaIE0yNy42NDY3ODI2LDUuNTUxMTE1MTJlLTE3IEMzMC45NTkzNDA1LDUuNTUxMTE1MTJlLTE3IDMzLjg1NzgyODcsMi45MzQ2NTM0NyAzMy44NTc4Mjg3LDYuMjgzMTY4MzIgQzMzLjg1NzgyODcsOC41NzgyMTc4MiAzMi4zMzk1NzMsMTAuMzQ2NTM0NyAzMC44MjEzMTczLDExLjMyNDc1MjUgTDMwLjgyMTMxNzMsMTEuMzI0NzUyNSBMMzAuODIxMzE3MywxMS43Mzg2MTM5IEMzMS4xNDMzNzE1LDExLjg4OTEwODkgMzEuNjk1NDY0NSwxMi4wMzk2MDQgMzIuMjkzNTY1MiwxMi4xOTAwOTkgQzM3LjAzMjM2MzQsMTMuNTA2OTMwNyAzOC4wNDQ1MzM4LDE1LjcyNjczMjcgMzcuOTk4NTI2MSwxNy4zNDQ1NTQ1IEMzNy45OTg1MjYxLDE4LjA1OTQwNTkgMzcuNDAwNDI1NCwxOSAzNi4yNTAyMzE2LDE5IEwzNi4yNTAyMzE2LDE5IEwzMS43ODc0OCwxOSBDMzEuNTU3NDQxMywxOSAzMS4zNzM0MTAzLDE4LjkyNDc1MjUgMzEuMjgxMzk0OCwxOC43NzQyNTc0IEMzMC43NzUzMDk1LDE4LjEzNDY1MzUgMzAuMTMxMjAxMSwxNy41MzI2NzMzIDI5LjI1NzA1MzgsMTcuMDA1OTQwNiBDMjkuMTE5MDMwNiwxNi45MzA2OTMxIDI5LjA3MzAyMjgsMTYuODE3ODIxOCAyOS4xMTkwMzA2LDE2LjcwNDk1MDUgTDI5LjExOTAzMDYsMTYuNzA0OTUwNSBMMjkuMTU5NTQ3NywxNi42MDg5MDQxIEMyOS4yOTI4Mzc2LDE2LjM2NDQ3ODcgMjkuNjIwMDAzOCwxNi4yMTU4NDE2IDI5Ljk0NzE3MDEsMTYuMjE1ODQxNiBMMjkuOTQ3MTcwMSwxNi4yMTU4NDE2IEwzNC4wNDE4NTk3LDE2LjIxNTg0MTYgQzMzLjQ4OTc2NjcsMTUuNjg5MTA4OSAzMi41Njk2MTE3LDE1LjIzNzYyMzggMzEuMTg5Mzc5MywxNC44NjEzODYxIEMyOS4zNDkwNjkzLDE0LjQwOTkwMSAyNy4zNzA3MzYxLDEzLjgwNzkyMDggMjcuMzcwNzM2MSwxMi4yNjUzNDY1IEwyNy4zNzA3MzYxLDEyLjI2NTM0NjUgTDI3LjM3MDQxMDQsMTEuNjk1MDc0NiBDMjcuMzY4MjIwMSwxMC43NDIxNzIgMjcuMzczNjExNiwxMC4wNDU1NDQ2IDI4LjEwNjg2MDEsOS40ODExODgxMiBDMjguMjQ0ODgzNCw5LjM2ODMxNjgzIDI4LjQyODkxNDQsOS4yOTMwNjkzMSAyOC40NzQ5MjIxLDkuMjU1NDQ1NTQgQzI5LjM5NTA3NzEsOC43Mjg3MTI4NyAzMC40MDcyNDc1LDcuNiAzMC40MDcyNDc1LDYuMjgzMTY4MzIgQzMwLjQwNzI0NzUsNC4zMjY3MzI2NyAyOC44ODg5OTE4LDIuNzg0MTU4NDIgMjcuNjQ2NzgyNiwyLjc4NDE1ODQyIEwyNy42NDY3ODI2LDIuNzg0MTU4NDIgTDI3LjM3MDczNjEsMi43ODQxNTg0MiBDMjYuNzI2NjI3NiwyLjc4NDE1ODQyIDI2LjQwNDU3MzQsMi45MzQ2NTM0NyAyNi4wMzY1MTE0LDMuMzEwODkxMDkgQzI1Ljk5MDUwMzcsMy4zNDg1MTQ4NSAyNS43NjA0NjQ5LDMuNjQ5NTA0OTUgMjUuNTMwNDI2MiwzLjk1MDQ5NTA1IEMyNC44NDAzMSwzLjEyMjc3MjI4IDIzLjk2NjE2MjcsMi40ODMxNjgzMiAyMywxLjk5NDA1OTQxIEMyNC4xMDQxODYsMC42Mzk2MDM5NiAyNS40ODQ0MTg0LDUuNTUxMTE1MTJlLTE3IDI3LjM3MDczNjEsNS41NTExMTUxMmUtMTcgTDI3LjM3MDczNjEsNS41NTExMTUxMmUtMTcgWlxcXCIgaWQ9XFxcIkNvbWJpbmVkLVNoYXBlXFxcIj48L3BhdGg+XFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIDwvZz5cXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICA8L2c+XFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICA8L2c+XFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIDwvZz5cXG4gICAgICAgICAgICAgICAgICAgICAgICA8L2c+XFxuICAgICAgICAgICAgICAgICAgICA8L3N2Zz5cXG4gICAgICAgICAgICAgICAgICAgIEdyb3Vwc1xcbiAgICAgICAgICAgICAgICA8L2E+XFxuICAgICAgICAgICAgICAgIDxhIGhyZWY9XFxcIiNcXFwiIGlkPVxcXCJiYWMtLXB1cmVzZGstLWFwcHMtLW9wZW5lci0tXFxcIiBjbGFzcz1cXFwiYmFjLS1wdXJlc2RrLWFwcHMtb24tbmF2YmFyLS1cXFwiPlxcbiAgICAgICAgICAgICAgICAgICAgPHN2ZyB3aWR0aD1cXFwiMTNweFxcXCIgaGVpZ2h0PVxcXCIxM3B4XFxcIiB2aWV3Qm94PVxcXCIwIDAgMTMgMTNcXFwiIHZlcnNpb249XFxcIjEuMVxcXCIgeG1sbnM9XFxcImh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnXFxcIiB4bWxuczp4bGluaz1cXFwiaHR0cDovL3d3dy53My5vcmcvMTk5OS94bGlua1xcXCI+XFxuICAgICAgICAgICAgICAgICAgICAgICAgPCEtLSBHZW5lcmF0b3I6IHNrZXRjaHRvb2wgNTkuMSAoMTAxMDEwKSAtIGh0dHBzOi8vc2tldGNoLmNvbSAtLT5cXG4gICAgICAgICAgICAgICAgICAgICAgICA8dGl0bGU+MDlCMkRBNTYtRERBRC00QzA5LTkxRTgtNUQ3MTk0Q0I0MUZDPC90aXRsZT5cXG4gICAgICAgICAgICAgICAgICAgICAgICA8ZGVzYz5DcmVhdGVkIHdpdGggc2tldGNodG9vbC48L2Rlc2M+XFxuICAgICAgICAgICAgICAgICAgICAgICAgPGcgaWQ9XFxcIlBQLUJBLVBvcnRhbC1Ib21lX0Rlc2t0b3AtdjJcXFwiIHN0cm9rZT1cXFwibm9uZVxcXCIgc3Ryb2tlLXdpZHRoPVxcXCIxXFxcIiBmaWxsPVxcXCJub25lXFxcIiBmaWxsLXJ1bGU9XFxcImV2ZW5vZGRcXFwiPlxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICA8ZyBpZD1cXFwiUFBDTS1MaXN0aW5nX0Nvbm5leGlvbl8wMV9NYXhfRFxcXCIgdHJhbnNmb3JtPVxcXCJ0cmFuc2xhdGUoLTEzNzguMDAwMDAwLCAtNzguMDAwMDAwKVxcXCIgZmlsbD1cXFwiIzMzMzMzM1xcXCIgZmlsbC1ydWxlPVxcXCJub256ZXJvXFxcIj5cXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIDxnIGlkPVxcXCJlbGVtZW50cy0vLXNkay0vLWJ1dHRvbi1jb3B5LTItZWxlbWVudHMtLy1zZGstLy1idXR0b25cXFwiIHRyYW5zZm9ybT1cXFwidHJhbnNsYXRlKDEzNjMuMDAwMDAwLCA3MC4wMDAwMDApXFxcIj5cXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICA8ZyBpZD1cXFwiaWNvbnMvYXBwcy9jYW1wYWlnbnMtaWNvbnMtLy1hcHBzLS8tNDB4NDAtLy1PdGhlcmFwcHNcXFwiIHRyYW5zZm9ybT1cXFwidHJhbnNsYXRlKDExLjAwMDAwMCwgNC4wMDAwMDApXFxcIj5cXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgPGcgaWQ9XFxcImU5MDZcXFwiIHRyYW5zZm9ybT1cXFwidHJhbnNsYXRlKDQuMDAwMDAwLCA0LjAwMDAwMClcXFwiPlxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgPHBhdGggZD1cXFwiTTUuMDc4MTI1NzIsMi40OTk5OTk5NGUtMDYgTDAuMzkwNjI1MDU1LDIuNDk5OTk5OTRlLTA2IEMwLjI4NDgzMDg3NCwyLjQ5OTk5OTk0ZS0wNiAwLjE5MzI3Nzk0NCwwLjAzODY1NzkwOTkgMC4xMTU5NjY2ODMsMC4xMTU5NjkxNDYgQzAuMDM4NjU1NDIyMSwwLjE5MzI4MDM4MyAwLDAuMjg0ODMzMjg0IDAsMC4zOTA2Mjc0MzIgTDAsNS4wNzgxMjY2MSBDMCw1LjE4MzkyMDc2IDAuMDM4NjU1NDIyMSw1LjI3NTQ3MzY2IDAuMTE1OTY2NjgzLDUuMzUyNzg0OSBDMC4xOTMyNzc5NDQsNS40MzAwOTYxNCAwLjI4NDgzMDg3NCw1LjQ2ODc1MTU1IDAuMzkwNjI1MDU1LDUuNDY4NzUxNTUgTDEuMTcxODc1MTcsNS40Njg3NTE1NSBDMS4yNzc2NjkzNSw1LjQ2ODc1MTU1IDEuMzY5MjIyMjgsNS40MzAwOTYxNCAxLjQ0NjUzMzU0LDUuMzUyNzg0OSBDMS41MjM4NDQ4LDUuMjc1NDczNjYgMS41NjI1MDAyMiw1LjE4MzkyMDc2IDEuNTYyNTAwMjIsNS4wNzgxMjY2MSBMMS41NjI1MDAyMiwxLjg1NTQ2ODg0IEMxLjU2MjUwMDIyLDEuODU1NDY4ODQgMS41NzY3NDE4OSwxLjgwNjY0MDkzIDEuNjA1MjI0ODEsMS43MDg5ODQyOSBDMS42MzM3MDc3MywxLjYxMTMyODQ3IDEuNzA4OTg0NDEsMS41NjI1MDAxNCAxLjgzMTA1NDg0LDEuNTYyNTAwMTQgQzEuODMxMDU0ODQsMS41NjI1MDAxNCAxLjgzMzA4OTQzLDEuNTYyNTAwMTQgMS44MzcxNTg1OSwxLjU2MjUwMDE0IEMxLjg0MTIyNzM0LDEuNTYyNTAwMTQgMS44NDczMzEwOSwxLjU2MjUwMDE0IDEuODU1NDY5MDEsMS41NjI1MDAxNCBMMy41NzY2NjA5MiwxLjU2MjUwMDE0IEMzLjU3NjY2MDkyLDEuNTYyNTAwMTQgMy42Mjc1MjM4NSwxLjU3Njc0MTgxIDMuNzI5MjQ4ODYsMS42MDUyMjQ3MiBDMy44MzA5NzQyOSwxLjYzMzcwNzYzIDMuODg5OTc1MTMsMS43MTcxMjI2MiAzLjkwNjI1MDk3LDEuODU1NDY4ODQgTDMuOTA2MjUwOTcsMy40OTEyMTAyMiBDMy45MDYyNTA5NywzLjQ5MTIxMDIyIDMuODkyMDA5MywzLjU1NjMxNDM4IDMuODYzNTI2MzgsMy42ODY1MjI2OSBDMy44MzUwNDM0NiwzLjgxNjczMSAzLjcxOTA3NjM2LDMuODgxODM1MTYgMy41MTU2MjU5MSwzLjg4MTgzNTE2IEMzLjUxNTYyNTkxLDMuODgxODM1MTYgMy41MDc0ODgsMy44ODE4MzUxNiAzLjQ5MTIxMTc0LDMuODgxODM1MTYgTDIuNzcwOTk0OTgsMy44ODE4MzUxNiBDMi42NjUyMDAzOCwzLjg4MTgzNTE2IDIuNTczNjQ3ODYsMy45MjA0OTA5OCAyLjQ5NjMzNjYsMy45OTc4MDIyMiBDMi40MTkwMjUzNCw0LjA3NTExMzA0IDIuMzgwMzY5OTIsNC4xNjY2NjU5NCAyLjM4MDM2OTkyLDQuMjcyNDYwMDkgTDIuMzgwMzY5OTIsNS4wNTM3MDk5NSBDMi4zODAzNjk5Miw1LjE2NzY0MjQzIDIuNDE5MDI1MzQsNS4yNjEyMjk1IDIuNDk2MzM2Niw1LjMzNDQ3MTU3IEMyLjU3MzY0Nzg2LDUuNDA3NzE0MDYgMi42NjUyMDAzOCw1LjQ0NDMzNDg4IDIuNzcwOTk0OTgsNS40NDQzMzQ4OCBMNS4wNzgxMjQ0Nyw1LjQ0NDMzNDg4IEM1LjE4MzkxODY1LDUuNDQ0MzM0ODggNS4yNzU0NzE1OCw1LjQwNzcxNDA2IDUuMzUyNzgyODQsNS4zMzQ0NzE1NyBDNS40MzAwOTQxLDUuMjYxMjI5NSA1LjQ2ODc0OTUyLDUuMTY3NjQyNDMgNS40Njg3NDk1Miw1LjA1MzcwOTk1IEw1LjQ2ODc0OTUyLDAuMzkwNjI3NDMyIEM1LjQ2ODc0OTUyLDAuMjg0ODMzMjg0IDUuNDMwMDk0MSwwLjE5MzI4MDM4MyA1LjM1Mjc4Mjg0LDAuMTE1OTY5MTQ2IEM1LjI3NTQ3MTU4LDAuMDM4NjU3OTA5OSA1LjE4MzkxODY1LDIuNDk5OTk5OTRlLTA2IDUuMDc4MTI0NDcsMi40OTk5OTk5NGUtMDYgTDUuMDc4MTI1NzIsMi40OTk5OTk5NGUtMDYgWiBNMTIuMTA5Mzc2MiwwIEw3LjQyMTg3NTUzLDAgQzcuMzE2MDgxMzUsMCA3LjIyNDUyODQyLDAuMDM4NjU3OTA5MSA3LjE0NzIxNzE2LDAuMTE1OTY5MTQ0IEM3LjA2OTkwNTksMC4xOTMyODAzNzkgNy4wMzEyNTA0OCwwLjI4NDgzMzI3OCA3LjAzMTI1MDQ4LDAuMzkwNjI3NDI0IEw3LjAzMTI1MDQ4LDUuMDc4MTI2NTEgQzcuMDMxMjUwNDgsNS4xODM5MjA2NSA3LjA2OTkwNTksNS4yNzU0NzM1NSA3LjE0NzIxNzE2LDUuMzUyNzg0NzkgQzcuMjI0NTI4NDIsNS40MzAwOTYwMiA3LjMxNjA4MTM1LDUuNDY4NzUxNDMgNy40MjE4NzU1Myw1LjQ2ODc1MTQzIEw4LjIwMzEyNTY0LDUuNDY4NzUxNDMgQzguMzA4OTE5ODIsNS40Njg3NTE0MyA4LjQwMDQ3Mjc1LDUuNDMwMDk2MDIgOC40Nzc3ODQwMSw1LjM1Mjc4NDc5IEM4LjU1NTA5NTI4LDUuMjc1NDczNTUgOC41OTM3NTA3LDUuMTgzOTIwNjUgOC41OTM3NTA3LDUuMDc4MTI2NTEgTDguNTkzNzUwNywxLjg1NTQ2ODggQzguNTkzNzUwNywxLjg1NTQ2ODggOC42MDc5OTIzNywxLjgxMDcwOTY1IDguNjM2NDc1MjksMS43MjExOTEzMyBDOC42NjQ5NTgyMSwxLjYzMTY3MzQzIDguNzQwMjM0ODksMS41ODY5MTQyNyA4Ljg2MjMwNTMyLDEuNTg2OTE0MjcgQzguODYyMzA1MzIsMS41ODY5MTQyNyA4Ljg2NDMzOTksMS41ODY5MTQyNyA4Ljg2ODQwOTA3LDEuNTg2OTE0MjcgQzguODcyNDc3ODIsMS41ODY5MTQyNyA4Ljg3ODU4MTU3LDEuNTg2OTE0MjcgOC44ODY3MTk0OSwxLjU4NjkxNDI3IEwxMC42MDc5MTE0LDEuNTg2OTE0MjcgQzEwLjYwNzkxMTQsMS41ODY5MTQyNyAxMC42NTg3NzQzLDEuNjAxMTU1NTIgMTAuNzYwNDk5MywxLjYyOTYzODg1IEMxMC44NjIyMjQ4LDEuNjU4MTIxNzYgMTAuOTIxMjI1NiwxLjc0MTUzNjc0IDEwLjkzNzUwMTQsMS44Nzk4ODI5NyBMMTAuOTM3NTAxNCwzLjUxNTYyNDMxIEMxMC45Mzc1MDE0LDMuNTE1NjI0MzEgMTAuOTIzMjU5OCwzLjU4MDcyODQ3IDEwLjg5NDc3NjksMy43MTA5MzY3NyBDMTAuODY2MjkzOSwzLjg0MTE0NTA4IDEwLjc1MDMyNjgsMy45MDYyNDkyNCAxMC41NDY4NzY0LDMuOTA2MjQ5MjQgQzEwLjU0Njg3NjQsMy45MDYyNDkyNCAxMC41Mzg3Mzg1LDMuOTA2MjQ5MjQgMTAuNTIyNDYyMiwzLjkwNjI0OTI0IEw5Ljc2NTYyNDYxLDMuOTA2MjQ5MjQgQzkuNjU5ODMwNDMsMy45MDYyNDkyNCA5LjU2ODI3NzUsMy45NDQ5MDQ2NSA5LjQ5MDk2NjI0LDQuMDIyMjE1ODggQzkuNDEzNjU0OTgsNC4wOTk1MjcxMSA5LjM3NDk5OTU2LDQuMTkxMDgwMDEgOS4zNzQ5OTk1Niw0LjI5Njg3NDE2IEw5LjM3NDk5OTU2LDUuMDc4MTI0MDEgQzkuMzc0OTk5NTYsNS4xODM5MTgxNSA5LjQxMzY1NDk4LDUuMjc1NDcxMDUgOS40OTA5NjYyNCw1LjM1Mjc4MjI5IEM5LjU2ODI3NzUsNS40MzAwOTM1MiA5LjY1OTgzMDQzLDUuNDY4NzUxNDMgOS43NjU2MjQ2MSw1LjQ2ODc1MTQzIEwxMi4xMDkzNzQ5LDUuNDY4NzUxNDMgQzEyLjIxNTE2OTEsNS40Njg3NTE0MyAxMi4zMDY3MjIxLDUuNDMwMDkzNTIgMTIuMzg0MDMzMyw1LjM1Mjc4MjI5IEMxMi40NjEzNDQ2LDUuMjc1NDcxMDUgMTIuNSw1LjE4MzkxODE1IDEyLjUsNS4wNzgxMjQwMSBMMTIuNSwwLjM5MDYyNDkyNCBDMTIuNSwwLjI4NDgzMDc3OCAxMi40NjEzNDQ2LDAuMTkzMjc3ODc5IDEyLjM4NDAzMzMsMC4xMTU5NjY2NDQgQzEyLjMwNjcyMjEsMC4wMzg2NTU0MDkxIDEyLjIxNTE2OTEsMCAxMi4xMDkzNzQ5LDAgTDEyLjEwOTM3NjIsMCBaIE01LjA3ODEyNTcyLDcuMDMxMjQ4NTcgTDAuMzkwNjI1MDU1LDcuMDMxMjQ4NTcgQzAuMjg0ODMwODc0LDcuMDMxMjQ4NTcgMC4xOTMyNzc5NDQsNy4wNjk5MDY0OCAwLjExNTk2NjY4Myw3LjE0NzIxNzcxIEMwLjAzODY1NTQyMjEsNy4yMjQ1Mjg5NSAwLDcuMzE2MDgxODUgMCw3LjQyMTg3NTk5IEwwLDEyLjEwOTM3NTEgQzAsMTIuMjE1MTY5MiAwLjAzODY1NTQyMjEsMTIuMzA2NzIyMSAwLjExNTk2NjY4MywxMi4zODQwMzM0IEMwLjE5MzI3Nzk0NCwxMi40NjEzNDQ2IDAuMjg0ODMwODc0LDEyLjUgMC4zOTA2MjUwNTUsMTIuNSBMMS4xNzE4NzUxNywxMi41IEMxLjI3NzY2OTM1LDEyLjUgMS4zNjkyMjIyOCwxMi40NjEzNDQ2IDEuNDQ2NTMzNTQsMTIuMzg0MDMzNCBDMS41MjM4NDQ4LDEyLjMwNjcyMjEgMS41NjI1MDAyMiwxMi4yMTUxNjkyIDEuNTYyNTAwMjIsMTIuMTA5Mzc1MSBMMS41NjI1MDAyMiw4Ljg4NjcxNzM3IEMxLjU2MjUwMDIyLDguODg2NzE3MzcgMS41NzY3NDE4OSw4Ljg0MTk1ODIyIDEuNjA1MjI0ODEsOC43NTI0Mzk5IEMxLjYzMzcwNzczLDguNjYyOTIyIDEuNzA4OTg0NDEsOC42MTgxNjI4NCAxLjgzMTA1NDg0LDguNjE4MTYyODQgQzEuODMxMDU0ODQsOC42MTgxNjI4NCAxLjgzMzA4OTQzLDguNjE4MTYyODQgMS44MzcxNTg1OSw4LjYxODE2Mjg0IEMxLjg0MTIyNzM0LDguNjE4MTYyODQgMS44NDczMzEwOSw4LjYxODE2Mjg0IDEuODU1NDY5MDEsOC42MTgxNjI4NCBMMy41NzY2NjA5Miw4LjYxODE2Mjg0IEMzLjU3NjY2MDkyLDguNjE4MTYyODQgMy42Mjc1MjM4NSw4LjYzMjQwNDA5IDMuNzI5MjQ4ODYsOC42NjA4ODc0MiBDMy44MzA5NzQyOSw4LjY4OTM3MDMzIDMuODg5OTc1MTMsOC43NzI3ODUzMSAzLjkwNjI1MDk3LDguOTExMTMxNTQgTDMuOTA2MjUwOTcsMTAuNTQ2ODcyOSBDMy45MDYyNTA5NywxMC41NDY4NzI5IDMuODkyMDA5MywxMC42MTE5NzcgMy44NjM1MjYzOCwxMC43NDIxODUzIEMzLjgzNTA0MzQ2LDEwLjg3MjM5MzcgMy43MTkwNzYzNiwxMC45Mzc0OTc4IDMuNTE1NjI1OTEsMTAuOTM3NDk3OCBDMy41MTU2MjU5MSwxMC45Mzc0OTc4IDMuNTA3NDg4LDEwLjkzNzQ5NzggMy40OTEyMTE3NCwxMC45Mzc0OTc4IEwyLjc3MDk5NDk4LDEwLjkzNzQ5NzggQzIuNjY1MjAwMzgsMTAuOTM3NDk3OCAyLjU3MzY0Nzg2LDEwLjk3NjE1MzIgMi40OTYzMzY2LDExLjA1MzQ2NDQgQzIuNDE5MDI1MzQsMTEuMTMwNzc1NyAyLjM4MDM2OTkyLDExLjIyMjMyODYgMi4zODAzNjk5MiwxMS4zMjgxMjI3IEwyLjM4MDM2OTkyLDEyLjEwOTM3MjYgQzIuMzgwMzY5OTIsMTIuMjE1MTY2NyAyLjQxOTAyNTM0LDEyLjMwNjcxOTYgMi40OTYzMzY2LDEyLjM4NDAzMDkgQzIuNTczNjQ3ODYsMTIuNDYxMzQyMSAyLjY2NTIwMDM4LDEyLjUgMi43NzA5OTQ5OCwxMi41IEw1LjA3ODEyNDQ3LDEyLjUgQzUuMTgzOTE4NjUsMTIuNSA1LjI3NTQ3MTU4LDEyLjQ2MTM0MjEgNS4zNTI3ODI4NCwxMi4zODQwMzA5IEM1LjQzMDA5NDEsMTIuMzA2NzE5NiA1LjQ2ODc0OTUyLDEyLjIxNTE2NjcgNS40Njg3NDk1MiwxMi4xMDkzNzI2IEw1LjQ2ODc0OTUyLDcuNDIxODczNDkgQzUuNDY4NzQ5NTIsNy4zMTYwNzkzNSA1LjQzMDA5NDEsNy4yMjQ1MjY0NSA1LjM1Mjc4Mjg0LDcuMTQ3MjE1MjEgQzUuMjc1NDcxNTgsNy4wNjk5MDM5OCA1LjE4MzkxODY1LDcuMDMxMjQ4NTcgNS4wNzgxMjQ0Nyw3LjAzMTI0ODU3IEw1LjA3ODEyNTcyLDcuMDMxMjQ4NTcgWiBNMTIuMTA5Mzc2Miw3LjAzMTI0ODU3IEw3LjQyMTg3NTUzLDcuMDMxMjQ4NTcgQzcuMzE2MDgxMzUsNy4wMzEyNDg1NyA3LjIyNDUyODQyLDcuMDY5OTA2NDggNy4xNDcyMTcxNiw3LjE0NzIxNzcxIEM3LjA2OTkwNTksNy4yMjQ1Mjg5NSA3LjAzMTI1MDQ4LDcuMzE2MDgxODUgNy4wMzEyNTA0OCw3LjQyMTg3NTk5IEw3LjAzMTI1MDQ4LDEyLjEwOTM3NTEgQzcuMDMxMjUwNDgsMTIuMjE1MTY5MiA3LjA2OTkwNTksMTIuMzA2NzIyMSA3LjE0NzIxNzE2LDEyLjM4NDAzMzQgQzcuMjI0NTI4NDIsMTIuNDYxMzQ0NiA3LjMxNjA4MTM1LDEyLjUgNy40MjE4NzU1MywxMi41IEw4LjIwMzEyNTY0LDEyLjUgQzguMzA4OTE5ODIsMTIuNSA4LjQwMDQ3Mjc1LDEyLjQ2MTM0NDYgOC40Nzc3ODQwMSwxMi4zODQwMzM0IEM4LjU1NTA5NTI4LDEyLjMwNjcyMjEgOC41OTM3NTA3LDEyLjIxNTE2OTIgOC41OTM3NTA3LDEyLjEwOTM3NTEgTDguNTkzNzUwNyw4Ljg4NjcxNzM3IEM4LjU5Mzc1MDcsOC44ODY3MTczNyA4LjYwNzk5MjM3LDguODQxOTU4MjIgOC42MzY0NzUyOSw4Ljc1MjQzOTkgQzguNjY0OTU4MjEsOC42NjI5MjIgOC43NDAyMzQ4OSw4LjYxODE2Mjg0IDguODYyMzA1MzIsOC42MTgxNjI4NCBDOC44NjIzMDUzMiw4LjYxODE2Mjg0IDguODY0MzM5OSw4LjYxODE2Mjg0IDguODY4NDA5MDcsOC42MTgxNjI4NCBDOC44NzI0Nzc4Miw4LjYxODE2Mjg0IDguODc4NTgxNTcsOC42MTgxNjI4NCA4Ljg4NjcxOTQ5LDguNjE4MTYyODQgTDEwLjYwNzkxMTQsOC42MTgxNjI4NCBDMTAuNjA3OTExNCw4LjYxODE2Mjg0IDEwLjY1ODc3NDMsOC42MzI0MDQwOSAxMC43NjA0OTkzLDguNjYwODg3NDIgQzEwLjg2MjIyNDgsOC42ODkzNzAzMyAxMC45MjEyMjU2LDguNzcyNzg1MzEgMTAuOTM3NTAxNCw4LjkxMTEzMTU0IEwxMC45Mzc1MDE0LDEwLjU0Njg3MjkgQzEwLjkzNzUwMTQsMTAuNTQ2ODcyOSAxMC45MjMyNTk4LDEwLjYxMTk3NyAxMC44OTQ3NzY5LDEwLjc0MjE4NTMgQzEwLjg2NjI5MzksMTAuODcyMzkzNyAxMC43NTAzMjY4LDEwLjkzNzQ5NzggMTAuNTQ2ODc2NCwxMC45Mzc0OTc4IEMxMC41NDY4NzY0LDEwLjkzNzQ5NzggMTAuNTM4NzM4NSwxMC45Mzc0OTc4IDEwLjUyMjQ2MjIsMTAuOTM3NDk3OCBMOS43NjU2MjQ2MSwxMC45Mzc0OTc4IEM5LjY1OTgzMDQzLDEwLjkzNzQ5NzggOS41NjgyNzc1LDEwLjk3NjE1MzIgOS40OTA5NjYyNCwxMS4wNTM0NjQ0IEM5LjQxMzY1NDk4LDExLjEzMDc3NTcgOS4zNzQ5OTk1NiwxMS4yMjIzMjg2IDkuMzc0OTk5NTYsMTEuMzI4MTIyNyBMOS4zNzQ5OTk1NiwxMi4xMDkzNzI2IEM5LjM3NDk5OTU2LDEyLjIxNTE2NjcgOS40MTM2NTQ5OCwxMi4zMDY3MTk2IDkuNDkwOTY2MjQsMTIuMzg0MDMwOSBDOS41NjgyNzc1LDEyLjQ2MTM0MjEgOS42NTk4MzA0MywxMi41IDkuNzY1NjI0NjEsMTIuNSBMMTIuMTA5Mzc0OSwxMi41IEMxMi4yMTUxNjkxLDEyLjUgMTIuMzA2NzIyMSwxMi40NjEzNDIxIDEyLjM4NDAzMzMsMTIuMzg0MDMwOSBDMTIuNDYxMzQ0NiwxMi4zMDY3MTk2IDEyLjUsMTIuMjE1MTY2NyAxMi41LDEyLjEwOTM3MjYgTDEyLjUsNy40MjE4NzM0OSBDMTIuNSw3LjMxNjA3OTM1IDEyLjQ2MTM0NDYsNy4yMjQ1MjY0NSAxMi4zODQwMzMzLDcuMTQ3MjE1MjEgQzEyLjMwNjcyMjEsNy4wNjk5MDM5OCAxMi4yMTUxNjkxLDcuMDMxMjQ4NTcgMTIuMTA5Mzc0OSw3LjAzMTI0ODU3IEwxMi4xMDkzNzYyLDcuMDMxMjQ4NTcgWlxcXCIgaWQ9XFxcIlNoYXBlXFxcIj48L3BhdGg+XFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIDwvZz5cXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICA8L2c+XFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICA8L2c+XFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIDwvZz5cXG4gICAgICAgICAgICAgICAgICAgICAgICA8L2c+XFxuICAgICAgICAgICAgICAgICAgICA8L3N2Zz5cXG4gICAgICAgICAgICAgICAgICAgIE90aGVyIGFwcHNcXG4gICAgICAgICAgICAgICAgPC9hPlxcbiAgICAgICAgICAgICAgICA8ZGl2IGNsYXNzPVxcXCJiYWMtLWFwcHMtY29udGFpbmVyXFxcIiBpZD1cXFwiYmFjLS1wdXJlc2RrLWFwcHMtY29udGFpbmVyLS1cXFwiPlxcbiAgICAgICAgICAgICAgICAgICAgPGRpdiBpZD1cXFwiYmFjLS1hcHMtYWN0dWFsLWNvbnRhaW5lclxcXCI+PC9kaXY+XFxuICAgICAgICAgICAgICAgIDwvZGl2PlxcbiAgICAgICAgICAgIDwvZGl2PlxcbiAgICAgICAgICAgIDxkaXYgY2xhc3M9XFxcImJhYy0tdXNlci1hdmF0YXJcXFwiIGlkPVxcXCJiYWMtLXVzZXItYXZhdGFyLXRvcFxcXCI+XFxuICAgICAgICAgICAgICAgIDxzcGFuIGNsYXNzPVxcXCJiYWMtLXVzZXItYXZhdGFyLW5hbWVcXFwiIGlkPVxcXCJiYWMtLXB1cmVzZGstdXNlci1hdmF0YXItLVxcXCI+PC9zcGFuPlxcbiAgICAgICAgICAgICAgICA8ZGl2IGlkPVxcXCJiYWMtLWltYWdlLWNvbnRhaW5lci10b3BcXFwiPjwvZGl2PlxcbiAgICAgICAgICAgIDwvZGl2PlxcbiAgICAgICAgPC9kaXY+XFxuICAgIDwvZGl2PlxcbiAgICA8ZGl2IGlkPVxcXCJiYWMtLWluZm8tYmxvY2tzLXdyYXBwZXItLVxcXCI+PC9kaXY+XFxuPC9oZWFkZXI+XFxuPGRpdiBjbGFzcz1cXFwiYmFjLS11c2VyLXNpZGViYXJcXFwiIGlkPVxcXCJiYWMtLXB1cmVzZGstdXNlci1zaWRlYmFyLS1cXFwiPlxcbiAgICA8ZGl2IGNsYXNzPVxcXCJiYWMtLXVzZXItc2lkZWJhci13aGl0ZS1iZ1xcXCIgaWQ9XFxcImJhYy0tdXNlci1zaWRlYmFyLXdoaXRlLWJnXFxcIj5cXG4gICAgICAgIDxkaXYgaWQ9XFxcImJhYy0tcHVyZXNkay11c2VyLWRldGFpbHMtLVxcXCI+XFxuICAgICAgICAgICAgPGRpdiBjbGFzcz1cXFwiYmFjLXVzZXItYWNvdW50LWxpc3QtaXRlbVxcXCI+XFxuICAgICAgICAgICAgICAgIDxhIGlkPVxcXCJiYWMtLWxvZ291dC0tYnV0dG9uXFxcIiBocmVmPVxcXCIvYXBpL3YxL3NpZ24tb2ZmXFxcIj48aSBjbGFzcz1cXFwiZmEgZmEtbG9naW4tbGluZVxcXCI+PC9pPiBMb2cgb3V0PC9hPlxcbiAgICAgICAgICAgIDwvZGl2PlxcbiAgICAgICAgPC9kaXY+XFxuICAgICAgICA8ZGl2IGNsYXNzPVxcXCJiYWMtLXVzZXItYXBwc1xcXCIgaWQ9XFxcImJhYy0tcHVyZXNkay11c2VyLWJ1c2luZXNzZXMtLVxcXCI+XFxuICAgICAgICA8L2Rpdj5cXG4gICAgICAgIDxkaXYgY2xhc3M9XFxcImJhYy0tdXNlci1hY2NvdW50LXNldHRpbmdzXFxcIj5cXG4gICAgICAgICAgICA8ZGl2IGlkPVxcXCJwdXJlc2RrLXZlcnNpb24tbnVtYmVyXFxcIiBjbGFzcz1cXFwicHVyZXNkay12ZXJzaW9uLW51bWJlclxcXCI+PC9kaXY+XFxuICAgICAgICA8L2Rpdj5cXG4gICAgPC9kaXY+XFxuPC9kaXY+XFxuXFxuXFxuPGRpdiBjbGFzcz1cXFwiYmFjLS1jdXN0b20tbW9kYWwgYWRkLXF1ZXN0aW9uLW1vZGFsIC0taXMtb3BlblxcXCIgaWQ9XFxcImJhYy0tY2xvdWRpbmFyeS0tbW9kYWxcXFwiPlxcbiAgICA8ZGl2IGNsYXNzPVxcXCJjdXN0b20tbW9kYWxfX3dyYXBwZXJcXFwiPlxcbiAgICAgICAgPGRpdiBjbGFzcz1cXFwiY3VzdG9tLW1vZGFsX19jb250ZW50XFxcIj5cXG4gICAgICAgICAgICA8aDM+QWRkIGltYWdlPC9oMz5cXG4gICAgICAgICAgICA8YSBjbGFzcz1cXFwiY3VzdG9tLW1vZGFsX19jbG9zZS1idG5cXFwiIGlkPVxcXCJiYWMtLWNsb3VkaW5hcnktLWNsb3NlYnRuXFxcIj48aSBjbGFzcz1cXFwiZmEgZmEtdGltZXMtY2lyY2xlXFxcIj48L2k+PC9hPlxcbiAgICAgICAgPC9kaXY+XFxuXFxuICAgICAgICA8ZGl2IGNsYXNzPVxcXCJjdXN0b20tbW9kYWxfX2NvbnRlbnRcXFwiPlxcbiAgICAgICAgICAgIDxkaXYgY2xhc3M9XFxcImJhYy1zZWFyY2ggLS1pY29uLWxlZnRcXFwiPlxcbiAgICAgICAgICAgICAgICA8aW5wdXQgaWQ9XFxcImJhYy0tY2xvdWRpbmFyeS0tc2VhcmNoLWlucHV0XFxcIiB0eXBlPVxcXCJzZWFyY2hcXFwiIG5hbWU9XFxcInNlYXJjaFxcXCIgcGxhY2Vob2xkZXI9XFxcIlNlYXJjaCBmb3IgaW1hZ2VzLi4uXFxcIi8+XFxuICAgICAgICAgICAgICAgIDxkaXYgY2xhc3M9XFxcImJhYy1zZWFyY2hfX2ljb25cXFwiPjxpIGNsYXNzPVxcXCJmYSBmYS1zZWFyY2hcXFwiPjwvaT48L2Rpdj5cXG4gICAgICAgICAgICA8L2Rpdj5cXG4gICAgICAgICAgICA8YnIvPlxcblxcbiAgICAgICAgICAgIDxkaXYgY2xhc3M9XFxcImJhY2stYnV0dG9uXFxcIiBpZD1cXFwiYmFjLS1jbG91ZGluYXJ5LS1iYWNrLWJ1dHRvbi1jb250YWluZXJcXFwiPlxcbiAgICAgICAgICAgICAgICA8YSBjbGFzcz1cXFwiZ29CYWNrXFxcIiBpZD1cXFwiYmFjLS1jbG91ZGluYXJ5LS1nby1iYWNrXFxcIj48aSBjbGFzcz1cXFwiZmEgZmEtYW5nbGUtbGVmdFxcXCI+PC9pPkdvIEJhY2s8L2E+XFxuICAgICAgICAgICAgPC9kaXY+XFxuXFxuICAgICAgICAgICAgPGJyLz5cXG4gICAgICAgICAgICA8ZGl2IGNsYXNzPVxcXCJjbG91ZC1pbWFnZXNcXFwiPlxcbiAgICAgICAgICAgICAgICA8ZGl2IGNsYXNzPVxcXCJjbG91ZC1pbWFnZXNfX2NvbnRhaW5lclxcXCIgaWQ9XFxcImJhYy0tY2xvdWRpbmFyeS1pdGFtcy1jb250YWluZXJcXFwiPjwvZGl2PlxcblxcbiAgICAgICAgICAgICAgICA8ZGl2IGNsYXNzPVxcXCJjbG91ZC1pbWFnZXNfX3BhZ2luYXRpb25cXFwiIGlkPVxcXCJiYWMtLWNsb3VkaW5hcnktcGFnaW5hdGlvbi1jb250YWluZXJcXFwiPlxcbiAgICAgICAgICAgICAgICAgICAgPHVsIGlkPVxcXCJiYWMtLWNsb3VkaW5hcnktYWN0dWFsLXBhZ2luYXRpb24tY29udGFpbmVyXFxcIj48L3VsPlxcbiAgICAgICAgICAgICAgICA8L2Rpdj5cXG5cXG4gICAgICAgICAgICA8L2Rpdj5cXG4gICAgICAgIDwvZGl2PlxcbiAgICA8L2Rpdj5cXG48L2Rpdj5cXG48ZGl2IGlkPVxcXCJiYWMtLS1pbnZhbGlkLWFjY291bnRcXFwiPllvdSBoYXZlIHN3aXRjaGVkIHRvIGFub3RoZXIgYWNjb3VudCBmcm9tIGFub3RoZXIgdGFiLiBQbGVhc2UgZWl0aGVyIGNsb3NlIHRoaXMgcGFnZVxcbiAgICBvciBzd2l0Y2ggdG8gdGhlIHJpZ2h0IGFjY291bnQgdG8gcmUtZW5hYmxlIGFjY2VzczwvZGl2PlxcblxcbjxpbnB1dCBzdHlsZT1cXFwiZGlzcGxheTpub25lXFxcIiB0eXBlPSdmaWxlJyBpZD0nYmFjLS0tcHVyZXNkay1hdmF0YXItZmlsZSc+XFxuPGlucHV0IHN0eWxlPVxcXCJkaXNwbGF5Om5vbmVcXFwiIHR5cGU9J2J1dHRvbicgaWQ9J2JhYy0tLXB1cmVzZGstYXZhdGFyLXN1Ym1pdCcgdmFsdWU9J1VwbG9hZCEnPlwiKTtcbnBwYmEuc2V0VmVyc2lvbk51bWJlcignMi45LjUnKTtcbndpbmRvdy5QVVJFU0RLID0gcHBiYTtcbnZhciBjc3MgPSAnaHRtbCxib2R5LGRpdixzcGFuLGFwcGxldCxvYmplY3QsaWZyYW1lLGgxLGgyLGgzLGg0LGg1LGg2LHAsYmxvY2txdW90ZSxwcmUsYSxhYmJyLGFjcm9ueW0sYWRkcmVzcyxiaWcsY2l0ZSxjb2RlLGRlbCxkZm4sZW0saW1nLGlucyxrYmQscSxzLHNhbXAsc21hbGwsc3RyaWtlLHN0cm9uZyxzdWIsc3VwLHR0LHZhcixiLHUsaSxjZW50ZXIsZGwsZHQsZGQsb2wsdWwsbGksZmllbGRzZXQsZm9ybSxsYWJlbCxsZWdlbmQsdGFibGUsY2FwdGlvbix0Ym9keSx0Zm9vdCx0aGVhZCx0cix0aCx0ZCxhcnRpY2xlLGFzaWRlLGNhbnZhcyxkZXRhaWxzLGVtYmVkLGZpZ3VyZSxmaWdjYXB0aW9uLGZvb3RlcixoZWFkZXIsaGdyb3VwLG1lbnUsbmF2LG91dHB1dCxydWJ5LHNlY3Rpb24sc3VtbWFyeSx0aW1lLG1hcmssYXVkaW8sdmlkZW97bWFyZ2luOjA7cGFkZGluZzowO2JvcmRlcjowO2ZvbnQtc2l6ZToxMDAlO2ZvbnQ6aW5oZXJpdDt2ZXJ0aWNhbC1hbGlnbjpiYXNlbGluZX1hcnRpY2xlLGFzaWRlLGRldGFpbHMsZmlnY2FwdGlvbixmaWd1cmUsZm9vdGVyLGhlYWRlcixoZ3JvdXAsbWVudSxuYXYsc2VjdGlvbntkaXNwbGF5OmJsb2NrfWJvZHl7bGluZS1oZWlnaHQ6MX1vbCx1bHtsaXN0LXN0eWxlOm5vbmV9YmxvY2txdW90ZSxxe3F1b3Rlczpub25lfWJsb2NrcXVvdGU6YmVmb3JlLGJsb2NrcXVvdGU6YWZ0ZXIscTpiZWZvcmUscTphZnRlcntjb250ZW50OlwiXCI7Y29udGVudDpub25lfXRhYmxle2JvcmRlci1jb2xsYXBzZTpjb2xsYXBzZTtib3JkZXItc3BhY2luZzowfWJvZHl7b3ZlcmZsb3cteDpoaWRkZW59I2JhYy0tLWludmFsaWQtYWNjb3VudHtwb3NpdGlvbjpmaXhlZDt3aWR0aDoxMDAlO2hlaWdodDoxMDAlO2JhY2tncm91bmQ6YmxhY2s7b3BhY2l0eTowLjc7Y29sb3I6d2hpdGU7Zm9udC1zaXplOjE4cHg7dGV4dC1hbGlnbjpjZW50ZXI7cGFkZGluZy10b3A6MTUlO2Rpc3BsYXk6bm9uZTt6LWluZGV4OjEwMDAwMDAwMH0jYmFjLS0taW52YWxpZC1hY2NvdW50LmludmFsaWR7ZGlzcGxheTpibG9ja30jYmFjLXdyYXBwZXJ7Zm9udC1mYW1pbHk6XCJWZXJkYW5hXCIsIGFyaWFsLCBzYW5zLXNlcmlmO2NvbG9yOndoaXRlO21pbi1oZWlnaHQ6MTAwdmg7cG9zaXRpb246cmVsYXRpdmV9LmJhYy11c2VyLWFjb3VudC1saXN0LWl0ZW17YmFja2dyb3VuZC1jb2xvcjp0cmFuc3BhcmVudDt0ZXh0LWFsaWduOmNlbnRlcn0uYmFjLXVzZXItYWNvdW50LWxpc3QtaXRlbSAjYmFjLS1sb2dvdXQtLWJ1dHRvbntkaXNwbGF5OmlubGluZS1ibG9jaztwYWRkaW5nOjRweCA4cHg7YmFja2dyb3VuZC1jb2xvcjpyZ2JhKDI1NSwyNTUsMjU1LDAuODUpO2ZvbnQtc2l6ZToxMnB4O2JvcmRlci1yYWRpdXM6MnB4O21hcmdpbjo0cHggMCAyNnB4IDB9LmJhYy11c2VyLWFjb3VudC1saXN0LWl0ZW0gZmEtbG9naW4tbGluZXttYXJnaW4tcmlnaHQ6M3B4O3Bvc2l0aW9uOnJlbGF0aXZlO3RvcDoxcHh9LmJhYy0tY29udGFpbmVye21heC13aWR0aDoxMTYwcHg7bWFyZ2luOjAgYXV0b30uYmFjLS1jb250YWluZXIgLmJhYy0tcHVyZXNkay1hcHAtbmFtZS0te2NvbG9yOiMzMzMzMzM7dGV4dC1kZWNvcmF0aW9uOm5vbmU7bWFyZ2luLXJpZ2h0OjE2cHg7Zm9udC1zaXplOjEzcHg7ZGlzcGxheTppbmxpbmUtYmxvY2s7cGFkZGluZzo2cHggMTZweDtiYWNrZ3JvdW5kLWNvbG9yOnJnYmEoMjU1LDI1NSwyNTUsMC43NSk7cG9zaXRpb246cmVsYXRpdmU7dG9wOi02cHg7Ym9yZGVyLXJhZGl1czo0cHg7bWFyZ2luLWxlZnQ6MjBweH0uYmFjLS1jb250YWluZXIgLmJhYy0tcHVyZXNkay1hcHAtbmFtZS0tOmhvdmVye2JhY2tncm91bmQtY29sb3I6cmdiYSgyNTUsMjU1LDI1NSwwLjkpfS5iYWMtLWNvbnRhaW5lciAuYmFjLS1wdXJlc2RrLWFwcC1uYW1lLS0gc3Zne21hcmdpbi1yaWdodDo2cHh9LmJhYy0tY29udGFpbmVyICNhcHAtbmFtZS1saW5rLXRvLXJvb3R7dGV4dC1kZWNvcmF0aW9uOm5vbmV9LmJhYy0taGVhZGVyLWFwcHN7cG9zaXRpb246YWJzb2x1dGU7d2lkdGg6MTAwJTtoZWlnaHQ6NTBweDtiYWNrZ3JvdW5kLWNvbG9yOiM0NzUzNjk7cGFkZGluZzo1cHggMTBweDt6LWluZGV4Ojk5OTk5OTkgIWltcG9ydGFudH0uYmFjLS1oZWFkZXItYXBwcy5iYWMtLWZ1bGx3aWR0aHtwYWRkaW5nOjB9LmJhYy0taGVhZGVyLWFwcHMuYmFjLS1mdWxsd2lkdGggLmJhYy0tY29udGFpbmVye21heC13aWR0aDp1bnNldDtwYWRkaW5nLWxlZnQ6MTZweDtwYWRkaW5nLXJpZ2h0OjE2cHh9LmJhYy0taGVhZGVyLWFwcHMgLmJhYy0tY29udGFpbmVye2hlaWdodDoxMDAlO2Rpc3BsYXk6ZmxleDthbGlnbi1pdGVtczpjZW50ZXI7anVzdGlmeS1jb250ZW50OnNwYWNlLWJldHdlZW59LmJhYy0taGVhZGVyLXNlYXJjaHtwb3NpdGlvbjpyZWxhdGl2ZX0uYmFjLS1oZWFkZXItc2VhcmNoIGlucHV0e2NvbG9yOiNmZmY7Zm9udC1zaXplOjE0cHg7aGVpZ2h0OjM1cHg7YmFja2dyb3VuZC1jb2xvcjojNmI3NTg2O3BhZGRpbmc6MCA1cHggMCAxMHB4O2JvcmRlcjpub25lO2JvcmRlci1yYWRpdXM6M3B4O21pbi13aWR0aDo0MDBweDt3aWR0aDoxMDAlfS5iYWMtLWhlYWRlci1zZWFyY2ggaW5wdXQ6Zm9jdXN7b3V0bGluZTpub25lfS5iYWMtLWhlYWRlci1zZWFyY2ggaW5wdXQ6Oi13ZWJraXQtaW5wdXQtcGxhY2Vob2xkZXJ7Zm9udC1zdHlsZTpub3JtYWwgIWltcG9ydGFudDt0ZXh0LWFsaWduOmNlbnRlcjtjb2xvcjojZmZmO2ZvbnQtc2l6ZToxNHB4O2ZvbnQtd2VpZ2h0OjMwMDtsZXR0ZXItc3BhY2luZzowLjVweH0uYmFjLS1oZWFkZXItc2VhcmNoIGlucHV0OjotbW96LXBsYWNlaG9sZGVye2ZvbnQtc3R5bGU6bm9ybWFsICFpbXBvcnRhbnQ7dGV4dC1hbGlnbjpjZW50ZXI7Y29sb3I6I2ZmZjtmb250LXNpemU6MTRweDtmb250LXdlaWdodDozMDA7bGV0dGVyLXNwYWNpbmc6MC41cHh9LmJhYy0taGVhZGVyLXNlYXJjaCBpbnB1dDotbXMtaW5wdXQtcGxhY2Vob2xkZXJ7Zm9udC1zdHlsZTpub3JtYWwgIWltcG9ydGFudDt0ZXh0LWFsaWduOmNlbnRlcjtjb2xvcjojZmZmO2ZvbnQtc2l6ZToxNHB4O2ZvbnQtd2VpZ2h0OjMwMDtsZXR0ZXItc3BhY2luZzowLjVweH0uYmFjLS1oZWFkZXItc2VhcmNoIGl7cG9zaXRpb246YWJzb2x1dGU7dG9wOjhweDtyaWdodDoxMHB4fS5iYWMtLXVzZXItYWN0aW9uc3tkaXNwbGF5OmZsZXg7YWxpZ24taXRlbXM6Y2VudGVyfS5iYWMtLXVzZXItYWN0aW9ucyAjYmFjLS1wdXJlc2RrLWFwcHMtc2VjdGlvbi0te2JvcmRlci1yaWdodDoxcHggc29saWQgI2FkYWRhZDtoZWlnaHQ6NDBweDtwYWRkaW5nLXRvcDoxM3B4fS5iYWMtLXVzZXItYWN0aW9ucyAjYmFjLS1wdXJlc2RrLWFwcHMtc2VjdGlvbi0tIGEuYmFjLS1wdXJlc2RrLWFwcHMtb24tbmF2YmFyLS17Y29sb3I6IzMzMzMzMzt0ZXh0LWRlY29yYXRpb246bm9uZTttYXJnaW4tcmlnaHQ6MTZweDtmb250LXNpemU6MTNweDtkaXNwbGF5OmlubGluZS1ibG9jaztwYWRkaW5nOjZweCAxNnB4O2JhY2tncm91bmQtY29sb3I6cmdiYSgyNTUsMjU1LDI1NSwwLjc1KTtwb3NpdGlvbjpyZWxhdGl2ZTt0b3A6LTZweDtib3JkZXItcmFkaXVzOjRweH0uYmFjLS11c2VyLWFjdGlvbnMgI2JhYy0tcHVyZXNkay1hcHBzLXNlY3Rpb24tLSBhLmJhYy0tcHVyZXNkay1hcHBzLW9uLW5hdmJhci0tLmRpc2FibGVke3BvaW50ZXItZXZlbnRzOm5vbmU7Y3Vyc29yOm5vbmU7Y29sb3I6I2FkYWRhZH0uYmFjLS11c2VyLWFjdGlvbnMgI2JhYy0tcHVyZXNkay1hcHBzLXNlY3Rpb24tLSBhLmJhYy0tcHVyZXNkay1hcHBzLW9uLW5hdmJhci0tLnNlbGVjdGVke3BvaW50ZXItZXZlbnRzOm5vbmU7YmFja2dyb3VuZC1jb2xvcjojZmZmO2JvcmRlcjoxcHggc29saWQgIzMzMzMzM30uYmFjLS11c2VyLWFjdGlvbnMgI2JhYy0tcHVyZXNkay1hcHBzLXNlY3Rpb24tLSBhLmJhYy0tcHVyZXNkay1hcHBzLW9uLW5hdmJhci0tOmhvdmVye2JhY2tncm91bmQtY29sb3I6cmdiYSgyNTUsMjU1LDI1NSwwLjkpfS5iYWMtLXVzZXItYWN0aW9ucyAjYmFjLS1wdXJlc2RrLWFwcHMtc2VjdGlvbi0tIGEuYmFjLS1wdXJlc2RrLWFwcHMtb24tbmF2YmFyLS0gc3Zne21hcmdpbi1yaWdodDo2cHh9LmJhYy0tdXNlci1hY3Rpb25zIC5iYWMtLXVzZXItbm90aWZpY2F0aW9uc3twb3NpdGlvbjpyZWxhdGl2ZX0uYmFjLS11c2VyLWFjdGlvbnMgLmJhYy0tdXNlci1ub3RpZmljYXRpb25zIGl7Zm9udC1zaXplOjIwcHh9LmJhYy0tdXNlci1hY3Rpb25zICNiYWMtLXB1cmVzZGstLWxvYWRlci0te2Rpc3BsYXk6bm9uZX0uYmFjLS11c2VyLWFjdGlvbnMgI2JhYy0tcHVyZXNkay0tbG9hZGVyLS0uYmFjLS1wdXJlc2RrLXZpc2libGV7ZGlzcGxheTpibG9ja30uYmFjLS11c2VyLWFjdGlvbnMgLmJhYy0tdXNlci1ub3RpZmljYXRpb25zLWNvdW50e3Bvc2l0aW9uOmFic29sdXRlO2Rpc3BsYXk6aW5saW5lLWJsb2NrO2hlaWdodDoxNXB4O3dpZHRoOjE1cHg7bGluZS1oZWlnaHQ6MTVweDtjb2xvcjojZmZmO2ZvbnQtc2l6ZToxMHB4O3RleHQtYWxpZ246Y2VudGVyO2JhY2tncm91bmQtY29sb3I6I2ZjM2IzMDtib3JkZXItcmFkaXVzOjUwJTt0b3A6LTVweDtsZWZ0Oi01cHh9LmJhYy0tdXNlci1hY3Rpb25zIC5iYWMtLXVzZXItYXZhdGFyLC5iYWMtLXVzZXItYWN0aW9ucyAuYmFjLS11c2VyLW5vdGlmaWNhdGlvbnN7bWFyZ2luLWxlZnQ6MjBweH0uYmFjLS11c2VyLWFjdGlvbnMgLmJhYy0tdXNlci1hdmF0YXJ7cG9zaXRpb246cmVsYXRpdmU7b3ZlcmZsb3c6aGlkZGVuO2JvcmRlci1yYWRpdXM6NTAlfS5iYWMtLXVzZXItYWN0aW9ucyAuYmFjLS11c2VyLWF2YXRhciAjYmFjLS1pbWFnZS1jb250YWluZXItdG9we3dpZHRoOjEwMCU7aGVpZ3RoOjEwMCU7cG9zaXRpb246YWJzb2x1dGU7dG9wOjA7bGVmdDowO3otaW5kZXg6MTtkaXNwbGF5Om5vbmV9LmJhYy0tdXNlci1hY3Rpb25zIC5iYWMtLXVzZXItYXZhdGFyICNiYWMtLWltYWdlLWNvbnRhaW5lci10b3AgaW1ne3dpZHRoOjEwMCU7aGVpZ2h0OjEwMCU7Y3Vyc29yOnBvaW50ZXJ9LmJhYy0tdXNlci1hY3Rpb25zIC5iYWMtLXVzZXItYXZhdGFyICNiYWMtLWltYWdlLWNvbnRhaW5lci10b3AuYmFjLS1wdXJlc2RrLXZpc2libGV7ZGlzcGxheTpibG9ja30uYmFjLS11c2VyLWFjdGlvbnMgLmJhYy0tdXNlci1hdmF0YXItbmFtZXtjb2xvcjojZmZmO2JhY2tncm91bmQtY29sb3I6I2FkYWRhZDtkaXNwbGF5OmlubGluZS1ibG9jaztoZWlnaHQ6MzVweDt3aWR0aDozNXB4O2xpbmUtaGVpZ2h0OjM1cHg7dGV4dC1hbGlnbjpjZW50ZXI7Zm9udC1zaXplOjE0cHh9LmJhYy0tdXNlci1hcHBze3Bvc2l0aW9uOnJlbGF0aXZlfSNiYWMtLXB1cmVzZGstYXBwcy1pY29uLS17d2lkdGg6MjBweDtkaXNwbGF5OmlubGluZS1ibG9jazt0ZXh0LWFsaWduOmNlbnRlcjtmb250LXNpemU6MTZweH0uYmFjLS1wdXJlc2RrLWFwcHMtbmFtZS0te2ZvbnQtc2l6ZTo5cHg7d2lkdGg6MjBweDt0ZXh0LWFsaWduOmNlbnRlcn0jYmFjLS1wdXJlc2RrLXVzZXItYnVzaW5lc3Nlcy0te2hlaWdodDpjYWxjKDEwMHZoIC0gMjk2cHgpO292ZXJmbG93OmF1dG99LmJhYy0tYXBwcy1jb250YWluZXJ7YmFja2dyb3VuZDojZmZmO3Bvc2l0aW9uOmFic29sdXRlO3RvcDo0NXB4O3JpZ2h0OjBweDtkaXNwbGF5OmZsZXg7d2lkdGg6MzAwcHg7ZmxleC13cmFwOndyYXA7Ym9yZGVyLXJhZGl1czoxMHB4O3BhZGRpbmc6MTVweDtwYWRkaW5nLXJpZ2h0OjA7anVzdGlmeS1jb250ZW50OnNwYWNlLWJldHdlZW47dGV4dC1hbGlnbjpsZWZ0Oy13ZWJraXQtYm94LXNoYWRvdzowIDAgMTBweCAycHggcmdiYSgwLDAsMCwwLjIpO2JveC1zaGFkb3c6MCAwIDEwcHggMnB4IHJnYmEoMCwwLDAsMC4yKTtvcGFjaXR5OjA7dmlzaWJpbGl0eTpoaWRkZW47dHJhbnNpdGlvbjphbGwgMC40cyBlYXNlO21heC1oZWlnaHQ6NTAwcHh9LmJhYy0tYXBwcy1jb250YWluZXIgI2JhYy0tYXBzLWFjdHVhbC1jb250YWluZXJ7aGVpZ2h0OjEwMCU7b3ZlcmZsb3c6c2Nyb2xsO21heC1oZWlnaHQ6NDc1cHg7d2lkdGg6MTAwJX0uYmFjLS1hcHBzLWNvbnRhaW5lci5hY3RpdmV7b3BhY2l0eToxO3Zpc2liaWxpdHk6dmlzaWJsZX0uYmFjLS1hcHBzLWNvbnRhaW5lcjpiZWZvcmV7Y29udGVudDpcIlwiO3ZlcnRpY2FsLWFsaWduOm1pZGRsZTttYXJnaW46YXV0bztwb3NpdGlvbjphYnNvbHV0ZTtkaXNwbGF5OmJsb2NrO2xlZnQ6MDtyaWdodDotMTg1cHg7Ym90dG9tOmNhbGMoMTAwJSAtIDZweCk7d2lkdGg6MTJweDtoZWlnaHQ6MTJweDt0cmFuc2Zvcm06cm90YXRlKDQ1ZGVnKTtiYWNrZ3JvdW5kLWNvbG9yOiNmZmZ9LmJhYy0tYXBwcy1jb250YWluZXIgLmJhYy0tYXBwc3t3aWR0aDoxMDAlO2ZvbnQtc2l6ZToyMHB4O21hcmdpbi1ib3R0b206MTVweDt0ZXh0LWFsaWduOmxlZnQ7aGVpZ2h0OjMzcHh9LmJhYy0tYXBwcy1jb250YWluZXIgLmJhYy0tYXBwczpsYXN0LWNoaWxke21hcmdpbi1ib3R0b206MH0uYmFjLS1hcHBzLWNvbnRhaW5lciAuYmFjLS1hcHBzOmhvdmVye2JhY2tncm91bmQ6I2YzZjNmM30uYmFjLS1hcHBzLWNvbnRhaW5lciAuYmFjLS1hcHBzIGEuYmFjLS1pbWFnZS1saW5re2Rpc3BsYXk6aW5saW5lLWJsb2NrO2NvbG9yOiNmZmY7dGV4dC1kZWNvcmF0aW9uOm5vbmU7d2lkdGg6MzNweDtoZWlnaHQ6MzNweH0uYmFjLS1hcHBzLWNvbnRhaW5lciAuYmFjLS1hcHBzIGEuYmFjLS1pbWFnZS1saW5rIGltZ3t3aWR0aDoxMDAlO2hlaWdodDoxMDAlfS5iYWMtLWFwcHMtY29udGFpbmVyIC5iYWMtLWFwcHMgLmJhYy0tcHVyZXNkay1hcHAtdGV4dC1jb250YWluZXJ7ZGlzcGxheTppbmxpbmUtYmxvY2s7cG9zaXRpb246cmVsYXRpdmU7bGVmdDotMnB4O3dpZHRoOmNhbGMoMTAwJSAtIDQycHgpfS5iYWMtLWFwcHMtY29udGFpbmVyIC5iYWMtLWFwcHMgLmJhYy0tcHVyZXNkay1hcHAtdGV4dC1jb250YWluZXIgYXtkaXNwbGF5OmJsb2NrO3RleHQtZGVjb3JhdGlvbjpub25lO2N1cnNvcjpwb2ludGVyO3BhZGRpbmctbGVmdDo4cHh9LmJhYy0tYXBwcy1jb250YWluZXIgLmJhYy0tYXBwcyAuYmFjLS1wdXJlc2RrLWFwcC10ZXh0LWNvbnRhaW5lciAuYmFjLS1hcHAtbmFtZXt3aWR0aDoxMDAlO2NvbG9yOiMwMDA7Zm9udC1zaXplOjEzcHg7cGFkZGluZy1ib3R0b206NHB4fS5iYWMtLWFwcHMtY29udGFpbmVyIC5iYWMtLWFwcHMgLmJhYy0tcHVyZXNkay1hcHAtdGV4dC1jb250YWluZXIgLmJhYy0tYXBwLWRlc2NyaXB0aW9ue2NvbG9yOiM5MTkxOTE7Zm9udC1zaXplOjExcHg7Zm9udC1zdHlsZTppdGFsaWM7bGluZS1oZWlnaHQ6MS4zZW07cG9zaXRpb246cmVsYXRpdmU7dG9wOi0ycHg7b3ZlcmZsb3c6aGlkZGVuO3doaXRlLXNwYWNlOm5vd3JhcDt0ZXh0LW92ZXJmbG93OmVsbGlwc2lzfS5iYWMtLXVzZXItc2lkZWJhcntiYWNrZ3JvdW5kOndoaXRlO2ZvbnQtZmFtaWx5OlwiVmVyZGFuYVwiLCBhcmlhbCwgc2Fucy1zZXJpZjtjb2xvcjojMzMzMzMzO2hlaWdodDpjYWxjKDEwMHZoIC0gNTBweCk7Ym94LXNpemluZzpib3JkZXItYm94O3dpZHRoOjMyMHB4O3Bvc2l0aW9uOmZpeGVkO3RvcDo1MHB4O3JpZ2h0OjA7ei1pbmRleDo5OTk5OTk7b3BhY2l0eTowO3RyYW5zZm9ybTp0cmFuc2xhdGVYKDEwMCUpO3RyYW5zaXRpb246YWxsIDAuNHMgZWFzZX0uYmFjLS11c2VyLXNpZGViYXIgLmJhYy0tdXNlci1zaWRlYmFyLXdoaXRlLWJne3dpZHRoOjEwMCU7aGVpZ2h0OjEwMCV9LmJhYy0tdXNlci1zaWRlYmFyLmFjdGl2ZXtvcGFjaXR5OjE7dHJhbnNmb3JtOnRyYW5zbGF0ZVgoMCUpOy13ZWJraXQtYm94LXNoYWRvdzotMXB4IDBweCAxMnB4IDBweCByZ2JhKDAsMCwwLDAuNzUpOy1tb3otYm94LXNoYWRvdzotMXB4IDNweCAxMnB4IDBweCByZ2JhKDAsMCwwLDAuNzUpO2JveC1zaGFkb3c6LTFweCAwcHggMTJweCAwcHggcmdiYSgwLDAsMCwwLjc1KX0uYmFjLS11c2VyLXNpZGViYXIgLmJhYy0tdXNlci1saXN0LWl0ZW17ZGlzcGxheTpmbGV4O3Bvc2l0aW9uOnJlbGF0aXZlO2N1cnNvcjpwb2ludGVyO2FsaWduLWl0ZW1zOmNlbnRlcjtwYWRkaW5nOjEwcHggMTBweCAxMHB4IDQwcHg7Ym9yZGVyLWJvdHRvbToxcHggc29saWQgd2hpdGV9LmJhYy0tdXNlci1zaWRlYmFyIC5iYWMtLXVzZXItbGlzdC1pdGVtOmhvdmVye2JhY2tncm91bmQtY29sb3I6cmdiYSgyNTUsMjU1LDI1NSwwLjEpfS5iYWMtLXVzZXItc2lkZWJhciAuYmFjLS11c2VyLWxpc3QtaXRlbSAuYmFjLS1zZWxlY3RlZC1hY291bnQtaW5kaWNhdG9ye3Bvc2l0aW9uOmFic29sdXRlO3JpZ2h0OjA7aGVpZ2h0OjEwMCU7d2lkdGg6OHB4O2JhY2tncm91bmQ6IzMzMzMzM30uYmFjLS11c2VyLXNpZGViYXIgLmJhYy0tdXNlci1saXN0LWl0ZW0gLmJhYy0tdXNlci1saXN0LWl0ZW0taW1hZ2V7d2lkdGg6NDBweDtoZWlnaHQ6NDBweDtib3JkZXItcmFkaXVzOjNweDtib3JkZXI6MXB4IHNvbGlkICMzMzMzMzM7b3ZlcmZsb3c6aGlkZGVuO21hcmdpbi1yaWdodDoyMHB4O2Rpc3BsYXk6ZmxleDthbGlnbi1pdGVtczpjZW50ZXI7anVzdGlmeS1jb250ZW50OmNlbnRlcn0uYmFjLS11c2VyLXNpZGViYXIgLmJhYy0tdXNlci1saXN0LWl0ZW0gLmJhYy0tdXNlci1saXN0LWl0ZW0taW1hZ2U+aW1ne3dpZHRoOmF1dG87aGVpZ2h0OmF1dG87bWF4LXdpZHRoOjEwMCU7bWF4LWhlaWdodDoxMDAlfS5iYWMtLXVzZXItc2lkZWJhciAuYmFjLS11c2VyLWxpc3QtaXRlbSBzcGFue3dpZHRoOjEwMCU7ZGlzcGxheTpibG9jazttYXJnaW4tYm90dG9tOjVweH0uYmFjLS11c2VyLXNpZGViYXIgLmJhYy11c2VyLWFwcC1kZXRhaWxzIHNwYW57Zm9udC1zaXplOjEycHh9LmJhYy0tdXNlci1zaWRlYmFyIC5wdXJlc2RrLXZlcnNpb24tbnVtYmVye3dpZHRoOjEwMCU7dGV4dC1hbGlnbjpyaWdodDtwYWRkaW5nLXJpZ2h0OjEwcHg7cG9zaXRpb246YWJzb2x1dGU7Zm9udC1zaXplOjhweDtvcGFjaXR5OjAuNTtyaWdodDowO2JvdHRvbTowfS5iYWMtLXVzZXItc2lkZWJhci1pbmZve2Rpc3BsYXk6ZmxleDtqdXN0aWZ5LWNvbnRlbnQ6Y2VudGVyO2ZsZXgtd3JhcDp3cmFwO3RleHQtYWxpZ246Y2VudGVyO3BhZGRpbmc6MjBweCAyMHB4IDE1cHh9LmJhYy0tdXNlci1zaWRlYmFyLWluZm8gLmJhYy0tdXNlci1pbWFnZXtib3JkZXI6MXB4ICNhZGFkYWQgc29saWQ7b3ZlcmZsb3c6aGlkZGVuO2JvcmRlci1yYWRpdXM6NTAlO3Bvc2l0aW9uOnJlbGF0aXZlO2N1cnNvcjpwb2ludGVyO2Rpc3BsYXk6aW5saW5lLWJsb2NrO2hlaWdodDo4MHB4O3dpZHRoOjgwcHg7bGluZS1oZWlnaHQ6ODBweDt0ZXh0LWFsaWduOmNlbnRlcjtjb2xvcjojZmZmO2JvcmRlci1yYWRpdXM6NTAlO2JhY2tncm91bmQtY29sb3I6I2FkYWRhZDttYXJnaW4tYm90dG9tOjE1cHh9LmJhYy0tdXNlci1zaWRlYmFyLWluZm8gLmJhYy0tdXNlci1pbWFnZSAjYmFjLS11c2VyLWltYWdlLWZpbGV7ZGlzcGxheTpub25lO3Bvc2l0aW9uOmFic29sdXRlO3otaW5kZXg6MTt0b3A6MDtsZWZ0OjA7d2lkdGg6MTAwJTtoZWlnaHQ6MTAwJX0uYmFjLS11c2VyLXNpZGViYXItaW5mbyAuYmFjLS11c2VyLWltYWdlICNiYWMtLXVzZXItaW1hZ2UtZmlsZSBpbWd7d2lkdGg6MTAwJTtoZWlnaHQ6MTAwJX0uYmFjLS11c2VyLXNpZGViYXItaW5mbyAuYmFjLS11c2VyLWltYWdlICNiYWMtLXVzZXItaW1hZ2UtZmlsZS5iYWMtLXB1cmVzZGstdmlzaWJsZXtkaXNwbGF5OmJsb2NrfS5iYWMtLXVzZXItc2lkZWJhci1pbmZvIC5iYWMtLXVzZXItaW1hZ2UgI2JhYy0tdXNlci1pbWFnZS11cGxvYWQtcHJvZ3Jlc3N7cG9zaXRpb246YWJzb2x1dGU7cGFkZGluZy10b3A6MTBweDt0b3A6MDtiYWNrZ3JvdW5kOiM2NjY7ei1pbmRleDo0O2Rpc3BsYXk6bm9uZTt3aWR0aDoxMDAlO2hlaWdodDoxMDAlfS5iYWMtLXVzZXItc2lkZWJhci1pbmZvIC5iYWMtLXVzZXItaW1hZ2UgI2JhYy0tdXNlci1pbWFnZS11cGxvYWQtcHJvZ3Jlc3MuYmFjLS1wdXJlc2RrLXZpc2libGV7ZGlzcGxheTpibG9ja30uYmFjLS11c2VyLXNpZGViYXItaW5mbyAuYmFjLS11c2VyLWltYWdlIGl7Zm9udC1zaXplOjMycHg7Zm9udC1zaXplOjMycHg7ei1pbmRleDowO3Bvc2l0aW9uOmFic29sdXRlO3dpZHRoOjEwMCU7bGVmdDowO2JhY2tncm91bmQtY29sb3I6cmdiYSgwLDAsMCwwLjUpfS5iYWMtLXVzZXItc2lkZWJhci1pbmZvIC5iYWMtLXVzZXItaW1hZ2U6aG92ZXIgaXt6LWluZGV4OjN9LmJhYy0tdXNlci1zaWRlYmFyLWluZm8gLmJhYy0tdXNlci1uYW1le3dpZHRoOjEwMCU7dGV4dC1hbGlnbjpjZW50ZXI7Zm9udC1zaXplOjE4cHg7bWFyZ2luLWJvdHRvbToxMHB4fS5iYWMtLXVzZXItc2lkZWJhci1pbmZvIC5iYWMtLXVzZXItZW1haWx7Zm9udC1zaXplOjEycHg7Zm9udC13ZWlnaHQ6MzAwfS5iYWMtLXVzZXItYWNjb3VudC1zZXR0aW5nc3twb3NpdGlvbjphYnNvbHV0ZTtib3R0b206MTBweDtsZWZ0OjIwcHg7d2lkdGg6OTAlO2hlaWdodDoxMHB4fSNiYWMtLXB1cmVzZGstYWNjb3VudC1sb2dvLS17Y3Vyc29yOnBvaW50ZXI7cG9zaXRpb246cmVsYXRpdmU7Y29sb3I6I2ZmZn0jYmFjLS1wdXJlc2RrLWFjY291bnQtbG9nby0tIGltZ3toZWlnaHQ6MjhweDt0b3A6M3B4O3Bvc2l0aW9uOnJlbGF0aXZlfSNiYWMtLWluZm8tYmxvY2tzLXdyYXBwZXItLXtwb3NpdGlvbjpmaXhlZDt0b3A6MHB4O2hlaWdodDphdXRvfSNiYWMtLWluZm8tYmxvY2tzLXdyYXBwZXItLSAuYmFjLS1wdXJlc2RrLWluZm8tYm94LS17Ym9yZGVyLXJhZGl1czowIDAgM3B4IDNweDtvdmVyZmxvdzpoaWRkZW47ei1pbmRleDo5OTk5OTk5OTtwb3NpdGlvbjpyZWxhdGl2ZTttYXJnaW4tdG9wOjA7d2lkdGg6NDcwcHg7bGVmdDpjYWxjKDUwdncgLSAyMzVweCk7aGVpZ2h0OjBweDstd2Via2l0LXRyYW5zaXRpb246dG9wIDAuNHM7dHJhbnNpdGlvbjphbGwgMC40c30jYmFjLS1pbmZvLWJsb2Nrcy13cmFwcGVyLS0gLmJhYy0tcHVyZXNkay1pbmZvLWJveC0tLmJhYy0tc3VjY2Vzc3tiYWNrZ3JvdW5kOiMxNERBOUV9I2JhYy0taW5mby1ibG9ja3Mtd3JhcHBlci0tIC5iYWMtLXB1cmVzZGstaW5mby1ib3gtLS5iYWMtLXN1Y2Nlc3MgLmJhYy0taW5uZXItaW5mby1ib3gtLSBkaXYuYmFjLS1pbmZvLWljb24tLS5mYS1zdWNjZXNze2Rpc3BsYXk6aW5saW5lLWJsb2NrfSNiYWMtLWluZm8tYmxvY2tzLXdyYXBwZXItLSAuYmFjLS1wdXJlc2RrLWluZm8tYm94LS0uYmFjLS1pbmZve2JhY2tncm91bmQtY29sb3I6IzVCQzBERX0jYmFjLS1pbmZvLWJsb2Nrcy13cmFwcGVyLS0gLmJhYy0tcHVyZXNkay1pbmZvLWJveC0tLmJhYy0taW5mbyAuYmFjLS1pbm5lci1pbmZvLWJveC0tIGRpdi5iYWMtLWluZm8taWNvbi0tLmZhLWluZm8tMXtkaXNwbGF5OmlubGluZS1ibG9ja30jYmFjLS1pbmZvLWJsb2Nrcy13cmFwcGVyLS0gLmJhYy0tcHVyZXNkay1pbmZvLWJveC0tLmJhYy0td2FybmluZ3tiYWNrZ3JvdW5kOiNGMEFENEV9I2JhYy0taW5mby1ibG9ja3Mtd3JhcHBlci0tIC5iYWMtLXB1cmVzZGstaW5mby1ib3gtLS5iYWMtLXdhcm5pbmcgLmJhYy0taW5uZXItaW5mby1ib3gtLSBkaXYuYmFjLS1pbmZvLWljb24tLS5mYS13YXJuaW5ne2Rpc3BsYXk6aW5saW5lLWJsb2NrfSNiYWMtLWluZm8tYmxvY2tzLXdyYXBwZXItLSAuYmFjLS1wdXJlc2RrLWluZm8tYm94LS0uYmFjLS1lcnJvcntiYWNrZ3JvdW5kOiNFRjQxMDB9I2JhYy0taW5mby1ibG9ja3Mtd3JhcHBlci0tIC5iYWMtLXB1cmVzZGstaW5mby1ib3gtLS5iYWMtLWVycm9yIC5iYWMtLWlubmVyLWluZm8tYm94LS0gZGl2LmJhYy0taW5mby1pY29uLS0uZmEtZXJyb3J7ZGlzcGxheTppbmxpbmUtYmxvY2t9I2JhYy0taW5mby1ibG9ja3Mtd3JhcHBlci0tIC5iYWMtLXB1cmVzZGstaW5mby1ib3gtLSAuYmFjLS10aW1lcnstd2Via2l0LXRyYW5zaXRpb24tdGltaW5nLWZ1bmN0aW9uOmxpbmVhcjt0cmFuc2l0aW9uLXRpbWluZy1mdW5jdGlvbjpsaW5lYXI7cG9zaXRpb246YWJzb2x1dGU7Ym90dG9tOjBweDtvcGFjaXR5OjAuNTtoZWlnaHQ6MnB4ICFpbXBvcnRhbnQ7YmFja2dyb3VuZDp3aGl0ZTt3aWR0aDowJX0jYmFjLS1pbmZvLWJsb2Nrcy13cmFwcGVyLS0gLmJhYy0tcHVyZXNkay1pbmZvLWJveC0tIC5iYWMtLXRpbWVyLmJhYy0tZnVsbHdpZHRoe3dpZHRoOjEwMCV9I2JhYy0taW5mby1ibG9ja3Mtd3JhcHBlci0tIC5iYWMtLXB1cmVzZGstaW5mby1ib3gtLS5iYWMtLWFjdGl2ZS0te2hlaWdodDphdXRvO21hcmdpbi10b3A6NXB4fSNiYWMtLWluZm8tYmxvY2tzLXdyYXBwZXItLSAuYmFjLS1wdXJlc2RrLWluZm8tYm94LS0gLmJhYy0taW5uZXItaW5mby1ib3gtLXt3aWR0aDoxMDAlO3BhZGRpbmc6MTFweCAxNXB4O2NvbG9yOndoaXRlfSNiYWMtLWluZm8tYmxvY2tzLXdyYXBwZXItLSAuYmFjLS1wdXJlc2RrLWluZm8tYm94LS0gLmJhYy0taW5uZXItaW5mby1ib3gtLSBkaXZ7ZGlzcGxheTppbmxpbmUtYmxvY2s7aGVpZ2h0OjE4cHg7cG9zaXRpb246cmVsYXRpdmV9I2JhYy0taW5mby1ibG9ja3Mtd3JhcHBlci0tIC5iYWMtLXB1cmVzZGstaW5mby1ib3gtLSAuYmFjLS1pbm5lci1pbmZvLWJveC0tIGRpdi5iYWMtLWluZm8taWNvbi0te2Rpc3BsYXk6bm9uZTt0b3A6MHB4fSNiYWMtLWluZm8tYmxvY2tzLXdyYXBwZXItLSAuYmFjLS1wdXJlc2RrLWluZm8tYm94LS0gLmJhYy0taW5uZXItaW5mby1ib3gtLSAuYmFjLS1pbmZvLWljb24tLXttYXJnaW4tcmlnaHQ6MTVweDt3aWR0aDoxMHB4O3RvcDoycHh9I2JhYy0taW5mby1ibG9ja3Mtd3JhcHBlci0tIC5iYWMtLXB1cmVzZGstaW5mby1ib3gtLSAuYmFjLS1pbm5lci1pbmZvLWJveC0tIC5iYWMtLWluZm8tbWFpbi10ZXh0LS17d2lkdGg6MzgwcHg7bWFyZ2luLXJpZ2h0OjE1cHg7Zm9udC1zaXplOjEycHg7dGV4dC1hbGlnbjpjZW50ZXJ9I2JhYy0taW5mby1ibG9ja3Mtd3JhcHBlci0tIC5iYWMtLXB1cmVzZGstaW5mby1ib3gtLSAuYmFjLS1pbm5lci1pbmZvLWJveC0tIC5iYWMtLWluZm8tY2xvc2UtYnV0dG9uLS17d2lkdGg6MTBweDtjdXJzb3I6cG9pbnRlcjt0b3A6MnB4fUBtZWRpYSAobWluLXdpZHRoOiA2MDBweCl7LmJhYy0tY29udGFpbmVyLmJhYy0tZnVsbHdpZHRoIC5iYWMtLWNvbnRhaW5lcntwYWRkaW5nLWxlZnQ6MjRweDtwYWRkaW5nLXJpZ2h0OjI0cHh9fUBtZWRpYSAobWluLXdpZHRoOiA5NjBweCl7LmJhYy0tY29udGFpbmVyLmJhYy0tZnVsbHdpZHRoIC5iYWMtLWNvbnRhaW5lcntwYWRkaW5nLWxlZnQ6MzJweDtwYWRkaW5nLXJpZ2h0OjMycHh9fS5iYWMtLWN1c3RvbS1tb2RhbHtwb3NpdGlvbjpmaXhlZDt3aWR0aDo3MCU7aGVpZ2h0OjgwJTttaW4td2lkdGg6NDAwcHg7bGVmdDowO3JpZ2h0OjA7dG9wOjA7Ym90dG9tOjA7bWFyZ2luOmF1dG87Ym9yZGVyOjFweCBzb2xpZCAjOTc5Nzk3O2JvcmRlci1yYWRpdXM6NXB4O2JveC1zaGFkb3c6MCAwIDcxcHggMCAjMkYzODQ5O2JhY2tncm91bmQ6I2ZmZjt6LWluZGV4Ojk5OTtvdmVyZmxvdzphdXRvO2Rpc3BsYXk6bm9uZX0uYmFjLS1jdXN0b20tbW9kYWwuaXMtb3BlbntkaXNwbGF5OmJsb2NrfS5iYWMtLWN1c3RvbS1tb2RhbCAuY3VzdG9tLW1vZGFsX19jbG9zZS1idG57dGV4dC1kZWNvcmF0aW9uOm5vbmU7cGFkZGluZy10b3A6MnB4O2xpbmUtaGVpZ2h0OjE4cHg7aGVpZ2h0OjIwcHg7d2lkdGg6MjBweDtib3JkZXItcmFkaXVzOjUwJTtjb2xvcjojOTA5YmE0O3RleHQtYWxpZ246Y2VudGVyO3Bvc2l0aW9uOmFic29sdXRlO3RvcDoyMHB4O3JpZ2h0OjIwcHg7Zm9udC1zaXplOjIwcHh9LmJhYy0tY3VzdG9tLW1vZGFsIC5jdXN0b20tbW9kYWxfX2Nsb3NlLWJ0bjpob3Zlcnt0ZXh0LWRlY29yYXRpb246bm9uZTtjb2xvcjojNDU1MDY2O2N1cnNvcjpwb2ludGVyfS5iYWMtLWN1c3RvbS1tb2RhbCAuY3VzdG9tLW1vZGFsX193cmFwcGVye2hlaWdodDoxMDAlO2Rpc3BsYXk6ZmxleDtmbGV4LWRpcmVjdGlvbjpjb2x1bW59LmJhYy0tY3VzdG9tLW1vZGFsIC5jdXN0b20tbW9kYWxfX3dyYXBwZXIgaWZyYW1le3dpZHRoOjEwMCU7aGVpZ2h0OjEwMCV9LmJhYy0tY3VzdG9tLW1vZGFsIC5jdXN0b20tbW9kYWxfX2NvbnRlbnQtd3JhcHBlcntoZWlnaHQ6MTAwJTtvdmVyZmxvdzphdXRvO21hcmdpbi1ib3R0b206MTA0cHg7Ym9yZGVyLXRvcDoycHggc29saWQgI0M5Q0REN30uYmFjLS1jdXN0b20tbW9kYWwgLmN1c3RvbS1tb2RhbF9fY29udGVudC13cmFwcGVyLm5vLW1hcmdpbnttYXJnaW4tYm90dG9tOjB9LmJhYy0tY3VzdG9tLW1vZGFsIC5jdXN0b20tbW9kYWxfX2NvbnRlbnR7cGFkZGluZzoyMHB4O3Bvc2l0aW9uOnJlbGF0aXZlfS5iYWMtLWN1c3RvbS1tb2RhbCAuY3VzdG9tLW1vZGFsX19jb250ZW50IGgze2NvbG9yOiMyRjM4NDk7Zm9udC1zaXplOjIwcHg7Zm9udC13ZWlnaHQ6NjAwO2xpbmUtaGVpZ2h0OjI3cHh9LmJhYy0tY3VzdG9tLW1vZGFsIC5jdXN0b20tbW9kYWxfX3NhdmV7cG9zaXRpb246YWJzb2x1dGU7cmlnaHQ6MDtib3R0b206MDt3aWR0aDoxMDAlO3BhZGRpbmc6MzBweCAzMnB4O2JhY2tncm91bmQtY29sb3I6I0YyRjJGNH0uYmFjLS1jdXN0b20tbW9kYWwgLmN1c3RvbS1tb2RhbF9fc2F2ZSBhLC5iYWMtLWN1c3RvbS1tb2RhbCAuY3VzdG9tLW1vZGFsX19zYXZlIGJ1dHRvbntmb250LXNpemU6MTRweDtsaW5lLWhlaWdodDoyMnB4O2hlaWdodDo0NHB4O3dpZHRoOjEwMCV9LmJhYy0tY3VzdG9tLW1vZGFsIC5jdXN0b20tbW9kYWxfX3NwbGl0dGVye2hlaWdodDozMHB4O2xpbmUtaGVpZ2h0OjMwcHg7cGFkZGluZzowIDIwcHg7Ym9yZGVyLWNvbG9yOiNEM0QzRDM7Ym9yZGVyLXN0eWxlOnNvbGlkO2JvcmRlci13aWR0aDoxcHggMCAxcHggMDtiYWNrZ3JvdW5kLWNvbG9yOiNGMEYwRjA7Y29sb3I6IzY3NkY4Mjtmb250LXNpemU6MTNweDtmb250LXdlaWdodDo2MDB9LmJhYy0tY3VzdG9tLW1vZGFsIC5jdXN0b20tbW9kYWxfX2JveHtkaXNwbGF5OmlubGluZS1ibG9jazt2ZXJ0aWNhbC1hbGlnbjptaWRkbGU7aGVpZ2h0OjE2NXB4O3dpZHRoOjE2NXB4O2JvcmRlcjoycHggc29saWQgcmVkO2JvcmRlci1yYWRpdXM6NXB4O3RleHQtYWxpZ246Y2VudGVyO2ZvbnQtc2l6ZToxMnB4O2ZvbnQtd2VpZ2h0OjYwMDtjb2xvcjojOTA5N0E4O3RleHQtZGVjb3JhdGlvbjpub25lO21hcmdpbjoxMHB4IDIwcHggMTBweCAwO3RyYW5zaXRpb246MC4xcyBhbGx9LmJhYy0tY3VzdG9tLW1vZGFsIC5jdXN0b20tbW9kYWxfX2JveCBpe2ZvbnQtc2l6ZTo3MHB4O2Rpc3BsYXk6YmxvY2s7bWFyZ2luOjI1cHggMH0uYmFjLS1jdXN0b20tbW9kYWwgLmN1c3RvbS1tb2RhbF9fYm94LmFjdGl2ZXtjb2xvcjp5ZWxsb3c7Ym9yZGVyLWNvbG9yOnllbGxvdzt0ZXh0LWRlY29yYXRpb246bm9uZX0uYmFjLS1jdXN0b20tbW9kYWwgLmN1c3RvbS1tb2RhbF9fYm94OmhvdmVyLC5iYWMtLWN1c3RvbS1tb2RhbCAuY3VzdG9tLW1vZGFsX19ib3g6YWN0aXZlLC5iYWMtLWN1c3RvbS1tb2RhbCAuY3VzdG9tLW1vZGFsX19ib3g6Zm9jdXN7Y29sb3I6IzFBQzBCNDtib3JkZXItY29sb3I6eWVsbG93O3RleHQtZGVjb3JhdGlvbjpub25lfS5jbG91ZC1pbWFnZXNfX2NvbnRhaW5lcntkaXNwbGF5OmZsZXg7ZmxleC13cmFwOndyYXA7anVzdGlmeS1jb250ZW50OmZsZXgtc3RhcnR9LmNsb3VkLWltYWdlc19fcGFnaW5hdGlvbntwYWRkaW5nOjIwcHh9LmNsb3VkLWltYWdlc19fcGFnaW5hdGlvbiBsaXtkaXNwbGF5OmlubGluZS1ibG9jazttYXJnaW4tcmlnaHQ6MTBweH0uY2xvdWQtaW1hZ2VzX19wYWdpbmF0aW9uIGxpIGF7Y29sb3I6I2ZmZjtiYWNrZ3JvdW5kLWNvbG9yOiM1ZTY3NzY7Ym9yZGVyLXJhZGl1czoyMHB4O3RleHQtZGVjb3JhdGlvbjpub25lO2Rpc3BsYXk6YmxvY2s7Zm9udC13ZWlnaHQ6MjAwO2hlaWdodDozNXB4O3dpZHRoOjM1cHg7bGluZS1oZWlnaHQ6MzVweDt0ZXh0LWFsaWduOmNlbnRlcn0uY2xvdWQtaW1hZ2VzX19wYWdpbmF0aW9uIGxpLmFjdGl2ZSBhe2JhY2tncm91bmQtY29sb3I6IzJmMzg0OX0uY2xvdWQtaW1hZ2VzX19pdGVte3dpZHRoOjE1NXB4O2hlaWdodDoxNzBweDtib3JkZXI6MXB4IHNvbGlkICNlZWU7YmFja2dyb3VuZC1jb2xvcjojZmZmO2JvcmRlci1yYWRpdXM6M3B4O21hcmdpbjowIDE1cHggMTVweCAwO3RleHQtYWxpZ246Y2VudGVyO3Bvc2l0aW9uOnJlbGF0aXZlO2N1cnNvcjpwb2ludGVyfS5jbG91ZC1pbWFnZXNfX2l0ZW0gLmNsb3VkLWltYWdlc19faXRlbV9fdHlwZXtoZWlnaHQ6MTE1cHg7Zm9udC1zaXplOjkwcHg7bGluZS1oZWlnaHQ6MTQwcHg7Ym9yZGVyLXRvcC1sZWZ0LXJhZGl1czozcHg7Ym9yZGVyLXRvcC1yaWdodC1yYWRpdXM6M3B4O2NvbG9yOiNhMmEyYTI7YmFja2dyb3VuZC1jb2xvcjojZTllYWVifS5jbG91ZC1pbWFnZXNfX2l0ZW0gLmNsb3VkLWltYWdlc19faXRlbV9fdHlwZT5pbWd7d2lkdGg6YXV0bztoZWlnaHQ6YXV0bzttYXgtd2lkdGg6MTAwJTttYXgtaGVpZ2h0OjEwMCV9LmNsb3VkLWltYWdlc19faXRlbSAuY2xvdWQtaW1hZ2VzX19pdGVtX19kZXRhaWxze3BhZGRpbmc6MTBweCAwfS5jbG91ZC1pbWFnZXNfX2l0ZW0gLmNsb3VkLWltYWdlc19faXRlbV9fZGV0YWlscyAuY2xvdWQtaW1hZ2VzX19pdGVtX19kZXRhaWxzX19uYW1le2ZvbnQtc2l6ZToxMnB4O291dGxpbmU6bm9uZTtwYWRkaW5nOjAgMTBweDtjb2xvcjojYTVhYmI1O2JvcmRlcjpub25lO3dpZHRoOjEwMCU7YmFja2dyb3VuZC1jb2xvcjp0cmFuc3BhcmVudDtoZWlnaHQ6MTVweDtkaXNwbGF5OmlubGluZS1ibG9jazt3b3JkLWJyZWFrOmJyZWFrLWFsbH0uY2xvdWQtaW1hZ2VzX19pdGVtIC5jbG91ZC1pbWFnZXNfX2l0ZW1fX2RldGFpbHMgLmNsb3VkLWltYWdlc19faXRlbV9fZGV0YWlsc19fZGF0ZXtmb250LXNpemU6MTBweDtib3R0b206NnB4O3dpZHRoOjE1NXB4O2hlaWdodDoxNXB4O2NvbG9yOiNhNWFiYjU7ZGlzcGxheTppbmxpbmUtYmxvY2t9LmNsb3VkLWltYWdlc19faXRlbSAuY2xvdWQtaW1hZ2VzX19pdGVtX19hY3Rpb25ze2Rpc3BsYXk6ZmxleDthbGlnbi1pdGVtczpjZW50ZXI7anVzdGlmeS1jb250ZW50OmNlbnRlcjtwb3NpdGlvbjphYnNvbHV0ZTt0b3A6MDtsZWZ0OjA7d2lkdGg6MTAwJTtoZWlnaHQ6MTE1cHg7YmFja2dyb3VuZC1jb2xvcjpyZ2JhKDc4LDgzLDkxLDAuODMpO29wYWNpdHk6MDt2aXNpYmlsaXR5OmhpZGRlbjtib3JkZXItdG9wLWxlZnQtcmFkaXVzOjNweDtib3JkZXItdG9wLXJpZ2h0LXJhZGl1czozcHg7dGV4dC1hbGlnbjpjZW50ZXI7dHJhbnNpdGlvbjowLjNzIG9wYWNpdHl9LmNsb3VkLWltYWdlc19faXRlbSAuY2xvdWQtaW1hZ2VzX19pdGVtX19hY3Rpb25zIGF7Zm9udC1zaXplOjE2cHg7Y29sb3I6I2ZmZjt0ZXh0LWRlY29yYXRpb246bm9uZX0uY2xvdWQtaW1hZ2VzX19pdGVtOmhvdmVyIC5jbG91ZC1pbWFnZXNfX2l0ZW0gLmNsb3VkLWltYWdlc19faXRlbV9fYWN0aW9uc3tvcGFjaXR5OjE7dmlzaWJpbGl0eTp2aXNpYmxlfScsXG4gICAgaGVhZCA9IGRvY3VtZW50LmhlYWQgfHwgZG9jdW1lbnQuZ2V0RWxlbWVudHNCeVRhZ05hbWUoJ2hlYWQnKVswXSxcbiAgICBzdHlsZSA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoJ3N0eWxlJyk7XG5zdHlsZS50eXBlID0gJ3RleHQvY3NzJztcblxuaWYgKHN0eWxlLnN0eWxlU2hlZXQpIHtcbiAgc3R5bGUuc3R5bGVTaGVldC5jc3NUZXh0ID0gY3NzO1xufSBlbHNlIHtcbiAgc3R5bGUuYXBwZW5kQ2hpbGQoZG9jdW1lbnQuY3JlYXRlVGV4dE5vZGUoY3NzKSk7XG59XG5cbmhlYWQuYXBwZW5kQ2hpbGQoc3R5bGUpO1xudmFyIGxpbmsgPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KCdsaW5rJyk7XG5saW5rLmhyZWYgPSAnaHR0cHM6Ly9hY2Nlc3MtZm9udHMucHVyZXByb2ZpbGUuY29tL3N0eWxlcy5jc3MnO1xubGluay5yZWwgPSAnc3R5bGVzaGVldCc7XG5kb2N1bWVudC5nZXRFbGVtZW50c0J5VGFnTmFtZSgnaGVhZCcpWzBdLmFwcGVuZENoaWxkKGxpbmspO1xubW9kdWxlLmV4cG9ydHMgPSBwcGJhOyIsIlwidXNlIHN0cmljdFwiO1xuXG52YXIgbHMgPSB3aW5kb3cubG9jYWxTdG9yYWdlO1xudmFyIGFjY291bnRLZXkgPSBcIl9fX19hY3RpdmVBY2NvdW50X19fX1wiO1xudmFyIEFDRyA9IHtcbiAgaW5pdGlhbGlzZTogZnVuY3Rpb24gaW5pdGlhbGlzZSh0YWJBY2NvdW50LCB2YWxpZGF0ZSwgaW52YWxpZGF0ZSkge1xuICAgIHdpbmRvdy5hZGRFdmVudExpc3RlbmVyKCdzdG9yYWdlJywgZnVuY3Rpb24gKCkge1xuICAgICAgdmFyIG5ld0FjY291bnQgPSBscy5nZXRJdGVtKGFjY291bnRLZXkpO1xuXG4gICAgICBpZiAobmV3QWNjb3VudCkge1xuICAgICAgICBpZiAobmV3QWNjb3VudCAhPT0gdGFiQWNjb3VudCkge1xuICAgICAgICAgIGludmFsaWRhdGUoKTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICB2YWxpZGF0ZSgpO1xuICAgICAgICB9XG4gICAgICB9XG4gICAgfSk7XG4gIH0sXG4gIGNoYW5nZUFjY291bnQ6IGZ1bmN0aW9uIGNoYW5nZUFjY291bnQobmV3QWNjb3VudCkge1xuICAgIGxzLnNldEl0ZW0oYWNjb3VudEtleSwgbmV3QWNjb3VudCk7XG4gIH1cbn07XG5tb2R1bGUuZXhwb3J0cyA9IEFDRzsiLCJcInVzZSBzdHJpY3RcIjtcblxudmFyIFN0b3JlID0gcmVxdWlyZSgnLi9zdG9yZScpO1xuXG52YXIgTG9nZ2VyID0gcmVxdWlyZSgnLi9sb2dnZXInKTtcblxudmFyIERvbSA9IHJlcXVpcmUoJy4vZG9tJyk7XG5cbnZhciBDYWxsZXIgPSByZXF1aXJlKCcuL2NhbGxlcicpO1xuXG52YXIgdXBsb2FkaW5nID0gZmFsc2U7XG52YXIgQXZhdGFyQ3RybCA9IHtcbiAgX3N1Ym1pdDogbnVsbCxcbiAgX2ZpbGU6IG51bGwsXG4gIF9wcm9ncmVzczogbnVsbCxcbiAgX3NpZGViYXJfYXZhdGFyOiBudWxsLFxuICBfdG9wX2F2YXRhcjogbnVsbCxcbiAgX3RvcF9hdmF0YXJfY29udGFpbmVyOiBudWxsLFxuICBpbml0OiBmdW5jdGlvbiBpbml0KCkge1xuICAgIEF2YXRhckN0cmwuX3N1Ym1pdCA9IGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKCdiYWMtLS1wdXJlc2RrLWF2YXRhci1zdWJtaXQnKTtcbiAgICBBdmF0YXJDdHJsLl9maWxlID0gZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoJ2JhYy0tLXB1cmVzZGstYXZhdGFyLWZpbGUnKTtcbiAgICBBdmF0YXJDdHJsLl90b3BfYXZhdGFyX2NvbnRhaW5lciA9IGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKCdiYWMtLWltYWdlLWNvbnRhaW5lci10b3AnKTtcbiAgICBBdmF0YXJDdHJsLl9wcm9ncmVzcyA9IGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKCdiYWMtLXVzZXItaW1hZ2UtdXBsb2FkLXByb2dyZXNzJyk7XG4gICAgQXZhdGFyQ3RybC5fc2lkZWJhcl9hdmF0YXIgPSBkb2N1bWVudC5nZXRFbGVtZW50QnlJZCgnYmFjLS11c2VyLWltYWdlLWZpbGUnKTtcbiAgICBBdmF0YXJDdHJsLl90b3BfYXZhdGFyID0gZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoJ2JhYy0tdXNlci1hdmF0YXItdG9wJyk7XG5cbiAgICBBdmF0YXJDdHJsLl9maWxlLmFkZEV2ZW50TGlzdGVuZXIoJ2NsaWNrJywgZnVuY3Rpb24gKGUpIHtcbiAgICAgIGUuc3RvcFByb3BhZ2F0aW9uKCk7XG4gICAgfSk7XG5cbiAgICBBdmF0YXJDdHJsLl9maWxlLmFkZEV2ZW50TGlzdGVuZXIoJ2NoYW5nZScsIGZ1bmN0aW9uIChlKSB7XG4gICAgICBBdmF0YXJDdHJsLnVwbG9hZCgpO1xuICAgIH0pO1xuXG4gICAgZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoJ2JhYy0tdXNlci1pbWFnZScpLmFkZEV2ZW50TGlzdGVuZXIoJ2NsaWNrJywgZnVuY3Rpb24gKGUpIHtcbiAgICAgIGUuc3RvcFByb3BhZ2F0aW9uKCk7XG5cbiAgICAgIEF2YXRhckN0cmwuX2ZpbGUuY2xpY2soKTtcbiAgICB9KTtcbiAgfSxcbiAgdXBsb2FkOiBmdW5jdGlvbiB1cGxvYWQoKSB7XG4gICAgaWYgKHVwbG9hZGluZykge1xuICAgICAgcmV0dXJuO1xuICAgIH1cblxuICAgIHVwbG9hZGluZyA9IHRydWU7XG5cbiAgICBpZiAoQXZhdGFyQ3RybC5fZmlsZS5maWxlcy5sZW5ndGggPT09IDApIHtcbiAgICAgIHJldHVybjtcbiAgICB9XG5cbiAgICB2YXIgZGF0YSA9IG5ldyBGb3JtRGF0YSgpO1xuICAgIGRhdGEuYXBwZW5kKCdmaWxlJywgQXZhdGFyQ3RybC5fZmlsZS5maWxlc1swXSk7XG5cbiAgICB2YXIgc3VjY2Vzc0NhbGxiYWNrID0gZnVuY3Rpb24gc3VjY2Vzc0NhbGxiYWNrKGRhdGEpIHtcbiAgICAgIDtcbiAgICB9O1xuXG4gICAgdmFyIGZhaWxDYWxsYmFjayA9IGZ1bmN0aW9uIGZhaWxDYWxsYmFjayhkYXRhKSB7XG4gICAgICA7XG4gICAgfTtcblxuICAgIHZhciByZXF1ZXN0ID0gbmV3IFhNTEh0dHBSZXF1ZXN0KCk7XG5cbiAgICByZXF1ZXN0Lm9ucmVhZHlzdGF0ZWNoYW5nZSA9IGZ1bmN0aW9uICgpIHtcbiAgICAgIHVwbG9hZGluZyA9IGZhbHNlO1xuXG4gICAgICBpZiAocmVxdWVzdC5yZWFkeVN0YXRlID09IDQpIHtcbiAgICAgICAgdHJ5IHtcbiAgICAgICAgICB2YXIgaW1hZ2VEYXRhID0gSlNPTi5wYXJzZShyZXF1ZXN0LnJlc3BvbnNlKS5kYXRhO1xuICAgICAgICAgIEF2YXRhckN0cmwuc2V0QXZhdGFyKGltYWdlRGF0YS51cmwpO1xuICAgICAgICAgIENhbGxlci5tYWtlQ2FsbCh7XG4gICAgICAgICAgICB0eXBlOiAnUFVUJyxcbiAgICAgICAgICAgIGVuZHBvaW50OiBTdG9yZS5nZXRBdmF0YXJVcGRhdGVVcmwoKSxcbiAgICAgICAgICAgIHBhcmFtczoge1xuICAgICAgICAgICAgICB1c2VyOiB7XG4gICAgICAgICAgICAgICAgYXZhdGFyX3V1aWQ6IGltYWdlRGF0YS5ndWlkXG4gICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICBjYWxsYmFja3M6IHtcbiAgICAgICAgICAgICAgc3VjY2Vzczogc3VjY2Vzc0NhbGxiYWNrLFxuICAgICAgICAgICAgICBmYWlsOiBmYWlsQ2FsbGJhY2tcbiAgICAgICAgICAgIH1cbiAgICAgICAgICB9KTtcbiAgICAgICAgfSBjYXRjaCAoZSkge1xuICAgICAgICAgIHZhciByZXNwID0ge1xuICAgICAgICAgICAgc3RhdHVzOiAnZXJyb3InLFxuICAgICAgICAgICAgZGF0YTogJ1Vua25vd24gZXJyb3Igb2NjdXJyZWQ6IFsnICsgcmVxdWVzdC5yZXNwb25zZVRleHQgKyAnXSdcbiAgICAgICAgICB9O1xuICAgICAgICB9XG5cbiAgICAgICAgTG9nZ2VyLmxvZyhyZXF1ZXN0LnJlc3BvbnNlLnN0YXR1cyArICc6ICcgKyByZXF1ZXN0LnJlc3BvbnNlLmRhdGEpO1xuICAgICAgfVxuICAgIH07IC8vIHJlcXVlc3QudXBsb2FkLmFkZEV2ZW50TGlzdGVuZXIoJ3Byb2dyZXNzJywgZnVuY3Rpb24oZSl7XG4gICAgLy8gXHRMb2dnZXIubG9nKGUubG9hZGVkL2UudG90YWwpO1xuICAgIC8vIFx0QXZhdGFyQ3RybC5fcHJvZ3Jlc3Muc3R5bGUudG9wID0gMTAwIC0gKGUubG9hZGVkL2UudG90YWwpICogMTAwICsgJyUnO1xuICAgIC8vIH0sIGZhbHNlKTtcblxuXG4gICAgdmFyIHVybCA9IFN0b3JlLmdldEF2YXRhclVwbG9hZFVybCgpO1xuICAgIERvbS5hZGRDbGFzcyhBdmF0YXJDdHJsLl9wcm9ncmVzcywgJ2JhYy0tcHVyZXNkay12aXNpYmxlJyk7XG4gICAgcmVxdWVzdC5vcGVuKCdQT1NUJywgdXJsKTtcbiAgICByZXF1ZXN0LnNlbmQoZGF0YSk7XG4gIH0sXG4gIHNldEF2YXRhcjogZnVuY3Rpb24gc2V0QXZhdGFyKHVybCkge1xuICAgIGlmICghdXJsKSB7XG4gICAgICByZXR1cm47XG4gICAgfVxuXG4gICAgRG9tLnJlbW92ZUNsYXNzKEF2YXRhckN0cmwuX3Byb2dyZXNzLCAnYmFjLS1wdXJlc2RrLXZpc2libGUnKTtcbiAgICBEb20uYWRkQ2xhc3MoQXZhdGFyQ3RybC5fc2lkZWJhcl9hdmF0YXIsICdiYWMtLXB1cmVzZGstdmlzaWJsZScpO1xuICAgIHZhciBpbWcgPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KCdpbWcnKTtcbiAgICBpbWcuc3JjID0gdXJsO1xuICAgIEF2YXRhckN0cmwuX3NpZGViYXJfYXZhdGFyLmlubmVySFRNTCA9ICcnO1xuXG4gICAgQXZhdGFyQ3RybC5fc2lkZWJhcl9hdmF0YXIuYXBwZW5kQ2hpbGQoaW1nKTtcblxuICAgIERvbS5hZGRDbGFzcyhBdmF0YXJDdHJsLl90b3BfYXZhdGFyX2NvbnRhaW5lciwgJ2JhYy0tcHVyZXNkay12aXNpYmxlJyk7XG4gICAgdmFyIGltZ18yID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudCgnaW1nJyk7XG4gICAgaW1nXzIuc3JjID0gdXJsO1xuICAgIEF2YXRhckN0cmwuX3RvcF9hdmF0YXJfY29udGFpbmVyLmlubmVySFRNTCA9ICcnO1xuXG4gICAgQXZhdGFyQ3RybC5fdG9wX2F2YXRhcl9jb250YWluZXIuYXBwZW5kQ2hpbGQoaW1nXzIpOyAvLyAgYmFjLS1pbWFnZS1jb250YWluZXItdG9wXG5cbiAgfVxufTtcbm1vZHVsZS5leHBvcnRzID0gQXZhdGFyQ3RybDsiLCJcInVzZSBzdHJpY3RcIjtcblxudmFyIFN0b3JlID0gcmVxdWlyZSgnLi9zdG9yZS5qcycpO1xuXG52YXIgTG9nZ2VyID0gcmVxdWlyZSgnLi9sb2dnZXInKTtcblxudmFyIHBhcmFtc1RvR2V0VmFycyA9IGZ1bmN0aW9uIHBhcmFtc1RvR2V0VmFycyhwYXJhbXMpIHtcbiAgdmFyIHRvUmV0dXJuID0gW107XG5cbiAgZm9yICh2YXIgcHJvcGVydHkgaW4gcGFyYW1zKSB7XG4gICAgaWYgKHBhcmFtcy5oYXNPd25Qcm9wZXJ0eShwcm9wZXJ0eSkpIHtcbiAgICAgIHRvUmV0dXJuLnB1c2gocHJvcGVydHkgKyAnPScgKyBwYXJhbXNbcHJvcGVydHldKTtcbiAgICB9XG4gIH1cblxuICByZXR1cm4gdG9SZXR1cm4uam9pbignJicpO1xufTtcblxudmFyIGRldktleXMgPSBudWxsO1xudmFyIENhbGxlciA9IHtcbiAgLypcbiAgaWYgdGhlIHVzZXIgc2V0c1xuICAgKi9cbiAgc2V0RGV2S2V5czogZnVuY3Rpb24gc2V0RGV2S2V5cyhrZXlzKSB7XG4gICAgZGV2S2V5cyA9IGtleXM7XG4gIH0sXG5cbiAgLypcbiAgZXhwZWN0ZSBhdHRyaWJ1dGVzOlxuICAtIHR5cGUgKGVpdGhlciBHRVQsIFBPU1QsIERFTEVURSwgUFVUKVxuICAtIGVuZHBvaW50XG4gIC0gcGFyYW1zIChpZiBhbnkuIEEganNvbiB3aXRoIHBhcmFtZXRlcnMgdG8gYmUgcGFzc2VkIGJhY2sgdG8gdGhlIGVuZHBvaW50KVxuICAtIGNhbGxiYWNrczogYW4gb2JqZWN0IHdpdGg6XG4gIFx0LSBzdWNjZXNzOiB0aGUgc3VjY2VzcyBjYWxsYmFja1xuICBcdC0gZmFpbDogdGhlIGZhaWwgY2FsbGJhY2tcbiAgICovXG4gIG1ha2VDYWxsOiBmdW5jdGlvbiBtYWtlQ2FsbChhdHRycykge1xuICAgIHZhciBlbmRwb2ludFVybCA9IGF0dHJzLmVuZHBvaW50O1xuICAgIHZhciB4aHIgPSBuZXcgWE1MSHR0cFJlcXVlc3QoKTtcblxuICAgIGlmIChhdHRycy50eXBlID09PSAnR0VUJyAmJiBhdHRycy5wYXJhbXMpIHtcbiAgICAgIGVuZHBvaW50VXJsID0gZW5kcG9pbnRVcmwgKyBcIj9cIiArIHBhcmFtc1RvR2V0VmFycyhhdHRycy5wYXJhbXMpO1xuICAgIH1cblxuICAgIHhoci5vcGVuKGF0dHJzLnR5cGUsIGVuZHBvaW50VXJsKTtcblxuICAgIGlmIChkZXZLZXlzICE9IG51bGwpIHtcbiAgICAgIHhoci5zZXRSZXF1ZXN0SGVhZGVyKCd4LXBwLXNlY3JldCcsIGRldktleXMuc2VjcmV0KTtcbiAgICAgIHhoci5zZXRSZXF1ZXN0SGVhZGVyKCd4LXBwLWtleScsIGRldktleXMua2V5KTtcbiAgICB9XG5cbiAgICB4aHIud2l0aENyZWRlbnRpYWxzID0gdHJ1ZTtcbiAgICB4aHIuc2V0UmVxdWVzdEhlYWRlcignQ29udGVudC1UeXBlJywgJ2FwcGxpY2F0aW9uL2pzb24nKTtcblxuICAgIHhoci5vbmxvYWQgPSBmdW5jdGlvbiAoKSB7XG4gICAgICBpZiAoeGhyLnN0YXR1cyA+PSAyMDAgJiYgeGhyLnN0YXR1cyA8IDMwMCkge1xuICAgICAgICBhdHRycy5jYWxsYmFja3Muc3VjY2VzcyhKU09OLnBhcnNlKHhoci5yZXNwb25zZVRleHQpKTtcbiAgICAgIH0gZWxzZSBpZiAoeGhyLnN0YXR1cyAhPT0gMjAwKSB7XG4gICAgICAgIGF0dHJzLmNhbGxiYWNrcy5mYWlsKEpTT04ucGFyc2UoeGhyLnJlc3BvbnNlVGV4dCkpO1xuICAgICAgfVxuICAgIH07XG5cbiAgICBpZiAoIWF0dHJzLnBhcmFtcykge1xuICAgICAgYXR0cnMucGFyYW1zID0ge307XG4gICAgfVxuXG4gICAgeGhyLnNlbmQoSlNPTi5zdHJpbmdpZnkoYXR0cnMucGFyYW1zKSk7XG4gIH0sXG4gIHByb21pc2VDYWxsOiBmdW5jdGlvbiBwcm9taXNlQ2FsbChhdHRycykge1xuICAgIHJldHVybiBuZXcgUHJvbWlzZShmdW5jdGlvbiAocmVzb2x2ZSwgcmVqZWN0KSB7XG4gICAgICB2YXIgeGhyID0gbmV3IFhNTEh0dHBSZXF1ZXN0KCk7XG5cbiAgICAgIGlmIChhdHRycy50eXBlID09PSAnR0VUJyAmJiBhdHRycy5wYXJhbXMpIHtcbiAgICAgICAgZW5kcG9pbnRVcmwgPSBlbmRwb2ludFVybCArIFwiP1wiICsgcGFyYW1zVG9HZXRWYXJzKGF0dHJzLnBhcmFtcyk7XG4gICAgICB9XG5cbiAgICAgIHhoci5vcGVuKGF0dHJzLnR5cGUsIGF0dHJzLmVuZHBvaW50KTtcbiAgICAgIHhoci53aXRoQ3JlZGVudGlhbHMgPSB0cnVlO1xuXG4gICAgICBpZiAoZGV2S2V5cyAhPSBudWxsKSB7XG4gICAgICAgIHhoci5zZXRSZXF1ZXN0SGVhZGVyKCd4LXBwLXNlY3JldCcsIGRldktleXMuc2VjcmV0KTtcbiAgICAgICAgeGhyLnNldFJlcXVlc3RIZWFkZXIoJ3gtcHAta2V5JywgZGV2S2V5cy5rZXkpO1xuICAgICAgfVxuXG4gICAgICB4aHIuc2V0UmVxdWVzdEhlYWRlcignQ29udGVudC1UeXBlJywgJ2FwcGxpY2F0aW9uL2pzb24nKTtcblxuICAgICAgeGhyLm9ubG9hZCA9IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgaWYgKHRoaXMuc3RhdHVzID49IDIwMCAmJiB0aGlzLnN0YXR1cyA8IDMwMCkge1xuICAgICAgICAgIGF0dHJzLm1pZGRsZXdhcmVzLnN1Y2Nlc3MoSlNPTi5wYXJzZSh4aHIucmVzcG9uc2VUZXh0KSk7XG4gICAgICAgICAgcmVzb2x2ZShKU09OLnBhcnNlKHhoci5yZXNwb25zZVRleHQpKTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICB3aW5kb3cubG9jYXRpb24uaHJlZiA9IFN0b3JlLmdldExvZ2luVXJsKCk7XG4gICAgICAgIH1cbiAgICAgIH07XG5cbiAgICAgIHhoci5vbmVycm9yID0gZnVuY3Rpb24gKCkge1xuICAgICAgICB3aW5kb3cubG9jYXRpb24gPSBTdG9yZS5nZXRMb2dpblVybCgpO1xuICAgICAgfTtcblxuICAgICAgeGhyLnNlbmQoKTtcbiAgICB9KTtcbiAgfVxufTtcbm1vZHVsZS5leHBvcnRzID0gQ2FsbGVyOyIsIlwidXNlIHN0cmljdFwiO1xuXG52YXIgZGVib3VuY2VkVGltZW91dCA9IG51bGw7XG52YXIgY3VycmVudFF1ZXJ5ID0gJyc7XG52YXIgbGltaXQgPSA4O1xudmFyIGxhdGVuY3kgPSA1MDA7XG52YXIgaW5pdE9wdGlvbnM7XG52YXIgY3VycmVudFBhZ2UgPSAxO1xudmFyIG1ldGFEYXRhID0gbnVsbDtcbnZhciBpdGVtcyA9IFtdO1xudmFyIHBhZ2luYXRpb25EYXRhID0gbnVsbDtcblxudmFyIFBhZ2luYXRpb25IZWxwZXIgPSByZXF1aXJlKCcuL3BhZ2luYXRpb24taGVscGVyJyk7XG5cbnZhciBDYWxsZXIgPSByZXF1aXJlKCcuL2NhbGxlcicpO1xuXG52YXIgU3RvcmUgPSByZXF1aXJlKCcuL3N0b3JlJyk7XG5cbnZhciBEb20gPSByZXF1aXJlKCcuL2RvbScpO1xuXG52YXIgQ2xvdWRpbmFyeVBpY2tlciA9IHtcbiAgaW5pdGlhbGlzZTogZnVuY3Rpb24gaW5pdGlhbGlzZSgpIHtcbiAgICBkb2N1bWVudC5nZXRFbGVtZW50QnlJZCgnYmFjLS1jbG91ZGluYXJ5LS1jbG9zZWJ0bicpLm9uY2xpY2sgPSBmdW5jdGlvbiAoZSkge1xuICAgICAgQ2xvdWRpbmFyeVBpY2tlci5jbG9zZU1vZGFsKCk7XG4gICAgfTtcblxuICAgIGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKCdiYWMtLWNsb3VkaW5hcnktLXNlYXJjaC1pbnB1dCcpLm9ua2V5dXAgPSBmdW5jdGlvbiAoZSkge1xuICAgICAgQ2xvdWRpbmFyeVBpY2tlci5oYW5kbGVTZWFyY2goZSk7XG4gICAgfTtcblxuICAgIGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKCdiYWMtLWNsb3VkaW5hcnktLWdvLWJhY2snKS5vbmNsaWNrID0gZnVuY3Rpb24gKGUpIHtcbiAgICAgIENsb3VkaW5hcnlQaWNrZXIuZ29CYWNrKCk7XG4gICAgfTtcbiAgfSxcblxuICAvKlxuICBvcHRpb25zOiB7XG4gIFx0b25TZWxlY3Q6IGl0IGV4cGVjdHMgYSBmdW5jdGlvbi4gVGhpcyBmdW5jdGlvbiB3aWxsIGJlIGludm9rZWQgZXhhY3RseSBhdCB0aGUgbW9tZW50IHRoZSB1c2VyIHBpY2tzXG4gIFx0XHRhIGZpbGUgZnJvbSBjbG91ZGluYXJ5LiBUaGUgZnVuY3Rpb24gd2lsbCB0YWtlIGp1c3Qgb25lIHBhcmFtIHdoaWNoIGlzIHRoZSBzZWxlY3RlZCBpdGVtIG9iamVjdFxuICAgIGNsb3NlT25Fc2M6IHRydWUgLyBmYWxzZVxuICB9XG4gICAqL1xuICBvcGVuTW9kYWw6IGZ1bmN0aW9uIG9wZW5Nb2RhbChvcHRpb25zKSB7XG4gICAgQ2xvdWRpbmFyeVBpY2tlci5pbml0aWFsaXNlKCk7XG4gICAgaW5pdE9wdGlvbnMgPSBvcHRpb25zO1xuICAgIERvbS5hZGRDbGFzcyhkb2N1bWVudC5nZXRFbGVtZW50QnlJZCgnYmFjLS1jbG91ZGluYXJ5LS1tb2RhbCcpLCAnaXMtb3BlbicpO1xuICAgIENsb3VkaW5hcnlQaWNrZXIuZ2V0SW1hZ2VzKHtcbiAgICAgIHBhZ2U6IDEsXG4gICAgICBsaW1pdDogbGltaXRcbiAgICB9KTtcbiAgfSxcbiAgY2xvc2VNb2RhbDogZnVuY3Rpb24gY2xvc2VNb2RhbCgpIHtcbiAgICBEb20ucmVtb3ZlQ2xhc3MoZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoJ2JhYy0tY2xvdWRpbmFyeS0tbW9kYWwnKSwgJ2lzLW9wZW4nKTtcbiAgfSxcbiAgZ2V0SW1hZ2VzOiBmdW5jdGlvbiBnZXRJbWFnZXMob3B0aW9ucykge1xuICAgIC8vIFRPRE8gbWFrZSB0aGUgY2FsbCBhbmQgZ2V0IHRoZSBpbWFnZXNcbiAgICBDYWxsZXIubWFrZUNhbGwoe1xuICAgICAgdHlwZTogJ0dFVCcsXG4gICAgICBlbmRwb2ludDogU3RvcmUuZ2V0Q2xvdWRpbmFyeUVuZHBvaW50KCksXG4gICAgICBwYXJhbXM6IG9wdGlvbnMsXG4gICAgICBjYWxsYmFja3M6IHtcbiAgICAgICAgc3VjY2VzczogZnVuY3Rpb24gc3VjY2VzcyhyZXN1bHQpIHtcbiAgICAgICAgICBDbG91ZGluYXJ5UGlja2VyLm9uSW1hZ2VzUmVzcG9uc2UocmVzdWx0KTtcbiAgICAgICAgfSxcbiAgICAgICAgZmFpbDogZnVuY3Rpb24gZmFpbChlcnIpIHtcbiAgICAgICAgICBhbGVydChlcnIpO1xuICAgICAgICB9XG4gICAgICB9XG4gICAgfSk7XG4gIH0sXG4gIGhhbmRsZVNlYXJjaDogZnVuY3Rpb24gaGFuZGxlU2VhcmNoKGUpIHtcbiAgICBpZiAoZGVib3VuY2VkVGltZW91dCkge1xuICAgICAgY2xlYXJUaW1lb3V0KGRlYm91bmNlZFRpbWVvdXQpO1xuICAgIH1cblxuICAgIGlmIChlLnRhcmdldC52YWx1ZSA9PT0gY3VycmVudFF1ZXJ5KSB7XG4gICAgICByZXR1cm47XG4gICAgfVxuXG4gICAgdmFyIHF1ZXJ5ID0gZS50YXJnZXQudmFsdWU7XG4gICAgY3VycmVudFF1ZXJ5ID0gcXVlcnk7XG4gICAgdmFyIG9wdGlvbnMgPSB7XG4gICAgICBwYWdlOiAxLFxuICAgICAgbGltaXQ6IGxpbWl0LFxuICAgICAgcXVlcnk6IHF1ZXJ5XG4gICAgfTtcbiAgICBkZWJvdW5jZWRUaW1lb3V0ID0gc2V0VGltZW91dChmdW5jdGlvbiAoKSB7XG4gICAgICBDbG91ZGluYXJ5UGlja2VyLmdldEltYWdlcyhvcHRpb25zKTtcbiAgICB9LCBsYXRlbmN5KTtcbiAgfSxcbiAgaXRlbVNlbGVjdGVkOiBmdW5jdGlvbiBpdGVtU2VsZWN0ZWQoaXRlbSwgZSkge1xuICAgIGlmIChpdGVtLnR5cGUgPT0gJ2ZvbGRlcicpIHtcbiAgICAgIHZhciBwYXJhbXMgPSB7XG4gICAgICAgIHBhZ2U6IDEsXG4gICAgICAgIGxpbWl0OiBsaW1pdCxcbiAgICAgICAgcGFyZW50OiBpdGVtLmlkXG4gICAgICB9OyAvLyBUT0RPIHNldCBzZWFyY2ggaW5wdXQncyB2YWx1ZSA9ICcnXG5cbiAgICAgIGN1cnJlbnRRdWVyeSA9ICcnO1xuICAgICAgQ2xvdWRpbmFyeVBpY2tlci5nZXRJbWFnZXMocGFyYW1zKTtcbiAgICB9IGVsc2Uge1xuICAgICAgaW5pdE9wdGlvbnMub25TZWxlY3QoaXRlbSk7XG4gICAgICBDbG91ZGluYXJ5UGlja2VyLmNsb3NlTW9kYWwoKTtcbiAgICB9XG4gIH0sXG4gIG9uSW1hZ2VzUmVzcG9uc2U6IGZ1bmN0aW9uIG9uSW1hZ2VzUmVzcG9uc2UoZGF0YSkge1xuICAgIHBhZ2luYXRpb25EYXRhID0gUGFnaW5hdGlvbkhlbHBlci5nZXRQYWdlc1JhbmdlKGN1cnJlbnRQYWdlLCBNYXRoLmNlaWwoZGF0YS5tZXRhLnRvdGFsIC8gbGltaXQpKTtcbiAgICBtZXRhRGF0YSA9IGRhdGEubWV0YTtcbiAgICBpdGVtcyA9IGRhdGEuYXNzZXRzO1xuICAgIENsb3VkaW5hcnlQaWNrZXIucmVuZGVyKCk7XG4gIH0sXG4gIHJlbmRlclBhZ2luYXRpb25CdXR0b25zOiBmdW5jdGlvbiByZW5kZXJQYWdpbmF0aW9uQnV0dG9ucygpIHtcbiAgICB2YXIgdG9SZXR1cm4gPSBbXTtcblxuICAgIHZhciBjcmVhdGVQYWdpbmF0aW9uRWxlbWVudCA9IGZ1bmN0aW9uIGNyZWF0ZVBhZ2luYXRpb25FbGVtZW50KGFDbGFzc05hbWUsIGFGdW5jdGlvbiwgc3BhbkNsYXNzTmFtZSwgc3BhbkNvbnRlbnQpIHtcbiAgICAgIHZhciBsaSA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoJ2xpJyk7XG4gICAgICB2YXIgYSA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoJ2EnKTtcbiAgICAgIGxpLmNsYXNzTmFtZSA9IGFDbGFzc05hbWU7XG4gICAgICBhLm9uY2xpY2sgPSBhRnVuY3Rpb247XG4gICAgICB2YXIgc3BhbiA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoJ3NwYW4nKTtcbiAgICAgIHNwYW4uY2xhc3NOYW1lID0gc3BhbkNsYXNzTmFtZTtcblxuICAgICAgaWYgKHNwYW5Db250ZW50KSB7XG4gICAgICAgIHNwYW4uaW5uZXJIVE1MID0gc3BhbkNvbnRlbnQ7XG4gICAgICB9XG5cbiAgICAgIGEuYXBwZW5kQ2hpbGQoc3Bhbik7XG4gICAgICBsaS5hcHBlbmRDaGlsZChhKTtcbiAgICAgIHJldHVybiBsaTtcbiAgICB9O1xuXG4gICAgaWYgKHBhZ2luYXRpb25EYXRhLmhhc1ByZXZpb3VzKSB7XG4gICAgICB0b1JldHVybi5wdXNoKGNyZWF0ZVBhZ2luYXRpb25FbGVtZW50KCdkaXNhYmxlZCcsIGZ1bmN0aW9uIChlKSB7XG4gICAgICAgIGUucHJldmVudERlZmF1bHQoKTtcblxuICAgICAgICBDbG91ZGluYXJ5UGlja2VyLl9nb1RvUGFnZSgxKTtcbiAgICAgIH0sICdmYSBmYS1hbmdsZS1kb3VibGUtbGVmdCcpKTtcbiAgICAgIHRvUmV0dXJuLnB1c2goY3JlYXRlUGFnaW5hdGlvbkVsZW1lbnQoJ2Rpc2FibGVkJywgZnVuY3Rpb24gKGUpIHtcbiAgICAgICAgZS5wcmV2ZW50RGVmYXVsdCgpO1xuXG4gICAgICAgIENsb3VkaW5hcnlQaWNrZXIuX2dvVG9QYWdlKGN1cnJlbnRQYWdlIC0gMSk7XG4gICAgICB9LCAnZmEgZmEtYW5nbGUtbGVmdCcpKTtcbiAgICB9XG5cbiAgICBmb3IgKHZhciBpID0gMDsgaSA8IHBhZ2luYXRpb25EYXRhLmJ1dHRvbnMubGVuZ3RoOyBpKyspIHtcbiAgICAgIChmdW5jdGlvbiAoaSkge1xuICAgICAgICB2YXIgYnRuID0gcGFnaW5hdGlvbkRhdGEuYnV0dG9uc1tpXTtcbiAgICAgICAgdG9SZXR1cm4ucHVzaChjcmVhdGVQYWdpbmF0aW9uRWxlbWVudChidG4ucnVubmluZ3BhZ2UgPyBcImFjdGl2ZVwiIDogXCItXCIsIGZ1bmN0aW9uIChlKSB7XG4gICAgICAgICAgZS5wcmV2ZW50RGVmYXVsdCgpO1xuXG4gICAgICAgICAgQ2xvdWRpbmFyeVBpY2tlci5fZ29Ub1BhZ2UoYnRuLnBhZ2Vubyk7XG4gICAgICAgIH0sICdudW1iZXInLCBidG4ucGFnZW5vKSk7XG4gICAgICB9KShpKTtcbiAgICB9XG5cbiAgICBpZiAocGFnaW5hdGlvbkRhdGEuaGFzTmV4dCkge1xuICAgICAgdG9SZXR1cm4ucHVzaChjcmVhdGVQYWdpbmF0aW9uRWxlbWVudCgnZGlzYWJsZWQnLCBmdW5jdGlvbiAoZSkge1xuICAgICAgICBlLnByZXZlbnREZWZhdWx0KCk7XG5cbiAgICAgICAgQ2xvdWRpbmFyeVBpY2tlci5fZ29Ub1BhZ2UoY3VycmVudFBhZ2UgKyAxKTtcbiAgICAgIH0sICdmYSBmYS1hbmdsZS1yaWdodCcpKTtcbiAgICAgIHRvUmV0dXJuLnB1c2goY3JlYXRlUGFnaW5hdGlvbkVsZW1lbnQoJ2Rpc2FibGVkJywgZnVuY3Rpb24gKGUpIHtcbiAgICAgICAgZS5wcmV2ZW50RGVmYXVsdCgpO1xuXG4gICAgICAgIENsb3VkaW5hcnlQaWNrZXIuX2dvVG9QYWdlKE1hdGguY2VpbChtZXRhRGF0YS50b3RhbCAvIGxpbWl0KSk7XG4gICAgICB9LCAnZmEgZmEtYW5nbGUtZG91YmxlLXJpZ2h0JykpO1xuICAgIH1cblxuICAgIGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKCdiYWMtLWNsb3VkaW5hcnktYWN0dWFsLXBhZ2luYXRpb24tY29udGFpbmVyJykuaW5uZXJIVE1MID0gJyc7XG5cbiAgICBmb3IgKHZhciBfaSA9IDA7IF9pIDwgdG9SZXR1cm4ubGVuZ3RoOyBfaSsrKSB7XG4gICAgICBkb2N1bWVudC5nZXRFbGVtZW50QnlJZCgnYmFjLS1jbG91ZGluYXJ5LWFjdHVhbC1wYWdpbmF0aW9uLWNvbnRhaW5lcicpLmFwcGVuZENoaWxkKHRvUmV0dXJuW19pXSk7XG4gICAgfVxuICB9LFxuICBfZ29Ub1BhZ2U6IGZ1bmN0aW9uIF9nb1RvUGFnZShwYWdlKSB7XG4gICAgaWYgKHBhZ2UgPT09IGN1cnJlbnRQYWdlKSB7XG4gICAgICByZXR1cm47XG4gICAgfVxuXG4gICAgdmFyIHBhcmFtcyA9IHtcbiAgICAgIHBhZ2U6IHBhZ2UsXG4gICAgICBsaW1pdDogbGltaXRcbiAgICB9O1xuXG4gICAgaWYgKG1ldGFEYXRhLmFzc2V0KSB7XG4gICAgICBwYXJhbXMucGFyZW50ID0gbWV0YURhdGEuYXNzZXQ7XG4gICAgfVxuXG4gICAgaWYgKGN1cnJlbnRRdWVyeSkge1xuICAgICAgcGFyYW1zLnF1ZXJ5ID0gY3VycmVudFF1ZXJ5O1xuICAgIH1cblxuICAgIGN1cnJlbnRQYWdlID0gcGFnZTtcbiAgICBDbG91ZGluYXJ5UGlja2VyLmdldEltYWdlcyhwYXJhbXMpO1xuICB9LFxuICBnb0JhY2s6IGZ1bmN0aW9uIGdvQmFjaygpIHtcbiAgICB2YXIgcGFyYW1zID0ge1xuICAgICAgcGFnZTogMSxcbiAgICAgIGxpbWl0OiBsaW1pdFxuICAgIH07XG5cbiAgICBpZiAobWV0YURhdGEucGFyZW50KSB7XG4gICAgICBwYXJhbXMucGFyZW50ID0gbWV0YURhdGEucGFyZW50O1xuICAgIH1cblxuICAgIGlmIChjdXJyZW50UXVlcnkpIHtcbiAgICAgIHBhcmFtcy5xdWVyeSA9IGN1cnJlbnRRdWVyeTtcbiAgICB9XG5cbiAgICBDbG91ZGluYXJ5UGlja2VyLmdldEltYWdlcyhwYXJhbXMpO1xuICB9LFxuICByZW5kZXJJdGVtczogZnVuY3Rpb24gcmVuZGVySXRlbXMoKSB7XG4gICAgdmFyIG9uZUl0ZW0gPSBmdW5jdGlvbiBvbmVJdGVtKGl0ZW0pIHtcbiAgICAgIHZhciBpdGVtSWNvbiA9IGZ1bmN0aW9uIGl0ZW1JY29uKCkge1xuICAgICAgICBpZiAoaXRlbS50eXBlICE9ICdmb2xkZXInKSB7XG4gICAgICAgICAgcmV0dXJuIFwiPGltZyBzcmM9XCIuY29uY2F0KGl0ZW0udGh1bWIsIFwiIGFsdD1cXFwiXFxcIi8+XCIpO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgIHJldHVybiBcIjxpIGNsYXNzPVxcXCJmYSBmYS1mb2xkZXItb1xcXCI+PC9pPlwiO1xuICAgICAgICB9XG4gICAgICB9O1xuXG4gICAgICB2YXIgZnVuY3QgPSBmdW5jdGlvbiBmdW5jdCgpIHtcbiAgICAgICAgQ2xvdWRpbmFyeVBpY2tlci5pdGVtU2VsZWN0ZWQoaXRlbSk7XG4gICAgICB9O1xuXG4gICAgICB2YXIgbmV3RG9tRWwgPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KCdkaXYnKTtcbiAgICAgIG5ld0RvbUVsLmNsYXNzTmFtZSA9IFwiY2xvdWQtaW1hZ2VzX19pdGVtXCI7XG4gICAgICBuZXdEb21FbC5vbmNsaWNrID0gZnVuY3Q7XG4gICAgICBuZXdEb21FbC5pbm5lckhUTUwgPSBcIlxcblxcdFxcdFxcdFxcdFxcdFxcdCAgPGRpdiBjbGFzcz1cXFwiY2xvdWQtaW1hZ2VzX19pdGVtX190eXBlXFxcIj5cXG5cXHRcXHRcXHRcXHRcXHRcXHRcXHRcXHRcIi5jb25jYXQoaXRlbUljb24oKSwgXCJcXG5cXHRcXHRcXHRcXHRcXHRcXHQgIDwvZGl2PlxcblxcdFxcdFxcdFxcdFxcdFxcdCAgPGRpdiBjbGFzcz1cXFwiY2xvdWQtaW1hZ2VzX19pdGVtX19kZXRhaWxzXFxcIj5cXG5cXHRcXHRcXHRcXHRcXHRcXHRcXHRcXHQ8c3BhbiBjbGFzcz1cXFwiY2xvdWQtaW1hZ2VzX19pdGVtX19kZXRhaWxzX19uYW1lXFxcIj5cIikuY29uY2F0KGl0ZW0ubmFtZSwgXCI8L3NwYW4+XFxuXFx0XFx0XFx0XFx0XFx0XFx0XFx0XFx0PHNwYW4gY2xhc3M9XFxcImNsb3VkLWltYWdlc19faXRlbV9fZGV0YWlsc19fZGF0ZVxcXCI+XCIpLmNvbmNhdChpdGVtLmNyZGF0ZSwgXCI8L3NwYW4+XFxuXFx0XFx0XFx0XFx0XFx0XFx0ICA8L2Rpdj5cXG5cXHRcXHRcXHRcXHRcXHRcXHQgIDxkaXYgY2xhc3M9XFxcImNsb3VkLWltYWdlc19faXRlbV9fYWN0aW9uc1xcXCI+XFxuXFx0XFx0XFx0XFx0XFx0XFx0XFx0XFx0PGEgY2xhc3M9XFxcImZhIGZhLXBlbmNpbFxcXCI+PC9hPlxcblxcdFxcdFxcdFxcdFxcdFxcdCAgPC9kaXY+XCIpO1xuICAgICAgcmV0dXJuIG5ld0RvbUVsO1xuICAgIH07XG5cbiAgICBkb2N1bWVudC5nZXRFbGVtZW50QnlJZCgnYmFjLS1jbG91ZGluYXJ5LWl0YW1zLWNvbnRhaW5lcicpLmlubmVySFRNTCA9ICcnO1xuXG4gICAgZm9yICh2YXIgaSA9IDA7IGkgPCBpdGVtcy5sZW5ndGg7IGkrKykge1xuICAgICAgZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoJ2JhYy0tY2xvdWRpbmFyeS1pdGFtcy1jb250YWluZXInKS5hcHBlbmRDaGlsZChvbmVJdGVtKGl0ZW1zW2ldKSk7XG4gICAgfVxuICB9LFxuICByZW5kZXI6IGZ1bmN0aW9uIHJlbmRlcigpIHtcbiAgICBpZiAobWV0YURhdGEuYXNzZXQpIHtcbiAgICAgIERvbS5yZW1vdmVDbGFzcyhkb2N1bWVudC5nZXRFbGVtZW50QnlJZCgnYmFjLS1jbG91ZGluYXJ5LS1iYWNrLWJ1dHRvbi1jb250YWluZXInKSwgJ2hkbicpO1xuICAgIH0gZWxzZSB7XG4gICAgICBEb20uYWRkQ2xhc3MoZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoJ2JhYy0tY2xvdWRpbmFyeS0tYmFjay1idXR0b24tY29udGFpbmVyJyksICdoZG4nKTtcbiAgICB9XG5cbiAgICBDbG91ZGluYXJ5UGlja2VyLnJlbmRlckl0ZW1zKCk7XG5cbiAgICBpZiAobWV0YURhdGEudG90YWwgPiBsaW1pdCkge1xuICAgICAgRG9tLnJlbW92ZUNsYXNzKGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKCdiYWMtLWNsb3VkaW5hcnktcGFnaW5hdGlvbi1jb250YWluZXInKSwgJ2hkbicpO1xuICAgICAgQ2xvdWRpbmFyeVBpY2tlci5yZW5kZXJQYWdpbmF0aW9uQnV0dG9ucygpO1xuICAgIH0gZWxzZSB7XG4gICAgICBEb20uYWRkQ2xhc3MoZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoJ2JhYy0tY2xvdWRpbmFyeS1wYWdpbmF0aW9uLWNvbnRhaW5lcicpLCAnaGRuJyk7XG4gICAgfVxuICB9XG59O1xubW9kdWxlLmV4cG9ydHMgPSBDbG91ZGluYXJ5UGlja2VyOyIsIlwidXNlIHN0cmljdFwiO1xuXG52YXIgRG9tID0ge1xuICBoYXNDbGFzczogZnVuY3Rpb24gaGFzQ2xhc3MoZWwsIGNsYXNzTmFtZSkge1xuICAgIGlmIChlbC5jbGFzc0xpc3QpIHJldHVybiBlbC5jbGFzc0xpc3QuY29udGFpbnMoY2xhc3NOYW1lKTtlbHNlIHJldHVybiBuZXcgUmVnRXhwKCcoXnwgKScgKyBjbGFzc05hbWUgKyAnKCB8JCknLCAnZ2knKS50ZXN0KGVsLmNsYXNzTmFtZSk7XG4gIH0sXG4gIHJlbW92ZUNsYXNzOiBmdW5jdGlvbiByZW1vdmVDbGFzcyhlbCwgY2xhc3NOYW1lKSB7XG4gICAgaWYgKGVsLmNsYXNzTGlzdCkgZWwuY2xhc3NMaXN0LnJlbW92ZShjbGFzc05hbWUpO2Vsc2UgZWwuY2xhc3NOYW1lID0gZWwuY2xhc3NOYW1lLnJlcGxhY2UobmV3IFJlZ0V4cCgnKF58XFxcXGIpJyArIGNsYXNzTmFtZS5zcGxpdCgnICcpLmpvaW4oJ3wnKSArICcoXFxcXGJ8JCknLCAnZ2knKSwgJyAnKTtcbiAgfSxcbiAgYWRkQ2xhc3M6IGZ1bmN0aW9uIGFkZENsYXNzKGVsLCBjbGFzc05hbWUpIHtcbiAgICBpZiAoZWwuY2xhc3NMaXN0KSBlbC5jbGFzc0xpc3QuYWRkKGNsYXNzTmFtZSk7ZWxzZSBlbC5jbGFzc05hbWUgKz0gJyAnICsgY2xhc3NOYW1lO1xuICB9LFxuICB0b2dnbGVDbGFzczogZnVuY3Rpb24gdG9nZ2xlQ2xhc3MoZWwsIGNsYXNzTmFtZSkge1xuICAgIGlmICh0aGlzLmhhc0NsYXNzKGVsLCBjbGFzc05hbWUpKSB7XG4gICAgICB0aGlzLnJlbW92ZUNsYXNzKGVsLCBjbGFzc05hbWUpO1xuICAgIH0gZWxzZSB7XG4gICAgICB0aGlzLmFkZENsYXNzKGVsLCBjbGFzc05hbWUpO1xuICAgIH1cbiAgfVxufTtcbm1vZHVsZS5leHBvcnRzID0gRG9tOyIsIlwidXNlIHN0cmljdFwiO1xuXG52YXIgZG9tID0gcmVxdWlyZSgnLi9kb20nKTtcblxudmFyIGRlZmF1bHRIaWRlSW4gPSA1MDAwO1xudmFyIGxhc3RJbmRleCA9IDE7XG52YXIgbnVtT2ZJbmZvQmxvY2tzID0gMTA7XG52YXIgaW5mb0Jsb2NrcyA9IFtdO1xudmFyIEluZm9Db250cm9sbGVyID0ge1xuICByZW5kZXJJbmZvQmxvY2tzOiBmdW5jdGlvbiByZW5kZXJJbmZvQmxvY2tzKCkge1xuICAgIHZhciBibG9ja3NUZW1wbGF0ZSA9IGZ1bmN0aW9uIGJsb2Nrc1RlbXBsYXRlKGluZGV4KSB7XG4gICAgICByZXR1cm4gXCJcXG5cXHRcXHRcXHRcXHQgPGRpdiBjbGFzcz1cXFwiYmFjLS1wdXJlc2RrLWluZm8tYm94LS1cXFwiIGlkPVxcXCJiYWMtLXB1cmVzZGstaW5mby1ib3gtLVwiLmNvbmNhdChpbmRleCwgXCJcXFwiPlxcblxcdFxcdFxcdFxcdCBcXHQ8ZGl2IGNsYXNzPVxcXCJiYWMtLXRpbWVyXFxcIiBpZD1cXFwiYmFjLS10aW1lclwiKS5jb25jYXQoaW5kZXgsIFwiXFxcIj48L2Rpdj5cXG5cXHRcXHRcXHRcXHRcXHQgPGRpdiBjbGFzcz1cXFwiYmFjLS1pbm5lci1pbmZvLWJveC0tXFxcIj5cXG5cXHRcXHRcXHRcXHRcXHQgXFx0XFx0PGRpdiBjbGFzcz1cXFwiYmFjLS1pbmZvLWljb24tLSBmYS1zdWNjZXNzXFxcIj48L2Rpdj5cXG5cXHRcXHRcXHRcXHRcXHQgXFx0XFx0PGRpdiBjbGFzcz1cXFwiYmFjLS1pbmZvLWljb24tLSBmYS13YXJuaW5nXFxcIj48L2Rpdj5cXG5cXHRcXHRcXHRcXHRcXHQgXFx0XFx0PGRpdiBjbGFzcz1cXFwiYmFjLS1pbmZvLWljb24tLSBmYS1pbmZvLTFcXFwiPjwvZGl2PlxcblxcdFxcdFxcdFxcdFxcdCBcXHRcXHQ8ZGl2IGNsYXNzPVxcXCJiYWMtLWluZm8taWNvbi0tIGZhLWVycm9yXFxcIj48L2Rpdj5cXG5cXHRcXHRcXHRcXHRcXHQgXFx0XFx0IDxkaXYgY2xhc3M9XFxcImJhYy0taW5mby1tYWluLXRleHQtLVxcXCIgaWQ9XFxcImJhYy0taW5mby1tYWluLXRleHQtLVwiKS5jb25jYXQoaW5kZXgsIFwiXFxcIj48L2Rpdj5cXG5cXHRcXHRcXHRcXHRcXHQgXFx0XFx0IDxkaXYgY2xhc3M9XFxcImJhYy0taW5mby1jbG9zZS1idXR0b24tLSBmYS1jbG9zZS0xXFxcIiBpZD1cXFwiYmFjLS1pbmZvLWNsb3NlLWJ1dHRvbi0tXCIpLmNvbmNhdChpbmRleCwgXCJcXFwiPjwvZGl2PlxcblxcdFxcdFxcdFxcdFxcdDwvZGl2PlxcblxcdFxcdFxcdFxcdDwvZGl2PlxcblxcdFxcdCAgXCIpO1xuICAgIH07XG5cbiAgICB2YXIgaW5mb0Jsb2Nrc1dyYXBwZXIgPSBkb2N1bWVudC5nZXRFbGVtZW50QnlJZCgnYmFjLS1pbmZvLWJsb2Nrcy13cmFwcGVyLS0nKTtcbiAgICB2YXIgaW5uZXJIdG1sID0gJyc7XG5cbiAgICBmb3IgKHZhciBpID0gMTsgaSA8IG51bU9mSW5mb0Jsb2NrczsgaSsrKSB7XG4gICAgICBpbm5lckh0bWwgKz0gYmxvY2tzVGVtcGxhdGUoaSk7XG4gICAgfVxuXG4gICAgaW5mb0Jsb2Nrc1dyYXBwZXIuaW5uZXJIVE1MID0gaW5uZXJIdG1sO1xuICB9LFxuICBpbml0OiBmdW5jdGlvbiBpbml0KCkge1xuICAgIGZvciAodmFyIGkgPSAxOyBpIDwgbnVtT2ZJbmZvQmxvY2tzOyBpKyspIHtcbiAgICAgIChmdW5jdGlvbiB4KGkpIHtcbiAgICAgICAgdmFyIGNsb3NlRnVuY3Rpb24gPSBmdW5jdGlvbiBjbG9zZUZ1bmN0aW9uKCkge1xuICAgICAgICAgIGRvbS5yZW1vdmVDbGFzcyhkb2N1bWVudC5nZXRFbGVtZW50QnlJZCgnYmFjLS1wdXJlc2RrLWluZm8tYm94LS0nICsgaSksICdiYWMtLWFjdGl2ZS0tJyk7XG4gICAgICAgICAgZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoJ2JhYy0tdGltZXInICsgaSkuc3R5bGUudHJhbnNpdGlvbiA9ICcnO1xuICAgICAgICAgIGRvbS5yZW1vdmVDbGFzcyhkb2N1bWVudC5nZXRFbGVtZW50QnlJZCgnYmFjLS10aW1lcicgKyBpKSwgJ2JhYy0tZnVsbHdpZHRoJyk7XG4gICAgICAgICAgaW5mb0Jsb2Nrc1tpIC0gMV0uaW5Vc2UgPSBmYWxzZTtcbiAgICAgICAgICBzZXRUaW1lb3V0KGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgIGlmIChpbmZvQmxvY2tzW2kgLSAxXS5jbG9zZVRpbWVvdXQpIHtcbiAgICAgICAgICAgICAgY2xlYXJUaW1lb3V0KGluZm9CbG9ja3NbaSAtIDFdLmNsb3NlVGltZW91dCk7XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIGRvbS5yZW1vdmVDbGFzcyhkb2N1bWVudC5nZXRFbGVtZW50QnlJZCgnYmFjLS1wdXJlc2RrLWluZm8tYm94LS0nICsgaSksICdiYWMtLXN1Y2Nlc3MnKTtcbiAgICAgICAgICAgIGRvbS5yZW1vdmVDbGFzcyhkb2N1bWVudC5nZXRFbGVtZW50QnlJZCgnYmFjLS1wdXJlc2RrLWluZm8tYm94LS0nICsgaSksICdiYWMtLWluZm8nKTtcbiAgICAgICAgICAgIGRvbS5yZW1vdmVDbGFzcyhkb2N1bWVudC5nZXRFbGVtZW50QnlJZCgnYmFjLS1wdXJlc2RrLWluZm8tYm94LS0nICsgaSksICdiYWMtLXdhcm5pbmcnKTtcbiAgICAgICAgICAgIGRvbS5yZW1vdmVDbGFzcyhkb2N1bWVudC5nZXRFbGVtZW50QnlJZCgnYmFjLS1wdXJlc2RrLWluZm8tYm94LS0nICsgaSksICdiYWMtLWVycm9yJyk7XG4gICAgICAgICAgfSwgNDUwKTtcbiAgICAgICAgfTtcblxuICAgICAgICB2YXIgYWRkVGV4dCA9IGZ1bmN0aW9uIGFkZFRleHQodGV4dCkge1xuICAgICAgICAgIGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKCdiYWMtLWluZm8tbWFpbi10ZXh0LS0nICsgaSkuaW5uZXJIVE1MID0gdGV4dDtcbiAgICAgICAgfTtcblxuICAgICAgICB2YXIgYWRkVGltZW91dCA9IGZ1bmN0aW9uIGFkZFRpbWVvdXQodGltZW91dE1zZWNzKSB7XG4gICAgICAgICAgZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoJ2JhYy0tdGltZXInICsgaSkuc3R5bGUudHJhbnNpdGlvbiA9ICd3aWR0aCAnICsgdGltZW91dE1zZWNzICsgJ21zJztcbiAgICAgICAgICBkb20uYWRkQ2xhc3MoZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoJ2JhYy0tdGltZXInICsgaSksICdiYWMtLWZ1bGx3aWR0aCcpO1xuICAgICAgICAgIGluZm9CbG9ja3NbaSAtIDFdLmNsb3NlVGltZW91dCA9IHNldFRpbWVvdXQoZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgaW5mb0Jsb2Nrc1tpIC0gMV0uY2xvc2VGdW5jdGlvbigpO1xuICAgICAgICAgIH0sIHRpbWVvdXRNc2Vjcyk7XG4gICAgICAgIH07XG5cbiAgICAgICAgaW5mb0Jsb2Nrcy5wdXNoKHtcbiAgICAgICAgICBpZDogaSxcbiAgICAgICAgICBpblVzZTogZmFsc2UsXG4gICAgICAgICAgZWxlbWVudDogZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoJ2JhYy0tcHVyZXNkay1pbmZvLWJveC0tJyArIGkpLFxuICAgICAgICAgIGNsb3NlRnVuY3Rpb246IGNsb3NlRnVuY3Rpb24sXG4gICAgICAgICAgYWRkVGV4dDogYWRkVGV4dCxcbiAgICAgICAgICBhZGRUaW1lb3V0OiBhZGRUaW1lb3V0LFxuICAgICAgICAgIGNsb3NlVGltZW91dDogZmFsc2VcbiAgICAgICAgfSk7XG5cbiAgICAgICAgZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoJ2JhYy0taW5mby1jbG9zZS1idXR0b24tLScgKyBpKS5vbmNsaWNrID0gZnVuY3Rpb24gKGUpIHtcbiAgICAgICAgICBjbG9zZUZ1bmN0aW9uKGkpO1xuICAgICAgICB9O1xuICAgICAgfSkoaSk7XG4gICAgfVxuICB9LFxuXG4gIC8qXG4gICB0eXBlOiBvbmUgb2Y6XG4gIFx0LSBzdWNjZXNzXG4gIFx0LSBpbmZvXG4gIFx0LSB3YXJuaW5nXG4gIFx0LSBlcnJvclxuICAgdGV4dDogdGhlIHRleHQgdG8gZGlzcGxheVxuICAgb3B0aW9ucyAob3B0aW9uYWwpOiB7XG4gICBcdFx0aGlkZUluOiBtaWxsaXNlY29uZHMgdG8gaGlkZSBpdC4gLTEgZm9yIG5vdCBoaWRpbmcgaXQgYXQgYWxsLiBEZWZhdWx0IGlzIDUwMDBcbiAgIH1cbiAgICovXG4gIHNob3dJbmZvOiBmdW5jdGlvbiBzaG93SW5mbyh0eXBlLCB0ZXh0LCBvcHRpb25zKSB7XG4gICAgZm9yICh2YXIgaSA9IDA7IGkgPCBudW1PZkluZm9CbG9ja3M7IGkrKykge1xuICAgICAgdmFyIGluZm9CbG9jayA9IGluZm9CbG9ja3NbaV07XG5cbiAgICAgIGlmICghaW5mb0Jsb2NrLmluVXNlKSB7XG4gICAgICAgIGluZm9CbG9jay5pblVzZSA9IHRydWU7XG4gICAgICAgIGluZm9CbG9jay5lbGVtZW50LnN0eWxlLnpJbmRleCA9IGxhc3RJbmRleDtcbiAgICAgICAgaW5mb0Jsb2NrLmFkZFRleHQodGV4dCk7XG4gICAgICAgIGxhc3RJbmRleCArPSAxO1xuICAgICAgICB2YXIgdGltZW91dG1TZWNzID0gZGVmYXVsdEhpZGVJbjtcbiAgICAgICAgdmFyIGF1dG9DbG9zZSA9IHRydWU7XG5cbiAgICAgICAgaWYgKG9wdGlvbnMpIHtcbiAgICAgICAgICBpZiAob3B0aW9ucy5oaWRlSW4gIT0gbnVsbCAmJiBvcHRpb25zLmhpZGVJbiAhPSB1bmRlZmluZWQgJiYgb3B0aW9ucy5oaWRlSW4gIT0gLTEpIHtcbiAgICAgICAgICAgIHRpbWVvdXRtU2VjcyA9IG9wdGlvbnMuaGlkZUluO1xuICAgICAgICAgIH0gZWxzZSBpZiAob3B0aW9ucy5oaWRlSW4gPT09IC0xKSB7XG4gICAgICAgICAgICBhdXRvQ2xvc2UgPSBmYWxzZTtcbiAgICAgICAgICB9XG4gICAgICAgIH1cblxuICAgICAgICBpZiAoYXV0b0Nsb3NlKSB7XG4gICAgICAgICAgaW5mb0Jsb2NrLmFkZFRpbWVvdXQodGltZW91dG1TZWNzKTtcbiAgICAgICAgfVxuXG4gICAgICAgIGRvbS5hZGRDbGFzcyhpbmZvQmxvY2suZWxlbWVudCwgJ2JhYy0tJyArIHR5cGUpO1xuICAgICAgICBkb20uYWRkQ2xhc3MoaW5mb0Jsb2NrLmVsZW1lbnQsICdiYWMtLWFjdGl2ZS0tJyk7XG4gICAgICAgIHJldHVybjtcbiAgICAgIH1cbiAgICB9XG4gIH1cbn07XG5tb2R1bGUuZXhwb3J0cyA9IEluZm9Db250cm9sbGVyOyIsIlwidXNlIHN0cmljdFwiO1xuXG52YXIgU3RvcmUgPSByZXF1aXJlKCcuL3N0b3JlLmpzJyk7XG5cbnZhciBMb2dnZXIgPSB7XG4gIGxvZzogZnVuY3Rpb24gbG9nKHdoYXQpIHtcbiAgICBpZiAoIVN0b3JlLmxvZ3NFbmFibGVkKCkpIHtcbiAgICAgIHJldHVybiBmYWxzZTtcbiAgICB9IGVsc2Uge1xuICAgICAgTG9nZ2VyLmxvZyA9IGNvbnNvbGUubG9nLmJpbmQoY29uc29sZSk7XG4gICAgICBMb2dnZXIubG9nKHdoYXQpO1xuICAgIH1cbiAgfSxcbiAgZXJyb3I6IGZ1bmN0aW9uIGVycm9yKGVycikge1xuICAgIGlmICghU3RvcmUubG9nc0VuYWJsZWQoKSkge1xuICAgICAgcmV0dXJuIGZhbHNlO1xuICAgIH0gZWxzZSB7XG4gICAgICBMb2dnZXIuZXJyb3IgPSBjb25zb2xlLmVycm9yLmJpbmQoY29uc29sZSk7XG4gICAgICBMb2dnZXIuZXJyb3IoZXJyKTtcbiAgICB9XG4gIH1cbn07XG5tb2R1bGUuZXhwb3J0cyA9IExvZ2dlcjsiLCJcInVzZSBzdHJpY3RcIjtcblxudmFyIHNldHRpbmdzID0ge1xuICB0b3RhbFBhZ2VCdXR0b25zTnVtYmVyOiA4XG59O1xudmFyIFBhZ2luYXRvciA9IHtcbiAgc2V0U2V0dGluZ3M6IGZ1bmN0aW9uIHNldFNldHRpbmdzKHNldHRpbmcpIHtcbiAgICBmb3IgKHZhciBrZXkgaW4gc2V0dGluZykge1xuICAgICAgc2V0dGluZ3Nba2V5XSA9IHNldHRpbmdba2V5XTtcbiAgICB9XG4gIH0sXG4gIGdldFBhZ2VzUmFuZ2U6IGZ1bmN0aW9uIGdldFBhZ2VzUmFuZ2UoY3VycGFnZSwgdG90YWxQYWdlc09uUmVzdWx0U2V0KSB7XG4gICAgdmFyIHBhZ2VSYW5nZSA9IFt7XG4gICAgICBwYWdlbm86IGN1cnBhZ2UsXG4gICAgICBydW5uaW5ncGFnZTogdHJ1ZVxuICAgIH1dO1xuICAgIHZhciBoYXNuZXh0b25yaWdodCA9IHRydWU7XG4gICAgdmFyIGhhc25leHRvbmxlZnQgPSB0cnVlO1xuICAgIHZhciBpID0gMTtcblxuICAgIHdoaWxlIChwYWdlUmFuZ2UubGVuZ3RoIDwgc2V0dGluZ3MudG90YWxQYWdlQnV0dG9uc051bWJlciAmJiAoaGFzbmV4dG9ucmlnaHQgfHwgaGFzbmV4dG9ubGVmdCkpIHtcbiAgICAgIGlmIChoYXNuZXh0b25sZWZ0KSB7XG4gICAgICAgIGlmIChjdXJwYWdlIC0gaSA+IDApIHtcbiAgICAgICAgICBwYWdlUmFuZ2UucHVzaCh7XG4gICAgICAgICAgICBwYWdlbm86IGN1cnBhZ2UgLSBpLFxuICAgICAgICAgICAgcnVubmluZ3BhZ2U6IGZhbHNlXG4gICAgICAgICAgfSk7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgaGFzbmV4dG9ubGVmdCA9IGZhbHNlO1xuICAgICAgICB9XG4gICAgICB9XG5cbiAgICAgIGlmIChoYXNuZXh0b25yaWdodCkge1xuICAgICAgICBpZiAoY3VycGFnZSArIGkgLSAxIDwgdG90YWxQYWdlc09uUmVzdWx0U2V0KSB7XG4gICAgICAgICAgcGFnZVJhbmdlLnB1c2goe1xuICAgICAgICAgICAgcGFnZW5vOiBjdXJwYWdlICsgaSxcbiAgICAgICAgICAgIHJ1bm5pbmdwYWdlOiBmYWxzZVxuICAgICAgICAgIH0pO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgIGhhc25leHRvbnJpZ2h0ID0gZmFsc2U7XG4gICAgICAgIH1cbiAgICAgIH1cblxuICAgICAgaSsrO1xuICAgIH1cblxuICAgIHZhciBoYXNOZXh0ID0gY3VycGFnZSA8IHRvdGFsUGFnZXNPblJlc3VsdFNldDtcbiAgICB2YXIgaGFzUHJldmlvdXMgPSBjdXJwYWdlID4gMTtcbiAgICByZXR1cm4ge1xuICAgICAgYnV0dG9uczogcGFnZVJhbmdlLnNvcnQoZnVuY3Rpb24gKGl0ZW1BLCBpdGVtQikge1xuICAgICAgICByZXR1cm4gaXRlbUEucGFnZW5vIC0gaXRlbUIucGFnZW5vO1xuICAgICAgfSksXG4gICAgICBoYXNOZXh0OiBoYXNOZXh0LFxuICAgICAgaGFzUHJldmlvdXM6IGhhc1ByZXZpb3VzXG4gICAgfTtcbiAgfVxufTtcbm1vZHVsZS5leHBvcnRzID0gUGFnaW5hdG9yOyIsIid1c2Ugc3RyaWN0JztcblxudmFyIFN0b3JlID0gcmVxdWlyZSgnLi9zdG9yZS5qcycpO1xuXG52YXIgTG9nZ2VyID0gcmVxdWlyZSgnLi9sb2dnZXIuanMnKTtcblxudmFyIGF2YWlsYWJsZUxpc3RlbmVycyA9IHtcbiAgc2VhcmNoS2V5VXA6IHtcbiAgICBpbmZvOiAnTGlzdGVuZXIgb24ga2V5VXAgb2Ygc2VhcmNoIGlucHV0IG9uIHRvcCBiYXInXG4gIH0sXG4gIHNlYXJjaEVudGVyOiB7XG4gICAgaW5mbzogJ0xpc3RlbmVyIG9uIGVudGVyIGtleSBwcmVzc2VkIG9uIHNlYXJjaCBpbnB1dCBvbiB0b3AgYmFyJ1xuICB9LFxuICBzZWFyY2hPbkNoYW5nZToge1xuICAgIGluZm86ICdMaXN0ZW5lciBvbiBjaGFuZ2Ugb2YgaW5wdXQgdmFsdWUnXG4gIH1cbn07XG52YXIgUHViU3ViID0ge1xuICBnZXRBdmFpbGFibGVMaXN0ZW5lcnM6IGZ1bmN0aW9uIGdldEF2YWlsYWJsZUxpc3RlbmVycygpIHtcbiAgICByZXR1cm4gYXZhaWxhYmxlTGlzdGVuZXJzO1xuICB9LFxuICBzdWJzY3JpYmU6IGZ1bmN0aW9uIHN1YnNjcmliZShldmVudHQsIGZ1bmN0KSB7XG4gICAgaWYgKGV2ZW50dCA9PT0gXCJzZWFyY2hLZXlVcFwiKSB7XG4gICAgICB2YXIgZWwgPSBkb2N1bWVudC5nZXRFbGVtZW50QnlJZChTdG9yZS5nZXRTZWFyY2hJbnB1dElkKCkpO1xuICAgICAgZWwuYWRkRXZlbnRMaXN0ZW5lcigna2V5dXAnLCBmdW5jdCk7XG4gICAgICByZXR1cm4gZnVuY3Rpb24gKCkge1xuICAgICAgICBlbC5yZW1vdmVFdmVudExpc3RlbmVyKCdrZXl1cCcsIGZ1bmN0LCBmYWxzZSk7XG4gICAgICB9O1xuICAgIH0gZWxzZSBpZiAoZXZlbnR0ID09PSAnc2VhcmNoRW50ZXInKSB7XG4gICAgICB2YXIgaGFuZGxpbmdGdW5jdCA9IGZ1bmN0aW9uIGhhbmRsaW5nRnVuY3QoZSkge1xuICAgICAgICBpZiAoZS5rZXlDb2RlID09PSAxMykge1xuICAgICAgICAgIGZ1bmN0KGUpO1xuICAgICAgICB9XG4gICAgICB9O1xuXG4gICAgICBlbC5hZGRFdmVudExpc3RlbmVyKCdrZXlkb3duJywgaGFuZGxpbmdGdW5jdCk7XG4gICAgICByZXR1cm4gZnVuY3Rpb24gKCkge1xuICAgICAgICBlbC5yZW1vdmVFdmVudExpc3RlbmVyKCdrZXlkb3duJywgaGFuZGxpbmdGdW5jdCwgZmFsc2UpO1xuICAgICAgfTtcbiAgICB9IGVsc2UgaWYgKGV2ZW50dCA9PT0gJ3NlYXJjaE9uQ2hhbmdlJykge1xuICAgICAgdmFyIGVsID0gZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoU3RvcmUuZ2V0U2VhcmNoSW5wdXRJZCgpKTtcbiAgICAgIGVsLmFkZEV2ZW50TGlzdGVuZXIoJ2NoYW5nZScsIGZ1bmN0KTtcbiAgICAgIHJldHVybiBmdW5jdGlvbiAoKSB7XG4gICAgICAgIGVsLnJlbW92ZUV2ZW50TGlzdGVuZXIoJ2tleXVwJywgZnVuY3QsIGZhbHNlKTtcbiAgICAgIH07XG4gICAgfSBlbHNlIHtcbiAgICAgIExvZ2dlci5lcnJvcignVGhlIGV2ZW50IHlvdSB0cmllZCB0byBzdWJzY3JpYmUgaXMgbm90IGF2YWlsYWJsZSBieSB0aGUgbGlicmFyeScpO1xuICAgICAgTG9nZ2VyLmxvZygnVGhlIGF2YWlsYWJsZSBldmVudHMgYXJlOiAnLCBhdmFpbGFibGVMaXN0ZW5lcnMpO1xuICAgICAgcmV0dXJuIGZ1bmN0aW9uICgpIHt9O1xuICAgIH1cbiAgfVxufTtcbm1vZHVsZS5leHBvcnRzID0gUHViU3ViOyIsIlwidXNlIHN0cmljdFwiO1xuXG52YXIgc3RhdGUgPSB7XG4gIGdlbmVyYWw6IHtcbiAgICBmdWxsV2lkdGg6IGZhbHNlLFxuICAgIGRpc3BsYXlTdXBwb3J0OiBmYWxzZVxuICB9LFxuICB1c2VyRGF0YToge30sXG4gIGNvbmZpZ3VyYXRpb246IHtcbiAgICBzZXNzaW9uRW5kcG9pbnQ6ICdzZXNzaW9uJyxcbiAgICBiYXNlVXJsOiAnL2FwaS92MSdcbiAgfSxcbiAgaHRtbFRlbXBsYXRlOiBcIlwiLFxuICBhcHBzOiBudWxsLFxuICB2ZXJzaW9uTnVtYmVyOiAnJyxcbiAgZGV2OiBmYWxzZSxcbiAgZmlsZVBpY2tlcjoge1xuICAgIHNlbGVjdGVkRmlsZTogbnVsbFxuICB9LFxuICBhcHBJbmZvOiBudWxsLFxuICBzZXNzaW9uRW5kcG9pbnRCeVVzZXI6IGZhbHNlXG59O1xuXG5mdW5jdGlvbiBhc3NlbWJsZShsaXRlcmFsLCBwYXJhbXMpIHtcbiAgcmV0dXJuIG5ldyBGdW5jdGlvbihwYXJhbXMsIFwicmV0dXJuIGBcIiArIGxpdGVyYWwgKyBcImA7XCIpO1xufVxuXG52YXIgU3RvcmUgPSB7XG4gIGdldFN0YXRlOiBmdW5jdGlvbiBnZXRTdGF0ZSgpIHtcbiAgICByZXR1cm4gT2JqZWN0LmFzc2lnbih7fSwgc3RhdGUpO1xuICB9LFxuICBzZXRXaW5kb3dOYW1lOiBmdW5jdGlvbiBzZXRXaW5kb3dOYW1lKHduKSB7XG4gICAgc3RhdGUuZ2VuZXJhbC53aW5kb3dOYW1lID0gd247XG4gIH0sXG4gIHNldEZ1bGxXaWR0aDogZnVuY3Rpb24gc2V0RnVsbFdpZHRoKGZ3KSB7XG4gICAgc3RhdGUuZ2VuZXJhbC5mdWxsV2lkdGggPSBmdztcbiAgfSxcbiAgc2V0RGlzcGxheVN1cHBvcnQ6IGZ1bmN0aW9uIHNldERpc3BsYXlTdXBwb3J0KGRpc3BsYXkpIHtcbiAgICBzdGF0ZS5nZW5lcmFsLmRpc3BsYXlTdXBwb3J0ID0gZGlzcGxheTtcbiAgfSxcbiAgc2V0RGV2OiBmdW5jdGlvbiBzZXREZXYoZGV2KSB7XG4gICAgc3RhdGUuZGV2ID0gZGV2O1xuICB9LFxuICBzZXRVcmxWZXJzaW9uUHJlZml4OiBmdW5jdGlvbiBzZXRVcmxWZXJzaW9uUHJlZml4KHByZWZpeCkge1xuICAgIHN0YXRlLmNvbmZpZ3VyYXRpb24uYmFzZVVybCA9IHByZWZpeDtcbiAgfSxcbiAgZ2V0RGV2VXJsUGFydDogZnVuY3Rpb24gZ2V0RGV2VXJsUGFydCgpIHtcbiAgICBpZiAoc3RhdGUuZGV2KSB7XG4gICAgICByZXR1cm4gXCJzYW5kYm94L1wiO1xuICAgIH0gZWxzZSB7XG4gICAgICByZXR1cm4gXCJcIjtcbiAgICB9XG4gIH0sXG4gIGdldEZ1bGxCYXNlVXJsOiBmdW5jdGlvbiBnZXRGdWxsQmFzZVVybCgpIHtcbiAgICByZXR1cm4gc3RhdGUuY29uZmlndXJhdGlvbi5yb290VXJsICsgc3RhdGUuY29uZmlndXJhdGlvbi5iYXNlVXJsICsgU3RvcmUuZ2V0RGV2VXJsUGFydCgpO1xuICB9LFxuXG4gIC8qXG4gICBjb25mOlxuICAgLSBoZWFkZXJEaXZJZFxuICAgLSBpbmNsdWRlQXBwc01lbnVcbiAgICovXG4gIHNldENvbmZpZ3VyYXRpb246IGZ1bmN0aW9uIHNldENvbmZpZ3VyYXRpb24oY29uZikge1xuICAgIGZvciAodmFyIGtleSBpbiBjb25mKSB7XG4gICAgICBzdGF0ZS5jb25maWd1cmF0aW9uW2tleV0gPSBjb25mW2tleV07XG4gICAgfVxuICB9LFxuICBzZXRWZXJzaW9uTnVtYmVyOiBmdW5jdGlvbiBzZXRWZXJzaW9uTnVtYmVyKHZlcnNpb24pIHtcbiAgICBzdGF0ZS52ZXJzaW9uTnVtYmVyID0gdmVyc2lvbjtcbiAgfSxcbiAgZ2V0VmVyc2lvbk51bWJlcjogZnVuY3Rpb24gZ2V0VmVyc2lvbk51bWJlcigpIHtcbiAgICByZXR1cm4gc3RhdGUudmVyc2lvbk51bWJlcjtcbiAgfSxcbiAgZ2V0QXBwc1Zpc2libGU6IGZ1bmN0aW9uIGdldEFwcHNWaXNpYmxlKCkge1xuICAgIGlmIChzdGF0ZS5jb25maWd1cmF0aW9uLmFwcHNWaXNpYmxlID09PSBudWxsIHx8IHN0YXRlLmNvbmZpZ3VyYXRpb24uYXBwc1Zpc2libGUgPT09IHVuZGVmaW5lZCkge1xuICAgICAgcmV0dXJuIHRydWU7XG4gICAgfSBlbHNlIHtcbiAgICAgIHJldHVybiBzdGF0ZS5jb25maWd1cmF0aW9uLmFwcHNWaXNpYmxlO1xuICAgIH1cbiAgfSxcbiAgc2V0QXBwc1Zpc2libGU6IGZ1bmN0aW9uIHNldEFwcHNWaXNpYmxlKGFwcHNWaXNpYmxlKSB7XG4gICAgc3RhdGUuY29uZmlndXJhdGlvbi5hcHBzVmlzaWJsZSA9IGFwcHNWaXNpYmxlO1xuICB9LFxuICBzZXRIVE1MVGVtcGxhdGU6IGZ1bmN0aW9uIHNldEhUTUxUZW1wbGF0ZSh0ZW1wbGF0ZSkge1xuICAgIHN0YXRlLmh0bWxUZW1wbGF0ZSA9IHRlbXBsYXRlO1xuICB9LFxuICBzZXRBcHBzOiBmdW5jdGlvbiBzZXRBcHBzKGFwcHMpIHtcbiAgICBzdGF0ZS5hcHBzID0gYXBwcztcbiAgfSxcbiAgc2V0QXBwSW5mbzogZnVuY3Rpb24gc2V0QXBwSW5mbyhhcHBJbmZvKSB7XG4gICAgc3RhdGUuYXBwSW5mbyA9IGFwcEluZm87XG4gIH0sXG4gIGdldEFwcEluZm86IGZ1bmN0aW9uIGdldEFwcEluZm8oKSB7XG4gICAgcmV0dXJuIHN0YXRlLmFwcEluZm87XG4gIH0sXG4gIGdldExvZ2luVXJsOiBmdW5jdGlvbiBnZXRMb2dpblVybCgpIHtcbiAgICByZXR1cm4gc3RhdGUuY29uZmlndXJhdGlvbi5yb290VXJsICsgc3RhdGUuY29uZmlndXJhdGlvbi5sb2dpblVybDsgLy8gKyBcIj9cIiArIHN0YXRlLmNvbmZpZ3VyYXRpb24ucmVkaXJlY3RVcmxQYXJhbSArIFwiPVwiICsgd2luZG93LmxvY2F0aW9uLmhyZWY7XG4gIH0sXG4gIGdldEF1dGhlbnRpY2F0aW9uRW5kcG9pbnQ6IGZ1bmN0aW9uIGdldEF1dGhlbnRpY2F0aW9uRW5kcG9pbnQoKSB7XG4gICAgaWYgKHN0YXRlLnNlc3Npb25FbmRwb2ludEJ5VXNlcikge1xuICAgICAgcmV0dXJuIFN0b3JlLmdldEZ1bGxCYXNlVXJsKCkgKyBzdGF0ZS5jb25maWd1cmF0aW9uLnNlc3Npb25FbmRwb2ludDtcbiAgICB9XG5cbiAgICByZXR1cm4gU3RvcmUuZ2V0RnVsbEJhc2VVcmwoKSArIHN0YXRlLmNvbmZpZ3VyYXRpb24uc2Vzc2lvbkVuZHBvaW50O1xuICB9LFxuICBnZXRTd2l0Y2hBY2NvdW50RW5kcG9pbnQ6IGZ1bmN0aW9uIGdldFN3aXRjaEFjY291bnRFbmRwb2ludChhY2NvdW50SWQpIHtcbiAgICByZXR1cm4gU3RvcmUuZ2V0RnVsbEJhc2VVcmwoKSArICdhY2NvdW50cy9zd2l0Y2gvJyArIGFjY291bnRJZDtcbiAgfSxcbiAgZ2V0QXBwc0VuZHBvaW50OiBmdW5jdGlvbiBnZXRBcHBzRW5kcG9pbnQoKSB7XG4gICAgcmV0dXJuIFN0b3JlLmdldEZ1bGxCYXNlVXJsKCkgKyAnYXBwcyc7XG4gIH0sXG4gIGdldENsb3VkaW5hcnlFbmRwb2ludDogZnVuY3Rpb24gZ2V0Q2xvdWRpbmFyeUVuZHBvaW50KCkge1xuICAgIHJldHVybiBTdG9yZS5nZXRGdWxsQmFzZVVybCgpICsgJ2Fzc2V0cyc7XG4gIH0sXG4gIGxvZ3NFbmFibGVkOiBmdW5jdGlvbiBsb2dzRW5hYmxlZCgpIHtcbiAgICByZXR1cm4gc3RhdGUuY29uZmlndXJhdGlvbi5sb2dzO1xuICB9LFxuICBnZXRTZWFyY2hJbnB1dElkOiBmdW5jdGlvbiBnZXRTZWFyY2hJbnB1dElkKCkge1xuICAgIHJldHVybiBzdGF0ZS5jb25maWd1cmF0aW9uLnNlYXJjaElucHV0SWQ7XG4gIH0sXG4gIHNldEhUTUxDb250YWluZXI6IGZ1bmN0aW9uIHNldEhUTUxDb250YWluZXIoaWQpIHtcbiAgICBzdGF0ZS5jb25maWd1cmF0aW9uLmhlYWRlckRpdklkID0gaWQ7XG4gIH0sXG4gIGdldEhUTE1Db250YWluZXI6IGZ1bmN0aW9uIGdldEhUTE1Db250YWluZXIoKSB7XG4gICAgaWYgKHN0YXRlLmNvbmZpZ3VyYXRpb24uaGVhZGVyRGl2SWQpIHtcbiAgICAgIHJldHVybiBzdGF0ZS5jb25maWd1cmF0aW9uLmhlYWRlckRpdklkO1xuICAgIH0gZWxzZSB7XG4gICAgICByZXR1cm4gXCJwcHNkay1jb250YWluZXJcIjtcbiAgICB9XG4gIH0sXG4gIGdldEhUTUw6IGZ1bmN0aW9uIGdldEhUTUwoKSB7XG4gICAgcmV0dXJuIHN0YXRlLmh0bWxUZW1wbGF0ZTtcbiAgfSxcbiAgc2V0U2Vzc2lvbkVuZHBvaW50OiBmdW5jdGlvbiBzZXRTZXNzaW9uRW5kcG9pbnQoc2Vzc2lvbkVuZHBvaW50KSB7XG4gICAgaWYgKHNlc3Npb25FbmRwb2ludC5pbmRleE9mKCcvJykgPT09IDApIHtcbiAgICAgIHNlc3Npb25FbmRwb2ludCA9IHNlc3Npb25FbmRwb2ludC5zdWJzdHJpbmcoMSwgc2Vzc2lvbkVuZHBvaW50Lmxlbmd0aCAtIDEpO1xuICAgIH1cblxuICAgIHN0YXRlLnNlc3Npb25FbmRwb2ludEJ5VXNlciA9IHRydWU7XG4gICAgc3RhdGUuY29uZmlndXJhdGlvbi5zZXNzaW9uRW5kcG9pbnQgPSBzZXNzaW9uRW5kcG9pbnQ7XG4gIH0sXG4gIGdldFdpbmRvd05hbWU6IGZ1bmN0aW9uIGdldFdpbmRvd05hbWUoKSB7XG4gICAgcmV0dXJuIHN0YXRlLmdlbmVyYWwud2luZG93TmFtZTtcbiAgfSxcbiAgZ2V0RnVsbFdpZHRoOiBmdW5jdGlvbiBnZXRGdWxsV2lkdGgoKSB7XG4gICAgcmV0dXJuIHN0YXRlLmdlbmVyYWwuZnVsbFdpZHRoO1xuICB9LFxuICBnZXREaXNwbGF5U3VwcG9ydDogZnVuY3Rpb24gZ2V0RGlzcGxheVN1cHBvcnQoKSB7XG4gICAgcmV0dXJuIHN0YXRlLmdlbmVyYWwuZGlzcGxheVN1cHBvcnQ7XG4gIH0sXG4gIHNldFVzZXJEYXRhOiBmdW5jdGlvbiBzZXRVc2VyRGF0YSh1c2VyRGF0YSkge1xuICAgIHN0YXRlLnVzZXJEYXRhID0gdXNlckRhdGE7XG4gIH0sXG4gIGdldFVzZXJEYXRhOiBmdW5jdGlvbiBnZXRVc2VyRGF0YSgpIHtcbiAgICByZXR1cm4gc3RhdGUudXNlckRhdGE7XG4gIH0sXG4gIHNldFJvb3RVcmw6IGZ1bmN0aW9uIHNldFJvb3RVcmwocm9vdFVybCkge1xuICAgIHN0YXRlLmNvbmZpZ3VyYXRpb24ucm9vdFVybCA9IHJvb3RVcmwucmVwbGFjZSgvXFwvPyQvLCAnLycpO1xuICAgIDtcbiAgfSxcbiAgZ2V0Um9vdFVybDogZnVuY3Rpb24gZ2V0Um9vdFVybCgpIHtcbiAgICByZXR1cm4gc3RhdGUuY29uZmlndXJhdGlvbi5yb290VXJsO1xuICB9LFxuICBnZXRBdmF0YXJVcGxvYWRVcmw6IGZ1bmN0aW9uIGdldEF2YXRhclVwbG9hZFVybCgpIHtcbiAgICByZXR1cm4gU3RvcmUuZ2V0RnVsbEJhc2VVcmwoKSArICdhc3NldHMvdXBsb2FkJztcbiAgfSxcbiAgZ2V0QXZhdGFyVXBkYXRlVXJsOiBmdW5jdGlvbiBnZXRBdmF0YXJVcGRhdGVVcmwoKSB7XG4gICAgcmV0dXJuIFN0b3JlLmdldEZ1bGxCYXNlVXJsKCkgKyAndXNlcnMvYXZhdGFyJztcbiAgfVxufTtcbm1vZHVsZS5leHBvcnRzID0gU3RvcmU7Il19
