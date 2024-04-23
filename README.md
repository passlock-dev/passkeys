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
    <a href="https://passlock.dev/#demo">Demo</a>
    ·
    <a href="https://docs.passlock.dev">Documentation</a>
    ·
    <a href="https://docs.passlock.dev/docs/tutorial/intro">Tutorial</a>
  </p>
</div>

<br />

## Features

Passkeys and the WebAuthn API are quite complex. We've taken an opinionated approach to simplify things for you. Following the 80/20 principle we've tried to focus on the features most valuable to developers and users. We welcome feature requests so do [get in touch][contact].

1. **🔐 Primary & secondary authentication** - Replace password based logins with passkeys, or use passkeys alongside passwords for secondary authentication.

2. **☝🏻 Biometrics** - We've made it really easy to implement facial or fingerprint recognition in your webapps.

3. **🔐 Step up authentication** - Require biometric or PIN verification for some operations, whilst allowing one-tap authentication for others.

4. **🖥️ Full management console** - Manage all security related aspects of your userbase through a web based console.

6. **🕵️ Audit trail** - View a full audit trail for each user: when they add a new passkey, when they login, verify their email address and much more.

## Screenshot

![Passlock user profile](https://github.com/passlock-dev/passkeys/assets/208345/a4a5c4b8-86cb-4076-bd26-7c29ed2151c6)
<p align="center">Viewing a user's authentication activity on their profile page</p>

## Usage

Use this library to generate a secure token, representing passkey registration or authentication. Send the token to your backend for verification (see below)

### Register a passkey

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

### Authenticate using a passkey

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

### Backend verification

Verify the token and obtain the passkey registration or authentication details. You can make a simple GET request to `https://api.passlock.dev/{tenancyId}/token/{token}` or use the [@passlock/node][node] library:

```typescript
import { Passlock } from '@passlock/node'

// API keys can be found in your passlock console
const passlock = new Passlock({ tenancyId, apiKey })

// token comes from your frontend
const principal = await passlock.fetchPrincipal({ token })

// get the user id
console.log(principal.user.id)
```

## More information

Please see the [tutorial][tutorial] and [documentation][docs]

[contact]: https://passlock.dev/contact
[tutorial]: https://docs.passlock.dev/docs/tutorial/intro
[docs]: https://docs.passlock.dev
[node]: https://www.npmjs.com/package/@passlock/node