import pdf from 'html-pdf';
import pdfjs from 'pdfjs-dist';
import { log } from './logHelper';
import BufferStream from './BufferStream';

import https from 'https';
import fs from 'fs';

export function getPdfPages(buffer) {
  return new Promise((resolve) => {
    pdfjs.getDocument(buffer).then((doc) => {
      resolve(doc.numPages);
    });
  });
}

export function buildPdf(html, model, obj, options) {
  return new Promise((resolve) => {
    return pdf.create(html, options).toBuffer((err, buffer) => {
      if (err) { log('error', `An error happened while generating a ${model} PDF.`, err.message); return; }

      getPdfPages(buffer)
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

export function uploadPdfObject(pdfObj, client) {
  return new Promise((resolve) => {
    const filename = `${pdfObj.model}-${pdfObj._id}.pdf`;
    const path = `compilations/${pdfObj._compilation}/${filename}`;
    const fullPath = `${process.env.MANTA_APP_PUBLIC_PATH}/${path}`;

    const pdfStream = new BufferStream(pdfObj.buffer);

    client.put(fullPath, pdfStream, { mkdirs: true }, (err) => {
      if (err) { log('error', 'An error happened while uploading the pdf.', err.message); return; }

      const updatedAt = Date.now();

      client.info(fullPath, (err, results) => { // eslint-disable-line no-shadow
        if (err) { log('error', 'An error happened while getting the pdf file info.', err.message); return; }

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

export function downloadPdf(pdfObj) {
  return new Promise((resolve, reject) => {
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
        log('error', 'An error happened while downloading the pdf.', err.message);
        reject();
      });
    });
  });
}
