'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.getPdfPages = getPdfPages;
exports.buildPdf = buildPdf;
exports.uploadPdfObject = uploadPdfObject;
exports.downloadPdf = downloadPdf;

var _htmlPdf = require('html-pdf');

var _htmlPdf2 = _interopRequireDefault(_htmlPdf);

var _pdfjsDist = require('pdfjs-dist');

var _pdfjsDist2 = _interopRequireDefault(_pdfjsDist);

var _BufferStream = require('./BufferStream');

var _BufferStream2 = _interopRequireDefault(_BufferStream);

var _config = require('../config');

var _config2 = _interopRequireDefault(_config);

var _https = require('https');

var _https2 = _interopRequireDefault(_https);

var _fs = require('fs');

var _fs2 = _interopRequireDefault(_fs);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function getPdfPages(buffer, log) {
  return new Promise(function (resolve) {
    log('status', 'Counting pdf pages.');

    _pdfjsDist2.default.getDocument(buffer).then(function (doc) {
      var pageCount = doc.numPages;
      log('status', 'Counted ' + pageCount + ' pages.');

      resolve(pageCount);
    });
  });
}

function buildPdf(html, model, obj, options, log) {
  return new Promise(function (resolve) {
    log('status', 'Building pdf.');

    return _htmlPdf2.default.create(html, options).toBuffer(function (err, buffer) {
      if (err) {
        log('error', 'An error happened while generating a ' + model + ' PDF.', err.message);return;
      }
      log('status', 'Finished building pdf.');

      getPdfPages(buffer, log).then(function (pageCount) {
        resolve({ // eslint-disable-line indent
          model: model,
          _id: obj._id,
          _compilation: obj._compilation,
          pageCount: pageCount,
          buffer: buffer
        });
      });
    });
  });
}

function uploadPdfObject(pdfObj, log) {
  return new Promise(function (resolve) {
    log('status', 'Uploading pdf.');

    var client = _config2.default.mantaClient;
    var compilationId = pdfObj.model === 'compilation' ? pdfObj._id : pdfObj._compilation;
    var filename = pdfObj.model + '-' + pdfObj._id + '.pdf';
    var path = 'compilations/' + compilationId + '/' + filename;
    var fullPath = process.env.MANTA_APP_PUBLIC_PATH + '/' + path;

    var pdfStream = new _BufferStream2.default(pdfObj.buffer);

    client.put(fullPath, pdfStream, { mkdirs: true }, function (err) {
      if (err) {
        log('error', 'An error happened while uploading the pdf.', err.message);return;
      }
      log('status', 'Finished uploading pdf.');

      var updatedAt = Date.now();

      client.info(fullPath, function (err, results) {
        // eslint-disable-line no-shadow
        if (err) {
          log('error', 'An error happened while getting the pdf file info.', err.message);return;
        }
        log('status', 'Found pdf file info');

        var fileUrl = process.env.MANTA_APP_URL + '/' + fullPath;

        resolve({
          model: pdfObj.model,
          _id: pdfObj._id,
          filename: filename,
          pageCount: pdfObj.pageCount,
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

function downloadPdf(pdfObj, log) {
  return new Promise(function (resolve, reject) {
    if (!pdfObj || !pdfObj.url) {
      log('error', 'Trying to download pdf but pdf object is not complete.');
      reject();
    }

    var dir = '/tmp/compilation';

    if (!_fs2.default.existsSync(dir)) {
      _fs2.default.mkdirSync(dir);
    }

    var localPath = dir + '/' + pdfObj.filename;
    var file = _fs2.default.createWriteStream(localPath);
    _https2.default.get(pdfObj.url, function (stream) {
      stream.pipe(file);

      stream.on('end', function () {
        resolve(localPath);
      });

      stream.on('error', function (err) {
        log('error', 'An error happened while downloading the pdf.', err.message);
        reject();
      });
    });
  });
}