import _ from 'lodash';
import EmailPdf from './plans/EmailPdfPlan';
import assert from 'assert';
import connection from './connection';

export function planFactory(task) {
  switch (task.kind) {
    case 'email-pdf' :
      return EmailPdf;
    default:
      return null;
  }
}

class Task {
  constructor(props) {
    _.forEach(props, (value, key) => {
      this[key] = value;
    });

    this.Plan = planFactory(this);
  }

  static findNextTasks() {
    return new Promise((resolve) => {
      connection((db) => {
        const collection = db.collection('tasks');
        // const query = { startedAt: null, finishedAt: null };
        const query = {};

        collection.find(query)
        .sort({ priority: -1, createdAt: -1 })
        .limit(5)
        .toArray((err, docs) => {
          // if (err) { log('error', 'An error happened while getting emails.', err.message); return; }

          resolve(docs.map((doc) => { return new Task(doc); }));
        });
      });
    });
  }

  addLog(type, message, payload) {
    connection((db) => {
      const collection = db.collection('tasks');
      const entry = {
        type,
        message,
      };
      if (payload) { entry.payload = payload; }
      console.log(entry);

      collection.update({ _id: this._id }, { $push: { log: entry } }, (err, result) => {
        assert.equal(err, null);
        assert.equal(1, result.result.n);
      });
    });
  }

  start() {
    return new Promise((resolve) => {
      connection((db) => {
        const collection = db.collection('tasks');

        collection.update({ _id: this._id }, { $set: { startedAt: new Date() } }, (err, result) => {
          if (err) {
            this.addLog('error', 'Error happened when updating startedAt', err);
            resolve();
            return;
          }

          if (result.result.n !== 1) {
            this.addLog('error', 'Error happened when updating startedAt. Update query didnt seem to update anythig.', result);
            resolve();
            return;
          }

          resolve(new this.Plan({ task: this }).start());
        });
      });
    });
  }
}

export default Task;
