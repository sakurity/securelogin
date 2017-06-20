/* global $, nacl, hmac, sign, screen, Profiles, fromQuery, toQuery, show, hide,
          chrome, csv, Benc, Bdec, Udec, secondsFromNow, nodeRequire, XMLHttpRequest,
          e, alert, format, confirm, scryptjs logout, prompt, btoa */

// Weak mode #1
var scryptOpts = [18, 6]

// Recommended mode for v2
// var scryptOpts = [20, 20]

function save () {
  window.localStorage.profiles = JSON.stringify(Profiles)
}

function main () {
  var waitFor = 500
  if (Profiles.length > 0) {
    save()
    listProfiles()

    var L = Profiles[Number(window.localStorage.current_profile)]
    if (L.visited) {
      $('.changefor').value = L.visited.join('\n')
    }
    $('.newemail').value = L.email

    if (window.inweb) {
      if (window.opener) {
        window.addEventListener('message', function (e) {
          var msg = fromQuery(e.data)
          msg.client = e.origin // Force set provider
          messageDispatcher(msg)
        })

        // Notify the opener we are ready
        window.opener.postMessage('ping', '*')
        waitFor = 50
      } else {
        waitFor = 0
      }
    }

    show($('.main-form'))
  } else {
    hide($('.main-form'))
  }

  window.delayed_launch = setTimeout(function () {
    screen('list')
  }, waitFor)
}

function listProfiles (useProfile) {
  if (typeof useProfile === 'undefined') {
    useProfile = window.localStorage.current_profile
  }

  var list = ''
  var usedTitles = []
  for (var i in Profiles) {
    var o = Profiles[i]
    var title = e(o.email)
    if (usedTitles.indexOf(title) !== -1) {
      title += ' (' + o.date.substr(0, 10) + ')'
    } else {
      usedTitles.push(title)
    }
    var selected = (Number(useProfile) === Number(i) ? 'selected' : '')
    list += '<option ' + selected + ' value="' + i + '">' + title + '</option>'
  }

  // All dropdowns have up-to-date list
  document.querySelectorAll('.profilelist').forEach(function (elem) {
    elem.innerHTML = list
  })
}

function getProfile (n) {
  // Clone profile, not modifying it
  var profile = Object.assign({}, Profiles[Number(n)])

  profile.shared_base = hmac(profile.root, 'shared')
  profile.shared_key = nacl.sign.keyPair.fromSeed(Bdec(profile.shared_base))

  return profile
}

