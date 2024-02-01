import { ErrorCode, isPasslockError } from '@passlock/shared/error'
import { Effect } from 'effect'

import { authenticateLive } from './authentication/authenticate'
import { verifyEmailLive } from './email/verifyEmail'
import { makeUnionFn, makeUnsafeFn } from './exit'
import { registerLive } from './registration/register'
import { isExistingUserLive } from './user/status'
import * as Utils from './utils'

const arePasskeysSupported = () => Effect.runPromise(Utils.arePasskeysSupported)
const isAutofillSupported = () => Effect.runPromise(Utils.isAutofillSupported)

const isRegistered = makeUnionFn(isExistingUserLive)
const isRegisteredUnsafe = makeUnsafeFn(isExistingUserLive)

const register = makeUnionFn(registerLive)
const registerUnsafe = makeUnsafeFn(registerLive)

const authenticate = makeUnionFn(authenticateLive)
const authenticateUnsafe = makeUnsafeFn(authenticateLive)

const verifyEmail = makeUnionFn(verifyEmailLive)
const verifyEmailUnsafe = makeUnsafeFn(verifyEmailLive)

export {
  arePasskeysSupported,
  isAutofillSupported,
  isRegistered,
  isRegisteredUnsafe,
  register,
  registerUnsafe,
  authenticate,
  authenticateUnsafe,
  verifyEmail,
  verifyEmailUnsafe,
  isPasslockError,
  ErrorCode,
}
