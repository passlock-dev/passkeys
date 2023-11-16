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
    <a href="https://github.com/passlock-dev/passkeys-frontend/issues">Report Bug</a>
    ·
    <a href="https://passlock.dev/contact">Request Feature</a>
  </p>
</div>

<br />

https://github.com/passlock-dev/passkeys-frontend/assets/208345/14818e66-83bc-4ca3-a996-fe54c94a8e87

# A Passkey library that works with any backend

<br />

> [!IMPORTANT]
> Passlock is expected to launch in December '23. Please subscribe to our [newsletter][newsletter] for updates.

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
3. Call our REST API to exchange the token for the authentication result

> [!NOTE]
> In step 3, you can instead verify and examine a JWT, thereby saving the network trip.

## Features

Passkeys and the WebAuthn API are quite complex. We've taken an opinionated approach to the implementation and feature set to simplify things for you. Following the 80/20 principle we've tried to focus on the features most valuable to developers and users. We welcome feature requests so do [get in touch][contact].

1. **☝🏻Biometrics** - Passkeys allows you to enforce facial or fingerprint recognition in your websites and web apps. We've made it really easy.

2. **🔐 Step up authentication** - Require biometric or PIN verification for some actions e.g. changing account details, whilst allowing frictionless authentication for others.

3. **📱 Platform authenticators** - WebAuthn supports external authenticators like YubiKeys and NFC devices. That's not our target audience, at least not for now. Our focus is _platform authenticators_ i.e. passkeys managed by the smartphone, tablet or computer itself.

4. **☁️ Cloud sync** - Similar to a cloud password manager, passkeys can be synced with to a cloud account e.g. iCloud. It also allows the user the recover their account if they loose (or accidentally wipe) a device.

<p align="right">(<a href="#readme-top">back to top</a>)</p>

## Motivation

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

## Getting started

### Prerequisites

Create a free account on [passlock.dev][passlock-signup] and obtain your `tenancyId` and `apiKey`

### Install the Passlock frontend library

This will depend on your package manager:

`npm add @passlock/passkeys-frontend`  
`pnpm add @passlock/passkeys-frontend`  
`yarn add @passlock/passkeys-frontend`

### Create a Passlock instance

Passlock can be configured by passing various options to the constructor. Please see the [documentation][docs] for more details. The only required field is `tenancyId`.

```typescript
import { Passlock } from "@passlock/passkeys-frontend";

const passlock = new Passlock({ tenancyId: 'my-tenancy-id' });
```

## Basic usage

This quickstart guide illustrates the simplest scenario, using token based verification i.e. the client library returns a token which you send to your backend. Your backend code then calls a REST API to exchange the token for an object representing the authenticated user.

An alternative flow uses JWTs with public key encryption to avoid the need for the REST call on the backend. Please see the [documentation][docs] for more details.

### Passkey registration

You just need to call `passlock.register()`. This will do three things:

1. Generate a passkey and store it on the device
2. Register the passkey in the Passlock backend
3. Generate a token representing the newly created credential

This token should then be sent to your backend. Your backend should call the Passlock REST API to verify the token, before linking the passlock userId with your own user entity.

#### Create a passkey (frontend)

```typescript
if (passlock.isSupported()) {
  // Simplest example, excluding options or profile info (email etc) 
  const token = await registerPasskey()
} else {
  // Fallback to username/password, email or social login.
}

async function registerPasskey() {
  // Note: passlock doesn't throw. You should examine the result and interrogate any errors
  const result = await passlock.register()

  if (result.ok && result.token) {
    await linkAccount(result.token)
  } else if (result.error) { ... }
}

/**
 * Post the token to your backend, remember about CORS!
 */
async function linkAccount(token: string) {
  await fetch("https://example.com/register/passlock", {
    method: "POST",
    headers: {
      `Content-Type`: "application/json"
    },
    body: JSON.stringify({ token })
  })
}
```

#### Link the passkey (backend)

Assuming the passkey was successfully created, you now need to exchange the Passlock token for a Passlock
user object and link it with your own user entity. Note that you don't need to use the Passlock library
on the backend, you just need to make a REST call to our API.

```typescript
// Express.js

app.post('/register/passlock', async function(req, res) {
  const passlockUser = await verifyPasslockToken(req.body.token)

  // pseudocode - link the Passlock userId with an existing user or create a new user in your backend
  const user = await createAccount(passlockUser)

  // log the user in
  req.session.user = user

  res.json({ user })
}

async function verifyPasslockToken(token: string) {
  const tenancyId = process.env.PASSLOCK_TENANCY_ID;
  const apiKey = process.env.PASSLOCK_API_KEY;
  const url = `https://api.passlock.dev/${tenancyId}/verify`

  const response = await axios.post(url, { token })
  if (!response.data.verified) { /* verification failed */ }

  // the pPasslock user object containing at a minimum a userId field
  return response.data
}
```

### Passkey authentication

Just call `passlock.authenticate()` to obtain a token, which you then pass to your backend.

#### Authenticate (frontend)

```typescript
if (passlock.isSupported()) {
  await authenticatePasskey()
} else { ... }
 
async function authenticatePasskey() {
  const result = await passlock.authenticate()

  if (result.ok && result.token) {
    await verifyToken(result.token)
  } else if (result.error) { ... }
}

/**
 * Post the token to the backend
 */
async function verifyToken(passlockToken: string) { ... }
```

#### Verify the passkey (backend)

Just exchange the token for a Passlock user, then lookup your own user entity using the Passlock user id

```typescript
// Express.js

app.post('/authenticate/passlock', async function(req, res) {
  const token = req.body.token
  
  // see the function in "Link the passkey (backend)" above
  const passlockUser = await verifyPasslockToken(token)

  // pseudocode - use the Passlock userId to lookup a user in your db
  const user = await lookupUser(passlockUser.userId)

  // revert to your own session storage e.g. using express-session middleware
  req.session.user = user

  res.json({ user })
}
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
