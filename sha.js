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
// SHA-512
// ---------------------------------------------------------------------------

// Round constants K[0..79]: first 64 bits of the fractional parts of the
// cube roots of the first 80 primes, stored as [hi32, lo32] pairs.
var SHA512_K = [
  0x428a2f98, 0xd728ae22, 0x71374491, 0x23ef65cd,
  0xb5c0fbcf, 0xec4d3b2f, 0xe9b5dba5, 0x8189dbbc,
  0x3956c25b, 0xf348b538, 0x59f111f1, 0xb605d019,
  0x923f82a4, 0xaf194f9b, 0xab1c5ed5, 0xda6d8118,
  0xd807aa98, 0xa3030242, 0x12835b01, 0x45706fbe,
  0x243185be, 0x4ee4b28c, 0x550c7dc3, 0xd5ffb4e2,
  0x72be5d74, 0xf27b896f, 0x80deb1fe, 0x3b1696b1,
  0x9bdc06a7, 0x25c71235, 0xc19bf174, 0xcf692694,
  0xe49b69c1, 0x9ef14ad2, 0xefbe4786, 0x384f25e3,
  0x0fc19dc6, 0x8b8cd5b5, 0x240ca1cc, 0x77ac9c65,
  0x2de92c6f, 0x592b0275, 0x4a7484aa, 0x6ea6e483,
  0x5cb0a9dc, 0xbd41fbd4, 0x76f988da, 0x831153b5,
  0x983e5152, 0xee66dfab, 0xa831c66d, 0x2db43210,
  0xb00327c8, 0x98fb213f, 0xbf597fc7, 0xbeef0ee4,
  0xc6e00bf3, 0x3da88fc2, 0xd5a79147, 0x930aa725,
  0x06ca6351, 0xe003826f, 0x14292967, 0x0a0e6e70,
  0x27b70a85, 0x46d22ffc, 0x2e1b2138, 0x5c26c926,
  0x4d2c6dfc, 0x5ac42aed, 0x53380d13, 0x9d95b3df,
  0x650a7354, 0x8baf63de, 0x766a0abb, 0x3c77b2a8,
  0x81c2c92e, 0x47edaee6, 0x92722c85, 0x1482353b,
  0xa2bfe8a1, 0x4cf10364, 0xa81a664b, 0xbc423001,
  0xc24b8b70, 0xd0f89791, 0xc76c51a3, 0x0654be30,
  0xd192e819, 0xd6ef5218, 0xd6990624, 0x5565a910,
  0xf40e3585, 0x5771202a, 0x106aa070, 0x32bbd1b8,
  0x19a4c116, 0xb8d2d0c8, 0x1e376c08, 0x5141ab53,
  0x2748774c, 0xdf8eeb99, 0x34b0bcb5, 0xe19b48a8,
  0x391c0cb3, 0xc5c95a63, 0x4ed8aa4a, 0xe3418acb,
  0x5b9cca4f, 0x7763e373, 0x682e6ff3, 0xd6b2b8a3,
  0x748f82ee, 0x5defb2fc, 0x78a5636f, 0x43172f60,
  0x84c87814, 0xa1f0ab72, 0x8cc70208, 0x1a6439ec,
  0x90befffa, 0x23631e28, 0xa4506ceb, 0xde82bde9,
  0xbef9a3f7, 0xb2c67915, 0xc67178f2, 0xe372532b,
  0xca273ece, 0xea26619c, 0xd186b8c7, 0x21c0c207,
  0xeada7dd6, 0xcde0eb1e, 0xf57d4f7f, 0xee6ed178,
  0x06f067aa, 0x72176fba, 0x0a637dc5, 0xa2c898a6,
  0x113f9804, 0xbef90dae, 0x1b710b35, 0x131c471b,
  0x28db77f5, 0x23047d84, 0x32caab7b, 0x40c72493,
  0x3c9ebe0a, 0x15c9bebc, 0x431d67c4, 0x9c100d4c,
  0x4cc5d4be, 0xcb3e42b6, 0x597f299c, 0xfc657e2a,
  0x5fcb6fab, 0x3ad6faec, 0x6c44198c, 0x4a475817
];

// 80 64-bit message schedule words stored as [hi0, lo0, hi1, lo1, …]
var SHA512_W = new Array(160);

function Sha512() {
  this.init();
  this._w = SHA512_W;
  Hash.call(this, 128, 112);
}

inherits(Sha512, Hash);

Sha512.prototype.init = function () {
  this._ah = 0x6a09e667; this._al = 0xf3bcc908;
  this._bh = 0xbb67ae85; this._bl = 0x84caa73b;
  this._ch = 0x3c6ef372; this._cl = 0xfe94f82b;
  this._dh = 0xa54ff53a; this._dl = 0x5f1d36f1;
  this._eh = 0x510e527f; this._el = 0xade682d1;
  this._fh = 0x9b05688c; this._fl = 0x2b3e6c1f;
  this._gh = 0x1f83d9ab; this._gl = 0xfb41bd6b;
  this._hh = 0x5be0cd19; this._hl = 0x137e2179;
  return this;
};

