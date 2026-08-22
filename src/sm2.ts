/**
 * SM-2 spaced-repetition scheduler (the algorithm behind Anki).
 *
 * Pure functions: no I/O, no clock injection beyond the `now` argument, so
 * the logic is trivially unit-testable and the host storage layer stays thin.
 *
 * Interval semantics (Anki's simplified SM-2):
 *   again → lapse: interval 0, ease -0.20, due again in 10 min
 *   hard  → interval × 1.2, ease -0.15
 *   good  → interval × ease
 *   easy  → interval × ease × 1.3, ease +0.15
 * The first two successful reps use the classic fixed intervals (1 day,
 * then 6 days) before the ease factor takes over.
 */
import type { Rating } from './types.ts'

const MIN_EASE = 1.3
const MAX_EASE = 3.0
const DAY_MS = 24 * 60 * 60 * 1000
const LAPSE_DELAY_MS = 10 * 60 * 1000

export interface SchedState {
  ease: number
  interval: number
  reps: number
  lapses: number
  due: number
}

export function freshSched(now = Date.now()): SchedState {
  return { ease: 2.5, interval: 0, reps: 0, lapses: 0, due: now }
}

/** Return the human-friendly interval label shown on the grade buttons. */
export function intervalLabel(state: SchedState, rating: Rating): string {
  const next = review(state, rating, state.due === 0 ? undefined : state.due)
  return labelFor(next)
}

function labelFor(next: SchedState): string {
  const gap = next.due - Date.now()
  if (next.interval === 0) return '10分钟'
  if (gap < DAY_MS) return '<1天'
  if (next.interval < 1) return '1天'
  return `${Math.round(next.interval)}天`
}

export function review(state: SchedState, rating: Rating, now = Date.now(), lapseDelayMs = LAPSE_DELAY_MS): SchedState {
  let { ease, interval, reps, lapses } = state

  if (rating === 'again') {
    lapses += 1
    reps = 0
    interval = 0
    ease = Math.max(MIN_EASE, ease - 0.2)
    return { ease, interval, reps, lapses, due: now + lapseDelayMs }
  }

  reps += 1
  if (reps === 1) {
    interval = 1
  } else if (reps === 2) {
    interval = 6
  } else if (rating === 'hard') {
    ease = Math.max(MIN_EASE, ease - 0.15)
    interval = Math.max(1, Math.round(interval * 1.2))
  } else if (rating === 'easy') {
    ease = Math.min(MAX_EASE, ease + 0.15)
    interval = Math.round(interval * ease * 1.3)
  } else {
    // 'good'
    interval = Math.round(interval * ease)
  }

  return { ease, interval, reps, lapses, due: now + interval * DAY_MS }
}
