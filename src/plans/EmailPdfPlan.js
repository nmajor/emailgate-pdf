import config from '../config';
import connection from '../connection';
import * as pdfHelper from '../lib/pdfHelper';

class EmailPdfPlan {
  constructor(options) {
    this.emailId = options.emailId;
    this.progress = options.progress || function () {}; // eslint-disable-line func-names
    this.data = options.data || {};

    // stepsTotal should be the number of times this.step() is called within this.start()
    this.stepsTotal = 4;
    this.stepsCompleted = 0;

    this.getEmail = this.getEmail.bind(this);
    this.buildPdf = this.buildPdf.bind(this);
    this.uploadPdf = this.uploadPdf.bind(this);
    this.savePdfResults = this.savePdfResults.bind(this);
    this.step = this.step.bind(this);
    this.start = this.start.bind(this);
  }

  getEmail() {
    return new Promise((resolve, reject) => {
      connection((db) => {
        const collection = db.collection('emails');
        collection.findOne({ _id: this.emailId }, (err, doc) => { // eslint-disable-line consistent-return
          if (err) { return reject(err); }
          if (!doc) { return reject(new Error('No document found.')); }

          this.email = doc;

          resolve(this.email);
        });
      });
    });
  }

  buildPdf() {
    const email = this.email;
    const html = email.template.replace('[[BODY]]', email.body);
    return pdfHelper.buildPdf(html, 'email', email, config.emailOptions);
  }

  uploadPdf(pdfObj) {
    return pdfHelper.uploadPdfObject(pdfObj);
  }

  savePdfResults(pdfResults) {
    return new Promise((resolve, reject) => {
      connection((db) => {
        const collection = db.collection('emails');
        collection.update(
        { _id: this.emailId },
        { $set: { pdf: pdfResults } },
        (err, result) => { // eslint-disable-line consistent-return
          if (err) { return reject(err); }
          if (result.result.n !== 1) { return reject(new Error('No document updated.')); }

          resolve();
        });
      });
    });
  }

  step(stepPromise, data) {
    return stepPromise.then((result) => {
      this.stepsCompleted += 1;
      this.progress(this.stepsCompleted, this.stepsTotal, data);

      return Promise.resolve(result);
    });
  }

  start() {
    return this.step(this.getEmail())
    .then(() => {
      return this.step(this.buildPdf());
    })
    .then((pdfObj) => {
      return this.step(this.uploadPdf(pdfObj));
    })
    .then((results) => {
      return this.step(this.savePdfResults(results));
    });
  }
}

export default EmailPdfPlan;
