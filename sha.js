'use strict';

/**
 * sha.js - Secure Hash Algorithm implementations (SHA-1, SHA-256, SHA-224, SHA-512, SHA-384)
 *
 * Fix for CVE-2025-9288 / GHSA-95m3-7q98-8xr5:
 * Added strict input type checks in Hash.prototype.update() to prevent:
 *   - Hash state rewind via objects with negative `length` (e.g. {length: -3})
 *   - Hash collisions via crafted array-like objects with out-of-range byte values
 *   - DoS via objects with string `length` properties (e.g. {length: '1e99'})
 *
 * Only Buffer, string, and well-formed arrays/TypedArrays of bytes (0–255) are accepted.
 */

var Buffer = require('safe-buffer').Buffer;
var inherits = require('inherits');

// ---------------------------------------------------------------------------
// Input validation (replaces the missing type checks from the vulnerable version)
// ---------------------------------------------------------------------------

var useArrayBuffer = typeof ArrayBuffer !== 'undefined' && typeof Uint8Array !== 'undefined';

function isTypedArray(obj) {
  if (!useArrayBuffer) {
    return false;
  }
  return (ArrayBuffer.isView ? ArrayBuffer.isView(obj) : obj instanceof Uint8Array);
}

/**
 * Convert `data` to a Buffer, performing strict type checks.
 *
 * Throws TypeError  when `data` is not a string, Buffer, TypedArray, or plain Array.
 * Throws RangeError when `data` is an Array whose items are not integers in [0, 255].
 *
 * This prevents the CVE-2025-9288 hash-rewind and crafted-data attacks that arise
 * when arbitrary objects with manipulated `length` properties reach the hash loop.
 */
function toBuffer(data, encoding) {
  if (Buffer.isBuffer(data)) {
    return data;
  }

  if (typeof data === 'string') {
    return Buffer.from(data, encoding);
  }

  // Accept TypedArrays / DataViews (Uint8Array, Uint16Array, Buffer subclasses, …)
  if (useArrayBuffer && isTypedArray(data)) {
    if (data.byteLength === 0) {
      return Buffer.alloc(0);
    }
    // Reinterpret the underlying bytes regardless of element width
    return Buffer.from(data.buffer, data.byteOffset, data.byteLength);
  }

  // Accept plain Arrays whose elements are valid byte values
  if (Array.isArray(data)) {
    for (var i = 0; i < data.length; i++) {
      var x = data[i];
      if (typeof x !== 'number' || x < 0 || x > 255 || Math.floor(x) !== x) {
        throw new RangeError('Array items must be integers in the range 0–255.');
      }
    }
    return Buffer.from(data);
  }

  // Anything else (plain objects, null, undefined, …) is rejected
  throw new TypeError(
    'The "data" argument must be a string, a Buffer, a TypedArray, or an Array of bytes.'
  );
}

// ---------------------------------------------------------------------------
// Hash base class
// ---------------------------------------------------------------------------

function Hash(blockSize, finalSize) {
  this._block = Buffer.alloc(blockSize);
  this._finalSize = finalSize;
  this._blockSize = blockSize;
  this._len = 0;
}

/**
 * Feed data into the hash.
 *
 * @param {string|Buffer|TypedArray|Array} data
 * @param {string} [enc] - encoding when `data` is a string (default: 'utf8')
 */
Hash.prototype.update = function (data, enc) {
  /* eslint no-param-reassign: 0 */
  // toBuffer() enforces type safety and prevents the CVE-2025-9288 hash-rewind
  data = toBuffer(data, enc || 'utf8');

  var block = this._block;
  var blockSize = this._blockSize;
  var length = data.length;
  var accum = this._len;

  for (var offset = 0; offset < length;) {
    var assigned = accum % blockSize;
    var remainder = Math.min(length - offset, blockSize - assigned);

    for (var i = 0; i < remainder; i++) {
      block[assigned + i] = data[offset + i];
    }

    accum += remainder;
    offset += remainder;

    if ((accum % blockSize) === 0) {
      this._update(block);
    }
  }

  this._len += length;
  return this;
};

Hash.prototype.digest = function (enc) {
  var rem = this._len % this._blockSize;

  this._block[rem] = 0x80;

  // Zero the trailing bits up to the final block boundary
  this._block.fill(0, rem + 1);

  if (rem >= this._finalSize) {
    this._update(this._block);
    this._block.fill(0);
  }

  var bits = this._len * 8;

  // Write bit length as big-endian uint64 into the last 8 bytes
  if (bits <= 0xffffffff) {
    this._block.writeUInt32BE(bits, this._blockSize - 4);
  } else {
    var lowBits = (bits & 0xffffffff) >>> 0;
    var highBits = (bits - lowBits) / 0x100000000;
    this._block.writeUInt32BE(highBits, this._blockSize - 8);
    this._block.writeUInt32BE(lowBits, this._blockSize - 4);
  }

  this._update(this._block);
  var hash = this._hash();

  return enc ? hash.toString(enc) : hash;
};

