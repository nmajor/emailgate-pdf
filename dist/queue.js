'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});

var _kue = require('kue');

var _kue2 = _interopRequireDefault(_kue);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

if (process.env.NODE_ENV !== 'production') {
  require('dotenv').config({ silent: true });
}

var queue = _kue2.default.createQueue({
  redis: process.env.REDIS_URL
});

exports.default = queue;