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
					Logger.log(result);
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
					Logger.log(result);
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
			console.log(app);
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
		} else if (appInfo.root = "/app/campaigns") {
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
		PPBA.styleAccount(Store.getUserData().user.account);
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
 * version: 2.7.1
 * date: 2019-07-24
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
ppba.setHTMLTemplate('<header class="bac--header-apps" id="bac--puresdk-bac--header-apps--">\n    <div class="bac--container">\n        <div class="bac--logo" id="bac--puresdk-account-logo--"></div>\n        <div class="bac--user-actions">\n            <svg id="bac--puresdk--loader--" width="38" height="38" viewBox="0 0 44 44" xmlns="http://www.w3.org/2000/svg" stroke="#fff" style="\n    margin-right: 10px;\n">\n                <g fill="none" fill-rule="evenodd" stroke-width="2">\n                    <circle cx="22" cy="22" r="16.6437">\n                        <animate attributeName="r" begin="0s" dur="1.8s" values="1; 20" calcMode="spline" keyTimes="0; 1" keySplines="0.165, 0.84, 0.44, 1" repeatCount="indefinite"></animate>\n                        <animate attributeName="stroke-opacity" begin="0s" dur="1.8s" values="1; 0" calcMode="spline" keyTimes="0; 1" keySplines="0.3, 0.61, 0.355, 1" repeatCount="indefinite"></animate>\n                    </circle>\n                    <circle cx="22" cy="22" r="19.9282">\n                        <animate attributeName="r" begin="bac-0.9s" dur="1.8s" values="1; 20" calcMode="spline" keyTimes="0; 1" keySplines="0.165, 0.84, 0.44, 1" repeatCount="indefinite"></animate>\n                        <animate attributeName="stroke-opacity" begin="bac-0.9s" dur="1.8s" values="1; 0" calcMode="spline" keyTimes="0; 1" keySplines="0.3, 0.61, 0.355, 1" repeatCount="indefinite"></animate>\n                    </circle>\n                </g>\n            </svg>\n            <div class="bac--user-apps" id="bac--puresdk-apps-section--">\n                <a href="/app/campaigns" id="bac--puresdk-campaigns-link--" class="bac--puresdk-apps-on-navbar-- disabled">Campaigns</a>\n                <a href="/app/groups" id="bac--puresdk-groups-link--" class="bac--puresdk-apps-on-navbar-- disabled">Groups</a>\n                <a href="#" id="bac--puresdk--apps--opener--" class="bac--puresdk-apps-on-navbar--">Other apps</a>\n                <div class="bac--apps-container" id="bac--puresdk-apps-container--">\n                    <div id="bac--aps-actual-container"></div>\n                </div>\n            </div>\n            <!--<div class="bac&#45;&#45;user-notifications">-->\n                <!--<div class="bac&#45;&#45;user-notifications-count">1</div>-->\n                <!--<i class="fa fa-bell-o"></i>-->\n            <!--</div>-->\n            <div class="bac--user-avatar" id="bac--user-avatar-top">\n                <span class="bac--user-avatar-name" id="bac--puresdk-user-avatar--"></span>\n                <div id="bac--image-container-top"></div>\n            </div>\n        </div>\n    </div>\n    <div id="bac--info-blocks-wrapper--"></div>\n</header>\n<div class="bac--user-sidebar" id="bac--puresdk-user-sidebar--">\n    <div id="bac--puresdk-user-details--"></div>\n    <!--<div class="bac&#45;&#45;user-sidebar-info">-->\n        <!--<div class="bac&#45;&#45;user-image"><i class="fa fa-camera"></i></div>-->\n        <!--<div class="bac&#45;&#45;user-name">Curtis Bartlett</div>-->\n        <!--<div class="bac&#45;&#45;user-email">cbartlett@pureprofile.com</div>-->\n    <!--</div>-->\n    <div class="bac--user-apps" id="bac--puresdk-user-businesses--">\n        <!--<div class="bac&#45;&#45;user-list-item">-->\n            <!--<img src="http://lorempixel.com/40/40" alt="">-->\n            <!--<div class="bac-user-app-details">-->\n                <!--<span></span>-->\n                <!--<span>15 team members</span>-->\n            <!--</div>-->\n        <!--</div>-->\n    </div>\n    <div class="bac--user-account-settings">\n        <!--<div class="bac-user-acount-list-item">-->\n            <!--<i class="fa fa-cog-line"></i>-->\n            <!--<a href="#">Account Security</a>-->\n        <!--</div>-->\n        <div class="bac-user-acount-list-item">\n            <i class="fa fa-login-line"></i>\n            <a href="/api/v1/sign-off">Log out</a>\n        </div>\n\n        <div id="puresdk-version-number" class="puresdk-version-number"></div>\n    </div>\n</div>\n\n\n<div class="bac--custom-modal add-question-modal --is-open" id="bac--cloudinary--modal">\n    <div class="custom-modal__wrapper">\n        <div class="custom-modal__content">\n            <h3>Add image</h3>\n            <a class="custom-modal__close-btn" id="bac--cloudinary--closebtn"><i class="fa fa-times-circle"></i></a>\n        </div>\n\n        <div class="custom-modal__content">\n            <div class="bac-search --icon-left">\n                <input id="bac--cloudinary--search-input" type="search" name="search" placeholder="Search for images..."/>\n                <div class="bac-search__icon"><i class="fa fa-search"></i></div>\n            </div>\n            <br/>\n\n            <div class="back-button" id="bac--cloudinary--back-button-container">\n                <a class="goBack" id="bac--cloudinary--go-back"><i class="fa fa-angle-left"></i>Go Back</a>\n            </div>\n\n            <br/>\n            <div class="cloud-images">\n                <div class="cloud-images__container" id="bac--cloudinary-itams-container"></div>\n\n                <div class="cloud-images__pagination" id="bac--cloudinary-pagination-container">\n                    <ul id="bac--cloudinary-actual-pagination-container"></ul>\n                </div>\n\n            </div>\n        </div>\n    </div>\n</div>\n\n<input style="display:none" type=\'file\' id=\'bac---puresdk-avatar-file\'>\n<input style="display:none" type=\'button\' id=\'bac---puresdk-avatar-submit\' value=\'Upload!\'>');
ppba.setVersionNumber('2.7.1');

window.PURESDK = ppba;

var css = 'html,body,div,span,applet,object,iframe,h1,h2,h3,h4,h5,h6,p,blockquote,pre,a,abbr,acronym,address,big,cite,code,del,dfn,em,img,ins,kbd,q,s,samp,small,strike,strong,sub,sup,tt,var,b,u,i,center,dl,dt,dd,ol,ul,li,fieldset,form,label,legend,table,caption,tbody,tfoot,thead,tr,th,td,article,aside,canvas,details,embed,figure,figcaption,footer,header,hgroup,menu,nav,output,ruby,section,summary,time,mark,audio,video{margin:0;padding:0;border:0;font-size:100%;font:inherit;vertical-align:baseline}article,aside,details,figcaption,figure,footer,header,hgroup,menu,nav,section{display:block}body{line-height:1}ol,ul{list-style:none}blockquote,q{quotes:none}blockquote:before,blockquote:after,q:before,q:after{content:"";content:none}table{border-collapse:collapse;border-spacing:0}body{overflow-x:hidden}#bac-wrapper{font-family:"Verdana", arial, sans-serif;color:white;min-height:100vh;position:relative}.bac--container{max-width:1160px;margin:0 auto}.bac--container .bac--puresdk-app-name--{display:inline-block;position:relative;top:-5px;left:15px}.bac--container #app-name-link-to-root{display:block;font-size:1.4em;width:200px;color:white;text-decoration:none}.bac--header-apps{position:absolute;width:100%;height:50px;background-color:#475369;padding:5px 10px;z-index:9999999}.bac--header-apps .bac--container{height:100%;display:flex;align-items:center;justify-content:space-between}.bac--header-search{position:relative}.bac--header-search input{color:#fff;font-size:14px;height:35px;background-color:#6b7586;padding:0 5px 0 10px;border:none;border-radius:3px;min-width:400px;width:100%}.bac--header-search input:focus{outline:none}.bac--header-search input::-webkit-input-placeholder{font-style:normal !important;text-align:center;color:#fff;font-size:14px;font-weight:300;letter-spacing:0.5px}.bac--header-search input::-moz-placeholder{font-style:normal !important;text-align:center;color:#fff;font-size:14px;font-weight:300;letter-spacing:0.5px}.bac--header-search input:-ms-input-placeholder{font-style:normal !important;text-align:center;color:#fff;font-size:14px;font-weight:300;letter-spacing:0.5px}.bac--header-search i{position:absolute;top:8px;right:10px}.bac--user-actions{display:flex;align-items:center}.bac--user-actions #bac--puresdk-apps-section--{border-right:1px solid #adadad;height:40px;padding-top:15px}.bac--user-actions #bac--puresdk-apps-section-- a.bac--puresdk-apps-on-navbar--{color:whitesmoke;text-decoration:none;margin-right:25px;font-size:0.9em}.bac--user-actions #bac--puresdk-apps-section-- a.bac--puresdk-apps-on-navbar--.disabled{pointer-events:none;cursor:none;color:#adadad}.bac--user-actions #bac--puresdk-apps-section-- a.bac--puresdk-apps-on-navbar--.selected{color:#20D6C9;pointer-events:none}.bac--user-actions .bac--user-notifications{position:relative}.bac--user-actions .bac--user-notifications i{font-size:20px}.bac--user-actions #bac--puresdk--loader--{display:none}.bac--user-actions #bac--puresdk--loader--.bac--puresdk-visible{display:block}.bac--user-actions .bac--user-notifications-count{position:absolute;display:inline-block;height:15px;width:15px;line-height:15px;color:#fff;font-size:10px;text-align:center;background-color:#fc3b30;border-radius:50%;top:-5px;left:-5px}.bac--user-actions .bac--user-avatar,.bac--user-actions .bac--user-notifications{margin-left:20px}.bac--user-actions .bac--user-avatar{position:relative;overflow:hidden;border-radius:50%}.bac--user-actions .bac--user-avatar #bac--image-container-top{width:100%;heigth:100%;position:absolute;top:0;left:0;z-index:1;display:none}.bac--user-actions .bac--user-avatar #bac--image-container-top img{width:100%;height:100%}.bac--user-actions .bac--user-avatar #bac--image-container-top.bac--puresdk-visible{display:block}.bac--user-actions .bac--user-avatar-name{color:#fff;background-color:#adadad;display:inline-block;height:35px;width:35px;line-height:35px;text-align:center;font-size:14px}.bac--user-apps{position:relative}#bac--puresdk-apps-icon--{width:20px;display:inline-block;text-align:center;font-size:16px}.bac--puresdk-apps-name--{font-size:9px;width:20px;text-align:center}#bac--puresdk-user-businesses--{height:calc(100vh - 333px);overflow:auto}.bac--apps-container{background:#fff;position:absolute;top:45px;right:0px;display:flex;width:300px;flex-wrap:wrap;border-radius:10px;padding:15px;padding-right:0;justify-content:space-between;text-align:left;-webkit-box-shadow:0 0 10px 2px rgba(0,0,0,0.2);box-shadow:0 0 10px 2px rgba(0,0,0,0.2);opacity:0;visibility:hidden;transition:all 0.4s ease;max-height:500px}.bac--apps-container #bac--aps-actual-container{height:100%;overflow:scroll;max-height:475px;width:100%}.bac--apps-container.active{opacity:1;visibility:visible}.bac--apps-container:before{content:"";vertical-align:middle;margin:auto;position:absolute;display:block;left:0;right:-185px;bottom:calc(100% - 6px);width:12px;height:12px;transform:rotate(45deg);background-color:#fff}.bac--apps-container .bac--apps{width:100%;font-size:33px;margin-bottom:15px;text-align:left;height:33px}.bac--apps-container .bac--apps:last-child{margin-bottom:0}.bac--apps-container .bac--apps:hover{background:#f3f3f3}.bac--apps-container .bac--apps a.bac--image-link{display:inline-block;color:#fff;text-decoration:none;width:33px;height:33px}.bac--apps-container .bac--apps a.bac--image-link img{width:100%;height:100%}.bac--apps-container .bac--apps .bac--puresdk-app-text-container{display:inline-block;position:relative;left:-9px;width:calc(100% - 42px)}.bac--apps-container .bac--apps .bac--puresdk-app-text-container a{display:block;text-decoration:none;cursor:pointer;padding-left:8px}.bac--apps-container .bac--apps .bac--puresdk-app-text-container .bac--app-name{width:100%;color:#000;font-size:13px;padding-bottom:4px}.bac--apps-container .bac--apps .bac--puresdk-app-text-container .bac--app-description{color:#919191;font-size:11px;font-style:italic;line-height:1.3em;position:relative;top:-2px;overflow:hidden;white-space:nowrap;text-overflow:ellipsis}.bac--user-sidebar{font-family:"Verdana", arial, sans-serif;color:white;height:calc(100vh - 50px);background-color:#515f77;box-sizing:border-box;width:320px;position:fixed;top:50px;right:0;z-index:999999;padding-top:10px;opacity:0;transform:translateX(100%);transition:all 0.4s ease}.bac--user-sidebar.active{opacity:1;transform:translateX(0%);-webkit-box-shadow:-1px 0px 12px 0px rgba(0,0,0,0.75);-moz-box-shadow:-1px 3px 12px 0px rgba(0,0,0,0.75);box-shadow:-1px 0px 12px 0px rgba(0,0,0,0.75)}.bac--user-sidebar .bac--user-list-item{display:flex;position:relative;cursor:pointer;align-items:center;padding:10px 10px 10px 40px;border-bottom:1px solid rgba(255,255,255,0.1)}.bac--user-sidebar .bac--user-list-item:hover{background-color:rgba(255,255,255,0.1)}.bac--user-sidebar .bac--user-list-item .bac--selected-acount-indicator{position:absolute;right:0;height:100%;width:8px}.bac--user-sidebar .bac--user-list-item .bac--user-list-item-image{width:40px;height:40px;border-radius:3px;border:2px solid #fff;margin-right:20px;display:flex;align-items:center;justify-content:center}.bac--user-sidebar .bac--user-list-item .bac--user-list-item-image>img{width:auto;height:auto;max-width:100%;max-height:100%}.bac--user-sidebar .bac--user-list-item span{width:100%;display:block;margin-bottom:5px}.bac--user-sidebar .bac-user-app-details span{font-size:12px}.bac--user-sidebar .puresdk-version-number{width:100%;text-align:right;padding-right:10px;position:absolute;font-size:8px;opacity:0.5;right:0;bottom:0}.bac--user-sidebar-info{display:flex;justify-content:center;flex-wrap:wrap;text-align:center;padding:10px 20px 15px}.bac--user-sidebar-info .bac--user-image{border:1px #adadad solid;overflow:hidden;border-radius:50%;position:relative;cursor:pointer;display:inline-block;height:80px;width:80px;line-height:80px;text-align:center;color:#fff;border-radius:50%;background-color:#adadad;margin-bottom:15px}.bac--user-sidebar-info .bac--user-image #bac--user-image-file{display:none;position:absolute;z-index:1;top:0;left:0;width:100%;height:100%}.bac--user-sidebar-info .bac--user-image #bac--user-image-file img{width:100%;height:100%}.bac--user-sidebar-info .bac--user-image #bac--user-image-file.bac--puresdk-visible{display:block}.bac--user-sidebar-info .bac--user-image #bac--user-image-upload-progress{position:absolute;padding-top:10px;top:0;background:#666;z-index:4;display:none;width:100%;height:100%}.bac--user-sidebar-info .bac--user-image #bac--user-image-upload-progress.bac--puresdk-visible{display:block}.bac--user-sidebar-info .bac--user-image i{font-size:32px;font-size:32px;z-index:0;position:absolute;width:100%;left:0;background-color:rgba(0,0,0,0.5)}.bac--user-sidebar-info .bac--user-image:hover i{z-index:3}.bac--user-sidebar-info .bac--user-name{width:100%;text-align:center;font-size:18px;margin-bottom:10px}.bac--user-sidebar-info .bac--user-email{font-size:12px;font-weight:300}.bac--user-account-settings{position:absolute;bottom:10px;left:20px;width:90%;height:50px}.bac--user-account-settings .bac-user-acount-list-item{display:flex;align-items:center;margin-bottom:30px;position:absolute}.bac--user-account-settings .bac-user-acount-list-item a{text-decoration:none;color:#fff}.bac--user-account-settings .bac-user-acount-list-item i{font-size:24px;margin-right:20px}#bac--puresdk-account-logo--{cursor:pointer;position:relative;color:#fff}#bac--puresdk-account-logo-- img{height:28px}#bac--info-blocks-wrapper--{position:fixed;top:0px;height:auto}#bac--info-blocks-wrapper-- .bac--puresdk-info-box--{border-radius:0 0 3px 3px;overflow:hidden;z-index:99999999;position:relative;margin-top:0;width:470px;left:calc(50vw - 235px);height:0px;-webkit-transition:top 0.4s;transition:all 0.4s}#bac--info-blocks-wrapper-- .bac--puresdk-info-box--.bac--success{background:#14DA9E}#bac--info-blocks-wrapper-- .bac--puresdk-info-box--.bac--success .bac--inner-info-box-- div.bac--info-icon--.fa-success{display:inline-block}#bac--info-blocks-wrapper-- .bac--puresdk-info-box--.bac--info{background-color:#5BC0DE}#bac--info-blocks-wrapper-- .bac--puresdk-info-box--.bac--info .bac--inner-info-box-- div.bac--info-icon--.fa-info-1{display:inline-block}#bac--info-blocks-wrapper-- .bac--puresdk-info-box--.bac--warning{background:#F0AD4E}#bac--info-blocks-wrapper-- .bac--puresdk-info-box--.bac--warning .bac--inner-info-box-- div.bac--info-icon--.fa-warning{display:inline-block}#bac--info-blocks-wrapper-- .bac--puresdk-info-box--.bac--error{background:#EF4100}#bac--info-blocks-wrapper-- .bac--puresdk-info-box--.bac--error .bac--inner-info-box-- div.bac--info-icon--.fa-error{display:inline-block}#bac--info-blocks-wrapper-- .bac--puresdk-info-box-- .bac--timer{-webkit-transition-timing-function:linear;transition-timing-function:linear;position:absolute;bottom:0px;opacity:0.5;height:2px !important;background:white;width:0%}#bac--info-blocks-wrapper-- .bac--puresdk-info-box-- .bac--timer.bac--fullwidth{width:100%}#bac--info-blocks-wrapper-- .bac--puresdk-info-box--.bac--active--{height:auto;margin-top:5px}#bac--info-blocks-wrapper-- .bac--puresdk-info-box-- .bac--inner-info-box--{width:100%;padding:11px 15px;color:white}#bac--info-blocks-wrapper-- .bac--puresdk-info-box-- .bac--inner-info-box-- div{display:inline-block;height:18px;position:relative}#bac--info-blocks-wrapper-- .bac--puresdk-info-box-- .bac--inner-info-box-- div.bac--info-icon--{display:none;top:0px}#bac--info-blocks-wrapper-- .bac--puresdk-info-box-- .bac--inner-info-box-- .bac--info-icon--{margin-right:15px;width:10px;top:2px}#bac--info-blocks-wrapper-- .bac--puresdk-info-box-- .bac--inner-info-box-- .bac--info-main-text--{width:380px;margin-right:15px;font-size:12px;text-align:center}#bac--info-blocks-wrapper-- .bac--puresdk-info-box-- .bac--inner-info-box-- .bac--info-close-button--{width:10px;cursor:pointer;top:2px}.bac--custom-modal{position:fixed;width:70%;height:80%;min-width:400px;left:0;right:0;top:0;bottom:0;margin:auto;border:1px solid #979797;border-radius:5px;box-shadow:0 0 71px 0 #2F3849;background:#fff;z-index:999;overflow:auto;display:none}.bac--custom-modal.is-open{display:block}.bac--custom-modal .custom-modal__close-btn{text-decoration:none;padding-top:2px;line-height:18px;height:20px;width:20px;border-radius:50%;color:#909ba4;text-align:center;position:absolute;top:20px;right:20px;font-size:20px}.bac--custom-modal .custom-modal__close-btn:hover{text-decoration:none;color:#455066;cursor:pointer}.bac--custom-modal .custom-modal__wrapper{height:100%;display:flex;flex-direction:column}.bac--custom-modal .custom-modal__wrapper iframe{width:100%;height:100%}.bac--custom-modal .custom-modal__content-wrapper{height:100%;overflow:auto;margin-bottom:104px;border-top:2px solid #C9CDD7}.bac--custom-modal .custom-modal__content-wrapper.no-margin{margin-bottom:0}.bac--custom-modal .custom-modal__content{padding:20px;position:relative}.bac--custom-modal .custom-modal__content h3{color:#2F3849;font-size:20px;font-weight:600;line-height:27px}.bac--custom-modal .custom-modal__save{position:absolute;right:0;bottom:0;width:100%;padding:30px 32px;background-color:#F2F2F4}.bac--custom-modal .custom-modal__save a,.bac--custom-modal .custom-modal__save button{font-size:14px;line-height:22px;height:44px;width:100%}.bac--custom-modal .custom-modal__splitter{height:30px;line-height:30px;padding:0 20px;border-color:#D3D3D3;border-style:solid;border-width:1px 0 1px 0;background-color:#F0F0F0;color:#676F82;font-size:13px;font-weight:600}.bac--custom-modal .custom-modal__box{display:inline-block;vertical-align:middle;height:165px;width:165px;border:2px solid red;border-radius:5px;text-align:center;font-size:12px;font-weight:600;color:#9097A8;text-decoration:none;margin:10px 20px 10px 0;transition:0.1s all}.bac--custom-modal .custom-modal__box i{font-size:70px;display:block;margin:25px 0}.bac--custom-modal .custom-modal__box.active{color:yellow;border-color:yellow;text-decoration:none}.bac--custom-modal .custom-modal__box:hover,.bac--custom-modal .custom-modal__box:active,.bac--custom-modal .custom-modal__box:focus{color:#1AC0B4;border-color:yellow;text-decoration:none}.cloud-images__container{display:flex;flex-wrap:wrap;justify-content:flex-start}.cloud-images__pagination{padding:20px}.cloud-images__pagination li{display:inline-block;margin-right:10px}.cloud-images__pagination li a{color:#fff;background-color:#5e6776;border-radius:20px;text-decoration:none;display:block;font-weight:200;height:35px;width:35px;line-height:35px;text-align:center}.cloud-images__pagination li.active a{background-color:#2f3849}.cloud-images__item{width:155px;height:170px;border:1px solid #eee;background-color:#fff;border-radius:3px;margin:0 15px 15px 0;text-align:center;position:relative;cursor:pointer}.cloud-images__item .cloud-images__item__type{height:115px;font-size:90px;line-height:140px;border-top-left-radius:3px;border-top-right-radius:3px;color:#a2a2a2;background-color:#e9eaeb}.cloud-images__item .cloud-images__item__type>img{width:auto;height:auto;max-width:100%;max-height:100%}.cloud-images__item .cloud-images__item__details{padding:10px 0}.cloud-images__item .cloud-images__item__details .cloud-images__item__details__name{font-size:12px;outline:none;padding:0 10px;color:#a5abb5;border:none;width:100%;background-color:transparent;height:15px;display:inline-block;word-break:break-all}.cloud-images__item .cloud-images__item__details .cloud-images__item__details__date{font-size:10px;bottom:6px;width:155px;height:15px;color:#a5abb5;display:inline-block}.cloud-images__item .cloud-images__item__actions{display:flex;align-items:center;justify-content:center;position:absolute;top:0;left:0;width:100%;height:115px;background-color:rgba(78,83,91,0.83);opacity:0;visibility:hidden;border-top-left-radius:3px;border-top-right-radius:3px;text-align:center;transition:0.3s opacity}.cloud-images__item .cloud-images__item__actions a{font-size:16px;color:#fff;text-decoration:none}.cloud-images__item:hover .cloud-images__item .cloud-images__item__actions{opacity:1;visibility:visible}',
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
	general: {},
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
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uLy4uL25vZGVfbW9kdWxlcy9icm93c2VyLXBhY2svX3ByZWx1ZGUuanMiLCIuLi8uLi9ub2RlX21vZHVsZXMvYXNhcC9icm93c2VyLXJhdy5qcyIsIi4uLy4uL25vZGVfbW9kdWxlcy9wcm9taXNlL2xpYi9jb3JlLmpzIiwiLi4vLi4vbm9kZV9tb2R1bGVzL3Byb21pc2UvbGliL2VzNi1leHRlbnNpb25zLmpzIiwiLi4vLi4vbm9kZV9tb2R1bGVzL3Byb21pc2UvbGliL3JlamVjdGlvbi10cmFja2luZy5qcyIsIlBQQkEuanMiLCJpbmRleC5qcyIsIm1vZHVsZXMvYXZhdGFyLWNvbnRyb2xsZXIuanMiLCJtb2R1bGVzL2NhbGxlci5qcyIsIm1vZHVsZXMvY2xvdWRpbmFyeS1pbWFnZS1waWNrZXIuanMiLCJtb2R1bGVzL2RvbS5qcyIsIm1vZHVsZXMvaW5mby1jb250cm9sbGVyLmpzIiwibW9kdWxlcy9sb2dnZXIuanMiLCJtb2R1bGVzL3BhZ2luYXRpb24taGVscGVyLmpzIiwibW9kdWxlcy9wdWJzdWIuanMiLCJtb2R1bGVzL3N0b3JlLmpzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOztBQ0FBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7Ozs7QUMvTkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDck5BO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUMzR0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNoSEE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDeFdBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDOUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUN2SEE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNqR0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDclFBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDdEJBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDN0dBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3JCQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDL0NBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNyREE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBIiwiZmlsZSI6ImdlbmVyYXRlZC5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzQ29udGVudCI6WyIoZnVuY3Rpb24gZSh0LG4scil7ZnVuY3Rpb24gcyhvLHUpe2lmKCFuW29dKXtpZighdFtvXSl7dmFyIGE9dHlwZW9mIHJlcXVpcmU9PVwiZnVuY3Rpb25cIiYmcmVxdWlyZTtpZighdSYmYSlyZXR1cm4gYShvLCEwKTtpZihpKXJldHVybiBpKG8sITApO3ZhciBmPW5ldyBFcnJvcihcIkNhbm5vdCBmaW5kIG1vZHVsZSAnXCIrbytcIidcIik7dGhyb3cgZi5jb2RlPVwiTU9EVUxFX05PVF9GT1VORFwiLGZ9dmFyIGw9bltvXT17ZXhwb3J0czp7fX07dFtvXVswXS5jYWxsKGwuZXhwb3J0cyxmdW5jdGlvbihlKXt2YXIgbj10W29dWzFdW2VdO3JldHVybiBzKG4/bjplKX0sbCxsLmV4cG9ydHMsZSx0LG4scil9cmV0dXJuIG5bb10uZXhwb3J0c312YXIgaT10eXBlb2YgcmVxdWlyZT09XCJmdW5jdGlvblwiJiZyZXF1aXJlO2Zvcih2YXIgbz0wO288ci5sZW5ndGg7bysrKXMocltvXSk7cmV0dXJuIHN9KSIsIlwidXNlIHN0cmljdFwiO1xuXG4vLyBVc2UgdGhlIGZhc3Rlc3QgbWVhbnMgcG9zc2libGUgdG8gZXhlY3V0ZSBhIHRhc2sgaW4gaXRzIG93biB0dXJuLCB3aXRoXG4vLyBwcmlvcml0eSBvdmVyIG90aGVyIGV2ZW50cyBpbmNsdWRpbmcgSU8sIGFuaW1hdGlvbiwgcmVmbG93LCBhbmQgcmVkcmF3XG4vLyBldmVudHMgaW4gYnJvd3NlcnMuXG4vL1xuLy8gQW4gZXhjZXB0aW9uIHRocm93biBieSBhIHRhc2sgd2lsbCBwZXJtYW5lbnRseSBpbnRlcnJ1cHQgdGhlIHByb2Nlc3Npbmcgb2Zcbi8vIHN1YnNlcXVlbnQgdGFza3MuIFRoZSBoaWdoZXIgbGV2ZWwgYGFzYXBgIGZ1bmN0aW9uIGVuc3VyZXMgdGhhdCBpZiBhblxuLy8gZXhjZXB0aW9uIGlzIHRocm93biBieSBhIHRhc2ssIHRoYXQgdGhlIHRhc2sgcXVldWUgd2lsbCBjb250aW51ZSBmbHVzaGluZyBhc1xuLy8gc29vbiBhcyBwb3NzaWJsZSwgYnV0IGlmIHlvdSB1c2UgYHJhd0FzYXBgIGRpcmVjdGx5LCB5b3UgYXJlIHJlc3BvbnNpYmxlIHRvXG4vLyBlaXRoZXIgZW5zdXJlIHRoYXQgbm8gZXhjZXB0aW9ucyBhcmUgdGhyb3duIGZyb20geW91ciB0YXNrLCBvciB0byBtYW51YWxseVxuLy8gY2FsbCBgcmF3QXNhcC5yZXF1ZXN0Rmx1c2hgIGlmIGFuIGV4Y2VwdGlvbiBpcyB0aHJvd24uXG5tb2R1bGUuZXhwb3J0cyA9IHJhd0FzYXA7XG5mdW5jdGlvbiByYXdBc2FwKHRhc2spIHtcbiAgICBpZiAoIXF1ZXVlLmxlbmd0aCkge1xuICAgICAgICByZXF1ZXN0Rmx1c2goKTtcbiAgICAgICAgZmx1c2hpbmcgPSB0cnVlO1xuICAgIH1cbiAgICAvLyBFcXVpdmFsZW50IHRvIHB1c2gsIGJ1dCBhdm9pZHMgYSBmdW5jdGlvbiBjYWxsLlxuICAgIHF1ZXVlW3F1ZXVlLmxlbmd0aF0gPSB0YXNrO1xufVxuXG52YXIgcXVldWUgPSBbXTtcbi8vIE9uY2UgYSBmbHVzaCBoYXMgYmVlbiByZXF1ZXN0ZWQsIG5vIGZ1cnRoZXIgY2FsbHMgdG8gYHJlcXVlc3RGbHVzaGAgYXJlXG4vLyBuZWNlc3NhcnkgdW50aWwgdGhlIG5leHQgYGZsdXNoYCBjb21wbGV0ZXMuXG52YXIgZmx1c2hpbmcgPSBmYWxzZTtcbi8vIGByZXF1ZXN0Rmx1c2hgIGlzIGFuIGltcGxlbWVudGF0aW9uLXNwZWNpZmljIG1ldGhvZCB0aGF0IGF0dGVtcHRzIHRvIGtpY2tcbi8vIG9mZiBhIGBmbHVzaGAgZXZlbnQgYXMgcXVpY2tseSBhcyBwb3NzaWJsZS4gYGZsdXNoYCB3aWxsIGF0dGVtcHQgdG8gZXhoYXVzdFxuLy8gdGhlIGV2ZW50IHF1ZXVlIGJlZm9yZSB5aWVsZGluZyB0byB0aGUgYnJvd3NlcidzIG93biBldmVudCBsb29wLlxudmFyIHJlcXVlc3RGbHVzaDtcbi8vIFRoZSBwb3NpdGlvbiBvZiB0aGUgbmV4dCB0YXNrIHRvIGV4ZWN1dGUgaW4gdGhlIHRhc2sgcXVldWUuIFRoaXMgaXNcbi8vIHByZXNlcnZlZCBiZXR3ZWVuIGNhbGxzIHRvIGBmbHVzaGAgc28gdGhhdCBpdCBjYW4gYmUgcmVzdW1lZCBpZlxuLy8gYSB0YXNrIHRocm93cyBhbiBleGNlcHRpb24uXG52YXIgaW5kZXggPSAwO1xuLy8gSWYgYSB0YXNrIHNjaGVkdWxlcyBhZGRpdGlvbmFsIHRhc2tzIHJlY3Vyc2l2ZWx5LCB0aGUgdGFzayBxdWV1ZSBjYW4gZ3Jvd1xuLy8gdW5ib3VuZGVkLiBUbyBwcmV2ZW50IG1lbW9yeSBleGhhdXN0aW9uLCB0aGUgdGFzayBxdWV1ZSB3aWxsIHBlcmlvZGljYWxseVxuLy8gdHJ1bmNhdGUgYWxyZWFkeS1jb21wbGV0ZWQgdGFza3MuXG52YXIgY2FwYWNpdHkgPSAxMDI0O1xuXG4vLyBUaGUgZmx1c2ggZnVuY3Rpb24gcHJvY2Vzc2VzIGFsbCB0YXNrcyB0aGF0IGhhdmUgYmVlbiBzY2hlZHVsZWQgd2l0aFxuLy8gYHJhd0FzYXBgIHVubGVzcyBhbmQgdW50aWwgb25lIG9mIHRob3NlIHRhc2tzIHRocm93cyBhbiBleGNlcHRpb24uXG4vLyBJZiBhIHRhc2sgdGhyb3dzIGFuIGV4Y2VwdGlvbiwgYGZsdXNoYCBlbnN1cmVzIHRoYXQgaXRzIHN0YXRlIHdpbGwgcmVtYWluXG4vLyBjb25zaXN0ZW50IGFuZCB3aWxsIHJlc3VtZSB3aGVyZSBpdCBsZWZ0IG9mZiB3aGVuIGNhbGxlZCBhZ2Fpbi5cbi8vIEhvd2V2ZXIsIGBmbHVzaGAgZG9lcyBub3QgbWFrZSBhbnkgYXJyYW5nZW1lbnRzIHRvIGJlIGNhbGxlZCBhZ2FpbiBpZiBhblxuLy8gZXhjZXB0aW9uIGlzIHRocm93bi5cbmZ1bmN0aW9uIGZsdXNoKCkge1xuICAgIHdoaWxlIChpbmRleCA8IHF1ZXVlLmxlbmd0aCkge1xuICAgICAgICB2YXIgY3VycmVudEluZGV4ID0gaW5kZXg7XG4gICAgICAgIC8vIEFkdmFuY2UgdGhlIGluZGV4IGJlZm9yZSBjYWxsaW5nIHRoZSB0YXNrLiBUaGlzIGVuc3VyZXMgdGhhdCB3ZSB3aWxsXG4gICAgICAgIC8vIGJlZ2luIGZsdXNoaW5nIG9uIHRoZSBuZXh0IHRhc2sgdGhlIHRhc2sgdGhyb3dzIGFuIGVycm9yLlxuICAgICAgICBpbmRleCA9IGluZGV4ICsgMTtcbiAgICAgICAgcXVldWVbY3VycmVudEluZGV4XS5jYWxsKCk7XG4gICAgICAgIC8vIFByZXZlbnQgbGVha2luZyBtZW1vcnkgZm9yIGxvbmcgY2hhaW5zIG9mIHJlY3Vyc2l2ZSBjYWxscyB0byBgYXNhcGAuXG4gICAgICAgIC8vIElmIHdlIGNhbGwgYGFzYXBgIHdpdGhpbiB0YXNrcyBzY2hlZHVsZWQgYnkgYGFzYXBgLCB0aGUgcXVldWUgd2lsbFxuICAgICAgICAvLyBncm93LCBidXQgdG8gYXZvaWQgYW4gTyhuKSB3YWxrIGZvciBldmVyeSB0YXNrIHdlIGV4ZWN1dGUsIHdlIGRvbid0XG4gICAgICAgIC8vIHNoaWZ0IHRhc2tzIG9mZiB0aGUgcXVldWUgYWZ0ZXIgdGhleSBoYXZlIGJlZW4gZXhlY3V0ZWQuXG4gICAgICAgIC8vIEluc3RlYWQsIHdlIHBlcmlvZGljYWxseSBzaGlmdCAxMDI0IHRhc2tzIG9mZiB0aGUgcXVldWUuXG4gICAgICAgIGlmIChpbmRleCA+IGNhcGFjaXR5KSB7XG4gICAgICAgICAgICAvLyBNYW51YWxseSBzaGlmdCBhbGwgdmFsdWVzIHN0YXJ0aW5nIGF0IHRoZSBpbmRleCBiYWNrIHRvIHRoZVxuICAgICAgICAgICAgLy8gYmVnaW5uaW5nIG9mIHRoZSBxdWV1ZS5cbiAgICAgICAgICAgIGZvciAodmFyIHNjYW4gPSAwLCBuZXdMZW5ndGggPSBxdWV1ZS5sZW5ndGggLSBpbmRleDsgc2NhbiA8IG5ld0xlbmd0aDsgc2NhbisrKSB7XG4gICAgICAgICAgICAgICAgcXVldWVbc2Nhbl0gPSBxdWV1ZVtzY2FuICsgaW5kZXhdO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgcXVldWUubGVuZ3RoIC09IGluZGV4O1xuICAgICAgICAgICAgaW5kZXggPSAwO1xuICAgICAgICB9XG4gICAgfVxuICAgIHF1ZXVlLmxlbmd0aCA9IDA7XG4gICAgaW5kZXggPSAwO1xuICAgIGZsdXNoaW5nID0gZmFsc2U7XG59XG5cbi8vIGByZXF1ZXN0Rmx1c2hgIGlzIGltcGxlbWVudGVkIHVzaW5nIGEgc3RyYXRlZ3kgYmFzZWQgb24gZGF0YSBjb2xsZWN0ZWQgZnJvbVxuLy8gZXZlcnkgYXZhaWxhYmxlIFNhdWNlTGFicyBTZWxlbml1bSB3ZWIgZHJpdmVyIHdvcmtlciBhdCB0aW1lIG9mIHdyaXRpbmcuXG4vLyBodHRwczovL2RvY3MuZ29vZ2xlLmNvbS9zcHJlYWRzaGVldHMvZC8xbUctNVVZR3VwNXF4R2RFTVdraFA2QldDejA1M05VYjJFMVFvVVRVMTZ1QS9lZGl0I2dpZD03ODM3MjQ1OTNcblxuLy8gU2FmYXJpIDYgYW5kIDYuMSBmb3IgZGVza3RvcCwgaVBhZCwgYW5kIGlQaG9uZSBhcmUgdGhlIG9ubHkgYnJvd3NlcnMgdGhhdFxuLy8gaGF2ZSBXZWJLaXRNdXRhdGlvbk9ic2VydmVyIGJ1dCBub3QgdW4tcHJlZml4ZWQgTXV0YXRpb25PYnNlcnZlci5cbi8vIE11c3QgdXNlIGBnbG9iYWxgIG9yIGBzZWxmYCBpbnN0ZWFkIG9mIGB3aW5kb3dgIHRvIHdvcmsgaW4gYm90aCBmcmFtZXMgYW5kIHdlYlxuLy8gd29ya2Vycy4gYGdsb2JhbGAgaXMgYSBwcm92aXNpb24gb2YgQnJvd3NlcmlmeSwgTXIsIE1ycywgb3IgTW9wLlxuXG4vKiBnbG9iYWxzIHNlbGYgKi9cbnZhciBzY29wZSA9IHR5cGVvZiBnbG9iYWwgIT09IFwidW5kZWZpbmVkXCIgPyBnbG9iYWwgOiBzZWxmO1xudmFyIEJyb3dzZXJNdXRhdGlvbk9ic2VydmVyID0gc2NvcGUuTXV0YXRpb25PYnNlcnZlciB8fCBzY29wZS5XZWJLaXRNdXRhdGlvbk9ic2VydmVyO1xuXG4vLyBNdXRhdGlvbk9ic2VydmVycyBhcmUgZGVzaXJhYmxlIGJlY2F1c2UgdGhleSBoYXZlIGhpZ2ggcHJpb3JpdHkgYW5kIHdvcmtcbi8vIHJlbGlhYmx5IGV2ZXJ5d2hlcmUgdGhleSBhcmUgaW1wbGVtZW50ZWQuXG4vLyBUaGV5IGFyZSBpbXBsZW1lbnRlZCBpbiBhbGwgbW9kZXJuIGJyb3dzZXJzLlxuLy9cbi8vIC0gQW5kcm9pZCA0LTQuM1xuLy8gLSBDaHJvbWUgMjYtMzRcbi8vIC0gRmlyZWZveCAxNC0yOVxuLy8gLSBJbnRlcm5ldCBFeHBsb3JlciAxMVxuLy8gLSBpUGFkIFNhZmFyaSA2LTcuMVxuLy8gLSBpUGhvbmUgU2FmYXJpIDctNy4xXG4vLyAtIFNhZmFyaSA2LTdcbmlmICh0eXBlb2YgQnJvd3Nlck11dGF0aW9uT2JzZXJ2ZXIgPT09IFwiZnVuY3Rpb25cIikge1xuICAgIHJlcXVlc3RGbHVzaCA9IG1ha2VSZXF1ZXN0Q2FsbEZyb21NdXRhdGlvbk9ic2VydmVyKGZsdXNoKTtcblxuLy8gTWVzc2FnZUNoYW5uZWxzIGFyZSBkZXNpcmFibGUgYmVjYXVzZSB0aGV5IGdpdmUgZGlyZWN0IGFjY2VzcyB0byB0aGUgSFRNTFxuLy8gdGFzayBxdWV1ZSwgYXJlIGltcGxlbWVudGVkIGluIEludGVybmV0IEV4cGxvcmVyIDEwLCBTYWZhcmkgNS4wLTEsIGFuZCBPcGVyYVxuLy8gMTEtMTIsIGFuZCBpbiB3ZWIgd29ya2VycyBpbiBtYW55IGVuZ2luZXMuXG4vLyBBbHRob3VnaCBtZXNzYWdlIGNoYW5uZWxzIHlpZWxkIHRvIGFueSBxdWV1ZWQgcmVuZGVyaW5nIGFuZCBJTyB0YXNrcywgdGhleVxuLy8gd291bGQgYmUgYmV0dGVyIHRoYW4gaW1wb3NpbmcgdGhlIDRtcyBkZWxheSBvZiB0aW1lcnMuXG4vLyBIb3dldmVyLCB0aGV5IGRvIG5vdCB3b3JrIHJlbGlhYmx5IGluIEludGVybmV0IEV4cGxvcmVyIG9yIFNhZmFyaS5cblxuLy8gSW50ZXJuZXQgRXhwbG9yZXIgMTAgaXMgdGhlIG9ubHkgYnJvd3NlciB0aGF0IGhhcyBzZXRJbW1lZGlhdGUgYnV0IGRvZXNcbi8vIG5vdCBoYXZlIE11dGF0aW9uT2JzZXJ2ZXJzLlxuLy8gQWx0aG91Z2ggc2V0SW1tZWRpYXRlIHlpZWxkcyB0byB0aGUgYnJvd3NlcidzIHJlbmRlcmVyLCBpdCB3b3VsZCBiZVxuLy8gcHJlZmVycmFibGUgdG8gZmFsbGluZyBiYWNrIHRvIHNldFRpbWVvdXQgc2luY2UgaXQgZG9lcyBub3QgaGF2ZVxuLy8gdGhlIG1pbmltdW0gNG1zIHBlbmFsdHkuXG4vLyBVbmZvcnR1bmF0ZWx5IHRoZXJlIGFwcGVhcnMgdG8gYmUgYSBidWcgaW4gSW50ZXJuZXQgRXhwbG9yZXIgMTAgTW9iaWxlIChhbmRcbi8vIERlc2t0b3AgdG8gYSBsZXNzZXIgZXh0ZW50KSB0aGF0IHJlbmRlcnMgYm90aCBzZXRJbW1lZGlhdGUgYW5kXG4vLyBNZXNzYWdlQ2hhbm5lbCB1c2VsZXNzIGZvciB0aGUgcHVycG9zZXMgb2YgQVNBUC5cbi8vIGh0dHBzOi8vZ2l0aHViLmNvbS9rcmlza293YWwvcS9pc3N1ZXMvMzk2XG5cbi8vIFRpbWVycyBhcmUgaW1wbGVtZW50ZWQgdW5pdmVyc2FsbHkuXG4vLyBXZSBmYWxsIGJhY2sgdG8gdGltZXJzIGluIHdvcmtlcnMgaW4gbW9zdCBlbmdpbmVzLCBhbmQgaW4gZm9yZWdyb3VuZFxuLy8gY29udGV4dHMgaW4gdGhlIGZvbGxvd2luZyBicm93c2Vycy5cbi8vIEhvd2V2ZXIsIG5vdGUgdGhhdCBldmVuIHRoaXMgc2ltcGxlIGNhc2UgcmVxdWlyZXMgbnVhbmNlcyB0byBvcGVyYXRlIGluIGFcbi8vIGJyb2FkIHNwZWN0cnVtIG9mIGJyb3dzZXJzLlxuLy9cbi8vIC0gRmlyZWZveCAzLTEzXG4vLyAtIEludGVybmV0IEV4cGxvcmVyIDYtOVxuLy8gLSBpUGFkIFNhZmFyaSA0LjNcbi8vIC0gTHlueCAyLjguN1xufSBlbHNlIHtcbiAgICByZXF1ZXN0Rmx1c2ggPSBtYWtlUmVxdWVzdENhbGxGcm9tVGltZXIoZmx1c2gpO1xufVxuXG4vLyBgcmVxdWVzdEZsdXNoYCByZXF1ZXN0cyB0aGF0IHRoZSBoaWdoIHByaW9yaXR5IGV2ZW50IHF1ZXVlIGJlIGZsdXNoZWQgYXNcbi8vIHNvb24gYXMgcG9zc2libGUuXG4vLyBUaGlzIGlzIHVzZWZ1bCB0byBwcmV2ZW50IGFuIGVycm9yIHRocm93biBpbiBhIHRhc2sgZnJvbSBzdGFsbGluZyB0aGUgZXZlbnRcbi8vIHF1ZXVlIGlmIHRoZSBleGNlcHRpb24gaGFuZGxlZCBieSBOb2RlLmpz4oCZc1xuLy8gYHByb2Nlc3Mub24oXCJ1bmNhdWdodEV4Y2VwdGlvblwiKWAgb3IgYnkgYSBkb21haW4uXG5yYXdBc2FwLnJlcXVlc3RGbHVzaCA9IHJlcXVlc3RGbHVzaDtcblxuLy8gVG8gcmVxdWVzdCBhIGhpZ2ggcHJpb3JpdHkgZXZlbnQsIHdlIGluZHVjZSBhIG11dGF0aW9uIG9ic2VydmVyIGJ5IHRvZ2dsaW5nXG4vLyB0aGUgdGV4dCBvZiBhIHRleHQgbm9kZSBiZXR3ZWVuIFwiMVwiIGFuZCBcIi0xXCIuXG5mdW5jdGlvbiBtYWtlUmVxdWVzdENhbGxGcm9tTXV0YXRpb25PYnNlcnZlcihjYWxsYmFjaykge1xuICAgIHZhciB0b2dnbGUgPSAxO1xuICAgIHZhciBvYnNlcnZlciA9IG5ldyBCcm93c2VyTXV0YXRpb25PYnNlcnZlcihjYWxsYmFjayk7XG4gICAgdmFyIG5vZGUgPSBkb2N1bWVudC5jcmVhdGVUZXh0Tm9kZShcIlwiKTtcbiAgICBvYnNlcnZlci5vYnNlcnZlKG5vZGUsIHtjaGFyYWN0ZXJEYXRhOiB0cnVlfSk7XG4gICAgcmV0dXJuIGZ1bmN0aW9uIHJlcXVlc3RDYWxsKCkge1xuICAgICAgICB0b2dnbGUgPSAtdG9nZ2xlO1xuICAgICAgICBub2RlLmRhdGEgPSB0b2dnbGU7XG4gICAgfTtcbn1cblxuLy8gVGhlIG1lc3NhZ2UgY2hhbm5lbCB0ZWNobmlxdWUgd2FzIGRpc2NvdmVyZWQgYnkgTWFsdGUgVWJsIGFuZCB3YXMgdGhlXG4vLyBvcmlnaW5hbCBmb3VuZGF0aW9uIGZvciB0aGlzIGxpYnJhcnkuXG4vLyBodHRwOi8vd3d3Lm5vbmJsb2NraW5nLmlvLzIwMTEvMDYvd2luZG93bmV4dHRpY2suaHRtbFxuXG4vLyBTYWZhcmkgNi4wLjUgKGF0IGxlYXN0KSBpbnRlcm1pdHRlbnRseSBmYWlscyB0byBjcmVhdGUgbWVzc2FnZSBwb3J0cyBvbiBhXG4vLyBwYWdlJ3MgZmlyc3QgbG9hZC4gVGhhbmtmdWxseSwgdGhpcyB2ZXJzaW9uIG9mIFNhZmFyaSBzdXBwb3J0c1xuLy8gTXV0YXRpb25PYnNlcnZlcnMsIHNvIHdlIGRvbid0IG5lZWQgdG8gZmFsbCBiYWNrIGluIHRoYXQgY2FzZS5cblxuLy8gZnVuY3Rpb24gbWFrZVJlcXVlc3RDYWxsRnJvbU1lc3NhZ2VDaGFubmVsKGNhbGxiYWNrKSB7XG4vLyAgICAgdmFyIGNoYW5uZWwgPSBuZXcgTWVzc2FnZUNoYW5uZWwoKTtcbi8vICAgICBjaGFubmVsLnBvcnQxLm9ubWVzc2FnZSA9IGNhbGxiYWNrO1xuLy8gICAgIHJldHVybiBmdW5jdGlvbiByZXF1ZXN0Q2FsbCgpIHtcbi8vICAgICAgICAgY2hhbm5lbC5wb3J0Mi5wb3N0TWVzc2FnZSgwKTtcbi8vICAgICB9O1xuLy8gfVxuXG4vLyBGb3IgcmVhc29ucyBleHBsYWluZWQgYWJvdmUsIHdlIGFyZSBhbHNvIHVuYWJsZSB0byB1c2UgYHNldEltbWVkaWF0ZWBcbi8vIHVuZGVyIGFueSBjaXJjdW1zdGFuY2VzLlxuLy8gRXZlbiBpZiB3ZSB3ZXJlLCB0aGVyZSBpcyBhbm90aGVyIGJ1ZyBpbiBJbnRlcm5ldCBFeHBsb3JlciAxMC5cbi8vIEl0IGlzIG5vdCBzdWZmaWNpZW50IHRvIGFzc2lnbiBgc2V0SW1tZWRpYXRlYCB0byBgcmVxdWVzdEZsdXNoYCBiZWNhdXNlXG4vLyBgc2V0SW1tZWRpYXRlYCBtdXN0IGJlIGNhbGxlZCAqYnkgbmFtZSogYW5kIHRoZXJlZm9yZSBtdXN0IGJlIHdyYXBwZWQgaW4gYVxuLy8gY2xvc3VyZS5cbi8vIE5ldmVyIGZvcmdldC5cblxuLy8gZnVuY3Rpb24gbWFrZVJlcXVlc3RDYWxsRnJvbVNldEltbWVkaWF0ZShjYWxsYmFjaykge1xuLy8gICAgIHJldHVybiBmdW5jdGlvbiByZXF1ZXN0Q2FsbCgpIHtcbi8vICAgICAgICAgc2V0SW1tZWRpYXRlKGNhbGxiYWNrKTtcbi8vICAgICB9O1xuLy8gfVxuXG4vLyBTYWZhcmkgNi4wIGhhcyBhIHByb2JsZW0gd2hlcmUgdGltZXJzIHdpbGwgZ2V0IGxvc3Qgd2hpbGUgdGhlIHVzZXIgaXNcbi8vIHNjcm9sbGluZy4gVGhpcyBwcm9ibGVtIGRvZXMgbm90IGltcGFjdCBBU0FQIGJlY2F1c2UgU2FmYXJpIDYuMCBzdXBwb3J0c1xuLy8gbXV0YXRpb24gb2JzZXJ2ZXJzLCBzbyB0aGF0IGltcGxlbWVudGF0aW9uIGlzIHVzZWQgaW5zdGVhZC5cbi8vIEhvd2V2ZXIsIGlmIHdlIGV2ZXIgZWxlY3QgdG8gdXNlIHRpbWVycyBpbiBTYWZhcmksIHRoZSBwcmV2YWxlbnQgd29yay1hcm91bmRcbi8vIGlzIHRvIGFkZCBhIHNjcm9sbCBldmVudCBsaXN0ZW5lciB0aGF0IGNhbGxzIGZvciBhIGZsdXNoLlxuXG4vLyBgc2V0VGltZW91dGAgZG9lcyBub3QgY2FsbCB0aGUgcGFzc2VkIGNhbGxiYWNrIGlmIHRoZSBkZWxheSBpcyBsZXNzIHRoYW5cbi8vIGFwcHJveGltYXRlbHkgNyBpbiB3ZWIgd29ya2VycyBpbiBGaXJlZm94IDggdGhyb3VnaCAxOCwgYW5kIHNvbWV0aW1lcyBub3Rcbi8vIGV2ZW4gdGhlbi5cblxuZnVuY3Rpb24gbWFrZVJlcXVlc3RDYWxsRnJvbVRpbWVyKGNhbGxiYWNrKSB7XG4gICAgcmV0dXJuIGZ1bmN0aW9uIHJlcXVlc3RDYWxsKCkge1xuICAgICAgICAvLyBXZSBkaXNwYXRjaCBhIHRpbWVvdXQgd2l0aCBhIHNwZWNpZmllZCBkZWxheSBvZiAwIGZvciBlbmdpbmVzIHRoYXRcbiAgICAgICAgLy8gY2FuIHJlbGlhYmx5IGFjY29tbW9kYXRlIHRoYXQgcmVxdWVzdC4gVGhpcyB3aWxsIHVzdWFsbHkgYmUgc25hcHBlZFxuICAgICAgICAvLyB0byBhIDQgbWlsaXNlY29uZCBkZWxheSwgYnV0IG9uY2Ugd2UncmUgZmx1c2hpbmcsIHRoZXJlJ3Mgbm8gZGVsYXlcbiAgICAgICAgLy8gYmV0d2VlbiBldmVudHMuXG4gICAgICAgIHZhciB0aW1lb3V0SGFuZGxlID0gc2V0VGltZW91dChoYW5kbGVUaW1lciwgMCk7XG4gICAgICAgIC8vIEhvd2V2ZXIsIHNpbmNlIHRoaXMgdGltZXIgZ2V0cyBmcmVxdWVudGx5IGRyb3BwZWQgaW4gRmlyZWZveFxuICAgICAgICAvLyB3b3JrZXJzLCB3ZSBlbmxpc3QgYW4gaW50ZXJ2YWwgaGFuZGxlIHRoYXQgd2lsbCB0cnkgdG8gZmlyZVxuICAgICAgICAvLyBhbiBldmVudCAyMCB0aW1lcyBwZXIgc2Vjb25kIHVudGlsIGl0IHN1Y2NlZWRzLlxuICAgICAgICB2YXIgaW50ZXJ2YWxIYW5kbGUgPSBzZXRJbnRlcnZhbChoYW5kbGVUaW1lciwgNTApO1xuXG4gICAgICAgIGZ1bmN0aW9uIGhhbmRsZVRpbWVyKCkge1xuICAgICAgICAgICAgLy8gV2hpY2hldmVyIHRpbWVyIHN1Y2NlZWRzIHdpbGwgY2FuY2VsIGJvdGggdGltZXJzIGFuZFxuICAgICAgICAgICAgLy8gZXhlY3V0ZSB0aGUgY2FsbGJhY2suXG4gICAgICAgICAgICBjbGVhclRpbWVvdXQodGltZW91dEhhbmRsZSk7XG4gICAgICAgICAgICBjbGVhckludGVydmFsKGludGVydmFsSGFuZGxlKTtcbiAgICAgICAgICAgIGNhbGxiYWNrKCk7XG4gICAgICAgIH1cbiAgICB9O1xufVxuXG4vLyBUaGlzIGlzIGZvciBgYXNhcC5qc2Agb25seS5cbi8vIEl0cyBuYW1lIHdpbGwgYmUgcGVyaW9kaWNhbGx5IHJhbmRvbWl6ZWQgdG8gYnJlYWsgYW55IGNvZGUgdGhhdCBkZXBlbmRzIG9uXG4vLyBpdHMgZXhpc3RlbmNlLlxucmF3QXNhcC5tYWtlUmVxdWVzdENhbGxGcm9tVGltZXIgPSBtYWtlUmVxdWVzdENhbGxGcm9tVGltZXI7XG5cbi8vIEFTQVAgd2FzIG9yaWdpbmFsbHkgYSBuZXh0VGljayBzaGltIGluY2x1ZGVkIGluIFEuIFRoaXMgd2FzIGZhY3RvcmVkIG91dFxuLy8gaW50byB0aGlzIEFTQVAgcGFja2FnZS4gSXQgd2FzIGxhdGVyIGFkYXB0ZWQgdG8gUlNWUCB3aGljaCBtYWRlIGZ1cnRoZXJcbi8vIGFtZW5kbWVudHMuIFRoZXNlIGRlY2lzaW9ucywgcGFydGljdWxhcmx5IHRvIG1hcmdpbmFsaXplIE1lc3NhZ2VDaGFubmVsIGFuZFxuLy8gdG8gY2FwdHVyZSB0aGUgTXV0YXRpb25PYnNlcnZlciBpbXBsZW1lbnRhdGlvbiBpbiBhIGNsb3N1cmUsIHdlcmUgaW50ZWdyYXRlZFxuLy8gYmFjayBpbnRvIEFTQVAgcHJvcGVyLlxuLy8gaHR0cHM6Ly9naXRodWIuY29tL3RpbGRlaW8vcnN2cC5qcy9ibG9iL2NkZGY3MjMyNTQ2YTljZjg1ODUyNGI3NWNkZTZmOWVkZjcyNjIwYTcvbGliL3JzdnAvYXNhcC5qc1xuIiwiJ3VzZSBzdHJpY3QnO1xuXG52YXIgYXNhcCA9IHJlcXVpcmUoJ2FzYXAvcmF3Jyk7XG5cbmZ1bmN0aW9uIG5vb3AoKSB7fVxuXG4vLyBTdGF0ZXM6XG4vL1xuLy8gMCAtIHBlbmRpbmdcbi8vIDEgLSBmdWxmaWxsZWQgd2l0aCBfdmFsdWVcbi8vIDIgLSByZWplY3RlZCB3aXRoIF92YWx1ZVxuLy8gMyAtIGFkb3B0ZWQgdGhlIHN0YXRlIG9mIGFub3RoZXIgcHJvbWlzZSwgX3ZhbHVlXG4vL1xuLy8gb25jZSB0aGUgc3RhdGUgaXMgbm8gbG9uZ2VyIHBlbmRpbmcgKDApIGl0IGlzIGltbXV0YWJsZVxuXG4vLyBBbGwgYF9gIHByZWZpeGVkIHByb3BlcnRpZXMgd2lsbCBiZSByZWR1Y2VkIHRvIGBfe3JhbmRvbSBudW1iZXJ9YFxuLy8gYXQgYnVpbGQgdGltZSB0byBvYmZ1c2NhdGUgdGhlbSBhbmQgZGlzY291cmFnZSB0aGVpciB1c2UuXG4vLyBXZSBkb24ndCB1c2Ugc3ltYm9scyBvciBPYmplY3QuZGVmaW5lUHJvcGVydHkgdG8gZnVsbHkgaGlkZSB0aGVtXG4vLyBiZWNhdXNlIHRoZSBwZXJmb3JtYW5jZSBpc24ndCBnb29kIGVub3VnaC5cblxuXG4vLyB0byBhdm9pZCB1c2luZyB0cnkvY2F0Y2ggaW5zaWRlIGNyaXRpY2FsIGZ1bmN0aW9ucywgd2Vcbi8vIGV4dHJhY3QgdGhlbSB0byBoZXJlLlxudmFyIExBU1RfRVJST1IgPSBudWxsO1xudmFyIElTX0VSUk9SID0ge307XG5mdW5jdGlvbiBnZXRUaGVuKG9iaikge1xuICB0cnkge1xuICAgIHJldHVybiBvYmoudGhlbjtcbiAgfSBjYXRjaCAoZXgpIHtcbiAgICBMQVNUX0VSUk9SID0gZXg7XG4gICAgcmV0dXJuIElTX0VSUk9SO1xuICB9XG59XG5cbmZ1bmN0aW9uIHRyeUNhbGxPbmUoZm4sIGEpIHtcbiAgdHJ5IHtcbiAgICByZXR1cm4gZm4oYSk7XG4gIH0gY2F0Y2ggKGV4KSB7XG4gICAgTEFTVF9FUlJPUiA9IGV4O1xuICAgIHJldHVybiBJU19FUlJPUjtcbiAgfVxufVxuZnVuY3Rpb24gdHJ5Q2FsbFR3byhmbiwgYSwgYikge1xuICB0cnkge1xuICAgIGZuKGEsIGIpO1xuICB9IGNhdGNoIChleCkge1xuICAgIExBU1RfRVJST1IgPSBleDtcbiAgICByZXR1cm4gSVNfRVJST1I7XG4gIH1cbn1cblxubW9kdWxlLmV4cG9ydHMgPSBQcm9taXNlO1xuXG5mdW5jdGlvbiBQcm9taXNlKGZuKSB7XG4gIGlmICh0eXBlb2YgdGhpcyAhPT0gJ29iamVjdCcpIHtcbiAgICB0aHJvdyBuZXcgVHlwZUVycm9yKCdQcm9taXNlcyBtdXN0IGJlIGNvbnN0cnVjdGVkIHZpYSBuZXcnKTtcbiAgfVxuICBpZiAodHlwZW9mIGZuICE9PSAnZnVuY3Rpb24nKSB7XG4gICAgdGhyb3cgbmV3IFR5cGVFcnJvcignUHJvbWlzZSBjb25zdHJ1Y3RvclxcJ3MgYXJndW1lbnQgaXMgbm90IGEgZnVuY3Rpb24nKTtcbiAgfVxuICB0aGlzLl83NSA9IDA7XG4gIHRoaXMuXzgzID0gMDtcbiAgdGhpcy5fMTggPSBudWxsO1xuICB0aGlzLl8zOCA9IG51bGw7XG4gIGlmIChmbiA9PT0gbm9vcCkgcmV0dXJuO1xuICBkb1Jlc29sdmUoZm4sIHRoaXMpO1xufVxuUHJvbWlzZS5fNDcgPSBudWxsO1xuUHJvbWlzZS5fNzEgPSBudWxsO1xuUHJvbWlzZS5fNDQgPSBub29wO1xuXG5Qcm9taXNlLnByb3RvdHlwZS50aGVuID0gZnVuY3Rpb24ob25GdWxmaWxsZWQsIG9uUmVqZWN0ZWQpIHtcbiAgaWYgKHRoaXMuY29uc3RydWN0b3IgIT09IFByb21pc2UpIHtcbiAgICByZXR1cm4gc2FmZVRoZW4odGhpcywgb25GdWxmaWxsZWQsIG9uUmVqZWN0ZWQpO1xuICB9XG4gIHZhciByZXMgPSBuZXcgUHJvbWlzZShub29wKTtcbiAgaGFuZGxlKHRoaXMsIG5ldyBIYW5kbGVyKG9uRnVsZmlsbGVkLCBvblJlamVjdGVkLCByZXMpKTtcbiAgcmV0dXJuIHJlcztcbn07XG5cbmZ1bmN0aW9uIHNhZmVUaGVuKHNlbGYsIG9uRnVsZmlsbGVkLCBvblJlamVjdGVkKSB7XG4gIHJldHVybiBuZXcgc2VsZi5jb25zdHJ1Y3RvcihmdW5jdGlvbiAocmVzb2x2ZSwgcmVqZWN0KSB7XG4gICAgdmFyIHJlcyA9IG5ldyBQcm9taXNlKG5vb3ApO1xuICAgIHJlcy50aGVuKHJlc29sdmUsIHJlamVjdCk7XG4gICAgaGFuZGxlKHNlbGYsIG5ldyBIYW5kbGVyKG9uRnVsZmlsbGVkLCBvblJlamVjdGVkLCByZXMpKTtcbiAgfSk7XG59XG5mdW5jdGlvbiBoYW5kbGUoc2VsZiwgZGVmZXJyZWQpIHtcbiAgd2hpbGUgKHNlbGYuXzgzID09PSAzKSB7XG4gICAgc2VsZiA9IHNlbGYuXzE4O1xuICB9XG4gIGlmIChQcm9taXNlLl80Nykge1xuICAgIFByb21pc2UuXzQ3KHNlbGYpO1xuICB9XG4gIGlmIChzZWxmLl84MyA9PT0gMCkge1xuICAgIGlmIChzZWxmLl83NSA9PT0gMCkge1xuICAgICAgc2VsZi5fNzUgPSAxO1xuICAgICAgc2VsZi5fMzggPSBkZWZlcnJlZDtcbiAgICAgIHJldHVybjtcbiAgICB9XG4gICAgaWYgKHNlbGYuXzc1ID09PSAxKSB7XG4gICAgICBzZWxmLl83NSA9IDI7XG4gICAgICBzZWxmLl8zOCA9IFtzZWxmLl8zOCwgZGVmZXJyZWRdO1xuICAgICAgcmV0dXJuO1xuICAgIH1cbiAgICBzZWxmLl8zOC5wdXNoKGRlZmVycmVkKTtcbiAgICByZXR1cm47XG4gIH1cbiAgaGFuZGxlUmVzb2x2ZWQoc2VsZiwgZGVmZXJyZWQpO1xufVxuXG5mdW5jdGlvbiBoYW5kbGVSZXNvbHZlZChzZWxmLCBkZWZlcnJlZCkge1xuICBhc2FwKGZ1bmN0aW9uKCkge1xuICAgIHZhciBjYiA9IHNlbGYuXzgzID09PSAxID8gZGVmZXJyZWQub25GdWxmaWxsZWQgOiBkZWZlcnJlZC5vblJlamVjdGVkO1xuICAgIGlmIChjYiA9PT0gbnVsbCkge1xuICAgICAgaWYgKHNlbGYuXzgzID09PSAxKSB7XG4gICAgICAgIHJlc29sdmUoZGVmZXJyZWQucHJvbWlzZSwgc2VsZi5fMTgpO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgcmVqZWN0KGRlZmVycmVkLnByb21pc2UsIHNlbGYuXzE4KTtcbiAgICAgIH1cbiAgICAgIHJldHVybjtcbiAgICB9XG4gICAgdmFyIHJldCA9IHRyeUNhbGxPbmUoY2IsIHNlbGYuXzE4KTtcbiAgICBpZiAocmV0ID09PSBJU19FUlJPUikge1xuICAgICAgcmVqZWN0KGRlZmVycmVkLnByb21pc2UsIExBU1RfRVJST1IpO1xuICAgIH0gZWxzZSB7XG4gICAgICByZXNvbHZlKGRlZmVycmVkLnByb21pc2UsIHJldCk7XG4gICAgfVxuICB9KTtcbn1cbmZ1bmN0aW9uIHJlc29sdmUoc2VsZiwgbmV3VmFsdWUpIHtcbiAgLy8gUHJvbWlzZSBSZXNvbHV0aW9uIFByb2NlZHVyZTogaHR0cHM6Ly9naXRodWIuY29tL3Byb21pc2VzLWFwbHVzL3Byb21pc2VzLXNwZWMjdGhlLXByb21pc2UtcmVzb2x1dGlvbi1wcm9jZWR1cmVcbiAgaWYgKG5ld1ZhbHVlID09PSBzZWxmKSB7XG4gICAgcmV0dXJuIHJlamVjdChcbiAgICAgIHNlbGYsXG4gICAgICBuZXcgVHlwZUVycm9yKCdBIHByb21pc2UgY2Fubm90IGJlIHJlc29sdmVkIHdpdGggaXRzZWxmLicpXG4gICAgKTtcbiAgfVxuICBpZiAoXG4gICAgbmV3VmFsdWUgJiZcbiAgICAodHlwZW9mIG5ld1ZhbHVlID09PSAnb2JqZWN0JyB8fCB0eXBlb2YgbmV3VmFsdWUgPT09ICdmdW5jdGlvbicpXG4gICkge1xuICAgIHZhciB0aGVuID0gZ2V0VGhlbihuZXdWYWx1ZSk7XG4gICAgaWYgKHRoZW4gPT09IElTX0VSUk9SKSB7XG4gICAgICByZXR1cm4gcmVqZWN0KHNlbGYsIExBU1RfRVJST1IpO1xuICAgIH1cbiAgICBpZiAoXG4gICAgICB0aGVuID09PSBzZWxmLnRoZW4gJiZcbiAgICAgIG5ld1ZhbHVlIGluc3RhbmNlb2YgUHJvbWlzZVxuICAgICkge1xuICAgICAgc2VsZi5fODMgPSAzO1xuICAgICAgc2VsZi5fMTggPSBuZXdWYWx1ZTtcbiAgICAgIGZpbmFsZShzZWxmKTtcbiAgICAgIHJldHVybjtcbiAgICB9IGVsc2UgaWYgKHR5cGVvZiB0aGVuID09PSAnZnVuY3Rpb24nKSB7XG4gICAgICBkb1Jlc29sdmUodGhlbi5iaW5kKG5ld1ZhbHVlKSwgc2VsZik7XG4gICAgICByZXR1cm47XG4gICAgfVxuICB9XG4gIHNlbGYuXzgzID0gMTtcbiAgc2VsZi5fMTggPSBuZXdWYWx1ZTtcbiAgZmluYWxlKHNlbGYpO1xufVxuXG5mdW5jdGlvbiByZWplY3Qoc2VsZiwgbmV3VmFsdWUpIHtcbiAgc2VsZi5fODMgPSAyO1xuICBzZWxmLl8xOCA9IG5ld1ZhbHVlO1xuICBpZiAoUHJvbWlzZS5fNzEpIHtcbiAgICBQcm9taXNlLl83MShzZWxmLCBuZXdWYWx1ZSk7XG4gIH1cbiAgZmluYWxlKHNlbGYpO1xufVxuZnVuY3Rpb24gZmluYWxlKHNlbGYpIHtcbiAgaWYgKHNlbGYuXzc1ID09PSAxKSB7XG4gICAgaGFuZGxlKHNlbGYsIHNlbGYuXzM4KTtcbiAgICBzZWxmLl8zOCA9IG51bGw7XG4gIH1cbiAgaWYgKHNlbGYuXzc1ID09PSAyKSB7XG4gICAgZm9yICh2YXIgaSA9IDA7IGkgPCBzZWxmLl8zOC5sZW5ndGg7IGkrKykge1xuICAgICAgaGFuZGxlKHNlbGYsIHNlbGYuXzM4W2ldKTtcbiAgICB9XG4gICAgc2VsZi5fMzggPSBudWxsO1xuICB9XG59XG5cbmZ1bmN0aW9uIEhhbmRsZXIob25GdWxmaWxsZWQsIG9uUmVqZWN0ZWQsIHByb21pc2Upe1xuICB0aGlzLm9uRnVsZmlsbGVkID0gdHlwZW9mIG9uRnVsZmlsbGVkID09PSAnZnVuY3Rpb24nID8gb25GdWxmaWxsZWQgOiBudWxsO1xuICB0aGlzLm9uUmVqZWN0ZWQgPSB0eXBlb2Ygb25SZWplY3RlZCA9PT0gJ2Z1bmN0aW9uJyA/IG9uUmVqZWN0ZWQgOiBudWxsO1xuICB0aGlzLnByb21pc2UgPSBwcm9taXNlO1xufVxuXG4vKipcbiAqIFRha2UgYSBwb3RlbnRpYWxseSBtaXNiZWhhdmluZyByZXNvbHZlciBmdW5jdGlvbiBhbmQgbWFrZSBzdXJlXG4gKiBvbkZ1bGZpbGxlZCBhbmQgb25SZWplY3RlZCBhcmUgb25seSBjYWxsZWQgb25jZS5cbiAqXG4gKiBNYWtlcyBubyBndWFyYW50ZWVzIGFib3V0IGFzeW5jaHJvbnkuXG4gKi9cbmZ1bmN0aW9uIGRvUmVzb2x2ZShmbiwgcHJvbWlzZSkge1xuICB2YXIgZG9uZSA9IGZhbHNlO1xuICB2YXIgcmVzID0gdHJ5Q2FsbFR3byhmbiwgZnVuY3Rpb24gKHZhbHVlKSB7XG4gICAgaWYgKGRvbmUpIHJldHVybjtcbiAgICBkb25lID0gdHJ1ZTtcbiAgICByZXNvbHZlKHByb21pc2UsIHZhbHVlKTtcbiAgfSwgZnVuY3Rpb24gKHJlYXNvbikge1xuICAgIGlmIChkb25lKSByZXR1cm47XG4gICAgZG9uZSA9IHRydWU7XG4gICAgcmVqZWN0KHByb21pc2UsIHJlYXNvbik7XG4gIH0pO1xuICBpZiAoIWRvbmUgJiYgcmVzID09PSBJU19FUlJPUikge1xuICAgIGRvbmUgPSB0cnVlO1xuICAgIHJlamVjdChwcm9taXNlLCBMQVNUX0VSUk9SKTtcbiAgfVxufVxuIiwiJ3VzZSBzdHJpY3QnO1xuXG4vL1RoaXMgZmlsZSBjb250YWlucyB0aGUgRVM2IGV4dGVuc2lvbnMgdG8gdGhlIGNvcmUgUHJvbWlzZXMvQSsgQVBJXG5cbnZhciBQcm9taXNlID0gcmVxdWlyZSgnLi9jb3JlLmpzJyk7XG5cbm1vZHVsZS5leHBvcnRzID0gUHJvbWlzZTtcblxuLyogU3RhdGljIEZ1bmN0aW9ucyAqL1xuXG52YXIgVFJVRSA9IHZhbHVlUHJvbWlzZSh0cnVlKTtcbnZhciBGQUxTRSA9IHZhbHVlUHJvbWlzZShmYWxzZSk7XG52YXIgTlVMTCA9IHZhbHVlUHJvbWlzZShudWxsKTtcbnZhciBVTkRFRklORUQgPSB2YWx1ZVByb21pc2UodW5kZWZpbmVkKTtcbnZhciBaRVJPID0gdmFsdWVQcm9taXNlKDApO1xudmFyIEVNUFRZU1RSSU5HID0gdmFsdWVQcm9taXNlKCcnKTtcblxuZnVuY3Rpb24gdmFsdWVQcm9taXNlKHZhbHVlKSB7XG4gIHZhciBwID0gbmV3IFByb21pc2UoUHJvbWlzZS5fNDQpO1xuICBwLl84MyA9IDE7XG4gIHAuXzE4ID0gdmFsdWU7XG4gIHJldHVybiBwO1xufVxuUHJvbWlzZS5yZXNvbHZlID0gZnVuY3Rpb24gKHZhbHVlKSB7XG4gIGlmICh2YWx1ZSBpbnN0YW5jZW9mIFByb21pc2UpIHJldHVybiB2YWx1ZTtcblxuICBpZiAodmFsdWUgPT09IG51bGwpIHJldHVybiBOVUxMO1xuICBpZiAodmFsdWUgPT09IHVuZGVmaW5lZCkgcmV0dXJuIFVOREVGSU5FRDtcbiAgaWYgKHZhbHVlID09PSB0cnVlKSByZXR1cm4gVFJVRTtcbiAgaWYgKHZhbHVlID09PSBmYWxzZSkgcmV0dXJuIEZBTFNFO1xuICBpZiAodmFsdWUgPT09IDApIHJldHVybiBaRVJPO1xuICBpZiAodmFsdWUgPT09ICcnKSByZXR1cm4gRU1QVFlTVFJJTkc7XG5cbiAgaWYgKHR5cGVvZiB2YWx1ZSA9PT0gJ29iamVjdCcgfHwgdHlwZW9mIHZhbHVlID09PSAnZnVuY3Rpb24nKSB7XG4gICAgdHJ5IHtcbiAgICAgIHZhciB0aGVuID0gdmFsdWUudGhlbjtcbiAgICAgIGlmICh0eXBlb2YgdGhlbiA9PT0gJ2Z1bmN0aW9uJykge1xuICAgICAgICByZXR1cm4gbmV3IFByb21pc2UodGhlbi5iaW5kKHZhbHVlKSk7XG4gICAgICB9XG4gICAgfSBjYXRjaCAoZXgpIHtcbiAgICAgIHJldHVybiBuZXcgUHJvbWlzZShmdW5jdGlvbiAocmVzb2x2ZSwgcmVqZWN0KSB7XG4gICAgICAgIHJlamVjdChleCk7XG4gICAgICB9KTtcbiAgICB9XG4gIH1cbiAgcmV0dXJuIHZhbHVlUHJvbWlzZSh2YWx1ZSk7XG59O1xuXG5Qcm9taXNlLmFsbCA9IGZ1bmN0aW9uIChhcnIpIHtcbiAgdmFyIGFyZ3MgPSBBcnJheS5wcm90b3R5cGUuc2xpY2UuY2FsbChhcnIpO1xuXG4gIHJldHVybiBuZXcgUHJvbWlzZShmdW5jdGlvbiAocmVzb2x2ZSwgcmVqZWN0KSB7XG4gICAgaWYgKGFyZ3MubGVuZ3RoID09PSAwKSByZXR1cm4gcmVzb2x2ZShbXSk7XG4gICAgdmFyIHJlbWFpbmluZyA9IGFyZ3MubGVuZ3RoO1xuICAgIGZ1bmN0aW9uIHJlcyhpLCB2YWwpIHtcbiAgICAgIGlmICh2YWwgJiYgKHR5cGVvZiB2YWwgPT09ICdvYmplY3QnIHx8IHR5cGVvZiB2YWwgPT09ICdmdW5jdGlvbicpKSB7XG4gICAgICAgIGlmICh2YWwgaW5zdGFuY2VvZiBQcm9taXNlICYmIHZhbC50aGVuID09PSBQcm9taXNlLnByb3RvdHlwZS50aGVuKSB7XG4gICAgICAgICAgd2hpbGUgKHZhbC5fODMgPT09IDMpIHtcbiAgICAgICAgICAgIHZhbCA9IHZhbC5fMTg7XG4gICAgICAgICAgfVxuICAgICAgICAgIGlmICh2YWwuXzgzID09PSAxKSByZXR1cm4gcmVzKGksIHZhbC5fMTgpO1xuICAgICAgICAgIGlmICh2YWwuXzgzID09PSAyKSByZWplY3QodmFsLl8xOCk7XG4gICAgICAgICAgdmFsLnRoZW4oZnVuY3Rpb24gKHZhbCkge1xuICAgICAgICAgICAgcmVzKGksIHZhbCk7XG4gICAgICAgICAgfSwgcmVqZWN0KTtcbiAgICAgICAgICByZXR1cm47XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgdmFyIHRoZW4gPSB2YWwudGhlbjtcbiAgICAgICAgICBpZiAodHlwZW9mIHRoZW4gPT09ICdmdW5jdGlvbicpIHtcbiAgICAgICAgICAgIHZhciBwID0gbmV3IFByb21pc2UodGhlbi5iaW5kKHZhbCkpO1xuICAgICAgICAgICAgcC50aGVuKGZ1bmN0aW9uICh2YWwpIHtcbiAgICAgICAgICAgICAgcmVzKGksIHZhbCk7XG4gICAgICAgICAgICB9LCByZWplY3QpO1xuICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgfVxuICAgICAgYXJnc1tpXSA9IHZhbDtcbiAgICAgIGlmICgtLXJlbWFpbmluZyA9PT0gMCkge1xuICAgICAgICByZXNvbHZlKGFyZ3MpO1xuICAgICAgfVxuICAgIH1cbiAgICBmb3IgKHZhciBpID0gMDsgaSA8IGFyZ3MubGVuZ3RoOyBpKyspIHtcbiAgICAgIHJlcyhpLCBhcmdzW2ldKTtcbiAgICB9XG4gIH0pO1xufTtcblxuUHJvbWlzZS5yZWplY3QgPSBmdW5jdGlvbiAodmFsdWUpIHtcbiAgcmV0dXJuIG5ldyBQcm9taXNlKGZ1bmN0aW9uIChyZXNvbHZlLCByZWplY3QpIHtcbiAgICByZWplY3QodmFsdWUpO1xuICB9KTtcbn07XG5cblByb21pc2UucmFjZSA9IGZ1bmN0aW9uICh2YWx1ZXMpIHtcbiAgcmV0dXJuIG5ldyBQcm9taXNlKGZ1bmN0aW9uIChyZXNvbHZlLCByZWplY3QpIHtcbiAgICB2YWx1ZXMuZm9yRWFjaChmdW5jdGlvbih2YWx1ZSl7XG4gICAgICBQcm9taXNlLnJlc29sdmUodmFsdWUpLnRoZW4ocmVzb2x2ZSwgcmVqZWN0KTtcbiAgICB9KTtcbiAgfSk7XG59O1xuXG4vKiBQcm90b3R5cGUgTWV0aG9kcyAqL1xuXG5Qcm9taXNlLnByb3RvdHlwZVsnY2F0Y2gnXSA9IGZ1bmN0aW9uIChvblJlamVjdGVkKSB7XG4gIHJldHVybiB0aGlzLnRoZW4obnVsbCwgb25SZWplY3RlZCk7XG59O1xuIiwiJ3VzZSBzdHJpY3QnO1xuXG52YXIgUHJvbWlzZSA9IHJlcXVpcmUoJy4vY29yZScpO1xuXG52YXIgREVGQVVMVF9XSElURUxJU1QgPSBbXG4gIFJlZmVyZW5jZUVycm9yLFxuICBUeXBlRXJyb3IsXG4gIFJhbmdlRXJyb3Jcbl07XG5cbnZhciBlbmFibGVkID0gZmFsc2U7XG5leHBvcnRzLmRpc2FibGUgPSBkaXNhYmxlO1xuZnVuY3Rpb24gZGlzYWJsZSgpIHtcbiAgZW5hYmxlZCA9IGZhbHNlO1xuICBQcm9taXNlLl80NyA9IG51bGw7XG4gIFByb21pc2UuXzcxID0gbnVsbDtcbn1cblxuZXhwb3J0cy5lbmFibGUgPSBlbmFibGU7XG5mdW5jdGlvbiBlbmFibGUob3B0aW9ucykge1xuICBvcHRpb25zID0gb3B0aW9ucyB8fCB7fTtcbiAgaWYgKGVuYWJsZWQpIGRpc2FibGUoKTtcbiAgZW5hYmxlZCA9IHRydWU7XG4gIHZhciBpZCA9IDA7XG4gIHZhciBkaXNwbGF5SWQgPSAwO1xuICB2YXIgcmVqZWN0aW9ucyA9IHt9O1xuICBQcm9taXNlLl80NyA9IGZ1bmN0aW9uIChwcm9taXNlKSB7XG4gICAgaWYgKFxuICAgICAgcHJvbWlzZS5fODMgPT09IDIgJiYgLy8gSVMgUkVKRUNURURcbiAgICAgIHJlamVjdGlvbnNbcHJvbWlzZS5fNTZdXG4gICAgKSB7XG4gICAgICBpZiAocmVqZWN0aW9uc1twcm9taXNlLl81Nl0ubG9nZ2VkKSB7XG4gICAgICAgIG9uSGFuZGxlZChwcm9taXNlLl81Nik7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICBjbGVhclRpbWVvdXQocmVqZWN0aW9uc1twcm9taXNlLl81Nl0udGltZW91dCk7XG4gICAgICB9XG4gICAgICBkZWxldGUgcmVqZWN0aW9uc1twcm9taXNlLl81Nl07XG4gICAgfVxuICB9O1xuICBQcm9taXNlLl83MSA9IGZ1bmN0aW9uIChwcm9taXNlLCBlcnIpIHtcbiAgICBpZiAocHJvbWlzZS5fNzUgPT09IDApIHsgLy8gbm90IHlldCBoYW5kbGVkXG4gICAgICBwcm9taXNlLl81NiA9IGlkKys7XG4gICAgICByZWplY3Rpb25zW3Byb21pc2UuXzU2XSA9IHtcbiAgICAgICAgZGlzcGxheUlkOiBudWxsLFxuICAgICAgICBlcnJvcjogZXJyLFxuICAgICAgICB0aW1lb3V0OiBzZXRUaW1lb3V0KFxuICAgICAgICAgIG9uVW5oYW5kbGVkLmJpbmQobnVsbCwgcHJvbWlzZS5fNTYpLFxuICAgICAgICAgIC8vIEZvciByZWZlcmVuY2UgZXJyb3JzIGFuZCB0eXBlIGVycm9ycywgdGhpcyBhbG1vc3QgYWx3YXlzXG4gICAgICAgICAgLy8gbWVhbnMgdGhlIHByb2dyYW1tZXIgbWFkZSBhIG1pc3Rha2UsIHNvIGxvZyB0aGVtIGFmdGVyIGp1c3RcbiAgICAgICAgICAvLyAxMDBtc1xuICAgICAgICAgIC8vIG90aGVyd2lzZSwgd2FpdCAyIHNlY29uZHMgdG8gc2VlIGlmIHRoZXkgZ2V0IGhhbmRsZWRcbiAgICAgICAgICBtYXRjaFdoaXRlbGlzdChlcnIsIERFRkFVTFRfV0hJVEVMSVNUKVxuICAgICAgICAgICAgPyAxMDBcbiAgICAgICAgICAgIDogMjAwMFxuICAgICAgICApLFxuICAgICAgICBsb2dnZWQ6IGZhbHNlXG4gICAgICB9O1xuICAgIH1cbiAgfTtcbiAgZnVuY3Rpb24gb25VbmhhbmRsZWQoaWQpIHtcbiAgICBpZiAoXG4gICAgICBvcHRpb25zLmFsbFJlamVjdGlvbnMgfHxcbiAgICAgIG1hdGNoV2hpdGVsaXN0KFxuICAgICAgICByZWplY3Rpb25zW2lkXS5lcnJvcixcbiAgICAgICAgb3B0aW9ucy53aGl0ZWxpc3QgfHwgREVGQVVMVF9XSElURUxJU1RcbiAgICAgIClcbiAgICApIHtcbiAgICAgIHJlamVjdGlvbnNbaWRdLmRpc3BsYXlJZCA9IGRpc3BsYXlJZCsrO1xuICAgICAgaWYgKG9wdGlvbnMub25VbmhhbmRsZWQpIHtcbiAgICAgICAgcmVqZWN0aW9uc1tpZF0ubG9nZ2VkID0gdHJ1ZTtcbiAgICAgICAgb3B0aW9ucy5vblVuaGFuZGxlZChcbiAgICAgICAgICByZWplY3Rpb25zW2lkXS5kaXNwbGF5SWQsXG4gICAgICAgICAgcmVqZWN0aW9uc1tpZF0uZXJyb3JcbiAgICAgICAgKTtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIHJlamVjdGlvbnNbaWRdLmxvZ2dlZCA9IHRydWU7XG4gICAgICAgIGxvZ0Vycm9yKFxuICAgICAgICAgIHJlamVjdGlvbnNbaWRdLmRpc3BsYXlJZCxcbiAgICAgICAgICByZWplY3Rpb25zW2lkXS5lcnJvclxuICAgICAgICApO1xuICAgICAgfVxuICAgIH1cbiAgfVxuICBmdW5jdGlvbiBvbkhhbmRsZWQoaWQpIHtcbiAgICBpZiAocmVqZWN0aW9uc1tpZF0ubG9nZ2VkKSB7XG4gICAgICBpZiAob3B0aW9ucy5vbkhhbmRsZWQpIHtcbiAgICAgICAgb3B0aW9ucy5vbkhhbmRsZWQocmVqZWN0aW9uc1tpZF0uZGlzcGxheUlkLCByZWplY3Rpb25zW2lkXS5lcnJvcik7XG4gICAgICB9IGVsc2UgaWYgKCFyZWplY3Rpb25zW2lkXS5vblVuaGFuZGxlZCkge1xuICAgICAgICBjb25zb2xlLndhcm4oXG4gICAgICAgICAgJ1Byb21pc2UgUmVqZWN0aW9uIEhhbmRsZWQgKGlkOiAnICsgcmVqZWN0aW9uc1tpZF0uZGlzcGxheUlkICsgJyk6J1xuICAgICAgICApO1xuICAgICAgICBjb25zb2xlLndhcm4oXG4gICAgICAgICAgJyAgVGhpcyBtZWFucyB5b3UgY2FuIGlnbm9yZSBhbnkgcHJldmlvdXMgbWVzc2FnZXMgb2YgdGhlIGZvcm0gXCJQb3NzaWJsZSBVbmhhbmRsZWQgUHJvbWlzZSBSZWplY3Rpb25cIiB3aXRoIGlkICcgK1xuICAgICAgICAgIHJlamVjdGlvbnNbaWRdLmRpc3BsYXlJZCArICcuJ1xuICAgICAgICApO1xuICAgICAgfVxuICAgIH1cbiAgfVxufVxuXG5mdW5jdGlvbiBsb2dFcnJvcihpZCwgZXJyb3IpIHtcbiAgY29uc29sZS53YXJuKCdQb3NzaWJsZSBVbmhhbmRsZWQgUHJvbWlzZSBSZWplY3Rpb24gKGlkOiAnICsgaWQgKyAnKTonKTtcbiAgdmFyIGVyclN0ciA9IChlcnJvciAmJiAoZXJyb3Iuc3RhY2sgfHwgZXJyb3IpKSArICcnO1xuICBlcnJTdHIuc3BsaXQoJ1xcbicpLmZvckVhY2goZnVuY3Rpb24gKGxpbmUpIHtcbiAgICBjb25zb2xlLndhcm4oJyAgJyArIGxpbmUpO1xuICB9KTtcbn1cblxuZnVuY3Rpb24gbWF0Y2hXaGl0ZWxpc3QoZXJyb3IsIGxpc3QpIHtcbiAgcmV0dXJuIGxpc3Quc29tZShmdW5jdGlvbiAoY2xzKSB7XG4gICAgcmV0dXJuIGVycm9yIGluc3RhbmNlb2YgY2xzO1xuICB9KTtcbn0iLCJ2YXIgTG9nZ2VyID0gcmVxdWlyZSgnLi9tb2R1bGVzL2xvZ2dlcicpO1xudmFyIFB1YlN1YiA9IHJlcXVpcmUoJy4vbW9kdWxlcy9wdWJzdWInKTtcbnZhciBDYWxsZXIgPSByZXF1aXJlKCcuL21vZHVsZXMvY2FsbGVyJyk7XG52YXIgRG9tID0gcmVxdWlyZSgnLi9tb2R1bGVzL2RvbScpO1xudmFyIEluZm9Db250cm9sbGVyID0gcmVxdWlyZSgnLi9tb2R1bGVzL2luZm8tY29udHJvbGxlcicpO1xudmFyIEF2YXRhckNvbnRyb2xsZXIgPSByZXF1aXJlKCcuL21vZHVsZXMvYXZhdGFyLWNvbnRyb2xsZXInKTtcbnZhciBTdG9yZSA9IHJlcXVpcmUoJy4vbW9kdWxlcy9zdG9yZScpO1xudmFyIENsb3VkaW5hcnkgPSByZXF1aXJlKCcuL21vZHVsZXMvY2xvdWRpbmFyeS1pbWFnZS1waWNrZXInKTtcbnZhciBwcGJhQ29uZiA9IHt9O1xuXG5pZiAodHlwZW9mIFByb21pc2UgPT09ICd1bmRlZmluZWQnKSB7XG5cdHJlcXVpcmUoJ3Byb21pc2UvbGliL3JlamVjdGlvbi10cmFja2luZycpLmVuYWJsZSgpO1xuXHR3aW5kb3cuUHJvbWlzZSA9IHJlcXVpcmUoJ3Byb21pc2UvbGliL2VzNi1leHRlbnNpb25zLmpzJyk7XG59XG5cbnZhciBhZnRlclJlbmRlciA9IGZ1bmN0aW9uIGFmdGVyUmVuZGVyKCkge1xuXHRkb2N1bWVudC5nZXRFbGVtZW50QnlJZCgnYmFjLS1wdXJlc2RrLS1hcHBzLS1vcGVuZXItLScpLmFkZEV2ZW50TGlzdGVuZXIoJ2NsaWNrJywgZnVuY3Rpb24gKGUpIHtcblx0XHRlLnByZXZlbnREZWZhdWx0KCk7XG5cdFx0ZS5zdG9wUHJvcGFnYXRpb24oKTtcblx0XHREb20udG9nZ2xlQ2xhc3MoZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoJ2JhYy0tcHVyZXNkay1hcHBzLWNvbnRhaW5lci0tJyksICdhY3RpdmUnKTtcblx0fSk7XG5cblx0ZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoJ2JhYy0tdXNlci1hdmF0YXItdG9wJykuYWRkRXZlbnRMaXN0ZW5lcignY2xpY2snLCBmdW5jdGlvbiAoZSkge1xuXHRcdGUuc3RvcFByb3BhZ2F0aW9uKCk7XG5cdFx0RG9tLnJlbW92ZUNsYXNzKGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKCdiYWMtLXB1cmVzZGstYXBwcy1jb250YWluZXItLScpLCAnYWN0aXZlJyk7XG5cdFx0RG9tLnRvZ2dsZUNsYXNzKGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKCdiYWMtLXB1cmVzZGstdXNlci1zaWRlYmFyLS0nKSwgJ2FjdGl2ZScpO1xuXHR9KTtcblxuXHR3aW5kb3cuYWRkRXZlbnRMaXN0ZW5lcignY2xpY2snLCBmdW5jdGlvbiAoZSkge1xuXHRcdERvbS5yZW1vdmVDbGFzcyhkb2N1bWVudC5nZXRFbGVtZW50QnlJZCgnYmFjLS1wdXJlc2RrLWFwcHMtY29udGFpbmVyLS0nKSwgJ2FjdGl2ZScpO1xuXHRcdERvbS5yZW1vdmVDbGFzcyhkb2N1bWVudC5nZXRFbGVtZW50QnlJZCgnYmFjLS1wdXJlc2RrLXVzZXItc2lkZWJhci0tJyksICdhY3RpdmUnKTtcblx0fSk7XG5cblx0QXZhdGFyQ29udHJvbGxlci5pbml0KCk7XG5cdHZhciB1c2VyRGF0YSA9IFN0b3JlLmdldFVzZXJEYXRhKCk7XG5cdEF2YXRhckNvbnRyb2xsZXIuc2V0QXZhdGFyKHVzZXJEYXRhLnVzZXIuYXZhdGFyX3VybCk7XG5cblx0SW5mb0NvbnRyb2xsZXIuaW5pdCgpO1xufTtcblxudmFyIFBQQkEgPSB7XG5cdHNldFdpbmRvd05hbWU6IGZ1bmN0aW9uIHNldFdpbmRvd05hbWUod24pIHtcblx0XHRTdG9yZS5zZXRXaW5kb3dOYW1lKHduKTtcblx0fSxcblxuXHRzZXRDb25maWd1cmF0aW9uOiBmdW5jdGlvbiBzZXRDb25maWd1cmF0aW9uKGNvbmYpIHtcblx0XHRTdG9yZS5zZXRDb25maWd1cmF0aW9uKGNvbmYpO1xuXHR9LFxuXG5cdHNldEhUTUxUZW1wbGF0ZTogZnVuY3Rpb24gc2V0SFRNTFRlbXBsYXRlKHRlbXBsYXRlKSB7XG5cdFx0U3RvcmUuc2V0SFRNTFRlbXBsYXRlKHRlbXBsYXRlKTtcblx0fSxcblxuXHRzZXRWZXJzaW9uTnVtYmVyOiBmdW5jdGlvbiBzZXRWZXJzaW9uTnVtYmVyKHZlcnNpb24pIHtcblx0XHRTdG9yZS5zZXRWZXJzaW9uTnVtYmVyKHZlcnNpb24pO1xuXHR9LFxuXG5cdGluaXQ6IGZ1bmN0aW9uIGluaXQoY29uZikge1xuXHRcdExvZ2dlci5sb2coJ2luaXRpYWxpemluZyB3aXRoIGNvbmY6ICcsIGNvbmYpO1xuXHRcdGlmIChjb25mKSB7XG5cdFx0XHRpZiAoY29uZi5oZWFkZXJEaXZJZCkge1xuXHRcdFx0XHRTdG9yZS5zZXRIVE1MQ29udGFpbmVyKGNvbmYuaGVhZGVyRGl2SWQpO1xuXHRcdFx0fVxuXHRcdFx0aWYgKGNvbmYuYXBwc1Zpc2libGUgIT09IG51bGwpIHtcblx0XHRcdFx0U3RvcmUuc2V0QXBwc1Zpc2libGUoY29uZi5hcHBzVmlzaWJsZSk7XG5cdFx0XHR9XG5cdFx0XHRpZiAoY29uZi5yb290VXJsKSB7XG5cdFx0XHRcdFN0b3JlLnNldFJvb3RVcmwoY29uZi5yb290VXJsKTtcblx0XHRcdH1cblx0XHRcdGlmIChjb25mLmRldiA9PT0gdHJ1ZSkge1xuXHRcdFx0XHRpZiAoY29uZi5kZXZLZXlzKSB7XG5cdFx0XHRcdFx0Q2FsbGVyLnNldERldktleXMoY29uZi5kZXZLZXlzKTtcblx0XHRcdFx0XHRTdG9yZS5zZXREZXYodHJ1ZSk7XG5cdFx0XHRcdH1cblx0XHRcdH1cblx0XHRcdGlmIChjb25mLmFwcEluZm8pIHtcblx0XHRcdFx0U3RvcmUuc2V0QXBwSW5mbyhjb25mLmFwcEluZm8pO1xuXHRcdFx0XHQvLyBpZiBnb29nbGUgdGFnIG1hbmFnZXIgaXMgcHJlc2VudCBpdCB3aWxsIHB1c2ggdGhlIHVzZXIncyBpbmZvIHRvIGRhdGFMYXllclxuXHRcdFx0XHR0cnkge1xuXHRcdFx0XHRcdGRhdGFMYXllci5wdXNoKHtcblx0XHRcdFx0XHRcdCdhcHAnOiBjb25mLmFwcEluZm8ubmFtZVxuXHRcdFx0XHRcdH0pO1xuXHRcdFx0XHR9IGNhdGNoIChlKSB7XG5cdFx0XHRcdFx0Ly8gbm8gR29vZ2xlIFRhZyBoYXMgYmVlbiBzZXRcblx0XHRcdFx0fVxuXHRcdFx0fVxuXG5cdFx0XHQvKiBvcHRpb25hbCBzZXNzaW9uIHVybCAqL1xuXHRcdFx0aWYgKGNvbmYuc2Vzc2lvbkVuZHBvaW50KSB7XG5cdFx0XHRcdFN0b3JlLnNldFNlc3Npb25FbmRwb2ludChjb25mLnNlc3Npb25FbmRwb2ludCk7XG5cdFx0XHR9XG5cblx0XHRcdGlmIChjb25mLmFwaVJvb3RGb2xkZXIpIHtcblx0XHRcdFx0U3RvcmUuc2V0VXJsVmVyc2lvblByZWZpeChjb25mLmFwaVJvb3RGb2xkZXIpO1xuXHRcdFx0fVxuXHRcdH1cblx0XHRwcGJhQ29uZiA9IGNvbmY7XG5cdFx0cmV0dXJuIHRydWU7XG5cdH0sXG5cblx0c2V0dXBHb29nbGVUYWc6IGZ1bmN0aW9uIHNldHVwR29vZ2xlVGFnKHVzZXIpIHtcblx0XHQvLyBpZiBnb29nbGUgdGFnIG1hbmFnZXIgaXMgcHJlc2VudCBpdCB3aWxsIHB1c2ggdGhlIHVzZXIncyBpbmZvIHRvIGRhdGFMYXllclxuXHRcdHRyeSB7XG5cdFx0XHRkYXRhTGF5ZXIucHVzaCh7XG5cdFx0XHRcdCd1c2VySWQnOiB1c2VyLmlkLFxuXHRcdFx0XHQndXNlcic6IHVzZXIuZmlyc3RuYW1lICsgJyAnICsgdXNlci5sYXN0bmFtZSxcblx0XHRcdFx0J3RlbmFudF9pZCc6IHVzZXIudGVuYW50X2lkLFxuXHRcdFx0XHQndXNlclR5cGUnOiB1c2VyLnVzZXJfdHlwZSxcblx0XHRcdFx0J2FjY291bnRJZCc6IHVzZXIuYWNjb3VudF9pZCxcblx0XHRcdFx0J2FjY291bnROYW1lJzogdXNlci5hY2NvdW50Lm5hbWVcblx0XHRcdH0pO1xuXHRcdH0gY2F0Y2ggKGUpIHtcblx0XHRcdC8vIG5vIEdvb2dsZSBUYWcgaGFzIGJlZW4gc2V0XG5cdFx0fVxuXHR9LFxuXG5cblx0YXV0aGVudGljYXRlOiBmdW5jdGlvbiBhdXRoZW50aWNhdGUoX3N1Y2Nlc3MpIHtcblx0XHR2YXIgc2VsZiA9IFBQQkE7XG5cdFx0Q2FsbGVyLm1ha2VDYWxsKHtcblx0XHRcdHR5cGU6ICdHRVQnLFxuXHRcdFx0ZW5kcG9pbnQ6IFN0b3JlLmdldEF1dGhlbnRpY2F0aW9uRW5kcG9pbnQoKSxcblx0XHRcdGNhbGxiYWNrczoge1xuXHRcdFx0XHRzdWNjZXNzOiBmdW5jdGlvbiBzdWNjZXNzKHJlc3VsdCkge1xuXHRcdFx0XHRcdExvZ2dlci5sb2cocmVzdWx0KTtcblx0XHRcdFx0XHRTdG9yZS5zZXRVc2VyRGF0YShyZXN1bHQpO1xuXHRcdFx0XHRcdHNlbGYucmVuZGVyKCk7XG5cdFx0XHRcdFx0UFBCQS5nZXRBcHBzKCk7XG5cdFx0XHRcdFx0UFBCQS5zZXR1cEdvb2dsZVRhZyhyZXN1bHQudXNlcik7XG5cdFx0XHRcdFx0X3N1Y2Nlc3MocmVzdWx0KTtcblx0XHRcdFx0fSxcblx0XHRcdFx0ZmFpbDogZnVuY3Rpb24gZmFpbChlcnIpIHtcblx0XHRcdFx0XHR3aW5kb3cubG9jYXRpb24uaHJlZiA9IFN0b3JlLmdldExvZ2luVXJsKCk7XG5cdFx0XHRcdH1cblx0XHRcdH1cblx0XHR9KTtcblx0fSxcblxuXHRhdXRoZW50aWNhdGVQcm9taXNlOiBmdW5jdGlvbiBhdXRoZW50aWNhdGVQcm9taXNlKCkge1xuXHRcdHZhciBzZWxmID0gUFBCQTtcblx0XHRyZXR1cm4gQ2FsbGVyLnByb21pc2VDYWxsKHtcblx0XHRcdHR5cGU6ICdHRVQnLFxuXHRcdFx0ZW5kcG9pbnQ6IFN0b3JlLmdldEF1dGhlbnRpY2F0aW9uRW5kcG9pbnQoKSxcblx0XHRcdG1pZGRsZXdhcmVzOiB7XG5cdFx0XHRcdHN1Y2Nlc3M6IGZ1bmN0aW9uIHN1Y2Nlc3MocmVzdWx0KSB7XG5cdFx0XHRcdFx0TG9nZ2VyLmxvZyhyZXN1bHQpO1xuXHRcdFx0XHRcdFN0b3JlLnNldFVzZXJEYXRhKHJlc3VsdCk7XG5cdFx0XHRcdFx0c2VsZi5yZW5kZXIoKTtcblx0XHRcdFx0XHRQUEJBLmdldEFwcHMoKTtcblx0XHRcdFx0XHRQUEJBLnNldHVwR29vZ2xlVGFnKHJlc3VsdC51c2VyKTtcblx0XHRcdFx0fVxuXHRcdFx0fVxuXHRcdH0pO1xuXHR9LFxuXG5cdGdldEFwcHM6IGZ1bmN0aW9uIGdldEFwcHMoKSB7XG5cdFx0Q2FsbGVyLm1ha2VDYWxsKHtcblx0XHRcdHR5cGU6ICdHRVQnLFxuXHRcdFx0ZW5kcG9pbnQ6IFN0b3JlLmdldEFwcHNFbmRwb2ludCgpLFxuXHRcdFx0Y2FsbGJhY2tzOiB7XG5cdFx0XHRcdHN1Y2Nlc3M6IGZ1bmN0aW9uIHN1Y2Nlc3MocmVzdWx0KSB7XG5cdFx0XHRcdFx0U3RvcmUuc2V0QXBwcyhyZXN1bHQpO1xuXHRcdFx0XHRcdFBQQkEucmVuZGVyQXBwcyhyZXN1bHQuYXBwcyk7XG5cdFx0XHRcdH0sXG5cdFx0XHRcdGZhaWw6IGZ1bmN0aW9uIGZhaWwoZXJyKSB7XG5cdFx0XHRcdFx0d2luZG93LmxvY2F0aW9uLmhyZWYgPSBTdG9yZS5nZXRMb2dpblVybCgpO1xuXHRcdFx0XHR9XG5cdFx0XHR9XG5cdFx0fSk7XG5cdH0sXG5cblx0Z2V0QXZhaWxhYmxlTGlzdGVuZXJzOiBmdW5jdGlvbiBnZXRBdmFpbGFibGVMaXN0ZW5lcnMoKSB7XG5cdFx0cmV0dXJuIFB1YlN1Yi5nZXRBdmFpbGFibGVMaXN0ZW5lcnMoKTtcblx0fSxcblxuXHRzdWJzY3JpYmVMaXN0ZW5lcjogZnVuY3Rpb24gc3Vic2NyaWJlTGlzdGVuZXIoZXZlbnR0LCBmdW5jdCkge1xuXHRcdHJldHVybiBQdWJTdWIuc3Vic2NyaWJlKGV2ZW50dCwgZnVuY3QpO1xuXHR9LFxuXG5cdGdldFVzZXJEYXRhOiBmdW5jdGlvbiBnZXRVc2VyRGF0YSgpIHtcblx0XHRyZXR1cm4gU3RvcmUuZ2V0VXNlckRhdGEoKTtcblx0fSxcblxuXHRzZXRJbnB1dFBsYWNlaG9sZGVyOiBmdW5jdGlvbiBzZXRJbnB1dFBsYWNlaG9sZGVyKHR4dCkge1xuXHRcdC8vIGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKFN0b3JlLmdldFNlYXJjaElucHV0SWQoKSkucGxhY2Vob2xkZXIgPSB0eHQ7XG5cdH0sXG5cblx0Y2hhbmdlQWNjb3VudDogZnVuY3Rpb24gY2hhbmdlQWNjb3VudChhY2NvdW50SWQpIHtcblx0XHRDYWxsZXIubWFrZUNhbGwoe1xuXHRcdFx0dHlwZTogJ0dFVCcsXG5cdFx0XHRlbmRwb2ludDogU3RvcmUuZ2V0U3dpdGNoQWNjb3VudEVuZHBvaW50KGFjY291bnRJZCksXG5cdFx0XHRjYWxsYmFja3M6IHtcblx0XHRcdFx0c3VjY2VzczogZnVuY3Rpb24gc3VjY2VzcyhyZXN1bHQpIHtcblx0XHRcdFx0XHR3aW5kb3cubG9jYXRpb24uaHJlZiA9ICcvYXBwcyc7XG5cdFx0XHRcdH0sXG5cdFx0XHRcdGZhaWw6IGZ1bmN0aW9uIGZhaWwoZXJyKSB7XG5cdFx0XHRcdFx0YWxlcnQoJ1NvcnJ5LCBzb21ldGhpbmcgd2VudCB3cm9uZyB3aXRoIHlvdXIgcmVxdWVzdC4gUGxlc2UgdHJ5IGFnYWluJyk7XG5cdFx0XHRcdH1cblx0XHRcdH1cblx0XHR9KTtcblx0fSxcblxuXHRyZW5kZXJBcHBzOiBmdW5jdGlvbiByZW5kZXJBcHBzKGFwcHMpIHtcblx0XHR2YXIgYXBwVGVtcGxhdGUgPSBmdW5jdGlvbiBhcHBUZW1wbGF0ZShhcHApIHtcblx0XHRcdHJldHVybiAnXFxuXFx0XFx0XFx0XFx0PGEgY2xhc3M9XCJiYWMtLWltYWdlLWxpbmtcIiBocmVmPVwiJyArIGFwcC5hcHBsaWNhdGlvbl91cmwgKyAnXCIgc3R5bGU9XCJiYWNrZ3JvdW5kOiAjJyArIGFwcC5jb2xvciArICdcIj5cXG5cXHRcXHRcXHRcXHRcXHQ8aW1nIHNyYz1cIicgKyBhcHAuaWNvbiArICdcIiAvPlxcblxcdFxcdFxcdFxcdDwvYT5cXG5cXHRcXHRcXHRcXHRcXG5cXHRcXHRcXHRcXHQ8ZGl2IGNsYXNzPVwiYmFjLS1wdXJlc2RrLWFwcC10ZXh0LWNvbnRhaW5lclwiPlxcblxcdFxcdFxcdFxcdFxcdDxhIGhyZWY9XCInICsgYXBwLmFwcGxpY2F0aW9uX3VybCArICdcIiBjbGFzcz1cImJhYy0tYXBwLW5hbWVcIj4nICsgYXBwLm5hbWUgKyAnPC9hPlxcblxcdFxcdFxcdFxcdFxcdDxhIGhyZWY9XCInICsgYXBwLmFwcGxpY2F0aW9uX3VybCArICdcIiBjbGFzcz1cImJhYy0tYXBwLWRlc2NyaXB0aW9uXCI+JyArIChhcHAuZGVzY3IgPT09IG51bGwgPyAnLScgOiBhcHAuZGVzY3IpICsgJzwvYT5cXG5cXHRcXHRcXHRcXHQ8L2Rpdj5cXG5cXHRcXHRcXHQnO1xuXHRcdH07XG5cdFx0Zm9yICh2YXIgaSA9IDA7IGkgPCBhcHBzLmxlbmd0aDsgaSsrKSB7XG5cdFx0XHR2YXIgYXBwID0gYXBwc1tpXTtcblx0XHRcdHZhciBkaXYgPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KFwiZGl2XCIpO1xuXHRcdFx0ZGl2LmNsYXNzTmFtZSA9IFwiYmFjLS1hcHBzXCI7XG5cdFx0XHRjb25zb2xlLmxvZyhhcHApO1xuXHRcdFx0ZGl2LmlubmVySFRNTCA9IGFwcFRlbXBsYXRlKGFwcCk7XG5cblx0XHRcdC8vIGNoZWNrIHRvIHNlZSBpZiB0aGUgdXNlciBoYXMgYWNjZXNzIHRvIHRoZSB0d28gbWFpbiBhcHBzIGFuZCByZW1vdmUgZGlzYWJsZWQgY2xhc3Ncblx0XHRcdGlmIChhcHAuYXBwbGljYXRpb25fdXJsID09PSAnL2FwcC9ncm91cHMnKSB7XG5cdFx0XHRcdERvbS5yZW1vdmVDbGFzcyhkb2N1bWVudC5nZXRFbGVtZW50QnlJZCgnYmFjLS1wdXJlc2RrLWdyb3Vwcy1saW5rLS0nKSwgJ2Rpc2FibGVkJyk7XG5cdFx0XHR9IGVsc2UgaWYgKGFwcC5hcHBsaWNhdGlvbl91cmwgPT09ICcvYXBwL2NhbXBhaWducycpIHtcblx0XHRcdFx0RG9tLnJlbW92ZUNsYXNzKGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKCdiYWMtLXB1cmVzZGstY2FtcGFpZ25zLWxpbmstLScpLCAnZGlzYWJsZWQnKTtcblx0XHRcdH1cblx0XHRcdGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKFwiYmFjLS1hcHMtYWN0dWFsLWNvbnRhaW5lclwiKS5hcHBlbmRDaGlsZChkaXYpO1xuXHRcdH1cblxuXHRcdC8vIGZpbmFsbHkgY2hlY2sgaWYgdGhlIHVzZXIgaXMgb24gYW55IG9mIHRoZSB0d28gbWFpbiBhcHBzXG5cdFx0dmFyIGFwcEluZm8gPSBTdG9yZS5nZXRBcHBJbmZvKCk7XG5cdFx0aWYgKGFwcEluZm8ucm9vdCA9PT0gXCIvYXBwL2dyb3Vwc1wiKSB7XG5cdFx0XHREb20uYWRkQ2xhc3MoZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoJ2JhYy0tcHVyZXNkay1ncm91cHMtbGluay0tJyksICdzZWxlY3RlZCcpO1xuXHRcdH0gZWxzZSBpZiAoYXBwSW5mby5yb290ID0gXCIvYXBwL2NhbXBhaWduc1wiKSB7XG5cdFx0XHREb20uYWRkQ2xhc3MoZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoJ2JhYy0tcHVyZXNkay1jYW1wYWlnbnMtbGluay0tJyksICdzZWxlY3RlZCcpO1xuXHRcdH1cblx0fSxcblxuXHRyZW5kZXJVc2VyOiBmdW5jdGlvbiByZW5kZXJVc2VyKHVzZXIpIHtcblx0XHR2YXIgdXNlclRlbXBsYXRlID0gZnVuY3Rpb24gdXNlclRlbXBsYXRlKHVzZXIpIHtcblx0XHRcdHJldHVybiAnXFxuXFx0XFx0XFx0XFx0PGRpdiBjbGFzcz1cImJhYy0tdXNlci1pbWFnZVwiIGlkPVwiYmFjLS11c2VyLWltYWdlXCI+XFxuXFx0XFx0XFx0XFx0XFx0PGkgY2xhc3M9XCJmYSBmYS1jYW1lcmFcIj48L2k+XFxuXFx0XFx0XFx0ICAgXFx0PGRpdiBpZD1cImJhYy0tdXNlci1pbWFnZS1maWxlXCI+PC9kaXY+XFxuXFx0XFx0XFx0ICAgXFx0PGRpdiBpZD1cImJhYy0tdXNlci1pbWFnZS11cGxvYWQtcHJvZ3Jlc3NcIj5cXG5cXHRcXHRcXHQgICBcXHRcXHQ8c3ZnIHdpZHRoPVxcJzYwcHhcXCcgaGVpZ2h0PVxcJzYwcHhcXCcgeG1sbnM9XCJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2Z1wiIHZpZXdCb3g9XCIwIDAgMTAwIDEwMFwiIHByZXNlcnZlQXNwZWN0UmF0aW89XCJ4TWlkWU1pZFwiIGNsYXNzPVwidWlsLWRlZmF1bHRcIj48cmVjdCB4PVwiMFwiIHk9XCIwXCIgd2lkdGg9XCIxMDBcIiBoZWlnaHQ9XCIxMDBcIiBmaWxsPVwibm9uZVwiIGNsYXNzPVwiYmtcIj48L3JlY3Q+PHJlY3QgIHg9XFwnNDYuNVxcJyB5PVxcJzQwXFwnIHdpZHRoPVxcJzdcXCcgaGVpZ2h0PVxcJzIwXFwnIHJ4PVxcJzVcXCcgcnk9XFwnNVxcJyBmaWxsPVxcJyNmZmZmZmZcXCcgdHJhbnNmb3JtPVxcJ3JvdGF0ZSgwIDUwIDUwKSB0cmFuc2xhdGUoMCAtMzApXFwnPiAgPGFuaW1hdGUgYXR0cmlidXRlTmFtZT1cXCdvcGFjaXR5XFwnIGZyb209XFwnMVxcJyB0bz1cXCcwXFwnIGR1cj1cXCcxc1xcJyBiZWdpbj1cXCctMXNcXCcgcmVwZWF0Q291bnQ9XFwnaW5kZWZpbml0ZVxcJy8+PC9yZWN0PjxyZWN0ICB4PVxcJzQ2LjVcXCcgeT1cXCc0MFxcJyB3aWR0aD1cXCc3XFwnIGhlaWdodD1cXCcyMFxcJyByeD1cXCc1XFwnIHJ5PVxcJzVcXCcgZmlsbD1cXCcjZmZmZmZmXFwnIHRyYW5zZm9ybT1cXCdyb3RhdGUoMzAgNTAgNTApIHRyYW5zbGF0ZSgwIC0zMClcXCc+ICA8YW5pbWF0ZSBhdHRyaWJ1dGVOYW1lPVxcJ29wYWNpdHlcXCcgZnJvbT1cXCcxXFwnIHRvPVxcJzBcXCcgZHVyPVxcJzFzXFwnIGJlZ2luPVxcJy0wLjkxNjY2NjY2NjY2NjY2NjZzXFwnIHJlcGVhdENvdW50PVxcJ2luZGVmaW5pdGVcXCcvPjwvcmVjdD48cmVjdCAgeD1cXCc0Ni41XFwnIHk9XFwnNDBcXCcgd2lkdGg9XFwnN1xcJyBoZWlnaHQ9XFwnMjBcXCcgcng9XFwnNVxcJyByeT1cXCc1XFwnIGZpbGw9XFwnI2ZmZmZmZlxcJyB0cmFuc2Zvcm09XFwncm90YXRlKDYwIDUwIDUwKSB0cmFuc2xhdGUoMCAtMzApXFwnPiAgPGFuaW1hdGUgYXR0cmlidXRlTmFtZT1cXCdvcGFjaXR5XFwnIGZyb209XFwnMVxcJyB0bz1cXCcwXFwnIGR1cj1cXCcxc1xcJyBiZWdpbj1cXCctMC44MzMzMzMzMzMzMzMzMzM0c1xcJyByZXBlYXRDb3VudD1cXCdpbmRlZmluaXRlXFwnLz48L3JlY3Q+PHJlY3QgIHg9XFwnNDYuNVxcJyB5PVxcJzQwXFwnIHdpZHRoPVxcJzdcXCcgaGVpZ2h0PVxcJzIwXFwnIHJ4PVxcJzVcXCcgcnk9XFwnNVxcJyBmaWxsPVxcJyNmZmZmZmZcXCcgdHJhbnNmb3JtPVxcJ3JvdGF0ZSg5MCA1MCA1MCkgdHJhbnNsYXRlKDAgLTMwKVxcJz4gIDxhbmltYXRlIGF0dHJpYnV0ZU5hbWU9XFwnb3BhY2l0eVxcJyBmcm9tPVxcJzFcXCcgdG89XFwnMFxcJyBkdXI9XFwnMXNcXCcgYmVnaW49XFwnLTAuNzVzXFwnIHJlcGVhdENvdW50PVxcJ2luZGVmaW5pdGVcXCcvPjwvcmVjdD48cmVjdCAgeD1cXCc0Ni41XFwnIHk9XFwnNDBcXCcgd2lkdGg9XFwnN1xcJyBoZWlnaHQ9XFwnMjBcXCcgcng9XFwnNVxcJyByeT1cXCc1XFwnIGZpbGw9XFwnI2ZmZmZmZlxcJyB0cmFuc2Zvcm09XFwncm90YXRlKDEyMCA1MCA1MCkgdHJhbnNsYXRlKDAgLTMwKVxcJz4gIDxhbmltYXRlIGF0dHJpYnV0ZU5hbWU9XFwnb3BhY2l0eVxcJyBmcm9tPVxcJzFcXCcgdG89XFwnMFxcJyBkdXI9XFwnMXNcXCcgYmVnaW49XFwnLTAuNjY2NjY2NjY2NjY2NjY2NnNcXCcgcmVwZWF0Q291bnQ9XFwnaW5kZWZpbml0ZVxcJy8+PC9yZWN0PjxyZWN0ICB4PVxcJzQ2LjVcXCcgeT1cXCc0MFxcJyB3aWR0aD1cXCc3XFwnIGhlaWdodD1cXCcyMFxcJyByeD1cXCc1XFwnIHJ5PVxcJzVcXCcgZmlsbD1cXCcjZmZmZmZmXFwnIHRyYW5zZm9ybT1cXCdyb3RhdGUoMTUwIDUwIDUwKSB0cmFuc2xhdGUoMCAtMzApXFwnPiAgPGFuaW1hdGUgYXR0cmlidXRlTmFtZT1cXCdvcGFjaXR5XFwnIGZyb209XFwnMVxcJyB0bz1cXCcwXFwnIGR1cj1cXCcxc1xcJyBiZWdpbj1cXCctMC41ODMzMzMzMzMzMzMzMzM0c1xcJyByZXBlYXRDb3VudD1cXCdpbmRlZmluaXRlXFwnLz48L3JlY3Q+PHJlY3QgIHg9XFwnNDYuNVxcJyB5PVxcJzQwXFwnIHdpZHRoPVxcJzdcXCcgaGVpZ2h0PVxcJzIwXFwnIHJ4PVxcJzVcXCcgcnk9XFwnNVxcJyBmaWxsPVxcJyNmZmZmZmZcXCcgdHJhbnNmb3JtPVxcJ3JvdGF0ZSgxODAgNTAgNTApIHRyYW5zbGF0ZSgwIC0zMClcXCc+ICA8YW5pbWF0ZSBhdHRyaWJ1dGVOYW1lPVxcJ29wYWNpdHlcXCcgZnJvbT1cXCcxXFwnIHRvPVxcJzBcXCcgZHVyPVxcJzFzXFwnIGJlZ2luPVxcJy0wLjVzXFwnIHJlcGVhdENvdW50PVxcJ2luZGVmaW5pdGVcXCcvPjwvcmVjdD48cmVjdCAgeD1cXCc0Ni41XFwnIHk9XFwnNDBcXCcgd2lkdGg9XFwnN1xcJyBoZWlnaHQ9XFwnMjBcXCcgcng9XFwnNVxcJyByeT1cXCc1XFwnIGZpbGw9XFwnI2ZmZmZmZlxcJyB0cmFuc2Zvcm09XFwncm90YXRlKDIxMCA1MCA1MCkgdHJhbnNsYXRlKDAgLTMwKVxcJz4gIDxhbmltYXRlIGF0dHJpYnV0ZU5hbWU9XFwnb3BhY2l0eVxcJyBmcm9tPVxcJzFcXCcgdG89XFwnMFxcJyBkdXI9XFwnMXNcXCcgYmVnaW49XFwnLTAuNDE2NjY2NjY2NjY2NjY2N3NcXCcgcmVwZWF0Q291bnQ9XFwnaW5kZWZpbml0ZVxcJy8+PC9yZWN0PjxyZWN0ICB4PVxcJzQ2LjVcXCcgeT1cXCc0MFxcJyB3aWR0aD1cXCc3XFwnIGhlaWdodD1cXCcyMFxcJyByeD1cXCc1XFwnIHJ5PVxcJzVcXCcgZmlsbD1cXCcjZmZmZmZmXFwnIHRyYW5zZm9ybT1cXCdyb3RhdGUoMjQwIDUwIDUwKSB0cmFuc2xhdGUoMCAtMzApXFwnPiAgPGFuaW1hdGUgYXR0cmlidXRlTmFtZT1cXCdvcGFjaXR5XFwnIGZyb209XFwnMVxcJyB0bz1cXCcwXFwnIGR1cj1cXCcxc1xcJyBiZWdpbj1cXCctMC4zMzMzMzMzMzMzMzMzMzMzc1xcJyByZXBlYXRDb3VudD1cXCdpbmRlZmluaXRlXFwnLz48L3JlY3Q+PHJlY3QgIHg9XFwnNDYuNVxcJyB5PVxcJzQwXFwnIHdpZHRoPVxcJzdcXCcgaGVpZ2h0PVxcJzIwXFwnIHJ4PVxcJzVcXCcgcnk9XFwnNVxcJyBmaWxsPVxcJyNmZmZmZmZcXCcgdHJhbnNmb3JtPVxcJ3JvdGF0ZSgyNzAgNTAgNTApIHRyYW5zbGF0ZSgwIC0zMClcXCc+ICA8YW5pbWF0ZSBhdHRyaWJ1dGVOYW1lPVxcJ29wYWNpdHlcXCcgZnJvbT1cXCcxXFwnIHRvPVxcJzBcXCcgZHVyPVxcJzFzXFwnIGJlZ2luPVxcJy0wLjI1c1xcJyByZXBlYXRDb3VudD1cXCdpbmRlZmluaXRlXFwnLz48L3JlY3Q+PHJlY3QgIHg9XFwnNDYuNVxcJyB5PVxcJzQwXFwnIHdpZHRoPVxcJzdcXCcgaGVpZ2h0PVxcJzIwXFwnIHJ4PVxcJzVcXCcgcnk9XFwnNVxcJyBmaWxsPVxcJyNmZmZmZmZcXCcgdHJhbnNmb3JtPVxcJ3JvdGF0ZSgzMDAgNTAgNTApIHRyYW5zbGF0ZSgwIC0zMClcXCc+ICA8YW5pbWF0ZSBhdHRyaWJ1dGVOYW1lPVxcJ29wYWNpdHlcXCcgZnJvbT1cXCcxXFwnIHRvPVxcJzBcXCcgZHVyPVxcJzFzXFwnIGJlZ2luPVxcJy0wLjE2NjY2NjY2NjY2NjY2NjY2c1xcJyByZXBlYXRDb3VudD1cXCdpbmRlZmluaXRlXFwnLz48L3JlY3Q+PHJlY3QgIHg9XFwnNDYuNVxcJyB5PVxcJzQwXFwnIHdpZHRoPVxcJzdcXCcgaGVpZ2h0PVxcJzIwXFwnIHJ4PVxcJzVcXCcgcnk9XFwnNVxcJyBmaWxsPVxcJyNmZmZmZmZcXCcgdHJhbnNmb3JtPVxcJ3JvdGF0ZSgzMzAgNTAgNTApIHRyYW5zbGF0ZSgwIC0zMClcXCc+ICA8YW5pbWF0ZSBhdHRyaWJ1dGVOYW1lPVxcJ29wYWNpdHlcXCcgZnJvbT1cXCcxXFwnIHRvPVxcJzBcXCcgZHVyPVxcJzFzXFwnIGJlZ2luPVxcJy0wLjA4MzMzMzMzMzMzMzMzMzMzc1xcJyByZXBlYXRDb3VudD1cXCdpbmRlZmluaXRlXFwnLz48L3JlY3Q+PC9zdmc+XFxuXFx0XFx0XFx0XFx0XFx0PC9kaXY+XFxuXFx0XFx0XFx0ICAgPC9kaXY+XFxuXFx0XFx0XFx0XFx0PGRpdiBjbGFzcz1cImJhYy0tdXNlci1uYW1lXCI+JyArIHVzZXIuZmlyc3RuYW1lICsgJyAnICsgdXNlci5sYXN0bmFtZSArICc8L2Rpdj5cXG5cXHRcXHRcXHRcXHQ8ZGl2IGNsYXNzPVwiYmFjLS11c2VyLWVtYWlsXCI+JyArIHVzZXIuZW1haWwgKyAnPC9kaXY+XFxuXFx0XFx0XFx0Jztcblx0XHR9O1xuXHRcdHZhciBkaXYgPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KCdkaXYnKTtcblx0XHRkaXYuY2xhc3NOYW1lID0gXCJiYWMtLXVzZXItc2lkZWJhci1pbmZvXCI7XG5cdFx0ZGl2LmlubmVySFRNTCA9IHVzZXJUZW1wbGF0ZSh1c2VyKTtcblx0XHRkb2N1bWVudC5nZXRFbGVtZW50QnlJZCgnYmFjLS1wdXJlc2RrLXVzZXItZGV0YWlscy0tJykuYXBwZW5kQ2hpbGQoZGl2KTtcblx0XHRkb2N1bWVudC5nZXRFbGVtZW50QnlJZCgnYmFjLS1wdXJlc2RrLXVzZXItYXZhdGFyLS0nKS5pbm5lckhUTUwgPSB1c2VyLmZpcnN0bmFtZS5jaGFyQXQoMCkgKyB1c2VyLmxhc3RuYW1lLmNoYXJBdCgwKTtcblx0fSxcblxuXHRyZW5kZXJBY2NvdW50czogZnVuY3Rpb24gcmVuZGVyQWNjb3VudHMoYWNjb3VudHMsIGN1cnJlbnRBY2NvdW50KSB7XG5cdFx0Ly8gTG9nZ2VyLmxvZyhjdXJyZW50QWNjb3VudCk7XG5cdFx0dmFyIGFjY291bnRzVGVtcGxhdGUgPSBmdW5jdGlvbiBhY2NvdW50c1RlbXBsYXRlKGFjY291bnQsIGlzVGhlU2VsZWN0ZWQpIHtcblx0XHRcdHJldHVybiAnXFxuXFx0XFx0XFx0XFx0PGRpdiBjbGFzcz1cImJhYy0tdXNlci1saXN0LWl0ZW0taW1hZ2VcIj5cXG5cXHRcXHRcXHRcXHRcXHQ8aW1nIHNyYz1cIicgKyBhY2NvdW50LnNka19zcXVhcmVfbG9nb19pY29uICsgJ1wiIGFsdD1cIlwiPlxcblxcdFxcdFxcdFxcdDwvZGl2PlxcblxcdFxcdFxcdFxcdDxkaXYgY2xhc3M9XCJiYWMtdXNlci1hcHAtZGV0YWlsc1wiPlxcblxcdFxcdFxcdFxcdFxcdCA8c3Bhbj4nICsgYWNjb3VudC5uYW1lICsgJzwvc3Bhbj5cXG5cXHRcXHRcXHRcXHQ8L2Rpdj5cXG5cXHRcXHRcXHRcXHQnICsgKGlzVGhlU2VsZWN0ZWQgPyAnPGRpdiBpZD1cImJhYy0tc2VsZWN0ZWQtYWNvdW50LWluZGljYXRvclwiIGNsYXNzPVwiYmFjLS1zZWxlY3RlZC1hY291bnQtaW5kaWNhdG9yXCI+PC9kaXY+JyA6ICcnKSArICdcXG5cXHRcXHRcXHQnO1xuXHRcdH07XG5cblx0XHR2YXIgX2xvb3AgPSBmdW5jdGlvbiBfbG9vcChpKSB7XG5cdFx0XHR2YXIgYWNjb3VudCA9IGFjY291bnRzW2ldO1xuXHRcdFx0dmFyIGRpdiA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoJ2RpdicpO1xuXHRcdFx0ZGl2LmNsYXNzTmFtZSA9ICdiYWMtLXVzZXItbGlzdC1pdGVtJztcblx0XHRcdGRpdi5pbm5lckhUTUwgPSBhY2NvdW50c1RlbXBsYXRlKGFjY291bnQsIGFjY291bnQuc2ZpZCA9PT0gY3VycmVudEFjY291bnQuc2ZpZCk7XG5cdFx0XHRkaXYub25jbGljayA9IGZ1bmN0aW9uIChlKSB7XG5cdFx0XHRcdGUucHJldmVudERlZmF1bHQoKTtcblx0XHRcdFx0UFBCQS5jaGFuZ2VBY2NvdW50KGFjY291bnQuc2ZpZCk7XG5cdFx0XHR9O1xuXHRcdFx0ZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoJ2JhYy0tcHVyZXNkay11c2VyLWJ1c2luZXNzZXMtLScpLmFwcGVuZENoaWxkKGRpdik7XG5cdFx0fTtcblxuXHRcdGZvciAodmFyIGkgPSAwOyBpIDwgYWNjb3VudHMubGVuZ3RoOyBpKyspIHtcblx0XHRcdF9sb29wKGkpO1xuXHRcdH1cblx0fSxcblxuXHRyZW5kZXJJbmZvQmxvY2tzOiBmdW5jdGlvbiByZW5kZXJJbmZvQmxvY2tzKCkge1xuXHRcdEluZm9Db250cm9sbGVyLnJlbmRlckluZm9CbG9ja3MoKTtcblx0fSxcblxuXHRyZW5kZXJWZXJzaW9uTnVtYmVyOiBmdW5jdGlvbiByZW5kZXJWZXJzaW9uTnVtYmVyKHZlcnNpb24pIHtcblx0XHRkb2N1bWVudC5nZXRFbGVtZW50QnlJZCgncHVyZXNkay12ZXJzaW9uLW51bWJlcicpLmlubmVySFRNTCA9IHZlcnNpb247XG5cdH0sXG5cblx0c3R5bGVBY2NvdW50OiBmdW5jdGlvbiBzdHlsZUFjY291bnQoYWNjb3VudCkge1xuXHRcdHZhciBhcHBJbmZvID0gU3RvcmUuZ2V0QXBwSW5mbygpO1xuXHRcdHZhciBsb2dvID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudCgnaW1nJyk7XG5cdFx0bG9nby5zcmMgPSBhY2NvdW50LnNka19sb2dvX2ljb247XG5cdFx0ZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoJ2JhYy0tcHVyZXNkay1hY2NvdW50LWxvZ28tLScpLmFwcGVuZENoaWxkKGxvZ28pO1xuXHRcdGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKCdiYWMtLXB1cmVzZGstYWNjb3VudC1sb2dvLS0nKS5vbmNsaWNrID0gZnVuY3Rpb24gKGUpIHtcblx0XHRcdHdpbmRvdy5sb2NhdGlvbi5ocmVmID0gU3RvcmUuZ2V0Um9vdFVybCgpO1xuXHRcdH07XG5cdFx0aWYgKGFwcEluZm8gIT09IG51bGwpIHtcblx0XHRcdHZhciBhcHBUaXRsZUNvbnRhaW5lciA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoJ2RpdicpO1xuXHRcdFx0YXBwVGl0bGVDb250YWluZXIuY2xhc3NOYW1lID0gXCJiYWMtLXB1cmVzZGstYXBwLW5hbWUtLVwiO1xuXHRcdFx0dmFyIGFwcE9wZW5lclRlbXBsYXRlID0gZnVuY3Rpb24gYXBwT3BlbmVyVGVtcGxhdGUoYXBwSW5mb3JtYXRpb24pIHtcblx0XHRcdFx0cmV0dXJuICdcXG5cXHRcXHRcXHRcXHRcXHQgPGEgaHJlZj1cIicgKyBhcHBJbmZvcm1hdGlvbi5yb290ICsgJ1wiIGlkPVwiYXBwLW5hbWUtbGluay10by1yb290XCI+JyArIGFwcEluZm9ybWF0aW9uLm5hbWUgKyAnPC9hPlxcblxcdCBcXHQgIFxcdCBcXHQnO1xuXHRcdFx0fTtcblx0XHRcdGFwcFRpdGxlQ29udGFpbmVyLmlubmVySFRNTCA9IGFwcE9wZW5lclRlbXBsYXRlKGFwcEluZm8pO1xuXHRcdFx0ZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoJ2JhYy0tcHVyZXNkay1hY2NvdW50LWxvZ28tLScpLmFwcGVuZENoaWxkKGFwcFRpdGxlQ29udGFpbmVyKTtcblx0XHR9XG5cblx0XHRkb2N1bWVudC5nZXRFbGVtZW50QnlJZCgnYmFjLS1wdXJlc2RrLWJhYy0taGVhZGVyLWFwcHMtLScpLnN0eWxlLmNzc1RleHQgPSBcImJhY2tncm91bmQ6ICNcIiArIGFjY291bnQuc2RrX2JhY2tncm91bmRfY29sb3IgKyBcIjsgY29sb3I6ICNcIiArIGFjY291bnQuc2RrX2ZvbnRfY29sb3I7XG5cdFx0ZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoJ2JhYy0tcHVyZXNkay11c2VyLXNpZGViYXItLScpLnN0eWxlLmNzc1RleHQgPSBcImJhY2tncm91bmQ6ICNcIiArIGFjY291bnQuc2RrX2JhY2tncm91bmRfY29sb3IgKyBcIjsgY29sb3I6ICNcIiArIGFjY291bnQuc2RrX2ZvbnRfY29sb3I7XG5cdFx0aWYgKGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKCdiYWMtLXB1cmVzZGstYXBwcy1uYW1lLS0nKSkge1xuXHRcdFx0ZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoJ2JhYy0tcHVyZXNkay1hcHBzLW5hbWUtLScpLnN0eWxlLmNzc1RleHQgPSBcImNvbG9yOiAjXCIgKyBhY2NvdW50LnNka19mb250X2NvbG9yO1xuXHRcdH1cblx0XHRpZiAoZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoJ2JhYy0tc2VsZWN0ZWQtYWNvdW50LWluZGljYXRvcicpKSB7XG5cdFx0XHRkb2N1bWVudC5nZXRFbGVtZW50QnlJZCgnYmFjLS1zZWxlY3RlZC1hY291bnQtaW5kaWNhdG9yJykuc3R5bGUuY3NzVGV4dCA9IFwiYmFja2dyb3VuZDogI1wiICsgYWNjb3VudC5zZGtfZm9udF9jb2xvcjtcblx0XHR9XG5cdH0sXG5cblx0Z29Ub0xvZ2luUGFnZTogZnVuY3Rpb24gZ29Ub0xvZ2luUGFnZSgpIHtcblx0XHR3aW5kb3cubG9jYXRpb24uaHJlZiA9IFN0b3JlLmdldExvZ2luVXJsKCk7XG5cdH0sXG5cblx0LyogTE9BREVSICovXG5cdHNob3dMb2FkZXI6IGZ1bmN0aW9uIHNob3dMb2FkZXIoKSB7XG5cdFx0RG9tLmFkZENsYXNzKGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKCdiYWMtLXB1cmVzZGstLWxvYWRlci0tJyksICdiYWMtLXB1cmVzZGstdmlzaWJsZScpO1xuXHR9LFxuXG5cdGhpZGVMb2FkZXI6IGZ1bmN0aW9uIGhpZGVMb2FkZXIoKSB7XG5cdFx0RG9tLnJlbW92ZUNsYXNzKGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKCdiYWMtLXB1cmVzZGstLWxvYWRlci0tJyksICdiYWMtLXB1cmVzZGstdmlzaWJsZScpO1xuXHR9LFxuXG5cdG9wZW5DbG91ZGluYXJ5UGlja2VyOiBmdW5jdGlvbiBvcGVuQ2xvdWRpbmFyeVBpY2tlcihvcHRpb25zKSB7XG5cdFx0Q2xvdWRpbmFyeS5vcGVuTW9kYWwob3B0aW9ucyk7XG5cdH0sXG5cblx0LypcbiAgdHlwZTogb25lIG9mOlxuICAtIHN1Y2Nlc3NcbiAgLSBpbmZvXG4gIC0gd2FybmluZ1xuICAtIGVycm9yXG4gIHRleHQ6IHRoZSB0ZXh0IHRvIGRpc3BsYXlcbiAgb3B0aW9ucyAob3B0aW9uYWwpOiB7XG4gIFx0XHRoaWRlSW46IG1pbGxpc2Vjb25kcyB0byBoaWRlIGl0LiAtMSBmb3Igbm90IGhpZGluZyBpdCBhdCBhbGwuIERlZmF1bHQgaXMgNTAwMFxuICB9XG4gICovXG5cdHNldEluZm86IGZ1bmN0aW9uIHNldEluZm8odHlwZSwgdGV4dCwgb3B0aW9ucykge1xuXHRcdEluZm9Db250cm9sbGVyLnNob3dJbmZvKHR5cGUsIHRleHQsIG9wdGlvbnMpO1xuXHR9LFxuXG5cdHJlbmRlcjogZnVuY3Rpb24gcmVuZGVyKCkge1xuXHRcdHZhciB3aGVyZVRvID0gZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoU3RvcmUuZ2V0SFRMTUNvbnRhaW5lcigpKTtcblx0XHRpZiAod2hlcmVUbyA9PT0gbnVsbCkge1xuXHRcdFx0TG9nZ2VyLmVycm9yKCd0aGUgY29udGFpbmVyIHdpdGggaWQgXCInICsgd2hlcmVUbyArICdcIiBoYXMgbm90IGJlZW4gZm91bmQgb24gdGhlIGRvY3VtZW50LiBUaGUgbGlicmFyeSBpcyBnb2luZyB0byBjcmVhdGUgaXQuJyk7XG5cdFx0XHR2YXIgZGl2ID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudCgnZGl2Jyk7XG5cdFx0XHRkaXYuaWQgPSBTdG9yZS5nZXRIVExNQ29udGFpbmVyKCk7XG5cdFx0XHRkaXYuc3R5bGUud2lkdGggPSAnMTAwJSc7XG5cdFx0XHRkaXYuc3R5bGUuaGVpZ2h0ID0gXCI1MHB4XCI7XG5cdFx0XHRkaXYuc3R5bGUucG9zaXRpb24gPSBcImZpeGVkXCI7XG5cdFx0XHRkaXYuc3R5bGUudG9wID0gXCIwcHhcIjtcblx0XHRcdGRpdi5zdHlsZS56SW5kZXggPSBcIjIxNDc0ODM2NDdcIjtcblx0XHRcdGRvY3VtZW50LmJvZHkuaW5zZXJ0QmVmb3JlKGRpdiwgZG9jdW1lbnQuYm9keS5maXJzdENoaWxkKTtcblx0XHRcdHdoZXJlVG8gPSBkb2N1bWVudC5nZXRFbGVtZW50QnlJZChTdG9yZS5nZXRIVExNQ29udGFpbmVyKCkpO1xuXHRcdH1cblx0XHR3aGVyZVRvLmlubmVySFRNTCA9IFN0b3JlLmdldEhUTUwoKTtcblx0XHRQUEJBLnJlbmRlclVzZXIoU3RvcmUuZ2V0VXNlckRhdGEoKS51c2VyKTtcblx0XHRQUEJBLnJlbmRlckluZm9CbG9ja3MoKTtcblx0XHRQUEJBLnJlbmRlckFjY291bnRzKFN0b3JlLmdldFVzZXJEYXRhKCkudXNlci5hY2NvdW50cywgU3RvcmUuZ2V0VXNlckRhdGEoKS51c2VyLmFjY291bnQpO1xuXHRcdFBQQkEuc3R5bGVBY2NvdW50KFN0b3JlLmdldFVzZXJEYXRhKCkudXNlci5hY2NvdW50KTtcblx0XHRQUEJBLnJlbmRlclZlcnNpb25OdW1iZXIoU3RvcmUuZ2V0VmVyc2lvbk51bWJlcigpKTtcblx0XHRpZiAoU3RvcmUuZ2V0QXBwc1Zpc2libGUoKSA9PT0gZmFsc2UpIHtcblx0XHRcdGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKCdiYWMtLXB1cmVzZGstYXBwcy1zZWN0aW9uLS0nKS5zdHlsZS5jc3NUZXh0ID0gXCJkaXNwbGF5Om5vbmVcIjtcblx0XHR9XG5cdFx0YWZ0ZXJSZW5kZXIoKTtcblx0fVxufTtcblxubW9kdWxlLmV4cG9ydHMgPSBQUEJBOyIsIid1c2Ugc3RyaWN0JztcblxuLyohXG4gKiBQdXJlUHJvZmlsZSBQdXJlUHJvZmlsZSBCdXNpbmVzcyBBcHBzIERldmVsb3BtZW50IFNES1xuICpcbiAqIHZlcnNpb246IDIuNy4xXG4gKiBkYXRlOiAyMDE5LTA3LTI0XG4gKlxuICogQ29weXJpZ2h0IDIwMTcsIFB1cmVQcm9maWxlXG4gKiBSZWxlYXNlZCB1bmRlciBNSVQgbGljZW5zZVxuICogaHR0cHM6Ly9vcGVuc291cmNlLm9yZy9saWNlbnNlcy9NSVRcbiAqL1xuXG52YXIgcHBiYSA9IHJlcXVpcmUoJy4vUFBCQScpO1xucHBiYS5zZXRXaW5kb3dOYW1lKCdQVVJFU0RLJyk7XG5wcGJhLnNldENvbmZpZ3VyYXRpb24oe1xuICAgIFwibG9nc1wiOiBmYWxzZSxcbiAgICBcInJvb3RVcmxcIjogXCIvXCIsXG4gICAgXCJiYXNlVXJsXCI6IFwiYXBpL3YxL1wiLFxuICAgIFwibG9naW5VcmxcIjogXCJzaWduaW5cIixcbiAgICBcInNlYXJjaElucHV0SWRcIjogXCItLXB1cmVzZGstLXNlYXJjaC0taW5wdXQtLVwiLFxuICAgIFwicmVkaXJlY3RVcmxQYXJhbVwiOiBcInJlZGlyZWN0X3VybFwiXG59KTtcbnBwYmEuc2V0SFRNTFRlbXBsYXRlKCc8aGVhZGVyIGNsYXNzPVwiYmFjLS1oZWFkZXItYXBwc1wiIGlkPVwiYmFjLS1wdXJlc2RrLWJhYy0taGVhZGVyLWFwcHMtLVwiPlxcbiAgICA8ZGl2IGNsYXNzPVwiYmFjLS1jb250YWluZXJcIj5cXG4gICAgICAgIDxkaXYgY2xhc3M9XCJiYWMtLWxvZ29cIiBpZD1cImJhYy0tcHVyZXNkay1hY2NvdW50LWxvZ28tLVwiPjwvZGl2PlxcbiAgICAgICAgPGRpdiBjbGFzcz1cImJhYy0tdXNlci1hY3Rpb25zXCI+XFxuICAgICAgICAgICAgPHN2ZyBpZD1cImJhYy0tcHVyZXNkay0tbG9hZGVyLS1cIiB3aWR0aD1cIjM4XCIgaGVpZ2h0PVwiMzhcIiB2aWV3Qm94PVwiMCAwIDQ0IDQ0XCIgeG1sbnM9XCJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2Z1wiIHN0cm9rZT1cIiNmZmZcIiBzdHlsZT1cIlxcbiAgICBtYXJnaW4tcmlnaHQ6IDEwcHg7XFxuXCI+XFxuICAgICAgICAgICAgICAgIDxnIGZpbGw9XCJub25lXCIgZmlsbC1ydWxlPVwiZXZlbm9kZFwiIHN0cm9rZS13aWR0aD1cIjJcIj5cXG4gICAgICAgICAgICAgICAgICAgIDxjaXJjbGUgY3g9XCIyMlwiIGN5PVwiMjJcIiByPVwiMTYuNjQzN1wiPlxcbiAgICAgICAgICAgICAgICAgICAgICAgIDxhbmltYXRlIGF0dHJpYnV0ZU5hbWU9XCJyXCIgYmVnaW49XCIwc1wiIGR1cj1cIjEuOHNcIiB2YWx1ZXM9XCIxOyAyMFwiIGNhbGNNb2RlPVwic3BsaW5lXCIga2V5VGltZXM9XCIwOyAxXCIga2V5U3BsaW5lcz1cIjAuMTY1LCAwLjg0LCAwLjQ0LCAxXCIgcmVwZWF0Q291bnQ9XCJpbmRlZmluaXRlXCI+PC9hbmltYXRlPlxcbiAgICAgICAgICAgICAgICAgICAgICAgIDxhbmltYXRlIGF0dHJpYnV0ZU5hbWU9XCJzdHJva2Utb3BhY2l0eVwiIGJlZ2luPVwiMHNcIiBkdXI9XCIxLjhzXCIgdmFsdWVzPVwiMTsgMFwiIGNhbGNNb2RlPVwic3BsaW5lXCIga2V5VGltZXM9XCIwOyAxXCIga2V5U3BsaW5lcz1cIjAuMywgMC42MSwgMC4zNTUsIDFcIiByZXBlYXRDb3VudD1cImluZGVmaW5pdGVcIj48L2FuaW1hdGU+XFxuICAgICAgICAgICAgICAgICAgICA8L2NpcmNsZT5cXG4gICAgICAgICAgICAgICAgICAgIDxjaXJjbGUgY3g9XCIyMlwiIGN5PVwiMjJcIiByPVwiMTkuOTI4MlwiPlxcbiAgICAgICAgICAgICAgICAgICAgICAgIDxhbmltYXRlIGF0dHJpYnV0ZU5hbWU9XCJyXCIgYmVnaW49XCJiYWMtMC45c1wiIGR1cj1cIjEuOHNcIiB2YWx1ZXM9XCIxOyAyMFwiIGNhbGNNb2RlPVwic3BsaW5lXCIga2V5VGltZXM9XCIwOyAxXCIga2V5U3BsaW5lcz1cIjAuMTY1LCAwLjg0LCAwLjQ0LCAxXCIgcmVwZWF0Q291bnQ9XCJpbmRlZmluaXRlXCI+PC9hbmltYXRlPlxcbiAgICAgICAgICAgICAgICAgICAgICAgIDxhbmltYXRlIGF0dHJpYnV0ZU5hbWU9XCJzdHJva2Utb3BhY2l0eVwiIGJlZ2luPVwiYmFjLTAuOXNcIiBkdXI9XCIxLjhzXCIgdmFsdWVzPVwiMTsgMFwiIGNhbGNNb2RlPVwic3BsaW5lXCIga2V5VGltZXM9XCIwOyAxXCIga2V5U3BsaW5lcz1cIjAuMywgMC42MSwgMC4zNTUsIDFcIiByZXBlYXRDb3VudD1cImluZGVmaW5pdGVcIj48L2FuaW1hdGU+XFxuICAgICAgICAgICAgICAgICAgICA8L2NpcmNsZT5cXG4gICAgICAgICAgICAgICAgPC9nPlxcbiAgICAgICAgICAgIDwvc3ZnPlxcbiAgICAgICAgICAgIDxkaXYgY2xhc3M9XCJiYWMtLXVzZXItYXBwc1wiIGlkPVwiYmFjLS1wdXJlc2RrLWFwcHMtc2VjdGlvbi0tXCI+XFxuICAgICAgICAgICAgICAgIDxhIGhyZWY9XCIvYXBwL2NhbXBhaWduc1wiIGlkPVwiYmFjLS1wdXJlc2RrLWNhbXBhaWducy1saW5rLS1cIiBjbGFzcz1cImJhYy0tcHVyZXNkay1hcHBzLW9uLW5hdmJhci0tIGRpc2FibGVkXCI+Q2FtcGFpZ25zPC9hPlxcbiAgICAgICAgICAgICAgICA8YSBocmVmPVwiL2FwcC9ncm91cHNcIiBpZD1cImJhYy0tcHVyZXNkay1ncm91cHMtbGluay0tXCIgY2xhc3M9XCJiYWMtLXB1cmVzZGstYXBwcy1vbi1uYXZiYXItLSBkaXNhYmxlZFwiPkdyb3VwczwvYT5cXG4gICAgICAgICAgICAgICAgPGEgaHJlZj1cIiNcIiBpZD1cImJhYy0tcHVyZXNkay0tYXBwcy0tb3BlbmVyLS1cIiBjbGFzcz1cImJhYy0tcHVyZXNkay1hcHBzLW9uLW5hdmJhci0tXCI+T3RoZXIgYXBwczwvYT5cXG4gICAgICAgICAgICAgICAgPGRpdiBjbGFzcz1cImJhYy0tYXBwcy1jb250YWluZXJcIiBpZD1cImJhYy0tcHVyZXNkay1hcHBzLWNvbnRhaW5lci0tXCI+XFxuICAgICAgICAgICAgICAgICAgICA8ZGl2IGlkPVwiYmFjLS1hcHMtYWN0dWFsLWNvbnRhaW5lclwiPjwvZGl2PlxcbiAgICAgICAgICAgICAgICA8L2Rpdj5cXG4gICAgICAgICAgICA8L2Rpdj5cXG4gICAgICAgICAgICA8IS0tPGRpdiBjbGFzcz1cImJhYyYjNDU7JiM0NTt1c2VyLW5vdGlmaWNhdGlvbnNcIj4tLT5cXG4gICAgICAgICAgICAgICAgPCEtLTxkaXYgY2xhc3M9XCJiYWMmIzQ1OyYjNDU7dXNlci1ub3RpZmljYXRpb25zLWNvdW50XCI+MTwvZGl2Pi0tPlxcbiAgICAgICAgICAgICAgICA8IS0tPGkgY2xhc3M9XCJmYSBmYS1iZWxsLW9cIj48L2k+LS0+XFxuICAgICAgICAgICAgPCEtLTwvZGl2Pi0tPlxcbiAgICAgICAgICAgIDxkaXYgY2xhc3M9XCJiYWMtLXVzZXItYXZhdGFyXCIgaWQ9XCJiYWMtLXVzZXItYXZhdGFyLXRvcFwiPlxcbiAgICAgICAgICAgICAgICA8c3BhbiBjbGFzcz1cImJhYy0tdXNlci1hdmF0YXItbmFtZVwiIGlkPVwiYmFjLS1wdXJlc2RrLXVzZXItYXZhdGFyLS1cIj48L3NwYW4+XFxuICAgICAgICAgICAgICAgIDxkaXYgaWQ9XCJiYWMtLWltYWdlLWNvbnRhaW5lci10b3BcIj48L2Rpdj5cXG4gICAgICAgICAgICA8L2Rpdj5cXG4gICAgICAgIDwvZGl2PlxcbiAgICA8L2Rpdj5cXG4gICAgPGRpdiBpZD1cImJhYy0taW5mby1ibG9ja3Mtd3JhcHBlci0tXCI+PC9kaXY+XFxuPC9oZWFkZXI+XFxuPGRpdiBjbGFzcz1cImJhYy0tdXNlci1zaWRlYmFyXCIgaWQ9XCJiYWMtLXB1cmVzZGstdXNlci1zaWRlYmFyLS1cIj5cXG4gICAgPGRpdiBpZD1cImJhYy0tcHVyZXNkay11c2VyLWRldGFpbHMtLVwiPjwvZGl2PlxcbiAgICA8IS0tPGRpdiBjbGFzcz1cImJhYyYjNDU7JiM0NTt1c2VyLXNpZGViYXItaW5mb1wiPi0tPlxcbiAgICAgICAgPCEtLTxkaXYgY2xhc3M9XCJiYWMmIzQ1OyYjNDU7dXNlci1pbWFnZVwiPjxpIGNsYXNzPVwiZmEgZmEtY2FtZXJhXCI+PC9pPjwvZGl2Pi0tPlxcbiAgICAgICAgPCEtLTxkaXYgY2xhc3M9XCJiYWMmIzQ1OyYjNDU7dXNlci1uYW1lXCI+Q3VydGlzIEJhcnRsZXR0PC9kaXY+LS0+XFxuICAgICAgICA8IS0tPGRpdiBjbGFzcz1cImJhYyYjNDU7JiM0NTt1c2VyLWVtYWlsXCI+Y2JhcnRsZXR0QHB1cmVwcm9maWxlLmNvbTwvZGl2Pi0tPlxcbiAgICA8IS0tPC9kaXY+LS0+XFxuICAgIDxkaXYgY2xhc3M9XCJiYWMtLXVzZXItYXBwc1wiIGlkPVwiYmFjLS1wdXJlc2RrLXVzZXItYnVzaW5lc3Nlcy0tXCI+XFxuICAgICAgICA8IS0tPGRpdiBjbGFzcz1cImJhYyYjNDU7JiM0NTt1c2VyLWxpc3QtaXRlbVwiPi0tPlxcbiAgICAgICAgICAgIDwhLS08aW1nIHNyYz1cImh0dHA6Ly9sb3JlbXBpeGVsLmNvbS80MC80MFwiIGFsdD1cIlwiPi0tPlxcbiAgICAgICAgICAgIDwhLS08ZGl2IGNsYXNzPVwiYmFjLXVzZXItYXBwLWRldGFpbHNcIj4tLT5cXG4gICAgICAgICAgICAgICAgPCEtLTxzcGFuPjwvc3Bhbj4tLT5cXG4gICAgICAgICAgICAgICAgPCEtLTxzcGFuPjE1IHRlYW0gbWVtYmVyczwvc3Bhbj4tLT5cXG4gICAgICAgICAgICA8IS0tPC9kaXY+LS0+XFxuICAgICAgICA8IS0tPC9kaXY+LS0+XFxuICAgIDwvZGl2PlxcbiAgICA8ZGl2IGNsYXNzPVwiYmFjLS11c2VyLWFjY291bnQtc2V0dGluZ3NcIj5cXG4gICAgICAgIDwhLS08ZGl2IGNsYXNzPVwiYmFjLXVzZXItYWNvdW50LWxpc3QtaXRlbVwiPi0tPlxcbiAgICAgICAgICAgIDwhLS08aSBjbGFzcz1cImZhIGZhLWNvZy1saW5lXCI+PC9pPi0tPlxcbiAgICAgICAgICAgIDwhLS08YSBocmVmPVwiI1wiPkFjY291bnQgU2VjdXJpdHk8L2E+LS0+XFxuICAgICAgICA8IS0tPC9kaXY+LS0+XFxuICAgICAgICA8ZGl2IGNsYXNzPVwiYmFjLXVzZXItYWNvdW50LWxpc3QtaXRlbVwiPlxcbiAgICAgICAgICAgIDxpIGNsYXNzPVwiZmEgZmEtbG9naW4tbGluZVwiPjwvaT5cXG4gICAgICAgICAgICA8YSBocmVmPVwiL2FwaS92MS9zaWduLW9mZlwiPkxvZyBvdXQ8L2E+XFxuICAgICAgICA8L2Rpdj5cXG5cXG4gICAgICAgIDxkaXYgaWQ9XCJwdXJlc2RrLXZlcnNpb24tbnVtYmVyXCIgY2xhc3M9XCJwdXJlc2RrLXZlcnNpb24tbnVtYmVyXCI+PC9kaXY+XFxuICAgIDwvZGl2PlxcbjwvZGl2PlxcblxcblxcbjxkaXYgY2xhc3M9XCJiYWMtLWN1c3RvbS1tb2RhbCBhZGQtcXVlc3Rpb24tbW9kYWwgLS1pcy1vcGVuXCIgaWQ9XCJiYWMtLWNsb3VkaW5hcnktLW1vZGFsXCI+XFxuICAgIDxkaXYgY2xhc3M9XCJjdXN0b20tbW9kYWxfX3dyYXBwZXJcIj5cXG4gICAgICAgIDxkaXYgY2xhc3M9XCJjdXN0b20tbW9kYWxfX2NvbnRlbnRcIj5cXG4gICAgICAgICAgICA8aDM+QWRkIGltYWdlPC9oMz5cXG4gICAgICAgICAgICA8YSBjbGFzcz1cImN1c3RvbS1tb2RhbF9fY2xvc2UtYnRuXCIgaWQ9XCJiYWMtLWNsb3VkaW5hcnktLWNsb3NlYnRuXCI+PGkgY2xhc3M9XCJmYSBmYS10aW1lcy1jaXJjbGVcIj48L2k+PC9hPlxcbiAgICAgICAgPC9kaXY+XFxuXFxuICAgICAgICA8ZGl2IGNsYXNzPVwiY3VzdG9tLW1vZGFsX19jb250ZW50XCI+XFxuICAgICAgICAgICAgPGRpdiBjbGFzcz1cImJhYy1zZWFyY2ggLS1pY29uLWxlZnRcIj5cXG4gICAgICAgICAgICAgICAgPGlucHV0IGlkPVwiYmFjLS1jbG91ZGluYXJ5LS1zZWFyY2gtaW5wdXRcIiB0eXBlPVwic2VhcmNoXCIgbmFtZT1cInNlYXJjaFwiIHBsYWNlaG9sZGVyPVwiU2VhcmNoIGZvciBpbWFnZXMuLi5cIi8+XFxuICAgICAgICAgICAgICAgIDxkaXYgY2xhc3M9XCJiYWMtc2VhcmNoX19pY29uXCI+PGkgY2xhc3M9XCJmYSBmYS1zZWFyY2hcIj48L2k+PC9kaXY+XFxuICAgICAgICAgICAgPC9kaXY+XFxuICAgICAgICAgICAgPGJyLz5cXG5cXG4gICAgICAgICAgICA8ZGl2IGNsYXNzPVwiYmFjay1idXR0b25cIiBpZD1cImJhYy0tY2xvdWRpbmFyeS0tYmFjay1idXR0b24tY29udGFpbmVyXCI+XFxuICAgICAgICAgICAgICAgIDxhIGNsYXNzPVwiZ29CYWNrXCIgaWQ9XCJiYWMtLWNsb3VkaW5hcnktLWdvLWJhY2tcIj48aSBjbGFzcz1cImZhIGZhLWFuZ2xlLWxlZnRcIj48L2k+R28gQmFjazwvYT5cXG4gICAgICAgICAgICA8L2Rpdj5cXG5cXG4gICAgICAgICAgICA8YnIvPlxcbiAgICAgICAgICAgIDxkaXYgY2xhc3M9XCJjbG91ZC1pbWFnZXNcIj5cXG4gICAgICAgICAgICAgICAgPGRpdiBjbGFzcz1cImNsb3VkLWltYWdlc19fY29udGFpbmVyXCIgaWQ9XCJiYWMtLWNsb3VkaW5hcnktaXRhbXMtY29udGFpbmVyXCI+PC9kaXY+XFxuXFxuICAgICAgICAgICAgICAgIDxkaXYgY2xhc3M9XCJjbG91ZC1pbWFnZXNfX3BhZ2luYXRpb25cIiBpZD1cImJhYy0tY2xvdWRpbmFyeS1wYWdpbmF0aW9uLWNvbnRhaW5lclwiPlxcbiAgICAgICAgICAgICAgICAgICAgPHVsIGlkPVwiYmFjLS1jbG91ZGluYXJ5LWFjdHVhbC1wYWdpbmF0aW9uLWNvbnRhaW5lclwiPjwvdWw+XFxuICAgICAgICAgICAgICAgIDwvZGl2PlxcblxcbiAgICAgICAgICAgIDwvZGl2PlxcbiAgICAgICAgPC9kaXY+XFxuICAgIDwvZGl2PlxcbjwvZGl2PlxcblxcbjxpbnB1dCBzdHlsZT1cImRpc3BsYXk6bm9uZVwiIHR5cGU9XFwnZmlsZVxcJyBpZD1cXCdiYWMtLS1wdXJlc2RrLWF2YXRhci1maWxlXFwnPlxcbjxpbnB1dCBzdHlsZT1cImRpc3BsYXk6bm9uZVwiIHR5cGU9XFwnYnV0dG9uXFwnIGlkPVxcJ2JhYy0tLXB1cmVzZGstYXZhdGFyLXN1Ym1pdFxcJyB2YWx1ZT1cXCdVcGxvYWQhXFwnPicpO1xucHBiYS5zZXRWZXJzaW9uTnVtYmVyKCcyLjcuMScpO1xuXG53aW5kb3cuUFVSRVNESyA9IHBwYmE7XG5cbnZhciBjc3MgPSAnaHRtbCxib2R5LGRpdixzcGFuLGFwcGxldCxvYmplY3QsaWZyYW1lLGgxLGgyLGgzLGg0LGg1LGg2LHAsYmxvY2txdW90ZSxwcmUsYSxhYmJyLGFjcm9ueW0sYWRkcmVzcyxiaWcsY2l0ZSxjb2RlLGRlbCxkZm4sZW0saW1nLGlucyxrYmQscSxzLHNhbXAsc21hbGwsc3RyaWtlLHN0cm9uZyxzdWIsc3VwLHR0LHZhcixiLHUsaSxjZW50ZXIsZGwsZHQsZGQsb2wsdWwsbGksZmllbGRzZXQsZm9ybSxsYWJlbCxsZWdlbmQsdGFibGUsY2FwdGlvbix0Ym9keSx0Zm9vdCx0aGVhZCx0cix0aCx0ZCxhcnRpY2xlLGFzaWRlLGNhbnZhcyxkZXRhaWxzLGVtYmVkLGZpZ3VyZSxmaWdjYXB0aW9uLGZvb3RlcixoZWFkZXIsaGdyb3VwLG1lbnUsbmF2LG91dHB1dCxydWJ5LHNlY3Rpb24sc3VtbWFyeSx0aW1lLG1hcmssYXVkaW8sdmlkZW97bWFyZ2luOjA7cGFkZGluZzowO2JvcmRlcjowO2ZvbnQtc2l6ZToxMDAlO2ZvbnQ6aW5oZXJpdDt2ZXJ0aWNhbC1hbGlnbjpiYXNlbGluZX1hcnRpY2xlLGFzaWRlLGRldGFpbHMsZmlnY2FwdGlvbixmaWd1cmUsZm9vdGVyLGhlYWRlcixoZ3JvdXAsbWVudSxuYXYsc2VjdGlvbntkaXNwbGF5OmJsb2NrfWJvZHl7bGluZS1oZWlnaHQ6MX1vbCx1bHtsaXN0LXN0eWxlOm5vbmV9YmxvY2txdW90ZSxxe3F1b3Rlczpub25lfWJsb2NrcXVvdGU6YmVmb3JlLGJsb2NrcXVvdGU6YWZ0ZXIscTpiZWZvcmUscTphZnRlcntjb250ZW50OlwiXCI7Y29udGVudDpub25lfXRhYmxle2JvcmRlci1jb2xsYXBzZTpjb2xsYXBzZTtib3JkZXItc3BhY2luZzowfWJvZHl7b3ZlcmZsb3cteDpoaWRkZW59I2JhYy13cmFwcGVye2ZvbnQtZmFtaWx5OlwiVmVyZGFuYVwiLCBhcmlhbCwgc2Fucy1zZXJpZjtjb2xvcjp3aGl0ZTttaW4taGVpZ2h0OjEwMHZoO3Bvc2l0aW9uOnJlbGF0aXZlfS5iYWMtLWNvbnRhaW5lcnttYXgtd2lkdGg6MTE2MHB4O21hcmdpbjowIGF1dG99LmJhYy0tY29udGFpbmVyIC5iYWMtLXB1cmVzZGstYXBwLW5hbWUtLXtkaXNwbGF5OmlubGluZS1ibG9jaztwb3NpdGlvbjpyZWxhdGl2ZTt0b3A6LTVweDtsZWZ0OjE1cHh9LmJhYy0tY29udGFpbmVyICNhcHAtbmFtZS1saW5rLXRvLXJvb3R7ZGlzcGxheTpibG9jaztmb250LXNpemU6MS40ZW07d2lkdGg6MjAwcHg7Y29sb3I6d2hpdGU7dGV4dC1kZWNvcmF0aW9uOm5vbmV9LmJhYy0taGVhZGVyLWFwcHN7cG9zaXRpb246YWJzb2x1dGU7d2lkdGg6MTAwJTtoZWlnaHQ6NTBweDtiYWNrZ3JvdW5kLWNvbG9yOiM0NzUzNjk7cGFkZGluZzo1cHggMTBweDt6LWluZGV4Ojk5OTk5OTl9LmJhYy0taGVhZGVyLWFwcHMgLmJhYy0tY29udGFpbmVye2hlaWdodDoxMDAlO2Rpc3BsYXk6ZmxleDthbGlnbi1pdGVtczpjZW50ZXI7anVzdGlmeS1jb250ZW50OnNwYWNlLWJldHdlZW59LmJhYy0taGVhZGVyLXNlYXJjaHtwb3NpdGlvbjpyZWxhdGl2ZX0uYmFjLS1oZWFkZXItc2VhcmNoIGlucHV0e2NvbG9yOiNmZmY7Zm9udC1zaXplOjE0cHg7aGVpZ2h0OjM1cHg7YmFja2dyb3VuZC1jb2xvcjojNmI3NTg2O3BhZGRpbmc6MCA1cHggMCAxMHB4O2JvcmRlcjpub25lO2JvcmRlci1yYWRpdXM6M3B4O21pbi13aWR0aDo0MDBweDt3aWR0aDoxMDAlfS5iYWMtLWhlYWRlci1zZWFyY2ggaW5wdXQ6Zm9jdXN7b3V0bGluZTpub25lfS5iYWMtLWhlYWRlci1zZWFyY2ggaW5wdXQ6Oi13ZWJraXQtaW5wdXQtcGxhY2Vob2xkZXJ7Zm9udC1zdHlsZTpub3JtYWwgIWltcG9ydGFudDt0ZXh0LWFsaWduOmNlbnRlcjtjb2xvcjojZmZmO2ZvbnQtc2l6ZToxNHB4O2ZvbnQtd2VpZ2h0OjMwMDtsZXR0ZXItc3BhY2luZzowLjVweH0uYmFjLS1oZWFkZXItc2VhcmNoIGlucHV0OjotbW96LXBsYWNlaG9sZGVye2ZvbnQtc3R5bGU6bm9ybWFsICFpbXBvcnRhbnQ7dGV4dC1hbGlnbjpjZW50ZXI7Y29sb3I6I2ZmZjtmb250LXNpemU6MTRweDtmb250LXdlaWdodDozMDA7bGV0dGVyLXNwYWNpbmc6MC41cHh9LmJhYy0taGVhZGVyLXNlYXJjaCBpbnB1dDotbXMtaW5wdXQtcGxhY2Vob2xkZXJ7Zm9udC1zdHlsZTpub3JtYWwgIWltcG9ydGFudDt0ZXh0LWFsaWduOmNlbnRlcjtjb2xvcjojZmZmO2ZvbnQtc2l6ZToxNHB4O2ZvbnQtd2VpZ2h0OjMwMDtsZXR0ZXItc3BhY2luZzowLjVweH0uYmFjLS1oZWFkZXItc2VhcmNoIGl7cG9zaXRpb246YWJzb2x1dGU7dG9wOjhweDtyaWdodDoxMHB4fS5iYWMtLXVzZXItYWN0aW9uc3tkaXNwbGF5OmZsZXg7YWxpZ24taXRlbXM6Y2VudGVyfS5iYWMtLXVzZXItYWN0aW9ucyAjYmFjLS1wdXJlc2RrLWFwcHMtc2VjdGlvbi0te2JvcmRlci1yaWdodDoxcHggc29saWQgI2FkYWRhZDtoZWlnaHQ6NDBweDtwYWRkaW5nLXRvcDoxNXB4fS5iYWMtLXVzZXItYWN0aW9ucyAjYmFjLS1wdXJlc2RrLWFwcHMtc2VjdGlvbi0tIGEuYmFjLS1wdXJlc2RrLWFwcHMtb24tbmF2YmFyLS17Y29sb3I6d2hpdGVzbW9rZTt0ZXh0LWRlY29yYXRpb246bm9uZTttYXJnaW4tcmlnaHQ6MjVweDtmb250LXNpemU6MC45ZW19LmJhYy0tdXNlci1hY3Rpb25zICNiYWMtLXB1cmVzZGstYXBwcy1zZWN0aW9uLS0gYS5iYWMtLXB1cmVzZGstYXBwcy1vbi1uYXZiYXItLS5kaXNhYmxlZHtwb2ludGVyLWV2ZW50czpub25lO2N1cnNvcjpub25lO2NvbG9yOiNhZGFkYWR9LmJhYy0tdXNlci1hY3Rpb25zICNiYWMtLXB1cmVzZGstYXBwcy1zZWN0aW9uLS0gYS5iYWMtLXB1cmVzZGstYXBwcy1vbi1uYXZiYXItLS5zZWxlY3RlZHtjb2xvcjojMjBENkM5O3BvaW50ZXItZXZlbnRzOm5vbmV9LmJhYy0tdXNlci1hY3Rpb25zIC5iYWMtLXVzZXItbm90aWZpY2F0aW9uc3twb3NpdGlvbjpyZWxhdGl2ZX0uYmFjLS11c2VyLWFjdGlvbnMgLmJhYy0tdXNlci1ub3RpZmljYXRpb25zIGl7Zm9udC1zaXplOjIwcHh9LmJhYy0tdXNlci1hY3Rpb25zICNiYWMtLXB1cmVzZGstLWxvYWRlci0te2Rpc3BsYXk6bm9uZX0uYmFjLS11c2VyLWFjdGlvbnMgI2JhYy0tcHVyZXNkay0tbG9hZGVyLS0uYmFjLS1wdXJlc2RrLXZpc2libGV7ZGlzcGxheTpibG9ja30uYmFjLS11c2VyLWFjdGlvbnMgLmJhYy0tdXNlci1ub3RpZmljYXRpb25zLWNvdW50e3Bvc2l0aW9uOmFic29sdXRlO2Rpc3BsYXk6aW5saW5lLWJsb2NrO2hlaWdodDoxNXB4O3dpZHRoOjE1cHg7bGluZS1oZWlnaHQ6MTVweDtjb2xvcjojZmZmO2ZvbnQtc2l6ZToxMHB4O3RleHQtYWxpZ246Y2VudGVyO2JhY2tncm91bmQtY29sb3I6I2ZjM2IzMDtib3JkZXItcmFkaXVzOjUwJTt0b3A6LTVweDtsZWZ0Oi01cHh9LmJhYy0tdXNlci1hY3Rpb25zIC5iYWMtLXVzZXItYXZhdGFyLC5iYWMtLXVzZXItYWN0aW9ucyAuYmFjLS11c2VyLW5vdGlmaWNhdGlvbnN7bWFyZ2luLWxlZnQ6MjBweH0uYmFjLS11c2VyLWFjdGlvbnMgLmJhYy0tdXNlci1hdmF0YXJ7cG9zaXRpb246cmVsYXRpdmU7b3ZlcmZsb3c6aGlkZGVuO2JvcmRlci1yYWRpdXM6NTAlfS5iYWMtLXVzZXItYWN0aW9ucyAuYmFjLS11c2VyLWF2YXRhciAjYmFjLS1pbWFnZS1jb250YWluZXItdG9we3dpZHRoOjEwMCU7aGVpZ3RoOjEwMCU7cG9zaXRpb246YWJzb2x1dGU7dG9wOjA7bGVmdDowO3otaW5kZXg6MTtkaXNwbGF5Om5vbmV9LmJhYy0tdXNlci1hY3Rpb25zIC5iYWMtLXVzZXItYXZhdGFyICNiYWMtLWltYWdlLWNvbnRhaW5lci10b3AgaW1ne3dpZHRoOjEwMCU7aGVpZ2h0OjEwMCV9LmJhYy0tdXNlci1hY3Rpb25zIC5iYWMtLXVzZXItYXZhdGFyICNiYWMtLWltYWdlLWNvbnRhaW5lci10b3AuYmFjLS1wdXJlc2RrLXZpc2libGV7ZGlzcGxheTpibG9ja30uYmFjLS11c2VyLWFjdGlvbnMgLmJhYy0tdXNlci1hdmF0YXItbmFtZXtjb2xvcjojZmZmO2JhY2tncm91bmQtY29sb3I6I2FkYWRhZDtkaXNwbGF5OmlubGluZS1ibG9jaztoZWlnaHQ6MzVweDt3aWR0aDozNXB4O2xpbmUtaGVpZ2h0OjM1cHg7dGV4dC1hbGlnbjpjZW50ZXI7Zm9udC1zaXplOjE0cHh9LmJhYy0tdXNlci1hcHBze3Bvc2l0aW9uOnJlbGF0aXZlfSNiYWMtLXB1cmVzZGstYXBwcy1pY29uLS17d2lkdGg6MjBweDtkaXNwbGF5OmlubGluZS1ibG9jazt0ZXh0LWFsaWduOmNlbnRlcjtmb250LXNpemU6MTZweH0uYmFjLS1wdXJlc2RrLWFwcHMtbmFtZS0te2ZvbnQtc2l6ZTo5cHg7d2lkdGg6MjBweDt0ZXh0LWFsaWduOmNlbnRlcn0jYmFjLS1wdXJlc2RrLXVzZXItYnVzaW5lc3Nlcy0te2hlaWdodDpjYWxjKDEwMHZoIC0gMzMzcHgpO292ZXJmbG93OmF1dG99LmJhYy0tYXBwcy1jb250YWluZXJ7YmFja2dyb3VuZDojZmZmO3Bvc2l0aW9uOmFic29sdXRlO3RvcDo0NXB4O3JpZ2h0OjBweDtkaXNwbGF5OmZsZXg7d2lkdGg6MzAwcHg7ZmxleC13cmFwOndyYXA7Ym9yZGVyLXJhZGl1czoxMHB4O3BhZGRpbmc6MTVweDtwYWRkaW5nLXJpZ2h0OjA7anVzdGlmeS1jb250ZW50OnNwYWNlLWJldHdlZW47dGV4dC1hbGlnbjpsZWZ0Oy13ZWJraXQtYm94LXNoYWRvdzowIDAgMTBweCAycHggcmdiYSgwLDAsMCwwLjIpO2JveC1zaGFkb3c6MCAwIDEwcHggMnB4IHJnYmEoMCwwLDAsMC4yKTtvcGFjaXR5OjA7dmlzaWJpbGl0eTpoaWRkZW47dHJhbnNpdGlvbjphbGwgMC40cyBlYXNlO21heC1oZWlnaHQ6NTAwcHh9LmJhYy0tYXBwcy1jb250YWluZXIgI2JhYy0tYXBzLWFjdHVhbC1jb250YWluZXJ7aGVpZ2h0OjEwMCU7b3ZlcmZsb3c6c2Nyb2xsO21heC1oZWlnaHQ6NDc1cHg7d2lkdGg6MTAwJX0uYmFjLS1hcHBzLWNvbnRhaW5lci5hY3RpdmV7b3BhY2l0eToxO3Zpc2liaWxpdHk6dmlzaWJsZX0uYmFjLS1hcHBzLWNvbnRhaW5lcjpiZWZvcmV7Y29udGVudDpcIlwiO3ZlcnRpY2FsLWFsaWduOm1pZGRsZTttYXJnaW46YXV0bztwb3NpdGlvbjphYnNvbHV0ZTtkaXNwbGF5OmJsb2NrO2xlZnQ6MDtyaWdodDotMTg1cHg7Ym90dG9tOmNhbGMoMTAwJSAtIDZweCk7d2lkdGg6MTJweDtoZWlnaHQ6MTJweDt0cmFuc2Zvcm06cm90YXRlKDQ1ZGVnKTtiYWNrZ3JvdW5kLWNvbG9yOiNmZmZ9LmJhYy0tYXBwcy1jb250YWluZXIgLmJhYy0tYXBwc3t3aWR0aDoxMDAlO2ZvbnQtc2l6ZTozM3B4O21hcmdpbi1ib3R0b206MTVweDt0ZXh0LWFsaWduOmxlZnQ7aGVpZ2h0OjMzcHh9LmJhYy0tYXBwcy1jb250YWluZXIgLmJhYy0tYXBwczpsYXN0LWNoaWxke21hcmdpbi1ib3R0b206MH0uYmFjLS1hcHBzLWNvbnRhaW5lciAuYmFjLS1hcHBzOmhvdmVye2JhY2tncm91bmQ6I2YzZjNmM30uYmFjLS1hcHBzLWNvbnRhaW5lciAuYmFjLS1hcHBzIGEuYmFjLS1pbWFnZS1saW5re2Rpc3BsYXk6aW5saW5lLWJsb2NrO2NvbG9yOiNmZmY7dGV4dC1kZWNvcmF0aW9uOm5vbmU7d2lkdGg6MzNweDtoZWlnaHQ6MzNweH0uYmFjLS1hcHBzLWNvbnRhaW5lciAuYmFjLS1hcHBzIGEuYmFjLS1pbWFnZS1saW5rIGltZ3t3aWR0aDoxMDAlO2hlaWdodDoxMDAlfS5iYWMtLWFwcHMtY29udGFpbmVyIC5iYWMtLWFwcHMgLmJhYy0tcHVyZXNkay1hcHAtdGV4dC1jb250YWluZXJ7ZGlzcGxheTppbmxpbmUtYmxvY2s7cG9zaXRpb246cmVsYXRpdmU7bGVmdDotOXB4O3dpZHRoOmNhbGMoMTAwJSAtIDQycHgpfS5iYWMtLWFwcHMtY29udGFpbmVyIC5iYWMtLWFwcHMgLmJhYy0tcHVyZXNkay1hcHAtdGV4dC1jb250YWluZXIgYXtkaXNwbGF5OmJsb2NrO3RleHQtZGVjb3JhdGlvbjpub25lO2N1cnNvcjpwb2ludGVyO3BhZGRpbmctbGVmdDo4cHh9LmJhYy0tYXBwcy1jb250YWluZXIgLmJhYy0tYXBwcyAuYmFjLS1wdXJlc2RrLWFwcC10ZXh0LWNvbnRhaW5lciAuYmFjLS1hcHAtbmFtZXt3aWR0aDoxMDAlO2NvbG9yOiMwMDA7Zm9udC1zaXplOjEzcHg7cGFkZGluZy1ib3R0b206NHB4fS5iYWMtLWFwcHMtY29udGFpbmVyIC5iYWMtLWFwcHMgLmJhYy0tcHVyZXNkay1hcHAtdGV4dC1jb250YWluZXIgLmJhYy0tYXBwLWRlc2NyaXB0aW9ue2NvbG9yOiM5MTkxOTE7Zm9udC1zaXplOjExcHg7Zm9udC1zdHlsZTppdGFsaWM7bGluZS1oZWlnaHQ6MS4zZW07cG9zaXRpb246cmVsYXRpdmU7dG9wOi0ycHg7b3ZlcmZsb3c6aGlkZGVuO3doaXRlLXNwYWNlOm5vd3JhcDt0ZXh0LW92ZXJmbG93OmVsbGlwc2lzfS5iYWMtLXVzZXItc2lkZWJhcntmb250LWZhbWlseTpcIlZlcmRhbmFcIiwgYXJpYWwsIHNhbnMtc2VyaWY7Y29sb3I6d2hpdGU7aGVpZ2h0OmNhbGMoMTAwdmggLSA1MHB4KTtiYWNrZ3JvdW5kLWNvbG9yOiM1MTVmNzc7Ym94LXNpemluZzpib3JkZXItYm94O3dpZHRoOjMyMHB4O3Bvc2l0aW9uOmZpeGVkO3RvcDo1MHB4O3JpZ2h0OjA7ei1pbmRleDo5OTk5OTk7cGFkZGluZy10b3A6MTBweDtvcGFjaXR5OjA7dHJhbnNmb3JtOnRyYW5zbGF0ZVgoMTAwJSk7dHJhbnNpdGlvbjphbGwgMC40cyBlYXNlfS5iYWMtLXVzZXItc2lkZWJhci5hY3RpdmV7b3BhY2l0eToxO3RyYW5zZm9ybTp0cmFuc2xhdGVYKDAlKTstd2Via2l0LWJveC1zaGFkb3c6LTFweCAwcHggMTJweCAwcHggcmdiYSgwLDAsMCwwLjc1KTstbW96LWJveC1zaGFkb3c6LTFweCAzcHggMTJweCAwcHggcmdiYSgwLDAsMCwwLjc1KTtib3gtc2hhZG93Oi0xcHggMHB4IDEycHggMHB4IHJnYmEoMCwwLDAsMC43NSl9LmJhYy0tdXNlci1zaWRlYmFyIC5iYWMtLXVzZXItbGlzdC1pdGVte2Rpc3BsYXk6ZmxleDtwb3NpdGlvbjpyZWxhdGl2ZTtjdXJzb3I6cG9pbnRlcjthbGlnbi1pdGVtczpjZW50ZXI7cGFkZGluZzoxMHB4IDEwcHggMTBweCA0MHB4O2JvcmRlci1ib3R0b206MXB4IHNvbGlkIHJnYmEoMjU1LDI1NSwyNTUsMC4xKX0uYmFjLS11c2VyLXNpZGViYXIgLmJhYy0tdXNlci1saXN0LWl0ZW06aG92ZXJ7YmFja2dyb3VuZC1jb2xvcjpyZ2JhKDI1NSwyNTUsMjU1LDAuMSl9LmJhYy0tdXNlci1zaWRlYmFyIC5iYWMtLXVzZXItbGlzdC1pdGVtIC5iYWMtLXNlbGVjdGVkLWFjb3VudC1pbmRpY2F0b3J7cG9zaXRpb246YWJzb2x1dGU7cmlnaHQ6MDtoZWlnaHQ6MTAwJTt3aWR0aDo4cHh9LmJhYy0tdXNlci1zaWRlYmFyIC5iYWMtLXVzZXItbGlzdC1pdGVtIC5iYWMtLXVzZXItbGlzdC1pdGVtLWltYWdle3dpZHRoOjQwcHg7aGVpZ2h0OjQwcHg7Ym9yZGVyLXJhZGl1czozcHg7Ym9yZGVyOjJweCBzb2xpZCAjZmZmO21hcmdpbi1yaWdodDoyMHB4O2Rpc3BsYXk6ZmxleDthbGlnbi1pdGVtczpjZW50ZXI7anVzdGlmeS1jb250ZW50OmNlbnRlcn0uYmFjLS11c2VyLXNpZGViYXIgLmJhYy0tdXNlci1saXN0LWl0ZW0gLmJhYy0tdXNlci1saXN0LWl0ZW0taW1hZ2U+aW1ne3dpZHRoOmF1dG87aGVpZ2h0OmF1dG87bWF4LXdpZHRoOjEwMCU7bWF4LWhlaWdodDoxMDAlfS5iYWMtLXVzZXItc2lkZWJhciAuYmFjLS11c2VyLWxpc3QtaXRlbSBzcGFue3dpZHRoOjEwMCU7ZGlzcGxheTpibG9jazttYXJnaW4tYm90dG9tOjVweH0uYmFjLS11c2VyLXNpZGViYXIgLmJhYy11c2VyLWFwcC1kZXRhaWxzIHNwYW57Zm9udC1zaXplOjEycHh9LmJhYy0tdXNlci1zaWRlYmFyIC5wdXJlc2RrLXZlcnNpb24tbnVtYmVye3dpZHRoOjEwMCU7dGV4dC1hbGlnbjpyaWdodDtwYWRkaW5nLXJpZ2h0OjEwcHg7cG9zaXRpb246YWJzb2x1dGU7Zm9udC1zaXplOjhweDtvcGFjaXR5OjAuNTtyaWdodDowO2JvdHRvbTowfS5iYWMtLXVzZXItc2lkZWJhci1pbmZve2Rpc3BsYXk6ZmxleDtqdXN0aWZ5LWNvbnRlbnQ6Y2VudGVyO2ZsZXgtd3JhcDp3cmFwO3RleHQtYWxpZ246Y2VudGVyO3BhZGRpbmc6MTBweCAyMHB4IDE1cHh9LmJhYy0tdXNlci1zaWRlYmFyLWluZm8gLmJhYy0tdXNlci1pbWFnZXtib3JkZXI6MXB4ICNhZGFkYWQgc29saWQ7b3ZlcmZsb3c6aGlkZGVuO2JvcmRlci1yYWRpdXM6NTAlO3Bvc2l0aW9uOnJlbGF0aXZlO2N1cnNvcjpwb2ludGVyO2Rpc3BsYXk6aW5saW5lLWJsb2NrO2hlaWdodDo4MHB4O3dpZHRoOjgwcHg7bGluZS1oZWlnaHQ6ODBweDt0ZXh0LWFsaWduOmNlbnRlcjtjb2xvcjojZmZmO2JvcmRlci1yYWRpdXM6NTAlO2JhY2tncm91bmQtY29sb3I6I2FkYWRhZDttYXJnaW4tYm90dG9tOjE1cHh9LmJhYy0tdXNlci1zaWRlYmFyLWluZm8gLmJhYy0tdXNlci1pbWFnZSAjYmFjLS11c2VyLWltYWdlLWZpbGV7ZGlzcGxheTpub25lO3Bvc2l0aW9uOmFic29sdXRlO3otaW5kZXg6MTt0b3A6MDtsZWZ0OjA7d2lkdGg6MTAwJTtoZWlnaHQ6MTAwJX0uYmFjLS11c2VyLXNpZGViYXItaW5mbyAuYmFjLS11c2VyLWltYWdlICNiYWMtLXVzZXItaW1hZ2UtZmlsZSBpbWd7d2lkdGg6MTAwJTtoZWlnaHQ6MTAwJX0uYmFjLS11c2VyLXNpZGViYXItaW5mbyAuYmFjLS11c2VyLWltYWdlICNiYWMtLXVzZXItaW1hZ2UtZmlsZS5iYWMtLXB1cmVzZGstdmlzaWJsZXtkaXNwbGF5OmJsb2NrfS5iYWMtLXVzZXItc2lkZWJhci1pbmZvIC5iYWMtLXVzZXItaW1hZ2UgI2JhYy0tdXNlci1pbWFnZS11cGxvYWQtcHJvZ3Jlc3N7cG9zaXRpb246YWJzb2x1dGU7cGFkZGluZy10b3A6MTBweDt0b3A6MDtiYWNrZ3JvdW5kOiM2NjY7ei1pbmRleDo0O2Rpc3BsYXk6bm9uZTt3aWR0aDoxMDAlO2hlaWdodDoxMDAlfS5iYWMtLXVzZXItc2lkZWJhci1pbmZvIC5iYWMtLXVzZXItaW1hZ2UgI2JhYy0tdXNlci1pbWFnZS11cGxvYWQtcHJvZ3Jlc3MuYmFjLS1wdXJlc2RrLXZpc2libGV7ZGlzcGxheTpibG9ja30uYmFjLS11c2VyLXNpZGViYXItaW5mbyAuYmFjLS11c2VyLWltYWdlIGl7Zm9udC1zaXplOjMycHg7Zm9udC1zaXplOjMycHg7ei1pbmRleDowO3Bvc2l0aW9uOmFic29sdXRlO3dpZHRoOjEwMCU7bGVmdDowO2JhY2tncm91bmQtY29sb3I6cmdiYSgwLDAsMCwwLjUpfS5iYWMtLXVzZXItc2lkZWJhci1pbmZvIC5iYWMtLXVzZXItaW1hZ2U6aG92ZXIgaXt6LWluZGV4OjN9LmJhYy0tdXNlci1zaWRlYmFyLWluZm8gLmJhYy0tdXNlci1uYW1le3dpZHRoOjEwMCU7dGV4dC1hbGlnbjpjZW50ZXI7Zm9udC1zaXplOjE4cHg7bWFyZ2luLWJvdHRvbToxMHB4fS5iYWMtLXVzZXItc2lkZWJhci1pbmZvIC5iYWMtLXVzZXItZW1haWx7Zm9udC1zaXplOjEycHg7Zm9udC13ZWlnaHQ6MzAwfS5iYWMtLXVzZXItYWNjb3VudC1zZXR0aW5nc3twb3NpdGlvbjphYnNvbHV0ZTtib3R0b206MTBweDtsZWZ0OjIwcHg7d2lkdGg6OTAlO2hlaWdodDo1MHB4fS5iYWMtLXVzZXItYWNjb3VudC1zZXR0aW5ncyAuYmFjLXVzZXItYWNvdW50LWxpc3QtaXRlbXtkaXNwbGF5OmZsZXg7YWxpZ24taXRlbXM6Y2VudGVyO21hcmdpbi1ib3R0b206MzBweDtwb3NpdGlvbjphYnNvbHV0ZX0uYmFjLS11c2VyLWFjY291bnQtc2V0dGluZ3MgLmJhYy11c2VyLWFjb3VudC1saXN0LWl0ZW0gYXt0ZXh0LWRlY29yYXRpb246bm9uZTtjb2xvcjojZmZmfS5iYWMtLXVzZXItYWNjb3VudC1zZXR0aW5ncyAuYmFjLXVzZXItYWNvdW50LWxpc3QtaXRlbSBpe2ZvbnQtc2l6ZToyNHB4O21hcmdpbi1yaWdodDoyMHB4fSNiYWMtLXB1cmVzZGstYWNjb3VudC1sb2dvLS17Y3Vyc29yOnBvaW50ZXI7cG9zaXRpb246cmVsYXRpdmU7Y29sb3I6I2ZmZn0jYmFjLS1wdXJlc2RrLWFjY291bnQtbG9nby0tIGltZ3toZWlnaHQ6MjhweH0jYmFjLS1pbmZvLWJsb2Nrcy13cmFwcGVyLS17cG9zaXRpb246Zml4ZWQ7dG9wOjBweDtoZWlnaHQ6YXV0b30jYmFjLS1pbmZvLWJsb2Nrcy13cmFwcGVyLS0gLmJhYy0tcHVyZXNkay1pbmZvLWJveC0te2JvcmRlci1yYWRpdXM6MCAwIDNweCAzcHg7b3ZlcmZsb3c6aGlkZGVuO3otaW5kZXg6OTk5OTk5OTk7cG9zaXRpb246cmVsYXRpdmU7bWFyZ2luLXRvcDowO3dpZHRoOjQ3MHB4O2xlZnQ6Y2FsYyg1MHZ3IC0gMjM1cHgpO2hlaWdodDowcHg7LXdlYmtpdC10cmFuc2l0aW9uOnRvcCAwLjRzO3RyYW5zaXRpb246YWxsIDAuNHN9I2JhYy0taW5mby1ibG9ja3Mtd3JhcHBlci0tIC5iYWMtLXB1cmVzZGstaW5mby1ib3gtLS5iYWMtLXN1Y2Nlc3N7YmFja2dyb3VuZDojMTREQTlFfSNiYWMtLWluZm8tYmxvY2tzLXdyYXBwZXItLSAuYmFjLS1wdXJlc2RrLWluZm8tYm94LS0uYmFjLS1zdWNjZXNzIC5iYWMtLWlubmVyLWluZm8tYm94LS0gZGl2LmJhYy0taW5mby1pY29uLS0uZmEtc3VjY2Vzc3tkaXNwbGF5OmlubGluZS1ibG9ja30jYmFjLS1pbmZvLWJsb2Nrcy13cmFwcGVyLS0gLmJhYy0tcHVyZXNkay1pbmZvLWJveC0tLmJhYy0taW5mb3tiYWNrZ3JvdW5kLWNvbG9yOiM1QkMwREV9I2JhYy0taW5mby1ibG9ja3Mtd3JhcHBlci0tIC5iYWMtLXB1cmVzZGstaW5mby1ib3gtLS5iYWMtLWluZm8gLmJhYy0taW5uZXItaW5mby1ib3gtLSBkaXYuYmFjLS1pbmZvLWljb24tLS5mYS1pbmZvLTF7ZGlzcGxheTppbmxpbmUtYmxvY2t9I2JhYy0taW5mby1ibG9ja3Mtd3JhcHBlci0tIC5iYWMtLXB1cmVzZGstaW5mby1ib3gtLS5iYWMtLXdhcm5pbmd7YmFja2dyb3VuZDojRjBBRDRFfSNiYWMtLWluZm8tYmxvY2tzLXdyYXBwZXItLSAuYmFjLS1wdXJlc2RrLWluZm8tYm94LS0uYmFjLS13YXJuaW5nIC5iYWMtLWlubmVyLWluZm8tYm94LS0gZGl2LmJhYy0taW5mby1pY29uLS0uZmEtd2FybmluZ3tkaXNwbGF5OmlubGluZS1ibG9ja30jYmFjLS1pbmZvLWJsb2Nrcy13cmFwcGVyLS0gLmJhYy0tcHVyZXNkay1pbmZvLWJveC0tLmJhYy0tZXJyb3J7YmFja2dyb3VuZDojRUY0MTAwfSNiYWMtLWluZm8tYmxvY2tzLXdyYXBwZXItLSAuYmFjLS1wdXJlc2RrLWluZm8tYm94LS0uYmFjLS1lcnJvciAuYmFjLS1pbm5lci1pbmZvLWJveC0tIGRpdi5iYWMtLWluZm8taWNvbi0tLmZhLWVycm9ye2Rpc3BsYXk6aW5saW5lLWJsb2NrfSNiYWMtLWluZm8tYmxvY2tzLXdyYXBwZXItLSAuYmFjLS1wdXJlc2RrLWluZm8tYm94LS0gLmJhYy0tdGltZXJ7LXdlYmtpdC10cmFuc2l0aW9uLXRpbWluZy1mdW5jdGlvbjpsaW5lYXI7dHJhbnNpdGlvbi10aW1pbmctZnVuY3Rpb246bGluZWFyO3Bvc2l0aW9uOmFic29sdXRlO2JvdHRvbTowcHg7b3BhY2l0eTowLjU7aGVpZ2h0OjJweCAhaW1wb3J0YW50O2JhY2tncm91bmQ6d2hpdGU7d2lkdGg6MCV9I2JhYy0taW5mby1ibG9ja3Mtd3JhcHBlci0tIC5iYWMtLXB1cmVzZGstaW5mby1ib3gtLSAuYmFjLS10aW1lci5iYWMtLWZ1bGx3aWR0aHt3aWR0aDoxMDAlfSNiYWMtLWluZm8tYmxvY2tzLXdyYXBwZXItLSAuYmFjLS1wdXJlc2RrLWluZm8tYm94LS0uYmFjLS1hY3RpdmUtLXtoZWlnaHQ6YXV0bzttYXJnaW4tdG9wOjVweH0jYmFjLS1pbmZvLWJsb2Nrcy13cmFwcGVyLS0gLmJhYy0tcHVyZXNkay1pbmZvLWJveC0tIC5iYWMtLWlubmVyLWluZm8tYm94LS17d2lkdGg6MTAwJTtwYWRkaW5nOjExcHggMTVweDtjb2xvcjp3aGl0ZX0jYmFjLS1pbmZvLWJsb2Nrcy13cmFwcGVyLS0gLmJhYy0tcHVyZXNkay1pbmZvLWJveC0tIC5iYWMtLWlubmVyLWluZm8tYm94LS0gZGl2e2Rpc3BsYXk6aW5saW5lLWJsb2NrO2hlaWdodDoxOHB4O3Bvc2l0aW9uOnJlbGF0aXZlfSNiYWMtLWluZm8tYmxvY2tzLXdyYXBwZXItLSAuYmFjLS1wdXJlc2RrLWluZm8tYm94LS0gLmJhYy0taW5uZXItaW5mby1ib3gtLSBkaXYuYmFjLS1pbmZvLWljb24tLXtkaXNwbGF5Om5vbmU7dG9wOjBweH0jYmFjLS1pbmZvLWJsb2Nrcy13cmFwcGVyLS0gLmJhYy0tcHVyZXNkay1pbmZvLWJveC0tIC5iYWMtLWlubmVyLWluZm8tYm94LS0gLmJhYy0taW5mby1pY29uLS17bWFyZ2luLXJpZ2h0OjE1cHg7d2lkdGg6MTBweDt0b3A6MnB4fSNiYWMtLWluZm8tYmxvY2tzLXdyYXBwZXItLSAuYmFjLS1wdXJlc2RrLWluZm8tYm94LS0gLmJhYy0taW5uZXItaW5mby1ib3gtLSAuYmFjLS1pbmZvLW1haW4tdGV4dC0te3dpZHRoOjM4MHB4O21hcmdpbi1yaWdodDoxNXB4O2ZvbnQtc2l6ZToxMnB4O3RleHQtYWxpZ246Y2VudGVyfSNiYWMtLWluZm8tYmxvY2tzLXdyYXBwZXItLSAuYmFjLS1wdXJlc2RrLWluZm8tYm94LS0gLmJhYy0taW5uZXItaW5mby1ib3gtLSAuYmFjLS1pbmZvLWNsb3NlLWJ1dHRvbi0te3dpZHRoOjEwcHg7Y3Vyc29yOnBvaW50ZXI7dG9wOjJweH0uYmFjLS1jdXN0b20tbW9kYWx7cG9zaXRpb246Zml4ZWQ7d2lkdGg6NzAlO2hlaWdodDo4MCU7bWluLXdpZHRoOjQwMHB4O2xlZnQ6MDtyaWdodDowO3RvcDowO2JvdHRvbTowO21hcmdpbjphdXRvO2JvcmRlcjoxcHggc29saWQgIzk3OTc5Nztib3JkZXItcmFkaXVzOjVweDtib3gtc2hhZG93OjAgMCA3MXB4IDAgIzJGMzg0OTtiYWNrZ3JvdW5kOiNmZmY7ei1pbmRleDo5OTk7b3ZlcmZsb3c6YXV0bztkaXNwbGF5Om5vbmV9LmJhYy0tY3VzdG9tLW1vZGFsLmlzLW9wZW57ZGlzcGxheTpibG9ja30uYmFjLS1jdXN0b20tbW9kYWwgLmN1c3RvbS1tb2RhbF9fY2xvc2UtYnRue3RleHQtZGVjb3JhdGlvbjpub25lO3BhZGRpbmctdG9wOjJweDtsaW5lLWhlaWdodDoxOHB4O2hlaWdodDoyMHB4O3dpZHRoOjIwcHg7Ym9yZGVyLXJhZGl1czo1MCU7Y29sb3I6IzkwOWJhNDt0ZXh0LWFsaWduOmNlbnRlcjtwb3NpdGlvbjphYnNvbHV0ZTt0b3A6MjBweDtyaWdodDoyMHB4O2ZvbnQtc2l6ZToyMHB4fS5iYWMtLWN1c3RvbS1tb2RhbCAuY3VzdG9tLW1vZGFsX19jbG9zZS1idG46aG92ZXJ7dGV4dC1kZWNvcmF0aW9uOm5vbmU7Y29sb3I6IzQ1NTA2NjtjdXJzb3I6cG9pbnRlcn0uYmFjLS1jdXN0b20tbW9kYWwgLmN1c3RvbS1tb2RhbF9fd3JhcHBlcntoZWlnaHQ6MTAwJTtkaXNwbGF5OmZsZXg7ZmxleC1kaXJlY3Rpb246Y29sdW1ufS5iYWMtLWN1c3RvbS1tb2RhbCAuY3VzdG9tLW1vZGFsX193cmFwcGVyIGlmcmFtZXt3aWR0aDoxMDAlO2hlaWdodDoxMDAlfS5iYWMtLWN1c3RvbS1tb2RhbCAuY3VzdG9tLW1vZGFsX19jb250ZW50LXdyYXBwZXJ7aGVpZ2h0OjEwMCU7b3ZlcmZsb3c6YXV0bzttYXJnaW4tYm90dG9tOjEwNHB4O2JvcmRlci10b3A6MnB4IHNvbGlkICNDOUNERDd9LmJhYy0tY3VzdG9tLW1vZGFsIC5jdXN0b20tbW9kYWxfX2NvbnRlbnQtd3JhcHBlci5uby1tYXJnaW57bWFyZ2luLWJvdHRvbTowfS5iYWMtLWN1c3RvbS1tb2RhbCAuY3VzdG9tLW1vZGFsX19jb250ZW50e3BhZGRpbmc6MjBweDtwb3NpdGlvbjpyZWxhdGl2ZX0uYmFjLS1jdXN0b20tbW9kYWwgLmN1c3RvbS1tb2RhbF9fY29udGVudCBoM3tjb2xvcjojMkYzODQ5O2ZvbnQtc2l6ZToyMHB4O2ZvbnQtd2VpZ2h0OjYwMDtsaW5lLWhlaWdodDoyN3B4fS5iYWMtLWN1c3RvbS1tb2RhbCAuY3VzdG9tLW1vZGFsX19zYXZle3Bvc2l0aW9uOmFic29sdXRlO3JpZ2h0OjA7Ym90dG9tOjA7d2lkdGg6MTAwJTtwYWRkaW5nOjMwcHggMzJweDtiYWNrZ3JvdW5kLWNvbG9yOiNGMkYyRjR9LmJhYy0tY3VzdG9tLW1vZGFsIC5jdXN0b20tbW9kYWxfX3NhdmUgYSwuYmFjLS1jdXN0b20tbW9kYWwgLmN1c3RvbS1tb2RhbF9fc2F2ZSBidXR0b257Zm9udC1zaXplOjE0cHg7bGluZS1oZWlnaHQ6MjJweDtoZWlnaHQ6NDRweDt3aWR0aDoxMDAlfS5iYWMtLWN1c3RvbS1tb2RhbCAuY3VzdG9tLW1vZGFsX19zcGxpdHRlcntoZWlnaHQ6MzBweDtsaW5lLWhlaWdodDozMHB4O3BhZGRpbmc6MCAyMHB4O2JvcmRlci1jb2xvcjojRDNEM0QzO2JvcmRlci1zdHlsZTpzb2xpZDtib3JkZXItd2lkdGg6MXB4IDAgMXB4IDA7YmFja2dyb3VuZC1jb2xvcjojRjBGMEYwO2NvbG9yOiM2NzZGODI7Zm9udC1zaXplOjEzcHg7Zm9udC13ZWlnaHQ6NjAwfS5iYWMtLWN1c3RvbS1tb2RhbCAuY3VzdG9tLW1vZGFsX19ib3h7ZGlzcGxheTppbmxpbmUtYmxvY2s7dmVydGljYWwtYWxpZ246bWlkZGxlO2hlaWdodDoxNjVweDt3aWR0aDoxNjVweDtib3JkZXI6MnB4IHNvbGlkIHJlZDtib3JkZXItcmFkaXVzOjVweDt0ZXh0LWFsaWduOmNlbnRlcjtmb250LXNpemU6MTJweDtmb250LXdlaWdodDo2MDA7Y29sb3I6IzkwOTdBODt0ZXh0LWRlY29yYXRpb246bm9uZTttYXJnaW46MTBweCAyMHB4IDEwcHggMDt0cmFuc2l0aW9uOjAuMXMgYWxsfS5iYWMtLWN1c3RvbS1tb2RhbCAuY3VzdG9tLW1vZGFsX19ib3ggaXtmb250LXNpemU6NzBweDtkaXNwbGF5OmJsb2NrO21hcmdpbjoyNXB4IDB9LmJhYy0tY3VzdG9tLW1vZGFsIC5jdXN0b20tbW9kYWxfX2JveC5hY3RpdmV7Y29sb3I6eWVsbG93O2JvcmRlci1jb2xvcjp5ZWxsb3c7dGV4dC1kZWNvcmF0aW9uOm5vbmV9LmJhYy0tY3VzdG9tLW1vZGFsIC5jdXN0b20tbW9kYWxfX2JveDpob3ZlciwuYmFjLS1jdXN0b20tbW9kYWwgLmN1c3RvbS1tb2RhbF9fYm94OmFjdGl2ZSwuYmFjLS1jdXN0b20tbW9kYWwgLmN1c3RvbS1tb2RhbF9fYm94OmZvY3Vze2NvbG9yOiMxQUMwQjQ7Ym9yZGVyLWNvbG9yOnllbGxvdzt0ZXh0LWRlY29yYXRpb246bm9uZX0uY2xvdWQtaW1hZ2VzX19jb250YWluZXJ7ZGlzcGxheTpmbGV4O2ZsZXgtd3JhcDp3cmFwO2p1c3RpZnktY29udGVudDpmbGV4LXN0YXJ0fS5jbG91ZC1pbWFnZXNfX3BhZ2luYXRpb257cGFkZGluZzoyMHB4fS5jbG91ZC1pbWFnZXNfX3BhZ2luYXRpb24gbGl7ZGlzcGxheTppbmxpbmUtYmxvY2s7bWFyZ2luLXJpZ2h0OjEwcHh9LmNsb3VkLWltYWdlc19fcGFnaW5hdGlvbiBsaSBhe2NvbG9yOiNmZmY7YmFja2dyb3VuZC1jb2xvcjojNWU2Nzc2O2JvcmRlci1yYWRpdXM6MjBweDt0ZXh0LWRlY29yYXRpb246bm9uZTtkaXNwbGF5OmJsb2NrO2ZvbnQtd2VpZ2h0OjIwMDtoZWlnaHQ6MzVweDt3aWR0aDozNXB4O2xpbmUtaGVpZ2h0OjM1cHg7dGV4dC1hbGlnbjpjZW50ZXJ9LmNsb3VkLWltYWdlc19fcGFnaW5hdGlvbiBsaS5hY3RpdmUgYXtiYWNrZ3JvdW5kLWNvbG9yOiMyZjM4NDl9LmNsb3VkLWltYWdlc19faXRlbXt3aWR0aDoxNTVweDtoZWlnaHQ6MTcwcHg7Ym9yZGVyOjFweCBzb2xpZCAjZWVlO2JhY2tncm91bmQtY29sb3I6I2ZmZjtib3JkZXItcmFkaXVzOjNweDttYXJnaW46MCAxNXB4IDE1cHggMDt0ZXh0LWFsaWduOmNlbnRlcjtwb3NpdGlvbjpyZWxhdGl2ZTtjdXJzb3I6cG9pbnRlcn0uY2xvdWQtaW1hZ2VzX19pdGVtIC5jbG91ZC1pbWFnZXNfX2l0ZW1fX3R5cGV7aGVpZ2h0OjExNXB4O2ZvbnQtc2l6ZTo5MHB4O2xpbmUtaGVpZ2h0OjE0MHB4O2JvcmRlci10b3AtbGVmdC1yYWRpdXM6M3B4O2JvcmRlci10b3AtcmlnaHQtcmFkaXVzOjNweDtjb2xvcjojYTJhMmEyO2JhY2tncm91bmQtY29sb3I6I2U5ZWFlYn0uY2xvdWQtaW1hZ2VzX19pdGVtIC5jbG91ZC1pbWFnZXNfX2l0ZW1fX3R5cGU+aW1ne3dpZHRoOmF1dG87aGVpZ2h0OmF1dG87bWF4LXdpZHRoOjEwMCU7bWF4LWhlaWdodDoxMDAlfS5jbG91ZC1pbWFnZXNfX2l0ZW0gLmNsb3VkLWltYWdlc19faXRlbV9fZGV0YWlsc3twYWRkaW5nOjEwcHggMH0uY2xvdWQtaW1hZ2VzX19pdGVtIC5jbG91ZC1pbWFnZXNfX2l0ZW1fX2RldGFpbHMgLmNsb3VkLWltYWdlc19faXRlbV9fZGV0YWlsc19fbmFtZXtmb250LXNpemU6MTJweDtvdXRsaW5lOm5vbmU7cGFkZGluZzowIDEwcHg7Y29sb3I6I2E1YWJiNTtib3JkZXI6bm9uZTt3aWR0aDoxMDAlO2JhY2tncm91bmQtY29sb3I6dHJhbnNwYXJlbnQ7aGVpZ2h0OjE1cHg7ZGlzcGxheTppbmxpbmUtYmxvY2s7d29yZC1icmVhazpicmVhay1hbGx9LmNsb3VkLWltYWdlc19faXRlbSAuY2xvdWQtaW1hZ2VzX19pdGVtX19kZXRhaWxzIC5jbG91ZC1pbWFnZXNfX2l0ZW1fX2RldGFpbHNfX2RhdGV7Zm9udC1zaXplOjEwcHg7Ym90dG9tOjZweDt3aWR0aDoxNTVweDtoZWlnaHQ6MTVweDtjb2xvcjojYTVhYmI1O2Rpc3BsYXk6aW5saW5lLWJsb2NrfS5jbG91ZC1pbWFnZXNfX2l0ZW0gLmNsb3VkLWltYWdlc19faXRlbV9fYWN0aW9uc3tkaXNwbGF5OmZsZXg7YWxpZ24taXRlbXM6Y2VudGVyO2p1c3RpZnktY29udGVudDpjZW50ZXI7cG9zaXRpb246YWJzb2x1dGU7dG9wOjA7bGVmdDowO3dpZHRoOjEwMCU7aGVpZ2h0OjExNXB4O2JhY2tncm91bmQtY29sb3I6cmdiYSg3OCw4Myw5MSwwLjgzKTtvcGFjaXR5OjA7dmlzaWJpbGl0eTpoaWRkZW47Ym9yZGVyLXRvcC1sZWZ0LXJhZGl1czozcHg7Ym9yZGVyLXRvcC1yaWdodC1yYWRpdXM6M3B4O3RleHQtYWxpZ246Y2VudGVyO3RyYW5zaXRpb246MC4zcyBvcGFjaXR5fS5jbG91ZC1pbWFnZXNfX2l0ZW0gLmNsb3VkLWltYWdlc19faXRlbV9fYWN0aW9ucyBhe2ZvbnQtc2l6ZToxNnB4O2NvbG9yOiNmZmY7dGV4dC1kZWNvcmF0aW9uOm5vbmV9LmNsb3VkLWltYWdlc19faXRlbTpob3ZlciAuY2xvdWQtaW1hZ2VzX19pdGVtIC5jbG91ZC1pbWFnZXNfX2l0ZW1fX2FjdGlvbnN7b3BhY2l0eToxO3Zpc2liaWxpdHk6dmlzaWJsZX0nLFxuICAgIGhlYWQgPSBkb2N1bWVudC5oZWFkIHx8IGRvY3VtZW50LmdldEVsZW1lbnRzQnlUYWdOYW1lKCdoZWFkJylbMF0sXG4gICAgc3R5bGUgPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KCdzdHlsZScpO1xuXG5zdHlsZS50eXBlID0gJ3RleHQvY3NzJztcbmlmIChzdHlsZS5zdHlsZVNoZWV0KSB7XG4gICAgc3R5bGUuc3R5bGVTaGVldC5jc3NUZXh0ID0gY3NzO1xufSBlbHNlIHtcbiAgICBzdHlsZS5hcHBlbmRDaGlsZChkb2N1bWVudC5jcmVhdGVUZXh0Tm9kZShjc3MpKTtcbn1cbmhlYWQuYXBwZW5kQ2hpbGQoc3R5bGUpO1xuXG52YXIgbGluayA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoJ2xpbmsnKTtcbmxpbmsuaHJlZiA9ICdodHRwczovL2FjY2Vzcy1mb250cy5wdXJlcHJvZmlsZS5jb20vc3R5bGVzLmNzcyc7XG5saW5rLnJlbCA9ICdzdHlsZXNoZWV0JztcblxuZG9jdW1lbnQuZ2V0RWxlbWVudHNCeVRhZ05hbWUoJ2hlYWQnKVswXS5hcHBlbmRDaGlsZChsaW5rKTtcblxubW9kdWxlLmV4cG9ydHMgPSBwcGJhOyIsInZhciBTdG9yZSA9IHJlcXVpcmUoJy4vc3RvcmUnKTtcbnZhciBMb2dnZXIgPSByZXF1aXJlKCcuL2xvZ2dlcicpO1xudmFyIERvbSA9IHJlcXVpcmUoJy4vZG9tJyk7XG52YXIgQ2FsbGVyID0gcmVxdWlyZSgnLi9jYWxsZXInKTtcblxudmFyIHVwbG9hZGluZyA9IGZhbHNlO1xuXG52YXIgQXZhdGFyQ3RybCA9IHtcblx0X3N1Ym1pdDogbnVsbCxcblx0X2ZpbGU6IG51bGwsXG5cdF9wcm9ncmVzczogbnVsbCxcblx0X3NpZGViYXJfYXZhdGFyOiBudWxsLFxuXHRfdG9wX2F2YXRhcjogbnVsbCxcblx0X3RvcF9hdmF0YXJfY29udGFpbmVyOiBudWxsLFxuXG5cdGluaXQ6IGZ1bmN0aW9uIGluaXQoKSB7XG5cdFx0QXZhdGFyQ3RybC5fc3VibWl0ID0gZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoJ2JhYy0tLXB1cmVzZGstYXZhdGFyLXN1Ym1pdCcpO1xuXHRcdEF2YXRhckN0cmwuX2ZpbGUgPSBkb2N1bWVudC5nZXRFbGVtZW50QnlJZCgnYmFjLS0tcHVyZXNkay1hdmF0YXItZmlsZScpO1xuXHRcdEF2YXRhckN0cmwuX3RvcF9hdmF0YXJfY29udGFpbmVyID0gZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoJ2JhYy0taW1hZ2UtY29udGFpbmVyLXRvcCcpO1xuXHRcdEF2YXRhckN0cmwuX3Byb2dyZXNzID0gZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoJ2JhYy0tdXNlci1pbWFnZS11cGxvYWQtcHJvZ3Jlc3MnKTtcblx0XHRBdmF0YXJDdHJsLl9zaWRlYmFyX2F2YXRhciA9IGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKCdiYWMtLXVzZXItaW1hZ2UtZmlsZScpO1xuXHRcdEF2YXRhckN0cmwuX3RvcF9hdmF0YXIgPSBkb2N1bWVudC5nZXRFbGVtZW50QnlJZCgnYmFjLS11c2VyLWF2YXRhci10b3AnKTtcblx0XHRBdmF0YXJDdHJsLl9maWxlLmFkZEV2ZW50TGlzdGVuZXIoJ2NsaWNrJywgZnVuY3Rpb24gKGUpIHtcblx0XHRcdGUuc3RvcFByb3BhZ2F0aW9uKCk7XG5cdFx0fSk7XG5cdFx0QXZhdGFyQ3RybC5fZmlsZS5hZGRFdmVudExpc3RlbmVyKCdjaGFuZ2UnLCBmdW5jdGlvbiAoZSkge1xuXHRcdFx0QXZhdGFyQ3RybC51cGxvYWQoKTtcblx0XHR9KTtcblxuXHRcdGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKCdiYWMtLXVzZXItaW1hZ2UnKS5hZGRFdmVudExpc3RlbmVyKCdjbGljaycsIGZ1bmN0aW9uIChlKSB7XG5cdFx0XHRlLnN0b3BQcm9wYWdhdGlvbigpO1xuXHRcdFx0QXZhdGFyQ3RybC5fZmlsZS5jbGljaygpO1xuXHRcdH0pO1xuXHR9LFxuXG5cdHVwbG9hZDogZnVuY3Rpb24gdXBsb2FkKCkge1xuXHRcdGlmICh1cGxvYWRpbmcpIHtcblx0XHRcdHJldHVybjtcblx0XHR9XG5cdFx0dXBsb2FkaW5nID0gdHJ1ZTtcblxuXHRcdGlmIChBdmF0YXJDdHJsLl9maWxlLmZpbGVzLmxlbmd0aCA9PT0gMCkge1xuXHRcdFx0cmV0dXJuO1xuXHRcdH1cblxuXHRcdHZhciBkYXRhID0gbmV3IEZvcm1EYXRhKCk7XG5cdFx0ZGF0YS5hcHBlbmQoJ2ZpbGUnLCBBdmF0YXJDdHJsLl9maWxlLmZpbGVzWzBdKTtcblxuXHRcdHZhciBzdWNjZXNzQ2FsbGJhY2sgPSBmdW5jdGlvbiBzdWNjZXNzQ2FsbGJhY2soZGF0YSkge1xuXHRcdFx0O1xuXHRcdH07XG5cblx0XHR2YXIgZmFpbENhbGxiYWNrID0gZnVuY3Rpb24gZmFpbENhbGxiYWNrKGRhdGEpIHtcblx0XHRcdDtcblx0XHR9O1xuXG5cdFx0dmFyIHJlcXVlc3QgPSBuZXcgWE1MSHR0cFJlcXVlc3QoKTtcblx0XHRyZXF1ZXN0Lm9ucmVhZHlzdGF0ZWNoYW5nZSA9IGZ1bmN0aW9uICgpIHtcblx0XHRcdHVwbG9hZGluZyA9IGZhbHNlO1xuXHRcdFx0aWYgKHJlcXVlc3QucmVhZHlTdGF0ZSA9PSA0KSB7XG5cdFx0XHRcdHRyeSB7XG5cdFx0XHRcdFx0dmFyIGltYWdlRGF0YSA9IEpTT04ucGFyc2UocmVxdWVzdC5yZXNwb25zZSkuZGF0YTtcblx0XHRcdFx0XHRBdmF0YXJDdHJsLnNldEF2YXRhcihpbWFnZURhdGEudXJsKTtcblx0XHRcdFx0XHRDYWxsZXIubWFrZUNhbGwoe1xuXHRcdFx0XHRcdFx0dHlwZTogJ1BVVCcsXG5cdFx0XHRcdFx0XHRlbmRwb2ludDogU3RvcmUuZ2V0QXZhdGFyVXBkYXRlVXJsKCksXG5cdFx0XHRcdFx0XHRwYXJhbXM6IHtcblx0XHRcdFx0XHRcdFx0dXNlcjoge1xuXHRcdFx0XHRcdFx0XHRcdGF2YXRhcl91dWlkOiBpbWFnZURhdGEuZ3VpZFxuXHRcdFx0XHRcdFx0XHR9XG5cdFx0XHRcdFx0XHR9LFxuXHRcdFx0XHRcdFx0Y2FsbGJhY2tzOiB7XG5cdFx0XHRcdFx0XHRcdHN1Y2Nlc3M6IHN1Y2Nlc3NDYWxsYmFjayxcblx0XHRcdFx0XHRcdFx0ZmFpbDogZmFpbENhbGxiYWNrXG5cdFx0XHRcdFx0XHR9XG5cdFx0XHRcdFx0fSk7XG5cdFx0XHRcdH0gY2F0Y2ggKGUpIHtcblx0XHRcdFx0XHR2YXIgcmVzcCA9IHtcblx0XHRcdFx0XHRcdHN0YXR1czogJ2Vycm9yJyxcblx0XHRcdFx0XHRcdGRhdGE6ICdVbmtub3duIGVycm9yIG9jY3VycmVkOiBbJyArIHJlcXVlc3QucmVzcG9uc2VUZXh0ICsgJ10nXG5cdFx0XHRcdFx0fTtcblx0XHRcdFx0fVxuXHRcdFx0XHRMb2dnZXIubG9nKHJlcXVlc3QucmVzcG9uc2Uuc3RhdHVzICsgJzogJyArIHJlcXVlc3QucmVzcG9uc2UuZGF0YSk7XG5cdFx0XHR9XG5cdFx0fTtcblxuXHRcdC8vIHJlcXVlc3QudXBsb2FkLmFkZEV2ZW50TGlzdGVuZXIoJ3Byb2dyZXNzJywgZnVuY3Rpb24oZSl7XG5cdFx0Ly8gXHRMb2dnZXIubG9nKGUubG9hZGVkL2UudG90YWwpO1xuXHRcdC8vIFx0QXZhdGFyQ3RybC5fcHJvZ3Jlc3Muc3R5bGUudG9wID0gMTAwIC0gKGUubG9hZGVkL2UudG90YWwpICogMTAwICsgJyUnO1xuXHRcdC8vIH0sIGZhbHNlKTtcblxuXHRcdHZhciB1cmwgPSBTdG9yZS5nZXRBdmF0YXJVcGxvYWRVcmwoKTtcblx0XHREb20uYWRkQ2xhc3MoQXZhdGFyQ3RybC5fcHJvZ3Jlc3MsICdiYWMtLXB1cmVzZGstdmlzaWJsZScpO1xuXHRcdHJlcXVlc3Qub3BlbignUE9TVCcsIHVybCk7XG5cdFx0cmVxdWVzdC5zZW5kKGRhdGEpO1xuXHR9LFxuXG5cdHNldEF2YXRhcjogZnVuY3Rpb24gc2V0QXZhdGFyKHVybCkge1xuXHRcdGlmICghdXJsKSB7XG5cdFx0XHRyZXR1cm47XG5cdFx0fVxuXG5cdFx0RG9tLnJlbW92ZUNsYXNzKEF2YXRhckN0cmwuX3Byb2dyZXNzLCAnYmFjLS1wdXJlc2RrLXZpc2libGUnKTtcblx0XHREb20uYWRkQ2xhc3MoQXZhdGFyQ3RybC5fc2lkZWJhcl9hdmF0YXIsICdiYWMtLXB1cmVzZGstdmlzaWJsZScpO1xuXHRcdHZhciBpbWcgPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KCdpbWcnKTtcblx0XHRpbWcuc3JjID0gdXJsO1xuXHRcdEF2YXRhckN0cmwuX3NpZGViYXJfYXZhdGFyLmlubmVySFRNTCA9ICcnO1xuXHRcdEF2YXRhckN0cmwuX3NpZGViYXJfYXZhdGFyLmFwcGVuZENoaWxkKGltZyk7XG5cblx0XHREb20uYWRkQ2xhc3MoQXZhdGFyQ3RybC5fdG9wX2F2YXRhcl9jb250YWluZXIsICdiYWMtLXB1cmVzZGstdmlzaWJsZScpO1xuXHRcdHZhciBpbWdfMiA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoJ2ltZycpO1xuXHRcdGltZ18yLnNyYyA9IHVybDtcblx0XHRBdmF0YXJDdHJsLl90b3BfYXZhdGFyX2NvbnRhaW5lci5pbm5lckhUTUwgPSAnJztcblx0XHRBdmF0YXJDdHJsLl90b3BfYXZhdGFyX2NvbnRhaW5lci5hcHBlbmRDaGlsZChpbWdfMik7XG5cblx0XHQvLyAgYmFjLS1pbWFnZS1jb250YWluZXItdG9wXG5cdH1cbn07XG5cbm1vZHVsZS5leHBvcnRzID0gQXZhdGFyQ3RybDsiLCJ2YXIgU3RvcmUgPSByZXF1aXJlKCcuL3N0b3JlLmpzJyk7XG52YXIgTG9nZ2VyID0gcmVxdWlyZSgnLi9sb2dnZXInKTtcblxudmFyIHBhcmFtc1RvR2V0VmFycyA9IGZ1bmN0aW9uIHBhcmFtc1RvR2V0VmFycyhwYXJhbXMpIHtcblx0dmFyIHRvUmV0dXJuID0gW107XG5cdGZvciAodmFyIHByb3BlcnR5IGluIHBhcmFtcykge1xuXHRcdGlmIChwYXJhbXMuaGFzT3duUHJvcGVydHkocHJvcGVydHkpKSB7XG5cdFx0XHR0b1JldHVybi5wdXNoKHByb3BlcnR5ICsgJz0nICsgcGFyYW1zW3Byb3BlcnR5XSk7XG5cdFx0fVxuXHR9XG5cblx0cmV0dXJuIHRvUmV0dXJuLmpvaW4oJyYnKTtcbn07XG5cbnZhciBkZXZLZXlzID0gbnVsbDtcblxudmFyIENhbGxlciA9IHtcblx0LypcbiBpZiB0aGUgdXNlciBzZXRzXG4gICovXG5cdHNldERldktleXM6IGZ1bmN0aW9uIHNldERldktleXMoa2V5cykge1xuXHRcdGRldktleXMgPSBrZXlzO1xuXHR9LFxuXG5cdC8qXG4gZXhwZWN0ZSBhdHRyaWJ1dGVzOlxuIC0gdHlwZSAoZWl0aGVyIEdFVCwgUE9TVCwgREVMRVRFLCBQVVQpXG4gLSBlbmRwb2ludFxuIC0gcGFyYW1zIChpZiBhbnkuIEEganNvbiB3aXRoIHBhcmFtZXRlcnMgdG8gYmUgcGFzc2VkIGJhY2sgdG8gdGhlIGVuZHBvaW50KVxuIC0gY2FsbGJhY2tzOiBhbiBvYmplY3Qgd2l0aDpcbiBcdC0gc3VjY2VzczogdGhlIHN1Y2Nlc3MgY2FsbGJhY2tcbiBcdC0gZmFpbDogdGhlIGZhaWwgY2FsbGJhY2tcbiAgKi9cblx0bWFrZUNhbGw6IGZ1bmN0aW9uIG1ha2VDYWxsKGF0dHJzKSB7XG5cdFx0dmFyIGVuZHBvaW50VXJsID0gYXR0cnMuZW5kcG9pbnQ7XG5cblx0XHR2YXIgeGhyID0gbmV3IFhNTEh0dHBSZXF1ZXN0KCk7XG5cblx0XHRpZiAoYXR0cnMudHlwZSA9PT0gJ0dFVCcgJiYgYXR0cnMucGFyYW1zKSB7XG5cdFx0XHRlbmRwb2ludFVybCA9IGVuZHBvaW50VXJsICsgXCI/XCIgKyBwYXJhbXNUb0dldFZhcnMoYXR0cnMucGFyYW1zKTtcblx0XHR9XG5cblx0XHR4aHIub3BlbihhdHRycy50eXBlLCBlbmRwb2ludFVybCk7XG5cblx0XHRpZiAoZGV2S2V5cyAhPSBudWxsKSB7XG5cdFx0XHR4aHIuc2V0UmVxdWVzdEhlYWRlcigneC1wcC1zZWNyZXQnLCBkZXZLZXlzLnNlY3JldCk7XG5cdFx0XHR4aHIuc2V0UmVxdWVzdEhlYWRlcigneC1wcC1rZXknLCBkZXZLZXlzLmtleSk7XG5cdFx0fVxuXHRcdHhoci53aXRoQ3JlZGVudGlhbHMgPSB0cnVlO1xuXHRcdHhoci5zZXRSZXF1ZXN0SGVhZGVyKCdDb250ZW50LVR5cGUnLCAnYXBwbGljYXRpb24vanNvbicpO1xuXHRcdHhoci5vbmxvYWQgPSBmdW5jdGlvbiAoKSB7XG5cdFx0XHRpZiAoeGhyLnN0YXR1cyA+PSAyMDAgJiYgeGhyLnN0YXR1cyA8IDMwMCkge1xuXHRcdFx0XHRhdHRycy5jYWxsYmFja3Muc3VjY2VzcyhKU09OLnBhcnNlKHhoci5yZXNwb25zZVRleHQpKTtcblx0XHRcdH0gZWxzZSBpZiAoeGhyLnN0YXR1cyAhPT0gMjAwKSB7XG5cdFx0XHRcdGF0dHJzLmNhbGxiYWNrcy5mYWlsKEpTT04ucGFyc2UoeGhyLnJlc3BvbnNlVGV4dCkpO1xuXHRcdFx0fVxuXHRcdH07XG5cblx0XHRpZiAoIWF0dHJzLnBhcmFtcykge1xuXHRcdFx0YXR0cnMucGFyYW1zID0ge307XG5cdFx0fVxuXHRcdHhoci5zZW5kKEpTT04uc3RyaW5naWZ5KGF0dHJzLnBhcmFtcykpO1xuXHR9LFxuXG5cdHByb21pc2VDYWxsOiBmdW5jdGlvbiBwcm9taXNlQ2FsbChhdHRycykge1xuXHRcdHJldHVybiBuZXcgUHJvbWlzZShmdW5jdGlvbiAocmVzb2x2ZSwgcmVqZWN0KSB7XG5cdFx0XHR2YXIgeGhyID0gbmV3IFhNTEh0dHBSZXF1ZXN0KCk7XG5cblx0XHRcdGlmIChhdHRycy50eXBlID09PSAnR0VUJyAmJiBhdHRycy5wYXJhbXMpIHtcblx0XHRcdFx0ZW5kcG9pbnRVcmwgPSBlbmRwb2ludFVybCArIFwiP1wiICsgcGFyYW1zVG9HZXRWYXJzKGF0dHJzLnBhcmFtcyk7XG5cdFx0XHR9XG5cblx0XHRcdHhoci5vcGVuKGF0dHJzLnR5cGUsIGF0dHJzLmVuZHBvaW50KTtcblx0XHRcdHhoci53aXRoQ3JlZGVudGlhbHMgPSB0cnVlO1xuXG5cdFx0XHRpZiAoZGV2S2V5cyAhPSBudWxsKSB7XG5cdFx0XHRcdHhoci5zZXRSZXF1ZXN0SGVhZGVyKCd4LXBwLXNlY3JldCcsIGRldktleXMuc2VjcmV0KTtcblx0XHRcdFx0eGhyLnNldFJlcXVlc3RIZWFkZXIoJ3gtcHAta2V5JywgZGV2S2V5cy5rZXkpO1xuXHRcdFx0fVxuXG5cdFx0XHR4aHIuc2V0UmVxdWVzdEhlYWRlcignQ29udGVudC1UeXBlJywgJ2FwcGxpY2F0aW9uL2pzb24nKTtcblx0XHRcdHhoci5vbmxvYWQgPSBmdW5jdGlvbiAoKSB7XG5cdFx0XHRcdGlmICh0aGlzLnN0YXR1cyA+PSAyMDAgJiYgdGhpcy5zdGF0dXMgPCAzMDApIHtcblx0XHRcdFx0XHRhdHRycy5taWRkbGV3YXJlcy5zdWNjZXNzKEpTT04ucGFyc2UoeGhyLnJlc3BvbnNlVGV4dCkpO1xuXHRcdFx0XHRcdHJlc29sdmUoSlNPTi5wYXJzZSh4aHIucmVzcG9uc2VUZXh0KSk7XG5cdFx0XHRcdH0gZWxzZSB7XG5cdFx0XHRcdFx0d2luZG93LmxvY2F0aW9uLmhyZWYgPSBTdG9yZS5nZXRMb2dpblVybCgpO1xuXHRcdFx0XHR9XG5cdFx0XHR9O1xuXHRcdFx0eGhyLm9uZXJyb3IgPSBmdW5jdGlvbiAoKSB7XG5cdFx0XHRcdHdpbmRvdy5sb2NhdGlvbiA9IFN0b3JlLmdldExvZ2luVXJsKCk7XG5cdFx0XHR9O1xuXHRcdFx0eGhyLnNlbmQoKTtcblx0XHR9KTtcblx0fVxufTtcblxubW9kdWxlLmV4cG9ydHMgPSBDYWxsZXI7IiwidmFyIGRlYm91bmNlZFRpbWVvdXQgPSBudWxsO1xudmFyIGN1cnJlbnRRdWVyeSA9ICcnO1xudmFyIGxpbWl0ID0gODtcbnZhciBsYXRlbmN5ID0gNTAwO1xudmFyIGluaXRPcHRpb25zID0gdm9pZCAwO1xudmFyIGN1cnJlbnRQYWdlID0gMTtcbnZhciBtZXRhRGF0YSA9IG51bGw7XG52YXIgaXRlbXMgPSBbXTtcbnZhciBwYWdpbmF0aW9uRGF0YSA9IG51bGw7XG5cbnZhciBQYWdpbmF0aW9uSGVscGVyID0gcmVxdWlyZSgnLi9wYWdpbmF0aW9uLWhlbHBlcicpO1xudmFyIENhbGxlciA9IHJlcXVpcmUoJy4vY2FsbGVyJyk7XG52YXIgU3RvcmUgPSByZXF1aXJlKCcuL3N0b3JlJyk7XG52YXIgRG9tID0gcmVxdWlyZSgnLi9kb20nKTtcblxudmFyIENsb3VkaW5hcnlQaWNrZXIgPSB7XG5cblx0XHRpbml0aWFsaXNlOiBmdW5jdGlvbiBpbml0aWFsaXNlKCkge1xuXHRcdFx0XHRkb2N1bWVudC5nZXRFbGVtZW50QnlJZCgnYmFjLS1jbG91ZGluYXJ5LS1jbG9zZWJ0bicpLm9uY2xpY2sgPSBmdW5jdGlvbiAoZSkge1xuXHRcdFx0XHRcdFx0Q2xvdWRpbmFyeVBpY2tlci5jbG9zZU1vZGFsKCk7XG5cdFx0XHRcdH07XG5cdFx0XHRcdGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKCdiYWMtLWNsb3VkaW5hcnktLXNlYXJjaC1pbnB1dCcpLm9ua2V5dXAgPSBmdW5jdGlvbiAoZSkge1xuXHRcdFx0XHRcdFx0Q2xvdWRpbmFyeVBpY2tlci5oYW5kbGVTZWFyY2goZSk7XG5cdFx0XHRcdH07XG5cdFx0XHRcdGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKCdiYWMtLWNsb3VkaW5hcnktLWdvLWJhY2snKS5vbmNsaWNrID0gZnVuY3Rpb24gKGUpIHtcblx0XHRcdFx0XHRcdENsb3VkaW5hcnlQaWNrZXIuZ29CYWNrKCk7XG5cdFx0XHRcdH07XG5cdFx0fSxcblxuXHRcdC8qXG4gIG9wdGlvbnM6IHtcbiAgXHRvblNlbGVjdDogaXQgZXhwZWN0cyBhIGZ1bmN0aW9uLiBUaGlzIGZ1bmN0aW9uIHdpbGwgYmUgaW52b2tlZCBleGFjdGx5IGF0IHRoZSBtb21lbnQgdGhlIHVzZXIgcGlja3NcbiAgXHRcdGEgZmlsZSBmcm9tIGNsb3VkaW5hcnkuIFRoZSBmdW5jdGlvbiB3aWxsIHRha2UganVzdCBvbmUgcGFyYW0gd2hpY2ggaXMgdGhlIHNlbGVjdGVkIGl0ZW0gb2JqZWN0XG4gICAgY2xvc2VPbkVzYzogdHJ1ZSAvIGZhbHNlXG4gIH1cbiAgICovXG5cdFx0b3Blbk1vZGFsOiBmdW5jdGlvbiBvcGVuTW9kYWwob3B0aW9ucykge1xuXHRcdFx0XHRDbG91ZGluYXJ5UGlja2VyLmluaXRpYWxpc2UoKTtcblx0XHRcdFx0aW5pdE9wdGlvbnMgPSBvcHRpb25zO1xuXHRcdFx0XHREb20uYWRkQ2xhc3MoZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoJ2JhYy0tY2xvdWRpbmFyeS0tbW9kYWwnKSwgJ2lzLW9wZW4nKTtcblx0XHRcdFx0Q2xvdWRpbmFyeVBpY2tlci5nZXRJbWFnZXMoe1xuXHRcdFx0XHRcdFx0cGFnZTogMSxcblx0XHRcdFx0XHRcdGxpbWl0OiBsaW1pdFxuXHRcdFx0XHR9KTtcblx0XHR9LFxuXG5cdFx0Y2xvc2VNb2RhbDogZnVuY3Rpb24gY2xvc2VNb2RhbCgpIHtcblx0XHRcdFx0RG9tLnJlbW92ZUNsYXNzKGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKCdiYWMtLWNsb3VkaW5hcnktLW1vZGFsJyksICdpcy1vcGVuJyk7XG5cdFx0fSxcblxuXHRcdGdldEltYWdlczogZnVuY3Rpb24gZ2V0SW1hZ2VzKG9wdGlvbnMpIHtcblx0XHRcdFx0Ly8gVE9ETyBtYWtlIHRoZSBjYWxsIGFuZCBnZXQgdGhlIGltYWdlc1xuXG5cdFx0XHRcdENhbGxlci5tYWtlQ2FsbCh7XG5cdFx0XHRcdFx0XHR0eXBlOiAnR0VUJyxcblx0XHRcdFx0XHRcdGVuZHBvaW50OiBTdG9yZS5nZXRDbG91ZGluYXJ5RW5kcG9pbnQoKSxcblx0XHRcdFx0XHRcdHBhcmFtczogb3B0aW9ucyxcblx0XHRcdFx0XHRcdGNhbGxiYWNrczoge1xuXHRcdFx0XHRcdFx0XHRcdHN1Y2Nlc3M6IGZ1bmN0aW9uIHN1Y2Nlc3MocmVzdWx0KSB7XG5cdFx0XHRcdFx0XHRcdFx0XHRcdENsb3VkaW5hcnlQaWNrZXIub25JbWFnZXNSZXNwb25zZShyZXN1bHQpO1xuXHRcdFx0XHRcdFx0XHRcdH0sXG5cdFx0XHRcdFx0XHRcdFx0ZmFpbDogZnVuY3Rpb24gZmFpbChlcnIpIHtcblx0XHRcdFx0XHRcdFx0XHRcdFx0YWxlcnQoZXJyKTtcblx0XHRcdFx0XHRcdFx0XHR9XG5cdFx0XHRcdFx0XHR9XG5cdFx0XHRcdH0pO1xuXHRcdH0sXG5cblx0XHRoYW5kbGVTZWFyY2g6IGZ1bmN0aW9uIGhhbmRsZVNlYXJjaChlKSB7XG5cdFx0XHRcdGlmIChkZWJvdW5jZWRUaW1lb3V0KSB7XG5cdFx0XHRcdFx0XHRjbGVhclRpbWVvdXQoZGVib3VuY2VkVGltZW91dCk7XG5cdFx0XHRcdH1cblxuXHRcdFx0XHRpZiAoZS50YXJnZXQudmFsdWUgPT09IGN1cnJlbnRRdWVyeSkge1xuXHRcdFx0XHRcdFx0cmV0dXJuO1xuXHRcdFx0XHR9XG5cblx0XHRcdFx0dmFyIHF1ZXJ5ID0gZS50YXJnZXQudmFsdWU7XG5cblx0XHRcdFx0Y3VycmVudFF1ZXJ5ID0gcXVlcnk7XG5cblx0XHRcdFx0dmFyIG9wdGlvbnMgPSB7XG5cdFx0XHRcdFx0XHRwYWdlOiAxLFxuXHRcdFx0XHRcdFx0bGltaXQ6IGxpbWl0LFxuXHRcdFx0XHRcdFx0cXVlcnk6IHF1ZXJ5XG5cdFx0XHRcdH07XG5cblx0XHRcdFx0ZGVib3VuY2VkVGltZW91dCA9IHNldFRpbWVvdXQoZnVuY3Rpb24gKCkge1xuXHRcdFx0XHRcdFx0Q2xvdWRpbmFyeVBpY2tlci5nZXRJbWFnZXMob3B0aW9ucyk7XG5cdFx0XHRcdH0sIGxhdGVuY3kpO1xuXHRcdH0sXG5cblx0XHRpdGVtU2VsZWN0ZWQ6IGZ1bmN0aW9uIGl0ZW1TZWxlY3RlZChpdGVtLCBlKSB7XG5cblx0XHRcdFx0aWYgKGl0ZW0udHlwZSA9PSAnZm9sZGVyJykge1xuXG5cdFx0XHRcdFx0XHR2YXIgcGFyYW1zID0ge1xuXHRcdFx0XHRcdFx0XHRcdHBhZ2U6IDEsXG5cdFx0XHRcdFx0XHRcdFx0bGltaXQ6IGxpbWl0LFxuXHRcdFx0XHRcdFx0XHRcdHBhcmVudDogaXRlbS5pZFxuXHRcdFx0XHRcdFx0fTtcblxuXHRcdFx0XHRcdFx0Ly8gVE9ETyBzZXQgc2VhcmNoIGlucHV0J3MgdmFsdWUgPSAnJ1xuXHRcdFx0XHRcdFx0Y3VycmVudFF1ZXJ5ID0gJyc7XG5cblx0XHRcdFx0XHRcdENsb3VkaW5hcnlQaWNrZXIuZ2V0SW1hZ2VzKHBhcmFtcyk7XG5cdFx0XHRcdH0gZWxzZSB7XG5cdFx0XHRcdFx0XHRpbml0T3B0aW9ucy5vblNlbGVjdChpdGVtKTtcblx0XHRcdFx0XHRcdENsb3VkaW5hcnlQaWNrZXIuY2xvc2VNb2RhbCgpO1xuXHRcdFx0XHR9XG5cdFx0fSxcblxuXHRcdG9uSW1hZ2VzUmVzcG9uc2U6IGZ1bmN0aW9uIG9uSW1hZ2VzUmVzcG9uc2UoZGF0YSkge1xuXG5cdFx0XHRcdHBhZ2luYXRpb25EYXRhID0gUGFnaW5hdGlvbkhlbHBlci5nZXRQYWdlc1JhbmdlKGN1cnJlbnRQYWdlLCBNYXRoLmNlaWwoZGF0YS5tZXRhLnRvdGFsIC8gbGltaXQpKTtcblxuXHRcdFx0XHRtZXRhRGF0YSA9IGRhdGEubWV0YTtcblx0XHRcdFx0aXRlbXMgPSBkYXRhLmFzc2V0cztcblxuXHRcdFx0XHRDbG91ZGluYXJ5UGlja2VyLnJlbmRlcigpO1xuXHRcdH0sXG5cblx0XHRyZW5kZXJQYWdpbmF0aW9uQnV0dG9uczogZnVuY3Rpb24gcmVuZGVyUGFnaW5hdGlvbkJ1dHRvbnMoKSB7XG5cdFx0XHRcdHZhciB0b1JldHVybiA9IFtdO1xuXG5cdFx0XHRcdHZhciBjcmVhdGVQYWdpbmF0aW9uRWxlbWVudCA9IGZ1bmN0aW9uIGNyZWF0ZVBhZ2luYXRpb25FbGVtZW50KGFDbGFzc05hbWUsIGFGdW5jdGlvbiwgc3BhbkNsYXNzTmFtZSwgc3BhbkNvbnRlbnQpIHtcblx0XHRcdFx0XHRcdHZhciBsaSA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoJ2xpJyk7XG5cdFx0XHRcdFx0XHR2YXIgYSA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoJ2EnKTtcblx0XHRcdFx0XHRcdGxpLmNsYXNzTmFtZSA9IGFDbGFzc05hbWU7XG5cdFx0XHRcdFx0XHRhLm9uY2xpY2sgPSBhRnVuY3Rpb247XG5cdFx0XHRcdFx0XHR2YXIgc3BhbiA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoJ3NwYW4nKTtcblx0XHRcdFx0XHRcdHNwYW4uY2xhc3NOYW1lID0gc3BhbkNsYXNzTmFtZTtcblx0XHRcdFx0XHRcdGlmIChzcGFuQ29udGVudCkge1xuXHRcdFx0XHRcdFx0XHRcdHNwYW4uaW5uZXJIVE1MID0gc3BhbkNvbnRlbnQ7XG5cdFx0XHRcdFx0XHR9XG5cdFx0XHRcdFx0XHRhLmFwcGVuZENoaWxkKHNwYW4pO1xuXHRcdFx0XHRcdFx0bGkuYXBwZW5kQ2hpbGQoYSk7XG5cdFx0XHRcdFx0XHRyZXR1cm4gbGk7XG5cdFx0XHRcdH07XG5cblx0XHRcdFx0aWYgKHBhZ2luYXRpb25EYXRhLmhhc1ByZXZpb3VzKSB7XG5cdFx0XHRcdFx0XHR0b1JldHVybi5wdXNoKGNyZWF0ZVBhZ2luYXRpb25FbGVtZW50KCdkaXNhYmxlZCcsIGZ1bmN0aW9uIChlKSB7XG5cdFx0XHRcdFx0XHRcdFx0ZS5wcmV2ZW50RGVmYXVsdCgpO1xuXHRcdFx0XHRcdFx0XHRcdENsb3VkaW5hcnlQaWNrZXIuX2dvVG9QYWdlKDEpO1xuXHRcdFx0XHRcdFx0fSwgJ2ZhIGZhLWFuZ2xlLWRvdWJsZS1sZWZ0JykpO1xuXHRcdFx0XHRcdFx0dG9SZXR1cm4ucHVzaChjcmVhdGVQYWdpbmF0aW9uRWxlbWVudCgnZGlzYWJsZWQnLCBmdW5jdGlvbiAoZSkge1xuXHRcdFx0XHRcdFx0XHRcdGUucHJldmVudERlZmF1bHQoKTtcblx0XHRcdFx0XHRcdFx0XHRDbG91ZGluYXJ5UGlja2VyLl9nb1RvUGFnZShjdXJyZW50UGFnZSAtIDEpO1xuXHRcdFx0XHRcdFx0fSwgJ2ZhIGZhLWFuZ2xlLWxlZnQnKSk7XG5cdFx0XHRcdH1cblxuXHRcdFx0XHRmb3IgKHZhciBpID0gMDsgaSA8IHBhZ2luYXRpb25EYXRhLmJ1dHRvbnMubGVuZ3RoOyBpKyspIHtcblx0XHRcdFx0XHRcdChmdW5jdGlvbiAoaSkge1xuXHRcdFx0XHRcdFx0XHRcdHZhciBidG4gPSBwYWdpbmF0aW9uRGF0YS5idXR0b25zW2ldO1xuXHRcdFx0XHRcdFx0XHRcdHRvUmV0dXJuLnB1c2goY3JlYXRlUGFnaW5hdGlvbkVsZW1lbnQoYnRuLnJ1bm5pbmdwYWdlID8gXCJhY3RpdmVcIiA6IFwiLVwiLCBmdW5jdGlvbiAoZSkge1xuXHRcdFx0XHRcdFx0XHRcdFx0XHRlLnByZXZlbnREZWZhdWx0KCk7XG5cdFx0XHRcdFx0XHRcdFx0XHRcdENsb3VkaW5hcnlQaWNrZXIuX2dvVG9QYWdlKGJ0bi5wYWdlbm8pO1xuXHRcdFx0XHRcdFx0XHRcdH0sICdudW1iZXInLCBidG4ucGFnZW5vKSk7XG5cdFx0XHRcdFx0XHR9KShpKTtcblx0XHRcdFx0fVxuXG5cdFx0XHRcdGlmIChwYWdpbmF0aW9uRGF0YS5oYXNOZXh0KSB7XG5cdFx0XHRcdFx0XHR0b1JldHVybi5wdXNoKGNyZWF0ZVBhZ2luYXRpb25FbGVtZW50KCdkaXNhYmxlZCcsIGZ1bmN0aW9uIChlKSB7XG5cdFx0XHRcdFx0XHRcdFx0ZS5wcmV2ZW50RGVmYXVsdCgpO1xuXHRcdFx0XHRcdFx0XHRcdENsb3VkaW5hcnlQaWNrZXIuX2dvVG9QYWdlKGN1cnJlbnRQYWdlICsgMSk7XG5cdFx0XHRcdFx0XHR9LCAnZmEgZmEtYW5nbGUtcmlnaHQnKSk7XG5cdFx0XHRcdFx0XHR0b1JldHVybi5wdXNoKGNyZWF0ZVBhZ2luYXRpb25FbGVtZW50KCdkaXNhYmxlZCcsIGZ1bmN0aW9uIChlKSB7XG5cdFx0XHRcdFx0XHRcdFx0ZS5wcmV2ZW50RGVmYXVsdCgpO1xuXHRcdFx0XHRcdFx0XHRcdENsb3VkaW5hcnlQaWNrZXIuX2dvVG9QYWdlKE1hdGguY2VpbChtZXRhRGF0YS50b3RhbCAvIGxpbWl0KSk7XG5cdFx0XHRcdFx0XHR9LCAnZmEgZmEtYW5nbGUtZG91YmxlLXJpZ2h0JykpO1xuXHRcdFx0XHR9XG5cblx0XHRcdFx0ZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoJ2JhYy0tY2xvdWRpbmFyeS1hY3R1YWwtcGFnaW5hdGlvbi1jb250YWluZXInKS5pbm5lckhUTUwgPSAnJztcblx0XHRcdFx0Zm9yICh2YXIgX2kgPSAwOyBfaSA8IHRvUmV0dXJuLmxlbmd0aDsgX2krKykge1xuXHRcdFx0XHRcdFx0ZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoJ2JhYy0tY2xvdWRpbmFyeS1hY3R1YWwtcGFnaW5hdGlvbi1jb250YWluZXInKS5hcHBlbmRDaGlsZCh0b1JldHVybltfaV0pO1xuXHRcdFx0XHR9XG5cdFx0fSxcblxuXHRcdF9nb1RvUGFnZTogZnVuY3Rpb24gX2dvVG9QYWdlKHBhZ2UpIHtcblxuXHRcdFx0XHRpZiAocGFnZSA9PT0gY3VycmVudFBhZ2UpIHtcblx0XHRcdFx0XHRcdHJldHVybjtcblx0XHRcdFx0fVxuXG5cdFx0XHRcdHZhciBwYXJhbXMgPSB7XG5cdFx0XHRcdFx0XHRwYWdlOiBwYWdlLFxuXHRcdFx0XHRcdFx0bGltaXQ6IGxpbWl0XG5cdFx0XHRcdH07XG5cblx0XHRcdFx0aWYgKG1ldGFEYXRhLmFzc2V0KSB7XG5cdFx0XHRcdFx0XHRwYXJhbXMucGFyZW50ID0gbWV0YURhdGEuYXNzZXQ7XG5cdFx0XHRcdH1cblx0XHRcdFx0aWYgKGN1cnJlbnRRdWVyeSkge1xuXHRcdFx0XHRcdFx0cGFyYW1zLnF1ZXJ5ID0gY3VycmVudFF1ZXJ5O1xuXHRcdFx0XHR9XG5cblx0XHRcdFx0Y3VycmVudFBhZ2UgPSBwYWdlO1xuXG5cdFx0XHRcdENsb3VkaW5hcnlQaWNrZXIuZ2V0SW1hZ2VzKHBhcmFtcyk7XG5cdFx0fSxcblxuXHRcdGdvQmFjazogZnVuY3Rpb24gZ29CYWNrKCkge1xuXG5cdFx0XHRcdHZhciBwYXJhbXMgPSB7XG5cdFx0XHRcdFx0XHRwYWdlOiAxLFxuXHRcdFx0XHRcdFx0bGltaXQ6IGxpbWl0XG5cdFx0XHRcdH07XG5cdFx0XHRcdGlmIChtZXRhRGF0YS5wYXJlbnQpIHtcblx0XHRcdFx0XHRcdHBhcmFtcy5wYXJlbnQgPSBtZXRhRGF0YS5wYXJlbnQ7XG5cdFx0XHRcdH1cblx0XHRcdFx0aWYgKGN1cnJlbnRRdWVyeSkge1xuXHRcdFx0XHRcdFx0cGFyYW1zLnF1ZXJ5ID0gY3VycmVudFF1ZXJ5O1xuXHRcdFx0XHR9XG5cdFx0XHRcdENsb3VkaW5hcnlQaWNrZXIuZ2V0SW1hZ2VzKHBhcmFtcyk7XG5cdFx0fSxcblxuXHRcdHJlbmRlckl0ZW1zOiBmdW5jdGlvbiByZW5kZXJJdGVtcygpIHtcblx0XHRcdFx0dmFyIG9uZUl0ZW0gPSBmdW5jdGlvbiBvbmVJdGVtKGl0ZW0pIHtcblx0XHRcdFx0XHRcdHZhciBpdGVtSWNvbiA9IGZ1bmN0aW9uIGl0ZW1JY29uKCkge1xuXHRcdFx0XHRcdFx0XHRcdGlmIChpdGVtLnR5cGUgIT0gJ2ZvbGRlcicpIHtcblx0XHRcdFx0XHRcdFx0XHRcdFx0cmV0dXJuICc8aW1nIHNyYz0nICsgaXRlbS50aHVtYiArICcgYWx0PVwiXCIvPic7XG5cdFx0XHRcdFx0XHRcdFx0fSBlbHNlIHtcblx0XHRcdFx0XHRcdFx0XHRcdFx0cmV0dXJuICc8aSBjbGFzcz1cImZhIGZhLWZvbGRlci1vXCI+PC9pPic7XG5cdFx0XHRcdFx0XHRcdFx0fVxuXHRcdFx0XHRcdFx0fTtcblxuXHRcdFx0XHRcdFx0dmFyIGZ1bmN0ID0gZnVuY3Rpb24gZnVuY3QoKSB7XG5cdFx0XHRcdFx0XHRcdFx0Q2xvdWRpbmFyeVBpY2tlci5pdGVtU2VsZWN0ZWQoaXRlbSk7XG5cdFx0XHRcdFx0XHR9O1xuXG5cdFx0XHRcdFx0XHR2YXIgbmV3RG9tRWwgPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KCdkaXYnKTtcblx0XHRcdFx0XHRcdG5ld0RvbUVsLmNsYXNzTmFtZSA9IFwiY2xvdWQtaW1hZ2VzX19pdGVtXCI7XG5cdFx0XHRcdFx0XHRuZXdEb21FbC5vbmNsaWNrID0gZnVuY3Q7XG5cdFx0XHRcdFx0XHRuZXdEb21FbC5pbm5lckhUTUwgPSAnXFxuXFx0XFx0XFx0XFx0XFx0XFx0ICA8ZGl2IGNsYXNzPVwiY2xvdWQtaW1hZ2VzX19pdGVtX190eXBlXCI+XFxuXFx0XFx0XFx0XFx0XFx0XFx0XFx0XFx0JyArIGl0ZW1JY29uKCkgKyAnXFxuXFx0XFx0XFx0XFx0XFx0XFx0ICA8L2Rpdj5cXG5cXHRcXHRcXHRcXHRcXHRcXHQgIDxkaXYgY2xhc3M9XCJjbG91ZC1pbWFnZXNfX2l0ZW1fX2RldGFpbHNcIj5cXG5cXHRcXHRcXHRcXHRcXHRcXHRcXHRcXHQ8c3BhbiBjbGFzcz1cImNsb3VkLWltYWdlc19faXRlbV9fZGV0YWlsc19fbmFtZVwiPicgKyBpdGVtLm5hbWUgKyAnPC9zcGFuPlxcblxcdFxcdFxcdFxcdFxcdFxcdFxcdFxcdDxzcGFuIGNsYXNzPVwiY2xvdWQtaW1hZ2VzX19pdGVtX19kZXRhaWxzX19kYXRlXCI+JyArIGl0ZW0uY3JkYXRlICsgJzwvc3Bhbj5cXG5cXHRcXHRcXHRcXHRcXHRcXHQgIDwvZGl2PlxcblxcdFxcdFxcdFxcdFxcdFxcdCAgPGRpdiBjbGFzcz1cImNsb3VkLWltYWdlc19faXRlbV9fYWN0aW9uc1wiPlxcblxcdFxcdFxcdFxcdFxcdFxcdFxcdFxcdDxhIGNsYXNzPVwiZmEgZmEtcGVuY2lsXCI+PC9hPlxcblxcdFxcdFxcdFxcdFxcdFxcdCAgPC9kaXY+Jztcblx0XHRcdFx0XHRcdHJldHVybiBuZXdEb21FbDtcblx0XHRcdFx0fTtcblxuXHRcdFx0XHRkb2N1bWVudC5nZXRFbGVtZW50QnlJZCgnYmFjLS1jbG91ZGluYXJ5LWl0YW1zLWNvbnRhaW5lcicpLmlubmVySFRNTCA9ICcnO1xuXHRcdFx0XHRmb3IgKHZhciBpID0gMDsgaSA8IGl0ZW1zLmxlbmd0aDsgaSsrKSB7XG5cdFx0XHRcdFx0XHRkb2N1bWVudC5nZXRFbGVtZW50QnlJZCgnYmFjLS1jbG91ZGluYXJ5LWl0YW1zLWNvbnRhaW5lcicpLmFwcGVuZENoaWxkKG9uZUl0ZW0oaXRlbXNbaV0pKTtcblx0XHRcdFx0fVxuXHRcdH0sXG5cblx0XHRyZW5kZXI6IGZ1bmN0aW9uIHJlbmRlcigpIHtcblx0XHRcdFx0aWYgKG1ldGFEYXRhLmFzc2V0KSB7XG5cdFx0XHRcdFx0XHREb20ucmVtb3ZlQ2xhc3MoZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoJ2JhYy0tY2xvdWRpbmFyeS0tYmFjay1idXR0b24tY29udGFpbmVyJyksICdoZG4nKTtcblx0XHRcdFx0fSBlbHNlIHtcblx0XHRcdFx0XHRcdERvbS5hZGRDbGFzcyhkb2N1bWVudC5nZXRFbGVtZW50QnlJZCgnYmFjLS1jbG91ZGluYXJ5LS1iYWNrLWJ1dHRvbi1jb250YWluZXInKSwgJ2hkbicpO1xuXHRcdFx0XHR9XG5cblx0XHRcdFx0Q2xvdWRpbmFyeVBpY2tlci5yZW5kZXJJdGVtcygpO1xuXG5cdFx0XHRcdGlmIChtZXRhRGF0YS50b3RhbCA+IGxpbWl0KSB7XG5cdFx0XHRcdFx0XHREb20ucmVtb3ZlQ2xhc3MoZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoJ2JhYy0tY2xvdWRpbmFyeS1wYWdpbmF0aW9uLWNvbnRhaW5lcicpLCAnaGRuJyk7XG5cdFx0XHRcdFx0XHRDbG91ZGluYXJ5UGlja2VyLnJlbmRlclBhZ2luYXRpb25CdXR0b25zKCk7XG5cdFx0XHRcdH0gZWxzZSB7XG5cdFx0XHRcdFx0XHREb20uYWRkQ2xhc3MoZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoJ2JhYy0tY2xvdWRpbmFyeS1wYWdpbmF0aW9uLWNvbnRhaW5lcicpLCAnaGRuJyk7XG5cdFx0XHRcdH1cblx0XHR9XG59O1xuXG5tb2R1bGUuZXhwb3J0cyA9IENsb3VkaW5hcnlQaWNrZXI7IiwidmFyIERvbSA9IHtcbiAgICBoYXNDbGFzczogZnVuY3Rpb24gaGFzQ2xhc3MoZWwsIGNsYXNzTmFtZSkge1xuICAgICAgICBpZiAoZWwuY2xhc3NMaXN0KSByZXR1cm4gZWwuY2xhc3NMaXN0LmNvbnRhaW5zKGNsYXNzTmFtZSk7ZWxzZSByZXR1cm4gbmV3IFJlZ0V4cCgnKF58ICknICsgY2xhc3NOYW1lICsgJyggfCQpJywgJ2dpJykudGVzdChlbC5jbGFzc05hbWUpO1xuICAgIH0sXG5cbiAgICByZW1vdmVDbGFzczogZnVuY3Rpb24gcmVtb3ZlQ2xhc3MoZWwsIGNsYXNzTmFtZSkge1xuICAgICAgICBpZiAoZWwuY2xhc3NMaXN0KSBlbC5jbGFzc0xpc3QucmVtb3ZlKGNsYXNzTmFtZSk7ZWxzZSBlbC5jbGFzc05hbWUgPSBlbC5jbGFzc05hbWUucmVwbGFjZShuZXcgUmVnRXhwKCcoXnxcXFxcYiknICsgY2xhc3NOYW1lLnNwbGl0KCcgJykuam9pbignfCcpICsgJyhcXFxcYnwkKScsICdnaScpLCAnICcpO1xuICAgIH0sXG5cbiAgICBhZGRDbGFzczogZnVuY3Rpb24gYWRkQ2xhc3MoZWwsIGNsYXNzTmFtZSkge1xuICAgICAgICBpZiAoZWwuY2xhc3NMaXN0KSBlbC5jbGFzc0xpc3QuYWRkKGNsYXNzTmFtZSk7ZWxzZSBlbC5jbGFzc05hbWUgKz0gJyAnICsgY2xhc3NOYW1lO1xuICAgIH0sXG5cbiAgICB0b2dnbGVDbGFzczogZnVuY3Rpb24gdG9nZ2xlQ2xhc3MoZWwsIGNsYXNzTmFtZSkge1xuICAgICAgICBpZiAodGhpcy5oYXNDbGFzcyhlbCwgY2xhc3NOYW1lKSkge1xuICAgICAgICAgICAgdGhpcy5yZW1vdmVDbGFzcyhlbCwgY2xhc3NOYW1lKTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIHRoaXMuYWRkQ2xhc3MoZWwsIGNsYXNzTmFtZSk7XG4gICAgICAgIH1cbiAgICB9XG59O1xuXG5tb2R1bGUuZXhwb3J0cyA9IERvbTsiLCJ2YXIgZG9tID0gcmVxdWlyZSgnLi9kb20nKTtcblxudmFyIGRlZmF1bHRIaWRlSW4gPSA1MDAwO1xudmFyIGxhc3RJbmRleCA9IDE7XG52YXIgbnVtT2ZJbmZvQmxvY2tzID0gMTA7XG5cbnZhciBpbmZvQmxvY2tzID0gW107XG5cbnZhciBJbmZvQ29udHJvbGxlciA9IHtcblx0cmVuZGVySW5mb0Jsb2NrczogZnVuY3Rpb24gcmVuZGVySW5mb0Jsb2NrcygpIHtcblx0XHR2YXIgYmxvY2tzVGVtcGxhdGUgPSBmdW5jdGlvbiBibG9ja3NUZW1wbGF0ZShpbmRleCkge1xuXHRcdFx0cmV0dXJuICdcXG5cXHRcXHRcXHRcXHQgPGRpdiBjbGFzcz1cImJhYy0tcHVyZXNkay1pbmZvLWJveC0tXCIgaWQ9XCJiYWMtLXB1cmVzZGstaW5mby1ib3gtLScgKyBpbmRleCArICdcIj5cXG5cXHRcXHRcXHRcXHQgXFx0PGRpdiBjbGFzcz1cImJhYy0tdGltZXJcIiBpZD1cImJhYy0tdGltZXInICsgaW5kZXggKyAnXCI+PC9kaXY+XFxuXFx0XFx0XFx0XFx0XFx0IDxkaXYgY2xhc3M9XCJiYWMtLWlubmVyLWluZm8tYm94LS1cIj5cXG5cXHRcXHRcXHRcXHRcXHQgXFx0XFx0PGRpdiBjbGFzcz1cImJhYy0taW5mby1pY29uLS0gZmEtc3VjY2Vzc1wiPjwvZGl2PlxcblxcdFxcdFxcdFxcdFxcdCBcXHRcXHQ8ZGl2IGNsYXNzPVwiYmFjLS1pbmZvLWljb24tLSBmYS13YXJuaW5nXCI+PC9kaXY+XFxuXFx0XFx0XFx0XFx0XFx0IFxcdFxcdDxkaXYgY2xhc3M9XCJiYWMtLWluZm8taWNvbi0tIGZhLWluZm8tMVwiPjwvZGl2PlxcblxcdFxcdFxcdFxcdFxcdCBcXHRcXHQ8ZGl2IGNsYXNzPVwiYmFjLS1pbmZvLWljb24tLSBmYS1lcnJvclwiPjwvZGl2PlxcblxcdFxcdFxcdFxcdFxcdCBcXHRcXHQgPGRpdiBjbGFzcz1cImJhYy0taW5mby1tYWluLXRleHQtLVwiIGlkPVwiYmFjLS1pbmZvLW1haW4tdGV4dC0tJyArIGluZGV4ICsgJ1wiPjwvZGl2PlxcblxcdFxcdFxcdFxcdFxcdCBcXHRcXHQgPGRpdiBjbGFzcz1cImJhYy0taW5mby1jbG9zZS1idXR0b24tLSBmYS1jbG9zZS0xXCIgaWQ9XCJiYWMtLWluZm8tY2xvc2UtYnV0dG9uLS0nICsgaW5kZXggKyAnXCI+PC9kaXY+XFxuXFx0XFx0XFx0XFx0XFx0PC9kaXY+XFxuXFx0XFx0XFx0XFx0PC9kaXY+XFxuXFx0XFx0ICAnO1xuXHRcdH07XG5cblx0XHR2YXIgaW5mb0Jsb2Nrc1dyYXBwZXIgPSBkb2N1bWVudC5nZXRFbGVtZW50QnlJZCgnYmFjLS1pbmZvLWJsb2Nrcy13cmFwcGVyLS0nKTtcblx0XHR2YXIgaW5uZXJIdG1sID0gJyc7XG5cdFx0Zm9yICh2YXIgaSA9IDE7IGkgPCBudW1PZkluZm9CbG9ja3M7IGkrKykge1xuXHRcdFx0aW5uZXJIdG1sICs9IGJsb2Nrc1RlbXBsYXRlKGkpO1xuXHRcdH1cblxuXHRcdGluZm9CbG9ja3NXcmFwcGVyLmlubmVySFRNTCA9IGlubmVySHRtbDtcblx0fSxcblxuXHRpbml0OiBmdW5jdGlvbiBpbml0KCkge1xuXHRcdGZvciAodmFyIGkgPSAxOyBpIDwgbnVtT2ZJbmZvQmxvY2tzOyBpKyspIHtcblx0XHRcdChmdW5jdGlvbiB4KGkpIHtcblx0XHRcdFx0dmFyIGNsb3NlRnVuY3Rpb24gPSBmdW5jdGlvbiBjbG9zZUZ1bmN0aW9uKCkge1xuXHRcdFx0XHRcdGRvbS5yZW1vdmVDbGFzcyhkb2N1bWVudC5nZXRFbGVtZW50QnlJZCgnYmFjLS1wdXJlc2RrLWluZm8tYm94LS0nICsgaSksICdiYWMtLWFjdGl2ZS0tJyk7XG5cdFx0XHRcdFx0ZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoJ2JhYy0tdGltZXInICsgaSkuc3R5bGUudHJhbnNpdGlvbiA9ICcnO1xuXHRcdFx0XHRcdGRvbS5yZW1vdmVDbGFzcyhkb2N1bWVudC5nZXRFbGVtZW50QnlJZCgnYmFjLS10aW1lcicgKyBpKSwgJ2JhYy0tZnVsbHdpZHRoJyk7XG5cdFx0XHRcdFx0aW5mb0Jsb2Nrc1tpIC0gMV0uaW5Vc2UgPSBmYWxzZTtcblx0XHRcdFx0XHRzZXRUaW1lb3V0KGZ1bmN0aW9uICgpIHtcblx0XHRcdFx0XHRcdGlmIChpbmZvQmxvY2tzW2kgLSAxXS5jbG9zZVRpbWVvdXQpIHtcblx0XHRcdFx0XHRcdFx0Y2xlYXJUaW1lb3V0KGluZm9CbG9ja3NbaSAtIDFdLmNsb3NlVGltZW91dCk7XG5cdFx0XHRcdFx0XHR9XG5cdFx0XHRcdFx0XHRkb20ucmVtb3ZlQ2xhc3MoZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoJ2JhYy0tcHVyZXNkay1pbmZvLWJveC0tJyArIGkpLCAnYmFjLS1zdWNjZXNzJyk7XG5cdFx0XHRcdFx0XHRkb20ucmVtb3ZlQ2xhc3MoZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoJ2JhYy0tcHVyZXNkay1pbmZvLWJveC0tJyArIGkpLCAnYmFjLS1pbmZvJyk7XG5cdFx0XHRcdFx0XHRkb20ucmVtb3ZlQ2xhc3MoZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoJ2JhYy0tcHVyZXNkay1pbmZvLWJveC0tJyArIGkpLCAnYmFjLS13YXJuaW5nJyk7XG5cdFx0XHRcdFx0XHRkb20ucmVtb3ZlQ2xhc3MoZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoJ2JhYy0tcHVyZXNkay1pbmZvLWJveC0tJyArIGkpLCAnYmFjLS1lcnJvcicpO1xuXHRcdFx0XHRcdH0sIDQ1MCk7XG5cdFx0XHRcdH07XG5cblx0XHRcdFx0dmFyIGFkZFRleHQgPSBmdW5jdGlvbiBhZGRUZXh0KHRleHQpIHtcblx0XHRcdFx0XHRkb2N1bWVudC5nZXRFbGVtZW50QnlJZCgnYmFjLS1pbmZvLW1haW4tdGV4dC0tJyArIGkpLmlubmVySFRNTCA9IHRleHQ7XG5cdFx0XHRcdH07XG5cblx0XHRcdFx0dmFyIGFkZFRpbWVvdXQgPSBmdW5jdGlvbiBhZGRUaW1lb3V0KHRpbWVvdXRNc2Vjcykge1xuXHRcdFx0XHRcdGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKCdiYWMtLXRpbWVyJyArIGkpLnN0eWxlLnRyYW5zaXRpb24gPSAnd2lkdGggJyArIHRpbWVvdXRNc2VjcyArICdtcyc7XG5cdFx0XHRcdFx0ZG9tLmFkZENsYXNzKGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKCdiYWMtLXRpbWVyJyArIGkpLCAnYmFjLS1mdWxsd2lkdGgnKTtcblx0XHRcdFx0XHRpbmZvQmxvY2tzW2kgLSAxXS5jbG9zZVRpbWVvdXQgPSBzZXRUaW1lb3V0KGZ1bmN0aW9uICgpIHtcblx0XHRcdFx0XHRcdGluZm9CbG9ja3NbaSAtIDFdLmNsb3NlRnVuY3Rpb24oKTtcblx0XHRcdFx0XHR9LCB0aW1lb3V0TXNlY3MpO1xuXHRcdFx0XHR9O1xuXG5cdFx0XHRcdGluZm9CbG9ja3MucHVzaCh7XG5cdFx0XHRcdFx0aWQ6IGksXG5cdFx0XHRcdFx0aW5Vc2U6IGZhbHNlLFxuXHRcdFx0XHRcdGVsZW1lbnQ6IGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKCdiYWMtLXB1cmVzZGstaW5mby1ib3gtLScgKyBpKSxcblx0XHRcdFx0XHRjbG9zZUZ1bmN0aW9uOiBjbG9zZUZ1bmN0aW9uLFxuXHRcdFx0XHRcdGFkZFRleHQ6IGFkZFRleHQsXG5cdFx0XHRcdFx0YWRkVGltZW91dDogYWRkVGltZW91dCxcblx0XHRcdFx0XHRjbG9zZVRpbWVvdXQ6IGZhbHNlXG5cdFx0XHRcdH0pO1xuXHRcdFx0XHRkb2N1bWVudC5nZXRFbGVtZW50QnlJZCgnYmFjLS1pbmZvLWNsb3NlLWJ1dHRvbi0tJyArIGkpLm9uY2xpY2sgPSBmdW5jdGlvbiAoZSkge1xuXHRcdFx0XHRcdGNsb3NlRnVuY3Rpb24oaSk7XG5cdFx0XHRcdH07XG5cdFx0XHR9KShpKTtcblx0XHR9XG5cdH0sXG5cblx0LypcbiAgdHlwZTogb25lIG9mOlxuIFx0LSBzdWNjZXNzXG4gXHQtIGluZm9cbiBcdC0gd2FybmluZ1xuIFx0LSBlcnJvclxuICB0ZXh0OiB0aGUgdGV4dCB0byBkaXNwbGF5XG4gIG9wdGlvbnMgKG9wdGlvbmFsKToge1xuICBcdFx0aGlkZUluOiBtaWxsaXNlY29uZHMgdG8gaGlkZSBpdC4gLTEgZm9yIG5vdCBoaWRpbmcgaXQgYXQgYWxsLiBEZWZhdWx0IGlzIDUwMDBcbiAgfVxuICAqL1xuXHRzaG93SW5mbzogZnVuY3Rpb24gc2hvd0luZm8odHlwZSwgdGV4dCwgb3B0aW9ucykge1xuXHRcdGZvciAodmFyIGkgPSAwOyBpIDwgbnVtT2ZJbmZvQmxvY2tzOyBpKyspIHtcblx0XHRcdHZhciBpbmZvQmxvY2sgPSBpbmZvQmxvY2tzW2ldO1xuXHRcdFx0aWYgKCFpbmZvQmxvY2suaW5Vc2UpIHtcblx0XHRcdFx0aW5mb0Jsb2NrLmluVXNlID0gdHJ1ZTtcblx0XHRcdFx0aW5mb0Jsb2NrLmVsZW1lbnQuc3R5bGUuekluZGV4ID0gbGFzdEluZGV4O1xuXHRcdFx0XHRpbmZvQmxvY2suYWRkVGV4dCh0ZXh0KTtcblx0XHRcdFx0bGFzdEluZGV4ICs9IDE7XG5cdFx0XHRcdHZhciB0aW1lb3V0bVNlY3MgPSBkZWZhdWx0SGlkZUluO1xuXHRcdFx0XHR2YXIgYXV0b0Nsb3NlID0gdHJ1ZTtcblx0XHRcdFx0aWYgKG9wdGlvbnMpIHtcblx0XHRcdFx0XHRpZiAob3B0aW9ucy5oaWRlSW4gIT0gbnVsbCAmJiBvcHRpb25zLmhpZGVJbiAhPSB1bmRlZmluZWQgJiYgb3B0aW9ucy5oaWRlSW4gIT0gLTEpIHtcblx0XHRcdFx0XHRcdHRpbWVvdXRtU2VjcyA9IG9wdGlvbnMuaGlkZUluO1xuXHRcdFx0XHRcdH0gZWxzZSBpZiAob3B0aW9ucy5oaWRlSW4gPT09IC0xKSB7XG5cdFx0XHRcdFx0XHRhdXRvQ2xvc2UgPSBmYWxzZTtcblx0XHRcdFx0XHR9XG5cdFx0XHRcdH1cblx0XHRcdFx0aWYgKGF1dG9DbG9zZSkge1xuXHRcdFx0XHRcdGluZm9CbG9jay5hZGRUaW1lb3V0KHRpbWVvdXRtU2Vjcyk7XG5cdFx0XHRcdH1cblx0XHRcdFx0ZG9tLmFkZENsYXNzKGluZm9CbG9jay5lbGVtZW50LCAnYmFjLS0nICsgdHlwZSk7XG5cdFx0XHRcdGRvbS5hZGRDbGFzcyhpbmZvQmxvY2suZWxlbWVudCwgJ2JhYy0tYWN0aXZlLS0nKTtcblx0XHRcdFx0cmV0dXJuO1xuXHRcdFx0fVxuXHRcdH1cblx0fVxufTtcblxubW9kdWxlLmV4cG9ydHMgPSBJbmZvQ29udHJvbGxlcjsiLCJ2YXIgU3RvcmUgPSByZXF1aXJlKCcuL3N0b3JlLmpzJyk7XG5cbnZhciBMb2dnZXIgPSB7XG5cdFx0bG9nOiBmdW5jdGlvbiBsb2cod2hhdCkge1xuXHRcdFx0XHRpZiAoIVN0b3JlLmxvZ3NFbmFibGVkKCkpIHtcblx0XHRcdFx0XHRcdHJldHVybiBmYWxzZTtcblx0XHRcdFx0fSBlbHNlIHtcblx0XHRcdFx0XHRcdExvZ2dlci5sb2cgPSBjb25zb2xlLmxvZy5iaW5kKGNvbnNvbGUpO1xuXHRcdFx0XHRcdFx0TG9nZ2VyLmxvZyh3aGF0KTtcblx0XHRcdFx0fVxuXHRcdH0sXG5cdFx0ZXJyb3I6IGZ1bmN0aW9uIGVycm9yKGVycikge1xuXHRcdFx0XHRpZiAoIVN0b3JlLmxvZ3NFbmFibGVkKCkpIHtcblx0XHRcdFx0XHRcdHJldHVybiBmYWxzZTtcblx0XHRcdFx0fSBlbHNlIHtcblx0XHRcdFx0XHRcdExvZ2dlci5lcnJvciA9IGNvbnNvbGUuZXJyb3IuYmluZChjb25zb2xlKTtcblx0XHRcdFx0XHRcdExvZ2dlci5lcnJvcihlcnIpO1xuXHRcdFx0XHR9XG5cdFx0fVxufTtcblxubW9kdWxlLmV4cG9ydHMgPSBMb2dnZXI7IiwidmFyIHNldHRpbmdzID0ge1xuXHR0b3RhbFBhZ2VCdXR0b25zTnVtYmVyOiA4XG59O1xuXG52YXIgUGFnaW5hdG9yID0ge1xuXHRzZXRTZXR0aW5nczogZnVuY3Rpb24gc2V0U2V0dGluZ3Moc2V0dGluZykge1xuXHRcdGZvciAodmFyIGtleSBpbiBzZXR0aW5nKSB7XG5cdFx0XHRzZXR0aW5nc1trZXldID0gc2V0dGluZ1trZXldO1xuXHRcdH1cblx0fSxcblxuXHRnZXRQYWdlc1JhbmdlOiBmdW5jdGlvbiBnZXRQYWdlc1JhbmdlKGN1cnBhZ2UsIHRvdGFsUGFnZXNPblJlc3VsdFNldCkge1xuXHRcdHZhciBwYWdlUmFuZ2UgPSBbeyBwYWdlbm86IGN1cnBhZ2UsIHJ1bm5pbmdwYWdlOiB0cnVlIH1dO1xuXHRcdHZhciBoYXNuZXh0b25yaWdodCA9IHRydWU7XG5cdFx0dmFyIGhhc25leHRvbmxlZnQgPSB0cnVlO1xuXHRcdHZhciBpID0gMTtcblx0XHR3aGlsZSAocGFnZVJhbmdlLmxlbmd0aCA8IHNldHRpbmdzLnRvdGFsUGFnZUJ1dHRvbnNOdW1iZXIgJiYgKGhhc25leHRvbnJpZ2h0IHx8IGhhc25leHRvbmxlZnQpKSB7XG5cdFx0XHRpZiAoaGFzbmV4dG9ubGVmdCkge1xuXHRcdFx0XHRpZiAoY3VycGFnZSAtIGkgPiAwKSB7XG5cdFx0XHRcdFx0cGFnZVJhbmdlLnB1c2goeyBwYWdlbm86IGN1cnBhZ2UgLSBpLCBydW5uaW5ncGFnZTogZmFsc2UgfSk7XG5cdFx0XHRcdH0gZWxzZSB7XG5cdFx0XHRcdFx0aGFzbmV4dG9ubGVmdCA9IGZhbHNlO1xuXHRcdFx0XHR9XG5cdFx0XHR9XG5cdFx0XHRpZiAoaGFzbmV4dG9ucmlnaHQpIHtcblx0XHRcdFx0aWYgKGN1cnBhZ2UgKyBpIC0gMSA8IHRvdGFsUGFnZXNPblJlc3VsdFNldCkge1xuXHRcdFx0XHRcdHBhZ2VSYW5nZS5wdXNoKHsgcGFnZW5vOiBjdXJwYWdlICsgaSwgcnVubmluZ3BhZ2U6IGZhbHNlIH0pO1xuXHRcdFx0XHR9IGVsc2Uge1xuXHRcdFx0XHRcdGhhc25leHRvbnJpZ2h0ID0gZmFsc2U7XG5cdFx0XHRcdH1cblx0XHRcdH1cblx0XHRcdGkrKztcblx0XHR9XG5cblx0XHR2YXIgaGFzTmV4dCA9IGN1cnBhZ2UgPCB0b3RhbFBhZ2VzT25SZXN1bHRTZXQ7XG5cdFx0dmFyIGhhc1ByZXZpb3VzID0gY3VycGFnZSA+IDE7XG5cblx0XHRyZXR1cm4ge1xuXHRcdFx0YnV0dG9uczogcGFnZVJhbmdlLnNvcnQoZnVuY3Rpb24gKGl0ZW1BLCBpdGVtQikge1xuXHRcdFx0XHRyZXR1cm4gaXRlbUEucGFnZW5vIC0gaXRlbUIucGFnZW5vO1xuXHRcdFx0fSksXG5cdFx0XHRoYXNOZXh0OiBoYXNOZXh0LFxuXHRcdFx0aGFzUHJldmlvdXM6IGhhc1ByZXZpb3VzXG5cdFx0fTtcblx0fVxufTtcblxubW9kdWxlLmV4cG9ydHMgPSBQYWdpbmF0b3I7IiwiJ3VzZSBzdHJpY3QnO1xuXG52YXIgU3RvcmUgPSByZXF1aXJlKCcuL3N0b3JlLmpzJyk7XG52YXIgTG9nZ2VyID0gcmVxdWlyZSgnLi9sb2dnZXIuanMnKTtcblxudmFyIGF2YWlsYWJsZUxpc3RlbmVycyA9IHtcblx0c2VhcmNoS2V5VXA6IHtcblx0XHRpbmZvOiAnTGlzdGVuZXIgb24ga2V5VXAgb2Ygc2VhcmNoIGlucHV0IG9uIHRvcCBiYXInXG5cdH0sXG5cdHNlYXJjaEVudGVyOiB7XG5cdFx0aW5mbzogJ0xpc3RlbmVyIG9uIGVudGVyIGtleSBwcmVzc2VkIG9uIHNlYXJjaCBpbnB1dCBvbiB0b3AgYmFyJ1xuXHR9LFxuXHRzZWFyY2hPbkNoYW5nZToge1xuXHRcdGluZm86ICdMaXN0ZW5lciBvbiBjaGFuZ2Ugb2YgaW5wdXQgdmFsdWUnXG5cdH1cbn07XG5cbnZhciBQdWJTdWIgPSB7XG5cdGdldEF2YWlsYWJsZUxpc3RlbmVyczogZnVuY3Rpb24gZ2V0QXZhaWxhYmxlTGlzdGVuZXJzKCkge1xuXHRcdHJldHVybiBhdmFpbGFibGVMaXN0ZW5lcnM7XG5cdH0sXG5cblx0c3Vic2NyaWJlOiBmdW5jdGlvbiBzdWJzY3JpYmUoZXZlbnR0LCBmdW5jdCkge1xuXHRcdGlmIChldmVudHQgPT09IFwic2VhcmNoS2V5VXBcIikge1xuXHRcdFx0dmFyIGVsID0gZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoU3RvcmUuZ2V0U2VhcmNoSW5wdXRJZCgpKTtcblx0XHRcdGVsLmFkZEV2ZW50TGlzdGVuZXIoJ2tleXVwJywgZnVuY3QpO1xuXHRcdFx0cmV0dXJuIGZ1bmN0aW9uICgpIHtcblx0XHRcdFx0ZWwucmVtb3ZlRXZlbnRMaXN0ZW5lcigna2V5dXAnLCBmdW5jdCwgZmFsc2UpO1xuXHRcdFx0fTtcblx0XHR9IGVsc2UgaWYgKGV2ZW50dCA9PT0gJ3NlYXJjaEVudGVyJykge1xuXHRcdFx0dmFyIGhhbmRsaW5nRnVuY3QgPSBmdW5jdGlvbiBoYW5kbGluZ0Z1bmN0KGUpIHtcblx0XHRcdFx0aWYgKGUua2V5Q29kZSA9PT0gMTMpIHtcblx0XHRcdFx0XHRmdW5jdChlKTtcblx0XHRcdFx0fVxuXHRcdFx0fTtcblx0XHRcdGVsLmFkZEV2ZW50TGlzdGVuZXIoJ2tleWRvd24nLCBoYW5kbGluZ0Z1bmN0KTtcblx0XHRcdHJldHVybiBmdW5jdGlvbiAoKSB7XG5cdFx0XHRcdGVsLnJlbW92ZUV2ZW50TGlzdGVuZXIoJ2tleWRvd24nLCBoYW5kbGluZ0Z1bmN0LCBmYWxzZSk7XG5cdFx0XHR9O1xuXHRcdH0gZWxzZSBpZiAoZXZlbnR0ID09PSAnc2VhcmNoT25DaGFuZ2UnKSB7XG5cdFx0XHR2YXIgZWwgPSBkb2N1bWVudC5nZXRFbGVtZW50QnlJZChTdG9yZS5nZXRTZWFyY2hJbnB1dElkKCkpO1xuXHRcdFx0ZWwuYWRkRXZlbnRMaXN0ZW5lcignY2hhbmdlJywgZnVuY3QpO1xuXHRcdFx0cmV0dXJuIGZ1bmN0aW9uICgpIHtcblx0XHRcdFx0ZWwucmVtb3ZlRXZlbnRMaXN0ZW5lcigna2V5dXAnLCBmdW5jdCwgZmFsc2UpO1xuXHRcdFx0fTtcblx0XHR9IGVsc2Uge1xuXHRcdFx0TG9nZ2VyLmVycm9yKCdUaGUgZXZlbnQgeW91IHRyaWVkIHRvIHN1YnNjcmliZSBpcyBub3QgYXZhaWxhYmxlIGJ5IHRoZSBsaWJyYXJ5Jyk7XG5cdFx0XHRMb2dnZXIubG9nKCdUaGUgYXZhaWxhYmxlIGV2ZW50cyBhcmU6ICcsIGF2YWlsYWJsZUxpc3RlbmVycyk7XG5cdFx0XHRyZXR1cm4gZnVuY3Rpb24gKCkge307XG5cdFx0fVxuXHR9XG59O1xuXG5tb2R1bGUuZXhwb3J0cyA9IFB1YlN1YjsiLCJ2YXIgc3RhdGUgPSB7XG5cdGdlbmVyYWw6IHt9LFxuXHR1c2VyRGF0YToge30sXG5cdGNvbmZpZ3VyYXRpb246IHtcblx0XHRzZXNzaW9uRW5kcG9pbnQ6ICdzZXNzaW9uJyxcblx0XHRiYXNlVXJsOiAnL2FwaS92MSdcblx0fSxcblx0aHRtbFRlbXBsYXRlOiAnJyxcblx0YXBwczogbnVsbCxcblx0dmVyc2lvbk51bWJlcjogJycsXG5cdGRldjogZmFsc2UsXG5cdGZpbGVQaWNrZXI6IHtcblx0XHRzZWxlY3RlZEZpbGU6IG51bGxcblx0fSxcblx0YXBwSW5mbzogbnVsbCxcblx0c2Vzc2lvbkVuZHBvaW50QnlVc2VyOiBmYWxzZVxufTtcblxuZnVuY3Rpb24gYXNzZW1ibGUobGl0ZXJhbCwgcGFyYW1zKSB7XG5cdHJldHVybiBuZXcgRnVuY3Rpb24ocGFyYW1zLCBcInJldHVybiBgXCIgKyBsaXRlcmFsICsgXCJgO1wiKTtcbn1cblxudmFyIFN0b3JlID0ge1xuXHRnZXRTdGF0ZTogZnVuY3Rpb24gZ2V0U3RhdGUoKSB7XG5cdFx0cmV0dXJuIE9iamVjdC5hc3NpZ24oe30sIHN0YXRlKTtcblx0fSxcblxuXHRzZXRXaW5kb3dOYW1lOiBmdW5jdGlvbiBzZXRXaW5kb3dOYW1lKHduKSB7XG5cdFx0c3RhdGUuZ2VuZXJhbC53aW5kb3dOYW1lID0gd247XG5cdH0sXG5cblx0c2V0RGV2OiBmdW5jdGlvbiBzZXREZXYoZGV2KSB7XG5cdFx0c3RhdGUuZGV2ID0gZGV2O1xuXHR9LFxuXG5cdHNldFVybFZlcnNpb25QcmVmaXg6IGZ1bmN0aW9uIHNldFVybFZlcnNpb25QcmVmaXgocHJlZml4KSB7XG5cdFx0c3RhdGUuY29uZmlndXJhdGlvbi5iYXNlVXJsID0gcHJlZml4O1xuXHR9LFxuXG5cdGdldERldlVybFBhcnQ6IGZ1bmN0aW9uIGdldERldlVybFBhcnQoKSB7XG5cdFx0aWYgKHN0YXRlLmRldikge1xuXHRcdFx0cmV0dXJuIFwic2FuZGJveC9cIjtcblx0XHR9IGVsc2Uge1xuXHRcdFx0cmV0dXJuIFwiXCI7XG5cdFx0fVxuXHR9LFxuXG5cdGdldEZ1bGxCYXNlVXJsOiBmdW5jdGlvbiBnZXRGdWxsQmFzZVVybCgpIHtcblx0XHRyZXR1cm4gc3RhdGUuY29uZmlndXJhdGlvbi5yb290VXJsICsgc3RhdGUuY29uZmlndXJhdGlvbi5iYXNlVXJsICsgU3RvcmUuZ2V0RGV2VXJsUGFydCgpO1xuXHR9LFxuXG5cdC8qXG4gIGNvbmY6XG4gIC0gaGVhZGVyRGl2SWRcbiAgLSBpbmNsdWRlQXBwc01lbnVcbiAgKi9cblx0c2V0Q29uZmlndXJhdGlvbjogZnVuY3Rpb24gc2V0Q29uZmlndXJhdGlvbihjb25mKSB7XG5cdFx0Zm9yICh2YXIga2V5IGluIGNvbmYpIHtcblx0XHRcdHN0YXRlLmNvbmZpZ3VyYXRpb25ba2V5XSA9IGNvbmZba2V5XTtcblx0XHR9XG5cdH0sXG5cblx0c2V0VmVyc2lvbk51bWJlcjogZnVuY3Rpb24gc2V0VmVyc2lvbk51bWJlcih2ZXJzaW9uKSB7XG5cdFx0c3RhdGUudmVyc2lvbk51bWJlciA9IHZlcnNpb247XG5cdH0sXG5cblx0Z2V0VmVyc2lvbk51bWJlcjogZnVuY3Rpb24gZ2V0VmVyc2lvbk51bWJlcigpIHtcblx0XHRyZXR1cm4gc3RhdGUudmVyc2lvbk51bWJlcjtcblx0fSxcblxuXHRnZXRBcHBzVmlzaWJsZTogZnVuY3Rpb24gZ2V0QXBwc1Zpc2libGUoKSB7XG5cdFx0aWYgKHN0YXRlLmNvbmZpZ3VyYXRpb24uYXBwc1Zpc2libGUgPT09IG51bGwgfHwgc3RhdGUuY29uZmlndXJhdGlvbi5hcHBzVmlzaWJsZSA9PT0gdW5kZWZpbmVkKSB7XG5cdFx0XHRyZXR1cm4gdHJ1ZTtcblx0XHR9IGVsc2Uge1xuXHRcdFx0cmV0dXJuIHN0YXRlLmNvbmZpZ3VyYXRpb24uYXBwc1Zpc2libGU7XG5cdFx0fVxuXHR9LFxuXG5cdHNldEFwcHNWaXNpYmxlOiBmdW5jdGlvbiBzZXRBcHBzVmlzaWJsZShhcHBzVmlzaWJsZSkge1xuXHRcdHN0YXRlLmNvbmZpZ3VyYXRpb24uYXBwc1Zpc2libGUgPSBhcHBzVmlzaWJsZTtcblx0fSxcblxuXHRzZXRIVE1MVGVtcGxhdGU6IGZ1bmN0aW9uIHNldEhUTUxUZW1wbGF0ZSh0ZW1wbGF0ZSkge1xuXHRcdHN0YXRlLmh0bWxUZW1wbGF0ZSA9IHRlbXBsYXRlO1xuXHR9LFxuXG5cdHNldEFwcHM6IGZ1bmN0aW9uIHNldEFwcHMoYXBwcykge1xuXHRcdHN0YXRlLmFwcHMgPSBhcHBzO1xuXHR9LFxuXG5cdHNldEFwcEluZm86IGZ1bmN0aW9uIHNldEFwcEluZm8oYXBwSW5mbykge1xuXHRcdHN0YXRlLmFwcEluZm8gPSBhcHBJbmZvO1xuXHR9LFxuXG5cdGdldEFwcEluZm86IGZ1bmN0aW9uIGdldEFwcEluZm8oKSB7XG5cdFx0cmV0dXJuIHN0YXRlLmFwcEluZm87XG5cdH0sXG5cblx0Z2V0TG9naW5Vcmw6IGZ1bmN0aW9uIGdldExvZ2luVXJsKCkge1xuXHRcdHJldHVybiBzdGF0ZS5jb25maWd1cmF0aW9uLnJvb3RVcmwgKyBzdGF0ZS5jb25maWd1cmF0aW9uLmxvZ2luVXJsOyAvLyArIFwiP1wiICsgc3RhdGUuY29uZmlndXJhdGlvbi5yZWRpcmVjdFVybFBhcmFtICsgXCI9XCIgKyB3aW5kb3cubG9jYXRpb24uaHJlZjtcblx0fSxcblxuXHRnZXRBdXRoZW50aWNhdGlvbkVuZHBvaW50OiBmdW5jdGlvbiBnZXRBdXRoZW50aWNhdGlvbkVuZHBvaW50KCkge1xuXHRcdGlmIChzdGF0ZS5zZXNzaW9uRW5kcG9pbnRCeVVzZXIpIHtcblx0XHRcdHJldHVybiBTdG9yZS5nZXRGdWxsQmFzZVVybCgpICsgc3RhdGUuY29uZmlndXJhdGlvbi5zZXNzaW9uRW5kcG9pbnQ7XG5cdFx0fVxuXHRcdHJldHVybiBTdG9yZS5nZXRGdWxsQmFzZVVybCgpICsgc3RhdGUuY29uZmlndXJhdGlvbi5zZXNzaW9uRW5kcG9pbnQ7XG5cdH0sXG5cblx0Z2V0U3dpdGNoQWNjb3VudEVuZHBvaW50OiBmdW5jdGlvbiBnZXRTd2l0Y2hBY2NvdW50RW5kcG9pbnQoYWNjb3VudElkKSB7XG5cdFx0cmV0dXJuIFN0b3JlLmdldEZ1bGxCYXNlVXJsKCkgKyAnYWNjb3VudHMvc3dpdGNoLycgKyBhY2NvdW50SWQ7XG5cdH0sXG5cblx0Z2V0QXBwc0VuZHBvaW50OiBmdW5jdGlvbiBnZXRBcHBzRW5kcG9pbnQoKSB7XG5cdFx0cmV0dXJuIFN0b3JlLmdldEZ1bGxCYXNlVXJsKCkgKyAnYXBwcyc7XG5cdH0sXG5cblx0Z2V0Q2xvdWRpbmFyeUVuZHBvaW50OiBmdW5jdGlvbiBnZXRDbG91ZGluYXJ5RW5kcG9pbnQoKSB7XG5cdFx0cmV0dXJuIFN0b3JlLmdldEZ1bGxCYXNlVXJsKCkgKyAnYXNzZXRzJztcblx0fSxcblxuXHRsb2dzRW5hYmxlZDogZnVuY3Rpb24gbG9nc0VuYWJsZWQoKSB7XG5cdFx0cmV0dXJuIHN0YXRlLmNvbmZpZ3VyYXRpb24ubG9ncztcblx0fSxcblxuXHRnZXRTZWFyY2hJbnB1dElkOiBmdW5jdGlvbiBnZXRTZWFyY2hJbnB1dElkKCkge1xuXHRcdHJldHVybiBzdGF0ZS5jb25maWd1cmF0aW9uLnNlYXJjaElucHV0SWQ7XG5cdH0sXG5cblx0c2V0SFRNTENvbnRhaW5lcjogZnVuY3Rpb24gc2V0SFRNTENvbnRhaW5lcihpZCkge1xuXHRcdHN0YXRlLmNvbmZpZ3VyYXRpb24uaGVhZGVyRGl2SWQgPSBpZDtcblx0fSxcblxuXHRnZXRIVExNQ29udGFpbmVyOiBmdW5jdGlvbiBnZXRIVExNQ29udGFpbmVyKCkge1xuXHRcdGlmIChzdGF0ZS5jb25maWd1cmF0aW9uLmhlYWRlckRpdklkKSB7XG5cdFx0XHRyZXR1cm4gc3RhdGUuY29uZmlndXJhdGlvbi5oZWFkZXJEaXZJZDtcblx0XHR9IGVsc2Uge1xuXHRcdFx0cmV0dXJuIFwicHBzZGstY29udGFpbmVyXCI7XG5cdFx0fVxuXHR9LFxuXG5cdGdldEhUTUw6IGZ1bmN0aW9uIGdldEhUTUwoKSB7XG5cdFx0cmV0dXJuIHN0YXRlLmh0bWxUZW1wbGF0ZTtcblx0fSxcblxuXHRzZXRTZXNzaW9uRW5kcG9pbnQ6IGZ1bmN0aW9uIHNldFNlc3Npb25FbmRwb2ludChzZXNzaW9uRW5kcG9pbnQpIHtcblx0XHRpZiAoc2Vzc2lvbkVuZHBvaW50LmluZGV4T2YoJy8nKSA9PT0gMCkge1xuXHRcdFx0c2Vzc2lvbkVuZHBvaW50ID0gc2Vzc2lvbkVuZHBvaW50LnN1YnN0cmluZygxLCBzZXNzaW9uRW5kcG9pbnQubGVuZ3RoIC0gMSk7XG5cdFx0fVxuXHRcdHN0YXRlLnNlc3Npb25FbmRwb2ludEJ5VXNlciA9IHRydWU7XG5cdFx0c3RhdGUuY29uZmlndXJhdGlvbi5zZXNzaW9uRW5kcG9pbnQgPSBzZXNzaW9uRW5kcG9pbnQ7XG5cdH0sXG5cblx0Z2V0V2luZG93TmFtZTogZnVuY3Rpb24gZ2V0V2luZG93TmFtZSgpIHtcblx0XHRyZXR1cm4gc3RhdGUuZ2VuZXJhbC53aW5kb3dOYW1lO1xuXHR9LFxuXG5cdHNldFVzZXJEYXRhOiBmdW5jdGlvbiBzZXRVc2VyRGF0YSh1c2VyRGF0YSkge1xuXHRcdHN0YXRlLnVzZXJEYXRhID0gdXNlckRhdGE7XG5cdH0sXG5cblx0Z2V0VXNlckRhdGE6IGZ1bmN0aW9uIGdldFVzZXJEYXRhKCkge1xuXHRcdHJldHVybiBzdGF0ZS51c2VyRGF0YTtcblx0fSxcblxuXHRzZXRSb290VXJsOiBmdW5jdGlvbiBzZXRSb290VXJsKHJvb3RVcmwpIHtcblx0XHRzdGF0ZS5jb25maWd1cmF0aW9uLnJvb3RVcmwgPSByb290VXJsLnJlcGxhY2UoL1xcLz8kLywgJy8nKTs7XG5cdH0sXG5cblx0Z2V0Um9vdFVybDogZnVuY3Rpb24gZ2V0Um9vdFVybCgpIHtcblx0XHRyZXR1cm4gc3RhdGUuY29uZmlndXJhdGlvbi5yb290VXJsO1xuXHR9LFxuXG5cdGdldEF2YXRhclVwbG9hZFVybDogZnVuY3Rpb24gZ2V0QXZhdGFyVXBsb2FkVXJsKCkge1xuXHRcdHJldHVybiBTdG9yZS5nZXRGdWxsQmFzZVVybCgpICsgJ2Fzc2V0cy91cGxvYWQnO1xuXHR9LFxuXG5cdGdldEF2YXRhclVwZGF0ZVVybDogZnVuY3Rpb24gZ2V0QXZhdGFyVXBkYXRlVXJsKCkge1xuXHRcdHJldHVybiBTdG9yZS5nZXRGdWxsQmFzZVVybCgpICsgJ3VzZXJzL2F2YXRhcic7XG5cdH1cbn07XG5cbm1vZHVsZS5leHBvcnRzID0gU3RvcmU7Il19
