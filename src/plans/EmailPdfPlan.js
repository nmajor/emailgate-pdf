import config from '../config';
import connection from '../connection';
import * as pdfHelper from '../lib/pdfHelper';

class EmailPdfPlan {
  constructor(options) {
    this.task = options.task;

    this.getEmail = this.getEmail.bind(this);
    this.buildPdf = this.buildPdf.bind(this);
    this.uploadPdf = this.uploadPdf.bind(this);
    this.savePdfResults = this.savePdfResults.bind(this);
    this.log = this.log.bind(this);
    this.start = this.start.bind(this);
  }

  getEmail() {
    return new Promise((resolve) => {
      this.log('status', 'Finding Email.');

      connection((db) => {
        const collection = db.collection('emails');
        collection.findOne({ _id: this.task.emailId }, (err, doc) => {
          if (err) { this.log('error', 'An error happened while finding email in DB.', err.message); return; }
          if (!doc) { this.log('error', `Could not find email with id: ${this.task.emailId}.`, err.message); return; }

          this.log('status', 'Found Email');
          this.email = doc;

          resolve(this.email);
        });
      });
    });
  }

  buildPdf() {
    const email = this.email;
    const html = email.template.replace('[[BODY]]', email.body);
    return pdfHelper.buildPdf(html, 'email', email, config.emailOptions, this.log);
  }

  uploadPdf(pdfObj) {
    return pdfHelper.uploadPdfObject(pdfObj, this.log);
  }

  savePdfResults(pdfResults) {
    return new Promise((resolve) => {
      this.log('status', 'Saving pdf results');

      connection((db) => {
        const collection = db.collection('emails');
        collection.update({ _id: this.task.emailId }, { $set: { pdf: pdfResults } }, (err, result) => {
          if (err) {
            this.log('error', 'Error happened when updating pdf for email', err);
            resolve();
            return;
          }

          if (result.result.n !== 1) {
            this.log('error', 'Error happened when updating pdf for email.', result);
            resolve();
            return;
          }

          this.log('status', 'Finished saving pdf results');

          resolve();
        });
      });
    });
  }

  log(type, message, payload) {
    this.task.addLog(type, message, payload);
  }

  start() {
    this.log('status', 'Starting Task');

    return this.getEmail()
    .then(() => {
      return this.buildPdf();
    })
    .then((pdfObj) => {
      return this.uploadPdf(pdfObj);
    })
    .then(this.savePdfResults);
  }
}

export default EmailPdfPlan;
