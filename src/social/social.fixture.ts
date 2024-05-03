import { PreConnectRes } from '@passlock/shared/dist/rpc/connection.js'
import { RpcClient } from '@passlock/shared/dist/rpc/rpc.js'
import { AuthenticateOidcReq, OidcRes, RegisterOidcReq } from '@passlock/shared/dist/rpc/social.js'
import { Effect as E, Layer as L } from 'effect'
import * as Fixtures from '../test/fixtures.js'
import { type OidcRequest } from './social.js'

export const session = 'session'
export const token = 'token'
export const code = 'code'
export const authType = 'passkey'
export const expireAt = Date.now() + 10000

export const oidcReq: OidcRequest = {
  provider: 'google',
  idToken: 'google-token'
}

export const rpcRegisterReq = new RegisterOidcReq({ ...oidcReq })

export const rpcRegisterRes = new OidcRes({ principal: Fixtures.principal })

export const rpcAuthenticateReq = new AuthenticateOidcReq({ ...oidcReq })

export const rpcAuthenticateRes = new OidcRes({ principal: Fixtures.principal })

export const rpcClientTest = L.succeed(
  RpcClient,
  RpcClient.of({
    preConnect: () => E.succeed(new PreConnectRes({ warmed: true })),
    isExistingUser: () => E.fail(Fixtures.notImplemented),
    verifyEmail: () => E.fail(Fixtures.notImplemented),
    getRegistrationOptions: () => E.fail(Fixtures.notImplemented),
    verifyRegistrationCredential: () => E.fail(Fixtures.notImplemented),
    getAuthenticationOptions: () => E.fail(Fixtures.notImplemented),
    verifyAuthenticationCredential: () => E.fail(Fixtures.notImplemented),
    registerOidc: () => E.fail(Fixtures.notImplemented),
    authenticateOidc: () => E.fail(Fixtures.notImplemented),
    resendVerificationEmail: () => E.fail(Fixtures.notImplemented),
  }),
)

export const principal = Fixtures.principal

export const capabilitiesTest = Fixtures.capabilitiesTest

export const storageServiceTest = Fixtures.storageServiceTest
