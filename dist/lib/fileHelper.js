'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.deleteFile = deleteFile;
exports.deleteFiles = deleteFiles;

var _fs = require('fs');

var _fs2 = _interopRequireDefault(_fs);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function deleteFile(filePath) {
  return new Promise(function (resolve) {
    _fs2.default.unlink(filePath, function () {
      resolve();
    });
  });
}

function deleteFiles(filePaths) {
  return Promise.all(filePaths.map(function (filePath) {
    return deleteFile(filePath);
  }));
}