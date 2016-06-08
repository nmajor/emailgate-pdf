import _ from 'lodash';
import * as pdfHelper from '../lib/pdfHelper';
import * as fileHelper from '../lib/fileHelper';
import connection from '../connection';

class CompilationPdfPlan {
  constructor(options) {
    this.compilationId = options.compilationId;
    this.progress = options.progress || function () {}; // eslint-disable-line func-names
    this.data = options.data || {};

    this.cleanupFiles = [];
    // stepsTotal should be the number of times this.step() is called within this.start()
    this.stepsTotal = 10;
    this.stepsCompleted = 0;

    this.getEmails = this.getEmails.bind(this);
    this.addEmailsProgressStepsToTotal = this.addEmailsProgressStepsToTotal.bind(this);
    this.getPages = this.getPages.bind(this);
    this.addPagesProgressStepsToTotal = this.addPagesProgressStepsToTotal.bind(this);
    this.downloadEmails = this.downloadEmails.bind(this);
    this.addPageNumberToEmail = this.addPageNumberToEmail.bind(this);
    this.downloadPages = this.downloadPages.bind(this);
    this.compilePdfDocuments = this.compilePdfDocuments.bind(this);
    this.getCompilationPdfPages = this.getCompilationPdfPages.bind(this);
    this.savePdfResults = this.savePdfResults.bind(this);
    this.step = this.step.bind(this);
    this.cleanup = this.cleanup.bind(this);
    this.start = this.start.bind(this);
  }

  getEmails() {
    return new Promise((resolve, reject) => {
      connection((db) => {
        const collection = db.collection('emails');
        collection.find({ _compilation: this.compilationId })
        .toArray((err, docs) => { // eslint-disable-line consistent-return
          if (err) { return reject(err); }

          this.emails = docs;
          this.addEmailsProgressStepsToTotal();
          resolve();
        });
      });
    });
  }

  addEmailsProgressStepsToTotal() {
    const emailsCount = this.emails.length;

    // Add steps to download pdf of each email
    this.stepsTotal += emailsCount;

    // Add steps to add page numbers to each email
    this.stepsTotal += emailsCount;
  }

  getPages() {
    return new Promise((resolve, reject) => {
      connection((db) => {
        const collection = db.collection('pages');
        collection.find({ _compilation: this.compilationId })
        .toArray((err, docs) => { // eslint-disable-line consistent-return
          if (err) { return reject(err); }

          this.pages = docs;
          this.addPagesProgressStepsToTotal();
          resolve(docs);
        });
      });
    });
  }

  addPagesProgressStepsToTotal() {
    const pagesCount = this.pages.length;

    // Add steps to download pdf of each email
    this.stepsTotal += pagesCount;
  }

  downloadEmails() {
    let p = Promise.resolve();

    _.forEach(this.emails, (email) => {
      p = p.then(() => {
        return this.step(pdfHelper.downloadPdf(email.pdf)
        .then((localPath) => {
          this.cleanupFiles.push(localPath);
          email.pdf.localPath = localPath; // eslint-disable-line no-param-reassign
          return this.addPageNumberToEmail(email);
        }));
      });
    });

    return p;
  }

  addPageNumberToEmail(email) {
    return this.step(new Promise((resolve, reject) => {
      const oldPath = email.pdf.localPath;
      const newPath = oldPath.replace(/\.pdf$/, '-paged.pdf');
      const startingPage = this.data.emailPageMap[email._id];
      const spawn = require('child_process').spawn;
      const pspdftool = spawn('pspdftool', [
        `number(x=-1pt,y=-1pt,start=${startingPage},size=10)`,
        oldPath,
        newPath,
      ]);

      pspdftool.on('close', (code) => {
        if (code === 0) {
          this.cleanupFiles.push(newPath);
          email.pdf.localPath = newPath; // eslint-disable-line no-param-reassign
          resolve(email);
        } else {
          reject('pspdftool returned a bad exit code.');
        }
      });
    }));
  }

  downloadPages() {
    let p = Promise.resolve();

    _.forEach(this.pages, (page) => {
      p = p.then(() => {
        return this.step(pdfHelper.downloadPdf(page.pdf)
        .then((localPath) => {
          this.cleanupFiles.push(localPath);
          page.pdf.localPath = localPath; // eslint-disable-line no-param-reassign
          return Promise.resolve(page);
        }));
      });
    });

    return p;
  }

  compilePdfDocuments() {
    return new Promise((resolve, reject) => {
      const sortedEmails = _.sortBy(this.emails, (email) => { return this.data.emailPositionMap[email._id]; });
      const sortedPages = _.sortBy(this.pages, (page) => { return this.data.pagePositionMap[page._id]; });

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
        reject(chunk.toString('utf8'));
      });
    });
  }

  getCompilationPdfPages(buffer) {
    return pdfHelper.getPdfPages(buffer)
    .then((pageCount) => {
      return Promise.resolve({
        model: 'compilation',
        _id: this.compilationId,
        pageCount,
        buffer,
      });
    });
  }

  savePdfResults(pdfResults) {
    return new Promise((resolve, reject) => {
      connection((db) => {
        const collection = db.collection('compilations');
        collection.update(
        { _id: this.compilationId },
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

  cleanup() {
    return fileHelper.deleteFiles(this.cleanupFiles);
  }

  start() {
    return Promise.all([
      this.step(this.getEmails()),
      this.step(this.getPages()),
    ])
    .then(() => {
      return Promise.all([
        this.step(this.downloadEmails()),
        this.step(this.downloadPages()),
      ]);
    })
    .then(() => {
      return this.step(this.compilePdfDocuments());
    })
    .then((buffer) => {
      return this.step(this.getCompilationPdfPages(buffer));
    })
    .then((pdfObj) => {
      return this.step(pdfHelper.savePdfObject(pdfObj))
      .then((localPath) => {
        pdfObj.localPath = localPath; // eslint-disable-line no-param-reassign
        return Promise.resolve(pdfObj);
      });
    })
    .then((pdfObj) => {
      return this.step(pdfHelper.uploadPdfObject(pdfObj));
    })
    .then((results) => {
      return this.step(this.savePdfResults(results));
    })
    .then(() => {
      return this.step(this.cleanup());
    });
  }
}

export default CompilationPdfPlan;
