'use strict';

var _Task = require('./lib/Task');

var _Task2 = _interopRequireDefault(_Task);

var _queue = require('./queue');

var _queue2 = _interopRequireDefault(_queue);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

require('babel-register');
require('babel-polyfill');
if (process.env.NODE_ENV !== 'production') {
  require('dotenv').config({ silent: true });
}

_queue2.default.process('worker', 5, function (job, done) {
  var task = new _Task2.default(job);
  task.start().then(function () {
    done();
  }).catch(function (err) {
    done(err);
  });
});