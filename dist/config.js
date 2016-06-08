'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});

var _manta = require('manta');

var _manta2 = _interopRequireDefault(_manta);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

if (process.env.NODE_ENV !== 'production') {
  require('dotenv').config({ silent: true });
}


var config = {
  mongoUrl: process.env.MONGO_URL,
  emailOptions: {
    height: '10.5in',
    width: '8in',
    border: {
      top: '0.6in',
      right: '0.6in',
      bottom: '0.6in',
      left: '0.6in'
    },
    timeout: 120000
  },
  pageOptions: {
    height: '10.5in',
    width: '8in',
    border: {
      top: '0.6in',
      right: '0.6in',
      bottom: '0.6in',
      left: '0.6in'
    },
    timeout: 120000
  },
  mantaClient: _manta2.default.createClient({
    sign: _manta2.default.privateKeySigner({
      key: process.env.MANTA_APP_KEY.replace(/\\n/g, '\n'),
      keyId: process.env.MANTA_APP_KEY_ID,
      user: process.env.MANTA_APP_USER
    }),
    user: process.env.MANTA_APP_USER,
    url: process.env.MANTA_APP_URL,
    connectTimeout: 25000
  })
};

exports.default = config;