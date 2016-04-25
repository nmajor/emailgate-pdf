'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

var _lodash = require('lodash');

var _lodash2 = _interopRequireDefault(_lodash);

var _logHelper = require('../lib/logHelper');

var _pdfHelper = require('../lib/pdfHelper');

var _pdfHelper2 = _interopRequireDefault(_pdfHelper);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

var BuildEmailPdfs = function () {
  function BuildEmailPdfs(options) {
    _classCallCheck(this, BuildEmailPdfs);

    this.db = options.db;
    this.props = options.props;
    this.config = options.config;
  }

  _createClass(BuildEmailPdfs, [{
    key: 'emailQuery',
    value: function emailQuery() {
      return { _id: this.props.emailIds };
    }
  }, {
    key: 'buildEmailPdf',
    value: function buildEmailPdf(email) {
      var html = email.template.replace('[[BODY]]', email.body);
      return _pdfHelper2.default.buildPdf(html, 'email', email);
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
            return _pdfHelper2.default.uploadPdfObject(pdfObj);
          }).then(function (result) {
            (0, _logHelper.log)('email-pdf', 'Added email ' + result._id + ' ' + count + '/' + emailLength, result);
            count++;
          });
        });
      });

      return p;
    }
  }, {
    key: 'run',
    value: function run() {
      console.log('blah running BuildEmailPdfsTask');
      console.log(this.db);
      console.log(this.props);
      console.log(this.config);

      return this.getEmails().then(this.buildPdfForEmails);
    }
  }]);

  return BuildEmailPdfs;
}();

exports.default = BuildEmailPdfs;