SecureLogin = function(cb, flow, scope){
  console.log("Starting SecureLogin "+flow);

  function toQuery(obj){
    return Object.keys(obj).reduce(function(a,k){a.push(encodeURIComponent(k)+'='+encodeURIComponent(obj[k]));return a},[]).join('&')
  }
  var opts = {}

  if(SecureLogin.pubkey) opts.pubkey = SecureLogin.pubkey
  if(scope) opts.scope = toQuery(scope)

  var query = toQuery(opts)

  proxy_origin = 'http://127.0.0.1:3102'
  web_origin = location.host == 'c.dev' ? 'http://securelogin.dev' : 'https://securelogin.pw'
  ext_origin = 'chrome-extension://abpigncghjblhknbbannlhmgjpjpbajj'
  localStorage.securelogin = flow

  if(flow=='app'){
    var bad_browser = bowser.safari || 
    (bowser.name == 'Firefox' && Number(bowser.version.split('.')[0]) < 55)

    if(location.protocol=='https:' && bad_browser){
      // Safari & FF < 55 block localhost from https
      // so we're using trusted proxy
      // this code exists because of desktop Safari
      window.addEventListener('message', function msgListener(e){
        if(e.origin==proxy_origin){
          if(e.data == 'ping'){
            clearInterval(window.sl_interval);
            e.source.postMessage(query, proxy_origin)
          }else{
            cb(e.data)
            window.removeEventListener('message', msgListener)
            proxy.close()
          }
        }
      })

      //in Safari we wait for the user to accept "Open in..."
      var opening = '<script>window.location = \'securelogin://\';</script>Please confirm opening SecureLogin.app...'
      proxy = window.open('about:blank') //inherits same origin
      if(bowser.mac){
        proxy.document.body.innerHTML=(opening)
      }else{
        // iOS Safari is even worse
        opensl = proxy.document.createElement('button')
        opensl.value = "Click to open!"
        opensl.onclick = function(){
          p2=proxy.window.open('about:blank')
          p2.document.write(opening)

        }
        proxy.document.body.appendChild(opensl)
      }
      
      var start_interval = new Date
      window.sl_interval = setInterval(function(){
        if(new Date - start_interval > 10000){
          alert("Press 'Allow' to use SecureLogin.app")
          clearInterval(sl_interval)
        }

        //give people time to press the button 
        if(new Date - start_interval > 1000){
          proxy.location.replace(proxy_origin+'/proxy.html#'+location.origin)
        }

      },200)

    }else{
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

        if(new Date - start_interval > 7000){
          alert("Please make sure SecureLogin app is running")
          clearInterval(sl_interval)
        }
      },200)
    }

  }else{
    //ext needs /index.html part
    if(flow=='web'){
      var origin = web_origin
      w = window.open(origin)
    }else{
      var origin = ext_origin
      w = window.open(ext_origin + '/index.html')
    }

    window.addEventListener('message', function msgListener(e){
      if(e.origin == origin){
        if(e.data == 'ping'){
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