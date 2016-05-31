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

function _interopRequireWildcard(obj) { if (obj && obj.__esModule) { return obj; } else { var newObj = {}; if (obj != null) { for (var key in obj) { if (Object.prototype.hasOwnProperty.call(obj, key)) newObj[key] = obj[key]; } } newObj.default = obj; return newObj; } }

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

var PagePdfPlan = function () {
  function PagePdfPlan(options) {
    _classCallCheck(this, PagePdfPlan);

    this.pageId = options.pageId;
    this.progress = options.progress || function () {}; // eslint-disable-line func-names
    this.data = options.data || {};

    // stepsTotal should be the number of times this.step() is called within this.start()
    this.stepsTotal = 4;
    this.stepsCompleted = 0;

    this.getPage = this.getPage.bind(this);
    this.buildPdf = this.buildPdf.bind(this);
    this.uploadPdf = this.uploadPdf.bind(this);
    this.savePdfResults = this.savePdfResults.bind(this);
    this.step = this.step.bind(this);
    this.start = this.start.bind(this);
  }

  _createClass(PagePdfPlan, [{
    key: 'getPage',
    value: function getPage() {
      var _this = this;

      return new Promise(function (resolve, reject) {
        (0, _connection2.default)(function (db) {
          var collection = db.collection('pages');
          collection.findOne({ _id: _this.pageId }, function (err, doc) {
            // eslint-disable-line consistent-return
            if (err) {
              return reject(err);
            }
            if (!doc) {
              return reject(new Error('No document found.'));
            }

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
      return pdfHelper.buildPdf(html, 'page', page, _config2.default.pageOptions);
    }
  }, {
    key: 'uploadPdf',
    value: function uploadPdf(pdfObj) {
      return pdfHelper.uploadPdfObject(pdfObj);
    }
  }, {
    key: 'savePdfResults',
    value: function savePdfResults(pdfResults) {
      var _this2 = this;

      return new Promise(function (resolve, reject) {
        (0, _connection2.default)(function (db) {
          var collection = db.collection('pages');
          collection.update({ _id: _this2.pageId }, { $set: { pdf: pdfResults } }, function (err, result) {
            // eslint-disable-line consistent-return
            if (err) {
              return reject(err);
            }
            if (result.result.n !== 1) {
              return reject(new Error('No document updated.'));
            }

            resolve();
          });
        });
      });
    }
  }, {
    key: 'step',
    value: function step(stepPromise, data) {
      var _this3 = this;

      return stepPromise.then(function (result) {
        _this3.stepsCompleted += 1;
        _this3.progress(_this3.stepsCompleted, _this3.stepsTotal, data);

        return Promise.resolve(result);
      });
    }
  }, {
    key: 'start',
    value: function start() {
      var _this4 = this;

      return this.step(this.getPage()).then(function () {
        return _this4.step(_this4.buildPdf());
      }).then(function (pdfObj) {
        return _this4.step(_this4.uploadPdf(pdfObj));
      }).then(function (results) {
        return _this4.step(_this4.savePdfResults(results));
      });
    }
  }]);

  return PagePdfPlan;
}();

exports.default = PagePdfPlan;