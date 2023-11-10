<a name="readme-top"></a>

<!-- PROJECT LOGO -->
<br />
<div align="center">
  <a href="https://github.com/github_username/repo_name">
    <img src="images/passlock-logo.svg" alt="Passlock logo" width="80" height="80">
  </a>

<h3 align="center">Passkeys by Passlock</h3>

  <p align="center">
    Simple, yet powerful passkey library for React, Angular, Vue, Svelte and other frameworks.
    <br />
    <a href="https://docs.passlock.dev"><strong>Explore the docs »</strong></a>
    <br />
    <br />
    <a href="https://passlock.dev/#demo">View Demo</a>
    ·
    <a href="https://github.com/passlock-dev/passkeys-frontend/issues">Report Bug</a>
    ·
    <a href="https://passlock.dev/contact">Request Feature</a>
  </p>
</div>

https://github.com/passlock-dev/passkeys-frontend/assets/208345/14818e66-83bc-4ca3-a996-fe54c94a8e87

# JS/TS Passkeys library (framework agnostic)

Really simple Passkey client library. You don't need to learn the underlying [WebAuthn API][webauthn] or protocols, and all the backend stuff is handled for you by our serverless platform. It's a really simple 3 step process:

1. Call this library in your frontend to obtain a token
2. Pass the token to your backend
3. Call our REST API to exchange the token for the authentication result

**Note:** If you're comfortable with JWTs, you can verify our JWT in step 3 instead of calling the REST API, thereby saving a network trip.

<h2>Table of contents</h2>

