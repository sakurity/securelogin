if(!localStorage.securelogin){
  window.addEventListener('load',function(){
    var sproxy = document.createElement('iframe')
    sproxy.src = 'https://securelogin.pw/s?'
    sproxy.style.display='none'
    document.body.appendChild(sproxy)
    window.addEventListener('message',function(o){
      if(o.origin == 'https://securelogin.pw' && o.data.client == 'securelogin://'){
        localStorage.securelogin = 1
      }
    })
  })
}

SecureLogin = function(callback, scope){
  SecureLogin.toQuery=function(obj) {
    return Object.keys(obj).reduce(function(a,k){a.push(k+'='+encodeURIComponent(obj[k]));return a},[]).join('&')
  }

  var request = {}

  if(SecureLogin.provider){
    request.provider = SecureLogin.provider
  }else{
    request.provider = location.origin
  }
  if(SecureLogin.pubkey){
    request.pubkey = SecureLogin.pubkey
  }
  if(SecureLogin.confirmed){
    request.confirmed = 1
  }
  if(SecureLogin.callback){
    request.callback = SecureLogin.callback
  }
  
  if(scope){
    request.scope = SecureLogin.toQuery(scope);
  }

  request.state = crypto.getRandomValues(new Uint8Array(32)).reduce(function(a,k){return a+''+(k%32).toString(32)},'');
 
  if(!SecureLogin.channels) SecureLogin.channels = {}
 
  SecureLogin.channels[request.state] = {cb: callback}
  var c = SecureLogin.channels[request.state]

  var query = SecureLogin.toQuery(request)

  
  //var failback = setTimeout(function(){




  if(localStorage.securelogin){
    location = 'securelogin://#'+query
  }else{
    c.w = window.open('https://securelogin.pw/s#' + query);        
  }
  
  c.cb = callback

  if(true){
    callback(request.state)

  }else{
    c.interval = setInterval(function(){
      if(SecureLogin.callback=='ping' && document.visibilityState=='visible' && !SecureLogin.pulling){
        var ping = new XMLHttpRequest()
        ping.open('GET','/securelogin?act=get&state='+request.state)
        ping.send()
        SecureLogin.pulling = 1
        ping.onreadystatechange = function(){
          if(ping.readyState==4){
            delete(SecureLogin.pulling)
            var response = ping.responseText

            if(response.length>5){          
              clearInterval(c.interval);
              if(response.slice(0,4) != 'WEB:'){
                // native app installed
                localStorage.securelogin = 1
              }else{
                response=response.slice(4)
              }

              c.cb(response);
              delete(c.cb)
            }
          }
        }
      }

      var response = localStorage["securelogin_"+request.state];
      if(response){
        if(c.w){c.w.close()}
        window.focus()
        delete(localStorage["securelogin_"+request.state])
        clearInterval(c.interval);
        c.cb(response);
      }
  }, 200)
  }

}

