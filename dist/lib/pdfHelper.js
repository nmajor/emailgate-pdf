'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.getPdfPages = getPdfPages;
exports.buildPdf = buildPdf;
exports.uploadPdfObject = uploadPdfObject;

var _htmlPdf = require('html-pdf');

var _htmlPdf2 = _interopRequireDefault(_htmlPdf);

var _pdfjsDist = require('pdfjs-dist');

var _pdfjsDist2 = _interopRequireDefault(_pdfjsDist);

var _logHelper = require('./logHelper');

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function getPdfPages(buffer) {
  return new Promise(function (resolve) {
    _pdfjsDist2.default.getDocument(buffer).then(function (doc) {
      resolve(doc.numPages);
    });
  });
}

function buildPdf(html, model, obj) {
  return new Promise(function (resolve) {
    return _htmlPdf2.default.create(html, emailOptions).toBuffer(function (err, buffer) {
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

function uploadPdfObject(pdfObj) {
  return new Promise(function (resolve) {
    var path = 'compilations/' + pdfObj._compilation + '/' + pdfObj.model + '-' + pdfObj._id + '.pdf';
    var fullPath = process.env.MANTA_APP_PUBLIC_PATH + '/' + path;

    var pdfStream = new BufferStream(pdfObj.buffer);

    client.put(fullPath, pdfStream, { mkdirs: true }, function (err) {
      if (err) {
        (0, _logHelper.log)('error', 'An error happened while uploading the pdf.', err.message);return;
      }

      client.info(fullPath, function (err, results) {
        // eslint-disable-line no-shadow
        if (err) {
          (0, _logHelper.log)('error', 'An error happened while getting the pdf file info.', err.message);return;
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