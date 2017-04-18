// prevent backclickjack
load_date = new Date()

function save(){
  localStorage.accounts = JSON.stringify(Accounts)
  L = getAccount(localStorage.current_account)
}

function getAccount(n){
  return Accounts[Number(n)]
}

function listAccounts(selected){
  if(!selected){
    selected = localStorage.current_account
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

function logout(){
  if(confirm("You will not lose any data, but you will have to generate private key from your password again.")){
    localStorage.clear()
    location.hash = ''
    location.reload()
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
  setTimeout(function(){
    $('#debug').innerHTML+=e(JSON.stringify(m))+"<br>";
  },10)
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
  l('Going to '+label)
  show($('.container'))
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

      // Truefactor Token, stateless OAuth replacement
      if(format(m.client) != format(m.provider)){
        third_party = true
        $('.app-name').innerHTML = e(format(m.client))+"<p>would like access to</p>"+e(format(m.provider))
      }
    }else{
      errors.push('Invalid client. ')
    }
  }else{
    m.client = m.provider + '/securelogin'
  }

  if(m.scope){
    if(m.scope.length > 10000){
      errors.push("scope to sign is longer than 10000.")
    }
  }else{
    m.scope = ''
  }

  if(m.pubkey){
    for(var i in Accounts){
      var shared_base = hmac(Accounts[i].root, 'shared');
      var shared_key = nacl.sign.keyPair.fromSeed( Bdec(shared_base) )
      if(Benc(shared_key.publicKey) == m.pubkey){
        listAccounts(i)
      }
    }

  }


  if(errors.length > 0){
    alert(errors.join(' '));
    return false;
  }



  screen('auth')


  switch(m.scope) {
    case '': 
      label = 'Sign In'
      break
    case 'mode=change': 
      label = 'Change SecureLogin'   
      break    
    case 'mode=delete': 
      label = 'Delete This Account'    
      break
    default:
      data = $('.auth-data')
      var req = fromQuery(m.scope)
      var str = ''
      for(var k in req){
        str+='<div class="settings-control-group"><label class="settings-control-label">'+e(k)+'</label>'+e(req[k])+'</div>'
      }
      data.innerHTML = str;
      show(data)
      label = 'Approve'
    
  }
  

  $(".approve").innerText = label


  $(".approve").onclick = function(){
    var diff = new Date() - load_date;
    if(diff < 900) return false



    var expire_at = secondsFromNow(60)
    var token = csv([m.provider, m.client, m.scope, expire_at])

    // 1) could be helpful if public key fails (post quantum crypto)
    // 2) used as password on legacy websites with browser extensions
    // 3) provider can authenticate strings like deposit address with HMAC
    var shared_base = hmac(L.root, 'shared');
    var shared_key = nacl.sign.keyPair.fromSeed( Bdec(shared_base) )

    var shared_secret = third_party ? '' : hmac( shared_base , m.provider)

    var response_obj = {
      state: m.state,
      act: 'proxy',
      response: csv([
        token,
        sign(token, Benc(shared_key.secretKey)),

        Benc(shared_key.publicKey)
      ])
    }

    // future requests will open native directly, without /s proxy
    if(m.native) response_obj.native = 1


    redirect(m.client + "?" + toQuery(response_obj))
  
  
  }

}



function generation(){
  var password = $('#password').value;
  var errors = '';

  // offer a Security Mode based on how strong this password is
  /*
  if(zxcvbn(password).guesses < 100){
    errors += 'Create stronger password.'
  }*/
  new_account = {}

  var rounds = 1 //parseInt(securityrounds.value)
  new_account.email = $('#login').value
  var salt = new_account.email+','+rounds

  if(new_account.email.indexOf('@') == -1){
    errors += 'Email is invalid. '
  }


  if(errors.length > 0){
    alert(errors);
    return false;
  }

  screen('generation');

  var start_derive = new Date
  derived = function(root){
    l(root + " took "+(new Date - start_derive))
    new_account.root = root
    new_account.date = new Date().toJSON()
    localStorage.current_account = Accounts.push(new_account) - 1
    hide($('.cssload-thecube'))
    show($('.accept-rules'))
  }

  var scryptN = Math.pow(2,18)

  if(E){
    nodeRequire("scrypt").hash(password,
      {"N":scryptN,"r":8,"p":rounds},
      32,salt).then(function(root){
        derived(root.toString("base64"))
      })
  }else{
    scrypt(password, salt, {
        N: scryptN,
        interruptStep: 1000,
        p: rounds,
        r: 8,
        dkLen: 32,
        encoding:  'base64'
      }, derived)
  }

}


function main(){
  save()
  listAccounts()
  var hash = location.hash.substr(1);
  if(hash.length > 0){
    var message = fromQuery(hash);
    if(message){
      messageDispatcher(message);
    }
  }else{
    screen('list')

  }
}






window.onload = (function(){
  if(location.origin.startsWith('http')){
    //web app

    if(location.hash=='#logout'){ logout() }

    // this is loaded by native client after installation
    if(location.hash=='#native'){
      if(confirm("Did you install Truefactor application? All requests will be opened in it instead of Web version.")){
        localStorage.client = 'truefactor://'
        location.hash = ''
      }
    }



  }else{
    //native app

    hide($('.in-web'));
    //hide(setclient)
  }


  m = {} //current request
  iOS = /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream;

  navigator.getUserMedia=navigator.getUserMedia||navigator.webkitGetUserMedia||navigator.mozGetUserMedia||navigator.msGetUserMedia


  
  password.onkeypress=function(e) {
    if (e.which == 13) {
      e.preventDefault();
      generation();
    }
  }
  $('.real-sign-in').onclick = generation


  if(localStorage.current_account && localStorage.accounts){
    Accounts = JSON.parse(localStorage.accounts)
    L = getAccount(localStorage.current_account)
    startmain = setTimeout(main, 500)
  }else{
    Accounts = []
    screen('login');

  }

})







