import { useState, useCallback } from 'react'
import ChatPanel from './components/ChatPanel.jsx'
import Dashboard from './components/Dashboard.jsx'
import {
  useTweaks, TweaksPanel, TweakSection,
  TweakSlider, TweakToggle, TweakRadio, TweakColor,
} from './components/TweaksPanel.jsx'
import { DEFAULT_FILTERS, matchScript } from './data.js'

const GREETING = {
  role: 'assistant',
  lead: "I'm Member Compass, your member intelligence assistant. Ask about any segment, member value, churn risk, or model an intervention — I'll update the dashboard on the right as we go.",
  chips: null,
}

function applyAction(action, setView, setFilters, setPlanner, setHighlight, setNote) {
  if (!action) return
  if (action.view) setView(action.view)
  if (action.filters) setFilters((prev) => ({ ...prev, ...action.filters }))
  if (action.planner) setPlanner((prev) => ({ ...prev, ...action.planner }))
  setHighlight(action.highlightClass || null)
  setNote(action.note || null)
}

async function askClaude(question, ctx) {
  const apiKey = import.meta.env.VITE_ANTHROPIC_API_KEY
  if (!apiKey) throw new Error('No API key')

  const sysPrompt = `You are Member Compass, the member intelligence assistant for Navy Federal Credit Union, helping business, marketing and member-experience teams.
You have a dashboard with two views: "clv" (member CLV / value overview) and "intervention" (an intervention/test planner with sliders for NPS uplift, retention/tenure, referral rate, and product holdings).
Cohort filters available: military (Active/Veteran/Civilian), base (On-base/Off-base), age (18–25/25–45/45–65/65+), gender (M/F/Other), income (<$50K/$50–100K/$100K+), location (Urban/Rural/North/South/East/West), family (No kids/1–2 kids/3+ kids), products (Checking/Savings/Mortgage/Auto loan/CC).
Reference numbers: avg CLV $2,000; avg tenure 7 yrs; NPS 50; CLV by class — Super promoter $10K, Promoter $5K, Passive $2K, Detractor $1.2K. Planner cohort 10,000 members/yr, cost $5M/yr.
Current view: ${ctx.view}. Current filters: ${JSON.stringify(ctx.filters)}.

Answer as a sharp, concise analyst. Then on the FINAL line, output a JSON action object (no markdown fence) describing how to update the dashboard, using only these keys when relevant:
{"view":"clv"|"intervention","filters":{...},"planner":{"nps":n,"tenure":n,"referral":n,"holdings":n},"highlightClass":"Super promoter"|"Promoter"|"Passive"|"Detractor","note":{"tone":"info"|"good"|"warn","text":"short status"}}
Keep prose under 90 words. Always end with one JSON line.`

  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
      'anthropic-dangerous-direct-browser-access': 'true',
    },
    body: JSON.stringify({
      model: 'claude-sonnet-4-6',
      max_tokens: 512,
      messages: [{ role: 'user', content: sysPrompt + '\n\nUser question: ' + question }],
    }),
  })

  if (!res.ok) throw new Error('API error ' + res.status)
  const data = await res.json()
  const raw = data.content[0].text.trim()

  let action = null
  let prose = raw
  const lastBrace = prose.lastIndexOf('{')
  if (lastBrace !== -1) {
    const candidate = prose.slice(lastBrace)
    try {
      const parsed = JSON.parse(candidate)
      if (parsed && typeof parsed === 'object') {
        action = parsed
        prose = prose.slice(0, lastBrace).trim()
      }
    } catch (e) { /* no trailing json */ }
  }
  return { prose, action }
}

const TWEAK_DEFAULTS = {
  accent: '#1f6feb',
  density: 'regular',
  chartStyle: 'bars',
  radius: 18,
  serifHeadlines: true,
}

export default function App() {
  const [t, setTweak] = useTweaks(TWEAK_DEFAULTS)
  const [messages, setMessages] = useState([GREETING])
  const [busy, setBusy] = useState(false)
  const [draft, setDraft] = useState('')

  const [view, setView] = useState('clv')
  const [filters, setFilters] = useState(DEFAULT_FILTERS)
  const [planner, setPlanner] = useState({ nps: 0, tenure: 0, referral: 0, holdings: 0 })
  const [highlightClass, setHighlight] = useState(null)
  const [note, setNote] = useState(null)

  const ask = useCallback(async (question) => {
    setMessages((m) => [...m, { role: 'user', text: question }])
    setBusy(true)

    const script = matchScript(question)
    if (script) {
      const { message, action } = script.build()
      setTimeout(() => {
        applyAction(action, setView, setFilters, setPlanner, setHighlight, setNote)
        setMessages((m) => [...m, { role: 'assistant', ...message }])
        setBusy(false)
      }, 480)
      return
    }

    try {
      const { prose, action } = await askClaude(question, { view, filters })
      applyAction(action, setView, setFilters, setPlanner, setHighlight, setNote)
      const findings = prose.split('\n').map((s) => s.replace(/^[-•*]\s*/, '').trim()).filter(Boolean)
      const msg = findings.length > 1
        ? { role: 'assistant', lead: findings[0], findings: findings.slice(1) }
        : { role: 'assistant', lead: prose || 'Here\'s what I found.' }
      setMessages((m) => [...m, msg])
    } catch (e) {
      setMessages((m) => [...m, {
        role: 'assistant',
        lead: 'Live AI requires a `VITE_ANTHROPIC_API_KEY` env variable. The six suggested prompts above run instantly without one.',
      }])
    } finally {
      setBusy(false)
    }
  }, [view, filters])

  const rootStyle = {
    '--accent': t.accent,
    '--radius': t.radius + 'px',
    '--num-font': t.serifHeadlines ? "'Newsreader', Georgia, serif" : "'Hanken Grotesk', sans-serif",
  }

  return (
    <div className={'app dens-' + t.density} style={rootStyle}>
      <ChatPanel
        messages={messages} busy={busy} onAsk={ask}
        draft={draft} setDraft={setDraft}
      />
      <Dashboard
        view={view} setView={setView}
        filters={filters} setFilters={setFilters}
        planner={planner} setPlanner={setPlanner}
        highlightClass={highlightClass} note={note}
        chartStyle={t.chartStyle}
      />

      <TweaksPanel>
        <TweakSection label="Brand & color" />
        <TweakColor
          label="Accent" value={t.accent}
          options={['#1f6feb', '#0a2f6b', '#0e7c6b', '#3b5bdb']}
          onChange={(v) => setTweak('accent', v)}
        />
        <TweakSection label="Layout" />
        <TweakRadio
          label="Density" value={t.density}
          options={['compact', 'regular', 'comfy']}
          onChange={(v) => setTweak('density', v)}
        />
        <TweakSlider
          label="Corner radius" value={t.radius} min={4} max={26} step={2} unit="px"
          onChange={(v) => setTweak('radius', v)}
        />
        <TweakSection label="Charts & type" />
        <TweakRadio
          label="Chart style" value={t.chartStyle}
          options={['bars', 'dots']}
          onChange={(v) => setTweak('chartStyle', v)}
        />
        <TweakToggle
          label="Serif headline numbers" value={t.serifHeadlines}
          onChange={(v) => setTweak('serifHeadlines', v)}
        />
      </TweaksPanel>
    </div>
  )
}
