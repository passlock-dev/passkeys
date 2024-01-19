import { Effect as E, Layer } from 'effect'

import { PasslockLogger } from './logging/logging'
import type { NetworkService } from './network/network'

const log = () => E.succeed(undefined)
const debug = () => E.succeed(undefined)
const info = () => E.succeed(undefined)
const warn = () => E.succeed(undefined)
const error = () => E.succeed(undefined)
const logRaw = () => E.succeed(undefined)

export const noopLogger = Layer.succeed(
  PasslockLogger,
  PasslockLogger.of({ log, debug, info, warn, error, logRaw }),
)

export type GetData = NetworkService['getData']
export type PostData = NetworkService['postData']

const getData = () => E.succeed({})
const postData = () => E.succeed({})

export const NetworkServiceTest = {
  withData: (data: object): NetworkService => ({
    getData: () => E.succeed(data),
    postData: () => E.succeed(data),
  }),

  withGetData: (getData: GetData): NetworkService => ({ getData, postData }),
  withPostData: (postData: PostData): NetworkService => ({ getData, postData }),
}
