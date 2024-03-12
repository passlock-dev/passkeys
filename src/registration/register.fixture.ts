import { BadRequest } from '@passlock/shared/dist/error/error'
import {
  OptionsReq,
  OptionsRes,
  VerificationReq,
  VerificationRes,
} from '@passlock/shared/dist/rpc/registration'
import { RpcClient } from '@passlock/shared/dist/rpc/rpc'
import type { RegistrationCredential } from '@passlock/shared/dist/schema/schema'
import { Effect as E, Layer as L } from 'effect'
import { CreateCredential, type RegistrationRequest } from './register'
import * as Fixtures from '../test/fixtures'
import { UserService } from '../user/user'

export const session = 'session'
export const token = 'token'
export const code = 'code'
export const authType = 'passkey'
export const expireAt = Date.now() + 10000

export const registrationRequest: RegistrationRequest = {
  email: 'jdoe@gmail.com',
  firstName: 'john',
  lastName: 'doe',
}

export const optionsReq = new OptionsReq(registrationRequest)

export const registrationOptions: OptionsRes = {
  session,
  publicKey: {
    rp: {
      name: 'passlock',
      id: 'passlock.dev',
    },
    user: {
      name: 'john doe',
      id: 'jdoe',
      displayName: 'john doe',
    },
    challenge: 'FKZSl_saKu5OXjLLwoq8eK3wlD8XgpGiS10SszW5RiE',
    pubKeyCredParams: [],
  },
}

export const optionsRes = new OptionsRes(registrationOptions)

export const credential: RegistrationCredential = {
  type: 'public-key',
  id: '1',
  rawId: '1',
  response: {
    transports: [],
    clientDataJSON: '',
    attestationObject: '',
  },
  clientExtensionResults: {},
}

export const verificationReq = new VerificationReq({ session, credential })

export const verificationRes = new VerificationRes({ principal: Fixtures.principal })

export const createCredentialTest = L.succeed(
  CreateCredential,
  CreateCredential.of(() => E.succeed(credential)),
)

export const userServiceTest = L.succeed(
  UserService,
  UserService.of({
    isExistingUser: () => E.succeed(false),
  }),
)

export const rpcClientTest = L.succeed(
  RpcClient,
  RpcClient.of({
    preConnect: () => E.succeed({ warmed: true }),
    isExistingUser: () => E.succeed({ existingUser: true }),
    verifyEmail: () => E.succeed({ verified: true }),
    getRegistrationOptions: () => E.succeed(optionsRes),
    verifyRegistrationCredential: () => E.succeed(verificationRes),
    getAuthenticationOptions: () => E.fail(new BadRequest({ message: 'Not implemeneted' })),
    verifyAuthenticationCredential: () => E.succeed({ principal: Fixtures.principal }),
  }),
)

export const principal = Fixtures.principal

export const capabilitiesTest = Fixtures.capabilitiesTest

export const storageServiceTest = Fixtures.storageServiceTest
