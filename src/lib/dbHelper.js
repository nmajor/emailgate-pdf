import { MongoClient } from 'mongodb';
import { log } from './logHelper';

export function closeDbCallback(err) {
  if (err) { log('error', 'An error happened when closing the database connection', err.message); return; }

  log('status', 'Databse connection closed.');
}

export function logAndCloseDb(db) {
  log('status', 'Finished building and uploading PDF files.');
  log('status', 'Closing database connection.');
  db.close(closeDbCallback);
}

export function catchErrAndCloseDb(err, db) {
  if (err) { log('error', 'An error happened', err.message); return; }
  db.close(closeDbCallback);
}

export function connectToDatabase(mongoUrl) {
  return new Promise((resolve) => {
    MongoClient.connect(mongoUrl, (err, db) => {
      if (err) { log('error', 'An error happened while connecting to the database', err.message); return; }
      log('status', 'Connected to database.');

      resolve(db);
    });
  });
}
