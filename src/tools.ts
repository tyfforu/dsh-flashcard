/**
 * Host-side model-facing tools. The Agent (in the chat) uses these to create
 * cards from documents/conversations, list due cards, submit grades, and read
 * deck statistics. Each tool scopes itself to the calling session via
 * `exec.agent.session.id` where relevant.
 */
import { defineTool } from '@deepseek-ai/dsh-tools'
import type { CardStore } from './storage.ts'
import type { HostContext, Rating } from './types.ts'

const RATINGS = ['again', 'hard', 'good', 'easy'] as const

function textRender(fn: (value: any) => string): (_args: unknown, value: unknown) => Array<{ type: 'text'; text: string }> {
  return (_args, value) => [{ type: 'text', text: fn(value) }]
}

export function registerTools(ctx: HostContext, store: CardStore): () => void {
  const disposers: Array<() => void> = []
  const register = (tool: ReturnType<typeof defineTool>): void => {
    disposers.push(ctx.tools.register(tool))
  }

  register(defineTool({
    name: 'flashcard_add_cards',
    description:
      'Create flashcards in a deck so the user can review them later with spaced repetition (Anki-style). '
      + 'Use this when the user asks you to turn a document, note, or part of the conversation into study cards. '
      + 'Keep every card atomic: one question, one answer, one single concept. '
      + 'Write the front as a direct question and the back as a concise answer (prefer under 50 words).',
    parameters: {
      deck: {
        type: 'string',
        required: true,
        description: 'Deck name, e.g. "embedded", "freertos", "english-vocab". Created automatically if missing.',
      },
      cards: {
        type: 'array',
        required: true,
        description: 'The cards to create.',
        items: {
          type: 'object',
          additionalProperties: false,
          properties: {
            front: { type: 'string', required: true, description: 'The question / prompt side.' },
            back: { type: 'string', required: true, description: 'The answer side.' },
            tags: { type: 'array', items: { type: 'string' }, description: 'Optional topic tags.' },
          },
        },
      },
    },
    output: {
      schema: {
        type: 'object',
        additionalProperties: false,
        properties: {
          deck: { type: 'string', required: true },
          created: { type: 'integer', required: true, description: 'Number of cards actually created.' },
        },
      },
      render: textRender((v: { deck: string; created: number }) =>
        `Created ${v.created} card(s) in deck "${v.deck}". The user can review them in the right-sidebar "闪卡" tab.`,
      ),
    },
    execute: async (args: { deck: string; cards: Array<{ front: string; back: string; tags?: string[] }> }, exec) => {
      exec.signal.throwIfAborted()
      const source = exec.agent?.session?.id
      const created = await store.addCards(args.deck, args.cards, source)
      return { deck: args.deck, created: created.length }
    },
  }))

  register(defineTool({
    name: 'flashcard_list_due',
    description:
      'List the flashcards that are due for review in a deck (or across all decks when no deck is given). '
      + 'Use this to tell the user what they should review right now.',
    parameters: {
      deck: { type: 'string', description: 'Optional deck name. When omitted, due cards across all decks are listed.' },
      limit: { type: 'integer', description: 'Maximum number of cards to return (default 20).' },
    },
    output: {
      schema: {
        type: 'object',
        additionalProperties: false,
        properties: {
          total: { type: 'integer', required: true },
          cards: {
            type: 'array',
            items: {
              type: 'object',
              additionalProperties: false,
              properties: {
                id: { type: 'string' },
                deck: { type: 'string' },
                front: { type: 'string' },
                back: { type: 'string' },
              },
            },
          },
        },
      },
      render: textRender((v: { total: number; cards: Array<{ id: string; deck: string; front: string; back: string }> }) => {
        if (v.total === 0) return 'No cards are due for review right now.'
        const lines = v.cards.map((c) => `  [${c.deck}] Q: ${c.front}  A: ${c.back}`)
        return `${v.total} card(s) due:\n${lines.join('\n')}`
      }),
    },
    execute: async (args: { deck?: string; limit?: number }, exec) => {
      exec.signal.throwIfAborted()
      const limit = args.limit ?? 20
      if (args.deck !== undefined) {
        const cards = await store.dueCards(args.deck)
        const slice = cards.slice(0, limit)
        return { total: cards.length, cards: slice.map((c) => ({ id: c.id, deck: c.deck, front: c.front, back: c.back })) }
      }
      const decks = await store.listDecks()
      const all: Array<{ id: string; deck: string; front: string; back: string }> = []
      for (const d of decks) {
        const cards = await store.dueCards(d.name)
        for (const c of cards) all.push({ id: c.id, deck: c.deck, front: c.front, back: c.back })
        if (all.length >= limit) break
      }
      return { total: all.length, cards: all.slice(0, limit) }
    },
  }))

  register(defineTool({
    name: 'flashcard_grade',
    description:
      'Record the user\'s self-graded performance on one flashcard, updating its spaced-repetition schedule. '
      + 'rating: "again" = forgot it (relearn soon), "hard" = recalled with difficulty, "good" = recalled correctly, "easy" = trivially easy.',
    parameters: {
      card_id: { type: 'string', required: true, description: 'The card id (from flashcard_list_due).' },
      rating: { type: 'string', required: true, enum: [...RATINGS] as unknown as string[], description: 'again | hard | good | easy' },
    },
    output: {
      schema: {
        type: 'object',
        additionalProperties: false,
        properties: {
          interval: { type: 'integer', required: true, description: 'Days until the card is next due (0 = relearn shortly).' },
          due: { type: 'number', required: true, description: 'Epoch ms of the next due time.' },
        },
      },
      render: textRender((v: { interval: number; due: number }) =>
        v.interval === 0
          ? `Card marked for relearning (due again in 10 minutes).`
          : `Card scheduled: next due in ${v.interval} day(s).`,
      ),
    },
    execute: async (args: { card_id: string; rating: Rating }, exec) => {
      exec.signal.throwIfAborted()
      const { getSettings } = await import('./settings.ts')
      const settings = await getSettings()
      const card = await store.grade(args.card_id, args.rating, undefined, settings.lapseDelayMinutes * 60 * 1000)
      if (card === undefined) throw new Error(`card "${args.card_id}" not found`)
      return { interval: card.interval, due: card.due }
    },
  }))

  register(defineTool({
    name: 'flashcard_stats',
    description: 'Read statistics for one deck, or a summary of all decks. Useful to report review progress to the user.',
    parameters: {
      deck: { type: 'string', description: 'Optional deck name; omit for all-deck summary.' },
    },
    output: {
      schema: {
        type: 'array',
        items: {
          type: 'object',
          additionalProperties: false,
          properties: {
            name: { type: 'string' },
            total: { type: 'integer' },
            due: { type: 'integer' },
            newCards: { type: 'integer' },
            mastered: { type: 'integer' },
          },
        },
      },
      render: textRender((v: Array<{ name: string; total: number; due: number; newCards: number; mastered: number }>) => {
        if (v.length === 0) return 'No decks yet.'
        return v.map((d) => `  ${d.name}: ${d.total} cards, ${d.due} due, ${d.mastered} mastered`).join('\n')
      }),
    },
    execute: async (args: { deck?: string }, exec) => {
      exec.signal.throwIfAborted()
      const decks = await store.listDecks()
      if (args.deck !== undefined) return decks.filter((d) => d.name === args.deck)
      return decks
    },
  }))

  return () => {
    for (const dispose of disposers) dispose()
  }
}
