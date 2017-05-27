//npm install -g bs58 bitcoinjs-lib ecurve bigi ethereumjs-util buffer nem-sdk ripple-keypairs
// browserify index.js --standalone npm > app.js
bip39 = require('bip39')
base58 = require('bs58') 
bitcoin = require('bitcoinjs-lib')
ecurve = require('ecurve')
bigi = require('bigi')
ethUtil = require('ethereumjs-util')
Buffer = require('buffer').Buffer
nem = require("nem-sdk").default
rippleKeypairs = require('ripple-keypairs');

// experimental dev features, revealed on double click

show($('.dev'))


// legacy password generator. We don't really want to expose it because we actually want to kill passwords

function copypassword(){
  managerpassword.select();
  document.execCommand('copy');
  show(copymessage);
  setTimeout(function(){
    hide(copymessage)
  },1000)
}

function manager(){
  var pw = hmac(getAccount().shared_base, managerprovider.value.toLowerCase() )
  pw = pw.replace(/[=\/+]/g,'').slice(0,12)
  managerpassword.value = pw
}


coins = {
  btc: {
    generate: function(s){ return new bitcoin.ECPair(bigi.fromBuffer(s)).getAddress() }
  },
  ltc: {
    generate: function(s){ 
      return new bitcoin.ECPair(bigi.fromBuffer(s),false,{network: bitcoin.networks.litecoin}).getAddress() 
    }
  },
  btctest: {
    generate: function(s){ 
      return new bitcoin.ECPair(bigi.fromBuffer(s),false,{network: bitcoin.networks.testnet}).getAddress() 
    }
  },  
  eth: {
    generate: function(s){
      s._isBuffer = true
      return '0x' + ethUtil.privateToAddress(s).toString('hex')
    }
  },
  xrp: {
    generate: function(s){
      seed = rippleKeypairs.generateSeed({entropy: s})
      keypair = rippleKeypairs.deriveKeypair(seed)
      return  rippleKeypairs.deriveAddress(keypair.publicKey)
    }
  },
  xem: {
    generate: function(s){
      wallet = nem.model.wallet.createBrain("xem", Benc(s), nem.model.network.data.mainnet.id);
      return wallet.accounts[0].address 
    }
  },
  mnemonic: {
    generate: function(s){
      return bip39.entropyToMnemonic(Buffer.from(s).slice(0,16).toString('hex'))
    }
  }
}


// deterministic offline address generator for major cryptocurrencies

secretkey.value = localStorage.accounts


for(var symbol in coins){
  var base = Bdec(hmac(symbol, getAccount().shared_base))
  console.log(symbol, base)
  window[symbol].value = coins[symbol].generate(base)
}