// Where everything happens
function messageDispatcher (message) {
  clearTimeout(window.delayed_launch)

  // A few hacks to return UI back to "baseline", if the app was left in another state
  hide('.ios')
  show('.container')
  delete ($('.approve').style['background-color'])

  window.m = message // Store in global variable
  var webURL = /^https?:\/\/[a-z0-9-.]+(:[0-9]{1,5})?$/
  if (window.m.provider && window.m.provider !== window.m.client && window.m.provider.match(webURL)) {
    $('.app').innerHTML = '<h2 class="app-name">' + e(format(window.m.client)) + '</h2><p style="text-align:center">would like access to your account on</p><h2 class="app-name">' + e(format(window.m.provider)) + '</p>'
  } else {
    // By default, the client asks sltoken for itself
    window.m.provider = window.m.client
    $('.app-name').innerText = format(window.m.client)
  }

  if (!window.m.scope) window.m.scope = ''

  var useProfile = false
  if (window.m.pubkey) {
    if (Profiles.length === 0) {
      alert('You have no profiles yet')
      main()
      return false
    } else {
      for (var i in Profiles) {
        if (Benc(getProfile(i).shared_key.publicKey) === window.m.pubkey) {
          useProfile = i
          $('.currentlist').disabled = true
          break
        }
      }

      if (!useProfile) {
        alert('Profile required for this request cannot be found')
        main()
        return false
      }
    }
  } else {
    useProfile = window.localStorage.current_profile
  }

  if (Profiles.length === 0) {
    main()
    return false
  }

  /*
  TODO: SecureLogin server as central authority for email confirmation
  if(window.m.confirmed && !getProfile(useProfile).confirmed){
    alert('Unconfirmed')
  }
  */

  listProfiles(useProfile)

  screen('auth')
  var data = $('.auth-data')
  hide(data)

  var label = ''

  switch (window.m.scope) {
    case '':
      label = 'Sign In'
      break
    case 'mode=delete':
      label = 'Delete This Account'
      $('.approve').style['background-color'] = 'red'
      break
    default:
      var req = fromQuery(window.m.scope)
      if (req.mode === 'change') {
        // We don't want apps signing mode=change manually, users must use profile change page
        alert('mode=change is not allowed')
        return false
      }

      var str = ''
      for (var k in req) {
        str += '<div class="settings-control-group"><label class="settings-control-label">' + e(k) + '</label>' + e(req[k]) + '</div>'
      }
      data.innerHTML = str
      show(data)

      label = (window.m.provider === window.m.client) ? 'Approve' : 'Grant Access'
  }

  $('.approve').innerText = label

  // We try to stop backclickjack for sensitive actions
  var btn = $('.approve')
  if (window.m.scope !== '') {
    hide(btn)
    setTimeout(function () {
      show(btn)
    }, 500)
  }

  btn.onclick = function () {
    hide(btn) // To not click twice

    var val = Number($('.currentlist').value)
    var L = getProfile(val)

    if (!Profiles[val].visited) {
      Profiles[val].visited = []
    }

    // Add once, and doublecheck pw
    if (Profiles[val].visited.indexOf(window.m.provider) === -1) {
      Profiles[val].visited.push(window.m.provider)
      save()

      var milestones = [2, 4, 8, 16]
      var used = Profiles[val].visited.length

      if (milestones.indexOf(used) !== -1) {
        var pw = prompt('Congrats, you already enjoyed SecureLogin ' + used + ' times. Friendly reminder: you must remember your master password at all times. Can you type it again please?')
        if (pw && checksum(pw) === L.checksum) {
          alert('Correct, thanks!')
        } else {
          alert('Incorrect, if you forgot it please change it')
          main()
          return false
        }
      }
    }

    var sltoken = approve(L, window.m.provider, window.m.client, window.m.scope)

    if (window.inweb) {
      window.opener.postMessage(sltoken, window.m.provider)
    } else if (window.E) {
      // IPC to main processor
      window.E.ipcRenderer.send('response', sltoken)
    } else if (window.cordova && window.m.conn) {
      // Bug in WSS - sometimes nothing is sent.
      var attempt = function () {
        window.wsserver.send(window.m.conn, sltoken)
      }

      // wsserver.send(window.m.conn, sltoken)
      attempt()
      setInterval(attempt, 100)

      setTimeout(function () {
        quit()
      }, 1000)
    }
  }
}

function quit () {
  window.wsserver.stop(function (addr, port) {
    setTimeout(function () {
      navigator.app.exitApp()
    }, 200)
  })
}

function allclick (mask, listener) {
  var elements = document.querySelectorAll(mask)
  for (var i = 0; i < elements.length; i++) {
    elements[i].addEventListener('click', listener)
  }
}

function approve (profile, provider, client, scope) {
  var sharedSecret = hmac(profile.shared_base, 'secret:' + provider)
  var toSign = csv([provider, client, scope, secondsFromNow(60)])
  // Email and sharedSecret are shared only on login requests
  var isLogin = (scope === '' && provider === client)
  return csv([
    toSign,
    csv([sign(toSign, Benc(profile.shared_key.secretKey)), hmac(sharedSecret, toSign)]),
    csv([Benc(profile.shared_key.publicKey), isLogin ? sharedSecret : '']),
    isLogin ? profile.email : '' 
  ])
}

function derive (password, email, cb) {
  var opts = {
    N: Math.pow(2, scryptOpts[0]),
    interruptStep: 1000,
    p: scryptOpts[1],
    r: 8,
    dkLen: 32,
    encoding: 'base64'
  }

  if (email === 'smoke@test.test') {
    opts.p = 1
    opts.N = 4
  }

  if (window.E) {
    try {
      window.npm_scrypt = nodeRequire('scrypt')
    } catch (e) {}
  }

  if (window.npm_scrypt) {
    window.npm_scrypt.hash(password, opts, 32, email).then(function (root) {
      cb(root.toString('base64'))
    })
  } else if (email !== 'scryptjs@test.test' && window.plugins && window.plugins.scrypt) {
    // Sometimes we want to make sure native plugin is faster
    window.plugins.scrypt(function (root) {
      cb(hexToBase64(root))
    }, alert, password, email, opts)
  } else {
    scryptjs(password, email, opts, cb)
  }
}

function hexToBase64 (hexstring) {
  return btoa(hexstring.match(/\w{2}/g).map(function (a) {
    return String.fromCharCode(parseInt(a, 16))
  }).join(''))
}

function checksum (str) {
  return Benc(nacl.hash(Udec(str))).substr(0, 2)
}

function status (msg) {
  var p = document.createElement('p')
  p.innerHTML = msg
  $('.status').appendChild(p)
}

