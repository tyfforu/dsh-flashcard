/**
 * "闪卡" settings section rendered inside the DSH settings page. The DSH
 * settings shell provides a left-side category nav and a right-side body; we
 * register this component as a category (id 'flashcard') and render the
 * same five fields the host stores in ~/.dsh/flashcards/settings.json.
 *
 * Each row self-manages: loads its current value from the host on mount and
 * writes back to /flashcard/api/settings.update on every change (no
 * explicit "save" button — the change is committed immediately, like the
 * other settings in the DSH settings page).
 */
import { useState, useEffect } from 'react'

interface ApiEnvelope {
  ok: boolean
  value?: FlashcardSettings
  error?: { code: string; message: string }
}

interface FlashcardSettings {
  defaultDeck: string
  reviewOrder: 'due' | 'random'
  showTags: boolean
  autoAdvance: boolean
  lapseDelayMinutes: number
}

const DEFAULTS: FlashcardSettings = {
  defaultDeck: '',
  reviewOrder: 'due',
  showTags: true,
  autoAdvance: true,
  lapseDelayMinutes: 10,
}

async function apiGet(): Promise<FlashcardSettings> {
  const res = await fetch('/flashcard/api/settings.get', {
    method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({}),
  })
  const data = (await res.json()) as ApiEnvelope
  if (!data.ok || data.value === undefined) throw new Error(data.error?.message ?? 'load failed')
  return { ...DEFAULTS, ...data.value }
}

async function apiUpdate(patch: Partial<FlashcardSettings>): Promise<FlashcardSettings> {
  const res = await fetch('/flashcard/api/settings.update', {
    method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(patch),
  })
  const data = (await res.json()) as ApiEnvelope
  if (!data.ok || data.value === undefined) throw new Error(data.error?.message ?? 'save failed')
  return data.value
}

const s = {
  body: { padding: '4px 4px 16px' },
  intro: { fontSize: '13px', color: 'var(--color-text-secondary, #666)', marginBottom: '12px' },
  row: {
    display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between',
    gap: '16px', padding: '12px 0',
    borderBottom: '0.5px solid var(--color-border-tertiary, #eee)',
  } as const,
  label: { fontSize: '13px', fontWeight: '500' as const, color: 'var(--color-text-primary, #1a1a1a)' },
  desc: { fontSize: '12px', color: 'var(--color-text-secondary, #666)', marginTop: '2px' },
  control: { display: 'flex', flexDirection: 'column' as const, alignItems: 'flex-end', gap: '4px', minWidth: '180px' },
  input: {
    padding: '5px 9px', fontSize: '13px', borderRadius: '6px',
    border: '0.5px solid var(--color-border-secondary, #ccc)',
    background: 'var(--color-background-primary, #fff)', color: 'inherit',
    minWidth: '180px',
  } as const,
  status: { fontSize: '11px' },
  ok: { color: 'var(--color-text-success, #1e7a1e)' },
  err: { color: 'var(--color-text-danger, #b91c1c)' },
  switch: { display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px' },
} as const

function Status({ state }: { state: { kind: 'idle' | 'saved' | 'error'; message: string } }) {
  if (state.kind === 'idle') return null
  return (
    <span style={{ ...s.status, ...(state.kind === 'error' ? s.err : s.ok) }}>
      {state.message}
    </span>
  )
}

export function FlashcardSettings(): unknown {
  const [settings, setSettings] = useState<FlashcardSettings | null>(null)
  const [err, setErr] = useState<string>('')

  useEffect(() => {
    apiGet().then(setSettings).catch((e: Error) => setErr(e.message))
  }, [])

  async function commit(patch: Partial<FlashcardSettings>) {
    try {
      const next = await apiUpdate(patch)
      setSettings(next)
    } catch (e) {
      setErr(e instanceof Error ? e.message : String(e))
    }
  }

  if (settings === null) return <div style={s.body}>{err === '' ? '加载中…' : `加载失败: ${err}`}</div>

  return (
    <div style={s.body}>
      <div style={s.intro}>闪卡复习插件的偏好设置。所有改动自动保存到 ~/.dsh/flashcards/settings.json；SM-2 重来间隔在下次评分时立即生效。</div>

      <div style={s.row}>
        <div>
          <div style={s.label}>默认牌组</div>
          <div style={s.desc}>打开闪卡时自动选中的牌组；留空则选第一个牌组</div>
        </div>
        <div style={s.control}>
          <input
            style={s.input}
            value={settings.defaultDeck}
            placeholder="例如 embedded"
            onChange={(e) => setSettings({ ...settings, defaultDeck: e.target.value })}
            onBlur={() => { if (settings.defaultDeck !== DEFAULTS.defaultDeck) commit({ defaultDeck: settings.defaultDeck }) }}
          />
        </div>
      </div>

      <div style={s.row}>
        <div>
          <div style={s.label}>复习顺序</div>
          <div style={s.desc}>到期卡片在队列中的排序方式</div>
        </div>
        <div style={s.control}>
          <select
            style={s.input}
            value={settings.reviewOrder}
            onChange={(e) => {
              const v = e.target.value as 'due' | 'random'
              setSettings({ ...settings, reviewOrder: v })
              commit({ reviewOrder: v })
            }}
          >
            <option value="due">到期优先</option>
            <option value="random">随机</option>
          </select>
        </div>
      </div>

      <div style={s.row}>
        <div>
          <div style={s.label}>显示标签</div>
          <div style={s.desc}>在卡片上显示知识点标签</div>
        </div>
        <div style={s.control}>
          <label style={s.switch}>
            <input
              type="checkbox"
              checked={settings.showTags}
              onChange={(e) => {
                const v = e.target.checked
                setSettings({ ...settings, showTags: v })
                commit({ showTags: v })
              }}
            />
            {settings.showTags ? '开' : '关'}
          </label>
        </div>
      </div>

      <div style={s.row}>
        <div>
          <div style={s.label}>评分后自动下一题</div>
          <div style={s.desc}>评分后自动切换到下一张卡片；关闭则保留当前卡片可手动下一题</div>
        </div>
        <div style={s.control}>
          <label style={s.switch}>
            <input
              type="checkbox"
              checked={settings.autoAdvance}
              onChange={(e) => {
                const v = e.target.checked
                setSettings({ ...settings, autoAdvance: v })
                commit({ autoAdvance: v })
              }}
            />
            {settings.autoAdvance ? '开' : '关'}
          </label>
        </div>
      </div>

      <div style={s.row}>
        <div>
          <div style={s.label}>SM-2 重来间隔（分钟）</div>
          <div style={s.desc}>评分「重来」后多少分钟重新加入复习队列（Anki 风格 lapsed delay）</div>
        </div>
        <div style={s.control}>
          <input
            type="number"
            min={1}
            max={1440}
            style={s.input}
            value={settings.lapseDelayMinutes}
            onChange={(e) => {
              const v = Math.max(1, Math.min(1440, Math.round(Number(e.target.value) || 1)))
              setSettings({ ...settings, lapseDelayMinutes: v })
            }}
            onBlur={() => commit({ lapseDelayMinutes: settings.lapseDelayMinutes })}
          />
        </div>
      </div>
    </div>
  )
}
