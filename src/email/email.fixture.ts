import { BadRequest } from '@passlock/shared/dist/error/error.js'
import { RpcClient } from '@passlock/shared/dist/rpc/rpc.js'
import { VerifyEmailReq, VerifyEmailRes } from '@passlock/shared/dist/rpc/user.js'
import { Effect as E, Layer as L } from 'effect'
import { LocationSearch } from './email.js'
import { AuthenticationService } from '../authentication/authenticate.js'
import * as Fixtures from '../test/fixtures.js'

export const token = 'token'
export const code = 'code'
export const authType = 'passkey'
export const expireAt = Date.now() + 10000

export const locationSearchTest = L.succeed(
  LocationSearch,
  LocationSearch.of(E.succeed(`?code=${code}`)),
)

export const authenticationServiceTest = L.succeed(
  AuthenticationService,
  AuthenticationService.of({
    authenticatePasskey: () => E.succeed(Fixtures.principal),
  }),
)

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

export const verifyEmailReq = new VerifyEmailReq({ token, code })

export const verifyEmailRes = new VerifyEmailRes({ verified: true })

export const principal = Fixtures.principal

export const storedToken = Fixtures.storedToken

export const storageServiceTest = Fixtures.storageServiceTest
