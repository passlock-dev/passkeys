import { BadRequest } from '@passlock/shared/dist/error/error'
import { RpcClient } from '@passlock/shared/dist/rpc/rpc'
import { IsExistingUserReq, IsExistingUserRes } from '@passlock/shared/dist/rpc/user'
import { Effect as E, Layer as L } from 'effect'

export const email = 'jdoe@gmail.com'

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

export const isRegisteredReq = new IsExistingUserReq({ email })
export const isRegisteredRes = new IsExistingUserRes({ existingUser: false })
