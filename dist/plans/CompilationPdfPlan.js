'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

var _lodash = require('lodash');

var _lodash2 = _interopRequireDefault(_lodash);

var _pdfHelper = require('../lib/pdfHelper');

var pdfHelper = _interopRequireWildcard(_pdfHelper);

var _fileHelper = require('../lib/fileHelper');

var fileHelper = _interopRequireWildcard(_fileHelper);

var _connection = require('../connection');

var _connection2 = _interopRequireDefault(_connection);

function _interopRequireWildcard(obj) { if (obj && obj.__esModule) { return obj; } else { var newObj = {}; if (obj != null) { for (var key in obj) { if (Object.prototype.hasOwnProperty.call(obj, key)) newObj[key] = obj[key]; } } newObj.default = obj; return newObj; } }

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function _toConsumableArray(arr) { if (Array.isArray(arr)) { for (var i = 0, arr2 = Array(arr.length); i < arr.length; i++) { arr2[i] = arr[i]; } return arr2; } else { return Array.from(arr); } }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

var CompilationPdfPlan = function () {
  function CompilationPdfPlan(options) {
    _classCallCheck(this, CompilationPdfPlan);

    this.compilationId = options.compilationId;
    this.progress = options.progress || function () {}; // eslint-disable-line func-names
    this.data = options.data || {};

    this.cleanupFiles = [];
    // stepsTotal should be the number of times this.step() is called within this.start()
    this.stepsTotal = 10;
    this.stepsCompleted = 0;

    this.getEmails = this.getEmails.bind(this);
    this.addEmailsProgressStepsToTotal = this.addEmailsProgressStepsToTotal.bind(this);
    this.getPages = this.getPages.bind(this);
    this.addPagesProgressStepsToTotal = this.addPagesProgressStepsToTotal.bind(this);
    this.downloadEmails = this.downloadEmails.bind(this);
    this.addPageNumberToEmail = this.addPageNumberToEmail.bind(this);
    this.downloadPages = this.downloadPages.bind(this);
    this.compilePdfDocuments = this.compilePdfDocuments.bind(this);
    this.getCompilationPdfPages = this.getCompilationPdfPages.bind(this);
    this.savePdfResults = this.savePdfResults.bind(this);
    this.step = this.step.bind(this);
    this.cleanup = this.cleanup.bind(this);
    this.start = this.start.bind(this);
  }

  _createClass(CompilationPdfPlan, [{
    key: 'getEmails',
    value: function getEmails() {
      var _this = this;

      return new Promise(function (resolve, reject) {
        (0, _connection2.default)(function (db) {
          var collection = db.collection('emails');
          collection.find({ _compilation: _this.compilationId }).toArray(function (err, docs) {
            // eslint-disable-line consistent-return
            if (err) {
              return reject(err);
            }

            _this.emails = docs;
            _this.addEmailsProgressStepsToTotal();
            resolve();
          });
        });
      });
    }
  }, {
    key: 'addEmailsProgressStepsToTotal',
    value: function addEmailsProgressStepsToTotal() {
      var emailsCount = this.emails.length;

      // Add steps to download pdf of each email
      this.stepsTotal += emailsCount;

      // Add steps to add page numbers to each email
      this.stepsTotal += emailsCount;
    }
  }, {
    key: 'getPages',
    value: function getPages() {
      var _this2 = this;

      return new Promise(function (resolve, reject) {
        (0, _connection2.default)(function (db) {
          var collection = db.collection('pages');
          collection.find({ _compilation: _this2.compilationId }).toArray(function (err, docs) {
            // eslint-disable-line consistent-return
            if (err) {
              return reject(err);
            }

            _this2.pages = docs;
            _this2.addPagesProgressStepsToTotal();
            resolve(docs);
          });
        });
      });
    }
  }, {
    key: 'addPagesProgressStepsToTotal',
    value: function addPagesProgressStepsToTotal() {
      var pagesCount = this.pages.length;

      // Add steps to download pdf of each email
      this.stepsTotal += pagesCount;
    }
  }, {
    key: 'downloadEmails',
    value: function downloadEmails() {
      var _this3 = this;

      var p = Promise.resolve();

      _lodash2.default.forEach(this.emails, function (email) {
        p = p.then(function () {
          return _this3.step(pdfHelper.downloadPdf(email.pdf).then(function (localPath) {
            _this3.cleanupFiles.push(localPath);
            email.pdf.localPath = localPath; // eslint-disable-line no-param-reassign
            return _this3.addPageNumberToEmail(email);
          }));
        });
      });

      return p;
    }
  }, {
    key: 'addPageNumberToEmail',
    value: function addPageNumberToEmail(email) {
      var _this4 = this;

      return this.step(new Promise(function (resolve, reject) {
        var oldPath = email.pdf.localPath;
        var newPath = oldPath.replace(/\.pdf$/, '-paged.pdf');
        var startingPage = _this4.data.emailPageMap[email._id];
        var spawn = require('child_process').spawn;
        var pspdftool = spawn('pspdftool', ['number(x=-1pt,y=-1pt,start=' + startingPage + ',size=10)', oldPath, newPath]);

        pspdftool.on('close', function (code) {
          if (code === 0) {
            _this4.cleanupFiles.push(newPath);
            email.pdf.localPath = newPath; // eslint-disable-line no-param-reassign
            resolve(email);
          } else {
            reject('pspdftool returned a bad exit code.');
          }
        });
      }));
    }
  }, {
    key: 'downloadPages',
    value: function downloadPages() {
      var _this5 = this;

      var p = Promise.resolve();

      _lodash2.default.forEach(this.pages, function (page) {
        p = p.then(function () {
          return _this5.step(pdfHelper.downloadPdf(page.pdf).then(function (localPath) {
            _this5.cleanupFiles.push(localPath);
            page.pdf.localPath = localPath; // eslint-disable-line no-param-reassign
            return Promise.resolve(page);
          }));
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
          return _this6.data.emailPositionMap[email._id];
        });
        var sortedPages = _lodash2.default.sortBy(_this6.pages, function (page) {
          return _this6.data.pagePositionMap[page._id];
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
          reject(chunk.toString('utf8'));
        });
      });
    }
  }, {
    key: 'getCompilationPdfPages',
    value: function getCompilationPdfPages(buffer) {
      var _this7 = this;

      return pdfHelper.getPdfPages(buffer).then(function (pageCount) {
        return Promise.resolve({
          model: 'compilation',
          _id: _this7.compilationId,
          pageCount: pageCount,
          buffer: buffer
        });
      });
    }
  }, {
    key: 'savePdfResults',
    value: function savePdfResults(pdfResults) {
      var _this8 = this;

      return new Promise(function (resolve, reject) {
        (0, _connection2.default)(function (db) {
          var collection = db.collection('compilations');
          collection.update({ _id: _this8.compilationId }, { $set: { pdf: pdfResults } }, function (err, result) {
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
      var _this9 = this;

      return stepPromise.then(function (result) {
        _this9.stepsCompleted += 1;
        _this9.progress(_this9.stepsCompleted, _this9.stepsTotal, data);

        return Promise.resolve(result);
      });
    }
  }, {
    key: 'cleanup',
    value: function cleanup() {
      return fileHelper.deleteFiles(this.cleanupFiles);
    }
  }, {
    key: 'start',
    value: function start() {
      var _this10 = this;

      return Promise.all([this.step(this.getEmails()), this.step(this.getPages())]).then(function () {
        return Promise.all([_this10.step(_this10.downloadEmails()), _this10.step(_this10.downloadPages())]);
      }).then(function () {
        return _this10.step(_this10.compilePdfDocuments());
      }).then(function (buffer) {
        return _this10.step(_this10.getCompilationPdfPages(buffer));
      }).then(function (pdfObj) {
        return _this10.step(pdfHelper.savePdfObject(pdfObj)).then(function (localPath) {
          pdfObj.localPath = localPath; // eslint-disable-line no-param-reassign
          return Promise.resolve(pdfObj);
        });
      }).then(function (pdfObj) {
        return _this10.step(pdfHelper.uploadPdfObject(pdfObj));
      }).then(function (results) {
        return _this10.step(_this10.savePdfResults(results));
      }).then(function () {
        return _this10.step(_this10.cleanup());
      });
    }
  }]);

  return CompilationPdfPlan;
}();

exports.default = CompilationPdfPlan;