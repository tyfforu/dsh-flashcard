/**
 * JSONL card storage under ~/.dsh/flashcards/<deck>.jsonl.
 *
 * One card per line (append-friendly, human-inspectable). All writes rewrite
 * the deck file from an in-memory cache — card counts are small (hundreds),
 * so the rewrite cost is negligible and the on-disk format stays clean.
 */
import { homedir } from 'node:os'
import { mkdir, readFile, writeFile, readdir } from 'node:fs/promises'
import { join } from 'node:path'
import { randomUUID } from 'node:crypto'
import type { Card, DeckSummary, Rating } from './types.ts'
import { freshSched, review } from './sm2.ts'

const ROOT = join(homedir(), '.dsh', 'flashcards')

function deckNameOf(file: string): string | undefined {
  if (!file.endsWith('.jsonl')) return undefined
  return file.slice(0, -'.jsonl'.length)
}

export function deckFileName(deck: string): string {
  return join(ROOT, `${deck.replace(/[^\w\u4e00-\u9fa5-]+/g, '_')}.jsonl`)
}

export interface NewCardInput {
  front: string
  back: string
  tags?: string[]
  source?: string
}

export class CardStore {
  private cache = new Map<string, Card[]>()

  async listDecks(): Promise<DeckSummary[]> {
    await mkdir(ROOT, { recursive: true })
    const files = await readdir(ROOT).catch(() => [] as string[])
    const decks: DeckSummary[] = []
    for (const file of files) {
      const deck = deckNameOf(file)
      if (deck === undefined) continue
      const cards = await this.loadDeck(deck)
      const now = Date.now()
      let due = 0
      let newCards = 0
      let mastered = 0
      for (const c of cards) {
        if (c.due <= now) due += 1
        if (c.reps === 0) newCards += 1
        if (c.interval >= 21) mastered += 1
      }
      decks.push({ name: deck, total: cards.length, due, newCards, mastered })
    }
    decks.sort((a, b) => b.due - a.due)
    return decks
  }

  async loadDeck(deck: string): Promise<Card[]> {
    const cached = this.cache.get(deck)
    if (cached !== undefined) return cached
    await mkdir(ROOT, { recursive: true })
    const file = deckFileName(deck)
    let cards: Card[] = []
    try {
      const raw = await readFile(file, 'utf8')
      cards = raw
        .split('\n')
        .filter((line) => line.trim() !== '')
        .map((line) => JSON.parse(line) as Card)
    } catch {
      cards = []
    }
    this.cache.set(deck, cards)
    return cards
  }

  private async persist(deck: string): Promise<void> {
    const cards = this.cache.get(deck) ?? []
    await mkdir(ROOT, { recursive: true })
    const lines = cards.map((c) => JSON.stringify(c)).join('\n') + (cards.length > 0 ? '\n' : '')
    await writeFile(deckFileName(deck), lines, 'utf8')
  }

  async addCards(deck: string, inputs: NewCardInput[], source?: string): Promise<Card[]> {
    const cards = await this.loadDeck(deck)
    const now = Date.now()
    const created: Card[] = inputs.map((input) => ({
      id: randomUUID(),
      deck,
      front: input.front.trim(),
      back: input.back.trim(),
      tags: input.tags ?? [],
      source: input.source ?? source,
      createdAt: now,
      ...freshSched(now),
      history: [],
    }))
    cards.push(...created)
    await this.persist(deck)
    return created
  }

  async findCard(id: string): Promise<Card | undefined> {
    for (const cards of this.cache.values()) {
      const found = cards.find((c) => c.id === id)
      if (found !== undefined) return found
    }
    // Cold path: scan decks not yet cached.
    const decks = await this.listDecks()
    for (const d of decks) {
      const cards = await this.loadDeck(d.name)
      const found = cards.find((c) => c.id === id)
      if (found !== undefined) return found
    }
    return undefined
  }

  async grade(id: string, rating: Rating, now = Date.now(), lapseDelayMs = 10 * 60 * 1000): Promise<Card | undefined> {
    const card = await this.findCard(id)
    if (card === undefined) return undefined
    const next = review(
      { ease: card.ease, interval: card.interval, reps: card.reps, lapses: card.lapses, due: card.due },
      rating,
      now,
      lapseDelayMs,
    )
    Object.assign(card, next)
    card.history = [...card.history.slice(-19), { at: now, rating }]
    await this.persist(card.deck)
    return card
  }

  /** Due cards for one deck, ordered by due time ascending. */
  async dueCards(deck: string, now = Date.now()): Promise<Card[]> {
    const cards = await this.loadDeck(deck)
    return cards
      .filter((c) => c.due <= now)
      .sort((a, b) => a.due - b.due)
  }
}
