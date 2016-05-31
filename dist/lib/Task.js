'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }(); // import _ from 'lodash';


exports.planFactory = planFactory;

var _EmailPdfPlan = require('../plans/EmailPdfPlan');

var _EmailPdfPlan2 = _interopRequireDefault(_EmailPdfPlan);

var _PagePdfPlan = require('../plans/PagePdfPlan');

var _PagePdfPlan2 = _interopRequireDefault(_PagePdfPlan);

var _CompilationPdfPlan = require('../plans/CompilationPdfPlan');

var _CompilationPdfPlan2 = _interopRequireDefault(_CompilationPdfPlan);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function planFactory(task) {
  switch (task.job.data.kind) {
    case 'email-pdf':
      return new _EmailPdfPlan2.default({ emailId: task.job.data.referenceId, progress: task.progress, data: task.job.data });
    case 'page-pdf':
      return new _PagePdfPlan2.default({ pageId: task.job.data.referenceId, progress: task.progress, data: task.job.data });
    case 'compilation-pdf':
      return new _CompilationPdfPlan2.default({ compilationId: task.job.data.referenceId, progress: task.progress, data: task.job.data });
    default:
      return null;
  }
}

var Task = function () {
  function Task(job) {
    _classCallCheck(this, Task);

    this.job = job;
    this.progress = this.progress.bind(this);
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
      return planFactory(this).start();
    }
  }]);

  return Task;
}();

exports.default = Task;