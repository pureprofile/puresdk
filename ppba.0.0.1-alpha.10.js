(function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);var f=new Error("Cannot find module '"+o+"'");throw f.code="MODULE_NOT_FOUND",f}var l=n[o]={exports:{}};t[o][0].call(l.exports,function(e){var n=t[o][1][e];return s(n?n:e)},l,l.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){
'use strict';

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
					window.location = '/';
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
			return '\n\t\t\t\t<img src="http://lorempixel.com/40/40" alt="">\n\t\t\t\t<div class="bac-user-app-details">\n\t\t\t\t\t <span>' + account.name + '</span>\n\t\t\t\t\t <span>15 team members</span>\n\t\t\t\t</div>\n\t\t\t';
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

	render: function render() {
		var whereTo = document.getElementById(Store.getHTLMContainer());
		if (whereTo === null) {
			Logger.error('the container with id "' + whereTo + '" has not been found on the document. The library is going to create it.');
			var div = document.createElement('div');
			div.id = Store.getHTLMContainer();
			div.style.width = '100%';
			div.style.height = '60px';
			document.body.insertBefore(div, document.body.firstChild);
			whereTo = document.getElementById(Store.getHTLMContainer());
		}
		whereTo.innerHTML = Store.getHTML(Store.getUserData().user.account);
		PPBA.renderUser(Store.getUserData().user);
		PPBA.renderAccounts(Store.getUserData().user.accounts);
		if (Store.getAppsVisible() === false) {
			document.getElementById('--puresdk-apps-section--').style = "display:none";
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
 * version: 0.0.1-alpha.10
 * date: 2017-03-09
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
ppba.setHTMLTemplate('<header class="bac--header-apps">\n    <div class="bac--container">\n        <div class="bac--logo">\n            <img src="' + account.sdk_logo_icon + '" alt="">\n        </div>\n        <div class="bac--header-search">\n            <input type="search" placeholder="Search" id="--puresdk--search--input--">\n            <i class="fa fa-search"></i>\n        </div>\n        <div class="bac--user-actions">\n            <div class="bac--user-apps" id="--puresdk-apps-section--">\n                <i class="fa fa-squares" id="--puresdk-apps-icon--"></i>\n\n                <div class="bac--apps-container" id="--puresdk-apps-container--">\n                    <div class="bac--apps-arrow"></div>\n                </div>\n            </div>\n            <!--<div class="bac&#45;&#45;user-notifications">-->\n                <!--<div class="bac&#45;&#45;user-notifications-count">1</div>-->\n                <!--<i class="fa fa-bell-o"></i>-->\n            <!--</div>-->\n            <div class="bac--user-avatar">\n                <span class="bac--user-avatar-name" id="--puresdk-user-avatar--"></span>\n            </div>\n        </div>\n    </div>\n</header>\n<div class="bac--user-sidebar" id="--puresdk-user-sidebar--">\n    <div id="--puresdk-user-details--"></div>\n    <!--<div class="bac&#45;&#45;user-sidebar-info">-->\n        <!--<div class="bac&#45;&#45;user-image"><i class="fa fa-camera"></i></div>-->\n        <!--<div class="bac&#45;&#45;user-name">Curtis Bartlett</div>-->\n        <!--<div class="bac&#45;&#45;user-email">cbartlett@pureprofile.com</div>-->\n    <!--</div>-->\n    <div class="bac--user-apps" id="--puresdk-user-businesses--">\n        <!--<div class="bac&#45;&#45;user-list-item">-->\n            <!--<img src="http://lorempixel.com/40/40" alt="">-->\n            <!--<div class="bac-user-app-details">-->\n                <!--<span></span>-->\n                <!--<span>15 team members</span>-->\n            <!--</div>-->\n        <!--</div>-->\n    </div>\n    <div class="bac--user-account-settings">\n        <div class="bac-user-acount-list-item">\n            <i class="fa fa-cog-line"></i>\n            <a href="#">Acount Security</a>\n        </div>\n        <div class="bac-user-acount-list-item">\n            <i class="fa fa-lock-line"></i>\n            <a href="#">Acount Security</a>\n        </div>\n        <div class="bac-user-acount-list-item">\n            <i class="fa fa-login-line"></i>\n            <a href="#">Acount Security</a>\n        </div>\n    </div>\n</div>');

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
'use strict';

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
'use strict';

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
'use strict';

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
"use strict";

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
		state.htmlTemplate = function (account) {
			return template;
		};
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

	getHTML: function getHTML(account) {
		return state.htmlTemplate(account);
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
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uLy4uL25vZGVfbW9kdWxlcy9icm93c2VyLXBhY2svX3ByZWx1ZGUuanMiLCJQUEJBLmpzIiwiaW5kZXguanMiLCJtb2R1bGVzL2NhbGxlci5qcyIsIm1vZHVsZXMvZG9tLmpzIiwibW9kdWxlcy9sb2dnZXIuanMiLCJtb2R1bGVzL3B1YnN1Yi5qcyIsIm1vZHVsZXMvc3RvcmUuanMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7QUNBQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNyTkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQzVDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUN6REE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDeEJBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUN2QkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3JEQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0EiLCJmaWxlIjoiZ2VuZXJhdGVkLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXNDb250ZW50IjpbIihmdW5jdGlvbiBlKHQsbixyKXtmdW5jdGlvbiBzKG8sdSl7aWYoIW5bb10pe2lmKCF0W29dKXt2YXIgYT10eXBlb2YgcmVxdWlyZT09XCJmdW5jdGlvblwiJiZyZXF1aXJlO2lmKCF1JiZhKXJldHVybiBhKG8sITApO2lmKGkpcmV0dXJuIGkobywhMCk7dmFyIGY9bmV3IEVycm9yKFwiQ2Fubm90IGZpbmQgbW9kdWxlICdcIitvK1wiJ1wiKTt0aHJvdyBmLmNvZGU9XCJNT0RVTEVfTk9UX0ZPVU5EXCIsZn12YXIgbD1uW29dPXtleHBvcnRzOnt9fTt0W29dWzBdLmNhbGwobC5leHBvcnRzLGZ1bmN0aW9uKGUpe3ZhciBuPXRbb11bMV1bZV07cmV0dXJuIHMobj9uOmUpfSxsLGwuZXhwb3J0cyxlLHQsbixyKX1yZXR1cm4gbltvXS5leHBvcnRzfXZhciBpPXR5cGVvZiByZXF1aXJlPT1cImZ1bmN0aW9uXCImJnJlcXVpcmU7Zm9yKHZhciBvPTA7bzxyLmxlbmd0aDtvKyspcyhyW29dKTtyZXR1cm4gc30pIiwiJ3VzZSBzdHJpY3QnO1xuXG52YXIgTG9nZ2VyID0gcmVxdWlyZSgnLi9tb2R1bGVzL2xvZ2dlcicpO1xudmFyIFB1YlN1YiA9IHJlcXVpcmUoJy4vbW9kdWxlcy9wdWJzdWInKTtcbnZhciBDYWxsZXIgPSByZXF1aXJlKCcuL21vZHVsZXMvY2FsbGVyJyk7XG52YXIgU3RvcmUgPSByZXF1aXJlKCcuL21vZHVsZXMvc3RvcmUnKTtcbnZhciBEb20gPSByZXF1aXJlKCcuL21vZHVsZXMvZG9tJyk7XG52YXIgcHBiYUNvbmYgPSB7fTtcblxudmFyIGFmdGVyUmVuZGVyID0gZnVuY3Rpb24gYWZ0ZXJSZW5kZXIoKSB7XG5cdGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKCctLXB1cmVzZGstYXBwcy1pY29uLS0nKS5hZGRFdmVudExpc3RlbmVyKCdjbGljaycsIGZ1bmN0aW9uIChlKSB7XG5cdFx0ZS5zdG9wUHJvcGFnYXRpb24oKTtcblx0XHREb20udG9nZ2xlQ2xhc3MoZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoJy0tcHVyZXNkay1hcHBzLWNvbnRhaW5lci0tJyksICdhY3RpdmUnKTtcblx0fSk7XG5cblx0ZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoJy0tcHVyZXNkay11c2VyLWF2YXRhci0tJykuYWRkRXZlbnRMaXN0ZW5lcignY2xpY2snLCBmdW5jdGlvbiAoZSkge1xuXHRcdGUuc3RvcFByb3BhZ2F0aW9uKCk7XG5cdFx0RG9tLnJlbW92ZUNsYXNzKGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKCctLXB1cmVzZGstYXBwcy1jb250YWluZXItLScpLCAnYWN0aXZlJyk7XG5cdFx0RG9tLnRvZ2dsZUNsYXNzKGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKCctLXB1cmVzZGstdXNlci1zaWRlYmFyLS0nKSwgJ2FjdGl2ZScpO1xuXHR9KTtcblxuXHR3aW5kb3cuYWRkRXZlbnRMaXN0ZW5lcignY2xpY2snLCBmdW5jdGlvbiAoZSkge1xuXHRcdERvbS5yZW1vdmVDbGFzcyhkb2N1bWVudC5nZXRFbGVtZW50QnlJZCgnLS1wdXJlc2RrLWFwcHMtY29udGFpbmVyLS0nKSwgJ2FjdGl2ZScpO1xuXHRcdERvbS5yZW1vdmVDbGFzcyhkb2N1bWVudC5nZXRFbGVtZW50QnlJZCgnLS1wdXJlc2RrLXVzZXItc2lkZWJhci0tJyksICdhY3RpdmUnKTtcblx0fSk7XG59O1xuXG52YXIgUFBCQSA9IHtcblx0c2V0V2luZG93TmFtZTogZnVuY3Rpb24gc2V0V2luZG93TmFtZSh3bikge1xuXHRcdFN0b3JlLnNldFdpbmRvd05hbWUod24pO1xuXHR9LFxuXG5cdHNldENvbmZpZ3VyYXRpb246IGZ1bmN0aW9uIHNldENvbmZpZ3VyYXRpb24oY29uZikge1xuXHRcdFN0b3JlLnNldENvbmZpZ3VyYXRpb24oY29uZik7XG5cdH0sXG5cblx0c2V0SFRNTFRlbXBsYXRlOiBmdW5jdGlvbiBzZXRIVE1MVGVtcGxhdGUodGVtcGxhdGUpIHtcblx0XHRTdG9yZS5zZXRIVE1MVGVtcGxhdGUodGVtcGxhdGUpO1xuXHR9LFxuXG5cdGluaXQ6IGZ1bmN0aW9uIGluaXQoY29uZikge1xuXHRcdExvZ2dlci5sb2coJ2luaXRpYWxpemluZyB3aXRoIGNvbmY6ICcsIGNvbmYpO1xuXHRcdGlmIChjb25mKSB7XG5cdFx0XHRpZiAoY29uZi5oZWFkZXJEaXZJZCkge1xuXHRcdFx0XHRTdG9yZS5zZXRIVE1MQ29udGFpbmVyKGNvbmYuaGVhZGVyRGl2SWQpO1xuXHRcdFx0fVxuXHRcdFx0aWYgKGNvbmYuYXBwc1Zpc2libGUgIT09IG51bGwpIHtcblx0XHRcdFx0U3RvcmUuc2V0QXBwc1Zpc2libGUoY29uZi5hcHBzVmlzaWJsZSk7XG5cdFx0XHR9XG5cdFx0fVxuXHRcdHBwYmFDb25mID0gY29uZjtcblx0XHRyZXR1cm4gdHJ1ZTtcblx0fSxcblxuXHRhdXRoZW50aWNhdGU6IGZ1bmN0aW9uIGF1dGhlbnRpY2F0ZShfc3VjY2Vzcykge1xuXHRcdHZhciBzZWxmID0gUFBCQTtcblx0XHRDYWxsZXIubWFrZUNhbGwoe1xuXHRcdFx0dHlwZTogJ0dFVCcsXG5cdFx0XHRlbmRwb2ludDogU3RvcmUuZ2V0QXV0aGVudGljYXRpb25FbmRwb2ludCgpLFxuXHRcdFx0Y2FsbGJhY2tzOiB7XG5cdFx0XHRcdHN1Y2Nlc3M6IGZ1bmN0aW9uIHN1Y2Nlc3MocmVzdWx0KSB7XG5cdFx0XHRcdFx0TG9nZ2VyLmxvZyhyZXN1bHQpO1xuXHRcdFx0XHRcdFN0b3JlLnNldFVzZXJEYXRhKHJlc3VsdCk7XG5cdFx0XHRcdFx0c2VsZi5yZW5kZXIoKTtcblx0XHRcdFx0XHRQUEJBLmdldEFwcHMoKTtcblx0XHRcdFx0XHRfc3VjY2VzcyhyZXN1bHQpO1xuXHRcdFx0XHR9LFxuXHRcdFx0XHRmYWlsOiBmdW5jdGlvbiBmYWlsKGVycikge1xuXHRcdFx0XHRcdHdpbmRvdy5sb2NhdGlvbiA9IFN0b3JlLmdldExvZ2luVXJsKCk7XG5cdFx0XHRcdH1cblx0XHRcdH1cblx0XHR9KTtcblx0fSxcblxuXHRhdXRoZW50aWNhdGVQcm9taXNlOiBmdW5jdGlvbiBhdXRoZW50aWNhdGVQcm9taXNlKCkge1xuXHRcdHZhciBzZWxmID0gUFBCQTtcblx0XHRyZXR1cm4gQ2FsbGVyLnByb21pc2VDYWxsKHtcblx0XHRcdHR5cGU6ICdHRVQnLFxuXHRcdFx0ZW5kcG9pbnQ6IFN0b3JlLmdldEF1dGhlbnRpY2F0aW9uRW5kcG9pbnQoKSxcblx0XHRcdG1pZGRsZXdhcmVzOiB7XG5cdFx0XHRcdHN1Y2Nlc3M6IGZ1bmN0aW9uIHN1Y2Nlc3MocmVzdWx0KSB7XG5cdFx0XHRcdFx0TG9nZ2VyLmxvZyhyZXN1bHQpO1xuXHRcdFx0XHRcdFN0b3JlLnNldFVzZXJEYXRhKHJlc3VsdCk7XG5cdFx0XHRcdFx0c2VsZi5yZW5kZXIoKTtcblx0XHRcdFx0XHRQUEJBLmdldEFwcHMoKTtcblx0XHRcdFx0fVxuXHRcdFx0fVxuXHRcdH0pO1xuXHR9LFxuXG5cdGdldEFwcHM6IGZ1bmN0aW9uIGdldEFwcHMoKSB7XG5cdFx0Q2FsbGVyLm1ha2VDYWxsKHtcblx0XHRcdHR5cGU6ICdHRVQnLFxuXHRcdFx0ZW5kcG9pbnQ6IFN0b3JlLmdldEFwcHNFbmRwb2ludCgpLFxuXHRcdFx0Y2FsbGJhY2tzOiB7XG5cdFx0XHRcdHN1Y2Nlc3M6IGZ1bmN0aW9uIHN1Y2Nlc3MocmVzdWx0KSB7XG5cdFx0XHRcdFx0U3RvcmUuc2V0QXBwcyhyZXN1bHQpO1xuXHRcdFx0XHRcdFBQQkEucmVuZGVyQXBwcyhyZXN1bHQuYXBwcyk7XG5cdFx0XHRcdH0sXG5cdFx0XHRcdGZhaWw6IGZ1bmN0aW9uIGZhaWwoZXJyKSB7XG5cdFx0XHRcdFx0d2luZG93LmxvY2F0aW9uID0gU3RvcmUuZ2V0TG9naW5VcmwoKTtcblx0XHRcdFx0fVxuXHRcdFx0fVxuXHRcdH0pO1xuXHR9LFxuXG5cdGdldEF2YWlsYWJsZUxpc3RlbmVyczogZnVuY3Rpb24gZ2V0QXZhaWxhYmxlTGlzdGVuZXJzKCkge1xuXHRcdHJldHVybiBQdWJTdWIuZ2V0QXZhaWxhYmxlTGlzdGVuZXJzKCk7XG5cdH0sXG5cblx0c3Vic2NyaWJlTGlzdGVuZXI6IGZ1bmN0aW9uIHN1YnNjcmliZUxpc3RlbmVyKGV2ZW50dCwgZnVuY3QpIHtcblx0XHRyZXR1cm4gUHViU3ViLnN1YnNjcmliZShldmVudHQsIGZ1bmN0KTtcblx0fSxcblxuXHRnZXRVc2VyRGF0YTogZnVuY3Rpb24gZ2V0VXNlckRhdGEoKSB7XG5cdFx0cmV0dXJuIFN0b3JlLmdldFVzZXJEYXRhKCk7XG5cdH0sXG5cblx0c2V0SW5wdXRQbGFjZWhvbGRlcjogZnVuY3Rpb24gc2V0SW5wdXRQbGFjZWhvbGRlcih0eHQpIHtcblx0XHRkb2N1bWVudC5nZXRFbGVtZW50QnlJZChTdG9yZS5nZXRTZWFyY2hJbnB1dElkKCkpLnBsYWNlaG9sZGVyID0gdHh0O1xuXHR9LFxuXG5cdGNoYW5nZUFjY291bnQ6IGZ1bmN0aW9uIGNoYW5nZUFjY291bnQoYWNjb3VudElkKSB7XG5cdFx0Q2FsbGVyLm1ha2VDYWxsKHtcblx0XHRcdHR5cGU6ICdHRVQnLFxuXHRcdFx0ZW5kcG9pbnQ6IFN0b3JlLmdldFN3aXRjaEFjY291bnRFbmRwb2ludChhY2NvdW50SWQpLFxuXHRcdFx0Y2FsbGJhY2tzOiB7XG5cdFx0XHRcdHN1Y2Nlc3M6IGZ1bmN0aW9uIHN1Y2Nlc3MocmVzdWx0KSB7XG5cdFx0XHRcdFx0d2luZG93LmxvY2F0aW9uID0gJy8nO1xuXHRcdFx0XHR9LFxuXHRcdFx0XHRmYWlsOiBmdW5jdGlvbiBmYWlsKGVycikge1xuXHRcdFx0XHRcdGFsZXJ0KCdTb3JyeSwgc29tZXRoaW5nIHdlbnQgd3Jvbmcgd2l0aCB5b3VyIHJlcXVlc3QuIFBsZXNlIHRyeSBhZ2FpbicpO1xuXHRcdFx0XHR9XG5cdFx0XHR9XG5cdFx0fSk7XG5cdH0sXG5cblx0cmVuZGVyQXBwczogZnVuY3Rpb24gcmVuZGVyQXBwcyhhcHBzKSB7XG5cdFx0dmFyIGFwcFRlbXBsYXRlID0gZnVuY3Rpb24gYXBwVGVtcGxhdGUoYXBwKSB7XG5cdFx0XHRyZXR1cm4gJ1xcblxcdFxcdFxcdFxcdDxhIGhyZWY9XCIjXCIgc3R5bGU9XCJiYWNrZ3JvdW5kOiAjJyArIGFwcC5jb2xvciArICdcIj48aSBjbGFzcz1cIicgKyBhcHAuaWNvbiArICdcIj48L2k+PC9hPlxcblxcdFxcdFxcdFxcdDxzcGFuIGNsYXNzPVwiYmFjLS1hcHAtbmFtZVwiPicgKyBhcHAubmFtZSArICc8L3NwYW4+XFxuXFx0XFx0XFx0XFx0PHNwYW4gY2xhc3M9XCJiYWMtLWFwcC1kZXNjcmlwdGlvblwiPicgKyBhcHAuZGVzY3IgKyAnPC9zcGFuPlxcblxcdFxcdFxcdCc7XG5cdFx0fTtcblxuXHRcdHZhciBfbG9vcCA9IGZ1bmN0aW9uIF9sb29wKGkpIHtcblx0XHRcdHZhciBhcHAgPSBhcHBzW2ldO1xuXHRcdFx0dmFyIGRpdiA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoXCJkaXZcIik7XG5cdFx0XHRkaXYuY2xhc3NOYW1lID0gXCJiYWMtLWFwcHNcIjtcblx0XHRcdGRpdi5pbm5lckhUTUwgPSBhcHBUZW1wbGF0ZShhcHApO1xuXHRcdFx0ZGl2Lm9uY2xpY2sgPSBmdW5jdGlvbiAoZSkge1xuXHRcdFx0XHRlLnByZXZlbnREZWZhdWx0KCk7XG5cdFx0XHRcdHdpbmRvdy5sb2NhdGlvbiA9IGFwcC5hcHBsaWNhdGlvbl91cmw7XG5cdFx0XHR9O1xuXHRcdFx0ZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoXCItLXB1cmVzZGstYXBwcy1jb250YWluZXItLVwiKS5hcHBlbmRDaGlsZChkaXYpO1xuXHRcdH07XG5cblx0XHRmb3IgKHZhciBpID0gMDsgaSA8IGFwcHMubGVuZ3RoOyBpKyspIHtcblx0XHRcdF9sb29wKGkpO1xuXHRcdH1cblx0fSxcblxuXHRyZW5kZXJVc2VyOiBmdW5jdGlvbiByZW5kZXJVc2VyKHVzZXIpIHtcblx0XHR2YXIgdXNlclRlbXBsYXRlID0gZnVuY3Rpb24gdXNlclRlbXBsYXRlKHVzZXIpIHtcblx0XHRcdHJldHVybiAnXFxuXFx0XFx0XFx0XFx0PGRpdiBjbGFzcz1cImJhYy0tdXNlci1pbWFnZVwiPjxpIGNsYXNzPVwiZmEgZmEtY2FtZXJhXCI+PC9pPjwvZGl2PlxcblxcdFxcdFxcdFxcdDxkaXYgY2xhc3M9XCJiYWMtLXVzZXItbmFtZVwiPicgKyB1c2VyLmZpcnN0bmFtZSArICcgJyArIHVzZXIubGFzdG5hbWUgKyAnPC9kaXY+XFxuXFx0XFx0XFx0XFx0PGRpdiBjbGFzcz1cImJhYy0tdXNlci1lbWFpbFwiPicgKyB1c2VyLmVtYWlsICsgJzwvZGl2PlxcblxcdFxcdFxcdCc7XG5cdFx0fTtcblx0XHR2YXIgZGl2ID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudCgnZGl2Jyk7XG5cdFx0ZGl2LmNsYXNzTmFtZSA9IFwiYmFjLS11c2VyLXNpZGViYXItaW5mb1wiO1xuXHRcdGRpdi5pbm5lckhUTUwgPSB1c2VyVGVtcGxhdGUodXNlcik7XG5cdFx0ZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoJy0tcHVyZXNkay11c2VyLWRldGFpbHMtLScpLmFwcGVuZENoaWxkKGRpdik7XG5cdFx0ZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoJy0tcHVyZXNkay11c2VyLWF2YXRhci0tJykuaW5uZXJIVE1MID0gdXNlci5maXJzdG5hbWUuY2hhckF0KDApICsgdXNlci5sYXN0bmFtZS5jaGFyQXQoMCk7XG5cdH0sXG5cblx0cmVuZGVyQWNjb3VudHM6IGZ1bmN0aW9uIHJlbmRlckFjY291bnRzKGFjY291bnRzKSB7XG5cdFx0dmFyIGFjY291bnRzVGVtcGxhdGUgPSBmdW5jdGlvbiBhY2NvdW50c1RlbXBsYXRlKGFjY291bnQpIHtcblx0XHRcdHJldHVybiAnXFxuXFx0XFx0XFx0XFx0PGltZyBzcmM9XCJodHRwOi8vbG9yZW1waXhlbC5jb20vNDAvNDBcIiBhbHQ9XCJcIj5cXG5cXHRcXHRcXHRcXHQ8ZGl2IGNsYXNzPVwiYmFjLXVzZXItYXBwLWRldGFpbHNcIj5cXG5cXHRcXHRcXHRcXHRcXHQgPHNwYW4+JyArIGFjY291bnQubmFtZSArICc8L3NwYW4+XFxuXFx0XFx0XFx0XFx0XFx0IDxzcGFuPjE1IHRlYW0gbWVtYmVyczwvc3Bhbj5cXG5cXHRcXHRcXHRcXHQ8L2Rpdj5cXG5cXHRcXHRcXHQnO1xuXHRcdH07XG5cblx0XHR2YXIgX2xvb3AyID0gZnVuY3Rpb24gX2xvb3AyKGkpIHtcblx0XHRcdHZhciBhY2NvdW50ID0gYWNjb3VudHNbaV07XG5cdFx0XHR2YXIgZGl2ID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudCgnZGl2Jyk7XG5cdFx0XHRkaXYuY2xhc3NOYW1lID0gJ2JhYy0tdXNlci1saXN0LWl0ZW0nO1xuXHRcdFx0ZGl2LmlubmVySFRNTCA9IGFjY291bnRzVGVtcGxhdGUoYWNjb3VudCk7XG5cdFx0XHRkaXYub25jbGljayA9IGZ1bmN0aW9uIChlKSB7XG5cdFx0XHRcdGUucHJldmVudERlZmF1bHQoKTtcblx0XHRcdFx0UFBCQS5jaGFuZ2VBY2NvdW50KGFjY291bnQuc2ZpZCk7XG5cdFx0XHR9O1xuXHRcdFx0ZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoJy0tcHVyZXNkay11c2VyLWJ1c2luZXNzZXMtLScpLmFwcGVuZENoaWxkKGRpdik7XG5cdFx0fTtcblxuXHRcdGZvciAodmFyIGkgPSAwOyBpIDwgYWNjb3VudHMubGVuZ3RoOyBpKyspIHtcblx0XHRcdF9sb29wMihpKTtcblx0XHR9XG5cdH0sXG5cblx0cmVuZGVyOiBmdW5jdGlvbiByZW5kZXIoKSB7XG5cdFx0dmFyIHdoZXJlVG8gPSBkb2N1bWVudC5nZXRFbGVtZW50QnlJZChTdG9yZS5nZXRIVExNQ29udGFpbmVyKCkpO1xuXHRcdGlmICh3aGVyZVRvID09PSBudWxsKSB7XG5cdFx0XHRMb2dnZXIuZXJyb3IoJ3RoZSBjb250YWluZXIgd2l0aCBpZCBcIicgKyB3aGVyZVRvICsgJ1wiIGhhcyBub3QgYmVlbiBmb3VuZCBvbiB0aGUgZG9jdW1lbnQuIFRoZSBsaWJyYXJ5IGlzIGdvaW5nIHRvIGNyZWF0ZSBpdC4nKTtcblx0XHRcdHZhciBkaXYgPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KCdkaXYnKTtcblx0XHRcdGRpdi5pZCA9IFN0b3JlLmdldEhUTE1Db250YWluZXIoKTtcblx0XHRcdGRpdi5zdHlsZS53aWR0aCA9ICcxMDAlJztcblx0XHRcdGRpdi5zdHlsZS5oZWlnaHQgPSAnNjBweCc7XG5cdFx0XHRkb2N1bWVudC5ib2R5Lmluc2VydEJlZm9yZShkaXYsIGRvY3VtZW50LmJvZHkuZmlyc3RDaGlsZCk7XG5cdFx0XHR3aGVyZVRvID0gZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoU3RvcmUuZ2V0SFRMTUNvbnRhaW5lcigpKTtcblx0XHR9XG5cdFx0d2hlcmVUby5pbm5lckhUTUwgPSBTdG9yZS5nZXRIVE1MKFN0b3JlLmdldFVzZXJEYXRhKCkudXNlci5hY2NvdW50KTtcblx0XHRQUEJBLnJlbmRlclVzZXIoU3RvcmUuZ2V0VXNlckRhdGEoKS51c2VyKTtcblx0XHRQUEJBLnJlbmRlckFjY291bnRzKFN0b3JlLmdldFVzZXJEYXRhKCkudXNlci5hY2NvdW50cyk7XG5cdFx0aWYgKFN0b3JlLmdldEFwcHNWaXNpYmxlKCkgPT09IGZhbHNlKSB7XG5cdFx0XHRkb2N1bWVudC5nZXRFbGVtZW50QnlJZCgnLS1wdXJlc2RrLWFwcHMtc2VjdGlvbi0tJykuc3R5bGUgPSBcImRpc3BsYXk6bm9uZVwiO1xuXHRcdH1cblx0XHRhZnRlclJlbmRlcigpO1xuXHR9XG59O1xuXG5tb2R1bGUuZXhwb3J0cyA9IFBQQkE7IiwiJ3VzZSBzdHJpY3QnO1xuXG4vKiFcbiAqIFB1cmVQcm9maWxlIFB1cmVQcm9maWxlIEJ1c2luZXNzIEFwcHMgRGV2ZWxvcG1lbnQgU0RLXG4gKlxuICogdmVyc2lvbjogMC4wLjEtYWxwaGEuMTBcbiAqIGRhdGU6IDIwMTctMDMtMDlcbiAqXG4gKiBDb3B5cmlnaHQgMjAxNywgUHVyZVByb2ZpbGVcbiAqIFJlbGVhc2VkIHVuZGVyIE1JVCBsaWNlbnNlXG4gKiBodHRwczovL29wZW5zb3VyY2Uub3JnL2xpY2Vuc2VzL01JVFxuICovXG5cbnZhciBwcGJhID0gcmVxdWlyZSgnLi9QUEJBJyk7XG5wcGJhLnNldFdpbmRvd05hbWUoJ1BVUkVTREsnKTtcbnBwYmEuc2V0Q29uZmlndXJhdGlvbih7XG4gICAgXCJsb2dzXCI6IHRydWUsXG4gICAgXCJiYXNlVXJsXCI6IFwiL2FwaS92MS9cIixcbiAgICBcImxvZ2luVXJsXCI6IFwiL2FwaS92MS9vYXV0aDJcIixcbiAgICBcInNlYXJjaElucHV0SWRcIjogXCItLXB1cmVzZGstLXNlYXJjaC0taW5wdXQtLVwiLFxuICAgIFwicmVkaXJlY3RVcmxQYXJhbVwiOiBcInJlZGlyZWN0X3VybFwiXG59KTtcbnBwYmEuc2V0SFRNTFRlbXBsYXRlKCc8aGVhZGVyIGNsYXNzPVwiYmFjLS1oZWFkZXItYXBwc1wiPlxcbiAgICA8ZGl2IGNsYXNzPVwiYmFjLS1jb250YWluZXJcIj5cXG4gICAgICAgIDxkaXYgY2xhc3M9XCJiYWMtLWxvZ29cIj5cXG4gICAgICAgICAgICA8aW1nIHNyYz1cIicgKyBhY2NvdW50LnNka19sb2dvX2ljb24gKyAnXCIgYWx0PVwiXCI+XFxuICAgICAgICA8L2Rpdj5cXG4gICAgICAgIDxkaXYgY2xhc3M9XCJiYWMtLWhlYWRlci1zZWFyY2hcIj5cXG4gICAgICAgICAgICA8aW5wdXQgdHlwZT1cInNlYXJjaFwiIHBsYWNlaG9sZGVyPVwiU2VhcmNoXCIgaWQ9XCItLXB1cmVzZGstLXNlYXJjaC0taW5wdXQtLVwiPlxcbiAgICAgICAgICAgIDxpIGNsYXNzPVwiZmEgZmEtc2VhcmNoXCI+PC9pPlxcbiAgICAgICAgPC9kaXY+XFxuICAgICAgICA8ZGl2IGNsYXNzPVwiYmFjLS11c2VyLWFjdGlvbnNcIj5cXG4gICAgICAgICAgICA8ZGl2IGNsYXNzPVwiYmFjLS11c2VyLWFwcHNcIiBpZD1cIi0tcHVyZXNkay1hcHBzLXNlY3Rpb24tLVwiPlxcbiAgICAgICAgICAgICAgICA8aSBjbGFzcz1cImZhIGZhLXNxdWFyZXNcIiBpZD1cIi0tcHVyZXNkay1hcHBzLWljb24tLVwiPjwvaT5cXG5cXG4gICAgICAgICAgICAgICAgPGRpdiBjbGFzcz1cImJhYy0tYXBwcy1jb250YWluZXJcIiBpZD1cIi0tcHVyZXNkay1hcHBzLWNvbnRhaW5lci0tXCI+XFxuICAgICAgICAgICAgICAgICAgICA8ZGl2IGNsYXNzPVwiYmFjLS1hcHBzLWFycm93XCI+PC9kaXY+XFxuICAgICAgICAgICAgICAgIDwvZGl2PlxcbiAgICAgICAgICAgIDwvZGl2PlxcbiAgICAgICAgICAgIDwhLS08ZGl2IGNsYXNzPVwiYmFjJiM0NTsmIzQ1O3VzZXItbm90aWZpY2F0aW9uc1wiPi0tPlxcbiAgICAgICAgICAgICAgICA8IS0tPGRpdiBjbGFzcz1cImJhYyYjNDU7JiM0NTt1c2VyLW5vdGlmaWNhdGlvbnMtY291bnRcIj4xPC9kaXY+LS0+XFxuICAgICAgICAgICAgICAgIDwhLS08aSBjbGFzcz1cImZhIGZhLWJlbGwtb1wiPjwvaT4tLT5cXG4gICAgICAgICAgICA8IS0tPC9kaXY+LS0+XFxuICAgICAgICAgICAgPGRpdiBjbGFzcz1cImJhYy0tdXNlci1hdmF0YXJcIj5cXG4gICAgICAgICAgICAgICAgPHNwYW4gY2xhc3M9XCJiYWMtLXVzZXItYXZhdGFyLW5hbWVcIiBpZD1cIi0tcHVyZXNkay11c2VyLWF2YXRhci0tXCI+PC9zcGFuPlxcbiAgICAgICAgICAgIDwvZGl2PlxcbiAgICAgICAgPC9kaXY+XFxuICAgIDwvZGl2PlxcbjwvaGVhZGVyPlxcbjxkaXYgY2xhc3M9XCJiYWMtLXVzZXItc2lkZWJhclwiIGlkPVwiLS1wdXJlc2RrLXVzZXItc2lkZWJhci0tXCI+XFxuICAgIDxkaXYgaWQ9XCItLXB1cmVzZGstdXNlci1kZXRhaWxzLS1cIj48L2Rpdj5cXG4gICAgPCEtLTxkaXYgY2xhc3M9XCJiYWMmIzQ1OyYjNDU7dXNlci1zaWRlYmFyLWluZm9cIj4tLT5cXG4gICAgICAgIDwhLS08ZGl2IGNsYXNzPVwiYmFjJiM0NTsmIzQ1O3VzZXItaW1hZ2VcIj48aSBjbGFzcz1cImZhIGZhLWNhbWVyYVwiPjwvaT48L2Rpdj4tLT5cXG4gICAgICAgIDwhLS08ZGl2IGNsYXNzPVwiYmFjJiM0NTsmIzQ1O3VzZXItbmFtZVwiPkN1cnRpcyBCYXJ0bGV0dDwvZGl2Pi0tPlxcbiAgICAgICAgPCEtLTxkaXYgY2xhc3M9XCJiYWMmIzQ1OyYjNDU7dXNlci1lbWFpbFwiPmNiYXJ0bGV0dEBwdXJlcHJvZmlsZS5jb208L2Rpdj4tLT5cXG4gICAgPCEtLTwvZGl2Pi0tPlxcbiAgICA8ZGl2IGNsYXNzPVwiYmFjLS11c2VyLWFwcHNcIiBpZD1cIi0tcHVyZXNkay11c2VyLWJ1c2luZXNzZXMtLVwiPlxcbiAgICAgICAgPCEtLTxkaXYgY2xhc3M9XCJiYWMmIzQ1OyYjNDU7dXNlci1saXN0LWl0ZW1cIj4tLT5cXG4gICAgICAgICAgICA8IS0tPGltZyBzcmM9XCJodHRwOi8vbG9yZW1waXhlbC5jb20vNDAvNDBcIiBhbHQ9XCJcIj4tLT5cXG4gICAgICAgICAgICA8IS0tPGRpdiBjbGFzcz1cImJhYy11c2VyLWFwcC1kZXRhaWxzXCI+LS0+XFxuICAgICAgICAgICAgICAgIDwhLS08c3Bhbj48L3NwYW4+LS0+XFxuICAgICAgICAgICAgICAgIDwhLS08c3Bhbj4xNSB0ZWFtIG1lbWJlcnM8L3NwYW4+LS0+XFxuICAgICAgICAgICAgPCEtLTwvZGl2Pi0tPlxcbiAgICAgICAgPCEtLTwvZGl2Pi0tPlxcbiAgICA8L2Rpdj5cXG4gICAgPGRpdiBjbGFzcz1cImJhYy0tdXNlci1hY2NvdW50LXNldHRpbmdzXCI+XFxuICAgICAgICA8ZGl2IGNsYXNzPVwiYmFjLXVzZXItYWNvdW50LWxpc3QtaXRlbVwiPlxcbiAgICAgICAgICAgIDxpIGNsYXNzPVwiZmEgZmEtY29nLWxpbmVcIj48L2k+XFxuICAgICAgICAgICAgPGEgaHJlZj1cIiNcIj5BY291bnQgU2VjdXJpdHk8L2E+XFxuICAgICAgICA8L2Rpdj5cXG4gICAgICAgIDxkaXYgY2xhc3M9XCJiYWMtdXNlci1hY291bnQtbGlzdC1pdGVtXCI+XFxuICAgICAgICAgICAgPGkgY2xhc3M9XCJmYSBmYS1sb2NrLWxpbmVcIj48L2k+XFxuICAgICAgICAgICAgPGEgaHJlZj1cIiNcIj5BY291bnQgU2VjdXJpdHk8L2E+XFxuICAgICAgICA8L2Rpdj5cXG4gICAgICAgIDxkaXYgY2xhc3M9XCJiYWMtdXNlci1hY291bnQtbGlzdC1pdGVtXCI+XFxuICAgICAgICAgICAgPGkgY2xhc3M9XCJmYSBmYS1sb2dpbi1saW5lXCI+PC9pPlxcbiAgICAgICAgICAgIDxhIGhyZWY9XCIjXCI+QWNvdW50IFNlY3VyaXR5PC9hPlxcbiAgICAgICAgPC9kaXY+XFxuICAgIDwvZGl2PlxcbjwvZGl2PicpO1xuXG53aW5kb3cuUFVSRVNESyA9IHBwYmE7XG5cbnZhciBjc3MgPSAnaHRtbCxib2R5LGRpdixzcGFuLGFwcGxldCxvYmplY3QsaWZyYW1lLGgxLGgyLGgzLGg0LGg1LGg2LHAsYmxvY2txdW90ZSxwcmUsYSxhYmJyLGFjcm9ueW0sYWRkcmVzcyxiaWcsY2l0ZSxjb2RlLGRlbCxkZm4sZW0saW1nLGlucyxrYmQscSxzLHNhbXAsc21hbGwsc3RyaWtlLHN0cm9uZyxzdWIsc3VwLHR0LHZhcixiLHUsaSxjZW50ZXIsZGwsZHQsZGQsb2wsdWwsbGksZmllbGRzZXQsZm9ybSxsYWJlbCxsZWdlbmQsdGFibGUsY2FwdGlvbix0Ym9keSx0Zm9vdCx0aGVhZCx0cix0aCx0ZCxhcnRpY2xlLGFzaWRlLGNhbnZhcyxkZXRhaWxzLGVtYmVkLGZpZ3VyZSxmaWdjYXB0aW9uLGZvb3RlcixoZWFkZXIsaGdyb3VwLG1lbnUsbmF2LG91dHB1dCxydWJ5LHNlY3Rpb24sc3VtbWFyeSx0aW1lLG1hcmssYXVkaW8sdmlkZW97bWFyZ2luOjA7cGFkZGluZzowO2JvcmRlcjowO2ZvbnQtc2l6ZToxMDAlO2ZvbnQ6aW5oZXJpdDt2ZXJ0aWNhbC1hbGlnbjpiYXNlbGluZX1hcnRpY2xlLGFzaWRlLGRldGFpbHMsZmlnY2FwdGlvbixmaWd1cmUsZm9vdGVyLGhlYWRlcixoZ3JvdXAsbWVudSxuYXYsc2VjdGlvbntkaXNwbGF5OmJsb2NrfWJvZHl7bGluZS1oZWlnaHQ6MX1vbCx1bHtsaXN0LXN0eWxlOm5vbmV9YmxvY2txdW90ZSxxe3F1b3Rlczpub25lfWJsb2NrcXVvdGU6YmVmb3JlLGJsb2NrcXVvdGU6YWZ0ZXIscTpiZWZvcmUscTphZnRlcntjb250ZW50OlwiXCI7Y29udGVudDpub25lfXRhYmxle2JvcmRlci1jb2xsYXBzZTpjb2xsYXBzZTtib3JkZXItc3BhY2luZzowfWJvZHl7b3ZlcmZsb3cteDpoaWRkZW59I2JhYy13cmFwcGVye2ZvbnQtZmFtaWx5OlwiVmVyZGFuYVwiLCBhcmlhbCwgc2Fucy1zZXJpZjtjb2xvcjp3aGl0ZTttaW4taGVpZ2h0OjEwMHZoO3Bvc2l0aW9uOnJlbGF0aXZlfS5iYWMtLWNvbnRhaW5lcnttYXgtd2lkdGg6MTE2MHB4O21hcmdpbjowIGF1dG99LmJhYy0taGVhZGVyLWFwcHN7cG9zaXRpb246YWJzb2x1dGU7d2lkdGg6MTAwJTtoZWlnaHQ6NTBweDtiYWNrZ3JvdW5kLWNvbG9yOiM0NzUzNjk7cGFkZGluZzo1cHggMDt6LWluZGV4OjJ9LmJhYy0taGVhZGVyLWFwcHMgLmJhYy0tY29udGFpbmVye2hlaWdodDoxMDAlO2Rpc3BsYXk6ZmxleDthbGlnbi1pdGVtczpjZW50ZXI7anVzdGlmeS1jb250ZW50OnNwYWNlLWJldHdlZW59LmJhYy0taGVhZGVyLXNlYXJjaHtwb3NpdGlvbjpyZWxhdGl2ZX0uYmFjLS1oZWFkZXItc2VhcmNoIGlucHV0e2NvbG9yOiNmZmY7Zm9udC1zaXplOjE0cHg7aGVpZ2h0OjM1cHg7YmFja2dyb3VuZC1jb2xvcjojNmI3NTg2O3BhZGRpbmc6MCA1cHggMCAxMHB4O2JvcmRlcjpub25lO2JvcmRlci1yYWRpdXM6M3B4O21pbi13aWR0aDo0MDBweDt3aWR0aDoxMDAlfS5iYWMtLWhlYWRlci1zZWFyY2ggaW5wdXQ6Zm9jdXN7b3V0bGluZTpub25lfS5iYWMtLWhlYWRlci1zZWFyY2ggaW5wdXQ6Oi13ZWJraXQtaW5wdXQtcGxhY2Vob2xkZXJ7Zm9udC1zdHlsZTpub3JtYWwgIWltcG9ydGFudDt0ZXh0LWFsaWduOmNlbnRlcjtjb2xvcjojZmZmO2ZvbnQtc2l6ZToxNHB4O2ZvbnQtd2VpZ2h0OjMwMDtsZXR0ZXItc3BhY2luZzowLjVweH0uYmFjLS1oZWFkZXItc2VhcmNoIGlucHV0OjotbW96LXBsYWNlaG9sZGVye2ZvbnQtc3R5bGU6bm9ybWFsICFpbXBvcnRhbnQ7dGV4dC1hbGlnbjpjZW50ZXI7Y29sb3I6I2ZmZjtmb250LXNpemU6MTRweDtmb250LXdlaWdodDozMDA7bGV0dGVyLXNwYWNpbmc6MC41cHh9LmJhYy0taGVhZGVyLXNlYXJjaCBpbnB1dDotbXMtaW5wdXQtcGxhY2Vob2xkZXJ7Zm9udC1zdHlsZTpub3JtYWwgIWltcG9ydGFudDt0ZXh0LWFsaWduOmNlbnRlcjtjb2xvcjojZmZmO2ZvbnQtc2l6ZToxNHB4O2ZvbnQtd2VpZ2h0OjMwMDtsZXR0ZXItc3BhY2luZzowLjVweH0uYmFjLS1oZWFkZXItc2VhcmNoIGl7cG9zaXRpb246YWJzb2x1dGU7dG9wOjhweDtyaWdodDoxMHB4fS5iYWMtLXVzZXItYWN0aW9uc3tkaXNwbGF5OmZsZXg7YWxpZ24taXRlbXM6Y2VudGVyfS5iYWMtLXVzZXItYWN0aW9ucz5kaXZ7Y3Vyc29yOnBvaW50ZXI7Y29sb3I6d2hpdGV9LmJhYy0tdXNlci1hY3Rpb25zIC5iYWMtLXVzZXItbm90aWZpY2F0aW9uc3twb3NpdGlvbjpyZWxhdGl2ZX0uYmFjLS11c2VyLWFjdGlvbnMgLmJhYy0tdXNlci1ub3RpZmljYXRpb25zIGl7Zm9udC1zaXplOjIwcHh9LmJhYy0tdXNlci1hY3Rpb25zIC5iYWMtLXVzZXItbm90aWZpY2F0aW9ucy1jb3VudHtwb3NpdGlvbjphYnNvbHV0ZTtkaXNwbGF5OmlubGluZS1ibG9jaztoZWlnaHQ6MTVweDt3aWR0aDoxNXB4O2xpbmUtaGVpZ2h0OjE1cHg7Y29sb3I6I2ZmZjtmb250LXNpemU6MTBweDt0ZXh0LWFsaWduOmNlbnRlcjtiYWNrZ3JvdW5kLWNvbG9yOiNmYzNiMzA7Ym9yZGVyLXJhZGl1czo1MCU7dG9wOi01cHg7bGVmdDotNXB4fS5iYWMtLXVzZXItYWN0aW9ucyAuYmFjLS11c2VyLWF2YXRhciwuYmFjLS11c2VyLWFjdGlvbnMgLmJhYy0tdXNlci1ub3RpZmljYXRpb25ze21hcmdpbi1sZWZ0OjIwcHh9LmJhYy0tdXNlci1hY3Rpb25zIC5iYWMtLXVzZXItYXZhdGFyLW5hbWV7Y29sb3I6I2ZmZjtiYWNrZ3JvdW5kLWNvbG9yOiNhZGFkYWQ7Ym9yZGVyLXJhZGl1czo1MCU7ZGlzcGxheTppbmxpbmUtYmxvY2s7aGVpZ2h0OjMwcHg7d2lkdGg6MzBweDtsaW5lLWhlaWdodDozMHB4O3RleHQtYWxpZ246Y2VudGVyO2ZvbnQtc2l6ZToxNHB4fS5iYWMtLXVzZXItYXBwc3twb3NpdGlvbjpyZWxhdGl2ZX0uYmFjLS1hcHBzLWNvbnRhaW5lcntiYWNrZ3JvdW5kOiNmZmY7cG9zaXRpb246YWJzb2x1dGU7dG9wOjQ1cHg7cmlnaHQ6LTQwcHg7ZGlzcGxheTpmbGV4O3dpZHRoOjM2MHB4O2ZsZXgtd3JhcDp3cmFwO2JvcmRlci1yYWRpdXM6MTBweDtwYWRkaW5nOjMwcHg7anVzdGlmeS1jb250ZW50OnNwYWNlLWJldHdlZW47dGV4dC1hbGlnbjpjZW50ZXI7LXdlYmtpdC1ib3gtc2hhZG93OjAgMCAxMHB4IDJweCByZ2JhKDAsMCwwLDAuMik7Ym94LXNoYWRvdzowIDAgMTBweCAycHggcmdiYSgwLDAsMCwwLjIpO29wYWNpdHk6MDt2aXNpYmlsaXR5OmhpZGRlbjt0cmFuc2l0aW9uOmFsbCAwLjRzIGVhc2V9LmJhYy0tYXBwcy1jb250YWluZXIuYWN0aXZle29wYWNpdHk6MTt2aXNpYmlsaXR5OnZpc2libGV9LmJhYy0tYXBwcy1jb250YWluZXIgLmJhYy0tYXBwcy1hcnJvd3twb3NpdGlvbjphYnNvbHV0ZTtkaXNwbGF5OmJsb2NrO2hlaWdodDoyMHB4O3dpZHRoOjIwcHg7dG9wOi0xMHB4O3JpZ2h0OjM2cHg7YmFja2dyb3VuZDojZmZmO3RyYW5zZm9ybTpyb3RhdGUoLTQ1ZGVnKTt6LWluZGV4OjF9LmJhYy0tYXBwcy1jb250YWluZXIgLmJhYy0tYXBwc3t3aWR0aDozMiU7ZGlzcGxheTpmbGV4O2ZvbnQtc2l6ZTozMHB4O21hcmdpbi1ib3R0b206NDBweDt0ZXh0LWFsaWduOmNlbnRlcjtqdXN0aWZ5LWNvbnRlbnQ6Y2VudGVyO2ZsZXgtd3JhcDp3cmFwfS5iYWMtLWFwcHMtY29udGFpbmVyIC5iYWMtLWFwcHMgYXtkaXNwbGF5OmJsb2NrO2NvbG9yOiNmZmY7dGV4dC1kZWNvcmF0aW9uOm5vbmU7d2lkdGg6NjVweDtoZWlnaHQ6NjVweDtsaW5lLWhlaWdodDo2NXB4O3RleHQtYWxpZ246Y2VudGVyO2JvcmRlci1yYWRpdXM6MTBweDstd2Via2l0LWJveC1zaGFkb3c6MCAwIDVweCAwIHJnYmEoMCwwLDAsMC4yKTtib3gtc2hhZG93OjAgMCA1cHggMCByZ2JhKDAsMCwwLDAuMil9LmJhYy0tYXBwcy1jb250YWluZXIgLmJhYy0tYXBwcyAuYmFjLS1hcHAtbmFtZXt3aWR0aDoxMDAlO2NvbG9yOiMwMDA7Zm9udC1zaXplOjE4cHg7cGFkZGluZzoxMHB4IDB9LmJhYy0tYXBwcy1jb250YWluZXIgLmJhYy0tYXBwcyAuYmFjLS1hcHAtZGVzY3JpcHRpb257Y29sb3I6IzkxOTE5MTtmb250LXNpemU6MTJweDtmb250LXN0eWxlOml0YWxpY30uYmFjLS11c2VyLXNpZGViYXJ7Zm9udC1mYW1pbHk6XCJWZXJkYW5hXCIsIGFyaWFsLCBzYW5zLXNlcmlmO2NvbG9yOndoaXRlO2JhY2tncm91bmQtY29sb3I6IzUxNWY3Nztib3gtc2l6aW5nOmJvcmRlci1ib3g7d2lkdGg6MzIwcHg7aGVpZ2h0OjEwMCU7cG9zaXRpb246YWJzb2x1dGU7dG9wOjA7cmlnaHQ6MDt6LWluZGV4OjE7cGFkZGluZy10b3A6NjBweDtvcGFjaXR5OjA7dHJhbnNmb3JtOnRyYW5zbGF0ZVgoMTAwJSk7dHJhbnNpdGlvbjphbGwgMC40cyBlYXNlfS5iYWMtLXVzZXItc2lkZWJhci5hY3RpdmV7b3BhY2l0eToxO3RyYW5zZm9ybTp0cmFuc2xhdGVYKDAlKX0uYmFjLS11c2VyLXNpZGViYXIgLmJhYy0tdXNlci1saXN0LWl0ZW17ZGlzcGxheTpmbGV4O2N1cnNvcjpwb2ludGVyO2FsaWduLWl0ZW1zOmNlbnRlcjtwYWRkaW5nOjEwcHggMTBweCAxMHB4IDQwcHg7Ym9yZGVyLWJvdHRvbToycHggc29saWQgIzZiNzU4Nn0uYmFjLS11c2VyLXNpZGViYXIgLmJhYy0tdXNlci1saXN0LWl0ZW06aG92ZXJ7YmFja2dyb3VuZC1jb2xvcjojNmI3NTg2fS5iYWMtLXVzZXItc2lkZWJhciAuYmFjLS11c2VyLWxpc3QtaXRlbSBpbWd7bWFyZ2luLXJpZ2h0OjIwcHg7Ym9yZGVyOjJweCBzb2xpZCAjZmZmfS5iYWMtLXVzZXItc2lkZWJhciAuYmFjLS11c2VyLWxpc3QtaXRlbSBzcGFue3dpZHRoOjEwMCU7ZGlzcGxheTpibG9jazttYXJnaW4tYm90dG9tOjVweH0uYmFjLS11c2VyLXNpZGViYXIgLmJhYy11c2VyLWFwcC1kZXRhaWxzIHNwYW57Zm9udC1zaXplOjEycHh9LmJhYy0tdXNlci1zaWRlYmFyLWluZm97ZGlzcGxheTpmbGV4O2p1c3RpZnktY29udGVudDpjZW50ZXI7ZmxleC13cmFwOndyYXA7dGV4dC1hbGlnbjpjZW50ZXI7cGFkZGluZzoxMHB4IDIwcHggMTVweH0uYmFjLS11c2VyLXNpZGViYXItaW5mbyAuYmFjLS11c2VyLWltYWdle2Rpc3BsYXk6aW5saW5lLWJsb2NrO2hlaWdodDo4MHB4O3dpZHRoOjgwcHg7bGluZS1oZWlnaHQ6ODBweDt0ZXh0LWFsaWduOmNlbnRlcjtjb2xvcjojZmZmO2JvcmRlci1yYWRpdXM6NTAlO2JhY2tncm91bmQtY29sb3I6I2FkYWRhZDttYXJnaW4tYm90dG9tOjE1cHh9LmJhYy0tdXNlci1zaWRlYmFyLWluZm8gLmJhYy0tdXNlci1pbWFnZSBpe2ZvbnQtc2l6ZTozMnB4fS5iYWMtLXVzZXItc2lkZWJhci1pbmZvIC5iYWMtLXVzZXItbmFtZXt3aWR0aDoxMDAlO3RleHQtYWxpZ246Y2VudGVyO2ZvbnQtc2l6ZToxOHB4O21hcmdpbi1ib3R0b206MTBweH0uYmFjLS11c2VyLXNpZGViYXItaW5mbyAuYmFjLS11c2VyLWVtYWlse2ZvbnQtc2l6ZToxMnB4O2ZvbnQtd2VpZ2h0OjMwMH0uYmFjLS11c2VyLWFjY291bnQtc2V0dGluZ3N7cGFkZGluZzo1MHB4fS5iYWMtLXVzZXItYWNjb3VudC1zZXR0aW5ncyAuYmFjLXVzZXItYWNvdW50LWxpc3QtaXRlbXtkaXNwbGF5OmZsZXg7YWxpZ24taXRlbXM6Y2VudGVyO21hcmdpbi1ib3R0b206MzBweH0uYmFjLS11c2VyLWFjY291bnQtc2V0dGluZ3MgLmJhYy11c2VyLWFjb3VudC1saXN0LWl0ZW0gYXt0ZXh0LWRlY29yYXRpb246bm9uZTtjb2xvcjojZmZmfS5iYWMtLXVzZXItYWNjb3VudC1zZXR0aW5ncyAuYmFjLXVzZXItYWNvdW50LWxpc3QtaXRlbSBpe2ZvbnQtc2l6ZToyNHB4O21hcmdpbi1yaWdodDoyMHB4fScsXG4gICAgaGVhZCA9IGRvY3VtZW50LmhlYWQgfHwgZG9jdW1lbnQuZ2V0RWxlbWVudHNCeVRhZ05hbWUoJ2hlYWQnKVswXSxcbiAgICBzdHlsZSA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoJ3N0eWxlJyk7XG5cbnN0eWxlLnR5cGUgPSAndGV4dC9jc3MnO1xuaWYgKHN0eWxlLnN0eWxlU2hlZXQpIHtcbiAgICBzdHlsZS5zdHlsZVNoZWV0LmNzc1RleHQgPSBjc3M7XG59IGVsc2Uge1xuICAgIHN0eWxlLmFwcGVuZENoaWxkKGRvY3VtZW50LmNyZWF0ZVRleHROb2RlKGNzcykpO1xufVxuaGVhZC5hcHBlbmRDaGlsZChzdHlsZSk7XG5cbnZhciBsaW5rID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudCgnbGluaycpO1xubGluay5ocmVmID0gJ2h0dHBzOi8vZmlsZS5teWZvbnRhc3RpYy5jb20vTUR2blJKR2hCZDV4VmNYbjR1UUpTWi9pY29ucy5jc3MnO1xubGluay5yZWwgPSAnc3R5bGVzaGVldCc7XG5cbmRvY3VtZW50LmdldEVsZW1lbnRzQnlUYWdOYW1lKCdoZWFkJylbMF0uYXBwZW5kQ2hpbGQobGluayk7XG5cbm1vZHVsZS5leHBvcnRzID0gcHBiYTsiLCIndXNlIHN0cmljdCc7XG5cbnZhciBTdG9yZSA9IHJlcXVpcmUoJy4vc3RvcmUuanMnKTtcbnZhciBMb2dnZXIgPSByZXF1aXJlKCcuL2xvZ2dlcicpO1xuXG52YXIgQ2FsbGVyID0ge1xuXHQvKlxuIGV4cGVjdGUgYXR0cmlidXRlczpcbiAtIHR5cGUgKGVpdGhlciBHRVQsIFBPU1QsIERFTEVURSwgUFVUKVxuIC0gZW5kcG9pbnRcbiAtIHBhcmFtcyAoaWYgYW55LiBBIGpzb24gd2l0aCBwYXJhbWV0ZXJzIHRvIGJlIHBhc3NlZCBiYWNrIHRvIHRoZSBlbmRwb2ludClcbiAtIGNhbGxiYWNrczogYW4gb2JqZWN0IHdpdGg6XG4gXHQtIHN1Y2Nlc3M6IHRoZSBzdWNjZXNzIGNhbGxiYWNrXG4gXHQtIGZhaWw6IHRoZSBmYWlsIGNhbGxiYWNrXG4gICovXG5cdG1ha2VDYWxsOiBmdW5jdGlvbiBtYWtlQ2FsbChhdHRycykge1xuXHRcdHZhciBlbmRwb2ludFVybCA9IGF0dHJzLmVuZHBvaW50O1xuXG5cdFx0dmFyIHhociA9IG5ldyBYTUxIdHRwUmVxdWVzdCgpO1xuXHRcdHhoci5vcGVuKGF0dHJzLnR5cGUsIGVuZHBvaW50VXJsKTtcblx0XHQvL3hoci53aXRoQ3JlZGVudGlhbHMgPSB0cnVlO1xuXHRcdHhoci5zZXRSZXF1ZXN0SGVhZGVyKCdDb250ZW50LVR5cGUnLCAnYXBwbGljYXRpb24vanNvbicpO1xuXHRcdHhoci5vbmxvYWQgPSBmdW5jdGlvbiAoKSB7XG5cdFx0XHRpZiAoeGhyLnN0YXR1cyA+PSAyMDAgJiYgeGhyLnN0YXR1cyA8IDMwMCkge1xuXHRcdFx0XHRhdHRycy5jYWxsYmFja3Muc3VjY2VzcyhKU09OLnBhcnNlKHhoci5yZXNwb25zZVRleHQpKTtcblx0XHRcdH0gZWxzZSBpZiAoeGhyLnN0YXR1cyAhPT0gMjAwKSB7XG5cdFx0XHRcdGF0dHJzLmNhbGxiYWNrcy5mYWlsKEpTT04ucGFyc2UoeGhyLnJlc3BvbnNlVGV4dCkpO1xuXHRcdFx0fVxuXHRcdH07XG5cblx0XHRpZiAoIWF0dHJzLnBhcmFtcykge1xuXHRcdFx0YXR0cnMucGFyYW1zID0ge307XG5cdFx0fVxuXHRcdHhoci5zZW5kKEpTT04uc3RyaW5naWZ5KGF0dHJzLnBhcmFtcykpO1xuXHR9LFxuXG5cdHByb21pc2VDYWxsOiBmdW5jdGlvbiBwcm9taXNlQ2FsbChhdHRycykge1xuXHRcdHJldHVybiBuZXcgUHJvbWlzZShmdW5jdGlvbiAocmVzb2x2ZSwgcmVqZWN0KSB7XG5cdFx0XHR2YXIgeGhyID0gbmV3IFhNTEh0dHBSZXF1ZXN0KCk7XG5cdFx0XHR4aHIub3BlbihhdHRycy50eXBlLCBhdHRycy5lbmRwb2ludCk7XG5cdFx0XHR4aHIuc2V0UmVxdWVzdEhlYWRlcignQ29udGVudC1UeXBlJywgJ2FwcGxpY2F0aW9uL2pzb24nKTtcblx0XHRcdHhoci5vbmxvYWQgPSBmdW5jdGlvbiAoKSB7XG5cdFx0XHRcdGlmICh0aGlzLnN0YXR1cyA+PSAyMDAgJiYgdGhpcy5zdGF0dXMgPCAzMDApIHtcblx0XHRcdFx0XHRhdHRycy5taWRkbGV3YXJlcy5zdWNjZXNzKEpTT04ucGFyc2UoeGhyLnJlc3BvbnNlVGV4dCkpO1xuXHRcdFx0XHRcdHJlc29sdmUoSlNPTi5wYXJzZSh4aHIucmVzcG9uc2VUZXh0KSk7XG5cdFx0XHRcdH0gZWxzZSB7XG5cdFx0XHRcdFx0d2luZG93LmxvY2F0aW9uID0gU3RvcmUuZ2V0TG9naW5VcmwoKTtcblx0XHRcdFx0fVxuXHRcdFx0fTtcblx0XHRcdHhoci5vbmVycm9yID0gZnVuY3Rpb24gKCkge1xuXHRcdFx0XHR3aW5kb3cubG9jYXRpb24gPSBTdG9yZS5nZXRMb2dpblVybCgpO1xuXHRcdFx0fTtcblx0XHRcdHhoci5zZW5kKCk7XG5cdFx0fSk7XG5cdH1cbn07XG5cbm1vZHVsZS5leHBvcnRzID0gQ2FsbGVyOyIsIid1c2Ugc3RyaWN0JztcblxudmFyIERvbSA9IHtcbiAgICBoYXNDbGFzczogZnVuY3Rpb24gaGFzQ2xhc3MoZWwsIGNsYXNzTmFtZSkge1xuICAgICAgICBpZiAoZWwuY2xhc3NMaXN0KSByZXR1cm4gZWwuY2xhc3NMaXN0LmNvbnRhaW5zKGNsYXNzTmFtZSk7ZWxzZSByZXR1cm4gbmV3IFJlZ0V4cCgnKF58ICknICsgY2xhc3NOYW1lICsgJyggfCQpJywgJ2dpJykudGVzdChlbC5jbGFzc05hbWUpO1xuICAgIH0sXG5cbiAgICByZW1vdmVDbGFzczogZnVuY3Rpb24gcmVtb3ZlQ2xhc3MoZWwsIGNsYXNzTmFtZSkge1xuICAgICAgICBpZiAoZWwuY2xhc3NMaXN0KSBlbC5jbGFzc0xpc3QucmVtb3ZlKGNsYXNzTmFtZSk7ZWxzZSBlbC5jbGFzc05hbWUgPSBlbC5jbGFzc05hbWUucmVwbGFjZShuZXcgUmVnRXhwKCcoXnxcXFxcYiknICsgY2xhc3NOYW1lLnNwbGl0KCcgJykuam9pbignfCcpICsgJyhcXFxcYnwkKScsICdnaScpLCAnICcpO1xuICAgIH0sXG5cbiAgICBhZGRDbGFzczogZnVuY3Rpb24gYWRkQ2xhc3MoZWwsIGNsYXNzTmFtZSkge1xuICAgICAgICBpZiAoZWwuY2xhc3NMaXN0KSBlbC5jbGFzc0xpc3QuYWRkKGNsYXNzTmFtZSk7ZWxzZSBlbC5jbGFzc05hbWUgKz0gJyAnICsgY2xhc3NOYW1lO1xuICAgIH0sXG5cbiAgICB0b2dnbGVDbGFzczogZnVuY3Rpb24gdG9nZ2xlQ2xhc3MoZWwsIGNsYXNzTmFtZSkge1xuICAgICAgICBpZiAodGhpcy5oYXNDbGFzcyhlbCwgY2xhc3NOYW1lKSkge1xuICAgICAgICAgICAgdGhpcy5yZW1vdmVDbGFzcyhlbCwgY2xhc3NOYW1lKTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIHRoaXMuYWRkQ2xhc3MoZWwsIGNsYXNzTmFtZSk7XG4gICAgICAgIH1cbiAgICB9XG59O1xuXG5tb2R1bGUuZXhwb3J0cyA9IERvbTsiLCIndXNlIHN0cmljdCc7XG5cbnZhciBTdG9yZSA9IHJlcXVpcmUoJy4vc3RvcmUuanMnKTtcblxudmFyIExvZ2dlciA9IHtcblx0XHRsb2c6IGZ1bmN0aW9uIGxvZyh3aGF0KSB7XG5cdFx0XHRcdGlmICghU3RvcmUubG9nc0VuYWJsZWQoKSkge1xuXHRcdFx0XHRcdFx0cmV0dXJuIGZhbHNlO1xuXHRcdFx0XHR9IGVsc2Uge1xuXHRcdFx0XHRcdFx0TG9nZ2VyLmxvZyA9IGNvbnNvbGUubG9nLmJpbmQoY29uc29sZSk7XG5cdFx0XHRcdFx0XHRMb2dnZXIubG9nKHdoYXQpO1xuXHRcdFx0XHR9XG5cdFx0fSxcblx0XHRlcnJvcjogZnVuY3Rpb24gZXJyb3IoZXJyKSB7XG5cdFx0XHRcdGlmICghU3RvcmUubG9nc0VuYWJsZWQoKSkge1xuXHRcdFx0XHRcdFx0cmV0dXJuIGZhbHNlO1xuXHRcdFx0XHR9IGVsc2Uge1xuXHRcdFx0XHRcdFx0TG9nZ2VyLmVycm9yID0gY29uc29sZS5lcnJvci5iaW5kKGNvbnNvbGUpO1xuXHRcdFx0XHRcdFx0TG9nZ2VyLmVycm9yKGVycik7XG5cdFx0XHRcdH1cblx0XHR9XG59O1xuXG5tb2R1bGUuZXhwb3J0cyA9IExvZ2dlcjsiLCIndXNlIHN0cmljdCc7XG5cbnZhciBTdG9yZSA9IHJlcXVpcmUoJy4vc3RvcmUuanMnKTtcbnZhciBMb2dnZXIgPSByZXF1aXJlKCcuL2xvZ2dlci5qcycpO1xuXG52YXIgYXZhaWxhYmxlTGlzdGVuZXJzID0ge1xuXHRzZWFyY2hLZXlVcDoge1xuXHRcdGluZm86ICdMaXN0ZW5lciBvbiBrZXlVcCBvZiBzZWFyY2ggaW5wdXQgb24gdG9wIGJhcidcblx0fSxcblx0c2VhcmNoRW50ZXI6IHtcblx0XHRpbmZvOiAnTGlzdGVuZXIgb24gZW50ZXIga2V5IHByZXNzZWQgb24gc2VhcmNoIGlucHV0IG9uIHRvcCBiYXInXG5cdH0sXG5cdHNlYXJjaE9uQ2hhbmdlOiB7XG5cdFx0aW5mbzogJ0xpc3RlbmVyIG9uIGNoYW5nZSBvZiBpbnB1dCB2YWx1ZSdcblx0fVxufTtcblxudmFyIFB1YlN1YiA9IHtcblx0Z2V0QXZhaWxhYmxlTGlzdGVuZXJzOiBmdW5jdGlvbiBnZXRBdmFpbGFibGVMaXN0ZW5lcnMoKSB7XG5cdFx0cmV0dXJuIGF2YWlsYWJsZUxpc3RlbmVycztcblx0fSxcblxuXHRzdWJzY3JpYmU6IGZ1bmN0aW9uIHN1YnNjcmliZShldmVudHQsIGZ1bmN0KSB7XG5cdFx0aWYgKGV2ZW50dCA9PT0gXCJzZWFyY2hLZXlVcFwiKSB7XG5cdFx0XHR2YXIgZWwgPSBkb2N1bWVudC5nZXRFbGVtZW50QnlJZChTdG9yZS5nZXRTZWFyY2hJbnB1dElkKCkpO1xuXHRcdFx0ZWwuYWRkRXZlbnRMaXN0ZW5lcigna2V5dXAnLCBmdW5jdCk7XG5cdFx0XHRyZXR1cm4gZnVuY3Rpb24gKCkge1xuXHRcdFx0XHRlbC5yZW1vdmVFdmVudExpc3RlbmVyKCdrZXl1cCcsIGZ1bmN0LCBmYWxzZSk7XG5cdFx0XHR9O1xuXHRcdH0gZWxzZSBpZiAoZXZlbnR0ID09PSAnc2VhcmNoRW50ZXInKSB7XG5cdFx0XHR2YXIgaGFuZGxpbmdGdW5jdCA9IGZ1bmN0aW9uIGhhbmRsaW5nRnVuY3QoZSkge1xuXHRcdFx0XHRpZiAoZS5rZXlDb2RlID09PSAxMykge1xuXHRcdFx0XHRcdGZ1bmN0KGUpO1xuXHRcdFx0XHR9XG5cdFx0XHR9O1xuXHRcdFx0ZWwuYWRkRXZlbnRMaXN0ZW5lcigna2V5ZG93bicsIGhhbmRsaW5nRnVuY3QpO1xuXHRcdFx0cmV0dXJuIGZ1bmN0aW9uICgpIHtcblx0XHRcdFx0ZWwucmVtb3ZlRXZlbnRMaXN0ZW5lcigna2V5ZG93bicsIGhhbmRsaW5nRnVuY3QsIGZhbHNlKTtcblx0XHRcdH07XG5cdFx0fSBlbHNlIGlmIChldmVudHQgPT09ICdzZWFyY2hPbkNoYW5nZScpIHtcblx0XHRcdHZhciBlbCA9IGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKFN0b3JlLmdldFNlYXJjaElucHV0SWQoKSk7XG5cdFx0XHRlbC5hZGRFdmVudExpc3RlbmVyKCdjaGFuZ2UnLCBmdW5jdCk7XG5cdFx0XHRyZXR1cm4gZnVuY3Rpb24gKCkge1xuXHRcdFx0XHRlbC5yZW1vdmVFdmVudExpc3RlbmVyKCdrZXl1cCcsIGZ1bmN0LCBmYWxzZSk7XG5cdFx0XHR9O1xuXHRcdH0gZWxzZSB7XG5cdFx0XHRMb2dnZXIuZXJyb3IoJ1RoZSBldmVudCB5b3UgdHJpZWQgdG8gc3Vic2NyaWJlIGlzIG5vdCBhdmFpbGFibGUgYnkgdGhlIGxpYnJhcnknKTtcblx0XHRcdExvZ2dlci5sb2coJ1RoZSBhdmFpbGFibGUgZXZlbnRzIGFyZTogJywgYXZhaWxhYmxlTGlzdGVuZXJzKTtcblx0XHRcdHJldHVybiBmdW5jdGlvbiAoKSB7fTtcblx0XHR9XG5cdH1cbn07XG5cbm1vZHVsZS5leHBvcnRzID0gUHViU3ViOyIsIlwidXNlIHN0cmljdFwiO1xuXG52YXIgc3RhdGUgPSB7XG5cdGdlbmVyYWw6IHt9LFxuXHR1c2VyRGF0YToge30sXG5cdGNvbmZpZ3VyYXRpb246IHt9LFxuXHRodG1sVGVtcGxhdGU6IFwiXCIsXG5cdGFwcHM6IG51bGxcbn07XG5cbmZ1bmN0aW9uIGFzc2VtYmxlKGxpdGVyYWwsIHBhcmFtcykge1xuXHRyZXR1cm4gbmV3IEZ1bmN0aW9uKHBhcmFtcywgXCJyZXR1cm4gYFwiICsgbGl0ZXJhbCArIFwiYDtcIik7XG59XG5cbnZhciBTdG9yZSA9IHtcblx0Z2V0U3RhdGU6IGZ1bmN0aW9uIGdldFN0YXRlKCkge1xuXHRcdHJldHVybiBPYmplY3QuYXNzaWduKHt9LCBzdGF0ZSk7XG5cdH0sXG5cblx0c2V0V2luZG93TmFtZTogZnVuY3Rpb24gc2V0V2luZG93TmFtZSh3bikge1xuXHRcdHN0YXRlLmdlbmVyYWwud2luZG93TmFtZSA9IHduO1xuXHR9LFxuXG5cdC8qXG4gIGNvbmY6XG4gIC0gaGVhZGVyRGl2SWRcbiAgLSBpbmNsdWRlQXBwc01lbnVcbiAgKi9cblx0c2V0Q29uZmlndXJhdGlvbjogZnVuY3Rpb24gc2V0Q29uZmlndXJhdGlvbihjb25mKSB7XG5cdFx0c3RhdGUuY29uZmlndXJhdGlvbiA9IGNvbmY7XG5cdH0sXG5cblx0Z2V0QXBwc1Zpc2libGU6IGZ1bmN0aW9uIGdldEFwcHNWaXNpYmxlKCkge1xuXHRcdGlmIChzdGF0ZS5jb25maWd1cmF0aW9uLmFwcHNWaXNpYmxlID09PSBudWxsIHx8IHN0YXRlLmNvbmZpZ3VyYXRpb24uYXBwc1Zpc2libGUgPT09IHVuZGVmaW5lZCkge1xuXHRcdFx0cmV0dXJuIHRydWU7XG5cdFx0fSBlbHNlIHtcblx0XHRcdHJldHVybiBzdGF0ZS5jb25maWd1cmF0aW9uLmFwcHNWaXNpYmxlO1xuXHRcdH1cblx0fSxcblxuXHRzZXRBcHBzVmlzaWJsZTogZnVuY3Rpb24gc2V0QXBwc1Zpc2libGUoYXBwc1Zpc2libGUpIHtcblx0XHRzdGF0ZS5jb25maWd1cmF0aW9uLmFwcHNWaXNpYmxlID0gYXBwc1Zpc2libGU7XG5cdH0sXG5cblx0c2V0SFRNTFRlbXBsYXRlOiBmdW5jdGlvbiBzZXRIVE1MVGVtcGxhdGUodGVtcGxhdGUpIHtcblx0XHRzdGF0ZS5odG1sVGVtcGxhdGUgPSBmdW5jdGlvbiAoYWNjb3VudCkge1xuXHRcdFx0cmV0dXJuIHRlbXBsYXRlO1xuXHRcdH07XG5cdH0sXG5cblx0c2V0QXBwczogZnVuY3Rpb24gc2V0QXBwcyhhcHBzKSB7XG5cdFx0c3RhdGUuYXBwcyA9IGFwcHM7XG5cdH0sXG5cblx0Z2V0TG9naW5Vcmw6IGZ1bmN0aW9uIGdldExvZ2luVXJsKCkge1xuXHRcdHJldHVybiBzdGF0ZS5jb25maWd1cmF0aW9uLmxvZ2luVXJsICsgXCI/XCIgKyBzdGF0ZS5jb25maWd1cmF0aW9uLnJlZGlyZWN0VXJsUGFyYW0gKyBcIj1cIiArIHdpbmRvdy5sb2NhdGlvbi5ocmVmO1xuXHR9LFxuXG5cdGdldEF1dGhlbnRpY2F0aW9uRW5kcG9pbnQ6IGZ1bmN0aW9uIGdldEF1dGhlbnRpY2F0aW9uRW5kcG9pbnQoKSB7XG5cdFx0cmV0dXJuIHN0YXRlLmNvbmZpZ3VyYXRpb24uYmFzZVVybCArICdzZXNzaW9uJztcblx0fSxcblxuXHRnZXRTd2l0Y2hBY2NvdW50RW5kcG9pbnQ6IGZ1bmN0aW9uIGdldFN3aXRjaEFjY291bnRFbmRwb2ludChhY2NvdW50SWQpIHtcblx0XHRyZXR1cm4gc3RhdGUuY29uZmlndXJhdGlvbi5iYXNlVXJsICsgJ2FjY291bnRzL3N3aXRjaC8nICsgYWNjb3VudElkO1xuXHR9LFxuXG5cdGdldEFwcHNFbmRwb2ludDogZnVuY3Rpb24gZ2V0QXBwc0VuZHBvaW50KCkge1xuXHRcdHJldHVybiBzdGF0ZS5jb25maWd1cmF0aW9uLmJhc2VVcmwgKyAnYXBwcyc7XG5cdH0sXG5cblx0bG9nc0VuYWJsZWQ6IGZ1bmN0aW9uIGxvZ3NFbmFibGVkKCkge1xuXHRcdHJldHVybiBzdGF0ZS5jb25maWd1cmF0aW9uLmxvZ3M7XG5cdH0sXG5cblx0Z2V0U2VhcmNoSW5wdXRJZDogZnVuY3Rpb24gZ2V0U2VhcmNoSW5wdXRJZCgpIHtcblx0XHRyZXR1cm4gc3RhdGUuY29uZmlndXJhdGlvbi5zZWFyY2hJbnB1dElkO1xuXHR9LFxuXG5cdHNldEhUTUxDb250YWluZXI6IGZ1bmN0aW9uIHNldEhUTUxDb250YWluZXIoaWQpIHtcblx0XHRzdGF0ZS5jb25maWd1cmF0aW9uLmhlYWRlckRpdklkID0gaWQ7XG5cdH0sXG5cblx0Z2V0SFRMTUNvbnRhaW5lcjogZnVuY3Rpb24gZ2V0SFRMTUNvbnRhaW5lcigpIHtcblx0XHRpZiAoc3RhdGUuY29uZmlndXJhdGlvbi5oZWFkZXJEaXZJZCkge1xuXHRcdFx0cmV0dXJuIHN0YXRlLmNvbmZpZ3VyYXRpb24uaGVhZGVyRGl2SWQ7XG5cdFx0fSBlbHNlIHtcblx0XHRcdHJldHVybiBcInBwc2RrLWNvbnRhaW5lclwiO1xuXHRcdH1cblx0fSxcblxuXHRnZXRIVE1MOiBmdW5jdGlvbiBnZXRIVE1MKGFjY291bnQpIHtcblx0XHRyZXR1cm4gc3RhdGUuaHRtbFRlbXBsYXRlKGFjY291bnQpO1xuXHR9LFxuXG5cdGdldFdpbmRvd05hbWU6IGZ1bmN0aW9uIGdldFdpbmRvd05hbWUoKSB7XG5cdFx0cmV0dXJuIHN0YXRlLmdlbmVyYWwud2luZG93TmFtZTtcblx0fSxcblxuXHRzZXRVc2VyRGF0YTogZnVuY3Rpb24gc2V0VXNlckRhdGEodXNlckRhdGEpIHtcblx0XHRzdGF0ZS51c2VyRGF0YSA9IHVzZXJEYXRhO1xuXHR9LFxuXG5cdGdldFVzZXJEYXRhOiBmdW5jdGlvbiBnZXRVc2VyRGF0YSgpIHtcblx0XHRyZXR1cm4gc3RhdGUudXNlckRhdGE7XG5cdH1cbn07XG5cbm1vZHVsZS5leHBvcnRzID0gU3RvcmU7Il19