Sha512.prototype._update = function (M) {
  var w = this._w;
  var i;

  // Load message block: 16 x 64-bit big-endian words into w[0..31]
  for (i = 0; i < 32; i += 2) {
    w[i]     = M.readUInt32BE(i * 4);
    w[i + 1] = M.readUInt32BE(i * 4 + 4);
  }

  // Message schedule expansion: w[32..159] (words 16..79)
  for (i = 16; i < 80; ++i) {
    // γ1(W[i-2]): ROTR19 XOR ROTR61 XOR SHR6 on a 64-bit value
    var x2h = w[(i - 2) * 2], x2l = w[(i - 2) * 2 + 1];
    var g1h = ((x2h >>> 19) | (x2l << 13)) ^ ((x2l >>> 29) | (x2h << 3)) ^ (x2h >>> 6);
    var g1l = ((x2l >>> 19) | (x2h << 13)) ^ ((x2h >>> 29) | (x2l << 3)) ^ ((x2l >>> 6) | (x2h << 26));

    // γ0(W[i-15]): ROTR1 XOR ROTR8 XOR SHR7 on a 64-bit value
    var x15h = w[(i - 15) * 2], x15l = w[(i - 15) * 2 + 1];
    var g0h = ((x15h >>> 1) | (x15l << 31)) ^ ((x15h >>> 8) | (x15l << 24)) ^ (x15h >>> 7);
    var g0l = ((x15l >>> 1) | (x15h << 31)) ^ ((x15l >>> 8) | (x15h << 24)) ^ ((x15l >>> 7) | (x15h << 25));

    // W[i] = γ1(W[i-2]) + W[i-7] + γ0(W[i-15]) + W[i-16]  (64-bit addition)
    var wl = (g1l >>> 0) + (w[(i - 7) * 2 + 1] >>> 0) + (g0l >>> 0) + (w[(i - 16) * 2 + 1] >>> 0);
    w[i * 2 + 1] = wl >>> 0;
    w[i * 2]     = (g1h + w[(i - 7) * 2] + g0h + w[(i - 16) * 2] + Math.floor(wl / 0x100000000)) >>> 0;
  }

  // Working variables
  var ah = this._ah, al = this._al;
  var bh = this._bh, bl = this._bl;
  var ch = this._ch, cl = this._cl;
  var dh = this._dh, dl = this._dl;
  var eh = this._eh, el = this._el;
  var fh = this._fh, fl = this._fl;
  var gh = this._gh, gl = this._gl;
  var hh = this._hh, hl = this._hl;

  for (var j = 0; j < 80; ++j) {
    // σ1(e): ROTR14 XOR ROTR18 XOR ROTR41
    var s1h = ((eh >>> 14) | (el << 18)) ^ ((eh >>> 18) | (el << 14)) ^ ((el >>> 9) | (eh << 23));
    var s1l = ((el >>> 14) | (eh << 18)) ^ ((el >>> 18) | (eh << 14)) ^ ((eh >>> 9) | (el << 23));

    // Ch(e, f, g) = (e & f) ^ (~e & g)
    var chfh = (eh & fh) ^ (~eh & gh);
    var chfl = (el & fl) ^ (~el & gl);

    // T1 = h + σ1(e) + Ch(e,f,g) + K[j] + W[j]
    var T1l = (hl >>> 0) + (s1l >>> 0) + (chfl >>> 0) + (SHA512_K[j * 2 + 1] >>> 0) + (w[j * 2 + 1] >>> 0);
    var T1h = (hh + s1h + chfh + SHA512_K[j * 2] + w[j * 2] + Math.floor(T1l / 0x100000000)) >>> 0;
    T1l = T1l >>> 0;

    // σ0(a): ROTR28 XOR ROTR34 XOR ROTR39
    var s0h = ((ah >>> 28) | (al << 4)) ^ ((al >>> 2) | (ah << 30)) ^ ((al >>> 7) | (ah << 25));
    var s0l = ((al >>> 28) | (ah << 4)) ^ ((ah >>> 2) | (al << 30)) ^ ((ah >>> 7) | (al << 25));

    // Maj(a, b, c) = (a & b) ^ (a & c) ^ (b & c)
    var majh = (ah & bh) ^ (ah & ch) ^ (bh & ch);
    var majl = (al & bl) ^ (al & cl) ^ (bl & cl);

    // T2 = σ0(a) + Maj(a,b,c)
    var T2l = (s0l >>> 0) + (majl >>> 0);
    var T2h = (s0h + majh + Math.floor(T2l / 0x100000000)) >>> 0;
    T2l = T2l >>> 0;

    hh = gh; hl = gl;
    gh = fh; gl = fl;
    fh = eh; fl = el;
    // e = d + T1
    var esum = (dl >>> 0) + (T1l >>> 0);
    eh = (dh + T1h + Math.floor(esum / 0x100000000)) >>> 0;
    el = esum >>> 0;
    dh = ch; dl = cl;
    ch = bh; cl = bl;
    bh = ah; bl = al;
    // a = T1 + T2
    var asum = (T1l >>> 0) + (T2l >>> 0);
    ah = (T1h + T2h + Math.floor(asum / 0x100000000)) >>> 0;
    al = asum >>> 0;
  }

  // Add compressed block back into state
  var sum;
  sum = (this._al >>> 0) + (al >>> 0);  this._ah = (this._ah + ah + Math.floor(sum / 0x100000000)) >>> 0; this._al = sum >>> 0;
  sum = (this._bl >>> 0) + (bl >>> 0);  this._bh = (this._bh + bh + Math.floor(sum / 0x100000000)) >>> 0; this._bl = sum >>> 0;
  sum = (this._cl >>> 0) + (cl >>> 0);  this._ch = (this._ch + ch + Math.floor(sum / 0x100000000)) >>> 0; this._cl = sum >>> 0;
  sum = (this._dl >>> 0) + (dl >>> 0);  this._dh = (this._dh + dh + Math.floor(sum / 0x100000000)) >>> 0; this._dl = sum >>> 0;
  sum = (this._el >>> 0) + (el >>> 0);  this._eh = (this._eh + eh + Math.floor(sum / 0x100000000)) >>> 0; this._el = sum >>> 0;
  sum = (this._fl >>> 0) + (fl >>> 0);  this._fh = (this._fh + fh + Math.floor(sum / 0x100000000)) >>> 0; this._fl = sum >>> 0;
  sum = (this._gl >>> 0) + (gl >>> 0);  this._gh = (this._gh + gh + Math.floor(sum / 0x100000000)) >>> 0; this._gl = sum >>> 0;
  sum = (this._hl >>> 0) + (hl >>> 0);  this._hh = (this._hh + hh + Math.floor(sum / 0x100000000)) >>> 0; this._hl = sum >>> 0;
};

