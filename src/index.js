require('babel-register');
require('babel-polyfill');
require('dotenv').config({ silent: true });

import Task from './lib/task';
import queue from './queue';

queue.process('worker', 5, (job, done) => {
  const task = new Task(job);
  task.start()
  .then(() => {
    done();
  })
  .catch((err) => {
    done(err);
  });
});
