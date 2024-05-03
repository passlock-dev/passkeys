import { RpcClient } from '@passlock/shared/dist/rpc/rpc.js'
import { IsExistingUserReq, IsExistingUserRes, ResendEmailReq, ResendEmailRes, VerifyEmailRes } from '@passlock/shared/dist/rpc/user.js'
import { Effect as E, Layer as L } from 'effect'
import * as Fixtures from '../test/fixtures.js'
import type { ResendEmail } from './user.js'

export const email = 'jdoe@gmail.com'
export const isRegisteredReq = new IsExistingUserReq({ email })
export const isRegisteredRes = new IsExistingUserRes({ existingUser: false })
export const verifyEmailRes = new VerifyEmailRes({ principal: Fixtures.principal })
export const resendEmailReq: ResendEmail = { userId: '123', method: 'code' }
export const rpcResendEmailReq = new ResendEmailReq({ userId: '123', verifyEmail: { method: 'code' }})
export const rpcResendEmailRes = new ResendEmailRes({ })

export const rpcClientTest = L.succeed(
  RpcClient,
  RpcClient.of({
    preConnect: () => E.succeed({ warmed: true }),
    isExistingUser: () => E.succeed({ existingUser: true }),
    verifyEmail: () => E.succeed(verifyEmailRes),
    getRegistrationOptions: () => E.fail(Fixtures.notImplemented),
    verifyRegistrationCredential: () => E.fail(Fixtures.notImplemented),
    getAuthenticationOptions: () => E.fail(Fixtures.notImplemented),
    verifyAuthenticationCredential: () => E.fail(Fixtures.notImplemented),
    registerOidc: () => E.fail(Fixtures.notImplemented),
    authenticateOidc: () => E.fail(Fixtures.notImplemented),
    resendVerificationEmail: () => E.fail(Fixtures.notImplemented),
  }),
)