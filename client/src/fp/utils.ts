import { ErrorCode, PasslockError } from '@passlock/shared/error'
import { PasslockLogger } from '@passlock/shared/logging'
import { Context, Effect as E, identity, Layer, pipe } from 'effect'

import { Abort, Endpoint, Tenancy } from './config'
import { NetworkService } from './network/network'

/* Services */

export type Capabilities = {
  passkeysSupported: E.Effect<never, PasslockError, void>
}

export const Capabilities = Context.Tag<Capabilities>()

export type CommonDependencies =
  | NetworkService
  | Abort
  | Endpoint
  | Tenancy
  | PasslockLogger

/* Effects */

const hasWebAuthn = E.suspend(() =>
  typeof window.PublicKeyCredential === 'function'
    ? E.unit
    : E.fail(
        new PasslockError({
          message: 'WebAuthn API is not supported on this device',
          code: ErrorCode.PasskeysNotSupported,
        }),
      ),
)

const hasPlatformAuth = pipe(
  E.tryPromise({
    try: () =>
      window.PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable(),
    catch: () =>
      new PasslockError({
        message: 'Sorry something went wrong',
        code: ErrorCode.InternalBrowserError,
      }),
  }),
  E.filterOrFail(
    identity,
    () =>
      new PasslockError({
        message: 'No platform authenticator available on this device',
        code: ErrorCode.PasskeysNotSupported,
      }),
  ),
  E.asUnit,
)

const hasConditionalUi = pipe(
  E.tryPromise({
    try: () => window.PublicKeyCredential.isConditionalMediationAvailable(),
    catch: () =>
      new PasslockError({
        message: 'Sorry something went wrong',
        code: ErrorCode.InternalBrowserError,
      }),
  }),
  E.filterOrFail(
    identity,
    () =>
      new PasslockError({
        message: 'Conditional mediation not available on this device',
        code: ErrorCode.PasskeysNotSupported,
      }),
  ),
  E.asUnit,
)

export const passkeysSupported = pipe(hasWebAuthn, E.andThen(hasPlatformAuth))

export const arePasskeysSupported = pipe(
  passkeysSupported,
  E.orElseSucceed(() => false),
)

export const autofillSupported = pipe(
  passkeysSupported,
  E.andThen(hasConditionalUi),
)
export const isAutofillSupported = pipe(
  autofillSupported,
  E.orElseSucceed(() => false),
)

/* Live */

/* v8 ignore start */
export const capabilitiesLive = Layer.succeed(Capabilities, {
  passkeysSupported,
})
/* v8 ignore stop */
