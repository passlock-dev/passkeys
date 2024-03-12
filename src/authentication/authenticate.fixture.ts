import { BadRequest } from '@passlock/shared/dist/error/error'
import {
  OptionsRes,
  VerificationReq,
  VerificationRes,
} from '@passlock/shared/dist/rpc/authentication'
import { RpcClient } from '@passlock/shared/dist/rpc/rpc'
import type { AuthenticationCredential } from '@passlock/shared/dist/schema/schema'
import { Effect as E, Layer as L } from 'effect'
import { type AuthenticationRequest, GetCredential } from './authenticate'
import * as Fixtures from '../test/fixtures'

export const session = 'session'
export const token = 'token'
export const code = 'code'
export const authType = 'passkey'
export const expireAt = Date.now() + 10000

export const request: AuthenticationRequest = {
  userVerification: 'preferred',
}

export const optionsRes = new OptionsRes({
  session,
  publicKey: {
    rpId: 'passlock.dev',
    challenge: 'FKZSl_saKu5OXjLLwoq8eK3wlD8XgpGiS10SszW5RiE',
    timeout: 60000,
    userVerification: 'preferred',
  },
})

export const credential: AuthenticationCredential = {
  id: '1',
  type: 'public-key',
  rawId: 'id',
  response: {
    clientDataJSON: '',
    authenticatorData: '',
    signature: '',
    userHandle: null,
  },
  clientExtensionResults: {},
  authenticatorAttachment: null,
}

export const verificationReq = new VerificationReq({ session, credential })

export const verificationRes = new VerificationRes({ principal: Fixtures.principal })

export const getCredentialTest = L.succeed(
  GetCredential,
  GetCredential.of(() => E.succeed(credential)),
)

export const rpcClientTest = L.succeed(
  RpcClient,
  RpcClient.of({
    preConnect: () => E.succeed({ warmed: true }),
    isExistingUser: () => E.succeed({ existingUser: true }),
    verifyEmail: () => E.succeed({ verified: true }),
    getRegistrationOptions: () => E.fail(new BadRequest({ message: 'Not implemeneted' })),
    verifyRegistrationCredential: () => E.fail(new BadRequest({ message: 'Not implemeneted' })),
    getAuthenticationOptions: () => E.succeed(optionsRes),
    verifyAuthenticationCredential: () => E.succeed(verificationRes),
  }),
)

export const principal = Fixtures.principal
export const capabilitiesTest = Fixtures.capabilitiesTest
export const storageServiceTest = Fixtures.storageServiceTest
