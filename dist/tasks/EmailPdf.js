'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

var _task = require('../task');

var _config = require('../config');

var _config2 = _interopRequireDefault(_config);

var _connection = require('../connection');

var _connection2 = _interopRequireDefault(_connection);

var _pdfHelper = require('../lib/pdfHelper');

var pdfHelper = _interopRequireWildcard(_pdfHelper);

function _interopRequireWildcard(obj) { if (obj && obj.__esModule) { return obj; } else { var newObj = {}; if (obj != null) { for (var key in obj) { if (Object.prototype.hasOwnProperty.call(obj, key)) newObj[key] = obj[key]; } } newObj.default = obj; return newObj; } }

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

var BuildEmailPdfsTask = function () {
  function BuildEmailPdfsTask(options) {
    _classCallCheck(this, BuildEmailPdfsTask);

    this.task = options.task;
    this.props = options.task.props;

    this.getEmail = this.getEmail.bind(this);
    this.buildPdfForEmail = this.buildPdfForEmail.bind(this);
    this.savePdfResults = this.savePdfResults.bind(this);
  }

  _createClass(BuildEmailPdfsTask, [{
    key: 'getEmail',
    value: function getEmail() {
      var _this = this;

      return new Promise(function (resolve) {
        (0, _connection2.default)(function (db) {
          var collection = db.collection('emails');
          collection.findOne({ _id: _this.props.emailId }, function (err, doc) {
            if (err) {
              log(_this.task, 'error', 'An error happened while finding email in DB.', err.message);return;
            }
            if (!doc) {
              log(_this.task, 'error', 'Could not find email with id: ' + _this.props.emailId + '.', err.message);return;
            }

            _this.email = doc;

            resolve(_this.email);
          });
        });
      });
    }
  }, {
    key: 'buildEmailPdf',
    value: function buildEmailPdf() {
      var email = this.email;
      var html = email.template.replace('[[BODY]]', email.body);
      return pdfHelper.buildPdf(html, 'email', email, _config2.default.emailOptions, log);
    }
  }, {
    key: 'savePdfResults',
    value: function savePdfResults(pdfResults) {
      var _this2 = this;

      return new Promise(function (resolve) {
        (0, _connection2.default)(function (db) {
          var collection = db.collection('emails');
          collection.update({ _id: _this2.props.emailId }, { $set: { pdf: pdfResults } }, function (err, result) {
            if (err) {
              log(_this2.task, 'error', 'Error happened when updating pdf for email', err);
              resolve();
              return;
            }

            if (result.result.n !== 1) {
              log(_this2.task, 'error', 'Error happened when updating pdf for email.', result);
              resolve();
              return;
            }

            resolve();
          });
        });
      });
    }
  }, {
    key: 'log',
    value: function (_log) {
      function log(_x, _x2, _x3) {
        return _log.apply(this, arguments);
      }

      log.toString = function () {
        return _log.toString();
      };

      return log;
    }(function (type, message, payload) {
      log(this.task, type, message, payload);
    })
  }, {
    key: 'run',
    value: function run() {
      log(this.task, 'status', 'Starting Task');

      return this.getEmail().then(this.buildPdfForEmail).then(function (pdfObj) {
        return pdfHelper.uploadPdfObject(pdfObj, log);
      }).then(this.savePdfResults);
    }
  }]);

  return BuildEmailPdfsTask;
}();

exports.default = BuildEmailPdfsTask;