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

			/* optional session url */
			if (conf.sessionEndpoint) {
				Store.setSessionEndpoint(conf.sessionEndpoint);
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
 * version: 2.6.4
 * date: 2017-10-05
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
ppba.setVersionNumber('2.6.4');

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
},{}]},{},[2])
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uLy4uL25vZGVfbW9kdWxlcy9icm93c2VyLXBhY2svX3ByZWx1ZGUuanMiLCJQUEJBLmpzIiwiaW5kZXguanMiLCJtb2R1bGVzL2F2YXRhci1jb250cm9sbGVyLmpzIiwibW9kdWxlcy9jYWxsZXIuanMiLCJtb2R1bGVzL2Nsb3VkaW5hcnktaW1hZ2UtcGlja2VyLmpzIiwibW9kdWxlcy9kb20uanMiLCJtb2R1bGVzL2luZm8tY29udHJvbGxlci5qcyIsIm1vZHVsZXMvbG9nZ2VyLmpzIiwibW9kdWxlcy9wYWdpbmF0aW9uLWhlbHBlci5qcyIsIm1vZHVsZXMvcHVic3ViLmpzIiwibW9kdWxlcy9zdG9yZS5qcyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTtBQ0FBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDclVBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDOUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUN2SEE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNqR0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDclFBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDdEJBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDOUZBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3JCQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDL0NBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNyREE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQSIsImZpbGUiOiJnZW5lcmF0ZWQuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlc0NvbnRlbnQiOlsiKGZ1bmN0aW9uIGUodCxuLHIpe2Z1bmN0aW9uIHMobyx1KXtpZighbltvXSl7aWYoIXRbb10pe3ZhciBhPXR5cGVvZiByZXF1aXJlPT1cImZ1bmN0aW9uXCImJnJlcXVpcmU7aWYoIXUmJmEpcmV0dXJuIGEobywhMCk7aWYoaSlyZXR1cm4gaShvLCEwKTt2YXIgZj1uZXcgRXJyb3IoXCJDYW5ub3QgZmluZCBtb2R1bGUgJ1wiK28rXCInXCIpO3Rocm93IGYuY29kZT1cIk1PRFVMRV9OT1RfRk9VTkRcIixmfXZhciBsPW5bb109e2V4cG9ydHM6e319O3Rbb11bMF0uY2FsbChsLmV4cG9ydHMsZnVuY3Rpb24oZSl7dmFyIG49dFtvXVsxXVtlXTtyZXR1cm4gcyhuP246ZSl9LGwsbC5leHBvcnRzLGUsdCxuLHIpfXJldHVybiBuW29dLmV4cG9ydHN9dmFyIGk9dHlwZW9mIHJlcXVpcmU9PVwiZnVuY3Rpb25cIiYmcmVxdWlyZTtmb3IodmFyIG89MDtvPHIubGVuZ3RoO28rKylzKHJbb10pO3JldHVybiBzfSkiLCJ2YXIgTG9nZ2VyID0gcmVxdWlyZSgnLi9tb2R1bGVzL2xvZ2dlcicpO1xudmFyIFB1YlN1YiA9IHJlcXVpcmUoJy4vbW9kdWxlcy9wdWJzdWInKTtcbnZhciBDYWxsZXIgPSByZXF1aXJlKCcuL21vZHVsZXMvY2FsbGVyJyk7XG52YXIgRG9tID0gcmVxdWlyZSgnLi9tb2R1bGVzL2RvbScpO1xudmFyIEluZm9Db250cm9sbGVyID0gcmVxdWlyZSgnLi9tb2R1bGVzL2luZm8tY29udHJvbGxlcicpO1xudmFyIEF2YXRhckNvbnRyb2xsZXIgPSByZXF1aXJlKCcuL21vZHVsZXMvYXZhdGFyLWNvbnRyb2xsZXInKTtcbnZhciBTdG9yZSA9IHJlcXVpcmUoJy4vbW9kdWxlcy9zdG9yZScpO1xudmFyIENsb3VkaW5hcnkgPSByZXF1aXJlKCcuL21vZHVsZXMvY2xvdWRpbmFyeS1pbWFnZS1waWNrZXInKTtcbnZhciBwcGJhQ29uZiA9IHt9O1xuXG52YXIgYWZ0ZXJSZW5kZXIgPSBmdW5jdGlvbiBhZnRlclJlbmRlcigpIHtcblx0aWYgKGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKCdiYWMtLXB1cmVzZGstLWFwcHMtLW9wZW5lci0tJykpIHtcblx0XHRkb2N1bWVudC5nZXRFbGVtZW50QnlJZCgnYmFjLS1wdXJlc2RrLS1hcHBzLS1vcGVuZXItLScpLmFkZEV2ZW50TGlzdGVuZXIoJ2NsaWNrJywgZnVuY3Rpb24gKGUpIHtcblx0XHRcdGUuc3RvcFByb3BhZ2F0aW9uKCk7XG5cdFx0XHQvLyBEb20udG9nZ2xlQ2xhc3MoZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoJ2JhYy0tcHVyZXNkay1hcHBzLWNvbnRhaW5lci0tJyksICdhY3RpdmUnKTtcblx0XHRcdHdpbmRvdy5sb2NhdGlvbi5ocmVmID0gU3RvcmUuZ2V0Um9vdFVybCgpO1xuXHRcdH0pO1xuXHR9XG5cblx0ZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoJ2JhYy0tdXNlci1hdmF0YXItdG9wJykuYWRkRXZlbnRMaXN0ZW5lcignY2xpY2snLCBmdW5jdGlvbiAoZSkge1xuXHRcdGUuc3RvcFByb3BhZ2F0aW9uKCk7XG5cdFx0Ly8gRG9tLnJlbW92ZUNsYXNzKGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKCdiYWMtLXB1cmVzZGstYXBwcy1jb250YWluZXItLScpLCAnYWN0aXZlJyk7XG5cdFx0RG9tLnRvZ2dsZUNsYXNzKGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKCdiYWMtLXB1cmVzZGstdXNlci1zaWRlYmFyLS0nKSwgJ2FjdGl2ZScpO1xuXHR9KTtcblxuXHR3aW5kb3cuYWRkRXZlbnRMaXN0ZW5lcignY2xpY2snLCBmdW5jdGlvbiAoZSkge1xuXHRcdC8vIERvbS5yZW1vdmVDbGFzcyhkb2N1bWVudC5nZXRFbGVtZW50QnlJZCgnYmFjLS1wdXJlc2RrLWFwcHMtY29udGFpbmVyLS0nKSwgJ2FjdGl2ZScpO1xuXHRcdERvbS5yZW1vdmVDbGFzcyhkb2N1bWVudC5nZXRFbGVtZW50QnlJZCgnYmFjLS1wdXJlc2RrLXVzZXItc2lkZWJhci0tJyksICdhY3RpdmUnKTtcblx0fSk7XG5cblx0QXZhdGFyQ29udHJvbGxlci5pbml0KCk7XG5cdHZhciB1c2VyRGF0YSA9IFN0b3JlLmdldFVzZXJEYXRhKCk7XG5cdEF2YXRhckNvbnRyb2xsZXIuc2V0QXZhdGFyKHVzZXJEYXRhLnVzZXIuYXZhdGFyX3VybCk7XG5cblx0SW5mb0NvbnRyb2xsZXIuaW5pdCgpO1xufTtcblxudmFyIFBQQkEgPSB7XG5cdHNldFdpbmRvd05hbWU6IGZ1bmN0aW9uIHNldFdpbmRvd05hbWUod24pIHtcblx0XHRTdG9yZS5zZXRXaW5kb3dOYW1lKHduKTtcblx0fSxcblxuXHRzZXRDb25maWd1cmF0aW9uOiBmdW5jdGlvbiBzZXRDb25maWd1cmF0aW9uKGNvbmYpIHtcblx0XHRTdG9yZS5zZXRDb25maWd1cmF0aW9uKGNvbmYpO1xuXHR9LFxuXG5cdHNldEhUTUxUZW1wbGF0ZTogZnVuY3Rpb24gc2V0SFRNTFRlbXBsYXRlKHRlbXBsYXRlKSB7XG5cdFx0U3RvcmUuc2V0SFRNTFRlbXBsYXRlKHRlbXBsYXRlKTtcblx0fSxcblxuXHRzZXRWZXJzaW9uTnVtYmVyOiBmdW5jdGlvbiBzZXRWZXJzaW9uTnVtYmVyKHZlcnNpb24pIHtcblx0XHRTdG9yZS5zZXRWZXJzaW9uTnVtYmVyKHZlcnNpb24pO1xuXHR9LFxuXG5cdGluaXQ6IGZ1bmN0aW9uIGluaXQoY29uZikge1xuXHRcdExvZ2dlci5sb2coJ2luaXRpYWxpemluZyB3aXRoIGNvbmY6ICcsIGNvbmYpO1xuXHRcdGlmIChjb25mKSB7XG5cdFx0XHRpZiAoY29uZi5oZWFkZXJEaXZJZCkge1xuXHRcdFx0XHRTdG9yZS5zZXRIVE1MQ29udGFpbmVyKGNvbmYuaGVhZGVyRGl2SWQpO1xuXHRcdFx0fVxuXHRcdFx0aWYgKGNvbmYuYXBwc1Zpc2libGUgIT09IG51bGwpIHtcblx0XHRcdFx0U3RvcmUuc2V0QXBwc1Zpc2libGUoY29uZi5hcHBzVmlzaWJsZSk7XG5cdFx0XHR9XG5cdFx0XHRpZiAoY29uZi5yb290VXJsKSB7XG5cdFx0XHRcdFN0b3JlLnNldFJvb3RVcmwoY29uZi5yb290VXJsKTtcblx0XHRcdH1cblx0XHRcdGlmIChjb25mLmRldiA9PT0gdHJ1ZSkge1xuXHRcdFx0XHRpZiAoY29uZi5kZXZLZXlzKSB7XG5cdFx0XHRcdFx0Q2FsbGVyLnNldERldktleXMoY29uZi5kZXZLZXlzKTtcblx0XHRcdFx0XHRTdG9yZS5zZXREZXYodHJ1ZSk7XG5cdFx0XHRcdH1cblx0XHRcdH1cblx0XHRcdGlmIChjb25mLmFwcEluZm8pIHtcblx0XHRcdFx0U3RvcmUuc2V0QXBwSW5mbyhjb25mLmFwcEluZm8pO1xuXHRcdFx0fVxuXG5cdFx0XHQvKiBvcHRpb25hbCBzZXNzaW9uIHVybCAqL1xuXHRcdFx0aWYgKGNvbmYuc2Vzc2lvbkVuZHBvaW50KSB7XG5cdFx0XHRcdFN0b3JlLnNldFNlc3Npb25FbmRwb2ludChjb25mLnNlc3Npb25FbmRwb2ludCk7XG5cdFx0XHR9XG5cdFx0fVxuXHRcdHBwYmFDb25mID0gY29uZjtcblx0XHRyZXR1cm4gdHJ1ZTtcblx0fSxcblxuXHRhdXRoZW50aWNhdGU6IGZ1bmN0aW9uIGF1dGhlbnRpY2F0ZShfc3VjY2Vzcykge1xuXHRcdHZhciBzZWxmID0gUFBCQTtcblx0XHRDYWxsZXIubWFrZUNhbGwoe1xuXHRcdFx0dHlwZTogJ0dFVCcsXG5cdFx0XHRlbmRwb2ludDogU3RvcmUuZ2V0QXV0aGVudGljYXRpb25FbmRwb2ludCgpLFxuXHRcdFx0Y2FsbGJhY2tzOiB7XG5cdFx0XHRcdHN1Y2Nlc3M6IGZ1bmN0aW9uIHN1Y2Nlc3MocmVzdWx0KSB7XG5cdFx0XHRcdFx0TG9nZ2VyLmxvZyhyZXN1bHQpO1xuXHRcdFx0XHRcdFN0b3JlLnNldFVzZXJEYXRhKHJlc3VsdCk7XG5cdFx0XHRcdFx0c2VsZi5yZW5kZXIoKTtcblx0XHRcdFx0XHRQUEJBLmdldEFwcHMoKTtcblx0XHRcdFx0XHRfc3VjY2VzcyhyZXN1bHQpO1xuXHRcdFx0XHR9LFxuXHRcdFx0XHRmYWlsOiBmdW5jdGlvbiBmYWlsKGVycikge1xuXHRcdFx0XHRcdHdpbmRvdy5sb2NhdGlvbi5ocmVmID0gU3RvcmUuZ2V0TG9naW5VcmwoKTtcblx0XHRcdFx0fVxuXHRcdFx0fVxuXHRcdH0pO1xuXHR9LFxuXG5cdGF1dGhlbnRpY2F0ZVByb21pc2U6IGZ1bmN0aW9uIGF1dGhlbnRpY2F0ZVByb21pc2UoKSB7XG5cdFx0dmFyIHNlbGYgPSBQUEJBO1xuXHRcdHJldHVybiBDYWxsZXIucHJvbWlzZUNhbGwoe1xuXHRcdFx0dHlwZTogJ0dFVCcsXG5cdFx0XHRlbmRwb2ludDogU3RvcmUuZ2V0QXV0aGVudGljYXRpb25FbmRwb2ludCgpLFxuXHRcdFx0bWlkZGxld2FyZXM6IHtcblx0XHRcdFx0c3VjY2VzczogZnVuY3Rpb24gc3VjY2VzcyhyZXN1bHQpIHtcblx0XHRcdFx0XHRMb2dnZXIubG9nKHJlc3VsdCk7XG5cdFx0XHRcdFx0U3RvcmUuc2V0VXNlckRhdGEocmVzdWx0KTtcblx0XHRcdFx0XHRzZWxmLnJlbmRlcigpO1xuXHRcdFx0XHRcdFBQQkEuZ2V0QXBwcygpO1xuXHRcdFx0XHR9XG5cdFx0XHR9XG5cdFx0fSk7XG5cdH0sXG5cblx0Z2V0QXBwczogZnVuY3Rpb24gZ2V0QXBwcygpIHtcblx0XHRDYWxsZXIubWFrZUNhbGwoe1xuXHRcdFx0dHlwZTogJ0dFVCcsXG5cdFx0XHRlbmRwb2ludDogU3RvcmUuZ2V0QXBwc0VuZHBvaW50KCksXG5cdFx0XHRjYWxsYmFja3M6IHtcblx0XHRcdFx0c3VjY2VzczogZnVuY3Rpb24gc3VjY2VzcyhyZXN1bHQpIHtcblx0XHRcdFx0XHRTdG9yZS5zZXRBcHBzKHJlc3VsdCk7XG5cdFx0XHRcdFx0Ly8gUFBCQS5yZW5kZXJBcHBzKHJlc3VsdC5hcHBzKTtcblx0XHRcdFx0fSxcblx0XHRcdFx0ZmFpbDogZnVuY3Rpb24gZmFpbChlcnIpIHtcblx0XHRcdFx0XHR3aW5kb3cubG9jYXRpb24uaHJlZiA9IFN0b3JlLmdldExvZ2luVXJsKCk7XG5cdFx0XHRcdH1cblx0XHRcdH1cblx0XHR9KTtcblx0fSxcblxuXHRnZXRBdmFpbGFibGVMaXN0ZW5lcnM6IGZ1bmN0aW9uIGdldEF2YWlsYWJsZUxpc3RlbmVycygpIHtcblx0XHRyZXR1cm4gUHViU3ViLmdldEF2YWlsYWJsZUxpc3RlbmVycygpO1xuXHR9LFxuXG5cdHN1YnNjcmliZUxpc3RlbmVyOiBmdW5jdGlvbiBzdWJzY3JpYmVMaXN0ZW5lcihldmVudHQsIGZ1bmN0KSB7XG5cdFx0cmV0dXJuIFB1YlN1Yi5zdWJzY3JpYmUoZXZlbnR0LCBmdW5jdCk7XG5cdH0sXG5cblx0Z2V0VXNlckRhdGE6IGZ1bmN0aW9uIGdldFVzZXJEYXRhKCkge1xuXHRcdHJldHVybiBTdG9yZS5nZXRVc2VyRGF0YSgpO1xuXHR9LFxuXG5cdHNldElucHV0UGxhY2Vob2xkZXI6IGZ1bmN0aW9uIHNldElucHV0UGxhY2Vob2xkZXIodHh0KSB7XG5cdFx0Ly8gZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoU3RvcmUuZ2V0U2VhcmNoSW5wdXRJZCgpKS5wbGFjZWhvbGRlciA9IHR4dDtcblx0fSxcblxuXHRjaGFuZ2VBY2NvdW50OiBmdW5jdGlvbiBjaGFuZ2VBY2NvdW50KGFjY291bnRJZCkge1xuXHRcdENhbGxlci5tYWtlQ2FsbCh7XG5cdFx0XHR0eXBlOiAnR0VUJyxcblx0XHRcdGVuZHBvaW50OiBTdG9yZS5nZXRTd2l0Y2hBY2NvdW50RW5kcG9pbnQoYWNjb3VudElkKSxcblx0XHRcdGNhbGxiYWNrczoge1xuXHRcdFx0XHRzdWNjZXNzOiBmdW5jdGlvbiBzdWNjZXNzKHJlc3VsdCkge1xuXHRcdFx0XHRcdHdpbmRvdy5sb2NhdGlvbi5ocmVmID0gJy9hcHBzJztcblx0XHRcdFx0fSxcblx0XHRcdFx0ZmFpbDogZnVuY3Rpb24gZmFpbChlcnIpIHtcblx0XHRcdFx0XHRhbGVydCgnU29ycnksIHNvbWV0aGluZyB3ZW50IHdyb25nIHdpdGggeW91ciByZXF1ZXN0LiBQbGVzZSB0cnkgYWdhaW4nKTtcblx0XHRcdFx0fVxuXHRcdFx0fVxuXHRcdH0pO1xuXHR9LFxuXG5cdC8vIHJlbmRlckFwcHM6IChhcHBzKSA9PiB7XG5cdC8vICAgbGV0IGFwcFRlbXBsYXRlID0gKGFwcCkgPT4gYFxuXHQvLyBcdFx0PGEgaHJlZj1cIiNcIiBzdHlsZT1cImJhY2tncm91bmQ6ICMke2FwcC5jb2xvcn1cIj48aSBjbGFzcz1cIiR7YXBwLmljb259XCI+PC9pPjwvYT5cblx0Ly8gXHRcdDxzcGFuIGNsYXNzPVwiYmFjLS1hcHAtbmFtZVwiPiR7YXBwLm5hbWV9PC9zcGFuPlxuXHQvLyBcdFx0PHNwYW4gY2xhc3M9XCJiYWMtLWFwcC1kZXNjcmlwdGlvblwiPiR7YXBwLmRlc2NyfTwvc3Bhbj5cblx0Ly8gXHRgO1xuXHQvLyAgIGZvcihsZXQgaT0wOyBpPGFwcHMubGVuZ3RoOyBpKyspe1xuXHQvLyBcdFx0bGV0IGFwcCA9IGFwcHNbaV07XG5cdC8vIFx0XHRsZXQgZGl2ID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudChcImRpdlwiKTtcblx0Ly8gXHRcdGRpdi5jbGFzc05hbWUgPSBcImJhYy0tYXBwc1wiO1xuXHQvLyBcdFx0ZGl2LmlubmVySFRNTCA9IGFwcFRlbXBsYXRlKGFwcCk7XG5cdC8vIFx0XHRkaXYub25jbGljayA9IChlKSA9PiB7XG5cdC8vIFx0XHRcdCBlLnByZXZlbnREZWZhdWx0KCk7XG5cdC8vIFx0XHRcdCB3aW5kb3cubG9jYXRpb24uaHJlZiA9IGFwcC5hcHBsaWNhdGlvbl91cmw7XG5cdC8vIFx0XHR9XG5cdC8vIFx0XHRkb2N1bWVudC5nZXRFbGVtZW50QnlJZChcImJhYy0tcHVyZXNkay1hcHBzLWNvbnRhaW5lci0tXCIpLmFwcGVuZENoaWxkKGRpdik7XG5cdC8vICAgfVxuXHQvLyB9LFxuXG5cdHJlbmRlclVzZXI6IGZ1bmN0aW9uIHJlbmRlclVzZXIodXNlcikge1xuXHRcdHZhciB1c2VyVGVtcGxhdGUgPSBmdW5jdGlvbiB1c2VyVGVtcGxhdGUodXNlcikge1xuXHRcdFx0cmV0dXJuICdcXG5cXHRcXHRcXHRcXHQ8ZGl2IGNsYXNzPVwiYmFjLS11c2VyLWltYWdlXCIgaWQ9XCJiYWMtLXVzZXItaW1hZ2VcIj5cXG5cXHRcXHRcXHRcXHRcXHQ8aSBjbGFzcz1cImZhIGZhLWNhbWVyYVwiPjwvaT5cXG5cXHRcXHRcXHQgICBcXHQ8ZGl2IGlkPVwiYmFjLS11c2VyLWltYWdlLWZpbGVcIj48L2Rpdj5cXG5cXHRcXHRcXHQgICBcXHQ8ZGl2IGlkPVwiYmFjLS11c2VyLWltYWdlLXVwbG9hZC1wcm9ncmVzc1wiPlxcblxcdFxcdFxcdCAgIFxcdFxcdDxzdmcgd2lkdGg9XFwnNjBweFxcJyBoZWlnaHQ9XFwnNjBweFxcJyB4bWxucz1cImh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnXCIgdmlld0JveD1cIjAgMCAxMDAgMTAwXCIgcHJlc2VydmVBc3BlY3RSYXRpbz1cInhNaWRZTWlkXCIgY2xhc3M9XCJ1aWwtZGVmYXVsdFwiPjxyZWN0IHg9XCIwXCIgeT1cIjBcIiB3aWR0aD1cIjEwMFwiIGhlaWdodD1cIjEwMFwiIGZpbGw9XCJub25lXCIgY2xhc3M9XCJia1wiPjwvcmVjdD48cmVjdCAgeD1cXCc0Ni41XFwnIHk9XFwnNDBcXCcgd2lkdGg9XFwnN1xcJyBoZWlnaHQ9XFwnMjBcXCcgcng9XFwnNVxcJyByeT1cXCc1XFwnIGZpbGw9XFwnI2ZmZmZmZlxcJyB0cmFuc2Zvcm09XFwncm90YXRlKDAgNTAgNTApIHRyYW5zbGF0ZSgwIC0zMClcXCc+ICA8YW5pbWF0ZSBhdHRyaWJ1dGVOYW1lPVxcJ29wYWNpdHlcXCcgZnJvbT1cXCcxXFwnIHRvPVxcJzBcXCcgZHVyPVxcJzFzXFwnIGJlZ2luPVxcJy0xc1xcJyByZXBlYXRDb3VudD1cXCdpbmRlZmluaXRlXFwnLz48L3JlY3Q+PHJlY3QgIHg9XFwnNDYuNVxcJyB5PVxcJzQwXFwnIHdpZHRoPVxcJzdcXCcgaGVpZ2h0PVxcJzIwXFwnIHJ4PVxcJzVcXCcgcnk9XFwnNVxcJyBmaWxsPVxcJyNmZmZmZmZcXCcgdHJhbnNmb3JtPVxcJ3JvdGF0ZSgzMCA1MCA1MCkgdHJhbnNsYXRlKDAgLTMwKVxcJz4gIDxhbmltYXRlIGF0dHJpYnV0ZU5hbWU9XFwnb3BhY2l0eVxcJyBmcm9tPVxcJzFcXCcgdG89XFwnMFxcJyBkdXI9XFwnMXNcXCcgYmVnaW49XFwnLTAuOTE2NjY2NjY2NjY2NjY2NnNcXCcgcmVwZWF0Q291bnQ9XFwnaW5kZWZpbml0ZVxcJy8+PC9yZWN0PjxyZWN0ICB4PVxcJzQ2LjVcXCcgeT1cXCc0MFxcJyB3aWR0aD1cXCc3XFwnIGhlaWdodD1cXCcyMFxcJyByeD1cXCc1XFwnIHJ5PVxcJzVcXCcgZmlsbD1cXCcjZmZmZmZmXFwnIHRyYW5zZm9ybT1cXCdyb3RhdGUoNjAgNTAgNTApIHRyYW5zbGF0ZSgwIC0zMClcXCc+ICA8YW5pbWF0ZSBhdHRyaWJ1dGVOYW1lPVxcJ29wYWNpdHlcXCcgZnJvbT1cXCcxXFwnIHRvPVxcJzBcXCcgZHVyPVxcJzFzXFwnIGJlZ2luPVxcJy0wLjgzMzMzMzMzMzMzMzMzMzRzXFwnIHJlcGVhdENvdW50PVxcJ2luZGVmaW5pdGVcXCcvPjwvcmVjdD48cmVjdCAgeD1cXCc0Ni41XFwnIHk9XFwnNDBcXCcgd2lkdGg9XFwnN1xcJyBoZWlnaHQ9XFwnMjBcXCcgcng9XFwnNVxcJyByeT1cXCc1XFwnIGZpbGw9XFwnI2ZmZmZmZlxcJyB0cmFuc2Zvcm09XFwncm90YXRlKDkwIDUwIDUwKSB0cmFuc2xhdGUoMCAtMzApXFwnPiAgPGFuaW1hdGUgYXR0cmlidXRlTmFtZT1cXCdvcGFjaXR5XFwnIGZyb209XFwnMVxcJyB0bz1cXCcwXFwnIGR1cj1cXCcxc1xcJyBiZWdpbj1cXCctMC43NXNcXCcgcmVwZWF0Q291bnQ9XFwnaW5kZWZpbml0ZVxcJy8+PC9yZWN0PjxyZWN0ICB4PVxcJzQ2LjVcXCcgeT1cXCc0MFxcJyB3aWR0aD1cXCc3XFwnIGhlaWdodD1cXCcyMFxcJyByeD1cXCc1XFwnIHJ5PVxcJzVcXCcgZmlsbD1cXCcjZmZmZmZmXFwnIHRyYW5zZm9ybT1cXCdyb3RhdGUoMTIwIDUwIDUwKSB0cmFuc2xhdGUoMCAtMzApXFwnPiAgPGFuaW1hdGUgYXR0cmlidXRlTmFtZT1cXCdvcGFjaXR5XFwnIGZyb209XFwnMVxcJyB0bz1cXCcwXFwnIGR1cj1cXCcxc1xcJyBiZWdpbj1cXCctMC42NjY2NjY2NjY2NjY2NjY2c1xcJyByZXBlYXRDb3VudD1cXCdpbmRlZmluaXRlXFwnLz48L3JlY3Q+PHJlY3QgIHg9XFwnNDYuNVxcJyB5PVxcJzQwXFwnIHdpZHRoPVxcJzdcXCcgaGVpZ2h0PVxcJzIwXFwnIHJ4PVxcJzVcXCcgcnk9XFwnNVxcJyBmaWxsPVxcJyNmZmZmZmZcXCcgdHJhbnNmb3JtPVxcJ3JvdGF0ZSgxNTAgNTAgNTApIHRyYW5zbGF0ZSgwIC0zMClcXCc+ICA8YW5pbWF0ZSBhdHRyaWJ1dGVOYW1lPVxcJ29wYWNpdHlcXCcgZnJvbT1cXCcxXFwnIHRvPVxcJzBcXCcgZHVyPVxcJzFzXFwnIGJlZ2luPVxcJy0wLjU4MzMzMzMzMzMzMzMzMzRzXFwnIHJlcGVhdENvdW50PVxcJ2luZGVmaW5pdGVcXCcvPjwvcmVjdD48cmVjdCAgeD1cXCc0Ni41XFwnIHk9XFwnNDBcXCcgd2lkdGg9XFwnN1xcJyBoZWlnaHQ9XFwnMjBcXCcgcng9XFwnNVxcJyByeT1cXCc1XFwnIGZpbGw9XFwnI2ZmZmZmZlxcJyB0cmFuc2Zvcm09XFwncm90YXRlKDE4MCA1MCA1MCkgdHJhbnNsYXRlKDAgLTMwKVxcJz4gIDxhbmltYXRlIGF0dHJpYnV0ZU5hbWU9XFwnb3BhY2l0eVxcJyBmcm9tPVxcJzFcXCcgdG89XFwnMFxcJyBkdXI9XFwnMXNcXCcgYmVnaW49XFwnLTAuNXNcXCcgcmVwZWF0Q291bnQ9XFwnaW5kZWZpbml0ZVxcJy8+PC9yZWN0PjxyZWN0ICB4PVxcJzQ2LjVcXCcgeT1cXCc0MFxcJyB3aWR0aD1cXCc3XFwnIGhlaWdodD1cXCcyMFxcJyByeD1cXCc1XFwnIHJ5PVxcJzVcXCcgZmlsbD1cXCcjZmZmZmZmXFwnIHRyYW5zZm9ybT1cXCdyb3RhdGUoMjEwIDUwIDUwKSB0cmFuc2xhdGUoMCAtMzApXFwnPiAgPGFuaW1hdGUgYXR0cmlidXRlTmFtZT1cXCdvcGFjaXR5XFwnIGZyb209XFwnMVxcJyB0bz1cXCcwXFwnIGR1cj1cXCcxc1xcJyBiZWdpbj1cXCctMC40MTY2NjY2NjY2NjY2NjY3c1xcJyByZXBlYXRDb3VudD1cXCdpbmRlZmluaXRlXFwnLz48L3JlY3Q+PHJlY3QgIHg9XFwnNDYuNVxcJyB5PVxcJzQwXFwnIHdpZHRoPVxcJzdcXCcgaGVpZ2h0PVxcJzIwXFwnIHJ4PVxcJzVcXCcgcnk9XFwnNVxcJyBmaWxsPVxcJyNmZmZmZmZcXCcgdHJhbnNmb3JtPVxcJ3JvdGF0ZSgyNDAgNTAgNTApIHRyYW5zbGF0ZSgwIC0zMClcXCc+ICA8YW5pbWF0ZSBhdHRyaWJ1dGVOYW1lPVxcJ29wYWNpdHlcXCcgZnJvbT1cXCcxXFwnIHRvPVxcJzBcXCcgZHVyPVxcJzFzXFwnIGJlZ2luPVxcJy0wLjMzMzMzMzMzMzMzMzMzMzNzXFwnIHJlcGVhdENvdW50PVxcJ2luZGVmaW5pdGVcXCcvPjwvcmVjdD48cmVjdCAgeD1cXCc0Ni41XFwnIHk9XFwnNDBcXCcgd2lkdGg9XFwnN1xcJyBoZWlnaHQ9XFwnMjBcXCcgcng9XFwnNVxcJyByeT1cXCc1XFwnIGZpbGw9XFwnI2ZmZmZmZlxcJyB0cmFuc2Zvcm09XFwncm90YXRlKDI3MCA1MCA1MCkgdHJhbnNsYXRlKDAgLTMwKVxcJz4gIDxhbmltYXRlIGF0dHJpYnV0ZU5hbWU9XFwnb3BhY2l0eVxcJyBmcm9tPVxcJzFcXCcgdG89XFwnMFxcJyBkdXI9XFwnMXNcXCcgYmVnaW49XFwnLTAuMjVzXFwnIHJlcGVhdENvdW50PVxcJ2luZGVmaW5pdGVcXCcvPjwvcmVjdD48cmVjdCAgeD1cXCc0Ni41XFwnIHk9XFwnNDBcXCcgd2lkdGg9XFwnN1xcJyBoZWlnaHQ9XFwnMjBcXCcgcng9XFwnNVxcJyByeT1cXCc1XFwnIGZpbGw9XFwnI2ZmZmZmZlxcJyB0cmFuc2Zvcm09XFwncm90YXRlKDMwMCA1MCA1MCkgdHJhbnNsYXRlKDAgLTMwKVxcJz4gIDxhbmltYXRlIGF0dHJpYnV0ZU5hbWU9XFwnb3BhY2l0eVxcJyBmcm9tPVxcJzFcXCcgdG89XFwnMFxcJyBkdXI9XFwnMXNcXCcgYmVnaW49XFwnLTAuMTY2NjY2NjY2NjY2NjY2NjZzXFwnIHJlcGVhdENvdW50PVxcJ2luZGVmaW5pdGVcXCcvPjwvcmVjdD48cmVjdCAgeD1cXCc0Ni41XFwnIHk9XFwnNDBcXCcgd2lkdGg9XFwnN1xcJyBoZWlnaHQ9XFwnMjBcXCcgcng9XFwnNVxcJyByeT1cXCc1XFwnIGZpbGw9XFwnI2ZmZmZmZlxcJyB0cmFuc2Zvcm09XFwncm90YXRlKDMzMCA1MCA1MCkgdHJhbnNsYXRlKDAgLTMwKVxcJz4gIDxhbmltYXRlIGF0dHJpYnV0ZU5hbWU9XFwnb3BhY2l0eVxcJyBmcm9tPVxcJzFcXCcgdG89XFwnMFxcJyBkdXI9XFwnMXNcXCcgYmVnaW49XFwnLTAuMDgzMzMzMzMzMzMzMzMzMzNzXFwnIHJlcGVhdENvdW50PVxcJ2luZGVmaW5pdGVcXCcvPjwvcmVjdD48L3N2Zz5cXHRcXG5cXHRcXHRcXHRcXHRcXHQ8L2Rpdj5cXG5cXHRcXHRcXHQgICA8L2Rpdj5cXG5cXHRcXHRcXHRcXHQ8ZGl2IGNsYXNzPVwiYmFjLS11c2VyLW5hbWVcIj4nICsgdXNlci5maXJzdG5hbWUgKyAnICcgKyB1c2VyLmxhc3RuYW1lICsgJzwvZGl2PlxcblxcdFxcdFxcdFxcdDxkaXYgY2xhc3M9XCJiYWMtLXVzZXItZW1haWxcIj4nICsgdXNlci5lbWFpbCArICc8L2Rpdj5cXG5cXHRcXHRcXHQnO1xuXHRcdH07XG5cdFx0dmFyIGRpdiA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoJ2RpdicpO1xuXHRcdGRpdi5jbGFzc05hbWUgPSBcImJhYy0tdXNlci1zaWRlYmFyLWluZm9cIjtcblx0XHRkaXYuaW5uZXJIVE1MID0gdXNlclRlbXBsYXRlKHVzZXIpO1xuXHRcdGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKCdiYWMtLXB1cmVzZGstdXNlci1kZXRhaWxzLS0nKS5hcHBlbmRDaGlsZChkaXYpO1xuXHRcdGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKCdiYWMtLXB1cmVzZGstdXNlci1hdmF0YXItLScpLmlubmVySFRNTCA9IHVzZXIuZmlyc3RuYW1lLmNoYXJBdCgwKSArIHVzZXIubGFzdG5hbWUuY2hhckF0KDApO1xuXHR9LFxuXG5cdHJlbmRlckFjY291bnRzOiBmdW5jdGlvbiByZW5kZXJBY2NvdW50cyhhY2NvdW50cywgY3VycmVudEFjY291bnQpIHtcblx0XHQvLyBMb2dnZXIubG9nKGN1cnJlbnRBY2NvdW50KTtcblx0XHR2YXIgYWNjb3VudHNUZW1wbGF0ZSA9IGZ1bmN0aW9uIGFjY291bnRzVGVtcGxhdGUoYWNjb3VudCwgaXNUaGVTZWxlY3RlZCkge1xuXHRcdFx0cmV0dXJuICdcXG5cXHRcXHRcXHRcXHQ8ZGl2IGNsYXNzPVwiYmFjLS11c2VyLWxpc3QtaXRlbS1pbWFnZVwiPlxcblxcdFxcdFxcdFxcdFxcdDxpbWcgc3JjPVwiJyArIGFjY291bnQuc2RrX3NxdWFyZV9sb2dvX2ljb24gKyAnXCIgYWx0PVwiXCI+XFxuXFx0XFx0XFx0XFx0PC9kaXY+XFxuXFx0XFx0XFx0XFx0PGRpdiBjbGFzcz1cImJhYy11c2VyLWFwcC1kZXRhaWxzXCI+XFxuXFx0XFx0XFx0XFx0XFx0IDxzcGFuPicgKyBhY2NvdW50Lm5hbWUgKyAnPC9zcGFuPlxcblxcdFxcdFxcdFxcdDwvZGl2PlxcblxcdFxcdFxcdFxcdCcgKyAoaXNUaGVTZWxlY3RlZCA/ICc8ZGl2IGlkPVwiYmFjLS1zZWxlY3RlZC1hY291bnQtaW5kaWNhdG9yXCIgY2xhc3M9XCJiYWMtLXNlbGVjdGVkLWFjb3VudC1pbmRpY2F0b3JcIj48L2Rpdj4nIDogJycpICsgJ1xcblxcdFxcdFxcdCc7XG5cdFx0fTtcblxuXHRcdHZhciBfbG9vcCA9IGZ1bmN0aW9uIF9sb29wKGkpIHtcblx0XHRcdHZhciBhY2NvdW50ID0gYWNjb3VudHNbaV07XG5cdFx0XHR2YXIgZGl2ID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudCgnZGl2Jyk7XG5cdFx0XHRkaXYuY2xhc3NOYW1lID0gJ2JhYy0tdXNlci1saXN0LWl0ZW0nO1xuXHRcdFx0ZGl2LmlubmVySFRNTCA9IGFjY291bnRzVGVtcGxhdGUoYWNjb3VudCwgYWNjb3VudC5zZmlkID09PSBjdXJyZW50QWNjb3VudC5zZmlkKTtcblx0XHRcdGRpdi5vbmNsaWNrID0gZnVuY3Rpb24gKGUpIHtcblx0XHRcdFx0ZS5wcmV2ZW50RGVmYXVsdCgpO1xuXHRcdFx0XHRQUEJBLmNoYW5nZUFjY291bnQoYWNjb3VudC5zZmlkKTtcblx0XHRcdH07XG5cdFx0XHRkb2N1bWVudC5nZXRFbGVtZW50QnlJZCgnYmFjLS1wdXJlc2RrLXVzZXItYnVzaW5lc3Nlcy0tJykuYXBwZW5kQ2hpbGQoZGl2KTtcblx0XHR9O1xuXG5cdFx0Zm9yICh2YXIgaSA9IDA7IGkgPCBhY2NvdW50cy5sZW5ndGg7IGkrKykge1xuXHRcdFx0X2xvb3AoaSk7XG5cdFx0fVxuXHR9LFxuXG5cdHJlbmRlckluZm9CbG9ja3M6IGZ1bmN0aW9uIHJlbmRlckluZm9CbG9ja3MoKSB7XG5cdFx0dmFyIGJsb2Nrc1RlbXBsYXRlID0gZnVuY3Rpb24gYmxvY2tzVGVtcGxhdGUoaW5kZXgpIHtcblx0XHRcdHJldHVybiAnXFxuXFx0XFx0XFx0XFx0IDxkaXYgY2xhc3M9XCJiYWMtLXB1cmVzZGstaW5mby1ib3gtLVwiIGlkPVwiYmFjLS1wdXJlc2RrLWluZm8tYm94LS0nICsgaW5kZXggKyAnXCI+XFxuXFx0XFx0XFx0XFx0IFxcdDxkaXYgY2xhc3M9XCJiYWMtLXRpbWVyXCIgaWQ9XCJiYWMtLXRpbWVyJyArIGluZGV4ICsgJ1wiPjwvZGl2PlxcblxcdFxcdFxcdFxcdFxcdCA8ZGl2IGNsYXNzPVwiYmFjLS1pbm5lci1pbmZvLWJveC0tXCI+XFxuXFx0XFx0XFx0XFx0XFx0IFxcdFxcdDxkaXYgY2xhc3M9XCJiYWMtLWluZm8taWNvbi0tIGZhLXN1Y2Nlc3NcIj48L2Rpdj5cXG5cXHRcXHRcXHRcXHRcXHQgXFx0XFx0PGRpdiBjbGFzcz1cImJhYy0taW5mby1pY29uLS0gZmEtd2FybmluZ1wiPjwvZGl2PlxcblxcdFxcdFxcdFxcdFxcdCBcXHRcXHQ8ZGl2IGNsYXNzPVwiYmFjLS1pbmZvLWljb24tLSBmYS1pbmZvLTFcIj48L2Rpdj5cXG5cXHRcXHRcXHRcXHRcXHQgXFx0XFx0PGRpdiBjbGFzcz1cImJhYy0taW5mby1pY29uLS0gZmEtZXJyb3JcIj48L2Rpdj5cXG5cXHRcXHRcXHRcXHRcXHQgXFx0XFx0IDxkaXYgY2xhc3M9XCJiYWMtLWluZm8tbWFpbi10ZXh0LS1cIiBpZD1cImJhYy0taW5mby1tYWluLXRleHQtLScgKyBpbmRleCArICdcIj48L2Rpdj5cXG5cXHRcXHRcXHRcXHRcXHQgXFx0XFx0IDxkaXYgY2xhc3M9XCJiYWMtLWluZm8tY2xvc2UtYnV0dG9uLS0gZmEtY2xvc2UtMVwiIGlkPVwiYmFjLS1pbmZvLWNsb3NlLWJ1dHRvbi0tJyArIGluZGV4ICsgJ1wiPjwvZGl2PlxcblxcdFxcdFxcdFxcdFxcdDwvZGl2PlxcblxcdFxcdFxcdFxcdDwvZGl2PlxcblxcdFxcdCAgJztcblx0XHR9O1xuXG5cdFx0dmFyIGluZm9CbG9ja3NXcmFwcGVyID0gZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoJ2JhYy0taW5mby1ibG9ja3Mtd3JhcHBlci0tJyk7XG5cdFx0dmFyIGlubmVySHRtbCA9ICcnO1xuXHRcdGZvciAodmFyIGkgPSAxOyBpIDwgNTsgaSsrKSB7XG5cdFx0XHRpbm5lckh0bWwgKz0gYmxvY2tzVGVtcGxhdGUoaSk7XG5cdFx0fVxuXG5cdFx0aW5mb0Jsb2Nrc1dyYXBwZXIuaW5uZXJIVE1MID0gaW5uZXJIdG1sO1xuXHR9LFxuXG5cdHJlbmRlclZlcnNpb25OdW1iZXI6IGZ1bmN0aW9uIHJlbmRlclZlcnNpb25OdW1iZXIodmVyc2lvbikge1xuXHRcdGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKCdwdXJlc2RrLXZlcnNpb24tbnVtYmVyJykuaW5uZXJIVE1MID0gdmVyc2lvbjtcblx0fSxcblxuXHRzdHlsZUFjY291bnQ6IGZ1bmN0aW9uIHN0eWxlQWNjb3VudChhY2NvdW50KSB7XG5cdFx0dmFyIGFwcEluZm8gPSBTdG9yZS5nZXRBcHBJbmZvKCk7XG5cdFx0aWYgKGFwcEluZm8gPT09IG51bGwpIHtcblx0XHRcdHZhciBsb2dvID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudCgnaW1nJyk7XG5cdFx0XHRsb2dvLnNyYyA9IGFjY291bnQuc2RrX2xvZ29faWNvbjtcblx0XHRcdGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKCdiYWMtLXB1cmVzZGstYWNjb3VudC1sb2dvLS0nKS5hcHBlbmRDaGlsZChsb2dvKTtcblx0XHRcdGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKCdiYWMtLXB1cmVzZGstYWNjb3VudC1sb2dvLS0nKS5vbmNsaWNrID0gZnVuY3Rpb24gKGUpIHtcblx0XHRcdFx0Ly9Mb2dnZXIubG9nKFN0b3JlLmdldFJvb3RVcmwoKSk7XG5cdFx0XHRcdHdpbmRvdy5sb2NhdGlvbi5ocmVmID0gU3RvcmUuZ2V0Um9vdFVybCgpO1xuXHRcdFx0fTtcblx0XHR9IGVsc2Uge1xuXHRcdFx0dmFyIGFwcE9wZW5lclRlbXBsYXRlID0gZnVuY3Rpb24gYXBwT3BlbmVyVGVtcGxhdGUoYXBwSW5mb3JtYXRpb24pIHtcblx0XHRcdFx0cmV0dXJuICdcXG5cXHQgXFx0ICBcXHQgXFx0XFx0PGRpdiBpZD1cImJhYy0tcHVyZXNkay0tYXBwcy0tb3BlbmVyLS1cIj5cXG4gICAgICAgICAgICAgICAgICAgIDxpIGNsYXNzPVwiZmEgZmEtc3F1YXJlc1wiIGlkPVwiYmFjLS1wdXJlc2RrLWFwcHMtaWNvbi0tXCI+PC9pPlxcbiAgICAgICAgICAgICAgICAgICAgPGRpdiBpZD1cImJhYy0tcHVyZXNkay1hcHBzLW5hbWUtLVwiIGNsYXNzPVwiYmFjLS1wdXJlc2RrLWFwcHMtbmFtZS0tXCI+YXBwczwvZGl2PlxcbiAgICAgICAgICAgICAgICAgICAgPGEgaHJlZj1cIicgKyBhcHBJbmZvcm1hdGlvbi5yb290ICsgJ1wiIGlkPVwiYXBwLW5hbWUtbGluay10by1yb290XCI+JyArIGFwcEluZm9ybWF0aW9uLm5hbWUgKyAnPC9hPlxcbiAgICAgICAgICAgICAgICA8L2Rpdj5cXG5cXHQgXFx0ICBcXHQgXFx0Jztcblx0XHRcdH07XG5cdFx0XHRkb2N1bWVudC5nZXRFbGVtZW50QnlJZCgnYmFjLS1wdXJlc2RrLWFjY291bnQtbG9nby0tJykuaW5uZXJIVE1MID0gYXBwT3BlbmVyVGVtcGxhdGUoYXBwSW5mbyk7XG5cdFx0fVxuXG5cdFx0ZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoJ2JhYy0tcHVyZXNkay1iYWMtLWhlYWRlci1hcHBzLS0nKS5zdHlsZS5jc3NUZXh0ID0gXCJiYWNrZ3JvdW5kOiAjXCIgKyBhY2NvdW50LnNka19iYWNrZ3JvdW5kX2NvbG9yICsgXCI7IGNvbG9yOiAjXCIgKyBhY2NvdW50LnNka19mb250X2NvbG9yO1xuXHRcdGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKCdiYWMtLXB1cmVzZGstdXNlci1zaWRlYmFyLS0nKS5zdHlsZS5jc3NUZXh0ID0gXCJiYWNrZ3JvdW5kOiAjXCIgKyBhY2NvdW50LnNka19iYWNrZ3JvdW5kX2NvbG9yICsgXCI7IGNvbG9yOiAjXCIgKyBhY2NvdW50LnNka19mb250X2NvbG9yO1xuXHRcdGlmIChkb2N1bWVudC5nZXRFbGVtZW50QnlJZCgnYmFjLS1wdXJlc2RrLWFwcHMtbmFtZS0tJykpIHtcblx0XHRcdGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKCdiYWMtLXB1cmVzZGstYXBwcy1uYW1lLS0nKS5zdHlsZS5jc3NUZXh0ID0gXCJjb2xvcjogI1wiICsgYWNjb3VudC5zZGtfZm9udF9jb2xvcjtcblx0XHR9XG5cdFx0aWYgKGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKCdiYWMtLXNlbGVjdGVkLWFjb3VudC1pbmRpY2F0b3InKSkge1xuXHRcdFx0ZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoJ2JhYy0tc2VsZWN0ZWQtYWNvdW50LWluZGljYXRvcicpLnN0eWxlLmNzc1RleHQgPSBcImJhY2tncm91bmQ6ICNcIiArIGFjY291bnQuc2RrX2ZvbnRfY29sb3I7XG5cdFx0fVxuXHR9LFxuXG5cdGdvVG9Mb2dpblBhZ2U6IGZ1bmN0aW9uIGdvVG9Mb2dpblBhZ2UoKSB7XG5cdFx0d2luZG93LmxvY2F0aW9uLmhyZWYgPSBTdG9yZS5nZXRMb2dpblVybCgpO1xuXHR9LFxuXG5cdC8qIExPQURFUiAqL1xuXHRzaG93TG9hZGVyOiBmdW5jdGlvbiBzaG93TG9hZGVyKCkge1xuXHRcdERvbS5hZGRDbGFzcyhkb2N1bWVudC5nZXRFbGVtZW50QnlJZCgnYmFjLS1wdXJlc2RrLS1sb2FkZXItLScpLCAnYmFjLS1wdXJlc2RrLXZpc2libGUnKTtcblx0fSxcblxuXHRoaWRlTG9hZGVyOiBmdW5jdGlvbiBoaWRlTG9hZGVyKCkge1xuXHRcdERvbS5yZW1vdmVDbGFzcyhkb2N1bWVudC5nZXRFbGVtZW50QnlJZCgnYmFjLS1wdXJlc2RrLS1sb2FkZXItLScpLCAnYmFjLS1wdXJlc2RrLXZpc2libGUnKTtcblx0fSxcblxuXHRvcGVuQ2xvdWRpbmFyeVBpY2tlcjogZnVuY3Rpb24gb3BlbkNsb3VkaW5hcnlQaWNrZXIob3B0aW9ucykge1xuXHRcdENsb3VkaW5hcnkub3Blbk1vZGFsKG9wdGlvbnMpO1xuXHR9LFxuXG5cdC8qXG4gIHR5cGU6IG9uZSBvZjpcbiAgLSBzdWNjZXNzXG4gIC0gaW5mb1xuICAtIHdhcm5pbmdcbiAgLSBlcnJvclxuICB0ZXh0OiB0aGUgdGV4dCB0byBkaXNwbGF5XG4gIG9wdGlvbnMgKG9wdGlvbmFsKToge1xuICBcdFx0aGlkZUluOiBtaWxsaXNlY29uZHMgdG8gaGlkZSBpdC4gLTEgZm9yIG5vdCBoaWRpbmcgaXQgYXQgYWxsLiBEZWZhdWx0IGlzIDUwMDBcbiAgfVxuICAqL1xuXHRzZXRJbmZvOiBmdW5jdGlvbiBzZXRJbmZvKHR5cGUsIHRleHQsIG9wdGlvbnMpIHtcblx0XHRJbmZvQ29udHJvbGxlci5zaG93SW5mbyh0eXBlLCB0ZXh0LCBvcHRpb25zKTtcblx0fSxcblxuXHRyZW5kZXI6IGZ1bmN0aW9uIHJlbmRlcigpIHtcblx0XHR2YXIgd2hlcmVUbyA9IGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKFN0b3JlLmdldEhUTE1Db250YWluZXIoKSk7XG5cdFx0aWYgKHdoZXJlVG8gPT09IG51bGwpIHtcblx0XHRcdExvZ2dlci5lcnJvcigndGhlIGNvbnRhaW5lciB3aXRoIGlkIFwiJyArIHdoZXJlVG8gKyAnXCIgaGFzIG5vdCBiZWVuIGZvdW5kIG9uIHRoZSBkb2N1bWVudC4gVGhlIGxpYnJhcnkgaXMgZ29pbmcgdG8gY3JlYXRlIGl0LicpO1xuXHRcdFx0dmFyIGRpdiA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoJ2RpdicpO1xuXHRcdFx0ZGl2LmlkID0gU3RvcmUuZ2V0SFRMTUNvbnRhaW5lcigpO1xuXHRcdFx0ZGl2LnN0eWxlLndpZHRoID0gJzEwMCUnO1xuXHRcdFx0ZGl2LnN0eWxlLmhlaWdodCA9IFwiNTBweFwiO1xuXHRcdFx0ZGl2LnN0eWxlLnBvc2l0aW9uID0gXCJmaXhlZFwiO1xuXHRcdFx0ZGl2LnN0eWxlLnRvcCA9IFwiMHB4XCI7XG5cdFx0XHRkaXYuc3R5bGUuekluZGV4ID0gXCIyMTQ3NDgzNjQ3XCI7XG5cdFx0XHRkb2N1bWVudC5ib2R5Lmluc2VydEJlZm9yZShkaXYsIGRvY3VtZW50LmJvZHkuZmlyc3RDaGlsZCk7XG5cdFx0XHR3aGVyZVRvID0gZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoU3RvcmUuZ2V0SFRMTUNvbnRhaW5lcigpKTtcblx0XHR9XG5cdFx0d2hlcmVUby5pbm5lckhUTUwgPSBTdG9yZS5nZXRIVE1MKCk7XG5cdFx0UFBCQS5yZW5kZXJVc2VyKFN0b3JlLmdldFVzZXJEYXRhKCkudXNlcik7XG5cdFx0UFBCQS5yZW5kZXJJbmZvQmxvY2tzKCk7XG5cdFx0UFBCQS5yZW5kZXJBY2NvdW50cyhTdG9yZS5nZXRVc2VyRGF0YSgpLnVzZXIuYWNjb3VudHMsIFN0b3JlLmdldFVzZXJEYXRhKCkudXNlci5hY2NvdW50KTtcblx0XHRQUEJBLnN0eWxlQWNjb3VudChTdG9yZS5nZXRVc2VyRGF0YSgpLnVzZXIuYWNjb3VudCk7XG5cdFx0UFBCQS5yZW5kZXJWZXJzaW9uTnVtYmVyKFN0b3JlLmdldFZlcnNpb25OdW1iZXIoKSk7XG5cdFx0aWYgKFN0b3JlLmdldEFwcHNWaXNpYmxlKCkgPT09IGZhbHNlKSB7XG5cdFx0XHRkb2N1bWVudC5nZXRFbGVtZW50QnlJZCgnYmFjLS1wdXJlc2RrLWFwcHMtc2VjdGlvbi0tJykuc3R5bGUuY3NzVGV4dCA9IFwiZGlzcGxheTpub25lXCI7XG5cdFx0fVxuXHRcdGFmdGVyUmVuZGVyKCk7XG5cdH1cbn07XG5cbm1vZHVsZS5leHBvcnRzID0gUFBCQTsiLCIndXNlIHN0cmljdCc7XG5cbi8qIVxuICogUHVyZVByb2ZpbGUgUHVyZVByb2ZpbGUgQnVzaW5lc3MgQXBwcyBEZXZlbG9wbWVudCBTREtcbiAqXG4gKiB2ZXJzaW9uOiAyLjYuNFxuICogZGF0ZTogMjAxNy0xMC0wNVxuICpcbiAqIENvcHlyaWdodCAyMDE3LCBQdXJlUHJvZmlsZVxuICogUmVsZWFzZWQgdW5kZXIgTUlUIGxpY2Vuc2VcbiAqIGh0dHBzOi8vb3BlbnNvdXJjZS5vcmcvbGljZW5zZXMvTUlUXG4gKi9cblxudmFyIHBwYmEgPSByZXF1aXJlKCcuL1BQQkEnKTtcbnBwYmEuc2V0V2luZG93TmFtZSgnUFVSRVNESycpO1xucHBiYS5zZXRDb25maWd1cmF0aW9uKHtcbiAgICBcImxvZ3NcIjogZmFsc2UsXG4gICAgXCJyb290VXJsXCI6IFwiL1wiLFxuICAgIFwiYmFzZVVybFwiOiBcImFwaS92MS9cIixcbiAgICBcImxvZ2luVXJsXCI6IFwiYXBpL3YxL29hdXRoMlwiLFxuICAgIFwic2VhcmNoSW5wdXRJZFwiOiBcIi0tcHVyZXNkay0tc2VhcmNoLS1pbnB1dC0tXCIsXG4gICAgXCJyZWRpcmVjdFVybFBhcmFtXCI6IFwicmVkaXJlY3RfdXJsXCJcbn0pO1xucHBiYS5zZXRIVE1MVGVtcGxhdGUoJzxoZWFkZXIgY2xhc3M9XCJiYWMtLWhlYWRlci1hcHBzXCIgaWQ9XCJiYWMtLXB1cmVzZGstYmFjLS1oZWFkZXItYXBwcy0tXCI+XFxuICAgIDxkaXYgY2xhc3M9XCJiYWMtLWNvbnRhaW5lclwiPlxcbiAgICAgICAgPGRpdiBjbGFzcz1cImJhYy0tbG9nb1wiIGlkPVwiYmFjLS1wdXJlc2RrLWFjY291bnQtbG9nby0tXCI+PC9kaXY+XFxuICAgICAgICA8ZGl2IGNsYXNzPVwiYmFjLS11c2VyLWFjdGlvbnNcIj5cXG4gICAgICAgICAgICA8c3ZnIGlkPVwiYmFjLS1wdXJlc2RrLS1sb2FkZXItLVwiIHdpZHRoPVwiMzhcIiBoZWlnaHQ9XCIzOFwiIHZpZXdCb3g9XCIwIDAgNDQgNDRcIiB4bWxucz1cImh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnXCIgc3Ryb2tlPVwiI2ZmZlwiIHN0eWxlPVwiXFxuICAgIG1hcmdpbi1yaWdodDogMTBweDtcXG5cIj5cXG4gICAgICAgICAgICAgICAgPGcgZmlsbD1cIm5vbmVcIiBmaWxsLXJ1bGU9XCJldmVub2RkXCIgc3Ryb2tlLXdpZHRoPVwiMlwiPlxcbiAgICAgICAgICAgICAgICAgICAgPGNpcmNsZSBjeD1cIjIyXCIgY3k9XCIyMlwiIHI9XCIxNi42NDM3XCI+XFxuICAgICAgICAgICAgICAgICAgICAgICAgPGFuaW1hdGUgYXR0cmlidXRlTmFtZT1cInJcIiBiZWdpbj1cIjBzXCIgZHVyPVwiMS44c1wiIHZhbHVlcz1cIjE7IDIwXCIgY2FsY01vZGU9XCJzcGxpbmVcIiBrZXlUaW1lcz1cIjA7IDFcIiBrZXlTcGxpbmVzPVwiMC4xNjUsIDAuODQsIDAuNDQsIDFcIiByZXBlYXRDb3VudD1cImluZGVmaW5pdGVcIj48L2FuaW1hdGU+XFxuICAgICAgICAgICAgICAgICAgICAgICAgPGFuaW1hdGUgYXR0cmlidXRlTmFtZT1cInN0cm9rZS1vcGFjaXR5XCIgYmVnaW49XCIwc1wiIGR1cj1cIjEuOHNcIiB2YWx1ZXM9XCIxOyAwXCIgY2FsY01vZGU9XCJzcGxpbmVcIiBrZXlUaW1lcz1cIjA7IDFcIiBrZXlTcGxpbmVzPVwiMC4zLCAwLjYxLCAwLjM1NSwgMVwiIHJlcGVhdENvdW50PVwiaW5kZWZpbml0ZVwiPjwvYW5pbWF0ZT5cXG4gICAgICAgICAgICAgICAgICAgIDwvY2lyY2xlPlxcbiAgICAgICAgICAgICAgICAgICAgPGNpcmNsZSBjeD1cIjIyXCIgY3k9XCIyMlwiIHI9XCIxOS45MjgyXCI+XFxuICAgICAgICAgICAgICAgICAgICAgICAgPGFuaW1hdGUgYXR0cmlidXRlTmFtZT1cInJcIiBiZWdpbj1cImJhYy0wLjlzXCIgZHVyPVwiMS44c1wiIHZhbHVlcz1cIjE7IDIwXCIgY2FsY01vZGU9XCJzcGxpbmVcIiBrZXlUaW1lcz1cIjA7IDFcIiBrZXlTcGxpbmVzPVwiMC4xNjUsIDAuODQsIDAuNDQsIDFcIiByZXBlYXRDb3VudD1cImluZGVmaW5pdGVcIj48L2FuaW1hdGU+XFxuICAgICAgICAgICAgICAgICAgICAgICAgPGFuaW1hdGUgYXR0cmlidXRlTmFtZT1cInN0cm9rZS1vcGFjaXR5XCIgYmVnaW49XCJiYWMtMC45c1wiIGR1cj1cIjEuOHNcIiB2YWx1ZXM9XCIxOyAwXCIgY2FsY01vZGU9XCJzcGxpbmVcIiBrZXlUaW1lcz1cIjA7IDFcIiBrZXlTcGxpbmVzPVwiMC4zLCAwLjYxLCAwLjM1NSwgMVwiIHJlcGVhdENvdW50PVwiaW5kZWZpbml0ZVwiPjwvYW5pbWF0ZT5cXG4gICAgICAgICAgICAgICAgICAgIDwvY2lyY2xlPlxcbiAgICAgICAgICAgICAgICA8L2c+XFxuICAgICAgICAgICAgPC9zdmc+XFxuICAgICAgICAgICAgPGRpdiBjbGFzcz1cImJhYy0tdXNlci1hcHBzXCIgaWQ9XCJiYWMtLXB1cmVzZGstYXBwcy1zZWN0aW9uLS1cIj5cXG4gICAgICAgICAgICAgICAgPCEtLTxkaXYgaWQ9XCJiYWMmIzQ1OyYjNDU7cHVyZXNkayYjNDU7JiM0NTthcHBzJiM0NTsmIzQ1O29wZW5lciYjNDU7JiM0NTtcIj4tLT5cXG4gICAgICAgICAgICAgICAgICAgIDwhLS08aSBjbGFzcz1cImZhIGZhLXNxdWFyZXNcIiBpZD1cImJhYyYjNDU7JiM0NTtwdXJlc2RrLWFwcHMtaWNvbiYjNDU7JiM0NTtcIj48L2k+LS0+XFxuICAgICAgICAgICAgICAgICAgICA8IS0tPGRpdiBjbGFzcz1cImJhYyYjNDU7JiM0NTtwdXJlc2RrLWFwcHMtbmFtZSYjNDU7JiM0NTtcIj5hcHBzPC9kaXY+LS0+XFxuICAgICAgICAgICAgICAgIDwhLS08L2Rpdj4tLT5cXG4gICAgICAgICAgICAgICAgPCEtLTxkaXYgY2xhc3M9XCJiYWMmIzQ1OyYjNDU7YXBwcy1jb250YWluZXJcIiBpZD1cImJhYyYjNDU7JiM0NTtwdXJlc2RrLWFwcHMtY29udGFpbmVyJiM0NTsmIzQ1O1wiPi0tPlxcbiAgICAgICAgICAgICAgICAgICAgPCEtLTxkaXYgY2xhc3M9XCJiYWMmIzQ1OyYjNDU7YXBwcy1hcnJvd1wiPjwvZGl2Pi0tPlxcbiAgICAgICAgICAgICAgICA8IS0tPC9kaXY+LS0+XFxuICAgICAgICAgICAgPC9kaXY+XFxuICAgICAgICAgICAgPCEtLTxkaXYgY2xhc3M9XCJiYWMmIzQ1OyYjNDU7dXNlci1ub3RpZmljYXRpb25zXCI+LS0+XFxuICAgICAgICAgICAgICAgIDwhLS08ZGl2IGNsYXNzPVwiYmFjJiM0NTsmIzQ1O3VzZXItbm90aWZpY2F0aW9ucy1jb3VudFwiPjE8L2Rpdj4tLT5cXG4gICAgICAgICAgICAgICAgPCEtLTxpIGNsYXNzPVwiZmEgZmEtYmVsbC1vXCI+PC9pPi0tPlxcbiAgICAgICAgICAgIDwhLS08L2Rpdj4tLT5cXG4gICAgICAgICAgICA8ZGl2IGNsYXNzPVwiYmFjLS11c2VyLWF2YXRhclwiIGlkPVwiYmFjLS11c2VyLWF2YXRhci10b3BcIj5cXG4gICAgICAgICAgICAgICAgPHNwYW4gY2xhc3M9XCJiYWMtLXVzZXItYXZhdGFyLW5hbWVcIiBpZD1cImJhYy0tcHVyZXNkay11c2VyLWF2YXRhci0tXCI+PC9zcGFuPlxcbiAgICAgICAgICAgICAgICA8ZGl2IGlkPVwiYmFjLS1pbWFnZS1jb250YWluZXItdG9wXCI+PC9kaXY+XFxuICAgICAgICAgICAgPC9kaXY+XFxuICAgICAgICA8L2Rpdj5cXG4gICAgPC9kaXY+XFxuICAgIDxkaXYgaWQ9XCJiYWMtLWluZm8tYmxvY2tzLXdyYXBwZXItLVwiPjwvZGl2PlxcbjwvaGVhZGVyPlxcbjxkaXYgY2xhc3M9XCJiYWMtLXVzZXItc2lkZWJhclwiIGlkPVwiYmFjLS1wdXJlc2RrLXVzZXItc2lkZWJhci0tXCI+XFxuICAgIDxkaXYgaWQ9XCJiYWMtLXB1cmVzZGstdXNlci1kZXRhaWxzLS1cIj48L2Rpdj5cXG4gICAgPCEtLTxkaXYgY2xhc3M9XCJiYWMmIzQ1OyYjNDU7dXNlci1zaWRlYmFyLWluZm9cIj4tLT5cXG4gICAgICAgIDwhLS08ZGl2IGNsYXNzPVwiYmFjJiM0NTsmIzQ1O3VzZXItaW1hZ2VcIj48aSBjbGFzcz1cImZhIGZhLWNhbWVyYVwiPjwvaT48L2Rpdj4tLT5cXG4gICAgICAgIDwhLS08ZGl2IGNsYXNzPVwiYmFjJiM0NTsmIzQ1O3VzZXItbmFtZVwiPkN1cnRpcyBCYXJ0bGV0dDwvZGl2Pi0tPlxcbiAgICAgICAgPCEtLTxkaXYgY2xhc3M9XCJiYWMmIzQ1OyYjNDU7dXNlci1lbWFpbFwiPmNiYXJ0bGV0dEBwdXJlcHJvZmlsZS5jb208L2Rpdj4tLT5cXG4gICAgPCEtLTwvZGl2Pi0tPlxcbiAgICA8ZGl2IGNsYXNzPVwiYmFjLS11c2VyLWFwcHNcIiBpZD1cImJhYy0tcHVyZXNkay11c2VyLWJ1c2luZXNzZXMtLVwiPlxcbiAgICAgICAgPCEtLTxkaXYgY2xhc3M9XCJiYWMmIzQ1OyYjNDU7dXNlci1saXN0LWl0ZW1cIj4tLT5cXG4gICAgICAgICAgICA8IS0tPGltZyBzcmM9XCJodHRwOi8vbG9yZW1waXhlbC5jb20vNDAvNDBcIiBhbHQ9XCJcIj4tLT5cXG4gICAgICAgICAgICA8IS0tPGRpdiBjbGFzcz1cImJhYy11c2VyLWFwcC1kZXRhaWxzXCI+LS0+XFxuICAgICAgICAgICAgICAgIDwhLS08c3Bhbj48L3NwYW4+LS0+XFxuICAgICAgICAgICAgICAgIDwhLS08c3Bhbj4xNSB0ZWFtIG1lbWJlcnM8L3NwYW4+LS0+XFxuICAgICAgICAgICAgPCEtLTwvZGl2Pi0tPlxcbiAgICAgICAgPCEtLTwvZGl2Pi0tPlxcbiAgICA8L2Rpdj5cXG4gICAgPGRpdiBjbGFzcz1cImJhYy0tdXNlci1hY2NvdW50LXNldHRpbmdzXCI+XFxuICAgICAgICA8IS0tPGRpdiBjbGFzcz1cImJhYy11c2VyLWFjb3VudC1saXN0LWl0ZW1cIj4tLT5cXG4gICAgICAgICAgICA8IS0tPGkgY2xhc3M9XCJmYSBmYS1jb2ctbGluZVwiPjwvaT4tLT5cXG4gICAgICAgICAgICA8IS0tPGEgaHJlZj1cIiNcIj5BY2NvdW50IFNlY3VyaXR5PC9hPi0tPlxcbiAgICAgICAgPCEtLTwvZGl2Pi0tPlxcbiAgICAgICAgPGRpdiBjbGFzcz1cImJhYy11c2VyLWFjb3VudC1saXN0LWl0ZW1cIj5cXG4gICAgICAgICAgICA8aSBjbGFzcz1cImZhIGZhLWxvZ2luLWxpbmVcIj48L2k+XFxuICAgICAgICAgICAgPGEgaHJlZj1cIi9hcGkvdjEvc2lnbi1vZmZcIj5Mb2cgb3V0PC9hPlxcbiAgICAgICAgPC9kaXY+XFxuXFxuICAgICAgICA8ZGl2IGlkPVwicHVyZXNkay12ZXJzaW9uLW51bWJlclwiIGNsYXNzPVwicHVyZXNkay12ZXJzaW9uLW51bWJlclwiPjwvZGl2PlxcbiAgICA8L2Rpdj5cXG48L2Rpdj5cXG5cXG5cXG48ZGl2IGNsYXNzPVwiYmFjLS1jdXN0b20tbW9kYWwgYWRkLXF1ZXN0aW9uLW1vZGFsIC0taXMtb3BlblwiIGlkPVwiYmFjLS1jbG91ZGluYXJ5LS1tb2RhbFwiPlxcbiAgICA8ZGl2IGNsYXNzPVwiY3VzdG9tLW1vZGFsX193cmFwcGVyXCI+XFxuICAgICAgICA8ZGl2IGNsYXNzPVwiY3VzdG9tLW1vZGFsX19jb250ZW50XCI+XFxuICAgICAgICAgICAgPGgzPkFkZCBpbWFnZTwvaDM+XFxuICAgICAgICAgICAgPGEgY2xhc3M9XCJjdXN0b20tbW9kYWxfX2Nsb3NlLWJ0blwiIGlkPVwiYmFjLS1jbG91ZGluYXJ5LS1jbG9zZWJ0blwiPjxpIGNsYXNzPVwiZmEgZmEtdGltZXMtY2lyY2xlXCI+PC9pPjwvYT5cXG4gICAgICAgIDwvZGl2PlxcblxcbiAgICAgICAgPGRpdiBjbGFzcz1cImN1c3RvbS1tb2RhbF9fY29udGVudFwiPlxcbiAgICAgICAgICAgIDxkaXYgY2xhc3M9XCJiYWMtc2VhcmNoIC0taWNvbi1sZWZ0XCI+XFxuICAgICAgICAgICAgICAgIDxpbnB1dCBpZD1cImJhYy0tY2xvdWRpbmFyeS0tc2VhcmNoLWlucHV0XCIgdHlwZT1cInNlYXJjaFwiIG5hbWU9XCJzZWFyY2hcIiBwbGFjZWhvbGRlcj1cIlNlYXJjaCBmb3IgaW1hZ2VzLi4uXCIvPlxcbiAgICAgICAgICAgICAgICA8ZGl2IGNsYXNzPVwiYmFjLXNlYXJjaF9faWNvblwiPjxpIGNsYXNzPVwiZmEgZmEtc2VhcmNoXCI+PC9pPjwvZGl2PlxcbiAgICAgICAgICAgIDwvZGl2PlxcbiAgICAgICAgICAgIDxici8+XFxuXFxuICAgICAgICAgICAgPGRpdiBjbGFzcz1cImJhY2stYnV0dG9uXCIgaWQ9XCJiYWMtLWNsb3VkaW5hcnktLWJhY2stYnV0dG9uLWNvbnRhaW5lclwiPlxcbiAgICAgICAgICAgICAgICA8YSBjbGFzcz1cImdvQmFja1wiIGlkPVwiYmFjLS1jbG91ZGluYXJ5LS1nby1iYWNrXCI+PGkgY2xhc3M9XCJmYSBmYS1hbmdsZS1sZWZ0XCI+PC9pPkdvIEJhY2s8L2E+XFxuICAgICAgICAgICAgPC9kaXY+XFxuXFxuICAgICAgICAgICAgPGJyLz5cXG4gICAgICAgICAgICA8ZGl2IGNsYXNzPVwiY2xvdWQtaW1hZ2VzXCI+XFxuICAgICAgICAgICAgICAgIDxkaXYgY2xhc3M9XCJjbG91ZC1pbWFnZXNfX2NvbnRhaW5lclwiIGlkPVwiYmFjLS1jbG91ZGluYXJ5LWl0YW1zLWNvbnRhaW5lclwiPjwvZGl2PlxcblxcbiAgICAgICAgICAgICAgICA8ZGl2IGNsYXNzPVwiY2xvdWQtaW1hZ2VzX19wYWdpbmF0aW9uXCIgaWQ9XCJiYWMtLWNsb3VkaW5hcnktcGFnaW5hdGlvbi1jb250YWluZXJcIj5cXG4gICAgICAgICAgICAgICAgICAgIDx1bCBpZD1cImJhYy0tY2xvdWRpbmFyeS1hY3R1YWwtcGFnaW5hdGlvbi1jb250YWluZXJcIj48L3VsPlxcbiAgICAgICAgICAgICAgICA8L2Rpdj5cXG5cXG4gICAgICAgICAgICA8L2Rpdj5cXG4gICAgICAgIDwvZGl2PlxcbiAgICA8L2Rpdj5cXG48L2Rpdj5cXG5cXG48aW5wdXQgc3R5bGU9XCJkaXNwbGF5Om5vbmVcIiB0eXBlPVxcJ2ZpbGVcXCcgaWQ9XFwnYmFjLS0tcHVyZXNkay1hdmF0YXItZmlsZVxcJz5cXG48aW5wdXQgc3R5bGU9XCJkaXNwbGF5Om5vbmVcIiB0eXBlPVxcJ2J1dHRvblxcJyBpZD1cXCdiYWMtLS1wdXJlc2RrLWF2YXRhci1zdWJtaXRcXCcgdmFsdWU9XFwnVXBsb2FkIVxcJz4nKTtcbnBwYmEuc2V0VmVyc2lvbk51bWJlcignMi42LjQnKTtcblxud2luZG93LlBVUkVTREsgPSBwcGJhO1xuXG52YXIgY3NzID0gJ2h0bWwsYm9keSxkaXYsc3BhbixhcHBsZXQsb2JqZWN0LGlmcmFtZSxoMSxoMixoMyxoNCxoNSxoNixwLGJsb2NrcXVvdGUscHJlLGEsYWJicixhY3JvbnltLGFkZHJlc3MsYmlnLGNpdGUsY29kZSxkZWwsZGZuLGVtLGltZyxpbnMsa2JkLHEscyxzYW1wLHNtYWxsLHN0cmlrZSxzdHJvbmcsc3ViLHN1cCx0dCx2YXIsYix1LGksY2VudGVyLGRsLGR0LGRkLG9sLHVsLGxpLGZpZWxkc2V0LGZvcm0sbGFiZWwsbGVnZW5kLHRhYmxlLGNhcHRpb24sdGJvZHksdGZvb3QsdGhlYWQsdHIsdGgsdGQsYXJ0aWNsZSxhc2lkZSxjYW52YXMsZGV0YWlscyxlbWJlZCxmaWd1cmUsZmlnY2FwdGlvbixmb290ZXIsaGVhZGVyLGhncm91cCxtZW51LG5hdixvdXRwdXQscnVieSxzZWN0aW9uLHN1bW1hcnksdGltZSxtYXJrLGF1ZGlvLHZpZGVve21hcmdpbjowO3BhZGRpbmc6MDtib3JkZXI6MDtmb250LXNpemU6MTAwJTtmb250OmluaGVyaXQ7dmVydGljYWwtYWxpZ246YmFzZWxpbmV9YXJ0aWNsZSxhc2lkZSxkZXRhaWxzLGZpZ2NhcHRpb24sZmlndXJlLGZvb3RlcixoZWFkZXIsaGdyb3VwLG1lbnUsbmF2LHNlY3Rpb257ZGlzcGxheTpibG9ja31ib2R5e2xpbmUtaGVpZ2h0OjF9b2wsdWx7bGlzdC1zdHlsZTpub25lfWJsb2NrcXVvdGUscXtxdW90ZXM6bm9uZX1ibG9ja3F1b3RlOmJlZm9yZSxibG9ja3F1b3RlOmFmdGVyLHE6YmVmb3JlLHE6YWZ0ZXJ7Y29udGVudDpcIlwiO2NvbnRlbnQ6bm9uZX10YWJsZXtib3JkZXItY29sbGFwc2U6Y29sbGFwc2U7Ym9yZGVyLXNwYWNpbmc6MH1ib2R5e292ZXJmbG93LXg6aGlkZGVufSNiYWMtd3JhcHBlcntmb250LWZhbWlseTpcIlZlcmRhbmFcIiwgYXJpYWwsIHNhbnMtc2VyaWY7Y29sb3I6d2hpdGU7bWluLWhlaWdodDoxMDB2aDtwb3NpdGlvbjpyZWxhdGl2ZX0uYmFjLS1jb250YWluZXJ7bWF4LXdpZHRoOjExNjBweDttYXJnaW46MCBhdXRvfS5iYWMtLWNvbnRhaW5lciAjYXBwLW5hbWUtbGluay10by1yb290e2Rpc3BsYXk6YmxvY2s7cG9zaXRpb246YWJzb2x1dGU7bGVmdDo2NXB4O3RvcDo0cHg7Zm9udC1zaXplOjEuNGVtO3dpZHRoOjE1MHB4O2NvbG9yOndoaXRlO3RleHQtZGVjb3JhdGlvbjpub25lfS5iYWMtLWhlYWRlci1hcHBze3Bvc2l0aW9uOmFic29sdXRlO3dpZHRoOjEwMCU7aGVpZ2h0OjUwcHg7YmFja2dyb3VuZC1jb2xvcjojNDc1MzY5O3BhZGRpbmc6NXB4IDEwcHg7ei1pbmRleDo5OTk5OTk5fS5iYWMtLWhlYWRlci1hcHBzIC5iYWMtLWNvbnRhaW5lcntoZWlnaHQ6MTAwJTtkaXNwbGF5OmZsZXg7YWxpZ24taXRlbXM6Y2VudGVyO2p1c3RpZnktY29udGVudDpzcGFjZS1iZXR3ZWVufS5iYWMtLWhlYWRlci1zZWFyY2h7cG9zaXRpb246cmVsYXRpdmV9LmJhYy0taGVhZGVyLXNlYXJjaCBpbnB1dHtjb2xvcjojZmZmO2ZvbnQtc2l6ZToxNHB4O2hlaWdodDozNXB4O2JhY2tncm91bmQtY29sb3I6IzZiNzU4NjtwYWRkaW5nOjAgNXB4IDAgMTBweDtib3JkZXI6bm9uZTtib3JkZXItcmFkaXVzOjNweDttaW4td2lkdGg6NDAwcHg7d2lkdGg6MTAwJX0uYmFjLS1oZWFkZXItc2VhcmNoIGlucHV0OmZvY3Vze291dGxpbmU6bm9uZX0uYmFjLS1oZWFkZXItc2VhcmNoIGlucHV0Ojotd2Via2l0LWlucHV0LXBsYWNlaG9sZGVye2ZvbnQtc3R5bGU6bm9ybWFsICFpbXBvcnRhbnQ7dGV4dC1hbGlnbjpjZW50ZXI7Y29sb3I6I2ZmZjtmb250LXNpemU6MTRweDtmb250LXdlaWdodDozMDA7bGV0dGVyLXNwYWNpbmc6MC41cHh9LmJhYy0taGVhZGVyLXNlYXJjaCBpbnB1dDo6LW1vei1wbGFjZWhvbGRlcntmb250LXN0eWxlOm5vcm1hbCAhaW1wb3J0YW50O3RleHQtYWxpZ246Y2VudGVyO2NvbG9yOiNmZmY7Zm9udC1zaXplOjE0cHg7Zm9udC13ZWlnaHQ6MzAwO2xldHRlci1zcGFjaW5nOjAuNXB4fS5iYWMtLWhlYWRlci1zZWFyY2ggaW5wdXQ6LW1zLWlucHV0LXBsYWNlaG9sZGVye2ZvbnQtc3R5bGU6bm9ybWFsICFpbXBvcnRhbnQ7dGV4dC1hbGlnbjpjZW50ZXI7Y29sb3I6I2ZmZjtmb250LXNpemU6MTRweDtmb250LXdlaWdodDozMDA7bGV0dGVyLXNwYWNpbmc6MC41cHh9LmJhYy0taGVhZGVyLXNlYXJjaCBpe3Bvc2l0aW9uOmFic29sdXRlO3RvcDo4cHg7cmlnaHQ6MTBweH0uYmFjLS11c2VyLWFjdGlvbnN7ZGlzcGxheTpmbGV4O2FsaWduLWl0ZW1zOmNlbnRlcn0uYmFjLS11c2VyLWFjdGlvbnM+ZGl2e2N1cnNvcjpwb2ludGVyO2NvbG9yOndoaXRlfS5iYWMtLXVzZXItYWN0aW9ucyAuYmFjLS11c2VyLW5vdGlmaWNhdGlvbnN7cG9zaXRpb246cmVsYXRpdmV9LmJhYy0tdXNlci1hY3Rpb25zIC5iYWMtLXVzZXItbm90aWZpY2F0aW9ucyBpe2ZvbnQtc2l6ZToyMHB4fS5iYWMtLXVzZXItYWN0aW9ucyAjYmFjLS1wdXJlc2RrLS1sb2FkZXItLXtkaXNwbGF5Om5vbmV9LmJhYy0tdXNlci1hY3Rpb25zICNiYWMtLXB1cmVzZGstLWxvYWRlci0tLmJhYy0tcHVyZXNkay12aXNpYmxle2Rpc3BsYXk6YmxvY2t9LmJhYy0tdXNlci1hY3Rpb25zIC5iYWMtLXVzZXItbm90aWZpY2F0aW9ucy1jb3VudHtwb3NpdGlvbjphYnNvbHV0ZTtkaXNwbGF5OmlubGluZS1ibG9jaztoZWlnaHQ6MTVweDt3aWR0aDoxNXB4O2xpbmUtaGVpZ2h0OjE1cHg7Y29sb3I6I2ZmZjtmb250LXNpemU6MTBweDt0ZXh0LWFsaWduOmNlbnRlcjtiYWNrZ3JvdW5kLWNvbG9yOiNmYzNiMzA7Ym9yZGVyLXJhZGl1czo1MCU7dG9wOi01cHg7bGVmdDotNXB4fS5iYWMtLXVzZXItYWN0aW9ucyAuYmFjLS11c2VyLWF2YXRhciwuYmFjLS11c2VyLWFjdGlvbnMgLmJhYy0tdXNlci1ub3RpZmljYXRpb25ze21hcmdpbi1sZWZ0OjIwcHh9LmJhYy0tdXNlci1hY3Rpb25zIC5iYWMtLXVzZXItYXZhdGFye3Bvc2l0aW9uOnJlbGF0aXZlO292ZXJmbG93OmhpZGRlbjtib3JkZXItcmFkaXVzOjUwJX0uYmFjLS11c2VyLWFjdGlvbnMgLmJhYy0tdXNlci1hdmF0YXIgI2JhYy0taW1hZ2UtY29udGFpbmVyLXRvcHt3aWR0aDoxMDAlO2hlaWd0aDoxMDAlO3Bvc2l0aW9uOmFic29sdXRlO3RvcDowO2xlZnQ6MDt6LWluZGV4OjE7ZGlzcGxheTpub25lfS5iYWMtLXVzZXItYWN0aW9ucyAuYmFjLS11c2VyLWF2YXRhciAjYmFjLS1pbWFnZS1jb250YWluZXItdG9wIGltZ3t3aWR0aDoxMDAlO2hlaWdodDoxMDAlfS5iYWMtLXVzZXItYWN0aW9ucyAuYmFjLS11c2VyLWF2YXRhciAjYmFjLS1pbWFnZS1jb250YWluZXItdG9wLmJhYy0tcHVyZXNkay12aXNpYmxle2Rpc3BsYXk6YmxvY2t9LmJhYy0tdXNlci1hY3Rpb25zIC5iYWMtLXVzZXItYXZhdGFyLW5hbWV7Y29sb3I6I2ZmZjtiYWNrZ3JvdW5kLWNvbG9yOiNhZGFkYWQ7ZGlzcGxheTppbmxpbmUtYmxvY2s7aGVpZ2h0OjM1cHg7d2lkdGg6MzVweDtsaW5lLWhlaWdodDozNXB4O3RleHQtYWxpZ246Y2VudGVyO2ZvbnQtc2l6ZToxNHB4fS5iYWMtLXVzZXItYXBwc3twb3NpdGlvbjpyZWxhdGl2ZX0jYmFjLS1wdXJlc2RrLWFwcHMtaWNvbi0te3dpZHRoOjIwcHg7ZGlzcGxheTppbmxpbmUtYmxvY2s7dGV4dC1hbGlnbjpjZW50ZXI7Zm9udC1zaXplOjE2cHh9LmJhYy0tcHVyZXNkay1hcHBzLW5hbWUtLXtmb250LXNpemU6OXB4O3dpZHRoOjIwcHg7dGV4dC1hbGlnbjpjZW50ZXJ9I2JhYy0tcHVyZXNkay11c2VyLWJ1c2luZXNzZXMtLXtoZWlnaHQ6Y2FsYygxMDB2aCAtIDQ1OHB4KTtvdmVyZmxvdzphdXRvfS5iYWMtLWFwcHMtY29udGFpbmVye2JhY2tncm91bmQ6I2ZmZjtwb3NpdGlvbjphYnNvbHV0ZTt0b3A6NDVweDtyaWdodDotNDBweDtkaXNwbGF5OmZsZXg7d2lkdGg6MzYwcHg7ZmxleC13cmFwOndyYXA7Ym9yZGVyLXJhZGl1czoxMHB4O3BhZGRpbmc6MzBweDtqdXN0aWZ5LWNvbnRlbnQ6c3BhY2UtYmV0d2Vlbjt0ZXh0LWFsaWduOmNlbnRlcjstd2Via2l0LWJveC1zaGFkb3c6MCAwIDEwcHggMnB4IHJnYmEoMCwwLDAsMC4yKTtib3gtc2hhZG93OjAgMCAxMHB4IDJweCByZ2JhKDAsMCwwLDAuMik7b3BhY2l0eTowO3Zpc2liaWxpdHk6aGlkZGVuO3RyYW5zaXRpb246YWxsIDAuNHMgZWFzZTttYXgtaGVpZ2h0OjU2NnB4O292ZXJmbG93OmF1dG99LmJhYy0tYXBwcy1jb250YWluZXIuYWN0aXZle29wYWNpdHk6MTt2aXNpYmlsaXR5OnZpc2libGV9LmJhYy0tYXBwcy1jb250YWluZXIgLmJhYy0tYXBwcy1hcnJvd3twb3NpdGlvbjphYnNvbHV0ZTtkaXNwbGF5OmJsb2NrO2hlaWdodDoyMHB4O3dpZHRoOjIwcHg7dG9wOi0xMHB4O3JpZ2h0OjM2cHg7YmFja2dyb3VuZDojZmZmO3RyYW5zZm9ybTpyb3RhdGUoLTQ1ZGVnKTt6LWluZGV4OjF9LmJhYy0tYXBwcy1jb250YWluZXIgLmJhYy0tYXBwc3t3aWR0aDozMiU7ZGlzcGxheTpmbGV4O2ZvbnQtc2l6ZTozMHB4O21hcmdpbi1ib3R0b206NDBweDt0ZXh0LWFsaWduOmNlbnRlcjtqdXN0aWZ5LWNvbnRlbnQ6Y2VudGVyO2ZsZXgtd3JhcDp3cmFwfS5iYWMtLWFwcHMtY29udGFpbmVyIC5iYWMtLWFwcHMgYXtkaXNwbGF5OmJsb2NrO2NvbG9yOiNmZmY7dGV4dC1kZWNvcmF0aW9uOm5vbmU7d2lkdGg6NjVweDtoZWlnaHQ6NjVweDtwYWRkaW5nLXRvcDozcHg7bGluZS1oZWlnaHQ6NjVweDt0ZXh0LWFsaWduOmNlbnRlcjtib3JkZXItcmFkaXVzOjEwcHg7LXdlYmtpdC1ib3gtc2hhZG93OjAgMCA1cHggMCByZ2JhKDAsMCwwLDAuMik7Ym94LXNoYWRvdzowIDAgNXB4IDAgcmdiYSgwLDAsMCwwLjIpfS5iYWMtLWFwcHMtY29udGFpbmVyIC5iYWMtLWFwcHMgLmJhYy0tYXBwLW5hbWV7d2lkdGg6MTAwJTtjb2xvcjojMDAwO2ZvbnQtc2l6ZToxNHB4O3BhZGRpbmc6MTBweCAwIDVweCAwfS5iYWMtLWFwcHMtY29udGFpbmVyIC5iYWMtLWFwcHMgLmJhYy0tYXBwLWRlc2NyaXB0aW9ue2NvbG9yOiM5MTkxOTE7Zm9udC1zaXplOjEycHg7Zm9udC1zdHlsZTppdGFsaWM7bGluZS1oZWlnaHQ6MS4zZW19LmJhYy0tdXNlci1zaWRlYmFye2ZvbnQtZmFtaWx5OlwiVmVyZGFuYVwiLCBhcmlhbCwgc2Fucy1zZXJpZjtjb2xvcjp3aGl0ZTtoZWlnaHQ6Y2FsYygxMDB2aCAtIDUwcHgpO2JhY2tncm91bmQtY29sb3I6IzUxNWY3Nztib3gtc2l6aW5nOmJvcmRlci1ib3g7d2lkdGg6MzIwcHg7cG9zaXRpb246Zml4ZWQ7dG9wOjUwcHg7cmlnaHQ6MDt6LWluZGV4Ojk5OTk5OTtwYWRkaW5nLXRvcDoxMHB4O29wYWNpdHk6MDt0cmFuc2Zvcm06dHJhbnNsYXRlWCgxMDAlKTt0cmFuc2l0aW9uOmFsbCAwLjRzIGVhc2V9LmJhYy0tdXNlci1zaWRlYmFyLmFjdGl2ZXtvcGFjaXR5OjE7dHJhbnNmb3JtOnRyYW5zbGF0ZVgoMCUpOy13ZWJraXQtYm94LXNoYWRvdzotMXB4IDBweCAxMnB4IDBweCByZ2JhKDAsMCwwLDAuNzUpOy1tb3otYm94LXNoYWRvdzotMXB4IDNweCAxMnB4IDBweCByZ2JhKDAsMCwwLDAuNzUpO2JveC1zaGFkb3c6LTFweCAwcHggMTJweCAwcHggcmdiYSgwLDAsMCwwLjc1KX0uYmFjLS11c2VyLXNpZGViYXIgLmJhYy0tdXNlci1saXN0LWl0ZW17ZGlzcGxheTpmbGV4O3Bvc2l0aW9uOnJlbGF0aXZlO2N1cnNvcjpwb2ludGVyO2FsaWduLWl0ZW1zOmNlbnRlcjtwYWRkaW5nOjEwcHggMTBweCAxMHB4IDQwcHg7Ym9yZGVyLWJvdHRvbToxcHggc29saWQgcmdiYSgyNTUsMjU1LDI1NSwwLjEpfS5iYWMtLXVzZXItc2lkZWJhciAuYmFjLS11c2VyLWxpc3QtaXRlbTpob3ZlcntiYWNrZ3JvdW5kLWNvbG9yOnJnYmEoMjU1LDI1NSwyNTUsMC4xKX0uYmFjLS11c2VyLXNpZGViYXIgLmJhYy0tdXNlci1saXN0LWl0ZW0gLmJhYy0tc2VsZWN0ZWQtYWNvdW50LWluZGljYXRvcntwb3NpdGlvbjphYnNvbHV0ZTtyaWdodDowO2hlaWdodDoxMDAlO3dpZHRoOjhweH0uYmFjLS11c2VyLXNpZGViYXIgLmJhYy0tdXNlci1saXN0LWl0ZW0gLmJhYy0tdXNlci1saXN0LWl0ZW0taW1hZ2V7d2lkdGg6NDBweDtoZWlnaHQ6NDBweDtib3JkZXItcmFkaXVzOjNweDtib3JkZXI6MnB4IHNvbGlkICNmZmY7bWFyZ2luLXJpZ2h0OjIwcHg7ZGlzcGxheTpmbGV4O2FsaWduLWl0ZW1zOmNlbnRlcjtqdXN0aWZ5LWNvbnRlbnQ6Y2VudGVyfS5iYWMtLXVzZXItc2lkZWJhciAuYmFjLS11c2VyLWxpc3QtaXRlbSAuYmFjLS11c2VyLWxpc3QtaXRlbS1pbWFnZT5pbWd7d2lkdGg6YXV0bztoZWlnaHQ6YXV0bzttYXgtd2lkdGg6MTAwJTttYXgtaGVpZ2h0OjEwMCV9LmJhYy0tdXNlci1zaWRlYmFyIC5iYWMtLXVzZXItbGlzdC1pdGVtIHNwYW57d2lkdGg6MTAwJTtkaXNwbGF5OmJsb2NrO21hcmdpbi1ib3R0b206NXB4fS5iYWMtLXVzZXItc2lkZWJhciAuYmFjLXVzZXItYXBwLWRldGFpbHMgc3Bhbntmb250LXNpemU6MTJweH0uYmFjLS11c2VyLXNpZGViYXIgLnB1cmVzZGstdmVyc2lvbi1udW1iZXJ7d2lkdGg6MTAwJTt0ZXh0LWFsaWduOnJpZ2h0O3BhZGRpbmctcmlnaHQ6MTBweDtwb3NpdGlvbjphYnNvbHV0ZTtmb250LXNpemU6OHB4O29wYWNpdHk6MC41O3JpZ2h0OjA7Ym90dG9tOjB9LmJhYy0tdXNlci1zaWRlYmFyLWluZm97ZGlzcGxheTpmbGV4O2p1c3RpZnktY29udGVudDpjZW50ZXI7ZmxleC13cmFwOndyYXA7dGV4dC1hbGlnbjpjZW50ZXI7cGFkZGluZzoxMHB4IDIwcHggMTVweH0uYmFjLS11c2VyLXNpZGViYXItaW5mbyAuYmFjLS11c2VyLWltYWdle2JvcmRlcjoxcHggI2FkYWRhZCBzb2xpZDtvdmVyZmxvdzpoaWRkZW47Ym9yZGVyLXJhZGl1czo1MCU7cG9zaXRpb246cmVsYXRpdmU7Y3Vyc29yOnBvaW50ZXI7ZGlzcGxheTppbmxpbmUtYmxvY2s7aGVpZ2h0OjgwcHg7d2lkdGg6ODBweDtsaW5lLWhlaWdodDo4MHB4O3RleHQtYWxpZ246Y2VudGVyO2NvbG9yOiNmZmY7Ym9yZGVyLXJhZGl1czo1MCU7YmFja2dyb3VuZC1jb2xvcjojYWRhZGFkO21hcmdpbi1ib3R0b206MTVweH0uYmFjLS11c2VyLXNpZGViYXItaW5mbyAuYmFjLS11c2VyLWltYWdlICNiYWMtLXVzZXItaW1hZ2UtZmlsZXtkaXNwbGF5Om5vbmU7cG9zaXRpb246YWJzb2x1dGU7ei1pbmRleDoxO3RvcDowO2xlZnQ6MDt3aWR0aDoxMDAlO2hlaWdodDoxMDAlfS5iYWMtLXVzZXItc2lkZWJhci1pbmZvIC5iYWMtLXVzZXItaW1hZ2UgI2JhYy0tdXNlci1pbWFnZS1maWxlIGltZ3t3aWR0aDoxMDAlO2hlaWdodDoxMDAlfS5iYWMtLXVzZXItc2lkZWJhci1pbmZvIC5iYWMtLXVzZXItaW1hZ2UgI2JhYy0tdXNlci1pbWFnZS1maWxlLmJhYy0tcHVyZXNkay12aXNpYmxle2Rpc3BsYXk6YmxvY2t9LmJhYy0tdXNlci1zaWRlYmFyLWluZm8gLmJhYy0tdXNlci1pbWFnZSAjYmFjLS11c2VyLWltYWdlLXVwbG9hZC1wcm9ncmVzc3twb3NpdGlvbjphYnNvbHV0ZTtwYWRkaW5nLXRvcDoxMHB4O3RvcDowO2JhY2tncm91bmQ6IzY2Njt6LWluZGV4OjQ7ZGlzcGxheTpub25lO3dpZHRoOjEwMCU7aGVpZ2h0OjEwMCV9LmJhYy0tdXNlci1zaWRlYmFyLWluZm8gLmJhYy0tdXNlci1pbWFnZSAjYmFjLS11c2VyLWltYWdlLXVwbG9hZC1wcm9ncmVzcy5iYWMtLXB1cmVzZGstdmlzaWJsZXtkaXNwbGF5OmJsb2NrfS5iYWMtLXVzZXItc2lkZWJhci1pbmZvIC5iYWMtLXVzZXItaW1hZ2UgaXtmb250LXNpemU6MzJweDtmb250LXNpemU6MzJweDt6LWluZGV4OjA7cG9zaXRpb246YWJzb2x1dGU7d2lkdGg6MTAwJTtsZWZ0OjA7YmFja2dyb3VuZC1jb2xvcjpyZ2JhKDAsMCwwLDAuNSl9LmJhYy0tdXNlci1zaWRlYmFyLWluZm8gLmJhYy0tdXNlci1pbWFnZTpob3ZlciBpe3otaW5kZXg6M30uYmFjLS11c2VyLXNpZGViYXItaW5mbyAuYmFjLS11c2VyLW5hbWV7d2lkdGg6MTAwJTt0ZXh0LWFsaWduOmNlbnRlcjtmb250LXNpemU6MThweDttYXJnaW4tYm90dG9tOjEwcHh9LmJhYy0tdXNlci1zaWRlYmFyLWluZm8gLmJhYy0tdXNlci1lbWFpbHtmb250LXNpemU6MTJweDtmb250LXdlaWdodDozMDB9LmJhYy0tdXNlci1hY2NvdW50LXNldHRpbmdze3Bvc2l0aW9uOmFic29sdXRlO2JvdHRvbToxMHB4O2xlZnQ6MjBweDt3aWR0aDo5MCU7aGVpZ2h0OjUwcHh9LmJhYy0tdXNlci1hY2NvdW50LXNldHRpbmdzIC5iYWMtdXNlci1hY291bnQtbGlzdC1pdGVte2Rpc3BsYXk6ZmxleDthbGlnbi1pdGVtczpjZW50ZXI7bWFyZ2luLWJvdHRvbTozMHB4O3Bvc2l0aW9uOmFic29sdXRlfS5iYWMtLXVzZXItYWNjb3VudC1zZXR0aW5ncyAuYmFjLXVzZXItYWNvdW50LWxpc3QtaXRlbSBhe3RleHQtZGVjb3JhdGlvbjpub25lO2NvbG9yOiNmZmZ9LmJhYy0tdXNlci1hY2NvdW50LXNldHRpbmdzIC5iYWMtdXNlci1hY291bnQtbGlzdC1pdGVtIGl7Zm9udC1zaXplOjI0cHg7bWFyZ2luLXJpZ2h0OjIwcHh9I2JhYy0tcHVyZXNkay1hY2NvdW50LWxvZ28tLXtjdXJzb3I6cG9pbnRlcjtwb3NpdGlvbjpyZWxhdGl2ZX0jYmFjLS1wdXJlc2RrLWFjY291bnQtbG9nby0tIGltZ3toZWlnaHQ6MjhweH0jYmFjLS1pbmZvLWJsb2Nrcy13cmFwcGVyLS17cG9zaXRpb246cmVsYXRpdmV9I2JhYy0taW5mby1ibG9ja3Mtd3JhcHBlci0tIC5iYWMtLXB1cmVzZGstaW5mby1ib3gtLXtib3JkZXItcmFkaXVzOjAgMCAzcHggM3B4O292ZXJmbG93OmhpZGRlbjt6LWluZGV4Ojk5OTk5OTk5O3Bvc2l0aW9uOmZpeGVkO3RvcDotNDFweDt3aWR0aDo0NzBweDtsZWZ0OmNhbGMoNTB2dyAtIDIzNXB4KTtoZWlnaHQ6NDBweDstd2Via2l0LXRyYW5zaXRpb246dG9wIDAuNHM7dHJhbnNpdGlvbjp0b3AgMC40c30jYmFjLS1pbmZvLWJsb2Nrcy13cmFwcGVyLS0gLmJhYy0tcHVyZXNkay1pbmZvLWJveC0tLmJhYy0tc3VjY2Vzc3tiYWNrZ3JvdW5kOiMxNERBOUV9I2JhYy0taW5mby1ibG9ja3Mtd3JhcHBlci0tIC5iYWMtLXB1cmVzZGstaW5mby1ib3gtLS5iYWMtLXN1Y2Nlc3MgLmJhYy0taW5uZXItaW5mby1ib3gtLSBkaXYuYmFjLS1pbmZvLWljb24tLS5mYS1zdWNjZXNze2Rpc3BsYXk6aW5saW5lLWJsb2NrfSNiYWMtLWluZm8tYmxvY2tzLXdyYXBwZXItLSAuYmFjLS1wdXJlc2RrLWluZm8tYm94LS0uYmFjLS1pbmZve2JhY2tncm91bmQtY29sb3I6IzVCQzBERX0jYmFjLS1pbmZvLWJsb2Nrcy13cmFwcGVyLS0gLmJhYy0tcHVyZXNkay1pbmZvLWJveC0tLmJhYy0taW5mbyAuYmFjLS1pbm5lci1pbmZvLWJveC0tIGRpdi5iYWMtLWluZm8taWNvbi0tLmZhLWluZm8tMXtkaXNwbGF5OmlubGluZS1ibG9ja30jYmFjLS1pbmZvLWJsb2Nrcy13cmFwcGVyLS0gLmJhYy0tcHVyZXNkay1pbmZvLWJveC0tLmJhYy0td2FybmluZ3tiYWNrZ3JvdW5kOiNGMEFENEV9I2JhYy0taW5mby1ibG9ja3Mtd3JhcHBlci0tIC5iYWMtLXB1cmVzZGstaW5mby1ib3gtLS5iYWMtLXdhcm5pbmcgLmJhYy0taW5uZXItaW5mby1ib3gtLSBkaXYuYmFjLS1pbmZvLWljb24tLS5mYS13YXJuaW5ne2Rpc3BsYXk6aW5saW5lLWJsb2NrfSNiYWMtLWluZm8tYmxvY2tzLXdyYXBwZXItLSAuYmFjLS1wdXJlc2RrLWluZm8tYm94LS0uYmFjLS1lcnJvcntiYWNrZ3JvdW5kOiNFRjQxMDB9I2JhYy0taW5mby1ibG9ja3Mtd3JhcHBlci0tIC5iYWMtLXB1cmVzZGstaW5mby1ib3gtLS5iYWMtLWVycm9yIC5iYWMtLWlubmVyLWluZm8tYm94LS0gZGl2LmJhYy0taW5mby1pY29uLS0uZmEtZXJyb3J7ZGlzcGxheTppbmxpbmUtYmxvY2t9I2JhYy0taW5mby1ibG9ja3Mtd3JhcHBlci0tIC5iYWMtLXB1cmVzZGstaW5mby1ib3gtLSAuYmFjLS10aW1lcnstd2Via2l0LXRyYW5zaXRpb24tdGltaW5nLWZ1bmN0aW9uOmxpbmVhcjt0cmFuc2l0aW9uLXRpbWluZy1mdW5jdGlvbjpsaW5lYXI7cG9zaXRpb246YWJzb2x1dGU7Ym90dG9tOjBweDtvcGFjaXR5OjAuNTtoZWlnaHQ6MnB4ICFpbXBvcnRhbnQ7YmFja2dyb3VuZDp3aGl0ZTt3aWR0aDowJX0jYmFjLS1pbmZvLWJsb2Nrcy13cmFwcGVyLS0gLmJhYy0tcHVyZXNkay1pbmZvLWJveC0tIC5iYWMtLXRpbWVyLmJhYy0tZnVsbHdpZHRoe3dpZHRoOjEwMCV9I2JhYy0taW5mby1ibG9ja3Mtd3JhcHBlci0tIC5iYWMtLXB1cmVzZGstaW5mby1ib3gtLS5iYWMtLWFjdGl2ZS0te3RvcDowcHh9I2JhYy0taW5mby1ibG9ja3Mtd3JhcHBlci0tIC5iYWMtLXB1cmVzZGstaW5mby1ib3gtLSAuYmFjLS1pbm5lci1pbmZvLWJveC0te3dpZHRoOjEwMCU7cGFkZGluZzoxMXB4IDE1cHg7Y29sb3I6d2hpdGV9I2JhYy0taW5mby1ibG9ja3Mtd3JhcHBlci0tIC5iYWMtLXB1cmVzZGstaW5mby1ib3gtLSAuYmFjLS1pbm5lci1pbmZvLWJveC0tIGRpdntkaXNwbGF5OmlubGluZS1ibG9jaztoZWlnaHQ6MThweDtwb3NpdGlvbjpyZWxhdGl2ZX0jYmFjLS1pbmZvLWJsb2Nrcy13cmFwcGVyLS0gLmJhYy0tcHVyZXNkay1pbmZvLWJveC0tIC5iYWMtLWlubmVyLWluZm8tYm94LS0gZGl2LmJhYy0taW5mby1pY29uLS17ZGlzcGxheTpub25lO3RvcDowcHh9I2JhYy0taW5mby1ibG9ja3Mtd3JhcHBlci0tIC5iYWMtLXB1cmVzZGstaW5mby1ib3gtLSAuYmFjLS1pbm5lci1pbmZvLWJveC0tIC5iYWMtLWluZm8taWNvbi0te21hcmdpbi1yaWdodDoxNXB4O3dpZHRoOjEwcHg7dG9wOjJweH0jYmFjLS1pbmZvLWJsb2Nrcy13cmFwcGVyLS0gLmJhYy0tcHVyZXNkay1pbmZvLWJveC0tIC5iYWMtLWlubmVyLWluZm8tYm94LS0gLmJhYy0taW5mby1tYWluLXRleHQtLXt3aWR0aDozODBweDttYXJnaW4tcmlnaHQ6MTVweDtmb250LXNpemU6MTJweDt0ZXh0LWFsaWduOmNlbnRlcn0jYmFjLS1pbmZvLWJsb2Nrcy13cmFwcGVyLS0gLmJhYy0tcHVyZXNkay1pbmZvLWJveC0tIC5iYWMtLWlubmVyLWluZm8tYm94LS0gLmJhYy0taW5mby1jbG9zZS1idXR0b24tLXt3aWR0aDoxMHB4O2N1cnNvcjpwb2ludGVyO3RvcDoycHh9LmJhYy0tY3VzdG9tLW1vZGFse3Bvc2l0aW9uOmZpeGVkO3dpZHRoOjcwJTtoZWlnaHQ6ODAlO21pbi13aWR0aDo0MDBweDtsZWZ0OjA7cmlnaHQ6MDt0b3A6MDtib3R0b206MDttYXJnaW46YXV0bztib3JkZXI6MXB4IHNvbGlkICM5Nzk3OTc7Ym9yZGVyLXJhZGl1czo1cHg7Ym94LXNoYWRvdzowIDAgNzFweCAwICMyRjM4NDk7YmFja2dyb3VuZDojZmZmO3otaW5kZXg6OTk5O292ZXJmbG93OmF1dG87ZGlzcGxheTpub25lfS5iYWMtLWN1c3RvbS1tb2RhbC5pcy1vcGVue2Rpc3BsYXk6YmxvY2t9LmJhYy0tY3VzdG9tLW1vZGFsIC5jdXN0b20tbW9kYWxfX2Nsb3NlLWJ0bnt0ZXh0LWRlY29yYXRpb246bm9uZTtwYWRkaW5nLXRvcDoycHg7bGluZS1oZWlnaHQ6MThweDtoZWlnaHQ6MjBweDt3aWR0aDoyMHB4O2JvcmRlci1yYWRpdXM6NTAlO2NvbG9yOiM5MDliYTQ7dGV4dC1hbGlnbjpjZW50ZXI7cG9zaXRpb246YWJzb2x1dGU7dG9wOjIwcHg7cmlnaHQ6MjBweDtmb250LXNpemU6MjBweH0uYmFjLS1jdXN0b20tbW9kYWwgLmN1c3RvbS1tb2RhbF9fY2xvc2UtYnRuOmhvdmVye3RleHQtZGVjb3JhdGlvbjpub25lO2NvbG9yOiM0NTUwNjY7Y3Vyc29yOnBvaW50ZXJ9LmJhYy0tY3VzdG9tLW1vZGFsIC5jdXN0b20tbW9kYWxfX3dyYXBwZXJ7aGVpZ2h0OjEwMCU7ZGlzcGxheTpmbGV4O2ZsZXgtZGlyZWN0aW9uOmNvbHVtbn0uYmFjLS1jdXN0b20tbW9kYWwgLmN1c3RvbS1tb2RhbF9fd3JhcHBlciBpZnJhbWV7d2lkdGg6MTAwJTtoZWlnaHQ6MTAwJX0uYmFjLS1jdXN0b20tbW9kYWwgLmN1c3RvbS1tb2RhbF9fY29udGVudC13cmFwcGVye2hlaWdodDoxMDAlO292ZXJmbG93OmF1dG87bWFyZ2luLWJvdHRvbToxMDRweDtib3JkZXItdG9wOjJweCBzb2xpZCAjQzlDREQ3fS5iYWMtLWN1c3RvbS1tb2RhbCAuY3VzdG9tLW1vZGFsX19jb250ZW50LXdyYXBwZXIubm8tbWFyZ2lue21hcmdpbi1ib3R0b206MH0uYmFjLS1jdXN0b20tbW9kYWwgLmN1c3RvbS1tb2RhbF9fY29udGVudHtwYWRkaW5nOjIwcHg7cG9zaXRpb246cmVsYXRpdmV9LmJhYy0tY3VzdG9tLW1vZGFsIC5jdXN0b20tbW9kYWxfX2NvbnRlbnQgaDN7Y29sb3I6IzJGMzg0OTtmb250LXNpemU6MjBweDtmb250LXdlaWdodDo2MDA7bGluZS1oZWlnaHQ6MjdweH0uYmFjLS1jdXN0b20tbW9kYWwgLmN1c3RvbS1tb2RhbF9fc2F2ZXtwb3NpdGlvbjphYnNvbHV0ZTtyaWdodDowO2JvdHRvbTowO3dpZHRoOjEwMCU7cGFkZGluZzozMHB4IDMycHg7YmFja2dyb3VuZC1jb2xvcjojRjJGMkY0fS5iYWMtLWN1c3RvbS1tb2RhbCAuY3VzdG9tLW1vZGFsX19zYXZlIGEsLmJhYy0tY3VzdG9tLW1vZGFsIC5jdXN0b20tbW9kYWxfX3NhdmUgYnV0dG9ue2ZvbnQtc2l6ZToxNHB4O2xpbmUtaGVpZ2h0OjIycHg7aGVpZ2h0OjQ0cHg7d2lkdGg6MTAwJX0uYmFjLS1jdXN0b20tbW9kYWwgLmN1c3RvbS1tb2RhbF9fc3BsaXR0ZXJ7aGVpZ2h0OjMwcHg7bGluZS1oZWlnaHQ6MzBweDtwYWRkaW5nOjAgMjBweDtib3JkZXItY29sb3I6I0QzRDNEMztib3JkZXItc3R5bGU6c29saWQ7Ym9yZGVyLXdpZHRoOjFweCAwIDFweCAwO2JhY2tncm91bmQtY29sb3I6I0YwRjBGMDtjb2xvcjojNjc2RjgyO2ZvbnQtc2l6ZToxM3B4O2ZvbnQtd2VpZ2h0OjYwMH0uYmFjLS1jdXN0b20tbW9kYWwgLmN1c3RvbS1tb2RhbF9fYm94e2Rpc3BsYXk6aW5saW5lLWJsb2NrO3ZlcnRpY2FsLWFsaWduOm1pZGRsZTtoZWlnaHQ6MTY1cHg7d2lkdGg6MTY1cHg7Ym9yZGVyOjJweCBzb2xpZCByZWQ7Ym9yZGVyLXJhZGl1czo1cHg7dGV4dC1hbGlnbjpjZW50ZXI7Zm9udC1zaXplOjEycHg7Zm9udC13ZWlnaHQ6NjAwO2NvbG9yOiM5MDk3QTg7dGV4dC1kZWNvcmF0aW9uOm5vbmU7bWFyZ2luOjEwcHggMjBweCAxMHB4IDA7dHJhbnNpdGlvbjowLjFzIGFsbH0uYmFjLS1jdXN0b20tbW9kYWwgLmN1c3RvbS1tb2RhbF9fYm94IGl7Zm9udC1zaXplOjcwcHg7ZGlzcGxheTpibG9jazttYXJnaW46MjVweCAwfS5iYWMtLWN1c3RvbS1tb2RhbCAuY3VzdG9tLW1vZGFsX19ib3guYWN0aXZle2NvbG9yOnllbGxvdztib3JkZXItY29sb3I6eWVsbG93O3RleHQtZGVjb3JhdGlvbjpub25lfS5iYWMtLWN1c3RvbS1tb2RhbCAuY3VzdG9tLW1vZGFsX19ib3g6aG92ZXIsLmJhYy0tY3VzdG9tLW1vZGFsIC5jdXN0b20tbW9kYWxfX2JveDphY3RpdmUsLmJhYy0tY3VzdG9tLW1vZGFsIC5jdXN0b20tbW9kYWxfX2JveDpmb2N1c3tjb2xvcjojMUFDMEI0O2JvcmRlci1jb2xvcjp5ZWxsb3c7dGV4dC1kZWNvcmF0aW9uOm5vbmV9LmNsb3VkLWltYWdlc19fY29udGFpbmVye2Rpc3BsYXk6ZmxleDtmbGV4LXdyYXA6d3JhcDtqdXN0aWZ5LWNvbnRlbnQ6ZmxleC1zdGFydH0uY2xvdWQtaW1hZ2VzX19wYWdpbmF0aW9ue3BhZGRpbmc6MjBweH0uY2xvdWQtaW1hZ2VzX19wYWdpbmF0aW9uIGxpe2Rpc3BsYXk6aW5saW5lLWJsb2NrO21hcmdpbi1yaWdodDoxMHB4fS5jbG91ZC1pbWFnZXNfX3BhZ2luYXRpb24gbGkgYXtjb2xvcjojZmZmO2JhY2tncm91bmQtY29sb3I6IzVlNjc3Njtib3JkZXItcmFkaXVzOjIwcHg7dGV4dC1kZWNvcmF0aW9uOm5vbmU7ZGlzcGxheTpibG9jaztmb250LXdlaWdodDoyMDA7aGVpZ2h0OjM1cHg7d2lkdGg6MzVweDtsaW5lLWhlaWdodDozNXB4O3RleHQtYWxpZ246Y2VudGVyfS5jbG91ZC1pbWFnZXNfX3BhZ2luYXRpb24gbGkuYWN0aXZlIGF7YmFja2dyb3VuZC1jb2xvcjojMmYzODQ5fS5jbG91ZC1pbWFnZXNfX2l0ZW17d2lkdGg6MTU1cHg7aGVpZ2h0OjE3MHB4O2JvcmRlcjoxcHggc29saWQgI2VlZTtiYWNrZ3JvdW5kLWNvbG9yOiNmZmY7Ym9yZGVyLXJhZGl1czozcHg7bWFyZ2luOjAgMTVweCAxNXB4IDA7dGV4dC1hbGlnbjpjZW50ZXI7cG9zaXRpb246cmVsYXRpdmU7Y3Vyc29yOnBvaW50ZXJ9LmNsb3VkLWltYWdlc19faXRlbSAuY2xvdWQtaW1hZ2VzX19pdGVtX190eXBle2hlaWdodDoxMTVweDtmb250LXNpemU6OTBweDtsaW5lLWhlaWdodDoxNDBweDtib3JkZXItdG9wLWxlZnQtcmFkaXVzOjNweDtib3JkZXItdG9wLXJpZ2h0LXJhZGl1czozcHg7Y29sb3I6I2EyYTJhMjtiYWNrZ3JvdW5kLWNvbG9yOiNlOWVhZWJ9LmNsb3VkLWltYWdlc19faXRlbSAuY2xvdWQtaW1hZ2VzX19pdGVtX190eXBlPmltZ3t3aWR0aDphdXRvO2hlaWdodDphdXRvO21heC13aWR0aDoxMDAlO21heC1oZWlnaHQ6MTAwJX0uY2xvdWQtaW1hZ2VzX19pdGVtIC5jbG91ZC1pbWFnZXNfX2l0ZW1fX2RldGFpbHN7cGFkZGluZzoxMHB4IDB9LmNsb3VkLWltYWdlc19faXRlbSAuY2xvdWQtaW1hZ2VzX19pdGVtX19kZXRhaWxzIC5jbG91ZC1pbWFnZXNfX2l0ZW1fX2RldGFpbHNfX25hbWV7Zm9udC1zaXplOjEycHg7b3V0bGluZTpub25lO3BhZGRpbmc6MCAxMHB4O2NvbG9yOiNhNWFiYjU7Ym9yZGVyOm5vbmU7d2lkdGg6MTAwJTtiYWNrZ3JvdW5kLWNvbG9yOnRyYW5zcGFyZW50O2hlaWdodDoxNXB4O2Rpc3BsYXk6aW5saW5lLWJsb2NrO3dvcmQtYnJlYWs6YnJlYWstYWxsfS5jbG91ZC1pbWFnZXNfX2l0ZW0gLmNsb3VkLWltYWdlc19faXRlbV9fZGV0YWlscyAuY2xvdWQtaW1hZ2VzX19pdGVtX19kZXRhaWxzX19kYXRle2ZvbnQtc2l6ZToxMHB4O2JvdHRvbTo2cHg7d2lkdGg6MTU1cHg7aGVpZ2h0OjE1cHg7Y29sb3I6I2E1YWJiNTtkaXNwbGF5OmlubGluZS1ibG9ja30uY2xvdWQtaW1hZ2VzX19pdGVtIC5jbG91ZC1pbWFnZXNfX2l0ZW1fX2FjdGlvbnN7ZGlzcGxheTpmbGV4O2FsaWduLWl0ZW1zOmNlbnRlcjtqdXN0aWZ5LWNvbnRlbnQ6Y2VudGVyO3Bvc2l0aW9uOmFic29sdXRlO3RvcDowO2xlZnQ6MDt3aWR0aDoxMDAlO2hlaWdodDoxMTVweDtiYWNrZ3JvdW5kLWNvbG9yOnJnYmEoNzgsODMsOTEsMC44Myk7b3BhY2l0eTowO3Zpc2liaWxpdHk6aGlkZGVuO2JvcmRlci10b3AtbGVmdC1yYWRpdXM6M3B4O2JvcmRlci10b3AtcmlnaHQtcmFkaXVzOjNweDt0ZXh0LWFsaWduOmNlbnRlcjt0cmFuc2l0aW9uOjAuM3Mgb3BhY2l0eX0uY2xvdWQtaW1hZ2VzX19pdGVtIC5jbG91ZC1pbWFnZXNfX2l0ZW1fX2FjdGlvbnMgYXtmb250LXNpemU6MTZweDtjb2xvcjojZmZmO3RleHQtZGVjb3JhdGlvbjpub25lfS5jbG91ZC1pbWFnZXNfX2l0ZW06aG92ZXIgLmNsb3VkLWltYWdlc19faXRlbSAuY2xvdWQtaW1hZ2VzX19pdGVtX19hY3Rpb25ze29wYWNpdHk6MTt2aXNpYmlsaXR5OnZpc2libGV9JyxcbiAgICBoZWFkID0gZG9jdW1lbnQuaGVhZCB8fCBkb2N1bWVudC5nZXRFbGVtZW50c0J5VGFnTmFtZSgnaGVhZCcpWzBdLFxuICAgIHN0eWxlID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudCgnc3R5bGUnKTtcblxuc3R5bGUudHlwZSA9ICd0ZXh0L2Nzcyc7XG5pZiAoc3R5bGUuc3R5bGVTaGVldCkge1xuICAgIHN0eWxlLnN0eWxlU2hlZXQuY3NzVGV4dCA9IGNzcztcbn0gZWxzZSB7XG4gICAgc3R5bGUuYXBwZW5kQ2hpbGQoZG9jdW1lbnQuY3JlYXRlVGV4dE5vZGUoY3NzKSk7XG59XG5oZWFkLmFwcGVuZENoaWxkKHN0eWxlKTtcblxudmFyIGxpbmsgPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KCdsaW5rJyk7XG5saW5rLmhyZWYgPSAnaHR0cHM6Ly9maWxlLm15Zm9udGFzdGljLmNvbS9NRHZuUkpHaEJkNXhWY1huNHVRSlNaL2ljb25zLmNzcyc7XG5saW5rLnJlbCA9ICdzdHlsZXNoZWV0JztcblxuZG9jdW1lbnQuZ2V0RWxlbWVudHNCeVRhZ05hbWUoJ2hlYWQnKVswXS5hcHBlbmRDaGlsZChsaW5rKTtcblxubW9kdWxlLmV4cG9ydHMgPSBwcGJhOyIsInZhciBTdG9yZSA9IHJlcXVpcmUoJy4vc3RvcmUnKTtcbnZhciBMb2dnZXIgPSByZXF1aXJlKCcuL2xvZ2dlcicpO1xudmFyIERvbSA9IHJlcXVpcmUoJy4vZG9tJyk7XG52YXIgQ2FsbGVyID0gcmVxdWlyZSgnLi9jYWxsZXInKTtcblxudmFyIHVwbG9hZGluZyA9IGZhbHNlO1xuXG52YXIgQXZhdGFyQ3RybCA9IHtcblx0X3N1Ym1pdDogbnVsbCxcblx0X2ZpbGU6IG51bGwsXG5cdF9wcm9ncmVzczogbnVsbCxcblx0X3NpZGViYXJfYXZhdGFyOiBudWxsLFxuXHRfdG9wX2F2YXRhcjogbnVsbCxcblx0X3RvcF9hdmF0YXJfY29udGFpbmVyOiBudWxsLFxuXG5cdGluaXQ6IGZ1bmN0aW9uIGluaXQoKSB7XG5cdFx0QXZhdGFyQ3RybC5fc3VibWl0ID0gZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoJ2JhYy0tLXB1cmVzZGstYXZhdGFyLXN1Ym1pdCcpO1xuXHRcdEF2YXRhckN0cmwuX2ZpbGUgPSBkb2N1bWVudC5nZXRFbGVtZW50QnlJZCgnYmFjLS0tcHVyZXNkay1hdmF0YXItZmlsZScpO1xuXHRcdEF2YXRhckN0cmwuX3RvcF9hdmF0YXJfY29udGFpbmVyID0gZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoJ2JhYy0taW1hZ2UtY29udGFpbmVyLXRvcCcpO1xuXHRcdEF2YXRhckN0cmwuX3Byb2dyZXNzID0gZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoJ2JhYy0tdXNlci1pbWFnZS11cGxvYWQtcHJvZ3Jlc3MnKTtcblx0XHRBdmF0YXJDdHJsLl9zaWRlYmFyX2F2YXRhciA9IGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKCdiYWMtLXVzZXItaW1hZ2UtZmlsZScpO1xuXHRcdEF2YXRhckN0cmwuX3RvcF9hdmF0YXIgPSBkb2N1bWVudC5nZXRFbGVtZW50QnlJZCgnYmFjLS11c2VyLWF2YXRhci10b3AnKTtcblx0XHRBdmF0YXJDdHJsLl9maWxlLmFkZEV2ZW50TGlzdGVuZXIoJ2NsaWNrJywgZnVuY3Rpb24gKGUpIHtcblx0XHRcdGUuc3RvcFByb3BhZ2F0aW9uKCk7XG5cdFx0fSk7XG5cdFx0QXZhdGFyQ3RybC5fZmlsZS5hZGRFdmVudExpc3RlbmVyKCdjaGFuZ2UnLCBmdW5jdGlvbiAoZSkge1xuXHRcdFx0QXZhdGFyQ3RybC51cGxvYWQoKTtcblx0XHR9KTtcblxuXHRcdGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKCdiYWMtLXVzZXItaW1hZ2UnKS5hZGRFdmVudExpc3RlbmVyKCdjbGljaycsIGZ1bmN0aW9uIChlKSB7XG5cdFx0XHRlLnN0b3BQcm9wYWdhdGlvbigpO1xuXHRcdFx0QXZhdGFyQ3RybC5fZmlsZS5jbGljaygpO1xuXHRcdH0pO1xuXHR9LFxuXG5cdHVwbG9hZDogZnVuY3Rpb24gdXBsb2FkKCkge1xuXHRcdGlmICh1cGxvYWRpbmcpIHtcblx0XHRcdHJldHVybjtcblx0XHR9XG5cdFx0dXBsb2FkaW5nID0gdHJ1ZTtcblxuXHRcdGlmIChBdmF0YXJDdHJsLl9maWxlLmZpbGVzLmxlbmd0aCA9PT0gMCkge1xuXHRcdFx0cmV0dXJuO1xuXHRcdH1cblxuXHRcdHZhciBkYXRhID0gbmV3IEZvcm1EYXRhKCk7XG5cdFx0ZGF0YS5hcHBlbmQoJ2ZpbGUnLCBBdmF0YXJDdHJsLl9maWxlLmZpbGVzWzBdKTtcblxuXHRcdHZhciBzdWNjZXNzQ2FsbGJhY2sgPSBmdW5jdGlvbiBzdWNjZXNzQ2FsbGJhY2soZGF0YSkge1xuXHRcdFx0O1xuXHRcdH07XG5cblx0XHR2YXIgZmFpbENhbGxiYWNrID0gZnVuY3Rpb24gZmFpbENhbGxiYWNrKGRhdGEpIHtcblx0XHRcdDtcblx0XHR9O1xuXG5cdFx0dmFyIHJlcXVlc3QgPSBuZXcgWE1MSHR0cFJlcXVlc3QoKTtcblx0XHRyZXF1ZXN0Lm9ucmVhZHlzdGF0ZWNoYW5nZSA9IGZ1bmN0aW9uICgpIHtcblx0XHRcdHVwbG9hZGluZyA9IGZhbHNlO1xuXHRcdFx0aWYgKHJlcXVlc3QucmVhZHlTdGF0ZSA9PSA0KSB7XG5cdFx0XHRcdHRyeSB7XG5cdFx0XHRcdFx0dmFyIGltYWdlRGF0YSA9IEpTT04ucGFyc2UocmVxdWVzdC5yZXNwb25zZSkuZGF0YTtcblx0XHRcdFx0XHRBdmF0YXJDdHJsLnNldEF2YXRhcihpbWFnZURhdGEudXJsKTtcblx0XHRcdFx0XHRDYWxsZXIubWFrZUNhbGwoe1xuXHRcdFx0XHRcdFx0dHlwZTogJ1BVVCcsXG5cdFx0XHRcdFx0XHRlbmRwb2ludDogU3RvcmUuZ2V0QXZhdGFyVXBkYXRlVXJsKCksXG5cdFx0XHRcdFx0XHRwYXJhbXM6IHtcblx0XHRcdFx0XHRcdFx0dXNlcjoge1xuXHRcdFx0XHRcdFx0XHRcdGF2YXRhcl91dWlkOiBpbWFnZURhdGEuZ3VpZFxuXHRcdFx0XHRcdFx0XHR9XG5cdFx0XHRcdFx0XHR9LFxuXHRcdFx0XHRcdFx0Y2FsbGJhY2tzOiB7XG5cdFx0XHRcdFx0XHRcdHN1Y2Nlc3M6IHN1Y2Nlc3NDYWxsYmFjayxcblx0XHRcdFx0XHRcdFx0ZmFpbDogZmFpbENhbGxiYWNrXG5cdFx0XHRcdFx0XHR9XG5cdFx0XHRcdFx0fSk7XG5cdFx0XHRcdH0gY2F0Y2ggKGUpIHtcblx0XHRcdFx0XHR2YXIgcmVzcCA9IHtcblx0XHRcdFx0XHRcdHN0YXR1czogJ2Vycm9yJyxcblx0XHRcdFx0XHRcdGRhdGE6ICdVbmtub3duIGVycm9yIG9jY3VycmVkOiBbJyArIHJlcXVlc3QucmVzcG9uc2VUZXh0ICsgJ10nXG5cdFx0XHRcdFx0fTtcblx0XHRcdFx0fVxuXHRcdFx0XHRMb2dnZXIubG9nKHJlcXVlc3QucmVzcG9uc2Uuc3RhdHVzICsgJzogJyArIHJlcXVlc3QucmVzcG9uc2UuZGF0YSk7XG5cdFx0XHR9XG5cdFx0fTtcblxuXHRcdC8vIHJlcXVlc3QudXBsb2FkLmFkZEV2ZW50TGlzdGVuZXIoJ3Byb2dyZXNzJywgZnVuY3Rpb24oZSl7XG5cdFx0Ly8gXHRMb2dnZXIubG9nKGUubG9hZGVkL2UudG90YWwpO1xuXHRcdC8vIFx0QXZhdGFyQ3RybC5fcHJvZ3Jlc3Muc3R5bGUudG9wID0gMTAwIC0gKGUubG9hZGVkL2UudG90YWwpICogMTAwICsgJyUnO1xuXHRcdC8vIH0sIGZhbHNlKTtcblxuXHRcdHZhciB1cmwgPSBTdG9yZS5nZXRBdmF0YXJVcGxvYWRVcmwoKTtcblx0XHREb20uYWRkQ2xhc3MoQXZhdGFyQ3RybC5fcHJvZ3Jlc3MsICdiYWMtLXB1cmVzZGstdmlzaWJsZScpO1xuXHRcdHJlcXVlc3Qub3BlbignUE9TVCcsIHVybCk7XG5cdFx0cmVxdWVzdC5zZW5kKGRhdGEpO1xuXHR9LFxuXG5cdHNldEF2YXRhcjogZnVuY3Rpb24gc2V0QXZhdGFyKHVybCkge1xuXHRcdGlmICghdXJsKSB7XG5cdFx0XHRyZXR1cm47XG5cdFx0fVxuXG5cdFx0RG9tLnJlbW92ZUNsYXNzKEF2YXRhckN0cmwuX3Byb2dyZXNzLCAnYmFjLS1wdXJlc2RrLXZpc2libGUnKTtcblx0XHREb20uYWRkQ2xhc3MoQXZhdGFyQ3RybC5fc2lkZWJhcl9hdmF0YXIsICdiYWMtLXB1cmVzZGstdmlzaWJsZScpO1xuXHRcdHZhciBpbWcgPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KCdpbWcnKTtcblx0XHRpbWcuc3JjID0gdXJsO1xuXHRcdEF2YXRhckN0cmwuX3NpZGViYXJfYXZhdGFyLmlubmVySFRNTCA9ICcnO1xuXHRcdEF2YXRhckN0cmwuX3NpZGViYXJfYXZhdGFyLmFwcGVuZENoaWxkKGltZyk7XG5cblx0XHREb20uYWRkQ2xhc3MoQXZhdGFyQ3RybC5fdG9wX2F2YXRhcl9jb250YWluZXIsICdiYWMtLXB1cmVzZGstdmlzaWJsZScpO1xuXHRcdHZhciBpbWdfMiA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoJ2ltZycpO1xuXHRcdGltZ18yLnNyYyA9IHVybDtcblx0XHRBdmF0YXJDdHJsLl90b3BfYXZhdGFyX2NvbnRhaW5lci5pbm5lckhUTUwgPSAnJztcblx0XHRBdmF0YXJDdHJsLl90b3BfYXZhdGFyX2NvbnRhaW5lci5hcHBlbmRDaGlsZChpbWdfMik7XG5cblx0XHQvLyAgYmFjLS1pbWFnZS1jb250YWluZXItdG9wXG5cdH1cbn07XG5cbm1vZHVsZS5leHBvcnRzID0gQXZhdGFyQ3RybDsiLCJ2YXIgU3RvcmUgPSByZXF1aXJlKCcuL3N0b3JlLmpzJyk7XG52YXIgTG9nZ2VyID0gcmVxdWlyZSgnLi9sb2dnZXInKTtcblxudmFyIHBhcmFtc1RvR2V0VmFycyA9IGZ1bmN0aW9uIHBhcmFtc1RvR2V0VmFycyhwYXJhbXMpIHtcblx0dmFyIHRvUmV0dXJuID0gW107XG5cdGZvciAodmFyIHByb3BlcnR5IGluIHBhcmFtcykge1xuXHRcdGlmIChwYXJhbXMuaGFzT3duUHJvcGVydHkocHJvcGVydHkpKSB7XG5cdFx0XHR0b1JldHVybi5wdXNoKHByb3BlcnR5ICsgJz0nICsgcGFyYW1zW3Byb3BlcnR5XSk7XG5cdFx0fVxuXHR9XG5cblx0cmV0dXJuIHRvUmV0dXJuLmpvaW4oJyYnKTtcbn07XG5cbnZhciBkZXZLZXlzID0gbnVsbDtcblxudmFyIENhbGxlciA9IHtcblx0LypcbiBpZiB0aGUgdXNlciBzZXRzXG4gICovXG5cdHNldERldktleXM6IGZ1bmN0aW9uIHNldERldktleXMoa2V5cykge1xuXHRcdGRldktleXMgPSBrZXlzO1xuXHR9LFxuXG5cdC8qXG4gZXhwZWN0ZSBhdHRyaWJ1dGVzOlxuIC0gdHlwZSAoZWl0aGVyIEdFVCwgUE9TVCwgREVMRVRFLCBQVVQpXG4gLSBlbmRwb2ludFxuIC0gcGFyYW1zIChpZiBhbnkuIEEganNvbiB3aXRoIHBhcmFtZXRlcnMgdG8gYmUgcGFzc2VkIGJhY2sgdG8gdGhlIGVuZHBvaW50KVxuIC0gY2FsbGJhY2tzOiBhbiBvYmplY3Qgd2l0aDpcbiBcdC0gc3VjY2VzczogdGhlIHN1Y2Nlc3MgY2FsbGJhY2tcbiBcdC0gZmFpbDogdGhlIGZhaWwgY2FsbGJhY2tcbiAgKi9cblx0bWFrZUNhbGw6IGZ1bmN0aW9uIG1ha2VDYWxsKGF0dHJzKSB7XG5cdFx0dmFyIGVuZHBvaW50VXJsID0gYXR0cnMuZW5kcG9pbnQ7XG5cblx0XHR2YXIgeGhyID0gbmV3IFhNTEh0dHBSZXF1ZXN0KCk7XG5cblx0XHRpZiAoYXR0cnMudHlwZSA9PT0gJ0dFVCcgJiYgYXR0cnMucGFyYW1zKSB7XG5cdFx0XHRlbmRwb2ludFVybCA9IGVuZHBvaW50VXJsICsgXCI/XCIgKyBwYXJhbXNUb0dldFZhcnMoYXR0cnMucGFyYW1zKTtcblx0XHR9XG5cblx0XHR4aHIub3BlbihhdHRycy50eXBlLCBlbmRwb2ludFVybCk7XG5cblx0XHRpZiAoZGV2S2V5cyAhPSBudWxsKSB7XG5cdFx0XHR4aHIuc2V0UmVxdWVzdEhlYWRlcigneC1wcC1zZWNyZXQnLCBkZXZLZXlzLnNlY3JldCk7XG5cdFx0XHR4aHIuc2V0UmVxdWVzdEhlYWRlcigneC1wcC1rZXknLCBkZXZLZXlzLmtleSk7XG5cdFx0fVxuXHRcdHhoci53aXRoQ3JlZGVudGlhbHMgPSB0cnVlO1xuXHRcdHhoci5zZXRSZXF1ZXN0SGVhZGVyKCdDb250ZW50LVR5cGUnLCAnYXBwbGljYXRpb24vanNvbicpO1xuXHRcdHhoci5vbmxvYWQgPSBmdW5jdGlvbiAoKSB7XG5cdFx0XHRpZiAoeGhyLnN0YXR1cyA+PSAyMDAgJiYgeGhyLnN0YXR1cyA8IDMwMCkge1xuXHRcdFx0XHRhdHRycy5jYWxsYmFja3Muc3VjY2VzcyhKU09OLnBhcnNlKHhoci5yZXNwb25zZVRleHQpKTtcblx0XHRcdH0gZWxzZSBpZiAoeGhyLnN0YXR1cyAhPT0gMjAwKSB7XG5cdFx0XHRcdGF0dHJzLmNhbGxiYWNrcy5mYWlsKEpTT04ucGFyc2UoeGhyLnJlc3BvbnNlVGV4dCkpO1xuXHRcdFx0fVxuXHRcdH07XG5cblx0XHRpZiAoIWF0dHJzLnBhcmFtcykge1xuXHRcdFx0YXR0cnMucGFyYW1zID0ge307XG5cdFx0fVxuXHRcdHhoci5zZW5kKEpTT04uc3RyaW5naWZ5KGF0dHJzLnBhcmFtcykpO1xuXHR9LFxuXG5cdHByb21pc2VDYWxsOiBmdW5jdGlvbiBwcm9taXNlQ2FsbChhdHRycykge1xuXHRcdHJldHVybiBuZXcgUHJvbWlzZShmdW5jdGlvbiAocmVzb2x2ZSwgcmVqZWN0KSB7XG5cdFx0XHR2YXIgeGhyID0gbmV3IFhNTEh0dHBSZXF1ZXN0KCk7XG5cblx0XHRcdGlmIChhdHRycy50eXBlID09PSAnR0VUJyAmJiBhdHRycy5wYXJhbXMpIHtcblx0XHRcdFx0ZW5kcG9pbnRVcmwgPSBlbmRwb2ludFVybCArIFwiP1wiICsgcGFyYW1zVG9HZXRWYXJzKGF0dHJzLnBhcmFtcyk7XG5cdFx0XHR9XG5cblx0XHRcdHhoci5vcGVuKGF0dHJzLnR5cGUsIGF0dHJzLmVuZHBvaW50KTtcblx0XHRcdHhoci53aXRoQ3JlZGVudGlhbHMgPSB0cnVlO1xuXG5cdFx0XHRpZiAoZGV2S2V5cyAhPSBudWxsKSB7XG5cdFx0XHRcdHhoci5zZXRSZXF1ZXN0SGVhZGVyKCd4LXBwLXNlY3JldCcsIGRldktleXMuc2VjcmV0KTtcblx0XHRcdFx0eGhyLnNldFJlcXVlc3RIZWFkZXIoJ3gtcHAta2V5JywgZGV2S2V5cy5rZXkpO1xuXHRcdFx0fVxuXG5cdFx0XHR4aHIuc2V0UmVxdWVzdEhlYWRlcignQ29udGVudC1UeXBlJywgJ2FwcGxpY2F0aW9uL2pzb24nKTtcblx0XHRcdHhoci5vbmxvYWQgPSBmdW5jdGlvbiAoKSB7XG5cdFx0XHRcdGlmICh0aGlzLnN0YXR1cyA+PSAyMDAgJiYgdGhpcy5zdGF0dXMgPCAzMDApIHtcblx0XHRcdFx0XHRhdHRycy5taWRkbGV3YXJlcy5zdWNjZXNzKEpTT04ucGFyc2UoeGhyLnJlc3BvbnNlVGV4dCkpO1xuXHRcdFx0XHRcdHJlc29sdmUoSlNPTi5wYXJzZSh4aHIucmVzcG9uc2VUZXh0KSk7XG5cdFx0XHRcdH0gZWxzZSB7XG5cdFx0XHRcdFx0d2luZG93LmxvY2F0aW9uLmhyZWYgPSBTdG9yZS5nZXRMb2dpblVybCgpO1xuXHRcdFx0XHR9XG5cdFx0XHR9O1xuXHRcdFx0eGhyLm9uZXJyb3IgPSBmdW5jdGlvbiAoKSB7XG5cdFx0XHRcdHdpbmRvdy5sb2NhdGlvbiA9IFN0b3JlLmdldExvZ2luVXJsKCk7XG5cdFx0XHR9O1xuXHRcdFx0eGhyLnNlbmQoKTtcblx0XHR9KTtcblx0fVxufTtcblxubW9kdWxlLmV4cG9ydHMgPSBDYWxsZXI7IiwidmFyIGRlYm91bmNlZFRpbWVvdXQgPSBudWxsO1xudmFyIGN1cnJlbnRRdWVyeSA9ICcnO1xudmFyIGxpbWl0ID0gODtcbnZhciBsYXRlbmN5ID0gNTAwO1xudmFyIGluaXRPcHRpb25zID0gdm9pZCAwO1xudmFyIGN1cnJlbnRQYWdlID0gMTtcbnZhciBtZXRhRGF0YSA9IG51bGw7XG52YXIgaXRlbXMgPSBbXTtcbnZhciBwYWdpbmF0aW9uRGF0YSA9IG51bGw7XG5cbnZhciBQYWdpbmF0aW9uSGVscGVyID0gcmVxdWlyZSgnLi9wYWdpbmF0aW9uLWhlbHBlcicpO1xudmFyIENhbGxlciA9IHJlcXVpcmUoJy4vY2FsbGVyJyk7XG52YXIgU3RvcmUgPSByZXF1aXJlKCcuL3N0b3JlJyk7XG52YXIgRG9tID0gcmVxdWlyZSgnLi9kb20nKTtcblxudmFyIENsb3VkaW5hcnlQaWNrZXIgPSB7XG5cblx0XHRpbml0aWFsaXNlOiBmdW5jdGlvbiBpbml0aWFsaXNlKCkge1xuXHRcdFx0XHRkb2N1bWVudC5nZXRFbGVtZW50QnlJZCgnYmFjLS1jbG91ZGluYXJ5LS1jbG9zZWJ0bicpLm9uY2xpY2sgPSBmdW5jdGlvbiAoZSkge1xuXHRcdFx0XHRcdFx0Q2xvdWRpbmFyeVBpY2tlci5jbG9zZU1vZGFsKCk7XG5cdFx0XHRcdH07XG5cdFx0XHRcdGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKCdiYWMtLWNsb3VkaW5hcnktLXNlYXJjaC1pbnB1dCcpLm9ua2V5dXAgPSBmdW5jdGlvbiAoZSkge1xuXHRcdFx0XHRcdFx0Q2xvdWRpbmFyeVBpY2tlci5oYW5kbGVTZWFyY2goZSk7XG5cdFx0XHRcdH07XG5cdFx0XHRcdGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKCdiYWMtLWNsb3VkaW5hcnktLWdvLWJhY2snKS5vbmNsaWNrID0gZnVuY3Rpb24gKGUpIHtcblx0XHRcdFx0XHRcdENsb3VkaW5hcnlQaWNrZXIuZ29CYWNrKCk7XG5cdFx0XHRcdH07XG5cdFx0fSxcblxuXHRcdC8qXG4gIG9wdGlvbnM6IHtcbiAgXHRvblNlbGVjdDogaXQgZXhwZWN0cyBhIGZ1bmN0aW9uLiBUaGlzIGZ1bmN0aW9uIHdpbGwgYmUgaW52b2tlZCBleGFjdGx5IGF0IHRoZSBtb21lbnQgdGhlIHVzZXIgcGlja3NcbiAgXHRcdGEgZmlsZSBmcm9tIGNsb3VkaW5hcnkuIFRoZSBmdW5jdGlvbiB3aWxsIHRha2UganVzdCBvbmUgcGFyYW0gd2hpY2ggaXMgdGhlIHNlbGVjdGVkIGl0ZW0gb2JqZWN0XG4gICAgY2xvc2VPbkVzYzogdHJ1ZSAvIGZhbHNlXG4gIH1cbiAgICovXG5cdFx0b3Blbk1vZGFsOiBmdW5jdGlvbiBvcGVuTW9kYWwob3B0aW9ucykge1xuXHRcdFx0XHRDbG91ZGluYXJ5UGlja2VyLmluaXRpYWxpc2UoKTtcblx0XHRcdFx0aW5pdE9wdGlvbnMgPSBvcHRpb25zO1xuXHRcdFx0XHREb20uYWRkQ2xhc3MoZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoJ2JhYy0tY2xvdWRpbmFyeS0tbW9kYWwnKSwgJ2lzLW9wZW4nKTtcblx0XHRcdFx0Q2xvdWRpbmFyeVBpY2tlci5nZXRJbWFnZXMoe1xuXHRcdFx0XHRcdFx0cGFnZTogMSxcblx0XHRcdFx0XHRcdGxpbWl0OiBsaW1pdFxuXHRcdFx0XHR9KTtcblx0XHR9LFxuXG5cdFx0Y2xvc2VNb2RhbDogZnVuY3Rpb24gY2xvc2VNb2RhbCgpIHtcblx0XHRcdFx0RG9tLnJlbW92ZUNsYXNzKGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKCdiYWMtLWNsb3VkaW5hcnktLW1vZGFsJyksICdpcy1vcGVuJyk7XG5cdFx0fSxcblxuXHRcdGdldEltYWdlczogZnVuY3Rpb24gZ2V0SW1hZ2VzKG9wdGlvbnMpIHtcblx0XHRcdFx0Ly8gVE9ETyBtYWtlIHRoZSBjYWxsIGFuZCBnZXQgdGhlIGltYWdlc1xuXG5cdFx0XHRcdENhbGxlci5tYWtlQ2FsbCh7XG5cdFx0XHRcdFx0XHR0eXBlOiAnR0VUJyxcblx0XHRcdFx0XHRcdGVuZHBvaW50OiBTdG9yZS5nZXRDbG91ZGluYXJ5RW5kcG9pbnQoKSxcblx0XHRcdFx0XHRcdHBhcmFtczogb3B0aW9ucyxcblx0XHRcdFx0XHRcdGNhbGxiYWNrczoge1xuXHRcdFx0XHRcdFx0XHRcdHN1Y2Nlc3M6IGZ1bmN0aW9uIHN1Y2Nlc3MocmVzdWx0KSB7XG5cdFx0XHRcdFx0XHRcdFx0XHRcdENsb3VkaW5hcnlQaWNrZXIub25JbWFnZXNSZXNwb25zZShyZXN1bHQpO1xuXHRcdFx0XHRcdFx0XHRcdH0sXG5cdFx0XHRcdFx0XHRcdFx0ZmFpbDogZnVuY3Rpb24gZmFpbChlcnIpIHtcblx0XHRcdFx0XHRcdFx0XHRcdFx0YWxlcnQoZXJyKTtcblx0XHRcdFx0XHRcdFx0XHR9XG5cdFx0XHRcdFx0XHR9XG5cdFx0XHRcdH0pO1xuXHRcdH0sXG5cblx0XHRoYW5kbGVTZWFyY2g6IGZ1bmN0aW9uIGhhbmRsZVNlYXJjaChlKSB7XG5cdFx0XHRcdGlmIChkZWJvdW5jZWRUaW1lb3V0KSB7XG5cdFx0XHRcdFx0XHRjbGVhclRpbWVvdXQoZGVib3VuY2VkVGltZW91dCk7XG5cdFx0XHRcdH1cblxuXHRcdFx0XHRpZiAoZS50YXJnZXQudmFsdWUgPT09IGN1cnJlbnRRdWVyeSkge1xuXHRcdFx0XHRcdFx0cmV0dXJuO1xuXHRcdFx0XHR9XG5cblx0XHRcdFx0dmFyIHF1ZXJ5ID0gZS50YXJnZXQudmFsdWU7XG5cblx0XHRcdFx0Y3VycmVudFF1ZXJ5ID0gcXVlcnk7XG5cblx0XHRcdFx0dmFyIG9wdGlvbnMgPSB7XG5cdFx0XHRcdFx0XHRwYWdlOiAxLFxuXHRcdFx0XHRcdFx0bGltaXQ6IGxpbWl0LFxuXHRcdFx0XHRcdFx0cXVlcnk6IHF1ZXJ5XG5cdFx0XHRcdH07XG5cblx0XHRcdFx0ZGVib3VuY2VkVGltZW91dCA9IHNldFRpbWVvdXQoZnVuY3Rpb24gKCkge1xuXHRcdFx0XHRcdFx0Q2xvdWRpbmFyeVBpY2tlci5nZXRJbWFnZXMob3B0aW9ucyk7XG5cdFx0XHRcdH0sIGxhdGVuY3kpO1xuXHRcdH0sXG5cblx0XHRpdGVtU2VsZWN0ZWQ6IGZ1bmN0aW9uIGl0ZW1TZWxlY3RlZChpdGVtLCBlKSB7XG5cblx0XHRcdFx0aWYgKGl0ZW0udHlwZSA9PSAnZm9sZGVyJykge1xuXG5cdFx0XHRcdFx0XHR2YXIgcGFyYW1zID0ge1xuXHRcdFx0XHRcdFx0XHRcdHBhZ2U6IDEsXG5cdFx0XHRcdFx0XHRcdFx0bGltaXQ6IGxpbWl0LFxuXHRcdFx0XHRcdFx0XHRcdHBhcmVudDogaXRlbS5pZFxuXHRcdFx0XHRcdFx0fTtcblxuXHRcdFx0XHRcdFx0Ly8gVE9ETyBzZXQgc2VhcmNoIGlucHV0J3MgdmFsdWUgPSAnJ1xuXHRcdFx0XHRcdFx0Y3VycmVudFF1ZXJ5ID0gJyc7XG5cblx0XHRcdFx0XHRcdENsb3VkaW5hcnlQaWNrZXIuZ2V0SW1hZ2VzKHBhcmFtcyk7XG5cdFx0XHRcdH0gZWxzZSB7XG5cdFx0XHRcdFx0XHRpbml0T3B0aW9ucy5vblNlbGVjdChpdGVtKTtcblx0XHRcdFx0XHRcdENsb3VkaW5hcnlQaWNrZXIuY2xvc2VNb2RhbCgpO1xuXHRcdFx0XHR9XG5cdFx0fSxcblxuXHRcdG9uSW1hZ2VzUmVzcG9uc2U6IGZ1bmN0aW9uIG9uSW1hZ2VzUmVzcG9uc2UoZGF0YSkge1xuXG5cdFx0XHRcdHBhZ2luYXRpb25EYXRhID0gUGFnaW5hdGlvbkhlbHBlci5nZXRQYWdlc1JhbmdlKGN1cnJlbnRQYWdlLCBNYXRoLmNlaWwoZGF0YS5tZXRhLnRvdGFsIC8gbGltaXQpKTtcblxuXHRcdFx0XHRtZXRhRGF0YSA9IGRhdGEubWV0YTtcblx0XHRcdFx0aXRlbXMgPSBkYXRhLmFzc2V0cztcblxuXHRcdFx0XHRDbG91ZGluYXJ5UGlja2VyLnJlbmRlcigpO1xuXHRcdH0sXG5cblx0XHRyZW5kZXJQYWdpbmF0aW9uQnV0dG9uczogZnVuY3Rpb24gcmVuZGVyUGFnaW5hdGlvbkJ1dHRvbnMoKSB7XG5cdFx0XHRcdHZhciB0b1JldHVybiA9IFtdO1xuXG5cdFx0XHRcdHZhciBjcmVhdGVQYWdpbmF0aW9uRWxlbWVudCA9IGZ1bmN0aW9uIGNyZWF0ZVBhZ2luYXRpb25FbGVtZW50KGFDbGFzc05hbWUsIGFGdW5jdGlvbiwgc3BhbkNsYXNzTmFtZSwgc3BhbkNvbnRlbnQpIHtcblx0XHRcdFx0XHRcdHZhciBsaSA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoJ2xpJyk7XG5cdFx0XHRcdFx0XHR2YXIgYSA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoJ2EnKTtcblx0XHRcdFx0XHRcdGxpLmNsYXNzTmFtZSA9IGFDbGFzc05hbWU7XG5cdFx0XHRcdFx0XHRhLm9uY2xpY2sgPSBhRnVuY3Rpb247XG5cdFx0XHRcdFx0XHR2YXIgc3BhbiA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoJ3NwYW4nKTtcblx0XHRcdFx0XHRcdHNwYW4uY2xhc3NOYW1lID0gc3BhbkNsYXNzTmFtZTtcblx0XHRcdFx0XHRcdGlmIChzcGFuQ29udGVudCkge1xuXHRcdFx0XHRcdFx0XHRcdHNwYW4uaW5uZXJIVE1MID0gc3BhbkNvbnRlbnQ7XG5cdFx0XHRcdFx0XHR9XG5cdFx0XHRcdFx0XHRhLmFwcGVuZENoaWxkKHNwYW4pO1xuXHRcdFx0XHRcdFx0bGkuYXBwZW5kQ2hpbGQoYSk7XG5cdFx0XHRcdFx0XHRyZXR1cm4gbGk7XG5cdFx0XHRcdH07XG5cblx0XHRcdFx0aWYgKHBhZ2luYXRpb25EYXRhLmhhc1ByZXZpb3VzKSB7XG5cdFx0XHRcdFx0XHR0b1JldHVybi5wdXNoKGNyZWF0ZVBhZ2luYXRpb25FbGVtZW50KCdkaXNhYmxlZCcsIGZ1bmN0aW9uIChlKSB7XG5cdFx0XHRcdFx0XHRcdFx0ZS5wcmV2ZW50RGVmYXVsdCgpO1xuXHRcdFx0XHRcdFx0XHRcdENsb3VkaW5hcnlQaWNrZXIuX2dvVG9QYWdlKDEpO1xuXHRcdFx0XHRcdFx0fSwgJ2ZhIGZhLWFuZ2xlLWRvdWJsZS1sZWZ0JykpO1xuXHRcdFx0XHRcdFx0dG9SZXR1cm4ucHVzaChjcmVhdGVQYWdpbmF0aW9uRWxlbWVudCgnZGlzYWJsZWQnLCBmdW5jdGlvbiAoZSkge1xuXHRcdFx0XHRcdFx0XHRcdGUucHJldmVudERlZmF1bHQoKTtcblx0XHRcdFx0XHRcdFx0XHRDbG91ZGluYXJ5UGlja2VyLl9nb1RvUGFnZShjdXJyZW50UGFnZSAtIDEpO1xuXHRcdFx0XHRcdFx0fSwgJ2ZhIGZhLWFuZ2xlLWxlZnQnKSk7XG5cdFx0XHRcdH1cblxuXHRcdFx0XHRmb3IgKHZhciBpID0gMDsgaSA8IHBhZ2luYXRpb25EYXRhLmJ1dHRvbnMubGVuZ3RoOyBpKyspIHtcblx0XHRcdFx0XHRcdChmdW5jdGlvbiAoaSkge1xuXHRcdFx0XHRcdFx0XHRcdHZhciBidG4gPSBwYWdpbmF0aW9uRGF0YS5idXR0b25zW2ldO1xuXHRcdFx0XHRcdFx0XHRcdHRvUmV0dXJuLnB1c2goY3JlYXRlUGFnaW5hdGlvbkVsZW1lbnQoYnRuLnJ1bm5pbmdwYWdlID8gXCJhY3RpdmVcIiA6IFwiLVwiLCBmdW5jdGlvbiAoZSkge1xuXHRcdFx0XHRcdFx0XHRcdFx0XHRlLnByZXZlbnREZWZhdWx0KCk7XG5cdFx0XHRcdFx0XHRcdFx0XHRcdENsb3VkaW5hcnlQaWNrZXIuX2dvVG9QYWdlKGJ0bi5wYWdlbm8pO1xuXHRcdFx0XHRcdFx0XHRcdH0sICdudW1iZXInLCBidG4ucGFnZW5vKSk7XG5cdFx0XHRcdFx0XHR9KShpKTtcblx0XHRcdFx0fVxuXG5cdFx0XHRcdGlmIChwYWdpbmF0aW9uRGF0YS5oYXNOZXh0KSB7XG5cdFx0XHRcdFx0XHR0b1JldHVybi5wdXNoKGNyZWF0ZVBhZ2luYXRpb25FbGVtZW50KCdkaXNhYmxlZCcsIGZ1bmN0aW9uIChlKSB7XG5cdFx0XHRcdFx0XHRcdFx0ZS5wcmV2ZW50RGVmYXVsdCgpO1xuXHRcdFx0XHRcdFx0XHRcdENsb3VkaW5hcnlQaWNrZXIuX2dvVG9QYWdlKGN1cnJlbnRQYWdlICsgMSk7XG5cdFx0XHRcdFx0XHR9LCAnZmEgZmEtYW5nbGUtcmlnaHQnKSk7XG5cdFx0XHRcdFx0XHR0b1JldHVybi5wdXNoKGNyZWF0ZVBhZ2luYXRpb25FbGVtZW50KCdkaXNhYmxlZCcsIGZ1bmN0aW9uIChlKSB7XG5cdFx0XHRcdFx0XHRcdFx0ZS5wcmV2ZW50RGVmYXVsdCgpO1xuXHRcdFx0XHRcdFx0XHRcdENsb3VkaW5hcnlQaWNrZXIuX2dvVG9QYWdlKE1hdGguY2VpbChtZXRhRGF0YS50b3RhbCAvIGxpbWl0KSk7XG5cdFx0XHRcdFx0XHR9LCAnZmEgZmEtYW5nbGUtZG91YmxlLXJpZ2h0JykpO1xuXHRcdFx0XHR9XG5cblx0XHRcdFx0ZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoJ2JhYy0tY2xvdWRpbmFyeS1hY3R1YWwtcGFnaW5hdGlvbi1jb250YWluZXInKS5pbm5lckhUTUwgPSAnJztcblx0XHRcdFx0Zm9yICh2YXIgX2kgPSAwOyBfaSA8IHRvUmV0dXJuLmxlbmd0aDsgX2krKykge1xuXHRcdFx0XHRcdFx0ZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoJ2JhYy0tY2xvdWRpbmFyeS1hY3R1YWwtcGFnaW5hdGlvbi1jb250YWluZXInKS5hcHBlbmRDaGlsZCh0b1JldHVybltfaV0pO1xuXHRcdFx0XHR9XG5cdFx0fSxcblxuXHRcdF9nb1RvUGFnZTogZnVuY3Rpb24gX2dvVG9QYWdlKHBhZ2UpIHtcblxuXHRcdFx0XHRpZiAocGFnZSA9PT0gY3VycmVudFBhZ2UpIHtcblx0XHRcdFx0XHRcdHJldHVybjtcblx0XHRcdFx0fVxuXG5cdFx0XHRcdHZhciBwYXJhbXMgPSB7XG5cdFx0XHRcdFx0XHRwYWdlOiBwYWdlLFxuXHRcdFx0XHRcdFx0bGltaXQ6IGxpbWl0XG5cdFx0XHRcdH07XG5cblx0XHRcdFx0aWYgKG1ldGFEYXRhLmFzc2V0KSB7XG5cdFx0XHRcdFx0XHRwYXJhbXMucGFyZW50ID0gbWV0YURhdGEuYXNzZXQ7XG5cdFx0XHRcdH1cblx0XHRcdFx0aWYgKGN1cnJlbnRRdWVyeSkge1xuXHRcdFx0XHRcdFx0cGFyYW1zLnF1ZXJ5ID0gY3VycmVudFF1ZXJ5O1xuXHRcdFx0XHR9XG5cblx0XHRcdFx0Y3VycmVudFBhZ2UgPSBwYWdlO1xuXG5cdFx0XHRcdENsb3VkaW5hcnlQaWNrZXIuZ2V0SW1hZ2VzKHBhcmFtcyk7XG5cdFx0fSxcblxuXHRcdGdvQmFjazogZnVuY3Rpb24gZ29CYWNrKCkge1xuXG5cdFx0XHRcdHZhciBwYXJhbXMgPSB7XG5cdFx0XHRcdFx0XHRwYWdlOiAxLFxuXHRcdFx0XHRcdFx0bGltaXQ6IGxpbWl0XG5cdFx0XHRcdH07XG5cdFx0XHRcdGlmIChtZXRhRGF0YS5wYXJlbnQpIHtcblx0XHRcdFx0XHRcdHBhcmFtcy5wYXJlbnQgPSBtZXRhRGF0YS5wYXJlbnQ7XG5cdFx0XHRcdH1cblx0XHRcdFx0aWYgKGN1cnJlbnRRdWVyeSkge1xuXHRcdFx0XHRcdFx0cGFyYW1zLnF1ZXJ5ID0gY3VycmVudFF1ZXJ5O1xuXHRcdFx0XHR9XG5cdFx0XHRcdENsb3VkaW5hcnlQaWNrZXIuZ2V0SW1hZ2VzKHBhcmFtcyk7XG5cdFx0fSxcblxuXHRcdHJlbmRlckl0ZW1zOiBmdW5jdGlvbiByZW5kZXJJdGVtcygpIHtcblx0XHRcdFx0dmFyIG9uZUl0ZW0gPSBmdW5jdGlvbiBvbmVJdGVtKGl0ZW0pIHtcblx0XHRcdFx0XHRcdHZhciBpdGVtSWNvbiA9IGZ1bmN0aW9uIGl0ZW1JY29uKCkge1xuXHRcdFx0XHRcdFx0XHRcdGlmIChpdGVtLnR5cGUgIT0gJ2ZvbGRlcicpIHtcblx0XHRcdFx0XHRcdFx0XHRcdFx0cmV0dXJuICc8aW1nIHNyYz0nICsgaXRlbS50aHVtYiArICcgYWx0PVwiXCIvPic7XG5cdFx0XHRcdFx0XHRcdFx0fSBlbHNlIHtcblx0XHRcdFx0XHRcdFx0XHRcdFx0cmV0dXJuICc8aSBjbGFzcz1cImZhIGZhLWZvbGRlci1vXCI+PC9pPic7XG5cdFx0XHRcdFx0XHRcdFx0fVxuXHRcdFx0XHRcdFx0fTtcblxuXHRcdFx0XHRcdFx0dmFyIGZ1bmN0ID0gZnVuY3Rpb24gZnVuY3QoKSB7XG5cdFx0XHRcdFx0XHRcdFx0Q2xvdWRpbmFyeVBpY2tlci5pdGVtU2VsZWN0ZWQoaXRlbSk7XG5cdFx0XHRcdFx0XHR9O1xuXG5cdFx0XHRcdFx0XHR2YXIgbmV3RG9tRWwgPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KCdkaXYnKTtcblx0XHRcdFx0XHRcdG5ld0RvbUVsLmNsYXNzTmFtZSA9IFwiY2xvdWQtaW1hZ2VzX19pdGVtXCI7XG5cdFx0XHRcdFx0XHRuZXdEb21FbC5vbmNsaWNrID0gZnVuY3Q7XG5cdFx0XHRcdFx0XHRuZXdEb21FbC5pbm5lckhUTUwgPSAnXFxuXFx0XFx0XFx0XFx0XFx0XFx0ICA8ZGl2IGNsYXNzPVwiY2xvdWQtaW1hZ2VzX19pdGVtX190eXBlXCI+XFxuXFx0XFx0XFx0XFx0XFx0XFx0XFx0XFx0JyArIGl0ZW1JY29uKCkgKyAnXFxuXFx0XFx0XFx0XFx0XFx0XFx0ICA8L2Rpdj5cXG5cXHRcXHRcXHRcXHRcXHRcXHQgIDxkaXYgY2xhc3M9XCJjbG91ZC1pbWFnZXNfX2l0ZW1fX2RldGFpbHNcIj5cXG5cXHRcXHRcXHRcXHRcXHRcXHRcXHRcXHQ8c3BhbiBjbGFzcz1cImNsb3VkLWltYWdlc19faXRlbV9fZGV0YWlsc19fbmFtZVwiPicgKyBpdGVtLm5hbWUgKyAnPC9zcGFuPlxcblxcdFxcdFxcdFxcdFxcdFxcdFxcdFxcdDxzcGFuIGNsYXNzPVwiY2xvdWQtaW1hZ2VzX19pdGVtX19kZXRhaWxzX19kYXRlXCI+JyArIGl0ZW0uY3JkYXRlICsgJzwvc3Bhbj5cXG5cXHRcXHRcXHRcXHRcXHRcXHQgIDwvZGl2PlxcblxcdFxcdFxcdFxcdFxcdFxcdCAgPGRpdiBjbGFzcz1cImNsb3VkLWltYWdlc19faXRlbV9fYWN0aW9uc1wiPlxcblxcdFxcdFxcdFxcdFxcdFxcdFxcdFxcdDxhIGNsYXNzPVwiZmEgZmEtcGVuY2lsXCI+PC9hPlxcblxcdFxcdFxcdFxcdFxcdFxcdCAgPC9kaXY+Jztcblx0XHRcdFx0XHRcdHJldHVybiBuZXdEb21FbDtcblx0XHRcdFx0fTtcblxuXHRcdFx0XHRkb2N1bWVudC5nZXRFbGVtZW50QnlJZCgnYmFjLS1jbG91ZGluYXJ5LWl0YW1zLWNvbnRhaW5lcicpLmlubmVySFRNTCA9ICcnO1xuXHRcdFx0XHRmb3IgKHZhciBpID0gMDsgaSA8IGl0ZW1zLmxlbmd0aDsgaSsrKSB7XG5cdFx0XHRcdFx0XHRkb2N1bWVudC5nZXRFbGVtZW50QnlJZCgnYmFjLS1jbG91ZGluYXJ5LWl0YW1zLWNvbnRhaW5lcicpLmFwcGVuZENoaWxkKG9uZUl0ZW0oaXRlbXNbaV0pKTtcblx0XHRcdFx0fVxuXHRcdH0sXG5cblx0XHRyZW5kZXI6IGZ1bmN0aW9uIHJlbmRlcigpIHtcblx0XHRcdFx0aWYgKG1ldGFEYXRhLmFzc2V0KSB7XG5cdFx0XHRcdFx0XHREb20ucmVtb3ZlQ2xhc3MoZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoJ2JhYy0tY2xvdWRpbmFyeS0tYmFjay1idXR0b24tY29udGFpbmVyJyksICdoZG4nKTtcblx0XHRcdFx0fSBlbHNlIHtcblx0XHRcdFx0XHRcdERvbS5hZGRDbGFzcyhkb2N1bWVudC5nZXRFbGVtZW50QnlJZCgnYmFjLS1jbG91ZGluYXJ5LS1iYWNrLWJ1dHRvbi1jb250YWluZXInKSwgJ2hkbicpO1xuXHRcdFx0XHR9XG5cblx0XHRcdFx0Q2xvdWRpbmFyeVBpY2tlci5yZW5kZXJJdGVtcygpO1xuXG5cdFx0XHRcdGlmIChtZXRhRGF0YS50b3RhbCA+IGxpbWl0KSB7XG5cdFx0XHRcdFx0XHREb20ucmVtb3ZlQ2xhc3MoZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoJ2JhYy0tY2xvdWRpbmFyeS1wYWdpbmF0aW9uLWNvbnRhaW5lcicpLCAnaGRuJyk7XG5cdFx0XHRcdFx0XHRDbG91ZGluYXJ5UGlja2VyLnJlbmRlclBhZ2luYXRpb25CdXR0b25zKCk7XG5cdFx0XHRcdH0gZWxzZSB7XG5cdFx0XHRcdFx0XHREb20uYWRkQ2xhc3MoZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoJ2JhYy0tY2xvdWRpbmFyeS1wYWdpbmF0aW9uLWNvbnRhaW5lcicpLCAnaGRuJyk7XG5cdFx0XHRcdH1cblx0XHR9XG59O1xuXG5tb2R1bGUuZXhwb3J0cyA9IENsb3VkaW5hcnlQaWNrZXI7IiwidmFyIERvbSA9IHtcbiAgICBoYXNDbGFzczogZnVuY3Rpb24gaGFzQ2xhc3MoZWwsIGNsYXNzTmFtZSkge1xuICAgICAgICBpZiAoZWwuY2xhc3NMaXN0KSByZXR1cm4gZWwuY2xhc3NMaXN0LmNvbnRhaW5zKGNsYXNzTmFtZSk7ZWxzZSByZXR1cm4gbmV3IFJlZ0V4cCgnKF58ICknICsgY2xhc3NOYW1lICsgJyggfCQpJywgJ2dpJykudGVzdChlbC5jbGFzc05hbWUpO1xuICAgIH0sXG5cbiAgICByZW1vdmVDbGFzczogZnVuY3Rpb24gcmVtb3ZlQ2xhc3MoZWwsIGNsYXNzTmFtZSkge1xuICAgICAgICBpZiAoZWwuY2xhc3NMaXN0KSBlbC5jbGFzc0xpc3QucmVtb3ZlKGNsYXNzTmFtZSk7ZWxzZSBlbC5jbGFzc05hbWUgPSBlbC5jbGFzc05hbWUucmVwbGFjZShuZXcgUmVnRXhwKCcoXnxcXFxcYiknICsgY2xhc3NOYW1lLnNwbGl0KCcgJykuam9pbignfCcpICsgJyhcXFxcYnwkKScsICdnaScpLCAnICcpO1xuICAgIH0sXG5cbiAgICBhZGRDbGFzczogZnVuY3Rpb24gYWRkQ2xhc3MoZWwsIGNsYXNzTmFtZSkge1xuICAgICAgICBpZiAoZWwuY2xhc3NMaXN0KSBlbC5jbGFzc0xpc3QuYWRkKGNsYXNzTmFtZSk7ZWxzZSBlbC5jbGFzc05hbWUgKz0gJyAnICsgY2xhc3NOYW1lO1xuICAgIH0sXG5cbiAgICB0b2dnbGVDbGFzczogZnVuY3Rpb24gdG9nZ2xlQ2xhc3MoZWwsIGNsYXNzTmFtZSkge1xuICAgICAgICBpZiAodGhpcy5oYXNDbGFzcyhlbCwgY2xhc3NOYW1lKSkge1xuICAgICAgICAgICAgdGhpcy5yZW1vdmVDbGFzcyhlbCwgY2xhc3NOYW1lKTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIHRoaXMuYWRkQ2xhc3MoZWwsIGNsYXNzTmFtZSk7XG4gICAgICAgIH1cbiAgICB9XG59O1xuXG5tb2R1bGUuZXhwb3J0cyA9IERvbTsiLCJ2YXIgZG9tID0gcmVxdWlyZSgnLi9kb20nKTtcblxudmFyIGRlZmF1bHRIaWRlSW4gPSA1MDAwO1xudmFyIGxhc3RJbmRleCA9IDE7XG5cbnZhciBpbmZvQmxvY2tzID0gW107XG5cbnZhciBJbmZvQ29udHJvbGxlciA9IHtcblx0aW5pdDogZnVuY3Rpb24gaW5pdCgpIHtcblx0XHRmb3IgKHZhciBpID0gMTsgaSA8IDU7IGkrKykge1xuXHRcdFx0KGZ1bmN0aW9uIHgoaSkge1xuXHRcdFx0XHR2YXIgY2xvc2VGdW5jdGlvbiA9IGZ1bmN0aW9uIGNsb3NlRnVuY3Rpb24oKSB7XG5cdFx0XHRcdFx0ZG9tLnJlbW92ZUNsYXNzKGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKCdiYWMtLXB1cmVzZGstaW5mby1ib3gtLScgKyBpKSwgJ2JhYy0tYWN0aXZlLS0nKTtcblx0XHRcdFx0XHRkb2N1bWVudC5nZXRFbGVtZW50QnlJZCgnYmFjLS10aW1lcicgKyBpKS5zdHlsZS50cmFuc2l0aW9uID0gJyc7XG5cdFx0XHRcdFx0ZG9tLnJlbW92ZUNsYXNzKGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKCdiYWMtLXRpbWVyJyArIGkpLCAnYmFjLS1mdWxsd2lkdGgnKTtcblx0XHRcdFx0XHRpbmZvQmxvY2tzW2kgLSAxXS5pblVzZSA9IGZhbHNlO1xuXHRcdFx0XHRcdHNldFRpbWVvdXQoZnVuY3Rpb24gKCkge1xuXHRcdFx0XHRcdFx0aWYgKGluZm9CbG9ja3NbaSAtIDFdLmNsb3NlVGltZW91dCkge1xuXHRcdFx0XHRcdFx0XHRjbGVhclRpbWVvdXQoaW5mb0Jsb2Nrc1tpIC0gMV0uY2xvc2VUaW1lb3V0KTtcblx0XHRcdFx0XHRcdH1cblx0XHRcdFx0XHRcdGRvbS5yZW1vdmVDbGFzcyhkb2N1bWVudC5nZXRFbGVtZW50QnlJZCgnYmFjLS1wdXJlc2RrLWluZm8tYm94LS0nICsgaSksICdiYWMtLXN1Y2Nlc3MnKTtcblx0XHRcdFx0XHRcdGRvbS5yZW1vdmVDbGFzcyhkb2N1bWVudC5nZXRFbGVtZW50QnlJZCgnYmFjLS1wdXJlc2RrLWluZm8tYm94LS0nICsgaSksICdiYWMtLWluZm8nKTtcblx0XHRcdFx0XHRcdGRvbS5yZW1vdmVDbGFzcyhkb2N1bWVudC5nZXRFbGVtZW50QnlJZCgnYmFjLS1wdXJlc2RrLWluZm8tYm94LS0nICsgaSksICdiYWMtLXdhcm5pbmcnKTtcblx0XHRcdFx0XHRcdGRvbS5yZW1vdmVDbGFzcyhkb2N1bWVudC5nZXRFbGVtZW50QnlJZCgnYmFjLS1wdXJlc2RrLWluZm8tYm94LS0nICsgaSksICdiYWMtLWVycm9yJyk7XG5cdFx0XHRcdFx0fSwgNDUwKTtcblx0XHRcdFx0fTtcblxuXHRcdFx0XHR2YXIgYWRkVGV4dCA9IGZ1bmN0aW9uIGFkZFRleHQodGV4dCkge1xuXHRcdFx0XHRcdGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKCdiYWMtLWluZm8tbWFpbi10ZXh0LS0nICsgaSkuaW5uZXJIVE1MID0gdGV4dDtcblx0XHRcdFx0fTtcblxuXHRcdFx0XHR2YXIgYWRkVGltZW91dCA9IGZ1bmN0aW9uIGFkZFRpbWVvdXQodGltZW91dE1zZWNzKSB7XG5cdFx0XHRcdFx0ZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoJ2JhYy0tdGltZXInICsgaSkuc3R5bGUudHJhbnNpdGlvbiA9ICd3aWR0aCAnICsgdGltZW91dE1zZWNzICsgJ21zJztcblx0XHRcdFx0XHRkb20uYWRkQ2xhc3MoZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoJ2JhYy0tdGltZXInICsgaSksICdiYWMtLWZ1bGx3aWR0aCcpO1xuXHRcdFx0XHRcdGluZm9CbG9ja3NbaSAtIDFdLmNsb3NlVGltZW91dCA9IHNldFRpbWVvdXQoZnVuY3Rpb24gKCkge1xuXHRcdFx0XHRcdFx0aW5mb0Jsb2Nrc1tpIC0gMV0uY2xvc2VGdW5jdGlvbigpO1xuXHRcdFx0XHRcdH0sIHRpbWVvdXRNc2Vjcyk7XG5cdFx0XHRcdH07XG5cblx0XHRcdFx0aW5mb0Jsb2Nrcy5wdXNoKHtcblx0XHRcdFx0XHRpZDogaSxcblx0XHRcdFx0XHRpblVzZTogZmFsc2UsXG5cdFx0XHRcdFx0ZWxlbWVudDogZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoJ2JhYy0tcHVyZXNkay1pbmZvLWJveC0tJyArIGkpLFxuXHRcdFx0XHRcdGNsb3NlRnVuY3Rpb246IGNsb3NlRnVuY3Rpb24sXG5cdFx0XHRcdFx0YWRkVGV4dDogYWRkVGV4dCxcblx0XHRcdFx0XHRhZGRUaW1lb3V0OiBhZGRUaW1lb3V0LFxuXHRcdFx0XHRcdGNsb3NlVGltZW91dDogZmFsc2Vcblx0XHRcdFx0fSk7XG5cdFx0XHRcdGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKCdiYWMtLWluZm8tY2xvc2UtYnV0dG9uLS0nICsgaSkub25jbGljayA9IGZ1bmN0aW9uIChlKSB7XG5cdFx0XHRcdFx0Y2xvc2VGdW5jdGlvbihpKTtcblx0XHRcdFx0fTtcblx0XHRcdH0pKGkpO1xuXHRcdH1cblx0fSxcblxuXHQvKlxuICB0eXBlOiBvbmUgb2Y6XG4gXHQtIHN1Y2Nlc3NcbiBcdC0gaW5mb1xuIFx0LSB3YXJuaW5nXG4gXHQtIGVycm9yXG4gIHRleHQ6IHRoZSB0ZXh0IHRvIGRpc3BsYXlcbiAgb3B0aW9ucyAob3B0aW9uYWwpOiB7XG4gIFx0XHRoaWRlSW46IG1pbGxpc2Vjb25kcyB0byBoaWRlIGl0LiAtMSBmb3Igbm90IGhpZGluZyBpdCBhdCBhbGwuIERlZmF1bHQgaXMgNTAwMFxuICB9XG4gICovXG5cdHNob3dJbmZvOiBmdW5jdGlvbiBzaG93SW5mbyh0eXBlLCB0ZXh0LCBvcHRpb25zKSB7XG5cdFx0Zm9yICh2YXIgaSA9IDA7IGkgPCBpbmZvQmxvY2tzLmxlbmd0aDsgaSsrKSB7XG5cdFx0XHR2YXIgaW5mb0Jsb2NrID0gaW5mb0Jsb2Nrc1tpXTtcblx0XHRcdGlmICghaW5mb0Jsb2NrLmluVXNlKSB7XG5cdFx0XHRcdGluZm9CbG9jay5pblVzZSA9IHRydWU7XG5cdFx0XHRcdGluZm9CbG9jay5lbGVtZW50LnN0eWxlLnpJbmRleCA9IGxhc3RJbmRleDtcblx0XHRcdFx0aW5mb0Jsb2NrLmFkZFRleHQodGV4dCk7XG5cdFx0XHRcdGxhc3RJbmRleCArPSAxO1xuXHRcdFx0XHR2YXIgdGltZW91dG1TZWNzID0gZGVmYXVsdEhpZGVJbjtcblx0XHRcdFx0dmFyIGF1dG9DbG9zZSA9IHRydWU7XG5cdFx0XHRcdGlmIChvcHRpb25zKSB7XG5cdFx0XHRcdFx0aWYgKG9wdGlvbnMuaGlkZUluICE9IG51bGwgJiYgb3B0aW9ucy5oaWRlSW4gIT0gdW5kZWZpbmVkICYmIG9wdGlvbnMuaGlkZUluICE9IC0xKSB7XG5cdFx0XHRcdFx0XHR0aW1lb3V0bVNlY3MgPSBvcHRpb25zLmhpZGVJbjtcblx0XHRcdFx0XHR9IGVsc2UgaWYgKG9wdGlvbnMuaGlkZUluID09PSAtMSkge1xuXHRcdFx0XHRcdFx0YXV0b0Nsb3NlID0gZmFsc2U7XG5cdFx0XHRcdFx0fVxuXHRcdFx0XHR9XG5cdFx0XHRcdGlmIChhdXRvQ2xvc2UpIHtcblx0XHRcdFx0XHRpbmZvQmxvY2suYWRkVGltZW91dCh0aW1lb3V0bVNlY3MpO1xuXHRcdFx0XHR9XG5cdFx0XHRcdGRvbS5hZGRDbGFzcyhpbmZvQmxvY2suZWxlbWVudCwgJ2JhYy0tJyArIHR5cGUpO1xuXHRcdFx0XHRkb20uYWRkQ2xhc3MoaW5mb0Jsb2NrLmVsZW1lbnQsICdiYWMtLWFjdGl2ZS0tJyk7XG5cdFx0XHRcdHJldHVybjtcblx0XHRcdH1cblx0XHR9XG5cdH1cbn07XG5cbm1vZHVsZS5leHBvcnRzID0gSW5mb0NvbnRyb2xsZXI7IiwidmFyIFN0b3JlID0gcmVxdWlyZSgnLi9zdG9yZS5qcycpO1xuXG52YXIgTG9nZ2VyID0ge1xuXHRcdGxvZzogZnVuY3Rpb24gbG9nKHdoYXQpIHtcblx0XHRcdFx0aWYgKCFTdG9yZS5sb2dzRW5hYmxlZCgpKSB7XG5cdFx0XHRcdFx0XHRyZXR1cm4gZmFsc2U7XG5cdFx0XHRcdH0gZWxzZSB7XG5cdFx0XHRcdFx0XHRMb2dnZXIubG9nID0gY29uc29sZS5sb2cuYmluZChjb25zb2xlKTtcblx0XHRcdFx0XHRcdExvZ2dlci5sb2cod2hhdCk7XG5cdFx0XHRcdH1cblx0XHR9LFxuXHRcdGVycm9yOiBmdW5jdGlvbiBlcnJvcihlcnIpIHtcblx0XHRcdFx0aWYgKCFTdG9yZS5sb2dzRW5hYmxlZCgpKSB7XG5cdFx0XHRcdFx0XHRyZXR1cm4gZmFsc2U7XG5cdFx0XHRcdH0gZWxzZSB7XG5cdFx0XHRcdFx0XHRMb2dnZXIuZXJyb3IgPSBjb25zb2xlLmVycm9yLmJpbmQoY29uc29sZSk7XG5cdFx0XHRcdFx0XHRMb2dnZXIuZXJyb3IoZXJyKTtcblx0XHRcdFx0fVxuXHRcdH1cbn07XG5cbm1vZHVsZS5leHBvcnRzID0gTG9nZ2VyOyIsInZhciBzZXR0aW5ncyA9IHtcblx0dG90YWxQYWdlQnV0dG9uc051bWJlcjogOFxufTtcblxudmFyIFBhZ2luYXRvciA9IHtcblx0c2V0U2V0dGluZ3M6IGZ1bmN0aW9uIHNldFNldHRpbmdzKHNldHRpbmcpIHtcblx0XHRmb3IgKHZhciBrZXkgaW4gc2V0dGluZykge1xuXHRcdFx0c2V0dGluZ3Nba2V5XSA9IHNldHRpbmdba2V5XTtcblx0XHR9XG5cdH0sXG5cblx0Z2V0UGFnZXNSYW5nZTogZnVuY3Rpb24gZ2V0UGFnZXNSYW5nZShjdXJwYWdlLCB0b3RhbFBhZ2VzT25SZXN1bHRTZXQpIHtcblx0XHR2YXIgcGFnZVJhbmdlID0gW3sgcGFnZW5vOiBjdXJwYWdlLCBydW5uaW5ncGFnZTogdHJ1ZSB9XTtcblx0XHR2YXIgaGFzbmV4dG9ucmlnaHQgPSB0cnVlO1xuXHRcdHZhciBoYXNuZXh0b25sZWZ0ID0gdHJ1ZTtcblx0XHR2YXIgaSA9IDE7XG5cdFx0d2hpbGUgKHBhZ2VSYW5nZS5sZW5ndGggPCBzZXR0aW5ncy50b3RhbFBhZ2VCdXR0b25zTnVtYmVyICYmIChoYXNuZXh0b25yaWdodCB8fCBoYXNuZXh0b25sZWZ0KSkge1xuXHRcdFx0aWYgKGhhc25leHRvbmxlZnQpIHtcblx0XHRcdFx0aWYgKGN1cnBhZ2UgLSBpID4gMCkge1xuXHRcdFx0XHRcdHBhZ2VSYW5nZS5wdXNoKHsgcGFnZW5vOiBjdXJwYWdlIC0gaSwgcnVubmluZ3BhZ2U6IGZhbHNlIH0pO1xuXHRcdFx0XHR9IGVsc2Uge1xuXHRcdFx0XHRcdGhhc25leHRvbmxlZnQgPSBmYWxzZTtcblx0XHRcdFx0fVxuXHRcdFx0fVxuXHRcdFx0aWYgKGhhc25leHRvbnJpZ2h0KSB7XG5cdFx0XHRcdGlmIChjdXJwYWdlICsgaSAtIDEgPCB0b3RhbFBhZ2VzT25SZXN1bHRTZXQpIHtcblx0XHRcdFx0XHRwYWdlUmFuZ2UucHVzaCh7IHBhZ2VubzogY3VycGFnZSArIGksIHJ1bm5pbmdwYWdlOiBmYWxzZSB9KTtcblx0XHRcdFx0fSBlbHNlIHtcblx0XHRcdFx0XHRoYXNuZXh0b25yaWdodCA9IGZhbHNlO1xuXHRcdFx0XHR9XG5cdFx0XHR9XG5cdFx0XHRpKys7XG5cdFx0fVxuXG5cdFx0dmFyIGhhc05leHQgPSBjdXJwYWdlIDwgdG90YWxQYWdlc09uUmVzdWx0U2V0O1xuXHRcdHZhciBoYXNQcmV2aW91cyA9IGN1cnBhZ2UgPiAxO1xuXG5cdFx0cmV0dXJuIHtcblx0XHRcdGJ1dHRvbnM6IHBhZ2VSYW5nZS5zb3J0KGZ1bmN0aW9uIChpdGVtQSwgaXRlbUIpIHtcblx0XHRcdFx0cmV0dXJuIGl0ZW1BLnBhZ2VubyAtIGl0ZW1CLnBhZ2Vubztcblx0XHRcdH0pLFxuXHRcdFx0aGFzTmV4dDogaGFzTmV4dCxcblx0XHRcdGhhc1ByZXZpb3VzOiBoYXNQcmV2aW91c1xuXHRcdH07XG5cdH1cbn07XG5cbm1vZHVsZS5leHBvcnRzID0gUGFnaW5hdG9yOyIsIid1c2Ugc3RyaWN0JztcblxudmFyIFN0b3JlID0gcmVxdWlyZSgnLi9zdG9yZS5qcycpO1xudmFyIExvZ2dlciA9IHJlcXVpcmUoJy4vbG9nZ2VyLmpzJyk7XG5cbnZhciBhdmFpbGFibGVMaXN0ZW5lcnMgPSB7XG5cdHNlYXJjaEtleVVwOiB7XG5cdFx0aW5mbzogJ0xpc3RlbmVyIG9uIGtleVVwIG9mIHNlYXJjaCBpbnB1dCBvbiB0b3AgYmFyJ1xuXHR9LFxuXHRzZWFyY2hFbnRlcjoge1xuXHRcdGluZm86ICdMaXN0ZW5lciBvbiBlbnRlciBrZXkgcHJlc3NlZCBvbiBzZWFyY2ggaW5wdXQgb24gdG9wIGJhcidcblx0fSxcblx0c2VhcmNoT25DaGFuZ2U6IHtcblx0XHRpbmZvOiAnTGlzdGVuZXIgb24gY2hhbmdlIG9mIGlucHV0IHZhbHVlJ1xuXHR9XG59O1xuXG52YXIgUHViU3ViID0ge1xuXHRnZXRBdmFpbGFibGVMaXN0ZW5lcnM6IGZ1bmN0aW9uIGdldEF2YWlsYWJsZUxpc3RlbmVycygpIHtcblx0XHRyZXR1cm4gYXZhaWxhYmxlTGlzdGVuZXJzO1xuXHR9LFxuXG5cdHN1YnNjcmliZTogZnVuY3Rpb24gc3Vic2NyaWJlKGV2ZW50dCwgZnVuY3QpIHtcblx0XHRpZiAoZXZlbnR0ID09PSBcInNlYXJjaEtleVVwXCIpIHtcblx0XHRcdHZhciBlbCA9IGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKFN0b3JlLmdldFNlYXJjaElucHV0SWQoKSk7XG5cdFx0XHRlbC5hZGRFdmVudExpc3RlbmVyKCdrZXl1cCcsIGZ1bmN0KTtcblx0XHRcdHJldHVybiBmdW5jdGlvbiAoKSB7XG5cdFx0XHRcdGVsLnJlbW92ZUV2ZW50TGlzdGVuZXIoJ2tleXVwJywgZnVuY3QsIGZhbHNlKTtcblx0XHRcdH07XG5cdFx0fSBlbHNlIGlmIChldmVudHQgPT09ICdzZWFyY2hFbnRlcicpIHtcblx0XHRcdHZhciBoYW5kbGluZ0Z1bmN0ID0gZnVuY3Rpb24gaGFuZGxpbmdGdW5jdChlKSB7XG5cdFx0XHRcdGlmIChlLmtleUNvZGUgPT09IDEzKSB7XG5cdFx0XHRcdFx0ZnVuY3QoZSk7XG5cdFx0XHRcdH1cblx0XHRcdH07XG5cdFx0XHRlbC5hZGRFdmVudExpc3RlbmVyKCdrZXlkb3duJywgaGFuZGxpbmdGdW5jdCk7XG5cdFx0XHRyZXR1cm4gZnVuY3Rpb24gKCkge1xuXHRcdFx0XHRlbC5yZW1vdmVFdmVudExpc3RlbmVyKCdrZXlkb3duJywgaGFuZGxpbmdGdW5jdCwgZmFsc2UpO1xuXHRcdFx0fTtcblx0XHR9IGVsc2UgaWYgKGV2ZW50dCA9PT0gJ3NlYXJjaE9uQ2hhbmdlJykge1xuXHRcdFx0dmFyIGVsID0gZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoU3RvcmUuZ2V0U2VhcmNoSW5wdXRJZCgpKTtcblx0XHRcdGVsLmFkZEV2ZW50TGlzdGVuZXIoJ2NoYW5nZScsIGZ1bmN0KTtcblx0XHRcdHJldHVybiBmdW5jdGlvbiAoKSB7XG5cdFx0XHRcdGVsLnJlbW92ZUV2ZW50TGlzdGVuZXIoJ2tleXVwJywgZnVuY3QsIGZhbHNlKTtcblx0XHRcdH07XG5cdFx0fSBlbHNlIHtcblx0XHRcdExvZ2dlci5lcnJvcignVGhlIGV2ZW50IHlvdSB0cmllZCB0byBzdWJzY3JpYmUgaXMgbm90IGF2YWlsYWJsZSBieSB0aGUgbGlicmFyeScpO1xuXHRcdFx0TG9nZ2VyLmxvZygnVGhlIGF2YWlsYWJsZSBldmVudHMgYXJlOiAnLCBhdmFpbGFibGVMaXN0ZW5lcnMpO1xuXHRcdFx0cmV0dXJuIGZ1bmN0aW9uICgpIHt9O1xuXHRcdH1cblx0fVxufTtcblxubW9kdWxlLmV4cG9ydHMgPSBQdWJTdWI7IiwidmFyIHN0YXRlID0ge1xuXHRnZW5lcmFsOiB7fSxcblx0dXNlckRhdGE6IHt9LFxuXHRjb25maWd1cmF0aW9uOiB7XG5cdFx0c2Vzc2lvbkVuZHBvaW50OiAnc2Vzc2lvbidcblx0fSxcblx0aHRtbFRlbXBsYXRlOiAnJyxcblx0YXBwczogbnVsbCxcblx0dmVyc2lvbk51bWJlcjogJycsXG5cdGRldjogZmFsc2UsXG5cdGZpbGVQaWNrZXI6IHtcblx0XHRzZWxlY3RlZEZpbGU6IG51bGxcblx0fSxcblx0YXBwSW5mbzogbnVsbCxcblx0c2Vzc2lvbkVuZHBvaW50QnlVc2VyOiBmYWxzZVxufTtcblxuZnVuY3Rpb24gYXNzZW1ibGUobGl0ZXJhbCwgcGFyYW1zKSB7XG5cdHJldHVybiBuZXcgRnVuY3Rpb24ocGFyYW1zLCBcInJldHVybiBgXCIgKyBsaXRlcmFsICsgXCJgO1wiKTtcbn1cblxudmFyIFN0b3JlID0ge1xuXHRnZXRTdGF0ZTogZnVuY3Rpb24gZ2V0U3RhdGUoKSB7XG5cdFx0cmV0dXJuIE9iamVjdC5hc3NpZ24oe30sIHN0YXRlKTtcblx0fSxcblxuXHRzZXRXaW5kb3dOYW1lOiBmdW5jdGlvbiBzZXRXaW5kb3dOYW1lKHduKSB7XG5cdFx0c3RhdGUuZ2VuZXJhbC53aW5kb3dOYW1lID0gd247XG5cdH0sXG5cblx0c2V0RGV2OiBmdW5jdGlvbiBzZXREZXYoZGV2KSB7XG5cdFx0c3RhdGUuZGV2ID0gZGV2O1xuXHR9LFxuXG5cdGdldERldlVybFBhcnQ6IGZ1bmN0aW9uIGdldERldlVybFBhcnQoKSB7XG5cdFx0aWYgKHN0YXRlLmRldikge1xuXHRcdFx0cmV0dXJuIFwic2FuZGJveC9cIjtcblx0XHR9IGVsc2Uge1xuXHRcdFx0cmV0dXJuIFwiXCI7XG5cdFx0fVxuXHR9LFxuXG5cdGdldEZ1bGxCYXNlVXJsOiBmdW5jdGlvbiBnZXRGdWxsQmFzZVVybCgpIHtcblx0XHRyZXR1cm4gc3RhdGUuY29uZmlndXJhdGlvbi5yb290VXJsICsgc3RhdGUuY29uZmlndXJhdGlvbi5iYXNlVXJsICsgU3RvcmUuZ2V0RGV2VXJsUGFydCgpO1xuXHR9LFxuXG5cdC8qXG4gIGNvbmY6XG4gIC0gaGVhZGVyRGl2SWRcbiAgLSBpbmNsdWRlQXBwc01lbnVcbiAgKi9cblx0c2V0Q29uZmlndXJhdGlvbjogZnVuY3Rpb24gc2V0Q29uZmlndXJhdGlvbihjb25mKSB7XG5cdFx0c3RhdGUuY29uZmlndXJhdGlvbiA9IGNvbmY7XG5cdH0sXG5cblx0c2V0VmVyc2lvbk51bWJlcjogZnVuY3Rpb24gc2V0VmVyc2lvbk51bWJlcih2ZXJzaW9uKSB7XG5cdFx0c3RhdGUudmVyc2lvbk51bWJlciA9IHZlcnNpb247XG5cdH0sXG5cblx0Z2V0VmVyc2lvbk51bWJlcjogZnVuY3Rpb24gZ2V0VmVyc2lvbk51bWJlcigpIHtcblx0XHRyZXR1cm4gc3RhdGUudmVyc2lvbk51bWJlcjtcblx0fSxcblxuXHRnZXRBcHBzVmlzaWJsZTogZnVuY3Rpb24gZ2V0QXBwc1Zpc2libGUoKSB7XG5cdFx0aWYgKHN0YXRlLmNvbmZpZ3VyYXRpb24uYXBwc1Zpc2libGUgPT09IG51bGwgfHwgc3RhdGUuY29uZmlndXJhdGlvbi5hcHBzVmlzaWJsZSA9PT0gdW5kZWZpbmVkKSB7XG5cdFx0XHRyZXR1cm4gdHJ1ZTtcblx0XHR9IGVsc2Uge1xuXHRcdFx0cmV0dXJuIHN0YXRlLmNvbmZpZ3VyYXRpb24uYXBwc1Zpc2libGU7XG5cdFx0fVxuXHR9LFxuXG5cdHNldEFwcHNWaXNpYmxlOiBmdW5jdGlvbiBzZXRBcHBzVmlzaWJsZShhcHBzVmlzaWJsZSkge1xuXHRcdHN0YXRlLmNvbmZpZ3VyYXRpb24uYXBwc1Zpc2libGUgPSBhcHBzVmlzaWJsZTtcblx0fSxcblxuXHRzZXRIVE1MVGVtcGxhdGU6IGZ1bmN0aW9uIHNldEhUTUxUZW1wbGF0ZSh0ZW1wbGF0ZSkge1xuXHRcdHN0YXRlLmh0bWxUZW1wbGF0ZSA9IHRlbXBsYXRlO1xuXHR9LFxuXG5cdHNldEFwcHM6IGZ1bmN0aW9uIHNldEFwcHMoYXBwcykge1xuXHRcdHN0YXRlLmFwcHMgPSBhcHBzO1xuXHR9LFxuXG5cdHNldEFwcEluZm86IGZ1bmN0aW9uIHNldEFwcEluZm8oYXBwSW5mbykge1xuXHRcdHN0YXRlLmFwcEluZm8gPSBhcHBJbmZvO1xuXHR9LFxuXG5cdGdldEFwcEluZm86IGZ1bmN0aW9uIGdldEFwcEluZm8oKSB7XG5cdFx0cmV0dXJuIHN0YXRlLmFwcEluZm87XG5cdH0sXG5cblx0Z2V0TG9naW5Vcmw6IGZ1bmN0aW9uIGdldExvZ2luVXJsKCkge1xuXHRcdHJldHVybiBzdGF0ZS5jb25maWd1cmF0aW9uLnJvb3RVcmwgKyBzdGF0ZS5jb25maWd1cmF0aW9uLmxvZ2luVXJsICsgXCI/XCIgKyBzdGF0ZS5jb25maWd1cmF0aW9uLnJlZGlyZWN0VXJsUGFyYW0gKyBcIj1cIiArIHdpbmRvdy5sb2NhdGlvbi5ocmVmO1xuXHR9LFxuXG5cdGdldEF1dGhlbnRpY2F0aW9uRW5kcG9pbnQ6IGZ1bmN0aW9uIGdldEF1dGhlbnRpY2F0aW9uRW5kcG9pbnQoKSB7XG5cdFx0aWYgKHN0YXRlLnNlc3Npb25FbmRwb2ludEJ5VXNlcikge1xuXHRcdFx0cmV0dXJuIHN0YXRlLnJvb3RVcmwgKyBzdGF0ZS5jb25maWd1cmF0aW9uLnNlc3Npb25FbmRwb2ludDtcblx0XHR9XG5cdFx0cmV0dXJuIFN0b3JlLmdldEZ1bGxCYXNlVXJsKCkgKyBzdGF0ZS5jb25maWd1cmF0aW9uLnNlc3Npb25FbmRwb2ludDtcblx0fSxcblxuXHRnZXRTd2l0Y2hBY2NvdW50RW5kcG9pbnQ6IGZ1bmN0aW9uIGdldFN3aXRjaEFjY291bnRFbmRwb2ludChhY2NvdW50SWQpIHtcblx0XHRyZXR1cm4gU3RvcmUuZ2V0RnVsbEJhc2VVcmwoKSArICdhY2NvdW50cy9zd2l0Y2gvJyArIGFjY291bnRJZDtcblx0fSxcblxuXHRnZXRBcHBzRW5kcG9pbnQ6IGZ1bmN0aW9uIGdldEFwcHNFbmRwb2ludCgpIHtcblx0XHRyZXR1cm4gU3RvcmUuZ2V0RnVsbEJhc2VVcmwoKSArICdhcHBzJztcblx0fSxcblxuXHRnZXRDbG91ZGluYXJ5RW5kcG9pbnQ6IGZ1bmN0aW9uIGdldENsb3VkaW5hcnlFbmRwb2ludCgpIHtcblx0XHRyZXR1cm4gU3RvcmUuZ2V0RnVsbEJhc2VVcmwoKSArICdhc3NldHMnO1xuXHR9LFxuXG5cdGxvZ3NFbmFibGVkOiBmdW5jdGlvbiBsb2dzRW5hYmxlZCgpIHtcblx0XHRyZXR1cm4gc3RhdGUuY29uZmlndXJhdGlvbi5sb2dzO1xuXHR9LFxuXG5cdGdldFNlYXJjaElucHV0SWQ6IGZ1bmN0aW9uIGdldFNlYXJjaElucHV0SWQoKSB7XG5cdFx0cmV0dXJuIHN0YXRlLmNvbmZpZ3VyYXRpb24uc2VhcmNoSW5wdXRJZDtcblx0fSxcblxuXHRzZXRIVE1MQ29udGFpbmVyOiBmdW5jdGlvbiBzZXRIVE1MQ29udGFpbmVyKGlkKSB7XG5cdFx0c3RhdGUuY29uZmlndXJhdGlvbi5oZWFkZXJEaXZJZCA9IGlkO1xuXHR9LFxuXG5cdGdldEhUTE1Db250YWluZXI6IGZ1bmN0aW9uIGdldEhUTE1Db250YWluZXIoKSB7XG5cdFx0aWYgKHN0YXRlLmNvbmZpZ3VyYXRpb24uaGVhZGVyRGl2SWQpIHtcblx0XHRcdHJldHVybiBzdGF0ZS5jb25maWd1cmF0aW9uLmhlYWRlckRpdklkO1xuXHRcdH0gZWxzZSB7XG5cdFx0XHRyZXR1cm4gXCJwcHNkay1jb250YWluZXJcIjtcblx0XHR9XG5cdH0sXG5cblx0Z2V0SFRNTDogZnVuY3Rpb24gZ2V0SFRNTCgpIHtcblx0XHRyZXR1cm4gc3RhdGUuaHRtbFRlbXBsYXRlO1xuXHR9LFxuXG5cdHNldFNlc3Npb25FbmRwb2ludDogZnVuY3Rpb24gc2V0U2Vzc2lvbkVuZHBvaW50KHNlc3Npb25FbmRwb2ludCkge1xuXHRcdGlmIChzZXNzaW9uRW5kcG9pbnQuaW5kZXhPZignLycpID09PSAwKSB7XG5cdFx0XHRzZXNzaW9uRW5kcG9pbnQgPSBzZXNzaW9uRW5kcG9pbnQuc3Vic3RyaW5nKDEsIHNlc3Npb25FbmRwb2ludC5sZW5ndGggLSAxKTtcblx0XHR9XG5cdFx0c3RhdGUuc2Vzc2lvbkVuZHBvaW50QnlVc2VyID0gdHJ1ZTtcblx0XHRzdGF0ZS5jb25maWd1cmF0aW9uLnNlc3Npb25FbmRwb2ludCA9IHNlc3Npb25FbmRwb2ludDtcblx0fSxcblxuXHRnZXRXaW5kb3dOYW1lOiBmdW5jdGlvbiBnZXRXaW5kb3dOYW1lKCkge1xuXHRcdHJldHVybiBzdGF0ZS5nZW5lcmFsLndpbmRvd05hbWU7XG5cdH0sXG5cblx0c2V0VXNlckRhdGE6IGZ1bmN0aW9uIHNldFVzZXJEYXRhKHVzZXJEYXRhKSB7XG5cdFx0c3RhdGUudXNlckRhdGEgPSB1c2VyRGF0YTtcblx0fSxcblxuXHRnZXRVc2VyRGF0YTogZnVuY3Rpb24gZ2V0VXNlckRhdGEoKSB7XG5cdFx0cmV0dXJuIHN0YXRlLnVzZXJEYXRhO1xuXHR9LFxuXG5cdHNldFJvb3RVcmw6IGZ1bmN0aW9uIHNldFJvb3RVcmwocm9vdFVybCkge1xuXHRcdHN0YXRlLmNvbmZpZ3VyYXRpb24ucm9vdFVybCA9IHJvb3RVcmwucmVwbGFjZSgvXFwvPyQvLCAnLycpOztcblx0fSxcblxuXHRnZXRSb290VXJsOiBmdW5jdGlvbiBnZXRSb290VXJsKCkge1xuXHRcdHJldHVybiBzdGF0ZS5jb25maWd1cmF0aW9uLnJvb3RVcmw7XG5cdH0sXG5cblx0Z2V0QXZhdGFyVXBsb2FkVXJsOiBmdW5jdGlvbiBnZXRBdmF0YXJVcGxvYWRVcmwoKSB7XG5cdFx0cmV0dXJuIFN0b3JlLmdldEZ1bGxCYXNlVXJsKCkgKyAnYXNzZXRzL3VwbG9hZCc7XG5cdH0sXG5cblx0Z2V0QXZhdGFyVXBkYXRlVXJsOiBmdW5jdGlvbiBnZXRBdmF0YXJVcGRhdGVVcmwoKSB7XG5cdFx0cmV0dXJuIFN0b3JlLmdldEZ1bGxCYXNlVXJsKCkgKyAndXNlcnMvYXZhdGFyJztcblx0fVxufTtcblxubW9kdWxlLmV4cG9ydHMgPSBTdG9yZTsiXX0=
