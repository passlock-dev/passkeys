<!-- PROJECT LOGO -->
<div align="center">
  <a href="https://github.com/passlock-dev/passkeys-frontend">
    <img src="https://github.com/passlock-dev/passkeys-frontend/assets/208345/53ee00d3-8e6c-49ea-b43c-3f901450c73b" alt="Passlock logo" width="80" height="80">
  </a>
</div>

<a name="readme-top"></a>
<h1 align="center">Serverless Passkeys</h1>

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
    <a href="https://docs.passlock.dev/docs/tutorial/intro">Tutorial</a>
  </p>
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
    * [Passkey registration](#passkey-registration)
    * [Passkey authentication](#passkey-authentication)
  * [Next steps](#next-steps)    
  * [Contact details](#contact)
</details>

Really simple Passkey client library. You don't need to learn the underlying [WebAuthn API][webauthn] or protocols, and all the backend stuff is handled for you. It's a really simple 3 step process:

1. Use this library to obtain a token on your frontend
2. Pass the token to your backend
3. Call the REST API to exchange the token for the authentication result

> [!NOTE]
> (Coming soon) - In step 3, you can instead verify and examine a JWT, thereby saving the network trip.

# Features

Passkeys and the WebAuthn API are quite complex. We've taken an opinionated approach to the implementation and feature set to simplify things for you. Following the 80/20 principle we've tried to focus on the features most valuable to developers and users. We welcome feature requests so do [get in touch][contact].

1. **🔐 Primary or secondary authentication** - Replace password based logins with passkeys, or use passkeys alongside passwords for secondary authentication.

2. **☝🏻 Biometrics** - We've made it really easy to implement facial or fingerprint recognition in your webapps.

3. **🔐 Step up authentication** - Require biometric or PIN verification for some actions e.g. changing account details, whilst allowing frictionless authentication for others.

4. **🖥️ Full management console** - Manage all security related aspects of your userbase through a web base console.

5. **🕵️ Audit trail** - View a full audit trail for each user: when they add a new passkey, when they login, verify their email address and much more.

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

## Install the Passlock frontend library

This will depend on your package manager:

`npm add @passlock/client`  

# Basic usage

This quickstart guide illustrates the simplest scenario, using token based verification i.e. the client library returns a token which you send to your backend. Your backend code then calls a REST API to exchange the token for an object representing the authenticated user.

An alternative flow uses JWTs with public keys to avoid the backend REST call. Please see the [documentation][docs] for more details (coming soon).

**Note:** The flow is conceptually similar to OAuth2/OIDC but without the redirects.

## Passkey registration

You just need to call `registerPasskey()` passing in a few details. This will do three things:

1. Generate a passkey and store it on the user's device
2. Register the passkey in your Passlock vault
3. Generate a token representing the new credential

### Create a passkey (frontend)

```typescript
import { Passlock } from '@passlock/client'

const tenancyId = process.env.PASSLOCK_TENANCY_ID
const clientId = process.env.PASSLOCK_CLIENT_ID
const passlock = new Passlock({ tenancyId, clientId })

// pseudocode - get these details from your registration form
const { email, firstName, lastName } = getUserDetails()

const result = await passlock.registerPasskey({ email, firstName, lastName })

// send result.token to your backend, maybe add a hidden field to your registration form?
console.log(result.token)
```

### Link the passkey (backend)

Your backend just needs to exchange the token for a `Principal` representing the successful passkey registration. How you do this is entirely up to you (and your chosen framework). We'll show a CURL example:

```bash
# Substitute API_KEY, TENANCY_ID and TOKEN for the real values
curl -s -H "X-API-KEY: $API_KEY" https://api.passlock.dev/$TENANCY_ID/token/$TOKEN
```

This will return a JSON object including a `subject`:

```json
{
  "token": "2arafoq-8coasjl-qx4jz3x",
  "subject": {
    "id": "khXCYCxcGwJTLoaG6kVxB",
  },
  "expiresAt": "2024-01-25T12:06:07.000Z"
}
```

Link the `subject.id` with a user entity in your own database, similar to the way you might link a user's Facebook or Google id. This could be as simple as an additional (indexed) column on your user table.

## Passkey authentication

Similar to registration, call `authenticatePasskey()` to obtain a token, which you then pass to your backend.

### Authenticate (frontend)

```typescript
import { Passlock } from '@passlock/client';

const tenancyId = process.env.PASSLOCK_TENANCY_ID
const clientId = process.env.PASSLOCK_CLIENT_ID
const passlock = new Passlock({ tenancyId, clientId })

const result = await passlock.authenticatePasskey({ tenancyId, clientId })

// send result.token to your backend
console.log(result.token)
```

### Verify the passkey (backend)

Exactly the same as for registration. Exchange the token for a `Principal` and use the `subject.id` to lookup your own user entity.

## Next steps

This was a very quick overview. Please see the [tutorial][tutorial] and [documentation][docs] for more information.

## Contact

Questions? Please use the [GitHub discussions][discussions] or see the [contact][contact] details on our main project site.

<p align="right">(<a href="#readme-top">back to top</a>)</p>

[newsletter]: https://passlock.dev/#newsletter
[demo]: https://passlock.dev/#demo
[webauthn]: https://www.w3.org/TR/webauthn-2/
[contact]: https://passlock.dev/contact
[tutorial]: https://docs.passlock.dev/docs/tutorial/intro
[docs]: https://docs.passlock.dev
[passlock-signup]: https://console.passlock.dev/register
[discussions]: https://github.com/passlock-dev/passkeys/discussions
