/* globals bowser, SecureLogin */

window.addEventListener('load', function () {
  // safari violates mixed content spec, so no app
  if (!bowser.safari) {
    var appBtn = document.querySelector('[data-client="app"]')
    if (appBtn) appBtn.style.display = 'inline-block'
  }
  // ext only on chrome
  var desktop = (bowser.mac || bowser.linux || bowser.windows || bowser.chromeos)
  if (bowser.chrome && desktop) {
    var extBtn = document.querySelector('[data-client="ext"]')
    if (extBtn) extBtn.style.display = 'inline-block'
  }
})

window.SecureLogin = function (cb, flow, scope) {
  function toQuery (obj) {
    return Object.keys(obj).reduce(function (a, k) {
      a.push(encodeURIComponent(k) + '=' + encodeURIComponent(obj[k]))
      return a
    }, []).join('&')
  }

  var opts = {}

  if (SecureLogin.pubkey) opts.pubkey = SecureLogin.pubkey
  if (scope) opts.scope = toQuery(scope)

  var query = toQuery(opts)
  var webOrigin = window.location.host === 'c.dev' ? 'http://securelogin.dev' : 'https://securelogin.pw'
  var extOrigin = 'chrome-extension://abpigncghjblhknbbannlhmgjpjpbajj'

  window.localStorage.securelogin = flow

  if (flow === 'app') {
    // we are using a sane browser, let's open direct WS to localhost
    window.location = 'securelogin://'
    var startInterval = new Date()
    var slInterval = setInterval(function () {
      var x = new window.WebSocket('ws://127.0.0.1:3101')

      x.onmessage = function (e) {
        console.log(e.data)
        x.send('{"data":"close"}')
        x.close()
        cb(e.data)
        cb = function (str) {
          console.log('replay')
        }
      }

      x.onopen = function () {
        x.send(JSON.stringify({
          data: query
        }))
        clearInterval(slInterval)
      }

      if (new Date() - startInterval > 3000) {
        // alert("Please make sure SecureLogin app is running")
        clearInterval(slInterval)

        if (bowser.android) window.location = 'https://play.google.com/store/apps/details?id=pw.securelogin'
        if (bowser.mac) window.location = 'https://securelogin.pw/apps/SecureLogin-1.0.0.dmg'
        if (bowser.windows) window.location = 'https://securelogin.pw/apps/SecureLogin Setup 1.0.0.exe'
      }
    }, 200)
  } else {
    var origin = ''

    // ext needs /index.html part
    if (flow === 'web') {
      origin = webOrigin
      window.w = window.open(webOrigin)
    } else {
      origin = extOrigin
      window.w = window.open(extOrigin + '/index.html')
      // no extension? go to install page
      var loadext = setTimeout(function () {
        window.w.location = 'https://chrome.google.com/webstore/detail/securelogin/abpigncghjblhknbbannlhmgjpjpbajj'
      }, 500)
    }

    window.addEventListener('message', function msgListener (e) {
      if (e.origin === origin) {
        if (e.data === 'ping') {
          if (flow === 'ext') clearInterval(loadext)

          e.source.postMessage(query, origin)
        } else {
          cb(e.data)
          window.removeEventListener('message', msgListener)
          window.w.close()
        }
      }
    })
  }

  return false
}
