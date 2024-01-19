import type { PasslockError } from '@passlock/shared/src/error'
import { Context, Effect as E, Layer } from 'effect'
import type { Effect } from 'effect/Effect'

import { fireEvent } from '../event/event'

export enum LogLevel {
  DEBUG,
  INFO,
  WARN,
  ERROR,
}

export type PasslockLogger = {
  log<T>(message: T, logLevel: LogLevel): Effect<never, PasslockError, void>
  debug<T>(message: T): Effect<never, PasslockError, void>
  info<T>(message: T): Effect<never, PasslockError, void>
  warn<T>(message: T): Effect<never, PasslockError, void>
  error<T>(message: T): Effect<never, PasslockError, void>
  logRaw<T>(message: T): Effect<never, never, void>
}

export const PasslockLogger = Context.Tag<PasslockLogger>()

export const log = <T>(
  message: T,
  logLevel: LogLevel,
): Effect<never, PasslockError, void> => {
  return E.gen(function* (_) {
    switch (logLevel) {
      case LogLevel.ERROR:
        yield* _(E.logError(message))
        break
      case LogLevel.WARN:
        yield* _(E.logWarning(message))
        break
      case LogLevel.INFO:
        yield* _(E.logInfo(message))
        break
      case LogLevel.DEBUG:
        yield* _(E.logDebug(message))
        break
    }

    if (logLevel !== LogLevel.DEBUG && typeof message === 'string')
      yield* _(fireEvent(message))
  })
}

export const logRaw = <T>(message: T) =>
  E.sync(() => {
    console.log(message)
  })

export const debug = <T>(message: T) => log(message, LogLevel.DEBUG)
export const info = <T>(message: T) => log(message, LogLevel.INFO)
export const warn = <T>(message: T) => log(message, LogLevel.WARN)
export const error = <T>(message: T) => log(message, LogLevel.ERROR)

/* Live */

export const loggerLive = Layer.succeed(PasslockLogger, {
  log,
  debug,
  info,
  warn,
  error,
  logRaw,
})
