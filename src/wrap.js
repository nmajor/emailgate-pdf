require('dotenv').config({ silent: true });
import assert from 'assert';

import Docker from 'dockerode';
const docker = new Docker();
// const docker = new Docker({
//   protocol: 'https',
//   host: '192.168.99.100',
//   port: 2376,
//   ca: '/Users/nmajor/.docker/machine/machines/default/ca.pem',
//   cert: '/Users/nmajor/.docker/machine/machines/default/cert.pem',
//   key: '/Users/nmajor/.docker/machine/machines/default/key.pem',
// });

const Env = [
  `MONGO_URL=${process.env.MONGO_URL}`,
  `COMPILATION_ID=${process.env.COMPILATION_ID}`,
  `MANTA_APP_KEY=${process.env.MANTA_APP_KEY}`,
  `MANTA_APP_KEY_ID=${process.env.MANTA_APP_KEY_ID}`,
  `MANTA_APP_USER=${process.env.MANTA_APP_USER}`,
  `MANTA_APP_USER_ID=${process.env.MANTA_APP_USER_ID}`,
  `MANTA_APP_URL=${process.env.MANTA_APP_URL}`,
  `MANTA_APP_PUBLIC_PATH=${process.env.MANTA_APP_PUBLIC_PATH}`,
];

docker.createContainer({
  Image: 'emailgate-pdf',
  name: `emailgate-pdf-${Date.now()}`,
  Env,
}, (err, container) => {
  assert.equal(err, null);

  container.start((err) => { // eslint-disable-line no-shadow
    assert.equal(err, null);

    container.attach({ stream: true, stdout: true }, (err, stream) => { // eslint-disable-line no-shadow
      assert.equal(err, null);

      const streamCleanser = require('docker-stream-cleanser')();

      const cleanStream = stream.pipe(streamCleanser);
      cleanStream.on('data', (chunk) => {
        const logString = chunk.toString();
        const log = JSON.parse(logString);
        console.log(log.message);
      });

      cleanStream.on('error', (chunk) => {
        console.log('An error happened in the stream');
        console.log(chunk);
      });

      cleanStream.on('end', () => {
        container.stop(() => {
          container.remove(() => {
            console.log('The End');
          });
        });
      });
    });
  });
});
