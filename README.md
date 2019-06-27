# Do not use! SecureLogin for existing web is not maintained and soon will be part of a whole new approach based on a blockchain. 

Reasons:

1. Lack of incentive from website admins to implement this protocol and put initial friction on shoulders of the users

2. The web and Chrome app versions compromise on security too much, and the desktop version is way too heavy. New version is getting rid from electron and uses pure node.js

3. New protocols are not being adapted if you don't give 10x improvement. SecureLogin by itself wasn't 10x. 

Now SecureLogin is merely 'login' <a href="https://github.com/fairlayer/fair">a method exposed in Fairlayer blockchain</a>. A website can request it, and after the user confirms the JS gets back a token consisting of pubkey and signature of current origin. Difference from original SecureLogin:

* No more provider & client. Client different from provider is only useful for OAuth like interactions, which would be a long way after making this popular for traditional login

* No more secret & hmac given separately - pubkey does the signing job.

* No more timestamp - if you managed to obtain the signature once, you could do it again.

* No more scope - scope could be useful in financial apps only, and fairlayer itself has payments inside.

__So it's not dead, but re-incorporated as simple API into something that has much more potential, has monetization model and fixes much more important problem than merely authentication on the web.__



------

## SecureLogin Protocol

[![Join the chat at https://gitter.im/secureloginpw/Lobby](https://badges.gitter.im/secureloginpw/Lobby.svg)](https://gitter.im/secureloginpw/Lobby?utm_source=badge&utm_medium=badge&utm_campaign=pr-badge&utm_content=badge)

### Abstract

Before you dig into details, try the demos: <a href="https://cobased.com">Rails demo</a>, <a href="https://passport-securelogin.herokuapp.com">Node.js demo</a>

SecureLogin is a decentralized authentication protocol for websites and apps. Classic passwords/2FA are poorly designed, hard to backup and inconvenient to use. SecureLogin is an all-in-one solution that creates a cryptographic private key from your email and master password to sign in everywhere and helps you to forget about passwords.

<a href="https://medium.com/@homakov/securelogin-forget-about-passwords-c1bf7b47f698">Blog post on 1.0 release and our Principles.</a>

Here are major problems it solves:

1. __Password reuse__: SecureLogin's #1 goal is to fix password reuse and simplify authentication process. It should work for everyone, not only for geeks.

2. __Convenience__: existing onboarding process is a disaster for conversion: Email, confirm email, password, confirm password, wait you need one digit and one capital letter, think of a new password, sign up and go to email box to click "Confirm My Email" a 1000th time in your life. **With SecureLogin, it's just two clicks.**

3. __Centralization__: Currently every account depends on an email, which can be used to set a new password. Email is very centralized - majority uses services like Gmail. This is even worse for SMS, which is owned by telecom corporations. This attack is currently exploited in the wild only against political activists, but there's no need to wait for someone to hack a major email/SMS provider – __with SecureLogin there's no central authority, no central server and no way to hijack your account__.

4. __Man-in-the-Middle__: interaction of the user computer and the server is often compromised in between: broken HTTPS, CloudFlare, malicious browser extensions, Man-in-the-Browser and XSS can be prevented when the user explicitly signs every critical transaction. 

5. __Malware__: SecureLogin 2.0 with Doublesign stops malware trying to act on behalf of your account – usually to steal your money. Doublesign is like a "two man rule" - the server must verify two signatures of "scope" which includes every detail of the transaction e.g. SWIFT, amount, currency, account number or Bitcoin address. The entire transaction is signed on both devices (usually desktop + mobile) so compromise of one of them wouldn't be enough to empty your bank account (unlike how it is now).

6. __Phishing__: Many security experts tend to say phishing is the problem of the users not looking at the URL they type their password on. It's totally wrong. We believe phishing is an extremely important problem and we built-in the protocol in a way to make phishing impossible: every message is either sent to a Web/Extension via postMessage, revealing real `event.origin` or to a native app via `ws://127.0.0.1:3101` revealing `Origin` header.

### SecureLogin vs X

SecureLogin is not a OAuth or Single Sign On like Mozilla Persona or Facebook Connect, not a password manager, not a new 2FA option. It's all three in one protocol.

Let's list all popular auth methods and some esoteric ones to see how they deal with these problems for normal users. 

Please note, password managers are not in the table because there's no such thing as a "password manager auth method" - a manager is merely not enforceable. However there is tiny 1% of password managers __users__.


Scheme | Decentralization | Usability | Anti-Malware | Anti-Phishing | Cost / Scalability
--- | --- | --- | --- | --- | ---
Standard | Email provider can set new pw | Poor | No | No | **Free**
Standard + TOTP | **Decentralized** | Poor UX and backups | Delayed, not prevented | No | **Free**
Standard + U2F/Yubikey | **Decentralized** | Worst UX, no usable backup | Delayed, not prevented | **No phishing** | $18+ per dongle
Standard + SMS / Authy / Duo | "2nd factor" is a CA. Vendor lock-in | Overhead UX | Delayed, not prevented | Not fixed | $3+/mo/user Duo, $0.1/Authy request, $0.05/SMS
Magic Links on Email / Mozilla Persona | Email provider is CA | **Greatly improved UX**: (see Slack or Medium) | No | **No phishing** | **Free**
OAuth / OpenID / SAML / SSO | Identity provider controls your account. Vendor lock-in | **Best UX: 2 clicks** | No | **No phishing** | **Free**
SecureLogin |  **Decentralized** | **Best UX: 2 clicks** | 2.0 has scope-specific signatures | **No phishing** | **Free and Open Source**


# How it works?

<a href="https://github.com/sakurity/securelogin-spec">See Protocol Specification</a> (being finalized now)

Check out <a href="https://github.com/homakov/cobased/blob/master/app/controllers/application_controller.rb#L33-L76">real verification Ruby code for our Playground</a>. **Please get in touch** for any help with implementation.

### Add SecureLogin in 5 minutes





#### Implementations

##### Ruby (Reference implementation)

`gem install securelogin`

- [Rails demo](https://github.com/homakov/cobased)

#### Libraries

##### Node.js

- [node-securelogin](https://github.com/andrewda/node-securelogin)
- [passport-securelogin](https://github.com/andrewda/passport-securelogin)

##### Go

- [securelogin](https://godoc.org/github.com/vladimiroff/securelogin)

Help needed for implementations for top 20 of [hot frameworks](https://hotframeworks.com/)

## FAQ

### 1. Password managers already exist, what's the point?

First, market penetration rate of password managers is a joke - less than 1%. You may use it, some of your friends may use it, but the rest of the world does not and will not. They are not enforceable on your users. 

Second, they are very inconvenient, especially on mobile. They try to look like a human, looking for inputs and prefilling them. SecureLogin makes websites to implement well defined authentication protocol instead. 

**Most popular managers are not even open source and cost money.** Using closed-source software is a giant no-no for this kind of product.

But more importantly, they do not solve the problem that all our accounts belong to centralized email services via "Reset my password" functionality.

### 2. Master password is single point of failure in this system

Yes, like in all password managers, there's no way to recover your private key without a password or recovery key. 

There's a common **misunderstanding that email is any different**: try to reset your Gmail password now (backup email doesn't count as it's just turtles all the way down).

In the end of any authentication scheme there will be a password that you just cannot forget. In SecureLogin we removed unnecessary levels of "backups" and "recovery codes", our scheme boils down to one master password, not to master password **and** backup file/paper/SIM card/email account etc. 

### 3. The web version is easier to use. Why install native apps?

Although the web version exists, no one should use it for anything serious. Users should install native clients which don't depend on the securelogin.pw web server and generate private key much faster than JavaScript.

### 4. Is it open source? Will it be free in the future?

The protocol and the client are completely open source. They are free now and they will remain free in the future. There is no monetization plan except the one where Sakurity gets more clients for saving the Internet from a two-decades long problem.

It is not even technically possible to start charging money for anything: the protocol works client side, no external servers, no API. It's not a promise, it's a fact.

### 5. Is it only for websites? What if we have a mobile app?

It supports desktop and native apps as well. But due to the fact that custom protocols are not registered in a public repository like domains, provider/client parameters are limited to web origin format. You're free to pass `sltoken` back to your app:// from your web-based `client` URL.

### 6. Can it be trusted? What if there's a backdoor?

Currently it's ~600 LOC in JS and 200 LOC in HTML. Most programmers can audit it in an hour. There are instructions to build it for all platforms, and we're doing our best to implement reproducable builds as soon as possible.

### 7. How do I change master password?

Just click inside the app and change it. See wiki https://github.com/sakurity/securelogin/wiki/How-password-is-changed

## Compatibility & known issues

The core functionality of SecureLogin is based on opening the native app, getting a signed `sltoken` and returning user focus back to the same page. It's not easy at all.

### macOS

Chrome, Firefox: great. In Full Screen mode it's possible to focus back using alert() in Chrome (in Firefox alert does not focus)

Safari: OK. No way to avoid 'Do you want to allow this page to open “SecureLogin.app”?' dialog every time. 3 clicks required. Requires extra HTTP server for proxy page.

TorBrowser: `SecurityError: The operation is insecure` when trying to open `securelogin://`

### Windows 10

Edge: does not support custom protocol handlers like `securelogin://`. At all. They don't provide any roadmap. Use the Web version.

Chrome, Firefox: great.


### Linux



### iOS

All-in-all iOS and Safari are quite hostile to the flow SecureLogin uses on all other platforms.

It takes **5 clicks** to get through regular login experience, while just 2 for all other platforms:

1. SecureLogin button. opens a window that has another button to open SL client

2. clicking second button opens third window (yes, it's required) where Safari finally asks to open the App

3. Confirm opening, now HTTP & WS servers are running. 2nd tab is redirected to :3102/proxy.html and sends a message to WS with auth request

4. Confirm request inside the app

5. Press tiny "Back to Safari" sign in top left corner of the screen.

Only 1 and 4 are required on other platforms. Due to bad UX and Safari not following the spec we drop iOS app for now. Users should use the web app (security of a native app on iOS is actually imaginary - the platform is way too closed down). We will iterate back to it and try to fix it with Action Extension for Safari (the way 1Password works right now). 

### Android

Chrome: great.





## Chrome Extension

If you want to, side-load the CE directly from this repository. Preserve `"key"` inside manifest.json - it keeps chrome-extension URL static.

`zip -r www.zip www -x *.git*` 

Don't forget to ignore .git when packing for Chrome Store.

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
```

Plugins are ready, so last step is replacing www with our codebase:

```
rm -rf www
git clone git@github.com:sakurity/securelogin.git www
```

Now you can use `cordova run ios` / `cordova run android`

## Electron

Electron is employed for macOS, Windows and Linux apps.

<a href="https://github.com/sakurity/securelogin-electron">Use this repository.</a> Here are some useful commands for building packages for distribution.

Outside of Mac App Store

```
electron-packager . "SecureLogin" --osx-sign --overwrite --arch=x64 --icon=www/electron.icns
electron-installer-dmg SecureLogin-darwin-x64/SecureLogin.app SecureLogin
```

For Mac App Store
```
electron-packager . "SecureLogin" --platform=mas --osx-sign --overwrite --arch=x64 --icon=www/electron.icns

electron-osx-flat SecureLogin-mas-x64/SecureLogin.app
```

For Windows

```
electron-packager . "SecureLogin" --overwrite --arch=x64 --platform=win32
```



## Roadmap

See Issues and Projects.


