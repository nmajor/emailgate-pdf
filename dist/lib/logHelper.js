'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.log = log;
function log(type, message, payload) {
  var logBuffer = new Buffer(JSON.stringify({
    type: type,
    message: message,
    payload: payload
  }));

  process.stdout.write(logBuffer);
  if (type === 'error') {
    process.exit();
  }
}