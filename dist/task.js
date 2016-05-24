'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

exports.planFactory = planFactory;

var _lodash = require('lodash');

var _lodash2 = _interopRequireDefault(_lodash);

var _EmailPdfPlan = require('./plans/EmailPdfPlan');

var _EmailPdfPlan2 = _interopRequireDefault(_EmailPdfPlan);

var _PagePdfPlan = require('./plans/PagePdfPlan');

var _PagePdfPlan2 = _interopRequireDefault(_PagePdfPlan);

var _CompilationPdfPlan = require('./plans/CompilationPdfPlan');

var _CompilationPdfPlan2 = _interopRequireDefault(_CompilationPdfPlan);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

// import assert from 'assert';

function planFactory(task) {
  switch (task.kind) {
    case 'email-pdf':
      return _EmailPdfPlan2.default;
    case 'page-pdf':
      return _PagePdfPlan2.default;
    case 'compilation-pdf':
      return _CompilationPdfPlan2.default;
    default:
      return null;
  }
}

var Task = function () {
  function Task(job) {
    var _this = this;

    _classCallCheck(this, Task);

    _lodash2.default.forEach(job.data, function (value, key) {
      _this[key] = value;
    });
    this.job = job;

    this.Plan = planFactory(this);
  }

  _createClass(Task, [{
    key: 'log',
    value: function log(entry) {
      this.job.log(entry);
    }
  }, {
    key: 'progress',
    value: function progress(completed, total, data) {
      this.job.progress(completed, total, data);
    }
  }, {
    key: 'start',
    value: function start() {
      return new this.Plan({ task: this }).start();
    }
  }]);

  return Task;
}();

exports.default = Task;