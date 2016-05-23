require('babel-register');
require('babel-polyfill');
require('dotenv').config({ silent: true });

import Task from './task';
import queue from './queue';

queue.process('pdf', 5, (job, done) => {
  const task = new Task(job);
  task.start()
  .then(() => {
    done();
  })
  .catch((err) => {
    done(err);
  });
});
