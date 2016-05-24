'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

var _lodash = require('lodash');

var _lodash2 = _interopRequireDefault(_lodash);

var _pdfHelper = require('../lib/pdfHelper');

var pdfHelper = _interopRequireWildcard(_pdfHelper);

var _connection = require('../connection');

var _connection2 = _interopRequireDefault(_connection);

var _assert = require('assert');

var _assert2 = _interopRequireDefault(_assert);

function _interopRequireWildcard(obj) { if (obj && obj.__esModule) { return obj; } else { var newObj = {}; if (obj != null) { for (var key in obj) { if (Object.prototype.hasOwnProperty.call(obj, key)) newObj[key] = obj[key]; } } newObj.default = obj; return newObj; } }

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function _toConsumableArray(arr) { if (Array.isArray(arr)) { for (var i = 0, arr2 = Array(arr.length); i < arr.length; i++) { arr2[i] = arr[i]; } return arr2; } else { return Array.from(arr); } }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

var CompilationPdfPlan = function () {
  function CompilationPdfPlan(options) {
    _classCallCheck(this, CompilationPdfPlan);

    this.task = options.task;

    this.getEmails = this.getEmails.bind(this);
    this.getPages = this.getPages.bind(this);
    this.downloadEmails = this.downloadEmails.bind(this);
    this.addPageNumberToEmail = this.addPageNumberToEmail.bind(this);
    this.downloadPages = this.downloadPages.bind(this);
    this.compilePdfDocuments = this.compilePdfDocuments.bind(this);
    this.getCompilationPdfPages = this.getCompilationPdfPages.bind(this);
    this.savePdfResults = this.savePdfResults.bind(this);
    this.log = this.log.bind(this);
    this.start = this.start.bind(this);
  }

  _createClass(CompilationPdfPlan, [{
    key: 'getEmails',
    value: function getEmails() {
      var _this = this;

      return new Promise(function (resolve) {
        (0, _connection2.default)(function (db) {
          var collection = db.collection('emails');
          collection.find({ _compilation: _this.task.compilationId }).toArray(function (err, docs) {
            _assert2.default.equal(err, null);

            _this.emails = docs;
            resolve();
          });
        });
      });
    }
  }, {
    key: 'getPages',
    value: function getPages() {
      var _this2 = this;

      return new Promise(function (resolve) {
        (0, _connection2.default)(function (db) {
          var collection = db.collection('pages');
          collection.find({ _compilation: _this2.task.compilationId }).toArray(function (err, docs) {
            _assert2.default.equal(err, null);

            _this2.pages = docs;
            resolve(docs);
          });
        });
      });
    }
  }, {
    key: 'downloadEmails',
    value: function downloadEmails() {
      var _this3 = this;

      var count = 1;
      var emailCount = this.emails.length;
      var p = Promise.resolve();

      _lodash2.default.forEach(this.emails, function (email) {
        p = p.then(function () {
          return pdfHelper.downloadPdf(email.pdf, _this3.log).then(function (localPath) {
            _this3.log('status', 'Downloaded pdf file ' + email.pdf.filename + ' ' + count + '/' + emailCount);
            count++;
            email.pdf.localPath = localPath; // eslint-disable-line no-param-reassign
            return _this3.addPageNumberToEmail(email);
          });
        });
      });

      return p;
    }
  }, {
    key: 'addPageNumberToEmail',
    value: function addPageNumberToEmail(email) {
      var _this4 = this;

      return new Promise(function (resolve, reject) {
        var oldPath = email.pdf.localPath;
        var newPath = oldPath.replace(/\.pdf$/, '-paged.pdf');
        var startingPage = _this4.task.emailPageMap[email._id];
        var spawn = require('child_process').spawn;
        var pspdftool = spawn('pspdftool', ['number(x=-1pt,y=-1pt,start=' + startingPage + ',size=10)', oldPath, newPath]);

        pspdftool.on('close', function (code) {
          if (code === 0) {
            email.pdf.localPath = newPath; // eslint-disable-line no-param-reassign
            _this4.log('status', 'Added page numbers to ' + email.pdf.filename);
            resolve(email);
          } else {
            reject('pspdftool returned a bad exit code.');
          }
        });
      });
    }
  }, {
    key: 'downloadPages',
    value: function downloadPages() {
      var _this5 = this;

      var count = 1;
      var pageCount = this.pages.length;
      var p = Promise.resolve();

      _lodash2.default.forEach(this.pages, function (page) {
        p = p.then(function () {
          return pdfHelper.downloadPdf(page.pdf, _this5.log).then(function (localPath) {
            _this5.log('status', 'Downloaded pdf file ' + page.pdf.filename + ' ' + count + '/' + pageCount);
            count++;
            page.pdf.localPath = localPath; // eslint-disable-line no-param-reassign
            return Promise.resolve(page);
          });
        });
      });

      return p;
    }
  }, {
    key: 'compilePdfDocuments',
    value: function compilePdfDocuments() {
      var _this6 = this;

      return new Promise(function (resolve, reject) {
        var sortedEmails = _lodash2.default.sortBy(_this6.emails, function (email) {
          return _this6.task.emailPositionMap[email._id];
        });
        var sortedPages = _lodash2.default.sortBy(_this6.pages, function (page) {
          return _this6.task.pagePositionMap[page._id];
        });

        var pageFileArguments = _lodash2.default.map(sortedPages, function (page) {
          if (!page.pdf) {
            console.log('blah');console.log(page);
          }return page.pdf.localPath;
        });
        var emailFileArguments = _lodash2.default.map(sortedEmails, function (email) {
          if (!email.pdf) {
            console.log('blah');console.log(email);
          }return email.pdf.localPath;
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
          reject(chunk.toString('utf8'));
        });
      });
    }
  }, {
    key: 'getCompilationPdfPages',
    value: function getCompilationPdfPages(buffer) {
      var _this7 = this;

      return pdfHelper.getPdfPages(buffer, this.log).then(function (pageCount) {
        return Promise.resolve({
          model: 'compilation',
          _id: _this7.task.compilationId,
          pageCount: pageCount,
          buffer: buffer
        });
      });
    }
  }, {
    key: 'log',
    value: function log(type, message, payload) {
      this.task.addLog(type, message, payload);
    }
  }, {
    key: 'savePdfResults',
    value: function savePdfResults(pdfResults) {
      var _this8 = this;

      return new Promise(function (resolve) {
        _this8.log('status', 'Saving pdf results');

        (0, _connection2.default)(function (db) {
          var collection = db.collection('compilations');
          collection.update({ _id: _this8.task.compilationId }, { $set: { pdf: pdfResults } }, function (err, result) {
            _assert2.default.equal(err, null);
            _assert2.default.equal(result.result.n, 1);

            _this8.log('status', 'Finished saving pdf results');

            resolve();
          });
        });
      });
    }
  }, {
    key: 'start',
    value: function start() {
      var _this9 = this;

      this.log('status', 'Starting Task');

      return Promise.all([this.getEmails(), this.getPages()]).then(function () {
        _this9.log('status', 'Found compilation emails(' + _this9.emails.length + ') and pages(' + _this9.pages.length + ').');

        return Promise.all([_this9.downloadEmails(), _this9.downloadPages()]);
      }).then(function () {
        _this9.log('status', 'Downloaded email and page pdf files.');

        return _this9.compilePdfDocuments();
      }).then(this.getCompilationPdfPages).then(function (pdfObj) {
        _this9.log('status', 'Compiled the pdfs into one ' + pdfObj.pageCount + ' page file.');
        return pdfHelper.uploadPdfObject(pdfObj, _this9.log);
      }).then(this.savePdfResults);
    }
  }]);

  return CompilationPdfPlan;
}();

exports.default = CompilationPdfPlan;