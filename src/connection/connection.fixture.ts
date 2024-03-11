import { BadRequest } from '@passlock/shared/dist/error/error'
import { PreConnectReq, PreConnectRes } from '@passlock/shared/dist/rpc/connection'
import { RpcClient } from '@passlock/shared/dist/rpc/rpc'
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
