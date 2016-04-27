'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});

var _slicedToArray = function () { function sliceIterator(arr, i) { var _arr = []; var _n = true; var _d = false; var _e = undefined; try { for (var _i = arr[Symbol.iterator](), _s; !(_n = (_s = _i.next()).done); _n = true) { _arr.push(_s.value); if (i && _arr.length === i) break; } } catch (err) { _d = true; _e = err; } finally { try { if (!_n && _i["return"]) _i["return"](); } finally { if (_d) throw _e; } } return _arr; } return function (arr, i) { if (Array.isArray(arr)) { return arr; } else if (Symbol.iterator in Object(arr)) { return sliceIterator(arr, i); } else { throw new TypeError("Invalid attempt to destructure non-iterable instance"); } }; }();

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

var _lodash = require('lodash');

var _lodash2 = _interopRequireDefault(_lodash);

var _logHelper = require('../lib/logHelper');

var _pdfHelper = require('../lib/pdfHelper');

var pdfHelper = _interopRequireWildcard(_pdfHelper);

function _interopRequireWildcard(obj) { if (obj && obj.__esModule) { return obj; } else { var newObj = {}; if (obj != null) { for (var key in obj) { if (Object.prototype.hasOwnProperty.call(obj, key)) newObj[key] = obj[key]; } } newObj.default = obj; return newObj; } }

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function _toConsumableArray(arr) { if (Array.isArray(arr)) { for (var i = 0, arr2 = Array(arr.length); i < arr.length; i++) { arr2[i] = arr[i]; } return arr2; } else { return Array.from(arr); } }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

var BuildCompilationPdfTask = function () {
  function BuildCompilationPdfTask(options) {
    _classCallCheck(this, BuildCompilationPdfTask);

    this.db = options.db;
    this.props = options.props;
    this.config = options.config;

    this.getEmails = this.getEmails.bind(this);
    this.getPages = this.getPages.bind(this);
    this.downloadEmails = this.downloadEmails.bind(this);
    this.downloadPages = this.downloadPages.bind(this);
    this.compilePdfDocuments = this.compilePdfDocuments.bind(this);
    this.getCompilationPdfPages = this.getCompilationPdfPages.bind(this);
  }

  _createClass(BuildCompilationPdfTask, [{
    key: 'getEmails',
    value: function getEmails() {
      var _this = this;

      return new Promise(function (resolve) {
        var collection = _this.db.collection('emails');
        collection.find({ _compilation: _this.props.compilationId }).toArray(function (err, docs) {
          if (err) {
            (0, _logHelper.log)('error', 'An error happened while getting emails.', err.message);return;
          }

          resolve(docs.slice(0, 5));
        });
      });
    }
  }, {
    key: 'getPages',
    value: function getPages() {
      var _this2 = this;

      return new Promise(function (resolve) {
        var collection = _this2.db.collection('pages');
        collection.find({ _compilation: _this2.props.compilationId }).toArray(function (err, docs) {
          if (err) {
            (0, _logHelper.log)('error', 'An error happened while getting pages.', err.message);return;
          }

          resolve(docs);
        });
      });
    }
  }, {
    key: 'downloadEmails',
    value: function downloadEmails(emails) {
      var count = 1;
      var emailCount = emails.length;

      return Promise.all(emails.map(function (email) {
        return pdfHelper.downloadPdf(email.pdf).then(function (localPath) {
          (0, _logHelper.log)('status', 'Downloaded pdf file ' + email.pdf.filename + ' ' + count + '/' + emailCount);
          count++;
          email.pdf.localPath = localPath; // eslint-disable-line no-param-reassign
          return Promise.resolve(email);
        });
      }));
    }
  }, {
    key: 'downloadPages',
    value: function downloadPages(pages) {
      var count = 1;
      var pageCount = pages.length;

      return Promise.all(pages.map(function (page) {
        return pdfHelper.downloadPdf(page.pdf).then(function (localPath) {
          (0, _logHelper.log)('status', 'Downloaded pdf file ' + page.pdf.filename + ' ' + count + '/' + pageCount);
          count++;

          page.pdf.localPath = localPath; // eslint-disable-line no-param-reassign
          return Promise.resolve(page);
        });
      }));
    }
  }, {
    key: 'compilePdfDocuments',
    value: function compilePdfDocuments(emails, pages) {
      var _this3 = this;

      return new Promise(function (resolve, reject) {
        var sortedEmails = _lodash2.default.sortBy(emails, function (email) {
          return _this3.props.emailPositionMap[email._id];
        });
        var sortedPages = _lodash2.default.sortBy(pages, function (page) {
          return _this3.props.pagePositionMap[page._id];
        });

        var pageFileArguments = _lodash2.default.map(sortedPages, function (page) {
          return page.pdf.localPath;
        });
        var emailFileArguments = _lodash2.default.map(sortedEmails, function (email) {
          return email.pdf.localPath;
        });

        var spawn = require('child_process').spawn;
        var pdftk = spawn('pdftk', [].concat(_toConsumableArray(pageFileArguments), _toConsumableArray(emailFileArguments), ['cat', 'output', '-']));

        var pdfBuffers = [];
        pdftk.stdout.on('data', function (chunk) {
          pdfBuffers.push(chunk);
        });
        pdftk.stdout.on('end', function () {
          resolve(Buffer.concat(pdfBuffers));
        });

        pdftk.stderr.on('data', function (chunk) {
          (0, _logHelper.log)('error', 'An error happened with the pdftk command.', chunk.toString('utf8'));
          reject('An error happened with the pdftk command.');
        });
      });
    }
  }, {
    key: 'getCompilationPdfPages',
    value: function getCompilationPdfPages(buffer) {
      var _this4 = this;

      return pdfHelper.getPdfPages(buffer).then(function (pageCount) {
        return Promise.resolve({
          model: 'compilation',
          _id: _this4.props.compilationId,
          pageCount: pageCount,
          buffer: buffer
        });
      });
    }
  }, {
    key: 'run',
    value: function run() {
      var _this5 = this;

      return Promise.all([this.getEmails(), this.getPages()]).then(function (results) {
        var _results = _slicedToArray(results, 2);

        var emails = _results[0];
        var pages = _results[1];

        (0, _logHelper.log)('status', 'Found compilation emails(' + emails.length + ') and pages(' + pages.length + ').');

        return Promise.all([_this5.downloadEmails(emails), _this5.downloadPages(pages)]);
      }).then(function (results) {
        var _results2 = _slicedToArray(results, 2);

        var emails = _results2[0];
        var pages = _results2[1];

        (0, _logHelper.log)('status', 'Downloaded email and page pdf files.');

        return _this5.compilePdfDocuments(emails, pages);
      }).then(this.getCompilationPdfPages).then(function (pdfObj) {
        (0, _logHelper.log)('status', 'Compiled the pdfs into one ' + pdfObj.pageCount + ' page file.');
        return pdfHelper.uploadPdfObject(pdfObj, _this5.config.mantaClient);
      }).then(function (result) {
        (0, _logHelper.log)('compilation-pdf', 'Added compilation pdf ' + result._id, result);
        return Promise.resolve();
      });
    }
  }]);

  return BuildCompilationPdfTask;
}();

exports.default = BuildCompilationPdfTask;