Hash.prototype._update = function () {
  throw new Error('_update must be implemented by subclass');
};

// ---------------------------------------------------------------------------
// SHA-1
// ---------------------------------------------------------------------------

var SHA1_K = [0x5a827999, 0x6ed9eba1, 0x8f1bbcdc | 0, 0xca62c1d6 | 0];
var SHA1_W = new Array(80);

function Sha1() {
  this.init();
  this._w = SHA1_W;
  Hash.call(this, 64, 56);
}

inherits(Sha1, Hash);

Sha1.prototype.init = function () {
  this._a = 0x67452301;
  this._b = 0xefcdab89;
  this._c = 0x98badcfe;
  this._d = 0x10325476;
  this._e = 0xc3d2e1f0;
  return this;
};

function sha1Ft(s, b, c, d) {
  if (s === 0) { return (b & c) | (~b & d); }
  if (s === 2) { return (b & c) | (b & d) | (c & d); }
  return b ^ c ^ d;
}

function rotl1(num) { return (num << 1) | (num >>> 31); }
function rotl5(num) { return (num << 5) | (num >>> 27); }
function rotl30(num) { return (num << 30) | (num >>> 2); }

Sha1.prototype._update = function (M) {
  var w = this._w;
  var a = this._a | 0;
  var b = this._b | 0;
  var c = this._c | 0;
  var d = this._d | 0;
  var e = this._e | 0;
  var i;

  for (i = 0; i < 16; ++i) { w[i] = M.readInt32BE(i * 4); }
  for (; i < 80; ++i) { w[i] = rotl1(w[i - 3] ^ w[i - 8] ^ w[i - 14] ^ w[i - 16]); }

  for (var j = 0; j < 80; ++j) {
    var s = ~~(j / 20);
    var t = (rotl5(a) + sha1Ft(s, b, c, d) + e + w[j] + SHA1_K[s]) | 0;
    e = d; d = c; c = rotl30(b); b = a; a = t;
  }

  this._a = (a + this._a) | 0;
  this._b = (b + this._b) | 0;
  this._c = (c + this._c) | 0;
  this._d = (d + this._d) | 0;
  this._e = (e + this._e) | 0;
};

Sha1.prototype._hash = function () {
  var H = Buffer.allocUnsafe(20);
  H.writeInt32BE(this._a | 0, 0);
  H.writeInt32BE(this._b | 0, 4);
  H.writeInt32BE(this._c | 0, 8);
  H.writeInt32BE(this._d | 0, 12);
  H.writeInt32BE(this._e | 0, 16);
  return H;
};

// ---------------------------------------------------------------------------
// SHA-256
// ---------------------------------------------------------------------------

var SHA256_K = [
  0x428A2F98, 0x71374491, 0xB5C0FBCF, 0xE9B5DBA5,
  0x3956C25B, 0x59F111F1, 0x923F82A4, 0xAB1C5ED5,
  0xD807AA98, 0x12835B01, 0x243185BE, 0x550C7DC3,
  0x72BE5D74, 0x80DEB1FE, 0x9BDC06A7, 0xC19BF174,
  0xE49B69C1, 0xEFBE4786, 0x0FC19DC6, 0x240CA1CC,
  0x2DE92C6F, 0x4A7484AA, 0x5CB0A9DC, 0x76F988DA,
  0x983E5152, 0xA831C66D, 0xB00327C8, 0xBF597FC7,
  0xC6E00BF3, 0xD5A79147, 0x06CA6351, 0x14292967,
  0x27B70A85, 0x2E1B2138, 0x4D2C6DFC, 0x53380D13,
  0x650A7354, 0x766A0ABB, 0x81C2C92E, 0x92722C85,
  0xA2BFE8A1, 0xA81A664B, 0xC24B8B70, 0xC76C51A3,
  0xD192E819, 0xD6990624, 0xF40E3585, 0x106AA070,
  0x19A4C116, 0x1E376C08, 0x2748774C, 0x34B0BCB5,
  0x391C0CB3, 0x4ED8AA4A, 0x5B9CCA4F, 0x682E6FF3,
  0x748F82EE, 0x78A5636F, 0x84C87814, 0x8CC70208,
  0x90BEFFFA, 0xA4506CEB, 0xBEF9A3F7, 0xC67178F2
];

var SHA256_W = new Array(64);

function Sha256() {
  this.init();
  this._w = SHA256_W;
  Hash.call(this, 64, 56);
}

inherits(Sha256, Hash);

