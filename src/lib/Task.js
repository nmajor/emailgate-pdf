// import _ from 'lodash';
import EmailPdfPlan from '../plans/EmailPdfPlan';
import PagePdfPlan from '../plans/PagePdfPlan';
import CompilationPdfPlan from '../plans/CompilationPdfPlan';

export function planFactory(task) {
  switch (task.job.data.kind) {
    case 'email-pdf' :
      return new EmailPdfPlan({ emailId: task.job.data.referenceId, progress: task.progress, data: task.job.data });
    case 'page-pdf' :
      return new PagePdfPlan({ pageId: task.job.data.referenceId, progress: task.progress, data: task.job.data });
    case 'compilation-pdf' :
      return new CompilationPdfPlan({ compilationId: task.job.data.referenceId, progress: task.progress, data: task.job.data });
    default:
      return null;
  }
}

class Task {
  constructor(job) {
    this.job = job;
    this.progress = this.progress.bind(this);
  }

  log(entry) {
    this.job.log(entry);
  }

  progress(completed, total, data) {
    this.job.progress(completed, total, data);
  }

  start() {
    return planFactory(this).start();
  }
}

export default Task;
