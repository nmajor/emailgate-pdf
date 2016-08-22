'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.getPdfPages = getPdfPages;
exports.buildPdf = buildPdf;
exports.pdfFilename = pdfFilename;
exports.pdfPath = pdfPath;
exports.savePdfObject = savePdfObject;
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

var _crypto = require('crypto');

var _crypto2 = _interopRequireDefault(_crypto);

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
    return _htmlPdf2.default.create(html, options).toBuffer(function (err, buffer) {
      // eslint-disable-line consistent-return
      if (err) {
        return reject(err);
      }

      getPdfPages(buffer).then(function (pageCount) {
        resolve({ // eslint-disable-line indent
          model: model,
          _id: obj._id,
          _compilation: obj._compilation,
          modelVersion: obj.updatedAt,
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

function savePdfObject(pdfObj) {
  return new Promise(function (resolve, reject) {
    var dir = '/tmp/compilation';
    pdfObj.filename = pdfObj.filename || pdfFilename(pdfObj); // eslint-disable-line no-param-reassign

    if (!_fs2.default.existsSync(dir)) {
      _fs2.default.mkdirSync(dir);
    }

    var localPath = dir + '/' + pdfObj.filename;
    _fs2.default.writeFile(localPath, pdfObj.buffer, function (err) {
      if (err) {
        return reject(err);
      }

      return resolve(localPath);
    });
  });
}

function uploadPdfObject(pdfObj) {
  return new Promise(function (resolve, reject) {
    var filename = pdfFilename(pdfObj);
    var path = pdfPath(pdfObj);
    var fullPath = process.env.MANTA_APP_PUBLIC_PATH + '/' + path;

    var client = _config2.default.mantaClient;
    var pdfStream = new _BufferStream2.default(pdfObj.buffer);
    var options = {
      mkdirs: true,
      headers: {
        'Access-Control-Allow-Headers': 'Range',
        'Access-Control-Expose-Headers': 'Accept-Ranges, Content-Encoding, Content-Length, Content-Range',
        'Access-Control-Allow-Origin': '*'
      }
    };

    client.put(fullPath, pdfStream, options, function (err) {
      // eslint-disable-line consistent-return
      if (err) {
        return reject(err);
      }

      var updatedAt = new Date();

      client.info(fullPath, function (err, results) {
        // eslint-disable-line
        if (err) {
          return reject(err);
        }

        var fileUrl = process.env.MANTA_APP_URL + '/' + fullPath;

        resolve({
          model: pdfObj.model,
          _id: pdfObj._id,
          modelVersion: pdfObj.modelVersion,
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
    // eslint-disable-line consistent-return
    if (!pdfObj || !pdfObj.url) {
      return reject(new Error('Missing pdfObj or pdfObj.url'));
    }

    var dir = '/tmp/compilation';

    if (!_fs2.default.existsSync(dir)) {
      _fs2.default.mkdirSync(dir);
    }

    var localPath = dir + '/' + pdfObj.filename;

    // crypto.createHash('md5').update(data).digest("hex");

    if (_fs2.default.existsSync(localPath)) {
      var fileMd5 = _crypto2.default.createHash('md5');
      fileMd5.write(_fs2.default.readFileSync(localPath));
      fileMd5.end();
      if (fileMd5.read().toString('base64') === pdfObj.md5) {
        return resolve(localPath);
      }
    }

    // const md5 = crypto.createHash('md5');
    var file = _fs2.default.createWriteStream(localPath);
    _https2.default.get(pdfObj.url, function (stream) {
      stream.pipe(file);
      // stream.pipe(md5);

      stream.on('end', function () {
        // md5.end();
        resolve(localPath);
      });

      stream.on('error', function (err) {
        reject(err);
      });
    });
  });
}