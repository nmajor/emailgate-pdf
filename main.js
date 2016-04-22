'use strict';

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { 'default': obj }; }

var _mongodb = require('mongodb');

var _htmlPdf = require('html-pdf');

var _htmlPdf2 = _interopRequireDefault(_htmlPdf);

var _pdfjsDist = require('pdfjs-dist');

var _pdfjsDist2 = _interopRequireDefault(_pdfjsDist);

var _manta = require('manta');

var _manta2 = _interopRequireDefault(_manta);

// import fs from 'fs';

var _lodash = require('lodash');

var _lodash2 = _interopRequireDefault(_lodash);

var _BufferStream = require('./BufferStream');

var _BufferStream2 = _interopRequireDefault(_BufferStream);

require('babel-polyfill');
require('dotenv').config({ silent: true });

function log(type, message, payload) {
  var logBuffer = new Buffer(JSON.stringify({
    type: type,
    message: message,
    payload: payload
  }));

  process.stdout.write(logBuffer);
  if (type === 'error') {
    process.exit();
  }
}

log('status', 'Container started and running.');

// const tmpDir = './tmp';
var mongoUrl = process.env.MONGO_URL;
var emailQuery = { _compilation: process.env.COMPILATION_ID };
var emailOptions = {
  height: '10.5in',
  width: '8in',
  border: {
    top: '0.6in',
    right: '0.6in',
    bottom: '1.2in',
    left: '0.6in'
  },
  timeout: 120000
};
var client = _manta2['default'].createClient({
  sign: _manta2['default'].privateKeySigner({
    key: process.env.MANTA_APP_KEY.replace(/\\n/g, '\n'),
    keyId: process.env.MANTA_APP_KEY_ID,
    user: process.env.MANTA_APP_USER
  }),
  user: process.env.MANTA_APP_USER,
  url: process.env.MANTA_APP_URL,
  connectTimeout: 25000
});

// function ensureTmpDir() {
//   if (!fs.existsSync(tmpDir)) {
//     fs.mkdirSync(tmpDir);
//   }
// }

function getPdfPages(buffer) {
  return new Promise(function (resolve) {
    _pdfjsDist2['default'].getDocument(buffer).then(function (doc) {
      resolve(doc.numPages);
    });
  });
}

function generateEmailPdf(email) {
  return new Promise(function (resolve) {
    var html = email.template.replace('[[BODY]]', email.body);

    return _htmlPdf2['default'].create(html, emailOptions).toBuffer(function (err, buffer) {
      if (err) {
        log('error', 'An error happened while generating the email PDF.', err.message);return;
      }

      getPdfPages(buffer).then(function (pageCount) {
        resolve({ // eslint-disable-line indent
          model: 'email',
          _id: email._id,
          _compilation: email._compilation,
          pageCount: pageCount,
          buffer: buffer
        });
      });
    });
  });
}

function getEmails(db) {
  return new Promise(function (resolve) {
    var collection = db.collection('emails');
    collection.find(emailQuery).toArray(function (err, docs) {
      // eslint-disable-line no-shadow
      if (err) {
        log('error', 'An error happened while getting emails.', err.message);return;
      }

      resolve(docs);
    });
  });
}

function uploadPdfObject(pdfObj) {
  return new Promise(function (resolve) {
    var path = 'compilations/' + pdfObj._compilation + '/' + pdfObj.model + '-' + pdfObj._id + '.pdf';
    var fullPath = process.env.MANTA_APP_PUBLIC_PATH + '/' + path;

    var pdfStream = new _BufferStream2['default'](pdfObj.buffer);

    client.put(fullPath, pdfStream, { mkdirs: true }, function (err) {
      if (err) {
        log('error', 'An error happened while uploading the pdf.', err.message);return;
      }

      client.info(fullPath, function (err, results) {
        // eslint-disable-line no-shadow
        if (err) {
          log('error', 'An error happened while getting the pdf file info.', err.message);return;
        }

        var updatedAt = Date.now();
        var fileUrl = process.env.MANTA_APP_URL + '/' + fullPath;

        resolve({
          model: pdfObj.model,
          _id: pdfObj._id,
          pdfPageCount: pdfObj.pageCount,
          url: fileUrl,
          updatedAt: updatedAt,
          path: fullPath,
          extension: results.extension,
          type: results.type,
          etag: results.etag,
          md5: results.md5,
          size: results.size
        });
      });
    });
  });
}

_mongodb.MongoClient.connect(mongoUrl, function (err, db) {
  if (err) {
    log('error', 'An error happened while connecting to the database', err.message);return;
  }
  log('status', 'Connected to database.');
  var count = 1;

  getEmails(db).then(function (emails) {
    var emailLength = emails.length;
    log('status', 'Found ' + emailLength + ' compilation emails.');

    var p = Promise.resolve();

    _lodash2['default'].forEach(emails, function (email) {
      p = p.then(function () {
        return generateEmailPdf(email).then(function (pdfObj) {
          // fs.writeFile(`./tmp/${pdfObj._id}.pdf`, pdfObj.buffer);
          return uploadPdfObject(pdfObj);
        }).then(function (result) {
          log('email-pdf', 'Added email ' + result._id + ' ' + count + '/' + emailLength, result);
          count++;
        });
      });
    });

    return p;
  }).then(function () {
    log('status', 'Finished generating and uploading email PDF files.');
    log('status', 'Closing database connection.');
    db.close();
  })['catch'](function (err) {
    // eslint-disable-line no-shadow
    if (err) {
      log('error', 'An error happened', err.message);return;
    }
    db.close();
  });
});