import type { PasslockError } from '@passlock/shared/error'
import { ErrorCode, error, isPasslockError } from '@passlock/shared/error'
import { Cause, Exit as EX, Effect, flow } from 'effect'

type InFn<I, O> = (input: I) => Effect.Effect<never, PasslockError, O>
type UnionFn<I, O> = (input: I) => Promise<PasslockError | O>
type UnsafeFn<I, O> = (input: I) => Promise<O>

/**
 * Poor man's either - transform an Exit into a union of
 * PasslockError | T
 *
 * @param exit
 * @returns
 */
export const transformExit = <T>(exit: EX.Exit<PasslockError, T>): PasslockError | T => {
  return EX.getOrElse(exit, cause => {
    if (Cause.isFailType(cause)) {
      return cause.error
    } else {
      console.error(cause)
      return error('Unexpected error', ErrorCode.OtherError)
    }
  })
}

/**
 * Run an effect to generate promise with an error or value
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
export const makeUnionFn = <I, O>(fn: InFn<I, O>): UnionFn<I, O> => flow(fn, runUnion)

/**
 * Transform an effect into one that potentially throws a PasslockError
 *
 * @param e Effect
 * @returns Promise that could throw
 */
export const runUnsafe = async <T>(e: Effect.Effect<never, PasslockError, T>): Promise<T> =>
  runUnion(e).then(t => (isPasslockError(t) ? Promise.reject(t) : Promise.resolve(t)))

/**
 * Transform a function that returns an effect to one that returns a promise that could reject
 *
 * @param fn Function that returns an Effect
 * @returns Function that returns a Promise that could reject
 */
export const makeUnsafeFn = <I, O>(fn: InFn<I, O>): UnsafeFn<I, O> => flow(fn, runUnsafe)
