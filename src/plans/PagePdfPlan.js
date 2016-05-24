import config from '../config';
import connection from '../connection';
import * as pdfHelper from '../lib/pdfHelper';
import assert from 'assert';

class PagePdfPlan {
  constructor(options) {
    this.task = options.task;

    this.getPage = this.getPage.bind(this);
    this.buildPdf = this.buildPdf.bind(this);
    this.uploadPdf = this.uploadPdf.bind(this);
    this.savePdfResults = this.savePdfResults.bind(this);
    this.log = this.log.bind(this);
    this.start = this.start.bind(this);
  }

  getPage() {
    return new Promise((resolve) => {
      this.log('status', 'Finding Page.');

      connection((db) => {
        const collection = db.collection('pages');
        collection.findOne({ _id: this.task.pageId }, (err, doc) => {
          assert.equal(err, null);
          assert.ok(doc);

          this.log('status', 'Found Page');
          this.page = doc;

          resolve(this.page);
        });
      });
    });
  }

  buildPdf() {
    const page = this.page;
    const html = page.html;
    return pdfHelper.buildPdf(html, 'page', page, config.pageOptions, this.log);
  }

  uploadPdf(pdfObj) {
    return pdfHelper.uploadPdfObject(pdfObj, this.log);
  }

  savePdfResults(pdfResults) {
    return new Promise((resolve) => {
      this.log('status', 'Saving pdf results');

      connection((db) => {
        const collection = db.collection('pages');
        collection.update({ _id: this.task.pageId }, { $set: { pdf: pdfResults } }, (err, result) => {
          assert.equal(err, null);
          assert.equal(result.result.n, 1);

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

    return this.getPage()
    .then(() => {
      return this.buildPdf();
    })
    .then((pdfObj) => {
      return this.uploadPdf(pdfObj);
    })
    .then(this.savePdfResults);
  }
}

export default PagePdfPlan;
