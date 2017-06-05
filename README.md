## SecureLogin Protocol

### Abstract

<a href="https://cobased.com">Try the demo now?</a>

SecureLogin is decentralized authentication protocol for websites and apps. Classic passwords/2FA are poorly designed, hard to backup and inconvenient to use. SecureLogin is all-in-one solution that creates a cryptographic private key from your email and master password to sign in everywhere and helps you to forget about passwords.

<a href="https://medium.com/@homakov/securelogin-forget-about-passwords-c1bf7b47f698">Blog post on 1.0 release and our Principles.</a>

Here are 5 major problems it solves:

1. __Password reuse__: SecureLogin's #1 goal is to fix password reuse and simplify authentication process. It is working for everyone, not only for the geeks.

2. __Usability__: existing onboarding process is a disaster for conversion: Email, confirm email, password, confirm password, wait you need one digit and one capital letter, think of a new password, sign up and go to email box to click "Confirm My Email" a 1000th time in your life. **With SecureLogin, it's just two clicks.**

3. __Central authority__: Currently every account depends on an email, which can be used to set a new password. Email is very centralized - majority uses services like Gmail. This is even worse for SMS, which is owned by telecom corporations. This attack is currently exploited in the wild only against political activists, but there's no need to wait for someone to hack a major email/SMS provider – __with SecureLogin there's no central authority, no central server and no way to hijack your account__.

4. __Man-in-the-Middle__: interaction of the user computer and the server is often compromised in between: broken HTTPS, CloudFlare, malicious browser extensions, Man-in-the-Browser and XSS can be prevented when the user explicitly signs every critical transaction. 

5. __Malware__: SecureLogin 2.0 with Doublesign stops malware trying to act on behalf of your account – usually to steal your money. Doublesign is like a "two man rule" - the server must verify two signatures of "scope" which includes every detail of the transaction e.g. SWIFT, amount, currency, account number or Bitcoin address. Entire transaction is signed on both devices (usually desktop + mobile) so compromise of one of them wouldn't be enough to empty your bank account (unlike how it is now).

### SecureLogin vs X

