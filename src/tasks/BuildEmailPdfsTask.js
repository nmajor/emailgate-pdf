import _ from 'lodash';
import { log } from '../lib/logHelper';
import pdfHelper from '../lib/pdfHelper';

export default class BuildEmailPdfs {
  constructor(options) {
    this.db = options.db;
    this.props = options.props;
    this.config = options.config;
  }

  emailQuery() {
    return { _id: this.props.emailIds };
  }

  buildEmailPdf(email) {
    const html = email.template.replace('[[BODY]]', email.body);
    return pdfHelper.buildPdf(html, 'email', email);
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
          return pdfHelper.uploadPdfObject(pdfObj);
        })
        .then((result) => {
          log('email-pdf', `Added email ${result._id} ${count}/${emailLength}`, result);
          count++;
        });
      });
    });

    return p;
  }

  run() {
    console.log('blah running BuildEmailPdfsTask');
    console.log(this.db);
    console.log(this.props);
    console.log(this.config);

    return this.getEmails()
    .then(this.buildPdfForEmails);
  }
}
