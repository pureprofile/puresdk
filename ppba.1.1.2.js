(function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);var f=new Error("Cannot find module '"+o+"'");throw f.code="MODULE_NOT_FOUND",f}var l=n[o]={exports:{}};t[o][0].call(l.exports,function(e){var n=t[o][1][e];return s(n?n:e)},l,l.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){
var Logger = require('./modules/logger');
var PubSub = require('./modules/pubsub');
var Caller = require('./modules/caller');
var Store = require('./modules/store');
var Dom = require('./modules/dom');
var ppbaConf = {};

var afterRender = function afterRender() {
	document.getElementById('--puresdk-apps-icon--').addEventListener('click', function (e) {
		e.stopPropagation();
		Dom.toggleClass(document.getElementById('--puresdk-apps-container--'), 'active');
	});

	document.getElementById('--puresdk-user-avatar--').addEventListener('click', function (e) {
		e.stopPropagation();
		Dom.removeClass(document.getElementById('--puresdk-apps-container--'), 'active');
		Dom.toggleClass(document.getElementById('--puresdk-user-sidebar--'), 'active');
	});

	window.addEventListener('click', function (e) {
		Dom.removeClass(document.getElementById('--puresdk-apps-container--'), 'active');
		Dom.removeClass(document.getElementById('--puresdk-user-sidebar--'), 'active');
	});
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

	init: function init(conf) {
		Logger.log('initializing with conf: ', conf);
		if (conf) {
			if (conf.headerDivId) {
				Store.setHTMLContainer(conf.headerDivId);
			}
			if (conf.appsVisible !== null) {
				Store.setAppsVisible(conf.appsVisible);
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
					window.location = Store.getLoginUrl();
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
					PPBA.renderApps(result.apps);
				},
				fail: function fail(err) {
					window.location = Store.getLoginUrl();
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
					window.location = '/apps';
				},
				fail: function fail(err) {
					alert('Sorry, something went wrong with your request. Plese try again');
				}
			}
		});
	},

	renderApps: function renderApps(apps) {
		var appTemplate = function appTemplate(app) {
			return '\n\t\t\t\t<a href="#" style="background: #' + app.color + '"><i class="' + app.icon + '"></i></a>\n\t\t\t\t<span class="bac--app-name">' + app.name + '</span>\n\t\t\t\t<span class="bac--app-description">' + app.descr + '</span>\n\t\t\t';
		};

		var _loop = function _loop(i) {
			var app = apps[i];
			var div = document.createElement("div");
			div.className = "bac--apps";
			div.innerHTML = appTemplate(app);
			div.onclick = function (e) {
				e.preventDefault();
				window.location = app.application_url;
			};
			document.getElementById("--puresdk-apps-container--").appendChild(div);
		};

		for (var i = 0; i < apps.length; i++) {
			_loop(i);
		}
	},

	renderUser: function renderUser(user) {
		var userTemplate = function userTemplate(user) {
			return '\n\t\t\t\t<div class="bac--user-image"><i class="fa fa-camera"></i></div>\n\t\t\t\t<div class="bac--user-name">' + user.firstname + ' ' + user.lastname + '</div>\n\t\t\t\t<div class="bac--user-email">' + user.email + '</div>\n\t\t\t';
		};
		var div = document.createElement('div');
		div.className = "bac--user-sidebar-info";
		div.innerHTML = userTemplate(user);
		document.getElementById('--puresdk-user-details--').appendChild(div);
		document.getElementById('--puresdk-user-avatar--').innerHTML = user.firstname.charAt(0) + user.lastname.charAt(0);
	},

	renderAccounts: function renderAccounts(accounts) {
		var accountsTemplate = function accountsTemplate(account) {
			return '\n\t\t\t\t<img src="' + account.sdk_square_logo_icon + '" alt="">\n\t\t\t\t<div class="bac-user-app-details">\n\t\t\t\t\t <span>' + account.name + '</span>\n\t\t\t\t\t <span>15 team members</span>\n\t\t\t\t</div>\n\t\t\t';
		};

		var _loop2 = function _loop2(i) {
			var account = accounts[i];
			var div = document.createElement('div');
			div.className = 'bac--user-list-item';
			div.innerHTML = accountsTemplate(account);
			div.onclick = function (e) {
				e.preventDefault();
				PPBA.changeAccount(account.sfid);
			};
			document.getElementById('--puresdk-user-businesses--').appendChild(div);
		};

		for (var i = 0; i < accounts.length; i++) {
			_loop2(i);
		}
	},

	styleAccount: function styleAccount(account) {
		var logo = document.createElement('img');
		logo.src = account.sdk_logo_icon;
		document.getElementById('--puresdk-account-logo--').appendChild(logo);
		document.getElementById('--puresdk-bac--header-apps--').style.cssText = "background: #" + account.sdk_background_color + "; color: #" + account.sdk_font_color;
		document.getElementById('--puresdk-user-sidebar--').style.cssText = "background: #" + account.sdk_background_color + "; color: #" + account.sdk_font_color;
		// document.getElementById('--puresdk--search--input--').style.cssText = "background: #" + account.sdk_search_background_color
		//   + "; color: #" + account.sdk_search_font_color;
	},

	render: function render() {
		var whereTo = document.getElementById(Store.getHTLMContainer());
		if (whereTo === null) {
			Logger.error('the container with id "' + whereTo + '" has not been found on the document. The library is going to create it.');
			var div = document.createElement('div');
			div.id = Store.getHTLMContainer();
			div.style.width = '100%';
			div.style.height = '50px';
			document.body.insertBefore(div, document.body.firstChild);
			whereTo = document.getElementById(Store.getHTLMContainer());
		}
		whereTo.innerHTML = Store.getHTML();
		PPBA.styleAccount(Store.getUserData().user.account);
		PPBA.renderUser(Store.getUserData().user);
		PPBA.renderAccounts(Store.getUserData().user.accounts);
		if (Store.getAppsVisible() === false) {
			document.getElementById('--puresdk-apps-section--').style.cssText = "display:none";
		}
		afterRender();
	}
};

