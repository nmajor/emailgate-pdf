'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

var _config = require('../config');

var _config2 = _interopRequireDefault(_config);

var _connection = require('../connection');

var _connection2 = _interopRequireDefault(_connection);

var _pdfHelper = require('../lib/pdfHelper');

var pdfHelper = _interopRequireWildcard(_pdfHelper);

var _assert = require('assert');

var _assert2 = _interopRequireDefault(_assert);

function _interopRequireWildcard(obj) { if (obj && obj.__esModule) { return obj; } else { var newObj = {}; if (obj != null) { for (var key in obj) { if (Object.prototype.hasOwnProperty.call(obj, key)) newObj[key] = obj[key]; } } newObj.default = obj; return newObj; } }

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

var PagePdfPlan = function () {
  function PagePdfPlan(options) {
    _classCallCheck(this, PagePdfPlan);

    this.task = options.task;

    this.getPage = this.getPage.bind(this);
    this.buildPdf = this.buildPdf.bind(this);
    this.uploadPdf = this.uploadPdf.bind(this);
    this.savePdfResults = this.savePdfResults.bind(this);
    this.log = this.log.bind(this);
    this.start = this.start.bind(this);
  }

  _createClass(PagePdfPlan, [{
    key: 'getPage',
    value: function getPage() {
      var _this = this;

      return new Promise(function (resolve) {
        _this.log('status', 'Finding Page.');

        (0, _connection2.default)(function (db) {
          var collection = db.collection('pages');
          collection.findOne({ _id: _this.task.pageId }, function (err, doc) {
            _assert2.default.equal(err, null);
            _assert2.default.ok(doc);

            _this.log('status', 'Found Page');
            _this.page = doc;

            resolve(_this.page);
          });
        });
      });
    }
  }, {
    key: 'buildPdf',
    value: function buildPdf() {
      var page = this.page;
      var html = page.html;
      return pdfHelper.buildPdf(html, 'page', page, _config2.default.pageOptions, this.log);
    }
  }, {
    key: 'uploadPdf',
    value: function uploadPdf(pdfObj) {
      return pdfHelper.uploadPdfObject(pdfObj, this.log);
    }
  }, {
    key: 'savePdfResults',
    value: function savePdfResults(pdfResults) {
      var _this2 = this;

      return new Promise(function (resolve) {
        _this2.log('status', 'Saving pdf results');

        (0, _connection2.default)(function (db) {
          var collection = db.collection('pages');
          collection.update({ _id: _this2.task.pageId }, { $set: { pdf: pdfResults } }, function (err, result) {
            _assert2.default.equal(err, null);
            _assert2.default.equal(result.result.n, 1);

            _this2.log('status', 'Finished saving pdf results');

            resolve();
          });
        });
      });
    }
  }, {
    key: 'log',
    value: function log(type, message, payload) {
      this.task.addLog(type, message, payload);
    }
  }, {
    key: 'start',
    value: function start() {
      var _this3 = this;

      this.log('status', 'Starting Task');

      return this.getPage().then(function () {
        return _this3.buildPdf();
      }).then(function (pdfObj) {
        return _this3.uploadPdf(pdfObj);
      }).then(this.savePdfResults);
    }
  }]);

  return PagePdfPlan;
}();

exports.default = PagePdfPlan;