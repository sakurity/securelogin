// Weak mode #1
scrypt_opts = [18, 6]

// Recommended mode for v2
// scrypt_opts = [20, 20]


function save(){
  localStorage.profiles = JSON.stringify(Profiles)
}

function main(){
  var await_for = 500
  if(Profiles.length > 0){
    save()
    listProfiles()


    var visited = Profiles[Number(localStorage.current_profile)].visited
    if(visited){
      $('.changefor').value = visited.join("\n")
    }

    if(inweb){
      if(opener){
        window.addEventListener('message', function(e){
          var msg = fromQuery(e.data)
          msg.client = e.origin //force set provider
          messageDispatcher(msg)
        })

        //notify the opener we are ready
        opener.postMessage('ping','*')
        await_for = 50
      }else{
        await_for = 0
      }
    }

    show($('.main-form'))

  }else{
    hide($('.main-form'))
  }

  window.delayed_launch = setTimeout(function(){
    screen('list')
  },await_for)
}



function listProfiles(use_i){
  if(typeof use_i == 'undefined'){
    use_i = localStorage.current_profile
  }

  var list = ''
  var used_titles = []
  for(var i in Profiles){
    var o = Profiles[i]
    var title = e(o.email) //
    if(used_titles.indexOf(title) != -1){
      title += " ("+o.date.substr(0,10)+')'
    }else{
      used_titles.push(title);
    }

    list += '<option '+(Number(use_i) == i ? 'selected' : '')+' value="'+i+'">'+title+'</option>'
  }
  // all dropdowns have up-to-date list
  document.querySelectorAll('.profilelist').forEach(function(elem){
    elem.innerHTML = list
  })
}



function getProfile(n){
  //clone profile, not modifying it
  var profile = Object.assign({}, Profiles[Number(n)])

  profile.shared_base = hmac(profile.root, 'shared');
  profile.shared_key = nacl.sign.keyPair.fromSeed( Bdec(profile.shared_base) )

  return profile
}



// where everything happens
function messageDispatcher(message){
  clearTimeout(window.delayed_launch)

  // few hacks to return UI back to "baseline", if the app was left in another state
  hide('.ios')
  show('.container')
  delete($('.approve').style['background-color'])

  m = message // store in global variable
  var web_url = /^https?:\/\/[a-z0-9-\.]+(:[0-9]{1,5})?$/
  if( m.provider && m.provider != m.client && m.provider.match(web_url)){
    $('.app').innerHTML = '<h2 class="app-name">'+e(format(m.client))+'</h2><p style="text-align:center">would like access to your account on</p><h2 class="app-name">'+e(format(m.provider))+"</p>"
  }else{
    // by default the client asks sltoken for itself
    m.provider = m.client
    $('.app-name').innerText = format(m.client)
  }

  if(!m.scope) m.scope = ''
  
  var use_i = false
  if(m.pubkey){
    if(Profiles.length == 0){
      alert("You have no profiles yet")
      main()
      return false
    }else{ 
      for(var i in Profiles){
        if(Benc(getProfile(i).shared_key.publicKey) == m.pubkey){
          use_i = i;
          $('.currentlist').disabled = true
          break;
        }
      }

      if(!use_i){
        alert("Profile required for this request cannot be found")
        main()
        return false;
      }
    }

  }else{
    use_i = localStorage.current_profile
  }

  if(Profiles.length == 0){
    main();
    return false;
  }

  /*
  TODO: SecureLogin server as central authority for email confirmation
  if(m.confirmed && !getProfile(use_i).confirmed){
    alert("Unconfirmed")
  }
  */

  listProfiles(use_i);



  screen('auth')
  data = $('.auth-data')
  hide(data)


  switch(m.scope) {
    case '': 
      label = 'Sign In'
      break
    case 'mode=delete': 
      label = 'Delete This Account'
      $('.approve').style['background-color'] = 'red'    
      break
    default:
      var req = fromQuery(m.scope)
      if(req.mode == 'change'){
        // we don't want apps signing mode=change manually, users must use profile change page
        alert('mode=change is not allowed')
        return false;
      }

      var str = ''
      for(var k in req){
        str+='<div class="settings-control-group"><label class="settings-control-label">'+e(k)+'</label>'+e(req[k])+'</div>'
      }
      data.innerHTML = str;
      show(data)

      label = (m.provider == m.client) ? 'Approve' : 'Grant Access'
    
  }
  
  $(".approve").innerText = label

  //We try to stop backclickjack for sensitive actions
  btn = $('.approve')
  if(m.scope != ''){
    hide(btn)
    setTimeout(function(){
      show(btn)
    }, 500)
  }

  btn.onclick = function(){
    hide(btn) // to not click twice

    var val = Number($('.currentlist').value)
    L = getProfile(val);

    if(!Profiles[val].visited){
      Profiles[val].visited = []
    }
    
    // add once, and doublecheck pw
    if(Profiles[val].visited.indexOf(m.provider) == -1){
      Profiles[val].visited.push(m.provider)
      save()
      console.log('saving new visited provider')

      var doublecheck_milestones = [2, 4, 8, 16]
      var used = Profiles[val].visited.length

      if(doublecheck_milestones.indexOf(used) != -1){
        var pw = prompt("Congrats, you already enjoyed SecureLogin "+used+" times. Friendly reminder: you must remember your master password at all times. Can you type it again please?")
        if(pw && checksum(pw) == L.checksum){
          alert("Correct, thanks!")
        }else{
          alert("Incorrect, if you forgot it please change it")
          main()
          return false;
        }
      }
    }

    var sltoken = approve(L, m.provider, m.client, m.scope)

    if(inweb){
      opener.postMessage(sltoken, m.provider)
    }else if(E){
      //ipc to main processor
      E.ipcRenderer.send('response', sltoken)
    } else if(window.cordova && m.conn){
      //Bug in WSS - sometimes nothing is sent. 
      console.log('sending ',sltoken,m.conn)
      var attempt = function(){
        wsserver.send(m.conn, sltoken);
      }

      //wsserver.send(m.conn, sltoken);
      attempt()
      setInterval(attempt, 100)

      setTimeout(function(){
        quit()
      }, 1000)

    }
  }
}

