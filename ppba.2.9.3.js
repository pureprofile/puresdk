(function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);var f=new Error("Cannot find module '"+o+"'");throw f.code="MODULE_NOT_FOUND",f}var l=n[o]={exports:{}};t[o][0].call(l.exports,function(e){var n=t[o][1][e];return s(n?n:e)},l,l.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){
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
  this._75 = 0;
  this._83 = 0;
  this._18 = null;
  this._38 = null;
  if (fn === noop) return;
  doResolve(fn, this);
}
Promise._47 = null;
Promise._71 = null;
Promise._44 = noop;

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
  while (self._83 === 3) {
    self = self._18;
  }
  if (Promise._47) {
    Promise._47(self);
  }
  if (self._83 === 0) {
    if (self._75 === 0) {
      self._75 = 1;
      self._38 = deferred;
      return;
    }
    if (self._75 === 1) {
      self._75 = 2;
      self._38 = [self._38, deferred];
      return;
    }
    self._38.push(deferred);
    return;
  }
  handleResolved(self, deferred);
}

function handleResolved(self, deferred) {
  asap(function() {
    var cb = self._83 === 1 ? deferred.onFulfilled : deferred.onRejected;
    if (cb === null) {
      if (self._83 === 1) {
        resolve(deferred.promise, self._18);
      } else {
        reject(deferred.promise, self._18);
      }
      return;
    }
    var ret = tryCallOne(cb, self._18);
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
      self._83 = 3;
      self._18 = newValue;
      finale(self);
      return;
    } else if (typeof then === 'function') {
      doResolve(then.bind(newValue), self);
      return;
    }
  }
  self._83 = 1;
  self._18 = newValue;
  finale(self);
}

function reject(self, newValue) {
  self._83 = 2;
  self._18 = newValue;
  if (Promise._71) {
    Promise._71(self, newValue);
  }
  finale(self);
}
function finale(self) {
  if (self._75 === 1) {
    handle(self, self._38);
    self._38 = null;
  }
  if (self._75 === 2) {
    for (var i = 0; i < self._38.length; i++) {
      handle(self, self._38[i]);
    }
    self._38 = null;
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
  var p = new Promise(Promise._44);
  p._83 = 1;
  p._18 = value;
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
          while (val._83 === 3) {
            val = val._18;
          }
          if (val._83 === 1) return res(i, val._18);
          if (val._83 === 2) reject(val._18);
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
  Promise._47 = null;
  Promise._71 = null;
}

exports.enable = enable;
function enable(options) {
  options = options || {};
  if (enabled) disable();
  enabled = true;
  var id = 0;
  var displayId = 0;
  var rejections = {};
  Promise._47 = function (promise) {
    if (
      promise._83 === 2 && // IS REJECTED
      rejections[promise._56]
    ) {
      if (rejections[promise._56].logged) {
        onHandled(promise._56);
      } else {
        clearTimeout(rejections[promise._56].timeout);
      }
      delete rejections[promise._56];
    }
  };
  Promise._71 = function (promise, err) {
    if (promise._75 === 0) { // not yet handled
      promise._56 = id++;
      rejections[promise._56] = {
        displayId: null,
        error: err,
        timeout: setTimeout(
          onUnhandled.bind(null, promise._56),
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
var Logger = require('./modules/logger');
var PubSub = require('./modules/pubsub');
var Caller = require('./modules/caller');
var Dom = require('./modules/dom');
var InfoController = require('./modules/info-controller');
var AvatarController = require('./modules/avatar-controller');
var Store = require('./modules/store');
var Cloudinary = require('./modules/cloudinary-image-picker');
var ppbaConf = {};

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
				Store.setAppInfo(conf.appInfo);
				// if google tag manager is present it will push the user's info to dataLayer
				try {
					dataLayer.push({
						'app': conf.appInfo.name
					});
				} catch (e) {
					// no Google Tag has been set
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
				'user': user.firstname + ' ' + user.lastname,
				'tenant_id': user.tenant_id,
				'userType': user.user_type,
				'accountId': user.account_id,
				'accountName': user.account.name
			});
		} catch (e) {
			// no Google Tag has been set
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

	setInputPlaceholder: function setInputPlaceholder(txt) {
		// document.getElementById(Store.getSearchInputId()).placeholder = txt;
	},

	changeAccount: function changeAccount(accountId) {
		Caller.makeCall({
			type: 'GET',
			endpoint: Store.getSwitchAccountEndpoint(accountId),
			callbacks: {
				success: function success(result) {
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
			return '\n\t\t\t\t<a class="bac--image-link" href="' + app.application_url + '" style="background: #' + app.color + '">\n\t\t\t\t\t<img src="' + app.icon + '" />\n\t\t\t\t</a>\n\t\t\t\t\n\t\t\t\t<div class="bac--puresdk-app-text-container">\n\t\t\t\t\t<a href="' + app.application_url + '" class="bac--app-name">' + app.name + '</a>\n\t\t\t\t\t<a href="' + app.application_url + '" class="bac--app-description">' + (app.descr === null ? '-' : app.descr) + '</a>\n\t\t\t\t</div>\n\t\t\t';
		};
		for (var i = 0; i < apps.length; i++) {
			var app = apps[i];
			var div = document.createElement("div");
			div.className = "bac--apps";
			div.innerHTML = appTemplate(app);

			// check to see if the user has access to the two main apps and remove disabled class
			if (app.application_url === '/app/groups') {
				Dom.removeClass(document.getElementById('bac--puresdk-groups-link--'), 'disabled');
			} else if (app.application_url === '/app/campaigns') {
				Dom.removeClass(document.getElementById('bac--puresdk-campaigns-link--'), 'disabled');
			}
			document.getElementById("bac--aps-actual-container").appendChild(div);
		}

		// finally check if the user is on any of the two main apps
		var appInfo = Store.getAppInfo();
		if (appInfo.root === "/app/groups") {
			Dom.addClass(document.getElementById('bac--puresdk-groups-link--'), 'selected');
		} else if (appInfo.root === "/app/campaigns") {
			Dom.addClass(document.getElementById('bac--puresdk-campaigns-link--'), 'selected');
		}
	},

	renderUser: function renderUser(user) {
		var userTemplate = function userTemplate(user) {
			return '\n\t\t\t\t<div class="bac--user-image" id="bac--user-image">\n\t\t\t\t\t<i class="fa fa-camera"></i>\n\t\t\t   \t<div id="bac--user-image-file"></div>\n\t\t\t   \t<div id="bac--user-image-upload-progress">\n\t\t\t   \t\t<svg width=\'60px\' height=\'60px\' xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" preserveAspectRatio="xMidYMid" class="uil-default"><rect x="0" y="0" width="100" height="100" fill="none" class="bk"></rect><rect  x=\'46.5\' y=\'40\' width=\'7\' height=\'20\' rx=\'5\' ry=\'5\' fill=\'#ffffff\' transform=\'rotate(0 50 50) translate(0 -30)\'>  <animate attributeName=\'opacity\' from=\'1\' to=\'0\' dur=\'1s\' begin=\'-1s\' repeatCount=\'indefinite\'/></rect><rect  x=\'46.5\' y=\'40\' width=\'7\' height=\'20\' rx=\'5\' ry=\'5\' fill=\'#ffffff\' transform=\'rotate(30 50 50) translate(0 -30)\'>  <animate attributeName=\'opacity\' from=\'1\' to=\'0\' dur=\'1s\' begin=\'-0.9166666666666666s\' repeatCount=\'indefinite\'/></rect><rect  x=\'46.5\' y=\'40\' width=\'7\' height=\'20\' rx=\'5\' ry=\'5\' fill=\'#ffffff\' transform=\'rotate(60 50 50) translate(0 -30)\'>  <animate attributeName=\'opacity\' from=\'1\' to=\'0\' dur=\'1s\' begin=\'-0.8333333333333334s\' repeatCount=\'indefinite\'/></rect><rect  x=\'46.5\' y=\'40\' width=\'7\' height=\'20\' rx=\'5\' ry=\'5\' fill=\'#ffffff\' transform=\'rotate(90 50 50) translate(0 -30)\'>  <animate attributeName=\'opacity\' from=\'1\' to=\'0\' dur=\'1s\' begin=\'-0.75s\' repeatCount=\'indefinite\'/></rect><rect  x=\'46.5\' y=\'40\' width=\'7\' height=\'20\' rx=\'5\' ry=\'5\' fill=\'#ffffff\' transform=\'rotate(120 50 50) translate(0 -30)\'>  <animate attributeName=\'opacity\' from=\'1\' to=\'0\' dur=\'1s\' begin=\'-0.6666666666666666s\' repeatCount=\'indefinite\'/></rect><rect  x=\'46.5\' y=\'40\' width=\'7\' height=\'20\' rx=\'5\' ry=\'5\' fill=\'#ffffff\' transform=\'rotate(150 50 50) translate(0 -30)\'>  <animate attributeName=\'opacity\' from=\'1\' to=\'0\' dur=\'1s\' begin=\'-0.5833333333333334s\' repeatCount=\'indefinite\'/></rect><rect  x=\'46.5\' y=\'40\' width=\'7\' height=\'20\' rx=\'5\' ry=\'5\' fill=\'#ffffff\' transform=\'rotate(180 50 50) translate(0 -30)\'>  <animate attributeName=\'opacity\' from=\'1\' to=\'0\' dur=\'1s\' begin=\'-0.5s\' repeatCount=\'indefinite\'/></rect><rect  x=\'46.5\' y=\'40\' width=\'7\' height=\'20\' rx=\'5\' ry=\'5\' fill=\'#ffffff\' transform=\'rotate(210 50 50) translate(0 -30)\'>  <animate attributeName=\'opacity\' from=\'1\' to=\'0\' dur=\'1s\' begin=\'-0.4166666666666667s\' repeatCount=\'indefinite\'/></rect><rect  x=\'46.5\' y=\'40\' width=\'7\' height=\'20\' rx=\'5\' ry=\'5\' fill=\'#ffffff\' transform=\'rotate(240 50 50) translate(0 -30)\'>  <animate attributeName=\'opacity\' from=\'1\' to=\'0\' dur=\'1s\' begin=\'-0.3333333333333333s\' repeatCount=\'indefinite\'/></rect><rect  x=\'46.5\' y=\'40\' width=\'7\' height=\'20\' rx=\'5\' ry=\'5\' fill=\'#ffffff\' transform=\'rotate(270 50 50) translate(0 -30)\'>  <animate attributeName=\'opacity\' from=\'1\' to=\'0\' dur=\'1s\' begin=\'-0.25s\' repeatCount=\'indefinite\'/></rect><rect  x=\'46.5\' y=\'40\' width=\'7\' height=\'20\' rx=\'5\' ry=\'5\' fill=\'#ffffff\' transform=\'rotate(300 50 50) translate(0 -30)\'>  <animate attributeName=\'opacity\' from=\'1\' to=\'0\' dur=\'1s\' begin=\'-0.16666666666666666s\' repeatCount=\'indefinite\'/></rect><rect  x=\'46.5\' y=\'40\' width=\'7\' height=\'20\' rx=\'5\' ry=\'5\' fill=\'#ffffff\' transform=\'rotate(330 50 50) translate(0 -30)\'>  <animate attributeName=\'opacity\' from=\'1\' to=\'0\' dur=\'1s\' begin=\'-0.08333333333333333s\' repeatCount=\'indefinite\'/></rect></svg>\n\t\t\t\t\t</div>\n\t\t\t   </div>\n\t\t\t\t<div class="bac--user-name">' + user.firstname + ' ' + user.lastname + '</div>\n\t\t\t\t<div class="bac--user-email">' + user.email + '</div>\n\t\t\t';
		};
		var div = document.createElement('div');
		div.className = "bac--user-sidebar-info";
		div.innerHTML = userTemplate(user);
		document.getElementById('bac--puresdk-user-details--').appendChild(div);
		document.getElementById('bac--puresdk-user-avatar--').innerHTML = user.firstname.charAt(0) + user.lastname.charAt(0);
	},

	renderAccounts: function renderAccounts(accounts, currentAccount) {
		// Logger.log(currentAccount);
		var accountsTemplate = function accountsTemplate(account, isTheSelected) {
			return '\n\t\t\t\t<div class="bac--user-list-item-image">\n\t\t\t\t\t<img src="' + account.sdk_square_logo_icon + '" alt="">\n\t\t\t\t</div>\n\t\t\t\t<div class="bac-user-app-details">\n\t\t\t\t\t <span>' + account.name + '</span>\n\t\t\t\t</div>\n\t\t\t\t' + (isTheSelected ? '<div id="bac--selected-acount-indicator" class="bac--selected-acount-indicator"></div>' : '') + '\n\t\t\t';
		};

		var _loop = function _loop(i) {
			var account = accounts[i];
			var div = document.createElement('div');
			div.className = 'bac--user-list-item';
			div.innerHTML = accountsTemplate(account, account.sfid === currentAccount.sfid);
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
		document.getElementById('bac--puresdk-account-logo--').appendChild(logo);
		document.getElementById('bac--puresdk-account-logo--').onclick = function (e) {
			window.location.href = Store.getRootUrl();
		};
		if (appInfo !== null) {
			var appTitleContainer = document.createElement('div');
			appTitleContainer.className = "bac--puresdk-app-name--";
			var appOpenerTemplate = function appOpenerTemplate(appInformation) {
				return '\n\t\t\t\t\t <a href="' + appInformation.root + '" id="app-name-link-to-root">' + appInformation.name + '</a>\n\t \t  \t \t';
			};
			appTitleContainer.innerHTML = appOpenerTemplate(appInfo);
			document.getElementById('bac--puresdk-account-logo--').appendChild(appTitleContainer);
		}

		document.getElementById('bac--puresdk-bac--header-apps--').style.cssText = "background: #" + account.sdk_background_color + "; color: #" + account.sdk_font_color;
		document.getElementById('bac--puresdk-user-sidebar--').style.cssText = "background: #" + account.sdk_background_color + "; color: #" + account.sdk_font_color;
		if (document.getElementById('bac--puresdk-apps-name--')) {
			document.getElementById('bac--puresdk-apps-name--').style.cssText = "color: #" + account.sdk_font_color;
		}
		if (document.getElementById('bac--selected-acount-indicator')) {
			document.getElementById('bac--selected-acount-indicator').style.cssText = "background: #" + account.sdk_font_color;
		}
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
			document.title = 'Pureprofile Access | ' + appInfo.name;
		} else {
			document.title = 'Pureprofile Access';
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
},{"./modules/avatar-controller":7,"./modules/caller":8,"./modules/cloudinary-image-picker":9,"./modules/dom":10,"./modules/info-controller":11,"./modules/logger":12,"./modules/pubsub":14,"./modules/store":15,"promise/lib/es6-extensions.js":3,"promise/lib/rejection-tracking":4}],6:[function(require,module,exports){
'use strict';

/*!
 * PureProfile PureProfile Business Apps Development SDK
 *
 * version: 2.9.3
 * date: 2019-10-29
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
ppba.setHTMLTemplate('<header class="bac--header-apps" id="bac--puresdk-bac--header-apps--">\n    <div class="bac--container">\n        <div class="bac--logo" id="bac--puresdk-account-logo--"></div>\n        <div class="bac--user-actions">\n            <svg id="bac--puresdk--loader--" width="38" height="38" viewBox="0 0 44 44" xmlns="http://www.w3.org/2000/svg" stroke="#fff" style="\n    margin-right: 10px;\n">\n                <g fill="none" fill-rule="evenodd" stroke-width="2">\n                    <circle cx="22" cy="22" r="16.6437">\n                        <animate attributeName="r" begin="0s" dur="1.8s" values="1; 20" calcMode="spline" keyTimes="0; 1" keySplines="0.165, 0.84, 0.44, 1" repeatCount="indefinite"></animate>\n                        <animate attributeName="stroke-opacity" begin="0s" dur="1.8s" values="1; 0" calcMode="spline" keyTimes="0; 1" keySplines="0.3, 0.61, 0.355, 1" repeatCount="indefinite"></animate>\n                    </circle>\n                    <circle cx="22" cy="22" r="19.9282">\n                        <animate attributeName="r" begin="bac-0.9s" dur="1.8s" values="1; 20" calcMode="spline" keyTimes="0; 1" keySplines="0.165, 0.84, 0.44, 1" repeatCount="indefinite"></animate>\n                        <animate attributeName="stroke-opacity" begin="bac-0.9s" dur="1.8s" values="1; 0" calcMode="spline" keyTimes="0; 1" keySplines="0.3, 0.61, 0.355, 1" repeatCount="indefinite"></animate>\n                    </circle>\n                </g>\n            </svg>\n            <div class="bac--user-apps" id="bac--puresdk-apps-section--">\n                <a href="/app/campaigns" id="bac--puresdk-campaigns-link--" class="bac--puresdk-apps-on-navbar-- disabled">Campaigns</a>\n                <a href="/app/groups" id="bac--puresdk-groups-link--" class="bac--puresdk-apps-on-navbar-- disabled">Groups</a>\n                <a href="#" id="bac--puresdk--apps--opener--" class="bac--puresdk-apps-on-navbar--">Other apps</a>\n                <div class="bac--apps-container" id="bac--puresdk-apps-container--">\n                    <div id="bac--aps-actual-container"></div>\n                </div>\n            </div>\n            <div class="bac--user-avatar" id="bac--user-avatar-top">\n                <span class="bac--user-avatar-name" id="bac--puresdk-user-avatar--"></span>\n                <div id="bac--image-container-top"></div>\n            </div>\n        </div>\n    </div>\n    <div id="bac--info-blocks-wrapper--"></div>\n</header>\n<div class="bac--user-sidebar" id="bac--puresdk-user-sidebar--">\n    <div id="bac--puresdk-user-details--"></div>\n    <div class="bac--user-apps" id="bac--puresdk-user-businesses--">\n    </div>\n    <div class="bac--user-account-settings">\n        <div class="bac-user-acount-list-item">\n            <i class="fa fa-login-line"></i>\n            <a href="/api/v1/sign-off">Log out</a>\n        </div>\n\n        <div id="puresdk-version-number" class="puresdk-version-number"></div>\n    </div>\n</div>\n\n\n<div class="bac--custom-modal add-question-modal --is-open" id="bac--cloudinary--modal">\n    <div class="custom-modal__wrapper">\n        <div class="custom-modal__content">\n            <h3>Add image</h3>\n            <a class="custom-modal__close-btn" id="bac--cloudinary--closebtn"><i class="fa fa-times-circle"></i></a>\n        </div>\n\n        <div class="custom-modal__content">\n            <div class="bac-search --icon-left">\n                <input id="bac--cloudinary--search-input" type="search" name="search" placeholder="Search for images..."/>\n                <div class="bac-search__icon"><i class="fa fa-search"></i></div>\n            </div>\n            <br/>\n\n            <div class="back-button" id="bac--cloudinary--back-button-container">\n                <a class="goBack" id="bac--cloudinary--go-back"><i class="fa fa-angle-left"></i>Go Back</a>\n            </div>\n\n            <br/>\n            <div class="cloud-images">\n                <div class="cloud-images__container" id="bac--cloudinary-itams-container"></div>\n\n                <div class="cloud-images__pagination" id="bac--cloudinary-pagination-container">\n                    <ul id="bac--cloudinary-actual-pagination-container"></ul>\n                </div>\n\n            </div>\n        </div>\n    </div>\n</div>\n\n<input style="display:none" type=\'file\' id=\'bac---puresdk-avatar-file\'>\n<input style="display:none" type=\'button\' id=\'bac---puresdk-avatar-submit\' value=\'Upload!\'>');
ppba.setVersionNumber('2.9.3');

window.PURESDK = ppba;

var css = 'html,body,div,span,applet,object,iframe,h1,h2,h3,h4,h5,h6,p,blockquote,pre,a,abbr,acronym,address,big,cite,code,del,dfn,em,img,ins,kbd,q,s,samp,small,strike,strong,sub,sup,tt,var,b,u,i,center,dl,dt,dd,ol,ul,li,fieldset,form,label,legend,table,caption,tbody,tfoot,thead,tr,th,td,article,aside,canvas,details,embed,figure,figcaption,footer,header,hgroup,menu,nav,output,ruby,section,summary,time,mark,audio,video{margin:0;padding:0;border:0;font-size:100%;font:inherit;vertical-align:baseline}article,aside,details,figcaption,figure,footer,header,hgroup,menu,nav,section{display:block}body{line-height:1}ol,ul{list-style:none}blockquote,q{quotes:none}blockquote:before,blockquote:after,q:before,q:after{content:"";content:none}table{border-collapse:collapse;border-spacing:0}body{overflow-x:hidden}#bac-wrapper{font-family:"Verdana", arial, sans-serif;color:white;min-height:100vh;position:relative}.bac--container{max-width:1160px;margin:0 auto}.bac--container .bac--puresdk-app-name--{display:inline-block;position:relative;top:-5px;left:15px}.bac--container #app-name-link-to-root{display:block;font-size:16px;width:200px;color:white;text-decoration:none}.bac--header-apps{position:absolute;width:100%;height:50px;background-color:#475369;padding:5px 10px;z-index:9999999 !important}.bac--header-apps.bac--fullwidth{padding:0}.bac--header-apps.bac--fullwidth .bac--container{max-width:unset;padding-left:16px;padding-right:16px}.bac--header-apps .bac--container{height:100%;display:flex;align-items:center;justify-content:space-between}.bac--header-search{position:relative}.bac--header-search input{color:#fff;font-size:14px;height:35px;background-color:#6b7586;padding:0 5px 0 10px;border:none;border-radius:3px;min-width:400px;width:100%}.bac--header-search input:focus{outline:none}.bac--header-search input::-webkit-input-placeholder{font-style:normal !important;text-align:center;color:#fff;font-size:14px;font-weight:300;letter-spacing:0.5px}.bac--header-search input::-moz-placeholder{font-style:normal !important;text-align:center;color:#fff;font-size:14px;font-weight:300;letter-spacing:0.5px}.bac--header-search input:-ms-input-placeholder{font-style:normal !important;text-align:center;color:#fff;font-size:14px;font-weight:300;letter-spacing:0.5px}.bac--header-search i{position:absolute;top:8px;right:10px}.bac--user-actions{display:flex;align-items:center}.bac--user-actions #bac--puresdk-apps-section--{border-right:1px solid #adadad;height:40px;padding-top:13px}.bac--user-actions #bac--puresdk-apps-section-- a.bac--puresdk-apps-on-navbar--{color:whitesmoke;text-decoration:none;margin-right:25px;font-size:13px}.bac--user-actions #bac--puresdk-apps-section-- a.bac--puresdk-apps-on-navbar--.disabled{pointer-events:none;cursor:none;color:#adadad}.bac--user-actions #bac--puresdk-apps-section-- a.bac--puresdk-apps-on-navbar--.selected{color:#20D6C9;pointer-events:none}.bac--user-actions .bac--user-notifications{position:relative}.bac--user-actions .bac--user-notifications i{font-size:20px}.bac--user-actions #bac--puresdk--loader--{display:none}.bac--user-actions #bac--puresdk--loader--.bac--puresdk-visible{display:block}.bac--user-actions .bac--user-notifications-count{position:absolute;display:inline-block;height:15px;width:15px;line-height:15px;color:#fff;font-size:10px;text-align:center;background-color:#fc3b30;border-radius:50%;top:-5px;left:-5px}.bac--user-actions .bac--user-avatar,.bac--user-actions .bac--user-notifications{margin-left:20px}.bac--user-actions .bac--user-avatar{position:relative;overflow:hidden;border-radius:50%}.bac--user-actions .bac--user-avatar #bac--image-container-top{width:100%;heigth:100%;position:absolute;top:0;left:0;z-index:1;display:none}.bac--user-actions .bac--user-avatar #bac--image-container-top img{width:100%;height:100%;cursor:pointer}.bac--user-actions .bac--user-avatar #bac--image-container-top.bac--puresdk-visible{display:block}.bac--user-actions .bac--user-avatar-name{color:#fff;background-color:#adadad;display:inline-block;height:35px;width:35px;line-height:35px;text-align:center;font-size:14px}.bac--user-apps{position:relative}#bac--puresdk-apps-icon--{width:20px;display:inline-block;text-align:center;font-size:16px}.bac--puresdk-apps-name--{font-size:9px;width:20px;text-align:center}#bac--puresdk-user-businesses--{height:calc(100vh - 333px);overflow:auto}.bac--apps-container{background:#fff;position:absolute;top:45px;right:0px;display:flex;width:300px;flex-wrap:wrap;border-radius:10px;padding:15px;padding-right:0;justify-content:space-between;text-align:left;-webkit-box-shadow:0 0 10px 2px rgba(0,0,0,0.2);box-shadow:0 0 10px 2px rgba(0,0,0,0.2);opacity:0;visibility:hidden;transition:all 0.4s ease;max-height:500px}.bac--apps-container #bac--aps-actual-container{height:100%;overflow:scroll;max-height:475px;width:100%}.bac--apps-container.active{opacity:1;visibility:visible}.bac--apps-container:before{content:"";vertical-align:middle;margin:auto;position:absolute;display:block;left:0;right:-185px;bottom:calc(100% - 6px);width:12px;height:12px;transform:rotate(45deg);background-color:#fff}.bac--apps-container .bac--apps{width:100%;font-size:20px;margin-bottom:15px;text-align:left;height:33px}.bac--apps-container .bac--apps:last-child{margin-bottom:0}.bac--apps-container .bac--apps:hover{background:#f3f3f3}.bac--apps-container .bac--apps a.bac--image-link{display:inline-block;color:#fff;text-decoration:none;width:33px;height:33px}.bac--apps-container .bac--apps a.bac--image-link img{width:100%;height:100%}.bac--apps-container .bac--apps .bac--puresdk-app-text-container{display:inline-block;position:relative;left:-2px;width:calc(100% - 42px)}.bac--apps-container .bac--apps .bac--puresdk-app-text-container a{display:block;text-decoration:none;cursor:pointer;padding-left:8px}.bac--apps-container .bac--apps .bac--puresdk-app-text-container .bac--app-name{width:100%;color:#000;font-size:13px;padding-bottom:4px}.bac--apps-container .bac--apps .bac--puresdk-app-text-container .bac--app-description{color:#919191;font-size:11px;font-style:italic;line-height:1.3em;position:relative;top:-2px;overflow:hidden;white-space:nowrap;text-overflow:ellipsis}.bac--user-sidebar{font-family:"Verdana", arial, sans-serif;color:white;height:calc(100vh - 50px);background-color:#515f77;box-sizing:border-box;width:320px;position:fixed;top:50px;right:0;z-index:999999;padding-top:10px;opacity:0;transform:translateX(100%);transition:all 0.4s ease}.bac--user-sidebar.active{opacity:1;transform:translateX(0%);-webkit-box-shadow:-1px 0px 12px 0px rgba(0,0,0,0.75);-moz-box-shadow:-1px 3px 12px 0px rgba(0,0,0,0.75);box-shadow:-1px 0px 12px 0px rgba(0,0,0,0.75)}.bac--user-sidebar .bac--user-list-item{display:flex;position:relative;cursor:pointer;align-items:center;padding:10px 10px 10px 40px;border-bottom:1px solid rgba(255,255,255,0.1)}.bac--user-sidebar .bac--user-list-item:hover{background-color:rgba(255,255,255,0.1)}.bac--user-sidebar .bac--user-list-item .bac--selected-acount-indicator{position:absolute;right:0;height:100%;width:8px}.bac--user-sidebar .bac--user-list-item .bac--user-list-item-image{width:40px;height:40px;border-radius:3px;border:2px solid #fff;margin-right:20px;display:flex;align-items:center;justify-content:center}.bac--user-sidebar .bac--user-list-item .bac--user-list-item-image>img{width:auto;height:auto;max-width:100%;max-height:100%}.bac--user-sidebar .bac--user-list-item span{width:100%;display:block;margin-bottom:5px}.bac--user-sidebar .bac-user-app-details span{font-size:12px}.bac--user-sidebar .puresdk-version-number{width:100%;text-align:right;padding-right:10px;position:absolute;font-size:8px;opacity:0.5;right:0;bottom:0}.bac--user-sidebar-info{display:flex;justify-content:center;flex-wrap:wrap;text-align:center;padding:10px 20px 15px}.bac--user-sidebar-info .bac--user-image{border:1px #adadad solid;overflow:hidden;border-radius:50%;position:relative;cursor:pointer;display:inline-block;height:80px;width:80px;line-height:80px;text-align:center;color:#fff;border-radius:50%;background-color:#adadad;margin-bottom:15px}.bac--user-sidebar-info .bac--user-image #bac--user-image-file{display:none;position:absolute;z-index:1;top:0;left:0;width:100%;height:100%}.bac--user-sidebar-info .bac--user-image #bac--user-image-file img{width:100%;height:100%}.bac--user-sidebar-info .bac--user-image #bac--user-image-file.bac--puresdk-visible{display:block}.bac--user-sidebar-info .bac--user-image #bac--user-image-upload-progress{position:absolute;padding-top:10px;top:0;background:#666;z-index:4;display:none;width:100%;height:100%}.bac--user-sidebar-info .bac--user-image #bac--user-image-upload-progress.bac--puresdk-visible{display:block}.bac--user-sidebar-info .bac--user-image i{font-size:32px;font-size:32px;z-index:0;position:absolute;width:100%;left:0;background-color:rgba(0,0,0,0.5)}.bac--user-sidebar-info .bac--user-image:hover i{z-index:3}.bac--user-sidebar-info .bac--user-name{width:100%;text-align:center;font-size:18px;margin-bottom:10px}.bac--user-sidebar-info .bac--user-email{font-size:12px;font-weight:300}.bac--user-account-settings{position:absolute;bottom:10px;left:20px;width:90%;height:50px}.bac--user-account-settings .bac-user-acount-list-item{display:flex;align-items:center;margin-bottom:30px;position:absolute}.bac--user-account-settings .bac-user-acount-list-item a{text-decoration:none;color:#fff}.bac--user-account-settings .bac-user-acount-list-item i{font-size:16px;margin-right:8px}#bac--puresdk-account-logo--{cursor:pointer;position:relative;color:#fff}#bac--puresdk-account-logo-- img{height:28px}#bac--info-blocks-wrapper--{position:fixed;top:0px;height:auto}#bac--info-blocks-wrapper-- .bac--puresdk-info-box--{border-radius:0 0 3px 3px;overflow:hidden;z-index:99999999;position:relative;margin-top:0;width:470px;left:calc(50vw - 235px);height:0px;-webkit-transition:top 0.4s;transition:all 0.4s}#bac--info-blocks-wrapper-- .bac--puresdk-info-box--.bac--success{background:#14DA9E}#bac--info-blocks-wrapper-- .bac--puresdk-info-box--.bac--success .bac--inner-info-box-- div.bac--info-icon--.fa-success{display:inline-block}#bac--info-blocks-wrapper-- .bac--puresdk-info-box--.bac--info{background-color:#5BC0DE}#bac--info-blocks-wrapper-- .bac--puresdk-info-box--.bac--info .bac--inner-info-box-- div.bac--info-icon--.fa-info-1{display:inline-block}#bac--info-blocks-wrapper-- .bac--puresdk-info-box--.bac--warning{background:#F0AD4E}#bac--info-blocks-wrapper-- .bac--puresdk-info-box--.bac--warning .bac--inner-info-box-- div.bac--info-icon--.fa-warning{display:inline-block}#bac--info-blocks-wrapper-- .bac--puresdk-info-box--.bac--error{background:#EF4100}#bac--info-blocks-wrapper-- .bac--puresdk-info-box--.bac--error .bac--inner-info-box-- div.bac--info-icon--.fa-error{display:inline-block}#bac--info-blocks-wrapper-- .bac--puresdk-info-box-- .bac--timer{-webkit-transition-timing-function:linear;transition-timing-function:linear;position:absolute;bottom:0px;opacity:0.5;height:2px !important;background:white;width:0%}#bac--info-blocks-wrapper-- .bac--puresdk-info-box-- .bac--timer.bac--fullwidth{width:100%}#bac--info-blocks-wrapper-- .bac--puresdk-info-box--.bac--active--{height:auto;margin-top:5px}#bac--info-blocks-wrapper-- .bac--puresdk-info-box-- .bac--inner-info-box--{width:100%;padding:11px 15px;color:white}#bac--info-blocks-wrapper-- .bac--puresdk-info-box-- .bac--inner-info-box-- div{display:inline-block;height:18px;position:relative}#bac--info-blocks-wrapper-- .bac--puresdk-info-box-- .bac--inner-info-box-- div.bac--info-icon--{display:none;top:0px}#bac--info-blocks-wrapper-- .bac--puresdk-info-box-- .bac--inner-info-box-- .bac--info-icon--{margin-right:15px;width:10px;top:2px}#bac--info-blocks-wrapper-- .bac--puresdk-info-box-- .bac--inner-info-box-- .bac--info-main-text--{width:380px;margin-right:15px;font-size:12px;text-align:center}#bac--info-blocks-wrapper-- .bac--puresdk-info-box-- .bac--inner-info-box-- .bac--info-close-button--{width:10px;cursor:pointer;top:2px}@media (min-width: 600px){.bac--container.bac--fullwidth .bac--container{padding-left:24px;padding-right:24px}}@media (min-width: 960px){.bac--container.bac--fullwidth .bac--container{padding-left:32px;padding-right:32px}}.bac--custom-modal{position:fixed;width:70%;height:80%;min-width:400px;left:0;right:0;top:0;bottom:0;margin:auto;border:1px solid #979797;border-radius:5px;box-shadow:0 0 71px 0 #2F3849;background:#fff;z-index:999;overflow:auto;display:none}.bac--custom-modal.is-open{display:block}.bac--custom-modal .custom-modal__close-btn{text-decoration:none;padding-top:2px;line-height:18px;height:20px;width:20px;border-radius:50%;color:#909ba4;text-align:center;position:absolute;top:20px;right:20px;font-size:20px}.bac--custom-modal .custom-modal__close-btn:hover{text-decoration:none;color:#455066;cursor:pointer}.bac--custom-modal .custom-modal__wrapper{height:100%;display:flex;flex-direction:column}.bac--custom-modal .custom-modal__wrapper iframe{width:100%;height:100%}.bac--custom-modal .custom-modal__content-wrapper{height:100%;overflow:auto;margin-bottom:104px;border-top:2px solid #C9CDD7}.bac--custom-modal .custom-modal__content-wrapper.no-margin{margin-bottom:0}.bac--custom-modal .custom-modal__content{padding:20px;position:relative}.bac--custom-modal .custom-modal__content h3{color:#2F3849;font-size:20px;font-weight:600;line-height:27px}.bac--custom-modal .custom-modal__save{position:absolute;right:0;bottom:0;width:100%;padding:30px 32px;background-color:#F2F2F4}.bac--custom-modal .custom-modal__save a,.bac--custom-modal .custom-modal__save button{font-size:14px;line-height:22px;height:44px;width:100%}.bac--custom-modal .custom-modal__splitter{height:30px;line-height:30px;padding:0 20px;border-color:#D3D3D3;border-style:solid;border-width:1px 0 1px 0;background-color:#F0F0F0;color:#676F82;font-size:13px;font-weight:600}.bac--custom-modal .custom-modal__box{display:inline-block;vertical-align:middle;height:165px;width:165px;border:2px solid red;border-radius:5px;text-align:center;font-size:12px;font-weight:600;color:#9097A8;text-decoration:none;margin:10px 20px 10px 0;transition:0.1s all}.bac--custom-modal .custom-modal__box i{font-size:70px;display:block;margin:25px 0}.bac--custom-modal .custom-modal__box.active{color:yellow;border-color:yellow;text-decoration:none}.bac--custom-modal .custom-modal__box:hover,.bac--custom-modal .custom-modal__box:active,.bac--custom-modal .custom-modal__box:focus{color:#1AC0B4;border-color:yellow;text-decoration:none}.cloud-images__container{display:flex;flex-wrap:wrap;justify-content:flex-start}.cloud-images__pagination{padding:20px}.cloud-images__pagination li{display:inline-block;margin-right:10px}.cloud-images__pagination li a{color:#fff;background-color:#5e6776;border-radius:20px;text-decoration:none;display:block;font-weight:200;height:35px;width:35px;line-height:35px;text-align:center}.cloud-images__pagination li.active a{background-color:#2f3849}.cloud-images__item{width:155px;height:170px;border:1px solid #eee;background-color:#fff;border-radius:3px;margin:0 15px 15px 0;text-align:center;position:relative;cursor:pointer}.cloud-images__item .cloud-images__item__type{height:115px;font-size:90px;line-height:140px;border-top-left-radius:3px;border-top-right-radius:3px;color:#a2a2a2;background-color:#e9eaeb}.cloud-images__item .cloud-images__item__type>img{width:auto;height:auto;max-width:100%;max-height:100%}.cloud-images__item .cloud-images__item__details{padding:10px 0}.cloud-images__item .cloud-images__item__details .cloud-images__item__details__name{font-size:12px;outline:none;padding:0 10px;color:#a5abb5;border:none;width:100%;background-color:transparent;height:15px;display:inline-block;word-break:break-all}.cloud-images__item .cloud-images__item__details .cloud-images__item__details__date{font-size:10px;bottom:6px;width:155px;height:15px;color:#a5abb5;display:inline-block}.cloud-images__item .cloud-images__item__actions{display:flex;align-items:center;justify-content:center;position:absolute;top:0;left:0;width:100%;height:115px;background-color:rgba(78,83,91,0.83);opacity:0;visibility:hidden;border-top-left-radius:3px;border-top-right-radius:3px;text-align:center;transition:0.3s opacity}.cloud-images__item .cloud-images__item__actions a{font-size:16px;color:#fff;text-decoration:none}.cloud-images__item:hover .cloud-images__item .cloud-images__item__actions{opacity:1;visibility:visible}',
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
		};

		// request.upload.addEventListener('progress', function(e){
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
		AvatarCtrl._top_avatar_container.appendChild(img_2);

		//  bac--image-container-top
	}
};

module.exports = AvatarCtrl;
},{"./caller":8,"./dom":10,"./logger":12,"./store":15}],8:[function(require,module,exports){
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
},{"./logger":12,"./store.js":15}],9:[function(require,module,exports){
var debouncedTimeout = null;
var currentQuery = '';
var limit = 8;
var latency = 500;
var initOptions = void 0;
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
						};

						// TODO set search input's value = ''
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
										return '<img src=' + item.thumb + ' alt=""/>';
								} else {
										return '<i class="fa fa-folder-o"></i>';
								}
						};

						var funct = function funct() {
								CloudinaryPicker.itemSelected(item);
						};

						var newDomEl = document.createElement('div');
						newDomEl.className = "cloud-images__item";
						newDomEl.onclick = funct;
						newDomEl.innerHTML = '\n\t\t\t\t\t\t  <div class="cloud-images__item__type">\n\t\t\t\t\t\t\t\t' + itemIcon() + '\n\t\t\t\t\t\t  </div>\n\t\t\t\t\t\t  <div class="cloud-images__item__details">\n\t\t\t\t\t\t\t\t<span class="cloud-images__item__details__name">' + item.name + '</span>\n\t\t\t\t\t\t\t\t<span class="cloud-images__item__details__date">' + item.crdate + '</span>\n\t\t\t\t\t\t  </div>\n\t\t\t\t\t\t  <div class="cloud-images__item__actions">\n\t\t\t\t\t\t\t\t<a class="fa fa-pencil"></a>\n\t\t\t\t\t\t  </div>';
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
},{"./caller":8,"./dom":10,"./pagination-helper":13,"./store":15}],10:[function(require,module,exports){
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
},{}],11:[function(require,module,exports){
var dom = require('./dom');

var defaultHideIn = 5000;
var lastIndex = 1;
var numOfInfoBlocks = 10;

var infoBlocks = [];

var InfoController = {
	renderInfoBlocks: function renderInfoBlocks() {
		var blocksTemplate = function blocksTemplate(index) {
			return '\n\t\t\t\t <div class="bac--puresdk-info-box--" id="bac--puresdk-info-box--' + index + '">\n\t\t\t\t \t<div class="bac--timer" id="bac--timer' + index + '"></div>\n\t\t\t\t\t <div class="bac--inner-info-box--">\n\t\t\t\t\t \t\t<div class="bac--info-icon-- fa-success"></div>\n\t\t\t\t\t \t\t<div class="bac--info-icon-- fa-warning"></div>\n\t\t\t\t\t \t\t<div class="bac--info-icon-- fa-info-1"></div>\n\t\t\t\t\t \t\t<div class="bac--info-icon-- fa-error"></div>\n\t\t\t\t\t \t\t <div class="bac--info-main-text--" id="bac--info-main-text--' + index + '"></div>\n\t\t\t\t\t \t\t <div class="bac--info-close-button-- fa-close-1" id="bac--info-close-button--' + index + '"></div>\n\t\t\t\t\t</div>\n\t\t\t\t</div>\n\t\t  ';
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
},{"./dom":10}],12:[function(require,module,exports){
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
},{"./store.js":15}],13:[function(require,module,exports){
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
		var pageRange = [{ pageno: curpage, runningpage: true }];
		var hasnextonright = true;
		var hasnextonleft = true;
		var i = 1;
		while (pageRange.length < settings.totalPageButtonsNumber && (hasnextonright || hasnextonleft)) {
			if (hasnextonleft) {
				if (curpage - i > 0) {
					pageRange.push({ pageno: curpage - i, runningpage: false });
				} else {
					hasnextonleft = false;
				}
			}
			if (hasnextonright) {
				if (curpage + i - 1 < totalPagesOnResultSet) {
					pageRange.push({ pageno: curpage + i, runningpage: false });
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
},{}],14:[function(require,module,exports){
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
},{"./logger.js":12,"./store.js":15}],15:[function(require,module,exports){
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
	htmlTemplate: '',
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
		state.configuration.rootUrl = rootUrl.replace(/\/?$/, '/');;
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
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uLy4uL25vZGVfbW9kdWxlcy9icm93c2VyLXBhY2svX3ByZWx1ZGUuanMiLCIuLi8uLi9ub2RlX21vZHVsZXMvYXNhcC9icm93c2VyLXJhdy5qcyIsIi4uLy4uL25vZGVfbW9kdWxlcy9wcm9taXNlL2xpYi9jb3JlLmpzIiwiLi4vLi4vbm9kZV9tb2R1bGVzL3Byb21pc2UvbGliL2VzNi1leHRlbnNpb25zLmpzIiwiLi4vLi4vbm9kZV9tb2R1bGVzL3Byb21pc2UvbGliL3JlamVjdGlvbi10cmFja2luZy5qcyIsIlBQQkEuanMiLCJpbmRleC5qcyIsIm1vZHVsZXMvYXZhdGFyLWNvbnRyb2xsZXIuanMiLCJtb2R1bGVzL2NhbGxlci5qcyIsIm1vZHVsZXMvY2xvdWRpbmFyeS1pbWFnZS1waWNrZXIuanMiLCJtb2R1bGVzL2RvbS5qcyIsIm1vZHVsZXMvaW5mby1jb250cm9sbGVyLmpzIiwibW9kdWxlcy9sb2dnZXIuanMiLCJtb2R1bGVzL3BhZ2luYXRpb24taGVscGVyLmpzIiwibW9kdWxlcy9wdWJzdWIuanMiLCJtb2R1bGVzL3N0b3JlLmpzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOztBQ0FBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7Ozs7QUMvTkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDck5BO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUMzR0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNoSEE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUM3WUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUM5Q0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3ZIQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ2pHQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNyUUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUN0QkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUM3R0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDckJBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUMvQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3JEQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQSIsImZpbGUiOiJnZW5lcmF0ZWQuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlc0NvbnRlbnQiOlsiKGZ1bmN0aW9uIGUodCxuLHIpe2Z1bmN0aW9uIHMobyx1KXtpZighbltvXSl7aWYoIXRbb10pe3ZhciBhPXR5cGVvZiByZXF1aXJlPT1cImZ1bmN0aW9uXCImJnJlcXVpcmU7aWYoIXUmJmEpcmV0dXJuIGEobywhMCk7aWYoaSlyZXR1cm4gaShvLCEwKTt2YXIgZj1uZXcgRXJyb3IoXCJDYW5ub3QgZmluZCBtb2R1bGUgJ1wiK28rXCInXCIpO3Rocm93IGYuY29kZT1cIk1PRFVMRV9OT1RfRk9VTkRcIixmfXZhciBsPW5bb109e2V4cG9ydHM6e319O3Rbb11bMF0uY2FsbChsLmV4cG9ydHMsZnVuY3Rpb24oZSl7dmFyIG49dFtvXVsxXVtlXTtyZXR1cm4gcyhuP246ZSl9LGwsbC5leHBvcnRzLGUsdCxuLHIpfXJldHVybiBuW29dLmV4cG9ydHN9dmFyIGk9dHlwZW9mIHJlcXVpcmU9PVwiZnVuY3Rpb25cIiYmcmVxdWlyZTtmb3IodmFyIG89MDtvPHIubGVuZ3RoO28rKylzKHJbb10pO3JldHVybiBzfSkiLCJcInVzZSBzdHJpY3RcIjtcblxuLy8gVXNlIHRoZSBmYXN0ZXN0IG1lYW5zIHBvc3NpYmxlIHRvIGV4ZWN1dGUgYSB0YXNrIGluIGl0cyBvd24gdHVybiwgd2l0aFxuLy8gcHJpb3JpdHkgb3ZlciBvdGhlciBldmVudHMgaW5jbHVkaW5nIElPLCBhbmltYXRpb24sIHJlZmxvdywgYW5kIHJlZHJhd1xuLy8gZXZlbnRzIGluIGJyb3dzZXJzLlxuLy9cbi8vIEFuIGV4Y2VwdGlvbiB0aHJvd24gYnkgYSB0YXNrIHdpbGwgcGVybWFuZW50bHkgaW50ZXJydXB0IHRoZSBwcm9jZXNzaW5nIG9mXG4vLyBzdWJzZXF1ZW50IHRhc2tzLiBUaGUgaGlnaGVyIGxldmVsIGBhc2FwYCBmdW5jdGlvbiBlbnN1cmVzIHRoYXQgaWYgYW5cbi8vIGV4Y2VwdGlvbiBpcyB0aHJvd24gYnkgYSB0YXNrLCB0aGF0IHRoZSB0YXNrIHF1ZXVlIHdpbGwgY29udGludWUgZmx1c2hpbmcgYXNcbi8vIHNvb24gYXMgcG9zc2libGUsIGJ1dCBpZiB5b3UgdXNlIGByYXdBc2FwYCBkaXJlY3RseSwgeW91IGFyZSByZXNwb25zaWJsZSB0b1xuLy8gZWl0aGVyIGVuc3VyZSB0aGF0IG5vIGV4Y2VwdGlvbnMgYXJlIHRocm93biBmcm9tIHlvdXIgdGFzaywgb3IgdG8gbWFudWFsbHlcbi8vIGNhbGwgYHJhd0FzYXAucmVxdWVzdEZsdXNoYCBpZiBhbiBleGNlcHRpb24gaXMgdGhyb3duLlxubW9kdWxlLmV4cG9ydHMgPSByYXdBc2FwO1xuZnVuY3Rpb24gcmF3QXNhcCh0YXNrKSB7XG4gICAgaWYgKCFxdWV1ZS5sZW5ndGgpIHtcbiAgICAgICAgcmVxdWVzdEZsdXNoKCk7XG4gICAgICAgIGZsdXNoaW5nID0gdHJ1ZTtcbiAgICB9XG4gICAgLy8gRXF1aXZhbGVudCB0byBwdXNoLCBidXQgYXZvaWRzIGEgZnVuY3Rpb24gY2FsbC5cbiAgICBxdWV1ZVtxdWV1ZS5sZW5ndGhdID0gdGFzaztcbn1cblxudmFyIHF1ZXVlID0gW107XG4vLyBPbmNlIGEgZmx1c2ggaGFzIGJlZW4gcmVxdWVzdGVkLCBubyBmdXJ0aGVyIGNhbGxzIHRvIGByZXF1ZXN0Rmx1c2hgIGFyZVxuLy8gbmVjZXNzYXJ5IHVudGlsIHRoZSBuZXh0IGBmbHVzaGAgY29tcGxldGVzLlxudmFyIGZsdXNoaW5nID0gZmFsc2U7XG4vLyBgcmVxdWVzdEZsdXNoYCBpcyBhbiBpbXBsZW1lbnRhdGlvbi1zcGVjaWZpYyBtZXRob2QgdGhhdCBhdHRlbXB0cyB0byBraWNrXG4vLyBvZmYgYSBgZmx1c2hgIGV2ZW50IGFzIHF1aWNrbHkgYXMgcG9zc2libGUuIGBmbHVzaGAgd2lsbCBhdHRlbXB0IHRvIGV4aGF1c3Rcbi8vIHRoZSBldmVudCBxdWV1ZSBiZWZvcmUgeWllbGRpbmcgdG8gdGhlIGJyb3dzZXIncyBvd24gZXZlbnQgbG9vcC5cbnZhciByZXF1ZXN0Rmx1c2g7XG4vLyBUaGUgcG9zaXRpb24gb2YgdGhlIG5leHQgdGFzayB0byBleGVjdXRlIGluIHRoZSB0YXNrIHF1ZXVlLiBUaGlzIGlzXG4vLyBwcmVzZXJ2ZWQgYmV0d2VlbiBjYWxscyB0byBgZmx1c2hgIHNvIHRoYXQgaXQgY2FuIGJlIHJlc3VtZWQgaWZcbi8vIGEgdGFzayB0aHJvd3MgYW4gZXhjZXB0aW9uLlxudmFyIGluZGV4ID0gMDtcbi8vIElmIGEgdGFzayBzY2hlZHVsZXMgYWRkaXRpb25hbCB0YXNrcyByZWN1cnNpdmVseSwgdGhlIHRhc2sgcXVldWUgY2FuIGdyb3dcbi8vIHVuYm91bmRlZC4gVG8gcHJldmVudCBtZW1vcnkgZXhoYXVzdGlvbiwgdGhlIHRhc2sgcXVldWUgd2lsbCBwZXJpb2RpY2FsbHlcbi8vIHRydW5jYXRlIGFscmVhZHktY29tcGxldGVkIHRhc2tzLlxudmFyIGNhcGFjaXR5ID0gMTAyNDtcblxuLy8gVGhlIGZsdXNoIGZ1bmN0aW9uIHByb2Nlc3NlcyBhbGwgdGFza3MgdGhhdCBoYXZlIGJlZW4gc2NoZWR1bGVkIHdpdGhcbi8vIGByYXdBc2FwYCB1bmxlc3MgYW5kIHVudGlsIG9uZSBvZiB0aG9zZSB0YXNrcyB0aHJvd3MgYW4gZXhjZXB0aW9uLlxuLy8gSWYgYSB0YXNrIHRocm93cyBhbiBleGNlcHRpb24sIGBmbHVzaGAgZW5zdXJlcyB0aGF0IGl0cyBzdGF0ZSB3aWxsIHJlbWFpblxuLy8gY29uc2lzdGVudCBhbmQgd2lsbCByZXN1bWUgd2hlcmUgaXQgbGVmdCBvZmYgd2hlbiBjYWxsZWQgYWdhaW4uXG4vLyBIb3dldmVyLCBgZmx1c2hgIGRvZXMgbm90IG1ha2UgYW55IGFycmFuZ2VtZW50cyB0byBiZSBjYWxsZWQgYWdhaW4gaWYgYW5cbi8vIGV4Y2VwdGlvbiBpcyB0aHJvd24uXG5mdW5jdGlvbiBmbHVzaCgpIHtcbiAgICB3aGlsZSAoaW5kZXggPCBxdWV1ZS5sZW5ndGgpIHtcbiAgICAgICAgdmFyIGN1cnJlbnRJbmRleCA9IGluZGV4O1xuICAgICAgICAvLyBBZHZhbmNlIHRoZSBpbmRleCBiZWZvcmUgY2FsbGluZyB0aGUgdGFzay4gVGhpcyBlbnN1cmVzIHRoYXQgd2Ugd2lsbFxuICAgICAgICAvLyBiZWdpbiBmbHVzaGluZyBvbiB0aGUgbmV4dCB0YXNrIHRoZSB0YXNrIHRocm93cyBhbiBlcnJvci5cbiAgICAgICAgaW5kZXggPSBpbmRleCArIDE7XG4gICAgICAgIHF1ZXVlW2N1cnJlbnRJbmRleF0uY2FsbCgpO1xuICAgICAgICAvLyBQcmV2ZW50IGxlYWtpbmcgbWVtb3J5IGZvciBsb25nIGNoYWlucyBvZiByZWN1cnNpdmUgY2FsbHMgdG8gYGFzYXBgLlxuICAgICAgICAvLyBJZiB3ZSBjYWxsIGBhc2FwYCB3aXRoaW4gdGFza3Mgc2NoZWR1bGVkIGJ5IGBhc2FwYCwgdGhlIHF1ZXVlIHdpbGxcbiAgICAgICAgLy8gZ3JvdywgYnV0IHRvIGF2b2lkIGFuIE8obikgd2FsayBmb3IgZXZlcnkgdGFzayB3ZSBleGVjdXRlLCB3ZSBkb24ndFxuICAgICAgICAvLyBzaGlmdCB0YXNrcyBvZmYgdGhlIHF1ZXVlIGFmdGVyIHRoZXkgaGF2ZSBiZWVuIGV4ZWN1dGVkLlxuICAgICAgICAvLyBJbnN0ZWFkLCB3ZSBwZXJpb2RpY2FsbHkgc2hpZnQgMTAyNCB0YXNrcyBvZmYgdGhlIHF1ZXVlLlxuICAgICAgICBpZiAoaW5kZXggPiBjYXBhY2l0eSkge1xuICAgICAgICAgICAgLy8gTWFudWFsbHkgc2hpZnQgYWxsIHZhbHVlcyBzdGFydGluZyBhdCB0aGUgaW5kZXggYmFjayB0byB0aGVcbiAgICAgICAgICAgIC8vIGJlZ2lubmluZyBvZiB0aGUgcXVldWUuXG4gICAgICAgICAgICBmb3IgKHZhciBzY2FuID0gMCwgbmV3TGVuZ3RoID0gcXVldWUubGVuZ3RoIC0gaW5kZXg7IHNjYW4gPCBuZXdMZW5ndGg7IHNjYW4rKykge1xuICAgICAgICAgICAgICAgIHF1ZXVlW3NjYW5dID0gcXVldWVbc2NhbiArIGluZGV4XTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIHF1ZXVlLmxlbmd0aCAtPSBpbmRleDtcbiAgICAgICAgICAgIGluZGV4ID0gMDtcbiAgICAgICAgfVxuICAgIH1cbiAgICBxdWV1ZS5sZW5ndGggPSAwO1xuICAgIGluZGV4ID0gMDtcbiAgICBmbHVzaGluZyA9IGZhbHNlO1xufVxuXG4vLyBgcmVxdWVzdEZsdXNoYCBpcyBpbXBsZW1lbnRlZCB1c2luZyBhIHN0cmF0ZWd5IGJhc2VkIG9uIGRhdGEgY29sbGVjdGVkIGZyb21cbi8vIGV2ZXJ5IGF2YWlsYWJsZSBTYXVjZUxhYnMgU2VsZW5pdW0gd2ViIGRyaXZlciB3b3JrZXIgYXQgdGltZSBvZiB3cml0aW5nLlxuLy8gaHR0cHM6Ly9kb2NzLmdvb2dsZS5jb20vc3ByZWFkc2hlZXRzL2QvMW1HLTVVWUd1cDVxeEdkRU1Xa2hQNkJXQ3owNTNOVWIyRTFRb1VUVTE2dUEvZWRpdCNnaWQ9NzgzNzI0NTkzXG5cbi8vIFNhZmFyaSA2IGFuZCA2LjEgZm9yIGRlc2t0b3AsIGlQYWQsIGFuZCBpUGhvbmUgYXJlIHRoZSBvbmx5IGJyb3dzZXJzIHRoYXRcbi8vIGhhdmUgV2ViS2l0TXV0YXRpb25PYnNlcnZlciBidXQgbm90IHVuLXByZWZpeGVkIE11dGF0aW9uT2JzZXJ2ZXIuXG4vLyBNdXN0IHVzZSBgZ2xvYmFsYCBvciBgc2VsZmAgaW5zdGVhZCBvZiBgd2luZG93YCB0byB3b3JrIGluIGJvdGggZnJhbWVzIGFuZCB3ZWJcbi8vIHdvcmtlcnMuIGBnbG9iYWxgIGlzIGEgcHJvdmlzaW9uIG9mIEJyb3dzZXJpZnksIE1yLCBNcnMsIG9yIE1vcC5cblxuLyogZ2xvYmFscyBzZWxmICovXG52YXIgc2NvcGUgPSB0eXBlb2YgZ2xvYmFsICE9PSBcInVuZGVmaW5lZFwiID8gZ2xvYmFsIDogc2VsZjtcbnZhciBCcm93c2VyTXV0YXRpb25PYnNlcnZlciA9IHNjb3BlLk11dGF0aW9uT2JzZXJ2ZXIgfHwgc2NvcGUuV2ViS2l0TXV0YXRpb25PYnNlcnZlcjtcblxuLy8gTXV0YXRpb25PYnNlcnZlcnMgYXJlIGRlc2lyYWJsZSBiZWNhdXNlIHRoZXkgaGF2ZSBoaWdoIHByaW9yaXR5IGFuZCB3b3JrXG4vLyByZWxpYWJseSBldmVyeXdoZXJlIHRoZXkgYXJlIGltcGxlbWVudGVkLlxuLy8gVGhleSBhcmUgaW1wbGVtZW50ZWQgaW4gYWxsIG1vZGVybiBicm93c2Vycy5cbi8vXG4vLyAtIEFuZHJvaWQgNC00LjNcbi8vIC0gQ2hyb21lIDI2LTM0XG4vLyAtIEZpcmVmb3ggMTQtMjlcbi8vIC0gSW50ZXJuZXQgRXhwbG9yZXIgMTFcbi8vIC0gaVBhZCBTYWZhcmkgNi03LjFcbi8vIC0gaVBob25lIFNhZmFyaSA3LTcuMVxuLy8gLSBTYWZhcmkgNi03XG5pZiAodHlwZW9mIEJyb3dzZXJNdXRhdGlvbk9ic2VydmVyID09PSBcImZ1bmN0aW9uXCIpIHtcbiAgICByZXF1ZXN0Rmx1c2ggPSBtYWtlUmVxdWVzdENhbGxGcm9tTXV0YXRpb25PYnNlcnZlcihmbHVzaCk7XG5cbi8vIE1lc3NhZ2VDaGFubmVscyBhcmUgZGVzaXJhYmxlIGJlY2F1c2UgdGhleSBnaXZlIGRpcmVjdCBhY2Nlc3MgdG8gdGhlIEhUTUxcbi8vIHRhc2sgcXVldWUsIGFyZSBpbXBsZW1lbnRlZCBpbiBJbnRlcm5ldCBFeHBsb3JlciAxMCwgU2FmYXJpIDUuMC0xLCBhbmQgT3BlcmFcbi8vIDExLTEyLCBhbmQgaW4gd2ViIHdvcmtlcnMgaW4gbWFueSBlbmdpbmVzLlxuLy8gQWx0aG91Z2ggbWVzc2FnZSBjaGFubmVscyB5aWVsZCB0byBhbnkgcXVldWVkIHJlbmRlcmluZyBhbmQgSU8gdGFza3MsIHRoZXlcbi8vIHdvdWxkIGJlIGJldHRlciB0aGFuIGltcG9zaW5nIHRoZSA0bXMgZGVsYXkgb2YgdGltZXJzLlxuLy8gSG93ZXZlciwgdGhleSBkbyBub3Qgd29yayByZWxpYWJseSBpbiBJbnRlcm5ldCBFeHBsb3JlciBvciBTYWZhcmkuXG5cbi8vIEludGVybmV0IEV4cGxvcmVyIDEwIGlzIHRoZSBvbmx5IGJyb3dzZXIgdGhhdCBoYXMgc2V0SW1tZWRpYXRlIGJ1dCBkb2VzXG4vLyBub3QgaGF2ZSBNdXRhdGlvbk9ic2VydmVycy5cbi8vIEFsdGhvdWdoIHNldEltbWVkaWF0ZSB5aWVsZHMgdG8gdGhlIGJyb3dzZXIncyByZW5kZXJlciwgaXQgd291bGQgYmVcbi8vIHByZWZlcnJhYmxlIHRvIGZhbGxpbmcgYmFjayB0byBzZXRUaW1lb3V0IHNpbmNlIGl0IGRvZXMgbm90IGhhdmVcbi8vIHRoZSBtaW5pbXVtIDRtcyBwZW5hbHR5LlxuLy8gVW5mb3J0dW5hdGVseSB0aGVyZSBhcHBlYXJzIHRvIGJlIGEgYnVnIGluIEludGVybmV0IEV4cGxvcmVyIDEwIE1vYmlsZSAoYW5kXG4vLyBEZXNrdG9wIHRvIGEgbGVzc2VyIGV4dGVudCkgdGhhdCByZW5kZXJzIGJvdGggc2V0SW1tZWRpYXRlIGFuZFxuLy8gTWVzc2FnZUNoYW5uZWwgdXNlbGVzcyBmb3IgdGhlIHB1cnBvc2VzIG9mIEFTQVAuXG4vLyBodHRwczovL2dpdGh1Yi5jb20va3Jpc2tvd2FsL3EvaXNzdWVzLzM5NlxuXG4vLyBUaW1lcnMgYXJlIGltcGxlbWVudGVkIHVuaXZlcnNhbGx5LlxuLy8gV2UgZmFsbCBiYWNrIHRvIHRpbWVycyBpbiB3b3JrZXJzIGluIG1vc3QgZW5naW5lcywgYW5kIGluIGZvcmVncm91bmRcbi8vIGNvbnRleHRzIGluIHRoZSBmb2xsb3dpbmcgYnJvd3NlcnMuXG4vLyBIb3dldmVyLCBub3RlIHRoYXQgZXZlbiB0aGlzIHNpbXBsZSBjYXNlIHJlcXVpcmVzIG51YW5jZXMgdG8gb3BlcmF0ZSBpbiBhXG4vLyBicm9hZCBzcGVjdHJ1bSBvZiBicm93c2Vycy5cbi8vXG4vLyAtIEZpcmVmb3ggMy0xM1xuLy8gLSBJbnRlcm5ldCBFeHBsb3JlciA2LTlcbi8vIC0gaVBhZCBTYWZhcmkgNC4zXG4vLyAtIEx5bnggMi44Ljdcbn0gZWxzZSB7XG4gICAgcmVxdWVzdEZsdXNoID0gbWFrZVJlcXVlc3RDYWxsRnJvbVRpbWVyKGZsdXNoKTtcbn1cblxuLy8gYHJlcXVlc3RGbHVzaGAgcmVxdWVzdHMgdGhhdCB0aGUgaGlnaCBwcmlvcml0eSBldmVudCBxdWV1ZSBiZSBmbHVzaGVkIGFzXG4vLyBzb29uIGFzIHBvc3NpYmxlLlxuLy8gVGhpcyBpcyB1c2VmdWwgdG8gcHJldmVudCBhbiBlcnJvciB0aHJvd24gaW4gYSB0YXNrIGZyb20gc3RhbGxpbmcgdGhlIGV2ZW50XG4vLyBxdWV1ZSBpZiB0aGUgZXhjZXB0aW9uIGhhbmRsZWQgYnkgTm9kZS5qc+KAmXNcbi8vIGBwcm9jZXNzLm9uKFwidW5jYXVnaHRFeGNlcHRpb25cIilgIG9yIGJ5IGEgZG9tYWluLlxucmF3QXNhcC5yZXF1ZXN0Rmx1c2ggPSByZXF1ZXN0Rmx1c2g7XG5cbi8vIFRvIHJlcXVlc3QgYSBoaWdoIHByaW9yaXR5IGV2ZW50LCB3ZSBpbmR1Y2UgYSBtdXRhdGlvbiBvYnNlcnZlciBieSB0b2dnbGluZ1xuLy8gdGhlIHRleHQgb2YgYSB0ZXh0IG5vZGUgYmV0d2VlbiBcIjFcIiBhbmQgXCItMVwiLlxuZnVuY3Rpb24gbWFrZVJlcXVlc3RDYWxsRnJvbU11dGF0aW9uT2JzZXJ2ZXIoY2FsbGJhY2spIHtcbiAgICB2YXIgdG9nZ2xlID0gMTtcbiAgICB2YXIgb2JzZXJ2ZXIgPSBuZXcgQnJvd3Nlck11dGF0aW9uT2JzZXJ2ZXIoY2FsbGJhY2spO1xuICAgIHZhciBub2RlID0gZG9jdW1lbnQuY3JlYXRlVGV4dE5vZGUoXCJcIik7XG4gICAgb2JzZXJ2ZXIub2JzZXJ2ZShub2RlLCB7Y2hhcmFjdGVyRGF0YTogdHJ1ZX0pO1xuICAgIHJldHVybiBmdW5jdGlvbiByZXF1ZXN0Q2FsbCgpIHtcbiAgICAgICAgdG9nZ2xlID0gLXRvZ2dsZTtcbiAgICAgICAgbm9kZS5kYXRhID0gdG9nZ2xlO1xuICAgIH07XG59XG5cbi8vIFRoZSBtZXNzYWdlIGNoYW5uZWwgdGVjaG5pcXVlIHdhcyBkaXNjb3ZlcmVkIGJ5IE1hbHRlIFVibCBhbmQgd2FzIHRoZVxuLy8gb3JpZ2luYWwgZm91bmRhdGlvbiBmb3IgdGhpcyBsaWJyYXJ5LlxuLy8gaHR0cDovL3d3dy5ub25ibG9ja2luZy5pby8yMDExLzA2L3dpbmRvd25leHR0aWNrLmh0bWxcblxuLy8gU2FmYXJpIDYuMC41IChhdCBsZWFzdCkgaW50ZXJtaXR0ZW50bHkgZmFpbHMgdG8gY3JlYXRlIG1lc3NhZ2UgcG9ydHMgb24gYVxuLy8gcGFnZSdzIGZpcnN0IGxvYWQuIFRoYW5rZnVsbHksIHRoaXMgdmVyc2lvbiBvZiBTYWZhcmkgc3VwcG9ydHNcbi8vIE11dGF0aW9uT2JzZXJ2ZXJzLCBzbyB3ZSBkb24ndCBuZWVkIHRvIGZhbGwgYmFjayBpbiB0aGF0IGNhc2UuXG5cbi8vIGZ1bmN0aW9uIG1ha2VSZXF1ZXN0Q2FsbEZyb21NZXNzYWdlQ2hhbm5lbChjYWxsYmFjaykge1xuLy8gICAgIHZhciBjaGFubmVsID0gbmV3IE1lc3NhZ2VDaGFubmVsKCk7XG4vLyAgICAgY2hhbm5lbC5wb3J0MS5vbm1lc3NhZ2UgPSBjYWxsYmFjaztcbi8vICAgICByZXR1cm4gZnVuY3Rpb24gcmVxdWVzdENhbGwoKSB7XG4vLyAgICAgICAgIGNoYW5uZWwucG9ydDIucG9zdE1lc3NhZ2UoMCk7XG4vLyAgICAgfTtcbi8vIH1cblxuLy8gRm9yIHJlYXNvbnMgZXhwbGFpbmVkIGFib3ZlLCB3ZSBhcmUgYWxzbyB1bmFibGUgdG8gdXNlIGBzZXRJbW1lZGlhdGVgXG4vLyB1bmRlciBhbnkgY2lyY3Vtc3RhbmNlcy5cbi8vIEV2ZW4gaWYgd2Ugd2VyZSwgdGhlcmUgaXMgYW5vdGhlciBidWcgaW4gSW50ZXJuZXQgRXhwbG9yZXIgMTAuXG4vLyBJdCBpcyBub3Qgc3VmZmljaWVudCB0byBhc3NpZ24gYHNldEltbWVkaWF0ZWAgdG8gYHJlcXVlc3RGbHVzaGAgYmVjYXVzZVxuLy8gYHNldEltbWVkaWF0ZWAgbXVzdCBiZSBjYWxsZWQgKmJ5IG5hbWUqIGFuZCB0aGVyZWZvcmUgbXVzdCBiZSB3cmFwcGVkIGluIGFcbi8vIGNsb3N1cmUuXG4vLyBOZXZlciBmb3JnZXQuXG5cbi8vIGZ1bmN0aW9uIG1ha2VSZXF1ZXN0Q2FsbEZyb21TZXRJbW1lZGlhdGUoY2FsbGJhY2spIHtcbi8vICAgICByZXR1cm4gZnVuY3Rpb24gcmVxdWVzdENhbGwoKSB7XG4vLyAgICAgICAgIHNldEltbWVkaWF0ZShjYWxsYmFjayk7XG4vLyAgICAgfTtcbi8vIH1cblxuLy8gU2FmYXJpIDYuMCBoYXMgYSBwcm9ibGVtIHdoZXJlIHRpbWVycyB3aWxsIGdldCBsb3N0IHdoaWxlIHRoZSB1c2VyIGlzXG4vLyBzY3JvbGxpbmcuIFRoaXMgcHJvYmxlbSBkb2VzIG5vdCBpbXBhY3QgQVNBUCBiZWNhdXNlIFNhZmFyaSA2LjAgc3VwcG9ydHNcbi8vIG11dGF0aW9uIG9ic2VydmVycywgc28gdGhhdCBpbXBsZW1lbnRhdGlvbiBpcyB1c2VkIGluc3RlYWQuXG4vLyBIb3dldmVyLCBpZiB3ZSBldmVyIGVsZWN0IHRvIHVzZSB0aW1lcnMgaW4gU2FmYXJpLCB0aGUgcHJldmFsZW50IHdvcmstYXJvdW5kXG4vLyBpcyB0byBhZGQgYSBzY3JvbGwgZXZlbnQgbGlzdGVuZXIgdGhhdCBjYWxscyBmb3IgYSBmbHVzaC5cblxuLy8gYHNldFRpbWVvdXRgIGRvZXMgbm90IGNhbGwgdGhlIHBhc3NlZCBjYWxsYmFjayBpZiB0aGUgZGVsYXkgaXMgbGVzcyB0aGFuXG4vLyBhcHByb3hpbWF0ZWx5IDcgaW4gd2ViIHdvcmtlcnMgaW4gRmlyZWZveCA4IHRocm91Z2ggMTgsIGFuZCBzb21ldGltZXMgbm90XG4vLyBldmVuIHRoZW4uXG5cbmZ1bmN0aW9uIG1ha2VSZXF1ZXN0Q2FsbEZyb21UaW1lcihjYWxsYmFjaykge1xuICAgIHJldHVybiBmdW5jdGlvbiByZXF1ZXN0Q2FsbCgpIHtcbiAgICAgICAgLy8gV2UgZGlzcGF0Y2ggYSB0aW1lb3V0IHdpdGggYSBzcGVjaWZpZWQgZGVsYXkgb2YgMCBmb3IgZW5naW5lcyB0aGF0XG4gICAgICAgIC8vIGNhbiByZWxpYWJseSBhY2NvbW1vZGF0ZSB0aGF0IHJlcXVlc3QuIFRoaXMgd2lsbCB1c3VhbGx5IGJlIHNuYXBwZWRcbiAgICAgICAgLy8gdG8gYSA0IG1pbGlzZWNvbmQgZGVsYXksIGJ1dCBvbmNlIHdlJ3JlIGZsdXNoaW5nLCB0aGVyZSdzIG5vIGRlbGF5XG4gICAgICAgIC8vIGJldHdlZW4gZXZlbnRzLlxuICAgICAgICB2YXIgdGltZW91dEhhbmRsZSA9IHNldFRpbWVvdXQoaGFuZGxlVGltZXIsIDApO1xuICAgICAgICAvLyBIb3dldmVyLCBzaW5jZSB0aGlzIHRpbWVyIGdldHMgZnJlcXVlbnRseSBkcm9wcGVkIGluIEZpcmVmb3hcbiAgICAgICAgLy8gd29ya2Vycywgd2UgZW5saXN0IGFuIGludGVydmFsIGhhbmRsZSB0aGF0IHdpbGwgdHJ5IHRvIGZpcmVcbiAgICAgICAgLy8gYW4gZXZlbnQgMjAgdGltZXMgcGVyIHNlY29uZCB1bnRpbCBpdCBzdWNjZWVkcy5cbiAgICAgICAgdmFyIGludGVydmFsSGFuZGxlID0gc2V0SW50ZXJ2YWwoaGFuZGxlVGltZXIsIDUwKTtcblxuICAgICAgICBmdW5jdGlvbiBoYW5kbGVUaW1lcigpIHtcbiAgICAgICAgICAgIC8vIFdoaWNoZXZlciB0aW1lciBzdWNjZWVkcyB3aWxsIGNhbmNlbCBib3RoIHRpbWVycyBhbmRcbiAgICAgICAgICAgIC8vIGV4ZWN1dGUgdGhlIGNhbGxiYWNrLlxuICAgICAgICAgICAgY2xlYXJUaW1lb3V0KHRpbWVvdXRIYW5kbGUpO1xuICAgICAgICAgICAgY2xlYXJJbnRlcnZhbChpbnRlcnZhbEhhbmRsZSk7XG4gICAgICAgICAgICBjYWxsYmFjaygpO1xuICAgICAgICB9XG4gICAgfTtcbn1cblxuLy8gVGhpcyBpcyBmb3IgYGFzYXAuanNgIG9ubHkuXG4vLyBJdHMgbmFtZSB3aWxsIGJlIHBlcmlvZGljYWxseSByYW5kb21pemVkIHRvIGJyZWFrIGFueSBjb2RlIHRoYXQgZGVwZW5kcyBvblxuLy8gaXRzIGV4aXN0ZW5jZS5cbnJhd0FzYXAubWFrZVJlcXVlc3RDYWxsRnJvbVRpbWVyID0gbWFrZVJlcXVlc3RDYWxsRnJvbVRpbWVyO1xuXG4vLyBBU0FQIHdhcyBvcmlnaW5hbGx5IGEgbmV4dFRpY2sgc2hpbSBpbmNsdWRlZCBpbiBRLiBUaGlzIHdhcyBmYWN0b3JlZCBvdXRcbi8vIGludG8gdGhpcyBBU0FQIHBhY2thZ2UuIEl0IHdhcyBsYXRlciBhZGFwdGVkIHRvIFJTVlAgd2hpY2ggbWFkZSBmdXJ0aGVyXG4vLyBhbWVuZG1lbnRzLiBUaGVzZSBkZWNpc2lvbnMsIHBhcnRpY3VsYXJseSB0byBtYXJnaW5hbGl6ZSBNZXNzYWdlQ2hhbm5lbCBhbmRcbi8vIHRvIGNhcHR1cmUgdGhlIE11dGF0aW9uT2JzZXJ2ZXIgaW1wbGVtZW50YXRpb24gaW4gYSBjbG9zdXJlLCB3ZXJlIGludGVncmF0ZWRcbi8vIGJhY2sgaW50byBBU0FQIHByb3Blci5cbi8vIGh0dHBzOi8vZ2l0aHViLmNvbS90aWxkZWlvL3JzdnAuanMvYmxvYi9jZGRmNzIzMjU0NmE5Y2Y4NTg1MjRiNzVjZGU2ZjllZGY3MjYyMGE3L2xpYi9yc3ZwL2FzYXAuanNcbiIsIid1c2Ugc3RyaWN0JztcblxudmFyIGFzYXAgPSByZXF1aXJlKCdhc2FwL3JhdycpO1xuXG5mdW5jdGlvbiBub29wKCkge31cblxuLy8gU3RhdGVzOlxuLy9cbi8vIDAgLSBwZW5kaW5nXG4vLyAxIC0gZnVsZmlsbGVkIHdpdGggX3ZhbHVlXG4vLyAyIC0gcmVqZWN0ZWQgd2l0aCBfdmFsdWVcbi8vIDMgLSBhZG9wdGVkIHRoZSBzdGF0ZSBvZiBhbm90aGVyIHByb21pc2UsIF92YWx1ZVxuLy9cbi8vIG9uY2UgdGhlIHN0YXRlIGlzIG5vIGxvbmdlciBwZW5kaW5nICgwKSBpdCBpcyBpbW11dGFibGVcblxuLy8gQWxsIGBfYCBwcmVmaXhlZCBwcm9wZXJ0aWVzIHdpbGwgYmUgcmVkdWNlZCB0byBgX3tyYW5kb20gbnVtYmVyfWBcbi8vIGF0IGJ1aWxkIHRpbWUgdG8gb2JmdXNjYXRlIHRoZW0gYW5kIGRpc2NvdXJhZ2UgdGhlaXIgdXNlLlxuLy8gV2UgZG9uJ3QgdXNlIHN5bWJvbHMgb3IgT2JqZWN0LmRlZmluZVByb3BlcnR5IHRvIGZ1bGx5IGhpZGUgdGhlbVxuLy8gYmVjYXVzZSB0aGUgcGVyZm9ybWFuY2UgaXNuJ3QgZ29vZCBlbm91Z2guXG5cblxuLy8gdG8gYXZvaWQgdXNpbmcgdHJ5L2NhdGNoIGluc2lkZSBjcml0aWNhbCBmdW5jdGlvbnMsIHdlXG4vLyBleHRyYWN0IHRoZW0gdG8gaGVyZS5cbnZhciBMQVNUX0VSUk9SID0gbnVsbDtcbnZhciBJU19FUlJPUiA9IHt9O1xuZnVuY3Rpb24gZ2V0VGhlbihvYmopIHtcbiAgdHJ5IHtcbiAgICByZXR1cm4gb2JqLnRoZW47XG4gIH0gY2F0Y2ggKGV4KSB7XG4gICAgTEFTVF9FUlJPUiA9IGV4O1xuICAgIHJldHVybiBJU19FUlJPUjtcbiAgfVxufVxuXG5mdW5jdGlvbiB0cnlDYWxsT25lKGZuLCBhKSB7XG4gIHRyeSB7XG4gICAgcmV0dXJuIGZuKGEpO1xuICB9IGNhdGNoIChleCkge1xuICAgIExBU1RfRVJST1IgPSBleDtcbiAgICByZXR1cm4gSVNfRVJST1I7XG4gIH1cbn1cbmZ1bmN0aW9uIHRyeUNhbGxUd28oZm4sIGEsIGIpIHtcbiAgdHJ5IHtcbiAgICBmbihhLCBiKTtcbiAgfSBjYXRjaCAoZXgpIHtcbiAgICBMQVNUX0VSUk9SID0gZXg7XG4gICAgcmV0dXJuIElTX0VSUk9SO1xuICB9XG59XG5cbm1vZHVsZS5leHBvcnRzID0gUHJvbWlzZTtcblxuZnVuY3Rpb24gUHJvbWlzZShmbikge1xuICBpZiAodHlwZW9mIHRoaXMgIT09ICdvYmplY3QnKSB7XG4gICAgdGhyb3cgbmV3IFR5cGVFcnJvcignUHJvbWlzZXMgbXVzdCBiZSBjb25zdHJ1Y3RlZCB2aWEgbmV3Jyk7XG4gIH1cbiAgaWYgKHR5cGVvZiBmbiAhPT0gJ2Z1bmN0aW9uJykge1xuICAgIHRocm93IG5ldyBUeXBlRXJyb3IoJ1Byb21pc2UgY29uc3RydWN0b3JcXCdzIGFyZ3VtZW50IGlzIG5vdCBhIGZ1bmN0aW9uJyk7XG4gIH1cbiAgdGhpcy5fNzUgPSAwO1xuICB0aGlzLl84MyA9IDA7XG4gIHRoaXMuXzE4ID0gbnVsbDtcbiAgdGhpcy5fMzggPSBudWxsO1xuICBpZiAoZm4gPT09IG5vb3ApIHJldHVybjtcbiAgZG9SZXNvbHZlKGZuLCB0aGlzKTtcbn1cblByb21pc2UuXzQ3ID0gbnVsbDtcblByb21pc2UuXzcxID0gbnVsbDtcblByb21pc2UuXzQ0ID0gbm9vcDtcblxuUHJvbWlzZS5wcm90b3R5cGUudGhlbiA9IGZ1bmN0aW9uKG9uRnVsZmlsbGVkLCBvblJlamVjdGVkKSB7XG4gIGlmICh0aGlzLmNvbnN0cnVjdG9yICE9PSBQcm9taXNlKSB7XG4gICAgcmV0dXJuIHNhZmVUaGVuKHRoaXMsIG9uRnVsZmlsbGVkLCBvblJlamVjdGVkKTtcbiAgfVxuICB2YXIgcmVzID0gbmV3IFByb21pc2Uobm9vcCk7XG4gIGhhbmRsZSh0aGlzLCBuZXcgSGFuZGxlcihvbkZ1bGZpbGxlZCwgb25SZWplY3RlZCwgcmVzKSk7XG4gIHJldHVybiByZXM7XG59O1xuXG5mdW5jdGlvbiBzYWZlVGhlbihzZWxmLCBvbkZ1bGZpbGxlZCwgb25SZWplY3RlZCkge1xuICByZXR1cm4gbmV3IHNlbGYuY29uc3RydWN0b3IoZnVuY3Rpb24gKHJlc29sdmUsIHJlamVjdCkge1xuICAgIHZhciByZXMgPSBuZXcgUHJvbWlzZShub29wKTtcbiAgICByZXMudGhlbihyZXNvbHZlLCByZWplY3QpO1xuICAgIGhhbmRsZShzZWxmLCBuZXcgSGFuZGxlcihvbkZ1bGZpbGxlZCwgb25SZWplY3RlZCwgcmVzKSk7XG4gIH0pO1xufVxuZnVuY3Rpb24gaGFuZGxlKHNlbGYsIGRlZmVycmVkKSB7XG4gIHdoaWxlIChzZWxmLl84MyA9PT0gMykge1xuICAgIHNlbGYgPSBzZWxmLl8xODtcbiAgfVxuICBpZiAoUHJvbWlzZS5fNDcpIHtcbiAgICBQcm9taXNlLl80NyhzZWxmKTtcbiAgfVxuICBpZiAoc2VsZi5fODMgPT09IDApIHtcbiAgICBpZiAoc2VsZi5fNzUgPT09IDApIHtcbiAgICAgIHNlbGYuXzc1ID0gMTtcbiAgICAgIHNlbGYuXzM4ID0gZGVmZXJyZWQ7XG4gICAgICByZXR1cm47XG4gICAgfVxuICAgIGlmIChzZWxmLl83NSA9PT0gMSkge1xuICAgICAgc2VsZi5fNzUgPSAyO1xuICAgICAgc2VsZi5fMzggPSBbc2VsZi5fMzgsIGRlZmVycmVkXTtcbiAgICAgIHJldHVybjtcbiAgICB9XG4gICAgc2VsZi5fMzgucHVzaChkZWZlcnJlZCk7XG4gICAgcmV0dXJuO1xuICB9XG4gIGhhbmRsZVJlc29sdmVkKHNlbGYsIGRlZmVycmVkKTtcbn1cblxuZnVuY3Rpb24gaGFuZGxlUmVzb2x2ZWQoc2VsZiwgZGVmZXJyZWQpIHtcbiAgYXNhcChmdW5jdGlvbigpIHtcbiAgICB2YXIgY2IgPSBzZWxmLl84MyA9PT0gMSA/IGRlZmVycmVkLm9uRnVsZmlsbGVkIDogZGVmZXJyZWQub25SZWplY3RlZDtcbiAgICBpZiAoY2IgPT09IG51bGwpIHtcbiAgICAgIGlmIChzZWxmLl84MyA9PT0gMSkge1xuICAgICAgICByZXNvbHZlKGRlZmVycmVkLnByb21pc2UsIHNlbGYuXzE4KTtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIHJlamVjdChkZWZlcnJlZC5wcm9taXNlLCBzZWxmLl8xOCk7XG4gICAgICB9XG4gICAgICByZXR1cm47XG4gICAgfVxuICAgIHZhciByZXQgPSB0cnlDYWxsT25lKGNiLCBzZWxmLl8xOCk7XG4gICAgaWYgKHJldCA9PT0gSVNfRVJST1IpIHtcbiAgICAgIHJlamVjdChkZWZlcnJlZC5wcm9taXNlLCBMQVNUX0VSUk9SKTtcbiAgICB9IGVsc2Uge1xuICAgICAgcmVzb2x2ZShkZWZlcnJlZC5wcm9taXNlLCByZXQpO1xuICAgIH1cbiAgfSk7XG59XG5mdW5jdGlvbiByZXNvbHZlKHNlbGYsIG5ld1ZhbHVlKSB7XG4gIC8vIFByb21pc2UgUmVzb2x1dGlvbiBQcm9jZWR1cmU6IGh0dHBzOi8vZ2l0aHViLmNvbS9wcm9taXNlcy1hcGx1cy9wcm9taXNlcy1zcGVjI3RoZS1wcm9taXNlLXJlc29sdXRpb24tcHJvY2VkdXJlXG4gIGlmIChuZXdWYWx1ZSA9PT0gc2VsZikge1xuICAgIHJldHVybiByZWplY3QoXG4gICAgICBzZWxmLFxuICAgICAgbmV3IFR5cGVFcnJvcignQSBwcm9taXNlIGNhbm5vdCBiZSByZXNvbHZlZCB3aXRoIGl0c2VsZi4nKVxuICAgICk7XG4gIH1cbiAgaWYgKFxuICAgIG5ld1ZhbHVlICYmXG4gICAgKHR5cGVvZiBuZXdWYWx1ZSA9PT0gJ29iamVjdCcgfHwgdHlwZW9mIG5ld1ZhbHVlID09PSAnZnVuY3Rpb24nKVxuICApIHtcbiAgICB2YXIgdGhlbiA9IGdldFRoZW4obmV3VmFsdWUpO1xuICAgIGlmICh0aGVuID09PSBJU19FUlJPUikge1xuICAgICAgcmV0dXJuIHJlamVjdChzZWxmLCBMQVNUX0VSUk9SKTtcbiAgICB9XG4gICAgaWYgKFxuICAgICAgdGhlbiA9PT0gc2VsZi50aGVuICYmXG4gICAgICBuZXdWYWx1ZSBpbnN0YW5jZW9mIFByb21pc2VcbiAgICApIHtcbiAgICAgIHNlbGYuXzgzID0gMztcbiAgICAgIHNlbGYuXzE4ID0gbmV3VmFsdWU7XG4gICAgICBmaW5hbGUoc2VsZik7XG4gICAgICByZXR1cm47XG4gICAgfSBlbHNlIGlmICh0eXBlb2YgdGhlbiA9PT0gJ2Z1bmN0aW9uJykge1xuICAgICAgZG9SZXNvbHZlKHRoZW4uYmluZChuZXdWYWx1ZSksIHNlbGYpO1xuICAgICAgcmV0dXJuO1xuICAgIH1cbiAgfVxuICBzZWxmLl84MyA9IDE7XG4gIHNlbGYuXzE4ID0gbmV3VmFsdWU7XG4gIGZpbmFsZShzZWxmKTtcbn1cblxuZnVuY3Rpb24gcmVqZWN0KHNlbGYsIG5ld1ZhbHVlKSB7XG4gIHNlbGYuXzgzID0gMjtcbiAgc2VsZi5fMTggPSBuZXdWYWx1ZTtcbiAgaWYgKFByb21pc2UuXzcxKSB7XG4gICAgUHJvbWlzZS5fNzEoc2VsZiwgbmV3VmFsdWUpO1xuICB9XG4gIGZpbmFsZShzZWxmKTtcbn1cbmZ1bmN0aW9uIGZpbmFsZShzZWxmKSB7XG4gIGlmIChzZWxmLl83NSA9PT0gMSkge1xuICAgIGhhbmRsZShzZWxmLCBzZWxmLl8zOCk7XG4gICAgc2VsZi5fMzggPSBudWxsO1xuICB9XG4gIGlmIChzZWxmLl83NSA9PT0gMikge1xuICAgIGZvciAodmFyIGkgPSAwOyBpIDwgc2VsZi5fMzgubGVuZ3RoOyBpKyspIHtcbiAgICAgIGhhbmRsZShzZWxmLCBzZWxmLl8zOFtpXSk7XG4gICAgfVxuICAgIHNlbGYuXzM4ID0gbnVsbDtcbiAgfVxufVxuXG5mdW5jdGlvbiBIYW5kbGVyKG9uRnVsZmlsbGVkLCBvblJlamVjdGVkLCBwcm9taXNlKXtcbiAgdGhpcy5vbkZ1bGZpbGxlZCA9IHR5cGVvZiBvbkZ1bGZpbGxlZCA9PT0gJ2Z1bmN0aW9uJyA/IG9uRnVsZmlsbGVkIDogbnVsbDtcbiAgdGhpcy5vblJlamVjdGVkID0gdHlwZW9mIG9uUmVqZWN0ZWQgPT09ICdmdW5jdGlvbicgPyBvblJlamVjdGVkIDogbnVsbDtcbiAgdGhpcy5wcm9taXNlID0gcHJvbWlzZTtcbn1cblxuLyoqXG4gKiBUYWtlIGEgcG90ZW50aWFsbHkgbWlzYmVoYXZpbmcgcmVzb2x2ZXIgZnVuY3Rpb24gYW5kIG1ha2Ugc3VyZVxuICogb25GdWxmaWxsZWQgYW5kIG9uUmVqZWN0ZWQgYXJlIG9ubHkgY2FsbGVkIG9uY2UuXG4gKlxuICogTWFrZXMgbm8gZ3VhcmFudGVlcyBhYm91dCBhc3luY2hyb255LlxuICovXG5mdW5jdGlvbiBkb1Jlc29sdmUoZm4sIHByb21pc2UpIHtcbiAgdmFyIGRvbmUgPSBmYWxzZTtcbiAgdmFyIHJlcyA9IHRyeUNhbGxUd28oZm4sIGZ1bmN0aW9uICh2YWx1ZSkge1xuICAgIGlmIChkb25lKSByZXR1cm47XG4gICAgZG9uZSA9IHRydWU7XG4gICAgcmVzb2x2ZShwcm9taXNlLCB2YWx1ZSk7XG4gIH0sIGZ1bmN0aW9uIChyZWFzb24pIHtcbiAgICBpZiAoZG9uZSkgcmV0dXJuO1xuICAgIGRvbmUgPSB0cnVlO1xuICAgIHJlamVjdChwcm9taXNlLCByZWFzb24pO1xuICB9KTtcbiAgaWYgKCFkb25lICYmIHJlcyA9PT0gSVNfRVJST1IpIHtcbiAgICBkb25lID0gdHJ1ZTtcbiAgICByZWplY3QocHJvbWlzZSwgTEFTVF9FUlJPUik7XG4gIH1cbn1cbiIsIid1c2Ugc3RyaWN0JztcblxuLy9UaGlzIGZpbGUgY29udGFpbnMgdGhlIEVTNiBleHRlbnNpb25zIHRvIHRoZSBjb3JlIFByb21pc2VzL0ErIEFQSVxuXG52YXIgUHJvbWlzZSA9IHJlcXVpcmUoJy4vY29yZS5qcycpO1xuXG5tb2R1bGUuZXhwb3J0cyA9IFByb21pc2U7XG5cbi8qIFN0YXRpYyBGdW5jdGlvbnMgKi9cblxudmFyIFRSVUUgPSB2YWx1ZVByb21pc2UodHJ1ZSk7XG52YXIgRkFMU0UgPSB2YWx1ZVByb21pc2UoZmFsc2UpO1xudmFyIE5VTEwgPSB2YWx1ZVByb21pc2UobnVsbCk7XG52YXIgVU5ERUZJTkVEID0gdmFsdWVQcm9taXNlKHVuZGVmaW5lZCk7XG52YXIgWkVSTyA9IHZhbHVlUHJvbWlzZSgwKTtcbnZhciBFTVBUWVNUUklORyA9IHZhbHVlUHJvbWlzZSgnJyk7XG5cbmZ1bmN0aW9uIHZhbHVlUHJvbWlzZSh2YWx1ZSkge1xuICB2YXIgcCA9IG5ldyBQcm9taXNlKFByb21pc2UuXzQ0KTtcbiAgcC5fODMgPSAxO1xuICBwLl8xOCA9IHZhbHVlO1xuICByZXR1cm4gcDtcbn1cblByb21pc2UucmVzb2x2ZSA9IGZ1bmN0aW9uICh2YWx1ZSkge1xuICBpZiAodmFsdWUgaW5zdGFuY2VvZiBQcm9taXNlKSByZXR1cm4gdmFsdWU7XG5cbiAgaWYgKHZhbHVlID09PSBudWxsKSByZXR1cm4gTlVMTDtcbiAgaWYgKHZhbHVlID09PSB1bmRlZmluZWQpIHJldHVybiBVTkRFRklORUQ7XG4gIGlmICh2YWx1ZSA9PT0gdHJ1ZSkgcmV0dXJuIFRSVUU7XG4gIGlmICh2YWx1ZSA9PT0gZmFsc2UpIHJldHVybiBGQUxTRTtcbiAgaWYgKHZhbHVlID09PSAwKSByZXR1cm4gWkVSTztcbiAgaWYgKHZhbHVlID09PSAnJykgcmV0dXJuIEVNUFRZU1RSSU5HO1xuXG4gIGlmICh0eXBlb2YgdmFsdWUgPT09ICdvYmplY3QnIHx8IHR5cGVvZiB2YWx1ZSA9PT0gJ2Z1bmN0aW9uJykge1xuICAgIHRyeSB7XG4gICAgICB2YXIgdGhlbiA9IHZhbHVlLnRoZW47XG4gICAgICBpZiAodHlwZW9mIHRoZW4gPT09ICdmdW5jdGlvbicpIHtcbiAgICAgICAgcmV0dXJuIG5ldyBQcm9taXNlKHRoZW4uYmluZCh2YWx1ZSkpO1xuICAgICAgfVxuICAgIH0gY2F0Y2ggKGV4KSB7XG4gICAgICByZXR1cm4gbmV3IFByb21pc2UoZnVuY3Rpb24gKHJlc29sdmUsIHJlamVjdCkge1xuICAgICAgICByZWplY3QoZXgpO1xuICAgICAgfSk7XG4gICAgfVxuICB9XG4gIHJldHVybiB2YWx1ZVByb21pc2UodmFsdWUpO1xufTtcblxuUHJvbWlzZS5hbGwgPSBmdW5jdGlvbiAoYXJyKSB7XG4gIHZhciBhcmdzID0gQXJyYXkucHJvdG90eXBlLnNsaWNlLmNhbGwoYXJyKTtcblxuICByZXR1cm4gbmV3IFByb21pc2UoZnVuY3Rpb24gKHJlc29sdmUsIHJlamVjdCkge1xuICAgIGlmIChhcmdzLmxlbmd0aCA9PT0gMCkgcmV0dXJuIHJlc29sdmUoW10pO1xuICAgIHZhciByZW1haW5pbmcgPSBhcmdzLmxlbmd0aDtcbiAgICBmdW5jdGlvbiByZXMoaSwgdmFsKSB7XG4gICAgICBpZiAodmFsICYmICh0eXBlb2YgdmFsID09PSAnb2JqZWN0JyB8fCB0eXBlb2YgdmFsID09PSAnZnVuY3Rpb24nKSkge1xuICAgICAgICBpZiAodmFsIGluc3RhbmNlb2YgUHJvbWlzZSAmJiB2YWwudGhlbiA9PT0gUHJvbWlzZS5wcm90b3R5cGUudGhlbikge1xuICAgICAgICAgIHdoaWxlICh2YWwuXzgzID09PSAzKSB7XG4gICAgICAgICAgICB2YWwgPSB2YWwuXzE4O1xuICAgICAgICAgIH1cbiAgICAgICAgICBpZiAodmFsLl84MyA9PT0gMSkgcmV0dXJuIHJlcyhpLCB2YWwuXzE4KTtcbiAgICAgICAgICBpZiAodmFsLl84MyA9PT0gMikgcmVqZWN0KHZhbC5fMTgpO1xuICAgICAgICAgIHZhbC50aGVuKGZ1bmN0aW9uICh2YWwpIHtcbiAgICAgICAgICAgIHJlcyhpLCB2YWwpO1xuICAgICAgICAgIH0sIHJlamVjdCk7XG4gICAgICAgICAgcmV0dXJuO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgIHZhciB0aGVuID0gdmFsLnRoZW47XG4gICAgICAgICAgaWYgKHR5cGVvZiB0aGVuID09PSAnZnVuY3Rpb24nKSB7XG4gICAgICAgICAgICB2YXIgcCA9IG5ldyBQcm9taXNlKHRoZW4uYmluZCh2YWwpKTtcbiAgICAgICAgICAgIHAudGhlbihmdW5jdGlvbiAodmFsKSB7XG4gICAgICAgICAgICAgIHJlcyhpLCB2YWwpO1xuICAgICAgICAgICAgfSwgcmVqZWN0KTtcbiAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICAgIGFyZ3NbaV0gPSB2YWw7XG4gICAgICBpZiAoLS1yZW1haW5pbmcgPT09IDApIHtcbiAgICAgICAgcmVzb2x2ZShhcmdzKTtcbiAgICAgIH1cbiAgICB9XG4gICAgZm9yICh2YXIgaSA9IDA7IGkgPCBhcmdzLmxlbmd0aDsgaSsrKSB7XG4gICAgICByZXMoaSwgYXJnc1tpXSk7XG4gICAgfVxuICB9KTtcbn07XG5cblByb21pc2UucmVqZWN0ID0gZnVuY3Rpb24gKHZhbHVlKSB7XG4gIHJldHVybiBuZXcgUHJvbWlzZShmdW5jdGlvbiAocmVzb2x2ZSwgcmVqZWN0KSB7XG4gICAgcmVqZWN0KHZhbHVlKTtcbiAgfSk7XG59O1xuXG5Qcm9taXNlLnJhY2UgPSBmdW5jdGlvbiAodmFsdWVzKSB7XG4gIHJldHVybiBuZXcgUHJvbWlzZShmdW5jdGlvbiAocmVzb2x2ZSwgcmVqZWN0KSB7XG4gICAgdmFsdWVzLmZvckVhY2goZnVuY3Rpb24odmFsdWUpe1xuICAgICAgUHJvbWlzZS5yZXNvbHZlKHZhbHVlKS50aGVuKHJlc29sdmUsIHJlamVjdCk7XG4gICAgfSk7XG4gIH0pO1xufTtcblxuLyogUHJvdG90eXBlIE1ldGhvZHMgKi9cblxuUHJvbWlzZS5wcm90b3R5cGVbJ2NhdGNoJ10gPSBmdW5jdGlvbiAob25SZWplY3RlZCkge1xuICByZXR1cm4gdGhpcy50aGVuKG51bGwsIG9uUmVqZWN0ZWQpO1xufTtcbiIsIid1c2Ugc3RyaWN0JztcblxudmFyIFByb21pc2UgPSByZXF1aXJlKCcuL2NvcmUnKTtcblxudmFyIERFRkFVTFRfV0hJVEVMSVNUID0gW1xuICBSZWZlcmVuY2VFcnJvcixcbiAgVHlwZUVycm9yLFxuICBSYW5nZUVycm9yXG5dO1xuXG52YXIgZW5hYmxlZCA9IGZhbHNlO1xuZXhwb3J0cy5kaXNhYmxlID0gZGlzYWJsZTtcbmZ1bmN0aW9uIGRpc2FibGUoKSB7XG4gIGVuYWJsZWQgPSBmYWxzZTtcbiAgUHJvbWlzZS5fNDcgPSBudWxsO1xuICBQcm9taXNlLl83MSA9IG51bGw7XG59XG5cbmV4cG9ydHMuZW5hYmxlID0gZW5hYmxlO1xuZnVuY3Rpb24gZW5hYmxlKG9wdGlvbnMpIHtcbiAgb3B0aW9ucyA9IG9wdGlvbnMgfHwge307XG4gIGlmIChlbmFibGVkKSBkaXNhYmxlKCk7XG4gIGVuYWJsZWQgPSB0cnVlO1xuICB2YXIgaWQgPSAwO1xuICB2YXIgZGlzcGxheUlkID0gMDtcbiAgdmFyIHJlamVjdGlvbnMgPSB7fTtcbiAgUHJvbWlzZS5fNDcgPSBmdW5jdGlvbiAocHJvbWlzZSkge1xuICAgIGlmIChcbiAgICAgIHByb21pc2UuXzgzID09PSAyICYmIC8vIElTIFJFSkVDVEVEXG4gICAgICByZWplY3Rpb25zW3Byb21pc2UuXzU2XVxuICAgICkge1xuICAgICAgaWYgKHJlamVjdGlvbnNbcHJvbWlzZS5fNTZdLmxvZ2dlZCkge1xuICAgICAgICBvbkhhbmRsZWQocHJvbWlzZS5fNTYpO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgY2xlYXJUaW1lb3V0KHJlamVjdGlvbnNbcHJvbWlzZS5fNTZdLnRpbWVvdXQpO1xuICAgICAgfVxuICAgICAgZGVsZXRlIHJlamVjdGlvbnNbcHJvbWlzZS5fNTZdO1xuICAgIH1cbiAgfTtcbiAgUHJvbWlzZS5fNzEgPSBmdW5jdGlvbiAocHJvbWlzZSwgZXJyKSB7XG4gICAgaWYgKHByb21pc2UuXzc1ID09PSAwKSB7IC8vIG5vdCB5ZXQgaGFuZGxlZFxuICAgICAgcHJvbWlzZS5fNTYgPSBpZCsrO1xuICAgICAgcmVqZWN0aW9uc1twcm9taXNlLl81Nl0gPSB7XG4gICAgICAgIGRpc3BsYXlJZDogbnVsbCxcbiAgICAgICAgZXJyb3I6IGVycixcbiAgICAgICAgdGltZW91dDogc2V0VGltZW91dChcbiAgICAgICAgICBvblVuaGFuZGxlZC5iaW5kKG51bGwsIHByb21pc2UuXzU2KSxcbiAgICAgICAgICAvLyBGb3IgcmVmZXJlbmNlIGVycm9ycyBhbmQgdHlwZSBlcnJvcnMsIHRoaXMgYWxtb3N0IGFsd2F5c1xuICAgICAgICAgIC8vIG1lYW5zIHRoZSBwcm9ncmFtbWVyIG1hZGUgYSBtaXN0YWtlLCBzbyBsb2cgdGhlbSBhZnRlciBqdXN0XG4gICAgICAgICAgLy8gMTAwbXNcbiAgICAgICAgICAvLyBvdGhlcndpc2UsIHdhaXQgMiBzZWNvbmRzIHRvIHNlZSBpZiB0aGV5IGdldCBoYW5kbGVkXG4gICAgICAgICAgbWF0Y2hXaGl0ZWxpc3QoZXJyLCBERUZBVUxUX1dISVRFTElTVClcbiAgICAgICAgICAgID8gMTAwXG4gICAgICAgICAgICA6IDIwMDBcbiAgICAgICAgKSxcbiAgICAgICAgbG9nZ2VkOiBmYWxzZVxuICAgICAgfTtcbiAgICB9XG4gIH07XG4gIGZ1bmN0aW9uIG9uVW5oYW5kbGVkKGlkKSB7XG4gICAgaWYgKFxuICAgICAgb3B0aW9ucy5hbGxSZWplY3Rpb25zIHx8XG4gICAgICBtYXRjaFdoaXRlbGlzdChcbiAgICAgICAgcmVqZWN0aW9uc1tpZF0uZXJyb3IsXG4gICAgICAgIG9wdGlvbnMud2hpdGVsaXN0IHx8IERFRkFVTFRfV0hJVEVMSVNUXG4gICAgICApXG4gICAgKSB7XG4gICAgICByZWplY3Rpb25zW2lkXS5kaXNwbGF5SWQgPSBkaXNwbGF5SWQrKztcbiAgICAgIGlmIChvcHRpb25zLm9uVW5oYW5kbGVkKSB7XG4gICAgICAgIHJlamVjdGlvbnNbaWRdLmxvZ2dlZCA9IHRydWU7XG4gICAgICAgIG9wdGlvbnMub25VbmhhbmRsZWQoXG4gICAgICAgICAgcmVqZWN0aW9uc1tpZF0uZGlzcGxheUlkLFxuICAgICAgICAgIHJlamVjdGlvbnNbaWRdLmVycm9yXG4gICAgICAgICk7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICByZWplY3Rpb25zW2lkXS5sb2dnZWQgPSB0cnVlO1xuICAgICAgICBsb2dFcnJvcihcbiAgICAgICAgICByZWplY3Rpb25zW2lkXS5kaXNwbGF5SWQsXG4gICAgICAgICAgcmVqZWN0aW9uc1tpZF0uZXJyb3JcbiAgICAgICAgKTtcbiAgICAgIH1cbiAgICB9XG4gIH1cbiAgZnVuY3Rpb24gb25IYW5kbGVkKGlkKSB7XG4gICAgaWYgKHJlamVjdGlvbnNbaWRdLmxvZ2dlZCkge1xuICAgICAgaWYgKG9wdGlvbnMub25IYW5kbGVkKSB7XG4gICAgICAgIG9wdGlvbnMub25IYW5kbGVkKHJlamVjdGlvbnNbaWRdLmRpc3BsYXlJZCwgcmVqZWN0aW9uc1tpZF0uZXJyb3IpO1xuICAgICAgfSBlbHNlIGlmICghcmVqZWN0aW9uc1tpZF0ub25VbmhhbmRsZWQpIHtcbiAgICAgICAgY29uc29sZS53YXJuKFxuICAgICAgICAgICdQcm9taXNlIFJlamVjdGlvbiBIYW5kbGVkIChpZDogJyArIHJlamVjdGlvbnNbaWRdLmRpc3BsYXlJZCArICcpOidcbiAgICAgICAgKTtcbiAgICAgICAgY29uc29sZS53YXJuKFxuICAgICAgICAgICcgIFRoaXMgbWVhbnMgeW91IGNhbiBpZ25vcmUgYW55IHByZXZpb3VzIG1lc3NhZ2VzIG9mIHRoZSBmb3JtIFwiUG9zc2libGUgVW5oYW5kbGVkIFByb21pc2UgUmVqZWN0aW9uXCIgd2l0aCBpZCAnICtcbiAgICAgICAgICByZWplY3Rpb25zW2lkXS5kaXNwbGF5SWQgKyAnLidcbiAgICAgICAgKTtcbiAgICAgIH1cbiAgICB9XG4gIH1cbn1cblxuZnVuY3Rpb24gbG9nRXJyb3IoaWQsIGVycm9yKSB7XG4gIGNvbnNvbGUud2FybignUG9zc2libGUgVW5oYW5kbGVkIFByb21pc2UgUmVqZWN0aW9uIChpZDogJyArIGlkICsgJyk6Jyk7XG4gIHZhciBlcnJTdHIgPSAoZXJyb3IgJiYgKGVycm9yLnN0YWNrIHx8IGVycm9yKSkgKyAnJztcbiAgZXJyU3RyLnNwbGl0KCdcXG4nKS5mb3JFYWNoKGZ1bmN0aW9uIChsaW5lKSB7XG4gICAgY29uc29sZS53YXJuKCcgICcgKyBsaW5lKTtcbiAgfSk7XG59XG5cbmZ1bmN0aW9uIG1hdGNoV2hpdGVsaXN0KGVycm9yLCBsaXN0KSB7XG4gIHJldHVybiBsaXN0LnNvbWUoZnVuY3Rpb24gKGNscykge1xuICAgIHJldHVybiBlcnJvciBpbnN0YW5jZW9mIGNscztcbiAgfSk7XG59IiwidmFyIExvZ2dlciA9IHJlcXVpcmUoJy4vbW9kdWxlcy9sb2dnZXInKTtcbnZhciBQdWJTdWIgPSByZXF1aXJlKCcuL21vZHVsZXMvcHVic3ViJyk7XG52YXIgQ2FsbGVyID0gcmVxdWlyZSgnLi9tb2R1bGVzL2NhbGxlcicpO1xudmFyIERvbSA9IHJlcXVpcmUoJy4vbW9kdWxlcy9kb20nKTtcbnZhciBJbmZvQ29udHJvbGxlciA9IHJlcXVpcmUoJy4vbW9kdWxlcy9pbmZvLWNvbnRyb2xsZXInKTtcbnZhciBBdmF0YXJDb250cm9sbGVyID0gcmVxdWlyZSgnLi9tb2R1bGVzL2F2YXRhci1jb250cm9sbGVyJyk7XG52YXIgU3RvcmUgPSByZXF1aXJlKCcuL21vZHVsZXMvc3RvcmUnKTtcbnZhciBDbG91ZGluYXJ5ID0gcmVxdWlyZSgnLi9tb2R1bGVzL2Nsb3VkaW5hcnktaW1hZ2UtcGlja2VyJyk7XG52YXIgcHBiYUNvbmYgPSB7fTtcblxuaWYgKHR5cGVvZiBQcm9taXNlID09PSAndW5kZWZpbmVkJykge1xuXHRyZXF1aXJlKCdwcm9taXNlL2xpYi9yZWplY3Rpb24tdHJhY2tpbmcnKS5lbmFibGUoKTtcblx0d2luZG93LlByb21pc2UgPSByZXF1aXJlKCdwcm9taXNlL2xpYi9lczYtZXh0ZW5zaW9ucy5qcycpO1xufVxuXG52YXIgYWZ0ZXJSZW5kZXIgPSBmdW5jdGlvbiBhZnRlclJlbmRlcigpIHtcblx0aWYgKFN0b3JlLmdldEZ1bGxXaWR0aCgpID09PSB0cnVlKSB7XG5cdFx0RG9tLmFkZENsYXNzKGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKFwiYmFjLS1wdXJlc2RrLWJhYy0taGVhZGVyLWFwcHMtLVwiKSwgJ2JhYy0tZnVsbHdpZHRoJyk7XG5cdH1cblxuXHRkb2N1bWVudC5nZXRFbGVtZW50QnlJZCgnYmFjLS1wdXJlc2RrLS1hcHBzLS1vcGVuZXItLScpLmFkZEV2ZW50TGlzdGVuZXIoJ2NsaWNrJywgZnVuY3Rpb24gKGUpIHtcblx0XHRlLnByZXZlbnREZWZhdWx0KCk7XG5cdFx0ZS5zdG9wUHJvcGFnYXRpb24oKTtcblx0XHREb20udG9nZ2xlQ2xhc3MoZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoJ2JhYy0tcHVyZXNkay1hcHBzLWNvbnRhaW5lci0tJyksICdhY3RpdmUnKTtcblx0fSk7XG5cblx0ZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoJ2JhYy0tdXNlci1hdmF0YXItdG9wJykuYWRkRXZlbnRMaXN0ZW5lcignY2xpY2snLCBmdW5jdGlvbiAoZSkge1xuXHRcdGUuc3RvcFByb3BhZ2F0aW9uKCk7XG5cdFx0RG9tLnJlbW92ZUNsYXNzKGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKCdiYWMtLXB1cmVzZGstYXBwcy1jb250YWluZXItLScpLCAnYWN0aXZlJyk7XG5cdFx0RG9tLnRvZ2dsZUNsYXNzKGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKCdiYWMtLXB1cmVzZGstdXNlci1zaWRlYmFyLS0nKSwgJ2FjdGl2ZScpO1xuXHR9KTtcblxuXHR3aW5kb3cuYWRkRXZlbnRMaXN0ZW5lcignY2xpY2snLCBmdW5jdGlvbiAoZSkge1xuXHRcdERvbS5yZW1vdmVDbGFzcyhkb2N1bWVudC5nZXRFbGVtZW50QnlJZCgnYmFjLS1wdXJlc2RrLWFwcHMtY29udGFpbmVyLS0nKSwgJ2FjdGl2ZScpO1xuXHRcdERvbS5yZW1vdmVDbGFzcyhkb2N1bWVudC5nZXRFbGVtZW50QnlJZCgnYmFjLS1wdXJlc2RrLXVzZXItc2lkZWJhci0tJyksICdhY3RpdmUnKTtcblx0fSk7XG5cblx0QXZhdGFyQ29udHJvbGxlci5pbml0KCk7XG5cdHZhciB1c2VyRGF0YSA9IFN0b3JlLmdldFVzZXJEYXRhKCk7XG5cdEF2YXRhckNvbnRyb2xsZXIuc2V0QXZhdGFyKHVzZXJEYXRhLnVzZXIuYXZhdGFyX3VybCk7XG5cblx0SW5mb0NvbnRyb2xsZXIuaW5pdCgpO1xufTtcblxudmFyIFBQQkEgPSB7XG5cdHNldFdpbmRvd05hbWU6IGZ1bmN0aW9uIHNldFdpbmRvd05hbWUod24pIHtcblx0XHRTdG9yZS5zZXRXaW5kb3dOYW1lKHduKTtcblx0fSxcblxuXHRzZXRDb25maWd1cmF0aW9uOiBmdW5jdGlvbiBzZXRDb25maWd1cmF0aW9uKGNvbmYpIHtcblx0XHRTdG9yZS5zZXRDb25maWd1cmF0aW9uKGNvbmYpO1xuXHR9LFxuXG5cdHNldEhUTUxUZW1wbGF0ZTogZnVuY3Rpb24gc2V0SFRNTFRlbXBsYXRlKHRlbXBsYXRlKSB7XG5cdFx0U3RvcmUuc2V0SFRNTFRlbXBsYXRlKHRlbXBsYXRlKTtcblx0fSxcblxuXHRzZXRWZXJzaW9uTnVtYmVyOiBmdW5jdGlvbiBzZXRWZXJzaW9uTnVtYmVyKHZlcnNpb24pIHtcblx0XHRTdG9yZS5zZXRWZXJzaW9uTnVtYmVyKHZlcnNpb24pO1xuXHR9LFxuXG5cdGluaXQ6IGZ1bmN0aW9uIGluaXQoY29uZikge1xuXHRcdExvZ2dlci5sb2coJ2luaXRpYWxpemluZyB3aXRoIGNvbmY6ICcsIGNvbmYpO1xuXHRcdGlmIChjb25mKSB7XG5cdFx0XHRpZiAoY29uZi5oZWFkZXJEaXZJZCkge1xuXHRcdFx0XHRTdG9yZS5zZXRIVE1MQ29udGFpbmVyKGNvbmYuaGVhZGVyRGl2SWQpO1xuXHRcdFx0fVxuXHRcdFx0aWYgKGNvbmYuYXBwc1Zpc2libGUgIT09IG51bGwpIHtcblx0XHRcdFx0U3RvcmUuc2V0QXBwc1Zpc2libGUoY29uZi5hcHBzVmlzaWJsZSk7XG5cdFx0XHR9XG5cdFx0XHRpZiAoY29uZi5yb290VXJsKSB7XG5cdFx0XHRcdFN0b3JlLnNldFJvb3RVcmwoY29uZi5yb290VXJsKTtcblx0XHRcdH1cblx0XHRcdGlmIChjb25mLmRldiA9PT0gdHJ1ZSkge1xuXHRcdFx0XHRpZiAoY29uZi5kZXZLZXlzKSB7XG5cdFx0XHRcdFx0Q2FsbGVyLnNldERldktleXMoY29uZi5kZXZLZXlzKTtcblx0XHRcdFx0XHRTdG9yZS5zZXREZXYodHJ1ZSk7XG5cdFx0XHRcdH1cblx0XHRcdH1cblx0XHRcdGlmIChjb25mLmZ1bGxXaWR0aCkge1xuXHRcdFx0XHRTdG9yZS5zZXRGdWxsV2lkdGgoY29uZi5mdWxsV2lkdGgpO1xuXHRcdFx0fVxuXHRcdFx0aWYgKGNvbmYuZGlzcGxheVN1cHBvcnQpIHtcblx0XHRcdFx0U3RvcmUuc2V0RGlzcGxheVN1cHBvcnQoY29uZi5kaXNwbGF5U3VwcG9ydCk7XG5cdFx0XHR9XG5cdFx0XHRpZiAoY29uZi5hcHBJbmZvKSB7XG5cdFx0XHRcdFN0b3JlLnNldEFwcEluZm8oY29uZi5hcHBJbmZvKTtcblx0XHRcdFx0Ly8gaWYgZ29vZ2xlIHRhZyBtYW5hZ2VyIGlzIHByZXNlbnQgaXQgd2lsbCBwdXNoIHRoZSB1c2VyJ3MgaW5mbyB0byBkYXRhTGF5ZXJcblx0XHRcdFx0dHJ5IHtcblx0XHRcdFx0XHRkYXRhTGF5ZXIucHVzaCh7XG5cdFx0XHRcdFx0XHQnYXBwJzogY29uZi5hcHBJbmZvLm5hbWVcblx0XHRcdFx0XHR9KTtcblx0XHRcdFx0fSBjYXRjaCAoZSkge1xuXHRcdFx0XHRcdC8vIG5vIEdvb2dsZSBUYWcgaGFzIGJlZW4gc2V0XG5cdFx0XHRcdH1cblx0XHRcdH1cblxuXHRcdFx0Lyogb3B0aW9uYWwgc2Vzc2lvbiB1cmwgKi9cblx0XHRcdGlmIChjb25mLnNlc3Npb25FbmRwb2ludCkge1xuXHRcdFx0XHRTdG9yZS5zZXRTZXNzaW9uRW5kcG9pbnQoY29uZi5zZXNzaW9uRW5kcG9pbnQpO1xuXHRcdFx0fVxuXG5cdFx0XHRpZiAoY29uZi5hcGlSb290Rm9sZGVyKSB7XG5cdFx0XHRcdFN0b3JlLnNldFVybFZlcnNpb25QcmVmaXgoY29uZi5hcGlSb290Rm9sZGVyKTtcblx0XHRcdH1cblx0XHR9XG5cdFx0cHBiYUNvbmYgPSBjb25mO1xuXHRcdHJldHVybiB0cnVlO1xuXHR9LFxuXG5cdHNldHVwR29vZ2xlVGFnOiBmdW5jdGlvbiBzZXR1cEdvb2dsZVRhZyh1c2VyKSB7XG5cdFx0Ly8gaWYgZ29vZ2xlIHRhZyBtYW5hZ2VyIGlzIHByZXNlbnQgaXQgd2lsbCBwdXNoIHRoZSB1c2VyJ3MgaW5mbyB0byBkYXRhTGF5ZXJcblx0XHR0cnkge1xuXHRcdFx0ZGF0YUxheWVyLnB1c2goe1xuXHRcdFx0XHQndXNlcklkJzogdXNlci5pZCxcblx0XHRcdFx0J3VzZXInOiB1c2VyLmZpcnN0bmFtZSArICcgJyArIHVzZXIubGFzdG5hbWUsXG5cdFx0XHRcdCd0ZW5hbnRfaWQnOiB1c2VyLnRlbmFudF9pZCxcblx0XHRcdFx0J3VzZXJUeXBlJzogdXNlci51c2VyX3R5cGUsXG5cdFx0XHRcdCdhY2NvdW50SWQnOiB1c2VyLmFjY291bnRfaWQsXG5cdFx0XHRcdCdhY2NvdW50TmFtZSc6IHVzZXIuYWNjb3VudC5uYW1lXG5cdFx0XHR9KTtcblx0XHR9IGNhdGNoIChlKSB7XG5cdFx0XHQvLyBubyBHb29nbGUgVGFnIGhhcyBiZWVuIHNldFxuXHRcdH1cblx0fSxcblxuXG5cdGF1dGhlbnRpY2F0ZTogZnVuY3Rpb24gYXV0aGVudGljYXRlKF9zdWNjZXNzKSB7XG5cdFx0dmFyIHNlbGYgPSBQUEJBO1xuXHRcdENhbGxlci5tYWtlQ2FsbCh7XG5cdFx0XHR0eXBlOiAnR0VUJyxcblx0XHRcdGVuZHBvaW50OiBTdG9yZS5nZXRBdXRoZW50aWNhdGlvbkVuZHBvaW50KCksXG5cdFx0XHRjYWxsYmFja3M6IHtcblx0XHRcdFx0c3VjY2VzczogZnVuY3Rpb24gc3VjY2VzcyhyZXN1bHQpIHtcblx0XHRcdFx0XHQvLyBMb2dnZXIubG9nKHJlc3VsdCk7XG5cdFx0XHRcdFx0U3RvcmUuc2V0VXNlckRhdGEocmVzdWx0KTtcblx0XHRcdFx0XHRzZWxmLnJlbmRlcigpO1xuXHRcdFx0XHRcdFBQQkEuZ2V0QXBwcygpO1xuXHRcdFx0XHRcdFBQQkEuc2V0dXBHb29nbGVUYWcocmVzdWx0LnVzZXIpO1xuXHRcdFx0XHRcdF9zdWNjZXNzKHJlc3VsdCk7XG5cdFx0XHRcdH0sXG5cdFx0XHRcdGZhaWw6IGZ1bmN0aW9uIGZhaWwoZXJyKSB7XG5cdFx0XHRcdFx0d2luZG93LmxvY2F0aW9uLmhyZWYgPSBTdG9yZS5nZXRMb2dpblVybCgpO1xuXHRcdFx0XHR9XG5cdFx0XHR9XG5cdFx0fSk7XG5cdH0sXG5cblx0YXV0aGVudGljYXRlUHJvbWlzZTogZnVuY3Rpb24gYXV0aGVudGljYXRlUHJvbWlzZSgpIHtcblx0XHR2YXIgc2VsZiA9IFBQQkE7XG5cdFx0cmV0dXJuIENhbGxlci5wcm9taXNlQ2FsbCh7XG5cdFx0XHR0eXBlOiAnR0VUJyxcblx0XHRcdGVuZHBvaW50OiBTdG9yZS5nZXRBdXRoZW50aWNhdGlvbkVuZHBvaW50KCksXG5cdFx0XHRtaWRkbGV3YXJlczoge1xuXHRcdFx0XHRzdWNjZXNzOiBmdW5jdGlvbiBzdWNjZXNzKHJlc3VsdCkge1xuXHRcdFx0XHRcdC8vIExvZ2dlci5sb2cocmVzdWx0KTtcblx0XHRcdFx0XHRTdG9yZS5zZXRVc2VyRGF0YShyZXN1bHQpO1xuXHRcdFx0XHRcdHNlbGYucmVuZGVyKCk7XG5cdFx0XHRcdFx0UFBCQS5nZXRBcHBzKCk7XG5cdFx0XHRcdFx0UFBCQS5zZXR1cEdvb2dsZVRhZyhyZXN1bHQudXNlcik7XG5cdFx0XHRcdH1cblx0XHRcdH1cblx0XHR9KTtcblx0fSxcblxuXHRnZXRBcHBzOiBmdW5jdGlvbiBnZXRBcHBzKCkge1xuXHRcdENhbGxlci5tYWtlQ2FsbCh7XG5cdFx0XHR0eXBlOiAnR0VUJyxcblx0XHRcdGVuZHBvaW50OiBTdG9yZS5nZXRBcHBzRW5kcG9pbnQoKSxcblx0XHRcdGNhbGxiYWNrczoge1xuXHRcdFx0XHRzdWNjZXNzOiBmdW5jdGlvbiBzdWNjZXNzKHJlc3VsdCkge1xuXHRcdFx0XHRcdFN0b3JlLnNldEFwcHMocmVzdWx0KTtcblx0XHRcdFx0XHRQUEJBLnJlbmRlckFwcHMocmVzdWx0LmFwcHMpO1xuXHRcdFx0XHR9LFxuXHRcdFx0XHRmYWlsOiBmdW5jdGlvbiBmYWlsKGVycikge1xuXHRcdFx0XHRcdHdpbmRvdy5sb2NhdGlvbi5ocmVmID0gU3RvcmUuZ2V0TG9naW5VcmwoKTtcblx0XHRcdFx0fVxuXHRcdFx0fVxuXHRcdH0pO1xuXHR9LFxuXG5cdGdldEF2YWlsYWJsZUxpc3RlbmVyczogZnVuY3Rpb24gZ2V0QXZhaWxhYmxlTGlzdGVuZXJzKCkge1xuXHRcdHJldHVybiBQdWJTdWIuZ2V0QXZhaWxhYmxlTGlzdGVuZXJzKCk7XG5cdH0sXG5cblx0c3Vic2NyaWJlTGlzdGVuZXI6IGZ1bmN0aW9uIHN1YnNjcmliZUxpc3RlbmVyKGV2ZW50dCwgZnVuY3QpIHtcblx0XHRyZXR1cm4gUHViU3ViLnN1YnNjcmliZShldmVudHQsIGZ1bmN0KTtcblx0fSxcblxuXHRnZXRVc2VyRGF0YTogZnVuY3Rpb24gZ2V0VXNlckRhdGEoKSB7XG5cdFx0cmV0dXJuIFN0b3JlLmdldFVzZXJEYXRhKCk7XG5cdH0sXG5cblx0c2V0SW5wdXRQbGFjZWhvbGRlcjogZnVuY3Rpb24gc2V0SW5wdXRQbGFjZWhvbGRlcih0eHQpIHtcblx0XHQvLyBkb2N1bWVudC5nZXRFbGVtZW50QnlJZChTdG9yZS5nZXRTZWFyY2hJbnB1dElkKCkpLnBsYWNlaG9sZGVyID0gdHh0O1xuXHR9LFxuXG5cdGNoYW5nZUFjY291bnQ6IGZ1bmN0aW9uIGNoYW5nZUFjY291bnQoYWNjb3VudElkKSB7XG5cdFx0Q2FsbGVyLm1ha2VDYWxsKHtcblx0XHRcdHR5cGU6ICdHRVQnLFxuXHRcdFx0ZW5kcG9pbnQ6IFN0b3JlLmdldFN3aXRjaEFjY291bnRFbmRwb2ludChhY2NvdW50SWQpLFxuXHRcdFx0Y2FsbGJhY2tzOiB7XG5cdFx0XHRcdHN1Y2Nlc3M6IGZ1bmN0aW9uIHN1Y2Nlc3MocmVzdWx0KSB7XG5cdFx0XHRcdFx0d2luZG93LmxvY2F0aW9uLmhyZWYgPSAnL2FwcHMnO1xuXHRcdFx0XHR9LFxuXHRcdFx0XHRmYWlsOiBmdW5jdGlvbiBmYWlsKGVycikge1xuXHRcdFx0XHRcdGFsZXJ0KCdTb3JyeSwgc29tZXRoaW5nIHdlbnQgd3Jvbmcgd2l0aCB5b3VyIHJlcXVlc3QuIFBsZXNlIHRyeSBhZ2FpbicpO1xuXHRcdFx0XHR9XG5cdFx0XHR9XG5cdFx0fSk7XG5cdH0sXG5cblx0cmVuZGVyQXBwczogZnVuY3Rpb24gcmVuZGVyQXBwcyhhcHBzKSB7XG5cdFx0dmFyIGFwcFRlbXBsYXRlID0gZnVuY3Rpb24gYXBwVGVtcGxhdGUoYXBwKSB7XG5cdFx0XHRyZXR1cm4gJ1xcblxcdFxcdFxcdFxcdDxhIGNsYXNzPVwiYmFjLS1pbWFnZS1saW5rXCIgaHJlZj1cIicgKyBhcHAuYXBwbGljYXRpb25fdXJsICsgJ1wiIHN0eWxlPVwiYmFja2dyb3VuZDogIycgKyBhcHAuY29sb3IgKyAnXCI+XFxuXFx0XFx0XFx0XFx0XFx0PGltZyBzcmM9XCInICsgYXBwLmljb24gKyAnXCIgLz5cXG5cXHRcXHRcXHRcXHQ8L2E+XFxuXFx0XFx0XFx0XFx0XFxuXFx0XFx0XFx0XFx0PGRpdiBjbGFzcz1cImJhYy0tcHVyZXNkay1hcHAtdGV4dC1jb250YWluZXJcIj5cXG5cXHRcXHRcXHRcXHRcXHQ8YSBocmVmPVwiJyArIGFwcC5hcHBsaWNhdGlvbl91cmwgKyAnXCIgY2xhc3M9XCJiYWMtLWFwcC1uYW1lXCI+JyArIGFwcC5uYW1lICsgJzwvYT5cXG5cXHRcXHRcXHRcXHRcXHQ8YSBocmVmPVwiJyArIGFwcC5hcHBsaWNhdGlvbl91cmwgKyAnXCIgY2xhc3M9XCJiYWMtLWFwcC1kZXNjcmlwdGlvblwiPicgKyAoYXBwLmRlc2NyID09PSBudWxsID8gJy0nIDogYXBwLmRlc2NyKSArICc8L2E+XFxuXFx0XFx0XFx0XFx0PC9kaXY+XFxuXFx0XFx0XFx0Jztcblx0XHR9O1xuXHRcdGZvciAodmFyIGkgPSAwOyBpIDwgYXBwcy5sZW5ndGg7IGkrKykge1xuXHRcdFx0dmFyIGFwcCA9IGFwcHNbaV07XG5cdFx0XHR2YXIgZGl2ID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudChcImRpdlwiKTtcblx0XHRcdGRpdi5jbGFzc05hbWUgPSBcImJhYy0tYXBwc1wiO1xuXHRcdFx0ZGl2LmlubmVySFRNTCA9IGFwcFRlbXBsYXRlKGFwcCk7XG5cblx0XHRcdC8vIGNoZWNrIHRvIHNlZSBpZiB0aGUgdXNlciBoYXMgYWNjZXNzIHRvIHRoZSB0d28gbWFpbiBhcHBzIGFuZCByZW1vdmUgZGlzYWJsZWQgY2xhc3Ncblx0XHRcdGlmIChhcHAuYXBwbGljYXRpb25fdXJsID09PSAnL2FwcC9ncm91cHMnKSB7XG5cdFx0XHRcdERvbS5yZW1vdmVDbGFzcyhkb2N1bWVudC5nZXRFbGVtZW50QnlJZCgnYmFjLS1wdXJlc2RrLWdyb3Vwcy1saW5rLS0nKSwgJ2Rpc2FibGVkJyk7XG5cdFx0XHR9IGVsc2UgaWYgKGFwcC5hcHBsaWNhdGlvbl91cmwgPT09ICcvYXBwL2NhbXBhaWducycpIHtcblx0XHRcdFx0RG9tLnJlbW92ZUNsYXNzKGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKCdiYWMtLXB1cmVzZGstY2FtcGFpZ25zLWxpbmstLScpLCAnZGlzYWJsZWQnKTtcblx0XHRcdH1cblx0XHRcdGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKFwiYmFjLS1hcHMtYWN0dWFsLWNvbnRhaW5lclwiKS5hcHBlbmRDaGlsZChkaXYpO1xuXHRcdH1cblxuXHRcdC8vIGZpbmFsbHkgY2hlY2sgaWYgdGhlIHVzZXIgaXMgb24gYW55IG9mIHRoZSB0d28gbWFpbiBhcHBzXG5cdFx0dmFyIGFwcEluZm8gPSBTdG9yZS5nZXRBcHBJbmZvKCk7XG5cdFx0aWYgKGFwcEluZm8ucm9vdCA9PT0gXCIvYXBwL2dyb3Vwc1wiKSB7XG5cdFx0XHREb20uYWRkQ2xhc3MoZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoJ2JhYy0tcHVyZXNkay1ncm91cHMtbGluay0tJyksICdzZWxlY3RlZCcpO1xuXHRcdH0gZWxzZSBpZiAoYXBwSW5mby5yb290ID09PSBcIi9hcHAvY2FtcGFpZ25zXCIpIHtcblx0XHRcdERvbS5hZGRDbGFzcyhkb2N1bWVudC5nZXRFbGVtZW50QnlJZCgnYmFjLS1wdXJlc2RrLWNhbXBhaWducy1saW5rLS0nKSwgJ3NlbGVjdGVkJyk7XG5cdFx0fVxuXHR9LFxuXG5cdHJlbmRlclVzZXI6IGZ1bmN0aW9uIHJlbmRlclVzZXIodXNlcikge1xuXHRcdHZhciB1c2VyVGVtcGxhdGUgPSBmdW5jdGlvbiB1c2VyVGVtcGxhdGUodXNlcikge1xuXHRcdFx0cmV0dXJuICdcXG5cXHRcXHRcXHRcXHQ8ZGl2IGNsYXNzPVwiYmFjLS11c2VyLWltYWdlXCIgaWQ9XCJiYWMtLXVzZXItaW1hZ2VcIj5cXG5cXHRcXHRcXHRcXHRcXHQ8aSBjbGFzcz1cImZhIGZhLWNhbWVyYVwiPjwvaT5cXG5cXHRcXHRcXHQgICBcXHQ8ZGl2IGlkPVwiYmFjLS11c2VyLWltYWdlLWZpbGVcIj48L2Rpdj5cXG5cXHRcXHRcXHQgICBcXHQ8ZGl2IGlkPVwiYmFjLS11c2VyLWltYWdlLXVwbG9hZC1wcm9ncmVzc1wiPlxcblxcdFxcdFxcdCAgIFxcdFxcdDxzdmcgd2lkdGg9XFwnNjBweFxcJyBoZWlnaHQ9XFwnNjBweFxcJyB4bWxucz1cImh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnXCIgdmlld0JveD1cIjAgMCAxMDAgMTAwXCIgcHJlc2VydmVBc3BlY3RSYXRpbz1cInhNaWRZTWlkXCIgY2xhc3M9XCJ1aWwtZGVmYXVsdFwiPjxyZWN0IHg9XCIwXCIgeT1cIjBcIiB3aWR0aD1cIjEwMFwiIGhlaWdodD1cIjEwMFwiIGZpbGw9XCJub25lXCIgY2xhc3M9XCJia1wiPjwvcmVjdD48cmVjdCAgeD1cXCc0Ni41XFwnIHk9XFwnNDBcXCcgd2lkdGg9XFwnN1xcJyBoZWlnaHQ9XFwnMjBcXCcgcng9XFwnNVxcJyByeT1cXCc1XFwnIGZpbGw9XFwnI2ZmZmZmZlxcJyB0cmFuc2Zvcm09XFwncm90YXRlKDAgNTAgNTApIHRyYW5zbGF0ZSgwIC0zMClcXCc+ICA8YW5pbWF0ZSBhdHRyaWJ1dGVOYW1lPVxcJ29wYWNpdHlcXCcgZnJvbT1cXCcxXFwnIHRvPVxcJzBcXCcgZHVyPVxcJzFzXFwnIGJlZ2luPVxcJy0xc1xcJyByZXBlYXRDb3VudD1cXCdpbmRlZmluaXRlXFwnLz48L3JlY3Q+PHJlY3QgIHg9XFwnNDYuNVxcJyB5PVxcJzQwXFwnIHdpZHRoPVxcJzdcXCcgaGVpZ2h0PVxcJzIwXFwnIHJ4PVxcJzVcXCcgcnk9XFwnNVxcJyBmaWxsPVxcJyNmZmZmZmZcXCcgdHJhbnNmb3JtPVxcJ3JvdGF0ZSgzMCA1MCA1MCkgdHJhbnNsYXRlKDAgLTMwKVxcJz4gIDxhbmltYXRlIGF0dHJpYnV0ZU5hbWU9XFwnb3BhY2l0eVxcJyBmcm9tPVxcJzFcXCcgdG89XFwnMFxcJyBkdXI9XFwnMXNcXCcgYmVnaW49XFwnLTAuOTE2NjY2NjY2NjY2NjY2NnNcXCcgcmVwZWF0Q291bnQ9XFwnaW5kZWZpbml0ZVxcJy8+PC9yZWN0PjxyZWN0ICB4PVxcJzQ2LjVcXCcgeT1cXCc0MFxcJyB3aWR0aD1cXCc3XFwnIGhlaWdodD1cXCcyMFxcJyByeD1cXCc1XFwnIHJ5PVxcJzVcXCcgZmlsbD1cXCcjZmZmZmZmXFwnIHRyYW5zZm9ybT1cXCdyb3RhdGUoNjAgNTAgNTApIHRyYW5zbGF0ZSgwIC0zMClcXCc+ICA8YW5pbWF0ZSBhdHRyaWJ1dGVOYW1lPVxcJ29wYWNpdHlcXCcgZnJvbT1cXCcxXFwnIHRvPVxcJzBcXCcgZHVyPVxcJzFzXFwnIGJlZ2luPVxcJy0wLjgzMzMzMzMzMzMzMzMzMzRzXFwnIHJlcGVhdENvdW50PVxcJ2luZGVmaW5pdGVcXCcvPjwvcmVjdD48cmVjdCAgeD1cXCc0Ni41XFwnIHk9XFwnNDBcXCcgd2lkdGg9XFwnN1xcJyBoZWlnaHQ9XFwnMjBcXCcgcng9XFwnNVxcJyByeT1cXCc1XFwnIGZpbGw9XFwnI2ZmZmZmZlxcJyB0cmFuc2Zvcm09XFwncm90YXRlKDkwIDUwIDUwKSB0cmFuc2xhdGUoMCAtMzApXFwnPiAgPGFuaW1hdGUgYXR0cmlidXRlTmFtZT1cXCdvcGFjaXR5XFwnIGZyb209XFwnMVxcJyB0bz1cXCcwXFwnIGR1cj1cXCcxc1xcJyBiZWdpbj1cXCctMC43NXNcXCcgcmVwZWF0Q291bnQ9XFwnaW5kZWZpbml0ZVxcJy8+PC9yZWN0PjxyZWN0ICB4PVxcJzQ2LjVcXCcgeT1cXCc0MFxcJyB3aWR0aD1cXCc3XFwnIGhlaWdodD1cXCcyMFxcJyByeD1cXCc1XFwnIHJ5PVxcJzVcXCcgZmlsbD1cXCcjZmZmZmZmXFwnIHRyYW5zZm9ybT1cXCdyb3RhdGUoMTIwIDUwIDUwKSB0cmFuc2xhdGUoMCAtMzApXFwnPiAgPGFuaW1hdGUgYXR0cmlidXRlTmFtZT1cXCdvcGFjaXR5XFwnIGZyb209XFwnMVxcJyB0bz1cXCcwXFwnIGR1cj1cXCcxc1xcJyBiZWdpbj1cXCctMC42NjY2NjY2NjY2NjY2NjY2c1xcJyByZXBlYXRDb3VudD1cXCdpbmRlZmluaXRlXFwnLz48L3JlY3Q+PHJlY3QgIHg9XFwnNDYuNVxcJyB5PVxcJzQwXFwnIHdpZHRoPVxcJzdcXCcgaGVpZ2h0PVxcJzIwXFwnIHJ4PVxcJzVcXCcgcnk9XFwnNVxcJyBmaWxsPVxcJyNmZmZmZmZcXCcgdHJhbnNmb3JtPVxcJ3JvdGF0ZSgxNTAgNTAgNTApIHRyYW5zbGF0ZSgwIC0zMClcXCc+ICA8YW5pbWF0ZSBhdHRyaWJ1dGVOYW1lPVxcJ29wYWNpdHlcXCcgZnJvbT1cXCcxXFwnIHRvPVxcJzBcXCcgZHVyPVxcJzFzXFwnIGJlZ2luPVxcJy0wLjU4MzMzMzMzMzMzMzMzMzRzXFwnIHJlcGVhdENvdW50PVxcJ2luZGVmaW5pdGVcXCcvPjwvcmVjdD48cmVjdCAgeD1cXCc0Ni41XFwnIHk9XFwnNDBcXCcgd2lkdGg9XFwnN1xcJyBoZWlnaHQ9XFwnMjBcXCcgcng9XFwnNVxcJyByeT1cXCc1XFwnIGZpbGw9XFwnI2ZmZmZmZlxcJyB0cmFuc2Zvcm09XFwncm90YXRlKDE4MCA1MCA1MCkgdHJhbnNsYXRlKDAgLTMwKVxcJz4gIDxhbmltYXRlIGF0dHJpYnV0ZU5hbWU9XFwnb3BhY2l0eVxcJyBmcm9tPVxcJzFcXCcgdG89XFwnMFxcJyBkdXI9XFwnMXNcXCcgYmVnaW49XFwnLTAuNXNcXCcgcmVwZWF0Q291bnQ9XFwnaW5kZWZpbml0ZVxcJy8+PC9yZWN0PjxyZWN0ICB4PVxcJzQ2LjVcXCcgeT1cXCc0MFxcJyB3aWR0aD1cXCc3XFwnIGhlaWdodD1cXCcyMFxcJyByeD1cXCc1XFwnIHJ5PVxcJzVcXCcgZmlsbD1cXCcjZmZmZmZmXFwnIHRyYW5zZm9ybT1cXCdyb3RhdGUoMjEwIDUwIDUwKSB0cmFuc2xhdGUoMCAtMzApXFwnPiAgPGFuaW1hdGUgYXR0cmlidXRlTmFtZT1cXCdvcGFjaXR5XFwnIGZyb209XFwnMVxcJyB0bz1cXCcwXFwnIGR1cj1cXCcxc1xcJyBiZWdpbj1cXCctMC40MTY2NjY2NjY2NjY2NjY3c1xcJyByZXBlYXRDb3VudD1cXCdpbmRlZmluaXRlXFwnLz48L3JlY3Q+PHJlY3QgIHg9XFwnNDYuNVxcJyB5PVxcJzQwXFwnIHdpZHRoPVxcJzdcXCcgaGVpZ2h0PVxcJzIwXFwnIHJ4PVxcJzVcXCcgcnk9XFwnNVxcJyBmaWxsPVxcJyNmZmZmZmZcXCcgdHJhbnNmb3JtPVxcJ3JvdGF0ZSgyNDAgNTAgNTApIHRyYW5zbGF0ZSgwIC0zMClcXCc+ICA8YW5pbWF0ZSBhdHRyaWJ1dGVOYW1lPVxcJ29wYWNpdHlcXCcgZnJvbT1cXCcxXFwnIHRvPVxcJzBcXCcgZHVyPVxcJzFzXFwnIGJlZ2luPVxcJy0wLjMzMzMzMzMzMzMzMzMzMzNzXFwnIHJlcGVhdENvdW50PVxcJ2luZGVmaW5pdGVcXCcvPjwvcmVjdD48cmVjdCAgeD1cXCc0Ni41XFwnIHk9XFwnNDBcXCcgd2lkdGg9XFwnN1xcJyBoZWlnaHQ9XFwnMjBcXCcgcng9XFwnNVxcJyByeT1cXCc1XFwnIGZpbGw9XFwnI2ZmZmZmZlxcJyB0cmFuc2Zvcm09XFwncm90YXRlKDI3MCA1MCA1MCkgdHJhbnNsYXRlKDAgLTMwKVxcJz4gIDxhbmltYXRlIGF0dHJpYnV0ZU5hbWU9XFwnb3BhY2l0eVxcJyBmcm9tPVxcJzFcXCcgdG89XFwnMFxcJyBkdXI9XFwnMXNcXCcgYmVnaW49XFwnLTAuMjVzXFwnIHJlcGVhdENvdW50PVxcJ2luZGVmaW5pdGVcXCcvPjwvcmVjdD48cmVjdCAgeD1cXCc0Ni41XFwnIHk9XFwnNDBcXCcgd2lkdGg9XFwnN1xcJyBoZWlnaHQ9XFwnMjBcXCcgcng9XFwnNVxcJyByeT1cXCc1XFwnIGZpbGw9XFwnI2ZmZmZmZlxcJyB0cmFuc2Zvcm09XFwncm90YXRlKDMwMCA1MCA1MCkgdHJhbnNsYXRlKDAgLTMwKVxcJz4gIDxhbmltYXRlIGF0dHJpYnV0ZU5hbWU9XFwnb3BhY2l0eVxcJyBmcm9tPVxcJzFcXCcgdG89XFwnMFxcJyBkdXI9XFwnMXNcXCcgYmVnaW49XFwnLTAuMTY2NjY2NjY2NjY2NjY2NjZzXFwnIHJlcGVhdENvdW50PVxcJ2luZGVmaW5pdGVcXCcvPjwvcmVjdD48cmVjdCAgeD1cXCc0Ni41XFwnIHk9XFwnNDBcXCcgd2lkdGg9XFwnN1xcJyBoZWlnaHQ9XFwnMjBcXCcgcng9XFwnNVxcJyByeT1cXCc1XFwnIGZpbGw9XFwnI2ZmZmZmZlxcJyB0cmFuc2Zvcm09XFwncm90YXRlKDMzMCA1MCA1MCkgdHJhbnNsYXRlKDAgLTMwKVxcJz4gIDxhbmltYXRlIGF0dHJpYnV0ZU5hbWU9XFwnb3BhY2l0eVxcJyBmcm9tPVxcJzFcXCcgdG89XFwnMFxcJyBkdXI9XFwnMXNcXCcgYmVnaW49XFwnLTAuMDgzMzMzMzMzMzMzMzMzMzNzXFwnIHJlcGVhdENvdW50PVxcJ2luZGVmaW5pdGVcXCcvPjwvcmVjdD48L3N2Zz5cXG5cXHRcXHRcXHRcXHRcXHQ8L2Rpdj5cXG5cXHRcXHRcXHQgICA8L2Rpdj5cXG5cXHRcXHRcXHRcXHQ8ZGl2IGNsYXNzPVwiYmFjLS11c2VyLW5hbWVcIj4nICsgdXNlci5maXJzdG5hbWUgKyAnICcgKyB1c2VyLmxhc3RuYW1lICsgJzwvZGl2PlxcblxcdFxcdFxcdFxcdDxkaXYgY2xhc3M9XCJiYWMtLXVzZXItZW1haWxcIj4nICsgdXNlci5lbWFpbCArICc8L2Rpdj5cXG5cXHRcXHRcXHQnO1xuXHRcdH07XG5cdFx0dmFyIGRpdiA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoJ2RpdicpO1xuXHRcdGRpdi5jbGFzc05hbWUgPSBcImJhYy0tdXNlci1zaWRlYmFyLWluZm9cIjtcblx0XHRkaXYuaW5uZXJIVE1MID0gdXNlclRlbXBsYXRlKHVzZXIpO1xuXHRcdGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKCdiYWMtLXB1cmVzZGstdXNlci1kZXRhaWxzLS0nKS5hcHBlbmRDaGlsZChkaXYpO1xuXHRcdGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKCdiYWMtLXB1cmVzZGstdXNlci1hdmF0YXItLScpLmlubmVySFRNTCA9IHVzZXIuZmlyc3RuYW1lLmNoYXJBdCgwKSArIHVzZXIubGFzdG5hbWUuY2hhckF0KDApO1xuXHR9LFxuXG5cdHJlbmRlckFjY291bnRzOiBmdW5jdGlvbiByZW5kZXJBY2NvdW50cyhhY2NvdW50cywgY3VycmVudEFjY291bnQpIHtcblx0XHQvLyBMb2dnZXIubG9nKGN1cnJlbnRBY2NvdW50KTtcblx0XHR2YXIgYWNjb3VudHNUZW1wbGF0ZSA9IGZ1bmN0aW9uIGFjY291bnRzVGVtcGxhdGUoYWNjb3VudCwgaXNUaGVTZWxlY3RlZCkge1xuXHRcdFx0cmV0dXJuICdcXG5cXHRcXHRcXHRcXHQ8ZGl2IGNsYXNzPVwiYmFjLS11c2VyLWxpc3QtaXRlbS1pbWFnZVwiPlxcblxcdFxcdFxcdFxcdFxcdDxpbWcgc3JjPVwiJyArIGFjY291bnQuc2RrX3NxdWFyZV9sb2dvX2ljb24gKyAnXCIgYWx0PVwiXCI+XFxuXFx0XFx0XFx0XFx0PC9kaXY+XFxuXFx0XFx0XFx0XFx0PGRpdiBjbGFzcz1cImJhYy11c2VyLWFwcC1kZXRhaWxzXCI+XFxuXFx0XFx0XFx0XFx0XFx0IDxzcGFuPicgKyBhY2NvdW50Lm5hbWUgKyAnPC9zcGFuPlxcblxcdFxcdFxcdFxcdDwvZGl2PlxcblxcdFxcdFxcdFxcdCcgKyAoaXNUaGVTZWxlY3RlZCA/ICc8ZGl2IGlkPVwiYmFjLS1zZWxlY3RlZC1hY291bnQtaW5kaWNhdG9yXCIgY2xhc3M9XCJiYWMtLXNlbGVjdGVkLWFjb3VudC1pbmRpY2F0b3JcIj48L2Rpdj4nIDogJycpICsgJ1xcblxcdFxcdFxcdCc7XG5cdFx0fTtcblxuXHRcdHZhciBfbG9vcCA9IGZ1bmN0aW9uIF9sb29wKGkpIHtcblx0XHRcdHZhciBhY2NvdW50ID0gYWNjb3VudHNbaV07XG5cdFx0XHR2YXIgZGl2ID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudCgnZGl2Jyk7XG5cdFx0XHRkaXYuY2xhc3NOYW1lID0gJ2JhYy0tdXNlci1saXN0LWl0ZW0nO1xuXHRcdFx0ZGl2LmlubmVySFRNTCA9IGFjY291bnRzVGVtcGxhdGUoYWNjb3VudCwgYWNjb3VudC5zZmlkID09PSBjdXJyZW50QWNjb3VudC5zZmlkKTtcblx0XHRcdGRpdi5vbmNsaWNrID0gZnVuY3Rpb24gKGUpIHtcblx0XHRcdFx0ZS5wcmV2ZW50RGVmYXVsdCgpO1xuXHRcdFx0XHRQUEJBLmNoYW5nZUFjY291bnQoYWNjb3VudC5zZmlkKTtcblx0XHRcdH07XG5cdFx0XHRkb2N1bWVudC5nZXRFbGVtZW50QnlJZCgnYmFjLS1wdXJlc2RrLXVzZXItYnVzaW5lc3Nlcy0tJykuYXBwZW5kQ2hpbGQoZGl2KTtcblx0XHR9O1xuXG5cdFx0Zm9yICh2YXIgaSA9IDA7IGkgPCBhY2NvdW50cy5sZW5ndGg7IGkrKykge1xuXHRcdFx0X2xvb3AoaSk7XG5cdFx0fVxuXHR9LFxuXG5cdHJlbmRlckluZm9CbG9ja3M6IGZ1bmN0aW9uIHJlbmRlckluZm9CbG9ja3MoKSB7XG5cdFx0SW5mb0NvbnRyb2xsZXIucmVuZGVySW5mb0Jsb2NrcygpO1xuXHR9LFxuXG5cdHJlbmRlclZlcnNpb25OdW1iZXI6IGZ1bmN0aW9uIHJlbmRlclZlcnNpb25OdW1iZXIodmVyc2lvbikge1xuXHRcdGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKCdwdXJlc2RrLXZlcnNpb24tbnVtYmVyJykuaW5uZXJIVE1MID0gdmVyc2lvbjtcblx0fSxcblxuXHRyZW5kZXJaZW5kZXNrOiBmdW5jdGlvbiByZW5kZXJaZW5kZXNrKCkge1xuXHRcdGlmIChTdG9yZS5nZXREaXNwbGF5U3VwcG9ydCgpKSB7XG5cdFx0XHR2YXIgemRzY3JpcHQgPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KCdzY3JpcHQnKTtcblx0XHRcdHpkc2NyaXB0LnNyYyA9IFwiaHR0cHM6Ly9zdGF0aWMuemRhc3NldHMuY29tL2Vrci9zbmlwcGV0LmpzP2tleT05ODY4YzcxZC02NzkzLTQyYWEtYjJmYS0xMjQxOWM3YmQ0OThcIjtcblx0XHRcdHpkc2NyaXB0LmlkID0gXCJ6ZS1zbmlwcGV0XCI7XG5cdFx0XHR6ZHNjcmlwdC5hc3luYyA9IHRydWU7XG5cdFx0XHR6ZHNjcmlwdC50eXBlID0gJ3RleHQvamF2YXNjcmlwdCc7XG5cdFx0XHRkb2N1bWVudC5nZXRFbGVtZW50c0J5VGFnTmFtZSgnaGVhZCcpWzBdLmFwcGVuZENoaWxkKHpkc2NyaXB0KTtcblx0XHR9XG5cdH0sXG5cblx0c3R5bGVBY2NvdW50OiBmdW5jdGlvbiBzdHlsZUFjY291bnQoYWNjb3VudCkge1xuXHRcdHZhciBhcHBJbmZvID0gU3RvcmUuZ2V0QXBwSW5mbygpO1xuXHRcdHZhciBsb2dvID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudCgnaW1nJyk7XG5cdFx0bG9nby5zcmMgPSBhY2NvdW50LnNka19sb2dvX2ljb247XG5cdFx0ZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoJ2JhYy0tcHVyZXNkay1hY2NvdW50LWxvZ28tLScpLmFwcGVuZENoaWxkKGxvZ28pO1xuXHRcdGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKCdiYWMtLXB1cmVzZGstYWNjb3VudC1sb2dvLS0nKS5vbmNsaWNrID0gZnVuY3Rpb24gKGUpIHtcblx0XHRcdHdpbmRvdy5sb2NhdGlvbi5ocmVmID0gU3RvcmUuZ2V0Um9vdFVybCgpO1xuXHRcdH07XG5cdFx0aWYgKGFwcEluZm8gIT09IG51bGwpIHtcblx0XHRcdHZhciBhcHBUaXRsZUNvbnRhaW5lciA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoJ2RpdicpO1xuXHRcdFx0YXBwVGl0bGVDb250YWluZXIuY2xhc3NOYW1lID0gXCJiYWMtLXB1cmVzZGstYXBwLW5hbWUtLVwiO1xuXHRcdFx0dmFyIGFwcE9wZW5lclRlbXBsYXRlID0gZnVuY3Rpb24gYXBwT3BlbmVyVGVtcGxhdGUoYXBwSW5mb3JtYXRpb24pIHtcblx0XHRcdFx0cmV0dXJuICdcXG5cXHRcXHRcXHRcXHRcXHQgPGEgaHJlZj1cIicgKyBhcHBJbmZvcm1hdGlvbi5yb290ICsgJ1wiIGlkPVwiYXBwLW5hbWUtbGluay10by1yb290XCI+JyArIGFwcEluZm9ybWF0aW9uLm5hbWUgKyAnPC9hPlxcblxcdCBcXHQgIFxcdCBcXHQnO1xuXHRcdFx0fTtcblx0XHRcdGFwcFRpdGxlQ29udGFpbmVyLmlubmVySFRNTCA9IGFwcE9wZW5lclRlbXBsYXRlKGFwcEluZm8pO1xuXHRcdFx0ZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoJ2JhYy0tcHVyZXNkay1hY2NvdW50LWxvZ28tLScpLmFwcGVuZENoaWxkKGFwcFRpdGxlQ29udGFpbmVyKTtcblx0XHR9XG5cblx0XHRkb2N1bWVudC5nZXRFbGVtZW50QnlJZCgnYmFjLS1wdXJlc2RrLWJhYy0taGVhZGVyLWFwcHMtLScpLnN0eWxlLmNzc1RleHQgPSBcImJhY2tncm91bmQ6ICNcIiArIGFjY291bnQuc2RrX2JhY2tncm91bmRfY29sb3IgKyBcIjsgY29sb3I6ICNcIiArIGFjY291bnQuc2RrX2ZvbnRfY29sb3I7XG5cdFx0ZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoJ2JhYy0tcHVyZXNkay11c2VyLXNpZGViYXItLScpLnN0eWxlLmNzc1RleHQgPSBcImJhY2tncm91bmQ6ICNcIiArIGFjY291bnQuc2RrX2JhY2tncm91bmRfY29sb3IgKyBcIjsgY29sb3I6ICNcIiArIGFjY291bnQuc2RrX2ZvbnRfY29sb3I7XG5cdFx0aWYgKGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKCdiYWMtLXB1cmVzZGstYXBwcy1uYW1lLS0nKSkge1xuXHRcdFx0ZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoJ2JhYy0tcHVyZXNkay1hcHBzLW5hbWUtLScpLnN0eWxlLmNzc1RleHQgPSBcImNvbG9yOiAjXCIgKyBhY2NvdW50LnNka19mb250X2NvbG9yO1xuXHRcdH1cblx0XHRpZiAoZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoJ2JhYy0tc2VsZWN0ZWQtYWNvdW50LWluZGljYXRvcicpKSB7XG5cdFx0XHRkb2N1bWVudC5nZXRFbGVtZW50QnlJZCgnYmFjLS1zZWxlY3RlZC1hY291bnQtaW5kaWNhdG9yJykuc3R5bGUuY3NzVGV4dCA9IFwiYmFja2dyb3VuZDogI1wiICsgYWNjb3VudC5zZGtfZm9udF9jb2xvcjtcblx0XHR9XG5cdH0sXG5cblx0Z29Ub0xvZ2luUGFnZTogZnVuY3Rpb24gZ29Ub0xvZ2luUGFnZSgpIHtcblx0XHR3aW5kb3cubG9jYXRpb24uaHJlZiA9IFN0b3JlLmdldExvZ2luVXJsKCk7XG5cdH0sXG5cblx0LyogTE9BREVSICovXG5cdHNob3dMb2FkZXI6IGZ1bmN0aW9uIHNob3dMb2FkZXIoKSB7XG5cdFx0RG9tLmFkZENsYXNzKGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKCdiYWMtLXB1cmVzZGstLWxvYWRlci0tJyksICdiYWMtLXB1cmVzZGstdmlzaWJsZScpO1xuXHR9LFxuXG5cdGhpZGVMb2FkZXI6IGZ1bmN0aW9uIGhpZGVMb2FkZXIoKSB7XG5cdFx0RG9tLnJlbW92ZUNsYXNzKGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKCdiYWMtLXB1cmVzZGstLWxvYWRlci0tJyksICdiYWMtLXB1cmVzZGstdmlzaWJsZScpO1xuXHR9LFxuXG5cdG9wZW5DbG91ZGluYXJ5UGlja2VyOiBmdW5jdGlvbiBvcGVuQ2xvdWRpbmFyeVBpY2tlcihvcHRpb25zKSB7XG5cdFx0Q2xvdWRpbmFyeS5vcGVuTW9kYWwob3B0aW9ucyk7XG5cdH0sXG5cblx0LypcbiAgdHlwZTogb25lIG9mOlxuICAtIHN1Y2Nlc3NcbiAgLSBpbmZvXG4gIC0gd2FybmluZ1xuICAtIGVycm9yXG4gIHRleHQ6IHRoZSB0ZXh0IHRvIGRpc3BsYXlcbiAgb3B0aW9ucyAob3B0aW9uYWwpOiB7XG4gIFx0XHRoaWRlSW46IG1pbGxpc2Vjb25kcyB0byBoaWRlIGl0LiAtMSBmb3Igbm90IGhpZGluZyBpdCBhdCBhbGwuIERlZmF1bHQgaXMgNTAwMFxuICB9XG4gICovXG5cdHNldEluZm86IGZ1bmN0aW9uIHNldEluZm8odHlwZSwgdGV4dCwgb3B0aW9ucykge1xuXHRcdEluZm9Db250cm9sbGVyLnNob3dJbmZvKHR5cGUsIHRleHQsIG9wdGlvbnMpO1xuXHR9LFxuXG5cdHNldFRpdGxlQW5kRmF2aWNvbjogZnVuY3Rpb24gc2V0VGl0bGVBbmRGYXZpY29uKCkge1xuXHRcdHZhciBmYXZsaW5rID0gZG9jdW1lbnQucXVlcnlTZWxlY3RvcihcImxpbmtbcmVsKj0naWNvbiddXCIpIHx8IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoJ2xpbmsnKTtcblx0XHRmYXZsaW5rLmhyZWYgPSAnaHR0cHM6Ly9jbG91ZGNkbi5wdXJlcHJvZmlsZS5jb20vaW1hZ2UvdXBsb2FkL3YxL19fYXNzZXRzX21hc3Rlcl9fL2IxYTBjMzE2YWQ3ZjRhNjc5YzJlZWU2MTU4MTQ0NjZjJztcblx0XHRmYXZsaW5rLnJlbCA9ICdzaG9ydGN1dCBpY29uJztcblx0XHRkb2N1bWVudC5nZXRFbGVtZW50c0J5VGFnTmFtZSgnaGVhZCcpWzBdLmFwcGVuZENoaWxkKGZhdmxpbmspO1xuXG5cdFx0dmFyIGFwcEluZm8gPSBTdG9yZS5nZXRBcHBJbmZvKCk7XG5cdFx0aWYgKGFwcEluZm8gIT09IG51bGwpIHtcblx0XHRcdGRvY3VtZW50LnRpdGxlID0gJ1B1cmVwcm9maWxlIEFjY2VzcyB8ICcgKyBhcHBJbmZvLm5hbWU7XG5cdFx0fSBlbHNlIHtcblx0XHRcdGRvY3VtZW50LnRpdGxlID0gJ1B1cmVwcm9maWxlIEFjY2Vzcyc7XG5cdFx0fVxuXHR9LFxuXG5cblx0cmVuZGVyOiBmdW5jdGlvbiByZW5kZXIoKSB7XG5cdFx0dmFyIHdoZXJlVG8gPSBkb2N1bWVudC5nZXRFbGVtZW50QnlJZChTdG9yZS5nZXRIVExNQ29udGFpbmVyKCkpO1xuXHRcdGlmICh3aGVyZVRvID09PSBudWxsKSB7XG5cdFx0XHRMb2dnZXIuZXJyb3IoJ3RoZSBjb250YWluZXIgd2l0aCBpZCBcIicgKyB3aGVyZVRvICsgJ1wiIGhhcyBub3QgYmVlbiBmb3VuZCBvbiB0aGUgZG9jdW1lbnQuIFRoZSBsaWJyYXJ5IGlzIGdvaW5nIHRvIGNyZWF0ZSBpdC4nKTtcblx0XHRcdHZhciBkaXYgPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KCdkaXYnKTtcblx0XHRcdGRpdi5pZCA9IFN0b3JlLmdldEhUTE1Db250YWluZXIoKTtcblx0XHRcdGRpdi5zdHlsZS53aWR0aCA9ICcxMDAlJztcblx0XHRcdGRpdi5zdHlsZS5oZWlnaHQgPSBcIjUwcHhcIjtcblx0XHRcdGRpdi5zdHlsZS5wb3NpdGlvbiA9IFwiZml4ZWRcIjtcblx0XHRcdGRpdi5zdHlsZS50b3AgPSBcIjBweFwiO1xuXHRcdFx0ZGl2LnN0eWxlLnpJbmRleCA9IFwiMjE0NzQ4MzY0N1wiO1xuXHRcdFx0ZG9jdW1lbnQuYm9keS5pbnNlcnRCZWZvcmUoZGl2LCBkb2N1bWVudC5ib2R5LmZpcnN0Q2hpbGQpO1xuXHRcdFx0d2hlcmVUbyA9IGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKFN0b3JlLmdldEhUTE1Db250YWluZXIoKSk7XG5cdFx0fVxuXHRcdHdoZXJlVG8uaW5uZXJIVE1MID0gU3RvcmUuZ2V0SFRNTCgpO1xuXHRcdFBQQkEucmVuZGVyVXNlcihTdG9yZS5nZXRVc2VyRGF0YSgpLnVzZXIpO1xuXHRcdFBQQkEucmVuZGVySW5mb0Jsb2NrcygpO1xuXHRcdFBQQkEucmVuZGVyQWNjb3VudHMoU3RvcmUuZ2V0VXNlckRhdGEoKS51c2VyLmFjY291bnRzLCBTdG9yZS5nZXRVc2VyRGF0YSgpLnVzZXIuYWNjb3VudCk7XG5cdFx0UFBCQS5yZW5kZXJaZW5kZXNrKCk7XG5cdFx0UFBCQS5zdHlsZUFjY291bnQoU3RvcmUuZ2V0VXNlckRhdGEoKS51c2VyLmFjY291bnQpO1xuXHRcdFBQQkEuc2V0VGl0bGVBbmRGYXZpY29uKCk7XG5cdFx0UFBCQS5yZW5kZXJWZXJzaW9uTnVtYmVyKFN0b3JlLmdldFZlcnNpb25OdW1iZXIoKSk7XG5cdFx0aWYgKFN0b3JlLmdldEFwcHNWaXNpYmxlKCkgPT09IGZhbHNlKSB7XG5cdFx0XHRkb2N1bWVudC5nZXRFbGVtZW50QnlJZCgnYmFjLS1wdXJlc2RrLWFwcHMtc2VjdGlvbi0tJykuc3R5bGUuY3NzVGV4dCA9IFwiZGlzcGxheTpub25lXCI7XG5cdFx0fVxuXHRcdGFmdGVyUmVuZGVyKCk7XG5cdH1cbn07XG5cbm1vZHVsZS5leHBvcnRzID0gUFBCQTsiLCIndXNlIHN0cmljdCc7XG5cbi8qIVxuICogUHVyZVByb2ZpbGUgUHVyZVByb2ZpbGUgQnVzaW5lc3MgQXBwcyBEZXZlbG9wbWVudCBTREtcbiAqXG4gKiB2ZXJzaW9uOiAyLjkuM1xuICogZGF0ZTogMjAxOS0xMC0yOVxuICpcbiAqIENvcHlyaWdodCAyMDE3LCBQdXJlUHJvZmlsZVxuICogUmVsZWFzZWQgdW5kZXIgTUlUIGxpY2Vuc2VcbiAqIGh0dHBzOi8vb3BlbnNvdXJjZS5vcmcvbGljZW5zZXMvTUlUXG4gKi9cblxudmFyIHBwYmEgPSByZXF1aXJlKCcuL1BQQkEnKTtcbnBwYmEuc2V0V2luZG93TmFtZSgnUFVSRVNESycpO1xucHBiYS5zZXRDb25maWd1cmF0aW9uKHtcbiAgICBcImxvZ3NcIjogZmFsc2UsXG4gICAgXCJyb290VXJsXCI6IFwiL1wiLFxuICAgIFwiYmFzZVVybFwiOiBcImFwaS92MS9cIixcbiAgICBcImxvZ2luVXJsXCI6IFwic2lnbmluXCIsXG4gICAgXCJzZWFyY2hJbnB1dElkXCI6IFwiLS1wdXJlc2RrLS1zZWFyY2gtLWlucHV0LS1cIixcbiAgICBcInJlZGlyZWN0VXJsUGFyYW1cIjogXCJyZWRpcmVjdF91cmxcIlxufSk7XG5wcGJhLnNldEhUTUxUZW1wbGF0ZSgnPGhlYWRlciBjbGFzcz1cImJhYy0taGVhZGVyLWFwcHNcIiBpZD1cImJhYy0tcHVyZXNkay1iYWMtLWhlYWRlci1hcHBzLS1cIj5cXG4gICAgPGRpdiBjbGFzcz1cImJhYy0tY29udGFpbmVyXCI+XFxuICAgICAgICA8ZGl2IGNsYXNzPVwiYmFjLS1sb2dvXCIgaWQ9XCJiYWMtLXB1cmVzZGstYWNjb3VudC1sb2dvLS1cIj48L2Rpdj5cXG4gICAgICAgIDxkaXYgY2xhc3M9XCJiYWMtLXVzZXItYWN0aW9uc1wiPlxcbiAgICAgICAgICAgIDxzdmcgaWQ9XCJiYWMtLXB1cmVzZGstLWxvYWRlci0tXCIgd2lkdGg9XCIzOFwiIGhlaWdodD1cIjM4XCIgdmlld0JveD1cIjAgMCA0NCA0NFwiIHhtbG5zPVwiaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmdcIiBzdHJva2U9XCIjZmZmXCIgc3R5bGU9XCJcXG4gICAgbWFyZ2luLXJpZ2h0OiAxMHB4O1xcblwiPlxcbiAgICAgICAgICAgICAgICA8ZyBmaWxsPVwibm9uZVwiIGZpbGwtcnVsZT1cImV2ZW5vZGRcIiBzdHJva2Utd2lkdGg9XCIyXCI+XFxuICAgICAgICAgICAgICAgICAgICA8Y2lyY2xlIGN4PVwiMjJcIiBjeT1cIjIyXCIgcj1cIjE2LjY0MzdcIj5cXG4gICAgICAgICAgICAgICAgICAgICAgICA8YW5pbWF0ZSBhdHRyaWJ1dGVOYW1lPVwiclwiIGJlZ2luPVwiMHNcIiBkdXI9XCIxLjhzXCIgdmFsdWVzPVwiMTsgMjBcIiBjYWxjTW9kZT1cInNwbGluZVwiIGtleVRpbWVzPVwiMDsgMVwiIGtleVNwbGluZXM9XCIwLjE2NSwgMC44NCwgMC40NCwgMVwiIHJlcGVhdENvdW50PVwiaW5kZWZpbml0ZVwiPjwvYW5pbWF0ZT5cXG4gICAgICAgICAgICAgICAgICAgICAgICA8YW5pbWF0ZSBhdHRyaWJ1dGVOYW1lPVwic3Ryb2tlLW9wYWNpdHlcIiBiZWdpbj1cIjBzXCIgZHVyPVwiMS44c1wiIHZhbHVlcz1cIjE7IDBcIiBjYWxjTW9kZT1cInNwbGluZVwiIGtleVRpbWVzPVwiMDsgMVwiIGtleVNwbGluZXM9XCIwLjMsIDAuNjEsIDAuMzU1LCAxXCIgcmVwZWF0Q291bnQ9XCJpbmRlZmluaXRlXCI+PC9hbmltYXRlPlxcbiAgICAgICAgICAgICAgICAgICAgPC9jaXJjbGU+XFxuICAgICAgICAgICAgICAgICAgICA8Y2lyY2xlIGN4PVwiMjJcIiBjeT1cIjIyXCIgcj1cIjE5LjkyODJcIj5cXG4gICAgICAgICAgICAgICAgICAgICAgICA8YW5pbWF0ZSBhdHRyaWJ1dGVOYW1lPVwiclwiIGJlZ2luPVwiYmFjLTAuOXNcIiBkdXI9XCIxLjhzXCIgdmFsdWVzPVwiMTsgMjBcIiBjYWxjTW9kZT1cInNwbGluZVwiIGtleVRpbWVzPVwiMDsgMVwiIGtleVNwbGluZXM9XCIwLjE2NSwgMC44NCwgMC40NCwgMVwiIHJlcGVhdENvdW50PVwiaW5kZWZpbml0ZVwiPjwvYW5pbWF0ZT5cXG4gICAgICAgICAgICAgICAgICAgICAgICA8YW5pbWF0ZSBhdHRyaWJ1dGVOYW1lPVwic3Ryb2tlLW9wYWNpdHlcIiBiZWdpbj1cImJhYy0wLjlzXCIgZHVyPVwiMS44c1wiIHZhbHVlcz1cIjE7IDBcIiBjYWxjTW9kZT1cInNwbGluZVwiIGtleVRpbWVzPVwiMDsgMVwiIGtleVNwbGluZXM9XCIwLjMsIDAuNjEsIDAuMzU1LCAxXCIgcmVwZWF0Q291bnQ9XCJpbmRlZmluaXRlXCI+PC9hbmltYXRlPlxcbiAgICAgICAgICAgICAgICAgICAgPC9jaXJjbGU+XFxuICAgICAgICAgICAgICAgIDwvZz5cXG4gICAgICAgICAgICA8L3N2Zz5cXG4gICAgICAgICAgICA8ZGl2IGNsYXNzPVwiYmFjLS11c2VyLWFwcHNcIiBpZD1cImJhYy0tcHVyZXNkay1hcHBzLXNlY3Rpb24tLVwiPlxcbiAgICAgICAgICAgICAgICA8YSBocmVmPVwiL2FwcC9jYW1wYWlnbnNcIiBpZD1cImJhYy0tcHVyZXNkay1jYW1wYWlnbnMtbGluay0tXCIgY2xhc3M9XCJiYWMtLXB1cmVzZGstYXBwcy1vbi1uYXZiYXItLSBkaXNhYmxlZFwiPkNhbXBhaWduczwvYT5cXG4gICAgICAgICAgICAgICAgPGEgaHJlZj1cIi9hcHAvZ3JvdXBzXCIgaWQ9XCJiYWMtLXB1cmVzZGstZ3JvdXBzLWxpbmstLVwiIGNsYXNzPVwiYmFjLS1wdXJlc2RrLWFwcHMtb24tbmF2YmFyLS0gZGlzYWJsZWRcIj5Hcm91cHM8L2E+XFxuICAgICAgICAgICAgICAgIDxhIGhyZWY9XCIjXCIgaWQ9XCJiYWMtLXB1cmVzZGstLWFwcHMtLW9wZW5lci0tXCIgY2xhc3M9XCJiYWMtLXB1cmVzZGstYXBwcy1vbi1uYXZiYXItLVwiPk90aGVyIGFwcHM8L2E+XFxuICAgICAgICAgICAgICAgIDxkaXYgY2xhc3M9XCJiYWMtLWFwcHMtY29udGFpbmVyXCIgaWQ9XCJiYWMtLXB1cmVzZGstYXBwcy1jb250YWluZXItLVwiPlxcbiAgICAgICAgICAgICAgICAgICAgPGRpdiBpZD1cImJhYy0tYXBzLWFjdHVhbC1jb250YWluZXJcIj48L2Rpdj5cXG4gICAgICAgICAgICAgICAgPC9kaXY+XFxuICAgICAgICAgICAgPC9kaXY+XFxuICAgICAgICAgICAgPGRpdiBjbGFzcz1cImJhYy0tdXNlci1hdmF0YXJcIiBpZD1cImJhYy0tdXNlci1hdmF0YXItdG9wXCI+XFxuICAgICAgICAgICAgICAgIDxzcGFuIGNsYXNzPVwiYmFjLS11c2VyLWF2YXRhci1uYW1lXCIgaWQ9XCJiYWMtLXB1cmVzZGstdXNlci1hdmF0YXItLVwiPjwvc3Bhbj5cXG4gICAgICAgICAgICAgICAgPGRpdiBpZD1cImJhYy0taW1hZ2UtY29udGFpbmVyLXRvcFwiPjwvZGl2PlxcbiAgICAgICAgICAgIDwvZGl2PlxcbiAgICAgICAgPC9kaXY+XFxuICAgIDwvZGl2PlxcbiAgICA8ZGl2IGlkPVwiYmFjLS1pbmZvLWJsb2Nrcy13cmFwcGVyLS1cIj48L2Rpdj5cXG48L2hlYWRlcj5cXG48ZGl2IGNsYXNzPVwiYmFjLS11c2VyLXNpZGViYXJcIiBpZD1cImJhYy0tcHVyZXNkay11c2VyLXNpZGViYXItLVwiPlxcbiAgICA8ZGl2IGlkPVwiYmFjLS1wdXJlc2RrLXVzZXItZGV0YWlscy0tXCI+PC9kaXY+XFxuICAgIDxkaXYgY2xhc3M9XCJiYWMtLXVzZXItYXBwc1wiIGlkPVwiYmFjLS1wdXJlc2RrLXVzZXItYnVzaW5lc3Nlcy0tXCI+XFxuICAgIDwvZGl2PlxcbiAgICA8ZGl2IGNsYXNzPVwiYmFjLS11c2VyLWFjY291bnQtc2V0dGluZ3NcIj5cXG4gICAgICAgIDxkaXYgY2xhc3M9XCJiYWMtdXNlci1hY291bnQtbGlzdC1pdGVtXCI+XFxuICAgICAgICAgICAgPGkgY2xhc3M9XCJmYSBmYS1sb2dpbi1saW5lXCI+PC9pPlxcbiAgICAgICAgICAgIDxhIGhyZWY9XCIvYXBpL3YxL3NpZ24tb2ZmXCI+TG9nIG91dDwvYT5cXG4gICAgICAgIDwvZGl2PlxcblxcbiAgICAgICAgPGRpdiBpZD1cInB1cmVzZGstdmVyc2lvbi1udW1iZXJcIiBjbGFzcz1cInB1cmVzZGstdmVyc2lvbi1udW1iZXJcIj48L2Rpdj5cXG4gICAgPC9kaXY+XFxuPC9kaXY+XFxuXFxuXFxuPGRpdiBjbGFzcz1cImJhYy0tY3VzdG9tLW1vZGFsIGFkZC1xdWVzdGlvbi1tb2RhbCAtLWlzLW9wZW5cIiBpZD1cImJhYy0tY2xvdWRpbmFyeS0tbW9kYWxcIj5cXG4gICAgPGRpdiBjbGFzcz1cImN1c3RvbS1tb2RhbF9fd3JhcHBlclwiPlxcbiAgICAgICAgPGRpdiBjbGFzcz1cImN1c3RvbS1tb2RhbF9fY29udGVudFwiPlxcbiAgICAgICAgICAgIDxoMz5BZGQgaW1hZ2U8L2gzPlxcbiAgICAgICAgICAgIDxhIGNsYXNzPVwiY3VzdG9tLW1vZGFsX19jbG9zZS1idG5cIiBpZD1cImJhYy0tY2xvdWRpbmFyeS0tY2xvc2VidG5cIj48aSBjbGFzcz1cImZhIGZhLXRpbWVzLWNpcmNsZVwiPjwvaT48L2E+XFxuICAgICAgICA8L2Rpdj5cXG5cXG4gICAgICAgIDxkaXYgY2xhc3M9XCJjdXN0b20tbW9kYWxfX2NvbnRlbnRcIj5cXG4gICAgICAgICAgICA8ZGl2IGNsYXNzPVwiYmFjLXNlYXJjaCAtLWljb24tbGVmdFwiPlxcbiAgICAgICAgICAgICAgICA8aW5wdXQgaWQ9XCJiYWMtLWNsb3VkaW5hcnktLXNlYXJjaC1pbnB1dFwiIHR5cGU9XCJzZWFyY2hcIiBuYW1lPVwic2VhcmNoXCIgcGxhY2Vob2xkZXI9XCJTZWFyY2ggZm9yIGltYWdlcy4uLlwiLz5cXG4gICAgICAgICAgICAgICAgPGRpdiBjbGFzcz1cImJhYy1zZWFyY2hfX2ljb25cIj48aSBjbGFzcz1cImZhIGZhLXNlYXJjaFwiPjwvaT48L2Rpdj5cXG4gICAgICAgICAgICA8L2Rpdj5cXG4gICAgICAgICAgICA8YnIvPlxcblxcbiAgICAgICAgICAgIDxkaXYgY2xhc3M9XCJiYWNrLWJ1dHRvblwiIGlkPVwiYmFjLS1jbG91ZGluYXJ5LS1iYWNrLWJ1dHRvbi1jb250YWluZXJcIj5cXG4gICAgICAgICAgICAgICAgPGEgY2xhc3M9XCJnb0JhY2tcIiBpZD1cImJhYy0tY2xvdWRpbmFyeS0tZ28tYmFja1wiPjxpIGNsYXNzPVwiZmEgZmEtYW5nbGUtbGVmdFwiPjwvaT5HbyBCYWNrPC9hPlxcbiAgICAgICAgICAgIDwvZGl2PlxcblxcbiAgICAgICAgICAgIDxici8+XFxuICAgICAgICAgICAgPGRpdiBjbGFzcz1cImNsb3VkLWltYWdlc1wiPlxcbiAgICAgICAgICAgICAgICA8ZGl2IGNsYXNzPVwiY2xvdWQtaW1hZ2VzX19jb250YWluZXJcIiBpZD1cImJhYy0tY2xvdWRpbmFyeS1pdGFtcy1jb250YWluZXJcIj48L2Rpdj5cXG5cXG4gICAgICAgICAgICAgICAgPGRpdiBjbGFzcz1cImNsb3VkLWltYWdlc19fcGFnaW5hdGlvblwiIGlkPVwiYmFjLS1jbG91ZGluYXJ5LXBhZ2luYXRpb24tY29udGFpbmVyXCI+XFxuICAgICAgICAgICAgICAgICAgICA8dWwgaWQ9XCJiYWMtLWNsb3VkaW5hcnktYWN0dWFsLXBhZ2luYXRpb24tY29udGFpbmVyXCI+PC91bD5cXG4gICAgICAgICAgICAgICAgPC9kaXY+XFxuXFxuICAgICAgICAgICAgPC9kaXY+XFxuICAgICAgICA8L2Rpdj5cXG4gICAgPC9kaXY+XFxuPC9kaXY+XFxuXFxuPGlucHV0IHN0eWxlPVwiZGlzcGxheTpub25lXCIgdHlwZT1cXCdmaWxlXFwnIGlkPVxcJ2JhYy0tLXB1cmVzZGstYXZhdGFyLWZpbGVcXCc+XFxuPGlucHV0IHN0eWxlPVwiZGlzcGxheTpub25lXCIgdHlwZT1cXCdidXR0b25cXCcgaWQ9XFwnYmFjLS0tcHVyZXNkay1hdmF0YXItc3VibWl0XFwnIHZhbHVlPVxcJ1VwbG9hZCFcXCc+Jyk7XG5wcGJhLnNldFZlcnNpb25OdW1iZXIoJzIuOS4zJyk7XG5cbndpbmRvdy5QVVJFU0RLID0gcHBiYTtcblxudmFyIGNzcyA9ICdodG1sLGJvZHksZGl2LHNwYW4sYXBwbGV0LG9iamVjdCxpZnJhbWUsaDEsaDIsaDMsaDQsaDUsaDYscCxibG9ja3F1b3RlLHByZSxhLGFiYnIsYWNyb255bSxhZGRyZXNzLGJpZyxjaXRlLGNvZGUsZGVsLGRmbixlbSxpbWcsaW5zLGtiZCxxLHMsc2FtcCxzbWFsbCxzdHJpa2Usc3Ryb25nLHN1YixzdXAsdHQsdmFyLGIsdSxpLGNlbnRlcixkbCxkdCxkZCxvbCx1bCxsaSxmaWVsZHNldCxmb3JtLGxhYmVsLGxlZ2VuZCx0YWJsZSxjYXB0aW9uLHRib2R5LHRmb290LHRoZWFkLHRyLHRoLHRkLGFydGljbGUsYXNpZGUsY2FudmFzLGRldGFpbHMsZW1iZWQsZmlndXJlLGZpZ2NhcHRpb24sZm9vdGVyLGhlYWRlcixoZ3JvdXAsbWVudSxuYXYsb3V0cHV0LHJ1Ynksc2VjdGlvbixzdW1tYXJ5LHRpbWUsbWFyayxhdWRpbyx2aWRlb3ttYXJnaW46MDtwYWRkaW5nOjA7Ym9yZGVyOjA7Zm9udC1zaXplOjEwMCU7Zm9udDppbmhlcml0O3ZlcnRpY2FsLWFsaWduOmJhc2VsaW5lfWFydGljbGUsYXNpZGUsZGV0YWlscyxmaWdjYXB0aW9uLGZpZ3VyZSxmb290ZXIsaGVhZGVyLGhncm91cCxtZW51LG5hdixzZWN0aW9ue2Rpc3BsYXk6YmxvY2t9Ym9keXtsaW5lLWhlaWdodDoxfW9sLHVse2xpc3Qtc3R5bGU6bm9uZX1ibG9ja3F1b3RlLHF7cXVvdGVzOm5vbmV9YmxvY2txdW90ZTpiZWZvcmUsYmxvY2txdW90ZTphZnRlcixxOmJlZm9yZSxxOmFmdGVye2NvbnRlbnQ6XCJcIjtjb250ZW50Om5vbmV9dGFibGV7Ym9yZGVyLWNvbGxhcHNlOmNvbGxhcHNlO2JvcmRlci1zcGFjaW5nOjB9Ym9keXtvdmVyZmxvdy14OmhpZGRlbn0jYmFjLXdyYXBwZXJ7Zm9udC1mYW1pbHk6XCJWZXJkYW5hXCIsIGFyaWFsLCBzYW5zLXNlcmlmO2NvbG9yOndoaXRlO21pbi1oZWlnaHQ6MTAwdmg7cG9zaXRpb246cmVsYXRpdmV9LmJhYy0tY29udGFpbmVye21heC13aWR0aDoxMTYwcHg7bWFyZ2luOjAgYXV0b30uYmFjLS1jb250YWluZXIgLmJhYy0tcHVyZXNkay1hcHAtbmFtZS0te2Rpc3BsYXk6aW5saW5lLWJsb2NrO3Bvc2l0aW9uOnJlbGF0aXZlO3RvcDotNXB4O2xlZnQ6MTVweH0uYmFjLS1jb250YWluZXIgI2FwcC1uYW1lLWxpbmstdG8tcm9vdHtkaXNwbGF5OmJsb2NrO2ZvbnQtc2l6ZToxNnB4O3dpZHRoOjIwMHB4O2NvbG9yOndoaXRlO3RleHQtZGVjb3JhdGlvbjpub25lfS5iYWMtLWhlYWRlci1hcHBze3Bvc2l0aW9uOmFic29sdXRlO3dpZHRoOjEwMCU7aGVpZ2h0OjUwcHg7YmFja2dyb3VuZC1jb2xvcjojNDc1MzY5O3BhZGRpbmc6NXB4IDEwcHg7ei1pbmRleDo5OTk5OTk5ICFpbXBvcnRhbnR9LmJhYy0taGVhZGVyLWFwcHMuYmFjLS1mdWxsd2lkdGh7cGFkZGluZzowfS5iYWMtLWhlYWRlci1hcHBzLmJhYy0tZnVsbHdpZHRoIC5iYWMtLWNvbnRhaW5lcnttYXgtd2lkdGg6dW5zZXQ7cGFkZGluZy1sZWZ0OjE2cHg7cGFkZGluZy1yaWdodDoxNnB4fS5iYWMtLWhlYWRlci1hcHBzIC5iYWMtLWNvbnRhaW5lcntoZWlnaHQ6MTAwJTtkaXNwbGF5OmZsZXg7YWxpZ24taXRlbXM6Y2VudGVyO2p1c3RpZnktY29udGVudDpzcGFjZS1iZXR3ZWVufS5iYWMtLWhlYWRlci1zZWFyY2h7cG9zaXRpb246cmVsYXRpdmV9LmJhYy0taGVhZGVyLXNlYXJjaCBpbnB1dHtjb2xvcjojZmZmO2ZvbnQtc2l6ZToxNHB4O2hlaWdodDozNXB4O2JhY2tncm91bmQtY29sb3I6IzZiNzU4NjtwYWRkaW5nOjAgNXB4IDAgMTBweDtib3JkZXI6bm9uZTtib3JkZXItcmFkaXVzOjNweDttaW4td2lkdGg6NDAwcHg7d2lkdGg6MTAwJX0uYmFjLS1oZWFkZXItc2VhcmNoIGlucHV0OmZvY3Vze291dGxpbmU6bm9uZX0uYmFjLS1oZWFkZXItc2VhcmNoIGlucHV0Ojotd2Via2l0LWlucHV0LXBsYWNlaG9sZGVye2ZvbnQtc3R5bGU6bm9ybWFsICFpbXBvcnRhbnQ7dGV4dC1hbGlnbjpjZW50ZXI7Y29sb3I6I2ZmZjtmb250LXNpemU6MTRweDtmb250LXdlaWdodDozMDA7bGV0dGVyLXNwYWNpbmc6MC41cHh9LmJhYy0taGVhZGVyLXNlYXJjaCBpbnB1dDo6LW1vei1wbGFjZWhvbGRlcntmb250LXN0eWxlOm5vcm1hbCAhaW1wb3J0YW50O3RleHQtYWxpZ246Y2VudGVyO2NvbG9yOiNmZmY7Zm9udC1zaXplOjE0cHg7Zm9udC13ZWlnaHQ6MzAwO2xldHRlci1zcGFjaW5nOjAuNXB4fS5iYWMtLWhlYWRlci1zZWFyY2ggaW5wdXQ6LW1zLWlucHV0LXBsYWNlaG9sZGVye2ZvbnQtc3R5bGU6bm9ybWFsICFpbXBvcnRhbnQ7dGV4dC1hbGlnbjpjZW50ZXI7Y29sb3I6I2ZmZjtmb250LXNpemU6MTRweDtmb250LXdlaWdodDozMDA7bGV0dGVyLXNwYWNpbmc6MC41cHh9LmJhYy0taGVhZGVyLXNlYXJjaCBpe3Bvc2l0aW9uOmFic29sdXRlO3RvcDo4cHg7cmlnaHQ6MTBweH0uYmFjLS11c2VyLWFjdGlvbnN7ZGlzcGxheTpmbGV4O2FsaWduLWl0ZW1zOmNlbnRlcn0uYmFjLS11c2VyLWFjdGlvbnMgI2JhYy0tcHVyZXNkay1hcHBzLXNlY3Rpb24tLXtib3JkZXItcmlnaHQ6MXB4IHNvbGlkICNhZGFkYWQ7aGVpZ2h0OjQwcHg7cGFkZGluZy10b3A6MTNweH0uYmFjLS11c2VyLWFjdGlvbnMgI2JhYy0tcHVyZXNkay1hcHBzLXNlY3Rpb24tLSBhLmJhYy0tcHVyZXNkay1hcHBzLW9uLW5hdmJhci0te2NvbG9yOndoaXRlc21va2U7dGV4dC1kZWNvcmF0aW9uOm5vbmU7bWFyZ2luLXJpZ2h0OjI1cHg7Zm9udC1zaXplOjEzcHh9LmJhYy0tdXNlci1hY3Rpb25zICNiYWMtLXB1cmVzZGstYXBwcy1zZWN0aW9uLS0gYS5iYWMtLXB1cmVzZGstYXBwcy1vbi1uYXZiYXItLS5kaXNhYmxlZHtwb2ludGVyLWV2ZW50czpub25lO2N1cnNvcjpub25lO2NvbG9yOiNhZGFkYWR9LmJhYy0tdXNlci1hY3Rpb25zICNiYWMtLXB1cmVzZGstYXBwcy1zZWN0aW9uLS0gYS5iYWMtLXB1cmVzZGstYXBwcy1vbi1uYXZiYXItLS5zZWxlY3RlZHtjb2xvcjojMjBENkM5O3BvaW50ZXItZXZlbnRzOm5vbmV9LmJhYy0tdXNlci1hY3Rpb25zIC5iYWMtLXVzZXItbm90aWZpY2F0aW9uc3twb3NpdGlvbjpyZWxhdGl2ZX0uYmFjLS11c2VyLWFjdGlvbnMgLmJhYy0tdXNlci1ub3RpZmljYXRpb25zIGl7Zm9udC1zaXplOjIwcHh9LmJhYy0tdXNlci1hY3Rpb25zICNiYWMtLXB1cmVzZGstLWxvYWRlci0te2Rpc3BsYXk6bm9uZX0uYmFjLS11c2VyLWFjdGlvbnMgI2JhYy0tcHVyZXNkay0tbG9hZGVyLS0uYmFjLS1wdXJlc2RrLXZpc2libGV7ZGlzcGxheTpibG9ja30uYmFjLS11c2VyLWFjdGlvbnMgLmJhYy0tdXNlci1ub3RpZmljYXRpb25zLWNvdW50e3Bvc2l0aW9uOmFic29sdXRlO2Rpc3BsYXk6aW5saW5lLWJsb2NrO2hlaWdodDoxNXB4O3dpZHRoOjE1cHg7bGluZS1oZWlnaHQ6MTVweDtjb2xvcjojZmZmO2ZvbnQtc2l6ZToxMHB4O3RleHQtYWxpZ246Y2VudGVyO2JhY2tncm91bmQtY29sb3I6I2ZjM2IzMDtib3JkZXItcmFkaXVzOjUwJTt0b3A6LTVweDtsZWZ0Oi01cHh9LmJhYy0tdXNlci1hY3Rpb25zIC5iYWMtLXVzZXItYXZhdGFyLC5iYWMtLXVzZXItYWN0aW9ucyAuYmFjLS11c2VyLW5vdGlmaWNhdGlvbnN7bWFyZ2luLWxlZnQ6MjBweH0uYmFjLS11c2VyLWFjdGlvbnMgLmJhYy0tdXNlci1hdmF0YXJ7cG9zaXRpb246cmVsYXRpdmU7b3ZlcmZsb3c6aGlkZGVuO2JvcmRlci1yYWRpdXM6NTAlfS5iYWMtLXVzZXItYWN0aW9ucyAuYmFjLS11c2VyLWF2YXRhciAjYmFjLS1pbWFnZS1jb250YWluZXItdG9we3dpZHRoOjEwMCU7aGVpZ3RoOjEwMCU7cG9zaXRpb246YWJzb2x1dGU7dG9wOjA7bGVmdDowO3otaW5kZXg6MTtkaXNwbGF5Om5vbmV9LmJhYy0tdXNlci1hY3Rpb25zIC5iYWMtLXVzZXItYXZhdGFyICNiYWMtLWltYWdlLWNvbnRhaW5lci10b3AgaW1ne3dpZHRoOjEwMCU7aGVpZ2h0OjEwMCU7Y3Vyc29yOnBvaW50ZXJ9LmJhYy0tdXNlci1hY3Rpb25zIC5iYWMtLXVzZXItYXZhdGFyICNiYWMtLWltYWdlLWNvbnRhaW5lci10b3AuYmFjLS1wdXJlc2RrLXZpc2libGV7ZGlzcGxheTpibG9ja30uYmFjLS11c2VyLWFjdGlvbnMgLmJhYy0tdXNlci1hdmF0YXItbmFtZXtjb2xvcjojZmZmO2JhY2tncm91bmQtY29sb3I6I2FkYWRhZDtkaXNwbGF5OmlubGluZS1ibG9jaztoZWlnaHQ6MzVweDt3aWR0aDozNXB4O2xpbmUtaGVpZ2h0OjM1cHg7dGV4dC1hbGlnbjpjZW50ZXI7Zm9udC1zaXplOjE0cHh9LmJhYy0tdXNlci1hcHBze3Bvc2l0aW9uOnJlbGF0aXZlfSNiYWMtLXB1cmVzZGstYXBwcy1pY29uLS17d2lkdGg6MjBweDtkaXNwbGF5OmlubGluZS1ibG9jazt0ZXh0LWFsaWduOmNlbnRlcjtmb250LXNpemU6MTZweH0uYmFjLS1wdXJlc2RrLWFwcHMtbmFtZS0te2ZvbnQtc2l6ZTo5cHg7d2lkdGg6MjBweDt0ZXh0LWFsaWduOmNlbnRlcn0jYmFjLS1wdXJlc2RrLXVzZXItYnVzaW5lc3Nlcy0te2hlaWdodDpjYWxjKDEwMHZoIC0gMzMzcHgpO292ZXJmbG93OmF1dG99LmJhYy0tYXBwcy1jb250YWluZXJ7YmFja2dyb3VuZDojZmZmO3Bvc2l0aW9uOmFic29sdXRlO3RvcDo0NXB4O3JpZ2h0OjBweDtkaXNwbGF5OmZsZXg7d2lkdGg6MzAwcHg7ZmxleC13cmFwOndyYXA7Ym9yZGVyLXJhZGl1czoxMHB4O3BhZGRpbmc6MTVweDtwYWRkaW5nLXJpZ2h0OjA7anVzdGlmeS1jb250ZW50OnNwYWNlLWJldHdlZW47dGV4dC1hbGlnbjpsZWZ0Oy13ZWJraXQtYm94LXNoYWRvdzowIDAgMTBweCAycHggcmdiYSgwLDAsMCwwLjIpO2JveC1zaGFkb3c6MCAwIDEwcHggMnB4IHJnYmEoMCwwLDAsMC4yKTtvcGFjaXR5OjA7dmlzaWJpbGl0eTpoaWRkZW47dHJhbnNpdGlvbjphbGwgMC40cyBlYXNlO21heC1oZWlnaHQ6NTAwcHh9LmJhYy0tYXBwcy1jb250YWluZXIgI2JhYy0tYXBzLWFjdHVhbC1jb250YWluZXJ7aGVpZ2h0OjEwMCU7b3ZlcmZsb3c6c2Nyb2xsO21heC1oZWlnaHQ6NDc1cHg7d2lkdGg6MTAwJX0uYmFjLS1hcHBzLWNvbnRhaW5lci5hY3RpdmV7b3BhY2l0eToxO3Zpc2liaWxpdHk6dmlzaWJsZX0uYmFjLS1hcHBzLWNvbnRhaW5lcjpiZWZvcmV7Y29udGVudDpcIlwiO3ZlcnRpY2FsLWFsaWduOm1pZGRsZTttYXJnaW46YXV0bztwb3NpdGlvbjphYnNvbHV0ZTtkaXNwbGF5OmJsb2NrO2xlZnQ6MDtyaWdodDotMTg1cHg7Ym90dG9tOmNhbGMoMTAwJSAtIDZweCk7d2lkdGg6MTJweDtoZWlnaHQ6MTJweDt0cmFuc2Zvcm06cm90YXRlKDQ1ZGVnKTtiYWNrZ3JvdW5kLWNvbG9yOiNmZmZ9LmJhYy0tYXBwcy1jb250YWluZXIgLmJhYy0tYXBwc3t3aWR0aDoxMDAlO2ZvbnQtc2l6ZToyMHB4O21hcmdpbi1ib3R0b206MTVweDt0ZXh0LWFsaWduOmxlZnQ7aGVpZ2h0OjMzcHh9LmJhYy0tYXBwcy1jb250YWluZXIgLmJhYy0tYXBwczpsYXN0LWNoaWxke21hcmdpbi1ib3R0b206MH0uYmFjLS1hcHBzLWNvbnRhaW5lciAuYmFjLS1hcHBzOmhvdmVye2JhY2tncm91bmQ6I2YzZjNmM30uYmFjLS1hcHBzLWNvbnRhaW5lciAuYmFjLS1hcHBzIGEuYmFjLS1pbWFnZS1saW5re2Rpc3BsYXk6aW5saW5lLWJsb2NrO2NvbG9yOiNmZmY7dGV4dC1kZWNvcmF0aW9uOm5vbmU7d2lkdGg6MzNweDtoZWlnaHQ6MzNweH0uYmFjLS1hcHBzLWNvbnRhaW5lciAuYmFjLS1hcHBzIGEuYmFjLS1pbWFnZS1saW5rIGltZ3t3aWR0aDoxMDAlO2hlaWdodDoxMDAlfS5iYWMtLWFwcHMtY29udGFpbmVyIC5iYWMtLWFwcHMgLmJhYy0tcHVyZXNkay1hcHAtdGV4dC1jb250YWluZXJ7ZGlzcGxheTppbmxpbmUtYmxvY2s7cG9zaXRpb246cmVsYXRpdmU7bGVmdDotMnB4O3dpZHRoOmNhbGMoMTAwJSAtIDQycHgpfS5iYWMtLWFwcHMtY29udGFpbmVyIC5iYWMtLWFwcHMgLmJhYy0tcHVyZXNkay1hcHAtdGV4dC1jb250YWluZXIgYXtkaXNwbGF5OmJsb2NrO3RleHQtZGVjb3JhdGlvbjpub25lO2N1cnNvcjpwb2ludGVyO3BhZGRpbmctbGVmdDo4cHh9LmJhYy0tYXBwcy1jb250YWluZXIgLmJhYy0tYXBwcyAuYmFjLS1wdXJlc2RrLWFwcC10ZXh0LWNvbnRhaW5lciAuYmFjLS1hcHAtbmFtZXt3aWR0aDoxMDAlO2NvbG9yOiMwMDA7Zm9udC1zaXplOjEzcHg7cGFkZGluZy1ib3R0b206NHB4fS5iYWMtLWFwcHMtY29udGFpbmVyIC5iYWMtLWFwcHMgLmJhYy0tcHVyZXNkay1hcHAtdGV4dC1jb250YWluZXIgLmJhYy0tYXBwLWRlc2NyaXB0aW9ue2NvbG9yOiM5MTkxOTE7Zm9udC1zaXplOjExcHg7Zm9udC1zdHlsZTppdGFsaWM7bGluZS1oZWlnaHQ6MS4zZW07cG9zaXRpb246cmVsYXRpdmU7dG9wOi0ycHg7b3ZlcmZsb3c6aGlkZGVuO3doaXRlLXNwYWNlOm5vd3JhcDt0ZXh0LW92ZXJmbG93OmVsbGlwc2lzfS5iYWMtLXVzZXItc2lkZWJhcntmb250LWZhbWlseTpcIlZlcmRhbmFcIiwgYXJpYWwsIHNhbnMtc2VyaWY7Y29sb3I6d2hpdGU7aGVpZ2h0OmNhbGMoMTAwdmggLSA1MHB4KTtiYWNrZ3JvdW5kLWNvbG9yOiM1MTVmNzc7Ym94LXNpemluZzpib3JkZXItYm94O3dpZHRoOjMyMHB4O3Bvc2l0aW9uOmZpeGVkO3RvcDo1MHB4O3JpZ2h0OjA7ei1pbmRleDo5OTk5OTk7cGFkZGluZy10b3A6MTBweDtvcGFjaXR5OjA7dHJhbnNmb3JtOnRyYW5zbGF0ZVgoMTAwJSk7dHJhbnNpdGlvbjphbGwgMC40cyBlYXNlfS5iYWMtLXVzZXItc2lkZWJhci5hY3RpdmV7b3BhY2l0eToxO3RyYW5zZm9ybTp0cmFuc2xhdGVYKDAlKTstd2Via2l0LWJveC1zaGFkb3c6LTFweCAwcHggMTJweCAwcHggcmdiYSgwLDAsMCwwLjc1KTstbW96LWJveC1zaGFkb3c6LTFweCAzcHggMTJweCAwcHggcmdiYSgwLDAsMCwwLjc1KTtib3gtc2hhZG93Oi0xcHggMHB4IDEycHggMHB4IHJnYmEoMCwwLDAsMC43NSl9LmJhYy0tdXNlci1zaWRlYmFyIC5iYWMtLXVzZXItbGlzdC1pdGVte2Rpc3BsYXk6ZmxleDtwb3NpdGlvbjpyZWxhdGl2ZTtjdXJzb3I6cG9pbnRlcjthbGlnbi1pdGVtczpjZW50ZXI7cGFkZGluZzoxMHB4IDEwcHggMTBweCA0MHB4O2JvcmRlci1ib3R0b206MXB4IHNvbGlkIHJnYmEoMjU1LDI1NSwyNTUsMC4xKX0uYmFjLS11c2VyLXNpZGViYXIgLmJhYy0tdXNlci1saXN0LWl0ZW06aG92ZXJ7YmFja2dyb3VuZC1jb2xvcjpyZ2JhKDI1NSwyNTUsMjU1LDAuMSl9LmJhYy0tdXNlci1zaWRlYmFyIC5iYWMtLXVzZXItbGlzdC1pdGVtIC5iYWMtLXNlbGVjdGVkLWFjb3VudC1pbmRpY2F0b3J7cG9zaXRpb246YWJzb2x1dGU7cmlnaHQ6MDtoZWlnaHQ6MTAwJTt3aWR0aDo4cHh9LmJhYy0tdXNlci1zaWRlYmFyIC5iYWMtLXVzZXItbGlzdC1pdGVtIC5iYWMtLXVzZXItbGlzdC1pdGVtLWltYWdle3dpZHRoOjQwcHg7aGVpZ2h0OjQwcHg7Ym9yZGVyLXJhZGl1czozcHg7Ym9yZGVyOjJweCBzb2xpZCAjZmZmO21hcmdpbi1yaWdodDoyMHB4O2Rpc3BsYXk6ZmxleDthbGlnbi1pdGVtczpjZW50ZXI7anVzdGlmeS1jb250ZW50OmNlbnRlcn0uYmFjLS11c2VyLXNpZGViYXIgLmJhYy0tdXNlci1saXN0LWl0ZW0gLmJhYy0tdXNlci1saXN0LWl0ZW0taW1hZ2U+aW1ne3dpZHRoOmF1dG87aGVpZ2h0OmF1dG87bWF4LXdpZHRoOjEwMCU7bWF4LWhlaWdodDoxMDAlfS5iYWMtLXVzZXItc2lkZWJhciAuYmFjLS11c2VyLWxpc3QtaXRlbSBzcGFue3dpZHRoOjEwMCU7ZGlzcGxheTpibG9jazttYXJnaW4tYm90dG9tOjVweH0uYmFjLS11c2VyLXNpZGViYXIgLmJhYy11c2VyLWFwcC1kZXRhaWxzIHNwYW57Zm9udC1zaXplOjEycHh9LmJhYy0tdXNlci1zaWRlYmFyIC5wdXJlc2RrLXZlcnNpb24tbnVtYmVye3dpZHRoOjEwMCU7dGV4dC1hbGlnbjpyaWdodDtwYWRkaW5nLXJpZ2h0OjEwcHg7cG9zaXRpb246YWJzb2x1dGU7Zm9udC1zaXplOjhweDtvcGFjaXR5OjAuNTtyaWdodDowO2JvdHRvbTowfS5iYWMtLXVzZXItc2lkZWJhci1pbmZve2Rpc3BsYXk6ZmxleDtqdXN0aWZ5LWNvbnRlbnQ6Y2VudGVyO2ZsZXgtd3JhcDp3cmFwO3RleHQtYWxpZ246Y2VudGVyO3BhZGRpbmc6MTBweCAyMHB4IDE1cHh9LmJhYy0tdXNlci1zaWRlYmFyLWluZm8gLmJhYy0tdXNlci1pbWFnZXtib3JkZXI6MXB4ICNhZGFkYWQgc29saWQ7b3ZlcmZsb3c6aGlkZGVuO2JvcmRlci1yYWRpdXM6NTAlO3Bvc2l0aW9uOnJlbGF0aXZlO2N1cnNvcjpwb2ludGVyO2Rpc3BsYXk6aW5saW5lLWJsb2NrO2hlaWdodDo4MHB4O3dpZHRoOjgwcHg7bGluZS1oZWlnaHQ6ODBweDt0ZXh0LWFsaWduOmNlbnRlcjtjb2xvcjojZmZmO2JvcmRlci1yYWRpdXM6NTAlO2JhY2tncm91bmQtY29sb3I6I2FkYWRhZDttYXJnaW4tYm90dG9tOjE1cHh9LmJhYy0tdXNlci1zaWRlYmFyLWluZm8gLmJhYy0tdXNlci1pbWFnZSAjYmFjLS11c2VyLWltYWdlLWZpbGV7ZGlzcGxheTpub25lO3Bvc2l0aW9uOmFic29sdXRlO3otaW5kZXg6MTt0b3A6MDtsZWZ0OjA7d2lkdGg6MTAwJTtoZWlnaHQ6MTAwJX0uYmFjLS11c2VyLXNpZGViYXItaW5mbyAuYmFjLS11c2VyLWltYWdlICNiYWMtLXVzZXItaW1hZ2UtZmlsZSBpbWd7d2lkdGg6MTAwJTtoZWlnaHQ6MTAwJX0uYmFjLS11c2VyLXNpZGViYXItaW5mbyAuYmFjLS11c2VyLWltYWdlICNiYWMtLXVzZXItaW1hZ2UtZmlsZS5iYWMtLXB1cmVzZGstdmlzaWJsZXtkaXNwbGF5OmJsb2NrfS5iYWMtLXVzZXItc2lkZWJhci1pbmZvIC5iYWMtLXVzZXItaW1hZ2UgI2JhYy0tdXNlci1pbWFnZS11cGxvYWQtcHJvZ3Jlc3N7cG9zaXRpb246YWJzb2x1dGU7cGFkZGluZy10b3A6MTBweDt0b3A6MDtiYWNrZ3JvdW5kOiM2NjY7ei1pbmRleDo0O2Rpc3BsYXk6bm9uZTt3aWR0aDoxMDAlO2hlaWdodDoxMDAlfS5iYWMtLXVzZXItc2lkZWJhci1pbmZvIC5iYWMtLXVzZXItaW1hZ2UgI2JhYy0tdXNlci1pbWFnZS11cGxvYWQtcHJvZ3Jlc3MuYmFjLS1wdXJlc2RrLXZpc2libGV7ZGlzcGxheTpibG9ja30uYmFjLS11c2VyLXNpZGViYXItaW5mbyAuYmFjLS11c2VyLWltYWdlIGl7Zm9udC1zaXplOjMycHg7Zm9udC1zaXplOjMycHg7ei1pbmRleDowO3Bvc2l0aW9uOmFic29sdXRlO3dpZHRoOjEwMCU7bGVmdDowO2JhY2tncm91bmQtY29sb3I6cmdiYSgwLDAsMCwwLjUpfS5iYWMtLXVzZXItc2lkZWJhci1pbmZvIC5iYWMtLXVzZXItaW1hZ2U6aG92ZXIgaXt6LWluZGV4OjN9LmJhYy0tdXNlci1zaWRlYmFyLWluZm8gLmJhYy0tdXNlci1uYW1le3dpZHRoOjEwMCU7dGV4dC1hbGlnbjpjZW50ZXI7Zm9udC1zaXplOjE4cHg7bWFyZ2luLWJvdHRvbToxMHB4fS5iYWMtLXVzZXItc2lkZWJhci1pbmZvIC5iYWMtLXVzZXItZW1haWx7Zm9udC1zaXplOjEycHg7Zm9udC13ZWlnaHQ6MzAwfS5iYWMtLXVzZXItYWNjb3VudC1zZXR0aW5nc3twb3NpdGlvbjphYnNvbHV0ZTtib3R0b206MTBweDtsZWZ0OjIwcHg7d2lkdGg6OTAlO2hlaWdodDo1MHB4fS5iYWMtLXVzZXItYWNjb3VudC1zZXR0aW5ncyAuYmFjLXVzZXItYWNvdW50LWxpc3QtaXRlbXtkaXNwbGF5OmZsZXg7YWxpZ24taXRlbXM6Y2VudGVyO21hcmdpbi1ib3R0b206MzBweDtwb3NpdGlvbjphYnNvbHV0ZX0uYmFjLS11c2VyLWFjY291bnQtc2V0dGluZ3MgLmJhYy11c2VyLWFjb3VudC1saXN0LWl0ZW0gYXt0ZXh0LWRlY29yYXRpb246bm9uZTtjb2xvcjojZmZmfS5iYWMtLXVzZXItYWNjb3VudC1zZXR0aW5ncyAuYmFjLXVzZXItYWNvdW50LWxpc3QtaXRlbSBpe2ZvbnQtc2l6ZToxNnB4O21hcmdpbi1yaWdodDo4cHh9I2JhYy0tcHVyZXNkay1hY2NvdW50LWxvZ28tLXtjdXJzb3I6cG9pbnRlcjtwb3NpdGlvbjpyZWxhdGl2ZTtjb2xvcjojZmZmfSNiYWMtLXB1cmVzZGstYWNjb3VudC1sb2dvLS0gaW1ne2hlaWdodDoyOHB4fSNiYWMtLWluZm8tYmxvY2tzLXdyYXBwZXItLXtwb3NpdGlvbjpmaXhlZDt0b3A6MHB4O2hlaWdodDphdXRvfSNiYWMtLWluZm8tYmxvY2tzLXdyYXBwZXItLSAuYmFjLS1wdXJlc2RrLWluZm8tYm94LS17Ym9yZGVyLXJhZGl1czowIDAgM3B4IDNweDtvdmVyZmxvdzpoaWRkZW47ei1pbmRleDo5OTk5OTk5OTtwb3NpdGlvbjpyZWxhdGl2ZTttYXJnaW4tdG9wOjA7d2lkdGg6NDcwcHg7bGVmdDpjYWxjKDUwdncgLSAyMzVweCk7aGVpZ2h0OjBweDstd2Via2l0LXRyYW5zaXRpb246dG9wIDAuNHM7dHJhbnNpdGlvbjphbGwgMC40c30jYmFjLS1pbmZvLWJsb2Nrcy13cmFwcGVyLS0gLmJhYy0tcHVyZXNkay1pbmZvLWJveC0tLmJhYy0tc3VjY2Vzc3tiYWNrZ3JvdW5kOiMxNERBOUV9I2JhYy0taW5mby1ibG9ja3Mtd3JhcHBlci0tIC5iYWMtLXB1cmVzZGstaW5mby1ib3gtLS5iYWMtLXN1Y2Nlc3MgLmJhYy0taW5uZXItaW5mby1ib3gtLSBkaXYuYmFjLS1pbmZvLWljb24tLS5mYS1zdWNjZXNze2Rpc3BsYXk6aW5saW5lLWJsb2NrfSNiYWMtLWluZm8tYmxvY2tzLXdyYXBwZXItLSAuYmFjLS1wdXJlc2RrLWluZm8tYm94LS0uYmFjLS1pbmZve2JhY2tncm91bmQtY29sb3I6IzVCQzBERX0jYmFjLS1pbmZvLWJsb2Nrcy13cmFwcGVyLS0gLmJhYy0tcHVyZXNkay1pbmZvLWJveC0tLmJhYy0taW5mbyAuYmFjLS1pbm5lci1pbmZvLWJveC0tIGRpdi5iYWMtLWluZm8taWNvbi0tLmZhLWluZm8tMXtkaXNwbGF5OmlubGluZS1ibG9ja30jYmFjLS1pbmZvLWJsb2Nrcy13cmFwcGVyLS0gLmJhYy0tcHVyZXNkay1pbmZvLWJveC0tLmJhYy0td2FybmluZ3tiYWNrZ3JvdW5kOiNGMEFENEV9I2JhYy0taW5mby1ibG9ja3Mtd3JhcHBlci0tIC5iYWMtLXB1cmVzZGstaW5mby1ib3gtLS5iYWMtLXdhcm5pbmcgLmJhYy0taW5uZXItaW5mby1ib3gtLSBkaXYuYmFjLS1pbmZvLWljb24tLS5mYS13YXJuaW5ne2Rpc3BsYXk6aW5saW5lLWJsb2NrfSNiYWMtLWluZm8tYmxvY2tzLXdyYXBwZXItLSAuYmFjLS1wdXJlc2RrLWluZm8tYm94LS0uYmFjLS1lcnJvcntiYWNrZ3JvdW5kOiNFRjQxMDB9I2JhYy0taW5mby1ibG9ja3Mtd3JhcHBlci0tIC5iYWMtLXB1cmVzZGstaW5mby1ib3gtLS5iYWMtLWVycm9yIC5iYWMtLWlubmVyLWluZm8tYm94LS0gZGl2LmJhYy0taW5mby1pY29uLS0uZmEtZXJyb3J7ZGlzcGxheTppbmxpbmUtYmxvY2t9I2JhYy0taW5mby1ibG9ja3Mtd3JhcHBlci0tIC5iYWMtLXB1cmVzZGstaW5mby1ib3gtLSAuYmFjLS10aW1lcnstd2Via2l0LXRyYW5zaXRpb24tdGltaW5nLWZ1bmN0aW9uOmxpbmVhcjt0cmFuc2l0aW9uLXRpbWluZy1mdW5jdGlvbjpsaW5lYXI7cG9zaXRpb246YWJzb2x1dGU7Ym90dG9tOjBweDtvcGFjaXR5OjAuNTtoZWlnaHQ6MnB4ICFpbXBvcnRhbnQ7YmFja2dyb3VuZDp3aGl0ZTt3aWR0aDowJX0jYmFjLS1pbmZvLWJsb2Nrcy13cmFwcGVyLS0gLmJhYy0tcHVyZXNkay1pbmZvLWJveC0tIC5iYWMtLXRpbWVyLmJhYy0tZnVsbHdpZHRoe3dpZHRoOjEwMCV9I2JhYy0taW5mby1ibG9ja3Mtd3JhcHBlci0tIC5iYWMtLXB1cmVzZGstaW5mby1ib3gtLS5iYWMtLWFjdGl2ZS0te2hlaWdodDphdXRvO21hcmdpbi10b3A6NXB4fSNiYWMtLWluZm8tYmxvY2tzLXdyYXBwZXItLSAuYmFjLS1wdXJlc2RrLWluZm8tYm94LS0gLmJhYy0taW5uZXItaW5mby1ib3gtLXt3aWR0aDoxMDAlO3BhZGRpbmc6MTFweCAxNXB4O2NvbG9yOndoaXRlfSNiYWMtLWluZm8tYmxvY2tzLXdyYXBwZXItLSAuYmFjLS1wdXJlc2RrLWluZm8tYm94LS0gLmJhYy0taW5uZXItaW5mby1ib3gtLSBkaXZ7ZGlzcGxheTppbmxpbmUtYmxvY2s7aGVpZ2h0OjE4cHg7cG9zaXRpb246cmVsYXRpdmV9I2JhYy0taW5mby1ibG9ja3Mtd3JhcHBlci0tIC5iYWMtLXB1cmVzZGstaW5mby1ib3gtLSAuYmFjLS1pbm5lci1pbmZvLWJveC0tIGRpdi5iYWMtLWluZm8taWNvbi0te2Rpc3BsYXk6bm9uZTt0b3A6MHB4fSNiYWMtLWluZm8tYmxvY2tzLXdyYXBwZXItLSAuYmFjLS1wdXJlc2RrLWluZm8tYm94LS0gLmJhYy0taW5uZXItaW5mby1ib3gtLSAuYmFjLS1pbmZvLWljb24tLXttYXJnaW4tcmlnaHQ6MTVweDt3aWR0aDoxMHB4O3RvcDoycHh9I2JhYy0taW5mby1ibG9ja3Mtd3JhcHBlci0tIC5iYWMtLXB1cmVzZGstaW5mby1ib3gtLSAuYmFjLS1pbm5lci1pbmZvLWJveC0tIC5iYWMtLWluZm8tbWFpbi10ZXh0LS17d2lkdGg6MzgwcHg7bWFyZ2luLXJpZ2h0OjE1cHg7Zm9udC1zaXplOjEycHg7dGV4dC1hbGlnbjpjZW50ZXJ9I2JhYy0taW5mby1ibG9ja3Mtd3JhcHBlci0tIC5iYWMtLXB1cmVzZGstaW5mby1ib3gtLSAuYmFjLS1pbm5lci1pbmZvLWJveC0tIC5iYWMtLWluZm8tY2xvc2UtYnV0dG9uLS17d2lkdGg6MTBweDtjdXJzb3I6cG9pbnRlcjt0b3A6MnB4fUBtZWRpYSAobWluLXdpZHRoOiA2MDBweCl7LmJhYy0tY29udGFpbmVyLmJhYy0tZnVsbHdpZHRoIC5iYWMtLWNvbnRhaW5lcntwYWRkaW5nLWxlZnQ6MjRweDtwYWRkaW5nLXJpZ2h0OjI0cHh9fUBtZWRpYSAobWluLXdpZHRoOiA5NjBweCl7LmJhYy0tY29udGFpbmVyLmJhYy0tZnVsbHdpZHRoIC5iYWMtLWNvbnRhaW5lcntwYWRkaW5nLWxlZnQ6MzJweDtwYWRkaW5nLXJpZ2h0OjMycHh9fS5iYWMtLWN1c3RvbS1tb2RhbHtwb3NpdGlvbjpmaXhlZDt3aWR0aDo3MCU7aGVpZ2h0OjgwJTttaW4td2lkdGg6NDAwcHg7bGVmdDowO3JpZ2h0OjA7dG9wOjA7Ym90dG9tOjA7bWFyZ2luOmF1dG87Ym9yZGVyOjFweCBzb2xpZCAjOTc5Nzk3O2JvcmRlci1yYWRpdXM6NXB4O2JveC1zaGFkb3c6MCAwIDcxcHggMCAjMkYzODQ5O2JhY2tncm91bmQ6I2ZmZjt6LWluZGV4Ojk5OTtvdmVyZmxvdzphdXRvO2Rpc3BsYXk6bm9uZX0uYmFjLS1jdXN0b20tbW9kYWwuaXMtb3BlbntkaXNwbGF5OmJsb2NrfS5iYWMtLWN1c3RvbS1tb2RhbCAuY3VzdG9tLW1vZGFsX19jbG9zZS1idG57dGV4dC1kZWNvcmF0aW9uOm5vbmU7cGFkZGluZy10b3A6MnB4O2xpbmUtaGVpZ2h0OjE4cHg7aGVpZ2h0OjIwcHg7d2lkdGg6MjBweDtib3JkZXItcmFkaXVzOjUwJTtjb2xvcjojOTA5YmE0O3RleHQtYWxpZ246Y2VudGVyO3Bvc2l0aW9uOmFic29sdXRlO3RvcDoyMHB4O3JpZ2h0OjIwcHg7Zm9udC1zaXplOjIwcHh9LmJhYy0tY3VzdG9tLW1vZGFsIC5jdXN0b20tbW9kYWxfX2Nsb3NlLWJ0bjpob3Zlcnt0ZXh0LWRlY29yYXRpb246bm9uZTtjb2xvcjojNDU1MDY2O2N1cnNvcjpwb2ludGVyfS5iYWMtLWN1c3RvbS1tb2RhbCAuY3VzdG9tLW1vZGFsX193cmFwcGVye2hlaWdodDoxMDAlO2Rpc3BsYXk6ZmxleDtmbGV4LWRpcmVjdGlvbjpjb2x1bW59LmJhYy0tY3VzdG9tLW1vZGFsIC5jdXN0b20tbW9kYWxfX3dyYXBwZXIgaWZyYW1le3dpZHRoOjEwMCU7aGVpZ2h0OjEwMCV9LmJhYy0tY3VzdG9tLW1vZGFsIC5jdXN0b20tbW9kYWxfX2NvbnRlbnQtd3JhcHBlcntoZWlnaHQ6MTAwJTtvdmVyZmxvdzphdXRvO21hcmdpbi1ib3R0b206MTA0cHg7Ym9yZGVyLXRvcDoycHggc29saWQgI0M5Q0REN30uYmFjLS1jdXN0b20tbW9kYWwgLmN1c3RvbS1tb2RhbF9fY29udGVudC13cmFwcGVyLm5vLW1hcmdpbnttYXJnaW4tYm90dG9tOjB9LmJhYy0tY3VzdG9tLW1vZGFsIC5jdXN0b20tbW9kYWxfX2NvbnRlbnR7cGFkZGluZzoyMHB4O3Bvc2l0aW9uOnJlbGF0aXZlfS5iYWMtLWN1c3RvbS1tb2RhbCAuY3VzdG9tLW1vZGFsX19jb250ZW50IGgze2NvbG9yOiMyRjM4NDk7Zm9udC1zaXplOjIwcHg7Zm9udC13ZWlnaHQ6NjAwO2xpbmUtaGVpZ2h0OjI3cHh9LmJhYy0tY3VzdG9tLW1vZGFsIC5jdXN0b20tbW9kYWxfX3NhdmV7cG9zaXRpb246YWJzb2x1dGU7cmlnaHQ6MDtib3R0b206MDt3aWR0aDoxMDAlO3BhZGRpbmc6MzBweCAzMnB4O2JhY2tncm91bmQtY29sb3I6I0YyRjJGNH0uYmFjLS1jdXN0b20tbW9kYWwgLmN1c3RvbS1tb2RhbF9fc2F2ZSBhLC5iYWMtLWN1c3RvbS1tb2RhbCAuY3VzdG9tLW1vZGFsX19zYXZlIGJ1dHRvbntmb250LXNpemU6MTRweDtsaW5lLWhlaWdodDoyMnB4O2hlaWdodDo0NHB4O3dpZHRoOjEwMCV9LmJhYy0tY3VzdG9tLW1vZGFsIC5jdXN0b20tbW9kYWxfX3NwbGl0dGVye2hlaWdodDozMHB4O2xpbmUtaGVpZ2h0OjMwcHg7cGFkZGluZzowIDIwcHg7Ym9yZGVyLWNvbG9yOiNEM0QzRDM7Ym9yZGVyLXN0eWxlOnNvbGlkO2JvcmRlci13aWR0aDoxcHggMCAxcHggMDtiYWNrZ3JvdW5kLWNvbG9yOiNGMEYwRjA7Y29sb3I6IzY3NkY4Mjtmb250LXNpemU6MTNweDtmb250LXdlaWdodDo2MDB9LmJhYy0tY3VzdG9tLW1vZGFsIC5jdXN0b20tbW9kYWxfX2JveHtkaXNwbGF5OmlubGluZS1ibG9jazt2ZXJ0aWNhbC1hbGlnbjptaWRkbGU7aGVpZ2h0OjE2NXB4O3dpZHRoOjE2NXB4O2JvcmRlcjoycHggc29saWQgcmVkO2JvcmRlci1yYWRpdXM6NXB4O3RleHQtYWxpZ246Y2VudGVyO2ZvbnQtc2l6ZToxMnB4O2ZvbnQtd2VpZ2h0OjYwMDtjb2xvcjojOTA5N0E4O3RleHQtZGVjb3JhdGlvbjpub25lO21hcmdpbjoxMHB4IDIwcHggMTBweCAwO3RyYW5zaXRpb246MC4xcyBhbGx9LmJhYy0tY3VzdG9tLW1vZGFsIC5jdXN0b20tbW9kYWxfX2JveCBpe2ZvbnQtc2l6ZTo3MHB4O2Rpc3BsYXk6YmxvY2s7bWFyZ2luOjI1cHggMH0uYmFjLS1jdXN0b20tbW9kYWwgLmN1c3RvbS1tb2RhbF9fYm94LmFjdGl2ZXtjb2xvcjp5ZWxsb3c7Ym9yZGVyLWNvbG9yOnllbGxvdzt0ZXh0LWRlY29yYXRpb246bm9uZX0uYmFjLS1jdXN0b20tbW9kYWwgLmN1c3RvbS1tb2RhbF9fYm94OmhvdmVyLC5iYWMtLWN1c3RvbS1tb2RhbCAuY3VzdG9tLW1vZGFsX19ib3g6YWN0aXZlLC5iYWMtLWN1c3RvbS1tb2RhbCAuY3VzdG9tLW1vZGFsX19ib3g6Zm9jdXN7Y29sb3I6IzFBQzBCNDtib3JkZXItY29sb3I6eWVsbG93O3RleHQtZGVjb3JhdGlvbjpub25lfS5jbG91ZC1pbWFnZXNfX2NvbnRhaW5lcntkaXNwbGF5OmZsZXg7ZmxleC13cmFwOndyYXA7anVzdGlmeS1jb250ZW50OmZsZXgtc3RhcnR9LmNsb3VkLWltYWdlc19fcGFnaW5hdGlvbntwYWRkaW5nOjIwcHh9LmNsb3VkLWltYWdlc19fcGFnaW5hdGlvbiBsaXtkaXNwbGF5OmlubGluZS1ibG9jazttYXJnaW4tcmlnaHQ6MTBweH0uY2xvdWQtaW1hZ2VzX19wYWdpbmF0aW9uIGxpIGF7Y29sb3I6I2ZmZjtiYWNrZ3JvdW5kLWNvbG9yOiM1ZTY3NzY7Ym9yZGVyLXJhZGl1czoyMHB4O3RleHQtZGVjb3JhdGlvbjpub25lO2Rpc3BsYXk6YmxvY2s7Zm9udC13ZWlnaHQ6MjAwO2hlaWdodDozNXB4O3dpZHRoOjM1cHg7bGluZS1oZWlnaHQ6MzVweDt0ZXh0LWFsaWduOmNlbnRlcn0uY2xvdWQtaW1hZ2VzX19wYWdpbmF0aW9uIGxpLmFjdGl2ZSBhe2JhY2tncm91bmQtY29sb3I6IzJmMzg0OX0uY2xvdWQtaW1hZ2VzX19pdGVte3dpZHRoOjE1NXB4O2hlaWdodDoxNzBweDtib3JkZXI6MXB4IHNvbGlkICNlZWU7YmFja2dyb3VuZC1jb2xvcjojZmZmO2JvcmRlci1yYWRpdXM6M3B4O21hcmdpbjowIDE1cHggMTVweCAwO3RleHQtYWxpZ246Y2VudGVyO3Bvc2l0aW9uOnJlbGF0aXZlO2N1cnNvcjpwb2ludGVyfS5jbG91ZC1pbWFnZXNfX2l0ZW0gLmNsb3VkLWltYWdlc19faXRlbV9fdHlwZXtoZWlnaHQ6MTE1cHg7Zm9udC1zaXplOjkwcHg7bGluZS1oZWlnaHQ6MTQwcHg7Ym9yZGVyLXRvcC1sZWZ0LXJhZGl1czozcHg7Ym9yZGVyLXRvcC1yaWdodC1yYWRpdXM6M3B4O2NvbG9yOiNhMmEyYTI7YmFja2dyb3VuZC1jb2xvcjojZTllYWVifS5jbG91ZC1pbWFnZXNfX2l0ZW0gLmNsb3VkLWltYWdlc19faXRlbV9fdHlwZT5pbWd7d2lkdGg6YXV0bztoZWlnaHQ6YXV0bzttYXgtd2lkdGg6MTAwJTttYXgtaGVpZ2h0OjEwMCV9LmNsb3VkLWltYWdlc19faXRlbSAuY2xvdWQtaW1hZ2VzX19pdGVtX19kZXRhaWxze3BhZGRpbmc6MTBweCAwfS5jbG91ZC1pbWFnZXNfX2l0ZW0gLmNsb3VkLWltYWdlc19faXRlbV9fZGV0YWlscyAuY2xvdWQtaW1hZ2VzX19pdGVtX19kZXRhaWxzX19uYW1le2ZvbnQtc2l6ZToxMnB4O291dGxpbmU6bm9uZTtwYWRkaW5nOjAgMTBweDtjb2xvcjojYTVhYmI1O2JvcmRlcjpub25lO3dpZHRoOjEwMCU7YmFja2dyb3VuZC1jb2xvcjp0cmFuc3BhcmVudDtoZWlnaHQ6MTVweDtkaXNwbGF5OmlubGluZS1ibG9jazt3b3JkLWJyZWFrOmJyZWFrLWFsbH0uY2xvdWQtaW1hZ2VzX19pdGVtIC5jbG91ZC1pbWFnZXNfX2l0ZW1fX2RldGFpbHMgLmNsb3VkLWltYWdlc19faXRlbV9fZGV0YWlsc19fZGF0ZXtmb250LXNpemU6MTBweDtib3R0b206NnB4O3dpZHRoOjE1NXB4O2hlaWdodDoxNXB4O2NvbG9yOiNhNWFiYjU7ZGlzcGxheTppbmxpbmUtYmxvY2t9LmNsb3VkLWltYWdlc19faXRlbSAuY2xvdWQtaW1hZ2VzX19pdGVtX19hY3Rpb25ze2Rpc3BsYXk6ZmxleDthbGlnbi1pdGVtczpjZW50ZXI7anVzdGlmeS1jb250ZW50OmNlbnRlcjtwb3NpdGlvbjphYnNvbHV0ZTt0b3A6MDtsZWZ0OjA7d2lkdGg6MTAwJTtoZWlnaHQ6MTE1cHg7YmFja2dyb3VuZC1jb2xvcjpyZ2JhKDc4LDgzLDkxLDAuODMpO29wYWNpdHk6MDt2aXNpYmlsaXR5OmhpZGRlbjtib3JkZXItdG9wLWxlZnQtcmFkaXVzOjNweDtib3JkZXItdG9wLXJpZ2h0LXJhZGl1czozcHg7dGV4dC1hbGlnbjpjZW50ZXI7dHJhbnNpdGlvbjowLjNzIG9wYWNpdHl9LmNsb3VkLWltYWdlc19faXRlbSAuY2xvdWQtaW1hZ2VzX19pdGVtX19hY3Rpb25zIGF7Zm9udC1zaXplOjE2cHg7Y29sb3I6I2ZmZjt0ZXh0LWRlY29yYXRpb246bm9uZX0uY2xvdWQtaW1hZ2VzX19pdGVtOmhvdmVyIC5jbG91ZC1pbWFnZXNfX2l0ZW0gLmNsb3VkLWltYWdlc19faXRlbV9fYWN0aW9uc3tvcGFjaXR5OjE7dmlzaWJpbGl0eTp2aXNpYmxlfScsXG4gICAgaGVhZCA9IGRvY3VtZW50LmhlYWQgfHwgZG9jdW1lbnQuZ2V0RWxlbWVudHNCeVRhZ05hbWUoJ2hlYWQnKVswXSxcbiAgICBzdHlsZSA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoJ3N0eWxlJyk7XG5cbnN0eWxlLnR5cGUgPSAndGV4dC9jc3MnO1xuaWYgKHN0eWxlLnN0eWxlU2hlZXQpIHtcbiAgICBzdHlsZS5zdHlsZVNoZWV0LmNzc1RleHQgPSBjc3M7XG59IGVsc2Uge1xuICAgIHN0eWxlLmFwcGVuZENoaWxkKGRvY3VtZW50LmNyZWF0ZVRleHROb2RlKGNzcykpO1xufVxuaGVhZC5hcHBlbmRDaGlsZChzdHlsZSk7XG5cbnZhciBsaW5rID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudCgnbGluaycpO1xubGluay5ocmVmID0gJ2h0dHBzOi8vYWNjZXNzLWZvbnRzLnB1cmVwcm9maWxlLmNvbS9zdHlsZXMuY3NzJztcbmxpbmsucmVsID0gJ3N0eWxlc2hlZXQnO1xuXG5kb2N1bWVudC5nZXRFbGVtZW50c0J5VGFnTmFtZSgnaGVhZCcpWzBdLmFwcGVuZENoaWxkKGxpbmspO1xuXG5tb2R1bGUuZXhwb3J0cyA9IHBwYmE7IiwidmFyIFN0b3JlID0gcmVxdWlyZSgnLi9zdG9yZScpO1xudmFyIExvZ2dlciA9IHJlcXVpcmUoJy4vbG9nZ2VyJyk7XG52YXIgRG9tID0gcmVxdWlyZSgnLi9kb20nKTtcbnZhciBDYWxsZXIgPSByZXF1aXJlKCcuL2NhbGxlcicpO1xuXG52YXIgdXBsb2FkaW5nID0gZmFsc2U7XG5cbnZhciBBdmF0YXJDdHJsID0ge1xuXHRfc3VibWl0OiBudWxsLFxuXHRfZmlsZTogbnVsbCxcblx0X3Byb2dyZXNzOiBudWxsLFxuXHRfc2lkZWJhcl9hdmF0YXI6IG51bGwsXG5cdF90b3BfYXZhdGFyOiBudWxsLFxuXHRfdG9wX2F2YXRhcl9jb250YWluZXI6IG51bGwsXG5cblx0aW5pdDogZnVuY3Rpb24gaW5pdCgpIHtcblx0XHRBdmF0YXJDdHJsLl9zdWJtaXQgPSBkb2N1bWVudC5nZXRFbGVtZW50QnlJZCgnYmFjLS0tcHVyZXNkay1hdmF0YXItc3VibWl0Jyk7XG5cdFx0QXZhdGFyQ3RybC5fZmlsZSA9IGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKCdiYWMtLS1wdXJlc2RrLWF2YXRhci1maWxlJyk7XG5cdFx0QXZhdGFyQ3RybC5fdG9wX2F2YXRhcl9jb250YWluZXIgPSBkb2N1bWVudC5nZXRFbGVtZW50QnlJZCgnYmFjLS1pbWFnZS1jb250YWluZXItdG9wJyk7XG5cdFx0QXZhdGFyQ3RybC5fcHJvZ3Jlc3MgPSBkb2N1bWVudC5nZXRFbGVtZW50QnlJZCgnYmFjLS11c2VyLWltYWdlLXVwbG9hZC1wcm9ncmVzcycpO1xuXHRcdEF2YXRhckN0cmwuX3NpZGViYXJfYXZhdGFyID0gZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoJ2JhYy0tdXNlci1pbWFnZS1maWxlJyk7XG5cdFx0QXZhdGFyQ3RybC5fdG9wX2F2YXRhciA9IGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKCdiYWMtLXVzZXItYXZhdGFyLXRvcCcpO1xuXHRcdEF2YXRhckN0cmwuX2ZpbGUuYWRkRXZlbnRMaXN0ZW5lcignY2xpY2snLCBmdW5jdGlvbiAoZSkge1xuXHRcdFx0ZS5zdG9wUHJvcGFnYXRpb24oKTtcblx0XHR9KTtcblx0XHRBdmF0YXJDdHJsLl9maWxlLmFkZEV2ZW50TGlzdGVuZXIoJ2NoYW5nZScsIGZ1bmN0aW9uIChlKSB7XG5cdFx0XHRBdmF0YXJDdHJsLnVwbG9hZCgpO1xuXHRcdH0pO1xuXG5cdFx0ZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoJ2JhYy0tdXNlci1pbWFnZScpLmFkZEV2ZW50TGlzdGVuZXIoJ2NsaWNrJywgZnVuY3Rpb24gKGUpIHtcblx0XHRcdGUuc3RvcFByb3BhZ2F0aW9uKCk7XG5cdFx0XHRBdmF0YXJDdHJsLl9maWxlLmNsaWNrKCk7XG5cdFx0fSk7XG5cdH0sXG5cblx0dXBsb2FkOiBmdW5jdGlvbiB1cGxvYWQoKSB7XG5cdFx0aWYgKHVwbG9hZGluZykge1xuXHRcdFx0cmV0dXJuO1xuXHRcdH1cblx0XHR1cGxvYWRpbmcgPSB0cnVlO1xuXG5cdFx0aWYgKEF2YXRhckN0cmwuX2ZpbGUuZmlsZXMubGVuZ3RoID09PSAwKSB7XG5cdFx0XHRyZXR1cm47XG5cdFx0fVxuXG5cdFx0dmFyIGRhdGEgPSBuZXcgRm9ybURhdGEoKTtcblx0XHRkYXRhLmFwcGVuZCgnZmlsZScsIEF2YXRhckN0cmwuX2ZpbGUuZmlsZXNbMF0pO1xuXG5cdFx0dmFyIHN1Y2Nlc3NDYWxsYmFjayA9IGZ1bmN0aW9uIHN1Y2Nlc3NDYWxsYmFjayhkYXRhKSB7XG5cdFx0XHQ7XG5cdFx0fTtcblxuXHRcdHZhciBmYWlsQ2FsbGJhY2sgPSBmdW5jdGlvbiBmYWlsQ2FsbGJhY2soZGF0YSkge1xuXHRcdFx0O1xuXHRcdH07XG5cblx0XHR2YXIgcmVxdWVzdCA9IG5ldyBYTUxIdHRwUmVxdWVzdCgpO1xuXHRcdHJlcXVlc3Qub25yZWFkeXN0YXRlY2hhbmdlID0gZnVuY3Rpb24gKCkge1xuXHRcdFx0dXBsb2FkaW5nID0gZmFsc2U7XG5cdFx0XHRpZiAocmVxdWVzdC5yZWFkeVN0YXRlID09IDQpIHtcblx0XHRcdFx0dHJ5IHtcblx0XHRcdFx0XHR2YXIgaW1hZ2VEYXRhID0gSlNPTi5wYXJzZShyZXF1ZXN0LnJlc3BvbnNlKS5kYXRhO1xuXHRcdFx0XHRcdEF2YXRhckN0cmwuc2V0QXZhdGFyKGltYWdlRGF0YS51cmwpO1xuXHRcdFx0XHRcdENhbGxlci5tYWtlQ2FsbCh7XG5cdFx0XHRcdFx0XHR0eXBlOiAnUFVUJyxcblx0XHRcdFx0XHRcdGVuZHBvaW50OiBTdG9yZS5nZXRBdmF0YXJVcGRhdGVVcmwoKSxcblx0XHRcdFx0XHRcdHBhcmFtczoge1xuXHRcdFx0XHRcdFx0XHR1c2VyOiB7XG5cdFx0XHRcdFx0XHRcdFx0YXZhdGFyX3V1aWQ6IGltYWdlRGF0YS5ndWlkXG5cdFx0XHRcdFx0XHRcdH1cblx0XHRcdFx0XHRcdH0sXG5cdFx0XHRcdFx0XHRjYWxsYmFja3M6IHtcblx0XHRcdFx0XHRcdFx0c3VjY2Vzczogc3VjY2Vzc0NhbGxiYWNrLFxuXHRcdFx0XHRcdFx0XHRmYWlsOiBmYWlsQ2FsbGJhY2tcblx0XHRcdFx0XHRcdH1cblx0XHRcdFx0XHR9KTtcblx0XHRcdFx0fSBjYXRjaCAoZSkge1xuXHRcdFx0XHRcdHZhciByZXNwID0ge1xuXHRcdFx0XHRcdFx0c3RhdHVzOiAnZXJyb3InLFxuXHRcdFx0XHRcdFx0ZGF0YTogJ1Vua25vd24gZXJyb3Igb2NjdXJyZWQ6IFsnICsgcmVxdWVzdC5yZXNwb25zZVRleHQgKyAnXSdcblx0XHRcdFx0XHR9O1xuXHRcdFx0XHR9XG5cdFx0XHRcdExvZ2dlci5sb2cocmVxdWVzdC5yZXNwb25zZS5zdGF0dXMgKyAnOiAnICsgcmVxdWVzdC5yZXNwb25zZS5kYXRhKTtcblx0XHRcdH1cblx0XHR9O1xuXG5cdFx0Ly8gcmVxdWVzdC51cGxvYWQuYWRkRXZlbnRMaXN0ZW5lcigncHJvZ3Jlc3MnLCBmdW5jdGlvbihlKXtcblx0XHQvLyBcdExvZ2dlci5sb2coZS5sb2FkZWQvZS50b3RhbCk7XG5cdFx0Ly8gXHRBdmF0YXJDdHJsLl9wcm9ncmVzcy5zdHlsZS50b3AgPSAxMDAgLSAoZS5sb2FkZWQvZS50b3RhbCkgKiAxMDAgKyAnJSc7XG5cdFx0Ly8gfSwgZmFsc2UpO1xuXG5cdFx0dmFyIHVybCA9IFN0b3JlLmdldEF2YXRhclVwbG9hZFVybCgpO1xuXHRcdERvbS5hZGRDbGFzcyhBdmF0YXJDdHJsLl9wcm9ncmVzcywgJ2JhYy0tcHVyZXNkay12aXNpYmxlJyk7XG5cdFx0cmVxdWVzdC5vcGVuKCdQT1NUJywgdXJsKTtcblx0XHRyZXF1ZXN0LnNlbmQoZGF0YSk7XG5cdH0sXG5cblx0c2V0QXZhdGFyOiBmdW5jdGlvbiBzZXRBdmF0YXIodXJsKSB7XG5cdFx0aWYgKCF1cmwpIHtcblx0XHRcdHJldHVybjtcblx0XHR9XG5cblx0XHREb20ucmVtb3ZlQ2xhc3MoQXZhdGFyQ3RybC5fcHJvZ3Jlc3MsICdiYWMtLXB1cmVzZGstdmlzaWJsZScpO1xuXHRcdERvbS5hZGRDbGFzcyhBdmF0YXJDdHJsLl9zaWRlYmFyX2F2YXRhciwgJ2JhYy0tcHVyZXNkay12aXNpYmxlJyk7XG5cdFx0dmFyIGltZyA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoJ2ltZycpO1xuXHRcdGltZy5zcmMgPSB1cmw7XG5cdFx0QXZhdGFyQ3RybC5fc2lkZWJhcl9hdmF0YXIuaW5uZXJIVE1MID0gJyc7XG5cdFx0QXZhdGFyQ3RybC5fc2lkZWJhcl9hdmF0YXIuYXBwZW5kQ2hpbGQoaW1nKTtcblxuXHRcdERvbS5hZGRDbGFzcyhBdmF0YXJDdHJsLl90b3BfYXZhdGFyX2NvbnRhaW5lciwgJ2JhYy0tcHVyZXNkay12aXNpYmxlJyk7XG5cdFx0dmFyIGltZ18yID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudCgnaW1nJyk7XG5cdFx0aW1nXzIuc3JjID0gdXJsO1xuXHRcdEF2YXRhckN0cmwuX3RvcF9hdmF0YXJfY29udGFpbmVyLmlubmVySFRNTCA9ICcnO1xuXHRcdEF2YXRhckN0cmwuX3RvcF9hdmF0YXJfY29udGFpbmVyLmFwcGVuZENoaWxkKGltZ18yKTtcblxuXHRcdC8vICBiYWMtLWltYWdlLWNvbnRhaW5lci10b3Bcblx0fVxufTtcblxubW9kdWxlLmV4cG9ydHMgPSBBdmF0YXJDdHJsOyIsInZhciBTdG9yZSA9IHJlcXVpcmUoJy4vc3RvcmUuanMnKTtcbnZhciBMb2dnZXIgPSByZXF1aXJlKCcuL2xvZ2dlcicpO1xuXG52YXIgcGFyYW1zVG9HZXRWYXJzID0gZnVuY3Rpb24gcGFyYW1zVG9HZXRWYXJzKHBhcmFtcykge1xuXHR2YXIgdG9SZXR1cm4gPSBbXTtcblx0Zm9yICh2YXIgcHJvcGVydHkgaW4gcGFyYW1zKSB7XG5cdFx0aWYgKHBhcmFtcy5oYXNPd25Qcm9wZXJ0eShwcm9wZXJ0eSkpIHtcblx0XHRcdHRvUmV0dXJuLnB1c2gocHJvcGVydHkgKyAnPScgKyBwYXJhbXNbcHJvcGVydHldKTtcblx0XHR9XG5cdH1cblxuXHRyZXR1cm4gdG9SZXR1cm4uam9pbignJicpO1xufTtcblxudmFyIGRldktleXMgPSBudWxsO1xuXG52YXIgQ2FsbGVyID0ge1xuXHQvKlxuIGlmIHRoZSB1c2VyIHNldHNcbiAgKi9cblx0c2V0RGV2S2V5czogZnVuY3Rpb24gc2V0RGV2S2V5cyhrZXlzKSB7XG5cdFx0ZGV2S2V5cyA9IGtleXM7XG5cdH0sXG5cblx0LypcbiBleHBlY3RlIGF0dHJpYnV0ZXM6XG4gLSB0eXBlIChlaXRoZXIgR0VULCBQT1NULCBERUxFVEUsIFBVVClcbiAtIGVuZHBvaW50XG4gLSBwYXJhbXMgKGlmIGFueS4gQSBqc29uIHdpdGggcGFyYW1ldGVycyB0byBiZSBwYXNzZWQgYmFjayB0byB0aGUgZW5kcG9pbnQpXG4gLSBjYWxsYmFja3M6IGFuIG9iamVjdCB3aXRoOlxuIFx0LSBzdWNjZXNzOiB0aGUgc3VjY2VzcyBjYWxsYmFja1xuIFx0LSBmYWlsOiB0aGUgZmFpbCBjYWxsYmFja1xuICAqL1xuXHRtYWtlQ2FsbDogZnVuY3Rpb24gbWFrZUNhbGwoYXR0cnMpIHtcblx0XHR2YXIgZW5kcG9pbnRVcmwgPSBhdHRycy5lbmRwb2ludDtcblxuXHRcdHZhciB4aHIgPSBuZXcgWE1MSHR0cFJlcXVlc3QoKTtcblxuXHRcdGlmIChhdHRycy50eXBlID09PSAnR0VUJyAmJiBhdHRycy5wYXJhbXMpIHtcblx0XHRcdGVuZHBvaW50VXJsID0gZW5kcG9pbnRVcmwgKyBcIj9cIiArIHBhcmFtc1RvR2V0VmFycyhhdHRycy5wYXJhbXMpO1xuXHRcdH1cblxuXHRcdHhoci5vcGVuKGF0dHJzLnR5cGUsIGVuZHBvaW50VXJsKTtcblxuXHRcdGlmIChkZXZLZXlzICE9IG51bGwpIHtcblx0XHRcdHhoci5zZXRSZXF1ZXN0SGVhZGVyKCd4LXBwLXNlY3JldCcsIGRldktleXMuc2VjcmV0KTtcblx0XHRcdHhoci5zZXRSZXF1ZXN0SGVhZGVyKCd4LXBwLWtleScsIGRldktleXMua2V5KTtcblx0XHR9XG5cdFx0eGhyLndpdGhDcmVkZW50aWFscyA9IHRydWU7XG5cdFx0eGhyLnNldFJlcXVlc3RIZWFkZXIoJ0NvbnRlbnQtVHlwZScsICdhcHBsaWNhdGlvbi9qc29uJyk7XG5cdFx0eGhyLm9ubG9hZCA9IGZ1bmN0aW9uICgpIHtcblx0XHRcdGlmICh4aHIuc3RhdHVzID49IDIwMCAmJiB4aHIuc3RhdHVzIDwgMzAwKSB7XG5cdFx0XHRcdGF0dHJzLmNhbGxiYWNrcy5zdWNjZXNzKEpTT04ucGFyc2UoeGhyLnJlc3BvbnNlVGV4dCkpO1xuXHRcdFx0fSBlbHNlIGlmICh4aHIuc3RhdHVzICE9PSAyMDApIHtcblx0XHRcdFx0YXR0cnMuY2FsbGJhY2tzLmZhaWwoSlNPTi5wYXJzZSh4aHIucmVzcG9uc2VUZXh0KSk7XG5cdFx0XHR9XG5cdFx0fTtcblxuXHRcdGlmICghYXR0cnMucGFyYW1zKSB7XG5cdFx0XHRhdHRycy5wYXJhbXMgPSB7fTtcblx0XHR9XG5cdFx0eGhyLnNlbmQoSlNPTi5zdHJpbmdpZnkoYXR0cnMucGFyYW1zKSk7XG5cdH0sXG5cblx0cHJvbWlzZUNhbGw6IGZ1bmN0aW9uIHByb21pc2VDYWxsKGF0dHJzKSB7XG5cdFx0cmV0dXJuIG5ldyBQcm9taXNlKGZ1bmN0aW9uIChyZXNvbHZlLCByZWplY3QpIHtcblx0XHRcdHZhciB4aHIgPSBuZXcgWE1MSHR0cFJlcXVlc3QoKTtcblxuXHRcdFx0aWYgKGF0dHJzLnR5cGUgPT09ICdHRVQnICYmIGF0dHJzLnBhcmFtcykge1xuXHRcdFx0XHRlbmRwb2ludFVybCA9IGVuZHBvaW50VXJsICsgXCI/XCIgKyBwYXJhbXNUb0dldFZhcnMoYXR0cnMucGFyYW1zKTtcblx0XHRcdH1cblxuXHRcdFx0eGhyLm9wZW4oYXR0cnMudHlwZSwgYXR0cnMuZW5kcG9pbnQpO1xuXHRcdFx0eGhyLndpdGhDcmVkZW50aWFscyA9IHRydWU7XG5cblx0XHRcdGlmIChkZXZLZXlzICE9IG51bGwpIHtcblx0XHRcdFx0eGhyLnNldFJlcXVlc3RIZWFkZXIoJ3gtcHAtc2VjcmV0JywgZGV2S2V5cy5zZWNyZXQpO1xuXHRcdFx0XHR4aHIuc2V0UmVxdWVzdEhlYWRlcigneC1wcC1rZXknLCBkZXZLZXlzLmtleSk7XG5cdFx0XHR9XG5cblx0XHRcdHhoci5zZXRSZXF1ZXN0SGVhZGVyKCdDb250ZW50LVR5cGUnLCAnYXBwbGljYXRpb24vanNvbicpO1xuXHRcdFx0eGhyLm9ubG9hZCA9IGZ1bmN0aW9uICgpIHtcblx0XHRcdFx0aWYgKHRoaXMuc3RhdHVzID49IDIwMCAmJiB0aGlzLnN0YXR1cyA8IDMwMCkge1xuXHRcdFx0XHRcdGF0dHJzLm1pZGRsZXdhcmVzLnN1Y2Nlc3MoSlNPTi5wYXJzZSh4aHIucmVzcG9uc2VUZXh0KSk7XG5cdFx0XHRcdFx0cmVzb2x2ZShKU09OLnBhcnNlKHhoci5yZXNwb25zZVRleHQpKTtcblx0XHRcdFx0fSBlbHNlIHtcblx0XHRcdFx0XHR3aW5kb3cubG9jYXRpb24uaHJlZiA9IFN0b3JlLmdldExvZ2luVXJsKCk7XG5cdFx0XHRcdH1cblx0XHRcdH07XG5cdFx0XHR4aHIub25lcnJvciA9IGZ1bmN0aW9uICgpIHtcblx0XHRcdFx0d2luZG93LmxvY2F0aW9uID0gU3RvcmUuZ2V0TG9naW5VcmwoKTtcblx0XHRcdH07XG5cdFx0XHR4aHIuc2VuZCgpO1xuXHRcdH0pO1xuXHR9XG59O1xuXG5tb2R1bGUuZXhwb3J0cyA9IENhbGxlcjsiLCJ2YXIgZGVib3VuY2VkVGltZW91dCA9IG51bGw7XG52YXIgY3VycmVudFF1ZXJ5ID0gJyc7XG52YXIgbGltaXQgPSA4O1xudmFyIGxhdGVuY3kgPSA1MDA7XG52YXIgaW5pdE9wdGlvbnMgPSB2b2lkIDA7XG52YXIgY3VycmVudFBhZ2UgPSAxO1xudmFyIG1ldGFEYXRhID0gbnVsbDtcbnZhciBpdGVtcyA9IFtdO1xudmFyIHBhZ2luYXRpb25EYXRhID0gbnVsbDtcblxudmFyIFBhZ2luYXRpb25IZWxwZXIgPSByZXF1aXJlKCcuL3BhZ2luYXRpb24taGVscGVyJyk7XG52YXIgQ2FsbGVyID0gcmVxdWlyZSgnLi9jYWxsZXInKTtcbnZhciBTdG9yZSA9IHJlcXVpcmUoJy4vc3RvcmUnKTtcbnZhciBEb20gPSByZXF1aXJlKCcuL2RvbScpO1xuXG52YXIgQ2xvdWRpbmFyeVBpY2tlciA9IHtcblxuXHRcdGluaXRpYWxpc2U6IGZ1bmN0aW9uIGluaXRpYWxpc2UoKSB7XG5cdFx0XHRcdGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKCdiYWMtLWNsb3VkaW5hcnktLWNsb3NlYnRuJykub25jbGljayA9IGZ1bmN0aW9uIChlKSB7XG5cdFx0XHRcdFx0XHRDbG91ZGluYXJ5UGlja2VyLmNsb3NlTW9kYWwoKTtcblx0XHRcdFx0fTtcblx0XHRcdFx0ZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoJ2JhYy0tY2xvdWRpbmFyeS0tc2VhcmNoLWlucHV0Jykub25rZXl1cCA9IGZ1bmN0aW9uIChlKSB7XG5cdFx0XHRcdFx0XHRDbG91ZGluYXJ5UGlja2VyLmhhbmRsZVNlYXJjaChlKTtcblx0XHRcdFx0fTtcblx0XHRcdFx0ZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoJ2JhYy0tY2xvdWRpbmFyeS0tZ28tYmFjaycpLm9uY2xpY2sgPSBmdW5jdGlvbiAoZSkge1xuXHRcdFx0XHRcdFx0Q2xvdWRpbmFyeVBpY2tlci5nb0JhY2soKTtcblx0XHRcdFx0fTtcblx0XHR9LFxuXG5cdFx0LypcbiAgb3B0aW9uczoge1xuICBcdG9uU2VsZWN0OiBpdCBleHBlY3RzIGEgZnVuY3Rpb24uIFRoaXMgZnVuY3Rpb24gd2lsbCBiZSBpbnZva2VkIGV4YWN0bHkgYXQgdGhlIG1vbWVudCB0aGUgdXNlciBwaWNrc1xuICBcdFx0YSBmaWxlIGZyb20gY2xvdWRpbmFyeS4gVGhlIGZ1bmN0aW9uIHdpbGwgdGFrZSBqdXN0IG9uZSBwYXJhbSB3aGljaCBpcyB0aGUgc2VsZWN0ZWQgaXRlbSBvYmplY3RcbiAgICBjbG9zZU9uRXNjOiB0cnVlIC8gZmFsc2VcbiAgfVxuICAgKi9cblx0XHRvcGVuTW9kYWw6IGZ1bmN0aW9uIG9wZW5Nb2RhbChvcHRpb25zKSB7XG5cdFx0XHRcdENsb3VkaW5hcnlQaWNrZXIuaW5pdGlhbGlzZSgpO1xuXHRcdFx0XHRpbml0T3B0aW9ucyA9IG9wdGlvbnM7XG5cdFx0XHRcdERvbS5hZGRDbGFzcyhkb2N1bWVudC5nZXRFbGVtZW50QnlJZCgnYmFjLS1jbG91ZGluYXJ5LS1tb2RhbCcpLCAnaXMtb3BlbicpO1xuXHRcdFx0XHRDbG91ZGluYXJ5UGlja2VyLmdldEltYWdlcyh7XG5cdFx0XHRcdFx0XHRwYWdlOiAxLFxuXHRcdFx0XHRcdFx0bGltaXQ6IGxpbWl0XG5cdFx0XHRcdH0pO1xuXHRcdH0sXG5cblx0XHRjbG9zZU1vZGFsOiBmdW5jdGlvbiBjbG9zZU1vZGFsKCkge1xuXHRcdFx0XHREb20ucmVtb3ZlQ2xhc3MoZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoJ2JhYy0tY2xvdWRpbmFyeS0tbW9kYWwnKSwgJ2lzLW9wZW4nKTtcblx0XHR9LFxuXG5cdFx0Z2V0SW1hZ2VzOiBmdW5jdGlvbiBnZXRJbWFnZXMob3B0aW9ucykge1xuXHRcdFx0XHQvLyBUT0RPIG1ha2UgdGhlIGNhbGwgYW5kIGdldCB0aGUgaW1hZ2VzXG5cblx0XHRcdFx0Q2FsbGVyLm1ha2VDYWxsKHtcblx0XHRcdFx0XHRcdHR5cGU6ICdHRVQnLFxuXHRcdFx0XHRcdFx0ZW5kcG9pbnQ6IFN0b3JlLmdldENsb3VkaW5hcnlFbmRwb2ludCgpLFxuXHRcdFx0XHRcdFx0cGFyYW1zOiBvcHRpb25zLFxuXHRcdFx0XHRcdFx0Y2FsbGJhY2tzOiB7XG5cdFx0XHRcdFx0XHRcdFx0c3VjY2VzczogZnVuY3Rpb24gc3VjY2VzcyhyZXN1bHQpIHtcblx0XHRcdFx0XHRcdFx0XHRcdFx0Q2xvdWRpbmFyeVBpY2tlci5vbkltYWdlc1Jlc3BvbnNlKHJlc3VsdCk7XG5cdFx0XHRcdFx0XHRcdFx0fSxcblx0XHRcdFx0XHRcdFx0XHRmYWlsOiBmdW5jdGlvbiBmYWlsKGVycikge1xuXHRcdFx0XHRcdFx0XHRcdFx0XHRhbGVydChlcnIpO1xuXHRcdFx0XHRcdFx0XHRcdH1cblx0XHRcdFx0XHRcdH1cblx0XHRcdFx0fSk7XG5cdFx0fSxcblxuXHRcdGhhbmRsZVNlYXJjaDogZnVuY3Rpb24gaGFuZGxlU2VhcmNoKGUpIHtcblx0XHRcdFx0aWYgKGRlYm91bmNlZFRpbWVvdXQpIHtcblx0XHRcdFx0XHRcdGNsZWFyVGltZW91dChkZWJvdW5jZWRUaW1lb3V0KTtcblx0XHRcdFx0fVxuXG5cdFx0XHRcdGlmIChlLnRhcmdldC52YWx1ZSA9PT0gY3VycmVudFF1ZXJ5KSB7XG5cdFx0XHRcdFx0XHRyZXR1cm47XG5cdFx0XHRcdH1cblxuXHRcdFx0XHR2YXIgcXVlcnkgPSBlLnRhcmdldC52YWx1ZTtcblxuXHRcdFx0XHRjdXJyZW50UXVlcnkgPSBxdWVyeTtcblxuXHRcdFx0XHR2YXIgb3B0aW9ucyA9IHtcblx0XHRcdFx0XHRcdHBhZ2U6IDEsXG5cdFx0XHRcdFx0XHRsaW1pdDogbGltaXQsXG5cdFx0XHRcdFx0XHRxdWVyeTogcXVlcnlcblx0XHRcdFx0fTtcblxuXHRcdFx0XHRkZWJvdW5jZWRUaW1lb3V0ID0gc2V0VGltZW91dChmdW5jdGlvbiAoKSB7XG5cdFx0XHRcdFx0XHRDbG91ZGluYXJ5UGlja2VyLmdldEltYWdlcyhvcHRpb25zKTtcblx0XHRcdFx0fSwgbGF0ZW5jeSk7XG5cdFx0fSxcblxuXHRcdGl0ZW1TZWxlY3RlZDogZnVuY3Rpb24gaXRlbVNlbGVjdGVkKGl0ZW0sIGUpIHtcblxuXHRcdFx0XHRpZiAoaXRlbS50eXBlID09ICdmb2xkZXInKSB7XG5cblx0XHRcdFx0XHRcdHZhciBwYXJhbXMgPSB7XG5cdFx0XHRcdFx0XHRcdFx0cGFnZTogMSxcblx0XHRcdFx0XHRcdFx0XHRsaW1pdDogbGltaXQsXG5cdFx0XHRcdFx0XHRcdFx0cGFyZW50OiBpdGVtLmlkXG5cdFx0XHRcdFx0XHR9O1xuXG5cdFx0XHRcdFx0XHQvLyBUT0RPIHNldCBzZWFyY2ggaW5wdXQncyB2YWx1ZSA9ICcnXG5cdFx0XHRcdFx0XHRjdXJyZW50UXVlcnkgPSAnJztcblxuXHRcdFx0XHRcdFx0Q2xvdWRpbmFyeVBpY2tlci5nZXRJbWFnZXMocGFyYW1zKTtcblx0XHRcdFx0fSBlbHNlIHtcblx0XHRcdFx0XHRcdGluaXRPcHRpb25zLm9uU2VsZWN0KGl0ZW0pO1xuXHRcdFx0XHRcdFx0Q2xvdWRpbmFyeVBpY2tlci5jbG9zZU1vZGFsKCk7XG5cdFx0XHRcdH1cblx0XHR9LFxuXG5cdFx0b25JbWFnZXNSZXNwb25zZTogZnVuY3Rpb24gb25JbWFnZXNSZXNwb25zZShkYXRhKSB7XG5cblx0XHRcdFx0cGFnaW5hdGlvbkRhdGEgPSBQYWdpbmF0aW9uSGVscGVyLmdldFBhZ2VzUmFuZ2UoY3VycmVudFBhZ2UsIE1hdGguY2VpbChkYXRhLm1ldGEudG90YWwgLyBsaW1pdCkpO1xuXG5cdFx0XHRcdG1ldGFEYXRhID0gZGF0YS5tZXRhO1xuXHRcdFx0XHRpdGVtcyA9IGRhdGEuYXNzZXRzO1xuXG5cdFx0XHRcdENsb3VkaW5hcnlQaWNrZXIucmVuZGVyKCk7XG5cdFx0fSxcblxuXHRcdHJlbmRlclBhZ2luYXRpb25CdXR0b25zOiBmdW5jdGlvbiByZW5kZXJQYWdpbmF0aW9uQnV0dG9ucygpIHtcblx0XHRcdFx0dmFyIHRvUmV0dXJuID0gW107XG5cblx0XHRcdFx0dmFyIGNyZWF0ZVBhZ2luYXRpb25FbGVtZW50ID0gZnVuY3Rpb24gY3JlYXRlUGFnaW5hdGlvbkVsZW1lbnQoYUNsYXNzTmFtZSwgYUZ1bmN0aW9uLCBzcGFuQ2xhc3NOYW1lLCBzcGFuQ29udGVudCkge1xuXHRcdFx0XHRcdFx0dmFyIGxpID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudCgnbGknKTtcblx0XHRcdFx0XHRcdHZhciBhID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudCgnYScpO1xuXHRcdFx0XHRcdFx0bGkuY2xhc3NOYW1lID0gYUNsYXNzTmFtZTtcblx0XHRcdFx0XHRcdGEub25jbGljayA9IGFGdW5jdGlvbjtcblx0XHRcdFx0XHRcdHZhciBzcGFuID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudCgnc3BhbicpO1xuXHRcdFx0XHRcdFx0c3Bhbi5jbGFzc05hbWUgPSBzcGFuQ2xhc3NOYW1lO1xuXHRcdFx0XHRcdFx0aWYgKHNwYW5Db250ZW50KSB7XG5cdFx0XHRcdFx0XHRcdFx0c3Bhbi5pbm5lckhUTUwgPSBzcGFuQ29udGVudDtcblx0XHRcdFx0XHRcdH1cblx0XHRcdFx0XHRcdGEuYXBwZW5kQ2hpbGQoc3Bhbik7XG5cdFx0XHRcdFx0XHRsaS5hcHBlbmRDaGlsZChhKTtcblx0XHRcdFx0XHRcdHJldHVybiBsaTtcblx0XHRcdFx0fTtcblxuXHRcdFx0XHRpZiAocGFnaW5hdGlvbkRhdGEuaGFzUHJldmlvdXMpIHtcblx0XHRcdFx0XHRcdHRvUmV0dXJuLnB1c2goY3JlYXRlUGFnaW5hdGlvbkVsZW1lbnQoJ2Rpc2FibGVkJywgZnVuY3Rpb24gKGUpIHtcblx0XHRcdFx0XHRcdFx0XHRlLnByZXZlbnREZWZhdWx0KCk7XG5cdFx0XHRcdFx0XHRcdFx0Q2xvdWRpbmFyeVBpY2tlci5fZ29Ub1BhZ2UoMSk7XG5cdFx0XHRcdFx0XHR9LCAnZmEgZmEtYW5nbGUtZG91YmxlLWxlZnQnKSk7XG5cdFx0XHRcdFx0XHR0b1JldHVybi5wdXNoKGNyZWF0ZVBhZ2luYXRpb25FbGVtZW50KCdkaXNhYmxlZCcsIGZ1bmN0aW9uIChlKSB7XG5cdFx0XHRcdFx0XHRcdFx0ZS5wcmV2ZW50RGVmYXVsdCgpO1xuXHRcdFx0XHRcdFx0XHRcdENsb3VkaW5hcnlQaWNrZXIuX2dvVG9QYWdlKGN1cnJlbnRQYWdlIC0gMSk7XG5cdFx0XHRcdFx0XHR9LCAnZmEgZmEtYW5nbGUtbGVmdCcpKTtcblx0XHRcdFx0fVxuXG5cdFx0XHRcdGZvciAodmFyIGkgPSAwOyBpIDwgcGFnaW5hdGlvbkRhdGEuYnV0dG9ucy5sZW5ndGg7IGkrKykge1xuXHRcdFx0XHRcdFx0KGZ1bmN0aW9uIChpKSB7XG5cdFx0XHRcdFx0XHRcdFx0dmFyIGJ0biA9IHBhZ2luYXRpb25EYXRhLmJ1dHRvbnNbaV07XG5cdFx0XHRcdFx0XHRcdFx0dG9SZXR1cm4ucHVzaChjcmVhdGVQYWdpbmF0aW9uRWxlbWVudChidG4ucnVubmluZ3BhZ2UgPyBcImFjdGl2ZVwiIDogXCItXCIsIGZ1bmN0aW9uIChlKSB7XG5cdFx0XHRcdFx0XHRcdFx0XHRcdGUucHJldmVudERlZmF1bHQoKTtcblx0XHRcdFx0XHRcdFx0XHRcdFx0Q2xvdWRpbmFyeVBpY2tlci5fZ29Ub1BhZ2UoYnRuLnBhZ2Vubyk7XG5cdFx0XHRcdFx0XHRcdFx0fSwgJ251bWJlcicsIGJ0bi5wYWdlbm8pKTtcblx0XHRcdFx0XHRcdH0pKGkpO1xuXHRcdFx0XHR9XG5cblx0XHRcdFx0aWYgKHBhZ2luYXRpb25EYXRhLmhhc05leHQpIHtcblx0XHRcdFx0XHRcdHRvUmV0dXJuLnB1c2goY3JlYXRlUGFnaW5hdGlvbkVsZW1lbnQoJ2Rpc2FibGVkJywgZnVuY3Rpb24gKGUpIHtcblx0XHRcdFx0XHRcdFx0XHRlLnByZXZlbnREZWZhdWx0KCk7XG5cdFx0XHRcdFx0XHRcdFx0Q2xvdWRpbmFyeVBpY2tlci5fZ29Ub1BhZ2UoY3VycmVudFBhZ2UgKyAxKTtcblx0XHRcdFx0XHRcdH0sICdmYSBmYS1hbmdsZS1yaWdodCcpKTtcblx0XHRcdFx0XHRcdHRvUmV0dXJuLnB1c2goY3JlYXRlUGFnaW5hdGlvbkVsZW1lbnQoJ2Rpc2FibGVkJywgZnVuY3Rpb24gKGUpIHtcblx0XHRcdFx0XHRcdFx0XHRlLnByZXZlbnREZWZhdWx0KCk7XG5cdFx0XHRcdFx0XHRcdFx0Q2xvdWRpbmFyeVBpY2tlci5fZ29Ub1BhZ2UoTWF0aC5jZWlsKG1ldGFEYXRhLnRvdGFsIC8gbGltaXQpKTtcblx0XHRcdFx0XHRcdH0sICdmYSBmYS1hbmdsZS1kb3VibGUtcmlnaHQnKSk7XG5cdFx0XHRcdH1cblxuXHRcdFx0XHRkb2N1bWVudC5nZXRFbGVtZW50QnlJZCgnYmFjLS1jbG91ZGluYXJ5LWFjdHVhbC1wYWdpbmF0aW9uLWNvbnRhaW5lcicpLmlubmVySFRNTCA9ICcnO1xuXHRcdFx0XHRmb3IgKHZhciBfaSA9IDA7IF9pIDwgdG9SZXR1cm4ubGVuZ3RoOyBfaSsrKSB7XG5cdFx0XHRcdFx0XHRkb2N1bWVudC5nZXRFbGVtZW50QnlJZCgnYmFjLS1jbG91ZGluYXJ5LWFjdHVhbC1wYWdpbmF0aW9uLWNvbnRhaW5lcicpLmFwcGVuZENoaWxkKHRvUmV0dXJuW19pXSk7XG5cdFx0XHRcdH1cblx0XHR9LFxuXG5cdFx0X2dvVG9QYWdlOiBmdW5jdGlvbiBfZ29Ub1BhZ2UocGFnZSkge1xuXG5cdFx0XHRcdGlmIChwYWdlID09PSBjdXJyZW50UGFnZSkge1xuXHRcdFx0XHRcdFx0cmV0dXJuO1xuXHRcdFx0XHR9XG5cblx0XHRcdFx0dmFyIHBhcmFtcyA9IHtcblx0XHRcdFx0XHRcdHBhZ2U6IHBhZ2UsXG5cdFx0XHRcdFx0XHRsaW1pdDogbGltaXRcblx0XHRcdFx0fTtcblxuXHRcdFx0XHRpZiAobWV0YURhdGEuYXNzZXQpIHtcblx0XHRcdFx0XHRcdHBhcmFtcy5wYXJlbnQgPSBtZXRhRGF0YS5hc3NldDtcblx0XHRcdFx0fVxuXHRcdFx0XHRpZiAoY3VycmVudFF1ZXJ5KSB7XG5cdFx0XHRcdFx0XHRwYXJhbXMucXVlcnkgPSBjdXJyZW50UXVlcnk7XG5cdFx0XHRcdH1cblxuXHRcdFx0XHRjdXJyZW50UGFnZSA9IHBhZ2U7XG5cblx0XHRcdFx0Q2xvdWRpbmFyeVBpY2tlci5nZXRJbWFnZXMocGFyYW1zKTtcblx0XHR9LFxuXG5cdFx0Z29CYWNrOiBmdW5jdGlvbiBnb0JhY2soKSB7XG5cblx0XHRcdFx0dmFyIHBhcmFtcyA9IHtcblx0XHRcdFx0XHRcdHBhZ2U6IDEsXG5cdFx0XHRcdFx0XHRsaW1pdDogbGltaXRcblx0XHRcdFx0fTtcblx0XHRcdFx0aWYgKG1ldGFEYXRhLnBhcmVudCkge1xuXHRcdFx0XHRcdFx0cGFyYW1zLnBhcmVudCA9IG1ldGFEYXRhLnBhcmVudDtcblx0XHRcdFx0fVxuXHRcdFx0XHRpZiAoY3VycmVudFF1ZXJ5KSB7XG5cdFx0XHRcdFx0XHRwYXJhbXMucXVlcnkgPSBjdXJyZW50UXVlcnk7XG5cdFx0XHRcdH1cblx0XHRcdFx0Q2xvdWRpbmFyeVBpY2tlci5nZXRJbWFnZXMocGFyYW1zKTtcblx0XHR9LFxuXG5cdFx0cmVuZGVySXRlbXM6IGZ1bmN0aW9uIHJlbmRlckl0ZW1zKCkge1xuXHRcdFx0XHR2YXIgb25lSXRlbSA9IGZ1bmN0aW9uIG9uZUl0ZW0oaXRlbSkge1xuXHRcdFx0XHRcdFx0dmFyIGl0ZW1JY29uID0gZnVuY3Rpb24gaXRlbUljb24oKSB7XG5cdFx0XHRcdFx0XHRcdFx0aWYgKGl0ZW0udHlwZSAhPSAnZm9sZGVyJykge1xuXHRcdFx0XHRcdFx0XHRcdFx0XHRyZXR1cm4gJzxpbWcgc3JjPScgKyBpdGVtLnRodW1iICsgJyBhbHQ9XCJcIi8+Jztcblx0XHRcdFx0XHRcdFx0XHR9IGVsc2Uge1xuXHRcdFx0XHRcdFx0XHRcdFx0XHRyZXR1cm4gJzxpIGNsYXNzPVwiZmEgZmEtZm9sZGVyLW9cIj48L2k+Jztcblx0XHRcdFx0XHRcdFx0XHR9XG5cdFx0XHRcdFx0XHR9O1xuXG5cdFx0XHRcdFx0XHR2YXIgZnVuY3QgPSBmdW5jdGlvbiBmdW5jdCgpIHtcblx0XHRcdFx0XHRcdFx0XHRDbG91ZGluYXJ5UGlja2VyLml0ZW1TZWxlY3RlZChpdGVtKTtcblx0XHRcdFx0XHRcdH07XG5cblx0XHRcdFx0XHRcdHZhciBuZXdEb21FbCA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoJ2RpdicpO1xuXHRcdFx0XHRcdFx0bmV3RG9tRWwuY2xhc3NOYW1lID0gXCJjbG91ZC1pbWFnZXNfX2l0ZW1cIjtcblx0XHRcdFx0XHRcdG5ld0RvbUVsLm9uY2xpY2sgPSBmdW5jdDtcblx0XHRcdFx0XHRcdG5ld0RvbUVsLmlubmVySFRNTCA9ICdcXG5cXHRcXHRcXHRcXHRcXHRcXHQgIDxkaXYgY2xhc3M9XCJjbG91ZC1pbWFnZXNfX2l0ZW1fX3R5cGVcIj5cXG5cXHRcXHRcXHRcXHRcXHRcXHRcXHRcXHQnICsgaXRlbUljb24oKSArICdcXG5cXHRcXHRcXHRcXHRcXHRcXHQgIDwvZGl2PlxcblxcdFxcdFxcdFxcdFxcdFxcdCAgPGRpdiBjbGFzcz1cImNsb3VkLWltYWdlc19faXRlbV9fZGV0YWlsc1wiPlxcblxcdFxcdFxcdFxcdFxcdFxcdFxcdFxcdDxzcGFuIGNsYXNzPVwiY2xvdWQtaW1hZ2VzX19pdGVtX19kZXRhaWxzX19uYW1lXCI+JyArIGl0ZW0ubmFtZSArICc8L3NwYW4+XFxuXFx0XFx0XFx0XFx0XFx0XFx0XFx0XFx0PHNwYW4gY2xhc3M9XCJjbG91ZC1pbWFnZXNfX2l0ZW1fX2RldGFpbHNfX2RhdGVcIj4nICsgaXRlbS5jcmRhdGUgKyAnPC9zcGFuPlxcblxcdFxcdFxcdFxcdFxcdFxcdCAgPC9kaXY+XFxuXFx0XFx0XFx0XFx0XFx0XFx0ICA8ZGl2IGNsYXNzPVwiY2xvdWQtaW1hZ2VzX19pdGVtX19hY3Rpb25zXCI+XFxuXFx0XFx0XFx0XFx0XFx0XFx0XFx0XFx0PGEgY2xhc3M9XCJmYSBmYS1wZW5jaWxcIj48L2E+XFxuXFx0XFx0XFx0XFx0XFx0XFx0ICA8L2Rpdj4nO1xuXHRcdFx0XHRcdFx0cmV0dXJuIG5ld0RvbUVsO1xuXHRcdFx0XHR9O1xuXG5cdFx0XHRcdGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKCdiYWMtLWNsb3VkaW5hcnktaXRhbXMtY29udGFpbmVyJykuaW5uZXJIVE1MID0gJyc7XG5cdFx0XHRcdGZvciAodmFyIGkgPSAwOyBpIDwgaXRlbXMubGVuZ3RoOyBpKyspIHtcblx0XHRcdFx0XHRcdGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKCdiYWMtLWNsb3VkaW5hcnktaXRhbXMtY29udGFpbmVyJykuYXBwZW5kQ2hpbGQob25lSXRlbShpdGVtc1tpXSkpO1xuXHRcdFx0XHR9XG5cdFx0fSxcblxuXHRcdHJlbmRlcjogZnVuY3Rpb24gcmVuZGVyKCkge1xuXHRcdFx0XHRpZiAobWV0YURhdGEuYXNzZXQpIHtcblx0XHRcdFx0XHRcdERvbS5yZW1vdmVDbGFzcyhkb2N1bWVudC5nZXRFbGVtZW50QnlJZCgnYmFjLS1jbG91ZGluYXJ5LS1iYWNrLWJ1dHRvbi1jb250YWluZXInKSwgJ2hkbicpO1xuXHRcdFx0XHR9IGVsc2Uge1xuXHRcdFx0XHRcdFx0RG9tLmFkZENsYXNzKGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKCdiYWMtLWNsb3VkaW5hcnktLWJhY2stYnV0dG9uLWNvbnRhaW5lcicpLCAnaGRuJyk7XG5cdFx0XHRcdH1cblxuXHRcdFx0XHRDbG91ZGluYXJ5UGlja2VyLnJlbmRlckl0ZW1zKCk7XG5cblx0XHRcdFx0aWYgKG1ldGFEYXRhLnRvdGFsID4gbGltaXQpIHtcblx0XHRcdFx0XHRcdERvbS5yZW1vdmVDbGFzcyhkb2N1bWVudC5nZXRFbGVtZW50QnlJZCgnYmFjLS1jbG91ZGluYXJ5LXBhZ2luYXRpb24tY29udGFpbmVyJyksICdoZG4nKTtcblx0XHRcdFx0XHRcdENsb3VkaW5hcnlQaWNrZXIucmVuZGVyUGFnaW5hdGlvbkJ1dHRvbnMoKTtcblx0XHRcdFx0fSBlbHNlIHtcblx0XHRcdFx0XHRcdERvbS5hZGRDbGFzcyhkb2N1bWVudC5nZXRFbGVtZW50QnlJZCgnYmFjLS1jbG91ZGluYXJ5LXBhZ2luYXRpb24tY29udGFpbmVyJyksICdoZG4nKTtcblx0XHRcdFx0fVxuXHRcdH1cbn07XG5cbm1vZHVsZS5leHBvcnRzID0gQ2xvdWRpbmFyeVBpY2tlcjsiLCJ2YXIgRG9tID0ge1xuICAgIGhhc0NsYXNzOiBmdW5jdGlvbiBoYXNDbGFzcyhlbCwgY2xhc3NOYW1lKSB7XG4gICAgICAgIGlmIChlbC5jbGFzc0xpc3QpIHJldHVybiBlbC5jbGFzc0xpc3QuY29udGFpbnMoY2xhc3NOYW1lKTtlbHNlIHJldHVybiBuZXcgUmVnRXhwKCcoXnwgKScgKyBjbGFzc05hbWUgKyAnKCB8JCknLCAnZ2knKS50ZXN0KGVsLmNsYXNzTmFtZSk7XG4gICAgfSxcblxuICAgIHJlbW92ZUNsYXNzOiBmdW5jdGlvbiByZW1vdmVDbGFzcyhlbCwgY2xhc3NOYW1lKSB7XG4gICAgICAgIGlmIChlbC5jbGFzc0xpc3QpIGVsLmNsYXNzTGlzdC5yZW1vdmUoY2xhc3NOYW1lKTtlbHNlIGVsLmNsYXNzTmFtZSA9IGVsLmNsYXNzTmFtZS5yZXBsYWNlKG5ldyBSZWdFeHAoJyhefFxcXFxiKScgKyBjbGFzc05hbWUuc3BsaXQoJyAnKS5qb2luKCd8JykgKyAnKFxcXFxifCQpJywgJ2dpJyksICcgJyk7XG4gICAgfSxcblxuICAgIGFkZENsYXNzOiBmdW5jdGlvbiBhZGRDbGFzcyhlbCwgY2xhc3NOYW1lKSB7XG4gICAgICAgIGlmIChlbC5jbGFzc0xpc3QpIGVsLmNsYXNzTGlzdC5hZGQoY2xhc3NOYW1lKTtlbHNlIGVsLmNsYXNzTmFtZSArPSAnICcgKyBjbGFzc05hbWU7XG4gICAgfSxcblxuICAgIHRvZ2dsZUNsYXNzOiBmdW5jdGlvbiB0b2dnbGVDbGFzcyhlbCwgY2xhc3NOYW1lKSB7XG4gICAgICAgIGlmICh0aGlzLmhhc0NsYXNzKGVsLCBjbGFzc05hbWUpKSB7XG4gICAgICAgICAgICB0aGlzLnJlbW92ZUNsYXNzKGVsLCBjbGFzc05hbWUpO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgdGhpcy5hZGRDbGFzcyhlbCwgY2xhc3NOYW1lKTtcbiAgICAgICAgfVxuICAgIH1cbn07XG5cbm1vZHVsZS5leHBvcnRzID0gRG9tOyIsInZhciBkb20gPSByZXF1aXJlKCcuL2RvbScpO1xuXG52YXIgZGVmYXVsdEhpZGVJbiA9IDUwMDA7XG52YXIgbGFzdEluZGV4ID0gMTtcbnZhciBudW1PZkluZm9CbG9ja3MgPSAxMDtcblxudmFyIGluZm9CbG9ja3MgPSBbXTtcblxudmFyIEluZm9Db250cm9sbGVyID0ge1xuXHRyZW5kZXJJbmZvQmxvY2tzOiBmdW5jdGlvbiByZW5kZXJJbmZvQmxvY2tzKCkge1xuXHRcdHZhciBibG9ja3NUZW1wbGF0ZSA9IGZ1bmN0aW9uIGJsb2Nrc1RlbXBsYXRlKGluZGV4KSB7XG5cdFx0XHRyZXR1cm4gJ1xcblxcdFxcdFxcdFxcdCA8ZGl2IGNsYXNzPVwiYmFjLS1wdXJlc2RrLWluZm8tYm94LS1cIiBpZD1cImJhYy0tcHVyZXNkay1pbmZvLWJveC0tJyArIGluZGV4ICsgJ1wiPlxcblxcdFxcdFxcdFxcdCBcXHQ8ZGl2IGNsYXNzPVwiYmFjLS10aW1lclwiIGlkPVwiYmFjLS10aW1lcicgKyBpbmRleCArICdcIj48L2Rpdj5cXG5cXHRcXHRcXHRcXHRcXHQgPGRpdiBjbGFzcz1cImJhYy0taW5uZXItaW5mby1ib3gtLVwiPlxcblxcdFxcdFxcdFxcdFxcdCBcXHRcXHQ8ZGl2IGNsYXNzPVwiYmFjLS1pbmZvLWljb24tLSBmYS1zdWNjZXNzXCI+PC9kaXY+XFxuXFx0XFx0XFx0XFx0XFx0IFxcdFxcdDxkaXYgY2xhc3M9XCJiYWMtLWluZm8taWNvbi0tIGZhLXdhcm5pbmdcIj48L2Rpdj5cXG5cXHRcXHRcXHRcXHRcXHQgXFx0XFx0PGRpdiBjbGFzcz1cImJhYy0taW5mby1pY29uLS0gZmEtaW5mby0xXCI+PC9kaXY+XFxuXFx0XFx0XFx0XFx0XFx0IFxcdFxcdDxkaXYgY2xhc3M9XCJiYWMtLWluZm8taWNvbi0tIGZhLWVycm9yXCI+PC9kaXY+XFxuXFx0XFx0XFx0XFx0XFx0IFxcdFxcdCA8ZGl2IGNsYXNzPVwiYmFjLS1pbmZvLW1haW4tdGV4dC0tXCIgaWQ9XCJiYWMtLWluZm8tbWFpbi10ZXh0LS0nICsgaW5kZXggKyAnXCI+PC9kaXY+XFxuXFx0XFx0XFx0XFx0XFx0IFxcdFxcdCA8ZGl2IGNsYXNzPVwiYmFjLS1pbmZvLWNsb3NlLWJ1dHRvbi0tIGZhLWNsb3NlLTFcIiBpZD1cImJhYy0taW5mby1jbG9zZS1idXR0b24tLScgKyBpbmRleCArICdcIj48L2Rpdj5cXG5cXHRcXHRcXHRcXHRcXHQ8L2Rpdj5cXG5cXHRcXHRcXHRcXHQ8L2Rpdj5cXG5cXHRcXHQgICc7XG5cdFx0fTtcblxuXHRcdHZhciBpbmZvQmxvY2tzV3JhcHBlciA9IGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKCdiYWMtLWluZm8tYmxvY2tzLXdyYXBwZXItLScpO1xuXHRcdHZhciBpbm5lckh0bWwgPSAnJztcblx0XHRmb3IgKHZhciBpID0gMTsgaSA8IG51bU9mSW5mb0Jsb2NrczsgaSsrKSB7XG5cdFx0XHRpbm5lckh0bWwgKz0gYmxvY2tzVGVtcGxhdGUoaSk7XG5cdFx0fVxuXG5cdFx0aW5mb0Jsb2Nrc1dyYXBwZXIuaW5uZXJIVE1MID0gaW5uZXJIdG1sO1xuXHR9LFxuXG5cdGluaXQ6IGZ1bmN0aW9uIGluaXQoKSB7XG5cdFx0Zm9yICh2YXIgaSA9IDE7IGkgPCBudW1PZkluZm9CbG9ja3M7IGkrKykge1xuXHRcdFx0KGZ1bmN0aW9uIHgoaSkge1xuXHRcdFx0XHR2YXIgY2xvc2VGdW5jdGlvbiA9IGZ1bmN0aW9uIGNsb3NlRnVuY3Rpb24oKSB7XG5cdFx0XHRcdFx0ZG9tLnJlbW92ZUNsYXNzKGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKCdiYWMtLXB1cmVzZGstaW5mby1ib3gtLScgKyBpKSwgJ2JhYy0tYWN0aXZlLS0nKTtcblx0XHRcdFx0XHRkb2N1bWVudC5nZXRFbGVtZW50QnlJZCgnYmFjLS10aW1lcicgKyBpKS5zdHlsZS50cmFuc2l0aW9uID0gJyc7XG5cdFx0XHRcdFx0ZG9tLnJlbW92ZUNsYXNzKGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKCdiYWMtLXRpbWVyJyArIGkpLCAnYmFjLS1mdWxsd2lkdGgnKTtcblx0XHRcdFx0XHRpbmZvQmxvY2tzW2kgLSAxXS5pblVzZSA9IGZhbHNlO1xuXHRcdFx0XHRcdHNldFRpbWVvdXQoZnVuY3Rpb24gKCkge1xuXHRcdFx0XHRcdFx0aWYgKGluZm9CbG9ja3NbaSAtIDFdLmNsb3NlVGltZW91dCkge1xuXHRcdFx0XHRcdFx0XHRjbGVhclRpbWVvdXQoaW5mb0Jsb2Nrc1tpIC0gMV0uY2xvc2VUaW1lb3V0KTtcblx0XHRcdFx0XHRcdH1cblx0XHRcdFx0XHRcdGRvbS5yZW1vdmVDbGFzcyhkb2N1bWVudC5nZXRFbGVtZW50QnlJZCgnYmFjLS1wdXJlc2RrLWluZm8tYm94LS0nICsgaSksICdiYWMtLXN1Y2Nlc3MnKTtcblx0XHRcdFx0XHRcdGRvbS5yZW1vdmVDbGFzcyhkb2N1bWVudC5nZXRFbGVtZW50QnlJZCgnYmFjLS1wdXJlc2RrLWluZm8tYm94LS0nICsgaSksICdiYWMtLWluZm8nKTtcblx0XHRcdFx0XHRcdGRvbS5yZW1vdmVDbGFzcyhkb2N1bWVudC5nZXRFbGVtZW50QnlJZCgnYmFjLS1wdXJlc2RrLWluZm8tYm94LS0nICsgaSksICdiYWMtLXdhcm5pbmcnKTtcblx0XHRcdFx0XHRcdGRvbS5yZW1vdmVDbGFzcyhkb2N1bWVudC5nZXRFbGVtZW50QnlJZCgnYmFjLS1wdXJlc2RrLWluZm8tYm94LS0nICsgaSksICdiYWMtLWVycm9yJyk7XG5cdFx0XHRcdFx0fSwgNDUwKTtcblx0XHRcdFx0fTtcblxuXHRcdFx0XHR2YXIgYWRkVGV4dCA9IGZ1bmN0aW9uIGFkZFRleHQodGV4dCkge1xuXHRcdFx0XHRcdGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKCdiYWMtLWluZm8tbWFpbi10ZXh0LS0nICsgaSkuaW5uZXJIVE1MID0gdGV4dDtcblx0XHRcdFx0fTtcblxuXHRcdFx0XHR2YXIgYWRkVGltZW91dCA9IGZ1bmN0aW9uIGFkZFRpbWVvdXQodGltZW91dE1zZWNzKSB7XG5cdFx0XHRcdFx0ZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoJ2JhYy0tdGltZXInICsgaSkuc3R5bGUudHJhbnNpdGlvbiA9ICd3aWR0aCAnICsgdGltZW91dE1zZWNzICsgJ21zJztcblx0XHRcdFx0XHRkb20uYWRkQ2xhc3MoZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoJ2JhYy0tdGltZXInICsgaSksICdiYWMtLWZ1bGx3aWR0aCcpO1xuXHRcdFx0XHRcdGluZm9CbG9ja3NbaSAtIDFdLmNsb3NlVGltZW91dCA9IHNldFRpbWVvdXQoZnVuY3Rpb24gKCkge1xuXHRcdFx0XHRcdFx0aW5mb0Jsb2Nrc1tpIC0gMV0uY2xvc2VGdW5jdGlvbigpO1xuXHRcdFx0XHRcdH0sIHRpbWVvdXRNc2Vjcyk7XG5cdFx0XHRcdH07XG5cblx0XHRcdFx0aW5mb0Jsb2Nrcy5wdXNoKHtcblx0XHRcdFx0XHRpZDogaSxcblx0XHRcdFx0XHRpblVzZTogZmFsc2UsXG5cdFx0XHRcdFx0ZWxlbWVudDogZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoJ2JhYy0tcHVyZXNkay1pbmZvLWJveC0tJyArIGkpLFxuXHRcdFx0XHRcdGNsb3NlRnVuY3Rpb246IGNsb3NlRnVuY3Rpb24sXG5cdFx0XHRcdFx0YWRkVGV4dDogYWRkVGV4dCxcblx0XHRcdFx0XHRhZGRUaW1lb3V0OiBhZGRUaW1lb3V0LFxuXHRcdFx0XHRcdGNsb3NlVGltZW91dDogZmFsc2Vcblx0XHRcdFx0fSk7XG5cdFx0XHRcdGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKCdiYWMtLWluZm8tY2xvc2UtYnV0dG9uLS0nICsgaSkub25jbGljayA9IGZ1bmN0aW9uIChlKSB7XG5cdFx0XHRcdFx0Y2xvc2VGdW5jdGlvbihpKTtcblx0XHRcdFx0fTtcblx0XHRcdH0pKGkpO1xuXHRcdH1cblx0fSxcblxuXHQvKlxuICB0eXBlOiBvbmUgb2Y6XG4gXHQtIHN1Y2Nlc3NcbiBcdC0gaW5mb1xuIFx0LSB3YXJuaW5nXG4gXHQtIGVycm9yXG4gIHRleHQ6IHRoZSB0ZXh0IHRvIGRpc3BsYXlcbiAgb3B0aW9ucyAob3B0aW9uYWwpOiB7XG4gIFx0XHRoaWRlSW46IG1pbGxpc2Vjb25kcyB0byBoaWRlIGl0LiAtMSBmb3Igbm90IGhpZGluZyBpdCBhdCBhbGwuIERlZmF1bHQgaXMgNTAwMFxuICB9XG4gICovXG5cdHNob3dJbmZvOiBmdW5jdGlvbiBzaG93SW5mbyh0eXBlLCB0ZXh0LCBvcHRpb25zKSB7XG5cdFx0Zm9yICh2YXIgaSA9IDA7IGkgPCBudW1PZkluZm9CbG9ja3M7IGkrKykge1xuXHRcdFx0dmFyIGluZm9CbG9jayA9IGluZm9CbG9ja3NbaV07XG5cdFx0XHRpZiAoIWluZm9CbG9jay5pblVzZSkge1xuXHRcdFx0XHRpbmZvQmxvY2suaW5Vc2UgPSB0cnVlO1xuXHRcdFx0XHRpbmZvQmxvY2suZWxlbWVudC5zdHlsZS56SW5kZXggPSBsYXN0SW5kZXg7XG5cdFx0XHRcdGluZm9CbG9jay5hZGRUZXh0KHRleHQpO1xuXHRcdFx0XHRsYXN0SW5kZXggKz0gMTtcblx0XHRcdFx0dmFyIHRpbWVvdXRtU2VjcyA9IGRlZmF1bHRIaWRlSW47XG5cdFx0XHRcdHZhciBhdXRvQ2xvc2UgPSB0cnVlO1xuXHRcdFx0XHRpZiAob3B0aW9ucykge1xuXHRcdFx0XHRcdGlmIChvcHRpb25zLmhpZGVJbiAhPSBudWxsICYmIG9wdGlvbnMuaGlkZUluICE9IHVuZGVmaW5lZCAmJiBvcHRpb25zLmhpZGVJbiAhPSAtMSkge1xuXHRcdFx0XHRcdFx0dGltZW91dG1TZWNzID0gb3B0aW9ucy5oaWRlSW47XG5cdFx0XHRcdFx0fSBlbHNlIGlmIChvcHRpb25zLmhpZGVJbiA9PT0gLTEpIHtcblx0XHRcdFx0XHRcdGF1dG9DbG9zZSA9IGZhbHNlO1xuXHRcdFx0XHRcdH1cblx0XHRcdFx0fVxuXHRcdFx0XHRpZiAoYXV0b0Nsb3NlKSB7XG5cdFx0XHRcdFx0aW5mb0Jsb2NrLmFkZFRpbWVvdXQodGltZW91dG1TZWNzKTtcblx0XHRcdFx0fVxuXHRcdFx0XHRkb20uYWRkQ2xhc3MoaW5mb0Jsb2NrLmVsZW1lbnQsICdiYWMtLScgKyB0eXBlKTtcblx0XHRcdFx0ZG9tLmFkZENsYXNzKGluZm9CbG9jay5lbGVtZW50LCAnYmFjLS1hY3RpdmUtLScpO1xuXHRcdFx0XHRyZXR1cm47XG5cdFx0XHR9XG5cdFx0fVxuXHR9XG59O1xuXG5tb2R1bGUuZXhwb3J0cyA9IEluZm9Db250cm9sbGVyOyIsInZhciBTdG9yZSA9IHJlcXVpcmUoJy4vc3RvcmUuanMnKTtcblxudmFyIExvZ2dlciA9IHtcblx0XHRsb2c6IGZ1bmN0aW9uIGxvZyh3aGF0KSB7XG5cdFx0XHRcdGlmICghU3RvcmUubG9nc0VuYWJsZWQoKSkge1xuXHRcdFx0XHRcdFx0cmV0dXJuIGZhbHNlO1xuXHRcdFx0XHR9IGVsc2Uge1xuXHRcdFx0XHRcdFx0TG9nZ2VyLmxvZyA9IGNvbnNvbGUubG9nLmJpbmQoY29uc29sZSk7XG5cdFx0XHRcdFx0XHRMb2dnZXIubG9nKHdoYXQpO1xuXHRcdFx0XHR9XG5cdFx0fSxcblx0XHRlcnJvcjogZnVuY3Rpb24gZXJyb3IoZXJyKSB7XG5cdFx0XHRcdGlmICghU3RvcmUubG9nc0VuYWJsZWQoKSkge1xuXHRcdFx0XHRcdFx0cmV0dXJuIGZhbHNlO1xuXHRcdFx0XHR9IGVsc2Uge1xuXHRcdFx0XHRcdFx0TG9nZ2VyLmVycm9yID0gY29uc29sZS5lcnJvci5iaW5kKGNvbnNvbGUpO1xuXHRcdFx0XHRcdFx0TG9nZ2VyLmVycm9yKGVycik7XG5cdFx0XHRcdH1cblx0XHR9XG59O1xuXG5tb2R1bGUuZXhwb3J0cyA9IExvZ2dlcjsiLCJ2YXIgc2V0dGluZ3MgPSB7XG5cdHRvdGFsUGFnZUJ1dHRvbnNOdW1iZXI6IDhcbn07XG5cbnZhciBQYWdpbmF0b3IgPSB7XG5cdHNldFNldHRpbmdzOiBmdW5jdGlvbiBzZXRTZXR0aW5ncyhzZXR0aW5nKSB7XG5cdFx0Zm9yICh2YXIga2V5IGluIHNldHRpbmcpIHtcblx0XHRcdHNldHRpbmdzW2tleV0gPSBzZXR0aW5nW2tleV07XG5cdFx0fVxuXHR9LFxuXG5cdGdldFBhZ2VzUmFuZ2U6IGZ1bmN0aW9uIGdldFBhZ2VzUmFuZ2UoY3VycGFnZSwgdG90YWxQYWdlc09uUmVzdWx0U2V0KSB7XG5cdFx0dmFyIHBhZ2VSYW5nZSA9IFt7IHBhZ2VubzogY3VycGFnZSwgcnVubmluZ3BhZ2U6IHRydWUgfV07XG5cdFx0dmFyIGhhc25leHRvbnJpZ2h0ID0gdHJ1ZTtcblx0XHR2YXIgaGFzbmV4dG9ubGVmdCA9IHRydWU7XG5cdFx0dmFyIGkgPSAxO1xuXHRcdHdoaWxlIChwYWdlUmFuZ2UubGVuZ3RoIDwgc2V0dGluZ3MudG90YWxQYWdlQnV0dG9uc051bWJlciAmJiAoaGFzbmV4dG9ucmlnaHQgfHwgaGFzbmV4dG9ubGVmdCkpIHtcblx0XHRcdGlmIChoYXNuZXh0b25sZWZ0KSB7XG5cdFx0XHRcdGlmIChjdXJwYWdlIC0gaSA+IDApIHtcblx0XHRcdFx0XHRwYWdlUmFuZ2UucHVzaCh7IHBhZ2VubzogY3VycGFnZSAtIGksIHJ1bm5pbmdwYWdlOiBmYWxzZSB9KTtcblx0XHRcdFx0fSBlbHNlIHtcblx0XHRcdFx0XHRoYXNuZXh0b25sZWZ0ID0gZmFsc2U7XG5cdFx0XHRcdH1cblx0XHRcdH1cblx0XHRcdGlmIChoYXNuZXh0b25yaWdodCkge1xuXHRcdFx0XHRpZiAoY3VycGFnZSArIGkgLSAxIDwgdG90YWxQYWdlc09uUmVzdWx0U2V0KSB7XG5cdFx0XHRcdFx0cGFnZVJhbmdlLnB1c2goeyBwYWdlbm86IGN1cnBhZ2UgKyBpLCBydW5uaW5ncGFnZTogZmFsc2UgfSk7XG5cdFx0XHRcdH0gZWxzZSB7XG5cdFx0XHRcdFx0aGFzbmV4dG9ucmlnaHQgPSBmYWxzZTtcblx0XHRcdFx0fVxuXHRcdFx0fVxuXHRcdFx0aSsrO1xuXHRcdH1cblxuXHRcdHZhciBoYXNOZXh0ID0gY3VycGFnZSA8IHRvdGFsUGFnZXNPblJlc3VsdFNldDtcblx0XHR2YXIgaGFzUHJldmlvdXMgPSBjdXJwYWdlID4gMTtcblxuXHRcdHJldHVybiB7XG5cdFx0XHRidXR0b25zOiBwYWdlUmFuZ2Uuc29ydChmdW5jdGlvbiAoaXRlbUEsIGl0ZW1CKSB7XG5cdFx0XHRcdHJldHVybiBpdGVtQS5wYWdlbm8gLSBpdGVtQi5wYWdlbm87XG5cdFx0XHR9KSxcblx0XHRcdGhhc05leHQ6IGhhc05leHQsXG5cdFx0XHRoYXNQcmV2aW91czogaGFzUHJldmlvdXNcblx0XHR9O1xuXHR9XG59O1xuXG5tb2R1bGUuZXhwb3J0cyA9IFBhZ2luYXRvcjsiLCIndXNlIHN0cmljdCc7XG5cbnZhciBTdG9yZSA9IHJlcXVpcmUoJy4vc3RvcmUuanMnKTtcbnZhciBMb2dnZXIgPSByZXF1aXJlKCcuL2xvZ2dlci5qcycpO1xuXG52YXIgYXZhaWxhYmxlTGlzdGVuZXJzID0ge1xuXHRzZWFyY2hLZXlVcDoge1xuXHRcdGluZm86ICdMaXN0ZW5lciBvbiBrZXlVcCBvZiBzZWFyY2ggaW5wdXQgb24gdG9wIGJhcidcblx0fSxcblx0c2VhcmNoRW50ZXI6IHtcblx0XHRpbmZvOiAnTGlzdGVuZXIgb24gZW50ZXIga2V5IHByZXNzZWQgb24gc2VhcmNoIGlucHV0IG9uIHRvcCBiYXInXG5cdH0sXG5cdHNlYXJjaE9uQ2hhbmdlOiB7XG5cdFx0aW5mbzogJ0xpc3RlbmVyIG9uIGNoYW5nZSBvZiBpbnB1dCB2YWx1ZSdcblx0fVxufTtcblxudmFyIFB1YlN1YiA9IHtcblx0Z2V0QXZhaWxhYmxlTGlzdGVuZXJzOiBmdW5jdGlvbiBnZXRBdmFpbGFibGVMaXN0ZW5lcnMoKSB7XG5cdFx0cmV0dXJuIGF2YWlsYWJsZUxpc3RlbmVycztcblx0fSxcblxuXHRzdWJzY3JpYmU6IGZ1bmN0aW9uIHN1YnNjcmliZShldmVudHQsIGZ1bmN0KSB7XG5cdFx0aWYgKGV2ZW50dCA9PT0gXCJzZWFyY2hLZXlVcFwiKSB7XG5cdFx0XHR2YXIgZWwgPSBkb2N1bWVudC5nZXRFbGVtZW50QnlJZChTdG9yZS5nZXRTZWFyY2hJbnB1dElkKCkpO1xuXHRcdFx0ZWwuYWRkRXZlbnRMaXN0ZW5lcigna2V5dXAnLCBmdW5jdCk7XG5cdFx0XHRyZXR1cm4gZnVuY3Rpb24gKCkge1xuXHRcdFx0XHRlbC5yZW1vdmVFdmVudExpc3RlbmVyKCdrZXl1cCcsIGZ1bmN0LCBmYWxzZSk7XG5cdFx0XHR9O1xuXHRcdH0gZWxzZSBpZiAoZXZlbnR0ID09PSAnc2VhcmNoRW50ZXInKSB7XG5cdFx0XHR2YXIgaGFuZGxpbmdGdW5jdCA9IGZ1bmN0aW9uIGhhbmRsaW5nRnVuY3QoZSkge1xuXHRcdFx0XHRpZiAoZS5rZXlDb2RlID09PSAxMykge1xuXHRcdFx0XHRcdGZ1bmN0KGUpO1xuXHRcdFx0XHR9XG5cdFx0XHR9O1xuXHRcdFx0ZWwuYWRkRXZlbnRMaXN0ZW5lcigna2V5ZG93bicsIGhhbmRsaW5nRnVuY3QpO1xuXHRcdFx0cmV0dXJuIGZ1bmN0aW9uICgpIHtcblx0XHRcdFx0ZWwucmVtb3ZlRXZlbnRMaXN0ZW5lcigna2V5ZG93bicsIGhhbmRsaW5nRnVuY3QsIGZhbHNlKTtcblx0XHRcdH07XG5cdFx0fSBlbHNlIGlmIChldmVudHQgPT09ICdzZWFyY2hPbkNoYW5nZScpIHtcblx0XHRcdHZhciBlbCA9IGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKFN0b3JlLmdldFNlYXJjaElucHV0SWQoKSk7XG5cdFx0XHRlbC5hZGRFdmVudExpc3RlbmVyKCdjaGFuZ2UnLCBmdW5jdCk7XG5cdFx0XHRyZXR1cm4gZnVuY3Rpb24gKCkge1xuXHRcdFx0XHRlbC5yZW1vdmVFdmVudExpc3RlbmVyKCdrZXl1cCcsIGZ1bmN0LCBmYWxzZSk7XG5cdFx0XHR9O1xuXHRcdH0gZWxzZSB7XG5cdFx0XHRMb2dnZXIuZXJyb3IoJ1RoZSBldmVudCB5b3UgdHJpZWQgdG8gc3Vic2NyaWJlIGlzIG5vdCBhdmFpbGFibGUgYnkgdGhlIGxpYnJhcnknKTtcblx0XHRcdExvZ2dlci5sb2coJ1RoZSBhdmFpbGFibGUgZXZlbnRzIGFyZTogJywgYXZhaWxhYmxlTGlzdGVuZXJzKTtcblx0XHRcdHJldHVybiBmdW5jdGlvbiAoKSB7fTtcblx0XHR9XG5cdH1cbn07XG5cbm1vZHVsZS5leHBvcnRzID0gUHViU3ViOyIsInZhciBzdGF0ZSA9IHtcblx0Z2VuZXJhbDoge1xuXHRcdGZ1bGxXaWR0aDogZmFsc2UsXG5cdFx0ZGlzcGxheVN1cHBvcnQ6IGZhbHNlXG5cdH0sXG5cdHVzZXJEYXRhOiB7fSxcblx0Y29uZmlndXJhdGlvbjoge1xuXHRcdHNlc3Npb25FbmRwb2ludDogJ3Nlc3Npb24nLFxuXHRcdGJhc2VVcmw6ICcvYXBpL3YxJ1xuXHR9LFxuXHRodG1sVGVtcGxhdGU6ICcnLFxuXHRhcHBzOiBudWxsLFxuXHR2ZXJzaW9uTnVtYmVyOiAnJyxcblx0ZGV2OiBmYWxzZSxcblx0ZmlsZVBpY2tlcjoge1xuXHRcdHNlbGVjdGVkRmlsZTogbnVsbFxuXHR9LFxuXHRhcHBJbmZvOiBudWxsLFxuXHRzZXNzaW9uRW5kcG9pbnRCeVVzZXI6IGZhbHNlXG59O1xuXG5mdW5jdGlvbiBhc3NlbWJsZShsaXRlcmFsLCBwYXJhbXMpIHtcblx0cmV0dXJuIG5ldyBGdW5jdGlvbihwYXJhbXMsIFwicmV0dXJuIGBcIiArIGxpdGVyYWwgKyBcImA7XCIpO1xufVxuXG52YXIgU3RvcmUgPSB7XG5cdGdldFN0YXRlOiBmdW5jdGlvbiBnZXRTdGF0ZSgpIHtcblx0XHRyZXR1cm4gT2JqZWN0LmFzc2lnbih7fSwgc3RhdGUpO1xuXHR9LFxuXG5cdHNldFdpbmRvd05hbWU6IGZ1bmN0aW9uIHNldFdpbmRvd05hbWUod24pIHtcblx0XHRzdGF0ZS5nZW5lcmFsLndpbmRvd05hbWUgPSB3bjtcblx0fSxcblxuXHRzZXRGdWxsV2lkdGg6IGZ1bmN0aW9uIHNldEZ1bGxXaWR0aChmdykge1xuXHRcdHN0YXRlLmdlbmVyYWwuZnVsbFdpZHRoID0gZnc7XG5cdH0sXG5cblx0c2V0RGlzcGxheVN1cHBvcnQ6IGZ1bmN0aW9uIHNldERpc3BsYXlTdXBwb3J0KGRpc3BsYXkpIHtcblx0XHRzdGF0ZS5nZW5lcmFsLmRpc3BsYXlTdXBwb3J0ID0gZGlzcGxheTtcblx0fSxcblxuXHRzZXREZXY6IGZ1bmN0aW9uIHNldERldihkZXYpIHtcblx0XHRzdGF0ZS5kZXYgPSBkZXY7XG5cdH0sXG5cblx0c2V0VXJsVmVyc2lvblByZWZpeDogZnVuY3Rpb24gc2V0VXJsVmVyc2lvblByZWZpeChwcmVmaXgpIHtcblx0XHRzdGF0ZS5jb25maWd1cmF0aW9uLmJhc2VVcmwgPSBwcmVmaXg7XG5cdH0sXG5cblx0Z2V0RGV2VXJsUGFydDogZnVuY3Rpb24gZ2V0RGV2VXJsUGFydCgpIHtcblx0XHRpZiAoc3RhdGUuZGV2KSB7XG5cdFx0XHRyZXR1cm4gXCJzYW5kYm94L1wiO1xuXHRcdH0gZWxzZSB7XG5cdFx0XHRyZXR1cm4gXCJcIjtcblx0XHR9XG5cdH0sXG5cblx0Z2V0RnVsbEJhc2VVcmw6IGZ1bmN0aW9uIGdldEZ1bGxCYXNlVXJsKCkge1xuXHRcdHJldHVybiBzdGF0ZS5jb25maWd1cmF0aW9uLnJvb3RVcmwgKyBzdGF0ZS5jb25maWd1cmF0aW9uLmJhc2VVcmwgKyBTdG9yZS5nZXREZXZVcmxQYXJ0KCk7XG5cdH0sXG5cblx0LypcbiAgY29uZjpcbiAgLSBoZWFkZXJEaXZJZFxuICAtIGluY2x1ZGVBcHBzTWVudVxuICAqL1xuXHRzZXRDb25maWd1cmF0aW9uOiBmdW5jdGlvbiBzZXRDb25maWd1cmF0aW9uKGNvbmYpIHtcblx0XHRmb3IgKHZhciBrZXkgaW4gY29uZikge1xuXHRcdFx0c3RhdGUuY29uZmlndXJhdGlvbltrZXldID0gY29uZltrZXldO1xuXHRcdH1cblx0fSxcblxuXHRzZXRWZXJzaW9uTnVtYmVyOiBmdW5jdGlvbiBzZXRWZXJzaW9uTnVtYmVyKHZlcnNpb24pIHtcblx0XHRzdGF0ZS52ZXJzaW9uTnVtYmVyID0gdmVyc2lvbjtcblx0fSxcblxuXHRnZXRWZXJzaW9uTnVtYmVyOiBmdW5jdGlvbiBnZXRWZXJzaW9uTnVtYmVyKCkge1xuXHRcdHJldHVybiBzdGF0ZS52ZXJzaW9uTnVtYmVyO1xuXHR9LFxuXG5cdGdldEFwcHNWaXNpYmxlOiBmdW5jdGlvbiBnZXRBcHBzVmlzaWJsZSgpIHtcblx0XHRpZiAoc3RhdGUuY29uZmlndXJhdGlvbi5hcHBzVmlzaWJsZSA9PT0gbnVsbCB8fCBzdGF0ZS5jb25maWd1cmF0aW9uLmFwcHNWaXNpYmxlID09PSB1bmRlZmluZWQpIHtcblx0XHRcdHJldHVybiB0cnVlO1xuXHRcdH0gZWxzZSB7XG5cdFx0XHRyZXR1cm4gc3RhdGUuY29uZmlndXJhdGlvbi5hcHBzVmlzaWJsZTtcblx0XHR9XG5cdH0sXG5cblx0c2V0QXBwc1Zpc2libGU6IGZ1bmN0aW9uIHNldEFwcHNWaXNpYmxlKGFwcHNWaXNpYmxlKSB7XG5cdFx0c3RhdGUuY29uZmlndXJhdGlvbi5hcHBzVmlzaWJsZSA9IGFwcHNWaXNpYmxlO1xuXHR9LFxuXG5cdHNldEhUTUxUZW1wbGF0ZTogZnVuY3Rpb24gc2V0SFRNTFRlbXBsYXRlKHRlbXBsYXRlKSB7XG5cdFx0c3RhdGUuaHRtbFRlbXBsYXRlID0gdGVtcGxhdGU7XG5cdH0sXG5cblx0c2V0QXBwczogZnVuY3Rpb24gc2V0QXBwcyhhcHBzKSB7XG5cdFx0c3RhdGUuYXBwcyA9IGFwcHM7XG5cdH0sXG5cblx0c2V0QXBwSW5mbzogZnVuY3Rpb24gc2V0QXBwSW5mbyhhcHBJbmZvKSB7XG5cdFx0c3RhdGUuYXBwSW5mbyA9IGFwcEluZm87XG5cdH0sXG5cblx0Z2V0QXBwSW5mbzogZnVuY3Rpb24gZ2V0QXBwSW5mbygpIHtcblx0XHRyZXR1cm4gc3RhdGUuYXBwSW5mbztcblx0fSxcblxuXHRnZXRMb2dpblVybDogZnVuY3Rpb24gZ2V0TG9naW5VcmwoKSB7XG5cdFx0cmV0dXJuIHN0YXRlLmNvbmZpZ3VyYXRpb24ucm9vdFVybCArIHN0YXRlLmNvbmZpZ3VyYXRpb24ubG9naW5Vcmw7IC8vICsgXCI/XCIgKyBzdGF0ZS5jb25maWd1cmF0aW9uLnJlZGlyZWN0VXJsUGFyYW0gKyBcIj1cIiArIHdpbmRvdy5sb2NhdGlvbi5ocmVmO1xuXHR9LFxuXG5cdGdldEF1dGhlbnRpY2F0aW9uRW5kcG9pbnQ6IGZ1bmN0aW9uIGdldEF1dGhlbnRpY2F0aW9uRW5kcG9pbnQoKSB7XG5cdFx0aWYgKHN0YXRlLnNlc3Npb25FbmRwb2ludEJ5VXNlcikge1xuXHRcdFx0cmV0dXJuIFN0b3JlLmdldEZ1bGxCYXNlVXJsKCkgKyBzdGF0ZS5jb25maWd1cmF0aW9uLnNlc3Npb25FbmRwb2ludDtcblx0XHR9XG5cdFx0cmV0dXJuIFN0b3JlLmdldEZ1bGxCYXNlVXJsKCkgKyBzdGF0ZS5jb25maWd1cmF0aW9uLnNlc3Npb25FbmRwb2ludDtcblx0fSxcblxuXHRnZXRTd2l0Y2hBY2NvdW50RW5kcG9pbnQ6IGZ1bmN0aW9uIGdldFN3aXRjaEFjY291bnRFbmRwb2ludChhY2NvdW50SWQpIHtcblx0XHRyZXR1cm4gU3RvcmUuZ2V0RnVsbEJhc2VVcmwoKSArICdhY2NvdW50cy9zd2l0Y2gvJyArIGFjY291bnRJZDtcblx0fSxcblxuXHRnZXRBcHBzRW5kcG9pbnQ6IGZ1bmN0aW9uIGdldEFwcHNFbmRwb2ludCgpIHtcblx0XHRyZXR1cm4gU3RvcmUuZ2V0RnVsbEJhc2VVcmwoKSArICdhcHBzJztcblx0fSxcblxuXHRnZXRDbG91ZGluYXJ5RW5kcG9pbnQ6IGZ1bmN0aW9uIGdldENsb3VkaW5hcnlFbmRwb2ludCgpIHtcblx0XHRyZXR1cm4gU3RvcmUuZ2V0RnVsbEJhc2VVcmwoKSArICdhc3NldHMnO1xuXHR9LFxuXG5cdGxvZ3NFbmFibGVkOiBmdW5jdGlvbiBsb2dzRW5hYmxlZCgpIHtcblx0XHRyZXR1cm4gc3RhdGUuY29uZmlndXJhdGlvbi5sb2dzO1xuXHR9LFxuXG5cdGdldFNlYXJjaElucHV0SWQ6IGZ1bmN0aW9uIGdldFNlYXJjaElucHV0SWQoKSB7XG5cdFx0cmV0dXJuIHN0YXRlLmNvbmZpZ3VyYXRpb24uc2VhcmNoSW5wdXRJZDtcblx0fSxcblxuXHRzZXRIVE1MQ29udGFpbmVyOiBmdW5jdGlvbiBzZXRIVE1MQ29udGFpbmVyKGlkKSB7XG5cdFx0c3RhdGUuY29uZmlndXJhdGlvbi5oZWFkZXJEaXZJZCA9IGlkO1xuXHR9LFxuXG5cdGdldEhUTE1Db250YWluZXI6IGZ1bmN0aW9uIGdldEhUTE1Db250YWluZXIoKSB7XG5cdFx0aWYgKHN0YXRlLmNvbmZpZ3VyYXRpb24uaGVhZGVyRGl2SWQpIHtcblx0XHRcdHJldHVybiBzdGF0ZS5jb25maWd1cmF0aW9uLmhlYWRlckRpdklkO1xuXHRcdH0gZWxzZSB7XG5cdFx0XHRyZXR1cm4gXCJwcHNkay1jb250YWluZXJcIjtcblx0XHR9XG5cdH0sXG5cblx0Z2V0SFRNTDogZnVuY3Rpb24gZ2V0SFRNTCgpIHtcblx0XHRyZXR1cm4gc3RhdGUuaHRtbFRlbXBsYXRlO1xuXHR9LFxuXG5cdHNldFNlc3Npb25FbmRwb2ludDogZnVuY3Rpb24gc2V0U2Vzc2lvbkVuZHBvaW50KHNlc3Npb25FbmRwb2ludCkge1xuXHRcdGlmIChzZXNzaW9uRW5kcG9pbnQuaW5kZXhPZignLycpID09PSAwKSB7XG5cdFx0XHRzZXNzaW9uRW5kcG9pbnQgPSBzZXNzaW9uRW5kcG9pbnQuc3Vic3RyaW5nKDEsIHNlc3Npb25FbmRwb2ludC5sZW5ndGggLSAxKTtcblx0XHR9XG5cdFx0c3RhdGUuc2Vzc2lvbkVuZHBvaW50QnlVc2VyID0gdHJ1ZTtcblx0XHRzdGF0ZS5jb25maWd1cmF0aW9uLnNlc3Npb25FbmRwb2ludCA9IHNlc3Npb25FbmRwb2ludDtcblx0fSxcblxuXHRnZXRXaW5kb3dOYW1lOiBmdW5jdGlvbiBnZXRXaW5kb3dOYW1lKCkge1xuXHRcdHJldHVybiBzdGF0ZS5nZW5lcmFsLndpbmRvd05hbWU7XG5cdH0sXG5cblx0Z2V0RnVsbFdpZHRoOiBmdW5jdGlvbiBnZXRGdWxsV2lkdGgoKSB7XG5cdFx0cmV0dXJuIHN0YXRlLmdlbmVyYWwuZnVsbFdpZHRoO1xuXHR9LFxuXG5cdGdldERpc3BsYXlTdXBwb3J0OiBmdW5jdGlvbiBnZXREaXNwbGF5U3VwcG9ydCgpIHtcblx0XHRyZXR1cm4gc3RhdGUuZ2VuZXJhbC5kaXNwbGF5U3VwcG9ydDtcblx0fSxcblxuXHRzZXRVc2VyRGF0YTogZnVuY3Rpb24gc2V0VXNlckRhdGEodXNlckRhdGEpIHtcblx0XHRzdGF0ZS51c2VyRGF0YSA9IHVzZXJEYXRhO1xuXHR9LFxuXG5cdGdldFVzZXJEYXRhOiBmdW5jdGlvbiBnZXRVc2VyRGF0YSgpIHtcblx0XHRyZXR1cm4gc3RhdGUudXNlckRhdGE7XG5cdH0sXG5cblx0c2V0Um9vdFVybDogZnVuY3Rpb24gc2V0Um9vdFVybChyb290VXJsKSB7XG5cdFx0c3RhdGUuY29uZmlndXJhdGlvbi5yb290VXJsID0gcm9vdFVybC5yZXBsYWNlKC9cXC8/JC8sICcvJyk7O1xuXHR9LFxuXG5cdGdldFJvb3RVcmw6IGZ1bmN0aW9uIGdldFJvb3RVcmwoKSB7XG5cdFx0cmV0dXJuIHN0YXRlLmNvbmZpZ3VyYXRpb24ucm9vdFVybDtcblx0fSxcblxuXHRnZXRBdmF0YXJVcGxvYWRVcmw6IGZ1bmN0aW9uIGdldEF2YXRhclVwbG9hZFVybCgpIHtcblx0XHRyZXR1cm4gU3RvcmUuZ2V0RnVsbEJhc2VVcmwoKSArICdhc3NldHMvdXBsb2FkJztcblx0fSxcblxuXHRnZXRBdmF0YXJVcGRhdGVVcmw6IGZ1bmN0aW9uIGdldEF2YXRhclVwZGF0ZVVybCgpIHtcblx0XHRyZXR1cm4gU3RvcmUuZ2V0RnVsbEJhc2VVcmwoKSArICd1c2Vycy9hdmF0YXInO1xuXHR9XG59O1xuXG5tb2R1bGUuZXhwb3J0cyA9IFN0b3JlOyJdfQ==