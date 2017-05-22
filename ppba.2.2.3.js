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
 * version: 2.2.3
 * date: 2017-05-22
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
ppba.setHTMLTemplate('<header class="bac--header-apps" id="--puresdk-bac--header-apps--">\n    <div class="bac--container">\n        <div class="bac--logo" id="--puresdk-account-logo--"></div>\n        <div class="bac--user-actions">\n            <div class="bac--user-apps" id="--puresdk-apps-section--">\n                <div id="--puresdk--apps--opener--">\n                    <i class="fa fa-squares" id="--puresdk-apps-icon--"></i>\n                    <div class="--puresdk-apps-name--">apps</div>\n                </div>\n                <div class="bac--apps-container" id="--puresdk-apps-container--">\n                    <div class="bac--apps-arrow"></div>\n                </div>\n            </div>\n            <!--<div class="bac&#45;&#45;user-notifications">-->\n                <!--<div class="bac&#45;&#45;user-notifications-count">1</div>-->\n                <!--<i class="fa fa-bell-o"></i>-->\n            <!--</div>-->\n            <div class="bac--user-avatar" id="bac--user-avatar-top">\n                <span class="bac--user-avatar-name" id="--puresdk-user-avatar--"></span>\n                <div id="bac--image-container-top"></div>\n            </div>\n        </div>\n    </div>\n    <div id="bac--info-blocks-wrapper--"></div>\n</header>\n<div class="bac--user-sidebar" id="--puresdk-user-sidebar--">\n    <div id="--puresdk-user-details--"></div>\n    <!--<div class="bac&#45;&#45;user-sidebar-info">-->\n        <!--<div class="bac&#45;&#45;user-image"><i class="fa fa-camera"></i></div>-->\n        <!--<div class="bac&#45;&#45;user-name">Curtis Bartlett</div>-->\n        <!--<div class="bac&#45;&#45;user-email">cbartlett@pureprofile.com</div>-->\n    <!--</div>-->\n    <div class="bac--user-apps" id="--puresdk-user-businesses--">\n        <!--<div class="bac&#45;&#45;user-list-item">-->\n            <!--<img src="http://lorempixel.com/40/40" alt="">-->\n            <!--<div class="bac-user-app-details">-->\n                <!--<span></span>-->\n                <!--<span>15 team members</span>-->\n            <!--</div>-->\n        <!--</div>-->\n    </div>\n    <div class="bac--user-account-settings">\n        <div class="bac-user-acount-list-item">\n            <i class="fa fa-cog-line"></i>\n            <a href="#">Account Security</a>\n        </div>\n        <div class="bac-user-acount-list-item">\n            <i class="fa fa-login-line"></i>\n            <a href="/api/v1/sign-off">Log out</a>\n        </div>\n    </div>\n</div>\n<input style="display:none" type=\'file\' id=\'---puresdk-avatar-file\'>\n<input style="display:none" type=\'button\' id=\'---puresdk-avatar-submit\' value=\'Upload!\'>');

window.PURESDK = ppba;

