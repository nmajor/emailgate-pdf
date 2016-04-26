import _ from 'lodash';
import { log } from '../lib/logHelper';
import * as pdfHelper from '../lib/pdfHelper';

class BuildPagePdfsTask {
  constructor(options) {
    this.db = options.db;
    this.props = options.props;
    this.config = options.config;

    this.pageQuery = this.pageQuery.bind(this);
    this.buildPagePdf = this.buildPagePdf.bind(this);
    this.getPages = this.getPages.bind(this);
    this.buildPdfForPages = this.buildPdfForPages.bind(this);
  }

  pageQuery() {
    return {
      _id: { $in: this.props.pageIds },
    };
  }

  buildPagePdf(page) {
    const html = page.html;
    return pdfHelper.buildPdf(html, 'page', page, this.config.pageOptions);
  }

  getPages() {
    return new Promise((resolve) => {
      const collection = this.db.collection('pages');
      collection.find(this.pageQuery())
      .toArray((err, docs) => {
        if (err) { log('error', 'An error happened while getting emails.', err.message); return; }

        resolve(docs);
      });
    });
  }

  buildPdfForPages(pages) {
    let count = 1;
    const pageLength = pages.length;
    log('status', `Found ${pageLength} compilation pages.`);

    let p = Promise.resolve();

    _.forEach(pages, (page) => {
      p = p.then(() => {
        return this.buildPagePdf(page)
        .then((pdfObj) => {
          return pdfHelper.uploadPdfObject(pdfObj, this.config.mantaClient);
        })
        .then((result) => {
          log('page-pdf', `Added page pdf ${result._id} ${count}/${pageLength}`, result);
          count++;
        });
      });
    });

    return p;
  }

  run() {
    return this.getPages()
    .then(this.buildPdfForPages);
  }
}

export default BuildPagePdfsTask;
