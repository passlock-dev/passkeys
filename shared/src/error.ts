export enum ErrorCode {
  OperationAborted = 'OperationAborted',
  PasskeysNotSupported = 'PasskeysNotSupported',
  DuplicateEmail = 'DuplicateEmail',
  DuplicatePasskey = 'DuplicatePasskey',
  PasskeyNotFound = 'PasskeyNotFound',
  InvalidTenancy = 'InvalidTenancy',
  InvalidClientID = 'InvalidClientID',
  UserNotFound = 'UserNotFound',
  InvalidRequest = 'InvalidRequest',
  InternalServerError = 'InternalServerError',
  InternalBrowserError = 'InternalBrowserError',
  VerificationFailure = 'VerificationFailure',
  OtherError = 'OtherError',
}

export class PasslockError extends Error {
  readonly _tag = 'PasslockError'
  readonly message: string
  readonly code: ErrorCode
  readonly detail?: unknown

  constructor(
    readonly options: {
      readonly message: string
      code: ErrorCode
      detail?: unknown
    },
  ) {
    super(options.message, { cause: options.detail })
    this.message = options.message
    this.code = options.code
    this.detail = options.detail
  }
}

export const isPasslockError = (cause: unknown): cause is PasslockError => {
  if (typeof cause !== 'object') return false
  if (cause === null) return false

  if (!('message' in cause)) return false
  if (typeof cause.message !== 'string') return false

  if (!('code' in cause)) return false
  if (typeof cause.code !== 'string') return false

  return true
}
