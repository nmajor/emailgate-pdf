require('babel-register');
require('babel-polyfill');
require('dotenv').config({ silent: true });

import { MongoClient } from 'mongodb';
import pdf from 'html-pdf';
import pdfjs from 'pdfjs-dist';
import manta from 'manta';

// import fs from 'fs';
import _ from 'lodash';

import BufferStream from './lib/BufferStream';

function log(type, message, payload) {
  const logBuffer = new Buffer(JSON.stringify({
    type,
    message,
    payload,
  }));

  process.stdout.write(logBuffer);
  if (type === 'error') {
    process.exit();
  }
}

log('status', 'Container started and running.');

// const tmpDir = './tmp';
const mongoUrl = process.env.MONGO_URL;
const emailQuery = { _compilation: process.env.COMPILATION_ID };
const emailOptions = {
  height: '10.5in',
  width: '8in',
  border: {
    top: '0.6in',
    right: '0.6in',
    bottom: '1.2in',
    left: '0.6in',
  },
  timeout: 120000,
};
const client = manta.createClient({
  sign: manta.privateKeySigner({
    key: process.env.MANTA_APP_KEY.replace(/\\n/g, '\n'),
    keyId: process.env.MANTA_APP_KEY_ID,
    user: process.env.MANTA_APP_USER,
  }),
  user: process.env.MANTA_APP_USER,
  url: process.env.MANTA_APP_URL,
  connectTimeout: 25000,
});

// function ensureTmpDir() {
//   if (!fs.existsSync(tmpDir)) {
//     fs.mkdirSync(tmpDir);
//   }
// }

function getPdfPages(buffer) {
  return new Promise((resolve) => {
    pdfjs.getDocument(buffer).then((doc) => {
      resolve(doc.numPages);
    });
  });
}

function generateEmailPdf(email) {
  return new Promise((resolve) => {
    const html = email.template.replace('[[BODY]]', email.body);

    return pdf.create(html, emailOptions).toBuffer((err, buffer) => {
      if (err) { log('error', 'An error happened while generating the email PDF.', err.message); return; }

      getPdfPages(buffer)
			.then((pageCount) => {
        resolve({ // eslint-disable-line indent
          model: 'email',
          _id: email._id,
          _compilation: email._compilation,
          pageCount,
          buffer,
        });
			});
    });
  });
}

function getEmails(db) {
  return new Promise((resolve) => {
    const collection = db.collection('emails');
    collection.find(emailQuery)
    .toArray((err, docs) => { // eslint-disable-line no-shadow
      if (err) { log('error', 'An error happened while getting emails.', err.message); return; }

      resolve(docs);
    });
  });
}

function uploadPdfObject(pdfObj) {
  return new Promise((resolve) => {
    const path = `compilations/${pdfObj._compilation}/${pdfObj.model}-${pdfObj._id}.pdf`;
    const fullPath = `${process.env.MANTA_APP_PUBLIC_PATH}/${path}`;

    const pdfStream = new BufferStream(pdfObj.buffer);

    client.put(fullPath, pdfStream, { mkdirs: true }, (err) => {
      if (err) { log('error', 'An error happened while uploading the pdf.', err.message); return; }

      client.info(fullPath, (err, results) => { // eslint-disable-line no-shadow
        if (err) { log('error', 'An error happened while getting the pdf file info.', err.message); return; }

        const updatedAt = Date.now();
        const fileUrl = `${process.env.MANTA_APP_URL}/${fullPath}`;

        resolve({
          model: pdfObj.model,
          _id: pdfObj._id,
          pdfPageCount: pdfObj.pageCount,
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

MongoClient.connect(mongoUrl, (err, db) => {
  if (err) { log('error', 'An error happened while connecting to the database', err.message); return; }
  log('status', 'Connected to database.');
  let count = 1;

  getEmails(db)
  .then((emails) => {
    const emailLength = emails.length;
    log('status', `Found ${emailLength} compilation emails.`);

    let p = Promise.resolve();

    _.forEach(emails, (email) => {
      p = p.then(() => {
        return generateEmailPdf(email)
        .then((pdfObj) => {
          // fs.writeFile(`./tmp/${pdfObj._id}.pdf`, pdfObj.buffer);
          return uploadPdfObject(pdfObj);
        })
        .then((result) => {
          log('email-pdf', `Added email ${result._id} ${count}/${emailLength}`, result);
          count++;
        });
      });
    });

    return p;
  })
  .then(() => {
    log('status', 'Finished generating and uploading email PDF files.');
    log('status', 'Closing database connection.');
    db.close();
  })
  .catch((err) => { // eslint-disable-line no-shadow
    if (err) { log('error', 'An error happened', err.message); return; }
    db.close();
  });
});
