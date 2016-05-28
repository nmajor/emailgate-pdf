'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});

exports.default = function (cb) {
  if (db) {
    cb(db);return;
  }

  _mongodb.MongoClient.connect(_config2.default.mongoUrl, function (err, conn) {
    _assert2.default.equal(err, null);

    db = conn;
    cb(db);
  });
};

var _assert = require('assert');

var _assert2 = _interopRequireDefault(_assert);

var _mongodb = require('mongodb');

var _config = require('./config');

var _config2 = _interopRequireDefault(_config);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

if (process.env.NODE_ENV !== 'production') {
  require('dotenv').config({ silent: true });
}


var db = null;