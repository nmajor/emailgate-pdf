'use strict';

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { 'default': obj }; }

var _assert = require('assert');

var _assert2 = _interopRequireDefault(_assert);

var _dockerode = require('dockerode');

var _dockerode2 = _interopRequireDefault(_dockerode);

require('dotenv').config({ silent: true });

var docker = new _dockerode2['default']();
// const docker = new Docker({
//   protocol: 'https',
//   host: '192.168.99.100',
//   port: 2376,
//   ca: '/Users/nmajor/.docker/machine/machines/default/ca.pem',
//   cert: '/Users/nmajor/.docker/machine/machines/default/cert.pem',
//   key: '/Users/nmajor/.docker/machine/machines/default/key.pem',
// });

var Env = ['MONGO_URL=' + process.env.MONGO_URL, 'COMPILATION_ID=' + process.env.COMPILATION_ID, 'MANTA_APP_KEY=' + process.env.MANTA_APP_KEY, 'MANTA_APP_KEY_ID=' + process.env.MANTA_APP_KEY_ID, 'MANTA_APP_USER=' + process.env.MANTA_APP_USER, 'MANTA_APP_USER_ID=' + process.env.MANTA_APP_USER_ID, 'MANTA_APP_URL=' + process.env.MANTA_APP_URL, 'MANTA_APP_PUBLIC_PATH=' + process.env.MANTA_APP_PUBLIC_PATH];

docker.createContainer({
  Image: 'emailgate-pdf',
  name: 'emailgate-pdf-' + Date.now(),
  Env: Env
}, function (err, container) {
  _assert2['default'].equal(err, null);

  container.start(function (err) {
    // eslint-disable-line no-shadow
    _assert2['default'].equal(err, null);

    container.attach({ stream: true, stdout: true }, function (err, stream) {
      // eslint-disable-line no-shadow
      _assert2['default'].equal(err, null);

      var streamCleanser = require('docker-stream-cleanser')();

      var cleanStream = stream.pipe(streamCleanser);
      cleanStream.on('data', function (chunk) {
        var logString = chunk.toString();
        var log = JSON.parse(logString);
        console.log(log.message);
      });

      cleanStream.on('error', function (chunk) {
        console.log('An error happened in the stream');
        console.log(chunk);
      });

      cleanStream.on('end', function () {
        container.stop(function () {
          container.remove(function () {
            console.log('The End');
          });
        });
      });
    });
  });
});