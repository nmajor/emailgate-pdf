import _ from 'lodash';
import EmailPdf from './plans/EmailPdfPlan';
// import assert from 'assert';

export function planFactory(task) {
  switch (task.kind) {
    case 'email-pdf' :
      return EmailPdf;
    default:
      return null;
  }
}

class Task {
  constructor(job) {
    _.forEach(job.data, (value, key) => {
      this[key] = value;
    });
    this.job = job;

    this.Plan = planFactory(this);
  }

  addLog(type, message, payload) {
    const entry = {
      type,
      message,
    };

    if (payload) { entry.payload = payload; }

    this.job.log(entry);
  }

  start() {
    return new this.Plan({ task: this }).start();
  }
}

export default Task;
