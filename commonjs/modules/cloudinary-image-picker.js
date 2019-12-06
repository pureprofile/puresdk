"use strict";

var debouncedTimeout = null;
var currentQuery = '';
var limit = 8;
var latency = 500;
var initOptions;
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
      }; // TODO set search input's value = ''

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
          return "<img src=".concat(item.thumb, " alt=\"\"/>");
        } else {
          return "<i class=\"fa fa-folder-o\"></i>";
        }
      };

      var funct = function funct() {
        CloudinaryPicker.itemSelected(item);
      };

      var newDomEl = document.createElement('div');
      newDomEl.className = "cloud-images__item";
      newDomEl.onclick = funct;
      newDomEl.innerHTML = "\n\t\t\t\t\t\t  <div class=\"cloud-images__item__type\">\n\t\t\t\t\t\t\t\t".concat(itemIcon(), "\n\t\t\t\t\t\t  </div>\n\t\t\t\t\t\t  <div class=\"cloud-images__item__details\">\n\t\t\t\t\t\t\t\t<span class=\"cloud-images__item__details__name\">").concat(item.name, "</span>\n\t\t\t\t\t\t\t\t<span class=\"cloud-images__item__details__date\">").concat(item.crdate, "</span>\n\t\t\t\t\t\t  </div>\n\t\t\t\t\t\t  <div class=\"cloud-images__item__actions\">\n\t\t\t\t\t\t\t\t<a class=\"fa fa-pencil\"></a>\n\t\t\t\t\t\t  </div>");
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