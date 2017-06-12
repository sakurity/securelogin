// Weak mode #1
scrypt_opts = [18, 6]

// Recommended mode for v2
// scrypt_opts = [20, 20]


function save(){
  localStorage.profiles = JSON.stringify(Profiles)
}

function main(){
  var await_for = 1000
  if(Profiles.length > 0){
    save()
    listProfiles()


    var visited = Profiles[Number(localStorage.current_profile)].visited
    //$('.tolist>option[value="'+from+'"]')
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


function logout(){
  if(confirm("You will not lose any data, but you will have to enter same email & password to log in this profile again")){
    if(Profiles.length > 1){
      Profiles.splice(Number(localStorage.current_profile), 1)
      localStorage.current_profile = Object.keys(Profiles)[0]
      main()
    }else{
      localStorage.clear()
      location.hash = ''
      location.reload()
    }
  }
}


function redirect(uri){
  var test_uri = uri.replace(/[^a-zA-Z:]/g,'');
  if(test_uri.match(/^(javascript|data|mailto|securelogin):/) ){
    console.log(uri+" is invalid URI");
    return false;
  }else{
    l("Redirecting to "+uri);
  }

  if(E){
    E.shell.openExternal(uri);
  }else{
    location = uri
  }
}

function l(a){
  console.log(a)
}

function secondsFromNow(seconds){
  return (Math.floor(new Date / 1000)) + seconds
}

// escape HTML entities

var entityMap = {
  "&": "&amp;",
  "<": "&lt;",
  ">": "&gt;",
  '"': '&quot;',
  "'": '&#39;',
  "/": '&#x2F;'
};

function e(string) {
  return String(string).replace(/[&<>"'\/]/g, function (s) {
    return entityMap[s];
  });
}

// escaped CSV, JSON would be overhead

function csv(str){
  if(str instanceof Array){
    return str.map(function(el){
      return el.toString().replace(/[%,]/g,function(f){
        return f=='%'?'%25':'%2C'
      })
    }).join(',')
  }else{
    return str.split(',').map(function(el){
      return el.replace(/(%25|%2C)/g,function(f){
        return f=='%25'?'%':','
      })
    })
  }
}


function getRandomValues(num){
  return window.crypto.getRandomValues(new Uint8Array(num))
}

// DOM manipulation short cuts

function $(id){
  return document.querySelector(id);
}

function $$(id){
  return document.querySelectorAll(id);
}

function hide(el){
  if(typeof el == 'string') el=$(el)
  el.style.display='none'
}

function show(el){
  if(typeof el == 'string') el=$(el)
  el.style.display='block'
}

// primarily used for `scope`

toQuery=function(obj) {
  return Object.keys(obj).reduce(function(a,k){a.push(k+'='+encodeURIComponent(obj[k]));return a},[]).join('&')
}

var whitelist = 'provider client scope expire_at confirmed callback state'.split(' ')

fromQuery=function(str) {
  if(typeof str != 'string' || str=='') return {}
  var o = {};
  str.split('&').map(function(pair){
    var pair = pair.split('=');
    o[decodeURIComponent(pair[0])]=decodeURIComponent(pair[1]);
  })
  return o;
}

// to Uint8Array/Base64 and back

function Benc(str){
  return nacl.util.encodeBase64(str);
}

function Bdec(str){
  return nacl.util.decodeBase64(str);
}

function Uenc(str){
  return nacl.util.encodeUTF8(str);
}

function Udec(str){
  return nacl.util.decodeUTF8(str);
}

// crypto short cuts

function hmac(secret, message){
  return Benc(nacl.auth(Udec(message), Bdec(secret)))
}

function sign(message, priv){
  return Benc(nacl.sign.detached(Udec(message),Bdec(priv)))
}


function screen(label){
  //show($('.container'))
  var conts = $$('.screen')
  for(var i=0;i<conts.length;i++){
    if(conts[i].classList.contains(label)){
      show(conts[i])
    }else{
      hide(conts[i])
    }
  }
}

function format(origin){
  var formatted = origin.split('/')[2];
  return formatted[0].toUpperCase() + formatted.substr(1);
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
    }, 800)
  }

  btn.onclick = function(){
    var val = Number($('.currentlist').value)
    L = getProfile(val);
    console.log(val)


    if(!Profiles[val].visited){
      Profiles[val].visited = []
    }
    
    // add once
    if(Profiles[val].visited.indexOf(m.provider) == -1){
      Profiles[val].visited.push(m.provider)
      save();
    }

    var sltoken = approve(L, m.provider, m.client, m.scope)

    if(inweb){
      opener.postMessage(sltoken, m.provider)
    }else if(E){
      //ipc to main processor
      E.ipcRenderer.send('response', sltoken)
    } else if(window.cordova && m.conn){
      wsserver.send(m.conn, sltoken)
      if(window.device && window.device.platform == 'iOS'){
        // on exit iOS returns to Home screen, not the app
        hide('.container')
        show('.ios')
      }else{
        quit
      }
    }
  }
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



function quit(){
  setTimeout(function(){  
    if (navigator.app) {
      navigator.app.exitApp();
    } else if (navigator.device) {
      navigator.device.exitApp();
    } else {
      window.close();
    }
  },300)
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


  $('.loaddev').onclick = function(){
    if(localStorage.current_profile && confirm("Open experimental features?")){
      show($('.dev'))

      var s = document.createElement('script')
      s.src = 'js/experimental.js'
      document.body.appendChild(s)    
    }
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

    Profiles.map(function(e){ if(e.email == email){
      // we technically can have many profiles with equal email
      // but does average user need such compartmentation?
      // to prevent "email [2]" labels

      errors += "You already used this email for another profile. "}  
    })

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

        // don't store too much, it's only for Doublecheck
        new_profile.checksum = Benc( nacl.hash( Udec(password+','+email) )).substr(0,3)

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

      localStorage.client = 'securelogin://'
      console.log('enabled')

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

  /*
  $('.enableweb').onclick = function(){
    // this popup is considered annoying?
    //if(confirm("SecureLogin Web client is much slower and less secure, try to install native app instead. Are you sure?")){
      show($('.login-form'))
      delete(localStorage.client)
    //}
  }*/


  window.inweb = ['http:','https:','chrome-extension:'].indexOf(location.protocol) != -1
  window.Profiles = localStorage.current_profile ? JSON.parse(localStorage.profiles) : []

  if(inweb && location.protocol != 'chrome-extension:'){
    
    if(location.hash=='#native'){
      // proxy to native app
      screen('generation')
      hide($('.step1'))
      hide($('.step2'))
      return false
    }


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


  window.wsserver = window.cordova.plugins.wsserver
  trusted_proxy = 'http://127.0.0.1:3102'
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
        return false
      }
    },
    'onClose' : function(conn, code, reason) {
      l('disconnected '+conn.remoteAddr);
    },
    'tcpNoDelay' : true    
  }, function onStart(addr, port) {
      //l("server "+addr+port);
  }, function onDidNotStart(reason) {
      alert("server failed "+reason);
  });

})



function isLocalhost(ip){
  return ['127.0.0.1', '::ffff:127.0.0.1', '::1'].indexOf(ip) != -1 || ip.indexOf('::ffff:127.0.0.1:') == 0
}