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
			return '\n\t\t\t\t<div class="bac--user-list-item-image">\n\t\t\t\t\t<img src="' + account.sdk_square_logo_icon + '" alt="">\n\t\t\t\t</div>\n\t\t\t\t<div class="bac-user-app-details">\n\t\t\t\t\t <span>' + account.name + '</span>\n\t\t\t\t\t <span>15 team members</span>\n\t\t\t\t</div>\n\t\t\t';
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
 * version: 2.3.5
 * date: 2017-05-31
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
ppba.setHTMLTemplate('<header class="bac--header-apps" id="--puresdk-bac--header-apps--">\n    <div class="bac--container">\n        <div class="bac--logo" id="--puresdk-account-logo--"></div>\n        <div class="bac--user-actions">\n            <svg id="--puresdk--loader--" width="38" height="38" viewBox="0 0 44 44" xmlns="http://www.w3.org/2000/svg" stroke="#fff" style="\n    margin-right: 10px;\n">\n                <g fill="none" fill-rule="evenodd" stroke-width="2">\n                    <circle cx="22" cy="22" r="16.6437">\n                        <animate attributeName="r" begin="0s" dur="1.8s" values="1; 20" calcMode="spline" keyTimes="0; 1" keySplines="0.165, 0.84, 0.44, 1" repeatCount="indefinite"></animate>\n                        <animate attributeName="stroke-opacity" begin="0s" dur="1.8s" values="1; 0" calcMode="spline" keyTimes="0; 1" keySplines="0.3, 0.61, 0.355, 1" repeatCount="indefinite"></animate>\n                    </circle>\n                    <circle cx="22" cy="22" r="19.9282">\n                        <animate attributeName="r" begin="-0.9s" dur="1.8s" values="1; 20" calcMode="spline" keyTimes="0; 1" keySplines="0.165, 0.84, 0.44, 1" repeatCount="indefinite"></animate>\n                        <animate attributeName="stroke-opacity" begin="-0.9s" dur="1.8s" values="1; 0" calcMode="spline" keyTimes="0; 1" keySplines="0.3, 0.61, 0.355, 1" repeatCount="indefinite"></animate>\n                    </circle>\n                </g>\n            </svg>\n            <div class="bac--user-apps" id="--puresdk-apps-section--">\n                <div id="--puresdk--apps--opener--">\n                    <i class="fa fa-squares" id="--puresdk-apps-icon--"></i>\n                    <div class="--puresdk-apps-name--">apps</div>\n                </div>\n                <div class="bac--apps-container" id="--puresdk-apps-container--">\n                    <div class="bac--apps-arrow"></div>\n                </div>\n            </div>\n            <!--<div class="bac&#45;&#45;user-notifications">-->\n                <!--<div class="bac&#45;&#45;user-notifications-count">1</div>-->\n                <!--<i class="fa fa-bell-o"></i>-->\n            <!--</div>-->\n            <div class="bac--user-avatar" id="bac--user-avatar-top">\n                <span class="bac--user-avatar-name" id="--puresdk-user-avatar--"></span>\n                <div id="bac--image-container-top"></div>\n            </div>\n        </div>\n    </div>\n    <div id="bac--info-blocks-wrapper--"></div>\n</header>\n<div class="bac--user-sidebar" id="--puresdk-user-sidebar--">\n    <div id="--puresdk-user-details--"></div>\n    <!--<div class="bac&#45;&#45;user-sidebar-info">-->\n        <!--<div class="bac&#45;&#45;user-image"><i class="fa fa-camera"></i></div>-->\n        <!--<div class="bac&#45;&#45;user-name">Curtis Bartlett</div>-->\n        <!--<div class="bac&#45;&#45;user-email">cbartlett@pureprofile.com</div>-->\n    <!--</div>-->\n    <div class="bac--user-apps" id="--puresdk-user-businesses--">\n        <!--<div class="bac&#45;&#45;user-list-item">-->\n            <!--<img src="http://lorempixel.com/40/40" alt="">-->\n            <!--<div class="bac-user-app-details">-->\n                <!--<span></span>-->\n                <!--<span>15 team members</span>-->\n            <!--</div>-->\n        <!--</div>-->\n    </div>\n    <div class="bac--user-account-settings">\n        <!--<div class="bac-user-acount-list-item">-->\n            <!--<i class="fa fa-cog-line"></i>-->\n            <!--<a href="#">Account Security</a>-->\n        <!--</div>-->\n        <div class="bac-user-acount-list-item">\n            <i class="fa fa-login-line"></i>\n            <a href="/api/v1/sign-off">Log out</a>\n        </div>\n    </div>\n</div>\n<input style="display:none" type=\'file\' id=\'---puresdk-avatar-file\'>\n<input style="display:none" type=\'button\' id=\'---puresdk-avatar-submit\' value=\'Upload!\'>');

window.PURESDK = ppba;

