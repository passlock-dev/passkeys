import { Context, Effect as E, Layer } from 'effect'

import type { PasslockError } from '../error/error'

export enum LogLevel {
  DEBUG,
  INFO,
  WARN,
  ERROR,
}

/**
 * Basically a wrapper around Effect's logger, bit allows us to swap
 * it out for a noop or enhanced implementation. For example when running
 * tests we don't want to long anything to the console, when running
 * backend (node) code, we do want to log, and when running in the
 * browser we want to log and fire off custom events.
 */
export type PasslockLogger = {
  log<T>(message: T, logLevel: LogLevel): E.Effect<never, PasslockError, void>
  debug<T>(message: T): E.Effect<never, PasslockError, void>
  info<T>(message: T): E.Effect<never, PasslockError, void>
  warn<T>(message: T): E.Effect<never, PasslockError, void>
  error<T>(message: T): E.Effect<never, PasslockError, void>
  logRaw<T>(message: T): E.Effect<never, never, void>
}

export const PasslockLogger = Context.Tag<PasslockLogger>()

export const log = <T>(
  message: T,
  logLevel: LogLevel,
): E.Effect<never, PasslockError, void> => {
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
  })
}

/**
 * Some log messages span multiple lines/include json etc which is
 * better output without being formatted by Effect's logging framework
 *
 * @param message
 * @returns
 */
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
