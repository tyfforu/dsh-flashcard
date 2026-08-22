/**
 * Plugin settings: a single small JSON document at
 * ~/.dsh/flashcards/settings.json. The host owns the canonical store; the
 * client reads/writes through the fenced /flashcard/api/settings routes.
 *
 * Schema is intentionally tiny (5 fields) and is mirrored by the
 * FlashcardSettingsSection component on the client so the DSH settings
 * page shows the same knobs the flashcard panel reacts to.
 */
import { readFile, writeFile, mkdir } from 'node:fs/promises'
import { join, dirname } from 'node:path'
import { homedir } from 'node:os'

const PATH = join(homedir(), '.dsh', 'flashcards', 'settings.json')

export type ReviewOrder = 'due' | 'random'

export interface FlashcardSettings {
  /** Deck auto-selected when the tab opens; '' = first deck. */
  defaultDeck: string
  /** Queue sort order. */
  reviewOrder: ReviewOrder
  /** Show the tag row on each card. */
  showTags: boolean
  /** Grade-then-advance automatically; if false the card stays until manual next. */
  autoAdvance: boolean
  /** SM-2 lapse delay (minutes) for the 'again' rating. */
  lapseDelayMinutes: number
}

export const DEFAULT_SETTINGS: FlashcardSettings = {
  defaultDeck: '',
  reviewOrder: 'due',
  showTags: true,
  autoAdvance: true,
  lapseDelayMinutes: 10,
}

let cache: FlashcardSettings | undefined

export async function getSettings(): Promise<FlashcardSettings> {
  if (cache !== undefined) return cache
  try {
    const raw = await readFile(PATH, 'utf8')
    const parsed = JSON.parse(raw) as Partial<FlashcardSettings>
    cache = { ...DEFAULT_SETTINGS, ...parsed }
  } catch {
    cache = { ...DEFAULT_SETTINGS }
  }
  return cache
}

export async function updateSettings(patch: Partial<FlashcardSettings>): Promise<FlashcardSettings> {
  const current = await getSettings()
  const next: FlashcardSettings = {
    ...current,
    ...patch,
    // Normalize on the way in so the stored file is always clean.
    reviewOrder: patch.reviewOrder === 'random' ? 'random' : 'due',
    lapseDelayMinutes: Number.isFinite(patch.lapseDelayMinutes)
      ? Math.max(1, Math.round(patch.lapseDelayMinutes as number))
      : current.lapseDelayMinutes,
  }
  await mkdir(dirname(PATH), { recursive: true })
  await writeFile(PATH, JSON.stringify(next, null, 2), 'utf8')
  cache = next
  return next
}
