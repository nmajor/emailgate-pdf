require('babel-polyfill');
require('dotenv').config({ silent: true });

import { MongoClient } from 'mongodb';
import assert from 'assert';
import pdf from 'html-pdf';
import pdfjs from 'pdfjs-dist';
import manta from 'manta';

import fs from 'fs';
import _ from 'lodash';

import BufferStream from './BufferStream';

console.log('working ');

const tmpDir = './tmp';
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

console.log('manta ready: %s', client.toString());

function ensureTmpDir() {
  if (!fs.existsSync(tmpDir)) {
    fs.mkdirSync(tmpDir);
  }
}

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
      assert.equal(err, null);

      return getPdfPages(buffer)
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
      assert.equal(err, null);

      resolve(docs);
    });
  });
}

function uploadPdfObject(pdfObj) {
  console.log('blah 1');
  console.log(pdfObj);
  return new Promise((resolve) => {
    const path = `compilations/${pdfObj._compilation}/${pdfObj.model}-${pdfObj._id}.pdf`;
    const fullPath = `${process.env.MANTA_APP_PUBLIC_PATH}/${path}`;

    console.log('blah 2');
    console.log(fullPath);

    const pdfStream = new BufferStream(pdfObj.buffer);

    client.put(fullPath, pdfStream, { mkdirs: true }, (err) => {
      if (err) { console.log(`Error when uploading file: ${err.message}`); return; }

      console.log('blah 3');
      client.info(fullPath, (err, results) => { // eslint-disable-line no-shadow
        assert.equal(err, null);
        console.log('blah 4');

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
  assert.equal(null, err);

  getEmails(db)
  .then((emails) => {
    return Promise.all(emails.map((email) => { return generateEmailPdf(email); }));
  })
  .then((pdfObjects) => {
    ensureTmpDir();

    _.forEach(pdfObjects, (pdfObj) => {
      // fs.writeFile(`./tmp/${pdfObj._id}.pdf`, pdfObj.buffer);

      uploadPdfObject(pdfObj)
      .then((result) => { console.log(result); });
    });

    db.close();
  })
  .catch((err) => { // eslint-disable-line no-shadow
    console.log(`An error happened ${err}`);

    db.close();
  });
});
