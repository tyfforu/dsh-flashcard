/**
 * Flashcard review panel. Renders inside the right sidebar tab registered by
 * client/index.tsx. All data comes from the host through /flashcard/api.
 *
 * Layout (v2, "卡片主角"): the card owns the central region (flex:1,
 * vertically centered) so it no longer hugs the top; a divider separates the
 * review surface from a bottom action bar — nav row, four big Anki-style
 * grade buttons, and the quick right/wrong/ask-AI row.
 *
 * Features: deck picker, flip-to-reveal, prev/next navigation, four-button
 * Anki-style grading, quick right/wrong marks, and "ask AI" which injects the
 * card context into the composer draft (the same path the sidebar's
 * @-reference button uses).
 */
import { useState, useEffect } from 'react'
import type { Card, ClientContext, DeckSummary, SessionScope, TabComponentProps } from '../types.ts'
import { FlashcardSettings } from './FlashcardSettings.tsx'

interface ApiEnvelope {
  ok: boolean
  value?: unknown
  error?: { code: string; message: string }
}

async function apiCall(method: string, payload: Record<string, unknown>): Promise<any> {
  const res = await fetch(`/flashcard/api/${method}`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(payload),
  })
  const data = (await res.json()) as ApiEnvelope
  if (!data.ok) throw new Error(data.error?.message ?? 'api error')
  return data.value
}

function appendToDraft(ctx: ClientContext, sessionId: string, text: string): boolean {
  try {
    const actx = ctx.sessions.scope(sessionId)
    if (actx === undefined) return false
    const conversation = ctx.get('conversation') as any
    if (conversation === undefined) return false
    const input = conversation.input.for(actx)
    const draft = input.state.getSnapshot().draft
    input.setDraft(draft.trim() === '' ? text : `${draft} ${text}`)
    return true
  } catch (error) {
    console.warn('[dsh-flashcard] draft insert failed:', error)
    return false
  }
}

const GRADE_BUTTONS = [
  { rating: 'again', label: '重来', hint: '10分钟', bg: '#fdeaea', fg: '#b91c1c' },
  { rating: 'hard', label: '困难', hint: '1天', bg: '#fdf3e0', fg: '#9a6700' },
  { rating: 'good', label: '良好', hint: '按计划', bg: '#e8f4e8', fg: '#1e7a1e' },
  { rating: 'easy', label: '简单', hint: '拉长', bg: '#e6f1fb', fg: '#185fa5' },
] as const

