import _ from 'lodash';
import { log } from '../lib/logHelper';
import * as pdfHelper from '../lib/pdfHelper';

class BuildEmailPdfsTask {
  constructor(options) {
    this.db = options.db;
    this.props = options.props;
    this.config = options.config;

    this.emailQuery = this.emailQuery.bind(this);
    this.buildEmailPdf = this.buildEmailPdf.bind(this);
    this.getEmails = this.getEmails.bind(this);
    this.buildPdfForEmails = this.buildPdfForEmails.bind(this);
  }

  emailQuery() {
    return {
      _id: { $in: this.props.emailIds },
    };
  }

  buildEmailPdf(email) {
    const html = email.template.replace('[[BODY]]', email.body);
    return pdfHelper.buildPdf(html, 'email', email, this.config.emailOptions);
  }

  getEmails() {
    return new Promise((resolve) => {
      const collection = this.db.collection('emails');
      collection.find(this.emailQuery())
      .toArray((err, docs) => {
        if (err) { log('error', 'An error happened while getting emails.', err.message); return; }

        resolve(docs);
      });
    });
  }

  buildPdfForEmails(emails) {
    let count = 1;
    const emailLength = emails.length;
    log('status', `Found ${emailLength} compilation emails.`);

    let p = Promise.resolve();

    _.forEach(emails, (email) => {
      p = p.then(() => {
        return this.buildEmailPdf(email)
        .then((pdfObj) => {
          return pdfHelper.uploadPdfObject(pdfObj, this.config.mantaClient);
        })
        .then((result) => {
          log('email-pdf', `Added email pdf ${result._id} ${count}/${emailLength}`, result);
          count++;
        });
      });
    });

    return p;
  }

  run() {
    return this.getEmails()
    .then(this.buildPdfForEmails);
  }
}

export default BuildEmailPdfsTask;
