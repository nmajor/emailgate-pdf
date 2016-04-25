export function log(type, message, payload) {
  const logBuffer = new Buffer(JSON.stringify({
    type,
    message,
    payload,
  }));

  process.stdout.write(logBuffer);
  if (type === 'error') {
    process.exit();
  }
}
