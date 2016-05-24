import _ from 'lodash';
import EmailPdfPlan from './plans/EmailPdfPlan';
import PagePdfPlan from './plans/PagePdfPlan';
import CompilationPdfPlan from './plans/CompilationPdfPlan';
// import assert from 'assert';

export function planFactory(task) {
  switch (task.kind) {
    case 'email-pdf' :
      return EmailPdfPlan;
    case 'page-pdf' :
      return PagePdfPlan;
    case 'compilation-pdf' :
      return CompilationPdfPlan;
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

  log(entry) {
    this.job.log(entry);
  }

  progress(completed, total, data) {
    this.job.progress(completed, total, data);
  }

  start() {
    return new this.Plan({ task: this }).start();
  }
}

export default Task;
