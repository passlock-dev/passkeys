import * as S from '@effect/schema/Schema'
import { Context, Effect as E, Layer } from 'effect'

import { BadRequest, Disabled, Forbidden, NotFound, Unauthorized } from '../error/error.js'

import {
  AuthenticationCredential,
  AuthenticationOptions,
  Principal,
  UserVerification,
} from '../schema/schema.js'
import { makePostRequest } from './client.js'
import { Dispatcher } from './dispatcher.js'

/* Options */

export class OptionsReq extends S.Class<OptionsReq>(`@passkey/auth/optionsReq`)({
  email: S.optional(S.String, { exact: true }),
  userVerification: S.optional(UserVerification, { exact: true }),
}) {}

export class OptionsRes extends S.Class<OptionsRes>('@passkey/auth/optionsRes')({
  session: S.String,
  publicKey: AuthenticationOptions,
}) {}

export const OptionsErrors = S.Union(BadRequest, NotFound)

export type OptionsErrors = S.Schema.Type<typeof OptionsErrors>

/* Verification */

export class VerificationReq extends S.Class<VerificationReq>("@passkey/auth/verificationReq")({
  session: S.String,
  credential: AuthenticationCredential,
}) {}

export class VerificationRes extends S.Class<VerificationRes>('@passkey/auth/verificationRes')({
  principal: Principal,
}) {}

export const VerificationErrors = S.Union(BadRequest, Unauthorized, Forbidden, Disabled)

export type VerificationErrors = S.Schema.Type<typeof VerificationErrors>

/* Service */

export type AuthenticationService = {
  getAuthenticationOptions: (
    req: OptionsReq
  ) => E.Effect<OptionsRes, OptionsErrors>
  
  verifyAuthenticationCredential: (
    req: VerificationReq,
  ) => E.Effect<VerificationRes, VerificationErrors>
}

/* Client */

export const OPTIONS_ENDPOINT = '/passkey/auth/options'
export const VERIFY_ENDPOINT = '/passkey/auth/verify'

export class AuthenticationClient extends Context.Tag("@passkey/auth/client")<
  AuthenticationClient,
  AuthenticationService
>() {}

export const AuthenticationClientLive = Layer.effect(
  AuthenticationClient,
  E.gen(function* (_) {
    const dispatcher = yield* _(Dispatcher)
    const optionsResolver = makePostRequest(OptionsReq, OptionsRes, OptionsErrors, dispatcher)
    const verifyResolver = makePostRequest(VerificationReq, VerificationRes, VerificationErrors, dispatcher)

    return {
     getAuthenticationOptions: req => optionsResolver(OPTIONS_ENDPOINT, req),
     verifyAuthenticationCredential: (req) => verifyResolver(VERIFY_ENDPOINT, req)
    }
  })
)

/* Handler */

export class AuthenticationHandler extends Context.Tag("@passkey/auth/handler")<
  AuthenticationHandler,
  AuthenticationService
>() {}