export function FlashcardView(props: TabComponentProps): unknown {
  const ctx = props.ctx
  const scope: SessionScope = props.scope
  // 用户配置（从 host 的 /flashcard/api/settings.get 拉取，与 DSH 设置页里的「闪卡」设置区共享）
  const [defaultDeck, setDefaultDeck] = useState('')
  const [reviewOrder, setReviewOrder] = useState<'due' | 'random'>('due')
  const [showTags, setShowTags] = useState(true)
  const [autoAdvance, setAutoAdvance] = useState(true)

  useEffect(() => {
    apiCall('settings.get', {}).then((s: any) => {
      if (s && typeof s === 'object') {
        if (typeof s.defaultDeck === 'string') setDefaultDeck(s.defaultDeck)
        if (s.reviewOrder === 'random') setReviewOrder('random')
        if (s.showTags === false) setShowTags(false)
        if (s.autoAdvance === false) setAutoAdvance(false)
      }
    }).catch(() => { /* keep defaults */ })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const [decks, setDecks] = useState<DeckSummary[]>([])
  const [deck, setDeck] = useState('')
  const [queue, setQueue] = useState<Card[]>([])
  const [idx, setIdx] = useState(0)
  const [flipped, setFlipped] = useState(false)
  const [toast, setToast] = useState('')
  const [busy, setBusy] = useState(false)
  const [showSettings, setShowSettings] = useState(false)

  useEffect(() => {
    apiCall('decks.list', {}).then((ds: DeckSummary[]) => {
      setDecks(ds)
      if (ds.length === 0) return
      const target = defaultDeck !== '' && ds.some((d) => d.name === defaultDeck) ? defaultDeck : ds[0].name
      setDeck(target)
    }).catch((e: Error) => setToast(`加载牌组失败: ${e.message}`))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [defaultDeck])

  useEffect(() => {
    if (deck === '') { setQueue([]); setIdx(0); return }
    apiCall('deck.cards', { deck }).then((cs: Card[]) => {
      const list = reviewOrder === 'random' ? [...cs].sort(() => Math.random() - 0.5) : cs
      setQueue(list)
      setIdx(0)
      setFlipped(false)
    }).catch((e: Error) => setToast(`加载卡片失败: ${e.message}`))
  }, [deck])

  const card = queue[idx]
  const dueCount = decks.find((d) => d.name === deck)?.due ?? queue.length

  function next() { if (queue.length === 0) return; setIdx((i) => (i + 1) % queue.length); setFlipped(false); setToast('') }
  function prev() { if (queue.length === 0) return; setIdx((i) => (i - 1 + queue.length) % queue.length); setFlipped(false); setToast('') }

  function grade(rating: 'again' | 'hard' | 'good' | 'easy') {
    if (card === undefined || busy) return
    setBusy(true)
    apiCall('card.grade', { card_id: card.id, rating }).then(() => {
      const label = rating === 'again' ? '重来' : rating === 'hard' ? '困难' : rating === 'good' ? '良好' : '简单'
      if (autoAdvance) {
        const nextQueue = queue.filter((c) => c.id !== card.id)
        setQueue(nextQueue)
        setFlipped(false)
        if (nextQueue.length > 0) setIdx((i) => Math.min(i, nextQueue.length - 1))
        setToast(`已记「${label}」`)
      } else {
        setFlipped(true)
        setToast(`已记「${label}」（保持当前卡，可手动下一题）`)
      }
    }).catch((e: Error) => setToast(`评分失败: ${e.message}`)).finally(() => setBusy(false))
  }

  function mark(okMark: boolean) { grade(okMark ? 'good' : 'again') }

  function askAI() {
    if (card === undefined) return
    const text = `请解释这张闪卡，我标记为「不懂」——问题：${card.front} 标准答案：${card.back}。请讲得更通俗些，并举一个实际例子。`
    appendToDraft(ctx, scope.sessionId, text)
    setToast('已把卡片上下文注入聊天框（自动提问）')
  }

  function generateCards() {
    appendToDraft(ctx, scope.sessionId, '把当前文档/笔记做成闪卡。请按内容起一个合适的 deck 名，每张卡一问一答、只考一个知识点，用 flashcard_add_cards 建卡。')
    setToast('已注入「生成闪卡」指令到聊天框')
  }

  const s = {
    wrap: { display: 'flex', flexDirection: 'column', height: '100%', gap: '10px', padding: '12px', fontFamily: 'var(--font-sans, system-ui)', color: 'var(--color-text-primary, #1a1a1a)' },
    row: { display: 'flex', gap: '8px', alignItems: 'center' },
    select: { flex: 1, padding: '8px 10px', borderRadius: '8px', border: '0.5px solid var(--color-border-secondary, #ccc)', background: 'var(--color-background-primary, #fff)', color: 'inherit', fontSize: '13px' },
    gear: { flex: 'none', padding: '8px 12px', borderRadius: '8px', border: '0.5px solid var(--color-border-secondary, #ccc)', background: 'var(--color-background-secondary, #fafafa)', color: 'inherit', fontSize: '12px', cursor: 'pointer' },
    progress: { fontSize: '12px', color: 'var(--color-text-secondary, #666)', display: 'flex', justifyContent: 'space-between' },
    bar: { height: '4px', borderRadius: '2px', background: 'var(--color-background-tertiary, #eee)', overflow: 'hidden' },
    // Card owns the central region: flex:1 + centered, so it floats in the middle instead of hugging the top.
    cardRegion: { flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '6px 12px' },
    // Portrait "card" silhouette: capped width + tall min-height leaves clear side margins and reads as a
    // vertical card rather than an edge-to-edge block; soft shadow gives it elevation.
    card: { width: '100%', maxWidth: '208px', minHeight: '300px', border: '0.5px solid var(--color-border-secondary, #ccc)', borderRadius: '16px', padding: '24px 18px', cursor: 'pointer', background: 'var(--color-background-secondary, #fafafa)', boxShadow: '0 6px 18px rgba(0,0,0,0.10)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center' as const },
    tag: { fontSize: '11px', color: 'var(--color-text-tertiary, #999)', marginBottom: '10px' },
    q: { fontSize: '16px', fontWeight: '500' as const, lineHeight: '1.6' },
    a: { fontSize: '15px', lineHeight: '1.65', color: 'var(--color-text-primary, #1a1a1a)' },
    flipBtn: { marginTop: '16px', padding: '8px 16px', borderRadius: '8px', border: '0.5px solid var(--color-border-secondary, #ccc)', background: 'var(--color-background-primary, #fff)', color: 'inherit', fontSize: '13px', cursor: 'pointer' },
    divider: { height: '1px', background: 'var(--color-border-tertiary, #ddd)', margin: '2px 0' },
    btn: { flex: 1, padding: '10px 8px', borderRadius: '8px', border: '0.5px solid var(--color-border-secondary, #ccc)', background: 'var(--color-background-primary, #fff)', color: 'inherit', fontSize: '13px', cursor: 'pointer' },
    gradeGrid: { display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '8px' },
    gradeBtn: { display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '2px', padding: '10px 2px', borderRadius: '8px', border: '0.5px solid var(--color-border-secondary, #ccc)', fontSize: '14px', cursor: 'pointer' },
    gradeHint: { fontSize: '11px', opacity: 0.8 },
    quickBtn: { flex: 1, padding: '10px 8px', borderRadius: '8px', border: '0.5px solid var(--color-border-secondary, #ccc)', background: 'var(--color-background-primary, #fff)', color: 'inherit', fontSize: '13px', cursor: 'pointer' },
    generateBtn: { width: '100%', padding: '10px 8px', borderRadius: '8px', border: '0.5px solid var(--color-border-secondary, #ccc)', background: 'var(--color-background-secondary, #f0f0f0)', color: 'inherit', fontSize: '13px', cursor: 'pointer' },
    toast: { fontSize: '12px', color: 'var(--color-text-secondary, #666)', minHeight: '16px', textAlign: 'center' },
    empty: { padding: '40px 12px', textAlign: 'center' as const, fontSize: '13px', color: 'var(--color-text-secondary, #666)' },
  } as const

  return (
    <div style={s.wrap}>
      <div style={s.row}>
        <select style={s.select} value={deck} onChange={(e) => setDeck(e.target.value)}>
          {decks.length === 0 && <option value="">（暂无牌组）</option>}
          {decks.map((d) => <option key={d.name} value={d.name}>{d.name}（{d.total}）</option>)}
        </select>
        <button style={s.gear} title="设置" onClick={() => setShowSettings(true)}>设置</button>
      </div>

      {showSettings && (
        <div
          style={{
            position: 'fixed', inset: 0, zIndex: 2147483000,
            background: 'rgba(0,0,0,0.45)', display: 'flex',
            alignItems: 'center', justifyContent: 'center', padding: '16px',
          }}
          onClick={() => setShowSettings(false)}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              background: 'var(--color-background-primary, #fff)',
              color: 'var(--color-text-primary, #1a1a1a)',
              borderRadius: '12px', padding: '16px 18px', maxWidth: '560px', width: '100%',
              maxHeight: '85vh', overflowY: 'auto', boxShadow: '0 8px 32px rgba(0,0,0,0.25)',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
              <div style={{ fontSize: '15px', fontWeight: '500' }}>闪卡设置</div>
              <button onClick={() => setShowSettings(false)} style={{ ...s.btn, flex: 'none' }}>关闭</button>
            </div>
            <FlashcardSettings />
          </div>
        </div>
      )}

      {deck !== '' && (
        <div style={s.progress}>
          <span>{card ? `${idx + 1} / ${queue.length}` : '0 / 0'}</span>
          <span>今日到期 {dueCount}</span>
        </div>
      )}
      {deck !== '' && <div style={s.bar}><div style={{ height: '100%', width: queue.length === 0 ? '0%' : `${Math.round(((idx + 1) / queue.length) * 100)}%`, background: 'var(--color-text-info, #185fa5)' }} /></div>}

      {card === undefined ? (
        <div style={s.cardRegion}>
          <div style={s.empty}>
            {deck === '' ? '还没有牌组。去聊天框说「把 XX 做成闪卡」，或点下面的「生成闪卡」。' : '本牌组暂无到期卡片，休息一下或复习其他牌组。'}
          </div>
        </div>
      ) : (
        <div style={s.cardRegion}>
          <div style={s.card} onClick={() => setFlipped((f) => !f)}>
            {showTags && <div style={s.tag}>{card.tags.length > 0 ? card.tags.join(' · ') : '闪卡'}</div>}
            {flipped ? <div style={s.a}>{card.back}</div> : <div style={s.q}>{card.front}</div>}
            <button
              style={s.flipBtn}
              onClick={(e) => { e.stopPropagation(); setFlipped((f) => !f) }}
            >{flipped ? '收起答案' : '显示答案'}</button>
          </div>
        </div>
      )}

      {card !== undefined && (
        <>
          <div style={s.divider} />
          <div style={s.row}>
            <button style={s.btn} onClick={prev}>上一题</button>
            <button style={s.btn} onClick={next}>下一题</button>
          </div>

          <div style={s.gradeGrid}>
            {GRADE_BUTTONS.map((g) => (
              <button
                key={g.rating}
                disabled={busy}
                onClick={() => grade(g.rating)}
                style={{ ...s.gradeBtn, background: g.bg, color: g.fg }}
              >
                <span>{g.label}</span>
                <span style={s.gradeHint}>{g.hint}</span>
              </button>
            ))}
          </div>

          <div style={s.row}>
            <button style={{ ...s.quickBtn, color: '#1e7a1e' }} onClick={() => mark(true)}>对</button>
            <button style={{ ...s.quickBtn, color: '#b91c1c' }} onClick={() => mark(false)}>错</button>
            <button style={{ ...s.quickBtn, flex: 1.6, background: 'var(--color-background-secondary, #f0f0f0)' }} onClick={askAI}>问 AI</button>
          </div>
        </>
      )}

      <div style={s.row}>
        <button style={s.generateBtn} onClick={generateCards}>＋ 从文档生成闪卡</button>
      </div>

      <div style={s.toast}>{toast}</div>
    </div>
  )
}