var css = 'html,body,div,span,applet,object,iframe,h1,h2,h3,h4,h5,h6,p,blockquote,pre,a,abbr,acronym,address,big,cite,code,del,dfn,em,img,ins,kbd,q,s,samp,small,strike,strong,sub,sup,tt,var,b,u,i,center,dl,dt,dd,ol,ul,li,fieldset,form,label,legend,table,caption,tbody,tfoot,thead,tr,th,td,article,aside,canvas,details,embed,figure,figcaption,footer,header,hgroup,menu,nav,output,ruby,section,summary,time,mark,audio,video{margin:0;padding:0;border:0;font-size:100%;font:inherit;vertical-align:baseline}article,aside,details,figcaption,figure,footer,header,hgroup,menu,nav,section{display:block}body{line-height:1}ol,ul{list-style:none}blockquote,q{quotes:none}blockquote:before,blockquote:after,q:before,q:after{content:"";content:none}table{border-collapse:collapse;border-spacing:0}body{overflow-x:hidden}#bac-wrapper{font-family:"Verdana", arial, sans-serif;color:white;min-height:100vh;position:relative}.bac--container{max-width:1160px;margin:0 auto}.bac--header-apps{position:absolute;width:100%;height:50px;background-color:#475369;padding:5px 0;z-index:9999999}.bac--header-apps .bac--container{height:100%;display:flex;align-items:center;justify-content:space-between}.bac--header-search{position:relative}.bac--header-search input{color:#fff;font-size:14px;height:35px;background-color:#6b7586;padding:0 5px 0 10px;border:none;border-radius:3px;min-width:400px;width:100%}.bac--header-search input:focus{outline:none}.bac--header-search input::-webkit-input-placeholder{font-style:normal !important;text-align:center;color:#fff;font-size:14px;font-weight:300;letter-spacing:0.5px}.bac--header-search input::-moz-placeholder{font-style:normal !important;text-align:center;color:#fff;font-size:14px;font-weight:300;letter-spacing:0.5px}.bac--header-search input:-ms-input-placeholder{font-style:normal !important;text-align:center;color:#fff;font-size:14px;font-weight:300;letter-spacing:0.5px}.bac--header-search i{position:absolute;top:8px;right:10px}.bac--user-actions{display:flex;align-items:center}.bac--user-actions>div{cursor:pointer;color:white}.bac--user-actions .bac--user-notifications{position:relative}.bac--user-actions .bac--user-notifications i{font-size:20px}.bac--user-actions .bac--user-notifications-count{position:absolute;display:inline-block;height:15px;width:15px;line-height:15px;color:#fff;font-size:10px;text-align:center;background-color:#fc3b30;border-radius:50%;top:-5px;left:-5px}.bac--user-actions .bac--user-avatar,.bac--user-actions .bac--user-notifications{margin-left:20px}.bac--user-actions .bac--user-avatar{position:relative;overflow:hidden;border-radius:50%}.bac--user-actions .bac--user-avatar #bac--image-container-top{width:100%;heigth:100%;position:absolute;top:0;left:0;z-index:1;display:none}.bac--user-actions .bac--user-avatar #bac--image-container-top img{width:100%;height:100%}.bac--user-actions .bac--user-avatar #bac--image-container-top.--puresdk-visible{display:block}.bac--user-actions .bac--user-avatar-name{color:#fff;background-color:#adadad;display:inline-block;height:30px;width:30px;line-height:30px;text-align:center;font-size:14px}.bac--user-apps{position:relative}.bac--user-apps #--puresdk-apps-icon--{width:20px;display:inline-block;text-align:center}.bac--user-apps .--puresdk-apps-name--{font-size:8px;width:20px;text-align:center}#--puresdk-user-businesses--{height:calc(100vh - 458px);overflow:auto}.bac--apps-container{background:#fff;position:absolute;top:45px;right:-40px;display:flex;width:360px;flex-wrap:wrap;border-radius:10px;padding:30px;justify-content:space-between;text-align:center;-webkit-box-shadow:0 0 10px 2px rgba(0,0,0,0.2);box-shadow:0 0 10px 2px rgba(0,0,0,0.2);opacity:0;visibility:hidden;transition:all 0.4s ease}.bac--apps-container.active{opacity:1;visibility:visible}.bac--apps-container .bac--apps-arrow{position:absolute;display:block;height:20px;width:20px;top:-10px;right:36px;background:#fff;transform:rotate(-45deg);z-index:1}.bac--apps-container .bac--apps{width:32%;display:flex;font-size:30px;margin-bottom:40px;text-align:center;justify-content:center;flex-wrap:wrap}.bac--apps-container .bac--apps a{display:block;color:#fff;text-decoration:none;width:65px;height:65px;padding-top:3px;line-height:65px;text-align:center;border-radius:10px;-webkit-box-shadow:0 0 5px 0 rgba(0,0,0,0.2);box-shadow:0 0 5px 0 rgba(0,0,0,0.2)}.bac--apps-container .bac--apps .bac--app-name{width:100%;color:#000;font-size:14px;padding:10px 0 5px 0}.bac--apps-container .bac--apps .bac--app-description{color:#919191;font-size:12px;font-style:italic;line-height:1.3em}.bac--user-sidebar{font-family:"Verdana", arial, sans-serif;color:white;background-color:#515f77;box-sizing:border-box;width:320px;height:100%;position:absolute;top:0;right:0;z-index:999999;padding-top:10px;opacity:0;margin-top:50px;transform:translateX(100%);transition:all 0.4s ease}.bac--user-sidebar.active{opacity:1;transform:translateX(0%)}.bac--user-sidebar .bac--user-list-item{display:flex;cursor:pointer;align-items:center;padding:10px 10px 10px 40px;border-bottom:2px solid #6b7586}.bac--user-sidebar .bac--user-list-item:hover{background-color:#6b7586}.bac--user-sidebar .bac--user-list-item img{margin-right:20px;border:2px solid #fff}.bac--user-sidebar .bac--user-list-item span{width:100%;display:block;margin-bottom:5px}.bac--user-sidebar .bac-user-app-details span{font-size:12px}.bac--user-sidebar-info{display:flex;justify-content:center;flex-wrap:wrap;text-align:center;padding:10px 20px 15px}.bac--user-sidebar-info .bac--user-image{border:1px #adadad solid;overflow:hidden;border-radius:50%;position:relative;cursor:pointer;display:inline-block;height:80px;width:80px;line-height:80px;text-align:center;color:#fff;border-radius:50%;background-color:#adadad;margin-bottom:15px}.bac--user-sidebar-info .bac--user-image #bac--user-image-file{display:none;position:absolute;z-index:1;top:0;left:0;width:100%;height:100%}.bac--user-sidebar-info .bac--user-image #bac--user-image-file img{width:100%;height:100%}.bac--user-sidebar-info .bac--user-image #bac--user-image-file.--puresdk-visible{display:block}.bac--user-sidebar-info .bac--user-image #bac--user-image-upload-progress{position:absolute;padding-top:10px;top:0;background:#666;z-index:4;display:none;width:100%;height:100%}.bac--user-sidebar-info .bac--user-image #bac--user-image-upload-progress.--puresdk-visible{display:block}.bac--user-sidebar-info .bac--user-image i{font-size:32px;font-size:32px;z-index:0;position:absolute;width:100%;left:0;background-color:rgba(0,0,0,0.5)}.bac--user-sidebar-info .bac--user-image:hover i{z-index:3}.bac--user-sidebar-info .bac--user-name{width:100%;text-align:center;font-size:18px;margin-bottom:10px}.bac--user-sidebar-info .bac--user-email{font-size:12px;font-weight:300}.bac--user-account-settings{padding:50px}.bac--user-account-settings .bac-user-acount-list-item{display:flex;align-items:center;margin-bottom:30px}.bac--user-account-settings .bac-user-acount-list-item a{text-decoration:none;color:#fff}.bac--user-account-settings .bac-user-acount-list-item i{font-size:24px;margin-right:20px}#--puresdk-account-logo--{cursor:pointer}#bac--info-blocks-wrapper--{position:relative}#bac--info-blocks-wrapper-- .--puresdk-info-box--{border-radius:0 0 3px 3px;overflow:hidden;z-index:99999999;position:fixed;top:-41px;width:470px;left:calc(50vw - 235px);height:40px;-webkit-transition:top 0.4s;transition:top 0.4s}#bac--info-blocks-wrapper-- .--puresdk-info-box--.bac--success{background:#14DA9E}#bac--info-blocks-wrapper-- .--puresdk-info-box--.bac--success .bac--inner-info-box-- div.bac--info-icon--.fa-success{display:inline-block}#bac--info-blocks-wrapper-- .--puresdk-info-box--.bac--info{background-color:#5BC0DE}#bac--info-blocks-wrapper-- .--puresdk-info-box--.bac--info .bac--inner-info-box-- div.bac--info-icon--.fa-info-1{display:inline-block}#bac--info-blocks-wrapper-- .--puresdk-info-box--.bac--warning{background:#F0AD4E}#bac--info-blocks-wrapper-- .--puresdk-info-box--.bac--warning .bac--inner-info-box-- div.bac--info-icon--.fa-warning{display:inline-block}#bac--info-blocks-wrapper-- .--puresdk-info-box--.bac--error{background:#EF4100}#bac--info-blocks-wrapper-- .--puresdk-info-box--.bac--error .bac--inner-info-box-- div.bac--info-icon--.fa-error{display:inline-block}#bac--info-blocks-wrapper-- .--puresdk-info-box-- .bac--timer{-webkit-transition-timing-function:linear;transition-timing-function:linear;position:absolute;bottom:0px;opacity:0.5;height:2px !important;background:white;width:0%}#bac--info-blocks-wrapper-- .--puresdk-info-box-- .bac--timer.bac--fullwidth{width:100%}#bac--info-blocks-wrapper-- .--puresdk-info-box--.bac--active--{top:0px}#bac--info-blocks-wrapper-- .--puresdk-info-box-- .bac--inner-info-box--{width:100%;padding:11px 15px;color:white}#bac--info-blocks-wrapper-- .--puresdk-info-box-- .bac--inner-info-box-- div{display:inline-block;height:18px;position:relative}#bac--info-blocks-wrapper-- .--puresdk-info-box-- .bac--inner-info-box-- div.bac--info-icon--{display:none;top:0px}#bac--info-blocks-wrapper-- .--puresdk-info-box-- .bac--inner-info-box-- .bac--info-icon--{margin-right:15px;width:10px;top:2px}#bac--info-blocks-wrapper-- .--puresdk-info-box-- .bac--inner-info-box-- .bac--info-main-text--{width:380px;margin-right:15px;font-size:12px;text-align:center}#bac--info-blocks-wrapper-- .--puresdk-info-box-- .bac--inner-info-box-- .bac--info-close-button--{width:10px;cursor:pointer;top:2px}',
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
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uLy4uL25vZGVfbW9kdWxlcy9icm93c2VyLXBhY2svX3ByZWx1ZGUuanMiLCJQUEJBLmpzIiwiaW5kZXguanMiLCJtb2R1bGVzL2F2YXRhci1jb250cm9sbGVyLmpzIiwibW9kdWxlcy9jYWxsZXIuanMiLCJtb2R1bGVzL2RvbS5qcyIsIm1vZHVsZXMvaW5mby1jb250cm9sbGVyLmpzIiwibW9kdWxlcy9sb2dnZXIuanMiLCJtb2R1bGVzL3B1YnN1Yi5qcyIsIm1vZHVsZXMvc3RvcmUuanMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7QUNBQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNqUkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDN0NBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUN2SEE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUN2REE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUN0QkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUM5RkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDckJBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNyREE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQSIsImZpbGUiOiJnZW5lcmF0ZWQuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlc0NvbnRlbnQiOlsiKGZ1bmN0aW9uIGUodCxuLHIpe2Z1bmN0aW9uIHMobyx1KXtpZighbltvXSl7aWYoIXRbb10pe3ZhciBhPXR5cGVvZiByZXF1aXJlPT1cImZ1bmN0aW9uXCImJnJlcXVpcmU7aWYoIXUmJmEpcmV0dXJuIGEobywhMCk7aWYoaSlyZXR1cm4gaShvLCEwKTt2YXIgZj1uZXcgRXJyb3IoXCJDYW5ub3QgZmluZCBtb2R1bGUgJ1wiK28rXCInXCIpO3Rocm93IGYuY29kZT1cIk1PRFVMRV9OT1RfRk9VTkRcIixmfXZhciBsPW5bb109e2V4cG9ydHM6e319O3Rbb11bMF0uY2FsbChsLmV4cG9ydHMsZnVuY3Rpb24oZSl7dmFyIG49dFtvXVsxXVtlXTtyZXR1cm4gcyhuP246ZSl9LGwsbC5leHBvcnRzLGUsdCxuLHIpfXJldHVybiBuW29dLmV4cG9ydHN9dmFyIGk9dHlwZW9mIHJlcXVpcmU9PVwiZnVuY3Rpb25cIiYmcmVxdWlyZTtmb3IodmFyIG89MDtvPHIubGVuZ3RoO28rKylzKHJbb10pO3JldHVybiBzfSkiLCJ2YXIgTG9nZ2VyID0gcmVxdWlyZSgnLi9tb2R1bGVzL2xvZ2dlcicpO1xudmFyIFB1YlN1YiA9IHJlcXVpcmUoJy4vbW9kdWxlcy9wdWJzdWInKTtcbnZhciBDYWxsZXIgPSByZXF1aXJlKCcuL21vZHVsZXMvY2FsbGVyJyk7XG52YXIgRG9tID0gcmVxdWlyZSgnLi9tb2R1bGVzL2RvbScpO1xudmFyIEluZm9Db250cm9sbGVyID0gcmVxdWlyZSgnLi9tb2R1bGVzL2luZm8tY29udHJvbGxlcicpO1xudmFyIEF2YXRhckNvbnRyb2xsZXIgPSByZXF1aXJlKCcuL21vZHVsZXMvYXZhdGFyLWNvbnRyb2xsZXInKTtcbnZhciBTdG9yZSA9IHJlcXVpcmUoJy4vbW9kdWxlcy9zdG9yZScpO1xudmFyIHBwYmFDb25mID0ge307XG5cbnZhciBhZnRlclJlbmRlciA9IGZ1bmN0aW9uIGFmdGVyUmVuZGVyKCkge1xuXHRkb2N1bWVudC5nZXRFbGVtZW50QnlJZCgnLS1wdXJlc2RrLS1hcHBzLS1vcGVuZXItLScpLmFkZEV2ZW50TGlzdGVuZXIoJ2NsaWNrJywgZnVuY3Rpb24gKGUpIHtcblx0XHRlLnN0b3BQcm9wYWdhdGlvbigpO1xuXHRcdERvbS50b2dnbGVDbGFzcyhkb2N1bWVudC5nZXRFbGVtZW50QnlJZCgnLS1wdXJlc2RrLWFwcHMtY29udGFpbmVyLS0nKSwgJ2FjdGl2ZScpO1xuXHR9KTtcblxuXHRkb2N1bWVudC5nZXRFbGVtZW50QnlJZCgnYmFjLS11c2VyLWF2YXRhci10b3AnKS5hZGRFdmVudExpc3RlbmVyKCdjbGljaycsIGZ1bmN0aW9uIChlKSB7XG5cdFx0ZS5zdG9wUHJvcGFnYXRpb24oKTtcblx0XHREb20ucmVtb3ZlQ2xhc3MoZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoJy0tcHVyZXNkay1hcHBzLWNvbnRhaW5lci0tJyksICdhY3RpdmUnKTtcblx0XHREb20udG9nZ2xlQ2xhc3MoZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoJy0tcHVyZXNkay11c2VyLXNpZGViYXItLScpLCAnYWN0aXZlJyk7XG5cdH0pO1xuXG5cdHdpbmRvdy5hZGRFdmVudExpc3RlbmVyKCdjbGljaycsIGZ1bmN0aW9uIChlKSB7XG5cdFx0RG9tLnJlbW92ZUNsYXNzKGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKCctLXB1cmVzZGstYXBwcy1jb250YWluZXItLScpLCAnYWN0aXZlJyk7XG5cdFx0RG9tLnJlbW92ZUNsYXNzKGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKCctLXB1cmVzZGstdXNlci1zaWRlYmFyLS0nKSwgJ2FjdGl2ZScpO1xuXHR9KTtcblxuXHRBdmF0YXJDb250cm9sbGVyLmluaXQoKTtcblx0dmFyIHVzZXJEYXRhID0gU3RvcmUuZ2V0VXNlckRhdGEoKTtcblx0QXZhdGFyQ29udHJvbGxlci5zZXRBdmF0YXIodXNlckRhdGEudXNlci5hdmF0YXJfdXJsKTtcblxuXHRJbmZvQ29udHJvbGxlci5pbml0KCk7XG59O1xuXG52YXIgUFBCQSA9IHtcblx0c2V0V2luZG93TmFtZTogZnVuY3Rpb24gc2V0V2luZG93TmFtZSh3bikge1xuXHRcdFN0b3JlLnNldFdpbmRvd05hbWUod24pO1xuXHR9LFxuXG5cdHNldENvbmZpZ3VyYXRpb246IGZ1bmN0aW9uIHNldENvbmZpZ3VyYXRpb24oY29uZikge1xuXHRcdFN0b3JlLnNldENvbmZpZ3VyYXRpb24oY29uZik7XG5cdH0sXG5cblx0c2V0SFRNTFRlbXBsYXRlOiBmdW5jdGlvbiBzZXRIVE1MVGVtcGxhdGUodGVtcGxhdGUpIHtcblx0XHRTdG9yZS5zZXRIVE1MVGVtcGxhdGUodGVtcGxhdGUpO1xuXHR9LFxuXG5cdGluaXQ6IGZ1bmN0aW9uIGluaXQoY29uZikge1xuXHRcdExvZ2dlci5sb2coJ2luaXRpYWxpemluZyB3aXRoIGNvbmY6ICcsIGNvbmYpO1xuXHRcdGlmIChjb25mKSB7XG5cdFx0XHRpZiAoY29uZi5oZWFkZXJEaXZJZCkge1xuXHRcdFx0XHRTdG9yZS5zZXRIVE1MQ29udGFpbmVyKGNvbmYuaGVhZGVyRGl2SWQpO1xuXHRcdFx0fVxuXHRcdFx0aWYgKGNvbmYuYXBwc1Zpc2libGUgIT09IG51bGwpIHtcblx0XHRcdFx0U3RvcmUuc2V0QXBwc1Zpc2libGUoY29uZi5hcHBzVmlzaWJsZSk7XG5cdFx0XHR9XG5cdFx0XHRpZiAoY29uZi5yb290VXJsKSB7XG5cdFx0XHRcdFN0b3JlLnNldFJvb3RVcmwoY29uZi5yb290VXJsKTtcblx0XHRcdH1cblx0XHR9XG5cdFx0cHBiYUNvbmYgPSBjb25mO1xuXHRcdHJldHVybiB0cnVlO1xuXHR9LFxuXG5cdGF1dGhlbnRpY2F0ZTogZnVuY3Rpb24gYXV0aGVudGljYXRlKF9zdWNjZXNzKSB7XG5cdFx0dmFyIHNlbGYgPSBQUEJBO1xuXHRcdENhbGxlci5tYWtlQ2FsbCh7XG5cdFx0XHR0eXBlOiAnR0VUJyxcblx0XHRcdGVuZHBvaW50OiBTdG9yZS5nZXRBdXRoZW50aWNhdGlvbkVuZHBvaW50KCksXG5cdFx0XHRjYWxsYmFja3M6IHtcblx0XHRcdFx0c3VjY2VzczogZnVuY3Rpb24gc3VjY2VzcyhyZXN1bHQpIHtcblx0XHRcdFx0XHRMb2dnZXIubG9nKHJlc3VsdCk7XG5cdFx0XHRcdFx0U3RvcmUuc2V0VXNlckRhdGEocmVzdWx0KTtcblx0XHRcdFx0XHRzZWxmLnJlbmRlcigpO1xuXHRcdFx0XHRcdFBQQkEuZ2V0QXBwcygpO1xuXHRcdFx0XHRcdF9zdWNjZXNzKHJlc3VsdCk7XG5cdFx0XHRcdH0sXG5cdFx0XHRcdGZhaWw6IGZ1bmN0aW9uIGZhaWwoZXJyKSB7XG5cdFx0XHRcdFx0d2luZG93LmxvY2F0aW9uLmhyZWYgPSBTdG9yZS5nZXRMb2dpblVybCgpO1xuXHRcdFx0XHR9XG5cdFx0XHR9XG5cdFx0fSk7XG5cdH0sXG5cblx0YXV0aGVudGljYXRlUHJvbWlzZTogZnVuY3Rpb24gYXV0aGVudGljYXRlUHJvbWlzZSgpIHtcblx0XHR2YXIgc2VsZiA9IFBQQkE7XG5cdFx0cmV0dXJuIENhbGxlci5wcm9taXNlQ2FsbCh7XG5cdFx0XHR0eXBlOiAnR0VUJyxcblx0XHRcdGVuZHBvaW50OiBTdG9yZS5nZXRBdXRoZW50aWNhdGlvbkVuZHBvaW50KCksXG5cdFx0XHRtaWRkbGV3YXJlczoge1xuXHRcdFx0XHRzdWNjZXNzOiBmdW5jdGlvbiBzdWNjZXNzKHJlc3VsdCkge1xuXHRcdFx0XHRcdExvZ2dlci5sb2cocmVzdWx0KTtcblx0XHRcdFx0XHRTdG9yZS5zZXRVc2VyRGF0YShyZXN1bHQpO1xuXHRcdFx0XHRcdHNlbGYucmVuZGVyKCk7XG5cdFx0XHRcdFx0UFBCQS5nZXRBcHBzKCk7XG5cdFx0XHRcdH1cblx0XHRcdH1cblx0XHR9KTtcblx0fSxcblxuXHRnZXRBcHBzOiBmdW5jdGlvbiBnZXRBcHBzKCkge1xuXHRcdENhbGxlci5tYWtlQ2FsbCh7XG5cdFx0XHR0eXBlOiAnR0VUJyxcblx0XHRcdGVuZHBvaW50OiBTdG9yZS5nZXRBcHBzRW5kcG9pbnQoKSxcblx0XHRcdGNhbGxiYWNrczoge1xuXHRcdFx0XHRzdWNjZXNzOiBmdW5jdGlvbiBzdWNjZXNzKHJlc3VsdCkge1xuXHRcdFx0XHRcdFN0b3JlLnNldEFwcHMocmVzdWx0KTtcblx0XHRcdFx0XHRQUEJBLnJlbmRlckFwcHMocmVzdWx0LmFwcHMpO1xuXHRcdFx0XHR9LFxuXHRcdFx0XHRmYWlsOiBmdW5jdGlvbiBmYWlsKGVycikge1xuXHRcdFx0XHRcdHdpbmRvdy5sb2NhdGlvbi5ocmVmID0gU3RvcmUuZ2V0TG9naW5VcmwoKTtcblx0XHRcdFx0fVxuXHRcdFx0fVxuXHRcdH0pO1xuXHR9LFxuXG5cdGdldEF2YWlsYWJsZUxpc3RlbmVyczogZnVuY3Rpb24gZ2V0QXZhaWxhYmxlTGlzdGVuZXJzKCkge1xuXHRcdHJldHVybiBQdWJTdWIuZ2V0QXZhaWxhYmxlTGlzdGVuZXJzKCk7XG5cdH0sXG5cblx0c3Vic2NyaWJlTGlzdGVuZXI6IGZ1bmN0aW9uIHN1YnNjcmliZUxpc3RlbmVyKGV2ZW50dCwgZnVuY3QpIHtcblx0XHRyZXR1cm4gUHViU3ViLnN1YnNjcmliZShldmVudHQsIGZ1bmN0KTtcblx0fSxcblxuXHRnZXRVc2VyRGF0YTogZnVuY3Rpb24gZ2V0VXNlckRhdGEoKSB7XG5cdFx0cmV0dXJuIFN0b3JlLmdldFVzZXJEYXRhKCk7XG5cdH0sXG5cblx0c2V0SW5wdXRQbGFjZWhvbGRlcjogZnVuY3Rpb24gc2V0SW5wdXRQbGFjZWhvbGRlcih0eHQpIHtcblx0XHQvLyBkb2N1bWVudC5nZXRFbGVtZW50QnlJZChTdG9yZS5nZXRTZWFyY2hJbnB1dElkKCkpLnBsYWNlaG9sZGVyID0gdHh0O1xuXHR9LFxuXG5cdGNoYW5nZUFjY291bnQ6IGZ1bmN0aW9uIGNoYW5nZUFjY291bnQoYWNjb3VudElkKSB7XG5cdFx0Q2FsbGVyLm1ha2VDYWxsKHtcblx0XHRcdHR5cGU6ICdHRVQnLFxuXHRcdFx0ZW5kcG9pbnQ6IFN0b3JlLmdldFN3aXRjaEFjY291bnRFbmRwb2ludChhY2NvdW50SWQpLFxuXHRcdFx0Y2FsbGJhY2tzOiB7XG5cdFx0XHRcdHN1Y2Nlc3M6IGZ1bmN0aW9uIHN1Y2Nlc3MocmVzdWx0KSB7XG5cdFx0XHRcdFx0d2luZG93LmxvY2F0aW9uLmhyZWYgPSAnL2FwcHMnO1xuXHRcdFx0XHR9LFxuXHRcdFx0XHRmYWlsOiBmdW5jdGlvbiBmYWlsKGVycikge1xuXHRcdFx0XHRcdGFsZXJ0KCdTb3JyeSwgc29tZXRoaW5nIHdlbnQgd3Jvbmcgd2l0aCB5b3VyIHJlcXVlc3QuIFBsZXNlIHRyeSBhZ2FpbicpO1xuXHRcdFx0XHR9XG5cdFx0XHR9XG5cdFx0fSk7XG5cdH0sXG5cblx0cmVuZGVyQXBwczogZnVuY3Rpb24gcmVuZGVyQXBwcyhhcHBzKSB7XG5cdFx0dmFyIGFwcFRlbXBsYXRlID0gZnVuY3Rpb24gYXBwVGVtcGxhdGUoYXBwKSB7XG5cdFx0XHRyZXR1cm4gJ1xcblxcdFxcdFxcdFxcdDxhIGhyZWY9XCIjXCIgc3R5bGU9XCJiYWNrZ3JvdW5kOiAjJyArIGFwcC5jb2xvciArICdcIj48aSBjbGFzcz1cIicgKyBhcHAuaWNvbiArICdcIj48L2k+PC9hPlxcblxcdFxcdFxcdFxcdDxzcGFuIGNsYXNzPVwiYmFjLS1hcHAtbmFtZVwiPicgKyBhcHAubmFtZSArICc8L3NwYW4+XFxuXFx0XFx0XFx0XFx0PHNwYW4gY2xhc3M9XCJiYWMtLWFwcC1kZXNjcmlwdGlvblwiPicgKyBhcHAuZGVzY3IgKyAnPC9zcGFuPlxcblxcdFxcdFxcdCc7XG5cdFx0fTtcblxuXHRcdHZhciBfbG9vcCA9IGZ1bmN0aW9uIF9sb29wKGkpIHtcblx0XHRcdHZhciBhcHAgPSBhcHBzW2ldO1xuXHRcdFx0dmFyIGRpdiA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoXCJkaXZcIik7XG5cdFx0XHRkaXYuY2xhc3NOYW1lID0gXCJiYWMtLWFwcHNcIjtcblx0XHRcdGRpdi5pbm5lckhUTUwgPSBhcHBUZW1wbGF0ZShhcHApO1xuXHRcdFx0ZGl2Lm9uY2xpY2sgPSBmdW5jdGlvbiAoZSkge1xuXHRcdFx0XHRlLnByZXZlbnREZWZhdWx0KCk7XG5cdFx0XHRcdHdpbmRvdy5sb2NhdGlvbi5ocmVmID0gYXBwLmFwcGxpY2F0aW9uX3VybDtcblx0XHRcdH07XG5cdFx0XHRkb2N1bWVudC5nZXRFbGVtZW50QnlJZChcIi0tcHVyZXNkay1hcHBzLWNvbnRhaW5lci0tXCIpLmFwcGVuZENoaWxkKGRpdik7XG5cdFx0fTtcblxuXHRcdGZvciAodmFyIGkgPSAwOyBpIDwgYXBwcy5sZW5ndGg7IGkrKykge1xuXHRcdFx0X2xvb3AoaSk7XG5cdFx0fVxuXHR9LFxuXG5cdHJlbmRlclVzZXI6IGZ1bmN0aW9uIHJlbmRlclVzZXIodXNlcikge1xuXHRcdHZhciB1c2VyVGVtcGxhdGUgPSBmdW5jdGlvbiB1c2VyVGVtcGxhdGUodXNlcikge1xuXHRcdFx0cmV0dXJuICdcXG5cXHRcXHRcXHRcXHQ8ZGl2IGNsYXNzPVwiYmFjLS11c2VyLWltYWdlXCIgaWQ9XCJiYWMtLXVzZXItaW1hZ2VcIj5cXG5cXHRcXHRcXHRcXHRcXHQ8aSBjbGFzcz1cImZhIGZhLWNhbWVyYVwiPjwvaT5cXG5cXHRcXHRcXHQgICBcXHQ8ZGl2IGlkPVwiYmFjLS11c2VyLWltYWdlLWZpbGVcIj48L2Rpdj5cXG5cXHRcXHRcXHQgICBcXHQ8ZGl2IGlkPVwiYmFjLS11c2VyLWltYWdlLXVwbG9hZC1wcm9ncmVzc1wiPlxcblxcdFxcdFxcdCAgIFxcdFxcdDxzdmcgd2lkdGg9XFwnNjBweFxcJyBoZWlnaHQ9XFwnNjBweFxcJyB4bWxucz1cImh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnXCIgdmlld0JveD1cIjAgMCAxMDAgMTAwXCIgcHJlc2VydmVBc3BlY3RSYXRpbz1cInhNaWRZTWlkXCIgY2xhc3M9XCJ1aWwtZGVmYXVsdFwiPjxyZWN0IHg9XCIwXCIgeT1cIjBcIiB3aWR0aD1cIjEwMFwiIGhlaWdodD1cIjEwMFwiIGZpbGw9XCJub25lXCIgY2xhc3M9XCJia1wiPjwvcmVjdD48cmVjdCAgeD1cXCc0Ni41XFwnIHk9XFwnNDBcXCcgd2lkdGg9XFwnN1xcJyBoZWlnaHQ9XFwnMjBcXCcgcng9XFwnNVxcJyByeT1cXCc1XFwnIGZpbGw9XFwnI2ZmZmZmZlxcJyB0cmFuc2Zvcm09XFwncm90YXRlKDAgNTAgNTApIHRyYW5zbGF0ZSgwIC0zMClcXCc+ICA8YW5pbWF0ZSBhdHRyaWJ1dGVOYW1lPVxcJ29wYWNpdHlcXCcgZnJvbT1cXCcxXFwnIHRvPVxcJzBcXCcgZHVyPVxcJzFzXFwnIGJlZ2luPVxcJy0xc1xcJyByZXBlYXRDb3VudD1cXCdpbmRlZmluaXRlXFwnLz48L3JlY3Q+PHJlY3QgIHg9XFwnNDYuNVxcJyB5PVxcJzQwXFwnIHdpZHRoPVxcJzdcXCcgaGVpZ2h0PVxcJzIwXFwnIHJ4PVxcJzVcXCcgcnk9XFwnNVxcJyBmaWxsPVxcJyNmZmZmZmZcXCcgdHJhbnNmb3JtPVxcJ3JvdGF0ZSgzMCA1MCA1MCkgdHJhbnNsYXRlKDAgLTMwKVxcJz4gIDxhbmltYXRlIGF0dHJpYnV0ZU5hbWU9XFwnb3BhY2l0eVxcJyBmcm9tPVxcJzFcXCcgdG89XFwnMFxcJyBkdXI9XFwnMXNcXCcgYmVnaW49XFwnLTAuOTE2NjY2NjY2NjY2NjY2NnNcXCcgcmVwZWF0Q291bnQ9XFwnaW5kZWZpbml0ZVxcJy8+PC9yZWN0PjxyZWN0ICB4PVxcJzQ2LjVcXCcgeT1cXCc0MFxcJyB3aWR0aD1cXCc3XFwnIGhlaWdodD1cXCcyMFxcJyByeD1cXCc1XFwnIHJ5PVxcJzVcXCcgZmlsbD1cXCcjZmZmZmZmXFwnIHRyYW5zZm9ybT1cXCdyb3RhdGUoNjAgNTAgNTApIHRyYW5zbGF0ZSgwIC0zMClcXCc+ICA8YW5pbWF0ZSBhdHRyaWJ1dGVOYW1lPVxcJ29wYWNpdHlcXCcgZnJvbT1cXCcxXFwnIHRvPVxcJzBcXCcgZHVyPVxcJzFzXFwnIGJlZ2luPVxcJy0wLjgzMzMzMzMzMzMzMzMzMzRzXFwnIHJlcGVhdENvdW50PVxcJ2luZGVmaW5pdGVcXCcvPjwvcmVjdD48cmVjdCAgeD1cXCc0Ni41XFwnIHk9XFwnNDBcXCcgd2lkdGg9XFwnN1xcJyBoZWlnaHQ9XFwnMjBcXCcgcng9XFwnNVxcJyByeT1cXCc1XFwnIGZpbGw9XFwnI2ZmZmZmZlxcJyB0cmFuc2Zvcm09XFwncm90YXRlKDkwIDUwIDUwKSB0cmFuc2xhdGUoMCAtMzApXFwnPiAgPGFuaW1hdGUgYXR0cmlidXRlTmFtZT1cXCdvcGFjaXR5XFwnIGZyb209XFwnMVxcJyB0bz1cXCcwXFwnIGR1cj1cXCcxc1xcJyBiZWdpbj1cXCctMC43NXNcXCcgcmVwZWF0Q291bnQ9XFwnaW5kZWZpbml0ZVxcJy8+PC9yZWN0PjxyZWN0ICB4PVxcJzQ2LjVcXCcgeT1cXCc0MFxcJyB3aWR0aD1cXCc3XFwnIGhlaWdodD1cXCcyMFxcJyByeD1cXCc1XFwnIHJ5PVxcJzVcXCcgZmlsbD1cXCcjZmZmZmZmXFwnIHRyYW5zZm9ybT1cXCdyb3RhdGUoMTIwIDUwIDUwKSB0cmFuc2xhdGUoMCAtMzApXFwnPiAgPGFuaW1hdGUgYXR0cmlidXRlTmFtZT1cXCdvcGFjaXR5XFwnIGZyb209XFwnMVxcJyB0bz1cXCcwXFwnIGR1cj1cXCcxc1xcJyBiZWdpbj1cXCctMC42NjY2NjY2NjY2NjY2NjY2c1xcJyByZXBlYXRDb3VudD1cXCdpbmRlZmluaXRlXFwnLz48L3JlY3Q+PHJlY3QgIHg9XFwnNDYuNVxcJyB5PVxcJzQwXFwnIHdpZHRoPVxcJzdcXCcgaGVpZ2h0PVxcJzIwXFwnIHJ4PVxcJzVcXCcgcnk9XFwnNVxcJyBmaWxsPVxcJyNmZmZmZmZcXCcgdHJhbnNmb3JtPVxcJ3JvdGF0ZSgxNTAgNTAgNTApIHRyYW5zbGF0ZSgwIC0zMClcXCc+ICA8YW5pbWF0ZSBhdHRyaWJ1dGVOYW1lPVxcJ29wYWNpdHlcXCcgZnJvbT1cXCcxXFwnIHRvPVxcJzBcXCcgZHVyPVxcJzFzXFwnIGJlZ2luPVxcJy0wLjU4MzMzMzMzMzMzMzMzMzRzXFwnIHJlcGVhdENvdW50PVxcJ2luZGVmaW5pdGVcXCcvPjwvcmVjdD48cmVjdCAgeD1cXCc0Ni41XFwnIHk9XFwnNDBcXCcgd2lkdGg9XFwnN1xcJyBoZWlnaHQ9XFwnMjBcXCcgcng9XFwnNVxcJyByeT1cXCc1XFwnIGZpbGw9XFwnI2ZmZmZmZlxcJyB0cmFuc2Zvcm09XFwncm90YXRlKDE4MCA1MCA1MCkgdHJhbnNsYXRlKDAgLTMwKVxcJz4gIDxhbmltYXRlIGF0dHJpYnV0ZU5hbWU9XFwnb3BhY2l0eVxcJyBmcm9tPVxcJzFcXCcgdG89XFwnMFxcJyBkdXI9XFwnMXNcXCcgYmVnaW49XFwnLTAuNXNcXCcgcmVwZWF0Q291bnQ9XFwnaW5kZWZpbml0ZVxcJy8+PC9yZWN0PjxyZWN0ICB4PVxcJzQ2LjVcXCcgeT1cXCc0MFxcJyB3aWR0aD1cXCc3XFwnIGhlaWdodD1cXCcyMFxcJyByeD1cXCc1XFwnIHJ5PVxcJzVcXCcgZmlsbD1cXCcjZmZmZmZmXFwnIHRyYW5zZm9ybT1cXCdyb3RhdGUoMjEwIDUwIDUwKSB0cmFuc2xhdGUoMCAtMzApXFwnPiAgPGFuaW1hdGUgYXR0cmlidXRlTmFtZT1cXCdvcGFjaXR5XFwnIGZyb209XFwnMVxcJyB0bz1cXCcwXFwnIGR1cj1cXCcxc1xcJyBiZWdpbj1cXCctMC40MTY2NjY2NjY2NjY2NjY3c1xcJyByZXBlYXRDb3VudD1cXCdpbmRlZmluaXRlXFwnLz48L3JlY3Q+PHJlY3QgIHg9XFwnNDYuNVxcJyB5PVxcJzQwXFwnIHdpZHRoPVxcJzdcXCcgaGVpZ2h0PVxcJzIwXFwnIHJ4PVxcJzVcXCcgcnk9XFwnNVxcJyBmaWxsPVxcJyNmZmZmZmZcXCcgdHJhbnNmb3JtPVxcJ3JvdGF0ZSgyNDAgNTAgNTApIHRyYW5zbGF0ZSgwIC0zMClcXCc+ICA8YW5pbWF0ZSBhdHRyaWJ1dGVOYW1lPVxcJ29wYWNpdHlcXCcgZnJvbT1cXCcxXFwnIHRvPVxcJzBcXCcgZHVyPVxcJzFzXFwnIGJlZ2luPVxcJy0wLjMzMzMzMzMzMzMzMzMzMzNzXFwnIHJlcGVhdENvdW50PVxcJ2luZGVmaW5pdGVcXCcvPjwvcmVjdD48cmVjdCAgeD1cXCc0Ni41XFwnIHk9XFwnNDBcXCcgd2lkdGg9XFwnN1xcJyBoZWlnaHQ9XFwnMjBcXCcgcng9XFwnNVxcJyByeT1cXCc1XFwnIGZpbGw9XFwnI2ZmZmZmZlxcJyB0cmFuc2Zvcm09XFwncm90YXRlKDI3MCA1MCA1MCkgdHJhbnNsYXRlKDAgLTMwKVxcJz4gIDxhbmltYXRlIGF0dHJpYnV0ZU5hbWU9XFwnb3BhY2l0eVxcJyBmcm9tPVxcJzFcXCcgdG89XFwnMFxcJyBkdXI9XFwnMXNcXCcgYmVnaW49XFwnLTAuMjVzXFwnIHJlcGVhdENvdW50PVxcJ2luZGVmaW5pdGVcXCcvPjwvcmVjdD48cmVjdCAgeD1cXCc0Ni41XFwnIHk9XFwnNDBcXCcgd2lkdGg9XFwnN1xcJyBoZWlnaHQ9XFwnMjBcXCcgcng9XFwnNVxcJyByeT1cXCc1XFwnIGZpbGw9XFwnI2ZmZmZmZlxcJyB0cmFuc2Zvcm09XFwncm90YXRlKDMwMCA1MCA1MCkgdHJhbnNsYXRlKDAgLTMwKVxcJz4gIDxhbmltYXRlIGF0dHJpYnV0ZU5hbWU9XFwnb3BhY2l0eVxcJyBmcm9tPVxcJzFcXCcgdG89XFwnMFxcJyBkdXI9XFwnMXNcXCcgYmVnaW49XFwnLTAuMTY2NjY2NjY2NjY2NjY2NjZzXFwnIHJlcGVhdENvdW50PVxcJ2luZGVmaW5pdGVcXCcvPjwvcmVjdD48cmVjdCAgeD1cXCc0Ni41XFwnIHk9XFwnNDBcXCcgd2lkdGg9XFwnN1xcJyBoZWlnaHQ9XFwnMjBcXCcgcng9XFwnNVxcJyByeT1cXCc1XFwnIGZpbGw9XFwnI2ZmZmZmZlxcJyB0cmFuc2Zvcm09XFwncm90YXRlKDMzMCA1MCA1MCkgdHJhbnNsYXRlKDAgLTMwKVxcJz4gIDxhbmltYXRlIGF0dHJpYnV0ZU5hbWU9XFwnb3BhY2l0eVxcJyBmcm9tPVxcJzFcXCcgdG89XFwnMFxcJyBkdXI9XFwnMXNcXCcgYmVnaW49XFwnLTAuMDgzMzMzMzMzMzMzMzMzMzNzXFwnIHJlcGVhdENvdW50PVxcJ2luZGVmaW5pdGVcXCcvPjwvcmVjdD48L3N2Zz5cXHRcXG5cXHRcXHRcXHRcXHRcXHQ8L2Rpdj5cXG5cXHRcXHRcXHQgICA8L2Rpdj5cXG5cXHRcXHRcXHRcXHQ8ZGl2IGNsYXNzPVwiYmFjLS11c2VyLW5hbWVcIj4nICsgdXNlci5maXJzdG5hbWUgKyAnICcgKyB1c2VyLmxhc3RuYW1lICsgJzwvZGl2PlxcblxcdFxcdFxcdFxcdDxkaXYgY2xhc3M9XCJiYWMtLXVzZXItZW1haWxcIj4nICsgdXNlci5lbWFpbCArICc8L2Rpdj5cXG5cXHRcXHRcXHQnO1xuXHRcdH07XG5cdFx0dmFyIGRpdiA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoJ2RpdicpO1xuXHRcdGRpdi5jbGFzc05hbWUgPSBcImJhYy0tdXNlci1zaWRlYmFyLWluZm9cIjtcblx0XHRkaXYuaW5uZXJIVE1MID0gdXNlclRlbXBsYXRlKHVzZXIpO1xuXHRcdGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKCctLXB1cmVzZGstdXNlci1kZXRhaWxzLS0nKS5hcHBlbmRDaGlsZChkaXYpO1xuXHRcdGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKCctLXB1cmVzZGstdXNlci1hdmF0YXItLScpLmlubmVySFRNTCA9IHVzZXIuZmlyc3RuYW1lLmNoYXJBdCgwKSArIHVzZXIubGFzdG5hbWUuY2hhckF0KDApO1xuXHR9LFxuXG5cdHJlbmRlckFjY291bnRzOiBmdW5jdGlvbiByZW5kZXJBY2NvdW50cyhhY2NvdW50cykge1xuXHRcdHZhciBhY2NvdW50c1RlbXBsYXRlID0gZnVuY3Rpb24gYWNjb3VudHNUZW1wbGF0ZShhY2NvdW50KSB7XG5cdFx0XHRyZXR1cm4gJ1xcblxcdFxcdFxcdFxcdDxpbWcgc3JjPVwiJyArIGFjY291bnQuc2RrX3NxdWFyZV9sb2dvX2ljb24gKyAnXCIgYWx0PVwiXCI+XFxuXFx0XFx0XFx0XFx0PGRpdiBjbGFzcz1cImJhYy11c2VyLWFwcC1kZXRhaWxzXCI+XFxuXFx0XFx0XFx0XFx0XFx0IDxzcGFuPicgKyBhY2NvdW50Lm5hbWUgKyAnPC9zcGFuPlxcblxcdFxcdFxcdFxcdFxcdCA8c3Bhbj4xNSB0ZWFtIG1lbWJlcnM8L3NwYW4+XFxuXFx0XFx0XFx0XFx0PC9kaXY+XFxuXFx0XFx0XFx0Jztcblx0XHR9O1xuXG5cdFx0dmFyIF9sb29wMiA9IGZ1bmN0aW9uIF9sb29wMihpKSB7XG5cdFx0XHR2YXIgYWNjb3VudCA9IGFjY291bnRzW2ldO1xuXHRcdFx0dmFyIGRpdiA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoJ2RpdicpO1xuXHRcdFx0ZGl2LmNsYXNzTmFtZSA9ICdiYWMtLXVzZXItbGlzdC1pdGVtJztcblx0XHRcdGRpdi5pbm5lckhUTUwgPSBhY2NvdW50c1RlbXBsYXRlKGFjY291bnQpO1xuXHRcdFx0ZGl2Lm9uY2xpY2sgPSBmdW5jdGlvbiAoZSkge1xuXHRcdFx0XHRlLnByZXZlbnREZWZhdWx0KCk7XG5cdFx0XHRcdFBQQkEuY2hhbmdlQWNjb3VudChhY2NvdW50LnNmaWQpO1xuXHRcdFx0fTtcblx0XHRcdGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKCctLXB1cmVzZGstdXNlci1idXNpbmVzc2VzLS0nKS5hcHBlbmRDaGlsZChkaXYpO1xuXHRcdH07XG5cblx0XHRmb3IgKHZhciBpID0gMDsgaSA8IGFjY291bnRzLmxlbmd0aDsgaSsrKSB7XG5cdFx0XHRfbG9vcDIoaSk7XG5cdFx0fVxuXHR9LFxuXG5cdHJlbmRlckluZm9CbG9ja3M6IGZ1bmN0aW9uIHJlbmRlckluZm9CbG9ja3MoKSB7XG5cdFx0dmFyIGJsb2Nrc1RlbXBsYXRlID0gZnVuY3Rpb24gYmxvY2tzVGVtcGxhdGUoaW5kZXgpIHtcblx0XHRcdHJldHVybiAnXFxuXFx0XFx0XFx0XFx0IDxkaXYgY2xhc3M9XCItLXB1cmVzZGstaW5mby1ib3gtLVwiIGlkPVwiLS1wdXJlc2RrLWluZm8tYm94LS0nICsgaW5kZXggKyAnXCI+XFxuXFx0XFx0XFx0XFx0IFxcdDxkaXYgY2xhc3M9XCJiYWMtLXRpbWVyXCIgaWQ9XCJiYWMtLXRpbWVyJyArIGluZGV4ICsgJ1wiPjwvZGl2PlxcblxcdFxcdFxcdFxcdFxcdCA8ZGl2IGNsYXNzPVwiYmFjLS1pbm5lci1pbmZvLWJveC0tXCI+XFxuXFx0XFx0XFx0XFx0XFx0IFxcdFxcdDxkaXYgY2xhc3M9XCJiYWMtLWluZm8taWNvbi0tIGZhLXN1Y2Nlc3NcIj48L2Rpdj5cXG5cXHRcXHRcXHRcXHRcXHQgXFx0XFx0PGRpdiBjbGFzcz1cImJhYy0taW5mby1pY29uLS0gZmEtd2FybmluZ1wiPjwvZGl2PlxcblxcdFxcdFxcdFxcdFxcdCBcXHRcXHQ8ZGl2IGNsYXNzPVwiYmFjLS1pbmZvLWljb24tLSBmYS1pbmZvLTFcIj48L2Rpdj5cXG5cXHRcXHRcXHRcXHRcXHQgXFx0XFx0PGRpdiBjbGFzcz1cImJhYy0taW5mby1pY29uLS0gZmEtZXJyb3JcIj48L2Rpdj5cXG5cXHRcXHRcXHRcXHRcXHQgXFx0XFx0IDxkaXYgY2xhc3M9XCJiYWMtLWluZm8tbWFpbi10ZXh0LS1cIiBpZD1cImJhYy0taW5mby1tYWluLXRleHQtLScgKyBpbmRleCArICdcIj48L2Rpdj5cXG5cXHRcXHRcXHRcXHRcXHQgXFx0XFx0IDxkaXYgY2xhc3M9XCJiYWMtLWluZm8tY2xvc2UtYnV0dG9uLS0gZmEtY2xvc2UtMVwiIGlkPVwiYmFjLS1pbmZvLWNsb3NlLWJ1dHRvbi0tJyArIGluZGV4ICsgJ1wiPjwvZGl2PlxcblxcdFxcdFxcdFxcdFxcdDwvZGl2PlxcblxcdFxcdFxcdFxcdDwvZGl2PlxcblxcdFxcdCAgJztcblx0XHR9O1xuXG5cdFx0dmFyIGluZm9CbG9ja3NXcmFwcGVyID0gZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoJ2JhYy0taW5mby1ibG9ja3Mtd3JhcHBlci0tJyk7XG5cdFx0dmFyIGlubmVySHRtbCA9ICcnO1xuXHRcdGZvciAodmFyIGkgPSAxOyBpIDwgNTsgaSsrKSB7XG5cdFx0XHRpbm5lckh0bWwgKz0gYmxvY2tzVGVtcGxhdGUoaSk7XG5cdFx0fVxuXG5cdFx0aW5mb0Jsb2Nrc1dyYXBwZXIuaW5uZXJIVE1MID0gaW5uZXJIdG1sO1xuXHR9LFxuXG5cdHN0eWxlQWNjb3VudDogZnVuY3Rpb24gc3R5bGVBY2NvdW50KGFjY291bnQpIHtcblx0XHR2YXIgbG9nbyA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoJ2ltZycpO1xuXHRcdGxvZ28uc3JjID0gYWNjb3VudC5zZGtfbG9nb19pY29uO1xuXHRcdGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKCctLXB1cmVzZGstYWNjb3VudC1sb2dvLS0nKS5hcHBlbmRDaGlsZChsb2dvKTtcblx0XHRkb2N1bWVudC5nZXRFbGVtZW50QnlJZCgnLS1wdXJlc2RrLWJhYy0taGVhZGVyLWFwcHMtLScpLnN0eWxlLmNzc1RleHQgPSBcImJhY2tncm91bmQ6ICNcIiArIGFjY291bnQuc2RrX2JhY2tncm91bmRfY29sb3IgKyBcIjsgY29sb3I6ICNcIiArIGFjY291bnQuc2RrX2ZvbnRfY29sb3I7XG5cdFx0ZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoJy0tcHVyZXNkay11c2VyLXNpZGViYXItLScpLnN0eWxlLmNzc1RleHQgPSBcImJhY2tncm91bmQ6ICNcIiArIGFjY291bnQuc2RrX2JhY2tncm91bmRfY29sb3IgKyBcIjsgY29sb3I6ICNcIiArIGFjY291bnQuc2RrX2ZvbnRfY29sb3I7XG5cdFx0ZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoJy0tcHVyZXNkay1hY2NvdW50LWxvZ28tLScpLm9uY2xpY2sgPSBmdW5jdGlvbiAoZSkge1xuXHRcdFx0d2luZG93LmxvY2F0aW9uLmhyZWYgPSAnLyc7XG5cdFx0fTtcblx0XHQvLyBkb2N1bWVudC5nZXRFbGVtZW50QnlJZCgnLS1wdXJlc2RrLS1zZWFyY2gtLWlucHV0LS0nKS5zdHlsZS5jc3NUZXh0ID0gXCJiYWNrZ3JvdW5kOiAjXCIgKyBhY2NvdW50LnNka19zZWFyY2hfYmFja2dyb3VuZF9jb2xvclxuXHRcdC8vICAgKyBcIjsgY29sb3I6ICNcIiArIGFjY291bnQuc2RrX3NlYXJjaF9mb250X2NvbG9yO1xuXHR9LFxuXG5cdGdvVG9Mb2dpblBhZ2U6IGZ1bmN0aW9uIGdvVG9Mb2dpblBhZ2UoKSB7XG5cdFx0d2luZG93LmxvY2F0aW9uLmhyZWYgPSBTdG9yZS5nZXRMb2dpblVybCgpO1xuXHR9LFxuXG5cdC8qXG4gIHR5cGU6IG9uZSBvZjpcbiAgLSBzdWNjZXNzXG4gIC0gaW5mb1xuICAtIHdhcm5pbmdcbiAgLSBlcnJvclxuICB0ZXh0OiB0aGUgdGV4dCB0byBkaXNwbGF5XG4gIG9wdGlvbnMgKG9wdGlvbmFsKToge1xuICBcdFx0aGlkZUluOiBtaWxsaXNlY29uZHMgdG8gaGlkZSBpdC4gLTEgZm9yIG5vdCBoaWRpbmcgaXQgYXQgYWxsLiBEZWZhdWx0IGlzIDUwMDBcbiAgfVxuICAqL1xuXHRzZXRJbmZvOiBmdW5jdGlvbiBzZXRJbmZvKHR5cGUsIHRleHQsIG9wdGlvbnMpIHtcblx0XHRJbmZvQ29udHJvbGxlci5zaG93SW5mbyh0eXBlLCB0ZXh0LCBvcHRpb25zKTtcblx0fSxcblxuXHRyZW5kZXI6IGZ1bmN0aW9uIHJlbmRlcigpIHtcblx0XHR2YXIgd2hlcmVUbyA9IGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKFN0b3JlLmdldEhUTE1Db250YWluZXIoKSk7XG5cdFx0aWYgKHdoZXJlVG8gPT09IG51bGwpIHtcblx0XHRcdExvZ2dlci5lcnJvcigndGhlIGNvbnRhaW5lciB3aXRoIGlkIFwiJyArIHdoZXJlVG8gKyAnXCIgaGFzIG5vdCBiZWVuIGZvdW5kIG9uIHRoZSBkb2N1bWVudC4gVGhlIGxpYnJhcnkgaXMgZ29pbmcgdG8gY3JlYXRlIGl0LicpO1xuXHRcdFx0dmFyIGRpdiA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoJ2RpdicpO1xuXHRcdFx0ZGl2LmlkID0gU3RvcmUuZ2V0SFRMTUNvbnRhaW5lcigpO1xuXHRcdFx0ZGl2LnN0eWxlLndpZHRoID0gJzEwMCUnO1xuXHRcdFx0ZGl2LnN0eWxlLmhlaWdodCA9ICc1MHB4Jztcblx0XHRcdGRpdi5zdHlsZS5wb3NpdGlvbiA9ICdmaXhlZCc7XG5cdFx0XHRkaXYuc3R5bGUudG9wID0gJzAnO1xuXHRcdFx0ZGl2LnN0eWxlLnpJbmRleCA9IDk5OTk5OTk5OTk7XG5cdFx0XHRkb2N1bWVudC5ib2R5Lmluc2VydEJlZm9yZShkaXYsIGRvY3VtZW50LmJvZHkuZmlyc3RDaGlsZCk7XG5cdFx0XHR3aGVyZVRvID0gZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoU3RvcmUuZ2V0SFRMTUNvbnRhaW5lcigpKTtcblx0XHR9XG5cdFx0d2hlcmVUby5pbm5lckhUTUwgPSBTdG9yZS5nZXRIVE1MKCk7XG5cdFx0UFBCQS5zdHlsZUFjY291bnQoU3RvcmUuZ2V0VXNlckRhdGEoKS51c2VyLmFjY291bnQpO1xuXHRcdFBQQkEucmVuZGVyVXNlcihTdG9yZS5nZXRVc2VyRGF0YSgpLnVzZXIpO1xuXHRcdFBQQkEucmVuZGVySW5mb0Jsb2NrcygpO1xuXHRcdFBQQkEucmVuZGVyQWNjb3VudHMoU3RvcmUuZ2V0VXNlckRhdGEoKS51c2VyLmFjY291bnRzKTtcblx0XHRpZiAoU3RvcmUuZ2V0QXBwc1Zpc2libGUoKSA9PT0gZmFsc2UpIHtcblx0XHRcdGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKCctLXB1cmVzZGstYXBwcy1zZWN0aW9uLS0nKS5zdHlsZS5jc3NUZXh0ID0gXCJkaXNwbGF5Om5vbmVcIjtcblx0XHR9XG5cdFx0YWZ0ZXJSZW5kZXIoKTtcblx0fVxufTtcblxubW9kdWxlLmV4cG9ydHMgPSBQUEJBOyIsIid1c2Ugc3RyaWN0JztcblxuLyohXG4gKiBQdXJlUHJvZmlsZSBQdXJlUHJvZmlsZSBCdXNpbmVzcyBBcHBzIERldmVsb3BtZW50IFNES1xuICpcbiAqIHZlcnNpb246IDIuMi4zXG4gKiBkYXRlOiAyMDE3LTA1LTIyXG4gKlxuICogQ29weXJpZ2h0IDIwMTcsIFB1cmVQcm9maWxlXG4gKiBSZWxlYXNlZCB1bmRlciBNSVQgbGljZW5zZVxuICogaHR0cHM6Ly9vcGVuc291cmNlLm9yZy9saWNlbnNlcy9NSVRcbiAqL1xuXG52YXIgcHBiYSA9IHJlcXVpcmUoJy4vUFBCQScpO1xucHBiYS5zZXRXaW5kb3dOYW1lKCdQVVJFU0RLJyk7XG5wcGJhLnNldENvbmZpZ3VyYXRpb24oe1xuICAgIFwibG9nc1wiOiBmYWxzZSxcbiAgICBcInJvb3RVcmxcIjogXCIvXCIsXG4gICAgXCJiYXNlVXJsXCI6IFwiYXBpL3YxL1wiLFxuICAgIFwibG9naW5VcmxcIjogXCJhcGkvdjEvb2F1dGgyXCIsXG4gICAgXCJzZWFyY2hJbnB1dElkXCI6IFwiLS1wdXJlc2RrLS1zZWFyY2gtLWlucHV0LS1cIixcbiAgICBcInJlZGlyZWN0VXJsUGFyYW1cIjogXCJyZWRpcmVjdF91cmxcIlxufSk7XG5wcGJhLnNldEhUTUxUZW1wbGF0ZSgnPGhlYWRlciBjbGFzcz1cImJhYy0taGVhZGVyLWFwcHNcIiBpZD1cIi0tcHVyZXNkay1iYWMtLWhlYWRlci1hcHBzLS1cIj5cXG4gICAgPGRpdiBjbGFzcz1cImJhYy0tY29udGFpbmVyXCI+XFxuICAgICAgICA8ZGl2IGNsYXNzPVwiYmFjLS1sb2dvXCIgaWQ9XCItLXB1cmVzZGstYWNjb3VudC1sb2dvLS1cIj48L2Rpdj5cXG4gICAgICAgIDxkaXYgY2xhc3M9XCJiYWMtLXVzZXItYWN0aW9uc1wiPlxcbiAgICAgICAgICAgIDxkaXYgY2xhc3M9XCJiYWMtLXVzZXItYXBwc1wiIGlkPVwiLS1wdXJlc2RrLWFwcHMtc2VjdGlvbi0tXCI+XFxuICAgICAgICAgICAgICAgIDxkaXYgaWQ9XCItLXB1cmVzZGstLWFwcHMtLW9wZW5lci0tXCI+XFxuICAgICAgICAgICAgICAgICAgICA8aSBjbGFzcz1cImZhIGZhLXNxdWFyZXNcIiBpZD1cIi0tcHVyZXNkay1hcHBzLWljb24tLVwiPjwvaT5cXG4gICAgICAgICAgICAgICAgICAgIDxkaXYgY2xhc3M9XCItLXB1cmVzZGstYXBwcy1uYW1lLS1cIj5hcHBzPC9kaXY+XFxuICAgICAgICAgICAgICAgIDwvZGl2PlxcbiAgICAgICAgICAgICAgICA8ZGl2IGNsYXNzPVwiYmFjLS1hcHBzLWNvbnRhaW5lclwiIGlkPVwiLS1wdXJlc2RrLWFwcHMtY29udGFpbmVyLS1cIj5cXG4gICAgICAgICAgICAgICAgICAgIDxkaXYgY2xhc3M9XCJiYWMtLWFwcHMtYXJyb3dcIj48L2Rpdj5cXG4gICAgICAgICAgICAgICAgPC9kaXY+XFxuICAgICAgICAgICAgPC9kaXY+XFxuICAgICAgICAgICAgPCEtLTxkaXYgY2xhc3M9XCJiYWMmIzQ1OyYjNDU7dXNlci1ub3RpZmljYXRpb25zXCI+LS0+XFxuICAgICAgICAgICAgICAgIDwhLS08ZGl2IGNsYXNzPVwiYmFjJiM0NTsmIzQ1O3VzZXItbm90aWZpY2F0aW9ucy1jb3VudFwiPjE8L2Rpdj4tLT5cXG4gICAgICAgICAgICAgICAgPCEtLTxpIGNsYXNzPVwiZmEgZmEtYmVsbC1vXCI+PC9pPi0tPlxcbiAgICAgICAgICAgIDwhLS08L2Rpdj4tLT5cXG4gICAgICAgICAgICA8ZGl2IGNsYXNzPVwiYmFjLS11c2VyLWF2YXRhclwiIGlkPVwiYmFjLS11c2VyLWF2YXRhci10b3BcIj5cXG4gICAgICAgICAgICAgICAgPHNwYW4gY2xhc3M9XCJiYWMtLXVzZXItYXZhdGFyLW5hbWVcIiBpZD1cIi0tcHVyZXNkay11c2VyLWF2YXRhci0tXCI+PC9zcGFuPlxcbiAgICAgICAgICAgICAgICA8ZGl2IGlkPVwiYmFjLS1pbWFnZS1jb250YWluZXItdG9wXCI+PC9kaXY+XFxuICAgICAgICAgICAgPC9kaXY+XFxuICAgICAgICA8L2Rpdj5cXG4gICAgPC9kaXY+XFxuICAgIDxkaXYgaWQ9XCJiYWMtLWluZm8tYmxvY2tzLXdyYXBwZXItLVwiPjwvZGl2PlxcbjwvaGVhZGVyPlxcbjxkaXYgY2xhc3M9XCJiYWMtLXVzZXItc2lkZWJhclwiIGlkPVwiLS1wdXJlc2RrLXVzZXItc2lkZWJhci0tXCI+XFxuICAgIDxkaXYgaWQ9XCItLXB1cmVzZGstdXNlci1kZXRhaWxzLS1cIj48L2Rpdj5cXG4gICAgPCEtLTxkaXYgY2xhc3M9XCJiYWMmIzQ1OyYjNDU7dXNlci1zaWRlYmFyLWluZm9cIj4tLT5cXG4gICAgICAgIDwhLS08ZGl2IGNsYXNzPVwiYmFjJiM0NTsmIzQ1O3VzZXItaW1hZ2VcIj48aSBjbGFzcz1cImZhIGZhLWNhbWVyYVwiPjwvaT48L2Rpdj4tLT5cXG4gICAgICAgIDwhLS08ZGl2IGNsYXNzPVwiYmFjJiM0NTsmIzQ1O3VzZXItbmFtZVwiPkN1cnRpcyBCYXJ0bGV0dDwvZGl2Pi0tPlxcbiAgICAgICAgPCEtLTxkaXYgY2xhc3M9XCJiYWMmIzQ1OyYjNDU7dXNlci1lbWFpbFwiPmNiYXJ0bGV0dEBwdXJlcHJvZmlsZS5jb208L2Rpdj4tLT5cXG4gICAgPCEtLTwvZGl2Pi0tPlxcbiAgICA8ZGl2IGNsYXNzPVwiYmFjLS11c2VyLWFwcHNcIiBpZD1cIi0tcHVyZXNkay11c2VyLWJ1c2luZXNzZXMtLVwiPlxcbiAgICAgICAgPCEtLTxkaXYgY2xhc3M9XCJiYWMmIzQ1OyYjNDU7dXNlci1saXN0LWl0ZW1cIj4tLT5cXG4gICAgICAgICAgICA8IS0tPGltZyBzcmM9XCJodHRwOi8vbG9yZW1waXhlbC5jb20vNDAvNDBcIiBhbHQ9XCJcIj4tLT5cXG4gICAgICAgICAgICA8IS0tPGRpdiBjbGFzcz1cImJhYy11c2VyLWFwcC1kZXRhaWxzXCI+LS0+XFxuICAgICAgICAgICAgICAgIDwhLS08c3Bhbj48L3NwYW4+LS0+XFxuICAgICAgICAgICAgICAgIDwhLS08c3Bhbj4xNSB0ZWFtIG1lbWJlcnM8L3NwYW4+LS0+XFxuICAgICAgICAgICAgPCEtLTwvZGl2Pi0tPlxcbiAgICAgICAgPCEtLTwvZGl2Pi0tPlxcbiAgICA8L2Rpdj5cXG4gICAgPGRpdiBjbGFzcz1cImJhYy0tdXNlci1hY2NvdW50LXNldHRpbmdzXCI+XFxuICAgICAgICA8ZGl2IGNsYXNzPVwiYmFjLXVzZXItYWNvdW50LWxpc3QtaXRlbVwiPlxcbiAgICAgICAgICAgIDxpIGNsYXNzPVwiZmEgZmEtY29nLWxpbmVcIj48L2k+XFxuICAgICAgICAgICAgPGEgaHJlZj1cIiNcIj5BY2NvdW50IFNlY3VyaXR5PC9hPlxcbiAgICAgICAgPC9kaXY+XFxuICAgICAgICA8ZGl2IGNsYXNzPVwiYmFjLXVzZXItYWNvdW50LWxpc3QtaXRlbVwiPlxcbiAgICAgICAgICAgIDxpIGNsYXNzPVwiZmEgZmEtbG9naW4tbGluZVwiPjwvaT5cXG4gICAgICAgICAgICA8YSBocmVmPVwiL2FwaS92MS9zaWduLW9mZlwiPkxvZyBvdXQ8L2E+XFxuICAgICAgICA8L2Rpdj5cXG4gICAgPC9kaXY+XFxuPC9kaXY+XFxuPGlucHV0IHN0eWxlPVwiZGlzcGxheTpub25lXCIgdHlwZT1cXCdmaWxlXFwnIGlkPVxcJy0tLXB1cmVzZGstYXZhdGFyLWZpbGVcXCc+XFxuPGlucHV0IHN0eWxlPVwiZGlzcGxheTpub25lXCIgdHlwZT1cXCdidXR0b25cXCcgaWQ9XFwnLS0tcHVyZXNkay1hdmF0YXItc3VibWl0XFwnIHZhbHVlPVxcJ1VwbG9hZCFcXCc+Jyk7XG5cbndpbmRvdy5QVVJFU0RLID0gcHBiYTtcblxudmFyIGNzcyA9ICdodG1sLGJvZHksZGl2LHNwYW4sYXBwbGV0LG9iamVjdCxpZnJhbWUsaDEsaDIsaDMsaDQsaDUsaDYscCxibG9ja3F1b3RlLHByZSxhLGFiYnIsYWNyb255bSxhZGRyZXNzLGJpZyxjaXRlLGNvZGUsZGVsLGRmbixlbSxpbWcsaW5zLGtiZCxxLHMsc2FtcCxzbWFsbCxzdHJpa2Usc3Ryb25nLHN1YixzdXAsdHQsdmFyLGIsdSxpLGNlbnRlcixkbCxkdCxkZCxvbCx1bCxsaSxmaWVsZHNldCxmb3JtLGxhYmVsLGxlZ2VuZCx0YWJsZSxjYXB0aW9uLHRib2R5LHRmb290LHRoZWFkLHRyLHRoLHRkLGFydGljbGUsYXNpZGUsY2FudmFzLGRldGFpbHMsZW1iZWQsZmlndXJlLGZpZ2NhcHRpb24sZm9vdGVyLGhlYWRlcixoZ3JvdXAsbWVudSxuYXYsb3V0cHV0LHJ1Ynksc2VjdGlvbixzdW1tYXJ5LHRpbWUsbWFyayxhdWRpbyx2aWRlb3ttYXJnaW46MDtwYWRkaW5nOjA7Ym9yZGVyOjA7Zm9udC1zaXplOjEwMCU7Zm9udDppbmhlcml0O3ZlcnRpY2FsLWFsaWduOmJhc2VsaW5lfWFydGljbGUsYXNpZGUsZGV0YWlscyxmaWdjYXB0aW9uLGZpZ3VyZSxmb290ZXIsaGVhZGVyLGhncm91cCxtZW51LG5hdixzZWN0aW9ue2Rpc3BsYXk6YmxvY2t9Ym9keXtsaW5lLWhlaWdodDoxfW9sLHVse2xpc3Qtc3R5bGU6bm9uZX1ibG9ja3F1b3RlLHF7cXVvdGVzOm5vbmV9YmxvY2txdW90ZTpiZWZvcmUsYmxvY2txdW90ZTphZnRlcixxOmJlZm9yZSxxOmFmdGVye2NvbnRlbnQ6XCJcIjtjb250ZW50Om5vbmV9dGFibGV7Ym9yZGVyLWNvbGxhcHNlOmNvbGxhcHNlO2JvcmRlci1zcGFjaW5nOjB9Ym9keXtvdmVyZmxvdy14OmhpZGRlbn0jYmFjLXdyYXBwZXJ7Zm9udC1mYW1pbHk6XCJWZXJkYW5hXCIsIGFyaWFsLCBzYW5zLXNlcmlmO2NvbG9yOndoaXRlO21pbi1oZWlnaHQ6MTAwdmg7cG9zaXRpb246cmVsYXRpdmV9LmJhYy0tY29udGFpbmVye21heC13aWR0aDoxMTYwcHg7bWFyZ2luOjAgYXV0b30uYmFjLS1oZWFkZXItYXBwc3twb3NpdGlvbjphYnNvbHV0ZTt3aWR0aDoxMDAlO2hlaWdodDo1MHB4O2JhY2tncm91bmQtY29sb3I6IzQ3NTM2OTtwYWRkaW5nOjVweCAwO3otaW5kZXg6OTk5OTk5OX0uYmFjLS1oZWFkZXItYXBwcyAuYmFjLS1jb250YWluZXJ7aGVpZ2h0OjEwMCU7ZGlzcGxheTpmbGV4O2FsaWduLWl0ZW1zOmNlbnRlcjtqdXN0aWZ5LWNvbnRlbnQ6c3BhY2UtYmV0d2Vlbn0uYmFjLS1oZWFkZXItc2VhcmNoe3Bvc2l0aW9uOnJlbGF0aXZlfS5iYWMtLWhlYWRlci1zZWFyY2ggaW5wdXR7Y29sb3I6I2ZmZjtmb250LXNpemU6MTRweDtoZWlnaHQ6MzVweDtiYWNrZ3JvdW5kLWNvbG9yOiM2Yjc1ODY7cGFkZGluZzowIDVweCAwIDEwcHg7Ym9yZGVyOm5vbmU7Ym9yZGVyLXJhZGl1czozcHg7bWluLXdpZHRoOjQwMHB4O3dpZHRoOjEwMCV9LmJhYy0taGVhZGVyLXNlYXJjaCBpbnB1dDpmb2N1c3tvdXRsaW5lOm5vbmV9LmJhYy0taGVhZGVyLXNlYXJjaCBpbnB1dDo6LXdlYmtpdC1pbnB1dC1wbGFjZWhvbGRlcntmb250LXN0eWxlOm5vcm1hbCAhaW1wb3J0YW50O3RleHQtYWxpZ246Y2VudGVyO2NvbG9yOiNmZmY7Zm9udC1zaXplOjE0cHg7Zm9udC13ZWlnaHQ6MzAwO2xldHRlci1zcGFjaW5nOjAuNXB4fS5iYWMtLWhlYWRlci1zZWFyY2ggaW5wdXQ6Oi1tb3otcGxhY2Vob2xkZXJ7Zm9udC1zdHlsZTpub3JtYWwgIWltcG9ydGFudDt0ZXh0LWFsaWduOmNlbnRlcjtjb2xvcjojZmZmO2ZvbnQtc2l6ZToxNHB4O2ZvbnQtd2VpZ2h0OjMwMDtsZXR0ZXItc3BhY2luZzowLjVweH0uYmFjLS1oZWFkZXItc2VhcmNoIGlucHV0Oi1tcy1pbnB1dC1wbGFjZWhvbGRlcntmb250LXN0eWxlOm5vcm1hbCAhaW1wb3J0YW50O3RleHQtYWxpZ246Y2VudGVyO2NvbG9yOiNmZmY7Zm9udC1zaXplOjE0cHg7Zm9udC13ZWlnaHQ6MzAwO2xldHRlci1zcGFjaW5nOjAuNXB4fS5iYWMtLWhlYWRlci1zZWFyY2ggaXtwb3NpdGlvbjphYnNvbHV0ZTt0b3A6OHB4O3JpZ2h0OjEwcHh9LmJhYy0tdXNlci1hY3Rpb25ze2Rpc3BsYXk6ZmxleDthbGlnbi1pdGVtczpjZW50ZXJ9LmJhYy0tdXNlci1hY3Rpb25zPmRpdntjdXJzb3I6cG9pbnRlcjtjb2xvcjp3aGl0ZX0uYmFjLS11c2VyLWFjdGlvbnMgLmJhYy0tdXNlci1ub3RpZmljYXRpb25ze3Bvc2l0aW9uOnJlbGF0aXZlfS5iYWMtLXVzZXItYWN0aW9ucyAuYmFjLS11c2VyLW5vdGlmaWNhdGlvbnMgaXtmb250LXNpemU6MjBweH0uYmFjLS11c2VyLWFjdGlvbnMgLmJhYy0tdXNlci1ub3RpZmljYXRpb25zLWNvdW50e3Bvc2l0aW9uOmFic29sdXRlO2Rpc3BsYXk6aW5saW5lLWJsb2NrO2hlaWdodDoxNXB4O3dpZHRoOjE1cHg7bGluZS1oZWlnaHQ6MTVweDtjb2xvcjojZmZmO2ZvbnQtc2l6ZToxMHB4O3RleHQtYWxpZ246Y2VudGVyO2JhY2tncm91bmQtY29sb3I6I2ZjM2IzMDtib3JkZXItcmFkaXVzOjUwJTt0b3A6LTVweDtsZWZ0Oi01cHh9LmJhYy0tdXNlci1hY3Rpb25zIC5iYWMtLXVzZXItYXZhdGFyLC5iYWMtLXVzZXItYWN0aW9ucyAuYmFjLS11c2VyLW5vdGlmaWNhdGlvbnN7bWFyZ2luLWxlZnQ6MjBweH0uYmFjLS11c2VyLWFjdGlvbnMgLmJhYy0tdXNlci1hdmF0YXJ7cG9zaXRpb246cmVsYXRpdmU7b3ZlcmZsb3c6aGlkZGVuO2JvcmRlci1yYWRpdXM6NTAlfS5iYWMtLXVzZXItYWN0aW9ucyAuYmFjLS11c2VyLWF2YXRhciAjYmFjLS1pbWFnZS1jb250YWluZXItdG9we3dpZHRoOjEwMCU7aGVpZ3RoOjEwMCU7cG9zaXRpb246YWJzb2x1dGU7dG9wOjA7bGVmdDowO3otaW5kZXg6MTtkaXNwbGF5Om5vbmV9LmJhYy0tdXNlci1hY3Rpb25zIC5iYWMtLXVzZXItYXZhdGFyICNiYWMtLWltYWdlLWNvbnRhaW5lci10b3AgaW1ne3dpZHRoOjEwMCU7aGVpZ2h0OjEwMCV9LmJhYy0tdXNlci1hY3Rpb25zIC5iYWMtLXVzZXItYXZhdGFyICNiYWMtLWltYWdlLWNvbnRhaW5lci10b3AuLS1wdXJlc2RrLXZpc2libGV7ZGlzcGxheTpibG9ja30uYmFjLS11c2VyLWFjdGlvbnMgLmJhYy0tdXNlci1hdmF0YXItbmFtZXtjb2xvcjojZmZmO2JhY2tncm91bmQtY29sb3I6I2FkYWRhZDtkaXNwbGF5OmlubGluZS1ibG9jaztoZWlnaHQ6MzBweDt3aWR0aDozMHB4O2xpbmUtaGVpZ2h0OjMwcHg7dGV4dC1hbGlnbjpjZW50ZXI7Zm9udC1zaXplOjE0cHh9LmJhYy0tdXNlci1hcHBze3Bvc2l0aW9uOnJlbGF0aXZlfS5iYWMtLXVzZXItYXBwcyAjLS1wdXJlc2RrLWFwcHMtaWNvbi0te3dpZHRoOjIwcHg7ZGlzcGxheTppbmxpbmUtYmxvY2s7dGV4dC1hbGlnbjpjZW50ZXJ9LmJhYy0tdXNlci1hcHBzIC4tLXB1cmVzZGstYXBwcy1uYW1lLS17Zm9udC1zaXplOjhweDt3aWR0aDoyMHB4O3RleHQtYWxpZ246Y2VudGVyfSMtLXB1cmVzZGstdXNlci1idXNpbmVzc2VzLS17aGVpZ2h0OmNhbGMoMTAwdmggLSA0NThweCk7b3ZlcmZsb3c6YXV0b30uYmFjLS1hcHBzLWNvbnRhaW5lcntiYWNrZ3JvdW5kOiNmZmY7cG9zaXRpb246YWJzb2x1dGU7dG9wOjQ1cHg7cmlnaHQ6LTQwcHg7ZGlzcGxheTpmbGV4O3dpZHRoOjM2MHB4O2ZsZXgtd3JhcDp3cmFwO2JvcmRlci1yYWRpdXM6MTBweDtwYWRkaW5nOjMwcHg7anVzdGlmeS1jb250ZW50OnNwYWNlLWJldHdlZW47dGV4dC1hbGlnbjpjZW50ZXI7LXdlYmtpdC1ib3gtc2hhZG93OjAgMCAxMHB4IDJweCByZ2JhKDAsMCwwLDAuMik7Ym94LXNoYWRvdzowIDAgMTBweCAycHggcmdiYSgwLDAsMCwwLjIpO29wYWNpdHk6MDt2aXNpYmlsaXR5OmhpZGRlbjt0cmFuc2l0aW9uOmFsbCAwLjRzIGVhc2V9LmJhYy0tYXBwcy1jb250YWluZXIuYWN0aXZle29wYWNpdHk6MTt2aXNpYmlsaXR5OnZpc2libGV9LmJhYy0tYXBwcy1jb250YWluZXIgLmJhYy0tYXBwcy1hcnJvd3twb3NpdGlvbjphYnNvbHV0ZTtkaXNwbGF5OmJsb2NrO2hlaWdodDoyMHB4O3dpZHRoOjIwcHg7dG9wOi0xMHB4O3JpZ2h0OjM2cHg7YmFja2dyb3VuZDojZmZmO3RyYW5zZm9ybTpyb3RhdGUoLTQ1ZGVnKTt6LWluZGV4OjF9LmJhYy0tYXBwcy1jb250YWluZXIgLmJhYy0tYXBwc3t3aWR0aDozMiU7ZGlzcGxheTpmbGV4O2ZvbnQtc2l6ZTozMHB4O21hcmdpbi1ib3R0b206NDBweDt0ZXh0LWFsaWduOmNlbnRlcjtqdXN0aWZ5LWNvbnRlbnQ6Y2VudGVyO2ZsZXgtd3JhcDp3cmFwfS5iYWMtLWFwcHMtY29udGFpbmVyIC5iYWMtLWFwcHMgYXtkaXNwbGF5OmJsb2NrO2NvbG9yOiNmZmY7dGV4dC1kZWNvcmF0aW9uOm5vbmU7d2lkdGg6NjVweDtoZWlnaHQ6NjVweDtwYWRkaW5nLXRvcDozcHg7bGluZS1oZWlnaHQ6NjVweDt0ZXh0LWFsaWduOmNlbnRlcjtib3JkZXItcmFkaXVzOjEwcHg7LXdlYmtpdC1ib3gtc2hhZG93OjAgMCA1cHggMCByZ2JhKDAsMCwwLDAuMik7Ym94LXNoYWRvdzowIDAgNXB4IDAgcmdiYSgwLDAsMCwwLjIpfS5iYWMtLWFwcHMtY29udGFpbmVyIC5iYWMtLWFwcHMgLmJhYy0tYXBwLW5hbWV7d2lkdGg6MTAwJTtjb2xvcjojMDAwO2ZvbnQtc2l6ZToxNHB4O3BhZGRpbmc6MTBweCAwIDVweCAwfS5iYWMtLWFwcHMtY29udGFpbmVyIC5iYWMtLWFwcHMgLmJhYy0tYXBwLWRlc2NyaXB0aW9ue2NvbG9yOiM5MTkxOTE7Zm9udC1zaXplOjEycHg7Zm9udC1zdHlsZTppdGFsaWM7bGluZS1oZWlnaHQ6MS4zZW19LmJhYy0tdXNlci1zaWRlYmFye2ZvbnQtZmFtaWx5OlwiVmVyZGFuYVwiLCBhcmlhbCwgc2Fucy1zZXJpZjtjb2xvcjp3aGl0ZTtiYWNrZ3JvdW5kLWNvbG9yOiM1MTVmNzc7Ym94LXNpemluZzpib3JkZXItYm94O3dpZHRoOjMyMHB4O2hlaWdodDoxMDAlO3Bvc2l0aW9uOmFic29sdXRlO3RvcDowO3JpZ2h0OjA7ei1pbmRleDo5OTk5OTk7cGFkZGluZy10b3A6MTBweDtvcGFjaXR5OjA7bWFyZ2luLXRvcDo1MHB4O3RyYW5zZm9ybTp0cmFuc2xhdGVYKDEwMCUpO3RyYW5zaXRpb246YWxsIDAuNHMgZWFzZX0uYmFjLS11c2VyLXNpZGViYXIuYWN0aXZle29wYWNpdHk6MTt0cmFuc2Zvcm06dHJhbnNsYXRlWCgwJSl9LmJhYy0tdXNlci1zaWRlYmFyIC5iYWMtLXVzZXItbGlzdC1pdGVte2Rpc3BsYXk6ZmxleDtjdXJzb3I6cG9pbnRlcjthbGlnbi1pdGVtczpjZW50ZXI7cGFkZGluZzoxMHB4IDEwcHggMTBweCA0MHB4O2JvcmRlci1ib3R0b206MnB4IHNvbGlkICM2Yjc1ODZ9LmJhYy0tdXNlci1zaWRlYmFyIC5iYWMtLXVzZXItbGlzdC1pdGVtOmhvdmVye2JhY2tncm91bmQtY29sb3I6IzZiNzU4Nn0uYmFjLS11c2VyLXNpZGViYXIgLmJhYy0tdXNlci1saXN0LWl0ZW0gaW1ne21hcmdpbi1yaWdodDoyMHB4O2JvcmRlcjoycHggc29saWQgI2ZmZn0uYmFjLS11c2VyLXNpZGViYXIgLmJhYy0tdXNlci1saXN0LWl0ZW0gc3Bhbnt3aWR0aDoxMDAlO2Rpc3BsYXk6YmxvY2s7bWFyZ2luLWJvdHRvbTo1cHh9LmJhYy0tdXNlci1zaWRlYmFyIC5iYWMtdXNlci1hcHAtZGV0YWlscyBzcGFue2ZvbnQtc2l6ZToxMnB4fS5iYWMtLXVzZXItc2lkZWJhci1pbmZve2Rpc3BsYXk6ZmxleDtqdXN0aWZ5LWNvbnRlbnQ6Y2VudGVyO2ZsZXgtd3JhcDp3cmFwO3RleHQtYWxpZ246Y2VudGVyO3BhZGRpbmc6MTBweCAyMHB4IDE1cHh9LmJhYy0tdXNlci1zaWRlYmFyLWluZm8gLmJhYy0tdXNlci1pbWFnZXtib3JkZXI6MXB4ICNhZGFkYWQgc29saWQ7b3ZlcmZsb3c6aGlkZGVuO2JvcmRlci1yYWRpdXM6NTAlO3Bvc2l0aW9uOnJlbGF0aXZlO2N1cnNvcjpwb2ludGVyO2Rpc3BsYXk6aW5saW5lLWJsb2NrO2hlaWdodDo4MHB4O3dpZHRoOjgwcHg7bGluZS1oZWlnaHQ6ODBweDt0ZXh0LWFsaWduOmNlbnRlcjtjb2xvcjojZmZmO2JvcmRlci1yYWRpdXM6NTAlO2JhY2tncm91bmQtY29sb3I6I2FkYWRhZDttYXJnaW4tYm90dG9tOjE1cHh9LmJhYy0tdXNlci1zaWRlYmFyLWluZm8gLmJhYy0tdXNlci1pbWFnZSAjYmFjLS11c2VyLWltYWdlLWZpbGV7ZGlzcGxheTpub25lO3Bvc2l0aW9uOmFic29sdXRlO3otaW5kZXg6MTt0b3A6MDtsZWZ0OjA7d2lkdGg6MTAwJTtoZWlnaHQ6MTAwJX0uYmFjLS11c2VyLXNpZGViYXItaW5mbyAuYmFjLS11c2VyLWltYWdlICNiYWMtLXVzZXItaW1hZ2UtZmlsZSBpbWd7d2lkdGg6MTAwJTtoZWlnaHQ6MTAwJX0uYmFjLS11c2VyLXNpZGViYXItaW5mbyAuYmFjLS11c2VyLWltYWdlICNiYWMtLXVzZXItaW1hZ2UtZmlsZS4tLXB1cmVzZGstdmlzaWJsZXtkaXNwbGF5OmJsb2NrfS5iYWMtLXVzZXItc2lkZWJhci1pbmZvIC5iYWMtLXVzZXItaW1hZ2UgI2JhYy0tdXNlci1pbWFnZS11cGxvYWQtcHJvZ3Jlc3N7cG9zaXRpb246YWJzb2x1dGU7cGFkZGluZy10b3A6MTBweDt0b3A6MDtiYWNrZ3JvdW5kOiM2NjY7ei1pbmRleDo0O2Rpc3BsYXk6bm9uZTt3aWR0aDoxMDAlO2hlaWdodDoxMDAlfS5iYWMtLXVzZXItc2lkZWJhci1pbmZvIC5iYWMtLXVzZXItaW1hZ2UgI2JhYy0tdXNlci1pbWFnZS11cGxvYWQtcHJvZ3Jlc3MuLS1wdXJlc2RrLXZpc2libGV7ZGlzcGxheTpibG9ja30uYmFjLS11c2VyLXNpZGViYXItaW5mbyAuYmFjLS11c2VyLWltYWdlIGl7Zm9udC1zaXplOjMycHg7Zm9udC1zaXplOjMycHg7ei1pbmRleDowO3Bvc2l0aW9uOmFic29sdXRlO3dpZHRoOjEwMCU7bGVmdDowO2JhY2tncm91bmQtY29sb3I6cmdiYSgwLDAsMCwwLjUpfS5iYWMtLXVzZXItc2lkZWJhci1pbmZvIC5iYWMtLXVzZXItaW1hZ2U6aG92ZXIgaXt6LWluZGV4OjN9LmJhYy0tdXNlci1zaWRlYmFyLWluZm8gLmJhYy0tdXNlci1uYW1le3dpZHRoOjEwMCU7dGV4dC1hbGlnbjpjZW50ZXI7Zm9udC1zaXplOjE4cHg7bWFyZ2luLWJvdHRvbToxMHB4fS5iYWMtLXVzZXItc2lkZWJhci1pbmZvIC5iYWMtLXVzZXItZW1haWx7Zm9udC1zaXplOjEycHg7Zm9udC13ZWlnaHQ6MzAwfS5iYWMtLXVzZXItYWNjb3VudC1zZXR0aW5nc3twYWRkaW5nOjUwcHh9LmJhYy0tdXNlci1hY2NvdW50LXNldHRpbmdzIC5iYWMtdXNlci1hY291bnQtbGlzdC1pdGVte2Rpc3BsYXk6ZmxleDthbGlnbi1pdGVtczpjZW50ZXI7bWFyZ2luLWJvdHRvbTozMHB4fS5iYWMtLXVzZXItYWNjb3VudC1zZXR0aW5ncyAuYmFjLXVzZXItYWNvdW50LWxpc3QtaXRlbSBhe3RleHQtZGVjb3JhdGlvbjpub25lO2NvbG9yOiNmZmZ9LmJhYy0tdXNlci1hY2NvdW50LXNldHRpbmdzIC5iYWMtdXNlci1hY291bnQtbGlzdC1pdGVtIGl7Zm9udC1zaXplOjI0cHg7bWFyZ2luLXJpZ2h0OjIwcHh9Iy0tcHVyZXNkay1hY2NvdW50LWxvZ28tLXtjdXJzb3I6cG9pbnRlcn0jYmFjLS1pbmZvLWJsb2Nrcy13cmFwcGVyLS17cG9zaXRpb246cmVsYXRpdmV9I2JhYy0taW5mby1ibG9ja3Mtd3JhcHBlci0tIC4tLXB1cmVzZGstaW5mby1ib3gtLXtib3JkZXItcmFkaXVzOjAgMCAzcHggM3B4O292ZXJmbG93OmhpZGRlbjt6LWluZGV4Ojk5OTk5OTk5O3Bvc2l0aW9uOmZpeGVkO3RvcDotNDFweDt3aWR0aDo0NzBweDtsZWZ0OmNhbGMoNTB2dyAtIDIzNXB4KTtoZWlnaHQ6NDBweDstd2Via2l0LXRyYW5zaXRpb246dG9wIDAuNHM7dHJhbnNpdGlvbjp0b3AgMC40c30jYmFjLS1pbmZvLWJsb2Nrcy13cmFwcGVyLS0gLi0tcHVyZXNkay1pbmZvLWJveC0tLmJhYy0tc3VjY2Vzc3tiYWNrZ3JvdW5kOiMxNERBOUV9I2JhYy0taW5mby1ibG9ja3Mtd3JhcHBlci0tIC4tLXB1cmVzZGstaW5mby1ib3gtLS5iYWMtLXN1Y2Nlc3MgLmJhYy0taW5uZXItaW5mby1ib3gtLSBkaXYuYmFjLS1pbmZvLWljb24tLS5mYS1zdWNjZXNze2Rpc3BsYXk6aW5saW5lLWJsb2NrfSNiYWMtLWluZm8tYmxvY2tzLXdyYXBwZXItLSAuLS1wdXJlc2RrLWluZm8tYm94LS0uYmFjLS1pbmZve2JhY2tncm91bmQtY29sb3I6IzVCQzBERX0jYmFjLS1pbmZvLWJsb2Nrcy13cmFwcGVyLS0gLi0tcHVyZXNkay1pbmZvLWJveC0tLmJhYy0taW5mbyAuYmFjLS1pbm5lci1pbmZvLWJveC0tIGRpdi5iYWMtLWluZm8taWNvbi0tLmZhLWluZm8tMXtkaXNwbGF5OmlubGluZS1ibG9ja30jYmFjLS1pbmZvLWJsb2Nrcy13cmFwcGVyLS0gLi0tcHVyZXNkay1pbmZvLWJveC0tLmJhYy0td2FybmluZ3tiYWNrZ3JvdW5kOiNGMEFENEV9I2JhYy0taW5mby1ibG9ja3Mtd3JhcHBlci0tIC4tLXB1cmVzZGstaW5mby1ib3gtLS5iYWMtLXdhcm5pbmcgLmJhYy0taW5uZXItaW5mby1ib3gtLSBkaXYuYmFjLS1pbmZvLWljb24tLS5mYS13YXJuaW5ne2Rpc3BsYXk6aW5saW5lLWJsb2NrfSNiYWMtLWluZm8tYmxvY2tzLXdyYXBwZXItLSAuLS1wdXJlc2RrLWluZm8tYm94LS0uYmFjLS1lcnJvcntiYWNrZ3JvdW5kOiNFRjQxMDB9I2JhYy0taW5mby1ibG9ja3Mtd3JhcHBlci0tIC4tLXB1cmVzZGstaW5mby1ib3gtLS5iYWMtLWVycm9yIC5iYWMtLWlubmVyLWluZm8tYm94LS0gZGl2LmJhYy0taW5mby1pY29uLS0uZmEtZXJyb3J7ZGlzcGxheTppbmxpbmUtYmxvY2t9I2JhYy0taW5mby1ibG9ja3Mtd3JhcHBlci0tIC4tLXB1cmVzZGstaW5mby1ib3gtLSAuYmFjLS10aW1lcnstd2Via2l0LXRyYW5zaXRpb24tdGltaW5nLWZ1bmN0aW9uOmxpbmVhcjt0cmFuc2l0aW9uLXRpbWluZy1mdW5jdGlvbjpsaW5lYXI7cG9zaXRpb246YWJzb2x1dGU7Ym90dG9tOjBweDtvcGFjaXR5OjAuNTtoZWlnaHQ6MnB4ICFpbXBvcnRhbnQ7YmFja2dyb3VuZDp3aGl0ZTt3aWR0aDowJX0jYmFjLS1pbmZvLWJsb2Nrcy13cmFwcGVyLS0gLi0tcHVyZXNkay1pbmZvLWJveC0tIC5iYWMtLXRpbWVyLmJhYy0tZnVsbHdpZHRoe3dpZHRoOjEwMCV9I2JhYy0taW5mby1ibG9ja3Mtd3JhcHBlci0tIC4tLXB1cmVzZGstaW5mby1ib3gtLS5iYWMtLWFjdGl2ZS0te3RvcDowcHh9I2JhYy0taW5mby1ibG9ja3Mtd3JhcHBlci0tIC4tLXB1cmVzZGstaW5mby1ib3gtLSAuYmFjLS1pbm5lci1pbmZvLWJveC0te3dpZHRoOjEwMCU7cGFkZGluZzoxMXB4IDE1cHg7Y29sb3I6d2hpdGV9I2JhYy0taW5mby1ibG9ja3Mtd3JhcHBlci0tIC4tLXB1cmVzZGstaW5mby1ib3gtLSAuYmFjLS1pbm5lci1pbmZvLWJveC0tIGRpdntkaXNwbGF5OmlubGluZS1ibG9jaztoZWlnaHQ6MThweDtwb3NpdGlvbjpyZWxhdGl2ZX0jYmFjLS1pbmZvLWJsb2Nrcy13cmFwcGVyLS0gLi0tcHVyZXNkay1pbmZvLWJveC0tIC5iYWMtLWlubmVyLWluZm8tYm94LS0gZGl2LmJhYy0taW5mby1pY29uLS17ZGlzcGxheTpub25lO3RvcDowcHh9I2JhYy0taW5mby1ibG9ja3Mtd3JhcHBlci0tIC4tLXB1cmVzZGstaW5mby1ib3gtLSAuYmFjLS1pbm5lci1pbmZvLWJveC0tIC5iYWMtLWluZm8taWNvbi0te21hcmdpbi1yaWdodDoxNXB4O3dpZHRoOjEwcHg7dG9wOjJweH0jYmFjLS1pbmZvLWJsb2Nrcy13cmFwcGVyLS0gLi0tcHVyZXNkay1pbmZvLWJveC0tIC5iYWMtLWlubmVyLWluZm8tYm94LS0gLmJhYy0taW5mby1tYWluLXRleHQtLXt3aWR0aDozODBweDttYXJnaW4tcmlnaHQ6MTVweDtmb250LXNpemU6MTJweDt0ZXh0LWFsaWduOmNlbnRlcn0jYmFjLS1pbmZvLWJsb2Nrcy13cmFwcGVyLS0gLi0tcHVyZXNkay1pbmZvLWJveC0tIC5iYWMtLWlubmVyLWluZm8tYm94LS0gLmJhYy0taW5mby1jbG9zZS1idXR0b24tLXt3aWR0aDoxMHB4O2N1cnNvcjpwb2ludGVyO3RvcDoycHh9JyxcbiAgICBoZWFkID0gZG9jdW1lbnQuaGVhZCB8fCBkb2N1bWVudC5nZXRFbGVtZW50c0J5VGFnTmFtZSgnaGVhZCcpWzBdLFxuICAgIHN0eWxlID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudCgnc3R5bGUnKTtcblxuc3R5bGUudHlwZSA9ICd0ZXh0L2Nzcyc7XG5pZiAoc3R5bGUuc3R5bGVTaGVldCkge1xuICAgIHN0eWxlLnN0eWxlU2hlZXQuY3NzVGV4dCA9IGNzcztcbn0gZWxzZSB7XG4gICAgc3R5bGUuYXBwZW5kQ2hpbGQoZG9jdW1lbnQuY3JlYXRlVGV4dE5vZGUoY3NzKSk7XG59XG5oZWFkLmFwcGVuZENoaWxkKHN0eWxlKTtcblxudmFyIGxpbmsgPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KCdsaW5rJyk7XG5saW5rLmhyZWYgPSAnaHR0cHM6Ly9maWxlLm15Zm9udGFzdGljLmNvbS9NRHZuUkpHaEJkNXhWY1huNHVRSlNaL2ljb25zLmNzcyc7XG5saW5rLnJlbCA9ICdzdHlsZXNoZWV0JztcblxuZG9jdW1lbnQuZ2V0RWxlbWVudHNCeVRhZ05hbWUoJ2hlYWQnKVswXS5hcHBlbmRDaGlsZChsaW5rKTtcblxubW9kdWxlLmV4cG9ydHMgPSBwcGJhOyIsInZhciBTdG9yZSA9IHJlcXVpcmUoJy4vc3RvcmUnKTtcbnZhciBMb2dnZXIgPSByZXF1aXJlKCcuL2xvZ2dlcicpO1xudmFyIERvbSA9IHJlcXVpcmUoJy4vZG9tJyk7XG52YXIgQ2FsbGVyID0gcmVxdWlyZSgnLi9jYWxsZXInKTtcblxudmFyIHVwbG9hZGluZyA9IGZhbHNlO1xuXG52YXIgQXZhdGFyQ3RybCA9IHtcblx0X3N1Ym1pdDogbnVsbCxcblx0X2ZpbGU6IG51bGwsXG5cdF9wcm9ncmVzczogbnVsbCxcblx0X3NpZGViYXJfYXZhdGFyOiBudWxsLFxuXHRfdG9wX2F2YXRhcjogbnVsbCxcblx0X3RvcF9hdmF0YXJfY29udGFpbmVyOiBudWxsLFxuXG5cdGluaXQ6IGZ1bmN0aW9uIGluaXQoKSB7XG5cdFx0QXZhdGFyQ3RybC5fc3VibWl0ID0gZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoJy0tLXB1cmVzZGstYXZhdGFyLXN1Ym1pdCcpO1xuXHRcdEF2YXRhckN0cmwuX2ZpbGUgPSBkb2N1bWVudC5nZXRFbGVtZW50QnlJZCgnLS0tcHVyZXNkay1hdmF0YXItZmlsZScpO1xuXHRcdEF2YXRhckN0cmwuX3RvcF9hdmF0YXJfY29udGFpbmVyID0gZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoJ2JhYy0taW1hZ2UtY29udGFpbmVyLXRvcCcpO1xuXHRcdEF2YXRhckN0cmwuX3Byb2dyZXNzID0gZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoJ2JhYy0tdXNlci1pbWFnZS11cGxvYWQtcHJvZ3Jlc3MnKTtcblx0XHRBdmF0YXJDdHJsLl9zaWRlYmFyX2F2YXRhciA9IGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKCdiYWMtLXVzZXItaW1hZ2UtZmlsZScpO1xuXHRcdEF2YXRhckN0cmwuX3RvcF9hdmF0YXIgPSBkb2N1bWVudC5nZXRFbGVtZW50QnlJZCgnYmFjLS11c2VyLWF2YXRhci10b3AnKTtcblx0XHRBdmF0YXJDdHJsLl9maWxlLmFkZEV2ZW50TGlzdGVuZXIoJ2NsaWNrJywgZnVuY3Rpb24gKGUpIHtcblx0XHRcdGUuc3RvcFByb3BhZ2F0aW9uKCk7XG5cdFx0fSk7XG5cdFx0QXZhdGFyQ3RybC5fZmlsZS5hZGRFdmVudExpc3RlbmVyKCdjaGFuZ2UnLCBmdW5jdGlvbiAoZSkge1xuXHRcdFx0QXZhdGFyQ3RybC51cGxvYWQoKTtcblx0XHR9KTtcblxuXHRcdGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKCdiYWMtLXVzZXItaW1hZ2UnKS5hZGRFdmVudExpc3RlbmVyKCdjbGljaycsIGZ1bmN0aW9uIChlKSB7XG5cdFx0XHRlLnN0b3BQcm9wYWdhdGlvbigpO1xuXHRcdFx0QXZhdGFyQ3RybC5fZmlsZS5jbGljaygpO1xuXHRcdH0pO1xuXHR9LFxuXG5cdHVwbG9hZDogZnVuY3Rpb24gdXBsb2FkKCkge1xuXHRcdGlmICh1cGxvYWRpbmcpIHtcblx0XHRcdHJldHVybjtcblx0XHR9XG5cdFx0dXBsb2FkaW5nID0gdHJ1ZTtcblxuXHRcdGlmIChBdmF0YXJDdHJsLl9maWxlLmZpbGVzLmxlbmd0aCA9PT0gMCkge1xuXHRcdFx0cmV0dXJuO1xuXHRcdH1cblxuXHRcdHZhciBkYXRhID0gbmV3IEZvcm1EYXRhKCk7XG5cdFx0ZGF0YS5hcHBlbmQoJ2ZpbGUnLCBBdmF0YXJDdHJsLl9maWxlLmZpbGVzWzBdKTtcblxuXHRcdHZhciBzdWNjZXNzQ2FsbGJhY2sgPSBmdW5jdGlvbiBzdWNjZXNzQ2FsbGJhY2soZGF0YSkge1xuXHRcdFx0O1xuXHRcdH07XG5cblx0XHR2YXIgZmFpbENhbGxiYWNrID0gZnVuY3Rpb24gZmFpbENhbGxiYWNrKGRhdGEpIHtcblx0XHRcdDtcblx0XHR9O1xuXG5cdFx0dmFyIHJlcXVlc3QgPSBuZXcgWE1MSHR0cFJlcXVlc3QoKTtcblx0XHRyZXF1ZXN0Lm9ucmVhZHlzdGF0ZWNoYW5nZSA9IGZ1bmN0aW9uICgpIHtcblx0XHRcdHVwbG9hZGluZyA9IGZhbHNlO1xuXHRcdFx0aWYgKHJlcXVlc3QucmVhZHlTdGF0ZSA9PSA0KSB7XG5cdFx0XHRcdHRyeSB7XG5cdFx0XHRcdFx0dmFyIGltYWdlRGF0YSA9IEpTT04ucGFyc2UocmVxdWVzdC5yZXNwb25zZSkuZGF0YTtcblx0XHRcdFx0XHRBdmF0YXJDdHJsLnNldEF2YXRhcihpbWFnZURhdGEudXJsKTtcblx0XHRcdFx0XHRDYWxsZXIubWFrZUNhbGwoe1xuXHRcdFx0XHRcdFx0dHlwZTogJ1BVVCcsXG5cdFx0XHRcdFx0XHRlbmRwb2ludDogU3RvcmUuZ2V0QXZhdGFyVXBkYXRlVXJsKCksXG5cdFx0XHRcdFx0XHRwYXJhbXM6IHtcblx0XHRcdFx0XHRcdFx0dXNlcjoge1xuXHRcdFx0XHRcdFx0XHRcdGF2YXRhcl91dWlkOiBpbWFnZURhdGEuZ3VpZFxuXHRcdFx0XHRcdFx0XHR9XG5cdFx0XHRcdFx0XHR9LFxuXHRcdFx0XHRcdFx0Y2FsbGJhY2tzOiB7XG5cdFx0XHRcdFx0XHRcdHN1Y2Nlc3M6IHN1Y2Nlc3NDYWxsYmFjayxcblx0XHRcdFx0XHRcdFx0ZmFpbDogZmFpbENhbGxiYWNrXG5cdFx0XHRcdFx0XHR9XG5cdFx0XHRcdFx0fSk7XG5cdFx0XHRcdH0gY2F0Y2ggKGUpIHtcblx0XHRcdFx0XHR2YXIgcmVzcCA9IHtcblx0XHRcdFx0XHRcdHN0YXR1czogJ2Vycm9yJyxcblx0XHRcdFx0XHRcdGRhdGE6ICdVbmtub3duIGVycm9yIG9jY3VycmVkOiBbJyArIHJlcXVlc3QucmVzcG9uc2VUZXh0ICsgJ10nXG5cdFx0XHRcdFx0fTtcblx0XHRcdFx0fVxuXHRcdFx0XHRMb2dnZXIubG9nKHJlcXVlc3QucmVzcG9uc2Uuc3RhdHVzICsgJzogJyArIHJlcXVlc3QucmVzcG9uc2UuZGF0YSk7XG5cdFx0XHR9XG5cdFx0fTtcblxuXHRcdC8vIHJlcXVlc3QudXBsb2FkLmFkZEV2ZW50TGlzdGVuZXIoJ3Byb2dyZXNzJywgZnVuY3Rpb24oZSl7XG5cdFx0Ly8gXHRMb2dnZXIubG9nKGUubG9hZGVkL2UudG90YWwpO1xuXHRcdC8vIFx0QXZhdGFyQ3RybC5fcHJvZ3Jlc3Muc3R5bGUudG9wID0gMTAwIC0gKGUubG9hZGVkL2UudG90YWwpICogMTAwICsgJyUnO1xuXHRcdC8vIH0sIGZhbHNlKTtcblxuXHRcdHZhciB1cmwgPSBTdG9yZS5nZXRBdmF0YXJVcGxvYWRVcmwoKTtcblx0XHREb20uYWRkQ2xhc3MoQXZhdGFyQ3RybC5fcHJvZ3Jlc3MsICctLXB1cmVzZGstdmlzaWJsZScpO1xuXHRcdHJlcXVlc3Qub3BlbignUE9TVCcsIHVybCk7XG5cdFx0cmVxdWVzdC5zZW5kKGRhdGEpO1xuXHR9LFxuXG5cdHNldEF2YXRhcjogZnVuY3Rpb24gc2V0QXZhdGFyKHVybCkge1xuXHRcdGlmICghdXJsKSB7XG5cdFx0XHRyZXR1cm47XG5cdFx0fVxuXG5cdFx0RG9tLnJlbW92ZUNsYXNzKEF2YXRhckN0cmwuX3Byb2dyZXNzLCAnLS1wdXJlc2RrLXZpc2libGUnKTtcblx0XHREb20uYWRkQ2xhc3MoQXZhdGFyQ3RybC5fc2lkZWJhcl9hdmF0YXIsICctLXB1cmVzZGstdmlzaWJsZScpO1xuXHRcdHZhciBpbWcgPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KCdpbWcnKTtcblx0XHRpbWcuc3JjID0gdXJsO1xuXHRcdEF2YXRhckN0cmwuX3NpZGViYXJfYXZhdGFyLmlubmVySFRNTCA9ICcnO1xuXHRcdEF2YXRhckN0cmwuX3NpZGViYXJfYXZhdGFyLmFwcGVuZENoaWxkKGltZyk7XG5cblx0XHREb20uYWRkQ2xhc3MoQXZhdGFyQ3RybC5fdG9wX2F2YXRhcl9jb250YWluZXIsICctLXB1cmVzZGstdmlzaWJsZScpO1xuXHRcdHZhciBpbWdfMiA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoJ2ltZycpO1xuXHRcdGltZ18yLnNyYyA9IHVybDtcblx0XHRBdmF0YXJDdHJsLl90b3BfYXZhdGFyX2NvbnRhaW5lci5pbm5lckhUTUwgPSAnJztcblx0XHRBdmF0YXJDdHJsLl90b3BfYXZhdGFyX2NvbnRhaW5lci5hcHBlbmRDaGlsZChpbWdfMik7XG5cblx0XHQvLyAgYmFjLS1pbWFnZS1jb250YWluZXItdG9wXG5cdH1cbn07XG5cbm1vZHVsZS5leHBvcnRzID0gQXZhdGFyQ3RybDsiLCJ2YXIgU3RvcmUgPSByZXF1aXJlKCcuL3N0b3JlLmpzJyk7XG52YXIgTG9nZ2VyID0gcmVxdWlyZSgnLi9sb2dnZXInKTtcblxudmFyIENhbGxlciA9IHtcblx0LypcbiBleHBlY3RlIGF0dHJpYnV0ZXM6XG4gLSB0eXBlIChlaXRoZXIgR0VULCBQT1NULCBERUxFVEUsIFBVVClcbiAtIGVuZHBvaW50XG4gLSBwYXJhbXMgKGlmIGFueS4gQSBqc29uIHdpdGggcGFyYW1ldGVycyB0byBiZSBwYXNzZWQgYmFjayB0byB0aGUgZW5kcG9pbnQpXG4gLSBjYWxsYmFja3M6IGFuIG9iamVjdCB3aXRoOlxuIFx0LSBzdWNjZXNzOiB0aGUgc3VjY2VzcyBjYWxsYmFja1xuIFx0LSBmYWlsOiB0aGUgZmFpbCBjYWxsYmFja1xuICAqL1xuXHRtYWtlQ2FsbDogZnVuY3Rpb24gbWFrZUNhbGwoYXR0cnMpIHtcblx0XHR2YXIgZW5kcG9pbnRVcmwgPSBhdHRycy5lbmRwb2ludDtcblxuXHRcdHZhciB4aHIgPSBuZXcgWE1MSHR0cFJlcXVlc3QoKTtcblx0XHR4aHIub3BlbihhdHRycy50eXBlLCBlbmRwb2ludFVybCk7XG5cdFx0Ly94aHIud2l0aENyZWRlbnRpYWxzID0gdHJ1ZTtcblx0XHR4aHIuc2V0UmVxdWVzdEhlYWRlcignQ29udGVudC1UeXBlJywgJ2FwcGxpY2F0aW9uL2pzb24nKTtcblx0XHR4aHIub25sb2FkID0gZnVuY3Rpb24gKCkge1xuXHRcdFx0aWYgKHhoci5zdGF0dXMgPj0gMjAwICYmIHhoci5zdGF0dXMgPCAzMDApIHtcblx0XHRcdFx0YXR0cnMuY2FsbGJhY2tzLnN1Y2Nlc3MoSlNPTi5wYXJzZSh4aHIucmVzcG9uc2VUZXh0KSk7XG5cdFx0XHR9IGVsc2UgaWYgKHhoci5zdGF0dXMgIT09IDIwMCkge1xuXHRcdFx0XHRhdHRycy5jYWxsYmFja3MuZmFpbChKU09OLnBhcnNlKHhoci5yZXNwb25zZVRleHQpKTtcblx0XHRcdH1cblx0XHR9O1xuXG5cdFx0aWYgKCFhdHRycy5wYXJhbXMpIHtcblx0XHRcdGF0dHJzLnBhcmFtcyA9IHt9O1xuXHRcdH1cblx0XHR4aHIuc2VuZChKU09OLnN0cmluZ2lmeShhdHRycy5wYXJhbXMpKTtcblx0fSxcblxuXHRwcm9taXNlQ2FsbDogZnVuY3Rpb24gcHJvbWlzZUNhbGwoYXR0cnMpIHtcblx0XHRyZXR1cm4gbmV3IFByb21pc2UoZnVuY3Rpb24gKHJlc29sdmUsIHJlamVjdCkge1xuXHRcdFx0dmFyIHhociA9IG5ldyBYTUxIdHRwUmVxdWVzdCgpO1xuXHRcdFx0eGhyLm9wZW4oYXR0cnMudHlwZSwgYXR0cnMuZW5kcG9pbnQpO1xuXHRcdFx0eGhyLnNldFJlcXVlc3RIZWFkZXIoJ0NvbnRlbnQtVHlwZScsICdhcHBsaWNhdGlvbi9qc29uJyk7XG5cdFx0XHR4aHIub25sb2FkID0gZnVuY3Rpb24gKCkge1xuXHRcdFx0XHRpZiAodGhpcy5zdGF0dXMgPj0gMjAwICYmIHRoaXMuc3RhdHVzIDwgMzAwKSB7XG5cdFx0XHRcdFx0YXR0cnMubWlkZGxld2FyZXMuc3VjY2VzcyhKU09OLnBhcnNlKHhoci5yZXNwb25zZVRleHQpKTtcblx0XHRcdFx0XHRyZXNvbHZlKEpTT04ucGFyc2UoeGhyLnJlc3BvbnNlVGV4dCkpO1xuXHRcdFx0XHR9IGVsc2Uge1xuXHRcdFx0XHRcdHdpbmRvdy5sb2NhdGlvbi5ocmVmID0gU3RvcmUuZ2V0TG9naW5VcmwoKTtcblx0XHRcdFx0fVxuXHRcdFx0fTtcblx0XHRcdHhoci5vbmVycm9yID0gZnVuY3Rpb24gKCkge1xuXHRcdFx0XHR3aW5kb3cubG9jYXRpb24gPSBTdG9yZS5nZXRMb2dpblVybCgpO1xuXHRcdFx0fTtcblx0XHRcdHhoci5zZW5kKCk7XG5cdFx0fSk7XG5cdH1cbn07XG5cbm1vZHVsZS5leHBvcnRzID0gQ2FsbGVyOyIsInZhciBEb20gPSB7XG4gICAgaGFzQ2xhc3M6IGZ1bmN0aW9uIGhhc0NsYXNzKGVsLCBjbGFzc05hbWUpIHtcbiAgICAgICAgaWYgKGVsLmNsYXNzTGlzdCkgcmV0dXJuIGVsLmNsYXNzTGlzdC5jb250YWlucyhjbGFzc05hbWUpO2Vsc2UgcmV0dXJuIG5ldyBSZWdFeHAoJyhefCApJyArIGNsYXNzTmFtZSArICcoIHwkKScsICdnaScpLnRlc3QoZWwuY2xhc3NOYW1lKTtcbiAgICB9LFxuXG4gICAgcmVtb3ZlQ2xhc3M6IGZ1bmN0aW9uIHJlbW92ZUNsYXNzKGVsLCBjbGFzc05hbWUpIHtcbiAgICAgICAgaWYgKGVsLmNsYXNzTGlzdCkgZWwuY2xhc3NMaXN0LnJlbW92ZShjbGFzc05hbWUpO2Vsc2UgZWwuY2xhc3NOYW1lID0gZWwuY2xhc3NOYW1lLnJlcGxhY2UobmV3IFJlZ0V4cCgnKF58XFxcXGIpJyArIGNsYXNzTmFtZS5zcGxpdCgnICcpLmpvaW4oJ3wnKSArICcoXFxcXGJ8JCknLCAnZ2knKSwgJyAnKTtcbiAgICB9LFxuXG4gICAgYWRkQ2xhc3M6IGZ1bmN0aW9uIGFkZENsYXNzKGVsLCBjbGFzc05hbWUpIHtcbiAgICAgICAgaWYgKGVsLmNsYXNzTGlzdCkgZWwuY2xhc3NMaXN0LmFkZChjbGFzc05hbWUpO2Vsc2UgZWwuY2xhc3NOYW1lICs9ICcgJyArIGNsYXNzTmFtZTtcbiAgICB9LFxuXG4gICAgdG9nZ2xlQ2xhc3M6IGZ1bmN0aW9uIHRvZ2dsZUNsYXNzKGVsLCBjbGFzc05hbWUpIHtcbiAgICAgICAgaWYgKHRoaXMuaGFzQ2xhc3MoZWwsIGNsYXNzTmFtZSkpIHtcbiAgICAgICAgICAgIHRoaXMucmVtb3ZlQ2xhc3MoZWwsIGNsYXNzTmFtZSk7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICB0aGlzLmFkZENsYXNzKGVsLCBjbGFzc05hbWUpO1xuICAgICAgICB9XG4gICAgfVxufTtcblxubW9kdWxlLmV4cG9ydHMgPSBEb207IiwidmFyIGRvbSA9IHJlcXVpcmUoJy4vZG9tJyk7XG5cbnZhciBkZWZhdWx0SGlkZUluID0gNTAwMDtcbnZhciBsYXN0SW5kZXggPSAxO1xuXG52YXIgaW5mb0Jsb2NrcyA9IFtdO1xuXG52YXIgSW5mb0NvbnRyb2xsZXIgPSB7XG5cdGluaXQ6IGZ1bmN0aW9uIGluaXQoKSB7XG5cdFx0Zm9yICh2YXIgaSA9IDE7IGkgPCA1OyBpKyspIHtcblx0XHRcdChmdW5jdGlvbiB4KGkpIHtcblx0XHRcdFx0dmFyIGNsb3NlRnVuY3Rpb24gPSBmdW5jdGlvbiBjbG9zZUZ1bmN0aW9uKCkge1xuXHRcdFx0XHRcdGRvbS5yZW1vdmVDbGFzcyhkb2N1bWVudC5nZXRFbGVtZW50QnlJZCgnLS1wdXJlc2RrLWluZm8tYm94LS0nICsgaSksICdiYWMtLWFjdGl2ZS0tJyk7XG5cdFx0XHRcdFx0ZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoJ2JhYy0tdGltZXInICsgaSkuc3R5bGUudHJhbnNpdGlvbiA9ICcnO1xuXHRcdFx0XHRcdGRvbS5yZW1vdmVDbGFzcyhkb2N1bWVudC5nZXRFbGVtZW50QnlJZCgnYmFjLS10aW1lcicgKyBpKSwgJ2JhYy0tZnVsbHdpZHRoJyk7XG5cdFx0XHRcdFx0aW5mb0Jsb2Nrc1tpIC0gMV0uaW5Vc2UgPSBmYWxzZTtcblx0XHRcdFx0XHRzZXRUaW1lb3V0KGZ1bmN0aW9uICgpIHtcblx0XHRcdFx0XHRcdGlmIChpbmZvQmxvY2tzW2kgLSAxXS5jbG9zZVRpbWVvdXQpIHtcblx0XHRcdFx0XHRcdFx0Y2xlYXJUaW1lb3V0KGluZm9CbG9ja3NbaSAtIDFdLmNsb3NlVGltZW91dCk7XG5cdFx0XHRcdFx0XHR9XG5cdFx0XHRcdFx0XHRkb20ucmVtb3ZlQ2xhc3MoZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoJy0tcHVyZXNkay1pbmZvLWJveC0tJyArIGkpLCAnYmFjLS1zdWNjZXNzJyk7XG5cdFx0XHRcdFx0XHRkb20ucmVtb3ZlQ2xhc3MoZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoJy0tcHVyZXNkay1pbmZvLWJveC0tJyArIGkpLCAnYmFjLS1pbmZvJyk7XG5cdFx0XHRcdFx0XHRkb20ucmVtb3ZlQ2xhc3MoZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoJy0tcHVyZXNkay1pbmZvLWJveC0tJyArIGkpLCAnYmFjLS13YXJuaW5nJyk7XG5cdFx0XHRcdFx0XHRkb20ucmVtb3ZlQ2xhc3MoZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoJy0tcHVyZXNkay1pbmZvLWJveC0tJyArIGkpLCAnYmFjLS1lcnJvcicpO1xuXHRcdFx0XHRcdH0sIDQ1MCk7XG5cdFx0XHRcdH07XG5cblx0XHRcdFx0dmFyIGFkZFRleHQgPSBmdW5jdGlvbiBhZGRUZXh0KHRleHQpIHtcblx0XHRcdFx0XHRkb2N1bWVudC5nZXRFbGVtZW50QnlJZCgnYmFjLS1pbmZvLW1haW4tdGV4dC0tJyArIGkpLmlubmVySFRNTCA9IHRleHQ7XG5cdFx0XHRcdH07XG5cblx0XHRcdFx0dmFyIGFkZFRpbWVvdXQgPSBmdW5jdGlvbiBhZGRUaW1lb3V0KHRpbWVvdXRNc2Vjcykge1xuXHRcdFx0XHRcdGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKCdiYWMtLXRpbWVyJyArIGkpLnN0eWxlLnRyYW5zaXRpb24gPSAnd2lkdGggJyArIHRpbWVvdXRNc2VjcyArICdtcyc7XG5cdFx0XHRcdFx0ZG9tLmFkZENsYXNzKGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKCdiYWMtLXRpbWVyJyArIGkpLCAnYmFjLS1mdWxsd2lkdGgnKTtcblx0XHRcdFx0XHRpbmZvQmxvY2tzW2kgLSAxXS5jbG9zZVRpbWVvdXQgPSBzZXRUaW1lb3V0KGZ1bmN0aW9uICgpIHtcblx0XHRcdFx0XHRcdGluZm9CbG9ja3NbaSAtIDFdLmNsb3NlRnVuY3Rpb24oKTtcblx0XHRcdFx0XHR9LCB0aW1lb3V0TXNlY3MpO1xuXHRcdFx0XHR9O1xuXG5cdFx0XHRcdGluZm9CbG9ja3MucHVzaCh7XG5cdFx0XHRcdFx0aWQ6IGksXG5cdFx0XHRcdFx0aW5Vc2U6IGZhbHNlLFxuXHRcdFx0XHRcdGVsZW1lbnQ6IGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKCctLXB1cmVzZGstaW5mby1ib3gtLScgKyBpKSxcblx0XHRcdFx0XHRjbG9zZUZ1bmN0aW9uOiBjbG9zZUZ1bmN0aW9uLFxuXHRcdFx0XHRcdGFkZFRleHQ6IGFkZFRleHQsXG5cdFx0XHRcdFx0YWRkVGltZW91dDogYWRkVGltZW91dCxcblx0XHRcdFx0XHRjbG9zZVRpbWVvdXQ6IGZhbHNlXG5cdFx0XHRcdH0pO1xuXHRcdFx0XHRkb2N1bWVudC5nZXRFbGVtZW50QnlJZCgnYmFjLS1pbmZvLWNsb3NlLWJ1dHRvbi0tJyArIGkpLm9uY2xpY2sgPSBmdW5jdGlvbiAoZSkge1xuXHRcdFx0XHRcdGNsb3NlRnVuY3Rpb24oaSk7XG5cdFx0XHRcdH07XG5cdFx0XHR9KShpKTtcblx0XHR9XG5cdH0sXG5cblx0LypcbiAgdHlwZTogb25lIG9mOlxuIFx0LSBzdWNjZXNzXG4gXHQtIGluZm9cbiBcdC0gd2FybmluZ1xuIFx0LSBlcnJvclxuICB0ZXh0OiB0aGUgdGV4dCB0byBkaXNwbGF5XG4gIG9wdGlvbnMgKG9wdGlvbmFsKToge1xuICBcdFx0aGlkZUluOiBtaWxsaXNlY29uZHMgdG8gaGlkZSBpdC4gLTEgZm9yIG5vdCBoaWRpbmcgaXQgYXQgYWxsLiBEZWZhdWx0IGlzIDUwMDBcbiAgfVxuICAqL1xuXHRzaG93SW5mbzogZnVuY3Rpb24gc2hvd0luZm8odHlwZSwgdGV4dCwgb3B0aW9ucykge1xuXHRcdGZvciAodmFyIGkgPSAwOyBpIDwgaW5mb0Jsb2Nrcy5sZW5ndGg7IGkrKykge1xuXHRcdFx0dmFyIGluZm9CbG9jayA9IGluZm9CbG9ja3NbaV07XG5cdFx0XHRpZiAoIWluZm9CbG9jay5pblVzZSkge1xuXHRcdFx0XHRpbmZvQmxvY2suaW5Vc2UgPSB0cnVlO1xuXHRcdFx0XHRpbmZvQmxvY2suZWxlbWVudC5zdHlsZS56SW5kZXggPSBsYXN0SW5kZXg7XG5cdFx0XHRcdGluZm9CbG9jay5hZGRUZXh0KHRleHQpO1xuXHRcdFx0XHRsYXN0SW5kZXggKz0gMTtcblx0XHRcdFx0dmFyIHRpbWVvdXRtU2VjcyA9IGRlZmF1bHRIaWRlSW47XG5cdFx0XHRcdHZhciBhdXRvQ2xvc2UgPSB0cnVlO1xuXHRcdFx0XHRpZiAob3B0aW9ucykge1xuXHRcdFx0XHRcdGlmIChvcHRpb25zLmhpZGVJbiAhPSBudWxsICYmIG9wdGlvbnMuaGlkZUluICE9IHVuZGVmaW5lZCAmJiBvcHRpb25zLmhpZGVJbiAhPSAtMSkge1xuXHRcdFx0XHRcdFx0dGltZW91dG1TZWNzID0gb3B0aW9ucy5oaWRlSW47XG5cdFx0XHRcdFx0fSBlbHNlIGlmIChvcHRpb25zLmhpZGVJbiA9PT0gLTEpIHtcblx0XHRcdFx0XHRcdGF1dG9DbG9zZSA9IGZhbHNlO1xuXHRcdFx0XHRcdH1cblx0XHRcdFx0fVxuXHRcdFx0XHRpZiAoYXV0b0Nsb3NlKSB7XG5cdFx0XHRcdFx0aW5mb0Jsb2NrLmFkZFRpbWVvdXQodGltZW91dG1TZWNzKTtcblx0XHRcdFx0fVxuXHRcdFx0XHRkb20uYWRkQ2xhc3MoaW5mb0Jsb2NrLmVsZW1lbnQsICdiYWMtLScgKyB0eXBlKTtcblx0XHRcdFx0ZG9tLmFkZENsYXNzKGluZm9CbG9jay5lbGVtZW50LCAnYmFjLS1hY3RpdmUtLScpO1xuXHRcdFx0XHRyZXR1cm47XG5cdFx0XHR9XG5cdFx0fVxuXHR9XG59O1xuXG5tb2R1bGUuZXhwb3J0cyA9IEluZm9Db250cm9sbGVyOyIsInZhciBTdG9yZSA9IHJlcXVpcmUoJy4vc3RvcmUuanMnKTtcblxudmFyIExvZ2dlciA9IHtcblx0XHRsb2c6IGZ1bmN0aW9uIGxvZyh3aGF0KSB7XG5cdFx0XHRcdGlmICghU3RvcmUubG9nc0VuYWJsZWQoKSkge1xuXHRcdFx0XHRcdFx0cmV0dXJuIGZhbHNlO1xuXHRcdFx0XHR9IGVsc2Uge1xuXHRcdFx0XHRcdFx0TG9nZ2VyLmxvZyA9IGNvbnNvbGUubG9nLmJpbmQoY29uc29sZSk7XG5cdFx0XHRcdFx0XHRMb2dnZXIubG9nKHdoYXQpO1xuXHRcdFx0XHR9XG5cdFx0fSxcblx0XHRlcnJvcjogZnVuY3Rpb24gZXJyb3IoZXJyKSB7XG5cdFx0XHRcdGlmICghU3RvcmUubG9nc0VuYWJsZWQoKSkge1xuXHRcdFx0XHRcdFx0cmV0dXJuIGZhbHNlO1xuXHRcdFx0XHR9IGVsc2Uge1xuXHRcdFx0XHRcdFx0TG9nZ2VyLmVycm9yID0gY29uc29sZS5lcnJvci5iaW5kKGNvbnNvbGUpO1xuXHRcdFx0XHRcdFx0TG9nZ2VyLmVycm9yKGVycik7XG5cdFx0XHRcdH1cblx0XHR9XG59O1xuXG5tb2R1bGUuZXhwb3J0cyA9IExvZ2dlcjsiLCIndXNlIHN0cmljdCc7XG5cbnZhciBTdG9yZSA9IHJlcXVpcmUoJy4vc3RvcmUuanMnKTtcbnZhciBMb2dnZXIgPSByZXF1aXJlKCcuL2xvZ2dlci5qcycpO1xuXG52YXIgYXZhaWxhYmxlTGlzdGVuZXJzID0ge1xuXHRzZWFyY2hLZXlVcDoge1xuXHRcdGluZm86ICdMaXN0ZW5lciBvbiBrZXlVcCBvZiBzZWFyY2ggaW5wdXQgb24gdG9wIGJhcidcblx0fSxcblx0c2VhcmNoRW50ZXI6IHtcblx0XHRpbmZvOiAnTGlzdGVuZXIgb24gZW50ZXIga2V5IHByZXNzZWQgb24gc2VhcmNoIGlucHV0IG9uIHRvcCBiYXInXG5cdH0sXG5cdHNlYXJjaE9uQ2hhbmdlOiB7XG5cdFx0aW5mbzogJ0xpc3RlbmVyIG9uIGNoYW5nZSBvZiBpbnB1dCB2YWx1ZSdcblx0fVxufTtcblxudmFyIFB1YlN1YiA9IHtcblx0Z2V0QXZhaWxhYmxlTGlzdGVuZXJzOiBmdW5jdGlvbiBnZXRBdmFpbGFibGVMaXN0ZW5lcnMoKSB7XG5cdFx0cmV0dXJuIGF2YWlsYWJsZUxpc3RlbmVycztcblx0fSxcblxuXHRzdWJzY3JpYmU6IGZ1bmN0aW9uIHN1YnNjcmliZShldmVudHQsIGZ1bmN0KSB7XG5cdFx0aWYgKGV2ZW50dCA9PT0gXCJzZWFyY2hLZXlVcFwiKSB7XG5cdFx0XHR2YXIgZWwgPSBkb2N1bWVudC5nZXRFbGVtZW50QnlJZChTdG9yZS5nZXRTZWFyY2hJbnB1dElkKCkpO1xuXHRcdFx0ZWwuYWRkRXZlbnRMaXN0ZW5lcigna2V5dXAnLCBmdW5jdCk7XG5cdFx0XHRyZXR1cm4gZnVuY3Rpb24gKCkge1xuXHRcdFx0XHRlbC5yZW1vdmVFdmVudExpc3RlbmVyKCdrZXl1cCcsIGZ1bmN0LCBmYWxzZSk7XG5cdFx0XHR9O1xuXHRcdH0gZWxzZSBpZiAoZXZlbnR0ID09PSAnc2VhcmNoRW50ZXInKSB7XG5cdFx0XHR2YXIgaGFuZGxpbmdGdW5jdCA9IGZ1bmN0aW9uIGhhbmRsaW5nRnVuY3QoZSkge1xuXHRcdFx0XHRpZiAoZS5rZXlDb2RlID09PSAxMykge1xuXHRcdFx0XHRcdGZ1bmN0KGUpO1xuXHRcdFx0XHR9XG5cdFx0XHR9O1xuXHRcdFx0ZWwuYWRkRXZlbnRMaXN0ZW5lcigna2V5ZG93bicsIGhhbmRsaW5nRnVuY3QpO1xuXHRcdFx0cmV0dXJuIGZ1bmN0aW9uICgpIHtcblx0XHRcdFx0ZWwucmVtb3ZlRXZlbnRMaXN0ZW5lcigna2V5ZG93bicsIGhhbmRsaW5nRnVuY3QsIGZhbHNlKTtcblx0XHRcdH07XG5cdFx0fSBlbHNlIGlmIChldmVudHQgPT09ICdzZWFyY2hPbkNoYW5nZScpIHtcblx0XHRcdHZhciBlbCA9IGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKFN0b3JlLmdldFNlYXJjaElucHV0SWQoKSk7XG5cdFx0XHRlbC5hZGRFdmVudExpc3RlbmVyKCdjaGFuZ2UnLCBmdW5jdCk7XG5cdFx0XHRyZXR1cm4gZnVuY3Rpb24gKCkge1xuXHRcdFx0XHRlbC5yZW1vdmVFdmVudExpc3RlbmVyKCdrZXl1cCcsIGZ1bmN0LCBmYWxzZSk7XG5cdFx0XHR9O1xuXHRcdH0gZWxzZSB7XG5cdFx0XHRMb2dnZXIuZXJyb3IoJ1RoZSBldmVudCB5b3UgdHJpZWQgdG8gc3Vic2NyaWJlIGlzIG5vdCBhdmFpbGFibGUgYnkgdGhlIGxpYnJhcnknKTtcblx0XHRcdExvZ2dlci5sb2coJ1RoZSBhdmFpbGFibGUgZXZlbnRzIGFyZTogJywgYXZhaWxhYmxlTGlzdGVuZXJzKTtcblx0XHRcdHJldHVybiBmdW5jdGlvbiAoKSB7fTtcblx0XHR9XG5cdH1cbn07XG5cbm1vZHVsZS5leHBvcnRzID0gUHViU3ViOyIsInZhciBzdGF0ZSA9IHtcblx0Z2VuZXJhbDoge30sXG5cdHVzZXJEYXRhOiB7fSxcblx0Y29uZmlndXJhdGlvbjoge30sXG5cdGh0bWxUZW1wbGF0ZTogXCJcIixcblx0YXBwczogbnVsbFxufTtcblxuZnVuY3Rpb24gYXNzZW1ibGUobGl0ZXJhbCwgcGFyYW1zKSB7XG5cdHJldHVybiBuZXcgRnVuY3Rpb24ocGFyYW1zLCBcInJldHVybiBgXCIgKyBsaXRlcmFsICsgXCJgO1wiKTtcbn1cblxudmFyIFN0b3JlID0ge1xuXHRnZXRTdGF0ZTogZnVuY3Rpb24gZ2V0U3RhdGUoKSB7XG5cdFx0cmV0dXJuIE9iamVjdC5hc3NpZ24oe30sIHN0YXRlKTtcblx0fSxcblxuXHRzZXRXaW5kb3dOYW1lOiBmdW5jdGlvbiBzZXRXaW5kb3dOYW1lKHduKSB7XG5cdFx0c3RhdGUuZ2VuZXJhbC53aW5kb3dOYW1lID0gd247XG5cdH0sXG5cblx0LypcbiAgY29uZjpcbiAgLSBoZWFkZXJEaXZJZFxuICAtIGluY2x1ZGVBcHBzTWVudVxuICAqL1xuXHRzZXRDb25maWd1cmF0aW9uOiBmdW5jdGlvbiBzZXRDb25maWd1cmF0aW9uKGNvbmYpIHtcblx0XHRzdGF0ZS5jb25maWd1cmF0aW9uID0gY29uZjtcblx0fSxcblxuXHRnZXRBcHBzVmlzaWJsZTogZnVuY3Rpb24gZ2V0QXBwc1Zpc2libGUoKSB7XG5cdFx0aWYgKHN0YXRlLmNvbmZpZ3VyYXRpb24uYXBwc1Zpc2libGUgPT09IG51bGwgfHwgc3RhdGUuY29uZmlndXJhdGlvbi5hcHBzVmlzaWJsZSA9PT0gdW5kZWZpbmVkKSB7XG5cdFx0XHRyZXR1cm4gdHJ1ZTtcblx0XHR9IGVsc2Uge1xuXHRcdFx0cmV0dXJuIHN0YXRlLmNvbmZpZ3VyYXRpb24uYXBwc1Zpc2libGU7XG5cdFx0fVxuXHR9LFxuXG5cdHNldEFwcHNWaXNpYmxlOiBmdW5jdGlvbiBzZXRBcHBzVmlzaWJsZShhcHBzVmlzaWJsZSkge1xuXHRcdHN0YXRlLmNvbmZpZ3VyYXRpb24uYXBwc1Zpc2libGUgPSBhcHBzVmlzaWJsZTtcblx0fSxcblxuXHRzZXRIVE1MVGVtcGxhdGU6IGZ1bmN0aW9uIHNldEhUTUxUZW1wbGF0ZSh0ZW1wbGF0ZSkge1xuXHRcdHN0YXRlLmh0bWxUZW1wbGF0ZSA9IHRlbXBsYXRlO1xuXHR9LFxuXG5cdHNldEFwcHM6IGZ1bmN0aW9uIHNldEFwcHMoYXBwcykge1xuXHRcdHN0YXRlLmFwcHMgPSBhcHBzO1xuXHR9LFxuXG5cdGdldExvZ2luVXJsOiBmdW5jdGlvbiBnZXRMb2dpblVybCgpIHtcblx0XHRyZXR1cm4gc3RhdGUuY29uZmlndXJhdGlvbi5yb290VXJsICsgc3RhdGUuY29uZmlndXJhdGlvbi5sb2dpblVybCArIFwiP1wiICsgc3RhdGUuY29uZmlndXJhdGlvbi5yZWRpcmVjdFVybFBhcmFtICsgXCI9XCIgKyB3aW5kb3cubG9jYXRpb24uaHJlZjtcblx0fSxcblxuXHRnZXRBdXRoZW50aWNhdGlvbkVuZHBvaW50OiBmdW5jdGlvbiBnZXRBdXRoZW50aWNhdGlvbkVuZHBvaW50KCkge1xuXHRcdHJldHVybiBzdGF0ZS5jb25maWd1cmF0aW9uLnJvb3RVcmwgKyBzdGF0ZS5jb25maWd1cmF0aW9uLmJhc2VVcmwgKyAnc2Vzc2lvbic7XG5cdH0sXG5cblx0Z2V0U3dpdGNoQWNjb3VudEVuZHBvaW50OiBmdW5jdGlvbiBnZXRTd2l0Y2hBY2NvdW50RW5kcG9pbnQoYWNjb3VudElkKSB7XG5cdFx0cmV0dXJuIHN0YXRlLmNvbmZpZ3VyYXRpb24ucm9vdFVybCArIHN0YXRlLmNvbmZpZ3VyYXRpb24uYmFzZVVybCArICdhY2NvdW50cy9zd2l0Y2gvJyArIGFjY291bnRJZDtcblx0fSxcblxuXHRnZXRBcHBzRW5kcG9pbnQ6IGZ1bmN0aW9uIGdldEFwcHNFbmRwb2ludCgpIHtcblx0XHRyZXR1cm4gc3RhdGUuY29uZmlndXJhdGlvbi5yb290VXJsICsgc3RhdGUuY29uZmlndXJhdGlvbi5iYXNlVXJsICsgJ2FwcHMnO1xuXHR9LFxuXG5cdGxvZ3NFbmFibGVkOiBmdW5jdGlvbiBsb2dzRW5hYmxlZCgpIHtcblx0XHRyZXR1cm4gc3RhdGUuY29uZmlndXJhdGlvbi5sb2dzO1xuXHR9LFxuXG5cdGdldFNlYXJjaElucHV0SWQ6IGZ1bmN0aW9uIGdldFNlYXJjaElucHV0SWQoKSB7XG5cdFx0cmV0dXJuIHN0YXRlLmNvbmZpZ3VyYXRpb24uc2VhcmNoSW5wdXRJZDtcblx0fSxcblxuXHRzZXRIVE1MQ29udGFpbmVyOiBmdW5jdGlvbiBzZXRIVE1MQ29udGFpbmVyKGlkKSB7XG5cdFx0c3RhdGUuY29uZmlndXJhdGlvbi5oZWFkZXJEaXZJZCA9IGlkO1xuXHR9LFxuXG5cdGdldEhUTE1Db250YWluZXI6IGZ1bmN0aW9uIGdldEhUTE1Db250YWluZXIoKSB7XG5cdFx0aWYgKHN0YXRlLmNvbmZpZ3VyYXRpb24uaGVhZGVyRGl2SWQpIHtcblx0XHRcdHJldHVybiBzdGF0ZS5jb25maWd1cmF0aW9uLmhlYWRlckRpdklkO1xuXHRcdH0gZWxzZSB7XG5cdFx0XHRyZXR1cm4gXCJwcHNkay1jb250YWluZXJcIjtcblx0XHR9XG5cdH0sXG5cblx0Z2V0SFRNTDogZnVuY3Rpb24gZ2V0SFRNTCgpIHtcblx0XHRyZXR1cm4gc3RhdGUuaHRtbFRlbXBsYXRlO1xuXHR9LFxuXG5cdGdldFdpbmRvd05hbWU6IGZ1bmN0aW9uIGdldFdpbmRvd05hbWUoKSB7XG5cdFx0cmV0dXJuIHN0YXRlLmdlbmVyYWwud2luZG93TmFtZTtcblx0fSxcblxuXHRzZXRVc2VyRGF0YTogZnVuY3Rpb24gc2V0VXNlckRhdGEodXNlckRhdGEpIHtcblx0XHRzdGF0ZS51c2VyRGF0YSA9IHVzZXJEYXRhO1xuXHR9LFxuXG5cdGdldFVzZXJEYXRhOiBmdW5jdGlvbiBnZXRVc2VyRGF0YSgpIHtcblx0XHRyZXR1cm4gc3RhdGUudXNlckRhdGE7XG5cdH0sXG5cblx0c2V0Um9vdFVybDogZnVuY3Rpb24gc2V0Um9vdFVybChyb290VXJsKSB7XG5cdFx0c3RhdGUuY29uZmlndXJhdGlvbi5yb290VXJsID0gcm9vdFVybDtcblx0fSxcblxuXHRnZXRBdmF0YXJVcGxvYWRVcmw6IGZ1bmN0aW9uIGdldEF2YXRhclVwbG9hZFVybCgpIHtcblx0XHRyZXR1cm4gc3RhdGUuY29uZmlndXJhdGlvbi5yb290VXJsICsgc3RhdGUuY29uZmlndXJhdGlvbi5iYXNlVXJsICsgJ2Fzc2V0cy91cGxvYWQnO1xuXHR9LFxuXG5cdGdldEF2YXRhclVwZGF0ZVVybDogZnVuY3Rpb24gZ2V0QXZhdGFyVXBkYXRlVXJsKCkge1xuXHRcdHJldHVybiBzdGF0ZS5jb25maWd1cmF0aW9uLnJvb3RVcmwgKyBzdGF0ZS5jb25maWd1cmF0aW9uLmJhc2VVcmwgKyAndXNlcnMvYXZhdGFyJztcblx0fVxufTtcblxubW9kdWxlLmV4cG9ydHMgPSBTdG9yZTsiXX0=