var css = 'html,body,div,span,applet,object,iframe,h1,h2,h3,h4,h5,h6,p,blockquote,pre,a,abbr,acronym,address,big,cite,code,del,dfn,em,img,ins,kbd,q,s,samp,small,strike,strong,sub,sup,tt,var,b,u,i,center,dl,dt,dd,ol,ul,li,fieldset,form,label,legend,table,caption,tbody,tfoot,thead,tr,th,td,article,aside,canvas,details,embed,figure,figcaption,footer,header,hgroup,menu,nav,output,ruby,section,summary,time,mark,audio,video{margin:0;padding:0;border:0;font-size:100%;font:inherit;vertical-align:baseline}article,aside,details,figcaption,figure,footer,header,hgroup,menu,nav,section{display:block}body{line-height:1}ol,ul{list-style:none}blockquote,q{quotes:none}blockquote:before,blockquote:after,q:before,q:after{content:"";content:none}table{border-collapse:collapse;border-spacing:0}body{overflow-x:hidden}#bac-wrapper{font-family:"Verdana", arial, sans-serif;color:white;min-height:100vh;position:relative}.bac--container{max-width:1160px;margin:0 auto}.bac--header-apps{position:absolute;width:100%;height:50px;background-color:#475369;padding:5px 0;z-index:9999999}.bac--header-apps .bac--container{height:100%;display:flex;align-items:center;justify-content:space-between}.bac--header-search{position:relative}.bac--header-search input{color:#fff;font-size:14px;height:35px;background-color:#6b7586;padding:0 5px 0 10px;border:none;border-radius:3px;min-width:400px;width:100%}.bac--header-search input:focus{outline:none}.bac--header-search input::-webkit-input-placeholder{font-style:normal !important;text-align:center;color:#fff;font-size:14px;font-weight:300;letter-spacing:0.5px}.bac--header-search input::-moz-placeholder{font-style:normal !important;text-align:center;color:#fff;font-size:14px;font-weight:300;letter-spacing:0.5px}.bac--header-search input:-ms-input-placeholder{font-style:normal !important;text-align:center;color:#fff;font-size:14px;font-weight:300;letter-spacing:0.5px}.bac--header-search i{position:absolute;top:8px;right:10px}.bac--user-actions{display:flex;align-items:center}.bac--user-actions>div{cursor:pointer;color:white}.bac--user-actions .bac--user-notifications{position:relative}.bac--user-actions .bac--user-notifications i{font-size:20px}.bac--user-actions #--puresdk--loader--{display:none}.bac--user-actions #--puresdk--loader--.--puresdk-visible{display:block}.bac--user-actions .bac--user-notifications-count{position:absolute;display:inline-block;height:15px;width:15px;line-height:15px;color:#fff;font-size:10px;text-align:center;background-color:#fc3b30;border-radius:50%;top:-5px;left:-5px}.bac--user-actions .bac--user-avatar,.bac--user-actions .bac--user-notifications{margin-left:20px}.bac--user-actions .bac--user-avatar{position:relative;overflow:hidden;border-radius:50%}.bac--user-actions .bac--user-avatar #bac--image-container-top{width:100%;heigth:100%;position:absolute;top:0;left:0;z-index:1;display:none}.bac--user-actions .bac--user-avatar #bac--image-container-top img{width:100%;height:100%}.bac--user-actions .bac--user-avatar #bac--image-container-top.--puresdk-visible{display:block}.bac--user-actions .bac--user-avatar-name{color:#fff;background-color:#adadad;display:inline-block;height:30px;width:30px;line-height:30px;text-align:center;font-size:14px}.bac--user-apps{position:relative}.bac--user-apps #--puresdk-apps-icon--{width:20px;display:inline-block;text-align:center}.bac--user-apps .--puresdk-apps-name--{font-size:8px;width:20px;text-align:center}#--puresdk-user-businesses--{height:calc(100vh - 458px);overflow:auto}.bac--apps-container{background:#fff;position:absolute;top:45px;right:-40px;display:flex;width:360px;flex-wrap:wrap;border-radius:10px;padding:30px;justify-content:space-between;text-align:center;-webkit-box-shadow:0 0 10px 2px rgba(0,0,0,0.2);box-shadow:0 0 10px 2px rgba(0,0,0,0.2);opacity:0;visibility:hidden;transition:all 0.4s ease}.bac--apps-container.active{opacity:1;visibility:visible}.bac--apps-container .bac--apps-arrow{position:absolute;display:block;height:20px;width:20px;top:-10px;right:36px;background:#fff;transform:rotate(-45deg);z-index:1}.bac--apps-container .bac--apps{width:32%;display:flex;font-size:30px;margin-bottom:40px;text-align:center;justify-content:center;flex-wrap:wrap}.bac--apps-container .bac--apps a{display:block;color:#fff;text-decoration:none;width:65px;height:65px;padding-top:3px;line-height:65px;text-align:center;border-radius:10px;-webkit-box-shadow:0 0 5px 0 rgba(0,0,0,0.2);box-shadow:0 0 5px 0 rgba(0,0,0,0.2)}.bac--apps-container .bac--apps .bac--app-name{width:100%;color:#000;font-size:14px;padding:10px 0 5px 0}.bac--apps-container .bac--apps .bac--app-description{color:#919191;font-size:12px;font-style:italic;line-height:1.3em}.bac--user-sidebar{font-family:"Verdana", arial, sans-serif;color:white;height:calc(100vh - 50px);background-color:#515f77;box-sizing:border-box;width:320px;position:absolute;top:0;right:0;z-index:999999;padding-top:10px;opacity:0;margin-top:50px;transform:translateX(100%);transition:all 0.4s ease}.bac--user-sidebar.active{opacity:1;transform:translateX(0%)}.bac--user-sidebar .bac--user-list-item{display:flex;cursor:pointer;align-items:center;padding:10px 10px 10px 40px;border-bottom:2px solid #6b7586}.bac--user-sidebar .bac--user-list-item:hover{background-color:#6b7586}.bac--user-sidebar .bac--user-list-item .bac--user-list-item-image{width:40px;height:40px;border-radius:3px;border:2px solid #fff;margin-right:20px;display:flex;align-items:center;justify-content:center}.bac--user-sidebar .bac--user-list-item .bac--user-list-item-image>img{width:auto;height:auto;max-width:100%;max-height:100%}.bac--user-sidebar .bac--user-list-item span{width:100%;display:block;margin-bottom:5px}.bac--user-sidebar .bac-user-app-details span{font-size:12px}.bac--user-sidebar-info{display:flex;justify-content:center;flex-wrap:wrap;text-align:center;padding:10px 20px 15px}.bac--user-sidebar-info .bac--user-image{border:1px #adadad solid;overflow:hidden;border-radius:50%;position:relative;cursor:pointer;display:inline-block;height:80px;width:80px;line-height:80px;text-align:center;color:#fff;border-radius:50%;background-color:#adadad;margin-bottom:15px}.bac--user-sidebar-info .bac--user-image #bac--user-image-file{display:none;position:absolute;z-index:1;top:0;left:0;width:100%;height:100%}.bac--user-sidebar-info .bac--user-image #bac--user-image-file img{width:100%;height:100%}.bac--user-sidebar-info .bac--user-image #bac--user-image-file.--puresdk-visible{display:block}.bac--user-sidebar-info .bac--user-image #bac--user-image-upload-progress{position:absolute;padding-top:10px;top:0;background:#666;z-index:4;display:none;width:100%;height:100%}.bac--user-sidebar-info .bac--user-image #bac--user-image-upload-progress.--puresdk-visible{display:block}.bac--user-sidebar-info .bac--user-image i{font-size:32px;font-size:32px;z-index:0;position:absolute;width:100%;left:0;background-color:rgba(0,0,0,0.5)}.bac--user-sidebar-info .bac--user-image:hover i{z-index:3}.bac--user-sidebar-info .bac--user-name{width:100%;text-align:center;font-size:18px;margin-bottom:10px}.bac--user-sidebar-info .bac--user-email{font-size:12px;font-weight:300}.bac--user-account-settings{padding:50px}.bac--user-account-settings .bac-user-acount-list-item{display:flex;align-items:center;margin-bottom:30px}.bac--user-account-settings .bac-user-acount-list-item a{text-decoration:none;color:#fff}.bac--user-account-settings .bac-user-acount-list-item i{font-size:24px;margin-right:20px}#--puresdk-account-logo--{cursor:pointer}#bac--info-blocks-wrapper--{position:relative}#bac--info-blocks-wrapper-- .--puresdk-info-box--{border-radius:0 0 3px 3px;overflow:hidden;z-index:99999999;position:fixed;top:-41px;width:470px;left:calc(50vw - 235px);height:40px;-webkit-transition:top 0.4s;transition:top 0.4s}#bac--info-blocks-wrapper-- .--puresdk-info-box--.bac--success{background:#14DA9E}#bac--info-blocks-wrapper-- .--puresdk-info-box--.bac--success .bac--inner-info-box-- div.bac--info-icon--.fa-success{display:inline-block}#bac--info-blocks-wrapper-- .--puresdk-info-box--.bac--info{background-color:#5BC0DE}#bac--info-blocks-wrapper-- .--puresdk-info-box--.bac--info .bac--inner-info-box-- div.bac--info-icon--.fa-info-1{display:inline-block}#bac--info-blocks-wrapper-- .--puresdk-info-box--.bac--warning{background:#F0AD4E}#bac--info-blocks-wrapper-- .--puresdk-info-box--.bac--warning .bac--inner-info-box-- div.bac--info-icon--.fa-warning{display:inline-block}#bac--info-blocks-wrapper-- .--puresdk-info-box--.bac--error{background:#EF4100}#bac--info-blocks-wrapper-- .--puresdk-info-box--.bac--error .bac--inner-info-box-- div.bac--info-icon--.fa-error{display:inline-block}#bac--info-blocks-wrapper-- .--puresdk-info-box-- .bac--timer{-webkit-transition-timing-function:linear;transition-timing-function:linear;position:absolute;bottom:0px;opacity:0.5;height:2px !important;background:white;width:0%}#bac--info-blocks-wrapper-- .--puresdk-info-box-- .bac--timer.bac--fullwidth{width:100%}#bac--info-blocks-wrapper-- .--puresdk-info-box--.bac--active--{top:0px}#bac--info-blocks-wrapper-- .--puresdk-info-box-- .bac--inner-info-box--{width:100%;padding:11px 15px;color:white}#bac--info-blocks-wrapper-- .--puresdk-info-box-- .bac--inner-info-box-- div{display:inline-block;height:18px;position:relative}#bac--info-blocks-wrapper-- .--puresdk-info-box-- .bac--inner-info-box-- div.bac--info-icon--{display:none;top:0px}#bac--info-blocks-wrapper-- .--puresdk-info-box-- .bac--inner-info-box-- .bac--info-icon--{margin-right:15px;width:10px;top:2px}#bac--info-blocks-wrapper-- .--puresdk-info-box-- .bac--inner-info-box-- .bac--info-main-text--{width:380px;margin-right:15px;font-size:12px;text-align:center}#bac--info-blocks-wrapper-- .--puresdk-info-box-- .bac--inner-info-box-- .bac--info-close-button--{width:10px;cursor:pointer;top:2px}',
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
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uLy4uL25vZGVfbW9kdWxlcy9icm93c2VyLXBhY2svX3ByZWx1ZGUuanMiLCJQUEJBLmpzIiwiaW5kZXguanMiLCJtb2R1bGVzL2F2YXRhci1jb250cm9sbGVyLmpzIiwibW9kdWxlcy9jYWxsZXIuanMiLCJtb2R1bGVzL2RvbS5qcyIsIm1vZHVsZXMvaW5mby1jb250cm9sbGVyLmpzIiwibW9kdWxlcy9sb2dnZXIuanMiLCJtb2R1bGVzL3B1YnN1Yi5qcyIsIm1vZHVsZXMvc3RvcmUuanMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7QUNBQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUMxUkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDN0NBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUN2SEE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUN2REE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUN0QkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUM5RkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDckJBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNyREE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQSIsImZpbGUiOiJnZW5lcmF0ZWQuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlc0NvbnRlbnQiOlsiKGZ1bmN0aW9uIGUodCxuLHIpe2Z1bmN0aW9uIHMobyx1KXtpZighbltvXSl7aWYoIXRbb10pe3ZhciBhPXR5cGVvZiByZXF1aXJlPT1cImZ1bmN0aW9uXCImJnJlcXVpcmU7aWYoIXUmJmEpcmV0dXJuIGEobywhMCk7aWYoaSlyZXR1cm4gaShvLCEwKTt2YXIgZj1uZXcgRXJyb3IoXCJDYW5ub3QgZmluZCBtb2R1bGUgJ1wiK28rXCInXCIpO3Rocm93IGYuY29kZT1cIk1PRFVMRV9OT1RfRk9VTkRcIixmfXZhciBsPW5bb109e2V4cG9ydHM6e319O3Rbb11bMF0uY2FsbChsLmV4cG9ydHMsZnVuY3Rpb24oZSl7dmFyIG49dFtvXVsxXVtlXTtyZXR1cm4gcyhuP246ZSl9LGwsbC5leHBvcnRzLGUsdCxuLHIpfXJldHVybiBuW29dLmV4cG9ydHN9dmFyIGk9dHlwZW9mIHJlcXVpcmU9PVwiZnVuY3Rpb25cIiYmcmVxdWlyZTtmb3IodmFyIG89MDtvPHIubGVuZ3RoO28rKylzKHJbb10pO3JldHVybiBzfSkiLCJ2YXIgTG9nZ2VyID0gcmVxdWlyZSgnLi9tb2R1bGVzL2xvZ2dlcicpO1xudmFyIFB1YlN1YiA9IHJlcXVpcmUoJy4vbW9kdWxlcy9wdWJzdWInKTtcbnZhciBDYWxsZXIgPSByZXF1aXJlKCcuL21vZHVsZXMvY2FsbGVyJyk7XG52YXIgRG9tID0gcmVxdWlyZSgnLi9tb2R1bGVzL2RvbScpO1xudmFyIEluZm9Db250cm9sbGVyID0gcmVxdWlyZSgnLi9tb2R1bGVzL2luZm8tY29udHJvbGxlcicpO1xudmFyIEF2YXRhckNvbnRyb2xsZXIgPSByZXF1aXJlKCcuL21vZHVsZXMvYXZhdGFyLWNvbnRyb2xsZXInKTtcbnZhciBTdG9yZSA9IHJlcXVpcmUoJy4vbW9kdWxlcy9zdG9yZScpO1xudmFyIHBwYmFDb25mID0ge307XG5cbnZhciBhZnRlclJlbmRlciA9IGZ1bmN0aW9uIGFmdGVyUmVuZGVyKCkge1xuXHRkb2N1bWVudC5nZXRFbGVtZW50QnlJZCgnLS1wdXJlc2RrLS1hcHBzLS1vcGVuZXItLScpLmFkZEV2ZW50TGlzdGVuZXIoJ2NsaWNrJywgZnVuY3Rpb24gKGUpIHtcblx0XHRlLnN0b3BQcm9wYWdhdGlvbigpO1xuXHRcdERvbS50b2dnbGVDbGFzcyhkb2N1bWVudC5nZXRFbGVtZW50QnlJZCgnLS1wdXJlc2RrLWFwcHMtY29udGFpbmVyLS0nKSwgJ2FjdGl2ZScpO1xuXHR9KTtcblxuXHRkb2N1bWVudC5nZXRFbGVtZW50QnlJZCgnYmFjLS11c2VyLWF2YXRhci10b3AnKS5hZGRFdmVudExpc3RlbmVyKCdjbGljaycsIGZ1bmN0aW9uIChlKSB7XG5cdFx0ZS5zdG9wUHJvcGFnYXRpb24oKTtcblx0XHREb20ucmVtb3ZlQ2xhc3MoZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoJy0tcHVyZXNkay1hcHBzLWNvbnRhaW5lci0tJyksICdhY3RpdmUnKTtcblx0XHREb20udG9nZ2xlQ2xhc3MoZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoJy0tcHVyZXNkay11c2VyLXNpZGViYXItLScpLCAnYWN0aXZlJyk7XG5cdH0pO1xuXG5cdHdpbmRvdy5hZGRFdmVudExpc3RlbmVyKCdjbGljaycsIGZ1bmN0aW9uIChlKSB7XG5cdFx0RG9tLnJlbW92ZUNsYXNzKGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKCctLXB1cmVzZGstYXBwcy1jb250YWluZXItLScpLCAnYWN0aXZlJyk7XG5cdFx0RG9tLnJlbW92ZUNsYXNzKGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKCctLXB1cmVzZGstdXNlci1zaWRlYmFyLS0nKSwgJ2FjdGl2ZScpO1xuXHR9KTtcblxuXHRBdmF0YXJDb250cm9sbGVyLmluaXQoKTtcblx0dmFyIHVzZXJEYXRhID0gU3RvcmUuZ2V0VXNlckRhdGEoKTtcblx0QXZhdGFyQ29udHJvbGxlci5zZXRBdmF0YXIodXNlckRhdGEudXNlci5hdmF0YXJfdXJsKTtcblxuXHRJbmZvQ29udHJvbGxlci5pbml0KCk7XG59O1xuXG52YXIgUFBCQSA9IHtcblx0c2V0V2luZG93TmFtZTogZnVuY3Rpb24gc2V0V2luZG93TmFtZSh3bikge1xuXHRcdFN0b3JlLnNldFdpbmRvd05hbWUod24pO1xuXHR9LFxuXG5cdHNldENvbmZpZ3VyYXRpb246IGZ1bmN0aW9uIHNldENvbmZpZ3VyYXRpb24oY29uZikge1xuXHRcdFN0b3JlLnNldENvbmZpZ3VyYXRpb24oY29uZik7XG5cdH0sXG5cblx0c2V0SFRNTFRlbXBsYXRlOiBmdW5jdGlvbiBzZXRIVE1MVGVtcGxhdGUodGVtcGxhdGUpIHtcblx0XHRTdG9yZS5zZXRIVE1MVGVtcGxhdGUodGVtcGxhdGUpO1xuXHR9LFxuXG5cdGluaXQ6IGZ1bmN0aW9uIGluaXQoY29uZikge1xuXHRcdExvZ2dlci5sb2coJ2luaXRpYWxpemluZyB3aXRoIGNvbmY6ICcsIGNvbmYpO1xuXHRcdGlmIChjb25mKSB7XG5cdFx0XHRpZiAoY29uZi5oZWFkZXJEaXZJZCkge1xuXHRcdFx0XHRTdG9yZS5zZXRIVE1MQ29udGFpbmVyKGNvbmYuaGVhZGVyRGl2SWQpO1xuXHRcdFx0fVxuXHRcdFx0aWYgKGNvbmYuYXBwc1Zpc2libGUgIT09IG51bGwpIHtcblx0XHRcdFx0U3RvcmUuc2V0QXBwc1Zpc2libGUoY29uZi5hcHBzVmlzaWJsZSk7XG5cdFx0XHR9XG5cdFx0XHRpZiAoY29uZi5yb290VXJsKSB7XG5cdFx0XHRcdFN0b3JlLnNldFJvb3RVcmwoY29uZi5yb290VXJsKTtcblx0XHRcdH1cblx0XHR9XG5cdFx0cHBiYUNvbmYgPSBjb25mO1xuXHRcdHJldHVybiB0cnVlO1xuXHR9LFxuXG5cdGF1dGhlbnRpY2F0ZTogZnVuY3Rpb24gYXV0aGVudGljYXRlKF9zdWNjZXNzKSB7XG5cdFx0dmFyIHNlbGYgPSBQUEJBO1xuXHRcdENhbGxlci5tYWtlQ2FsbCh7XG5cdFx0XHR0eXBlOiAnR0VUJyxcblx0XHRcdGVuZHBvaW50OiBTdG9yZS5nZXRBdXRoZW50aWNhdGlvbkVuZHBvaW50KCksXG5cdFx0XHRjYWxsYmFja3M6IHtcblx0XHRcdFx0c3VjY2VzczogZnVuY3Rpb24gc3VjY2VzcyhyZXN1bHQpIHtcblx0XHRcdFx0XHRMb2dnZXIubG9nKHJlc3VsdCk7XG5cdFx0XHRcdFx0U3RvcmUuc2V0VXNlckRhdGEocmVzdWx0KTtcblx0XHRcdFx0XHRzZWxmLnJlbmRlcigpO1xuXHRcdFx0XHRcdFBQQkEuZ2V0QXBwcygpO1xuXHRcdFx0XHRcdF9zdWNjZXNzKHJlc3VsdCk7XG5cdFx0XHRcdH0sXG5cdFx0XHRcdGZhaWw6IGZ1bmN0aW9uIGZhaWwoZXJyKSB7XG5cdFx0XHRcdFx0d2luZG93LmxvY2F0aW9uLmhyZWYgPSBTdG9yZS5nZXRMb2dpblVybCgpO1xuXHRcdFx0XHR9XG5cdFx0XHR9XG5cdFx0fSk7XG5cdH0sXG5cblx0YXV0aGVudGljYXRlUHJvbWlzZTogZnVuY3Rpb24gYXV0aGVudGljYXRlUHJvbWlzZSgpIHtcblx0XHR2YXIgc2VsZiA9IFBQQkE7XG5cdFx0cmV0dXJuIENhbGxlci5wcm9taXNlQ2FsbCh7XG5cdFx0XHR0eXBlOiAnR0VUJyxcblx0XHRcdGVuZHBvaW50OiBTdG9yZS5nZXRBdXRoZW50aWNhdGlvbkVuZHBvaW50KCksXG5cdFx0XHRtaWRkbGV3YXJlczoge1xuXHRcdFx0XHRzdWNjZXNzOiBmdW5jdGlvbiBzdWNjZXNzKHJlc3VsdCkge1xuXHRcdFx0XHRcdExvZ2dlci5sb2cocmVzdWx0KTtcblx0XHRcdFx0XHRTdG9yZS5zZXRVc2VyRGF0YShyZXN1bHQpO1xuXHRcdFx0XHRcdHNlbGYucmVuZGVyKCk7XG5cdFx0XHRcdFx0UFBCQS5nZXRBcHBzKCk7XG5cdFx0XHRcdH1cblx0XHRcdH1cblx0XHR9KTtcblx0fSxcblxuXHRnZXRBcHBzOiBmdW5jdGlvbiBnZXRBcHBzKCkge1xuXHRcdENhbGxlci5tYWtlQ2FsbCh7XG5cdFx0XHR0eXBlOiAnR0VUJyxcblx0XHRcdGVuZHBvaW50OiBTdG9yZS5nZXRBcHBzRW5kcG9pbnQoKSxcblx0XHRcdGNhbGxiYWNrczoge1xuXHRcdFx0XHRzdWNjZXNzOiBmdW5jdGlvbiBzdWNjZXNzKHJlc3VsdCkge1xuXHRcdFx0XHRcdFN0b3JlLnNldEFwcHMocmVzdWx0KTtcblx0XHRcdFx0XHRQUEJBLnJlbmRlckFwcHMocmVzdWx0LmFwcHMpO1xuXHRcdFx0XHR9LFxuXHRcdFx0XHRmYWlsOiBmdW5jdGlvbiBmYWlsKGVycikge1xuXHRcdFx0XHRcdHdpbmRvdy5sb2NhdGlvbi5ocmVmID0gU3RvcmUuZ2V0TG9naW5VcmwoKTtcblx0XHRcdFx0fVxuXHRcdFx0fVxuXHRcdH0pO1xuXHR9LFxuXG5cdGdldEF2YWlsYWJsZUxpc3RlbmVyczogZnVuY3Rpb24gZ2V0QXZhaWxhYmxlTGlzdGVuZXJzKCkge1xuXHRcdHJldHVybiBQdWJTdWIuZ2V0QXZhaWxhYmxlTGlzdGVuZXJzKCk7XG5cdH0sXG5cblx0c3Vic2NyaWJlTGlzdGVuZXI6IGZ1bmN0aW9uIHN1YnNjcmliZUxpc3RlbmVyKGV2ZW50dCwgZnVuY3QpIHtcblx0XHRyZXR1cm4gUHViU3ViLnN1YnNjcmliZShldmVudHQsIGZ1bmN0KTtcblx0fSxcblxuXHRnZXRVc2VyRGF0YTogZnVuY3Rpb24gZ2V0VXNlckRhdGEoKSB7XG5cdFx0cmV0dXJuIFN0b3JlLmdldFVzZXJEYXRhKCk7XG5cdH0sXG5cblx0c2V0SW5wdXRQbGFjZWhvbGRlcjogZnVuY3Rpb24gc2V0SW5wdXRQbGFjZWhvbGRlcih0eHQpIHtcblx0XHQvLyBkb2N1bWVudC5nZXRFbGVtZW50QnlJZChTdG9yZS5nZXRTZWFyY2hJbnB1dElkKCkpLnBsYWNlaG9sZGVyID0gdHh0O1xuXHR9LFxuXG5cdGNoYW5nZUFjY291bnQ6IGZ1bmN0aW9uIGNoYW5nZUFjY291bnQoYWNjb3VudElkKSB7XG5cdFx0Q2FsbGVyLm1ha2VDYWxsKHtcblx0XHRcdHR5cGU6ICdHRVQnLFxuXHRcdFx0ZW5kcG9pbnQ6IFN0b3JlLmdldFN3aXRjaEFjY291bnRFbmRwb2ludChhY2NvdW50SWQpLFxuXHRcdFx0Y2FsbGJhY2tzOiB7XG5cdFx0XHRcdHN1Y2Nlc3M6IGZ1bmN0aW9uIHN1Y2Nlc3MocmVzdWx0KSB7XG5cdFx0XHRcdFx0d2luZG93LmxvY2F0aW9uLmhyZWYgPSAnL2FwcHMnO1xuXHRcdFx0XHR9LFxuXHRcdFx0XHRmYWlsOiBmdW5jdGlvbiBmYWlsKGVycikge1xuXHRcdFx0XHRcdGFsZXJ0KCdTb3JyeSwgc29tZXRoaW5nIHdlbnQgd3Jvbmcgd2l0aCB5b3VyIHJlcXVlc3QuIFBsZXNlIHRyeSBhZ2FpbicpO1xuXHRcdFx0XHR9XG5cdFx0XHR9XG5cdFx0fSk7XG5cdH0sXG5cblx0cmVuZGVyQXBwczogZnVuY3Rpb24gcmVuZGVyQXBwcyhhcHBzKSB7XG5cdFx0dmFyIGFwcFRlbXBsYXRlID0gZnVuY3Rpb24gYXBwVGVtcGxhdGUoYXBwKSB7XG5cdFx0XHRyZXR1cm4gJ1xcblxcdFxcdFxcdFxcdDxhIGhyZWY9XCIjXCIgc3R5bGU9XCJiYWNrZ3JvdW5kOiAjJyArIGFwcC5jb2xvciArICdcIj48aSBjbGFzcz1cIicgKyBhcHAuaWNvbiArICdcIj48L2k+PC9hPlxcblxcdFxcdFxcdFxcdDxzcGFuIGNsYXNzPVwiYmFjLS1hcHAtbmFtZVwiPicgKyBhcHAubmFtZSArICc8L3NwYW4+XFxuXFx0XFx0XFx0XFx0PHNwYW4gY2xhc3M9XCJiYWMtLWFwcC1kZXNjcmlwdGlvblwiPicgKyBhcHAuZGVzY3IgKyAnPC9zcGFuPlxcblxcdFxcdFxcdCc7XG5cdFx0fTtcblxuXHRcdHZhciBfbG9vcCA9IGZ1bmN0aW9uIF9sb29wKGkpIHtcblx0XHRcdHZhciBhcHAgPSBhcHBzW2ldO1xuXHRcdFx0dmFyIGRpdiA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoXCJkaXZcIik7XG5cdFx0XHRkaXYuY2xhc3NOYW1lID0gXCJiYWMtLWFwcHNcIjtcblx0XHRcdGRpdi5pbm5lckhUTUwgPSBhcHBUZW1wbGF0ZShhcHApO1xuXHRcdFx0ZGl2Lm9uY2xpY2sgPSBmdW5jdGlvbiAoZSkge1xuXHRcdFx0XHRlLnByZXZlbnREZWZhdWx0KCk7XG5cdFx0XHRcdHdpbmRvdy5sb2NhdGlvbi5ocmVmID0gYXBwLmFwcGxpY2F0aW9uX3VybDtcblx0XHRcdH07XG5cdFx0XHRkb2N1bWVudC5nZXRFbGVtZW50QnlJZChcIi0tcHVyZXNkay1hcHBzLWNvbnRhaW5lci0tXCIpLmFwcGVuZENoaWxkKGRpdik7XG5cdFx0fTtcblxuXHRcdGZvciAodmFyIGkgPSAwOyBpIDwgYXBwcy5sZW5ndGg7IGkrKykge1xuXHRcdFx0X2xvb3AoaSk7XG5cdFx0fVxuXHR9LFxuXG5cdHJlbmRlclVzZXI6IGZ1bmN0aW9uIHJlbmRlclVzZXIodXNlcikge1xuXHRcdHZhciB1c2VyVGVtcGxhdGUgPSBmdW5jdGlvbiB1c2VyVGVtcGxhdGUodXNlcikge1xuXHRcdFx0cmV0dXJuICdcXG5cXHRcXHRcXHRcXHQ8ZGl2IGNsYXNzPVwiYmFjLS11c2VyLWltYWdlXCIgaWQ9XCJiYWMtLXVzZXItaW1hZ2VcIj5cXG5cXHRcXHRcXHRcXHRcXHQ8aSBjbGFzcz1cImZhIGZhLWNhbWVyYVwiPjwvaT5cXG5cXHRcXHRcXHQgICBcXHQ8ZGl2IGlkPVwiYmFjLS11c2VyLWltYWdlLWZpbGVcIj48L2Rpdj5cXG5cXHRcXHRcXHQgICBcXHQ8ZGl2IGlkPVwiYmFjLS11c2VyLWltYWdlLXVwbG9hZC1wcm9ncmVzc1wiPlxcblxcdFxcdFxcdCAgIFxcdFxcdDxzdmcgd2lkdGg9XFwnNjBweFxcJyBoZWlnaHQ9XFwnNjBweFxcJyB4bWxucz1cImh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnXCIgdmlld0JveD1cIjAgMCAxMDAgMTAwXCIgcHJlc2VydmVBc3BlY3RSYXRpbz1cInhNaWRZTWlkXCIgY2xhc3M9XCJ1aWwtZGVmYXVsdFwiPjxyZWN0IHg9XCIwXCIgeT1cIjBcIiB3aWR0aD1cIjEwMFwiIGhlaWdodD1cIjEwMFwiIGZpbGw9XCJub25lXCIgY2xhc3M9XCJia1wiPjwvcmVjdD48cmVjdCAgeD1cXCc0Ni41XFwnIHk9XFwnNDBcXCcgd2lkdGg9XFwnN1xcJyBoZWlnaHQ9XFwnMjBcXCcgcng9XFwnNVxcJyByeT1cXCc1XFwnIGZpbGw9XFwnI2ZmZmZmZlxcJyB0cmFuc2Zvcm09XFwncm90YXRlKDAgNTAgNTApIHRyYW5zbGF0ZSgwIC0zMClcXCc+ICA8YW5pbWF0ZSBhdHRyaWJ1dGVOYW1lPVxcJ29wYWNpdHlcXCcgZnJvbT1cXCcxXFwnIHRvPVxcJzBcXCcgZHVyPVxcJzFzXFwnIGJlZ2luPVxcJy0xc1xcJyByZXBlYXRDb3VudD1cXCdpbmRlZmluaXRlXFwnLz48L3JlY3Q+PHJlY3QgIHg9XFwnNDYuNVxcJyB5PVxcJzQwXFwnIHdpZHRoPVxcJzdcXCcgaGVpZ2h0PVxcJzIwXFwnIHJ4PVxcJzVcXCcgcnk9XFwnNVxcJyBmaWxsPVxcJyNmZmZmZmZcXCcgdHJhbnNmb3JtPVxcJ3JvdGF0ZSgzMCA1MCA1MCkgdHJhbnNsYXRlKDAgLTMwKVxcJz4gIDxhbmltYXRlIGF0dHJpYnV0ZU5hbWU9XFwnb3BhY2l0eVxcJyBmcm9tPVxcJzFcXCcgdG89XFwnMFxcJyBkdXI9XFwnMXNcXCcgYmVnaW49XFwnLTAuOTE2NjY2NjY2NjY2NjY2NnNcXCcgcmVwZWF0Q291bnQ9XFwnaW5kZWZpbml0ZVxcJy8+PC9yZWN0PjxyZWN0ICB4PVxcJzQ2LjVcXCcgeT1cXCc0MFxcJyB3aWR0aD1cXCc3XFwnIGhlaWdodD1cXCcyMFxcJyByeD1cXCc1XFwnIHJ5PVxcJzVcXCcgZmlsbD1cXCcjZmZmZmZmXFwnIHRyYW5zZm9ybT1cXCdyb3RhdGUoNjAgNTAgNTApIHRyYW5zbGF0ZSgwIC0zMClcXCc+ICA8YW5pbWF0ZSBhdHRyaWJ1dGVOYW1lPVxcJ29wYWNpdHlcXCcgZnJvbT1cXCcxXFwnIHRvPVxcJzBcXCcgZHVyPVxcJzFzXFwnIGJlZ2luPVxcJy0wLjgzMzMzMzMzMzMzMzMzMzRzXFwnIHJlcGVhdENvdW50PVxcJ2luZGVmaW5pdGVcXCcvPjwvcmVjdD48cmVjdCAgeD1cXCc0Ni41XFwnIHk9XFwnNDBcXCcgd2lkdGg9XFwnN1xcJyBoZWlnaHQ9XFwnMjBcXCcgcng9XFwnNVxcJyByeT1cXCc1XFwnIGZpbGw9XFwnI2ZmZmZmZlxcJyB0cmFuc2Zvcm09XFwncm90YXRlKDkwIDUwIDUwKSB0cmFuc2xhdGUoMCAtMzApXFwnPiAgPGFuaW1hdGUgYXR0cmlidXRlTmFtZT1cXCdvcGFjaXR5XFwnIGZyb209XFwnMVxcJyB0bz1cXCcwXFwnIGR1cj1cXCcxc1xcJyBiZWdpbj1cXCctMC43NXNcXCcgcmVwZWF0Q291bnQ9XFwnaW5kZWZpbml0ZVxcJy8+PC9yZWN0PjxyZWN0ICB4PVxcJzQ2LjVcXCcgeT1cXCc0MFxcJyB3aWR0aD1cXCc3XFwnIGhlaWdodD1cXCcyMFxcJyByeD1cXCc1XFwnIHJ5PVxcJzVcXCcgZmlsbD1cXCcjZmZmZmZmXFwnIHRyYW5zZm9ybT1cXCdyb3RhdGUoMTIwIDUwIDUwKSB0cmFuc2xhdGUoMCAtMzApXFwnPiAgPGFuaW1hdGUgYXR0cmlidXRlTmFtZT1cXCdvcGFjaXR5XFwnIGZyb209XFwnMVxcJyB0bz1cXCcwXFwnIGR1cj1cXCcxc1xcJyBiZWdpbj1cXCctMC42NjY2NjY2NjY2NjY2NjY2c1xcJyByZXBlYXRDb3VudD1cXCdpbmRlZmluaXRlXFwnLz48L3JlY3Q+PHJlY3QgIHg9XFwnNDYuNVxcJyB5PVxcJzQwXFwnIHdpZHRoPVxcJzdcXCcgaGVpZ2h0PVxcJzIwXFwnIHJ4PVxcJzVcXCcgcnk9XFwnNVxcJyBmaWxsPVxcJyNmZmZmZmZcXCcgdHJhbnNmb3JtPVxcJ3JvdGF0ZSgxNTAgNTAgNTApIHRyYW5zbGF0ZSgwIC0zMClcXCc+ICA8YW5pbWF0ZSBhdHRyaWJ1dGVOYW1lPVxcJ29wYWNpdHlcXCcgZnJvbT1cXCcxXFwnIHRvPVxcJzBcXCcgZHVyPVxcJzFzXFwnIGJlZ2luPVxcJy0wLjU4MzMzMzMzMzMzMzMzMzRzXFwnIHJlcGVhdENvdW50PVxcJ2luZGVmaW5pdGVcXCcvPjwvcmVjdD48cmVjdCAgeD1cXCc0Ni41XFwnIHk9XFwnNDBcXCcgd2lkdGg9XFwnN1xcJyBoZWlnaHQ9XFwnMjBcXCcgcng9XFwnNVxcJyByeT1cXCc1XFwnIGZpbGw9XFwnI2ZmZmZmZlxcJyB0cmFuc2Zvcm09XFwncm90YXRlKDE4MCA1MCA1MCkgdHJhbnNsYXRlKDAgLTMwKVxcJz4gIDxhbmltYXRlIGF0dHJpYnV0ZU5hbWU9XFwnb3BhY2l0eVxcJyBmcm9tPVxcJzFcXCcgdG89XFwnMFxcJyBkdXI9XFwnMXNcXCcgYmVnaW49XFwnLTAuNXNcXCcgcmVwZWF0Q291bnQ9XFwnaW5kZWZpbml0ZVxcJy8+PC9yZWN0PjxyZWN0ICB4PVxcJzQ2LjVcXCcgeT1cXCc0MFxcJyB3aWR0aD1cXCc3XFwnIGhlaWdodD1cXCcyMFxcJyByeD1cXCc1XFwnIHJ5PVxcJzVcXCcgZmlsbD1cXCcjZmZmZmZmXFwnIHRyYW5zZm9ybT1cXCdyb3RhdGUoMjEwIDUwIDUwKSB0cmFuc2xhdGUoMCAtMzApXFwnPiAgPGFuaW1hdGUgYXR0cmlidXRlTmFtZT1cXCdvcGFjaXR5XFwnIGZyb209XFwnMVxcJyB0bz1cXCcwXFwnIGR1cj1cXCcxc1xcJyBiZWdpbj1cXCctMC40MTY2NjY2NjY2NjY2NjY3c1xcJyByZXBlYXRDb3VudD1cXCdpbmRlZmluaXRlXFwnLz48L3JlY3Q+PHJlY3QgIHg9XFwnNDYuNVxcJyB5PVxcJzQwXFwnIHdpZHRoPVxcJzdcXCcgaGVpZ2h0PVxcJzIwXFwnIHJ4PVxcJzVcXCcgcnk9XFwnNVxcJyBmaWxsPVxcJyNmZmZmZmZcXCcgdHJhbnNmb3JtPVxcJ3JvdGF0ZSgyNDAgNTAgNTApIHRyYW5zbGF0ZSgwIC0zMClcXCc+ICA8YW5pbWF0ZSBhdHRyaWJ1dGVOYW1lPVxcJ29wYWNpdHlcXCcgZnJvbT1cXCcxXFwnIHRvPVxcJzBcXCcgZHVyPVxcJzFzXFwnIGJlZ2luPVxcJy0wLjMzMzMzMzMzMzMzMzMzMzNzXFwnIHJlcGVhdENvdW50PVxcJ2luZGVmaW5pdGVcXCcvPjwvcmVjdD48cmVjdCAgeD1cXCc0Ni41XFwnIHk9XFwnNDBcXCcgd2lkdGg9XFwnN1xcJyBoZWlnaHQ9XFwnMjBcXCcgcng9XFwnNVxcJyByeT1cXCc1XFwnIGZpbGw9XFwnI2ZmZmZmZlxcJyB0cmFuc2Zvcm09XFwncm90YXRlKDI3MCA1MCA1MCkgdHJhbnNsYXRlKDAgLTMwKVxcJz4gIDxhbmltYXRlIGF0dHJpYnV0ZU5hbWU9XFwnb3BhY2l0eVxcJyBmcm9tPVxcJzFcXCcgdG89XFwnMFxcJyBkdXI9XFwnMXNcXCcgYmVnaW49XFwnLTAuMjVzXFwnIHJlcGVhdENvdW50PVxcJ2luZGVmaW5pdGVcXCcvPjwvcmVjdD48cmVjdCAgeD1cXCc0Ni41XFwnIHk9XFwnNDBcXCcgd2lkdGg9XFwnN1xcJyBoZWlnaHQ9XFwnMjBcXCcgcng9XFwnNVxcJyByeT1cXCc1XFwnIGZpbGw9XFwnI2ZmZmZmZlxcJyB0cmFuc2Zvcm09XFwncm90YXRlKDMwMCA1MCA1MCkgdHJhbnNsYXRlKDAgLTMwKVxcJz4gIDxhbmltYXRlIGF0dHJpYnV0ZU5hbWU9XFwnb3BhY2l0eVxcJyBmcm9tPVxcJzFcXCcgdG89XFwnMFxcJyBkdXI9XFwnMXNcXCcgYmVnaW49XFwnLTAuMTY2NjY2NjY2NjY2NjY2NjZzXFwnIHJlcGVhdENvdW50PVxcJ2luZGVmaW5pdGVcXCcvPjwvcmVjdD48cmVjdCAgeD1cXCc0Ni41XFwnIHk9XFwnNDBcXCcgd2lkdGg9XFwnN1xcJyBoZWlnaHQ9XFwnMjBcXCcgcng9XFwnNVxcJyByeT1cXCc1XFwnIGZpbGw9XFwnI2ZmZmZmZlxcJyB0cmFuc2Zvcm09XFwncm90YXRlKDMzMCA1MCA1MCkgdHJhbnNsYXRlKDAgLTMwKVxcJz4gIDxhbmltYXRlIGF0dHJpYnV0ZU5hbWU9XFwnb3BhY2l0eVxcJyBmcm9tPVxcJzFcXCcgdG89XFwnMFxcJyBkdXI9XFwnMXNcXCcgYmVnaW49XFwnLTAuMDgzMzMzMzMzMzMzMzMzMzNzXFwnIHJlcGVhdENvdW50PVxcJ2luZGVmaW5pdGVcXCcvPjwvcmVjdD48L3N2Zz5cXHRcXG5cXHRcXHRcXHRcXHRcXHQ8L2Rpdj5cXG5cXHRcXHRcXHQgICA8L2Rpdj5cXG5cXHRcXHRcXHRcXHQ8ZGl2IGNsYXNzPVwiYmFjLS11c2VyLW5hbWVcIj4nICsgdXNlci5maXJzdG5hbWUgKyAnICcgKyB1c2VyLmxhc3RuYW1lICsgJzwvZGl2PlxcblxcdFxcdFxcdFxcdDxkaXYgY2xhc3M9XCJiYWMtLXVzZXItZW1haWxcIj4nICsgdXNlci5lbWFpbCArICc8L2Rpdj5cXG5cXHRcXHRcXHQnO1xuXHRcdH07XG5cdFx0dmFyIGRpdiA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoJ2RpdicpO1xuXHRcdGRpdi5jbGFzc05hbWUgPSBcImJhYy0tdXNlci1zaWRlYmFyLWluZm9cIjtcblx0XHRkaXYuaW5uZXJIVE1MID0gdXNlclRlbXBsYXRlKHVzZXIpO1xuXHRcdGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKCctLXB1cmVzZGstdXNlci1kZXRhaWxzLS0nKS5hcHBlbmRDaGlsZChkaXYpO1xuXHRcdGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKCctLXB1cmVzZGstdXNlci1hdmF0YXItLScpLmlubmVySFRNTCA9IHVzZXIuZmlyc3RuYW1lLmNoYXJBdCgwKSArIHVzZXIubGFzdG5hbWUuY2hhckF0KDApO1xuXHR9LFxuXG5cdHJlbmRlckFjY291bnRzOiBmdW5jdGlvbiByZW5kZXJBY2NvdW50cyhhY2NvdW50cykge1xuXHRcdHZhciBhY2NvdW50c1RlbXBsYXRlID0gZnVuY3Rpb24gYWNjb3VudHNUZW1wbGF0ZShhY2NvdW50KSB7XG5cdFx0XHRyZXR1cm4gJ1xcblxcdFxcdFxcdFxcdDxkaXYgY2xhc3M9XCJiYWMtLXVzZXItbGlzdC1pdGVtLWltYWdlXCI+XFxuXFx0XFx0XFx0XFx0XFx0PGltZyBzcmM9XCInICsgYWNjb3VudC5zZGtfc3F1YXJlX2xvZ29faWNvbiArICdcIiBhbHQ9XCJcIj5cXG5cXHRcXHRcXHRcXHQ8L2Rpdj5cXG5cXHRcXHRcXHRcXHQ8ZGl2IGNsYXNzPVwiYmFjLXVzZXItYXBwLWRldGFpbHNcIj5cXG5cXHRcXHRcXHRcXHRcXHQgPHNwYW4+JyArIGFjY291bnQubmFtZSArICc8L3NwYW4+XFxuXFx0XFx0XFx0XFx0XFx0IDxzcGFuPjE1IHRlYW0gbWVtYmVyczwvc3Bhbj5cXG5cXHRcXHRcXHRcXHQ8L2Rpdj5cXG5cXHRcXHRcXHQnO1xuXHRcdH07XG5cblx0XHR2YXIgX2xvb3AyID0gZnVuY3Rpb24gX2xvb3AyKGkpIHtcblx0XHRcdHZhciBhY2NvdW50ID0gYWNjb3VudHNbaV07XG5cdFx0XHR2YXIgZGl2ID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudCgnZGl2Jyk7XG5cdFx0XHRkaXYuY2xhc3NOYW1lID0gJ2JhYy0tdXNlci1saXN0LWl0ZW0nO1xuXHRcdFx0ZGl2LmlubmVySFRNTCA9IGFjY291bnRzVGVtcGxhdGUoYWNjb3VudCk7XG5cdFx0XHRkaXYub25jbGljayA9IGZ1bmN0aW9uIChlKSB7XG5cdFx0XHRcdGUucHJldmVudERlZmF1bHQoKTtcblx0XHRcdFx0UFBCQS5jaGFuZ2VBY2NvdW50KGFjY291bnQuc2ZpZCk7XG5cdFx0XHR9O1xuXHRcdFx0ZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoJy0tcHVyZXNkay11c2VyLWJ1c2luZXNzZXMtLScpLmFwcGVuZENoaWxkKGRpdik7XG5cdFx0fTtcblxuXHRcdGZvciAodmFyIGkgPSAwOyBpIDwgYWNjb3VudHMubGVuZ3RoOyBpKyspIHtcblx0XHRcdF9sb29wMihpKTtcblx0XHR9XG5cdH0sXG5cblx0cmVuZGVySW5mb0Jsb2NrczogZnVuY3Rpb24gcmVuZGVySW5mb0Jsb2NrcygpIHtcblx0XHR2YXIgYmxvY2tzVGVtcGxhdGUgPSBmdW5jdGlvbiBibG9ja3NUZW1wbGF0ZShpbmRleCkge1xuXHRcdFx0cmV0dXJuICdcXG5cXHRcXHRcXHRcXHQgPGRpdiBjbGFzcz1cIi0tcHVyZXNkay1pbmZvLWJveC0tXCIgaWQ9XCItLXB1cmVzZGstaW5mby1ib3gtLScgKyBpbmRleCArICdcIj5cXG5cXHRcXHRcXHRcXHQgXFx0PGRpdiBjbGFzcz1cImJhYy0tdGltZXJcIiBpZD1cImJhYy0tdGltZXInICsgaW5kZXggKyAnXCI+PC9kaXY+XFxuXFx0XFx0XFx0XFx0XFx0IDxkaXYgY2xhc3M9XCJiYWMtLWlubmVyLWluZm8tYm94LS1cIj5cXG5cXHRcXHRcXHRcXHRcXHQgXFx0XFx0PGRpdiBjbGFzcz1cImJhYy0taW5mby1pY29uLS0gZmEtc3VjY2Vzc1wiPjwvZGl2PlxcblxcdFxcdFxcdFxcdFxcdCBcXHRcXHQ8ZGl2IGNsYXNzPVwiYmFjLS1pbmZvLWljb24tLSBmYS13YXJuaW5nXCI+PC9kaXY+XFxuXFx0XFx0XFx0XFx0XFx0IFxcdFxcdDxkaXYgY2xhc3M9XCJiYWMtLWluZm8taWNvbi0tIGZhLWluZm8tMVwiPjwvZGl2PlxcblxcdFxcdFxcdFxcdFxcdCBcXHRcXHQ8ZGl2IGNsYXNzPVwiYmFjLS1pbmZvLWljb24tLSBmYS1lcnJvclwiPjwvZGl2PlxcblxcdFxcdFxcdFxcdFxcdCBcXHRcXHQgPGRpdiBjbGFzcz1cImJhYy0taW5mby1tYWluLXRleHQtLVwiIGlkPVwiYmFjLS1pbmZvLW1haW4tdGV4dC0tJyArIGluZGV4ICsgJ1wiPjwvZGl2PlxcblxcdFxcdFxcdFxcdFxcdCBcXHRcXHQgPGRpdiBjbGFzcz1cImJhYy0taW5mby1jbG9zZS1idXR0b24tLSBmYS1jbG9zZS0xXCIgaWQ9XCJiYWMtLWluZm8tY2xvc2UtYnV0dG9uLS0nICsgaW5kZXggKyAnXCI+PC9kaXY+XFxuXFx0XFx0XFx0XFx0XFx0PC9kaXY+XFxuXFx0XFx0XFx0XFx0PC9kaXY+XFxuXFx0XFx0ICAnO1xuXHRcdH07XG5cblx0XHR2YXIgaW5mb0Jsb2Nrc1dyYXBwZXIgPSBkb2N1bWVudC5nZXRFbGVtZW50QnlJZCgnYmFjLS1pbmZvLWJsb2Nrcy13cmFwcGVyLS0nKTtcblx0XHR2YXIgaW5uZXJIdG1sID0gJyc7XG5cdFx0Zm9yICh2YXIgaSA9IDE7IGkgPCA1OyBpKyspIHtcblx0XHRcdGlubmVySHRtbCArPSBibG9ja3NUZW1wbGF0ZShpKTtcblx0XHR9XG5cblx0XHRpbmZvQmxvY2tzV3JhcHBlci5pbm5lckhUTUwgPSBpbm5lckh0bWw7XG5cdH0sXG5cblx0c3R5bGVBY2NvdW50OiBmdW5jdGlvbiBzdHlsZUFjY291bnQoYWNjb3VudCkge1xuXHRcdHZhciBsb2dvID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudCgnaW1nJyk7XG5cdFx0bG9nby5zcmMgPSBhY2NvdW50LnNka19sb2dvX2ljb247XG5cdFx0ZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoJy0tcHVyZXNkay1hY2NvdW50LWxvZ28tLScpLmFwcGVuZENoaWxkKGxvZ28pO1xuXHRcdGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKCctLXB1cmVzZGstYmFjLS1oZWFkZXItYXBwcy0tJykuc3R5bGUuY3NzVGV4dCA9IFwiYmFja2dyb3VuZDogI1wiICsgYWNjb3VudC5zZGtfYmFja2dyb3VuZF9jb2xvciArIFwiOyBjb2xvcjogI1wiICsgYWNjb3VudC5zZGtfZm9udF9jb2xvcjtcblx0XHRkb2N1bWVudC5nZXRFbGVtZW50QnlJZCgnLS1wdXJlc2RrLXVzZXItc2lkZWJhci0tJykuc3R5bGUuY3NzVGV4dCA9IFwiYmFja2dyb3VuZDogI1wiICsgYWNjb3VudC5zZGtfYmFja2dyb3VuZF9jb2xvciArIFwiOyBjb2xvcjogI1wiICsgYWNjb3VudC5zZGtfZm9udF9jb2xvcjtcblx0XHRkb2N1bWVudC5nZXRFbGVtZW50QnlJZCgnLS1wdXJlc2RrLWFjY291bnQtbG9nby0tJykub25jbGljayA9IGZ1bmN0aW9uIChlKSB7XG5cdFx0XHR3aW5kb3cubG9jYXRpb24uaHJlZiA9ICcvJztcblx0XHR9O1xuXHRcdC8vIGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKCctLXB1cmVzZGstLXNlYXJjaC0taW5wdXQtLScpLnN0eWxlLmNzc1RleHQgPSBcImJhY2tncm91bmQ6ICNcIiArIGFjY291bnQuc2RrX3NlYXJjaF9iYWNrZ3JvdW5kX2NvbG9yXG5cdFx0Ly8gICArIFwiOyBjb2xvcjogI1wiICsgYWNjb3VudC5zZGtfc2VhcmNoX2ZvbnRfY29sb3I7XG5cdH0sXG5cblx0Z29Ub0xvZ2luUGFnZTogZnVuY3Rpb24gZ29Ub0xvZ2luUGFnZSgpIHtcblx0XHR3aW5kb3cubG9jYXRpb24uaHJlZiA9IFN0b3JlLmdldExvZ2luVXJsKCk7XG5cdH0sXG5cblx0LyogTE9BREVSICovXG5cdHNob3dMb2FkZXI6IGZ1bmN0aW9uIHNob3dMb2FkZXIoKSB7XG5cdFx0RG9tLmFkZENsYXNzKGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKCctLXB1cmVzZGstLWxvYWRlci0tJyksICctLXB1cmVzZGstdmlzaWJsZScpO1xuXHR9LFxuXG5cdGhpZGVMb2FkZXI6IGZ1bmN0aW9uIGhpZGVMb2FkZXIoKSB7XG5cdFx0RG9tLnJlbW92ZUNsYXNzKGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKCctLXB1cmVzZGstLWxvYWRlci0tJyksICctLXB1cmVzZGstdmlzaWJsZScpO1xuXHR9LFxuXG5cdC8qXG4gIHR5cGU6IG9uZSBvZjpcbiAgLSBzdWNjZXNzXG4gIC0gaW5mb1xuICAtIHdhcm5pbmdcbiAgLSBlcnJvclxuICB0ZXh0OiB0aGUgdGV4dCB0byBkaXNwbGF5XG4gIG9wdGlvbnMgKG9wdGlvbmFsKToge1xuICBcdFx0aGlkZUluOiBtaWxsaXNlY29uZHMgdG8gaGlkZSBpdC4gLTEgZm9yIG5vdCBoaWRpbmcgaXQgYXQgYWxsLiBEZWZhdWx0IGlzIDUwMDBcbiAgfVxuICAqL1xuXHRzZXRJbmZvOiBmdW5jdGlvbiBzZXRJbmZvKHR5cGUsIHRleHQsIG9wdGlvbnMpIHtcblx0XHRJbmZvQ29udHJvbGxlci5zaG93SW5mbyh0eXBlLCB0ZXh0LCBvcHRpb25zKTtcblx0fSxcblxuXHRyZW5kZXI6IGZ1bmN0aW9uIHJlbmRlcigpIHtcblx0XHR2YXIgd2hlcmVUbyA9IGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKFN0b3JlLmdldEhUTE1Db250YWluZXIoKSk7XG5cdFx0aWYgKHdoZXJlVG8gPT09IG51bGwpIHtcblx0XHRcdExvZ2dlci5lcnJvcigndGhlIGNvbnRhaW5lciB3aXRoIGlkIFwiJyArIHdoZXJlVG8gKyAnXCIgaGFzIG5vdCBiZWVuIGZvdW5kIG9uIHRoZSBkb2N1bWVudC4gVGhlIGxpYnJhcnkgaXMgZ29pbmcgdG8gY3JlYXRlIGl0LicpO1xuXHRcdFx0dmFyIGRpdiA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoJ2RpdicpO1xuXHRcdFx0ZGl2LmlkID0gU3RvcmUuZ2V0SFRMTUNvbnRhaW5lcigpO1xuXHRcdFx0ZGl2LnN0eWxlLndpZHRoID0gJzEwMCUnO1xuXHRcdFx0ZGl2LnN0eWxlLmhlaWdodCA9ICc1MHB4Jztcblx0XHRcdGRpdi5zdHlsZS5wb3NpdGlvbiA9ICdmaXhlZCc7XG5cdFx0XHRkaXYuc3R5bGUudG9wID0gJzAnO1xuXHRcdFx0ZGl2LnN0eWxlLnpJbmRleCA9IDk5OTk5OTk5OTk7XG5cdFx0XHRkb2N1bWVudC5ib2R5Lmluc2VydEJlZm9yZShkaXYsIGRvY3VtZW50LmJvZHkuZmlyc3RDaGlsZCk7XG5cdFx0XHR3aGVyZVRvID0gZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoU3RvcmUuZ2V0SFRMTUNvbnRhaW5lcigpKTtcblx0XHR9XG5cdFx0d2hlcmVUby5pbm5lckhUTUwgPSBTdG9yZS5nZXRIVE1MKCk7XG5cdFx0UFBCQS5zdHlsZUFjY291bnQoU3RvcmUuZ2V0VXNlckRhdGEoKS51c2VyLmFjY291bnQpO1xuXHRcdFBQQkEucmVuZGVyVXNlcihTdG9yZS5nZXRVc2VyRGF0YSgpLnVzZXIpO1xuXHRcdFBQQkEucmVuZGVySW5mb0Jsb2NrcygpO1xuXHRcdFBQQkEucmVuZGVyQWNjb3VudHMoU3RvcmUuZ2V0VXNlckRhdGEoKS51c2VyLmFjY291bnRzKTtcblx0XHRpZiAoU3RvcmUuZ2V0QXBwc1Zpc2libGUoKSA9PT0gZmFsc2UpIHtcblx0XHRcdGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKCctLXB1cmVzZGstYXBwcy1zZWN0aW9uLS0nKS5zdHlsZS5jc3NUZXh0ID0gXCJkaXNwbGF5Om5vbmVcIjtcblx0XHR9XG5cdFx0YWZ0ZXJSZW5kZXIoKTtcblx0fVxufTtcblxubW9kdWxlLmV4cG9ydHMgPSBQUEJBOyIsIid1c2Ugc3RyaWN0JztcblxuLyohXG4gKiBQdXJlUHJvZmlsZSBQdXJlUHJvZmlsZSBCdXNpbmVzcyBBcHBzIERldmVsb3BtZW50IFNES1xuICpcbiAqIHZlcnNpb246IDIuMy41XG4gKiBkYXRlOiAyMDE3LTA1LTMxXG4gKlxuICogQ29weXJpZ2h0IDIwMTcsIFB1cmVQcm9maWxlXG4gKiBSZWxlYXNlZCB1bmRlciBNSVQgbGljZW5zZVxuICogaHR0cHM6Ly9vcGVuc291cmNlLm9yZy9saWNlbnNlcy9NSVRcbiAqL1xuXG52YXIgcHBiYSA9IHJlcXVpcmUoJy4vUFBCQScpO1xucHBiYS5zZXRXaW5kb3dOYW1lKCdQVVJFU0RLJyk7XG5wcGJhLnNldENvbmZpZ3VyYXRpb24oe1xuICAgIFwibG9nc1wiOiBmYWxzZSxcbiAgICBcInJvb3RVcmxcIjogXCIvXCIsXG4gICAgXCJiYXNlVXJsXCI6IFwiYXBpL3YxL1wiLFxuICAgIFwibG9naW5VcmxcIjogXCJhcGkvdjEvb2F1dGgyXCIsXG4gICAgXCJzZWFyY2hJbnB1dElkXCI6IFwiLS1wdXJlc2RrLS1zZWFyY2gtLWlucHV0LS1cIixcbiAgICBcInJlZGlyZWN0VXJsUGFyYW1cIjogXCJyZWRpcmVjdF91cmxcIlxufSk7XG5wcGJhLnNldEhUTUxUZW1wbGF0ZSgnPGhlYWRlciBjbGFzcz1cImJhYy0taGVhZGVyLWFwcHNcIiBpZD1cIi0tcHVyZXNkay1iYWMtLWhlYWRlci1hcHBzLS1cIj5cXG4gICAgPGRpdiBjbGFzcz1cImJhYy0tY29udGFpbmVyXCI+XFxuICAgICAgICA8ZGl2IGNsYXNzPVwiYmFjLS1sb2dvXCIgaWQ9XCItLXB1cmVzZGstYWNjb3VudC1sb2dvLS1cIj48L2Rpdj5cXG4gICAgICAgIDxkaXYgY2xhc3M9XCJiYWMtLXVzZXItYWN0aW9uc1wiPlxcbiAgICAgICAgICAgIDxzdmcgaWQ9XCItLXB1cmVzZGstLWxvYWRlci0tXCIgd2lkdGg9XCIzOFwiIGhlaWdodD1cIjM4XCIgdmlld0JveD1cIjAgMCA0NCA0NFwiIHhtbG5zPVwiaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmdcIiBzdHJva2U9XCIjZmZmXCIgc3R5bGU9XCJcXG4gICAgbWFyZ2luLXJpZ2h0OiAxMHB4O1xcblwiPlxcbiAgICAgICAgICAgICAgICA8ZyBmaWxsPVwibm9uZVwiIGZpbGwtcnVsZT1cImV2ZW5vZGRcIiBzdHJva2Utd2lkdGg9XCIyXCI+XFxuICAgICAgICAgICAgICAgICAgICA8Y2lyY2xlIGN4PVwiMjJcIiBjeT1cIjIyXCIgcj1cIjE2LjY0MzdcIj5cXG4gICAgICAgICAgICAgICAgICAgICAgICA8YW5pbWF0ZSBhdHRyaWJ1dGVOYW1lPVwiclwiIGJlZ2luPVwiMHNcIiBkdXI9XCIxLjhzXCIgdmFsdWVzPVwiMTsgMjBcIiBjYWxjTW9kZT1cInNwbGluZVwiIGtleVRpbWVzPVwiMDsgMVwiIGtleVNwbGluZXM9XCIwLjE2NSwgMC44NCwgMC40NCwgMVwiIHJlcGVhdENvdW50PVwiaW5kZWZpbml0ZVwiPjwvYW5pbWF0ZT5cXG4gICAgICAgICAgICAgICAgICAgICAgICA8YW5pbWF0ZSBhdHRyaWJ1dGVOYW1lPVwic3Ryb2tlLW9wYWNpdHlcIiBiZWdpbj1cIjBzXCIgZHVyPVwiMS44c1wiIHZhbHVlcz1cIjE7IDBcIiBjYWxjTW9kZT1cInNwbGluZVwiIGtleVRpbWVzPVwiMDsgMVwiIGtleVNwbGluZXM9XCIwLjMsIDAuNjEsIDAuMzU1LCAxXCIgcmVwZWF0Q291bnQ9XCJpbmRlZmluaXRlXCI+PC9hbmltYXRlPlxcbiAgICAgICAgICAgICAgICAgICAgPC9jaXJjbGU+XFxuICAgICAgICAgICAgICAgICAgICA8Y2lyY2xlIGN4PVwiMjJcIiBjeT1cIjIyXCIgcj1cIjE5LjkyODJcIj5cXG4gICAgICAgICAgICAgICAgICAgICAgICA8YW5pbWF0ZSBhdHRyaWJ1dGVOYW1lPVwiclwiIGJlZ2luPVwiLTAuOXNcIiBkdXI9XCIxLjhzXCIgdmFsdWVzPVwiMTsgMjBcIiBjYWxjTW9kZT1cInNwbGluZVwiIGtleVRpbWVzPVwiMDsgMVwiIGtleVNwbGluZXM9XCIwLjE2NSwgMC44NCwgMC40NCwgMVwiIHJlcGVhdENvdW50PVwiaW5kZWZpbml0ZVwiPjwvYW5pbWF0ZT5cXG4gICAgICAgICAgICAgICAgICAgICAgICA8YW5pbWF0ZSBhdHRyaWJ1dGVOYW1lPVwic3Ryb2tlLW9wYWNpdHlcIiBiZWdpbj1cIi0wLjlzXCIgZHVyPVwiMS44c1wiIHZhbHVlcz1cIjE7IDBcIiBjYWxjTW9kZT1cInNwbGluZVwiIGtleVRpbWVzPVwiMDsgMVwiIGtleVNwbGluZXM9XCIwLjMsIDAuNjEsIDAuMzU1LCAxXCIgcmVwZWF0Q291bnQ9XCJpbmRlZmluaXRlXCI+PC9hbmltYXRlPlxcbiAgICAgICAgICAgICAgICAgICAgPC9jaXJjbGU+XFxuICAgICAgICAgICAgICAgIDwvZz5cXG4gICAgICAgICAgICA8L3N2Zz5cXG4gICAgICAgICAgICA8ZGl2IGNsYXNzPVwiYmFjLS11c2VyLWFwcHNcIiBpZD1cIi0tcHVyZXNkay1hcHBzLXNlY3Rpb24tLVwiPlxcbiAgICAgICAgICAgICAgICA8ZGl2IGlkPVwiLS1wdXJlc2RrLS1hcHBzLS1vcGVuZXItLVwiPlxcbiAgICAgICAgICAgICAgICAgICAgPGkgY2xhc3M9XCJmYSBmYS1zcXVhcmVzXCIgaWQ9XCItLXB1cmVzZGstYXBwcy1pY29uLS1cIj48L2k+XFxuICAgICAgICAgICAgICAgICAgICA8ZGl2IGNsYXNzPVwiLS1wdXJlc2RrLWFwcHMtbmFtZS0tXCI+YXBwczwvZGl2PlxcbiAgICAgICAgICAgICAgICA8L2Rpdj5cXG4gICAgICAgICAgICAgICAgPGRpdiBjbGFzcz1cImJhYy0tYXBwcy1jb250YWluZXJcIiBpZD1cIi0tcHVyZXNkay1hcHBzLWNvbnRhaW5lci0tXCI+XFxuICAgICAgICAgICAgICAgICAgICA8ZGl2IGNsYXNzPVwiYmFjLS1hcHBzLWFycm93XCI+PC9kaXY+XFxuICAgICAgICAgICAgICAgIDwvZGl2PlxcbiAgICAgICAgICAgIDwvZGl2PlxcbiAgICAgICAgICAgIDwhLS08ZGl2IGNsYXNzPVwiYmFjJiM0NTsmIzQ1O3VzZXItbm90aWZpY2F0aW9uc1wiPi0tPlxcbiAgICAgICAgICAgICAgICA8IS0tPGRpdiBjbGFzcz1cImJhYyYjNDU7JiM0NTt1c2VyLW5vdGlmaWNhdGlvbnMtY291bnRcIj4xPC9kaXY+LS0+XFxuICAgICAgICAgICAgICAgIDwhLS08aSBjbGFzcz1cImZhIGZhLWJlbGwtb1wiPjwvaT4tLT5cXG4gICAgICAgICAgICA8IS0tPC9kaXY+LS0+XFxuICAgICAgICAgICAgPGRpdiBjbGFzcz1cImJhYy0tdXNlci1hdmF0YXJcIiBpZD1cImJhYy0tdXNlci1hdmF0YXItdG9wXCI+XFxuICAgICAgICAgICAgICAgIDxzcGFuIGNsYXNzPVwiYmFjLS11c2VyLWF2YXRhci1uYW1lXCIgaWQ9XCItLXB1cmVzZGstdXNlci1hdmF0YXItLVwiPjwvc3Bhbj5cXG4gICAgICAgICAgICAgICAgPGRpdiBpZD1cImJhYy0taW1hZ2UtY29udGFpbmVyLXRvcFwiPjwvZGl2PlxcbiAgICAgICAgICAgIDwvZGl2PlxcbiAgICAgICAgPC9kaXY+XFxuICAgIDwvZGl2PlxcbiAgICA8ZGl2IGlkPVwiYmFjLS1pbmZvLWJsb2Nrcy13cmFwcGVyLS1cIj48L2Rpdj5cXG48L2hlYWRlcj5cXG48ZGl2IGNsYXNzPVwiYmFjLS11c2VyLXNpZGViYXJcIiBpZD1cIi0tcHVyZXNkay11c2VyLXNpZGViYXItLVwiPlxcbiAgICA8ZGl2IGlkPVwiLS1wdXJlc2RrLXVzZXItZGV0YWlscy0tXCI+PC9kaXY+XFxuICAgIDwhLS08ZGl2IGNsYXNzPVwiYmFjJiM0NTsmIzQ1O3VzZXItc2lkZWJhci1pbmZvXCI+LS0+XFxuICAgICAgICA8IS0tPGRpdiBjbGFzcz1cImJhYyYjNDU7JiM0NTt1c2VyLWltYWdlXCI+PGkgY2xhc3M9XCJmYSBmYS1jYW1lcmFcIj48L2k+PC9kaXY+LS0+XFxuICAgICAgICA8IS0tPGRpdiBjbGFzcz1cImJhYyYjNDU7JiM0NTt1c2VyLW5hbWVcIj5DdXJ0aXMgQmFydGxldHQ8L2Rpdj4tLT5cXG4gICAgICAgIDwhLS08ZGl2IGNsYXNzPVwiYmFjJiM0NTsmIzQ1O3VzZXItZW1haWxcIj5jYmFydGxldHRAcHVyZXByb2ZpbGUuY29tPC9kaXY+LS0+XFxuICAgIDwhLS08L2Rpdj4tLT5cXG4gICAgPGRpdiBjbGFzcz1cImJhYy0tdXNlci1hcHBzXCIgaWQ9XCItLXB1cmVzZGstdXNlci1idXNpbmVzc2VzLS1cIj5cXG4gICAgICAgIDwhLS08ZGl2IGNsYXNzPVwiYmFjJiM0NTsmIzQ1O3VzZXItbGlzdC1pdGVtXCI+LS0+XFxuICAgICAgICAgICAgPCEtLTxpbWcgc3JjPVwiaHR0cDovL2xvcmVtcGl4ZWwuY29tLzQwLzQwXCIgYWx0PVwiXCI+LS0+XFxuICAgICAgICAgICAgPCEtLTxkaXYgY2xhc3M9XCJiYWMtdXNlci1hcHAtZGV0YWlsc1wiPi0tPlxcbiAgICAgICAgICAgICAgICA8IS0tPHNwYW4+PC9zcGFuPi0tPlxcbiAgICAgICAgICAgICAgICA8IS0tPHNwYW4+MTUgdGVhbSBtZW1iZXJzPC9zcGFuPi0tPlxcbiAgICAgICAgICAgIDwhLS08L2Rpdj4tLT5cXG4gICAgICAgIDwhLS08L2Rpdj4tLT5cXG4gICAgPC9kaXY+XFxuICAgIDxkaXYgY2xhc3M9XCJiYWMtLXVzZXItYWNjb3VudC1zZXR0aW5nc1wiPlxcbiAgICAgICAgPCEtLTxkaXYgY2xhc3M9XCJiYWMtdXNlci1hY291bnQtbGlzdC1pdGVtXCI+LS0+XFxuICAgICAgICAgICAgPCEtLTxpIGNsYXNzPVwiZmEgZmEtY29nLWxpbmVcIj48L2k+LS0+XFxuICAgICAgICAgICAgPCEtLTxhIGhyZWY9XCIjXCI+QWNjb3VudCBTZWN1cml0eTwvYT4tLT5cXG4gICAgICAgIDwhLS08L2Rpdj4tLT5cXG4gICAgICAgIDxkaXYgY2xhc3M9XCJiYWMtdXNlci1hY291bnQtbGlzdC1pdGVtXCI+XFxuICAgICAgICAgICAgPGkgY2xhc3M9XCJmYSBmYS1sb2dpbi1saW5lXCI+PC9pPlxcbiAgICAgICAgICAgIDxhIGhyZWY9XCIvYXBpL3YxL3NpZ24tb2ZmXCI+TG9nIG91dDwvYT5cXG4gICAgICAgIDwvZGl2PlxcbiAgICA8L2Rpdj5cXG48L2Rpdj5cXG48aW5wdXQgc3R5bGU9XCJkaXNwbGF5Om5vbmVcIiB0eXBlPVxcJ2ZpbGVcXCcgaWQ9XFwnLS0tcHVyZXNkay1hdmF0YXItZmlsZVxcJz5cXG48aW5wdXQgc3R5bGU9XCJkaXNwbGF5Om5vbmVcIiB0eXBlPVxcJ2J1dHRvblxcJyBpZD1cXCctLS1wdXJlc2RrLWF2YXRhci1zdWJtaXRcXCcgdmFsdWU9XFwnVXBsb2FkIVxcJz4nKTtcblxud2luZG93LlBVUkVTREsgPSBwcGJhO1xuXG52YXIgY3NzID0gJ2h0bWwsYm9keSxkaXYsc3BhbixhcHBsZXQsb2JqZWN0LGlmcmFtZSxoMSxoMixoMyxoNCxoNSxoNixwLGJsb2NrcXVvdGUscHJlLGEsYWJicixhY3JvbnltLGFkZHJlc3MsYmlnLGNpdGUsY29kZSxkZWwsZGZuLGVtLGltZyxpbnMsa2JkLHEscyxzYW1wLHNtYWxsLHN0cmlrZSxzdHJvbmcsc3ViLHN1cCx0dCx2YXIsYix1LGksY2VudGVyLGRsLGR0LGRkLG9sLHVsLGxpLGZpZWxkc2V0LGZvcm0sbGFiZWwsbGVnZW5kLHRhYmxlLGNhcHRpb24sdGJvZHksdGZvb3QsdGhlYWQsdHIsdGgsdGQsYXJ0aWNsZSxhc2lkZSxjYW52YXMsZGV0YWlscyxlbWJlZCxmaWd1cmUsZmlnY2FwdGlvbixmb290ZXIsaGVhZGVyLGhncm91cCxtZW51LG5hdixvdXRwdXQscnVieSxzZWN0aW9uLHN1bW1hcnksdGltZSxtYXJrLGF1ZGlvLHZpZGVve21hcmdpbjowO3BhZGRpbmc6MDtib3JkZXI6MDtmb250LXNpemU6MTAwJTtmb250OmluaGVyaXQ7dmVydGljYWwtYWxpZ246YmFzZWxpbmV9YXJ0aWNsZSxhc2lkZSxkZXRhaWxzLGZpZ2NhcHRpb24sZmlndXJlLGZvb3RlcixoZWFkZXIsaGdyb3VwLG1lbnUsbmF2LHNlY3Rpb257ZGlzcGxheTpibG9ja31ib2R5e2xpbmUtaGVpZ2h0OjF9b2wsdWx7bGlzdC1zdHlsZTpub25lfWJsb2NrcXVvdGUscXtxdW90ZXM6bm9uZX1ibG9ja3F1b3RlOmJlZm9yZSxibG9ja3F1b3RlOmFmdGVyLHE6YmVmb3JlLHE6YWZ0ZXJ7Y29udGVudDpcIlwiO2NvbnRlbnQ6bm9uZX10YWJsZXtib3JkZXItY29sbGFwc2U6Y29sbGFwc2U7Ym9yZGVyLXNwYWNpbmc6MH1ib2R5e292ZXJmbG93LXg6aGlkZGVufSNiYWMtd3JhcHBlcntmb250LWZhbWlseTpcIlZlcmRhbmFcIiwgYXJpYWwsIHNhbnMtc2VyaWY7Y29sb3I6d2hpdGU7bWluLWhlaWdodDoxMDB2aDtwb3NpdGlvbjpyZWxhdGl2ZX0uYmFjLS1jb250YWluZXJ7bWF4LXdpZHRoOjExNjBweDttYXJnaW46MCBhdXRvfS5iYWMtLWhlYWRlci1hcHBze3Bvc2l0aW9uOmFic29sdXRlO3dpZHRoOjEwMCU7aGVpZ2h0OjUwcHg7YmFja2dyb3VuZC1jb2xvcjojNDc1MzY5O3BhZGRpbmc6NXB4IDA7ei1pbmRleDo5OTk5OTk5fS5iYWMtLWhlYWRlci1hcHBzIC5iYWMtLWNvbnRhaW5lcntoZWlnaHQ6MTAwJTtkaXNwbGF5OmZsZXg7YWxpZ24taXRlbXM6Y2VudGVyO2p1c3RpZnktY29udGVudDpzcGFjZS1iZXR3ZWVufS5iYWMtLWhlYWRlci1zZWFyY2h7cG9zaXRpb246cmVsYXRpdmV9LmJhYy0taGVhZGVyLXNlYXJjaCBpbnB1dHtjb2xvcjojZmZmO2ZvbnQtc2l6ZToxNHB4O2hlaWdodDozNXB4O2JhY2tncm91bmQtY29sb3I6IzZiNzU4NjtwYWRkaW5nOjAgNXB4IDAgMTBweDtib3JkZXI6bm9uZTtib3JkZXItcmFkaXVzOjNweDttaW4td2lkdGg6NDAwcHg7d2lkdGg6MTAwJX0uYmFjLS1oZWFkZXItc2VhcmNoIGlucHV0OmZvY3Vze291dGxpbmU6bm9uZX0uYmFjLS1oZWFkZXItc2VhcmNoIGlucHV0Ojotd2Via2l0LWlucHV0LXBsYWNlaG9sZGVye2ZvbnQtc3R5bGU6bm9ybWFsICFpbXBvcnRhbnQ7dGV4dC1hbGlnbjpjZW50ZXI7Y29sb3I6I2ZmZjtmb250LXNpemU6MTRweDtmb250LXdlaWdodDozMDA7bGV0dGVyLXNwYWNpbmc6MC41cHh9LmJhYy0taGVhZGVyLXNlYXJjaCBpbnB1dDo6LW1vei1wbGFjZWhvbGRlcntmb250LXN0eWxlOm5vcm1hbCAhaW1wb3J0YW50O3RleHQtYWxpZ246Y2VudGVyO2NvbG9yOiNmZmY7Zm9udC1zaXplOjE0cHg7Zm9udC13ZWlnaHQ6MzAwO2xldHRlci1zcGFjaW5nOjAuNXB4fS5iYWMtLWhlYWRlci1zZWFyY2ggaW5wdXQ6LW1zLWlucHV0LXBsYWNlaG9sZGVye2ZvbnQtc3R5bGU6bm9ybWFsICFpbXBvcnRhbnQ7dGV4dC1hbGlnbjpjZW50ZXI7Y29sb3I6I2ZmZjtmb250LXNpemU6MTRweDtmb250LXdlaWdodDozMDA7bGV0dGVyLXNwYWNpbmc6MC41cHh9LmJhYy0taGVhZGVyLXNlYXJjaCBpe3Bvc2l0aW9uOmFic29sdXRlO3RvcDo4cHg7cmlnaHQ6MTBweH0uYmFjLS11c2VyLWFjdGlvbnN7ZGlzcGxheTpmbGV4O2FsaWduLWl0ZW1zOmNlbnRlcn0uYmFjLS11c2VyLWFjdGlvbnM+ZGl2e2N1cnNvcjpwb2ludGVyO2NvbG9yOndoaXRlfS5iYWMtLXVzZXItYWN0aW9ucyAuYmFjLS11c2VyLW5vdGlmaWNhdGlvbnN7cG9zaXRpb246cmVsYXRpdmV9LmJhYy0tdXNlci1hY3Rpb25zIC5iYWMtLXVzZXItbm90aWZpY2F0aW9ucyBpe2ZvbnQtc2l6ZToyMHB4fS5iYWMtLXVzZXItYWN0aW9ucyAjLS1wdXJlc2RrLS1sb2FkZXItLXtkaXNwbGF5Om5vbmV9LmJhYy0tdXNlci1hY3Rpb25zICMtLXB1cmVzZGstLWxvYWRlci0tLi0tcHVyZXNkay12aXNpYmxle2Rpc3BsYXk6YmxvY2t9LmJhYy0tdXNlci1hY3Rpb25zIC5iYWMtLXVzZXItbm90aWZpY2F0aW9ucy1jb3VudHtwb3NpdGlvbjphYnNvbHV0ZTtkaXNwbGF5OmlubGluZS1ibG9jaztoZWlnaHQ6MTVweDt3aWR0aDoxNXB4O2xpbmUtaGVpZ2h0OjE1cHg7Y29sb3I6I2ZmZjtmb250LXNpemU6MTBweDt0ZXh0LWFsaWduOmNlbnRlcjtiYWNrZ3JvdW5kLWNvbG9yOiNmYzNiMzA7Ym9yZGVyLXJhZGl1czo1MCU7dG9wOi01cHg7bGVmdDotNXB4fS5iYWMtLXVzZXItYWN0aW9ucyAuYmFjLS11c2VyLWF2YXRhciwuYmFjLS11c2VyLWFjdGlvbnMgLmJhYy0tdXNlci1ub3RpZmljYXRpb25ze21hcmdpbi1sZWZ0OjIwcHh9LmJhYy0tdXNlci1hY3Rpb25zIC5iYWMtLXVzZXItYXZhdGFye3Bvc2l0aW9uOnJlbGF0aXZlO292ZXJmbG93OmhpZGRlbjtib3JkZXItcmFkaXVzOjUwJX0uYmFjLS11c2VyLWFjdGlvbnMgLmJhYy0tdXNlci1hdmF0YXIgI2JhYy0taW1hZ2UtY29udGFpbmVyLXRvcHt3aWR0aDoxMDAlO2hlaWd0aDoxMDAlO3Bvc2l0aW9uOmFic29sdXRlO3RvcDowO2xlZnQ6MDt6LWluZGV4OjE7ZGlzcGxheTpub25lfS5iYWMtLXVzZXItYWN0aW9ucyAuYmFjLS11c2VyLWF2YXRhciAjYmFjLS1pbWFnZS1jb250YWluZXItdG9wIGltZ3t3aWR0aDoxMDAlO2hlaWdodDoxMDAlfS5iYWMtLXVzZXItYWN0aW9ucyAuYmFjLS11c2VyLWF2YXRhciAjYmFjLS1pbWFnZS1jb250YWluZXItdG9wLi0tcHVyZXNkay12aXNpYmxle2Rpc3BsYXk6YmxvY2t9LmJhYy0tdXNlci1hY3Rpb25zIC5iYWMtLXVzZXItYXZhdGFyLW5hbWV7Y29sb3I6I2ZmZjtiYWNrZ3JvdW5kLWNvbG9yOiNhZGFkYWQ7ZGlzcGxheTppbmxpbmUtYmxvY2s7aGVpZ2h0OjMwcHg7d2lkdGg6MzBweDtsaW5lLWhlaWdodDozMHB4O3RleHQtYWxpZ246Y2VudGVyO2ZvbnQtc2l6ZToxNHB4fS5iYWMtLXVzZXItYXBwc3twb3NpdGlvbjpyZWxhdGl2ZX0uYmFjLS11c2VyLWFwcHMgIy0tcHVyZXNkay1hcHBzLWljb24tLXt3aWR0aDoyMHB4O2Rpc3BsYXk6aW5saW5lLWJsb2NrO3RleHQtYWxpZ246Y2VudGVyfS5iYWMtLXVzZXItYXBwcyAuLS1wdXJlc2RrLWFwcHMtbmFtZS0te2ZvbnQtc2l6ZTo4cHg7d2lkdGg6MjBweDt0ZXh0LWFsaWduOmNlbnRlcn0jLS1wdXJlc2RrLXVzZXItYnVzaW5lc3Nlcy0te2hlaWdodDpjYWxjKDEwMHZoIC0gNDU4cHgpO292ZXJmbG93OmF1dG99LmJhYy0tYXBwcy1jb250YWluZXJ7YmFja2dyb3VuZDojZmZmO3Bvc2l0aW9uOmFic29sdXRlO3RvcDo0NXB4O3JpZ2h0Oi00MHB4O2Rpc3BsYXk6ZmxleDt3aWR0aDozNjBweDtmbGV4LXdyYXA6d3JhcDtib3JkZXItcmFkaXVzOjEwcHg7cGFkZGluZzozMHB4O2p1c3RpZnktY29udGVudDpzcGFjZS1iZXR3ZWVuO3RleHQtYWxpZ246Y2VudGVyOy13ZWJraXQtYm94LXNoYWRvdzowIDAgMTBweCAycHggcmdiYSgwLDAsMCwwLjIpO2JveC1zaGFkb3c6MCAwIDEwcHggMnB4IHJnYmEoMCwwLDAsMC4yKTtvcGFjaXR5OjA7dmlzaWJpbGl0eTpoaWRkZW47dHJhbnNpdGlvbjphbGwgMC40cyBlYXNlfS5iYWMtLWFwcHMtY29udGFpbmVyLmFjdGl2ZXtvcGFjaXR5OjE7dmlzaWJpbGl0eTp2aXNpYmxlfS5iYWMtLWFwcHMtY29udGFpbmVyIC5iYWMtLWFwcHMtYXJyb3d7cG9zaXRpb246YWJzb2x1dGU7ZGlzcGxheTpibG9jaztoZWlnaHQ6MjBweDt3aWR0aDoyMHB4O3RvcDotMTBweDtyaWdodDozNnB4O2JhY2tncm91bmQ6I2ZmZjt0cmFuc2Zvcm06cm90YXRlKC00NWRlZyk7ei1pbmRleDoxfS5iYWMtLWFwcHMtY29udGFpbmVyIC5iYWMtLWFwcHN7d2lkdGg6MzIlO2Rpc3BsYXk6ZmxleDtmb250LXNpemU6MzBweDttYXJnaW4tYm90dG9tOjQwcHg7dGV4dC1hbGlnbjpjZW50ZXI7anVzdGlmeS1jb250ZW50OmNlbnRlcjtmbGV4LXdyYXA6d3JhcH0uYmFjLS1hcHBzLWNvbnRhaW5lciAuYmFjLS1hcHBzIGF7ZGlzcGxheTpibG9jaztjb2xvcjojZmZmO3RleHQtZGVjb3JhdGlvbjpub25lO3dpZHRoOjY1cHg7aGVpZ2h0OjY1cHg7cGFkZGluZy10b3A6M3B4O2xpbmUtaGVpZ2h0OjY1cHg7dGV4dC1hbGlnbjpjZW50ZXI7Ym9yZGVyLXJhZGl1czoxMHB4Oy13ZWJraXQtYm94LXNoYWRvdzowIDAgNXB4IDAgcmdiYSgwLDAsMCwwLjIpO2JveC1zaGFkb3c6MCAwIDVweCAwIHJnYmEoMCwwLDAsMC4yKX0uYmFjLS1hcHBzLWNvbnRhaW5lciAuYmFjLS1hcHBzIC5iYWMtLWFwcC1uYW1le3dpZHRoOjEwMCU7Y29sb3I6IzAwMDtmb250LXNpemU6MTRweDtwYWRkaW5nOjEwcHggMCA1cHggMH0uYmFjLS1hcHBzLWNvbnRhaW5lciAuYmFjLS1hcHBzIC5iYWMtLWFwcC1kZXNjcmlwdGlvbntjb2xvcjojOTE5MTkxO2ZvbnQtc2l6ZToxMnB4O2ZvbnQtc3R5bGU6aXRhbGljO2xpbmUtaGVpZ2h0OjEuM2VtfS5iYWMtLXVzZXItc2lkZWJhcntmb250LWZhbWlseTpcIlZlcmRhbmFcIiwgYXJpYWwsIHNhbnMtc2VyaWY7Y29sb3I6d2hpdGU7aGVpZ2h0OmNhbGMoMTAwdmggLSA1MHB4KTtiYWNrZ3JvdW5kLWNvbG9yOiM1MTVmNzc7Ym94LXNpemluZzpib3JkZXItYm94O3dpZHRoOjMyMHB4O3Bvc2l0aW9uOmFic29sdXRlO3RvcDowO3JpZ2h0OjA7ei1pbmRleDo5OTk5OTk7cGFkZGluZy10b3A6MTBweDtvcGFjaXR5OjA7bWFyZ2luLXRvcDo1MHB4O3RyYW5zZm9ybTp0cmFuc2xhdGVYKDEwMCUpO3RyYW5zaXRpb246YWxsIDAuNHMgZWFzZX0uYmFjLS11c2VyLXNpZGViYXIuYWN0aXZle29wYWNpdHk6MTt0cmFuc2Zvcm06dHJhbnNsYXRlWCgwJSl9LmJhYy0tdXNlci1zaWRlYmFyIC5iYWMtLXVzZXItbGlzdC1pdGVte2Rpc3BsYXk6ZmxleDtjdXJzb3I6cG9pbnRlcjthbGlnbi1pdGVtczpjZW50ZXI7cGFkZGluZzoxMHB4IDEwcHggMTBweCA0MHB4O2JvcmRlci1ib3R0b206MnB4IHNvbGlkICM2Yjc1ODZ9LmJhYy0tdXNlci1zaWRlYmFyIC5iYWMtLXVzZXItbGlzdC1pdGVtOmhvdmVye2JhY2tncm91bmQtY29sb3I6IzZiNzU4Nn0uYmFjLS11c2VyLXNpZGViYXIgLmJhYy0tdXNlci1saXN0LWl0ZW0gLmJhYy0tdXNlci1saXN0LWl0ZW0taW1hZ2V7d2lkdGg6NDBweDtoZWlnaHQ6NDBweDtib3JkZXItcmFkaXVzOjNweDtib3JkZXI6MnB4IHNvbGlkICNmZmY7bWFyZ2luLXJpZ2h0OjIwcHg7ZGlzcGxheTpmbGV4O2FsaWduLWl0ZW1zOmNlbnRlcjtqdXN0aWZ5LWNvbnRlbnQ6Y2VudGVyfS5iYWMtLXVzZXItc2lkZWJhciAuYmFjLS11c2VyLWxpc3QtaXRlbSAuYmFjLS11c2VyLWxpc3QtaXRlbS1pbWFnZT5pbWd7d2lkdGg6YXV0bztoZWlnaHQ6YXV0bzttYXgtd2lkdGg6MTAwJTttYXgtaGVpZ2h0OjEwMCV9LmJhYy0tdXNlci1zaWRlYmFyIC5iYWMtLXVzZXItbGlzdC1pdGVtIHNwYW57d2lkdGg6MTAwJTtkaXNwbGF5OmJsb2NrO21hcmdpbi1ib3R0b206NXB4fS5iYWMtLXVzZXItc2lkZWJhciAuYmFjLXVzZXItYXBwLWRldGFpbHMgc3Bhbntmb250LXNpemU6MTJweH0uYmFjLS11c2VyLXNpZGViYXItaW5mb3tkaXNwbGF5OmZsZXg7anVzdGlmeS1jb250ZW50OmNlbnRlcjtmbGV4LXdyYXA6d3JhcDt0ZXh0LWFsaWduOmNlbnRlcjtwYWRkaW5nOjEwcHggMjBweCAxNXB4fS5iYWMtLXVzZXItc2lkZWJhci1pbmZvIC5iYWMtLXVzZXItaW1hZ2V7Ym9yZGVyOjFweCAjYWRhZGFkIHNvbGlkO292ZXJmbG93OmhpZGRlbjtib3JkZXItcmFkaXVzOjUwJTtwb3NpdGlvbjpyZWxhdGl2ZTtjdXJzb3I6cG9pbnRlcjtkaXNwbGF5OmlubGluZS1ibG9jaztoZWlnaHQ6ODBweDt3aWR0aDo4MHB4O2xpbmUtaGVpZ2h0OjgwcHg7dGV4dC1hbGlnbjpjZW50ZXI7Y29sb3I6I2ZmZjtib3JkZXItcmFkaXVzOjUwJTtiYWNrZ3JvdW5kLWNvbG9yOiNhZGFkYWQ7bWFyZ2luLWJvdHRvbToxNXB4fS5iYWMtLXVzZXItc2lkZWJhci1pbmZvIC5iYWMtLXVzZXItaW1hZ2UgI2JhYy0tdXNlci1pbWFnZS1maWxle2Rpc3BsYXk6bm9uZTtwb3NpdGlvbjphYnNvbHV0ZTt6LWluZGV4OjE7dG9wOjA7bGVmdDowO3dpZHRoOjEwMCU7aGVpZ2h0OjEwMCV9LmJhYy0tdXNlci1zaWRlYmFyLWluZm8gLmJhYy0tdXNlci1pbWFnZSAjYmFjLS11c2VyLWltYWdlLWZpbGUgaW1ne3dpZHRoOjEwMCU7aGVpZ2h0OjEwMCV9LmJhYy0tdXNlci1zaWRlYmFyLWluZm8gLmJhYy0tdXNlci1pbWFnZSAjYmFjLS11c2VyLWltYWdlLWZpbGUuLS1wdXJlc2RrLXZpc2libGV7ZGlzcGxheTpibG9ja30uYmFjLS11c2VyLXNpZGViYXItaW5mbyAuYmFjLS11c2VyLWltYWdlICNiYWMtLXVzZXItaW1hZ2UtdXBsb2FkLXByb2dyZXNze3Bvc2l0aW9uOmFic29sdXRlO3BhZGRpbmctdG9wOjEwcHg7dG9wOjA7YmFja2dyb3VuZDojNjY2O3otaW5kZXg6NDtkaXNwbGF5Om5vbmU7d2lkdGg6MTAwJTtoZWlnaHQ6MTAwJX0uYmFjLS11c2VyLXNpZGViYXItaW5mbyAuYmFjLS11c2VyLWltYWdlICNiYWMtLXVzZXItaW1hZ2UtdXBsb2FkLXByb2dyZXNzLi0tcHVyZXNkay12aXNpYmxle2Rpc3BsYXk6YmxvY2t9LmJhYy0tdXNlci1zaWRlYmFyLWluZm8gLmJhYy0tdXNlci1pbWFnZSBpe2ZvbnQtc2l6ZTozMnB4O2ZvbnQtc2l6ZTozMnB4O3otaW5kZXg6MDtwb3NpdGlvbjphYnNvbHV0ZTt3aWR0aDoxMDAlO2xlZnQ6MDtiYWNrZ3JvdW5kLWNvbG9yOnJnYmEoMCwwLDAsMC41KX0uYmFjLS11c2VyLXNpZGViYXItaW5mbyAuYmFjLS11c2VyLWltYWdlOmhvdmVyIGl7ei1pbmRleDozfS5iYWMtLXVzZXItc2lkZWJhci1pbmZvIC5iYWMtLXVzZXItbmFtZXt3aWR0aDoxMDAlO3RleHQtYWxpZ246Y2VudGVyO2ZvbnQtc2l6ZToxOHB4O21hcmdpbi1ib3R0b206MTBweH0uYmFjLS11c2VyLXNpZGViYXItaW5mbyAuYmFjLS11c2VyLWVtYWlse2ZvbnQtc2l6ZToxMnB4O2ZvbnQtd2VpZ2h0OjMwMH0uYmFjLS11c2VyLWFjY291bnQtc2V0dGluZ3N7cGFkZGluZzo1MHB4fS5iYWMtLXVzZXItYWNjb3VudC1zZXR0aW5ncyAuYmFjLXVzZXItYWNvdW50LWxpc3QtaXRlbXtkaXNwbGF5OmZsZXg7YWxpZ24taXRlbXM6Y2VudGVyO21hcmdpbi1ib3R0b206MzBweH0uYmFjLS11c2VyLWFjY291bnQtc2V0dGluZ3MgLmJhYy11c2VyLWFjb3VudC1saXN0LWl0ZW0gYXt0ZXh0LWRlY29yYXRpb246bm9uZTtjb2xvcjojZmZmfS5iYWMtLXVzZXItYWNjb3VudC1zZXR0aW5ncyAuYmFjLXVzZXItYWNvdW50LWxpc3QtaXRlbSBpe2ZvbnQtc2l6ZToyNHB4O21hcmdpbi1yaWdodDoyMHB4fSMtLXB1cmVzZGstYWNjb3VudC1sb2dvLS17Y3Vyc29yOnBvaW50ZXJ9I2JhYy0taW5mby1ibG9ja3Mtd3JhcHBlci0te3Bvc2l0aW9uOnJlbGF0aXZlfSNiYWMtLWluZm8tYmxvY2tzLXdyYXBwZXItLSAuLS1wdXJlc2RrLWluZm8tYm94LS17Ym9yZGVyLXJhZGl1czowIDAgM3B4IDNweDtvdmVyZmxvdzpoaWRkZW47ei1pbmRleDo5OTk5OTk5OTtwb3NpdGlvbjpmaXhlZDt0b3A6LTQxcHg7d2lkdGg6NDcwcHg7bGVmdDpjYWxjKDUwdncgLSAyMzVweCk7aGVpZ2h0OjQwcHg7LXdlYmtpdC10cmFuc2l0aW9uOnRvcCAwLjRzO3RyYW5zaXRpb246dG9wIDAuNHN9I2JhYy0taW5mby1ibG9ja3Mtd3JhcHBlci0tIC4tLXB1cmVzZGstaW5mby1ib3gtLS5iYWMtLXN1Y2Nlc3N7YmFja2dyb3VuZDojMTREQTlFfSNiYWMtLWluZm8tYmxvY2tzLXdyYXBwZXItLSAuLS1wdXJlc2RrLWluZm8tYm94LS0uYmFjLS1zdWNjZXNzIC5iYWMtLWlubmVyLWluZm8tYm94LS0gZGl2LmJhYy0taW5mby1pY29uLS0uZmEtc3VjY2Vzc3tkaXNwbGF5OmlubGluZS1ibG9ja30jYmFjLS1pbmZvLWJsb2Nrcy13cmFwcGVyLS0gLi0tcHVyZXNkay1pbmZvLWJveC0tLmJhYy0taW5mb3tiYWNrZ3JvdW5kLWNvbG9yOiM1QkMwREV9I2JhYy0taW5mby1ibG9ja3Mtd3JhcHBlci0tIC4tLXB1cmVzZGstaW5mby1ib3gtLS5iYWMtLWluZm8gLmJhYy0taW5uZXItaW5mby1ib3gtLSBkaXYuYmFjLS1pbmZvLWljb24tLS5mYS1pbmZvLTF7ZGlzcGxheTppbmxpbmUtYmxvY2t9I2JhYy0taW5mby1ibG9ja3Mtd3JhcHBlci0tIC4tLXB1cmVzZGstaW5mby1ib3gtLS5iYWMtLXdhcm5pbmd7YmFja2dyb3VuZDojRjBBRDRFfSNiYWMtLWluZm8tYmxvY2tzLXdyYXBwZXItLSAuLS1wdXJlc2RrLWluZm8tYm94LS0uYmFjLS13YXJuaW5nIC5iYWMtLWlubmVyLWluZm8tYm94LS0gZGl2LmJhYy0taW5mby1pY29uLS0uZmEtd2FybmluZ3tkaXNwbGF5OmlubGluZS1ibG9ja30jYmFjLS1pbmZvLWJsb2Nrcy13cmFwcGVyLS0gLi0tcHVyZXNkay1pbmZvLWJveC0tLmJhYy0tZXJyb3J7YmFja2dyb3VuZDojRUY0MTAwfSNiYWMtLWluZm8tYmxvY2tzLXdyYXBwZXItLSAuLS1wdXJlc2RrLWluZm8tYm94LS0uYmFjLS1lcnJvciAuYmFjLS1pbm5lci1pbmZvLWJveC0tIGRpdi5iYWMtLWluZm8taWNvbi0tLmZhLWVycm9ye2Rpc3BsYXk6aW5saW5lLWJsb2NrfSNiYWMtLWluZm8tYmxvY2tzLXdyYXBwZXItLSAuLS1wdXJlc2RrLWluZm8tYm94LS0gLmJhYy0tdGltZXJ7LXdlYmtpdC10cmFuc2l0aW9uLXRpbWluZy1mdW5jdGlvbjpsaW5lYXI7dHJhbnNpdGlvbi10aW1pbmctZnVuY3Rpb246bGluZWFyO3Bvc2l0aW9uOmFic29sdXRlO2JvdHRvbTowcHg7b3BhY2l0eTowLjU7aGVpZ2h0OjJweCAhaW1wb3J0YW50O2JhY2tncm91bmQ6d2hpdGU7d2lkdGg6MCV9I2JhYy0taW5mby1ibG9ja3Mtd3JhcHBlci0tIC4tLXB1cmVzZGstaW5mby1ib3gtLSAuYmFjLS10aW1lci5iYWMtLWZ1bGx3aWR0aHt3aWR0aDoxMDAlfSNiYWMtLWluZm8tYmxvY2tzLXdyYXBwZXItLSAuLS1wdXJlc2RrLWluZm8tYm94LS0uYmFjLS1hY3RpdmUtLXt0b3A6MHB4fSNiYWMtLWluZm8tYmxvY2tzLXdyYXBwZXItLSAuLS1wdXJlc2RrLWluZm8tYm94LS0gLmJhYy0taW5uZXItaW5mby1ib3gtLXt3aWR0aDoxMDAlO3BhZGRpbmc6MTFweCAxNXB4O2NvbG9yOndoaXRlfSNiYWMtLWluZm8tYmxvY2tzLXdyYXBwZXItLSAuLS1wdXJlc2RrLWluZm8tYm94LS0gLmJhYy0taW5uZXItaW5mby1ib3gtLSBkaXZ7ZGlzcGxheTppbmxpbmUtYmxvY2s7aGVpZ2h0OjE4cHg7cG9zaXRpb246cmVsYXRpdmV9I2JhYy0taW5mby1ibG9ja3Mtd3JhcHBlci0tIC4tLXB1cmVzZGstaW5mby1ib3gtLSAuYmFjLS1pbm5lci1pbmZvLWJveC0tIGRpdi5iYWMtLWluZm8taWNvbi0te2Rpc3BsYXk6bm9uZTt0b3A6MHB4fSNiYWMtLWluZm8tYmxvY2tzLXdyYXBwZXItLSAuLS1wdXJlc2RrLWluZm8tYm94LS0gLmJhYy0taW5uZXItaW5mby1ib3gtLSAuYmFjLS1pbmZvLWljb24tLXttYXJnaW4tcmlnaHQ6MTVweDt3aWR0aDoxMHB4O3RvcDoycHh9I2JhYy0taW5mby1ibG9ja3Mtd3JhcHBlci0tIC4tLXB1cmVzZGstaW5mby1ib3gtLSAuYmFjLS1pbm5lci1pbmZvLWJveC0tIC5iYWMtLWluZm8tbWFpbi10ZXh0LS17d2lkdGg6MzgwcHg7bWFyZ2luLXJpZ2h0OjE1cHg7Zm9udC1zaXplOjEycHg7dGV4dC1hbGlnbjpjZW50ZXJ9I2JhYy0taW5mby1ibG9ja3Mtd3JhcHBlci0tIC4tLXB1cmVzZGstaW5mby1ib3gtLSAuYmFjLS1pbm5lci1pbmZvLWJveC0tIC5iYWMtLWluZm8tY2xvc2UtYnV0dG9uLS17d2lkdGg6MTBweDtjdXJzb3I6cG9pbnRlcjt0b3A6MnB4fScsXG4gICAgaGVhZCA9IGRvY3VtZW50LmhlYWQgfHwgZG9jdW1lbnQuZ2V0RWxlbWVudHNCeVRhZ05hbWUoJ2hlYWQnKVswXSxcbiAgICBzdHlsZSA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoJ3N0eWxlJyk7XG5cbnN0eWxlLnR5cGUgPSAndGV4dC9jc3MnO1xuaWYgKHN0eWxlLnN0eWxlU2hlZXQpIHtcbiAgICBzdHlsZS5zdHlsZVNoZWV0LmNzc1RleHQgPSBjc3M7XG59IGVsc2Uge1xuICAgIHN0eWxlLmFwcGVuZENoaWxkKGRvY3VtZW50LmNyZWF0ZVRleHROb2RlKGNzcykpO1xufVxuaGVhZC5hcHBlbmRDaGlsZChzdHlsZSk7XG5cbnZhciBsaW5rID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudCgnbGluaycpO1xubGluay5ocmVmID0gJ2h0dHBzOi8vZmlsZS5teWZvbnRhc3RpYy5jb20vTUR2blJKR2hCZDV4VmNYbjR1UUpTWi9pY29ucy5jc3MnO1xubGluay5yZWwgPSAnc3R5bGVzaGVldCc7XG5cbmRvY3VtZW50LmdldEVsZW1lbnRzQnlUYWdOYW1lKCdoZWFkJylbMF0uYXBwZW5kQ2hpbGQobGluayk7XG5cbm1vZHVsZS5leHBvcnRzID0gcHBiYTsiLCJ2YXIgU3RvcmUgPSByZXF1aXJlKCcuL3N0b3JlJyk7XG52YXIgTG9nZ2VyID0gcmVxdWlyZSgnLi9sb2dnZXInKTtcbnZhciBEb20gPSByZXF1aXJlKCcuL2RvbScpO1xudmFyIENhbGxlciA9IHJlcXVpcmUoJy4vY2FsbGVyJyk7XG5cbnZhciB1cGxvYWRpbmcgPSBmYWxzZTtcblxudmFyIEF2YXRhckN0cmwgPSB7XG5cdF9zdWJtaXQ6IG51bGwsXG5cdF9maWxlOiBudWxsLFxuXHRfcHJvZ3Jlc3M6IG51bGwsXG5cdF9zaWRlYmFyX2F2YXRhcjogbnVsbCxcblx0X3RvcF9hdmF0YXI6IG51bGwsXG5cdF90b3BfYXZhdGFyX2NvbnRhaW5lcjogbnVsbCxcblxuXHRpbml0OiBmdW5jdGlvbiBpbml0KCkge1xuXHRcdEF2YXRhckN0cmwuX3N1Ym1pdCA9IGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKCctLS1wdXJlc2RrLWF2YXRhci1zdWJtaXQnKTtcblx0XHRBdmF0YXJDdHJsLl9maWxlID0gZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoJy0tLXB1cmVzZGstYXZhdGFyLWZpbGUnKTtcblx0XHRBdmF0YXJDdHJsLl90b3BfYXZhdGFyX2NvbnRhaW5lciA9IGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKCdiYWMtLWltYWdlLWNvbnRhaW5lci10b3AnKTtcblx0XHRBdmF0YXJDdHJsLl9wcm9ncmVzcyA9IGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKCdiYWMtLXVzZXItaW1hZ2UtdXBsb2FkLXByb2dyZXNzJyk7XG5cdFx0QXZhdGFyQ3RybC5fc2lkZWJhcl9hdmF0YXIgPSBkb2N1bWVudC5nZXRFbGVtZW50QnlJZCgnYmFjLS11c2VyLWltYWdlLWZpbGUnKTtcblx0XHRBdmF0YXJDdHJsLl90b3BfYXZhdGFyID0gZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoJ2JhYy0tdXNlci1hdmF0YXItdG9wJyk7XG5cdFx0QXZhdGFyQ3RybC5fZmlsZS5hZGRFdmVudExpc3RlbmVyKCdjbGljaycsIGZ1bmN0aW9uIChlKSB7XG5cdFx0XHRlLnN0b3BQcm9wYWdhdGlvbigpO1xuXHRcdH0pO1xuXHRcdEF2YXRhckN0cmwuX2ZpbGUuYWRkRXZlbnRMaXN0ZW5lcignY2hhbmdlJywgZnVuY3Rpb24gKGUpIHtcblx0XHRcdEF2YXRhckN0cmwudXBsb2FkKCk7XG5cdFx0fSk7XG5cblx0XHRkb2N1bWVudC5nZXRFbGVtZW50QnlJZCgnYmFjLS11c2VyLWltYWdlJykuYWRkRXZlbnRMaXN0ZW5lcignY2xpY2snLCBmdW5jdGlvbiAoZSkge1xuXHRcdFx0ZS5zdG9wUHJvcGFnYXRpb24oKTtcblx0XHRcdEF2YXRhckN0cmwuX2ZpbGUuY2xpY2soKTtcblx0XHR9KTtcblx0fSxcblxuXHR1cGxvYWQ6IGZ1bmN0aW9uIHVwbG9hZCgpIHtcblx0XHRpZiAodXBsb2FkaW5nKSB7XG5cdFx0XHRyZXR1cm47XG5cdFx0fVxuXHRcdHVwbG9hZGluZyA9IHRydWU7XG5cblx0XHRpZiAoQXZhdGFyQ3RybC5fZmlsZS5maWxlcy5sZW5ndGggPT09IDApIHtcblx0XHRcdHJldHVybjtcblx0XHR9XG5cblx0XHR2YXIgZGF0YSA9IG5ldyBGb3JtRGF0YSgpO1xuXHRcdGRhdGEuYXBwZW5kKCdmaWxlJywgQXZhdGFyQ3RybC5fZmlsZS5maWxlc1swXSk7XG5cblx0XHR2YXIgc3VjY2Vzc0NhbGxiYWNrID0gZnVuY3Rpb24gc3VjY2Vzc0NhbGxiYWNrKGRhdGEpIHtcblx0XHRcdDtcblx0XHR9O1xuXG5cdFx0dmFyIGZhaWxDYWxsYmFjayA9IGZ1bmN0aW9uIGZhaWxDYWxsYmFjayhkYXRhKSB7XG5cdFx0XHQ7XG5cdFx0fTtcblxuXHRcdHZhciByZXF1ZXN0ID0gbmV3IFhNTEh0dHBSZXF1ZXN0KCk7XG5cdFx0cmVxdWVzdC5vbnJlYWR5c3RhdGVjaGFuZ2UgPSBmdW5jdGlvbiAoKSB7XG5cdFx0XHR1cGxvYWRpbmcgPSBmYWxzZTtcblx0XHRcdGlmIChyZXF1ZXN0LnJlYWR5U3RhdGUgPT0gNCkge1xuXHRcdFx0XHR0cnkge1xuXHRcdFx0XHRcdHZhciBpbWFnZURhdGEgPSBKU09OLnBhcnNlKHJlcXVlc3QucmVzcG9uc2UpLmRhdGE7XG5cdFx0XHRcdFx0QXZhdGFyQ3RybC5zZXRBdmF0YXIoaW1hZ2VEYXRhLnVybCk7XG5cdFx0XHRcdFx0Q2FsbGVyLm1ha2VDYWxsKHtcblx0XHRcdFx0XHRcdHR5cGU6ICdQVVQnLFxuXHRcdFx0XHRcdFx0ZW5kcG9pbnQ6IFN0b3JlLmdldEF2YXRhclVwZGF0ZVVybCgpLFxuXHRcdFx0XHRcdFx0cGFyYW1zOiB7XG5cdFx0XHRcdFx0XHRcdHVzZXI6IHtcblx0XHRcdFx0XHRcdFx0XHRhdmF0YXJfdXVpZDogaW1hZ2VEYXRhLmd1aWRcblx0XHRcdFx0XHRcdFx0fVxuXHRcdFx0XHRcdFx0fSxcblx0XHRcdFx0XHRcdGNhbGxiYWNrczoge1xuXHRcdFx0XHRcdFx0XHRzdWNjZXNzOiBzdWNjZXNzQ2FsbGJhY2ssXG5cdFx0XHRcdFx0XHRcdGZhaWw6IGZhaWxDYWxsYmFja1xuXHRcdFx0XHRcdFx0fVxuXHRcdFx0XHRcdH0pO1xuXHRcdFx0XHR9IGNhdGNoIChlKSB7XG5cdFx0XHRcdFx0dmFyIHJlc3AgPSB7XG5cdFx0XHRcdFx0XHRzdGF0dXM6ICdlcnJvcicsXG5cdFx0XHRcdFx0XHRkYXRhOiAnVW5rbm93biBlcnJvciBvY2N1cnJlZDogWycgKyByZXF1ZXN0LnJlc3BvbnNlVGV4dCArICddJ1xuXHRcdFx0XHRcdH07XG5cdFx0XHRcdH1cblx0XHRcdFx0TG9nZ2VyLmxvZyhyZXF1ZXN0LnJlc3BvbnNlLnN0YXR1cyArICc6ICcgKyByZXF1ZXN0LnJlc3BvbnNlLmRhdGEpO1xuXHRcdFx0fVxuXHRcdH07XG5cblx0XHQvLyByZXF1ZXN0LnVwbG9hZC5hZGRFdmVudExpc3RlbmVyKCdwcm9ncmVzcycsIGZ1bmN0aW9uKGUpe1xuXHRcdC8vIFx0TG9nZ2VyLmxvZyhlLmxvYWRlZC9lLnRvdGFsKTtcblx0XHQvLyBcdEF2YXRhckN0cmwuX3Byb2dyZXNzLnN0eWxlLnRvcCA9IDEwMCAtIChlLmxvYWRlZC9lLnRvdGFsKSAqIDEwMCArICclJztcblx0XHQvLyB9LCBmYWxzZSk7XG5cblx0XHR2YXIgdXJsID0gU3RvcmUuZ2V0QXZhdGFyVXBsb2FkVXJsKCk7XG5cdFx0RG9tLmFkZENsYXNzKEF2YXRhckN0cmwuX3Byb2dyZXNzLCAnLS1wdXJlc2RrLXZpc2libGUnKTtcblx0XHRyZXF1ZXN0Lm9wZW4oJ1BPU1QnLCB1cmwpO1xuXHRcdHJlcXVlc3Quc2VuZChkYXRhKTtcblx0fSxcblxuXHRzZXRBdmF0YXI6IGZ1bmN0aW9uIHNldEF2YXRhcih1cmwpIHtcblx0XHRpZiAoIXVybCkge1xuXHRcdFx0cmV0dXJuO1xuXHRcdH1cblxuXHRcdERvbS5yZW1vdmVDbGFzcyhBdmF0YXJDdHJsLl9wcm9ncmVzcywgJy0tcHVyZXNkay12aXNpYmxlJyk7XG5cdFx0RG9tLmFkZENsYXNzKEF2YXRhckN0cmwuX3NpZGViYXJfYXZhdGFyLCAnLS1wdXJlc2RrLXZpc2libGUnKTtcblx0XHR2YXIgaW1nID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudCgnaW1nJyk7XG5cdFx0aW1nLnNyYyA9IHVybDtcblx0XHRBdmF0YXJDdHJsLl9zaWRlYmFyX2F2YXRhci5pbm5lckhUTUwgPSAnJztcblx0XHRBdmF0YXJDdHJsLl9zaWRlYmFyX2F2YXRhci5hcHBlbmRDaGlsZChpbWcpO1xuXG5cdFx0RG9tLmFkZENsYXNzKEF2YXRhckN0cmwuX3RvcF9hdmF0YXJfY29udGFpbmVyLCAnLS1wdXJlc2RrLXZpc2libGUnKTtcblx0XHR2YXIgaW1nXzIgPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KCdpbWcnKTtcblx0XHRpbWdfMi5zcmMgPSB1cmw7XG5cdFx0QXZhdGFyQ3RybC5fdG9wX2F2YXRhcl9jb250YWluZXIuaW5uZXJIVE1MID0gJyc7XG5cdFx0QXZhdGFyQ3RybC5fdG9wX2F2YXRhcl9jb250YWluZXIuYXBwZW5kQ2hpbGQoaW1nXzIpO1xuXG5cdFx0Ly8gIGJhYy0taW1hZ2UtY29udGFpbmVyLXRvcFxuXHR9XG59O1xuXG5tb2R1bGUuZXhwb3J0cyA9IEF2YXRhckN0cmw7IiwidmFyIFN0b3JlID0gcmVxdWlyZSgnLi9zdG9yZS5qcycpO1xudmFyIExvZ2dlciA9IHJlcXVpcmUoJy4vbG9nZ2VyJyk7XG5cbnZhciBDYWxsZXIgPSB7XG5cdC8qXG4gZXhwZWN0ZSBhdHRyaWJ1dGVzOlxuIC0gdHlwZSAoZWl0aGVyIEdFVCwgUE9TVCwgREVMRVRFLCBQVVQpXG4gLSBlbmRwb2ludFxuIC0gcGFyYW1zIChpZiBhbnkuIEEganNvbiB3aXRoIHBhcmFtZXRlcnMgdG8gYmUgcGFzc2VkIGJhY2sgdG8gdGhlIGVuZHBvaW50KVxuIC0gY2FsbGJhY2tzOiBhbiBvYmplY3Qgd2l0aDpcbiBcdC0gc3VjY2VzczogdGhlIHN1Y2Nlc3MgY2FsbGJhY2tcbiBcdC0gZmFpbDogdGhlIGZhaWwgY2FsbGJhY2tcbiAgKi9cblx0bWFrZUNhbGw6IGZ1bmN0aW9uIG1ha2VDYWxsKGF0dHJzKSB7XG5cdFx0dmFyIGVuZHBvaW50VXJsID0gYXR0cnMuZW5kcG9pbnQ7XG5cblx0XHR2YXIgeGhyID0gbmV3IFhNTEh0dHBSZXF1ZXN0KCk7XG5cdFx0eGhyLm9wZW4oYXR0cnMudHlwZSwgZW5kcG9pbnRVcmwpO1xuXHRcdC8veGhyLndpdGhDcmVkZW50aWFscyA9IHRydWU7XG5cdFx0eGhyLnNldFJlcXVlc3RIZWFkZXIoJ0NvbnRlbnQtVHlwZScsICdhcHBsaWNhdGlvbi9qc29uJyk7XG5cdFx0eGhyLm9ubG9hZCA9IGZ1bmN0aW9uICgpIHtcblx0XHRcdGlmICh4aHIuc3RhdHVzID49IDIwMCAmJiB4aHIuc3RhdHVzIDwgMzAwKSB7XG5cdFx0XHRcdGF0dHJzLmNhbGxiYWNrcy5zdWNjZXNzKEpTT04ucGFyc2UoeGhyLnJlc3BvbnNlVGV4dCkpO1xuXHRcdFx0fSBlbHNlIGlmICh4aHIuc3RhdHVzICE9PSAyMDApIHtcblx0XHRcdFx0YXR0cnMuY2FsbGJhY2tzLmZhaWwoSlNPTi5wYXJzZSh4aHIucmVzcG9uc2VUZXh0KSk7XG5cdFx0XHR9XG5cdFx0fTtcblxuXHRcdGlmICghYXR0cnMucGFyYW1zKSB7XG5cdFx0XHRhdHRycy5wYXJhbXMgPSB7fTtcblx0XHR9XG5cdFx0eGhyLnNlbmQoSlNPTi5zdHJpbmdpZnkoYXR0cnMucGFyYW1zKSk7XG5cdH0sXG5cblx0cHJvbWlzZUNhbGw6IGZ1bmN0aW9uIHByb21pc2VDYWxsKGF0dHJzKSB7XG5cdFx0cmV0dXJuIG5ldyBQcm9taXNlKGZ1bmN0aW9uIChyZXNvbHZlLCByZWplY3QpIHtcblx0XHRcdHZhciB4aHIgPSBuZXcgWE1MSHR0cFJlcXVlc3QoKTtcblx0XHRcdHhoci5vcGVuKGF0dHJzLnR5cGUsIGF0dHJzLmVuZHBvaW50KTtcblx0XHRcdHhoci5zZXRSZXF1ZXN0SGVhZGVyKCdDb250ZW50LVR5cGUnLCAnYXBwbGljYXRpb24vanNvbicpO1xuXHRcdFx0eGhyLm9ubG9hZCA9IGZ1bmN0aW9uICgpIHtcblx0XHRcdFx0aWYgKHRoaXMuc3RhdHVzID49IDIwMCAmJiB0aGlzLnN0YXR1cyA8IDMwMCkge1xuXHRcdFx0XHRcdGF0dHJzLm1pZGRsZXdhcmVzLnN1Y2Nlc3MoSlNPTi5wYXJzZSh4aHIucmVzcG9uc2VUZXh0KSk7XG5cdFx0XHRcdFx0cmVzb2x2ZShKU09OLnBhcnNlKHhoci5yZXNwb25zZVRleHQpKTtcblx0XHRcdFx0fSBlbHNlIHtcblx0XHRcdFx0XHR3aW5kb3cubG9jYXRpb24uaHJlZiA9IFN0b3JlLmdldExvZ2luVXJsKCk7XG5cdFx0XHRcdH1cblx0XHRcdH07XG5cdFx0XHR4aHIub25lcnJvciA9IGZ1bmN0aW9uICgpIHtcblx0XHRcdFx0d2luZG93LmxvY2F0aW9uID0gU3RvcmUuZ2V0TG9naW5VcmwoKTtcblx0XHRcdH07XG5cdFx0XHR4aHIuc2VuZCgpO1xuXHRcdH0pO1xuXHR9XG59O1xuXG5tb2R1bGUuZXhwb3J0cyA9IENhbGxlcjsiLCJ2YXIgRG9tID0ge1xuICAgIGhhc0NsYXNzOiBmdW5jdGlvbiBoYXNDbGFzcyhlbCwgY2xhc3NOYW1lKSB7XG4gICAgICAgIGlmIChlbC5jbGFzc0xpc3QpIHJldHVybiBlbC5jbGFzc0xpc3QuY29udGFpbnMoY2xhc3NOYW1lKTtlbHNlIHJldHVybiBuZXcgUmVnRXhwKCcoXnwgKScgKyBjbGFzc05hbWUgKyAnKCB8JCknLCAnZ2knKS50ZXN0KGVsLmNsYXNzTmFtZSk7XG4gICAgfSxcblxuICAgIHJlbW92ZUNsYXNzOiBmdW5jdGlvbiByZW1vdmVDbGFzcyhlbCwgY2xhc3NOYW1lKSB7XG4gICAgICAgIGlmIChlbC5jbGFzc0xpc3QpIGVsLmNsYXNzTGlzdC5yZW1vdmUoY2xhc3NOYW1lKTtlbHNlIGVsLmNsYXNzTmFtZSA9IGVsLmNsYXNzTmFtZS5yZXBsYWNlKG5ldyBSZWdFeHAoJyhefFxcXFxiKScgKyBjbGFzc05hbWUuc3BsaXQoJyAnKS5qb2luKCd8JykgKyAnKFxcXFxifCQpJywgJ2dpJyksICcgJyk7XG4gICAgfSxcblxuICAgIGFkZENsYXNzOiBmdW5jdGlvbiBhZGRDbGFzcyhlbCwgY2xhc3NOYW1lKSB7XG4gICAgICAgIGlmIChlbC5jbGFzc0xpc3QpIGVsLmNsYXNzTGlzdC5hZGQoY2xhc3NOYW1lKTtlbHNlIGVsLmNsYXNzTmFtZSArPSAnICcgKyBjbGFzc05hbWU7XG4gICAgfSxcblxuICAgIHRvZ2dsZUNsYXNzOiBmdW5jdGlvbiB0b2dnbGVDbGFzcyhlbCwgY2xhc3NOYW1lKSB7XG4gICAgICAgIGlmICh0aGlzLmhhc0NsYXNzKGVsLCBjbGFzc05hbWUpKSB7XG4gICAgICAgICAgICB0aGlzLnJlbW92ZUNsYXNzKGVsLCBjbGFzc05hbWUpO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgdGhpcy5hZGRDbGFzcyhlbCwgY2xhc3NOYW1lKTtcbiAgICAgICAgfVxuICAgIH1cbn07XG5cbm1vZHVsZS5leHBvcnRzID0gRG9tOyIsInZhciBkb20gPSByZXF1aXJlKCcuL2RvbScpO1xuXG52YXIgZGVmYXVsdEhpZGVJbiA9IDUwMDA7XG52YXIgbGFzdEluZGV4ID0gMTtcblxudmFyIGluZm9CbG9ja3MgPSBbXTtcblxudmFyIEluZm9Db250cm9sbGVyID0ge1xuXHRpbml0OiBmdW5jdGlvbiBpbml0KCkge1xuXHRcdGZvciAodmFyIGkgPSAxOyBpIDwgNTsgaSsrKSB7XG5cdFx0XHQoZnVuY3Rpb24geChpKSB7XG5cdFx0XHRcdHZhciBjbG9zZUZ1bmN0aW9uID0gZnVuY3Rpb24gY2xvc2VGdW5jdGlvbigpIHtcblx0XHRcdFx0XHRkb20ucmVtb3ZlQ2xhc3MoZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoJy0tcHVyZXNkay1pbmZvLWJveC0tJyArIGkpLCAnYmFjLS1hY3RpdmUtLScpO1xuXHRcdFx0XHRcdGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKCdiYWMtLXRpbWVyJyArIGkpLnN0eWxlLnRyYW5zaXRpb24gPSAnJztcblx0XHRcdFx0XHRkb20ucmVtb3ZlQ2xhc3MoZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoJ2JhYy0tdGltZXInICsgaSksICdiYWMtLWZ1bGx3aWR0aCcpO1xuXHRcdFx0XHRcdGluZm9CbG9ja3NbaSAtIDFdLmluVXNlID0gZmFsc2U7XG5cdFx0XHRcdFx0c2V0VGltZW91dChmdW5jdGlvbiAoKSB7XG5cdFx0XHRcdFx0XHRpZiAoaW5mb0Jsb2Nrc1tpIC0gMV0uY2xvc2VUaW1lb3V0KSB7XG5cdFx0XHRcdFx0XHRcdGNsZWFyVGltZW91dChpbmZvQmxvY2tzW2kgLSAxXS5jbG9zZVRpbWVvdXQpO1xuXHRcdFx0XHRcdFx0fVxuXHRcdFx0XHRcdFx0ZG9tLnJlbW92ZUNsYXNzKGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKCctLXB1cmVzZGstaW5mby1ib3gtLScgKyBpKSwgJ2JhYy0tc3VjY2VzcycpO1xuXHRcdFx0XHRcdFx0ZG9tLnJlbW92ZUNsYXNzKGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKCctLXB1cmVzZGstaW5mby1ib3gtLScgKyBpKSwgJ2JhYy0taW5mbycpO1xuXHRcdFx0XHRcdFx0ZG9tLnJlbW92ZUNsYXNzKGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKCctLXB1cmVzZGstaW5mby1ib3gtLScgKyBpKSwgJ2JhYy0td2FybmluZycpO1xuXHRcdFx0XHRcdFx0ZG9tLnJlbW92ZUNsYXNzKGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKCctLXB1cmVzZGstaW5mby1ib3gtLScgKyBpKSwgJ2JhYy0tZXJyb3InKTtcblx0XHRcdFx0XHR9LCA0NTApO1xuXHRcdFx0XHR9O1xuXG5cdFx0XHRcdHZhciBhZGRUZXh0ID0gZnVuY3Rpb24gYWRkVGV4dCh0ZXh0KSB7XG5cdFx0XHRcdFx0ZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoJ2JhYy0taW5mby1tYWluLXRleHQtLScgKyBpKS5pbm5lckhUTUwgPSB0ZXh0O1xuXHRcdFx0XHR9O1xuXG5cdFx0XHRcdHZhciBhZGRUaW1lb3V0ID0gZnVuY3Rpb24gYWRkVGltZW91dCh0aW1lb3V0TXNlY3MpIHtcblx0XHRcdFx0XHRkb2N1bWVudC5nZXRFbGVtZW50QnlJZCgnYmFjLS10aW1lcicgKyBpKS5zdHlsZS50cmFuc2l0aW9uID0gJ3dpZHRoICcgKyB0aW1lb3V0TXNlY3MgKyAnbXMnO1xuXHRcdFx0XHRcdGRvbS5hZGRDbGFzcyhkb2N1bWVudC5nZXRFbGVtZW50QnlJZCgnYmFjLS10aW1lcicgKyBpKSwgJ2JhYy0tZnVsbHdpZHRoJyk7XG5cdFx0XHRcdFx0aW5mb0Jsb2Nrc1tpIC0gMV0uY2xvc2VUaW1lb3V0ID0gc2V0VGltZW91dChmdW5jdGlvbiAoKSB7XG5cdFx0XHRcdFx0XHRpbmZvQmxvY2tzW2kgLSAxXS5jbG9zZUZ1bmN0aW9uKCk7XG5cdFx0XHRcdFx0fSwgdGltZW91dE1zZWNzKTtcblx0XHRcdFx0fTtcblxuXHRcdFx0XHRpbmZvQmxvY2tzLnB1c2goe1xuXHRcdFx0XHRcdGlkOiBpLFxuXHRcdFx0XHRcdGluVXNlOiBmYWxzZSxcblx0XHRcdFx0XHRlbGVtZW50OiBkb2N1bWVudC5nZXRFbGVtZW50QnlJZCgnLS1wdXJlc2RrLWluZm8tYm94LS0nICsgaSksXG5cdFx0XHRcdFx0Y2xvc2VGdW5jdGlvbjogY2xvc2VGdW5jdGlvbixcblx0XHRcdFx0XHRhZGRUZXh0OiBhZGRUZXh0LFxuXHRcdFx0XHRcdGFkZFRpbWVvdXQ6IGFkZFRpbWVvdXQsXG5cdFx0XHRcdFx0Y2xvc2VUaW1lb3V0OiBmYWxzZVxuXHRcdFx0XHR9KTtcblx0XHRcdFx0ZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoJ2JhYy0taW5mby1jbG9zZS1idXR0b24tLScgKyBpKS5vbmNsaWNrID0gZnVuY3Rpb24gKGUpIHtcblx0XHRcdFx0XHRjbG9zZUZ1bmN0aW9uKGkpO1xuXHRcdFx0XHR9O1xuXHRcdFx0fSkoaSk7XG5cdFx0fVxuXHR9LFxuXG5cdC8qXG4gIHR5cGU6IG9uZSBvZjpcbiBcdC0gc3VjY2Vzc1xuIFx0LSBpbmZvXG4gXHQtIHdhcm5pbmdcbiBcdC0gZXJyb3JcbiAgdGV4dDogdGhlIHRleHQgdG8gZGlzcGxheVxuICBvcHRpb25zIChvcHRpb25hbCk6IHtcbiAgXHRcdGhpZGVJbjogbWlsbGlzZWNvbmRzIHRvIGhpZGUgaXQuIC0xIGZvciBub3QgaGlkaW5nIGl0IGF0IGFsbC4gRGVmYXVsdCBpcyA1MDAwXG4gIH1cbiAgKi9cblx0c2hvd0luZm86IGZ1bmN0aW9uIHNob3dJbmZvKHR5cGUsIHRleHQsIG9wdGlvbnMpIHtcblx0XHRmb3IgKHZhciBpID0gMDsgaSA8IGluZm9CbG9ja3MubGVuZ3RoOyBpKyspIHtcblx0XHRcdHZhciBpbmZvQmxvY2sgPSBpbmZvQmxvY2tzW2ldO1xuXHRcdFx0aWYgKCFpbmZvQmxvY2suaW5Vc2UpIHtcblx0XHRcdFx0aW5mb0Jsb2NrLmluVXNlID0gdHJ1ZTtcblx0XHRcdFx0aW5mb0Jsb2NrLmVsZW1lbnQuc3R5bGUuekluZGV4ID0gbGFzdEluZGV4O1xuXHRcdFx0XHRpbmZvQmxvY2suYWRkVGV4dCh0ZXh0KTtcblx0XHRcdFx0bGFzdEluZGV4ICs9IDE7XG5cdFx0XHRcdHZhciB0aW1lb3V0bVNlY3MgPSBkZWZhdWx0SGlkZUluO1xuXHRcdFx0XHR2YXIgYXV0b0Nsb3NlID0gdHJ1ZTtcblx0XHRcdFx0aWYgKG9wdGlvbnMpIHtcblx0XHRcdFx0XHRpZiAob3B0aW9ucy5oaWRlSW4gIT0gbnVsbCAmJiBvcHRpb25zLmhpZGVJbiAhPSB1bmRlZmluZWQgJiYgb3B0aW9ucy5oaWRlSW4gIT0gLTEpIHtcblx0XHRcdFx0XHRcdHRpbWVvdXRtU2VjcyA9IG9wdGlvbnMuaGlkZUluO1xuXHRcdFx0XHRcdH0gZWxzZSBpZiAob3B0aW9ucy5oaWRlSW4gPT09IC0xKSB7XG5cdFx0XHRcdFx0XHRhdXRvQ2xvc2UgPSBmYWxzZTtcblx0XHRcdFx0XHR9XG5cdFx0XHRcdH1cblx0XHRcdFx0aWYgKGF1dG9DbG9zZSkge1xuXHRcdFx0XHRcdGluZm9CbG9jay5hZGRUaW1lb3V0KHRpbWVvdXRtU2Vjcyk7XG5cdFx0XHRcdH1cblx0XHRcdFx0ZG9tLmFkZENsYXNzKGluZm9CbG9jay5lbGVtZW50LCAnYmFjLS0nICsgdHlwZSk7XG5cdFx0XHRcdGRvbS5hZGRDbGFzcyhpbmZvQmxvY2suZWxlbWVudCwgJ2JhYy0tYWN0aXZlLS0nKTtcblx0XHRcdFx0cmV0dXJuO1xuXHRcdFx0fVxuXHRcdH1cblx0fVxufTtcblxubW9kdWxlLmV4cG9ydHMgPSBJbmZvQ29udHJvbGxlcjsiLCJ2YXIgU3RvcmUgPSByZXF1aXJlKCcuL3N0b3JlLmpzJyk7XG5cbnZhciBMb2dnZXIgPSB7XG5cdFx0bG9nOiBmdW5jdGlvbiBsb2cod2hhdCkge1xuXHRcdFx0XHRpZiAoIVN0b3JlLmxvZ3NFbmFibGVkKCkpIHtcblx0XHRcdFx0XHRcdHJldHVybiBmYWxzZTtcblx0XHRcdFx0fSBlbHNlIHtcblx0XHRcdFx0XHRcdExvZ2dlci5sb2cgPSBjb25zb2xlLmxvZy5iaW5kKGNvbnNvbGUpO1xuXHRcdFx0XHRcdFx0TG9nZ2VyLmxvZyh3aGF0KTtcblx0XHRcdFx0fVxuXHRcdH0sXG5cdFx0ZXJyb3I6IGZ1bmN0aW9uIGVycm9yKGVycikge1xuXHRcdFx0XHRpZiAoIVN0b3JlLmxvZ3NFbmFibGVkKCkpIHtcblx0XHRcdFx0XHRcdHJldHVybiBmYWxzZTtcblx0XHRcdFx0fSBlbHNlIHtcblx0XHRcdFx0XHRcdExvZ2dlci5lcnJvciA9IGNvbnNvbGUuZXJyb3IuYmluZChjb25zb2xlKTtcblx0XHRcdFx0XHRcdExvZ2dlci5lcnJvcihlcnIpO1xuXHRcdFx0XHR9XG5cdFx0fVxufTtcblxubW9kdWxlLmV4cG9ydHMgPSBMb2dnZXI7IiwiJ3VzZSBzdHJpY3QnO1xuXG52YXIgU3RvcmUgPSByZXF1aXJlKCcuL3N0b3JlLmpzJyk7XG52YXIgTG9nZ2VyID0gcmVxdWlyZSgnLi9sb2dnZXIuanMnKTtcblxudmFyIGF2YWlsYWJsZUxpc3RlbmVycyA9IHtcblx0c2VhcmNoS2V5VXA6IHtcblx0XHRpbmZvOiAnTGlzdGVuZXIgb24ga2V5VXAgb2Ygc2VhcmNoIGlucHV0IG9uIHRvcCBiYXInXG5cdH0sXG5cdHNlYXJjaEVudGVyOiB7XG5cdFx0aW5mbzogJ0xpc3RlbmVyIG9uIGVudGVyIGtleSBwcmVzc2VkIG9uIHNlYXJjaCBpbnB1dCBvbiB0b3AgYmFyJ1xuXHR9LFxuXHRzZWFyY2hPbkNoYW5nZToge1xuXHRcdGluZm86ICdMaXN0ZW5lciBvbiBjaGFuZ2Ugb2YgaW5wdXQgdmFsdWUnXG5cdH1cbn07XG5cbnZhciBQdWJTdWIgPSB7XG5cdGdldEF2YWlsYWJsZUxpc3RlbmVyczogZnVuY3Rpb24gZ2V0QXZhaWxhYmxlTGlzdGVuZXJzKCkge1xuXHRcdHJldHVybiBhdmFpbGFibGVMaXN0ZW5lcnM7XG5cdH0sXG5cblx0c3Vic2NyaWJlOiBmdW5jdGlvbiBzdWJzY3JpYmUoZXZlbnR0LCBmdW5jdCkge1xuXHRcdGlmIChldmVudHQgPT09IFwic2VhcmNoS2V5VXBcIikge1xuXHRcdFx0dmFyIGVsID0gZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoU3RvcmUuZ2V0U2VhcmNoSW5wdXRJZCgpKTtcblx0XHRcdGVsLmFkZEV2ZW50TGlzdGVuZXIoJ2tleXVwJywgZnVuY3QpO1xuXHRcdFx0cmV0dXJuIGZ1bmN0aW9uICgpIHtcblx0XHRcdFx0ZWwucmVtb3ZlRXZlbnRMaXN0ZW5lcigna2V5dXAnLCBmdW5jdCwgZmFsc2UpO1xuXHRcdFx0fTtcblx0XHR9IGVsc2UgaWYgKGV2ZW50dCA9PT0gJ3NlYXJjaEVudGVyJykge1xuXHRcdFx0dmFyIGhhbmRsaW5nRnVuY3QgPSBmdW5jdGlvbiBoYW5kbGluZ0Z1bmN0KGUpIHtcblx0XHRcdFx0aWYgKGUua2V5Q29kZSA9PT0gMTMpIHtcblx0XHRcdFx0XHRmdW5jdChlKTtcblx0XHRcdFx0fVxuXHRcdFx0fTtcblx0XHRcdGVsLmFkZEV2ZW50TGlzdGVuZXIoJ2tleWRvd24nLCBoYW5kbGluZ0Z1bmN0KTtcblx0XHRcdHJldHVybiBmdW5jdGlvbiAoKSB7XG5cdFx0XHRcdGVsLnJlbW92ZUV2ZW50TGlzdGVuZXIoJ2tleWRvd24nLCBoYW5kbGluZ0Z1bmN0LCBmYWxzZSk7XG5cdFx0XHR9O1xuXHRcdH0gZWxzZSBpZiAoZXZlbnR0ID09PSAnc2VhcmNoT25DaGFuZ2UnKSB7XG5cdFx0XHR2YXIgZWwgPSBkb2N1bWVudC5nZXRFbGVtZW50QnlJZChTdG9yZS5nZXRTZWFyY2hJbnB1dElkKCkpO1xuXHRcdFx0ZWwuYWRkRXZlbnRMaXN0ZW5lcignY2hhbmdlJywgZnVuY3QpO1xuXHRcdFx0cmV0dXJuIGZ1bmN0aW9uICgpIHtcblx0XHRcdFx0ZWwucmVtb3ZlRXZlbnRMaXN0ZW5lcigna2V5dXAnLCBmdW5jdCwgZmFsc2UpO1xuXHRcdFx0fTtcblx0XHR9IGVsc2Uge1xuXHRcdFx0TG9nZ2VyLmVycm9yKCdUaGUgZXZlbnQgeW91IHRyaWVkIHRvIHN1YnNjcmliZSBpcyBub3QgYXZhaWxhYmxlIGJ5IHRoZSBsaWJyYXJ5Jyk7XG5cdFx0XHRMb2dnZXIubG9nKCdUaGUgYXZhaWxhYmxlIGV2ZW50cyBhcmU6ICcsIGF2YWlsYWJsZUxpc3RlbmVycyk7XG5cdFx0XHRyZXR1cm4gZnVuY3Rpb24gKCkge307XG5cdFx0fVxuXHR9XG59O1xuXG5tb2R1bGUuZXhwb3J0cyA9IFB1YlN1YjsiLCJ2YXIgc3RhdGUgPSB7XG5cdGdlbmVyYWw6IHt9LFxuXHR1c2VyRGF0YToge30sXG5cdGNvbmZpZ3VyYXRpb246IHt9LFxuXHRodG1sVGVtcGxhdGU6IFwiXCIsXG5cdGFwcHM6IG51bGxcbn07XG5cbmZ1bmN0aW9uIGFzc2VtYmxlKGxpdGVyYWwsIHBhcmFtcykge1xuXHRyZXR1cm4gbmV3IEZ1bmN0aW9uKHBhcmFtcywgXCJyZXR1cm4gYFwiICsgbGl0ZXJhbCArIFwiYDtcIik7XG59XG5cbnZhciBTdG9yZSA9IHtcblx0Z2V0U3RhdGU6IGZ1bmN0aW9uIGdldFN0YXRlKCkge1xuXHRcdHJldHVybiBPYmplY3QuYXNzaWduKHt9LCBzdGF0ZSk7XG5cdH0sXG5cblx0c2V0V2luZG93TmFtZTogZnVuY3Rpb24gc2V0V2luZG93TmFtZSh3bikge1xuXHRcdHN0YXRlLmdlbmVyYWwud2luZG93TmFtZSA9IHduO1xuXHR9LFxuXG5cdC8qXG4gIGNvbmY6XG4gIC0gaGVhZGVyRGl2SWRcbiAgLSBpbmNsdWRlQXBwc01lbnVcbiAgKi9cblx0c2V0Q29uZmlndXJhdGlvbjogZnVuY3Rpb24gc2V0Q29uZmlndXJhdGlvbihjb25mKSB7XG5cdFx0c3RhdGUuY29uZmlndXJhdGlvbiA9IGNvbmY7XG5cdH0sXG5cblx0Z2V0QXBwc1Zpc2libGU6IGZ1bmN0aW9uIGdldEFwcHNWaXNpYmxlKCkge1xuXHRcdGlmIChzdGF0ZS5jb25maWd1cmF0aW9uLmFwcHNWaXNpYmxlID09PSBudWxsIHx8IHN0YXRlLmNvbmZpZ3VyYXRpb24uYXBwc1Zpc2libGUgPT09IHVuZGVmaW5lZCkge1xuXHRcdFx0cmV0dXJuIHRydWU7XG5cdFx0fSBlbHNlIHtcblx0XHRcdHJldHVybiBzdGF0ZS5jb25maWd1cmF0aW9uLmFwcHNWaXNpYmxlO1xuXHRcdH1cblx0fSxcblxuXHRzZXRBcHBzVmlzaWJsZTogZnVuY3Rpb24gc2V0QXBwc1Zpc2libGUoYXBwc1Zpc2libGUpIHtcblx0XHRzdGF0ZS5jb25maWd1cmF0aW9uLmFwcHNWaXNpYmxlID0gYXBwc1Zpc2libGU7XG5cdH0sXG5cblx0c2V0SFRNTFRlbXBsYXRlOiBmdW5jdGlvbiBzZXRIVE1MVGVtcGxhdGUodGVtcGxhdGUpIHtcblx0XHRzdGF0ZS5odG1sVGVtcGxhdGUgPSB0ZW1wbGF0ZTtcblx0fSxcblxuXHRzZXRBcHBzOiBmdW5jdGlvbiBzZXRBcHBzKGFwcHMpIHtcblx0XHRzdGF0ZS5hcHBzID0gYXBwcztcblx0fSxcblxuXHRnZXRMb2dpblVybDogZnVuY3Rpb24gZ2V0TG9naW5VcmwoKSB7XG5cdFx0cmV0dXJuIHN0YXRlLmNvbmZpZ3VyYXRpb24ucm9vdFVybCArIHN0YXRlLmNvbmZpZ3VyYXRpb24ubG9naW5VcmwgKyBcIj9cIiArIHN0YXRlLmNvbmZpZ3VyYXRpb24ucmVkaXJlY3RVcmxQYXJhbSArIFwiPVwiICsgd2luZG93LmxvY2F0aW9uLmhyZWY7XG5cdH0sXG5cblx0Z2V0QXV0aGVudGljYXRpb25FbmRwb2ludDogZnVuY3Rpb24gZ2V0QXV0aGVudGljYXRpb25FbmRwb2ludCgpIHtcblx0XHRyZXR1cm4gc3RhdGUuY29uZmlndXJhdGlvbi5yb290VXJsICsgc3RhdGUuY29uZmlndXJhdGlvbi5iYXNlVXJsICsgJ3Nlc3Npb24nO1xuXHR9LFxuXG5cdGdldFN3aXRjaEFjY291bnRFbmRwb2ludDogZnVuY3Rpb24gZ2V0U3dpdGNoQWNjb3VudEVuZHBvaW50KGFjY291bnRJZCkge1xuXHRcdHJldHVybiBzdGF0ZS5jb25maWd1cmF0aW9uLnJvb3RVcmwgKyBzdGF0ZS5jb25maWd1cmF0aW9uLmJhc2VVcmwgKyAnYWNjb3VudHMvc3dpdGNoLycgKyBhY2NvdW50SWQ7XG5cdH0sXG5cblx0Z2V0QXBwc0VuZHBvaW50OiBmdW5jdGlvbiBnZXRBcHBzRW5kcG9pbnQoKSB7XG5cdFx0cmV0dXJuIHN0YXRlLmNvbmZpZ3VyYXRpb24ucm9vdFVybCArIHN0YXRlLmNvbmZpZ3VyYXRpb24uYmFzZVVybCArICdhcHBzJztcblx0fSxcblxuXHRsb2dzRW5hYmxlZDogZnVuY3Rpb24gbG9nc0VuYWJsZWQoKSB7XG5cdFx0cmV0dXJuIHN0YXRlLmNvbmZpZ3VyYXRpb24ubG9ncztcblx0fSxcblxuXHRnZXRTZWFyY2hJbnB1dElkOiBmdW5jdGlvbiBnZXRTZWFyY2hJbnB1dElkKCkge1xuXHRcdHJldHVybiBzdGF0ZS5jb25maWd1cmF0aW9uLnNlYXJjaElucHV0SWQ7XG5cdH0sXG5cblx0c2V0SFRNTENvbnRhaW5lcjogZnVuY3Rpb24gc2V0SFRNTENvbnRhaW5lcihpZCkge1xuXHRcdHN0YXRlLmNvbmZpZ3VyYXRpb24uaGVhZGVyRGl2SWQgPSBpZDtcblx0fSxcblxuXHRnZXRIVExNQ29udGFpbmVyOiBmdW5jdGlvbiBnZXRIVExNQ29udGFpbmVyKCkge1xuXHRcdGlmIChzdGF0ZS5jb25maWd1cmF0aW9uLmhlYWRlckRpdklkKSB7XG5cdFx0XHRyZXR1cm4gc3RhdGUuY29uZmlndXJhdGlvbi5oZWFkZXJEaXZJZDtcblx0XHR9IGVsc2Uge1xuXHRcdFx0cmV0dXJuIFwicHBzZGstY29udGFpbmVyXCI7XG5cdFx0fVxuXHR9LFxuXG5cdGdldEhUTUw6IGZ1bmN0aW9uIGdldEhUTUwoKSB7XG5cdFx0cmV0dXJuIHN0YXRlLmh0bWxUZW1wbGF0ZTtcblx0fSxcblxuXHRnZXRXaW5kb3dOYW1lOiBmdW5jdGlvbiBnZXRXaW5kb3dOYW1lKCkge1xuXHRcdHJldHVybiBzdGF0ZS5nZW5lcmFsLndpbmRvd05hbWU7XG5cdH0sXG5cblx0c2V0VXNlckRhdGE6IGZ1bmN0aW9uIHNldFVzZXJEYXRhKHVzZXJEYXRhKSB7XG5cdFx0c3RhdGUudXNlckRhdGEgPSB1c2VyRGF0YTtcblx0fSxcblxuXHRnZXRVc2VyRGF0YTogZnVuY3Rpb24gZ2V0VXNlckRhdGEoKSB7XG5cdFx0cmV0dXJuIHN0YXRlLnVzZXJEYXRhO1xuXHR9LFxuXG5cdHNldFJvb3RVcmw6IGZ1bmN0aW9uIHNldFJvb3RVcmwocm9vdFVybCkge1xuXHRcdHN0YXRlLmNvbmZpZ3VyYXRpb24ucm9vdFVybCA9IHJvb3RVcmw7XG5cdH0sXG5cblx0Z2V0QXZhdGFyVXBsb2FkVXJsOiBmdW5jdGlvbiBnZXRBdmF0YXJVcGxvYWRVcmwoKSB7XG5cdFx0cmV0dXJuIHN0YXRlLmNvbmZpZ3VyYXRpb24ucm9vdFVybCArIHN0YXRlLmNvbmZpZ3VyYXRpb24uYmFzZVVybCArICdhc3NldHMvdXBsb2FkJztcblx0fSxcblxuXHRnZXRBdmF0YXJVcGRhdGVVcmw6IGZ1bmN0aW9uIGdldEF2YXRhclVwZGF0ZVVybCgpIHtcblx0XHRyZXR1cm4gc3RhdGUuY29uZmlndXJhdGlvbi5yb290VXJsICsgc3RhdGUuY29uZmlndXJhdGlvbi5iYXNlVXJsICsgJ3VzZXJzL2F2YXRhcic7XG5cdH1cbn07XG5cbm1vZHVsZS5leHBvcnRzID0gU3RvcmU7Il19
