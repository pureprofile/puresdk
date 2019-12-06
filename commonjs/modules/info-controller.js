"use strict";

var dom = require('./dom');

var defaultHideIn = 5000;
var lastIndex = 1;
var numOfInfoBlocks = 10;
var infoBlocks = [];
var InfoController = {
  renderInfoBlocks: function renderInfoBlocks() {
    var blocksTemplate = function blocksTemplate(index) {
      return "\n\t\t\t\t <div class=\"bac--puresdk-info-box--\" id=\"bac--puresdk-info-box--".concat(index, "\">\n\t\t\t\t \t<div class=\"bac--timer\" id=\"bac--timer").concat(index, "\"></div>\n\t\t\t\t\t <div class=\"bac--inner-info-box--\">\n\t\t\t\t\t \t\t<div class=\"bac--info-icon-- fa-success\"></div>\n\t\t\t\t\t \t\t<div class=\"bac--info-icon-- fa-warning\"></div>\n\t\t\t\t\t \t\t<div class=\"bac--info-icon-- fa-info-1\"></div>\n\t\t\t\t\t \t\t<div class=\"bac--info-icon-- fa-error\"></div>\n\t\t\t\t\t \t\t <div class=\"bac--info-main-text--\" id=\"bac--info-main-text--").concat(index, "\"></div>\n\t\t\t\t\t \t\t <div class=\"bac--info-close-button-- fa-close-1\" id=\"bac--info-close-button--").concat(index, "\"></div>\n\t\t\t\t\t</div>\n\t\t\t\t</div>\n\t\t  ");
    };

    var infoBlocksWrapper = document.getElementById('bac--info-blocks-wrapper--');
    var innerHtml = '';

    for (var i = 1; i < numOfInfoBlocks; i++) {
      innerHtml += blocksTemplate(i);
    }

    infoBlocksWrapper.innerHTML = innerHtml;
  },
  init: function init() {
    for (var i = 1; i < numOfInfoBlocks; i++) {
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
    for (var i = 0; i < numOfInfoBlocks; i++) {
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