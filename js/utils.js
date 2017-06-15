/*!
 * tweetnacl-util-js, tweetnacl-auth-js
 * Copyright (c) 2013-2016 Dmitry Chestnykh | BSD License
 * https://github.com/dchest/scrypt-async-js
 */

// Written in 2014-2016 by Dmitry Chestnykh and Devi Mandiri.
// Public domain.
(function(root, f) {
  'use strict';
  if (typeof module !== 'undefined' && module.exports) module.exports = f();
  else if (root.nacl) root.nacl.util = f();
  else {
    root.nacl = {};
    root.nacl.util = f();
  }
}(this, function() {
  'use strict';

  var util = {};

  function validateBase64(s) {
    if (!(/^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/.test(s))) {
      throw new TypeError('invalid encoding');
    }
  }

  util.decodeUTF8 = function(s) {
    if (typeof s !== 'string') throw new TypeError('expected string');
    var i, d = unescape(encodeURIComponent(s)), b = new Uint8Array(d.length);
    for (i = 0; i < d.length; i++) b[i] = d.charCodeAt(i);
    return b;
  };

  util.encodeUTF8 = function(arr) {
    var i, s = [];
    for (i = 0; i < arr.length; i++) s.push(String.fromCharCode(arr[i]));
    return decodeURIComponent(escape(s.join('')));
  };

  if (typeof atob === 'undefined') {
    // Node.js

    if (typeof Buffer.from !== 'undefined') {
       // Node v6 and later
      util.encodeBase64 = function (arr) { // v6 and later
          return Buffer.from(arr).toString('base64');
      };

      util.decodeBase64 = function (s) {
        validateBase64(s);
        return new Uint8Array(Array.prototype.slice.call(Buffer.from(s, 'base64'), 0));
      };

    } else {
      // Node earlier than v6
      util.encodeBase64 = function (arr) { // v6 and later
        return (new Buffer(arr)).toString('base64');
      };

      util.decodeBase64 = function(s) {
        validateBase64(s);
        return new Uint8Array(Array.prototype.slice.call(new Buffer(s, 'base64'), 0));
      };
    }

  } else {
    // Browsers

    util.encodeBase64 = function(arr) {
      var i, s = [], len = arr.length;
      for (i = 0; i < len; i++) s.push(String.fromCharCode(arr[i]));
      return btoa(s.join(''));
    };

    util.decodeBase64 = function(s) {
      validateBase64(s);
      var i, d = atob(s), b = new Uint8Array(d.length);
      for (i = 0; i < d.length; i++) b[i] = d.charCodeAt(i);
      return b;
    };

  }

  return util;

}));








(function(root, f) {
  'use strict';
  if (typeof module !== 'undefined' && module.exports) module.exports = f(require('tweetnacl'));
  else root.nacl.auth = f(root.nacl);

}(this, function(nacl) {
  'use strict';

  if (!nacl) throw new Error('tweetnacl not loaded');

  var BLOCK_SIZE = 128, HASH_SIZE = 64;

  function hmac(message, key) {
    var buf = new Uint8Array(BLOCK_SIZE + Math.max(HASH_SIZE, message.length));
    var i, innerHash;

    if (key.length > BLOCK_SIZE)
      key = nacl.hash(key);

    for (i = 0; i < BLOCK_SIZE; i++) buf[i] = 0x36;
    for (i = 0; i < key.length; i++) buf[i] ^= key[i];
    buf.set(message, BLOCK_SIZE);
    innerHash = nacl.hash(buf.subarray(0, BLOCK_SIZE + message.length));

    for (i = 0; i < BLOCK_SIZE; i++) buf[i] = 0x5c;
    for (i = 0; i < key.length; i++) buf[i] ^= key[i];
    buf.set(innerHash, BLOCK_SIZE);
    return nacl.hash(buf.subarray(0, BLOCK_SIZE + innerHash.length));
  }

  function auth(message, key) {
    var out = new Uint8Array(32);
    out.set(hmac(message, key).subarray(0, 32));
    return out;
  }

  auth.full = function (message, key) {
    return hmac(message, key);
  };

  auth.authLength = 32;
  auth.authFullLength = 64;
  auth.keyLength = 32;

  return auth;

}));