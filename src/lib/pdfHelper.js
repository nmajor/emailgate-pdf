import pdf from 'html-pdf';
import pdfjs from 'pdfjs-dist';
import BufferStream from './BufferStream';
import config from '../config';

import https from 'https';
import fs from 'fs';

export function getPdfPages(buffer) {
  return new Promise((resolve) => {
    pdfjs.getDocument(buffer).then((doc) => {
      const pageCount = doc.numPages;

      resolve(pageCount);
    });
  });
}

export function buildPdf(html, model, obj, options) {
  return new Promise((resolve, reject) => {
    console.log('blah html');
    console.log(html);
    return pdf.create(null, options).toBuffer((err, buffer) => { // eslint-disable-line consistent-return
      if (err) { return reject(err); }

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

export function pdfFilename(pdfObj) {
  return `${pdfObj.model}-${pdfObj._id}.pdf`;
}

export function pdfPath(pdfObj) {
  const compilationId = pdfObj.model === 'compilation' ? pdfObj._id : pdfObj._compilation;
  const filename = pdfFilename(pdfObj);
  return `compilations/${compilationId}/${filename}`;
}

export function uploadPdfObject(pdfObj) {
  return new Promise((resolve, reject) => {
    const filename = pdfFilename(pdfObj);
    const path = pdfPath(pdfObj);
    const fullPath = `${process.env.MANTA_APP_PUBLIC_PATH}/${path}`;

    const client = config.mantaClient;
    const pdfStream = new BufferStream(pdfObj.buffer);

    client.put(fullPath, pdfStream, { mkdirs: true }, (err) => { // eslint-disable-line consistent-return
      if (err) { return reject(err); }

      const updatedAt = Date.now();

      client.info(fullPath, (err, results) => { // eslint-disable-line
        if (err) { return reject(err); }

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
  return new Promise((resolve, reject) => { // eslint-disable-line consistent-return
    if (!pdfObj || !pdfObj.url) { return reject(new Error('Missing pdfObj or pdfObj.url')); }

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