module.exports = PPBA;
},{"./modules/caller":3,"./modules/dom":4,"./modules/logger":5,"./modules/pubsub":6,"./modules/store":7}],2:[function(require,module,exports){
'use strict';

/*!
 * PureProfile PureProfile Business Apps Development SDK
 *
 * version: 1.1.2
 * date: 2017-04-24
 *
 * Copyright 2017, PureProfile
 * Released under MIT license
 * https://opensource.org/licenses/MIT
 */

var ppba = require('./PPBA');
ppba.setWindowName('PURESDK');
ppba.setConfiguration({
    "logs": true,
    "baseUrl": "/api/v1/",
    "loginUrl": "/api/v1/oauth2",
    "searchInputId": "--puresdk--search--input--",
    "redirectUrlParam": "redirect_url"
});
ppba.setHTMLTemplate('<header class="bac--header-apps" id="--puresdk-bac--header-apps--">\n    <div class="bac--container">\n        <div class="bac--logo" id="--puresdk-account-logo--"></div>\n        <div class="bac--user-actions">\n            <div class="bac--user-apps" id="--puresdk-apps-section--">\n                <i class="fa fa-squares" id="--puresdk-apps-icon--"></i>\n\n                <div class="bac--apps-container" id="--puresdk-apps-container--">\n                    <div class="bac--apps-arrow"></div>\n                </div>\n            </div>\n            <!--<div class="bac&#45;&#45;user-notifications">-->\n                <!--<div class="bac&#45;&#45;user-notifications-count">1</div>-->\n                <!--<i class="fa fa-bell-o"></i>-->\n            <!--</div>-->\n            <div class="bac--user-avatar">\n                <span class="bac--user-avatar-name" id="--puresdk-user-avatar--"></span>\n            </div>\n        </div>\n    </div>\n</header>\n<div class="bac--user-sidebar" id="--puresdk-user-sidebar--">\n    <div id="--puresdk-user-details--"></div>\n    <!--<div class="bac&#45;&#45;user-sidebar-info">-->\n        <!--<div class="bac&#45;&#45;user-image"><i class="fa fa-camera"></i></div>-->\n        <!--<div class="bac&#45;&#45;user-name">Curtis Bartlett</div>-->\n        <!--<div class="bac&#45;&#45;user-email">cbartlett@pureprofile.com</div>-->\n    <!--</div>-->\n    <div class="bac--user-apps" id="--puresdk-user-businesses--">\n        <!--<div class="bac&#45;&#45;user-list-item">-->\n            <!--<img src="http://lorempixel.com/40/40" alt="">-->\n            <!--<div class="bac-user-app-details">-->\n                <!--<span></span>-->\n                <!--<span>15 team members</span>-->\n            <!--</div>-->\n        <!--</div>-->\n    </div>\n    <div class="bac--user-account-settings">\n        <div class="bac-user-acount-list-item">\n            <i class="fa fa-cog-line"></i>\n            <a href="#">Acount Security</a>\n        </div>\n        <div class="bac-user-acount-list-item">\n            <i class="fa fa-lock-line"></i>\n            <a href="#">Acount Security</a>\n        </div>\n        <div class="bac-user-acount-list-item">\n            <i class="fa fa-login-line"></i>\n            <a href="/api/v1/sign-off">Log out</a>\n        </div>\n    </div>\n</div>');

window.PURESDK = ppba;

var css = 'html,body,div,span,applet,object,iframe,h1,h2,h3,h4,h5,h6,p,blockquote,pre,a,abbr,acronym,address,big,cite,code,del,dfn,em,img,ins,kbd,q,s,samp,small,strike,strong,sub,sup,tt,var,b,u,i,center,dl,dt,dd,ol,ul,li,fieldset,form,label,legend,table,caption,tbody,tfoot,thead,tr,th,td,article,aside,canvas,details,embed,figure,figcaption,footer,header,hgroup,menu,nav,output,ruby,section,summary,time,mark,audio,video{margin:0;padding:0;border:0;font-size:100%;font:inherit;vertical-align:baseline}article,aside,details,figcaption,figure,footer,header,hgroup,menu,nav,section{display:block}body{line-height:1}ol,ul{list-style:none}blockquote,q{quotes:none}blockquote:before,blockquote:after,q:before,q:after{content:"";content:none}table{border-collapse:collapse;border-spacing:0}body{overflow-x:hidden}#bac-wrapper{font-family:"Verdana", arial, sans-serif;color:white;min-height:100vh;position:relative}.bac--container{max-width:1160px;margin:0 auto}.bac--header-apps{position:absolute;width:100%;height:50px;background-color:#475369;padding:5px 0;z-index:9999999}.bac--header-apps .bac--container{height:100%;display:flex;align-items:center;justify-content:space-between}.bac--header-search{position:relative}.bac--header-search input{color:#fff;font-size:14px;height:35px;background-color:#6b7586;padding:0 5px 0 10px;border:none;border-radius:3px;min-width:400px;width:100%}.bac--header-search input:focus{outline:none}.bac--header-search input::-webkit-input-placeholder{font-style:normal !important;text-align:center;color:#fff;font-size:14px;font-weight:300;letter-spacing:0.5px}.bac--header-search input::-moz-placeholder{font-style:normal !important;text-align:center;color:#fff;font-size:14px;font-weight:300;letter-spacing:0.5px}.bac--header-search input:-ms-input-placeholder{font-style:normal !important;text-align:center;color:#fff;font-size:14px;font-weight:300;letter-spacing:0.5px}.bac--header-search i{position:absolute;top:8px;right:10px}.bac--user-actions{display:flex;align-items:center}.bac--user-actions>div{cursor:pointer;color:white}.bac--user-actions .bac--user-notifications{position:relative}.bac--user-actions .bac--user-notifications i{font-size:20px}.bac--user-actions .bac--user-notifications-count{position:absolute;display:inline-block;height:15px;width:15px;line-height:15px;color:#fff;font-size:10px;text-align:center;background-color:#fc3b30;border-radius:50%;top:-5px;left:-5px}.bac--user-actions .bac--user-avatar,.bac--user-actions .bac--user-notifications{margin-left:20px}.bac--user-actions .bac--user-avatar-name{color:#fff;background-color:#adadad;border-radius:50%;display:inline-block;height:30px;width:30px;line-height:30px;text-align:center;font-size:14px}.bac--user-apps{position:relative}.bac--apps-container{background:#fff;position:absolute;top:45px;right:-40px;display:flex;width:360px;flex-wrap:wrap;border-radius:10px;padding:30px;justify-content:space-between;text-align:center;-webkit-box-shadow:0 0 10px 2px rgba(0,0,0,0.2);box-shadow:0 0 10px 2px rgba(0,0,0,0.2);opacity:0;visibility:hidden;transition:all 0.4s ease}.bac--apps-container.active{opacity:1;visibility:visible}.bac--apps-container .bac--apps-arrow{position:absolute;display:block;height:20px;width:20px;top:-10px;right:36px;background:#fff;transform:rotate(-45deg);z-index:1}.bac--apps-container .bac--apps{width:32%;display:flex;font-size:30px;margin-bottom:40px;text-align:center;justify-content:center;flex-wrap:wrap}.bac--apps-container .bac--apps a{display:block;color:#fff;text-decoration:none;width:65px;height:65px;line-height:65px;text-align:center;border-radius:10px;-webkit-box-shadow:0 0 5px 0 rgba(0,0,0,0.2);box-shadow:0 0 5px 0 rgba(0,0,0,0.2)}.bac--apps-container .bac--apps .bac--app-name{width:100%;color:#000;font-size:18px;padding:10px 0}.bac--apps-container .bac--apps .bac--app-description{color:#919191;font-size:12px;font-style:italic}.bac--user-sidebar{font-family:"Verdana", arial, sans-serif;color:white;background-color:#515f77;box-sizing:border-box;width:320px;height:100%;position:absolute;top:0;right:0;z-index:999999;padding-top:10px;opacity:0;margin-top:50px;transform:translateX(100%);transition:all 0.4s ease}.bac--user-sidebar.active{opacity:1;transform:translateX(0%)}.bac--user-sidebar .bac--user-list-item{display:flex;cursor:pointer;align-items:center;padding:10px 10px 10px 40px;border-bottom:2px solid #6b7586}.bac--user-sidebar .bac--user-list-item:hover{background-color:#6b7586}.bac--user-sidebar .bac--user-list-item img{margin-right:20px;border:2px solid #fff}.bac--user-sidebar .bac--user-list-item span{width:100%;display:block;margin-bottom:5px}.bac--user-sidebar .bac-user-app-details span{font-size:12px}.bac--user-sidebar-info{display:flex;justify-content:center;flex-wrap:wrap;text-align:center;padding:10px 20px 15px}.bac--user-sidebar-info .bac--user-image{display:inline-block;height:80px;width:80px;line-height:80px;text-align:center;color:#fff;border-radius:50%;background-color:#adadad;margin-bottom:15px}.bac--user-sidebar-info .bac--user-image i{font-size:32px}.bac--user-sidebar-info .bac--user-name{width:100%;text-align:center;font-size:18px;margin-bottom:10px}.bac--user-sidebar-info .bac--user-email{font-size:12px;font-weight:300}.bac--user-account-settings{padding:50px}.bac--user-account-settings .bac-user-acount-list-item{display:flex;align-items:center;margin-bottom:30px}.bac--user-account-settings .bac-user-acount-list-item a{text-decoration:none;color:#fff}.bac--user-account-settings .bac-user-acount-list-item i{font-size:24px;margin-right:20px}',
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
},{"./PPBA":1}],3:[function(require,module,exports){
var Store = require('./store.js');
var Logger = require('./logger');

var Caller = {
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
		xhr.open(attrs.type, endpointUrl);
		//xhr.withCredentials = true;
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
			xhr.open(attrs.type, attrs.endpoint);
			xhr.setRequestHeader('Content-Type', 'application/json');
			xhr.onload = function () {
				if (this.status >= 200 && this.status < 300) {
					attrs.middlewares.success(JSON.parse(xhr.responseText));
					resolve(JSON.parse(xhr.responseText));
				} else {
					window.location = Store.getLoginUrl();
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
},{"./logger":5,"./store.js":7}],4:[function(require,module,exports){
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
},{}],5:[function(require,module,exports){
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
},{"./store.js":7}],6:[function(require,module,exports){
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
},{"./logger.js":5,"./store.js":7}],7:[function(require,module,exports){
var state = {
	general: {},
	userData: {},
	configuration: {},
	htmlTemplate: "",
	apps: null
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

	/*
  conf:
  - headerDivId
  - includeAppsMenu
  */
	setConfiguration: function setConfiguration(conf) {
		state.configuration = conf;
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

	getLoginUrl: function getLoginUrl() {
		return state.configuration.loginUrl + "?" + state.configuration.redirectUrlParam + "=" + window.location.href;
	},

	getAuthenticationEndpoint: function getAuthenticationEndpoint() {
		return state.configuration.baseUrl + 'session';
	},

	getSwitchAccountEndpoint: function getSwitchAccountEndpoint(accountId) {
		return state.configuration.baseUrl + 'accounts/switch/' + accountId;
	},

	getAppsEndpoint: function getAppsEndpoint() {
		return state.configuration.baseUrl + 'apps';
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

	getWindowName: function getWindowName() {
		return state.general.windowName;
	},

	setUserData: function setUserData(userData) {
		state.userData = userData;
	},

	getUserData: function getUserData() {
		return state.userData;
	}
};

module.exports = Store;
},{}]},{},[2])
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uLy4uL25vZGVfbW9kdWxlcy9icm93c2VyLXBhY2svX3ByZWx1ZGUuanMiLCJQUEJBLmpzIiwiaW5kZXguanMiLCJtb2R1bGVzL2NhbGxlci5qcyIsIm1vZHVsZXMvZG9tLmpzIiwibW9kdWxlcy9sb2dnZXIuanMiLCJtb2R1bGVzL3B1YnN1Yi5qcyIsIm1vZHVsZXMvc3RvcmUuanMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7QUNBQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUM5TkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQzVDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3ZEQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3RCQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNyQkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3JEQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBIiwiZmlsZSI6ImdlbmVyYXRlZC5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzQ29udGVudCI6WyIoZnVuY3Rpb24gZSh0LG4scil7ZnVuY3Rpb24gcyhvLHUpe2lmKCFuW29dKXtpZighdFtvXSl7dmFyIGE9dHlwZW9mIHJlcXVpcmU9PVwiZnVuY3Rpb25cIiYmcmVxdWlyZTtpZighdSYmYSlyZXR1cm4gYShvLCEwKTtpZihpKXJldHVybiBpKG8sITApO3ZhciBmPW5ldyBFcnJvcihcIkNhbm5vdCBmaW5kIG1vZHVsZSAnXCIrbytcIidcIik7dGhyb3cgZi5jb2RlPVwiTU9EVUxFX05PVF9GT1VORFwiLGZ9dmFyIGw9bltvXT17ZXhwb3J0czp7fX07dFtvXVswXS5jYWxsKGwuZXhwb3J0cyxmdW5jdGlvbihlKXt2YXIgbj10W29dWzFdW2VdO3JldHVybiBzKG4/bjplKX0sbCxsLmV4cG9ydHMsZSx0LG4scil9cmV0dXJuIG5bb10uZXhwb3J0c312YXIgaT10eXBlb2YgcmVxdWlyZT09XCJmdW5jdGlvblwiJiZyZXF1aXJlO2Zvcih2YXIgbz0wO288ci5sZW5ndGg7bysrKXMocltvXSk7cmV0dXJuIHN9KSIsInZhciBMb2dnZXIgPSByZXF1aXJlKCcuL21vZHVsZXMvbG9nZ2VyJyk7XG52YXIgUHViU3ViID0gcmVxdWlyZSgnLi9tb2R1bGVzL3B1YnN1YicpO1xudmFyIENhbGxlciA9IHJlcXVpcmUoJy4vbW9kdWxlcy9jYWxsZXInKTtcbnZhciBTdG9yZSA9IHJlcXVpcmUoJy4vbW9kdWxlcy9zdG9yZScpO1xudmFyIERvbSA9IHJlcXVpcmUoJy4vbW9kdWxlcy9kb20nKTtcbnZhciBwcGJhQ29uZiA9IHt9O1xuXG52YXIgYWZ0ZXJSZW5kZXIgPSBmdW5jdGlvbiBhZnRlclJlbmRlcigpIHtcblx0ZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoJy0tcHVyZXNkay1hcHBzLWljb24tLScpLmFkZEV2ZW50TGlzdGVuZXIoJ2NsaWNrJywgZnVuY3Rpb24gKGUpIHtcblx0XHRlLnN0b3BQcm9wYWdhdGlvbigpO1xuXHRcdERvbS50b2dnbGVDbGFzcyhkb2N1bWVudC5nZXRFbGVtZW50QnlJZCgnLS1wdXJlc2RrLWFwcHMtY29udGFpbmVyLS0nKSwgJ2FjdGl2ZScpO1xuXHR9KTtcblxuXHRkb2N1bWVudC5nZXRFbGVtZW50QnlJZCgnLS1wdXJlc2RrLXVzZXItYXZhdGFyLS0nKS5hZGRFdmVudExpc3RlbmVyKCdjbGljaycsIGZ1bmN0aW9uIChlKSB7XG5cdFx0ZS5zdG9wUHJvcGFnYXRpb24oKTtcblx0XHREb20ucmVtb3ZlQ2xhc3MoZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoJy0tcHVyZXNkay1hcHBzLWNvbnRhaW5lci0tJyksICdhY3RpdmUnKTtcblx0XHREb20udG9nZ2xlQ2xhc3MoZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoJy0tcHVyZXNkay11c2VyLXNpZGViYXItLScpLCAnYWN0aXZlJyk7XG5cdH0pO1xuXG5cdHdpbmRvdy5hZGRFdmVudExpc3RlbmVyKCdjbGljaycsIGZ1bmN0aW9uIChlKSB7XG5cdFx0RG9tLnJlbW92ZUNsYXNzKGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKCctLXB1cmVzZGstYXBwcy1jb250YWluZXItLScpLCAnYWN0aXZlJyk7XG5cdFx0RG9tLnJlbW92ZUNsYXNzKGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKCctLXB1cmVzZGstdXNlci1zaWRlYmFyLS0nKSwgJ2FjdGl2ZScpO1xuXHR9KTtcbn07XG5cbnZhciBQUEJBID0ge1xuXHRzZXRXaW5kb3dOYW1lOiBmdW5jdGlvbiBzZXRXaW5kb3dOYW1lKHduKSB7XG5cdFx0U3RvcmUuc2V0V2luZG93TmFtZSh3bik7XG5cdH0sXG5cblx0c2V0Q29uZmlndXJhdGlvbjogZnVuY3Rpb24gc2V0Q29uZmlndXJhdGlvbihjb25mKSB7XG5cdFx0U3RvcmUuc2V0Q29uZmlndXJhdGlvbihjb25mKTtcblx0fSxcblxuXHRzZXRIVE1MVGVtcGxhdGU6IGZ1bmN0aW9uIHNldEhUTUxUZW1wbGF0ZSh0ZW1wbGF0ZSkge1xuXHRcdFN0b3JlLnNldEhUTUxUZW1wbGF0ZSh0ZW1wbGF0ZSk7XG5cdH0sXG5cblx0aW5pdDogZnVuY3Rpb24gaW5pdChjb25mKSB7XG5cdFx0TG9nZ2VyLmxvZygnaW5pdGlhbGl6aW5nIHdpdGggY29uZjogJywgY29uZik7XG5cdFx0aWYgKGNvbmYpIHtcblx0XHRcdGlmIChjb25mLmhlYWRlckRpdklkKSB7XG5cdFx0XHRcdFN0b3JlLnNldEhUTUxDb250YWluZXIoY29uZi5oZWFkZXJEaXZJZCk7XG5cdFx0XHR9XG5cdFx0XHRpZiAoY29uZi5hcHBzVmlzaWJsZSAhPT0gbnVsbCkge1xuXHRcdFx0XHRTdG9yZS5zZXRBcHBzVmlzaWJsZShjb25mLmFwcHNWaXNpYmxlKTtcblx0XHRcdH1cblx0XHR9XG5cdFx0cHBiYUNvbmYgPSBjb25mO1xuXHRcdHJldHVybiB0cnVlO1xuXHR9LFxuXG5cdGF1dGhlbnRpY2F0ZTogZnVuY3Rpb24gYXV0aGVudGljYXRlKF9zdWNjZXNzKSB7XG5cdFx0dmFyIHNlbGYgPSBQUEJBO1xuXHRcdENhbGxlci5tYWtlQ2FsbCh7XG5cdFx0XHR0eXBlOiAnR0VUJyxcblx0XHRcdGVuZHBvaW50OiBTdG9yZS5nZXRBdXRoZW50aWNhdGlvbkVuZHBvaW50KCksXG5cdFx0XHRjYWxsYmFja3M6IHtcblx0XHRcdFx0c3VjY2VzczogZnVuY3Rpb24gc3VjY2VzcyhyZXN1bHQpIHtcblx0XHRcdFx0XHRMb2dnZXIubG9nKHJlc3VsdCk7XG5cdFx0XHRcdFx0U3RvcmUuc2V0VXNlckRhdGEocmVzdWx0KTtcblx0XHRcdFx0XHRzZWxmLnJlbmRlcigpO1xuXHRcdFx0XHRcdFBQQkEuZ2V0QXBwcygpO1xuXHRcdFx0XHRcdF9zdWNjZXNzKHJlc3VsdCk7XG5cdFx0XHRcdH0sXG5cdFx0XHRcdGZhaWw6IGZ1bmN0aW9uIGZhaWwoZXJyKSB7XG5cdFx0XHRcdFx0d2luZG93LmxvY2F0aW9uID0gU3RvcmUuZ2V0TG9naW5VcmwoKTtcblx0XHRcdFx0fVxuXHRcdFx0fVxuXHRcdH0pO1xuXHR9LFxuXG5cdGF1dGhlbnRpY2F0ZVByb21pc2U6IGZ1bmN0aW9uIGF1dGhlbnRpY2F0ZVByb21pc2UoKSB7XG5cdFx0dmFyIHNlbGYgPSBQUEJBO1xuXHRcdHJldHVybiBDYWxsZXIucHJvbWlzZUNhbGwoe1xuXHRcdFx0dHlwZTogJ0dFVCcsXG5cdFx0XHRlbmRwb2ludDogU3RvcmUuZ2V0QXV0aGVudGljYXRpb25FbmRwb2ludCgpLFxuXHRcdFx0bWlkZGxld2FyZXM6IHtcblx0XHRcdFx0c3VjY2VzczogZnVuY3Rpb24gc3VjY2VzcyhyZXN1bHQpIHtcblx0XHRcdFx0XHRMb2dnZXIubG9nKHJlc3VsdCk7XG5cdFx0XHRcdFx0U3RvcmUuc2V0VXNlckRhdGEocmVzdWx0KTtcblx0XHRcdFx0XHRzZWxmLnJlbmRlcigpO1xuXHRcdFx0XHRcdFBQQkEuZ2V0QXBwcygpO1xuXHRcdFx0XHR9XG5cdFx0XHR9XG5cdFx0fSk7XG5cdH0sXG5cblx0Z2V0QXBwczogZnVuY3Rpb24gZ2V0QXBwcygpIHtcblx0XHRDYWxsZXIubWFrZUNhbGwoe1xuXHRcdFx0dHlwZTogJ0dFVCcsXG5cdFx0XHRlbmRwb2ludDogU3RvcmUuZ2V0QXBwc0VuZHBvaW50KCksXG5cdFx0XHRjYWxsYmFja3M6IHtcblx0XHRcdFx0c3VjY2VzczogZnVuY3Rpb24gc3VjY2VzcyhyZXN1bHQpIHtcblx0XHRcdFx0XHRTdG9yZS5zZXRBcHBzKHJlc3VsdCk7XG5cdFx0XHRcdFx0UFBCQS5yZW5kZXJBcHBzKHJlc3VsdC5hcHBzKTtcblx0XHRcdFx0fSxcblx0XHRcdFx0ZmFpbDogZnVuY3Rpb24gZmFpbChlcnIpIHtcblx0XHRcdFx0XHR3aW5kb3cubG9jYXRpb24gPSBTdG9yZS5nZXRMb2dpblVybCgpO1xuXHRcdFx0XHR9XG5cdFx0XHR9XG5cdFx0fSk7XG5cdH0sXG5cblx0Z2V0QXZhaWxhYmxlTGlzdGVuZXJzOiBmdW5jdGlvbiBnZXRBdmFpbGFibGVMaXN0ZW5lcnMoKSB7XG5cdFx0cmV0dXJuIFB1YlN1Yi5nZXRBdmFpbGFibGVMaXN0ZW5lcnMoKTtcblx0fSxcblxuXHRzdWJzY3JpYmVMaXN0ZW5lcjogZnVuY3Rpb24gc3Vic2NyaWJlTGlzdGVuZXIoZXZlbnR0LCBmdW5jdCkge1xuXHRcdHJldHVybiBQdWJTdWIuc3Vic2NyaWJlKGV2ZW50dCwgZnVuY3QpO1xuXHR9LFxuXG5cdGdldFVzZXJEYXRhOiBmdW5jdGlvbiBnZXRVc2VyRGF0YSgpIHtcblx0XHRyZXR1cm4gU3RvcmUuZ2V0VXNlckRhdGEoKTtcblx0fSxcblxuXHRzZXRJbnB1dFBsYWNlaG9sZGVyOiBmdW5jdGlvbiBzZXRJbnB1dFBsYWNlaG9sZGVyKHR4dCkge1xuXHRcdC8vIGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKFN0b3JlLmdldFNlYXJjaElucHV0SWQoKSkucGxhY2Vob2xkZXIgPSB0eHQ7XG5cdH0sXG5cblx0Y2hhbmdlQWNjb3VudDogZnVuY3Rpb24gY2hhbmdlQWNjb3VudChhY2NvdW50SWQpIHtcblx0XHRDYWxsZXIubWFrZUNhbGwoe1xuXHRcdFx0dHlwZTogJ0dFVCcsXG5cdFx0XHRlbmRwb2ludDogU3RvcmUuZ2V0U3dpdGNoQWNjb3VudEVuZHBvaW50KGFjY291bnRJZCksXG5cdFx0XHRjYWxsYmFja3M6IHtcblx0XHRcdFx0c3VjY2VzczogZnVuY3Rpb24gc3VjY2VzcyhyZXN1bHQpIHtcblx0XHRcdFx0XHR3aW5kb3cubG9jYXRpb24gPSAnL2FwcHMnO1xuXHRcdFx0XHR9LFxuXHRcdFx0XHRmYWlsOiBmdW5jdGlvbiBmYWlsKGVycikge1xuXHRcdFx0XHRcdGFsZXJ0KCdTb3JyeSwgc29tZXRoaW5nIHdlbnQgd3Jvbmcgd2l0aCB5b3VyIHJlcXVlc3QuIFBsZXNlIHRyeSBhZ2FpbicpO1xuXHRcdFx0XHR9XG5cdFx0XHR9XG5cdFx0fSk7XG5cdH0sXG5cblx0cmVuZGVyQXBwczogZnVuY3Rpb24gcmVuZGVyQXBwcyhhcHBzKSB7XG5cdFx0dmFyIGFwcFRlbXBsYXRlID0gZnVuY3Rpb24gYXBwVGVtcGxhdGUoYXBwKSB7XG5cdFx0XHRyZXR1cm4gJ1xcblxcdFxcdFxcdFxcdDxhIGhyZWY9XCIjXCIgc3R5bGU9XCJiYWNrZ3JvdW5kOiAjJyArIGFwcC5jb2xvciArICdcIj48aSBjbGFzcz1cIicgKyBhcHAuaWNvbiArICdcIj48L2k+PC9hPlxcblxcdFxcdFxcdFxcdDxzcGFuIGNsYXNzPVwiYmFjLS1hcHAtbmFtZVwiPicgKyBhcHAubmFtZSArICc8L3NwYW4+XFxuXFx0XFx0XFx0XFx0PHNwYW4gY2xhc3M9XCJiYWMtLWFwcC1kZXNjcmlwdGlvblwiPicgKyBhcHAuZGVzY3IgKyAnPC9zcGFuPlxcblxcdFxcdFxcdCc7XG5cdFx0fTtcblxuXHRcdHZhciBfbG9vcCA9IGZ1bmN0aW9uIF9sb29wKGkpIHtcblx0XHRcdHZhciBhcHAgPSBhcHBzW2ldO1xuXHRcdFx0dmFyIGRpdiA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoXCJkaXZcIik7XG5cdFx0XHRkaXYuY2xhc3NOYW1lID0gXCJiYWMtLWFwcHNcIjtcblx0XHRcdGRpdi5pbm5lckhUTUwgPSBhcHBUZW1wbGF0ZShhcHApO1xuXHRcdFx0ZGl2Lm9uY2xpY2sgPSBmdW5jdGlvbiAoZSkge1xuXHRcdFx0XHRlLnByZXZlbnREZWZhdWx0KCk7XG5cdFx0XHRcdHdpbmRvdy5sb2NhdGlvbiA9IGFwcC5hcHBsaWNhdGlvbl91cmw7XG5cdFx0XHR9O1xuXHRcdFx0ZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoXCItLXB1cmVzZGstYXBwcy1jb250YWluZXItLVwiKS5hcHBlbmRDaGlsZChkaXYpO1xuXHRcdH07XG5cblx0XHRmb3IgKHZhciBpID0gMDsgaSA8IGFwcHMubGVuZ3RoOyBpKyspIHtcblx0XHRcdF9sb29wKGkpO1xuXHRcdH1cblx0fSxcblxuXHRyZW5kZXJVc2VyOiBmdW5jdGlvbiByZW5kZXJVc2VyKHVzZXIpIHtcblx0XHR2YXIgdXNlclRlbXBsYXRlID0gZnVuY3Rpb24gdXNlclRlbXBsYXRlKHVzZXIpIHtcblx0XHRcdHJldHVybiAnXFxuXFx0XFx0XFx0XFx0PGRpdiBjbGFzcz1cImJhYy0tdXNlci1pbWFnZVwiPjxpIGNsYXNzPVwiZmEgZmEtY2FtZXJhXCI+PC9pPjwvZGl2PlxcblxcdFxcdFxcdFxcdDxkaXYgY2xhc3M9XCJiYWMtLXVzZXItbmFtZVwiPicgKyB1c2VyLmZpcnN0bmFtZSArICcgJyArIHVzZXIubGFzdG5hbWUgKyAnPC9kaXY+XFxuXFx0XFx0XFx0XFx0PGRpdiBjbGFzcz1cImJhYy0tdXNlci1lbWFpbFwiPicgKyB1c2VyLmVtYWlsICsgJzwvZGl2PlxcblxcdFxcdFxcdCc7XG5cdFx0fTtcblx0XHR2YXIgZGl2ID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudCgnZGl2Jyk7XG5cdFx0ZGl2LmNsYXNzTmFtZSA9IFwiYmFjLS11c2VyLXNpZGViYXItaW5mb1wiO1xuXHRcdGRpdi5pbm5lckhUTUwgPSB1c2VyVGVtcGxhdGUodXNlcik7XG5cdFx0ZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoJy0tcHVyZXNkay11c2VyLWRldGFpbHMtLScpLmFwcGVuZENoaWxkKGRpdik7XG5cdFx0ZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoJy0tcHVyZXNkay11c2VyLWF2YXRhci0tJykuaW5uZXJIVE1MID0gdXNlci5maXJzdG5hbWUuY2hhckF0KDApICsgdXNlci5sYXN0bmFtZS5jaGFyQXQoMCk7XG5cdH0sXG5cblx0cmVuZGVyQWNjb3VudHM6IGZ1bmN0aW9uIHJlbmRlckFjY291bnRzKGFjY291bnRzKSB7XG5cdFx0dmFyIGFjY291bnRzVGVtcGxhdGUgPSBmdW5jdGlvbiBhY2NvdW50c1RlbXBsYXRlKGFjY291bnQpIHtcblx0XHRcdHJldHVybiAnXFxuXFx0XFx0XFx0XFx0PGltZyBzcmM9XCInICsgYWNjb3VudC5zZGtfc3F1YXJlX2xvZ29faWNvbiArICdcIiBhbHQ9XCJcIj5cXG5cXHRcXHRcXHRcXHQ8ZGl2IGNsYXNzPVwiYmFjLXVzZXItYXBwLWRldGFpbHNcIj5cXG5cXHRcXHRcXHRcXHRcXHQgPHNwYW4+JyArIGFjY291bnQubmFtZSArICc8L3NwYW4+XFxuXFx0XFx0XFx0XFx0XFx0IDxzcGFuPjE1IHRlYW0gbWVtYmVyczwvc3Bhbj5cXG5cXHRcXHRcXHRcXHQ8L2Rpdj5cXG5cXHRcXHRcXHQnO1xuXHRcdH07XG5cblx0XHR2YXIgX2xvb3AyID0gZnVuY3Rpb24gX2xvb3AyKGkpIHtcblx0XHRcdHZhciBhY2NvdW50ID0gYWNjb3VudHNbaV07XG5cdFx0XHR2YXIgZGl2ID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudCgnZGl2Jyk7XG5cdFx0XHRkaXYuY2xhc3NOYW1lID0gJ2JhYy0tdXNlci1saXN0LWl0ZW0nO1xuXHRcdFx0ZGl2LmlubmVySFRNTCA9IGFjY291bnRzVGVtcGxhdGUoYWNjb3VudCk7XG5cdFx0XHRkaXYub25jbGljayA9IGZ1bmN0aW9uIChlKSB7XG5cdFx0XHRcdGUucHJldmVudERlZmF1bHQoKTtcblx0XHRcdFx0UFBCQS5jaGFuZ2VBY2NvdW50KGFjY291bnQuc2ZpZCk7XG5cdFx0XHR9O1xuXHRcdFx0ZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoJy0tcHVyZXNkay11c2VyLWJ1c2luZXNzZXMtLScpLmFwcGVuZENoaWxkKGRpdik7XG5cdFx0fTtcblxuXHRcdGZvciAodmFyIGkgPSAwOyBpIDwgYWNjb3VudHMubGVuZ3RoOyBpKyspIHtcblx0XHRcdF9sb29wMihpKTtcblx0XHR9XG5cdH0sXG5cblx0c3R5bGVBY2NvdW50OiBmdW5jdGlvbiBzdHlsZUFjY291bnQoYWNjb3VudCkge1xuXHRcdHZhciBsb2dvID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudCgnaW1nJyk7XG5cdFx0bG9nby5zcmMgPSBhY2NvdW50LnNka19sb2dvX2ljb247XG5cdFx0ZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoJy0tcHVyZXNkay1hY2NvdW50LWxvZ28tLScpLmFwcGVuZENoaWxkKGxvZ28pO1xuXHRcdGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKCctLXB1cmVzZGstYmFjLS1oZWFkZXItYXBwcy0tJykuc3R5bGUuY3NzVGV4dCA9IFwiYmFja2dyb3VuZDogI1wiICsgYWNjb3VudC5zZGtfYmFja2dyb3VuZF9jb2xvciArIFwiOyBjb2xvcjogI1wiICsgYWNjb3VudC5zZGtfZm9udF9jb2xvcjtcblx0XHRkb2N1bWVudC5nZXRFbGVtZW50QnlJZCgnLS1wdXJlc2RrLXVzZXItc2lkZWJhci0tJykuc3R5bGUuY3NzVGV4dCA9IFwiYmFja2dyb3VuZDogI1wiICsgYWNjb3VudC5zZGtfYmFja2dyb3VuZF9jb2xvciArIFwiOyBjb2xvcjogI1wiICsgYWNjb3VudC5zZGtfZm9udF9jb2xvcjtcblx0XHQvLyBkb2N1bWVudC5nZXRFbGVtZW50QnlJZCgnLS1wdXJlc2RrLS1zZWFyY2gtLWlucHV0LS0nKS5zdHlsZS5jc3NUZXh0ID0gXCJiYWNrZ3JvdW5kOiAjXCIgKyBhY2NvdW50LnNka19zZWFyY2hfYmFja2dyb3VuZF9jb2xvclxuXHRcdC8vICAgKyBcIjsgY29sb3I6ICNcIiArIGFjY291bnQuc2RrX3NlYXJjaF9mb250X2NvbG9yO1xuXHR9LFxuXG5cdHJlbmRlcjogZnVuY3Rpb24gcmVuZGVyKCkge1xuXHRcdHZhciB3aGVyZVRvID0gZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoU3RvcmUuZ2V0SFRMTUNvbnRhaW5lcigpKTtcblx0XHRpZiAod2hlcmVUbyA9PT0gbnVsbCkge1xuXHRcdFx0TG9nZ2VyLmVycm9yKCd0aGUgY29udGFpbmVyIHdpdGggaWQgXCInICsgd2hlcmVUbyArICdcIiBoYXMgbm90IGJlZW4gZm91bmQgb24gdGhlIGRvY3VtZW50LiBUaGUgbGlicmFyeSBpcyBnb2luZyB0byBjcmVhdGUgaXQuJyk7XG5cdFx0XHR2YXIgZGl2ID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudCgnZGl2Jyk7XG5cdFx0XHRkaXYuaWQgPSBTdG9yZS5nZXRIVExNQ29udGFpbmVyKCk7XG5cdFx0XHRkaXYuc3R5bGUud2lkdGggPSAnMTAwJSc7XG5cdFx0XHRkaXYuc3R5bGUuaGVpZ2h0ID0gJzUwcHgnO1xuXHRcdFx0ZG9jdW1lbnQuYm9keS5pbnNlcnRCZWZvcmUoZGl2LCBkb2N1bWVudC5ib2R5LmZpcnN0Q2hpbGQpO1xuXHRcdFx0d2hlcmVUbyA9IGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKFN0b3JlLmdldEhUTE1Db250YWluZXIoKSk7XG5cdFx0fVxuXHRcdHdoZXJlVG8uaW5uZXJIVE1MID0gU3RvcmUuZ2V0SFRNTCgpO1xuXHRcdFBQQkEuc3R5bGVBY2NvdW50KFN0b3JlLmdldFVzZXJEYXRhKCkudXNlci5hY2NvdW50KTtcblx0XHRQUEJBLnJlbmRlclVzZXIoU3RvcmUuZ2V0VXNlckRhdGEoKS51c2VyKTtcblx0XHRQUEJBLnJlbmRlckFjY291bnRzKFN0b3JlLmdldFVzZXJEYXRhKCkudXNlci5hY2NvdW50cyk7XG5cdFx0aWYgKFN0b3JlLmdldEFwcHNWaXNpYmxlKCkgPT09IGZhbHNlKSB7XG5cdFx0XHRkb2N1bWVudC5nZXRFbGVtZW50QnlJZCgnLS1wdXJlc2RrLWFwcHMtc2VjdGlvbi0tJykuc3R5bGUuY3NzVGV4dCA9IFwiZGlzcGxheTpub25lXCI7XG5cdFx0fVxuXHRcdGFmdGVyUmVuZGVyKCk7XG5cdH1cbn07XG5cbm1vZHVsZS5leHBvcnRzID0gUFBCQTsiLCIndXNlIHN0cmljdCc7XG5cbi8qIVxuICogUHVyZVByb2ZpbGUgUHVyZVByb2ZpbGUgQnVzaW5lc3MgQXBwcyBEZXZlbG9wbWVudCBTREtcbiAqXG4gKiB2ZXJzaW9uOiAxLjEuMlxuICogZGF0ZTogMjAxNy0wNC0yNFxuICpcbiAqIENvcHlyaWdodCAyMDE3LCBQdXJlUHJvZmlsZVxuICogUmVsZWFzZWQgdW5kZXIgTUlUIGxpY2Vuc2VcbiAqIGh0dHBzOi8vb3BlbnNvdXJjZS5vcmcvbGljZW5zZXMvTUlUXG4gKi9cblxudmFyIHBwYmEgPSByZXF1aXJlKCcuL1BQQkEnKTtcbnBwYmEuc2V0V2luZG93TmFtZSgnUFVSRVNESycpO1xucHBiYS5zZXRDb25maWd1cmF0aW9uKHtcbiAgICBcImxvZ3NcIjogdHJ1ZSxcbiAgICBcImJhc2VVcmxcIjogXCIvYXBpL3YxL1wiLFxuICAgIFwibG9naW5VcmxcIjogXCIvYXBpL3YxL29hdXRoMlwiLFxuICAgIFwic2VhcmNoSW5wdXRJZFwiOiBcIi0tcHVyZXNkay0tc2VhcmNoLS1pbnB1dC0tXCIsXG4gICAgXCJyZWRpcmVjdFVybFBhcmFtXCI6IFwicmVkaXJlY3RfdXJsXCJcbn0pO1xucHBiYS5zZXRIVE1MVGVtcGxhdGUoJzxoZWFkZXIgY2xhc3M9XCJiYWMtLWhlYWRlci1hcHBzXCIgaWQ9XCItLXB1cmVzZGstYmFjLS1oZWFkZXItYXBwcy0tXCI+XFxuICAgIDxkaXYgY2xhc3M9XCJiYWMtLWNvbnRhaW5lclwiPlxcbiAgICAgICAgPGRpdiBjbGFzcz1cImJhYy0tbG9nb1wiIGlkPVwiLS1wdXJlc2RrLWFjY291bnQtbG9nby0tXCI+PC9kaXY+XFxuICAgICAgICA8ZGl2IGNsYXNzPVwiYmFjLS11c2VyLWFjdGlvbnNcIj5cXG4gICAgICAgICAgICA8ZGl2IGNsYXNzPVwiYmFjLS11c2VyLWFwcHNcIiBpZD1cIi0tcHVyZXNkay1hcHBzLXNlY3Rpb24tLVwiPlxcbiAgICAgICAgICAgICAgICA8aSBjbGFzcz1cImZhIGZhLXNxdWFyZXNcIiBpZD1cIi0tcHVyZXNkay1hcHBzLWljb24tLVwiPjwvaT5cXG5cXG4gICAgICAgICAgICAgICAgPGRpdiBjbGFzcz1cImJhYy0tYXBwcy1jb250YWluZXJcIiBpZD1cIi0tcHVyZXNkay1hcHBzLWNvbnRhaW5lci0tXCI+XFxuICAgICAgICAgICAgICAgICAgICA8ZGl2IGNsYXNzPVwiYmFjLS1hcHBzLWFycm93XCI+PC9kaXY+XFxuICAgICAgICAgICAgICAgIDwvZGl2PlxcbiAgICAgICAgICAgIDwvZGl2PlxcbiAgICAgICAgICAgIDwhLS08ZGl2IGNsYXNzPVwiYmFjJiM0NTsmIzQ1O3VzZXItbm90aWZpY2F0aW9uc1wiPi0tPlxcbiAgICAgICAgICAgICAgICA8IS0tPGRpdiBjbGFzcz1cImJhYyYjNDU7JiM0NTt1c2VyLW5vdGlmaWNhdGlvbnMtY291bnRcIj4xPC9kaXY+LS0+XFxuICAgICAgICAgICAgICAgIDwhLS08aSBjbGFzcz1cImZhIGZhLWJlbGwtb1wiPjwvaT4tLT5cXG4gICAgICAgICAgICA8IS0tPC9kaXY+LS0+XFxuICAgICAgICAgICAgPGRpdiBjbGFzcz1cImJhYy0tdXNlci1hdmF0YXJcIj5cXG4gICAgICAgICAgICAgICAgPHNwYW4gY2xhc3M9XCJiYWMtLXVzZXItYXZhdGFyLW5hbWVcIiBpZD1cIi0tcHVyZXNkay11c2VyLWF2YXRhci0tXCI+PC9zcGFuPlxcbiAgICAgICAgICAgIDwvZGl2PlxcbiAgICAgICAgPC9kaXY+XFxuICAgIDwvZGl2PlxcbjwvaGVhZGVyPlxcbjxkaXYgY2xhc3M9XCJiYWMtLXVzZXItc2lkZWJhclwiIGlkPVwiLS1wdXJlc2RrLXVzZXItc2lkZWJhci0tXCI+XFxuICAgIDxkaXYgaWQ9XCItLXB1cmVzZGstdXNlci1kZXRhaWxzLS1cIj48L2Rpdj5cXG4gICAgPCEtLTxkaXYgY2xhc3M9XCJiYWMmIzQ1OyYjNDU7dXNlci1zaWRlYmFyLWluZm9cIj4tLT5cXG4gICAgICAgIDwhLS08ZGl2IGNsYXNzPVwiYmFjJiM0NTsmIzQ1O3VzZXItaW1hZ2VcIj48aSBjbGFzcz1cImZhIGZhLWNhbWVyYVwiPjwvaT48L2Rpdj4tLT5cXG4gICAgICAgIDwhLS08ZGl2IGNsYXNzPVwiYmFjJiM0NTsmIzQ1O3VzZXItbmFtZVwiPkN1cnRpcyBCYXJ0bGV0dDwvZGl2Pi0tPlxcbiAgICAgICAgPCEtLTxkaXYgY2xhc3M9XCJiYWMmIzQ1OyYjNDU7dXNlci1lbWFpbFwiPmNiYXJ0bGV0dEBwdXJlcHJvZmlsZS5jb208L2Rpdj4tLT5cXG4gICAgPCEtLTwvZGl2Pi0tPlxcbiAgICA8ZGl2IGNsYXNzPVwiYmFjLS11c2VyLWFwcHNcIiBpZD1cIi0tcHVyZXNkay11c2VyLWJ1c2luZXNzZXMtLVwiPlxcbiAgICAgICAgPCEtLTxkaXYgY2xhc3M9XCJiYWMmIzQ1OyYjNDU7dXNlci1saXN0LWl0ZW1cIj4tLT5cXG4gICAgICAgICAgICA8IS0tPGltZyBzcmM9XCJodHRwOi8vbG9yZW1waXhlbC5jb20vNDAvNDBcIiBhbHQ9XCJcIj4tLT5cXG4gICAgICAgICAgICA8IS0tPGRpdiBjbGFzcz1cImJhYy11c2VyLWFwcC1kZXRhaWxzXCI+LS0+XFxuICAgICAgICAgICAgICAgIDwhLS08c3Bhbj48L3NwYW4+LS0+XFxuICAgICAgICAgICAgICAgIDwhLS08c3Bhbj4xNSB0ZWFtIG1lbWJlcnM8L3NwYW4+LS0+XFxuICAgICAgICAgICAgPCEtLTwvZGl2Pi0tPlxcbiAgICAgICAgPCEtLTwvZGl2Pi0tPlxcbiAgICA8L2Rpdj5cXG4gICAgPGRpdiBjbGFzcz1cImJhYy0tdXNlci1hY2NvdW50LXNldHRpbmdzXCI+XFxuICAgICAgICA8ZGl2IGNsYXNzPVwiYmFjLXVzZXItYWNvdW50LWxpc3QtaXRlbVwiPlxcbiAgICAgICAgICAgIDxpIGNsYXNzPVwiZmEgZmEtY29nLWxpbmVcIj48L2k+XFxuICAgICAgICAgICAgPGEgaHJlZj1cIiNcIj5BY291bnQgU2VjdXJpdHk8L2E+XFxuICAgICAgICA8L2Rpdj5cXG4gICAgICAgIDxkaXYgY2xhc3M9XCJiYWMtdXNlci1hY291bnQtbGlzdC1pdGVtXCI+XFxuICAgICAgICAgICAgPGkgY2xhc3M9XCJmYSBmYS1sb2NrLWxpbmVcIj48L2k+XFxuICAgICAgICAgICAgPGEgaHJlZj1cIiNcIj5BY291bnQgU2VjdXJpdHk8L2E+XFxuICAgICAgICA8L2Rpdj5cXG4gICAgICAgIDxkaXYgY2xhc3M9XCJiYWMtdXNlci1hY291bnQtbGlzdC1pdGVtXCI+XFxuICAgICAgICAgICAgPGkgY2xhc3M9XCJmYSBmYS1sb2dpbi1saW5lXCI+PC9pPlxcbiAgICAgICAgICAgIDxhIGhyZWY9XCIvYXBpL3YxL3NpZ24tb2ZmXCI+TG9nIG91dDwvYT5cXG4gICAgICAgIDwvZGl2PlxcbiAgICA8L2Rpdj5cXG48L2Rpdj4nKTtcblxud2luZG93LlBVUkVTREsgPSBwcGJhO1xuXG52YXIgY3NzID0gJ2h0bWwsYm9keSxkaXYsc3BhbixhcHBsZXQsb2JqZWN0LGlmcmFtZSxoMSxoMixoMyxoNCxoNSxoNixwLGJsb2NrcXVvdGUscHJlLGEsYWJicixhY3JvbnltLGFkZHJlc3MsYmlnLGNpdGUsY29kZSxkZWwsZGZuLGVtLGltZyxpbnMsa2JkLHEscyxzYW1wLHNtYWxsLHN0cmlrZSxzdHJvbmcsc3ViLHN1cCx0dCx2YXIsYix1LGksY2VudGVyLGRsLGR0LGRkLG9sLHVsLGxpLGZpZWxkc2V0LGZvcm0sbGFiZWwsbGVnZW5kLHRhYmxlLGNhcHRpb24sdGJvZHksdGZvb3QsdGhlYWQsdHIsdGgsdGQsYXJ0aWNsZSxhc2lkZSxjYW52YXMsZGV0YWlscyxlbWJlZCxmaWd1cmUsZmlnY2FwdGlvbixmb290ZXIsaGVhZGVyLGhncm91cCxtZW51LG5hdixvdXRwdXQscnVieSxzZWN0aW9uLHN1bW1hcnksdGltZSxtYXJrLGF1ZGlvLHZpZGVve21hcmdpbjowO3BhZGRpbmc6MDtib3JkZXI6MDtmb250LXNpemU6MTAwJTtmb250OmluaGVyaXQ7dmVydGljYWwtYWxpZ246YmFzZWxpbmV9YXJ0aWNsZSxhc2lkZSxkZXRhaWxzLGZpZ2NhcHRpb24sZmlndXJlLGZvb3RlcixoZWFkZXIsaGdyb3VwLG1lbnUsbmF2LHNlY3Rpb257ZGlzcGxheTpibG9ja31ib2R5e2xpbmUtaGVpZ2h0OjF9b2wsdWx7bGlzdC1zdHlsZTpub25lfWJsb2NrcXVvdGUscXtxdW90ZXM6bm9uZX1ibG9ja3F1b3RlOmJlZm9yZSxibG9ja3F1b3RlOmFmdGVyLHE6YmVmb3JlLHE6YWZ0ZXJ7Y29udGVudDpcIlwiO2NvbnRlbnQ6bm9uZX10YWJsZXtib3JkZXItY29sbGFwc2U6Y29sbGFwc2U7Ym9yZGVyLXNwYWNpbmc6MH1ib2R5e292ZXJmbG93LXg6aGlkZGVufSNiYWMtd3JhcHBlcntmb250LWZhbWlseTpcIlZlcmRhbmFcIiwgYXJpYWwsIHNhbnMtc2VyaWY7Y29sb3I6d2hpdGU7bWluLWhlaWdodDoxMDB2aDtwb3NpdGlvbjpyZWxhdGl2ZX0uYmFjLS1jb250YWluZXJ7bWF4LXdpZHRoOjExNjBweDttYXJnaW46MCBhdXRvfS5iYWMtLWhlYWRlci1hcHBze3Bvc2l0aW9uOmFic29sdXRlO3dpZHRoOjEwMCU7aGVpZ2h0OjUwcHg7YmFja2dyb3VuZC1jb2xvcjojNDc1MzY5O3BhZGRpbmc6NXB4IDA7ei1pbmRleDo5OTk5OTk5fS5iYWMtLWhlYWRlci1hcHBzIC5iYWMtLWNvbnRhaW5lcntoZWlnaHQ6MTAwJTtkaXNwbGF5OmZsZXg7YWxpZ24taXRlbXM6Y2VudGVyO2p1c3RpZnktY29udGVudDpzcGFjZS1iZXR3ZWVufS5iYWMtLWhlYWRlci1zZWFyY2h7cG9zaXRpb246cmVsYXRpdmV9LmJhYy0taGVhZGVyLXNlYXJjaCBpbnB1dHtjb2xvcjojZmZmO2ZvbnQtc2l6ZToxNHB4O2hlaWdodDozNXB4O2JhY2tncm91bmQtY29sb3I6IzZiNzU4NjtwYWRkaW5nOjAgNXB4IDAgMTBweDtib3JkZXI6bm9uZTtib3JkZXItcmFkaXVzOjNweDttaW4td2lkdGg6NDAwcHg7d2lkdGg6MTAwJX0uYmFjLS1oZWFkZXItc2VhcmNoIGlucHV0OmZvY3Vze291dGxpbmU6bm9uZX0uYmFjLS1oZWFkZXItc2VhcmNoIGlucHV0Ojotd2Via2l0LWlucHV0LXBsYWNlaG9sZGVye2ZvbnQtc3R5bGU6bm9ybWFsICFpbXBvcnRhbnQ7dGV4dC1hbGlnbjpjZW50ZXI7Y29sb3I6I2ZmZjtmb250LXNpemU6MTRweDtmb250LXdlaWdodDozMDA7bGV0dGVyLXNwYWNpbmc6MC41cHh9LmJhYy0taGVhZGVyLXNlYXJjaCBpbnB1dDo6LW1vei1wbGFjZWhvbGRlcntmb250LXN0eWxlOm5vcm1hbCAhaW1wb3J0YW50O3RleHQtYWxpZ246Y2VudGVyO2NvbG9yOiNmZmY7Zm9udC1zaXplOjE0cHg7Zm9udC13ZWlnaHQ6MzAwO2xldHRlci1zcGFjaW5nOjAuNXB4fS5iYWMtLWhlYWRlci1zZWFyY2ggaW5wdXQ6LW1zLWlucHV0LXBsYWNlaG9sZGVye2ZvbnQtc3R5bGU6bm9ybWFsICFpbXBvcnRhbnQ7dGV4dC1hbGlnbjpjZW50ZXI7Y29sb3I6I2ZmZjtmb250LXNpemU6MTRweDtmb250LXdlaWdodDozMDA7bGV0dGVyLXNwYWNpbmc6MC41cHh9LmJhYy0taGVhZGVyLXNlYXJjaCBpe3Bvc2l0aW9uOmFic29sdXRlO3RvcDo4cHg7cmlnaHQ6MTBweH0uYmFjLS11c2VyLWFjdGlvbnN7ZGlzcGxheTpmbGV4O2FsaWduLWl0ZW1zOmNlbnRlcn0uYmFjLS11c2VyLWFjdGlvbnM+ZGl2e2N1cnNvcjpwb2ludGVyO2NvbG9yOndoaXRlfS5iYWMtLXVzZXItYWN0aW9ucyAuYmFjLS11c2VyLW5vdGlmaWNhdGlvbnN7cG9zaXRpb246cmVsYXRpdmV9LmJhYy0tdXNlci1hY3Rpb25zIC5iYWMtLXVzZXItbm90aWZpY2F0aW9ucyBpe2ZvbnQtc2l6ZToyMHB4fS5iYWMtLXVzZXItYWN0aW9ucyAuYmFjLS11c2VyLW5vdGlmaWNhdGlvbnMtY291bnR7cG9zaXRpb246YWJzb2x1dGU7ZGlzcGxheTppbmxpbmUtYmxvY2s7aGVpZ2h0OjE1cHg7d2lkdGg6MTVweDtsaW5lLWhlaWdodDoxNXB4O2NvbG9yOiNmZmY7Zm9udC1zaXplOjEwcHg7dGV4dC1hbGlnbjpjZW50ZXI7YmFja2dyb3VuZC1jb2xvcjojZmMzYjMwO2JvcmRlci1yYWRpdXM6NTAlO3RvcDotNXB4O2xlZnQ6LTVweH0uYmFjLS11c2VyLWFjdGlvbnMgLmJhYy0tdXNlci1hdmF0YXIsLmJhYy0tdXNlci1hY3Rpb25zIC5iYWMtLXVzZXItbm90aWZpY2F0aW9uc3ttYXJnaW4tbGVmdDoyMHB4fS5iYWMtLXVzZXItYWN0aW9ucyAuYmFjLS11c2VyLWF2YXRhci1uYW1le2NvbG9yOiNmZmY7YmFja2dyb3VuZC1jb2xvcjojYWRhZGFkO2JvcmRlci1yYWRpdXM6NTAlO2Rpc3BsYXk6aW5saW5lLWJsb2NrO2hlaWdodDozMHB4O3dpZHRoOjMwcHg7bGluZS1oZWlnaHQ6MzBweDt0ZXh0LWFsaWduOmNlbnRlcjtmb250LXNpemU6MTRweH0uYmFjLS11c2VyLWFwcHN7cG9zaXRpb246cmVsYXRpdmV9LmJhYy0tYXBwcy1jb250YWluZXJ7YmFja2dyb3VuZDojZmZmO3Bvc2l0aW9uOmFic29sdXRlO3RvcDo0NXB4O3JpZ2h0Oi00MHB4O2Rpc3BsYXk6ZmxleDt3aWR0aDozNjBweDtmbGV4LXdyYXA6d3JhcDtib3JkZXItcmFkaXVzOjEwcHg7cGFkZGluZzozMHB4O2p1c3RpZnktY29udGVudDpzcGFjZS1iZXR3ZWVuO3RleHQtYWxpZ246Y2VudGVyOy13ZWJraXQtYm94LXNoYWRvdzowIDAgMTBweCAycHggcmdiYSgwLDAsMCwwLjIpO2JveC1zaGFkb3c6MCAwIDEwcHggMnB4IHJnYmEoMCwwLDAsMC4yKTtvcGFjaXR5OjA7dmlzaWJpbGl0eTpoaWRkZW47dHJhbnNpdGlvbjphbGwgMC40cyBlYXNlfS5iYWMtLWFwcHMtY29udGFpbmVyLmFjdGl2ZXtvcGFjaXR5OjE7dmlzaWJpbGl0eTp2aXNpYmxlfS5iYWMtLWFwcHMtY29udGFpbmVyIC5iYWMtLWFwcHMtYXJyb3d7cG9zaXRpb246YWJzb2x1dGU7ZGlzcGxheTpibG9jaztoZWlnaHQ6MjBweDt3aWR0aDoyMHB4O3RvcDotMTBweDtyaWdodDozNnB4O2JhY2tncm91bmQ6I2ZmZjt0cmFuc2Zvcm06cm90YXRlKC00NWRlZyk7ei1pbmRleDoxfS5iYWMtLWFwcHMtY29udGFpbmVyIC5iYWMtLWFwcHN7d2lkdGg6MzIlO2Rpc3BsYXk6ZmxleDtmb250LXNpemU6MzBweDttYXJnaW4tYm90dG9tOjQwcHg7dGV4dC1hbGlnbjpjZW50ZXI7anVzdGlmeS1jb250ZW50OmNlbnRlcjtmbGV4LXdyYXA6d3JhcH0uYmFjLS1hcHBzLWNvbnRhaW5lciAuYmFjLS1hcHBzIGF7ZGlzcGxheTpibG9jaztjb2xvcjojZmZmO3RleHQtZGVjb3JhdGlvbjpub25lO3dpZHRoOjY1cHg7aGVpZ2h0OjY1cHg7bGluZS1oZWlnaHQ6NjVweDt0ZXh0LWFsaWduOmNlbnRlcjtib3JkZXItcmFkaXVzOjEwcHg7LXdlYmtpdC1ib3gtc2hhZG93OjAgMCA1cHggMCByZ2JhKDAsMCwwLDAuMik7Ym94LXNoYWRvdzowIDAgNXB4IDAgcmdiYSgwLDAsMCwwLjIpfS5iYWMtLWFwcHMtY29udGFpbmVyIC5iYWMtLWFwcHMgLmJhYy0tYXBwLW5hbWV7d2lkdGg6MTAwJTtjb2xvcjojMDAwO2ZvbnQtc2l6ZToxOHB4O3BhZGRpbmc6MTBweCAwfS5iYWMtLWFwcHMtY29udGFpbmVyIC5iYWMtLWFwcHMgLmJhYy0tYXBwLWRlc2NyaXB0aW9ue2NvbG9yOiM5MTkxOTE7Zm9udC1zaXplOjEycHg7Zm9udC1zdHlsZTppdGFsaWN9LmJhYy0tdXNlci1zaWRlYmFye2ZvbnQtZmFtaWx5OlwiVmVyZGFuYVwiLCBhcmlhbCwgc2Fucy1zZXJpZjtjb2xvcjp3aGl0ZTtiYWNrZ3JvdW5kLWNvbG9yOiM1MTVmNzc7Ym94LXNpemluZzpib3JkZXItYm94O3dpZHRoOjMyMHB4O2hlaWdodDoxMDAlO3Bvc2l0aW9uOmFic29sdXRlO3RvcDowO3JpZ2h0OjA7ei1pbmRleDo5OTk5OTk7cGFkZGluZy10b3A6MTBweDtvcGFjaXR5OjA7bWFyZ2luLXRvcDo1MHB4O3RyYW5zZm9ybTp0cmFuc2xhdGVYKDEwMCUpO3RyYW5zaXRpb246YWxsIDAuNHMgZWFzZX0uYmFjLS11c2VyLXNpZGViYXIuYWN0aXZle29wYWNpdHk6MTt0cmFuc2Zvcm06dHJhbnNsYXRlWCgwJSl9LmJhYy0tdXNlci1zaWRlYmFyIC5iYWMtLXVzZXItbGlzdC1pdGVte2Rpc3BsYXk6ZmxleDtjdXJzb3I6cG9pbnRlcjthbGlnbi1pdGVtczpjZW50ZXI7cGFkZGluZzoxMHB4IDEwcHggMTBweCA0MHB4O2JvcmRlci1ib3R0b206MnB4IHNvbGlkICM2Yjc1ODZ9LmJhYy0tdXNlci1zaWRlYmFyIC5iYWMtLXVzZXItbGlzdC1pdGVtOmhvdmVye2JhY2tncm91bmQtY29sb3I6IzZiNzU4Nn0uYmFjLS11c2VyLXNpZGViYXIgLmJhYy0tdXNlci1saXN0LWl0ZW0gaW1ne21hcmdpbi1yaWdodDoyMHB4O2JvcmRlcjoycHggc29saWQgI2ZmZn0uYmFjLS11c2VyLXNpZGViYXIgLmJhYy0tdXNlci1saXN0LWl0ZW0gc3Bhbnt3aWR0aDoxMDAlO2Rpc3BsYXk6YmxvY2s7bWFyZ2luLWJvdHRvbTo1cHh9LmJhYy0tdXNlci1zaWRlYmFyIC5iYWMtdXNlci1hcHAtZGV0YWlscyBzcGFue2ZvbnQtc2l6ZToxMnB4fS5iYWMtLXVzZXItc2lkZWJhci1pbmZve2Rpc3BsYXk6ZmxleDtqdXN0aWZ5LWNvbnRlbnQ6Y2VudGVyO2ZsZXgtd3JhcDp3cmFwO3RleHQtYWxpZ246Y2VudGVyO3BhZGRpbmc6MTBweCAyMHB4IDE1cHh9LmJhYy0tdXNlci1zaWRlYmFyLWluZm8gLmJhYy0tdXNlci1pbWFnZXtkaXNwbGF5OmlubGluZS1ibG9jaztoZWlnaHQ6ODBweDt3aWR0aDo4MHB4O2xpbmUtaGVpZ2h0OjgwcHg7dGV4dC1hbGlnbjpjZW50ZXI7Y29sb3I6I2ZmZjtib3JkZXItcmFkaXVzOjUwJTtiYWNrZ3JvdW5kLWNvbG9yOiNhZGFkYWQ7bWFyZ2luLWJvdHRvbToxNXB4fS5iYWMtLXVzZXItc2lkZWJhci1pbmZvIC5iYWMtLXVzZXItaW1hZ2UgaXtmb250LXNpemU6MzJweH0uYmFjLS11c2VyLXNpZGViYXItaW5mbyAuYmFjLS11c2VyLW5hbWV7d2lkdGg6MTAwJTt0ZXh0LWFsaWduOmNlbnRlcjtmb250LXNpemU6MThweDttYXJnaW4tYm90dG9tOjEwcHh9LmJhYy0tdXNlci1zaWRlYmFyLWluZm8gLmJhYy0tdXNlci1lbWFpbHtmb250LXNpemU6MTJweDtmb250LXdlaWdodDozMDB9LmJhYy0tdXNlci1hY2NvdW50LXNldHRpbmdze3BhZGRpbmc6NTBweH0uYmFjLS11c2VyLWFjY291bnQtc2V0dGluZ3MgLmJhYy11c2VyLWFjb3VudC1saXN0LWl0ZW17ZGlzcGxheTpmbGV4O2FsaWduLWl0ZW1zOmNlbnRlcjttYXJnaW4tYm90dG9tOjMwcHh9LmJhYy0tdXNlci1hY2NvdW50LXNldHRpbmdzIC5iYWMtdXNlci1hY291bnQtbGlzdC1pdGVtIGF7dGV4dC1kZWNvcmF0aW9uOm5vbmU7Y29sb3I6I2ZmZn0uYmFjLS11c2VyLWFjY291bnQtc2V0dGluZ3MgLmJhYy11c2VyLWFjb3VudC1saXN0LWl0ZW0gaXtmb250LXNpemU6MjRweDttYXJnaW4tcmlnaHQ6MjBweH0nLFxuICAgIGhlYWQgPSBkb2N1bWVudC5oZWFkIHx8IGRvY3VtZW50LmdldEVsZW1lbnRzQnlUYWdOYW1lKCdoZWFkJylbMF0sXG4gICAgc3R5bGUgPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KCdzdHlsZScpO1xuXG5zdHlsZS50eXBlID0gJ3RleHQvY3NzJztcbmlmIChzdHlsZS5zdHlsZVNoZWV0KSB7XG4gICAgc3R5bGUuc3R5bGVTaGVldC5jc3NUZXh0ID0gY3NzO1xufSBlbHNlIHtcbiAgICBzdHlsZS5hcHBlbmRDaGlsZChkb2N1bWVudC5jcmVhdGVUZXh0Tm9kZShjc3MpKTtcbn1cbmhlYWQuYXBwZW5kQ2hpbGQoc3R5bGUpO1xuXG52YXIgbGluayA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoJ2xpbmsnKTtcbmxpbmsuaHJlZiA9ICdodHRwczovL2ZpbGUubXlmb250YXN0aWMuY29tL01Edm5SSkdoQmQ1eFZjWG40dVFKU1ovaWNvbnMuY3NzJztcbmxpbmsucmVsID0gJ3N0eWxlc2hlZXQnO1xuXG5kb2N1bWVudC5nZXRFbGVtZW50c0J5VGFnTmFtZSgnaGVhZCcpWzBdLmFwcGVuZENoaWxkKGxpbmspO1xuXG5tb2R1bGUuZXhwb3J0cyA9IHBwYmE7IiwidmFyIFN0b3JlID0gcmVxdWlyZSgnLi9zdG9yZS5qcycpO1xudmFyIExvZ2dlciA9IHJlcXVpcmUoJy4vbG9nZ2VyJyk7XG5cbnZhciBDYWxsZXIgPSB7XG5cdC8qXG4gZXhwZWN0ZSBhdHRyaWJ1dGVzOlxuIC0gdHlwZSAoZWl0aGVyIEdFVCwgUE9TVCwgREVMRVRFLCBQVVQpXG4gLSBlbmRwb2ludFxuIC0gcGFyYW1zIChpZiBhbnkuIEEganNvbiB3aXRoIHBhcmFtZXRlcnMgdG8gYmUgcGFzc2VkIGJhY2sgdG8gdGhlIGVuZHBvaW50KVxuIC0gY2FsbGJhY2tzOiBhbiBvYmplY3Qgd2l0aDpcbiBcdC0gc3VjY2VzczogdGhlIHN1Y2Nlc3MgY2FsbGJhY2tcbiBcdC0gZmFpbDogdGhlIGZhaWwgY2FsbGJhY2tcbiAgKi9cblx0bWFrZUNhbGw6IGZ1bmN0aW9uIG1ha2VDYWxsKGF0dHJzKSB7XG5cdFx0dmFyIGVuZHBvaW50VXJsID0gYXR0cnMuZW5kcG9pbnQ7XG5cblx0XHR2YXIgeGhyID0gbmV3IFhNTEh0dHBSZXF1ZXN0KCk7XG5cdFx0eGhyLm9wZW4oYXR0cnMudHlwZSwgZW5kcG9pbnRVcmwpO1xuXHRcdC8veGhyLndpdGhDcmVkZW50aWFscyA9IHRydWU7XG5cdFx0eGhyLnNldFJlcXVlc3RIZWFkZXIoJ0NvbnRlbnQtVHlwZScsICdhcHBsaWNhdGlvbi9qc29uJyk7XG5cdFx0eGhyLm9ubG9hZCA9IGZ1bmN0aW9uICgpIHtcblx0XHRcdGlmICh4aHIuc3RhdHVzID49IDIwMCAmJiB4aHIuc3RhdHVzIDwgMzAwKSB7XG5cdFx0XHRcdGF0dHJzLmNhbGxiYWNrcy5zdWNjZXNzKEpTT04ucGFyc2UoeGhyLnJlc3BvbnNlVGV4dCkpO1xuXHRcdFx0fSBlbHNlIGlmICh4aHIuc3RhdHVzICE9PSAyMDApIHtcblx0XHRcdFx0YXR0cnMuY2FsbGJhY2tzLmZhaWwoSlNPTi5wYXJzZSh4aHIucmVzcG9uc2VUZXh0KSk7XG5cdFx0XHR9XG5cdFx0fTtcblxuXHRcdGlmICghYXR0cnMucGFyYW1zKSB7XG5cdFx0XHRhdHRycy5wYXJhbXMgPSB7fTtcblx0XHR9XG5cdFx0eGhyLnNlbmQoSlNPTi5zdHJpbmdpZnkoYXR0cnMucGFyYW1zKSk7XG5cdH0sXG5cblx0cHJvbWlzZUNhbGw6IGZ1bmN0aW9uIHByb21pc2VDYWxsKGF0dHJzKSB7XG5cdFx0cmV0dXJuIG5ldyBQcm9taXNlKGZ1bmN0aW9uIChyZXNvbHZlLCByZWplY3QpIHtcblx0XHRcdHZhciB4aHIgPSBuZXcgWE1MSHR0cFJlcXVlc3QoKTtcblx0XHRcdHhoci5vcGVuKGF0dHJzLnR5cGUsIGF0dHJzLmVuZHBvaW50KTtcblx0XHRcdHhoci5zZXRSZXF1ZXN0SGVhZGVyKCdDb250ZW50LVR5cGUnLCAnYXBwbGljYXRpb24vanNvbicpO1xuXHRcdFx0eGhyLm9ubG9hZCA9IGZ1bmN0aW9uICgpIHtcblx0XHRcdFx0aWYgKHRoaXMuc3RhdHVzID49IDIwMCAmJiB0aGlzLnN0YXR1cyA8IDMwMCkge1xuXHRcdFx0XHRcdGF0dHJzLm1pZGRsZXdhcmVzLnN1Y2Nlc3MoSlNPTi5wYXJzZSh4aHIucmVzcG9uc2VUZXh0KSk7XG5cdFx0XHRcdFx0cmVzb2x2ZShKU09OLnBhcnNlKHhoci5yZXNwb25zZVRleHQpKTtcblx0XHRcdFx0fSBlbHNlIHtcblx0XHRcdFx0XHR3aW5kb3cubG9jYXRpb24gPSBTdG9yZS5nZXRMb2dpblVybCgpO1xuXHRcdFx0XHR9XG5cdFx0XHR9O1xuXHRcdFx0eGhyLm9uZXJyb3IgPSBmdW5jdGlvbiAoKSB7XG5cdFx0XHRcdHdpbmRvdy5sb2NhdGlvbiA9IFN0b3JlLmdldExvZ2luVXJsKCk7XG5cdFx0XHR9O1xuXHRcdFx0eGhyLnNlbmQoKTtcblx0XHR9KTtcblx0fVxufTtcblxubW9kdWxlLmV4cG9ydHMgPSBDYWxsZXI7IiwidmFyIERvbSA9IHtcbiAgICBoYXNDbGFzczogZnVuY3Rpb24gaGFzQ2xhc3MoZWwsIGNsYXNzTmFtZSkge1xuICAgICAgICBpZiAoZWwuY2xhc3NMaXN0KSByZXR1cm4gZWwuY2xhc3NMaXN0LmNvbnRhaW5zKGNsYXNzTmFtZSk7ZWxzZSByZXR1cm4gbmV3IFJlZ0V4cCgnKF58ICknICsgY2xhc3NOYW1lICsgJyggfCQpJywgJ2dpJykudGVzdChlbC5jbGFzc05hbWUpO1xuICAgIH0sXG5cbiAgICByZW1vdmVDbGFzczogZnVuY3Rpb24gcmVtb3ZlQ2xhc3MoZWwsIGNsYXNzTmFtZSkge1xuICAgICAgICBpZiAoZWwuY2xhc3NMaXN0KSBlbC5jbGFzc0xpc3QucmVtb3ZlKGNsYXNzTmFtZSk7ZWxzZSBlbC5jbGFzc05hbWUgPSBlbC5jbGFzc05hbWUucmVwbGFjZShuZXcgUmVnRXhwKCcoXnxcXFxcYiknICsgY2xhc3NOYW1lLnNwbGl0KCcgJykuam9pbignfCcpICsgJyhcXFxcYnwkKScsICdnaScpLCAnICcpO1xuICAgIH0sXG5cbiAgICBhZGRDbGFzczogZnVuY3Rpb24gYWRkQ2xhc3MoZWwsIGNsYXNzTmFtZSkge1xuICAgICAgICBpZiAoZWwuY2xhc3NMaXN0KSBlbC5jbGFzc0xpc3QuYWRkKGNsYXNzTmFtZSk7ZWxzZSBlbC5jbGFzc05hbWUgKz0gJyAnICsgY2xhc3NOYW1lO1xuICAgIH0sXG5cbiAgICB0b2dnbGVDbGFzczogZnVuY3Rpb24gdG9nZ2xlQ2xhc3MoZWwsIGNsYXNzTmFtZSkge1xuICAgICAgICBpZiAodGhpcy5oYXNDbGFzcyhlbCwgY2xhc3NOYW1lKSkge1xuICAgICAgICAgICAgdGhpcy5yZW1vdmVDbGFzcyhlbCwgY2xhc3NOYW1lKTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIHRoaXMuYWRkQ2xhc3MoZWwsIGNsYXNzTmFtZSk7XG4gICAgICAgIH1cbiAgICB9XG59O1xuXG5tb2R1bGUuZXhwb3J0cyA9IERvbTsiLCJ2YXIgU3RvcmUgPSByZXF1aXJlKCcuL3N0b3JlLmpzJyk7XG5cbnZhciBMb2dnZXIgPSB7XG5cdFx0bG9nOiBmdW5jdGlvbiBsb2cod2hhdCkge1xuXHRcdFx0XHRpZiAoIVN0b3JlLmxvZ3NFbmFibGVkKCkpIHtcblx0XHRcdFx0XHRcdHJldHVybiBmYWxzZTtcblx0XHRcdFx0fSBlbHNlIHtcblx0XHRcdFx0XHRcdExvZ2dlci5sb2cgPSBjb25zb2xlLmxvZy5iaW5kKGNvbnNvbGUpO1xuXHRcdFx0XHRcdFx0TG9nZ2VyLmxvZyh3aGF0KTtcblx0XHRcdFx0fVxuXHRcdH0sXG5cdFx0ZXJyb3I6IGZ1bmN0aW9uIGVycm9yKGVycikge1xuXHRcdFx0XHRpZiAoIVN0b3JlLmxvZ3NFbmFibGVkKCkpIHtcblx0XHRcdFx0XHRcdHJldHVybiBmYWxzZTtcblx0XHRcdFx0fSBlbHNlIHtcblx0XHRcdFx0XHRcdExvZ2dlci5lcnJvciA9IGNvbnNvbGUuZXJyb3IuYmluZChjb25zb2xlKTtcblx0XHRcdFx0XHRcdExvZ2dlci5lcnJvcihlcnIpO1xuXHRcdFx0XHR9XG5cdFx0fVxufTtcblxubW9kdWxlLmV4cG9ydHMgPSBMb2dnZXI7IiwiJ3VzZSBzdHJpY3QnO1xuXG52YXIgU3RvcmUgPSByZXF1aXJlKCcuL3N0b3JlLmpzJyk7XG52YXIgTG9nZ2VyID0gcmVxdWlyZSgnLi9sb2dnZXIuanMnKTtcblxudmFyIGF2YWlsYWJsZUxpc3RlbmVycyA9IHtcblx0c2VhcmNoS2V5VXA6IHtcblx0XHRpbmZvOiAnTGlzdGVuZXIgb24ga2V5VXAgb2Ygc2VhcmNoIGlucHV0IG9uIHRvcCBiYXInXG5cdH0sXG5cdHNlYXJjaEVudGVyOiB7XG5cdFx0aW5mbzogJ0xpc3RlbmVyIG9uIGVudGVyIGtleSBwcmVzc2VkIG9uIHNlYXJjaCBpbnB1dCBvbiB0b3AgYmFyJ1xuXHR9LFxuXHRzZWFyY2hPbkNoYW5nZToge1xuXHRcdGluZm86ICdMaXN0ZW5lciBvbiBjaGFuZ2Ugb2YgaW5wdXQgdmFsdWUnXG5cdH1cbn07XG5cbnZhciBQdWJTdWIgPSB7XG5cdGdldEF2YWlsYWJsZUxpc3RlbmVyczogZnVuY3Rpb24gZ2V0QXZhaWxhYmxlTGlzdGVuZXJzKCkge1xuXHRcdHJldHVybiBhdmFpbGFibGVMaXN0ZW5lcnM7XG5cdH0sXG5cblx0c3Vic2NyaWJlOiBmdW5jdGlvbiBzdWJzY3JpYmUoZXZlbnR0LCBmdW5jdCkge1xuXHRcdGlmIChldmVudHQgPT09IFwic2VhcmNoS2V5VXBcIikge1xuXHRcdFx0dmFyIGVsID0gZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoU3RvcmUuZ2V0U2VhcmNoSW5wdXRJZCgpKTtcblx0XHRcdGVsLmFkZEV2ZW50TGlzdGVuZXIoJ2tleXVwJywgZnVuY3QpO1xuXHRcdFx0cmV0dXJuIGZ1bmN0aW9uICgpIHtcblx0XHRcdFx0ZWwucmVtb3ZlRXZlbnRMaXN0ZW5lcigna2V5dXAnLCBmdW5jdCwgZmFsc2UpO1xuXHRcdFx0fTtcblx0XHR9IGVsc2UgaWYgKGV2ZW50dCA9PT0gJ3NlYXJjaEVudGVyJykge1xuXHRcdFx0dmFyIGhhbmRsaW5nRnVuY3QgPSBmdW5jdGlvbiBoYW5kbGluZ0Z1bmN0KGUpIHtcblx0XHRcdFx0aWYgKGUua2V5Q29kZSA9PT0gMTMpIHtcblx0XHRcdFx0XHRmdW5jdChlKTtcblx0XHRcdFx0fVxuXHRcdFx0fTtcblx0XHRcdGVsLmFkZEV2ZW50TGlzdGVuZXIoJ2tleWRvd24nLCBoYW5kbGluZ0Z1bmN0KTtcblx0XHRcdHJldHVybiBmdW5jdGlvbiAoKSB7XG5cdFx0XHRcdGVsLnJlbW92ZUV2ZW50TGlzdGVuZXIoJ2tleWRvd24nLCBoYW5kbGluZ0Z1bmN0LCBmYWxzZSk7XG5cdFx0XHR9O1xuXHRcdH0gZWxzZSBpZiAoZXZlbnR0ID09PSAnc2VhcmNoT25DaGFuZ2UnKSB7XG5cdFx0XHR2YXIgZWwgPSBkb2N1bWVudC5nZXRFbGVtZW50QnlJZChTdG9yZS5nZXRTZWFyY2hJbnB1dElkKCkpO1xuXHRcdFx0ZWwuYWRkRXZlbnRMaXN0ZW5lcignY2hhbmdlJywgZnVuY3QpO1xuXHRcdFx0cmV0dXJuIGZ1bmN0aW9uICgpIHtcblx0XHRcdFx0ZWwucmVtb3ZlRXZlbnRMaXN0ZW5lcigna2V5dXAnLCBmdW5jdCwgZmFsc2UpO1xuXHRcdFx0fTtcblx0XHR9IGVsc2Uge1xuXHRcdFx0TG9nZ2VyLmVycm9yKCdUaGUgZXZlbnQgeW91IHRyaWVkIHRvIHN1YnNjcmliZSBpcyBub3QgYXZhaWxhYmxlIGJ5IHRoZSBsaWJyYXJ5Jyk7XG5cdFx0XHRMb2dnZXIubG9nKCdUaGUgYXZhaWxhYmxlIGV2ZW50cyBhcmU6ICcsIGF2YWlsYWJsZUxpc3RlbmVycyk7XG5cdFx0XHRyZXR1cm4gZnVuY3Rpb24gKCkge307XG5cdFx0fVxuXHR9XG59O1xuXG5tb2R1bGUuZXhwb3J0cyA9IFB1YlN1YjsiLCJ2YXIgc3RhdGUgPSB7XG5cdGdlbmVyYWw6IHt9LFxuXHR1c2VyRGF0YToge30sXG5cdGNvbmZpZ3VyYXRpb246IHt9LFxuXHRodG1sVGVtcGxhdGU6IFwiXCIsXG5cdGFwcHM6IG51bGxcbn07XG5cbmZ1bmN0aW9uIGFzc2VtYmxlKGxpdGVyYWwsIHBhcmFtcykge1xuXHRyZXR1cm4gbmV3IEZ1bmN0aW9uKHBhcmFtcywgXCJyZXR1cm4gYFwiICsgbGl0ZXJhbCArIFwiYDtcIik7XG59XG5cbnZhciBTdG9yZSA9IHtcblx0Z2V0U3RhdGU6IGZ1bmN0aW9uIGdldFN0YXRlKCkge1xuXHRcdHJldHVybiBPYmplY3QuYXNzaWduKHt9LCBzdGF0ZSk7XG5cdH0sXG5cblx0c2V0V2luZG93TmFtZTogZnVuY3Rpb24gc2V0V2luZG93TmFtZSh3bikge1xuXHRcdHN0YXRlLmdlbmVyYWwud2luZG93TmFtZSA9IHduO1xuXHR9LFxuXG5cdC8qXG4gIGNvbmY6XG4gIC0gaGVhZGVyRGl2SWRcbiAgLSBpbmNsdWRlQXBwc01lbnVcbiAgKi9cblx0c2V0Q29uZmlndXJhdGlvbjogZnVuY3Rpb24gc2V0Q29uZmlndXJhdGlvbihjb25mKSB7XG5cdFx0c3RhdGUuY29uZmlndXJhdGlvbiA9IGNvbmY7XG5cdH0sXG5cblx0Z2V0QXBwc1Zpc2libGU6IGZ1bmN0aW9uIGdldEFwcHNWaXNpYmxlKCkge1xuXHRcdGlmIChzdGF0ZS5jb25maWd1cmF0aW9uLmFwcHNWaXNpYmxlID09PSBudWxsIHx8IHN0YXRlLmNvbmZpZ3VyYXRpb24uYXBwc1Zpc2libGUgPT09IHVuZGVmaW5lZCkge1xuXHRcdFx0cmV0dXJuIHRydWU7XG5cdFx0fSBlbHNlIHtcblx0XHRcdHJldHVybiBzdGF0ZS5jb25maWd1cmF0aW9uLmFwcHNWaXNpYmxlO1xuXHRcdH1cblx0fSxcblxuXHRzZXRBcHBzVmlzaWJsZTogZnVuY3Rpb24gc2V0QXBwc1Zpc2libGUoYXBwc1Zpc2libGUpIHtcblx0XHRzdGF0ZS5jb25maWd1cmF0aW9uLmFwcHNWaXNpYmxlID0gYXBwc1Zpc2libGU7XG5cdH0sXG5cblx0c2V0SFRNTFRlbXBsYXRlOiBmdW5jdGlvbiBzZXRIVE1MVGVtcGxhdGUodGVtcGxhdGUpIHtcblx0XHRzdGF0ZS5odG1sVGVtcGxhdGUgPSB0ZW1wbGF0ZTtcblx0fSxcblxuXHRzZXRBcHBzOiBmdW5jdGlvbiBzZXRBcHBzKGFwcHMpIHtcblx0XHRzdGF0ZS5hcHBzID0gYXBwcztcblx0fSxcblxuXHRnZXRMb2dpblVybDogZnVuY3Rpb24gZ2V0TG9naW5VcmwoKSB7XG5cdFx0cmV0dXJuIHN0YXRlLmNvbmZpZ3VyYXRpb24ubG9naW5VcmwgKyBcIj9cIiArIHN0YXRlLmNvbmZpZ3VyYXRpb24ucmVkaXJlY3RVcmxQYXJhbSArIFwiPVwiICsgd2luZG93LmxvY2F0aW9uLmhyZWY7XG5cdH0sXG5cblx0Z2V0QXV0aGVudGljYXRpb25FbmRwb2ludDogZnVuY3Rpb24gZ2V0QXV0aGVudGljYXRpb25FbmRwb2ludCgpIHtcblx0XHRyZXR1cm4gc3RhdGUuY29uZmlndXJhdGlvbi5iYXNlVXJsICsgJ3Nlc3Npb24nO1xuXHR9LFxuXG5cdGdldFN3aXRjaEFjY291bnRFbmRwb2ludDogZnVuY3Rpb24gZ2V0U3dpdGNoQWNjb3VudEVuZHBvaW50KGFjY291bnRJZCkge1xuXHRcdHJldHVybiBzdGF0ZS5jb25maWd1cmF0aW9uLmJhc2VVcmwgKyAnYWNjb3VudHMvc3dpdGNoLycgKyBhY2NvdW50SWQ7XG5cdH0sXG5cblx0Z2V0QXBwc0VuZHBvaW50OiBmdW5jdGlvbiBnZXRBcHBzRW5kcG9pbnQoKSB7XG5cdFx0cmV0dXJuIHN0YXRlLmNvbmZpZ3VyYXRpb24uYmFzZVVybCArICdhcHBzJztcblx0fSxcblxuXHRsb2dzRW5hYmxlZDogZnVuY3Rpb24gbG9nc0VuYWJsZWQoKSB7XG5cdFx0cmV0dXJuIHN0YXRlLmNvbmZpZ3VyYXRpb24ubG9ncztcblx0fSxcblxuXHRnZXRTZWFyY2hJbnB1dElkOiBmdW5jdGlvbiBnZXRTZWFyY2hJbnB1dElkKCkge1xuXHRcdHJldHVybiBzdGF0ZS5jb25maWd1cmF0aW9uLnNlYXJjaElucHV0SWQ7XG5cdH0sXG5cblx0c2V0SFRNTENvbnRhaW5lcjogZnVuY3Rpb24gc2V0SFRNTENvbnRhaW5lcihpZCkge1xuXHRcdHN0YXRlLmNvbmZpZ3VyYXRpb24uaGVhZGVyRGl2SWQgPSBpZDtcblx0fSxcblxuXHRnZXRIVExNQ29udGFpbmVyOiBmdW5jdGlvbiBnZXRIVExNQ29udGFpbmVyKCkge1xuXHRcdGlmIChzdGF0ZS5jb25maWd1cmF0aW9uLmhlYWRlckRpdklkKSB7XG5cdFx0XHRyZXR1cm4gc3RhdGUuY29uZmlndXJhdGlvbi5oZWFkZXJEaXZJZDtcblx0XHR9IGVsc2Uge1xuXHRcdFx0cmV0dXJuIFwicHBzZGstY29udGFpbmVyXCI7XG5cdFx0fVxuXHR9LFxuXG5cdGdldEhUTUw6IGZ1bmN0aW9uIGdldEhUTUwoKSB7XG5cdFx0cmV0dXJuIHN0YXRlLmh0bWxUZW1wbGF0ZTtcblx0fSxcblxuXHRnZXRXaW5kb3dOYW1lOiBmdW5jdGlvbiBnZXRXaW5kb3dOYW1lKCkge1xuXHRcdHJldHVybiBzdGF0ZS5nZW5lcmFsLndpbmRvd05hbWU7XG5cdH0sXG5cblx0c2V0VXNlckRhdGE6IGZ1bmN0aW9uIHNldFVzZXJEYXRhKHVzZXJEYXRhKSB7XG5cdFx0c3RhdGUudXNlckRhdGEgPSB1c2VyRGF0YTtcblx0fSxcblxuXHRnZXRVc2VyRGF0YTogZnVuY3Rpb24gZ2V0VXNlckRhdGEoKSB7XG5cdFx0cmV0dXJuIHN0YXRlLnVzZXJEYXRhO1xuXHR9XG59O1xuXG5tb2R1bGUuZXhwb3J0cyA9IFN0b3JlOyJdfQ==
