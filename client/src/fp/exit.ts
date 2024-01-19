import {
  ErrorCode,
  isPasslockError,
  PasslockError,
} from '@passlock/shared/src/error'
import { Cause, Effect, Exit as EX } from 'effect'

type InFn<I, O> = (input: I) => Effect.Effect<never, PasslockError, O>
type UnionFn<I, O> = (input: I) => Promise<PasslockError | O>
type UnsafeFn<I, O> = (input: I) => Promise<O>

/**
 * Transform an effect to a promise with an error or value
 *
 * @param input Effect
 * @returns
 */
export const runUnion = async <O>(
  input: Effect.Effect<never, PasslockError, O>,
): Promise<PasslockError | O> => {
  return Effect.runPromiseExit(input).then(transformExit)
}

/**
 * Transform a function that returns an effect to one that returns a promise with an error or value
 *
 * @param fn Function that returns an Effect
 * @returns Function that returns a Promise wrapping a union
 */
export const makeUnionFn = <I, O>(fn: InFn<I, O>): UnionFn<I, O> => {
  return (input: I) => Effect.runPromiseExit(fn(input)).then(transformExit)
}

/**
 * Transform a function that returns an effect to one that returns a promise that could reject
 *
 * @param fn Function that returns an Effect
 * @returns Function that returns a Promise that could reject
 */
export const makeUnsafeFn = <I, O>(fn: InFn<I, O>): UnsafeFn<I, O> => {
  const uFn = makeUnionFn(fn)
  return (input: I) =>
    uFn(input).then(t => (isPasslockError(t) ? Promise.reject(t) : t))
}

export const runUnsafe = async <T>(
  e: Effect.Effect<never, PasslockError, T>,
): Promise<T> => {
  return runUnion(e).then(t =>
    isPasslockError(t) ? Promise.reject(t) : Promise.resolve(t),
  )
}

export const transformExit = <T>(
  exit: EX.Exit<PasslockError, T>,
): PasslockError | T => {
  return EX.getOrElse(exit, cause => {
    if (Cause.isFailType(cause)) {
      return cause.error
    } else {
      return new PasslockError({
        message: 'Unexpected error',
        code: ErrorCode.OtherError,
      })
    }
  })
}
