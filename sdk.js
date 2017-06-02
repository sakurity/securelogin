if(!localStorage.securelogin){
  window.addEventListener('load',function(){
    var sproxy = document.createElement('iframe')
    sproxy.src = 'https://securelogin.pw/s'
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

  var request = {
    provider: location.origin,
    callback: 'ping',
    confirmed: 1
  }

  if(SecureLogin.pubkey){
    request.pubkey = SecureLogin.pubkey
  }

  if(scope){
    request.scope = SecureLogin.toQuery(scope);
  }

  request.state = crypto.getRandomValues(new Uint8Array(32)).reduce(function(a,k){return a+''+(k%32).toString(32)},'');
 
  var query = SecureLogin.toQuery(request)

  if(localStorage.securelogin){
    location = 'securelogin://#'+query
  }else{
    var w = window.open('https://securelogin.pw/s#' + query);        
  }
  callback(request.state)
}

