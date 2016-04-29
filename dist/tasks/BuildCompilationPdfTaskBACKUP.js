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

var _fs = require('fs');

var _fs2 = _interopRequireDefault(_fs);

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
    this.compilePagePdfs = this.downloadPages.bind(this);
    this.compileEmailPdfs = this.downloadPages.bind(this);
    this.getCompilationPdfPageCount = this.getCompilationPdfPageCount.bind(this);
    this.addPageNumbersToEmailsPdf = this.addPageNumbersToEmailsPdf.bind(this);
    this.getPdfBufferFromFile = this.getPdfBufferFromFile.bind(this);
    this.combinePdfFiles = this.combinePdfFiles.bind(this);
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
    key: 'compilePagePdfs',
    value: function compilePagePdfs(pages) {
      var _this3 = this;

      return new Promise(function (resolve, reject) {
        var filePath = '/tmp/compilation-' + _this3.props.compilationId + '-pages.pdf';
        var writeStream = _fs2.default.createWriteStream(filePath);
        var sortedPages = _lodash2.default.sortBy(pages, function (page) {
          return _this3.props.pagePositionMap[page._id];
        });
        var pageFileArguments = _lodash2.default.map(sortedPages, function (page) {
          return page.pdf.localPath;
        });

        var spawn = require('child_process').spawn;
        var pdftk = spawn('pdftk', [].concat(_toConsumableArray(pageFileArguments), ['cat', 'output', '-']));

        pdftk.stdout.pipe(writeStream);

        pdftk.stdout.on('end', function () {
          resolve(filePath);
        });

        pdftk.stderr.on('data', function (chunk) {
          (0, _logHelper.log)('error', 'An error happened with the pdftk command.', chunk.toString('utf8'));
          reject('An error happened with the pdftk command.');
        });
      });
    }
  }, {
    key: 'compileEmailPdfs',
    value: function compileEmailPdfs(emails) {
      var _this4 = this;

      return new Promise(function (resolve, reject) {
        var filePath = '/tmp/compilation-' + _this4.props.compilationId + '-emails.pdf';
        var writeStream = _fs2.default.createWriteStream(filePath);
        var sortedEmails = _lodash2.default.sortBy(emails, function (email) {
          return _this4.props.emailPositionMap[email._id];
        });
        var emailFileArguments = _lodash2.default.map(sortedEmails, function (email) {
          return email.pdf.localPath;
        });

        var spawn = require('child_process').spawn;
        var pdftk = spawn('pdftk', [].concat(_toConsumableArray(emailFileArguments), ['cat', 'output', '-']));

        pdftk.stdout.pipe(writeStream);

        pdftk.stdout.on('end', function () {
          resolve(filePath);
        });

        pdftk.stderr.on('data', function (chunk) {
          (0, _logHelper.log)('error', 'An error happened with the pdftk command.', chunk.toString('utf8'));
          reject('An error happened with the pdftk command.');
        });
      });
    }
  }, {
    key: 'getCompilationPdfPageCount',
    value: function getCompilationPdfPageCount(buffer) {
      var _this5 = this;

      return pdfHelper.getPdfPages(buffer).then(function (pageCount) {
        return Promise.resolve({
          model: 'compilation',
          _id: _this5.props.compilationId,
          pageCount: pageCount,
          buffer: buffer
        });
      });
    }
  }, {
    key: 'addPageNumbersToEmailsPdf',
    value: function addPageNumbersToEmailsPdf(pdfPath) {
      return new Promise(function (resolve, reject) {
        var newFilePath = 'paged-' + pdfPath;
        var spawn = require('child_process').spawn;
        var pspdftool = spawn('pspdftool', ['number(x=-1pt,y=-1pt,start=9,size=10)', pdfPath, newFilePath]);

        pspdftool.on('close', function (code) {
          if (code === 0) {
            resolve(newFilePath);
          } else {
            reject('pspdftool returned a bad exit code.');
          }
        });
      });
    }
  }, {
    key: 'getPdfBufferFromFile',
    value: function getPdfBufferFromFile(pdfPath) {
      return new Promise(function (resolve, reject) {
        _fs2.default.readFile(pdfPath, function (err, data) {
          if (err) {
            (0, _logHelper.log)('error', 'An error happened while converting the pdf file to buffer.', err.message);reject();return;
          }

          resolve(data);
        });
      });
    }
  }, {
    key: 'combinePdfFiles',
    value: function combinePdfFiles(filePath1, filePath2) {
      return new Promise(function (resolve, reject) {
        var spawn = require('child_process').spawn;
        var pdftk = spawn('pdftk', [filePath1, filePath2, 'cat', 'output', '-']);

        var pdfBuffers = [];
        pdftk.stdout.on('data', function (chunk) {
          pdfBuffers.push(chunk);
        });
        pdftk.stdout.on('end', function () {
          resolve(Buffer.concat(pdfBuffers));
        });

        var writeStream = _fs2.default.createWriteStream('/var/host/tmp/demo.pdf');
        pdftk.stdout.pipe(writeStream);

        pdftk.stderr.on('data', function (chunk) {
          (0, _logHelper.log)('error', 'An error happened with the pdftk command combining files.', chunk.toString('utf8'));
          reject('An error happened with the pdftk command.');
        });
      });
    }
  }, {
    key: 'run',
    value: function run() {
      var _this6 = this;

      return Promise.all([this.getEmails(), this.getPages()]).then(function (results) {
        var _results = _slicedToArray(results, 2);

        var emails = _results[0];
        var pages = _results[1];

        (0, _logHelper.log)('status', 'Found compilation emails(' + emails.length + ') and pages(' + pages.length + ').');

        return Promise.all([_this6.downloadEmails(emails), _this6.downloadPages(pages)]);
      }).then(function (results) {
        var _results2 = _slicedToArray(results, 2);

        var emails = _results2[0];
        var pages = _results2[1];

        (0, _logHelper.log)('status', 'Downloaded email and page pdf files.');

        return Promise.all([_this6.compileEmailPdfs(emails), _this6.compilePagePdfs(pages)]);
      }).then(function (results) {
        var _results3 = _slicedToArray(results, 2);

        var emailsPdfPath = _results3[0];
        var pagesPdfPath = _results3[1];

        (0, _logHelper.log)('status', 'Compiled email pdfs and pages pdfs.');
        console.log('blah 1');
        console.log(emailsPdfPath);
        console.log('blah 2');
        console.log(pagesPdfPath);

        return Promise.all([_this6.addPageNumbersToEmailsPdf(emailsPdfPath), Promise.resolve(pagesPdfPath)]);
      }).then(function (results) {
        var _results4 = _slicedToArray(results, 2);

        var emailsPdfPath = _results4[0];
        var pagesPdfPath = _results4[1];


        return _this6.combinePdfFiles(emailsPdfPath, pagesPdfPath);
      }).catch(function (err) {
        console.log(err.message);
      });
      // .then(this.getCompilationPdfPages)
      // .then((pdfObj) => {
      //   log('status', `Compiled the pdfs into one ${pdfObj.pageCount} page file.`);
      //   return pdfHelper.uploadPdfObject(pdfObj, this.config.mantaClient);
      // })
      // .then((result) => {
      //   log('compilation-pdf', `Added compilation pdf ${result._id}`, result);
      //   return Promise.resolve();
      // });
    }
  }]);

  return BuildCompilationPdfTask;
}();

exports.default = BuildCompilationPdfTask;