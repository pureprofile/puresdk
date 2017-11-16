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
	if (document.getElementById('bac--puresdk--apps--opener--')) {
		document.getElementById('bac--puresdk--apps--opener--').addEventListener('click', function (e) {
			e.stopPropagation();
			// Dom.toggleClass(document.getElementById('bac--puresdk-apps-container--'), 'active');
			window.location.href = Store.getRootUrl();
		});
	}

	document.getElementById('bac--user-avatar-top').addEventListener('click', function (e) {
		e.stopPropagation();
		// Dom.removeClass(document.getElementById('bac--puresdk-apps-container--'), 'active');
		Dom.toggleClass(document.getElementById('bac--puresdk-user-sidebar--'), 'active');
	});

	window.addEventListener('click', function (e) {
		// Dom.removeClass(document.getElementById('bac--puresdk-apps-container--'), 'active');
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
					// PPBA.renderApps(result.apps);
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

	// renderApps: (apps) => {
	//   let appTemplate = (app) => `
	// 		<a href="#" style="background: #${app.color}"><i class="${app.icon}"></i></a>
	// 		<span class="bac--app-name">${app.name}</span>
	// 		<span class="bac--app-description">${app.descr}</span>
	// 	`;
	//   for(let i=0; i<apps.length; i++){
	// 		let app = apps[i];
	// 		let div = document.createElement("div");
	// 		div.className = "bac--apps";
	// 		div.innerHTML = appTemplate(app);
	// 		div.onclick = (e) => {
	// 			 e.preventDefault();
	// 			 window.location.href = app.application_url;
	// 		}
	// 		document.getElementById("bac--puresdk-apps-container--").appendChild(div);
	//   }
	// },

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
		var blocksTemplate = function blocksTemplate(index) {
			return '\n\t\t\t\t <div class="bac--puresdk-info-box--" id="bac--puresdk-info-box--' + index + '">\n\t\t\t\t \t<div class="bac--timer" id="bac--timer' + index + '"></div>\n\t\t\t\t\t <div class="bac--inner-info-box--">\n\t\t\t\t\t \t\t<div class="bac--info-icon-- fa-success"></div>\n\t\t\t\t\t \t\t<div class="bac--info-icon-- fa-warning"></div>\n\t\t\t\t\t \t\t<div class="bac--info-icon-- fa-info-1"></div>\n\t\t\t\t\t \t\t<div class="bac--info-icon-- fa-error"></div>\n\t\t\t\t\t \t\t <div class="bac--info-main-text--" id="bac--info-main-text--' + index + '"></div>\n\t\t\t\t\t \t\t <div class="bac--info-close-button-- fa-close-1" id="bac--info-close-button--' + index + '"></div>\n\t\t\t\t\t</div>\n\t\t\t\t</div>\n\t\t  ';
		};

		var infoBlocksWrapper = document.getElementById('bac--info-blocks-wrapper--');
		var innerHtml = '';
		for (var i = 1; i < 5; i++) {
			innerHtml += blocksTemplate(i);
		}

		infoBlocksWrapper.innerHTML = innerHtml;
	},

	renderVersionNumber: function renderVersionNumber(version) {
		document.getElementById('puresdk-version-number').innerHTML = version;
	},

	styleAccount: function styleAccount(account) {
		var appInfo = Store.getAppInfo();
		if (appInfo === null) {
			var logo = document.createElement('img');
			logo.src = account.sdk_logo_icon;
			document.getElementById('bac--puresdk-account-logo--').appendChild(logo);
			document.getElementById('bac--puresdk-account-logo--').onclick = function (e) {
				//Logger.log(Store.getRootUrl());
				window.location.href = Store.getRootUrl();
			};
		} else {
			var appOpenerTemplate = function appOpenerTemplate(appInformation) {
				return '\n\t \t  \t \t\t<div id="bac--puresdk--apps--opener--">\n                    <i class="fa fa-squares" id="bac--puresdk-apps-icon--"></i>\n                    <div id="bac--puresdk-apps-name--" class="bac--puresdk-apps-name--">apps</div>\n                    <a href="' + appInformation.root + '" id="app-name-link-to-root">' + appInformation.name + '</a>\n                </div>\n\t \t  \t \t';
			};
			document.getElementById('bac--puresdk-account-logo--').innerHTML = appOpenerTemplate(appInfo);
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
 * version: 2.6.11
 * date: 2017-11-16
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
    "loginUrl": "api/v1/oauth2",
    "searchInputId": "--puresdk--search--input--",
    "redirectUrlParam": "redirect_url"
});
ppba.setHTMLTemplate('<header class="bac--header-apps" id="bac--puresdk-bac--header-apps--">\n    <div class="bac--container">\n        <div class="bac--logo" id="bac--puresdk-account-logo--"></div>\n        <div class="bac--user-actions">\n            <svg id="bac--puresdk--loader--" width="38" height="38" viewBox="0 0 44 44" xmlns="http://www.w3.org/2000/svg" stroke="#fff" style="\n    margin-right: 10px;\n">\n                <g fill="none" fill-rule="evenodd" stroke-width="2">\n                    <circle cx="22" cy="22" r="16.6437">\n                        <animate attributeName="r" begin="0s" dur="1.8s" values="1; 20" calcMode="spline" keyTimes="0; 1" keySplines="0.165, 0.84, 0.44, 1" repeatCount="indefinite"></animate>\n                        <animate attributeName="stroke-opacity" begin="0s" dur="1.8s" values="1; 0" calcMode="spline" keyTimes="0; 1" keySplines="0.3, 0.61, 0.355, 1" repeatCount="indefinite"></animate>\n                    </circle>\n                    <circle cx="22" cy="22" r="19.9282">\n                        <animate attributeName="r" begin="bac-0.9s" dur="1.8s" values="1; 20" calcMode="spline" keyTimes="0; 1" keySplines="0.165, 0.84, 0.44, 1" repeatCount="indefinite"></animate>\n                        <animate attributeName="stroke-opacity" begin="bac-0.9s" dur="1.8s" values="1; 0" calcMode="spline" keyTimes="0; 1" keySplines="0.3, 0.61, 0.355, 1" repeatCount="indefinite"></animate>\n                    </circle>\n                </g>\n            </svg>\n            <div class="bac--user-apps" id="bac--puresdk-apps-section--">\n                <!--<div id="bac&#45;&#45;puresdk&#45;&#45;apps&#45;&#45;opener&#45;&#45;">-->\n                    <!--<i class="fa fa-squares" id="bac&#45;&#45;puresdk-apps-icon&#45;&#45;"></i>-->\n                    <!--<div class="bac&#45;&#45;puresdk-apps-name&#45;&#45;">apps</div>-->\n                <!--</div>-->\n                <!--<div class="bac&#45;&#45;apps-container" id="bac&#45;&#45;puresdk-apps-container&#45;&#45;">-->\n                    <!--<div class="bac&#45;&#45;apps-arrow"></div>-->\n                <!--</div>-->\n            </div>\n            <!--<div class="bac&#45;&#45;user-notifications">-->\n                <!--<div class="bac&#45;&#45;user-notifications-count">1</div>-->\n                <!--<i class="fa fa-bell-o"></i>-->\n            <!--</div>-->\n            <div class="bac--user-avatar" id="bac--user-avatar-top">\n                <span class="bac--user-avatar-name" id="bac--puresdk-user-avatar--"></span>\n                <div id="bac--image-container-top"></div>\n            </div>\n        </div>\n    </div>\n    <div id="bac--info-blocks-wrapper--"></div>\n</header>\n<div class="bac--user-sidebar" id="bac--puresdk-user-sidebar--">\n    <div id="bac--puresdk-user-details--"></div>\n    <!--<div class="bac&#45;&#45;user-sidebar-info">-->\n        <!--<div class="bac&#45;&#45;user-image"><i class="fa fa-camera"></i></div>-->\n        <!--<div class="bac&#45;&#45;user-name">Curtis Bartlett</div>-->\n        <!--<div class="bac&#45;&#45;user-email">cbartlett@pureprofile.com</div>-->\n    <!--</div>-->\n    <div class="bac--user-apps" id="bac--puresdk-user-businesses--">\n        <!--<div class="bac&#45;&#45;user-list-item">-->\n            <!--<img src="http://lorempixel.com/40/40" alt="">-->\n            <!--<div class="bac-user-app-details">-->\n                <!--<span></span>-->\n                <!--<span>15 team members</span>-->\n            <!--</div>-->\n        <!--</div>-->\n    </div>\n    <div class="bac--user-account-settings">\n        <!--<div class="bac-user-acount-list-item">-->\n            <!--<i class="fa fa-cog-line"></i>-->\n            <!--<a href="#">Account Security</a>-->\n        <!--</div>-->\n        <div class="bac-user-acount-list-item">\n            <i class="fa fa-login-line"></i>\n            <a href="/api/v1/sign-off">Log out</a>\n        </div>\n\n        <div id="puresdk-version-number" class="puresdk-version-number"></div>\n    </div>\n</div>\n\n\n<div class="bac--custom-modal add-question-modal --is-open" id="bac--cloudinary--modal">\n    <div class="custom-modal__wrapper">\n        <div class="custom-modal__content">\n            <h3>Add image</h3>\n            <a class="custom-modal__close-btn" id="bac--cloudinary--closebtn"><i class="fa fa-times-circle"></i></a>\n        </div>\n\n        <div class="custom-modal__content">\n            <div class="bac-search --icon-left">\n                <input id="bac--cloudinary--search-input" type="search" name="search" placeholder="Search for images..."/>\n                <div class="bac-search__icon"><i class="fa fa-search"></i></div>\n            </div>\n            <br/>\n\n            <div class="back-button" id="bac--cloudinary--back-button-container">\n                <a class="goBack" id="bac--cloudinary--go-back"><i class="fa fa-angle-left"></i>Go Back</a>\n            </div>\n\n            <br/>\n            <div class="cloud-images">\n                <div class="cloud-images__container" id="bac--cloudinary-itams-container"></div>\n\n                <div class="cloud-images__pagination" id="bac--cloudinary-pagination-container">\n                    <ul id="bac--cloudinary-actual-pagination-container"></ul>\n                </div>\n\n            </div>\n        </div>\n    </div>\n</div>\n\n<input style="display:none" type=\'file\' id=\'bac---puresdk-avatar-file\'>\n<input style="display:none" type=\'button\' id=\'bac---puresdk-avatar-submit\' value=\'Upload!\'>');
ppba.setVersionNumber('2.6.11');

window.PURESDK = ppba;

var css = 'html,body,div,span,applet,object,iframe,h1,h2,h3,h4,h5,h6,p,blockquote,pre,a,abbr,acronym,address,big,cite,code,del,dfn,em,img,ins,kbd,q,s,samp,small,strike,strong,sub,sup,tt,var,b,u,i,center,dl,dt,dd,ol,ul,li,fieldset,form,label,legend,table,caption,tbody,tfoot,thead,tr,th,td,article,aside,canvas,details,embed,figure,figcaption,footer,header,hgroup,menu,nav,output,ruby,section,summary,time,mark,audio,video{margin:0;padding:0;border:0;font-size:100%;font:inherit;vertical-align:baseline}article,aside,details,figcaption,figure,footer,header,hgroup,menu,nav,section{display:block}body{line-height:1}ol,ul{list-style:none}blockquote,q{quotes:none}blockquote:before,blockquote:after,q:before,q:after{content:"";content:none}table{border-collapse:collapse;border-spacing:0}body{overflow-x:hidden}#bac-wrapper{font-family:"Verdana", arial, sans-serif;color:white;min-height:100vh;position:relative}.bac--container{max-width:1160px;margin:0 auto}.bac--container #app-name-link-to-root{display:block;position:absolute;left:65px;top:4px;font-size:1.4em;width:150px;color:white;text-decoration:none}.bac--header-apps{position:absolute;width:100%;height:50px;background-color:#475369;padding:5px 10px;z-index:9999999}.bac--header-apps .bac--container{height:100%;display:flex;align-items:center;justify-content:space-between}.bac--header-search{position:relative}.bac--header-search input{color:#fff;font-size:14px;height:35px;background-color:#6b7586;padding:0 5px 0 10px;border:none;border-radius:3px;min-width:400px;width:100%}.bac--header-search input:focus{outline:none}.bac--header-search input::-webkit-input-placeholder{font-style:normal !important;text-align:center;color:#fff;font-size:14px;font-weight:300;letter-spacing:0.5px}.bac--header-search input::-moz-placeholder{font-style:normal !important;text-align:center;color:#fff;font-size:14px;font-weight:300;letter-spacing:0.5px}.bac--header-search input:-ms-input-placeholder{font-style:normal !important;text-align:center;color:#fff;font-size:14px;font-weight:300;letter-spacing:0.5px}.bac--header-search i{position:absolute;top:8px;right:10px}.bac--user-actions{display:flex;align-items:center}.bac--user-actions>div{cursor:pointer;color:white}.bac--user-actions .bac--user-notifications{position:relative}.bac--user-actions .bac--user-notifications i{font-size:20px}.bac--user-actions #bac--puresdk--loader--{display:none}.bac--user-actions #bac--puresdk--loader--.bac--puresdk-visible{display:block}.bac--user-actions .bac--user-notifications-count{position:absolute;display:inline-block;height:15px;width:15px;line-height:15px;color:#fff;font-size:10px;text-align:center;background-color:#fc3b30;border-radius:50%;top:-5px;left:-5px}.bac--user-actions .bac--user-avatar,.bac--user-actions .bac--user-notifications{margin-left:20px}.bac--user-actions .bac--user-avatar{position:relative;overflow:hidden;border-radius:50%}.bac--user-actions .bac--user-avatar #bac--image-container-top{width:100%;heigth:100%;position:absolute;top:0;left:0;z-index:1;display:none}.bac--user-actions .bac--user-avatar #bac--image-container-top img{width:100%;height:100%}.bac--user-actions .bac--user-avatar #bac--image-container-top.bac--puresdk-visible{display:block}.bac--user-actions .bac--user-avatar-name{color:#fff;background-color:#adadad;display:inline-block;height:35px;width:35px;line-height:35px;text-align:center;font-size:14px}.bac--user-apps{position:relative}#bac--puresdk-apps-icon--{width:20px;display:inline-block;text-align:center;font-size:16px}.bac--puresdk-apps-name--{font-size:9px;width:20px;text-align:center}#bac--puresdk-user-businesses--{height:calc(100vh - 458px);overflow:auto}.bac--apps-container{background:#fff;position:absolute;top:45px;right:-40px;display:flex;width:360px;flex-wrap:wrap;border-radius:10px;padding:30px;justify-content:space-between;text-align:center;-webkit-box-shadow:0 0 10px 2px rgba(0,0,0,0.2);box-shadow:0 0 10px 2px rgba(0,0,0,0.2);opacity:0;visibility:hidden;transition:all 0.4s ease;max-height:566px;overflow:auto}.bac--apps-container.active{opacity:1;visibility:visible}.bac--apps-container .bac--apps-arrow{position:absolute;display:block;height:20px;width:20px;top:-10px;right:36px;background:#fff;transform:rotate(-45deg);z-index:1}.bac--apps-container .bac--apps{width:32%;display:flex;font-size:30px;margin-bottom:40px;text-align:center;justify-content:center;flex-wrap:wrap}.bac--apps-container .bac--apps a{display:block;color:#fff;text-decoration:none;width:65px;height:65px;padding-top:3px;line-height:65px;text-align:center;border-radius:10px;-webkit-box-shadow:0 0 5px 0 rgba(0,0,0,0.2);box-shadow:0 0 5px 0 rgba(0,0,0,0.2)}.bac--apps-container .bac--apps .bac--app-name{width:100%;color:#000;font-size:14px;padding:10px 0 5px 0}.bac--apps-container .bac--apps .bac--app-description{color:#919191;font-size:12px;font-style:italic;line-height:1.3em}.bac--user-sidebar{font-family:"Verdana", arial, sans-serif;color:white;height:calc(100vh - 50px);background-color:#515f77;box-sizing:border-box;width:320px;position:fixed;top:50px;right:0;z-index:999999;padding-top:10px;opacity:0;transform:translateX(100%);transition:all 0.4s ease}.bac--user-sidebar.active{opacity:1;transform:translateX(0%);-webkit-box-shadow:-1px 0px 12px 0px rgba(0,0,0,0.75);-moz-box-shadow:-1px 3px 12px 0px rgba(0,0,0,0.75);box-shadow:-1px 0px 12px 0px rgba(0,0,0,0.75)}.bac--user-sidebar .bac--user-list-item{display:flex;position:relative;cursor:pointer;align-items:center;padding:10px 10px 10px 40px;border-bottom:1px solid rgba(255,255,255,0.1)}.bac--user-sidebar .bac--user-list-item:hover{background-color:rgba(255,255,255,0.1)}.bac--user-sidebar .bac--user-list-item .bac--selected-acount-indicator{position:absolute;right:0;height:100%;width:8px}.bac--user-sidebar .bac--user-list-item .bac--user-list-item-image{width:40px;height:40px;border-radius:3px;border:2px solid #fff;margin-right:20px;display:flex;align-items:center;justify-content:center}.bac--user-sidebar .bac--user-list-item .bac--user-list-item-image>img{width:auto;height:auto;max-width:100%;max-height:100%}.bac--user-sidebar .bac--user-list-item span{width:100%;display:block;margin-bottom:5px}.bac--user-sidebar .bac-user-app-details span{font-size:12px}.bac--user-sidebar .puresdk-version-number{width:100%;text-align:right;padding-right:10px;position:absolute;font-size:8px;opacity:0.5;right:0;bottom:0}.bac--user-sidebar-info{display:flex;justify-content:center;flex-wrap:wrap;text-align:center;padding:10px 20px 15px}.bac--user-sidebar-info .bac--user-image{border:1px #adadad solid;overflow:hidden;border-radius:50%;position:relative;cursor:pointer;display:inline-block;height:80px;width:80px;line-height:80px;text-align:center;color:#fff;border-radius:50%;background-color:#adadad;margin-bottom:15px}.bac--user-sidebar-info .bac--user-image #bac--user-image-file{display:none;position:absolute;z-index:1;top:0;left:0;width:100%;height:100%}.bac--user-sidebar-info .bac--user-image #bac--user-image-file img{width:100%;height:100%}.bac--user-sidebar-info .bac--user-image #bac--user-image-file.bac--puresdk-visible{display:block}.bac--user-sidebar-info .bac--user-image #bac--user-image-upload-progress{position:absolute;padding-top:10px;top:0;background:#666;z-index:4;display:none;width:100%;height:100%}.bac--user-sidebar-info .bac--user-image #bac--user-image-upload-progress.bac--puresdk-visible{display:block}.bac--user-sidebar-info .bac--user-image i{font-size:32px;font-size:32px;z-index:0;position:absolute;width:100%;left:0;background-color:rgba(0,0,0,0.5)}.bac--user-sidebar-info .bac--user-image:hover i{z-index:3}.bac--user-sidebar-info .bac--user-name{width:100%;text-align:center;font-size:18px;margin-bottom:10px}.bac--user-sidebar-info .bac--user-email{font-size:12px;font-weight:300}.bac--user-account-settings{position:absolute;bottom:10px;left:20px;width:90%;height:50px}.bac--user-account-settings .bac-user-acount-list-item{display:flex;align-items:center;margin-bottom:30px;position:absolute}.bac--user-account-settings .bac-user-acount-list-item a{text-decoration:none;color:#fff}.bac--user-account-settings .bac-user-acount-list-item i{font-size:24px;margin-right:20px}#bac--puresdk-account-logo--{cursor:pointer;position:relative;color:#fff}#bac--puresdk-account-logo-- img{height:28px}#bac--info-blocks-wrapper--{position:relative}#bac--info-blocks-wrapper-- .bac--puresdk-info-box--{border-radius:0 0 3px 3px;overflow:hidden;z-index:99999999;position:fixed;top:-41px;width:470px;left:calc(50vw - 235px);height:40px;-webkit-transition:top 0.4s;transition:top 0.4s}#bac--info-blocks-wrapper-- .bac--puresdk-info-box--.bac--success{background:#14DA9E}#bac--info-blocks-wrapper-- .bac--puresdk-info-box--.bac--success .bac--inner-info-box-- div.bac--info-icon--.fa-success{display:inline-block}#bac--info-blocks-wrapper-- .bac--puresdk-info-box--.bac--info{background-color:#5BC0DE}#bac--info-blocks-wrapper-- .bac--puresdk-info-box--.bac--info .bac--inner-info-box-- div.bac--info-icon--.fa-info-1{display:inline-block}#bac--info-blocks-wrapper-- .bac--puresdk-info-box--.bac--warning{background:#F0AD4E}#bac--info-blocks-wrapper-- .bac--puresdk-info-box--.bac--warning .bac--inner-info-box-- div.bac--info-icon--.fa-warning{display:inline-block}#bac--info-blocks-wrapper-- .bac--puresdk-info-box--.bac--error{background:#EF4100}#bac--info-blocks-wrapper-- .bac--puresdk-info-box--.bac--error .bac--inner-info-box-- div.bac--info-icon--.fa-error{display:inline-block}#bac--info-blocks-wrapper-- .bac--puresdk-info-box-- .bac--timer{-webkit-transition-timing-function:linear;transition-timing-function:linear;position:absolute;bottom:0px;opacity:0.5;height:2px !important;background:white;width:0%}#bac--info-blocks-wrapper-- .bac--puresdk-info-box-- .bac--timer.bac--fullwidth{width:100%}#bac--info-blocks-wrapper-- .bac--puresdk-info-box--.bac--active--{top:0px}#bac--info-blocks-wrapper-- .bac--puresdk-info-box-- .bac--inner-info-box--{width:100%;padding:11px 15px;color:white}#bac--info-blocks-wrapper-- .bac--puresdk-info-box-- .bac--inner-info-box-- div{display:inline-block;height:18px;position:relative}#bac--info-blocks-wrapper-- .bac--puresdk-info-box-- .bac--inner-info-box-- div.bac--info-icon--{display:none;top:0px}#bac--info-blocks-wrapper-- .bac--puresdk-info-box-- .bac--inner-info-box-- .bac--info-icon--{margin-right:15px;width:10px;top:2px}#bac--info-blocks-wrapper-- .bac--puresdk-info-box-- .bac--inner-info-box-- .bac--info-main-text--{width:380px;margin-right:15px;font-size:12px;text-align:center}#bac--info-blocks-wrapper-- .bac--puresdk-info-box-- .bac--inner-info-box-- .bac--info-close-button--{width:10px;cursor:pointer;top:2px}.bac--custom-modal{position:fixed;width:70%;height:80%;min-width:400px;left:0;right:0;top:0;bottom:0;margin:auto;border:1px solid #979797;border-radius:5px;box-shadow:0 0 71px 0 #2F3849;background:#fff;z-index:999;overflow:auto;display:none}.bac--custom-modal.is-open{display:block}.bac--custom-modal .custom-modal__close-btn{text-decoration:none;padding-top:2px;line-height:18px;height:20px;width:20px;border-radius:50%;color:#909ba4;text-align:center;position:absolute;top:20px;right:20px;font-size:20px}.bac--custom-modal .custom-modal__close-btn:hover{text-decoration:none;color:#455066;cursor:pointer}.bac--custom-modal .custom-modal__wrapper{height:100%;display:flex;flex-direction:column}.bac--custom-modal .custom-modal__wrapper iframe{width:100%;height:100%}.bac--custom-modal .custom-modal__content-wrapper{height:100%;overflow:auto;margin-bottom:104px;border-top:2px solid #C9CDD7}.bac--custom-modal .custom-modal__content-wrapper.no-margin{margin-bottom:0}.bac--custom-modal .custom-modal__content{padding:20px;position:relative}.bac--custom-modal .custom-modal__content h3{color:#2F3849;font-size:20px;font-weight:600;line-height:27px}.bac--custom-modal .custom-modal__save{position:absolute;right:0;bottom:0;width:100%;padding:30px 32px;background-color:#F2F2F4}.bac--custom-modal .custom-modal__save a,.bac--custom-modal .custom-modal__save button{font-size:14px;line-height:22px;height:44px;width:100%}.bac--custom-modal .custom-modal__splitter{height:30px;line-height:30px;padding:0 20px;border-color:#D3D3D3;border-style:solid;border-width:1px 0 1px 0;background-color:#F0F0F0;color:#676F82;font-size:13px;font-weight:600}.bac--custom-modal .custom-modal__box{display:inline-block;vertical-align:middle;height:165px;width:165px;border:2px solid red;border-radius:5px;text-align:center;font-size:12px;font-weight:600;color:#9097A8;text-decoration:none;margin:10px 20px 10px 0;transition:0.1s all}.bac--custom-modal .custom-modal__box i{font-size:70px;display:block;margin:25px 0}.bac--custom-modal .custom-modal__box.active{color:yellow;border-color:yellow;text-decoration:none}.bac--custom-modal .custom-modal__box:hover,.bac--custom-modal .custom-modal__box:active,.bac--custom-modal .custom-modal__box:focus{color:#1AC0B4;border-color:yellow;text-decoration:none}.cloud-images__container{display:flex;flex-wrap:wrap;justify-content:flex-start}.cloud-images__pagination{padding:20px}.cloud-images__pagination li{display:inline-block;margin-right:10px}.cloud-images__pagination li a{color:#fff;background-color:#5e6776;border-radius:20px;text-decoration:none;display:block;font-weight:200;height:35px;width:35px;line-height:35px;text-align:center}.cloud-images__pagination li.active a{background-color:#2f3849}.cloud-images__item{width:155px;height:170px;border:1px solid #eee;background-color:#fff;border-radius:3px;margin:0 15px 15px 0;text-align:center;position:relative;cursor:pointer}.cloud-images__item .cloud-images__item__type{height:115px;font-size:90px;line-height:140px;border-top-left-radius:3px;border-top-right-radius:3px;color:#a2a2a2;background-color:#e9eaeb}.cloud-images__item .cloud-images__item__type>img{width:auto;height:auto;max-width:100%;max-height:100%}.cloud-images__item .cloud-images__item__details{padding:10px 0}.cloud-images__item .cloud-images__item__details .cloud-images__item__details__name{font-size:12px;outline:none;padding:0 10px;color:#a5abb5;border:none;width:100%;background-color:transparent;height:15px;display:inline-block;word-break:break-all}.cloud-images__item .cloud-images__item__details .cloud-images__item__details__date{font-size:10px;bottom:6px;width:155px;height:15px;color:#a5abb5;display:inline-block}.cloud-images__item .cloud-images__item__actions{display:flex;align-items:center;justify-content:center;position:absolute;top:0;left:0;width:100%;height:115px;background-color:rgba(78,83,91,0.83);opacity:0;visibility:hidden;border-top-left-radius:3px;border-top-right-radius:3px;text-align:center;transition:0.3s opacity}.cloud-images__item .cloud-images__item__actions a{font-size:16px;color:#fff;text-decoration:none}.cloud-images__item:hover .cloud-images__item .cloud-images__item__actions{opacity:1;visibility:visible}',
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
link.href = 'https://file.myfontastic.com/MDvnRJGhBd5xVcXn4uQJSZ/icons.css';
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

var infoBlocks = [];

var InfoController = {
	init: function init() {
		for (var i = 1; i < 5; i++) {
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
		for (var i = 0; i < infoBlocks.length; i++) {
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
		sessionEndpoint: 'session'
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
		return state.configuration.rootUrl + state.configuration.loginUrl + "?" + state.configuration.redirectUrlParam + "=" + window.location.href;
	},

	getAuthenticationEndpoint: function getAuthenticationEndpoint() {
		if (state.sessionEndpointByUser) {
			return state.rootUrl + state.configuration.sessionEndpoint;
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
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uLy4uL25vZGVfbW9kdWxlcy9icm93c2VyLXBhY2svX3ByZWx1ZGUuanMiLCIuLi8uLi9ub2RlX21vZHVsZXMvYXNhcC9icm93c2VyLXJhdy5qcyIsIi4uLy4uL25vZGVfbW9kdWxlcy9wcm9taXNlL2xpYi9jb3JlLmpzIiwiLi4vLi4vbm9kZV9tb2R1bGVzL3Byb21pc2UvbGliL2VzNi1leHRlbnNpb25zLmpzIiwiLi4vLi4vbm9kZV9tb2R1bGVzL3Byb21pc2UvbGliL3JlamVjdGlvbi10cmFja2luZy5qcyIsIlBQQkEuanMiLCJpbmRleC5qcyIsIm1vZHVsZXMvYXZhdGFyLWNvbnRyb2xsZXIuanMiLCJtb2R1bGVzL2NhbGxlci5qcyIsIm1vZHVsZXMvY2xvdWRpbmFyeS1pbWFnZS1waWNrZXIuanMiLCJtb2R1bGVzL2RvbS5qcyIsIm1vZHVsZXMvaW5mby1jb250cm9sbGVyLmpzIiwibW9kdWxlcy9sb2dnZXIuanMiLCJtb2R1bGVzL3BhZ2luYXRpb24taGVscGVyLmpzIiwibW9kdWxlcy9wdWJzdWIuanMiLCJtb2R1bGVzL3N0b3JlLmpzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOztBQ0FBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7Ozs7QUMvTkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDck5BO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUMzR0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNoSEE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUM5VUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUM5Q0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3ZIQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ2pHQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNyUUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUN0QkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUM5RkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDckJBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUMvQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3JEQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQSIsImZpbGUiOiJnZW5lcmF0ZWQuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlc0NvbnRlbnQiOlsiKGZ1bmN0aW9uIGUodCxuLHIpe2Z1bmN0aW9uIHMobyx1KXtpZighbltvXSl7aWYoIXRbb10pe3ZhciBhPXR5cGVvZiByZXF1aXJlPT1cImZ1bmN0aW9uXCImJnJlcXVpcmU7aWYoIXUmJmEpcmV0dXJuIGEobywhMCk7aWYoaSlyZXR1cm4gaShvLCEwKTt2YXIgZj1uZXcgRXJyb3IoXCJDYW5ub3QgZmluZCBtb2R1bGUgJ1wiK28rXCInXCIpO3Rocm93IGYuY29kZT1cIk1PRFVMRV9OT1RfRk9VTkRcIixmfXZhciBsPW5bb109e2V4cG9ydHM6e319O3Rbb11bMF0uY2FsbChsLmV4cG9ydHMsZnVuY3Rpb24oZSl7dmFyIG49dFtvXVsxXVtlXTtyZXR1cm4gcyhuP246ZSl9LGwsbC5leHBvcnRzLGUsdCxuLHIpfXJldHVybiBuW29dLmV4cG9ydHN9dmFyIGk9dHlwZW9mIHJlcXVpcmU9PVwiZnVuY3Rpb25cIiYmcmVxdWlyZTtmb3IodmFyIG89MDtvPHIubGVuZ3RoO28rKylzKHJbb10pO3JldHVybiBzfSkiLCJcInVzZSBzdHJpY3RcIjtcblxuLy8gVXNlIHRoZSBmYXN0ZXN0IG1lYW5zIHBvc3NpYmxlIHRvIGV4ZWN1dGUgYSB0YXNrIGluIGl0cyBvd24gdHVybiwgd2l0aFxuLy8gcHJpb3JpdHkgb3ZlciBvdGhlciBldmVudHMgaW5jbHVkaW5nIElPLCBhbmltYXRpb24sIHJlZmxvdywgYW5kIHJlZHJhd1xuLy8gZXZlbnRzIGluIGJyb3dzZXJzLlxuLy9cbi8vIEFuIGV4Y2VwdGlvbiB0aHJvd24gYnkgYSB0YXNrIHdpbGwgcGVybWFuZW50bHkgaW50ZXJydXB0IHRoZSBwcm9jZXNzaW5nIG9mXG4vLyBzdWJzZXF1ZW50IHRhc2tzLiBUaGUgaGlnaGVyIGxldmVsIGBhc2FwYCBmdW5jdGlvbiBlbnN1cmVzIHRoYXQgaWYgYW5cbi8vIGV4Y2VwdGlvbiBpcyB0aHJvd24gYnkgYSB0YXNrLCB0aGF0IHRoZSB0YXNrIHF1ZXVlIHdpbGwgY29udGludWUgZmx1c2hpbmcgYXNcbi8vIHNvb24gYXMgcG9zc2libGUsIGJ1dCBpZiB5b3UgdXNlIGByYXdBc2FwYCBkaXJlY3RseSwgeW91IGFyZSByZXNwb25zaWJsZSB0b1xuLy8gZWl0aGVyIGVuc3VyZSB0aGF0IG5vIGV4Y2VwdGlvbnMgYXJlIHRocm93biBmcm9tIHlvdXIgdGFzaywgb3IgdG8gbWFudWFsbHlcbi8vIGNhbGwgYHJhd0FzYXAucmVxdWVzdEZsdXNoYCBpZiBhbiBleGNlcHRpb24gaXMgdGhyb3duLlxubW9kdWxlLmV4cG9ydHMgPSByYXdBc2FwO1xuZnVuY3Rpb24gcmF3QXNhcCh0YXNrKSB7XG4gICAgaWYgKCFxdWV1ZS5sZW5ndGgpIHtcbiAgICAgICAgcmVxdWVzdEZsdXNoKCk7XG4gICAgICAgIGZsdXNoaW5nID0gdHJ1ZTtcbiAgICB9XG4gICAgLy8gRXF1aXZhbGVudCB0byBwdXNoLCBidXQgYXZvaWRzIGEgZnVuY3Rpb24gY2FsbC5cbiAgICBxdWV1ZVtxdWV1ZS5sZW5ndGhdID0gdGFzaztcbn1cblxudmFyIHF1ZXVlID0gW107XG4vLyBPbmNlIGEgZmx1c2ggaGFzIGJlZW4gcmVxdWVzdGVkLCBubyBmdXJ0aGVyIGNhbGxzIHRvIGByZXF1ZXN0Rmx1c2hgIGFyZVxuLy8gbmVjZXNzYXJ5IHVudGlsIHRoZSBuZXh0IGBmbHVzaGAgY29tcGxldGVzLlxudmFyIGZsdXNoaW5nID0gZmFsc2U7XG4vLyBgcmVxdWVzdEZsdXNoYCBpcyBhbiBpbXBsZW1lbnRhdGlvbi1zcGVjaWZpYyBtZXRob2QgdGhhdCBhdHRlbXB0cyB0byBraWNrXG4vLyBvZmYgYSBgZmx1c2hgIGV2ZW50IGFzIHF1aWNrbHkgYXMgcG9zc2libGUuIGBmbHVzaGAgd2lsbCBhdHRlbXB0IHRvIGV4aGF1c3Rcbi8vIHRoZSBldmVudCBxdWV1ZSBiZWZvcmUgeWllbGRpbmcgdG8gdGhlIGJyb3dzZXIncyBvd24gZXZlbnQgbG9vcC5cbnZhciByZXF1ZXN0Rmx1c2g7XG4vLyBUaGUgcG9zaXRpb24gb2YgdGhlIG5leHQgdGFzayB0byBleGVjdXRlIGluIHRoZSB0YXNrIHF1ZXVlLiBUaGlzIGlzXG4vLyBwcmVzZXJ2ZWQgYmV0d2VlbiBjYWxscyB0byBgZmx1c2hgIHNvIHRoYXQgaXQgY2FuIGJlIHJlc3VtZWQgaWZcbi8vIGEgdGFzayB0aHJvd3MgYW4gZXhjZXB0aW9uLlxudmFyIGluZGV4ID0gMDtcbi8vIElmIGEgdGFzayBzY2hlZHVsZXMgYWRkaXRpb25hbCB0YXNrcyByZWN1cnNpdmVseSwgdGhlIHRhc2sgcXVldWUgY2FuIGdyb3dcbi8vIHVuYm91bmRlZC4gVG8gcHJldmVudCBtZW1vcnkgZXhoYXVzdGlvbiwgdGhlIHRhc2sgcXVldWUgd2lsbCBwZXJpb2RpY2FsbHlcbi8vIHRydW5jYXRlIGFscmVhZHktY29tcGxldGVkIHRhc2tzLlxudmFyIGNhcGFjaXR5ID0gMTAyNDtcblxuLy8gVGhlIGZsdXNoIGZ1bmN0aW9uIHByb2Nlc3NlcyBhbGwgdGFza3MgdGhhdCBoYXZlIGJlZW4gc2NoZWR1bGVkIHdpdGhcbi8vIGByYXdBc2FwYCB1bmxlc3MgYW5kIHVudGlsIG9uZSBvZiB0aG9zZSB0YXNrcyB0aHJvd3MgYW4gZXhjZXB0aW9uLlxuLy8gSWYgYSB0YXNrIHRocm93cyBhbiBleGNlcHRpb24sIGBmbHVzaGAgZW5zdXJlcyB0aGF0IGl0cyBzdGF0ZSB3aWxsIHJlbWFpblxuLy8gY29uc2lzdGVudCBhbmQgd2lsbCByZXN1bWUgd2hlcmUgaXQgbGVmdCBvZmYgd2hlbiBjYWxsZWQgYWdhaW4uXG4vLyBIb3dldmVyLCBgZmx1c2hgIGRvZXMgbm90IG1ha2UgYW55IGFycmFuZ2VtZW50cyB0byBiZSBjYWxsZWQgYWdhaW4gaWYgYW5cbi8vIGV4Y2VwdGlvbiBpcyB0aHJvd24uXG5mdW5jdGlvbiBmbHVzaCgpIHtcbiAgICB3aGlsZSAoaW5kZXggPCBxdWV1ZS5sZW5ndGgpIHtcbiAgICAgICAgdmFyIGN1cnJlbnRJbmRleCA9IGluZGV4O1xuICAgICAgICAvLyBBZHZhbmNlIHRoZSBpbmRleCBiZWZvcmUgY2FsbGluZyB0aGUgdGFzay4gVGhpcyBlbnN1cmVzIHRoYXQgd2Ugd2lsbFxuICAgICAgICAvLyBiZWdpbiBmbHVzaGluZyBvbiB0aGUgbmV4dCB0YXNrIHRoZSB0YXNrIHRocm93cyBhbiBlcnJvci5cbiAgICAgICAgaW5kZXggPSBpbmRleCArIDE7XG4gICAgICAgIHF1ZXVlW2N1cnJlbnRJbmRleF0uY2FsbCgpO1xuICAgICAgICAvLyBQcmV2ZW50IGxlYWtpbmcgbWVtb3J5IGZvciBsb25nIGNoYWlucyBvZiByZWN1cnNpdmUgY2FsbHMgdG8gYGFzYXBgLlxuICAgICAgICAvLyBJZiB3ZSBjYWxsIGBhc2FwYCB3aXRoaW4gdGFza3Mgc2NoZWR1bGVkIGJ5IGBhc2FwYCwgdGhlIHF1ZXVlIHdpbGxcbiAgICAgICAgLy8gZ3JvdywgYnV0IHRvIGF2b2lkIGFuIE8obikgd2FsayBmb3IgZXZlcnkgdGFzayB3ZSBleGVjdXRlLCB3ZSBkb24ndFxuICAgICAgICAvLyBzaGlmdCB0YXNrcyBvZmYgdGhlIHF1ZXVlIGFmdGVyIHRoZXkgaGF2ZSBiZWVuIGV4ZWN1dGVkLlxuICAgICAgICAvLyBJbnN0ZWFkLCB3ZSBwZXJpb2RpY2FsbHkgc2hpZnQgMTAyNCB0YXNrcyBvZmYgdGhlIHF1ZXVlLlxuICAgICAgICBpZiAoaW5kZXggPiBjYXBhY2l0eSkge1xuICAgICAgICAgICAgLy8gTWFudWFsbHkgc2hpZnQgYWxsIHZhbHVlcyBzdGFydGluZyBhdCB0aGUgaW5kZXggYmFjayB0byB0aGVcbiAgICAgICAgICAgIC8vIGJlZ2lubmluZyBvZiB0aGUgcXVldWUuXG4gICAgICAgICAgICBmb3IgKHZhciBzY2FuID0gMCwgbmV3TGVuZ3RoID0gcXVldWUubGVuZ3RoIC0gaW5kZXg7IHNjYW4gPCBuZXdMZW5ndGg7IHNjYW4rKykge1xuICAgICAgICAgICAgICAgIHF1ZXVlW3NjYW5dID0gcXVldWVbc2NhbiArIGluZGV4XTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIHF1ZXVlLmxlbmd0aCAtPSBpbmRleDtcbiAgICAgICAgICAgIGluZGV4ID0gMDtcbiAgICAgICAgfVxuICAgIH1cbiAgICBxdWV1ZS5sZW5ndGggPSAwO1xuICAgIGluZGV4ID0gMDtcbiAgICBmbHVzaGluZyA9IGZhbHNlO1xufVxuXG4vLyBgcmVxdWVzdEZsdXNoYCBpcyBpbXBsZW1lbnRlZCB1c2luZyBhIHN0cmF0ZWd5IGJhc2VkIG9uIGRhdGEgY29sbGVjdGVkIGZyb21cbi8vIGV2ZXJ5IGF2YWlsYWJsZSBTYXVjZUxhYnMgU2VsZW5pdW0gd2ViIGRyaXZlciB3b3JrZXIgYXQgdGltZSBvZiB3cml0aW5nLlxuLy8gaHR0cHM6Ly9kb2NzLmdvb2dsZS5jb20vc3ByZWFkc2hlZXRzL2QvMW1HLTVVWUd1cDVxeEdkRU1Xa2hQNkJXQ3owNTNOVWIyRTFRb1VUVTE2dUEvZWRpdCNnaWQ9NzgzNzI0NTkzXG5cbi8vIFNhZmFyaSA2IGFuZCA2LjEgZm9yIGRlc2t0b3AsIGlQYWQsIGFuZCBpUGhvbmUgYXJlIHRoZSBvbmx5IGJyb3dzZXJzIHRoYXRcbi8vIGhhdmUgV2ViS2l0TXV0YXRpb25PYnNlcnZlciBidXQgbm90IHVuLXByZWZpeGVkIE11dGF0aW9uT2JzZXJ2ZXIuXG4vLyBNdXN0IHVzZSBgZ2xvYmFsYCBvciBgc2VsZmAgaW5zdGVhZCBvZiBgd2luZG93YCB0byB3b3JrIGluIGJvdGggZnJhbWVzIGFuZCB3ZWJcbi8vIHdvcmtlcnMuIGBnbG9iYWxgIGlzIGEgcHJvdmlzaW9uIG9mIEJyb3dzZXJpZnksIE1yLCBNcnMsIG9yIE1vcC5cblxuLyogZ2xvYmFscyBzZWxmICovXG52YXIgc2NvcGUgPSB0eXBlb2YgZ2xvYmFsICE9PSBcInVuZGVmaW5lZFwiID8gZ2xvYmFsIDogc2VsZjtcbnZhciBCcm93c2VyTXV0YXRpb25PYnNlcnZlciA9IHNjb3BlLk11dGF0aW9uT2JzZXJ2ZXIgfHwgc2NvcGUuV2ViS2l0TXV0YXRpb25PYnNlcnZlcjtcblxuLy8gTXV0YXRpb25PYnNlcnZlcnMgYXJlIGRlc2lyYWJsZSBiZWNhdXNlIHRoZXkgaGF2ZSBoaWdoIHByaW9yaXR5IGFuZCB3b3JrXG4vLyByZWxpYWJseSBldmVyeXdoZXJlIHRoZXkgYXJlIGltcGxlbWVudGVkLlxuLy8gVGhleSBhcmUgaW1wbGVtZW50ZWQgaW4gYWxsIG1vZGVybiBicm93c2Vycy5cbi8vXG4vLyAtIEFuZHJvaWQgNC00LjNcbi8vIC0gQ2hyb21lIDI2LTM0XG4vLyAtIEZpcmVmb3ggMTQtMjlcbi8vIC0gSW50ZXJuZXQgRXhwbG9yZXIgMTFcbi8vIC0gaVBhZCBTYWZhcmkgNi03LjFcbi8vIC0gaVBob25lIFNhZmFyaSA3LTcuMVxuLy8gLSBTYWZhcmkgNi03XG5pZiAodHlwZW9mIEJyb3dzZXJNdXRhdGlvbk9ic2VydmVyID09PSBcImZ1bmN0aW9uXCIpIHtcbiAgICByZXF1ZXN0Rmx1c2ggPSBtYWtlUmVxdWVzdENhbGxGcm9tTXV0YXRpb25PYnNlcnZlcihmbHVzaCk7XG5cbi8vIE1lc3NhZ2VDaGFubmVscyBhcmUgZGVzaXJhYmxlIGJlY2F1c2UgdGhleSBnaXZlIGRpcmVjdCBhY2Nlc3MgdG8gdGhlIEhUTUxcbi8vIHRhc2sgcXVldWUsIGFyZSBpbXBsZW1lbnRlZCBpbiBJbnRlcm5ldCBFeHBsb3JlciAxMCwgU2FmYXJpIDUuMC0xLCBhbmQgT3BlcmFcbi8vIDExLTEyLCBhbmQgaW4gd2ViIHdvcmtlcnMgaW4gbWFueSBlbmdpbmVzLlxuLy8gQWx0aG91Z2ggbWVzc2FnZSBjaGFubmVscyB5aWVsZCB0byBhbnkgcXVldWVkIHJlbmRlcmluZyBhbmQgSU8gdGFza3MsIHRoZXlcbi8vIHdvdWxkIGJlIGJldHRlciB0aGFuIGltcG9zaW5nIHRoZSA0bXMgZGVsYXkgb2YgdGltZXJzLlxuLy8gSG93ZXZlciwgdGhleSBkbyBub3Qgd29yayByZWxpYWJseSBpbiBJbnRlcm5ldCBFeHBsb3JlciBvciBTYWZhcmkuXG5cbi8vIEludGVybmV0IEV4cGxvcmVyIDEwIGlzIHRoZSBvbmx5IGJyb3dzZXIgdGhhdCBoYXMgc2V0SW1tZWRpYXRlIGJ1dCBkb2VzXG4vLyBub3QgaGF2ZSBNdXRhdGlvbk9ic2VydmVycy5cbi8vIEFsdGhvdWdoIHNldEltbWVkaWF0ZSB5aWVsZHMgdG8gdGhlIGJyb3dzZXIncyByZW5kZXJlciwgaXQgd291bGQgYmVcbi8vIHByZWZlcnJhYmxlIHRvIGZhbGxpbmcgYmFjayB0byBzZXRUaW1lb3V0IHNpbmNlIGl0IGRvZXMgbm90IGhhdmVcbi8vIHRoZSBtaW5pbXVtIDRtcyBwZW5hbHR5LlxuLy8gVW5mb3J0dW5hdGVseSB0aGVyZSBhcHBlYXJzIHRvIGJlIGEgYnVnIGluIEludGVybmV0IEV4cGxvcmVyIDEwIE1vYmlsZSAoYW5kXG4vLyBEZXNrdG9wIHRvIGEgbGVzc2VyIGV4dGVudCkgdGhhdCByZW5kZXJzIGJvdGggc2V0SW1tZWRpYXRlIGFuZFxuLy8gTWVzc2FnZUNoYW5uZWwgdXNlbGVzcyBmb3IgdGhlIHB1cnBvc2VzIG9mIEFTQVAuXG4vLyBodHRwczovL2dpdGh1Yi5jb20va3Jpc2tvd2FsL3EvaXNzdWVzLzM5NlxuXG4vLyBUaW1lcnMgYXJlIGltcGxlbWVudGVkIHVuaXZlcnNhbGx5LlxuLy8gV2UgZmFsbCBiYWNrIHRvIHRpbWVycyBpbiB3b3JrZXJzIGluIG1vc3QgZW5naW5lcywgYW5kIGluIGZvcmVncm91bmRcbi8vIGNvbnRleHRzIGluIHRoZSBmb2xsb3dpbmcgYnJvd3NlcnMuXG4vLyBIb3dldmVyLCBub3RlIHRoYXQgZXZlbiB0aGlzIHNpbXBsZSBjYXNlIHJlcXVpcmVzIG51YW5jZXMgdG8gb3BlcmF0ZSBpbiBhXG4vLyBicm9hZCBzcGVjdHJ1bSBvZiBicm93c2Vycy5cbi8vXG4vLyAtIEZpcmVmb3ggMy0xM1xuLy8gLSBJbnRlcm5ldCBFeHBsb3JlciA2LTlcbi8vIC0gaVBhZCBTYWZhcmkgNC4zXG4vLyAtIEx5bnggMi44Ljdcbn0gZWxzZSB7XG4gICAgcmVxdWVzdEZsdXNoID0gbWFrZVJlcXVlc3RDYWxsRnJvbVRpbWVyKGZsdXNoKTtcbn1cblxuLy8gYHJlcXVlc3RGbHVzaGAgcmVxdWVzdHMgdGhhdCB0aGUgaGlnaCBwcmlvcml0eSBldmVudCBxdWV1ZSBiZSBmbHVzaGVkIGFzXG4vLyBzb29uIGFzIHBvc3NpYmxlLlxuLy8gVGhpcyBpcyB1c2VmdWwgdG8gcHJldmVudCBhbiBlcnJvciB0aHJvd24gaW4gYSB0YXNrIGZyb20gc3RhbGxpbmcgdGhlIGV2ZW50XG4vLyBxdWV1ZSBpZiB0aGUgZXhjZXB0aW9uIGhhbmRsZWQgYnkgTm9kZS5qc+KAmXNcbi8vIGBwcm9jZXNzLm9uKFwidW5jYXVnaHRFeGNlcHRpb25cIilgIG9yIGJ5IGEgZG9tYWluLlxucmF3QXNhcC5yZXF1ZXN0Rmx1c2ggPSByZXF1ZXN0Rmx1c2g7XG5cbi8vIFRvIHJlcXVlc3QgYSBoaWdoIHByaW9yaXR5IGV2ZW50LCB3ZSBpbmR1Y2UgYSBtdXRhdGlvbiBvYnNlcnZlciBieSB0b2dnbGluZ1xuLy8gdGhlIHRleHQgb2YgYSB0ZXh0IG5vZGUgYmV0d2VlbiBcIjFcIiBhbmQgXCItMVwiLlxuZnVuY3Rpb24gbWFrZVJlcXVlc3RDYWxsRnJvbU11dGF0aW9uT2JzZXJ2ZXIoY2FsbGJhY2spIHtcbiAgICB2YXIgdG9nZ2xlID0gMTtcbiAgICB2YXIgb2JzZXJ2ZXIgPSBuZXcgQnJvd3Nlck11dGF0aW9uT2JzZXJ2ZXIoY2FsbGJhY2spO1xuICAgIHZhciBub2RlID0gZG9jdW1lbnQuY3JlYXRlVGV4dE5vZGUoXCJcIik7XG4gICAgb2JzZXJ2ZXIub2JzZXJ2ZShub2RlLCB7Y2hhcmFjdGVyRGF0YTogdHJ1ZX0pO1xuICAgIHJldHVybiBmdW5jdGlvbiByZXF1ZXN0Q2FsbCgpIHtcbiAgICAgICAgdG9nZ2xlID0gLXRvZ2dsZTtcbiAgICAgICAgbm9kZS5kYXRhID0gdG9nZ2xlO1xuICAgIH07XG59XG5cbi8vIFRoZSBtZXNzYWdlIGNoYW5uZWwgdGVjaG5pcXVlIHdhcyBkaXNjb3ZlcmVkIGJ5IE1hbHRlIFVibCBhbmQgd2FzIHRoZVxuLy8gb3JpZ2luYWwgZm91bmRhdGlvbiBmb3IgdGhpcyBsaWJyYXJ5LlxuLy8gaHR0cDovL3d3dy5ub25ibG9ja2luZy5pby8yMDExLzA2L3dpbmRvd25leHR0aWNrLmh0bWxcblxuLy8gU2FmYXJpIDYuMC41IChhdCBsZWFzdCkgaW50ZXJtaXR0ZW50bHkgZmFpbHMgdG8gY3JlYXRlIG1lc3NhZ2UgcG9ydHMgb24gYVxuLy8gcGFnZSdzIGZpcnN0IGxvYWQuIFRoYW5rZnVsbHksIHRoaXMgdmVyc2lvbiBvZiBTYWZhcmkgc3VwcG9ydHNcbi8vIE11dGF0aW9uT2JzZXJ2ZXJzLCBzbyB3ZSBkb24ndCBuZWVkIHRvIGZhbGwgYmFjayBpbiB0aGF0IGNhc2UuXG5cbi8vIGZ1bmN0aW9uIG1ha2VSZXF1ZXN0Q2FsbEZyb21NZXNzYWdlQ2hhbm5lbChjYWxsYmFjaykge1xuLy8gICAgIHZhciBjaGFubmVsID0gbmV3IE1lc3NhZ2VDaGFubmVsKCk7XG4vLyAgICAgY2hhbm5lbC5wb3J0MS5vbm1lc3NhZ2UgPSBjYWxsYmFjaztcbi8vICAgICByZXR1cm4gZnVuY3Rpb24gcmVxdWVzdENhbGwoKSB7XG4vLyAgICAgICAgIGNoYW5uZWwucG9ydDIucG9zdE1lc3NhZ2UoMCk7XG4vLyAgICAgfTtcbi8vIH1cblxuLy8gRm9yIHJlYXNvbnMgZXhwbGFpbmVkIGFib3ZlLCB3ZSBhcmUgYWxzbyB1bmFibGUgdG8gdXNlIGBzZXRJbW1lZGlhdGVgXG4vLyB1bmRlciBhbnkgY2lyY3Vtc3RhbmNlcy5cbi8vIEV2ZW4gaWYgd2Ugd2VyZSwgdGhlcmUgaXMgYW5vdGhlciBidWcgaW4gSW50ZXJuZXQgRXhwbG9yZXIgMTAuXG4vLyBJdCBpcyBub3Qgc3VmZmljaWVudCB0byBhc3NpZ24gYHNldEltbWVkaWF0ZWAgdG8gYHJlcXVlc3RGbHVzaGAgYmVjYXVzZVxuLy8gYHNldEltbWVkaWF0ZWAgbXVzdCBiZSBjYWxsZWQgKmJ5IG5hbWUqIGFuZCB0aGVyZWZvcmUgbXVzdCBiZSB3cmFwcGVkIGluIGFcbi8vIGNsb3N1cmUuXG4vLyBOZXZlciBmb3JnZXQuXG5cbi8vIGZ1bmN0aW9uIG1ha2VSZXF1ZXN0Q2FsbEZyb21TZXRJbW1lZGlhdGUoY2FsbGJhY2spIHtcbi8vICAgICByZXR1cm4gZnVuY3Rpb24gcmVxdWVzdENhbGwoKSB7XG4vLyAgICAgICAgIHNldEltbWVkaWF0ZShjYWxsYmFjayk7XG4vLyAgICAgfTtcbi8vIH1cblxuLy8gU2FmYXJpIDYuMCBoYXMgYSBwcm9ibGVtIHdoZXJlIHRpbWVycyB3aWxsIGdldCBsb3N0IHdoaWxlIHRoZSB1c2VyIGlzXG4vLyBzY3JvbGxpbmcuIFRoaXMgcHJvYmxlbSBkb2VzIG5vdCBpbXBhY3QgQVNBUCBiZWNhdXNlIFNhZmFyaSA2LjAgc3VwcG9ydHNcbi8vIG11dGF0aW9uIG9ic2VydmVycywgc28gdGhhdCBpbXBsZW1lbnRhdGlvbiBpcyB1c2VkIGluc3RlYWQuXG4vLyBIb3dldmVyLCBpZiB3ZSBldmVyIGVsZWN0IHRvIHVzZSB0aW1lcnMgaW4gU2FmYXJpLCB0aGUgcHJldmFsZW50IHdvcmstYXJvdW5kXG4vLyBpcyB0byBhZGQgYSBzY3JvbGwgZXZlbnQgbGlzdGVuZXIgdGhhdCBjYWxscyBmb3IgYSBmbHVzaC5cblxuLy8gYHNldFRpbWVvdXRgIGRvZXMgbm90IGNhbGwgdGhlIHBhc3NlZCBjYWxsYmFjayBpZiB0aGUgZGVsYXkgaXMgbGVzcyB0aGFuXG4vLyBhcHByb3hpbWF0ZWx5IDcgaW4gd2ViIHdvcmtlcnMgaW4gRmlyZWZveCA4IHRocm91Z2ggMTgsIGFuZCBzb21ldGltZXMgbm90XG4vLyBldmVuIHRoZW4uXG5cbmZ1bmN0aW9uIG1ha2VSZXF1ZXN0Q2FsbEZyb21UaW1lcihjYWxsYmFjaykge1xuICAgIHJldHVybiBmdW5jdGlvbiByZXF1ZXN0Q2FsbCgpIHtcbiAgICAgICAgLy8gV2UgZGlzcGF0Y2ggYSB0aW1lb3V0IHdpdGggYSBzcGVjaWZpZWQgZGVsYXkgb2YgMCBmb3IgZW5naW5lcyB0aGF0XG4gICAgICAgIC8vIGNhbiByZWxpYWJseSBhY2NvbW1vZGF0ZSB0aGF0IHJlcXVlc3QuIFRoaXMgd2lsbCB1c3VhbGx5IGJlIHNuYXBwZWRcbiAgICAgICAgLy8gdG8gYSA0IG1pbGlzZWNvbmQgZGVsYXksIGJ1dCBvbmNlIHdlJ3JlIGZsdXNoaW5nLCB0aGVyZSdzIG5vIGRlbGF5XG4gICAgICAgIC8vIGJldHdlZW4gZXZlbnRzLlxuICAgICAgICB2YXIgdGltZW91dEhhbmRsZSA9IHNldFRpbWVvdXQoaGFuZGxlVGltZXIsIDApO1xuICAgICAgICAvLyBIb3dldmVyLCBzaW5jZSB0aGlzIHRpbWVyIGdldHMgZnJlcXVlbnRseSBkcm9wcGVkIGluIEZpcmVmb3hcbiAgICAgICAgLy8gd29ya2Vycywgd2UgZW5saXN0IGFuIGludGVydmFsIGhhbmRsZSB0aGF0IHdpbGwgdHJ5IHRvIGZpcmVcbiAgICAgICAgLy8gYW4gZXZlbnQgMjAgdGltZXMgcGVyIHNlY29uZCB1bnRpbCBpdCBzdWNjZWVkcy5cbiAgICAgICAgdmFyIGludGVydmFsSGFuZGxlID0gc2V0SW50ZXJ2YWwoaGFuZGxlVGltZXIsIDUwKTtcblxuICAgICAgICBmdW5jdGlvbiBoYW5kbGVUaW1lcigpIHtcbiAgICAgICAgICAgIC8vIFdoaWNoZXZlciB0aW1lciBzdWNjZWVkcyB3aWxsIGNhbmNlbCBib3RoIHRpbWVycyBhbmRcbiAgICAgICAgICAgIC8vIGV4ZWN1dGUgdGhlIGNhbGxiYWNrLlxuICAgICAgICAgICAgY2xlYXJUaW1lb3V0KHRpbWVvdXRIYW5kbGUpO1xuICAgICAgICAgICAgY2xlYXJJbnRlcnZhbChpbnRlcnZhbEhhbmRsZSk7XG4gICAgICAgICAgICBjYWxsYmFjaygpO1xuICAgICAgICB9XG4gICAgfTtcbn1cblxuLy8gVGhpcyBpcyBmb3IgYGFzYXAuanNgIG9ubHkuXG4vLyBJdHMgbmFtZSB3aWxsIGJlIHBlcmlvZGljYWxseSByYW5kb21pemVkIHRvIGJyZWFrIGFueSBjb2RlIHRoYXQgZGVwZW5kcyBvblxuLy8gaXRzIGV4aXN0ZW5jZS5cbnJhd0FzYXAubWFrZVJlcXVlc3RDYWxsRnJvbVRpbWVyID0gbWFrZVJlcXVlc3RDYWxsRnJvbVRpbWVyO1xuXG4vLyBBU0FQIHdhcyBvcmlnaW5hbGx5IGEgbmV4dFRpY2sgc2hpbSBpbmNsdWRlZCBpbiBRLiBUaGlzIHdhcyBmYWN0b3JlZCBvdXRcbi8vIGludG8gdGhpcyBBU0FQIHBhY2thZ2UuIEl0IHdhcyBsYXRlciBhZGFwdGVkIHRvIFJTVlAgd2hpY2ggbWFkZSBmdXJ0aGVyXG4vLyBhbWVuZG1lbnRzLiBUaGVzZSBkZWNpc2lvbnMsIHBhcnRpY3VsYXJseSB0byBtYXJnaW5hbGl6ZSBNZXNzYWdlQ2hhbm5lbCBhbmRcbi8vIHRvIGNhcHR1cmUgdGhlIE11dGF0aW9uT2JzZXJ2ZXIgaW1wbGVtZW50YXRpb24gaW4gYSBjbG9zdXJlLCB3ZXJlIGludGVncmF0ZWRcbi8vIGJhY2sgaW50byBBU0FQIHByb3Blci5cbi8vIGh0dHBzOi8vZ2l0aHViLmNvbS90aWxkZWlvL3JzdnAuanMvYmxvYi9jZGRmNzIzMjU0NmE5Y2Y4NTg1MjRiNzVjZGU2ZjllZGY3MjYyMGE3L2xpYi9yc3ZwL2FzYXAuanNcbiIsIid1c2Ugc3RyaWN0JztcblxudmFyIGFzYXAgPSByZXF1aXJlKCdhc2FwL3JhdycpO1xuXG5mdW5jdGlvbiBub29wKCkge31cblxuLy8gU3RhdGVzOlxuLy9cbi8vIDAgLSBwZW5kaW5nXG4vLyAxIC0gZnVsZmlsbGVkIHdpdGggX3ZhbHVlXG4vLyAyIC0gcmVqZWN0ZWQgd2l0aCBfdmFsdWVcbi8vIDMgLSBhZG9wdGVkIHRoZSBzdGF0ZSBvZiBhbm90aGVyIHByb21pc2UsIF92YWx1ZVxuLy9cbi8vIG9uY2UgdGhlIHN0YXRlIGlzIG5vIGxvbmdlciBwZW5kaW5nICgwKSBpdCBpcyBpbW11dGFibGVcblxuLy8gQWxsIGBfYCBwcmVmaXhlZCBwcm9wZXJ0aWVzIHdpbGwgYmUgcmVkdWNlZCB0byBgX3tyYW5kb20gbnVtYmVyfWBcbi8vIGF0IGJ1aWxkIHRpbWUgdG8gb2JmdXNjYXRlIHRoZW0gYW5kIGRpc2NvdXJhZ2UgdGhlaXIgdXNlLlxuLy8gV2UgZG9uJ3QgdXNlIHN5bWJvbHMgb3IgT2JqZWN0LmRlZmluZVByb3BlcnR5IHRvIGZ1bGx5IGhpZGUgdGhlbVxuLy8gYmVjYXVzZSB0aGUgcGVyZm9ybWFuY2UgaXNuJ3QgZ29vZCBlbm91Z2guXG5cblxuLy8gdG8gYXZvaWQgdXNpbmcgdHJ5L2NhdGNoIGluc2lkZSBjcml0aWNhbCBmdW5jdGlvbnMsIHdlXG4vLyBleHRyYWN0IHRoZW0gdG8gaGVyZS5cbnZhciBMQVNUX0VSUk9SID0gbnVsbDtcbnZhciBJU19FUlJPUiA9IHt9O1xuZnVuY3Rpb24gZ2V0VGhlbihvYmopIHtcbiAgdHJ5IHtcbiAgICByZXR1cm4gb2JqLnRoZW47XG4gIH0gY2F0Y2ggKGV4KSB7XG4gICAgTEFTVF9FUlJPUiA9IGV4O1xuICAgIHJldHVybiBJU19FUlJPUjtcbiAgfVxufVxuXG5mdW5jdGlvbiB0cnlDYWxsT25lKGZuLCBhKSB7XG4gIHRyeSB7XG4gICAgcmV0dXJuIGZuKGEpO1xuICB9IGNhdGNoIChleCkge1xuICAgIExBU1RfRVJST1IgPSBleDtcbiAgICByZXR1cm4gSVNfRVJST1I7XG4gIH1cbn1cbmZ1bmN0aW9uIHRyeUNhbGxUd28oZm4sIGEsIGIpIHtcbiAgdHJ5IHtcbiAgICBmbihhLCBiKTtcbiAgfSBjYXRjaCAoZXgpIHtcbiAgICBMQVNUX0VSUk9SID0gZXg7XG4gICAgcmV0dXJuIElTX0VSUk9SO1xuICB9XG59XG5cbm1vZHVsZS5leHBvcnRzID0gUHJvbWlzZTtcblxuZnVuY3Rpb24gUHJvbWlzZShmbikge1xuICBpZiAodHlwZW9mIHRoaXMgIT09ICdvYmplY3QnKSB7XG4gICAgdGhyb3cgbmV3IFR5cGVFcnJvcignUHJvbWlzZXMgbXVzdCBiZSBjb25zdHJ1Y3RlZCB2aWEgbmV3Jyk7XG4gIH1cbiAgaWYgKHR5cGVvZiBmbiAhPT0gJ2Z1bmN0aW9uJykge1xuICAgIHRocm93IG5ldyBUeXBlRXJyb3IoJ1Byb21pc2UgY29uc3RydWN0b3JcXCdzIGFyZ3VtZW50IGlzIG5vdCBhIGZ1bmN0aW9uJyk7XG4gIH1cbiAgdGhpcy5fNzUgPSAwO1xuICB0aGlzLl84MyA9IDA7XG4gIHRoaXMuXzE4ID0gbnVsbDtcbiAgdGhpcy5fMzggPSBudWxsO1xuICBpZiAoZm4gPT09IG5vb3ApIHJldHVybjtcbiAgZG9SZXNvbHZlKGZuLCB0aGlzKTtcbn1cblByb21pc2UuXzQ3ID0gbnVsbDtcblByb21pc2UuXzcxID0gbnVsbDtcblByb21pc2UuXzQ0ID0gbm9vcDtcblxuUHJvbWlzZS5wcm90b3R5cGUudGhlbiA9IGZ1bmN0aW9uKG9uRnVsZmlsbGVkLCBvblJlamVjdGVkKSB7XG4gIGlmICh0aGlzLmNvbnN0cnVjdG9yICE9PSBQcm9taXNlKSB7XG4gICAgcmV0dXJuIHNhZmVUaGVuKHRoaXMsIG9uRnVsZmlsbGVkLCBvblJlamVjdGVkKTtcbiAgfVxuICB2YXIgcmVzID0gbmV3IFByb21pc2Uobm9vcCk7XG4gIGhhbmRsZSh0aGlzLCBuZXcgSGFuZGxlcihvbkZ1bGZpbGxlZCwgb25SZWplY3RlZCwgcmVzKSk7XG4gIHJldHVybiByZXM7XG59O1xuXG5mdW5jdGlvbiBzYWZlVGhlbihzZWxmLCBvbkZ1bGZpbGxlZCwgb25SZWplY3RlZCkge1xuICByZXR1cm4gbmV3IHNlbGYuY29uc3RydWN0b3IoZnVuY3Rpb24gKHJlc29sdmUsIHJlamVjdCkge1xuICAgIHZhciByZXMgPSBuZXcgUHJvbWlzZShub29wKTtcbiAgICByZXMudGhlbihyZXNvbHZlLCByZWplY3QpO1xuICAgIGhhbmRsZShzZWxmLCBuZXcgSGFuZGxlcihvbkZ1bGZpbGxlZCwgb25SZWplY3RlZCwgcmVzKSk7XG4gIH0pO1xufVxuZnVuY3Rpb24gaGFuZGxlKHNlbGYsIGRlZmVycmVkKSB7XG4gIHdoaWxlIChzZWxmLl84MyA9PT0gMykge1xuICAgIHNlbGYgPSBzZWxmLl8xODtcbiAgfVxuICBpZiAoUHJvbWlzZS5fNDcpIHtcbiAgICBQcm9taXNlLl80NyhzZWxmKTtcbiAgfVxuICBpZiAoc2VsZi5fODMgPT09IDApIHtcbiAgICBpZiAoc2VsZi5fNzUgPT09IDApIHtcbiAgICAgIHNlbGYuXzc1ID0gMTtcbiAgICAgIHNlbGYuXzM4ID0gZGVmZXJyZWQ7XG4gICAgICByZXR1cm47XG4gICAgfVxuICAgIGlmIChzZWxmLl83NSA9PT0gMSkge1xuICAgICAgc2VsZi5fNzUgPSAyO1xuICAgICAgc2VsZi5fMzggPSBbc2VsZi5fMzgsIGRlZmVycmVkXTtcbiAgICAgIHJldHVybjtcbiAgICB9XG4gICAgc2VsZi5fMzgucHVzaChkZWZlcnJlZCk7XG4gICAgcmV0dXJuO1xuICB9XG4gIGhhbmRsZVJlc29sdmVkKHNlbGYsIGRlZmVycmVkKTtcbn1cblxuZnVuY3Rpb24gaGFuZGxlUmVzb2x2ZWQoc2VsZiwgZGVmZXJyZWQpIHtcbiAgYXNhcChmdW5jdGlvbigpIHtcbiAgICB2YXIgY2IgPSBzZWxmLl84MyA9PT0gMSA/IGRlZmVycmVkLm9uRnVsZmlsbGVkIDogZGVmZXJyZWQub25SZWplY3RlZDtcbiAgICBpZiAoY2IgPT09IG51bGwpIHtcbiAgICAgIGlmIChzZWxmLl84MyA9PT0gMSkge1xuICAgICAgICByZXNvbHZlKGRlZmVycmVkLnByb21pc2UsIHNlbGYuXzE4KTtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIHJlamVjdChkZWZlcnJlZC5wcm9taXNlLCBzZWxmLl8xOCk7XG4gICAgICB9XG4gICAgICByZXR1cm47XG4gICAgfVxuICAgIHZhciByZXQgPSB0cnlDYWxsT25lKGNiLCBzZWxmLl8xOCk7XG4gICAgaWYgKHJldCA9PT0gSVNfRVJST1IpIHtcbiAgICAgIHJlamVjdChkZWZlcnJlZC5wcm9taXNlLCBMQVNUX0VSUk9SKTtcbiAgICB9IGVsc2Uge1xuICAgICAgcmVzb2x2ZShkZWZlcnJlZC5wcm9taXNlLCByZXQpO1xuICAgIH1cbiAgfSk7XG59XG5mdW5jdGlvbiByZXNvbHZlKHNlbGYsIG5ld1ZhbHVlKSB7XG4gIC8vIFByb21pc2UgUmVzb2x1dGlvbiBQcm9jZWR1cmU6IGh0dHBzOi8vZ2l0aHViLmNvbS9wcm9taXNlcy1hcGx1cy9wcm9taXNlcy1zcGVjI3RoZS1wcm9taXNlLXJlc29sdXRpb24tcHJvY2VkdXJlXG4gIGlmIChuZXdWYWx1ZSA9PT0gc2VsZikge1xuICAgIHJldHVybiByZWplY3QoXG4gICAgICBzZWxmLFxuICAgICAgbmV3IFR5cGVFcnJvcignQSBwcm9taXNlIGNhbm5vdCBiZSByZXNvbHZlZCB3aXRoIGl0c2VsZi4nKVxuICAgICk7XG4gIH1cbiAgaWYgKFxuICAgIG5ld1ZhbHVlICYmXG4gICAgKHR5cGVvZiBuZXdWYWx1ZSA9PT0gJ29iamVjdCcgfHwgdHlwZW9mIG5ld1ZhbHVlID09PSAnZnVuY3Rpb24nKVxuICApIHtcbiAgICB2YXIgdGhlbiA9IGdldFRoZW4obmV3VmFsdWUpO1xuICAgIGlmICh0aGVuID09PSBJU19FUlJPUikge1xuICAgICAgcmV0dXJuIHJlamVjdChzZWxmLCBMQVNUX0VSUk9SKTtcbiAgICB9XG4gICAgaWYgKFxuICAgICAgdGhlbiA9PT0gc2VsZi50aGVuICYmXG4gICAgICBuZXdWYWx1ZSBpbnN0YW5jZW9mIFByb21pc2VcbiAgICApIHtcbiAgICAgIHNlbGYuXzgzID0gMztcbiAgICAgIHNlbGYuXzE4ID0gbmV3VmFsdWU7XG4gICAgICBmaW5hbGUoc2VsZik7XG4gICAgICByZXR1cm47XG4gICAgfSBlbHNlIGlmICh0eXBlb2YgdGhlbiA9PT0gJ2Z1bmN0aW9uJykge1xuICAgICAgZG9SZXNvbHZlKHRoZW4uYmluZChuZXdWYWx1ZSksIHNlbGYpO1xuICAgICAgcmV0dXJuO1xuICAgIH1cbiAgfVxuICBzZWxmLl84MyA9IDE7XG4gIHNlbGYuXzE4ID0gbmV3VmFsdWU7XG4gIGZpbmFsZShzZWxmKTtcbn1cblxuZnVuY3Rpb24gcmVqZWN0KHNlbGYsIG5ld1ZhbHVlKSB7XG4gIHNlbGYuXzgzID0gMjtcbiAgc2VsZi5fMTggPSBuZXdWYWx1ZTtcbiAgaWYgKFByb21pc2UuXzcxKSB7XG4gICAgUHJvbWlzZS5fNzEoc2VsZiwgbmV3VmFsdWUpO1xuICB9XG4gIGZpbmFsZShzZWxmKTtcbn1cbmZ1bmN0aW9uIGZpbmFsZShzZWxmKSB7XG4gIGlmIChzZWxmLl83NSA9PT0gMSkge1xuICAgIGhhbmRsZShzZWxmLCBzZWxmLl8zOCk7XG4gICAgc2VsZi5fMzggPSBudWxsO1xuICB9XG4gIGlmIChzZWxmLl83NSA9PT0gMikge1xuICAgIGZvciAodmFyIGkgPSAwOyBpIDwgc2VsZi5fMzgubGVuZ3RoOyBpKyspIHtcbiAgICAgIGhhbmRsZShzZWxmLCBzZWxmLl8zOFtpXSk7XG4gICAgfVxuICAgIHNlbGYuXzM4ID0gbnVsbDtcbiAgfVxufVxuXG5mdW5jdGlvbiBIYW5kbGVyKG9uRnVsZmlsbGVkLCBvblJlamVjdGVkLCBwcm9taXNlKXtcbiAgdGhpcy5vbkZ1bGZpbGxlZCA9IHR5cGVvZiBvbkZ1bGZpbGxlZCA9PT0gJ2Z1bmN0aW9uJyA/IG9uRnVsZmlsbGVkIDogbnVsbDtcbiAgdGhpcy5vblJlamVjdGVkID0gdHlwZW9mIG9uUmVqZWN0ZWQgPT09ICdmdW5jdGlvbicgPyBvblJlamVjdGVkIDogbnVsbDtcbiAgdGhpcy5wcm9taXNlID0gcHJvbWlzZTtcbn1cblxuLyoqXG4gKiBUYWtlIGEgcG90ZW50aWFsbHkgbWlzYmVoYXZpbmcgcmVzb2x2ZXIgZnVuY3Rpb24gYW5kIG1ha2Ugc3VyZVxuICogb25GdWxmaWxsZWQgYW5kIG9uUmVqZWN0ZWQgYXJlIG9ubHkgY2FsbGVkIG9uY2UuXG4gKlxuICogTWFrZXMgbm8gZ3VhcmFudGVlcyBhYm91dCBhc3luY2hyb255LlxuICovXG5mdW5jdGlvbiBkb1Jlc29sdmUoZm4sIHByb21pc2UpIHtcbiAgdmFyIGRvbmUgPSBmYWxzZTtcbiAgdmFyIHJlcyA9IHRyeUNhbGxUd28oZm4sIGZ1bmN0aW9uICh2YWx1ZSkge1xuICAgIGlmIChkb25lKSByZXR1cm47XG4gICAgZG9uZSA9IHRydWU7XG4gICAgcmVzb2x2ZShwcm9taXNlLCB2YWx1ZSk7XG4gIH0sIGZ1bmN0aW9uIChyZWFzb24pIHtcbiAgICBpZiAoZG9uZSkgcmV0dXJuO1xuICAgIGRvbmUgPSB0cnVlO1xuICAgIHJlamVjdChwcm9taXNlLCByZWFzb24pO1xuICB9KTtcbiAgaWYgKCFkb25lICYmIHJlcyA9PT0gSVNfRVJST1IpIHtcbiAgICBkb25lID0gdHJ1ZTtcbiAgICByZWplY3QocHJvbWlzZSwgTEFTVF9FUlJPUik7XG4gIH1cbn1cbiIsIid1c2Ugc3RyaWN0JztcblxuLy9UaGlzIGZpbGUgY29udGFpbnMgdGhlIEVTNiBleHRlbnNpb25zIHRvIHRoZSBjb3JlIFByb21pc2VzL0ErIEFQSVxuXG52YXIgUHJvbWlzZSA9IHJlcXVpcmUoJy4vY29yZS5qcycpO1xuXG5tb2R1bGUuZXhwb3J0cyA9IFByb21pc2U7XG5cbi8qIFN0YXRpYyBGdW5jdGlvbnMgKi9cblxudmFyIFRSVUUgPSB2YWx1ZVByb21pc2UodHJ1ZSk7XG52YXIgRkFMU0UgPSB2YWx1ZVByb21pc2UoZmFsc2UpO1xudmFyIE5VTEwgPSB2YWx1ZVByb21pc2UobnVsbCk7XG52YXIgVU5ERUZJTkVEID0gdmFsdWVQcm9taXNlKHVuZGVmaW5lZCk7XG52YXIgWkVSTyA9IHZhbHVlUHJvbWlzZSgwKTtcbnZhciBFTVBUWVNUUklORyA9IHZhbHVlUHJvbWlzZSgnJyk7XG5cbmZ1bmN0aW9uIHZhbHVlUHJvbWlzZSh2YWx1ZSkge1xuICB2YXIgcCA9IG5ldyBQcm9taXNlKFByb21pc2UuXzQ0KTtcbiAgcC5fODMgPSAxO1xuICBwLl8xOCA9IHZhbHVlO1xuICByZXR1cm4gcDtcbn1cblByb21pc2UucmVzb2x2ZSA9IGZ1bmN0aW9uICh2YWx1ZSkge1xuICBpZiAodmFsdWUgaW5zdGFuY2VvZiBQcm9taXNlKSByZXR1cm4gdmFsdWU7XG5cbiAgaWYgKHZhbHVlID09PSBudWxsKSByZXR1cm4gTlVMTDtcbiAgaWYgKHZhbHVlID09PSB1bmRlZmluZWQpIHJldHVybiBVTkRFRklORUQ7XG4gIGlmICh2YWx1ZSA9PT0gdHJ1ZSkgcmV0dXJuIFRSVUU7XG4gIGlmICh2YWx1ZSA9PT0gZmFsc2UpIHJldHVybiBGQUxTRTtcbiAgaWYgKHZhbHVlID09PSAwKSByZXR1cm4gWkVSTztcbiAgaWYgKHZhbHVlID09PSAnJykgcmV0dXJuIEVNUFRZU1RSSU5HO1xuXG4gIGlmICh0eXBlb2YgdmFsdWUgPT09ICdvYmplY3QnIHx8IHR5cGVvZiB2YWx1ZSA9PT0gJ2Z1bmN0aW9uJykge1xuICAgIHRyeSB7XG4gICAgICB2YXIgdGhlbiA9IHZhbHVlLnRoZW47XG4gICAgICBpZiAodHlwZW9mIHRoZW4gPT09ICdmdW5jdGlvbicpIHtcbiAgICAgICAgcmV0dXJuIG5ldyBQcm9taXNlKHRoZW4uYmluZCh2YWx1ZSkpO1xuICAgICAgfVxuICAgIH0gY2F0Y2ggKGV4KSB7XG4gICAgICByZXR1cm4gbmV3IFByb21pc2UoZnVuY3Rpb24gKHJlc29sdmUsIHJlamVjdCkge1xuICAgICAgICByZWplY3QoZXgpO1xuICAgICAgfSk7XG4gICAgfVxuICB9XG4gIHJldHVybiB2YWx1ZVByb21pc2UodmFsdWUpO1xufTtcblxuUHJvbWlzZS5hbGwgPSBmdW5jdGlvbiAoYXJyKSB7XG4gIHZhciBhcmdzID0gQXJyYXkucHJvdG90eXBlLnNsaWNlLmNhbGwoYXJyKTtcblxuICByZXR1cm4gbmV3IFByb21pc2UoZnVuY3Rpb24gKHJlc29sdmUsIHJlamVjdCkge1xuICAgIGlmIChhcmdzLmxlbmd0aCA9PT0gMCkgcmV0dXJuIHJlc29sdmUoW10pO1xuICAgIHZhciByZW1haW5pbmcgPSBhcmdzLmxlbmd0aDtcbiAgICBmdW5jdGlvbiByZXMoaSwgdmFsKSB7XG4gICAgICBpZiAodmFsICYmICh0eXBlb2YgdmFsID09PSAnb2JqZWN0JyB8fCB0eXBlb2YgdmFsID09PSAnZnVuY3Rpb24nKSkge1xuICAgICAgICBpZiAodmFsIGluc3RhbmNlb2YgUHJvbWlzZSAmJiB2YWwudGhlbiA9PT0gUHJvbWlzZS5wcm90b3R5cGUudGhlbikge1xuICAgICAgICAgIHdoaWxlICh2YWwuXzgzID09PSAzKSB7XG4gICAgICAgICAgICB2YWwgPSB2YWwuXzE4O1xuICAgICAgICAgIH1cbiAgICAgICAgICBpZiAodmFsLl84MyA9PT0gMSkgcmV0dXJuIHJlcyhpLCB2YWwuXzE4KTtcbiAgICAgICAgICBpZiAodmFsLl84MyA9PT0gMikgcmVqZWN0KHZhbC5fMTgpO1xuICAgICAgICAgIHZhbC50aGVuKGZ1bmN0aW9uICh2YWwpIHtcbiAgICAgICAgICAgIHJlcyhpLCB2YWwpO1xuICAgICAgICAgIH0sIHJlamVjdCk7XG4gICAgICAgICAgcmV0dXJuO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgIHZhciB0aGVuID0gdmFsLnRoZW47XG4gICAgICAgICAgaWYgKHR5cGVvZiB0aGVuID09PSAnZnVuY3Rpb24nKSB7XG4gICAgICAgICAgICB2YXIgcCA9IG5ldyBQcm9taXNlKHRoZW4uYmluZCh2YWwpKTtcbiAgICAgICAgICAgIHAudGhlbihmdW5jdGlvbiAodmFsKSB7XG4gICAgICAgICAgICAgIHJlcyhpLCB2YWwpO1xuICAgICAgICAgICAgfSwgcmVqZWN0KTtcbiAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICAgIGFyZ3NbaV0gPSB2YWw7XG4gICAgICBpZiAoLS1yZW1haW5pbmcgPT09IDApIHtcbiAgICAgICAgcmVzb2x2ZShhcmdzKTtcbiAgICAgIH1cbiAgICB9XG4gICAgZm9yICh2YXIgaSA9IDA7IGkgPCBhcmdzLmxlbmd0aDsgaSsrKSB7XG4gICAgICByZXMoaSwgYXJnc1tpXSk7XG4gICAgfVxuICB9KTtcbn07XG5cblByb21pc2UucmVqZWN0ID0gZnVuY3Rpb24gKHZhbHVlKSB7XG4gIHJldHVybiBuZXcgUHJvbWlzZShmdW5jdGlvbiAocmVzb2x2ZSwgcmVqZWN0KSB7XG4gICAgcmVqZWN0KHZhbHVlKTtcbiAgfSk7XG59O1xuXG5Qcm9taXNlLnJhY2UgPSBmdW5jdGlvbiAodmFsdWVzKSB7XG4gIHJldHVybiBuZXcgUHJvbWlzZShmdW5jdGlvbiAocmVzb2x2ZSwgcmVqZWN0KSB7XG4gICAgdmFsdWVzLmZvckVhY2goZnVuY3Rpb24odmFsdWUpe1xuICAgICAgUHJvbWlzZS5yZXNvbHZlKHZhbHVlKS50aGVuKHJlc29sdmUsIHJlamVjdCk7XG4gICAgfSk7XG4gIH0pO1xufTtcblxuLyogUHJvdG90eXBlIE1ldGhvZHMgKi9cblxuUHJvbWlzZS5wcm90b3R5cGVbJ2NhdGNoJ10gPSBmdW5jdGlvbiAob25SZWplY3RlZCkge1xuICByZXR1cm4gdGhpcy50aGVuKG51bGwsIG9uUmVqZWN0ZWQpO1xufTtcbiIsIid1c2Ugc3RyaWN0JztcblxudmFyIFByb21pc2UgPSByZXF1aXJlKCcuL2NvcmUnKTtcblxudmFyIERFRkFVTFRfV0hJVEVMSVNUID0gW1xuICBSZWZlcmVuY2VFcnJvcixcbiAgVHlwZUVycm9yLFxuICBSYW5nZUVycm9yXG5dO1xuXG52YXIgZW5hYmxlZCA9IGZhbHNlO1xuZXhwb3J0cy5kaXNhYmxlID0gZGlzYWJsZTtcbmZ1bmN0aW9uIGRpc2FibGUoKSB7XG4gIGVuYWJsZWQgPSBmYWxzZTtcbiAgUHJvbWlzZS5fNDcgPSBudWxsO1xuICBQcm9taXNlLl83MSA9IG51bGw7XG59XG5cbmV4cG9ydHMuZW5hYmxlID0gZW5hYmxlO1xuZnVuY3Rpb24gZW5hYmxlKG9wdGlvbnMpIHtcbiAgb3B0aW9ucyA9IG9wdGlvbnMgfHwge307XG4gIGlmIChlbmFibGVkKSBkaXNhYmxlKCk7XG4gIGVuYWJsZWQgPSB0cnVlO1xuICB2YXIgaWQgPSAwO1xuICB2YXIgZGlzcGxheUlkID0gMDtcbiAgdmFyIHJlamVjdGlvbnMgPSB7fTtcbiAgUHJvbWlzZS5fNDcgPSBmdW5jdGlvbiAocHJvbWlzZSkge1xuICAgIGlmIChcbiAgICAgIHByb21pc2UuXzgzID09PSAyICYmIC8vIElTIFJFSkVDVEVEXG4gICAgICByZWplY3Rpb25zW3Byb21pc2UuXzU2XVxuICAgICkge1xuICAgICAgaWYgKHJlamVjdGlvbnNbcHJvbWlzZS5fNTZdLmxvZ2dlZCkge1xuICAgICAgICBvbkhhbmRsZWQocHJvbWlzZS5fNTYpO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgY2xlYXJUaW1lb3V0KHJlamVjdGlvbnNbcHJvbWlzZS5fNTZdLnRpbWVvdXQpO1xuICAgICAgfVxuICAgICAgZGVsZXRlIHJlamVjdGlvbnNbcHJvbWlzZS5fNTZdO1xuICAgIH1cbiAgfTtcbiAgUHJvbWlzZS5fNzEgPSBmdW5jdGlvbiAocHJvbWlzZSwgZXJyKSB7XG4gICAgaWYgKHByb21pc2UuXzc1ID09PSAwKSB7IC8vIG5vdCB5ZXQgaGFuZGxlZFxuICAgICAgcHJvbWlzZS5fNTYgPSBpZCsrO1xuICAgICAgcmVqZWN0aW9uc1twcm9taXNlLl81Nl0gPSB7XG4gICAgICAgIGRpc3BsYXlJZDogbnVsbCxcbiAgICAgICAgZXJyb3I6IGVycixcbiAgICAgICAgdGltZW91dDogc2V0VGltZW91dChcbiAgICAgICAgICBvblVuaGFuZGxlZC5iaW5kKG51bGwsIHByb21pc2UuXzU2KSxcbiAgICAgICAgICAvLyBGb3IgcmVmZXJlbmNlIGVycm9ycyBhbmQgdHlwZSBlcnJvcnMsIHRoaXMgYWxtb3N0IGFsd2F5c1xuICAgICAgICAgIC8vIG1lYW5zIHRoZSBwcm9ncmFtbWVyIG1hZGUgYSBtaXN0YWtlLCBzbyBsb2cgdGhlbSBhZnRlciBqdXN0XG4gICAgICAgICAgLy8gMTAwbXNcbiAgICAgICAgICAvLyBvdGhlcndpc2UsIHdhaXQgMiBzZWNvbmRzIHRvIHNlZSBpZiB0aGV5IGdldCBoYW5kbGVkXG4gICAgICAgICAgbWF0Y2hXaGl0ZWxpc3QoZXJyLCBERUZBVUxUX1dISVRFTElTVClcbiAgICAgICAgICAgID8gMTAwXG4gICAgICAgICAgICA6IDIwMDBcbiAgICAgICAgKSxcbiAgICAgICAgbG9nZ2VkOiBmYWxzZVxuICAgICAgfTtcbiAgICB9XG4gIH07XG4gIGZ1bmN0aW9uIG9uVW5oYW5kbGVkKGlkKSB7XG4gICAgaWYgKFxuICAgICAgb3B0aW9ucy5hbGxSZWplY3Rpb25zIHx8XG4gICAgICBtYXRjaFdoaXRlbGlzdChcbiAgICAgICAgcmVqZWN0aW9uc1tpZF0uZXJyb3IsXG4gICAgICAgIG9wdGlvbnMud2hpdGVsaXN0IHx8IERFRkFVTFRfV0hJVEVMSVNUXG4gICAgICApXG4gICAgKSB7XG4gICAgICByZWplY3Rpb25zW2lkXS5kaXNwbGF5SWQgPSBkaXNwbGF5SWQrKztcbiAgICAgIGlmIChvcHRpb25zLm9uVW5oYW5kbGVkKSB7XG4gICAgICAgIHJlamVjdGlvbnNbaWRdLmxvZ2dlZCA9IHRydWU7XG4gICAgICAgIG9wdGlvbnMub25VbmhhbmRsZWQoXG4gICAgICAgICAgcmVqZWN0aW9uc1tpZF0uZGlzcGxheUlkLFxuICAgICAgICAgIHJlamVjdGlvbnNbaWRdLmVycm9yXG4gICAgICAgICk7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICByZWplY3Rpb25zW2lkXS5sb2dnZWQgPSB0cnVlO1xuICAgICAgICBsb2dFcnJvcihcbiAgICAgICAgICByZWplY3Rpb25zW2lkXS5kaXNwbGF5SWQsXG4gICAgICAgICAgcmVqZWN0aW9uc1tpZF0uZXJyb3JcbiAgICAgICAgKTtcbiAgICAgIH1cbiAgICB9XG4gIH1cbiAgZnVuY3Rpb24gb25IYW5kbGVkKGlkKSB7XG4gICAgaWYgKHJlamVjdGlvbnNbaWRdLmxvZ2dlZCkge1xuICAgICAgaWYgKG9wdGlvbnMub25IYW5kbGVkKSB7XG4gICAgICAgIG9wdGlvbnMub25IYW5kbGVkKHJlamVjdGlvbnNbaWRdLmRpc3BsYXlJZCwgcmVqZWN0aW9uc1tpZF0uZXJyb3IpO1xuICAgICAgfSBlbHNlIGlmICghcmVqZWN0aW9uc1tpZF0ub25VbmhhbmRsZWQpIHtcbiAgICAgICAgY29uc29sZS53YXJuKFxuICAgICAgICAgICdQcm9taXNlIFJlamVjdGlvbiBIYW5kbGVkIChpZDogJyArIHJlamVjdGlvbnNbaWRdLmRpc3BsYXlJZCArICcpOidcbiAgICAgICAgKTtcbiAgICAgICAgY29uc29sZS53YXJuKFxuICAgICAgICAgICcgIFRoaXMgbWVhbnMgeW91IGNhbiBpZ25vcmUgYW55IHByZXZpb3VzIG1lc3NhZ2VzIG9mIHRoZSBmb3JtIFwiUG9zc2libGUgVW5oYW5kbGVkIFByb21pc2UgUmVqZWN0aW9uXCIgd2l0aCBpZCAnICtcbiAgICAgICAgICByZWplY3Rpb25zW2lkXS5kaXNwbGF5SWQgKyAnLidcbiAgICAgICAgKTtcbiAgICAgIH1cbiAgICB9XG4gIH1cbn1cblxuZnVuY3Rpb24gbG9nRXJyb3IoaWQsIGVycm9yKSB7XG4gIGNvbnNvbGUud2FybignUG9zc2libGUgVW5oYW5kbGVkIFByb21pc2UgUmVqZWN0aW9uIChpZDogJyArIGlkICsgJyk6Jyk7XG4gIHZhciBlcnJTdHIgPSAoZXJyb3IgJiYgKGVycm9yLnN0YWNrIHx8IGVycm9yKSkgKyAnJztcbiAgZXJyU3RyLnNwbGl0KCdcXG4nKS5mb3JFYWNoKGZ1bmN0aW9uIChsaW5lKSB7XG4gICAgY29uc29sZS53YXJuKCcgICcgKyBsaW5lKTtcbiAgfSk7XG59XG5cbmZ1bmN0aW9uIG1hdGNoV2hpdGVsaXN0KGVycm9yLCBsaXN0KSB7XG4gIHJldHVybiBsaXN0LnNvbWUoZnVuY3Rpb24gKGNscykge1xuICAgIHJldHVybiBlcnJvciBpbnN0YW5jZW9mIGNscztcbiAgfSk7XG59IiwidmFyIExvZ2dlciA9IHJlcXVpcmUoJy4vbW9kdWxlcy9sb2dnZXInKTtcbnZhciBQdWJTdWIgPSByZXF1aXJlKCcuL21vZHVsZXMvcHVic3ViJyk7XG52YXIgQ2FsbGVyID0gcmVxdWlyZSgnLi9tb2R1bGVzL2NhbGxlcicpO1xudmFyIERvbSA9IHJlcXVpcmUoJy4vbW9kdWxlcy9kb20nKTtcbnZhciBJbmZvQ29udHJvbGxlciA9IHJlcXVpcmUoJy4vbW9kdWxlcy9pbmZvLWNvbnRyb2xsZXInKTtcbnZhciBBdmF0YXJDb250cm9sbGVyID0gcmVxdWlyZSgnLi9tb2R1bGVzL2F2YXRhci1jb250cm9sbGVyJyk7XG52YXIgU3RvcmUgPSByZXF1aXJlKCcuL21vZHVsZXMvc3RvcmUnKTtcbnZhciBDbG91ZGluYXJ5ID0gcmVxdWlyZSgnLi9tb2R1bGVzL2Nsb3VkaW5hcnktaW1hZ2UtcGlja2VyJyk7XG52YXIgcHBiYUNvbmYgPSB7fTtcblxuaWYgKHR5cGVvZiBQcm9taXNlID09PSAndW5kZWZpbmVkJykge1xuXHRyZXF1aXJlKCdwcm9taXNlL2xpYi9yZWplY3Rpb24tdHJhY2tpbmcnKS5lbmFibGUoKTtcblx0d2luZG93LlByb21pc2UgPSByZXF1aXJlKCdwcm9taXNlL2xpYi9lczYtZXh0ZW5zaW9ucy5qcycpO1xufVxuXG52YXIgYWZ0ZXJSZW5kZXIgPSBmdW5jdGlvbiBhZnRlclJlbmRlcigpIHtcblx0aWYgKGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKCdiYWMtLXB1cmVzZGstLWFwcHMtLW9wZW5lci0tJykpIHtcblx0XHRkb2N1bWVudC5nZXRFbGVtZW50QnlJZCgnYmFjLS1wdXJlc2RrLS1hcHBzLS1vcGVuZXItLScpLmFkZEV2ZW50TGlzdGVuZXIoJ2NsaWNrJywgZnVuY3Rpb24gKGUpIHtcblx0XHRcdGUuc3RvcFByb3BhZ2F0aW9uKCk7XG5cdFx0XHQvLyBEb20udG9nZ2xlQ2xhc3MoZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoJ2JhYy0tcHVyZXNkay1hcHBzLWNvbnRhaW5lci0tJyksICdhY3RpdmUnKTtcblx0XHRcdHdpbmRvdy5sb2NhdGlvbi5ocmVmID0gU3RvcmUuZ2V0Um9vdFVybCgpO1xuXHRcdH0pO1xuXHR9XG5cblx0ZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoJ2JhYy0tdXNlci1hdmF0YXItdG9wJykuYWRkRXZlbnRMaXN0ZW5lcignY2xpY2snLCBmdW5jdGlvbiAoZSkge1xuXHRcdGUuc3RvcFByb3BhZ2F0aW9uKCk7XG5cdFx0Ly8gRG9tLnJlbW92ZUNsYXNzKGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKCdiYWMtLXB1cmVzZGstYXBwcy1jb250YWluZXItLScpLCAnYWN0aXZlJyk7XG5cdFx0RG9tLnRvZ2dsZUNsYXNzKGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKCdiYWMtLXB1cmVzZGstdXNlci1zaWRlYmFyLS0nKSwgJ2FjdGl2ZScpO1xuXHR9KTtcblxuXHR3aW5kb3cuYWRkRXZlbnRMaXN0ZW5lcignY2xpY2snLCBmdW5jdGlvbiAoZSkge1xuXHRcdC8vIERvbS5yZW1vdmVDbGFzcyhkb2N1bWVudC5nZXRFbGVtZW50QnlJZCgnYmFjLS1wdXJlc2RrLWFwcHMtY29udGFpbmVyLS0nKSwgJ2FjdGl2ZScpO1xuXHRcdERvbS5yZW1vdmVDbGFzcyhkb2N1bWVudC5nZXRFbGVtZW50QnlJZCgnYmFjLS1wdXJlc2RrLXVzZXItc2lkZWJhci0tJyksICdhY3RpdmUnKTtcblx0fSk7XG5cblx0QXZhdGFyQ29udHJvbGxlci5pbml0KCk7XG5cdHZhciB1c2VyRGF0YSA9IFN0b3JlLmdldFVzZXJEYXRhKCk7XG5cdEF2YXRhckNvbnRyb2xsZXIuc2V0QXZhdGFyKHVzZXJEYXRhLnVzZXIuYXZhdGFyX3VybCk7XG5cblx0SW5mb0NvbnRyb2xsZXIuaW5pdCgpO1xufTtcblxudmFyIFBQQkEgPSB7XG5cdHNldFdpbmRvd05hbWU6IGZ1bmN0aW9uIHNldFdpbmRvd05hbWUod24pIHtcblx0XHRTdG9yZS5zZXRXaW5kb3dOYW1lKHduKTtcblx0fSxcblxuXHRzZXRDb25maWd1cmF0aW9uOiBmdW5jdGlvbiBzZXRDb25maWd1cmF0aW9uKGNvbmYpIHtcblx0XHRTdG9yZS5zZXRDb25maWd1cmF0aW9uKGNvbmYpO1xuXHR9LFxuXG5cdHNldEhUTUxUZW1wbGF0ZTogZnVuY3Rpb24gc2V0SFRNTFRlbXBsYXRlKHRlbXBsYXRlKSB7XG5cdFx0U3RvcmUuc2V0SFRNTFRlbXBsYXRlKHRlbXBsYXRlKTtcblx0fSxcblxuXHRzZXRWZXJzaW9uTnVtYmVyOiBmdW5jdGlvbiBzZXRWZXJzaW9uTnVtYmVyKHZlcnNpb24pIHtcblx0XHRTdG9yZS5zZXRWZXJzaW9uTnVtYmVyKHZlcnNpb24pO1xuXHR9LFxuXG5cdGluaXQ6IGZ1bmN0aW9uIGluaXQoY29uZikge1xuXHRcdExvZ2dlci5sb2coJ2luaXRpYWxpemluZyB3aXRoIGNvbmY6ICcsIGNvbmYpO1xuXHRcdGlmIChjb25mKSB7XG5cdFx0XHRpZiAoY29uZi5oZWFkZXJEaXZJZCkge1xuXHRcdFx0XHRTdG9yZS5zZXRIVE1MQ29udGFpbmVyKGNvbmYuaGVhZGVyRGl2SWQpO1xuXHRcdFx0fVxuXHRcdFx0aWYgKGNvbmYuYXBwc1Zpc2libGUgIT09IG51bGwpIHtcblx0XHRcdFx0U3RvcmUuc2V0QXBwc1Zpc2libGUoY29uZi5hcHBzVmlzaWJsZSk7XG5cdFx0XHR9XG5cdFx0XHRpZiAoY29uZi5yb290VXJsKSB7XG5cdFx0XHRcdFN0b3JlLnNldFJvb3RVcmwoY29uZi5yb290VXJsKTtcblx0XHRcdH1cblx0XHRcdGlmIChjb25mLmRldiA9PT0gdHJ1ZSkge1xuXHRcdFx0XHRpZiAoY29uZi5kZXZLZXlzKSB7XG5cdFx0XHRcdFx0Q2FsbGVyLnNldERldktleXMoY29uZi5kZXZLZXlzKTtcblx0XHRcdFx0XHRTdG9yZS5zZXREZXYodHJ1ZSk7XG5cdFx0XHRcdH1cblx0XHRcdH1cblx0XHRcdGlmIChjb25mLmFwcEluZm8pIHtcblx0XHRcdFx0U3RvcmUuc2V0QXBwSW5mbyhjb25mLmFwcEluZm8pO1xuXHRcdFx0fVxuXG5cdFx0XHQvKiBvcHRpb25hbCBzZXNzaW9uIHVybCAqL1xuXHRcdFx0aWYgKGNvbmYuc2Vzc2lvbkVuZHBvaW50KSB7XG5cdFx0XHRcdFN0b3JlLnNldFNlc3Npb25FbmRwb2ludChjb25mLnNlc3Npb25FbmRwb2ludCk7XG5cdFx0XHR9XG5cblx0XHRcdGlmIChjb25mLmFwaVJvb3RGb2xkZXIpIHtcblx0XHRcdFx0U3RvcmUuc2V0VXJsVmVyc2lvblByZWZpeChjb25mLmFwaVJvb3RGb2xkZXIpO1xuXHRcdFx0fVxuXHRcdH1cblx0XHRwcGJhQ29uZiA9IGNvbmY7XG5cdFx0cmV0dXJuIHRydWU7XG5cdH0sXG5cblx0YXV0aGVudGljYXRlOiBmdW5jdGlvbiBhdXRoZW50aWNhdGUoX3N1Y2Nlc3MpIHtcblx0XHR2YXIgc2VsZiA9IFBQQkE7XG5cdFx0Q2FsbGVyLm1ha2VDYWxsKHtcblx0XHRcdHR5cGU6ICdHRVQnLFxuXHRcdFx0ZW5kcG9pbnQ6IFN0b3JlLmdldEF1dGhlbnRpY2F0aW9uRW5kcG9pbnQoKSxcblx0XHRcdGNhbGxiYWNrczoge1xuXHRcdFx0XHRzdWNjZXNzOiBmdW5jdGlvbiBzdWNjZXNzKHJlc3VsdCkge1xuXHRcdFx0XHRcdExvZ2dlci5sb2cocmVzdWx0KTtcblx0XHRcdFx0XHRTdG9yZS5zZXRVc2VyRGF0YShyZXN1bHQpO1xuXHRcdFx0XHRcdHNlbGYucmVuZGVyKCk7XG5cdFx0XHRcdFx0UFBCQS5nZXRBcHBzKCk7XG5cdFx0XHRcdFx0X3N1Y2Nlc3MocmVzdWx0KTtcblx0XHRcdFx0fSxcblx0XHRcdFx0ZmFpbDogZnVuY3Rpb24gZmFpbChlcnIpIHtcblx0XHRcdFx0XHR3aW5kb3cubG9jYXRpb24uaHJlZiA9IFN0b3JlLmdldExvZ2luVXJsKCk7XG5cdFx0XHRcdH1cblx0XHRcdH1cblx0XHR9KTtcblx0fSxcblxuXHRhdXRoZW50aWNhdGVQcm9taXNlOiBmdW5jdGlvbiBhdXRoZW50aWNhdGVQcm9taXNlKCkge1xuXHRcdHZhciBzZWxmID0gUFBCQTtcblx0XHRyZXR1cm4gQ2FsbGVyLnByb21pc2VDYWxsKHtcblx0XHRcdHR5cGU6ICdHRVQnLFxuXHRcdFx0ZW5kcG9pbnQ6IFN0b3JlLmdldEF1dGhlbnRpY2F0aW9uRW5kcG9pbnQoKSxcblx0XHRcdG1pZGRsZXdhcmVzOiB7XG5cdFx0XHRcdHN1Y2Nlc3M6IGZ1bmN0aW9uIHN1Y2Nlc3MocmVzdWx0KSB7XG5cdFx0XHRcdFx0TG9nZ2VyLmxvZyhyZXN1bHQpO1xuXHRcdFx0XHRcdFN0b3JlLnNldFVzZXJEYXRhKHJlc3VsdCk7XG5cdFx0XHRcdFx0c2VsZi5yZW5kZXIoKTtcblx0XHRcdFx0XHRQUEJBLmdldEFwcHMoKTtcblx0XHRcdFx0fVxuXHRcdFx0fVxuXHRcdH0pO1xuXHR9LFxuXG5cdGdldEFwcHM6IGZ1bmN0aW9uIGdldEFwcHMoKSB7XG5cdFx0Q2FsbGVyLm1ha2VDYWxsKHtcblx0XHRcdHR5cGU6ICdHRVQnLFxuXHRcdFx0ZW5kcG9pbnQ6IFN0b3JlLmdldEFwcHNFbmRwb2ludCgpLFxuXHRcdFx0Y2FsbGJhY2tzOiB7XG5cdFx0XHRcdHN1Y2Nlc3M6IGZ1bmN0aW9uIHN1Y2Nlc3MocmVzdWx0KSB7XG5cdFx0XHRcdFx0U3RvcmUuc2V0QXBwcyhyZXN1bHQpO1xuXHRcdFx0XHRcdC8vIFBQQkEucmVuZGVyQXBwcyhyZXN1bHQuYXBwcyk7XG5cdFx0XHRcdH0sXG5cdFx0XHRcdGZhaWw6IGZ1bmN0aW9uIGZhaWwoZXJyKSB7XG5cdFx0XHRcdFx0d2luZG93LmxvY2F0aW9uLmhyZWYgPSBTdG9yZS5nZXRMb2dpblVybCgpO1xuXHRcdFx0XHR9XG5cdFx0XHR9XG5cdFx0fSk7XG5cdH0sXG5cblx0Z2V0QXZhaWxhYmxlTGlzdGVuZXJzOiBmdW5jdGlvbiBnZXRBdmFpbGFibGVMaXN0ZW5lcnMoKSB7XG5cdFx0cmV0dXJuIFB1YlN1Yi5nZXRBdmFpbGFibGVMaXN0ZW5lcnMoKTtcblx0fSxcblxuXHRzdWJzY3JpYmVMaXN0ZW5lcjogZnVuY3Rpb24gc3Vic2NyaWJlTGlzdGVuZXIoZXZlbnR0LCBmdW5jdCkge1xuXHRcdHJldHVybiBQdWJTdWIuc3Vic2NyaWJlKGV2ZW50dCwgZnVuY3QpO1xuXHR9LFxuXG5cdGdldFVzZXJEYXRhOiBmdW5jdGlvbiBnZXRVc2VyRGF0YSgpIHtcblx0XHRyZXR1cm4gU3RvcmUuZ2V0VXNlckRhdGEoKTtcblx0fSxcblxuXHRzZXRJbnB1dFBsYWNlaG9sZGVyOiBmdW5jdGlvbiBzZXRJbnB1dFBsYWNlaG9sZGVyKHR4dCkge1xuXHRcdC8vIGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKFN0b3JlLmdldFNlYXJjaElucHV0SWQoKSkucGxhY2Vob2xkZXIgPSB0eHQ7XG5cdH0sXG5cblx0Y2hhbmdlQWNjb3VudDogZnVuY3Rpb24gY2hhbmdlQWNjb3VudChhY2NvdW50SWQpIHtcblx0XHRDYWxsZXIubWFrZUNhbGwoe1xuXHRcdFx0dHlwZTogJ0dFVCcsXG5cdFx0XHRlbmRwb2ludDogU3RvcmUuZ2V0U3dpdGNoQWNjb3VudEVuZHBvaW50KGFjY291bnRJZCksXG5cdFx0XHRjYWxsYmFja3M6IHtcblx0XHRcdFx0c3VjY2VzczogZnVuY3Rpb24gc3VjY2VzcyhyZXN1bHQpIHtcblx0XHRcdFx0XHR3aW5kb3cubG9jYXRpb24uaHJlZiA9ICcvYXBwcyc7XG5cdFx0XHRcdH0sXG5cdFx0XHRcdGZhaWw6IGZ1bmN0aW9uIGZhaWwoZXJyKSB7XG5cdFx0XHRcdFx0YWxlcnQoJ1NvcnJ5LCBzb21ldGhpbmcgd2VudCB3cm9uZyB3aXRoIHlvdXIgcmVxdWVzdC4gUGxlc2UgdHJ5IGFnYWluJyk7XG5cdFx0XHRcdH1cblx0XHRcdH1cblx0XHR9KTtcblx0fSxcblxuXHQvLyByZW5kZXJBcHBzOiAoYXBwcykgPT4ge1xuXHQvLyAgIGxldCBhcHBUZW1wbGF0ZSA9IChhcHApID0+IGBcblx0Ly8gXHRcdDxhIGhyZWY9XCIjXCIgc3R5bGU9XCJiYWNrZ3JvdW5kOiAjJHthcHAuY29sb3J9XCI+PGkgY2xhc3M9XCIke2FwcC5pY29ufVwiPjwvaT48L2E+XG5cdC8vIFx0XHQ8c3BhbiBjbGFzcz1cImJhYy0tYXBwLW5hbWVcIj4ke2FwcC5uYW1lfTwvc3Bhbj5cblx0Ly8gXHRcdDxzcGFuIGNsYXNzPVwiYmFjLS1hcHAtZGVzY3JpcHRpb25cIj4ke2FwcC5kZXNjcn08L3NwYW4+XG5cdC8vIFx0YDtcblx0Ly8gICBmb3IobGV0IGk9MDsgaTxhcHBzLmxlbmd0aDsgaSsrKXtcblx0Ly8gXHRcdGxldCBhcHAgPSBhcHBzW2ldO1xuXHQvLyBcdFx0bGV0IGRpdiA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoXCJkaXZcIik7XG5cdC8vIFx0XHRkaXYuY2xhc3NOYW1lID0gXCJiYWMtLWFwcHNcIjtcblx0Ly8gXHRcdGRpdi5pbm5lckhUTUwgPSBhcHBUZW1wbGF0ZShhcHApO1xuXHQvLyBcdFx0ZGl2Lm9uY2xpY2sgPSAoZSkgPT4ge1xuXHQvLyBcdFx0XHQgZS5wcmV2ZW50RGVmYXVsdCgpO1xuXHQvLyBcdFx0XHQgd2luZG93LmxvY2F0aW9uLmhyZWYgPSBhcHAuYXBwbGljYXRpb25fdXJsO1xuXHQvLyBcdFx0fVxuXHQvLyBcdFx0ZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoXCJiYWMtLXB1cmVzZGstYXBwcy1jb250YWluZXItLVwiKS5hcHBlbmRDaGlsZChkaXYpO1xuXHQvLyAgIH1cblx0Ly8gfSxcblxuXHRyZW5kZXJVc2VyOiBmdW5jdGlvbiByZW5kZXJVc2VyKHVzZXIpIHtcblx0XHR2YXIgdXNlclRlbXBsYXRlID0gZnVuY3Rpb24gdXNlclRlbXBsYXRlKHVzZXIpIHtcblx0XHRcdHJldHVybiAnXFxuXFx0XFx0XFx0XFx0PGRpdiBjbGFzcz1cImJhYy0tdXNlci1pbWFnZVwiIGlkPVwiYmFjLS11c2VyLWltYWdlXCI+XFxuXFx0XFx0XFx0XFx0XFx0PGkgY2xhc3M9XCJmYSBmYS1jYW1lcmFcIj48L2k+XFxuXFx0XFx0XFx0ICAgXFx0PGRpdiBpZD1cImJhYy0tdXNlci1pbWFnZS1maWxlXCI+PC9kaXY+XFxuXFx0XFx0XFx0ICAgXFx0PGRpdiBpZD1cImJhYy0tdXNlci1pbWFnZS11cGxvYWQtcHJvZ3Jlc3NcIj5cXG5cXHRcXHRcXHQgICBcXHRcXHQ8c3ZnIHdpZHRoPVxcJzYwcHhcXCcgaGVpZ2h0PVxcJzYwcHhcXCcgeG1sbnM9XCJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2Z1wiIHZpZXdCb3g9XCIwIDAgMTAwIDEwMFwiIHByZXNlcnZlQXNwZWN0UmF0aW89XCJ4TWlkWU1pZFwiIGNsYXNzPVwidWlsLWRlZmF1bHRcIj48cmVjdCB4PVwiMFwiIHk9XCIwXCIgd2lkdGg9XCIxMDBcIiBoZWlnaHQ9XCIxMDBcIiBmaWxsPVwibm9uZVwiIGNsYXNzPVwiYmtcIj48L3JlY3Q+PHJlY3QgIHg9XFwnNDYuNVxcJyB5PVxcJzQwXFwnIHdpZHRoPVxcJzdcXCcgaGVpZ2h0PVxcJzIwXFwnIHJ4PVxcJzVcXCcgcnk9XFwnNVxcJyBmaWxsPVxcJyNmZmZmZmZcXCcgdHJhbnNmb3JtPVxcJ3JvdGF0ZSgwIDUwIDUwKSB0cmFuc2xhdGUoMCAtMzApXFwnPiAgPGFuaW1hdGUgYXR0cmlidXRlTmFtZT1cXCdvcGFjaXR5XFwnIGZyb209XFwnMVxcJyB0bz1cXCcwXFwnIGR1cj1cXCcxc1xcJyBiZWdpbj1cXCctMXNcXCcgcmVwZWF0Q291bnQ9XFwnaW5kZWZpbml0ZVxcJy8+PC9yZWN0PjxyZWN0ICB4PVxcJzQ2LjVcXCcgeT1cXCc0MFxcJyB3aWR0aD1cXCc3XFwnIGhlaWdodD1cXCcyMFxcJyByeD1cXCc1XFwnIHJ5PVxcJzVcXCcgZmlsbD1cXCcjZmZmZmZmXFwnIHRyYW5zZm9ybT1cXCdyb3RhdGUoMzAgNTAgNTApIHRyYW5zbGF0ZSgwIC0zMClcXCc+ICA8YW5pbWF0ZSBhdHRyaWJ1dGVOYW1lPVxcJ29wYWNpdHlcXCcgZnJvbT1cXCcxXFwnIHRvPVxcJzBcXCcgZHVyPVxcJzFzXFwnIGJlZ2luPVxcJy0wLjkxNjY2NjY2NjY2NjY2NjZzXFwnIHJlcGVhdENvdW50PVxcJ2luZGVmaW5pdGVcXCcvPjwvcmVjdD48cmVjdCAgeD1cXCc0Ni41XFwnIHk9XFwnNDBcXCcgd2lkdGg9XFwnN1xcJyBoZWlnaHQ9XFwnMjBcXCcgcng9XFwnNVxcJyByeT1cXCc1XFwnIGZpbGw9XFwnI2ZmZmZmZlxcJyB0cmFuc2Zvcm09XFwncm90YXRlKDYwIDUwIDUwKSB0cmFuc2xhdGUoMCAtMzApXFwnPiAgPGFuaW1hdGUgYXR0cmlidXRlTmFtZT1cXCdvcGFjaXR5XFwnIGZyb209XFwnMVxcJyB0bz1cXCcwXFwnIGR1cj1cXCcxc1xcJyBiZWdpbj1cXCctMC44MzMzMzMzMzMzMzMzMzM0c1xcJyByZXBlYXRDb3VudD1cXCdpbmRlZmluaXRlXFwnLz48L3JlY3Q+PHJlY3QgIHg9XFwnNDYuNVxcJyB5PVxcJzQwXFwnIHdpZHRoPVxcJzdcXCcgaGVpZ2h0PVxcJzIwXFwnIHJ4PVxcJzVcXCcgcnk9XFwnNVxcJyBmaWxsPVxcJyNmZmZmZmZcXCcgdHJhbnNmb3JtPVxcJ3JvdGF0ZSg5MCA1MCA1MCkgdHJhbnNsYXRlKDAgLTMwKVxcJz4gIDxhbmltYXRlIGF0dHJpYnV0ZU5hbWU9XFwnb3BhY2l0eVxcJyBmcm9tPVxcJzFcXCcgdG89XFwnMFxcJyBkdXI9XFwnMXNcXCcgYmVnaW49XFwnLTAuNzVzXFwnIHJlcGVhdENvdW50PVxcJ2luZGVmaW5pdGVcXCcvPjwvcmVjdD48cmVjdCAgeD1cXCc0Ni41XFwnIHk9XFwnNDBcXCcgd2lkdGg9XFwnN1xcJyBoZWlnaHQ9XFwnMjBcXCcgcng9XFwnNVxcJyByeT1cXCc1XFwnIGZpbGw9XFwnI2ZmZmZmZlxcJyB0cmFuc2Zvcm09XFwncm90YXRlKDEyMCA1MCA1MCkgdHJhbnNsYXRlKDAgLTMwKVxcJz4gIDxhbmltYXRlIGF0dHJpYnV0ZU5hbWU9XFwnb3BhY2l0eVxcJyBmcm9tPVxcJzFcXCcgdG89XFwnMFxcJyBkdXI9XFwnMXNcXCcgYmVnaW49XFwnLTAuNjY2NjY2NjY2NjY2NjY2NnNcXCcgcmVwZWF0Q291bnQ9XFwnaW5kZWZpbml0ZVxcJy8+PC9yZWN0PjxyZWN0ICB4PVxcJzQ2LjVcXCcgeT1cXCc0MFxcJyB3aWR0aD1cXCc3XFwnIGhlaWdodD1cXCcyMFxcJyByeD1cXCc1XFwnIHJ5PVxcJzVcXCcgZmlsbD1cXCcjZmZmZmZmXFwnIHRyYW5zZm9ybT1cXCdyb3RhdGUoMTUwIDUwIDUwKSB0cmFuc2xhdGUoMCAtMzApXFwnPiAgPGFuaW1hdGUgYXR0cmlidXRlTmFtZT1cXCdvcGFjaXR5XFwnIGZyb209XFwnMVxcJyB0bz1cXCcwXFwnIGR1cj1cXCcxc1xcJyBiZWdpbj1cXCctMC41ODMzMzMzMzMzMzMzMzM0c1xcJyByZXBlYXRDb3VudD1cXCdpbmRlZmluaXRlXFwnLz48L3JlY3Q+PHJlY3QgIHg9XFwnNDYuNVxcJyB5PVxcJzQwXFwnIHdpZHRoPVxcJzdcXCcgaGVpZ2h0PVxcJzIwXFwnIHJ4PVxcJzVcXCcgcnk9XFwnNVxcJyBmaWxsPVxcJyNmZmZmZmZcXCcgdHJhbnNmb3JtPVxcJ3JvdGF0ZSgxODAgNTAgNTApIHRyYW5zbGF0ZSgwIC0zMClcXCc+ICA8YW5pbWF0ZSBhdHRyaWJ1dGVOYW1lPVxcJ29wYWNpdHlcXCcgZnJvbT1cXCcxXFwnIHRvPVxcJzBcXCcgZHVyPVxcJzFzXFwnIGJlZ2luPVxcJy0wLjVzXFwnIHJlcGVhdENvdW50PVxcJ2luZGVmaW5pdGVcXCcvPjwvcmVjdD48cmVjdCAgeD1cXCc0Ni41XFwnIHk9XFwnNDBcXCcgd2lkdGg9XFwnN1xcJyBoZWlnaHQ9XFwnMjBcXCcgcng9XFwnNVxcJyByeT1cXCc1XFwnIGZpbGw9XFwnI2ZmZmZmZlxcJyB0cmFuc2Zvcm09XFwncm90YXRlKDIxMCA1MCA1MCkgdHJhbnNsYXRlKDAgLTMwKVxcJz4gIDxhbmltYXRlIGF0dHJpYnV0ZU5hbWU9XFwnb3BhY2l0eVxcJyBmcm9tPVxcJzFcXCcgdG89XFwnMFxcJyBkdXI9XFwnMXNcXCcgYmVnaW49XFwnLTAuNDE2NjY2NjY2NjY2NjY2N3NcXCcgcmVwZWF0Q291bnQ9XFwnaW5kZWZpbml0ZVxcJy8+PC9yZWN0PjxyZWN0ICB4PVxcJzQ2LjVcXCcgeT1cXCc0MFxcJyB3aWR0aD1cXCc3XFwnIGhlaWdodD1cXCcyMFxcJyByeD1cXCc1XFwnIHJ5PVxcJzVcXCcgZmlsbD1cXCcjZmZmZmZmXFwnIHRyYW5zZm9ybT1cXCdyb3RhdGUoMjQwIDUwIDUwKSB0cmFuc2xhdGUoMCAtMzApXFwnPiAgPGFuaW1hdGUgYXR0cmlidXRlTmFtZT1cXCdvcGFjaXR5XFwnIGZyb209XFwnMVxcJyB0bz1cXCcwXFwnIGR1cj1cXCcxc1xcJyBiZWdpbj1cXCctMC4zMzMzMzMzMzMzMzMzMzMzc1xcJyByZXBlYXRDb3VudD1cXCdpbmRlZmluaXRlXFwnLz48L3JlY3Q+PHJlY3QgIHg9XFwnNDYuNVxcJyB5PVxcJzQwXFwnIHdpZHRoPVxcJzdcXCcgaGVpZ2h0PVxcJzIwXFwnIHJ4PVxcJzVcXCcgcnk9XFwnNVxcJyBmaWxsPVxcJyNmZmZmZmZcXCcgdHJhbnNmb3JtPVxcJ3JvdGF0ZSgyNzAgNTAgNTApIHRyYW5zbGF0ZSgwIC0zMClcXCc+ICA8YW5pbWF0ZSBhdHRyaWJ1dGVOYW1lPVxcJ29wYWNpdHlcXCcgZnJvbT1cXCcxXFwnIHRvPVxcJzBcXCcgZHVyPVxcJzFzXFwnIGJlZ2luPVxcJy0wLjI1c1xcJyByZXBlYXRDb3VudD1cXCdpbmRlZmluaXRlXFwnLz48L3JlY3Q+PHJlY3QgIHg9XFwnNDYuNVxcJyB5PVxcJzQwXFwnIHdpZHRoPVxcJzdcXCcgaGVpZ2h0PVxcJzIwXFwnIHJ4PVxcJzVcXCcgcnk9XFwnNVxcJyBmaWxsPVxcJyNmZmZmZmZcXCcgdHJhbnNmb3JtPVxcJ3JvdGF0ZSgzMDAgNTAgNTApIHRyYW5zbGF0ZSgwIC0zMClcXCc+ICA8YW5pbWF0ZSBhdHRyaWJ1dGVOYW1lPVxcJ29wYWNpdHlcXCcgZnJvbT1cXCcxXFwnIHRvPVxcJzBcXCcgZHVyPVxcJzFzXFwnIGJlZ2luPVxcJy0wLjE2NjY2NjY2NjY2NjY2NjY2c1xcJyByZXBlYXRDb3VudD1cXCdpbmRlZmluaXRlXFwnLz48L3JlY3Q+PHJlY3QgIHg9XFwnNDYuNVxcJyB5PVxcJzQwXFwnIHdpZHRoPVxcJzdcXCcgaGVpZ2h0PVxcJzIwXFwnIHJ4PVxcJzVcXCcgcnk9XFwnNVxcJyBmaWxsPVxcJyNmZmZmZmZcXCcgdHJhbnNmb3JtPVxcJ3JvdGF0ZSgzMzAgNTAgNTApIHRyYW5zbGF0ZSgwIC0zMClcXCc+ICA8YW5pbWF0ZSBhdHRyaWJ1dGVOYW1lPVxcJ29wYWNpdHlcXCcgZnJvbT1cXCcxXFwnIHRvPVxcJzBcXCcgZHVyPVxcJzFzXFwnIGJlZ2luPVxcJy0wLjA4MzMzMzMzMzMzMzMzMzMzc1xcJyByZXBlYXRDb3VudD1cXCdpbmRlZmluaXRlXFwnLz48L3JlY3Q+PC9zdmc+XFxuXFx0XFx0XFx0XFx0XFx0PC9kaXY+XFxuXFx0XFx0XFx0ICAgPC9kaXY+XFxuXFx0XFx0XFx0XFx0PGRpdiBjbGFzcz1cImJhYy0tdXNlci1uYW1lXCI+JyArIHVzZXIuZmlyc3RuYW1lICsgJyAnICsgdXNlci5sYXN0bmFtZSArICc8L2Rpdj5cXG5cXHRcXHRcXHRcXHQ8ZGl2IGNsYXNzPVwiYmFjLS11c2VyLWVtYWlsXCI+JyArIHVzZXIuZW1haWwgKyAnPC9kaXY+XFxuXFx0XFx0XFx0Jztcblx0XHR9O1xuXHRcdHZhciBkaXYgPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KCdkaXYnKTtcblx0XHRkaXYuY2xhc3NOYW1lID0gXCJiYWMtLXVzZXItc2lkZWJhci1pbmZvXCI7XG5cdFx0ZGl2LmlubmVySFRNTCA9IHVzZXJUZW1wbGF0ZSh1c2VyKTtcblx0XHRkb2N1bWVudC5nZXRFbGVtZW50QnlJZCgnYmFjLS1wdXJlc2RrLXVzZXItZGV0YWlscy0tJykuYXBwZW5kQ2hpbGQoZGl2KTtcblx0XHRkb2N1bWVudC5nZXRFbGVtZW50QnlJZCgnYmFjLS1wdXJlc2RrLXVzZXItYXZhdGFyLS0nKS5pbm5lckhUTUwgPSB1c2VyLmZpcnN0bmFtZS5jaGFyQXQoMCkgKyB1c2VyLmxhc3RuYW1lLmNoYXJBdCgwKTtcblx0fSxcblxuXHRyZW5kZXJBY2NvdW50czogZnVuY3Rpb24gcmVuZGVyQWNjb3VudHMoYWNjb3VudHMsIGN1cnJlbnRBY2NvdW50KSB7XG5cdFx0Ly8gTG9nZ2VyLmxvZyhjdXJyZW50QWNjb3VudCk7XG5cdFx0dmFyIGFjY291bnRzVGVtcGxhdGUgPSBmdW5jdGlvbiBhY2NvdW50c1RlbXBsYXRlKGFjY291bnQsIGlzVGhlU2VsZWN0ZWQpIHtcblx0XHRcdHJldHVybiAnXFxuXFx0XFx0XFx0XFx0PGRpdiBjbGFzcz1cImJhYy0tdXNlci1saXN0LWl0ZW0taW1hZ2VcIj5cXG5cXHRcXHRcXHRcXHRcXHQ8aW1nIHNyYz1cIicgKyBhY2NvdW50LnNka19zcXVhcmVfbG9nb19pY29uICsgJ1wiIGFsdD1cIlwiPlxcblxcdFxcdFxcdFxcdDwvZGl2PlxcblxcdFxcdFxcdFxcdDxkaXYgY2xhc3M9XCJiYWMtdXNlci1hcHAtZGV0YWlsc1wiPlxcblxcdFxcdFxcdFxcdFxcdCA8c3Bhbj4nICsgYWNjb3VudC5uYW1lICsgJzwvc3Bhbj5cXG5cXHRcXHRcXHRcXHQ8L2Rpdj5cXG5cXHRcXHRcXHRcXHQnICsgKGlzVGhlU2VsZWN0ZWQgPyAnPGRpdiBpZD1cImJhYy0tc2VsZWN0ZWQtYWNvdW50LWluZGljYXRvclwiIGNsYXNzPVwiYmFjLS1zZWxlY3RlZC1hY291bnQtaW5kaWNhdG9yXCI+PC9kaXY+JyA6ICcnKSArICdcXG5cXHRcXHRcXHQnO1xuXHRcdH07XG5cblx0XHR2YXIgX2xvb3AgPSBmdW5jdGlvbiBfbG9vcChpKSB7XG5cdFx0XHR2YXIgYWNjb3VudCA9IGFjY291bnRzW2ldO1xuXHRcdFx0dmFyIGRpdiA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoJ2RpdicpO1xuXHRcdFx0ZGl2LmNsYXNzTmFtZSA9ICdiYWMtLXVzZXItbGlzdC1pdGVtJztcblx0XHRcdGRpdi5pbm5lckhUTUwgPSBhY2NvdW50c1RlbXBsYXRlKGFjY291bnQsIGFjY291bnQuc2ZpZCA9PT0gY3VycmVudEFjY291bnQuc2ZpZCk7XG5cdFx0XHRkaXYub25jbGljayA9IGZ1bmN0aW9uIChlKSB7XG5cdFx0XHRcdGUucHJldmVudERlZmF1bHQoKTtcblx0XHRcdFx0UFBCQS5jaGFuZ2VBY2NvdW50KGFjY291bnQuc2ZpZCk7XG5cdFx0XHR9O1xuXHRcdFx0ZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoJ2JhYy0tcHVyZXNkay11c2VyLWJ1c2luZXNzZXMtLScpLmFwcGVuZENoaWxkKGRpdik7XG5cdFx0fTtcblxuXHRcdGZvciAodmFyIGkgPSAwOyBpIDwgYWNjb3VudHMubGVuZ3RoOyBpKyspIHtcblx0XHRcdF9sb29wKGkpO1xuXHRcdH1cblx0fSxcblxuXHRyZW5kZXJJbmZvQmxvY2tzOiBmdW5jdGlvbiByZW5kZXJJbmZvQmxvY2tzKCkge1xuXHRcdHZhciBibG9ja3NUZW1wbGF0ZSA9IGZ1bmN0aW9uIGJsb2Nrc1RlbXBsYXRlKGluZGV4KSB7XG5cdFx0XHRyZXR1cm4gJ1xcblxcdFxcdFxcdFxcdCA8ZGl2IGNsYXNzPVwiYmFjLS1wdXJlc2RrLWluZm8tYm94LS1cIiBpZD1cImJhYy0tcHVyZXNkay1pbmZvLWJveC0tJyArIGluZGV4ICsgJ1wiPlxcblxcdFxcdFxcdFxcdCBcXHQ8ZGl2IGNsYXNzPVwiYmFjLS10aW1lclwiIGlkPVwiYmFjLS10aW1lcicgKyBpbmRleCArICdcIj48L2Rpdj5cXG5cXHRcXHRcXHRcXHRcXHQgPGRpdiBjbGFzcz1cImJhYy0taW5uZXItaW5mby1ib3gtLVwiPlxcblxcdFxcdFxcdFxcdFxcdCBcXHRcXHQ8ZGl2IGNsYXNzPVwiYmFjLS1pbmZvLWljb24tLSBmYS1zdWNjZXNzXCI+PC9kaXY+XFxuXFx0XFx0XFx0XFx0XFx0IFxcdFxcdDxkaXYgY2xhc3M9XCJiYWMtLWluZm8taWNvbi0tIGZhLXdhcm5pbmdcIj48L2Rpdj5cXG5cXHRcXHRcXHRcXHRcXHQgXFx0XFx0PGRpdiBjbGFzcz1cImJhYy0taW5mby1pY29uLS0gZmEtaW5mby0xXCI+PC9kaXY+XFxuXFx0XFx0XFx0XFx0XFx0IFxcdFxcdDxkaXYgY2xhc3M9XCJiYWMtLWluZm8taWNvbi0tIGZhLWVycm9yXCI+PC9kaXY+XFxuXFx0XFx0XFx0XFx0XFx0IFxcdFxcdCA8ZGl2IGNsYXNzPVwiYmFjLS1pbmZvLW1haW4tdGV4dC0tXCIgaWQ9XCJiYWMtLWluZm8tbWFpbi10ZXh0LS0nICsgaW5kZXggKyAnXCI+PC9kaXY+XFxuXFx0XFx0XFx0XFx0XFx0IFxcdFxcdCA8ZGl2IGNsYXNzPVwiYmFjLS1pbmZvLWNsb3NlLWJ1dHRvbi0tIGZhLWNsb3NlLTFcIiBpZD1cImJhYy0taW5mby1jbG9zZS1idXR0b24tLScgKyBpbmRleCArICdcIj48L2Rpdj5cXG5cXHRcXHRcXHRcXHRcXHQ8L2Rpdj5cXG5cXHRcXHRcXHRcXHQ8L2Rpdj5cXG5cXHRcXHQgICc7XG5cdFx0fTtcblxuXHRcdHZhciBpbmZvQmxvY2tzV3JhcHBlciA9IGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKCdiYWMtLWluZm8tYmxvY2tzLXdyYXBwZXItLScpO1xuXHRcdHZhciBpbm5lckh0bWwgPSAnJztcblx0XHRmb3IgKHZhciBpID0gMTsgaSA8IDU7IGkrKykge1xuXHRcdFx0aW5uZXJIdG1sICs9IGJsb2Nrc1RlbXBsYXRlKGkpO1xuXHRcdH1cblxuXHRcdGluZm9CbG9ja3NXcmFwcGVyLmlubmVySFRNTCA9IGlubmVySHRtbDtcblx0fSxcblxuXHRyZW5kZXJWZXJzaW9uTnVtYmVyOiBmdW5jdGlvbiByZW5kZXJWZXJzaW9uTnVtYmVyKHZlcnNpb24pIHtcblx0XHRkb2N1bWVudC5nZXRFbGVtZW50QnlJZCgncHVyZXNkay12ZXJzaW9uLW51bWJlcicpLmlubmVySFRNTCA9IHZlcnNpb247XG5cdH0sXG5cblx0c3R5bGVBY2NvdW50OiBmdW5jdGlvbiBzdHlsZUFjY291bnQoYWNjb3VudCkge1xuXHRcdHZhciBhcHBJbmZvID0gU3RvcmUuZ2V0QXBwSW5mbygpO1xuXHRcdGlmIChhcHBJbmZvID09PSBudWxsKSB7XG5cdFx0XHR2YXIgbG9nbyA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoJ2ltZycpO1xuXHRcdFx0bG9nby5zcmMgPSBhY2NvdW50LnNka19sb2dvX2ljb247XG5cdFx0XHRkb2N1bWVudC5nZXRFbGVtZW50QnlJZCgnYmFjLS1wdXJlc2RrLWFjY291bnQtbG9nby0tJykuYXBwZW5kQ2hpbGQobG9nbyk7XG5cdFx0XHRkb2N1bWVudC5nZXRFbGVtZW50QnlJZCgnYmFjLS1wdXJlc2RrLWFjY291bnQtbG9nby0tJykub25jbGljayA9IGZ1bmN0aW9uIChlKSB7XG5cdFx0XHRcdC8vTG9nZ2VyLmxvZyhTdG9yZS5nZXRSb290VXJsKCkpO1xuXHRcdFx0XHR3aW5kb3cubG9jYXRpb24uaHJlZiA9IFN0b3JlLmdldFJvb3RVcmwoKTtcblx0XHRcdH07XG5cdFx0fSBlbHNlIHtcblx0XHRcdHZhciBhcHBPcGVuZXJUZW1wbGF0ZSA9IGZ1bmN0aW9uIGFwcE9wZW5lclRlbXBsYXRlKGFwcEluZm9ybWF0aW9uKSB7XG5cdFx0XHRcdHJldHVybiAnXFxuXFx0IFxcdCAgXFx0IFxcdFxcdDxkaXYgaWQ9XCJiYWMtLXB1cmVzZGstLWFwcHMtLW9wZW5lci0tXCI+XFxuICAgICAgICAgICAgICAgICAgICA8aSBjbGFzcz1cImZhIGZhLXNxdWFyZXNcIiBpZD1cImJhYy0tcHVyZXNkay1hcHBzLWljb24tLVwiPjwvaT5cXG4gICAgICAgICAgICAgICAgICAgIDxkaXYgaWQ9XCJiYWMtLXB1cmVzZGstYXBwcy1uYW1lLS1cIiBjbGFzcz1cImJhYy0tcHVyZXNkay1hcHBzLW5hbWUtLVwiPmFwcHM8L2Rpdj5cXG4gICAgICAgICAgICAgICAgICAgIDxhIGhyZWY9XCInICsgYXBwSW5mb3JtYXRpb24ucm9vdCArICdcIiBpZD1cImFwcC1uYW1lLWxpbmstdG8tcm9vdFwiPicgKyBhcHBJbmZvcm1hdGlvbi5uYW1lICsgJzwvYT5cXG4gICAgICAgICAgICAgICAgPC9kaXY+XFxuXFx0IFxcdCAgXFx0IFxcdCc7XG5cdFx0XHR9O1xuXHRcdFx0ZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoJ2JhYy0tcHVyZXNkay1hY2NvdW50LWxvZ28tLScpLmlubmVySFRNTCA9IGFwcE9wZW5lclRlbXBsYXRlKGFwcEluZm8pO1xuXHRcdH1cblxuXHRcdGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKCdiYWMtLXB1cmVzZGstYmFjLS1oZWFkZXItYXBwcy0tJykuc3R5bGUuY3NzVGV4dCA9IFwiYmFja2dyb3VuZDogI1wiICsgYWNjb3VudC5zZGtfYmFja2dyb3VuZF9jb2xvciArIFwiOyBjb2xvcjogI1wiICsgYWNjb3VudC5zZGtfZm9udF9jb2xvcjtcblx0XHRkb2N1bWVudC5nZXRFbGVtZW50QnlJZCgnYmFjLS1wdXJlc2RrLXVzZXItc2lkZWJhci0tJykuc3R5bGUuY3NzVGV4dCA9IFwiYmFja2dyb3VuZDogI1wiICsgYWNjb3VudC5zZGtfYmFja2dyb3VuZF9jb2xvciArIFwiOyBjb2xvcjogI1wiICsgYWNjb3VudC5zZGtfZm9udF9jb2xvcjtcblx0XHRpZiAoZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoJ2JhYy0tcHVyZXNkay1hcHBzLW5hbWUtLScpKSB7XG5cdFx0XHRkb2N1bWVudC5nZXRFbGVtZW50QnlJZCgnYmFjLS1wdXJlc2RrLWFwcHMtbmFtZS0tJykuc3R5bGUuY3NzVGV4dCA9IFwiY29sb3I6ICNcIiArIGFjY291bnQuc2RrX2ZvbnRfY29sb3I7XG5cdFx0fVxuXHRcdGlmIChkb2N1bWVudC5nZXRFbGVtZW50QnlJZCgnYmFjLS1zZWxlY3RlZC1hY291bnQtaW5kaWNhdG9yJykpIHtcblx0XHRcdGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKCdiYWMtLXNlbGVjdGVkLWFjb3VudC1pbmRpY2F0b3InKS5zdHlsZS5jc3NUZXh0ID0gXCJiYWNrZ3JvdW5kOiAjXCIgKyBhY2NvdW50LnNka19mb250X2NvbG9yO1xuXHRcdH1cblx0fSxcblxuXHRnb1RvTG9naW5QYWdlOiBmdW5jdGlvbiBnb1RvTG9naW5QYWdlKCkge1xuXHRcdHdpbmRvdy5sb2NhdGlvbi5ocmVmID0gU3RvcmUuZ2V0TG9naW5VcmwoKTtcblx0fSxcblxuXHQvKiBMT0FERVIgKi9cblx0c2hvd0xvYWRlcjogZnVuY3Rpb24gc2hvd0xvYWRlcigpIHtcblx0XHREb20uYWRkQ2xhc3MoZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoJ2JhYy0tcHVyZXNkay0tbG9hZGVyLS0nKSwgJ2JhYy0tcHVyZXNkay12aXNpYmxlJyk7XG5cdH0sXG5cblx0aGlkZUxvYWRlcjogZnVuY3Rpb24gaGlkZUxvYWRlcigpIHtcblx0XHREb20ucmVtb3ZlQ2xhc3MoZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoJ2JhYy0tcHVyZXNkay0tbG9hZGVyLS0nKSwgJ2JhYy0tcHVyZXNkay12aXNpYmxlJyk7XG5cdH0sXG5cblx0b3BlbkNsb3VkaW5hcnlQaWNrZXI6IGZ1bmN0aW9uIG9wZW5DbG91ZGluYXJ5UGlja2VyKG9wdGlvbnMpIHtcblx0XHRDbG91ZGluYXJ5Lm9wZW5Nb2RhbChvcHRpb25zKTtcblx0fSxcblxuXHQvKlxuICB0eXBlOiBvbmUgb2Y6XG4gIC0gc3VjY2Vzc1xuICAtIGluZm9cbiAgLSB3YXJuaW5nXG4gIC0gZXJyb3JcbiAgdGV4dDogdGhlIHRleHQgdG8gZGlzcGxheVxuICBvcHRpb25zIChvcHRpb25hbCk6IHtcbiAgXHRcdGhpZGVJbjogbWlsbGlzZWNvbmRzIHRvIGhpZGUgaXQuIC0xIGZvciBub3QgaGlkaW5nIGl0IGF0IGFsbC4gRGVmYXVsdCBpcyA1MDAwXG4gIH1cbiAgKi9cblx0c2V0SW5mbzogZnVuY3Rpb24gc2V0SW5mbyh0eXBlLCB0ZXh0LCBvcHRpb25zKSB7XG5cdFx0SW5mb0NvbnRyb2xsZXIuc2hvd0luZm8odHlwZSwgdGV4dCwgb3B0aW9ucyk7XG5cdH0sXG5cblx0cmVuZGVyOiBmdW5jdGlvbiByZW5kZXIoKSB7XG5cdFx0dmFyIHdoZXJlVG8gPSBkb2N1bWVudC5nZXRFbGVtZW50QnlJZChTdG9yZS5nZXRIVExNQ29udGFpbmVyKCkpO1xuXHRcdGlmICh3aGVyZVRvID09PSBudWxsKSB7XG5cdFx0XHRMb2dnZXIuZXJyb3IoJ3RoZSBjb250YWluZXIgd2l0aCBpZCBcIicgKyB3aGVyZVRvICsgJ1wiIGhhcyBub3QgYmVlbiBmb3VuZCBvbiB0aGUgZG9jdW1lbnQuIFRoZSBsaWJyYXJ5IGlzIGdvaW5nIHRvIGNyZWF0ZSBpdC4nKTtcblx0XHRcdHZhciBkaXYgPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KCdkaXYnKTtcblx0XHRcdGRpdi5pZCA9IFN0b3JlLmdldEhUTE1Db250YWluZXIoKTtcblx0XHRcdGRpdi5zdHlsZS53aWR0aCA9ICcxMDAlJztcblx0XHRcdGRpdi5zdHlsZS5oZWlnaHQgPSBcIjUwcHhcIjtcblx0XHRcdGRpdi5zdHlsZS5wb3NpdGlvbiA9IFwiZml4ZWRcIjtcblx0XHRcdGRpdi5zdHlsZS50b3AgPSBcIjBweFwiO1xuXHRcdFx0ZGl2LnN0eWxlLnpJbmRleCA9IFwiMjE0NzQ4MzY0N1wiO1xuXHRcdFx0ZG9jdW1lbnQuYm9keS5pbnNlcnRCZWZvcmUoZGl2LCBkb2N1bWVudC5ib2R5LmZpcnN0Q2hpbGQpO1xuXHRcdFx0d2hlcmVUbyA9IGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKFN0b3JlLmdldEhUTE1Db250YWluZXIoKSk7XG5cdFx0fVxuXHRcdHdoZXJlVG8uaW5uZXJIVE1MID0gU3RvcmUuZ2V0SFRNTCgpO1xuXHRcdFBQQkEucmVuZGVyVXNlcihTdG9yZS5nZXRVc2VyRGF0YSgpLnVzZXIpO1xuXHRcdFBQQkEucmVuZGVySW5mb0Jsb2NrcygpO1xuXHRcdFBQQkEucmVuZGVyQWNjb3VudHMoU3RvcmUuZ2V0VXNlckRhdGEoKS51c2VyLmFjY291bnRzLCBTdG9yZS5nZXRVc2VyRGF0YSgpLnVzZXIuYWNjb3VudCk7XG5cdFx0UFBCQS5zdHlsZUFjY291bnQoU3RvcmUuZ2V0VXNlckRhdGEoKS51c2VyLmFjY291bnQpO1xuXHRcdFBQQkEucmVuZGVyVmVyc2lvbk51bWJlcihTdG9yZS5nZXRWZXJzaW9uTnVtYmVyKCkpO1xuXHRcdGlmIChTdG9yZS5nZXRBcHBzVmlzaWJsZSgpID09PSBmYWxzZSkge1xuXHRcdFx0ZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoJ2JhYy0tcHVyZXNkay1hcHBzLXNlY3Rpb24tLScpLnN0eWxlLmNzc1RleHQgPSBcImRpc3BsYXk6bm9uZVwiO1xuXHRcdH1cblx0XHRhZnRlclJlbmRlcigpO1xuXHR9XG59O1xuXG5tb2R1bGUuZXhwb3J0cyA9IFBQQkE7IiwiJ3VzZSBzdHJpY3QnO1xuXG4vKiFcbiAqIFB1cmVQcm9maWxlIFB1cmVQcm9maWxlIEJ1c2luZXNzIEFwcHMgRGV2ZWxvcG1lbnQgU0RLXG4gKlxuICogdmVyc2lvbjogMi42LjExXG4gKiBkYXRlOiAyMDE3LTExLTE2XG4gKlxuICogQ29weXJpZ2h0IDIwMTcsIFB1cmVQcm9maWxlXG4gKiBSZWxlYXNlZCB1bmRlciBNSVQgbGljZW5zZVxuICogaHR0cHM6Ly9vcGVuc291cmNlLm9yZy9saWNlbnNlcy9NSVRcbiAqL1xuXG52YXIgcHBiYSA9IHJlcXVpcmUoJy4vUFBCQScpO1xucHBiYS5zZXRXaW5kb3dOYW1lKCdQVVJFU0RLJyk7XG5wcGJhLnNldENvbmZpZ3VyYXRpb24oe1xuICAgIFwibG9nc1wiOiBmYWxzZSxcbiAgICBcInJvb3RVcmxcIjogXCIvXCIsXG4gICAgXCJiYXNlVXJsXCI6IFwiYXBpL3YxL1wiLFxuICAgIFwibG9naW5VcmxcIjogXCJhcGkvdjEvb2F1dGgyXCIsXG4gICAgXCJzZWFyY2hJbnB1dElkXCI6IFwiLS1wdXJlc2RrLS1zZWFyY2gtLWlucHV0LS1cIixcbiAgICBcInJlZGlyZWN0VXJsUGFyYW1cIjogXCJyZWRpcmVjdF91cmxcIlxufSk7XG5wcGJhLnNldEhUTUxUZW1wbGF0ZSgnPGhlYWRlciBjbGFzcz1cImJhYy0taGVhZGVyLWFwcHNcIiBpZD1cImJhYy0tcHVyZXNkay1iYWMtLWhlYWRlci1hcHBzLS1cIj5cXG4gICAgPGRpdiBjbGFzcz1cImJhYy0tY29udGFpbmVyXCI+XFxuICAgICAgICA8ZGl2IGNsYXNzPVwiYmFjLS1sb2dvXCIgaWQ9XCJiYWMtLXB1cmVzZGstYWNjb3VudC1sb2dvLS1cIj48L2Rpdj5cXG4gICAgICAgIDxkaXYgY2xhc3M9XCJiYWMtLXVzZXItYWN0aW9uc1wiPlxcbiAgICAgICAgICAgIDxzdmcgaWQ9XCJiYWMtLXB1cmVzZGstLWxvYWRlci0tXCIgd2lkdGg9XCIzOFwiIGhlaWdodD1cIjM4XCIgdmlld0JveD1cIjAgMCA0NCA0NFwiIHhtbG5zPVwiaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmdcIiBzdHJva2U9XCIjZmZmXCIgc3R5bGU9XCJcXG4gICAgbWFyZ2luLXJpZ2h0OiAxMHB4O1xcblwiPlxcbiAgICAgICAgICAgICAgICA8ZyBmaWxsPVwibm9uZVwiIGZpbGwtcnVsZT1cImV2ZW5vZGRcIiBzdHJva2Utd2lkdGg9XCIyXCI+XFxuICAgICAgICAgICAgICAgICAgICA8Y2lyY2xlIGN4PVwiMjJcIiBjeT1cIjIyXCIgcj1cIjE2LjY0MzdcIj5cXG4gICAgICAgICAgICAgICAgICAgICAgICA8YW5pbWF0ZSBhdHRyaWJ1dGVOYW1lPVwiclwiIGJlZ2luPVwiMHNcIiBkdXI9XCIxLjhzXCIgdmFsdWVzPVwiMTsgMjBcIiBjYWxjTW9kZT1cInNwbGluZVwiIGtleVRpbWVzPVwiMDsgMVwiIGtleVNwbGluZXM9XCIwLjE2NSwgMC44NCwgMC40NCwgMVwiIHJlcGVhdENvdW50PVwiaW5kZWZpbml0ZVwiPjwvYW5pbWF0ZT5cXG4gICAgICAgICAgICAgICAgICAgICAgICA8YW5pbWF0ZSBhdHRyaWJ1dGVOYW1lPVwic3Ryb2tlLW9wYWNpdHlcIiBiZWdpbj1cIjBzXCIgZHVyPVwiMS44c1wiIHZhbHVlcz1cIjE7IDBcIiBjYWxjTW9kZT1cInNwbGluZVwiIGtleVRpbWVzPVwiMDsgMVwiIGtleVNwbGluZXM9XCIwLjMsIDAuNjEsIDAuMzU1LCAxXCIgcmVwZWF0Q291bnQ9XCJpbmRlZmluaXRlXCI+PC9hbmltYXRlPlxcbiAgICAgICAgICAgICAgICAgICAgPC9jaXJjbGU+XFxuICAgICAgICAgICAgICAgICAgICA8Y2lyY2xlIGN4PVwiMjJcIiBjeT1cIjIyXCIgcj1cIjE5LjkyODJcIj5cXG4gICAgICAgICAgICAgICAgICAgICAgICA8YW5pbWF0ZSBhdHRyaWJ1dGVOYW1lPVwiclwiIGJlZ2luPVwiYmFjLTAuOXNcIiBkdXI9XCIxLjhzXCIgdmFsdWVzPVwiMTsgMjBcIiBjYWxjTW9kZT1cInNwbGluZVwiIGtleVRpbWVzPVwiMDsgMVwiIGtleVNwbGluZXM9XCIwLjE2NSwgMC44NCwgMC40NCwgMVwiIHJlcGVhdENvdW50PVwiaW5kZWZpbml0ZVwiPjwvYW5pbWF0ZT5cXG4gICAgICAgICAgICAgICAgICAgICAgICA8YW5pbWF0ZSBhdHRyaWJ1dGVOYW1lPVwic3Ryb2tlLW9wYWNpdHlcIiBiZWdpbj1cImJhYy0wLjlzXCIgZHVyPVwiMS44c1wiIHZhbHVlcz1cIjE7IDBcIiBjYWxjTW9kZT1cInNwbGluZVwiIGtleVRpbWVzPVwiMDsgMVwiIGtleVNwbGluZXM9XCIwLjMsIDAuNjEsIDAuMzU1LCAxXCIgcmVwZWF0Q291bnQ9XCJpbmRlZmluaXRlXCI+PC9hbmltYXRlPlxcbiAgICAgICAgICAgICAgICAgICAgPC9jaXJjbGU+XFxuICAgICAgICAgICAgICAgIDwvZz5cXG4gICAgICAgICAgICA8L3N2Zz5cXG4gICAgICAgICAgICA8ZGl2IGNsYXNzPVwiYmFjLS11c2VyLWFwcHNcIiBpZD1cImJhYy0tcHVyZXNkay1hcHBzLXNlY3Rpb24tLVwiPlxcbiAgICAgICAgICAgICAgICA8IS0tPGRpdiBpZD1cImJhYyYjNDU7JiM0NTtwdXJlc2RrJiM0NTsmIzQ1O2FwcHMmIzQ1OyYjNDU7b3BlbmVyJiM0NTsmIzQ1O1wiPi0tPlxcbiAgICAgICAgICAgICAgICAgICAgPCEtLTxpIGNsYXNzPVwiZmEgZmEtc3F1YXJlc1wiIGlkPVwiYmFjJiM0NTsmIzQ1O3B1cmVzZGstYXBwcy1pY29uJiM0NTsmIzQ1O1wiPjwvaT4tLT5cXG4gICAgICAgICAgICAgICAgICAgIDwhLS08ZGl2IGNsYXNzPVwiYmFjJiM0NTsmIzQ1O3B1cmVzZGstYXBwcy1uYW1lJiM0NTsmIzQ1O1wiPmFwcHM8L2Rpdj4tLT5cXG4gICAgICAgICAgICAgICAgPCEtLTwvZGl2Pi0tPlxcbiAgICAgICAgICAgICAgICA8IS0tPGRpdiBjbGFzcz1cImJhYyYjNDU7JiM0NTthcHBzLWNvbnRhaW5lclwiIGlkPVwiYmFjJiM0NTsmIzQ1O3B1cmVzZGstYXBwcy1jb250YWluZXImIzQ1OyYjNDU7XCI+LS0+XFxuICAgICAgICAgICAgICAgICAgICA8IS0tPGRpdiBjbGFzcz1cImJhYyYjNDU7JiM0NTthcHBzLWFycm93XCI+PC9kaXY+LS0+XFxuICAgICAgICAgICAgICAgIDwhLS08L2Rpdj4tLT5cXG4gICAgICAgICAgICA8L2Rpdj5cXG4gICAgICAgICAgICA8IS0tPGRpdiBjbGFzcz1cImJhYyYjNDU7JiM0NTt1c2VyLW5vdGlmaWNhdGlvbnNcIj4tLT5cXG4gICAgICAgICAgICAgICAgPCEtLTxkaXYgY2xhc3M9XCJiYWMmIzQ1OyYjNDU7dXNlci1ub3RpZmljYXRpb25zLWNvdW50XCI+MTwvZGl2Pi0tPlxcbiAgICAgICAgICAgICAgICA8IS0tPGkgY2xhc3M9XCJmYSBmYS1iZWxsLW9cIj48L2k+LS0+XFxuICAgICAgICAgICAgPCEtLTwvZGl2Pi0tPlxcbiAgICAgICAgICAgIDxkaXYgY2xhc3M9XCJiYWMtLXVzZXItYXZhdGFyXCIgaWQ9XCJiYWMtLXVzZXItYXZhdGFyLXRvcFwiPlxcbiAgICAgICAgICAgICAgICA8c3BhbiBjbGFzcz1cImJhYy0tdXNlci1hdmF0YXItbmFtZVwiIGlkPVwiYmFjLS1wdXJlc2RrLXVzZXItYXZhdGFyLS1cIj48L3NwYW4+XFxuICAgICAgICAgICAgICAgIDxkaXYgaWQ9XCJiYWMtLWltYWdlLWNvbnRhaW5lci10b3BcIj48L2Rpdj5cXG4gICAgICAgICAgICA8L2Rpdj5cXG4gICAgICAgIDwvZGl2PlxcbiAgICA8L2Rpdj5cXG4gICAgPGRpdiBpZD1cImJhYy0taW5mby1ibG9ja3Mtd3JhcHBlci0tXCI+PC9kaXY+XFxuPC9oZWFkZXI+XFxuPGRpdiBjbGFzcz1cImJhYy0tdXNlci1zaWRlYmFyXCIgaWQ9XCJiYWMtLXB1cmVzZGstdXNlci1zaWRlYmFyLS1cIj5cXG4gICAgPGRpdiBpZD1cImJhYy0tcHVyZXNkay11c2VyLWRldGFpbHMtLVwiPjwvZGl2PlxcbiAgICA8IS0tPGRpdiBjbGFzcz1cImJhYyYjNDU7JiM0NTt1c2VyLXNpZGViYXItaW5mb1wiPi0tPlxcbiAgICAgICAgPCEtLTxkaXYgY2xhc3M9XCJiYWMmIzQ1OyYjNDU7dXNlci1pbWFnZVwiPjxpIGNsYXNzPVwiZmEgZmEtY2FtZXJhXCI+PC9pPjwvZGl2Pi0tPlxcbiAgICAgICAgPCEtLTxkaXYgY2xhc3M9XCJiYWMmIzQ1OyYjNDU7dXNlci1uYW1lXCI+Q3VydGlzIEJhcnRsZXR0PC9kaXY+LS0+XFxuICAgICAgICA8IS0tPGRpdiBjbGFzcz1cImJhYyYjNDU7JiM0NTt1c2VyLWVtYWlsXCI+Y2JhcnRsZXR0QHB1cmVwcm9maWxlLmNvbTwvZGl2Pi0tPlxcbiAgICA8IS0tPC9kaXY+LS0+XFxuICAgIDxkaXYgY2xhc3M9XCJiYWMtLXVzZXItYXBwc1wiIGlkPVwiYmFjLS1wdXJlc2RrLXVzZXItYnVzaW5lc3Nlcy0tXCI+XFxuICAgICAgICA8IS0tPGRpdiBjbGFzcz1cImJhYyYjNDU7JiM0NTt1c2VyLWxpc3QtaXRlbVwiPi0tPlxcbiAgICAgICAgICAgIDwhLS08aW1nIHNyYz1cImh0dHA6Ly9sb3JlbXBpeGVsLmNvbS80MC80MFwiIGFsdD1cIlwiPi0tPlxcbiAgICAgICAgICAgIDwhLS08ZGl2IGNsYXNzPVwiYmFjLXVzZXItYXBwLWRldGFpbHNcIj4tLT5cXG4gICAgICAgICAgICAgICAgPCEtLTxzcGFuPjwvc3Bhbj4tLT5cXG4gICAgICAgICAgICAgICAgPCEtLTxzcGFuPjE1IHRlYW0gbWVtYmVyczwvc3Bhbj4tLT5cXG4gICAgICAgICAgICA8IS0tPC9kaXY+LS0+XFxuICAgICAgICA8IS0tPC9kaXY+LS0+XFxuICAgIDwvZGl2PlxcbiAgICA8ZGl2IGNsYXNzPVwiYmFjLS11c2VyLWFjY291bnQtc2V0dGluZ3NcIj5cXG4gICAgICAgIDwhLS08ZGl2IGNsYXNzPVwiYmFjLXVzZXItYWNvdW50LWxpc3QtaXRlbVwiPi0tPlxcbiAgICAgICAgICAgIDwhLS08aSBjbGFzcz1cImZhIGZhLWNvZy1saW5lXCI+PC9pPi0tPlxcbiAgICAgICAgICAgIDwhLS08YSBocmVmPVwiI1wiPkFjY291bnQgU2VjdXJpdHk8L2E+LS0+XFxuICAgICAgICA8IS0tPC9kaXY+LS0+XFxuICAgICAgICA8ZGl2IGNsYXNzPVwiYmFjLXVzZXItYWNvdW50LWxpc3QtaXRlbVwiPlxcbiAgICAgICAgICAgIDxpIGNsYXNzPVwiZmEgZmEtbG9naW4tbGluZVwiPjwvaT5cXG4gICAgICAgICAgICA8YSBocmVmPVwiL2FwaS92MS9zaWduLW9mZlwiPkxvZyBvdXQ8L2E+XFxuICAgICAgICA8L2Rpdj5cXG5cXG4gICAgICAgIDxkaXYgaWQ9XCJwdXJlc2RrLXZlcnNpb24tbnVtYmVyXCIgY2xhc3M9XCJwdXJlc2RrLXZlcnNpb24tbnVtYmVyXCI+PC9kaXY+XFxuICAgIDwvZGl2PlxcbjwvZGl2PlxcblxcblxcbjxkaXYgY2xhc3M9XCJiYWMtLWN1c3RvbS1tb2RhbCBhZGQtcXVlc3Rpb24tbW9kYWwgLS1pcy1vcGVuXCIgaWQ9XCJiYWMtLWNsb3VkaW5hcnktLW1vZGFsXCI+XFxuICAgIDxkaXYgY2xhc3M9XCJjdXN0b20tbW9kYWxfX3dyYXBwZXJcIj5cXG4gICAgICAgIDxkaXYgY2xhc3M9XCJjdXN0b20tbW9kYWxfX2NvbnRlbnRcIj5cXG4gICAgICAgICAgICA8aDM+QWRkIGltYWdlPC9oMz5cXG4gICAgICAgICAgICA8YSBjbGFzcz1cImN1c3RvbS1tb2RhbF9fY2xvc2UtYnRuXCIgaWQ9XCJiYWMtLWNsb3VkaW5hcnktLWNsb3NlYnRuXCI+PGkgY2xhc3M9XCJmYSBmYS10aW1lcy1jaXJjbGVcIj48L2k+PC9hPlxcbiAgICAgICAgPC9kaXY+XFxuXFxuICAgICAgICA8ZGl2IGNsYXNzPVwiY3VzdG9tLW1vZGFsX19jb250ZW50XCI+XFxuICAgICAgICAgICAgPGRpdiBjbGFzcz1cImJhYy1zZWFyY2ggLS1pY29uLWxlZnRcIj5cXG4gICAgICAgICAgICAgICAgPGlucHV0IGlkPVwiYmFjLS1jbG91ZGluYXJ5LS1zZWFyY2gtaW5wdXRcIiB0eXBlPVwic2VhcmNoXCIgbmFtZT1cInNlYXJjaFwiIHBsYWNlaG9sZGVyPVwiU2VhcmNoIGZvciBpbWFnZXMuLi5cIi8+XFxuICAgICAgICAgICAgICAgIDxkaXYgY2xhc3M9XCJiYWMtc2VhcmNoX19pY29uXCI+PGkgY2xhc3M9XCJmYSBmYS1zZWFyY2hcIj48L2k+PC9kaXY+XFxuICAgICAgICAgICAgPC9kaXY+XFxuICAgICAgICAgICAgPGJyLz5cXG5cXG4gICAgICAgICAgICA8ZGl2IGNsYXNzPVwiYmFjay1idXR0b25cIiBpZD1cImJhYy0tY2xvdWRpbmFyeS0tYmFjay1idXR0b24tY29udGFpbmVyXCI+XFxuICAgICAgICAgICAgICAgIDxhIGNsYXNzPVwiZ29CYWNrXCIgaWQ9XCJiYWMtLWNsb3VkaW5hcnktLWdvLWJhY2tcIj48aSBjbGFzcz1cImZhIGZhLWFuZ2xlLWxlZnRcIj48L2k+R28gQmFjazwvYT5cXG4gICAgICAgICAgICA8L2Rpdj5cXG5cXG4gICAgICAgICAgICA8YnIvPlxcbiAgICAgICAgICAgIDxkaXYgY2xhc3M9XCJjbG91ZC1pbWFnZXNcIj5cXG4gICAgICAgICAgICAgICAgPGRpdiBjbGFzcz1cImNsb3VkLWltYWdlc19fY29udGFpbmVyXCIgaWQ9XCJiYWMtLWNsb3VkaW5hcnktaXRhbXMtY29udGFpbmVyXCI+PC9kaXY+XFxuXFxuICAgICAgICAgICAgICAgIDxkaXYgY2xhc3M9XCJjbG91ZC1pbWFnZXNfX3BhZ2luYXRpb25cIiBpZD1cImJhYy0tY2xvdWRpbmFyeS1wYWdpbmF0aW9uLWNvbnRhaW5lclwiPlxcbiAgICAgICAgICAgICAgICAgICAgPHVsIGlkPVwiYmFjLS1jbG91ZGluYXJ5LWFjdHVhbC1wYWdpbmF0aW9uLWNvbnRhaW5lclwiPjwvdWw+XFxuICAgICAgICAgICAgICAgIDwvZGl2PlxcblxcbiAgICAgICAgICAgIDwvZGl2PlxcbiAgICAgICAgPC9kaXY+XFxuICAgIDwvZGl2PlxcbjwvZGl2PlxcblxcbjxpbnB1dCBzdHlsZT1cImRpc3BsYXk6bm9uZVwiIHR5cGU9XFwnZmlsZVxcJyBpZD1cXCdiYWMtLS1wdXJlc2RrLWF2YXRhci1maWxlXFwnPlxcbjxpbnB1dCBzdHlsZT1cImRpc3BsYXk6bm9uZVwiIHR5cGU9XFwnYnV0dG9uXFwnIGlkPVxcJ2JhYy0tLXB1cmVzZGstYXZhdGFyLXN1Ym1pdFxcJyB2YWx1ZT1cXCdVcGxvYWQhXFwnPicpO1xucHBiYS5zZXRWZXJzaW9uTnVtYmVyKCcyLjYuMTEnKTtcblxud2luZG93LlBVUkVTREsgPSBwcGJhO1xuXG52YXIgY3NzID0gJ2h0bWwsYm9keSxkaXYsc3BhbixhcHBsZXQsb2JqZWN0LGlmcmFtZSxoMSxoMixoMyxoNCxoNSxoNixwLGJsb2NrcXVvdGUscHJlLGEsYWJicixhY3JvbnltLGFkZHJlc3MsYmlnLGNpdGUsY29kZSxkZWwsZGZuLGVtLGltZyxpbnMsa2JkLHEscyxzYW1wLHNtYWxsLHN0cmlrZSxzdHJvbmcsc3ViLHN1cCx0dCx2YXIsYix1LGksY2VudGVyLGRsLGR0LGRkLG9sLHVsLGxpLGZpZWxkc2V0LGZvcm0sbGFiZWwsbGVnZW5kLHRhYmxlLGNhcHRpb24sdGJvZHksdGZvb3QsdGhlYWQsdHIsdGgsdGQsYXJ0aWNsZSxhc2lkZSxjYW52YXMsZGV0YWlscyxlbWJlZCxmaWd1cmUsZmlnY2FwdGlvbixmb290ZXIsaGVhZGVyLGhncm91cCxtZW51LG5hdixvdXRwdXQscnVieSxzZWN0aW9uLHN1bW1hcnksdGltZSxtYXJrLGF1ZGlvLHZpZGVve21hcmdpbjowO3BhZGRpbmc6MDtib3JkZXI6MDtmb250LXNpemU6MTAwJTtmb250OmluaGVyaXQ7dmVydGljYWwtYWxpZ246YmFzZWxpbmV9YXJ0aWNsZSxhc2lkZSxkZXRhaWxzLGZpZ2NhcHRpb24sZmlndXJlLGZvb3RlcixoZWFkZXIsaGdyb3VwLG1lbnUsbmF2LHNlY3Rpb257ZGlzcGxheTpibG9ja31ib2R5e2xpbmUtaGVpZ2h0OjF9b2wsdWx7bGlzdC1zdHlsZTpub25lfWJsb2NrcXVvdGUscXtxdW90ZXM6bm9uZX1ibG9ja3F1b3RlOmJlZm9yZSxibG9ja3F1b3RlOmFmdGVyLHE6YmVmb3JlLHE6YWZ0ZXJ7Y29udGVudDpcIlwiO2NvbnRlbnQ6bm9uZX10YWJsZXtib3JkZXItY29sbGFwc2U6Y29sbGFwc2U7Ym9yZGVyLXNwYWNpbmc6MH1ib2R5e292ZXJmbG93LXg6aGlkZGVufSNiYWMtd3JhcHBlcntmb250LWZhbWlseTpcIlZlcmRhbmFcIiwgYXJpYWwsIHNhbnMtc2VyaWY7Y29sb3I6d2hpdGU7bWluLWhlaWdodDoxMDB2aDtwb3NpdGlvbjpyZWxhdGl2ZX0uYmFjLS1jb250YWluZXJ7bWF4LXdpZHRoOjExNjBweDttYXJnaW46MCBhdXRvfS5iYWMtLWNvbnRhaW5lciAjYXBwLW5hbWUtbGluay10by1yb290e2Rpc3BsYXk6YmxvY2s7cG9zaXRpb246YWJzb2x1dGU7bGVmdDo2NXB4O3RvcDo0cHg7Zm9udC1zaXplOjEuNGVtO3dpZHRoOjE1MHB4O2NvbG9yOndoaXRlO3RleHQtZGVjb3JhdGlvbjpub25lfS5iYWMtLWhlYWRlci1hcHBze3Bvc2l0aW9uOmFic29sdXRlO3dpZHRoOjEwMCU7aGVpZ2h0OjUwcHg7YmFja2dyb3VuZC1jb2xvcjojNDc1MzY5O3BhZGRpbmc6NXB4IDEwcHg7ei1pbmRleDo5OTk5OTk5fS5iYWMtLWhlYWRlci1hcHBzIC5iYWMtLWNvbnRhaW5lcntoZWlnaHQ6MTAwJTtkaXNwbGF5OmZsZXg7YWxpZ24taXRlbXM6Y2VudGVyO2p1c3RpZnktY29udGVudDpzcGFjZS1iZXR3ZWVufS5iYWMtLWhlYWRlci1zZWFyY2h7cG9zaXRpb246cmVsYXRpdmV9LmJhYy0taGVhZGVyLXNlYXJjaCBpbnB1dHtjb2xvcjojZmZmO2ZvbnQtc2l6ZToxNHB4O2hlaWdodDozNXB4O2JhY2tncm91bmQtY29sb3I6IzZiNzU4NjtwYWRkaW5nOjAgNXB4IDAgMTBweDtib3JkZXI6bm9uZTtib3JkZXItcmFkaXVzOjNweDttaW4td2lkdGg6NDAwcHg7d2lkdGg6MTAwJX0uYmFjLS1oZWFkZXItc2VhcmNoIGlucHV0OmZvY3Vze291dGxpbmU6bm9uZX0uYmFjLS1oZWFkZXItc2VhcmNoIGlucHV0Ojotd2Via2l0LWlucHV0LXBsYWNlaG9sZGVye2ZvbnQtc3R5bGU6bm9ybWFsICFpbXBvcnRhbnQ7dGV4dC1hbGlnbjpjZW50ZXI7Y29sb3I6I2ZmZjtmb250LXNpemU6MTRweDtmb250LXdlaWdodDozMDA7bGV0dGVyLXNwYWNpbmc6MC41cHh9LmJhYy0taGVhZGVyLXNlYXJjaCBpbnB1dDo6LW1vei1wbGFjZWhvbGRlcntmb250LXN0eWxlOm5vcm1hbCAhaW1wb3J0YW50O3RleHQtYWxpZ246Y2VudGVyO2NvbG9yOiNmZmY7Zm9udC1zaXplOjE0cHg7Zm9udC13ZWlnaHQ6MzAwO2xldHRlci1zcGFjaW5nOjAuNXB4fS5iYWMtLWhlYWRlci1zZWFyY2ggaW5wdXQ6LW1zLWlucHV0LXBsYWNlaG9sZGVye2ZvbnQtc3R5bGU6bm9ybWFsICFpbXBvcnRhbnQ7dGV4dC1hbGlnbjpjZW50ZXI7Y29sb3I6I2ZmZjtmb250LXNpemU6MTRweDtmb250LXdlaWdodDozMDA7bGV0dGVyLXNwYWNpbmc6MC41cHh9LmJhYy0taGVhZGVyLXNlYXJjaCBpe3Bvc2l0aW9uOmFic29sdXRlO3RvcDo4cHg7cmlnaHQ6MTBweH0uYmFjLS11c2VyLWFjdGlvbnN7ZGlzcGxheTpmbGV4O2FsaWduLWl0ZW1zOmNlbnRlcn0uYmFjLS11c2VyLWFjdGlvbnM+ZGl2e2N1cnNvcjpwb2ludGVyO2NvbG9yOndoaXRlfS5iYWMtLXVzZXItYWN0aW9ucyAuYmFjLS11c2VyLW5vdGlmaWNhdGlvbnN7cG9zaXRpb246cmVsYXRpdmV9LmJhYy0tdXNlci1hY3Rpb25zIC5iYWMtLXVzZXItbm90aWZpY2F0aW9ucyBpe2ZvbnQtc2l6ZToyMHB4fS5iYWMtLXVzZXItYWN0aW9ucyAjYmFjLS1wdXJlc2RrLS1sb2FkZXItLXtkaXNwbGF5Om5vbmV9LmJhYy0tdXNlci1hY3Rpb25zICNiYWMtLXB1cmVzZGstLWxvYWRlci0tLmJhYy0tcHVyZXNkay12aXNpYmxle2Rpc3BsYXk6YmxvY2t9LmJhYy0tdXNlci1hY3Rpb25zIC5iYWMtLXVzZXItbm90aWZpY2F0aW9ucy1jb3VudHtwb3NpdGlvbjphYnNvbHV0ZTtkaXNwbGF5OmlubGluZS1ibG9jaztoZWlnaHQ6MTVweDt3aWR0aDoxNXB4O2xpbmUtaGVpZ2h0OjE1cHg7Y29sb3I6I2ZmZjtmb250LXNpemU6MTBweDt0ZXh0LWFsaWduOmNlbnRlcjtiYWNrZ3JvdW5kLWNvbG9yOiNmYzNiMzA7Ym9yZGVyLXJhZGl1czo1MCU7dG9wOi01cHg7bGVmdDotNXB4fS5iYWMtLXVzZXItYWN0aW9ucyAuYmFjLS11c2VyLWF2YXRhciwuYmFjLS11c2VyLWFjdGlvbnMgLmJhYy0tdXNlci1ub3RpZmljYXRpb25ze21hcmdpbi1sZWZ0OjIwcHh9LmJhYy0tdXNlci1hY3Rpb25zIC5iYWMtLXVzZXItYXZhdGFye3Bvc2l0aW9uOnJlbGF0aXZlO292ZXJmbG93OmhpZGRlbjtib3JkZXItcmFkaXVzOjUwJX0uYmFjLS11c2VyLWFjdGlvbnMgLmJhYy0tdXNlci1hdmF0YXIgI2JhYy0taW1hZ2UtY29udGFpbmVyLXRvcHt3aWR0aDoxMDAlO2hlaWd0aDoxMDAlO3Bvc2l0aW9uOmFic29sdXRlO3RvcDowO2xlZnQ6MDt6LWluZGV4OjE7ZGlzcGxheTpub25lfS5iYWMtLXVzZXItYWN0aW9ucyAuYmFjLS11c2VyLWF2YXRhciAjYmFjLS1pbWFnZS1jb250YWluZXItdG9wIGltZ3t3aWR0aDoxMDAlO2hlaWdodDoxMDAlfS5iYWMtLXVzZXItYWN0aW9ucyAuYmFjLS11c2VyLWF2YXRhciAjYmFjLS1pbWFnZS1jb250YWluZXItdG9wLmJhYy0tcHVyZXNkay12aXNpYmxle2Rpc3BsYXk6YmxvY2t9LmJhYy0tdXNlci1hY3Rpb25zIC5iYWMtLXVzZXItYXZhdGFyLW5hbWV7Y29sb3I6I2ZmZjtiYWNrZ3JvdW5kLWNvbG9yOiNhZGFkYWQ7ZGlzcGxheTppbmxpbmUtYmxvY2s7aGVpZ2h0OjM1cHg7d2lkdGg6MzVweDtsaW5lLWhlaWdodDozNXB4O3RleHQtYWxpZ246Y2VudGVyO2ZvbnQtc2l6ZToxNHB4fS5iYWMtLXVzZXItYXBwc3twb3NpdGlvbjpyZWxhdGl2ZX0jYmFjLS1wdXJlc2RrLWFwcHMtaWNvbi0te3dpZHRoOjIwcHg7ZGlzcGxheTppbmxpbmUtYmxvY2s7dGV4dC1hbGlnbjpjZW50ZXI7Zm9udC1zaXplOjE2cHh9LmJhYy0tcHVyZXNkay1hcHBzLW5hbWUtLXtmb250LXNpemU6OXB4O3dpZHRoOjIwcHg7dGV4dC1hbGlnbjpjZW50ZXJ9I2JhYy0tcHVyZXNkay11c2VyLWJ1c2luZXNzZXMtLXtoZWlnaHQ6Y2FsYygxMDB2aCAtIDQ1OHB4KTtvdmVyZmxvdzphdXRvfS5iYWMtLWFwcHMtY29udGFpbmVye2JhY2tncm91bmQ6I2ZmZjtwb3NpdGlvbjphYnNvbHV0ZTt0b3A6NDVweDtyaWdodDotNDBweDtkaXNwbGF5OmZsZXg7d2lkdGg6MzYwcHg7ZmxleC13cmFwOndyYXA7Ym9yZGVyLXJhZGl1czoxMHB4O3BhZGRpbmc6MzBweDtqdXN0aWZ5LWNvbnRlbnQ6c3BhY2UtYmV0d2Vlbjt0ZXh0LWFsaWduOmNlbnRlcjstd2Via2l0LWJveC1zaGFkb3c6MCAwIDEwcHggMnB4IHJnYmEoMCwwLDAsMC4yKTtib3gtc2hhZG93OjAgMCAxMHB4IDJweCByZ2JhKDAsMCwwLDAuMik7b3BhY2l0eTowO3Zpc2liaWxpdHk6aGlkZGVuO3RyYW5zaXRpb246YWxsIDAuNHMgZWFzZTttYXgtaGVpZ2h0OjU2NnB4O292ZXJmbG93OmF1dG99LmJhYy0tYXBwcy1jb250YWluZXIuYWN0aXZle29wYWNpdHk6MTt2aXNpYmlsaXR5OnZpc2libGV9LmJhYy0tYXBwcy1jb250YWluZXIgLmJhYy0tYXBwcy1hcnJvd3twb3NpdGlvbjphYnNvbHV0ZTtkaXNwbGF5OmJsb2NrO2hlaWdodDoyMHB4O3dpZHRoOjIwcHg7dG9wOi0xMHB4O3JpZ2h0OjM2cHg7YmFja2dyb3VuZDojZmZmO3RyYW5zZm9ybTpyb3RhdGUoLTQ1ZGVnKTt6LWluZGV4OjF9LmJhYy0tYXBwcy1jb250YWluZXIgLmJhYy0tYXBwc3t3aWR0aDozMiU7ZGlzcGxheTpmbGV4O2ZvbnQtc2l6ZTozMHB4O21hcmdpbi1ib3R0b206NDBweDt0ZXh0LWFsaWduOmNlbnRlcjtqdXN0aWZ5LWNvbnRlbnQ6Y2VudGVyO2ZsZXgtd3JhcDp3cmFwfS5iYWMtLWFwcHMtY29udGFpbmVyIC5iYWMtLWFwcHMgYXtkaXNwbGF5OmJsb2NrO2NvbG9yOiNmZmY7dGV4dC1kZWNvcmF0aW9uOm5vbmU7d2lkdGg6NjVweDtoZWlnaHQ6NjVweDtwYWRkaW5nLXRvcDozcHg7bGluZS1oZWlnaHQ6NjVweDt0ZXh0LWFsaWduOmNlbnRlcjtib3JkZXItcmFkaXVzOjEwcHg7LXdlYmtpdC1ib3gtc2hhZG93OjAgMCA1cHggMCByZ2JhKDAsMCwwLDAuMik7Ym94LXNoYWRvdzowIDAgNXB4IDAgcmdiYSgwLDAsMCwwLjIpfS5iYWMtLWFwcHMtY29udGFpbmVyIC5iYWMtLWFwcHMgLmJhYy0tYXBwLW5hbWV7d2lkdGg6MTAwJTtjb2xvcjojMDAwO2ZvbnQtc2l6ZToxNHB4O3BhZGRpbmc6MTBweCAwIDVweCAwfS5iYWMtLWFwcHMtY29udGFpbmVyIC5iYWMtLWFwcHMgLmJhYy0tYXBwLWRlc2NyaXB0aW9ue2NvbG9yOiM5MTkxOTE7Zm9udC1zaXplOjEycHg7Zm9udC1zdHlsZTppdGFsaWM7bGluZS1oZWlnaHQ6MS4zZW19LmJhYy0tdXNlci1zaWRlYmFye2ZvbnQtZmFtaWx5OlwiVmVyZGFuYVwiLCBhcmlhbCwgc2Fucy1zZXJpZjtjb2xvcjp3aGl0ZTtoZWlnaHQ6Y2FsYygxMDB2aCAtIDUwcHgpO2JhY2tncm91bmQtY29sb3I6IzUxNWY3Nztib3gtc2l6aW5nOmJvcmRlci1ib3g7d2lkdGg6MzIwcHg7cG9zaXRpb246Zml4ZWQ7dG9wOjUwcHg7cmlnaHQ6MDt6LWluZGV4Ojk5OTk5OTtwYWRkaW5nLXRvcDoxMHB4O29wYWNpdHk6MDt0cmFuc2Zvcm06dHJhbnNsYXRlWCgxMDAlKTt0cmFuc2l0aW9uOmFsbCAwLjRzIGVhc2V9LmJhYy0tdXNlci1zaWRlYmFyLmFjdGl2ZXtvcGFjaXR5OjE7dHJhbnNmb3JtOnRyYW5zbGF0ZVgoMCUpOy13ZWJraXQtYm94LXNoYWRvdzotMXB4IDBweCAxMnB4IDBweCByZ2JhKDAsMCwwLDAuNzUpOy1tb3otYm94LXNoYWRvdzotMXB4IDNweCAxMnB4IDBweCByZ2JhKDAsMCwwLDAuNzUpO2JveC1zaGFkb3c6LTFweCAwcHggMTJweCAwcHggcmdiYSgwLDAsMCwwLjc1KX0uYmFjLS11c2VyLXNpZGViYXIgLmJhYy0tdXNlci1saXN0LWl0ZW17ZGlzcGxheTpmbGV4O3Bvc2l0aW9uOnJlbGF0aXZlO2N1cnNvcjpwb2ludGVyO2FsaWduLWl0ZW1zOmNlbnRlcjtwYWRkaW5nOjEwcHggMTBweCAxMHB4IDQwcHg7Ym9yZGVyLWJvdHRvbToxcHggc29saWQgcmdiYSgyNTUsMjU1LDI1NSwwLjEpfS5iYWMtLXVzZXItc2lkZWJhciAuYmFjLS11c2VyLWxpc3QtaXRlbTpob3ZlcntiYWNrZ3JvdW5kLWNvbG9yOnJnYmEoMjU1LDI1NSwyNTUsMC4xKX0uYmFjLS11c2VyLXNpZGViYXIgLmJhYy0tdXNlci1saXN0LWl0ZW0gLmJhYy0tc2VsZWN0ZWQtYWNvdW50LWluZGljYXRvcntwb3NpdGlvbjphYnNvbHV0ZTtyaWdodDowO2hlaWdodDoxMDAlO3dpZHRoOjhweH0uYmFjLS11c2VyLXNpZGViYXIgLmJhYy0tdXNlci1saXN0LWl0ZW0gLmJhYy0tdXNlci1saXN0LWl0ZW0taW1hZ2V7d2lkdGg6NDBweDtoZWlnaHQ6NDBweDtib3JkZXItcmFkaXVzOjNweDtib3JkZXI6MnB4IHNvbGlkICNmZmY7bWFyZ2luLXJpZ2h0OjIwcHg7ZGlzcGxheTpmbGV4O2FsaWduLWl0ZW1zOmNlbnRlcjtqdXN0aWZ5LWNvbnRlbnQ6Y2VudGVyfS5iYWMtLXVzZXItc2lkZWJhciAuYmFjLS11c2VyLWxpc3QtaXRlbSAuYmFjLS11c2VyLWxpc3QtaXRlbS1pbWFnZT5pbWd7d2lkdGg6YXV0bztoZWlnaHQ6YXV0bzttYXgtd2lkdGg6MTAwJTttYXgtaGVpZ2h0OjEwMCV9LmJhYy0tdXNlci1zaWRlYmFyIC5iYWMtLXVzZXItbGlzdC1pdGVtIHNwYW57d2lkdGg6MTAwJTtkaXNwbGF5OmJsb2NrO21hcmdpbi1ib3R0b206NXB4fS5iYWMtLXVzZXItc2lkZWJhciAuYmFjLXVzZXItYXBwLWRldGFpbHMgc3Bhbntmb250LXNpemU6MTJweH0uYmFjLS11c2VyLXNpZGViYXIgLnB1cmVzZGstdmVyc2lvbi1udW1iZXJ7d2lkdGg6MTAwJTt0ZXh0LWFsaWduOnJpZ2h0O3BhZGRpbmctcmlnaHQ6MTBweDtwb3NpdGlvbjphYnNvbHV0ZTtmb250LXNpemU6OHB4O29wYWNpdHk6MC41O3JpZ2h0OjA7Ym90dG9tOjB9LmJhYy0tdXNlci1zaWRlYmFyLWluZm97ZGlzcGxheTpmbGV4O2p1c3RpZnktY29udGVudDpjZW50ZXI7ZmxleC13cmFwOndyYXA7dGV4dC1hbGlnbjpjZW50ZXI7cGFkZGluZzoxMHB4IDIwcHggMTVweH0uYmFjLS11c2VyLXNpZGViYXItaW5mbyAuYmFjLS11c2VyLWltYWdle2JvcmRlcjoxcHggI2FkYWRhZCBzb2xpZDtvdmVyZmxvdzpoaWRkZW47Ym9yZGVyLXJhZGl1czo1MCU7cG9zaXRpb246cmVsYXRpdmU7Y3Vyc29yOnBvaW50ZXI7ZGlzcGxheTppbmxpbmUtYmxvY2s7aGVpZ2h0OjgwcHg7d2lkdGg6ODBweDtsaW5lLWhlaWdodDo4MHB4O3RleHQtYWxpZ246Y2VudGVyO2NvbG9yOiNmZmY7Ym9yZGVyLXJhZGl1czo1MCU7YmFja2dyb3VuZC1jb2xvcjojYWRhZGFkO21hcmdpbi1ib3R0b206MTVweH0uYmFjLS11c2VyLXNpZGViYXItaW5mbyAuYmFjLS11c2VyLWltYWdlICNiYWMtLXVzZXItaW1hZ2UtZmlsZXtkaXNwbGF5Om5vbmU7cG9zaXRpb246YWJzb2x1dGU7ei1pbmRleDoxO3RvcDowO2xlZnQ6MDt3aWR0aDoxMDAlO2hlaWdodDoxMDAlfS5iYWMtLXVzZXItc2lkZWJhci1pbmZvIC5iYWMtLXVzZXItaW1hZ2UgI2JhYy0tdXNlci1pbWFnZS1maWxlIGltZ3t3aWR0aDoxMDAlO2hlaWdodDoxMDAlfS5iYWMtLXVzZXItc2lkZWJhci1pbmZvIC5iYWMtLXVzZXItaW1hZ2UgI2JhYy0tdXNlci1pbWFnZS1maWxlLmJhYy0tcHVyZXNkay12aXNpYmxle2Rpc3BsYXk6YmxvY2t9LmJhYy0tdXNlci1zaWRlYmFyLWluZm8gLmJhYy0tdXNlci1pbWFnZSAjYmFjLS11c2VyLWltYWdlLXVwbG9hZC1wcm9ncmVzc3twb3NpdGlvbjphYnNvbHV0ZTtwYWRkaW5nLXRvcDoxMHB4O3RvcDowO2JhY2tncm91bmQ6IzY2Njt6LWluZGV4OjQ7ZGlzcGxheTpub25lO3dpZHRoOjEwMCU7aGVpZ2h0OjEwMCV9LmJhYy0tdXNlci1zaWRlYmFyLWluZm8gLmJhYy0tdXNlci1pbWFnZSAjYmFjLS11c2VyLWltYWdlLXVwbG9hZC1wcm9ncmVzcy5iYWMtLXB1cmVzZGstdmlzaWJsZXtkaXNwbGF5OmJsb2NrfS5iYWMtLXVzZXItc2lkZWJhci1pbmZvIC5iYWMtLXVzZXItaW1hZ2UgaXtmb250LXNpemU6MzJweDtmb250LXNpemU6MzJweDt6LWluZGV4OjA7cG9zaXRpb246YWJzb2x1dGU7d2lkdGg6MTAwJTtsZWZ0OjA7YmFja2dyb3VuZC1jb2xvcjpyZ2JhKDAsMCwwLDAuNSl9LmJhYy0tdXNlci1zaWRlYmFyLWluZm8gLmJhYy0tdXNlci1pbWFnZTpob3ZlciBpe3otaW5kZXg6M30uYmFjLS11c2VyLXNpZGViYXItaW5mbyAuYmFjLS11c2VyLW5hbWV7d2lkdGg6MTAwJTt0ZXh0LWFsaWduOmNlbnRlcjtmb250LXNpemU6MThweDttYXJnaW4tYm90dG9tOjEwcHh9LmJhYy0tdXNlci1zaWRlYmFyLWluZm8gLmJhYy0tdXNlci1lbWFpbHtmb250LXNpemU6MTJweDtmb250LXdlaWdodDozMDB9LmJhYy0tdXNlci1hY2NvdW50LXNldHRpbmdze3Bvc2l0aW9uOmFic29sdXRlO2JvdHRvbToxMHB4O2xlZnQ6MjBweDt3aWR0aDo5MCU7aGVpZ2h0OjUwcHh9LmJhYy0tdXNlci1hY2NvdW50LXNldHRpbmdzIC5iYWMtdXNlci1hY291bnQtbGlzdC1pdGVte2Rpc3BsYXk6ZmxleDthbGlnbi1pdGVtczpjZW50ZXI7bWFyZ2luLWJvdHRvbTozMHB4O3Bvc2l0aW9uOmFic29sdXRlfS5iYWMtLXVzZXItYWNjb3VudC1zZXR0aW5ncyAuYmFjLXVzZXItYWNvdW50LWxpc3QtaXRlbSBhe3RleHQtZGVjb3JhdGlvbjpub25lO2NvbG9yOiNmZmZ9LmJhYy0tdXNlci1hY2NvdW50LXNldHRpbmdzIC5iYWMtdXNlci1hY291bnQtbGlzdC1pdGVtIGl7Zm9udC1zaXplOjI0cHg7bWFyZ2luLXJpZ2h0OjIwcHh9I2JhYy0tcHVyZXNkay1hY2NvdW50LWxvZ28tLXtjdXJzb3I6cG9pbnRlcjtwb3NpdGlvbjpyZWxhdGl2ZTtjb2xvcjojZmZmfSNiYWMtLXB1cmVzZGstYWNjb3VudC1sb2dvLS0gaW1ne2hlaWdodDoyOHB4fSNiYWMtLWluZm8tYmxvY2tzLXdyYXBwZXItLXtwb3NpdGlvbjpyZWxhdGl2ZX0jYmFjLS1pbmZvLWJsb2Nrcy13cmFwcGVyLS0gLmJhYy0tcHVyZXNkay1pbmZvLWJveC0te2JvcmRlci1yYWRpdXM6MCAwIDNweCAzcHg7b3ZlcmZsb3c6aGlkZGVuO3otaW5kZXg6OTk5OTk5OTk7cG9zaXRpb246Zml4ZWQ7dG9wOi00MXB4O3dpZHRoOjQ3MHB4O2xlZnQ6Y2FsYyg1MHZ3IC0gMjM1cHgpO2hlaWdodDo0MHB4Oy13ZWJraXQtdHJhbnNpdGlvbjp0b3AgMC40czt0cmFuc2l0aW9uOnRvcCAwLjRzfSNiYWMtLWluZm8tYmxvY2tzLXdyYXBwZXItLSAuYmFjLS1wdXJlc2RrLWluZm8tYm94LS0uYmFjLS1zdWNjZXNze2JhY2tncm91bmQ6IzE0REE5RX0jYmFjLS1pbmZvLWJsb2Nrcy13cmFwcGVyLS0gLmJhYy0tcHVyZXNkay1pbmZvLWJveC0tLmJhYy0tc3VjY2VzcyAuYmFjLS1pbm5lci1pbmZvLWJveC0tIGRpdi5iYWMtLWluZm8taWNvbi0tLmZhLXN1Y2Nlc3N7ZGlzcGxheTppbmxpbmUtYmxvY2t9I2JhYy0taW5mby1ibG9ja3Mtd3JhcHBlci0tIC5iYWMtLXB1cmVzZGstaW5mby1ib3gtLS5iYWMtLWluZm97YmFja2dyb3VuZC1jb2xvcjojNUJDMERFfSNiYWMtLWluZm8tYmxvY2tzLXdyYXBwZXItLSAuYmFjLS1wdXJlc2RrLWluZm8tYm94LS0uYmFjLS1pbmZvIC5iYWMtLWlubmVyLWluZm8tYm94LS0gZGl2LmJhYy0taW5mby1pY29uLS0uZmEtaW5mby0xe2Rpc3BsYXk6aW5saW5lLWJsb2NrfSNiYWMtLWluZm8tYmxvY2tzLXdyYXBwZXItLSAuYmFjLS1wdXJlc2RrLWluZm8tYm94LS0uYmFjLS13YXJuaW5ne2JhY2tncm91bmQ6I0YwQUQ0RX0jYmFjLS1pbmZvLWJsb2Nrcy13cmFwcGVyLS0gLmJhYy0tcHVyZXNkay1pbmZvLWJveC0tLmJhYy0td2FybmluZyAuYmFjLS1pbm5lci1pbmZvLWJveC0tIGRpdi5iYWMtLWluZm8taWNvbi0tLmZhLXdhcm5pbmd7ZGlzcGxheTppbmxpbmUtYmxvY2t9I2JhYy0taW5mby1ibG9ja3Mtd3JhcHBlci0tIC5iYWMtLXB1cmVzZGstaW5mby1ib3gtLS5iYWMtLWVycm9ye2JhY2tncm91bmQ6I0VGNDEwMH0jYmFjLS1pbmZvLWJsb2Nrcy13cmFwcGVyLS0gLmJhYy0tcHVyZXNkay1pbmZvLWJveC0tLmJhYy0tZXJyb3IgLmJhYy0taW5uZXItaW5mby1ib3gtLSBkaXYuYmFjLS1pbmZvLWljb24tLS5mYS1lcnJvcntkaXNwbGF5OmlubGluZS1ibG9ja30jYmFjLS1pbmZvLWJsb2Nrcy13cmFwcGVyLS0gLmJhYy0tcHVyZXNkay1pbmZvLWJveC0tIC5iYWMtLXRpbWVyey13ZWJraXQtdHJhbnNpdGlvbi10aW1pbmctZnVuY3Rpb246bGluZWFyO3RyYW5zaXRpb24tdGltaW5nLWZ1bmN0aW9uOmxpbmVhcjtwb3NpdGlvbjphYnNvbHV0ZTtib3R0b206MHB4O29wYWNpdHk6MC41O2hlaWdodDoycHggIWltcG9ydGFudDtiYWNrZ3JvdW5kOndoaXRlO3dpZHRoOjAlfSNiYWMtLWluZm8tYmxvY2tzLXdyYXBwZXItLSAuYmFjLS1wdXJlc2RrLWluZm8tYm94LS0gLmJhYy0tdGltZXIuYmFjLS1mdWxsd2lkdGh7d2lkdGg6MTAwJX0jYmFjLS1pbmZvLWJsb2Nrcy13cmFwcGVyLS0gLmJhYy0tcHVyZXNkay1pbmZvLWJveC0tLmJhYy0tYWN0aXZlLS17dG9wOjBweH0jYmFjLS1pbmZvLWJsb2Nrcy13cmFwcGVyLS0gLmJhYy0tcHVyZXNkay1pbmZvLWJveC0tIC5iYWMtLWlubmVyLWluZm8tYm94LS17d2lkdGg6MTAwJTtwYWRkaW5nOjExcHggMTVweDtjb2xvcjp3aGl0ZX0jYmFjLS1pbmZvLWJsb2Nrcy13cmFwcGVyLS0gLmJhYy0tcHVyZXNkay1pbmZvLWJveC0tIC5iYWMtLWlubmVyLWluZm8tYm94LS0gZGl2e2Rpc3BsYXk6aW5saW5lLWJsb2NrO2hlaWdodDoxOHB4O3Bvc2l0aW9uOnJlbGF0aXZlfSNiYWMtLWluZm8tYmxvY2tzLXdyYXBwZXItLSAuYmFjLS1wdXJlc2RrLWluZm8tYm94LS0gLmJhYy0taW5uZXItaW5mby1ib3gtLSBkaXYuYmFjLS1pbmZvLWljb24tLXtkaXNwbGF5Om5vbmU7dG9wOjBweH0jYmFjLS1pbmZvLWJsb2Nrcy13cmFwcGVyLS0gLmJhYy0tcHVyZXNkay1pbmZvLWJveC0tIC5iYWMtLWlubmVyLWluZm8tYm94LS0gLmJhYy0taW5mby1pY29uLS17bWFyZ2luLXJpZ2h0OjE1cHg7d2lkdGg6MTBweDt0b3A6MnB4fSNiYWMtLWluZm8tYmxvY2tzLXdyYXBwZXItLSAuYmFjLS1wdXJlc2RrLWluZm8tYm94LS0gLmJhYy0taW5uZXItaW5mby1ib3gtLSAuYmFjLS1pbmZvLW1haW4tdGV4dC0te3dpZHRoOjM4MHB4O21hcmdpbi1yaWdodDoxNXB4O2ZvbnQtc2l6ZToxMnB4O3RleHQtYWxpZ246Y2VudGVyfSNiYWMtLWluZm8tYmxvY2tzLXdyYXBwZXItLSAuYmFjLS1wdXJlc2RrLWluZm8tYm94LS0gLmJhYy0taW5uZXItaW5mby1ib3gtLSAuYmFjLS1pbmZvLWNsb3NlLWJ1dHRvbi0te3dpZHRoOjEwcHg7Y3Vyc29yOnBvaW50ZXI7dG9wOjJweH0uYmFjLS1jdXN0b20tbW9kYWx7cG9zaXRpb246Zml4ZWQ7d2lkdGg6NzAlO2hlaWdodDo4MCU7bWluLXdpZHRoOjQwMHB4O2xlZnQ6MDtyaWdodDowO3RvcDowO2JvdHRvbTowO21hcmdpbjphdXRvO2JvcmRlcjoxcHggc29saWQgIzk3OTc5Nztib3JkZXItcmFkaXVzOjVweDtib3gtc2hhZG93OjAgMCA3MXB4IDAgIzJGMzg0OTtiYWNrZ3JvdW5kOiNmZmY7ei1pbmRleDo5OTk7b3ZlcmZsb3c6YXV0bztkaXNwbGF5Om5vbmV9LmJhYy0tY3VzdG9tLW1vZGFsLmlzLW9wZW57ZGlzcGxheTpibG9ja30uYmFjLS1jdXN0b20tbW9kYWwgLmN1c3RvbS1tb2RhbF9fY2xvc2UtYnRue3RleHQtZGVjb3JhdGlvbjpub25lO3BhZGRpbmctdG9wOjJweDtsaW5lLWhlaWdodDoxOHB4O2hlaWdodDoyMHB4O3dpZHRoOjIwcHg7Ym9yZGVyLXJhZGl1czo1MCU7Y29sb3I6IzkwOWJhNDt0ZXh0LWFsaWduOmNlbnRlcjtwb3NpdGlvbjphYnNvbHV0ZTt0b3A6MjBweDtyaWdodDoyMHB4O2ZvbnQtc2l6ZToyMHB4fS5iYWMtLWN1c3RvbS1tb2RhbCAuY3VzdG9tLW1vZGFsX19jbG9zZS1idG46aG92ZXJ7dGV4dC1kZWNvcmF0aW9uOm5vbmU7Y29sb3I6IzQ1NTA2NjtjdXJzb3I6cG9pbnRlcn0uYmFjLS1jdXN0b20tbW9kYWwgLmN1c3RvbS1tb2RhbF9fd3JhcHBlcntoZWlnaHQ6MTAwJTtkaXNwbGF5OmZsZXg7ZmxleC1kaXJlY3Rpb246Y29sdW1ufS5iYWMtLWN1c3RvbS1tb2RhbCAuY3VzdG9tLW1vZGFsX193cmFwcGVyIGlmcmFtZXt3aWR0aDoxMDAlO2hlaWdodDoxMDAlfS5iYWMtLWN1c3RvbS1tb2RhbCAuY3VzdG9tLW1vZGFsX19jb250ZW50LXdyYXBwZXJ7aGVpZ2h0OjEwMCU7b3ZlcmZsb3c6YXV0bzttYXJnaW4tYm90dG9tOjEwNHB4O2JvcmRlci10b3A6MnB4IHNvbGlkICNDOUNERDd9LmJhYy0tY3VzdG9tLW1vZGFsIC5jdXN0b20tbW9kYWxfX2NvbnRlbnQtd3JhcHBlci5uby1tYXJnaW57bWFyZ2luLWJvdHRvbTowfS5iYWMtLWN1c3RvbS1tb2RhbCAuY3VzdG9tLW1vZGFsX19jb250ZW50e3BhZGRpbmc6MjBweDtwb3NpdGlvbjpyZWxhdGl2ZX0uYmFjLS1jdXN0b20tbW9kYWwgLmN1c3RvbS1tb2RhbF9fY29udGVudCBoM3tjb2xvcjojMkYzODQ5O2ZvbnQtc2l6ZToyMHB4O2ZvbnQtd2VpZ2h0OjYwMDtsaW5lLWhlaWdodDoyN3B4fS5iYWMtLWN1c3RvbS1tb2RhbCAuY3VzdG9tLW1vZGFsX19zYXZle3Bvc2l0aW9uOmFic29sdXRlO3JpZ2h0OjA7Ym90dG9tOjA7d2lkdGg6MTAwJTtwYWRkaW5nOjMwcHggMzJweDtiYWNrZ3JvdW5kLWNvbG9yOiNGMkYyRjR9LmJhYy0tY3VzdG9tLW1vZGFsIC5jdXN0b20tbW9kYWxfX3NhdmUgYSwuYmFjLS1jdXN0b20tbW9kYWwgLmN1c3RvbS1tb2RhbF9fc2F2ZSBidXR0b257Zm9udC1zaXplOjE0cHg7bGluZS1oZWlnaHQ6MjJweDtoZWlnaHQ6NDRweDt3aWR0aDoxMDAlfS5iYWMtLWN1c3RvbS1tb2RhbCAuY3VzdG9tLW1vZGFsX19zcGxpdHRlcntoZWlnaHQ6MzBweDtsaW5lLWhlaWdodDozMHB4O3BhZGRpbmc6MCAyMHB4O2JvcmRlci1jb2xvcjojRDNEM0QzO2JvcmRlci1zdHlsZTpzb2xpZDtib3JkZXItd2lkdGg6MXB4IDAgMXB4IDA7YmFja2dyb3VuZC1jb2xvcjojRjBGMEYwO2NvbG9yOiM2NzZGODI7Zm9udC1zaXplOjEzcHg7Zm9udC13ZWlnaHQ6NjAwfS5iYWMtLWN1c3RvbS1tb2RhbCAuY3VzdG9tLW1vZGFsX19ib3h7ZGlzcGxheTppbmxpbmUtYmxvY2s7dmVydGljYWwtYWxpZ246bWlkZGxlO2hlaWdodDoxNjVweDt3aWR0aDoxNjVweDtib3JkZXI6MnB4IHNvbGlkIHJlZDtib3JkZXItcmFkaXVzOjVweDt0ZXh0LWFsaWduOmNlbnRlcjtmb250LXNpemU6MTJweDtmb250LXdlaWdodDo2MDA7Y29sb3I6IzkwOTdBODt0ZXh0LWRlY29yYXRpb246bm9uZTttYXJnaW46MTBweCAyMHB4IDEwcHggMDt0cmFuc2l0aW9uOjAuMXMgYWxsfS5iYWMtLWN1c3RvbS1tb2RhbCAuY3VzdG9tLW1vZGFsX19ib3ggaXtmb250LXNpemU6NzBweDtkaXNwbGF5OmJsb2NrO21hcmdpbjoyNXB4IDB9LmJhYy0tY3VzdG9tLW1vZGFsIC5jdXN0b20tbW9kYWxfX2JveC5hY3RpdmV7Y29sb3I6eWVsbG93O2JvcmRlci1jb2xvcjp5ZWxsb3c7dGV4dC1kZWNvcmF0aW9uOm5vbmV9LmJhYy0tY3VzdG9tLW1vZGFsIC5jdXN0b20tbW9kYWxfX2JveDpob3ZlciwuYmFjLS1jdXN0b20tbW9kYWwgLmN1c3RvbS1tb2RhbF9fYm94OmFjdGl2ZSwuYmFjLS1jdXN0b20tbW9kYWwgLmN1c3RvbS1tb2RhbF9fYm94OmZvY3Vze2NvbG9yOiMxQUMwQjQ7Ym9yZGVyLWNvbG9yOnllbGxvdzt0ZXh0LWRlY29yYXRpb246bm9uZX0uY2xvdWQtaW1hZ2VzX19jb250YWluZXJ7ZGlzcGxheTpmbGV4O2ZsZXgtd3JhcDp3cmFwO2p1c3RpZnktY29udGVudDpmbGV4LXN0YXJ0fS5jbG91ZC1pbWFnZXNfX3BhZ2luYXRpb257cGFkZGluZzoyMHB4fS5jbG91ZC1pbWFnZXNfX3BhZ2luYXRpb24gbGl7ZGlzcGxheTppbmxpbmUtYmxvY2s7bWFyZ2luLXJpZ2h0OjEwcHh9LmNsb3VkLWltYWdlc19fcGFnaW5hdGlvbiBsaSBhe2NvbG9yOiNmZmY7YmFja2dyb3VuZC1jb2xvcjojNWU2Nzc2O2JvcmRlci1yYWRpdXM6MjBweDt0ZXh0LWRlY29yYXRpb246bm9uZTtkaXNwbGF5OmJsb2NrO2ZvbnQtd2VpZ2h0OjIwMDtoZWlnaHQ6MzVweDt3aWR0aDozNXB4O2xpbmUtaGVpZ2h0OjM1cHg7dGV4dC1hbGlnbjpjZW50ZXJ9LmNsb3VkLWltYWdlc19fcGFnaW5hdGlvbiBsaS5hY3RpdmUgYXtiYWNrZ3JvdW5kLWNvbG9yOiMyZjM4NDl9LmNsb3VkLWltYWdlc19faXRlbXt3aWR0aDoxNTVweDtoZWlnaHQ6MTcwcHg7Ym9yZGVyOjFweCBzb2xpZCAjZWVlO2JhY2tncm91bmQtY29sb3I6I2ZmZjtib3JkZXItcmFkaXVzOjNweDttYXJnaW46MCAxNXB4IDE1cHggMDt0ZXh0LWFsaWduOmNlbnRlcjtwb3NpdGlvbjpyZWxhdGl2ZTtjdXJzb3I6cG9pbnRlcn0uY2xvdWQtaW1hZ2VzX19pdGVtIC5jbG91ZC1pbWFnZXNfX2l0ZW1fX3R5cGV7aGVpZ2h0OjExNXB4O2ZvbnQtc2l6ZTo5MHB4O2xpbmUtaGVpZ2h0OjE0MHB4O2JvcmRlci10b3AtbGVmdC1yYWRpdXM6M3B4O2JvcmRlci10b3AtcmlnaHQtcmFkaXVzOjNweDtjb2xvcjojYTJhMmEyO2JhY2tncm91bmQtY29sb3I6I2U5ZWFlYn0uY2xvdWQtaW1hZ2VzX19pdGVtIC5jbG91ZC1pbWFnZXNfX2l0ZW1fX3R5cGU+aW1ne3dpZHRoOmF1dG87aGVpZ2h0OmF1dG87bWF4LXdpZHRoOjEwMCU7bWF4LWhlaWdodDoxMDAlfS5jbG91ZC1pbWFnZXNfX2l0ZW0gLmNsb3VkLWltYWdlc19faXRlbV9fZGV0YWlsc3twYWRkaW5nOjEwcHggMH0uY2xvdWQtaW1hZ2VzX19pdGVtIC5jbG91ZC1pbWFnZXNfX2l0ZW1fX2RldGFpbHMgLmNsb3VkLWltYWdlc19faXRlbV9fZGV0YWlsc19fbmFtZXtmb250LXNpemU6MTJweDtvdXRsaW5lOm5vbmU7cGFkZGluZzowIDEwcHg7Y29sb3I6I2E1YWJiNTtib3JkZXI6bm9uZTt3aWR0aDoxMDAlO2JhY2tncm91bmQtY29sb3I6dHJhbnNwYXJlbnQ7aGVpZ2h0OjE1cHg7ZGlzcGxheTppbmxpbmUtYmxvY2s7d29yZC1icmVhazpicmVhay1hbGx9LmNsb3VkLWltYWdlc19faXRlbSAuY2xvdWQtaW1hZ2VzX19pdGVtX19kZXRhaWxzIC5jbG91ZC1pbWFnZXNfX2l0ZW1fX2RldGFpbHNfX2RhdGV7Zm9udC1zaXplOjEwcHg7Ym90dG9tOjZweDt3aWR0aDoxNTVweDtoZWlnaHQ6MTVweDtjb2xvcjojYTVhYmI1O2Rpc3BsYXk6aW5saW5lLWJsb2NrfS5jbG91ZC1pbWFnZXNfX2l0ZW0gLmNsb3VkLWltYWdlc19faXRlbV9fYWN0aW9uc3tkaXNwbGF5OmZsZXg7YWxpZ24taXRlbXM6Y2VudGVyO2p1c3RpZnktY29udGVudDpjZW50ZXI7cG9zaXRpb246YWJzb2x1dGU7dG9wOjA7bGVmdDowO3dpZHRoOjEwMCU7aGVpZ2h0OjExNXB4O2JhY2tncm91bmQtY29sb3I6cmdiYSg3OCw4Myw5MSwwLjgzKTtvcGFjaXR5OjA7dmlzaWJpbGl0eTpoaWRkZW47Ym9yZGVyLXRvcC1sZWZ0LXJhZGl1czozcHg7Ym9yZGVyLXRvcC1yaWdodC1yYWRpdXM6M3B4O3RleHQtYWxpZ246Y2VudGVyO3RyYW5zaXRpb246MC4zcyBvcGFjaXR5fS5jbG91ZC1pbWFnZXNfX2l0ZW0gLmNsb3VkLWltYWdlc19faXRlbV9fYWN0aW9ucyBhe2ZvbnQtc2l6ZToxNnB4O2NvbG9yOiNmZmY7dGV4dC1kZWNvcmF0aW9uOm5vbmV9LmNsb3VkLWltYWdlc19faXRlbTpob3ZlciAuY2xvdWQtaW1hZ2VzX19pdGVtIC5jbG91ZC1pbWFnZXNfX2l0ZW1fX2FjdGlvbnN7b3BhY2l0eToxO3Zpc2liaWxpdHk6dmlzaWJsZX0nLFxuICAgIGhlYWQgPSBkb2N1bWVudC5oZWFkIHx8IGRvY3VtZW50LmdldEVsZW1lbnRzQnlUYWdOYW1lKCdoZWFkJylbMF0sXG4gICAgc3R5bGUgPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KCdzdHlsZScpO1xuXG5zdHlsZS50eXBlID0gJ3RleHQvY3NzJztcbmlmIChzdHlsZS5zdHlsZVNoZWV0KSB7XG4gICAgc3R5bGUuc3R5bGVTaGVldC5jc3NUZXh0ID0gY3NzO1xufSBlbHNlIHtcbiAgICBzdHlsZS5hcHBlbmRDaGlsZChkb2N1bWVudC5jcmVhdGVUZXh0Tm9kZShjc3MpKTtcbn1cbmhlYWQuYXBwZW5kQ2hpbGQoc3R5bGUpO1xuXG52YXIgbGluayA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoJ2xpbmsnKTtcbmxpbmsuaHJlZiA9ICdodHRwczovL2ZpbGUubXlmb250YXN0aWMuY29tL01Edm5SSkdoQmQ1eFZjWG40dVFKU1ovaWNvbnMuY3NzJztcbmxpbmsucmVsID0gJ3N0eWxlc2hlZXQnO1xuXG5kb2N1bWVudC5nZXRFbGVtZW50c0J5VGFnTmFtZSgnaGVhZCcpWzBdLmFwcGVuZENoaWxkKGxpbmspO1xuXG5tb2R1bGUuZXhwb3J0cyA9IHBwYmE7IiwidmFyIFN0b3JlID0gcmVxdWlyZSgnLi9zdG9yZScpO1xudmFyIExvZ2dlciA9IHJlcXVpcmUoJy4vbG9nZ2VyJyk7XG52YXIgRG9tID0gcmVxdWlyZSgnLi9kb20nKTtcbnZhciBDYWxsZXIgPSByZXF1aXJlKCcuL2NhbGxlcicpO1xuXG52YXIgdXBsb2FkaW5nID0gZmFsc2U7XG5cbnZhciBBdmF0YXJDdHJsID0ge1xuXHRfc3VibWl0OiBudWxsLFxuXHRfZmlsZTogbnVsbCxcblx0X3Byb2dyZXNzOiBudWxsLFxuXHRfc2lkZWJhcl9hdmF0YXI6IG51bGwsXG5cdF90b3BfYXZhdGFyOiBudWxsLFxuXHRfdG9wX2F2YXRhcl9jb250YWluZXI6IG51bGwsXG5cblx0aW5pdDogZnVuY3Rpb24gaW5pdCgpIHtcblx0XHRBdmF0YXJDdHJsLl9zdWJtaXQgPSBkb2N1bWVudC5nZXRFbGVtZW50QnlJZCgnYmFjLS0tcHVyZXNkay1hdmF0YXItc3VibWl0Jyk7XG5cdFx0QXZhdGFyQ3RybC5fZmlsZSA9IGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKCdiYWMtLS1wdXJlc2RrLWF2YXRhci1maWxlJyk7XG5cdFx0QXZhdGFyQ3RybC5fdG9wX2F2YXRhcl9jb250YWluZXIgPSBkb2N1bWVudC5nZXRFbGVtZW50QnlJZCgnYmFjLS1pbWFnZS1jb250YWluZXItdG9wJyk7XG5cdFx0QXZhdGFyQ3RybC5fcHJvZ3Jlc3MgPSBkb2N1bWVudC5nZXRFbGVtZW50QnlJZCgnYmFjLS11c2VyLWltYWdlLXVwbG9hZC1wcm9ncmVzcycpO1xuXHRcdEF2YXRhckN0cmwuX3NpZGViYXJfYXZhdGFyID0gZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoJ2JhYy0tdXNlci1pbWFnZS1maWxlJyk7XG5cdFx0QXZhdGFyQ3RybC5fdG9wX2F2YXRhciA9IGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKCdiYWMtLXVzZXItYXZhdGFyLXRvcCcpO1xuXHRcdEF2YXRhckN0cmwuX2ZpbGUuYWRkRXZlbnRMaXN0ZW5lcignY2xpY2snLCBmdW5jdGlvbiAoZSkge1xuXHRcdFx0ZS5zdG9wUHJvcGFnYXRpb24oKTtcblx0XHR9KTtcblx0XHRBdmF0YXJDdHJsLl9maWxlLmFkZEV2ZW50TGlzdGVuZXIoJ2NoYW5nZScsIGZ1bmN0aW9uIChlKSB7XG5cdFx0XHRBdmF0YXJDdHJsLnVwbG9hZCgpO1xuXHRcdH0pO1xuXG5cdFx0ZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoJ2JhYy0tdXNlci1pbWFnZScpLmFkZEV2ZW50TGlzdGVuZXIoJ2NsaWNrJywgZnVuY3Rpb24gKGUpIHtcblx0XHRcdGUuc3RvcFByb3BhZ2F0aW9uKCk7XG5cdFx0XHRBdmF0YXJDdHJsLl9maWxlLmNsaWNrKCk7XG5cdFx0fSk7XG5cdH0sXG5cblx0dXBsb2FkOiBmdW5jdGlvbiB1cGxvYWQoKSB7XG5cdFx0aWYgKHVwbG9hZGluZykge1xuXHRcdFx0cmV0dXJuO1xuXHRcdH1cblx0XHR1cGxvYWRpbmcgPSB0cnVlO1xuXG5cdFx0aWYgKEF2YXRhckN0cmwuX2ZpbGUuZmlsZXMubGVuZ3RoID09PSAwKSB7XG5cdFx0XHRyZXR1cm47XG5cdFx0fVxuXG5cdFx0dmFyIGRhdGEgPSBuZXcgRm9ybURhdGEoKTtcblx0XHRkYXRhLmFwcGVuZCgnZmlsZScsIEF2YXRhckN0cmwuX2ZpbGUuZmlsZXNbMF0pO1xuXG5cdFx0dmFyIHN1Y2Nlc3NDYWxsYmFjayA9IGZ1bmN0aW9uIHN1Y2Nlc3NDYWxsYmFjayhkYXRhKSB7XG5cdFx0XHQ7XG5cdFx0fTtcblxuXHRcdHZhciBmYWlsQ2FsbGJhY2sgPSBmdW5jdGlvbiBmYWlsQ2FsbGJhY2soZGF0YSkge1xuXHRcdFx0O1xuXHRcdH07XG5cblx0XHR2YXIgcmVxdWVzdCA9IG5ldyBYTUxIdHRwUmVxdWVzdCgpO1xuXHRcdHJlcXVlc3Qub25yZWFkeXN0YXRlY2hhbmdlID0gZnVuY3Rpb24gKCkge1xuXHRcdFx0dXBsb2FkaW5nID0gZmFsc2U7XG5cdFx0XHRpZiAocmVxdWVzdC5yZWFkeVN0YXRlID09IDQpIHtcblx0XHRcdFx0dHJ5IHtcblx0XHRcdFx0XHR2YXIgaW1hZ2VEYXRhID0gSlNPTi5wYXJzZShyZXF1ZXN0LnJlc3BvbnNlKS5kYXRhO1xuXHRcdFx0XHRcdEF2YXRhckN0cmwuc2V0QXZhdGFyKGltYWdlRGF0YS51cmwpO1xuXHRcdFx0XHRcdENhbGxlci5tYWtlQ2FsbCh7XG5cdFx0XHRcdFx0XHR0eXBlOiAnUFVUJyxcblx0XHRcdFx0XHRcdGVuZHBvaW50OiBTdG9yZS5nZXRBdmF0YXJVcGRhdGVVcmwoKSxcblx0XHRcdFx0XHRcdHBhcmFtczoge1xuXHRcdFx0XHRcdFx0XHR1c2VyOiB7XG5cdFx0XHRcdFx0XHRcdFx0YXZhdGFyX3V1aWQ6IGltYWdlRGF0YS5ndWlkXG5cdFx0XHRcdFx0XHRcdH1cblx0XHRcdFx0XHRcdH0sXG5cdFx0XHRcdFx0XHRjYWxsYmFja3M6IHtcblx0XHRcdFx0XHRcdFx0c3VjY2Vzczogc3VjY2Vzc0NhbGxiYWNrLFxuXHRcdFx0XHRcdFx0XHRmYWlsOiBmYWlsQ2FsbGJhY2tcblx0XHRcdFx0XHRcdH1cblx0XHRcdFx0XHR9KTtcblx0XHRcdFx0fSBjYXRjaCAoZSkge1xuXHRcdFx0XHRcdHZhciByZXNwID0ge1xuXHRcdFx0XHRcdFx0c3RhdHVzOiAnZXJyb3InLFxuXHRcdFx0XHRcdFx0ZGF0YTogJ1Vua25vd24gZXJyb3Igb2NjdXJyZWQ6IFsnICsgcmVxdWVzdC5yZXNwb25zZVRleHQgKyAnXSdcblx0XHRcdFx0XHR9O1xuXHRcdFx0XHR9XG5cdFx0XHRcdExvZ2dlci5sb2cocmVxdWVzdC5yZXNwb25zZS5zdGF0dXMgKyAnOiAnICsgcmVxdWVzdC5yZXNwb25zZS5kYXRhKTtcblx0XHRcdH1cblx0XHR9O1xuXG5cdFx0Ly8gcmVxdWVzdC51cGxvYWQuYWRkRXZlbnRMaXN0ZW5lcigncHJvZ3Jlc3MnLCBmdW5jdGlvbihlKXtcblx0XHQvLyBcdExvZ2dlci5sb2coZS5sb2FkZWQvZS50b3RhbCk7XG5cdFx0Ly8gXHRBdmF0YXJDdHJsLl9wcm9ncmVzcy5zdHlsZS50b3AgPSAxMDAgLSAoZS5sb2FkZWQvZS50b3RhbCkgKiAxMDAgKyAnJSc7XG5cdFx0Ly8gfSwgZmFsc2UpO1xuXG5cdFx0dmFyIHVybCA9IFN0b3JlLmdldEF2YXRhclVwbG9hZFVybCgpO1xuXHRcdERvbS5hZGRDbGFzcyhBdmF0YXJDdHJsLl9wcm9ncmVzcywgJ2JhYy0tcHVyZXNkay12aXNpYmxlJyk7XG5cdFx0cmVxdWVzdC5vcGVuKCdQT1NUJywgdXJsKTtcblx0XHRyZXF1ZXN0LnNlbmQoZGF0YSk7XG5cdH0sXG5cblx0c2V0QXZhdGFyOiBmdW5jdGlvbiBzZXRBdmF0YXIodXJsKSB7XG5cdFx0aWYgKCF1cmwpIHtcblx0XHRcdHJldHVybjtcblx0XHR9XG5cblx0XHREb20ucmVtb3ZlQ2xhc3MoQXZhdGFyQ3RybC5fcHJvZ3Jlc3MsICdiYWMtLXB1cmVzZGstdmlzaWJsZScpO1xuXHRcdERvbS5hZGRDbGFzcyhBdmF0YXJDdHJsLl9zaWRlYmFyX2F2YXRhciwgJ2JhYy0tcHVyZXNkay12aXNpYmxlJyk7XG5cdFx0dmFyIGltZyA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoJ2ltZycpO1xuXHRcdGltZy5zcmMgPSB1cmw7XG5cdFx0QXZhdGFyQ3RybC5fc2lkZWJhcl9hdmF0YXIuaW5uZXJIVE1MID0gJyc7XG5cdFx0QXZhdGFyQ3RybC5fc2lkZWJhcl9hdmF0YXIuYXBwZW5kQ2hpbGQoaW1nKTtcblxuXHRcdERvbS5hZGRDbGFzcyhBdmF0YXJDdHJsLl90b3BfYXZhdGFyX2NvbnRhaW5lciwgJ2JhYy0tcHVyZXNkay12aXNpYmxlJyk7XG5cdFx0dmFyIGltZ18yID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudCgnaW1nJyk7XG5cdFx0aW1nXzIuc3JjID0gdXJsO1xuXHRcdEF2YXRhckN0cmwuX3RvcF9hdmF0YXJfY29udGFpbmVyLmlubmVySFRNTCA9ICcnO1xuXHRcdEF2YXRhckN0cmwuX3RvcF9hdmF0YXJfY29udGFpbmVyLmFwcGVuZENoaWxkKGltZ18yKTtcblxuXHRcdC8vICBiYWMtLWltYWdlLWNvbnRhaW5lci10b3Bcblx0fVxufTtcblxubW9kdWxlLmV4cG9ydHMgPSBBdmF0YXJDdHJsOyIsInZhciBTdG9yZSA9IHJlcXVpcmUoJy4vc3RvcmUuanMnKTtcbnZhciBMb2dnZXIgPSByZXF1aXJlKCcuL2xvZ2dlcicpO1xuXG52YXIgcGFyYW1zVG9HZXRWYXJzID0gZnVuY3Rpb24gcGFyYW1zVG9HZXRWYXJzKHBhcmFtcykge1xuXHR2YXIgdG9SZXR1cm4gPSBbXTtcblx0Zm9yICh2YXIgcHJvcGVydHkgaW4gcGFyYW1zKSB7XG5cdFx0aWYgKHBhcmFtcy5oYXNPd25Qcm9wZXJ0eShwcm9wZXJ0eSkpIHtcblx0XHRcdHRvUmV0dXJuLnB1c2gocHJvcGVydHkgKyAnPScgKyBwYXJhbXNbcHJvcGVydHldKTtcblx0XHR9XG5cdH1cblxuXHRyZXR1cm4gdG9SZXR1cm4uam9pbignJicpO1xufTtcblxudmFyIGRldktleXMgPSBudWxsO1xuXG52YXIgQ2FsbGVyID0ge1xuXHQvKlxuIGlmIHRoZSB1c2VyIHNldHNcbiAgKi9cblx0c2V0RGV2S2V5czogZnVuY3Rpb24gc2V0RGV2S2V5cyhrZXlzKSB7XG5cdFx0ZGV2S2V5cyA9IGtleXM7XG5cdH0sXG5cblx0LypcbiBleHBlY3RlIGF0dHJpYnV0ZXM6XG4gLSB0eXBlIChlaXRoZXIgR0VULCBQT1NULCBERUxFVEUsIFBVVClcbiAtIGVuZHBvaW50XG4gLSBwYXJhbXMgKGlmIGFueS4gQSBqc29uIHdpdGggcGFyYW1ldGVycyB0byBiZSBwYXNzZWQgYmFjayB0byB0aGUgZW5kcG9pbnQpXG4gLSBjYWxsYmFja3M6IGFuIG9iamVjdCB3aXRoOlxuIFx0LSBzdWNjZXNzOiB0aGUgc3VjY2VzcyBjYWxsYmFja1xuIFx0LSBmYWlsOiB0aGUgZmFpbCBjYWxsYmFja1xuICAqL1xuXHRtYWtlQ2FsbDogZnVuY3Rpb24gbWFrZUNhbGwoYXR0cnMpIHtcblx0XHR2YXIgZW5kcG9pbnRVcmwgPSBhdHRycy5lbmRwb2ludDtcblxuXHRcdHZhciB4aHIgPSBuZXcgWE1MSHR0cFJlcXVlc3QoKTtcblxuXHRcdGlmIChhdHRycy50eXBlID09PSAnR0VUJyAmJiBhdHRycy5wYXJhbXMpIHtcblx0XHRcdGVuZHBvaW50VXJsID0gZW5kcG9pbnRVcmwgKyBcIj9cIiArIHBhcmFtc1RvR2V0VmFycyhhdHRycy5wYXJhbXMpO1xuXHRcdH1cblxuXHRcdHhoci5vcGVuKGF0dHJzLnR5cGUsIGVuZHBvaW50VXJsKTtcblxuXHRcdGlmIChkZXZLZXlzICE9IG51bGwpIHtcblx0XHRcdHhoci5zZXRSZXF1ZXN0SGVhZGVyKCd4LXBwLXNlY3JldCcsIGRldktleXMuc2VjcmV0KTtcblx0XHRcdHhoci5zZXRSZXF1ZXN0SGVhZGVyKCd4LXBwLWtleScsIGRldktleXMua2V5KTtcblx0XHR9XG5cdFx0eGhyLndpdGhDcmVkZW50aWFscyA9IHRydWU7XG5cdFx0eGhyLnNldFJlcXVlc3RIZWFkZXIoJ0NvbnRlbnQtVHlwZScsICdhcHBsaWNhdGlvbi9qc29uJyk7XG5cdFx0eGhyLm9ubG9hZCA9IGZ1bmN0aW9uICgpIHtcblx0XHRcdGlmICh4aHIuc3RhdHVzID49IDIwMCAmJiB4aHIuc3RhdHVzIDwgMzAwKSB7XG5cdFx0XHRcdGF0dHJzLmNhbGxiYWNrcy5zdWNjZXNzKEpTT04ucGFyc2UoeGhyLnJlc3BvbnNlVGV4dCkpO1xuXHRcdFx0fSBlbHNlIGlmICh4aHIuc3RhdHVzICE9PSAyMDApIHtcblx0XHRcdFx0YXR0cnMuY2FsbGJhY2tzLmZhaWwoSlNPTi5wYXJzZSh4aHIucmVzcG9uc2VUZXh0KSk7XG5cdFx0XHR9XG5cdFx0fTtcblxuXHRcdGlmICghYXR0cnMucGFyYW1zKSB7XG5cdFx0XHRhdHRycy5wYXJhbXMgPSB7fTtcblx0XHR9XG5cdFx0eGhyLnNlbmQoSlNPTi5zdHJpbmdpZnkoYXR0cnMucGFyYW1zKSk7XG5cdH0sXG5cblx0cHJvbWlzZUNhbGw6IGZ1bmN0aW9uIHByb21pc2VDYWxsKGF0dHJzKSB7XG5cdFx0cmV0dXJuIG5ldyBQcm9taXNlKGZ1bmN0aW9uIChyZXNvbHZlLCByZWplY3QpIHtcblx0XHRcdHZhciB4aHIgPSBuZXcgWE1MSHR0cFJlcXVlc3QoKTtcblxuXHRcdFx0aWYgKGF0dHJzLnR5cGUgPT09ICdHRVQnICYmIGF0dHJzLnBhcmFtcykge1xuXHRcdFx0XHRlbmRwb2ludFVybCA9IGVuZHBvaW50VXJsICsgXCI/XCIgKyBwYXJhbXNUb0dldFZhcnMoYXR0cnMucGFyYW1zKTtcblx0XHRcdH1cblxuXHRcdFx0eGhyLm9wZW4oYXR0cnMudHlwZSwgYXR0cnMuZW5kcG9pbnQpO1xuXHRcdFx0eGhyLndpdGhDcmVkZW50aWFscyA9IHRydWU7XG5cblx0XHRcdGlmIChkZXZLZXlzICE9IG51bGwpIHtcblx0XHRcdFx0eGhyLnNldFJlcXVlc3RIZWFkZXIoJ3gtcHAtc2VjcmV0JywgZGV2S2V5cy5zZWNyZXQpO1xuXHRcdFx0XHR4aHIuc2V0UmVxdWVzdEhlYWRlcigneC1wcC1rZXknLCBkZXZLZXlzLmtleSk7XG5cdFx0XHR9XG5cblx0XHRcdHhoci5zZXRSZXF1ZXN0SGVhZGVyKCdDb250ZW50LVR5cGUnLCAnYXBwbGljYXRpb24vanNvbicpO1xuXHRcdFx0eGhyLm9ubG9hZCA9IGZ1bmN0aW9uICgpIHtcblx0XHRcdFx0aWYgKHRoaXMuc3RhdHVzID49IDIwMCAmJiB0aGlzLnN0YXR1cyA8IDMwMCkge1xuXHRcdFx0XHRcdGF0dHJzLm1pZGRsZXdhcmVzLnN1Y2Nlc3MoSlNPTi5wYXJzZSh4aHIucmVzcG9uc2VUZXh0KSk7XG5cdFx0XHRcdFx0cmVzb2x2ZShKU09OLnBhcnNlKHhoci5yZXNwb25zZVRleHQpKTtcblx0XHRcdFx0fSBlbHNlIHtcblx0XHRcdFx0XHR3aW5kb3cubG9jYXRpb24uaHJlZiA9IFN0b3JlLmdldExvZ2luVXJsKCk7XG5cdFx0XHRcdH1cblx0XHRcdH07XG5cdFx0XHR4aHIub25lcnJvciA9IGZ1bmN0aW9uICgpIHtcblx0XHRcdFx0d2luZG93LmxvY2F0aW9uID0gU3RvcmUuZ2V0TG9naW5VcmwoKTtcblx0XHRcdH07XG5cdFx0XHR4aHIuc2VuZCgpO1xuXHRcdH0pO1xuXHR9XG59O1xuXG5tb2R1bGUuZXhwb3J0cyA9IENhbGxlcjsiLCJ2YXIgZGVib3VuY2VkVGltZW91dCA9IG51bGw7XG52YXIgY3VycmVudFF1ZXJ5ID0gJyc7XG52YXIgbGltaXQgPSA4O1xudmFyIGxhdGVuY3kgPSA1MDA7XG52YXIgaW5pdE9wdGlvbnMgPSB2b2lkIDA7XG52YXIgY3VycmVudFBhZ2UgPSAxO1xudmFyIG1ldGFEYXRhID0gbnVsbDtcbnZhciBpdGVtcyA9IFtdO1xudmFyIHBhZ2luYXRpb25EYXRhID0gbnVsbDtcblxudmFyIFBhZ2luYXRpb25IZWxwZXIgPSByZXF1aXJlKCcuL3BhZ2luYXRpb24taGVscGVyJyk7XG52YXIgQ2FsbGVyID0gcmVxdWlyZSgnLi9jYWxsZXInKTtcbnZhciBTdG9yZSA9IHJlcXVpcmUoJy4vc3RvcmUnKTtcbnZhciBEb20gPSByZXF1aXJlKCcuL2RvbScpO1xuXG52YXIgQ2xvdWRpbmFyeVBpY2tlciA9IHtcblxuXHRcdGluaXRpYWxpc2U6IGZ1bmN0aW9uIGluaXRpYWxpc2UoKSB7XG5cdFx0XHRcdGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKCdiYWMtLWNsb3VkaW5hcnktLWNsb3NlYnRuJykub25jbGljayA9IGZ1bmN0aW9uIChlKSB7XG5cdFx0XHRcdFx0XHRDbG91ZGluYXJ5UGlja2VyLmNsb3NlTW9kYWwoKTtcblx0XHRcdFx0fTtcblx0XHRcdFx0ZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoJ2JhYy0tY2xvdWRpbmFyeS0tc2VhcmNoLWlucHV0Jykub25rZXl1cCA9IGZ1bmN0aW9uIChlKSB7XG5cdFx0XHRcdFx0XHRDbG91ZGluYXJ5UGlja2VyLmhhbmRsZVNlYXJjaChlKTtcblx0XHRcdFx0fTtcblx0XHRcdFx0ZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoJ2JhYy0tY2xvdWRpbmFyeS0tZ28tYmFjaycpLm9uY2xpY2sgPSBmdW5jdGlvbiAoZSkge1xuXHRcdFx0XHRcdFx0Q2xvdWRpbmFyeVBpY2tlci5nb0JhY2soKTtcblx0XHRcdFx0fTtcblx0XHR9LFxuXG5cdFx0LypcbiAgb3B0aW9uczoge1xuICBcdG9uU2VsZWN0OiBpdCBleHBlY3RzIGEgZnVuY3Rpb24uIFRoaXMgZnVuY3Rpb24gd2lsbCBiZSBpbnZva2VkIGV4YWN0bHkgYXQgdGhlIG1vbWVudCB0aGUgdXNlciBwaWNrc1xuICBcdFx0YSBmaWxlIGZyb20gY2xvdWRpbmFyeS4gVGhlIGZ1bmN0aW9uIHdpbGwgdGFrZSBqdXN0IG9uZSBwYXJhbSB3aGljaCBpcyB0aGUgc2VsZWN0ZWQgaXRlbSBvYmplY3RcbiAgICBjbG9zZU9uRXNjOiB0cnVlIC8gZmFsc2VcbiAgfVxuICAgKi9cblx0XHRvcGVuTW9kYWw6IGZ1bmN0aW9uIG9wZW5Nb2RhbChvcHRpb25zKSB7XG5cdFx0XHRcdENsb3VkaW5hcnlQaWNrZXIuaW5pdGlhbGlzZSgpO1xuXHRcdFx0XHRpbml0T3B0aW9ucyA9IG9wdGlvbnM7XG5cdFx0XHRcdERvbS5hZGRDbGFzcyhkb2N1bWVudC5nZXRFbGVtZW50QnlJZCgnYmFjLS1jbG91ZGluYXJ5LS1tb2RhbCcpLCAnaXMtb3BlbicpO1xuXHRcdFx0XHRDbG91ZGluYXJ5UGlja2VyLmdldEltYWdlcyh7XG5cdFx0XHRcdFx0XHRwYWdlOiAxLFxuXHRcdFx0XHRcdFx0bGltaXQ6IGxpbWl0XG5cdFx0XHRcdH0pO1xuXHRcdH0sXG5cblx0XHRjbG9zZU1vZGFsOiBmdW5jdGlvbiBjbG9zZU1vZGFsKCkge1xuXHRcdFx0XHREb20ucmVtb3ZlQ2xhc3MoZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoJ2JhYy0tY2xvdWRpbmFyeS0tbW9kYWwnKSwgJ2lzLW9wZW4nKTtcblx0XHR9LFxuXG5cdFx0Z2V0SW1hZ2VzOiBmdW5jdGlvbiBnZXRJbWFnZXMob3B0aW9ucykge1xuXHRcdFx0XHQvLyBUT0RPIG1ha2UgdGhlIGNhbGwgYW5kIGdldCB0aGUgaW1hZ2VzXG5cblx0XHRcdFx0Q2FsbGVyLm1ha2VDYWxsKHtcblx0XHRcdFx0XHRcdHR5cGU6ICdHRVQnLFxuXHRcdFx0XHRcdFx0ZW5kcG9pbnQ6IFN0b3JlLmdldENsb3VkaW5hcnlFbmRwb2ludCgpLFxuXHRcdFx0XHRcdFx0cGFyYW1zOiBvcHRpb25zLFxuXHRcdFx0XHRcdFx0Y2FsbGJhY2tzOiB7XG5cdFx0XHRcdFx0XHRcdFx0c3VjY2VzczogZnVuY3Rpb24gc3VjY2VzcyhyZXN1bHQpIHtcblx0XHRcdFx0XHRcdFx0XHRcdFx0Q2xvdWRpbmFyeVBpY2tlci5vbkltYWdlc1Jlc3BvbnNlKHJlc3VsdCk7XG5cdFx0XHRcdFx0XHRcdFx0fSxcblx0XHRcdFx0XHRcdFx0XHRmYWlsOiBmdW5jdGlvbiBmYWlsKGVycikge1xuXHRcdFx0XHRcdFx0XHRcdFx0XHRhbGVydChlcnIpO1xuXHRcdFx0XHRcdFx0XHRcdH1cblx0XHRcdFx0XHRcdH1cblx0XHRcdFx0fSk7XG5cdFx0fSxcblxuXHRcdGhhbmRsZVNlYXJjaDogZnVuY3Rpb24gaGFuZGxlU2VhcmNoKGUpIHtcblx0XHRcdFx0aWYgKGRlYm91bmNlZFRpbWVvdXQpIHtcblx0XHRcdFx0XHRcdGNsZWFyVGltZW91dChkZWJvdW5jZWRUaW1lb3V0KTtcblx0XHRcdFx0fVxuXG5cdFx0XHRcdGlmIChlLnRhcmdldC52YWx1ZSA9PT0gY3VycmVudFF1ZXJ5KSB7XG5cdFx0XHRcdFx0XHRyZXR1cm47XG5cdFx0XHRcdH1cblxuXHRcdFx0XHR2YXIgcXVlcnkgPSBlLnRhcmdldC52YWx1ZTtcblxuXHRcdFx0XHRjdXJyZW50UXVlcnkgPSBxdWVyeTtcblxuXHRcdFx0XHR2YXIgb3B0aW9ucyA9IHtcblx0XHRcdFx0XHRcdHBhZ2U6IDEsXG5cdFx0XHRcdFx0XHRsaW1pdDogbGltaXQsXG5cdFx0XHRcdFx0XHRxdWVyeTogcXVlcnlcblx0XHRcdFx0fTtcblxuXHRcdFx0XHRkZWJvdW5jZWRUaW1lb3V0ID0gc2V0VGltZW91dChmdW5jdGlvbiAoKSB7XG5cdFx0XHRcdFx0XHRDbG91ZGluYXJ5UGlja2VyLmdldEltYWdlcyhvcHRpb25zKTtcblx0XHRcdFx0fSwgbGF0ZW5jeSk7XG5cdFx0fSxcblxuXHRcdGl0ZW1TZWxlY3RlZDogZnVuY3Rpb24gaXRlbVNlbGVjdGVkKGl0ZW0sIGUpIHtcblxuXHRcdFx0XHRpZiAoaXRlbS50eXBlID09ICdmb2xkZXInKSB7XG5cblx0XHRcdFx0XHRcdHZhciBwYXJhbXMgPSB7XG5cdFx0XHRcdFx0XHRcdFx0cGFnZTogMSxcblx0XHRcdFx0XHRcdFx0XHRsaW1pdDogbGltaXQsXG5cdFx0XHRcdFx0XHRcdFx0cGFyZW50OiBpdGVtLmlkXG5cdFx0XHRcdFx0XHR9O1xuXG5cdFx0XHRcdFx0XHQvLyBUT0RPIHNldCBzZWFyY2ggaW5wdXQncyB2YWx1ZSA9ICcnXG5cdFx0XHRcdFx0XHRjdXJyZW50UXVlcnkgPSAnJztcblxuXHRcdFx0XHRcdFx0Q2xvdWRpbmFyeVBpY2tlci5nZXRJbWFnZXMocGFyYW1zKTtcblx0XHRcdFx0fSBlbHNlIHtcblx0XHRcdFx0XHRcdGluaXRPcHRpb25zLm9uU2VsZWN0KGl0ZW0pO1xuXHRcdFx0XHRcdFx0Q2xvdWRpbmFyeVBpY2tlci5jbG9zZU1vZGFsKCk7XG5cdFx0XHRcdH1cblx0XHR9LFxuXG5cdFx0b25JbWFnZXNSZXNwb25zZTogZnVuY3Rpb24gb25JbWFnZXNSZXNwb25zZShkYXRhKSB7XG5cblx0XHRcdFx0cGFnaW5hdGlvbkRhdGEgPSBQYWdpbmF0aW9uSGVscGVyLmdldFBhZ2VzUmFuZ2UoY3VycmVudFBhZ2UsIE1hdGguY2VpbChkYXRhLm1ldGEudG90YWwgLyBsaW1pdCkpO1xuXG5cdFx0XHRcdG1ldGFEYXRhID0gZGF0YS5tZXRhO1xuXHRcdFx0XHRpdGVtcyA9IGRhdGEuYXNzZXRzO1xuXG5cdFx0XHRcdENsb3VkaW5hcnlQaWNrZXIucmVuZGVyKCk7XG5cdFx0fSxcblxuXHRcdHJlbmRlclBhZ2luYXRpb25CdXR0b25zOiBmdW5jdGlvbiByZW5kZXJQYWdpbmF0aW9uQnV0dG9ucygpIHtcblx0XHRcdFx0dmFyIHRvUmV0dXJuID0gW107XG5cblx0XHRcdFx0dmFyIGNyZWF0ZVBhZ2luYXRpb25FbGVtZW50ID0gZnVuY3Rpb24gY3JlYXRlUGFnaW5hdGlvbkVsZW1lbnQoYUNsYXNzTmFtZSwgYUZ1bmN0aW9uLCBzcGFuQ2xhc3NOYW1lLCBzcGFuQ29udGVudCkge1xuXHRcdFx0XHRcdFx0dmFyIGxpID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudCgnbGknKTtcblx0XHRcdFx0XHRcdHZhciBhID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudCgnYScpO1xuXHRcdFx0XHRcdFx0bGkuY2xhc3NOYW1lID0gYUNsYXNzTmFtZTtcblx0XHRcdFx0XHRcdGEub25jbGljayA9IGFGdW5jdGlvbjtcblx0XHRcdFx0XHRcdHZhciBzcGFuID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudCgnc3BhbicpO1xuXHRcdFx0XHRcdFx0c3Bhbi5jbGFzc05hbWUgPSBzcGFuQ2xhc3NOYW1lO1xuXHRcdFx0XHRcdFx0aWYgKHNwYW5Db250ZW50KSB7XG5cdFx0XHRcdFx0XHRcdFx0c3Bhbi5pbm5lckhUTUwgPSBzcGFuQ29udGVudDtcblx0XHRcdFx0XHRcdH1cblx0XHRcdFx0XHRcdGEuYXBwZW5kQ2hpbGQoc3Bhbik7XG5cdFx0XHRcdFx0XHRsaS5hcHBlbmRDaGlsZChhKTtcblx0XHRcdFx0XHRcdHJldHVybiBsaTtcblx0XHRcdFx0fTtcblxuXHRcdFx0XHRpZiAocGFnaW5hdGlvbkRhdGEuaGFzUHJldmlvdXMpIHtcblx0XHRcdFx0XHRcdHRvUmV0dXJuLnB1c2goY3JlYXRlUGFnaW5hdGlvbkVsZW1lbnQoJ2Rpc2FibGVkJywgZnVuY3Rpb24gKGUpIHtcblx0XHRcdFx0XHRcdFx0XHRlLnByZXZlbnREZWZhdWx0KCk7XG5cdFx0XHRcdFx0XHRcdFx0Q2xvdWRpbmFyeVBpY2tlci5fZ29Ub1BhZ2UoMSk7XG5cdFx0XHRcdFx0XHR9LCAnZmEgZmEtYW5nbGUtZG91YmxlLWxlZnQnKSk7XG5cdFx0XHRcdFx0XHR0b1JldHVybi5wdXNoKGNyZWF0ZVBhZ2luYXRpb25FbGVtZW50KCdkaXNhYmxlZCcsIGZ1bmN0aW9uIChlKSB7XG5cdFx0XHRcdFx0XHRcdFx0ZS5wcmV2ZW50RGVmYXVsdCgpO1xuXHRcdFx0XHRcdFx0XHRcdENsb3VkaW5hcnlQaWNrZXIuX2dvVG9QYWdlKGN1cnJlbnRQYWdlIC0gMSk7XG5cdFx0XHRcdFx0XHR9LCAnZmEgZmEtYW5nbGUtbGVmdCcpKTtcblx0XHRcdFx0fVxuXG5cdFx0XHRcdGZvciAodmFyIGkgPSAwOyBpIDwgcGFnaW5hdGlvbkRhdGEuYnV0dG9ucy5sZW5ndGg7IGkrKykge1xuXHRcdFx0XHRcdFx0KGZ1bmN0aW9uIChpKSB7XG5cdFx0XHRcdFx0XHRcdFx0dmFyIGJ0biA9IHBhZ2luYXRpb25EYXRhLmJ1dHRvbnNbaV07XG5cdFx0XHRcdFx0XHRcdFx0dG9SZXR1cm4ucHVzaChjcmVhdGVQYWdpbmF0aW9uRWxlbWVudChidG4ucnVubmluZ3BhZ2UgPyBcImFjdGl2ZVwiIDogXCItXCIsIGZ1bmN0aW9uIChlKSB7XG5cdFx0XHRcdFx0XHRcdFx0XHRcdGUucHJldmVudERlZmF1bHQoKTtcblx0XHRcdFx0XHRcdFx0XHRcdFx0Q2xvdWRpbmFyeVBpY2tlci5fZ29Ub1BhZ2UoYnRuLnBhZ2Vubyk7XG5cdFx0XHRcdFx0XHRcdFx0fSwgJ251bWJlcicsIGJ0bi5wYWdlbm8pKTtcblx0XHRcdFx0XHRcdH0pKGkpO1xuXHRcdFx0XHR9XG5cblx0XHRcdFx0aWYgKHBhZ2luYXRpb25EYXRhLmhhc05leHQpIHtcblx0XHRcdFx0XHRcdHRvUmV0dXJuLnB1c2goY3JlYXRlUGFnaW5hdGlvbkVsZW1lbnQoJ2Rpc2FibGVkJywgZnVuY3Rpb24gKGUpIHtcblx0XHRcdFx0XHRcdFx0XHRlLnByZXZlbnREZWZhdWx0KCk7XG5cdFx0XHRcdFx0XHRcdFx0Q2xvdWRpbmFyeVBpY2tlci5fZ29Ub1BhZ2UoY3VycmVudFBhZ2UgKyAxKTtcblx0XHRcdFx0XHRcdH0sICdmYSBmYS1hbmdsZS1yaWdodCcpKTtcblx0XHRcdFx0XHRcdHRvUmV0dXJuLnB1c2goY3JlYXRlUGFnaW5hdGlvbkVsZW1lbnQoJ2Rpc2FibGVkJywgZnVuY3Rpb24gKGUpIHtcblx0XHRcdFx0XHRcdFx0XHRlLnByZXZlbnREZWZhdWx0KCk7XG5cdFx0XHRcdFx0XHRcdFx0Q2xvdWRpbmFyeVBpY2tlci5fZ29Ub1BhZ2UoTWF0aC5jZWlsKG1ldGFEYXRhLnRvdGFsIC8gbGltaXQpKTtcblx0XHRcdFx0XHRcdH0sICdmYSBmYS1hbmdsZS1kb3VibGUtcmlnaHQnKSk7XG5cdFx0XHRcdH1cblxuXHRcdFx0XHRkb2N1bWVudC5nZXRFbGVtZW50QnlJZCgnYmFjLS1jbG91ZGluYXJ5LWFjdHVhbC1wYWdpbmF0aW9uLWNvbnRhaW5lcicpLmlubmVySFRNTCA9ICcnO1xuXHRcdFx0XHRmb3IgKHZhciBfaSA9IDA7IF9pIDwgdG9SZXR1cm4ubGVuZ3RoOyBfaSsrKSB7XG5cdFx0XHRcdFx0XHRkb2N1bWVudC5nZXRFbGVtZW50QnlJZCgnYmFjLS1jbG91ZGluYXJ5LWFjdHVhbC1wYWdpbmF0aW9uLWNvbnRhaW5lcicpLmFwcGVuZENoaWxkKHRvUmV0dXJuW19pXSk7XG5cdFx0XHRcdH1cblx0XHR9LFxuXG5cdFx0X2dvVG9QYWdlOiBmdW5jdGlvbiBfZ29Ub1BhZ2UocGFnZSkge1xuXG5cdFx0XHRcdGlmIChwYWdlID09PSBjdXJyZW50UGFnZSkge1xuXHRcdFx0XHRcdFx0cmV0dXJuO1xuXHRcdFx0XHR9XG5cblx0XHRcdFx0dmFyIHBhcmFtcyA9IHtcblx0XHRcdFx0XHRcdHBhZ2U6IHBhZ2UsXG5cdFx0XHRcdFx0XHRsaW1pdDogbGltaXRcblx0XHRcdFx0fTtcblxuXHRcdFx0XHRpZiAobWV0YURhdGEuYXNzZXQpIHtcblx0XHRcdFx0XHRcdHBhcmFtcy5wYXJlbnQgPSBtZXRhRGF0YS5hc3NldDtcblx0XHRcdFx0fVxuXHRcdFx0XHRpZiAoY3VycmVudFF1ZXJ5KSB7XG5cdFx0XHRcdFx0XHRwYXJhbXMucXVlcnkgPSBjdXJyZW50UXVlcnk7XG5cdFx0XHRcdH1cblxuXHRcdFx0XHRjdXJyZW50UGFnZSA9IHBhZ2U7XG5cblx0XHRcdFx0Q2xvdWRpbmFyeVBpY2tlci5nZXRJbWFnZXMocGFyYW1zKTtcblx0XHR9LFxuXG5cdFx0Z29CYWNrOiBmdW5jdGlvbiBnb0JhY2soKSB7XG5cblx0XHRcdFx0dmFyIHBhcmFtcyA9IHtcblx0XHRcdFx0XHRcdHBhZ2U6IDEsXG5cdFx0XHRcdFx0XHRsaW1pdDogbGltaXRcblx0XHRcdFx0fTtcblx0XHRcdFx0aWYgKG1ldGFEYXRhLnBhcmVudCkge1xuXHRcdFx0XHRcdFx0cGFyYW1zLnBhcmVudCA9IG1ldGFEYXRhLnBhcmVudDtcblx0XHRcdFx0fVxuXHRcdFx0XHRpZiAoY3VycmVudFF1ZXJ5KSB7XG5cdFx0XHRcdFx0XHRwYXJhbXMucXVlcnkgPSBjdXJyZW50UXVlcnk7XG5cdFx0XHRcdH1cblx0XHRcdFx0Q2xvdWRpbmFyeVBpY2tlci5nZXRJbWFnZXMocGFyYW1zKTtcblx0XHR9LFxuXG5cdFx0cmVuZGVySXRlbXM6IGZ1bmN0aW9uIHJlbmRlckl0ZW1zKCkge1xuXHRcdFx0XHR2YXIgb25lSXRlbSA9IGZ1bmN0aW9uIG9uZUl0ZW0oaXRlbSkge1xuXHRcdFx0XHRcdFx0dmFyIGl0ZW1JY29uID0gZnVuY3Rpb24gaXRlbUljb24oKSB7XG5cdFx0XHRcdFx0XHRcdFx0aWYgKGl0ZW0udHlwZSAhPSAnZm9sZGVyJykge1xuXHRcdFx0XHRcdFx0XHRcdFx0XHRyZXR1cm4gJzxpbWcgc3JjPScgKyBpdGVtLnRodW1iICsgJyBhbHQ9XCJcIi8+Jztcblx0XHRcdFx0XHRcdFx0XHR9IGVsc2Uge1xuXHRcdFx0XHRcdFx0XHRcdFx0XHRyZXR1cm4gJzxpIGNsYXNzPVwiZmEgZmEtZm9sZGVyLW9cIj48L2k+Jztcblx0XHRcdFx0XHRcdFx0XHR9XG5cdFx0XHRcdFx0XHR9O1xuXG5cdFx0XHRcdFx0XHR2YXIgZnVuY3QgPSBmdW5jdGlvbiBmdW5jdCgpIHtcblx0XHRcdFx0XHRcdFx0XHRDbG91ZGluYXJ5UGlja2VyLml0ZW1TZWxlY3RlZChpdGVtKTtcblx0XHRcdFx0XHRcdH07XG5cblx0XHRcdFx0XHRcdHZhciBuZXdEb21FbCA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoJ2RpdicpO1xuXHRcdFx0XHRcdFx0bmV3RG9tRWwuY2xhc3NOYW1lID0gXCJjbG91ZC1pbWFnZXNfX2l0ZW1cIjtcblx0XHRcdFx0XHRcdG5ld0RvbUVsLm9uY2xpY2sgPSBmdW5jdDtcblx0XHRcdFx0XHRcdG5ld0RvbUVsLmlubmVySFRNTCA9ICdcXG5cXHRcXHRcXHRcXHRcXHRcXHQgIDxkaXYgY2xhc3M9XCJjbG91ZC1pbWFnZXNfX2l0ZW1fX3R5cGVcIj5cXG5cXHRcXHRcXHRcXHRcXHRcXHRcXHRcXHQnICsgaXRlbUljb24oKSArICdcXG5cXHRcXHRcXHRcXHRcXHRcXHQgIDwvZGl2PlxcblxcdFxcdFxcdFxcdFxcdFxcdCAgPGRpdiBjbGFzcz1cImNsb3VkLWltYWdlc19faXRlbV9fZGV0YWlsc1wiPlxcblxcdFxcdFxcdFxcdFxcdFxcdFxcdFxcdDxzcGFuIGNsYXNzPVwiY2xvdWQtaW1hZ2VzX19pdGVtX19kZXRhaWxzX19uYW1lXCI+JyArIGl0ZW0ubmFtZSArICc8L3NwYW4+XFxuXFx0XFx0XFx0XFx0XFx0XFx0XFx0XFx0PHNwYW4gY2xhc3M9XCJjbG91ZC1pbWFnZXNfX2l0ZW1fX2RldGFpbHNfX2RhdGVcIj4nICsgaXRlbS5jcmRhdGUgKyAnPC9zcGFuPlxcblxcdFxcdFxcdFxcdFxcdFxcdCAgPC9kaXY+XFxuXFx0XFx0XFx0XFx0XFx0XFx0ICA8ZGl2IGNsYXNzPVwiY2xvdWQtaW1hZ2VzX19pdGVtX19hY3Rpb25zXCI+XFxuXFx0XFx0XFx0XFx0XFx0XFx0XFx0XFx0PGEgY2xhc3M9XCJmYSBmYS1wZW5jaWxcIj48L2E+XFxuXFx0XFx0XFx0XFx0XFx0XFx0ICA8L2Rpdj4nO1xuXHRcdFx0XHRcdFx0cmV0dXJuIG5ld0RvbUVsO1xuXHRcdFx0XHR9O1xuXG5cdFx0XHRcdGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKCdiYWMtLWNsb3VkaW5hcnktaXRhbXMtY29udGFpbmVyJykuaW5uZXJIVE1MID0gJyc7XG5cdFx0XHRcdGZvciAodmFyIGkgPSAwOyBpIDwgaXRlbXMubGVuZ3RoOyBpKyspIHtcblx0XHRcdFx0XHRcdGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKCdiYWMtLWNsb3VkaW5hcnktaXRhbXMtY29udGFpbmVyJykuYXBwZW5kQ2hpbGQob25lSXRlbShpdGVtc1tpXSkpO1xuXHRcdFx0XHR9XG5cdFx0fSxcblxuXHRcdHJlbmRlcjogZnVuY3Rpb24gcmVuZGVyKCkge1xuXHRcdFx0XHRpZiAobWV0YURhdGEuYXNzZXQpIHtcblx0XHRcdFx0XHRcdERvbS5yZW1vdmVDbGFzcyhkb2N1bWVudC5nZXRFbGVtZW50QnlJZCgnYmFjLS1jbG91ZGluYXJ5LS1iYWNrLWJ1dHRvbi1jb250YWluZXInKSwgJ2hkbicpO1xuXHRcdFx0XHR9IGVsc2Uge1xuXHRcdFx0XHRcdFx0RG9tLmFkZENsYXNzKGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKCdiYWMtLWNsb3VkaW5hcnktLWJhY2stYnV0dG9uLWNvbnRhaW5lcicpLCAnaGRuJyk7XG5cdFx0XHRcdH1cblxuXHRcdFx0XHRDbG91ZGluYXJ5UGlja2VyLnJlbmRlckl0ZW1zKCk7XG5cblx0XHRcdFx0aWYgKG1ldGFEYXRhLnRvdGFsID4gbGltaXQpIHtcblx0XHRcdFx0XHRcdERvbS5yZW1vdmVDbGFzcyhkb2N1bWVudC5nZXRFbGVtZW50QnlJZCgnYmFjLS1jbG91ZGluYXJ5LXBhZ2luYXRpb24tY29udGFpbmVyJyksICdoZG4nKTtcblx0XHRcdFx0XHRcdENsb3VkaW5hcnlQaWNrZXIucmVuZGVyUGFnaW5hdGlvbkJ1dHRvbnMoKTtcblx0XHRcdFx0fSBlbHNlIHtcblx0XHRcdFx0XHRcdERvbS5hZGRDbGFzcyhkb2N1bWVudC5nZXRFbGVtZW50QnlJZCgnYmFjLS1jbG91ZGluYXJ5LXBhZ2luYXRpb24tY29udGFpbmVyJyksICdoZG4nKTtcblx0XHRcdFx0fVxuXHRcdH1cbn07XG5cbm1vZHVsZS5leHBvcnRzID0gQ2xvdWRpbmFyeVBpY2tlcjsiLCJ2YXIgRG9tID0ge1xuICAgIGhhc0NsYXNzOiBmdW5jdGlvbiBoYXNDbGFzcyhlbCwgY2xhc3NOYW1lKSB7XG4gICAgICAgIGlmIChlbC5jbGFzc0xpc3QpIHJldHVybiBlbC5jbGFzc0xpc3QuY29udGFpbnMoY2xhc3NOYW1lKTtlbHNlIHJldHVybiBuZXcgUmVnRXhwKCcoXnwgKScgKyBjbGFzc05hbWUgKyAnKCB8JCknLCAnZ2knKS50ZXN0KGVsLmNsYXNzTmFtZSk7XG4gICAgfSxcblxuICAgIHJlbW92ZUNsYXNzOiBmdW5jdGlvbiByZW1vdmVDbGFzcyhlbCwgY2xhc3NOYW1lKSB7XG4gICAgICAgIGlmIChlbC5jbGFzc0xpc3QpIGVsLmNsYXNzTGlzdC5yZW1vdmUoY2xhc3NOYW1lKTtlbHNlIGVsLmNsYXNzTmFtZSA9IGVsLmNsYXNzTmFtZS5yZXBsYWNlKG5ldyBSZWdFeHAoJyhefFxcXFxiKScgKyBjbGFzc05hbWUuc3BsaXQoJyAnKS5qb2luKCd8JykgKyAnKFxcXFxifCQpJywgJ2dpJyksICcgJyk7XG4gICAgfSxcblxuICAgIGFkZENsYXNzOiBmdW5jdGlvbiBhZGRDbGFzcyhlbCwgY2xhc3NOYW1lKSB7XG4gICAgICAgIGlmIChlbC5jbGFzc0xpc3QpIGVsLmNsYXNzTGlzdC5hZGQoY2xhc3NOYW1lKTtlbHNlIGVsLmNsYXNzTmFtZSArPSAnICcgKyBjbGFzc05hbWU7XG4gICAgfSxcblxuICAgIHRvZ2dsZUNsYXNzOiBmdW5jdGlvbiB0b2dnbGVDbGFzcyhlbCwgY2xhc3NOYW1lKSB7XG4gICAgICAgIGlmICh0aGlzLmhhc0NsYXNzKGVsLCBjbGFzc05hbWUpKSB7XG4gICAgICAgICAgICB0aGlzLnJlbW92ZUNsYXNzKGVsLCBjbGFzc05hbWUpO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgdGhpcy5hZGRDbGFzcyhlbCwgY2xhc3NOYW1lKTtcbiAgICAgICAgfVxuICAgIH1cbn07XG5cbm1vZHVsZS5leHBvcnRzID0gRG9tOyIsInZhciBkb20gPSByZXF1aXJlKCcuL2RvbScpO1xuXG52YXIgZGVmYXVsdEhpZGVJbiA9IDUwMDA7XG52YXIgbGFzdEluZGV4ID0gMTtcblxudmFyIGluZm9CbG9ja3MgPSBbXTtcblxudmFyIEluZm9Db250cm9sbGVyID0ge1xuXHRpbml0OiBmdW5jdGlvbiBpbml0KCkge1xuXHRcdGZvciAodmFyIGkgPSAxOyBpIDwgNTsgaSsrKSB7XG5cdFx0XHQoZnVuY3Rpb24geChpKSB7XG5cdFx0XHRcdHZhciBjbG9zZUZ1bmN0aW9uID0gZnVuY3Rpb24gY2xvc2VGdW5jdGlvbigpIHtcblx0XHRcdFx0XHRkb20ucmVtb3ZlQ2xhc3MoZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoJ2JhYy0tcHVyZXNkay1pbmZvLWJveC0tJyArIGkpLCAnYmFjLS1hY3RpdmUtLScpO1xuXHRcdFx0XHRcdGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKCdiYWMtLXRpbWVyJyArIGkpLnN0eWxlLnRyYW5zaXRpb24gPSAnJztcblx0XHRcdFx0XHRkb20ucmVtb3ZlQ2xhc3MoZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoJ2JhYy0tdGltZXInICsgaSksICdiYWMtLWZ1bGx3aWR0aCcpO1xuXHRcdFx0XHRcdGluZm9CbG9ja3NbaSAtIDFdLmluVXNlID0gZmFsc2U7XG5cdFx0XHRcdFx0c2V0VGltZW91dChmdW5jdGlvbiAoKSB7XG5cdFx0XHRcdFx0XHRpZiAoaW5mb0Jsb2Nrc1tpIC0gMV0uY2xvc2VUaW1lb3V0KSB7XG5cdFx0XHRcdFx0XHRcdGNsZWFyVGltZW91dChpbmZvQmxvY2tzW2kgLSAxXS5jbG9zZVRpbWVvdXQpO1xuXHRcdFx0XHRcdFx0fVxuXHRcdFx0XHRcdFx0ZG9tLnJlbW92ZUNsYXNzKGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKCdiYWMtLXB1cmVzZGstaW5mby1ib3gtLScgKyBpKSwgJ2JhYy0tc3VjY2VzcycpO1xuXHRcdFx0XHRcdFx0ZG9tLnJlbW92ZUNsYXNzKGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKCdiYWMtLXB1cmVzZGstaW5mby1ib3gtLScgKyBpKSwgJ2JhYy0taW5mbycpO1xuXHRcdFx0XHRcdFx0ZG9tLnJlbW92ZUNsYXNzKGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKCdiYWMtLXB1cmVzZGstaW5mby1ib3gtLScgKyBpKSwgJ2JhYy0td2FybmluZycpO1xuXHRcdFx0XHRcdFx0ZG9tLnJlbW92ZUNsYXNzKGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKCdiYWMtLXB1cmVzZGstaW5mby1ib3gtLScgKyBpKSwgJ2JhYy0tZXJyb3InKTtcblx0XHRcdFx0XHR9LCA0NTApO1xuXHRcdFx0XHR9O1xuXG5cdFx0XHRcdHZhciBhZGRUZXh0ID0gZnVuY3Rpb24gYWRkVGV4dCh0ZXh0KSB7XG5cdFx0XHRcdFx0ZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoJ2JhYy0taW5mby1tYWluLXRleHQtLScgKyBpKS5pbm5lckhUTUwgPSB0ZXh0O1xuXHRcdFx0XHR9O1xuXG5cdFx0XHRcdHZhciBhZGRUaW1lb3V0ID0gZnVuY3Rpb24gYWRkVGltZW91dCh0aW1lb3V0TXNlY3MpIHtcblx0XHRcdFx0XHRkb2N1bWVudC5nZXRFbGVtZW50QnlJZCgnYmFjLS10aW1lcicgKyBpKS5zdHlsZS50cmFuc2l0aW9uID0gJ3dpZHRoICcgKyB0aW1lb3V0TXNlY3MgKyAnbXMnO1xuXHRcdFx0XHRcdGRvbS5hZGRDbGFzcyhkb2N1bWVudC5nZXRFbGVtZW50QnlJZCgnYmFjLS10aW1lcicgKyBpKSwgJ2JhYy0tZnVsbHdpZHRoJyk7XG5cdFx0XHRcdFx0aW5mb0Jsb2Nrc1tpIC0gMV0uY2xvc2VUaW1lb3V0ID0gc2V0VGltZW91dChmdW5jdGlvbiAoKSB7XG5cdFx0XHRcdFx0XHRpbmZvQmxvY2tzW2kgLSAxXS5jbG9zZUZ1bmN0aW9uKCk7XG5cdFx0XHRcdFx0fSwgdGltZW91dE1zZWNzKTtcblx0XHRcdFx0fTtcblxuXHRcdFx0XHRpbmZvQmxvY2tzLnB1c2goe1xuXHRcdFx0XHRcdGlkOiBpLFxuXHRcdFx0XHRcdGluVXNlOiBmYWxzZSxcblx0XHRcdFx0XHRlbGVtZW50OiBkb2N1bWVudC5nZXRFbGVtZW50QnlJZCgnYmFjLS1wdXJlc2RrLWluZm8tYm94LS0nICsgaSksXG5cdFx0XHRcdFx0Y2xvc2VGdW5jdGlvbjogY2xvc2VGdW5jdGlvbixcblx0XHRcdFx0XHRhZGRUZXh0OiBhZGRUZXh0LFxuXHRcdFx0XHRcdGFkZFRpbWVvdXQ6IGFkZFRpbWVvdXQsXG5cdFx0XHRcdFx0Y2xvc2VUaW1lb3V0OiBmYWxzZVxuXHRcdFx0XHR9KTtcblx0XHRcdFx0ZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoJ2JhYy0taW5mby1jbG9zZS1idXR0b24tLScgKyBpKS5vbmNsaWNrID0gZnVuY3Rpb24gKGUpIHtcblx0XHRcdFx0XHRjbG9zZUZ1bmN0aW9uKGkpO1xuXHRcdFx0XHR9O1xuXHRcdFx0fSkoaSk7XG5cdFx0fVxuXHR9LFxuXG5cdC8qXG4gIHR5cGU6IG9uZSBvZjpcbiBcdC0gc3VjY2Vzc1xuIFx0LSBpbmZvXG4gXHQtIHdhcm5pbmdcbiBcdC0gZXJyb3JcbiAgdGV4dDogdGhlIHRleHQgdG8gZGlzcGxheVxuICBvcHRpb25zIChvcHRpb25hbCk6IHtcbiAgXHRcdGhpZGVJbjogbWlsbGlzZWNvbmRzIHRvIGhpZGUgaXQuIC0xIGZvciBub3QgaGlkaW5nIGl0IGF0IGFsbC4gRGVmYXVsdCBpcyA1MDAwXG4gIH1cbiAgKi9cblx0c2hvd0luZm86IGZ1bmN0aW9uIHNob3dJbmZvKHR5cGUsIHRleHQsIG9wdGlvbnMpIHtcblx0XHRmb3IgKHZhciBpID0gMDsgaSA8IGluZm9CbG9ja3MubGVuZ3RoOyBpKyspIHtcblx0XHRcdHZhciBpbmZvQmxvY2sgPSBpbmZvQmxvY2tzW2ldO1xuXHRcdFx0aWYgKCFpbmZvQmxvY2suaW5Vc2UpIHtcblx0XHRcdFx0aW5mb0Jsb2NrLmluVXNlID0gdHJ1ZTtcblx0XHRcdFx0aW5mb0Jsb2NrLmVsZW1lbnQuc3R5bGUuekluZGV4ID0gbGFzdEluZGV4O1xuXHRcdFx0XHRpbmZvQmxvY2suYWRkVGV4dCh0ZXh0KTtcblx0XHRcdFx0bGFzdEluZGV4ICs9IDE7XG5cdFx0XHRcdHZhciB0aW1lb3V0bVNlY3MgPSBkZWZhdWx0SGlkZUluO1xuXHRcdFx0XHR2YXIgYXV0b0Nsb3NlID0gdHJ1ZTtcblx0XHRcdFx0aWYgKG9wdGlvbnMpIHtcblx0XHRcdFx0XHRpZiAob3B0aW9ucy5oaWRlSW4gIT0gbnVsbCAmJiBvcHRpb25zLmhpZGVJbiAhPSB1bmRlZmluZWQgJiYgb3B0aW9ucy5oaWRlSW4gIT0gLTEpIHtcblx0XHRcdFx0XHRcdHRpbWVvdXRtU2VjcyA9IG9wdGlvbnMuaGlkZUluO1xuXHRcdFx0XHRcdH0gZWxzZSBpZiAob3B0aW9ucy5oaWRlSW4gPT09IC0xKSB7XG5cdFx0XHRcdFx0XHRhdXRvQ2xvc2UgPSBmYWxzZTtcblx0XHRcdFx0XHR9XG5cdFx0XHRcdH1cblx0XHRcdFx0aWYgKGF1dG9DbG9zZSkge1xuXHRcdFx0XHRcdGluZm9CbG9jay5hZGRUaW1lb3V0KHRpbWVvdXRtU2Vjcyk7XG5cdFx0XHRcdH1cblx0XHRcdFx0ZG9tLmFkZENsYXNzKGluZm9CbG9jay5lbGVtZW50LCAnYmFjLS0nICsgdHlwZSk7XG5cdFx0XHRcdGRvbS5hZGRDbGFzcyhpbmZvQmxvY2suZWxlbWVudCwgJ2JhYy0tYWN0aXZlLS0nKTtcblx0XHRcdFx0cmV0dXJuO1xuXHRcdFx0fVxuXHRcdH1cblx0fVxufTtcblxubW9kdWxlLmV4cG9ydHMgPSBJbmZvQ29udHJvbGxlcjsiLCJ2YXIgU3RvcmUgPSByZXF1aXJlKCcuL3N0b3JlLmpzJyk7XG5cbnZhciBMb2dnZXIgPSB7XG5cdFx0bG9nOiBmdW5jdGlvbiBsb2cod2hhdCkge1xuXHRcdFx0XHRpZiAoIVN0b3JlLmxvZ3NFbmFibGVkKCkpIHtcblx0XHRcdFx0XHRcdHJldHVybiBmYWxzZTtcblx0XHRcdFx0fSBlbHNlIHtcblx0XHRcdFx0XHRcdExvZ2dlci5sb2cgPSBjb25zb2xlLmxvZy5iaW5kKGNvbnNvbGUpO1xuXHRcdFx0XHRcdFx0TG9nZ2VyLmxvZyh3aGF0KTtcblx0XHRcdFx0fVxuXHRcdH0sXG5cdFx0ZXJyb3I6IGZ1bmN0aW9uIGVycm9yKGVycikge1xuXHRcdFx0XHRpZiAoIVN0b3JlLmxvZ3NFbmFibGVkKCkpIHtcblx0XHRcdFx0XHRcdHJldHVybiBmYWxzZTtcblx0XHRcdFx0fSBlbHNlIHtcblx0XHRcdFx0XHRcdExvZ2dlci5lcnJvciA9IGNvbnNvbGUuZXJyb3IuYmluZChjb25zb2xlKTtcblx0XHRcdFx0XHRcdExvZ2dlci5lcnJvcihlcnIpO1xuXHRcdFx0XHR9XG5cdFx0fVxufTtcblxubW9kdWxlLmV4cG9ydHMgPSBMb2dnZXI7IiwidmFyIHNldHRpbmdzID0ge1xuXHR0b3RhbFBhZ2VCdXR0b25zTnVtYmVyOiA4XG59O1xuXG52YXIgUGFnaW5hdG9yID0ge1xuXHRzZXRTZXR0aW5nczogZnVuY3Rpb24gc2V0U2V0dGluZ3Moc2V0dGluZykge1xuXHRcdGZvciAodmFyIGtleSBpbiBzZXR0aW5nKSB7XG5cdFx0XHRzZXR0aW5nc1trZXldID0gc2V0dGluZ1trZXldO1xuXHRcdH1cblx0fSxcblxuXHRnZXRQYWdlc1JhbmdlOiBmdW5jdGlvbiBnZXRQYWdlc1JhbmdlKGN1cnBhZ2UsIHRvdGFsUGFnZXNPblJlc3VsdFNldCkge1xuXHRcdHZhciBwYWdlUmFuZ2UgPSBbeyBwYWdlbm86IGN1cnBhZ2UsIHJ1bm5pbmdwYWdlOiB0cnVlIH1dO1xuXHRcdHZhciBoYXNuZXh0b25yaWdodCA9IHRydWU7XG5cdFx0dmFyIGhhc25leHRvbmxlZnQgPSB0cnVlO1xuXHRcdHZhciBpID0gMTtcblx0XHR3aGlsZSAocGFnZVJhbmdlLmxlbmd0aCA8IHNldHRpbmdzLnRvdGFsUGFnZUJ1dHRvbnNOdW1iZXIgJiYgKGhhc25leHRvbnJpZ2h0IHx8IGhhc25leHRvbmxlZnQpKSB7XG5cdFx0XHRpZiAoaGFzbmV4dG9ubGVmdCkge1xuXHRcdFx0XHRpZiAoY3VycGFnZSAtIGkgPiAwKSB7XG5cdFx0XHRcdFx0cGFnZVJhbmdlLnB1c2goeyBwYWdlbm86IGN1cnBhZ2UgLSBpLCBydW5uaW5ncGFnZTogZmFsc2UgfSk7XG5cdFx0XHRcdH0gZWxzZSB7XG5cdFx0XHRcdFx0aGFzbmV4dG9ubGVmdCA9IGZhbHNlO1xuXHRcdFx0XHR9XG5cdFx0XHR9XG5cdFx0XHRpZiAoaGFzbmV4dG9ucmlnaHQpIHtcblx0XHRcdFx0aWYgKGN1cnBhZ2UgKyBpIC0gMSA8IHRvdGFsUGFnZXNPblJlc3VsdFNldCkge1xuXHRcdFx0XHRcdHBhZ2VSYW5nZS5wdXNoKHsgcGFnZW5vOiBjdXJwYWdlICsgaSwgcnVubmluZ3BhZ2U6IGZhbHNlIH0pO1xuXHRcdFx0XHR9IGVsc2Uge1xuXHRcdFx0XHRcdGhhc25leHRvbnJpZ2h0ID0gZmFsc2U7XG5cdFx0XHRcdH1cblx0XHRcdH1cblx0XHRcdGkrKztcblx0XHR9XG5cblx0XHR2YXIgaGFzTmV4dCA9IGN1cnBhZ2UgPCB0b3RhbFBhZ2VzT25SZXN1bHRTZXQ7XG5cdFx0dmFyIGhhc1ByZXZpb3VzID0gY3VycGFnZSA+IDE7XG5cblx0XHRyZXR1cm4ge1xuXHRcdFx0YnV0dG9uczogcGFnZVJhbmdlLnNvcnQoZnVuY3Rpb24gKGl0ZW1BLCBpdGVtQikge1xuXHRcdFx0XHRyZXR1cm4gaXRlbUEucGFnZW5vIC0gaXRlbUIucGFnZW5vO1xuXHRcdFx0fSksXG5cdFx0XHRoYXNOZXh0OiBoYXNOZXh0LFxuXHRcdFx0aGFzUHJldmlvdXM6IGhhc1ByZXZpb3VzXG5cdFx0fTtcblx0fVxufTtcblxubW9kdWxlLmV4cG9ydHMgPSBQYWdpbmF0b3I7IiwiJ3VzZSBzdHJpY3QnO1xuXG52YXIgU3RvcmUgPSByZXF1aXJlKCcuL3N0b3JlLmpzJyk7XG52YXIgTG9nZ2VyID0gcmVxdWlyZSgnLi9sb2dnZXIuanMnKTtcblxudmFyIGF2YWlsYWJsZUxpc3RlbmVycyA9IHtcblx0c2VhcmNoS2V5VXA6IHtcblx0XHRpbmZvOiAnTGlzdGVuZXIgb24ga2V5VXAgb2Ygc2VhcmNoIGlucHV0IG9uIHRvcCBiYXInXG5cdH0sXG5cdHNlYXJjaEVudGVyOiB7XG5cdFx0aW5mbzogJ0xpc3RlbmVyIG9uIGVudGVyIGtleSBwcmVzc2VkIG9uIHNlYXJjaCBpbnB1dCBvbiB0b3AgYmFyJ1xuXHR9LFxuXHRzZWFyY2hPbkNoYW5nZToge1xuXHRcdGluZm86ICdMaXN0ZW5lciBvbiBjaGFuZ2Ugb2YgaW5wdXQgdmFsdWUnXG5cdH1cbn07XG5cbnZhciBQdWJTdWIgPSB7XG5cdGdldEF2YWlsYWJsZUxpc3RlbmVyczogZnVuY3Rpb24gZ2V0QXZhaWxhYmxlTGlzdGVuZXJzKCkge1xuXHRcdHJldHVybiBhdmFpbGFibGVMaXN0ZW5lcnM7XG5cdH0sXG5cblx0c3Vic2NyaWJlOiBmdW5jdGlvbiBzdWJzY3JpYmUoZXZlbnR0LCBmdW5jdCkge1xuXHRcdGlmIChldmVudHQgPT09IFwic2VhcmNoS2V5VXBcIikge1xuXHRcdFx0dmFyIGVsID0gZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoU3RvcmUuZ2V0U2VhcmNoSW5wdXRJZCgpKTtcblx0XHRcdGVsLmFkZEV2ZW50TGlzdGVuZXIoJ2tleXVwJywgZnVuY3QpO1xuXHRcdFx0cmV0dXJuIGZ1bmN0aW9uICgpIHtcblx0XHRcdFx0ZWwucmVtb3ZlRXZlbnRMaXN0ZW5lcigna2V5dXAnLCBmdW5jdCwgZmFsc2UpO1xuXHRcdFx0fTtcblx0XHR9IGVsc2UgaWYgKGV2ZW50dCA9PT0gJ3NlYXJjaEVudGVyJykge1xuXHRcdFx0dmFyIGhhbmRsaW5nRnVuY3QgPSBmdW5jdGlvbiBoYW5kbGluZ0Z1bmN0KGUpIHtcblx0XHRcdFx0aWYgKGUua2V5Q29kZSA9PT0gMTMpIHtcblx0XHRcdFx0XHRmdW5jdChlKTtcblx0XHRcdFx0fVxuXHRcdFx0fTtcblx0XHRcdGVsLmFkZEV2ZW50TGlzdGVuZXIoJ2tleWRvd24nLCBoYW5kbGluZ0Z1bmN0KTtcblx0XHRcdHJldHVybiBmdW5jdGlvbiAoKSB7XG5cdFx0XHRcdGVsLnJlbW92ZUV2ZW50TGlzdGVuZXIoJ2tleWRvd24nLCBoYW5kbGluZ0Z1bmN0LCBmYWxzZSk7XG5cdFx0XHR9O1xuXHRcdH0gZWxzZSBpZiAoZXZlbnR0ID09PSAnc2VhcmNoT25DaGFuZ2UnKSB7XG5cdFx0XHR2YXIgZWwgPSBkb2N1bWVudC5nZXRFbGVtZW50QnlJZChTdG9yZS5nZXRTZWFyY2hJbnB1dElkKCkpO1xuXHRcdFx0ZWwuYWRkRXZlbnRMaXN0ZW5lcignY2hhbmdlJywgZnVuY3QpO1xuXHRcdFx0cmV0dXJuIGZ1bmN0aW9uICgpIHtcblx0XHRcdFx0ZWwucmVtb3ZlRXZlbnRMaXN0ZW5lcigna2V5dXAnLCBmdW5jdCwgZmFsc2UpO1xuXHRcdFx0fTtcblx0XHR9IGVsc2Uge1xuXHRcdFx0TG9nZ2VyLmVycm9yKCdUaGUgZXZlbnQgeW91IHRyaWVkIHRvIHN1YnNjcmliZSBpcyBub3QgYXZhaWxhYmxlIGJ5IHRoZSBsaWJyYXJ5Jyk7XG5cdFx0XHRMb2dnZXIubG9nKCdUaGUgYXZhaWxhYmxlIGV2ZW50cyBhcmU6ICcsIGF2YWlsYWJsZUxpc3RlbmVycyk7XG5cdFx0XHRyZXR1cm4gZnVuY3Rpb24gKCkge307XG5cdFx0fVxuXHR9XG59O1xuXG5tb2R1bGUuZXhwb3J0cyA9IFB1YlN1YjsiLCJ2YXIgc3RhdGUgPSB7XG5cdGdlbmVyYWw6IHt9LFxuXHR1c2VyRGF0YToge30sXG5cdGNvbmZpZ3VyYXRpb246IHtcblx0XHRzZXNzaW9uRW5kcG9pbnQ6ICdzZXNzaW9uJ1xuXHR9LFxuXHRodG1sVGVtcGxhdGU6ICcnLFxuXHRhcHBzOiBudWxsLFxuXHR2ZXJzaW9uTnVtYmVyOiAnJyxcblx0ZGV2OiBmYWxzZSxcblx0ZmlsZVBpY2tlcjoge1xuXHRcdHNlbGVjdGVkRmlsZTogbnVsbFxuXHR9LFxuXHRhcHBJbmZvOiBudWxsLFxuXHRzZXNzaW9uRW5kcG9pbnRCeVVzZXI6IGZhbHNlXG59O1xuXG5mdW5jdGlvbiBhc3NlbWJsZShsaXRlcmFsLCBwYXJhbXMpIHtcblx0cmV0dXJuIG5ldyBGdW5jdGlvbihwYXJhbXMsIFwicmV0dXJuIGBcIiArIGxpdGVyYWwgKyBcImA7XCIpO1xufVxuXG52YXIgU3RvcmUgPSB7XG5cdGdldFN0YXRlOiBmdW5jdGlvbiBnZXRTdGF0ZSgpIHtcblx0XHRyZXR1cm4gT2JqZWN0LmFzc2lnbih7fSwgc3RhdGUpO1xuXHR9LFxuXG5cdHNldFdpbmRvd05hbWU6IGZ1bmN0aW9uIHNldFdpbmRvd05hbWUod24pIHtcblx0XHRzdGF0ZS5nZW5lcmFsLndpbmRvd05hbWUgPSB3bjtcblx0fSxcblxuXHRzZXREZXY6IGZ1bmN0aW9uIHNldERldihkZXYpIHtcblx0XHRzdGF0ZS5kZXYgPSBkZXY7XG5cdH0sXG5cblx0Z2V0RGV2VXJsUGFydDogZnVuY3Rpb24gZ2V0RGV2VXJsUGFydCgpIHtcblx0XHRpZiAoc3RhdGUuZGV2KSB7XG5cdFx0XHRyZXR1cm4gXCJzYW5kYm94L1wiO1xuXHRcdH0gZWxzZSB7XG5cdFx0XHRyZXR1cm4gXCJcIjtcblx0XHR9XG5cdH0sXG5cblx0Z2V0RnVsbEJhc2VVcmw6IGZ1bmN0aW9uIGdldEZ1bGxCYXNlVXJsKCkge1xuXHRcdHJldHVybiBzdGF0ZS5jb25maWd1cmF0aW9uLnJvb3RVcmwgKyBzdGF0ZS5jb25maWd1cmF0aW9uLmJhc2VVcmwgKyBTdG9yZS5nZXREZXZVcmxQYXJ0KCk7XG5cdH0sXG5cblx0LypcbiAgY29uZjpcbiAgLSBoZWFkZXJEaXZJZFxuICAtIGluY2x1ZGVBcHBzTWVudVxuICAqL1xuXHRzZXRDb25maWd1cmF0aW9uOiBmdW5jdGlvbiBzZXRDb25maWd1cmF0aW9uKGNvbmYpIHtcblx0XHRmb3IgKHZhciBrZXkgaW4gY29uZikge1xuXHRcdFx0c3RhdGUuY29uZmlndXJhdGlvbltrZXldID0gY29uZltrZXldO1xuXHRcdH1cblx0fSxcblxuXHRzZXRWZXJzaW9uTnVtYmVyOiBmdW5jdGlvbiBzZXRWZXJzaW9uTnVtYmVyKHZlcnNpb24pIHtcblx0XHRzdGF0ZS52ZXJzaW9uTnVtYmVyID0gdmVyc2lvbjtcblx0fSxcblxuXHRnZXRWZXJzaW9uTnVtYmVyOiBmdW5jdGlvbiBnZXRWZXJzaW9uTnVtYmVyKCkge1xuXHRcdHJldHVybiBzdGF0ZS52ZXJzaW9uTnVtYmVyO1xuXHR9LFxuXG5cdGdldEFwcHNWaXNpYmxlOiBmdW5jdGlvbiBnZXRBcHBzVmlzaWJsZSgpIHtcblx0XHRpZiAoc3RhdGUuY29uZmlndXJhdGlvbi5hcHBzVmlzaWJsZSA9PT0gbnVsbCB8fCBzdGF0ZS5jb25maWd1cmF0aW9uLmFwcHNWaXNpYmxlID09PSB1bmRlZmluZWQpIHtcblx0XHRcdHJldHVybiB0cnVlO1xuXHRcdH0gZWxzZSB7XG5cdFx0XHRyZXR1cm4gc3RhdGUuY29uZmlndXJhdGlvbi5hcHBzVmlzaWJsZTtcblx0XHR9XG5cdH0sXG5cblx0c2V0QXBwc1Zpc2libGU6IGZ1bmN0aW9uIHNldEFwcHNWaXNpYmxlKGFwcHNWaXNpYmxlKSB7XG5cdFx0c3RhdGUuY29uZmlndXJhdGlvbi5hcHBzVmlzaWJsZSA9IGFwcHNWaXNpYmxlO1xuXHR9LFxuXG5cdHNldEhUTUxUZW1wbGF0ZTogZnVuY3Rpb24gc2V0SFRNTFRlbXBsYXRlKHRlbXBsYXRlKSB7XG5cdFx0c3RhdGUuaHRtbFRlbXBsYXRlID0gdGVtcGxhdGU7XG5cdH0sXG5cblx0c2V0QXBwczogZnVuY3Rpb24gc2V0QXBwcyhhcHBzKSB7XG5cdFx0c3RhdGUuYXBwcyA9IGFwcHM7XG5cdH0sXG5cblx0c2V0QXBwSW5mbzogZnVuY3Rpb24gc2V0QXBwSW5mbyhhcHBJbmZvKSB7XG5cdFx0c3RhdGUuYXBwSW5mbyA9IGFwcEluZm87XG5cdH0sXG5cblx0Z2V0QXBwSW5mbzogZnVuY3Rpb24gZ2V0QXBwSW5mbygpIHtcblx0XHRyZXR1cm4gc3RhdGUuYXBwSW5mbztcblx0fSxcblxuXHRnZXRMb2dpblVybDogZnVuY3Rpb24gZ2V0TG9naW5VcmwoKSB7XG5cdFx0cmV0dXJuIHN0YXRlLmNvbmZpZ3VyYXRpb24ucm9vdFVybCArIHN0YXRlLmNvbmZpZ3VyYXRpb24ubG9naW5VcmwgKyBcIj9cIiArIHN0YXRlLmNvbmZpZ3VyYXRpb24ucmVkaXJlY3RVcmxQYXJhbSArIFwiPVwiICsgd2luZG93LmxvY2F0aW9uLmhyZWY7XG5cdH0sXG5cblx0Z2V0QXV0aGVudGljYXRpb25FbmRwb2ludDogZnVuY3Rpb24gZ2V0QXV0aGVudGljYXRpb25FbmRwb2ludCgpIHtcblx0XHRpZiAoc3RhdGUuc2Vzc2lvbkVuZHBvaW50QnlVc2VyKSB7XG5cdFx0XHRyZXR1cm4gc3RhdGUucm9vdFVybCArIHN0YXRlLmNvbmZpZ3VyYXRpb24uc2Vzc2lvbkVuZHBvaW50O1xuXHRcdH1cblx0XHRyZXR1cm4gU3RvcmUuZ2V0RnVsbEJhc2VVcmwoKSArIHN0YXRlLmNvbmZpZ3VyYXRpb24uc2Vzc2lvbkVuZHBvaW50O1xuXHR9LFxuXG5cdGdldFN3aXRjaEFjY291bnRFbmRwb2ludDogZnVuY3Rpb24gZ2V0U3dpdGNoQWNjb3VudEVuZHBvaW50KGFjY291bnRJZCkge1xuXHRcdHJldHVybiBTdG9yZS5nZXRGdWxsQmFzZVVybCgpICsgJ2FjY291bnRzL3N3aXRjaC8nICsgYWNjb3VudElkO1xuXHR9LFxuXG5cdGdldEFwcHNFbmRwb2ludDogZnVuY3Rpb24gZ2V0QXBwc0VuZHBvaW50KCkge1xuXHRcdHJldHVybiBTdG9yZS5nZXRGdWxsQmFzZVVybCgpICsgJ2FwcHMnO1xuXHR9LFxuXG5cdGdldENsb3VkaW5hcnlFbmRwb2ludDogZnVuY3Rpb24gZ2V0Q2xvdWRpbmFyeUVuZHBvaW50KCkge1xuXHRcdHJldHVybiBTdG9yZS5nZXRGdWxsQmFzZVVybCgpICsgJ2Fzc2V0cyc7XG5cdH0sXG5cblx0bG9nc0VuYWJsZWQ6IGZ1bmN0aW9uIGxvZ3NFbmFibGVkKCkge1xuXHRcdHJldHVybiBzdGF0ZS5jb25maWd1cmF0aW9uLmxvZ3M7XG5cdH0sXG5cblx0Z2V0U2VhcmNoSW5wdXRJZDogZnVuY3Rpb24gZ2V0U2VhcmNoSW5wdXRJZCgpIHtcblx0XHRyZXR1cm4gc3RhdGUuY29uZmlndXJhdGlvbi5zZWFyY2hJbnB1dElkO1xuXHR9LFxuXG5cdHNldEhUTUxDb250YWluZXI6IGZ1bmN0aW9uIHNldEhUTUxDb250YWluZXIoaWQpIHtcblx0XHRzdGF0ZS5jb25maWd1cmF0aW9uLmhlYWRlckRpdklkID0gaWQ7XG5cdH0sXG5cblx0Z2V0SFRMTUNvbnRhaW5lcjogZnVuY3Rpb24gZ2V0SFRMTUNvbnRhaW5lcigpIHtcblx0XHRpZiAoc3RhdGUuY29uZmlndXJhdGlvbi5oZWFkZXJEaXZJZCkge1xuXHRcdFx0cmV0dXJuIHN0YXRlLmNvbmZpZ3VyYXRpb24uaGVhZGVyRGl2SWQ7XG5cdFx0fSBlbHNlIHtcblx0XHRcdHJldHVybiBcInBwc2RrLWNvbnRhaW5lclwiO1xuXHRcdH1cblx0fSxcblxuXHRnZXRIVE1MOiBmdW5jdGlvbiBnZXRIVE1MKCkge1xuXHRcdHJldHVybiBzdGF0ZS5odG1sVGVtcGxhdGU7XG5cdH0sXG5cblx0c2V0U2Vzc2lvbkVuZHBvaW50OiBmdW5jdGlvbiBzZXRTZXNzaW9uRW5kcG9pbnQoc2Vzc2lvbkVuZHBvaW50KSB7XG5cdFx0aWYgKHNlc3Npb25FbmRwb2ludC5pbmRleE9mKCcvJykgPT09IDApIHtcblx0XHRcdHNlc3Npb25FbmRwb2ludCA9IHNlc3Npb25FbmRwb2ludC5zdWJzdHJpbmcoMSwgc2Vzc2lvbkVuZHBvaW50Lmxlbmd0aCAtIDEpO1xuXHRcdH1cblx0XHRzdGF0ZS5zZXNzaW9uRW5kcG9pbnRCeVVzZXIgPSB0cnVlO1xuXHRcdHN0YXRlLmNvbmZpZ3VyYXRpb24uc2Vzc2lvbkVuZHBvaW50ID0gc2Vzc2lvbkVuZHBvaW50O1xuXHR9LFxuXG5cdGdldFdpbmRvd05hbWU6IGZ1bmN0aW9uIGdldFdpbmRvd05hbWUoKSB7XG5cdFx0cmV0dXJuIHN0YXRlLmdlbmVyYWwud2luZG93TmFtZTtcblx0fSxcblxuXHRzZXRVc2VyRGF0YTogZnVuY3Rpb24gc2V0VXNlckRhdGEodXNlckRhdGEpIHtcblx0XHRzdGF0ZS51c2VyRGF0YSA9IHVzZXJEYXRhO1xuXHR9LFxuXG5cdGdldFVzZXJEYXRhOiBmdW5jdGlvbiBnZXRVc2VyRGF0YSgpIHtcblx0XHRyZXR1cm4gc3RhdGUudXNlckRhdGE7XG5cdH0sXG5cblx0c2V0Um9vdFVybDogZnVuY3Rpb24gc2V0Um9vdFVybChyb290VXJsKSB7XG5cdFx0c3RhdGUuY29uZmlndXJhdGlvbi5yb290VXJsID0gcm9vdFVybC5yZXBsYWNlKC9cXC8/JC8sICcvJyk7O1xuXHR9LFxuXG5cdGdldFJvb3RVcmw6IGZ1bmN0aW9uIGdldFJvb3RVcmwoKSB7XG5cdFx0cmV0dXJuIHN0YXRlLmNvbmZpZ3VyYXRpb24ucm9vdFVybDtcblx0fSxcblxuXHRnZXRBdmF0YXJVcGxvYWRVcmw6IGZ1bmN0aW9uIGdldEF2YXRhclVwbG9hZFVybCgpIHtcblx0XHRyZXR1cm4gU3RvcmUuZ2V0RnVsbEJhc2VVcmwoKSArICdhc3NldHMvdXBsb2FkJztcblx0fSxcblxuXHRnZXRBdmF0YXJVcGRhdGVVcmw6IGZ1bmN0aW9uIGdldEF2YXRhclVwZGF0ZVVybCgpIHtcblx0XHRyZXR1cm4gU3RvcmUuZ2V0RnVsbEJhc2VVcmwoKSArICd1c2Vycy9hdmF0YXInO1xuXHR9XG59O1xuXG5tb2R1bGUuZXhwb3J0cyA9IFN0b3JlOyJdfQ==
