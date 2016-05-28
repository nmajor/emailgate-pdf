if (process.env.NODE_ENV !== 'production') { require('dotenv').config({ silent: true }); }
import assert from 'assert';
import { MongoClient } from 'mongodb';
import config from './config';

let db = null;

export default function (cb) {
  if (db) { cb(db); return; }

  MongoClient.connect(config.mongoUrl, (err, conn) => {
    assert.equal(err, null);

    db = conn;
    cb(db);
  });
}
