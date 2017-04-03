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
		document.getElementById(Store.getSearchInputId()).placeholder = txt;
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
		document.getElementById('--puresdk--search--input--').style.cssText = "background: #" + account.sdk_search_background_color + "; color: #" + account.sdk_search_font_color;
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
 * version: 1.1.0
 * date: 2017-04-03
 *
 * Copyright 2017, PureProfile
 * Released under MIT license
 * https://opensource.org/licenses/MIT
 */

var ppba = require('./PPBA');
ppba.setWindowName('PURESDK');
ppba.setConfiguration({
    "logs": false,
    "baseUrl": "/api/v1/",
    "loginUrl": "/api/v1/oauth2",
    "searchInputId": "--puresdk--search--input--",
    "redirectUrlParam": "redirect_url"
});
ppba.setHTMLTemplate('<header class="bac--header-apps" id="--puresdk-bac--header-apps--">\n    <div class="bac--container">\n        <div class="bac--logo" id="--puresdk-account-logo--"></div>\n        <div class="bac--header-search">\n            <input type="search" placeholder="Search" id="--puresdk--search--input--">\n            <i class="fa fa-search"></i>\n        </div>\n        <div class="bac--user-actions">\n            <div class="bac--user-apps" id="--puresdk-apps-section--">\n                <i class="fa fa-squares" id="--puresdk-apps-icon--"></i>\n\n                <div class="bac--apps-container" id="--puresdk-apps-container--">\n                    <div class="bac--apps-arrow"></div>\n                </div>\n            </div>\n            <!--<div class="bac&#45;&#45;user-notifications">-->\n                <!--<div class="bac&#45;&#45;user-notifications-count">1</div>-->\n                <!--<i class="fa fa-bell-o"></i>-->\n            <!--</div>-->\n            <div class="bac--user-avatar">\n                <span class="bac--user-avatar-name" id="--puresdk-user-avatar--"></span>\n            </div>\n        </div>\n    </div>\n</header>\n<div class="bac--user-sidebar" id="--puresdk-user-sidebar--">\n    <div id="--puresdk-user-details--"></div>\n    <!--<div class="bac&#45;&#45;user-sidebar-info">-->\n        <!--<div class="bac&#45;&#45;user-image"><i class="fa fa-camera"></i></div>-->\n        <!--<div class="bac&#45;&#45;user-name">Curtis Bartlett</div>-->\n        <!--<div class="bac&#45;&#45;user-email">cbartlett@pureprofile.com</div>-->\n    <!--</div>-->\n    <div class="bac--user-apps" id="--puresdk-user-businesses--">\n        <!--<div class="bac&#45;&#45;user-list-item">-->\n            <!--<img src="http://lorempixel.com/40/40" alt="">-->\n            <!--<div class="bac-user-app-details">-->\n                <!--<span></span>-->\n                <!--<span>15 team members</span>-->\n            <!--</div>-->\n        <!--</div>-->\n    </div>\n    <div class="bac--user-account-settings">\n        <div class="bac-user-acount-list-item">\n            <i class="fa fa-cog-line"></i>\n            <a href="#">Acount Security</a>\n        </div>\n        <div class="bac-user-acount-list-item">\n            <i class="fa fa-lock-line"></i>\n            <a href="#">Acount Security</a>\n        </div>\n        <div class="bac-user-acount-list-item">\n            <i class="fa fa-login-line"></i>\n            <a href="#">Acount Security</a>\n        </div>\n    </div>\n</div>');

window.PURESDK = ppba;

