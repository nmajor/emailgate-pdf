require('babel-register');
require('babel-polyfill');
require('dotenv').config({ silent: true });

import _ from 'lodash';
import Task from './task';

const runningTaskIds = [];

// ******* Not built for multiple workers! Need to refactor if multiple workers are needed later.

Task.getMoreTasks()
.then((tasks) => {
  _.forEach(tasks, (task) => {
    runningTaskIds.push(task._id);

    task.start().then((finishedTask) => {
      _.remove(runningTaskIds, finishedTask._id);
    });
  });
});


const tasks = [];
const checkForNewTasks = new InfiniteLoop;
checkForNewTasks.setInterval(5000);
checkForNewTasks.add(() => {
  Task.findQueuedTasks()
  .then((foundTasks) => {
    return Promise.all(tasks.map((task) => { return task.start(); }));
  });
});

function runningTasks() {
  return _.countBy(tasks, (task) => { return task.running })
}

const startTasks = new InfiniteLoop;
startTasks.setInterval(5000);
startTasks.add(() => {
  let runningTasks =
  while (tasks > )
  const runningTasks = tasks.map((task) => {
    return task.running();
  });

  if (runningTasks.length < 5) {

  }
});
