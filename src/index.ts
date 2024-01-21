import { ErrorCode, isPasslockError } from '@passlock/shared/error'
import { Effect } from 'effect'

import { authenticateLive } from './fp/authentication/authenticate'
import { makeUnionFn, makeUnsafeFn } from './fp/exit'
import { registerLive } from './fp/registration/register'
import { isExistingUserLive } from './fp/user/status'
import * as Utils from './fp/utils'

/**
 * Test comment
 * @returns Promise
 */
const arePasskeysSupported = () => Effect.runPromise(Utils.arePasskeysSupported)
const isAutofillSupported = () => Effect.runPromise(Utils.isAutofillSupported)

const isRegistered = makeUnionFn(isExistingUserLive)
const isRegisteredUnsafe = makeUnsafeFn(isExistingUserLive)

const register = makeUnionFn(registerLive)
const registerUnsafe = makeUnsafeFn(registerLive)

const authenticate = makeUnionFn(authenticateLive)
const authenticateUnsafe = makeUnsafeFn(authenticateLive)

export {
  arePasskeysSupported,
  isAutofillSupported,
  isRegistered,
  isRegisteredUnsafe,
  register,
  registerUnsafe,
  authenticate,
  authenticateUnsafe,
  isPasslockError,
  ErrorCode,
}
