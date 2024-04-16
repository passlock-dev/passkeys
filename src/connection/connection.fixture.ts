import { PreConnectReq, PreConnectRes } from '@passlock/shared/dist/rpc/connection.js'
import { RpcClient } from '@passlock/shared/dist/rpc/rpc.js'
import { Effect as E, Layer as L } from 'effect'
import * as Fixtures from '../test/fixtures.js'

export const preConnectReq = new PreConnectReq({})
export const preConnectRes = new PreConnectRes({ warmed: true })

export const rpcClientTest = L.succeed(
  RpcClient,
  RpcClient.of({
    preConnect: () => E.succeed(preConnectRes),
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

export const rpcConfig = {
  endpoint: 'https://example.com',
  tenancyId: 'tenancyId',
  clientId: 'clientId',
}
