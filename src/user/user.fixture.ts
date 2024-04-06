import { BadRequest } from '@passlock/shared/dist/error/error.js'
import { RpcClient } from '@passlock/shared/dist/rpc/rpc.js'
import { IsExistingUserReq, IsExistingUserRes, VerifyEmailRes } from '@passlock/shared/dist/rpc/user.js'
import { Effect as E, Layer as L } from 'effect'
import * as Fixtures from '../test/fixtures.js'

export const email = 'jdoe@gmail.com'
export const isRegisteredReq = new IsExistingUserReq({ email })
export const isRegisteredRes = new IsExistingUserRes({ existingUser: false })
export const verifyEmailRes = new VerifyEmailRes({ principal: Fixtures.principal })

export const rpcClientTest = L.succeed(
  RpcClient,
  RpcClient.of({
    preConnect: () => E.succeed({ warmed: true }),
    isExistingUser: () => E.succeed({ existingUser: true }),
    verifyEmail: () => E.succeed(verifyEmailRes),
    getRegistrationOptions: () => E.fail(new BadRequest({ message: 'Not implemeneted' })),
    verifyRegistrationCredential: () => E.fail(new BadRequest({ message: 'Not implemeneted' })),
    getAuthenticationOptions: () => E.fail(new BadRequest({ message: 'Not implemeneted' })),
    verifyAuthenticationCredential: () => E.fail(new BadRequest({ message: 'Not implemeneted' })),
  }),
)