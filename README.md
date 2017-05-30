## SecureLogin Protocol

### Abstract

<a href="https://cobased.com">Try the demo now?</a>

SecureLogin is decentralized authentication protocol for websites and apps. Classic passwords/2FA are poorly designed, hard to backup and inconvenient to use. SecureLogin is all-in-one solution that creates a cryptographic private key from your email and master password to sign in everywhere and helps you to forget about passwords.

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
    <td class=g3>V2 with Doublesign will protect from malware with scope-specific signature</td>
    <td class=g3>Free and Open Source</td>
  </tr>
</table>


# How it works?

The "Secure Login" button on your website/app opens SecureLogin app: `securelogin://provider=https://my.app&state=STATE` with following parameters:

**`provider`** - required. Use origin of your app eg https://my.app

**`state`** - required. Usage depends on type of callback you're using: `ping` or direct. For `ping` use a random string and send it along with your request. SecureLogin app will send signed `sltoken` to your server callback with exact `state` so your first request can proceed.

`callback` - `direct` by default or `ping` (recommended). `direct` callback opens `client` URL in the system browser. Ping response makes internal GET request to `client` URL instead. Read Ping vs Direct explanation below.

`client` - defaults to provider+'/securelogin', URL which will be opened or pinged (depends on `callback` setting), consumer of the token.  It's recommended to use default `/securelogin` but you may send any path on your domain.

`scope` - defaults to empty string, for regular sign-in functionality. However, financial services may benefit from signing critical requests such as money transfer: `Action=Delete%20Account` or `Action=Money%20Transfer&Amount=1.3&Address=FRIEND`

New users should type an email and **master password**. SecureLogin client runs key derivation function (scrypt) with `logN=18 p=6` which takes up to 20 seconds. The keypair derivation is deterministic: running following code will generate the same hash on any machine:

```
derived_root = require("scrypt").hashSync("masterpassword",{"N":Math.pow(2,18),"r":8,"p":6},32,"user@email.com").toString("base64")
```

Existing users will get a screen with `provider` on top and a Login button.

After clicking Login the client sends signed `sltoken` to `client` URL on your server. Verification code looks like <a href="https://github.com/homakov/cobased/blob/master/app/controllers/application_controller.rb#L33-L76">this</a>

### SDK, implementations and libraries

<a href="https://securelogin.pw/sdk.js">JS SDK</a> - tiny JS helper. Please do not hot-link and use self-hosted code. 

<a href="https://github.com/homakov/cobased">Ruby on Rails implementation demo</a>


## FAQ

### 1. Password managers already exist, what's the point?

First, market penetration rate of password managers is a joke - less than 1%. You may use it, some of your friends may use it, but the rest of the world does not and will not. They are not enforceable on your users. 

Second, they are very inconvenient, especially on mobile. They try to look like a human, looking for inputs and prefilling them. SecureLogin makes websites to implement well defined authentication protocol instead. 

**Most popular managers are not even open source and cost money.** Using closed-source software is a giant no-no for this kind of product.

But more importantly, they do not solve the problem that all our accounts belong to centralized email services via "Reset my password" functionality.

### 2. Master password is single point of failure in this system

Yes, like in all password managers, there's no way to recover your private key without password or recovery key. 

There's common misunderstanding that email is any different: try to reset your Gmail password now (backup email doesn't count as it's just turtles all the way down).

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

`electron-packager . "SecureLogin" --osx-sign --overwrite --arch=x64 --icon=./electron.icns`



## Roadmap

1. Target developer community (hence everything is on Github and there is no marketing site). Only developers can validate the idea and decide to implement it

2. Focus on SDK libaries and plugins for major CMS/frameworks/languages

3. Engage with users and see what's unclear/buggy to them.

4. SecureLogin Connect will replace OAuth for users who registred with SecureLogin. Simply put a client=http://consumer and provider=http://identity.provider - and the user will see "X requests access to your Y account"

5. In the future, V2 will support binding two devices together and approving a `scope` from Desktop + Mobile. 

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


