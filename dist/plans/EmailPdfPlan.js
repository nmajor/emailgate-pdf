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

var EmailPdfPlan = function () {
  function EmailPdfPlan(options) {
    _classCallCheck(this, EmailPdfPlan);

    this.task = options.task;
    this.props = options.task.props;

    this.getEmail = this.getEmail.bind(this);
    this.buildPdf = this.buildPdf.bind(this);
    this.uploadPdf = this.uploadPdf.bind(this);
    this.savePdfResults = this.savePdfResults.bind(this);
    this.log = this.log.bind(this);
    this.start = this.start.bind(this);
  }

  _createClass(EmailPdfPlan, [{
    key: 'getEmail',
    value: function getEmail() {
      var _this = this;

      return new Promise(function (resolve) {
        _this.log('status', 'Finding Email.');

        (0, _connection2.default)(function (db) {
          var collection = db.collection('emails');
          collection.findOne({ _id: _this.props.emailId }, function (err, doc) {
            if (err) {
              _this.log('error', 'An error happened while finding email in DB.', err.message);return;
            }
            if (!doc) {
              _this.log('error', 'Could not find email with id: ' + _this.props.emailId + '.', err.message);return;
            }

            _this.log('status', 'Found Email');
            _this.email = doc;

            resolve(_this.email);
          });
        });
      });
    }
  }, {
    key: 'buildPdf',
    value: function buildPdf() {
      var email = this.email;
      var html = email.template.replace('[[BODY]]', email.body);
      return pdfHelper.buildPdf(html, 'email', email, _config2.default.emailOptions, this.log);
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
          var collection = db.collection('emails');
          collection.update({ _id: _this2.props.emailId }, { $set: { pdf: pdfResults } }, function (err, result) {
            if (err) {
              _this2.log('error', 'Error happened when updating pdf for email', err);
              resolve();
              return;
            }

            if (result.result.n !== 1) {
              _this2.log('error', 'Error happened when updating pdf for email.', result);
              resolve();
              return;
            }

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

      return this.getEmail().then(function () {
        return _this3.buildPdf();
      }).then(function (pdfObj) {
        return _this3.uploadPdf(pdfObj);
      }).then(this.savePdfResults).catch(function (err) {
        _this3.log('error', 'Error happened in EmailPdfPlan.', err);
      });
    }
  }]);

  return EmailPdfPlan;
}();

exports.default = EmailPdfPlan;