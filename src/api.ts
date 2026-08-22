/**
 * Host HTTP API for the client half. The browser cannot touch the local
 * filesystem, so the client fetches decks / due cards / grades through this
 * fenced prefix route. The trust fence below is a faithful copy of
 * dsh-better-sidebar's /sidebar API fence (DNS-rebinding / cross-site
 * defense, not authentication).
 */
import type { CardStore } from './storage.ts'
import { getSettings, updateSettings } from './settings.ts'
import type { HostContext, HttpResponse, HttpRequest, Rating } from './types.ts'

function header(headers: HttpRequest['headers'], name: string): string | undefined {
  const value = headers[name]
  return typeof value === 'string' ? value : undefined
}

function parseAuthority(authority: string): URL | undefined {
  try {
    return new URL(`http://${authority}`)
  } catch {
    return undefined
  }
}

function isLoopbackHostname(hostname: string): boolean {
  if (hostname === 'localhost' || hostname === '[::1]') return true
  const parts = hostname.split('.')
  return parts.length === 4 && parts[0] === '127' && parts.every((p) => /^\d{1,3}$/.test(p) && Number(p) <= 255)
}

function isTrustedApiRequest(req: HttpRequest, trustedHosts: readonly string[]): boolean {
  const host = header(req.headers, 'host')
  if (host === undefined) return false
  const hostUrl = parseAuthority(host)
  if (hostUrl === undefined) return false
  if (!isLoopbackHostname(hostUrl.hostname)) {
    const trusted = trustedHosts.some((entry) => {
      const entryUrl = parseAuthority(entry)
      if (entryUrl === undefined) return false
      return entryUrl.host === hostUrl.host || entryUrl.hostname === hostUrl.hostname
    })
    if (!trusted) return false
  }
  if (header(req.headers, 'sec-fetch-site') === 'cross-site') return false
  const origin = header(req.headers, 'origin')
  if (origin === undefined) return true
  try {
    return new URL(origin).host === hostUrl.host
  } catch {
    return false
  }
}

function writeJson(res: HttpResponse, status: number, body: unknown): void {
  res.writeHead(status, { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-cache' })
  res.end(JSON.stringify(body))
}

function ok(res: HttpResponse, value: unknown): void {
  writeJson(res, 200, { ok: true, value })
}

function fail(res: HttpResponse, status: number, code: string, message: string): void {
  writeJson(res, status, { ok: false, error: { code, message } })
}

async function readJsonBody(req: HttpRequest): Promise<Record<string, unknown>> {
  const iterable = req as unknown as AsyncIterable<string | Uint8Array>
  let raw = ''
  for await (const chunk of iterable) {
    raw += typeof chunk === 'string' ? chunk : Buffer.from(chunk).toString('utf8')
  }
  if (raw.trim() === '') return {}
  try {
    const parsed: unknown = JSON.parse(raw)
    return parsed !== null && typeof parsed === 'object' ? (parsed as Record<string, unknown>) : {}
  } catch {
    return {}
  }
}

export function registerApi(ctx: HostContext, store: CardStore): void {
  ctx.effect(() => ctx.webServer.register({
    kind: 'prefix',
    path: '/flashcard/api',
    handler: async (req, res) => {
      if (!isTrustedApiRequest(req, ctx.webRuntime.trustedHosts)) {
        fail(res, 403, 'forbidden', 'forbidden')
        return
      }
      if (req.method !== 'POST') {
        fail(res, 405, 'method-error', 'method not allowed')
        return
      }
      const pathname = new URL(req.url ?? '/', 'http://dsh.internal').pathname
      const method = pathname.startsWith('/flashcard/api/') ? pathname.slice('/flashcard/api/'.length) : undefined
      if (method === undefined || method.includes('/')) {
        fail(res, 404, 'not-found', 'unknown flashcard API method')
        return
      }
      try {
        const payload = await readJsonBody(req)
        switch (method) {
          case 'decks.list':
            return ok(res, await store.listDecks())
          case 'deck.cards': {
            const deck = typeof payload.deck === 'string' ? payload.deck : ''
            if (deck === '') return fail(res, 400, 'bad-request', 'deck is required')
            return ok(res, await store.dueCards(deck))
          }
          case 'card.grade': {
            const id = typeof payload.card_id === 'string' ? payload.card_id : ''
            const rating = payload.rating as Rating
            if (id === '' || !['again', 'hard', 'good', 'easy'].includes(rating)) {
              return fail(res, 400, 'bad-request', 'card_id and a valid rating are required')
            }
            const card = await store.grade(id, rating)
            if (card === undefined) return fail(res, 404, 'not-found', 'card not found')
            return ok(res, { interval: card.interval, due: card.due, ease: card.ease })
          }
          case 'card.add': {
            const deck = typeof payload.deck === 'string' ? payload.deck : ''
            const cards = Array.isArray(payload.cards) ? payload.cards : []
            if (deck === '' || cards.length === 0) return fail(res, 400, 'bad-request', 'deck and cards are required')
            const created = await store.addCards(
              deck,
              cards.map((c: any) => ({
                front: String(c.front ?? ''),
                back: String(c.back ?? ''),
                tags: Array.isArray(c.tags) ? c.tags.map(String) : [],
                source: 'manual',
              })),
            )
            return ok(res, { created: created.length })
          }
          case 'settings.get':
            return ok(res, await getSettings())
          case 'settings.update': {
            const patch: Record<string, unknown> = {}
            for (const k of Object.keys(payload)) {
              if (['defaultDeck', 'reviewOrder', 'showTags', 'autoAdvance', 'lapseDelayMinutes'].includes(k)) {
                patch[k] = payload[k]
              }
            }
            return ok(res, await updateSettings(patch as any))
          }
          default:
            return fail(res, 404, 'not-found', `unknown flashcard API method "${method}"`)
        }
      } catch (error) {
        fail(res, 500, 'internal', error instanceof Error ? error.message : String(error))
      }
    },
  }), 'dsh-flashcard: /flashcard/api routes')
}
