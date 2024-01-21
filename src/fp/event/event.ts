import { ErrorCode, PasslockError } from '@passlock/shared/error'
import { Effect } from 'effect'

export const DebugMessage = 'PasslogDebugMessage'

export const fireEvent = (message: string) =>
  Effect.try({
    try: () => {
      const evt = new CustomEvent(DebugMessage, { detail: message })
      globalThis.dispatchEvent(evt)
    },
    catch: () => {
      return new PasslockError({
        message: 'Unable to fire custom event',
        code: ErrorCode.InternalBrowserError,
      })
    },
  })

export function isPasslockEvent(event: Event): event is CustomEvent {
  if (event.type !== DebugMessage) return false
  return 'detail' in event
}