function quit(){
  wsserver.stop(function(addr, port) {
    console.log('Stopped listening on %s:%d', addr, port);
    setTimeout(function(){
      navigator.app.exitApp()
    },200)
  });  
}

function approve(profile, provider, client, scope){
  var shared_secret = hmac( profile.shared_base , "secret:"+provider)
  var to_sign = csv([provider, client, scope, secondsFromNow(60)])
  return csv([
      to_sign,
      csv([sign(to_sign, Benc(profile.shared_key.secretKey)), hmac(shared_secret, to_sign)]),
      csv([Benc(profile.shared_key.publicKey), (provider == client) ? shared_secret : '']), // we don't leak shared_secret to Connect requests
      profile.email
    ])
}


function derive(password, email, cb){
  var opts = {
    N: Math.pow(2,scrypt_opts[0]),
    interruptStep: 1000,
    p: scrypt_opts[1],
    r: 8,
    dkLen: 32,
    encoding: 'base64'
  }  //1 1 cinii


  if(E){
    try{
      // no success compiling scrypt for windows
      window.npm_scrypt = nodeRequire("scrypt")
    }catch(e){}
  }

  if(window.npm_scrypt){
    npm_scrypt.hash(password,opts,32,email).then(function(root){cb(root.toString("base64"))})
  }else if(email!='force@scrypt.com' && window.plugins && window.plugins.scrypt){
    // sometimes we want to make sure native plugin is faster
    window.plugins.scrypt(function(root){cb(hexToBase64(root))}, alert, password, email, opts)
  }else{
    scryptjs(password, email, opts, cb)
  }

}


function hexToBase64(hexstring) {
    return btoa(hexstring.match(/\w{2}/g).map(function(a) {
        return String.fromCharCode(parseInt(a, 16));
    }).join(""));
}

function checksum(str){
  return Benc( nacl.hash( Udec(str) )).substr(0,2)
}