[1. Demo](#demo)  
[2. Motivation](#motivation)  
[3. Features](#features)  
[4. Getting started](#getting-started)

## Demo

Please checkout the [demo][demo] on [passlock.dev](https://passlock.dev). 

## Motivation

Password authentication is widely understood by both developers and users, but is fast [becoming obsolete][password-issues]. The need for complex password policies and secondary authentication e.g. Google Authenticator, SMS or email codes adds both complexity and friction. 

Passkeys are an emerging technology based on the browser Web Authentication API (WebAuthn) that solve many of the security and usability issues associated with passwords. Passkeys are [supported by all major browsers][passkey-browser-support] (desktop and mobile). Unfortunately the underlying WebAuthn API and protocols are complex.

After implementing Passkey authentication on several projects I realised there was a lot of repetition, mostly around the registration and authentication ceremonies. As a web developer implementing Passkeys, I don't care about cryptographic ciphers, binary encoding etc. I just want to "authenticate this user".

### Why Serverless?

My original plan was to publish an open source implementation for both the frontend **_and backend_** so developers could self host their own stuff.

The problem is that whilst JS/TS is ubiquitous on the frontend, there are many backend languages frameworks and deployment scenarios. You may be running an AWS lambda function with an old version of node.js, or a Django controller with the latest version of Python, or .NET, Java, Ruby, Go ...

Cryptography is pretty unforgiving, so maintaining many low level libraries is a challenge for even the largest organisations. By offering a serverless platform we can offer a secure, scalable passkey solution to **all** developers, irrespective of the tech stack.

## Features

As already mentioned Passkeys and the WebAuthn API are quite complex. We've taken an opinionated approach to the implementation and feature set to simplify things for you. Following the 80/20 principle we've tried to focus on the features most valuable to developers and users. We welcome feature requests so do [get in touch][contact].

1. **☝🏻Biometrics** - Passkeys allows you to enforce facial or fingerprint recognition in your websites and web apps. We've made it really easy.

2. **🔐 Step up authentication** - Require biometric or PIN verification for some actions e.g. changing account details, whilst allowing frictionless authentication for others.

3. **📱 Platform authenticators** - WebAuthn supports external authenticators like YubiKeys and NFC devices. That's not our target audience, at least not for now. Our focus is _resident authenticators_ i.e. passkeys managed by the smartphone, tablet or computer itself.

4. **☁️ Cloud sync** - Similar to a cloud password manager, passkeys can be synced with to a cloud account e.g. iCloud. It also allows the user the recover their account if they loose (or accidentally wipe) a device.

## Getting started

This quickstart guide illustrates the simplest scenario, using token based verification i.e. the client library returns a token which you send to your backend. Your backend code then calls a REST API to exchange the token for an object representing the authenticated user.

An alternative flow uses JWTs with public key encryption to avoid the need for the REST call on the backend. Please see the [documentation][docs] for more details.

### 1. Create a free Passlock account

Create a free account on [passlock.dev][passlock-signup] and obtain your `Tenancy Id` and an `API Key`

### 2. Install the Passlock frontend client

This will depend on your package manager:

`npm add @passlock/passkeys-frontend`

`pnpm add @passlock/passkeys-frontend`

`yarn add @passlock/passkeys-frontend`

### 3. Create a Passlock instance in the frontend

Passlock can be configured by passing various options to the constructor. Please see the [documentation][docs] for more details. The only required field is `tenancyId`.

```typescript
import { Passlock } from "@passlock/passkeys-frontend";

const passlock = new Passlock({ tenancyId: 'my-tenancy-id' });
```

### 4a. Create and register a passkey in your frontend

You just need to call `passlock.register()`. This will do three things:

1. Generate a passkey and store it on the device
2. Register the passkey in the Passlock backend
3. Generate a token representing the newly created credential

This token should then be sent to your backend. Your backend should call the Passlock REST API to verify the token, before linking the passlock userId with your own user entity.

```typescript
import { ErrorCodes } from "@passlock/passkeys-frontend";

if (passlock.isSupported()) {
  const token = await registerPasskey()
} else {
  // Fallback to username/password, email or social login.
}

async function registerPasskey() {
  // Note: passlock doesn't throw. You should instead examine the
  // result and interrogate any errors
  const result = await passlock.register()

  if (result.ok && result.token) {
    await linkAccount(result.token)
  } else if (result.error) { ... }
}

/**
 * Post the token to your backend, remember about CORS!
 */
async function linkAccount(passlockToken: string) {
  await fetch("https://example.com/register/passlock", {
    method: "POST",
    headers: {
      `Content-Type`: "application/json"
    },
    body: JSON.stringify({ passlockToken })
  })
}
```

### 4b. Link the Passlock user id in your backend

Assuming the passkey was successfully created, you now need to exchange the Passlock token for a Passlock
user object and link it with your own user entity. Remember you can't trust anything coming from the client, so simply sending the passlock user id and blindly linking it isn't a good idea.

```typescript
// Express.js

app.post('/register/passlock', async function(req, res) {
  const passlockUserId = await verifyPasslockToken(req.body.token)

  // pseudocode - link the Passlock userId with an existing user
  // or create a new user in your backend
  const user = await linkAccount({ passlockUserId })

  req.session.user = user

  res.json({ user })
}

async function verifyPasslockToken(token: string) {
  const tenancyId = process.env.PASSLOCK_TENANCY_ID;
  const apiKey = process.env.PASSLOCK_API_KEY;
  const url = `https://api.passlock.dev/${tenancyId}/verify`

  const response = await axios.post(url, { token })
  if (!response.data.verified) { /* verification failed */ }

  // the passlock userId
  return response.data.userId
}
```

### 5a. Authenticate a user in your frontend

Similar to 4a, just call `passlock.authenticate()` to obtain a token, which you then pass to your backend.

```typescript
import { ErrorCodes } from "@passlock/passkeys-frontend";

if (passlock.isSupported()) {
  await authenticatePasskey()
} else { ... }
 
async function authenticatePasskey() {
  const result = await passlock.authenticate()

  if (result.ok && result.token) {
    await verifyToken(result.token)
  } else if (result.error) { ... }
}

async function verifyToken(passlockToken: string) {
  // post the token to your backend, remember about CORS!
  await fetch("https://example.com/authenticate/passlock", {
    method: "POST",
    headers: {
      `Content-Type`: "application/json"
    },
    body: JSON.stringify({ passlockToken })
  })
}
```

### 5b. Authenticate a user in your backend

Almost identical to 4b, just exchange the token for a Passlock user, then lookup your own user entity using the Passlock userId:

```typescript
// Express.js

app.post('/authenticate/passlock', async function(req, res) {
  const token = req.body.token
  
  // see 4b (Link the Passlock userId in your backend)
  const passlockUserId = await verifyPasslockToken(token)

  // pseudocode - use the Passlock userId to find a user in your db
  const user = await lookupUser({ passlockUserId })

  // revert to your own session storage e.g. using express-session middleware
  req.session.user = user

  res.json({ user })
}
```

[product-screenshot]: images/screenshot.png
[demo]: https://passlock.dev/#demo
[webauthn]: https://www.w3.org/TR/webauthn-2/
[password-issues]: https://passlock.dev/blog/authentication/password-policies
[passkey-browser-support]: https://passlock.dev/blog/passkeys/passkey-browser-support-2023
[contact]: https://passlock.dev/contact
[docs]: https://passlock.dev
[passlock-signup]: https://passlock.dev
