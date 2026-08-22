/**
 * Host half of dsh-flashcard: registers the model-facing flashcard tools and
 * the fenced /flashcard/api JSON routes the client panel fetches through.
 * Card storage lives under ~/.dsh/flashcards/ (JSONL, one deck per file).
 */
import type { HostContext } from './types.ts'
import { CardStore } from './storage.ts'
import { registerTools } from './tools.ts'
import { registerApi } from './api.ts'

export const name = 'dsh-flashcard'

/** Services required before mounting: the webserver routes, the web runtime's
 *  trusted hosts (for the route fence), and the tool registry. */
export const inject = ['webServer', 'webRuntime', 'tools']

export function apply(ctx: HostContext): void {
  const store = new CardStore()
  registerTools(ctx, store)
  registerApi(ctx, store)
  ctx.logger?.info('[dsh-flashcard] host ready — cards at ~/.dsh/flashcards/')
}