var css = 'html,body,div,span,applet,object,iframe,h1,h2,h3,h4,h5,h6,p,blockquote,pre,a,abbr,acronym,address,big,cite,code,del,dfn,em,img,ins,kbd,q,s,samp,small,strike,strong,sub,sup,tt,var,b,u,i,center,dl,dt,dd,ol,ul,li,fieldset,form,label,legend,table,caption,tbody,tfoot,thead,tr,th,td,article,aside,canvas,details,embed,figure,figcaption,footer,header,hgroup,menu,nav,output,ruby,section,summary,time,mark,audio,video{margin:0;padding:0;border:0;font-size:100%;font:inherit;vertical-align:baseline}article,aside,details,figcaption,figure,footer,header,hgroup,menu,nav,section{display:block}body{line-height:1}ol,ul{list-style:none}blockquote,q{quotes:none}blockquote:before,blockquote:after,q:before,q:after{content:"";content:none}table{border-collapse:collapse;border-spacing:0}body{overflow-x:hidden}#bac-wrapper{font-family:"Verdana", arial, sans-serif;color:white;min-height:100vh;position:relative}.bac--container{max-width:1160px;margin:0 auto}.bac--header-apps{position:absolute;width:100%;height:50px;background-color:#475369;padding:5px 0;z-index:2}.bac--header-apps .bac--container{height:100%;display:flex;align-items:center;justify-content:space-between}.bac--header-search{position:relative}.bac--header-search input{color:#fff;font-size:14px;height:35px;background-color:#6b7586;padding:0 5px 0 10px;border:none;border-radius:3px;min-width:400px;width:100%}.bac--header-search input:focus{outline:none}.bac--header-search input::-webkit-input-placeholder{font-style:normal !important;text-align:center;color:#fff;font-size:14px;font-weight:300;letter-spacing:0.5px}.bac--header-search input::-moz-placeholder{font-style:normal !important;text-align:center;color:#fff;font-size:14px;font-weight:300;letter-spacing:0.5px}.bac--header-search input:-ms-input-placeholder{font-style:normal !important;text-align:center;color:#fff;font-size:14px;font-weight:300;letter-spacing:0.5px}.bac--header-search i{position:absolute;top:8px;right:10px}.bac--user-actions{display:flex;align-items:center}.bac--user-actions>div{cursor:pointer;color:white}.bac--user-actions .bac--user-notifications{position:relative}.bac--user-actions .bac--user-notifications i{font-size:20px}.bac--user-actions .bac--user-notifications-count{position:absolute;display:inline-block;height:15px;width:15px;line-height:15px;color:#fff;font-size:10px;text-align:center;background-color:#fc3b30;border-radius:50%;top:-5px;left:-5px}.bac--user-actions .bac--user-avatar,.bac--user-actions .bac--user-notifications{margin-left:20px}.bac--user-actions .bac--user-avatar-name{color:#fff;background-color:#adadad;border-radius:50%;display:inline-block;height:30px;width:30px;line-height:30px;text-align:center;font-size:14px}.bac--user-apps{position:relative}.bac--apps-container{background:#fff;position:absolute;top:45px;right:-40px;display:flex;width:360px;flex-wrap:wrap;border-radius:10px;padding:30px;justify-content:space-between;text-align:center;-webkit-box-shadow:0 0 10px 2px rgba(0,0,0,0.2);box-shadow:0 0 10px 2px rgba(0,0,0,0.2);opacity:0;visibility:hidden;transition:all 0.4s ease}.bac--apps-container.active{opacity:1;visibility:visible}.bac--apps-container .bac--apps-arrow{position:absolute;display:block;height:20px;width:20px;top:-10px;right:36px;background:#fff;transform:rotate(-45deg);z-index:1}.bac--apps-container .bac--apps{width:32%;display:flex;font-size:30px;margin-bottom:40px;text-align:center;justify-content:center;flex-wrap:wrap}.bac--apps-container .bac--apps a{display:block;color:#fff;text-decoration:none;width:65px;height:65px;line-height:65px;text-align:center;border-radius:10px;-webkit-box-shadow:0 0 5px 0 rgba(0,0,0,0.2);box-shadow:0 0 5px 0 rgba(0,0,0,0.2)}.bac--apps-container .bac--apps .bac--app-name{width:100%;color:#000;font-size:18px;padding:10px 0}.bac--apps-container .bac--apps .bac--app-description{color:#919191;font-size:12px;font-style:italic}.bac--user-sidebar{font-family:"Verdana", arial, sans-serif;color:white;background-color:#515f77;box-sizing:border-box;width:320px;height:100%;position:absolute;top:0;right:0;z-index:1;padding-top:60px;opacity:0;transform:translateX(100%);transition:all 0.4s ease}.bac--user-sidebar.active{opacity:1;transform:translateX(0%)}.bac--user-sidebar .bac--user-list-item{display:flex;cursor:pointer;align-items:center;padding:10px 10px 10px 40px;border-bottom:2px solid #6b7586}.bac--user-sidebar .bac--user-list-item:hover{background-color:#6b7586}.bac--user-sidebar .bac--user-list-item img{margin-right:20px;border:2px solid #fff}.bac--user-sidebar .bac--user-list-item span{width:100%;display:block;margin-bottom:5px}.bac--user-sidebar .bac-user-app-details span{font-size:12px}.bac--user-sidebar-info{display:flex;justify-content:center;flex-wrap:wrap;text-align:center;padding:10px 20px 15px}.bac--user-sidebar-info .bac--user-image{display:inline-block;height:80px;width:80px;line-height:80px;text-align:center;color:#fff;border-radius:50%;background-color:#adadad;margin-bottom:15px}.bac--user-sidebar-info .bac--user-image i{font-size:32px}.bac--user-sidebar-info .bac--user-name{width:100%;text-align:center;font-size:18px;margin-bottom:10px}.bac--user-sidebar-info .bac--user-email{font-size:12px;font-weight:300}.bac--user-account-settings{padding:50px}.bac--user-account-settings .bac-user-acount-list-item{display:flex;align-items:center;margin-bottom:30px}.bac--user-account-settings .bac-user-acount-list-item a{text-decoration:none;color:#fff}.bac--user-account-settings .bac-user-acount-list-item i{font-size:24px;margin-right:20px}',
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
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uLy4uL25vZGVfbW9kdWxlcy9icm93c2VyLXBhY2svX3ByZWx1ZGUuanMiLCJQUEJBLmpzIiwiaW5kZXguanMiLCJtb2R1bGVzL2NhbGxlci5qcyIsIm1vZHVsZXMvZG9tLmpzIiwibW9kdWxlcy9sb2dnZXIuanMiLCJtb2R1bGVzL3B1YnN1Yi5qcyIsIm1vZHVsZXMvc3RvcmUuanMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7QUNBQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDN05BO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUM1Q0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUN2REE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUN0QkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDckJBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNyREE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQSIsImZpbGUiOiJnZW5lcmF0ZWQuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlc0NvbnRlbnQiOlsiKGZ1bmN0aW9uIGUodCxuLHIpe2Z1bmN0aW9uIHMobyx1KXtpZighbltvXSl7aWYoIXRbb10pe3ZhciBhPXR5cGVvZiByZXF1aXJlPT1cImZ1bmN0aW9uXCImJnJlcXVpcmU7aWYoIXUmJmEpcmV0dXJuIGEobywhMCk7aWYoaSlyZXR1cm4gaShvLCEwKTt2YXIgZj1uZXcgRXJyb3IoXCJDYW5ub3QgZmluZCBtb2R1bGUgJ1wiK28rXCInXCIpO3Rocm93IGYuY29kZT1cIk1PRFVMRV9OT1RfRk9VTkRcIixmfXZhciBsPW5bb109e2V4cG9ydHM6e319O3Rbb11bMF0uY2FsbChsLmV4cG9ydHMsZnVuY3Rpb24oZSl7dmFyIG49dFtvXVsxXVtlXTtyZXR1cm4gcyhuP246ZSl9LGwsbC5leHBvcnRzLGUsdCxuLHIpfXJldHVybiBuW29dLmV4cG9ydHN9dmFyIGk9dHlwZW9mIHJlcXVpcmU9PVwiZnVuY3Rpb25cIiYmcmVxdWlyZTtmb3IodmFyIG89MDtvPHIubGVuZ3RoO28rKylzKHJbb10pO3JldHVybiBzfSkiLCJ2YXIgTG9nZ2VyID0gcmVxdWlyZSgnLi9tb2R1bGVzL2xvZ2dlcicpO1xudmFyIFB1YlN1YiA9IHJlcXVpcmUoJy4vbW9kdWxlcy9wdWJzdWInKTtcbnZhciBDYWxsZXIgPSByZXF1aXJlKCcuL21vZHVsZXMvY2FsbGVyJyk7XG52YXIgU3RvcmUgPSByZXF1aXJlKCcuL21vZHVsZXMvc3RvcmUnKTtcbnZhciBEb20gPSByZXF1aXJlKCcuL21vZHVsZXMvZG9tJyk7XG52YXIgcHBiYUNvbmYgPSB7fTtcblxudmFyIGFmdGVyUmVuZGVyID0gZnVuY3Rpb24gYWZ0ZXJSZW5kZXIoKSB7XG5cdGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKCctLXB1cmVzZGstYXBwcy1pY29uLS0nKS5hZGRFdmVudExpc3RlbmVyKCdjbGljaycsIGZ1bmN0aW9uIChlKSB7XG5cdFx0ZS5zdG9wUHJvcGFnYXRpb24oKTtcblx0XHREb20udG9nZ2xlQ2xhc3MoZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoJy0tcHVyZXNkay1hcHBzLWNvbnRhaW5lci0tJyksICdhY3RpdmUnKTtcblx0fSk7XG5cblx0ZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoJy0tcHVyZXNkay11c2VyLWF2YXRhci0tJykuYWRkRXZlbnRMaXN0ZW5lcignY2xpY2snLCBmdW5jdGlvbiAoZSkge1xuXHRcdGUuc3RvcFByb3BhZ2F0aW9uKCk7XG5cdFx0RG9tLnJlbW92ZUNsYXNzKGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKCctLXB1cmVzZGstYXBwcy1jb250YWluZXItLScpLCAnYWN0aXZlJyk7XG5cdFx0RG9tLnRvZ2dsZUNsYXNzKGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKCctLXB1cmVzZGstdXNlci1zaWRlYmFyLS0nKSwgJ2FjdGl2ZScpO1xuXHR9KTtcblxuXHR3aW5kb3cuYWRkRXZlbnRMaXN0ZW5lcignY2xpY2snLCBmdW5jdGlvbiAoZSkge1xuXHRcdERvbS5yZW1vdmVDbGFzcyhkb2N1bWVudC5nZXRFbGVtZW50QnlJZCgnLS1wdXJlc2RrLWFwcHMtY29udGFpbmVyLS0nKSwgJ2FjdGl2ZScpO1xuXHRcdERvbS5yZW1vdmVDbGFzcyhkb2N1bWVudC5nZXRFbGVtZW50QnlJZCgnLS1wdXJlc2RrLXVzZXItc2lkZWJhci0tJyksICdhY3RpdmUnKTtcblx0fSk7XG59O1xuXG52YXIgUFBCQSA9IHtcblx0c2V0V2luZG93TmFtZTogZnVuY3Rpb24gc2V0V2luZG93TmFtZSh3bikge1xuXHRcdFN0b3JlLnNldFdpbmRvd05hbWUod24pO1xuXHR9LFxuXG5cdHNldENvbmZpZ3VyYXRpb246IGZ1bmN0aW9uIHNldENvbmZpZ3VyYXRpb24oY29uZikge1xuXHRcdFN0b3JlLnNldENvbmZpZ3VyYXRpb24oY29uZik7XG5cdH0sXG5cblx0c2V0SFRNTFRlbXBsYXRlOiBmdW5jdGlvbiBzZXRIVE1MVGVtcGxhdGUodGVtcGxhdGUpIHtcblx0XHRTdG9yZS5zZXRIVE1MVGVtcGxhdGUodGVtcGxhdGUpO1xuXHR9LFxuXG5cdGluaXQ6IGZ1bmN0aW9uIGluaXQoY29uZikge1xuXHRcdExvZ2dlci5sb2coJ2luaXRpYWxpemluZyB3aXRoIGNvbmY6ICcsIGNvbmYpO1xuXHRcdGlmIChjb25mKSB7XG5cdFx0XHRpZiAoY29uZi5oZWFkZXJEaXZJZCkge1xuXHRcdFx0XHRTdG9yZS5zZXRIVE1MQ29udGFpbmVyKGNvbmYuaGVhZGVyRGl2SWQpO1xuXHRcdFx0fVxuXHRcdFx0aWYgKGNvbmYuYXBwc1Zpc2libGUgIT09IG51bGwpIHtcblx0XHRcdFx0U3RvcmUuc2V0QXBwc1Zpc2libGUoY29uZi5hcHBzVmlzaWJsZSk7XG5cdFx0XHR9XG5cdFx0fVxuXHRcdHBwYmFDb25mID0gY29uZjtcblx0XHRyZXR1cm4gdHJ1ZTtcblx0fSxcblxuXHRhdXRoZW50aWNhdGU6IGZ1bmN0aW9uIGF1dGhlbnRpY2F0ZShfc3VjY2Vzcykge1xuXHRcdHZhciBzZWxmID0gUFBCQTtcblx0XHRDYWxsZXIubWFrZUNhbGwoe1xuXHRcdFx0dHlwZTogJ0dFVCcsXG5cdFx0XHRlbmRwb2ludDogU3RvcmUuZ2V0QXV0aGVudGljYXRpb25FbmRwb2ludCgpLFxuXHRcdFx0Y2FsbGJhY2tzOiB7XG5cdFx0XHRcdHN1Y2Nlc3M6IGZ1bmN0aW9uIHN1Y2Nlc3MocmVzdWx0KSB7XG5cdFx0XHRcdFx0TG9nZ2VyLmxvZyhyZXN1bHQpO1xuXHRcdFx0XHRcdFN0b3JlLnNldFVzZXJEYXRhKHJlc3VsdCk7XG5cdFx0XHRcdFx0c2VsZi5yZW5kZXIoKTtcblx0XHRcdFx0XHRQUEJBLmdldEFwcHMoKTtcblx0XHRcdFx0XHRfc3VjY2VzcyhyZXN1bHQpO1xuXHRcdFx0XHR9LFxuXHRcdFx0XHRmYWlsOiBmdW5jdGlvbiBmYWlsKGVycikge1xuXHRcdFx0XHRcdHdpbmRvdy5sb2NhdGlvbiA9IFN0b3JlLmdldExvZ2luVXJsKCk7XG5cdFx0XHRcdH1cblx0XHRcdH1cblx0XHR9KTtcblx0fSxcblxuXHRhdXRoZW50aWNhdGVQcm9taXNlOiBmdW5jdGlvbiBhdXRoZW50aWNhdGVQcm9taXNlKCkge1xuXHRcdHZhciBzZWxmID0gUFBCQTtcblx0XHRyZXR1cm4gQ2FsbGVyLnByb21pc2VDYWxsKHtcblx0XHRcdHR5cGU6ICdHRVQnLFxuXHRcdFx0ZW5kcG9pbnQ6IFN0b3JlLmdldEF1dGhlbnRpY2F0aW9uRW5kcG9pbnQoKSxcblx0XHRcdG1pZGRsZXdhcmVzOiB7XG5cdFx0XHRcdHN1Y2Nlc3M6IGZ1bmN0aW9uIHN1Y2Nlc3MocmVzdWx0KSB7XG5cdFx0XHRcdFx0TG9nZ2VyLmxvZyhyZXN1bHQpO1xuXHRcdFx0XHRcdFN0b3JlLnNldFVzZXJEYXRhKHJlc3VsdCk7XG5cdFx0XHRcdFx0c2VsZi5yZW5kZXIoKTtcblx0XHRcdFx0XHRQUEJBLmdldEFwcHMoKTtcblx0XHRcdFx0fVxuXHRcdFx0fVxuXHRcdH0pO1xuXHR9LFxuXG5cdGdldEFwcHM6IGZ1bmN0aW9uIGdldEFwcHMoKSB7XG5cdFx0Q2FsbGVyLm1ha2VDYWxsKHtcblx0XHRcdHR5cGU6ICdHRVQnLFxuXHRcdFx0ZW5kcG9pbnQ6IFN0b3JlLmdldEFwcHNFbmRwb2ludCgpLFxuXHRcdFx0Y2FsbGJhY2tzOiB7XG5cdFx0XHRcdHN1Y2Nlc3M6IGZ1bmN0aW9uIHN1Y2Nlc3MocmVzdWx0KSB7XG5cdFx0XHRcdFx0U3RvcmUuc2V0QXBwcyhyZXN1bHQpO1xuXHRcdFx0XHRcdFBQQkEucmVuZGVyQXBwcyhyZXN1bHQuYXBwcyk7XG5cdFx0XHRcdH0sXG5cdFx0XHRcdGZhaWw6IGZ1bmN0aW9uIGZhaWwoZXJyKSB7XG5cdFx0XHRcdFx0d2luZG93LmxvY2F0aW9uID0gU3RvcmUuZ2V0TG9naW5VcmwoKTtcblx0XHRcdFx0fVxuXHRcdFx0fVxuXHRcdH0pO1xuXHR9LFxuXG5cdGdldEF2YWlsYWJsZUxpc3RlbmVyczogZnVuY3Rpb24gZ2V0QXZhaWxhYmxlTGlzdGVuZXJzKCkge1xuXHRcdHJldHVybiBQdWJTdWIuZ2V0QXZhaWxhYmxlTGlzdGVuZXJzKCk7XG5cdH0sXG5cblx0c3Vic2NyaWJlTGlzdGVuZXI6IGZ1bmN0aW9uIHN1YnNjcmliZUxpc3RlbmVyKGV2ZW50dCwgZnVuY3QpIHtcblx0XHRyZXR1cm4gUHViU3ViLnN1YnNjcmliZShldmVudHQsIGZ1bmN0KTtcblx0fSxcblxuXHRnZXRVc2VyRGF0YTogZnVuY3Rpb24gZ2V0VXNlckRhdGEoKSB7XG5cdFx0cmV0dXJuIFN0b3JlLmdldFVzZXJEYXRhKCk7XG5cdH0sXG5cblx0c2V0SW5wdXRQbGFjZWhvbGRlcjogZnVuY3Rpb24gc2V0SW5wdXRQbGFjZWhvbGRlcih0eHQpIHtcblx0XHRkb2N1bWVudC5nZXRFbGVtZW50QnlJZChTdG9yZS5nZXRTZWFyY2hJbnB1dElkKCkpLnBsYWNlaG9sZGVyID0gdHh0O1xuXHR9LFxuXG5cdGNoYW5nZUFjY291bnQ6IGZ1bmN0aW9uIGNoYW5nZUFjY291bnQoYWNjb3VudElkKSB7XG5cdFx0Q2FsbGVyLm1ha2VDYWxsKHtcblx0XHRcdHR5cGU6ICdHRVQnLFxuXHRcdFx0ZW5kcG9pbnQ6IFN0b3JlLmdldFN3aXRjaEFjY291bnRFbmRwb2ludChhY2NvdW50SWQpLFxuXHRcdFx0Y2FsbGJhY2tzOiB7XG5cdFx0XHRcdHN1Y2Nlc3M6IGZ1bmN0aW9uIHN1Y2Nlc3MocmVzdWx0KSB7XG5cdFx0XHRcdFx0d2luZG93LmxvY2F0aW9uID0gJy9hcHBzJztcblx0XHRcdFx0fSxcblx0XHRcdFx0ZmFpbDogZnVuY3Rpb24gZmFpbChlcnIpIHtcblx0XHRcdFx0XHRhbGVydCgnU29ycnksIHNvbWV0aGluZyB3ZW50IHdyb25nIHdpdGggeW91ciByZXF1ZXN0LiBQbGVzZSB0cnkgYWdhaW4nKTtcblx0XHRcdFx0fVxuXHRcdFx0fVxuXHRcdH0pO1xuXHR9LFxuXG5cdHJlbmRlckFwcHM6IGZ1bmN0aW9uIHJlbmRlckFwcHMoYXBwcykge1xuXHRcdHZhciBhcHBUZW1wbGF0ZSA9IGZ1bmN0aW9uIGFwcFRlbXBsYXRlKGFwcCkge1xuXHRcdFx0cmV0dXJuICdcXG5cXHRcXHRcXHRcXHQ8YSBocmVmPVwiI1wiIHN0eWxlPVwiYmFja2dyb3VuZDogIycgKyBhcHAuY29sb3IgKyAnXCI+PGkgY2xhc3M9XCInICsgYXBwLmljb24gKyAnXCI+PC9pPjwvYT5cXG5cXHRcXHRcXHRcXHQ8c3BhbiBjbGFzcz1cImJhYy0tYXBwLW5hbWVcIj4nICsgYXBwLm5hbWUgKyAnPC9zcGFuPlxcblxcdFxcdFxcdFxcdDxzcGFuIGNsYXNzPVwiYmFjLS1hcHAtZGVzY3JpcHRpb25cIj4nICsgYXBwLmRlc2NyICsgJzwvc3Bhbj5cXG5cXHRcXHRcXHQnO1xuXHRcdH07XG5cblx0XHR2YXIgX2xvb3AgPSBmdW5jdGlvbiBfbG9vcChpKSB7XG5cdFx0XHR2YXIgYXBwID0gYXBwc1tpXTtcblx0XHRcdHZhciBkaXYgPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KFwiZGl2XCIpO1xuXHRcdFx0ZGl2LmNsYXNzTmFtZSA9IFwiYmFjLS1hcHBzXCI7XG5cdFx0XHRkaXYuaW5uZXJIVE1MID0gYXBwVGVtcGxhdGUoYXBwKTtcblx0XHRcdGRpdi5vbmNsaWNrID0gZnVuY3Rpb24gKGUpIHtcblx0XHRcdFx0ZS5wcmV2ZW50RGVmYXVsdCgpO1xuXHRcdFx0XHR3aW5kb3cubG9jYXRpb24gPSBhcHAuYXBwbGljYXRpb25fdXJsO1xuXHRcdFx0fTtcblx0XHRcdGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKFwiLS1wdXJlc2RrLWFwcHMtY29udGFpbmVyLS1cIikuYXBwZW5kQ2hpbGQoZGl2KTtcblx0XHR9O1xuXG5cdFx0Zm9yICh2YXIgaSA9IDA7IGkgPCBhcHBzLmxlbmd0aDsgaSsrKSB7XG5cdFx0XHRfbG9vcChpKTtcblx0XHR9XG5cdH0sXG5cblx0cmVuZGVyVXNlcjogZnVuY3Rpb24gcmVuZGVyVXNlcih1c2VyKSB7XG5cdFx0dmFyIHVzZXJUZW1wbGF0ZSA9IGZ1bmN0aW9uIHVzZXJUZW1wbGF0ZSh1c2VyKSB7XG5cdFx0XHRyZXR1cm4gJ1xcblxcdFxcdFxcdFxcdDxkaXYgY2xhc3M9XCJiYWMtLXVzZXItaW1hZ2VcIj48aSBjbGFzcz1cImZhIGZhLWNhbWVyYVwiPjwvaT48L2Rpdj5cXG5cXHRcXHRcXHRcXHQ8ZGl2IGNsYXNzPVwiYmFjLS11c2VyLW5hbWVcIj4nICsgdXNlci5maXJzdG5hbWUgKyAnICcgKyB1c2VyLmxhc3RuYW1lICsgJzwvZGl2PlxcblxcdFxcdFxcdFxcdDxkaXYgY2xhc3M9XCJiYWMtLXVzZXItZW1haWxcIj4nICsgdXNlci5lbWFpbCArICc8L2Rpdj5cXG5cXHRcXHRcXHQnO1xuXHRcdH07XG5cdFx0dmFyIGRpdiA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoJ2RpdicpO1xuXHRcdGRpdi5jbGFzc05hbWUgPSBcImJhYy0tdXNlci1zaWRlYmFyLWluZm9cIjtcblx0XHRkaXYuaW5uZXJIVE1MID0gdXNlclRlbXBsYXRlKHVzZXIpO1xuXHRcdGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKCctLXB1cmVzZGstdXNlci1kZXRhaWxzLS0nKS5hcHBlbmRDaGlsZChkaXYpO1xuXHRcdGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKCctLXB1cmVzZGstdXNlci1hdmF0YXItLScpLmlubmVySFRNTCA9IHVzZXIuZmlyc3RuYW1lLmNoYXJBdCgwKSArIHVzZXIubGFzdG5hbWUuY2hhckF0KDApO1xuXHR9LFxuXG5cdHJlbmRlckFjY291bnRzOiBmdW5jdGlvbiByZW5kZXJBY2NvdW50cyhhY2NvdW50cykge1xuXHRcdHZhciBhY2NvdW50c1RlbXBsYXRlID0gZnVuY3Rpb24gYWNjb3VudHNUZW1wbGF0ZShhY2NvdW50KSB7XG5cdFx0XHRyZXR1cm4gJ1xcblxcdFxcdFxcdFxcdDxpbWcgc3JjPVwiJyArIGFjY291bnQuc2RrX3NxdWFyZV9sb2dvX2ljb24gKyAnXCIgYWx0PVwiXCI+XFxuXFx0XFx0XFx0XFx0PGRpdiBjbGFzcz1cImJhYy11c2VyLWFwcC1kZXRhaWxzXCI+XFxuXFx0XFx0XFx0XFx0XFx0IDxzcGFuPicgKyBhY2NvdW50Lm5hbWUgKyAnPC9zcGFuPlxcblxcdFxcdFxcdFxcdFxcdCA8c3Bhbj4xNSB0ZWFtIG1lbWJlcnM8L3NwYW4+XFxuXFx0XFx0XFx0XFx0PC9kaXY+XFxuXFx0XFx0XFx0Jztcblx0XHR9O1xuXG5cdFx0dmFyIF9sb29wMiA9IGZ1bmN0aW9uIF9sb29wMihpKSB7XG5cdFx0XHR2YXIgYWNjb3VudCA9IGFjY291bnRzW2ldO1xuXHRcdFx0dmFyIGRpdiA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoJ2RpdicpO1xuXHRcdFx0ZGl2LmNsYXNzTmFtZSA9ICdiYWMtLXVzZXItbGlzdC1pdGVtJztcblx0XHRcdGRpdi5pbm5lckhUTUwgPSBhY2NvdW50c1RlbXBsYXRlKGFjY291bnQpO1xuXHRcdFx0ZGl2Lm9uY2xpY2sgPSBmdW5jdGlvbiAoZSkge1xuXHRcdFx0XHRlLnByZXZlbnREZWZhdWx0KCk7XG5cdFx0XHRcdFBQQkEuY2hhbmdlQWNjb3VudChhY2NvdW50LnNmaWQpO1xuXHRcdFx0fTtcblx0XHRcdGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKCctLXB1cmVzZGstdXNlci1idXNpbmVzc2VzLS0nKS5hcHBlbmRDaGlsZChkaXYpO1xuXHRcdH07XG5cblx0XHRmb3IgKHZhciBpID0gMDsgaSA8IGFjY291bnRzLmxlbmd0aDsgaSsrKSB7XG5cdFx0XHRfbG9vcDIoaSk7XG5cdFx0fVxuXHR9LFxuXG5cdHN0eWxlQWNjb3VudDogZnVuY3Rpb24gc3R5bGVBY2NvdW50KGFjY291bnQpIHtcblx0XHR2YXIgbG9nbyA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoJ2ltZycpO1xuXHRcdGxvZ28uc3JjID0gYWNjb3VudC5zZGtfbG9nb19pY29uO1xuXHRcdGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKCctLXB1cmVzZGstYWNjb3VudC1sb2dvLS0nKS5hcHBlbmRDaGlsZChsb2dvKTtcblx0XHRkb2N1bWVudC5nZXRFbGVtZW50QnlJZCgnLS1wdXJlc2RrLWJhYy0taGVhZGVyLWFwcHMtLScpLnN0eWxlLmNzc1RleHQgPSBcImJhY2tncm91bmQ6ICNcIiArIGFjY291bnQuc2RrX2JhY2tncm91bmRfY29sb3IgKyBcIjsgY29sb3I6ICNcIiArIGFjY291bnQuc2RrX2ZvbnRfY29sb3I7XG5cdFx0ZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoJy0tcHVyZXNkay11c2VyLXNpZGViYXItLScpLnN0eWxlLmNzc1RleHQgPSBcImJhY2tncm91bmQ6ICNcIiArIGFjY291bnQuc2RrX2JhY2tncm91bmRfY29sb3IgKyBcIjsgY29sb3I6ICNcIiArIGFjY291bnQuc2RrX2ZvbnRfY29sb3I7XG5cdFx0ZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoJy0tcHVyZXNkay0tc2VhcmNoLS1pbnB1dC0tJykuc3R5bGUuY3NzVGV4dCA9IFwiYmFja2dyb3VuZDogI1wiICsgYWNjb3VudC5zZGtfc2VhcmNoX2JhY2tncm91bmRfY29sb3IgKyBcIjsgY29sb3I6ICNcIiArIGFjY291bnQuc2RrX3NlYXJjaF9mb250X2NvbG9yO1xuXHR9LFxuXG5cdHJlbmRlcjogZnVuY3Rpb24gcmVuZGVyKCkge1xuXHRcdHZhciB3aGVyZVRvID0gZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoU3RvcmUuZ2V0SFRMTUNvbnRhaW5lcigpKTtcblx0XHRpZiAod2hlcmVUbyA9PT0gbnVsbCkge1xuXHRcdFx0TG9nZ2VyLmVycm9yKCd0aGUgY29udGFpbmVyIHdpdGggaWQgXCInICsgd2hlcmVUbyArICdcIiBoYXMgbm90IGJlZW4gZm91bmQgb24gdGhlIGRvY3VtZW50LiBUaGUgbGlicmFyeSBpcyBnb2luZyB0byBjcmVhdGUgaXQuJyk7XG5cdFx0XHR2YXIgZGl2ID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudCgnZGl2Jyk7XG5cdFx0XHRkaXYuaWQgPSBTdG9yZS5nZXRIVExNQ29udGFpbmVyKCk7XG5cdFx0XHRkaXYuc3R5bGUud2lkdGggPSAnMTAwJSc7XG5cdFx0XHRkaXYuc3R5bGUuaGVpZ2h0ID0gJzUwcHgnO1xuXHRcdFx0ZG9jdW1lbnQuYm9keS5pbnNlcnRCZWZvcmUoZGl2LCBkb2N1bWVudC5ib2R5LmZpcnN0Q2hpbGQpO1xuXHRcdFx0d2hlcmVUbyA9IGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKFN0b3JlLmdldEhUTE1Db250YWluZXIoKSk7XG5cdFx0fVxuXHRcdHdoZXJlVG8uaW5uZXJIVE1MID0gU3RvcmUuZ2V0SFRNTCgpO1xuXHRcdFBQQkEuc3R5bGVBY2NvdW50KFN0b3JlLmdldFVzZXJEYXRhKCkudXNlci5hY2NvdW50KTtcblx0XHRQUEJBLnJlbmRlclVzZXIoU3RvcmUuZ2V0VXNlckRhdGEoKS51c2VyKTtcblx0XHRQUEJBLnJlbmRlckFjY291bnRzKFN0b3JlLmdldFVzZXJEYXRhKCkudXNlci5hY2NvdW50cyk7XG5cdFx0aWYgKFN0b3JlLmdldEFwcHNWaXNpYmxlKCkgPT09IGZhbHNlKSB7XG5cdFx0XHRkb2N1bWVudC5nZXRFbGVtZW50QnlJZCgnLS1wdXJlc2RrLWFwcHMtc2VjdGlvbi0tJykuc3R5bGUuY3NzVGV4dCA9IFwiZGlzcGxheTpub25lXCI7XG5cdFx0fVxuXHRcdGFmdGVyUmVuZGVyKCk7XG5cdH1cbn07XG5cbm1vZHVsZS5leHBvcnRzID0gUFBCQTsiLCIndXNlIHN0cmljdCc7XG5cbi8qIVxuICogUHVyZVByb2ZpbGUgUHVyZVByb2ZpbGUgQnVzaW5lc3MgQXBwcyBEZXZlbG9wbWVudCBTREtcbiAqXG4gKiB2ZXJzaW9uOiAxLjEuMFxuICogZGF0ZTogMjAxNy0wNC0wM1xuICpcbiAqIENvcHlyaWdodCAyMDE3LCBQdXJlUHJvZmlsZVxuICogUmVsZWFzZWQgdW5kZXIgTUlUIGxpY2Vuc2VcbiAqIGh0dHBzOi8vb3BlbnNvdXJjZS5vcmcvbGljZW5zZXMvTUlUXG4gKi9cblxudmFyIHBwYmEgPSByZXF1aXJlKCcuL1BQQkEnKTtcbnBwYmEuc2V0V2luZG93TmFtZSgnUFVSRVNESycpO1xucHBiYS5zZXRDb25maWd1cmF0aW9uKHtcbiAgICBcImxvZ3NcIjogZmFsc2UsXG4gICAgXCJiYXNlVXJsXCI6IFwiL2FwaS92MS9cIixcbiAgICBcImxvZ2luVXJsXCI6IFwiL2FwaS92MS9vYXV0aDJcIixcbiAgICBcInNlYXJjaElucHV0SWRcIjogXCItLXB1cmVzZGstLXNlYXJjaC0taW5wdXQtLVwiLFxuICAgIFwicmVkaXJlY3RVcmxQYXJhbVwiOiBcInJlZGlyZWN0X3VybFwiXG59KTtcbnBwYmEuc2V0SFRNTFRlbXBsYXRlKCc8aGVhZGVyIGNsYXNzPVwiYmFjLS1oZWFkZXItYXBwc1wiIGlkPVwiLS1wdXJlc2RrLWJhYy0taGVhZGVyLWFwcHMtLVwiPlxcbiAgICA8ZGl2IGNsYXNzPVwiYmFjLS1jb250YWluZXJcIj5cXG4gICAgICAgIDxkaXYgY2xhc3M9XCJiYWMtLWxvZ29cIiBpZD1cIi0tcHVyZXNkay1hY2NvdW50LWxvZ28tLVwiPjwvZGl2PlxcbiAgICAgICAgPGRpdiBjbGFzcz1cImJhYy0taGVhZGVyLXNlYXJjaFwiPlxcbiAgICAgICAgICAgIDxpbnB1dCB0eXBlPVwic2VhcmNoXCIgcGxhY2Vob2xkZXI9XCJTZWFyY2hcIiBpZD1cIi0tcHVyZXNkay0tc2VhcmNoLS1pbnB1dC0tXCI+XFxuICAgICAgICAgICAgPGkgY2xhc3M9XCJmYSBmYS1zZWFyY2hcIj48L2k+XFxuICAgICAgICA8L2Rpdj5cXG4gICAgICAgIDxkaXYgY2xhc3M9XCJiYWMtLXVzZXItYWN0aW9uc1wiPlxcbiAgICAgICAgICAgIDxkaXYgY2xhc3M9XCJiYWMtLXVzZXItYXBwc1wiIGlkPVwiLS1wdXJlc2RrLWFwcHMtc2VjdGlvbi0tXCI+XFxuICAgICAgICAgICAgICAgIDxpIGNsYXNzPVwiZmEgZmEtc3F1YXJlc1wiIGlkPVwiLS1wdXJlc2RrLWFwcHMtaWNvbi0tXCI+PC9pPlxcblxcbiAgICAgICAgICAgICAgICA8ZGl2IGNsYXNzPVwiYmFjLS1hcHBzLWNvbnRhaW5lclwiIGlkPVwiLS1wdXJlc2RrLWFwcHMtY29udGFpbmVyLS1cIj5cXG4gICAgICAgICAgICAgICAgICAgIDxkaXYgY2xhc3M9XCJiYWMtLWFwcHMtYXJyb3dcIj48L2Rpdj5cXG4gICAgICAgICAgICAgICAgPC9kaXY+XFxuICAgICAgICAgICAgPC9kaXY+XFxuICAgICAgICAgICAgPCEtLTxkaXYgY2xhc3M9XCJiYWMmIzQ1OyYjNDU7dXNlci1ub3RpZmljYXRpb25zXCI+LS0+XFxuICAgICAgICAgICAgICAgIDwhLS08ZGl2IGNsYXNzPVwiYmFjJiM0NTsmIzQ1O3VzZXItbm90aWZpY2F0aW9ucy1jb3VudFwiPjE8L2Rpdj4tLT5cXG4gICAgICAgICAgICAgICAgPCEtLTxpIGNsYXNzPVwiZmEgZmEtYmVsbC1vXCI+PC9pPi0tPlxcbiAgICAgICAgICAgIDwhLS08L2Rpdj4tLT5cXG4gICAgICAgICAgICA8ZGl2IGNsYXNzPVwiYmFjLS11c2VyLWF2YXRhclwiPlxcbiAgICAgICAgICAgICAgICA8c3BhbiBjbGFzcz1cImJhYy0tdXNlci1hdmF0YXItbmFtZVwiIGlkPVwiLS1wdXJlc2RrLXVzZXItYXZhdGFyLS1cIj48L3NwYW4+XFxuICAgICAgICAgICAgPC9kaXY+XFxuICAgICAgICA8L2Rpdj5cXG4gICAgPC9kaXY+XFxuPC9oZWFkZXI+XFxuPGRpdiBjbGFzcz1cImJhYy0tdXNlci1zaWRlYmFyXCIgaWQ9XCItLXB1cmVzZGstdXNlci1zaWRlYmFyLS1cIj5cXG4gICAgPGRpdiBpZD1cIi0tcHVyZXNkay11c2VyLWRldGFpbHMtLVwiPjwvZGl2PlxcbiAgICA8IS0tPGRpdiBjbGFzcz1cImJhYyYjNDU7JiM0NTt1c2VyLXNpZGViYXItaW5mb1wiPi0tPlxcbiAgICAgICAgPCEtLTxkaXYgY2xhc3M9XCJiYWMmIzQ1OyYjNDU7dXNlci1pbWFnZVwiPjxpIGNsYXNzPVwiZmEgZmEtY2FtZXJhXCI+PC9pPjwvZGl2Pi0tPlxcbiAgICAgICAgPCEtLTxkaXYgY2xhc3M9XCJiYWMmIzQ1OyYjNDU7dXNlci1uYW1lXCI+Q3VydGlzIEJhcnRsZXR0PC9kaXY+LS0+XFxuICAgICAgICA8IS0tPGRpdiBjbGFzcz1cImJhYyYjNDU7JiM0NTt1c2VyLWVtYWlsXCI+Y2JhcnRsZXR0QHB1cmVwcm9maWxlLmNvbTwvZGl2Pi0tPlxcbiAgICA8IS0tPC9kaXY+LS0+XFxuICAgIDxkaXYgY2xhc3M9XCJiYWMtLXVzZXItYXBwc1wiIGlkPVwiLS1wdXJlc2RrLXVzZXItYnVzaW5lc3Nlcy0tXCI+XFxuICAgICAgICA8IS0tPGRpdiBjbGFzcz1cImJhYyYjNDU7JiM0NTt1c2VyLWxpc3QtaXRlbVwiPi0tPlxcbiAgICAgICAgICAgIDwhLS08aW1nIHNyYz1cImh0dHA6Ly9sb3JlbXBpeGVsLmNvbS80MC80MFwiIGFsdD1cIlwiPi0tPlxcbiAgICAgICAgICAgIDwhLS08ZGl2IGNsYXNzPVwiYmFjLXVzZXItYXBwLWRldGFpbHNcIj4tLT5cXG4gICAgICAgICAgICAgICAgPCEtLTxzcGFuPjwvc3Bhbj4tLT5cXG4gICAgICAgICAgICAgICAgPCEtLTxzcGFuPjE1IHRlYW0gbWVtYmVyczwvc3Bhbj4tLT5cXG4gICAgICAgICAgICA8IS0tPC9kaXY+LS0+XFxuICAgICAgICA8IS0tPC9kaXY+LS0+XFxuICAgIDwvZGl2PlxcbiAgICA8ZGl2IGNsYXNzPVwiYmFjLS11c2VyLWFjY291bnQtc2V0dGluZ3NcIj5cXG4gICAgICAgIDxkaXYgY2xhc3M9XCJiYWMtdXNlci1hY291bnQtbGlzdC1pdGVtXCI+XFxuICAgICAgICAgICAgPGkgY2xhc3M9XCJmYSBmYS1jb2ctbGluZVwiPjwvaT5cXG4gICAgICAgICAgICA8YSBocmVmPVwiI1wiPkFjb3VudCBTZWN1cml0eTwvYT5cXG4gICAgICAgIDwvZGl2PlxcbiAgICAgICAgPGRpdiBjbGFzcz1cImJhYy11c2VyLWFjb3VudC1saXN0LWl0ZW1cIj5cXG4gICAgICAgICAgICA8aSBjbGFzcz1cImZhIGZhLWxvY2stbGluZVwiPjwvaT5cXG4gICAgICAgICAgICA8YSBocmVmPVwiI1wiPkFjb3VudCBTZWN1cml0eTwvYT5cXG4gICAgICAgIDwvZGl2PlxcbiAgICAgICAgPGRpdiBjbGFzcz1cImJhYy11c2VyLWFjb3VudC1saXN0LWl0ZW1cIj5cXG4gICAgICAgICAgICA8aSBjbGFzcz1cImZhIGZhLWxvZ2luLWxpbmVcIj48L2k+XFxuICAgICAgICAgICAgPGEgaHJlZj1cIiNcIj5BY291bnQgU2VjdXJpdHk8L2E+XFxuICAgICAgICA8L2Rpdj5cXG4gICAgPC9kaXY+XFxuPC9kaXY+Jyk7XG5cbndpbmRvdy5QVVJFU0RLID0gcHBiYTtcblxudmFyIGNzcyA9ICdodG1sLGJvZHksZGl2LHNwYW4sYXBwbGV0LG9iamVjdCxpZnJhbWUsaDEsaDIsaDMsaDQsaDUsaDYscCxibG9ja3F1b3RlLHByZSxhLGFiYnIsYWNyb255bSxhZGRyZXNzLGJpZyxjaXRlLGNvZGUsZGVsLGRmbixlbSxpbWcsaW5zLGtiZCxxLHMsc2FtcCxzbWFsbCxzdHJpa2Usc3Ryb25nLHN1YixzdXAsdHQsdmFyLGIsdSxpLGNlbnRlcixkbCxkdCxkZCxvbCx1bCxsaSxmaWVsZHNldCxmb3JtLGxhYmVsLGxlZ2VuZCx0YWJsZSxjYXB0aW9uLHRib2R5LHRmb290LHRoZWFkLHRyLHRoLHRkLGFydGljbGUsYXNpZGUsY2FudmFzLGRldGFpbHMsZW1iZWQsZmlndXJlLGZpZ2NhcHRpb24sZm9vdGVyLGhlYWRlcixoZ3JvdXAsbWVudSxuYXYsb3V0cHV0LHJ1Ynksc2VjdGlvbixzdW1tYXJ5LHRpbWUsbWFyayxhdWRpbyx2aWRlb3ttYXJnaW46MDtwYWRkaW5nOjA7Ym9yZGVyOjA7Zm9udC1zaXplOjEwMCU7Zm9udDppbmhlcml0O3ZlcnRpY2FsLWFsaWduOmJhc2VsaW5lfWFydGljbGUsYXNpZGUsZGV0YWlscyxmaWdjYXB0aW9uLGZpZ3VyZSxmb290ZXIsaGVhZGVyLGhncm91cCxtZW51LG5hdixzZWN0aW9ue2Rpc3BsYXk6YmxvY2t9Ym9keXtsaW5lLWhlaWdodDoxfW9sLHVse2xpc3Qtc3R5bGU6bm9uZX1ibG9ja3F1b3RlLHF7cXVvdGVzOm5vbmV9YmxvY2txdW90ZTpiZWZvcmUsYmxvY2txdW90ZTphZnRlcixxOmJlZm9yZSxxOmFmdGVye2NvbnRlbnQ6XCJcIjtjb250ZW50Om5vbmV9dGFibGV7Ym9yZGVyLWNvbGxhcHNlOmNvbGxhcHNlO2JvcmRlci1zcGFjaW5nOjB9Ym9keXtvdmVyZmxvdy14OmhpZGRlbn0jYmFjLXdyYXBwZXJ7Zm9udC1mYW1pbHk6XCJWZXJkYW5hXCIsIGFyaWFsLCBzYW5zLXNlcmlmO2NvbG9yOndoaXRlO21pbi1oZWlnaHQ6MTAwdmg7cG9zaXRpb246cmVsYXRpdmV9LmJhYy0tY29udGFpbmVye21heC13aWR0aDoxMTYwcHg7bWFyZ2luOjAgYXV0b30uYmFjLS1oZWFkZXItYXBwc3twb3NpdGlvbjphYnNvbHV0ZTt3aWR0aDoxMDAlO2hlaWdodDo1MHB4O2JhY2tncm91bmQtY29sb3I6IzQ3NTM2OTtwYWRkaW5nOjVweCAwO3otaW5kZXg6Mn0uYmFjLS1oZWFkZXItYXBwcyAuYmFjLS1jb250YWluZXJ7aGVpZ2h0OjEwMCU7ZGlzcGxheTpmbGV4O2FsaWduLWl0ZW1zOmNlbnRlcjtqdXN0aWZ5LWNvbnRlbnQ6c3BhY2UtYmV0d2Vlbn0uYmFjLS1oZWFkZXItc2VhcmNoe3Bvc2l0aW9uOnJlbGF0aXZlfS5iYWMtLWhlYWRlci1zZWFyY2ggaW5wdXR7Y29sb3I6I2ZmZjtmb250LXNpemU6MTRweDtoZWlnaHQ6MzVweDtiYWNrZ3JvdW5kLWNvbG9yOiM2Yjc1ODY7cGFkZGluZzowIDVweCAwIDEwcHg7Ym9yZGVyOm5vbmU7Ym9yZGVyLXJhZGl1czozcHg7bWluLXdpZHRoOjQwMHB4O3dpZHRoOjEwMCV9LmJhYy0taGVhZGVyLXNlYXJjaCBpbnB1dDpmb2N1c3tvdXRsaW5lOm5vbmV9LmJhYy0taGVhZGVyLXNlYXJjaCBpbnB1dDo6LXdlYmtpdC1pbnB1dC1wbGFjZWhvbGRlcntmb250LXN0eWxlOm5vcm1hbCAhaW1wb3J0YW50O3RleHQtYWxpZ246Y2VudGVyO2NvbG9yOiNmZmY7Zm9udC1zaXplOjE0cHg7Zm9udC13ZWlnaHQ6MzAwO2xldHRlci1zcGFjaW5nOjAuNXB4fS5iYWMtLWhlYWRlci1zZWFyY2ggaW5wdXQ6Oi1tb3otcGxhY2Vob2xkZXJ7Zm9udC1zdHlsZTpub3JtYWwgIWltcG9ydGFudDt0ZXh0LWFsaWduOmNlbnRlcjtjb2xvcjojZmZmO2ZvbnQtc2l6ZToxNHB4O2ZvbnQtd2VpZ2h0OjMwMDtsZXR0ZXItc3BhY2luZzowLjVweH0uYmFjLS1oZWFkZXItc2VhcmNoIGlucHV0Oi1tcy1pbnB1dC1wbGFjZWhvbGRlcntmb250LXN0eWxlOm5vcm1hbCAhaW1wb3J0YW50O3RleHQtYWxpZ246Y2VudGVyO2NvbG9yOiNmZmY7Zm9udC1zaXplOjE0cHg7Zm9udC13ZWlnaHQ6MzAwO2xldHRlci1zcGFjaW5nOjAuNXB4fS5iYWMtLWhlYWRlci1zZWFyY2ggaXtwb3NpdGlvbjphYnNvbHV0ZTt0b3A6OHB4O3JpZ2h0OjEwcHh9LmJhYy0tdXNlci1hY3Rpb25ze2Rpc3BsYXk6ZmxleDthbGlnbi1pdGVtczpjZW50ZXJ9LmJhYy0tdXNlci1hY3Rpb25zPmRpdntjdXJzb3I6cG9pbnRlcjtjb2xvcjp3aGl0ZX0uYmFjLS11c2VyLWFjdGlvbnMgLmJhYy0tdXNlci1ub3RpZmljYXRpb25ze3Bvc2l0aW9uOnJlbGF0aXZlfS5iYWMtLXVzZXItYWN0aW9ucyAuYmFjLS11c2VyLW5vdGlmaWNhdGlvbnMgaXtmb250LXNpemU6MjBweH0uYmFjLS11c2VyLWFjdGlvbnMgLmJhYy0tdXNlci1ub3RpZmljYXRpb25zLWNvdW50e3Bvc2l0aW9uOmFic29sdXRlO2Rpc3BsYXk6aW5saW5lLWJsb2NrO2hlaWdodDoxNXB4O3dpZHRoOjE1cHg7bGluZS1oZWlnaHQ6MTVweDtjb2xvcjojZmZmO2ZvbnQtc2l6ZToxMHB4O3RleHQtYWxpZ246Y2VudGVyO2JhY2tncm91bmQtY29sb3I6I2ZjM2IzMDtib3JkZXItcmFkaXVzOjUwJTt0b3A6LTVweDtsZWZ0Oi01cHh9LmJhYy0tdXNlci1hY3Rpb25zIC5iYWMtLXVzZXItYXZhdGFyLC5iYWMtLXVzZXItYWN0aW9ucyAuYmFjLS11c2VyLW5vdGlmaWNhdGlvbnN7bWFyZ2luLWxlZnQ6MjBweH0uYmFjLS11c2VyLWFjdGlvbnMgLmJhYy0tdXNlci1hdmF0YXItbmFtZXtjb2xvcjojZmZmO2JhY2tncm91bmQtY29sb3I6I2FkYWRhZDtib3JkZXItcmFkaXVzOjUwJTtkaXNwbGF5OmlubGluZS1ibG9jaztoZWlnaHQ6MzBweDt3aWR0aDozMHB4O2xpbmUtaGVpZ2h0OjMwcHg7dGV4dC1hbGlnbjpjZW50ZXI7Zm9udC1zaXplOjE0cHh9LmJhYy0tdXNlci1hcHBze3Bvc2l0aW9uOnJlbGF0aXZlfS5iYWMtLWFwcHMtY29udGFpbmVye2JhY2tncm91bmQ6I2ZmZjtwb3NpdGlvbjphYnNvbHV0ZTt0b3A6NDVweDtyaWdodDotNDBweDtkaXNwbGF5OmZsZXg7d2lkdGg6MzYwcHg7ZmxleC13cmFwOndyYXA7Ym9yZGVyLXJhZGl1czoxMHB4O3BhZGRpbmc6MzBweDtqdXN0aWZ5LWNvbnRlbnQ6c3BhY2UtYmV0d2Vlbjt0ZXh0LWFsaWduOmNlbnRlcjstd2Via2l0LWJveC1zaGFkb3c6MCAwIDEwcHggMnB4IHJnYmEoMCwwLDAsMC4yKTtib3gtc2hhZG93OjAgMCAxMHB4IDJweCByZ2JhKDAsMCwwLDAuMik7b3BhY2l0eTowO3Zpc2liaWxpdHk6aGlkZGVuO3RyYW5zaXRpb246YWxsIDAuNHMgZWFzZX0uYmFjLS1hcHBzLWNvbnRhaW5lci5hY3RpdmV7b3BhY2l0eToxO3Zpc2liaWxpdHk6dmlzaWJsZX0uYmFjLS1hcHBzLWNvbnRhaW5lciAuYmFjLS1hcHBzLWFycm93e3Bvc2l0aW9uOmFic29sdXRlO2Rpc3BsYXk6YmxvY2s7aGVpZ2h0OjIwcHg7d2lkdGg6MjBweDt0b3A6LTEwcHg7cmlnaHQ6MzZweDtiYWNrZ3JvdW5kOiNmZmY7dHJhbnNmb3JtOnJvdGF0ZSgtNDVkZWcpO3otaW5kZXg6MX0uYmFjLS1hcHBzLWNvbnRhaW5lciAuYmFjLS1hcHBze3dpZHRoOjMyJTtkaXNwbGF5OmZsZXg7Zm9udC1zaXplOjMwcHg7bWFyZ2luLWJvdHRvbTo0MHB4O3RleHQtYWxpZ246Y2VudGVyO2p1c3RpZnktY29udGVudDpjZW50ZXI7ZmxleC13cmFwOndyYXB9LmJhYy0tYXBwcy1jb250YWluZXIgLmJhYy0tYXBwcyBhe2Rpc3BsYXk6YmxvY2s7Y29sb3I6I2ZmZjt0ZXh0LWRlY29yYXRpb246bm9uZTt3aWR0aDo2NXB4O2hlaWdodDo2NXB4O2xpbmUtaGVpZ2h0OjY1cHg7dGV4dC1hbGlnbjpjZW50ZXI7Ym9yZGVyLXJhZGl1czoxMHB4Oy13ZWJraXQtYm94LXNoYWRvdzowIDAgNXB4IDAgcmdiYSgwLDAsMCwwLjIpO2JveC1zaGFkb3c6MCAwIDVweCAwIHJnYmEoMCwwLDAsMC4yKX0uYmFjLS1hcHBzLWNvbnRhaW5lciAuYmFjLS1hcHBzIC5iYWMtLWFwcC1uYW1le3dpZHRoOjEwMCU7Y29sb3I6IzAwMDtmb250LXNpemU6MThweDtwYWRkaW5nOjEwcHggMH0uYmFjLS1hcHBzLWNvbnRhaW5lciAuYmFjLS1hcHBzIC5iYWMtLWFwcC1kZXNjcmlwdGlvbntjb2xvcjojOTE5MTkxO2ZvbnQtc2l6ZToxMnB4O2ZvbnQtc3R5bGU6aXRhbGljfS5iYWMtLXVzZXItc2lkZWJhcntmb250LWZhbWlseTpcIlZlcmRhbmFcIiwgYXJpYWwsIHNhbnMtc2VyaWY7Y29sb3I6d2hpdGU7YmFja2dyb3VuZC1jb2xvcjojNTE1Zjc3O2JveC1zaXppbmc6Ym9yZGVyLWJveDt3aWR0aDozMjBweDtoZWlnaHQ6MTAwJTtwb3NpdGlvbjphYnNvbHV0ZTt0b3A6MDtyaWdodDowO3otaW5kZXg6MTtwYWRkaW5nLXRvcDo2MHB4O29wYWNpdHk6MDt0cmFuc2Zvcm06dHJhbnNsYXRlWCgxMDAlKTt0cmFuc2l0aW9uOmFsbCAwLjRzIGVhc2V9LmJhYy0tdXNlci1zaWRlYmFyLmFjdGl2ZXtvcGFjaXR5OjE7dHJhbnNmb3JtOnRyYW5zbGF0ZVgoMCUpfS5iYWMtLXVzZXItc2lkZWJhciAuYmFjLS11c2VyLWxpc3QtaXRlbXtkaXNwbGF5OmZsZXg7Y3Vyc29yOnBvaW50ZXI7YWxpZ24taXRlbXM6Y2VudGVyO3BhZGRpbmc6MTBweCAxMHB4IDEwcHggNDBweDtib3JkZXItYm90dG9tOjJweCBzb2xpZCAjNmI3NTg2fS5iYWMtLXVzZXItc2lkZWJhciAuYmFjLS11c2VyLWxpc3QtaXRlbTpob3ZlcntiYWNrZ3JvdW5kLWNvbG9yOiM2Yjc1ODZ9LmJhYy0tdXNlci1zaWRlYmFyIC5iYWMtLXVzZXItbGlzdC1pdGVtIGltZ3ttYXJnaW4tcmlnaHQ6MjBweDtib3JkZXI6MnB4IHNvbGlkICNmZmZ9LmJhYy0tdXNlci1zaWRlYmFyIC5iYWMtLXVzZXItbGlzdC1pdGVtIHNwYW57d2lkdGg6MTAwJTtkaXNwbGF5OmJsb2NrO21hcmdpbi1ib3R0b206NXB4fS5iYWMtLXVzZXItc2lkZWJhciAuYmFjLXVzZXItYXBwLWRldGFpbHMgc3Bhbntmb250LXNpemU6MTJweH0uYmFjLS11c2VyLXNpZGViYXItaW5mb3tkaXNwbGF5OmZsZXg7anVzdGlmeS1jb250ZW50OmNlbnRlcjtmbGV4LXdyYXA6d3JhcDt0ZXh0LWFsaWduOmNlbnRlcjtwYWRkaW5nOjEwcHggMjBweCAxNXB4fS5iYWMtLXVzZXItc2lkZWJhci1pbmZvIC5iYWMtLXVzZXItaW1hZ2V7ZGlzcGxheTppbmxpbmUtYmxvY2s7aGVpZ2h0OjgwcHg7d2lkdGg6ODBweDtsaW5lLWhlaWdodDo4MHB4O3RleHQtYWxpZ246Y2VudGVyO2NvbG9yOiNmZmY7Ym9yZGVyLXJhZGl1czo1MCU7YmFja2dyb3VuZC1jb2xvcjojYWRhZGFkO21hcmdpbi1ib3R0b206MTVweH0uYmFjLS11c2VyLXNpZGViYXItaW5mbyAuYmFjLS11c2VyLWltYWdlIGl7Zm9udC1zaXplOjMycHh9LmJhYy0tdXNlci1zaWRlYmFyLWluZm8gLmJhYy0tdXNlci1uYW1le3dpZHRoOjEwMCU7dGV4dC1hbGlnbjpjZW50ZXI7Zm9udC1zaXplOjE4cHg7bWFyZ2luLWJvdHRvbToxMHB4fS5iYWMtLXVzZXItc2lkZWJhci1pbmZvIC5iYWMtLXVzZXItZW1haWx7Zm9udC1zaXplOjEycHg7Zm9udC13ZWlnaHQ6MzAwfS5iYWMtLXVzZXItYWNjb3VudC1zZXR0aW5nc3twYWRkaW5nOjUwcHh9LmJhYy0tdXNlci1hY2NvdW50LXNldHRpbmdzIC5iYWMtdXNlci1hY291bnQtbGlzdC1pdGVte2Rpc3BsYXk6ZmxleDthbGlnbi1pdGVtczpjZW50ZXI7bWFyZ2luLWJvdHRvbTozMHB4fS5iYWMtLXVzZXItYWNjb3VudC1zZXR0aW5ncyAuYmFjLXVzZXItYWNvdW50LWxpc3QtaXRlbSBhe3RleHQtZGVjb3JhdGlvbjpub25lO2NvbG9yOiNmZmZ9LmJhYy0tdXNlci1hY2NvdW50LXNldHRpbmdzIC5iYWMtdXNlci1hY291bnQtbGlzdC1pdGVtIGl7Zm9udC1zaXplOjI0cHg7bWFyZ2luLXJpZ2h0OjIwcHh9JyxcbiAgICBoZWFkID0gZG9jdW1lbnQuaGVhZCB8fCBkb2N1bWVudC5nZXRFbGVtZW50c0J5VGFnTmFtZSgnaGVhZCcpWzBdLFxuICAgIHN0eWxlID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudCgnc3R5bGUnKTtcblxuc3R5bGUudHlwZSA9ICd0ZXh0L2Nzcyc7XG5pZiAoc3R5bGUuc3R5bGVTaGVldCkge1xuICAgIHN0eWxlLnN0eWxlU2hlZXQuY3NzVGV4dCA9IGNzcztcbn0gZWxzZSB7XG4gICAgc3R5bGUuYXBwZW5kQ2hpbGQoZG9jdW1lbnQuY3JlYXRlVGV4dE5vZGUoY3NzKSk7XG59XG5oZWFkLmFwcGVuZENoaWxkKHN0eWxlKTtcblxudmFyIGxpbmsgPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KCdsaW5rJyk7XG5saW5rLmhyZWYgPSAnaHR0cHM6Ly9maWxlLm15Zm9udGFzdGljLmNvbS9NRHZuUkpHaEJkNXhWY1huNHVRSlNaL2ljb25zLmNzcyc7XG5saW5rLnJlbCA9ICdzdHlsZXNoZWV0JztcblxuZG9jdW1lbnQuZ2V0RWxlbWVudHNCeVRhZ05hbWUoJ2hlYWQnKVswXS5hcHBlbmRDaGlsZChsaW5rKTtcblxubW9kdWxlLmV4cG9ydHMgPSBwcGJhOyIsInZhciBTdG9yZSA9IHJlcXVpcmUoJy4vc3RvcmUuanMnKTtcbnZhciBMb2dnZXIgPSByZXF1aXJlKCcuL2xvZ2dlcicpO1xuXG52YXIgQ2FsbGVyID0ge1xuXHQvKlxuIGV4cGVjdGUgYXR0cmlidXRlczpcbiAtIHR5cGUgKGVpdGhlciBHRVQsIFBPU1QsIERFTEVURSwgUFVUKVxuIC0gZW5kcG9pbnRcbiAtIHBhcmFtcyAoaWYgYW55LiBBIGpzb24gd2l0aCBwYXJhbWV0ZXJzIHRvIGJlIHBhc3NlZCBiYWNrIHRvIHRoZSBlbmRwb2ludClcbiAtIGNhbGxiYWNrczogYW4gb2JqZWN0IHdpdGg6XG4gXHQtIHN1Y2Nlc3M6IHRoZSBzdWNjZXNzIGNhbGxiYWNrXG4gXHQtIGZhaWw6IHRoZSBmYWlsIGNhbGxiYWNrXG4gICovXG5cdG1ha2VDYWxsOiBmdW5jdGlvbiBtYWtlQ2FsbChhdHRycykge1xuXHRcdHZhciBlbmRwb2ludFVybCA9IGF0dHJzLmVuZHBvaW50O1xuXG5cdFx0dmFyIHhociA9IG5ldyBYTUxIdHRwUmVxdWVzdCgpO1xuXHRcdHhoci5vcGVuKGF0dHJzLnR5cGUsIGVuZHBvaW50VXJsKTtcblx0XHQvL3hoci53aXRoQ3JlZGVudGlhbHMgPSB0cnVlO1xuXHRcdHhoci5zZXRSZXF1ZXN0SGVhZGVyKCdDb250ZW50LVR5cGUnLCAnYXBwbGljYXRpb24vanNvbicpO1xuXHRcdHhoci5vbmxvYWQgPSBmdW5jdGlvbiAoKSB7XG5cdFx0XHRpZiAoeGhyLnN0YXR1cyA+PSAyMDAgJiYgeGhyLnN0YXR1cyA8IDMwMCkge1xuXHRcdFx0XHRhdHRycy5jYWxsYmFja3Muc3VjY2VzcyhKU09OLnBhcnNlKHhoci5yZXNwb25zZVRleHQpKTtcblx0XHRcdH0gZWxzZSBpZiAoeGhyLnN0YXR1cyAhPT0gMjAwKSB7XG5cdFx0XHRcdGF0dHJzLmNhbGxiYWNrcy5mYWlsKEpTT04ucGFyc2UoeGhyLnJlc3BvbnNlVGV4dCkpO1xuXHRcdFx0fVxuXHRcdH07XG5cblx0XHRpZiAoIWF0dHJzLnBhcmFtcykge1xuXHRcdFx0YXR0cnMucGFyYW1zID0ge307XG5cdFx0fVxuXHRcdHhoci5zZW5kKEpTT04uc3RyaW5naWZ5KGF0dHJzLnBhcmFtcykpO1xuXHR9LFxuXG5cdHByb21pc2VDYWxsOiBmdW5jdGlvbiBwcm9taXNlQ2FsbChhdHRycykge1xuXHRcdHJldHVybiBuZXcgUHJvbWlzZShmdW5jdGlvbiAocmVzb2x2ZSwgcmVqZWN0KSB7XG5cdFx0XHR2YXIgeGhyID0gbmV3IFhNTEh0dHBSZXF1ZXN0KCk7XG5cdFx0XHR4aHIub3BlbihhdHRycy50eXBlLCBhdHRycy5lbmRwb2ludCk7XG5cdFx0XHR4aHIuc2V0UmVxdWVzdEhlYWRlcignQ29udGVudC1UeXBlJywgJ2FwcGxpY2F0aW9uL2pzb24nKTtcblx0XHRcdHhoci5vbmxvYWQgPSBmdW5jdGlvbiAoKSB7XG5cdFx0XHRcdGlmICh0aGlzLnN0YXR1cyA+PSAyMDAgJiYgdGhpcy5zdGF0dXMgPCAzMDApIHtcblx0XHRcdFx0XHRhdHRycy5taWRkbGV3YXJlcy5zdWNjZXNzKEpTT04ucGFyc2UoeGhyLnJlc3BvbnNlVGV4dCkpO1xuXHRcdFx0XHRcdHJlc29sdmUoSlNPTi5wYXJzZSh4aHIucmVzcG9uc2VUZXh0KSk7XG5cdFx0XHRcdH0gZWxzZSB7XG5cdFx0XHRcdFx0d2luZG93LmxvY2F0aW9uID0gU3RvcmUuZ2V0TG9naW5VcmwoKTtcblx0XHRcdFx0fVxuXHRcdFx0fTtcblx0XHRcdHhoci5vbmVycm9yID0gZnVuY3Rpb24gKCkge1xuXHRcdFx0XHR3aW5kb3cubG9jYXRpb24gPSBTdG9yZS5nZXRMb2dpblVybCgpO1xuXHRcdFx0fTtcblx0XHRcdHhoci5zZW5kKCk7XG5cdFx0fSk7XG5cdH1cbn07XG5cbm1vZHVsZS5leHBvcnRzID0gQ2FsbGVyOyIsInZhciBEb20gPSB7XG4gICAgaGFzQ2xhc3M6IGZ1bmN0aW9uIGhhc0NsYXNzKGVsLCBjbGFzc05hbWUpIHtcbiAgICAgICAgaWYgKGVsLmNsYXNzTGlzdCkgcmV0dXJuIGVsLmNsYXNzTGlzdC5jb250YWlucyhjbGFzc05hbWUpO2Vsc2UgcmV0dXJuIG5ldyBSZWdFeHAoJyhefCApJyArIGNsYXNzTmFtZSArICcoIHwkKScsICdnaScpLnRlc3QoZWwuY2xhc3NOYW1lKTtcbiAgICB9LFxuXG4gICAgcmVtb3ZlQ2xhc3M6IGZ1bmN0aW9uIHJlbW92ZUNsYXNzKGVsLCBjbGFzc05hbWUpIHtcbiAgICAgICAgaWYgKGVsLmNsYXNzTGlzdCkgZWwuY2xhc3NMaXN0LnJlbW92ZShjbGFzc05hbWUpO2Vsc2UgZWwuY2xhc3NOYW1lID0gZWwuY2xhc3NOYW1lLnJlcGxhY2UobmV3IFJlZ0V4cCgnKF58XFxcXGIpJyArIGNsYXNzTmFtZS5zcGxpdCgnICcpLmpvaW4oJ3wnKSArICcoXFxcXGJ8JCknLCAnZ2knKSwgJyAnKTtcbiAgICB9LFxuXG4gICAgYWRkQ2xhc3M6IGZ1bmN0aW9uIGFkZENsYXNzKGVsLCBjbGFzc05hbWUpIHtcbiAgICAgICAgaWYgKGVsLmNsYXNzTGlzdCkgZWwuY2xhc3NMaXN0LmFkZChjbGFzc05hbWUpO2Vsc2UgZWwuY2xhc3NOYW1lICs9ICcgJyArIGNsYXNzTmFtZTtcbiAgICB9LFxuXG4gICAgdG9nZ2xlQ2xhc3M6IGZ1bmN0aW9uIHRvZ2dsZUNsYXNzKGVsLCBjbGFzc05hbWUpIHtcbiAgICAgICAgaWYgKHRoaXMuaGFzQ2xhc3MoZWwsIGNsYXNzTmFtZSkpIHtcbiAgICAgICAgICAgIHRoaXMucmVtb3ZlQ2xhc3MoZWwsIGNsYXNzTmFtZSk7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICB0aGlzLmFkZENsYXNzKGVsLCBjbGFzc05hbWUpO1xuICAgICAgICB9XG4gICAgfVxufTtcblxubW9kdWxlLmV4cG9ydHMgPSBEb207IiwidmFyIFN0b3JlID0gcmVxdWlyZSgnLi9zdG9yZS5qcycpO1xuXG52YXIgTG9nZ2VyID0ge1xuXHRcdGxvZzogZnVuY3Rpb24gbG9nKHdoYXQpIHtcblx0XHRcdFx0aWYgKCFTdG9yZS5sb2dzRW5hYmxlZCgpKSB7XG5cdFx0XHRcdFx0XHRyZXR1cm4gZmFsc2U7XG5cdFx0XHRcdH0gZWxzZSB7XG5cdFx0XHRcdFx0XHRMb2dnZXIubG9nID0gY29uc29sZS5sb2cuYmluZChjb25zb2xlKTtcblx0XHRcdFx0XHRcdExvZ2dlci5sb2cod2hhdCk7XG5cdFx0XHRcdH1cblx0XHR9LFxuXHRcdGVycm9yOiBmdW5jdGlvbiBlcnJvcihlcnIpIHtcblx0XHRcdFx0aWYgKCFTdG9yZS5sb2dzRW5hYmxlZCgpKSB7XG5cdFx0XHRcdFx0XHRyZXR1cm4gZmFsc2U7XG5cdFx0XHRcdH0gZWxzZSB7XG5cdFx0XHRcdFx0XHRMb2dnZXIuZXJyb3IgPSBjb25zb2xlLmVycm9yLmJpbmQoY29uc29sZSk7XG5cdFx0XHRcdFx0XHRMb2dnZXIuZXJyb3IoZXJyKTtcblx0XHRcdFx0fVxuXHRcdH1cbn07XG5cbm1vZHVsZS5leHBvcnRzID0gTG9nZ2VyOyIsIid1c2Ugc3RyaWN0JztcblxudmFyIFN0b3JlID0gcmVxdWlyZSgnLi9zdG9yZS5qcycpO1xudmFyIExvZ2dlciA9IHJlcXVpcmUoJy4vbG9nZ2VyLmpzJyk7XG5cbnZhciBhdmFpbGFibGVMaXN0ZW5lcnMgPSB7XG5cdHNlYXJjaEtleVVwOiB7XG5cdFx0aW5mbzogJ0xpc3RlbmVyIG9uIGtleVVwIG9mIHNlYXJjaCBpbnB1dCBvbiB0b3AgYmFyJ1xuXHR9LFxuXHRzZWFyY2hFbnRlcjoge1xuXHRcdGluZm86ICdMaXN0ZW5lciBvbiBlbnRlciBrZXkgcHJlc3NlZCBvbiBzZWFyY2ggaW5wdXQgb24gdG9wIGJhcidcblx0fSxcblx0c2VhcmNoT25DaGFuZ2U6IHtcblx0XHRpbmZvOiAnTGlzdGVuZXIgb24gY2hhbmdlIG9mIGlucHV0IHZhbHVlJ1xuXHR9XG59O1xuXG52YXIgUHViU3ViID0ge1xuXHRnZXRBdmFpbGFibGVMaXN0ZW5lcnM6IGZ1bmN0aW9uIGdldEF2YWlsYWJsZUxpc3RlbmVycygpIHtcblx0XHRyZXR1cm4gYXZhaWxhYmxlTGlzdGVuZXJzO1xuXHR9LFxuXG5cdHN1YnNjcmliZTogZnVuY3Rpb24gc3Vic2NyaWJlKGV2ZW50dCwgZnVuY3QpIHtcblx0XHRpZiAoZXZlbnR0ID09PSBcInNlYXJjaEtleVVwXCIpIHtcblx0XHRcdHZhciBlbCA9IGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKFN0b3JlLmdldFNlYXJjaElucHV0SWQoKSk7XG5cdFx0XHRlbC5hZGRFdmVudExpc3RlbmVyKCdrZXl1cCcsIGZ1bmN0KTtcblx0XHRcdHJldHVybiBmdW5jdGlvbiAoKSB7XG5cdFx0XHRcdGVsLnJlbW92ZUV2ZW50TGlzdGVuZXIoJ2tleXVwJywgZnVuY3QsIGZhbHNlKTtcblx0XHRcdH07XG5cdFx0fSBlbHNlIGlmIChldmVudHQgPT09ICdzZWFyY2hFbnRlcicpIHtcblx0XHRcdHZhciBoYW5kbGluZ0Z1bmN0ID0gZnVuY3Rpb24gaGFuZGxpbmdGdW5jdChlKSB7XG5cdFx0XHRcdGlmIChlLmtleUNvZGUgPT09IDEzKSB7XG5cdFx0XHRcdFx0ZnVuY3QoZSk7XG5cdFx0XHRcdH1cblx0XHRcdH07XG5cdFx0XHRlbC5hZGRFdmVudExpc3RlbmVyKCdrZXlkb3duJywgaGFuZGxpbmdGdW5jdCk7XG5cdFx0XHRyZXR1cm4gZnVuY3Rpb24gKCkge1xuXHRcdFx0XHRlbC5yZW1vdmVFdmVudExpc3RlbmVyKCdrZXlkb3duJywgaGFuZGxpbmdGdW5jdCwgZmFsc2UpO1xuXHRcdFx0fTtcblx0XHR9IGVsc2UgaWYgKGV2ZW50dCA9PT0gJ3NlYXJjaE9uQ2hhbmdlJykge1xuXHRcdFx0dmFyIGVsID0gZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoU3RvcmUuZ2V0U2VhcmNoSW5wdXRJZCgpKTtcblx0XHRcdGVsLmFkZEV2ZW50TGlzdGVuZXIoJ2NoYW5nZScsIGZ1bmN0KTtcblx0XHRcdHJldHVybiBmdW5jdGlvbiAoKSB7XG5cdFx0XHRcdGVsLnJlbW92ZUV2ZW50TGlzdGVuZXIoJ2tleXVwJywgZnVuY3QsIGZhbHNlKTtcblx0XHRcdH07XG5cdFx0fSBlbHNlIHtcblx0XHRcdExvZ2dlci5lcnJvcignVGhlIGV2ZW50IHlvdSB0cmllZCB0byBzdWJzY3JpYmUgaXMgbm90IGF2YWlsYWJsZSBieSB0aGUgbGlicmFyeScpO1xuXHRcdFx0TG9nZ2VyLmxvZygnVGhlIGF2YWlsYWJsZSBldmVudHMgYXJlOiAnLCBhdmFpbGFibGVMaXN0ZW5lcnMpO1xuXHRcdFx0cmV0dXJuIGZ1bmN0aW9uICgpIHt9O1xuXHRcdH1cblx0fVxufTtcblxubW9kdWxlLmV4cG9ydHMgPSBQdWJTdWI7IiwidmFyIHN0YXRlID0ge1xuXHRnZW5lcmFsOiB7fSxcblx0dXNlckRhdGE6IHt9LFxuXHRjb25maWd1cmF0aW9uOiB7fSxcblx0aHRtbFRlbXBsYXRlOiBcIlwiLFxuXHRhcHBzOiBudWxsXG59O1xuXG5mdW5jdGlvbiBhc3NlbWJsZShsaXRlcmFsLCBwYXJhbXMpIHtcblx0cmV0dXJuIG5ldyBGdW5jdGlvbihwYXJhbXMsIFwicmV0dXJuIGBcIiArIGxpdGVyYWwgKyBcImA7XCIpO1xufVxuXG52YXIgU3RvcmUgPSB7XG5cdGdldFN0YXRlOiBmdW5jdGlvbiBnZXRTdGF0ZSgpIHtcblx0XHRyZXR1cm4gT2JqZWN0LmFzc2lnbih7fSwgc3RhdGUpO1xuXHR9LFxuXG5cdHNldFdpbmRvd05hbWU6IGZ1bmN0aW9uIHNldFdpbmRvd05hbWUod24pIHtcblx0XHRzdGF0ZS5nZW5lcmFsLndpbmRvd05hbWUgPSB3bjtcblx0fSxcblxuXHQvKlxuICBjb25mOlxuICAtIGhlYWRlckRpdklkXG4gIC0gaW5jbHVkZUFwcHNNZW51XG4gICovXG5cdHNldENvbmZpZ3VyYXRpb246IGZ1bmN0aW9uIHNldENvbmZpZ3VyYXRpb24oY29uZikge1xuXHRcdHN0YXRlLmNvbmZpZ3VyYXRpb24gPSBjb25mO1xuXHR9LFxuXG5cdGdldEFwcHNWaXNpYmxlOiBmdW5jdGlvbiBnZXRBcHBzVmlzaWJsZSgpIHtcblx0XHRpZiAoc3RhdGUuY29uZmlndXJhdGlvbi5hcHBzVmlzaWJsZSA9PT0gbnVsbCB8fCBzdGF0ZS5jb25maWd1cmF0aW9uLmFwcHNWaXNpYmxlID09PSB1bmRlZmluZWQpIHtcblx0XHRcdHJldHVybiB0cnVlO1xuXHRcdH0gZWxzZSB7XG5cdFx0XHRyZXR1cm4gc3RhdGUuY29uZmlndXJhdGlvbi5hcHBzVmlzaWJsZTtcblx0XHR9XG5cdH0sXG5cblx0c2V0QXBwc1Zpc2libGU6IGZ1bmN0aW9uIHNldEFwcHNWaXNpYmxlKGFwcHNWaXNpYmxlKSB7XG5cdFx0c3RhdGUuY29uZmlndXJhdGlvbi5hcHBzVmlzaWJsZSA9IGFwcHNWaXNpYmxlO1xuXHR9LFxuXG5cdHNldEhUTUxUZW1wbGF0ZTogZnVuY3Rpb24gc2V0SFRNTFRlbXBsYXRlKHRlbXBsYXRlKSB7XG5cdFx0c3RhdGUuaHRtbFRlbXBsYXRlID0gdGVtcGxhdGU7XG5cdH0sXG5cblx0c2V0QXBwczogZnVuY3Rpb24gc2V0QXBwcyhhcHBzKSB7XG5cdFx0c3RhdGUuYXBwcyA9IGFwcHM7XG5cdH0sXG5cblx0Z2V0TG9naW5Vcmw6IGZ1bmN0aW9uIGdldExvZ2luVXJsKCkge1xuXHRcdHJldHVybiBzdGF0ZS5jb25maWd1cmF0aW9uLmxvZ2luVXJsICsgXCI/XCIgKyBzdGF0ZS5jb25maWd1cmF0aW9uLnJlZGlyZWN0VXJsUGFyYW0gKyBcIj1cIiArIHdpbmRvdy5sb2NhdGlvbi5ocmVmO1xuXHR9LFxuXG5cdGdldEF1dGhlbnRpY2F0aW9uRW5kcG9pbnQ6IGZ1bmN0aW9uIGdldEF1dGhlbnRpY2F0aW9uRW5kcG9pbnQoKSB7XG5cdFx0cmV0dXJuIHN0YXRlLmNvbmZpZ3VyYXRpb24uYmFzZVVybCArICdzZXNzaW9uJztcblx0fSxcblxuXHRnZXRTd2l0Y2hBY2NvdW50RW5kcG9pbnQ6IGZ1bmN0aW9uIGdldFN3aXRjaEFjY291bnRFbmRwb2ludChhY2NvdW50SWQpIHtcblx0XHRyZXR1cm4gc3RhdGUuY29uZmlndXJhdGlvbi5iYXNlVXJsICsgJ2FjY291bnRzL3N3aXRjaC8nICsgYWNjb3VudElkO1xuXHR9LFxuXG5cdGdldEFwcHNFbmRwb2ludDogZnVuY3Rpb24gZ2V0QXBwc0VuZHBvaW50KCkge1xuXHRcdHJldHVybiBzdGF0ZS5jb25maWd1cmF0aW9uLmJhc2VVcmwgKyAnYXBwcyc7XG5cdH0sXG5cblx0bG9nc0VuYWJsZWQ6IGZ1bmN0aW9uIGxvZ3NFbmFibGVkKCkge1xuXHRcdHJldHVybiBzdGF0ZS5jb25maWd1cmF0aW9uLmxvZ3M7XG5cdH0sXG5cblx0Z2V0U2VhcmNoSW5wdXRJZDogZnVuY3Rpb24gZ2V0U2VhcmNoSW5wdXRJZCgpIHtcblx0XHRyZXR1cm4gc3RhdGUuY29uZmlndXJhdGlvbi5zZWFyY2hJbnB1dElkO1xuXHR9LFxuXG5cdHNldEhUTUxDb250YWluZXI6IGZ1bmN0aW9uIHNldEhUTUxDb250YWluZXIoaWQpIHtcblx0XHRzdGF0ZS5jb25maWd1cmF0aW9uLmhlYWRlckRpdklkID0gaWQ7XG5cdH0sXG5cblx0Z2V0SFRMTUNvbnRhaW5lcjogZnVuY3Rpb24gZ2V0SFRMTUNvbnRhaW5lcigpIHtcblx0XHRpZiAoc3RhdGUuY29uZmlndXJhdGlvbi5oZWFkZXJEaXZJZCkge1xuXHRcdFx0cmV0dXJuIHN0YXRlLmNvbmZpZ3VyYXRpb24uaGVhZGVyRGl2SWQ7XG5cdFx0fSBlbHNlIHtcblx0XHRcdHJldHVybiBcInBwc2RrLWNvbnRhaW5lclwiO1xuXHRcdH1cblx0fSxcblxuXHRnZXRIVE1MOiBmdW5jdGlvbiBnZXRIVE1MKCkge1xuXHRcdHJldHVybiBzdGF0ZS5odG1sVGVtcGxhdGU7XG5cdH0sXG5cblx0Z2V0V2luZG93TmFtZTogZnVuY3Rpb24gZ2V0V2luZG93TmFtZSgpIHtcblx0XHRyZXR1cm4gc3RhdGUuZ2VuZXJhbC53aW5kb3dOYW1lO1xuXHR9LFxuXG5cdHNldFVzZXJEYXRhOiBmdW5jdGlvbiBzZXRVc2VyRGF0YSh1c2VyRGF0YSkge1xuXHRcdHN0YXRlLnVzZXJEYXRhID0gdXNlckRhdGE7XG5cdH0sXG5cblx0Z2V0VXNlckRhdGE6IGZ1bmN0aW9uIGdldFVzZXJEYXRhKCkge1xuXHRcdHJldHVybiBzdGF0ZS51c2VyRGF0YTtcblx0fVxufTtcblxubW9kdWxlLmV4cG9ydHMgPSBTdG9yZTsiXX0=
