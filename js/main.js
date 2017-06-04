// Weak mode #1
scrypt_opts = [18, 6]

// Recommended mode for v2
// scrypt_opts = [20, 20]


function main(){
  if(Profiles.length > 0){
    localStorage.profiles = JSON.stringify(Profiles)

    var list = ''
    for(var i in Profiles){
      var o = Profiles[i]
      var title = e(o.email) //+" ("+o.date.substr(0,10)+')'
      list += '<option '+(Number(localStorage.current_profile) == i ? 'selected' : '')+' value="'+i+'">'+title+'</option>'
    }
    profilesmain.innerHTML = list
    show($('.main-form'))
    show($('.login-form'))

  }else{
    hide($('.main-form'))
  }

  screen('list')
}



function getProfile(n){
  //clone profile, not modifying it
  var profile = Object.assign({}, Profiles[Number(n)])

  profile.shared_base = hmac(profile.root, 'shared');
  profile.shared_key = nacl.sign.keyPair.fromSeed( Bdec(profile.shared_base) )

  return profile
}

function listProfiles(selected){
  if(!selected){
    selected = localStorage.current_profile
  }
  var list = ''
  for(var i in Profiles){
    var o = Profiles[i]

    // do we allow two profiles with equal Email? How to make them differ?
    var title = e(o.email) //+", added on "+o.date.substr(0,10) )

    list += '<option '+(Number(selected) == i ? 'selected' : '')+' value="'+i+'">'+title+'</option>'
  }
  show($('.profiles'))
  profilelist.innerHTML = list
}

