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

var _logHelper = require('./logHelper');

var _BufferStream = require('./BufferStream');

var _BufferStream2 = _interopRequireDefault(_BufferStream);

var _https = require('https');

var _https2 = _interopRequireDefault(_https);

var _fs = require('fs');

var _fs2 = _interopRequireDefault(_fs);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function getPdfPages(buffer) {
  return new Promise(function (resolve) {
    _pdfjsDist2.default.getDocument(buffer).then(function (doc) {
      resolve(doc.numPages);
    });
  });
}

function buildPdf(html, model, obj, options) {
  return new Promise(function (resolve) {
    return _htmlPdf2.default.create(html, options).toBuffer(function (err, buffer) {
      if (err) {
        (0, _logHelper.log)('error', 'An error happened while generating a ' + model + ' PDF.', err.message);return;
      }

      getPdfPages(buffer).then(function (pageCount) {
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

function uploadPdfObject(pdfObj, client) {
  return new Promise(function (resolve) {
    var filename = pdfObj.model + '-' + pdfObj._id + '.pdf';
    var path = 'compilations/' + pdfObj._compilation + '/' + filename;
    var fullPath = process.env.MANTA_APP_PUBLIC_PATH + '/' + path;

    var pdfStream = new _BufferStream2.default(pdfObj.buffer);

    client.put(fullPath, pdfStream, { mkdirs: true }, function (err) {
      if (err) {
        (0, _logHelper.log)('error', 'An error happened while uploading the pdf.', err.message);return;
      }

      var updatedAt = Date.now();

      client.info(fullPath, function (err, results) {
        // eslint-disable-line no-shadow
        if (err) {
          (0, _logHelper.log)('error', 'An error happened while getting the pdf file info.', err.message);return;
        }

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

function downloadPdf(pdfObj) {
  return new Promise(function (resolve, reject) {
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
        (0, _logHelper.log)('error', 'An error happened while downloading the pdf.', err.message);
        reject();
      });
    });
  });
}