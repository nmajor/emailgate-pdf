import _ from 'lodash';
import * as pdfHelper from '../lib/pdfHelper';
import connection from '../connection';
import assert from 'assert';

class CompilationPdfPlan {
  constructor(options) {
    this.task = options.task;

    this.getEmails = this.getEmails.bind(this);
    this.getPages = this.getPages.bind(this);
    this.downloadEmails = this.downloadEmails.bind(this);
    this.addPageNumberToEmail = this.addPageNumberToEmail.bind(this);
    this.downloadPages = this.downloadPages.bind(this);
    this.compilePdfDocuments = this.compilePdfDocuments.bind(this);
    this.getCompilationPdfPages = this.getCompilationPdfPages.bind(this);
    this.savePdfResults = this.savePdfResults.bind(this);
    this.log = this.log.bind(this);
    this.start = this.start.bind(this);
  }

  getEmails() {
    return new Promise((resolve) => {
      connection((db) => {
        const collection = db.collection('emails');
        collection.find({ _compilation: this.task.compilationId })
        .toArray((err, docs) => {
          assert.equal(err, null);

          this.emails = docs;
          resolve();
        });
      });
    });
  }

  getPages() {
    return new Promise((resolve) => {
      connection((db) => {
        const collection = db.collection('pages');
        collection.find({ _compilation: this.task.compilationId })
        .toArray((err, docs) => {
          assert.equal(err, null);

          this.pages = docs;
          resolve(docs);
        });
      });
    });
  }

  downloadEmails() {
    let count = 1;
    const emailCount = this.emails.length;
    let p = Promise.resolve();

    _.forEach(this.emails, (email) => {
      p = p.then(() => {
        return pdfHelper.downloadPdf(email.pdf, this.log)
        .then((localPath) => {
          this.log('status', `Downloaded pdf file ${email.pdf.filename} ${count}/${emailCount}`);
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
      const startingPage = this.task.emailPageMap[email._id];
      const spawn = require('child_process').spawn;
      const pspdftool = spawn('pspdftool', [
        `number(x=-1pt,y=-1pt,start=${startingPage},size=10)`,
        oldPath,
        newPath,
      ]);

      pspdftool.on('close', (code) => {
        if (code === 0) {
          email.pdf.localPath = newPath; // eslint-disable-line no-param-reassign
          this.log('status', `Added page numbers to ${email.pdf.filename}`);
          resolve(email);
        } else {
          reject('pspdftool returned a bad exit code.');
        }
      });
    });
  }

  downloadPages() {
    let count = 1;
    const pageCount = this.pages.length;
    let p = Promise.resolve();

    _.forEach(this.pages, (page) => {
      p = p.then(() => {
        return pdfHelper.downloadPdf(page.pdf, this.log)
        .then((localPath) => {
          this.log('status', `Downloaded pdf file ${page.pdf.filename} ${count}/${pageCount}`);
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
      const sortedEmails = _.sortBy(this.emails, (email) => { return this.task.emailPositionMap[email._id]; });
      const sortedPages = _.sortBy(this.pages, (page) => { return this.task.pagePositionMap[page._id]; });

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
        reject(chunk.toString('utf8'));
      });
    });
  }

  getCompilationPdfPages(buffer) {
    return pdfHelper.getPdfPages(buffer, this.log)
    .then((pageCount) => {
      return Promise.resolve({
        model: 'compilation',
        _id: this.task.compilationId,
        pageCount,
        buffer,
      });
    });
  }

  log(type, message, payload) {
    this.task.addLog(type, message, payload);
  }

  savePdfResults(pdfResults) {
    return new Promise((resolve) => {
      this.log('status', 'Saving pdf results');

      connection((db) => {
        const collection = db.collection('compilations');
        collection.update({ _id: this.task.compilationId }, { $set: { pdf: pdfResults } }, (err, result) => {
          assert.equal(err, null);
          assert.equal(result.result.n, 1);

          this.log('status', 'Finished saving pdf results');

          resolve();
        });
      });
    });
  }

  start() {
    this.log('status', 'Starting Task');

    return Promise.all([
      this.getEmails(),
      this.getPages(),
    ])
    .then(() => {
      this.log('status', `Found compilation emails(${this.emails.length}) and pages(${this.pages.length}).`);

      return Promise.all([
        this.downloadEmails(),
        this.downloadPages(),
      ]);
    })
    .then(() => {
      this.log('status', 'Downloaded email and page pdf files.');

      return this.compilePdfDocuments();
    })
    .then(this.getCompilationPdfPages)
    .then((pdfObj) => {
      this.log('status', `Compiled the pdfs into one ${pdfObj.pageCount} page file.`);
      return pdfHelper.uploadPdfObject(pdfObj, this.log);
    })
    .then(this.savePdfResults);
  }
}

export default CompilationPdfPlan;
