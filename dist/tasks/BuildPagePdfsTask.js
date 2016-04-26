'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

var _lodash = require('lodash');

var _lodash2 = _interopRequireDefault(_lodash);

var _logHelper = require('../lib/logHelper');

var _pdfHelper = require('../lib/pdfHelper');

var pdfHelper = _interopRequireWildcard(_pdfHelper);

function _interopRequireWildcard(obj) { if (obj && obj.__esModule) { return obj; } else { var newObj = {}; if (obj != null) { for (var key in obj) { if (Object.prototype.hasOwnProperty.call(obj, key)) newObj[key] = obj[key]; } } newObj.default = obj; return newObj; } }

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

var BuildPagePdfsTask = function () {
  function BuildPagePdfsTask(options) {
    _classCallCheck(this, BuildPagePdfsTask);

    this.db = options.db;
    this.props = options.props;
    this.config = options.config;

    this.pageQuery = this.pageQuery.bind(this);
    this.buildPagePdf = this.buildPagePdf.bind(this);
    this.getPages = this.getPages.bind(this);
    this.buildPdfForPages = this.buildPdfForPages.bind(this);
  }

  _createClass(BuildPagePdfsTask, [{
    key: 'pageQuery',
    value: function pageQuery() {
      return {
        _id: { $in: this.props.pageIds }
      };
    }
  }, {
    key: 'buildPagePdf',
    value: function buildPagePdf(page) {
      var html = page.html;
      return pdfHelper.buildPdf(html, 'page', page, this.config.pageOptions);
    }
  }, {
    key: 'getPages',
    value: function getPages() {
      var _this = this;

      return new Promise(function (resolve) {
        var collection = _this.db.collection('pages');
        collection.find(_this.pageQuery()).toArray(function (err, docs) {
          if (err) {
            (0, _logHelper.log)('error', 'An error happened while getting emails.', err.message);return;
          }

          resolve(docs);
        });
      });
    }
  }, {
    key: 'buildPdfForPages',
    value: function buildPdfForPages(pages) {
      var _this2 = this;

      var count = 1;
      var pageLength = pages.length;
      (0, _logHelper.log)('status', 'Found ' + pageLength + ' compilation pages.');

      var p = Promise.resolve();

      _lodash2.default.forEach(pages, function (page) {
        p = p.then(function () {
          return _this2.buildPagePdf(page).then(function (pdfObj) {
            return pdfHelper.uploadPdfObject(pdfObj, _this2.config.mantaClient);
          }).then(function (result) {
            (0, _logHelper.log)('page-pdf', 'Added page pdf ' + result._id + ' ' + count + '/' + pageLength, result);
            count++;
          });
        });
      });

      return p;
    }
  }, {
    key: 'run',
    value: function run() {
      return this.getPages().then(this.buildPdfForPages);
    }
  }]);

  return BuildPagePdfsTask;
}();

exports.default = BuildPagePdfsTask;