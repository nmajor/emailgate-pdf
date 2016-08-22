require('babel-register');
require('babel-polyfill');
if (process.env.NODE_ENV !== 'production') { require('dotenv').config({ silent: true }); }

import Task from './lib/Task';
import queue from './queue';

const workers = process.env.WORKER_PROCESSES || 10;

queue.process('worker', workers, (job, done) => {
  const task = new Task(job);
  task.start()
  .then(() => {
    done();
  })
  .catch((err) => {
    done(err);
  });
});
