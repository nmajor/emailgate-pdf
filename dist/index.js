'use strict';

var _task = require('./task');

var _task2 = _interopRequireDefault(_task);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

require('babel-register');
require('babel-polyfill');
require('dotenv').config({ silent: true });

_task2.default.findNextTasks().then(function (tasks) {
  return Promise.all(tasks.map(function (task) {
    return task.start();
  }));
});