Sha512.prototype._hash = function () {
  var H = Buffer.allocUnsafe(64);
  H.writeUInt32BE(this._ah, 0);  H.writeUInt32BE(this._al, 4);
  H.writeUInt32BE(this._bh, 8);  H.writeUInt32BE(this._bl, 12);
  H.writeUInt32BE(this._ch, 16); H.writeUInt32BE(this._cl, 20);
  H.writeUInt32BE(this._dh, 24); H.writeUInt32BE(this._dl, 28);
  H.writeUInt32BE(this._eh, 32); H.writeUInt32BE(this._el, 36);
  H.writeUInt32BE(this._fh, 40); H.writeUInt32BE(this._fl, 44);
  H.writeUInt32BE(this._gh, 48); H.writeUInt32BE(this._gl, 52);
  H.writeUInt32BE(this._hh, 56); H.writeUInt32BE(this._hl, 60);
  return H;
};

// ---------------------------------------------------------------------------
// SHA-384 (truncated SHA-512 with a different IV)
// ---------------------------------------------------------------------------

function Sha384() {
  this.init();
  this._w = SHA512_W;
  Hash.call(this, 128, 112);
}

inherits(Sha384, Sha512);

Sha384.prototype.init = function () {
  this._ah = 0xcbbb9d5d; this._al = 0xc1059ed8;
  this._bh = 0x629a292a; this._bl = 0x367cd507;
  this._ch = 0x9159015a; this._cl = 0x3070dd17;
  this._dh = 0x152fecd8; this._dl = 0xf70e5939;
  this._eh = 0x67332667; this._el = 0xffc00b31;
  this._fh = 0x8eb44a87; this._fl = 0x68581511;
  this._gh = 0xdb0c2e0d; this._gl = 0x64f98fa7;
  this._hh = 0x47b5481d; this._hl = 0xbefa4fa4;
  return this;
};

Sha384.prototype._hash = function () {
  var H = Buffer.allocUnsafe(48);
  H.writeUInt32BE(this._ah, 0);  H.writeUInt32BE(this._al, 4);
  H.writeUInt32BE(this._bh, 8);  H.writeUInt32BE(this._bl, 12);
  H.writeUInt32BE(this._ch, 16); H.writeUInt32BE(this._cl, 20);
  H.writeUInt32BE(this._dh, 24); H.writeUInt32BE(this._dl, 28);
  H.writeUInt32BE(this._eh, 32); H.writeUInt32BE(this._el, 36);
  H.writeUInt32BE(this._fh, 40); H.writeUInt32BE(this._fl, 44);
  return H;
};

// ---------------------------------------------------------------------------
// Factory
// ---------------------------------------------------------------------------

var ALGORITHMS = {
  sha1: Sha1,
  sha224: Sha224,
  sha256: Sha256,
  sha384: Sha384,
  sha512: Sha512
};

/**
 * Create a new hash instance for the named algorithm.
 *
 * @param {string} algorithm - one of 'sha1', 'sha224', 'sha256', 'sha384', 'sha512'
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
module.exports.sha384 = Sha384;
module.exports.sha512 = Sha512;
