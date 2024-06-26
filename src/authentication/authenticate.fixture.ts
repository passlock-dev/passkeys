import {
    OptionsRes,
    VerificationReq,
    VerificationRes,
} from '@passlock/shared/dist/rpc/authentication.js'
import { RpcClient } from '@passlock/shared/dist/rpc/rpc.js'
import { IsExistingUserRes, VerifyEmailRes } from '@passlock/shared/dist/rpc/user.js'
import type { AuthenticationCredential } from '@passlock/shared/dist/schema/schema.js'
import { Effect as E, Layer as L } from 'effect'
import * as Fixtures from '../test/fixtures.js'
import { GetCredential, type AuthenticationRequest } from './authenticate.js'

export const session = 'session'
export const token = 'token'
export const code = 'code'
export const authType = 'passkey'
export const expireAt = Date.now() + 10000

export const request: AuthenticationRequest = {
  userVerification: 'preferred',
}

export const rpcOptionsRes = new OptionsRes({
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

export const rpcVerificationReq = new VerificationReq({ session, credential })

export const rpcVerificationRes = new VerificationRes({ principal: Fixtures.principal })

export const rpcIsExistingUserRes = new IsExistingUserRes({ existingUser: true })

export const rpcVerifyEmailRes = new VerifyEmailRes({ principal: Fixtures.principal })

export const getCredentialTest = L.succeed(
  GetCredential,
  GetCredential.of(() => E.succeed(credential)),
)

export const rpcClientTest = L.succeed(
  RpcClient,
  RpcClient.of({
    preConnect: () => E.succeed(Fixtures.preConnectRes),
    isExistingUser: () => E.succeed(rpcIsExistingUserRes),
    verifyEmail: () => E.succeed(rpcVerifyEmailRes),
    getRegistrationOptions: () => E.fail(Fixtures.notImplemented),
    verifyRegistrationCredential: () => E.fail(Fixtures.notImplemented),
    getAuthenticationOptions: () => E.succeed(rpcOptionsRes),
    verifyAuthenticationCredential: () => E.succeed(rpcVerificationRes),
    registerOidc: () => E.fail(Fixtures.notImplemented),
    authenticateOidc: () => E.fail(Fixtures.notImplemented),
    resendVerificationEmail: () => E.fail(Fixtures.notImplemented),
  }),
)

export const principal = Fixtures.principal
export const capabilitiesTest = Fixtures.capabilitiesTest
export const storageServiceTest = Fixtures.storageServiceTest
