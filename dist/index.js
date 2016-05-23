'use strict';

var _task = require('./task');

var _task2 = _interopRequireDefault(_task);

var _InfiniteLoop = require('./lib/InfiniteLoop');

var _InfiniteLoop2 = _interopRequireDefault(_InfiniteLoop);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

require('babel-register');
require('babel-polyfill');
require('dotenv').config({ silent: true });

var tasks = [];
var checkForNewTasks = new _InfiniteLoop2.default();
checkForNewTasks.setInterval(5000);
checkForNewTasks.add(function () {
  _task2.default.findQueuedTasks().then(function (foundTasks) {
    return Promise.all(tasks.map(function (task) {
      return task.start();
    }));
  });
});