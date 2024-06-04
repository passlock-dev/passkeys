<!-- PROJECT LOGO -->
<div align="center">
  <a href="https://github.com/passlock-dev/passkeys-frontend">
    <img src="https://github.com/passlock-dev/passkeys-frontend/assets/208345/53ee00d3-8e6c-49ea-b43c-3f901450c73b" alt="Passlock logo" width="80" height="80">
  </a>
</div>

<a name="readme-top"></a>
<h1 align="center">Serverless Passkeys</h1>
  <p align="center">
    Passkey authentication for your web apps. Supports React, Angular, Vue, SvelteKit & others.
    <br />
    <a href="https://passlock.dev"><strong>Project website »</strong></a>
    <br />
    <br />
    <a href="https://passlock.dev/#demo">Live Demo</a>
    ·
    <a href="https://docs.passlock.dev">Documentation</a>
    ·
    <a href="https://docs.passlock.dev/docs/tutorial/intro">Tutorial</a>
  </p>
</div>

<div align="center">
  <img src="https://img.shields.io/badge/build-passing-brightgreen" alt="Build passing" />
  <img src="https://img.shields.io/badge/coverage-98%25-blue" alt="98% test coverage" />
</div>

<br />

https://github.com/passlock-dev/passkeys-frontend/assets/208345/14818e66-83bc-4ca3-a996-fe54c94a8e87

# Introduction

<br />

