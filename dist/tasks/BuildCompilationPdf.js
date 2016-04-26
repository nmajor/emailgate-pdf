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

var BuildCompilationPdf = function () {
  function BuildCompilationPdf(options) {
    _classCallCheck(this, BuildCompilationPdf);

    this.db = options.db;
    this.props = options.props;
    this.config = options.config;

    this.emailQuery = this.emailQuery.bind(this);
    this.buildEmailPdf = this.buildEmailPdf.bind(this);
    this.getEmails = this.getEmails.bind(this);
    this.buildPdfForEmails = this.buildPdfForEmails.bind(this);
  }

  _createClass(BuildCompilationPdf, [{
    key: 'emailQuery',
    value: function emailQuery() {
      return {
        _id: { $in: this.props.emailIds }
      };
    }
  }, {
    key: 'buildEmailPdf',
    value: function buildEmailPdf(email) {
      var html = email.template.replace('[[BODY]]', email.body);
      return pdfHelper.buildPdf(html, 'email', email, this.config.emailOptions);
    }
  }, {
    key: 'getEmails',
    value: function getEmails() {
      var _this = this;

      return new Promise(function (resolve) {
        var collection = _this.db.collection('emails');
        collection.find(_this.emailQuery()).toArray(function (err, docs) {
          if (err) {
            (0, _logHelper.log)('error', 'An error happened while getting emails.', err.message);return;
          }

          resolve(docs);
        });
      });
    }
  }, {
    key: 'buildPdfForEmails',
    value: function buildPdfForEmails(emails) {
      var _this2 = this;

      var count = 1;
      var emailLength = emails.length;
      (0, _logHelper.log)('status', 'Found ' + emailLength + ' compilation emails.');

      var p = Promise.resolve();

      _lodash2.default.forEach(emails, function (email) {
        p = p.then(function () {
          return _this2.buildEmailPdf(email).then(function (pdfObj) {
            return pdfHelper.uploadPdfObject(pdfObj, _this2.config.mantaClient);
          }).then(function (result) {
            (0, _logHelper.log)('email-pdf', 'Added email pdf ' + result._id + ' ' + count + '/' + emailLength, result);
            count++;
          });
        });
      });

      return p;
    }
  }, {
    key: 'run',
    value: function run() {
      return this.getEmails().then(this.buildPdfForEmails);
    }
  }]);

  return BuildCompilationPdf;
}();

exports.default = BuildEmailPdfsTask;