function changeProfiles(except){
  var list = ''
  for(var i in Profiles){
    var o = Profiles[i]
    var title = e(o.email)

    if(Number(except) != i)
    list += '<option value="'+i+'">'+title+'</option>'
  }
  show($('.changeprofiles'))
  changeprofilelist.innerHTML = list
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
    alert(uri+" is invalid URI");
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

fromQuery=function(str) {
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
  // back to "baseline", if the app was left in another state

  hide('.ios')
  show('.container')



  m = message // store in global variable

  var errors = [];
  var web = /^https?:\/\/[a-z0-9-\.]+(:[0-9]{1,5})?$/
  var web_url = /^https?:\/\/[a-z0-9-\.]+(:[0-9]{1,5})?/
  if(m.provider){
    if(!m.provider.match(web)){
      errors.push('provider is not a website');
    }
    if(m.provider.length > 1000){
      errors.push('provider is longer than 1000');
    }
    $('.app-name').innerText = format(m.provider)

  }else{
    errors.push('provider is required. ')
  }

  third_party = false
  if(m.client){
    if(m.client.match(web_url) && m.client.length < 1000){

      if(format(m.client) != format(m.provider)){
        third_party = true
        //$('.app-name').innerHTML = e(format(m.client))+"<p>would like access to</p>"+e(format(m.provider))
        $('.app').innerHTML = '<h2 class="app-name">'+e(format(m.client))+'</h2><p style="text-align:center">would like access to</p><h2 class="app-name">'+e(format(m.provider))+"</p>"
      }
    }else{
      errors.push('Invalid client. ')
    }
  }else{
    m.client = m.provider + '/securelogin'
  }

  if(m.callback!='ping'){
    m.callback = 'direct'
  }

  if(m.scope){
    if(m.scope.length > 10000){
      errors.push("scope to sign is longer than 10000.")
    }
  }else{
    m.scope = ''
  }

  var use_i = false
  if(m.pubkey){
    if(Profiles.length == 0){
      alert("You have no profiles yet")
      main()
      return false
    }else{ 
      var debug =  "need "+m.pubkey+', got '

      for(var i in Profiles){
        debug += Benc(getProfile(i).shared_key.publicKey) +", ";
        if(Benc(getProfile(i).shared_key.publicKey) == m.pubkey){
          use_i = i;
          profilelist.disabled = true
          break;
        }
      }

      if(!use_i){
        alert("Profile required for this request cannot be found ("+debug+")")
        main()
        return false;
      }
    }

  }else{
    use_i = localStorage.current_profile
  }

  if(Profiles.length == 0){
    errors.push("You don't have SecureLogin profiles")
  }

  /*
  TODO: SecureLogin server as central authority for email confirmation
  if(m.confirmed && !getProfile(use_i).confirmed){
    alert("Unconfirmed")
  }
  */

  listProfiles(use_i);

  if(errors.length > 0){
    alert(errors.join(' '));
    return false;
  }



  screen('auth')
  data = $('.auth-data')
  hide(data)


  switch(m.scope) {
    case '': 
      label = 'Sign In'
      break
    case 'mode=change': 
      label = 'Change SecureLogin'
      if(Profiles.length == 1){
        alert("You only have one profile, if you want to change it you need to add another SecureLogin profile");
        location.reload()
        return false;

      }else{
        changeProfiles(use_i) 
      }
      break
    case 'mode=delete': 
      label = 'Delete This Account'
      $('.approve').style['background-color'] = 'red'    
      break
    default:
      var req = fromQuery(m.scope)
      var str = ''
      for(var k in req){
        str+='<div class="settings-control-group"><label class="settings-control-label">'+e(k)+'</label>'+e(req[k])+'</div>'
      }
      data.innerHTML = str;
      show(data)

      label = third_party ? 'Grant Access' : 'Approve'
    
  }
  
  $(".approve").innerText = label

  $(".approve").onclick = function(){
    L = getProfile(profilelist.value);

    var diff = new Date() - load_date;
    if(diff < 700) return false

    if(m.scope == 'mode=change'){
      var new_pubkey = getProfile(changeprofilelist.value).shared_key.publicKey
      m.scope = "mode=change&to="+encodeURIComponent(Benc(new_pubkey))
    }

    var expire_at = secondsFromNow(60)
    var token = csv([m.provider, m.client, m.scope, expire_at])

    // 1) could be helpful if public key fails (post quantum crypto)
    // 2) useful for legacy passwords generator
    // 3) provider can authenticate strings like deposit address with HMAC
    var shared_secret = hmac( L.shared_base , m.provider)

    var response_obj = {
      state: m.state,
      act: m.callback,
      response: csv([
        token,
        csv([sign(token, Benc(L.shared_key.secretKey)), hmac(shared_secret, token)]),
        csv([Benc(L.shared_key.publicKey), third_party ? '' : shared_secret]),
        L.email
      ])
    }

    // keep using /s proxy if currently in web
    if(inweb) response_obj.web = 1

    var callback = m.client + "?" + toQuery(response_obj)
    
    if(m.callback=='ping'){
      //alert('pinging '+callback);
      if(window.device && window.device.platform == 'iOS'){
        // on exit iOS returns to Home screen, not the app
        hide('.container')
        show('.ios')
      }
      if(E){
        E.remote.getCurrentWindow().hide()
      }

      called = function(){
        if(window.device && window.device.platform == 'iOS'){
        }else{
          quit()
        }
      }

      window.downTimeout = setTimeout(function(){
        alert("Cannot reach "+m.provider);
        //redirect(callback)
        called()
      },10000)
      //ping.src = callback
      //document.write('^ Press to go back')
      
      var xhr = new XMLHttpRequest()
      xhr.open('GET', callback)
      xhr.onreadystatechange = function(){
        console.log(xhr.readyState)
        if(xhr.readyState > 1){
          clearTimeout(window.downTimeout)
          called()  
        }
      }
      xhr.send()
      
      //navigator.sendBeacon(callback,'asdf')
      //quit()


      
      //make sure it hits ping endpoint, little timeout
    }else{
      redirect(callback)
      quit()
    }
  }
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





// prevent backclickjack
load_date = new Date()

window.onload = (function(){
  // event listeners
  profilesmain.onchange = function(){
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

    var start_derive = new Date
    setTimeout(function(){ //need delay to show animation
      derive(password, email, function(root){
        // send stats about current device and derivation benchmark
        new_profile = {
          email: email,
          root: root,
          date: new Date().toJSON(),
          benchmark: new Date-start_derive,
          scrypt_opts: scrypt_opts.join(','),
          confirmed: false
        }

        hide($('.step1'))
        show($('.step2'))

        $('.accept-rules').onclick = function(){
          localStorage.current_profile = Profiles.push(new_profile) - 1;
          main()

          //if(Profiles.length == 1 && !inweb){
          //  redirect('https://securelogin.pw');
          //}
        }
        if(Profiles.length > 0){
          // already accepted
          $('.accept-rules').click()
        }

      })
    },300)
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
      //if(confirm("SecureLogin button will open native app for this browser. Are you sure you installed our Desktop or Mobile app already?")){
      localStorage.client = 'securelogin://'
      console.log('enabled')
      //}
    });
  }


  $('.logoutprofile').onclick = logout

  $('.enableweb').onclick = function(){
    // this popup is considered annoying?
    //if(confirm("SecureLogin Web client is much slower and less secure, try to install native app instead. Are you sure?")){
      show($('.login-form'))
      delete(localStorage.client)
      localStorage.web = 1
    //}
  }


  window.inweb = location.origin.startsWith('http')
  window.Profiles = localStorage.current_profile ? JSON.parse(localStorage.profiles) : []

  if(inweb){
    hide($('.login-form'))
    
    var hash = location.hash.substr(1);
    
    if(hash=='native'){
      // proxy to native app
      screen('generation')
      hide($('.step1'))
      hide($('.step2'))
      return false
    }



    if(hash.length > 5 && localStorage.current_profile){
      // web app auth request
      messageDispatcher(fromQuery(hash));
      return false
    }
  }else{
    hide($('.in-web'));

  }
  window.delayed_launch = setTimeout(main,800)

  // smoke test. Previously Samsung returned wrong Scrypt hashes.
  //if(window.plugins){
  //  window.plugins.scrypt(function (res) { window.testscrypt = res; },function (err) { alert(err) },'password', 'salt', {N: 2})
  //}

    

})

