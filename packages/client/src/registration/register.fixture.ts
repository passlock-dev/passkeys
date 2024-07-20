import {
  OptionsReq,
  OptionsRes,
  RegistrationClient,
  VerificationReq,
  VerificationRes,
} from '@passlock/shared/dist/rpc/registration.js'
import type { RegistrationCredential } from '@passlock/shared/dist/schema/schema.js'
import { Effect as E, Layer as L } from 'effect'
import * as Fixtures from '../test/fixtures.js'
import { UserService } from '../user/user.js'
import { CreateCredential, type RegistrationRequest } from './register.js'

export const session = 'session'
export const token = 'token'
export const code = 'code'
export const authType = 'passkey'
export const expireAt = Date.now() + 10000

export const registrationRequest: RegistrationRequest = {
  email: 'jdoe@gmail.com',
  givenName: 'john',
  familyName: 'doe',
}

export const rpcOptionsReq = new OptionsReq(registrationRequest)

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

export const rpcOptionsRes = new OptionsRes(registrationOptions)

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

export const rpcVerificationReq = new VerificationReq({ session, credential })

export const rpcVerificationRes = new VerificationRes({ principal: Fixtures.principal })

export const createCredentialTest = L.succeed(
  CreateCredential,
  CreateCredential.of(() => E.succeed(credential)),
)

export const userServiceTest = L.succeed(
  UserService,
  UserService.of({
    isExistingUser: () => E.succeed(false),
    resendVerificationEmail: () => E.succeed(true)
  }),
)

export const rpcClientTest = L.succeed(
  RegistrationClient,
  RegistrationClient.of({
    getRegistrationOptions: () => E.succeed(rpcOptionsRes),
    verifyRegistrationCredential: () => E.succeed(rpcVerificationRes),
  })
)

export const principal = Fixtures.principal

export const capabilitiesTest = Fixtures.capabilitiesTest

export const storageServiceTest = Fixtures.storageServiceTest
