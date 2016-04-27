import _ from 'lodash';
import { log } from '../lib/logHelper';
import * as pdfHelper from '../lib/pdfHelper';

class BuildCompilationPdfTask {
  constructor(options) {
    this.db = options.db;
    this.props = options.props;
    this.config = options.config;

    this.getEmails = this.getEmails.bind(this);
    this.getPages = this.getPages.bind(this);
    this.downloadEmails = this.downloadEmails.bind(this);
    this.downloadPages = this.downloadPages.bind(this);
    this.compilePdfDocuments = this.compilePdfDocuments.bind(this);
    this.getCompilationPdfPages = this.getCompilationPdfPages.bind(this);
  }

  getEmails() {
    return new Promise((resolve) => {
      const collection = this.db.collection('emails');
      collection.find({ _compilation: this.props.compilationId })
      .toArray((err, docs) => {
        if (err) { log('error', 'An error happened while getting emails.', err.message); return; }

        resolve(docs.slice(0, 5));
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
      pdftk.stdout.on('data', (chunk) => { pdfBuffers.push(chunk); });
      pdftk.stdout.on('end', () => {
        resolve(Buffer.concat(pdfBuffers));
      });

      pdftk.stderr.on('data', (chunk) => {
        log('error', 'An error happened with the pdftk command.', chunk.toString('utf8'));
        reject('An error happened with the pdftk command.');
      });
    });
  }

  getCompilationPdfPages(buffer) {
    return pdfHelper.getPdfPages(buffer)
    .then((pageCount) => {
      return Promise.resolve({
        model: 'compilation',
        _id: this.props.compilationId,
        pageCount,
        buffer,
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
      log('status', `Found compilation emails(${emails.length}) and pages(${pages.length}).`);

      return Promise.all([
        this.downloadEmails(emails),
        this.downloadPages(pages),
      ]);
    })
    .then((results) => {
      const [emails, pages] = results;
      log('status', 'Downloaded email and page pdf files.');

      return this.compilePdfDocuments(emails, pages);
    })
    .then(this.getCompilationPdfPages)
    .then((pdfObj) => {
      log('status', `Compiled the pdfs into one ${pdfObj.pageCount} page file.`);
      return pdfHelper.uploadPdfObject(pdfObj, this.config.mantaClient);
    })
    .then((result) => {
      log('compilation-pdf', `Added compilation pdf ${result._id}`, result);
      return Promise.resolve();
    });
  }
}

export default BuildCompilationPdfTask;