<!-- TABLE OF CONTENTS -->
<details>
  <summary>Table of Contents</summary>

  * [Features](#features)
  * [Screenshot](#screenshot)
  * [Getting started](#getting-started)
  * [Basic usage](#basic-usage)
    * [Register a passkey](#register-a-passkey)
    * [Authenticate](#authentication)
  * [Next steps](#next-steps)    
  * [Contact details](#contact)
</details>

Really simple Passkey client library. You don't need to learn the underlying [WebAuthn API][webauthn] or protocols, and all the backend stuff is handled for you. It's a simple 3 step process:

1. Use the `@passlock/client` library to register or authenticate a passkey
2. This will generate a token, send it to your backend
3. Use the `@passlock/node` library to verify the token and obtain the user & passkey details

> [!TIP]
> **Not using a Node backend?** - No problem! you can make a REST call to the Passlock API to verify a secure token and obtain the user & passkey details.

# Features

Passkeys and the WebAuthn API are quite complex. We've taken an opinionated approach to simplify things for you. Following the 80/20 principle we've tried to focus on the features most valuable to developers and users. We welcome feature requests so do [get in touch][contact].

1. **🔐 Primary & secondary authentication** - Replace password based logins with passkeys, or use passkeys alongside passwords for secondary authentication.

2. **☝🏻 Biometrics** - We've made it really easy to implement facial or fingerprint recognition in your webapps.

3. **🔐 Step up authentication** - Require biometric or PIN verification for some operations, whilst allowing one-tap authentication for others.

4. **🚀 Social login** - Quickly add social login to your web application.

5. **🖥️ Full management console** - Manage all security related aspects of your userbase through a web based console.

6. **🕵️ Audit trail** - View a full audit trail for each user: when they add a new passkey, when they login, verify their email address and much more.

Along with:

1. **✉️ Mailbox verification** - Passlock also handles mailbox verification emails (which are more complex than you might think)

2. **🔑 Credential export** - Decided to roll your own passkey code? No problem - you can export your users' credentials (including public keys) and drop them into your own database.

And more!

<p align="right">(<a href="#readme-top">back to top</a>)</p>

# Screenshot

![Passlock user profile](https://github.com/passlock-dev/passkeys/assets/208345/a4a5c4b8-86cb-4076-bd26-7c29ed2151c6)
<p align="center">Viewing a user's authentication activity on their profile page</p>

<p align="right">(<a href="#readme-top">back to top</a>)</p>

# Getting started

## Prerequisites

Create a free account on [passlock.dev][passlock-signup] and obtain your `clientId` (for the frontend), `apiKey` (for the backend), and `tenancyId` (frontend & backend).

## Install the Passlock client library

This will depend on your package manager:

`npm add @passlock/client`  

# Basic usage

This quickstart guide illustrates the simplest scenario, using token based verification i.e. the client library returns a token which you send to your backend. Your backend then uses the [@passlock/node][node] library to verify the token.

An alternative flow uses JWTs with public keys to avoid the backend REST call. Please see the [documentation][docs] for more details (coming soon).

**Note:** The flow is conceptually similar to OAuth2/OIDC but without the redirects.

## Register a passkey

You just need to call `registerPasskey()` passing in a few details. This will do three things:

1. Generate a passkey and store it on the user's device
2. Register the passkey in your Passlock vault
3. Generate a token representing the new credential

You then send this token to your backend. Your backend verifies it using either the [@passlock/node][node] package or via a simple REST call.

### Create a passkey (frontend)

```typescript
import { Passlock, PasslockError } from '@passlock/client'

// you can find these details in the settings area of the Passlock console
const tenancyId = '...'
const clientId = '...'

const passlock = new Passlock({ tenancyId, clientId })

// to register a new passkey, call registerPasskey(). We're using placeholders for 
// the user data. You should grab this from an HTML form, React store, Redux etc.
const [email, givenName, familyName] = ["jdoe@gmail.com", "John", "Doe"]

// Passlock doesn't throw but instead returns a union: result | error
const result = await passlock.registerPasskey({ email, givenName, familyName })

// ensure Passlock didn't return an error
if (!PasslockError.isError(result)) {
  // send the token to your backend (json/fetch or hidden form field etc)
  console.log('Token: %s', result.token)
}
```

### Link the passkey (backend)

Your backend just needs to exchange the token for a `Principal` representing the successful passkey registration. Here is an example using the `@passlock/node` sdk:

```typescript
import { Passlock } from '@passlock/node'

// API Keys can be found in your passlock console
const passlock = new Passlock({ tenancyId, apiKey })

// token comes from your frontend
const principal = await passlock.fetchPrincipal({ token })

// get the user id
console.log(principal.user.id)
```

Link the `user.id` with a user entity in your own database, similar to the way you might link a user's Facebook or Google id. This could be as simple as an additional (indexed) column on your user table.

### Using other (non Node) backends

You can also make an HTTP GET request to the `https://api.passlock.dev/{tenancyId}/token/{token}` endpoint, using whatever library you wish e.g. Python requests:

```bash
# Substitute API_KEY, TENANCY_ID and TOKEN for the real values
curl -s -H "Authorization: Bearer $API_KEY" https://api.passlock.dev/$TENANCY_ID/token/$TOKEN
```

This will return a JSON object including a `user`:

```json
{
  "token": "2arafoq-8coasjl-qx4jz3x",
  "user": {
    "id": "khXCYCxcGwJTLoaG6kVxB",
  },
  "expiresAt": "2024-01-25T12:06:07.000Z"
}
```

<p align="right">(<a href="#readme-top">back to top</a>)</p>

## Authentication

Similar to registration, call `authenticatePasskey()` to obtain a token, which you then pass to your backend.

### Authenticate (frontend)

```typescript
import { Passlock, PasslockError } from '@passlock/client'

const tenancyId = '...'
const clientId = '...'

const passlock = new Passlock({ tenancyId, clientId })
const result = await passlock.authenticatePasskey()

if (!PasslockError.isError(result)) {
  // send the token to your backend for verification
  console.log('Token: %s', result.token)
}
```

### Verify the passkey (backend)

Exactly the same as for registration. Exchange the token for a `Principal` and use the `user.id` to lookup your own user entity.

## Next steps

This was a very quick overview. Please see the [tutorial][tutorial] and [documentation][docs] for more information.

## Contact

Questions? Please use the [GitHub discussions][discussions] or see the [contact][contact] details on our main project site.

<p align="right">(<a href="#readme-top">back to top</a>)</p>

[newsletter]: https://passlock.dev/#newsletter
[demo]: https://passlock.dev/#demo
[webauthn]: https://www.w3.org/TR/webauthn-2/
[contact]: https://passlock.dev/contact
[tutorial]: https://docs.passlock.dev/docs/tutorial/introduction
[docs]: https://docs.passlock.dev
[passlock-signup]: https://console.passlock.dev/register
[discussions]: https://github.com/passlock-dev/passkeys/discussions
[node]: https://github.com/passlock-dev/node
