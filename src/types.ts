/**
 * Shared types for dsh-flashcard (host + client halves).
 *
 * Structural (not cordis-augmented) interfaces are used on purpose: a
 * third-party plugin resolves against a different cordis instance than the
 * DSH monorepo, so upstream `declare module` augmentations do not reach this
 * package. The members below mirror the runtime shapes actually touched —
 * the same approach dsh-better-sidebar takes in its own context-types.ts.
 */

export type Rating = 'again' | 'hard' | 'good' | 'easy'

export interface CardHistory {
  at: number
  rating: Rating
}

/** One flashcard, with its SM-2 scheduling state inlined. */
export interface Card {
  id: string
  deck: string
  front: string
  back: string
  tags: string[]
  /** Where the card came from (a session id, a file path, or 'manual'). */
  source?: string
  createdAt: number
  /** SM-2 state. */
  ease: number
  interval: number
  reps: number
  lapses: number
  /** Epoch ms when the card is next due. */
  due: number
  /** Most recent reviews (capped, newest last). */
  history: CardHistory[]
}

export interface DeckSummary {
  name: string
  total: number
  due: number
  newCards: number
  mastered: number
}

// ───────────────────────── Host structural faces ──────────────────────────

export interface HttpRequest {
  url?: string
  method?: string
  headers: Record<string, string | string[] | undefined>
}

export interface HttpResponse {
  statusCode: number
  writeHead(status: number, headers?: Record<string, string>): void
  end(body?: string | Uint8Array): void
}

export interface WebRoute {
  kind: 'exact' | 'prefix'
  path: string
  handler: (req: HttpRequest, res: HttpResponse) => void | Promise<void>
}

export interface HostWebServer {
  register(route: WebRoute): () => void
}

export interface HostWebRuntime {
  trustedHosts: readonly string[]
}

export interface ToolExecContext {
  signal: { throwIfAborted(): void }
  agent?: { session?: { id?: string; header?: { cwd?: string } } }
}

export interface HostToolsService {
  register(tool: unknown): () => void
}

export interface HostContext {
  webServer: HostWebServer
  webRuntime: HostWebRuntime
  tools: HostToolsService
  logger?: { warn(msg: string): void; info(msg: string): void }
  effect(fn: () => void | (() => void), label?: string): void
  inject(names: string[], cb: (ctx: HostContext) => void): void
}

// ───────────────────────── Client structural faces ────────────────────────

export interface SessionScope {
  sessionId: string
  cwd?: string
}

export interface SidebarTab {
  id: string
  type: string
  title?: string
  path?: string
  meta?: unknown
}

export interface TabComponentProps {
  ctx: ClientContext
  store: unknown
  scope: SessionScope
  tab: SidebarTab
  visible: boolean
}

export interface SidebarSettingToggle {
  key: string
  title: string | (() => string)
  desc?: string | (() => string)
  type?: 'switch' | 'text' | 'number' | 'select'
  min?: number
  max?: number
  placeholder?: string
  unit?: string
  options?: ReadonlyArray<{
    value: string | number | boolean
    title: string | (() => string)
    desc?: string | (() => string)
  }>
  multi?: boolean
}

export interface SidebarSettingsDeclaration {
  toggles?: readonly SidebarSettingToggle[]
  pluginToggles?: readonly SidebarSettingToggle[]
}

export interface TabDescriptor {
  id: string
  title: string | (() => string)
  icon?: unknown
  single?: boolean
  order?: number
  hidden?: boolean
  settings?: SidebarSettingsDeclaration
  component: (props: TabComponentProps) => unknown
}

export interface BetterSidebarService {
  registerTab(descriptor: TabDescriptor): () => void
  openTab(seed: { type: string }, scope?: SessionScope): void
  getTabs(): readonly TabDescriptor[]
}

export interface ConversationInput {
  state: { getSnapshot(): { draft: string } }
  setDraft(text: string): void
}

export interface ConversationService {
  input: { for(actx: unknown): ConversationInput }
}

export interface ClientSessions {
  scope(id: string): unknown | undefined
}

export interface ClientContext {
  betterSidebar: BetterSidebarService
  sessions: ClientSessions
  slots: { register(options: unknown, component: unknown): () => void; inject(key: string, callback: () => () => void): () => void }
  get(name: string): unknown
  effect(fn: () => void | (() => void), label?: string): void
  inject(names: string[], cb: (ctx: ClientContext) => void): void
}
