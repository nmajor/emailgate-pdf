'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});

var _stream = require('stream');

var _stream2 = _interopRequireDefault(_stream);

var _util = require('util');

var _util2 = _interopRequireDefault(_util);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

// ---------------------------------------------------------- //
// ---------------------------------------------------------- //

// I turn the given source Buffer into a Readable stream.
// Required module references.
function BufferStream(source) {
  if (!Buffer.isBuffer(source)) {
    throw new Error('Source must be a buffer.');
  }

  // Super constructor.
  _stream2.default.Readable.call(this);

  this._source = source;

  // I keep track of which portion of the source buffer is currently being pushed
  // onto the internal stream buffer during read actions.
  this._offset = 0;
  this._length = source.length;

  // When the stream has ended, try to clean up the memory references.
  this.on('end', this._destroy);
}

_util2.default.inherits(BufferStream, _stream2.default.Readable);

// I attempt to clean up variable references once the stream has been ended.
// --
// NOTE: I am not sure this is necessary. But, I'm trying to be more cognizant of memory
// usage since my Node.js apps will (eventually) never restart.
BufferStream.prototype._destroy = function _destroy() {
  this._source = null;
  this._offset = null;
  this._length = null;
};

// I read chunks from the source buffer into the underlying stream buffer.
// --
// NOTE: We can assume the size value will always be available since we are not
// altering the readable state options when initializing the Readable stream.
BufferStream.prototype._read = function _read(size) {
  // If we haven't reached the end of the source buffer, push the next chunk onto
  // the internal stream buffer.
  if (this._offset < this._length) {
    this.push(this._source.slice(this._offset, this._offset + size));
    this._offset += size;
  }

  // If we've consumed the entire source buffer, close the readable stream.
  if (this._offset >= this._length) {
    this.push(null);
  }
};

exports.default = BufferStream;