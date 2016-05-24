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
    this.start = this.start.bind(this);
  }

  getPage() {
    return new Promise((resolve) => {
      connection((db) => {
        const collection = db.collection('pages');
        collection.findOne({ _id: this.task.pageId }, (err, doc) => {
          assert.equal(err, null);
          assert.ok(doc);

          this.page = doc;

          resolve(this.page);
        });
      });
    });
  }

  buildPdf() {
    const page = this.page;
    const html = page.html;
    return pdfHelper.buildPdf(html, 'page', page, config.pageOptions);
  }

  uploadPdf(pdfObj) {
    return pdfHelper.uploadPdfObject(pdfObj);
  }

  savePdfResults(pdfResults) {
    return new Promise((resolve) => {
      connection((db) => {
        const collection = db.collection('pages');
        collection.update({ _id: this.task.pageId }, { $set: { pdf: pdfResults } }, (err, result) => {
          assert.equal(err, null);
          assert.equal(result.result.n, 1);

          resolve();
        });
      });
    });
  }

  start() {
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
