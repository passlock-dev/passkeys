<!-- PROJECT LOGO -->
<div align="center">
  <a href="https://github.com/passlock-dev/passkeys-frontend">
    <img src="https://github.com/passlock-dev/passkeys-frontend/assets/208345/53ee00d3-8e6c-49ea-b43c-3f901450c73b" alt="Passlock logo" width="80" height="80">
  </a>
</div>

<a name="readme-top"></a>
<h3 align="center">Passkeys by Passlock</h3>

  <p align="center">
    Simple, yet powerful passkey library for React, Angular, Vue, Svelte and other frameworks.
    <br />
    <a href="https://passlock.dev"><strong>Project website »</strong></a>
    <br />
    <br />
    <a href="https://passlock.dev/#demo">View Demo</a>
    ·
    <a href="https://docs.passlock.dev">Documentation</a>
    ·
    <a href="https://passlock.dev/contact">Request Feature</a>
  </p>
</div>

<br />

https://github.com/passlock-dev/passkeys-frontend/assets/208345/14818e66-83bc-4ca3-a996-fe54c94a8e87

# Introduction

<br />

> [!IMPORTANT]
> Passlock is expected to launch in Jan/Feb '24. Please subscribe to our [newsletter][newsletter] for updates.

<br />

<!-- TABLE OF CONTENTS -->
<details>
  <summary>Table of Contents</summary>

  * [Features](#features)
  * [Motivation](#motivation)
  * [Getting started](#getting-started)
  * [Basic usage](#basic-usage)
    * [Passkey registration](#passkey-registration)
    * [Passkey authentication](#passkey-authentication)
  * [Contact details](#contact)
</details>

Really simple Passkey client library. You don't need to learn the underlying [WebAuthn API][webauthn] or protocols, and all the backend stuff is handled by a serverless platform. It's a really simple 3 step process:

1. Use this library to obtain a token on your frontend
2. Pass the token to your backend
3. Call the REST API to exchange the token for the authentication result

> [!NOTE]
> In step 3, you can instead verify and examine a JWT, thereby saving the network trip.

# Features

Passkeys and the WebAuthn API are quite complex. We've taken an opinionated approach to the implementation and feature set to simplify things for you. Following the 80/20 principle we've tried to focus on the features most valuable to developers and users. We welcome feature requests so do [get in touch][contact].

1. **☝🏻Biometrics** - Passkeys allows you to enforce facial or fingerprint recognition in your websites and web apps. We've made it really easy.

2. **🔐 Step up authentication** - Require biometric or PIN verification for some actions e.g. changing account details, whilst allowing frictionless authentication for others.

3. **📱 Platform authenticators** - WebAuthn supports external authenticators like YubiKeys and NFC devices. That's not our target audience, at least not for now. Our focus is _platform authenticators_ i.e. passkeys managed by the smartphone, tablet or computer itself.

4. **☁️ Cloud sync** - Similar to a cloud password manager, passkeys can be synced with to a cloud account e.g. iCloud. It also allows the user the recover their account if they loose (or accidentally wipe) a device.

<p align="right">(<a href="#readme-top">back to top</a>)</p>

# Motivation

Password authentication is widely understood by both developers and users, but is fast [becoming obsolete][password-issues]. The need for complex password policies and secondary authentication e.g. Google Authenticator, SMS or email codes adds both complexity and friction. 

Passkeys are an emerging technology based on the browser Web Authentication API (WebAuthn) that solve many of the security and usability issues associated with passwords. Passkeys are [supported by all major browsers][passkey-browser-support] (desktop and mobile). Unfortunately the underlying WebAuthn API and protocols are complex.

After implementing Passkey authentication on several projects, I realised there was a lot of repetition, mostly around the registration and authentication ceremonies. As a web developer implementing passkeys, I don't care about cryptographic ciphers, binary encoding etc. I just want to "authenticate this user".

<details>
  <summary>Why serverless?</summary>
  
  <br />

  <p>My original plan was to publish an open source implementation for both the frontend and backend so developers could self host their own stuff.</p>
  
  <p>The problem is that whilst JS/TS is ubiquitous on the frontend, there are many backend languages, frameworks and deployment scenarios. You may be running an AWS lambda function with an old version of Node.js, or a Django controller with the latest version of Python, or .NET, Java, Ruby, Go ...</p>

  <p>Cryptography is pretty unforgiving, so maintaining many low level libraries is a challenge for even the largest organisations. By offering a serverless platform we can offer a secure, scalable passkey solution to **all** developers, irrespective of the tech stack.</p>
</details>

<p align="right">(<a href="#readme-top">back to top</a>)</p>

# Getting started

## Prerequisites

Create an account on [passlock.dev][passlock-signup] and obtain your `clientId` (for the frontend), `apiKey` (for the backend), and `tenancyId` (frontend & backend).

## Install the Passlock frontend library

This will depend on your package manager:

`npm add @passlock/passkeys`  
`pnpm add @passlock/passkeys`  
`yarn add @passlock/passkeys`

# Basic usage

This quickstart guide illustrates the simplest scenario, using token based verification i.e. the client library returns a token which you send to your backend. Your backend code then calls a REST API to exchange the token for an object representing the authenticated user.

An alternative flow uses JWTs with public key encryption to avoid the need for the REST call on the backend. Please see the [documentation][docs] for more details.

**Note:** The flow is conceptually similar to OAuth2/OIDC but without the redirects.

## Passkey registration

You just need to call `register()`, passing in a few options. This will do three things:

1. Generate a passkey and store it on the device
2. Register the passkey in the Passlock backend
3. Generate a token representing the newly created credential

This token should then be sent to your backend. Your backend should call the Passlock REST API to verify the token, before linking the userId with your own user entity.

### Create a passkey (frontend)

```typescript
import { arePasskeysSupported, register, isPasslockError } from '@passlock/passkeys'

const tenancyId = process.env.PASSLOCK_TENANCY_ID
const clientId = process.env.PASSLOCK_CLIENT_ID

const passkeysSupported = await arePasskeysSupported()
if (!passkeysSupported) {
  // browser doesn't support passkeys, fallback to 
  // username/password, one time login codes etc
  return
}

// pseudocode - get these details from your registration form, 
const { email, firstName, lastName } = getUserDetails()

// Note: passlock doesn't throw. You should examine the result and interrogate any errors
const result = await register({ tenancyId, clientId, email, firstName, lastName })

if (isPasslockError(result)) {
  console.err(result) // PasslockError object
} else {
  console.log(result) // See what passlock sent back
  
  // pseudocode - send the token to your backend, potentially
  // with any other information you captured on your registration page
  await linkAccount(result.token)
}
```

### Link the passkey (backend)

Assuming the passkey was successfully created, you now need to exchange the Passlock token for a Passlock
user object and link it with your own user entity. Note that you don't need to use the Passlock library
on the backend, you just need to make a REST call to our API.

```typescript
// Express.js

const tenancyId = process.env.PASSLOCK_TENANCY_ID
const apiKey = process.env.PASSLOCK_API_KEY

app.post('/register/passlock', async function(req, res) {
  const token = req.body.token
  const url = `https://api.passlock.dev/${tenancyId}/token/${token}`

  // TODO check for 403, 404, 500 etc
  const response = await axios.get(url, { 
    headers: { `X-API-KEY`: apiKey }
  })

  // pseudocode - link the Passlock userId with an existing user 
  // or create a new user in your backend
  const user = await createAccount(response.data.subject)

  // log the user in
  req.session.user = user

  res.json({ user })
})
```

## Passkey authentication

Similar to registration, call `authenticate()` to obtain a token, which you then pass to your backend.

### Authenticate (frontend)

```typescript
import { arePasskeysSupported, authenticate, isPasslockError } from '@passlock/passkeys';

const tenancyId = process.env.PASSLOCK_TENANCY_ID
const clientId = process.env.PASSLOCK_CLIENT_ID

const passkeysSupported = await arePasskeysSupported()
if (!passkeysSupported) return

const result = await authenticate({ tenancyId, clientId })

if (isPasslockError(result)) {
  console.err(result)
} else {
  // pseudocode - send the token to your backend
  await login(result.token)
}
```

### Verify the passkey (backend)

Just exchange the token for a Passlock user, then lookup your own user entity using the Passlock user id

```typescript
// Express.js

app.post('/authenticate/passlock', async function(req, res) {
  const token = req.body.token
  const url = `https://api.passlock.dev/${tenancyId}/token/${token}`

  // TODO check for 403, 404, 500 etc
  const response = await axios.get(url, { 
    headers: { `X-API-KEY`: apiKey }
  })

  // pseudocode - use the Passlock userId to lookup a user in your db
  const user = await lookupUser(response.data.subject.id)

  // revert to your own session storage e.g. using express-session middleware
  req.session.user = user

  res.json({ user })
})
```

## Contact

Our [contact details][contact] can be found on our website

<p align="right">(<a href="#readme-top">back to top</a>)</p>

[newsletter]: https://passlock.dev/#newsletter
[demo]: https://passlock.dev/#demo
[webauthn]: https://www.w3.org/TR/webauthn-2/
[password-issues]: https://passlock.dev/blog/authentication/password-policies
[passkey-browser-support]: https://passlock.dev/blog/passkeys/passkey-browser-support-2023
[contact]: https://passlock.dev/contact
[docs]: https://passlock.dev
[passlock-signup]: https://passlock.dev
