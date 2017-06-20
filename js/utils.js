/* globals btoa, atob, nacl, localStorage, confirm, Profiles, main, location */

/*!
 * tweetnacl-util-js, tweetnacl-auth-js
 * Copyright (c) 2013-2016 Dmitry Chestnykh | BSD License
 * https://github.com/dchest/scrypt-async-js
 */

// Written in 2014-2016 by Dmitry Chestnykh and Devi Mandiri.
// Public domain.
(function (root, f) {
  'use strict'
  if (typeof module !== 'undefined' && module.exports) module.exports = f()
  else if (root.nacl) root.nacl.util = f()
  else {
    root.nacl = {}
    root.nacl.util = f()
  }
}(this, function () {
  'use strict'

  var util = {}

  function validateBase64 (s) {
    if (!(/^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/.test(s))) {
      throw new TypeError('invalid encoding')
    }
  }

  util.decodeUTF8 = function (s) {
    if (typeof s !== 'string') throw new TypeError('expected string')
    var d = unescape(encodeURIComponent(s))
    var b = new Uint8Array(d.length)
    for (var i = 0; i < d.length; i++) b[i] = d.charCodeAt(i)
    return b
  }

  util.encodeUTF8 = function (arr) {
    var s = []
    for (var i = 0; i < arr.length; i++) s.push(String.fromCharCode(arr[i]))
    return decodeURIComponent(escape(s.join('')))
  }

  if (typeof atob === 'undefined') {
    // Node.js

    if (typeof Buffer.from !== 'undefined') {
       // Node v6 and later
      util.encodeBase64 = function (arr) { // v6 and later
        return Buffer.from(arr).toString('base64')
      }

      util.decodeBase64 = function (s) {
        validateBase64(s)
        return new Uint8Array(Array.prototype.slice.call(Buffer.from(s, 'base64'), 0))
      }
    } else {
      // Node earlier than v6
      util.encodeBase64 = function (arr) { // v6 and later
        // eslint-disable-next-line
        return (new Buffer(arr)).toString('base64')
      }

      util.decodeBase64 = function (s) {
        validateBase64(s)
        // eslint-disable-next-line
        return new Uint8Array(Array.prototype.slice.call(new Buffer(s, 'base64'), 0))
      }
    }
  } else {
    // Browsers

    util.encodeBase64 = function (arr) {
      var s = []
      var len = arr.length
      for (var i = 0; i < len; i++) s.push(String.fromCharCode(arr[i]))
      return btoa(s.join(''))
    }

    util.decodeBase64 = function (s) {
      validateBase64(s)
      var d = atob(s)
      var b = new Uint8Array(d.length)
      for (var i = 0; i < d.length; i++) b[i] = d.charCodeAt(i)
      return b
    }
  }

  return util
}));

(function (root, f) {
  'use strict'
  if (typeof module !== 'undefined' && module.exports) module.exports = f(require('tweetnacl'))
  else root.nacl.auth = f(root.nacl)
}(this, function (nacl) {
  'use strict'

  if (!nacl) throw new Error('tweetnacl not loaded')

  var BLOCK_SIZE = 128
  var HASH_SIZE = 64

  function hmac (message, key) {
    var buf = new Uint8Array(BLOCK_SIZE + Math.max(HASH_SIZE, message.length))
    var i, innerHash

    if (key.length > BLOCK_SIZE) { key = nacl.hash(key) }

    for (i = 0; i < BLOCK_SIZE; i++) buf[i] = 0x36
    for (i = 0; i < key.length; i++) buf[i] ^= key[i]
    buf.set(message, BLOCK_SIZE)
    innerHash = nacl.hash(buf.subarray(0, BLOCK_SIZE + message.length))

    for (i = 0; i < BLOCK_SIZE; i++) buf[i] = 0x5c
    for (i = 0; i < key.length; i++) buf[i] ^= key[i]
    buf.set(innerHash, BLOCK_SIZE)
    return nacl.hash(buf.subarray(0, BLOCK_SIZE + innerHash.length))
  }

  function auth (message, key) {
    var out = new Uint8Array(32)
    out.set(hmac(message, key).subarray(0, 32))
    return out
  }

  auth.full = function (message, key) {
    return hmac(message, key)
  }

  auth.authLength = 32
  auth.authFullLength = 64
  auth.keyLength = 32

  return auth
}))

// DOM manipulation short cuts

function $ (id) {
  return document.querySelector(id)
}

function $$ (id) {
  return document.querySelectorAll(id)
}

function hide (el) {
  if (typeof el === 'string') el = $(el)
  el.style.display = 'none'
}

function show (el) {
  if (typeof el === 'string') el = $(el)
  el.style.display = 'block'
}

// primarily used for `scope`

window.toQuery = function (obj) {
  return Object.keys(obj).reduce(function (a, k) { a.push(k + '=' + encodeURIComponent(obj[k])); return a }, []).join('&')
}

window.fromQuery = function (str) {
  if (typeof str !== 'string' || str === '') return {}
  var o = {}
  str.split('&').map(function (pair) {
    pair = pair.split('=')
    o[decodeURIComponent(pair[0])] = decodeURIComponent(pair[1])
  })
  return o
}

// to Uint8Array/Base64 and back

window.Benc = function (str) {
  return nacl.util.encodeBase64(str)
}

window.Bdec = function (str) {
  return nacl.util.decodeBase64(str)
}

window.Uenc = function (str) {
  return nacl.util.encodeUTF8(str)
}

window.Udec = function (str) {
  return nacl.util.decodeUTF8(str)
}

// crypto short cuts

window.hmac = function (secret, message) {
  return window.Benc(nacl.auth(window.Udec(message), window.Bdec(secret)))
}

window.sign = function (message, priv) {
  return window.Benc(nacl.sign.detached(window.Udec(message), window.Bdec(priv)))
}

window.screen = function (label) {
  // show($('.container'))
  var conts = $$('.screen')
  for (var i = 0; i < conts.length; i++) {
    if (conts[i].classList.contains(label)) {
      show(conts[i])
    } else {
      hide(conts[i])
    }
  }
}

window.format = function (origin) {
  var formatted = origin.split('/')[2]
  return formatted[0].toUpperCase() + formatted.substr(1)
}

window.logout = function () {
  if (confirm('You will not lose any data, but you will have to enter same email & password to log in this profile again')) {
    if (Profiles.length > 1) {
      Profiles.splice(Number(localStorage.current_profile), 1)
      localStorage.current_profile = Object.keys(Profiles)[0]
      main()
    } else {
      localStorage.clear()
      location.hash = ''
      location.reload()
    }
  }
}

window.l = function (a) {
  console.log(a)
}

window.secondsFromNow = function (seconds) {
  return (Math.floor(new Date() / 1000)) + seconds
}

// escape HTML entities

var entityMap = {
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  '"': '&quot;',
  '\'': '&#39;',
  '/': '&#x2F;'
}

window.e = function (string) {
  return String(string).replace(/[&<>"'/]/g, function (s) {
    return entityMap[s]
  })
}

// escaped CSV, JSON would be overhead

window.csv = function (str) {
  if (str instanceof Array) {
    return str.map(function (el) {
      return el.toString().replace(/[%,]/g, function (f) {
        return f === '%' ? '%25' : '%2C'
      })
    }).join(',')
  } else {
    return str.split(',').map(function (el) {
      return el.replace(/(%25|%2C)/g, function (f) {
        return f === '%25' ? '%' : ','
      })
    })
  }
}

window.getRandomValues = function (num) {
  return window.crypto.getRandomValues(new Uint8Array(num))
}
