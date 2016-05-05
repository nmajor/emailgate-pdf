// require('babel-register')({ presets: ['es2015'] });
require('babel-register');
require('babel-polyfill');
require('dotenv').config({ silent: true });

import manta from 'manta';
import * as dbHelper from './lib/dbHelper';
import { log } from './lib/logHelper';

import BuildEmailPdfsTask from './tasks/BuildEmailPdfsTask';
import BuildPagePdfsTask from './tasks/BuildPagePdfsTask';
import BuildCompilationPdfTask from './tasks/BuildCompilationPdfTask';

// Define variables
// ****************
const config = {
  mongoUrl: process.env.MONGO_URL,
  emailOptions: {
    height: '10.5in',
    width: '8in',
    border: {
      top: '0.6in',
      right: '0.6in',
      bottom: '1.2in',
      left: '0.6in',
    },
    timeout: 120000,
  },
  pageOptions: {
    height: '10.5in',
    width: '8in',
    timeout: 120000,
  },
  mantaClient: manta.createClient({
    sign: manta.privateKeySigner({
      key: process.env.MANTA_APP_KEY.replace(/\\n/g, '\n'),
      keyId: process.env.MANTA_APP_KEY_ID,
      user: process.env.MANTA_APP_USER,
    }),
    user: process.env.MANTA_APP_USER,
    url: process.env.MANTA_APP_URL,
    connectTimeout: 25000,
  }),
};

function parseTask(task) {
  const taskString = new Buffer(task, 'base64').toString('utf8');
  return JSON.parse(taskString);
}

function taskFactory(task, db) {
  log('status', `Received task ${task.name}.`);

  switch (task.name) {
    case 'build-email-pdfs' :
      return new BuildEmailPdfsTask({ db, props: task.props, config });
    case 'build-page-pdfs' :
      return new BuildPagePdfsTask({ db, props: task.props, config });
    case 'build-compilation-pdf' :
      return new BuildCompilationPdfTask({ db, props: task.props, config });
    default:
      log('status', `Could not find task named ${task.name}.`);
      return { run: () => {} };
  }
}

// Kick off everything
// *******************

log('status', 'Container started and running.');

if (!process.env.TASK) {
  log('status', 'Worker TASK missing.');
  process.exit();
}

const task = parseTask(process.env.TASK);

dbHelper.connectToDatabase(config.mongoUrl)
.then((db) => {
  return taskFactory(task, db).run()
  .then(() => {
    return dbHelper.logAndCloseDb(db);
  })
  .catch((err) => {
    return dbHelper.catchErrAndCloseDb(err, db);
  });
});
