!function e(n,t,i){function o(s,r){if(!t[s]){if(!n[s]){var c="function"==typeof require&&require;if(!r&&c)return c(s,!0);if(a)return a(s,!0);var l=new Error("Cannot find module '"+s+"'");throw l.code="MODULE_NOT_FOUND",l}var d=t[s]={exports:{}};n[s][0].call(d.exports,function(e){var t=n[s][1][e];return o(t?t:e)},d,d.exports,e,n,t,i)}return t[s].exports}for(var a="function"==typeof require&&require,s=0;s<i.length;s++)o(i[s]);return o}({1:[function(e,n,t){var i=e("./modules/logger"),o=e("./modules/pubsub"),a=e("./modules/caller"),s=e("./modules/store"),r=e("./modules/dom"),c=e("./modules/info-controller"),l={},d=function(){document.getElementById("--puresdk-apps-icon--").addEventListener("click",function(e){e.stopPropagation(),r.toggleClass(document.getElementById("--puresdk-apps-container--"),"active")}),document.getElementById("--puresdk-user-avatar--").addEventListener("click",function(e){e.stopPropagation(),r.removeClass(document.getElementById("--puresdk-apps-container--"),"active"),r.toggleClass(document.getElementById("--puresdk-user-sidebar--"),"active")}),window.addEventListener("click",function(e){r.removeClass(document.getElementById("--puresdk-apps-container--"),"active"),r.removeClass(document.getElementById("--puresdk-user-sidebar--"),"active")}),c.init()},p={setWindowName:function(e){s.setWindowName(e)},setConfiguration:function(e){s.setConfiguration(e)},setHTMLTemplate:function(e){s.setHTMLTemplate(e)},init:function(e){return i.log("initializing with conf: ",e),e&&(e.headerDivId&&s.setHTMLContainer(e.headerDivId),null!==e.appsVisible&&s.setAppsVisible(e.appsVisible),e.rootUrl&&s.setRootUrl(e.rootUrl)),l=e,!0},authenticate:function(e){var n=p;a.makeCall({type:"GET",endpoint:s.getAuthenticationEndpoint(),callbacks:{success:function(t){i.log(t),s.setUserData(t),n.render(),p.getApps(),e(t)},fail:function(e){window.location.href=s.getLoginUrl()}}})},authenticatePromise:function(){var e=p;return a.promiseCall({type:"GET",endpoint:s.getAuthenticationEndpoint(),middlewares:{success:function(n){i.log(n),s.setUserData(n),e.render(),p.getApps()}}})},getApps:function(){a.makeCall({type:"GET",endpoint:s.getAppsEndpoint(),callbacks:{success:function(e){s.setApps(e),p.renderApps(e.apps)},fail:function(e){window.location.href=s.getLoginUrl()}}})},getAvailableListeners:function(){return o.getAvailableListeners()},subscribeListener:function(e,n){return o.subscribe(e,n)},getUserData:function(){return s.getUserData()},setInputPlaceholder:function(e){},changeAccount:function(e){a.makeCall({type:"GET",endpoint:s.getSwitchAccountEndpoint(e),callbacks:{success:function(e){window.location.href="/apps"},fail:function(e){alert("Sorry, something went wrong with your request. Plese try again")}}})},renderApps:function(e){for(var n=function(e){return'\n				<a href="#" style="background: #'+e.color+'"><i class="'+e.icon+'"></i></a>\n				<span class="bac--app-name">'+e.name+'</span>\n				<span class="bac--app-description">'+e.descr+"</span>\n			"},t=function(t){var i=e[t],o=document.createElement("div");o.className="bac--apps",o.innerHTML=n(i),o.onclick=function(e){e.preventDefault(),window.location.href=i.application_url},document.getElementById("--puresdk-apps-container--").appendChild(o)},i=0;i<e.length;i++)t(i)},renderUser:function(e){var n=function(e){return'\n				<div class="bac--user-image"><i class="fa fa-camera"></i></div>\n				<div class="bac--user-name">'+e.firstname+" "+e.lastname+'</div>\n				<div class="bac--user-email">'+e.email+"</div>\n			"},t=document.createElement("div");t.className="bac--user-sidebar-info",t.innerHTML=n(e),document.getElementById("--puresdk-user-details--").appendChild(t),document.getElementById("--puresdk-user-avatar--").innerHTML=e.firstname.charAt(0)+e.lastname.charAt(0)},renderAccounts:function(e){for(var n=function(e){return'\n				<img src="'+e.sdk_square_logo_icon+'" alt="">\n				<div class="bac-user-app-details">\n					 <span>'+e.name+"</span>\n					 <span>15 team members</span>\n				</div>\n			"},t=function(t){var i=e[t],o=document.createElement("div");o.className="bac--user-list-item",o.innerHTML=n(i),o.onclick=function(e){e.preventDefault(),p.changeAccount(i.sfid)},document.getElementById("--puresdk-user-businesses--").appendChild(o)},i=0;i<e.length;i++)t(i)},renderInfoBlocks:function(){for(var e=function(e){return'\n				 <div class="--puresdk-info-box--" id="--puresdk-info-box--'+e+'">\n				 	<div class="bac--timer" id="bac--timer'+e+'"></div>\n					 <div class="bac--inner-info-box--">\n					 		<div class="bac--info-icon-- fa-success"></div>\n					 		<div class="bac--info-icon-- fa-warning"></div>\n					 		<div class="bac--info-icon-- fa-info-1"></div>\n					 		<div class="bac--info-icon-- fa-error"></div>\n					 		 <div class="bac--info-main-text--" id="bac--info-main-text--'+e+'"></div>\n					 		 <div class="bac--info-close-button-- fa-close-1" id="bac--info-close-button--'+e+'"></div>\n					</div>\n				</div>\n		  '},n=document.getElementById("bac--info-blocks-wrapper--"),t="",i=1;5>i;i++)t+=e(i);n.innerHTML=t},styleAccount:function(e){var n=document.createElement("img");n.src=e.sdk_logo_icon,document.getElementById("--puresdk-account-logo--").appendChild(n),document.getElementById("--puresdk-bac--header-apps--").style.cssText="background: #"+e.sdk_background_color+"; color: #"+e.sdk_font_color,document.getElementById("--puresdk-user-sidebar--").style.cssText="background: #"+e.sdk_background_color+"; color: #"+e.sdk_font_color,document.getElementById("--puresdk-account-logo--").onclick=function(e){window.location.href="/"}},goToLoginPage:function(){window.location.href=s.getLoginUrl()},setInfo:function(e,n,t){c.showInfo(e,n,t)},render:function(){var e=document.getElementById(s.getHTLMContainer());if(null===e){i.error('the container with id "'+e+'" has not been found on the document. The library is going to create it.');var n=document.createElement("div");n.id=s.getHTLMContainer(),n.style.width="100%",n.style.height="50px",document.body.insertBefore(n,document.body.firstChild),e=document.getElementById(s.getHTLMContainer())}e.innerHTML=s.getHTML(),p.styleAccount(s.getUserData().user.account),p.renderUser(s.getUserData().user),p.renderInfoBlocks(),p.renderAccounts(s.getUserData().user.accounts),s.getAppsVisible()===!1&&(document.getElementById("--puresdk-apps-section--").style.cssText="display:none"),d()}};n.exports=p},{"./modules/caller":3,"./modules/dom":4,"./modules/info-controller":5,"./modules/logger":6,"./modules/pubsub":7,"./modules/store":8}],2:[function(e,n,t){"use strict";var i=e("./PPBA");i.setWindowName("PURESDK"),i.setConfiguration({logs:!1,rootUrl:"/",baseUrl:"api/v1/",loginUrl:"api/v1/oauth2",searchInputId:"--puresdk--search--input--",redirectUrlParam:"redirect_url"}),i.setHTMLTemplate('<header class="bac--header-apps" id="--puresdk-bac--header-apps--">\n    <div class="bac--container">\n        <div class="bac--logo" id="--puresdk-account-logo--"></div>\n        <div class="bac--user-actions">\n            <div class="bac--user-apps" id="--puresdk-apps-section--">\n                <i class="fa fa-squares" id="--puresdk-apps-icon--"></i>\n\n                <div class="bac--apps-container" id="--puresdk-apps-container--">\n                    <div class="bac--apps-arrow"></div>\n                </div>\n            </div>\n            <!--<div class="bac&#45;&#45;user-notifications">-->\n                <!--<div class="bac&#45;&#45;user-notifications-count">1</div>-->\n                <!--<i class="fa fa-bell-o"></i>-->\n            <!--</div>-->\n            <div class="bac--user-avatar">\n                <span class="bac--user-avatar-name" id="--puresdk-user-avatar--"></span>\n            </div>\n        </div>\n    </div>\n    <div id="bac--info-blocks-wrapper--"></div>\n</header>\n<div class="bac--user-sidebar" id="--puresdk-user-sidebar--">\n    <div id="--puresdk-user-details--"></div>\n    <!--<div class="bac&#45;&#45;user-sidebar-info">-->\n        <!--<div class="bac&#45;&#45;user-image"><i class="fa fa-camera"></i></div>-->\n        <!--<div class="bac&#45;&#45;user-name">Curtis Bartlett</div>-->\n        <!--<div class="bac&#45;&#45;user-email">cbartlett@pureprofile.com</div>-->\n    <!--</div>-->\n    <div class="bac--user-apps" id="--puresdk-user-businesses--">\n        <!--<div class="bac&#45;&#45;user-list-item">-->\n            <!--<img src="http://lorempixel.com/40/40" alt="">-->\n            <!--<div class="bac-user-app-details">-->\n                <!--<span></span>-->\n                <!--<span>15 team members</span>-->\n            <!--</div>-->\n        <!--</div>-->\n    </div>\n    <div class="bac--user-account-settings">\n        <div class="bac-user-acount-list-item">\n            <i class="fa fa-cog-line"></i>\n            <a href="#">Acount Security</a>\n        </div>\n        <div class="bac-user-acount-list-item">\n            <i class="fa fa-lock-line"></i>\n            <a href="#">Acount Security</a>\n        </div>\n        <div class="bac-user-acount-list-item">\n            <i class="fa fa-login-line"></i>\n            <a href="/api/v1/sign-off">Log out</a>\n        </div>\n    </div>\n</div>\n'),window.PURESDK=i;var o='html,body,div,span,applet,object,iframe,h1,h2,h3,h4,h5,h6,p,blockquote,pre,a,abbr,acronym,address,big,cite,code,del,dfn,em,img,ins,kbd,q,s,samp,small,strike,strong,sub,sup,tt,var,b,u,i,center,dl,dt,dd,ol,ul,li,fieldset,form,label,legend,table,caption,tbody,tfoot,thead,tr,th,td,article,aside,canvas,details,embed,figure,figcaption,footer,header,hgroup,menu,nav,output,ruby,section,summary,time,mark,audio,video{margin:0;padding:0;border:0;font-size:100%;font:inherit;vertical-align:baseline}article,aside,details,figcaption,figure,footer,header,hgroup,menu,nav,section{display:block}body{line-height:1}ol,ul{list-style:none}blockquote,q{quotes:none}blockquote:before,blockquote:after,q:before,q:after{content:"";content:none}table{border-collapse:collapse;border-spacing:0}body{overflow-x:hidden}#bac-wrapper{font-family:"Verdana", arial, sans-serif;color:white;min-height:100vh;position:relative}.bac--container{max-width:1160px;margin:0 auto}.bac--header-apps{position:absolute;width:100%;height:50px;background-color:#475369;padding:5px 0;z-index:9999999}.bac--header-apps .bac--container{height:100%;display:flex;align-items:center;justify-content:space-between}.bac--header-search{position:relative}.bac--header-search input{color:#fff;font-size:14px;height:35px;background-color:#6b7586;padding:0 5px 0 10px;border:none;border-radius:3px;min-width:400px;width:100%}.bac--header-search input:focus{outline:none}.bac--header-search input::-webkit-input-placeholder{font-style:normal !important;text-align:center;color:#fff;font-size:14px;font-weight:300;letter-spacing:0.5px}.bac--header-search input::-moz-placeholder{font-style:normal !important;text-align:center;color:#fff;font-size:14px;font-weight:300;letter-spacing:0.5px}.bac--header-search input:-ms-input-placeholder{font-style:normal !important;text-align:center;color:#fff;font-size:14px;font-weight:300;letter-spacing:0.5px}.bac--header-search i{position:absolute;top:8px;right:10px}.bac--user-actions{display:flex;align-items:center}.bac--user-actions>div{cursor:pointer;color:white}.bac--user-actions .bac--user-notifications{position:relative}.bac--user-actions .bac--user-notifications i{font-size:20px}.bac--user-actions .bac--user-notifications-count{position:absolute;display:inline-block;height:15px;width:15px;line-height:15px;color:#fff;font-size:10px;text-align:center;background-color:#fc3b30;border-radius:50%;top:-5px;left:-5px}.bac--user-actions .bac--user-avatar,.bac--user-actions .bac--user-notifications{margin-left:20px}.bac--user-actions .bac--user-avatar-name{color:#fff;background-color:#adadad;border-radius:50%;display:inline-block;height:30px;width:30px;line-height:30px;text-align:center;font-size:14px}.bac--user-apps{position:relative}#--puresdk-user-businesses--{height:calc(100vh - 458px);overflow:auto}.bac--apps-container{background:#fff;position:absolute;top:45px;right:-40px;display:flex;width:360px;flex-wrap:wrap;border-radius:10px;padding:30px;justify-content:space-between;text-align:center;-webkit-box-shadow:0 0 10px 2px rgba(0,0,0,0.2);box-shadow:0 0 10px 2px rgba(0,0,0,0.2);opacity:0;visibility:hidden;transition:all 0.4s ease}.bac--apps-container.active{opacity:1;visibility:visible}.bac--apps-container .bac--apps-arrow{position:absolute;display:block;height:20px;width:20px;top:-10px;right:36px;background:#fff;transform:rotate(-45deg);z-index:1}.bac--apps-container .bac--apps{width:32%;display:flex;font-size:30px;margin-bottom:40px;text-align:center;justify-content:center;flex-wrap:wrap}.bac--apps-container .bac--apps a{display:block;color:#fff;text-decoration:none;width:65px;height:65px;line-height:65px;text-align:center;border-radius:10px;-webkit-box-shadow:0 0 5px 0 rgba(0,0,0,0.2);box-shadow:0 0 5px 0 rgba(0,0,0,0.2)}.bac--apps-container .bac--apps .bac--app-name{width:100%;color:#000;font-size:18px;padding:10px 0}.bac--apps-container .bac--apps .bac--app-description{color:#919191;font-size:12px;font-style:italic}.bac--user-sidebar{font-family:"Verdana", arial, sans-serif;color:white;background-color:#515f77;box-sizing:border-box;width:320px;height:100%;position:absolute;top:0;right:0;z-index:999999;padding-top:10px;opacity:0;margin-top:50px;transform:translateX(100%);transition:all 0.4s ease}.bac--user-sidebar.active{opacity:1;transform:translateX(0%)}.bac--user-sidebar .bac--user-list-item{display:flex;cursor:pointer;align-items:center;padding:10px 10px 10px 40px;border-bottom:2px solid #6b7586}.bac--user-sidebar .bac--user-list-item:hover{background-color:#6b7586}.bac--user-sidebar .bac--user-list-item img{margin-right:20px;border:2px solid #fff}.bac--user-sidebar .bac--user-list-item span{width:100%;display:block;margin-bottom:5px}.bac--user-sidebar .bac-user-app-details span{font-size:12px}.bac--user-sidebar-info{display:flex;justify-content:center;flex-wrap:wrap;text-align:center;padding:10px 20px 15px}.bac--user-sidebar-info .bac--user-image{display:inline-block;height:80px;width:80px;line-height:80px;text-align:center;color:#fff;border-radius:50%;background-color:#adadad;margin-bottom:15px}.bac--user-sidebar-info .bac--user-image i{font-size:32px}.bac--user-sidebar-info .bac--user-name{width:100%;text-align:center;font-size:18px;margin-bottom:10px}.bac--user-sidebar-info .bac--user-email{font-size:12px;font-weight:300}.bac--user-account-settings{padding:50px}.bac--user-account-settings .bac-user-acount-list-item{display:flex;align-items:center;margin-bottom:30px}.bac--user-account-settings .bac-user-acount-list-item a{text-decoration:none;color:#fff}.bac--user-account-settings .bac-user-acount-list-item i{font-size:24px;margin-right:20px}#--puresdk-account-logo--{cursor:pointer}#bac--info-blocks-wrapper--{position:relative}#bac--info-blocks-wrapper-- .--puresdk-info-box--{border-radius:0 0 3px 3px;overflow:hidden;z-index:99999999;position:fixed;top:-41px;width:470px;left:calc(50vw - 235px);height:40px;-webkit-transition:top 0.4s;transition:top 0.4s}#bac--info-blocks-wrapper-- .--puresdk-info-box--.bac--success{background:#14DA9E}#bac--info-blocks-wrapper-- .--puresdk-info-box--.bac--success .bac--inner-info-box-- div.bac--info-icon--.fa-success{display:inline-block}#bac--info-blocks-wrapper-- .--puresdk-info-box--.bac--info{background-color:#5BC0DE}#bac--info-blocks-wrapper-- .--puresdk-info-box--.bac--info .bac--inner-info-box-- div.bac--info-icon--.fa-info-1{display:inline-block}#bac--info-blocks-wrapper-- .--puresdk-info-box--.bac--warning{background:#F0AD4E}#bac--info-blocks-wrapper-- .--puresdk-info-box--.bac--warning .bac--inner-info-box-- div.bac--info-icon--.fa-warning{display:inline-block}#bac--info-blocks-wrapper-- .--puresdk-info-box--.bac--error{background:#EF4100}#bac--info-blocks-wrapper-- .--puresdk-info-box--.bac--error .bac--inner-info-box-- div.bac--info-icon--.fa-error{display:inline-block}#bac--info-blocks-wrapper-- .--puresdk-info-box-- .bac--timer{-webkit-transition-timing-function:linear;transition-timing-function:linear;position:absolute;bottom:0px;opacity:0.5;height:2px !important;background:white;width:0%}#bac--info-blocks-wrapper-- .--puresdk-info-box-- .bac--timer.bac--fullwidth{width:100%}#bac--info-blocks-wrapper-- .--puresdk-info-box--.bac--active--{top:0px}#bac--info-blocks-wrapper-- .--puresdk-info-box-- .bac--inner-info-box--{width:100%;padding:11px 15px;color:white}#bac--info-blocks-wrapper-- .--puresdk-info-box-- .bac--inner-info-box-- div{display:inline-block;height:18px;position:relative}#bac--info-blocks-wrapper-- .--puresdk-info-box-- .bac--inner-info-box-- div.bac--info-icon--{display:none;top:0px}#bac--info-blocks-wrapper-- .--puresdk-info-box-- .bac--inner-info-box-- .bac--info-icon--{margin-right:15px;width:10px;top:2px}#bac--info-blocks-wrapper-- .--puresdk-info-box-- .bac--inner-info-box-- .bac--info-main-text--{width:380px;margin-right:15px;font-size:12px;text-align:center}#bac--info-blocks-wrapper-- .--puresdk-info-box-- .bac--inner-info-box-- .bac--info-close-button--{width:10px;cursor:pointer;top:2px}',a=document.head||document.getElementsByTagName("head")[0],s=document.createElement("style");s.type="text/css",s.styleSheet?s.styleSheet.cssText=o:s.appendChild(document.createTextNode(o)),a.appendChild(s);var r=document.createElement("link");r.href="https://file.myfontastic.com/MDvnRJGhBd5xVcXn4uQJSZ/icons.css",r.rel="stylesheet",document.getElementsByTagName("head")[0].appendChild(r),n.exports=i},{"./PPBA":1}],3:[function(e,n,t){var i=e("./store.js"),o=(e("./logger"),{makeCall:function(e){var n=e.endpoint,t=new XMLHttpRequest;t.open(e.type,n),t.setRequestHeader("Content-Type","application/json"),t.onload=function(){t.status>=200&&t.status<300?e.callbacks.success(JSON.parse(t.responseText)):200!==t.status&&e.callbacks.fail(JSON.parse(t.responseText))},e.params||(e.params={}),t.send(JSON.stringify(e.params))},promiseCall:function(e){return new Promise(function(n,t){var o=new XMLHttpRequest;o.open(e.type,e.endpoint),o.setRequestHeader("Content-Type","application/json"),o.onload=function(){this.status>=200&&this.status<300?(e.middlewares.success(JSON.parse(o.responseText)),n(JSON.parse(o.responseText))):window.location.href=i.getLoginUrl()},o.onerror=function(){window.location=i.getLoginUrl()},o.send()})}});n.exports=o},{"./logger":6,"./store.js":8}],4:[function(e,n,t){var i={hasClass:function(e,n){return e.classList?e.classList.contains(n):new RegExp("(^| )"+n+"( |$)","gi").test(e.className)},removeClass:function(e,n){e.classList?e.classList.remove(n):e.className=e.className.replace(new RegExp("(^|\\b)"+n.split(" ").join("|")+"(\\b|$)","gi")," ")},addClass:function(e,n){e.classList?e.classList.add(n):e.className+=" "+n},toggleClass:function(e,n){this.hasClass(e,n)?this.removeClass(e,n):this.addClass(e,n)}};n.exports=i},{}],5:[function(e,n,t){var i=e("./dom"),o=5e3,a=1,s=[],r={init:function(){for(var e=1;5>e;e++)!function(e){var n=function(){i.removeClass(document.getElementById("--puresdk-info-box--"+e),"bac--active--"),document.getElementById("bac--timer"+e).style.transition="",i.removeClass(document.getElementById("bac--timer"+e),"bac--fullwidth"),s[e-1].inUse=!1,setTimeout(function(){s[e-1].closeTimeout&&clearTimeout(s[e-1].closeTimeout),i.removeClass(document.getElementById("--puresdk-info-box--"+e),"bac--success"),i.removeClass(document.getElementById("--puresdk-info-box--"+e),"bac--info"),i.removeClass(document.getElementById("--puresdk-info-box--"+e),"bac--warning"),i.removeClass(document.getElementById("--puresdk-info-box--"+e),"bac--error")},450)},t=function(n){document.getElementById("bac--info-main-text--"+e).innerHTML=n},o=function(n){document.getElementById("bac--timer"+e).style.transition="width "+n+"ms",i.addClass(document.getElementById("bac--timer"+e),"bac--fullwidth"),s[e-1].closeTimeout=setTimeout(function(){s[e-1].closeFunction()},n)};s.push({id:e,inUse:!1,element:document.getElementById("--puresdk-info-box--"+e),closeFunction:n,addText:t,addTimeout:o,closeTimeout:!1}),document.getElementById("bac--info-close-button--"+e).onclick=function(t){n(e)}}(e)},showInfo:function(e,n,t){for(var r=0;r<s.length;r++){var c=s[r];if(!c.inUse){c.inUse=!0,c.element.style.zIndex=a,c.addText(n),a+=1;var l=o,d=!0;return t&&(null!=t.hideIn&&void 0!=t.hideIn&&-1!=t.hideIn?l=t.hideIn:-1===t.hideIn&&(d=!1)),d&&c.addTimeout(l),i.addClass(c.element,"bac--"+e),void i.addClass(c.element,"bac--active--")}}}};n.exports=r},{"./dom":4}],6:[function(e,n,t){var i=e("./store.js"),o={log:function(e){return i.logsEnabled()?(o.log=console.log.bind(console),void o.log(e)):!1},error:function(e){return i.logsEnabled()?(o.error=console.error.bind(console),void o.error(e)):!1}};n.exports=o},{"./store.js":8}],7:[function(e,n,t){"use strict";var i=e("./store.js"),o=e("./logger.js"),a={searchKeyUp:{info:"Listener on keyUp of search input on top bar"},searchEnter:{info:"Listener on enter key pressed on search input on top bar"},searchOnChange:{info:"Listener on change of input value"}},s={getAvailableListeners:function(){return a},subscribe:function(e,n){if("searchKeyUp"===e){var t=document.getElementById(i.getSearchInputId());return t.addEventListener("keyup",n),function(){t.removeEventListener("keyup",n,!1)}}if("searchEnter"===e){var s=function(e){13===e.keyCode&&n(e)};return t.addEventListener("keydown",s),function(){t.removeEventListener("keydown",s,!1)}}if("searchOnChange"===e){var t=document.getElementById(i.getSearchInputId());return t.addEventListener("change",n),function(){t.removeEventListener("keyup",n,!1)}}return o.error("The event you tried to subscribe is not available by the library"),o.log("The available events are: ",a),function(){}}};n.exports=s},{"./logger.js":6,"./store.js":8}],8:[function(e,n,t){var i={general:{},userData:{},configuration:{},htmlTemplate:"",apps:null},o={getState:function(){return Object.assign({},i)},setWindowName:function(e){i.general.windowName=e},setConfiguration:function(e){i.configuration=e},getAppsVisible:function(){return null===i.configuration.appsVisible||void 0===i.configuration.appsVisible?!0:i.configuration.appsVisible},setAppsVisible:function(e){i.configuration.appsVisible=e},setHTMLTemplate:function(e){i.htmlTemplate=e},setApps:function(e){i.apps=e},getLoginUrl:function(){return i.configuration.rootUrl+i.configuration.loginUrl+"?"+i.configuration.redirectUrlParam+"="+window.location.href},getAuthenticationEndpoint:function(){return i.configuration.rootUrl+i.configuration.baseUrl+"session"},getSwitchAccountEndpoint:function(e){return i.configuration.rootUrl+i.configuration.baseUrl+"accounts/switch/"+e},getAppsEndpoint:function(){return i.configuration.rootUrl+i.configuration.baseUrl+"apps"},logsEnabled:function(){return i.configuration.logs},getSearchInputId:function(){return i.configuration.searchInputId},setHTMLContainer:function(e){i.configuration.headerDivId=e},getHTLMContainer:function(){return i.configuration.headerDivId?i.configuration.headerDivId:"ppsdk-container"},getHTML:function(){return i.htmlTemplate},getWindowName:function(){return i.general.windowName},setUserData:function(e){i.userData=e},getUserData:function(){return i.userData},setRootUrl:function(e){i.configuration.rootUrl=e}};n.exports=o},{}]},{},[2]);