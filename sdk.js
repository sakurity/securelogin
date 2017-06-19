window.addEventListener('load',function(){
  // safari violates mixed content spec, so no app
  if(!bowser.safari){
    var btn = document.querySelector('[data-client="app"]')
    if(btn) btn.style.display='inline-block'
  }
  // ext only on chrome
  var desktop = (bowser.mac || bowser.linux || bowser.windows || bowser.chromeos)
  if(bowser.chrome && desktop){
    var btn = document.querySelector('[data-client="ext"]')
    if(btn) btn.style.display='inline-block'
  }
})

SecureLogin = function(cb, flow, scope){
  function toQuery(obj){
    return Object.keys(obj).reduce(function(a,k){a.push(encodeURIComponent(k)+'='+encodeURIComponent(obj[k]));return a},[]).join('&')
  }

  var opts = {}

  if(SecureLogin.pubkey) opts.pubkey = SecureLogin.pubkey
  if(scope) opts.scope = toQuery(scope)

  var query = toQuery(opts)
  web_origin = location.host == 'c.dev' ? 'http://securelogin.dev' : 'https://securelogin.pw'
  localStorage.securelogin = flow
  ext_origin = 'chrome-extension://abpigncghjblhknbbannlhmgjpjpbajj'

  if(flow=='app'){
    // we are using a sane browser, let's open direct WS to localhost 
    location = 'securelogin://'
    var start_interval = new Date
    sl_interval = setInterval(function(){
      var x=new WebSocket('ws://127.0.0.1:3101')

      x.onmessage=function(e){
        console.log(e.data)
        x.send('{"data":"close"}')
        x.close()
        cb(e.data);
        cb=function(str){ console.log('replay') }
      }

      x.onopen=function(){
        x.send(JSON.stringify({data: query}))
        clearInterval(sl_interval)
      }

      if(new Date - start_interval > 3000){
        //alert("Please make sure SecureLogin app is running")
        clearInterval(sl_interval)

        if(bowser.android) location = "https://play.google.com/store/apps/details?id=pw.securelogin"
        if(bowser.mac) location = "https://securelogin.pw/apps/SecureLogin-1.0.0.dmg"
        if(bowser.windows) location = "https://securelogin.pw/apps/SecureLogin Setup 1.0.0.exe"
      }
    },200)
  }else{
    //ext needs /index.html part
    if(flow=='web'){
      var origin = web_origin
      w = window.open(origin)
    }else{
      var origin = ext_origin
      w = window.open(ext_origin + '/index.html')
      // no extension? go to install page
      var loadext = setTimeout(function(){
        w.location = "https://chrome.google.com/webstore/detail/securelogin/abpigncghjblhknbbannlhmgjpjpbajj"
      },500)
    }

    window.addEventListener('message', function msgListener(e){
      if(e.origin == origin){
        if(e.data == 'ping'){
          if(flow=='ext') clearInterval(loadext)

          e.source.postMessage(query, origin)
        }else{
          cb(e.data)
          window.removeEventListener('message', msgListener)
          w.close()
        }
      }
    })
  }
  return false
}