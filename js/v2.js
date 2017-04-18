
// SecureLogin2 - Doublesign and other features will be released after general adoption

/*


  // displaying signature in QR on second truefactor during offline doublesign
  if(m.qr){
    var expire_at = secondsFromNow(60)
    var token = csv([L.email, m.provider, m.client, m.scope, expire_at])

    makeQR(csv([sign(token, I.ourkeysecret), expire_at]), responseqr)

    show($('.offlineresponse'))
    hide($('.approve'))
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

// used to pull signature from broker or QR code
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
    var token = csv([L.email, m.provider, m.client, m.scope, d[1]])

    var response_sign = [sign(token, I.ourkeysecret),d[0]]
    if(I.factor == '2') response_sign.reverse()
    response_sign = response_sign.join(',')

    response_obj.response = response_sign+'.'+token

    redirect(m.client + "?" + toQuery(response_obj))
  }else{
    alert("Second signature isn't available yet: approve with another truefactor first.")
  }
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



  createfactor.onclick = function(){
    $('#password').placeholder='Second password (different from your first password)';
    show(pairingcode);
    hide(login)
    //hide(securityrounds)
    scanQR(function(result){
      pairingcode.value = result

      hide(pairingcode)
      hide(createfactor)
    })
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
