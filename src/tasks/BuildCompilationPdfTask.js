import _ from 'lodash';
import { log } from '../lib/logHelper';
import * as pdfHelper from '../lib/pdfHelper';

class BuildCompilationPdfTask {
  constructor(options) {
    this.db = options.db;
    this.props = options.props;
    this.config = options.config;
    this.state = {
      emails: [],
      pages: [],
    };

    this.getEmails = this.getEmails.bind(this);
    this.getPages = this.getPages.bind(this);
    this.downloadEmails = this.downloadEmails.bind(this);
    this.addPageNumberToEmail = this.addPageNumberToEmail.bind(this);
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

        this.state.emails = docs;
        resolve();
      });
    });
  }

  getPages() {
    return new Promise((resolve) => {
      const collection = this.db.collection('pages');
      collection.find({ _compilation: this.props.compilationId })
      .toArray((err, docs) => {
        if (err) { log('error', 'An error happened while getting pages.', err.message); return; }

        this.state.pages = docs;
        resolve(docs);
      });
    });
  }

  downloadEmails() {
    let count = 1;
    const emailCount = this.state.emails.length;
    let p = Promise.resolve();

    _.forEach(this.state.emails, (email) => {
      p = p.then(() => {
        return pdfHelper.downloadPdf(email.pdf)
        .then((localPath) => {
          log('status', `Downloaded pdf file ${email.pdf.filename} ${count}/${emailCount}`);
          count++;
          email.pdf.localPath = localPath; // eslint-disable-line no-param-reassign
          return this.addPageNumberToEmail(email);
        });
      });
    });

    return p;
  }

  addPageNumberToEmail(email) {
    return new Promise((resolve, reject) => {
      const oldPath = email.pdf.localPath;
      const newPath = oldPath.replace(/\.pdf$/, '-paged.pdf');
      const startingPage = this.props.emailPageMap[email._id];
      const spawn = require('child_process').spawn;
      const pspdftool = spawn('pspdftool', [
        `number(x=-1pt,y=-1pt,start=${startingPage},size=10)`,
        oldPath,
        newPath,
      ]);

      pspdftool.on('close', (code) => {
        if (code === 0) {
          email.pdf.localPath = newPath; // eslint-disable-line no-param-reassign
          log('status', `Added page numbers to ${email.pdf.filename}`);
          resolve(email);
        } else {
          reject('pspdftool returned a bad exit code.');
        }
      });
    });
  }

  downloadPages() {
    let count = 1;
    const pageCount = this.state.pages.length;
    let p = Promise.resolve();

    _.forEach(this.state.pages, (page) => {
      p = p.then(() => {
        return pdfHelper.downloadPdf(page.pdf)
        .then((localPath) => {
          log('status', `Downloaded pdf file ${page.pdf.filename} ${count}/${pageCount}`);
          count++;
          page.pdf.localPath = localPath; // eslint-disable-line no-param-reassign
          return Promise.resolve(page);
        });
      });
    });

    return p;
  }

  compilePdfDocuments() {
    return new Promise((resolve, reject) => {
      const sortedEmails = _.sortBy(this.state.emails, (email) => { return this.props.emailPositionMap[email._id]; });
      const sortedPages = _.sortBy(this.state.pages, (page) => { return this.props.pagePositionMap[page._id]; });

      const pageFileArguments = _.map(sortedPages, (page) => { if (!page.pdf) { console.log('blah'); console.log(page); } return page.pdf.localPath; });
      const emailFileArguments = _.map(sortedEmails, (email) => { if (!email.pdf) { console.log('blah'); console.log(email); } return email.pdf.localPath; });

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
    .then(() => {
      log('status', `Found compilation emails(${this.state.emails.length}) and pages(${this.state.pages.length}).`);

      return Promise.all([
        this.downloadEmails(),
        this.downloadPages(),
      ]);
    })
    .then(() => {
      log('status', 'Downloaded email and page pdf files.');

      return this.compilePdfDocuments();
    })
    .then(this.getCompilationPdfPages)
    .then((pdfObj) => {
      log('status', `Compiled the pdfs into one ${pdfObj.pageCount} page file.`);
      return pdfHelper.uploadPdfObject(pdfObj, this.config.mantaClient);
    })
    .then((result) => {
      log('compilation-pdf', `Added compilation pdf ${result._id}`, result);
      return Promise.resolve();
    })
    .catch((err) => {
      log('error', err.message, err);
    });
  }
}

export default BuildCompilationPdfTask;
