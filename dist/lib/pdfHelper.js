'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.getPdfPages = getPdfPages;
exports.buildPdf = buildPdf;
exports.pdfFilename = pdfFilename;
exports.pdfPath = pdfPath;
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

var _assert = require('assert');

var _assert2 = _interopRequireDefault(_assert);

var _https = require('https');

var _https2 = _interopRequireDefault(_https);

var _fs = require('fs');

var _fs2 = _interopRequireDefault(_fs);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function getPdfPages(buffer) {
  return new Promise(function (resolve) {
    _pdfjsDist2.default.getDocument(buffer).then(function (doc) {
      var pageCount = doc.numPages;

      resolve(pageCount);
    });
  });
}

function buildPdf(html, model, obj, options) {
  return new Promise(function (resolve, reject) {
    console.log('blah html');
    console.log(html);
    return _htmlPdf2.default.create(null, options).toBuffer(function (err, buffer) {
      if (err) {
        reject(err);
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

function pdfFilename(pdfObj) {
  return pdfObj.model + '-' + pdfObj._id + '.pdf';
}

function pdfPath(pdfObj) {
  var compilationId = pdfObj.model === 'compilation' ? pdfObj._id : pdfObj._compilation;
  var filename = pdfFilename(pdfObj);
  return 'compilations/' + compilationId + '/' + filename;
}

function uploadPdfObject(pdfObj) {
  return new Promise(function (resolve) {
    var filename = pdfFilename(pdfObj);
    var path = pdfPath(pdfObj);
    var fullPath = process.env.MANTA_APP_PUBLIC_PATH + '/' + path;

    var client = _config2.default.mantaClient;
    var pdfStream = new _BufferStream2.default(pdfObj.buffer);

    client.put(fullPath, pdfStream, { mkdirs: true }, function (err) {
      _assert2.default.equal(err, null);

      var updatedAt = Date.now();

      client.info(fullPath, function (err, results) {
        // eslint-disable-line no-shadow
        _assert2.default.equal(err, null);

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
    _assert2.default.ok(pdfObj && pdfObj.url);

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
        reject(err);
      });
    });
  });
}