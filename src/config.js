if (process.env.NODE_ENV !== 'production') { require('dotenv').config({ silent: true }); }
import manta from 'manta';

const config = {
  mongoUrl: process.env.MONGO_URL,
  emailOptions: {
    height: '10.5in',
    width: '8in',
    timeout: 120000,
  },
  pageOptions: {
    height: '10.5in',
    width: '8in',
    timeout: 120000,
  },
  mantaClient: manta.createClient({
    sign: manta.privateKeySigner({
      key: process.env.MANTA_APP_KEY.replace(/\\n/g, '\n'),
      keyId: process.env.MANTA_APP_KEY_ID,
      user: process.env.MANTA_APP_USER,
    }),
    user: process.env.MANTA_APP_USER,
    url: process.env.MANTA_APP_URL,
    connectTimeout: 25000,
  }),
};

export default config;
