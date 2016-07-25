import pdf from 'html-pdf';
import pdfjs from 'pdfjs-dist';
import BufferStream from './BufferStream';
import config from '../config';

import https from 'https';
import fs from 'fs';
import crypto from 'crypto';

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
    return pdf.create(html, options).toBuffer((err, buffer) => { // eslint-disable-line consistent-return
      if (err) { return reject(err); }

      getPdfPages(buffer)
			.then((pageCount) => {
        resolve({ // eslint-disable-line indent
          model,
          _id: obj._id,
          _compilation: obj._compilation,
          modelVersion: obj.updatedAt,
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

export function savePdfObject(pdfObj) {
  return new Promise((resolve, reject) => {
    const dir = '/tmp/compilation';
    pdfObj.filename = pdfObj.filename || pdfFilename(pdfObj); // eslint-disable-line no-param-reassign

    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir);
    }

    const localPath = `${dir}/${pdfObj.filename}`;
    fs.writeFile(localPath, pdfObj.buffer, (err) => {
      if (err) { return reject(err); }

      return resolve(localPath);
    });
  });
}

export function uploadPdfObject(pdfObj) {
  return new Promise((resolve, reject) => {
    const filename = pdfFilename(pdfObj);
    const path = pdfPath(pdfObj);
    const fullPath = `${process.env.MANTA_APP_PUBLIC_PATH}/${path}`;

    const client = config.mantaClient;
    const pdfStream = new BufferStream(pdfObj.buffer);
    const options = {
      mkdirs: true,
      headers: {
        'Access-Control-Allow-Headers': 'Range',
        'Access-Control-Expose-Headers': 'Accept-Ranges, Content-Encoding, Content-Length, Content-Range',
        'Access-Control-Allow-Origin': '*',
      },
    };

    client.put(fullPath, pdfStream, options, (err) => { // eslint-disable-line consistent-return
      if (err) { return reject(err); }

      const updatedAt = new Date();

      client.info(fullPath, (err, results) => { // eslint-disable-line
        if (err) { return reject(err); }

        const fileUrl = `${process.env.MANTA_APP_URL}/${fullPath}`;

        resolve({
          model: pdfObj.model,
          _id: pdfObj._id,
          modelVersion: pdfObj.modelVersion,
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

    // crypto.createHash('md5').update(data).digest("hex");

    if (fs.existsSync(localPath)) {
      const fileMd5 = crypto.createHash('md5');
      fileMd5.write(fs.readFileSync(localPath));
      fileMd5.end();
      if (fileMd5.read().toString('base64') === pdfObj.md5) {
        return resolve(localPath);
      }
    }

    // const md5 = crypto.createHash('md5');
    const file = fs.createWriteStream(localPath);
    https.get(pdfObj.url, (stream) => {
      stream.pipe(file);
      // stream.pipe(md5);

      stream.on('end', () => {
        // md5.end();
        resolve(localPath);
      });

      stream.on('error', (err) => {
        reject(err);
      });
    });
  });
}
