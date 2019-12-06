"use strict";

var Logger = require('./modules/logger');

var PubSub = require('./modules/pubsub');

var Caller = require('./modules/caller');

var Dom = require('./modules/dom');

var InfoController = require('./modules/info-controller');

var AvatarController = require('./modules/avatar-controller');

var Store = require('./modules/store');

var Cloudinary = require('./modules/cloudinary-image-picker');

var ACG = require('./modules/account-consistency-guard');

var ppbaConf = {};

if (typeof Promise === 'undefined') {
  require('promise/lib/rejection-tracking').enable();

  window.Promise = require('promise/lib/es6-extensions.js');
}

var afterRender = function afterRender() {
  if (Store.getFullWidth() === true) {
    Dom.addClass(document.getElementById("bac--puresdk-bac--header-apps--"), 'bac--fullwidth');
  }

  document.getElementById('bac--puresdk--apps--opener--').addEventListener('click', function (e) {
    e.preventDefault();
    e.stopPropagation();
    Dom.toggleClass(document.getElementById('bac--puresdk-apps-container--'), 'active');
  });
  document.getElementById('bac--user-avatar-top').addEventListener('click', function (e) {
    e.stopPropagation();
    Dom.removeClass(document.getElementById('bac--puresdk-apps-container--'), 'active');
    Dom.toggleClass(document.getElementById('bac--puresdk-user-sidebar--'), 'active');
  });
  window.addEventListener('click', function (e) {
    Dom.removeClass(document.getElementById('bac--puresdk-apps-container--'), 'active');
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

      if (conf.fullWidth) {
        Store.setFullWidth(conf.fullWidth);
      }

      if (conf.displaySupport) {
        Store.setDisplaySupport(conf.displaySupport);
      }

      if (conf.appInfo) {
        Store.setAppInfo(conf.appInfo); // if google tag manager is present it will push the user's info to dataLayer

        try {
          dataLayer.push({
            'app': conf.appInfo.name
          });
        } catch (e) {// no Google Tag has been set
        }
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
  setupGoogleTag: function setupGoogleTag(user) {
    // if google tag manager is present it will push the user's info to dataLayer
    try {
      dataLayer.push({
        'userId': user.id,
        'user': "".concat(user.firstname, " ").concat(user.lastname),
        'tenant_id': user.tenant_id,
        'userType': user.user_type,
        'accountId': user.account_id,
        'accountName': user.account.name
      });
    } catch (e) {// no Google Tag has been set
    }
  },
  authenticate: function authenticate(_success) {
    var self = PPBA;
    Caller.makeCall({
      type: 'GET',
      endpoint: Store.getAuthenticationEndpoint(),
      callbacks: {
        success: function success(result) {
          // Logger.log(result);
          Store.setUserData(result);
          self.render();
          PPBA.getApps();
          ACG.initialise(result.user.account_sfid, function () {
            Dom.removeClass(document.getElementById('bac---invalid-account'), 'invalid');
          }, function () {
            Dom.addClass(document.getElementById('bac---invalid-account'), 'invalid');
          });
          PPBA.setupGoogleTag(result.user);

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
          // Logger.log(result);
          Store.setUserData(result);
          self.render();
          PPBA.getApps();
          ACG.initialise(result.user.account_sfid, function () {
            Dom.removeClass(document.getElementById('bac---invalid-account'), 'invalid');
          }, function () {
            Dom.addClass(document.getElementById('bac---invalid-account'), 'invalid');
          });
          PPBA.setupGoogleTag(result.user);
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
  setInputPlaceholder: function setInputPlaceholder(txt) {// document.getElementById(Store.getSearchInputId()).placeholder = txt;
  },
  changeAccount: function changeAccount(accountId) {
    Caller.makeCall({
      type: 'GET',
      endpoint: Store.getSwitchAccountEndpoint(accountId),
      callbacks: {
        success: function success(result) {
          ACG.changeAccount(accountId);
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
      return "\n\t\t\t\t<a class=\"bac--image-link\" href=\"".concat(app.application_url, "\" style=\"background: #").concat(app.color, "\">\n\t\t\t\t\t<img src=\"").concat(app.icon, "\" />\n\t\t\t\t</a>\n\t\t\t\t\n\t\t\t\t<div class=\"bac--puresdk-app-text-container\">\n\t\t\t\t\t<a href=\"").concat(app.application_url, "\" class=\"bac--app-name\">").concat(app.name, "</a>\n\t\t\t\t\t<a href=\"").concat(app.application_url, "\" class=\"bac--app-description\">").concat(app.descr === null ? '-' : app.descr, "</a>\n\t\t\t\t</div>\n\t\t\t");
    };

    for (var i = 0; i < apps.length; i++) {
      var app = apps[i];
      var div = document.createElement("div");
      div.className = "bac--apps";
      div.innerHTML = appTemplate(app); // check to see if the user has access to the two main apps and remove disabled class

      if (app.application_url === '/app/groups') {
        Dom.removeClass(document.getElementById('bac--puresdk-groups-link--'), 'disabled');
      } else if (app.application_url === '/app/campaigns') {
        Dom.removeClass(document.getElementById('bac--puresdk-campaigns-link--'), 'disabled');
      }

      document.getElementById("bac--aps-actual-container").appendChild(div);
    } // finally check if the user is on any of the two main apps


    var appInfo = Store.getAppInfo();

    if (appInfo.root === "/app/groups") {
      Dom.addClass(document.getElementById('bac--puresdk-groups-link--'), 'selected');
    } else if (appInfo.root === "/app/campaigns") {
      Dom.addClass(document.getElementById('bac--puresdk-campaigns-link--'), 'selected');
    }
  },
  renderUser: function renderUser(user) {
    var userTemplate = function userTemplate(user) {
      return "\n\t\t\t\t<div class=\"bac--user-image\" id=\"bac--user-image\">\n\t\t\t\t\t<i class=\"fa fa-camera\"></i>\n\t\t\t   \t<div id=\"bac--user-image-file\"></div>\n\t\t\t   \t<div id=\"bac--user-image-upload-progress\">\n\t\t\t   \t\t<svg width='60px' height='60px' xmlns=\"http://www.w3.org/2000/svg\" viewBox=\"0 0 100 100\" preserveAspectRatio=\"xMidYMid\" class=\"uil-default\"><rect x=\"0\" y=\"0\" width=\"100\" height=\"100\" fill=\"none\" class=\"bk\"></rect><rect  x='46.5' y='40' width='7' height='20' rx='5' ry='5' fill='#ffffff' transform='rotate(0 50 50) translate(0 -30)'>  <animate attributeName='opacity' from='1' to='0' dur='1s' begin='-1s' repeatCount='indefinite'/></rect><rect  x='46.5' y='40' width='7' height='20' rx='5' ry='5' fill='#ffffff' transform='rotate(30 50 50) translate(0 -30)'>  <animate attributeName='opacity' from='1' to='0' dur='1s' begin='-0.9166666666666666s' repeatCount='indefinite'/></rect><rect  x='46.5' y='40' width='7' height='20' rx='5' ry='5' fill='#ffffff' transform='rotate(60 50 50) translate(0 -30)'>  <animate attributeName='opacity' from='1' to='0' dur='1s' begin='-0.8333333333333334s' repeatCount='indefinite'/></rect><rect  x='46.5' y='40' width='7' height='20' rx='5' ry='5' fill='#ffffff' transform='rotate(90 50 50) translate(0 -30)'>  <animate attributeName='opacity' from='1' to='0' dur='1s' begin='-0.75s' repeatCount='indefinite'/></rect><rect  x='46.5' y='40' width='7' height='20' rx='5' ry='5' fill='#ffffff' transform='rotate(120 50 50) translate(0 -30)'>  <animate attributeName='opacity' from='1' to='0' dur='1s' begin='-0.6666666666666666s' repeatCount='indefinite'/></rect><rect  x='46.5' y='40' width='7' height='20' rx='5' ry='5' fill='#ffffff' transform='rotate(150 50 50) translate(0 -30)'>  <animate attributeName='opacity' from='1' to='0' dur='1s' begin='-0.5833333333333334s' repeatCount='indefinite'/></rect><rect  x='46.5' y='40' width='7' height='20' rx='5' ry='5' fill='#ffffff' transform='rotate(180 50 50) translate(0 -30)'>  <animate attributeName='opacity' from='1' to='0' dur='1s' begin='-0.5s' repeatCount='indefinite'/></rect><rect  x='46.5' y='40' width='7' height='20' rx='5' ry='5' fill='#ffffff' transform='rotate(210 50 50) translate(0 -30)'>  <animate attributeName='opacity' from='1' to='0' dur='1s' begin='-0.4166666666666667s' repeatCount='indefinite'/></rect><rect  x='46.5' y='40' width='7' height='20' rx='5' ry='5' fill='#ffffff' transform='rotate(240 50 50) translate(0 -30)'>  <animate attributeName='opacity' from='1' to='0' dur='1s' begin='-0.3333333333333333s' repeatCount='indefinite'/></rect><rect  x='46.5' y='40' width='7' height='20' rx='5' ry='5' fill='#ffffff' transform='rotate(270 50 50) translate(0 -30)'>  <animate attributeName='opacity' from='1' to='0' dur='1s' begin='-0.25s' repeatCount='indefinite'/></rect><rect  x='46.5' y='40' width='7' height='20' rx='5' ry='5' fill='#ffffff' transform='rotate(300 50 50) translate(0 -30)'>  <animate attributeName='opacity' from='1' to='0' dur='1s' begin='-0.16666666666666666s' repeatCount='indefinite'/></rect><rect  x='46.5' y='40' width='7' height='20' rx='5' ry='5' fill='#ffffff' transform='rotate(330 50 50) translate(0 -30)'>  <animate attributeName='opacity' from='1' to='0' dur='1s' begin='-0.08333333333333333s' repeatCount='indefinite'/></rect></svg>\n\t\t\t\t\t</div>\n\t\t\t   </div>\n\t\t\t\t<div class=\"bac--user-name\">".concat(user.firstname, " ").concat(user.lastname, "</div>\n\t\t\t\t<div class=\"bac--user-email\">").concat(user.email, "</div>\n\t\t\t");
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
      return "\n\t\t\t\t<div class=\"bac--user-list-item-image\">\n\t\t\t\t\t<img src=\"".concat(account.sdk_square_logo_icon, "\" alt=\"\">\n\t\t\t\t</div>\n\t\t\t\t<div class=\"bac-user-app-details\">\n\t\t\t\t\t <span>").concat(account.name, "</span>\n\t\t\t\t</div>\n\t\t\t\t").concat(isTheSelected ? '<div id="bac--selected-acount-indicator" class="bac--selected-acount-indicator"></div>' : '', "\n\t\t\t");
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
    InfoController.renderInfoBlocks();
  },
  renderVersionNumber: function renderVersionNumber(version) {
    document.getElementById('puresdk-version-number').innerHTML = version;
  },
  renderZendesk: function renderZendesk() {
    if (Store.getDisplaySupport()) {
      var zdscript = document.createElement('script');
      zdscript.src = "https://static.zdassets.com/ekr/snippet.js?key=9868c71d-6793-42aa-b2fa-12419c7bd498";
      zdscript.id = "ze-snippet";
      zdscript.async = true;
      zdscript.type = 'text/javascript';
      document.getElementsByTagName('head')[0].appendChild(zdscript);
    }
  },
  styleAccount: function styleAccount(account) {
    var appInfo = Store.getAppInfo();
    var logo = document.createElement('img');
    logo.src = account.sdk_logo_icon;
    document.getElementById('bac--puresdk-account-logo--').appendChild(logo);

    document.getElementById('bac--puresdk-account-logo--').onclick = function (e) {
      window.location.href = Store.getRootUrl();
    };

    if (appInfo !== null) {
      var appTitleContainer = document.createElement('div');
      appTitleContainer.className = "bac--puresdk-app-name--";

      var appOpenerTemplate = function appOpenerTemplate(appInformation) {
        return "\n\t\t\t\t\t <a href=\"".concat(appInformation.root, "\" id=\"app-name-link-to-root\">").concat(appInformation.name, "</a>\n\t \t  \t \t");
      };

      appTitleContainer.innerHTML = appOpenerTemplate(appInfo);
      document.getElementById('bac--puresdk-account-logo--').appendChild(appTitleContainer);
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
  setTitleAndFavicon: function setTitleAndFavicon() {
    var favlink = document.querySelector("link[rel*='icon']") || document.createElement('link');
    favlink.href = 'https://cloudcdn.pureprofile.com/image/upload/v1/__assets_master__/b1a0c316ad7f4a679c2eee615814466c';
    favlink.rel = 'shortcut icon';
    document.getElementsByTagName('head')[0].appendChild(favlink);
    var appInfo = Store.getAppInfo();

    if (appInfo !== null) {
      document.title = "Pureprofile Access | ".concat(appInfo.name);
    } else {
      document.title = "Pureprofile Access";
    }
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
    PPBA.renderZendesk();
    PPBA.styleAccount(Store.getUserData().user.account);
    PPBA.setTitleAndFavicon();
    PPBA.renderVersionNumber(Store.getVersionNumber());

    if (Store.getAppsVisible() === false) {
      document.getElementById('bac--puresdk-apps-section--').style.cssText = "display:none";
    }

    afterRender();
  }
};
module.exports = PPBA;