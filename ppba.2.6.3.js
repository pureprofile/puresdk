(function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);var f=new Error("Cannot find module '"+o+"'");throw f.code="MODULE_NOT_FOUND",f}var l=n[o]={exports:{}};t[o][0].call(l.exports,function(e){var n=t[o][1][e];return s(n?n:e)},l,l.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){
var Logger = require('./modules/logger');
var PubSub = require('./modules/pubsub');
var Caller = require('./modules/caller');
var Dom = require('./modules/dom');
var InfoController = require('./modules/info-controller');
var AvatarController = require('./modules/avatar-controller');
var Store = require('./modules/store');
var Cloudinary = require('./modules/cloudinary-image-picker');
var ppbaConf = {};

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
			return '\n\t\t\t\t<div class="bac--user-image" id="bac--user-image">\n\t\t\t\t\t<i class="fa fa-camera"></i>\n\t\t\t   \t<div id="bac--user-image-file"></div>\n\t\t\t   \t<div id="bac--user-image-upload-progress">\n\t\t\t   \t\t<svg width=\'60px\' height=\'60px\' xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" preserveAspectRatio="xMidYMid" class="uil-default"><rect x="0" y="0" width="100" height="100" fill="none" class="bk"></rect><rect  x=\'46.5\' y=\'40\' width=\'7\' height=\'20\' rx=\'5\' ry=\'5\' fill=\'#ffffff\' transform=\'rotate(0 50 50) translate(0 -30)\'>  <animate attributeName=\'opacity\' from=\'1\' to=\'0\' dur=\'1s\' begin=\'-1s\' repeatCount=\'indefinite\'/></rect><rect  x=\'46.5\' y=\'40\' width=\'7\' height=\'20\' rx=\'5\' ry=\'5\' fill=\'#ffffff\' transform=\'rotate(30 50 50) translate(0 -30)\'>  <animate attributeName=\'opacity\' from=\'1\' to=\'0\' dur=\'1s\' begin=\'-0.9166666666666666s\' repeatCount=\'indefinite\'/></rect><rect  x=\'46.5\' y=\'40\' width=\'7\' height=\'20\' rx=\'5\' ry=\'5\' fill=\'#ffffff\' transform=\'rotate(60 50 50) translate(0 -30)\'>  <animate attributeName=\'opacity\' from=\'1\' to=\'0\' dur=\'1s\' begin=\'-0.8333333333333334s\' repeatCount=\'indefinite\'/></rect><rect  x=\'46.5\' y=\'40\' width=\'7\' height=\'20\' rx=\'5\' ry=\'5\' fill=\'#ffffff\' transform=\'rotate(90 50 50) translate(0 -30)\'>  <animate attributeName=\'opacity\' from=\'1\' to=\'0\' dur=\'1s\' begin=\'-0.75s\' repeatCount=\'indefinite\'/></rect><rect  x=\'46.5\' y=\'40\' width=\'7\' height=\'20\' rx=\'5\' ry=\'5\' fill=\'#ffffff\' transform=\'rotate(120 50 50) translate(0 -30)\'>  <animate attributeName=\'opacity\' from=\'1\' to=\'0\' dur=\'1s\' begin=\'-0.6666666666666666s\' repeatCount=\'indefinite\'/></rect><rect  x=\'46.5\' y=\'40\' width=\'7\' height=\'20\' rx=\'5\' ry=\'5\' fill=\'#ffffff\' transform=\'rotate(150 50 50) translate(0 -30)\'>  <animate attributeName=\'opacity\' from=\'1\' to=\'0\' dur=\'1s\' begin=\'-0.5833333333333334s\' repeatCount=\'indefinite\'/></rect><rect  x=\'46.5\' y=\'40\' width=\'7\' height=\'20\' rx=\'5\' ry=\'5\' fill=\'#ffffff\' transform=\'rotate(180 50 50) translate(0 -30)\'>  <animate attributeName=\'opacity\' from=\'1\' to=\'0\' dur=\'1s\' begin=\'-0.5s\' repeatCount=\'indefinite\'/></rect><rect  x=\'46.5\' y=\'40\' width=\'7\' height=\'20\' rx=\'5\' ry=\'5\' fill=\'#ffffff\' transform=\'rotate(210 50 50) translate(0 -30)\'>  <animate attributeName=\'opacity\' from=\'1\' to=\'0\' dur=\'1s\' begin=\'-0.4166666666666667s\' repeatCount=\'indefinite\'/></rect><rect  x=\'46.5\' y=\'40\' width=\'7\' height=\'20\' rx=\'5\' ry=\'5\' fill=\'#ffffff\' transform=\'rotate(240 50 50) translate(0 -30)\'>  <animate attributeName=\'opacity\' from=\'1\' to=\'0\' dur=\'1s\' begin=\'-0.3333333333333333s\' repeatCount=\'indefinite\'/></rect><rect  x=\'46.5\' y=\'40\' width=\'7\' height=\'20\' rx=\'5\' ry=\'5\' fill=\'#ffffff\' transform=\'rotate(270 50 50) translate(0 -30)\'>  <animate attributeName=\'opacity\' from=\'1\' to=\'0\' dur=\'1s\' begin=\'-0.25s\' repeatCount=\'indefinite\'/></rect><rect  x=\'46.5\' y=\'40\' width=\'7\' height=\'20\' rx=\'5\' ry=\'5\' fill=\'#ffffff\' transform=\'rotate(300 50 50) translate(0 -30)\'>  <animate attributeName=\'opacity\' from=\'1\' to=\'0\' dur=\'1s\' begin=\'-0.16666666666666666s\' repeatCount=\'indefinite\'/></rect><rect  x=\'46.5\' y=\'40\' width=\'7\' height=\'20\' rx=\'5\' ry=\'5\' fill=\'#ffffff\' transform=\'rotate(330 50 50) translate(0 -30)\'>  <animate attributeName=\'opacity\' from=\'1\' to=\'0\' dur=\'1s\' begin=\'-0.08333333333333333s\' repeatCount=\'indefinite\'/></rect></svg>\t\n\t\t\t\t\t</div>\n\t\t\t   </div>\n\t\t\t\t<div class="bac--user-name">' + user.firstname + ' ' + user.lastname + '</div>\n\t\t\t\t<div class="bac--user-email">' + user.email + '</div>\n\t\t\t';
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
},{"./modules/avatar-controller":3,"./modules/caller":4,"./modules/cloudinary-image-picker":5,"./modules/dom":6,"./modules/info-controller":7,"./modules/logger":8,"./modules/pubsub":10,"./modules/store":11}],2:[function(require,module,exports){
'use strict';

/*!
 * PureProfile PureProfile Business Apps Development SDK
 *
 * version: 2.6.3
 * date: 2017-09-18
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
ppba.setVersionNumber('2.6.3');

window.PURESDK = ppba;

var css = 'html,body,div,span,applet,object,iframe,h1,h2,h3,h4,h5,h6,p,blockquote,pre,a,abbr,acronym,address,big,cite,code,del,dfn,em,img,ins,kbd,q,s,samp,small,strike,strong,sub,sup,tt,var,b,u,i,center,dl,dt,dd,ol,ul,li,fieldset,form,label,legend,table,caption,tbody,tfoot,thead,tr,th,td,article,aside,canvas,details,embed,figure,figcaption,footer,header,hgroup,menu,nav,output,ruby,section,summary,time,mark,audio,video{margin:0;padding:0;border:0;font-size:100%;font:inherit;vertical-align:baseline}article,aside,details,figcaption,figure,footer,header,hgroup,menu,nav,section{display:block}body{line-height:1}ol,ul{list-style:none}blockquote,q{quotes:none}blockquote:before,blockquote:after,q:before,q:after{content:"";content:none}table{border-collapse:collapse;border-spacing:0}body{overflow-x:hidden}#bac-wrapper{font-family:"Verdana", arial, sans-serif;color:white;min-height:100vh;position:relative}.bac--container{max-width:1160px;margin:0 auto}.bac--container #app-name-link-to-root{display:block;position:absolute;left:65px;top:4px;font-size:1.4em;width:150px;color:white;text-decoration:none}.bac--header-apps{position:absolute;width:100%;height:50px;background-color:#475369;padding:5px 10px;z-index:9999999}.bac--header-apps .bac--container{height:100%;display:flex;align-items:center;justify-content:space-between}.bac--header-search{position:relative}.bac--header-search input{color:#fff;font-size:14px;height:35px;background-color:#6b7586;padding:0 5px 0 10px;border:none;border-radius:3px;min-width:400px;width:100%}.bac--header-search input:focus{outline:none}.bac--header-search input::-webkit-input-placeholder{font-style:normal !important;text-align:center;color:#fff;font-size:14px;font-weight:300;letter-spacing:0.5px}.bac--header-search input::-moz-placeholder{font-style:normal !important;text-align:center;color:#fff;font-size:14px;font-weight:300;letter-spacing:0.5px}.bac--header-search input:-ms-input-placeholder{font-style:normal !important;text-align:center;color:#fff;font-size:14px;font-weight:300;letter-spacing:0.5px}.bac--header-search i{position:absolute;top:8px;right:10px}.bac--user-actions{display:flex;align-items:center}.bac--user-actions>div{cursor:pointer;color:white}.bac--user-actions .bac--user-notifications{position:relative}.bac--user-actions .bac--user-notifications i{font-size:20px}.bac--user-actions #bac--puresdk--loader--{display:none}.bac--user-actions #bac--puresdk--loader--.bac--puresdk-visible{display:block}.bac--user-actions .bac--user-notifications-count{position:absolute;display:inline-block;height:15px;width:15px;line-height:15px;color:#fff;font-size:10px;text-align:center;background-color:#fc3b30;border-radius:50%;top:-5px;left:-5px}.bac--user-actions .bac--user-avatar,.bac--user-actions .bac--user-notifications{margin-left:20px}.bac--user-actions .bac--user-avatar{position:relative;overflow:hidden;border-radius:50%}.bac--user-actions .bac--user-avatar #bac--image-container-top{width:100%;heigth:100%;position:absolute;top:0;left:0;z-index:1;display:none}.bac--user-actions .bac--user-avatar #bac--image-container-top img{width:100%;height:100%}.bac--user-actions .bac--user-avatar #bac--image-container-top.bac--puresdk-visible{display:block}.bac--user-actions .bac--user-avatar-name{color:#fff;background-color:#adadad;display:inline-block;height:35px;width:35px;line-height:35px;text-align:center;font-size:14px}.bac--user-apps{position:relative}#bac--puresdk-apps-icon--{width:20px;display:inline-block;text-align:center;font-size:16px}.bac--puresdk-apps-name--{font-size:9px;width:20px;text-align:center}#bac--puresdk-user-businesses--{height:calc(100vh - 458px);overflow:auto}.bac--apps-container{background:#fff;position:absolute;top:45px;right:-40px;display:flex;width:360px;flex-wrap:wrap;border-radius:10px;padding:30px;justify-content:space-between;text-align:center;-webkit-box-shadow:0 0 10px 2px rgba(0,0,0,0.2);box-shadow:0 0 10px 2px rgba(0,0,0,0.2);opacity:0;visibility:hidden;transition:all 0.4s ease;max-height:566px;overflow:auto}.bac--apps-container.active{opacity:1;visibility:visible}.bac--apps-container .bac--apps-arrow{position:absolute;display:block;height:20px;width:20px;top:-10px;right:36px;background:#fff;transform:rotate(-45deg);z-index:1}.bac--apps-container .bac--apps{width:32%;display:flex;font-size:30px;margin-bottom:40px;text-align:center;justify-content:center;flex-wrap:wrap}.bac--apps-container .bac--apps a{display:block;color:#fff;text-decoration:none;width:65px;height:65px;padding-top:3px;line-height:65px;text-align:center;border-radius:10px;-webkit-box-shadow:0 0 5px 0 rgba(0,0,0,0.2);box-shadow:0 0 5px 0 rgba(0,0,0,0.2)}.bac--apps-container .bac--apps .bac--app-name{width:100%;color:#000;font-size:14px;padding:10px 0 5px 0}.bac--apps-container .bac--apps .bac--app-description{color:#919191;font-size:12px;font-style:italic;line-height:1.3em}.bac--user-sidebar{font-family:"Verdana", arial, sans-serif;color:white;height:calc(100vh - 50px);background-color:#515f77;box-sizing:border-box;width:320px;position:fixed;top:50px;right:0;z-index:999999;padding-top:10px;opacity:0;transform:translateX(100%);transition:all 0.4s ease}.bac--user-sidebar.active{opacity:1;transform:translateX(0%);-webkit-box-shadow:-1px 0px 12px 0px rgba(0,0,0,0.75);-moz-box-shadow:-1px 3px 12px 0px rgba(0,0,0,0.75);box-shadow:-1px 0px 12px 0px rgba(0,0,0,0.75)}.bac--user-sidebar .bac--user-list-item{display:flex;position:relative;cursor:pointer;align-items:center;padding:10px 10px 10px 40px;border-bottom:1px solid rgba(255,255,255,0.1)}.bac--user-sidebar .bac--user-list-item:hover{background-color:rgba(255,255,255,0.1)}.bac--user-sidebar .bac--user-list-item .bac--selected-acount-indicator{position:absolute;right:0;height:100%;width:8px}.bac--user-sidebar .bac--user-list-item .bac--user-list-item-image{width:40px;height:40px;border-radius:3px;border:2px solid #fff;margin-right:20px;display:flex;align-items:center;justify-content:center}.bac--user-sidebar .bac--user-list-item .bac--user-list-item-image>img{width:auto;height:auto;max-width:100%;max-height:100%}.bac--user-sidebar .bac--user-list-item span{width:100%;display:block;margin-bottom:5px}.bac--user-sidebar .bac-user-app-details span{font-size:12px}.bac--user-sidebar .puresdk-version-number{width:100%;text-align:right;padding-right:10px;position:absolute;font-size:8px;opacity:0.5;right:0;bottom:0}.bac--user-sidebar-info{display:flex;justify-content:center;flex-wrap:wrap;text-align:center;padding:10px 20px 15px}.bac--user-sidebar-info .bac--user-image{border:1px #adadad solid;overflow:hidden;border-radius:50%;position:relative;cursor:pointer;display:inline-block;height:80px;width:80px;line-height:80px;text-align:center;color:#fff;border-radius:50%;background-color:#adadad;margin-bottom:15px}.bac--user-sidebar-info .bac--user-image #bac--user-image-file{display:none;position:absolute;z-index:1;top:0;left:0;width:100%;height:100%}.bac--user-sidebar-info .bac--user-image #bac--user-image-file img{width:100%;height:100%}.bac--user-sidebar-info .bac--user-image #bac--user-image-file.bac--puresdk-visible{display:block}.bac--user-sidebar-info .bac--user-image #bac--user-image-upload-progress{position:absolute;padding-top:10px;top:0;background:#666;z-index:4;display:none;width:100%;height:100%}.bac--user-sidebar-info .bac--user-image #bac--user-image-upload-progress.bac--puresdk-visible{display:block}.bac--user-sidebar-info .bac--user-image i{font-size:32px;font-size:32px;z-index:0;position:absolute;width:100%;left:0;background-color:rgba(0,0,0,0.5)}.bac--user-sidebar-info .bac--user-image:hover i{z-index:3}.bac--user-sidebar-info .bac--user-name{width:100%;text-align:center;font-size:18px;margin-bottom:10px}.bac--user-sidebar-info .bac--user-email{font-size:12px;font-weight:300}.bac--user-account-settings{position:absolute;bottom:10px;left:20px;width:90%;height:50px}.bac--user-account-settings .bac-user-acount-list-item{display:flex;align-items:center;margin-bottom:30px;position:absolute}.bac--user-account-settings .bac-user-acount-list-item a{text-decoration:none;color:#fff}.bac--user-account-settings .bac-user-acount-list-item i{font-size:24px;margin-right:20px}#bac--puresdk-account-logo--{cursor:pointer;position:relative}#bac--puresdk-account-logo-- img{height:28px}#bac--info-blocks-wrapper--{position:relative}#bac--info-blocks-wrapper-- .bac--puresdk-info-box--{border-radius:0 0 3px 3px;overflow:hidden;z-index:99999999;position:fixed;top:-41px;width:470px;left:calc(50vw - 235px);height:40px;-webkit-transition:top 0.4s;transition:top 0.4s}#bac--info-blocks-wrapper-- .bac--puresdk-info-box--.bac--success{background:#14DA9E}#bac--info-blocks-wrapper-- .bac--puresdk-info-box--.bac--success .bac--inner-info-box-- div.bac--info-icon--.fa-success{display:inline-block}#bac--info-blocks-wrapper-- .bac--puresdk-info-box--.bac--info{background-color:#5BC0DE}#bac--info-blocks-wrapper-- .bac--puresdk-info-box--.bac--info .bac--inner-info-box-- div.bac--info-icon--.fa-info-1{display:inline-block}#bac--info-blocks-wrapper-- .bac--puresdk-info-box--.bac--warning{background:#F0AD4E}#bac--info-blocks-wrapper-- .bac--puresdk-info-box--.bac--warning .bac--inner-info-box-- div.bac--info-icon--.fa-warning{display:inline-block}#bac--info-blocks-wrapper-- .bac--puresdk-info-box--.bac--error{background:#EF4100}#bac--info-blocks-wrapper-- .bac--puresdk-info-box--.bac--error .bac--inner-info-box-- div.bac--info-icon--.fa-error{display:inline-block}#bac--info-blocks-wrapper-- .bac--puresdk-info-box-- .bac--timer{-webkit-transition-timing-function:linear;transition-timing-function:linear;position:absolute;bottom:0px;opacity:0.5;height:2px !important;background:white;width:0%}#bac--info-blocks-wrapper-- .bac--puresdk-info-box-- .bac--timer.bac--fullwidth{width:100%}#bac--info-blocks-wrapper-- .bac--puresdk-info-box--.bac--active--{top:0px}#bac--info-blocks-wrapper-- .bac--puresdk-info-box-- .bac--inner-info-box--{width:100%;padding:11px 15px;color:white}#bac--info-blocks-wrapper-- .bac--puresdk-info-box-- .bac--inner-info-box-- div{display:inline-block;height:18px;position:relative}#bac--info-blocks-wrapper-- .bac--puresdk-info-box-- .bac--inner-info-box-- div.bac--info-icon--{display:none;top:0px}#bac--info-blocks-wrapper-- .bac--puresdk-info-box-- .bac--inner-info-box-- .bac--info-icon--{margin-right:15px;width:10px;top:2px}#bac--info-blocks-wrapper-- .bac--puresdk-info-box-- .bac--inner-info-box-- .bac--info-main-text--{width:380px;margin-right:15px;font-size:12px;text-align:center}#bac--info-blocks-wrapper-- .bac--puresdk-info-box-- .bac--inner-info-box-- .bac--info-close-button--{width:10px;cursor:pointer;top:2px}.bac--custom-modal{position:fixed;width:70%;height:80%;min-width:400px;left:0;right:0;top:0;bottom:0;margin:auto;border:1px solid #979797;border-radius:5px;box-shadow:0 0 71px 0 #2F3849;background:#fff;z-index:999;overflow:auto;display:none}.bac--custom-modal.is-open{display:block}.bac--custom-modal .custom-modal__close-btn{text-decoration:none;padding-top:2px;line-height:18px;height:20px;width:20px;border-radius:50%;color:#909ba4;text-align:center;position:absolute;top:20px;right:20px;font-size:20px}.bac--custom-modal .custom-modal__close-btn:hover{text-decoration:none;color:#455066;cursor:pointer}.bac--custom-modal .custom-modal__wrapper{height:100%;display:flex;flex-direction:column}.bac--custom-modal .custom-modal__wrapper iframe{width:100%;height:100%}.bac--custom-modal .custom-modal__content-wrapper{height:100%;overflow:auto;margin-bottom:104px;border-top:2px solid #C9CDD7}.bac--custom-modal .custom-modal__content-wrapper.no-margin{margin-bottom:0}.bac--custom-modal .custom-modal__content{padding:20px;position:relative}.bac--custom-modal .custom-modal__content h3{color:#2F3849;font-size:20px;font-weight:600;line-height:27px}.bac--custom-modal .custom-modal__save{position:absolute;right:0;bottom:0;width:100%;padding:30px 32px;background-color:#F2F2F4}.bac--custom-modal .custom-modal__save a,.bac--custom-modal .custom-modal__save button{font-size:14px;line-height:22px;height:44px;width:100%}.bac--custom-modal .custom-modal__splitter{height:30px;line-height:30px;padding:0 20px;border-color:#D3D3D3;border-style:solid;border-width:1px 0 1px 0;background-color:#F0F0F0;color:#676F82;font-size:13px;font-weight:600}.bac--custom-modal .custom-modal__box{display:inline-block;vertical-align:middle;height:165px;width:165px;border:2px solid red;border-radius:5px;text-align:center;font-size:12px;font-weight:600;color:#9097A8;text-decoration:none;margin:10px 20px 10px 0;transition:0.1s all}.bac--custom-modal .custom-modal__box i{font-size:70px;display:block;margin:25px 0}.bac--custom-modal .custom-modal__box.active{color:yellow;border-color:yellow;text-decoration:none}.bac--custom-modal .custom-modal__box:hover,.bac--custom-modal .custom-modal__box:active,.bac--custom-modal .custom-modal__box:focus{color:#1AC0B4;border-color:yellow;text-decoration:none}.cloud-images__container{display:flex;flex-wrap:wrap;justify-content:flex-start}.cloud-images__pagination{padding:20px}.cloud-images__pagination li{display:inline-block;margin-right:10px}.cloud-images__pagination li a{color:#fff;background-color:#5e6776;border-radius:20px;text-decoration:none;display:block;font-weight:200;height:35px;width:35px;line-height:35px;text-align:center}.cloud-images__pagination li.active a{background-color:#2f3849}.cloud-images__item{width:155px;height:170px;border:1px solid #eee;background-color:#fff;border-radius:3px;margin:0 15px 15px 0;text-align:center;position:relative;cursor:pointer}.cloud-images__item .cloud-images__item__type{height:115px;font-size:90px;line-height:140px;border-top-left-radius:3px;border-top-right-radius:3px;color:#a2a2a2;background-color:#e9eaeb}.cloud-images__item .cloud-images__item__type>img{width:auto;height:auto;max-width:100%;max-height:100%}.cloud-images__item .cloud-images__item__details{padding:10px 0}.cloud-images__item .cloud-images__item__details .cloud-images__item__details__name{font-size:12px;outline:none;padding:0 10px;color:#a5abb5;border:none;width:100%;background-color:transparent;height:15px;display:inline-block;word-break:break-all}.cloud-images__item .cloud-images__item__details .cloud-images__item__details__date{font-size:10px;bottom:6px;width:155px;height:15px;color:#a5abb5;display:inline-block}.cloud-images__item .cloud-images__item__actions{display:flex;align-items:center;justify-content:center;position:absolute;top:0;left:0;width:100%;height:115px;background-color:rgba(78,83,91,0.83);opacity:0;visibility:hidden;border-top-left-radius:3px;border-top-right-radius:3px;text-align:center;transition:0.3s opacity}.cloud-images__item .cloud-images__item__actions a{font-size:16px;color:#fff;text-decoration:none}.cloud-images__item:hover .cloud-images__item .cloud-images__item__actions{opacity:1;visibility:visible}',
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
},{"./caller":4,"./dom":6,"./logger":8,"./store":11}],4:[function(require,module,exports){
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
},{"./logger":8,"./store.js":11}],5:[function(require,module,exports){
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
},{"./caller":4,"./dom":6,"./pagination-helper":9,"./store":11}],6:[function(require,module,exports){
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
},{}],7:[function(require,module,exports){
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
},{"./dom":6}],8:[function(require,module,exports){
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
},{"./store.js":11}],9:[function(require,module,exports){
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
},{}],10:[function(require,module,exports){
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
},{"./logger.js":8,"./store.js":11}],11:[function(require,module,exports){
var state = {
	general: {},
	userData: {},
	configuration: {},
	htmlTemplate: "",
	apps: null,
	versionNumber: '',
	dev: false,
	filePicker: {
		selectedFile: null
	},
	appInfo: null
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
		return Store.getFullBaseUrl() + 'session';
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
},{}]},{},[2])
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uLy4uL25vZGVfbW9kdWxlcy9icm93c2VyLXBhY2svX3ByZWx1ZGUuanMiLCJQUEJBLmpzIiwiaW5kZXguanMiLCJtb2R1bGVzL2F2YXRhci1jb250cm9sbGVyLmpzIiwibW9kdWxlcy9jYWxsZXIuanMiLCJtb2R1bGVzL2Nsb3VkaW5hcnktaW1hZ2UtcGlja2VyLmpzIiwibW9kdWxlcy9kb20uanMiLCJtb2R1bGVzL2luZm8tY29udHJvbGxlci5qcyIsIm1vZHVsZXMvbG9nZ2VyLmpzIiwibW9kdWxlcy9wYWdpbmF0aW9uLWhlbHBlci5qcyIsIm1vZHVsZXMvcHVic3ViLmpzIiwibW9kdWxlcy9zdG9yZS5qcyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTtBQ0FBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNoVUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUM5Q0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3ZIQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ2pHQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNyUUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUN0QkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUM5RkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDckJBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUMvQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3JEQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0EiLCJmaWxlIjoiZ2VuZXJhdGVkLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXNDb250ZW50IjpbIihmdW5jdGlvbiBlKHQsbixyKXtmdW5jdGlvbiBzKG8sdSl7aWYoIW5bb10pe2lmKCF0W29dKXt2YXIgYT10eXBlb2YgcmVxdWlyZT09XCJmdW5jdGlvblwiJiZyZXF1aXJlO2lmKCF1JiZhKXJldHVybiBhKG8sITApO2lmKGkpcmV0dXJuIGkobywhMCk7dmFyIGY9bmV3IEVycm9yKFwiQ2Fubm90IGZpbmQgbW9kdWxlICdcIitvK1wiJ1wiKTt0aHJvdyBmLmNvZGU9XCJNT0RVTEVfTk9UX0ZPVU5EXCIsZn12YXIgbD1uW29dPXtleHBvcnRzOnt9fTt0W29dWzBdLmNhbGwobC5leHBvcnRzLGZ1bmN0aW9uKGUpe3ZhciBuPXRbb11bMV1bZV07cmV0dXJuIHMobj9uOmUpfSxsLGwuZXhwb3J0cyxlLHQsbixyKX1yZXR1cm4gbltvXS5leHBvcnRzfXZhciBpPXR5cGVvZiByZXF1aXJlPT1cImZ1bmN0aW9uXCImJnJlcXVpcmU7Zm9yKHZhciBvPTA7bzxyLmxlbmd0aDtvKyspcyhyW29dKTtyZXR1cm4gc30pIiwidmFyIExvZ2dlciA9IHJlcXVpcmUoJy4vbW9kdWxlcy9sb2dnZXInKTtcbnZhciBQdWJTdWIgPSByZXF1aXJlKCcuL21vZHVsZXMvcHVic3ViJyk7XG52YXIgQ2FsbGVyID0gcmVxdWlyZSgnLi9tb2R1bGVzL2NhbGxlcicpO1xudmFyIERvbSA9IHJlcXVpcmUoJy4vbW9kdWxlcy9kb20nKTtcbnZhciBJbmZvQ29udHJvbGxlciA9IHJlcXVpcmUoJy4vbW9kdWxlcy9pbmZvLWNvbnRyb2xsZXInKTtcbnZhciBBdmF0YXJDb250cm9sbGVyID0gcmVxdWlyZSgnLi9tb2R1bGVzL2F2YXRhci1jb250cm9sbGVyJyk7XG52YXIgU3RvcmUgPSByZXF1aXJlKCcuL21vZHVsZXMvc3RvcmUnKTtcbnZhciBDbG91ZGluYXJ5ID0gcmVxdWlyZSgnLi9tb2R1bGVzL2Nsb3VkaW5hcnktaW1hZ2UtcGlja2VyJyk7XG52YXIgcHBiYUNvbmYgPSB7fTtcblxudmFyIGFmdGVyUmVuZGVyID0gZnVuY3Rpb24gYWZ0ZXJSZW5kZXIoKSB7XG5cdGlmIChkb2N1bWVudC5nZXRFbGVtZW50QnlJZCgnYmFjLS1wdXJlc2RrLS1hcHBzLS1vcGVuZXItLScpKSB7XG5cdFx0ZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoJ2JhYy0tcHVyZXNkay0tYXBwcy0tb3BlbmVyLS0nKS5hZGRFdmVudExpc3RlbmVyKCdjbGljaycsIGZ1bmN0aW9uIChlKSB7XG5cdFx0XHRlLnN0b3BQcm9wYWdhdGlvbigpO1xuXHRcdFx0Ly8gRG9tLnRvZ2dsZUNsYXNzKGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKCdiYWMtLXB1cmVzZGstYXBwcy1jb250YWluZXItLScpLCAnYWN0aXZlJyk7XG5cdFx0XHR3aW5kb3cubG9jYXRpb24uaHJlZiA9IFN0b3JlLmdldFJvb3RVcmwoKTtcblx0XHR9KTtcblx0fVxuXG5cdGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKCdiYWMtLXVzZXItYXZhdGFyLXRvcCcpLmFkZEV2ZW50TGlzdGVuZXIoJ2NsaWNrJywgZnVuY3Rpb24gKGUpIHtcblx0XHRlLnN0b3BQcm9wYWdhdGlvbigpO1xuXHRcdC8vIERvbS5yZW1vdmVDbGFzcyhkb2N1bWVudC5nZXRFbGVtZW50QnlJZCgnYmFjLS1wdXJlc2RrLWFwcHMtY29udGFpbmVyLS0nKSwgJ2FjdGl2ZScpO1xuXHRcdERvbS50b2dnbGVDbGFzcyhkb2N1bWVudC5nZXRFbGVtZW50QnlJZCgnYmFjLS1wdXJlc2RrLXVzZXItc2lkZWJhci0tJyksICdhY3RpdmUnKTtcblx0fSk7XG5cblx0d2luZG93LmFkZEV2ZW50TGlzdGVuZXIoJ2NsaWNrJywgZnVuY3Rpb24gKGUpIHtcblx0XHQvLyBEb20ucmVtb3ZlQ2xhc3MoZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoJ2JhYy0tcHVyZXNkay1hcHBzLWNvbnRhaW5lci0tJyksICdhY3RpdmUnKTtcblx0XHREb20ucmVtb3ZlQ2xhc3MoZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoJ2JhYy0tcHVyZXNkay11c2VyLXNpZGViYXItLScpLCAnYWN0aXZlJyk7XG5cdH0pO1xuXG5cdEF2YXRhckNvbnRyb2xsZXIuaW5pdCgpO1xuXHR2YXIgdXNlckRhdGEgPSBTdG9yZS5nZXRVc2VyRGF0YSgpO1xuXHRBdmF0YXJDb250cm9sbGVyLnNldEF2YXRhcih1c2VyRGF0YS51c2VyLmF2YXRhcl91cmwpO1xuXG5cdEluZm9Db250cm9sbGVyLmluaXQoKTtcbn07XG5cbnZhciBQUEJBID0ge1xuXHRzZXRXaW5kb3dOYW1lOiBmdW5jdGlvbiBzZXRXaW5kb3dOYW1lKHduKSB7XG5cdFx0U3RvcmUuc2V0V2luZG93TmFtZSh3bik7XG5cdH0sXG5cblx0c2V0Q29uZmlndXJhdGlvbjogZnVuY3Rpb24gc2V0Q29uZmlndXJhdGlvbihjb25mKSB7XG5cdFx0U3RvcmUuc2V0Q29uZmlndXJhdGlvbihjb25mKTtcblx0fSxcblxuXHRzZXRIVE1MVGVtcGxhdGU6IGZ1bmN0aW9uIHNldEhUTUxUZW1wbGF0ZSh0ZW1wbGF0ZSkge1xuXHRcdFN0b3JlLnNldEhUTUxUZW1wbGF0ZSh0ZW1wbGF0ZSk7XG5cdH0sXG5cblx0c2V0VmVyc2lvbk51bWJlcjogZnVuY3Rpb24gc2V0VmVyc2lvbk51bWJlcih2ZXJzaW9uKSB7XG5cdFx0U3RvcmUuc2V0VmVyc2lvbk51bWJlcih2ZXJzaW9uKTtcblx0fSxcblxuXHRpbml0OiBmdW5jdGlvbiBpbml0KGNvbmYpIHtcblx0XHRMb2dnZXIubG9nKCdpbml0aWFsaXppbmcgd2l0aCBjb25mOiAnLCBjb25mKTtcblx0XHRpZiAoY29uZikge1xuXHRcdFx0aWYgKGNvbmYuaGVhZGVyRGl2SWQpIHtcblx0XHRcdFx0U3RvcmUuc2V0SFRNTENvbnRhaW5lcihjb25mLmhlYWRlckRpdklkKTtcblx0XHRcdH1cblx0XHRcdGlmIChjb25mLmFwcHNWaXNpYmxlICE9PSBudWxsKSB7XG5cdFx0XHRcdFN0b3JlLnNldEFwcHNWaXNpYmxlKGNvbmYuYXBwc1Zpc2libGUpO1xuXHRcdFx0fVxuXHRcdFx0aWYgKGNvbmYucm9vdFVybCkge1xuXHRcdFx0XHRTdG9yZS5zZXRSb290VXJsKGNvbmYucm9vdFVybCk7XG5cdFx0XHR9XG5cdFx0XHRpZiAoY29uZi5kZXYgPT09IHRydWUpIHtcblx0XHRcdFx0aWYgKGNvbmYuZGV2S2V5cykge1xuXHRcdFx0XHRcdENhbGxlci5zZXREZXZLZXlzKGNvbmYuZGV2S2V5cyk7XG5cdFx0XHRcdFx0U3RvcmUuc2V0RGV2KHRydWUpO1xuXHRcdFx0XHR9XG5cdFx0XHR9XG5cdFx0XHRpZiAoY29uZi5hcHBJbmZvKSB7XG5cdFx0XHRcdFN0b3JlLnNldEFwcEluZm8oY29uZi5hcHBJbmZvKTtcblx0XHRcdH1cblx0XHR9XG5cdFx0cHBiYUNvbmYgPSBjb25mO1xuXHRcdHJldHVybiB0cnVlO1xuXHR9LFxuXG5cdGF1dGhlbnRpY2F0ZTogZnVuY3Rpb24gYXV0aGVudGljYXRlKF9zdWNjZXNzKSB7XG5cdFx0dmFyIHNlbGYgPSBQUEJBO1xuXHRcdENhbGxlci5tYWtlQ2FsbCh7XG5cdFx0XHR0eXBlOiAnR0VUJyxcblx0XHRcdGVuZHBvaW50OiBTdG9yZS5nZXRBdXRoZW50aWNhdGlvbkVuZHBvaW50KCksXG5cdFx0XHRjYWxsYmFja3M6IHtcblx0XHRcdFx0c3VjY2VzczogZnVuY3Rpb24gc3VjY2VzcyhyZXN1bHQpIHtcblx0XHRcdFx0XHRMb2dnZXIubG9nKHJlc3VsdCk7XG5cdFx0XHRcdFx0U3RvcmUuc2V0VXNlckRhdGEocmVzdWx0KTtcblx0XHRcdFx0XHRzZWxmLnJlbmRlcigpO1xuXHRcdFx0XHRcdFBQQkEuZ2V0QXBwcygpO1xuXHRcdFx0XHRcdF9zdWNjZXNzKHJlc3VsdCk7XG5cdFx0XHRcdH0sXG5cdFx0XHRcdGZhaWw6IGZ1bmN0aW9uIGZhaWwoZXJyKSB7XG5cdFx0XHRcdFx0d2luZG93LmxvY2F0aW9uLmhyZWYgPSBTdG9yZS5nZXRMb2dpblVybCgpO1xuXHRcdFx0XHR9XG5cdFx0XHR9XG5cdFx0fSk7XG5cdH0sXG5cblx0YXV0aGVudGljYXRlUHJvbWlzZTogZnVuY3Rpb24gYXV0aGVudGljYXRlUHJvbWlzZSgpIHtcblx0XHR2YXIgc2VsZiA9IFBQQkE7XG5cdFx0cmV0dXJuIENhbGxlci5wcm9taXNlQ2FsbCh7XG5cdFx0XHR0eXBlOiAnR0VUJyxcblx0XHRcdGVuZHBvaW50OiBTdG9yZS5nZXRBdXRoZW50aWNhdGlvbkVuZHBvaW50KCksXG5cdFx0XHRtaWRkbGV3YXJlczoge1xuXHRcdFx0XHRzdWNjZXNzOiBmdW5jdGlvbiBzdWNjZXNzKHJlc3VsdCkge1xuXHRcdFx0XHRcdExvZ2dlci5sb2cocmVzdWx0KTtcblx0XHRcdFx0XHRTdG9yZS5zZXRVc2VyRGF0YShyZXN1bHQpO1xuXHRcdFx0XHRcdHNlbGYucmVuZGVyKCk7XG5cdFx0XHRcdFx0UFBCQS5nZXRBcHBzKCk7XG5cdFx0XHRcdH1cblx0XHRcdH1cblx0XHR9KTtcblx0fSxcblxuXHRnZXRBcHBzOiBmdW5jdGlvbiBnZXRBcHBzKCkge1xuXHRcdENhbGxlci5tYWtlQ2FsbCh7XG5cdFx0XHR0eXBlOiAnR0VUJyxcblx0XHRcdGVuZHBvaW50OiBTdG9yZS5nZXRBcHBzRW5kcG9pbnQoKSxcblx0XHRcdGNhbGxiYWNrczoge1xuXHRcdFx0XHRzdWNjZXNzOiBmdW5jdGlvbiBzdWNjZXNzKHJlc3VsdCkge1xuXHRcdFx0XHRcdFN0b3JlLnNldEFwcHMocmVzdWx0KTtcblx0XHRcdFx0XHQvLyBQUEJBLnJlbmRlckFwcHMocmVzdWx0LmFwcHMpO1xuXHRcdFx0XHR9LFxuXHRcdFx0XHRmYWlsOiBmdW5jdGlvbiBmYWlsKGVycikge1xuXHRcdFx0XHRcdHdpbmRvdy5sb2NhdGlvbi5ocmVmID0gU3RvcmUuZ2V0TG9naW5VcmwoKTtcblx0XHRcdFx0fVxuXHRcdFx0fVxuXHRcdH0pO1xuXHR9LFxuXG5cdGdldEF2YWlsYWJsZUxpc3RlbmVyczogZnVuY3Rpb24gZ2V0QXZhaWxhYmxlTGlzdGVuZXJzKCkge1xuXHRcdHJldHVybiBQdWJTdWIuZ2V0QXZhaWxhYmxlTGlzdGVuZXJzKCk7XG5cdH0sXG5cblx0c3Vic2NyaWJlTGlzdGVuZXI6IGZ1bmN0aW9uIHN1YnNjcmliZUxpc3RlbmVyKGV2ZW50dCwgZnVuY3QpIHtcblx0XHRyZXR1cm4gUHViU3ViLnN1YnNjcmliZShldmVudHQsIGZ1bmN0KTtcblx0fSxcblxuXHRnZXRVc2VyRGF0YTogZnVuY3Rpb24gZ2V0VXNlckRhdGEoKSB7XG5cdFx0cmV0dXJuIFN0b3JlLmdldFVzZXJEYXRhKCk7XG5cdH0sXG5cblx0c2V0SW5wdXRQbGFjZWhvbGRlcjogZnVuY3Rpb24gc2V0SW5wdXRQbGFjZWhvbGRlcih0eHQpIHtcblx0XHQvLyBkb2N1bWVudC5nZXRFbGVtZW50QnlJZChTdG9yZS5nZXRTZWFyY2hJbnB1dElkKCkpLnBsYWNlaG9sZGVyID0gdHh0O1xuXHR9LFxuXG5cdGNoYW5nZUFjY291bnQ6IGZ1bmN0aW9uIGNoYW5nZUFjY291bnQoYWNjb3VudElkKSB7XG5cdFx0Q2FsbGVyLm1ha2VDYWxsKHtcblx0XHRcdHR5cGU6ICdHRVQnLFxuXHRcdFx0ZW5kcG9pbnQ6IFN0b3JlLmdldFN3aXRjaEFjY291bnRFbmRwb2ludChhY2NvdW50SWQpLFxuXHRcdFx0Y2FsbGJhY2tzOiB7XG5cdFx0XHRcdHN1Y2Nlc3M6IGZ1bmN0aW9uIHN1Y2Nlc3MocmVzdWx0KSB7XG5cdFx0XHRcdFx0d2luZG93LmxvY2F0aW9uLmhyZWYgPSAnL2FwcHMnO1xuXHRcdFx0XHR9LFxuXHRcdFx0XHRmYWlsOiBmdW5jdGlvbiBmYWlsKGVycikge1xuXHRcdFx0XHRcdGFsZXJ0KCdTb3JyeSwgc29tZXRoaW5nIHdlbnQgd3Jvbmcgd2l0aCB5b3VyIHJlcXVlc3QuIFBsZXNlIHRyeSBhZ2FpbicpO1xuXHRcdFx0XHR9XG5cdFx0XHR9XG5cdFx0fSk7XG5cdH0sXG5cblx0Ly8gcmVuZGVyQXBwczogKGFwcHMpID0+IHtcblx0Ly8gICBsZXQgYXBwVGVtcGxhdGUgPSAoYXBwKSA9PiBgXG5cdC8vIFx0XHQ8YSBocmVmPVwiI1wiIHN0eWxlPVwiYmFja2dyb3VuZDogIyR7YXBwLmNvbG9yfVwiPjxpIGNsYXNzPVwiJHthcHAuaWNvbn1cIj48L2k+PC9hPlxuXHQvLyBcdFx0PHNwYW4gY2xhc3M9XCJiYWMtLWFwcC1uYW1lXCI+JHthcHAubmFtZX08L3NwYW4+XG5cdC8vIFx0XHQ8c3BhbiBjbGFzcz1cImJhYy0tYXBwLWRlc2NyaXB0aW9uXCI+JHthcHAuZGVzY3J9PC9zcGFuPlxuXHQvLyBcdGA7XG5cdC8vICAgZm9yKGxldCBpPTA7IGk8YXBwcy5sZW5ndGg7IGkrKyl7XG5cdC8vIFx0XHRsZXQgYXBwID0gYXBwc1tpXTtcblx0Ly8gXHRcdGxldCBkaXYgPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KFwiZGl2XCIpO1xuXHQvLyBcdFx0ZGl2LmNsYXNzTmFtZSA9IFwiYmFjLS1hcHBzXCI7XG5cdC8vIFx0XHRkaXYuaW5uZXJIVE1MID0gYXBwVGVtcGxhdGUoYXBwKTtcblx0Ly8gXHRcdGRpdi5vbmNsaWNrID0gKGUpID0+IHtcblx0Ly8gXHRcdFx0IGUucHJldmVudERlZmF1bHQoKTtcblx0Ly8gXHRcdFx0IHdpbmRvdy5sb2NhdGlvbi5ocmVmID0gYXBwLmFwcGxpY2F0aW9uX3VybDtcblx0Ly8gXHRcdH1cblx0Ly8gXHRcdGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKFwiYmFjLS1wdXJlc2RrLWFwcHMtY29udGFpbmVyLS1cIikuYXBwZW5kQ2hpbGQoZGl2KTtcblx0Ly8gICB9XG5cdC8vIH0sXG5cblx0cmVuZGVyVXNlcjogZnVuY3Rpb24gcmVuZGVyVXNlcih1c2VyKSB7XG5cdFx0dmFyIHVzZXJUZW1wbGF0ZSA9IGZ1bmN0aW9uIHVzZXJUZW1wbGF0ZSh1c2VyKSB7XG5cdFx0XHRyZXR1cm4gJ1xcblxcdFxcdFxcdFxcdDxkaXYgY2xhc3M9XCJiYWMtLXVzZXItaW1hZ2VcIiBpZD1cImJhYy0tdXNlci1pbWFnZVwiPlxcblxcdFxcdFxcdFxcdFxcdDxpIGNsYXNzPVwiZmEgZmEtY2FtZXJhXCI+PC9pPlxcblxcdFxcdFxcdCAgIFxcdDxkaXYgaWQ9XCJiYWMtLXVzZXItaW1hZ2UtZmlsZVwiPjwvZGl2PlxcblxcdFxcdFxcdCAgIFxcdDxkaXYgaWQ9XCJiYWMtLXVzZXItaW1hZ2UtdXBsb2FkLXByb2dyZXNzXCI+XFxuXFx0XFx0XFx0ICAgXFx0XFx0PHN2ZyB3aWR0aD1cXCc2MHB4XFwnIGhlaWdodD1cXCc2MHB4XFwnIHhtbG5zPVwiaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmdcIiB2aWV3Qm94PVwiMCAwIDEwMCAxMDBcIiBwcmVzZXJ2ZUFzcGVjdFJhdGlvPVwieE1pZFlNaWRcIiBjbGFzcz1cInVpbC1kZWZhdWx0XCI+PHJlY3QgeD1cIjBcIiB5PVwiMFwiIHdpZHRoPVwiMTAwXCIgaGVpZ2h0PVwiMTAwXCIgZmlsbD1cIm5vbmVcIiBjbGFzcz1cImJrXCI+PC9yZWN0PjxyZWN0ICB4PVxcJzQ2LjVcXCcgeT1cXCc0MFxcJyB3aWR0aD1cXCc3XFwnIGhlaWdodD1cXCcyMFxcJyByeD1cXCc1XFwnIHJ5PVxcJzVcXCcgZmlsbD1cXCcjZmZmZmZmXFwnIHRyYW5zZm9ybT1cXCdyb3RhdGUoMCA1MCA1MCkgdHJhbnNsYXRlKDAgLTMwKVxcJz4gIDxhbmltYXRlIGF0dHJpYnV0ZU5hbWU9XFwnb3BhY2l0eVxcJyBmcm9tPVxcJzFcXCcgdG89XFwnMFxcJyBkdXI9XFwnMXNcXCcgYmVnaW49XFwnLTFzXFwnIHJlcGVhdENvdW50PVxcJ2luZGVmaW5pdGVcXCcvPjwvcmVjdD48cmVjdCAgeD1cXCc0Ni41XFwnIHk9XFwnNDBcXCcgd2lkdGg9XFwnN1xcJyBoZWlnaHQ9XFwnMjBcXCcgcng9XFwnNVxcJyByeT1cXCc1XFwnIGZpbGw9XFwnI2ZmZmZmZlxcJyB0cmFuc2Zvcm09XFwncm90YXRlKDMwIDUwIDUwKSB0cmFuc2xhdGUoMCAtMzApXFwnPiAgPGFuaW1hdGUgYXR0cmlidXRlTmFtZT1cXCdvcGFjaXR5XFwnIGZyb209XFwnMVxcJyB0bz1cXCcwXFwnIGR1cj1cXCcxc1xcJyBiZWdpbj1cXCctMC45MTY2NjY2NjY2NjY2NjY2c1xcJyByZXBlYXRDb3VudD1cXCdpbmRlZmluaXRlXFwnLz48L3JlY3Q+PHJlY3QgIHg9XFwnNDYuNVxcJyB5PVxcJzQwXFwnIHdpZHRoPVxcJzdcXCcgaGVpZ2h0PVxcJzIwXFwnIHJ4PVxcJzVcXCcgcnk9XFwnNVxcJyBmaWxsPVxcJyNmZmZmZmZcXCcgdHJhbnNmb3JtPVxcJ3JvdGF0ZSg2MCA1MCA1MCkgdHJhbnNsYXRlKDAgLTMwKVxcJz4gIDxhbmltYXRlIGF0dHJpYnV0ZU5hbWU9XFwnb3BhY2l0eVxcJyBmcm9tPVxcJzFcXCcgdG89XFwnMFxcJyBkdXI9XFwnMXNcXCcgYmVnaW49XFwnLTAuODMzMzMzMzMzMzMzMzMzNHNcXCcgcmVwZWF0Q291bnQ9XFwnaW5kZWZpbml0ZVxcJy8+PC9yZWN0PjxyZWN0ICB4PVxcJzQ2LjVcXCcgeT1cXCc0MFxcJyB3aWR0aD1cXCc3XFwnIGhlaWdodD1cXCcyMFxcJyByeD1cXCc1XFwnIHJ5PVxcJzVcXCcgZmlsbD1cXCcjZmZmZmZmXFwnIHRyYW5zZm9ybT1cXCdyb3RhdGUoOTAgNTAgNTApIHRyYW5zbGF0ZSgwIC0zMClcXCc+ICA8YW5pbWF0ZSBhdHRyaWJ1dGVOYW1lPVxcJ29wYWNpdHlcXCcgZnJvbT1cXCcxXFwnIHRvPVxcJzBcXCcgZHVyPVxcJzFzXFwnIGJlZ2luPVxcJy0wLjc1c1xcJyByZXBlYXRDb3VudD1cXCdpbmRlZmluaXRlXFwnLz48L3JlY3Q+PHJlY3QgIHg9XFwnNDYuNVxcJyB5PVxcJzQwXFwnIHdpZHRoPVxcJzdcXCcgaGVpZ2h0PVxcJzIwXFwnIHJ4PVxcJzVcXCcgcnk9XFwnNVxcJyBmaWxsPVxcJyNmZmZmZmZcXCcgdHJhbnNmb3JtPVxcJ3JvdGF0ZSgxMjAgNTAgNTApIHRyYW5zbGF0ZSgwIC0zMClcXCc+ICA8YW5pbWF0ZSBhdHRyaWJ1dGVOYW1lPVxcJ29wYWNpdHlcXCcgZnJvbT1cXCcxXFwnIHRvPVxcJzBcXCcgZHVyPVxcJzFzXFwnIGJlZ2luPVxcJy0wLjY2NjY2NjY2NjY2NjY2NjZzXFwnIHJlcGVhdENvdW50PVxcJ2luZGVmaW5pdGVcXCcvPjwvcmVjdD48cmVjdCAgeD1cXCc0Ni41XFwnIHk9XFwnNDBcXCcgd2lkdGg9XFwnN1xcJyBoZWlnaHQ9XFwnMjBcXCcgcng9XFwnNVxcJyByeT1cXCc1XFwnIGZpbGw9XFwnI2ZmZmZmZlxcJyB0cmFuc2Zvcm09XFwncm90YXRlKDE1MCA1MCA1MCkgdHJhbnNsYXRlKDAgLTMwKVxcJz4gIDxhbmltYXRlIGF0dHJpYnV0ZU5hbWU9XFwnb3BhY2l0eVxcJyBmcm9tPVxcJzFcXCcgdG89XFwnMFxcJyBkdXI9XFwnMXNcXCcgYmVnaW49XFwnLTAuNTgzMzMzMzMzMzMzMzMzNHNcXCcgcmVwZWF0Q291bnQ9XFwnaW5kZWZpbml0ZVxcJy8+PC9yZWN0PjxyZWN0ICB4PVxcJzQ2LjVcXCcgeT1cXCc0MFxcJyB3aWR0aD1cXCc3XFwnIGhlaWdodD1cXCcyMFxcJyByeD1cXCc1XFwnIHJ5PVxcJzVcXCcgZmlsbD1cXCcjZmZmZmZmXFwnIHRyYW5zZm9ybT1cXCdyb3RhdGUoMTgwIDUwIDUwKSB0cmFuc2xhdGUoMCAtMzApXFwnPiAgPGFuaW1hdGUgYXR0cmlidXRlTmFtZT1cXCdvcGFjaXR5XFwnIGZyb209XFwnMVxcJyB0bz1cXCcwXFwnIGR1cj1cXCcxc1xcJyBiZWdpbj1cXCctMC41c1xcJyByZXBlYXRDb3VudD1cXCdpbmRlZmluaXRlXFwnLz48L3JlY3Q+PHJlY3QgIHg9XFwnNDYuNVxcJyB5PVxcJzQwXFwnIHdpZHRoPVxcJzdcXCcgaGVpZ2h0PVxcJzIwXFwnIHJ4PVxcJzVcXCcgcnk9XFwnNVxcJyBmaWxsPVxcJyNmZmZmZmZcXCcgdHJhbnNmb3JtPVxcJ3JvdGF0ZSgyMTAgNTAgNTApIHRyYW5zbGF0ZSgwIC0zMClcXCc+ICA8YW5pbWF0ZSBhdHRyaWJ1dGVOYW1lPVxcJ29wYWNpdHlcXCcgZnJvbT1cXCcxXFwnIHRvPVxcJzBcXCcgZHVyPVxcJzFzXFwnIGJlZ2luPVxcJy0wLjQxNjY2NjY2NjY2NjY2NjdzXFwnIHJlcGVhdENvdW50PVxcJ2luZGVmaW5pdGVcXCcvPjwvcmVjdD48cmVjdCAgeD1cXCc0Ni41XFwnIHk9XFwnNDBcXCcgd2lkdGg9XFwnN1xcJyBoZWlnaHQ9XFwnMjBcXCcgcng9XFwnNVxcJyByeT1cXCc1XFwnIGZpbGw9XFwnI2ZmZmZmZlxcJyB0cmFuc2Zvcm09XFwncm90YXRlKDI0MCA1MCA1MCkgdHJhbnNsYXRlKDAgLTMwKVxcJz4gIDxhbmltYXRlIGF0dHJpYnV0ZU5hbWU9XFwnb3BhY2l0eVxcJyBmcm9tPVxcJzFcXCcgdG89XFwnMFxcJyBkdXI9XFwnMXNcXCcgYmVnaW49XFwnLTAuMzMzMzMzMzMzMzMzMzMzM3NcXCcgcmVwZWF0Q291bnQ9XFwnaW5kZWZpbml0ZVxcJy8+PC9yZWN0PjxyZWN0ICB4PVxcJzQ2LjVcXCcgeT1cXCc0MFxcJyB3aWR0aD1cXCc3XFwnIGhlaWdodD1cXCcyMFxcJyByeD1cXCc1XFwnIHJ5PVxcJzVcXCcgZmlsbD1cXCcjZmZmZmZmXFwnIHRyYW5zZm9ybT1cXCdyb3RhdGUoMjcwIDUwIDUwKSB0cmFuc2xhdGUoMCAtMzApXFwnPiAgPGFuaW1hdGUgYXR0cmlidXRlTmFtZT1cXCdvcGFjaXR5XFwnIGZyb209XFwnMVxcJyB0bz1cXCcwXFwnIGR1cj1cXCcxc1xcJyBiZWdpbj1cXCctMC4yNXNcXCcgcmVwZWF0Q291bnQ9XFwnaW5kZWZpbml0ZVxcJy8+PC9yZWN0PjxyZWN0ICB4PVxcJzQ2LjVcXCcgeT1cXCc0MFxcJyB3aWR0aD1cXCc3XFwnIGhlaWdodD1cXCcyMFxcJyByeD1cXCc1XFwnIHJ5PVxcJzVcXCcgZmlsbD1cXCcjZmZmZmZmXFwnIHRyYW5zZm9ybT1cXCdyb3RhdGUoMzAwIDUwIDUwKSB0cmFuc2xhdGUoMCAtMzApXFwnPiAgPGFuaW1hdGUgYXR0cmlidXRlTmFtZT1cXCdvcGFjaXR5XFwnIGZyb209XFwnMVxcJyB0bz1cXCcwXFwnIGR1cj1cXCcxc1xcJyBiZWdpbj1cXCctMC4xNjY2NjY2NjY2NjY2NjY2NnNcXCcgcmVwZWF0Q291bnQ9XFwnaW5kZWZpbml0ZVxcJy8+PC9yZWN0PjxyZWN0ICB4PVxcJzQ2LjVcXCcgeT1cXCc0MFxcJyB3aWR0aD1cXCc3XFwnIGhlaWdodD1cXCcyMFxcJyByeD1cXCc1XFwnIHJ5PVxcJzVcXCcgZmlsbD1cXCcjZmZmZmZmXFwnIHRyYW5zZm9ybT1cXCdyb3RhdGUoMzMwIDUwIDUwKSB0cmFuc2xhdGUoMCAtMzApXFwnPiAgPGFuaW1hdGUgYXR0cmlidXRlTmFtZT1cXCdvcGFjaXR5XFwnIGZyb209XFwnMVxcJyB0bz1cXCcwXFwnIGR1cj1cXCcxc1xcJyBiZWdpbj1cXCctMC4wODMzMzMzMzMzMzMzMzMzM3NcXCcgcmVwZWF0Q291bnQ9XFwnaW5kZWZpbml0ZVxcJy8+PC9yZWN0Pjwvc3ZnPlxcdFxcblxcdFxcdFxcdFxcdFxcdDwvZGl2PlxcblxcdFxcdFxcdCAgIDwvZGl2PlxcblxcdFxcdFxcdFxcdDxkaXYgY2xhc3M9XCJiYWMtLXVzZXItbmFtZVwiPicgKyB1c2VyLmZpcnN0bmFtZSArICcgJyArIHVzZXIubGFzdG5hbWUgKyAnPC9kaXY+XFxuXFx0XFx0XFx0XFx0PGRpdiBjbGFzcz1cImJhYy0tdXNlci1lbWFpbFwiPicgKyB1c2VyLmVtYWlsICsgJzwvZGl2PlxcblxcdFxcdFxcdCc7XG5cdFx0fTtcblx0XHR2YXIgZGl2ID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudCgnZGl2Jyk7XG5cdFx0ZGl2LmNsYXNzTmFtZSA9IFwiYmFjLS11c2VyLXNpZGViYXItaW5mb1wiO1xuXHRcdGRpdi5pbm5lckhUTUwgPSB1c2VyVGVtcGxhdGUodXNlcik7XG5cdFx0ZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoJ2JhYy0tcHVyZXNkay11c2VyLWRldGFpbHMtLScpLmFwcGVuZENoaWxkKGRpdik7XG5cdFx0ZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoJ2JhYy0tcHVyZXNkay11c2VyLWF2YXRhci0tJykuaW5uZXJIVE1MID0gdXNlci5maXJzdG5hbWUuY2hhckF0KDApICsgdXNlci5sYXN0bmFtZS5jaGFyQXQoMCk7XG5cdH0sXG5cblx0cmVuZGVyQWNjb3VudHM6IGZ1bmN0aW9uIHJlbmRlckFjY291bnRzKGFjY291bnRzLCBjdXJyZW50QWNjb3VudCkge1xuXHRcdC8vIExvZ2dlci5sb2coY3VycmVudEFjY291bnQpO1xuXHRcdHZhciBhY2NvdW50c1RlbXBsYXRlID0gZnVuY3Rpb24gYWNjb3VudHNUZW1wbGF0ZShhY2NvdW50LCBpc1RoZVNlbGVjdGVkKSB7XG5cdFx0XHRyZXR1cm4gJ1xcblxcdFxcdFxcdFxcdDxkaXYgY2xhc3M9XCJiYWMtLXVzZXItbGlzdC1pdGVtLWltYWdlXCI+XFxuXFx0XFx0XFx0XFx0XFx0PGltZyBzcmM9XCInICsgYWNjb3VudC5zZGtfc3F1YXJlX2xvZ29faWNvbiArICdcIiBhbHQ9XCJcIj5cXG5cXHRcXHRcXHRcXHQ8L2Rpdj5cXG5cXHRcXHRcXHRcXHQ8ZGl2IGNsYXNzPVwiYmFjLXVzZXItYXBwLWRldGFpbHNcIj5cXG5cXHRcXHRcXHRcXHRcXHQgPHNwYW4+JyArIGFjY291bnQubmFtZSArICc8L3NwYW4+XFxuXFx0XFx0XFx0XFx0PC9kaXY+XFxuXFx0XFx0XFx0XFx0JyArIChpc1RoZVNlbGVjdGVkID8gJzxkaXYgaWQ9XCJiYWMtLXNlbGVjdGVkLWFjb3VudC1pbmRpY2F0b3JcIiBjbGFzcz1cImJhYy0tc2VsZWN0ZWQtYWNvdW50LWluZGljYXRvclwiPjwvZGl2PicgOiAnJykgKyAnXFxuXFx0XFx0XFx0Jztcblx0XHR9O1xuXG5cdFx0dmFyIF9sb29wID0gZnVuY3Rpb24gX2xvb3AoaSkge1xuXHRcdFx0dmFyIGFjY291bnQgPSBhY2NvdW50c1tpXTtcblx0XHRcdHZhciBkaXYgPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KCdkaXYnKTtcblx0XHRcdGRpdi5jbGFzc05hbWUgPSAnYmFjLS11c2VyLWxpc3QtaXRlbSc7XG5cdFx0XHRkaXYuaW5uZXJIVE1MID0gYWNjb3VudHNUZW1wbGF0ZShhY2NvdW50LCBhY2NvdW50LnNmaWQgPT09IGN1cnJlbnRBY2NvdW50LnNmaWQpO1xuXHRcdFx0ZGl2Lm9uY2xpY2sgPSBmdW5jdGlvbiAoZSkge1xuXHRcdFx0XHRlLnByZXZlbnREZWZhdWx0KCk7XG5cdFx0XHRcdFBQQkEuY2hhbmdlQWNjb3VudChhY2NvdW50LnNmaWQpO1xuXHRcdFx0fTtcblx0XHRcdGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKCdiYWMtLXB1cmVzZGstdXNlci1idXNpbmVzc2VzLS0nKS5hcHBlbmRDaGlsZChkaXYpO1xuXHRcdH07XG5cblx0XHRmb3IgKHZhciBpID0gMDsgaSA8IGFjY291bnRzLmxlbmd0aDsgaSsrKSB7XG5cdFx0XHRfbG9vcChpKTtcblx0XHR9XG5cdH0sXG5cblx0cmVuZGVySW5mb0Jsb2NrczogZnVuY3Rpb24gcmVuZGVySW5mb0Jsb2NrcygpIHtcblx0XHR2YXIgYmxvY2tzVGVtcGxhdGUgPSBmdW5jdGlvbiBibG9ja3NUZW1wbGF0ZShpbmRleCkge1xuXHRcdFx0cmV0dXJuICdcXG5cXHRcXHRcXHRcXHQgPGRpdiBjbGFzcz1cImJhYy0tcHVyZXNkay1pbmZvLWJveC0tXCIgaWQ9XCJiYWMtLXB1cmVzZGstaW5mby1ib3gtLScgKyBpbmRleCArICdcIj5cXG5cXHRcXHRcXHRcXHQgXFx0PGRpdiBjbGFzcz1cImJhYy0tdGltZXJcIiBpZD1cImJhYy0tdGltZXInICsgaW5kZXggKyAnXCI+PC9kaXY+XFxuXFx0XFx0XFx0XFx0XFx0IDxkaXYgY2xhc3M9XCJiYWMtLWlubmVyLWluZm8tYm94LS1cIj5cXG5cXHRcXHRcXHRcXHRcXHQgXFx0XFx0PGRpdiBjbGFzcz1cImJhYy0taW5mby1pY29uLS0gZmEtc3VjY2Vzc1wiPjwvZGl2PlxcblxcdFxcdFxcdFxcdFxcdCBcXHRcXHQ8ZGl2IGNsYXNzPVwiYmFjLS1pbmZvLWljb24tLSBmYS13YXJuaW5nXCI+PC9kaXY+XFxuXFx0XFx0XFx0XFx0XFx0IFxcdFxcdDxkaXYgY2xhc3M9XCJiYWMtLWluZm8taWNvbi0tIGZhLWluZm8tMVwiPjwvZGl2PlxcblxcdFxcdFxcdFxcdFxcdCBcXHRcXHQ8ZGl2IGNsYXNzPVwiYmFjLS1pbmZvLWljb24tLSBmYS1lcnJvclwiPjwvZGl2PlxcblxcdFxcdFxcdFxcdFxcdCBcXHRcXHQgPGRpdiBjbGFzcz1cImJhYy0taW5mby1tYWluLXRleHQtLVwiIGlkPVwiYmFjLS1pbmZvLW1haW4tdGV4dC0tJyArIGluZGV4ICsgJ1wiPjwvZGl2PlxcblxcdFxcdFxcdFxcdFxcdCBcXHRcXHQgPGRpdiBjbGFzcz1cImJhYy0taW5mby1jbG9zZS1idXR0b24tLSBmYS1jbG9zZS0xXCIgaWQ9XCJiYWMtLWluZm8tY2xvc2UtYnV0dG9uLS0nICsgaW5kZXggKyAnXCI+PC9kaXY+XFxuXFx0XFx0XFx0XFx0XFx0PC9kaXY+XFxuXFx0XFx0XFx0XFx0PC9kaXY+XFxuXFx0XFx0ICAnO1xuXHRcdH07XG5cblx0XHR2YXIgaW5mb0Jsb2Nrc1dyYXBwZXIgPSBkb2N1bWVudC5nZXRFbGVtZW50QnlJZCgnYmFjLS1pbmZvLWJsb2Nrcy13cmFwcGVyLS0nKTtcblx0XHR2YXIgaW5uZXJIdG1sID0gJyc7XG5cdFx0Zm9yICh2YXIgaSA9IDE7IGkgPCA1OyBpKyspIHtcblx0XHRcdGlubmVySHRtbCArPSBibG9ja3NUZW1wbGF0ZShpKTtcblx0XHR9XG5cblx0XHRpbmZvQmxvY2tzV3JhcHBlci5pbm5lckhUTUwgPSBpbm5lckh0bWw7XG5cdH0sXG5cblx0cmVuZGVyVmVyc2lvbk51bWJlcjogZnVuY3Rpb24gcmVuZGVyVmVyc2lvbk51bWJlcih2ZXJzaW9uKSB7XG5cdFx0ZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoJ3B1cmVzZGstdmVyc2lvbi1udW1iZXInKS5pbm5lckhUTUwgPSB2ZXJzaW9uO1xuXHR9LFxuXG5cdHN0eWxlQWNjb3VudDogZnVuY3Rpb24gc3R5bGVBY2NvdW50KGFjY291bnQpIHtcblx0XHR2YXIgYXBwSW5mbyA9IFN0b3JlLmdldEFwcEluZm8oKTtcblx0XHRpZiAoYXBwSW5mbyA9PT0gbnVsbCkge1xuXHRcdFx0dmFyIGxvZ28gPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KCdpbWcnKTtcblx0XHRcdGxvZ28uc3JjID0gYWNjb3VudC5zZGtfbG9nb19pY29uO1xuXHRcdFx0ZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoJ2JhYy0tcHVyZXNkay1hY2NvdW50LWxvZ28tLScpLmFwcGVuZENoaWxkKGxvZ28pO1xuXHRcdFx0ZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoJ2JhYy0tcHVyZXNkay1hY2NvdW50LWxvZ28tLScpLm9uY2xpY2sgPSBmdW5jdGlvbiAoZSkge1xuXHRcdFx0XHQvL0xvZ2dlci5sb2coU3RvcmUuZ2V0Um9vdFVybCgpKTtcblx0XHRcdFx0d2luZG93LmxvY2F0aW9uLmhyZWYgPSBTdG9yZS5nZXRSb290VXJsKCk7XG5cdFx0XHR9O1xuXHRcdH0gZWxzZSB7XG5cdFx0XHR2YXIgYXBwT3BlbmVyVGVtcGxhdGUgPSBmdW5jdGlvbiBhcHBPcGVuZXJUZW1wbGF0ZShhcHBJbmZvcm1hdGlvbikge1xuXHRcdFx0XHRyZXR1cm4gJ1xcblxcdCBcXHQgIFxcdCBcXHRcXHQ8ZGl2IGlkPVwiYmFjLS1wdXJlc2RrLS1hcHBzLS1vcGVuZXItLVwiPlxcbiAgICAgICAgICAgICAgICAgICAgPGkgY2xhc3M9XCJmYSBmYS1zcXVhcmVzXCIgaWQ9XCJiYWMtLXB1cmVzZGstYXBwcy1pY29uLS1cIj48L2k+XFxuICAgICAgICAgICAgICAgICAgICA8ZGl2IGlkPVwiYmFjLS1wdXJlc2RrLWFwcHMtbmFtZS0tXCIgY2xhc3M9XCJiYWMtLXB1cmVzZGstYXBwcy1uYW1lLS1cIj5hcHBzPC9kaXY+XFxuICAgICAgICAgICAgICAgICAgICA8YSBocmVmPVwiJyArIGFwcEluZm9ybWF0aW9uLnJvb3QgKyAnXCIgaWQ9XCJhcHAtbmFtZS1saW5rLXRvLXJvb3RcIj4nICsgYXBwSW5mb3JtYXRpb24ubmFtZSArICc8L2E+XFxuICAgICAgICAgICAgICAgIDwvZGl2PlxcblxcdCBcXHQgIFxcdCBcXHQnO1xuXHRcdFx0fTtcblx0XHRcdGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKCdiYWMtLXB1cmVzZGstYWNjb3VudC1sb2dvLS0nKS5pbm5lckhUTUwgPSBhcHBPcGVuZXJUZW1wbGF0ZShhcHBJbmZvKTtcblx0XHR9XG5cblx0XHRkb2N1bWVudC5nZXRFbGVtZW50QnlJZCgnYmFjLS1wdXJlc2RrLWJhYy0taGVhZGVyLWFwcHMtLScpLnN0eWxlLmNzc1RleHQgPSBcImJhY2tncm91bmQ6ICNcIiArIGFjY291bnQuc2RrX2JhY2tncm91bmRfY29sb3IgKyBcIjsgY29sb3I6ICNcIiArIGFjY291bnQuc2RrX2ZvbnRfY29sb3I7XG5cdFx0ZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoJ2JhYy0tcHVyZXNkay11c2VyLXNpZGViYXItLScpLnN0eWxlLmNzc1RleHQgPSBcImJhY2tncm91bmQ6ICNcIiArIGFjY291bnQuc2RrX2JhY2tncm91bmRfY29sb3IgKyBcIjsgY29sb3I6ICNcIiArIGFjY291bnQuc2RrX2ZvbnRfY29sb3I7XG5cdFx0aWYgKGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKCdiYWMtLXB1cmVzZGstYXBwcy1uYW1lLS0nKSkge1xuXHRcdFx0ZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoJ2JhYy0tcHVyZXNkay1hcHBzLW5hbWUtLScpLnN0eWxlLmNzc1RleHQgPSBcImNvbG9yOiAjXCIgKyBhY2NvdW50LnNka19mb250X2NvbG9yO1xuXHRcdH1cblx0XHRpZiAoZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoJ2JhYy0tc2VsZWN0ZWQtYWNvdW50LWluZGljYXRvcicpKSB7XG5cdFx0XHRkb2N1bWVudC5nZXRFbGVtZW50QnlJZCgnYmFjLS1zZWxlY3RlZC1hY291bnQtaW5kaWNhdG9yJykuc3R5bGUuY3NzVGV4dCA9IFwiYmFja2dyb3VuZDogI1wiICsgYWNjb3VudC5zZGtfZm9udF9jb2xvcjtcblx0XHR9XG5cdH0sXG5cblx0Z29Ub0xvZ2luUGFnZTogZnVuY3Rpb24gZ29Ub0xvZ2luUGFnZSgpIHtcblx0XHR3aW5kb3cubG9jYXRpb24uaHJlZiA9IFN0b3JlLmdldExvZ2luVXJsKCk7XG5cdH0sXG5cblx0LyogTE9BREVSICovXG5cdHNob3dMb2FkZXI6IGZ1bmN0aW9uIHNob3dMb2FkZXIoKSB7XG5cdFx0RG9tLmFkZENsYXNzKGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKCdiYWMtLXB1cmVzZGstLWxvYWRlci0tJyksICdiYWMtLXB1cmVzZGstdmlzaWJsZScpO1xuXHR9LFxuXG5cdGhpZGVMb2FkZXI6IGZ1bmN0aW9uIGhpZGVMb2FkZXIoKSB7XG5cdFx0RG9tLnJlbW92ZUNsYXNzKGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKCdiYWMtLXB1cmVzZGstLWxvYWRlci0tJyksICdiYWMtLXB1cmVzZGstdmlzaWJsZScpO1xuXHR9LFxuXG5cdG9wZW5DbG91ZGluYXJ5UGlja2VyOiBmdW5jdGlvbiBvcGVuQ2xvdWRpbmFyeVBpY2tlcihvcHRpb25zKSB7XG5cdFx0Q2xvdWRpbmFyeS5vcGVuTW9kYWwob3B0aW9ucyk7XG5cdH0sXG5cblx0LypcbiAgdHlwZTogb25lIG9mOlxuICAtIHN1Y2Nlc3NcbiAgLSBpbmZvXG4gIC0gd2FybmluZ1xuICAtIGVycm9yXG4gIHRleHQ6IHRoZSB0ZXh0IHRvIGRpc3BsYXlcbiAgb3B0aW9ucyAob3B0aW9uYWwpOiB7XG4gIFx0XHRoaWRlSW46IG1pbGxpc2Vjb25kcyB0byBoaWRlIGl0LiAtMSBmb3Igbm90IGhpZGluZyBpdCBhdCBhbGwuIERlZmF1bHQgaXMgNTAwMFxuICB9XG4gICovXG5cdHNldEluZm86IGZ1bmN0aW9uIHNldEluZm8odHlwZSwgdGV4dCwgb3B0aW9ucykge1xuXHRcdEluZm9Db250cm9sbGVyLnNob3dJbmZvKHR5cGUsIHRleHQsIG9wdGlvbnMpO1xuXHR9LFxuXG5cdHJlbmRlcjogZnVuY3Rpb24gcmVuZGVyKCkge1xuXHRcdHZhciB3aGVyZVRvID0gZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoU3RvcmUuZ2V0SFRMTUNvbnRhaW5lcigpKTtcblx0XHRpZiAod2hlcmVUbyA9PT0gbnVsbCkge1xuXHRcdFx0TG9nZ2VyLmVycm9yKCd0aGUgY29udGFpbmVyIHdpdGggaWQgXCInICsgd2hlcmVUbyArICdcIiBoYXMgbm90IGJlZW4gZm91bmQgb24gdGhlIGRvY3VtZW50LiBUaGUgbGlicmFyeSBpcyBnb2luZyB0byBjcmVhdGUgaXQuJyk7XG5cdFx0XHR2YXIgZGl2ID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudCgnZGl2Jyk7XG5cdFx0XHRkaXYuaWQgPSBTdG9yZS5nZXRIVExNQ29udGFpbmVyKCk7XG5cdFx0XHRkaXYuc3R5bGUud2lkdGggPSAnMTAwJSc7XG5cdFx0XHRkaXYuc3R5bGUuaGVpZ2h0ID0gXCI1MHB4XCI7XG5cdFx0XHRkaXYuc3R5bGUucG9zaXRpb24gPSBcImZpeGVkXCI7XG5cdFx0XHRkaXYuc3R5bGUudG9wID0gXCIwcHhcIjtcblx0XHRcdGRpdi5zdHlsZS56SW5kZXggPSBcIjIxNDc0ODM2NDdcIjtcblx0XHRcdGRvY3VtZW50LmJvZHkuaW5zZXJ0QmVmb3JlKGRpdiwgZG9jdW1lbnQuYm9keS5maXJzdENoaWxkKTtcblx0XHRcdHdoZXJlVG8gPSBkb2N1bWVudC5nZXRFbGVtZW50QnlJZChTdG9yZS5nZXRIVExNQ29udGFpbmVyKCkpO1xuXHRcdH1cblx0XHR3aGVyZVRvLmlubmVySFRNTCA9IFN0b3JlLmdldEhUTUwoKTtcblx0XHRQUEJBLnJlbmRlclVzZXIoU3RvcmUuZ2V0VXNlckRhdGEoKS51c2VyKTtcblx0XHRQUEJBLnJlbmRlckluZm9CbG9ja3MoKTtcblx0XHRQUEJBLnJlbmRlckFjY291bnRzKFN0b3JlLmdldFVzZXJEYXRhKCkudXNlci5hY2NvdW50cywgU3RvcmUuZ2V0VXNlckRhdGEoKS51c2VyLmFjY291bnQpO1xuXHRcdFBQQkEuc3R5bGVBY2NvdW50KFN0b3JlLmdldFVzZXJEYXRhKCkudXNlci5hY2NvdW50KTtcblx0XHRQUEJBLnJlbmRlclZlcnNpb25OdW1iZXIoU3RvcmUuZ2V0VmVyc2lvbk51bWJlcigpKTtcblx0XHRpZiAoU3RvcmUuZ2V0QXBwc1Zpc2libGUoKSA9PT0gZmFsc2UpIHtcblx0XHRcdGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKCdiYWMtLXB1cmVzZGstYXBwcy1zZWN0aW9uLS0nKS5zdHlsZS5jc3NUZXh0ID0gXCJkaXNwbGF5Om5vbmVcIjtcblx0XHR9XG5cdFx0YWZ0ZXJSZW5kZXIoKTtcblx0fVxufTtcblxubW9kdWxlLmV4cG9ydHMgPSBQUEJBOyIsIid1c2Ugc3RyaWN0JztcblxuLyohXG4gKiBQdXJlUHJvZmlsZSBQdXJlUHJvZmlsZSBCdXNpbmVzcyBBcHBzIERldmVsb3BtZW50IFNES1xuICpcbiAqIHZlcnNpb246IDIuNi4zXG4gKiBkYXRlOiAyMDE3LTA5LTE4XG4gKlxuICogQ29weXJpZ2h0IDIwMTcsIFB1cmVQcm9maWxlXG4gKiBSZWxlYXNlZCB1bmRlciBNSVQgbGljZW5zZVxuICogaHR0cHM6Ly9vcGVuc291cmNlLm9yZy9saWNlbnNlcy9NSVRcbiAqL1xuXG52YXIgcHBiYSA9IHJlcXVpcmUoJy4vUFBCQScpO1xucHBiYS5zZXRXaW5kb3dOYW1lKCdQVVJFU0RLJyk7XG5wcGJhLnNldENvbmZpZ3VyYXRpb24oe1xuICAgIFwibG9nc1wiOiBmYWxzZSxcbiAgICBcInJvb3RVcmxcIjogXCIvXCIsXG4gICAgXCJiYXNlVXJsXCI6IFwiYXBpL3YxL1wiLFxuICAgIFwibG9naW5VcmxcIjogXCJhcGkvdjEvb2F1dGgyXCIsXG4gICAgXCJzZWFyY2hJbnB1dElkXCI6IFwiLS1wdXJlc2RrLS1zZWFyY2gtLWlucHV0LS1cIixcbiAgICBcInJlZGlyZWN0VXJsUGFyYW1cIjogXCJyZWRpcmVjdF91cmxcIlxufSk7XG5wcGJhLnNldEhUTUxUZW1wbGF0ZSgnPGhlYWRlciBjbGFzcz1cImJhYy0taGVhZGVyLWFwcHNcIiBpZD1cImJhYy0tcHVyZXNkay1iYWMtLWhlYWRlci1hcHBzLS1cIj5cXG4gICAgPGRpdiBjbGFzcz1cImJhYy0tY29udGFpbmVyXCI+XFxuICAgICAgICA8ZGl2IGNsYXNzPVwiYmFjLS1sb2dvXCIgaWQ9XCJiYWMtLXB1cmVzZGstYWNjb3VudC1sb2dvLS1cIj48L2Rpdj5cXG4gICAgICAgIDxkaXYgY2xhc3M9XCJiYWMtLXVzZXItYWN0aW9uc1wiPlxcbiAgICAgICAgICAgIDxzdmcgaWQ9XCJiYWMtLXB1cmVzZGstLWxvYWRlci0tXCIgd2lkdGg9XCIzOFwiIGhlaWdodD1cIjM4XCIgdmlld0JveD1cIjAgMCA0NCA0NFwiIHhtbG5zPVwiaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmdcIiBzdHJva2U9XCIjZmZmXCIgc3R5bGU9XCJcXG4gICAgbWFyZ2luLXJpZ2h0OiAxMHB4O1xcblwiPlxcbiAgICAgICAgICAgICAgICA8ZyBmaWxsPVwibm9uZVwiIGZpbGwtcnVsZT1cImV2ZW5vZGRcIiBzdHJva2Utd2lkdGg9XCIyXCI+XFxuICAgICAgICAgICAgICAgICAgICA8Y2lyY2xlIGN4PVwiMjJcIiBjeT1cIjIyXCIgcj1cIjE2LjY0MzdcIj5cXG4gICAgICAgICAgICAgICAgICAgICAgICA8YW5pbWF0ZSBhdHRyaWJ1dGVOYW1lPVwiclwiIGJlZ2luPVwiMHNcIiBkdXI9XCIxLjhzXCIgdmFsdWVzPVwiMTsgMjBcIiBjYWxjTW9kZT1cInNwbGluZVwiIGtleVRpbWVzPVwiMDsgMVwiIGtleVNwbGluZXM9XCIwLjE2NSwgMC44NCwgMC40NCwgMVwiIHJlcGVhdENvdW50PVwiaW5kZWZpbml0ZVwiPjwvYW5pbWF0ZT5cXG4gICAgICAgICAgICAgICAgICAgICAgICA8YW5pbWF0ZSBhdHRyaWJ1dGVOYW1lPVwic3Ryb2tlLW9wYWNpdHlcIiBiZWdpbj1cIjBzXCIgZHVyPVwiMS44c1wiIHZhbHVlcz1cIjE7IDBcIiBjYWxjTW9kZT1cInNwbGluZVwiIGtleVRpbWVzPVwiMDsgMVwiIGtleVNwbGluZXM9XCIwLjMsIDAuNjEsIDAuMzU1LCAxXCIgcmVwZWF0Q291bnQ9XCJpbmRlZmluaXRlXCI+PC9hbmltYXRlPlxcbiAgICAgICAgICAgICAgICAgICAgPC9jaXJjbGU+XFxuICAgICAgICAgICAgICAgICAgICA8Y2lyY2xlIGN4PVwiMjJcIiBjeT1cIjIyXCIgcj1cIjE5LjkyODJcIj5cXG4gICAgICAgICAgICAgICAgICAgICAgICA8YW5pbWF0ZSBhdHRyaWJ1dGVOYW1lPVwiclwiIGJlZ2luPVwiYmFjLTAuOXNcIiBkdXI9XCIxLjhzXCIgdmFsdWVzPVwiMTsgMjBcIiBjYWxjTW9kZT1cInNwbGluZVwiIGtleVRpbWVzPVwiMDsgMVwiIGtleVNwbGluZXM9XCIwLjE2NSwgMC44NCwgMC40NCwgMVwiIHJlcGVhdENvdW50PVwiaW5kZWZpbml0ZVwiPjwvYW5pbWF0ZT5cXG4gICAgICAgICAgICAgICAgICAgICAgICA8YW5pbWF0ZSBhdHRyaWJ1dGVOYW1lPVwic3Ryb2tlLW9wYWNpdHlcIiBiZWdpbj1cImJhYy0wLjlzXCIgZHVyPVwiMS44c1wiIHZhbHVlcz1cIjE7IDBcIiBjYWxjTW9kZT1cInNwbGluZVwiIGtleVRpbWVzPVwiMDsgMVwiIGtleVNwbGluZXM9XCIwLjMsIDAuNjEsIDAuMzU1LCAxXCIgcmVwZWF0Q291bnQ9XCJpbmRlZmluaXRlXCI+PC9hbmltYXRlPlxcbiAgICAgICAgICAgICAgICAgICAgPC9jaXJjbGU+XFxuICAgICAgICAgICAgICAgIDwvZz5cXG4gICAgICAgICAgICA8L3N2Zz5cXG4gICAgICAgICAgICA8ZGl2IGNsYXNzPVwiYmFjLS11c2VyLWFwcHNcIiBpZD1cImJhYy0tcHVyZXNkay1hcHBzLXNlY3Rpb24tLVwiPlxcbiAgICAgICAgICAgICAgICA8IS0tPGRpdiBpZD1cImJhYyYjNDU7JiM0NTtwdXJlc2RrJiM0NTsmIzQ1O2FwcHMmIzQ1OyYjNDU7b3BlbmVyJiM0NTsmIzQ1O1wiPi0tPlxcbiAgICAgICAgICAgICAgICAgICAgPCEtLTxpIGNsYXNzPVwiZmEgZmEtc3F1YXJlc1wiIGlkPVwiYmFjJiM0NTsmIzQ1O3B1cmVzZGstYXBwcy1pY29uJiM0NTsmIzQ1O1wiPjwvaT4tLT5cXG4gICAgICAgICAgICAgICAgICAgIDwhLS08ZGl2IGNsYXNzPVwiYmFjJiM0NTsmIzQ1O3B1cmVzZGstYXBwcy1uYW1lJiM0NTsmIzQ1O1wiPmFwcHM8L2Rpdj4tLT5cXG4gICAgICAgICAgICAgICAgPCEtLTwvZGl2Pi0tPlxcbiAgICAgICAgICAgICAgICA8IS0tPGRpdiBjbGFzcz1cImJhYyYjNDU7JiM0NTthcHBzLWNvbnRhaW5lclwiIGlkPVwiYmFjJiM0NTsmIzQ1O3B1cmVzZGstYXBwcy1jb250YWluZXImIzQ1OyYjNDU7XCI+LS0+XFxuICAgICAgICAgICAgICAgICAgICA8IS0tPGRpdiBjbGFzcz1cImJhYyYjNDU7JiM0NTthcHBzLWFycm93XCI+PC9kaXY+LS0+XFxuICAgICAgICAgICAgICAgIDwhLS08L2Rpdj4tLT5cXG4gICAgICAgICAgICA8L2Rpdj5cXG4gICAgICAgICAgICA8IS0tPGRpdiBjbGFzcz1cImJhYyYjNDU7JiM0NTt1c2VyLW5vdGlmaWNhdGlvbnNcIj4tLT5cXG4gICAgICAgICAgICAgICAgPCEtLTxkaXYgY2xhc3M9XCJiYWMmIzQ1OyYjNDU7dXNlci1ub3RpZmljYXRpb25zLWNvdW50XCI+MTwvZGl2Pi0tPlxcbiAgICAgICAgICAgICAgICA8IS0tPGkgY2xhc3M9XCJmYSBmYS1iZWxsLW9cIj48L2k+LS0+XFxuICAgICAgICAgICAgPCEtLTwvZGl2Pi0tPlxcbiAgICAgICAgICAgIDxkaXYgY2xhc3M9XCJiYWMtLXVzZXItYXZhdGFyXCIgaWQ9XCJiYWMtLXVzZXItYXZhdGFyLXRvcFwiPlxcbiAgICAgICAgICAgICAgICA8c3BhbiBjbGFzcz1cImJhYy0tdXNlci1hdmF0YXItbmFtZVwiIGlkPVwiYmFjLS1wdXJlc2RrLXVzZXItYXZhdGFyLS1cIj48L3NwYW4+XFxuICAgICAgICAgICAgICAgIDxkaXYgaWQ9XCJiYWMtLWltYWdlLWNvbnRhaW5lci10b3BcIj48L2Rpdj5cXG4gICAgICAgICAgICA8L2Rpdj5cXG4gICAgICAgIDwvZGl2PlxcbiAgICA8L2Rpdj5cXG4gICAgPGRpdiBpZD1cImJhYy0taW5mby1ibG9ja3Mtd3JhcHBlci0tXCI+PC9kaXY+XFxuPC9oZWFkZXI+XFxuPGRpdiBjbGFzcz1cImJhYy0tdXNlci1zaWRlYmFyXCIgaWQ9XCJiYWMtLXB1cmVzZGstdXNlci1zaWRlYmFyLS1cIj5cXG4gICAgPGRpdiBpZD1cImJhYy0tcHVyZXNkay11c2VyLWRldGFpbHMtLVwiPjwvZGl2PlxcbiAgICA8IS0tPGRpdiBjbGFzcz1cImJhYyYjNDU7JiM0NTt1c2VyLXNpZGViYXItaW5mb1wiPi0tPlxcbiAgICAgICAgPCEtLTxkaXYgY2xhc3M9XCJiYWMmIzQ1OyYjNDU7dXNlci1pbWFnZVwiPjxpIGNsYXNzPVwiZmEgZmEtY2FtZXJhXCI+PC9pPjwvZGl2Pi0tPlxcbiAgICAgICAgPCEtLTxkaXYgY2xhc3M9XCJiYWMmIzQ1OyYjNDU7dXNlci1uYW1lXCI+Q3VydGlzIEJhcnRsZXR0PC9kaXY+LS0+XFxuICAgICAgICA8IS0tPGRpdiBjbGFzcz1cImJhYyYjNDU7JiM0NTt1c2VyLWVtYWlsXCI+Y2JhcnRsZXR0QHB1cmVwcm9maWxlLmNvbTwvZGl2Pi0tPlxcbiAgICA8IS0tPC9kaXY+LS0+XFxuICAgIDxkaXYgY2xhc3M9XCJiYWMtLXVzZXItYXBwc1wiIGlkPVwiYmFjLS1wdXJlc2RrLXVzZXItYnVzaW5lc3Nlcy0tXCI+XFxuICAgICAgICA8IS0tPGRpdiBjbGFzcz1cImJhYyYjNDU7JiM0NTt1c2VyLWxpc3QtaXRlbVwiPi0tPlxcbiAgICAgICAgICAgIDwhLS08aW1nIHNyYz1cImh0dHA6Ly9sb3JlbXBpeGVsLmNvbS80MC80MFwiIGFsdD1cIlwiPi0tPlxcbiAgICAgICAgICAgIDwhLS08ZGl2IGNsYXNzPVwiYmFjLXVzZXItYXBwLWRldGFpbHNcIj4tLT5cXG4gICAgICAgICAgICAgICAgPCEtLTxzcGFuPjwvc3Bhbj4tLT5cXG4gICAgICAgICAgICAgICAgPCEtLTxzcGFuPjE1IHRlYW0gbWVtYmVyczwvc3Bhbj4tLT5cXG4gICAgICAgICAgICA8IS0tPC9kaXY+LS0+XFxuICAgICAgICA8IS0tPC9kaXY+LS0+XFxuICAgIDwvZGl2PlxcbiAgICA8ZGl2IGNsYXNzPVwiYmFjLS11c2VyLWFjY291bnQtc2V0dGluZ3NcIj5cXG4gICAgICAgIDwhLS08ZGl2IGNsYXNzPVwiYmFjLXVzZXItYWNvdW50LWxpc3QtaXRlbVwiPi0tPlxcbiAgICAgICAgICAgIDwhLS08aSBjbGFzcz1cImZhIGZhLWNvZy1saW5lXCI+PC9pPi0tPlxcbiAgICAgICAgICAgIDwhLS08YSBocmVmPVwiI1wiPkFjY291bnQgU2VjdXJpdHk8L2E+LS0+XFxuICAgICAgICA8IS0tPC9kaXY+LS0+XFxuICAgICAgICA8ZGl2IGNsYXNzPVwiYmFjLXVzZXItYWNvdW50LWxpc3QtaXRlbVwiPlxcbiAgICAgICAgICAgIDxpIGNsYXNzPVwiZmEgZmEtbG9naW4tbGluZVwiPjwvaT5cXG4gICAgICAgICAgICA8YSBocmVmPVwiL2FwaS92MS9zaWduLW9mZlwiPkxvZyBvdXQ8L2E+XFxuICAgICAgICA8L2Rpdj5cXG5cXG4gICAgICAgIDxkaXYgaWQ9XCJwdXJlc2RrLXZlcnNpb24tbnVtYmVyXCIgY2xhc3M9XCJwdXJlc2RrLXZlcnNpb24tbnVtYmVyXCI+PC9kaXY+XFxuICAgIDwvZGl2PlxcbjwvZGl2PlxcblxcblxcbjxkaXYgY2xhc3M9XCJiYWMtLWN1c3RvbS1tb2RhbCBhZGQtcXVlc3Rpb24tbW9kYWwgLS1pcy1vcGVuXCIgaWQ9XCJiYWMtLWNsb3VkaW5hcnktLW1vZGFsXCI+XFxuICAgIDxkaXYgY2xhc3M9XCJjdXN0b20tbW9kYWxfX3dyYXBwZXJcIj5cXG4gICAgICAgIDxkaXYgY2xhc3M9XCJjdXN0b20tbW9kYWxfX2NvbnRlbnRcIj5cXG4gICAgICAgICAgICA8aDM+QWRkIGltYWdlPC9oMz5cXG4gICAgICAgICAgICA8YSBjbGFzcz1cImN1c3RvbS1tb2RhbF9fY2xvc2UtYnRuXCIgaWQ9XCJiYWMtLWNsb3VkaW5hcnktLWNsb3NlYnRuXCI+PGkgY2xhc3M9XCJmYSBmYS10aW1lcy1jaXJjbGVcIj48L2k+PC9hPlxcbiAgICAgICAgPC9kaXY+XFxuXFxuICAgICAgICA8ZGl2IGNsYXNzPVwiY3VzdG9tLW1vZGFsX19jb250ZW50XCI+XFxuICAgICAgICAgICAgPGRpdiBjbGFzcz1cImJhYy1zZWFyY2ggLS1pY29uLWxlZnRcIj5cXG4gICAgICAgICAgICAgICAgPGlucHV0IGlkPVwiYmFjLS1jbG91ZGluYXJ5LS1zZWFyY2gtaW5wdXRcIiB0eXBlPVwic2VhcmNoXCIgbmFtZT1cInNlYXJjaFwiIHBsYWNlaG9sZGVyPVwiU2VhcmNoIGZvciBpbWFnZXMuLi5cIi8+XFxuICAgICAgICAgICAgICAgIDxkaXYgY2xhc3M9XCJiYWMtc2VhcmNoX19pY29uXCI+PGkgY2xhc3M9XCJmYSBmYS1zZWFyY2hcIj48L2k+PC9kaXY+XFxuICAgICAgICAgICAgPC9kaXY+XFxuICAgICAgICAgICAgPGJyLz5cXG5cXG4gICAgICAgICAgICA8ZGl2IGNsYXNzPVwiYmFjay1idXR0b25cIiBpZD1cImJhYy0tY2xvdWRpbmFyeS0tYmFjay1idXR0b24tY29udGFpbmVyXCI+XFxuICAgICAgICAgICAgICAgIDxhIGNsYXNzPVwiZ29CYWNrXCIgaWQ9XCJiYWMtLWNsb3VkaW5hcnktLWdvLWJhY2tcIj48aSBjbGFzcz1cImZhIGZhLWFuZ2xlLWxlZnRcIj48L2k+R28gQmFjazwvYT5cXG4gICAgICAgICAgICA8L2Rpdj5cXG5cXG4gICAgICAgICAgICA8YnIvPlxcbiAgICAgICAgICAgIDxkaXYgY2xhc3M9XCJjbG91ZC1pbWFnZXNcIj5cXG4gICAgICAgICAgICAgICAgPGRpdiBjbGFzcz1cImNsb3VkLWltYWdlc19fY29udGFpbmVyXCIgaWQ9XCJiYWMtLWNsb3VkaW5hcnktaXRhbXMtY29udGFpbmVyXCI+PC9kaXY+XFxuXFxuICAgICAgICAgICAgICAgIDxkaXYgY2xhc3M9XCJjbG91ZC1pbWFnZXNfX3BhZ2luYXRpb25cIiBpZD1cImJhYy0tY2xvdWRpbmFyeS1wYWdpbmF0aW9uLWNvbnRhaW5lclwiPlxcbiAgICAgICAgICAgICAgICAgICAgPHVsIGlkPVwiYmFjLS1jbG91ZGluYXJ5LWFjdHVhbC1wYWdpbmF0aW9uLWNvbnRhaW5lclwiPjwvdWw+XFxuICAgICAgICAgICAgICAgIDwvZGl2PlxcblxcbiAgICAgICAgICAgIDwvZGl2PlxcbiAgICAgICAgPC9kaXY+XFxuICAgIDwvZGl2PlxcbjwvZGl2PlxcblxcbjxpbnB1dCBzdHlsZT1cImRpc3BsYXk6bm9uZVwiIHR5cGU9XFwnZmlsZVxcJyBpZD1cXCdiYWMtLS1wdXJlc2RrLWF2YXRhci1maWxlXFwnPlxcbjxpbnB1dCBzdHlsZT1cImRpc3BsYXk6bm9uZVwiIHR5cGU9XFwnYnV0dG9uXFwnIGlkPVxcJ2JhYy0tLXB1cmVzZGstYXZhdGFyLXN1Ym1pdFxcJyB2YWx1ZT1cXCdVcGxvYWQhXFwnPicpO1xucHBiYS5zZXRWZXJzaW9uTnVtYmVyKCcyLjYuMycpO1xuXG53aW5kb3cuUFVSRVNESyA9IHBwYmE7XG5cbnZhciBjc3MgPSAnaHRtbCxib2R5LGRpdixzcGFuLGFwcGxldCxvYmplY3QsaWZyYW1lLGgxLGgyLGgzLGg0LGg1LGg2LHAsYmxvY2txdW90ZSxwcmUsYSxhYmJyLGFjcm9ueW0sYWRkcmVzcyxiaWcsY2l0ZSxjb2RlLGRlbCxkZm4sZW0saW1nLGlucyxrYmQscSxzLHNhbXAsc21hbGwsc3RyaWtlLHN0cm9uZyxzdWIsc3VwLHR0LHZhcixiLHUsaSxjZW50ZXIsZGwsZHQsZGQsb2wsdWwsbGksZmllbGRzZXQsZm9ybSxsYWJlbCxsZWdlbmQsdGFibGUsY2FwdGlvbix0Ym9keSx0Zm9vdCx0aGVhZCx0cix0aCx0ZCxhcnRpY2xlLGFzaWRlLGNhbnZhcyxkZXRhaWxzLGVtYmVkLGZpZ3VyZSxmaWdjYXB0aW9uLGZvb3RlcixoZWFkZXIsaGdyb3VwLG1lbnUsbmF2LG91dHB1dCxydWJ5LHNlY3Rpb24sc3VtbWFyeSx0aW1lLG1hcmssYXVkaW8sdmlkZW97bWFyZ2luOjA7cGFkZGluZzowO2JvcmRlcjowO2ZvbnQtc2l6ZToxMDAlO2ZvbnQ6aW5oZXJpdDt2ZXJ0aWNhbC1hbGlnbjpiYXNlbGluZX1hcnRpY2xlLGFzaWRlLGRldGFpbHMsZmlnY2FwdGlvbixmaWd1cmUsZm9vdGVyLGhlYWRlcixoZ3JvdXAsbWVudSxuYXYsc2VjdGlvbntkaXNwbGF5OmJsb2NrfWJvZHl7bGluZS1oZWlnaHQ6MX1vbCx1bHtsaXN0LXN0eWxlOm5vbmV9YmxvY2txdW90ZSxxe3F1b3Rlczpub25lfWJsb2NrcXVvdGU6YmVmb3JlLGJsb2NrcXVvdGU6YWZ0ZXIscTpiZWZvcmUscTphZnRlcntjb250ZW50OlwiXCI7Y29udGVudDpub25lfXRhYmxle2JvcmRlci1jb2xsYXBzZTpjb2xsYXBzZTtib3JkZXItc3BhY2luZzowfWJvZHl7b3ZlcmZsb3cteDpoaWRkZW59I2JhYy13cmFwcGVye2ZvbnQtZmFtaWx5OlwiVmVyZGFuYVwiLCBhcmlhbCwgc2Fucy1zZXJpZjtjb2xvcjp3aGl0ZTttaW4taGVpZ2h0OjEwMHZoO3Bvc2l0aW9uOnJlbGF0aXZlfS5iYWMtLWNvbnRhaW5lcnttYXgtd2lkdGg6MTE2MHB4O21hcmdpbjowIGF1dG99LmJhYy0tY29udGFpbmVyICNhcHAtbmFtZS1saW5rLXRvLXJvb3R7ZGlzcGxheTpibG9jaztwb3NpdGlvbjphYnNvbHV0ZTtsZWZ0OjY1cHg7dG9wOjRweDtmb250LXNpemU6MS40ZW07d2lkdGg6MTUwcHg7Y29sb3I6d2hpdGU7dGV4dC1kZWNvcmF0aW9uOm5vbmV9LmJhYy0taGVhZGVyLWFwcHN7cG9zaXRpb246YWJzb2x1dGU7d2lkdGg6MTAwJTtoZWlnaHQ6NTBweDtiYWNrZ3JvdW5kLWNvbG9yOiM0NzUzNjk7cGFkZGluZzo1cHggMTBweDt6LWluZGV4Ojk5OTk5OTl9LmJhYy0taGVhZGVyLWFwcHMgLmJhYy0tY29udGFpbmVye2hlaWdodDoxMDAlO2Rpc3BsYXk6ZmxleDthbGlnbi1pdGVtczpjZW50ZXI7anVzdGlmeS1jb250ZW50OnNwYWNlLWJldHdlZW59LmJhYy0taGVhZGVyLXNlYXJjaHtwb3NpdGlvbjpyZWxhdGl2ZX0uYmFjLS1oZWFkZXItc2VhcmNoIGlucHV0e2NvbG9yOiNmZmY7Zm9udC1zaXplOjE0cHg7aGVpZ2h0OjM1cHg7YmFja2dyb3VuZC1jb2xvcjojNmI3NTg2O3BhZGRpbmc6MCA1cHggMCAxMHB4O2JvcmRlcjpub25lO2JvcmRlci1yYWRpdXM6M3B4O21pbi13aWR0aDo0MDBweDt3aWR0aDoxMDAlfS5iYWMtLWhlYWRlci1zZWFyY2ggaW5wdXQ6Zm9jdXN7b3V0bGluZTpub25lfS5iYWMtLWhlYWRlci1zZWFyY2ggaW5wdXQ6Oi13ZWJraXQtaW5wdXQtcGxhY2Vob2xkZXJ7Zm9udC1zdHlsZTpub3JtYWwgIWltcG9ydGFudDt0ZXh0LWFsaWduOmNlbnRlcjtjb2xvcjojZmZmO2ZvbnQtc2l6ZToxNHB4O2ZvbnQtd2VpZ2h0OjMwMDtsZXR0ZXItc3BhY2luZzowLjVweH0uYmFjLS1oZWFkZXItc2VhcmNoIGlucHV0OjotbW96LXBsYWNlaG9sZGVye2ZvbnQtc3R5bGU6bm9ybWFsICFpbXBvcnRhbnQ7dGV4dC1hbGlnbjpjZW50ZXI7Y29sb3I6I2ZmZjtmb250LXNpemU6MTRweDtmb250LXdlaWdodDozMDA7bGV0dGVyLXNwYWNpbmc6MC41cHh9LmJhYy0taGVhZGVyLXNlYXJjaCBpbnB1dDotbXMtaW5wdXQtcGxhY2Vob2xkZXJ7Zm9udC1zdHlsZTpub3JtYWwgIWltcG9ydGFudDt0ZXh0LWFsaWduOmNlbnRlcjtjb2xvcjojZmZmO2ZvbnQtc2l6ZToxNHB4O2ZvbnQtd2VpZ2h0OjMwMDtsZXR0ZXItc3BhY2luZzowLjVweH0uYmFjLS1oZWFkZXItc2VhcmNoIGl7cG9zaXRpb246YWJzb2x1dGU7dG9wOjhweDtyaWdodDoxMHB4fS5iYWMtLXVzZXItYWN0aW9uc3tkaXNwbGF5OmZsZXg7YWxpZ24taXRlbXM6Y2VudGVyfS5iYWMtLXVzZXItYWN0aW9ucz5kaXZ7Y3Vyc29yOnBvaW50ZXI7Y29sb3I6d2hpdGV9LmJhYy0tdXNlci1hY3Rpb25zIC5iYWMtLXVzZXItbm90aWZpY2F0aW9uc3twb3NpdGlvbjpyZWxhdGl2ZX0uYmFjLS11c2VyLWFjdGlvbnMgLmJhYy0tdXNlci1ub3RpZmljYXRpb25zIGl7Zm9udC1zaXplOjIwcHh9LmJhYy0tdXNlci1hY3Rpb25zICNiYWMtLXB1cmVzZGstLWxvYWRlci0te2Rpc3BsYXk6bm9uZX0uYmFjLS11c2VyLWFjdGlvbnMgI2JhYy0tcHVyZXNkay0tbG9hZGVyLS0uYmFjLS1wdXJlc2RrLXZpc2libGV7ZGlzcGxheTpibG9ja30uYmFjLS11c2VyLWFjdGlvbnMgLmJhYy0tdXNlci1ub3RpZmljYXRpb25zLWNvdW50e3Bvc2l0aW9uOmFic29sdXRlO2Rpc3BsYXk6aW5saW5lLWJsb2NrO2hlaWdodDoxNXB4O3dpZHRoOjE1cHg7bGluZS1oZWlnaHQ6MTVweDtjb2xvcjojZmZmO2ZvbnQtc2l6ZToxMHB4O3RleHQtYWxpZ246Y2VudGVyO2JhY2tncm91bmQtY29sb3I6I2ZjM2IzMDtib3JkZXItcmFkaXVzOjUwJTt0b3A6LTVweDtsZWZ0Oi01cHh9LmJhYy0tdXNlci1hY3Rpb25zIC5iYWMtLXVzZXItYXZhdGFyLC5iYWMtLXVzZXItYWN0aW9ucyAuYmFjLS11c2VyLW5vdGlmaWNhdGlvbnN7bWFyZ2luLWxlZnQ6MjBweH0uYmFjLS11c2VyLWFjdGlvbnMgLmJhYy0tdXNlci1hdmF0YXJ7cG9zaXRpb246cmVsYXRpdmU7b3ZlcmZsb3c6aGlkZGVuO2JvcmRlci1yYWRpdXM6NTAlfS5iYWMtLXVzZXItYWN0aW9ucyAuYmFjLS11c2VyLWF2YXRhciAjYmFjLS1pbWFnZS1jb250YWluZXItdG9we3dpZHRoOjEwMCU7aGVpZ3RoOjEwMCU7cG9zaXRpb246YWJzb2x1dGU7dG9wOjA7bGVmdDowO3otaW5kZXg6MTtkaXNwbGF5Om5vbmV9LmJhYy0tdXNlci1hY3Rpb25zIC5iYWMtLXVzZXItYXZhdGFyICNiYWMtLWltYWdlLWNvbnRhaW5lci10b3AgaW1ne3dpZHRoOjEwMCU7aGVpZ2h0OjEwMCV9LmJhYy0tdXNlci1hY3Rpb25zIC5iYWMtLXVzZXItYXZhdGFyICNiYWMtLWltYWdlLWNvbnRhaW5lci10b3AuYmFjLS1wdXJlc2RrLXZpc2libGV7ZGlzcGxheTpibG9ja30uYmFjLS11c2VyLWFjdGlvbnMgLmJhYy0tdXNlci1hdmF0YXItbmFtZXtjb2xvcjojZmZmO2JhY2tncm91bmQtY29sb3I6I2FkYWRhZDtkaXNwbGF5OmlubGluZS1ibG9jaztoZWlnaHQ6MzVweDt3aWR0aDozNXB4O2xpbmUtaGVpZ2h0OjM1cHg7dGV4dC1hbGlnbjpjZW50ZXI7Zm9udC1zaXplOjE0cHh9LmJhYy0tdXNlci1hcHBze3Bvc2l0aW9uOnJlbGF0aXZlfSNiYWMtLXB1cmVzZGstYXBwcy1pY29uLS17d2lkdGg6MjBweDtkaXNwbGF5OmlubGluZS1ibG9jazt0ZXh0LWFsaWduOmNlbnRlcjtmb250LXNpemU6MTZweH0uYmFjLS1wdXJlc2RrLWFwcHMtbmFtZS0te2ZvbnQtc2l6ZTo5cHg7d2lkdGg6MjBweDt0ZXh0LWFsaWduOmNlbnRlcn0jYmFjLS1wdXJlc2RrLXVzZXItYnVzaW5lc3Nlcy0te2hlaWdodDpjYWxjKDEwMHZoIC0gNDU4cHgpO292ZXJmbG93OmF1dG99LmJhYy0tYXBwcy1jb250YWluZXJ7YmFja2dyb3VuZDojZmZmO3Bvc2l0aW9uOmFic29sdXRlO3RvcDo0NXB4O3JpZ2h0Oi00MHB4O2Rpc3BsYXk6ZmxleDt3aWR0aDozNjBweDtmbGV4LXdyYXA6d3JhcDtib3JkZXItcmFkaXVzOjEwcHg7cGFkZGluZzozMHB4O2p1c3RpZnktY29udGVudDpzcGFjZS1iZXR3ZWVuO3RleHQtYWxpZ246Y2VudGVyOy13ZWJraXQtYm94LXNoYWRvdzowIDAgMTBweCAycHggcmdiYSgwLDAsMCwwLjIpO2JveC1zaGFkb3c6MCAwIDEwcHggMnB4IHJnYmEoMCwwLDAsMC4yKTtvcGFjaXR5OjA7dmlzaWJpbGl0eTpoaWRkZW47dHJhbnNpdGlvbjphbGwgMC40cyBlYXNlO21heC1oZWlnaHQ6NTY2cHg7b3ZlcmZsb3c6YXV0b30uYmFjLS1hcHBzLWNvbnRhaW5lci5hY3RpdmV7b3BhY2l0eToxO3Zpc2liaWxpdHk6dmlzaWJsZX0uYmFjLS1hcHBzLWNvbnRhaW5lciAuYmFjLS1hcHBzLWFycm93e3Bvc2l0aW9uOmFic29sdXRlO2Rpc3BsYXk6YmxvY2s7aGVpZ2h0OjIwcHg7d2lkdGg6MjBweDt0b3A6LTEwcHg7cmlnaHQ6MzZweDtiYWNrZ3JvdW5kOiNmZmY7dHJhbnNmb3JtOnJvdGF0ZSgtNDVkZWcpO3otaW5kZXg6MX0uYmFjLS1hcHBzLWNvbnRhaW5lciAuYmFjLS1hcHBze3dpZHRoOjMyJTtkaXNwbGF5OmZsZXg7Zm9udC1zaXplOjMwcHg7bWFyZ2luLWJvdHRvbTo0MHB4O3RleHQtYWxpZ246Y2VudGVyO2p1c3RpZnktY29udGVudDpjZW50ZXI7ZmxleC13cmFwOndyYXB9LmJhYy0tYXBwcy1jb250YWluZXIgLmJhYy0tYXBwcyBhe2Rpc3BsYXk6YmxvY2s7Y29sb3I6I2ZmZjt0ZXh0LWRlY29yYXRpb246bm9uZTt3aWR0aDo2NXB4O2hlaWdodDo2NXB4O3BhZGRpbmctdG9wOjNweDtsaW5lLWhlaWdodDo2NXB4O3RleHQtYWxpZ246Y2VudGVyO2JvcmRlci1yYWRpdXM6MTBweDstd2Via2l0LWJveC1zaGFkb3c6MCAwIDVweCAwIHJnYmEoMCwwLDAsMC4yKTtib3gtc2hhZG93OjAgMCA1cHggMCByZ2JhKDAsMCwwLDAuMil9LmJhYy0tYXBwcy1jb250YWluZXIgLmJhYy0tYXBwcyAuYmFjLS1hcHAtbmFtZXt3aWR0aDoxMDAlO2NvbG9yOiMwMDA7Zm9udC1zaXplOjE0cHg7cGFkZGluZzoxMHB4IDAgNXB4IDB9LmJhYy0tYXBwcy1jb250YWluZXIgLmJhYy0tYXBwcyAuYmFjLS1hcHAtZGVzY3JpcHRpb257Y29sb3I6IzkxOTE5MTtmb250LXNpemU6MTJweDtmb250LXN0eWxlOml0YWxpYztsaW5lLWhlaWdodDoxLjNlbX0uYmFjLS11c2VyLXNpZGViYXJ7Zm9udC1mYW1pbHk6XCJWZXJkYW5hXCIsIGFyaWFsLCBzYW5zLXNlcmlmO2NvbG9yOndoaXRlO2hlaWdodDpjYWxjKDEwMHZoIC0gNTBweCk7YmFja2dyb3VuZC1jb2xvcjojNTE1Zjc3O2JveC1zaXppbmc6Ym9yZGVyLWJveDt3aWR0aDozMjBweDtwb3NpdGlvbjpmaXhlZDt0b3A6NTBweDtyaWdodDowO3otaW5kZXg6OTk5OTk5O3BhZGRpbmctdG9wOjEwcHg7b3BhY2l0eTowO3RyYW5zZm9ybTp0cmFuc2xhdGVYKDEwMCUpO3RyYW5zaXRpb246YWxsIDAuNHMgZWFzZX0uYmFjLS11c2VyLXNpZGViYXIuYWN0aXZle29wYWNpdHk6MTt0cmFuc2Zvcm06dHJhbnNsYXRlWCgwJSk7LXdlYmtpdC1ib3gtc2hhZG93Oi0xcHggMHB4IDEycHggMHB4IHJnYmEoMCwwLDAsMC43NSk7LW1vei1ib3gtc2hhZG93Oi0xcHggM3B4IDEycHggMHB4IHJnYmEoMCwwLDAsMC43NSk7Ym94LXNoYWRvdzotMXB4IDBweCAxMnB4IDBweCByZ2JhKDAsMCwwLDAuNzUpfS5iYWMtLXVzZXItc2lkZWJhciAuYmFjLS11c2VyLWxpc3QtaXRlbXtkaXNwbGF5OmZsZXg7cG9zaXRpb246cmVsYXRpdmU7Y3Vyc29yOnBvaW50ZXI7YWxpZ24taXRlbXM6Y2VudGVyO3BhZGRpbmc6MTBweCAxMHB4IDEwcHggNDBweDtib3JkZXItYm90dG9tOjFweCBzb2xpZCByZ2JhKDI1NSwyNTUsMjU1LDAuMSl9LmJhYy0tdXNlci1zaWRlYmFyIC5iYWMtLXVzZXItbGlzdC1pdGVtOmhvdmVye2JhY2tncm91bmQtY29sb3I6cmdiYSgyNTUsMjU1LDI1NSwwLjEpfS5iYWMtLXVzZXItc2lkZWJhciAuYmFjLS11c2VyLWxpc3QtaXRlbSAuYmFjLS1zZWxlY3RlZC1hY291bnQtaW5kaWNhdG9ye3Bvc2l0aW9uOmFic29sdXRlO3JpZ2h0OjA7aGVpZ2h0OjEwMCU7d2lkdGg6OHB4fS5iYWMtLXVzZXItc2lkZWJhciAuYmFjLS11c2VyLWxpc3QtaXRlbSAuYmFjLS11c2VyLWxpc3QtaXRlbS1pbWFnZXt3aWR0aDo0MHB4O2hlaWdodDo0MHB4O2JvcmRlci1yYWRpdXM6M3B4O2JvcmRlcjoycHggc29saWQgI2ZmZjttYXJnaW4tcmlnaHQ6MjBweDtkaXNwbGF5OmZsZXg7YWxpZ24taXRlbXM6Y2VudGVyO2p1c3RpZnktY29udGVudDpjZW50ZXJ9LmJhYy0tdXNlci1zaWRlYmFyIC5iYWMtLXVzZXItbGlzdC1pdGVtIC5iYWMtLXVzZXItbGlzdC1pdGVtLWltYWdlPmltZ3t3aWR0aDphdXRvO2hlaWdodDphdXRvO21heC13aWR0aDoxMDAlO21heC1oZWlnaHQ6MTAwJX0uYmFjLS11c2VyLXNpZGViYXIgLmJhYy0tdXNlci1saXN0LWl0ZW0gc3Bhbnt3aWR0aDoxMDAlO2Rpc3BsYXk6YmxvY2s7bWFyZ2luLWJvdHRvbTo1cHh9LmJhYy0tdXNlci1zaWRlYmFyIC5iYWMtdXNlci1hcHAtZGV0YWlscyBzcGFue2ZvbnQtc2l6ZToxMnB4fS5iYWMtLXVzZXItc2lkZWJhciAucHVyZXNkay12ZXJzaW9uLW51bWJlcnt3aWR0aDoxMDAlO3RleHQtYWxpZ246cmlnaHQ7cGFkZGluZy1yaWdodDoxMHB4O3Bvc2l0aW9uOmFic29sdXRlO2ZvbnQtc2l6ZTo4cHg7b3BhY2l0eTowLjU7cmlnaHQ6MDtib3R0b206MH0uYmFjLS11c2VyLXNpZGViYXItaW5mb3tkaXNwbGF5OmZsZXg7anVzdGlmeS1jb250ZW50OmNlbnRlcjtmbGV4LXdyYXA6d3JhcDt0ZXh0LWFsaWduOmNlbnRlcjtwYWRkaW5nOjEwcHggMjBweCAxNXB4fS5iYWMtLXVzZXItc2lkZWJhci1pbmZvIC5iYWMtLXVzZXItaW1hZ2V7Ym9yZGVyOjFweCAjYWRhZGFkIHNvbGlkO292ZXJmbG93OmhpZGRlbjtib3JkZXItcmFkaXVzOjUwJTtwb3NpdGlvbjpyZWxhdGl2ZTtjdXJzb3I6cG9pbnRlcjtkaXNwbGF5OmlubGluZS1ibG9jaztoZWlnaHQ6ODBweDt3aWR0aDo4MHB4O2xpbmUtaGVpZ2h0OjgwcHg7dGV4dC1hbGlnbjpjZW50ZXI7Y29sb3I6I2ZmZjtib3JkZXItcmFkaXVzOjUwJTtiYWNrZ3JvdW5kLWNvbG9yOiNhZGFkYWQ7bWFyZ2luLWJvdHRvbToxNXB4fS5iYWMtLXVzZXItc2lkZWJhci1pbmZvIC5iYWMtLXVzZXItaW1hZ2UgI2JhYy0tdXNlci1pbWFnZS1maWxle2Rpc3BsYXk6bm9uZTtwb3NpdGlvbjphYnNvbHV0ZTt6LWluZGV4OjE7dG9wOjA7bGVmdDowO3dpZHRoOjEwMCU7aGVpZ2h0OjEwMCV9LmJhYy0tdXNlci1zaWRlYmFyLWluZm8gLmJhYy0tdXNlci1pbWFnZSAjYmFjLS11c2VyLWltYWdlLWZpbGUgaW1ne3dpZHRoOjEwMCU7aGVpZ2h0OjEwMCV9LmJhYy0tdXNlci1zaWRlYmFyLWluZm8gLmJhYy0tdXNlci1pbWFnZSAjYmFjLS11c2VyLWltYWdlLWZpbGUuYmFjLS1wdXJlc2RrLXZpc2libGV7ZGlzcGxheTpibG9ja30uYmFjLS11c2VyLXNpZGViYXItaW5mbyAuYmFjLS11c2VyLWltYWdlICNiYWMtLXVzZXItaW1hZ2UtdXBsb2FkLXByb2dyZXNze3Bvc2l0aW9uOmFic29sdXRlO3BhZGRpbmctdG9wOjEwcHg7dG9wOjA7YmFja2dyb3VuZDojNjY2O3otaW5kZXg6NDtkaXNwbGF5Om5vbmU7d2lkdGg6MTAwJTtoZWlnaHQ6MTAwJX0uYmFjLS11c2VyLXNpZGViYXItaW5mbyAuYmFjLS11c2VyLWltYWdlICNiYWMtLXVzZXItaW1hZ2UtdXBsb2FkLXByb2dyZXNzLmJhYy0tcHVyZXNkay12aXNpYmxle2Rpc3BsYXk6YmxvY2t9LmJhYy0tdXNlci1zaWRlYmFyLWluZm8gLmJhYy0tdXNlci1pbWFnZSBpe2ZvbnQtc2l6ZTozMnB4O2ZvbnQtc2l6ZTozMnB4O3otaW5kZXg6MDtwb3NpdGlvbjphYnNvbHV0ZTt3aWR0aDoxMDAlO2xlZnQ6MDtiYWNrZ3JvdW5kLWNvbG9yOnJnYmEoMCwwLDAsMC41KX0uYmFjLS11c2VyLXNpZGViYXItaW5mbyAuYmFjLS11c2VyLWltYWdlOmhvdmVyIGl7ei1pbmRleDozfS5iYWMtLXVzZXItc2lkZWJhci1pbmZvIC5iYWMtLXVzZXItbmFtZXt3aWR0aDoxMDAlO3RleHQtYWxpZ246Y2VudGVyO2ZvbnQtc2l6ZToxOHB4O21hcmdpbi1ib3R0b206MTBweH0uYmFjLS11c2VyLXNpZGViYXItaW5mbyAuYmFjLS11c2VyLWVtYWlse2ZvbnQtc2l6ZToxMnB4O2ZvbnQtd2VpZ2h0OjMwMH0uYmFjLS11c2VyLWFjY291bnQtc2V0dGluZ3N7cG9zaXRpb246YWJzb2x1dGU7Ym90dG9tOjEwcHg7bGVmdDoyMHB4O3dpZHRoOjkwJTtoZWlnaHQ6NTBweH0uYmFjLS11c2VyLWFjY291bnQtc2V0dGluZ3MgLmJhYy11c2VyLWFjb3VudC1saXN0LWl0ZW17ZGlzcGxheTpmbGV4O2FsaWduLWl0ZW1zOmNlbnRlcjttYXJnaW4tYm90dG9tOjMwcHg7cG9zaXRpb246YWJzb2x1dGV9LmJhYy0tdXNlci1hY2NvdW50LXNldHRpbmdzIC5iYWMtdXNlci1hY291bnQtbGlzdC1pdGVtIGF7dGV4dC1kZWNvcmF0aW9uOm5vbmU7Y29sb3I6I2ZmZn0uYmFjLS11c2VyLWFjY291bnQtc2V0dGluZ3MgLmJhYy11c2VyLWFjb3VudC1saXN0LWl0ZW0gaXtmb250LXNpemU6MjRweDttYXJnaW4tcmlnaHQ6MjBweH0jYmFjLS1wdXJlc2RrLWFjY291bnQtbG9nby0te2N1cnNvcjpwb2ludGVyO3Bvc2l0aW9uOnJlbGF0aXZlfSNiYWMtLXB1cmVzZGstYWNjb3VudC1sb2dvLS0gaW1ne2hlaWdodDoyOHB4fSNiYWMtLWluZm8tYmxvY2tzLXdyYXBwZXItLXtwb3NpdGlvbjpyZWxhdGl2ZX0jYmFjLS1pbmZvLWJsb2Nrcy13cmFwcGVyLS0gLmJhYy0tcHVyZXNkay1pbmZvLWJveC0te2JvcmRlci1yYWRpdXM6MCAwIDNweCAzcHg7b3ZlcmZsb3c6aGlkZGVuO3otaW5kZXg6OTk5OTk5OTk7cG9zaXRpb246Zml4ZWQ7dG9wOi00MXB4O3dpZHRoOjQ3MHB4O2xlZnQ6Y2FsYyg1MHZ3IC0gMjM1cHgpO2hlaWdodDo0MHB4Oy13ZWJraXQtdHJhbnNpdGlvbjp0b3AgMC40czt0cmFuc2l0aW9uOnRvcCAwLjRzfSNiYWMtLWluZm8tYmxvY2tzLXdyYXBwZXItLSAuYmFjLS1wdXJlc2RrLWluZm8tYm94LS0uYmFjLS1zdWNjZXNze2JhY2tncm91bmQ6IzE0REE5RX0jYmFjLS1pbmZvLWJsb2Nrcy13cmFwcGVyLS0gLmJhYy0tcHVyZXNkay1pbmZvLWJveC0tLmJhYy0tc3VjY2VzcyAuYmFjLS1pbm5lci1pbmZvLWJveC0tIGRpdi5iYWMtLWluZm8taWNvbi0tLmZhLXN1Y2Nlc3N7ZGlzcGxheTppbmxpbmUtYmxvY2t9I2JhYy0taW5mby1ibG9ja3Mtd3JhcHBlci0tIC5iYWMtLXB1cmVzZGstaW5mby1ib3gtLS5iYWMtLWluZm97YmFja2dyb3VuZC1jb2xvcjojNUJDMERFfSNiYWMtLWluZm8tYmxvY2tzLXdyYXBwZXItLSAuYmFjLS1wdXJlc2RrLWluZm8tYm94LS0uYmFjLS1pbmZvIC5iYWMtLWlubmVyLWluZm8tYm94LS0gZGl2LmJhYy0taW5mby1pY29uLS0uZmEtaW5mby0xe2Rpc3BsYXk6aW5saW5lLWJsb2NrfSNiYWMtLWluZm8tYmxvY2tzLXdyYXBwZXItLSAuYmFjLS1wdXJlc2RrLWluZm8tYm94LS0uYmFjLS13YXJuaW5ne2JhY2tncm91bmQ6I0YwQUQ0RX0jYmFjLS1pbmZvLWJsb2Nrcy13cmFwcGVyLS0gLmJhYy0tcHVyZXNkay1pbmZvLWJveC0tLmJhYy0td2FybmluZyAuYmFjLS1pbm5lci1pbmZvLWJveC0tIGRpdi5iYWMtLWluZm8taWNvbi0tLmZhLXdhcm5pbmd7ZGlzcGxheTppbmxpbmUtYmxvY2t9I2JhYy0taW5mby1ibG9ja3Mtd3JhcHBlci0tIC5iYWMtLXB1cmVzZGstaW5mby1ib3gtLS5iYWMtLWVycm9ye2JhY2tncm91bmQ6I0VGNDEwMH0jYmFjLS1pbmZvLWJsb2Nrcy13cmFwcGVyLS0gLmJhYy0tcHVyZXNkay1pbmZvLWJveC0tLmJhYy0tZXJyb3IgLmJhYy0taW5uZXItaW5mby1ib3gtLSBkaXYuYmFjLS1pbmZvLWljb24tLS5mYS1lcnJvcntkaXNwbGF5OmlubGluZS1ibG9ja30jYmFjLS1pbmZvLWJsb2Nrcy13cmFwcGVyLS0gLmJhYy0tcHVyZXNkay1pbmZvLWJveC0tIC5iYWMtLXRpbWVyey13ZWJraXQtdHJhbnNpdGlvbi10aW1pbmctZnVuY3Rpb246bGluZWFyO3RyYW5zaXRpb24tdGltaW5nLWZ1bmN0aW9uOmxpbmVhcjtwb3NpdGlvbjphYnNvbHV0ZTtib3R0b206MHB4O29wYWNpdHk6MC41O2hlaWdodDoycHggIWltcG9ydGFudDtiYWNrZ3JvdW5kOndoaXRlO3dpZHRoOjAlfSNiYWMtLWluZm8tYmxvY2tzLXdyYXBwZXItLSAuYmFjLS1wdXJlc2RrLWluZm8tYm94LS0gLmJhYy0tdGltZXIuYmFjLS1mdWxsd2lkdGh7d2lkdGg6MTAwJX0jYmFjLS1pbmZvLWJsb2Nrcy13cmFwcGVyLS0gLmJhYy0tcHVyZXNkay1pbmZvLWJveC0tLmJhYy0tYWN0aXZlLS17dG9wOjBweH0jYmFjLS1pbmZvLWJsb2Nrcy13cmFwcGVyLS0gLmJhYy0tcHVyZXNkay1pbmZvLWJveC0tIC5iYWMtLWlubmVyLWluZm8tYm94LS17d2lkdGg6MTAwJTtwYWRkaW5nOjExcHggMTVweDtjb2xvcjp3aGl0ZX0jYmFjLS1pbmZvLWJsb2Nrcy13cmFwcGVyLS0gLmJhYy0tcHVyZXNkay1pbmZvLWJveC0tIC5iYWMtLWlubmVyLWluZm8tYm94LS0gZGl2e2Rpc3BsYXk6aW5saW5lLWJsb2NrO2hlaWdodDoxOHB4O3Bvc2l0aW9uOnJlbGF0aXZlfSNiYWMtLWluZm8tYmxvY2tzLXdyYXBwZXItLSAuYmFjLS1wdXJlc2RrLWluZm8tYm94LS0gLmJhYy0taW5uZXItaW5mby1ib3gtLSBkaXYuYmFjLS1pbmZvLWljb24tLXtkaXNwbGF5Om5vbmU7dG9wOjBweH0jYmFjLS1pbmZvLWJsb2Nrcy13cmFwcGVyLS0gLmJhYy0tcHVyZXNkay1pbmZvLWJveC0tIC5iYWMtLWlubmVyLWluZm8tYm94LS0gLmJhYy0taW5mby1pY29uLS17bWFyZ2luLXJpZ2h0OjE1cHg7d2lkdGg6MTBweDt0b3A6MnB4fSNiYWMtLWluZm8tYmxvY2tzLXdyYXBwZXItLSAuYmFjLS1wdXJlc2RrLWluZm8tYm94LS0gLmJhYy0taW5uZXItaW5mby1ib3gtLSAuYmFjLS1pbmZvLW1haW4tdGV4dC0te3dpZHRoOjM4MHB4O21hcmdpbi1yaWdodDoxNXB4O2ZvbnQtc2l6ZToxMnB4O3RleHQtYWxpZ246Y2VudGVyfSNiYWMtLWluZm8tYmxvY2tzLXdyYXBwZXItLSAuYmFjLS1wdXJlc2RrLWluZm8tYm94LS0gLmJhYy0taW5uZXItaW5mby1ib3gtLSAuYmFjLS1pbmZvLWNsb3NlLWJ1dHRvbi0te3dpZHRoOjEwcHg7Y3Vyc29yOnBvaW50ZXI7dG9wOjJweH0uYmFjLS1jdXN0b20tbW9kYWx7cG9zaXRpb246Zml4ZWQ7d2lkdGg6NzAlO2hlaWdodDo4MCU7bWluLXdpZHRoOjQwMHB4O2xlZnQ6MDtyaWdodDowO3RvcDowO2JvdHRvbTowO21hcmdpbjphdXRvO2JvcmRlcjoxcHggc29saWQgIzk3OTc5Nztib3JkZXItcmFkaXVzOjVweDtib3gtc2hhZG93OjAgMCA3MXB4IDAgIzJGMzg0OTtiYWNrZ3JvdW5kOiNmZmY7ei1pbmRleDo5OTk7b3ZlcmZsb3c6YXV0bztkaXNwbGF5Om5vbmV9LmJhYy0tY3VzdG9tLW1vZGFsLmlzLW9wZW57ZGlzcGxheTpibG9ja30uYmFjLS1jdXN0b20tbW9kYWwgLmN1c3RvbS1tb2RhbF9fY2xvc2UtYnRue3RleHQtZGVjb3JhdGlvbjpub25lO3BhZGRpbmctdG9wOjJweDtsaW5lLWhlaWdodDoxOHB4O2hlaWdodDoyMHB4O3dpZHRoOjIwcHg7Ym9yZGVyLXJhZGl1czo1MCU7Y29sb3I6IzkwOWJhNDt0ZXh0LWFsaWduOmNlbnRlcjtwb3NpdGlvbjphYnNvbHV0ZTt0b3A6MjBweDtyaWdodDoyMHB4O2ZvbnQtc2l6ZToyMHB4fS5iYWMtLWN1c3RvbS1tb2RhbCAuY3VzdG9tLW1vZGFsX19jbG9zZS1idG46aG92ZXJ7dGV4dC1kZWNvcmF0aW9uOm5vbmU7Y29sb3I6IzQ1NTA2NjtjdXJzb3I6cG9pbnRlcn0uYmFjLS1jdXN0b20tbW9kYWwgLmN1c3RvbS1tb2RhbF9fd3JhcHBlcntoZWlnaHQ6MTAwJTtkaXNwbGF5OmZsZXg7ZmxleC1kaXJlY3Rpb246Y29sdW1ufS5iYWMtLWN1c3RvbS1tb2RhbCAuY3VzdG9tLW1vZGFsX193cmFwcGVyIGlmcmFtZXt3aWR0aDoxMDAlO2hlaWdodDoxMDAlfS5iYWMtLWN1c3RvbS1tb2RhbCAuY3VzdG9tLW1vZGFsX19jb250ZW50LXdyYXBwZXJ7aGVpZ2h0OjEwMCU7b3ZlcmZsb3c6YXV0bzttYXJnaW4tYm90dG9tOjEwNHB4O2JvcmRlci10b3A6MnB4IHNvbGlkICNDOUNERDd9LmJhYy0tY3VzdG9tLW1vZGFsIC5jdXN0b20tbW9kYWxfX2NvbnRlbnQtd3JhcHBlci5uby1tYXJnaW57bWFyZ2luLWJvdHRvbTowfS5iYWMtLWN1c3RvbS1tb2RhbCAuY3VzdG9tLW1vZGFsX19jb250ZW50e3BhZGRpbmc6MjBweDtwb3NpdGlvbjpyZWxhdGl2ZX0uYmFjLS1jdXN0b20tbW9kYWwgLmN1c3RvbS1tb2RhbF9fY29udGVudCBoM3tjb2xvcjojMkYzODQ5O2ZvbnQtc2l6ZToyMHB4O2ZvbnQtd2VpZ2h0OjYwMDtsaW5lLWhlaWdodDoyN3B4fS5iYWMtLWN1c3RvbS1tb2RhbCAuY3VzdG9tLW1vZGFsX19zYXZle3Bvc2l0aW9uOmFic29sdXRlO3JpZ2h0OjA7Ym90dG9tOjA7d2lkdGg6MTAwJTtwYWRkaW5nOjMwcHggMzJweDtiYWNrZ3JvdW5kLWNvbG9yOiNGMkYyRjR9LmJhYy0tY3VzdG9tLW1vZGFsIC5jdXN0b20tbW9kYWxfX3NhdmUgYSwuYmFjLS1jdXN0b20tbW9kYWwgLmN1c3RvbS1tb2RhbF9fc2F2ZSBidXR0b257Zm9udC1zaXplOjE0cHg7bGluZS1oZWlnaHQ6MjJweDtoZWlnaHQ6NDRweDt3aWR0aDoxMDAlfS5iYWMtLWN1c3RvbS1tb2RhbCAuY3VzdG9tLW1vZGFsX19zcGxpdHRlcntoZWlnaHQ6MzBweDtsaW5lLWhlaWdodDozMHB4O3BhZGRpbmc6MCAyMHB4O2JvcmRlci1jb2xvcjojRDNEM0QzO2JvcmRlci1zdHlsZTpzb2xpZDtib3JkZXItd2lkdGg6MXB4IDAgMXB4IDA7YmFja2dyb3VuZC1jb2xvcjojRjBGMEYwO2NvbG9yOiM2NzZGODI7Zm9udC1zaXplOjEzcHg7Zm9udC13ZWlnaHQ6NjAwfS5iYWMtLWN1c3RvbS1tb2RhbCAuY3VzdG9tLW1vZGFsX19ib3h7ZGlzcGxheTppbmxpbmUtYmxvY2s7dmVydGljYWwtYWxpZ246bWlkZGxlO2hlaWdodDoxNjVweDt3aWR0aDoxNjVweDtib3JkZXI6MnB4IHNvbGlkIHJlZDtib3JkZXItcmFkaXVzOjVweDt0ZXh0LWFsaWduOmNlbnRlcjtmb250LXNpemU6MTJweDtmb250LXdlaWdodDo2MDA7Y29sb3I6IzkwOTdBODt0ZXh0LWRlY29yYXRpb246bm9uZTttYXJnaW46MTBweCAyMHB4IDEwcHggMDt0cmFuc2l0aW9uOjAuMXMgYWxsfS5iYWMtLWN1c3RvbS1tb2RhbCAuY3VzdG9tLW1vZGFsX19ib3ggaXtmb250LXNpemU6NzBweDtkaXNwbGF5OmJsb2NrO21hcmdpbjoyNXB4IDB9LmJhYy0tY3VzdG9tLW1vZGFsIC5jdXN0b20tbW9kYWxfX2JveC5hY3RpdmV7Y29sb3I6eWVsbG93O2JvcmRlci1jb2xvcjp5ZWxsb3c7dGV4dC1kZWNvcmF0aW9uOm5vbmV9LmJhYy0tY3VzdG9tLW1vZGFsIC5jdXN0b20tbW9kYWxfX2JveDpob3ZlciwuYmFjLS1jdXN0b20tbW9kYWwgLmN1c3RvbS1tb2RhbF9fYm94OmFjdGl2ZSwuYmFjLS1jdXN0b20tbW9kYWwgLmN1c3RvbS1tb2RhbF9fYm94OmZvY3Vze2NvbG9yOiMxQUMwQjQ7Ym9yZGVyLWNvbG9yOnllbGxvdzt0ZXh0LWRlY29yYXRpb246bm9uZX0uY2xvdWQtaW1hZ2VzX19jb250YWluZXJ7ZGlzcGxheTpmbGV4O2ZsZXgtd3JhcDp3cmFwO2p1c3RpZnktY29udGVudDpmbGV4LXN0YXJ0fS5jbG91ZC1pbWFnZXNfX3BhZ2luYXRpb257cGFkZGluZzoyMHB4fS5jbG91ZC1pbWFnZXNfX3BhZ2luYXRpb24gbGl7ZGlzcGxheTppbmxpbmUtYmxvY2s7bWFyZ2luLXJpZ2h0OjEwcHh9LmNsb3VkLWltYWdlc19fcGFnaW5hdGlvbiBsaSBhe2NvbG9yOiNmZmY7YmFja2dyb3VuZC1jb2xvcjojNWU2Nzc2O2JvcmRlci1yYWRpdXM6MjBweDt0ZXh0LWRlY29yYXRpb246bm9uZTtkaXNwbGF5OmJsb2NrO2ZvbnQtd2VpZ2h0OjIwMDtoZWlnaHQ6MzVweDt3aWR0aDozNXB4O2xpbmUtaGVpZ2h0OjM1cHg7dGV4dC1hbGlnbjpjZW50ZXJ9LmNsb3VkLWltYWdlc19fcGFnaW5hdGlvbiBsaS5hY3RpdmUgYXtiYWNrZ3JvdW5kLWNvbG9yOiMyZjM4NDl9LmNsb3VkLWltYWdlc19faXRlbXt3aWR0aDoxNTVweDtoZWlnaHQ6MTcwcHg7Ym9yZGVyOjFweCBzb2xpZCAjZWVlO2JhY2tncm91bmQtY29sb3I6I2ZmZjtib3JkZXItcmFkaXVzOjNweDttYXJnaW46MCAxNXB4IDE1cHggMDt0ZXh0LWFsaWduOmNlbnRlcjtwb3NpdGlvbjpyZWxhdGl2ZTtjdXJzb3I6cG9pbnRlcn0uY2xvdWQtaW1hZ2VzX19pdGVtIC5jbG91ZC1pbWFnZXNfX2l0ZW1fX3R5cGV7aGVpZ2h0OjExNXB4O2ZvbnQtc2l6ZTo5MHB4O2xpbmUtaGVpZ2h0OjE0MHB4O2JvcmRlci10b3AtbGVmdC1yYWRpdXM6M3B4O2JvcmRlci10b3AtcmlnaHQtcmFkaXVzOjNweDtjb2xvcjojYTJhMmEyO2JhY2tncm91bmQtY29sb3I6I2U5ZWFlYn0uY2xvdWQtaW1hZ2VzX19pdGVtIC5jbG91ZC1pbWFnZXNfX2l0ZW1fX3R5cGU+aW1ne3dpZHRoOmF1dG87aGVpZ2h0OmF1dG87bWF4LXdpZHRoOjEwMCU7bWF4LWhlaWdodDoxMDAlfS5jbG91ZC1pbWFnZXNfX2l0ZW0gLmNsb3VkLWltYWdlc19faXRlbV9fZGV0YWlsc3twYWRkaW5nOjEwcHggMH0uY2xvdWQtaW1hZ2VzX19pdGVtIC5jbG91ZC1pbWFnZXNfX2l0ZW1fX2RldGFpbHMgLmNsb3VkLWltYWdlc19faXRlbV9fZGV0YWlsc19fbmFtZXtmb250LXNpemU6MTJweDtvdXRsaW5lOm5vbmU7cGFkZGluZzowIDEwcHg7Y29sb3I6I2E1YWJiNTtib3JkZXI6bm9uZTt3aWR0aDoxMDAlO2JhY2tncm91bmQtY29sb3I6dHJhbnNwYXJlbnQ7aGVpZ2h0OjE1cHg7ZGlzcGxheTppbmxpbmUtYmxvY2s7d29yZC1icmVhazpicmVhay1hbGx9LmNsb3VkLWltYWdlc19faXRlbSAuY2xvdWQtaW1hZ2VzX19pdGVtX19kZXRhaWxzIC5jbG91ZC1pbWFnZXNfX2l0ZW1fX2RldGFpbHNfX2RhdGV7Zm9udC1zaXplOjEwcHg7Ym90dG9tOjZweDt3aWR0aDoxNTVweDtoZWlnaHQ6MTVweDtjb2xvcjojYTVhYmI1O2Rpc3BsYXk6aW5saW5lLWJsb2NrfS5jbG91ZC1pbWFnZXNfX2l0ZW0gLmNsb3VkLWltYWdlc19faXRlbV9fYWN0aW9uc3tkaXNwbGF5OmZsZXg7YWxpZ24taXRlbXM6Y2VudGVyO2p1c3RpZnktY29udGVudDpjZW50ZXI7cG9zaXRpb246YWJzb2x1dGU7dG9wOjA7bGVmdDowO3dpZHRoOjEwMCU7aGVpZ2h0OjExNXB4O2JhY2tncm91bmQtY29sb3I6cmdiYSg3OCw4Myw5MSwwLjgzKTtvcGFjaXR5OjA7dmlzaWJpbGl0eTpoaWRkZW47Ym9yZGVyLXRvcC1sZWZ0LXJhZGl1czozcHg7Ym9yZGVyLXRvcC1yaWdodC1yYWRpdXM6M3B4O3RleHQtYWxpZ246Y2VudGVyO3RyYW5zaXRpb246MC4zcyBvcGFjaXR5fS5jbG91ZC1pbWFnZXNfX2l0ZW0gLmNsb3VkLWltYWdlc19faXRlbV9fYWN0aW9ucyBhe2ZvbnQtc2l6ZToxNnB4O2NvbG9yOiNmZmY7dGV4dC1kZWNvcmF0aW9uOm5vbmV9LmNsb3VkLWltYWdlc19faXRlbTpob3ZlciAuY2xvdWQtaW1hZ2VzX19pdGVtIC5jbG91ZC1pbWFnZXNfX2l0ZW1fX2FjdGlvbnN7b3BhY2l0eToxO3Zpc2liaWxpdHk6dmlzaWJsZX0nLFxuICAgIGhlYWQgPSBkb2N1bWVudC5oZWFkIHx8IGRvY3VtZW50LmdldEVsZW1lbnRzQnlUYWdOYW1lKCdoZWFkJylbMF0sXG4gICAgc3R5bGUgPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KCdzdHlsZScpO1xuXG5zdHlsZS50eXBlID0gJ3RleHQvY3NzJztcbmlmIChzdHlsZS5zdHlsZVNoZWV0KSB7XG4gICAgc3R5bGUuc3R5bGVTaGVldC5jc3NUZXh0ID0gY3NzO1xufSBlbHNlIHtcbiAgICBzdHlsZS5hcHBlbmRDaGlsZChkb2N1bWVudC5jcmVhdGVUZXh0Tm9kZShjc3MpKTtcbn1cbmhlYWQuYXBwZW5kQ2hpbGQoc3R5bGUpO1xuXG52YXIgbGluayA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoJ2xpbmsnKTtcbmxpbmsuaHJlZiA9ICdodHRwczovL2ZpbGUubXlmb250YXN0aWMuY29tL01Edm5SSkdoQmQ1eFZjWG40dVFKU1ovaWNvbnMuY3NzJztcbmxpbmsucmVsID0gJ3N0eWxlc2hlZXQnO1xuXG5kb2N1bWVudC5nZXRFbGVtZW50c0J5VGFnTmFtZSgnaGVhZCcpWzBdLmFwcGVuZENoaWxkKGxpbmspO1xuXG5tb2R1bGUuZXhwb3J0cyA9IHBwYmE7IiwidmFyIFN0b3JlID0gcmVxdWlyZSgnLi9zdG9yZScpO1xudmFyIExvZ2dlciA9IHJlcXVpcmUoJy4vbG9nZ2VyJyk7XG52YXIgRG9tID0gcmVxdWlyZSgnLi9kb20nKTtcbnZhciBDYWxsZXIgPSByZXF1aXJlKCcuL2NhbGxlcicpO1xuXG52YXIgdXBsb2FkaW5nID0gZmFsc2U7XG5cbnZhciBBdmF0YXJDdHJsID0ge1xuXHRfc3VibWl0OiBudWxsLFxuXHRfZmlsZTogbnVsbCxcblx0X3Byb2dyZXNzOiBudWxsLFxuXHRfc2lkZWJhcl9hdmF0YXI6IG51bGwsXG5cdF90b3BfYXZhdGFyOiBudWxsLFxuXHRfdG9wX2F2YXRhcl9jb250YWluZXI6IG51bGwsXG5cblx0aW5pdDogZnVuY3Rpb24gaW5pdCgpIHtcblx0XHRBdmF0YXJDdHJsLl9zdWJtaXQgPSBkb2N1bWVudC5nZXRFbGVtZW50QnlJZCgnYmFjLS0tcHVyZXNkay1hdmF0YXItc3VibWl0Jyk7XG5cdFx0QXZhdGFyQ3RybC5fZmlsZSA9IGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKCdiYWMtLS1wdXJlc2RrLWF2YXRhci1maWxlJyk7XG5cdFx0QXZhdGFyQ3RybC5fdG9wX2F2YXRhcl9jb250YWluZXIgPSBkb2N1bWVudC5nZXRFbGVtZW50QnlJZCgnYmFjLS1pbWFnZS1jb250YWluZXItdG9wJyk7XG5cdFx0QXZhdGFyQ3RybC5fcHJvZ3Jlc3MgPSBkb2N1bWVudC5nZXRFbGVtZW50QnlJZCgnYmFjLS11c2VyLWltYWdlLXVwbG9hZC1wcm9ncmVzcycpO1xuXHRcdEF2YXRhckN0cmwuX3NpZGViYXJfYXZhdGFyID0gZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoJ2JhYy0tdXNlci1pbWFnZS1maWxlJyk7XG5cdFx0QXZhdGFyQ3RybC5fdG9wX2F2YXRhciA9IGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKCdiYWMtLXVzZXItYXZhdGFyLXRvcCcpO1xuXHRcdEF2YXRhckN0cmwuX2ZpbGUuYWRkRXZlbnRMaXN0ZW5lcignY2xpY2snLCBmdW5jdGlvbiAoZSkge1xuXHRcdFx0ZS5zdG9wUHJvcGFnYXRpb24oKTtcblx0XHR9KTtcblx0XHRBdmF0YXJDdHJsLl9maWxlLmFkZEV2ZW50TGlzdGVuZXIoJ2NoYW5nZScsIGZ1bmN0aW9uIChlKSB7XG5cdFx0XHRBdmF0YXJDdHJsLnVwbG9hZCgpO1xuXHRcdH0pO1xuXG5cdFx0ZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoJ2JhYy0tdXNlci1pbWFnZScpLmFkZEV2ZW50TGlzdGVuZXIoJ2NsaWNrJywgZnVuY3Rpb24gKGUpIHtcblx0XHRcdGUuc3RvcFByb3BhZ2F0aW9uKCk7XG5cdFx0XHRBdmF0YXJDdHJsLl9maWxlLmNsaWNrKCk7XG5cdFx0fSk7XG5cdH0sXG5cblx0dXBsb2FkOiBmdW5jdGlvbiB1cGxvYWQoKSB7XG5cdFx0aWYgKHVwbG9hZGluZykge1xuXHRcdFx0cmV0dXJuO1xuXHRcdH1cblx0XHR1cGxvYWRpbmcgPSB0cnVlO1xuXG5cdFx0aWYgKEF2YXRhckN0cmwuX2ZpbGUuZmlsZXMubGVuZ3RoID09PSAwKSB7XG5cdFx0XHRyZXR1cm47XG5cdFx0fVxuXG5cdFx0dmFyIGRhdGEgPSBuZXcgRm9ybURhdGEoKTtcblx0XHRkYXRhLmFwcGVuZCgnZmlsZScsIEF2YXRhckN0cmwuX2ZpbGUuZmlsZXNbMF0pO1xuXG5cdFx0dmFyIHN1Y2Nlc3NDYWxsYmFjayA9IGZ1bmN0aW9uIHN1Y2Nlc3NDYWxsYmFjayhkYXRhKSB7XG5cdFx0XHQ7XG5cdFx0fTtcblxuXHRcdHZhciBmYWlsQ2FsbGJhY2sgPSBmdW5jdGlvbiBmYWlsQ2FsbGJhY2soZGF0YSkge1xuXHRcdFx0O1xuXHRcdH07XG5cblx0XHR2YXIgcmVxdWVzdCA9IG5ldyBYTUxIdHRwUmVxdWVzdCgpO1xuXHRcdHJlcXVlc3Qub25yZWFkeXN0YXRlY2hhbmdlID0gZnVuY3Rpb24gKCkge1xuXHRcdFx0dXBsb2FkaW5nID0gZmFsc2U7XG5cdFx0XHRpZiAocmVxdWVzdC5yZWFkeVN0YXRlID09IDQpIHtcblx0XHRcdFx0dHJ5IHtcblx0XHRcdFx0XHR2YXIgaW1hZ2VEYXRhID0gSlNPTi5wYXJzZShyZXF1ZXN0LnJlc3BvbnNlKS5kYXRhO1xuXHRcdFx0XHRcdEF2YXRhckN0cmwuc2V0QXZhdGFyKGltYWdlRGF0YS51cmwpO1xuXHRcdFx0XHRcdENhbGxlci5tYWtlQ2FsbCh7XG5cdFx0XHRcdFx0XHR0eXBlOiAnUFVUJyxcblx0XHRcdFx0XHRcdGVuZHBvaW50OiBTdG9yZS5nZXRBdmF0YXJVcGRhdGVVcmwoKSxcblx0XHRcdFx0XHRcdHBhcmFtczoge1xuXHRcdFx0XHRcdFx0XHR1c2VyOiB7XG5cdFx0XHRcdFx0XHRcdFx0YXZhdGFyX3V1aWQ6IGltYWdlRGF0YS5ndWlkXG5cdFx0XHRcdFx0XHRcdH1cblx0XHRcdFx0XHRcdH0sXG5cdFx0XHRcdFx0XHRjYWxsYmFja3M6IHtcblx0XHRcdFx0XHRcdFx0c3VjY2Vzczogc3VjY2Vzc0NhbGxiYWNrLFxuXHRcdFx0XHRcdFx0XHRmYWlsOiBmYWlsQ2FsbGJhY2tcblx0XHRcdFx0XHRcdH1cblx0XHRcdFx0XHR9KTtcblx0XHRcdFx0fSBjYXRjaCAoZSkge1xuXHRcdFx0XHRcdHZhciByZXNwID0ge1xuXHRcdFx0XHRcdFx0c3RhdHVzOiAnZXJyb3InLFxuXHRcdFx0XHRcdFx0ZGF0YTogJ1Vua25vd24gZXJyb3Igb2NjdXJyZWQ6IFsnICsgcmVxdWVzdC5yZXNwb25zZVRleHQgKyAnXSdcblx0XHRcdFx0XHR9O1xuXHRcdFx0XHR9XG5cdFx0XHRcdExvZ2dlci5sb2cocmVxdWVzdC5yZXNwb25zZS5zdGF0dXMgKyAnOiAnICsgcmVxdWVzdC5yZXNwb25zZS5kYXRhKTtcblx0XHRcdH1cblx0XHR9O1xuXG5cdFx0Ly8gcmVxdWVzdC51cGxvYWQuYWRkRXZlbnRMaXN0ZW5lcigncHJvZ3Jlc3MnLCBmdW5jdGlvbihlKXtcblx0XHQvLyBcdExvZ2dlci5sb2coZS5sb2FkZWQvZS50b3RhbCk7XG5cdFx0Ly8gXHRBdmF0YXJDdHJsLl9wcm9ncmVzcy5zdHlsZS50b3AgPSAxMDAgLSAoZS5sb2FkZWQvZS50b3RhbCkgKiAxMDAgKyAnJSc7XG5cdFx0Ly8gfSwgZmFsc2UpO1xuXG5cdFx0dmFyIHVybCA9IFN0b3JlLmdldEF2YXRhclVwbG9hZFVybCgpO1xuXHRcdERvbS5hZGRDbGFzcyhBdmF0YXJDdHJsLl9wcm9ncmVzcywgJ2JhYy0tcHVyZXNkay12aXNpYmxlJyk7XG5cdFx0cmVxdWVzdC5vcGVuKCdQT1NUJywgdXJsKTtcblx0XHRyZXF1ZXN0LnNlbmQoZGF0YSk7XG5cdH0sXG5cblx0c2V0QXZhdGFyOiBmdW5jdGlvbiBzZXRBdmF0YXIodXJsKSB7XG5cdFx0aWYgKCF1cmwpIHtcblx0XHRcdHJldHVybjtcblx0XHR9XG5cblx0XHREb20ucmVtb3ZlQ2xhc3MoQXZhdGFyQ3RybC5fcHJvZ3Jlc3MsICdiYWMtLXB1cmVzZGstdmlzaWJsZScpO1xuXHRcdERvbS5hZGRDbGFzcyhBdmF0YXJDdHJsLl9zaWRlYmFyX2F2YXRhciwgJ2JhYy0tcHVyZXNkay12aXNpYmxlJyk7XG5cdFx0dmFyIGltZyA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoJ2ltZycpO1xuXHRcdGltZy5zcmMgPSB1cmw7XG5cdFx0QXZhdGFyQ3RybC5fc2lkZWJhcl9hdmF0YXIuaW5uZXJIVE1MID0gJyc7XG5cdFx0QXZhdGFyQ3RybC5fc2lkZWJhcl9hdmF0YXIuYXBwZW5kQ2hpbGQoaW1nKTtcblxuXHRcdERvbS5hZGRDbGFzcyhBdmF0YXJDdHJsLl90b3BfYXZhdGFyX2NvbnRhaW5lciwgJ2JhYy0tcHVyZXNkay12aXNpYmxlJyk7XG5cdFx0dmFyIGltZ18yID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudCgnaW1nJyk7XG5cdFx0aW1nXzIuc3JjID0gdXJsO1xuXHRcdEF2YXRhckN0cmwuX3RvcF9hdmF0YXJfY29udGFpbmVyLmlubmVySFRNTCA9ICcnO1xuXHRcdEF2YXRhckN0cmwuX3RvcF9hdmF0YXJfY29udGFpbmVyLmFwcGVuZENoaWxkKGltZ18yKTtcblxuXHRcdC8vICBiYWMtLWltYWdlLWNvbnRhaW5lci10b3Bcblx0fVxufTtcblxubW9kdWxlLmV4cG9ydHMgPSBBdmF0YXJDdHJsOyIsInZhciBTdG9yZSA9IHJlcXVpcmUoJy4vc3RvcmUuanMnKTtcbnZhciBMb2dnZXIgPSByZXF1aXJlKCcuL2xvZ2dlcicpO1xuXG52YXIgcGFyYW1zVG9HZXRWYXJzID0gZnVuY3Rpb24gcGFyYW1zVG9HZXRWYXJzKHBhcmFtcykge1xuXHR2YXIgdG9SZXR1cm4gPSBbXTtcblx0Zm9yICh2YXIgcHJvcGVydHkgaW4gcGFyYW1zKSB7XG5cdFx0aWYgKHBhcmFtcy5oYXNPd25Qcm9wZXJ0eShwcm9wZXJ0eSkpIHtcblx0XHRcdHRvUmV0dXJuLnB1c2gocHJvcGVydHkgKyAnPScgKyBwYXJhbXNbcHJvcGVydHldKTtcblx0XHR9XG5cdH1cblxuXHRyZXR1cm4gdG9SZXR1cm4uam9pbignJicpO1xufTtcblxudmFyIGRldktleXMgPSBudWxsO1xuXG52YXIgQ2FsbGVyID0ge1xuXHQvKlxuIGlmIHRoZSB1c2VyIHNldHNcbiAgKi9cblx0c2V0RGV2S2V5czogZnVuY3Rpb24gc2V0RGV2S2V5cyhrZXlzKSB7XG5cdFx0ZGV2S2V5cyA9IGtleXM7XG5cdH0sXG5cblx0LypcbiBleHBlY3RlIGF0dHJpYnV0ZXM6XG4gLSB0eXBlIChlaXRoZXIgR0VULCBQT1NULCBERUxFVEUsIFBVVClcbiAtIGVuZHBvaW50XG4gLSBwYXJhbXMgKGlmIGFueS4gQSBqc29uIHdpdGggcGFyYW1ldGVycyB0byBiZSBwYXNzZWQgYmFjayB0byB0aGUgZW5kcG9pbnQpXG4gLSBjYWxsYmFja3M6IGFuIG9iamVjdCB3aXRoOlxuIFx0LSBzdWNjZXNzOiB0aGUgc3VjY2VzcyBjYWxsYmFja1xuIFx0LSBmYWlsOiB0aGUgZmFpbCBjYWxsYmFja1xuICAqL1xuXHRtYWtlQ2FsbDogZnVuY3Rpb24gbWFrZUNhbGwoYXR0cnMpIHtcblx0XHR2YXIgZW5kcG9pbnRVcmwgPSBhdHRycy5lbmRwb2ludDtcblxuXHRcdHZhciB4aHIgPSBuZXcgWE1MSHR0cFJlcXVlc3QoKTtcblxuXHRcdGlmIChhdHRycy50eXBlID09PSAnR0VUJyAmJiBhdHRycy5wYXJhbXMpIHtcblx0XHRcdGVuZHBvaW50VXJsID0gZW5kcG9pbnRVcmwgKyBcIj9cIiArIHBhcmFtc1RvR2V0VmFycyhhdHRycy5wYXJhbXMpO1xuXHRcdH1cblxuXHRcdHhoci5vcGVuKGF0dHJzLnR5cGUsIGVuZHBvaW50VXJsKTtcblxuXHRcdGlmIChkZXZLZXlzICE9IG51bGwpIHtcblx0XHRcdHhoci5zZXRSZXF1ZXN0SGVhZGVyKCd4LXBwLXNlY3JldCcsIGRldktleXMuc2VjcmV0KTtcblx0XHRcdHhoci5zZXRSZXF1ZXN0SGVhZGVyKCd4LXBwLWtleScsIGRldktleXMua2V5KTtcblx0XHR9XG5cdFx0eGhyLndpdGhDcmVkZW50aWFscyA9IHRydWU7XG5cdFx0eGhyLnNldFJlcXVlc3RIZWFkZXIoJ0NvbnRlbnQtVHlwZScsICdhcHBsaWNhdGlvbi9qc29uJyk7XG5cdFx0eGhyLm9ubG9hZCA9IGZ1bmN0aW9uICgpIHtcblx0XHRcdGlmICh4aHIuc3RhdHVzID49IDIwMCAmJiB4aHIuc3RhdHVzIDwgMzAwKSB7XG5cdFx0XHRcdGF0dHJzLmNhbGxiYWNrcy5zdWNjZXNzKEpTT04ucGFyc2UoeGhyLnJlc3BvbnNlVGV4dCkpO1xuXHRcdFx0fSBlbHNlIGlmICh4aHIuc3RhdHVzICE9PSAyMDApIHtcblx0XHRcdFx0YXR0cnMuY2FsbGJhY2tzLmZhaWwoSlNPTi5wYXJzZSh4aHIucmVzcG9uc2VUZXh0KSk7XG5cdFx0XHR9XG5cdFx0fTtcblxuXHRcdGlmICghYXR0cnMucGFyYW1zKSB7XG5cdFx0XHRhdHRycy5wYXJhbXMgPSB7fTtcblx0XHR9XG5cdFx0eGhyLnNlbmQoSlNPTi5zdHJpbmdpZnkoYXR0cnMucGFyYW1zKSk7XG5cdH0sXG5cblx0cHJvbWlzZUNhbGw6IGZ1bmN0aW9uIHByb21pc2VDYWxsKGF0dHJzKSB7XG5cdFx0cmV0dXJuIG5ldyBQcm9taXNlKGZ1bmN0aW9uIChyZXNvbHZlLCByZWplY3QpIHtcblx0XHRcdHZhciB4aHIgPSBuZXcgWE1MSHR0cFJlcXVlc3QoKTtcblxuXHRcdFx0aWYgKGF0dHJzLnR5cGUgPT09ICdHRVQnICYmIGF0dHJzLnBhcmFtcykge1xuXHRcdFx0XHRlbmRwb2ludFVybCA9IGVuZHBvaW50VXJsICsgXCI/XCIgKyBwYXJhbXNUb0dldFZhcnMoYXR0cnMucGFyYW1zKTtcblx0XHRcdH1cblxuXHRcdFx0eGhyLm9wZW4oYXR0cnMudHlwZSwgYXR0cnMuZW5kcG9pbnQpO1xuXHRcdFx0eGhyLndpdGhDcmVkZW50aWFscyA9IHRydWU7XG5cblx0XHRcdGlmIChkZXZLZXlzICE9IG51bGwpIHtcblx0XHRcdFx0eGhyLnNldFJlcXVlc3RIZWFkZXIoJ3gtcHAtc2VjcmV0JywgZGV2S2V5cy5zZWNyZXQpO1xuXHRcdFx0XHR4aHIuc2V0UmVxdWVzdEhlYWRlcigneC1wcC1rZXknLCBkZXZLZXlzLmtleSk7XG5cdFx0XHR9XG5cblx0XHRcdHhoci5zZXRSZXF1ZXN0SGVhZGVyKCdDb250ZW50LVR5cGUnLCAnYXBwbGljYXRpb24vanNvbicpO1xuXHRcdFx0eGhyLm9ubG9hZCA9IGZ1bmN0aW9uICgpIHtcblx0XHRcdFx0aWYgKHRoaXMuc3RhdHVzID49IDIwMCAmJiB0aGlzLnN0YXR1cyA8IDMwMCkge1xuXHRcdFx0XHRcdGF0dHJzLm1pZGRsZXdhcmVzLnN1Y2Nlc3MoSlNPTi5wYXJzZSh4aHIucmVzcG9uc2VUZXh0KSk7XG5cdFx0XHRcdFx0cmVzb2x2ZShKU09OLnBhcnNlKHhoci5yZXNwb25zZVRleHQpKTtcblx0XHRcdFx0fSBlbHNlIHtcblx0XHRcdFx0XHR3aW5kb3cubG9jYXRpb24uaHJlZiA9IFN0b3JlLmdldExvZ2luVXJsKCk7XG5cdFx0XHRcdH1cblx0XHRcdH07XG5cdFx0XHR4aHIub25lcnJvciA9IGZ1bmN0aW9uICgpIHtcblx0XHRcdFx0d2luZG93LmxvY2F0aW9uID0gU3RvcmUuZ2V0TG9naW5VcmwoKTtcblx0XHRcdH07XG5cdFx0XHR4aHIuc2VuZCgpO1xuXHRcdH0pO1xuXHR9XG59O1xuXG5tb2R1bGUuZXhwb3J0cyA9IENhbGxlcjsiLCJ2YXIgZGVib3VuY2VkVGltZW91dCA9IG51bGw7XG52YXIgY3VycmVudFF1ZXJ5ID0gJyc7XG52YXIgbGltaXQgPSA4O1xudmFyIGxhdGVuY3kgPSA1MDA7XG52YXIgaW5pdE9wdGlvbnMgPSB2b2lkIDA7XG52YXIgY3VycmVudFBhZ2UgPSAxO1xudmFyIG1ldGFEYXRhID0gbnVsbDtcbnZhciBpdGVtcyA9IFtdO1xudmFyIHBhZ2luYXRpb25EYXRhID0gbnVsbDtcblxudmFyIFBhZ2luYXRpb25IZWxwZXIgPSByZXF1aXJlKCcuL3BhZ2luYXRpb24taGVscGVyJyk7XG52YXIgQ2FsbGVyID0gcmVxdWlyZSgnLi9jYWxsZXInKTtcbnZhciBTdG9yZSA9IHJlcXVpcmUoJy4vc3RvcmUnKTtcbnZhciBEb20gPSByZXF1aXJlKCcuL2RvbScpO1xuXG52YXIgQ2xvdWRpbmFyeVBpY2tlciA9IHtcblxuXHRcdGluaXRpYWxpc2U6IGZ1bmN0aW9uIGluaXRpYWxpc2UoKSB7XG5cdFx0XHRcdGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKCdiYWMtLWNsb3VkaW5hcnktLWNsb3NlYnRuJykub25jbGljayA9IGZ1bmN0aW9uIChlKSB7XG5cdFx0XHRcdFx0XHRDbG91ZGluYXJ5UGlja2VyLmNsb3NlTW9kYWwoKTtcblx0XHRcdFx0fTtcblx0XHRcdFx0ZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoJ2JhYy0tY2xvdWRpbmFyeS0tc2VhcmNoLWlucHV0Jykub25rZXl1cCA9IGZ1bmN0aW9uIChlKSB7XG5cdFx0XHRcdFx0XHRDbG91ZGluYXJ5UGlja2VyLmhhbmRsZVNlYXJjaChlKTtcblx0XHRcdFx0fTtcblx0XHRcdFx0ZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoJ2JhYy0tY2xvdWRpbmFyeS0tZ28tYmFjaycpLm9uY2xpY2sgPSBmdW5jdGlvbiAoZSkge1xuXHRcdFx0XHRcdFx0Q2xvdWRpbmFyeVBpY2tlci5nb0JhY2soKTtcblx0XHRcdFx0fTtcblx0XHR9LFxuXG5cdFx0LypcbiAgb3B0aW9uczoge1xuICBcdG9uU2VsZWN0OiBpdCBleHBlY3RzIGEgZnVuY3Rpb24uIFRoaXMgZnVuY3Rpb24gd2lsbCBiZSBpbnZva2VkIGV4YWN0bHkgYXQgdGhlIG1vbWVudCB0aGUgdXNlciBwaWNrc1xuICBcdFx0YSBmaWxlIGZyb20gY2xvdWRpbmFyeS4gVGhlIGZ1bmN0aW9uIHdpbGwgdGFrZSBqdXN0IG9uZSBwYXJhbSB3aGljaCBpcyB0aGUgc2VsZWN0ZWQgaXRlbSBvYmplY3RcbiAgICBjbG9zZU9uRXNjOiB0cnVlIC8gZmFsc2VcbiAgfVxuICAgKi9cblx0XHRvcGVuTW9kYWw6IGZ1bmN0aW9uIG9wZW5Nb2RhbChvcHRpb25zKSB7XG5cdFx0XHRcdENsb3VkaW5hcnlQaWNrZXIuaW5pdGlhbGlzZSgpO1xuXHRcdFx0XHRpbml0T3B0aW9ucyA9IG9wdGlvbnM7XG5cdFx0XHRcdERvbS5hZGRDbGFzcyhkb2N1bWVudC5nZXRFbGVtZW50QnlJZCgnYmFjLS1jbG91ZGluYXJ5LS1tb2RhbCcpLCAnaXMtb3BlbicpO1xuXHRcdFx0XHRDbG91ZGluYXJ5UGlja2VyLmdldEltYWdlcyh7XG5cdFx0XHRcdFx0XHRwYWdlOiAxLFxuXHRcdFx0XHRcdFx0bGltaXQ6IGxpbWl0XG5cdFx0XHRcdH0pO1xuXHRcdH0sXG5cblx0XHRjbG9zZU1vZGFsOiBmdW5jdGlvbiBjbG9zZU1vZGFsKCkge1xuXHRcdFx0XHREb20ucmVtb3ZlQ2xhc3MoZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoJ2JhYy0tY2xvdWRpbmFyeS0tbW9kYWwnKSwgJ2lzLW9wZW4nKTtcblx0XHR9LFxuXG5cdFx0Z2V0SW1hZ2VzOiBmdW5jdGlvbiBnZXRJbWFnZXMob3B0aW9ucykge1xuXHRcdFx0XHQvLyBUT0RPIG1ha2UgdGhlIGNhbGwgYW5kIGdldCB0aGUgaW1hZ2VzXG5cblx0XHRcdFx0Q2FsbGVyLm1ha2VDYWxsKHtcblx0XHRcdFx0XHRcdHR5cGU6ICdHRVQnLFxuXHRcdFx0XHRcdFx0ZW5kcG9pbnQ6IFN0b3JlLmdldENsb3VkaW5hcnlFbmRwb2ludCgpLFxuXHRcdFx0XHRcdFx0cGFyYW1zOiBvcHRpb25zLFxuXHRcdFx0XHRcdFx0Y2FsbGJhY2tzOiB7XG5cdFx0XHRcdFx0XHRcdFx0c3VjY2VzczogZnVuY3Rpb24gc3VjY2VzcyhyZXN1bHQpIHtcblx0XHRcdFx0XHRcdFx0XHRcdFx0Q2xvdWRpbmFyeVBpY2tlci5vbkltYWdlc1Jlc3BvbnNlKHJlc3VsdCk7XG5cdFx0XHRcdFx0XHRcdFx0fSxcblx0XHRcdFx0XHRcdFx0XHRmYWlsOiBmdW5jdGlvbiBmYWlsKGVycikge1xuXHRcdFx0XHRcdFx0XHRcdFx0XHRhbGVydChlcnIpO1xuXHRcdFx0XHRcdFx0XHRcdH1cblx0XHRcdFx0XHRcdH1cblx0XHRcdFx0fSk7XG5cdFx0fSxcblxuXHRcdGhhbmRsZVNlYXJjaDogZnVuY3Rpb24gaGFuZGxlU2VhcmNoKGUpIHtcblx0XHRcdFx0aWYgKGRlYm91bmNlZFRpbWVvdXQpIHtcblx0XHRcdFx0XHRcdGNsZWFyVGltZW91dChkZWJvdW5jZWRUaW1lb3V0KTtcblx0XHRcdFx0fVxuXG5cdFx0XHRcdGlmIChlLnRhcmdldC52YWx1ZSA9PT0gY3VycmVudFF1ZXJ5KSB7XG5cdFx0XHRcdFx0XHRyZXR1cm47XG5cdFx0XHRcdH1cblxuXHRcdFx0XHR2YXIgcXVlcnkgPSBlLnRhcmdldC52YWx1ZTtcblxuXHRcdFx0XHRjdXJyZW50UXVlcnkgPSBxdWVyeTtcblxuXHRcdFx0XHR2YXIgb3B0aW9ucyA9IHtcblx0XHRcdFx0XHRcdHBhZ2U6IDEsXG5cdFx0XHRcdFx0XHRsaW1pdDogbGltaXQsXG5cdFx0XHRcdFx0XHRxdWVyeTogcXVlcnlcblx0XHRcdFx0fTtcblxuXHRcdFx0XHRkZWJvdW5jZWRUaW1lb3V0ID0gc2V0VGltZW91dChmdW5jdGlvbiAoKSB7XG5cdFx0XHRcdFx0XHRDbG91ZGluYXJ5UGlja2VyLmdldEltYWdlcyhvcHRpb25zKTtcblx0XHRcdFx0fSwgbGF0ZW5jeSk7XG5cdFx0fSxcblxuXHRcdGl0ZW1TZWxlY3RlZDogZnVuY3Rpb24gaXRlbVNlbGVjdGVkKGl0ZW0sIGUpIHtcblxuXHRcdFx0XHRpZiAoaXRlbS50eXBlID09ICdmb2xkZXInKSB7XG5cblx0XHRcdFx0XHRcdHZhciBwYXJhbXMgPSB7XG5cdFx0XHRcdFx0XHRcdFx0cGFnZTogMSxcblx0XHRcdFx0XHRcdFx0XHRsaW1pdDogbGltaXQsXG5cdFx0XHRcdFx0XHRcdFx0cGFyZW50OiBpdGVtLmlkXG5cdFx0XHRcdFx0XHR9O1xuXG5cdFx0XHRcdFx0XHQvLyBUT0RPIHNldCBzZWFyY2ggaW5wdXQncyB2YWx1ZSA9ICcnXG5cdFx0XHRcdFx0XHRjdXJyZW50UXVlcnkgPSAnJztcblxuXHRcdFx0XHRcdFx0Q2xvdWRpbmFyeVBpY2tlci5nZXRJbWFnZXMocGFyYW1zKTtcblx0XHRcdFx0fSBlbHNlIHtcblx0XHRcdFx0XHRcdGluaXRPcHRpb25zLm9uU2VsZWN0KGl0ZW0pO1xuXHRcdFx0XHRcdFx0Q2xvdWRpbmFyeVBpY2tlci5jbG9zZU1vZGFsKCk7XG5cdFx0XHRcdH1cblx0XHR9LFxuXG5cdFx0b25JbWFnZXNSZXNwb25zZTogZnVuY3Rpb24gb25JbWFnZXNSZXNwb25zZShkYXRhKSB7XG5cblx0XHRcdFx0cGFnaW5hdGlvbkRhdGEgPSBQYWdpbmF0aW9uSGVscGVyLmdldFBhZ2VzUmFuZ2UoY3VycmVudFBhZ2UsIE1hdGguY2VpbChkYXRhLm1ldGEudG90YWwgLyBsaW1pdCkpO1xuXG5cdFx0XHRcdG1ldGFEYXRhID0gZGF0YS5tZXRhO1xuXHRcdFx0XHRpdGVtcyA9IGRhdGEuYXNzZXRzO1xuXG5cdFx0XHRcdENsb3VkaW5hcnlQaWNrZXIucmVuZGVyKCk7XG5cdFx0fSxcblxuXHRcdHJlbmRlclBhZ2luYXRpb25CdXR0b25zOiBmdW5jdGlvbiByZW5kZXJQYWdpbmF0aW9uQnV0dG9ucygpIHtcblx0XHRcdFx0dmFyIHRvUmV0dXJuID0gW107XG5cblx0XHRcdFx0dmFyIGNyZWF0ZVBhZ2luYXRpb25FbGVtZW50ID0gZnVuY3Rpb24gY3JlYXRlUGFnaW5hdGlvbkVsZW1lbnQoYUNsYXNzTmFtZSwgYUZ1bmN0aW9uLCBzcGFuQ2xhc3NOYW1lLCBzcGFuQ29udGVudCkge1xuXHRcdFx0XHRcdFx0dmFyIGxpID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudCgnbGknKTtcblx0XHRcdFx0XHRcdHZhciBhID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudCgnYScpO1xuXHRcdFx0XHRcdFx0bGkuY2xhc3NOYW1lID0gYUNsYXNzTmFtZTtcblx0XHRcdFx0XHRcdGEub25jbGljayA9IGFGdW5jdGlvbjtcblx0XHRcdFx0XHRcdHZhciBzcGFuID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudCgnc3BhbicpO1xuXHRcdFx0XHRcdFx0c3Bhbi5jbGFzc05hbWUgPSBzcGFuQ2xhc3NOYW1lO1xuXHRcdFx0XHRcdFx0aWYgKHNwYW5Db250ZW50KSB7XG5cdFx0XHRcdFx0XHRcdFx0c3Bhbi5pbm5lckhUTUwgPSBzcGFuQ29udGVudDtcblx0XHRcdFx0XHRcdH1cblx0XHRcdFx0XHRcdGEuYXBwZW5kQ2hpbGQoc3Bhbik7XG5cdFx0XHRcdFx0XHRsaS5hcHBlbmRDaGlsZChhKTtcblx0XHRcdFx0XHRcdHJldHVybiBsaTtcblx0XHRcdFx0fTtcblxuXHRcdFx0XHRpZiAocGFnaW5hdGlvbkRhdGEuaGFzUHJldmlvdXMpIHtcblx0XHRcdFx0XHRcdHRvUmV0dXJuLnB1c2goY3JlYXRlUGFnaW5hdGlvbkVsZW1lbnQoJ2Rpc2FibGVkJywgZnVuY3Rpb24gKGUpIHtcblx0XHRcdFx0XHRcdFx0XHRlLnByZXZlbnREZWZhdWx0KCk7XG5cdFx0XHRcdFx0XHRcdFx0Q2xvdWRpbmFyeVBpY2tlci5fZ29Ub1BhZ2UoMSk7XG5cdFx0XHRcdFx0XHR9LCAnZmEgZmEtYW5nbGUtZG91YmxlLWxlZnQnKSk7XG5cdFx0XHRcdFx0XHR0b1JldHVybi5wdXNoKGNyZWF0ZVBhZ2luYXRpb25FbGVtZW50KCdkaXNhYmxlZCcsIGZ1bmN0aW9uIChlKSB7XG5cdFx0XHRcdFx0XHRcdFx0ZS5wcmV2ZW50RGVmYXVsdCgpO1xuXHRcdFx0XHRcdFx0XHRcdENsb3VkaW5hcnlQaWNrZXIuX2dvVG9QYWdlKGN1cnJlbnRQYWdlIC0gMSk7XG5cdFx0XHRcdFx0XHR9LCAnZmEgZmEtYW5nbGUtbGVmdCcpKTtcblx0XHRcdFx0fVxuXG5cdFx0XHRcdGZvciAodmFyIGkgPSAwOyBpIDwgcGFnaW5hdGlvbkRhdGEuYnV0dG9ucy5sZW5ndGg7IGkrKykge1xuXHRcdFx0XHRcdFx0KGZ1bmN0aW9uIChpKSB7XG5cdFx0XHRcdFx0XHRcdFx0dmFyIGJ0biA9IHBhZ2luYXRpb25EYXRhLmJ1dHRvbnNbaV07XG5cdFx0XHRcdFx0XHRcdFx0dG9SZXR1cm4ucHVzaChjcmVhdGVQYWdpbmF0aW9uRWxlbWVudChidG4ucnVubmluZ3BhZ2UgPyBcImFjdGl2ZVwiIDogXCItXCIsIGZ1bmN0aW9uIChlKSB7XG5cdFx0XHRcdFx0XHRcdFx0XHRcdGUucHJldmVudERlZmF1bHQoKTtcblx0XHRcdFx0XHRcdFx0XHRcdFx0Q2xvdWRpbmFyeVBpY2tlci5fZ29Ub1BhZ2UoYnRuLnBhZ2Vubyk7XG5cdFx0XHRcdFx0XHRcdFx0fSwgJ251bWJlcicsIGJ0bi5wYWdlbm8pKTtcblx0XHRcdFx0XHRcdH0pKGkpO1xuXHRcdFx0XHR9XG5cblx0XHRcdFx0aWYgKHBhZ2luYXRpb25EYXRhLmhhc05leHQpIHtcblx0XHRcdFx0XHRcdHRvUmV0dXJuLnB1c2goY3JlYXRlUGFnaW5hdGlvbkVsZW1lbnQoJ2Rpc2FibGVkJywgZnVuY3Rpb24gKGUpIHtcblx0XHRcdFx0XHRcdFx0XHRlLnByZXZlbnREZWZhdWx0KCk7XG5cdFx0XHRcdFx0XHRcdFx0Q2xvdWRpbmFyeVBpY2tlci5fZ29Ub1BhZ2UoY3VycmVudFBhZ2UgKyAxKTtcblx0XHRcdFx0XHRcdH0sICdmYSBmYS1hbmdsZS1yaWdodCcpKTtcblx0XHRcdFx0XHRcdHRvUmV0dXJuLnB1c2goY3JlYXRlUGFnaW5hdGlvbkVsZW1lbnQoJ2Rpc2FibGVkJywgZnVuY3Rpb24gKGUpIHtcblx0XHRcdFx0XHRcdFx0XHRlLnByZXZlbnREZWZhdWx0KCk7XG5cdFx0XHRcdFx0XHRcdFx0Q2xvdWRpbmFyeVBpY2tlci5fZ29Ub1BhZ2UoTWF0aC5jZWlsKG1ldGFEYXRhLnRvdGFsIC8gbGltaXQpKTtcblx0XHRcdFx0XHRcdH0sICdmYSBmYS1hbmdsZS1kb3VibGUtcmlnaHQnKSk7XG5cdFx0XHRcdH1cblxuXHRcdFx0XHRkb2N1bWVudC5nZXRFbGVtZW50QnlJZCgnYmFjLS1jbG91ZGluYXJ5LWFjdHVhbC1wYWdpbmF0aW9uLWNvbnRhaW5lcicpLmlubmVySFRNTCA9ICcnO1xuXHRcdFx0XHRmb3IgKHZhciBfaSA9IDA7IF9pIDwgdG9SZXR1cm4ubGVuZ3RoOyBfaSsrKSB7XG5cdFx0XHRcdFx0XHRkb2N1bWVudC5nZXRFbGVtZW50QnlJZCgnYmFjLS1jbG91ZGluYXJ5LWFjdHVhbC1wYWdpbmF0aW9uLWNvbnRhaW5lcicpLmFwcGVuZENoaWxkKHRvUmV0dXJuW19pXSk7XG5cdFx0XHRcdH1cblx0XHR9LFxuXG5cdFx0X2dvVG9QYWdlOiBmdW5jdGlvbiBfZ29Ub1BhZ2UocGFnZSkge1xuXG5cdFx0XHRcdGlmIChwYWdlID09PSBjdXJyZW50UGFnZSkge1xuXHRcdFx0XHRcdFx0cmV0dXJuO1xuXHRcdFx0XHR9XG5cblx0XHRcdFx0dmFyIHBhcmFtcyA9IHtcblx0XHRcdFx0XHRcdHBhZ2U6IHBhZ2UsXG5cdFx0XHRcdFx0XHRsaW1pdDogbGltaXRcblx0XHRcdFx0fTtcblxuXHRcdFx0XHRpZiAobWV0YURhdGEuYXNzZXQpIHtcblx0XHRcdFx0XHRcdHBhcmFtcy5wYXJlbnQgPSBtZXRhRGF0YS5hc3NldDtcblx0XHRcdFx0fVxuXHRcdFx0XHRpZiAoY3VycmVudFF1ZXJ5KSB7XG5cdFx0XHRcdFx0XHRwYXJhbXMucXVlcnkgPSBjdXJyZW50UXVlcnk7XG5cdFx0XHRcdH1cblxuXHRcdFx0XHRjdXJyZW50UGFnZSA9IHBhZ2U7XG5cblx0XHRcdFx0Q2xvdWRpbmFyeVBpY2tlci5nZXRJbWFnZXMocGFyYW1zKTtcblx0XHR9LFxuXG5cdFx0Z29CYWNrOiBmdW5jdGlvbiBnb0JhY2soKSB7XG5cblx0XHRcdFx0dmFyIHBhcmFtcyA9IHtcblx0XHRcdFx0XHRcdHBhZ2U6IDEsXG5cdFx0XHRcdFx0XHRsaW1pdDogbGltaXRcblx0XHRcdFx0fTtcblx0XHRcdFx0aWYgKG1ldGFEYXRhLnBhcmVudCkge1xuXHRcdFx0XHRcdFx0cGFyYW1zLnBhcmVudCA9IG1ldGFEYXRhLnBhcmVudDtcblx0XHRcdFx0fVxuXHRcdFx0XHRpZiAoY3VycmVudFF1ZXJ5KSB7XG5cdFx0XHRcdFx0XHRwYXJhbXMucXVlcnkgPSBjdXJyZW50UXVlcnk7XG5cdFx0XHRcdH1cblx0XHRcdFx0Q2xvdWRpbmFyeVBpY2tlci5nZXRJbWFnZXMocGFyYW1zKTtcblx0XHR9LFxuXG5cdFx0cmVuZGVySXRlbXM6IGZ1bmN0aW9uIHJlbmRlckl0ZW1zKCkge1xuXHRcdFx0XHR2YXIgb25lSXRlbSA9IGZ1bmN0aW9uIG9uZUl0ZW0oaXRlbSkge1xuXHRcdFx0XHRcdFx0dmFyIGl0ZW1JY29uID0gZnVuY3Rpb24gaXRlbUljb24oKSB7XG5cdFx0XHRcdFx0XHRcdFx0aWYgKGl0ZW0udHlwZSAhPSAnZm9sZGVyJykge1xuXHRcdFx0XHRcdFx0XHRcdFx0XHRyZXR1cm4gJzxpbWcgc3JjPScgKyBpdGVtLnRodW1iICsgJyBhbHQ9XCJcIi8+Jztcblx0XHRcdFx0XHRcdFx0XHR9IGVsc2Uge1xuXHRcdFx0XHRcdFx0XHRcdFx0XHRyZXR1cm4gJzxpIGNsYXNzPVwiZmEgZmEtZm9sZGVyLW9cIj48L2k+Jztcblx0XHRcdFx0XHRcdFx0XHR9XG5cdFx0XHRcdFx0XHR9O1xuXG5cdFx0XHRcdFx0XHR2YXIgZnVuY3QgPSBmdW5jdGlvbiBmdW5jdCgpIHtcblx0XHRcdFx0XHRcdFx0XHRDbG91ZGluYXJ5UGlja2VyLml0ZW1TZWxlY3RlZChpdGVtKTtcblx0XHRcdFx0XHRcdH07XG5cblx0XHRcdFx0XHRcdHZhciBuZXdEb21FbCA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoJ2RpdicpO1xuXHRcdFx0XHRcdFx0bmV3RG9tRWwuY2xhc3NOYW1lID0gXCJjbG91ZC1pbWFnZXNfX2l0ZW1cIjtcblx0XHRcdFx0XHRcdG5ld0RvbUVsLm9uY2xpY2sgPSBmdW5jdDtcblx0XHRcdFx0XHRcdG5ld0RvbUVsLmlubmVySFRNTCA9ICdcXG5cXHRcXHRcXHRcXHRcXHRcXHQgIDxkaXYgY2xhc3M9XCJjbG91ZC1pbWFnZXNfX2l0ZW1fX3R5cGVcIj5cXG5cXHRcXHRcXHRcXHRcXHRcXHRcXHRcXHQnICsgaXRlbUljb24oKSArICdcXG5cXHRcXHRcXHRcXHRcXHRcXHQgIDwvZGl2PlxcblxcdFxcdFxcdFxcdFxcdFxcdCAgPGRpdiBjbGFzcz1cImNsb3VkLWltYWdlc19faXRlbV9fZGV0YWlsc1wiPlxcblxcdFxcdFxcdFxcdFxcdFxcdFxcdFxcdDxzcGFuIGNsYXNzPVwiY2xvdWQtaW1hZ2VzX19pdGVtX19kZXRhaWxzX19uYW1lXCI+JyArIGl0ZW0ubmFtZSArICc8L3NwYW4+XFxuXFx0XFx0XFx0XFx0XFx0XFx0XFx0XFx0PHNwYW4gY2xhc3M9XCJjbG91ZC1pbWFnZXNfX2l0ZW1fX2RldGFpbHNfX2RhdGVcIj4nICsgaXRlbS5jcmRhdGUgKyAnPC9zcGFuPlxcblxcdFxcdFxcdFxcdFxcdFxcdCAgPC9kaXY+XFxuXFx0XFx0XFx0XFx0XFx0XFx0ICA8ZGl2IGNsYXNzPVwiY2xvdWQtaW1hZ2VzX19pdGVtX19hY3Rpb25zXCI+XFxuXFx0XFx0XFx0XFx0XFx0XFx0XFx0XFx0PGEgY2xhc3M9XCJmYSBmYS1wZW5jaWxcIj48L2E+XFxuXFx0XFx0XFx0XFx0XFx0XFx0ICA8L2Rpdj4nO1xuXHRcdFx0XHRcdFx0cmV0dXJuIG5ld0RvbUVsO1xuXHRcdFx0XHR9O1xuXG5cdFx0XHRcdGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKCdiYWMtLWNsb3VkaW5hcnktaXRhbXMtY29udGFpbmVyJykuaW5uZXJIVE1MID0gJyc7XG5cdFx0XHRcdGZvciAodmFyIGkgPSAwOyBpIDwgaXRlbXMubGVuZ3RoOyBpKyspIHtcblx0XHRcdFx0XHRcdGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKCdiYWMtLWNsb3VkaW5hcnktaXRhbXMtY29udGFpbmVyJykuYXBwZW5kQ2hpbGQob25lSXRlbShpdGVtc1tpXSkpO1xuXHRcdFx0XHR9XG5cdFx0fSxcblxuXHRcdHJlbmRlcjogZnVuY3Rpb24gcmVuZGVyKCkge1xuXHRcdFx0XHRpZiAobWV0YURhdGEuYXNzZXQpIHtcblx0XHRcdFx0XHRcdERvbS5yZW1vdmVDbGFzcyhkb2N1bWVudC5nZXRFbGVtZW50QnlJZCgnYmFjLS1jbG91ZGluYXJ5LS1iYWNrLWJ1dHRvbi1jb250YWluZXInKSwgJ2hkbicpO1xuXHRcdFx0XHR9IGVsc2Uge1xuXHRcdFx0XHRcdFx0RG9tLmFkZENsYXNzKGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKCdiYWMtLWNsb3VkaW5hcnktLWJhY2stYnV0dG9uLWNvbnRhaW5lcicpLCAnaGRuJyk7XG5cdFx0XHRcdH1cblxuXHRcdFx0XHRDbG91ZGluYXJ5UGlja2VyLnJlbmRlckl0ZW1zKCk7XG5cblx0XHRcdFx0aWYgKG1ldGFEYXRhLnRvdGFsID4gbGltaXQpIHtcblx0XHRcdFx0XHRcdERvbS5yZW1vdmVDbGFzcyhkb2N1bWVudC5nZXRFbGVtZW50QnlJZCgnYmFjLS1jbG91ZGluYXJ5LXBhZ2luYXRpb24tY29udGFpbmVyJyksICdoZG4nKTtcblx0XHRcdFx0XHRcdENsb3VkaW5hcnlQaWNrZXIucmVuZGVyUGFnaW5hdGlvbkJ1dHRvbnMoKTtcblx0XHRcdFx0fSBlbHNlIHtcblx0XHRcdFx0XHRcdERvbS5hZGRDbGFzcyhkb2N1bWVudC5nZXRFbGVtZW50QnlJZCgnYmFjLS1jbG91ZGluYXJ5LXBhZ2luYXRpb24tY29udGFpbmVyJyksICdoZG4nKTtcblx0XHRcdFx0fVxuXHRcdH1cbn07XG5cbm1vZHVsZS5leHBvcnRzID0gQ2xvdWRpbmFyeVBpY2tlcjsiLCJ2YXIgRG9tID0ge1xuICAgIGhhc0NsYXNzOiBmdW5jdGlvbiBoYXNDbGFzcyhlbCwgY2xhc3NOYW1lKSB7XG4gICAgICAgIGlmIChlbC5jbGFzc0xpc3QpIHJldHVybiBlbC5jbGFzc0xpc3QuY29udGFpbnMoY2xhc3NOYW1lKTtlbHNlIHJldHVybiBuZXcgUmVnRXhwKCcoXnwgKScgKyBjbGFzc05hbWUgKyAnKCB8JCknLCAnZ2knKS50ZXN0KGVsLmNsYXNzTmFtZSk7XG4gICAgfSxcblxuICAgIHJlbW92ZUNsYXNzOiBmdW5jdGlvbiByZW1vdmVDbGFzcyhlbCwgY2xhc3NOYW1lKSB7XG4gICAgICAgIGlmIChlbC5jbGFzc0xpc3QpIGVsLmNsYXNzTGlzdC5yZW1vdmUoY2xhc3NOYW1lKTtlbHNlIGVsLmNsYXNzTmFtZSA9IGVsLmNsYXNzTmFtZS5yZXBsYWNlKG5ldyBSZWdFeHAoJyhefFxcXFxiKScgKyBjbGFzc05hbWUuc3BsaXQoJyAnKS5qb2luKCd8JykgKyAnKFxcXFxifCQpJywgJ2dpJyksICcgJyk7XG4gICAgfSxcblxuICAgIGFkZENsYXNzOiBmdW5jdGlvbiBhZGRDbGFzcyhlbCwgY2xhc3NOYW1lKSB7XG4gICAgICAgIGlmIChlbC5jbGFzc0xpc3QpIGVsLmNsYXNzTGlzdC5hZGQoY2xhc3NOYW1lKTtlbHNlIGVsLmNsYXNzTmFtZSArPSAnICcgKyBjbGFzc05hbWU7XG4gICAgfSxcblxuICAgIHRvZ2dsZUNsYXNzOiBmdW5jdGlvbiB0b2dnbGVDbGFzcyhlbCwgY2xhc3NOYW1lKSB7XG4gICAgICAgIGlmICh0aGlzLmhhc0NsYXNzKGVsLCBjbGFzc05hbWUpKSB7XG4gICAgICAgICAgICB0aGlzLnJlbW92ZUNsYXNzKGVsLCBjbGFzc05hbWUpO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgdGhpcy5hZGRDbGFzcyhlbCwgY2xhc3NOYW1lKTtcbiAgICAgICAgfVxuICAgIH1cbn07XG5cbm1vZHVsZS5leHBvcnRzID0gRG9tOyIsInZhciBkb20gPSByZXF1aXJlKCcuL2RvbScpO1xuXG52YXIgZGVmYXVsdEhpZGVJbiA9IDUwMDA7XG52YXIgbGFzdEluZGV4ID0gMTtcblxudmFyIGluZm9CbG9ja3MgPSBbXTtcblxudmFyIEluZm9Db250cm9sbGVyID0ge1xuXHRpbml0OiBmdW5jdGlvbiBpbml0KCkge1xuXHRcdGZvciAodmFyIGkgPSAxOyBpIDwgNTsgaSsrKSB7XG5cdFx0XHQoZnVuY3Rpb24geChpKSB7XG5cdFx0XHRcdHZhciBjbG9zZUZ1bmN0aW9uID0gZnVuY3Rpb24gY2xvc2VGdW5jdGlvbigpIHtcblx0XHRcdFx0XHRkb20ucmVtb3ZlQ2xhc3MoZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoJ2JhYy0tcHVyZXNkay1pbmZvLWJveC0tJyArIGkpLCAnYmFjLS1hY3RpdmUtLScpO1xuXHRcdFx0XHRcdGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKCdiYWMtLXRpbWVyJyArIGkpLnN0eWxlLnRyYW5zaXRpb24gPSAnJztcblx0XHRcdFx0XHRkb20ucmVtb3ZlQ2xhc3MoZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoJ2JhYy0tdGltZXInICsgaSksICdiYWMtLWZ1bGx3aWR0aCcpO1xuXHRcdFx0XHRcdGluZm9CbG9ja3NbaSAtIDFdLmluVXNlID0gZmFsc2U7XG5cdFx0XHRcdFx0c2V0VGltZW91dChmdW5jdGlvbiAoKSB7XG5cdFx0XHRcdFx0XHRpZiAoaW5mb0Jsb2Nrc1tpIC0gMV0uY2xvc2VUaW1lb3V0KSB7XG5cdFx0XHRcdFx0XHRcdGNsZWFyVGltZW91dChpbmZvQmxvY2tzW2kgLSAxXS5jbG9zZVRpbWVvdXQpO1xuXHRcdFx0XHRcdFx0fVxuXHRcdFx0XHRcdFx0ZG9tLnJlbW92ZUNsYXNzKGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKCdiYWMtLXB1cmVzZGstaW5mby1ib3gtLScgKyBpKSwgJ2JhYy0tc3VjY2VzcycpO1xuXHRcdFx0XHRcdFx0ZG9tLnJlbW92ZUNsYXNzKGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKCdiYWMtLXB1cmVzZGstaW5mby1ib3gtLScgKyBpKSwgJ2JhYy0taW5mbycpO1xuXHRcdFx0XHRcdFx0ZG9tLnJlbW92ZUNsYXNzKGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKCdiYWMtLXB1cmVzZGstaW5mby1ib3gtLScgKyBpKSwgJ2JhYy0td2FybmluZycpO1xuXHRcdFx0XHRcdFx0ZG9tLnJlbW92ZUNsYXNzKGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKCdiYWMtLXB1cmVzZGstaW5mby1ib3gtLScgKyBpKSwgJ2JhYy0tZXJyb3InKTtcblx0XHRcdFx0XHR9LCA0NTApO1xuXHRcdFx0XHR9O1xuXG5cdFx0XHRcdHZhciBhZGRUZXh0ID0gZnVuY3Rpb24gYWRkVGV4dCh0ZXh0KSB7XG5cdFx0XHRcdFx0ZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoJ2JhYy0taW5mby1tYWluLXRleHQtLScgKyBpKS5pbm5lckhUTUwgPSB0ZXh0O1xuXHRcdFx0XHR9O1xuXG5cdFx0XHRcdHZhciBhZGRUaW1lb3V0ID0gZnVuY3Rpb24gYWRkVGltZW91dCh0aW1lb3V0TXNlY3MpIHtcblx0XHRcdFx0XHRkb2N1bWVudC5nZXRFbGVtZW50QnlJZCgnYmFjLS10aW1lcicgKyBpKS5zdHlsZS50cmFuc2l0aW9uID0gJ3dpZHRoICcgKyB0aW1lb3V0TXNlY3MgKyAnbXMnO1xuXHRcdFx0XHRcdGRvbS5hZGRDbGFzcyhkb2N1bWVudC5nZXRFbGVtZW50QnlJZCgnYmFjLS10aW1lcicgKyBpKSwgJ2JhYy0tZnVsbHdpZHRoJyk7XG5cdFx0XHRcdFx0aW5mb0Jsb2Nrc1tpIC0gMV0uY2xvc2VUaW1lb3V0ID0gc2V0VGltZW91dChmdW5jdGlvbiAoKSB7XG5cdFx0XHRcdFx0XHRpbmZvQmxvY2tzW2kgLSAxXS5jbG9zZUZ1bmN0aW9uKCk7XG5cdFx0XHRcdFx0fSwgdGltZW91dE1zZWNzKTtcblx0XHRcdFx0fTtcblxuXHRcdFx0XHRpbmZvQmxvY2tzLnB1c2goe1xuXHRcdFx0XHRcdGlkOiBpLFxuXHRcdFx0XHRcdGluVXNlOiBmYWxzZSxcblx0XHRcdFx0XHRlbGVtZW50OiBkb2N1bWVudC5nZXRFbGVtZW50QnlJZCgnYmFjLS1wdXJlc2RrLWluZm8tYm94LS0nICsgaSksXG5cdFx0XHRcdFx0Y2xvc2VGdW5jdGlvbjogY2xvc2VGdW5jdGlvbixcblx0XHRcdFx0XHRhZGRUZXh0OiBhZGRUZXh0LFxuXHRcdFx0XHRcdGFkZFRpbWVvdXQ6IGFkZFRpbWVvdXQsXG5cdFx0XHRcdFx0Y2xvc2VUaW1lb3V0OiBmYWxzZVxuXHRcdFx0XHR9KTtcblx0XHRcdFx0ZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoJ2JhYy0taW5mby1jbG9zZS1idXR0b24tLScgKyBpKS5vbmNsaWNrID0gZnVuY3Rpb24gKGUpIHtcblx0XHRcdFx0XHRjbG9zZUZ1bmN0aW9uKGkpO1xuXHRcdFx0XHR9O1xuXHRcdFx0fSkoaSk7XG5cdFx0fVxuXHR9LFxuXG5cdC8qXG4gIHR5cGU6IG9uZSBvZjpcbiBcdC0gc3VjY2Vzc1xuIFx0LSBpbmZvXG4gXHQtIHdhcm5pbmdcbiBcdC0gZXJyb3JcbiAgdGV4dDogdGhlIHRleHQgdG8gZGlzcGxheVxuICBvcHRpb25zIChvcHRpb25hbCk6IHtcbiAgXHRcdGhpZGVJbjogbWlsbGlzZWNvbmRzIHRvIGhpZGUgaXQuIC0xIGZvciBub3QgaGlkaW5nIGl0IGF0IGFsbC4gRGVmYXVsdCBpcyA1MDAwXG4gIH1cbiAgKi9cblx0c2hvd0luZm86IGZ1bmN0aW9uIHNob3dJbmZvKHR5cGUsIHRleHQsIG9wdGlvbnMpIHtcblx0XHRmb3IgKHZhciBpID0gMDsgaSA8IGluZm9CbG9ja3MubGVuZ3RoOyBpKyspIHtcblx0XHRcdHZhciBpbmZvQmxvY2sgPSBpbmZvQmxvY2tzW2ldO1xuXHRcdFx0aWYgKCFpbmZvQmxvY2suaW5Vc2UpIHtcblx0XHRcdFx0aW5mb0Jsb2NrLmluVXNlID0gdHJ1ZTtcblx0XHRcdFx0aW5mb0Jsb2NrLmVsZW1lbnQuc3R5bGUuekluZGV4ID0gbGFzdEluZGV4O1xuXHRcdFx0XHRpbmZvQmxvY2suYWRkVGV4dCh0ZXh0KTtcblx0XHRcdFx0bGFzdEluZGV4ICs9IDE7XG5cdFx0XHRcdHZhciB0aW1lb3V0bVNlY3MgPSBkZWZhdWx0SGlkZUluO1xuXHRcdFx0XHR2YXIgYXV0b0Nsb3NlID0gdHJ1ZTtcblx0XHRcdFx0aWYgKG9wdGlvbnMpIHtcblx0XHRcdFx0XHRpZiAob3B0aW9ucy5oaWRlSW4gIT0gbnVsbCAmJiBvcHRpb25zLmhpZGVJbiAhPSB1bmRlZmluZWQgJiYgb3B0aW9ucy5oaWRlSW4gIT0gLTEpIHtcblx0XHRcdFx0XHRcdHRpbWVvdXRtU2VjcyA9IG9wdGlvbnMuaGlkZUluO1xuXHRcdFx0XHRcdH0gZWxzZSBpZiAob3B0aW9ucy5oaWRlSW4gPT09IC0xKSB7XG5cdFx0XHRcdFx0XHRhdXRvQ2xvc2UgPSBmYWxzZTtcblx0XHRcdFx0XHR9XG5cdFx0XHRcdH1cblx0XHRcdFx0aWYgKGF1dG9DbG9zZSkge1xuXHRcdFx0XHRcdGluZm9CbG9jay5hZGRUaW1lb3V0KHRpbWVvdXRtU2Vjcyk7XG5cdFx0XHRcdH1cblx0XHRcdFx0ZG9tLmFkZENsYXNzKGluZm9CbG9jay5lbGVtZW50LCAnYmFjLS0nICsgdHlwZSk7XG5cdFx0XHRcdGRvbS5hZGRDbGFzcyhpbmZvQmxvY2suZWxlbWVudCwgJ2JhYy0tYWN0aXZlLS0nKTtcblx0XHRcdFx0cmV0dXJuO1xuXHRcdFx0fVxuXHRcdH1cblx0fVxufTtcblxubW9kdWxlLmV4cG9ydHMgPSBJbmZvQ29udHJvbGxlcjsiLCJ2YXIgU3RvcmUgPSByZXF1aXJlKCcuL3N0b3JlLmpzJyk7XG5cbnZhciBMb2dnZXIgPSB7XG5cdFx0bG9nOiBmdW5jdGlvbiBsb2cod2hhdCkge1xuXHRcdFx0XHRpZiAoIVN0b3JlLmxvZ3NFbmFibGVkKCkpIHtcblx0XHRcdFx0XHRcdHJldHVybiBmYWxzZTtcblx0XHRcdFx0fSBlbHNlIHtcblx0XHRcdFx0XHRcdExvZ2dlci5sb2cgPSBjb25zb2xlLmxvZy5iaW5kKGNvbnNvbGUpO1xuXHRcdFx0XHRcdFx0TG9nZ2VyLmxvZyh3aGF0KTtcblx0XHRcdFx0fVxuXHRcdH0sXG5cdFx0ZXJyb3I6IGZ1bmN0aW9uIGVycm9yKGVycikge1xuXHRcdFx0XHRpZiAoIVN0b3JlLmxvZ3NFbmFibGVkKCkpIHtcblx0XHRcdFx0XHRcdHJldHVybiBmYWxzZTtcblx0XHRcdFx0fSBlbHNlIHtcblx0XHRcdFx0XHRcdExvZ2dlci5lcnJvciA9IGNvbnNvbGUuZXJyb3IuYmluZChjb25zb2xlKTtcblx0XHRcdFx0XHRcdExvZ2dlci5lcnJvcihlcnIpO1xuXHRcdFx0XHR9XG5cdFx0fVxufTtcblxubW9kdWxlLmV4cG9ydHMgPSBMb2dnZXI7IiwidmFyIHNldHRpbmdzID0ge1xuXHR0b3RhbFBhZ2VCdXR0b25zTnVtYmVyOiA4XG59O1xuXG52YXIgUGFnaW5hdG9yID0ge1xuXHRzZXRTZXR0aW5nczogZnVuY3Rpb24gc2V0U2V0dGluZ3Moc2V0dGluZykge1xuXHRcdGZvciAodmFyIGtleSBpbiBzZXR0aW5nKSB7XG5cdFx0XHRzZXR0aW5nc1trZXldID0gc2V0dGluZ1trZXldO1xuXHRcdH1cblx0fSxcblxuXHRnZXRQYWdlc1JhbmdlOiBmdW5jdGlvbiBnZXRQYWdlc1JhbmdlKGN1cnBhZ2UsIHRvdGFsUGFnZXNPblJlc3VsdFNldCkge1xuXHRcdHZhciBwYWdlUmFuZ2UgPSBbeyBwYWdlbm86IGN1cnBhZ2UsIHJ1bm5pbmdwYWdlOiB0cnVlIH1dO1xuXHRcdHZhciBoYXNuZXh0b25yaWdodCA9IHRydWU7XG5cdFx0dmFyIGhhc25leHRvbmxlZnQgPSB0cnVlO1xuXHRcdHZhciBpID0gMTtcblx0XHR3aGlsZSAocGFnZVJhbmdlLmxlbmd0aCA8IHNldHRpbmdzLnRvdGFsUGFnZUJ1dHRvbnNOdW1iZXIgJiYgKGhhc25leHRvbnJpZ2h0IHx8IGhhc25leHRvbmxlZnQpKSB7XG5cdFx0XHRpZiAoaGFzbmV4dG9ubGVmdCkge1xuXHRcdFx0XHRpZiAoY3VycGFnZSAtIGkgPiAwKSB7XG5cdFx0XHRcdFx0cGFnZVJhbmdlLnB1c2goeyBwYWdlbm86IGN1cnBhZ2UgLSBpLCBydW5uaW5ncGFnZTogZmFsc2UgfSk7XG5cdFx0XHRcdH0gZWxzZSB7XG5cdFx0XHRcdFx0aGFzbmV4dG9ubGVmdCA9IGZhbHNlO1xuXHRcdFx0XHR9XG5cdFx0XHR9XG5cdFx0XHRpZiAoaGFzbmV4dG9ucmlnaHQpIHtcblx0XHRcdFx0aWYgKGN1cnBhZ2UgKyBpIC0gMSA8IHRvdGFsUGFnZXNPblJlc3VsdFNldCkge1xuXHRcdFx0XHRcdHBhZ2VSYW5nZS5wdXNoKHsgcGFnZW5vOiBjdXJwYWdlICsgaSwgcnVubmluZ3BhZ2U6IGZhbHNlIH0pO1xuXHRcdFx0XHR9IGVsc2Uge1xuXHRcdFx0XHRcdGhhc25leHRvbnJpZ2h0ID0gZmFsc2U7XG5cdFx0XHRcdH1cblx0XHRcdH1cblx0XHRcdGkrKztcblx0XHR9XG5cblx0XHR2YXIgaGFzTmV4dCA9IGN1cnBhZ2UgPCB0b3RhbFBhZ2VzT25SZXN1bHRTZXQ7XG5cdFx0dmFyIGhhc1ByZXZpb3VzID0gY3VycGFnZSA+IDE7XG5cblx0XHRyZXR1cm4ge1xuXHRcdFx0YnV0dG9uczogcGFnZVJhbmdlLnNvcnQoZnVuY3Rpb24gKGl0ZW1BLCBpdGVtQikge1xuXHRcdFx0XHRyZXR1cm4gaXRlbUEucGFnZW5vIC0gaXRlbUIucGFnZW5vO1xuXHRcdFx0fSksXG5cdFx0XHRoYXNOZXh0OiBoYXNOZXh0LFxuXHRcdFx0aGFzUHJldmlvdXM6IGhhc1ByZXZpb3VzXG5cdFx0fTtcblx0fVxufTtcblxubW9kdWxlLmV4cG9ydHMgPSBQYWdpbmF0b3I7IiwiJ3VzZSBzdHJpY3QnO1xuXG52YXIgU3RvcmUgPSByZXF1aXJlKCcuL3N0b3JlLmpzJyk7XG52YXIgTG9nZ2VyID0gcmVxdWlyZSgnLi9sb2dnZXIuanMnKTtcblxudmFyIGF2YWlsYWJsZUxpc3RlbmVycyA9IHtcblx0c2VhcmNoS2V5VXA6IHtcblx0XHRpbmZvOiAnTGlzdGVuZXIgb24ga2V5VXAgb2Ygc2VhcmNoIGlucHV0IG9uIHRvcCBiYXInXG5cdH0sXG5cdHNlYXJjaEVudGVyOiB7XG5cdFx0aW5mbzogJ0xpc3RlbmVyIG9uIGVudGVyIGtleSBwcmVzc2VkIG9uIHNlYXJjaCBpbnB1dCBvbiB0b3AgYmFyJ1xuXHR9LFxuXHRzZWFyY2hPbkNoYW5nZToge1xuXHRcdGluZm86ICdMaXN0ZW5lciBvbiBjaGFuZ2Ugb2YgaW5wdXQgdmFsdWUnXG5cdH1cbn07XG5cbnZhciBQdWJTdWIgPSB7XG5cdGdldEF2YWlsYWJsZUxpc3RlbmVyczogZnVuY3Rpb24gZ2V0QXZhaWxhYmxlTGlzdGVuZXJzKCkge1xuXHRcdHJldHVybiBhdmFpbGFibGVMaXN0ZW5lcnM7XG5cdH0sXG5cblx0c3Vic2NyaWJlOiBmdW5jdGlvbiBzdWJzY3JpYmUoZXZlbnR0LCBmdW5jdCkge1xuXHRcdGlmIChldmVudHQgPT09IFwic2VhcmNoS2V5VXBcIikge1xuXHRcdFx0dmFyIGVsID0gZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoU3RvcmUuZ2V0U2VhcmNoSW5wdXRJZCgpKTtcblx0XHRcdGVsLmFkZEV2ZW50TGlzdGVuZXIoJ2tleXVwJywgZnVuY3QpO1xuXHRcdFx0cmV0dXJuIGZ1bmN0aW9uICgpIHtcblx0XHRcdFx0ZWwucmVtb3ZlRXZlbnRMaXN0ZW5lcigna2V5dXAnLCBmdW5jdCwgZmFsc2UpO1xuXHRcdFx0fTtcblx0XHR9IGVsc2UgaWYgKGV2ZW50dCA9PT0gJ3NlYXJjaEVudGVyJykge1xuXHRcdFx0dmFyIGhhbmRsaW5nRnVuY3QgPSBmdW5jdGlvbiBoYW5kbGluZ0Z1bmN0KGUpIHtcblx0XHRcdFx0aWYgKGUua2V5Q29kZSA9PT0gMTMpIHtcblx0XHRcdFx0XHRmdW5jdChlKTtcblx0XHRcdFx0fVxuXHRcdFx0fTtcblx0XHRcdGVsLmFkZEV2ZW50TGlzdGVuZXIoJ2tleWRvd24nLCBoYW5kbGluZ0Z1bmN0KTtcblx0XHRcdHJldHVybiBmdW5jdGlvbiAoKSB7XG5cdFx0XHRcdGVsLnJlbW92ZUV2ZW50TGlzdGVuZXIoJ2tleWRvd24nLCBoYW5kbGluZ0Z1bmN0LCBmYWxzZSk7XG5cdFx0XHR9O1xuXHRcdH0gZWxzZSBpZiAoZXZlbnR0ID09PSAnc2VhcmNoT25DaGFuZ2UnKSB7XG5cdFx0XHR2YXIgZWwgPSBkb2N1bWVudC5nZXRFbGVtZW50QnlJZChTdG9yZS5nZXRTZWFyY2hJbnB1dElkKCkpO1xuXHRcdFx0ZWwuYWRkRXZlbnRMaXN0ZW5lcignY2hhbmdlJywgZnVuY3QpO1xuXHRcdFx0cmV0dXJuIGZ1bmN0aW9uICgpIHtcblx0XHRcdFx0ZWwucmVtb3ZlRXZlbnRMaXN0ZW5lcigna2V5dXAnLCBmdW5jdCwgZmFsc2UpO1xuXHRcdFx0fTtcblx0XHR9IGVsc2Uge1xuXHRcdFx0TG9nZ2VyLmVycm9yKCdUaGUgZXZlbnQgeW91IHRyaWVkIHRvIHN1YnNjcmliZSBpcyBub3QgYXZhaWxhYmxlIGJ5IHRoZSBsaWJyYXJ5Jyk7XG5cdFx0XHRMb2dnZXIubG9nKCdUaGUgYXZhaWxhYmxlIGV2ZW50cyBhcmU6ICcsIGF2YWlsYWJsZUxpc3RlbmVycyk7XG5cdFx0XHRyZXR1cm4gZnVuY3Rpb24gKCkge307XG5cdFx0fVxuXHR9XG59O1xuXG5tb2R1bGUuZXhwb3J0cyA9IFB1YlN1YjsiLCJ2YXIgc3RhdGUgPSB7XG5cdGdlbmVyYWw6IHt9LFxuXHR1c2VyRGF0YToge30sXG5cdGNvbmZpZ3VyYXRpb246IHt9LFxuXHRodG1sVGVtcGxhdGU6IFwiXCIsXG5cdGFwcHM6IG51bGwsXG5cdHZlcnNpb25OdW1iZXI6ICcnLFxuXHRkZXY6IGZhbHNlLFxuXHRmaWxlUGlja2VyOiB7XG5cdFx0c2VsZWN0ZWRGaWxlOiBudWxsXG5cdH0sXG5cdGFwcEluZm86IG51bGxcbn07XG5cbmZ1bmN0aW9uIGFzc2VtYmxlKGxpdGVyYWwsIHBhcmFtcykge1xuXHRyZXR1cm4gbmV3IEZ1bmN0aW9uKHBhcmFtcywgXCJyZXR1cm4gYFwiICsgbGl0ZXJhbCArIFwiYDtcIik7XG59XG5cbnZhciBTdG9yZSA9IHtcblx0Z2V0U3RhdGU6IGZ1bmN0aW9uIGdldFN0YXRlKCkge1xuXHRcdHJldHVybiBPYmplY3QuYXNzaWduKHt9LCBzdGF0ZSk7XG5cdH0sXG5cblx0c2V0V2luZG93TmFtZTogZnVuY3Rpb24gc2V0V2luZG93TmFtZSh3bikge1xuXHRcdHN0YXRlLmdlbmVyYWwud2luZG93TmFtZSA9IHduO1xuXHR9LFxuXG5cdHNldERldjogZnVuY3Rpb24gc2V0RGV2KGRldikge1xuXHRcdHN0YXRlLmRldiA9IGRldjtcblx0fSxcblxuXHRnZXREZXZVcmxQYXJ0OiBmdW5jdGlvbiBnZXREZXZVcmxQYXJ0KCkge1xuXHRcdGlmIChzdGF0ZS5kZXYpIHtcblx0XHRcdHJldHVybiBcInNhbmRib3gvXCI7XG5cdFx0fSBlbHNlIHtcblx0XHRcdHJldHVybiBcIlwiO1xuXHRcdH1cblx0fSxcblxuXHRnZXRGdWxsQmFzZVVybDogZnVuY3Rpb24gZ2V0RnVsbEJhc2VVcmwoKSB7XG5cdFx0cmV0dXJuIHN0YXRlLmNvbmZpZ3VyYXRpb24ucm9vdFVybCArIHN0YXRlLmNvbmZpZ3VyYXRpb24uYmFzZVVybCArIFN0b3JlLmdldERldlVybFBhcnQoKTtcblx0fSxcblxuXHQvKlxuICBjb25mOlxuICAtIGhlYWRlckRpdklkXG4gIC0gaW5jbHVkZUFwcHNNZW51XG4gICovXG5cdHNldENvbmZpZ3VyYXRpb246IGZ1bmN0aW9uIHNldENvbmZpZ3VyYXRpb24oY29uZikge1xuXHRcdHN0YXRlLmNvbmZpZ3VyYXRpb24gPSBjb25mO1xuXHR9LFxuXG5cdHNldFZlcnNpb25OdW1iZXI6IGZ1bmN0aW9uIHNldFZlcnNpb25OdW1iZXIodmVyc2lvbikge1xuXHRcdHN0YXRlLnZlcnNpb25OdW1iZXIgPSB2ZXJzaW9uO1xuXHR9LFxuXG5cdGdldFZlcnNpb25OdW1iZXI6IGZ1bmN0aW9uIGdldFZlcnNpb25OdW1iZXIoKSB7XG5cdFx0cmV0dXJuIHN0YXRlLnZlcnNpb25OdW1iZXI7XG5cdH0sXG5cblx0Z2V0QXBwc1Zpc2libGU6IGZ1bmN0aW9uIGdldEFwcHNWaXNpYmxlKCkge1xuXHRcdGlmIChzdGF0ZS5jb25maWd1cmF0aW9uLmFwcHNWaXNpYmxlID09PSBudWxsIHx8IHN0YXRlLmNvbmZpZ3VyYXRpb24uYXBwc1Zpc2libGUgPT09IHVuZGVmaW5lZCkge1xuXHRcdFx0cmV0dXJuIHRydWU7XG5cdFx0fSBlbHNlIHtcblx0XHRcdHJldHVybiBzdGF0ZS5jb25maWd1cmF0aW9uLmFwcHNWaXNpYmxlO1xuXHRcdH1cblx0fSxcblxuXHRzZXRBcHBzVmlzaWJsZTogZnVuY3Rpb24gc2V0QXBwc1Zpc2libGUoYXBwc1Zpc2libGUpIHtcblx0XHRzdGF0ZS5jb25maWd1cmF0aW9uLmFwcHNWaXNpYmxlID0gYXBwc1Zpc2libGU7XG5cdH0sXG5cblx0c2V0SFRNTFRlbXBsYXRlOiBmdW5jdGlvbiBzZXRIVE1MVGVtcGxhdGUodGVtcGxhdGUpIHtcblx0XHRzdGF0ZS5odG1sVGVtcGxhdGUgPSB0ZW1wbGF0ZTtcblx0fSxcblxuXHRzZXRBcHBzOiBmdW5jdGlvbiBzZXRBcHBzKGFwcHMpIHtcblx0XHRzdGF0ZS5hcHBzID0gYXBwcztcblx0fSxcblxuXHRzZXRBcHBJbmZvOiBmdW5jdGlvbiBzZXRBcHBJbmZvKGFwcEluZm8pIHtcblx0XHRzdGF0ZS5hcHBJbmZvID0gYXBwSW5mbztcblx0fSxcblxuXHRnZXRBcHBJbmZvOiBmdW5jdGlvbiBnZXRBcHBJbmZvKCkge1xuXHRcdHJldHVybiBzdGF0ZS5hcHBJbmZvO1xuXHR9LFxuXG5cdGdldExvZ2luVXJsOiBmdW5jdGlvbiBnZXRMb2dpblVybCgpIHtcblx0XHRyZXR1cm4gc3RhdGUuY29uZmlndXJhdGlvbi5yb290VXJsICsgc3RhdGUuY29uZmlndXJhdGlvbi5sb2dpblVybCArIFwiP1wiICsgc3RhdGUuY29uZmlndXJhdGlvbi5yZWRpcmVjdFVybFBhcmFtICsgXCI9XCIgKyB3aW5kb3cubG9jYXRpb24uaHJlZjtcblx0fSxcblxuXHRnZXRBdXRoZW50aWNhdGlvbkVuZHBvaW50OiBmdW5jdGlvbiBnZXRBdXRoZW50aWNhdGlvbkVuZHBvaW50KCkge1xuXHRcdHJldHVybiBTdG9yZS5nZXRGdWxsQmFzZVVybCgpICsgJ3Nlc3Npb24nO1xuXHR9LFxuXG5cdGdldFN3aXRjaEFjY291bnRFbmRwb2ludDogZnVuY3Rpb24gZ2V0U3dpdGNoQWNjb3VudEVuZHBvaW50KGFjY291bnRJZCkge1xuXHRcdHJldHVybiBTdG9yZS5nZXRGdWxsQmFzZVVybCgpICsgJ2FjY291bnRzL3N3aXRjaC8nICsgYWNjb3VudElkO1xuXHR9LFxuXG5cdGdldEFwcHNFbmRwb2ludDogZnVuY3Rpb24gZ2V0QXBwc0VuZHBvaW50KCkge1xuXHRcdHJldHVybiBTdG9yZS5nZXRGdWxsQmFzZVVybCgpICsgJ2FwcHMnO1xuXHR9LFxuXG5cdGdldENsb3VkaW5hcnlFbmRwb2ludDogZnVuY3Rpb24gZ2V0Q2xvdWRpbmFyeUVuZHBvaW50KCkge1xuXHRcdHJldHVybiBTdG9yZS5nZXRGdWxsQmFzZVVybCgpICsgJ2Fzc2V0cyc7XG5cdH0sXG5cblx0bG9nc0VuYWJsZWQ6IGZ1bmN0aW9uIGxvZ3NFbmFibGVkKCkge1xuXHRcdHJldHVybiBzdGF0ZS5jb25maWd1cmF0aW9uLmxvZ3M7XG5cdH0sXG5cblx0Z2V0U2VhcmNoSW5wdXRJZDogZnVuY3Rpb24gZ2V0U2VhcmNoSW5wdXRJZCgpIHtcblx0XHRyZXR1cm4gc3RhdGUuY29uZmlndXJhdGlvbi5zZWFyY2hJbnB1dElkO1xuXHR9LFxuXG5cdHNldEhUTUxDb250YWluZXI6IGZ1bmN0aW9uIHNldEhUTUxDb250YWluZXIoaWQpIHtcblx0XHRzdGF0ZS5jb25maWd1cmF0aW9uLmhlYWRlckRpdklkID0gaWQ7XG5cdH0sXG5cblx0Z2V0SFRMTUNvbnRhaW5lcjogZnVuY3Rpb24gZ2V0SFRMTUNvbnRhaW5lcigpIHtcblx0XHRpZiAoc3RhdGUuY29uZmlndXJhdGlvbi5oZWFkZXJEaXZJZCkge1xuXHRcdFx0cmV0dXJuIHN0YXRlLmNvbmZpZ3VyYXRpb24uaGVhZGVyRGl2SWQ7XG5cdFx0fSBlbHNlIHtcblx0XHRcdHJldHVybiBcInBwc2RrLWNvbnRhaW5lclwiO1xuXHRcdH1cblx0fSxcblxuXHRnZXRIVE1MOiBmdW5jdGlvbiBnZXRIVE1MKCkge1xuXHRcdHJldHVybiBzdGF0ZS5odG1sVGVtcGxhdGU7XG5cdH0sXG5cblx0Z2V0V2luZG93TmFtZTogZnVuY3Rpb24gZ2V0V2luZG93TmFtZSgpIHtcblx0XHRyZXR1cm4gc3RhdGUuZ2VuZXJhbC53aW5kb3dOYW1lO1xuXHR9LFxuXG5cdHNldFVzZXJEYXRhOiBmdW5jdGlvbiBzZXRVc2VyRGF0YSh1c2VyRGF0YSkge1xuXHRcdHN0YXRlLnVzZXJEYXRhID0gdXNlckRhdGE7XG5cdH0sXG5cblx0Z2V0VXNlckRhdGE6IGZ1bmN0aW9uIGdldFVzZXJEYXRhKCkge1xuXHRcdHJldHVybiBzdGF0ZS51c2VyRGF0YTtcblx0fSxcblxuXHRzZXRSb290VXJsOiBmdW5jdGlvbiBzZXRSb290VXJsKHJvb3RVcmwpIHtcblx0XHRzdGF0ZS5jb25maWd1cmF0aW9uLnJvb3RVcmwgPSByb290VXJsO1xuXHR9LFxuXG5cdGdldFJvb3RVcmw6IGZ1bmN0aW9uIGdldFJvb3RVcmwoKSB7XG5cdFx0cmV0dXJuIHN0YXRlLmNvbmZpZ3VyYXRpb24ucm9vdFVybDtcblx0fSxcblxuXHRnZXRBdmF0YXJVcGxvYWRVcmw6IGZ1bmN0aW9uIGdldEF2YXRhclVwbG9hZFVybCgpIHtcblx0XHRyZXR1cm4gU3RvcmUuZ2V0RnVsbEJhc2VVcmwoKSArICdhc3NldHMvdXBsb2FkJztcblx0fSxcblxuXHRnZXRBdmF0YXJVcGRhdGVVcmw6IGZ1bmN0aW9uIGdldEF2YXRhclVwZGF0ZVVybCgpIHtcblx0XHRyZXR1cm4gU3RvcmUuZ2V0RnVsbEJhc2VVcmwoKSArICd1c2Vycy9hdmF0YXInO1xuXHR9XG59O1xuXG5tb2R1bGUuZXhwb3J0cyA9IFN0b3JlOyJdfQ==
