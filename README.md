## SecureLogin Protocol

### Abstract

<a href="https://cobased.com">Try the demo now?</a>

SecureLogin is decentralized authentication protocol for websites and apps. Classic passwords/2FA are poorly designed, hard to backup and inconvenient to use. SecureLogin is all-in-one solution that creates a cryptographic private key from your email and master password to sign in everywhere and helps you to forget about passwords.

Here are 5 major problems it solves:

1. __Password reuse__: SecureLogin's #1 goal is to fix password reuse and simplify authentication process. It is working for everyone, not just for the geeks.

2. __Usability__: existing onboarding process is a disaster for conversion: Email, confirm email, password, confirm password, wait you need one digit and one capital letter, think of a new password, sign up and go to email box to click "Confirm My Email" a 1000th time in your life. **With SecureLogin, it's just two clicks.**

3. __Central authority__: Currently every account depends on a email, which can be used to set a new password. Email is very centralized - majority uses services like Gmail. This is even worse for SMS, which is owned by telecom corporations. This attack is currently exploited in the wild only against political activists, but there's no need to wait for someone to hack a major email/SMS provider – __with SecureLogin there's no central authority, no central server and no way to hijack your account__.

4. __Man-in-the-Middle__: interaction of the user computer and the server is often compromised in between: broken HTTPS, CloudFlare, malicious browser extensions, Man-in-the-Browser and XSS can be prevented when the user explicitly signs every critical transaction. 

5. __Malware__: SecureLogin 2.0 with Doublesign stops malware trying to act on behalf of your account – usually to steal your money. Doublesign is like a "two man rule" - the server must verify two signatures of "scope" which includes every detail of the transaction e.g. SWIFT, amount, currency, account number or Bitcoin address. Entire transaction is signed on both devices (usually desktop + mobile) so compromise of one of them wouldn't be enough to empty your bank account (unlike how it is now).

### SecureLogin vs X

