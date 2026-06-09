import { useState, useCallback } from 'react'
import ChatPanel from './components/ChatPanel.jsx'
import Dashboard from './components/Dashboard.jsx'
import {
  useTweaks, TweaksPanel, TweakSection,
  TweakSlider, TweakToggle, TweakRadio, TweakColor,
} from './components/TweaksPanel.jsx'
import { DEFAULT_FILTERS, FILTER_GROUPS, matchScript, fmtUSDfull } from './data.js'
import { BASE_CLASSES, weightedAvgCLV } from './model.js'

const EMPTY_FILTERS = FILTER_GROUPS.reduce((o, g) => { o[g.id] = []; return o }, {})

const freshClasses = () => BASE_CLASSES.map((c) => ({ ...c }))
const freshPlanner = () => ({
  nps: 0,
  drivers: { churn: 0, womNet: 0, holdings: 0 },
  tweaked: { churn: false, womNet: false, holdings: false },
})

const fmtClock = (d) => d.toLocaleString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })

function applyAction(action, setView, setFilters, setPlanner, setHighlight, setNote) {
  if (!action) return
  if (action.view) setView(action.view)
  if (action.filters) setFilters((prev) => ({ ...prev, ...action.filters }))
  if (action.planner && action.planner.nps != null) {
    setPlanner((prev) => ({ ...prev, nps: action.planner.nps }))
  }
  setHighlight(action.highlightClass || null)
  setNote(action.note || null)
}

async function askClaude(question, ctx) {
  const apiKey = import.meta.env.VITE_ANTHROPIC_API_KEY
  if (!apiKey) throw new Error('No API key')

  const sysPrompt = `You are Member Compass, the member intelligence assistant for Navy Federal Credit Union, helping business, marketing and member-experience teams.
You have four dashboard tabs: "assumptions" (base driver assumptions by promoter class), "population" (how segments differ from base), "clv" (member CLV / value overview with a driver waterfall), and "intervention" (an NPS-driven planner where moving NPS flows through to churn, word-of-mouth and product-holdings drivers).
Cohort filters: military (Active/Veteran/Civilian), base (On-base/Off-base), age (18–25/25–45/45–65/65+), gender (M/F/Other), income (<$50K/$50–100K/$100K+), location (Urban/Rural/North/South/East/West), family (No kids/1–2 kids/3+ kids), products (Checking/Savings/Mortgage/Auto loan/CC).
Model: CLV is driven by churn rate, product holdings, word-of-mouth and servicing, tilted by promoter class (Super promoter/Promoter/Passive/Detractor). Planner cohort 10,000 members/yr, cost $5M/yr.
Current view: ${ctx.view}. Current filters: ${JSON.stringify(ctx.filters)}.

Answer as a sharp, concise analyst. Then on the FINAL line, output a JSON action object (no markdown fence) using only these keys when relevant:
{"view":"assumptions"|"population"|"clv"|"intervention","filters":{...},"planner":{"nps":n},"highlightClass":"Super promoter"|"Promoter"|"Passive"|"Detractor","note":{"tone":"info"|"good"|"warn","text":"short status"}}
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
  const [messages, setMessages] = useState([])
  const [busy, setBusy] = useState(false)
  const [draft, setDraft] = useState('')

  const [view, setView] = useState('assumptions')
  const [filters, setFilters] = useState(DEFAULT_FILTERS)
  const [planner, setPlanner] = useState(freshPlanner())
  const [highlightClass, setHighlight] = useState(null)
  const [note, setNote] = useState(null)

  const [classes, setClasses] = useState(freshClasses())
  const [years, setYears] = useState(7)
  const dirty = JSON.stringify(classes) !== JSON.stringify(BASE_CLASSES)
  const resetAssumptions = () => setClasses(freshClasses())

  const [saved, setSaved] = useState(false)
  const [lastSaved, setLastSaved] = useState(() => fmtClock(new Date()))
  const statusLabel = saved && !dirty ? 'Saved' : 'Draft'

  const onSaveContinue = () => {
    setView('clv')
    setSaved(true)
    setLastSaved(fmtClock(new Date()))
    setNote(null)
  }

  const onModelSummary = () => {
    const avg = weightedAvgCLV(classes, years)
    setNote({
      tone: 'info',
      text: `Model summary — ${years}-yr horizon · avg member CLV ${fmtUSDfull(Math.round(avg))} · ${dirty ? 'edited' : 'base'} assumptions`,
    })
  }

  const onPickPopulation = (group, value) => {
    setFilters({ ...EMPTY_FILTERS, [group]: [value] })
    setView('clv')
    setNote({ tone: 'info', text: 'Population loaded — see how it differs from base below' })
  }

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
        lead: 'I couldn\'t reach the live model just now. Try one of the suggested questions — those run instantly.',
      }])
    } finally {
      setBusy(false)
    }
  }, [view, filters])

  window.__miAsk = ask
  window.__miReset = () => {
    setMessages([])
    setView('clv')
    setFilters(DEFAULT_FILTERS)
    setPlanner(freshPlanner())
    setHighlight(null)
    setNote(null)
  }

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
        classes={classes} setClasses={setClasses}
        years={years} setYears={setYears}
        dirty={dirty} resetAssumptions={resetAssumptions}
        onPickPopulation={onPickPopulation}
        statusLabel={statusLabel} lastSaved={lastSaved}
        onSaveContinue={onSaveContinue} onModelSummary={onModelSummary}
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
