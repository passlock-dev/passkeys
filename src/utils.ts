import type { PasslockError } from '@passlock/shared/error'
import { ErrorCode, error, fail } from '@passlock/shared/error'
import { Context, Effect as E, Layer, identity, pipe } from 'effect'

import type { Abort, Endpoint, Tenancy } from './config'

/* Services */

export type Capabilities = {
  passkeysSupported: E.Effect<never, PasslockError, void>
}

export const Capabilities = Context.Tag<Capabilities>()

export type CommonDependencies = Abort | Endpoint | Tenancy

/* Effects */

const hasWebAuthn = E.suspend(() =>
  typeof window.PublicKeyCredential === 'function'
    ? E.unit
    : fail('WebAuthn API is not supported on this device', ErrorCode.PasskeysNotSupported),
)

const hasPlatformAuth = pipe(
  E.tryPromise({
    try: () => window.PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable(),
    catch: () => error('Sorry something went wrong', ErrorCode.InternalBrowserError),
  }),
  E.filterOrFail(identity, () =>
    error('No platform authenticator available on this device', ErrorCode.PasskeysNotSupported),
  ),
  E.asUnit,
)

const hasConditionalUi = pipe(
  E.tryPromise({
    try: () => window.PublicKeyCredential.isConditionalMediationAvailable(),
    catch: () => error('Sorry something went wrong', ErrorCode.InternalBrowserError),
  }),
  E.filterOrFail(identity, () =>
    error('Conditional mediation not available on this device', ErrorCode.PasskeysNotSupported),
  ),
  E.asUnit,
)

export const passkeysSupported = pipe(hasWebAuthn, E.andThen(hasPlatformAuth))

export const arePasskeysSupported = pipe(
  passkeysSupported,
  E.match({
    onFailure: () => false,
    onSuccess: () => true,
  }),
)

export const autofillSupported = pipe(passkeysSupported, E.andThen(hasConditionalUi))
export const isAutofillSupported = pipe(
  autofillSupported,
  E.match({
    onFailure: () => false,
    onSuccess: () => true,
  }),
)

/* Live */

/* v8 ignore start */
export const capabilitiesLive = Layer.succeed(Capabilities, {
  passkeysSupported,
})
/* v8 ignore stop */
