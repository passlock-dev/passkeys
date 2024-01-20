import { ParseOptions } from '@effect/schema/AST'
import { ParseError } from '@effect/schema/ParseResult'
import * as S from '@effect/schema/Schema'
import { formatError } from '@effect/schema/TreeFormatter'
import { Effect as E, pipe } from 'effect'

import { ErrorCode, PasslockError } from '../error/error'
import { PasslockLogger } from '../logging/logging'

/* Components */

const PublicKey = S.literal('public-key')

const PubKeyCredParams = S.struct({
  alg: S.number,
  type: PublicKey,
})

const AuthenticatorAttachment = S.union(
  S.literal('cross-platform'),
  S.literal('platform'),
)

const base64url = S.string

const Transport = S.union(
  S.literal('ble'),
  S.literal('hybrid'),
  S.literal('internal'),
  S.literal('nfc'),
  S.literal('usb'),
  // S.literal('cable'), // Not yet supported by @github/webauthn-json
  // S.literal('smart-card'), // Not yet supported by @github/webauthn-json
)

const Credential = S.struct({
  id: base64url,
  type: PublicKey,
  transports: S.mutable(S.array(Transport)),
})

const UserVerification = S.union(
  S.literal('discouraged'),
  S.literal('preferred'),
  S.literal('required'),
)

const ResidentKey = S.union(
  S.literal('discouraged'),
  S.literal('preferred'),
  S.literal('required'),
)

const AuthenticatorSelection = S.struct({
  authenticatorAttachment: S.optional(AuthenticatorAttachment),
  residentKey: S.optional(ResidentKey),
  requireResidentKey: S.optional(S.boolean),
  userVerification: S.optional(UserVerification),
})

const ClientExtensionResults = S.struct({
  appid: S.optional(S.boolean),
  credProps: S.optional(
    S.struct({
      rk: S.optional(S.boolean),
    }),
  ),
  hmacCreateSecret: S.optional(S.boolean),
})

/* Registration */

export const RegistrationRequest = S.struct({
  email: S.string,
  firstName: S.string,
  lastName: S.string,
})

/**
 * The options needed by the browser to create a new credential,
 * along with a session token. The publicKey property represents a
 * PublicKeyCredentialCreationOptionsJSON
 */
export const RegistrationOptions = S.struct({
  session: S.string,
  publicKey: S.struct({
    rp: S.struct({
      name: S.string,
      id: base64url,
    }),
    user: S.struct({
      id: base64url,
      name: S.string,
      displayName: S.string,
    }),
    challenge: base64url,
    pubKeyCredParams: S.mutable(S.array(PubKeyCredParams)),
    timeout: S.number,
    excludeCredentials: S.mutable(S.array(Credential)),
    authenticatorSelection: AuthenticatorSelection,
  }),
})

export type RegistrationOptions = S.Schema.To<typeof RegistrationOptions>

export const RegistrationCredential = S.struct({
  id: S.string,
  rawId: S.string,
  type: PublicKey,
  response: S.struct({
    clientDataJSON: S.string,
    attestationObject: S.string,
    authenticatorData: S.optional(S.string),
    transports: S.optional(S.mutable(S.array(Transport))),
    publicKeyAlgorithm: S.optional(S.number),
    publicKey: S.optional(S.string),
  }),
  clientExtensionResults: ClientExtensionResults,
  authenticatorAttachment: S.optional(AuthenticatorAttachment),
})

export const RegistrationResponse = S.struct({
  session: S.string,
  credential: RegistrationCredential,
})

export type RegistrationResponse = S.Schema.To<typeof RegistrationResponse>

/* Authentication */

export const AuthenticationRequest = S.struct({
  userVerification: S.boolean,
})

export const AuthenticationOptions = S.struct({
  session: S.string,
  publicKey: S.struct({
    rpId: S.string,
    challenge: S.string,
    timeout: S.number,
    userVerification: UserVerification,
  }),
})

export type AuthenticationOptions = S.Schema.To<typeof AuthenticationOptions>

export const AuthenticationCredential = S.struct({
  id: S.string,
  rawId: S.string,
  type: PublicKey,
  response: S.struct({
    clientDataJSON: S.string,
    authenticatorData: S.string,
    signature: S.string,
    userHandle: S.optional(S.string),
  }),
  authenticatorAttachment: S.optional(AuthenticatorAttachment),
  clientExtensionResults: ClientExtensionResults,
})

export const AuthenticationResponse = S.struct({
  session: S.string,
  credential: AuthenticationCredential,
})

export const parseAuthenticationOptions = S.parseEither

export const Principal = S.struct({
  token: S.string,
  subject: S.struct({
    id: S.string,
    firstName: S.string,
    lastName: S.string,
    email: S.string,
    emailVerified: S.boolean,
  }),
  authStatement: S.struct({
    authType: S.union(S.literal('email'), S.literal('passkey')),
    userVerified: S.boolean,
    authTimestamp: S.Date,
  }),
  expiresAt: S.Date,
})

export type Principal = S.Schema.To<typeof Principal>

/* Check */

export const CheckRegistration = S.struct({
  registered: S.boolean,
})

export type CheckRegistration = S.Schema.To<typeof CheckRegistration>

/* Utils */

export const createParser = <From, To>(schema: S.Schema<From, To>) => {
  const parse = S.parse(schema)

  /**
   * The parser generates some nicely formatted errors but they don't
   * play well with Effects logger so we log them inline using a raw
   * (i.e. console) logger
   *
   * @param parseError
   * @returns
   */
  const logError = (parseError: ParseError) => {
    return PasslockLogger.pipe(
      E.flatMap(logger =>
        E.sync(() => {
          const formatted = formatError(parseError)
          logger.logRaw(formatted)
        }),
      ),
    )
  }

  const transformError = (error: ParseError) => {
    return new PasslockError({
      message: 'Unable to parse object',
      code: ErrorCode.InternalServerError,
      detail: formatError(error),
    })
  }

  return (data: object, options?: ParseOptions) =>
    pipe(parse(data, options), E.tapError(logError), E.mapError(transformError))
}