window.onload = (function(){
  // event listeners
  $('.defaultlist').onchange = function(){
    localStorage.current_profile=this.value;
    main()
  }

  legacypw = function(){
    var base = getProfile(localStorage.current_profile).shared_base
    var pw = hmac(base, $('.managerprovider').value.toLowerCase() )
    pw = pw.replace(/[=\/+]/g,'').slice(0,12) + "!"
    $('.managerpassword').value = pw
  }
  $('.managerprovider').oninput = legacypw
  
 
  $('.managerpassword').onclick=function(){
    $('.managerpassword').select();
    document.execCommand('copy');
    show('.copymessage');
    setTimeout(function(){
      hide('.copymessage')
    },1000)
  }

  if(window.chrome && window.chrome.tabs){
    // autofill if in ext
    chrome.tabs.query({active:true},function(t){
      // get origin and copy
      if(t[0].url.indexOf('http')==0){
        $('.managerprovider').value=t[0].url.split('/')[2];
        legacypw();
        setTimeout(function(){
          $('.managerpassword').click();
          window.close()
        },100)
      }

    })
    chrome.runtime.onInstalled.addListener(function(details){
      if(details.reason == "install"){
        console.log("This is a first install!");
      }else if(details.reason == "update"){
        var thisVersion = chrome.runtime.getManifest().version;
        console.log("Updated from " + details.previousVersion + " to " + thisVersion + "!");
      }
    });
  }

  $('.real-sign-in').onclick = function generation(){
    var errors = '';
    var password = $('#password').value;
    var email = $('#login').value.toLowerCase()
    var email_regex = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9-]+(?:\.[a-zA-Z0-9-]+)*$/

    if(!email_regex.test(email)){
      errors += 'Invalid email. '
    }

    if(password.length < 8){
      errors += 'Password must be at least 8 characters. '
    }

    Profiles.map(function(e){ if(e.email == email){ errors += "You already used this email for another profile. "}  })

    if(errors.length > 0){
      alert(errors);
      return false;
    }
      
    $('#password').value = ''

    screen('generation');

    show('.step1')
    hide('.step2')

    setTimeout(function(){ 
      var start_derive = new Date
      derive(password, email, function(root){
        // send stats about current device and derivation benchmark

        new_profile = {
          email: email,
          root: root,
          date: new Date().toJSON(),
          benchmark: new Date-start_derive,
          scrypt_opts: scrypt_opts.join(','),
          visited: []
        }

        /*
        don't store too much, it's only for Doublecheck
        currently it gives out 12 bits of the hash
        i.e. it's 4096 times easier to bruteforce...
        but checksum isn't supposed to leave the device 
        and is as confidential as the root itself
        */
        new_profile.checksum = checksum(password)

        hide($('.step1'))
        show($('.step2'))

        $('.accept-rules').onclick = function(){
          localStorage.current_profile = Profiles.push(new_profile) - 1;
          main()
        }
        if(Profiles.length > 0){
          // already accepted
          $('.accept-rules').click()
        }

      })
    },50)
  }

  password.onkeypress=function(e) {
    if (e.which == 13) {
      e.preventDefault();
      $('.real-sign-in').click();
    }
  }

  var native = document.querySelectorAll('.native')
  for (var i = 0; i < native.length; i++) {
    native[i].addEventListener('click', function(event) {
      if(this.href.indexOf('chrome.google.com') != -1){
        localStorage.client = 'ext'
      }else{
        localStorage.client = 'app'
      }
      console.log('enabled native')

    });
  }




  $('.changeprofile').onclick = function(){
    screen('change')
  }

  $('.changeconfirm').onclick = function(){
    var newpw = $('.newpw').value
    var providers = $('.changefor').value.split("\n")

    if(confirm("You won't be able to use profile created with old password anymore. Are you sure?")){
      var n=Number(localStorage.current_profile)
      var old_profile = getProfile(n)
      var new_profile = Object.assign({}, Profiles[n])

      changestatus.innerHTML += '<tr><td>Please wait, generating new key...</td><td></td></tr>'

      derive(newpw, old_profile.email, function(root){
        new_profile.root = root // updated root
        new_profile.shared_base = hmac(new_profile.root, 'shared');
        new_profile.shared_key = nacl.sign.keyPair.fromSeed( Bdec(new_profile.shared_base) )

        for(var i =0;i<providers.length;i++){
          var p = providers[i]
          if(p.indexOf('http')!=0){
            p = 'https://'+p
          }

          var new_sltoken = approve(new_profile, p, p, '')
          var change_sltoken = approve(old_profile, p, p, toQuery({mode: 'change', to: new_sltoken}))

          var xhr = new XMLHttpRequest()

          //sync for now to not make a lot of requests at once
          xhr.open('GET', p+'/securelogin?sltoken='+encodeURIComponent(change_sltoken), true)
          xhr.onreadystatechange=function(){
            if(xhr.readyState == 4){
              
              console.log(xhr.response)
              status = ({
                changed: "Changed",
                not_found: "User is not found",
                invalid_request: "Invalid request",
                invalid_token: "Invalid token",
                pubkey_exist: "This user already exists"
              })[xhr.response]

              changestatus.innerHTML += '<tr><td>'+e(format(p))+'</td><td>'+e(status)+'</td></tr>'

            }
          }
          xhr.send()

 
        }

        // TODO: need to make sure if some provider is down, profile is not changed
        // backup old key?

        Profiles[n].root = new_profile.root;
        save()



      })      

    }
  }

  $('.logoutprofile').onclick = logout

  window.inweb = ['http:','https:','chrome-extension:'].indexOf(location.protocol) != -1
  window.Profiles = localStorage.current_profile ? JSON.parse(localStorage.profiles) : []

  if(inweb && location.protocol != 'chrome-extension:'){
  }else{
    hide($('.in-web'));
  }

  main()

  // smoke test. Previously Samsung returned wrong Scrypt hashes.
  //if(window.plugins){
  //  window.plugins.scrypt(function (res) { window.testscrypt = res; },function (err) { alert(err) },'password', 'salt', {N: 2})
  //}

    

})