window.onload = function () {
  // Event listeners
  $('.defaultlist').onchange = function () {
    window.localStorage.current_profile = this.value
    main()
  }

  function legacypw () {
    var base = getProfile(window.localStorage.current_profile).shared_base
    var pw = hmac(base, $('.managerprovider').value.toLowerCase())
    pw = pw.replace(/[=/+]/g, '').slice(0, 12) + '!'
    $('.managerpassword').value = pw
  }

  $('.managerprovider').oninput = legacypw

  $('.managerpassword').onclick = function () {
    $('.managerpassword').select()
    document.execCommand('copy')
    show('.copymessage')
    setTimeout(function () {
      hide('.copymessage')
    }, 1000)
  }

  if (window.chrome && window.chrome.tabs) {
    // Autofill if in ext
    chrome.tabs.query({
      active: true
    }, function (t) {
      // Get origin and copy
      if (t[0].url.indexOf('http') === 0) {
        $('.managerprovider').value = t[0].url.split('/')[2]
        legacypw()
        setTimeout(function () {
          $('.managerpassword').click()
          window.close()
        }, 100)
      }
    })
    chrome.runtime.onInstalled.addListener(function (details) {
      if (details.reason === 'install') {
        console.log('This is a first install!')
      } else if (details.reason === 'update') {
        var thisVersion = chrome.runtime.getManifest().version
        console.log('Updated from ' + details.previousVersion + ' to ' + thisVersion + '!')
      }
    })
  }

  $('.real-sign-in').onclick = function generation () {
    var errors = ''
    var password = $('#password').value
    var email = $('#login').value.toLowerCase()
    var emailRegex = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9-]+(?:\.[a-zA-Z0-9-]+)*$/

    if (!emailRegex.test(email)) {
      errors += 'Invalid email. '
    }

    if (password.length < 8) {
      errors += 'Password must be at least 8 characters. '
    }

    Profiles.map(function (e) {
      if (e.email === email) {
        errors += 'You already used this email for another profile. '
      }
    })

    if (errors.length > 0) {
      alert(errors)
      return false
    }

    $('#password').value = ''

    screen('generation')

    show('.step1')
    hide('.step2')

    setTimeout(function () {
      var startDerive = new Date()
      derive(password, email, function (root) {
        // Send stats about current device and derivation benchmark

        var newProfile = {
          email: email,
          root: root,
          date: new Date().toJSON(),
          benchmark: new Date() - startDerive,
          scrypt_opts: scryptOpts.join(','),
          visited: []
        }

        /*
        Don't store too much, it's only for Doublecheck
        currently it gives out 12 bits of the hash
        i.e. it's 4096 times easier to bruteforce...
        but checksum isn't supposed to leave the device
        and is as confidential as the root itself
        */
        newProfile.checksum = checksum(password)

        hide($('.step1'))
        show($('.step2'))

        $('.accept-rules').onclick = function () {
          window.localStorage.current_profile = Profiles.push(newProfile) - 1
          main()
        }
        if (Profiles.length > 0) {
          // Already accepted
          $('.accept-rules').click()
        }
      })
    }, 50)
  }

  $('#password').onkeypress = function (e) {
    if (e.which === 13) {
      e.preventDefault()
      $('.real-sign-in').click()
    }
  }

  allclick('.native', function (event) {
    if (this.href.indexOf('chrome.google.com') !== -1) {
      window.localStorage.client = 'ext'
    } else {
      window.localStorage.client = 'app'
    }
  })

  allclick('.back', main)

  $('.changeprofile').onclick = function () {
    screen('change')
  }

  $('.changeconfirm').onclick = function () {
    var newpw = $('.newpw').value
    var newemail = $('.newemail').value
    var providers = $('.changefor').value.split('\n')
    // TODO: validate
    if (confirm("You won't be able to use profile created with old password anymore. Are you sure?")) {
      var n = Number(window.localStorage.current_profile)
      var oldProfile = getProfile(n)
      var newProfile = Object.assign({}, Profiles[n])

      status('Please wait, generating new key...')

      derive(newpw, newemail, function (root) {
        newProfile.root = root // updated root
        newProfile.email = newemail // updated root
        newProfile.shared_base = hmac(newProfile.root, 'shared')
        newProfile.shared_key = nacl.sign.keyPair.fromSeed(Bdec(newProfile.shared_base))
        var awaitRequests = providers.length

        for (var i = 0; i < providers.length; i++) {
          var p = providers[i]
          if (p.indexOf('http') !== 0) {
            p = 'https://' + p
          }

          var newToken = toQuery({
            mode: 'change',
            to: approve(newProfile, p, p, '')
          })

          var changeToken = approve(oldProfile, p, p, newToken);

          (function(provider){
            var xhr = new XMLHttpRequest()
            xhr.open('POST', provider + '/securelogin')
            xhr.setRequestHeader('Content-type', 'application/x-www-form-urlencoded')

            var formatted = e(format(provider))
            xhr.onload = function () {
              console.log(provider, xhr.responseText)

              if (xhr.responseText) {                  
                var msg = ({
                  changed: 'Changed',
                  not_found: 'User is not found',
                  invalid_request: 'Invalid request',
                  invalid_token: 'Invalid token',
                  pubkey_exist: 'This user already exists'
                })[xhr.responseText]

                status(formatted + ' - ' + msg)

                if (--awaitRequests == 0){
                  status('Done')
                  Profiles[n].root = newProfile.root
                  Profiles[n].email = newProfile.email
                  Profiles[n].checksum = checksum(newpw)
                  save()
                }
              }
            }
            xhr.onerror = function () {
              status(formatted + ' - Error, try again later')
            }
            xhr.send('sltoken=' + encodeURIComponent(changeToken))
          })(p)


        }

      })
    }
  }

  $('.logoutprofile').onclick = logout

  window.inweb = ['http:', 'https:', 'chrome-extension:'].indexOf(window.location.protocol) !== -1
  window.Profiles = window.localStorage.current_profile ? JSON.parse(window.localStorage.profiles) : []

  if (window.inweb && window.location.protocol !== 'chrome-extension:') {
    // Do something
  } else {
    hide($('.in-web'))
  }

  main()

  derive('password','smoke@test.test', function (smoketest) {
    if(smoketest !== 'm96n+NWlQB5oRLJQjfy0jzHLmKrhuYXNcWQyesyMnwA='){
      document.write("This platform is not supported, please contact info@sakurity.com with details about your device")
    }
  })
  


}

