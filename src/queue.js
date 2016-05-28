if (process.env.NODE_ENV !== 'production') { require('dotenv').config({ silent: true }); }

import kue from 'kue';

const queue = kue.createQueue({
  redis: process.env.REDIS_URL,
});

export default queue;