document.addEventListener('deviceready',function(){ 
  /*
  httpd = ( cordova && cordova.plugins && cordova.plugins.CorHttpd ) ? cordova.plugins.CorHttpd : null;
  httpd.getURL(function(url){
    if(url.length > 0) {
      console.log("running",url)
    } else {
        httpd.startServer({
          'www_root' : 'proxy',
          'port' : 3102,
          'localhost_only' : true
        }, function( url ){
          console.log(url)
        }, function( error ){
          console.log(error)
        });
    }
    
  });
  */
  
  window.wsserver = window.cordova.plugins.wsserver
  trusted_proxy = 'http://127.0.0.1:3102'
  l('try start')
  wsserver.start(3101, {
    'onFailure' :  function(addr, port, reason) {
      l("failure "+addr+ port+ reason);
    },
    'onOpen' : function(conn) {
      // only local requests accepted

    },
    'onMessage' : function(conn, trusted) {
      console.log("message ",trusted)
      if(isLocalhost(conn.remoteAddr) && conn.httpFields.Origin){
        var trusted_json = JSON.parse(trusted)
        if(trusted_json.data == 'close'){
          quit()
        }else{
          var trusted_msg = fromQuery(trusted_json.data)
          
          //Trusted
          if(conn.httpFields.Origin == trusted_proxy){
            trusted_msg.client = trusted_json.origin
          }else{
            trusted_msg.client = conn.httpFields.Origin
          }
          //pass over current conn
          trusted_msg.conn = conn
          messageDispatcher(trusted_msg)
        }
        return false
      }
    },
    'onClose' : function(conn, code, reason) {
      quit()
      l('disconnected '+conn.remoteAddr);
    },
    'tcpNoDelay' : true    
  }, function onStart(addr, port) {
      l("server "+addr+port);
  }, function onDidNotStart(reason) {
      alert("server failed "+reason);
  });

})



function isLocalhost(ip){
  return ['127.0.0.1', '::ffff:127.0.0.1', '::1'].indexOf(ip) != -1 || ip.indexOf('::ffff:127.0.0.1:') == 0
}

window.handleOpenURL = function(arg) {
  clearTimeout(window.delayed_launch)
}


try{
  window.nodeRequire = require;
  delete window.require;
  delete window.exports;
  delete window.module;

  E = nodeRequire('electron')

  E.ipcRenderer.on('verifiedRequest', function(event, arg){
    clearTimeout(window.delayed_launch)
    var hash = fromQuery(arg.request)
    hash.client = arg.client
    messageDispatcher(hash)
  })
}catch(e){
  E = false
}