SecureLogin is not a new OAuth (<a href="http://sakurity.com/oauth">but there's new better OAuth over here</a>), not a password manager, not a new 2FA option. It's all three in one protocol.

Let's list all popular auth methods and some esoteric ones to see how they deal with these 5 problems for normal users. 

Please note, password manager are not in the table because there's no such thing as "password manager auth method" - a manager is merely not enforceable. However there is tiny 1% of password managers __users__.


<table border=1px>
  <tr>
    <td>Auth Scheme</td>
    <td>Reuse/3rd Party Leak</td>
    <td>Central Authority</td>
    <td>Register/Login/Recovery Usability</td>
    <td>MitM / Malware stealing money</td>
    <td>Cost</td>
  </tr>

  <tr>
    <td>Standard</td>
    <td class=g1>Most people reuse passwords</td>
    <td class=g1>Email provider can set new pw</td>
    <td class=g1>Terrible UX</td>
    <td class=g1></td>
    <td class=g3></td>
  </tr>

  <tr>
    <td>Standard + TOTP</td>
    <td class=g1></td>
    <td class=g3>Password is not enough to login</td>
    <td class=g1>Terrible UX + inconvenient "paper" backup codes + typing 6 digits every time</td>
    <td class=g2>Delayed, not prevented (malware can wait for the user to enter OTP code)</td>
    <td class=g3></td>
  </tr>

  <tr>
    <td>Standard + U2F/Yubikey</td>
    <td class=g1></td>
    <td class=g3>Password is not enough to login</td>
    <td class=g1>Terrible UX, no usable backup strategy at all, no iOS support</td>
    <td class=g2>Delayed, not prevented</td>
    <td class=g1>$19+ per plastic dongle</td>
  </tr>

  <tr>
    <td>Standard + SMS / Authy / Duo</td>
    <td class=g1></td>
    <td class=g1>"Second" factor is a central authority too just like email provider. Plus vendor lock-in.</td>
    <td class=g2>Duo offers nice user interface, but register/login experience is still slow and painful</td>
    <td class=g2>Delayed, not prevented</td>
    <td class=g1><a href="https://duo.com/pricing">$3+/mo/user</a>, <a href="https://www.authy.com/product/pricing/">$0.1/request</a>, $0.05/SMS</td>
  </tr>



  <tr>
    <td>Magic Link on Email / Mozilla Persona</td>
    <td class=g3>No password - no reuse</td>
    <td class=g1>Email provider can login on behalf of your account</td>
    <td class=g2>Greatly improved UX: that's why Slack and Medium already adopted Magic Links</td>
    <td class=g1></td>
    <td class=g3></td>
  </tr>

  <tr>
    <td>OAuth / OpenID / SAML / any SSO</td>
    <td class=g3></td>
    <td class=g1>OAuth provider can login on behalf of your account, vendor lock-in</td>
    <td class=g3>Best UX: 2 clicks</td>
    <td class=g1></td>
    <td class=g3></td>
  </tr>


  <tr class="esoteric">
    <td>Trezor (U2F is included)</td>
    <td class=g3></td>
    <td class=g3>Signing key never leaves your hardware token</td>
    <td class=g1>Requires using a token every time, writing down 24 words, no iOS support. (However, great for Bitcoin)</td>
    <td class=g2>Scope-specific signature is currently implemented <a href="http://doc.satoshilabs.com/trezor-user/makingpayments.html">only for TREZOR Wallet</a>, not available as API for any website</td>
    <td class=g1><a href="https://shop.trezor.io">$128</a></td>
  </tr>




  <tr>
    <td>SecureLogin</td>
    <td class=g3></td>
    <td class=g3>Signing key never leaves your device</td>
    <td class=g3>2 Clicks register/login experience. Works on all platforms. Master password is all you need for recovery</td>
    <td class=g3>SecureLogin2 with Doublesign protects from malware with scope-specific signature</td>
    <td class=g3>Forever Free and Open Source</td>
  </tr>
</table>

### Step 1. Redirect to SecureLogin client

You can use external SecureLogin SDK or copy it to your server

`<script src="https://securelogin.pw/sdk.js" integrity="sha384-cmzAgn2ei6Y8ZbyWS7WhxzGCjdZ+VTo5MIZBTkmPFW/ZxMbdktzDbWv3gZzu0/kB" crossorigin="anonymous"></script>`

Login button to put in your HTML

`<a class="securelogin-login" style="background-color:#0b6efd;color:#fff;padding:0.5em 1em;margin: 0 auto;">Secure Login</a>`

"Secure Login" button opens a window `https://securelogin.pw/s#provider=https://my.app&state=STATE`. `/s` is a proxy URL that runs a native app `securelogin://provider=https://my.app&state=STATE` for existing SecureLogin users or redirects to Web version for new users (where they can also choose and download a native client).

Parameters:

`provider` - required. Use origin of your app eg https://my.app

`state` - required. Use a random string, save locally and verify that `state` from response is equal `state` from localStorage/cookies/etc to prevent CSRF.

`client` - defaults to provider+'/securelogin'. Works as redirect_uri in OAuth, consumer of the token.  It's recommended to scope securelogin-related functionality under /securelogin endpoint on your app, however you may supply any URI on any domain.

`scope` - defaults to empty string, for regular sign-in functionality. Some applications may want to use it to sign critical requests such as money transfer: `Action=Delete%20Account` or `Action=Money%20Transfer&Amount=1.3&Address=FRIEND`

### Step 2. Private key generation

It's recommended to install native versions for all users for two reasons: web applications <a href="https://sakurity.com/blog/2015/07/28/appcache.html">cannot be trusted</a> and performance of scrypt password derivation.

New users must type an email and first password. It runs key derivation function (scrypt) for 10-50 seconds. It's longer than any other software to prevent offline bruteforce even for the weak passwords. Then SecureLogin warns the user to either remember their password or backup the recovery code (which is derived material from the password).

`p` value for scrypt function depends on security mode user has chosen. The longer derivation, the better.

```
derived_root = require("scrypt").hashSync("firstpassword",{"N":Math.pow(2,18),"r":8,"p":1},32,"email").toString("base64")
```


After clicking Sign In/Approve user is redirected to `client` endpoint (provider+"/securelogin" by default):

`https://my.app/securelogin?response=TOKEN,REGISTRATION&state=STATE`

`response` parameter is csv of TOKEN=`SIG.BODY` and REGISTRATION=`FIRSTKEY,SECONDKEY,PUBKEY,SHAREDSECRET` (returned only for empty-scope login requests)

### Step 4. Verification

First, you need to check if this tfid already exists in your database. You can get it from TOKEN's body which is csv of: tfid, provider, client, scope, expire_at. If it doesn't, create a new user with  `User.create email: tfid, securelogin: REGISTRATION`

You may sign in user right away to freshly created account, but it's better to go through regular sign in procedure for smoke-testing.

For sign in just verify validity of SIG for BODY using PUBKEY. Example in Ruby:

`RbNaCl::VerifyKey.new(dec(PUBKEY)).verify(dec(SIG), BODY) rescue error = 'Wrong signature'`

Then check that this TOKEN was created for your client with proper scope

```
error = "Invalid provider" unless %w{http://c.dev https://cobased.com}.include? provider

error = "Invalid client" unless %w{http://c.dev/securelogin https://cobased.com/securelogin}.include? client

error = "Expired token #{expire_at} #{message}" unless expire_at.to_i > Time.now.to_i

error = "Invalid scope" unless scope == ''
```

After verifying all fields of the token you can sign user in or perform the action allowed in scope parameter.

### SDK, implementations and libraries

<a href="https://securelogin.pw/sdk.js">JS SDK to include in your login page</a>

<a href="https://github.com/homakov/cobased">Ruby on Rails implementation demo</a>.


### Adoption Strategy

1. Target developer community (hence everything is on Github and there is no marketing site). Only developer can validate the idea and decide to implement it

2. Grow SDK libaries and plugins for major CMS/frameworks/languages

3. Engage with users and see what's unclear/buggy to them.


4. SecureLogin Connect will replace OAuth for users who registred with SecureLogin. Simply put a client=http://consumer and provider=http://identity.provider - and the user will see "X requests access to your Y account"

5. SecureLogin Wallet generates addresses and mnemonic for major cryptocurrencies



### FAQ

* Like in all password managers, there's no way to recover your private key without password or recovery key. There's common misunderstanding that email is any different: try to reset your Gmail password now (backup email doesn't count as it's just turtles all the way down).

* Although the web version exists, no one should use it for anything serious. Users must install native clients which don't depend on securelogin.pw web server and generate private key much faster than JavaScript.




# Technical Documentation

## Build

### Cordova


```

cordova create sl SecureLogin
cd sl

cordova platform add android
cordova platform add ios

cordova plugin add https://github.com/Crypho/cordova-plugin-scrypt.git
cordova plugin add cordova-plugin-customurlscheme --variable URL_SCHEME=securelogin
cordova plugin add cordova-plugin-splashscreen

cordova run ios
```

Problem? Remove and add.

cordova platform remove ios;cordova platform add ios

# Roadmap


## 1. More smooth navigation back to initial page

After opening a tab with client callback, it gets closed after setting localStorage response token. Sometimes the user has other tabs open after the original tab and the browser switches to last one, not the tab that requested SecureLogin authentication. The only known way to re-focus is to alert() which is inconvenient. 


## 2. Invest in more efficient derivation

Inconsistent derivation is an issue among all platforms, especially for mobile. In the future current derivation scheme will be called "Weak" (18,6) and new ones will be added (like "Strong" for logN=18 p=20 )


## 3. Design and branding

Proper logo and improve graphical design.


## 4. Implement native apps for iOS and Android

While Cordova and Electron are usable, SecureLogin is a small enough app that is cheap to implement for every platform using native architecture.


## 5. Verifiable builds
Get https://reproducible-builds.org/ for all platforms




## Wordings

"master password" must be used everywhere instead of just password to distinguish. "passphrase" is too unpopular.