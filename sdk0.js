//Truefactor SDK 1.0
//openssl dgst -sha384 -binary sdk.js | openssl base64 -A
(function(w){
  w.Truefactor = {
    channels: {},
    init: function(){
      var button = document.querySelector('.truefactor-login');
      if(button){
        button.onclick = function(e){
          Truefactor.auth(function(resp){          
            location = "/truefactor?act=signin&response="+encodeURIComponent(resp)
          })
        }
      }

    },
    auth: function(callback, scope){
      var request = {}
      if(Truefactor.app_origin){
        request.provider = Truefactor.app_origin
      }else{
        request.provider = location.origin
      }
      if(Truefactor.tfid){
        request.tfid = Truefactor.tfid
      }
      if(Truefactor.confirmed){
        request.confirmed = 1
      }
      
      if(scope){
        request.scope = Truefactor.toQuery(scope);
        
      }
      if(Truefactor.doublesign){
        request.doublesign = '1'
      }

      request.state = gen(10); // not exactly CSRF protection
      
      this.channels[request.state] = {cb: callback}
      var c = this.channels[request.state]

      var query = Truefactor.toQuery(request)

      //var failback = setTimeout(function(){
      if(localStorage.native){
        location = 'truefactor://#'+query
      }else{
        c.w = window.open('https://truefactor.io/s#' + query);        
      }
      
      c.cb = callback
      c.interval = setInterval(function(){
        var response = localStorage["truefactor_"+request.state];
        if(response){
          if(c.w){c.w.close()}
          window.focus()
          delete(localStorage["truefactor_"+request.state])
          clearInterval(c.interval);
          c.cb(response);
        }

      }, 500)

    }
  }




  // utils
  function gen(len){
    return crypto.getRandomValues(new Uint8Array(len)).reduce(function(a,k){return a+''+(k%32).toString(32)},'');
  }

  Truefactor.toQuery=function(obj) {
    return Object.keys(obj).reduce(function(a,k){a.push(k+'='+encodeURIComponent(obj[k]));return a},[]).join('&')
  }

  Truefactor.fromQuery=function(str) {
    var o = {};
    str.split('&').map(function(pair){ 
      var pair = pair.split('='); 
      o[decodeURIComponent(pair[0])]=decodeURIComponent(pair[1]); 
    })
    return o;
  }

})(window)

window.addEventListener('load', function(){
  Truefactor.init()
})

/*
window.addEventListener('message', function(m){
  if(m.origin == 'http://tfw.dev'){
    console.log(m.data)
  }
})*/