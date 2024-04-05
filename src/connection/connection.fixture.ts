import { BadRequest } from '@passlock/shared/dist/error/error.js'
import { PreConnectReq, PreConnectRes } from '@passlock/shared/dist/rpc/connection.js'
import { RpcClient } from '@passlock/shared/dist/rpc/rpc.js'
import { Effect as E, Layer as L } from 'effect'

export const rpcClientTest = L.succeed(
  RpcClient,
  RpcClient.of({
    preConnect: () => E.succeed({ warmed: true }),
    isExistingUser: () => E.succeed({ existingUser: true }),
    verifyEmail: () => E.succeed({ verified: true }),
    getRegistrationOptions: () => E.fail(new BadRequest({ message: 'Not implemeneted' })),
    verifyRegistrationCredential: () => E.fail(new BadRequest({ message: 'Not implemeneted' })),
    getAuthenticationOptions: () => E.fail(new BadRequest({ message: 'Not implemeneted' })),
    verifyAuthenticationCredential: () => E.fail(new BadRequest({ message: 'Not implemeneted' })),
  }),
)

export const preConnectReq = new PreConnectReq({})
export const preConnectRes = new PreConnectRes({ warmed: true })

export const rpcConfig = {
  endpoint: 'https://example.com',
  tenancyId: 'tenancyId',
  clientId: 'clientId',
}
