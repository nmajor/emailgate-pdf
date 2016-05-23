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

  static getMoreTasks() {
    return new Promise((resolve) => {
      connection((db) => {
        const collection = db.collection('tasks');
        const query = { finishedAt: null };

        collection.find(query)
        .sort({ priority: -1, createdAt: -1 })
        .toArray((err, docs) => {
          resolve(docs.map((doc) => { return new Task(doc); }));
        });
      });
    });
  }

  isRunning() {
    return (this.startedAt && !this.finishedAt);
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

  update(attr, val) {
    return new Promise((resolve) => {
      connection((db) => {
        const collection = db.collection('tasks');

        collection.update({ _id: this._id }, { $set: { attr: val } }, (err, result) => {
          if (err) {
            this.addLog('error', `Error happened when updating ${attr}`, err);
            resolve();
            return;
          }

          if (result.result.n !== 1) {
            this.addLog('error', `Error happened when updating ${attr}. Update query didnt seem to update anythig.`, result);
            resolve();
            return;
          }

          this[attr] = val;
          resolve(this);
        });
      });
    });
  }

  start() {
    return this.update('startedAt', new Date())
    .then(() => {
      return new this.Plan({ task: this }).start();
    })
    .then(() => {
      return this.update('finishedAt', new Date());
    });
  }
}

export default Task;
