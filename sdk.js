/* globals bowser, SecureLogin */
window.addEventListener('load', function(){
  var origin = 'https://securelogin.pw'
  var sproxy = document.createElement('iframe')
  sproxy.src = origin + '/s'
  sproxy.style.display='none'
  document.body.appendChild(sproxy)

  window.addEventListener('message', function msgListener (e) {
    if (e.origin === origin) {
      if (['web', 'ext', 'app'].indexOf(e.data.client) != -1){
        var flow = e.data.client
      } else {
        // not a user
        var flow = 'web'
      }
      console.log(e.data.client)
      localStorage.securelogin = flow

      window.removeEventListener('message', msgListener)
    }
  })
})

window.SecureLogin = function (cb, scope) {

  var origin = 'https://securelogin.pw'

  SecureLogin.w = false

  function singleWindow (url) {
    if (SecureLogin.w) {
      SecureLogin.w.location = url
    } else {
      SecureLogin.w = window.open(url)
    }
  }

  function toQuery (obj) {
    return Object.keys(obj).reduce(function (a, k) {
      a.push(encodeURIComponent(k) + '=' + encodeURIComponent(obj[k]))
      return a
    }, []).join('&')
  }

  var useClient = function(flow){
    var opts = {}

    if (SecureLogin.pubkey) opts.pubkey = SecureLogin.pubkey
    if (scope) opts.scope = toQuery(scope)

    var query = toQuery(opts)
    var webOrigin = window.location.host === 'c.dev' ? 'http://securelogin.dev' : 'https://securelogin.pw'
    var extOrigin = 'chrome-extension://abpigncghjblhknbbannlhmgjpjpbajj'

    if (flow === 'app') {
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
          alert("Please make sure SecureLogin app is running")
          clearInterval(slInterval)
        }
      }, 200)
    } else {
      var origin = ''

      // ext needs /index.html part
      if (flow === 'web') {
        origin = webOrigin
        singleWindow(webOrigin)
      } else {
        origin = extOrigin
        singleWindow(extOrigin + '/index.html')
      }

      window.addEventListener('message', function msgListener (e) {
        if (e.origin === origin) {
          if (e.data === 'ping') {
            //if (flow === 'ext') clearInterval(loadext)

            e.source.postMessage(query, origin)
          } else {
            cb(e.data)
            window.removeEventListener('message', msgListener)
            SecureLogin.w.close()
          }
        }
      })
    }
  }

  useClient(localStorage.securelogin)

  return false
}