Sha256.prototype.init = function () {
  this._a = 0x6a09e667;
  this._b = 0xbb67ae85;
  this._c = 0x3c6ef372;
  this._d = 0xa54ff53a;
  this._e = 0x510e527f;
  this._f = 0x9b05688c;
  this._g = 0x1f83d9ab;
  this._h = 0x5be0cd19;
  return this;
};

function ch(x, y, z) { return z ^ (x & (y ^ z)); }
function maj(x, y, z) { return (x & y) | (z & (x | y)); }
function sigma0(x) { return ((x >>> 2) | (x << 30)) ^ ((x >>> 13) | (x << 19)) ^ ((x >>> 22) | (x << 10)); }
function sigma1(x) { return ((x >>> 6) | (x << 26)) ^ ((x >>> 11) | (x << 21)) ^ ((x >>> 25) | (x << 7)); }
function gamma0(x) { return ((x >>> 7) | (x << 25)) ^ ((x >>> 18) | (x << 14)) ^ (x >>> 3); }
function gamma1(x) { return ((x >>> 17) | (x << 15)) ^ ((x >>> 19) | (x << 13)) ^ (x >>> 10); }

Sha256.prototype._update = function (M) {
  var w = this._w;
  var a = this._a | 0, b = this._b | 0, c = this._c | 0, d = this._d | 0;
  var e = this._e | 0, f = this._f | 0, g = this._g | 0, h = this._h | 0;
  var i;

  for (i = 0; i < 16; ++i) { w[i] = M.readInt32BE(i * 4); }
  for (; i < 64; ++i) { w[i] = (gamma1(w[i - 2]) + w[i - 7] + gamma0(w[i - 15]) + w[i - 16]) | 0; }

  for (var j = 0; j < 64; ++j) {
    var T1 = (h + sigma1(e) + ch(e, f, g) + SHA256_K[j] + w[j]) | 0;
    var T2 = (sigma0(a) + maj(a, b, c)) | 0;
    h = g; g = f; f = e; e = (d + T1) | 0;
    d = c; c = b; b = a; a = (T1 + T2) | 0;
  }

  this._a = (a + this._a) | 0;
  this._b = (b + this._b) | 0;
  this._c = (c + this._c) | 0;
  this._d = (d + this._d) | 0;
  this._e = (e + this._e) | 0;
  this._f = (f + this._f) | 0;
  this._g = (g + this._g) | 0;
  this._h = (h + this._h) | 0;
};

Sha256.prototype._hash = function () {
  var H = Buffer.allocUnsafe(32);
  H.writeInt32BE(this._a, 0);
  H.writeInt32BE(this._b, 4);
  H.writeInt32BE(this._c, 8);
  H.writeInt32BE(this._d, 12);
  H.writeInt32BE(this._e, 16);
  H.writeInt32BE(this._f, 20);
  H.writeInt32BE(this._g, 24);
  H.writeInt32BE(this._h, 28);
  return H;
};

// ---------------------------------------------------------------------------
// SHA-224 (truncated SHA-256 with different IV)
// ---------------------------------------------------------------------------

function Sha224() {
  this.init();
  this._w = SHA256_W;
  Hash.call(this, 64, 56);
}

inherits(Sha224, Sha256);

Sha224.prototype.init = function () {
  this._a = 0xc1059ed8;
  this._b = 0x367cd507;
  this._c = 0x3070dd17;
  this._d = 0xf70e5939;
  this._e = 0xffc00b31;
  this._f = 0x68581511;
  this._g = 0x64f98fa7;
  this._h = 0xbefa4fa4;
  return this;
};

Sha224.prototype._hash = function () {
  var H = Buffer.allocUnsafe(28);
  H.writeInt32BE(this._a, 0);
  H.writeInt32BE(this._b, 4);
  H.writeInt32BE(this._c, 8);
  H.writeInt32BE(this._d, 12);
  H.writeInt32BE(this._e, 16);
  H.writeInt32BE(this._f, 20);
  H.writeInt32BE(this._g, 24);
  return H;
};

// ---------------------------------------------------------------------------
// Factory
// ---------------------------------------------------------------------------

var ALGORITHMS = {
  sha1: Sha1,
  sha224: Sha224,
  sha256: Sha256
};

/**
 * Create a new hash instance for the named algorithm.
 *
 * @param {string} algorithm - one of 'sha1', 'sha224', 'sha256'
 * @returns {Hash}
 */
function createHash(algorithm) {
  var lc = algorithm.toLowerCase();
  var Ctor = ALGORITHMS[lc];
  if (!Ctor) {
    throw new Error('Unsupported algorithm: ' + algorithm);
  }
  return new Ctor();
}

module.exports = createHash;
module.exports.sha1 = Sha1;
module.exports.sha224 = Sha224;
module.exports.sha256 = Sha256;
