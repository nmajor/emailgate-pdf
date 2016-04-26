import _ from 'lodash';
import { log } from '../lib/logHelper';
import * as pdfHelper from '../lib/pdfHelper';

class BuildCompilationPdfTask {
  constructor(options) {
    this.db = options.db;
    this.props = options.props;
    this.config = options.config;
  }

  getEmails() {
    return new Promise((resolve) => {
      const collection = this.db.collection('emails');
      collection.find({ _compilation: this.props.compilationId })
      .toArray((err, docs) => {
        if (err) { log('error', 'An error happened while getting emails.', err.message); return; }

        resolve(docs);
      });
    });
  }

  getPages() {
    return new Promise((resolve) => {
      const collection = this.db.collection('pages');
      collection.find({ _compilation: this.props.compilationId })
      .toArray((err, docs) => {
        if (err) { log('error', 'An error happened while getting pages.', err.message); return; }

        resolve(docs);
      });
    });
  }

  downloadEmails(emails) {
    let count = 1;
    const emailCount = emails.length;

    return Promise.all(emails.map((email) => {
      return pdfHelper.downloadPdf(email.pdf)
      .then((localPath) => {
        log('status', `Downloaded pdf file ${email.pdf.filename} ${count}/${emailCount}`);
        count++;
        email.pdf.localPath = localPath; // eslint-disable-line no-param-reassign
        return Promise.resolve(email);
      });
    }));
  }

  downloadPages(pages) {
    let count = 1;
    const pageCount = pages.length;

    return Promise.all(pages.map((page) => {
      return pdfHelper.downloadPdf(page.pdf)
      .then((localPath) => {
        log('status', `Downloaded pdf file ${page.pdf.filename} ${count}/${pageCount}`);
        count++;

        page.pdf.localPath = localPath; // eslint-disable-line no-param-reassign
        return Promise.resolve(page);
      });
    }));
  }

  compilePdfDocuments(emails, pages) {
    return new Promise((resolve, reject) => {
      const sortedEmails = _.sortBy(emails, (email) => { return this.props.emailPositionMap[email._id]; });
      const sortedPages = _.sortBy(pages, (page) => { return this.props.pagePositionMap[page._id]; });

      const pageFileArguments = _.map(sortedPages, (page) => { return page.pdf.localPath; });
      const emailFileArguments = _.map(sortedEmails, (email) => { return email.pdf.localPath; });

      const spawn = require('child_process').spawn;
      const pdftk = spawn('pdftk', [
        ...pageFileArguments,
        ...emailFileArguments,
        'cat',
        'output',
        '-',
      ]);

      const pdfBuffers = [];
      let pdfBuffer;
      pdftk.stdout.on('data', (d) => { pdfBuffers.push(d); });
      pdftk.stdout.on('end', () => {
        const buffer = Buffer.concat(pdfBuffer);

        pdfHelper.getPdfPages(buffer)
        .then((pageCount) => {
          resolve({ // eslint-disable-line indent
            model: 'compilation',
            _id: this.props.compilationId,
            pageCount,
            buffer,
          });
        });
      });

      pdftk.stderr.on('data', (err) => {
        log('error', 'An error happened with the pdftk command.', err.message);
        reject();
      });
    });
  }

  run() {
    return Promise.all([
      this.getEmails(),
      this.getPages(),
    ])
    .then((results) => {
      const [emails, pages] = results;

      return Promise.all([
        this.downloadEmails(emails),
        this.downloadPages(pages),
      ]);
    })
    .then((results) => {
      const [emails, pages] = results;

      return this.compilePdfDocuments(emails, pages);
    })
    .then((pdfObj) => {
      return pdfHelper.uploadPdfObject(pdfObj, this.config.mantaClient);
    })
    .then((result) => {
      log('compilation-pdf', `Added compilation pdf ${result._id}`, result);
      return Promise.resolve();
    });
  }
}

export default BuildCompilationPdfTask;
