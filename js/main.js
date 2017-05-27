// Weak mode #1
scrypt_opts = [18, 6]

// Recommended mode for v2
// scrypt_opts = [20, 20]


function main(){
  if(Accounts.length > 0){
    localStorage.accounts = JSON.stringify(Accounts)

    var list = ''
    for(var i in Accounts){
      var o = Accounts[i]
      var title = e(o.email) //+" ("+o.date.substr(0,10)+')'
      list += '<option '+(Number(localStorage.current_profile) == i ? 'selected' : '')+' value="'+i+'">'+title+'</option>'
    }
    accountsmain.innerHTML = list
    show($('.main-form'))
    show($('.login-form'))

  }else{
    hide($('.main-form'))
  }

  screen('list')
}


function loaddev(){
  if(localStorage.current_profile && confirm("Open experimental features?")){
    var s = document.createElement('script')
    s.src = 'js/app.js'
    document.body.appendChild(s)    
  }
}

function getAccount(n){
  if(!n){n = localStorage.current_profile}

  //clone 
  var account = Object.assign({}, Accounts[Number(n)])

  account.shared_base = hmac(account.root, 'shared');
  account.shared_key = nacl.sign.keyPair.fromSeed( Bdec(account.shared_base) )

  return account
}

function listAccounts(selected){
  if(!selected){
    selected = localStorage.current_profile
  }
  var list = ''
  for(var i in Accounts){
    var o = Accounts[i]
    var title = e(o.email) //+", added on "+o.date.substr(0,10) )

    list += '<option '+(Number(selected) == i ? 'selected' : '')+' value="'+i+'">'+title+'</option>'
  }
  show($('.accounts'))
  accountlist.innerHTML = list
}

function changeAccounts(except){
  var list = ''
  for(var i in Accounts){
    var o = Accounts[i]
    var title = e(o.email) //+", added on "+o.date.substr(0,10) )
    
    if(Number(except) != i)
    list += '<option value="'+i+'">'+title+'</option>'
  }
  show($('.changeaccounts'))
  changeaccountlist.innerHTML = list
}

function logout(){
  if(confirm("You will not lose any data, but you will have to enter same email & password to log in this profile again")){
    if(Accounts.length > 1){
      Accounts.splice(Number(localStorage.current_profile), 1)
      localStorage.current_profile = Object.keys(Accounts)[0]
      main()
    }else{
      localStorage.clear()
      location.hash = ''
      location.reload()

    }
  }
}

function enableweb(){
  if(confirm("SecureLogin Web client is much slower and less secure, try to install native app instead. Are you sure?")){
    show($('.login-form'))
    localStorage.web = 1
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
    window.close();
  }else{
    location = uri
    //cordova
    if(navigator.app) navigator.app.exitApp();
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
  el.style.display='none'
}

function show(el){
  el.style.display='block'
}

// handy debugger hidden in the right bottom corner

function l(m){
  console.log(m)
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
    var comp =  m.pubkey+' for '

    for(var i in Accounts){
      comp += Benc(getAccount(i).shared_key.publicKey) +" ";
      if(Benc(getAccount(i).shared_key.publicKey) == m.pubkey){
        use_i = i;
        accountlist.disabled = true
        break;
      }
    }

    if(!use_i){
      alert("SecureLogin required for this request cannot be found")
      return false;
    }

  }else{
    use_i = localStorage.current_profile
  }

  if(Accounts.length == 0){
    errors.push("You don't have SecureLogin profiles")
  }

  /*
  if(m.confirmed && !getAccount(use_i).confirmed){
    alert("Unconfirmed")
  }
  */

  listAccounts(use_i);

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
      if(Accounts.length == 1){
        alert("You only have one profile, if you want to change it you need to add another SecureLogin profile");
        location.reload()
        return false;

      }else{
        changeAccounts(use_i) 
      }
      break
    case 'mode=delete': 
      label = 'Delete This Account'    
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
    L = getAccount(accountlist.value);

    var diff = new Date() - load_date;
    if(diff < 400) return false

    if(m.scope == 'mode=change'){
      var new_pubkey = getAccount(changeaccountlist.value).shared_key.publicKey
      m.scope = "mode=change&to="+encodeURIComponent(Benc(new_pubkey))
    }



    var expire_at = secondsFromNow(60)
    var token = csv([m.provider, m.client, m.scope, expire_at])

    // 1) could be helpful if public key fails (post quantum crypto)
    // 2) useful for legacy passwords generator
    // 3) provider can authenticate strings like deposit address with HMAC
    var shared_secret = hmac( getAccount().shared_base , m.provider)

    var response_obj = {
      state: m.state,
      act: m.callback,
      response: csv([
        token,
        csv([sign(token, Benc(getAccount().shared_key.secretKey)), hmac(shared_secret, token)]),
        csv([Benc(getAccount().shared_key.publicKey), third_party ? '' : shared_secret]),
        getAccount().email
      ])
    }

    // future requests will open native directly, without /s proxy
    if(m.securelogin) response_obj.securelogin = 1

    var callback = m.client + "?" + toQuery(response_obj)
    
    if(m.callback=='ping'){
      //alert('pinging '+callback);
      ping.src = callback
      ping.onload = function(){
        if(navigator.app){
          navigator.app.exitApp();
        }else{
          window.close()
        }
      }
      ping.onerror = ping.onload
      //make sure it hits ping endpoint, 5s timeout
      setTimeout(ping.onload,5000)
    }else{
      redirect(callback)
    }
  }
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
    nodeRequire("scrypt").hash(password,opts,32,email).then(function(root){cb(root.toString("base64"))})
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
  accountsmain.onchange = function(){
    localStorage.current_profile=this.value;
    main()
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

    Accounts.map(function(e){ if(e.email == email){ 
      errors += "You already used this email for another profile. "}  
    })

    if(errors.length > 0){
      alert(errors);
      return false;
    }
      
    $('#password').value = ''

    screen('generation');

    show($('.step1'))
    hide($('.step2'))

    var start_derive = new Date
    setTimeout(function(){ //need delay to show animation
      derive(password, email, function(root){
        // send stats about current device and derivation benchmark
        new_account = {
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
          localStorage.current_profile = Accounts.push(new_account) - 1;
          main()

          //if(Accounts.length == 1 && !inweb){
          //  redirect('https://securelogin.pw');
          //}
        }
        if(Accounts.length > 0){
          // already accepted
          $('.accept-rules').click()
        }

      })
    },200)
  }

  password.onkeypress=function(e) {
    if (e.which == 13) {
      e.preventDefault();
      $('.real-sign-in').click();
    }
  }

  $('.native').onclick=function(){
    alert("From now on SecureLogin buttons will open native app in this browser. Just make sure you don't forget your master password (or write it down).")
    localStorage.client = 'securelogin://'
    //location.hash = ''
    //document.write("Please close this page, you can now use SecureLogin with websites and apps.")
    window.close()      
    //}
  }



  window.inweb = location.origin.startsWith('http')
  window.Accounts = localStorage.current_profile ? JSON.parse(localStorage.accounts) : []

  if(inweb){
    hide($('.login-form'))
    
    var hash = location.hash.substr(1);
    
    if(hash=='native'){
      // proxy to native app
      screen('generation')
      hide($('.step1'))
      hide($('.step2'))
      show($('.step3'))
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
  window.delayed_launch = setTimeout(main,1000)

  // smoke test
  //if(window.plugins){
  //  window.plugins.scrypt(function (res) { window.testscrypt = res; },function (err) { alert(err) },'password', 'salt', {N: 2})
  //}

    

})

