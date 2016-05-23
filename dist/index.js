'use strict';

var _task = require('./task');

var _task2 = _interopRequireDefault(_task);

var _queue = require('./queue');

var _queue2 = _interopRequireDefault(_queue);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

require('babel-register');
require('babel-polyfill');
require('dotenv').config({ silent: true });

_queue2.default.process('pdf', 5, function (job, done) {
  var task = new _task2.default(job);
  task.start().then(function () {
    done();
  }).catch(function (err) {
    done(err);
  });
});