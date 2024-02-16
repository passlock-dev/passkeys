import type { PasslockError } from '@passlock/shared/error'
import { ErrorCode, error, isPasslockError } from '@passlock/shared/error'
import type { Effect } from 'effect'
import { Cause, Exit as EX, Runtime, flow } from 'effect'

type PasslockRuntime<R> = Runtime.Runtime<R>

type InFn<I, A, R> = (input: I) => Effect.Effect<A, PasslockError, R>
type UnionFn<I, A> = (input: I) => Promise<PasslockError | A>
type UnsafeFn<I, A> = (input: I) => Promise<A>

/**
 * Poor man's either - transform an Exit into a union of
 * PasslockError | T
 *
 * @param exit
 * @returns
 */
export const transformExit = <T>(exit: EX.Exit<T, PasslockError>): PasslockError | T => {
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
export const runUnion = <A, R>(
  input: Effect.Effect<A, PasslockError, R>,
  runtime: PasslockRuntime<R>,
): Promise<PasslockError | A> => {
  return Runtime.runPromiseExit(runtime)(input).then(transformExit)
}

/**
 * Transform a function that returns an effect to one that returns a promise with an error or value
 *
 * @param fn Function that returns an Effect
 * @returns Function that returns a Promise wrapping a union
 */
export const makeUnionFn = <I, A, R>(
  fn: InFn<I, A, R>,
  runtime: PasslockRuntime<R>,
): UnionFn<I, A> => {
  return flow(fn, e => runUnion(e, runtime))
}

/**
 * Transform an effect into one that potentially throws a PasslockError
 *
 * @param e Effect
 * @returns Promise that could throw
 */
export const runUnsafe = <A, R>(
  e: Effect.Effect<A, PasslockError, R>,
  runtime: PasslockRuntime<R>,
): Promise<A> => {
  return runUnion(e, runtime).then(t =>
    isPasslockError(t) ? Promise.reject(t) : Promise.resolve(t),
  )
}

/**
 * Transform a function that returns an effect to one that returns a promise that could reject
 *
 * @param fn Function that returns an Effect
 * @returns Function that returns a Promise that could reject
 */
export const makeUnsafeFn = <I, A, R>(
  fn: InFn<I, A, R>,
  runtime: PasslockRuntime<R>,
): UnsafeFn<I, A> => {
  return flow(fn, e => runUnsafe(e, runtime))
}
