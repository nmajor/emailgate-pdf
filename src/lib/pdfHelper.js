import pdf from 'html-pdf';
import pdfjs from 'pdfjs-dist';
import BufferStream from './BufferStream';
import config from '../config';
import assert from 'assert';

import https from 'https';
import fs from 'fs';

export function getPdfPages(buffer, log) {
  return new Promise((resolve) => {
    log('status', 'Counting pdf pages.');

    pdfjs.getDocument(buffer).then((doc) => {
      const pageCount = doc.numPages;
      log('status', `Counted ${pageCount} pages.`);

      resolve(pageCount);
    });
  });
}

export function buildPdf(html, model, obj, options, log) {
  return new Promise((resolve) => {
    log('status', 'Building pdf.');

    return pdf.create(html, options).toBuffer((err, buffer) => {
      assert.equal(err, null);
      log('status', 'Finished building pdf.');

      getPdfPages(buffer, log)
			.then((pageCount) => {
        resolve({ // eslint-disable-line indent
          model,
          _id: obj._id,
          _compilation: obj._compilation,
          pageCount,
          buffer,
        });
			});
    });
  });
}

export function pdfFilename(pdfObj) {
  return `${pdfObj.model}-${pdfObj._id}.pdf`;
}

export function pdfPath(pdfObj) {
  const compilationId = pdfObj.model === 'compilation' ? pdfObj._id : pdfObj._compilation;
  const filename = pdfFilename(pdfObj);
  return `compilations/${compilationId}/${filename}`;
}

export function uploadPdfObject(pdfObj, log) {
  return new Promise((resolve) => {
    log('status', 'Uploading pdf.');

    const filename = pdfFilename(pdfObj);
    const path = pdfPath(pdfObj);
    const fullPath = `${process.env.MANTA_APP_PUBLIC_PATH}/${path}`;

    const client = config.mantaClient;
    const pdfStream = new BufferStream(pdfObj.buffer);

    client.put(fullPath, pdfStream, { mkdirs: true }, (err) => {
      assert.equal(err, null);
      log('status', 'Finished uploading pdf.');

      const updatedAt = Date.now();

      client.info(fullPath, (err, results) => { // eslint-disable-line no-shadow
        assert.equal(err, null);
        log('status', 'Found pdf file info');

        const fileUrl = `${process.env.MANTA_APP_URL}/${fullPath}`;

        resolve({
          model: pdfObj.model,
          _id: pdfObj._id,
          filename,
          pageCount: pdfObj.pageCount,
          url: fileUrl,
          updatedAt,
          path: fullPath,
          extension: results.extension,
          type: results.type,
          etag: results.etag,
          md5: results.md5,
          size: results.size,
        });
      });
    });
  });
}

export function downloadPdf(pdfObj, log) {
  return new Promise((resolve, reject) => {
    assert.ok(pdfObj && pdfObj.url);
    log('status', 'Downloading pdf file.');

    const dir = '/tmp/compilation';

    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir);
    }

    const localPath = `${dir}/${pdfObj.filename}`;
    const file = fs.createWriteStream(localPath);
    https.get(pdfObj.url, (stream) => {
      stream.pipe(file);

      stream.on('end', () => {
        resolve(localPath);
      });

      stream.on('error', (err) => {
        reject(err);
      });
    });
  });
}
