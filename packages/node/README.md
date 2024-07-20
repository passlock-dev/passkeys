<div align="center">
  <a href="https://github.com/passlock-dev/passkeys-frontend">
    <img src="https://github.com/passlock-dev/passkeys-frontend/assets/208345/53ee00d3-8e6c-49ea-b43c-3f901450c73b" alt="Passlock logo" width="80" height="80">
  </a>
</div>

<a name="readme-top"></a>
<h1 align="center">Serverless Passkeys</h1>

  <p align="center">
    Node SDK for passkey authentication
    <br />
    <a href="https://passlock.dev"><strong>Project website »</strong></a>
    <br />
    <a href="https://passlock.dev/#demo">Demo</a>
    ·
    <a href="https://docs.passlock.dev">Documentation</a>
    ·
    <a href="https://docs.passlock.dev/docs/tutorial/intro">Tutorial</a>
  </p>
</div>

<br />

## See also

For frontend usage please see the accompanying [@passlock/client][client] package

## Features

Passkeys and the WebAuthn API are quite complex. We've taken an opinionated approach to the implementation and feature set to simplify things for you. Following the 80/20 principle we've tried to focus on the features most valuable to developers and users. We welcome feature requests so do [get in touch][contact].

1. **🔐 Primary or secondary authentication** - Replace password based logins with passkeys, or use passkeys alongside passwords for secondary authentication.

2. **☝🏻 Biometrics** - We've made it really easy to implement facial or fingerprint recognition in your webapps.

3. **🔐 Step up authentication** - Require biometric or PIN verification for some actions e.g. changing account details, whilst allowing frictionless authentication for others.

4. **🖥️ Full management console** - Manage all security related aspects of your userbase through a web based console.

6. **🕵️ Audit trail** - View a full audit trail for each user: when they add a new passkey, when they login, verify their email address and much more.

## Screenshot

![Passlock user profile](https://github.com/passlock-dev/passkeys/assets/208345/a4a5c4b8-86cb-4076-bd26-7c29ed2151c6)
<p align="center">Viewing a user's authentication activity on their profile page</p>

## Requirements

Node 16+

## Usage

Generate a secure token in your frontend then use this API to obtain the passkey registration or authentication details:

```typescript
import { Passlock } from '@passlock/node'

const passlock = new Passlock({ tenancyId, apiKey })

// token comes from your frontend
const principal = await passlock.fetchPrincipal({ token })

// get the user id
console.log(principal.user.id)
```

[contact]: https://passlock.dev/contact
[client]: https://www.npmjs.com/package/@passlock/client