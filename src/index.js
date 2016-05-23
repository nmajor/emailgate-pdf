require('babel-register');
require('babel-polyfill');
require('dotenv').config({ silent: true });

import Task from './task';

Task.findNextTasks()
.then((tasks) => {
  return Promise.all(tasks.map((task) => { return task.start(); }));
});