document.addEventListener('deviceready', function () {
  /*
  httpd = ( cordova && cordova.plugins && cordova.plugins.CorHttpd ) ? cordova.plugins.CorHttpd : null;
  httpd.getURL(function(url){
    if(url.length > 0) {
      console.log("running",url)
    } else {
      httpd.startServer({
        'www_root': 'proxy',
        'port': 3102,
        'localhost_only': true
      }, function(url) {
        console.log(url)
      }, function(error) {
        console.log(error)
      })
    }
  });
  */

  window.wsserver = window.cordova.plugins.wsserver
  var trustedProxy = 'http://127.0.0.1:3102'
  console.log('try start')
  window.wsserver.start(3101, {
    'onFailure': function (addr, port, reason) {
      console.log('failure ' + addr + port + reason)
    },
    'onOpen': function (conn) {
      // Only local requests accepted
    },
    'onMessage': function (conn, trusted) {
      if (isLocalhost(conn.remoteAddr) && conn.httpFields.Origin) {
        var trustedJSON = JSON.parse(trusted)
        if (trustedJSON.data === 'close') {
          quit()
        } else {
          var trustedMSG = fromQuery(trustedJSON.data)

          // Trusted
          if (conn.httpFields.Origin === trustedProxy) {
            trustedMSG.client = trustedJSON.origin
          } else {
            trustedMSG.client = conn.httpFields.Origin
          }
          // Pass over current conn
          trustedMSG.conn = conn
          messageDispatcher(trustedMSG)
        }
        return false
      }
    },
    'onClose': function (conn, code, reason) {
      quit()
      console.log('disconnected ' + conn.remoteAddr)
    },
    'tcpNoDelay': true
  }, function onStart (addr, port) {
    console.log('server ' + addr + port)
  }, function onDidNotStart (reason) {
    alert('server failed ' + reason)
  })
})

function isLocalhost (ip) {
  return ['127.0.0.1', '::ffff:127.0.0.1', '::1'].indexOf(ip) !== -1 || ip.indexOf('::ffff:127.0.0.1:') === 0
}

window.handleOpenURL = function (arg) {
  clearTimeout(window.delayed_launch)
}

try {
  window.nodeRequire = require
  delete window.require
  delete window.exports
  delete window.module

  window.E = nodeRequire('electron')

  window.E.ipcRenderer.on('verifiedRequest', function (event, arg) {
    clearTimeout(window.delayed_launch)
    var hash = fromQuery(arg.request)
    hash.client = arg.client
    messageDispatcher(hash)
  })
} catch (e) {
  window.E = false
}
