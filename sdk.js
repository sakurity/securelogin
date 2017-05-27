//openssl dgst -sha384 -binary sdk.js | openssl base64 -A


window.addEventListener('load', function(){

})

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


  c.interval = setInterval(function(){
    if(SecureLogin.ping){
      var ping = new XMLHttpRequest()
      ping.open('get','/securelogin?act=get&state='+request.state);
      ping.onreadystatechange = function(){
        if(ping.readyState==4){
          c.cb(ping.responseText);
        }
      }

    }else{


      var response = localStorage["securelogin_"+request.state];
      if(response){
        if(c.w){c.w.close()}
        window.focus()
        delete(localStorage["securelogin_"+request.state])
        clearInterval(c.interval);
        c.cb(response);
      }
    }

  }, 500)
}

