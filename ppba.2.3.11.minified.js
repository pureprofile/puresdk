!function e(t,n,i){function a(o,s){if(!n[o]){if(!t[o]){var c="function"==typeof require&&require;if(!s&&c)return c(o,!0);if(r)return r(o,!0);var d=new Error("Cannot find module '"+o+"'");throw d.code="MODULE_NOT_FOUND",d}var l=n[o]={exports:{}};t[o][0].call(l.exports,function(e){var n=t[o][1][e];return a(n?n:e)},l,l.exports,e,t,n,i)}return n[o].exports}for(var r="function"==typeof require&&require,o=0;o<i.length;o++)a(i[o]);return a}({1:[function(e,t,n){var i=e("./modules/logger"),a=e("./modules/pubsub"),r=e("./modules/caller"),o=e("./modules/dom"),s=e("./modules/info-controller"),c=e("./modules/avatar-controller"),d=e("./modules/store"),l={},p=function(){document.getElementById("--puresdk--apps--opener--").addEventListener("click",function(e){e.stopPropagation(),o.toggleClass(document.getElementById("--puresdk-apps-container--"),"active")}),document.getElementById("bac--user-avatar-top").addEventListener("click",function(e){e.stopPropagation(),o.removeClass(document.getElementById("--puresdk-apps-container--"),"active"),o.toggleClass(document.getElementById("--puresdk-user-sidebar--"),"active")}),window.addEventListener("click",function(e){o.removeClass(document.getElementById("--puresdk-apps-container--"),"active"),o.removeClass(document.getElementById("--puresdk-user-sidebar--"),"active")}),c.init();var e=d.getUserData();c.setAvatar(e.user.avatar_url),s.init()},u={setWindowName:function(e){d.setWindowName(e)},setConfiguration:function(e){d.setConfiguration(e)},setHTMLTemplate:function(e){d.setHTMLTemplate(e)},setVersionNumber:function(e){d.setVersionNumber(e)},init:function(e){return i.log("initializing with conf: ",e),e&&(e.headerDivId&&d.setHTMLContainer(e.headerDivId),null!==e.appsVisible&&d.setAppsVisible(e.appsVisible),e.rootUrl&&d.setRootUrl(e.rootUrl)),l=e,!0},authenticate:function(e){var t=u;r.makeCall({type:"GET",endpoint:d.getAuthenticationEndpoint(),callbacks:{success:function(n){i.log(n),d.setUserData(n),t.render(),u.getApps(),e(n)},fail:function(e){window.location.href=d.getLoginUrl()}}})},authenticatePromise:function(){var e=u;return r.promiseCall({type:"GET",endpoint:d.getAuthenticationEndpoint(),middlewares:{success:function(t){i.log(t),d.setUserData(t),e.render(),u.getApps()}}})},getApps:function(){r.makeCall({type:"GET",endpoint:d.getAppsEndpoint(),callbacks:{success:function(e){d.setApps(e),u.renderApps(e.apps)},fail:function(e){window.location.href=d.getLoginUrl()}}})},getAvailableListeners:function(){return a.getAvailableListeners()},subscribeListener:function(e,t){return a.subscribe(e,t)},getUserData:function(){return d.getUserData()},setInputPlaceholder:function(e){},changeAccount:function(e){r.makeCall({type:"GET",endpoint:d.getSwitchAccountEndpoint(e),callbacks:{success:function(e){window.location.href="/apps"},fail:function(e){alert("Sorry, something went wrong with your request. Plese try again")}}})},renderApps:function(e){for(var t=function(e){return'\n				<a href="#" style="background: #'+e.color+'"><i class="'+e.icon+'"></i></a>\n				<span class="bac--app-name">'+e.name+'</span>\n				<span class="bac--app-description">'+e.descr+"</span>\n			"},n=function(n){var i=e[n],a=document.createElement("div");a.className="bac--apps",a.innerHTML=t(i),a.onclick=function(e){e.preventDefault(),window.location.href=i.application_url},document.getElementById("--puresdk-apps-container--").appendChild(a)},i=0;i<e.length;i++)n(i)},renderUser:function(e){var t=function(e){return"\n				<div class=\"bac--user-image\" id=\"bac--user-image\">\n					<i class=\"fa fa-camera\"></i>\n			   	<div id=\"bac--user-image-file\"></div>\n			   	<div id=\"bac--user-image-upload-progress\">\n			   		<svg width='60px' height='60px' xmlns=\"http://www.w3.org/2000/svg\" viewBox=\"0 0 100 100\" preserveAspectRatio=\"xMidYMid\" class=\"uil-default\"><rect x=\"0\" y=\"0\" width=\"100\" height=\"100\" fill=\"none\" class=\"bk\"></rect><rect  x='46.5' y='40' width='7' height='20' rx='5' ry='5' fill='#ffffff' transform='rotate(0 50 50) translate(0 -30)'>  <animate attributeName='opacity' from='1' to='0' dur='1s' begin='-1s' repeatCount='indefinite'/></rect><rect  x='46.5' y='40' width='7' height='20' rx='5' ry='5' fill='#ffffff' transform='rotate(30 50 50) translate(0 -30)'>  <animate attributeName='opacity' from='1' to='0' dur='1s' begin='-0.9166666666666666s' repeatCount='indefinite'/></rect><rect  x='46.5' y='40' width='7' height='20' rx='5' ry='5' fill='#ffffff' transform='rotate(60 50 50) translate(0 -30)'>  <animate attributeName='opacity' from='1' to='0' dur='1s' begin='-0.8333333333333334s' repeatCount='indefinite'/></rect><rect  x='46.5' y='40' width='7' height='20' rx='5' ry='5' fill='#ffffff' transform='rotate(90 50 50) translate(0 -30)'>  <animate attributeName='opacity' from='1' to='0' dur='1s' begin='-0.75s' repeatCount='indefinite'/></rect><rect  x='46.5' y='40' width='7' height='20' rx='5' ry='5' fill='#ffffff' transform='rotate(120 50 50) translate(0 -30)'>  <animate attributeName='opacity' from='1' to='0' dur='1s' begin='-0.6666666666666666s' repeatCount='indefinite'/></rect><rect  x='46.5' y='40' width='7' height='20' rx='5' ry='5' fill='#ffffff' transform='rotate(150 50 50) translate(0 -30)'>  <animate attributeName='opacity' from='1' to='0' dur='1s' begin='-0.5833333333333334s' repeatCount='indefinite'/></rect><rect  x='46.5' y='40' width='7' height='20' rx='5' ry='5' fill='#ffffff' transform='rotate(180 50 50) translate(0 -30)'>  <animate attributeName='opacity' from='1' to='0' dur='1s' begin='-0.5s' repeatCount='indefinite'/></rect><rect  x='46.5' y='40' width='7' height='20' rx='5' ry='5' fill='#ffffff' transform='rotate(210 50 50) translate(0 -30)'>  <animate attributeName='opacity' from='1' to='0' dur='1s' begin='-0.4166666666666667s' repeatCount='indefinite'/></rect><rect  x='46.5' y='40' width='7' height='20' rx='5' ry='5' fill='#ffffff' transform='rotate(240 50 50) translate(0 -30)'>  <animate attributeName='opacity' from='1' to='0' dur='1s' begin='-0.3333333333333333s' repeatCount='indefinite'/></rect><rect  x='46.5' y='40' width='7' height='20' rx='5' ry='5' fill='#ffffff' transform='rotate(270 50 50) translate(0 -30)'>  <animate attributeName='opacity' from='1' to='0' dur='1s' begin='-0.25s' repeatCount='indefinite'/></rect><rect  x='46.5' y='40' width='7' height='20' rx='5' ry='5' fill='#ffffff' transform='rotate(300 50 50) translate(0 -30)'>  <animate attributeName='opacity' from='1' to='0' dur='1s' begin='-0.16666666666666666s' repeatCount='indefinite'/></rect><rect  x='46.5' y='40' width='7' height='20' rx='5' ry='5' fill='#ffffff' transform='rotate(330 50 50) translate(0 -30)'>  <animate attributeName='opacity' from='1' to='0' dur='1s' begin='-0.08333333333333333s' repeatCount='indefinite'/></rect></svg>	\n					</div>\n			   </div>\n				<div class=\"bac--user-name\">"+e.firstname+" "+e.lastname+'</div>\n				<div class="bac--user-email">'+e.email+"</div>\n			"},n=document.createElement("div");n.className="bac--user-sidebar-info",n.innerHTML=t(e),document.getElementById("--puresdk-user-details--").appendChild(n),document.getElementById("--puresdk-user-avatar--").innerHTML=e.firstname.charAt(0)+e.lastname.charAt(0)},renderAccounts:function(e){for(var t=function(e){return'\n				<div class="bac--user-list-item-image">\n					<img src="'+e.sdk_square_logo_icon+'" alt="">\n				</div>\n				<div class="bac-user-app-details">\n					 <span>'+e.name+"</span>\n				</div>\n			"},n=function(n){var i=e[n],a=document.createElement("div");a.className="bac--user-list-item",a.innerHTML=t(i),a.onclick=function(e){e.preventDefault(),u.changeAccount(i.sfid)},document.getElementById("--puresdk-user-businesses--").appendChild(a)},i=0;i<e.length;i++)n(i)},renderInfoBlocks:function(){for(var e=function(e){return'\n				 <div class="--puresdk-info-box--" id="--puresdk-info-box--'+e+'">\n				 	<div class="bac--timer" id="bac--timer'+e+'"></div>\n					 <div class="bac--inner-info-box--">\n					 		<div class="bac--info-icon-- fa-success"></div>\n					 		<div class="bac--info-icon-- fa-warning"></div>\n					 		<div class="bac--info-icon-- fa-info-1"></div>\n					 		<div class="bac--info-icon-- fa-error"></div>\n					 		 <div class="bac--info-main-text--" id="bac--info-main-text--'+e+'"></div>\n					 		 <div class="bac--info-close-button-- fa-close-1" id="bac--info-close-button--'+e+'"></div>\n					</div>\n				</div>\n		  '},t=document.getElementById("bac--info-blocks-wrapper--"),n="",i=1;5>i;i++)n+=e(i);t.innerHTML=n},renderVersionNumber:function(e){document.getElementById("puresdk-version-number").innerHTML=e},styleAccount:function(e){var t=document.createElement("img");t.src=e.sdk_logo_icon,document.getElementById("--puresdk-account-logo--").appendChild(t),document.getElementById("--puresdk-bac--header-apps--").style.cssText="background: #"+e.sdk_background_color+"; color: #"+e.sdk_font_color,document.getElementById("--puresdk-user-sidebar--").style.cssText="background: #"+e.sdk_background_color+"; color: #"+e.sdk_font_color,document.getElementById("--puresdk-account-logo--").onclick=function(e){window.location.href="/"}},goToLoginPage:function(){window.location.href=d.getLoginUrl()},showLoader:function(){o.addClass(document.getElementById("--puresdk--loader--"),"--puresdk-visible")},hideLoader:function(){o.removeClass(document.getElementById("--puresdk--loader--"),"--puresdk-visible")},setInfo:function(e,t,n){s.showInfo(e,t,n)},render:function(){var e=document.getElementById(d.getHTLMContainer());if(null===e){i.error('the container with id "'+e+'" has not been found on the document. The library is going to create it.');var t=document.createElement("div");t.id=d.getHTLMContainer(),t.style.width="100%",t.style.height="50px",t.style.position="fixed",t.style.top="0",t.style.zIndex=9999999999,document.body.insertBefore(t,document.body.firstChild),e=document.getElementById(d.getHTLMContainer())}e.innerHTML=d.getHTML(),u.styleAccount(d.getUserData().user.account),u.renderUser(d.getUserData().user),u.renderInfoBlocks(),u.renderAccounts(d.getUserData().user.accounts),u.renderVersionNumber(d.getVersionNumber()),d.getAppsVisible()===!1&&(document.getElementById("--puresdk-apps-section--").style.cssText="display:none"),p()}};t.exports=u},{"./modules/avatar-controller":3,"./modules/caller":4,"./modules/dom":5,"./modules/info-controller":6,"./modules/logger":7,"./modules/pubsub":8,"./modules/store":9}],2:[function(e,t,n){"use strict";var i=e("./PPBA");i.setWindowName("PURESDK"),i.setConfiguration({logs:!1,rootUrl:"/",baseUrl:"api/v1/",loginUrl:"api/v1/oauth2",searchInputId:"--puresdk--search--input--",redirectUrlParam:"redirect_url"}),i.setHTMLTemplate('<header class="bac--header-apps" id="--puresdk-bac--header-apps--">\n    <div class="bac--container">\n        <div class="bac--logo" id="--puresdk-account-logo--"></div>\n        <div class="bac--user-actions">\n            <svg id="--puresdk--loader--" width="38" height="38" viewBox="0 0 44 44" xmlns="http://www.w3.org/2000/svg" stroke="#fff" style="\n    margin-right: 10px;\n">\n                <g fill="none" fill-rule="evenodd" stroke-width="2">\n                    <circle cx="22" cy="22" r="16.6437">\n                        <animate attributeName="r" begin="0s" dur="1.8s" values="1; 20" calcMode="spline" keyTimes="0; 1" keySplines="0.165, 0.84, 0.44, 1" repeatCount="indefinite"></animate>\n                        <animate attributeName="stroke-opacity" begin="0s" dur="1.8s" values="1; 0" calcMode="spline" keyTimes="0; 1" keySplines="0.3, 0.61, 0.355, 1" repeatCount="indefinite"></animate>\n                    </circle>\n                    <circle cx="22" cy="22" r="19.9282">\n                        <animate attributeName="r" begin="-0.9s" dur="1.8s" values="1; 20" calcMode="spline" keyTimes="0; 1" keySplines="0.165, 0.84, 0.44, 1" repeatCount="indefinite"></animate>\n                        <animate attributeName="stroke-opacity" begin="-0.9s" dur="1.8s" values="1; 0" calcMode="spline" keyTimes="0; 1" keySplines="0.3, 0.61, 0.355, 1" repeatCount="indefinite"></animate>\n                    </circle>\n                </g>\n            </svg>\n            <div class="bac--user-apps" id="--puresdk-apps-section--">\n                <div id="--puresdk--apps--opener--">\n                    <i class="fa fa-squares" id="--puresdk-apps-icon--"></i>\n                    <div class="--puresdk-apps-name--">apps</div>\n                </div>\n                <div class="bac--apps-container" id="--puresdk-apps-container--">\n                    <div class="bac--apps-arrow"></div>\n                </div>\n            </div>\n            <!--<div class="bac&#45;&#45;user-notifications">-->\n                <!--<div class="bac&#45;&#45;user-notifications-count">1</div>-->\n                <!--<i class="fa fa-bell-o"></i>-->\n            <!--</div>-->\n            <div class="bac--user-avatar" id="bac--user-avatar-top">\n                <span class="bac--user-avatar-name" id="--puresdk-user-avatar--"></span>\n                <div id="bac--image-container-top"></div>\n            </div>\n        </div>\n    </div>\n    <div id="bac--info-blocks-wrapper--"></div>\n</header>\n<div class="bac--user-sidebar" id="--puresdk-user-sidebar--">\n    <div id="--puresdk-user-details--"></div>\n    <!--<div class="bac&#45;&#45;user-sidebar-info">-->\n        <!--<div class="bac&#45;&#45;user-image"><i class="fa fa-camera"></i></div>-->\n        <!--<div class="bac&#45;&#45;user-name">Curtis Bartlett</div>-->\n        <!--<div class="bac&#45;&#45;user-email">cbartlett@pureprofile.com</div>-->\n    <!--</div>-->\n    <div class="bac--user-apps" id="--puresdk-user-businesses--">\n        <!--<div class="bac&#45;&#45;user-list-item">-->\n            <!--<img src="http://lorempixel.com/40/40" alt="">-->\n            <!--<div class="bac-user-app-details">-->\n                <!--<span></span>-->\n                <!--<span>15 team members</span>-->\n            <!--</div>-->\n        <!--</div>-->\n    </div>\n    <div class="bac--user-account-settings">\n        <!--<div class="bac-user-acount-list-item">-->\n            <!--<i class="fa fa-cog-line"></i>-->\n            <!--<a href="#">Account Security</a>-->\n        <!--</div>-->\n        <div class="bac-user-acount-list-item">\n            <i class="fa fa-login-line"></i>\n            <a href="/api/v1/sign-off">Log out</a>\n        </div>\n\n        <div id="puresdk-version-number" class="puresdk-version-number"></div>\n    </div>\n</div>\n<input style="display:none" type=\'file\' id=\'---puresdk-avatar-file\'>\n<input style="display:none" type=\'button\' id=\'---puresdk-avatar-submit\' value=\'Upload!\'>'),i.setVersionNumber("2.3.11"),window&&(window.PURESDK=i);var a='html,body,div,span,applet,object,iframe,h1,h2,h3,h4,h5,h6,p,blockquote,pre,a,abbr,acronym,address,big,cite,code,del,dfn,em,img,ins,kbd,q,s,samp,small,strike,strong,sub,sup,tt,var,b,u,i,center,dl,dt,dd,ol,ul,li,fieldset,form,label,legend,table,caption,tbody,tfoot,thead,tr,th,td,article,aside,canvas,details,embed,figure,figcaption,footer,header,hgroup,menu,nav,output,ruby,section,summary,time,mark,audio,video{margin:0;padding:0;border:0;font-size:100%;font:inherit;vertical-align:baseline}article,aside,details,figcaption,figure,footer,header,hgroup,menu,nav,section{display:block}body{line-height:1}ol,ul{list-style:none}blockquote,q{quotes:none}blockquote:before,blockquote:after,q:before,q:after{content:"";content:none}table{border-collapse:collapse;border-spacing:0}body{overflow-x:hidden}#bac-wrapper{font-family:"Verdana", arial, sans-serif;color:white;min-height:100vh;position:relative}.bac--container{max-width:1160px;margin:0 auto}.bac--header-apps{position:absolute;width:100%;height:50px;background-color:#475369;padding:5px 10px;z-index:9999999;-webkit-box-shadow:0px 1px 12px 0px rgba(0,0,0,0.75);-moz-box-shadow:0px 1px 12px 0px rgba(0,0,0,0.75);box-shadow:0px 1px 12px 0px rgba(0,0,0,0.75)}.bac--header-apps .bac--container{height:100%;display:flex;align-items:center;justify-content:space-between}.bac--header-search{position:relative}.bac--header-search input{color:#fff;font-size:14px;height:35px;background-color:#6b7586;padding:0 5px 0 10px;border:none;border-radius:3px;min-width:400px;width:100%}.bac--header-search input:focus{outline:none}.bac--header-search input::-webkit-input-placeholder{font-style:normal !important;text-align:center;color:#fff;font-size:14px;font-weight:300;letter-spacing:0.5px}.bac--header-search input::-moz-placeholder{font-style:normal !important;text-align:center;color:#fff;font-size:14px;font-weight:300;letter-spacing:0.5px}.bac--header-search input:-ms-input-placeholder{font-style:normal !important;text-align:center;color:#fff;font-size:14px;font-weight:300;letter-spacing:0.5px}.bac--header-search i{position:absolute;top:8px;right:10px}.bac--user-actions{display:flex;align-items:center}.bac--user-actions>div{cursor:pointer;color:white}.bac--user-actions .bac--user-notifications{position:relative}.bac--user-actions .bac--user-notifications i{font-size:20px}.bac--user-actions #--puresdk--loader--{display:none}.bac--user-actions #--puresdk--loader--.--puresdk-visible{display:block}.bac--user-actions .bac--user-notifications-count{position:absolute;display:inline-block;height:15px;width:15px;line-height:15px;color:#fff;font-size:10px;text-align:center;background-color:#fc3b30;border-radius:50%;top:-5px;left:-5px}.bac--user-actions .bac--user-avatar,.bac--user-actions .bac--user-notifications{margin-left:20px}.bac--user-actions .bac--user-avatar{position:relative;overflow:hidden;border-radius:50%}.bac--user-actions .bac--user-avatar #bac--image-container-top{width:100%;heigth:100%;position:absolute;top:0;left:0;z-index:1;display:none}.bac--user-actions .bac--user-avatar #bac--image-container-top img{width:100%;height:100%}.bac--user-actions .bac--user-avatar #bac--image-container-top.--puresdk-visible{display:block}.bac--user-actions .bac--user-avatar-name{color:#fff;background-color:#adadad;display:inline-block;height:35px;width:35px;line-height:35px;text-align:center;font-size:14px}.bac--user-apps{position:relative}.bac--user-apps #--puresdk-apps-icon--{width:20px;display:inline-block;text-align:center}.bac--user-apps .--puresdk-apps-name--{font-size:8px;width:20px;text-align:center}#--puresdk-user-businesses--{height:calc(100vh - 458px);overflow:auto}.bac--apps-container{background:#fff;position:absolute;top:45px;right:-40px;display:flex;width:360px;flex-wrap:wrap;border-radius:10px;padding:30px;justify-content:space-between;text-align:center;-webkit-box-shadow:0 0 10px 2px rgba(0,0,0,0.2);box-shadow:0 0 10px 2px rgba(0,0,0,0.2);opacity:0;visibility:hidden;transition:all 0.4s ease}.bac--apps-container.active{opacity:1;visibility:visible}.bac--apps-container .bac--apps-arrow{position:absolute;display:block;height:20px;width:20px;top:-10px;right:36px;background:#fff;transform:rotate(-45deg);z-index:1}.bac--apps-container .bac--apps{width:32%;display:flex;font-size:30px;margin-bottom:40px;text-align:center;justify-content:center;flex-wrap:wrap}.bac--apps-container .bac--apps a{display:block;color:#fff;text-decoration:none;width:65px;height:65px;padding-top:3px;line-height:65px;text-align:center;border-radius:10px;-webkit-box-shadow:0 0 5px 0 rgba(0,0,0,0.2);box-shadow:0 0 5px 0 rgba(0,0,0,0.2)}.bac--apps-container .bac--apps .bac--app-name{width:100%;color:#000;font-size:14px;padding:10px 0 5px 0}.bac--apps-container .bac--apps .bac--app-description{color:#919191;font-size:12px;font-style:italic;line-height:1.3em}.bac--user-sidebar{font-family:"Verdana", arial, sans-serif;color:white;height:calc(100vh - 50px);background-color:#515f77;box-sizing:border-box;width:320px;position:absolute;top:0;right:0;z-index:999999;padding-top:10px;opacity:0;margin-top:50px;transform:translateX(100%);transition:all 0.4s ease}.bac--user-sidebar.active{opacity:1;transform:translateX(0%);-webkit-box-shadow:-1px 0px 12px 0px rgba(0,0,0,0.75);-moz-box-shadow:-1px 3px 12px 0px rgba(0,0,0,0.75);box-shadow:-1px 0px 12px 0px rgba(0,0,0,0.75)}.bac--user-sidebar .bac--user-list-item{display:flex;cursor:pointer;align-items:center;padding:10px 10px 10px 40px;border-bottom:2px solid #6b7586}.bac--user-sidebar .bac--user-list-item:hover{background-color:#6b7586}.bac--user-sidebar .bac--user-list-item .bac--user-list-item-image{width:40px;height:40px;border-radius:3px;border:2px solid #fff;margin-right:20px;display:flex;align-items:center;justify-content:center}.bac--user-sidebar .bac--user-list-item .bac--user-list-item-image>img{width:auto;height:auto;max-width:100%;max-height:100%}.bac--user-sidebar .bac--user-list-item span{width:100%;display:block;margin-bottom:5px}.bac--user-sidebar .bac-user-app-details span{font-size:12px}.bac--user-sidebar .puresdk-version-number{width:100%;text-align:right;padding-right:10px;position:absolute;bottom:10px;font-size:8px;opacity:0.5;left:0}.bac--user-sidebar-info{display:flex;justify-content:center;flex-wrap:wrap;text-align:center;padding:10px 20px 15px}.bac--user-sidebar-info .bac--user-image{border:1px #adadad solid;overflow:hidden;border-radius:50%;position:relative;cursor:pointer;display:inline-block;height:80px;width:80px;line-height:80px;text-align:center;color:#fff;border-radius:50%;background-color:#adadad;margin-bottom:15px}.bac--user-sidebar-info .bac--user-image #bac--user-image-file{display:none;position:absolute;z-index:1;top:0;left:0;width:100%;height:100%}.bac--user-sidebar-info .bac--user-image #bac--user-image-file img{width:100%;height:100%}.bac--user-sidebar-info .bac--user-image #bac--user-image-file.--puresdk-visible{display:block}.bac--user-sidebar-info .bac--user-image #bac--user-image-upload-progress{position:absolute;padding-top:10px;top:0;background:#666;z-index:4;display:none;width:100%;height:100%}.bac--user-sidebar-info .bac--user-image #bac--user-image-upload-progress.--puresdk-visible{display:block}.bac--user-sidebar-info .bac--user-image i{font-size:32px;font-size:32px;z-index:0;position:absolute;width:100%;left:0;background-color:rgba(0,0,0,0.5)}.bac--user-sidebar-info .bac--user-image:hover i{z-index:3}.bac--user-sidebar-info .bac--user-name{width:100%;text-align:center;font-size:18px;margin-bottom:10px}.bac--user-sidebar-info .bac--user-email{font-size:12px;font-weight:300}.bac--user-account-settings{padding:50px}.bac--user-account-settings .bac-user-acount-list-item{display:flex;align-items:center;margin-bottom:30px}.bac--user-account-settings .bac-user-acount-list-item a{text-decoration:none;color:#fff}.bac--user-account-settings .bac-user-acount-list-item i{font-size:24px;margin-right:20px}#--puresdk-account-logo--{cursor:pointer}#--puresdk-account-logo-- img{height:28px}#bac--info-blocks-wrapper--{position:relative}#bac--info-blocks-wrapper-- .--puresdk-info-box--{border-radius:0 0 3px 3px;overflow:hidden;z-index:99999999;position:fixed;top:-41px;width:470px;left:calc(50vw - 235px);height:40px;-webkit-transition:top 0.4s;transition:top 0.4s}#bac--info-blocks-wrapper-- .--puresdk-info-box--.bac--success{background:#14DA9E}#bac--info-blocks-wrapper-- .--puresdk-info-box--.bac--success .bac--inner-info-box-- div.bac--info-icon--.fa-success{display:inline-block}#bac--info-blocks-wrapper-- .--puresdk-info-box--.bac--info{background-color:#5BC0DE}#bac--info-blocks-wrapper-- .--puresdk-info-box--.bac--info .bac--inner-info-box-- div.bac--info-icon--.fa-info-1{display:inline-block}#bac--info-blocks-wrapper-- .--puresdk-info-box--.bac--warning{background:#F0AD4E}#bac--info-blocks-wrapper-- .--puresdk-info-box--.bac--warning .bac--inner-info-box-- div.bac--info-icon--.fa-warning{display:inline-block}#bac--info-blocks-wrapper-- .--puresdk-info-box--.bac--error{background:#EF4100}#bac--info-blocks-wrapper-- .--puresdk-info-box--.bac--error .bac--inner-info-box-- div.bac--info-icon--.fa-error{display:inline-block}#bac--info-blocks-wrapper-- .--puresdk-info-box-- .bac--timer{-webkit-transition-timing-function:linear;transition-timing-function:linear;position:absolute;bottom:0px;opacity:0.5;height:2px !important;background:white;width:0%}#bac--info-blocks-wrapper-- .--puresdk-info-box-- .bac--timer.bac--fullwidth{width:100%}#bac--info-blocks-wrapper-- .--puresdk-info-box--.bac--active--{top:0px}#bac--info-blocks-wrapper-- .--puresdk-info-box-- .bac--inner-info-box--{width:100%;padding:11px 15px;color:white}#bac--info-blocks-wrapper-- .--puresdk-info-box-- .bac--inner-info-box-- div{display:inline-block;height:18px;position:relative}#bac--info-blocks-wrapper-- .--puresdk-info-box-- .bac--inner-info-box-- div.bac--info-icon--{display:none;top:0px}#bac--info-blocks-wrapper-- .--puresdk-info-box-- .bac--inner-info-box-- .bac--info-icon--{margin-right:15px;width:10px;top:2px}#bac--info-blocks-wrapper-- .--puresdk-info-box-- .bac--inner-info-box-- .bac--info-main-text--{width:380px;margin-right:15px;font-size:12px;text-align:center}#bac--info-blocks-wrapper-- .--puresdk-info-box-- .bac--inner-info-box-- .bac--info-close-button--{width:10px;cursor:pointer;top:2px}',r=document.head||document.getElementsByTagName("head")[0],o=document.createElement("style");o.type="text/css",o.styleSheet?o.styleSheet.cssText=a:o.appendChild(document.createTextNode(a)),r.appendChild(o);var s=document.createElement("link");s.href="https://file.myfontastic.com/MDvnRJGhBd5xVcXn4uQJSZ/icons.css",s.rel="stylesheet",document.getElementsByTagName("head")[0].appendChild(s),t.exports=i},{"./PPBA":1}],3:[function(e,t,n){var i=e("./store"),a=e("./logger"),r=e("./dom"),o=e("./caller"),s=!1,c={_submit:null,_file:null,_progress:null,_sidebar_avatar:null,_top_avatar:null,_top_avatar_container:null,init:function(){c._submit=document.getElementById("---puresdk-avatar-submit"),c._file=document.getElementById("---puresdk-avatar-file"),c._top_avatar_container=document.getElementById("bac--image-container-top"),c._progress=document.getElementById("bac--user-image-upload-progress"),c._sidebar_avatar=document.getElementById("bac--user-image-file"),c._top_avatar=document.getElementById("bac--user-avatar-top"),c._file.addEventListener("click",function(e){e.stopPropagation()}),c._file.addEventListener("change",function(e){c.upload()}),document.getElementById("bac--user-image").addEventListener("click",function(e){e.stopPropagation(),c._file.click()})},upload:function(){if(!s&&(s=!0,0!==c._file.files.length)){var e=new FormData;e.append("file",c._file.files[0]);var t=function(e){},n=function(e){},d=new XMLHttpRequest;d.onreadystatechange=function(){if(s=!1,4==d.readyState){try{var e=JSON.parse(d.response).data;c.setAvatar(e.url),o.makeCall({type:"PUT",endpoint:i.getAvatarUpdateUrl(),params:{user:{avatar_uuid:e.guid}},callbacks:{success:t,fail:n}})}catch(r){({status:"error",data:"Unknown error occurred: ["+d.responseText+"]"})}a.log(d.response.status+": "+d.response.data)}};var l=i.getAvatarUploadUrl();r.addClass(c._progress,"--puresdk-visible"),d.open("POST",l),d.send(e)}},setAvatar:function(e){if(e){r.removeClass(c._progress,"--puresdk-visible"),r.addClass(c._sidebar_avatar,"--puresdk-visible");var t=document.createElement("img");t.src=e,c._sidebar_avatar.innerHTML="",c._sidebar_avatar.appendChild(t),r.addClass(c._top_avatar_container,"--puresdk-visible");var n=document.createElement("img");n.src=e,c._top_avatar_container.innerHTML="",c._top_avatar_container.appendChild(n)}}};t.exports=c},{"./caller":4,"./dom":5,"./logger":7,"./store":9}],4:[function(e,t,n){var i=e("./store.js"),a=(e("./logger"),{makeCall:function(e){var t=e.endpoint,n=new XMLHttpRequest;n.open(e.type,t),n.setRequestHeader("Content-Type","application/json"),n.onload=function(){n.status>=200&&n.status<300?e.callbacks.success(JSON.parse(n.responseText)):200!==n.status&&e.callbacks.fail(JSON.parse(n.responseText))},e.params||(e.params={}),n.send(JSON.stringify(e.params))},promiseCall:function(e){return new Promise(function(t,n){var a=new XMLHttpRequest;a.open(e.type,e.endpoint),a.setRequestHeader("Content-Type","application/json"),a.onload=function(){this.status>=200&&this.status<300?(e.middlewares.success(JSON.parse(a.responseText)),t(JSON.parse(a.responseText))):window.location.href=i.getLoginUrl()},a.onerror=function(){window.location=i.getLoginUrl()},a.send()})}});t.exports=a},{"./logger":7,"./store.js":9}],5:[function(e,t,n){var i={hasClass:function(e,t){return e.classList?e.classList.contains(t):new RegExp("(^| )"+t+"( |$)","gi").test(e.className)},removeClass:function(e,t){e.classList?e.classList.remove(t):e.className=e.className.replace(new RegExp("(^|\\b)"+t.split(" ").join("|")+"(\\b|$)","gi")," ")},addClass:function(e,t){e.classList?e.classList.add(t):e.className+=" "+t},toggleClass:function(e,t){this.hasClass(e,t)?this.removeClass(e,t):this.addClass(e,t)}};t.exports=i},{}],6:[function(e,t,n){var i=e("./dom"),a=5e3,r=1,o=[],s={init:function(){for(var e=1;5>e;e++)!function(e){var t=function(){i.removeClass(document.getElementById("--puresdk-info-box--"+e),"bac--active--"),document.getElementById("bac--timer"+e).style.transition="",i.removeClass(document.getElementById("bac--timer"+e),"bac--fullwidth"),o[e-1].inUse=!1,setTimeout(function(){o[e-1].closeTimeout&&clearTimeout(o[e-1].closeTimeout),i.removeClass(document.getElementById("--puresdk-info-box--"+e),"bac--success"),i.removeClass(document.getElementById("--puresdk-info-box--"+e),"bac--info"),i.removeClass(document.getElementById("--puresdk-info-box--"+e),"bac--warning"),i.removeClass(document.getElementById("--puresdk-info-box--"+e),"bac--error")},450)},n=function(t){document.getElementById("bac--info-main-text--"+e).innerHTML=t},a=function(t){document.getElementById("bac--timer"+e).style.transition="width "+t+"ms",i.addClass(document.getElementById("bac--timer"+e),"bac--fullwidth"),o[e-1].closeTimeout=setTimeout(function(){o[e-1].closeFunction()},t)};o.push({id:e,inUse:!1,element:document.getElementById("--puresdk-info-box--"+e),closeFunction:t,addText:n,addTimeout:a,closeTimeout:!1}),document.getElementById("bac--info-close-button--"+e).onclick=function(n){t(e)}}(e)},showInfo:function(e,t,n){for(var s=0;s<o.length;s++){var c=o[s];if(!c.inUse){c.inUse=!0,c.element.style.zIndex=r,c.addText(t),r+=1;var d=a,l=!0;return n&&(null!=n.hideIn&&void 0!=n.hideIn&&-1!=n.hideIn?d=n.hideIn:-1===n.hideIn&&(l=!1)),l&&c.addTimeout(d),i.addClass(c.element,"bac--"+e),void i.addClass(c.element,"bac--active--")}}}};t.exports=s},{"./dom":5}],7:[function(e,t,n){var i=e("./store.js"),a={log:function(e){return i.logsEnabled()?(a.log=console.log.bind(console),void a.log(e)):!1},error:function(e){return i.logsEnabled()?(a.error=console.error.bind(console),void a.error(e)):!1}};t.exports=a},{"./store.js":9}],8:[function(e,t,n){"use strict";var i=e("./store.js"),a=e("./logger.js"),r={searchKeyUp:{info:"Listener on keyUp of search input on top bar"},searchEnter:{info:"Listener on enter key pressed on search input on top bar"},searchOnChange:{info:"Listener on change of input value"}},o={getAvailableListeners:function(){return r},subscribe:function(e,t){if("searchKeyUp"===e){var n=document.getElementById(i.getSearchInputId());return n.addEventListener("keyup",t),function(){n.removeEventListener("keyup",t,!1)}}if("searchEnter"===e){var o=function(e){13===e.keyCode&&t(e)};return n.addEventListener("keydown",o),function(){n.removeEventListener("keydown",o,!1)}}if("searchOnChange"===e){var n=document.getElementById(i.getSearchInputId());return n.addEventListener("change",t),function(){n.removeEventListener("keyup",t,!1)}}return a.error("The event you tried to subscribe is not available by the library"),a.log("The available events are: ",r),function(){}}};t.exports=o},{"./logger.js":7,"./store.js":9}],9:[function(e,t,n){var i={general:{},userData:{},configuration:{},htmlTemplate:"",apps:null,versionNumber:""},a={getState:function(){return Object.assign({},i)},setWindowName:function(e){i.general.windowName=e},setConfiguration:function(e){i.configuration=e},setVersionNumber:function(e){i.versionNumber=e},getVersionNumber:function(){return i.versionNumber},getAppsVisible:function(){
return null===i.configuration.appsVisible||void 0===i.configuration.appsVisible?!0:i.configuration.appsVisible},setAppsVisible:function(e){i.configuration.appsVisible=e},setHTMLTemplate:function(e){i.htmlTemplate=e},setApps:function(e){i.apps=e},getLoginUrl:function(){return i.configuration.rootUrl+i.configuration.loginUrl+"?"+i.configuration.redirectUrlParam+"="+window.location.href},getAuthenticationEndpoint:function(){return i.configuration.rootUrl+i.configuration.baseUrl+"session"},getSwitchAccountEndpoint:function(e){return i.configuration.rootUrl+i.configuration.baseUrl+"accounts/switch/"+e},getAppsEndpoint:function(){return i.configuration.rootUrl+i.configuration.baseUrl+"apps"},logsEnabled:function(){return i.configuration.logs},getSearchInputId:function(){return i.configuration.searchInputId},setHTMLContainer:function(e){i.configuration.headerDivId=e},getHTLMContainer:function(){return i.configuration.headerDivId?i.configuration.headerDivId:"ppsdk-container"},getHTML:function(){return i.htmlTemplate},getWindowName:function(){return i.general.windowName},setUserData:function(e){i.userData=e},getUserData:function(){return i.userData},setRootUrl:function(e){i.configuration.rootUrl=e},getAvatarUploadUrl:function(){return i.configuration.rootUrl+i.configuration.baseUrl+"assets/upload"},getAvatarUpdateUrl:function(){return i.configuration.rootUrl+i.configuration.baseUrl+"users/avatar"}};t.exports=a},{}]},{},[2]);