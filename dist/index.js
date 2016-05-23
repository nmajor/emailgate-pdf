'use strict';

var _manta = require('manta');

var _manta2 = _interopRequireDefault(_manta);

var _dbHelper = require('./lib/dbHelper');

var dbHelper = _interopRequireWildcard(_dbHelper);

var _logHelper = require('./lib/logHelper');

var _BuildEmailPdfsTask = require('./tasks/BuildEmailPdfsTask');

var _BuildEmailPdfsTask2 = _interopRequireDefault(_BuildEmailPdfsTask);

var _BuildPagePdfsTask = require('./tasks/BuildPagePdfsTask');

var _BuildPagePdfsTask2 = _interopRequireDefault(_BuildPagePdfsTask);

var _BuildCompilationPdfTask = require('./tasks/BuildCompilationPdfTask');

var _BuildCompilationPdfTask2 = _interopRequireDefault(_BuildCompilationPdfTask);

function _interopRequireWildcard(obj) { if (obj && obj.__esModule) { return obj; } else { var newObj = {}; if (obj != null) { for (var key in obj) { if (Object.prototype.hasOwnProperty.call(obj, key)) newObj[key] = obj[key]; } } newObj.default = obj; return newObj; } }

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

// require('babel-register')({ presets: ['es2015'] });
require('babel-register');
require('babel-polyfill');
require('dotenv').config({ silent: true });

// Define variables
// ****************
var config = {
  mongoUrl: process.env.MONGO_URL,
  emailOptions: {
    height: '10.5in',
    width: '8in',
    timeout: 120000
  },
  pageOptions: {
    height: '10.5in',
    width: '8in',
    timeout: 120000
  },
  mantaClient: _manta2.default.createClient({
    sign: _manta2.default.privateKeySigner({
      key: process.env.MANTA_APP_KEY.replace(/\\n/g, '\n'),
      keyId: process.env.MANTA_APP_KEY_ID,
      user: process.env.MANTA_APP_USER
    }),
    user: process.env.MANTA_APP_USER,
    url: process.env.MANTA_APP_URL,
    connectTimeout: 25000
  })
};

function parseTask(task) {
  var taskString = new Buffer(task, 'base64').toString('utf8');
  return JSON.parse(taskString);
}

function taskFactory(task, db) {
  (0, _logHelper.log)('status', 'Received task ' + task.name + '.');

  switch (task.name) {
    case 'build-email-pdfs':
      return new _BuildEmailPdfsTask2.default({ db: db, props: task.props, config: config });
    case 'build-page-pdfs':
      return new _BuildPagePdfsTask2.default({ db: db, props: task.props, config: config });
    case 'build-compilation-pdf':
      return new _BuildCompilationPdfTask2.default({ db: db, props: task.props, config: config });
    default:
      (0, _logHelper.log)('status', 'Could not find task named ' + task.name + '.');
      return { run: function run() {} };
  }
}

// Kick off everything
// *******************

(0, _logHelper.log)('status', 'Container started and running.');

if (!process.env.TASK) {
  (0, _logHelper.log)('status', 'Worker TASK missing.');
  process.exit();
}

var task = parseTask(process.env.TASK);

dbHelper.connectToDatabase(config.mongoUrl).then(function (db) {
  return taskFactory(task, db).run().then(function () {
    return dbHelper.logAndCloseDb(db);
  }).catch(function (err) {
    return dbHelper.catchErrAndCloseDb(err, db);
  });
});