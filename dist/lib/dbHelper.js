'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.closeDbCallback = closeDbCallback;
exports.logAndCloseDb = logAndCloseDb;
exports.catchErrAndCloseDb = catchErrAndCloseDb;
exports.connectToDatabase = connectToDatabase;

var _mongodb = require('mongodb');

var _logHelper = require('./logHelper');

function closeDbCallback(err) {
  if (err) {
    (0, _logHelper.log)('error', 'An error happened when closing the database connection', err.message);return;
  }

  (0, _logHelper.log)('status', 'Databse connection closed.');
}

function logAndCloseDb(db) {
  (0, _logHelper.log)('status', 'Finished building and uploading PDF files.');
  (0, _logHelper.log)('status', 'Closing database connection.');
  db.close(closeDbCallback);
}

function catchErrAndCloseDb(err, db) {
  if (err) {
    (0, _logHelper.log)('error', 'An error happened', err.message);return;
  }
  db.close(closeDbCallback);
}

function connectToDatabase(mongoUrl) {
  return new Promise(function (resolve) {
    _mongodb.MongoClient.connect(mongoUrl, function (err, db) {
      if (err) {
        (0, _logHelper.log)('error', 'An error happened while connecting to the database', err.message);return;
      }
      (0, _logHelper.log)('status', 'Connected to database.');

      resolve(db);
    });
  });
}