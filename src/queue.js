require('dotenv').config();
import kue from 'kue';

const queue = kue.createQueue({
  redis: process.env.REDIS_URL,
});

export default queue;
