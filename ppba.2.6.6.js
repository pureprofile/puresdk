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

			if (conf.versionPrefix) {
				Store.setUrlVersionPrefix(conf.versionPrefix);
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
 * version: 2.6.6
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
ppba.setVersionNumber('2.6.6');

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
		state.configuration.sessionEndpoint = sessionEndpoint;
	},

	setUrlVersionPrefix: function setUrlVersionPrefix(prefix) {
		state.configuration.baseUrl = prefix;
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
		state.configuration.rootUrl = rootUrl.replace(/\/?$/, '/');; // adds trailing slash at the end of the url if it doesn't exist
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
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uLy4uL25vZGVfbW9kdWxlcy9icm93c2VyLXBhY2svX3ByZWx1ZGUuanMiLCJQUEJBLmpzIiwiaW5kZXguanMiLCJtb2R1bGVzL2F2YXRhci1jb250cm9sbGVyLmpzIiwibW9kdWxlcy9jYWxsZXIuanMiLCJtb2R1bGVzL2Nsb3VkaW5hcnktaW1hZ2UtcGlja2VyLmpzIiwibW9kdWxlcy9kb20uanMiLCJtb2R1bGVzL2luZm8tY29udHJvbGxlci5qcyIsIm1vZHVsZXMvbG9nZ2VyLmpzIiwibW9kdWxlcy9wYWdpbmF0aW9uLWhlbHBlci5qcyIsIm1vZHVsZXMvcHVic3ViLmpzIiwibW9kdWxlcy9zdG9yZS5qcyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTtBQ0FBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUN6VUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUM5Q0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3ZIQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ2pHQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNyUUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUN0QkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUM5RkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDckJBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUMvQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3JEQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQSIsImZpbGUiOiJnZW5lcmF0ZWQuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlc0NvbnRlbnQiOlsiKGZ1bmN0aW9uIGUodCxuLHIpe2Z1bmN0aW9uIHMobyx1KXtpZighbltvXSl7aWYoIXRbb10pe3ZhciBhPXR5cGVvZiByZXF1aXJlPT1cImZ1bmN0aW9uXCImJnJlcXVpcmU7aWYoIXUmJmEpcmV0dXJuIGEobywhMCk7aWYoaSlyZXR1cm4gaShvLCEwKTt2YXIgZj1uZXcgRXJyb3IoXCJDYW5ub3QgZmluZCBtb2R1bGUgJ1wiK28rXCInXCIpO3Rocm93IGYuY29kZT1cIk1PRFVMRV9OT1RfRk9VTkRcIixmfXZhciBsPW5bb109e2V4cG9ydHM6e319O3Rbb11bMF0uY2FsbChsLmV4cG9ydHMsZnVuY3Rpb24oZSl7dmFyIG49dFtvXVsxXVtlXTtyZXR1cm4gcyhuP246ZSl9LGwsbC5leHBvcnRzLGUsdCxuLHIpfXJldHVybiBuW29dLmV4cG9ydHN9dmFyIGk9dHlwZW9mIHJlcXVpcmU9PVwiZnVuY3Rpb25cIiYmcmVxdWlyZTtmb3IodmFyIG89MDtvPHIubGVuZ3RoO28rKylzKHJbb10pO3JldHVybiBzfSkiLCJ2YXIgTG9nZ2VyID0gcmVxdWlyZSgnLi9tb2R1bGVzL2xvZ2dlcicpO1xudmFyIFB1YlN1YiA9IHJlcXVpcmUoJy4vbW9kdWxlcy9wdWJzdWInKTtcbnZhciBDYWxsZXIgPSByZXF1aXJlKCcuL21vZHVsZXMvY2FsbGVyJyk7XG52YXIgRG9tID0gcmVxdWlyZSgnLi9tb2R1bGVzL2RvbScpO1xudmFyIEluZm9Db250cm9sbGVyID0gcmVxdWlyZSgnLi9tb2R1bGVzL2luZm8tY29udHJvbGxlcicpO1xudmFyIEF2YXRhckNvbnRyb2xsZXIgPSByZXF1aXJlKCcuL21vZHVsZXMvYXZhdGFyLWNvbnRyb2xsZXInKTtcbnZhciBTdG9yZSA9IHJlcXVpcmUoJy4vbW9kdWxlcy9zdG9yZScpO1xudmFyIENsb3VkaW5hcnkgPSByZXF1aXJlKCcuL21vZHVsZXMvY2xvdWRpbmFyeS1pbWFnZS1waWNrZXInKTtcbnZhciBwcGJhQ29uZiA9IHt9O1xuXG52YXIgYWZ0ZXJSZW5kZXIgPSBmdW5jdGlvbiBhZnRlclJlbmRlcigpIHtcblx0aWYgKGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKCdiYWMtLXB1cmVzZGstLWFwcHMtLW9wZW5lci0tJykpIHtcblx0XHRkb2N1bWVudC5nZXRFbGVtZW50QnlJZCgnYmFjLS1wdXJlc2RrLS1hcHBzLS1vcGVuZXItLScpLmFkZEV2ZW50TGlzdGVuZXIoJ2NsaWNrJywgZnVuY3Rpb24gKGUpIHtcblx0XHRcdGUuc3RvcFByb3BhZ2F0aW9uKCk7XG5cdFx0XHQvLyBEb20udG9nZ2xlQ2xhc3MoZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoJ2JhYy0tcHVyZXNkay1hcHBzLWNvbnRhaW5lci0tJyksICdhY3RpdmUnKTtcblx0XHRcdHdpbmRvdy5sb2NhdGlvbi5ocmVmID0gU3RvcmUuZ2V0Um9vdFVybCgpO1xuXHRcdH0pO1xuXHR9XG5cblx0ZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoJ2JhYy0tdXNlci1hdmF0YXItdG9wJykuYWRkRXZlbnRMaXN0ZW5lcignY2xpY2snLCBmdW5jdGlvbiAoZSkge1xuXHRcdGUuc3RvcFByb3BhZ2F0aW9uKCk7XG5cdFx0Ly8gRG9tLnJlbW92ZUNsYXNzKGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKCdiYWMtLXB1cmVzZGstYXBwcy1jb250YWluZXItLScpLCAnYWN0aXZlJyk7XG5cdFx0RG9tLnRvZ2dsZUNsYXNzKGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKCdiYWMtLXB1cmVzZGstdXNlci1zaWRlYmFyLS0nKSwgJ2FjdGl2ZScpO1xuXHR9KTtcblxuXHR3aW5kb3cuYWRkRXZlbnRMaXN0ZW5lcignY2xpY2snLCBmdW5jdGlvbiAoZSkge1xuXHRcdC8vIERvbS5yZW1vdmVDbGFzcyhkb2N1bWVudC5nZXRFbGVtZW50QnlJZCgnYmFjLS1wdXJlc2RrLWFwcHMtY29udGFpbmVyLS0nKSwgJ2FjdGl2ZScpO1xuXHRcdERvbS5yZW1vdmVDbGFzcyhkb2N1bWVudC5nZXRFbGVtZW50QnlJZCgnYmFjLS1wdXJlc2RrLXVzZXItc2lkZWJhci0tJyksICdhY3RpdmUnKTtcblx0fSk7XG5cblx0QXZhdGFyQ29udHJvbGxlci5pbml0KCk7XG5cdHZhciB1c2VyRGF0YSA9IFN0b3JlLmdldFVzZXJEYXRhKCk7XG5cdEF2YXRhckNvbnRyb2xsZXIuc2V0QXZhdGFyKHVzZXJEYXRhLnVzZXIuYXZhdGFyX3VybCk7XG5cblx0SW5mb0NvbnRyb2xsZXIuaW5pdCgpO1xufTtcblxudmFyIFBQQkEgPSB7XG5cdHNldFdpbmRvd05hbWU6IGZ1bmN0aW9uIHNldFdpbmRvd05hbWUod24pIHtcblx0XHRTdG9yZS5zZXRXaW5kb3dOYW1lKHduKTtcblx0fSxcblxuXHRzZXRDb25maWd1cmF0aW9uOiBmdW5jdGlvbiBzZXRDb25maWd1cmF0aW9uKGNvbmYpIHtcblx0XHRTdG9yZS5zZXRDb25maWd1cmF0aW9uKGNvbmYpO1xuXHR9LFxuXG5cdHNldEhUTUxUZW1wbGF0ZTogZnVuY3Rpb24gc2V0SFRNTFRlbXBsYXRlKHRlbXBsYXRlKSB7XG5cdFx0U3RvcmUuc2V0SFRNTFRlbXBsYXRlKHRlbXBsYXRlKTtcblx0fSxcblxuXHRzZXRWZXJzaW9uTnVtYmVyOiBmdW5jdGlvbiBzZXRWZXJzaW9uTnVtYmVyKHZlcnNpb24pIHtcblx0XHRTdG9yZS5zZXRWZXJzaW9uTnVtYmVyKHZlcnNpb24pO1xuXHR9LFxuXG5cdGluaXQ6IGZ1bmN0aW9uIGluaXQoY29uZikge1xuXHRcdExvZ2dlci5sb2coJ2luaXRpYWxpemluZyB3aXRoIGNvbmY6ICcsIGNvbmYpO1xuXHRcdGlmIChjb25mKSB7XG5cdFx0XHRpZiAoY29uZi5oZWFkZXJEaXZJZCkge1xuXHRcdFx0XHRTdG9yZS5zZXRIVE1MQ29udGFpbmVyKGNvbmYuaGVhZGVyRGl2SWQpO1xuXHRcdFx0fVxuXHRcdFx0aWYgKGNvbmYuYXBwc1Zpc2libGUgIT09IG51bGwpIHtcblx0XHRcdFx0U3RvcmUuc2V0QXBwc1Zpc2libGUoY29uZi5hcHBzVmlzaWJsZSk7XG5cdFx0XHR9XG5cdFx0XHRpZiAoY29uZi5yb290VXJsKSB7XG5cdFx0XHRcdFN0b3JlLnNldFJvb3RVcmwoY29uZi5yb290VXJsKTtcblx0XHRcdH1cblx0XHRcdGlmIChjb25mLmRldiA9PT0gdHJ1ZSkge1xuXHRcdFx0XHRpZiAoY29uZi5kZXZLZXlzKSB7XG5cdFx0XHRcdFx0Q2FsbGVyLnNldERldktleXMoY29uZi5kZXZLZXlzKTtcblx0XHRcdFx0XHRTdG9yZS5zZXREZXYodHJ1ZSk7XG5cdFx0XHRcdH1cblx0XHRcdH1cblx0XHRcdGlmIChjb25mLmFwcEluZm8pIHtcblx0XHRcdFx0U3RvcmUuc2V0QXBwSW5mbyhjb25mLmFwcEluZm8pO1xuXHRcdFx0fVxuXG5cdFx0XHQvKiBvcHRpb25hbCBzZXNzaW9uIHVybCAqL1xuXHRcdFx0aWYgKGNvbmYuc2Vzc2lvbkVuZHBvaW50KSB7XG5cdFx0XHRcdFN0b3JlLnNldFNlc3Npb25FbmRwb2ludChjb25mLnNlc3Npb25FbmRwb2ludCk7XG5cdFx0XHR9XG5cblx0XHRcdGlmIChjb25mLnZlcnNpb25QcmVmaXgpIHtcblx0XHRcdFx0U3RvcmUuc2V0VXJsVmVyc2lvblByZWZpeChjb25mLnZlcnNpb25QcmVmaXgpO1xuXHRcdFx0fVxuXHRcdH1cblx0XHRwcGJhQ29uZiA9IGNvbmY7XG5cdFx0cmV0dXJuIHRydWU7XG5cdH0sXG5cblx0YXV0aGVudGljYXRlOiBmdW5jdGlvbiBhdXRoZW50aWNhdGUoX3N1Y2Nlc3MpIHtcblx0XHR2YXIgc2VsZiA9IFBQQkE7XG5cdFx0Q2FsbGVyLm1ha2VDYWxsKHtcblx0XHRcdHR5cGU6ICdHRVQnLFxuXHRcdFx0ZW5kcG9pbnQ6IFN0b3JlLmdldEF1dGhlbnRpY2F0aW9uRW5kcG9pbnQoKSxcblx0XHRcdGNhbGxiYWNrczoge1xuXHRcdFx0XHRzdWNjZXNzOiBmdW5jdGlvbiBzdWNjZXNzKHJlc3VsdCkge1xuXHRcdFx0XHRcdExvZ2dlci5sb2cocmVzdWx0KTtcblx0XHRcdFx0XHRTdG9yZS5zZXRVc2VyRGF0YShyZXN1bHQpO1xuXHRcdFx0XHRcdHNlbGYucmVuZGVyKCk7XG5cdFx0XHRcdFx0UFBCQS5nZXRBcHBzKCk7XG5cdFx0XHRcdFx0X3N1Y2Nlc3MocmVzdWx0KTtcblx0XHRcdFx0fSxcblx0XHRcdFx0ZmFpbDogZnVuY3Rpb24gZmFpbChlcnIpIHtcblx0XHRcdFx0XHR3aW5kb3cubG9jYXRpb24uaHJlZiA9IFN0b3JlLmdldExvZ2luVXJsKCk7XG5cdFx0XHRcdH1cblx0XHRcdH1cblx0XHR9KTtcblx0fSxcblxuXHRhdXRoZW50aWNhdGVQcm9taXNlOiBmdW5jdGlvbiBhdXRoZW50aWNhdGVQcm9taXNlKCkge1xuXHRcdHZhciBzZWxmID0gUFBCQTtcblx0XHRyZXR1cm4gQ2FsbGVyLnByb21pc2VDYWxsKHtcblx0XHRcdHR5cGU6ICdHRVQnLFxuXHRcdFx0ZW5kcG9pbnQ6IFN0b3JlLmdldEF1dGhlbnRpY2F0aW9uRW5kcG9pbnQoKSxcblx0XHRcdG1pZGRsZXdhcmVzOiB7XG5cdFx0XHRcdHN1Y2Nlc3M6IGZ1bmN0aW9uIHN1Y2Nlc3MocmVzdWx0KSB7XG5cdFx0XHRcdFx0TG9nZ2VyLmxvZyhyZXN1bHQpO1xuXHRcdFx0XHRcdFN0b3JlLnNldFVzZXJEYXRhKHJlc3VsdCk7XG5cdFx0XHRcdFx0c2VsZi5yZW5kZXIoKTtcblx0XHRcdFx0XHRQUEJBLmdldEFwcHMoKTtcblx0XHRcdFx0fVxuXHRcdFx0fVxuXHRcdH0pO1xuXHR9LFxuXG5cdGdldEFwcHM6IGZ1bmN0aW9uIGdldEFwcHMoKSB7XG5cdFx0Q2FsbGVyLm1ha2VDYWxsKHtcblx0XHRcdHR5cGU6ICdHRVQnLFxuXHRcdFx0ZW5kcG9pbnQ6IFN0b3JlLmdldEFwcHNFbmRwb2ludCgpLFxuXHRcdFx0Y2FsbGJhY2tzOiB7XG5cdFx0XHRcdHN1Y2Nlc3M6IGZ1bmN0aW9uIHN1Y2Nlc3MocmVzdWx0KSB7XG5cdFx0XHRcdFx0U3RvcmUuc2V0QXBwcyhyZXN1bHQpO1xuXHRcdFx0XHRcdC8vIFBQQkEucmVuZGVyQXBwcyhyZXN1bHQuYXBwcyk7XG5cdFx0XHRcdH0sXG5cdFx0XHRcdGZhaWw6IGZ1bmN0aW9uIGZhaWwoZXJyKSB7XG5cdFx0XHRcdFx0d2luZG93LmxvY2F0aW9uLmhyZWYgPSBTdG9yZS5nZXRMb2dpblVybCgpO1xuXHRcdFx0XHR9XG5cdFx0XHR9XG5cdFx0fSk7XG5cdH0sXG5cblx0Z2V0QXZhaWxhYmxlTGlzdGVuZXJzOiBmdW5jdGlvbiBnZXRBdmFpbGFibGVMaXN0ZW5lcnMoKSB7XG5cdFx0cmV0dXJuIFB1YlN1Yi5nZXRBdmFpbGFibGVMaXN0ZW5lcnMoKTtcblx0fSxcblxuXHRzdWJzY3JpYmVMaXN0ZW5lcjogZnVuY3Rpb24gc3Vic2NyaWJlTGlzdGVuZXIoZXZlbnR0LCBmdW5jdCkge1xuXHRcdHJldHVybiBQdWJTdWIuc3Vic2NyaWJlKGV2ZW50dCwgZnVuY3QpO1xuXHR9LFxuXG5cdGdldFVzZXJEYXRhOiBmdW5jdGlvbiBnZXRVc2VyRGF0YSgpIHtcblx0XHRyZXR1cm4gU3RvcmUuZ2V0VXNlckRhdGEoKTtcblx0fSxcblxuXHRzZXRJbnB1dFBsYWNlaG9sZGVyOiBmdW5jdGlvbiBzZXRJbnB1dFBsYWNlaG9sZGVyKHR4dCkge1xuXHRcdC8vIGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKFN0b3JlLmdldFNlYXJjaElucHV0SWQoKSkucGxhY2Vob2xkZXIgPSB0eHQ7XG5cdH0sXG5cblx0Y2hhbmdlQWNjb3VudDogZnVuY3Rpb24gY2hhbmdlQWNjb3VudChhY2NvdW50SWQpIHtcblx0XHRDYWxsZXIubWFrZUNhbGwoe1xuXHRcdFx0dHlwZTogJ0dFVCcsXG5cdFx0XHRlbmRwb2ludDogU3RvcmUuZ2V0U3dpdGNoQWNjb3VudEVuZHBvaW50KGFjY291bnRJZCksXG5cdFx0XHRjYWxsYmFja3M6IHtcblx0XHRcdFx0c3VjY2VzczogZnVuY3Rpb24gc3VjY2VzcyhyZXN1bHQpIHtcblx0XHRcdFx0XHR3aW5kb3cubG9jYXRpb24uaHJlZiA9ICcvYXBwcyc7XG5cdFx0XHRcdH0sXG5cdFx0XHRcdGZhaWw6IGZ1bmN0aW9uIGZhaWwoZXJyKSB7XG5cdFx0XHRcdFx0YWxlcnQoJ1NvcnJ5LCBzb21ldGhpbmcgd2VudCB3cm9uZyB3aXRoIHlvdXIgcmVxdWVzdC4gUGxlc2UgdHJ5IGFnYWluJyk7XG5cdFx0XHRcdH1cblx0XHRcdH1cblx0XHR9KTtcblx0fSxcblxuXHQvLyByZW5kZXJBcHBzOiAoYXBwcykgPT4ge1xuXHQvLyAgIGxldCBhcHBUZW1wbGF0ZSA9IChhcHApID0+IGBcblx0Ly8gXHRcdDxhIGhyZWY9XCIjXCIgc3R5bGU9XCJiYWNrZ3JvdW5kOiAjJHthcHAuY29sb3J9XCI+PGkgY2xhc3M9XCIke2FwcC5pY29ufVwiPjwvaT48L2E+XG5cdC8vIFx0XHQ8c3BhbiBjbGFzcz1cImJhYy0tYXBwLW5hbWVcIj4ke2FwcC5uYW1lfTwvc3Bhbj5cblx0Ly8gXHRcdDxzcGFuIGNsYXNzPVwiYmFjLS1hcHAtZGVzY3JpcHRpb25cIj4ke2FwcC5kZXNjcn08L3NwYW4+XG5cdC8vIFx0YDtcblx0Ly8gICBmb3IobGV0IGk9MDsgaTxhcHBzLmxlbmd0aDsgaSsrKXtcblx0Ly8gXHRcdGxldCBhcHAgPSBhcHBzW2ldO1xuXHQvLyBcdFx0bGV0IGRpdiA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoXCJkaXZcIik7XG5cdC8vIFx0XHRkaXYuY2xhc3NOYW1lID0gXCJiYWMtLWFwcHNcIjtcblx0Ly8gXHRcdGRpdi5pbm5lckhUTUwgPSBhcHBUZW1wbGF0ZShhcHApO1xuXHQvLyBcdFx0ZGl2Lm9uY2xpY2sgPSAoZSkgPT4ge1xuXHQvLyBcdFx0XHQgZS5wcmV2ZW50RGVmYXVsdCgpO1xuXHQvLyBcdFx0XHQgd2luZG93LmxvY2F0aW9uLmhyZWYgPSBhcHAuYXBwbGljYXRpb25fdXJsO1xuXHQvLyBcdFx0fVxuXHQvLyBcdFx0ZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoXCJiYWMtLXB1cmVzZGstYXBwcy1jb250YWluZXItLVwiKS5hcHBlbmRDaGlsZChkaXYpO1xuXHQvLyAgIH1cblx0Ly8gfSxcblxuXHRyZW5kZXJVc2VyOiBmdW5jdGlvbiByZW5kZXJVc2VyKHVzZXIpIHtcblx0XHR2YXIgdXNlclRlbXBsYXRlID0gZnVuY3Rpb24gdXNlclRlbXBsYXRlKHVzZXIpIHtcblx0XHRcdHJldHVybiAnXFxuXFx0XFx0XFx0XFx0PGRpdiBjbGFzcz1cImJhYy0tdXNlci1pbWFnZVwiIGlkPVwiYmFjLS11c2VyLWltYWdlXCI+XFxuXFx0XFx0XFx0XFx0XFx0PGkgY2xhc3M9XCJmYSBmYS1jYW1lcmFcIj48L2k+XFxuXFx0XFx0XFx0ICAgXFx0PGRpdiBpZD1cImJhYy0tdXNlci1pbWFnZS1maWxlXCI+PC9kaXY+XFxuXFx0XFx0XFx0ICAgXFx0PGRpdiBpZD1cImJhYy0tdXNlci1pbWFnZS11cGxvYWQtcHJvZ3Jlc3NcIj5cXG5cXHRcXHRcXHQgICBcXHRcXHQ8c3ZnIHdpZHRoPVxcJzYwcHhcXCcgaGVpZ2h0PVxcJzYwcHhcXCcgeG1sbnM9XCJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2Z1wiIHZpZXdCb3g9XCIwIDAgMTAwIDEwMFwiIHByZXNlcnZlQXNwZWN0UmF0aW89XCJ4TWlkWU1pZFwiIGNsYXNzPVwidWlsLWRlZmF1bHRcIj48cmVjdCB4PVwiMFwiIHk9XCIwXCIgd2lkdGg9XCIxMDBcIiBoZWlnaHQ9XCIxMDBcIiBmaWxsPVwibm9uZVwiIGNsYXNzPVwiYmtcIj48L3JlY3Q+PHJlY3QgIHg9XFwnNDYuNVxcJyB5PVxcJzQwXFwnIHdpZHRoPVxcJzdcXCcgaGVpZ2h0PVxcJzIwXFwnIHJ4PVxcJzVcXCcgcnk9XFwnNVxcJyBmaWxsPVxcJyNmZmZmZmZcXCcgdHJhbnNmb3JtPVxcJ3JvdGF0ZSgwIDUwIDUwKSB0cmFuc2xhdGUoMCAtMzApXFwnPiAgPGFuaW1hdGUgYXR0cmlidXRlTmFtZT1cXCdvcGFjaXR5XFwnIGZyb209XFwnMVxcJyB0bz1cXCcwXFwnIGR1cj1cXCcxc1xcJyBiZWdpbj1cXCctMXNcXCcgcmVwZWF0Q291bnQ9XFwnaW5kZWZpbml0ZVxcJy8+PC9yZWN0PjxyZWN0ICB4PVxcJzQ2LjVcXCcgeT1cXCc0MFxcJyB3aWR0aD1cXCc3XFwnIGhlaWdodD1cXCcyMFxcJyByeD1cXCc1XFwnIHJ5PVxcJzVcXCcgZmlsbD1cXCcjZmZmZmZmXFwnIHRyYW5zZm9ybT1cXCdyb3RhdGUoMzAgNTAgNTApIHRyYW5zbGF0ZSgwIC0zMClcXCc+ICA8YW5pbWF0ZSBhdHRyaWJ1dGVOYW1lPVxcJ29wYWNpdHlcXCcgZnJvbT1cXCcxXFwnIHRvPVxcJzBcXCcgZHVyPVxcJzFzXFwnIGJlZ2luPVxcJy0wLjkxNjY2NjY2NjY2NjY2NjZzXFwnIHJlcGVhdENvdW50PVxcJ2luZGVmaW5pdGVcXCcvPjwvcmVjdD48cmVjdCAgeD1cXCc0Ni41XFwnIHk9XFwnNDBcXCcgd2lkdGg9XFwnN1xcJyBoZWlnaHQ9XFwnMjBcXCcgcng9XFwnNVxcJyByeT1cXCc1XFwnIGZpbGw9XFwnI2ZmZmZmZlxcJyB0cmFuc2Zvcm09XFwncm90YXRlKDYwIDUwIDUwKSB0cmFuc2xhdGUoMCAtMzApXFwnPiAgPGFuaW1hdGUgYXR0cmlidXRlTmFtZT1cXCdvcGFjaXR5XFwnIGZyb209XFwnMVxcJyB0bz1cXCcwXFwnIGR1cj1cXCcxc1xcJyBiZWdpbj1cXCctMC44MzMzMzMzMzMzMzMzMzM0c1xcJyByZXBlYXRDb3VudD1cXCdpbmRlZmluaXRlXFwnLz48L3JlY3Q+PHJlY3QgIHg9XFwnNDYuNVxcJyB5PVxcJzQwXFwnIHdpZHRoPVxcJzdcXCcgaGVpZ2h0PVxcJzIwXFwnIHJ4PVxcJzVcXCcgcnk9XFwnNVxcJyBmaWxsPVxcJyNmZmZmZmZcXCcgdHJhbnNmb3JtPVxcJ3JvdGF0ZSg5MCA1MCA1MCkgdHJhbnNsYXRlKDAgLTMwKVxcJz4gIDxhbmltYXRlIGF0dHJpYnV0ZU5hbWU9XFwnb3BhY2l0eVxcJyBmcm9tPVxcJzFcXCcgdG89XFwnMFxcJyBkdXI9XFwnMXNcXCcgYmVnaW49XFwnLTAuNzVzXFwnIHJlcGVhdENvdW50PVxcJ2luZGVmaW5pdGVcXCcvPjwvcmVjdD48cmVjdCAgeD1cXCc0Ni41XFwnIHk9XFwnNDBcXCcgd2lkdGg9XFwnN1xcJyBoZWlnaHQ9XFwnMjBcXCcgcng9XFwnNVxcJyByeT1cXCc1XFwnIGZpbGw9XFwnI2ZmZmZmZlxcJyB0cmFuc2Zvcm09XFwncm90YXRlKDEyMCA1MCA1MCkgdHJhbnNsYXRlKDAgLTMwKVxcJz4gIDxhbmltYXRlIGF0dHJpYnV0ZU5hbWU9XFwnb3BhY2l0eVxcJyBmcm9tPVxcJzFcXCcgdG89XFwnMFxcJyBkdXI9XFwnMXNcXCcgYmVnaW49XFwnLTAuNjY2NjY2NjY2NjY2NjY2NnNcXCcgcmVwZWF0Q291bnQ9XFwnaW5kZWZpbml0ZVxcJy8+PC9yZWN0PjxyZWN0ICB4PVxcJzQ2LjVcXCcgeT1cXCc0MFxcJyB3aWR0aD1cXCc3XFwnIGhlaWdodD1cXCcyMFxcJyByeD1cXCc1XFwnIHJ5PVxcJzVcXCcgZmlsbD1cXCcjZmZmZmZmXFwnIHRyYW5zZm9ybT1cXCdyb3RhdGUoMTUwIDUwIDUwKSB0cmFuc2xhdGUoMCAtMzApXFwnPiAgPGFuaW1hdGUgYXR0cmlidXRlTmFtZT1cXCdvcGFjaXR5XFwnIGZyb209XFwnMVxcJyB0bz1cXCcwXFwnIGR1cj1cXCcxc1xcJyBiZWdpbj1cXCctMC41ODMzMzMzMzMzMzMzMzM0c1xcJyByZXBlYXRDb3VudD1cXCdpbmRlZmluaXRlXFwnLz48L3JlY3Q+PHJlY3QgIHg9XFwnNDYuNVxcJyB5PVxcJzQwXFwnIHdpZHRoPVxcJzdcXCcgaGVpZ2h0PVxcJzIwXFwnIHJ4PVxcJzVcXCcgcnk9XFwnNVxcJyBmaWxsPVxcJyNmZmZmZmZcXCcgdHJhbnNmb3JtPVxcJ3JvdGF0ZSgxODAgNTAgNTApIHRyYW5zbGF0ZSgwIC0zMClcXCc+ICA8YW5pbWF0ZSBhdHRyaWJ1dGVOYW1lPVxcJ29wYWNpdHlcXCcgZnJvbT1cXCcxXFwnIHRvPVxcJzBcXCcgZHVyPVxcJzFzXFwnIGJlZ2luPVxcJy0wLjVzXFwnIHJlcGVhdENvdW50PVxcJ2luZGVmaW5pdGVcXCcvPjwvcmVjdD48cmVjdCAgeD1cXCc0Ni41XFwnIHk9XFwnNDBcXCcgd2lkdGg9XFwnN1xcJyBoZWlnaHQ9XFwnMjBcXCcgcng9XFwnNVxcJyByeT1cXCc1XFwnIGZpbGw9XFwnI2ZmZmZmZlxcJyB0cmFuc2Zvcm09XFwncm90YXRlKDIxMCA1MCA1MCkgdHJhbnNsYXRlKDAgLTMwKVxcJz4gIDxhbmltYXRlIGF0dHJpYnV0ZU5hbWU9XFwnb3BhY2l0eVxcJyBmcm9tPVxcJzFcXCcgdG89XFwnMFxcJyBkdXI9XFwnMXNcXCcgYmVnaW49XFwnLTAuNDE2NjY2NjY2NjY2NjY2N3NcXCcgcmVwZWF0Q291bnQ9XFwnaW5kZWZpbml0ZVxcJy8+PC9yZWN0PjxyZWN0ICB4PVxcJzQ2LjVcXCcgeT1cXCc0MFxcJyB3aWR0aD1cXCc3XFwnIGhlaWdodD1cXCcyMFxcJyByeD1cXCc1XFwnIHJ5PVxcJzVcXCcgZmlsbD1cXCcjZmZmZmZmXFwnIHRyYW5zZm9ybT1cXCdyb3RhdGUoMjQwIDUwIDUwKSB0cmFuc2xhdGUoMCAtMzApXFwnPiAgPGFuaW1hdGUgYXR0cmlidXRlTmFtZT1cXCdvcGFjaXR5XFwnIGZyb209XFwnMVxcJyB0bz1cXCcwXFwnIGR1cj1cXCcxc1xcJyBiZWdpbj1cXCctMC4zMzMzMzMzMzMzMzMzMzMzc1xcJyByZXBlYXRDb3VudD1cXCdpbmRlZmluaXRlXFwnLz48L3JlY3Q+PHJlY3QgIHg9XFwnNDYuNVxcJyB5PVxcJzQwXFwnIHdpZHRoPVxcJzdcXCcgaGVpZ2h0PVxcJzIwXFwnIHJ4PVxcJzVcXCcgcnk9XFwnNVxcJyBmaWxsPVxcJyNmZmZmZmZcXCcgdHJhbnNmb3JtPVxcJ3JvdGF0ZSgyNzAgNTAgNTApIHRyYW5zbGF0ZSgwIC0zMClcXCc+ICA8YW5pbWF0ZSBhdHRyaWJ1dGVOYW1lPVxcJ29wYWNpdHlcXCcgZnJvbT1cXCcxXFwnIHRvPVxcJzBcXCcgZHVyPVxcJzFzXFwnIGJlZ2luPVxcJy0wLjI1c1xcJyByZXBlYXRDb3VudD1cXCdpbmRlZmluaXRlXFwnLz48L3JlY3Q+PHJlY3QgIHg9XFwnNDYuNVxcJyB5PVxcJzQwXFwnIHdpZHRoPVxcJzdcXCcgaGVpZ2h0PVxcJzIwXFwnIHJ4PVxcJzVcXCcgcnk9XFwnNVxcJyBmaWxsPVxcJyNmZmZmZmZcXCcgdHJhbnNmb3JtPVxcJ3JvdGF0ZSgzMDAgNTAgNTApIHRyYW5zbGF0ZSgwIC0zMClcXCc+ICA8YW5pbWF0ZSBhdHRyaWJ1dGVOYW1lPVxcJ29wYWNpdHlcXCcgZnJvbT1cXCcxXFwnIHRvPVxcJzBcXCcgZHVyPVxcJzFzXFwnIGJlZ2luPVxcJy0wLjE2NjY2NjY2NjY2NjY2NjY2c1xcJyByZXBlYXRDb3VudD1cXCdpbmRlZmluaXRlXFwnLz48L3JlY3Q+PHJlY3QgIHg9XFwnNDYuNVxcJyB5PVxcJzQwXFwnIHdpZHRoPVxcJzdcXCcgaGVpZ2h0PVxcJzIwXFwnIHJ4PVxcJzVcXCcgcnk9XFwnNVxcJyBmaWxsPVxcJyNmZmZmZmZcXCcgdHJhbnNmb3JtPVxcJ3JvdGF0ZSgzMzAgNTAgNTApIHRyYW5zbGF0ZSgwIC0zMClcXCc+ICA8YW5pbWF0ZSBhdHRyaWJ1dGVOYW1lPVxcJ29wYWNpdHlcXCcgZnJvbT1cXCcxXFwnIHRvPVxcJzBcXCcgZHVyPVxcJzFzXFwnIGJlZ2luPVxcJy0wLjA4MzMzMzMzMzMzMzMzMzMzc1xcJyByZXBlYXRDb3VudD1cXCdpbmRlZmluaXRlXFwnLz48L3JlY3Q+PC9zdmc+XFx0XFxuXFx0XFx0XFx0XFx0XFx0PC9kaXY+XFxuXFx0XFx0XFx0ICAgPC9kaXY+XFxuXFx0XFx0XFx0XFx0PGRpdiBjbGFzcz1cImJhYy0tdXNlci1uYW1lXCI+JyArIHVzZXIuZmlyc3RuYW1lICsgJyAnICsgdXNlci5sYXN0bmFtZSArICc8L2Rpdj5cXG5cXHRcXHRcXHRcXHQ8ZGl2IGNsYXNzPVwiYmFjLS11c2VyLWVtYWlsXCI+JyArIHVzZXIuZW1haWwgKyAnPC9kaXY+XFxuXFx0XFx0XFx0Jztcblx0XHR9O1xuXHRcdHZhciBkaXYgPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KCdkaXYnKTtcblx0XHRkaXYuY2xhc3NOYW1lID0gXCJiYWMtLXVzZXItc2lkZWJhci1pbmZvXCI7XG5cdFx0ZGl2LmlubmVySFRNTCA9IHVzZXJUZW1wbGF0ZSh1c2VyKTtcblx0XHRkb2N1bWVudC5nZXRFbGVtZW50QnlJZCgnYmFjLS1wdXJlc2RrLXVzZXItZGV0YWlscy0tJykuYXBwZW5kQ2hpbGQoZGl2KTtcblx0XHRkb2N1bWVudC5nZXRFbGVtZW50QnlJZCgnYmFjLS1wdXJlc2RrLXVzZXItYXZhdGFyLS0nKS5pbm5lckhUTUwgPSB1c2VyLmZpcnN0bmFtZS5jaGFyQXQoMCkgKyB1c2VyLmxhc3RuYW1lLmNoYXJBdCgwKTtcblx0fSxcblxuXHRyZW5kZXJBY2NvdW50czogZnVuY3Rpb24gcmVuZGVyQWNjb3VudHMoYWNjb3VudHMsIGN1cnJlbnRBY2NvdW50KSB7XG5cdFx0Ly8gTG9nZ2VyLmxvZyhjdXJyZW50QWNjb3VudCk7XG5cdFx0dmFyIGFjY291bnRzVGVtcGxhdGUgPSBmdW5jdGlvbiBhY2NvdW50c1RlbXBsYXRlKGFjY291bnQsIGlzVGhlU2VsZWN0ZWQpIHtcblx0XHRcdHJldHVybiAnXFxuXFx0XFx0XFx0XFx0PGRpdiBjbGFzcz1cImJhYy0tdXNlci1saXN0LWl0ZW0taW1hZ2VcIj5cXG5cXHRcXHRcXHRcXHRcXHQ8aW1nIHNyYz1cIicgKyBhY2NvdW50LnNka19zcXVhcmVfbG9nb19pY29uICsgJ1wiIGFsdD1cIlwiPlxcblxcdFxcdFxcdFxcdDwvZGl2PlxcblxcdFxcdFxcdFxcdDxkaXYgY2xhc3M9XCJiYWMtdXNlci1hcHAtZGV0YWlsc1wiPlxcblxcdFxcdFxcdFxcdFxcdCA8c3Bhbj4nICsgYWNjb3VudC5uYW1lICsgJzwvc3Bhbj5cXG5cXHRcXHRcXHRcXHQ8L2Rpdj5cXG5cXHRcXHRcXHRcXHQnICsgKGlzVGhlU2VsZWN0ZWQgPyAnPGRpdiBpZD1cImJhYy0tc2VsZWN0ZWQtYWNvdW50LWluZGljYXRvclwiIGNsYXNzPVwiYmFjLS1zZWxlY3RlZC1hY291bnQtaW5kaWNhdG9yXCI+PC9kaXY+JyA6ICcnKSArICdcXG5cXHRcXHRcXHQnO1xuXHRcdH07XG5cblx0XHR2YXIgX2xvb3AgPSBmdW5jdGlvbiBfbG9vcChpKSB7XG5cdFx0XHR2YXIgYWNjb3VudCA9IGFjY291bnRzW2ldO1xuXHRcdFx0dmFyIGRpdiA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoJ2RpdicpO1xuXHRcdFx0ZGl2LmNsYXNzTmFtZSA9ICdiYWMtLXVzZXItbGlzdC1pdGVtJztcblx0XHRcdGRpdi5pbm5lckhUTUwgPSBhY2NvdW50c1RlbXBsYXRlKGFjY291bnQsIGFjY291bnQuc2ZpZCA9PT0gY3VycmVudEFjY291bnQuc2ZpZCk7XG5cdFx0XHRkaXYub25jbGljayA9IGZ1bmN0aW9uIChlKSB7XG5cdFx0XHRcdGUucHJldmVudERlZmF1bHQoKTtcblx0XHRcdFx0UFBCQS5jaGFuZ2VBY2NvdW50KGFjY291bnQuc2ZpZCk7XG5cdFx0XHR9O1xuXHRcdFx0ZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoJ2JhYy0tcHVyZXNkay11c2VyLWJ1c2luZXNzZXMtLScpLmFwcGVuZENoaWxkKGRpdik7XG5cdFx0fTtcblxuXHRcdGZvciAodmFyIGkgPSAwOyBpIDwgYWNjb3VudHMubGVuZ3RoOyBpKyspIHtcblx0XHRcdF9sb29wKGkpO1xuXHRcdH1cblx0fSxcblxuXHRyZW5kZXJJbmZvQmxvY2tzOiBmdW5jdGlvbiByZW5kZXJJbmZvQmxvY2tzKCkge1xuXHRcdHZhciBibG9ja3NUZW1wbGF0ZSA9IGZ1bmN0aW9uIGJsb2Nrc1RlbXBsYXRlKGluZGV4KSB7XG5cdFx0XHRyZXR1cm4gJ1xcblxcdFxcdFxcdFxcdCA8ZGl2IGNsYXNzPVwiYmFjLS1wdXJlc2RrLWluZm8tYm94LS1cIiBpZD1cImJhYy0tcHVyZXNkay1pbmZvLWJveC0tJyArIGluZGV4ICsgJ1wiPlxcblxcdFxcdFxcdFxcdCBcXHQ8ZGl2IGNsYXNzPVwiYmFjLS10aW1lclwiIGlkPVwiYmFjLS10aW1lcicgKyBpbmRleCArICdcIj48L2Rpdj5cXG5cXHRcXHRcXHRcXHRcXHQgPGRpdiBjbGFzcz1cImJhYy0taW5uZXItaW5mby1ib3gtLVwiPlxcblxcdFxcdFxcdFxcdFxcdCBcXHRcXHQ8ZGl2IGNsYXNzPVwiYmFjLS1pbmZvLWljb24tLSBmYS1zdWNjZXNzXCI+PC9kaXY+XFxuXFx0XFx0XFx0XFx0XFx0IFxcdFxcdDxkaXYgY2xhc3M9XCJiYWMtLWluZm8taWNvbi0tIGZhLXdhcm5pbmdcIj48L2Rpdj5cXG5cXHRcXHRcXHRcXHRcXHQgXFx0XFx0PGRpdiBjbGFzcz1cImJhYy0taW5mby1pY29uLS0gZmEtaW5mby0xXCI+PC9kaXY+XFxuXFx0XFx0XFx0XFx0XFx0IFxcdFxcdDxkaXYgY2xhc3M9XCJiYWMtLWluZm8taWNvbi0tIGZhLWVycm9yXCI+PC9kaXY+XFxuXFx0XFx0XFx0XFx0XFx0IFxcdFxcdCA8ZGl2IGNsYXNzPVwiYmFjLS1pbmZvLW1haW4tdGV4dC0tXCIgaWQ9XCJiYWMtLWluZm8tbWFpbi10ZXh0LS0nICsgaW5kZXggKyAnXCI+PC9kaXY+XFxuXFx0XFx0XFx0XFx0XFx0IFxcdFxcdCA8ZGl2IGNsYXNzPVwiYmFjLS1pbmZvLWNsb3NlLWJ1dHRvbi0tIGZhLWNsb3NlLTFcIiBpZD1cImJhYy0taW5mby1jbG9zZS1idXR0b24tLScgKyBpbmRleCArICdcIj48L2Rpdj5cXG5cXHRcXHRcXHRcXHRcXHQ8L2Rpdj5cXG5cXHRcXHRcXHRcXHQ8L2Rpdj5cXG5cXHRcXHQgICc7XG5cdFx0fTtcblxuXHRcdHZhciBpbmZvQmxvY2tzV3JhcHBlciA9IGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKCdiYWMtLWluZm8tYmxvY2tzLXdyYXBwZXItLScpO1xuXHRcdHZhciBpbm5lckh0bWwgPSAnJztcblx0XHRmb3IgKHZhciBpID0gMTsgaSA8IDU7IGkrKykge1xuXHRcdFx0aW5uZXJIdG1sICs9IGJsb2Nrc1RlbXBsYXRlKGkpO1xuXHRcdH1cblxuXHRcdGluZm9CbG9ja3NXcmFwcGVyLmlubmVySFRNTCA9IGlubmVySHRtbDtcblx0fSxcblxuXHRyZW5kZXJWZXJzaW9uTnVtYmVyOiBmdW5jdGlvbiByZW5kZXJWZXJzaW9uTnVtYmVyKHZlcnNpb24pIHtcblx0XHRkb2N1bWVudC5nZXRFbGVtZW50QnlJZCgncHVyZXNkay12ZXJzaW9uLW51bWJlcicpLmlubmVySFRNTCA9IHZlcnNpb247XG5cdH0sXG5cblx0c3R5bGVBY2NvdW50OiBmdW5jdGlvbiBzdHlsZUFjY291bnQoYWNjb3VudCkge1xuXHRcdHZhciBhcHBJbmZvID0gU3RvcmUuZ2V0QXBwSW5mbygpO1xuXHRcdGlmIChhcHBJbmZvID09PSBudWxsKSB7XG5cdFx0XHR2YXIgbG9nbyA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoJ2ltZycpO1xuXHRcdFx0bG9nby5zcmMgPSBhY2NvdW50LnNka19sb2dvX2ljb247XG5cdFx0XHRkb2N1bWVudC5nZXRFbGVtZW50QnlJZCgnYmFjLS1wdXJlc2RrLWFjY291bnQtbG9nby0tJykuYXBwZW5kQ2hpbGQobG9nbyk7XG5cdFx0XHRkb2N1bWVudC5nZXRFbGVtZW50QnlJZCgnYmFjLS1wdXJlc2RrLWFjY291bnQtbG9nby0tJykub25jbGljayA9IGZ1bmN0aW9uIChlKSB7XG5cdFx0XHRcdC8vTG9nZ2VyLmxvZyhTdG9yZS5nZXRSb290VXJsKCkpO1xuXHRcdFx0XHR3aW5kb3cubG9jYXRpb24uaHJlZiA9IFN0b3JlLmdldFJvb3RVcmwoKTtcblx0XHRcdH07XG5cdFx0fSBlbHNlIHtcblx0XHRcdHZhciBhcHBPcGVuZXJUZW1wbGF0ZSA9IGZ1bmN0aW9uIGFwcE9wZW5lclRlbXBsYXRlKGFwcEluZm9ybWF0aW9uKSB7XG5cdFx0XHRcdHJldHVybiAnXFxuXFx0IFxcdCAgXFx0IFxcdFxcdDxkaXYgaWQ9XCJiYWMtLXB1cmVzZGstLWFwcHMtLW9wZW5lci0tXCI+XFxuICAgICAgICAgICAgICAgICAgICA8aSBjbGFzcz1cImZhIGZhLXNxdWFyZXNcIiBpZD1cImJhYy0tcHVyZXNkay1hcHBzLWljb24tLVwiPjwvaT5cXG4gICAgICAgICAgICAgICAgICAgIDxkaXYgaWQ9XCJiYWMtLXB1cmVzZGstYXBwcy1uYW1lLS1cIiBjbGFzcz1cImJhYy0tcHVyZXNkay1hcHBzLW5hbWUtLVwiPmFwcHM8L2Rpdj5cXG4gICAgICAgICAgICAgICAgICAgIDxhIGhyZWY9XCInICsgYXBwSW5mb3JtYXRpb24ucm9vdCArICdcIiBpZD1cImFwcC1uYW1lLWxpbmstdG8tcm9vdFwiPicgKyBhcHBJbmZvcm1hdGlvbi5uYW1lICsgJzwvYT5cXG4gICAgICAgICAgICAgICAgPC9kaXY+XFxuXFx0IFxcdCAgXFx0IFxcdCc7XG5cdFx0XHR9O1xuXHRcdFx0ZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoJ2JhYy0tcHVyZXNkay1hY2NvdW50LWxvZ28tLScpLmlubmVySFRNTCA9IGFwcE9wZW5lclRlbXBsYXRlKGFwcEluZm8pO1xuXHRcdH1cblxuXHRcdGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKCdiYWMtLXB1cmVzZGstYmFjLS1oZWFkZXItYXBwcy0tJykuc3R5bGUuY3NzVGV4dCA9IFwiYmFja2dyb3VuZDogI1wiICsgYWNjb3VudC5zZGtfYmFja2dyb3VuZF9jb2xvciArIFwiOyBjb2xvcjogI1wiICsgYWNjb3VudC5zZGtfZm9udF9jb2xvcjtcblx0XHRkb2N1bWVudC5nZXRFbGVtZW50QnlJZCgnYmFjLS1wdXJlc2RrLXVzZXItc2lkZWJhci0tJykuc3R5bGUuY3NzVGV4dCA9IFwiYmFja2dyb3VuZDogI1wiICsgYWNjb3VudC5zZGtfYmFja2dyb3VuZF9jb2xvciArIFwiOyBjb2xvcjogI1wiICsgYWNjb3VudC5zZGtfZm9udF9jb2xvcjtcblx0XHRpZiAoZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoJ2JhYy0tcHVyZXNkay1hcHBzLW5hbWUtLScpKSB7XG5cdFx0XHRkb2N1bWVudC5nZXRFbGVtZW50QnlJZCgnYmFjLS1wdXJlc2RrLWFwcHMtbmFtZS0tJykuc3R5bGUuY3NzVGV4dCA9IFwiY29sb3I6ICNcIiArIGFjY291bnQuc2RrX2ZvbnRfY29sb3I7XG5cdFx0fVxuXHRcdGlmIChkb2N1bWVudC5nZXRFbGVtZW50QnlJZCgnYmFjLS1zZWxlY3RlZC1hY291bnQtaW5kaWNhdG9yJykpIHtcblx0XHRcdGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKCdiYWMtLXNlbGVjdGVkLWFjb3VudC1pbmRpY2F0b3InKS5zdHlsZS5jc3NUZXh0ID0gXCJiYWNrZ3JvdW5kOiAjXCIgKyBhY2NvdW50LnNka19mb250X2NvbG9yO1xuXHRcdH1cblx0fSxcblxuXHRnb1RvTG9naW5QYWdlOiBmdW5jdGlvbiBnb1RvTG9naW5QYWdlKCkge1xuXHRcdHdpbmRvdy5sb2NhdGlvbi5ocmVmID0gU3RvcmUuZ2V0TG9naW5VcmwoKTtcblx0fSxcblxuXHQvKiBMT0FERVIgKi9cblx0c2hvd0xvYWRlcjogZnVuY3Rpb24gc2hvd0xvYWRlcigpIHtcblx0XHREb20uYWRkQ2xhc3MoZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoJ2JhYy0tcHVyZXNkay0tbG9hZGVyLS0nKSwgJ2JhYy0tcHVyZXNkay12aXNpYmxlJyk7XG5cdH0sXG5cblx0aGlkZUxvYWRlcjogZnVuY3Rpb24gaGlkZUxvYWRlcigpIHtcblx0XHREb20ucmVtb3ZlQ2xhc3MoZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoJ2JhYy0tcHVyZXNkay0tbG9hZGVyLS0nKSwgJ2JhYy0tcHVyZXNkay12aXNpYmxlJyk7XG5cdH0sXG5cblx0b3BlbkNsb3VkaW5hcnlQaWNrZXI6IGZ1bmN0aW9uIG9wZW5DbG91ZGluYXJ5UGlja2VyKG9wdGlvbnMpIHtcblx0XHRDbG91ZGluYXJ5Lm9wZW5Nb2RhbChvcHRpb25zKTtcblx0fSxcblxuXHQvKlxuICB0eXBlOiBvbmUgb2Y6XG4gIC0gc3VjY2Vzc1xuICAtIGluZm9cbiAgLSB3YXJuaW5nXG4gIC0gZXJyb3JcbiAgdGV4dDogdGhlIHRleHQgdG8gZGlzcGxheVxuICBvcHRpb25zIChvcHRpb25hbCk6IHtcbiAgXHRcdGhpZGVJbjogbWlsbGlzZWNvbmRzIHRvIGhpZGUgaXQuIC0xIGZvciBub3QgaGlkaW5nIGl0IGF0IGFsbC4gRGVmYXVsdCBpcyA1MDAwXG4gIH1cbiAgKi9cblx0c2V0SW5mbzogZnVuY3Rpb24gc2V0SW5mbyh0eXBlLCB0ZXh0LCBvcHRpb25zKSB7XG5cdFx0SW5mb0NvbnRyb2xsZXIuc2hvd0luZm8odHlwZSwgdGV4dCwgb3B0aW9ucyk7XG5cdH0sXG5cblx0cmVuZGVyOiBmdW5jdGlvbiByZW5kZXIoKSB7XG5cdFx0dmFyIHdoZXJlVG8gPSBkb2N1bWVudC5nZXRFbGVtZW50QnlJZChTdG9yZS5nZXRIVExNQ29udGFpbmVyKCkpO1xuXHRcdGlmICh3aGVyZVRvID09PSBudWxsKSB7XG5cdFx0XHRMb2dnZXIuZXJyb3IoJ3RoZSBjb250YWluZXIgd2l0aCBpZCBcIicgKyB3aGVyZVRvICsgJ1wiIGhhcyBub3QgYmVlbiBmb3VuZCBvbiB0aGUgZG9jdW1lbnQuIFRoZSBsaWJyYXJ5IGlzIGdvaW5nIHRvIGNyZWF0ZSBpdC4nKTtcblx0XHRcdHZhciBkaXYgPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KCdkaXYnKTtcblx0XHRcdGRpdi5pZCA9IFN0b3JlLmdldEhUTE1Db250YWluZXIoKTtcblx0XHRcdGRpdi5zdHlsZS53aWR0aCA9ICcxMDAlJztcblx0XHRcdGRpdi5zdHlsZS5oZWlnaHQgPSBcIjUwcHhcIjtcblx0XHRcdGRpdi5zdHlsZS5wb3NpdGlvbiA9IFwiZml4ZWRcIjtcblx0XHRcdGRpdi5zdHlsZS50b3AgPSBcIjBweFwiO1xuXHRcdFx0ZGl2LnN0eWxlLnpJbmRleCA9IFwiMjE0NzQ4MzY0N1wiO1xuXHRcdFx0ZG9jdW1lbnQuYm9keS5pbnNlcnRCZWZvcmUoZGl2LCBkb2N1bWVudC5ib2R5LmZpcnN0Q2hpbGQpO1xuXHRcdFx0d2hlcmVUbyA9IGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKFN0b3JlLmdldEhUTE1Db250YWluZXIoKSk7XG5cdFx0fVxuXHRcdHdoZXJlVG8uaW5uZXJIVE1MID0gU3RvcmUuZ2V0SFRNTCgpO1xuXHRcdFBQQkEucmVuZGVyVXNlcihTdG9yZS5nZXRVc2VyRGF0YSgpLnVzZXIpO1xuXHRcdFBQQkEucmVuZGVySW5mb0Jsb2NrcygpO1xuXHRcdFBQQkEucmVuZGVyQWNjb3VudHMoU3RvcmUuZ2V0VXNlckRhdGEoKS51c2VyLmFjY291bnRzLCBTdG9yZS5nZXRVc2VyRGF0YSgpLnVzZXIuYWNjb3VudCk7XG5cdFx0UFBCQS5zdHlsZUFjY291bnQoU3RvcmUuZ2V0VXNlckRhdGEoKS51c2VyLmFjY291bnQpO1xuXHRcdFBQQkEucmVuZGVyVmVyc2lvbk51bWJlcihTdG9yZS5nZXRWZXJzaW9uTnVtYmVyKCkpO1xuXHRcdGlmIChTdG9yZS5nZXRBcHBzVmlzaWJsZSgpID09PSBmYWxzZSkge1xuXHRcdFx0ZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoJ2JhYy0tcHVyZXNkay1hcHBzLXNlY3Rpb24tLScpLnN0eWxlLmNzc1RleHQgPSBcImRpc3BsYXk6bm9uZVwiO1xuXHRcdH1cblx0XHRhZnRlclJlbmRlcigpO1xuXHR9XG59O1xuXG5tb2R1bGUuZXhwb3J0cyA9IFBQQkE7IiwiJ3VzZSBzdHJpY3QnO1xuXG4vKiFcbiAqIFB1cmVQcm9maWxlIFB1cmVQcm9maWxlIEJ1c2luZXNzIEFwcHMgRGV2ZWxvcG1lbnQgU0RLXG4gKlxuICogdmVyc2lvbjogMi42LjZcbiAqIGRhdGU6IDIwMTctMTAtMDVcbiAqXG4gKiBDb3B5cmlnaHQgMjAxNywgUHVyZVByb2ZpbGVcbiAqIFJlbGVhc2VkIHVuZGVyIE1JVCBsaWNlbnNlXG4gKiBodHRwczovL29wZW5zb3VyY2Uub3JnL2xpY2Vuc2VzL01JVFxuICovXG5cbnZhciBwcGJhID0gcmVxdWlyZSgnLi9QUEJBJyk7XG5wcGJhLnNldFdpbmRvd05hbWUoJ1BVUkVTREsnKTtcbnBwYmEuc2V0Q29uZmlndXJhdGlvbih7XG4gICAgXCJsb2dzXCI6IGZhbHNlLFxuICAgIFwicm9vdFVybFwiOiBcIi9cIixcbiAgICBcImJhc2VVcmxcIjogXCJhcGkvdjEvXCIsXG4gICAgXCJsb2dpblVybFwiOiBcImFwaS92MS9vYXV0aDJcIixcbiAgICBcInNlYXJjaElucHV0SWRcIjogXCItLXB1cmVzZGstLXNlYXJjaC0taW5wdXQtLVwiLFxuICAgIFwicmVkaXJlY3RVcmxQYXJhbVwiOiBcInJlZGlyZWN0X3VybFwiXG59KTtcbnBwYmEuc2V0SFRNTFRlbXBsYXRlKCc8aGVhZGVyIGNsYXNzPVwiYmFjLS1oZWFkZXItYXBwc1wiIGlkPVwiYmFjLS1wdXJlc2RrLWJhYy0taGVhZGVyLWFwcHMtLVwiPlxcbiAgICA8ZGl2IGNsYXNzPVwiYmFjLS1jb250YWluZXJcIj5cXG4gICAgICAgIDxkaXYgY2xhc3M9XCJiYWMtLWxvZ29cIiBpZD1cImJhYy0tcHVyZXNkay1hY2NvdW50LWxvZ28tLVwiPjwvZGl2PlxcbiAgICAgICAgPGRpdiBjbGFzcz1cImJhYy0tdXNlci1hY3Rpb25zXCI+XFxuICAgICAgICAgICAgPHN2ZyBpZD1cImJhYy0tcHVyZXNkay0tbG9hZGVyLS1cIiB3aWR0aD1cIjM4XCIgaGVpZ2h0PVwiMzhcIiB2aWV3Qm94PVwiMCAwIDQ0IDQ0XCIgeG1sbnM9XCJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2Z1wiIHN0cm9rZT1cIiNmZmZcIiBzdHlsZT1cIlxcbiAgICBtYXJnaW4tcmlnaHQ6IDEwcHg7XFxuXCI+XFxuICAgICAgICAgICAgICAgIDxnIGZpbGw9XCJub25lXCIgZmlsbC1ydWxlPVwiZXZlbm9kZFwiIHN0cm9rZS13aWR0aD1cIjJcIj5cXG4gICAgICAgICAgICAgICAgICAgIDxjaXJjbGUgY3g9XCIyMlwiIGN5PVwiMjJcIiByPVwiMTYuNjQzN1wiPlxcbiAgICAgICAgICAgICAgICAgICAgICAgIDxhbmltYXRlIGF0dHJpYnV0ZU5hbWU9XCJyXCIgYmVnaW49XCIwc1wiIGR1cj1cIjEuOHNcIiB2YWx1ZXM9XCIxOyAyMFwiIGNhbGNNb2RlPVwic3BsaW5lXCIga2V5VGltZXM9XCIwOyAxXCIga2V5U3BsaW5lcz1cIjAuMTY1LCAwLjg0LCAwLjQ0LCAxXCIgcmVwZWF0Q291bnQ9XCJpbmRlZmluaXRlXCI+PC9hbmltYXRlPlxcbiAgICAgICAgICAgICAgICAgICAgICAgIDxhbmltYXRlIGF0dHJpYnV0ZU5hbWU9XCJzdHJva2Utb3BhY2l0eVwiIGJlZ2luPVwiMHNcIiBkdXI9XCIxLjhzXCIgdmFsdWVzPVwiMTsgMFwiIGNhbGNNb2RlPVwic3BsaW5lXCIga2V5VGltZXM9XCIwOyAxXCIga2V5U3BsaW5lcz1cIjAuMywgMC42MSwgMC4zNTUsIDFcIiByZXBlYXRDb3VudD1cImluZGVmaW5pdGVcIj48L2FuaW1hdGU+XFxuICAgICAgICAgICAgICAgICAgICA8L2NpcmNsZT5cXG4gICAgICAgICAgICAgICAgICAgIDxjaXJjbGUgY3g9XCIyMlwiIGN5PVwiMjJcIiByPVwiMTkuOTI4MlwiPlxcbiAgICAgICAgICAgICAgICAgICAgICAgIDxhbmltYXRlIGF0dHJpYnV0ZU5hbWU9XCJyXCIgYmVnaW49XCJiYWMtMC45c1wiIGR1cj1cIjEuOHNcIiB2YWx1ZXM9XCIxOyAyMFwiIGNhbGNNb2RlPVwic3BsaW5lXCIga2V5VGltZXM9XCIwOyAxXCIga2V5U3BsaW5lcz1cIjAuMTY1LCAwLjg0LCAwLjQ0LCAxXCIgcmVwZWF0Q291bnQ9XCJpbmRlZmluaXRlXCI+PC9hbmltYXRlPlxcbiAgICAgICAgICAgICAgICAgICAgICAgIDxhbmltYXRlIGF0dHJpYnV0ZU5hbWU9XCJzdHJva2Utb3BhY2l0eVwiIGJlZ2luPVwiYmFjLTAuOXNcIiBkdXI9XCIxLjhzXCIgdmFsdWVzPVwiMTsgMFwiIGNhbGNNb2RlPVwic3BsaW5lXCIga2V5VGltZXM9XCIwOyAxXCIga2V5U3BsaW5lcz1cIjAuMywgMC42MSwgMC4zNTUsIDFcIiByZXBlYXRDb3VudD1cImluZGVmaW5pdGVcIj48L2FuaW1hdGU+XFxuICAgICAgICAgICAgICAgICAgICA8L2NpcmNsZT5cXG4gICAgICAgICAgICAgICAgPC9nPlxcbiAgICAgICAgICAgIDwvc3ZnPlxcbiAgICAgICAgICAgIDxkaXYgY2xhc3M9XCJiYWMtLXVzZXItYXBwc1wiIGlkPVwiYmFjLS1wdXJlc2RrLWFwcHMtc2VjdGlvbi0tXCI+XFxuICAgICAgICAgICAgICAgIDwhLS08ZGl2IGlkPVwiYmFjJiM0NTsmIzQ1O3B1cmVzZGsmIzQ1OyYjNDU7YXBwcyYjNDU7JiM0NTtvcGVuZXImIzQ1OyYjNDU7XCI+LS0+XFxuICAgICAgICAgICAgICAgICAgICA8IS0tPGkgY2xhc3M9XCJmYSBmYS1zcXVhcmVzXCIgaWQ9XCJiYWMmIzQ1OyYjNDU7cHVyZXNkay1hcHBzLWljb24mIzQ1OyYjNDU7XCI+PC9pPi0tPlxcbiAgICAgICAgICAgICAgICAgICAgPCEtLTxkaXYgY2xhc3M9XCJiYWMmIzQ1OyYjNDU7cHVyZXNkay1hcHBzLW5hbWUmIzQ1OyYjNDU7XCI+YXBwczwvZGl2Pi0tPlxcbiAgICAgICAgICAgICAgICA8IS0tPC9kaXY+LS0+XFxuICAgICAgICAgICAgICAgIDwhLS08ZGl2IGNsYXNzPVwiYmFjJiM0NTsmIzQ1O2FwcHMtY29udGFpbmVyXCIgaWQ9XCJiYWMmIzQ1OyYjNDU7cHVyZXNkay1hcHBzLWNvbnRhaW5lciYjNDU7JiM0NTtcIj4tLT5cXG4gICAgICAgICAgICAgICAgICAgIDwhLS08ZGl2IGNsYXNzPVwiYmFjJiM0NTsmIzQ1O2FwcHMtYXJyb3dcIj48L2Rpdj4tLT5cXG4gICAgICAgICAgICAgICAgPCEtLTwvZGl2Pi0tPlxcbiAgICAgICAgICAgIDwvZGl2PlxcbiAgICAgICAgICAgIDwhLS08ZGl2IGNsYXNzPVwiYmFjJiM0NTsmIzQ1O3VzZXItbm90aWZpY2F0aW9uc1wiPi0tPlxcbiAgICAgICAgICAgICAgICA8IS0tPGRpdiBjbGFzcz1cImJhYyYjNDU7JiM0NTt1c2VyLW5vdGlmaWNhdGlvbnMtY291bnRcIj4xPC9kaXY+LS0+XFxuICAgICAgICAgICAgICAgIDwhLS08aSBjbGFzcz1cImZhIGZhLWJlbGwtb1wiPjwvaT4tLT5cXG4gICAgICAgICAgICA8IS0tPC9kaXY+LS0+XFxuICAgICAgICAgICAgPGRpdiBjbGFzcz1cImJhYy0tdXNlci1hdmF0YXJcIiBpZD1cImJhYy0tdXNlci1hdmF0YXItdG9wXCI+XFxuICAgICAgICAgICAgICAgIDxzcGFuIGNsYXNzPVwiYmFjLS11c2VyLWF2YXRhci1uYW1lXCIgaWQ9XCJiYWMtLXB1cmVzZGstdXNlci1hdmF0YXItLVwiPjwvc3Bhbj5cXG4gICAgICAgICAgICAgICAgPGRpdiBpZD1cImJhYy0taW1hZ2UtY29udGFpbmVyLXRvcFwiPjwvZGl2PlxcbiAgICAgICAgICAgIDwvZGl2PlxcbiAgICAgICAgPC9kaXY+XFxuICAgIDwvZGl2PlxcbiAgICA8ZGl2IGlkPVwiYmFjLS1pbmZvLWJsb2Nrcy13cmFwcGVyLS1cIj48L2Rpdj5cXG48L2hlYWRlcj5cXG48ZGl2IGNsYXNzPVwiYmFjLS11c2VyLXNpZGViYXJcIiBpZD1cImJhYy0tcHVyZXNkay11c2VyLXNpZGViYXItLVwiPlxcbiAgICA8ZGl2IGlkPVwiYmFjLS1wdXJlc2RrLXVzZXItZGV0YWlscy0tXCI+PC9kaXY+XFxuICAgIDwhLS08ZGl2IGNsYXNzPVwiYmFjJiM0NTsmIzQ1O3VzZXItc2lkZWJhci1pbmZvXCI+LS0+XFxuICAgICAgICA8IS0tPGRpdiBjbGFzcz1cImJhYyYjNDU7JiM0NTt1c2VyLWltYWdlXCI+PGkgY2xhc3M9XCJmYSBmYS1jYW1lcmFcIj48L2k+PC9kaXY+LS0+XFxuICAgICAgICA8IS0tPGRpdiBjbGFzcz1cImJhYyYjNDU7JiM0NTt1c2VyLW5hbWVcIj5DdXJ0aXMgQmFydGxldHQ8L2Rpdj4tLT5cXG4gICAgICAgIDwhLS08ZGl2IGNsYXNzPVwiYmFjJiM0NTsmIzQ1O3VzZXItZW1haWxcIj5jYmFydGxldHRAcHVyZXByb2ZpbGUuY29tPC9kaXY+LS0+XFxuICAgIDwhLS08L2Rpdj4tLT5cXG4gICAgPGRpdiBjbGFzcz1cImJhYy0tdXNlci1hcHBzXCIgaWQ9XCJiYWMtLXB1cmVzZGstdXNlci1idXNpbmVzc2VzLS1cIj5cXG4gICAgICAgIDwhLS08ZGl2IGNsYXNzPVwiYmFjJiM0NTsmIzQ1O3VzZXItbGlzdC1pdGVtXCI+LS0+XFxuICAgICAgICAgICAgPCEtLTxpbWcgc3JjPVwiaHR0cDovL2xvcmVtcGl4ZWwuY29tLzQwLzQwXCIgYWx0PVwiXCI+LS0+XFxuICAgICAgICAgICAgPCEtLTxkaXYgY2xhc3M9XCJiYWMtdXNlci1hcHAtZGV0YWlsc1wiPi0tPlxcbiAgICAgICAgICAgICAgICA8IS0tPHNwYW4+PC9zcGFuPi0tPlxcbiAgICAgICAgICAgICAgICA8IS0tPHNwYW4+MTUgdGVhbSBtZW1iZXJzPC9zcGFuPi0tPlxcbiAgICAgICAgICAgIDwhLS08L2Rpdj4tLT5cXG4gICAgICAgIDwhLS08L2Rpdj4tLT5cXG4gICAgPC9kaXY+XFxuICAgIDxkaXYgY2xhc3M9XCJiYWMtLXVzZXItYWNjb3VudC1zZXR0aW5nc1wiPlxcbiAgICAgICAgPCEtLTxkaXYgY2xhc3M9XCJiYWMtdXNlci1hY291bnQtbGlzdC1pdGVtXCI+LS0+XFxuICAgICAgICAgICAgPCEtLTxpIGNsYXNzPVwiZmEgZmEtY29nLWxpbmVcIj48L2k+LS0+XFxuICAgICAgICAgICAgPCEtLTxhIGhyZWY9XCIjXCI+QWNjb3VudCBTZWN1cml0eTwvYT4tLT5cXG4gICAgICAgIDwhLS08L2Rpdj4tLT5cXG4gICAgICAgIDxkaXYgY2xhc3M9XCJiYWMtdXNlci1hY291bnQtbGlzdC1pdGVtXCI+XFxuICAgICAgICAgICAgPGkgY2xhc3M9XCJmYSBmYS1sb2dpbi1saW5lXCI+PC9pPlxcbiAgICAgICAgICAgIDxhIGhyZWY9XCIvYXBpL3YxL3NpZ24tb2ZmXCI+TG9nIG91dDwvYT5cXG4gICAgICAgIDwvZGl2PlxcblxcbiAgICAgICAgPGRpdiBpZD1cInB1cmVzZGstdmVyc2lvbi1udW1iZXJcIiBjbGFzcz1cInB1cmVzZGstdmVyc2lvbi1udW1iZXJcIj48L2Rpdj5cXG4gICAgPC9kaXY+XFxuPC9kaXY+XFxuXFxuXFxuPGRpdiBjbGFzcz1cImJhYy0tY3VzdG9tLW1vZGFsIGFkZC1xdWVzdGlvbi1tb2RhbCAtLWlzLW9wZW5cIiBpZD1cImJhYy0tY2xvdWRpbmFyeS0tbW9kYWxcIj5cXG4gICAgPGRpdiBjbGFzcz1cImN1c3RvbS1tb2RhbF9fd3JhcHBlclwiPlxcbiAgICAgICAgPGRpdiBjbGFzcz1cImN1c3RvbS1tb2RhbF9fY29udGVudFwiPlxcbiAgICAgICAgICAgIDxoMz5BZGQgaW1hZ2U8L2gzPlxcbiAgICAgICAgICAgIDxhIGNsYXNzPVwiY3VzdG9tLW1vZGFsX19jbG9zZS1idG5cIiBpZD1cImJhYy0tY2xvdWRpbmFyeS0tY2xvc2VidG5cIj48aSBjbGFzcz1cImZhIGZhLXRpbWVzLWNpcmNsZVwiPjwvaT48L2E+XFxuICAgICAgICA8L2Rpdj5cXG5cXG4gICAgICAgIDxkaXYgY2xhc3M9XCJjdXN0b20tbW9kYWxfX2NvbnRlbnRcIj5cXG4gICAgICAgICAgICA8ZGl2IGNsYXNzPVwiYmFjLXNlYXJjaCAtLWljb24tbGVmdFwiPlxcbiAgICAgICAgICAgICAgICA8aW5wdXQgaWQ9XCJiYWMtLWNsb3VkaW5hcnktLXNlYXJjaC1pbnB1dFwiIHR5cGU9XCJzZWFyY2hcIiBuYW1lPVwic2VhcmNoXCIgcGxhY2Vob2xkZXI9XCJTZWFyY2ggZm9yIGltYWdlcy4uLlwiLz5cXG4gICAgICAgICAgICAgICAgPGRpdiBjbGFzcz1cImJhYy1zZWFyY2hfX2ljb25cIj48aSBjbGFzcz1cImZhIGZhLXNlYXJjaFwiPjwvaT48L2Rpdj5cXG4gICAgICAgICAgICA8L2Rpdj5cXG4gICAgICAgICAgICA8YnIvPlxcblxcbiAgICAgICAgICAgIDxkaXYgY2xhc3M9XCJiYWNrLWJ1dHRvblwiIGlkPVwiYmFjLS1jbG91ZGluYXJ5LS1iYWNrLWJ1dHRvbi1jb250YWluZXJcIj5cXG4gICAgICAgICAgICAgICAgPGEgY2xhc3M9XCJnb0JhY2tcIiBpZD1cImJhYy0tY2xvdWRpbmFyeS0tZ28tYmFja1wiPjxpIGNsYXNzPVwiZmEgZmEtYW5nbGUtbGVmdFwiPjwvaT5HbyBCYWNrPC9hPlxcbiAgICAgICAgICAgIDwvZGl2PlxcblxcbiAgICAgICAgICAgIDxici8+XFxuICAgICAgICAgICAgPGRpdiBjbGFzcz1cImNsb3VkLWltYWdlc1wiPlxcbiAgICAgICAgICAgICAgICA8ZGl2IGNsYXNzPVwiY2xvdWQtaW1hZ2VzX19jb250YWluZXJcIiBpZD1cImJhYy0tY2xvdWRpbmFyeS1pdGFtcy1jb250YWluZXJcIj48L2Rpdj5cXG5cXG4gICAgICAgICAgICAgICAgPGRpdiBjbGFzcz1cImNsb3VkLWltYWdlc19fcGFnaW5hdGlvblwiIGlkPVwiYmFjLS1jbG91ZGluYXJ5LXBhZ2luYXRpb24tY29udGFpbmVyXCI+XFxuICAgICAgICAgICAgICAgICAgICA8dWwgaWQ9XCJiYWMtLWNsb3VkaW5hcnktYWN0dWFsLXBhZ2luYXRpb24tY29udGFpbmVyXCI+PC91bD5cXG4gICAgICAgICAgICAgICAgPC9kaXY+XFxuXFxuICAgICAgICAgICAgPC9kaXY+XFxuICAgICAgICA8L2Rpdj5cXG4gICAgPC9kaXY+XFxuPC9kaXY+XFxuXFxuPGlucHV0IHN0eWxlPVwiZGlzcGxheTpub25lXCIgdHlwZT1cXCdmaWxlXFwnIGlkPVxcJ2JhYy0tLXB1cmVzZGstYXZhdGFyLWZpbGVcXCc+XFxuPGlucHV0IHN0eWxlPVwiZGlzcGxheTpub25lXCIgdHlwZT1cXCdidXR0b25cXCcgaWQ9XFwnYmFjLS0tcHVyZXNkay1hdmF0YXItc3VibWl0XFwnIHZhbHVlPVxcJ1VwbG9hZCFcXCc+Jyk7XG5wcGJhLnNldFZlcnNpb25OdW1iZXIoJzIuNi42Jyk7XG5cbndpbmRvdy5QVVJFU0RLID0gcHBiYTtcblxudmFyIGNzcyA9ICdodG1sLGJvZHksZGl2LHNwYW4sYXBwbGV0LG9iamVjdCxpZnJhbWUsaDEsaDIsaDMsaDQsaDUsaDYscCxibG9ja3F1b3RlLHByZSxhLGFiYnIsYWNyb255bSxhZGRyZXNzLGJpZyxjaXRlLGNvZGUsZGVsLGRmbixlbSxpbWcsaW5zLGtiZCxxLHMsc2FtcCxzbWFsbCxzdHJpa2Usc3Ryb25nLHN1YixzdXAsdHQsdmFyLGIsdSxpLGNlbnRlcixkbCxkdCxkZCxvbCx1bCxsaSxmaWVsZHNldCxmb3JtLGxhYmVsLGxlZ2VuZCx0YWJsZSxjYXB0aW9uLHRib2R5LHRmb290LHRoZWFkLHRyLHRoLHRkLGFydGljbGUsYXNpZGUsY2FudmFzLGRldGFpbHMsZW1iZWQsZmlndXJlLGZpZ2NhcHRpb24sZm9vdGVyLGhlYWRlcixoZ3JvdXAsbWVudSxuYXYsb3V0cHV0LHJ1Ynksc2VjdGlvbixzdW1tYXJ5LHRpbWUsbWFyayxhdWRpbyx2aWRlb3ttYXJnaW46MDtwYWRkaW5nOjA7Ym9yZGVyOjA7Zm9udC1zaXplOjEwMCU7Zm9udDppbmhlcml0O3ZlcnRpY2FsLWFsaWduOmJhc2VsaW5lfWFydGljbGUsYXNpZGUsZGV0YWlscyxmaWdjYXB0aW9uLGZpZ3VyZSxmb290ZXIsaGVhZGVyLGhncm91cCxtZW51LG5hdixzZWN0aW9ue2Rpc3BsYXk6YmxvY2t9Ym9keXtsaW5lLWhlaWdodDoxfW9sLHVse2xpc3Qtc3R5bGU6bm9uZX1ibG9ja3F1b3RlLHF7cXVvdGVzOm5vbmV9YmxvY2txdW90ZTpiZWZvcmUsYmxvY2txdW90ZTphZnRlcixxOmJlZm9yZSxxOmFmdGVye2NvbnRlbnQ6XCJcIjtjb250ZW50Om5vbmV9dGFibGV7Ym9yZGVyLWNvbGxhcHNlOmNvbGxhcHNlO2JvcmRlci1zcGFjaW5nOjB9Ym9keXtvdmVyZmxvdy14OmhpZGRlbn0jYmFjLXdyYXBwZXJ7Zm9udC1mYW1pbHk6XCJWZXJkYW5hXCIsIGFyaWFsLCBzYW5zLXNlcmlmO2NvbG9yOndoaXRlO21pbi1oZWlnaHQ6MTAwdmg7cG9zaXRpb246cmVsYXRpdmV9LmJhYy0tY29udGFpbmVye21heC13aWR0aDoxMTYwcHg7bWFyZ2luOjAgYXV0b30uYmFjLS1jb250YWluZXIgI2FwcC1uYW1lLWxpbmstdG8tcm9vdHtkaXNwbGF5OmJsb2NrO3Bvc2l0aW9uOmFic29sdXRlO2xlZnQ6NjVweDt0b3A6NHB4O2ZvbnQtc2l6ZToxLjRlbTt3aWR0aDoxNTBweDtjb2xvcjp3aGl0ZTt0ZXh0LWRlY29yYXRpb246bm9uZX0uYmFjLS1oZWFkZXItYXBwc3twb3NpdGlvbjphYnNvbHV0ZTt3aWR0aDoxMDAlO2hlaWdodDo1MHB4O2JhY2tncm91bmQtY29sb3I6IzQ3NTM2OTtwYWRkaW5nOjVweCAxMHB4O3otaW5kZXg6OTk5OTk5OX0uYmFjLS1oZWFkZXItYXBwcyAuYmFjLS1jb250YWluZXJ7aGVpZ2h0OjEwMCU7ZGlzcGxheTpmbGV4O2FsaWduLWl0ZW1zOmNlbnRlcjtqdXN0aWZ5LWNvbnRlbnQ6c3BhY2UtYmV0d2Vlbn0uYmFjLS1oZWFkZXItc2VhcmNoe3Bvc2l0aW9uOnJlbGF0aXZlfS5iYWMtLWhlYWRlci1zZWFyY2ggaW5wdXR7Y29sb3I6I2ZmZjtmb250LXNpemU6MTRweDtoZWlnaHQ6MzVweDtiYWNrZ3JvdW5kLWNvbG9yOiM2Yjc1ODY7cGFkZGluZzowIDVweCAwIDEwcHg7Ym9yZGVyOm5vbmU7Ym9yZGVyLXJhZGl1czozcHg7bWluLXdpZHRoOjQwMHB4O3dpZHRoOjEwMCV9LmJhYy0taGVhZGVyLXNlYXJjaCBpbnB1dDpmb2N1c3tvdXRsaW5lOm5vbmV9LmJhYy0taGVhZGVyLXNlYXJjaCBpbnB1dDo6LXdlYmtpdC1pbnB1dC1wbGFjZWhvbGRlcntmb250LXN0eWxlOm5vcm1hbCAhaW1wb3J0YW50O3RleHQtYWxpZ246Y2VudGVyO2NvbG9yOiNmZmY7Zm9udC1zaXplOjE0cHg7Zm9udC13ZWlnaHQ6MzAwO2xldHRlci1zcGFjaW5nOjAuNXB4fS5iYWMtLWhlYWRlci1zZWFyY2ggaW5wdXQ6Oi1tb3otcGxhY2Vob2xkZXJ7Zm9udC1zdHlsZTpub3JtYWwgIWltcG9ydGFudDt0ZXh0LWFsaWduOmNlbnRlcjtjb2xvcjojZmZmO2ZvbnQtc2l6ZToxNHB4O2ZvbnQtd2VpZ2h0OjMwMDtsZXR0ZXItc3BhY2luZzowLjVweH0uYmFjLS1oZWFkZXItc2VhcmNoIGlucHV0Oi1tcy1pbnB1dC1wbGFjZWhvbGRlcntmb250LXN0eWxlOm5vcm1hbCAhaW1wb3J0YW50O3RleHQtYWxpZ246Y2VudGVyO2NvbG9yOiNmZmY7Zm9udC1zaXplOjE0cHg7Zm9udC13ZWlnaHQ6MzAwO2xldHRlci1zcGFjaW5nOjAuNXB4fS5iYWMtLWhlYWRlci1zZWFyY2ggaXtwb3NpdGlvbjphYnNvbHV0ZTt0b3A6OHB4O3JpZ2h0OjEwcHh9LmJhYy0tdXNlci1hY3Rpb25ze2Rpc3BsYXk6ZmxleDthbGlnbi1pdGVtczpjZW50ZXJ9LmJhYy0tdXNlci1hY3Rpb25zPmRpdntjdXJzb3I6cG9pbnRlcjtjb2xvcjp3aGl0ZX0uYmFjLS11c2VyLWFjdGlvbnMgLmJhYy0tdXNlci1ub3RpZmljYXRpb25ze3Bvc2l0aW9uOnJlbGF0aXZlfS5iYWMtLXVzZXItYWN0aW9ucyAuYmFjLS11c2VyLW5vdGlmaWNhdGlvbnMgaXtmb250LXNpemU6MjBweH0uYmFjLS11c2VyLWFjdGlvbnMgI2JhYy0tcHVyZXNkay0tbG9hZGVyLS17ZGlzcGxheTpub25lfS5iYWMtLXVzZXItYWN0aW9ucyAjYmFjLS1wdXJlc2RrLS1sb2FkZXItLS5iYWMtLXB1cmVzZGstdmlzaWJsZXtkaXNwbGF5OmJsb2NrfS5iYWMtLXVzZXItYWN0aW9ucyAuYmFjLS11c2VyLW5vdGlmaWNhdGlvbnMtY291bnR7cG9zaXRpb246YWJzb2x1dGU7ZGlzcGxheTppbmxpbmUtYmxvY2s7aGVpZ2h0OjE1cHg7d2lkdGg6MTVweDtsaW5lLWhlaWdodDoxNXB4O2NvbG9yOiNmZmY7Zm9udC1zaXplOjEwcHg7dGV4dC1hbGlnbjpjZW50ZXI7YmFja2dyb3VuZC1jb2xvcjojZmMzYjMwO2JvcmRlci1yYWRpdXM6NTAlO3RvcDotNXB4O2xlZnQ6LTVweH0uYmFjLS11c2VyLWFjdGlvbnMgLmJhYy0tdXNlci1hdmF0YXIsLmJhYy0tdXNlci1hY3Rpb25zIC5iYWMtLXVzZXItbm90aWZpY2F0aW9uc3ttYXJnaW4tbGVmdDoyMHB4fS5iYWMtLXVzZXItYWN0aW9ucyAuYmFjLS11c2VyLWF2YXRhcntwb3NpdGlvbjpyZWxhdGl2ZTtvdmVyZmxvdzpoaWRkZW47Ym9yZGVyLXJhZGl1czo1MCV9LmJhYy0tdXNlci1hY3Rpb25zIC5iYWMtLXVzZXItYXZhdGFyICNiYWMtLWltYWdlLWNvbnRhaW5lci10b3B7d2lkdGg6MTAwJTtoZWlndGg6MTAwJTtwb3NpdGlvbjphYnNvbHV0ZTt0b3A6MDtsZWZ0OjA7ei1pbmRleDoxO2Rpc3BsYXk6bm9uZX0uYmFjLS11c2VyLWFjdGlvbnMgLmJhYy0tdXNlci1hdmF0YXIgI2JhYy0taW1hZ2UtY29udGFpbmVyLXRvcCBpbWd7d2lkdGg6MTAwJTtoZWlnaHQ6MTAwJX0uYmFjLS11c2VyLWFjdGlvbnMgLmJhYy0tdXNlci1hdmF0YXIgI2JhYy0taW1hZ2UtY29udGFpbmVyLXRvcC5iYWMtLXB1cmVzZGstdmlzaWJsZXtkaXNwbGF5OmJsb2NrfS5iYWMtLXVzZXItYWN0aW9ucyAuYmFjLS11c2VyLWF2YXRhci1uYW1le2NvbG9yOiNmZmY7YmFja2dyb3VuZC1jb2xvcjojYWRhZGFkO2Rpc3BsYXk6aW5saW5lLWJsb2NrO2hlaWdodDozNXB4O3dpZHRoOjM1cHg7bGluZS1oZWlnaHQ6MzVweDt0ZXh0LWFsaWduOmNlbnRlcjtmb250LXNpemU6MTRweH0uYmFjLS11c2VyLWFwcHN7cG9zaXRpb246cmVsYXRpdmV9I2JhYy0tcHVyZXNkay1hcHBzLWljb24tLXt3aWR0aDoyMHB4O2Rpc3BsYXk6aW5saW5lLWJsb2NrO3RleHQtYWxpZ246Y2VudGVyO2ZvbnQtc2l6ZToxNnB4fS5iYWMtLXB1cmVzZGstYXBwcy1uYW1lLS17Zm9udC1zaXplOjlweDt3aWR0aDoyMHB4O3RleHQtYWxpZ246Y2VudGVyfSNiYWMtLXB1cmVzZGstdXNlci1idXNpbmVzc2VzLS17aGVpZ2h0OmNhbGMoMTAwdmggLSA0NThweCk7b3ZlcmZsb3c6YXV0b30uYmFjLS1hcHBzLWNvbnRhaW5lcntiYWNrZ3JvdW5kOiNmZmY7cG9zaXRpb246YWJzb2x1dGU7dG9wOjQ1cHg7cmlnaHQ6LTQwcHg7ZGlzcGxheTpmbGV4O3dpZHRoOjM2MHB4O2ZsZXgtd3JhcDp3cmFwO2JvcmRlci1yYWRpdXM6MTBweDtwYWRkaW5nOjMwcHg7anVzdGlmeS1jb250ZW50OnNwYWNlLWJldHdlZW47dGV4dC1hbGlnbjpjZW50ZXI7LXdlYmtpdC1ib3gtc2hhZG93OjAgMCAxMHB4IDJweCByZ2JhKDAsMCwwLDAuMik7Ym94LXNoYWRvdzowIDAgMTBweCAycHggcmdiYSgwLDAsMCwwLjIpO29wYWNpdHk6MDt2aXNpYmlsaXR5OmhpZGRlbjt0cmFuc2l0aW9uOmFsbCAwLjRzIGVhc2U7bWF4LWhlaWdodDo1NjZweDtvdmVyZmxvdzphdXRvfS5iYWMtLWFwcHMtY29udGFpbmVyLmFjdGl2ZXtvcGFjaXR5OjE7dmlzaWJpbGl0eTp2aXNpYmxlfS5iYWMtLWFwcHMtY29udGFpbmVyIC5iYWMtLWFwcHMtYXJyb3d7cG9zaXRpb246YWJzb2x1dGU7ZGlzcGxheTpibG9jaztoZWlnaHQ6MjBweDt3aWR0aDoyMHB4O3RvcDotMTBweDtyaWdodDozNnB4O2JhY2tncm91bmQ6I2ZmZjt0cmFuc2Zvcm06cm90YXRlKC00NWRlZyk7ei1pbmRleDoxfS5iYWMtLWFwcHMtY29udGFpbmVyIC5iYWMtLWFwcHN7d2lkdGg6MzIlO2Rpc3BsYXk6ZmxleDtmb250LXNpemU6MzBweDttYXJnaW4tYm90dG9tOjQwcHg7dGV4dC1hbGlnbjpjZW50ZXI7anVzdGlmeS1jb250ZW50OmNlbnRlcjtmbGV4LXdyYXA6d3JhcH0uYmFjLS1hcHBzLWNvbnRhaW5lciAuYmFjLS1hcHBzIGF7ZGlzcGxheTpibG9jaztjb2xvcjojZmZmO3RleHQtZGVjb3JhdGlvbjpub25lO3dpZHRoOjY1cHg7aGVpZ2h0OjY1cHg7cGFkZGluZy10b3A6M3B4O2xpbmUtaGVpZ2h0OjY1cHg7dGV4dC1hbGlnbjpjZW50ZXI7Ym9yZGVyLXJhZGl1czoxMHB4Oy13ZWJraXQtYm94LXNoYWRvdzowIDAgNXB4IDAgcmdiYSgwLDAsMCwwLjIpO2JveC1zaGFkb3c6MCAwIDVweCAwIHJnYmEoMCwwLDAsMC4yKX0uYmFjLS1hcHBzLWNvbnRhaW5lciAuYmFjLS1hcHBzIC5iYWMtLWFwcC1uYW1le3dpZHRoOjEwMCU7Y29sb3I6IzAwMDtmb250LXNpemU6MTRweDtwYWRkaW5nOjEwcHggMCA1cHggMH0uYmFjLS1hcHBzLWNvbnRhaW5lciAuYmFjLS1hcHBzIC5iYWMtLWFwcC1kZXNjcmlwdGlvbntjb2xvcjojOTE5MTkxO2ZvbnQtc2l6ZToxMnB4O2ZvbnQtc3R5bGU6aXRhbGljO2xpbmUtaGVpZ2h0OjEuM2VtfS5iYWMtLXVzZXItc2lkZWJhcntmb250LWZhbWlseTpcIlZlcmRhbmFcIiwgYXJpYWwsIHNhbnMtc2VyaWY7Y29sb3I6d2hpdGU7aGVpZ2h0OmNhbGMoMTAwdmggLSA1MHB4KTtiYWNrZ3JvdW5kLWNvbG9yOiM1MTVmNzc7Ym94LXNpemluZzpib3JkZXItYm94O3dpZHRoOjMyMHB4O3Bvc2l0aW9uOmZpeGVkO3RvcDo1MHB4O3JpZ2h0OjA7ei1pbmRleDo5OTk5OTk7cGFkZGluZy10b3A6MTBweDtvcGFjaXR5OjA7dHJhbnNmb3JtOnRyYW5zbGF0ZVgoMTAwJSk7dHJhbnNpdGlvbjphbGwgMC40cyBlYXNlfS5iYWMtLXVzZXItc2lkZWJhci5hY3RpdmV7b3BhY2l0eToxO3RyYW5zZm9ybTp0cmFuc2xhdGVYKDAlKTstd2Via2l0LWJveC1zaGFkb3c6LTFweCAwcHggMTJweCAwcHggcmdiYSgwLDAsMCwwLjc1KTstbW96LWJveC1zaGFkb3c6LTFweCAzcHggMTJweCAwcHggcmdiYSgwLDAsMCwwLjc1KTtib3gtc2hhZG93Oi0xcHggMHB4IDEycHggMHB4IHJnYmEoMCwwLDAsMC43NSl9LmJhYy0tdXNlci1zaWRlYmFyIC5iYWMtLXVzZXItbGlzdC1pdGVte2Rpc3BsYXk6ZmxleDtwb3NpdGlvbjpyZWxhdGl2ZTtjdXJzb3I6cG9pbnRlcjthbGlnbi1pdGVtczpjZW50ZXI7cGFkZGluZzoxMHB4IDEwcHggMTBweCA0MHB4O2JvcmRlci1ib3R0b206MXB4IHNvbGlkIHJnYmEoMjU1LDI1NSwyNTUsMC4xKX0uYmFjLS11c2VyLXNpZGViYXIgLmJhYy0tdXNlci1saXN0LWl0ZW06aG92ZXJ7YmFja2dyb3VuZC1jb2xvcjpyZ2JhKDI1NSwyNTUsMjU1LDAuMSl9LmJhYy0tdXNlci1zaWRlYmFyIC5iYWMtLXVzZXItbGlzdC1pdGVtIC5iYWMtLXNlbGVjdGVkLWFjb3VudC1pbmRpY2F0b3J7cG9zaXRpb246YWJzb2x1dGU7cmlnaHQ6MDtoZWlnaHQ6MTAwJTt3aWR0aDo4cHh9LmJhYy0tdXNlci1zaWRlYmFyIC5iYWMtLXVzZXItbGlzdC1pdGVtIC5iYWMtLXVzZXItbGlzdC1pdGVtLWltYWdle3dpZHRoOjQwcHg7aGVpZ2h0OjQwcHg7Ym9yZGVyLXJhZGl1czozcHg7Ym9yZGVyOjJweCBzb2xpZCAjZmZmO21hcmdpbi1yaWdodDoyMHB4O2Rpc3BsYXk6ZmxleDthbGlnbi1pdGVtczpjZW50ZXI7anVzdGlmeS1jb250ZW50OmNlbnRlcn0uYmFjLS11c2VyLXNpZGViYXIgLmJhYy0tdXNlci1saXN0LWl0ZW0gLmJhYy0tdXNlci1saXN0LWl0ZW0taW1hZ2U+aW1ne3dpZHRoOmF1dG87aGVpZ2h0OmF1dG87bWF4LXdpZHRoOjEwMCU7bWF4LWhlaWdodDoxMDAlfS5iYWMtLXVzZXItc2lkZWJhciAuYmFjLS11c2VyLWxpc3QtaXRlbSBzcGFue3dpZHRoOjEwMCU7ZGlzcGxheTpibG9jazttYXJnaW4tYm90dG9tOjVweH0uYmFjLS11c2VyLXNpZGViYXIgLmJhYy11c2VyLWFwcC1kZXRhaWxzIHNwYW57Zm9udC1zaXplOjEycHh9LmJhYy0tdXNlci1zaWRlYmFyIC5wdXJlc2RrLXZlcnNpb24tbnVtYmVye3dpZHRoOjEwMCU7dGV4dC1hbGlnbjpyaWdodDtwYWRkaW5nLXJpZ2h0OjEwcHg7cG9zaXRpb246YWJzb2x1dGU7Zm9udC1zaXplOjhweDtvcGFjaXR5OjAuNTtyaWdodDowO2JvdHRvbTowfS5iYWMtLXVzZXItc2lkZWJhci1pbmZve2Rpc3BsYXk6ZmxleDtqdXN0aWZ5LWNvbnRlbnQ6Y2VudGVyO2ZsZXgtd3JhcDp3cmFwO3RleHQtYWxpZ246Y2VudGVyO3BhZGRpbmc6MTBweCAyMHB4IDE1cHh9LmJhYy0tdXNlci1zaWRlYmFyLWluZm8gLmJhYy0tdXNlci1pbWFnZXtib3JkZXI6MXB4ICNhZGFkYWQgc29saWQ7b3ZlcmZsb3c6aGlkZGVuO2JvcmRlci1yYWRpdXM6NTAlO3Bvc2l0aW9uOnJlbGF0aXZlO2N1cnNvcjpwb2ludGVyO2Rpc3BsYXk6aW5saW5lLWJsb2NrO2hlaWdodDo4MHB4O3dpZHRoOjgwcHg7bGluZS1oZWlnaHQ6ODBweDt0ZXh0LWFsaWduOmNlbnRlcjtjb2xvcjojZmZmO2JvcmRlci1yYWRpdXM6NTAlO2JhY2tncm91bmQtY29sb3I6I2FkYWRhZDttYXJnaW4tYm90dG9tOjE1cHh9LmJhYy0tdXNlci1zaWRlYmFyLWluZm8gLmJhYy0tdXNlci1pbWFnZSAjYmFjLS11c2VyLWltYWdlLWZpbGV7ZGlzcGxheTpub25lO3Bvc2l0aW9uOmFic29sdXRlO3otaW5kZXg6MTt0b3A6MDtsZWZ0OjA7d2lkdGg6MTAwJTtoZWlnaHQ6MTAwJX0uYmFjLS11c2VyLXNpZGViYXItaW5mbyAuYmFjLS11c2VyLWltYWdlICNiYWMtLXVzZXItaW1hZ2UtZmlsZSBpbWd7d2lkdGg6MTAwJTtoZWlnaHQ6MTAwJX0uYmFjLS11c2VyLXNpZGViYXItaW5mbyAuYmFjLS11c2VyLWltYWdlICNiYWMtLXVzZXItaW1hZ2UtZmlsZS5iYWMtLXB1cmVzZGstdmlzaWJsZXtkaXNwbGF5OmJsb2NrfS5iYWMtLXVzZXItc2lkZWJhci1pbmZvIC5iYWMtLXVzZXItaW1hZ2UgI2JhYy0tdXNlci1pbWFnZS11cGxvYWQtcHJvZ3Jlc3N7cG9zaXRpb246YWJzb2x1dGU7cGFkZGluZy10b3A6MTBweDt0b3A6MDtiYWNrZ3JvdW5kOiM2NjY7ei1pbmRleDo0O2Rpc3BsYXk6bm9uZTt3aWR0aDoxMDAlO2hlaWdodDoxMDAlfS5iYWMtLXVzZXItc2lkZWJhci1pbmZvIC5iYWMtLXVzZXItaW1hZ2UgI2JhYy0tdXNlci1pbWFnZS11cGxvYWQtcHJvZ3Jlc3MuYmFjLS1wdXJlc2RrLXZpc2libGV7ZGlzcGxheTpibG9ja30uYmFjLS11c2VyLXNpZGViYXItaW5mbyAuYmFjLS11c2VyLWltYWdlIGl7Zm9udC1zaXplOjMycHg7Zm9udC1zaXplOjMycHg7ei1pbmRleDowO3Bvc2l0aW9uOmFic29sdXRlO3dpZHRoOjEwMCU7bGVmdDowO2JhY2tncm91bmQtY29sb3I6cmdiYSgwLDAsMCwwLjUpfS5iYWMtLXVzZXItc2lkZWJhci1pbmZvIC5iYWMtLXVzZXItaW1hZ2U6aG92ZXIgaXt6LWluZGV4OjN9LmJhYy0tdXNlci1zaWRlYmFyLWluZm8gLmJhYy0tdXNlci1uYW1le3dpZHRoOjEwMCU7dGV4dC1hbGlnbjpjZW50ZXI7Zm9udC1zaXplOjE4cHg7bWFyZ2luLWJvdHRvbToxMHB4fS5iYWMtLXVzZXItc2lkZWJhci1pbmZvIC5iYWMtLXVzZXItZW1haWx7Zm9udC1zaXplOjEycHg7Zm9udC13ZWlnaHQ6MzAwfS5iYWMtLXVzZXItYWNjb3VudC1zZXR0aW5nc3twb3NpdGlvbjphYnNvbHV0ZTtib3R0b206MTBweDtsZWZ0OjIwcHg7d2lkdGg6OTAlO2hlaWdodDo1MHB4fS5iYWMtLXVzZXItYWNjb3VudC1zZXR0aW5ncyAuYmFjLXVzZXItYWNvdW50LWxpc3QtaXRlbXtkaXNwbGF5OmZsZXg7YWxpZ24taXRlbXM6Y2VudGVyO21hcmdpbi1ib3R0b206MzBweDtwb3NpdGlvbjphYnNvbHV0ZX0uYmFjLS11c2VyLWFjY291bnQtc2V0dGluZ3MgLmJhYy11c2VyLWFjb3VudC1saXN0LWl0ZW0gYXt0ZXh0LWRlY29yYXRpb246bm9uZTtjb2xvcjojZmZmfS5iYWMtLXVzZXItYWNjb3VudC1zZXR0aW5ncyAuYmFjLXVzZXItYWNvdW50LWxpc3QtaXRlbSBpe2ZvbnQtc2l6ZToyNHB4O21hcmdpbi1yaWdodDoyMHB4fSNiYWMtLXB1cmVzZGstYWNjb3VudC1sb2dvLS17Y3Vyc29yOnBvaW50ZXI7cG9zaXRpb246cmVsYXRpdmV9I2JhYy0tcHVyZXNkay1hY2NvdW50LWxvZ28tLSBpbWd7aGVpZ2h0OjI4cHh9I2JhYy0taW5mby1ibG9ja3Mtd3JhcHBlci0te3Bvc2l0aW9uOnJlbGF0aXZlfSNiYWMtLWluZm8tYmxvY2tzLXdyYXBwZXItLSAuYmFjLS1wdXJlc2RrLWluZm8tYm94LS17Ym9yZGVyLXJhZGl1czowIDAgM3B4IDNweDtvdmVyZmxvdzpoaWRkZW47ei1pbmRleDo5OTk5OTk5OTtwb3NpdGlvbjpmaXhlZDt0b3A6LTQxcHg7d2lkdGg6NDcwcHg7bGVmdDpjYWxjKDUwdncgLSAyMzVweCk7aGVpZ2h0OjQwcHg7LXdlYmtpdC10cmFuc2l0aW9uOnRvcCAwLjRzO3RyYW5zaXRpb246dG9wIDAuNHN9I2JhYy0taW5mby1ibG9ja3Mtd3JhcHBlci0tIC5iYWMtLXB1cmVzZGstaW5mby1ib3gtLS5iYWMtLXN1Y2Nlc3N7YmFja2dyb3VuZDojMTREQTlFfSNiYWMtLWluZm8tYmxvY2tzLXdyYXBwZXItLSAuYmFjLS1wdXJlc2RrLWluZm8tYm94LS0uYmFjLS1zdWNjZXNzIC5iYWMtLWlubmVyLWluZm8tYm94LS0gZGl2LmJhYy0taW5mby1pY29uLS0uZmEtc3VjY2Vzc3tkaXNwbGF5OmlubGluZS1ibG9ja30jYmFjLS1pbmZvLWJsb2Nrcy13cmFwcGVyLS0gLmJhYy0tcHVyZXNkay1pbmZvLWJveC0tLmJhYy0taW5mb3tiYWNrZ3JvdW5kLWNvbG9yOiM1QkMwREV9I2JhYy0taW5mby1ibG9ja3Mtd3JhcHBlci0tIC5iYWMtLXB1cmVzZGstaW5mby1ib3gtLS5iYWMtLWluZm8gLmJhYy0taW5uZXItaW5mby1ib3gtLSBkaXYuYmFjLS1pbmZvLWljb24tLS5mYS1pbmZvLTF7ZGlzcGxheTppbmxpbmUtYmxvY2t9I2JhYy0taW5mby1ibG9ja3Mtd3JhcHBlci0tIC5iYWMtLXB1cmVzZGstaW5mby1ib3gtLS5iYWMtLXdhcm5pbmd7YmFja2dyb3VuZDojRjBBRDRFfSNiYWMtLWluZm8tYmxvY2tzLXdyYXBwZXItLSAuYmFjLS1wdXJlc2RrLWluZm8tYm94LS0uYmFjLS13YXJuaW5nIC5iYWMtLWlubmVyLWluZm8tYm94LS0gZGl2LmJhYy0taW5mby1pY29uLS0uZmEtd2FybmluZ3tkaXNwbGF5OmlubGluZS1ibG9ja30jYmFjLS1pbmZvLWJsb2Nrcy13cmFwcGVyLS0gLmJhYy0tcHVyZXNkay1pbmZvLWJveC0tLmJhYy0tZXJyb3J7YmFja2dyb3VuZDojRUY0MTAwfSNiYWMtLWluZm8tYmxvY2tzLXdyYXBwZXItLSAuYmFjLS1wdXJlc2RrLWluZm8tYm94LS0uYmFjLS1lcnJvciAuYmFjLS1pbm5lci1pbmZvLWJveC0tIGRpdi5iYWMtLWluZm8taWNvbi0tLmZhLWVycm9ye2Rpc3BsYXk6aW5saW5lLWJsb2NrfSNiYWMtLWluZm8tYmxvY2tzLXdyYXBwZXItLSAuYmFjLS1wdXJlc2RrLWluZm8tYm94LS0gLmJhYy0tdGltZXJ7LXdlYmtpdC10cmFuc2l0aW9uLXRpbWluZy1mdW5jdGlvbjpsaW5lYXI7dHJhbnNpdGlvbi10aW1pbmctZnVuY3Rpb246bGluZWFyO3Bvc2l0aW9uOmFic29sdXRlO2JvdHRvbTowcHg7b3BhY2l0eTowLjU7aGVpZ2h0OjJweCAhaW1wb3J0YW50O2JhY2tncm91bmQ6d2hpdGU7d2lkdGg6MCV9I2JhYy0taW5mby1ibG9ja3Mtd3JhcHBlci0tIC5iYWMtLXB1cmVzZGstaW5mby1ib3gtLSAuYmFjLS10aW1lci5iYWMtLWZ1bGx3aWR0aHt3aWR0aDoxMDAlfSNiYWMtLWluZm8tYmxvY2tzLXdyYXBwZXItLSAuYmFjLS1wdXJlc2RrLWluZm8tYm94LS0uYmFjLS1hY3RpdmUtLXt0b3A6MHB4fSNiYWMtLWluZm8tYmxvY2tzLXdyYXBwZXItLSAuYmFjLS1wdXJlc2RrLWluZm8tYm94LS0gLmJhYy0taW5uZXItaW5mby1ib3gtLXt3aWR0aDoxMDAlO3BhZGRpbmc6MTFweCAxNXB4O2NvbG9yOndoaXRlfSNiYWMtLWluZm8tYmxvY2tzLXdyYXBwZXItLSAuYmFjLS1wdXJlc2RrLWluZm8tYm94LS0gLmJhYy0taW5uZXItaW5mby1ib3gtLSBkaXZ7ZGlzcGxheTppbmxpbmUtYmxvY2s7aGVpZ2h0OjE4cHg7cG9zaXRpb246cmVsYXRpdmV9I2JhYy0taW5mby1ibG9ja3Mtd3JhcHBlci0tIC5iYWMtLXB1cmVzZGstaW5mby1ib3gtLSAuYmFjLS1pbm5lci1pbmZvLWJveC0tIGRpdi5iYWMtLWluZm8taWNvbi0te2Rpc3BsYXk6bm9uZTt0b3A6MHB4fSNiYWMtLWluZm8tYmxvY2tzLXdyYXBwZXItLSAuYmFjLS1wdXJlc2RrLWluZm8tYm94LS0gLmJhYy0taW5uZXItaW5mby1ib3gtLSAuYmFjLS1pbmZvLWljb24tLXttYXJnaW4tcmlnaHQ6MTVweDt3aWR0aDoxMHB4O3RvcDoycHh9I2JhYy0taW5mby1ibG9ja3Mtd3JhcHBlci0tIC5iYWMtLXB1cmVzZGstaW5mby1ib3gtLSAuYmFjLS1pbm5lci1pbmZvLWJveC0tIC5iYWMtLWluZm8tbWFpbi10ZXh0LS17d2lkdGg6MzgwcHg7bWFyZ2luLXJpZ2h0OjE1cHg7Zm9udC1zaXplOjEycHg7dGV4dC1hbGlnbjpjZW50ZXJ9I2JhYy0taW5mby1ibG9ja3Mtd3JhcHBlci0tIC5iYWMtLXB1cmVzZGstaW5mby1ib3gtLSAuYmFjLS1pbm5lci1pbmZvLWJveC0tIC5iYWMtLWluZm8tY2xvc2UtYnV0dG9uLS17d2lkdGg6MTBweDtjdXJzb3I6cG9pbnRlcjt0b3A6MnB4fS5iYWMtLWN1c3RvbS1tb2RhbHtwb3NpdGlvbjpmaXhlZDt3aWR0aDo3MCU7aGVpZ2h0OjgwJTttaW4td2lkdGg6NDAwcHg7bGVmdDowO3JpZ2h0OjA7dG9wOjA7Ym90dG9tOjA7bWFyZ2luOmF1dG87Ym9yZGVyOjFweCBzb2xpZCAjOTc5Nzk3O2JvcmRlci1yYWRpdXM6NXB4O2JveC1zaGFkb3c6MCAwIDcxcHggMCAjMkYzODQ5O2JhY2tncm91bmQ6I2ZmZjt6LWluZGV4Ojk5OTtvdmVyZmxvdzphdXRvO2Rpc3BsYXk6bm9uZX0uYmFjLS1jdXN0b20tbW9kYWwuaXMtb3BlbntkaXNwbGF5OmJsb2NrfS5iYWMtLWN1c3RvbS1tb2RhbCAuY3VzdG9tLW1vZGFsX19jbG9zZS1idG57dGV4dC1kZWNvcmF0aW9uOm5vbmU7cGFkZGluZy10b3A6MnB4O2xpbmUtaGVpZ2h0OjE4cHg7aGVpZ2h0OjIwcHg7d2lkdGg6MjBweDtib3JkZXItcmFkaXVzOjUwJTtjb2xvcjojOTA5YmE0O3RleHQtYWxpZ246Y2VudGVyO3Bvc2l0aW9uOmFic29sdXRlO3RvcDoyMHB4O3JpZ2h0OjIwcHg7Zm9udC1zaXplOjIwcHh9LmJhYy0tY3VzdG9tLW1vZGFsIC5jdXN0b20tbW9kYWxfX2Nsb3NlLWJ0bjpob3Zlcnt0ZXh0LWRlY29yYXRpb246bm9uZTtjb2xvcjojNDU1MDY2O2N1cnNvcjpwb2ludGVyfS5iYWMtLWN1c3RvbS1tb2RhbCAuY3VzdG9tLW1vZGFsX193cmFwcGVye2hlaWdodDoxMDAlO2Rpc3BsYXk6ZmxleDtmbGV4LWRpcmVjdGlvbjpjb2x1bW59LmJhYy0tY3VzdG9tLW1vZGFsIC5jdXN0b20tbW9kYWxfX3dyYXBwZXIgaWZyYW1le3dpZHRoOjEwMCU7aGVpZ2h0OjEwMCV9LmJhYy0tY3VzdG9tLW1vZGFsIC5jdXN0b20tbW9kYWxfX2NvbnRlbnQtd3JhcHBlcntoZWlnaHQ6MTAwJTtvdmVyZmxvdzphdXRvO21hcmdpbi1ib3R0b206MTA0cHg7Ym9yZGVyLXRvcDoycHggc29saWQgI0M5Q0REN30uYmFjLS1jdXN0b20tbW9kYWwgLmN1c3RvbS1tb2RhbF9fY29udGVudC13cmFwcGVyLm5vLW1hcmdpbnttYXJnaW4tYm90dG9tOjB9LmJhYy0tY3VzdG9tLW1vZGFsIC5jdXN0b20tbW9kYWxfX2NvbnRlbnR7cGFkZGluZzoyMHB4O3Bvc2l0aW9uOnJlbGF0aXZlfS5iYWMtLWN1c3RvbS1tb2RhbCAuY3VzdG9tLW1vZGFsX19jb250ZW50IGgze2NvbG9yOiMyRjM4NDk7Zm9udC1zaXplOjIwcHg7Zm9udC13ZWlnaHQ6NjAwO2xpbmUtaGVpZ2h0OjI3cHh9LmJhYy0tY3VzdG9tLW1vZGFsIC5jdXN0b20tbW9kYWxfX3NhdmV7cG9zaXRpb246YWJzb2x1dGU7cmlnaHQ6MDtib3R0b206MDt3aWR0aDoxMDAlO3BhZGRpbmc6MzBweCAzMnB4O2JhY2tncm91bmQtY29sb3I6I0YyRjJGNH0uYmFjLS1jdXN0b20tbW9kYWwgLmN1c3RvbS1tb2RhbF9fc2F2ZSBhLC5iYWMtLWN1c3RvbS1tb2RhbCAuY3VzdG9tLW1vZGFsX19zYXZlIGJ1dHRvbntmb250LXNpemU6MTRweDtsaW5lLWhlaWdodDoyMnB4O2hlaWdodDo0NHB4O3dpZHRoOjEwMCV9LmJhYy0tY3VzdG9tLW1vZGFsIC5jdXN0b20tbW9kYWxfX3NwbGl0dGVye2hlaWdodDozMHB4O2xpbmUtaGVpZ2h0OjMwcHg7cGFkZGluZzowIDIwcHg7Ym9yZGVyLWNvbG9yOiNEM0QzRDM7Ym9yZGVyLXN0eWxlOnNvbGlkO2JvcmRlci13aWR0aDoxcHggMCAxcHggMDtiYWNrZ3JvdW5kLWNvbG9yOiNGMEYwRjA7Y29sb3I6IzY3NkY4Mjtmb250LXNpemU6MTNweDtmb250LXdlaWdodDo2MDB9LmJhYy0tY3VzdG9tLW1vZGFsIC5jdXN0b20tbW9kYWxfX2JveHtkaXNwbGF5OmlubGluZS1ibG9jazt2ZXJ0aWNhbC1hbGlnbjptaWRkbGU7aGVpZ2h0OjE2NXB4O3dpZHRoOjE2NXB4O2JvcmRlcjoycHggc29saWQgcmVkO2JvcmRlci1yYWRpdXM6NXB4O3RleHQtYWxpZ246Y2VudGVyO2ZvbnQtc2l6ZToxMnB4O2ZvbnQtd2VpZ2h0OjYwMDtjb2xvcjojOTA5N0E4O3RleHQtZGVjb3JhdGlvbjpub25lO21hcmdpbjoxMHB4IDIwcHggMTBweCAwO3RyYW5zaXRpb246MC4xcyBhbGx9LmJhYy0tY3VzdG9tLW1vZGFsIC5jdXN0b20tbW9kYWxfX2JveCBpe2ZvbnQtc2l6ZTo3MHB4O2Rpc3BsYXk6YmxvY2s7bWFyZ2luOjI1cHggMH0uYmFjLS1jdXN0b20tbW9kYWwgLmN1c3RvbS1tb2RhbF9fYm94LmFjdGl2ZXtjb2xvcjp5ZWxsb3c7Ym9yZGVyLWNvbG9yOnllbGxvdzt0ZXh0LWRlY29yYXRpb246bm9uZX0uYmFjLS1jdXN0b20tbW9kYWwgLmN1c3RvbS1tb2RhbF9fYm94OmhvdmVyLC5iYWMtLWN1c3RvbS1tb2RhbCAuY3VzdG9tLW1vZGFsX19ib3g6YWN0aXZlLC5iYWMtLWN1c3RvbS1tb2RhbCAuY3VzdG9tLW1vZGFsX19ib3g6Zm9jdXN7Y29sb3I6IzFBQzBCNDtib3JkZXItY29sb3I6eWVsbG93O3RleHQtZGVjb3JhdGlvbjpub25lfS5jbG91ZC1pbWFnZXNfX2NvbnRhaW5lcntkaXNwbGF5OmZsZXg7ZmxleC13cmFwOndyYXA7anVzdGlmeS1jb250ZW50OmZsZXgtc3RhcnR9LmNsb3VkLWltYWdlc19fcGFnaW5hdGlvbntwYWRkaW5nOjIwcHh9LmNsb3VkLWltYWdlc19fcGFnaW5hdGlvbiBsaXtkaXNwbGF5OmlubGluZS1ibG9jazttYXJnaW4tcmlnaHQ6MTBweH0uY2xvdWQtaW1hZ2VzX19wYWdpbmF0aW9uIGxpIGF7Y29sb3I6I2ZmZjtiYWNrZ3JvdW5kLWNvbG9yOiM1ZTY3NzY7Ym9yZGVyLXJhZGl1czoyMHB4O3RleHQtZGVjb3JhdGlvbjpub25lO2Rpc3BsYXk6YmxvY2s7Zm9udC13ZWlnaHQ6MjAwO2hlaWdodDozNXB4O3dpZHRoOjM1cHg7bGluZS1oZWlnaHQ6MzVweDt0ZXh0LWFsaWduOmNlbnRlcn0uY2xvdWQtaW1hZ2VzX19wYWdpbmF0aW9uIGxpLmFjdGl2ZSBhe2JhY2tncm91bmQtY29sb3I6IzJmMzg0OX0uY2xvdWQtaW1hZ2VzX19pdGVte3dpZHRoOjE1NXB4O2hlaWdodDoxNzBweDtib3JkZXI6MXB4IHNvbGlkICNlZWU7YmFja2dyb3VuZC1jb2xvcjojZmZmO2JvcmRlci1yYWRpdXM6M3B4O21hcmdpbjowIDE1cHggMTVweCAwO3RleHQtYWxpZ246Y2VudGVyO3Bvc2l0aW9uOnJlbGF0aXZlO2N1cnNvcjpwb2ludGVyfS5jbG91ZC1pbWFnZXNfX2l0ZW0gLmNsb3VkLWltYWdlc19faXRlbV9fdHlwZXtoZWlnaHQ6MTE1cHg7Zm9udC1zaXplOjkwcHg7bGluZS1oZWlnaHQ6MTQwcHg7Ym9yZGVyLXRvcC1sZWZ0LXJhZGl1czozcHg7Ym9yZGVyLXRvcC1yaWdodC1yYWRpdXM6M3B4O2NvbG9yOiNhMmEyYTI7YmFja2dyb3VuZC1jb2xvcjojZTllYWVifS5jbG91ZC1pbWFnZXNfX2l0ZW0gLmNsb3VkLWltYWdlc19faXRlbV9fdHlwZT5pbWd7d2lkdGg6YXV0bztoZWlnaHQ6YXV0bzttYXgtd2lkdGg6MTAwJTttYXgtaGVpZ2h0OjEwMCV9LmNsb3VkLWltYWdlc19faXRlbSAuY2xvdWQtaW1hZ2VzX19pdGVtX19kZXRhaWxze3BhZGRpbmc6MTBweCAwfS5jbG91ZC1pbWFnZXNfX2l0ZW0gLmNsb3VkLWltYWdlc19faXRlbV9fZGV0YWlscyAuY2xvdWQtaW1hZ2VzX19pdGVtX19kZXRhaWxzX19uYW1le2ZvbnQtc2l6ZToxMnB4O291dGxpbmU6bm9uZTtwYWRkaW5nOjAgMTBweDtjb2xvcjojYTVhYmI1O2JvcmRlcjpub25lO3dpZHRoOjEwMCU7YmFja2dyb3VuZC1jb2xvcjp0cmFuc3BhcmVudDtoZWlnaHQ6MTVweDtkaXNwbGF5OmlubGluZS1ibG9jazt3b3JkLWJyZWFrOmJyZWFrLWFsbH0uY2xvdWQtaW1hZ2VzX19pdGVtIC5jbG91ZC1pbWFnZXNfX2l0ZW1fX2RldGFpbHMgLmNsb3VkLWltYWdlc19faXRlbV9fZGV0YWlsc19fZGF0ZXtmb250LXNpemU6MTBweDtib3R0b206NnB4O3dpZHRoOjE1NXB4O2hlaWdodDoxNXB4O2NvbG9yOiNhNWFiYjU7ZGlzcGxheTppbmxpbmUtYmxvY2t9LmNsb3VkLWltYWdlc19faXRlbSAuY2xvdWQtaW1hZ2VzX19pdGVtX19hY3Rpb25ze2Rpc3BsYXk6ZmxleDthbGlnbi1pdGVtczpjZW50ZXI7anVzdGlmeS1jb250ZW50OmNlbnRlcjtwb3NpdGlvbjphYnNvbHV0ZTt0b3A6MDtsZWZ0OjA7d2lkdGg6MTAwJTtoZWlnaHQ6MTE1cHg7YmFja2dyb3VuZC1jb2xvcjpyZ2JhKDc4LDgzLDkxLDAuODMpO29wYWNpdHk6MDt2aXNpYmlsaXR5OmhpZGRlbjtib3JkZXItdG9wLWxlZnQtcmFkaXVzOjNweDtib3JkZXItdG9wLXJpZ2h0LXJhZGl1czozcHg7dGV4dC1hbGlnbjpjZW50ZXI7dHJhbnNpdGlvbjowLjNzIG9wYWNpdHl9LmNsb3VkLWltYWdlc19faXRlbSAuY2xvdWQtaW1hZ2VzX19pdGVtX19hY3Rpb25zIGF7Zm9udC1zaXplOjE2cHg7Y29sb3I6I2ZmZjt0ZXh0LWRlY29yYXRpb246bm9uZX0uY2xvdWQtaW1hZ2VzX19pdGVtOmhvdmVyIC5jbG91ZC1pbWFnZXNfX2l0ZW0gLmNsb3VkLWltYWdlc19faXRlbV9fYWN0aW9uc3tvcGFjaXR5OjE7dmlzaWJpbGl0eTp2aXNpYmxlfScsXG4gICAgaGVhZCA9IGRvY3VtZW50LmhlYWQgfHwgZG9jdW1lbnQuZ2V0RWxlbWVudHNCeVRhZ05hbWUoJ2hlYWQnKVswXSxcbiAgICBzdHlsZSA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoJ3N0eWxlJyk7XG5cbnN0eWxlLnR5cGUgPSAndGV4dC9jc3MnO1xuaWYgKHN0eWxlLnN0eWxlU2hlZXQpIHtcbiAgICBzdHlsZS5zdHlsZVNoZWV0LmNzc1RleHQgPSBjc3M7XG59IGVsc2Uge1xuICAgIHN0eWxlLmFwcGVuZENoaWxkKGRvY3VtZW50LmNyZWF0ZVRleHROb2RlKGNzcykpO1xufVxuaGVhZC5hcHBlbmRDaGlsZChzdHlsZSk7XG5cbnZhciBsaW5rID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudCgnbGluaycpO1xubGluay5ocmVmID0gJ2h0dHBzOi8vZmlsZS5teWZvbnRhc3RpYy5jb20vTUR2blJKR2hCZDV4VmNYbjR1UUpTWi9pY29ucy5jc3MnO1xubGluay5yZWwgPSAnc3R5bGVzaGVldCc7XG5cbmRvY3VtZW50LmdldEVsZW1lbnRzQnlUYWdOYW1lKCdoZWFkJylbMF0uYXBwZW5kQ2hpbGQobGluayk7XG5cbm1vZHVsZS5leHBvcnRzID0gcHBiYTsiLCJ2YXIgU3RvcmUgPSByZXF1aXJlKCcuL3N0b3JlJyk7XG52YXIgTG9nZ2VyID0gcmVxdWlyZSgnLi9sb2dnZXInKTtcbnZhciBEb20gPSByZXF1aXJlKCcuL2RvbScpO1xudmFyIENhbGxlciA9IHJlcXVpcmUoJy4vY2FsbGVyJyk7XG5cbnZhciB1cGxvYWRpbmcgPSBmYWxzZTtcblxudmFyIEF2YXRhckN0cmwgPSB7XG5cdF9zdWJtaXQ6IG51bGwsXG5cdF9maWxlOiBudWxsLFxuXHRfcHJvZ3Jlc3M6IG51bGwsXG5cdF9zaWRlYmFyX2F2YXRhcjogbnVsbCxcblx0X3RvcF9hdmF0YXI6IG51bGwsXG5cdF90b3BfYXZhdGFyX2NvbnRhaW5lcjogbnVsbCxcblxuXHRpbml0OiBmdW5jdGlvbiBpbml0KCkge1xuXHRcdEF2YXRhckN0cmwuX3N1Ym1pdCA9IGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKCdiYWMtLS1wdXJlc2RrLWF2YXRhci1zdWJtaXQnKTtcblx0XHRBdmF0YXJDdHJsLl9maWxlID0gZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoJ2JhYy0tLXB1cmVzZGstYXZhdGFyLWZpbGUnKTtcblx0XHRBdmF0YXJDdHJsLl90b3BfYXZhdGFyX2NvbnRhaW5lciA9IGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKCdiYWMtLWltYWdlLWNvbnRhaW5lci10b3AnKTtcblx0XHRBdmF0YXJDdHJsLl9wcm9ncmVzcyA9IGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKCdiYWMtLXVzZXItaW1hZ2UtdXBsb2FkLXByb2dyZXNzJyk7XG5cdFx0QXZhdGFyQ3RybC5fc2lkZWJhcl9hdmF0YXIgPSBkb2N1bWVudC5nZXRFbGVtZW50QnlJZCgnYmFjLS11c2VyLWltYWdlLWZpbGUnKTtcblx0XHRBdmF0YXJDdHJsLl90b3BfYXZhdGFyID0gZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoJ2JhYy0tdXNlci1hdmF0YXItdG9wJyk7XG5cdFx0QXZhdGFyQ3RybC5fZmlsZS5hZGRFdmVudExpc3RlbmVyKCdjbGljaycsIGZ1bmN0aW9uIChlKSB7XG5cdFx0XHRlLnN0b3BQcm9wYWdhdGlvbigpO1xuXHRcdH0pO1xuXHRcdEF2YXRhckN0cmwuX2ZpbGUuYWRkRXZlbnRMaXN0ZW5lcignY2hhbmdlJywgZnVuY3Rpb24gKGUpIHtcblx0XHRcdEF2YXRhckN0cmwudXBsb2FkKCk7XG5cdFx0fSk7XG5cblx0XHRkb2N1bWVudC5nZXRFbGVtZW50QnlJZCgnYmFjLS11c2VyLWltYWdlJykuYWRkRXZlbnRMaXN0ZW5lcignY2xpY2snLCBmdW5jdGlvbiAoZSkge1xuXHRcdFx0ZS5zdG9wUHJvcGFnYXRpb24oKTtcblx0XHRcdEF2YXRhckN0cmwuX2ZpbGUuY2xpY2soKTtcblx0XHR9KTtcblx0fSxcblxuXHR1cGxvYWQ6IGZ1bmN0aW9uIHVwbG9hZCgpIHtcblx0XHRpZiAodXBsb2FkaW5nKSB7XG5cdFx0XHRyZXR1cm47XG5cdFx0fVxuXHRcdHVwbG9hZGluZyA9IHRydWU7XG5cblx0XHRpZiAoQXZhdGFyQ3RybC5fZmlsZS5maWxlcy5sZW5ndGggPT09IDApIHtcblx0XHRcdHJldHVybjtcblx0XHR9XG5cblx0XHR2YXIgZGF0YSA9IG5ldyBGb3JtRGF0YSgpO1xuXHRcdGRhdGEuYXBwZW5kKCdmaWxlJywgQXZhdGFyQ3RybC5fZmlsZS5maWxlc1swXSk7XG5cblx0XHR2YXIgc3VjY2Vzc0NhbGxiYWNrID0gZnVuY3Rpb24gc3VjY2Vzc0NhbGxiYWNrKGRhdGEpIHtcblx0XHRcdDtcblx0XHR9O1xuXG5cdFx0dmFyIGZhaWxDYWxsYmFjayA9IGZ1bmN0aW9uIGZhaWxDYWxsYmFjayhkYXRhKSB7XG5cdFx0XHQ7XG5cdFx0fTtcblxuXHRcdHZhciByZXF1ZXN0ID0gbmV3IFhNTEh0dHBSZXF1ZXN0KCk7XG5cdFx0cmVxdWVzdC5vbnJlYWR5c3RhdGVjaGFuZ2UgPSBmdW5jdGlvbiAoKSB7XG5cdFx0XHR1cGxvYWRpbmcgPSBmYWxzZTtcblx0XHRcdGlmIChyZXF1ZXN0LnJlYWR5U3RhdGUgPT0gNCkge1xuXHRcdFx0XHR0cnkge1xuXHRcdFx0XHRcdHZhciBpbWFnZURhdGEgPSBKU09OLnBhcnNlKHJlcXVlc3QucmVzcG9uc2UpLmRhdGE7XG5cdFx0XHRcdFx0QXZhdGFyQ3RybC5zZXRBdmF0YXIoaW1hZ2VEYXRhLnVybCk7XG5cdFx0XHRcdFx0Q2FsbGVyLm1ha2VDYWxsKHtcblx0XHRcdFx0XHRcdHR5cGU6ICdQVVQnLFxuXHRcdFx0XHRcdFx0ZW5kcG9pbnQ6IFN0b3JlLmdldEF2YXRhclVwZGF0ZVVybCgpLFxuXHRcdFx0XHRcdFx0cGFyYW1zOiB7XG5cdFx0XHRcdFx0XHRcdHVzZXI6IHtcblx0XHRcdFx0XHRcdFx0XHRhdmF0YXJfdXVpZDogaW1hZ2VEYXRhLmd1aWRcblx0XHRcdFx0XHRcdFx0fVxuXHRcdFx0XHRcdFx0fSxcblx0XHRcdFx0XHRcdGNhbGxiYWNrczoge1xuXHRcdFx0XHRcdFx0XHRzdWNjZXNzOiBzdWNjZXNzQ2FsbGJhY2ssXG5cdFx0XHRcdFx0XHRcdGZhaWw6IGZhaWxDYWxsYmFja1xuXHRcdFx0XHRcdFx0fVxuXHRcdFx0XHRcdH0pO1xuXHRcdFx0XHR9IGNhdGNoIChlKSB7XG5cdFx0XHRcdFx0dmFyIHJlc3AgPSB7XG5cdFx0XHRcdFx0XHRzdGF0dXM6ICdlcnJvcicsXG5cdFx0XHRcdFx0XHRkYXRhOiAnVW5rbm93biBlcnJvciBvY2N1cnJlZDogWycgKyByZXF1ZXN0LnJlc3BvbnNlVGV4dCArICddJ1xuXHRcdFx0XHRcdH07XG5cdFx0XHRcdH1cblx0XHRcdFx0TG9nZ2VyLmxvZyhyZXF1ZXN0LnJlc3BvbnNlLnN0YXR1cyArICc6ICcgKyByZXF1ZXN0LnJlc3BvbnNlLmRhdGEpO1xuXHRcdFx0fVxuXHRcdH07XG5cblx0XHQvLyByZXF1ZXN0LnVwbG9hZC5hZGRFdmVudExpc3RlbmVyKCdwcm9ncmVzcycsIGZ1bmN0aW9uKGUpe1xuXHRcdC8vIFx0TG9nZ2VyLmxvZyhlLmxvYWRlZC9lLnRvdGFsKTtcblx0XHQvLyBcdEF2YXRhckN0cmwuX3Byb2dyZXNzLnN0eWxlLnRvcCA9IDEwMCAtIChlLmxvYWRlZC9lLnRvdGFsKSAqIDEwMCArICclJztcblx0XHQvLyB9LCBmYWxzZSk7XG5cblx0XHR2YXIgdXJsID0gU3RvcmUuZ2V0QXZhdGFyVXBsb2FkVXJsKCk7XG5cdFx0RG9tLmFkZENsYXNzKEF2YXRhckN0cmwuX3Byb2dyZXNzLCAnYmFjLS1wdXJlc2RrLXZpc2libGUnKTtcblx0XHRyZXF1ZXN0Lm9wZW4oJ1BPU1QnLCB1cmwpO1xuXHRcdHJlcXVlc3Quc2VuZChkYXRhKTtcblx0fSxcblxuXHRzZXRBdmF0YXI6IGZ1bmN0aW9uIHNldEF2YXRhcih1cmwpIHtcblx0XHRpZiAoIXVybCkge1xuXHRcdFx0cmV0dXJuO1xuXHRcdH1cblxuXHRcdERvbS5yZW1vdmVDbGFzcyhBdmF0YXJDdHJsLl9wcm9ncmVzcywgJ2JhYy0tcHVyZXNkay12aXNpYmxlJyk7XG5cdFx0RG9tLmFkZENsYXNzKEF2YXRhckN0cmwuX3NpZGViYXJfYXZhdGFyLCAnYmFjLS1wdXJlc2RrLXZpc2libGUnKTtcblx0XHR2YXIgaW1nID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudCgnaW1nJyk7XG5cdFx0aW1nLnNyYyA9IHVybDtcblx0XHRBdmF0YXJDdHJsLl9zaWRlYmFyX2F2YXRhci5pbm5lckhUTUwgPSAnJztcblx0XHRBdmF0YXJDdHJsLl9zaWRlYmFyX2F2YXRhci5hcHBlbmRDaGlsZChpbWcpO1xuXG5cdFx0RG9tLmFkZENsYXNzKEF2YXRhckN0cmwuX3RvcF9hdmF0YXJfY29udGFpbmVyLCAnYmFjLS1wdXJlc2RrLXZpc2libGUnKTtcblx0XHR2YXIgaW1nXzIgPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KCdpbWcnKTtcblx0XHRpbWdfMi5zcmMgPSB1cmw7XG5cdFx0QXZhdGFyQ3RybC5fdG9wX2F2YXRhcl9jb250YWluZXIuaW5uZXJIVE1MID0gJyc7XG5cdFx0QXZhdGFyQ3RybC5fdG9wX2F2YXRhcl9jb250YWluZXIuYXBwZW5kQ2hpbGQoaW1nXzIpO1xuXG5cdFx0Ly8gIGJhYy0taW1hZ2UtY29udGFpbmVyLXRvcFxuXHR9XG59O1xuXG5tb2R1bGUuZXhwb3J0cyA9IEF2YXRhckN0cmw7IiwidmFyIFN0b3JlID0gcmVxdWlyZSgnLi9zdG9yZS5qcycpO1xudmFyIExvZ2dlciA9IHJlcXVpcmUoJy4vbG9nZ2VyJyk7XG5cbnZhciBwYXJhbXNUb0dldFZhcnMgPSBmdW5jdGlvbiBwYXJhbXNUb0dldFZhcnMocGFyYW1zKSB7XG5cdHZhciB0b1JldHVybiA9IFtdO1xuXHRmb3IgKHZhciBwcm9wZXJ0eSBpbiBwYXJhbXMpIHtcblx0XHRpZiAocGFyYW1zLmhhc093blByb3BlcnR5KHByb3BlcnR5KSkge1xuXHRcdFx0dG9SZXR1cm4ucHVzaChwcm9wZXJ0eSArICc9JyArIHBhcmFtc1twcm9wZXJ0eV0pO1xuXHRcdH1cblx0fVxuXG5cdHJldHVybiB0b1JldHVybi5qb2luKCcmJyk7XG59O1xuXG52YXIgZGV2S2V5cyA9IG51bGw7XG5cbnZhciBDYWxsZXIgPSB7XG5cdC8qXG4gaWYgdGhlIHVzZXIgc2V0c1xuICAqL1xuXHRzZXREZXZLZXlzOiBmdW5jdGlvbiBzZXREZXZLZXlzKGtleXMpIHtcblx0XHRkZXZLZXlzID0ga2V5cztcblx0fSxcblxuXHQvKlxuIGV4cGVjdGUgYXR0cmlidXRlczpcbiAtIHR5cGUgKGVpdGhlciBHRVQsIFBPU1QsIERFTEVURSwgUFVUKVxuIC0gZW5kcG9pbnRcbiAtIHBhcmFtcyAoaWYgYW55LiBBIGpzb24gd2l0aCBwYXJhbWV0ZXJzIHRvIGJlIHBhc3NlZCBiYWNrIHRvIHRoZSBlbmRwb2ludClcbiAtIGNhbGxiYWNrczogYW4gb2JqZWN0IHdpdGg6XG4gXHQtIHN1Y2Nlc3M6IHRoZSBzdWNjZXNzIGNhbGxiYWNrXG4gXHQtIGZhaWw6IHRoZSBmYWlsIGNhbGxiYWNrXG4gICovXG5cdG1ha2VDYWxsOiBmdW5jdGlvbiBtYWtlQ2FsbChhdHRycykge1xuXHRcdHZhciBlbmRwb2ludFVybCA9IGF0dHJzLmVuZHBvaW50O1xuXG5cdFx0dmFyIHhociA9IG5ldyBYTUxIdHRwUmVxdWVzdCgpO1xuXG5cdFx0aWYgKGF0dHJzLnR5cGUgPT09ICdHRVQnICYmIGF0dHJzLnBhcmFtcykge1xuXHRcdFx0ZW5kcG9pbnRVcmwgPSBlbmRwb2ludFVybCArIFwiP1wiICsgcGFyYW1zVG9HZXRWYXJzKGF0dHJzLnBhcmFtcyk7XG5cdFx0fVxuXG5cdFx0eGhyLm9wZW4oYXR0cnMudHlwZSwgZW5kcG9pbnRVcmwpO1xuXG5cdFx0aWYgKGRldktleXMgIT0gbnVsbCkge1xuXHRcdFx0eGhyLnNldFJlcXVlc3RIZWFkZXIoJ3gtcHAtc2VjcmV0JywgZGV2S2V5cy5zZWNyZXQpO1xuXHRcdFx0eGhyLnNldFJlcXVlc3RIZWFkZXIoJ3gtcHAta2V5JywgZGV2S2V5cy5rZXkpO1xuXHRcdH1cblx0XHR4aHIud2l0aENyZWRlbnRpYWxzID0gdHJ1ZTtcblx0XHR4aHIuc2V0UmVxdWVzdEhlYWRlcignQ29udGVudC1UeXBlJywgJ2FwcGxpY2F0aW9uL2pzb24nKTtcblx0XHR4aHIub25sb2FkID0gZnVuY3Rpb24gKCkge1xuXHRcdFx0aWYgKHhoci5zdGF0dXMgPj0gMjAwICYmIHhoci5zdGF0dXMgPCAzMDApIHtcblx0XHRcdFx0YXR0cnMuY2FsbGJhY2tzLnN1Y2Nlc3MoSlNPTi5wYXJzZSh4aHIucmVzcG9uc2VUZXh0KSk7XG5cdFx0XHR9IGVsc2UgaWYgKHhoci5zdGF0dXMgIT09IDIwMCkge1xuXHRcdFx0XHRhdHRycy5jYWxsYmFja3MuZmFpbChKU09OLnBhcnNlKHhoci5yZXNwb25zZVRleHQpKTtcblx0XHRcdH1cblx0XHR9O1xuXG5cdFx0aWYgKCFhdHRycy5wYXJhbXMpIHtcblx0XHRcdGF0dHJzLnBhcmFtcyA9IHt9O1xuXHRcdH1cblx0XHR4aHIuc2VuZChKU09OLnN0cmluZ2lmeShhdHRycy5wYXJhbXMpKTtcblx0fSxcblxuXHRwcm9taXNlQ2FsbDogZnVuY3Rpb24gcHJvbWlzZUNhbGwoYXR0cnMpIHtcblx0XHRyZXR1cm4gbmV3IFByb21pc2UoZnVuY3Rpb24gKHJlc29sdmUsIHJlamVjdCkge1xuXHRcdFx0dmFyIHhociA9IG5ldyBYTUxIdHRwUmVxdWVzdCgpO1xuXG5cdFx0XHRpZiAoYXR0cnMudHlwZSA9PT0gJ0dFVCcgJiYgYXR0cnMucGFyYW1zKSB7XG5cdFx0XHRcdGVuZHBvaW50VXJsID0gZW5kcG9pbnRVcmwgKyBcIj9cIiArIHBhcmFtc1RvR2V0VmFycyhhdHRycy5wYXJhbXMpO1xuXHRcdFx0fVxuXG5cdFx0XHR4aHIub3BlbihhdHRycy50eXBlLCBhdHRycy5lbmRwb2ludCk7XG5cdFx0XHR4aHIud2l0aENyZWRlbnRpYWxzID0gdHJ1ZTtcblxuXHRcdFx0aWYgKGRldktleXMgIT0gbnVsbCkge1xuXHRcdFx0XHR4aHIuc2V0UmVxdWVzdEhlYWRlcigneC1wcC1zZWNyZXQnLCBkZXZLZXlzLnNlY3JldCk7XG5cdFx0XHRcdHhoci5zZXRSZXF1ZXN0SGVhZGVyKCd4LXBwLWtleScsIGRldktleXMua2V5KTtcblx0XHRcdH1cblxuXHRcdFx0eGhyLnNldFJlcXVlc3RIZWFkZXIoJ0NvbnRlbnQtVHlwZScsICdhcHBsaWNhdGlvbi9qc29uJyk7XG5cdFx0XHR4aHIub25sb2FkID0gZnVuY3Rpb24gKCkge1xuXHRcdFx0XHRpZiAodGhpcy5zdGF0dXMgPj0gMjAwICYmIHRoaXMuc3RhdHVzIDwgMzAwKSB7XG5cdFx0XHRcdFx0YXR0cnMubWlkZGxld2FyZXMuc3VjY2VzcyhKU09OLnBhcnNlKHhoci5yZXNwb25zZVRleHQpKTtcblx0XHRcdFx0XHRyZXNvbHZlKEpTT04ucGFyc2UoeGhyLnJlc3BvbnNlVGV4dCkpO1xuXHRcdFx0XHR9IGVsc2Uge1xuXHRcdFx0XHRcdHdpbmRvdy5sb2NhdGlvbi5ocmVmID0gU3RvcmUuZ2V0TG9naW5VcmwoKTtcblx0XHRcdFx0fVxuXHRcdFx0fTtcblx0XHRcdHhoci5vbmVycm9yID0gZnVuY3Rpb24gKCkge1xuXHRcdFx0XHR3aW5kb3cubG9jYXRpb24gPSBTdG9yZS5nZXRMb2dpblVybCgpO1xuXHRcdFx0fTtcblx0XHRcdHhoci5zZW5kKCk7XG5cdFx0fSk7XG5cdH1cbn07XG5cbm1vZHVsZS5leHBvcnRzID0gQ2FsbGVyOyIsInZhciBkZWJvdW5jZWRUaW1lb3V0ID0gbnVsbDtcbnZhciBjdXJyZW50UXVlcnkgPSAnJztcbnZhciBsaW1pdCA9IDg7XG52YXIgbGF0ZW5jeSA9IDUwMDtcbnZhciBpbml0T3B0aW9ucyA9IHZvaWQgMDtcbnZhciBjdXJyZW50UGFnZSA9IDE7XG52YXIgbWV0YURhdGEgPSBudWxsO1xudmFyIGl0ZW1zID0gW107XG52YXIgcGFnaW5hdGlvbkRhdGEgPSBudWxsO1xuXG52YXIgUGFnaW5hdGlvbkhlbHBlciA9IHJlcXVpcmUoJy4vcGFnaW5hdGlvbi1oZWxwZXInKTtcbnZhciBDYWxsZXIgPSByZXF1aXJlKCcuL2NhbGxlcicpO1xudmFyIFN0b3JlID0gcmVxdWlyZSgnLi9zdG9yZScpO1xudmFyIERvbSA9IHJlcXVpcmUoJy4vZG9tJyk7XG5cbnZhciBDbG91ZGluYXJ5UGlja2VyID0ge1xuXG5cdFx0aW5pdGlhbGlzZTogZnVuY3Rpb24gaW5pdGlhbGlzZSgpIHtcblx0XHRcdFx0ZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoJ2JhYy0tY2xvdWRpbmFyeS0tY2xvc2VidG4nKS5vbmNsaWNrID0gZnVuY3Rpb24gKGUpIHtcblx0XHRcdFx0XHRcdENsb3VkaW5hcnlQaWNrZXIuY2xvc2VNb2RhbCgpO1xuXHRcdFx0XHR9O1xuXHRcdFx0XHRkb2N1bWVudC5nZXRFbGVtZW50QnlJZCgnYmFjLS1jbG91ZGluYXJ5LS1zZWFyY2gtaW5wdXQnKS5vbmtleXVwID0gZnVuY3Rpb24gKGUpIHtcblx0XHRcdFx0XHRcdENsb3VkaW5hcnlQaWNrZXIuaGFuZGxlU2VhcmNoKGUpO1xuXHRcdFx0XHR9O1xuXHRcdFx0XHRkb2N1bWVudC5nZXRFbGVtZW50QnlJZCgnYmFjLS1jbG91ZGluYXJ5LS1nby1iYWNrJykub25jbGljayA9IGZ1bmN0aW9uIChlKSB7XG5cdFx0XHRcdFx0XHRDbG91ZGluYXJ5UGlja2VyLmdvQmFjaygpO1xuXHRcdFx0XHR9O1xuXHRcdH0sXG5cblx0XHQvKlxuICBvcHRpb25zOiB7XG4gIFx0b25TZWxlY3Q6IGl0IGV4cGVjdHMgYSBmdW5jdGlvbi4gVGhpcyBmdW5jdGlvbiB3aWxsIGJlIGludm9rZWQgZXhhY3RseSBhdCB0aGUgbW9tZW50IHRoZSB1c2VyIHBpY2tzXG4gIFx0XHRhIGZpbGUgZnJvbSBjbG91ZGluYXJ5LiBUaGUgZnVuY3Rpb24gd2lsbCB0YWtlIGp1c3Qgb25lIHBhcmFtIHdoaWNoIGlzIHRoZSBzZWxlY3RlZCBpdGVtIG9iamVjdFxuICAgIGNsb3NlT25Fc2M6IHRydWUgLyBmYWxzZVxuICB9XG4gICAqL1xuXHRcdG9wZW5Nb2RhbDogZnVuY3Rpb24gb3Blbk1vZGFsKG9wdGlvbnMpIHtcblx0XHRcdFx0Q2xvdWRpbmFyeVBpY2tlci5pbml0aWFsaXNlKCk7XG5cdFx0XHRcdGluaXRPcHRpb25zID0gb3B0aW9ucztcblx0XHRcdFx0RG9tLmFkZENsYXNzKGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKCdiYWMtLWNsb3VkaW5hcnktLW1vZGFsJyksICdpcy1vcGVuJyk7XG5cdFx0XHRcdENsb3VkaW5hcnlQaWNrZXIuZ2V0SW1hZ2VzKHtcblx0XHRcdFx0XHRcdHBhZ2U6IDEsXG5cdFx0XHRcdFx0XHRsaW1pdDogbGltaXRcblx0XHRcdFx0fSk7XG5cdFx0fSxcblxuXHRcdGNsb3NlTW9kYWw6IGZ1bmN0aW9uIGNsb3NlTW9kYWwoKSB7XG5cdFx0XHRcdERvbS5yZW1vdmVDbGFzcyhkb2N1bWVudC5nZXRFbGVtZW50QnlJZCgnYmFjLS1jbG91ZGluYXJ5LS1tb2RhbCcpLCAnaXMtb3BlbicpO1xuXHRcdH0sXG5cblx0XHRnZXRJbWFnZXM6IGZ1bmN0aW9uIGdldEltYWdlcyhvcHRpb25zKSB7XG5cdFx0XHRcdC8vIFRPRE8gbWFrZSB0aGUgY2FsbCBhbmQgZ2V0IHRoZSBpbWFnZXNcblxuXHRcdFx0XHRDYWxsZXIubWFrZUNhbGwoe1xuXHRcdFx0XHRcdFx0dHlwZTogJ0dFVCcsXG5cdFx0XHRcdFx0XHRlbmRwb2ludDogU3RvcmUuZ2V0Q2xvdWRpbmFyeUVuZHBvaW50KCksXG5cdFx0XHRcdFx0XHRwYXJhbXM6IG9wdGlvbnMsXG5cdFx0XHRcdFx0XHRjYWxsYmFja3M6IHtcblx0XHRcdFx0XHRcdFx0XHRzdWNjZXNzOiBmdW5jdGlvbiBzdWNjZXNzKHJlc3VsdCkge1xuXHRcdFx0XHRcdFx0XHRcdFx0XHRDbG91ZGluYXJ5UGlja2VyLm9uSW1hZ2VzUmVzcG9uc2UocmVzdWx0KTtcblx0XHRcdFx0XHRcdFx0XHR9LFxuXHRcdFx0XHRcdFx0XHRcdGZhaWw6IGZ1bmN0aW9uIGZhaWwoZXJyKSB7XG5cdFx0XHRcdFx0XHRcdFx0XHRcdGFsZXJ0KGVycik7XG5cdFx0XHRcdFx0XHRcdFx0fVxuXHRcdFx0XHRcdFx0fVxuXHRcdFx0XHR9KTtcblx0XHR9LFxuXG5cdFx0aGFuZGxlU2VhcmNoOiBmdW5jdGlvbiBoYW5kbGVTZWFyY2goZSkge1xuXHRcdFx0XHRpZiAoZGVib3VuY2VkVGltZW91dCkge1xuXHRcdFx0XHRcdFx0Y2xlYXJUaW1lb3V0KGRlYm91bmNlZFRpbWVvdXQpO1xuXHRcdFx0XHR9XG5cblx0XHRcdFx0aWYgKGUudGFyZ2V0LnZhbHVlID09PSBjdXJyZW50UXVlcnkpIHtcblx0XHRcdFx0XHRcdHJldHVybjtcblx0XHRcdFx0fVxuXG5cdFx0XHRcdHZhciBxdWVyeSA9IGUudGFyZ2V0LnZhbHVlO1xuXG5cdFx0XHRcdGN1cnJlbnRRdWVyeSA9IHF1ZXJ5O1xuXG5cdFx0XHRcdHZhciBvcHRpb25zID0ge1xuXHRcdFx0XHRcdFx0cGFnZTogMSxcblx0XHRcdFx0XHRcdGxpbWl0OiBsaW1pdCxcblx0XHRcdFx0XHRcdHF1ZXJ5OiBxdWVyeVxuXHRcdFx0XHR9O1xuXG5cdFx0XHRcdGRlYm91bmNlZFRpbWVvdXQgPSBzZXRUaW1lb3V0KGZ1bmN0aW9uICgpIHtcblx0XHRcdFx0XHRcdENsb3VkaW5hcnlQaWNrZXIuZ2V0SW1hZ2VzKG9wdGlvbnMpO1xuXHRcdFx0XHR9LCBsYXRlbmN5KTtcblx0XHR9LFxuXG5cdFx0aXRlbVNlbGVjdGVkOiBmdW5jdGlvbiBpdGVtU2VsZWN0ZWQoaXRlbSwgZSkge1xuXG5cdFx0XHRcdGlmIChpdGVtLnR5cGUgPT0gJ2ZvbGRlcicpIHtcblxuXHRcdFx0XHRcdFx0dmFyIHBhcmFtcyA9IHtcblx0XHRcdFx0XHRcdFx0XHRwYWdlOiAxLFxuXHRcdFx0XHRcdFx0XHRcdGxpbWl0OiBsaW1pdCxcblx0XHRcdFx0XHRcdFx0XHRwYXJlbnQ6IGl0ZW0uaWRcblx0XHRcdFx0XHRcdH07XG5cblx0XHRcdFx0XHRcdC8vIFRPRE8gc2V0IHNlYXJjaCBpbnB1dCdzIHZhbHVlID0gJydcblx0XHRcdFx0XHRcdGN1cnJlbnRRdWVyeSA9ICcnO1xuXG5cdFx0XHRcdFx0XHRDbG91ZGluYXJ5UGlja2VyLmdldEltYWdlcyhwYXJhbXMpO1xuXHRcdFx0XHR9IGVsc2Uge1xuXHRcdFx0XHRcdFx0aW5pdE9wdGlvbnMub25TZWxlY3QoaXRlbSk7XG5cdFx0XHRcdFx0XHRDbG91ZGluYXJ5UGlja2VyLmNsb3NlTW9kYWwoKTtcblx0XHRcdFx0fVxuXHRcdH0sXG5cblx0XHRvbkltYWdlc1Jlc3BvbnNlOiBmdW5jdGlvbiBvbkltYWdlc1Jlc3BvbnNlKGRhdGEpIHtcblxuXHRcdFx0XHRwYWdpbmF0aW9uRGF0YSA9IFBhZ2luYXRpb25IZWxwZXIuZ2V0UGFnZXNSYW5nZShjdXJyZW50UGFnZSwgTWF0aC5jZWlsKGRhdGEubWV0YS50b3RhbCAvIGxpbWl0KSk7XG5cblx0XHRcdFx0bWV0YURhdGEgPSBkYXRhLm1ldGE7XG5cdFx0XHRcdGl0ZW1zID0gZGF0YS5hc3NldHM7XG5cblx0XHRcdFx0Q2xvdWRpbmFyeVBpY2tlci5yZW5kZXIoKTtcblx0XHR9LFxuXG5cdFx0cmVuZGVyUGFnaW5hdGlvbkJ1dHRvbnM6IGZ1bmN0aW9uIHJlbmRlclBhZ2luYXRpb25CdXR0b25zKCkge1xuXHRcdFx0XHR2YXIgdG9SZXR1cm4gPSBbXTtcblxuXHRcdFx0XHR2YXIgY3JlYXRlUGFnaW5hdGlvbkVsZW1lbnQgPSBmdW5jdGlvbiBjcmVhdGVQYWdpbmF0aW9uRWxlbWVudChhQ2xhc3NOYW1lLCBhRnVuY3Rpb24sIHNwYW5DbGFzc05hbWUsIHNwYW5Db250ZW50KSB7XG5cdFx0XHRcdFx0XHR2YXIgbGkgPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KCdsaScpO1xuXHRcdFx0XHRcdFx0dmFyIGEgPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KCdhJyk7XG5cdFx0XHRcdFx0XHRsaS5jbGFzc05hbWUgPSBhQ2xhc3NOYW1lO1xuXHRcdFx0XHRcdFx0YS5vbmNsaWNrID0gYUZ1bmN0aW9uO1xuXHRcdFx0XHRcdFx0dmFyIHNwYW4gPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KCdzcGFuJyk7XG5cdFx0XHRcdFx0XHRzcGFuLmNsYXNzTmFtZSA9IHNwYW5DbGFzc05hbWU7XG5cdFx0XHRcdFx0XHRpZiAoc3BhbkNvbnRlbnQpIHtcblx0XHRcdFx0XHRcdFx0XHRzcGFuLmlubmVySFRNTCA9IHNwYW5Db250ZW50O1xuXHRcdFx0XHRcdFx0fVxuXHRcdFx0XHRcdFx0YS5hcHBlbmRDaGlsZChzcGFuKTtcblx0XHRcdFx0XHRcdGxpLmFwcGVuZENoaWxkKGEpO1xuXHRcdFx0XHRcdFx0cmV0dXJuIGxpO1xuXHRcdFx0XHR9O1xuXG5cdFx0XHRcdGlmIChwYWdpbmF0aW9uRGF0YS5oYXNQcmV2aW91cykge1xuXHRcdFx0XHRcdFx0dG9SZXR1cm4ucHVzaChjcmVhdGVQYWdpbmF0aW9uRWxlbWVudCgnZGlzYWJsZWQnLCBmdW5jdGlvbiAoZSkge1xuXHRcdFx0XHRcdFx0XHRcdGUucHJldmVudERlZmF1bHQoKTtcblx0XHRcdFx0XHRcdFx0XHRDbG91ZGluYXJ5UGlja2VyLl9nb1RvUGFnZSgxKTtcblx0XHRcdFx0XHRcdH0sICdmYSBmYS1hbmdsZS1kb3VibGUtbGVmdCcpKTtcblx0XHRcdFx0XHRcdHRvUmV0dXJuLnB1c2goY3JlYXRlUGFnaW5hdGlvbkVsZW1lbnQoJ2Rpc2FibGVkJywgZnVuY3Rpb24gKGUpIHtcblx0XHRcdFx0XHRcdFx0XHRlLnByZXZlbnREZWZhdWx0KCk7XG5cdFx0XHRcdFx0XHRcdFx0Q2xvdWRpbmFyeVBpY2tlci5fZ29Ub1BhZ2UoY3VycmVudFBhZ2UgLSAxKTtcblx0XHRcdFx0XHRcdH0sICdmYSBmYS1hbmdsZS1sZWZ0JykpO1xuXHRcdFx0XHR9XG5cblx0XHRcdFx0Zm9yICh2YXIgaSA9IDA7IGkgPCBwYWdpbmF0aW9uRGF0YS5idXR0b25zLmxlbmd0aDsgaSsrKSB7XG5cdFx0XHRcdFx0XHQoZnVuY3Rpb24gKGkpIHtcblx0XHRcdFx0XHRcdFx0XHR2YXIgYnRuID0gcGFnaW5hdGlvbkRhdGEuYnV0dG9uc1tpXTtcblx0XHRcdFx0XHRcdFx0XHR0b1JldHVybi5wdXNoKGNyZWF0ZVBhZ2luYXRpb25FbGVtZW50KGJ0bi5ydW5uaW5ncGFnZSA/IFwiYWN0aXZlXCIgOiBcIi1cIiwgZnVuY3Rpb24gKGUpIHtcblx0XHRcdFx0XHRcdFx0XHRcdFx0ZS5wcmV2ZW50RGVmYXVsdCgpO1xuXHRcdFx0XHRcdFx0XHRcdFx0XHRDbG91ZGluYXJ5UGlja2VyLl9nb1RvUGFnZShidG4ucGFnZW5vKTtcblx0XHRcdFx0XHRcdFx0XHR9LCAnbnVtYmVyJywgYnRuLnBhZ2VubykpO1xuXHRcdFx0XHRcdFx0fSkoaSk7XG5cdFx0XHRcdH1cblxuXHRcdFx0XHRpZiAocGFnaW5hdGlvbkRhdGEuaGFzTmV4dCkge1xuXHRcdFx0XHRcdFx0dG9SZXR1cm4ucHVzaChjcmVhdGVQYWdpbmF0aW9uRWxlbWVudCgnZGlzYWJsZWQnLCBmdW5jdGlvbiAoZSkge1xuXHRcdFx0XHRcdFx0XHRcdGUucHJldmVudERlZmF1bHQoKTtcblx0XHRcdFx0XHRcdFx0XHRDbG91ZGluYXJ5UGlja2VyLl9nb1RvUGFnZShjdXJyZW50UGFnZSArIDEpO1xuXHRcdFx0XHRcdFx0fSwgJ2ZhIGZhLWFuZ2xlLXJpZ2h0JykpO1xuXHRcdFx0XHRcdFx0dG9SZXR1cm4ucHVzaChjcmVhdGVQYWdpbmF0aW9uRWxlbWVudCgnZGlzYWJsZWQnLCBmdW5jdGlvbiAoZSkge1xuXHRcdFx0XHRcdFx0XHRcdGUucHJldmVudERlZmF1bHQoKTtcblx0XHRcdFx0XHRcdFx0XHRDbG91ZGluYXJ5UGlja2VyLl9nb1RvUGFnZShNYXRoLmNlaWwobWV0YURhdGEudG90YWwgLyBsaW1pdCkpO1xuXHRcdFx0XHRcdFx0fSwgJ2ZhIGZhLWFuZ2xlLWRvdWJsZS1yaWdodCcpKTtcblx0XHRcdFx0fVxuXG5cdFx0XHRcdGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKCdiYWMtLWNsb3VkaW5hcnktYWN0dWFsLXBhZ2luYXRpb24tY29udGFpbmVyJykuaW5uZXJIVE1MID0gJyc7XG5cdFx0XHRcdGZvciAodmFyIF9pID0gMDsgX2kgPCB0b1JldHVybi5sZW5ndGg7IF9pKyspIHtcblx0XHRcdFx0XHRcdGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKCdiYWMtLWNsb3VkaW5hcnktYWN0dWFsLXBhZ2luYXRpb24tY29udGFpbmVyJykuYXBwZW5kQ2hpbGQodG9SZXR1cm5bX2ldKTtcblx0XHRcdFx0fVxuXHRcdH0sXG5cblx0XHRfZ29Ub1BhZ2U6IGZ1bmN0aW9uIF9nb1RvUGFnZShwYWdlKSB7XG5cblx0XHRcdFx0aWYgKHBhZ2UgPT09IGN1cnJlbnRQYWdlKSB7XG5cdFx0XHRcdFx0XHRyZXR1cm47XG5cdFx0XHRcdH1cblxuXHRcdFx0XHR2YXIgcGFyYW1zID0ge1xuXHRcdFx0XHRcdFx0cGFnZTogcGFnZSxcblx0XHRcdFx0XHRcdGxpbWl0OiBsaW1pdFxuXHRcdFx0XHR9O1xuXG5cdFx0XHRcdGlmIChtZXRhRGF0YS5hc3NldCkge1xuXHRcdFx0XHRcdFx0cGFyYW1zLnBhcmVudCA9IG1ldGFEYXRhLmFzc2V0O1xuXHRcdFx0XHR9XG5cdFx0XHRcdGlmIChjdXJyZW50UXVlcnkpIHtcblx0XHRcdFx0XHRcdHBhcmFtcy5xdWVyeSA9IGN1cnJlbnRRdWVyeTtcblx0XHRcdFx0fVxuXG5cdFx0XHRcdGN1cnJlbnRQYWdlID0gcGFnZTtcblxuXHRcdFx0XHRDbG91ZGluYXJ5UGlja2VyLmdldEltYWdlcyhwYXJhbXMpO1xuXHRcdH0sXG5cblx0XHRnb0JhY2s6IGZ1bmN0aW9uIGdvQmFjaygpIHtcblxuXHRcdFx0XHR2YXIgcGFyYW1zID0ge1xuXHRcdFx0XHRcdFx0cGFnZTogMSxcblx0XHRcdFx0XHRcdGxpbWl0OiBsaW1pdFxuXHRcdFx0XHR9O1xuXHRcdFx0XHRpZiAobWV0YURhdGEucGFyZW50KSB7XG5cdFx0XHRcdFx0XHRwYXJhbXMucGFyZW50ID0gbWV0YURhdGEucGFyZW50O1xuXHRcdFx0XHR9XG5cdFx0XHRcdGlmIChjdXJyZW50UXVlcnkpIHtcblx0XHRcdFx0XHRcdHBhcmFtcy5xdWVyeSA9IGN1cnJlbnRRdWVyeTtcblx0XHRcdFx0fVxuXHRcdFx0XHRDbG91ZGluYXJ5UGlja2VyLmdldEltYWdlcyhwYXJhbXMpO1xuXHRcdH0sXG5cblx0XHRyZW5kZXJJdGVtczogZnVuY3Rpb24gcmVuZGVySXRlbXMoKSB7XG5cdFx0XHRcdHZhciBvbmVJdGVtID0gZnVuY3Rpb24gb25lSXRlbShpdGVtKSB7XG5cdFx0XHRcdFx0XHR2YXIgaXRlbUljb24gPSBmdW5jdGlvbiBpdGVtSWNvbigpIHtcblx0XHRcdFx0XHRcdFx0XHRpZiAoaXRlbS50eXBlICE9ICdmb2xkZXInKSB7XG5cdFx0XHRcdFx0XHRcdFx0XHRcdHJldHVybiAnPGltZyBzcmM9JyArIGl0ZW0udGh1bWIgKyAnIGFsdD1cIlwiLz4nO1xuXHRcdFx0XHRcdFx0XHRcdH0gZWxzZSB7XG5cdFx0XHRcdFx0XHRcdFx0XHRcdHJldHVybiAnPGkgY2xhc3M9XCJmYSBmYS1mb2xkZXItb1wiPjwvaT4nO1xuXHRcdFx0XHRcdFx0XHRcdH1cblx0XHRcdFx0XHRcdH07XG5cblx0XHRcdFx0XHRcdHZhciBmdW5jdCA9IGZ1bmN0aW9uIGZ1bmN0KCkge1xuXHRcdFx0XHRcdFx0XHRcdENsb3VkaW5hcnlQaWNrZXIuaXRlbVNlbGVjdGVkKGl0ZW0pO1xuXHRcdFx0XHRcdFx0fTtcblxuXHRcdFx0XHRcdFx0dmFyIG5ld0RvbUVsID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudCgnZGl2Jyk7XG5cdFx0XHRcdFx0XHRuZXdEb21FbC5jbGFzc05hbWUgPSBcImNsb3VkLWltYWdlc19faXRlbVwiO1xuXHRcdFx0XHRcdFx0bmV3RG9tRWwub25jbGljayA9IGZ1bmN0O1xuXHRcdFx0XHRcdFx0bmV3RG9tRWwuaW5uZXJIVE1MID0gJ1xcblxcdFxcdFxcdFxcdFxcdFxcdCAgPGRpdiBjbGFzcz1cImNsb3VkLWltYWdlc19faXRlbV9fdHlwZVwiPlxcblxcdFxcdFxcdFxcdFxcdFxcdFxcdFxcdCcgKyBpdGVtSWNvbigpICsgJ1xcblxcdFxcdFxcdFxcdFxcdFxcdCAgPC9kaXY+XFxuXFx0XFx0XFx0XFx0XFx0XFx0ICA8ZGl2IGNsYXNzPVwiY2xvdWQtaW1hZ2VzX19pdGVtX19kZXRhaWxzXCI+XFxuXFx0XFx0XFx0XFx0XFx0XFx0XFx0XFx0PHNwYW4gY2xhc3M9XCJjbG91ZC1pbWFnZXNfX2l0ZW1fX2RldGFpbHNfX25hbWVcIj4nICsgaXRlbS5uYW1lICsgJzwvc3Bhbj5cXG5cXHRcXHRcXHRcXHRcXHRcXHRcXHRcXHQ8c3BhbiBjbGFzcz1cImNsb3VkLWltYWdlc19faXRlbV9fZGV0YWlsc19fZGF0ZVwiPicgKyBpdGVtLmNyZGF0ZSArICc8L3NwYW4+XFxuXFx0XFx0XFx0XFx0XFx0XFx0ICA8L2Rpdj5cXG5cXHRcXHRcXHRcXHRcXHRcXHQgIDxkaXYgY2xhc3M9XCJjbG91ZC1pbWFnZXNfX2l0ZW1fX2FjdGlvbnNcIj5cXG5cXHRcXHRcXHRcXHRcXHRcXHRcXHRcXHQ8YSBjbGFzcz1cImZhIGZhLXBlbmNpbFwiPjwvYT5cXG5cXHRcXHRcXHRcXHRcXHRcXHQgIDwvZGl2Pic7XG5cdFx0XHRcdFx0XHRyZXR1cm4gbmV3RG9tRWw7XG5cdFx0XHRcdH07XG5cblx0XHRcdFx0ZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoJ2JhYy0tY2xvdWRpbmFyeS1pdGFtcy1jb250YWluZXInKS5pbm5lckhUTUwgPSAnJztcblx0XHRcdFx0Zm9yICh2YXIgaSA9IDA7IGkgPCBpdGVtcy5sZW5ndGg7IGkrKykge1xuXHRcdFx0XHRcdFx0ZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoJ2JhYy0tY2xvdWRpbmFyeS1pdGFtcy1jb250YWluZXInKS5hcHBlbmRDaGlsZChvbmVJdGVtKGl0ZW1zW2ldKSk7XG5cdFx0XHRcdH1cblx0XHR9LFxuXG5cdFx0cmVuZGVyOiBmdW5jdGlvbiByZW5kZXIoKSB7XG5cdFx0XHRcdGlmIChtZXRhRGF0YS5hc3NldCkge1xuXHRcdFx0XHRcdFx0RG9tLnJlbW92ZUNsYXNzKGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKCdiYWMtLWNsb3VkaW5hcnktLWJhY2stYnV0dG9uLWNvbnRhaW5lcicpLCAnaGRuJyk7XG5cdFx0XHRcdH0gZWxzZSB7XG5cdFx0XHRcdFx0XHREb20uYWRkQ2xhc3MoZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoJ2JhYy0tY2xvdWRpbmFyeS0tYmFjay1idXR0b24tY29udGFpbmVyJyksICdoZG4nKTtcblx0XHRcdFx0fVxuXG5cdFx0XHRcdENsb3VkaW5hcnlQaWNrZXIucmVuZGVySXRlbXMoKTtcblxuXHRcdFx0XHRpZiAobWV0YURhdGEudG90YWwgPiBsaW1pdCkge1xuXHRcdFx0XHRcdFx0RG9tLnJlbW92ZUNsYXNzKGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKCdiYWMtLWNsb3VkaW5hcnktcGFnaW5hdGlvbi1jb250YWluZXInKSwgJ2hkbicpO1xuXHRcdFx0XHRcdFx0Q2xvdWRpbmFyeVBpY2tlci5yZW5kZXJQYWdpbmF0aW9uQnV0dG9ucygpO1xuXHRcdFx0XHR9IGVsc2Uge1xuXHRcdFx0XHRcdFx0RG9tLmFkZENsYXNzKGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKCdiYWMtLWNsb3VkaW5hcnktcGFnaW5hdGlvbi1jb250YWluZXInKSwgJ2hkbicpO1xuXHRcdFx0XHR9XG5cdFx0fVxufTtcblxubW9kdWxlLmV4cG9ydHMgPSBDbG91ZGluYXJ5UGlja2VyOyIsInZhciBEb20gPSB7XG4gICAgaGFzQ2xhc3M6IGZ1bmN0aW9uIGhhc0NsYXNzKGVsLCBjbGFzc05hbWUpIHtcbiAgICAgICAgaWYgKGVsLmNsYXNzTGlzdCkgcmV0dXJuIGVsLmNsYXNzTGlzdC5jb250YWlucyhjbGFzc05hbWUpO2Vsc2UgcmV0dXJuIG5ldyBSZWdFeHAoJyhefCApJyArIGNsYXNzTmFtZSArICcoIHwkKScsICdnaScpLnRlc3QoZWwuY2xhc3NOYW1lKTtcbiAgICB9LFxuXG4gICAgcmVtb3ZlQ2xhc3M6IGZ1bmN0aW9uIHJlbW92ZUNsYXNzKGVsLCBjbGFzc05hbWUpIHtcbiAgICAgICAgaWYgKGVsLmNsYXNzTGlzdCkgZWwuY2xhc3NMaXN0LnJlbW92ZShjbGFzc05hbWUpO2Vsc2UgZWwuY2xhc3NOYW1lID0gZWwuY2xhc3NOYW1lLnJlcGxhY2UobmV3IFJlZ0V4cCgnKF58XFxcXGIpJyArIGNsYXNzTmFtZS5zcGxpdCgnICcpLmpvaW4oJ3wnKSArICcoXFxcXGJ8JCknLCAnZ2knKSwgJyAnKTtcbiAgICB9LFxuXG4gICAgYWRkQ2xhc3M6IGZ1bmN0aW9uIGFkZENsYXNzKGVsLCBjbGFzc05hbWUpIHtcbiAgICAgICAgaWYgKGVsLmNsYXNzTGlzdCkgZWwuY2xhc3NMaXN0LmFkZChjbGFzc05hbWUpO2Vsc2UgZWwuY2xhc3NOYW1lICs9ICcgJyArIGNsYXNzTmFtZTtcbiAgICB9LFxuXG4gICAgdG9nZ2xlQ2xhc3M6IGZ1bmN0aW9uIHRvZ2dsZUNsYXNzKGVsLCBjbGFzc05hbWUpIHtcbiAgICAgICAgaWYgKHRoaXMuaGFzQ2xhc3MoZWwsIGNsYXNzTmFtZSkpIHtcbiAgICAgICAgICAgIHRoaXMucmVtb3ZlQ2xhc3MoZWwsIGNsYXNzTmFtZSk7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICB0aGlzLmFkZENsYXNzKGVsLCBjbGFzc05hbWUpO1xuICAgICAgICB9XG4gICAgfVxufTtcblxubW9kdWxlLmV4cG9ydHMgPSBEb207IiwidmFyIGRvbSA9IHJlcXVpcmUoJy4vZG9tJyk7XG5cbnZhciBkZWZhdWx0SGlkZUluID0gNTAwMDtcbnZhciBsYXN0SW5kZXggPSAxO1xuXG52YXIgaW5mb0Jsb2NrcyA9IFtdO1xuXG52YXIgSW5mb0NvbnRyb2xsZXIgPSB7XG5cdGluaXQ6IGZ1bmN0aW9uIGluaXQoKSB7XG5cdFx0Zm9yICh2YXIgaSA9IDE7IGkgPCA1OyBpKyspIHtcblx0XHRcdChmdW5jdGlvbiB4KGkpIHtcblx0XHRcdFx0dmFyIGNsb3NlRnVuY3Rpb24gPSBmdW5jdGlvbiBjbG9zZUZ1bmN0aW9uKCkge1xuXHRcdFx0XHRcdGRvbS5yZW1vdmVDbGFzcyhkb2N1bWVudC5nZXRFbGVtZW50QnlJZCgnYmFjLS1wdXJlc2RrLWluZm8tYm94LS0nICsgaSksICdiYWMtLWFjdGl2ZS0tJyk7XG5cdFx0XHRcdFx0ZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoJ2JhYy0tdGltZXInICsgaSkuc3R5bGUudHJhbnNpdGlvbiA9ICcnO1xuXHRcdFx0XHRcdGRvbS5yZW1vdmVDbGFzcyhkb2N1bWVudC5nZXRFbGVtZW50QnlJZCgnYmFjLS10aW1lcicgKyBpKSwgJ2JhYy0tZnVsbHdpZHRoJyk7XG5cdFx0XHRcdFx0aW5mb0Jsb2Nrc1tpIC0gMV0uaW5Vc2UgPSBmYWxzZTtcblx0XHRcdFx0XHRzZXRUaW1lb3V0KGZ1bmN0aW9uICgpIHtcblx0XHRcdFx0XHRcdGlmIChpbmZvQmxvY2tzW2kgLSAxXS5jbG9zZVRpbWVvdXQpIHtcblx0XHRcdFx0XHRcdFx0Y2xlYXJUaW1lb3V0KGluZm9CbG9ja3NbaSAtIDFdLmNsb3NlVGltZW91dCk7XG5cdFx0XHRcdFx0XHR9XG5cdFx0XHRcdFx0XHRkb20ucmVtb3ZlQ2xhc3MoZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoJ2JhYy0tcHVyZXNkay1pbmZvLWJveC0tJyArIGkpLCAnYmFjLS1zdWNjZXNzJyk7XG5cdFx0XHRcdFx0XHRkb20ucmVtb3ZlQ2xhc3MoZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoJ2JhYy0tcHVyZXNkay1pbmZvLWJveC0tJyArIGkpLCAnYmFjLS1pbmZvJyk7XG5cdFx0XHRcdFx0XHRkb20ucmVtb3ZlQ2xhc3MoZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoJ2JhYy0tcHVyZXNkay1pbmZvLWJveC0tJyArIGkpLCAnYmFjLS13YXJuaW5nJyk7XG5cdFx0XHRcdFx0XHRkb20ucmVtb3ZlQ2xhc3MoZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoJ2JhYy0tcHVyZXNkay1pbmZvLWJveC0tJyArIGkpLCAnYmFjLS1lcnJvcicpO1xuXHRcdFx0XHRcdH0sIDQ1MCk7XG5cdFx0XHRcdH07XG5cblx0XHRcdFx0dmFyIGFkZFRleHQgPSBmdW5jdGlvbiBhZGRUZXh0KHRleHQpIHtcblx0XHRcdFx0XHRkb2N1bWVudC5nZXRFbGVtZW50QnlJZCgnYmFjLS1pbmZvLW1haW4tdGV4dC0tJyArIGkpLmlubmVySFRNTCA9IHRleHQ7XG5cdFx0XHRcdH07XG5cblx0XHRcdFx0dmFyIGFkZFRpbWVvdXQgPSBmdW5jdGlvbiBhZGRUaW1lb3V0KHRpbWVvdXRNc2Vjcykge1xuXHRcdFx0XHRcdGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKCdiYWMtLXRpbWVyJyArIGkpLnN0eWxlLnRyYW5zaXRpb24gPSAnd2lkdGggJyArIHRpbWVvdXRNc2VjcyArICdtcyc7XG5cdFx0XHRcdFx0ZG9tLmFkZENsYXNzKGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKCdiYWMtLXRpbWVyJyArIGkpLCAnYmFjLS1mdWxsd2lkdGgnKTtcblx0XHRcdFx0XHRpbmZvQmxvY2tzW2kgLSAxXS5jbG9zZVRpbWVvdXQgPSBzZXRUaW1lb3V0KGZ1bmN0aW9uICgpIHtcblx0XHRcdFx0XHRcdGluZm9CbG9ja3NbaSAtIDFdLmNsb3NlRnVuY3Rpb24oKTtcblx0XHRcdFx0XHR9LCB0aW1lb3V0TXNlY3MpO1xuXHRcdFx0XHR9O1xuXG5cdFx0XHRcdGluZm9CbG9ja3MucHVzaCh7XG5cdFx0XHRcdFx0aWQ6IGksXG5cdFx0XHRcdFx0aW5Vc2U6IGZhbHNlLFxuXHRcdFx0XHRcdGVsZW1lbnQ6IGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKCdiYWMtLXB1cmVzZGstaW5mby1ib3gtLScgKyBpKSxcblx0XHRcdFx0XHRjbG9zZUZ1bmN0aW9uOiBjbG9zZUZ1bmN0aW9uLFxuXHRcdFx0XHRcdGFkZFRleHQ6IGFkZFRleHQsXG5cdFx0XHRcdFx0YWRkVGltZW91dDogYWRkVGltZW91dCxcblx0XHRcdFx0XHRjbG9zZVRpbWVvdXQ6IGZhbHNlXG5cdFx0XHRcdH0pO1xuXHRcdFx0XHRkb2N1bWVudC5nZXRFbGVtZW50QnlJZCgnYmFjLS1pbmZvLWNsb3NlLWJ1dHRvbi0tJyArIGkpLm9uY2xpY2sgPSBmdW5jdGlvbiAoZSkge1xuXHRcdFx0XHRcdGNsb3NlRnVuY3Rpb24oaSk7XG5cdFx0XHRcdH07XG5cdFx0XHR9KShpKTtcblx0XHR9XG5cdH0sXG5cblx0LypcbiAgdHlwZTogb25lIG9mOlxuIFx0LSBzdWNjZXNzXG4gXHQtIGluZm9cbiBcdC0gd2FybmluZ1xuIFx0LSBlcnJvclxuICB0ZXh0OiB0aGUgdGV4dCB0byBkaXNwbGF5XG4gIG9wdGlvbnMgKG9wdGlvbmFsKToge1xuICBcdFx0aGlkZUluOiBtaWxsaXNlY29uZHMgdG8gaGlkZSBpdC4gLTEgZm9yIG5vdCBoaWRpbmcgaXQgYXQgYWxsLiBEZWZhdWx0IGlzIDUwMDBcbiAgfVxuICAqL1xuXHRzaG93SW5mbzogZnVuY3Rpb24gc2hvd0luZm8odHlwZSwgdGV4dCwgb3B0aW9ucykge1xuXHRcdGZvciAodmFyIGkgPSAwOyBpIDwgaW5mb0Jsb2Nrcy5sZW5ndGg7IGkrKykge1xuXHRcdFx0dmFyIGluZm9CbG9jayA9IGluZm9CbG9ja3NbaV07XG5cdFx0XHRpZiAoIWluZm9CbG9jay5pblVzZSkge1xuXHRcdFx0XHRpbmZvQmxvY2suaW5Vc2UgPSB0cnVlO1xuXHRcdFx0XHRpbmZvQmxvY2suZWxlbWVudC5zdHlsZS56SW5kZXggPSBsYXN0SW5kZXg7XG5cdFx0XHRcdGluZm9CbG9jay5hZGRUZXh0KHRleHQpO1xuXHRcdFx0XHRsYXN0SW5kZXggKz0gMTtcblx0XHRcdFx0dmFyIHRpbWVvdXRtU2VjcyA9IGRlZmF1bHRIaWRlSW47XG5cdFx0XHRcdHZhciBhdXRvQ2xvc2UgPSB0cnVlO1xuXHRcdFx0XHRpZiAob3B0aW9ucykge1xuXHRcdFx0XHRcdGlmIChvcHRpb25zLmhpZGVJbiAhPSBudWxsICYmIG9wdGlvbnMuaGlkZUluICE9IHVuZGVmaW5lZCAmJiBvcHRpb25zLmhpZGVJbiAhPSAtMSkge1xuXHRcdFx0XHRcdFx0dGltZW91dG1TZWNzID0gb3B0aW9ucy5oaWRlSW47XG5cdFx0XHRcdFx0fSBlbHNlIGlmIChvcHRpb25zLmhpZGVJbiA9PT0gLTEpIHtcblx0XHRcdFx0XHRcdGF1dG9DbG9zZSA9IGZhbHNlO1xuXHRcdFx0XHRcdH1cblx0XHRcdFx0fVxuXHRcdFx0XHRpZiAoYXV0b0Nsb3NlKSB7XG5cdFx0XHRcdFx0aW5mb0Jsb2NrLmFkZFRpbWVvdXQodGltZW91dG1TZWNzKTtcblx0XHRcdFx0fVxuXHRcdFx0XHRkb20uYWRkQ2xhc3MoaW5mb0Jsb2NrLmVsZW1lbnQsICdiYWMtLScgKyB0eXBlKTtcblx0XHRcdFx0ZG9tLmFkZENsYXNzKGluZm9CbG9jay5lbGVtZW50LCAnYmFjLS1hY3RpdmUtLScpO1xuXHRcdFx0XHRyZXR1cm47XG5cdFx0XHR9XG5cdFx0fVxuXHR9XG59O1xuXG5tb2R1bGUuZXhwb3J0cyA9IEluZm9Db250cm9sbGVyOyIsInZhciBTdG9yZSA9IHJlcXVpcmUoJy4vc3RvcmUuanMnKTtcblxudmFyIExvZ2dlciA9IHtcblx0XHRsb2c6IGZ1bmN0aW9uIGxvZyh3aGF0KSB7XG5cdFx0XHRcdGlmICghU3RvcmUubG9nc0VuYWJsZWQoKSkge1xuXHRcdFx0XHRcdFx0cmV0dXJuIGZhbHNlO1xuXHRcdFx0XHR9IGVsc2Uge1xuXHRcdFx0XHRcdFx0TG9nZ2VyLmxvZyA9IGNvbnNvbGUubG9nLmJpbmQoY29uc29sZSk7XG5cdFx0XHRcdFx0XHRMb2dnZXIubG9nKHdoYXQpO1xuXHRcdFx0XHR9XG5cdFx0fSxcblx0XHRlcnJvcjogZnVuY3Rpb24gZXJyb3IoZXJyKSB7XG5cdFx0XHRcdGlmICghU3RvcmUubG9nc0VuYWJsZWQoKSkge1xuXHRcdFx0XHRcdFx0cmV0dXJuIGZhbHNlO1xuXHRcdFx0XHR9IGVsc2Uge1xuXHRcdFx0XHRcdFx0TG9nZ2VyLmVycm9yID0gY29uc29sZS5lcnJvci5iaW5kKGNvbnNvbGUpO1xuXHRcdFx0XHRcdFx0TG9nZ2VyLmVycm9yKGVycik7XG5cdFx0XHRcdH1cblx0XHR9XG59O1xuXG5tb2R1bGUuZXhwb3J0cyA9IExvZ2dlcjsiLCJ2YXIgc2V0dGluZ3MgPSB7XG5cdHRvdGFsUGFnZUJ1dHRvbnNOdW1iZXI6IDhcbn07XG5cbnZhciBQYWdpbmF0b3IgPSB7XG5cdHNldFNldHRpbmdzOiBmdW5jdGlvbiBzZXRTZXR0aW5ncyhzZXR0aW5nKSB7XG5cdFx0Zm9yICh2YXIga2V5IGluIHNldHRpbmcpIHtcblx0XHRcdHNldHRpbmdzW2tleV0gPSBzZXR0aW5nW2tleV07XG5cdFx0fVxuXHR9LFxuXG5cdGdldFBhZ2VzUmFuZ2U6IGZ1bmN0aW9uIGdldFBhZ2VzUmFuZ2UoY3VycGFnZSwgdG90YWxQYWdlc09uUmVzdWx0U2V0KSB7XG5cdFx0dmFyIHBhZ2VSYW5nZSA9IFt7IHBhZ2VubzogY3VycGFnZSwgcnVubmluZ3BhZ2U6IHRydWUgfV07XG5cdFx0dmFyIGhhc25leHRvbnJpZ2h0ID0gdHJ1ZTtcblx0XHR2YXIgaGFzbmV4dG9ubGVmdCA9IHRydWU7XG5cdFx0dmFyIGkgPSAxO1xuXHRcdHdoaWxlIChwYWdlUmFuZ2UubGVuZ3RoIDwgc2V0dGluZ3MudG90YWxQYWdlQnV0dG9uc051bWJlciAmJiAoaGFzbmV4dG9ucmlnaHQgfHwgaGFzbmV4dG9ubGVmdCkpIHtcblx0XHRcdGlmIChoYXNuZXh0b25sZWZ0KSB7XG5cdFx0XHRcdGlmIChjdXJwYWdlIC0gaSA+IDApIHtcblx0XHRcdFx0XHRwYWdlUmFuZ2UucHVzaCh7IHBhZ2VubzogY3VycGFnZSAtIGksIHJ1bm5pbmdwYWdlOiBmYWxzZSB9KTtcblx0XHRcdFx0fSBlbHNlIHtcblx0XHRcdFx0XHRoYXNuZXh0b25sZWZ0ID0gZmFsc2U7XG5cdFx0XHRcdH1cblx0XHRcdH1cblx0XHRcdGlmIChoYXNuZXh0b25yaWdodCkge1xuXHRcdFx0XHRpZiAoY3VycGFnZSArIGkgLSAxIDwgdG90YWxQYWdlc09uUmVzdWx0U2V0KSB7XG5cdFx0XHRcdFx0cGFnZVJhbmdlLnB1c2goeyBwYWdlbm86IGN1cnBhZ2UgKyBpLCBydW5uaW5ncGFnZTogZmFsc2UgfSk7XG5cdFx0XHRcdH0gZWxzZSB7XG5cdFx0XHRcdFx0aGFzbmV4dG9ucmlnaHQgPSBmYWxzZTtcblx0XHRcdFx0fVxuXHRcdFx0fVxuXHRcdFx0aSsrO1xuXHRcdH1cblxuXHRcdHZhciBoYXNOZXh0ID0gY3VycGFnZSA8IHRvdGFsUGFnZXNPblJlc3VsdFNldDtcblx0XHR2YXIgaGFzUHJldmlvdXMgPSBjdXJwYWdlID4gMTtcblxuXHRcdHJldHVybiB7XG5cdFx0XHRidXR0b25zOiBwYWdlUmFuZ2Uuc29ydChmdW5jdGlvbiAoaXRlbUEsIGl0ZW1CKSB7XG5cdFx0XHRcdHJldHVybiBpdGVtQS5wYWdlbm8gLSBpdGVtQi5wYWdlbm87XG5cdFx0XHR9KSxcblx0XHRcdGhhc05leHQ6IGhhc05leHQsXG5cdFx0XHRoYXNQcmV2aW91czogaGFzUHJldmlvdXNcblx0XHR9O1xuXHR9XG59O1xuXG5tb2R1bGUuZXhwb3J0cyA9IFBhZ2luYXRvcjsiLCIndXNlIHN0cmljdCc7XG5cbnZhciBTdG9yZSA9IHJlcXVpcmUoJy4vc3RvcmUuanMnKTtcbnZhciBMb2dnZXIgPSByZXF1aXJlKCcuL2xvZ2dlci5qcycpO1xuXG52YXIgYXZhaWxhYmxlTGlzdGVuZXJzID0ge1xuXHRzZWFyY2hLZXlVcDoge1xuXHRcdGluZm86ICdMaXN0ZW5lciBvbiBrZXlVcCBvZiBzZWFyY2ggaW5wdXQgb24gdG9wIGJhcidcblx0fSxcblx0c2VhcmNoRW50ZXI6IHtcblx0XHRpbmZvOiAnTGlzdGVuZXIgb24gZW50ZXIga2V5IHByZXNzZWQgb24gc2VhcmNoIGlucHV0IG9uIHRvcCBiYXInXG5cdH0sXG5cdHNlYXJjaE9uQ2hhbmdlOiB7XG5cdFx0aW5mbzogJ0xpc3RlbmVyIG9uIGNoYW5nZSBvZiBpbnB1dCB2YWx1ZSdcblx0fVxufTtcblxudmFyIFB1YlN1YiA9IHtcblx0Z2V0QXZhaWxhYmxlTGlzdGVuZXJzOiBmdW5jdGlvbiBnZXRBdmFpbGFibGVMaXN0ZW5lcnMoKSB7XG5cdFx0cmV0dXJuIGF2YWlsYWJsZUxpc3RlbmVycztcblx0fSxcblxuXHRzdWJzY3JpYmU6IGZ1bmN0aW9uIHN1YnNjcmliZShldmVudHQsIGZ1bmN0KSB7XG5cdFx0aWYgKGV2ZW50dCA9PT0gXCJzZWFyY2hLZXlVcFwiKSB7XG5cdFx0XHR2YXIgZWwgPSBkb2N1bWVudC5nZXRFbGVtZW50QnlJZChTdG9yZS5nZXRTZWFyY2hJbnB1dElkKCkpO1xuXHRcdFx0ZWwuYWRkRXZlbnRMaXN0ZW5lcigna2V5dXAnLCBmdW5jdCk7XG5cdFx0XHRyZXR1cm4gZnVuY3Rpb24gKCkge1xuXHRcdFx0XHRlbC5yZW1vdmVFdmVudExpc3RlbmVyKCdrZXl1cCcsIGZ1bmN0LCBmYWxzZSk7XG5cdFx0XHR9O1xuXHRcdH0gZWxzZSBpZiAoZXZlbnR0ID09PSAnc2VhcmNoRW50ZXInKSB7XG5cdFx0XHR2YXIgaGFuZGxpbmdGdW5jdCA9IGZ1bmN0aW9uIGhhbmRsaW5nRnVuY3QoZSkge1xuXHRcdFx0XHRpZiAoZS5rZXlDb2RlID09PSAxMykge1xuXHRcdFx0XHRcdGZ1bmN0KGUpO1xuXHRcdFx0XHR9XG5cdFx0XHR9O1xuXHRcdFx0ZWwuYWRkRXZlbnRMaXN0ZW5lcigna2V5ZG93bicsIGhhbmRsaW5nRnVuY3QpO1xuXHRcdFx0cmV0dXJuIGZ1bmN0aW9uICgpIHtcblx0XHRcdFx0ZWwucmVtb3ZlRXZlbnRMaXN0ZW5lcigna2V5ZG93bicsIGhhbmRsaW5nRnVuY3QsIGZhbHNlKTtcblx0XHRcdH07XG5cdFx0fSBlbHNlIGlmIChldmVudHQgPT09ICdzZWFyY2hPbkNoYW5nZScpIHtcblx0XHRcdHZhciBlbCA9IGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKFN0b3JlLmdldFNlYXJjaElucHV0SWQoKSk7XG5cdFx0XHRlbC5hZGRFdmVudExpc3RlbmVyKCdjaGFuZ2UnLCBmdW5jdCk7XG5cdFx0XHRyZXR1cm4gZnVuY3Rpb24gKCkge1xuXHRcdFx0XHRlbC5yZW1vdmVFdmVudExpc3RlbmVyKCdrZXl1cCcsIGZ1bmN0LCBmYWxzZSk7XG5cdFx0XHR9O1xuXHRcdH0gZWxzZSB7XG5cdFx0XHRMb2dnZXIuZXJyb3IoJ1RoZSBldmVudCB5b3UgdHJpZWQgdG8gc3Vic2NyaWJlIGlzIG5vdCBhdmFpbGFibGUgYnkgdGhlIGxpYnJhcnknKTtcblx0XHRcdExvZ2dlci5sb2coJ1RoZSBhdmFpbGFibGUgZXZlbnRzIGFyZTogJywgYXZhaWxhYmxlTGlzdGVuZXJzKTtcblx0XHRcdHJldHVybiBmdW5jdGlvbiAoKSB7fTtcblx0XHR9XG5cdH1cbn07XG5cbm1vZHVsZS5leHBvcnRzID0gUHViU3ViOyIsInZhciBzdGF0ZSA9IHtcblx0Z2VuZXJhbDoge30sXG5cdHVzZXJEYXRhOiB7fSxcblx0Y29uZmlndXJhdGlvbjoge1xuXHRcdHNlc3Npb25FbmRwb2ludDogJ3Nlc3Npb24nXG5cdH0sXG5cdGh0bWxUZW1wbGF0ZTogJycsXG5cdGFwcHM6IG51bGwsXG5cdHZlcnNpb25OdW1iZXI6ICcnLFxuXHRkZXY6IGZhbHNlLFxuXHRmaWxlUGlja2VyOiB7XG5cdFx0c2VsZWN0ZWRGaWxlOiBudWxsXG5cdH0sXG5cdGFwcEluZm86IG51bGxcbn07XG5cbmZ1bmN0aW9uIGFzc2VtYmxlKGxpdGVyYWwsIHBhcmFtcykge1xuXHRyZXR1cm4gbmV3IEZ1bmN0aW9uKHBhcmFtcywgXCJyZXR1cm4gYFwiICsgbGl0ZXJhbCArIFwiYDtcIik7XG59XG5cbnZhciBTdG9yZSA9IHtcblx0Z2V0U3RhdGU6IGZ1bmN0aW9uIGdldFN0YXRlKCkge1xuXHRcdHJldHVybiBPYmplY3QuYXNzaWduKHt9LCBzdGF0ZSk7XG5cdH0sXG5cblx0c2V0V2luZG93TmFtZTogZnVuY3Rpb24gc2V0V2luZG93TmFtZSh3bikge1xuXHRcdHN0YXRlLmdlbmVyYWwud2luZG93TmFtZSA9IHduO1xuXHR9LFxuXG5cdHNldERldjogZnVuY3Rpb24gc2V0RGV2KGRldikge1xuXHRcdHN0YXRlLmRldiA9IGRldjtcblx0fSxcblxuXHRnZXREZXZVcmxQYXJ0OiBmdW5jdGlvbiBnZXREZXZVcmxQYXJ0KCkge1xuXHRcdGlmIChzdGF0ZS5kZXYpIHtcblx0XHRcdHJldHVybiBcInNhbmRib3gvXCI7XG5cdFx0fSBlbHNlIHtcblx0XHRcdHJldHVybiBcIlwiO1xuXHRcdH1cblx0fSxcblxuXHRnZXRGdWxsQmFzZVVybDogZnVuY3Rpb24gZ2V0RnVsbEJhc2VVcmwoKSB7XG5cdFx0cmV0dXJuIHN0YXRlLmNvbmZpZ3VyYXRpb24ucm9vdFVybCArIHN0YXRlLmNvbmZpZ3VyYXRpb24uYmFzZVVybCArIFN0b3JlLmdldERldlVybFBhcnQoKTtcblx0fSxcblxuXHQvKlxuICBjb25mOlxuICAtIGhlYWRlckRpdklkXG4gIC0gaW5jbHVkZUFwcHNNZW51XG4gICovXG5cdHNldENvbmZpZ3VyYXRpb246IGZ1bmN0aW9uIHNldENvbmZpZ3VyYXRpb24oY29uZikge1xuXHRcdHN0YXRlLmNvbmZpZ3VyYXRpb24gPSBjb25mO1xuXHR9LFxuXG5cdHNldFZlcnNpb25OdW1iZXI6IGZ1bmN0aW9uIHNldFZlcnNpb25OdW1iZXIodmVyc2lvbikge1xuXHRcdHN0YXRlLnZlcnNpb25OdW1iZXIgPSB2ZXJzaW9uO1xuXHR9LFxuXG5cdGdldFZlcnNpb25OdW1iZXI6IGZ1bmN0aW9uIGdldFZlcnNpb25OdW1iZXIoKSB7XG5cdFx0cmV0dXJuIHN0YXRlLnZlcnNpb25OdW1iZXI7XG5cdH0sXG5cblx0Z2V0QXBwc1Zpc2libGU6IGZ1bmN0aW9uIGdldEFwcHNWaXNpYmxlKCkge1xuXHRcdGlmIChzdGF0ZS5jb25maWd1cmF0aW9uLmFwcHNWaXNpYmxlID09PSBudWxsIHx8IHN0YXRlLmNvbmZpZ3VyYXRpb24uYXBwc1Zpc2libGUgPT09IHVuZGVmaW5lZCkge1xuXHRcdFx0cmV0dXJuIHRydWU7XG5cdFx0fSBlbHNlIHtcblx0XHRcdHJldHVybiBzdGF0ZS5jb25maWd1cmF0aW9uLmFwcHNWaXNpYmxlO1xuXHRcdH1cblx0fSxcblxuXHRzZXRBcHBzVmlzaWJsZTogZnVuY3Rpb24gc2V0QXBwc1Zpc2libGUoYXBwc1Zpc2libGUpIHtcblx0XHRzdGF0ZS5jb25maWd1cmF0aW9uLmFwcHNWaXNpYmxlID0gYXBwc1Zpc2libGU7XG5cdH0sXG5cblx0c2V0SFRNTFRlbXBsYXRlOiBmdW5jdGlvbiBzZXRIVE1MVGVtcGxhdGUodGVtcGxhdGUpIHtcblx0XHRzdGF0ZS5odG1sVGVtcGxhdGUgPSB0ZW1wbGF0ZTtcblx0fSxcblxuXHRzZXRBcHBzOiBmdW5jdGlvbiBzZXRBcHBzKGFwcHMpIHtcblx0XHRzdGF0ZS5hcHBzID0gYXBwcztcblx0fSxcblxuXHRzZXRBcHBJbmZvOiBmdW5jdGlvbiBzZXRBcHBJbmZvKGFwcEluZm8pIHtcblx0XHRzdGF0ZS5hcHBJbmZvID0gYXBwSW5mbztcblx0fSxcblxuXHRnZXRBcHBJbmZvOiBmdW5jdGlvbiBnZXRBcHBJbmZvKCkge1xuXHRcdHJldHVybiBzdGF0ZS5hcHBJbmZvO1xuXHR9LFxuXG5cdGdldExvZ2luVXJsOiBmdW5jdGlvbiBnZXRMb2dpblVybCgpIHtcblx0XHRyZXR1cm4gc3RhdGUuY29uZmlndXJhdGlvbi5yb290VXJsICsgc3RhdGUuY29uZmlndXJhdGlvbi5sb2dpblVybCArIFwiP1wiICsgc3RhdGUuY29uZmlndXJhdGlvbi5yZWRpcmVjdFVybFBhcmFtICsgXCI9XCIgKyB3aW5kb3cubG9jYXRpb24uaHJlZjtcblx0fSxcblxuXHRnZXRBdXRoZW50aWNhdGlvbkVuZHBvaW50OiBmdW5jdGlvbiBnZXRBdXRoZW50aWNhdGlvbkVuZHBvaW50KCkge1xuXHRcdHJldHVybiBTdG9yZS5nZXRGdWxsQmFzZVVybCgpICsgc3RhdGUuY29uZmlndXJhdGlvbi5zZXNzaW9uRW5kcG9pbnQ7XG5cdH0sXG5cblx0Z2V0U3dpdGNoQWNjb3VudEVuZHBvaW50OiBmdW5jdGlvbiBnZXRTd2l0Y2hBY2NvdW50RW5kcG9pbnQoYWNjb3VudElkKSB7XG5cdFx0cmV0dXJuIFN0b3JlLmdldEZ1bGxCYXNlVXJsKCkgKyAnYWNjb3VudHMvc3dpdGNoLycgKyBhY2NvdW50SWQ7XG5cdH0sXG5cblx0Z2V0QXBwc0VuZHBvaW50OiBmdW5jdGlvbiBnZXRBcHBzRW5kcG9pbnQoKSB7XG5cdFx0cmV0dXJuIFN0b3JlLmdldEZ1bGxCYXNlVXJsKCkgKyAnYXBwcyc7XG5cdH0sXG5cblx0Z2V0Q2xvdWRpbmFyeUVuZHBvaW50OiBmdW5jdGlvbiBnZXRDbG91ZGluYXJ5RW5kcG9pbnQoKSB7XG5cdFx0cmV0dXJuIFN0b3JlLmdldEZ1bGxCYXNlVXJsKCkgKyAnYXNzZXRzJztcblx0fSxcblxuXHRsb2dzRW5hYmxlZDogZnVuY3Rpb24gbG9nc0VuYWJsZWQoKSB7XG5cdFx0cmV0dXJuIHN0YXRlLmNvbmZpZ3VyYXRpb24ubG9ncztcblx0fSxcblxuXHRnZXRTZWFyY2hJbnB1dElkOiBmdW5jdGlvbiBnZXRTZWFyY2hJbnB1dElkKCkge1xuXHRcdHJldHVybiBzdGF0ZS5jb25maWd1cmF0aW9uLnNlYXJjaElucHV0SWQ7XG5cdH0sXG5cblx0c2V0SFRNTENvbnRhaW5lcjogZnVuY3Rpb24gc2V0SFRNTENvbnRhaW5lcihpZCkge1xuXHRcdHN0YXRlLmNvbmZpZ3VyYXRpb24uaGVhZGVyRGl2SWQgPSBpZDtcblx0fSxcblxuXHRnZXRIVExNQ29udGFpbmVyOiBmdW5jdGlvbiBnZXRIVExNQ29udGFpbmVyKCkge1xuXHRcdGlmIChzdGF0ZS5jb25maWd1cmF0aW9uLmhlYWRlckRpdklkKSB7XG5cdFx0XHRyZXR1cm4gc3RhdGUuY29uZmlndXJhdGlvbi5oZWFkZXJEaXZJZDtcblx0XHR9IGVsc2Uge1xuXHRcdFx0cmV0dXJuIFwicHBzZGstY29udGFpbmVyXCI7XG5cdFx0fVxuXHR9LFxuXG5cdGdldEhUTUw6IGZ1bmN0aW9uIGdldEhUTUwoKSB7XG5cdFx0cmV0dXJuIHN0YXRlLmh0bWxUZW1wbGF0ZTtcblx0fSxcblxuXHRzZXRTZXNzaW9uRW5kcG9pbnQ6IGZ1bmN0aW9uIHNldFNlc3Npb25FbmRwb2ludChzZXNzaW9uRW5kcG9pbnQpIHtcblx0XHRpZiAoc2Vzc2lvbkVuZHBvaW50LmluZGV4T2YoJy8nKSA9PT0gMCkge1xuXHRcdFx0c2Vzc2lvbkVuZHBvaW50ID0gc2Vzc2lvbkVuZHBvaW50LnN1YnN0cmluZygxLCBzZXNzaW9uRW5kcG9pbnQubGVuZ3RoIC0gMSk7XG5cdFx0fVxuXHRcdHN0YXRlLmNvbmZpZ3VyYXRpb24uc2Vzc2lvbkVuZHBvaW50ID0gc2Vzc2lvbkVuZHBvaW50O1xuXHR9LFxuXG5cdHNldFVybFZlcnNpb25QcmVmaXg6IGZ1bmN0aW9uIHNldFVybFZlcnNpb25QcmVmaXgocHJlZml4KSB7XG5cdFx0c3RhdGUuY29uZmlndXJhdGlvbi5iYXNlVXJsID0gcHJlZml4O1xuXHR9LFxuXG5cdGdldFdpbmRvd05hbWU6IGZ1bmN0aW9uIGdldFdpbmRvd05hbWUoKSB7XG5cdFx0cmV0dXJuIHN0YXRlLmdlbmVyYWwud2luZG93TmFtZTtcblx0fSxcblxuXHRzZXRVc2VyRGF0YTogZnVuY3Rpb24gc2V0VXNlckRhdGEodXNlckRhdGEpIHtcblx0XHRzdGF0ZS51c2VyRGF0YSA9IHVzZXJEYXRhO1xuXHR9LFxuXG5cdGdldFVzZXJEYXRhOiBmdW5jdGlvbiBnZXRVc2VyRGF0YSgpIHtcblx0XHRyZXR1cm4gc3RhdGUudXNlckRhdGE7XG5cdH0sXG5cblx0c2V0Um9vdFVybDogZnVuY3Rpb24gc2V0Um9vdFVybChyb290VXJsKSB7XG5cdFx0c3RhdGUuY29uZmlndXJhdGlvbi5yb290VXJsID0gcm9vdFVybC5yZXBsYWNlKC9cXC8/JC8sICcvJyk7OyAvLyBhZGRzIHRyYWlsaW5nIHNsYXNoIGF0IHRoZSBlbmQgb2YgdGhlIHVybCBpZiBpdCBkb2Vzbid0IGV4aXN0XG5cdH0sXG5cblx0Z2V0Um9vdFVybDogZnVuY3Rpb24gZ2V0Um9vdFVybCgpIHtcblx0XHRyZXR1cm4gc3RhdGUuY29uZmlndXJhdGlvbi5yb290VXJsO1xuXHR9LFxuXG5cdGdldEF2YXRhclVwbG9hZFVybDogZnVuY3Rpb24gZ2V0QXZhdGFyVXBsb2FkVXJsKCkge1xuXHRcdHJldHVybiBTdG9yZS5nZXRGdWxsQmFzZVVybCgpICsgJ2Fzc2V0cy91cGxvYWQnO1xuXHR9LFxuXG5cdGdldEF2YXRhclVwZGF0ZVVybDogZnVuY3Rpb24gZ2V0QXZhdGFyVXBkYXRlVXJsKCkge1xuXHRcdHJldHVybiBTdG9yZS5nZXRGdWxsQmFzZVVybCgpICsgJ3VzZXJzL2F2YXRhcic7XG5cdH1cbn07XG5cbm1vZHVsZS5leHBvcnRzID0gU3RvcmU7Il19
