'use strict';

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { 'default': obj }; }

var _mongodb = require('mongodb');

var _assert = require('assert');

var _assert2 = _interopRequireDefault(_assert);

var _htmlPdf = require('html-pdf');

var _htmlPdf2 = _interopRequireDefault(_htmlPdf);

var _pdfjsDist = require('pdfjs-dist');

var _pdfjsDist2 = _interopRequireDefault(_pdfjsDist);

var _manta = require('manta');

var _manta2 = _interopRequireDefault(_manta);

var _fs = require('fs');

var _fs2 = _interopRequireDefault(_fs);

var _lodash = require('lodash');

var _lodash2 = _interopRequireDefault(_lodash);

var _BufferStream = require('./BufferStream');

var _BufferStream2 = _interopRequireDefault(_BufferStream);

require('babel-polyfill');
require('dotenv').config({ silent: true });

console.log('working ');

var tmpDir = './tmp';
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
  }
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

console.log('manta ready: %s', client.toString());

function ensureTmpDir() {
  if (!_fs2['default'].existsSync(tmpDir)) {
    _fs2['default'].mkdirSync(tmpDir);
  }
}

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
      _assert2['default'].equal(err, null);

      return getPdfPages(buffer).then(function (pageCount) {
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
      _assert2['default'].equal(err, null);

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
      _assert2['default'].equal(err, null);

      client.info(fullPath, function (err, results) {
        // eslint-disable-line no-shadow
        _assert2['default'].equal(err, null);

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
  _assert2['default'].equal(null, err);
  var count = 1;

  getEmails(db).then(function (emails) {
    console.log('blah emails ' + emails.length);

    var p = Promise.resolve();

    _lodash2['default'].forEach(emails, function (email) {
      p = p.then(function () {
        return generateEmailPdf(email).then(function (pdfObj) {
          return uploadPdfObject(pdfObj);
        }).then(function (result) {
          console.log('Uploaded email ' + count);
          console.log(result);
          count++;
        });
      });
    });
  })
  // .then((pdfObjects) => {
  //   ensureTmpDir();
  //
  //   _.forEach(pdfObjects, (pdfObj) => {
  //     // fs.writeFile(`./tmp/${pdfObj._id}.pdf`, pdfObj.buffer);
  //
  //     uploadPdfObject(pdfObj)
  //     .then((result) => {
  //       console.log(`Email count ${count}`);
  //       console.log(result);
  //       count ++;
  //     });
  //   });
  //
  //   db.close();
  // })
  ['catch'](function (err) {
    // eslint-disable-line no-shadow
    _assert2['default'].equal(err, null);
    db.close();
  });
});