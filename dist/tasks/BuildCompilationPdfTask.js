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

function _toConsumableArray(arr) { if (Array.isArray(arr)) { for (var i = 0, arr2 = Array(arr.length); i < arr.length; i++) { arr2[i] = arr[i]; } return arr2; } else { return Array.from(arr); } }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

var BuildCompilationPdfTask = function () {
  function BuildCompilationPdfTask(options) {
    _classCallCheck(this, BuildCompilationPdfTask);

    this.db = options.db;
    this.props = options.props;
    this.config = options.config;
    this.state = {
      emails: [],
      pages: []
    };

    this.getEmails = this.getEmails.bind(this);
    this.getPages = this.getPages.bind(this);
    this.downloadEmails = this.downloadEmails.bind(this);
    this.addPageNumberToEmail = this.addPageNumberToEmail.bind(this);
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

          _this.state.emails = docs;
          resolve();
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

          _this2.state.pages = docs;
          resolve(docs);
        });
      });
    }
  }, {
    key: 'downloadEmails',
    value: function downloadEmails() {
      var _this3 = this;

      var count = 1;
      var emailCount = this.state.emails.length;
      var p = Promise.resolve();

      _lodash2.default.forEach(this.state.emails, function (email) {
        p = p.then(function () {
          return pdfHelper.downloadPdf(email.pdf).then(function (localPath) {
            (0, _logHelper.log)('status', 'Downloaded pdf file ' + email.pdf.filename + ' ' + count + '/' + emailCount);
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
        var startingPage = _this4.props.emailPageMap[email._id];
        var spawn = require('child_process').spawn;
        var pspdftool = spawn('pspdftool', ['number(x=-1pt,y=-1pt,start=' + startingPage + ',size=10)', oldPath, newPath]);

        pspdftool.on('close', function (code) {
          if (code === 0) {
            email.pdf.localPath = newPath; // eslint-disable-line no-param-reassign
            (0, _logHelper.log)('status', 'Added page numbers to ' + email.pdf.filename);
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
      var count = 1;
      var pageCount = this.state.pages.length;
      var p = Promise.resolve();

      _lodash2.default.forEach(this.state.pages, function (page) {
        p = p.then(function () {
          return pdfHelper.downloadPdf(page.pdf).then(function (localPath) {
            (0, _logHelper.log)('status', 'Downloaded pdf file ' + page.pdf.filename + ' ' + count + '/' + pageCount);
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
      var _this5 = this;

      return new Promise(function (resolve, reject) {
        var sortedEmails = _lodash2.default.sortBy(_this5.state.emails, function (email) {
          return _this5.props.emailPositionMap[email._id];
        });
        var sortedPages = _lodash2.default.sortBy(_this5.state.pages, function (page) {
          return _this5.props.pagePositionMap[page._id];
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
          (0, _logHelper.log)('error', 'An error happened with the pdftk command.', chunk.toString('utf8'));
          reject('An error happened with the pdftk command.');
        });
      });
    }
  }, {
    key: 'getCompilationPdfPages',
    value: function getCompilationPdfPages(buffer) {
      var _this6 = this;

      return pdfHelper.getPdfPages(buffer).then(function (pageCount) {
        return Promise.resolve({
          model: 'compilation',
          _id: _this6.props.compilationId,
          pageCount: pageCount,
          buffer: buffer
        });
      });
    }
  }, {
    key: 'run',
    value: function run() {
      var _this7 = this;

      return Promise.all([this.getEmails(), this.getPages()]).then(function () {
        (0, _logHelper.log)('status', 'Found compilation emails(' + _this7.state.emails.length + ') and pages(' + _this7.state.pages.length + ').');

        return Promise.all([_this7.downloadEmails(), _this7.downloadPages()]);
      }).then(function () {
        (0, _logHelper.log)('status', 'Downloaded email and page pdf files.');

        return _this7.compilePdfDocuments();
      }).then(this.getCompilationPdfPages).then(function (pdfObj) {
        (0, _logHelper.log)('status', 'Compiled the pdfs into one ' + pdfObj.pageCount + ' page file.');
        return pdfHelper.uploadPdfObject(pdfObj, _this7.config.mantaClient);
      }).then(function (result) {
        (0, _logHelper.log)('compilation-pdf', 'Added compilation pdf ' + result._id, result);
        return Promise.resolve();
      });
    }
  }]);

  return BuildCompilationPdfTask;
}();

exports.default = BuildCompilationPdfTask;