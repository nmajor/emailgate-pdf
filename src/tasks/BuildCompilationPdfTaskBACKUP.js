import _ from 'lodash';
import { log } from '../lib/logHelper';
import * as pdfHelper from '../lib/pdfHelper';
import fs from 'fs';

class BuildCompilationPdfTask {
  constructor(options) {
    this.db = options.db;
    this.props = options.props;
    this.config = options.config;

    this.getEmails = this.getEmails.bind(this);
    this.getPages = this.getPages.bind(this);
    this.downloadEmails = this.downloadEmails.bind(this);
    this.downloadPages = this.downloadPages.bind(this);
    this.compilePagePdfs = this.downloadPages.bind(this);
    this.compileEmailPdfs = this.downloadPages.bind(this);
    this.getCompilationPdfPageCount = this.getCompilationPdfPageCount.bind(this);
    this.addPageNumbersToEmailsPdf = this.addPageNumbersToEmailsPdf.bind(this);
    this.getPdfBufferFromFile = this.getPdfBufferFromFile.bind(this);
    this.combinePdfFiles = this.combinePdfFiles.bind(this);
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

  compilePagePdfs(pages) {
    return new Promise((resolve, reject) => {
      const filePath = `/tmp/compilation-${this.props.compilationId}-pages.pdf`;
      const writeStream = fs.createWriteStream(filePath);
      const sortedPages = _.sortBy(pages, (page) => { return this.props.pagePositionMap[page._id]; });
      const pageFileArguments = _.map(sortedPages, (page) => { return page.pdf.localPath; });

      const spawn = require('child_process').spawn;
      const pdftk = spawn('pdftk', [
        ...pageFileArguments,
        'cat',
        'output',
        '-',
      ]);

      pdftk.stdout.pipe(writeStream);

      pdftk.stdout.on('end', () => {
        resolve(filePath);
      });

      pdftk.stderr.on('data', (chunk) => {
        log('error', 'An error happened with the pdftk command.', chunk.toString('utf8'));
        reject('An error happened with the pdftk command.');
      });
    });
  }

  compileEmailPdfs(emails) {
    return new Promise((resolve, reject) => {
      const filePath = `/tmp/compilation-${this.props.compilationId}-emails.pdf`;
      const writeStream = fs.createWriteStream(filePath);
      const sortedEmails = _.sortBy(emails, (email) => { return this.props.emailPositionMap[email._id]; });
      const emailFileArguments = _.map(sortedEmails, (email) => { return email.pdf.localPath; });

      const spawn = require('child_process').spawn;
      const pdftk = spawn('pdftk', [
        ...emailFileArguments,
        'cat',
        'output',
        '-',
      ]);

      pdftk.stdout.pipe(writeStream);

      pdftk.stdout.on('end', () => {
        resolve(filePath);
      });

      pdftk.stderr.on('data', (chunk) => {
        log('error', 'An error happened with the pdftk command.', chunk.toString('utf8'));
        reject('An error happened with the pdftk command.');
      });
    });
  }

  getCompilationPdfPageCount(buffer) {
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

  addPageNumbersToEmailsPdf(pdfPath) {
    return new Promise((resolve, reject) => {
      const newFilePath = `paged-${pdfPath}`;
      const spawn = require('child_process').spawn;
      const pspdftool = spawn('pspdftool', [
        'number(x=-1pt,y=-1pt,start=9,size=10)',
        pdfPath,
        newFilePath,
      ]);

      pspdftool.on('close', (code) => {
        if (code === 0) {
          resolve(newFilePath);
        } else {
          reject('pspdftool returned a bad exit code.');
        }
      });
    });
  }

  getPdfBufferFromFile(pdfPath) {
    return new Promise((resolve, reject) => {
      fs.readFile(pdfPath, (err, data) => {
        if (err) { log('error', 'An error happened while converting the pdf file to buffer.', err.message); reject(); return; }

        resolve(data);
      });
    });
  }

  combinePdfFiles(filePath1, filePath2) {
    return new Promise((resolve, reject) => {
      const spawn = require('child_process').spawn;
      const pdftk = spawn('pdftk', [
        filePath1,
        filePath2,
        'cat',
        'output',
        '-',
      ]);

      const pdfBuffers = [];
      pdftk.stdout.on('data', (chunk) => { pdfBuffers.push(chunk); });
      pdftk.stdout.on('end', () => {
        resolve(Buffer.concat(pdfBuffers));
      });

      const writeStream = fs.createWriteStream('/var/host/tmp/demo.pdf');
      pdftk.stdout.pipe(writeStream);

      pdftk.stderr.on('data', (chunk) => {
        log('error', 'An error happened with the pdftk command combining files.', chunk.toString('utf8'));
        reject('An error happened with the pdftk command.');
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

      return Promise.all([
        this.compileEmailPdfs(emails),
        this.compilePagePdfs(pages),
      ]);
    })
    .then((results) => {
      const [emailsPdfPath, pagesPdfPath] = results;
      log('status', 'Compiled email pdfs and pages pdfs.');
      console.log('blah 1');
      console.log(emailsPdfPath);
      console.log('blah 2');
      console.log(pagesPdfPath);

      return Promise.all([
        this.addPageNumbersToEmailsPdf(emailsPdfPath),
        Promise.resolve(pagesPdfPath),
      ]);
    })
    .then((results) => {
      const [emailsPdfPath, pagesPdfPath] = results;

      return this.combinePdfFiles(emailsPdfPath, pagesPdfPath);
    })
    .catch((err) => {
      console.log(err.message);
    });
    // .then(this.getCompilationPdfPages)
    // .then((pdfObj) => {
    //   log('status', `Compiled the pdfs into one ${pdfObj.pageCount} page file.`);
    //   return pdfHelper.uploadPdfObject(pdfObj, this.config.mantaClient);
    // })
    // .then((result) => {
    //   log('compilation-pdf', `Added compilation pdf ${result._id}`, result);
    //   return Promise.resolve();
    // });
  }
}

export default BuildCompilationPdfTask;
