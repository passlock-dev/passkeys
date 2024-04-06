import { BadRequest } from '@passlock/shared/dist/error/error.js'
import { PreConnectReq, PreConnectRes } from '@passlock/shared/dist/rpc/connection.js'
import { RpcClient } from '@passlock/shared/dist/rpc/rpc.js'
import { Effect as E, Layer as L } from 'effect'

export const preConnectReq = new PreConnectReq({})
export const preConnectRes = new PreConnectRes({ warmed: true })
export const notImplemented = new BadRequest({ message: 'Not implemeneted' })

export const rpcClientTest = L.succeed(
  RpcClient,
  RpcClient.of({
    preConnect: () => E.succeed(preConnectRes),
    isExistingUser: () => E.fail(notImplemented),
    verifyEmail: () => E.fail(notImplemented),
    getRegistrationOptions: () => E.fail(notImplemented),
    verifyRegistrationCredential: () => E.fail(notImplemented),
    getAuthenticationOptions: () => E.fail(notImplemented),
    verifyAuthenticationCredential: () => E.fail(notImplemented),
  }),
)

export const rpcConfig = {
  endpoint: 'https://example.com',
  tenancyId: 'tenancyId',
  clientId: 'clientId',
}
