// prevent backclickjack
load_date = new Date()

function save(){
  localStorage.accounts = JSON.stringify(Accounts)
  L = getAccount(localStorage.current_account)
}

function getAccount(n){
  return Accounts[Number(n)]
}

function listAccounts(){
  var list = ''
  for(var i in Accounts){
    var o = Accounts[i]
    var title = (e(o.email)+" ("+o.root.substr(0,4)+"), added on "+o.date.substr(0,10) )
    list += '<option '+((Number(localStorage.current_account) == i)?'selected':'')+' value="'+i+'">'+title+'</option>'
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
  if(test_uri.match(/^(javascript|data|mailto|truefactor):/) ){
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

function verify(message, sign, pub){
  return Uenc(nacl.sign.detached.verify(message, Bdec(sign), Bdec(pub)))
}

function encryptBox(content, key){
  var nonce = nacl.randomBytes(24);
  content = Udec(content)
  key = Bdec(key);
  var box = nacl.secretbox(content, nonce, key);

  return Benc(nonce)+'.'+Benc(box);
}

function decryptBox(content, key){
  key = Bdec(key);
  content = content.split('.');
  return (Uenc(nacl.secretbox.open(Bdec(content[1]), Bdec(content[0]), key)))
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

function info(){
  var obj = {}

  var ourkey=nacl.sign.keyPair.fromSeed( Bdec(L.root) )
  obj.ourkey = Benc(ourkey.publicKey);
  obj.ourkeysecret = Benc(ourkey.secretKey);

  if(L.anotherkey){
    obj.paired = true
    obj.doublesign=[obj.ourkey,L.anotherkey]
  }else{
    obj.paired = false
    obj.doublesign = ['','']
  }

  if(L.shared){
    obj.factor = '2'
    obj.shared = L.shared
    obj.doublesign.reverse()
    obj.target = '1,'+hmac(obj.shared, 'target')
  }else{
    obj.factor = '1'
    obj.shared = hmac(L.root, 'shared')
    obj.target = '2,'+hmac(obj.shared, 'target')
  }
  obj.mytarget = obj.factor+','+hmac(obj.shared, 'target')
  var sharedkey = nacl.sign.keyPair.fromSeed( Bdec(obj.shared) )

  obj.sharedkeysecret = Benc(sharedkey.secretKey);
  obj.sharedkey = Benc(sharedkey.publicKey);

  return obj
}

function format(origin){
  var formatted = origin.split('/')[2];
  return formatted[0].toUpperCase() + formatted.substr(1);
}

function xhr(data, cb){
  var x = new XMLHttpRequest
  x.open('POST','https://truefactor.io/messages')
  x.send(JSON.stringify(data));


  offline = setTimeout(function(){
    l("Unable to reach Truefactor servers. Please try to scan QR code for offline mode.")
  }, 12000)

  x.onreadystatechange = function(){
    if(x.readyState == 4){
      clearTimeout(offline)
      if(cb) cb(x.response)
    }
  }
}

// check if we received new messages
function pull(cb){
  if(document.visibilityState != 'visible'){
    l("Invisible, not pulling")
    return false;
  }

  xhr({for: I.mytarget}, function(data){
    if(data.length > 0){
      var resp = JSON.parse(decryptBox(data[data.length-1], I.shared))
    }else{
      resp = false
    }
    l(resp)
    cb(resp)

  })
}

// send some message to paired truefactor
function push(message){
  var o = {
    to: I.target,
    data: encryptBox(JSON.stringify(message), I.shared)
  }

  if(m.doublesign){
    o.doublesign = m.doublesign
  }

  l("Sending push back "+o.data)

  xhr(o)
}















// scan request QR
function requestscan(){
  scanQR(function(r){
    l(r)
    var m = csv(r);

    messageDispatcher({
      qr: 1,
      tfid: m[0],
      provider: m[1],
      client: m[2],
      scope: m[3]
    })
  })
}

// used to pull signature from broken or QR code
function receive_response(d){
  var response_obj = {
    state: m.state,
    act: 'proxy'
  }
  if(d){
    var d=csv(d)
    if(parseInt(d[1]) > secondsFromNow(1000)){
      alert('This signature is too far in the future. Calibrate clock on your devices.')
      return false;
    }
    var token = csv([$('.email').value, m.provider, m.client, m.scope, d[1]])

    var response_sign = [sign(token, I.ourkeysecret),d[0]]
    if(I.factor == '2') response_sign.reverse()
    response_sign = response_sign.join(',')

    response_obj.response = response_sign+'.'+token

    redirect(m.client + "?" + toQuery(response_obj))
  }else{
    alert("Second signature isn't available yet: approve with another truefactor first.")
  }
}

// where everything happens
function messageDispatcher(message){
  m = message // store in global variable
  I = info()

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
    m.client = m.provider + '/truefactor'
  }

  $('.email').value = m.tfid ? m.tfid : L.email

  if(m.tfid_label && ['Username','Handle','Nickname'].indexOf(m.tfid_label) != -1){
    $('.email').placeholder = m.tfid_label
    if(!m.tfid) $('.email').value = ''
    var label = 'Choose your '+m.tfid_label.toLowerCase()
  }else{
    var label = 'Choose your email'
  }
  $('.tfid_label').innerHTML = label

  if(m.scope){
    if(m.scope.length > 10000){
      errors.push("scope to sign is longer than 10000.")
    }
  }else{
    m.scope = ''
  }


  if(errors.length > 0){
    alert(errors.join(' '));
    return false;
  }

  if(m.doublesign){
    show($('.offlineoption'))
    request = {
      scope: m.scope,
      provider: m.provider,
      tfid: m.tfid,
      client: m.client
    }
    // request second truefactor to sign
    push(request)

    var str = csv([m.tfid,m.provider,m.client,m.scope])
    makeQR(str, proxyqr)
  }


  screen('auth')

  if(m.scope!=''){


    if(m.scope == 'mode=change'){
      label = 'Update Truefactor for '+e(m.tfid)


    }else{

    hide($('.new-signup'))
    data = $('.auth-data')


    var req = fromQuery(m.scope)

    if(m.tfid){
      label = 'Approve as '+e(m.tfid)

      //var str = '<div class="settings-control-group"><label class="settings-control-label">Account</label>'+e(m.tfid)+'</div>';
    }else{
      // you can set tfid
      lable = 'Approve'
    }

    var str = ''
    

    for(var k in req){
      str+='<div class="settings-control-group"><label class="settings-control-label">'+e(k)+'</label>'+e(req[k])+'</div>'
    }
    data.innerHTML = str;
    show(data)
    }

  }else{
    label='Sign In'
  }
  $(".approve").innerText = label

  // displaying signature in QR on second truefactor during offline doublesign
  if(m.qr){
    var tfid = $('.email').value;
    var expire_at = secondsFromNow(60)
    var token = csv([tfid, m.provider, m.client, m.scope, expire_at])

    makeQR(csv([sign(token, I.ourkeysecret), expire_at]), responseqr)

    show($('.offlineresponse'))
    hide($('.approve'))
  }


  $(".approve").onclick = function(){
    var diff = new Date() - load_date;
    if(diff < 900) return false


    var tfid = $('.email').value;
    var expire_at = secondsFromNow(60)
    var token = csv([tfid, m.provider, m.client, m.scope, expire_at])

    // 1) could be helpful if public key fails (post quantum crypto)
    // 2) used as password on legacy websites with browser extensions
    // 3) provider can authenticate strings like deposit address with HMAC
    var shared_secret = third_party ? '' : hmac(I.shared, m.provider)

    if(m.from_broker){
      push(csv([sign(token, I.ourkeysecret), expire_at]));
      document.body.innerHTML = 'Approved with second truefactor. Now you can approve with first truefactor.'
      setTimeout(function(){
        window.close()
      },200)
    }else{


      var response_obj = {
        state: m.state,
        act: 'proxy'
      }

      // it must be doublesigned, so go and check if sign is ready
      if(m.doublesign){
        pull(receive_response)
      }else{
        // future requests will open native directly, without /s proxy
        if(m.native) response_obj.native = 1

        response_obj.response = sign(token, I.sharedkeysecret)+'.'+token
        if(m.scope == ''){
          //registration provided only along with login requests
           response_obj.response = csv([response_obj.response, csv([
            I.doublesign[0],
            I.doublesign[1],
            I.sharedkey,
            shared_secret
          ])])
        }

        redirect(m.client + "?" + toQuery(response_obj))
      }
    }
  }
}

function requestpull(forced){
  pull(function(d){
    if(d){
      d.from_broker = true
      messageDispatcher(d)
    }else{
      if(forced){
        alert("There are no pending approval requests.")
      }
    }
  })
}

// keep checking if pairing is done
function checkpull(start){
  if(start){
    checkpull_interval = setInterval(function(){
      pull(function(d){
        if(d){
          clearInterval(checkpull_interval)
          L.anotherkey = d.ourkey

          main()
        }
      })
    },1000);
  }else{
    if(window.checkpull_interval){
      clearInterval(checkpull_interval)
    }
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

  if(pairingcode.value.length > 10){
    var result = csv(pairingcode.value.replace(/ /g,''))
    if(result.length == 3){
      new_account.shared = result[0]
      new_account.anotherkey = result[1]
      new_account.email = result[2]

      // when we generate second truefactor we don't need long KDF
      // `shared` is salt, so crack first password to get to the second
      var rounds = 1
      var salt = new_account.shared
    }else{
      l("invalid pairing csv")
    }

  }else{

    var rounds = parseInt(securityrounds.value)
    new_account.email = $('#login').value
    var salt = new_account.email+','+rounds

    if(new_account.email.indexOf('@') == -1){
      errors += 'Email is invalid. '
    }
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

    if(new_account.shared){
      main()

      l("sharing our pubkey for doublesign with first truefactor")
      push({
        ourkey: I.ourkey
      })
    }else{
      hide($('.cssload-thecube'))
      show($('.accept-rules'))
    }
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


function main(firstLogin){
  save()
  listAccounts()
  I = info()


  var shared = I.shared
  shared = csv([shared, I.ourkey, L.email])

  for(var i=0,s=6,bits=[];i<shared.length;i+=s){
    bits.push(shared.substr(i,s))
  }


  $('.root-input').value = L.root



  $('.your-id').innerHTML = bits.join(' ')
  makeQR( shared , pairqr);


  var hash = location.hash.substr(1);


  if(firstLogin && Accounts.length == 1){
    checkpull(true)
    screen('pairing');
  }else{
    checkpull(false)

    if(hash.length > 0){
      var message = fromQuery(hash);
      if(message){
        messageDispatcher(message);
      }
    }else{
      screen('list')
      if(L.anotherkey){
        requestpull()
       

      }
    }

  }


}





function makeQR(text, target){
  target.innerHTML=''
  var qrcode = new QRCode(target, {
    text: text,
    width: 300,
    height: 300,
    correctLevel : QRCode.CorrectLevel.L
  });
}

// try getUserMedia (works on desktop browsers except safari)
// then offer making photo via File Upload for mobile browsers
// there is no way to scan on desktop safari, unfortunatelly

function scanQR(cb){
  var canvas = document.getElementById('qr-canvas');

  if(navigator.getUserMedia){

    //https://webrtc.github.io/samples/src/content/devices/input-output/
    if (!navigator.mediaDevices || !navigator.mediaDevices.enumerateDevices) {
      console.log("enumerateDevices() not supported.");
    }
    navigator.mediaDevices.enumerateDevices()
      .then(function(devices) {
        devices.forEach(function(device) {
          console.log(device.kind + ": " + device.label +
            " id = " + device.deviceId);
        });
      })
      .catch(function(err) {
        console.log(err.name + ": " + error.message);
      });



    navigator.getUserMedia({video:true,audio:false},function(stream){
      qr = new QrCode();
      qr.callback = function(result,err) {
        if(result){
          cb(result)
          hide($('.scan'))
          //turn off camera
          stream.getVideoTracks().forEach(function(track) {
            track.stop();
          });
        }
      }

     var video = document.querySelector('video');
     video.srcObject = stream;

     show($('.scan'))

     video.addEventListener('play', function () {
      var $this = this;
      (function loop() {
          if (!$this.paused && !$this.ended) {

              width = $this.videoWidth,
              height = $this.videoHeight;

              max_size = 450;
              if (width > max_size) {
                height *= max_size / width;
                width = max_size;
              }
              canvas.width = width;
              canvas.height = height;

              canvas.getContext('2d').drawImage($this, 0, 0, width, height);

              try{qr.decode()}catch(e){
                //l(e)
              }

              setTimeout(loop, 200);
          }
      })();
      }, 0);


     video.onloadedmetadata = function(e) {
        video.play();
     };

  },function(){
    alert("No access to camera, you need to enter info manually")
  })
  }else{
    if(iOS || true){
      qr = new QrCode();
      qr.callback = function(result,err) {
        if(result){
          l(result)
          cb(result)
        }else{
          alert("Cannot scan this QR, try again")
        }
      }

      fileInput = document.createElement('input');
      fileInput.type = 'file';
      fileInput.accept = 'image/*';
      fileInput.className = 'file-input-x42';
      fileInput.style.position = 'fixed';
      fileInput.style.top = '-10000px';
      fileInput.style.left = '-10000px';
      fileInput.style.opacity = 0;
      document.body.appendChild(fileInput);

      fileInput.addEventListener('change', function(e) {
        if (!fileInput.files) {
            return;
        }

        file = fileInput.files[0];
        fr = new FileReader();
        fr.onload = function() {
          img = new Image();
          img.onload = function() {
            width = img.width,
            height = img.height;
            max_size = 300;
            if (width > max_size) {
              height *= max_size / width;
              width = max_size;
            }
            canvas.width = width;
            canvas.height = height;
            canvas.getContext("2d").drawImage(img, 0, 0, width, height);
            l('try to decode '+width)
            qr.decode()
          };
          img.src = fr.result;
        };
        fr.readAsDataURL(file)

      }, false);
      fileInput.click()
    }else{
      alert("No access to camera, you need to enter info manually")
    }
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

    $('.client-input').value = localStorage.client ? localStorage.client : 'https://truefactor.io/'
    $('.client-input').onchange = function(){
      //verify ?
      localStorage.client = this.value
    }

  }else{
    //native app

    hide($('.in-web'));
    hide(setclient)
  }


  m = {} //current request
  iOS = /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream;

  navigator.getUserMedia=navigator.getUserMedia||navigator.webkitGetUserMedia||navigator.mozGetUserMedia||navigator.msGetUserMedia



  createfactor.onclick = function(){
    $('#password').placeholder='Second password (different from your first password)';
    show(pairingcode);
    hide(login)
    hide(securityrounds)
    scanQR(function(result){
      pairingcode.value = result

      hide(pairingcode)
      hide(createfactor)
    })
  }
  password.onkeypress=function(e) {
    if (e.which == 13) {
      e.preventDefault();
      generation();
    }
  }
  $('.real-sign-in').onclick = generation



  // root, anotherkey, shared, email
  if(localStorage.current_account){
    Accounts = JSON.parse(localStorage.accounts)
    L = getAccount(localStorage.current_account)
    startmain = setTimeout(main, 500)
  }else{
    Accounts = []
    screen('login');

  }

})





