(function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);var f=new Error("Cannot find module '"+o+"'");throw f.code="MODULE_NOT_FOUND",f}var l=n[o]={exports:{}};t[o][0].call(l.exports,function(e){var n=t[o][1][e];return s(n?n:e)},l,l.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){
var Logger = require('./modules/logger');
var PubSub = require('./modules/pubsub');
var Caller = require('./modules/caller');
var Dom = require('./modules/dom');
var InfoController = require('./modules/info-controller');
var AvatarController = require('./modules/avatar-controller');
var Store = require('./modules/store');
var ppbaConf = {};

var afterRender = function afterRender() {
	document.getElementById('--puresdk--apps--opener--').addEventListener('click', function (e) {
		e.stopPropagation();
		Dom.toggleClass(document.getElementById('--puresdk-apps-container--'), 'active');
	});

	document.getElementById('bac--user-avatar-top').addEventListener('click', function (e) {
		e.stopPropagation();
		Dom.removeClass(document.getElementById('--puresdk-apps-container--'), 'active');
		Dom.toggleClass(document.getElementById('--puresdk-user-sidebar--'), 'active');
	});

	window.addEventListener('click', function (e) {
		Dom.removeClass(document.getElementById('--puresdk-apps-container--'), 'active');
		Dom.removeClass(document.getElementById('--puresdk-user-sidebar--'), 'active');
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
			return '\n\t\t\t\t<a href="#" style="background: #' + app.color + '"><i class="' + app.icon + '"></i></a>\n\t\t\t\t<span class="bac--app-name">' + app.name + '</span>\n\t\t\t\t<span class="bac--app-description">' + app.descr + '</span>\n\t\t\t';
		};

		var _loop = function _loop(i) {
			var app = apps[i];
			var div = document.createElement("div");
			div.className = "bac--apps";
			div.innerHTML = appTemplate(app);
			div.onclick = function (e) {
				e.preventDefault();
				window.location.href = app.application_url;
			};
			document.getElementById("--puresdk-apps-container--").appendChild(div);
		};

		for (var i = 0; i < apps.length; i++) {
			_loop(i);
		}
	},

	renderUser: function renderUser(user) {
		var userTemplate = function userTemplate(user) {
			return '\n\t\t\t\t<div class="bac--user-image" id="bac--user-image">\n\t\t\t\t\t<i class="fa fa-camera"></i>\n\t\t\t   \t<div id="bac--user-image-file"></div>\n\t\t\t   \t<div id="bac--user-image-upload-progress">\n\t\t\t   \t\t<svg width=\'60px\' height=\'60px\' xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" preserveAspectRatio="xMidYMid" class="uil-default"><rect x="0" y="0" width="100" height="100" fill="none" class="bk"></rect><rect  x=\'46.5\' y=\'40\' width=\'7\' height=\'20\' rx=\'5\' ry=\'5\' fill=\'#ffffff\' transform=\'rotate(0 50 50) translate(0 -30)\'>  <animate attributeName=\'opacity\' from=\'1\' to=\'0\' dur=\'1s\' begin=\'-1s\' repeatCount=\'indefinite\'/></rect><rect  x=\'46.5\' y=\'40\' width=\'7\' height=\'20\' rx=\'5\' ry=\'5\' fill=\'#ffffff\' transform=\'rotate(30 50 50) translate(0 -30)\'>  <animate attributeName=\'opacity\' from=\'1\' to=\'0\' dur=\'1s\' begin=\'-0.9166666666666666s\' repeatCount=\'indefinite\'/></rect><rect  x=\'46.5\' y=\'40\' width=\'7\' height=\'20\' rx=\'5\' ry=\'5\' fill=\'#ffffff\' transform=\'rotate(60 50 50) translate(0 -30)\'>  <animate attributeName=\'opacity\' from=\'1\' to=\'0\' dur=\'1s\' begin=\'-0.8333333333333334s\' repeatCount=\'indefinite\'/></rect><rect  x=\'46.5\' y=\'40\' width=\'7\' height=\'20\' rx=\'5\' ry=\'5\' fill=\'#ffffff\' transform=\'rotate(90 50 50) translate(0 -30)\'>  <animate attributeName=\'opacity\' from=\'1\' to=\'0\' dur=\'1s\' begin=\'-0.75s\' repeatCount=\'indefinite\'/></rect><rect  x=\'46.5\' y=\'40\' width=\'7\' height=\'20\' rx=\'5\' ry=\'5\' fill=\'#ffffff\' transform=\'rotate(120 50 50) translate(0 -30)\'>  <animate attributeName=\'opacity\' from=\'1\' to=\'0\' dur=\'1s\' begin=\'-0.6666666666666666s\' repeatCount=\'indefinite\'/></rect><rect  x=\'46.5\' y=\'40\' width=\'7\' height=\'20\' rx=\'5\' ry=\'5\' fill=\'#ffffff\' transform=\'rotate(150 50 50) translate(0 -30)\'>  <animate attributeName=\'opacity\' from=\'1\' to=\'0\' dur=\'1s\' begin=\'-0.5833333333333334s\' repeatCount=\'indefinite\'/></rect><rect  x=\'46.5\' y=\'40\' width=\'7\' height=\'20\' rx=\'5\' ry=\'5\' fill=\'#ffffff\' transform=\'rotate(180 50 50) translate(0 -30)\'>  <animate attributeName=\'opacity\' from=\'1\' to=\'0\' dur=\'1s\' begin=\'-0.5s\' repeatCount=\'indefinite\'/></rect><rect  x=\'46.5\' y=\'40\' width=\'7\' height=\'20\' rx=\'5\' ry=\'5\' fill=\'#ffffff\' transform=\'rotate(210 50 50) translate(0 -30)\'>  <animate attributeName=\'opacity\' from=\'1\' to=\'0\' dur=\'1s\' begin=\'-0.4166666666666667s\' repeatCount=\'indefinite\'/></rect><rect  x=\'46.5\' y=\'40\' width=\'7\' height=\'20\' rx=\'5\' ry=\'5\' fill=\'#ffffff\' transform=\'rotate(240 50 50) translate(0 -30)\'>  <animate attributeName=\'opacity\' from=\'1\' to=\'0\' dur=\'1s\' begin=\'-0.3333333333333333s\' repeatCount=\'indefinite\'/></rect><rect  x=\'46.5\' y=\'40\' width=\'7\' height=\'20\' rx=\'5\' ry=\'5\' fill=\'#ffffff\' transform=\'rotate(270 50 50) translate(0 -30)\'>  <animate attributeName=\'opacity\' from=\'1\' to=\'0\' dur=\'1s\' begin=\'-0.25s\' repeatCount=\'indefinite\'/></rect><rect  x=\'46.5\' y=\'40\' width=\'7\' height=\'20\' rx=\'5\' ry=\'5\' fill=\'#ffffff\' transform=\'rotate(300 50 50) translate(0 -30)\'>  <animate attributeName=\'opacity\' from=\'1\' to=\'0\' dur=\'1s\' begin=\'-0.16666666666666666s\' repeatCount=\'indefinite\'/></rect><rect  x=\'46.5\' y=\'40\' width=\'7\' height=\'20\' rx=\'5\' ry=\'5\' fill=\'#ffffff\' transform=\'rotate(330 50 50) translate(0 -30)\'>  <animate attributeName=\'opacity\' from=\'1\' to=\'0\' dur=\'1s\' begin=\'-0.08333333333333333s\' repeatCount=\'indefinite\'/></rect></svg>\t\n\t\t\t\t\t</div>\n\t\t\t   </div>\n\t\t\t\t<div class="bac--user-name">' + user.firstname + ' ' + user.lastname + '</div>\n\t\t\t\t<div class="bac--user-email">' + user.email + '</div>\n\t\t\t';
		};
		var div = document.createElement('div');
		div.className = "bac--user-sidebar-info";
		div.innerHTML = userTemplate(user);
		document.getElementById('--puresdk-user-details--').appendChild(div);
		document.getElementById('--puresdk-user-avatar--').innerHTML = user.firstname.charAt(0) + user.lastname.charAt(0);
	},

	renderAccounts: function renderAccounts(accounts) {
		var accountsTemplate = function accountsTemplate(account) {
			return '\n\t\t\t\t<div class="bac--user-list-item-image">\n\t\t\t\t\t<img src="' + account.sdk_square_logo_icon + '" alt="">\n\t\t\t\t</div>\n\t\t\t\t<div class="bac-user-app-details">\n\t\t\t\t\t <span>' + account.name + '</span>\n\t\t\t\t</div>\n\t\t\t';
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

	renderInfoBlocks: function renderInfoBlocks() {
		var blocksTemplate = function blocksTemplate(index) {
			return '\n\t\t\t\t <div class="--puresdk-info-box--" id="--puresdk-info-box--' + index + '">\n\t\t\t\t \t<div class="bac--timer" id="bac--timer' + index + '"></div>\n\t\t\t\t\t <div class="bac--inner-info-box--">\n\t\t\t\t\t \t\t<div class="bac--info-icon-- fa-success"></div>\n\t\t\t\t\t \t\t<div class="bac--info-icon-- fa-warning"></div>\n\t\t\t\t\t \t\t<div class="bac--info-icon-- fa-info-1"></div>\n\t\t\t\t\t \t\t<div class="bac--info-icon-- fa-error"></div>\n\t\t\t\t\t \t\t <div class="bac--info-main-text--" id="bac--info-main-text--' + index + '"></div>\n\t\t\t\t\t \t\t <div class="bac--info-close-button-- fa-close-1" id="bac--info-close-button--' + index + '"></div>\n\t\t\t\t\t</div>\n\t\t\t\t</div>\n\t\t  ';
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
		var logo = document.createElement('img');
		logo.src = account.sdk_logo_icon;
		document.getElementById('--puresdk-account-logo--').appendChild(logo);
		document.getElementById('--puresdk-bac--header-apps--').style.cssText = "background: #" + account.sdk_background_color + "; color: #" + account.sdk_font_color;
		document.getElementById('--puresdk-user-sidebar--').style.cssText = "background: #" + account.sdk_background_color + "; color: #" + account.sdk_font_color;
		document.getElementById('--puresdk-account-logo--').onclick = function (e) {
			window.location.href = '/';
		};
		// document.getElementById('--puresdk--search--input--').style.cssText = "background: #" + account.sdk_search_background_color
		//   + "; color: #" + account.sdk_search_font_color;
	},

	goToLoginPage: function goToLoginPage() {
		window.location.href = Store.getLoginUrl();
	},

	/* LOADER */
	showLoader: function showLoader() {
		Dom.addClass(document.getElementById('--puresdk--loader--'), '--puresdk-visible');
	},

	hideLoader: function hideLoader() {
		Dom.removeClass(document.getElementById('--puresdk--loader--'), '--puresdk-visible');
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
			div.style.height = '50px';
			div.style.position = 'fixed';
			div.style.top = '0';
			div.style.zIndex = 9999999999;
			document.body.insertBefore(div, document.body.firstChild);
			whereTo = document.getElementById(Store.getHTLMContainer());
		}
		whereTo.innerHTML = Store.getHTML();
		PPBA.styleAccount(Store.getUserData().user.account);
		PPBA.renderUser(Store.getUserData().user);
		PPBA.renderInfoBlocks();
		PPBA.renderAccounts(Store.getUserData().user.accounts);
		PPBA.renderVersionNumber(Store.getVersionNumber());
		if (Store.getAppsVisible() === false) {
			document.getElementById('--puresdk-apps-section--').style.cssText = "display:none";
		}
		afterRender();
	}
};

module.exports = PPBA;
},{"./modules/avatar-controller":3,"./modules/caller":4,"./modules/dom":5,"./modules/info-controller":6,"./modules/logger":7,"./modules/pubsub":8,"./modules/store":9}],2:[function(require,module,exports){
'use strict';

/*!
 * PureProfile PureProfile Business Apps Development SDK
 *
 * version: 2.3.10
 * date: 2017-06-01
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
ppba.setHTMLTemplate('<header class="bac--header-apps" id="--puresdk-bac--header-apps--">\n    <div class="bac--container">\n        <div class="bac--logo" id="--puresdk-account-logo--"></div>\n        <div class="bac--user-actions">\n            <svg id="--puresdk--loader--" width="38" height="38" viewBox="0 0 44 44" xmlns="http://www.w3.org/2000/svg" stroke="#fff" style="\n    margin-right: 10px;\n">\n                <g fill="none" fill-rule="evenodd" stroke-width="2">\n                    <circle cx="22" cy="22" r="16.6437">\n                        <animate attributeName="r" begin="0s" dur="1.8s" values="1; 20" calcMode="spline" keyTimes="0; 1" keySplines="0.165, 0.84, 0.44, 1" repeatCount="indefinite"></animate>\n                        <animate attributeName="stroke-opacity" begin="0s" dur="1.8s" values="1; 0" calcMode="spline" keyTimes="0; 1" keySplines="0.3, 0.61, 0.355, 1" repeatCount="indefinite"></animate>\n                    </circle>\n                    <circle cx="22" cy="22" r="19.9282">\n                        <animate attributeName="r" begin="-0.9s" dur="1.8s" values="1; 20" calcMode="spline" keyTimes="0; 1" keySplines="0.165, 0.84, 0.44, 1" repeatCount="indefinite"></animate>\n                        <animate attributeName="stroke-opacity" begin="-0.9s" dur="1.8s" values="1; 0" calcMode="spline" keyTimes="0; 1" keySplines="0.3, 0.61, 0.355, 1" repeatCount="indefinite"></animate>\n                    </circle>\n                </g>\n            </svg>\n            <div class="bac--user-apps" id="--puresdk-apps-section--">\n                <div id="--puresdk--apps--opener--">\n                    <i class="fa fa-squares" id="--puresdk-apps-icon--"></i>\n                    <div class="--puresdk-apps-name--">apps</div>\n                </div>\n                <div class="bac--apps-container" id="--puresdk-apps-container--">\n                    <div class="bac--apps-arrow"></div>\n                </div>\n            </div>\n            <!--<div class="bac&#45;&#45;user-notifications">-->\n                <!--<div class="bac&#45;&#45;user-notifications-count">1</div>-->\n                <!--<i class="fa fa-bell-o"></i>-->\n            <!--</div>-->\n            <div class="bac--user-avatar" id="bac--user-avatar-top">\n                <span class="bac--user-avatar-name" id="--puresdk-user-avatar--"></span>\n                <div id="bac--image-container-top"></div>\n            </div>\n        </div>\n    </div>\n    <div id="bac--info-blocks-wrapper--"></div>\n</header>\n<div class="bac--user-sidebar" id="--puresdk-user-sidebar--">\n    <div id="--puresdk-user-details--"></div>\n    <!--<div class="bac&#45;&#45;user-sidebar-info">-->\n        <!--<div class="bac&#45;&#45;user-image"><i class="fa fa-camera"></i></div>-->\n        <!--<div class="bac&#45;&#45;user-name">Curtis Bartlett</div>-->\n        <!--<div class="bac&#45;&#45;user-email">cbartlett@pureprofile.com</div>-->\n    <!--</div>-->\n    <div class="bac--user-apps" id="--puresdk-user-businesses--">\n        <!--<div class="bac&#45;&#45;user-list-item">-->\n            <!--<img src="http://lorempixel.com/40/40" alt="">-->\n            <!--<div class="bac-user-app-details">-->\n                <!--<span></span>-->\n                <!--<span>15 team members</span>-->\n            <!--</div>-->\n        <!--</div>-->\n    </div>\n    <div class="bac--user-account-settings">\n        <!--<div class="bac-user-acount-list-item">-->\n            <!--<i class="fa fa-cog-line"></i>-->\n            <!--<a href="#">Account Security</a>-->\n        <!--</div>-->\n        <div class="bac-user-acount-list-item">\n            <i class="fa fa-login-line"></i>\n            <a href="/api/v1/sign-off">Log out</a>\n        </div>\n\n        <div id="puresdk-version-number" class="puresdk-version-number"></div>\n    </div>\n</div>\n<input style="display:none" type=\'file\' id=\'---puresdk-avatar-file\'>\n<input style="display:none" type=\'button\' id=\'---puresdk-avatar-submit\' value=\'Upload!\'>');
ppba.setVersionNumber('2.3.10');

window.PURESDK = ppba;

var css = 'html,body,div,span,applet,object,iframe,h1,h2,h3,h4,h5,h6,p,blockquote,pre,a,abbr,acronym,address,big,cite,code,del,dfn,em,img,ins,kbd,q,s,samp,small,strike,strong,sub,sup,tt,var,b,u,i,center,dl,dt,dd,ol,ul,li,fieldset,form,label,legend,table,caption,tbody,tfoot,thead,tr,th,td,article,aside,canvas,details,embed,figure,figcaption,footer,header,hgroup,menu,nav,output,ruby,section,summary,time,mark,audio,video{margin:0;padding:0;border:0;font-size:100%;font:inherit;vertical-align:baseline}article,aside,details,figcaption,figure,footer,header,hgroup,menu,nav,section{display:block}body{line-height:1}ol,ul{list-style:none}blockquote,q{quotes:none}blockquote:before,blockquote:after,q:before,q:after{content:"";content:none}table{border-collapse:collapse;border-spacing:0}body{overflow-x:hidden}#bac-wrapper{font-family:"Verdana", arial, sans-serif;color:white;min-height:100vh;position:relative}.bac--container{max-width:1160px;margin:0 auto}.bac--header-apps{position:absolute;width:100%;height:50px;background-color:#475369;padding:5px 10px;z-index:9999999;-webkit-box-shadow:0px 1px 12px 0px rgba(0,0,0,0.75);-moz-box-shadow:0px 1px 12px 0px rgba(0,0,0,0.75);box-shadow:0px 1px 12px 0px rgba(0,0,0,0.75)}.bac--header-apps .bac--container{height:100%;display:flex;align-items:center;justify-content:space-between}.bac--header-search{position:relative}.bac--header-search input{color:#fff;font-size:14px;height:35px;background-color:#6b7586;padding:0 5px 0 10px;border:none;border-radius:3px;min-width:400px;width:100%}.bac--header-search input:focus{outline:none}.bac--header-search input::-webkit-input-placeholder{font-style:normal !important;text-align:center;color:#fff;font-size:14px;font-weight:300;letter-spacing:0.5px}.bac--header-search input::-moz-placeholder{font-style:normal !important;text-align:center;color:#fff;font-size:14px;font-weight:300;letter-spacing:0.5px}.bac--header-search input:-ms-input-placeholder{font-style:normal !important;text-align:center;color:#fff;font-size:14px;font-weight:300;letter-spacing:0.5px}.bac--header-search i{position:absolute;top:8px;right:10px}.bac--user-actions{display:flex;align-items:center}.bac--user-actions>div{cursor:pointer;color:white}.bac--user-actions .bac--user-notifications{position:relative}.bac--user-actions .bac--user-notifications i{font-size:20px}.bac--user-actions #--puresdk--loader--{display:none}.bac--user-actions #--puresdk--loader--.--puresdk-visible{display:block}.bac--user-actions .bac--user-notifications-count{position:absolute;display:inline-block;height:15px;width:15px;line-height:15px;color:#fff;font-size:10px;text-align:center;background-color:#fc3b30;border-radius:50%;top:-5px;left:-5px}.bac--user-actions .bac--user-avatar,.bac--user-actions .bac--user-notifications{margin-left:20px}.bac--user-actions .bac--user-avatar{position:relative;overflow:hidden;border-radius:50%}.bac--user-actions .bac--user-avatar #bac--image-container-top{width:100%;heigth:100%;position:absolute;top:0;left:0;z-index:1;display:none}.bac--user-actions .bac--user-avatar #bac--image-container-top img{width:100%;height:100%}.bac--user-actions .bac--user-avatar #bac--image-container-top.--puresdk-visible{display:block}.bac--user-actions .bac--user-avatar-name{color:#fff;background-color:#adadad;display:inline-block;height:35px;width:35px;line-height:35px;text-align:center;font-size:14px}.bac--user-apps{position:relative}.bac--user-apps #--puresdk-apps-icon--{width:20px;display:inline-block;text-align:center}.bac--user-apps .--puresdk-apps-name--{font-size:8px;width:20px;text-align:center}#--puresdk-user-businesses--{height:calc(100vh - 458px);overflow:auto}.bac--apps-container{background:#fff;position:absolute;top:45px;right:-40px;display:flex;width:360px;flex-wrap:wrap;border-radius:10px;padding:30px;justify-content:space-between;text-align:center;-webkit-box-shadow:0 0 10px 2px rgba(0,0,0,0.2);box-shadow:0 0 10px 2px rgba(0,0,0,0.2);opacity:0;visibility:hidden;transition:all 0.4s ease}.bac--apps-container.active{opacity:1;visibility:visible}.bac--apps-container .bac--apps-arrow{position:absolute;display:block;height:20px;width:20px;top:-10px;right:36px;background:#fff;transform:rotate(-45deg);z-index:1}.bac--apps-container .bac--apps{width:32%;display:flex;font-size:30px;margin-bottom:40px;text-align:center;justify-content:center;flex-wrap:wrap}.bac--apps-container .bac--apps a{display:block;color:#fff;text-decoration:none;width:65px;height:65px;padding-top:3px;line-height:65px;text-align:center;border-radius:10px;-webkit-box-shadow:0 0 5px 0 rgba(0,0,0,0.2);box-shadow:0 0 5px 0 rgba(0,0,0,0.2)}.bac--apps-container .bac--apps .bac--app-name{width:100%;color:#000;font-size:14px;padding:10px 0 5px 0}.bac--apps-container .bac--apps .bac--app-description{color:#919191;font-size:12px;font-style:italic;line-height:1.3em}.bac--user-sidebar{font-family:"Verdana", arial, sans-serif;color:white;height:calc(100vh - 50px);background-color:#515f77;box-sizing:border-box;width:320px;position:absolute;top:0;right:0;z-index:999999;padding-top:10px;opacity:0;margin-top:50px;transform:translateX(100%);transition:all 0.4s ease}.bac--user-sidebar.active{opacity:1;transform:translateX(0%);-webkit-box-shadow:-1px 0px 12px 0px rgba(0,0,0,0.75);-moz-box-shadow:-1px 3px 12px 0px rgba(0,0,0,0.75);box-shadow:-1px 0px 12px 0px rgba(0,0,0,0.75)}.bac--user-sidebar .bac--user-list-item{display:flex;cursor:pointer;align-items:center;padding:10px 10px 10px 40px;border-bottom:2px solid #6b7586}.bac--user-sidebar .bac--user-list-item:hover{background-color:#6b7586}.bac--user-sidebar .bac--user-list-item .bac--user-list-item-image{width:40px;height:40px;border-radius:3px;border:2px solid #fff;margin-right:20px;display:flex;align-items:center;justify-content:center}.bac--user-sidebar .bac--user-list-item .bac--user-list-item-image>img{width:auto;height:auto;max-width:100%;max-height:100%}.bac--user-sidebar .bac--user-list-item span{width:100%;display:block;margin-bottom:5px}.bac--user-sidebar .bac-user-app-details span{font-size:12px}.bac--user-sidebar .puresdk-version-number{width:100%;text-align:right;padding-right:10px;position:absolute;bottom:10px;font-size:8px;opacity:0.5;left:0}.bac--user-sidebar-info{display:flex;justify-content:center;flex-wrap:wrap;text-align:center;padding:10px 20px 15px}.bac--user-sidebar-info .bac--user-image{border:1px #adadad solid;overflow:hidden;border-radius:50%;position:relative;cursor:pointer;display:inline-block;height:80px;width:80px;line-height:80px;text-align:center;color:#fff;border-radius:50%;background-color:#adadad;margin-bottom:15px}.bac--user-sidebar-info .bac--user-image #bac--user-image-file{display:none;position:absolute;z-index:1;top:0;left:0;width:100%;height:100%}.bac--user-sidebar-info .bac--user-image #bac--user-image-file img{width:100%;height:100%}.bac--user-sidebar-info .bac--user-image #bac--user-image-file.--puresdk-visible{display:block}.bac--user-sidebar-info .bac--user-image #bac--user-image-upload-progress{position:absolute;padding-top:10px;top:0;background:#666;z-index:4;display:none;width:100%;height:100%}.bac--user-sidebar-info .bac--user-image #bac--user-image-upload-progress.--puresdk-visible{display:block}.bac--user-sidebar-info .bac--user-image i{font-size:32px;font-size:32px;z-index:0;position:absolute;width:100%;left:0;background-color:rgba(0,0,0,0.5)}.bac--user-sidebar-info .bac--user-image:hover i{z-index:3}.bac--user-sidebar-info .bac--user-name{width:100%;text-align:center;font-size:18px;margin-bottom:10px}.bac--user-sidebar-info .bac--user-email{font-size:12px;font-weight:300}.bac--user-account-settings{padding:50px}.bac--user-account-settings .bac-user-acount-list-item{display:flex;align-items:center;margin-bottom:30px}.bac--user-account-settings .bac-user-acount-list-item a{text-decoration:none;color:#fff}.bac--user-account-settings .bac-user-acount-list-item i{font-size:24px;margin-right:20px}#--puresdk-account-logo--{cursor:pointer}#--puresdk-account-logo-- img{height:28px}#bac--info-blocks-wrapper--{position:relative}#bac--info-blocks-wrapper-- .--puresdk-info-box--{border-radius:0 0 3px 3px;overflow:hidden;z-index:99999999;position:fixed;top:-41px;width:470px;left:calc(50vw - 235px);height:40px;-webkit-transition:top 0.4s;transition:top 0.4s}#bac--info-blocks-wrapper-- .--puresdk-info-box--.bac--success{background:#14DA9E}#bac--info-blocks-wrapper-- .--puresdk-info-box--.bac--success .bac--inner-info-box-- div.bac--info-icon--.fa-success{display:inline-block}#bac--info-blocks-wrapper-- .--puresdk-info-box--.bac--info{background-color:#5BC0DE}#bac--info-blocks-wrapper-- .--puresdk-info-box--.bac--info .bac--inner-info-box-- div.bac--info-icon--.fa-info-1{display:inline-block}#bac--info-blocks-wrapper-- .--puresdk-info-box--.bac--warning{background:#F0AD4E}#bac--info-blocks-wrapper-- .--puresdk-info-box--.bac--warning .bac--inner-info-box-- div.bac--info-icon--.fa-warning{display:inline-block}#bac--info-blocks-wrapper-- .--puresdk-info-box--.bac--error{background:#EF4100}#bac--info-blocks-wrapper-- .--puresdk-info-box--.bac--error .bac--inner-info-box-- div.bac--info-icon--.fa-error{display:inline-block}#bac--info-blocks-wrapper-- .--puresdk-info-box-- .bac--timer{-webkit-transition-timing-function:linear;transition-timing-function:linear;position:absolute;bottom:0px;opacity:0.5;height:2px !important;background:white;width:0%}#bac--info-blocks-wrapper-- .--puresdk-info-box-- .bac--timer.bac--fullwidth{width:100%}#bac--info-blocks-wrapper-- .--puresdk-info-box--.bac--active--{top:0px}#bac--info-blocks-wrapper-- .--puresdk-info-box-- .bac--inner-info-box--{width:100%;padding:11px 15px;color:white}#bac--info-blocks-wrapper-- .--puresdk-info-box-- .bac--inner-info-box-- div{display:inline-block;height:18px;position:relative}#bac--info-blocks-wrapper-- .--puresdk-info-box-- .bac--inner-info-box-- div.bac--info-icon--{display:none;top:0px}#bac--info-blocks-wrapper-- .--puresdk-info-box-- .bac--inner-info-box-- .bac--info-icon--{margin-right:15px;width:10px;top:2px}#bac--info-blocks-wrapper-- .--puresdk-info-box-- .bac--inner-info-box-- .bac--info-main-text--{width:380px;margin-right:15px;font-size:12px;text-align:center}#bac--info-blocks-wrapper-- .--puresdk-info-box-- .bac--inner-info-box-- .bac--info-close-button--{width:10px;cursor:pointer;top:2px}',
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
		AvatarCtrl._submit = document.getElementById('---puresdk-avatar-submit');
		AvatarCtrl._file = document.getElementById('---puresdk-avatar-file');
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
		Dom.addClass(AvatarCtrl._progress, '--puresdk-visible');
		request.open('POST', url);
		request.send(data);
	},

	setAvatar: function setAvatar(url) {
		if (!url) {
			return;
		}

		Dom.removeClass(AvatarCtrl._progress, '--puresdk-visible');
		Dom.addClass(AvatarCtrl._sidebar_avatar, '--puresdk-visible');
		var img = document.createElement('img');
		img.src = url;
		AvatarCtrl._sidebar_avatar.innerHTML = '';
		AvatarCtrl._sidebar_avatar.appendChild(img);

		Dom.addClass(AvatarCtrl._top_avatar_container, '--puresdk-visible');
		var img_2 = document.createElement('img');
		img_2.src = url;
		AvatarCtrl._top_avatar_container.innerHTML = '';
		AvatarCtrl._top_avatar_container.appendChild(img_2);

		//  bac--image-container-top
	}
};

module.exports = AvatarCtrl;
},{"./caller":4,"./dom":5,"./logger":7,"./store":9}],4:[function(require,module,exports){
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
},{"./logger":7,"./store.js":9}],5:[function(require,module,exports){
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
},{}],6:[function(require,module,exports){
var dom = require('./dom');

var defaultHideIn = 5000;
var lastIndex = 1;

var infoBlocks = [];

var InfoController = {
	init: function init() {
		for (var i = 1; i < 5; i++) {
			(function x(i) {
				var closeFunction = function closeFunction() {
					dom.removeClass(document.getElementById('--puresdk-info-box--' + i), 'bac--active--');
					document.getElementById('bac--timer' + i).style.transition = '';
					dom.removeClass(document.getElementById('bac--timer' + i), 'bac--fullwidth');
					infoBlocks[i - 1].inUse = false;
					setTimeout(function () {
						if (infoBlocks[i - 1].closeTimeout) {
							clearTimeout(infoBlocks[i - 1].closeTimeout);
						}
						dom.removeClass(document.getElementById('--puresdk-info-box--' + i), 'bac--success');
						dom.removeClass(document.getElementById('--puresdk-info-box--' + i), 'bac--info');
						dom.removeClass(document.getElementById('--puresdk-info-box--' + i), 'bac--warning');
						dom.removeClass(document.getElementById('--puresdk-info-box--' + i), 'bac--error');
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
					element: document.getElementById('--puresdk-info-box--' + i),
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
},{"./dom":5}],7:[function(require,module,exports){
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
},{"./store.js":9}],8:[function(require,module,exports){
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
},{"./logger.js":7,"./store.js":9}],9:[function(require,module,exports){
var state = {
	general: {},
	userData: {},
	configuration: {},
	htmlTemplate: "",
	apps: null,
	versionNumber: ''
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

	getLoginUrl: function getLoginUrl() {
		return state.configuration.rootUrl + state.configuration.loginUrl + "?" + state.configuration.redirectUrlParam + "=" + window.location.href;
	},

	getAuthenticationEndpoint: function getAuthenticationEndpoint() {
		return state.configuration.rootUrl + state.configuration.baseUrl + 'session';
	},

	getSwitchAccountEndpoint: function getSwitchAccountEndpoint(accountId) {
		return state.configuration.rootUrl + state.configuration.baseUrl + 'accounts/switch/' + accountId;
	},

	getAppsEndpoint: function getAppsEndpoint() {
		return state.configuration.rootUrl + state.configuration.baseUrl + 'apps';
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
	},

	setRootUrl: function setRootUrl(rootUrl) {
		state.configuration.rootUrl = rootUrl;
	},

	getAvatarUploadUrl: function getAvatarUploadUrl() {
		return state.configuration.rootUrl + state.configuration.baseUrl + 'assets/upload';
	},

	getAvatarUpdateUrl: function getAvatarUpdateUrl() {
		return state.configuration.rootUrl + state.configuration.baseUrl + 'users/avatar';
	}
};

module.exports = Store;
},{}]},{},[2])
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uLy4uL25vZGVfbW9kdWxlcy9icm93c2VyLXBhY2svX3ByZWx1ZGUuanMiLCJQUEJBLmpzIiwiaW5kZXguanMiLCJtb2R1bGVzL2F2YXRhci1jb250cm9sbGVyLmpzIiwibW9kdWxlcy9jYWxsZXIuanMiLCJtb2R1bGVzL2RvbS5qcyIsIm1vZHVsZXMvaW5mby1jb250cm9sbGVyLmpzIiwibW9kdWxlcy9sb2dnZXIuanMiLCJtb2R1bGVzL3B1YnN1Yi5qcyIsIm1vZHVsZXMvc3RvcmUuanMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7QUNBQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNuU0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUM5Q0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3ZIQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3ZEQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3RCQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQzlGQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNyQkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3JEQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBIiwiZmlsZSI6ImdlbmVyYXRlZC5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzQ29udGVudCI6WyIoZnVuY3Rpb24gZSh0LG4scil7ZnVuY3Rpb24gcyhvLHUpe2lmKCFuW29dKXtpZighdFtvXSl7dmFyIGE9dHlwZW9mIHJlcXVpcmU9PVwiZnVuY3Rpb25cIiYmcmVxdWlyZTtpZighdSYmYSlyZXR1cm4gYShvLCEwKTtpZihpKXJldHVybiBpKG8sITApO3ZhciBmPW5ldyBFcnJvcihcIkNhbm5vdCBmaW5kIG1vZHVsZSAnXCIrbytcIidcIik7dGhyb3cgZi5jb2RlPVwiTU9EVUxFX05PVF9GT1VORFwiLGZ9dmFyIGw9bltvXT17ZXhwb3J0czp7fX07dFtvXVswXS5jYWxsKGwuZXhwb3J0cyxmdW5jdGlvbihlKXt2YXIgbj10W29dWzFdW2VdO3JldHVybiBzKG4/bjplKX0sbCxsLmV4cG9ydHMsZSx0LG4scil9cmV0dXJuIG5bb10uZXhwb3J0c312YXIgaT10eXBlb2YgcmVxdWlyZT09XCJmdW5jdGlvblwiJiZyZXF1aXJlO2Zvcih2YXIgbz0wO288ci5sZW5ndGg7bysrKXMocltvXSk7cmV0dXJuIHN9KSIsInZhciBMb2dnZXIgPSByZXF1aXJlKCcuL21vZHVsZXMvbG9nZ2VyJyk7XG52YXIgUHViU3ViID0gcmVxdWlyZSgnLi9tb2R1bGVzL3B1YnN1YicpO1xudmFyIENhbGxlciA9IHJlcXVpcmUoJy4vbW9kdWxlcy9jYWxsZXInKTtcbnZhciBEb20gPSByZXF1aXJlKCcuL21vZHVsZXMvZG9tJyk7XG52YXIgSW5mb0NvbnRyb2xsZXIgPSByZXF1aXJlKCcuL21vZHVsZXMvaW5mby1jb250cm9sbGVyJyk7XG52YXIgQXZhdGFyQ29udHJvbGxlciA9IHJlcXVpcmUoJy4vbW9kdWxlcy9hdmF0YXItY29udHJvbGxlcicpO1xudmFyIFN0b3JlID0gcmVxdWlyZSgnLi9tb2R1bGVzL3N0b3JlJyk7XG52YXIgcHBiYUNvbmYgPSB7fTtcblxudmFyIGFmdGVyUmVuZGVyID0gZnVuY3Rpb24gYWZ0ZXJSZW5kZXIoKSB7XG5cdGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKCctLXB1cmVzZGstLWFwcHMtLW9wZW5lci0tJykuYWRkRXZlbnRMaXN0ZW5lcignY2xpY2snLCBmdW5jdGlvbiAoZSkge1xuXHRcdGUuc3RvcFByb3BhZ2F0aW9uKCk7XG5cdFx0RG9tLnRvZ2dsZUNsYXNzKGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKCctLXB1cmVzZGstYXBwcy1jb250YWluZXItLScpLCAnYWN0aXZlJyk7XG5cdH0pO1xuXG5cdGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKCdiYWMtLXVzZXItYXZhdGFyLXRvcCcpLmFkZEV2ZW50TGlzdGVuZXIoJ2NsaWNrJywgZnVuY3Rpb24gKGUpIHtcblx0XHRlLnN0b3BQcm9wYWdhdGlvbigpO1xuXHRcdERvbS5yZW1vdmVDbGFzcyhkb2N1bWVudC5nZXRFbGVtZW50QnlJZCgnLS1wdXJlc2RrLWFwcHMtY29udGFpbmVyLS0nKSwgJ2FjdGl2ZScpO1xuXHRcdERvbS50b2dnbGVDbGFzcyhkb2N1bWVudC5nZXRFbGVtZW50QnlJZCgnLS1wdXJlc2RrLXVzZXItc2lkZWJhci0tJyksICdhY3RpdmUnKTtcblx0fSk7XG5cblx0d2luZG93LmFkZEV2ZW50TGlzdGVuZXIoJ2NsaWNrJywgZnVuY3Rpb24gKGUpIHtcblx0XHREb20ucmVtb3ZlQ2xhc3MoZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoJy0tcHVyZXNkay1hcHBzLWNvbnRhaW5lci0tJyksICdhY3RpdmUnKTtcblx0XHREb20ucmVtb3ZlQ2xhc3MoZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoJy0tcHVyZXNkay11c2VyLXNpZGViYXItLScpLCAnYWN0aXZlJyk7XG5cdH0pO1xuXG5cdEF2YXRhckNvbnRyb2xsZXIuaW5pdCgpO1xuXHR2YXIgdXNlckRhdGEgPSBTdG9yZS5nZXRVc2VyRGF0YSgpO1xuXHRBdmF0YXJDb250cm9sbGVyLnNldEF2YXRhcih1c2VyRGF0YS51c2VyLmF2YXRhcl91cmwpO1xuXG5cdEluZm9Db250cm9sbGVyLmluaXQoKTtcbn07XG5cbnZhciBQUEJBID0ge1xuXHRzZXRXaW5kb3dOYW1lOiBmdW5jdGlvbiBzZXRXaW5kb3dOYW1lKHduKSB7XG5cdFx0U3RvcmUuc2V0V2luZG93TmFtZSh3bik7XG5cdH0sXG5cblx0c2V0Q29uZmlndXJhdGlvbjogZnVuY3Rpb24gc2V0Q29uZmlndXJhdGlvbihjb25mKSB7XG5cdFx0U3RvcmUuc2V0Q29uZmlndXJhdGlvbihjb25mKTtcblx0fSxcblxuXHRzZXRIVE1MVGVtcGxhdGU6IGZ1bmN0aW9uIHNldEhUTUxUZW1wbGF0ZSh0ZW1wbGF0ZSkge1xuXHRcdFN0b3JlLnNldEhUTUxUZW1wbGF0ZSh0ZW1wbGF0ZSk7XG5cdH0sXG5cblx0c2V0VmVyc2lvbk51bWJlcjogZnVuY3Rpb24gc2V0VmVyc2lvbk51bWJlcih2ZXJzaW9uKSB7XG5cdFx0U3RvcmUuc2V0VmVyc2lvbk51bWJlcih2ZXJzaW9uKTtcblx0fSxcblxuXHRpbml0OiBmdW5jdGlvbiBpbml0KGNvbmYpIHtcblx0XHRMb2dnZXIubG9nKCdpbml0aWFsaXppbmcgd2l0aCBjb25mOiAnLCBjb25mKTtcblx0XHRpZiAoY29uZikge1xuXHRcdFx0aWYgKGNvbmYuaGVhZGVyRGl2SWQpIHtcblx0XHRcdFx0U3RvcmUuc2V0SFRNTENvbnRhaW5lcihjb25mLmhlYWRlckRpdklkKTtcblx0XHRcdH1cblx0XHRcdGlmIChjb25mLmFwcHNWaXNpYmxlICE9PSBudWxsKSB7XG5cdFx0XHRcdFN0b3JlLnNldEFwcHNWaXNpYmxlKGNvbmYuYXBwc1Zpc2libGUpO1xuXHRcdFx0fVxuXHRcdFx0aWYgKGNvbmYucm9vdFVybCkge1xuXHRcdFx0XHRTdG9yZS5zZXRSb290VXJsKGNvbmYucm9vdFVybCk7XG5cdFx0XHR9XG5cdFx0fVxuXHRcdHBwYmFDb25mID0gY29uZjtcblx0XHRyZXR1cm4gdHJ1ZTtcblx0fSxcblxuXHRhdXRoZW50aWNhdGU6IGZ1bmN0aW9uIGF1dGhlbnRpY2F0ZShfc3VjY2Vzcykge1xuXHRcdHZhciBzZWxmID0gUFBCQTtcblx0XHRDYWxsZXIubWFrZUNhbGwoe1xuXHRcdFx0dHlwZTogJ0dFVCcsXG5cdFx0XHRlbmRwb2ludDogU3RvcmUuZ2V0QXV0aGVudGljYXRpb25FbmRwb2ludCgpLFxuXHRcdFx0Y2FsbGJhY2tzOiB7XG5cdFx0XHRcdHN1Y2Nlc3M6IGZ1bmN0aW9uIHN1Y2Nlc3MocmVzdWx0KSB7XG5cdFx0XHRcdFx0TG9nZ2VyLmxvZyhyZXN1bHQpO1xuXHRcdFx0XHRcdFN0b3JlLnNldFVzZXJEYXRhKHJlc3VsdCk7XG5cdFx0XHRcdFx0c2VsZi5yZW5kZXIoKTtcblx0XHRcdFx0XHRQUEJBLmdldEFwcHMoKTtcblx0XHRcdFx0XHRfc3VjY2VzcyhyZXN1bHQpO1xuXHRcdFx0XHR9LFxuXHRcdFx0XHRmYWlsOiBmdW5jdGlvbiBmYWlsKGVycikge1xuXHRcdFx0XHRcdHdpbmRvdy5sb2NhdGlvbi5ocmVmID0gU3RvcmUuZ2V0TG9naW5VcmwoKTtcblx0XHRcdFx0fVxuXHRcdFx0fVxuXHRcdH0pO1xuXHR9LFxuXG5cdGF1dGhlbnRpY2F0ZVByb21pc2U6IGZ1bmN0aW9uIGF1dGhlbnRpY2F0ZVByb21pc2UoKSB7XG5cdFx0dmFyIHNlbGYgPSBQUEJBO1xuXHRcdHJldHVybiBDYWxsZXIucHJvbWlzZUNhbGwoe1xuXHRcdFx0dHlwZTogJ0dFVCcsXG5cdFx0XHRlbmRwb2ludDogU3RvcmUuZ2V0QXV0aGVudGljYXRpb25FbmRwb2ludCgpLFxuXHRcdFx0bWlkZGxld2FyZXM6IHtcblx0XHRcdFx0c3VjY2VzczogZnVuY3Rpb24gc3VjY2VzcyhyZXN1bHQpIHtcblx0XHRcdFx0XHRMb2dnZXIubG9nKHJlc3VsdCk7XG5cdFx0XHRcdFx0U3RvcmUuc2V0VXNlckRhdGEocmVzdWx0KTtcblx0XHRcdFx0XHRzZWxmLnJlbmRlcigpO1xuXHRcdFx0XHRcdFBQQkEuZ2V0QXBwcygpO1xuXHRcdFx0XHR9XG5cdFx0XHR9XG5cdFx0fSk7XG5cdH0sXG5cblx0Z2V0QXBwczogZnVuY3Rpb24gZ2V0QXBwcygpIHtcblx0XHRDYWxsZXIubWFrZUNhbGwoe1xuXHRcdFx0dHlwZTogJ0dFVCcsXG5cdFx0XHRlbmRwb2ludDogU3RvcmUuZ2V0QXBwc0VuZHBvaW50KCksXG5cdFx0XHRjYWxsYmFja3M6IHtcblx0XHRcdFx0c3VjY2VzczogZnVuY3Rpb24gc3VjY2VzcyhyZXN1bHQpIHtcblx0XHRcdFx0XHRTdG9yZS5zZXRBcHBzKHJlc3VsdCk7XG5cdFx0XHRcdFx0UFBCQS5yZW5kZXJBcHBzKHJlc3VsdC5hcHBzKTtcblx0XHRcdFx0fSxcblx0XHRcdFx0ZmFpbDogZnVuY3Rpb24gZmFpbChlcnIpIHtcblx0XHRcdFx0XHR3aW5kb3cubG9jYXRpb24uaHJlZiA9IFN0b3JlLmdldExvZ2luVXJsKCk7XG5cdFx0XHRcdH1cblx0XHRcdH1cblx0XHR9KTtcblx0fSxcblxuXHRnZXRBdmFpbGFibGVMaXN0ZW5lcnM6IGZ1bmN0aW9uIGdldEF2YWlsYWJsZUxpc3RlbmVycygpIHtcblx0XHRyZXR1cm4gUHViU3ViLmdldEF2YWlsYWJsZUxpc3RlbmVycygpO1xuXHR9LFxuXG5cdHN1YnNjcmliZUxpc3RlbmVyOiBmdW5jdGlvbiBzdWJzY3JpYmVMaXN0ZW5lcihldmVudHQsIGZ1bmN0KSB7XG5cdFx0cmV0dXJuIFB1YlN1Yi5zdWJzY3JpYmUoZXZlbnR0LCBmdW5jdCk7XG5cdH0sXG5cblx0Z2V0VXNlckRhdGE6IGZ1bmN0aW9uIGdldFVzZXJEYXRhKCkge1xuXHRcdHJldHVybiBTdG9yZS5nZXRVc2VyRGF0YSgpO1xuXHR9LFxuXG5cdHNldElucHV0UGxhY2Vob2xkZXI6IGZ1bmN0aW9uIHNldElucHV0UGxhY2Vob2xkZXIodHh0KSB7XG5cdFx0Ly8gZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoU3RvcmUuZ2V0U2VhcmNoSW5wdXRJZCgpKS5wbGFjZWhvbGRlciA9IHR4dDtcblx0fSxcblxuXHRjaGFuZ2VBY2NvdW50OiBmdW5jdGlvbiBjaGFuZ2VBY2NvdW50KGFjY291bnRJZCkge1xuXHRcdENhbGxlci5tYWtlQ2FsbCh7XG5cdFx0XHR0eXBlOiAnR0VUJyxcblx0XHRcdGVuZHBvaW50OiBTdG9yZS5nZXRTd2l0Y2hBY2NvdW50RW5kcG9pbnQoYWNjb3VudElkKSxcblx0XHRcdGNhbGxiYWNrczoge1xuXHRcdFx0XHRzdWNjZXNzOiBmdW5jdGlvbiBzdWNjZXNzKHJlc3VsdCkge1xuXHRcdFx0XHRcdHdpbmRvdy5sb2NhdGlvbi5ocmVmID0gJy9hcHBzJztcblx0XHRcdFx0fSxcblx0XHRcdFx0ZmFpbDogZnVuY3Rpb24gZmFpbChlcnIpIHtcblx0XHRcdFx0XHRhbGVydCgnU29ycnksIHNvbWV0aGluZyB3ZW50IHdyb25nIHdpdGggeW91ciByZXF1ZXN0LiBQbGVzZSB0cnkgYWdhaW4nKTtcblx0XHRcdFx0fVxuXHRcdFx0fVxuXHRcdH0pO1xuXHR9LFxuXG5cdHJlbmRlckFwcHM6IGZ1bmN0aW9uIHJlbmRlckFwcHMoYXBwcykge1xuXHRcdHZhciBhcHBUZW1wbGF0ZSA9IGZ1bmN0aW9uIGFwcFRlbXBsYXRlKGFwcCkge1xuXHRcdFx0cmV0dXJuICdcXG5cXHRcXHRcXHRcXHQ8YSBocmVmPVwiI1wiIHN0eWxlPVwiYmFja2dyb3VuZDogIycgKyBhcHAuY29sb3IgKyAnXCI+PGkgY2xhc3M9XCInICsgYXBwLmljb24gKyAnXCI+PC9pPjwvYT5cXG5cXHRcXHRcXHRcXHQ8c3BhbiBjbGFzcz1cImJhYy0tYXBwLW5hbWVcIj4nICsgYXBwLm5hbWUgKyAnPC9zcGFuPlxcblxcdFxcdFxcdFxcdDxzcGFuIGNsYXNzPVwiYmFjLS1hcHAtZGVzY3JpcHRpb25cIj4nICsgYXBwLmRlc2NyICsgJzwvc3Bhbj5cXG5cXHRcXHRcXHQnO1xuXHRcdH07XG5cblx0XHR2YXIgX2xvb3AgPSBmdW5jdGlvbiBfbG9vcChpKSB7XG5cdFx0XHR2YXIgYXBwID0gYXBwc1tpXTtcblx0XHRcdHZhciBkaXYgPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KFwiZGl2XCIpO1xuXHRcdFx0ZGl2LmNsYXNzTmFtZSA9IFwiYmFjLS1hcHBzXCI7XG5cdFx0XHRkaXYuaW5uZXJIVE1MID0gYXBwVGVtcGxhdGUoYXBwKTtcblx0XHRcdGRpdi5vbmNsaWNrID0gZnVuY3Rpb24gKGUpIHtcblx0XHRcdFx0ZS5wcmV2ZW50RGVmYXVsdCgpO1xuXHRcdFx0XHR3aW5kb3cubG9jYXRpb24uaHJlZiA9IGFwcC5hcHBsaWNhdGlvbl91cmw7XG5cdFx0XHR9O1xuXHRcdFx0ZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoXCItLXB1cmVzZGstYXBwcy1jb250YWluZXItLVwiKS5hcHBlbmRDaGlsZChkaXYpO1xuXHRcdH07XG5cblx0XHRmb3IgKHZhciBpID0gMDsgaSA8IGFwcHMubGVuZ3RoOyBpKyspIHtcblx0XHRcdF9sb29wKGkpO1xuXHRcdH1cblx0fSxcblxuXHRyZW5kZXJVc2VyOiBmdW5jdGlvbiByZW5kZXJVc2VyKHVzZXIpIHtcblx0XHR2YXIgdXNlclRlbXBsYXRlID0gZnVuY3Rpb24gdXNlclRlbXBsYXRlKHVzZXIpIHtcblx0XHRcdHJldHVybiAnXFxuXFx0XFx0XFx0XFx0PGRpdiBjbGFzcz1cImJhYy0tdXNlci1pbWFnZVwiIGlkPVwiYmFjLS11c2VyLWltYWdlXCI+XFxuXFx0XFx0XFx0XFx0XFx0PGkgY2xhc3M9XCJmYSBmYS1jYW1lcmFcIj48L2k+XFxuXFx0XFx0XFx0ICAgXFx0PGRpdiBpZD1cImJhYy0tdXNlci1pbWFnZS1maWxlXCI+PC9kaXY+XFxuXFx0XFx0XFx0ICAgXFx0PGRpdiBpZD1cImJhYy0tdXNlci1pbWFnZS11cGxvYWQtcHJvZ3Jlc3NcIj5cXG5cXHRcXHRcXHQgICBcXHRcXHQ8c3ZnIHdpZHRoPVxcJzYwcHhcXCcgaGVpZ2h0PVxcJzYwcHhcXCcgeG1sbnM9XCJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2Z1wiIHZpZXdCb3g9XCIwIDAgMTAwIDEwMFwiIHByZXNlcnZlQXNwZWN0UmF0aW89XCJ4TWlkWU1pZFwiIGNsYXNzPVwidWlsLWRlZmF1bHRcIj48cmVjdCB4PVwiMFwiIHk9XCIwXCIgd2lkdGg9XCIxMDBcIiBoZWlnaHQ9XCIxMDBcIiBmaWxsPVwibm9uZVwiIGNsYXNzPVwiYmtcIj48L3JlY3Q+PHJlY3QgIHg9XFwnNDYuNVxcJyB5PVxcJzQwXFwnIHdpZHRoPVxcJzdcXCcgaGVpZ2h0PVxcJzIwXFwnIHJ4PVxcJzVcXCcgcnk9XFwnNVxcJyBmaWxsPVxcJyNmZmZmZmZcXCcgdHJhbnNmb3JtPVxcJ3JvdGF0ZSgwIDUwIDUwKSB0cmFuc2xhdGUoMCAtMzApXFwnPiAgPGFuaW1hdGUgYXR0cmlidXRlTmFtZT1cXCdvcGFjaXR5XFwnIGZyb209XFwnMVxcJyB0bz1cXCcwXFwnIGR1cj1cXCcxc1xcJyBiZWdpbj1cXCctMXNcXCcgcmVwZWF0Q291bnQ9XFwnaW5kZWZpbml0ZVxcJy8+PC9yZWN0PjxyZWN0ICB4PVxcJzQ2LjVcXCcgeT1cXCc0MFxcJyB3aWR0aD1cXCc3XFwnIGhlaWdodD1cXCcyMFxcJyByeD1cXCc1XFwnIHJ5PVxcJzVcXCcgZmlsbD1cXCcjZmZmZmZmXFwnIHRyYW5zZm9ybT1cXCdyb3RhdGUoMzAgNTAgNTApIHRyYW5zbGF0ZSgwIC0zMClcXCc+ICA8YW5pbWF0ZSBhdHRyaWJ1dGVOYW1lPVxcJ29wYWNpdHlcXCcgZnJvbT1cXCcxXFwnIHRvPVxcJzBcXCcgZHVyPVxcJzFzXFwnIGJlZ2luPVxcJy0wLjkxNjY2NjY2NjY2NjY2NjZzXFwnIHJlcGVhdENvdW50PVxcJ2luZGVmaW5pdGVcXCcvPjwvcmVjdD48cmVjdCAgeD1cXCc0Ni41XFwnIHk9XFwnNDBcXCcgd2lkdGg9XFwnN1xcJyBoZWlnaHQ9XFwnMjBcXCcgcng9XFwnNVxcJyByeT1cXCc1XFwnIGZpbGw9XFwnI2ZmZmZmZlxcJyB0cmFuc2Zvcm09XFwncm90YXRlKDYwIDUwIDUwKSB0cmFuc2xhdGUoMCAtMzApXFwnPiAgPGFuaW1hdGUgYXR0cmlidXRlTmFtZT1cXCdvcGFjaXR5XFwnIGZyb209XFwnMVxcJyB0bz1cXCcwXFwnIGR1cj1cXCcxc1xcJyBiZWdpbj1cXCctMC44MzMzMzMzMzMzMzMzMzM0c1xcJyByZXBlYXRDb3VudD1cXCdpbmRlZmluaXRlXFwnLz48L3JlY3Q+PHJlY3QgIHg9XFwnNDYuNVxcJyB5PVxcJzQwXFwnIHdpZHRoPVxcJzdcXCcgaGVpZ2h0PVxcJzIwXFwnIHJ4PVxcJzVcXCcgcnk9XFwnNVxcJyBmaWxsPVxcJyNmZmZmZmZcXCcgdHJhbnNmb3JtPVxcJ3JvdGF0ZSg5MCA1MCA1MCkgdHJhbnNsYXRlKDAgLTMwKVxcJz4gIDxhbmltYXRlIGF0dHJpYnV0ZU5hbWU9XFwnb3BhY2l0eVxcJyBmcm9tPVxcJzFcXCcgdG89XFwnMFxcJyBkdXI9XFwnMXNcXCcgYmVnaW49XFwnLTAuNzVzXFwnIHJlcGVhdENvdW50PVxcJ2luZGVmaW5pdGVcXCcvPjwvcmVjdD48cmVjdCAgeD1cXCc0Ni41XFwnIHk9XFwnNDBcXCcgd2lkdGg9XFwnN1xcJyBoZWlnaHQ9XFwnMjBcXCcgcng9XFwnNVxcJyByeT1cXCc1XFwnIGZpbGw9XFwnI2ZmZmZmZlxcJyB0cmFuc2Zvcm09XFwncm90YXRlKDEyMCA1MCA1MCkgdHJhbnNsYXRlKDAgLTMwKVxcJz4gIDxhbmltYXRlIGF0dHJpYnV0ZU5hbWU9XFwnb3BhY2l0eVxcJyBmcm9tPVxcJzFcXCcgdG89XFwnMFxcJyBkdXI9XFwnMXNcXCcgYmVnaW49XFwnLTAuNjY2NjY2NjY2NjY2NjY2NnNcXCcgcmVwZWF0Q291bnQ9XFwnaW5kZWZpbml0ZVxcJy8+PC9yZWN0PjxyZWN0ICB4PVxcJzQ2LjVcXCcgeT1cXCc0MFxcJyB3aWR0aD1cXCc3XFwnIGhlaWdodD1cXCcyMFxcJyByeD1cXCc1XFwnIHJ5PVxcJzVcXCcgZmlsbD1cXCcjZmZmZmZmXFwnIHRyYW5zZm9ybT1cXCdyb3RhdGUoMTUwIDUwIDUwKSB0cmFuc2xhdGUoMCAtMzApXFwnPiAgPGFuaW1hdGUgYXR0cmlidXRlTmFtZT1cXCdvcGFjaXR5XFwnIGZyb209XFwnMVxcJyB0bz1cXCcwXFwnIGR1cj1cXCcxc1xcJyBiZWdpbj1cXCctMC41ODMzMzMzMzMzMzMzMzM0c1xcJyByZXBlYXRDb3VudD1cXCdpbmRlZmluaXRlXFwnLz48L3JlY3Q+PHJlY3QgIHg9XFwnNDYuNVxcJyB5PVxcJzQwXFwnIHdpZHRoPVxcJzdcXCcgaGVpZ2h0PVxcJzIwXFwnIHJ4PVxcJzVcXCcgcnk9XFwnNVxcJyBmaWxsPVxcJyNmZmZmZmZcXCcgdHJhbnNmb3JtPVxcJ3JvdGF0ZSgxODAgNTAgNTApIHRyYW5zbGF0ZSgwIC0zMClcXCc+ICA8YW5pbWF0ZSBhdHRyaWJ1dGVOYW1lPVxcJ29wYWNpdHlcXCcgZnJvbT1cXCcxXFwnIHRvPVxcJzBcXCcgZHVyPVxcJzFzXFwnIGJlZ2luPVxcJy0wLjVzXFwnIHJlcGVhdENvdW50PVxcJ2luZGVmaW5pdGVcXCcvPjwvcmVjdD48cmVjdCAgeD1cXCc0Ni41XFwnIHk9XFwnNDBcXCcgd2lkdGg9XFwnN1xcJyBoZWlnaHQ9XFwnMjBcXCcgcng9XFwnNVxcJyByeT1cXCc1XFwnIGZpbGw9XFwnI2ZmZmZmZlxcJyB0cmFuc2Zvcm09XFwncm90YXRlKDIxMCA1MCA1MCkgdHJhbnNsYXRlKDAgLTMwKVxcJz4gIDxhbmltYXRlIGF0dHJpYnV0ZU5hbWU9XFwnb3BhY2l0eVxcJyBmcm9tPVxcJzFcXCcgdG89XFwnMFxcJyBkdXI9XFwnMXNcXCcgYmVnaW49XFwnLTAuNDE2NjY2NjY2NjY2NjY2N3NcXCcgcmVwZWF0Q291bnQ9XFwnaW5kZWZpbml0ZVxcJy8+PC9yZWN0PjxyZWN0ICB4PVxcJzQ2LjVcXCcgeT1cXCc0MFxcJyB3aWR0aD1cXCc3XFwnIGhlaWdodD1cXCcyMFxcJyByeD1cXCc1XFwnIHJ5PVxcJzVcXCcgZmlsbD1cXCcjZmZmZmZmXFwnIHRyYW5zZm9ybT1cXCdyb3RhdGUoMjQwIDUwIDUwKSB0cmFuc2xhdGUoMCAtMzApXFwnPiAgPGFuaW1hdGUgYXR0cmlidXRlTmFtZT1cXCdvcGFjaXR5XFwnIGZyb209XFwnMVxcJyB0bz1cXCcwXFwnIGR1cj1cXCcxc1xcJyBiZWdpbj1cXCctMC4zMzMzMzMzMzMzMzMzMzMzc1xcJyByZXBlYXRDb3VudD1cXCdpbmRlZmluaXRlXFwnLz48L3JlY3Q+PHJlY3QgIHg9XFwnNDYuNVxcJyB5PVxcJzQwXFwnIHdpZHRoPVxcJzdcXCcgaGVpZ2h0PVxcJzIwXFwnIHJ4PVxcJzVcXCcgcnk9XFwnNVxcJyBmaWxsPVxcJyNmZmZmZmZcXCcgdHJhbnNmb3JtPVxcJ3JvdGF0ZSgyNzAgNTAgNTApIHRyYW5zbGF0ZSgwIC0zMClcXCc+ICA8YW5pbWF0ZSBhdHRyaWJ1dGVOYW1lPVxcJ29wYWNpdHlcXCcgZnJvbT1cXCcxXFwnIHRvPVxcJzBcXCcgZHVyPVxcJzFzXFwnIGJlZ2luPVxcJy0wLjI1c1xcJyByZXBlYXRDb3VudD1cXCdpbmRlZmluaXRlXFwnLz48L3JlY3Q+PHJlY3QgIHg9XFwnNDYuNVxcJyB5PVxcJzQwXFwnIHdpZHRoPVxcJzdcXCcgaGVpZ2h0PVxcJzIwXFwnIHJ4PVxcJzVcXCcgcnk9XFwnNVxcJyBmaWxsPVxcJyNmZmZmZmZcXCcgdHJhbnNmb3JtPVxcJ3JvdGF0ZSgzMDAgNTAgNTApIHRyYW5zbGF0ZSgwIC0zMClcXCc+ICA8YW5pbWF0ZSBhdHRyaWJ1dGVOYW1lPVxcJ29wYWNpdHlcXCcgZnJvbT1cXCcxXFwnIHRvPVxcJzBcXCcgZHVyPVxcJzFzXFwnIGJlZ2luPVxcJy0wLjE2NjY2NjY2NjY2NjY2NjY2c1xcJyByZXBlYXRDb3VudD1cXCdpbmRlZmluaXRlXFwnLz48L3JlY3Q+PHJlY3QgIHg9XFwnNDYuNVxcJyB5PVxcJzQwXFwnIHdpZHRoPVxcJzdcXCcgaGVpZ2h0PVxcJzIwXFwnIHJ4PVxcJzVcXCcgcnk9XFwnNVxcJyBmaWxsPVxcJyNmZmZmZmZcXCcgdHJhbnNmb3JtPVxcJ3JvdGF0ZSgzMzAgNTAgNTApIHRyYW5zbGF0ZSgwIC0zMClcXCc+ICA8YW5pbWF0ZSBhdHRyaWJ1dGVOYW1lPVxcJ29wYWNpdHlcXCcgZnJvbT1cXCcxXFwnIHRvPVxcJzBcXCcgZHVyPVxcJzFzXFwnIGJlZ2luPVxcJy0wLjA4MzMzMzMzMzMzMzMzMzMzc1xcJyByZXBlYXRDb3VudD1cXCdpbmRlZmluaXRlXFwnLz48L3JlY3Q+PC9zdmc+XFx0XFxuXFx0XFx0XFx0XFx0XFx0PC9kaXY+XFxuXFx0XFx0XFx0ICAgPC9kaXY+XFxuXFx0XFx0XFx0XFx0PGRpdiBjbGFzcz1cImJhYy0tdXNlci1uYW1lXCI+JyArIHVzZXIuZmlyc3RuYW1lICsgJyAnICsgdXNlci5sYXN0bmFtZSArICc8L2Rpdj5cXG5cXHRcXHRcXHRcXHQ8ZGl2IGNsYXNzPVwiYmFjLS11c2VyLWVtYWlsXCI+JyArIHVzZXIuZW1haWwgKyAnPC9kaXY+XFxuXFx0XFx0XFx0Jztcblx0XHR9O1xuXHRcdHZhciBkaXYgPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KCdkaXYnKTtcblx0XHRkaXYuY2xhc3NOYW1lID0gXCJiYWMtLXVzZXItc2lkZWJhci1pbmZvXCI7XG5cdFx0ZGl2LmlubmVySFRNTCA9IHVzZXJUZW1wbGF0ZSh1c2VyKTtcblx0XHRkb2N1bWVudC5nZXRFbGVtZW50QnlJZCgnLS1wdXJlc2RrLXVzZXItZGV0YWlscy0tJykuYXBwZW5kQ2hpbGQoZGl2KTtcblx0XHRkb2N1bWVudC5nZXRFbGVtZW50QnlJZCgnLS1wdXJlc2RrLXVzZXItYXZhdGFyLS0nKS5pbm5lckhUTUwgPSB1c2VyLmZpcnN0bmFtZS5jaGFyQXQoMCkgKyB1c2VyLmxhc3RuYW1lLmNoYXJBdCgwKTtcblx0fSxcblxuXHRyZW5kZXJBY2NvdW50czogZnVuY3Rpb24gcmVuZGVyQWNjb3VudHMoYWNjb3VudHMpIHtcblx0XHR2YXIgYWNjb3VudHNUZW1wbGF0ZSA9IGZ1bmN0aW9uIGFjY291bnRzVGVtcGxhdGUoYWNjb3VudCkge1xuXHRcdFx0cmV0dXJuICdcXG5cXHRcXHRcXHRcXHQ8ZGl2IGNsYXNzPVwiYmFjLS11c2VyLWxpc3QtaXRlbS1pbWFnZVwiPlxcblxcdFxcdFxcdFxcdFxcdDxpbWcgc3JjPVwiJyArIGFjY291bnQuc2RrX3NxdWFyZV9sb2dvX2ljb24gKyAnXCIgYWx0PVwiXCI+XFxuXFx0XFx0XFx0XFx0PC9kaXY+XFxuXFx0XFx0XFx0XFx0PGRpdiBjbGFzcz1cImJhYy11c2VyLWFwcC1kZXRhaWxzXCI+XFxuXFx0XFx0XFx0XFx0XFx0IDxzcGFuPicgKyBhY2NvdW50Lm5hbWUgKyAnPC9zcGFuPlxcblxcdFxcdFxcdFxcdDwvZGl2PlxcblxcdFxcdFxcdCc7XG5cdFx0fTtcblxuXHRcdHZhciBfbG9vcDIgPSBmdW5jdGlvbiBfbG9vcDIoaSkge1xuXHRcdFx0dmFyIGFjY291bnQgPSBhY2NvdW50c1tpXTtcblx0XHRcdHZhciBkaXYgPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KCdkaXYnKTtcblx0XHRcdGRpdi5jbGFzc05hbWUgPSAnYmFjLS11c2VyLWxpc3QtaXRlbSc7XG5cdFx0XHRkaXYuaW5uZXJIVE1MID0gYWNjb3VudHNUZW1wbGF0ZShhY2NvdW50KTtcblx0XHRcdGRpdi5vbmNsaWNrID0gZnVuY3Rpb24gKGUpIHtcblx0XHRcdFx0ZS5wcmV2ZW50RGVmYXVsdCgpO1xuXHRcdFx0XHRQUEJBLmNoYW5nZUFjY291bnQoYWNjb3VudC5zZmlkKTtcblx0XHRcdH07XG5cdFx0XHRkb2N1bWVudC5nZXRFbGVtZW50QnlJZCgnLS1wdXJlc2RrLXVzZXItYnVzaW5lc3Nlcy0tJykuYXBwZW5kQ2hpbGQoZGl2KTtcblx0XHR9O1xuXG5cdFx0Zm9yICh2YXIgaSA9IDA7IGkgPCBhY2NvdW50cy5sZW5ndGg7IGkrKykge1xuXHRcdFx0X2xvb3AyKGkpO1xuXHRcdH1cblx0fSxcblxuXHRyZW5kZXJJbmZvQmxvY2tzOiBmdW5jdGlvbiByZW5kZXJJbmZvQmxvY2tzKCkge1xuXHRcdHZhciBibG9ja3NUZW1wbGF0ZSA9IGZ1bmN0aW9uIGJsb2Nrc1RlbXBsYXRlKGluZGV4KSB7XG5cdFx0XHRyZXR1cm4gJ1xcblxcdFxcdFxcdFxcdCA8ZGl2IGNsYXNzPVwiLS1wdXJlc2RrLWluZm8tYm94LS1cIiBpZD1cIi0tcHVyZXNkay1pbmZvLWJveC0tJyArIGluZGV4ICsgJ1wiPlxcblxcdFxcdFxcdFxcdCBcXHQ8ZGl2IGNsYXNzPVwiYmFjLS10aW1lclwiIGlkPVwiYmFjLS10aW1lcicgKyBpbmRleCArICdcIj48L2Rpdj5cXG5cXHRcXHRcXHRcXHRcXHQgPGRpdiBjbGFzcz1cImJhYy0taW5uZXItaW5mby1ib3gtLVwiPlxcblxcdFxcdFxcdFxcdFxcdCBcXHRcXHQ8ZGl2IGNsYXNzPVwiYmFjLS1pbmZvLWljb24tLSBmYS1zdWNjZXNzXCI+PC9kaXY+XFxuXFx0XFx0XFx0XFx0XFx0IFxcdFxcdDxkaXYgY2xhc3M9XCJiYWMtLWluZm8taWNvbi0tIGZhLXdhcm5pbmdcIj48L2Rpdj5cXG5cXHRcXHRcXHRcXHRcXHQgXFx0XFx0PGRpdiBjbGFzcz1cImJhYy0taW5mby1pY29uLS0gZmEtaW5mby0xXCI+PC9kaXY+XFxuXFx0XFx0XFx0XFx0XFx0IFxcdFxcdDxkaXYgY2xhc3M9XCJiYWMtLWluZm8taWNvbi0tIGZhLWVycm9yXCI+PC9kaXY+XFxuXFx0XFx0XFx0XFx0XFx0IFxcdFxcdCA8ZGl2IGNsYXNzPVwiYmFjLS1pbmZvLW1haW4tdGV4dC0tXCIgaWQ9XCJiYWMtLWluZm8tbWFpbi10ZXh0LS0nICsgaW5kZXggKyAnXCI+PC9kaXY+XFxuXFx0XFx0XFx0XFx0XFx0IFxcdFxcdCA8ZGl2IGNsYXNzPVwiYmFjLS1pbmZvLWNsb3NlLWJ1dHRvbi0tIGZhLWNsb3NlLTFcIiBpZD1cImJhYy0taW5mby1jbG9zZS1idXR0b24tLScgKyBpbmRleCArICdcIj48L2Rpdj5cXG5cXHRcXHRcXHRcXHRcXHQ8L2Rpdj5cXG5cXHRcXHRcXHRcXHQ8L2Rpdj5cXG5cXHRcXHQgICc7XG5cdFx0fTtcblxuXHRcdHZhciBpbmZvQmxvY2tzV3JhcHBlciA9IGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKCdiYWMtLWluZm8tYmxvY2tzLXdyYXBwZXItLScpO1xuXHRcdHZhciBpbm5lckh0bWwgPSAnJztcblx0XHRmb3IgKHZhciBpID0gMTsgaSA8IDU7IGkrKykge1xuXHRcdFx0aW5uZXJIdG1sICs9IGJsb2Nrc1RlbXBsYXRlKGkpO1xuXHRcdH1cblxuXHRcdGluZm9CbG9ja3NXcmFwcGVyLmlubmVySFRNTCA9IGlubmVySHRtbDtcblx0fSxcblxuXHRyZW5kZXJWZXJzaW9uTnVtYmVyOiBmdW5jdGlvbiByZW5kZXJWZXJzaW9uTnVtYmVyKHZlcnNpb24pIHtcblx0XHRkb2N1bWVudC5nZXRFbGVtZW50QnlJZCgncHVyZXNkay12ZXJzaW9uLW51bWJlcicpLmlubmVySFRNTCA9IHZlcnNpb247XG5cdH0sXG5cblx0c3R5bGVBY2NvdW50OiBmdW5jdGlvbiBzdHlsZUFjY291bnQoYWNjb3VudCkge1xuXHRcdHZhciBsb2dvID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudCgnaW1nJyk7XG5cdFx0bG9nby5zcmMgPSBhY2NvdW50LnNka19sb2dvX2ljb247XG5cdFx0ZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoJy0tcHVyZXNkay1hY2NvdW50LWxvZ28tLScpLmFwcGVuZENoaWxkKGxvZ28pO1xuXHRcdGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKCctLXB1cmVzZGstYmFjLS1oZWFkZXItYXBwcy0tJykuc3R5bGUuY3NzVGV4dCA9IFwiYmFja2dyb3VuZDogI1wiICsgYWNjb3VudC5zZGtfYmFja2dyb3VuZF9jb2xvciArIFwiOyBjb2xvcjogI1wiICsgYWNjb3VudC5zZGtfZm9udF9jb2xvcjtcblx0XHRkb2N1bWVudC5nZXRFbGVtZW50QnlJZCgnLS1wdXJlc2RrLXVzZXItc2lkZWJhci0tJykuc3R5bGUuY3NzVGV4dCA9IFwiYmFja2dyb3VuZDogI1wiICsgYWNjb3VudC5zZGtfYmFja2dyb3VuZF9jb2xvciArIFwiOyBjb2xvcjogI1wiICsgYWNjb3VudC5zZGtfZm9udF9jb2xvcjtcblx0XHRkb2N1bWVudC5nZXRFbGVtZW50QnlJZCgnLS1wdXJlc2RrLWFjY291bnQtbG9nby0tJykub25jbGljayA9IGZ1bmN0aW9uIChlKSB7XG5cdFx0XHR3aW5kb3cubG9jYXRpb24uaHJlZiA9ICcvJztcblx0XHR9O1xuXHRcdC8vIGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKCctLXB1cmVzZGstLXNlYXJjaC0taW5wdXQtLScpLnN0eWxlLmNzc1RleHQgPSBcImJhY2tncm91bmQ6ICNcIiArIGFjY291bnQuc2RrX3NlYXJjaF9iYWNrZ3JvdW5kX2NvbG9yXG5cdFx0Ly8gICArIFwiOyBjb2xvcjogI1wiICsgYWNjb3VudC5zZGtfc2VhcmNoX2ZvbnRfY29sb3I7XG5cdH0sXG5cblx0Z29Ub0xvZ2luUGFnZTogZnVuY3Rpb24gZ29Ub0xvZ2luUGFnZSgpIHtcblx0XHR3aW5kb3cubG9jYXRpb24uaHJlZiA9IFN0b3JlLmdldExvZ2luVXJsKCk7XG5cdH0sXG5cblx0LyogTE9BREVSICovXG5cdHNob3dMb2FkZXI6IGZ1bmN0aW9uIHNob3dMb2FkZXIoKSB7XG5cdFx0RG9tLmFkZENsYXNzKGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKCctLXB1cmVzZGstLWxvYWRlci0tJyksICctLXB1cmVzZGstdmlzaWJsZScpO1xuXHR9LFxuXG5cdGhpZGVMb2FkZXI6IGZ1bmN0aW9uIGhpZGVMb2FkZXIoKSB7XG5cdFx0RG9tLnJlbW92ZUNsYXNzKGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKCctLXB1cmVzZGstLWxvYWRlci0tJyksICctLXB1cmVzZGstdmlzaWJsZScpO1xuXHR9LFxuXG5cdC8qXG4gIHR5cGU6IG9uZSBvZjpcbiAgLSBzdWNjZXNzXG4gIC0gaW5mb1xuICAtIHdhcm5pbmdcbiAgLSBlcnJvclxuICB0ZXh0OiB0aGUgdGV4dCB0byBkaXNwbGF5XG4gIG9wdGlvbnMgKG9wdGlvbmFsKToge1xuICBcdFx0aGlkZUluOiBtaWxsaXNlY29uZHMgdG8gaGlkZSBpdC4gLTEgZm9yIG5vdCBoaWRpbmcgaXQgYXQgYWxsLiBEZWZhdWx0IGlzIDUwMDBcbiAgfVxuICAqL1xuXHRzZXRJbmZvOiBmdW5jdGlvbiBzZXRJbmZvKHR5cGUsIHRleHQsIG9wdGlvbnMpIHtcblx0XHRJbmZvQ29udHJvbGxlci5zaG93SW5mbyh0eXBlLCB0ZXh0LCBvcHRpb25zKTtcblx0fSxcblxuXHRyZW5kZXI6IGZ1bmN0aW9uIHJlbmRlcigpIHtcblx0XHR2YXIgd2hlcmVUbyA9IGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKFN0b3JlLmdldEhUTE1Db250YWluZXIoKSk7XG5cdFx0aWYgKHdoZXJlVG8gPT09IG51bGwpIHtcblx0XHRcdExvZ2dlci5lcnJvcigndGhlIGNvbnRhaW5lciB3aXRoIGlkIFwiJyArIHdoZXJlVG8gKyAnXCIgaGFzIG5vdCBiZWVuIGZvdW5kIG9uIHRoZSBkb2N1bWVudC4gVGhlIGxpYnJhcnkgaXMgZ29pbmcgdG8gY3JlYXRlIGl0LicpO1xuXHRcdFx0dmFyIGRpdiA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoJ2RpdicpO1xuXHRcdFx0ZGl2LmlkID0gU3RvcmUuZ2V0SFRMTUNvbnRhaW5lcigpO1xuXHRcdFx0ZGl2LnN0eWxlLndpZHRoID0gJzEwMCUnO1xuXHRcdFx0ZGl2LnN0eWxlLmhlaWdodCA9ICc1MHB4Jztcblx0XHRcdGRpdi5zdHlsZS5wb3NpdGlvbiA9ICdmaXhlZCc7XG5cdFx0XHRkaXYuc3R5bGUudG9wID0gJzAnO1xuXHRcdFx0ZGl2LnN0eWxlLnpJbmRleCA9IDk5OTk5OTk5OTk7XG5cdFx0XHRkb2N1bWVudC5ib2R5Lmluc2VydEJlZm9yZShkaXYsIGRvY3VtZW50LmJvZHkuZmlyc3RDaGlsZCk7XG5cdFx0XHR3aGVyZVRvID0gZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoU3RvcmUuZ2V0SFRMTUNvbnRhaW5lcigpKTtcblx0XHR9XG5cdFx0d2hlcmVUby5pbm5lckhUTUwgPSBTdG9yZS5nZXRIVE1MKCk7XG5cdFx0UFBCQS5zdHlsZUFjY291bnQoU3RvcmUuZ2V0VXNlckRhdGEoKS51c2VyLmFjY291bnQpO1xuXHRcdFBQQkEucmVuZGVyVXNlcihTdG9yZS5nZXRVc2VyRGF0YSgpLnVzZXIpO1xuXHRcdFBQQkEucmVuZGVySW5mb0Jsb2NrcygpO1xuXHRcdFBQQkEucmVuZGVyQWNjb3VudHMoU3RvcmUuZ2V0VXNlckRhdGEoKS51c2VyLmFjY291bnRzKTtcblx0XHRQUEJBLnJlbmRlclZlcnNpb25OdW1iZXIoU3RvcmUuZ2V0VmVyc2lvbk51bWJlcigpKTtcblx0XHRpZiAoU3RvcmUuZ2V0QXBwc1Zpc2libGUoKSA9PT0gZmFsc2UpIHtcblx0XHRcdGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKCctLXB1cmVzZGstYXBwcy1zZWN0aW9uLS0nKS5zdHlsZS5jc3NUZXh0ID0gXCJkaXNwbGF5Om5vbmVcIjtcblx0XHR9XG5cdFx0YWZ0ZXJSZW5kZXIoKTtcblx0fVxufTtcblxubW9kdWxlLmV4cG9ydHMgPSBQUEJBOyIsIid1c2Ugc3RyaWN0JztcblxuLyohXG4gKiBQdXJlUHJvZmlsZSBQdXJlUHJvZmlsZSBCdXNpbmVzcyBBcHBzIERldmVsb3BtZW50IFNES1xuICpcbiAqIHZlcnNpb246IDIuMy4xMFxuICogZGF0ZTogMjAxNy0wNi0wMVxuICpcbiAqIENvcHlyaWdodCAyMDE3LCBQdXJlUHJvZmlsZVxuICogUmVsZWFzZWQgdW5kZXIgTUlUIGxpY2Vuc2VcbiAqIGh0dHBzOi8vb3BlbnNvdXJjZS5vcmcvbGljZW5zZXMvTUlUXG4gKi9cblxudmFyIHBwYmEgPSByZXF1aXJlKCcuL1BQQkEnKTtcbnBwYmEuc2V0V2luZG93TmFtZSgnUFVSRVNESycpO1xucHBiYS5zZXRDb25maWd1cmF0aW9uKHtcbiAgICBcImxvZ3NcIjogZmFsc2UsXG4gICAgXCJyb290VXJsXCI6IFwiL1wiLFxuICAgIFwiYmFzZVVybFwiOiBcImFwaS92MS9cIixcbiAgICBcImxvZ2luVXJsXCI6IFwiYXBpL3YxL29hdXRoMlwiLFxuICAgIFwic2VhcmNoSW5wdXRJZFwiOiBcIi0tcHVyZXNkay0tc2VhcmNoLS1pbnB1dC0tXCIsXG4gICAgXCJyZWRpcmVjdFVybFBhcmFtXCI6IFwicmVkaXJlY3RfdXJsXCJcbn0pO1xucHBiYS5zZXRIVE1MVGVtcGxhdGUoJzxoZWFkZXIgY2xhc3M9XCJiYWMtLWhlYWRlci1hcHBzXCIgaWQ9XCItLXB1cmVzZGstYmFjLS1oZWFkZXItYXBwcy0tXCI+XFxuICAgIDxkaXYgY2xhc3M9XCJiYWMtLWNvbnRhaW5lclwiPlxcbiAgICAgICAgPGRpdiBjbGFzcz1cImJhYy0tbG9nb1wiIGlkPVwiLS1wdXJlc2RrLWFjY291bnQtbG9nby0tXCI+PC9kaXY+XFxuICAgICAgICA8ZGl2IGNsYXNzPVwiYmFjLS11c2VyLWFjdGlvbnNcIj5cXG4gICAgICAgICAgICA8c3ZnIGlkPVwiLS1wdXJlc2RrLS1sb2FkZXItLVwiIHdpZHRoPVwiMzhcIiBoZWlnaHQ9XCIzOFwiIHZpZXdCb3g9XCIwIDAgNDQgNDRcIiB4bWxucz1cImh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnXCIgc3Ryb2tlPVwiI2ZmZlwiIHN0eWxlPVwiXFxuICAgIG1hcmdpbi1yaWdodDogMTBweDtcXG5cIj5cXG4gICAgICAgICAgICAgICAgPGcgZmlsbD1cIm5vbmVcIiBmaWxsLXJ1bGU9XCJldmVub2RkXCIgc3Ryb2tlLXdpZHRoPVwiMlwiPlxcbiAgICAgICAgICAgICAgICAgICAgPGNpcmNsZSBjeD1cIjIyXCIgY3k9XCIyMlwiIHI9XCIxNi42NDM3XCI+XFxuICAgICAgICAgICAgICAgICAgICAgICAgPGFuaW1hdGUgYXR0cmlidXRlTmFtZT1cInJcIiBiZWdpbj1cIjBzXCIgZHVyPVwiMS44c1wiIHZhbHVlcz1cIjE7IDIwXCIgY2FsY01vZGU9XCJzcGxpbmVcIiBrZXlUaW1lcz1cIjA7IDFcIiBrZXlTcGxpbmVzPVwiMC4xNjUsIDAuODQsIDAuNDQsIDFcIiByZXBlYXRDb3VudD1cImluZGVmaW5pdGVcIj48L2FuaW1hdGU+XFxuICAgICAgICAgICAgICAgICAgICAgICAgPGFuaW1hdGUgYXR0cmlidXRlTmFtZT1cInN0cm9rZS1vcGFjaXR5XCIgYmVnaW49XCIwc1wiIGR1cj1cIjEuOHNcIiB2YWx1ZXM9XCIxOyAwXCIgY2FsY01vZGU9XCJzcGxpbmVcIiBrZXlUaW1lcz1cIjA7IDFcIiBrZXlTcGxpbmVzPVwiMC4zLCAwLjYxLCAwLjM1NSwgMVwiIHJlcGVhdENvdW50PVwiaW5kZWZpbml0ZVwiPjwvYW5pbWF0ZT5cXG4gICAgICAgICAgICAgICAgICAgIDwvY2lyY2xlPlxcbiAgICAgICAgICAgICAgICAgICAgPGNpcmNsZSBjeD1cIjIyXCIgY3k9XCIyMlwiIHI9XCIxOS45MjgyXCI+XFxuICAgICAgICAgICAgICAgICAgICAgICAgPGFuaW1hdGUgYXR0cmlidXRlTmFtZT1cInJcIiBiZWdpbj1cIi0wLjlzXCIgZHVyPVwiMS44c1wiIHZhbHVlcz1cIjE7IDIwXCIgY2FsY01vZGU9XCJzcGxpbmVcIiBrZXlUaW1lcz1cIjA7IDFcIiBrZXlTcGxpbmVzPVwiMC4xNjUsIDAuODQsIDAuNDQsIDFcIiByZXBlYXRDb3VudD1cImluZGVmaW5pdGVcIj48L2FuaW1hdGU+XFxuICAgICAgICAgICAgICAgICAgICAgICAgPGFuaW1hdGUgYXR0cmlidXRlTmFtZT1cInN0cm9rZS1vcGFjaXR5XCIgYmVnaW49XCItMC45c1wiIGR1cj1cIjEuOHNcIiB2YWx1ZXM9XCIxOyAwXCIgY2FsY01vZGU9XCJzcGxpbmVcIiBrZXlUaW1lcz1cIjA7IDFcIiBrZXlTcGxpbmVzPVwiMC4zLCAwLjYxLCAwLjM1NSwgMVwiIHJlcGVhdENvdW50PVwiaW5kZWZpbml0ZVwiPjwvYW5pbWF0ZT5cXG4gICAgICAgICAgICAgICAgICAgIDwvY2lyY2xlPlxcbiAgICAgICAgICAgICAgICA8L2c+XFxuICAgICAgICAgICAgPC9zdmc+XFxuICAgICAgICAgICAgPGRpdiBjbGFzcz1cImJhYy0tdXNlci1hcHBzXCIgaWQ9XCItLXB1cmVzZGstYXBwcy1zZWN0aW9uLS1cIj5cXG4gICAgICAgICAgICAgICAgPGRpdiBpZD1cIi0tcHVyZXNkay0tYXBwcy0tb3BlbmVyLS1cIj5cXG4gICAgICAgICAgICAgICAgICAgIDxpIGNsYXNzPVwiZmEgZmEtc3F1YXJlc1wiIGlkPVwiLS1wdXJlc2RrLWFwcHMtaWNvbi0tXCI+PC9pPlxcbiAgICAgICAgICAgICAgICAgICAgPGRpdiBjbGFzcz1cIi0tcHVyZXNkay1hcHBzLW5hbWUtLVwiPmFwcHM8L2Rpdj5cXG4gICAgICAgICAgICAgICAgPC9kaXY+XFxuICAgICAgICAgICAgICAgIDxkaXYgY2xhc3M9XCJiYWMtLWFwcHMtY29udGFpbmVyXCIgaWQ9XCItLXB1cmVzZGstYXBwcy1jb250YWluZXItLVwiPlxcbiAgICAgICAgICAgICAgICAgICAgPGRpdiBjbGFzcz1cImJhYy0tYXBwcy1hcnJvd1wiPjwvZGl2PlxcbiAgICAgICAgICAgICAgICA8L2Rpdj5cXG4gICAgICAgICAgICA8L2Rpdj5cXG4gICAgICAgICAgICA8IS0tPGRpdiBjbGFzcz1cImJhYyYjNDU7JiM0NTt1c2VyLW5vdGlmaWNhdGlvbnNcIj4tLT5cXG4gICAgICAgICAgICAgICAgPCEtLTxkaXYgY2xhc3M9XCJiYWMmIzQ1OyYjNDU7dXNlci1ub3RpZmljYXRpb25zLWNvdW50XCI+MTwvZGl2Pi0tPlxcbiAgICAgICAgICAgICAgICA8IS0tPGkgY2xhc3M9XCJmYSBmYS1iZWxsLW9cIj48L2k+LS0+XFxuICAgICAgICAgICAgPCEtLTwvZGl2Pi0tPlxcbiAgICAgICAgICAgIDxkaXYgY2xhc3M9XCJiYWMtLXVzZXItYXZhdGFyXCIgaWQ9XCJiYWMtLXVzZXItYXZhdGFyLXRvcFwiPlxcbiAgICAgICAgICAgICAgICA8c3BhbiBjbGFzcz1cImJhYy0tdXNlci1hdmF0YXItbmFtZVwiIGlkPVwiLS1wdXJlc2RrLXVzZXItYXZhdGFyLS1cIj48L3NwYW4+XFxuICAgICAgICAgICAgICAgIDxkaXYgaWQ9XCJiYWMtLWltYWdlLWNvbnRhaW5lci10b3BcIj48L2Rpdj5cXG4gICAgICAgICAgICA8L2Rpdj5cXG4gICAgICAgIDwvZGl2PlxcbiAgICA8L2Rpdj5cXG4gICAgPGRpdiBpZD1cImJhYy0taW5mby1ibG9ja3Mtd3JhcHBlci0tXCI+PC9kaXY+XFxuPC9oZWFkZXI+XFxuPGRpdiBjbGFzcz1cImJhYy0tdXNlci1zaWRlYmFyXCIgaWQ9XCItLXB1cmVzZGstdXNlci1zaWRlYmFyLS1cIj5cXG4gICAgPGRpdiBpZD1cIi0tcHVyZXNkay11c2VyLWRldGFpbHMtLVwiPjwvZGl2PlxcbiAgICA8IS0tPGRpdiBjbGFzcz1cImJhYyYjNDU7JiM0NTt1c2VyLXNpZGViYXItaW5mb1wiPi0tPlxcbiAgICAgICAgPCEtLTxkaXYgY2xhc3M9XCJiYWMmIzQ1OyYjNDU7dXNlci1pbWFnZVwiPjxpIGNsYXNzPVwiZmEgZmEtY2FtZXJhXCI+PC9pPjwvZGl2Pi0tPlxcbiAgICAgICAgPCEtLTxkaXYgY2xhc3M9XCJiYWMmIzQ1OyYjNDU7dXNlci1uYW1lXCI+Q3VydGlzIEJhcnRsZXR0PC9kaXY+LS0+XFxuICAgICAgICA8IS0tPGRpdiBjbGFzcz1cImJhYyYjNDU7JiM0NTt1c2VyLWVtYWlsXCI+Y2JhcnRsZXR0QHB1cmVwcm9maWxlLmNvbTwvZGl2Pi0tPlxcbiAgICA8IS0tPC9kaXY+LS0+XFxuICAgIDxkaXYgY2xhc3M9XCJiYWMtLXVzZXItYXBwc1wiIGlkPVwiLS1wdXJlc2RrLXVzZXItYnVzaW5lc3Nlcy0tXCI+XFxuICAgICAgICA8IS0tPGRpdiBjbGFzcz1cImJhYyYjNDU7JiM0NTt1c2VyLWxpc3QtaXRlbVwiPi0tPlxcbiAgICAgICAgICAgIDwhLS08aW1nIHNyYz1cImh0dHA6Ly9sb3JlbXBpeGVsLmNvbS80MC80MFwiIGFsdD1cIlwiPi0tPlxcbiAgICAgICAgICAgIDwhLS08ZGl2IGNsYXNzPVwiYmFjLXVzZXItYXBwLWRldGFpbHNcIj4tLT5cXG4gICAgICAgICAgICAgICAgPCEtLTxzcGFuPjwvc3Bhbj4tLT5cXG4gICAgICAgICAgICAgICAgPCEtLTxzcGFuPjE1IHRlYW0gbWVtYmVyczwvc3Bhbj4tLT5cXG4gICAgICAgICAgICA8IS0tPC9kaXY+LS0+XFxuICAgICAgICA8IS0tPC9kaXY+LS0+XFxuICAgIDwvZGl2PlxcbiAgICA8ZGl2IGNsYXNzPVwiYmFjLS11c2VyLWFjY291bnQtc2V0dGluZ3NcIj5cXG4gICAgICAgIDwhLS08ZGl2IGNsYXNzPVwiYmFjLXVzZXItYWNvdW50LWxpc3QtaXRlbVwiPi0tPlxcbiAgICAgICAgICAgIDwhLS08aSBjbGFzcz1cImZhIGZhLWNvZy1saW5lXCI+PC9pPi0tPlxcbiAgICAgICAgICAgIDwhLS08YSBocmVmPVwiI1wiPkFjY291bnQgU2VjdXJpdHk8L2E+LS0+XFxuICAgICAgICA8IS0tPC9kaXY+LS0+XFxuICAgICAgICA8ZGl2IGNsYXNzPVwiYmFjLXVzZXItYWNvdW50LWxpc3QtaXRlbVwiPlxcbiAgICAgICAgICAgIDxpIGNsYXNzPVwiZmEgZmEtbG9naW4tbGluZVwiPjwvaT5cXG4gICAgICAgICAgICA8YSBocmVmPVwiL2FwaS92MS9zaWduLW9mZlwiPkxvZyBvdXQ8L2E+XFxuICAgICAgICA8L2Rpdj5cXG5cXG4gICAgICAgIDxkaXYgaWQ9XCJwdXJlc2RrLXZlcnNpb24tbnVtYmVyXCIgY2xhc3M9XCJwdXJlc2RrLXZlcnNpb24tbnVtYmVyXCI+PC9kaXY+XFxuICAgIDwvZGl2PlxcbjwvZGl2PlxcbjxpbnB1dCBzdHlsZT1cImRpc3BsYXk6bm9uZVwiIHR5cGU9XFwnZmlsZVxcJyBpZD1cXCctLS1wdXJlc2RrLWF2YXRhci1maWxlXFwnPlxcbjxpbnB1dCBzdHlsZT1cImRpc3BsYXk6bm9uZVwiIHR5cGU9XFwnYnV0dG9uXFwnIGlkPVxcJy0tLXB1cmVzZGstYXZhdGFyLXN1Ym1pdFxcJyB2YWx1ZT1cXCdVcGxvYWQhXFwnPicpO1xucHBiYS5zZXRWZXJzaW9uTnVtYmVyKCcyLjMuMTAnKTtcblxud2luZG93LlBVUkVTREsgPSBwcGJhO1xuXG52YXIgY3NzID0gJ2h0bWwsYm9keSxkaXYsc3BhbixhcHBsZXQsb2JqZWN0LGlmcmFtZSxoMSxoMixoMyxoNCxoNSxoNixwLGJsb2NrcXVvdGUscHJlLGEsYWJicixhY3JvbnltLGFkZHJlc3MsYmlnLGNpdGUsY29kZSxkZWwsZGZuLGVtLGltZyxpbnMsa2JkLHEscyxzYW1wLHNtYWxsLHN0cmlrZSxzdHJvbmcsc3ViLHN1cCx0dCx2YXIsYix1LGksY2VudGVyLGRsLGR0LGRkLG9sLHVsLGxpLGZpZWxkc2V0LGZvcm0sbGFiZWwsbGVnZW5kLHRhYmxlLGNhcHRpb24sdGJvZHksdGZvb3QsdGhlYWQsdHIsdGgsdGQsYXJ0aWNsZSxhc2lkZSxjYW52YXMsZGV0YWlscyxlbWJlZCxmaWd1cmUsZmlnY2FwdGlvbixmb290ZXIsaGVhZGVyLGhncm91cCxtZW51LG5hdixvdXRwdXQscnVieSxzZWN0aW9uLHN1bW1hcnksdGltZSxtYXJrLGF1ZGlvLHZpZGVve21hcmdpbjowO3BhZGRpbmc6MDtib3JkZXI6MDtmb250LXNpemU6MTAwJTtmb250OmluaGVyaXQ7dmVydGljYWwtYWxpZ246YmFzZWxpbmV9YXJ0aWNsZSxhc2lkZSxkZXRhaWxzLGZpZ2NhcHRpb24sZmlndXJlLGZvb3RlcixoZWFkZXIsaGdyb3VwLG1lbnUsbmF2LHNlY3Rpb257ZGlzcGxheTpibG9ja31ib2R5e2xpbmUtaGVpZ2h0OjF9b2wsdWx7bGlzdC1zdHlsZTpub25lfWJsb2NrcXVvdGUscXtxdW90ZXM6bm9uZX1ibG9ja3F1b3RlOmJlZm9yZSxibG9ja3F1b3RlOmFmdGVyLHE6YmVmb3JlLHE6YWZ0ZXJ7Y29udGVudDpcIlwiO2NvbnRlbnQ6bm9uZX10YWJsZXtib3JkZXItY29sbGFwc2U6Y29sbGFwc2U7Ym9yZGVyLXNwYWNpbmc6MH1ib2R5e292ZXJmbG93LXg6aGlkZGVufSNiYWMtd3JhcHBlcntmb250LWZhbWlseTpcIlZlcmRhbmFcIiwgYXJpYWwsIHNhbnMtc2VyaWY7Y29sb3I6d2hpdGU7bWluLWhlaWdodDoxMDB2aDtwb3NpdGlvbjpyZWxhdGl2ZX0uYmFjLS1jb250YWluZXJ7bWF4LXdpZHRoOjExNjBweDttYXJnaW46MCBhdXRvfS5iYWMtLWhlYWRlci1hcHBze3Bvc2l0aW9uOmFic29sdXRlO3dpZHRoOjEwMCU7aGVpZ2h0OjUwcHg7YmFja2dyb3VuZC1jb2xvcjojNDc1MzY5O3BhZGRpbmc6NXB4IDEwcHg7ei1pbmRleDo5OTk5OTk5Oy13ZWJraXQtYm94LXNoYWRvdzowcHggMXB4IDEycHggMHB4IHJnYmEoMCwwLDAsMC43NSk7LW1vei1ib3gtc2hhZG93OjBweCAxcHggMTJweCAwcHggcmdiYSgwLDAsMCwwLjc1KTtib3gtc2hhZG93OjBweCAxcHggMTJweCAwcHggcmdiYSgwLDAsMCwwLjc1KX0uYmFjLS1oZWFkZXItYXBwcyAuYmFjLS1jb250YWluZXJ7aGVpZ2h0OjEwMCU7ZGlzcGxheTpmbGV4O2FsaWduLWl0ZW1zOmNlbnRlcjtqdXN0aWZ5LWNvbnRlbnQ6c3BhY2UtYmV0d2Vlbn0uYmFjLS1oZWFkZXItc2VhcmNoe3Bvc2l0aW9uOnJlbGF0aXZlfS5iYWMtLWhlYWRlci1zZWFyY2ggaW5wdXR7Y29sb3I6I2ZmZjtmb250LXNpemU6MTRweDtoZWlnaHQ6MzVweDtiYWNrZ3JvdW5kLWNvbG9yOiM2Yjc1ODY7cGFkZGluZzowIDVweCAwIDEwcHg7Ym9yZGVyOm5vbmU7Ym9yZGVyLXJhZGl1czozcHg7bWluLXdpZHRoOjQwMHB4O3dpZHRoOjEwMCV9LmJhYy0taGVhZGVyLXNlYXJjaCBpbnB1dDpmb2N1c3tvdXRsaW5lOm5vbmV9LmJhYy0taGVhZGVyLXNlYXJjaCBpbnB1dDo6LXdlYmtpdC1pbnB1dC1wbGFjZWhvbGRlcntmb250LXN0eWxlOm5vcm1hbCAhaW1wb3J0YW50O3RleHQtYWxpZ246Y2VudGVyO2NvbG9yOiNmZmY7Zm9udC1zaXplOjE0cHg7Zm9udC13ZWlnaHQ6MzAwO2xldHRlci1zcGFjaW5nOjAuNXB4fS5iYWMtLWhlYWRlci1zZWFyY2ggaW5wdXQ6Oi1tb3otcGxhY2Vob2xkZXJ7Zm9udC1zdHlsZTpub3JtYWwgIWltcG9ydGFudDt0ZXh0LWFsaWduOmNlbnRlcjtjb2xvcjojZmZmO2ZvbnQtc2l6ZToxNHB4O2ZvbnQtd2VpZ2h0OjMwMDtsZXR0ZXItc3BhY2luZzowLjVweH0uYmFjLS1oZWFkZXItc2VhcmNoIGlucHV0Oi1tcy1pbnB1dC1wbGFjZWhvbGRlcntmb250LXN0eWxlOm5vcm1hbCAhaW1wb3J0YW50O3RleHQtYWxpZ246Y2VudGVyO2NvbG9yOiNmZmY7Zm9udC1zaXplOjE0cHg7Zm9udC13ZWlnaHQ6MzAwO2xldHRlci1zcGFjaW5nOjAuNXB4fS5iYWMtLWhlYWRlci1zZWFyY2ggaXtwb3NpdGlvbjphYnNvbHV0ZTt0b3A6OHB4O3JpZ2h0OjEwcHh9LmJhYy0tdXNlci1hY3Rpb25ze2Rpc3BsYXk6ZmxleDthbGlnbi1pdGVtczpjZW50ZXJ9LmJhYy0tdXNlci1hY3Rpb25zPmRpdntjdXJzb3I6cG9pbnRlcjtjb2xvcjp3aGl0ZX0uYmFjLS11c2VyLWFjdGlvbnMgLmJhYy0tdXNlci1ub3RpZmljYXRpb25ze3Bvc2l0aW9uOnJlbGF0aXZlfS5iYWMtLXVzZXItYWN0aW9ucyAuYmFjLS11c2VyLW5vdGlmaWNhdGlvbnMgaXtmb250LXNpemU6MjBweH0uYmFjLS11c2VyLWFjdGlvbnMgIy0tcHVyZXNkay0tbG9hZGVyLS17ZGlzcGxheTpub25lfS5iYWMtLXVzZXItYWN0aW9ucyAjLS1wdXJlc2RrLS1sb2FkZXItLS4tLXB1cmVzZGstdmlzaWJsZXtkaXNwbGF5OmJsb2NrfS5iYWMtLXVzZXItYWN0aW9ucyAuYmFjLS11c2VyLW5vdGlmaWNhdGlvbnMtY291bnR7cG9zaXRpb246YWJzb2x1dGU7ZGlzcGxheTppbmxpbmUtYmxvY2s7aGVpZ2h0OjE1cHg7d2lkdGg6MTVweDtsaW5lLWhlaWdodDoxNXB4O2NvbG9yOiNmZmY7Zm9udC1zaXplOjEwcHg7dGV4dC1hbGlnbjpjZW50ZXI7YmFja2dyb3VuZC1jb2xvcjojZmMzYjMwO2JvcmRlci1yYWRpdXM6NTAlO3RvcDotNXB4O2xlZnQ6LTVweH0uYmFjLS11c2VyLWFjdGlvbnMgLmJhYy0tdXNlci1hdmF0YXIsLmJhYy0tdXNlci1hY3Rpb25zIC5iYWMtLXVzZXItbm90aWZpY2F0aW9uc3ttYXJnaW4tbGVmdDoyMHB4fS5iYWMtLXVzZXItYWN0aW9ucyAuYmFjLS11c2VyLWF2YXRhcntwb3NpdGlvbjpyZWxhdGl2ZTtvdmVyZmxvdzpoaWRkZW47Ym9yZGVyLXJhZGl1czo1MCV9LmJhYy0tdXNlci1hY3Rpb25zIC5iYWMtLXVzZXItYXZhdGFyICNiYWMtLWltYWdlLWNvbnRhaW5lci10b3B7d2lkdGg6MTAwJTtoZWlndGg6MTAwJTtwb3NpdGlvbjphYnNvbHV0ZTt0b3A6MDtsZWZ0OjA7ei1pbmRleDoxO2Rpc3BsYXk6bm9uZX0uYmFjLS11c2VyLWFjdGlvbnMgLmJhYy0tdXNlci1hdmF0YXIgI2JhYy0taW1hZ2UtY29udGFpbmVyLXRvcCBpbWd7d2lkdGg6MTAwJTtoZWlnaHQ6MTAwJX0uYmFjLS11c2VyLWFjdGlvbnMgLmJhYy0tdXNlci1hdmF0YXIgI2JhYy0taW1hZ2UtY29udGFpbmVyLXRvcC4tLXB1cmVzZGstdmlzaWJsZXtkaXNwbGF5OmJsb2NrfS5iYWMtLXVzZXItYWN0aW9ucyAuYmFjLS11c2VyLWF2YXRhci1uYW1le2NvbG9yOiNmZmY7YmFja2dyb3VuZC1jb2xvcjojYWRhZGFkO2Rpc3BsYXk6aW5saW5lLWJsb2NrO2hlaWdodDozNXB4O3dpZHRoOjM1cHg7bGluZS1oZWlnaHQ6MzVweDt0ZXh0LWFsaWduOmNlbnRlcjtmb250LXNpemU6MTRweH0uYmFjLS11c2VyLWFwcHN7cG9zaXRpb246cmVsYXRpdmV9LmJhYy0tdXNlci1hcHBzICMtLXB1cmVzZGstYXBwcy1pY29uLS17d2lkdGg6MjBweDtkaXNwbGF5OmlubGluZS1ibG9jazt0ZXh0LWFsaWduOmNlbnRlcn0uYmFjLS11c2VyLWFwcHMgLi0tcHVyZXNkay1hcHBzLW5hbWUtLXtmb250LXNpemU6OHB4O3dpZHRoOjIwcHg7dGV4dC1hbGlnbjpjZW50ZXJ9Iy0tcHVyZXNkay11c2VyLWJ1c2luZXNzZXMtLXtoZWlnaHQ6Y2FsYygxMDB2aCAtIDQ1OHB4KTtvdmVyZmxvdzphdXRvfS5iYWMtLWFwcHMtY29udGFpbmVye2JhY2tncm91bmQ6I2ZmZjtwb3NpdGlvbjphYnNvbHV0ZTt0b3A6NDVweDtyaWdodDotNDBweDtkaXNwbGF5OmZsZXg7d2lkdGg6MzYwcHg7ZmxleC13cmFwOndyYXA7Ym9yZGVyLXJhZGl1czoxMHB4O3BhZGRpbmc6MzBweDtqdXN0aWZ5LWNvbnRlbnQ6c3BhY2UtYmV0d2Vlbjt0ZXh0LWFsaWduOmNlbnRlcjstd2Via2l0LWJveC1zaGFkb3c6MCAwIDEwcHggMnB4IHJnYmEoMCwwLDAsMC4yKTtib3gtc2hhZG93OjAgMCAxMHB4IDJweCByZ2JhKDAsMCwwLDAuMik7b3BhY2l0eTowO3Zpc2liaWxpdHk6aGlkZGVuO3RyYW5zaXRpb246YWxsIDAuNHMgZWFzZX0uYmFjLS1hcHBzLWNvbnRhaW5lci5hY3RpdmV7b3BhY2l0eToxO3Zpc2liaWxpdHk6dmlzaWJsZX0uYmFjLS1hcHBzLWNvbnRhaW5lciAuYmFjLS1hcHBzLWFycm93e3Bvc2l0aW9uOmFic29sdXRlO2Rpc3BsYXk6YmxvY2s7aGVpZ2h0OjIwcHg7d2lkdGg6MjBweDt0b3A6LTEwcHg7cmlnaHQ6MzZweDtiYWNrZ3JvdW5kOiNmZmY7dHJhbnNmb3JtOnJvdGF0ZSgtNDVkZWcpO3otaW5kZXg6MX0uYmFjLS1hcHBzLWNvbnRhaW5lciAuYmFjLS1hcHBze3dpZHRoOjMyJTtkaXNwbGF5OmZsZXg7Zm9udC1zaXplOjMwcHg7bWFyZ2luLWJvdHRvbTo0MHB4O3RleHQtYWxpZ246Y2VudGVyO2p1c3RpZnktY29udGVudDpjZW50ZXI7ZmxleC13cmFwOndyYXB9LmJhYy0tYXBwcy1jb250YWluZXIgLmJhYy0tYXBwcyBhe2Rpc3BsYXk6YmxvY2s7Y29sb3I6I2ZmZjt0ZXh0LWRlY29yYXRpb246bm9uZTt3aWR0aDo2NXB4O2hlaWdodDo2NXB4O3BhZGRpbmctdG9wOjNweDtsaW5lLWhlaWdodDo2NXB4O3RleHQtYWxpZ246Y2VudGVyO2JvcmRlci1yYWRpdXM6MTBweDstd2Via2l0LWJveC1zaGFkb3c6MCAwIDVweCAwIHJnYmEoMCwwLDAsMC4yKTtib3gtc2hhZG93OjAgMCA1cHggMCByZ2JhKDAsMCwwLDAuMil9LmJhYy0tYXBwcy1jb250YWluZXIgLmJhYy0tYXBwcyAuYmFjLS1hcHAtbmFtZXt3aWR0aDoxMDAlO2NvbG9yOiMwMDA7Zm9udC1zaXplOjE0cHg7cGFkZGluZzoxMHB4IDAgNXB4IDB9LmJhYy0tYXBwcy1jb250YWluZXIgLmJhYy0tYXBwcyAuYmFjLS1hcHAtZGVzY3JpcHRpb257Y29sb3I6IzkxOTE5MTtmb250LXNpemU6MTJweDtmb250LXN0eWxlOml0YWxpYztsaW5lLWhlaWdodDoxLjNlbX0uYmFjLS11c2VyLXNpZGViYXJ7Zm9udC1mYW1pbHk6XCJWZXJkYW5hXCIsIGFyaWFsLCBzYW5zLXNlcmlmO2NvbG9yOndoaXRlO2hlaWdodDpjYWxjKDEwMHZoIC0gNTBweCk7YmFja2dyb3VuZC1jb2xvcjojNTE1Zjc3O2JveC1zaXppbmc6Ym9yZGVyLWJveDt3aWR0aDozMjBweDtwb3NpdGlvbjphYnNvbHV0ZTt0b3A6MDtyaWdodDowO3otaW5kZXg6OTk5OTk5O3BhZGRpbmctdG9wOjEwcHg7b3BhY2l0eTowO21hcmdpbi10b3A6NTBweDt0cmFuc2Zvcm06dHJhbnNsYXRlWCgxMDAlKTt0cmFuc2l0aW9uOmFsbCAwLjRzIGVhc2V9LmJhYy0tdXNlci1zaWRlYmFyLmFjdGl2ZXtvcGFjaXR5OjE7dHJhbnNmb3JtOnRyYW5zbGF0ZVgoMCUpOy13ZWJraXQtYm94LXNoYWRvdzotMXB4IDBweCAxMnB4IDBweCByZ2JhKDAsMCwwLDAuNzUpOy1tb3otYm94LXNoYWRvdzotMXB4IDNweCAxMnB4IDBweCByZ2JhKDAsMCwwLDAuNzUpO2JveC1zaGFkb3c6LTFweCAwcHggMTJweCAwcHggcmdiYSgwLDAsMCwwLjc1KX0uYmFjLS11c2VyLXNpZGViYXIgLmJhYy0tdXNlci1saXN0LWl0ZW17ZGlzcGxheTpmbGV4O2N1cnNvcjpwb2ludGVyO2FsaWduLWl0ZW1zOmNlbnRlcjtwYWRkaW5nOjEwcHggMTBweCAxMHB4IDQwcHg7Ym9yZGVyLWJvdHRvbToycHggc29saWQgIzZiNzU4Nn0uYmFjLS11c2VyLXNpZGViYXIgLmJhYy0tdXNlci1saXN0LWl0ZW06aG92ZXJ7YmFja2dyb3VuZC1jb2xvcjojNmI3NTg2fS5iYWMtLXVzZXItc2lkZWJhciAuYmFjLS11c2VyLWxpc3QtaXRlbSAuYmFjLS11c2VyLWxpc3QtaXRlbS1pbWFnZXt3aWR0aDo0MHB4O2hlaWdodDo0MHB4O2JvcmRlci1yYWRpdXM6M3B4O2JvcmRlcjoycHggc29saWQgI2ZmZjttYXJnaW4tcmlnaHQ6MjBweDtkaXNwbGF5OmZsZXg7YWxpZ24taXRlbXM6Y2VudGVyO2p1c3RpZnktY29udGVudDpjZW50ZXJ9LmJhYy0tdXNlci1zaWRlYmFyIC5iYWMtLXVzZXItbGlzdC1pdGVtIC5iYWMtLXVzZXItbGlzdC1pdGVtLWltYWdlPmltZ3t3aWR0aDphdXRvO2hlaWdodDphdXRvO21heC13aWR0aDoxMDAlO21heC1oZWlnaHQ6MTAwJX0uYmFjLS11c2VyLXNpZGViYXIgLmJhYy0tdXNlci1saXN0LWl0ZW0gc3Bhbnt3aWR0aDoxMDAlO2Rpc3BsYXk6YmxvY2s7bWFyZ2luLWJvdHRvbTo1cHh9LmJhYy0tdXNlci1zaWRlYmFyIC5iYWMtdXNlci1hcHAtZGV0YWlscyBzcGFue2ZvbnQtc2l6ZToxMnB4fS5iYWMtLXVzZXItc2lkZWJhciAucHVyZXNkay12ZXJzaW9uLW51bWJlcnt3aWR0aDoxMDAlO3RleHQtYWxpZ246cmlnaHQ7cGFkZGluZy1yaWdodDoxMHB4O3Bvc2l0aW9uOmFic29sdXRlO2JvdHRvbToxMHB4O2ZvbnQtc2l6ZTo4cHg7b3BhY2l0eTowLjU7bGVmdDowfS5iYWMtLXVzZXItc2lkZWJhci1pbmZve2Rpc3BsYXk6ZmxleDtqdXN0aWZ5LWNvbnRlbnQ6Y2VudGVyO2ZsZXgtd3JhcDp3cmFwO3RleHQtYWxpZ246Y2VudGVyO3BhZGRpbmc6MTBweCAyMHB4IDE1cHh9LmJhYy0tdXNlci1zaWRlYmFyLWluZm8gLmJhYy0tdXNlci1pbWFnZXtib3JkZXI6MXB4ICNhZGFkYWQgc29saWQ7b3ZlcmZsb3c6aGlkZGVuO2JvcmRlci1yYWRpdXM6NTAlO3Bvc2l0aW9uOnJlbGF0aXZlO2N1cnNvcjpwb2ludGVyO2Rpc3BsYXk6aW5saW5lLWJsb2NrO2hlaWdodDo4MHB4O3dpZHRoOjgwcHg7bGluZS1oZWlnaHQ6ODBweDt0ZXh0LWFsaWduOmNlbnRlcjtjb2xvcjojZmZmO2JvcmRlci1yYWRpdXM6NTAlO2JhY2tncm91bmQtY29sb3I6I2FkYWRhZDttYXJnaW4tYm90dG9tOjE1cHh9LmJhYy0tdXNlci1zaWRlYmFyLWluZm8gLmJhYy0tdXNlci1pbWFnZSAjYmFjLS11c2VyLWltYWdlLWZpbGV7ZGlzcGxheTpub25lO3Bvc2l0aW9uOmFic29sdXRlO3otaW5kZXg6MTt0b3A6MDtsZWZ0OjA7d2lkdGg6MTAwJTtoZWlnaHQ6MTAwJX0uYmFjLS11c2VyLXNpZGViYXItaW5mbyAuYmFjLS11c2VyLWltYWdlICNiYWMtLXVzZXItaW1hZ2UtZmlsZSBpbWd7d2lkdGg6MTAwJTtoZWlnaHQ6MTAwJX0uYmFjLS11c2VyLXNpZGViYXItaW5mbyAuYmFjLS11c2VyLWltYWdlICNiYWMtLXVzZXItaW1hZ2UtZmlsZS4tLXB1cmVzZGstdmlzaWJsZXtkaXNwbGF5OmJsb2NrfS5iYWMtLXVzZXItc2lkZWJhci1pbmZvIC5iYWMtLXVzZXItaW1hZ2UgI2JhYy0tdXNlci1pbWFnZS11cGxvYWQtcHJvZ3Jlc3N7cG9zaXRpb246YWJzb2x1dGU7cGFkZGluZy10b3A6MTBweDt0b3A6MDtiYWNrZ3JvdW5kOiM2NjY7ei1pbmRleDo0O2Rpc3BsYXk6bm9uZTt3aWR0aDoxMDAlO2hlaWdodDoxMDAlfS5iYWMtLXVzZXItc2lkZWJhci1pbmZvIC5iYWMtLXVzZXItaW1hZ2UgI2JhYy0tdXNlci1pbWFnZS11cGxvYWQtcHJvZ3Jlc3MuLS1wdXJlc2RrLXZpc2libGV7ZGlzcGxheTpibG9ja30uYmFjLS11c2VyLXNpZGViYXItaW5mbyAuYmFjLS11c2VyLWltYWdlIGl7Zm9udC1zaXplOjMycHg7Zm9udC1zaXplOjMycHg7ei1pbmRleDowO3Bvc2l0aW9uOmFic29sdXRlO3dpZHRoOjEwMCU7bGVmdDowO2JhY2tncm91bmQtY29sb3I6cmdiYSgwLDAsMCwwLjUpfS5iYWMtLXVzZXItc2lkZWJhci1pbmZvIC5iYWMtLXVzZXItaW1hZ2U6aG92ZXIgaXt6LWluZGV4OjN9LmJhYy0tdXNlci1zaWRlYmFyLWluZm8gLmJhYy0tdXNlci1uYW1le3dpZHRoOjEwMCU7dGV4dC1hbGlnbjpjZW50ZXI7Zm9udC1zaXplOjE4cHg7bWFyZ2luLWJvdHRvbToxMHB4fS5iYWMtLXVzZXItc2lkZWJhci1pbmZvIC5iYWMtLXVzZXItZW1haWx7Zm9udC1zaXplOjEycHg7Zm9udC13ZWlnaHQ6MzAwfS5iYWMtLXVzZXItYWNjb3VudC1zZXR0aW5nc3twYWRkaW5nOjUwcHh9LmJhYy0tdXNlci1hY2NvdW50LXNldHRpbmdzIC5iYWMtdXNlci1hY291bnQtbGlzdC1pdGVte2Rpc3BsYXk6ZmxleDthbGlnbi1pdGVtczpjZW50ZXI7bWFyZ2luLWJvdHRvbTozMHB4fS5iYWMtLXVzZXItYWNjb3VudC1zZXR0aW5ncyAuYmFjLXVzZXItYWNvdW50LWxpc3QtaXRlbSBhe3RleHQtZGVjb3JhdGlvbjpub25lO2NvbG9yOiNmZmZ9LmJhYy0tdXNlci1hY2NvdW50LXNldHRpbmdzIC5iYWMtdXNlci1hY291bnQtbGlzdC1pdGVtIGl7Zm9udC1zaXplOjI0cHg7bWFyZ2luLXJpZ2h0OjIwcHh9Iy0tcHVyZXNkay1hY2NvdW50LWxvZ28tLXtjdXJzb3I6cG9pbnRlcn0jLS1wdXJlc2RrLWFjY291bnQtbG9nby0tIGltZ3toZWlnaHQ6MjhweH0jYmFjLS1pbmZvLWJsb2Nrcy13cmFwcGVyLS17cG9zaXRpb246cmVsYXRpdmV9I2JhYy0taW5mby1ibG9ja3Mtd3JhcHBlci0tIC4tLXB1cmVzZGstaW5mby1ib3gtLXtib3JkZXItcmFkaXVzOjAgMCAzcHggM3B4O292ZXJmbG93OmhpZGRlbjt6LWluZGV4Ojk5OTk5OTk5O3Bvc2l0aW9uOmZpeGVkO3RvcDotNDFweDt3aWR0aDo0NzBweDtsZWZ0OmNhbGMoNTB2dyAtIDIzNXB4KTtoZWlnaHQ6NDBweDstd2Via2l0LXRyYW5zaXRpb246dG9wIDAuNHM7dHJhbnNpdGlvbjp0b3AgMC40c30jYmFjLS1pbmZvLWJsb2Nrcy13cmFwcGVyLS0gLi0tcHVyZXNkay1pbmZvLWJveC0tLmJhYy0tc3VjY2Vzc3tiYWNrZ3JvdW5kOiMxNERBOUV9I2JhYy0taW5mby1ibG9ja3Mtd3JhcHBlci0tIC4tLXB1cmVzZGstaW5mby1ib3gtLS5iYWMtLXN1Y2Nlc3MgLmJhYy0taW5uZXItaW5mby1ib3gtLSBkaXYuYmFjLS1pbmZvLWljb24tLS5mYS1zdWNjZXNze2Rpc3BsYXk6aW5saW5lLWJsb2NrfSNiYWMtLWluZm8tYmxvY2tzLXdyYXBwZXItLSAuLS1wdXJlc2RrLWluZm8tYm94LS0uYmFjLS1pbmZve2JhY2tncm91bmQtY29sb3I6IzVCQzBERX0jYmFjLS1pbmZvLWJsb2Nrcy13cmFwcGVyLS0gLi0tcHVyZXNkay1pbmZvLWJveC0tLmJhYy0taW5mbyAuYmFjLS1pbm5lci1pbmZvLWJveC0tIGRpdi5iYWMtLWluZm8taWNvbi0tLmZhLWluZm8tMXtkaXNwbGF5OmlubGluZS1ibG9ja30jYmFjLS1pbmZvLWJsb2Nrcy13cmFwcGVyLS0gLi0tcHVyZXNkay1pbmZvLWJveC0tLmJhYy0td2FybmluZ3tiYWNrZ3JvdW5kOiNGMEFENEV9I2JhYy0taW5mby1ibG9ja3Mtd3JhcHBlci0tIC4tLXB1cmVzZGstaW5mby1ib3gtLS5iYWMtLXdhcm5pbmcgLmJhYy0taW5uZXItaW5mby1ib3gtLSBkaXYuYmFjLS1pbmZvLWljb24tLS5mYS13YXJuaW5ne2Rpc3BsYXk6aW5saW5lLWJsb2NrfSNiYWMtLWluZm8tYmxvY2tzLXdyYXBwZXItLSAuLS1wdXJlc2RrLWluZm8tYm94LS0uYmFjLS1lcnJvcntiYWNrZ3JvdW5kOiNFRjQxMDB9I2JhYy0taW5mby1ibG9ja3Mtd3JhcHBlci0tIC4tLXB1cmVzZGstaW5mby1ib3gtLS5iYWMtLWVycm9yIC5iYWMtLWlubmVyLWluZm8tYm94LS0gZGl2LmJhYy0taW5mby1pY29uLS0uZmEtZXJyb3J7ZGlzcGxheTppbmxpbmUtYmxvY2t9I2JhYy0taW5mby1ibG9ja3Mtd3JhcHBlci0tIC4tLXB1cmVzZGstaW5mby1ib3gtLSAuYmFjLS10aW1lcnstd2Via2l0LXRyYW5zaXRpb24tdGltaW5nLWZ1bmN0aW9uOmxpbmVhcjt0cmFuc2l0aW9uLXRpbWluZy1mdW5jdGlvbjpsaW5lYXI7cG9zaXRpb246YWJzb2x1dGU7Ym90dG9tOjBweDtvcGFjaXR5OjAuNTtoZWlnaHQ6MnB4ICFpbXBvcnRhbnQ7YmFja2dyb3VuZDp3aGl0ZTt3aWR0aDowJX0jYmFjLS1pbmZvLWJsb2Nrcy13cmFwcGVyLS0gLi0tcHVyZXNkay1pbmZvLWJveC0tIC5iYWMtLXRpbWVyLmJhYy0tZnVsbHdpZHRoe3dpZHRoOjEwMCV9I2JhYy0taW5mby1ibG9ja3Mtd3JhcHBlci0tIC4tLXB1cmVzZGstaW5mby1ib3gtLS5iYWMtLWFjdGl2ZS0te3RvcDowcHh9I2JhYy0taW5mby1ibG9ja3Mtd3JhcHBlci0tIC4tLXB1cmVzZGstaW5mby1ib3gtLSAuYmFjLS1pbm5lci1pbmZvLWJveC0te3dpZHRoOjEwMCU7cGFkZGluZzoxMXB4IDE1cHg7Y29sb3I6d2hpdGV9I2JhYy0taW5mby1ibG9ja3Mtd3JhcHBlci0tIC4tLXB1cmVzZGstaW5mby1ib3gtLSAuYmFjLS1pbm5lci1pbmZvLWJveC0tIGRpdntkaXNwbGF5OmlubGluZS1ibG9jaztoZWlnaHQ6MThweDtwb3NpdGlvbjpyZWxhdGl2ZX0jYmFjLS1pbmZvLWJsb2Nrcy13cmFwcGVyLS0gLi0tcHVyZXNkay1pbmZvLWJveC0tIC5iYWMtLWlubmVyLWluZm8tYm94LS0gZGl2LmJhYy0taW5mby1pY29uLS17ZGlzcGxheTpub25lO3RvcDowcHh9I2JhYy0taW5mby1ibG9ja3Mtd3JhcHBlci0tIC4tLXB1cmVzZGstaW5mby1ib3gtLSAuYmFjLS1pbm5lci1pbmZvLWJveC0tIC5iYWMtLWluZm8taWNvbi0te21hcmdpbi1yaWdodDoxNXB4O3dpZHRoOjEwcHg7dG9wOjJweH0jYmFjLS1pbmZvLWJsb2Nrcy13cmFwcGVyLS0gLi0tcHVyZXNkay1pbmZvLWJveC0tIC5iYWMtLWlubmVyLWluZm8tYm94LS0gLmJhYy0taW5mby1tYWluLXRleHQtLXt3aWR0aDozODBweDttYXJnaW4tcmlnaHQ6MTVweDtmb250LXNpemU6MTJweDt0ZXh0LWFsaWduOmNlbnRlcn0jYmFjLS1pbmZvLWJsb2Nrcy13cmFwcGVyLS0gLi0tcHVyZXNkay1pbmZvLWJveC0tIC5iYWMtLWlubmVyLWluZm8tYm94LS0gLmJhYy0taW5mby1jbG9zZS1idXR0b24tLXt3aWR0aDoxMHB4O2N1cnNvcjpwb2ludGVyO3RvcDoycHh9JyxcbiAgICBoZWFkID0gZG9jdW1lbnQuaGVhZCB8fCBkb2N1bWVudC5nZXRFbGVtZW50c0J5VGFnTmFtZSgnaGVhZCcpWzBdLFxuICAgIHN0eWxlID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudCgnc3R5bGUnKTtcblxuc3R5bGUudHlwZSA9ICd0ZXh0L2Nzcyc7XG5pZiAoc3R5bGUuc3R5bGVTaGVldCkge1xuICAgIHN0eWxlLnN0eWxlU2hlZXQuY3NzVGV4dCA9IGNzcztcbn0gZWxzZSB7XG4gICAgc3R5bGUuYXBwZW5kQ2hpbGQoZG9jdW1lbnQuY3JlYXRlVGV4dE5vZGUoY3NzKSk7XG59XG5oZWFkLmFwcGVuZENoaWxkKHN0eWxlKTtcblxudmFyIGxpbmsgPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KCdsaW5rJyk7XG5saW5rLmhyZWYgPSAnaHR0cHM6Ly9maWxlLm15Zm9udGFzdGljLmNvbS9NRHZuUkpHaEJkNXhWY1huNHVRSlNaL2ljb25zLmNzcyc7XG5saW5rLnJlbCA9ICdzdHlsZXNoZWV0JztcblxuZG9jdW1lbnQuZ2V0RWxlbWVudHNCeVRhZ05hbWUoJ2hlYWQnKVswXS5hcHBlbmRDaGlsZChsaW5rKTtcblxubW9kdWxlLmV4cG9ydHMgPSBwcGJhOyIsInZhciBTdG9yZSA9IHJlcXVpcmUoJy4vc3RvcmUnKTtcbnZhciBMb2dnZXIgPSByZXF1aXJlKCcuL2xvZ2dlcicpO1xudmFyIERvbSA9IHJlcXVpcmUoJy4vZG9tJyk7XG52YXIgQ2FsbGVyID0gcmVxdWlyZSgnLi9jYWxsZXInKTtcblxudmFyIHVwbG9hZGluZyA9IGZhbHNlO1xuXG52YXIgQXZhdGFyQ3RybCA9IHtcblx0X3N1Ym1pdDogbnVsbCxcblx0X2ZpbGU6IG51bGwsXG5cdF9wcm9ncmVzczogbnVsbCxcblx0X3NpZGViYXJfYXZhdGFyOiBudWxsLFxuXHRfdG9wX2F2YXRhcjogbnVsbCxcblx0X3RvcF9hdmF0YXJfY29udGFpbmVyOiBudWxsLFxuXG5cdGluaXQ6IGZ1bmN0aW9uIGluaXQoKSB7XG5cdFx0QXZhdGFyQ3RybC5fc3VibWl0ID0gZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoJy0tLXB1cmVzZGstYXZhdGFyLXN1Ym1pdCcpO1xuXHRcdEF2YXRhckN0cmwuX2ZpbGUgPSBkb2N1bWVudC5nZXRFbGVtZW50QnlJZCgnLS0tcHVyZXNkay1hdmF0YXItZmlsZScpO1xuXHRcdEF2YXRhckN0cmwuX3RvcF9hdmF0YXJfY29udGFpbmVyID0gZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoJ2JhYy0taW1hZ2UtY29udGFpbmVyLXRvcCcpO1xuXHRcdEF2YXRhckN0cmwuX3Byb2dyZXNzID0gZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoJ2JhYy0tdXNlci1pbWFnZS11cGxvYWQtcHJvZ3Jlc3MnKTtcblx0XHRBdmF0YXJDdHJsLl9zaWRlYmFyX2F2YXRhciA9IGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKCdiYWMtLXVzZXItaW1hZ2UtZmlsZScpO1xuXHRcdEF2YXRhckN0cmwuX3RvcF9hdmF0YXIgPSBkb2N1bWVudC5nZXRFbGVtZW50QnlJZCgnYmFjLS11c2VyLWF2YXRhci10b3AnKTtcblx0XHRBdmF0YXJDdHJsLl9maWxlLmFkZEV2ZW50TGlzdGVuZXIoJ2NsaWNrJywgZnVuY3Rpb24gKGUpIHtcblx0XHRcdGUuc3RvcFByb3BhZ2F0aW9uKCk7XG5cdFx0fSk7XG5cdFx0QXZhdGFyQ3RybC5fZmlsZS5hZGRFdmVudExpc3RlbmVyKCdjaGFuZ2UnLCBmdW5jdGlvbiAoZSkge1xuXHRcdFx0QXZhdGFyQ3RybC51cGxvYWQoKTtcblx0XHR9KTtcblxuXHRcdGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKCdiYWMtLXVzZXItaW1hZ2UnKS5hZGRFdmVudExpc3RlbmVyKCdjbGljaycsIGZ1bmN0aW9uIChlKSB7XG5cdFx0XHRlLnN0b3BQcm9wYWdhdGlvbigpO1xuXHRcdFx0QXZhdGFyQ3RybC5fZmlsZS5jbGljaygpO1xuXHRcdH0pO1xuXHR9LFxuXG5cdHVwbG9hZDogZnVuY3Rpb24gdXBsb2FkKCkge1xuXHRcdGlmICh1cGxvYWRpbmcpIHtcblx0XHRcdHJldHVybjtcblx0XHR9XG5cdFx0dXBsb2FkaW5nID0gdHJ1ZTtcblxuXHRcdGlmIChBdmF0YXJDdHJsLl9maWxlLmZpbGVzLmxlbmd0aCA9PT0gMCkge1xuXHRcdFx0cmV0dXJuO1xuXHRcdH1cblxuXHRcdHZhciBkYXRhID0gbmV3IEZvcm1EYXRhKCk7XG5cdFx0ZGF0YS5hcHBlbmQoJ2ZpbGUnLCBBdmF0YXJDdHJsLl9maWxlLmZpbGVzWzBdKTtcblxuXHRcdHZhciBzdWNjZXNzQ2FsbGJhY2sgPSBmdW5jdGlvbiBzdWNjZXNzQ2FsbGJhY2soZGF0YSkge1xuXHRcdFx0O1xuXHRcdH07XG5cblx0XHR2YXIgZmFpbENhbGxiYWNrID0gZnVuY3Rpb24gZmFpbENhbGxiYWNrKGRhdGEpIHtcblx0XHRcdDtcblx0XHR9O1xuXG5cdFx0dmFyIHJlcXVlc3QgPSBuZXcgWE1MSHR0cFJlcXVlc3QoKTtcblx0XHRyZXF1ZXN0Lm9ucmVhZHlzdGF0ZWNoYW5nZSA9IGZ1bmN0aW9uICgpIHtcblx0XHRcdHVwbG9hZGluZyA9IGZhbHNlO1xuXHRcdFx0aWYgKHJlcXVlc3QucmVhZHlTdGF0ZSA9PSA0KSB7XG5cdFx0XHRcdHRyeSB7XG5cdFx0XHRcdFx0dmFyIGltYWdlRGF0YSA9IEpTT04ucGFyc2UocmVxdWVzdC5yZXNwb25zZSkuZGF0YTtcblx0XHRcdFx0XHRBdmF0YXJDdHJsLnNldEF2YXRhcihpbWFnZURhdGEudXJsKTtcblx0XHRcdFx0XHRDYWxsZXIubWFrZUNhbGwoe1xuXHRcdFx0XHRcdFx0dHlwZTogJ1BVVCcsXG5cdFx0XHRcdFx0XHRlbmRwb2ludDogU3RvcmUuZ2V0QXZhdGFyVXBkYXRlVXJsKCksXG5cdFx0XHRcdFx0XHRwYXJhbXM6IHtcblx0XHRcdFx0XHRcdFx0dXNlcjoge1xuXHRcdFx0XHRcdFx0XHRcdGF2YXRhcl91dWlkOiBpbWFnZURhdGEuZ3VpZFxuXHRcdFx0XHRcdFx0XHR9XG5cdFx0XHRcdFx0XHR9LFxuXHRcdFx0XHRcdFx0Y2FsbGJhY2tzOiB7XG5cdFx0XHRcdFx0XHRcdHN1Y2Nlc3M6IHN1Y2Nlc3NDYWxsYmFjayxcblx0XHRcdFx0XHRcdFx0ZmFpbDogZmFpbENhbGxiYWNrXG5cdFx0XHRcdFx0XHR9XG5cdFx0XHRcdFx0fSk7XG5cdFx0XHRcdH0gY2F0Y2ggKGUpIHtcblx0XHRcdFx0XHR2YXIgcmVzcCA9IHtcblx0XHRcdFx0XHRcdHN0YXR1czogJ2Vycm9yJyxcblx0XHRcdFx0XHRcdGRhdGE6ICdVbmtub3duIGVycm9yIG9jY3VycmVkOiBbJyArIHJlcXVlc3QucmVzcG9uc2VUZXh0ICsgJ10nXG5cdFx0XHRcdFx0fTtcblx0XHRcdFx0fVxuXHRcdFx0XHRMb2dnZXIubG9nKHJlcXVlc3QucmVzcG9uc2Uuc3RhdHVzICsgJzogJyArIHJlcXVlc3QucmVzcG9uc2UuZGF0YSk7XG5cdFx0XHR9XG5cdFx0fTtcblxuXHRcdC8vIHJlcXVlc3QudXBsb2FkLmFkZEV2ZW50TGlzdGVuZXIoJ3Byb2dyZXNzJywgZnVuY3Rpb24oZSl7XG5cdFx0Ly8gXHRMb2dnZXIubG9nKGUubG9hZGVkL2UudG90YWwpO1xuXHRcdC8vIFx0QXZhdGFyQ3RybC5fcHJvZ3Jlc3Muc3R5bGUudG9wID0gMTAwIC0gKGUubG9hZGVkL2UudG90YWwpICogMTAwICsgJyUnO1xuXHRcdC8vIH0sIGZhbHNlKTtcblxuXHRcdHZhciB1cmwgPSBTdG9yZS5nZXRBdmF0YXJVcGxvYWRVcmwoKTtcblx0XHREb20uYWRkQ2xhc3MoQXZhdGFyQ3RybC5fcHJvZ3Jlc3MsICctLXB1cmVzZGstdmlzaWJsZScpO1xuXHRcdHJlcXVlc3Qub3BlbignUE9TVCcsIHVybCk7XG5cdFx0cmVxdWVzdC5zZW5kKGRhdGEpO1xuXHR9LFxuXG5cdHNldEF2YXRhcjogZnVuY3Rpb24gc2V0QXZhdGFyKHVybCkge1xuXHRcdGlmICghdXJsKSB7XG5cdFx0XHRyZXR1cm47XG5cdFx0fVxuXG5cdFx0RG9tLnJlbW92ZUNsYXNzKEF2YXRhckN0cmwuX3Byb2dyZXNzLCAnLS1wdXJlc2RrLXZpc2libGUnKTtcblx0XHREb20uYWRkQ2xhc3MoQXZhdGFyQ3RybC5fc2lkZWJhcl9hdmF0YXIsICctLXB1cmVzZGstdmlzaWJsZScpO1xuXHRcdHZhciBpbWcgPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KCdpbWcnKTtcblx0XHRpbWcuc3JjID0gdXJsO1xuXHRcdEF2YXRhckN0cmwuX3NpZGViYXJfYXZhdGFyLmlubmVySFRNTCA9ICcnO1xuXHRcdEF2YXRhckN0cmwuX3NpZGViYXJfYXZhdGFyLmFwcGVuZENoaWxkKGltZyk7XG5cblx0XHREb20uYWRkQ2xhc3MoQXZhdGFyQ3RybC5fdG9wX2F2YXRhcl9jb250YWluZXIsICctLXB1cmVzZGstdmlzaWJsZScpO1xuXHRcdHZhciBpbWdfMiA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoJ2ltZycpO1xuXHRcdGltZ18yLnNyYyA9IHVybDtcblx0XHRBdmF0YXJDdHJsLl90b3BfYXZhdGFyX2NvbnRhaW5lci5pbm5lckhUTUwgPSAnJztcblx0XHRBdmF0YXJDdHJsLl90b3BfYXZhdGFyX2NvbnRhaW5lci5hcHBlbmRDaGlsZChpbWdfMik7XG5cblx0XHQvLyAgYmFjLS1pbWFnZS1jb250YWluZXItdG9wXG5cdH1cbn07XG5cbm1vZHVsZS5leHBvcnRzID0gQXZhdGFyQ3RybDsiLCJ2YXIgU3RvcmUgPSByZXF1aXJlKCcuL3N0b3JlLmpzJyk7XG52YXIgTG9nZ2VyID0gcmVxdWlyZSgnLi9sb2dnZXInKTtcblxudmFyIENhbGxlciA9IHtcblx0LypcbiBleHBlY3RlIGF0dHJpYnV0ZXM6XG4gLSB0eXBlIChlaXRoZXIgR0VULCBQT1NULCBERUxFVEUsIFBVVClcbiAtIGVuZHBvaW50XG4gLSBwYXJhbXMgKGlmIGFueS4gQSBqc29uIHdpdGggcGFyYW1ldGVycyB0byBiZSBwYXNzZWQgYmFjayB0byB0aGUgZW5kcG9pbnQpXG4gLSBjYWxsYmFja3M6IGFuIG9iamVjdCB3aXRoOlxuIFx0LSBzdWNjZXNzOiB0aGUgc3VjY2VzcyBjYWxsYmFja1xuIFx0LSBmYWlsOiB0aGUgZmFpbCBjYWxsYmFja1xuICAqL1xuXHRtYWtlQ2FsbDogZnVuY3Rpb24gbWFrZUNhbGwoYXR0cnMpIHtcblx0XHR2YXIgZW5kcG9pbnRVcmwgPSBhdHRycy5lbmRwb2ludDtcblxuXHRcdHZhciB4aHIgPSBuZXcgWE1MSHR0cFJlcXVlc3QoKTtcblx0XHR4aHIub3BlbihhdHRycy50eXBlLCBlbmRwb2ludFVybCk7XG5cdFx0Ly94aHIud2l0aENyZWRlbnRpYWxzID0gdHJ1ZTtcblx0XHR4aHIuc2V0UmVxdWVzdEhlYWRlcignQ29udGVudC1UeXBlJywgJ2FwcGxpY2F0aW9uL2pzb24nKTtcblx0XHR4aHIub25sb2FkID0gZnVuY3Rpb24gKCkge1xuXHRcdFx0aWYgKHhoci5zdGF0dXMgPj0gMjAwICYmIHhoci5zdGF0dXMgPCAzMDApIHtcblx0XHRcdFx0YXR0cnMuY2FsbGJhY2tzLnN1Y2Nlc3MoSlNPTi5wYXJzZSh4aHIucmVzcG9uc2VUZXh0KSk7XG5cdFx0XHR9IGVsc2UgaWYgKHhoci5zdGF0dXMgIT09IDIwMCkge1xuXHRcdFx0XHRhdHRycy5jYWxsYmFja3MuZmFpbChKU09OLnBhcnNlKHhoci5yZXNwb25zZVRleHQpKTtcblx0XHRcdH1cblx0XHR9O1xuXG5cdFx0aWYgKCFhdHRycy5wYXJhbXMpIHtcblx0XHRcdGF0dHJzLnBhcmFtcyA9IHt9O1xuXHRcdH1cblx0XHR4aHIuc2VuZChKU09OLnN0cmluZ2lmeShhdHRycy5wYXJhbXMpKTtcblx0fSxcblxuXHRwcm9taXNlQ2FsbDogZnVuY3Rpb24gcHJvbWlzZUNhbGwoYXR0cnMpIHtcblx0XHRyZXR1cm4gbmV3IFByb21pc2UoZnVuY3Rpb24gKHJlc29sdmUsIHJlamVjdCkge1xuXHRcdFx0dmFyIHhociA9IG5ldyBYTUxIdHRwUmVxdWVzdCgpO1xuXHRcdFx0eGhyLm9wZW4oYXR0cnMudHlwZSwgYXR0cnMuZW5kcG9pbnQpO1xuXHRcdFx0eGhyLnNldFJlcXVlc3RIZWFkZXIoJ0NvbnRlbnQtVHlwZScsICdhcHBsaWNhdGlvbi9qc29uJyk7XG5cdFx0XHR4aHIub25sb2FkID0gZnVuY3Rpb24gKCkge1xuXHRcdFx0XHRpZiAodGhpcy5zdGF0dXMgPj0gMjAwICYmIHRoaXMuc3RhdHVzIDwgMzAwKSB7XG5cdFx0XHRcdFx0YXR0cnMubWlkZGxld2FyZXMuc3VjY2VzcyhKU09OLnBhcnNlKHhoci5yZXNwb25zZVRleHQpKTtcblx0XHRcdFx0XHRyZXNvbHZlKEpTT04ucGFyc2UoeGhyLnJlc3BvbnNlVGV4dCkpO1xuXHRcdFx0XHR9IGVsc2Uge1xuXHRcdFx0XHRcdHdpbmRvdy5sb2NhdGlvbi5ocmVmID0gU3RvcmUuZ2V0TG9naW5VcmwoKTtcblx0XHRcdFx0fVxuXHRcdFx0fTtcblx0XHRcdHhoci5vbmVycm9yID0gZnVuY3Rpb24gKCkge1xuXHRcdFx0XHR3aW5kb3cubG9jYXRpb24gPSBTdG9yZS5nZXRMb2dpblVybCgpO1xuXHRcdFx0fTtcblx0XHRcdHhoci5zZW5kKCk7XG5cdFx0fSk7XG5cdH1cbn07XG5cbm1vZHVsZS5leHBvcnRzID0gQ2FsbGVyOyIsInZhciBEb20gPSB7XG4gICAgaGFzQ2xhc3M6IGZ1bmN0aW9uIGhhc0NsYXNzKGVsLCBjbGFzc05hbWUpIHtcbiAgICAgICAgaWYgKGVsLmNsYXNzTGlzdCkgcmV0dXJuIGVsLmNsYXNzTGlzdC5jb250YWlucyhjbGFzc05hbWUpO2Vsc2UgcmV0dXJuIG5ldyBSZWdFeHAoJyhefCApJyArIGNsYXNzTmFtZSArICcoIHwkKScsICdnaScpLnRlc3QoZWwuY2xhc3NOYW1lKTtcbiAgICB9LFxuXG4gICAgcmVtb3ZlQ2xhc3M6IGZ1bmN0aW9uIHJlbW92ZUNsYXNzKGVsLCBjbGFzc05hbWUpIHtcbiAgICAgICAgaWYgKGVsLmNsYXNzTGlzdCkgZWwuY2xhc3NMaXN0LnJlbW92ZShjbGFzc05hbWUpO2Vsc2UgZWwuY2xhc3NOYW1lID0gZWwuY2xhc3NOYW1lLnJlcGxhY2UobmV3IFJlZ0V4cCgnKF58XFxcXGIpJyArIGNsYXNzTmFtZS5zcGxpdCgnICcpLmpvaW4oJ3wnKSArICcoXFxcXGJ8JCknLCAnZ2knKSwgJyAnKTtcbiAgICB9LFxuXG4gICAgYWRkQ2xhc3M6IGZ1bmN0aW9uIGFkZENsYXNzKGVsLCBjbGFzc05hbWUpIHtcbiAgICAgICAgaWYgKGVsLmNsYXNzTGlzdCkgZWwuY2xhc3NMaXN0LmFkZChjbGFzc05hbWUpO2Vsc2UgZWwuY2xhc3NOYW1lICs9ICcgJyArIGNsYXNzTmFtZTtcbiAgICB9LFxuXG4gICAgdG9nZ2xlQ2xhc3M6IGZ1bmN0aW9uIHRvZ2dsZUNsYXNzKGVsLCBjbGFzc05hbWUpIHtcbiAgICAgICAgaWYgKHRoaXMuaGFzQ2xhc3MoZWwsIGNsYXNzTmFtZSkpIHtcbiAgICAgICAgICAgIHRoaXMucmVtb3ZlQ2xhc3MoZWwsIGNsYXNzTmFtZSk7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICB0aGlzLmFkZENsYXNzKGVsLCBjbGFzc05hbWUpO1xuICAgICAgICB9XG4gICAgfVxufTtcblxubW9kdWxlLmV4cG9ydHMgPSBEb207IiwidmFyIGRvbSA9IHJlcXVpcmUoJy4vZG9tJyk7XG5cbnZhciBkZWZhdWx0SGlkZUluID0gNTAwMDtcbnZhciBsYXN0SW5kZXggPSAxO1xuXG52YXIgaW5mb0Jsb2NrcyA9IFtdO1xuXG52YXIgSW5mb0NvbnRyb2xsZXIgPSB7XG5cdGluaXQ6IGZ1bmN0aW9uIGluaXQoKSB7XG5cdFx0Zm9yICh2YXIgaSA9IDE7IGkgPCA1OyBpKyspIHtcblx0XHRcdChmdW5jdGlvbiB4KGkpIHtcblx0XHRcdFx0dmFyIGNsb3NlRnVuY3Rpb24gPSBmdW5jdGlvbiBjbG9zZUZ1bmN0aW9uKCkge1xuXHRcdFx0XHRcdGRvbS5yZW1vdmVDbGFzcyhkb2N1bWVudC5nZXRFbGVtZW50QnlJZCgnLS1wdXJlc2RrLWluZm8tYm94LS0nICsgaSksICdiYWMtLWFjdGl2ZS0tJyk7XG5cdFx0XHRcdFx0ZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoJ2JhYy0tdGltZXInICsgaSkuc3R5bGUudHJhbnNpdGlvbiA9ICcnO1xuXHRcdFx0XHRcdGRvbS5yZW1vdmVDbGFzcyhkb2N1bWVudC5nZXRFbGVtZW50QnlJZCgnYmFjLS10aW1lcicgKyBpKSwgJ2JhYy0tZnVsbHdpZHRoJyk7XG5cdFx0XHRcdFx0aW5mb0Jsb2Nrc1tpIC0gMV0uaW5Vc2UgPSBmYWxzZTtcblx0XHRcdFx0XHRzZXRUaW1lb3V0KGZ1bmN0aW9uICgpIHtcblx0XHRcdFx0XHRcdGlmIChpbmZvQmxvY2tzW2kgLSAxXS5jbG9zZVRpbWVvdXQpIHtcblx0XHRcdFx0XHRcdFx0Y2xlYXJUaW1lb3V0KGluZm9CbG9ja3NbaSAtIDFdLmNsb3NlVGltZW91dCk7XG5cdFx0XHRcdFx0XHR9XG5cdFx0XHRcdFx0XHRkb20ucmVtb3ZlQ2xhc3MoZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoJy0tcHVyZXNkay1pbmZvLWJveC0tJyArIGkpLCAnYmFjLS1zdWNjZXNzJyk7XG5cdFx0XHRcdFx0XHRkb20ucmVtb3ZlQ2xhc3MoZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoJy0tcHVyZXNkay1pbmZvLWJveC0tJyArIGkpLCAnYmFjLS1pbmZvJyk7XG5cdFx0XHRcdFx0XHRkb20ucmVtb3ZlQ2xhc3MoZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoJy0tcHVyZXNkay1pbmZvLWJveC0tJyArIGkpLCAnYmFjLS13YXJuaW5nJyk7XG5cdFx0XHRcdFx0XHRkb20ucmVtb3ZlQ2xhc3MoZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoJy0tcHVyZXNkay1pbmZvLWJveC0tJyArIGkpLCAnYmFjLS1lcnJvcicpO1xuXHRcdFx0XHRcdH0sIDQ1MCk7XG5cdFx0XHRcdH07XG5cblx0XHRcdFx0dmFyIGFkZFRleHQgPSBmdW5jdGlvbiBhZGRUZXh0KHRleHQpIHtcblx0XHRcdFx0XHRkb2N1bWVudC5nZXRFbGVtZW50QnlJZCgnYmFjLS1pbmZvLW1haW4tdGV4dC0tJyArIGkpLmlubmVySFRNTCA9IHRleHQ7XG5cdFx0XHRcdH07XG5cblx0XHRcdFx0dmFyIGFkZFRpbWVvdXQgPSBmdW5jdGlvbiBhZGRUaW1lb3V0KHRpbWVvdXRNc2Vjcykge1xuXHRcdFx0XHRcdGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKCdiYWMtLXRpbWVyJyArIGkpLnN0eWxlLnRyYW5zaXRpb24gPSAnd2lkdGggJyArIHRpbWVvdXRNc2VjcyArICdtcyc7XG5cdFx0XHRcdFx0ZG9tLmFkZENsYXNzKGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKCdiYWMtLXRpbWVyJyArIGkpLCAnYmFjLS1mdWxsd2lkdGgnKTtcblx0XHRcdFx0XHRpbmZvQmxvY2tzW2kgLSAxXS5jbG9zZVRpbWVvdXQgPSBzZXRUaW1lb3V0KGZ1bmN0aW9uICgpIHtcblx0XHRcdFx0XHRcdGluZm9CbG9ja3NbaSAtIDFdLmNsb3NlRnVuY3Rpb24oKTtcblx0XHRcdFx0XHR9LCB0aW1lb3V0TXNlY3MpO1xuXHRcdFx0XHR9O1xuXG5cdFx0XHRcdGluZm9CbG9ja3MucHVzaCh7XG5cdFx0XHRcdFx0aWQ6IGksXG5cdFx0XHRcdFx0aW5Vc2U6IGZhbHNlLFxuXHRcdFx0XHRcdGVsZW1lbnQ6IGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKCctLXB1cmVzZGstaW5mby1ib3gtLScgKyBpKSxcblx0XHRcdFx0XHRjbG9zZUZ1bmN0aW9uOiBjbG9zZUZ1bmN0aW9uLFxuXHRcdFx0XHRcdGFkZFRleHQ6IGFkZFRleHQsXG5cdFx0XHRcdFx0YWRkVGltZW91dDogYWRkVGltZW91dCxcblx0XHRcdFx0XHRjbG9zZVRpbWVvdXQ6IGZhbHNlXG5cdFx0XHRcdH0pO1xuXHRcdFx0XHRkb2N1bWVudC5nZXRFbGVtZW50QnlJZCgnYmFjLS1pbmZvLWNsb3NlLWJ1dHRvbi0tJyArIGkpLm9uY2xpY2sgPSBmdW5jdGlvbiAoZSkge1xuXHRcdFx0XHRcdGNsb3NlRnVuY3Rpb24oaSk7XG5cdFx0XHRcdH07XG5cdFx0XHR9KShpKTtcblx0XHR9XG5cdH0sXG5cblx0LypcbiAgdHlwZTogb25lIG9mOlxuIFx0LSBzdWNjZXNzXG4gXHQtIGluZm9cbiBcdC0gd2FybmluZ1xuIFx0LSBlcnJvclxuICB0ZXh0OiB0aGUgdGV4dCB0byBkaXNwbGF5XG4gIG9wdGlvbnMgKG9wdGlvbmFsKToge1xuICBcdFx0aGlkZUluOiBtaWxsaXNlY29uZHMgdG8gaGlkZSBpdC4gLTEgZm9yIG5vdCBoaWRpbmcgaXQgYXQgYWxsLiBEZWZhdWx0IGlzIDUwMDBcbiAgfVxuICAqL1xuXHRzaG93SW5mbzogZnVuY3Rpb24gc2hvd0luZm8odHlwZSwgdGV4dCwgb3B0aW9ucykge1xuXHRcdGZvciAodmFyIGkgPSAwOyBpIDwgaW5mb0Jsb2Nrcy5sZW5ndGg7IGkrKykge1xuXHRcdFx0dmFyIGluZm9CbG9jayA9IGluZm9CbG9ja3NbaV07XG5cdFx0XHRpZiAoIWluZm9CbG9jay5pblVzZSkge1xuXHRcdFx0XHRpbmZvQmxvY2suaW5Vc2UgPSB0cnVlO1xuXHRcdFx0XHRpbmZvQmxvY2suZWxlbWVudC5zdHlsZS56SW5kZXggPSBsYXN0SW5kZXg7XG5cdFx0XHRcdGluZm9CbG9jay5hZGRUZXh0KHRleHQpO1xuXHRcdFx0XHRsYXN0SW5kZXggKz0gMTtcblx0XHRcdFx0dmFyIHRpbWVvdXRtU2VjcyA9IGRlZmF1bHRIaWRlSW47XG5cdFx0XHRcdHZhciBhdXRvQ2xvc2UgPSB0cnVlO1xuXHRcdFx0XHRpZiAob3B0aW9ucykge1xuXHRcdFx0XHRcdGlmIChvcHRpb25zLmhpZGVJbiAhPSBudWxsICYmIG9wdGlvbnMuaGlkZUluICE9IHVuZGVmaW5lZCAmJiBvcHRpb25zLmhpZGVJbiAhPSAtMSkge1xuXHRcdFx0XHRcdFx0dGltZW91dG1TZWNzID0gb3B0aW9ucy5oaWRlSW47XG5cdFx0XHRcdFx0fSBlbHNlIGlmIChvcHRpb25zLmhpZGVJbiA9PT0gLTEpIHtcblx0XHRcdFx0XHRcdGF1dG9DbG9zZSA9IGZhbHNlO1xuXHRcdFx0XHRcdH1cblx0XHRcdFx0fVxuXHRcdFx0XHRpZiAoYXV0b0Nsb3NlKSB7XG5cdFx0XHRcdFx0aW5mb0Jsb2NrLmFkZFRpbWVvdXQodGltZW91dG1TZWNzKTtcblx0XHRcdFx0fVxuXHRcdFx0XHRkb20uYWRkQ2xhc3MoaW5mb0Jsb2NrLmVsZW1lbnQsICdiYWMtLScgKyB0eXBlKTtcblx0XHRcdFx0ZG9tLmFkZENsYXNzKGluZm9CbG9jay5lbGVtZW50LCAnYmFjLS1hY3RpdmUtLScpO1xuXHRcdFx0XHRyZXR1cm47XG5cdFx0XHR9XG5cdFx0fVxuXHR9XG59O1xuXG5tb2R1bGUuZXhwb3J0cyA9IEluZm9Db250cm9sbGVyOyIsInZhciBTdG9yZSA9IHJlcXVpcmUoJy4vc3RvcmUuanMnKTtcblxudmFyIExvZ2dlciA9IHtcblx0XHRsb2c6IGZ1bmN0aW9uIGxvZyh3aGF0KSB7XG5cdFx0XHRcdGlmICghU3RvcmUubG9nc0VuYWJsZWQoKSkge1xuXHRcdFx0XHRcdFx0cmV0dXJuIGZhbHNlO1xuXHRcdFx0XHR9IGVsc2Uge1xuXHRcdFx0XHRcdFx0TG9nZ2VyLmxvZyA9IGNvbnNvbGUubG9nLmJpbmQoY29uc29sZSk7XG5cdFx0XHRcdFx0XHRMb2dnZXIubG9nKHdoYXQpO1xuXHRcdFx0XHR9XG5cdFx0fSxcblx0XHRlcnJvcjogZnVuY3Rpb24gZXJyb3IoZXJyKSB7XG5cdFx0XHRcdGlmICghU3RvcmUubG9nc0VuYWJsZWQoKSkge1xuXHRcdFx0XHRcdFx0cmV0dXJuIGZhbHNlO1xuXHRcdFx0XHR9IGVsc2Uge1xuXHRcdFx0XHRcdFx0TG9nZ2VyLmVycm9yID0gY29uc29sZS5lcnJvci5iaW5kKGNvbnNvbGUpO1xuXHRcdFx0XHRcdFx0TG9nZ2VyLmVycm9yKGVycik7XG5cdFx0XHRcdH1cblx0XHR9XG59O1xuXG5tb2R1bGUuZXhwb3J0cyA9IExvZ2dlcjsiLCIndXNlIHN0cmljdCc7XG5cbnZhciBTdG9yZSA9IHJlcXVpcmUoJy4vc3RvcmUuanMnKTtcbnZhciBMb2dnZXIgPSByZXF1aXJlKCcuL2xvZ2dlci5qcycpO1xuXG52YXIgYXZhaWxhYmxlTGlzdGVuZXJzID0ge1xuXHRzZWFyY2hLZXlVcDoge1xuXHRcdGluZm86ICdMaXN0ZW5lciBvbiBrZXlVcCBvZiBzZWFyY2ggaW5wdXQgb24gdG9wIGJhcidcblx0fSxcblx0c2VhcmNoRW50ZXI6IHtcblx0XHRpbmZvOiAnTGlzdGVuZXIgb24gZW50ZXIga2V5IHByZXNzZWQgb24gc2VhcmNoIGlucHV0IG9uIHRvcCBiYXInXG5cdH0sXG5cdHNlYXJjaE9uQ2hhbmdlOiB7XG5cdFx0aW5mbzogJ0xpc3RlbmVyIG9uIGNoYW5nZSBvZiBpbnB1dCB2YWx1ZSdcblx0fVxufTtcblxudmFyIFB1YlN1YiA9IHtcblx0Z2V0QXZhaWxhYmxlTGlzdGVuZXJzOiBmdW5jdGlvbiBnZXRBdmFpbGFibGVMaXN0ZW5lcnMoKSB7XG5cdFx0cmV0dXJuIGF2YWlsYWJsZUxpc3RlbmVycztcblx0fSxcblxuXHRzdWJzY3JpYmU6IGZ1bmN0aW9uIHN1YnNjcmliZShldmVudHQsIGZ1bmN0KSB7XG5cdFx0aWYgKGV2ZW50dCA9PT0gXCJzZWFyY2hLZXlVcFwiKSB7XG5cdFx0XHR2YXIgZWwgPSBkb2N1bWVudC5nZXRFbGVtZW50QnlJZChTdG9yZS5nZXRTZWFyY2hJbnB1dElkKCkpO1xuXHRcdFx0ZWwuYWRkRXZlbnRMaXN0ZW5lcigna2V5dXAnLCBmdW5jdCk7XG5cdFx0XHRyZXR1cm4gZnVuY3Rpb24gKCkge1xuXHRcdFx0XHRlbC5yZW1vdmVFdmVudExpc3RlbmVyKCdrZXl1cCcsIGZ1bmN0LCBmYWxzZSk7XG5cdFx0XHR9O1xuXHRcdH0gZWxzZSBpZiAoZXZlbnR0ID09PSAnc2VhcmNoRW50ZXInKSB7XG5cdFx0XHR2YXIgaGFuZGxpbmdGdW5jdCA9IGZ1bmN0aW9uIGhhbmRsaW5nRnVuY3QoZSkge1xuXHRcdFx0XHRpZiAoZS5rZXlDb2RlID09PSAxMykge1xuXHRcdFx0XHRcdGZ1bmN0KGUpO1xuXHRcdFx0XHR9XG5cdFx0XHR9O1xuXHRcdFx0ZWwuYWRkRXZlbnRMaXN0ZW5lcigna2V5ZG93bicsIGhhbmRsaW5nRnVuY3QpO1xuXHRcdFx0cmV0dXJuIGZ1bmN0aW9uICgpIHtcblx0XHRcdFx0ZWwucmVtb3ZlRXZlbnRMaXN0ZW5lcigna2V5ZG93bicsIGhhbmRsaW5nRnVuY3QsIGZhbHNlKTtcblx0XHRcdH07XG5cdFx0fSBlbHNlIGlmIChldmVudHQgPT09ICdzZWFyY2hPbkNoYW5nZScpIHtcblx0XHRcdHZhciBlbCA9IGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKFN0b3JlLmdldFNlYXJjaElucHV0SWQoKSk7XG5cdFx0XHRlbC5hZGRFdmVudExpc3RlbmVyKCdjaGFuZ2UnLCBmdW5jdCk7XG5cdFx0XHRyZXR1cm4gZnVuY3Rpb24gKCkge1xuXHRcdFx0XHRlbC5yZW1vdmVFdmVudExpc3RlbmVyKCdrZXl1cCcsIGZ1bmN0LCBmYWxzZSk7XG5cdFx0XHR9O1xuXHRcdH0gZWxzZSB7XG5cdFx0XHRMb2dnZXIuZXJyb3IoJ1RoZSBldmVudCB5b3UgdHJpZWQgdG8gc3Vic2NyaWJlIGlzIG5vdCBhdmFpbGFibGUgYnkgdGhlIGxpYnJhcnknKTtcblx0XHRcdExvZ2dlci5sb2coJ1RoZSBhdmFpbGFibGUgZXZlbnRzIGFyZTogJywgYXZhaWxhYmxlTGlzdGVuZXJzKTtcblx0XHRcdHJldHVybiBmdW5jdGlvbiAoKSB7fTtcblx0XHR9XG5cdH1cbn07XG5cbm1vZHVsZS5leHBvcnRzID0gUHViU3ViOyIsInZhciBzdGF0ZSA9IHtcblx0Z2VuZXJhbDoge30sXG5cdHVzZXJEYXRhOiB7fSxcblx0Y29uZmlndXJhdGlvbjoge30sXG5cdGh0bWxUZW1wbGF0ZTogXCJcIixcblx0YXBwczogbnVsbCxcblx0dmVyc2lvbk51bWJlcjogJydcbn07XG5cbmZ1bmN0aW9uIGFzc2VtYmxlKGxpdGVyYWwsIHBhcmFtcykge1xuXHRyZXR1cm4gbmV3IEZ1bmN0aW9uKHBhcmFtcywgXCJyZXR1cm4gYFwiICsgbGl0ZXJhbCArIFwiYDtcIik7XG59XG5cbnZhciBTdG9yZSA9IHtcblx0Z2V0U3RhdGU6IGZ1bmN0aW9uIGdldFN0YXRlKCkge1xuXHRcdHJldHVybiBPYmplY3QuYXNzaWduKHt9LCBzdGF0ZSk7XG5cdH0sXG5cblx0c2V0V2luZG93TmFtZTogZnVuY3Rpb24gc2V0V2luZG93TmFtZSh3bikge1xuXHRcdHN0YXRlLmdlbmVyYWwud2luZG93TmFtZSA9IHduO1xuXHR9LFxuXG5cdC8qXG4gIGNvbmY6XG4gIC0gaGVhZGVyRGl2SWRcbiAgLSBpbmNsdWRlQXBwc01lbnVcbiAgKi9cblx0c2V0Q29uZmlndXJhdGlvbjogZnVuY3Rpb24gc2V0Q29uZmlndXJhdGlvbihjb25mKSB7XG5cdFx0c3RhdGUuY29uZmlndXJhdGlvbiA9IGNvbmY7XG5cdH0sXG5cblx0c2V0VmVyc2lvbk51bWJlcjogZnVuY3Rpb24gc2V0VmVyc2lvbk51bWJlcih2ZXJzaW9uKSB7XG5cdFx0c3RhdGUudmVyc2lvbk51bWJlciA9IHZlcnNpb247XG5cdH0sXG5cblx0Z2V0VmVyc2lvbk51bWJlcjogZnVuY3Rpb24gZ2V0VmVyc2lvbk51bWJlcigpIHtcblx0XHRyZXR1cm4gc3RhdGUudmVyc2lvbk51bWJlcjtcblx0fSxcblxuXHRnZXRBcHBzVmlzaWJsZTogZnVuY3Rpb24gZ2V0QXBwc1Zpc2libGUoKSB7XG5cdFx0aWYgKHN0YXRlLmNvbmZpZ3VyYXRpb24uYXBwc1Zpc2libGUgPT09IG51bGwgfHwgc3RhdGUuY29uZmlndXJhdGlvbi5hcHBzVmlzaWJsZSA9PT0gdW5kZWZpbmVkKSB7XG5cdFx0XHRyZXR1cm4gdHJ1ZTtcblx0XHR9IGVsc2Uge1xuXHRcdFx0cmV0dXJuIHN0YXRlLmNvbmZpZ3VyYXRpb24uYXBwc1Zpc2libGU7XG5cdFx0fVxuXHR9LFxuXG5cdHNldEFwcHNWaXNpYmxlOiBmdW5jdGlvbiBzZXRBcHBzVmlzaWJsZShhcHBzVmlzaWJsZSkge1xuXHRcdHN0YXRlLmNvbmZpZ3VyYXRpb24uYXBwc1Zpc2libGUgPSBhcHBzVmlzaWJsZTtcblx0fSxcblxuXHRzZXRIVE1MVGVtcGxhdGU6IGZ1bmN0aW9uIHNldEhUTUxUZW1wbGF0ZSh0ZW1wbGF0ZSkge1xuXHRcdHN0YXRlLmh0bWxUZW1wbGF0ZSA9IHRlbXBsYXRlO1xuXHR9LFxuXG5cdHNldEFwcHM6IGZ1bmN0aW9uIHNldEFwcHMoYXBwcykge1xuXHRcdHN0YXRlLmFwcHMgPSBhcHBzO1xuXHR9LFxuXG5cdGdldExvZ2luVXJsOiBmdW5jdGlvbiBnZXRMb2dpblVybCgpIHtcblx0XHRyZXR1cm4gc3RhdGUuY29uZmlndXJhdGlvbi5yb290VXJsICsgc3RhdGUuY29uZmlndXJhdGlvbi5sb2dpblVybCArIFwiP1wiICsgc3RhdGUuY29uZmlndXJhdGlvbi5yZWRpcmVjdFVybFBhcmFtICsgXCI9XCIgKyB3aW5kb3cubG9jYXRpb24uaHJlZjtcblx0fSxcblxuXHRnZXRBdXRoZW50aWNhdGlvbkVuZHBvaW50OiBmdW5jdGlvbiBnZXRBdXRoZW50aWNhdGlvbkVuZHBvaW50KCkge1xuXHRcdHJldHVybiBzdGF0ZS5jb25maWd1cmF0aW9uLnJvb3RVcmwgKyBzdGF0ZS5jb25maWd1cmF0aW9uLmJhc2VVcmwgKyAnc2Vzc2lvbic7XG5cdH0sXG5cblx0Z2V0U3dpdGNoQWNjb3VudEVuZHBvaW50OiBmdW5jdGlvbiBnZXRTd2l0Y2hBY2NvdW50RW5kcG9pbnQoYWNjb3VudElkKSB7XG5cdFx0cmV0dXJuIHN0YXRlLmNvbmZpZ3VyYXRpb24ucm9vdFVybCArIHN0YXRlLmNvbmZpZ3VyYXRpb24uYmFzZVVybCArICdhY2NvdW50cy9zd2l0Y2gvJyArIGFjY291bnRJZDtcblx0fSxcblxuXHRnZXRBcHBzRW5kcG9pbnQ6IGZ1bmN0aW9uIGdldEFwcHNFbmRwb2ludCgpIHtcblx0XHRyZXR1cm4gc3RhdGUuY29uZmlndXJhdGlvbi5yb290VXJsICsgc3RhdGUuY29uZmlndXJhdGlvbi5iYXNlVXJsICsgJ2FwcHMnO1xuXHR9LFxuXG5cdGxvZ3NFbmFibGVkOiBmdW5jdGlvbiBsb2dzRW5hYmxlZCgpIHtcblx0XHRyZXR1cm4gc3RhdGUuY29uZmlndXJhdGlvbi5sb2dzO1xuXHR9LFxuXG5cdGdldFNlYXJjaElucHV0SWQ6IGZ1bmN0aW9uIGdldFNlYXJjaElucHV0SWQoKSB7XG5cdFx0cmV0dXJuIHN0YXRlLmNvbmZpZ3VyYXRpb24uc2VhcmNoSW5wdXRJZDtcblx0fSxcblxuXHRzZXRIVE1MQ29udGFpbmVyOiBmdW5jdGlvbiBzZXRIVE1MQ29udGFpbmVyKGlkKSB7XG5cdFx0c3RhdGUuY29uZmlndXJhdGlvbi5oZWFkZXJEaXZJZCA9IGlkO1xuXHR9LFxuXG5cdGdldEhUTE1Db250YWluZXI6IGZ1bmN0aW9uIGdldEhUTE1Db250YWluZXIoKSB7XG5cdFx0aWYgKHN0YXRlLmNvbmZpZ3VyYXRpb24uaGVhZGVyRGl2SWQpIHtcblx0XHRcdHJldHVybiBzdGF0ZS5jb25maWd1cmF0aW9uLmhlYWRlckRpdklkO1xuXHRcdH0gZWxzZSB7XG5cdFx0XHRyZXR1cm4gXCJwcHNkay1jb250YWluZXJcIjtcblx0XHR9XG5cdH0sXG5cblx0Z2V0SFRNTDogZnVuY3Rpb24gZ2V0SFRNTCgpIHtcblx0XHRyZXR1cm4gc3RhdGUuaHRtbFRlbXBsYXRlO1xuXHR9LFxuXG5cdGdldFdpbmRvd05hbWU6IGZ1bmN0aW9uIGdldFdpbmRvd05hbWUoKSB7XG5cdFx0cmV0dXJuIHN0YXRlLmdlbmVyYWwud2luZG93TmFtZTtcblx0fSxcblxuXHRzZXRVc2VyRGF0YTogZnVuY3Rpb24gc2V0VXNlckRhdGEodXNlckRhdGEpIHtcblx0XHRzdGF0ZS51c2VyRGF0YSA9IHVzZXJEYXRhO1xuXHR9LFxuXG5cdGdldFVzZXJEYXRhOiBmdW5jdGlvbiBnZXRVc2VyRGF0YSgpIHtcblx0XHRyZXR1cm4gc3RhdGUudXNlckRhdGE7XG5cdH0sXG5cblx0c2V0Um9vdFVybDogZnVuY3Rpb24gc2V0Um9vdFVybChyb290VXJsKSB7XG5cdFx0c3RhdGUuY29uZmlndXJhdGlvbi5yb290VXJsID0gcm9vdFVybDtcblx0fSxcblxuXHRnZXRBdmF0YXJVcGxvYWRVcmw6IGZ1bmN0aW9uIGdldEF2YXRhclVwbG9hZFVybCgpIHtcblx0XHRyZXR1cm4gc3RhdGUuY29uZmlndXJhdGlvbi5yb290VXJsICsgc3RhdGUuY29uZmlndXJhdGlvbi5iYXNlVXJsICsgJ2Fzc2V0cy91cGxvYWQnO1xuXHR9LFxuXG5cdGdldEF2YXRhclVwZGF0ZVVybDogZnVuY3Rpb24gZ2V0QXZhdGFyVXBkYXRlVXJsKCkge1xuXHRcdHJldHVybiBzdGF0ZS5jb25maWd1cmF0aW9uLnJvb3RVcmwgKyBzdGF0ZS5jb25maWd1cmF0aW9uLmJhc2VVcmwgKyAndXNlcnMvYXZhdGFyJztcblx0fVxufTtcblxubW9kdWxlLmV4cG9ydHMgPSBTdG9yZTsiXX0=
