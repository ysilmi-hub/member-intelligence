/* global React, ReactDOM, window */
// ---------------------------------------------------------------------------
// App — state, chat↔dashboard wiring, live Claude fallback, tweaks
// ---------------------------------------------------------------------------
const { useState, useCallback } = React;

const GREETING = {
  role: 'assistant',
  lead: "I’m Member Compass, your member intelligence assistant. Ask about any segment, member value, churn risk, or model an intervention — I’ll update the dashboard on the right as we go.",
  chips: null,
};

function applyAction(action, setView, setFilters, setPlanner, setHighlight, setNote) {
  if (!action) return;
  if (action.view) setView(action.view);
  if (action.filters) setFilters((prev) => ({ ...prev, ...action.filters }));
  if (action.planner) setPlanner((prev) => ({ ...prev, ...action.planner }));
  setHighlight(action.highlightClass || null);
  setNote(action.note || null);
}

async function askClaude(question, ctx) {
  const sys = `You are Member Compass, the member intelligence assistant for Navy Federal Credit Union, helping business, marketing and member-experience teams.
You have a dashboard with two views: "clv" (member CLV / value overview) and "intervention" (an intervention/test planner with sliders for NPS uplift, retention/tenure, referral rate, and product holdings).
Cohort filters available: military (Active/Veteran/Civilian), base (On-base/Off-base), age (18–25/25–45/45–65/65+), gender (M/F/Other), income (<$50K/$50–100K/$100K+), location (Urban/Rural/North/South/East/West), family (No kids/1–2 kids/3+ kids), products (Checking/Savings/Mortgage/Auto loan/CC).
Reference numbers: avg CLV $2,000; avg tenure 7 yrs; NPS 50; CLV by class — Super promoter $10K, Promoter $5K, Passive $2K, Detractor $1.2K. Planner cohort 10,000 members/yr, cost $5M/yr.
Current view: ${ctx.view}. Current filters: ${JSON.stringify(ctx.filters)}.

Answer as a sharp, concise analyst. Then on the FINAL line, output a JSON action object (no markdown fence) describing how to update the dashboard, using only these keys when relevant:
{"view":"clv"|"intervention","filters":{...},"planner":{"nps":n,"tenure":n,"referral":n,"holdings":n},"highlightClass":"Super promoter"|"Promoter"|"Passive"|"Detractor","note":{"tone":"info"|"good"|"warn","text":"short status"}}
Keep prose under 90 words. Always end with one JSON line.`;

  const raw = await window.claude.complete({
    messages: [
      { role: 'user', content: sys + '\n\nUser question: ' + question },
    ],
  });

  // Split off a trailing JSON action line if present
  let action = null;
  let prose = raw.trim();
  const lastBrace = prose.lastIndexOf('{');
  if (lastBrace !== -1) {
    const candidate = prose.slice(lastBrace);
    try {
      const parsed = JSON.parse(candidate);
      if (parsed && typeof parsed === 'object') {
        action = parsed;
        prose = prose.slice(0, lastBrace).trim();
      }
    } catch (e) { /* no trailing json */ }
  }
  return { prose, action };
}

const TWEAK_DEFAULTS = /*EDITMODE-BEGIN*/{
  "accent": "#1f6feb",
  "density": "regular",
  "chartStyle": "bars",
  "radius": 18,
  "serifHeadlines": true
}/*EDITMODE-END*/;

function App() {
  const [t, setTweak] = window.useTweaks(TWEAK_DEFAULTS);
  const [messages, setMessages] = useState([GREETING]);
  const [busy, setBusy] = useState(false);
  const [draft, setDraft] = useState('');

  const [view, setView] = useState('clv');
  const [filters, setFilters] = useState(window.DEFAULT_FILTERS);
  const [planner, setPlanner] = useState({ nps: 0, tenure: 0, referral: 0, holdings: 0 });
  const [highlightClass, setHighlight] = useState(null);
  const [note, setNote] = useState(null);

  const ask = useCallback(async (question) => {
    setMessages((m) => [...m, { role: 'user', text: question }]);
    setBusy(true);

    const script = window.matchScript(question);
    if (script) {
      // Crafted, instant response (no API) — reliable for demo prompts
      const { message, action } = script.build();
      setTimeout(() => {
        applyAction(action, setView, setFilters, setPlanner, setHighlight, setNote);
        setMessages((m) => [...m, { role: 'assistant', ...message }]);
        setBusy(false);
      }, 480);
      return;
    }

    // Freeform → live Claude
    try {
      const { prose, action } = await askClaude(question, { view, filters });
      applyAction(action, setView, setFilters, setPlanner, setHighlight, setNote);
      const findings = prose.split('\n').map((s) => s.replace(/^[-•*]\s*/, '').trim()).filter(Boolean);
      const msg = findings.length > 1
        ? { role: 'assistant', lead: findings[0], findings: findings.slice(1) }
        : { role: 'assistant', lead: prose || 'Here’s what I found.' };
      setMessages((m) => [...m, msg]);
    } catch (e) {
      setMessages((m) => [...m, {
        role: 'assistant',
        lead: 'I couldn’t reach the live model just now. Try one of the suggested questions — those run instantly.',
      }]);
    } finally {
      setBusy(false);
    }
  }, [view, filters]);

  // expose for follow-up chips + new-chat button
  window.__miAsk = ask;
  window.__miReset = () => {
    setMessages([GREETING]); setView('clv'); setFilters(window.DEFAULT_FILTERS);
    setPlanner({ nps: 0, tenure: 0, referral: 0, holdings: 0 }); setHighlight(null); setNote(null);
  };

  const rootStyle = {
    '--accent': t.accent,
    '--radius': t.radius + 'px',
    '--num-font': t.serifHeadlines ? "'Newsreader', Georgia, serif" : "'Hanken Grotesk', sans-serif",
  };

  return (
    <div className={'app dens-' + t.density} style={rootStyle}>
      <window.ChatPanel
        messages={messages} busy={busy} onAsk={ask}
        draft={draft} setDraft={setDraft}
      />
      <window.Dashboard
        view={view} setView={setView}
        filters={filters} setFilters={setFilters}
        planner={planner} setPlanner={setPlanner}
        highlightClass={highlightClass} note={note}
        chartStyle={t.chartStyle}
      />

      <window.TweaksPanel>
        <window.TweakSection label="Brand & color" />
        <window.TweakColor
          label="Accent" value={t.accent}
          options={['#1f6feb', '#0a2f6b', '#0e7c6b', '#3b5bdb']}
          onChange={(v) => setTweak('accent', v)}
        />
        <window.TweakSection label="Layout" />
        <window.TweakRadio
          label="Density" value={t.density}
          options={['compact', 'regular', 'comfy']}
          onChange={(v) => setTweak('density', v)}
        />
        <window.TweakSlider
          label="Corner radius" value={t.radius} min={4} max={26} step={2} unit="px"
          onChange={(v) => setTweak('radius', v)}
        />
        <window.TweakSection label="Charts & type" />
        <window.TweakRadio
          label="Chart style" value={t.chartStyle}
          options={['bars', 'dots']}
          onChange={(v) => setTweak('chartStyle', v)}
        />
        <window.TweakToggle
          label="Serif headline numbers" value={t.serifHeadlines}
          onChange={(v) => setTweak('serifHeadlines', v)}
        />
      </window.TweaksPanel>
    </div>
  );
}

ReactDOM.createRoot(document.getElementById('root')).render(<App />);