SecureLogin is not a new OAuth (<a href="http://sakurity.com/oauth">but there's new better OAuth over here</a>), not a password manager, not a new 2FA option. It's all three in one protocol.

Let's list all popular auth methods and some esoteric ones to see how they deal with these 5 problems for normal users. 

Please note, password manager are not in the table because there's no such thing as "password manager auth method" - a manager is merely not enforceable. However there is tiny 1% of password managers __users__.


<table border=1px>
  <tr>
    <th>Auth Scheme</th>
    <th>Reuse/3rd Party Leak</th>
    <th>Central Authority</th>
    <th>Register/Login/Recovery Usability</th>
    <th>MitM / Malware stealing money</th>
    <th>Cost</th>
  </tr>

  <tr>
    <td>Standard</td>
    <td class=g1>Most people reuse passwords</td>
    <td class=g1>Email provider can set new pw</td>
    <td class=g1>Terrible UX</td>
    <td class=g1></td>
    <td class=g3>Free (except cost of mail services)</td>
  </tr>

  <tr>
    <td>Standard + TOTP</td>
    <td class=g1>- (first "factor" isn't fixed)</td>
    <td class=g3>Password is not enough to login</td>
    <td class=g1>Terrible UX + inconvenient "paper" backup codes + typing 6 digits every time</td>
    <td class=g2>Delayed, not prevented (malware can wait for the user to enter OTP code)</td>
    <td class=g3>Free</td>
  </tr>

  <tr>
    <td>Standard + U2F/Yubikey</td>
    <td class=g1>-</td>
    <td class=g3>Password is not enough to login</td>
    <td class=g1>Terrible UX, no usable backup strategy at all, no iOS support</td>
    <td class=g2>Delayed, not prevented</td>
    <td class=g1>$19+ per plastic dongle</td>
  </tr>

  <tr>
    <td>Standard + SMS / Authy / Duo</td>
    <td class=g1>-</td>
    <td class=g1>"Second" factor is a central authority too just like email provider. Plus vendor lock-in.</td>
    <td class=g2>Duo offers nice user interface, but register/login experience is still slow and painful</td>
    <td class=g2>Delayed, not prevented</td>
    <td class=g1><a href="https://duo.com/pricing">$3+/mo/user</a>, <a href="https://www.authy.com/product/pricing/">$0.1/request</a>, $0.05/SMS</td>
  </tr>

  <tr>
    <td>Magic Link on Email / Mozilla Persona</td>
    <td class=g3>No per-site passwords - no reuse</td>
    <td class=g1>Email provider can login on behalf of your account</td>
    <td class=g2>Greatly improved UX: that's why Slack and Medium already adopted Magic Links</td>
    <td class=g1>-</td>
    <td class=g3>Free</td>
  </tr>

  <tr>
    <td>OAuth / OpenID / SAML / any SSO</td>
    <td class=g3>No per-site passwords</td>
    <td class=g1>OAuth provider can login on behalf of your account, vendor lock-in</td>
    <td class=g3>Best UX: 2 clicks</td>
    <td class=g1>-</td>
    <td class=g3>Free</td>
  </tr>


  <tr class="esoteric">
    <td>Trezor</td>
    <td class=g3>+</td>
    <td class=g3>Signing key never leaves your hardware token</td>
    <td class=g1>Requires using a token every time, writing down 24 words, no iOS support</td>
    <td class=g2>-</td>
    <td class=g1><a href="https://shop.trezor.io">$128</a></td>
  </tr>


  <tr>
    <td>SecureLogin</td>
    <td class=g3>No per-site passwords</td>
    <td class=g3>Cryptographic key never leaves your device</td>
    <td class=g3>Excellent sign-up and login user experience. Works on all platforms with all browsers</td>
    <td class=g3>2.0 with Doublesign will protect from malware with scope-specific signature</td>
    <td class=g3>Free and Open Source</td>
  </tr>
</table>


# How it works?

First, let's include this tiny helper:

```javascript
SecureLogin = function(scope){
  function toQuery(obj){
    return Object.keys(obj).reduce(function(a,k){a.push(encodeURIComponent(k)+'='+encodeURIComponent(obj[k]));return a},[]).join('&')
  }
  var opts = {
    provider: location.origin,
    callback: 'ping',
    state: crypto.getRandomValues(new Uint8Array(32)).reduce(function(a,k){return a+''+(k%32).toString(32)},'')
  }

  if(SecureLogin.pubkey) opts.pubkey = SecureLogin.pubkey
  if(scope) opts.scope = toQuery(scope)
  var query = toQuery(opts)
  if(localStorage.securelogin || confirm("Do you have SecureLogin app installed?")){
    localStorage.securelogin = 1
    location = 'securelogin://#'+query
  }else{
    window.open('https://securelogin.pw/#' + query)        
  }
  return opts.state
}
```

The "Secure Login" button on your website/app opens native SecureLogin app: `securelogin://#provider=https://my.app&state=STATE` with following parameters:

**`provider`** - required. Use origin of your app eg https://my.app

**`state`** - required. Generate a random string. SecureLogin app will ping `https://my.app/securelogin?state=STATE&response=SLTOKEN` while your initial request is waiting for SLTOKEN.

At the same time it sends a request to your `/login` action:

```javascript
loginaccount.onclick=function(){
  xhr('/login',{
    sltoken: SecureLogin(), //returns state and opens the app
    authenticity_token: csrf
  }, function(d){
    if(d == 'ok'){
      // force focus, useful for Chrome in full screen
      //if(document.visibilityState!='visible') alert("Logged in successfully.")
      location.reload()
    }else{
      console.log(d)
    }
  })
  return false;
}
```

It the app is not installed it opens `https://securelogin.pw` instead which offers native apps for all platforms along with a Web version. 

New users must type an email and **master password** to create a **Profile**. SecureLogin client runs key derivation function (scrypt) with `logN=18 p=6` which takes up to 20 seconds. 

The keypair derivation is deterministic: running following code will generate the same **profile** on any machine:

```ruby
derived_root = require("scrypt").hashSync("masterpassword",{"N":Math.pow(2,18),"r":8,"p":6},32,"user@email.com").toString("base64")
```

Opening `securelogin://#provider=https://my.app&state=STATE` and clicking "Login" will make the following request internally:

`https://my.app/securelogin?state=STATE&act=ping&response=https%3A%2F%2Fmy.app%252Chttps%3A%2F%2Fmy.app%2Fsecurelogin%252C%252C1496586322%2C2YNnncbnq7won%2B13AzJJqeBRREA9CTjYq%2FDwuGQAGy8LaQGnuH6OE10oLxV4kgJJhflnqdu0qY8bBC08v969Cg%3D%3D%252C%2Fbf0P0dBdDcQlak07UZpR4YnzPc2qw40jCSz1NAuw%2Bs%3D%2Ckdbjcc08YBKWdCY56lQJIi92wcGOW%2BKcMvbSgHN6WbU%3D%252C1uP20QU%2BWYvFf1KAxn3Re0ZYd2pm5vLdQhgkXTCjl44%3D%2Chomakov%40gmail.com`

Which is handled by `/securelogin` path:

```ruby
def securelogin
  state = params[:state].gsub(/[^a-z0-9]/,'')
  response = params[:response].to_s
  REDIS.setex("sl:#{state}", 100, response)
  html "ok"
end
```

This code puts params[:response] into Redis key-value storage so the simultaneous `/login` request the user made few seconds ago can pick it up and proceed.

```ruby
def self.await(state)
  sltoken = false
  state = state.gsub(/[^a-z0-9]/,'')
  # user is given 20 seconds to approve the request
  20.times{
    sleep 1
    sltoken = REDIS.get("sl:#{state}")
    break if sltoken
  }
  
  sltoken
end
```

Once sltoken is received from internal ping, `/login` action must check its validity:

```
def self.csv(str)
  str.to_s.split(',').map{|f| URI.decode(f) }
end

message, signatures, authkeys, email = csv(response)

pubkey, secret = csv(authkeys)
signature, hmac_signature = csv(signatures)

RbNaCl::VerifyKey.new(Base64.decode64(pubkey)).verify(Base64.decode64(signature), message) rescue error = 'Invalid signature' 

provider, client, scope, expire_at = csv(message)

scope = Rack::Utils.parse_query(scope)

error = "Invalid provider" unless %w{http://128.199.242.161:8020 http://c.dev https://cobased.com}.include? provider
error = "Invalid client" unless %w{http://128.199.242.161:8020/securelogin http://c.dev/securelogin https://cobased.com/securelogin}.include? client
error = "Expired token" unless expire_at.to_i > Time.now.to_i

if opts[:change] == true
  error = "Not mode=change token" unless scope["mode"] == 'change' && scope.size == 2
else
  error = "Invalid scope" unless scope == (opts[:scope] || {})
end

```

It unpacks the comma-separated-values `sltoken` to ensure `provider` is equal `https://my.app`, that `client` is equal `https://my.app/securelogin` (we will learn why clients can be on 3rd party domain later), that `scope` is equal empty string (Login request), and that expire_at is valid.

Format of `sltoken`:

csv(csv(provider, client, scope, expire_at), csv(signature, hmac_signature), csv(pubkey, secret), email)

Make sure the signature is valid for given pubkey. If the user with given pubkey does not exist, simply create a new account with given email. 

If all assertions are correct, you can log user in 

```ruby
def login
  sltoken = SecureLogin.await(params[:sltoken])
  return html "Timeout, please try again" unless sltoken

  parsed = SecureLogin.parse(sltoken)

  record = User.find_by(securelogin_pubkey: parsed[:securelogin_pubkey]) || User.create(parsed)

  obj = SecureLogin.verify(sltoken, {
    pubkey: record.securelogin_pubkey, 
    secret: record.securelogin_secret
  })

  if obj[:error]
    render plain: obj[:error]
  else
    session[:user_id] = record.id
    html "ok"
  end
end
```

**Warning about Email verification**: the protocol does not confirm user email and does not intend to do so. In our vision an email provided is merely an address for mails, not a primary key / identifier like in the classic authentication scheme. I.e. two accounts can have equal email.

We don't recommend to confirm / verify it at all and let user specify whatever they want **unless you are obligated by law to require explicit email confirmation**

Check out <a href="https://github.com/homakov/cobased/blob/master/app/controllers/application_controller.rb#L33-L76">real verification Ruby code for our Playground</a>. **Please get in touch** for any help with implementation.

### SDK, implementations and libraries

<a href="https://github.com/homakov/cobased">Ruby on Rails implementation</a>

Help needed for implementations for:

* Wordpress

* Django

* Soft transition from Devise and Omniauth

* Node.js

* any other CMS and platform

## FAQ

### 1. Password managers already exist, what's the point?

First, market penetration rate of password managers is a joke - less than 1%. You may use it, some of your friends may use it, but the rest of the world does not and will not. They are not enforceable on your users. 

Second, they are very inconvenient, especially on mobile. They try to look like a human, looking for inputs and prefilling them. SecureLogin makes websites to implement well defined authentication protocol instead. 

**Most popular managers are not even open source and cost money.** Using closed-source software is a giant no-no for this kind of product.

But more importantly, they do not solve the problem that all our accounts belong to centralized email services via "Reset my password" functionality.

### 2. Master password is single point of failure in this system

Yes, like in all password managers, there's no way to recover your private key without password or recovery key. 

There's common **misunderstanding that email is any different**: try to reset your Gmail password now (backup email doesn't count as it's just turtles all the way down).

In the end of any authentication scheme there will be a password that you just cannot forget. In SecureLogin we removed unnecessary levels of "backups" and "recovery codes", our scheme boils down to one master password, not to master password **and** backup file/paper/SIM card/email account etc. 

### 3. Web version is easier to use. Why install native apps?

Although the web version exists, no one should use it for anything serious. Users must install native clients which don't depend on securelogin.pw web server and generate private key much faster than JavaScript.

### 4. Is it open source? Will it be free in the future?

The protocol and the client are completely open source. They are free now and they will remain free in the future. There is no monetization plan except the one where Sakurity gets more clients for saving the Internet from two-decades long problem.

It is not even technically possible to start charging money for anything: the protocol works client side, no external servers, no API. It's not a promise, it's a fact.

### 5. Is it only for websites? What if we have a mobile app?

It supports desktop and native apps as well. But due to the fact that custom protocols are not registered in a public repository like domains, provider/client parameters are limited to web origin format. You're free to pass `sltoken` back to your app:// from your web-based `client` URL.

### 6. Can it be trusted? What if there's a backdoor?

Currently it's ~600 LOC in JS and 200 LOC in HTML. Most programmers can audit in an hour. There are instructions to build it for all platforms, and we're doing our best to implement reproducable builds in as soon as possible.

### 7. How do I change master password?

Many people bashing deterministc approach say that it's a hassle to manually change password on every website, while in password+vault approach you just change encryption password and keep actual content of the vault the same. This is naive and not paranoid enough to think that sometime in the future your actual vault will leak, as it's stored on Dropbox-like service.

Nevertheless, the change functionality is there: it's called Change SecureLogin which opens SL with scope=`mode=change`. In this mode SL client offers to change from current profile to another profile added to the app. After confirming the website must update pubkey to new one, and no one can log in with old SL profile in that account. 

You would have to do it with every service, and it will be automated to some extent.

## Compatibility & known issues

The core functionality of SecureLogin is based on opening the native app, getting signed `sltoken` and returning user focus back to the same page. It's not easy at all.

### macOS

Chrome, Firefox: seamless experience. In Full Screen mode it's possible to focus back using alert() in Chrome (in Firefox alert does not focus)

Safari: localStorage of /s proxy cannot detect users with native app (because of default privacy settings to drop 3rd party trackers). That's why we ask user to confirm(do you have app) everytime. Also no way to avoid 'Do you want to allow this page to open “SecureLogin.app”?' dialog every time. 

TorBrowser: `SecurityError: The operation is insecure` when trying to open `securelogin://`

### Windows 10

Edge: does not support custom protocol handlers like `securelogin://`. At all. They don't provide any roadmap. Use Web version.

Chrome: working fine.


### Linux



### iOS

Safari: same as in Desktop safari, `/s` proxy does not work because localStorage is blocked for iframes.

It's disallowed to simply close the app, so to go back to previous screen (Safari) user must press top left corner icon, which is really small and barely visible.


### Android

Chrome: seamless experience, but no way to minimize the app so need 2 seconds delay before going to previous screen



### Anti-Phishing Concerns

There's potential possibility of phishing attacks for `callback=ping` only: another hostile page may open `securelogin://state=THEIRSTATE` while you're navigating target website. You would not know which tab in your browser actually opened SL client, there's no way for JS to safely share its `location.origin` with the native app.

Planned mitigations:

1. IP binding for `sltoken` is recommended

2. Alert if the app was fired up twice in a row

3. postMessage event.origin check (only for the Web app)



## Cordova

Cordova is used for iOS and Android platforms. It's not exactly a smooth platform, and there will be native clients in the future, but it does the job.

```
cordova create sl SecureLogin
cd sl

cordova platform add android
cordova platform add ios

cordova plugin add https://github.com/Crypho/cordova-plugin-scrypt.git
cordova plugin add cordova-plugin-customurlscheme --variable URL_SCHEME=securelogin
cordova plugin add cordova-plugin-splashscreen
cordova plugin add cordova-plugin-whitelist
cordova plugin add cordova-plugin-device

cordova run ios
```

## Electron

Electron is employed for macOS, Windows and Linux apps.

```
electron-packager . "SecureLogin" --osx-sign --overwrite --arch=x64 --icon=www/electron.icns


electron-installer-dmg SecureLogin-darwin-x64/SecureLogin.app SecureLogin


electron-packager . "SecureLogin" --platform=mas --osx-sign --overwrite --arch=x64 --icon=www/electron.icns

electron-osx-flat SecureLogin-mas-x64/SecureLogin.app
```

For Windows

```
electron-packager . "SecureLogin" --overwrite --arch=x64 --platform=win32
```



## Roadmap

1. Target developer community (hence everything is on Github and there is no marketing site). Only developers can validate the idea and decide to implement it

2. Focus on SDK libaries and plugins for major CMS/frameworks/languages

3. Engage with users and see what's unclear/buggy to them.

4. SecureLogin Connect will replace OAuth for users who registred with SecureLogin. Simply put a client=http://consumer and provider=http://identity.provider - and the user will see "X requests access to your Y account"

5. In the future, 2.0 will support binding two devices together and approving a `scope` from Desktop + Mobile. 

6. Invest in more efficient derivation

Inconsistent derivation is an issue among all platforms, especially for mobile. In the future current derivation scheme will be called "Weak" (18,6) and new ones will be added (like "Strong" for logN=18 p=20 ). Move to Argon2.

7. Design and branding

Proper logo and improve graphical design.

8. Implement native apps for iOS and Android

While Cordova and Electron are usable, SecureLogin is a small enough app that is cheap to implement for every platform using native architecture.

9. Verifiable builds

Get https://reproducible-builds.org/ for all platforms

10. Setup Bug Bounty program

11. Make sure people don't forget master passwords

This is very important since target audience is "general public": we need to draw a line between Legacy Passwords they could forget and used entire life and Master Passwords that you need just one, but **cannot forget**. Hygiene is completely different.

Track usage and remind after 3, 10 and 30 successful signins to try to type master password again.


12. Use secure enclaves for localStorage or analogs



